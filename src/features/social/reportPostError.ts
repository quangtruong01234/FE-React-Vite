/**
 * Maps a failed `POST /social/posts/:id/report` error to a user-facing Vietnamese
 * message. Backend contract (P1-03): duplicate report → 409, self-report → 400,
 * rate-limit (20/60s) → 429. Kept pure so it can be unit-tested without a network.
 */
export function reportPostErrorMessage(error: unknown): string {
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  switch (status) {
    case 409:
      return 'Bạn đã báo cáo bài viết này rồi.';
    case 400:
      return 'Không thể báo cáo bài viết của chính bạn.';
    case 429:
      return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.';
    default:
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) return message;
      }
      return 'Báo cáo thất bại. Vui lòng thử lại.';
  }
}
