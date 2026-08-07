import { useRef, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GradientButton } from '@/components/shared/GradientButton';
import { Avatar } from '@/components/shared/Avatar';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import { uploadAvatar, deleteMedia } from '@/lib/http/cloudinary';
import { validateUploadFile, MAX_IMAGE_BYTES } from '@/lib/http/uploadValidation';
import { cn } from '@/lib/format/utils';
import { credentialConflictError } from '@/lib/domain/credentialConflict';
import { replacePendingAvatar, discardedAvatarOrphan, type PendingAvatar } from './avatarUpload';
import type { User } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Tên không được trống'),
  email: z.string().email('Email không hợp lệ'),
  avatar: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

export function EditProfileModal({ open, onClose, user }: EditProfileModalProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The avatar uploaded this session but not yet persisted. Tracked with its
  // publicId so cancel/replace can delete it from Cloudinary (UP-02).
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      name: user.name ?? user.username,
      email: user.email,
      avatar: user.avatar ?? undefined,
    },
  });

  const updateUser = useMutation({
    mutationFn: (data: FormData) => api.users.update(user.id, {
      name: data.name,
      email: data.email,
      avatar: data.avatar,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      // Saved — the pending upload is now the persisted avatar. Drop tracking
      // WITHOUT deleting it, then close without the cancel-cleanup.
      setPendingAvatar(null);
      setUploadError(null);
      onClose();
    },
  });

  function handleClose(): void {
    // Cancel/close: delete the freshly-uploaded avatar that was never saved.
    const orphan = discardedAvatarOrphan(pendingAvatar);
    if (orphan) void deleteMedia(orphan);
    setPendingAvatar(null);
    setUploadError(null);
    onClose();
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    // UP-04: reject bad files before wasting an upload round-trip.
    const invalid = validateUploadFile(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    if (invalid) {
      setUploadError(invalid);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const { url, publicId } = await uploadAvatar(file, user.id);
      // Replacing an earlier not-yet-saved avatar orphans it — delete it now.
      const { next, orphan } = replacePendingAvatar(pendingAvatar, { url, publicId });
      if (orphan) void deleteMedia(orphan);
      setPendingAvatar(next);
      setValue('avatar', next.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onSubmit(data: FormData): Promise<void> {
    try {
      await updateUser.mutateAsync(data);
    } catch (err: unknown) {
      // An email already registered to someone else is a 409 (backend
      // 2026-08-06) — show it on the email input, not as a generic failure.
      const { field, message } = credentialConflictError(err, 'Cập nhật thất bại');
      setError(field === 'email' ? 'email' : 'root', { message });
    }
  }

  const displayAvatar = pendingAvatar?.url ?? user.avatar ?? undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md bg-canvas-surface border-bdr text-ink-pri p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-display text-lg text-ink-pri">Chỉnh sửa hồ sơ</DialogTitle>
          <DialogDescription className="sr-only">
            Cập nhật ảnh đại diện và thông tin cá nhân của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4 p-5">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar src={displayAvatar} alt={user.name ?? user.username} size={84} />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-tb-gradient text-ink-pri border-2 border-canvas-surface flex items-center justify-center cursor-pointer disabled:opacity-40 overflow-visible"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { void handleAvatarSelect(e); }}
            />
            {uploadError && <p className="text-xs text-accent-red">{uploadError}</p>}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-medium text-[11px] text-ink-muted tracking-[0.04em] uppercase">
              Tên hiển thị
            </label>
            <input
              {...register('name')}
              className={cn(
                'bg-canvas-elevated border border-bdr rounded-tb-input',
                'px-3.5 py-2.5 text-sm text-ink-pri placeholder:text-ink-muted',
                'outline-none focus:border-accent-amber/50 transition-colors',
                errors.name && 'border-accent-red',
              )}
            />
            {errors.name && <p className="text-xs text-accent-red">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-medium text-[11px] text-ink-muted tracking-[0.04em] uppercase">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              className={cn(
                'bg-canvas-elevated border border-bdr rounded-tb-input',
                'px-3.5 py-2.5 text-sm text-ink-pri placeholder:text-ink-muted',
                'outline-none focus:border-accent-amber/50 transition-colors',
                errors.email && 'border-accent-red',
              )}
            />
            {errors.email && <p className="text-xs text-accent-red">{errors.email.message}</p>}
          </div>

          {/* Server error that belongs to no single field */}
          {errors.root && <p className="text-sm text-accent-red">{errors.root.message}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-canvas-elevated border border-bdr rounded-tb-cta py-2.5 text-sm font-semibold text-ink-sec cursor-pointer hover:border-accent-amber/50 transition-colors"
            >
              Hủy
            </button>
            <GradientButton
              type="submit"
              disabled={isSubmitting || uploading || updateUser.isPending}
              size="sm"
              className="flex-1"
            >
              {(isSubmitting || updateUser.isPending) && <Loader2 size={14} className="animate-spin" />}
              Lưu thay đổi
            </GradientButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
