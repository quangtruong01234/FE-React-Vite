import { describe, expect, it } from 'vitest';
import { findIconViolations } from './lucideIcons';

describe('findIconViolations', () => {
  it('flags a Lucide icon without shrink-0, single- or multi-line', () => {
    const source = [
      "import { Send, X as Close } from 'lucide-react';",
      'const a = <Send size={16} />;',
      'const b = (',
      '  <Close',
      '    size={12}',
      "    className='text-ink-muted'",
      '  />',
      ');',
    ].join('\n');
    expect(findIconViolations(source, 'x.tsx')).toEqual([
      '2: Send — missing shrink-0',
      '4: Close — missing shrink-0',
    ]);
  });

  it('accepts shrink-0 in a static or a cn() className', () => {
    const source = [
      "import { Send, Check } from 'lucide-react';",
      'const a = <Send size={16} className="shrink-0" />;',
      "const b = <Check size={16} className={cn('shrink-0', done && 'text-accent-green')} />;",
    ].join('\n');
    expect(findIconViolations(source, 'x.tsx')).toEqual([]);
  });

  it('flags a string size', () => {
    const source = [
      "import { Send } from 'lucide-react';",
      'const a = <Send size="16" className="shrink-0" />;',
    ].join('\n');
    expect(findIconViolations(source, 'x.tsx')).toEqual(['2: Send — size must be a number']);
  });

  it('flags an icon-only raw <button> without an accessible name', () => {
    const source = [
      "import { Send, Loader2 } from 'lucide-react';",
      'const a = <button onClick={go}><Send size={16} className="shrink-0" /></button>;',
      'const b = (',
      '  <button>',
      '    {busy ? <Loader2 size={16} className="shrink-0" /> : <Send size={16} className="shrink-0" />}',
      '  </button>',
      ');',
    ].join('\n');
    expect(findIconViolations(source, 'x.tsx')).toEqual([
      '2: <button> — icon-only without an accessible name',
      '4: <button> — icon-only without an accessible name',
    ]);
  });

  it('accepts a named icon button and a button with visible text', () => {
    const source = [
      "import { Send } from 'lucide-react';",
      'const a = <button aria-label={t("send")}><Send size={16} className="shrink-0" /></button>;',
      'const b = <button title="Send"><Send size={16} className="shrink-0" /></button>;',
      'const c = <button><Send size={16} className="shrink-0" /> {t("send")}</button>;',
      'const d = <button><Send size={16} className="shrink-0" /> Send</button>;',
    ].join('\n');
    expect(findIconViolations(source, 'x.tsx')).toEqual([]);
  });

  it('ignores type imports, non-Lucide components and files without Lucide', () => {
    const source = [
      "import type { LucideIcon } from 'lucide-react';",
      "import { Avatar } from '@/components/shared/Avatar';",
      'const a = <Avatar size={40} />;',
    ].join('\n');
    expect(findIconViolations(source, 'x.tsx')).toEqual([]);
  });
});

describe('every Lucide icon in src/ has shrink-0 and a numeric size, every icon-only button a name (ICON-SHRINK-01, A11Y-NAME-01)', () => {
  const sources = import.meta.glob<string>(['../**/*.tsx', '!../**/*.test.tsx', '!../components/ui/**'], {
    eager: true,
    query: '?raw',
    import: 'default',
  });

  it('finds no violation', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
    const hits = Object.entries(sources).flatMap(([path, source]) =>
      findIconViolations(source, path).map((hit) => `${path.replace('../', 'src/')}:${hit}`),
    );
    expect(hits).toEqual([]);
  });
});
