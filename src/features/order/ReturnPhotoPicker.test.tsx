import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReturnPhotoPicker } from './ReturnPhotoPicker';
import { ReturnPhotoStrip } from './ReturnPhotoStrip';
import { useReturnPhotos } from './useReturnPhotos';
import { returnRequestPayload } from './returnRequest';

const uploadReturnPhoto = vi.fn();
const deleteMedia = vi.fn();
vi.mock('@/lib/http/cloudinary', () => ({
  uploadReturnPhoto: (...args: unknown[]) => uploadReturnPhoto(...args),
  deleteMedia: (...args: unknown[]) => deleteMedia(...args),
}));

const URL_1 = 'https://res.cloudinary.com/demo/image/upload/v1/trybuy/returns/usr_1/a.jpg';

let lastPayload: unknown = null;

function Harness(): ReactElement {
  const photos = useReturnPhotos('usr_1');
  return (
    <>
      <ReturnPhotoPicker state={photos} />
      <button type="button" onClick={() => { lastPayload = returnRequestPayload('Hỏng', photos.photos.map((p) => p.url)); }}>
        submit
      </button>
      <button type="button" onClick={photos.discard}>close</button>
    </>
  );
}

function pick(files: File[]): void {
  fireEvent.change(screen.getByTestId('return-photo-input'), { target: { files } });
}

describe('ReturnPhotoPicker (RETURN-PHOTO-01)', () => {
  beforeEach(() => {
    uploadReturnPhoto.mockReset();
    deleteMedia.mockReset();
    lastPayload = null;
  });

  it('refuses a GIF before any upload starts', async () => {
    render(<Harness />);
    pick([new File(['x'], 'cat.gif', { type: 'image/gif' })]);
    expect(await screen.findByText('Chỉ nhận ảnh JPG, PNG hoặc WEBP')).toBeInTheDocument();
    expect(uploadReturnPhoto).not.toHaveBeenCalled();
  });

  it('uploads a photo, puts its url in the payload, and deletes it on remove', async () => {
    uploadReturnPhoto.mockResolvedValue({ url: URL_1, publicId: 'trybuy/returns/usr_1/a' });
    render(<Harness />);

    pick([new File(['x'], 'broken.png', { type: 'image/png' })]);
    expect(await screen.findByAltText('Ảnh trả hàng 1')).toBeInTheDocument();
    expect(screen.getByText('1/5')).toBeInTheDocument();

    fireEvent.click(screen.getByText('submit'));
    expect(lastPayload).toEqual({ reason: 'Hỏng', imageUrls: [URL_1] });

    fireEvent.click(screen.getByRole('button', { name: 'Xoá ảnh 1' }));
    expect(deleteMedia).toHaveBeenCalledWith('trybuy/returns/usr_1/a');
    await waitFor(() => expect(screen.queryByAltText('Ảnh trả hàng 1')).not.toBeInTheDocument());
  });

  it('cleans up uploaded photos when the form is closed without submitting', async () => {
    uploadReturnPhoto.mockResolvedValue({ url: URL_1, publicId: 'trybuy/returns/usr_1/a' });
    render(<Harness />);
    pick([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]);
    await screen.findByAltText('Ảnh trả hàng 1');

    fireEvent.click(screen.getByText('close'));
    expect(deleteMedia).toHaveBeenCalledWith('trybuy/returns/usr_1/a');
    await waitFor(() => expect(screen.getByText('0/5')).toBeInTheDocument());
  });
});

describe('ReturnPhotoStrip', () => {
  it('links each photo and renders nothing for a text-only request', () => {
    const { container, rerender } = render(<ReturnPhotoStrip urls={[URL_1]} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', URL_1);
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');

    rerender(<ReturnPhotoStrip urls={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
