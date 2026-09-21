import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob } from './download';

describe('downloadBlob', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-url');
  const revokeObjectURL = vi.fn();
  let click: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // jsdom implements neither of these.
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('clicks an anchor carrying the blob url and the download filename', () => {
    const blob = new Blob(['id,total\r\n'], { type: 'text/csv' });

    downloadBlob(blob, 'trybuy-orders-2026-08-19-2026-09-17.csv');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('trybuy-orders-2026-08-19-2026-09-17.csv');
    expect(anchor.getAttribute('href')).toBe('blob:mock-url');
  });

  it('revokes the url and leaves no anchor behind in the document', () => {
    downloadBlob(new Blob(['x']), 'invoice-ord_0000000000000119.pdf');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });
});
