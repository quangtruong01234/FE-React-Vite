import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GradientButton } from '@/components/shared/GradientButton';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import { cn } from '@/lib/utils';
import { createPostSchema, type CreatePostFormData } from './social.schema';
import type { Product } from '@/types';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [attachedProduct, setAttachedProduct] = useState<Product | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormData>({ resolver: zodResolver(createPostSchema) });

  const { mutateAsync: createPost } = useMutation({
    mutationFn: (data: CreatePostFormData) =>
      api.social.createPost({ content: data.content, imageUrls }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(1) });
      handleClose();
    },
  });

  function handleClose() {
    reset();
    setImageUrls([]);
    setUploadError(null);
    setProductQuery('');
    setProductResults([]);
    setAttachedProduct(null);
    onClose();
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);

    try {
      const sig = await api.upload.getSignature('posts');

      const form = new FormData();
      form.append('file', file);
      form.append('signature', sig.signature);
      form.append('timestamp', String(sig.timestamp));
      form.append('api_key', sig.apiKey);
      form.append('folder', sig.folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: 'POST', body: form },
      );

      if (!res.ok) throw new Error('Upload thất bại');

      const json = (await res.json()) as { secure_url: string };
      setImageUrls((prev) => [...prev, json.secure_url]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleProductSearch(q: string) {
    setProductQuery(q);
    if (q.trim().length < 2) {
      setProductResults([]);
      return;
    }
    setSearchingProduct(true);
    try {
      const res = await api.products.search(q.trim());
      setProductResults(res.data.slice(0, 5));
    } catch {
      setProductResults([]);
    } finally {
      setSearchingProduct(false);
    }
  }

  async function onSubmit(data: CreatePostFormData) {
    try {
      await createPost(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng bài thất bại';
      setError('root', { message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-xl bg-canvas-surface border-bdr text-ink-pri p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-display text-lg text-ink-pri">
            Tạo bài viết
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5">
          {/* Textarea */}
          <textarea
            {...register('content')}
            rows={4}
            placeholder="Chia sẻ điều gì đó về sản phẩm, review, deal hot…"
            className={cn(
              'w-full bg-transparent border-0 outline-none resize-none',
              'text-ink-pri text-base font-body leading-relaxed',
              'placeholder:text-ink-muted',
            )}
          />
          {errors.content && (
            <p className="text-sm text-accent-red -mt-2">{errors.content.message}</p>
          )}

          {/* Image previews */}
          {imageUrls.length > 0 && (
            <div className={cn('grid gap-0.5', imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {imageUrls.map((url, i) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt=""
                    className="w-full aspect-square object-cover rounded-tb-cta"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-ink-pri border-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <p className="text-sm text-accent-red">{uploadError}</p>
          )}

          {/* Product search */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                value={productQuery}
                onChange={(e) => { void handleProductSearch(e.target.value); }}
                placeholder="Tìm và gắn sản phẩm (tuỳ chọn)…"
                className={cn(
                  'w-full bg-canvas-elevated border border-bdr rounded-tb-input',
                  'px-3 py-2.5 text-sm text-ink-pri placeholder:text-ink-muted',
                  'outline-none focus:border-accent-amber/50 transition-colors',
                )}
              />
              {searchingProduct && (
                <Loader2 size={14} className="absolute right-3 top-3 text-ink-muted animate-spin" />
              )}
            </div>

            {/* Dropdown results */}
            {productResults.length > 0 && !attachedProduct && (
              <ul className="bg-canvas-elevated border border-bdr rounded-tb-card overflow-hidden">
                {productResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedProduct(p);
                        setProductQuery('');
                        setProductResults([]);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-canvas-surface transition-colors border-0 cursor-pointer bg-transparent"
                    >
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-none" />
                      )}
                      <span className="text-sm text-ink-pri truncate flex-1">{p.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Attached product chip preview */}
            {attachedProduct && (
              <div className="flex items-center gap-2 bg-canvas-elevated border border-bdr rounded-tb-input px-3 py-2">
                {attachedProduct.imageUrl && (
                  <img src={attachedProduct.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-none" />
                )}
                <span className="text-sm text-ink-pri truncate flex-1">{attachedProduct.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedProduct(null)}
                  className="text-ink-muted hover:text-ink-sec cursor-pointer bg-transparent border-0 p-0 flex-none"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Server error */}
          {errors.root && (
            <p className="text-sm text-accent-red">{errors.root.message}</p>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-bdr pt-4 -mx-5 px-5">
            <div className="flex items-center gap-1">
              {/* Image upload trigger */}
              <button
                type="button"
                disabled={uploadingImage || imageUrls.length >= 4}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center',
                  'bg-transparent border-0 cursor-pointer',
                  'text-accent-green hover:bg-canvas-elevated transition-colors',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { void handleImageSelect(e); }}
              />
            </div>

            <GradientButton
              type="submit"
              disabled={isSubmitting || uploadingImage}
              size="sm"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Đăng bài
            </GradientButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
