// --- User & Role ---

/**
 * Backend 2026-08-06: the raw `rol_*` entity (audit columns + `rol_grants`
 * permission rows) no longer reaches the browser. Every user-bearing response
 * now carries exactly these two fields; `name` is the gating value that was
 * `rol_name` — and the only stable machine key (OVERFETCH-01, 2026-08-20:
 * `slug` was a per-row display string, never a key, and is no longer sent).
 */
export interface Role {
  id: number;
  name: string;
}

/**
 * Hydrated user reference the gateway embeds next to a bare id (OVERFETCH-01 §7):
 * `actorId` → `actor`, `reviewedBy` → `reviewer`, `reporterId` → `reporter`.
 * The id key itself is unchanged, so every consumer must treat the embed as
 * optional — it is absent on rows whose id is null, and on any response served
 * before the backend rollout.
 */
export interface UserSummary {
  id: string;
  username: string;
  avatar: string | null;
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
