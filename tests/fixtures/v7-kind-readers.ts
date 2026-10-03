import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * The Mind Control revision (docs/product/RULESET_7_MIND_CONTROL.md section
 * 2.2): every raw faction read in `src/engine`, `src/ai`, `src/render`, and
 * `src/headless`, keyed by file and enclosing function, for the kind-reader
 * classification test. A raw read is a call of `playerFactionV7`,
 * `effectiveRoleRuleV7`, `roleMechanicsV7`, or `technologyCapabilitiesV7`,
 * or a `.faction` property read. A mind-controlled unit's kind is not its
 * owner's faction, so each such read must say whether it means the unit's
 * kind (`KIND`: resolved through `unitFactionV7` or `unitCapabilitiesV7`)
 * or the seat's own faction (`SEAT`).
 */
export interface KindReaderV7 {
  /** `src/...` path with forward slashes. */
  readonly file: string;
  /** The nearest enclosing named function, method, or `<module>`. */
  readonly scope: string;
  /** The callee name, or `.faction`. */
  readonly read: string;
  readonly line: number;
}

export const KIND_READER_CALLS_V7 = Object.freeze([
  "playerFactionV7",
  "effectiveRoleRuleV7",
  "roleMechanicsV7",
  "technologyCapabilitiesV7",
] as const);

/** The directories the audit covers. */
export const KIND_READER_ROOTS_V7 = Object.freeze([
  "src/engine",
  "src/ai",
  "src/render",
  "src/headless",
] as const);

export function kindReadersV7(root: string): readonly KindReaderV7[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".ts")) files.push(path);
    }
  };
  for (const directory of KIND_READER_ROOTS_V7) walk(join(root, directory));
  const readers: KindReaderV7[] = [];
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    const source = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const file = relative(root, path).split("\\").join("/");
    const line = (node: ts.Node): number =>
      source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (KIND_READER_CALLS_V7 as readonly string[]).includes(
          node.expression.text,
        )
      )
        readers.push({
          file,
          scope: enclosingScope(node),
          read: node.expression.text,
          line: line(node),
        });
      if (ts.isPropertyAccessExpression(node) && node.name.text === "faction")
        readers.push({
          file,
          scope: enclosingScope(node),
          read: ".faction",
          line: line(node),
        });
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return readers;
}

/** The source text of `file::scope` (a function, method, or variable). */
export function kindReaderScopeTextV7(
  root: string,
  file: string,
  scope: string,
): string {
  const text = readFileSync(join(root, file), "utf8");
  if (scope === "<module>") return text;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const [owner, member] = scope.includes(".")
    ? (scope.split(".") as [string, string])
    : [null, scope];
  let found: string | null = null;
  const visit = (node: ts.Node): void => {
    if (found !== null) return;
    if (
      owner === null &&
      ts.isFunctionDeclaration(node) &&
      node.name?.text === member
    )
      found = node.getText(source);
    else if (
      owner === null &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === member
    )
      found = node.getText(source);
    else if (
      owner !== null &&
      ts.isClassDeclaration(node) &&
      node.name?.text === owner
    )
      for (const element of node.members)
        if (
          (member === "constructor" && ts.isConstructorDeclaration(element)) ||
          (element.name !== undefined &&
            (ts.isIdentifier(element.name) ||
              ts.isPrivateIdentifier(element.name)) &&
            element.name.text === member)
        )
          found = element.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (found === null) throw new Error(`${file}::${scope} not found`);
  return found;
}

function enclosingScope(node: ts.Node): string {
  for (
    let current = node.parent;
    current !== undefined;
    current = current.parent
  ) {
    if (ts.isFunctionDeclaration(current) && current.name !== undefined)
      return current.name.text;
    if (
      (ts.isMethodDeclaration(current) ||
        ts.isGetAccessorDeclaration(current) ||
        ts.isSetAccessorDeclaration(current) ||
        ts.isPropertyDeclaration(current)) &&
      (ts.isIdentifier(current.name) || ts.isPrivateIdentifier(current.name))
    ) {
      const owner = current.parent;
      const className =
        ts.isClassDeclaration(owner) && owner.name !== undefined
          ? `${owner.name.text}.`
          : "";
      return `${className}${current.name.text}`;
    }
    if (ts.isConstructorDeclaration(current)) {
      const owner = current.parent;
      return ts.isClassDeclaration(owner) && owner.name !== undefined
        ? `${owner.name.text}.constructor`
        : "constructor";
    }
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name) &&
      isTopLevelVariable(current.parent)
    )
      return current.parent.name.text;
  }
  return "<module>";
}

function isTopLevelVariable(declaration: ts.VariableDeclaration): boolean {
  const statement = declaration.parent.parent;
  return ts.isVariableStatement(statement) && ts.isSourceFile(statement.parent);
}
