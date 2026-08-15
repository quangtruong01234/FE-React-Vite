import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Link2, Loader2, Trash2, Pencil, Flag } from 'lucide-react';
import { IconButton } from '@/components/shared/IconButton';
import { cn } from '@/lib/format/utils';
import { useDeletePost } from './useFeed';
import { ReportPostDialog } from './ReportPostDialog';

interface PostActionMenuProps {
  postId: string;
  /** Whether the current viewer owns the post (enables destructive actions). */
  isOwner: boolean;
  /** Whether a viewer is logged in — gates the report action. */
  canReport?: boolean;
  /** Parent owns the share toast — menu delegates copy to it. */
  onCopyLink: () => void;
  /** Opens the composer in edit mode (owner only). */
  onEdit?: () => void;
  /** Called after a successful delete (e.g. navigate away on the detail page). */
  onDeleted?: () => void;
}

export function PostActionMenu({ postId, isOwner, canReport = false, onCopyLink, onEdit, onDeleted }: PostActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mutate: deletePost, isPending } = useDeletePost();

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleCopy(e: React.MouseEvent): void {
    e.stopPropagation();
    setOpen(false);
    onCopyLink();
  }

  function handleEdit(e: React.MouseEvent): void {
    e.stopPropagation();
    setOpen(false);
    onEdit?.();
  }

  function handleReport(e: React.MouseEvent): void {
    e.stopPropagation();
    setOpen(false);
    setReportOpen(true);
  }

  function handleDelete(e: React.MouseEvent): void {
    e.stopPropagation();
    if (isPending) return;
    if (!window.confirm('Xóa bài viết này? Hành động không thể hoàn tác.')) return;
    deletePost(postId, {
      onSuccess: () => {
        setOpen(false);
        onDeleted?.();
      },
    });
  }

  return (
    <div className="relative" ref={ref}>
      <IconButton
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="Tùy chọn bài viết"
        className="size-8 rounded-full text-ink-sec hover:bg-canvas-elevated transition-colors shrink-0"
      >
        <MoreHorizontal size={20} className="shrink-0" />
      </IconButton>

      {open && (
        <div className="absolute right-0 top-10 w-52 bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card z-[120] p-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-tb-input bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri"
          >
            <Link2 size={15} className="shrink-0 text-ink-sec" /> Sao chép liên kết
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={handleEdit}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-tb-input bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri"
            >
              <Pencil size={15} className="shrink-0 text-ink-sec" /> Chỉnh sửa bài viết
            </button>
          )}

          {!isOwner && canReport && (
            <button
              type="button"
              onClick={handleReport}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-tb-input bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri"
            >
              <Flag size={15} className="shrink-0 text-ink-sec" /> Báo cáo bài viết
            </button>
          )}

          {isOwner && (
            <>
              <div className="h-px bg-bdr my-1.5" />
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-tb-input bg-transparent border-0 cursor-pointer transition-colors text-left text-sm',
                  'text-accent-red hover:bg-accent-red/10 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isPending
                  ? <Loader2 size={15} className="shrink-0 animate-spin" />
                  : <Trash2 size={15} className="shrink-0" />}
                Xóa bài viết
              </button>
            </>
          )}
        </div>
      )}

      <ReportPostDialog postId={postId} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
