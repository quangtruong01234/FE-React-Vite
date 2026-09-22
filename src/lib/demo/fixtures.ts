import pick from 'lodash/pick';
import type {
  Brand,
  Category,
  CurrentUser,
  FeaturedSeller,
  OrderStatusCounts,
  PaginatedResponse,
  PaymentOption,
  Post,
  ProductWithInventory,
  PublicUser,
} from '@/types';

/**
 * Read-only sample data for demo mode. Shapes mirror the gateway exactly (same
 * opaque `usr_`/`prod_`/`post_` ids, same `{ data }` envelope handling in
 * `handlers.ts`) so every component renders the code path it renders in
 * production — a fixture that cheated on shape would hide real bugs.
 *
 * No real people and no real product listings: everything here is invented.
 */

const DEMO_SELLER_ID = 'usr_demo000000000001';
export const DEMO_USER_ID = 'usr_demo000000000002';

/**
 * The session demo mode runs under. `role.name` is `user`, so the seller and
 * admin areas stay closed exactly as they would for a signed-in shopper — demo
 * mode widens what is *visible*, never what is *permitted*.
 */
export const demoCurrentUser: CurrentUser = {
  id: DEMO_USER_ID,
  username: 'demo_visitor',
  name: 'Demo Visitor',
  avatar: null,
  isActive: true,
  email: 'demo@trybuy.example',
  role: { id: 2, name: 'user' },
  tokenRole: 'user',
  isRoleStale: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

/**
 * The right rail's "Seller nổi bật". One entry, and it is the same store that
 * authors `demoPosts` — inventing extra sellers with no posts and no products
 * behind them would put names in the UI that lead nowhere.
 */
export const demoFeaturedSellers: FeaturedSeller[] = [
  { id: DEMO_SELLER_ID, username: 'demo_store', name: 'Demo Store', avatar: null },
];

/**
 * The only two profiles that exist in demo mode: the visitor, and the store
 * behind `demoPosts` and `demoProducts`. `GET /user/:id` answers from this list
 * and 404s everything else, the same as the catalog lookup — a profile page for
 * an id nothing links to would be inventing a person.
 */
export const demoPublicUsers: PublicUser[] = [
  { id: DEMO_SELLER_ID, username: 'demo_store', name: 'Demo Store', avatar: null, isActive: true },
  pick(demoCurrentUser, ['id', 'username', 'name', 'avatar', 'isActive']),
];

/** No orders in demo mode, so every filter badge on `/orders` reads zero. */
export const demoOrderStatusCounts: OrderStatusCounts = {
  all: 0,
  pending: 0,
  confirmed: 0,
  processing: 0,
  shipped: 0,
  delivering: 0,
  completed: 0,
  canceled: 0,
  return_requested: 0,
  refunded: 0,
};

/**
 * The three methods checkout offers. A read, so it is mocked like every other
 * read — the order POST behind the button still answers 503.
 */
export const demoPaymentOptions: PaymentOption[] = [
  { id: 'cod', name: 'Thanh toán khi nhận hàng', description: 'Trả tiền mặt cho shipper.' },
  { id: 'vnpay', name: 'VNPay', description: 'Thanh toán qua cổng VNPay.' },
  { id: 'zalopay', name: 'ZaloPay', description: 'Thanh toán qua ví ZaloPay.' },
];

export const demoCategories: Category[] = [
  { id: 16, name: 'Laptop', isActive: true },
  { id: 18, name: 'Điện thoại', isActive: true },
  { id: 21, name: 'Phụ kiện', isActive: true },
];

export const demoBrands: Brand[] = [
  { id: 4, name: 'Aurora', isActive: true },
  { id: 7, name: 'Nimbus', isActive: true },
];

function demoProduct(
  id: string,
  name: string,
  price: number,
  categoryIds: number[],
  brandId: number,
  availableStock: number,
): ProductWithInventory {
  return {
    id,
    name,
    description:
      'Sample listing served from local fixtures while the backend is outside its scheduled window.',
    price,
    imageUrls: [],
    sku: `DEMO-${id.slice(-4).toUpperCase()}`,
    condition: 'new',
    brandId,
    categoryIds,
    isActive: true,
    userId: DEMO_SELLER_ID,
    user: { id: DEMO_SELLER_ID, name: 'Demo Store' },
    isFeatured: false,
    isTrending: false,
    rating: 4.5,
    ratingCount: 12,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewCount: 240,
    weight: 800,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    inventory: {
      availableStock,
      reservedStock: 0,
      totalStock: availableStock,
      isLowStock: availableStock < 5,
    },
  };
}

export const demoProducts: ProductWithInventory[] = [
  demoProduct('prod_demo00000000a1', 'Aurora Book 14 — 16GB / 512GB', 18990000, [16], 4, 9),
  demoProduct('prod_demo00000000a2', 'Aurora Book Pro 16 — 32GB / 1TB', 32490000, [16], 4, 4),
  demoProduct('prod_demo00000000b1', 'Nimbus One 5G — 256GB', 9490000, [18], 7, 15),
  demoProduct('prod_demo00000000b2', 'Nimbus Lite 5G — 128GB', 5290000, [18], 7, 22),
  demoProduct('prod_demo00000000c1', 'Nimbus Buds Air', 1290000, [21], 7, 40),
  demoProduct('prod_demo00000000c2', 'Aurora 65W GaN Charger', 690000, [21], 4, 33),
];

export const demoPosts: Post[] = [
  {
    id: 'post_demo0000000001',
    userId: DEMO_SELLER_ID,
    content:
      'Demo mode: the storefront is live, the backend is parked outside its scheduled window. Catalog pages read from local fixtures.',
    imageUrls: null,
    videoUrl: null,
    productId: 'prod_demo00000000a1',
    createdAt: '2026-02-02T09:00:00.000Z',
    updatedAt: '2026-02-02T09:00:00.000Z',
    likeCount: 3,
    commentCount: 0,
    isLiked: false,
    author: { id: DEMO_SELLER_ID, username: 'demo_store', name: 'Demo Store', avatar: null },
  },
  {
    id: 'post_demo0000000002',
    userId: DEMO_SELLER_ID,
    content: 'New in: Nimbus One 5G. Sign in during the backend window to order.',
    imageUrls: null,
    videoUrl: null,
    productId: 'prod_demo00000000b1',
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-02-01T09:00:00.000Z',
    likeCount: 8,
    commentCount: 0,
    isLiked: false,
    author: { id: DEMO_SELLER_ID, username: 'demo_store', name: 'Demo Store', avatar: null },
  },
];

/** One fixed page — demo mode has no second page to fetch. */
export function demoPage<T>(items: T[]): PaginatedResponse<T> {
  return {
    data: items,
    total: items.length,
    page: 1,
    limit: items.length,
    totalPages: 1,
    hasNext: false,
  };
}
