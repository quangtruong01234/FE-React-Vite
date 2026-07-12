import { describe, it, expect } from 'vitest';
import {
  RESEND_COOLDOWN_SECONDS,
  forgotPasswordErrorMessage,
  resetPasswordErrorMessage,
  resendCooldownRemaining,
} from './forgotPassword';
import type { ApiError } from '@/types';

function apiError(statusCode: number, message = ''): ApiError {
  return { statusCode, status: statusCode, message };
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
  it('maps every 400 to the invalid/expired-code message (causes are indistinguishable by design)', () => {
    expect(resetPasswordErrorMessage(apiError(400, 'Invalid or expired verification code'))).toMatch(
      /không đúng hoặc đã hết hạn/,
    );
  });

  it('maps 429 to the rate-limit message', () => {
    expect(resetPasswordErrorMessage(apiError(429))).toMatch(/quá nhanh/);
  });

  it('falls back to the connection message for unknown errors', () => {
    expect(resetPasswordErrorMessage(new Error('boom'))).toMatch(/kết nối/);
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
