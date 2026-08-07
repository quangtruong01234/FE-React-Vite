// --- User & Role ---

/**
 * Backend 2026-08-06: the raw `rol_*` entity (audit columns + `rol_grants`
 * permission rows) no longer reaches the browser. Every user-bearing response
 * now carries exactly these three fields; `name` is the gating value that was
 * `rol_name`.
 */
export interface Role {
  id: number;
  name: string;
  slug: string;
}

/**
 * Shape returned by the public read `GET /user/:id` (and any public seller/author
 * decoration): identity + display fields only. `email`/`role` are NOT included —
 * backend strips them from public reads (handoff 2026-07-07). For the current
 * user's own email/role read `useAuthContext().currentUser` (backed by `/user/me`).
 */
export interface PublicUser {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  isActive: boolean;
}

export interface User extends PublicUser {
  email: string;
  role: Role;
  createdAt?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  avatar?: string;
}

/** Public seller card for the feed right-rail — no email/role/grants. */
export interface FeaturedSeller {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}
