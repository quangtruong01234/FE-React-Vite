import ts from 'typescript';

/** Names `lucide-react` exports that are types or helpers, not icons rendered as JSX. */
const NOT_ICONS = new Set(['LucideIcon', 'LucideProps', 'icons', 'createLucideIcon']);

function lucideImports(file: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== 'lucide-react' ||
      statement.importClause?.isTypeOnly
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const imported = (element.propertyName ?? element.name).text;
      if (!element.isTypeOnly && !NOT_ICONS.has(imported)) names.add(element.name.text);
    }
  }
  return names;
}

function attribute(attributes: ts.JsxAttributes, name: string): ts.JsxAttribute | undefined {
  return attributes.properties.find(
    (prop): prop is ts.JsxAttribute =>
      ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name) && prop.name.text === name,
  );
}

function isIconElement(node: ts.Node, icons: Set<string>): boolean {
  return (
    (ts.isJsxSelfClosingElement(node) || ts.isJsxElement(node)) &&
    ts.isIdentifier(ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName) &&
    icons.has((ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName).getText())
  );
}

/** `<Icon />`, `{busy ? <A /> : <B />}`, `{busy && <A />}` — nothing a screen reader can read. */
function isIconOnlyChild(child: ts.JsxChild, icons: Set<string>): boolean {
  if (ts.isJsxText(child)) return child.containsOnlyTriviaWhiteSpaces;
  if (isIconElement(child, icons)) return true;
  if (!ts.isJsxExpression(child) || !child.expression) return false;
  let expr = child.expression;
  while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
  const isIconOrNull = (e: ts.Expression): boolean => {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    return isIconElement(e, icons) || e.kind === ts.SyntaxKind.NullKeyword;
  };
  if (ts.isConditionalExpression(expr)) return isIconOrNull(expr.whenTrue) && isIconOrNull(expr.whenFalse);
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return isIconOrNull(expr.right);
  }
  return false;
}

const ACCESSIBLE_NAME = ['aria-label', 'aria-labelledby', 'title'];

/**
 * ICON-SHRINK-01 — every Lucide icon rendered in a `.tsx` file must carry `shrink-0` in its
 * `className` (a flex row that runs out of room squeezes an icon without it) and, when it
 * sets `size`, a number rather than a string (`styling.md` §Icon container). Reported as
 * `line: Icon — problem`. Only icons imported from `lucide-react` by name count; an icon
 * passed around as a component value (`const Icon = item.icon`) is not seen.
 *
 * A11Y-NAME-01 — a raw `<button>` whose only content is Lucide icons must carry
 * `aria-label` / `aria-labelledby` / `title`, or a screen reader announces just "button".
 * `<IconButton>` already enforces this in its prop type.
 */
export function findIconViolations(source: string, fileName: string): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const icons = lucideImports(file);
  if (icons.size === 0) return [];
  const hits: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(file) === 'button' &&
      node.children.some((child) => !ts.isJsxText(child) || !child.containsOnlyTriviaWhiteSpaces) &&
      node.children.every((child) => isIconOnlyChild(child, icons)) &&
      !ACCESSIBLE_NAME.some((name) => attribute(node.openingElement.attributes, name))
    ) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      hits.push(`${line}: <button> — icon-only without an accessible name`);
    }
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      icons.has(node.tagName.text)
    ) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      const name = node.tagName.text;
      const className = attribute(node.attributes, 'className');
      if (!className?.initializer || !/\bshrink-0\b/.test(className.initializer.getText(file))) {
        hits.push(`${line}: ${name} — missing shrink-0`);
      }
      const size = attribute(node.attributes, 'size');
      if (size?.initializer && ts.isStringLiteral(size.initializer)) {
        hits.push(`${line}: ${name} — size must be a number`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return hits;
}
