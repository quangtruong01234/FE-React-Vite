import { describe, expect, it } from 'vitest';
import {
  moderationActionsFor,
  moderationErrorMessage,
  moderationSuccessMessage,
  reportStatusMeta,
} from './postModeration';
import type { ReportedPostGroup } from '@/types';

function makeGroup(overrides: {
  isHidden?: boolean;
  pendingCount?: number;
} = {}): ReportedPostGroup {
  return {
    post: {
      id: 'post_0000000000000007',
      userId: 'usr_0000000000000003',
      content: 'spam spam',
      imageUrls: null,
      videoUrl: null,
      productId: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      author: { id: 'usr_0000000000000003', username: 'spammer', avatar: null },
      isHidden: overrides.isHidden ?? false,
      hiddenAt: overrides.isHidden ? '2026-07-02T00:00:00.000Z' : null,
    },
    reportCount: 4,
    pendingCount: overrides.pendingCount ?? 2,
    latestReportedAt: '2026-07-02T10:00:00.000Z',
    reports: [
      { id: 1, reporterId: 'usr_0000000000000009', reason: 'spam', status: 'pending', createdAt: '2026-07-02T10:00:00.000Z' },
    ],
  };
}

describe('moderationActionsFor', () => {
  it('visible post with pending reports → hide, dismiss, delete', () => {
    expect(moderationActionsFor(makeGroup())).toEqual(['hide', 'dismiss', 'delete']);
  });

  it('hidden post → unhide instead of hide', () => {
    expect(moderationActionsFor(makeGroup({ isHidden: true }))).toEqual(['unhide', 'dismiss', 'delete']);
  });

  it('no pending reports → dismiss dropped', () => {
    expect(moderationActionsFor(makeGroup({ pendingCount: 0 }))).toEqual(['hide', 'delete']);
  });

  it('hidden + fully resolved → unhide, delete only', () => {
    expect(moderationActionsFor(makeGroup({ isHidden: true, pendingCount: 0 }))).toEqual(['unhide', 'delete']);
  });
});

describe('reportStatusMeta', () => {
  it('maps each status to a Vietnamese label', () => {
    expect(reportStatusMeta('pending').label).toBe('Chờ xử lý');
    expect(reportStatusMeta('resolved').label).toBe('Đã xử lý');
    expect(reportStatusMeta('dismissed').label).toBe('Đã bỏ qua');
  });

  it('falls back to pending meta for an unknown status', () => {
    expect(reportStatusMeta('weird' as never)).toEqual(reportStatusMeta('pending'));
  });
});

describe('moderationSuccessMessage', () => {
  it('includes the action label and post id', () => {
    expect(moderationSuccessMessage('hide', 'post_0000000000000007')).toBe('Đã ẩn bài viết #post_0000000000000007.');
    expect(moderationSuccessMessage('delete', 'post_0000000000000012')).toBe('Đã xoá vĩnh viễn bài viết #post_0000000000000012.');
  });
});

describe('moderationErrorMessage', () => {
  it('404 → post already gone', () => {
    // IDLEAK-01 (2026-08-13): social 404s no longer put an id in the text —
    // it is `"Post not found"` now, not `"Post 7 not found"`.
    expect(moderationErrorMessage({ statusCode: 404, status: 404, message: 'Post not found' }, 'hide'))
      .toContain('không còn tồn tại');
  });

  it('403 → no permission', () => {
    expect(moderationErrorMessage({ statusCode: 403, status: 403, message: 'Forbidden' }, 'delete'))
      .toContain('không có quyền');
  });

  it('other error with server message → passes it through', () => {
    expect(moderationErrorMessage({ statusCode: 500, status: 500, message: 'boom' }, 'dismiss')).toBe('boom');
  });

  it('unknown error → per-action generic fallback', () => {
    expect(moderationErrorMessage(undefined, 'unhide')).toBe('Không thể hiện lại bài viết. Vui lòng thử lại.');
    expect(moderationErrorMessage({}, 'delete')).toBe('Không thể xoá bài viết. Vui lòng thử lại.');
  });
});
