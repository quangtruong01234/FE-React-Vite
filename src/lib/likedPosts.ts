const key = (userId: number) => `liked_posts:${userId}`;

function load(userId: number): Set<number> {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function save(userId: number, set: Set<number>): void {
  localStorage.setItem(key(userId), JSON.stringify([...set]));
}

export function isPostLiked(userId: number, postId: number): boolean {
  return load(userId).has(postId);
}

export function setPostLiked(userId: number, postId: number, liked: boolean): void {
  const set = load(userId);
  if (liked) {
    set.add(postId);
  } else {
    set.delete(postId);
  }
  save(userId, set);
}
