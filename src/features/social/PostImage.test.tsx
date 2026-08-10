import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { PostImage } from './PostImage';
import { resetFailedPostImages } from './failedPostImages';

describe('<PostImage>', () => {
  // The failed-URL set is module scope on purpose (feed tile and lightbox are
  // separate mounts of the same asset), so it has to be cleared between cases.
  beforeEach(resetFailedPostImages);

  it('renders an <img> built from the Cloudinary derivative width', () => {
    render(<PostImage src="https://res.cloudinary.com/demo/image/upload/v1/trybuy/posts/a.jpg" width={600} />);
    const img = document.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('w_600');
  });

  it('falls back to a placeholder when the image fails to load', () => {
    // Seeded/legacy post rows point at assets that were never uploaded, and the
    // feed is a happy path — a 404 must not leave a broken image on screen.
    const { container } = render(<PostImage src="https://cdn.test/gone.jpg" width={600} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('keeps the slot classes on the placeholder so the layout does not shift', () => {
    const { container } = render(
      <PostImage src="https://cdn.test/gone.jpg" width={600} className="w-full h-full object-cover" />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    const placeholder = container.firstElementChild as HTMLElement;
    expect(placeholder.className).toContain('w-full');
    expect(placeholder.className).toContain('h-full');
  });

  it("retries a new src instead of inheriting the previous one's failure", () => {
    // A feed slot recycles into a different post on refetch — the new image must
    // be requested rather than inheriting the old URL's failure.
    const { container, rerender } = render(<PostImage src="https://cdn.test/gone.jpg" width={600} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();

    rerender(<PostImage src="https://cdn.test/ok.jpg" width={600} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('keeps the click handler on the placeholder (lightbox close still works)', () => {
    const onClick = vi.fn();
    const { container } = render(<PostImage src="https://cdn.test/gone.jpg" width={1600} onClick={onClick} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not re-request a URL another instance already saw fail', () => {
    // The lightbox is a separate mount asking for a wider derivative of the same
    // asset — without the shared set, clicking a broken image fires a second 404.
    const feed = render(<PostImage src="https://cdn.test/gone.jpg" width={600} />);
    fireEvent.error(feed.container.querySelector('img') as HTMLImageElement);

    const lightbox = render(<PostImage src="https://cdn.test/gone.jpg" width={1600} />);
    expect(lightbox.container.querySelector('img')).toBeNull();
    expect(lightbox.container.querySelector('svg')).not.toBeNull();
  });

  it('still requests a different URL after another one failed', () => {
    const first = render(<PostImage src="https://cdn.test/gone.jpg" width={600} />);
    fireEvent.error(first.container.querySelector('img') as HTMLImageElement);

    const second = render(<PostImage src="https://cdn.test/fine.jpg" width={600} />);
    expect(second.container.querySelector('img')).not.toBeNull();
  });

  it('passes loading and fetchPriority through to the image', () => {
    const { container } = render(
      <PostImage src="https://cdn.test/a.jpg" width={1200} loading="eager" fetchPriority="high" />,
    );
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });
});
