import { describe, it, expect } from 'vitest';
import {
  RESEND_COOLDOWN_SECONDS,
  RESET_ATTEMPTS_BEFORE_HINT,
  RESET_ATTEMPT_LIMIT,
  forgotPasswordErrorMessage,
  resetPasswordErrorMessage,
  resendCooldownRemaining,
  nextResetAttempts,
  resetAttemptHint,
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

describe('nextResetAttempts', () => {
  it('counts a 400 — the only status that means the code was rejected', () => {
    expect(nextResetAttempts(0, apiError(400, 'Invalid or expired verification code'))).toBe(1);
    expect(nextResetAttempts(4, apiError(400))).toBe(5);
  });

  it('does not count a 429 or a connection failure — neither reached verification', () => {
    expect(nextResetAttempts(2, apiError(429))).toBe(2);
    expect(nextResetAttempts(2, new TypeError('fetch failed'))).toBe(2);
    expect(nextResetAttempts(2, undefined)).toBe(2);
  });
});

describe('resetAttemptHint', () => {
  it('stays silent below the hint threshold', () => {
    for (let attempts = 0; attempts < RESET_ATTEMPTS_BEFORE_HINT; attempts += 1) {
      expect(resetAttemptHint(attempts)).toBeNull();
    }
  });

  it('warns from the third failure that a new code will be needed', () => {
    const hint = resetAttemptHint(RESET_ATTEMPTS_BEFORE_HINT);
    expect(hint).toMatch(/xin mã mới/);
    expect(hint).toMatch(/Gửi lại mã/);
  });

  it('says the code is dead once the server limit is reached', () => {
    const hint = resetAttemptHint(RESET_ATTEMPT_LIMIT);
    expect(hint).toMatch(/không còn dùng được/);
    expect(resetAttemptHint(RESET_ATTEMPT_LIMIT + 3)).toBe(hint);
  });

  it('never promises an exact number of attempts left (our count only sees this tab)', () => {
    for (const attempts of [3, 4, 5, 9]) {
      expect(resetAttemptHint(attempts)).not.toMatch(/còn \d+ lần/);
    }
  });
});
