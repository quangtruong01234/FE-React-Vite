import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RichTextEditor } from './RichTextEditor';

vi.mock('@/lib/http/cloudinary', () => ({
  deleteMedia: vi.fn(),
}));

const USER_ID = 'usr_0000000000000001';
const uploadImage = vi.fn();

function renderEditor(value: string) {
  const onChange = vi.fn();
  const props = { onChange, userId: USER_ID, onUploadImage: uploadImage };
  const { rerender } = render(<RichTextEditor value={value} {...props} />);
  return {
    onChange,
    setValue: (next: string) => rerender(<RichTextEditor value={next} {...props} />),
  };
}

describe('RichTextEditor — hydrating a value that arrives after mount', () => {
  it('shows a description that lands once the product query resolves', async () => {
    const { setValue } = renderEditor('');

    // Edit mode: the form mounts empty and the saved product arrives a tick later.
    setValue('<p>Tai nghe chống ồn, pin 38 giờ.</p>');

    expect(await screen.findByText('Tai nghe chống ồn, pin 38 giờ.')).toBeInTheDocument();
  });

  it('does not report hydration as a seller edit', async () => {
    const { setValue, onChange } = renderEditor('');

    setValue('<p>Bảo hành 12 tháng.</p>');
    await screen.findByText('Bảo hành 12 tháng.');

    // If seeding emitted an update, the parent would mark `description` dirty and
    // the PATCH would carry a field the seller never touched.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves the editor alone when the incoming value is what it already holds', async () => {
    const { setValue, onChange } = renderEditor('<p>Giữ nguyên.</p>');
    await screen.findByText('Giữ nguyên.');

    setValue('<p>Giữ nguyên.</p>');

    await waitFor(() => expect(screen.getByText('Giữ nguyên.')).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });
});
