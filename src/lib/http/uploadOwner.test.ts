import { describe, it, expect } from 'vitest';
import { mediaNotOwnedMessage, MEDIA_NOT_OWNED, resolveUploadOwner, UPLOAD_LOGIN_REQUIRED } from './uploadOwner';

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

describe('resolveUploadOwner in English (I18N-07)', () => {
  it('asks a signed-out user to sign in, in English', () => {
    expect(resolveUploadOwner(null, 'en')).toEqual({ error: 'You need to sign in to upload files.' });
  });
});

describe('mediaNotOwnedMessage', () => {
  it('maps the MEDIA_NOT_OWNED 403 to its own copy in both languages', () => {
    const err = { statusCode: 403, status: 403, message: 'Cannot attach media uploaded by another user', errorCode: MEDIA_NOT_OWNED };
    expect(mediaNotOwnedMessage(err)).toBe('Có ảnh không phải do bạn tải lên. Hãy xoá ảnh đó và tải lại.');
    expect(mediaNotOwnedMessage(err, 'en')).toBe("One of the images wasn't uploaded by you. Remove it and upload it again.");
  });

  it('returns null for any other error, including an untagged 403', () => {
    expect(mediaNotOwnedMessage({ statusCode: 403, status: 403, message: 'Forbidden' })).toBeNull();
    expect(mediaNotOwnedMessage({ statusCode: 400, status: 400, message: 'x', errorCode: 'RETURN_PHOTO_INVALID' })).toBeNull();
    expect(mediaNotOwnedMessage(undefined)).toBeNull();
  });
});
