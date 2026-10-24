import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewMassBeamDownV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import type { BoardRenderPlanEntryV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  addMartianPickEntriesV7,
  martianPickTargetsV7,
  massBeamSelectionV7,
  type MartianPickV7,
} from "../../src/render/canvas/martian-board-plan-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  BEAMING_BADGE_V7,
  BEAM_BADGE_V7,
  MASS_BEAM_DOWN_FULL_V7,
  massBeamDownCountTextV7,
} from "../../src/render/martian-presentation-v7";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  martianFieldV7,
  offeredV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import { activeIdV7, at } from "../fixtures/v7-revision20";

// `pulp_wars-8vmy`: the passengers of a Mass Beam Down are picked on the
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
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;

function pickOf(
  state: GameStateV7,
  extra: Partial<Extract<MartianPickV7, { kind: "MASS_BEAM_DOWN" }>> = {},
): Extract<MartianPickV7, { kind: "MASS_BEAM_DOWN" }> {
  return {
    kind: "MASS_BEAM_DOWN",
    unitId: idAt(state, MOTHERSHIP),
    chosen: null,
    ...extra,
  };
}

describe("Mass Beam Down passengers picked on the board", () => {
  it("starts with the nearest three fresh units, and rings every unit it may take", () => {
    const state = field();
    const view = activeViewV7(state);
    const commands = offeredV7(state);
    const pick = pickOf(state);
    const selection = massBeamSelectionV7(view, commands, pick);
    expect(selection?.picked).toBe(false);
    expect(selection?.full).toBe(true);
    // The three Grunts beside the Mothership; the Ray Gunner and the Grunt
    // that has acted stand two tiles away.
    expect(selection?.selected).toEqual(
      GRUNTS.map((where) => idAt(state, where)).sort((a, b) => a - b),
    );
    expect(selection?.eligible.map((unit) => unit.at)).toEqual([
      ...GRUNTS,
      GUNNER,
      ACTED,
    ]);
    // Untouched, the tiles are the offered beams.
    expect(selection?.commands).toEqual(offeredV7(state, "MASS_BEAM_DOWN"));
    const targets = martianPickTargetsV7(view, commands, pick);
    const passengers = targets.filter(
      (target) => target.family === "MASS_BEAM_DOWN_PASSENGER",
    );
    expect(passengers.map((target) => target.at)).toEqual([
      ...GRUNTS,
      GUNNER,
      ACTED,
    ]);
    expect(
      passengers.every(
        (target) =>
          targetHighlightStyleV7(target.family, target.highlight) === "SUPPORT",
      ),
    ).toBe(true);
    // No passenger's tile is also a landing target: a tap there toggles.
    expect(
      targets.some(
        (target) =>
          target.family === "MASS_BEAM_DOWN" &&
          passengers.some((passenger) => same(passenger.at, target.at)),
      ),
    ).toBe(false);
    expect(passengers[0]?.semanticLabel).toMatch(
      /^Beaming the Grunt, \d+ of \d+ HP\. Choose again to leave it behind$/,
    );
    // The fourth and fifth say why a tap cannot take them now.
    expect(passengers[4]?.semanticLabel).toContain(", has acted");
    expect(passengers[3]?.semanticLabel).toContain(
      `${MASS_BEAM_DOWN_FULL_V7} units`,
    );
    // The selected ones wear the "Beam" badge.
    const entries: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(entries, view, targets, pick, commands);
    expect(
      entries
        .filter((entry) => entry.label === BEAM_BADGE_V7)
        .map((entry) => entry.at),
    ).toEqual(GRUNTS);
  });

  it("beams the units the player picked, onto every tile they can land around", () => {
    const state = field();
    const view = activeViewV7(state);
    const commands = offeredV7(state);
    const chosenIds = [idAt(state, GRUNTS[0]), idAt(state, GUNNER)].sort(
      (a, b) => a - b,
    );
    const pick = pickOf(state, { passengerUnitIds: chosenIds });
    const selection = massBeamSelectionV7(view, commands, pick);
    expect(selection?.picked).toBe(true);
    expect(selection?.full).toBe(false);
    expect(selection?.selected).toEqual(chosenIds);
    expect(selection?.commands.length).toBeGreaterThan(0);
    for (const command of selection?.commands ?? []) {
      expect(command.passengerUnitIds).toEqual(chosenIds);
      expect(previewMassBeamDownV7(view, command)).not.toBeNull();
      expect(
        applyCommandV7(state, activeIdV7(state), command).accepted,
        `${command.to.x}/${command.to.y}`,
      ).toBe(true);
    }
    const targets = martianPickTargetsV7(view, commands, pick);
    const tiles = targets.filter(
      (target) => target.family === "MASS_BEAM_DOWN",
    );
    expect(tiles.map((target) => target.command)).toEqual(
      (selection?.commands ?? []).filter(
        (command) =>
          !(selection?.eligible ?? []).some((unit) =>
            same(unit.at, command.to),
          ),
      ),
    );
    const before: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(before, view, targets, pick, commands);
    expect(
      before
        .filter((entry) => entry.label === BEAM_BADGE_V7)
        .map((entry) => entry.at),
    ).toEqual([GRUNTS[0], GUNNER]);
    // A chosen tile previews the picked two: "Beaming" on each, and the
    // name of each on its landing tile.
    const chosen = { ...pick, chosen: at(2, 5) };
    const after = martianPickTargetsV7(view, commands, chosen);
    expect(
      after.find(
        (target) =>
          target.family === "MASS_BEAM_DOWN" && same(target.at, at(2, 5)),
      )?.previewLabel,
    ).toBe("Beam 2 units");
    const entries: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(entries, view, after, chosen, commands);
    expect(
      entries
        .filter((entry) => entry.label === BEAMING_BADGE_V7)
        .map((entry) => entry.at),
    ).toEqual([GRUNTS[0], GUNNER]);
    expect(
      entries
        .filter((entry) => entry.key.includes("MASS_BEAM_LANDING"))
        .map((entry) => entry.label),
    ).toEqual(["Grunt", "Ray Gunner"]);
  });

  it("may carry a unit that has acted, and offers no tile with nobody picked", () => {
    const state = field();
    const view = activeViewV7(state);
    const commands = offeredV7(state);
    const acted = idAt(state, ACTED);
    const carried = massBeamSelectionV7(
      view,
      commands,
      pickOf(state, { passengerUnitIds: [acted] }),
    );
    expect(carried?.selected).toEqual([acted]);
    expect(carried?.commands.length).toBeGreaterThan(0);
    const nobody = pickOf(state, { passengerUnitIds: [] });
    expect(massBeamSelectionV7(view, commands, nobody)?.commands).toEqual([]);
    const targets = martianPickTargetsV7(view, commands, nobody);
    expect(targets.every((target) => target.family !== "MASS_BEAM_DOWN")).toBe(
      true,
    );
    expect(targets).toHaveLength(5);
    // A unit that is not a legal passenger (here the Mothership itself) is
    // dropped from a picked list.
    expect(
      massBeamSelectionV7(
        view,
        commands,
        pickOf(state, { passengerUnitIds: [idAt(state, MOTHERSHIP), acted] }),
      )?.selected,
    ).toEqual([acted]);
  });

  it("says how many go in the aiming panel's line", () => {
    expect(massBeamDownCountTextV7(2)).toBe(
      "Beam 2 of 3: tap your units to choose",
    );
    expect(MASS_BEAM_DOWN_FULL_V7).toBe("Up to 3");
  });
});
