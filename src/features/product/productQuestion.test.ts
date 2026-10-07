import { describe, it, expect } from 'vitest';
import type { ApiError, ProductAnswerCitation } from '@/types';
import {
  QUESTION_MAX_LENGTH,
  abstainMessageKey,
  askErrorKey,
  isAskableQuestion,
  normalizeQuestion,
  sourceLabelKey,
  splitAnswer,
} from './productQuestion';

const apiError = (status: number, errorCode?: string): ApiError => ({
  statusCode: status,
  status,
  message: 'x',
  ...(errorCode ? { errorCode } : {}),
});

const cite = (index: number): ProductAnswerCitation => ({ index, source: 'PRODUCT', snippet: `s${index}` });

describe('isAskableQuestion', () => {
  it('measures the trimmed length against 3..300 like the backend validator', () => {
    expect(isAskableQuestion('  ab  ')).toBe(false);
    expect(isAskableQuestion('  abc  ')).toBe(true);
    expect(isAskableQuestion('a'.repeat(QUESTION_MAX_LENGTH))).toBe(true);
    expect(isAskableQuestion('a'.repeat(QUESTION_MAX_LENGTH + 1))).toBe(false);
    expect(isAskableQuestion('   ')).toBe(false);
  });

  it('normalizeQuestion trims what gets sent', () => {
    expect(normalizeQuestion('  Pin bao lâu?\n')).toBe('Pin bao lâu?');
  });
});

describe('splitAnswer', () => {
  it('splits [n] markers out of the text, keeping the surrounding runs', () => {
    expect(splitAnswer('Có [1], và vừa khít [2].', [cite(1), cite(2)])).toEqual([
      { kind: 'text', text: 'Có ' },
      { kind: 'cite', index: 1 },
      { kind: 'text', text: ', và vừa khít ' },
      { kind: 'cite', index: 2 },
      { kind: 'text', text: '.' },
    ]);
  });

  it('handles adjacent markers and a marker at either end', () => {
    expect(splitAnswer('[1][2] ok [1]', [cite(1), cite(2)])).toEqual([
      { kind: 'cite', index: 1 },
      { kind: 'cite', index: 2 },
      { kind: 'text', text: ' ok ' },
      { kind: 'cite', index: 1 },
    ]);
  });

  it('keeps a marker with no matching citation as literal text', () => {
    expect(splitAnswer('Năm (2024) [3] và [1]', [cite(1)])).toEqual([
      { kind: 'text', text: 'Năm (2024) [3] và ' },
      { kind: 'cite', index: 1 },
    ]);
  });

  it('leaves newlines and "- " bullets in the text runs', () => {
    expect(splitAnswer('Có:\n- pin [1]\n- sạc', [cite(1)])).toEqual([
      { kind: 'text', text: 'Có:\n- pin ' },
      { kind: 'cite', index: 1 },
      { kind: 'text', text: '\n- sạc' },
    ]);
  });

  it('returns a single text part when there are no markers', () => {
    expect(splitAnswer('plain', [])).toEqual([{ kind: 'text', text: 'plain' }]);
  });
});

describe('askErrorKey', () => {
  it('maps each contract status to its copy', () => {
    expect(askErrorKey(apiError(429))).toBe('qaRateLimited');
    expect(askErrorKey(apiError(503, 'ASSISTANT_UNAVAILABLE'))).toBe('qaBusy');
    expect(askErrorKey(apiError(503))).toBe('qaBusy');
    expect(askErrorKey(apiError(404))).toBe('qaProductGone');
    expect(askErrorKey(apiError(400))).toBe('qaInvalid');
  });

  it('falls back to the generic copy for anything else, including a network error', () => {
    expect(askErrorKey(apiError(500))).toBe('qaFailed');
    expect(askErrorKey(new TypeError('Failed to fetch'))).toBe('qaFailed');
    expect(askErrorKey(undefined)).toBe('qaFailed');
  });
});

describe('abstainMessageKey / sourceLabelKey', () => {
  it('maps each abstain reason — an abstain is a state, not an error', () => {
    expect(abstainMessageKey('NO_SOURCES')).toBe('qaNoSources');
    expect(abstainMessageKey('LOW_CONFIDENCE')).toBe('qaLowConfidence');
    expect(abstainMessageKey(null)).toBe('qaLowConfidence');
  });

  it('labels each citation source', () => {
    expect(sourceLabelKey('PRODUCT')).toBe('qaSourceProduct');
    expect(sourceLabelKey('SKU')).toBe('qaSourceSku');
    expect(sourceLabelKey('REVIEW')).toBe('qaSourceReview');
  });
});
