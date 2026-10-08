import type { Lang } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/messages';
import { addToCartMessages } from './addToCart.i18n';

/**
 * CART-STOCK-01: `POST /api/cart` refuses a line checkout would refuse with a
 * 409 + `errorCode`. Before, the add answered 201 and the buyer only found out
 * at checkout.
 */
export type CartAddRefusal = 'inactive' | 'outOfStock' | 'exceedsStock';

const REFUSAL_BY_CODE: Record<string, CartAddRefusal> = {
  PRODUCT_INACTIVE: 'inactive',
  OUT_OF_STOCK: 'outOfStock',
  QUANTITY_EXCEEDS_STOCK: 'exceedsStock',
};

export function cartAddRefusal(error: unknown): CartAddRefusal | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { errorCode?: unknown }).errorCode;
  return typeof code === 'string' ? REFUSAL_BY_CODE[code] ?? null : null;
}

/**
 * The 409 carries no `availableStock` field — the numbers live only in the
 * message: "Only <available> left in stock — the cart already holds <inCart>, …".
 */
function stockNumbers(error: unknown): { available: number; inCart: number } | null {
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string') return null;
  const match = /Only (\d+) left in stock\D+holds (\d+)/i.exec(message);
  return match ? { available: Number(match[1]), inCart: Number(match[2]) } : null;
}

/** Buyer-facing text for a failed add. Uncoded errors keep the backend message (BE copy is not translated). */
export function addToCartErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const refusal = cartAddRefusal(error);
  if (refusal === 'exceedsStock') {
    const numbers = stockNumbers(error);
    return numbers
      ? translate(addToCartMessages, lang, 'exceedsStock', numbers)
      : translate(addToCartMessages, lang, 'exceedsStockUnknown');
  }
  if (refusal) return translate(addToCartMessages, lang, refusal);

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return translate(addToCartMessages, lang, 'addFailed');
}
