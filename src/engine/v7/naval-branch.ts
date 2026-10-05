import { boardableAtV7 } from "../rules/ruleset-v7";
import type { CoordV7, UnitFormV7 } from "./types";

/**
 * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.2): the
 * per-target reasons a `BOARD` is refused with `BOARD_NOT_LEGAL` (rows 7 to
 * 9); `NOT_A_SHIP` is the actor's (row 2).
 */
export type BoardTargetBlockV7 =
  "TARGET_IMMUNE" | "OUT_OF_RANGE" | "TARGET_HEALTHY";

/** The unit facts the Board target rule reads (state and public units). */
export interface BoardUnitFactsV7 {
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
  readonly maxHp: number;
}

/**
 * The naval branch (section 4.2, rows 7 to 9), shared by the `BOARD` command
 * and the public command query: the target must be in `NAVAL` form (a
 * transport, a self-launched machine, or a land unit is never boarded),
 * within Chebyshev distance 1 of the boarder, and at or below its boarding
 * line (`boardableAtV7`). Returns the first failing reason, or null.
 */
export function boardTargetBlockV7(
  boarder: Pick<BoardUnitFactsV7, "at">,
  target: BoardUnitFactsV7,
): BoardTargetBlockV7 | null {
  if (target.form !== "NAVAL") return "TARGET_IMMUNE";
  if (
    Math.max(
      Math.abs(boarder.at.x - target.at.x),
      Math.abs(boarder.at.y - target.at.y),
    ) > 1
  )
    return "OUT_OF_RANGE";
  if (target.hp > boardableAtV7(target.maxHp)) return "TARGET_HEALTHY";
  return null;
}
