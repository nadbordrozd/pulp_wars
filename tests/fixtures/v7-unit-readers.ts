import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 5.2): every
 * read of a unit list (`<expression>.units`) in `src`, keyed by file and
 * enclosing function, for the reader-classification test. A burrowed unit
 * leaves `units` for the `burrowed` list, so every reader must say whether
 * it means the board (`BOARD`) or everything a player owns (`ALL`).
 */
export interface UnitListReaderV7 {
  /** `src/...` path with forward slashes. */
  readonly file: string;
  /** The nearest enclosing named function, method, or `<module>`. */
  readonly scope: string;
  /** The receiver expression text (`state`, `view`, `before`, ...). */
  readonly receiver: string;
  readonly line: number;
}

export function unitListReadersV7(root: string): readonly UnitListReaderV7[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".ts")) files.push(path);
    }
  };
  walk(join(root, "src"));
  const readers: UnitListReaderV7[] = [];
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    const source = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const file = relative(root, path).split("\\").join("/");
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node) && node.name.text === "units")
        readers.push({
          file,
          scope: enclosingScope(node),
          receiver: node.expression.getText(source),
          line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        });
      // `const { units } = state` reads the list too.
      if (
        ts.isBindingElement(node) &&
        ts.isObjectBindingPattern(node.parent) &&
        (node.propertyName ?? node.name).getText(source) === "units"
      )
        readers.push({
          file,
          scope: enclosingScope(node),
          receiver: "{ units }",
          line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        });
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return readers;
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
        ts.isSetAccessorDeclaration(current)) &&
      ts.isIdentifier(current.name)
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
