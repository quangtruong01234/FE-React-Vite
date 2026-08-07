import { describe, expect, it } from 'vitest';
import { credentialConflictError } from './credentialConflict';

const FALLBACK = 'Đăng ký thất bại. Vui lòng thử lại.';

describe('credentialConflictError', () => {
  it('points a taken-username 409 at the username field', () => {
    expect(
      credentialConflictError({ statusCode: 409, message: 'Username is already taken' }, FALLBACK),
    ).toEqual({
      field: 'username',
      message: 'Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.',
    });
  });

  it('points a taken-email 409 at the email field', () => {
    expect(
      credentialConflictError({ statusCode: 409, message: 'Email is already registered' }, FALLBACK),
    ).toEqual({
      field: 'email',
      message: 'Email này đã được đăng ký. Hãy dùng email khác hoặc đăng nhập.',
    });
  });

  it('reads `status` when the error carries that instead of `statusCode`', () => {
    expect(credentialConflictError({ status: 409, message: 'Email is already registered' }, FALLBACK).field)
      .toBe('email');
  });

  it('falls back to the form-level banner for a 409 that names neither field', () => {
    expect(credentialConflictError({ statusCode: 409, message: 'Conflict' }, FALLBACK)).toEqual({
      field: null,
      message: 'Conflict',
    });
  });

  it('keeps a non-409 backend message at form level (400 validation)', () => {
    expect(
      credentialConflictError({ statusCode: 400, message: 'password must be longer' }, FALLBACK),
    ).toEqual({ field: null, message: 'password must be longer' });
  });

  it('never mistakes a non-409 duplicate message for a field conflict', () => {
    // The 500 the backend used to answer must NOT light up the email input —
    // it was not a conflict signal, just a generic database failure.
    expect(
      credentialConflictError({ statusCode: 500, message: 'Database operation failed' }, FALLBACK).field,
    ).toBeNull();
  });

  it('uses the caller fallback when there is no usable message', () => {
    expect(credentialConflictError(new TypeError('Failed to fetch'), FALLBACK)).toEqual({
      field: null,
      message: FALLBACK,
    });
    expect(credentialConflictError(undefined, FALLBACK).message).toBe(FALLBACK);
  });
});
