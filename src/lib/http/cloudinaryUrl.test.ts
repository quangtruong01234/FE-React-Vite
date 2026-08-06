import { describe, it, expect } from 'vitest';
import { cldImage } from './cloudinaryUrl';

const CLOUD = 'https://res.cloudinary.com/demo/image/upload';

describe('cldImage', () => {
  it('inserts the transformation before a versioned public id', () => {
    expect(cldImage(`${CLOUD}/v1712345678/trybuy/products/abc.jpg`, 600)).toBe(
      `${CLOUD}/f_auto,q_auto,w_600,c_limit/v1712345678/trybuy/products/abc.jpg`,
    );
  });

  it('inserts the transformation when the URL has no version segment', () => {
    expect(cldImage(`${CLOUD}/trybuy/avatars/usr_1.png`, 96)).toBe(
      `${CLOUD}/f_auto,q_auto,w_96,c_limit/trybuy/avatars/usr_1.png`,
    );
  });

  it('leaves a URL that already carries a transformation untouched', () => {
    const already = `${CLOUD}/f_auto,q_auto,w_400,c_limit/v1/trybuy/a.jpg`;
    expect(cldImage(already, 600)).toBe(already);
    const single = `${CLOUD}/e_blur:200/v1/trybuy/a.jpg`;
    expect(cldImage(single, 600)).toBe(single);
  });

  it('still transforms a root-level public id shaped like a parameter', () => {
    expect(cldImage(`${CLOUD}/ab_cd.jpg`, 600)).toBe(
      `${CLOUD}/f_auto,q_auto,w_600,c_limit/ab_cd.jpg`,
    );
  });

  it('leaves video delivery URLs untouched', () => {
    const video = 'https://res.cloudinary.com/demo/video/upload/v1/trybuy/posts/clip.mp4';
    expect(cldImage(video, 800)).toBe(video);
  });

  it('leaves non-Cloudinary sources untouched', () => {
    const unsplash = 'https://images.unsplash.com/photo-1695048133142?w=100';
    expect(cldImage(unsplash, 96)).toBe(unsplash);
    expect(cldImage('blob:http://localhost:5173/9f1c-preview', 600)).toBe(
      'blob:http://localhost:5173/9f1c-preview',
    );
    expect(cldImage('', 600)).toBe('');
  });
});
