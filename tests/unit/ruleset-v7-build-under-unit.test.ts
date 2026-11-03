import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  arePlayersAlliedV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
} from "../fixtures/v7-goblin-arena";
import { at, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * Building under a unit (`pulp_wars-og1r`; docs/product/RULESET_7_CURRENT.md
 * section 8.1). A player said he could not build on a tile with a unit on
 * it. The rule: a building goes up on a tile the builder's own unit or an
 * ally's unit stands on, never on one a hostile unit stands on
 * (`TILE_ENEMY_OCCUPIED`, and not offered). Small hand-built states of the
 * Goblin arena: two seats (seat 0's capital at (8, 8)), and three seats in a
 * Cooperative match, where the two AI seats are allies.
 */

const offered = (
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): boolean =>
  queryPlayerCommandsV7(viewForV7(state, actor)).some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
  );

function refused(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): string {
  const result = applyCommandV7(state, actor, command);
  if (result.accepted) throw new Error(`${command.kind} accepted`);
  return result.error.code;
}

/** Two seats; Fertile Ground on `where`, with a Fighter of `occupant` on it. */
function twoSeats(
  occupant: { readonly seat: number } | null,
  where: CoordV7,
): GameStateV7 {
  const base = goblinArenaV7(
    ["ORIGINAL", "ORIGINAL"],
    occupant === null
      ? []
      : [{ seat: occupant.seat, role: "FIGHTER", at: where }],
  );
  return patchTileV7(base, where, {
    biome: "PLAINS",
    terrain: "GRASS",
    resource: "FERTILE_GROUND",
    improvement: null,
    road: false,
  });
}

const FARM_TILE = at(9, 9);
const FARM: CommandV7 = { kind: "BUILD_FARM", at: FARM_TILE };
const ROAD: CommandV7 = { kind: "BUILD_ROAD", at: FARM_TILE };

describe("building under a unit: the builder's own unit", () => {
  it("offers and builds a Farm under an own unit, which stays put", () => {
    const state = twoSeats({ seat: 0 }, FARM_TILE);
    const actor = state.humanPlayerId;
    const unit = state.units.find(
      (item) => item.at.x === FARM_TILE.x && item.at.y === FARM_TILE.y,
    );
    expect(unit?.ownerId).toBe(actor);
    expect(offered(state, actor, FARM)).toBe(true);
    const result = applyOkV7(state, actor, FARM);
    const tile = result.state.board.tiles.find(
      (item) => item.at.x === FARM_TILE.x && item.at.y === FARM_TILE.y,
    );
    expect(tile?.improvement).toBe("FARM");
    expect(result.state.units.find((item) => item.id === unit?.id)?.at).toEqual(
      FARM_TILE,
    );
  });

  it("refuses a Farm and a Road under an enemy unit, and offers neither", () => {
    const state = twoSeats({ seat: 1 }, FARM_TILE);
    const actor = state.humanPlayerId;
    for (const command of [FARM, ROAD]) {
      expect(refused(state, actor, command), command.kind).toBe(
        "TILE_ENEMY_OCCUPIED",
      );
      expect(offered(state, actor, command), command.kind).toBe(false);
    }
  });

  it("offers the same Farm on the empty tile", () => {
    const state = twoSeats(null, FARM_TILE);
    expect(offered(state, state.humanPlayerId, FARM)).toBe(true);
  });
});

describe("building under a unit: an ally's unit", () => {
  /**
   * Three seats in a Cooperative match: seats 1 and 2 (both AI) are allies,
   * seat 0 (the human) is hostile to both. Seat 1 is to act, and the tile
   * beside its capital carries Fertile Ground and the given unit.
   */
  function cooperative(occupantSeat: number | null): {
    readonly state: GameStateV7;
    readonly actor: PlayerId;
    readonly farm: CommandV7;
  } {
    const probe = goblinArenaV7(["ORIGINAL", "ORIGINAL", "ORIGINAL"], [], {
      aiMode: "COOPERATIVE",
      activeSeat: 1,
    });
    const capital = cityOfV7(probe, 1);
    const where = probe.board.tiles.find(
      (tile) =>
        tile.territoryCityId === capital.id &&
        tile.site === null &&
        tile.biome !== null &&
        !(tile.at.x === capital.at.x && tile.at.y === capital.at.y),
    )?.at;
    if (where === undefined) throw new Error("no territory tile");
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL", "ORIGINAL"],
      occupantSeat === null
        ? []
        : [{ seat: occupantSeat, role: "FIGHTER", at: where }],
      { aiMode: "COOPERATIVE", activeSeat: 1 },
    );
    const state = patchTileV7(base, where, {
      biome: "PLAINS",
      terrain: "GRASS",
      resource: "FERTILE_GROUND",
      improvement: null,
      road: false,
    });
    return {
      state,
      actor: seatIdV7(state, 1),
      farm: { kind: "BUILD_FARM", at: where },
    };
  }

  it("offers and builds a Farm under an allied unit", () => {
    const { state, actor, farm } = cooperative(2);
    expect(arePlayersAlliedV7(state, actor, seatIdV7(state, 2))).toBe(true);
    expect(offered(state, actor, farm)).toBe(true);
    const result = applyOkV7(state, actor, farm);
    expect(result.events.map((event) => event.kind)).toContain(
      "ECONOMIC_BUILDING_BUILT",
    );
  });

  it("refuses the same Farm under the hostile human's unit", () => {
    const { state, actor, farm } = cooperative(0);
    expect(arePlayersAlliedV7(state, actor, seatIdV7(state, 0))).toBe(false);
    expect(refused(state, actor, farm)).toBe("TILE_ENEMY_OCCUPIED");
    expect(offered(state, actor, farm)).toBe(false);
  });
});
