import type { DuplicateCheckResult } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { productFormMessages } from './productForm.i18n';

/**
 * Seller pre-publish duplicate advisory (AI-02F3).
 *
 * The backend checks an owned, already-uploaded Cloudinary image against other
 * sellers' listings. The warning is strictly advisory — it never blocks submit;
 * the widget offers an explicit "continue anyway" dismiss.
 */

export interface DuplicateWarningView {
  message: string;
  matchedProductId: string;
  matchedName: string;
}

/**
 * View model for the warning box. Returns `null` (render nothing) when there is
 * no likely match, the seller dismissed the warning, or the checked image has
 * since been removed from the form (a stale warning about a gone image would
 * only confuse).
 */
export function duplicateWarningView(
  result: DuplicateCheckResult | undefined,
  checkedUrl: string | null,
  currentUrls: string[],
  dismissed: boolean,
  lang: Lang = 'vi',
): DuplicateWarningView | null {
  if (dismissed || !result?.duplicateLikely || !result.match) return null;
  if (!checkedUrl || !currentUrls.includes(checkedUrl)) return null;
  return {
    message: bindTranslator(productFormMessages, lang)('duplicateWarning', { name: result.match.name }),
    matchedProductId: result.match.productId,
    matchedName: result.match.name,
  };
}
