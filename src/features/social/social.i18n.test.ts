import { describe, it, expect } from 'vitest';
import { translate, translateIfKey, type MessageKey, type MessageVars } from '@/lib/i18n/messages';
import { socialMessages } from './social.i18n';
import { createPostSchema } from './social.schema';

const en = (key: MessageKey<typeof socialMessages>, vars?: MessageVars): string =>
  translate(socialMessages, 'en', key, vars);

describe('socialMessages in English (I18N-05)', () => {
  it('pluralises the comment count from the raw number, not the formatted one', () => {
    expect(en('commentCount', { count: '1', n: 1 })).toBe('1 comment');
    expect(en('commentCount', { count: '1,200', n: 1200 })).toBe('1,200 comments');
  });

  it('words the reply toggle for one reply and for many', () => {
    expect(en('showReplies', { count: 1 })).toBe('View 1 reply');
    expect(en('showReplies', { count: 3 })).toBe('View all 3 replies');
  });

  it('keeps Vietnamese as the default copy', () => {
    expect(translate(socialMessages, 'vi', 'commentCount', { count: '3', n: 3 })).toBe('3 bình luận');
    expect(translate(socialMessages, 'vi', 'showReplies', { count: 3 })).toBe('Xem tất cả 3 phản hồi');
  });
});

describe('createPostSchema', () => {
  it('stores the empty-content error as a key the form translates at render', () => {
    const result = createPostSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
    const message = result.success ? undefined : result.error.issues[0]?.message;
    expect(translateIfKey(socialMessages, 'vi', message)).toBe('Nội dung không được để trống');
    expect(translateIfKey(socialMessages, 'en', message)).toBe('Content cannot be empty');
  });
});
