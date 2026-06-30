import { type ReactElement, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { OrderStatus } from '@/types';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    'bg-accent-amber/15 text-accent-amber',
  processing: 'bg-accent-cyan/15 text-accent-cyan',
  shipped:    'bg-purple-500/15 text-purple-400',
  delivering: 'bg-purple-500/15 text-purple-400',
  completed:  'bg-accent-green/15 text-accent-green',
  canceled:   'bg-accent-red/15 text-accent-red',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    'Chờ xác nhận',
  processing: 'Đang xử lý',
  shipped:    'Đã giao GHN',
  delivering: 'Đang giao',
  completed:  'Hoàn thành',
  canceled:   'Đã huỷ',
};

function formatVND(amount: string | number): string {
  return Number(amount).toLocaleString('vi-VN') + '₫';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const USERS_PER_PAGE = 20;

export default function AdminPage(): ReactElement {
  const [usersPage, setUsersPage] = useState(1);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: queryKeys.orders.admin,
    queryFn: () => api.orders.getAdminOrders(1, 10),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: [...queryKeys.users.all, usersPage, USERS_PER_PAGE],
    queryFn: () => api.users.getPaginated(usersPage, USERS_PER_PAGE),
  });

  const users = usersData?.data ?? [];
  const userTotal = usersData?.total ?? 0;
  const userTotalPages = usersData?.totalPages ?? 1;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <h1 className="font-display font-bold text-2xl text-ink-pri">Quản trị sàn</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-canvas-surface border border-bdr rounded-tb-card p-5 flex items-center gap-4">
          <span className="size-12 rounded-tb-card bg-accent-amber/10 text-accent-amber grid place-items-center shrink-0">
            <ShoppingBag size={22} className="shrink-0" />
          </span>
          <div>
            <div className="text-ink-muted font-body text-xs mb-0.5">Tổng đơn hàng</div>
            <div className="font-display font-bold text-2xl text-ink-pri">
              {ordersLoading ? '—' : (ordersData?.total ?? 0)}
            </div>
          </div>
        </div>

        <div className="bg-canvas-surface border border-bdr rounded-tb-card p-5 flex items-center gap-4">
          <span className="size-12 rounded-tb-card bg-accent-cyan/10 text-accent-cyan grid place-items-center shrink-0">
            <Users size={22} className="shrink-0" />
          </span>
          <div>
            <div className="text-ink-muted font-body text-xs mb-0.5">Tổng người dùng</div>
            <div className="font-display font-bold text-2xl text-ink-pri">
              {usersLoading ? '—' : userTotal}
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders table */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-base text-ink-pri">Đơn hàng gần đây</h2>
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Mã đơn', 'Người mua', 'Tổng tiền', 'Trạng thái', 'Ngày tạo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!ordersLoading && !ordersData?.data.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Không có đơn hàng nào.
                  </td>
                </tr>
              )}
              {ordersData?.data.map((order, idx) => (
                <tr
                  key={order.id}
                  className={cn(
                    'transition-colors hover:bg-canvas-elevated',
                    idx < (ordersData.data.length - 1) && 'border-b border-bdr',
                  )}
                >
                  <td className="px-4 py-3 font-mono text-ink-sec text-xs">#{order.id}</td>
                  <td className="px-4 py-3 font-body text-ink-pri text-sm">
                    {order.buyer.name ?? order.buyer.username}
                  </td>
                  <td className="px-4 py-3 font-body font-semibold text-accent-amber text-sm">
                    {formatVND(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-tb-pill font-body font-medium text-xs',
                      STATUS_STYLES[order.status],
                    )}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base text-ink-pri">
            Tất cả người dùng
            {!usersLoading && <span className="ml-2 font-normal text-ink-muted text-sm">({userTotal})</span>}
          </h2>
        </div>
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['ID', 'Username', 'Email', 'Vai trò', 'Ngày tạo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!usersLoading && !users.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Không có người dùng nào.
                  </td>
                </tr>
              )}
              {users.map((user, idx) => (
                <tr
                  key={user.id}
                  className={cn(
                    'transition-colors hover:bg-canvas-elevated',
                    idx < (users.length - 1) && 'border-b border-bdr',
                  )}
                >
                  <td className="px-4 py-3 font-mono text-ink-sec text-xs">{user.id}</td>
                  <td className="px-4 py-3 font-body text-ink-pri text-sm">{user.username}</td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-tb-pill font-body font-medium text-xs',
                      user.role.rol_name === 'admin' && 'bg-accent-red/15 text-accent-red',
                      user.role.rol_name === 'shop'  && 'bg-accent-amber/15 text-accent-amber',
                      user.role.rol_name !== 'admin' && user.role.rol_name !== 'shop' && 'bg-canvas-elevated text-ink-sec',
                    )}>
                      {user.role.rol_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">
                    {user.createdAt ? formatDate(user.createdAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!usersLoading && userTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-bdr">
              <span className="font-body text-xs text-ink-muted">
                Trang {usersPage} / {userTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  disabled={usersPage === 1}
                  className="px-3 py-1 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-accent-amber/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <button
                  onClick={() => setUsersPage(p => Math.min(userTotalPages, p + 1))}
                  disabled={usersPage === userTotalPages}
                  className="px-3 py-1 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-accent-amber/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
