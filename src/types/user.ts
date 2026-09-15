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
 * Every role name the backend accepts on `PATCH /user/:id/role` (ROLE-ADMIN-01,
 * 2026-09-15) — the whole set, not a subset. `Role.name` stays a plain `string`
 * because it is read from arbitrary responses; this union is for the *write*
 * side, where anything else is a 400.
 *
 * `logistics_operator` / `shipping_manager` belong to the GHN console's world —
 * the storefront admin panel must not hand them out (see
 * `features/admin/userRole.ts`).
 */
export type RoleName =
  | 'user'
  | 'shop'
  | 'admin'
  | 'logistics_operator'
  | 'shipping_manager';

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

/**
 * The signed-in user as `GET /user/me` returns it (ROLE-ADMIN-01 follow-up,
 * 2026-09-16). The two extra keys exist on **that route only** — `POST
 * /user/login` deliberately omits them, because the token is minted in the same
 * call and cannot be stale yet.
 *
 * - `role.name` is the role in the **database** — display only.
 * - `tokenRole` is the role baked into the **JWT**, and it is the one the
 *   backend enforces. A user promoted to `shop` who has not signed in again
 *   still eats a 403 from `POST /products` while `role.name` already reads
 *   `shop`; `tokenRole` is what predicts that correctly.
 * - `isRoleStale` is `role.name !== tokenRole`, computed backend-side.
 *
 * Both are optional even though the gateway always sends them: this same cache
 * entry (`queryKeys.auth.me`) is also seeded from the *login* response by
 * `useAuth.loginSuccess`, and is served by pre-rollout gateways. Never read them
 * raw — go through `sessionRole()` / `hasStaleRole()` (`lib/auth/roleAccess.ts`),
 * which fall back to `role.name` (correct in both of those cases: the token was
 * just minted / the backend has no opinion yet).
 */
export interface CurrentUser extends User {
  tokenRole?: string;
  isRoleStale?: boolean;
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

/**
 * One row of `GET /user/search` (SEARCH-01) — any active account, not just
 * shops. `name` is null when the account never set a display name, so render
 * `username` as the label in that case.
 */
export interface UserSearchResult {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}
