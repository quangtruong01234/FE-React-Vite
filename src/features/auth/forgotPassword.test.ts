import { describe, it, expect } from 'vitest';
import {
  RESEND_COOLDOWN_SECONDS,
  forgotPasswordErrorMessage,
  resetPasswordErrorMessage,
  resendCooldownRemaining,
  isResetCodeExhausted,
} from './forgotPassword';
import type { ApiError } from '@/types';

function apiError(statusCode: number, message = ''): ApiError {
  return { statusCode, status: statusCode, message };
}

/** A 400 the backend tagged as "this code is dead for good" (MAIL-UI-01). */
function exhausted(): ApiError {
  return { ...apiError(400, 'Invalid or expired verification code'), errorCode: 'RESET_CODE_EXHAUSTED' };
}

describe('forgotPasswordErrorMessage', () => {
  it('maps 429 to the rate-limit message', () => {
    expect(forgotPasswordErrorMessage(apiError(429, 'Too Many Requests'))).toMatch(/quá nhanh/);
  });

  it('maps 400 to the invalid-email message', () => {
    expect(forgotPasswordErrorMessage(apiError(400, 'email must be an email'))).toBe('Email không hợp lệ.');
  });

  it('falls back to the connection message for unknown errors', () => {
    expect(forgotPasswordErrorMessage(new TypeError('fetch failed'))).toMatch(/kết nối/);
    expect(forgotPasswordErrorMessage(undefined)).toMatch(/kết nối/);
  });
});

describe('resetPasswordErrorMessage', () => {
  it('maps an untagged 400 to the pooled invalid/expired-code message', () => {
    expect(resetPasswordErrorMessage(apiError(400, 'Invalid or expired verification code'))).toMatch(
      /không đúng hoặc đã hết hạn/,
    );
  });

  it('tells the user to ask for a new code once the server says this one is dead', () => {
    const message = resetPasswordErrorMessage(exhausted());
    expect(message).toMatch(/không còn dùng được/);
    expect(message).toMatch(/Gửi lại mã/);
  });

  it('never promises an exact number of attempts left — the backend does not return one', () => {
    expect(resetPasswordErrorMessage(exhausted())).not.toMatch(/còn \d+ lần/);
  });

  it('maps 429 to the rate-limit message', () => {
    expect(resetPasswordErrorMessage(apiError(429))).toMatch(/quá nhanh/);
  });

  it('falls back to the connection message for unknown errors', () => {
    expect(resetPasswordErrorMessage(new Error('boom'))).toMatch(/kết nối/);
  });
});

describe('isResetCodeExhausted', () => {
  it('is true only for the tagged 400', () => {
    expect(isResetCodeExhausted(exhausted())).toBe(true);
  });

  it('is false for an untagged 400 — that is one of the four pooled causes', () => {
    // The whole point of the field: an ordinary wrong code still deserves
    // "check the email and try again", not "this code is dead".
    expect(isResetCodeExhausted(apiError(400, 'Invalid or expired verification code'))).toBe(false);
  });

  it('is false for every non-400 failure and for a non-HTTP error', () => {
    expect(isResetCodeExhausted(apiError(429))).toBe(false);
    expect(isResetCodeExhausted(new TypeError('fetch failed'))).toBe(false);
    expect(isResetCodeExhausted(undefined)).toBe(false);
  });

  it('does not match a different errorCode value', () => {
    expect(isResetCodeExhausted({ ...apiError(400), errorCode: 'SOMETHING_ELSE' })).toBe(false);
  });
});

describe('resendCooldownRemaining', () => {
  const t0 = 1_700_000_000_000;

  it('returns 0 when no cooldown has started', () => {
    expect(resendCooldownRemaining(null, t0)).toBe(0);
  });

  it('counts whole seconds remaining, rounding up partial seconds', () => {
    const until = t0 + RESEND_COOLDOWN_SECONDS * 1000;
    expect(resendCooldownRemaining(until, t0)).toBe(60);
    expect(resendCooldownRemaining(until, t0 + 30_000)).toBe(30);
    expect(resendCooldownRemaining(until, t0 + 59_500)).toBe(1);
  });

  it('clamps to 0 once the deadline has passed', () => {
    const until = t0 + 1000;
    expect(resendCooldownRemaining(until, t0 + 1000)).toBe(0);
    expect(resendCooldownRemaining(until, t0 + 5000)).toBe(0);
  });
});

