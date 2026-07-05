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

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role: Role;
  isActive: boolean;
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
