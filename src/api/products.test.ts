import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { buildProductListQuery, batchProductIds, MAX_BATCH_PRODUCT_IDS, productsApi } from './products';

describe('buildProductListQuery', () => {
  it('returns an empty string for empty params', () => {
    expect(buildProductListQuery({})).toBe('');
  });

  it('appends categoryIds as a repeated plural key per value', () => {
    expect(buildProductListQuery({ categoryIds: [16, 18] })).toBe('categoryIds=16&categoryIds=18');
  });

  it('appends brandIds as a repeated plural key per value', () => {
    expect(buildProductListQuery({ brandIds: [28] })).toBe('brandIds=28');
  });

  it('never emits the singular keys the gateway whitelist strips', () => {
    const qs = buildProductListQuery({ categoryIds: [2], brandIds: [3] });
    expect(qs).not.toMatch(/categoryId=/);
    expect(qs).not.toMatch(/brandId=/);
  });

  it('never emits bracket syntax (categoryIds[] is an unknown key to the gateway)', () => {
    const qs = buildProductListQuery({ categoryIds: [2, 3] });
    expect(qs).not.toContain('%5B%5D');
    expect(qs).not.toContain('[]');
  });

  it('appends provinceIds as the SINGULAR repeated key the gateway expects', () => {
    expect(buildProductListQuery({ provinceIds: [201, 299] })).toBe('provinceId=201&provinceId=299');
  });

  it('never emits provinceIds plural or bracket syntax for the province filter', () => {
    const qs = buildProductListQuery({ provinceIds: [201] });
    expect(qs).not.toMatch(/provinceIds=/);
    expect(qs).not.toContain('[]');
  });

  it('keeps scalar params alongside array filters and skips empty values', () => {
    const qs = buildProductListQuery({
      page: 2,
      limit: 12,
      search: '',
      categoryIds: [16],
    });
    expect(qs).toBe('page=2&limit=12&categoryIds=16');
  });
});

describe('batchProductIds', () => {
  it('returns no batches for an empty id list', () => {
    expect(batchProductIds([])).toEqual([]);
  });

  it('keeps a small id set as a single batch', () => {
    expect(batchProductIds(['prod_3', 'prod_1', 'prod_2'])).toEqual([['prod_3', 'prod_1', 'prod_2']]);
  });

  it('dedupes ids so duplicates (same product, different SKU) do not waste batch slots', () => {
    expect(batchProductIds(['prod_1', 'prod_2', 'prod_1', 'prod_3', 'prod_2'])).toEqual([['prod_1', 'prod_2', 'prod_3']]);
  });

  it('keeps exactly 50 distinct ids in one batch', () => {
    const ids = Array.from({ length: MAX_BATCH_PRODUCT_IDS }, (_, i) => `prod_${i + 1}`);
    expect(batchProductIds(ids)).toEqual([ids]);
  });

  it('splits 51+ distinct ids into batches of at most 50 covering every id', () => {
    const ids = Array.from({ length: 120 }, (_, i) => `prod_${i + 1}`);
    const batches = batchProductIds(ids);
    expect(batches.map((b) => b.length)).toEqual([50, 50, 20]);
    expect(batches.flat()).toEqual(ids);
  });
});

describe('productsApi.getTrending', () => {
  it('calls /products/trending with the default limit and returns the bare array', async () => {
    let captured: URL | undefined;
    server.use(
      http.get(`${API_BASE}/products/trending`, ({ request }) => {
        captured = new URL(request.url);
        return HttpResponse.json({ data: [{ id: 'prod_a', soldCount: 7 }] });
      }),
    );

    const trending = await productsApi.getTrending();

    expect(captured?.pathname).toBe('/api/products/trending');
    expect(captured?.searchParams.get('limit')).toBe('5');
    // RAIL-RANK-01: never the old list route — `viewCount` is never written,
    // so ranking by it tied every product at 0.
    expect(captured?.searchParams.has('sortBy')).toBe(false);
    expect(trending).toEqual([{ id: 'prod_a', soldCount: 7 }]);
  });

  it('forwards a custom limit', async () => {
    let captured: URL | undefined;
    server.use(
      http.get(`${API_BASE}/products/trending`, ({ request }) => {
        captured = new URL(request.url);
        return HttpResponse.json({ data: [] });
      }),
    );

    await expect(productsApi.getTrending(3)).resolves.toEqual([]);
    expect(captured?.searchParams.get('limit')).toBe('3');
  });
});

// PRODUCT-QA-01 — contract §3/§4 (`api/ai-docs/specs/PRODUCT-QA-01/contract.md`).
describe('productsApi.askQuestion', () => {
  const answered = {
    answer: 'Có. Ngăn chính chứa vừa laptop tới 15.6 inch [1], và một người mua cho biết máy 15 inch của họ vừa khít [2].',
    abstained: false,
    abstainReason: null,
    citations: [
      { index: 1, source: 'PRODUCT', snippet: 'Ngăn chính chống sốc, vừa laptop tới 15.6 inch.' },
      { index: 2, source: 'REVIEW', snippet: 'Mình để laptop 15 inch vừa khít, khoá kéo vẫn đóng dễ.' },
    ],
  };

  it('POSTs the question to /products/:id/ask and unwraps the data envelope', async () => {
    let captured: { pathname: string; method: string; body: unknown } | undefined;
    server.use(
      http.post(`${API_BASE}/products/:id/ask`, async ({ request }) => {
        captured = { pathname: new URL(request.url).pathname, method: request.method, body: await request.json() };
        return HttpResponse.json({ data: answered });
      }),
    );

    const result = await productsApi.askQuestion('prod_8fK2mQ7aLp3xRt9Z', { question: 'Có vừa laptop 15 inch không?' });

    expect(captured?.pathname).toBe('/api/products/prod_8fK2mQ7aLp3xRt9Z/ask');
    expect(captured?.body).toEqual({ question: 'Có vừa laptop 15 inch không?' });
    expect(result).toEqual(answered);
  });

  it('never auto-retries a 503 ASSISTANT_UNAVAILABLE — each resend would spend a rate-limit slot', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE}/products/:id/ask`, () => {
        calls += 1;
        return HttpResponse.json(
          {
            statusCode: 503,
            status: 'error',
            error: 'Service Unavailable',
            message: 'The product assistant is busy, please try again later',
            errorCode: 'ASSISTANT_UNAVAILABLE',
            data: null,
          },
          { status: 503 },
        );
      }),
    );

    await expect(productsApi.askQuestion('prod_a', { question: 'Pin bao lâu?' }))
      .rejects.toMatchObject({ statusCode: 503, errorCode: 'ASSISTANT_UNAVAILABLE' });
    expect(calls).toBe(1);
  });
});
