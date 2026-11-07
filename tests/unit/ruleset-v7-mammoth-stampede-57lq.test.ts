import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  applyCommandV7,
  previewStampedeV7,
  queryPlayerCommandsV7,
  STAMPEDE_MIN_RANGE_V7,
  STAMPEDE_RANGE_V7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import {
  boardMapTargetsV7,
  type MapCommandTargetV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  TILE_ABILITIES_V7,
  planTileActionsV7,
  tileActionPlanForSelectionV7,
} from "../../src/render/canvas/tile-actions-v7";
import {
  STAMPEDE_TOOLTIP_V7,
  iceFolkHelpRulesV7,
} from "../../src/render/ice-folk-presentation-v7";
import { glossaryEntryV7 } from "../../src/render/unit-glossary-v7";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7, type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { activeIdV7, at } from "../fixtures/v7-revision20";

// `pulp_wars-57lq` (7r128): the Mammoth's Stampede goes 2 or 3 tiles in a
// straight line, never 1, so an adjacent tile is only ever a Move (or an
// Attack) and a tile 2 or 3 away in a line only ever a Stampede: no tile of
// a selected unmoved Mammoth offers both, and no chooser opens for it. The
// Ice Folk field: seat 0's capital (8, 8), seat 1's (2, 8), villages (5, 5),
// (8, 5), (5, 8); every other land tile outside a territory is open Grass.

const MAMMOTH = at(2, 2);

/** A Mammoth of seat 0 on (2, 2) and the given pieces. */
const field = (more: readonly IcePieceV7[] = []): GameStateV7 =>
  iceFieldV7([{ seat: 0, role: "SWORDSMAN", at: MAMMOTH }, ...more]);

const stampede = (state: GameStateV7, to: CoordV7): CommandV7 => ({
  kind: "STAMPEDE",
  unitId: unitAtV7(state, MAMMOTH).id,
  at: to,
});

const reach = (from: CoordV7, to: CoordV7): number =>
  Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));

const NEIGHBOURS: readonly CoordV7[] = [
  at(1, 1),
  at(2, 1),
  at(3, 1),
  at(1, 2),
  at(3, 2),
  at(1, 3),
  at(2, 3),
  at(3, 3),
];

describe("a Stampede goes 2 or 3 tiles, never 1 (pulp_wars-57lq)", () => {
  it("has a minimum range of 2 and a maximum of 3", () => {
    expect([STAMPEDE_MIN_RANGE_V7, STAMPEDE_RANGE_V7]).toEqual([2, 3]);
  });

  it("rejects a 1-tile Stampede in every direction as DIRECTION and never offers it", () => {
    const state = field();
    for (const to of NEIGHBOURS)
      expect(
        rejectedV7(state, stampede(state, to)),
        JSON.stringify(to),
      ).toEqual({
        code: "STAMPEDE_NOT_LEGAL",
        params: { reason: "DIRECTION" },
      });
    const offered = offeredV7(state, "STAMPEDE");
    expect(offered.length).toBeGreaterThan(0);
    for (const command of offered) {
      if (command.kind !== "STAMPEDE") throw new Error(command.kind);
      expect(reach(MAMMOTH, command.at)).toBeGreaterThanOrEqual(2);
      expect(reach(MAMMOTH, command.at)).toBeLessThanOrEqual(3);
    }
  });

  it("offers and plays 2- and 3-tile charges, orthogonal and diagonal", () => {
    const state = field();
    const offered = offeredV7(state, "STAMPEDE");
    for (const to of [at(4, 2), at(5, 2), at(2, 4), at(2, 5), at(4, 4)])
      expect(offered, JSON.stringify(to)).toContainEqual(stampede(state, to));
    const two = playV7(state, stampede(state, at(4, 2)));
    expect(two.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      path: [at(3, 2), at(4, 2)],
      to: at(4, 2),
    });
    const diagonal = playV7(state, stampede(state, at(4, 4)));
    expect(diagonal.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      path: [at(3, 3), at(4, 4)],
      to: at(4, 4),
    });
    const far = playV7(state, stampede(state, at(2, 5)));
    expect(far.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      path: [at(2, 3), at(2, 4), at(2, 5)],
      to: at(2, 5),
    });
  });

  it("still stops early on a 2-tile charge when the first enemy cannot be shoved", () => {
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
      { seat: 0, role: "FIGHTER", at: at(3, 1) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
    ]);
    const fighter = unitAtV7(state, at(3, 2));
    const result = playV7(state, stampede(state, at(4, 2)));
    expect(result.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      to: MAMMOTH,
      path: [],
      results: [{ unitId: fighter.id, damage: 3, shovedTo: null }],
    });
  });

  it("previews a 2-tile charge with its hits, and nothing for an adjacent tile", () => {
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(4, 2), hp: 2 },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const mammoth = unitAtV7(state, MAMMOTH);
    expect(previewStampedeV7(view, mammoth.id, at(4, 2))).toMatchObject({
      unitId: mammoth.id,
      at: at(4, 2),
      path: [at(3, 2), at(4, 2)],
      hits: [
        { unitId: unitAtV7(state, at(3, 2)).id, damage: 3, dies: false },
        { unitId: unitAtV7(state, at(4, 2)).id, damage: 2, dies: true },
      ],
    });
    expect(previewStampedeV7(view, mammoth.id, at(3, 2))).toBeNull();
    expect(previewStampedeV7(view, mammoth.id, at(2, 3))).toBeNull();
  });
});

describe("the selected unmoved Mammoth's board (pulp_wars-57lq)", () => {
  it("shows Move tiles next to it and Stampede tiles 2 or 3 out, one action a tile, no chooser", () => {
    const state = field([{ seat: 1, role: "FIGHTER", at: at(1, 3) }]);
    const view = viewForV7(state, activeIdV7(state));
    const commands = queryPlayerCommandsV7(view);
    const mammoth = unitAtV7(state, MAMMOTH);
    const plan = tileActionPlanForSelectionV7(view, commands, mammoth.id);
    expect(plan).not.toBeNull();
    const tiles = plan?.tiles ?? [];
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.actions.map((action) => action.id)).toEqual(["STAMPEDE"]);
      expect(tile.chooser).toBe(false);
      expect(reach(MAMMOTH, tile.at)).toBeGreaterThanOrEqual(2);
    }
    // The unarmed board: Moves and the Attack all next to it, none of them
    // on a Stampede tile.
    const board = boardMapTargetsV7(view, commands, {
      selection: { kind: "UNIT", unitId: mammoth.id },
      selectedUnitId: mammoth.id,
      selectedAchievement: null,
    });
    const moves = board.filter((target) => target.family === "MOVE");
    expect(moves.length).toBeGreaterThan(0);
    for (const target of moves) expect(reach(MAMMOTH, target.at)).toBe(1);
    expect(
      board.filter((target) => target.family === "ATTACK").map((t) => t.at),
    ).toEqual([at(1, 3)]);
    const stampedeKeys = new Set(
      tiles.map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    for (const target of board)
      expect(stampedeKeys.has(`${target.at.x},${target.at.y}`)).toBe(false);
  });

  it("gives a tile that both a Move and a Stampede reach to the Stampede alone (a Road's 2-tile Move)", () => {
    const ability = TILE_ABILITIES_V7.find((entry) => entry.id === "STAMPEDE");
    expect(ability?.replacesMove).toBe(true);
    if (ability === undefined) throw new Error("no Stampede ability");
    const unitId = 1 as UnitId;
    const move = (to: CoordV7): MapCommandTargetV7 => ({
      at: to,
      family: "MOVE",
      command: { kind: "MOVE", unitId, path: [to] },
    });
    const charge = (to: CoordV7): MapCommandTargetV7 => ({
      at: to,
      family: "STAMPEDE",
      command: { kind: "STAMPEDE", unitId, at: to },
    });
    const plan = planTileActionsV7({
      unitId,
      selectedAt: at(2, 2),
      boardTargets: [move(at(3, 2)), move(at(4, 2))],
      abilities: [{ ability, targets: [charge(at(4, 2)), charge(at(5, 2))] }],
      ownUnitAt: () => false,
    });
    expect(
      plan.tiles.map((tile) => ({
        at: tile.at,
        ids: tile.actions.map((action) => action.id),
        chooser: tile.chooser,
      })),
    ).toEqual([
      { at: at(4, 2), ids: ["STAMPEDE"], chooser: false },
      { at: at(5, 2), ids: ["STAMPEDE"], chooser: false },
    ]);
  });
});

describe("the Normal AI and the 2- or 3-tile Stampede (pulp_wars-57lq)", () => {
  it("charges two tiles through a line of enemies it kills", () => {
    // Two weakened enemies in a row east of the Mammoth; an own unit on
    // (5, 2) closes the line beyond them, so the charge is 2 tiles.
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(3, 2), hp: 2 },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 2 },
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
    ]);
    const mammoth = unitAtV7(state, MAMMOTH);
    const actor = activeIdV7(state);
    // The policy's first commands of the turn may be a city's; it is
    // followed, a command at a time, until it acts with the Mammoth.
    let work = state;
    let chosen: CommandV7 | null = null;
    for (let step = 0; step < 12 && chosen === null; step += 1) {
      const decision = chooseNormalCommandV7(viewForV7(work, actor));
      // No candidate is ever a 1-tile Stampede.
      for (const candidate of decision.candidates)
        if (candidate.command.kind === "STAMPEDE")
          expect(reach(MAMMOTH, candidate.command.at)).toBeGreaterThanOrEqual(
            2,
          );
      const command = decision.command;
      if (command === null || command.kind === "END_TURN") break;
      if ("unitId" in command && command.unitId === mammoth.id) {
        chosen = command;
        break;
      }
      const result = applyCommandV7(work, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      work = result.state;
    }
    expect(chosen).toEqual(stampede(state, at(4, 2)));
  });
});

describe("the Stampede's texts (pulp_wars-57lq)", () => {
  it("say 2 or 3 tiles in the tooltip, the help and the glossary", () => {
    expect(STAMPEDE_TOOLTIP_V7).toMatch(
      /^Charge 2 or 3 tiles in a straight line/,
    );
    expect(
      iceFolkHelpRulesV7().find(([label]) => label === "Stampede")?.[1],
    ).toMatch(/charges two or three tiles in a straight line/);
    expect(glossaryEntryV7("STAMPEDE").text).toMatch(
      /charges two or three tiles in a straight line/,
    );
  });
});
