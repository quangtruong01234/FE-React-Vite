import { describe, expect, it } from 'vitest';
import {
  bindTranslator,
  defineMessages,
  interpolate,
  isMessageKey,
  plural,
  translate,
  translateIfKey,
} from './messages';

const book = defineMessages({
  vi: {
    hello: 'Xin chào {name}',
    items: '{count} sản phẩm',
    plain: 'Đóng',
  },
  en: {
    hello: 'Hello {name}',
    items: ({ count }) => `${count} ${plural(Number(count), 'item', 'items')}`,
    plain: 'Close',
  },
});

describe('interpolate', () => {
  it('fills every placeholder, numbers included', () => {
    expect(interpolate('{a} + {b} = {a}{b}', { a: 1, b: 'x' })).toBe('1 + x = 1x');
  });

  it('leaves an unknown placeholder visible instead of printing "undefined"', () => {
    expect(interpolate('Hi {name}')).toBe('Hi {name}');
  });

  it('only reads own keys', () => {
    expect(interpolate('{toString}', {})).toBe('{toString}');
  });
});

describe('translate', () => {
  it('picks the book of the requested language', () => {
    expect(translate(book, 'vi', 'plain')).toBe('Đóng');
    expect(translate(book, 'en', 'plain')).toBe('Close');
  });

  it('interpolates string messages and calls function messages', () => {
    expect(translate(book, 'vi', 'hello', { name: 'An' })).toBe('Xin chào An');
    expect(translate(book, 'vi', 'items', { count: 2 })).toBe('2 sản phẩm');
    expect(translate(book, 'en', 'items', { count: 1 })).toBe('1 item');
    expect(translate(book, 'en', 'items', { count: 3 })).toBe('3 items');
  });
});

describe('bindTranslator', () => {
  it('returns a translator fixed to one language', () => {
    const t = bindTranslator(book, 'en');
    expect(t('hello', { name: 'An' })).toBe('Hello An');
  });
});

describe('defineMessages', () => {
  it('rejects an English book that is missing a key (compile-time)', () => {
    defineMessages({
      vi: { a: 'A', b: 'B' },
      // @ts-expect-error — `b` has no English translation
      en: { a: 'A' },
    });
    expect(true).toBe(true);
  });
});

describe('isMessageKey', () => {
  it('recognises own keys only', () => {
    expect(isMessageKey(book, 'plain')).toBe(true);
    expect(isMessageKey(book, 'Đóng')).toBe(false);
    expect(isMessageKey(book, 'toString')).toBe(false);
  });
});

describe('translateIfKey', () => {
  it('translates a key and passes raw server text through', () => {
    expect(translateIfKey(book, 'en', 'plain')).toBe('Close');
    expect(translateIfKey(book, 'en', 'Tên đăng nhập đã tồn tại')).toBe('Tên đăng nhập đã tồn tại');
    expect(translateIfKey(book, 'en', undefined)).toBeUndefined();
  });
});
