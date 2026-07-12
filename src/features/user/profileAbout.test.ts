import { describe, expect, it } from 'vitest';
import type { User } from '@/types';
import { profileContactInfo } from './profileAbout';

const me = {
  email: 'me@trybuy.test',
  role: { rol_name: 'shop' } as User['role'],
} satisfies Pick<User, 'email' | 'role'>;

describe('profileContactInfo', () => {
  it('returns email + role name when viewing your own profile', () => {
    expect(profileContactInfo(true, me)).toEqual({
      email: 'me@trybuy.test',
      roleName: 'shop',
    });
  });

  it('returns null when viewing someone else’s profile (email/role are private)', () => {
    expect(profileContactInfo(false, me)).toBeNull();
  });

  it('returns null when there is no authenticated user', () => {
    expect(profileContactInfo(true, null)).toBeNull();
  });
});
