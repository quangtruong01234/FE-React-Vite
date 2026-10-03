import { defineMessages, plural, type MessageKey } from '@/lib/i18n/messages';

/** I18N-06 — copy for the voucher console (`/admin/vouchers` + `/sell/vouchers`). */
export const voucherMessages = defineMessages({
  vi: {
    // Binding copy — the wording that differs between the two consoles.
    adminTitle: 'Mã giảm giá',
    adminIntro:
      'Tạo, sửa và theo dõi mã giảm giá toàn sàn. Người mua chọn hoặc nhập mã ở bước thanh toán — mã chỉ áp dụng cho đơn từ một người bán.',
    adminCreateHint:
      'Mã chỉ áp dụng cho đơn từ một người bán. Sau khi tạo vẫn sửa được điều kiện, nhưng mã và mức giảm thì không.',
    adminEmpty: 'Chưa có mã giảm giá nào.',
    forbiddenDefault: 'Bạn không có quyền quản lý mã giảm giá.',
    sellerTitle: 'Mã giảm giá của shop',
    sellerIntro:
      'Tạo, sửa và theo dõi mã giảm giá của riêng shop bạn. Người mua thấy mã trong danh sách gợi ý ở bước thanh toán khi giỏ có sản phẩm của bạn.',
    sellerCreateHint:
      'Mã thuộc về shop của bạn và chỉ áp dụng cho đơn từ shop bạn. Sau khi tạo vẫn sửa được điều kiện, nhưng mã và mức giảm thì không.',
    sellerEmpty: 'Shop bạn chưa có mã giảm giá nào.',
    sellerForbidden: 'Bạn không quản lý được mã này. Shop chỉ sửa được mã của chính mình.',

    // Status pills.
    statusInactive: 'Đã tắt',
    statusExpired: 'Hết hạn',
    statusUsedUp: 'Hết lượt',
    statusScheduled: 'Chưa bắt đầu',
    statusActive: 'Đang chạy',

    // Row cells.
    discountWithCap: '{value}% (tối đa {cap})',
    windowUnlimited: 'Không giới hạn',
    windowFrom: 'Từ {from}',
    windowTo: 'Đến {to}',

    // Errors.
    errorDuplicate: 'Mã này đã tồn tại. Hãy chọn một mã khác.',
    errorNotFound: 'Không tìm thấy mã giảm giá này.',
    errorList: 'Không tải được danh sách mã giảm giá. Vui lòng thử lại.',
    errorCreate: 'Không tạo được mã giảm giá. Vui lòng thử lại.',
    errorDeactivate: 'Không tắt được mã giảm giá. Vui lòng thử lại.',
    errorUpdate: 'Không lưu được thay đổi. Vui lòng thử lại.',

    // Active toggle.
    toggleCreateLabel: 'Kích hoạt mã ngay sau khi tạo',
    toggleCreateState: 'Kích hoạt ngay',
    toggleEditLabel: 'Trạng thái mã',
    toggleOn: 'Đang bật',
    toggleOff: 'Đã tắt',

    // Fields a patch can tighten.
    fieldMinOrder: 'Đơn tối thiểu',
    fieldMaxDiscount: 'Giảm tối đa',
    fieldUsageLimit: 'Tổng lượt dùng',
    fieldPerUserLimit: 'Lượt mỗi người',
    fieldStartsAt: 'Thời gian bắt đầu',
    fieldExpiresAt: 'Thời gian kết thúc',

    // Edit guards.
    blockedUsageBelowUsed: 'Tổng lượt dùng không thể nhỏ hơn số lượt đã dùng ({used}).',
    blockedFixedMinimum:
      'Mã giảm tiền cố định phải có đơn tối thiểu lớn hơn số tiền giảm ({value}).',
    blockedTightening:
      'Mã đã được dùng {used} lần nên chỉ có thể nới lỏng điều kiện. Không thể siết: {fields}.',
    looseningConfirm:
      'Mã "{code}" đã được dùng {used} lần. Nới lỏng điều kiện là thay đổi một chiều — sau này không siết lại được. Tiếp tục?',
    noChanges: 'Chưa có thay đổi nào để lưu.',

    // Zod messages (stored as keys, rendered with `translateIfKey`).
    zodAmount: 'Nhập số tiền hợp lệ (VND)',
    zodCount: 'Nhập số nguyên từ 1 trở lên',
    zodRequired: 'Bắt buộc',
    zodMax64: 'Tối đa 64 ký tự',
    zodCodePattern: 'Chỉ dùng chữ, số, gạch ngang và gạch dưới',
    zodMax255: 'Tối đa 255 ký tự',
    zodDiscountType: 'Chọn loại giảm giá',
    zodPositive: 'Nhập số lớn hơn 0',
    zodPercentRange: 'Giảm theo phần trăm phải trong khoảng 1–100',
    zodExpiresAfterStart: 'Ngày kết thúc phải sau ngày bắt đầu',
    zodFixedMinimum: 'Mã giảm tiền cố định cần đơn tối thiểu lớn hơn số tiền giảm',

    // Form.
    formEditTitle: 'Sửa mã {code}',
    formCreateTitle: 'Tạo mã giảm giá',
    formEditHint:
      'Mã, loại giảm và mức giảm không đổi được. Mã đã có lượt dùng chỉ nới lỏng được điều kiện, và nới rồi thì không siết lại được.',
    closeEditForm: 'Đóng biểu mẫu sửa mã',
    closeCreateForm: 'Đóng biểu mẫu tạo mã',
    labelCode: 'Mã',
    hintImmutable: 'Không sửa được sau khi tạo.',
    hintUppercase: 'Tự động viết hoa khi gửi lên.',
    labelDescription: 'Mô tả',
    descriptionPlaceholder: 'Giảm 10% cho đơn đầu tiên',
    labelDiscountType: 'Loại giảm giá',
    typePercent: 'Theo phần trăm',
    typeFixed: 'Số tiền cố định',
    labelPercentValue: 'Phần trăm giảm (%)',
    labelFixedValue: 'Số tiền giảm (VND)',
    labelMinOrder: 'Đơn tối thiểu (VND)',
    hintMinOrderFixed: 'Bắt buộc, phải lớn hơn số tiền giảm.',
    hintMinOrderPercent: 'Bỏ trống = không yêu cầu.',
    labelMaxDiscount: 'Giảm tối đa (VND)',
    hintUnlimited: 'Bỏ trống = không giới hạn.',
    labelUsageLimit: 'Tổng lượt dùng',
    labelPerUserLimit: 'Lượt dùng mỗi người',
    labelStartsAt: 'Bắt đầu',
    hintStartsAt: 'Giờ địa phương. Bỏ trống = hiệu lực ngay.',
    labelExpiresAt: 'Kết thúc',
    hintExpiresAt: 'Bỏ trống = không hết hạn.',
    cancel: 'Hủy',
    saving: 'Đang lưu…',
    creating: 'Đang tạo…',
    saveChanges: 'Lưu thay đổi',
    createCode: 'Tạo mã',
    looseningTitle: 'Nới lỏng điều kiện?',
    continue: 'Tiếp tục',

    // List.
    edit: 'Sửa',
    deactivating: 'Đang tắt…',
    deactivate: 'Tắt mã',
    reactivating: 'Đang bật…',
    reactivate: 'Bật lại',
    colCode: 'Mã',
    colDiscount: 'Giảm',
    colMinOrder: 'Đơn tối thiểu',
    colUsage: 'Lượt dùng',
    colWindow: 'Hiệu lực',
    colStatus: 'Trạng thái',
    toastDeactivated: 'Đã tắt mã {code}.',
    toastReactivated: 'Đã bật lại mã {code}.',
    toastCreated: 'Đã tạo mã {code}.',
    toastSaved: 'Đã lưu mã {code}.',
    newCode: 'Tạo mã mới',
    searchPlaceholder: 'Tìm theo mã giảm giá…',
    searchNoun: 'mã giảm giá',
    deactivateTitle: 'Tắt mã {code}?',
    deactivateBody: 'Người mua sẽ không dùng được cho tới khi bật lại.',
  },
  en: {
    adminTitle: 'Vouchers',
    adminIntro:
      'Create, edit and track platform-wide vouchers. Buyers pick or enter a code at checkout — a code only applies to an order from a single seller.',
    adminCreateHint:
      'A code only applies to an order from a single seller. Its conditions stay editable after creation, but the code and discount do not.',
    adminEmpty: 'No vouchers yet.',
    forbiddenDefault: 'You do not have permission to manage vouchers.',
    sellerTitle: 'Shop vouchers',
    sellerIntro:
      "Create, edit and track your shop's own vouchers. Buyers see them among the suggestions at checkout when their cart holds your products.",
    sellerCreateHint:
      'The code belongs to your shop and only applies to orders from your shop. Its conditions stay editable after creation, but the code and discount do not.',
    sellerEmpty: 'Your shop has no vouchers yet.',
    sellerForbidden: 'You cannot manage this code. A shop can only edit its own vouchers.',

    statusInactive: 'Off',
    statusExpired: 'Expired',
    statusUsedUp: 'Used up',
    statusScheduled: 'Scheduled',
    statusActive: 'Running',

    discountWithCap: '{value}% (up to {cap})',
    windowUnlimited: 'No limit',
    windowFrom: 'From {from}',
    windowTo: 'Until {to}',

    errorDuplicate: 'This code already exists. Please choose another one.',
    errorNotFound: 'This voucher could not be found.',
    errorList: 'Could not load vouchers. Please try again.',
    errorCreate: 'Could not create the voucher. Please try again.',
    errorDeactivate: 'Could not turn the voucher off. Please try again.',
    errorUpdate: 'Could not save your changes. Please try again.',

    toggleCreateLabel: 'Activate the code as soon as it is created',
    toggleCreateState: 'Activate now',
    toggleEditLabel: 'Code status',
    toggleOn: 'On',
    toggleOff: 'Off',

    fieldMinOrder: 'Minimum order',
    fieldMaxDiscount: 'Maximum discount',
    fieldUsageLimit: 'Total uses',
    fieldPerUserLimit: 'Uses per customer',
    fieldStartsAt: 'Start time',
    fieldExpiresAt: 'End time',

    blockedUsageBelowUsed: 'Total uses cannot be lower than the uses already made ({used}).',
    blockedFixedMinimum:
      'A fixed-amount code needs a minimum order above its discount ({value}).',
    blockedTightening: ({ used, fields }) =>
      `This code has been used ${used} ${plural(Number(used), 'time', 'times')}, so its conditions can only be loosened. Cannot tighten: ${fields}.`,
    looseningConfirm: ({ code, used }) =>
      `Code "${code}" has been used ${used} ${plural(Number(used), 'time', 'times')}. Loosening its conditions is one-way — you cannot tighten them again later. Continue?`,
    noChanges: 'There are no changes to save.',

    zodAmount: 'Enter a valid amount (VND)',
    zodCount: 'Enter a whole number of 1 or more',
    zodRequired: 'Required',
    zodMax64: 'At most 64 characters',
    zodCodePattern: 'Use only letters, digits, hyphens and underscores',
    zodMax255: 'At most 255 characters',
    zodDiscountType: 'Choose a discount type',
    zodPositive: 'Enter a number greater than 0',
    zodPercentRange: 'A percentage discount must be between 1 and 100',
    zodExpiresAfterStart: 'The end date must be after the start date',
    zodFixedMinimum: 'A fixed-amount code needs a minimum order above its discount',

    formEditTitle: 'Edit code {code}',
    formCreateTitle: 'Create a voucher',
    formEditHint:
      'The code, discount type and discount value cannot change. A code that has been used can only be loosened, and a loosened condition cannot be tightened again.',
    closeEditForm: 'Close the edit form',
    closeCreateForm: 'Close the create form',
    labelCode: 'Code',
    hintImmutable: 'Cannot be changed after creation.',
    hintUppercase: 'Upper-cased automatically on submit.',
    labelDescription: 'Description',
    descriptionPlaceholder: '10% off your first order',
    labelDiscountType: 'Discount type',
    typePercent: 'Percentage',
    typeFixed: 'Fixed amount',
    labelPercentValue: 'Discount percentage (%)',
    labelFixedValue: 'Discount amount (VND)',
    labelMinOrder: 'Minimum order (VND)',
    hintMinOrderFixed: 'Required, must be above the discount amount.',
    hintMinOrderPercent: 'Leave blank = no minimum.',
    labelMaxDiscount: 'Maximum discount (VND)',
    hintUnlimited: 'Leave blank = unlimited.',
    labelUsageLimit: 'Total uses',
    labelPerUserLimit: 'Uses per customer',
    labelStartsAt: 'Starts',
    hintStartsAt: 'Local time. Leave blank = effective immediately.',
    labelExpiresAt: 'Ends',
    hintExpiresAt: 'Leave blank = never expires.',
    cancel: 'Cancel',
    saving: 'Saving…',
    creating: 'Creating…',
    saveChanges: 'Save changes',
    createCode: 'Create code',
    looseningTitle: 'Loosen the conditions?',
    continue: 'Continue',

    edit: 'Edit',
    deactivating: 'Turning off…',
    deactivate: 'Turn off',
    reactivating: 'Turning on…',
    reactivate: 'Turn back on',
    colCode: 'Code',
    colDiscount: 'Discount',
    colMinOrder: 'Minimum order',
    colUsage: 'Uses',
    colWindow: 'Valid',
    colStatus: 'Status',
    toastDeactivated: 'Turned off code {code}.',
    toastReactivated: 'Turned code {code} back on.',
    toastCreated: 'Created code {code}.',
    toastSaved: 'Saved code {code}.',
    newCode: 'New code',
    searchPlaceholder: 'Search by voucher code…',
    searchNoun: 'vouchers',
    deactivateTitle: 'Turn off code {code}?',
    deactivateBody: 'Buyers cannot use it until it is turned back on.',
  },
});

export type VoucherMessageKey = MessageKey<typeof voucherMessages>;

/** A zod message is a book key, so the form error follows a language switch. */
export const voucherMsg = (key: VoucherMessageKey): string => key;
