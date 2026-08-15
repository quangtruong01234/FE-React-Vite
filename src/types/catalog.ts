// --- Brand & Category (catalog + admin moderation) ---

export interface Brand {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface PendingBrand {
  id: number;
  name: string;
  description?: string;
  /** IDLEAK-02: opaque `usr_…` id. `null` when the account no longer resolves, absent when the user service is down. */
  submittedBy?: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface PendingCategory {
  id: number;
  name: string;
  description?: string;
  /** IDLEAK-02: opaque `usr_…` id. `null` when the account no longer resolves, absent when the user service is down. */
  submittedBy?: string | null;
  createdAt: string;
}

export interface CreateBrandDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface ReviewDto {
  action: 'approve' | 'reject';
  note?: string;
}
