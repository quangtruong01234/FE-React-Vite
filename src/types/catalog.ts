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
  submittedBy: number;
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
  submittedBy: number;
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
