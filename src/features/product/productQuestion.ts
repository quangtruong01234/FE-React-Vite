import type {
  ApiError,
  ProductAbstainReason,
  ProductAnswerCitation,
  ProductAnswerSource,
} from '@/types';
import type { MessageKey } from '@/lib/i18n/messages';
import type { productMessages } from './product.i18n';

/**
 * PRODUCT-QA-01 — pure helpers for the "ask about this product" box.
 * The shape they read is fixed by `api/ai-docs/specs/PRODUCT-QA-01/contract.md`.
 */

type ProductKey = MessageKey<typeof productMessages>;

/** Contract §3: `question` is 3..300 chars after trim, else a 400. */
export const QUESTION_MIN_LENGTH = 3;
export const QUESTION_MAX_LENGTH = 300;

/** The 503 the assistant answers with when the AI provider is out (contract §3). */
export const ASSISTANT_UNAVAILABLE = 'ASSISTANT_UNAVAILABLE';

export function normalizeQuestion(raw: string): string {
  return raw.trim();
}

/** Mirrors the backend validator, so a doomed request never spends one of the 5 asks/min. */
export function isAskableQuestion(raw: string): boolean {
  const length = normalizeQuestion(raw).length;
  return length >= QUESTION_MIN_LENGTH && length <= QUESTION_MAX_LENGTH;
}

export type AnswerPart =
  | { kind: 'text'; text: string }
  | { kind: 'cite'; index: number };

const CITATION_MARKER = /\[(\d+)\]/g;

/**
 * Split a plain-text answer into text runs and `[n]` citation markers. The contract
 * guarantees every marker has a citation; one that does not stays as literal text
 * rather than pointing at nothing.
 */
export function splitAnswer(answer: string, citations: readonly ProductAnswerCitation[]): AnswerPart[] {
  const known = new Set(citations.map((c) => c.index));
  const parts: AnswerPart[] = [];
  let text = '';
  let last = 0;
  for (const match of answer.matchAll(CITATION_MARKER)) {
    const index = Number(match[1]);
    const start = match.index ?? 0;
    text += answer.slice(last, start);
    last = start + match[0].length;
    if (!known.has(index)) {
      text += match[0];
      continue;
    }
    if (text) parts.push({ kind: 'text', text });
    text = '';
    parts.push({ kind: 'cite', index });
  }
  text += answer.slice(last);
  if (text) parts.push({ kind: 'text', text });
  return parts;
}

const ABSTAIN_KEY: Record<ProductAbstainReason, ProductKey> = {
  NO_SOURCES: 'qaNoSources',
  LOW_CONFIDENCE: 'qaLowConfidence',
};

/** An abstain is a "not enough information" state, never an error (contract §3). */
export function abstainMessageKey(reason: ProductAbstainReason | null): ProductKey {
  return reason ? ABSTAIN_KEY[reason] : 'qaLowConfidence';
}

const SOURCE_KEY: Record<ProductAnswerSource, ProductKey> = {
  PRODUCT: 'qaSourceProduct',
  SKU: 'qaSourceSku',
  REVIEW: 'qaSourceReview',
};

export function sourceLabelKey(source: ProductAnswerSource): ProductKey {
  return SOURCE_KEY[source];
}

/**
 * Copy for a failed ask. A `401` never reaches this: `request()` already sends a
 * dead session to `/login`. Neither the `429` nor the `503` carries a retry hint,
 * so both tell the user to wait instead of retrying for them.
 */
export function askErrorKey(error: unknown): ProductKey {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 429) return 'qaRateLimited';
  // ASSISTANT_UNAVAILABLE, or a gateway load-shed that outlived `request()`'s one retry.
  if (status === 503 || err?.errorCode === ASSISTANT_UNAVAILABLE) return 'qaBusy';
  if (status === 404) return 'qaProductGone';
  if (status === 400) return 'qaInvalid';
  return 'qaFailed';
}
