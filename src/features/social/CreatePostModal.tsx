import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Video, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GradientButton } from '@/components/shared/GradientButton';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import { uploadImage, uploadVideo, deleteMedia } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import { createPostSchema, type CreatePostFormData } from './social.schema';

const MAX_IMAGES = 4;

interface MediaItem {
  url: string;
  publicId: string;
  type: 'image' | 'video';
}

interface UploadState {
  active: boolean;
  percent: number;
  error: string | null;
}

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [upload, setUpload] = useState<UploadState>({ active: false, percent: 0, error: null });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormData>({ resolver: zodResolver(createPostSchema) });

  const { mutateAsync: createPost } = useMutation({
    mutationFn: (data: CreatePostFormData) => {
      const imageUrls = mediaItems.filter((m) => m.type === 'image').map((m) => m.url);
      const videoItem = mediaItems.find((m) => m.type === 'video');
      return api.social.createPost({
        content: data.content,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        videoUrl: videoItem?.url,
      });
    },
    onSuccess: () => {
      // Post saved — media is now referenced, don't delete
      setMediaItems([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(1) });
      reset();
      setUpload({ active: false, percent: 0, error: null });
      onClose();
    },
  });

  function handleClose() {
    // Delete any uploaded-but-not-posted media from Cloudinary
    const orphans = mediaItems.map((m) => m.publicId).filter(Boolean);
    orphans.forEach((pid) => { void deleteMedia(pid); });
    reset();
    setMediaItems([]);
    setUpload({ active: false, percent: 0, error: null });
    onClose();
  }

  async function uploadImageFiles(files: File[]) {
    const currentImages = mediaItems.filter((m) => m.type === 'image').length;
    const available = MAX_IMAGES - currentImages;
    const toUpload = files.slice(0, available);
    if (!toUpload.length) return;

    setUpload({ active: true, percent: 0, error: null });

    try {
      const uploaded: Array<{ url: string; publicId: string }> = [];
      for (let i = 0; i < toUpload.length; i++) {
        const result = await uploadImage(toUpload[i], currentUser?.id ?? 0, (p) => {
          const base = (i / toUpload.length) * 100;
          setUpload((prev) => ({ ...prev, percent: Math.round(base + p / toUpload.length) }));
        });
        uploaded.push(result);
      }
      setMediaItems((prev) => [
        ...prev,
        ...uploaded.map(({ url, publicId }) => ({ url, publicId, type: 'image' as const })),
      ]);
    } catch (err: unknown) {
      setUpload((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Upload ảnh thất bại',
      }));
    } finally {
      setUpload((prev) => ({ ...prev, active: false, percent: 0 }));
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    await uploadImageFiles(files);
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (!imageFiles.length) return;
    e.preventDefault();
    await uploadImageFiles(imageFiles);
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpload({ active: true, percent: 0, error: null });

    try {
      const result = await uploadVideo(file, currentUser?.id ?? 0, (p) => {
        setUpload((prev) => ({ ...prev, percent: p }));
      });
      // If replacing an existing video, delete the old one from Cloudinary
      const oldVideo = mediaItems.find((m) => m.type === 'video');
      if (oldVideo) void deleteMedia(oldVideo.publicId);
      setMediaItems((prev) => [
        ...prev.filter((m) => m.type === 'image'),
        { url: result.url, publicId: result.publicId, type: 'video' },
      ]);
    } catch (err: unknown) {
      setUpload((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Upload video thất bại',
      }));
    } finally {
      setUpload((prev) => ({ ...prev, active: false, percent: 0 }));
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  function removeMedia(index: number) {
    const item = mediaItems[index];
    if (item) void deleteMedia(item.publicId);
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(data: CreatePostFormData) {
    try {
      await createPost(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng bài thất bại';
      setError('root', { message });
    }
  }

  const imageCount = mediaItems.filter((m) => m.type === 'image').length;
  const hasVideo = mediaItems.some((m) => m.type === 'video');
  const canAddImage = imageCount < MAX_IMAGES && !upload.active;
  const canAddVideo = !hasVideo && !upload.active;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] flex flex-col bg-canvas-surface border-bdr text-ink-pri p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-display text-lg text-ink-pri">
            Tạo bài viết
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
          {/* Scrollable body */}
          <div className="flex flex-col gap-4 px-5 pt-4 pb-2 overflow-y-auto max-h-[60vh]">
            {/* Textarea */}
            <textarea
              {...register('content')}
              rows={4}
              placeholder="Chia sẻ điều gì đó về sản phẩm, review, deal hot…"
              onPaste={(e) => { void handlePaste(e); }}
              className={cn(
                'w-full bg-transparent border-0 outline-none resize-none',
                'text-ink-pri text-base font-body leading-relaxed',
                'placeholder:text-ink-muted',
              )}
            />
            {errors.content && (
              <p className="text-sm text-accent-red -mt-2">{errors.content.message}</p>
            )}

            {/* Media previews */}
            {mediaItems.length > 0 && (
              <div className={cn(
                'grid gap-0.5',
                mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
              )}>
                {mediaItems.map((item, i) => (
                  <div key={item.url} className="relative group">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full max-h-60 object-contain rounded-tb-cta bg-canvas-elevated"
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        className="w-full aspect-video object-cover rounded-tb-cta"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-ink-pri border-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={13} className="shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress */}
            {upload.active && (
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 bg-canvas-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-amber transition-all duration-200 rounded-full"
                    style={{ width: `${upload.percent}%` }}
                  />
                </div>
                <p className="text-xs text-ink-muted font-body">{upload.percent}% đã tải lên</p>
              </div>
            )}

            {/* Upload error */}
            {upload.error && (
              <p className="text-sm text-accent-red">{upload.error}</p>
            )}

            {/* Server error */}
            {errors.root && (
              <p className="text-sm text-accent-red">{errors.root.message}</p>
            )}
          </div>

          {/* Footer — always visible, never clipped */}
          <div className="flex items-center justify-between border-t border-bdr px-5 py-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              {/* Image upload */}
              <button
                type="button"
                disabled={!canAddImage}
                onClick={() => imageInputRef.current?.click()}
                title={`Thêm ảnh (tối đa ${MAX_IMAGES})`}
                className={cn(
                  'p-2 rounded-full flex items-center justify-center',
                  'bg-transparent border-0 cursor-pointer overflow-visible',
                  'text-accent-green hover:bg-canvas-elevated transition-colors',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {upload.active ? (
                  <Loader2 size="18" className="animate-spin" />
                ) : (
                  <ImagePlus size="18" />
                )}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { void handleImageSelect(e); }}
              />

              {/* Video upload */}
              <button
                type="button"
                disabled={!canAddVideo}
                onClick={() => videoInputRef.current?.click()}
                title="Thêm video"
                className={cn(
                  'p-2 rounded-full flex items-center justify-center',
                  'bg-transparent border-0 cursor-pointer overflow-visible',
                  'text-accent-amber hover:bg-canvas-elevated transition-colors',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <Video size="18" />
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { void handleVideoSelect(e); }}
              />

              {/* Image count badge */}
              {imageCount > 0 && (
                <span className="text-xs text-ink-muted font-body ml-1">
                  {imageCount}/{MAX_IMAGES} ảnh
                </span>
              )}
            </div>

            <GradientButton
              type="submit"
              disabled={isSubmitting || upload.active}
              size="sm"
            >
              {isSubmitting ? <Loader2 size="14" className="animate-spin" /> : null}
              Đăng bài
            </GradientButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
