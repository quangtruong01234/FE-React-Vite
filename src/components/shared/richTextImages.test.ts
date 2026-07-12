import { describe, it, expect } from 'vitest';
import { partitionEditorImages, type TrackedImage } from './richTextImages';

const a: TrackedImage = { url: 'https://res.cloudinary.com/x/a.png', publicId: 'trybuy/products/1_a' };
const b: TrackedImage = { url: 'https://res.cloudinary.com/x/b.png', publicId: 'trybuy/products/1_b' };

describe('partitionEditorImages', () => {
  it('keeps images still referenced in the HTML', () => {
    const html = `<p>hi</p><img src="${a.url}"><img src="${b.url}">`;
    const { kept, removed } = partitionEditorImages([a, b], html);
    expect(kept).toEqual([a, b]);
    expect(removed).toEqual([]);
  });

  it('flags an image dropped from the editor as removed (UP-03 orphan)', () => {
    // b was deleted from the editor — only a survives in the HTML.
    const html = `<p>hi</p><img src="${a.url}">`;
    const { kept, removed } = partitionEditorImages([a, b], html);
    expect(kept).toEqual([a]);
    expect(removed).toEqual([b]);
  });

  it('treats an empty editor as every tracked image removed', () => {
    const { kept, removed } = partitionEditorImages([a, b], '');
    expect(kept).toEqual([]);
    expect(removed).toEqual([a, b]);
  });

  it('returns empty partitions when nothing is tracked', () => {
    const { kept, removed } = partitionEditorImages([], `<img src="${a.url}">`);
    expect(kept).toEqual([]);
    expect(removed).toEqual([]);
  });
});
