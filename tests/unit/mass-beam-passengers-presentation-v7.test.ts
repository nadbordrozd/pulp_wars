import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewBeamDownV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import type { BoardRenderPlanEntryV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  addMartianPickEntriesV7,
  martianPickTargetsV7,
  type MartianPickV7,
} from "../../src/render/canvas/martian-board-plan-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  BEAMING_BADGE_V7,
  BEAM_BADGE_V7,
  MOTHERSHIP_BEAMS_SPENT_V7,
  MOTHERSHIP_BEAM_NO_PASSENGER_V7,
  beamDownUnavailableTextV7,
  mothershipBeamLabelV7,
  mothershipBeamsLeftV7,
} from "../../src/render/martian-presentation-v7";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  martianFieldV7,
  offeredV7,
  playV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import { activeIdV7, at } from "../fixtures/v7-revision20";

// The Mothership's passengers on the board. `pulp_wars-8vmy` picked a Mass
// Beam Down's set of passengers there; since `pulp_wars-eg3k` (7r146) the
// Mothership beams one unit at a time, three times a turn, with the
// Saucer's flow: a passenger on the board, then its landing tile on the
// board. The field (tests/fixtures/v7-martian.ts): 11 x 11, seat 0
// (Martian). The Mothership at (2, 2), three Grunts beside it, a Ray Gunner
// two tiles south and a Grunt that has attacked two tiles east.

const own = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });

const MOTHERSHIP = at(2, 2);
const GRUNTS = [at(1, 1), at(2, 1), at(3, 1)] as const;
const GUNNER = at(2, 4);
const ACTED = at(4, 2);

const field = (): GameStateV7 =>
  martianFieldV7([
    own("KNIGHT", MOTHERSHIP.x, MOTHERSHIP.y),
    ...GRUNTS.map((where) => own("FIGHTER", where.x, where.y)),
    own("MARKSMAN", GUNNER.x, GUNNER.y),
    own("FIGHTER", ACTED.x, ACTED.y, {
      activation: { attacked: true, attacksUsed: 1, handled: true },
    }),
  ]);

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;
const distance = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

function pickOf(
  state: GameStateV7,
  passenger: CoordV7 | null = null,
): Extract<MartianPickV7, { kind: "BEAM_DOWN" }> {
  return {
    kind: "BEAM_DOWN",
    unitId: idAt(state, MOTHERSHIP),
    passengerUnitId: passenger === null ? null : idAt(state, passenger),
  };
}

describe("the Mothership's passengers picked on the board", () => {
  it("rings every unit it may take, the one that acted too, with the Beam badge", () => {
    const state = field();
    const view = activeViewV7(state);
    const commands = offeredV7(state);
    const pick = pickOf(state);
    const targets = martianPickTargetsV7(view, commands, pick);
    // Every target is a passenger first: no tile yet.
    expect(
      targets.every((target) => target.family === "BEAM_DOWN_PASSENGER"),
    ).toBe(true);
    expect(targets.map((target) => target.at)).toEqual(
      expect.arrayContaining([...GRUNTS, GUNNER, ACTED]),
    );
    expect(targets).toHaveLength(5);
    expect(
      targets.every(
        (target) =>
          targetHighlightStyleV7(target.family, target.highlight) === "SUPPORT",
      ),
    ).toBe(true);
    for (const target of targets) {
      expect(target.previewLabel).toBe(BEAM_BADGE_V7);
      expect(target.semanticLabel).toContain("picked up nearby");
    }
    // The pick-up range is tinted around it.
    const entries: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(entries, view, targets, pick);
    const range = entries.filter((entry) =>
      entry.key.startsWith("ability-area:BEAM_RANGE:"),
    );
    expect(range.length).toBeGreaterThan(0);
    for (const entry of range)
      expect(distance(entry.at, MOTHERSHIP)).toBeLessThanOrEqual(2);
  });

  it("then sets the picked unit down on any free tile within three", () => {
    const state = field();
    const view = activeViewV7(state);
    const commands = offeredV7(state);
    const pick = pickOf(state, GUNNER);
    const targets = martianPickTargetsV7(view, commands, pick);
    expect(targets.length).toBeGreaterThan(8);
    const preview = previewBeamDownV7(
      view,
      idAt(state, MOTHERSHIP),
      idAt(state, GUNNER),
    );
    expect(targets.map((target) => target.at)).toEqual(preview?.destinations);
    for (const target of targets) {
      expect(target.family).toBe("BEAM_DOWN");
      expect(distance(target.at, MOTHERSHIP)).toBeLessThanOrEqual(3);
      expect([...GRUNTS, GUNNER, ACTED, MOTHERSHIP]).not.toContainEqual(
        target.at,
      );
      expect(
        applyCommandV7(state, activeIdV7(state), target.command as CommandV7)
          .accepted,
      ).toBe(true);
    }
    // The picked unit wears "Beaming".
    const entries: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(entries, view, targets, pick);
    expect(
      entries
        .filter((entry) => entry.label === BEAMING_BADGE_V7)
        .map((entry) => entry.at),
    ).toEqual([GUNNER]);
  });

  it("names the beams left, and why none is left", () => {
    let state = field();
    const mothership = idAt(state, MOTHERSHIP);
    expect(mothershipBeamsLeftV7(activeViewV7(state), mothership)).toBe(3);
    expect(mothershipBeamLabelV7(3)).toBe("Beam Down (3 left)");
    for (const [index, [from, to]] of (
      [
        [GRUNTS[0], at(1, 5)],
        [GRUNTS[1], at(2, 5)],
        [GUNNER, at(3, 5)],
      ] as const
    ).entries()) {
      state = playV7(state, {
        kind: "BEAM_DOWN",
        unitId: mothership,
        passengerUnitId: idAt(state, from),
        to,
      }).state;
      expect(mothershipBeamsLeftV7(activeViewV7(state), mothership)).toBe(
        2 - index,
      );
    }
    const view = activeViewV7(state);
    expect(beamDownUnavailableTextV7(view, mothership, false)).toBe(
      MOTHERSHIP_BEAMS_SPENT_V7,
    );
    expect(martianPickTargetsV7(view, offeredV7(state), pickOf(state))).toEqual(
      [],
    );
    // With beams left but nobody within two tiles, it says so.
    const alone = martianFieldV7([own("KNIGHT", 2, 2), own("FIGHTER", 6, 6)]);
    expect(
      beamDownUnavailableTextV7(
        activeViewV7(alone),
        idAt(alone, MOTHERSHIP),
        false,
      ),
    ).toBe(MOTHERSHIP_BEAM_NO_PASSENGER_V7);
  });
});
