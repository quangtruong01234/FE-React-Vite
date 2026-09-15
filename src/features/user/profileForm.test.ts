import { describe, it, expect } from 'vitest';
import { profileFormSchema } from './profileForm';

const valid = { name: 'Quang', email: 'quang@example.com' };

describe('profileFormSchema', () => {
  it('accepts a filled-in profile', () => {
    const result = profileFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a name made only of whitespace', () => {
    // Without `.trim()` this passes `min(1)`, is saved as-is, and every label
    // for the account renders blank afterwards.
    const result = profileFormSchema.safeParse({ ...valid, name: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Tên không được trống');
  });

  it('rejects an empty name', () => {
    expect(profileFormSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('saves the trimmed name, not what was typed', () => {
    const result = profileFormSchema.safeParse({ ...valid, name: '  Quang  ' });
    expect(result.success && result.data.name).toBe('Quang');
  });

  it('still rejects a malformed email', () => {
    const result = profileFormSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Email không hợp lệ');
  });

  it('treats the avatar as optional', () => {
    expect(profileFormSchema.safeParse({ ...valid, avatar: undefined }).success).toBe(true);
    expect(profileFormSchema.safeParse({ ...valid, avatar: 'https://cdn/x.png' }).success).toBe(true);
  });
});
