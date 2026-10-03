import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { uploadProductImage, uploadVideo } from './cloudinary';

// UPLOAD-SIZE-01: the signature request declares the file size, and the
// backend's oversize 400 reaches the user in the same words as the local guard.
describe('upload signature request', () => {
  let captured: URL | undefined;

  afterEach(() => {
    captured = undefined;
  });

  const refuse = (message: string) =>
    server.use(
      http.post(`${API_BASE}/upload/signature`, ({ request }) => {
        captured = new URL(request.url);
        return HttpResponse.json({ statusCode: 400, message }, { status: 400 });
      }),
    );

  const file = (bytes: number, name: string, type: string): File =>
    new File([new Uint8Array(bytes)], name, { type });

  it('sends ?bytes= with the file size next to the folder', async () => {
    refuse('File is 1234 bytes, over the 1024 byte limit for this folder');

    await expect(uploadProductImage(file(1234, 'a.png', 'image/png'), 'usr_1')).rejects.toThrow();

    expect(captured?.searchParams.get('folder')).toBe('trybuy/products');
    expect(captured?.searchParams.get('bytes')).toBe('1234');
  });

  it('turns the backend oversize 400 into the Vietnamese guard message', async () => {
    refuse('File is 6291456 bytes, over the 5242880 byte limit for this folder');

    await expect(uploadProductImage(file(16, 'a.png', 'image/png'), 'usr_1')).rejects.toThrow(
      'Ảnh vượt quá 5MB',
    );
  });

  it('words it for the upload kind', async () => {
    refuse('File is 209715200 bytes, over the 104857600 byte limit for this folder');

    await expect(uploadVideo(file(16, 'a.mp4', 'video/mp4'), 'usr_1')).rejects.toThrow(
      'Video vượt quá 100MB',
    );
    expect(captured?.searchParams.get('folder')).toBe('trybuy/posts');
  });

  it('passes any other signature error through untouched', async () => {
    refuse('Folder is not allowed');

    await expect(uploadProductImage(file(16, 'a.png', 'image/png'), 'usr_1')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Folder is not allowed',
    });
  });

  it('omits bytes for an empty file instead of sending bytes=0', async () => {
    refuse('Folder is not allowed');

    await expect(uploadProductImage(file(0, 'a.png', 'image/png'), 'usr_1')).rejects.toBeDefined();

    expect(captured?.searchParams.has('bytes')).toBe(false);
  });
});

describe('upload errors in English (I18N-07)', () => {
  it('turns the backend oversize 400 into the English guard message', async () => {
    server.use(
      http.post(`${API_BASE}/upload/signature`, () =>
        HttpResponse.json(
          { statusCode: 400, message: 'File is 6291456 bytes, over the 5242880 byte limit for this folder' },
          { status: 400 },
        ),
      ),
    );
    const png = new File([new Uint8Array(16)], 'a.png', { type: 'image/png' });

    await expect(uploadProductImage(png, 'usr_1', undefined, 'en')).rejects.toThrow('Image is larger than 5MB');
  });
});
