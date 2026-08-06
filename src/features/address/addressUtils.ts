import type { Address, GhnLocationDto } from '@/types';

/**
 * Pick which saved address a checkout should preselect. The backend already
 * returns addresses default-first, but prefer the explicit `isDefault` flag so
 * we stay correct even if ordering ever changes; fall back to the first entry,
 * then `null` for an empty book.
 */
export function pickDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
}

/** The six GHN address parts, in pipe order (must mirror the checkout schema). */
const GHN_PARTS = [
  'recipientName',
  'phone',
  'addressLine',
  'wardName',
  'districtName',
  'provinceName',
] as const satisfies readonly (keyof Address)[];

/**
 * Compose the GHN pipe-delimited shipping string from a saved address:
 * "name|phone|address|ward|district|province". Any literal "|" in a field is
 * replaced with a space so the 6-part split stays exact. The names come from
 * the GHN master-data selection, so GHN can resolve them reliably at create.
 */
export function buildGhnShippingAddress(address: Address): string {
  return GHN_PARTS.map((f) =>
    String(address[f]).trim().replace(/\|/g, ' '),
  ).join('|');
}

/**
 * GHN-ADDR-01: the exact GHN district/ward a saved address points at, for the
 * shipping-fee preview and the order create. Without them GHN resolves the
 * free-text pipe string by name, and an ambiguous name resolves to a
 * wrong-but-valid location — which is what produces `shippingFee: 0` and a null
 * `ghnOrderCode` on an otherwise-successful order.
 *
 * The pair is all-or-nothing server-side (sending one is treated as sending
 * neither), so return `{}` unless both parts are usable and let the request
 * fall back to free-text deliberately rather than by accident.
 */
export function ghnLocationIds(address: Address): GhnLocationDto {
  const wardCode = address.wardCode?.trim() ?? '';
  if (!Number.isInteger(address.districtId) || address.districtId < 1 || !wardCode) {
    return {};
  }
  return { toDistrictId: address.districtId, toWardCode: wardCode };
}

/** Human-readable one-line summary: "addressLine, ward, district, province". */
export function formatAddressSummary(address: Address): string {
  return [
    address.addressLine,
    address.wardName,
    address.districtName,
    address.provinceName,
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
}
