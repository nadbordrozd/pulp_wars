import type { MissionDefinitionV7 } from "./types";

/**
 * The shape check of a mission's AI directives (docs/product/CAMPAIGN.md
 * sections 2.5 and 10.4; strict since `pulp_wars-hmyk.14`). The engine never
 * reads a directive, but a malformed one must not be ignored in silence (a
 * `GUARD` written with `others: "RUSH"` played as plain `NORMAL`), so the
 * builder refuses it like any other definition fault
 * (`validateMissionDefinitionV7`), and the AI's `validateMissionDirectivesV7`
 * reports the same problem.
 *
 * Returns the first problem, as `seat N: ...`, or null. The rules: only AI
 * seats carry a directive; a schedule is a non-empty list; every entry is an
 * object of a known kind (`NORMAL`, `RUSH`, `HOLD`, `GUARD`, `ASSAULT`) with
 * no key that kind does not take; `fromRound` and `untilRound` are integers
 * of at least 2, `fromRound` below `untilRound`; a zone is a non-empty list
 * of rectangles on the board; a `GUARD` garrison is a positive integer and
 * its `others` is absent, `{ kind: "RUSH" }` or `{ kind: "ASSAULT", target }`;
 * a target is a tile on the board.
 */
export function missionDirectiveProblemV7(
  mission: MissionDefinitionV7,
): string | null {
  for (const [index, seat] of mission.seats.entries()) {
    const raw: unknown = seat.directive;
    if (raw === undefined) continue;
    const where = `seat ${String(index)}`;
    if (index === 0) return `${where}: the human seat takes no directive`;
    const entries: readonly unknown[] = Array.isArray(raw) ? raw : [raw];
    if (entries.length === 0)
      return `${where}: the directive schedule is empty`;
    for (const entry of entries) {
      const problem = directiveProblem(mission.size, entry);
      if (problem !== null) return `${where}: ${problem}`;
    }
  }
  return null;
}

const KEYS_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  NORMAL: [],
  RUSH: [],
  HOLD: ["zone"],
  GUARD: ["zone", "garrison", "others"],
  ASSAULT: ["target"],
};
const WINDOW_KEYS = ["kind", "fromRound", "untilRound"];

function directiveProblem(size: number, entry: unknown): string | null {
  if (!isRecord(entry)) return `a directive is not an object (${show(entry)})`;
  const kind = entry.kind;
  const keys =
    typeof kind === "string" && Object.hasOwn(KEYS_BY_KIND, kind)
      ? KEYS_BY_KIND[kind]
      : undefined;
  if (keys === undefined) return `the directive kind ${show(kind)} is unknown`;
  for (const key of Object.keys(entry))
    if (!WINDOW_KEYS.includes(key) && !keys.includes(key))
      return `the ${kind} directive takes no key ${show(key)}`;
  const untilRound = entry.untilRound;
  if (untilRound !== undefined && !roundNumber(untilRound))
    return "untilRound must be an integer >= 2";
  const fromRound = entry.fromRound;
  if (
    fromRound !== undefined &&
    (!roundNumber(fromRound) ||
      (untilRound !== undefined && fromRound >= (untilRound as number)))
  )
    return "fromRound must be an integer >= 2 and below untilRound";
  if (kind === "ASSAULT")
    return onBoard(size, entry.target)
      ? null
      : `the assault target ${show(entry.target)} is off the board`;
  if (kind !== "HOLD" && kind !== "GUARD") return null;
  if (kind === "GUARD") {
    const others = entry.others;
    if (others !== undefined) {
      const shaped =
        isRecord(others) &&
        ((others.kind === "RUSH" && sameKeys(others, ["kind"])) ||
          (others.kind === "ASSAULT" && sameKeys(others, ["kind", "target"])));
      if (!shaped)
        return `GUARD others must be { kind: "RUSH" } or { kind: "ASSAULT", target }, not ${show(others)}`;
      if (others.kind === "ASSAULT" && !onBoard(size, others.target))
        return `the assault target ${show(others.target)} is off the board`;
    }
  }
  const zone = entry.zone;
  if (!Array.isArray(zone)) return `the ${kind} zone is not a list`;
  if (zone.length === 0) return "the zone is empty";
  for (const rect of zone as readonly unknown[])
    if (
      !isRecord(rect) ||
      !sameKeys(rect, ["x0", "y0", "x1", "y1"]) ||
      ![rect.x0, rect.y0, rect.x1, rect.y1].every(Number.isSafeInteger) ||
      (rect.x0 as number) < 0 ||
      (rect.y0 as number) < 0 ||
      (rect.x1 as number) >= size ||
      (rect.y1 as number) >= size ||
      (rect.x0 as number) > (rect.x1 as number) ||
      (rect.y0 as number) > (rect.y1 as number)
    )
      return `a zone rectangle ${show(rect)} is off the board`;
  if (
    kind === "GUARD" &&
    (!Number.isSafeInteger(entry.garrison) || (entry.garrison as number) < 1)
  )
    return "the garrison must be a positive integer";
  return null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && own.every((key) => keys.includes(key));
}

function roundNumber(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 2;
}

function onBoard(size: number, value: unknown): boolean {
  return (
    isRecord(value) &&
    sameKeys(value, ["x", "y"]) &&
    Number.isSafeInteger(value.x) &&
    Number.isSafeInteger(value.y) &&
    (value.x as number) >= 0 &&
    (value.y as number) >= 0 &&
    (value.x as number) < size &&
    (value.y as number) < size
  );
}

function show(value: unknown): string {
  return value === undefined ? "undefined" : JSON.stringify(value);
}
