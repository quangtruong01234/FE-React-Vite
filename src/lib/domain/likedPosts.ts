const key = (userId: string) => `liked_posts:${userId}`;

function load(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function save(userId: string, set: Set<string>): void {
  localStorage.setItem(key(userId), JSON.stringify([...set]));
}

export function isPostLiked(userId: string, postId: string): boolean {
  return load(userId).has(postId);
}

export function setPostLiked(userId: string, postId: string, liked: boolean): void {
  const set = load(userId);
  if (liked) {
    set.add(postId);
  } else {
    set.delete(postId);
  }
  save(userId, set);
}
