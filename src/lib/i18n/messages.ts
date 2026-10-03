import type { Lang } from './lang';

/**
 * I18N-01 — message books. Each feature keeps its own book next to the code that uses it
 * (`<name>.i18n.ts`), so a lazy route's copy ships in that route's chunk instead of the entry.
 *
 * A message is a string with `{name}` placeholders, or a function for anything a placeholder
 * cannot say (English plurals, a clause that depends on a value).
 */

export type MessageVars = Record<string, string | number>;
export type Message = string | ((vars: MessageVars) => string);

export interface MessageBook<K extends string> {
  vi: Record<K, Message>;
  en: Record<K, Message>;
}

export type Translator<K extends string> = (key: K, vars?: MessageVars) => string;

/** The key union of a book — for config tables that store keys instead of copy. */
export type MessageKey<B> = B extends MessageBook<infer K> ? K : never;

/**
 * `vi` is the source of truth; `en` must carry exactly the same keys, so a missing or stray
 * translation is a type error at build time rather than a blank label at runtime.
 */
export function defineMessages<const V extends Record<string, Message>>(book: {
  vi: V;
  en: Record<keyof V, Message>;
}): MessageBook<Extract<keyof V, string>> {
  return book;
}

/** `{name}` → `vars.name`. An unknown placeholder is left as written so it shows up in review. */
export function interpolate(template: string, vars: MessageVars = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

export function translate<K extends string>(
  book: MessageBook<K>,
  lang: Lang,
  key: K,
  vars?: MessageVars,
): string {
  const message = book[lang][key];
  return typeof message === 'function' ? message(vars ?? {}) : interpolate(message, vars);
}

/** A translator bound to one language — what `useT` hands to components, and what pure helpers take. */
export function bindTranslator<K extends string>(book: MessageBook<K>, lang: Lang): Translator<K> {
  return (key, vars) => translate(book, lang, key, vars);
}

/** English "1 item" / "2 items"; Vietnamese has no plural form, so its books just use a string. */
export function plural(count: number, one: string, other: string): string {
  return count === 1 ? one : other;
}

/** Whether `text` is a key of `book` (own keys only — `toString` is not a message). */
export function isMessageKey<K extends string>(book: MessageBook<K>, text: string): text is K {
  return Object.prototype.hasOwnProperty.call(book.vi, text);
}

/**
 * Form error slots hold either a book key (a zod message, so it follows a language switch) or
 * raw text a server reply put there via `setError` — translate the first, pass the second through.
 */
export function translateIfKey<K extends string>(
  book: MessageBook<K>,
  lang: Lang,
  text: string | undefined,
): string | undefined {
  if (text === undefined) return undefined;
  return isMessageKey(book, text) ? translate(book, lang, text) : text;
}
