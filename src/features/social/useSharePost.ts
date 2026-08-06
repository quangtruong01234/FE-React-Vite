import { useCallback, useEffect, useRef, useState } from 'react';
import { copyPostLink, sharePost } from '@/lib/domain/sharePost';

interface UseSharePost {
  toast: string | null;
  /** Native share sheet when available, otherwise copies the link. */
  share: (postId: string) => Promise<void>;
  /** Always copies the link (used by menu items). */
  copy: (postId: string) => Promise<void>;
}

/**
 * Share/copy a post link with ephemeral toast feedback. No toast library —
 * mirrors the local-state toast pattern used elsewhere (e.g. ShopPage).
 */
export function useSharePost(): UseSharePost {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const share = useCallback(async (postId: string) => {
    try {
      const result = await sharePost(postId);
      if (result === 'copied') notify('Đã sao chép liên kết bài viết');
    } catch {
      // Native share was cancelled — treat as a no-op.
    }
  }, [notify]);

  const copy = useCallback(async (postId: string) => {
    try {
      await copyPostLink(postId);
      notify('Đã sao chép liên kết bài viết');
    } catch {
      notify('Không thể sao chép liên kết');
    }
  }, [notify]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, share, copy };
}
