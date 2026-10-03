/**
 * Like count the post page shows: the server's count, moved by one when the
 * viewer's toggle disagrees with what the server last said. The page keeps the
 * toggle locally (the like hooks only patch the feed caches), so this is what
 * stops an already-liked post from reading one like too many.
 */
export function shownLikeCount(serverCount: number, serverLiked: boolean, liked: boolean): number {
  if (liked === serverLiked) return serverCount;
  return liked ? serverCount + 1 : Math.max(0, serverCount - 1);
}
