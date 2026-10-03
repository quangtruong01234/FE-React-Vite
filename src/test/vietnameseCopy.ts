import ts from 'typescript';

/**
 * I18N-07 — a Vietnamese letter: a vowel carrying a Vietnamese tone or shape mark, or `đ`.
 * Picked letter by letter rather than as a Latin-1 range so `×` (U+00D7) and `÷` do not count.
 */
const VIETNAMESE_LETTER =
  /[À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/;

export function hasVietnamese(text: string): boolean {
  return VIETNAMESE_LETTER.test(text);
}

function isInsideDefineMessages(node: ts.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isCallExpression(parent) &&
      ts.isIdentifier(parent.expression) &&
      parent.expression.text === 'defineMessages'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Vietnamese copy written straight into a `.ts`/`.tsx` file — string literals, template
 * text and JSX text — as `line: text`. Comments and regex literals are not copy, so they
 * never count; neither does anything inside a `defineMessages({ vi, en })` book, which is
 * where Vietnamese copy belongs (I18N-01..07).
 */
export function findVietnameseLiterals(source: string, fileName: string): string[] {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const hits: string[] = [];

  const visit = (node: ts.Node): void => {
    const text =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
        ? node.text
        : null;
    if (text != null && hasVietnamese(text) && !isInsideDefineMessages(node)) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      hits.push(`${line + 1}: ${text.trim()}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return hits;
}
