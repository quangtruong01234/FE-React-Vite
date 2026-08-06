import { describe, it, expect } from 'vitest';
import { resolveUploadOwner, UPLOAD_LOGIN_REQUIRED } from './uploadOwner';

describe('resolveUploadOwner', () => {
  it('returns the owner id for an authenticated user', () => {
    expect(resolveUploadOwner({ id: 'usr_0000000000000018' })).toEqual({ ownerId: 'usr_0000000000000018' });
  });

  it('accepts an opaque id without treating it as unauthenticated', () => {
    expect(resolveUploadOwner({ id: 'usr_0000000000000000' })).toEqual({ ownerId: 'usr_0000000000000000' });
  });

  it('errors when the user is null', () => {
    expect(resolveUploadOwner(null)).toEqual({ error: UPLOAD_LOGIN_REQUIRED });
  });

  it('errors when the user is undefined', () => {
    expect(resolveUploadOwner(undefined)).toEqual({ error: UPLOAD_LOGIN_REQUIRED });
  });
});
