// --- GHN master-data (shipping) ---
// Backed by the gateway master-data proxy (handoff 2026-07-01). `id` is the exact
// GHN code the fee preview + waybill consume — store it, never re-resolve free-text.

/** A GHN province. `id` = GHN `ProvinceID`. */
export interface Province {
  id: number;
  name: string;
}

/** A GHN district. `id` = GHN `DistrictID`. */
export interface District {
  id: number;
  name: string;
}

/** A GHN ward. `id` = GHN `WardCode` (a string, not numeric). */
export interface Ward {
  id: string;
  name: string;
}

// --- Address book (per-user, scoped to the authenticated user) ---

/** A saved shipping address. GHN codes captured alongside display names. */
export interface Address {
  id: number;
  userId: number;
  recipientName: string;
  phone: string;
  addressLine: string;
  provinceId: number;
  provinceName: string;
  districtId: number;
  districtName: string;
  wardCode: string;
  wardName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Body for `POST /user/me/addresses`. First address is forced default server-side. */
export interface CreateAddressDto {
  recipientName: string;
  phone: string;
  addressLine: string;
  provinceId: number;
  provinceName: string;
  districtId: number;
  districtName: string;
  wardCode: string;
  wardName: string;
  isDefault?: boolean;
}

/** Body for `PATCH /user/me/addresses/:id` — all fields optional (partial update). */
export type UpdateAddressDto = Partial<CreateAddressDto>;
