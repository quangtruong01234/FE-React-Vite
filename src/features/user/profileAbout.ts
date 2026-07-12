import type { User } from '@/types';

export interface ProfileContactInfo {
  email: string;
  roleName: string;
}

/**
 * Private contact fields (email + role) are only available for the current user's
 * own profile — the public read `GET /user/:id` no longer returns them
 * (handoff 2026-07-07). Return them from the authenticated `currentUser` only when
 * the profile being viewed is the viewer's own; otherwise `null` (hide the block).
 */
export function profileContactInfo(
  isMe: boolean,
  currentUser: Pick<User, 'email' | 'role'> | null,
): ProfileContactInfo | null {
  if (!isMe || !currentUser) return null;
  return { email: currentUser.email, roleName: currentUser.role.rol_name };
}
