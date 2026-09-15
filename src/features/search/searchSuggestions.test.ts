import { describe, it, expect } from 'vitest';
import {
  buildSuggestions,
  foldText,
  SUGGESTION_LIMITS,
  type PostLike,
  type ProductLike,
  type SellerLike,
} from './searchSuggestions';

const products: ProductLike[] = [
  { id: 'prod_1', name: 'iPhone 15', price: 1000, imageUrl: 'a.jpg' },
  { id: 'prod_2', name: 'Bàn phím cơ', price: 200, imageUrls: ['b.jpg'] },
];

const sellers: SellerLike[] = [
  { id: 'usr_1', username: 'techstore', name: 'Tech Store', avatar: null },
  { id: 'usr_2', username: 'giaydep', name: null, avatar: null },
];

const posts: PostLike[] = [
  { id: 'post_1', content: 'Đánh giá iPhone 15 sau 1 tuần', author: { id: 'usr_3', username: 'reviewer', avatar: null } },
  { id: 'post_2', content: 'Bán bàn phím cơ cũ', author: { id: 'usr_4', username: 'seller4', name: 'Kho Phím', avatar: null } },
];

const empty = { products: [], posts: [], sellers: [] };

describe('foldText', () => {
  it('strips Vietnamese diacritics so "dien thoai" matches "Điện Thoại"', () => {
    expect(foldText('Điện Thoại')).toBe('dien thoai');
  });

  it('lowercases and trims', () => {
    expect(foldText('  iPhone  ')).toBe('iphone');
  });
});

describe('buildSuggestions', () => {
  it('returns nothing for a query below the minimum length', () => {
    expect(buildSuggestions({ ...empty, query: 'i', products, posts, sellers })).toEqual([]);
  });

  it('keeps the backend product order without re-filtering it', () => {
    // `prod_2` does not contain "iphone" — the server matched it (description,
    // brand, …) and the dropdown must not second-guess that.
    const result = buildSuggestions({ ...empty, query: 'iphone', products });
    expect(result.map((s) => s.id)).toEqual(['prod_1', 'prod_2']);
    expect(result[0]).toMatchObject({ kind: 'product', to: '/product/prod_1', label: 'iPhone 15' });
  });

  it('falls back to the first gallery image when imageUrl is absent', () => {
    const [, second] = buildSuggestions({ ...empty, query: 'phim', products });
    expect(second).toMatchObject({ kind: 'product', imageUrl: 'b.jpg' });
  });

  it('links a matched seller to their profile', () => {
    const result = buildSuggestions({ ...empty, query: 'tech', sellers: [sellers[0]] });
    expect(result).toEqual([
      { kind: 'seller', id: 'usr_1', to: '/profile/usr_1', label: 'Tech Store', avatar: null, username: 'techstore' },
    ]);
  });

  it('labels a seller with no display name by username', () => {
    // `GET /user/search` matches usernames too, and `name` is nullable there.
    const [row] = buildSuggestions({ ...empty, query: 'giay', sellers: [sellers[1]] });
    expect(row).toMatchObject({ kind: 'seller', label: 'giaydep', username: 'giaydep' });
  });

  it('keeps the server seller order without re-filtering it', () => {
    // Neither row contains "cua hang" — the server matched them, so both stay.
    const result = buildSuggestions({ ...empty, query: 'cua hang', sellers });
    expect(result.map((s) => s.id)).toEqual(['usr_1', 'usr_2']);
  });

  it('keeps the server post order and labels each row with the author', () => {
    const result = buildSuggestions({ ...empty, query: 'ban phim', posts: [posts[1]] });
    expect(result).toEqual([
      {
        kind: 'post',
        id: 'post_2',
        to: '/post/post_2',
        label: 'Bán bàn phím cơ cũ',
        avatar: null,
        author: 'Kho Phím',
      },
    ]);
  });

  it('falls back to the author username when the post author has no name', () => {
    const [row] = buildSuggestions({ ...empty, query: 'iphone', posts: [posts[0]] });
    expect(row).toMatchObject({ kind: 'post', author: 'reviewer' });
  });

  it('orders the groups sản phẩm → seller → bài viết', () => {
    const result = buildSuggestions({ query: 'iphone', products, posts, sellers });
    expect(result.map((s) => s.kind)).toEqual([
      'product',
      'product',
      'seller',
      'seller',
      'post',
      'post',
    ]);
  });

  it('caps every group', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `prod_${i}`,
      name: `Tai nghe ${i}`,
      price: 10,
    }));
    const manyPosts = Array.from({ length: 12 }, (_, i) => ({
      id: `post_${i}`,
      content: 'tai nghe ngon',
      author: { id: `usr_${i}`, username: `u${i}`, avatar: null },
    }));
    const manySellers = Array.from({ length: 12 }, (_, i) => ({
      id: `usr_s${i}`,
      username: `shop${i}`,
      name: `Shop ${i}`,
      avatar: null,
    }));
    const result = buildSuggestions({
      query: 'tai nghe',
      products: many,
      posts: manyPosts,
      sellers: manySellers,
    });
    expect(result.filter((s) => s.kind === 'product')).toHaveLength(SUGGESTION_LIMITS.product);
    expect(result.filter((s) => s.kind === 'seller')).toHaveLength(SUGGESTION_LIMITS.seller);
    expect(result.filter((s) => s.kind === 'post')).toHaveLength(SUGGESTION_LIMITS.post);
  });

  it('truncates a long post into a single-line snippet', () => {
    const long = {
      id: 'post_long',
      content: `Mình vừa mua tai nghe mới\n\n${'rất hay '.repeat(30)}`,
      author: { id: 'usr_9', username: 'u9', avatar: null },
    };
    const [row] = buildSuggestions({ ...empty, query: 'tai nghe', posts: [long] });
    expect(row.label).not.toContain('\n');
    expect(row.label.length).toBeLessThanOrEqual(72);
    expect(row.label.endsWith('...')).toBe(true);
  });
});
