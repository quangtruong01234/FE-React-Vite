// Checkout packs the shipping address into exactly 6 pipe-delimited parts for
// GHN: "name|phone|address|ward|district|province" (see buildShippingAddress in
// checkout.schema.ts). Parse it back into labelled fields for display.

export interface ParsedShippingAddress {
  name: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  province: string;
}

/** Returns the structured address, or `null` when the string isn't the
 *  expected 6-part GHN format (so callers can fall back to the raw text). */
export function parseShippingAddress(raw: string | null | undefined): ParsedShippingAddress | null {
  if (!raw) return null;
  const parts = raw.split('|').map((p) => p.trim());
  if (parts.length !== 6) return null;
  const [name, phone, addressLine, ward, district, province] = parts;
  if (!name && !phone) return null;
  return { name, phone, addressLine, ward, district, province };
}

/** The street/ward/district/province lines below the name + phone, joined. */
export function formatAddressLines(parsed: ParsedShippingAddress): string {
  return [parsed.addressLine, parsed.ward, parsed.district, parsed.province]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
}
