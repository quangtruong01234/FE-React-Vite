/**
 * Single source of truth for role-based capabilities (P2-04).
 *
 * Roles are single-valued (`role.name`): `admin`, `shop`, or a plain user role.
 * "Seller capability" means owning a shop — i.e. the `shop` role. An **admin is
 * a platform operator, not a seller**, so admin tooling and seller tooling are
 * distinct: an admin must NOT see seller navigation unless the role itself has
 * seller capability.
 */

export type RequiredRole = 'admin' | 'shop';

/** The slice of the signed-in user every decision below reads. */
interface SessionRoleSource {
  role: { name: string };
  tokenRole?: string;
  isRoleStale?: boolean;
}

/**
 * The role a guard must gate on: the one baked into the JWT, because that is
 * the one the backend enforces (ROLE-ADMIN-01, 2026-09-16).
 *
 * `role.name` comes from the database and moves the instant an admin saves, but
 * the token keeps the old role until the user signs in again — measured: a
 * cookie whose `role.name` already read `shop` still got `403 Insufficient
 * permissions` from `POST /products`. Gating on `role.name` therefore lets a
 * user into `/sell`, renders the whole seller UI, and only fails at submit.
 *
 * Falls back to `role.name` when `tokenRole` is absent, which is correct in both
 * cases where it can be: the cache seeded from the *login* response (token just
 * minted ⇒ the two agree) and a gateway older than the rollout.
 */
export function sessionRole(me: SessionRoleSource): string {
  return me.tokenRole ?? me.role.name;
}

/**
 * Whether the database role has moved on from the one in the JWT — i.e. this
 * session is running on a role its owner no longer has (or does not have yet).
 * Backend-computed; absent means "no opinion", which reads as not stale.
 */
export function hasStaleRole(me: SessionRoleSource | null | undefined): boolean {
  return me?.isRoleStale ?? false;
}

/** Whether a role can sell / own a shop. Admin is intentionally excluded. */
export function canSell(roleName: string | null | undefined): boolean {
  return roleName === 'shop';
}

/** Whether a role can access admin tooling. */
export function canAdminister(roleName: string | null | undefined): boolean {
  return roleName === 'admin';
}

/**
 * Route-guard decision: does this role satisfy a route's `requiredRole`?
 * No `requiredRole` means any authenticated role is allowed.
 */
export function roleSatisfies(
  roleName: string | null | undefined,
  requiredRole?: RequiredRole,
): boolean {
  if (!requiredRole) return true;
  return requiredRole === 'admin' ? canAdminister(roleName) : canSell(roleName);
}
