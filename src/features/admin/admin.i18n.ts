import { defineMessages, type MessageKey } from '@/lib/i18n/messages';

/**
 * I18N-06 — copy for the admin overview (`/admin`), its role control, the platform analytics
 * page and the brand/category review queues. Post moderation and the product-risk queue keep
 * their own books next to their helpers.
 */
export const adminMessages = defineMessages({
  vi: {
    // Overview header + stat cards.
    title: 'Quản trị sàn',
    statOrders: 'Tổng đơn hàng',
    statUsers: 'Tổng người dùng',

    // Overview charts.
    revenueTitle: 'Doanh thu 30 ngày',
    revenueSubtitle: 'Tổng {total}',
    revenueEmpty: 'Chưa có doanh thu trong 30 ngày qua.',
    revenueAria: 'Biểu đồ doanh thu toàn sàn 30 ngày gần nhất',
    revenueSeries: 'Doanh thu',
    statusTitle: 'Trạng thái đơn toàn sàn',
    statusSubtitle: '30 ngày gần nhất',
    statusEmpty: 'Chưa có đơn hàng nào.',
    statusAria: 'Biểu đồ phân bố trạng thái đơn hàng toàn sàn trong 30 ngày gần nhất',
    statusCenter: 'đơn',

    // Recent orders table.
    ordersTitle: 'Đơn hàng gần đây',
    colOrderId: 'Mã đơn',
    colBuyer: 'Người mua',
    colTotal: 'Tổng tiền',
    colStatus: 'Trạng thái',
    colCreatedAt: 'Ngày tạo',
    colInvoice: 'Hóa đơn',
    loading: 'Đang tải...',
    ordersEmpty: 'Không có đơn hàng nào.',

    // Users table.
    usersTitle: 'Tất cả người dùng',
    usersSearchPlaceholder: 'Username, email hoặc tên…',
    usersSearchLabel: 'Tìm người dùng theo username, email hoặc tên',
    usersSearchNoun: 'người dùng',
    usersEmpty: 'Không có người dùng nào.',
    colId: 'ID',
    colUsername: 'Username',
    colEmail: 'Email',
    colRole: 'Vai trò',
    roleAria: 'Vai trò của {name}',
    pageOf: 'Trang {page} / {total}',
    prev: 'Trước',
    next: 'Tiếp',

    // Role change (userRole.ts).
    roleSelfLocked: 'Không thể tự đổi vai trò của mình',
    roleGhnLocked: 'Vai trò thuộc hệ thống GHN — đổi trong GHN console',
    roleConfirmTitle: 'Đổi vai trò của {name} thành "{role}"?',
    roleConfirmBody: 'Người dùng cần đăng xuất và đăng nhập lại để vai trò mới có hiệu lực.',
    roleConfirm: 'Đổi vai trò',
    roleChanged:
      'Đã đặt vai trò của {name} thành "{role}". Vai trò mới chỉ có hiệu lực sau khi người dùng đăng xuất và đăng nhập lại.',

    // Platform analytics page.
    analyticsTitle: 'Thống kê toàn sàn',
    exportTitle: 'Xuất đơn hàng (CSV)',

    // Brand / category review queues.
    brandsTitle: 'Duyệt thương hiệu',
    brandsColName: 'Tên thương hiệu',
    brandsEmpty: 'Không có thương hiệu chờ duyệt.',
    brandApproved: 'Đã duyệt thương hiệu.',
    brandRejected: 'Đã từ chối thương hiệu.',
    categoriesTitle: 'Duyệt danh mục',
    categoriesColName: 'Tên danh mục',
    categoriesEmpty: 'Không có danh mục chờ duyệt.',
    categoryApproved: 'Đã duyệt danh mục.',
    categoryRejected: 'Đã từ chối danh mục.',
    colDescription: 'Mô tả',
    colSubmitter: 'Người gửi',
    colActions: 'Hành động',
    approve: 'Duyệt',
    reject: 'Từ chối',
    rejectNotePlaceholder: 'Lý do từ chối (tuỳ chọn)',
    confirmReject: 'Xác nhận từ chối',
    cancel: 'Huỷ',
  },
  en: {
    title: 'Platform admin',
    statOrders: 'Total orders',
    statUsers: 'Total users',

    revenueTitle: 'Revenue, last 30 days',
    revenueSubtitle: 'Total {total}',
    revenueEmpty: 'No revenue in the last 30 days.',
    revenueAria: 'Platform-wide revenue chart for the last 30 days',
    revenueSeries: 'Revenue',
    statusTitle: 'Platform order status',
    statusSubtitle: 'Last 30 days',
    statusEmpty: 'No orders yet.',
    statusAria: 'Chart of platform-wide order statuses over the last 30 days',
    statusCenter: 'orders',

    ordersTitle: 'Recent orders',
    colOrderId: 'Order',
    colBuyer: 'Buyer',
    colTotal: 'Total',
    colStatus: 'Status',
    colCreatedAt: 'Created',
    colInvoice: 'Invoice',
    loading: 'Loading...',
    ordersEmpty: 'No orders.',

    usersTitle: 'All users',
    usersSearchPlaceholder: 'Username, email or name…',
    usersSearchLabel: 'Search users by username, email or name',
    usersSearchNoun: 'users',
    usersEmpty: 'No users.',
    colId: 'ID',
    colUsername: 'Username',
    colEmail: 'Email',
    colRole: 'Role',
    roleAria: 'Role of {name}',
    pageOf: 'Page {page} / {total}',
    prev: 'Previous',
    next: 'Next',

    roleSelfLocked: 'You cannot change your own role',
    roleGhnLocked: 'This is a GHN role — change it in the GHN console',
    roleConfirmTitle: 'Change the role of {name} to "{role}"?',
    roleConfirmBody: 'The user has to log out and sign in again for the new role to take effect.',
    roleConfirm: 'Change role',
    roleChanged:
      'Set the role of {name} to "{role}". The new role only takes effect after the user logs out and signs in again.',

    analyticsTitle: 'Platform analytics',
    exportTitle: 'Export orders (CSV)',

    brandsTitle: 'Review brands',
    brandsColName: 'Brand name',
    brandsEmpty: 'No brands waiting for review.',
    brandApproved: 'Brand approved.',
    brandRejected: 'Brand rejected.',
    categoriesTitle: 'Review categories',
    categoriesColName: 'Category name',
    categoriesEmpty: 'No categories waiting for review.',
    categoryApproved: 'Category approved.',
    categoryRejected: 'Category rejected.',
    colDescription: 'Description',
    colSubmitter: 'Submitted by',
    colActions: 'Actions',
    approve: 'Approve',
    reject: 'Reject',
    rejectNotePlaceholder: 'Reason for rejecting (optional)',
    confirmReject: 'Confirm rejection',
    cancel: 'Cancel',
  },
});

export type AdminMessageKey = MessageKey<typeof adminMessages>;
