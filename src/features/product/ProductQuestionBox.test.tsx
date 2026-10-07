import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { DEFAULT_LANG } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { productMessages } from './product.i18n';
import { ProductQuestionBox } from './ProductQuestionBox';

// Fixtures follow `api/ai-docs/specs/PRODUCT-QA-01/contract.md` §4–§5.
const PRODUCT = 'prod_8fK2mQ7aLp3xRt9Z';
const t = bindTranslator(productMessages, DEFAULT_LANG);

const ANSWERED = {
  answer: 'Có. Ngăn chính chứa vừa laptop tới 15.6 inch [1], và một người mua cho biết máy 15 inch của họ vừa khít [2].',
  abstained: false,
  abstainReason: null,
  citations: [
    { index: 1, source: 'PRODUCT', snippet: 'Ngăn chính chống sốc, vừa laptop tới 15.6 inch.' },
    { index: 2, source: 'REVIEW', snippet: 'Mình để laptop 15 inch vừa khít, khoá kéo vẫn đóng dễ.' },
  ],
};

function stubAsk(response: () => Response | Promise<Response>): { bodies: unknown[] } {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API_BASE}/products/${PRODUCT}/ask`, async ({ request }) => {
      bodies.push(await request.json());
      return response();
    }),
  );
  return { bodies };
}

const errorBody = (statusCode: number, message: string, extra: Record<string, unknown> = {}) =>
  HttpResponse.json({ statusCode, status: 'error', message, data: null, ...extra }, { status: statusCode });

async function ask(question: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(t('qaLabel')), question);
  await user.click(screen.getByRole('button', { name: t('qaSubmit') }));
}

describe('ProductQuestionBox', () => {
  it('sends a guest to login with a return path instead of showing the form', () => {
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn={false} />);

    expect(screen.queryByLabelText(t('qaLabel'))).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('qaLogin') }).getAttribute('href'))
      .toBe(`/login?next=${encodeURIComponent(`/product/${PRODUCT}`)}`);
  });

  it('keeps submit disabled until the trimmed question reaches 3 chars', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);
    const submit = screen.getByRole('button', { name: t('qaSubmit') });

    await user.type(screen.getByLabelText(t('qaLabel')), '  ab  ');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(t('qaLabel')), 'c');
    expect(submit).toBeEnabled();
  });

  it('renders an answered response with markers, numbered sources and the AI disclaimer', async () => {
    const { bodies } = stubAsk(() => HttpResponse.json({ data: ANSWERED }));
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);

    await ask('  Có vừa laptop 15 inch không?  ');

    expect(await screen.findByText(t('qaDisclaimer'))).toBeInTheDocument();
    expect(bodies).toEqual([{ question: 'Có vừa laptop 15 inch không?' }]);
    expect(screen.getByText('Có vừa laptop 15 inch không?')).toBeInTheDocument();

    const sources = screen.getByRole('list');
    const items = within(sources).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText(t('qaSourceProduct'))).toBeInTheDocument();
    expect(within(items[1]).getByText(t('qaSourceReview'))).toBeInTheDocument();
    expect(within(items[1]).getByText(ANSWERED.citations[1].snippet)).toBeInTheDocument();
    // Both markers render as superscripts, not literal text.
    expect(document.querySelectorAll('sup')).toHaveLength(2);
    // A successful ask clears the draft for the next question.
    expect(screen.getByLabelText(t('qaLabel'))).toHaveValue('');
  });

  it('shows a pending state and blocks a second submit while the answer is in flight', async () => {
    const { bodies } = stubAsk(async () => {
      await delay(50);
      return HttpResponse.json({ data: ANSWERED });
    });
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);

    await ask('Pin dùng bao lâu?');

    const pending = screen.getByText(t('qaPending'));
    // Announced through the always-mounted polite region, not a freshly mounted one.
    expect(pending.closest('[aria-live="polite"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: t('qaAsking') })).toBeDisabled();
    const input = screen.getByLabelText<HTMLTextAreaElement>(t('qaLabel'));
    expect(input).toHaveAttribute('readonly');
    // Bypass the disabled button: the submit handler itself must refuse a resend.
    expect(input.form).not.toBeNull();
    if (input.form) fireEvent.submit(input.form);

    await waitFor(() => expect(screen.queryByText(t('qaPending'))).not.toBeInTheDocument());
    expect(bodies).toHaveLength(1);
    // Focus returns to the textarea, not <body>, once the ask settles.
    expect(input).toHaveFocus();
  });

  it('treats LOW_CONFIDENCE as a neutral state, not an error', async () => {
    stubAsk(() =>
      HttpResponse.json({ data: { answer: null, abstained: true, abstainReason: 'LOW_CONFIDENCE', citations: [] } }),
    );
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);

    await ask('Có chống nước không?');

    expect(await screen.findByText(t('qaLowConfidence'))).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(t('qaDisclaimer'))).not.toBeInTheDocument();
  });

  it('treats NO_SOURCES (product not indexed yet) as "no info yet", not an error', async () => {
    stubAsk(() =>
      HttpResponse.json({ data: { answer: null, abstained: true, abstainReason: 'NO_SOURCES', citations: [] } }),
    );
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);

    await ask('Bảo hành bao lâu?');

    expect(await screen.findByText(t('qaNoSources'))).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('maps a 400 to the length hint', async () => {
    stubAsk(() => errorBody(400, 'question must be longer than or equal to 3 characters'));
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);

    await ask('abc');

    expect(await screen.findByRole('alert')).toHaveTextContent(t('qaInvalid'));
  });

  it('maps a 429 to "wait a minute" and keeps the draft so the user can resend later', async () => {
    stubAsk(() => errorBody(429, 'Too many requests. Max 5 requests per 60 seconds'));
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);

    await ask('Pin dùng bao lâu?');

    expect(await screen.findByRole('alert')).toHaveTextContent(t('qaRateLimited'));
    expect(screen.getByLabelText(t('qaLabel'))).toHaveValue('Pin dùng bao lâu?');
  });

  it('maps a 503 ASSISTANT_UNAVAILABLE to "busy" after exactly one request', async () => {
    const { bodies } = stubAsk(() =>
      errorBody(503, 'The product assistant is busy, please try again later', {
        error: 'Service Unavailable',
        errorCode: 'ASSISTANT_UNAVAILABLE',
      }),
    );
    renderWithProviders(<ProductQuestionBox productId={PRODUCT} signedIn />);

    await ask('Pin dùng bao lâu?');

    expect(await screen.findByRole('alert')).toHaveTextContent(t('qaBusy'));
    expect(bodies).toHaveLength(1);
  });
});
