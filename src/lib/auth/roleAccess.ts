/**
 * Single source of truth for role-based capabilities (P2-04).
 *
 * Roles are single-valued (`rol_name`): `admin`, `shop`, or a plain user role.
 * "Seller capability" means owning a shop — i.e. the `shop` role. An **admin is
 * a platform operator, not a seller**, so admin tooling and seller tooling are
 * distinct: an admin must NOT see seller navigation unless the role itself has
 * seller capability.
 */

export type RequiredRole = 'admin' | 'shop';

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
