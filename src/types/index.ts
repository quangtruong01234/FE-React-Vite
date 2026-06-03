export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  avatar?: string | null;
  role: string;
  isActive: boolean;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  avatar?: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
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

export interface Inventory {
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  isLowStock: boolean;
}

export interface InventoryRecord {
  id: number;
  productId: number;
  sku: string;
  availableStock: number;
  reservedStock?: number;
  minimumStock?: number;
  location?: string;
  isLowStock: boolean;
}

export interface CreateInventoryDto {
  productId: number;
  sku: string;
  availableStock: number;
  minimumStock?: number;
  location?: string;
}

export interface UpdateInventoryDto {
  sku?: string;
  availableStock?: number;
  minimumStock?: number;
  location?: string;
}

export interface StockCheckRequest {
  productId: number;
  quantity: number;
}

export interface StockCheckResponse {
  available: boolean;
  availableStock: number;
}

export interface StockCheckResult {
  available: boolean;
  availableStock: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  sku: string;
  condition: 'new' | 'used' | 'refurbished';
  brandId?: number;
  categoryId: number;
  userId: number;
  brand?: Brand;
  category?: Category;
  user?: { name?: string; avatar?: string };
  isFeatured: boolean;
  isTrending: boolean;
  rating: number;
  ratingCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewCount: number;
  sellerNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductWithInventory extends Product {
  inventory: Inventory;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stockQuantity: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export type PaymentMethod = 'zalopay' | 'vnpay' | 'cod';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivering' | 'completed' | 'canceled';

export interface Order {
  id: number;
  user_id: number;
  total: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  shipping_address: string;
  cod_amount: number | null;
  ghn_order_code: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface OrderWithBuyer extends Order {
  buyer: {
    id: number;
    username: string;
    email: string;
    name?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ProductParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isActive?: boolean;
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface CreateOrderItemDto {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

export interface CreateOrderDto {
  payment_method: PaymentMethod;
  shipping_address: string;
  items: CreateOrderItemDto[];
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  sku: string;
  brandId?: number;
  categoryId: number;
  condition: string;
  imageUrl?: string;
  sellerNotes?: string;
  userId: number;
  isFeatured: boolean;
  isTrending: boolean;
  rating: number;
  ratingCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewCount: number;
}

export interface ApiError {
  status: number;
  message: string;
}

// --- Payment ---

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
}

export interface PaymentResult {
  gateway: string;
  status: string;
  transId: string;
  amount: string;
}

// --- Social ---

export interface Post {
  id: number;
  userId: number;
  content: string;
  imageUrls?: string[];
  videoUrl?: string;
  likeCount: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  reply_count: number;
  createdAt: string;
}

export interface CommentTree extends Comment {
  replies: CommentTree[];
}

export interface CreatePostDto {
  content: string;
  imageUrls?: string[];
  videoUrl?: string;
}

export interface CreateCommentDto {
  content: string;
}

export interface CreateReplyDto {
  content: string;
  postId: number;
}

export interface LikeResult {
  likeCount: number;
}

// --- Notification ---

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  order_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

// --- Chat ---

export interface Conversation {
  id: number;
  user1Id: number;
  user2Id: number;
  createdAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  parentMessageId: number | null;
  createdAt: string;
}

export interface CreateConversationDto {
  otherUserId: number;
}

// --- Upload ---

export interface UploadSignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

// --- Health ---

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  memory: { used: number; total: number };
  services: Record<string, string>;
}
