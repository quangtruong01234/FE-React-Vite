import { defineMessages, plural } from '@/lib/i18n/messages';

/** I18N-07 — upload guard notices (`uploadValidation`, `uploadOwner`, `cloudinary`). */
export const uploadMessages = defineMessages({
  vi: {
    kindImage: 'Ảnh',
    kindVideo: 'Video',
    oversize: '{kind} vượt quá {mb}MB',
    maxImages: 'Tối đa {max} ảnh',
    partialImages: 'Chỉ thêm được {accepted}/{total} ảnh — tối đa {max} ảnh',
    svgUnsupported: 'Không hỗ trợ ảnh SVG',
    wrongFormat: '{kind} không đúng định dạng',
    loginRequired: 'Bạn cần đăng nhập để tải tệp lên.',
    uploadFailed: 'Upload thất bại',
    noUrl: 'Không nhận được URL sau khi upload',
    mediaNotOwned: 'Có ảnh không phải do bạn tải lên. Hãy xoá ảnh đó và tải lại.',
  },
  en: {
    kindImage: 'Image',
    kindVideo: 'Video',
    oversize: '{kind} is larger than {mb}MB',
    maxImages: ({ max }) => `Up to ${max} ${plural(Number(max), 'image', 'images')}`,
    partialImages: ({ accepted, total, max }) =>
      `Only ${accepted}/${total} images could be added — up to ${max} ${plural(Number(max), 'image', 'images')}`,
    svgUnsupported: 'SVG images are not supported',
    wrongFormat: '{kind} is not in a supported format',
    loginRequired: 'You need to sign in to upload files.',
    uploadFailed: 'Upload failed',
    noUrl: 'No URL came back from the upload',
    mediaNotOwned: "One of the images wasn't uploaded by you. Remove it and upload it again.",
  },
});
