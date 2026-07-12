// --- User & Role ---

export interface RoleGrant {
  actions: string[];
  attributes: string;
  conditions: string;
  resourceId: number;
}

export interface Role {
  rol_id: number;
  rol_name: string;
  rol_slug: string;
  rol_status: string;
  rol_description: string;
  rol_created_by: string;
  rol_updated_by: string;
  rol_grants: RoleGrant[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Shape returned by the public read `GET /user/:id` (and any public seller/author
 * decoration): identity + display fields only. `email`/`role` are NOT included —
 * backend strips them from public reads (handoff 2026-07-07). For the current
 * user's own email/role read `useAuthContext().currentUser` (backed by `/user/me`).
 */
export interface PublicUser {
  id: number;
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
  id: number;
  username: string;
  name: string | null;
  avatar: string | null;
}
