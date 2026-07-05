export type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

/**
 * Build a compact page list with ellipses for a numbered pagination control.
 * Always shows the first and last page, plus `siblings` pages on each side of
 * the current page. Collapses gaps wider than one page into an ellipsis marker.
 */
export function getPageItems(current: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 0) return [];

  // First page, last page, current ± siblings → fits without ellipsis collapsing.
  const totalNumbers = siblings * 2 + 5;
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, totalPages);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < totalPages - 1;

  const items: PageItem[] = [1];
  if (showLeftEllipsis) items.push('ellipsis-left');

  for (let p = showLeftEllipsis ? left : 2; p <= (showRightEllipsis ? right : totalPages - 1); p++) {
    items.push(p);
  }

  if (showRightEllipsis) items.push('ellipsis-right');
  items.push(totalPages);

  return items;
}
