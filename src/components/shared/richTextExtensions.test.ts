import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { RICH_TEXT_EXTENSIONS } from './richTextExtensions';

// XSS-DESC-01: the backend rebuilds `description` on write from an allow-list
// (`api/libs/common/src/utils/rich-text-html.util.ts`). Anything the editor emits
// outside it is dropped on save — silently, from the seller's point of view.
const BACKEND_ALLOWED: Record<string, readonly string[]> = {
  p: [], br: [], strong: [], b: [], em: [], i: [], u: [], s: [],
  h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
  ul: [], ol: ['start'], li: [], blockquote: [], code: ['class'], pre: [], hr: [],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
};

// One of everything the schema can hold, in the markup tiptap itself parses.
const EVERY_FEATURE = [
  '<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4><h5>e</h5><h6>f</h6>',
  '<p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code> x<br>y</p>',
  '<p><a href="https://example.com" target="_blank">link</a></p>',
  '<ul><li><p>a</p></li></ul><ol start="3"><li><p>b</p></li></ol>',
  '<blockquote><p>q</p></blockquote>',
  '<pre><code class="language-js">let a = 1</code></pre>',
  '<hr>',
  '<img src="https://res.cloudinary.com/demo/image/upload/w_1000/sample.jpg" alt="a" title="t">',
].join('');

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function outsideAllowList(html: string): string[] {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const problems: string[] = [];
  for (const el of Array.from(body.querySelectorAll('*'))) {
    const tag = el.tagName.toLowerCase();
    const attrs = BACKEND_ALLOWED[tag];
    if (!attrs) {
      problems.push(`<${tag}>`);
      continue;
    }
    for (const { name } of Array.from(el.attributes)) {
      if (!attrs.includes(name)) problems.push(`<${tag} ${name}>`);
    }
  }
  return problems;
}

describe('rich-text editor output vs the backend allow-list (XSS-DESC-01)', () => {
  it('emits only tags and attributes the backend keeps', () => {
    editor = new Editor({ extensions: RICH_TEXT_EXTENSIONS, content: EVERY_FEATURE });

    const html = editor.getHTML();

    expect(outsideAllowList(html)).toEqual([]);
    // Guard the guard: the sample really exercised the risky nodes.
    expect(html).toContain('<a ');
    expect(html).toContain('<img ');
    expect(html).toContain('class="language-js"');
  });

  it('holds exactly the nodes and marks the allow-list was written for', () => {
    editor = new Editor({ extensions: RICH_TEXT_EXTENSIONS });

    // A new extension lands here first. Extend the backend allow-list before
    // adding it, or its markup is stripped on save.
    expect(Object.keys(editor.schema.nodes).sort()).toEqual([
      'blockquote', 'bulletList', 'codeBlock', 'doc', 'hardBreak', 'heading',
      'horizontalRule', 'image', 'listItem', 'orderedList', 'paragraph', 'text',
    ]);
    expect(Object.keys(editor.schema.marks).sort()).toEqual([
      'bold', 'code', 'italic', 'link', 'strike', 'underline',
    ]);
  });
});
