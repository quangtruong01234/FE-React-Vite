/**
 * Saves a `Blob` the browser already holds to disk under `fileName`.
 *
 * Extracted from `features/order/useOrderInvoice.ts` when the seller CSV export
 * (EXPORT-CSV-01) needed the identical anchor dance. The `revokeObjectURL` at
 * the end is the part that is easy to drop and leaks the blob for the lifetime
 * of the document, so it lives here once.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
