import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';

export const RICH_TEXT_MAX_CHARS = 5000;

/**
 * The editor schema, shared with its contract test. The backend sanitizes
 * `description` on write against an allow-list built from exactly this set
 * (XSS-DESC-01) — an extension that emits a tag or attribute outside it (e.g.
 * TextAlign's `style=`) is silently stripped on save. `richTextExtensions.test.ts`
 * fails first; update the backend allow-list before adding one.
 */
export const RICH_TEXT_EXTENSIONS = [
  StarterKit,
  Image.configure({ inline: false }),
  CharacterCount.configure({ limit: RICH_TEXT_MAX_CHARS }),
];
