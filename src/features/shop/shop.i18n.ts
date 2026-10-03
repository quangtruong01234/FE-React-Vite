import { defineMessages, type MessageKey } from '@/lib/i18n/messages';

/** I18N-06 — copy for the seller dashboard (`/shop`). */
export const shopMessages = defineMessages({
  vi: {
    // Header + toasts.
    title: 'Kênh người bán',
    subtitle: 'Quản lý sản phẩm của bạn',
    newProduct: 'Đăng sản phẩm',
    blockedToast: 'Sản phẩm bị khoá — không thể bật hiển thị. Liên hệ admin.',
    toastShown: 'Đã bật hiển thị "{name}".',
    toastHidden: 'Đã ẩn "{name}".',
    toastShownUnnamed: 'Đã bật hiển thị sản phẩm.',
    toastHiddenUnnamed: 'Đã ẩn sản phẩm.',

    // Stat cards.
    statProducts: 'Tổng sản phẩm',
    statStock: 'Tổng tồn kho',
    statLowStock: 'Sắp hết hàng',

    // Stock charts.
    healthTitle: 'Tình trạng tồn kho',
    healthSubtitle: '{products} sản phẩm · {stock} đơn vị tồn',
    healthAria: 'Biểu đồ tỉ lệ sản phẩm đủ hàng và sắp hết hàng',
    healthCenter: 'sản phẩm',
    healthValue: '{value} sản phẩm',
    sliceHealthy: 'Đủ hàng',
    sliceLow: 'Sắp hết',
    sliceOut: 'Hết hàng',
    sliceNone: 'Chưa có sản phẩm',
    lowTitle: 'Sản phẩm sắp hết hàng',
    lowSubtitle: 'Tồn hiện tại so với mức tối thiểu',
    lowEmpty: 'Không có sản phẩm nào sắp hết hàng.',
    lowValueLabel: 'Tồn hiện tại',
    lowAria: 'Biểu đồ tồn kho các sản phẩm sắp hết hàng',
    lowMinimum: 'Mức tối thiểu',

    // Low-stock list.
    lowRemaining: 'Còn {n}',
    lowMinimumValue: 'Tối thiểu {n}',

    // Product table.
    tableTitle: 'Danh sách sản phẩm',
    searchPlaceholder: 'Tìm tên hoặc SKU...',
    colProduct: 'Sản phẩm',
    colCategory: 'Danh mục',
    colPrice: 'Giá',
    colStock: 'Tồn kho',
    colCondition: 'Tình trạng',
    colApproval: 'Duyệt',
    colVisible: 'Hiển thị',
    colActions: 'Thao tác',
    emptyCatalogue: 'Chưa có sản phẩm nào',
    firstProduct: 'Đăng sản phẩm đầu tiên',
    noMatch: 'Không tìm thấy sản phẩm nào.',

    // Row.
    conditionNew: 'Mới',
    conditionUsed: 'Đã dùng',
    conditionRefurbished: 'Tân trang',
    blockedHint: 'Bị ẩn do vi phạm — liên hệ admin',
    blocked: 'Bị khoá',
    approved: 'Bình thường',
    blockedToggleHint: 'Sản phẩm bị khoá — không thể bật hiển thị',
    toggleVisible: 'Hiển thị {name}',
    editProduct: 'Sửa {name}',
    deleteProduct: 'Xóa {name}',

    // Delete confirm.
    deleteTitle: 'Xóa sản phẩm',
    deleteBody: 'Xóa "{name}" khỏi gian hàng? Hành động này không thể hoàn tác.',
    deleteConfirm: 'Xóa sản phẩm',
    deleteFailed: 'Xóa sản phẩm thất bại. Vui lòng thử lại.',
  },
  en: {
    title: 'Seller hub',
    subtitle: 'Manage your products',
    newProduct: 'List a product',
    blockedToast: 'This product is locked and cannot be shown. Contact an admin.',
    toastShown: '"{name}" is now visible.',
    toastHidden: '"{name}" is now hidden.',
    toastShownUnnamed: 'The product is now visible.',
    toastHiddenUnnamed: 'The product is now hidden.',

    statProducts: 'Total products',
    statStock: 'Total stock',
    statLowStock: 'Low on stock',

    healthTitle: 'Stock health',
    healthSubtitle: '{products} products · {stock} units in stock',
    healthAria: 'Chart of well-stocked versus low-stock products',
    healthCenter: 'products',
    healthValue: '{value} products',
    sliceHealthy: 'In stock',
    sliceLow: 'Running low',
    sliceOut: 'Out of stock',
    sliceNone: 'No products yet',
    lowTitle: 'Products running low',
    lowSubtitle: 'Current stock against the minimum',
    lowEmpty: 'No products are running low.',
    lowValueLabel: 'Current stock',
    lowAria: 'Chart of stock for products running low',
    lowMinimum: 'Minimum',

    lowRemaining: '{n} left',
    lowMinimumValue: 'Minimum {n}',

    tableTitle: 'Products',
    searchPlaceholder: 'Search by name or SKU...',
    colProduct: 'Product',
    colCategory: 'Category',
    colPrice: 'Price',
    colStock: 'Stock',
    colCondition: 'Condition',
    colApproval: 'Review',
    colVisible: 'Visible',
    colActions: 'Actions',
    emptyCatalogue: 'No products yet',
    firstProduct: 'List your first product',
    noMatch: 'No products found.',

    conditionNew: 'New',
    conditionUsed: 'Used',
    conditionRefurbished: 'Refurbished',
    blockedHint: 'Hidden for a violation — contact an admin',
    blocked: 'Locked',
    approved: 'OK',
    blockedToggleHint: 'This product is locked and cannot be shown',
    toggleVisible: 'Show {name}',
    editProduct: 'Edit {name}',
    deleteProduct: 'Delete {name}',

    deleteTitle: 'Delete product',
    deleteBody: 'Delete "{name}" from your shop? This cannot be undone.',
    deleteConfirm: 'Delete product',
    deleteFailed: 'Could not delete the product. Please try again.',
  },
});

export type ShopMessageKey = MessageKey<typeof shopMessages>;
