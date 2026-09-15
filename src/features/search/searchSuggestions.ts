import truncate from 'lodash/truncate';
import { userDisplayName, nonBlank } from '@/lib/format/user';

/**
 * Header search suggestions — the pure half.
 *
 * All three groups are real server-side searches since SEARCH-01 shipped
 * (`GET /products?search=`, `GET /social/posts?search=`, `GET /user/search`),
 * so nothing here re-filters what the backend already matched: this file only
 * caps, orders, labels and links the rows. `foldText` stays because the
 * minimum-length gate is measured on the folded query.
 */

/** Below this, typing is too ambiguous to be worth three requests. */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/** Rows kept per group — the dropdown is a shortcut, not a results page. */
export const SUGGESTION_LIMITS = { product: 5, seller: 3, post: 3 } as const;

const POST_SNIPPET_LENGTH = 72;

export type SuggestionKind = 'product' | 'seller' | 'post';

export type Suggestion =
  | { kind: 'product'; id: string; to: string; label: string; imageUrl: string | null; price: number }
  | { kind: 'seller'; id: string; to: string; label: string; avatar: string | null; username: string }
  | { kind: 'post'; id: string; to: string; label: string; avatar: string | null; author: string };

/** Minimal shapes so tests (and future callers) don't have to build full DTOs. */
export interface ProductLike {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}

export interface PostLike {
  id: string;
  content: string;
  author: { id: string; username: string; name?: string | null; avatar: string | null };
}

export interface SellerLike {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}

/**
 * Case- and diacritics-insensitive fold for matching Vietnamese text: "Điện
 * thoại" must match a query typed as "dien thoai". `đ`/`Đ` have no canonical
 * decomposition, so NFD alone leaves them — they are mapped by hand after the
 * lowercase pass.
 */
// U+0300–U+036F: the combining-mark block NFD splits Vietnamese accents into.
// Built from char codes rather than written inline — the literal marks are
// invisible in an editor and get mangled by the first careless copy/paste.
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  'g',
);

export function foldText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .trim();
}

function productImage(product: ProductLike): string | null {
  return nonBlank(product.imageUrl) ?? nonBlank(product.imageUrls?.[0]);
}

/** Every group arrives already server-searched — kept in backend order. */
export interface SuggestionInput {
  query: string;
  products: readonly ProductLike[];
  posts: readonly PostLike[];
  sellers: readonly SellerLike[];
}

/**
 * Flat, ordered list (products → sellers → posts). Flat rather than nested so
 * the keyboard cursor is a single index; the dropdown starts a new group header
 * whenever `kind` changes.
 */
export function buildSuggestions({ query, products, posts, sellers }: SuggestionInput): Suggestion[] {
  if (foldText(query).length < SEARCH_MIN_QUERY_LENGTH) return [];

  const productRows: Suggestion[] = products
    .slice(0, SUGGESTION_LIMITS.product)
    .map((product): Suggestion => ({
      kind: 'product',
      id: product.id,
      to: `/product/${product.id}`,
      label: product.name,
      imageUrl: productImage(product),
      price: product.price,
    }));

  const sellerRows: Suggestion[] = sellers
    .slice(0, SUGGESTION_LIMITS.seller)
    .map((seller): Suggestion => ({
      kind: 'seller',
      id: seller.id,
      to: `/profile/${seller.id}`,
      // `name` is nullable server-side, and an account that only ever had a
      // username must still read as something — not as an empty row.
      label: userDisplayName(seller),
      avatar: seller.avatar,
      username: seller.username,
    }));

  const postRows: Suggestion[] = posts
    .slice(0, SUGGESTION_LIMITS.post)
    .map((post): Suggestion => ({
      kind: 'post',
      id: post.id,
      to: `/post/${post.id}`,
      label: truncate(post.content.replace(/\s+/g, ' ').trim(), { length: POST_SNIPPET_LENGTH }),
      avatar: post.author.avatar,
      author: userDisplayName(post.author),
    }));

  return [...productRows, ...sellerRows, ...postRows];
}

export const GROUP_LABELS: Record<SuggestionKind, string> = {
  product: 'Sản phẩm',
  seller: 'Seller',
  post: 'Bài viết',
};
