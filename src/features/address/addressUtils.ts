import type { Address } from '@/types';

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
