import { Suspense, lazy, useEffect, useState } from 'react';
import { CREATE_POST_EVENT, EDIT_POST_EVENT } from './composerEvents';
import type { Post } from '@/types';

const CreatePostModal = lazy(() => import('./CreatePostModal'));

/**
 * App-scoped host for the post composer. Listens for the global `tb:createpost`
 * (Header) and `tb:editpost` (post action menu) events so the modal opens from
 * any route. The modal (and its upload deps) is lazy-loaded on first open to
 * keep it out of the main bundle. Unmounting on close resets its seeded state,
 * so create vs. edit prefill is always fresh.
 */
export function GlobalCreatePost() {
  const [open, setOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | undefined>(undefined);

  useEffect(() => {
    function handleCreate(): void {
      setEditPost(undefined);
      setOpen(true);
    }
    function handleEdit(e: Event): void {
      setEditPost((e as CustomEvent<Post>).detail);
      setOpen(true);
    }
    window.addEventListener(CREATE_POST_EVENT, handleCreate);
    window.addEventListener(EDIT_POST_EVENT, handleEdit);
    return () => {
      window.removeEventListener(CREATE_POST_EVENT, handleCreate);
      window.removeEventListener(EDIT_POST_EVENT, handleEdit);
    };
  }, []);

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <CreatePostModal
        open={open}
        editPost={editPost}
        onClose={() => { setOpen(false); setEditPost(undefined); }}
      />
    </Suspense>
  );
}
