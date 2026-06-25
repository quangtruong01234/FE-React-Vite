import type { Post } from '@/types';

/**
 * App-scoped composer is hosted once in {@link GlobalCreatePost}. Surfaces open it
 * by dispatching these window events instead of mounting their own modal.
 */
export const CREATE_POST_EVENT = 'tb:createpost';
export const EDIT_POST_EVENT = 'tb:editpost';

export function openCreatePost(): void {
  window.dispatchEvent(new CustomEvent(CREATE_POST_EVENT));
}

export function openEditPost(post: Post): void {
  window.dispatchEvent(new CustomEvent<Post>(EDIT_POST_EVENT, { detail: post }));
}
