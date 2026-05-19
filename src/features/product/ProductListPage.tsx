import { useState, type ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, LogOut, Plus, Search,
  Heart, MessageCircle, Share2, Home, Bookmark,
} from 'lucide-react';
import { useProduct } from './useProduct';
import type { EnrichedProduct } from './useProduct';
import { useAuthContext } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import CreateProductModal from './CreateProductModal';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveBadge } from '@/components/shared/LiveBadge';
import { OnlinePill } from '@/components/shared/OnlinePill';
import { PriceText } from '@/components/shared/PriceText';
import { GradientButton } from '@/components/shared/GradientButton';
import { Avatar } from '@/components/shared/Avatar';

type TabKey = 'all' | 'featured' | 'trending';

const TAB_OPTS: { id: TabKey; label: string }[] = [
  { id: 'all', label: 'Mới nhất' },
  { id: 'featured', label: 'Nổi bật' },
  { id: 'trending', label: 'Trending' },
];

function PostSkeleton(): ReactElement {
  return (
    <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden w-full">
      <div className="flex items-center gap-3 p-3.5 border-b border-bdr">
        <Skeleton className="w-10 h-10 rounded-full bg-canvas-elevated" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-32 bg-canvas-elevated" />
          <Skeleton className="h-3 w-20 bg-canvas-elevated" />
        </div>
      </div>
      <Skeleton className="aspect-[4/3] w-full bg-canvas-elevated" />
      <div className="p-3.5 flex flex-col gap-3">
        <Skeleton className="h-5 w-48 bg-canvas-elevated rounded" />
        <Skeleton className="h-6 w-32 bg-canvas-elevated rounded" />
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-9 bg-canvas-elevated rounded-lg" />
          <Skeleton className="flex-1 h-9 bg-canvas-elevated rounded-lg" />
          <Skeleton className="flex-1 h-9 bg-canvas-elevated rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface PostCardProps {
  product: EnrichedProduct;
  onNavigate: (id: number) => void;
}

function PostCard({ product, onNavigate }: PostCardProps): ReactElement {
  return (
    <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/50">
      {/* Header */}
      <div className="flex items-center p-3.5 border-b border-bdr">
        <div className="mr-2.5 flex-shrink-0">
          <Avatar src={product.sellerAvatar} alt={product.seller} size={40} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="m-0 mb-0.5 text-sm font-semibold text-ink-pri">{product.seller}</h4>
          <span className="text-xs text-ink-sec">{product.time}</span>
        </div>
        <div className="text-2xl text-ink-sec cursor-pointer p-2 rounded-full hover:bg-canvas-elevated transition-colors leading-none">⋯</div>
      </div>

      {/* Content */}
      {product.description && (
        <div className="px-4 py-3">
          <p className="m-0 leading-relaxed text-ink-sec text-[0.9rem] line-clamp-2">{product.description}</p>
          {product.sellerNotes && (
            <div className="mt-2 pl-3 border-l-2 border-accent-amber bg-canvas-elevated rounded-r-lg py-2 pr-2.5">
              <small className="text-ink-sec italic leading-relaxed text-xs">📝 {product.sellerNotes}</small>
            </div>
          )}
        </div>
      )}

      {/* Media */}
      <div className="relative cursor-pointer overflow-hidden group aspect-[4/3]" onClick={() => onNavigate(product.id)}>
        {product.isFeatured && (
          <span className="absolute top-3 left-3 z-[1] inline-flex items-center px-[11px] py-[5px] bg-tb-gradient text-white font-display font-black text-[11px] tracking-[0.08em] uppercase rounded-tb-pill">
            🔥 Hot deal
          </span>
        )}
        <img
          src={product.imageUrl ?? 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600';
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white px-4 pt-10 pb-4">
          <h3 className="m-0 mb-1 text-lg font-display font-bold uppercase leading-tight tracking-wide">{product.name}</h3>
          <div className="mb-2">
            <PriceText price={product.price} className="text-2xl" />
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2 text-xs">
            {product.rating > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-xl backdrop-blur-sm">⭐ {product.rating} ({product.ratingCount})</span>
            )}
            <span className="bg-accent-green/20 text-green-300 px-2 py-0.5 rounded-xl backdrop-blur-sm">
              {product.condition === 'new' ? '🆕 Mới' : product.condition}
            </span>
            {product.isTrending && (
              <span className="bg-accent-amber/20 text-yellow-300 px-2 py-0.5 rounded-xl backdrop-blur-sm">📈 Trending</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <OnlinePill count={product.online} />
            <LiveBadge />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pt-2.5 pb-3">
        <div className="flex justify-between items-center pb-3 mb-3 border-b border-bdr text-sm text-ink-sec">
          <span className="flex items-center gap-1"><Heart size={14} /> {product.likes}</span>
          <span className="flex items-center gap-1"><MessageCircle size={14} /> {product.comments} bình luận</span>
          <span className="flex items-center gap-1"><Share2 size={14} /> {product.shares} chia sẻ</span>
        </div>
        <div className="flex mb-[10px]">
          <button className="flex-1 bg-transparent border-0 py-3 text-sm font-semibold text-ink-sec hover:bg-canvas-elevated hover:text-accent-amber rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
            <Heart size={16} /> Thích
          </button>
          <button
            onClick={() => onNavigate(product.id)}
            className="flex-1 bg-transparent border-0 py-3 text-sm font-semibold text-ink-sec hover:bg-canvas-elevated hover:text-accent-sec rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
            <MessageCircle size={16} /> Bình luận
          </button>
          <button className="flex-1 bg-transparent border-0 py-3 text-sm font-semibold text-ink-sec hover:bg-canvas-elevated hover:text-accent-green rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
            <Share2 size={16} /> Chia sẻ
          </button>
        </div>
        <GradientButton size="sm" onClick={() => onNavigate(product.id)} className="w-full">
          Mua ngay →
        </GradientButton>
      </div>
    </div>
  );
}

function SellersStrip({ products }: { products: EnrichedProduct[] }): ReactElement {
  const seen = new Set<string>();
  const sellers: { name: string; avatar: string }[] = [];
  for (const p of products) {
    if (!seen.has(p.seller)) {
      seen.add(p.seller);
      sellers.push({ name: p.seller, avatar: p.sellerAvatar });
    }
  }

  return (
    <div className={cn('border-b border-bdr pt-4 pb-5', sellers.length === 0 && 'hidden')}>
      <div className="max-w-[600px] mx-auto px-5 flex items-center gap-[22px] overflow-x-auto">
        <div className="flex-none">
          <div className="font-display font-black text-base text-white whitespace-nowrap leading-[1.1]">
            Sellers<br />đang LIVE
          </div>
        </div>
        {sellers.map(s => (
          <button
            key={s.name}
            className="flex-none flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer w-16"
          >
            <Avatar src={s.avatar} alt={s.name} size={40} />
            <span className="font-body font-medium text-[11px] text-tb-secondary max-w-[64px] truncate">
              {s.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterTabsRow({ value, onChange }: { value: TabKey; onChange: (v: TabKey) => void }): ReactElement {
  return (
    <div className="max-w-[600px] mx-auto px-5 py-[14px]">
      <div className="flex gap-[10px] overflow-x-auto pb-[2px]">
        {TAB_OPTS.map(opt => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                'flex-none px-[18px] py-[10px] rounded-full text-white font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border',
                active ? 'bg-tb-gradient border-transparent' : 'bg-tb-elevated border-tb-border',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface LeftRailNavProps {
  products: EnrichedProduct[];
}

function LeftRailNav({ products }: LeftRailNavProps): ReactElement {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const { totalCount, openCart } = useCart();

  const navItems = [
    { icon: Home,         label: 'Bảng tin',  onClick: () => void navigate('/') },
    { icon: Package,      label: 'Đơn hàng',  onClick: () => void navigate('/orders') },
    { icon: ShoppingCart, label: 'Giỏ hàng',  onClick: openCart, bullet: totalCount },
    { icon: Bookmark,     label: 'Đã lưu',    onClick: () => {} },
  ] as const;

  const seen = new Set<string>();
  const sellers: { name: string; avatar: string }[] = [];
  for (const p of products) {
    if (!seen.has(p.seller) && sellers.length < 4) {
      seen.add(p.seller);
      sellers.push({ name: p.seller, avatar: p.sellerAvatar });
    }
  }

  return (
    <aside className="sticky top-[88px] self-start flex flex-col gap-1 pb-20">
      {currentUser && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-canvas-elevated transition-colors cursor-pointer">
          <Avatar src={undefined} alt={currentUser.username} size={36} />
          <span className="font-body font-semibold text-sm text-ink-pri truncate">{currentUser.username}</span>
        </div>
      )}

      {navItems.map(item => (
        <button
          key={item.label}
          onClick={item.onClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors w-full text-left"
        >
          <span className="w-8 h-8 rounded-full bg-canvas-elevated flex-none inline-flex items-center justify-center text-accent-amber">
            <item.icon size={16} />
          </span>
          <span className="flex-1 font-body font-medium text-sm text-ink-pri">{item.label}</span>
          {'bullet' in item && item.bullet > 0 && (
            <span className="min-w-[22px] h-[22px] px-[7px] bg-tb-gradient text-white font-body font-bold text-[11px] rounded-full inline-flex items-center justify-center">
              {item.bullet}
            </span>
          )}
        </button>
      ))}

      <div className="h-px bg-bdr mx-3 my-2.5" />

      <div className="px-3 py-1 font-body font-bold text-[11px] text-ink-muted uppercase tracking-[0.06em]">
        Sellers bạn theo dõi
      </div>

      {sellers.map(s => (
        <button
          key={s.name}
          className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors w-full text-left"
        >
          <Avatar src={s.avatar} alt={s.name} size={32} />
          <span className="flex-1 min-w-0 font-body font-medium text-[13px] text-ink-pri truncate">{s.name}</span>
        </button>
      ))}
    </aside>
  );
}

export default function ProductListPage(): ReactElement {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthContext();
  const { totalCount, openCart } = useCart();
  const { products, loading, error, refetch } = useProduct();
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const filteredProducts = (() => {
    if (activeTab === 'featured') return products.filter(p => p.isFeatured);
    if (activeTab === 'trending') return products.filter(p => p.isTrending);
    return products;
  })();

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-canvas-base">
        <div className="max-w-[600px] mx-auto px-4 py-5 flex flex-col gap-5">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center">
        <div className="text-center p-10">
          <p className="text-accent-red font-medium mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg border border-bdr text-ink-pri hover:bg-canvas-elevated transition-colors text-sm">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-canvas-surface/80 border-b border-bdr backdrop-blur-md">
        <div className="max-w-[1080px] mx-auto px-6 pt-3.5 pb-2.5">
          {/* Row 1: Logo + Buttons */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div>
              <h1 className="font-display text-2xl font-black text-ink-pri m-0 mb-0 tracking-tight uppercase">
                <span className="bg-tb-gradient bg-clip-text text-transparent">TryBuy</span>
              </h1>
              <p className="text-xs text-ink-sec m-0">Khám phá sản phẩm hot nhất</p>
            </div>
            <div className="flex items-center gap-2">
              {currentUser && (
                <span className="text-xs text-ink-sec hidden sm:inline">👤 {currentUser.username}</span>
              )}
              <GradientButton
                onClick={() => setShowCreateProduct(true)}
                className="rounded-full px-3.5 py-1.5 text-xs">
                <Plus size={13} /> Tạo
              </GradientButton>
              <button
                onClick={() => void navigate('/orders')}
                className="bg-canvas-elevated border border-bdr text-ink-pri rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer hover:border-accent-amber transition-colors whitespace-nowrap inline-flex items-center gap-1.5">
                <Package size={13} /> Đơn hàng
              </button>
              {/* Cart with gradient badge */}
              <button
                onClick={openCart}
                aria-label="Giỏ hàng"
                className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-[10px] w-[36px] h-[36px] flex items-center justify-center cursor-pointer hover:border-accent-amber transition-colors">
                <ShoppingCart size={16} />
                {totalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-[5px] bg-tb-gradient text-white font-body font-bold text-[10px] rounded-[10px] border-2 border-tb-base flex items-center justify-center leading-none">
                    {totalCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => void logout()}
                className="bg-canvas-elevated border border-bdr text-ink-sec rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer hover:border-bdr/60 transition-colors whitespace-nowrap inline-flex items-center gap-1.5">
                <LogOut size={13} /> Đăng xuất
              </button>
            </div>
          </div>
          {/* Row 2: Search (UI only) */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#52525B] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, seller, livestream…"
              readOnly
              className="w-full bg-[#1C1C1E] border border-[#27272A] rounded-[10px] py-[10px] pl-[40px] pr-[14px] text-white font-body text-[13px] placeholder:text-[#52525B] outline-none cursor-default"
            />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-[1080px] mx-auto px-6 pb-20 pt-6 grid grid-cols-[260px_1fr] gap-6 items-start">

        {/* Col 1 — Sidebar */}
        <LeftRailNav products={products} />

        {/* Col 2 — Feed */}
        <main className="min-w-0">
          <SellersStrip products={products} />
          <FilterTabsRow value={activeTab} onChange={setActiveTab} />
          <div className="flex flex-col gap-5 mt-4">
            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-12 text-ink-sec text-sm">
                Không có sản phẩm nào.
              </div>
            )}
            {filteredProducts.map((product) => (
              <PostCard
                key={product.id}
                product={product}
                onNavigate={(id) => void navigate(`/product/${id}`)}
              />
            ))}
          </div>
        </main>

      </div>

      {showCreateProduct && (
        <CreateProductModal
          onProductCreated={() => { refetch(); setShowCreateProduct(false); }}
          onCancel={() => setShowCreateProduct(false)}
        />
      )}
    </div>
  );
}
