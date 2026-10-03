import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { kindReaderScopeTextV7 } from "./v7-kind-readers";

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 10.5):
 * every place in the Ruleset 7 engine, the Normal AI, and the headless runner
 * that resolves a PLAYER record or a seat's faction from an owner ID, keyed
 * by file and enclosing function, for the owner-reader classification test.
 * The Giant Spider is a unit whose owner (`NEUTRAL_OWNER_ID_V7`) is no
 * player, so each such lookup must say whether it handles the neutral owner
 * (`NEUTRAL_AWARE`) or is only ever reached with a seat's ID
 * (`PLAYER_ONLY`).
 *
 * A read is:
 *
 * - a call of `requirePlayer` (each module's local one), `playerFactionV7`,
 *   `seatRoleRuleV7`, or `seatRoleMechanicsV7` (they throw for an ID that
 *   is not a seat);
 * - a `find`, `findIndex`, `some`, `every`, or `filter` call on a `players`
 *   list (`state.players`, `view.players`, `players`, ...) whose callback
 *   reads an owner (`ownerId`, `owner`, `Owner`);
 * - a `get` or `has` call on a player map (a receiver named `player...`)
 *   whose argument reads an owner;
 * - an ad hoc Cooperative alliance test (the `"COOPERATIVE"` literal
 *   compared with `aiMode`), which must keep the neutral owner hostile.
 *
 * The neutral-aware kind and rule resolvers (`unitFactionV7`,
 * `unitRoleRuleV7`, `unitRoleMechanicsV7`, `unitCapabilitiesV7`, and the
 * relationship helpers `arePlayersAlliedV7` and `arePlayersHostileV7`)
 * resolve the neutral registration themselves, so their call sites are not
 * listed; their own neutral handling is pinned by unit tests.
 */
export interface OwnerReaderV7 {
  /** `src/...` path with forward slashes. */
  readonly file: string;
  /** The nearest enclosing named function, method, or `<module>`. */
  readonly scope: string;
  /** The callee name, `players.<method>`, `<map>.get`, or `COOPERATIVE`. */
  readonly read: string;
  readonly line: number;
}

export const OWNER_READER_CALLS_V7 = Object.freeze([
  "requirePlayer",
  "playerFactionV7",
  "seatRoleRuleV7",
  "seatRoleMechanicsV7",
] as const);

/** The directories and files the audit covers (Ruleset 7 code only). */
export const OWNER_READER_ROOTS_V7 = Object.freeze([
  "src/engine/v7",
  "src/engine/rules/ruleset-v7.ts",
  "src/ai",
  "src/headless",
] as const);

/** Files under the roots that are Ruleset 5 or 6 code (never a v7 owner). */
const LEGACY_FILE = /(^|\/)(v5|v6)[^/]*\.ts$|\/v6\/|\/index\.ts$|cli\.ts$/;

const OWNER_TEXT = /ownerId|[oO]wner/;
const PLAYER_LIST_METHODS = new Set([
  "find",
  "findIndex",
  "some",
  "every",
  "filter",
]);

export function ownerReadersV7(root: string): readonly OwnerReaderV7[] {
  const files: string[] = [];
  const walk = (path: string): void => {
    if (statSync(path).isDirectory()) {
      for (const name of readdirSync(path).sort()) walk(join(path, name));
    } else if (path.endsWith(".ts")) files.push(path);
  };
  for (const entry of OWNER_READER_ROOTS_V7) walk(join(root, entry));
  const readers: OwnerReaderV7[] = [];
  for (const path of files) {
    const file = relative(root, path).split("\\").join("/");
    if (file.startsWith("src/ai/") || file.startsWith("src/headless/")) {
      if (LEGACY_FILE.test(file) || !/v7/.test(file)) continue;
    }
    const text = readFileSync(path, "utf8");
    const source = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const line = (node: ts.Node): number =>
      source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const push = (node: ts.Node, read: string): void => {
      readers.push({
        file,
        scope: enclosingScope(node),
        read,
        line: line(node),
      });
    };
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        if (
          ts.isIdentifier(callee) &&
          (OWNER_READER_CALLS_V7 as readonly string[]).includes(callee.text)
        )
          push(node, callee.text);
        if (ts.isPropertyAccessExpression(callee)) {
          const method = callee.name.text;
          const receiver = callee.expression.getText(source);
          const argument = node.arguments
            .map((item) => item.getText(source))
            .join(",");
          if (
            PLAYER_LIST_METHODS.has(method) &&
            /(^|\.)players$/.test(receiver) &&
            OWNER_TEXT.test(argument)
          )
            push(node, `players.${method}`);
          if (
            (method === "get" || method === "has") &&
            /(^|\.)player[A-Za-z]*$/.test(receiver) &&
            OWNER_TEXT.test(argument)
          )
            push(node, `${receiver.split(".").at(-1) ?? receiver}.${method}`);
        }
      }
      if (
        ts.isStringLiteral(node) &&
        node.text === "COOPERATIVE" &&
        ts.isBinaryExpression(node.parent) &&
        (node.parent.operatorToken.kind ===
          ts.SyntaxKind.EqualsEqualsEqualsToken ||
          node.parent.operatorToken.kind ===
            ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
        /aiMode/.test(node.parent.getText(source))
      )
        push(node, "COOPERATIVE");
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return readers;
}

/** The source text of `file::scope` (the kind-reader helper). */
export function ownerReaderScopeTextV7(
  root: string,
  file: string,
  scope: string,
): string {
  return kindReaderScopeTextV7(root, file, scope);
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
