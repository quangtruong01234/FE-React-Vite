import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { BasicInfoSection } from './BasicInfoSection';
import type { ImageItem } from './useProductForm';

vi.mock('@/lib/http/cloudinary', () => ({
  uploadProductImage: vi.fn(),
  deleteMedia: vi.fn(),
}));

const noop = (): void => {};

function renderSection(
  images: ImageItem[],
  onAddImages = vi.fn<ComponentProps<typeof BasicInfoSection>['onAddImages']>(async () => []),
) {
  const utils = render(
    <BasicInfoSection
      images={images}
      uploadState={{ active: false, percent: 0, error: null }}
      onAddImages={onAddImages}
      onRemoveImage={noop}
      userId="usr_0000000000000001"
      name=""
      description=""
      sku=""
      brandId={null}
      categoryIds={[]}
      condition="new"
      brands={[]}
      categories={[]}
      brandsLoading={false}
      categoriesLoading={false}
      errors={{}}
      onNameChange={noop}
      onDescriptionChange={noop}
      onSkuChange={noop}
      onBrandChange={noop}
      onCategoryToggle={noop}
      onConditionChange={noop}
    />,
  );
  // The gallery picker is the only `multiple` file input; the editor's is single.
  const input = utils.container.querySelector<HTMLInputElement>('input[type="file"][multiple]');
  if (!input) throw new Error('gallery file input not rendered');
  return { ...utils, input, onAddImages };
}

const imagesOf = (n: number): ImageItem[] =>
  Array.from({ length: n }, (_, i) => ({ url: `https://res.cloudinary.com/e2e/p${i}.png`, publicId: `p${i}` }));

const pngs = (n: number): File[] => Array.from({ length: n }, (_, i) => new File(['x'], `${i}.png`, { type: 'image/png' }));

describe('BasicInfoSection — product image cap', () => {
  // Regression: the section sliced the selection to 6 before the hook saw it, so
  // a 7th..10th image (allowed by the backend) was dropped with no notice and the
  // hook's UP-07 "partial batch" message could never fire.
  it('hands the whole selection to onAddImages so the hook can cap it and say what it dropped', () => {
    const { input, onAddImages } = renderSection(imagesOf(4));

    fireEvent.change(input, { target: { files: pngs(8) } });

    expect(onAddImages).toHaveBeenCalledTimes(1);
    expect(onAddImages.mock.calls[0][0]).toHaveLength(8);
  });

  it('counts against the backend limit of 10, not 6', () => {
    renderSection(imagesOf(7));

    expect(screen.getByText('7/10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm ảnh sản phẩm' })).toBeInTheDocument();
  });

  it('hides the add tile once 10 images are in', () => {
    renderSection(imagesOf(10));

    expect(screen.getByText('10/10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm ảnh sản phẩm' })).not.toBeInTheDocument();
  });
});
