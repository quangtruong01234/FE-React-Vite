import { describe, it, expect } from 'vitest';
import { preloadImage } from './preloadImage';

describe('preloadImage', () => {
  it('starts a request for the given URL', () => {
    const img = preloadImage('https://res.cloudinary.com/demo/image/upload/w_1600/a.jpg');
    expect(img?.src).toBe('https://res.cloudinary.com/demo/image/upload/w_1600/a.jpg');
    expect(img?.decoding).toBe('async');
  });

  it('does nothing for an empty URL', () => {
    expect(preloadImage('')).toBeNull();
  });
});
