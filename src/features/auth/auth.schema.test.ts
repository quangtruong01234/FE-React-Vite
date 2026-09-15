import { describe, it, expect } from 'vitest';
import { registerSchema } from './auth.schema';

const validRegister = {
  username: 'newbie',
  email: 'new@b.com',
  password: 'password123',
  confirmPassword: 'password123',
};

/**
 * NAME-TRIM-01. `POST /user/register` used to accept `username: "   "` and
 * create an account with no renderable label anywhere in the app; since
 * 2026-09-15 the gateway trims first and 400s. These pin the client to the same
 * boundary so the user gets the error under the field instead of a round-trip.
 */
describe('registerSchema — username whitespace', () => {
  it.each(['   ', '\t', '\n \t ', ''])('rejects a blank username (%j)', (username) => {
    const result = registerSchema.safeParse({ ...validRegister, username });

    expect(result.success).toBe(false);
    const issue = result.success ? undefined : result.error.issues[0];
    expect(issue?.path).toEqual(['username']);
    expect(issue?.message).toBe('Username là bắt buộc');
  });

  it('trims the padded username it passes on, not just for validation', () => {
    const result = registerSchema.safeParse({ ...validRegister, username: '  john  ' });

    // The value that reaches the mutation must be the trimmed one: the backend
    // stores `"john"`, and the auto-login right after register does not trim.
    expect(result.success && result.data.username).toBe('john');
  });

  it('leaves an inner space alone — only the ends are trimmed', () => {
    const result = registerSchema.safeParse({ ...validRegister, username: '  jo hn  ' });

    expect(result.success && result.data.username).toBe('jo hn');
  });

  it('never trims the password — spaces can be part of a real secret', () => {
    const padded = '  password123  ';
    const result = registerSchema.safeParse({
      ...validRegister,
      password: padded,
      confirmPassword: padded,
    });

    expect(result.success && result.data.password).toBe(padded);
  });

  it('still accepts an ordinary username', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });
});
