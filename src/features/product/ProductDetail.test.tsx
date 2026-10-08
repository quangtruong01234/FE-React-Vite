import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import ProductDetail from './ProductDetail';
import type { ProductWithInventory } from '@/types';

vi.mock('@/context/useAuthContext', () => ({ useAuthContext: () => ({ currentUser: null }) }));
// Sections below the fold fetch on their own; they play no part in the swap.
vi.mock('./ProductReviews', () => ({ ProductReviews: () => null }));
vi.mock('./ShopOtherProducts', () => ({ ShopOtherProducts: () => null }));
vi.mock('./ProductQuestionBox', () => ({ ProductQuestionBox: () => null }));
vi.mock('./SellerFollowButton', () => ({ SellerFollowButton: () => null }));
vi.mock('@/components/shared/WishlistButton', () => ({ WishlistButton: () => null }));

const product: ProductWithInventory = {
  id: 'prod_aaaaaaaaaaaaaaaa',
  name: 'Bàn phím cơ',
  description: '',
  price: 990000,
  imageUrls: [],
  sku: null,
  condition: 'new',
  categoryIds: [],
  userId: 'usr_0000000000000002',
  isFeatured: false,
  isTrending: false,
  rating: 0,
  ratingCount: 0,
  likesCount: 0,
  commentsCount: 0,
  sharesCount: 0,
  viewCount: 0,
  inventory: { availableStock: 5, reservedStock: 0, totalStock: 5, isLowStock: false },
};

interface Frame { nav: string; body: Element; bodyClass: string; crumb: string }

/** The layout above the gallery grid — everything whose height can push it. */
function frame(): Frame {
  const nav = screen.getByRole('button', { name: 'Quay lại' }).parentElement;
  const body = nav?.nextElementSibling;
  if (!nav || !body?.firstElementChild) throw new Error('PDP frame not rendered');
  return { nav: nav.className, body, bodyClass: body.className, crumb: body.firstElementChild.className };
}

// F29 (prod route test 2026-10-08): the skeleton's nav was 6px shorter and had
// no breadcrumb row, and React reuses the body node across the swap — a 0.28
// CLS on every product page load.
describe('ProductDetail loading skeleton', () => {
  it('keeps the nav, body and breadcrumb geometry when the product arrives', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(
      http.get(`${API_BASE}/products/:id/with-inventory`, async () => {
        await gate;
        return HttpResponse.json({ data: product });
      }),
    );
    renderWithProviders(
      <Routes>
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>,
      { route: `/product/${product.id}` },
    );

    const skeleton = frame();
    expect(screen.queryByText(product.name)).not.toBeInTheDocument();

    release();
    expect(await screen.findByText(product.name, { selector: 'h1' })).toBeInTheDocument();

    const loaded = frame();
    expect(loaded.nav).toBe(skeleton.nav);
    expect(loaded.body).toBe(skeleton.body);
    expect(loaded.bodyClass).toBe(skeleton.bodyClass);
    expect(loaded.crumb).toBe(skeleton.crumb);
  });
});
