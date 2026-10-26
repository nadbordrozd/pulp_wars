import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  RULESET_7_ID,
  PRIOR_RULESET_7_IDS,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  isCityBesiegedV7,
  isTileEnemyOccupiedV7,
  parseEventV7,
  parseGameStateV7,
  publicTileEnemyOccupiedV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
} from "../fixtures/v7-goblin-arena";
import { at, mountainV7, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * Siege rules (`pulp_wars-0pgd`, `pulp-wars-poc-7r80`;
 * docs/product/RULESET_7_CURRENT.md sections 4.6, 4.7, and 8.1), on small
 * hand-built states of the two-seat arena: seat 0's capital is at (8, 8)
 * with the eight tiles around it as its territory.
 *
 * 1. A besieged city builds: a siege blocks no tile command.
 * 2. No tile command but Blast Mountain targets a tile a hostile unit
 *    stands on (`TILE_ENEMY_OCCUPIED`).
 *
 * (A level-up reward unit took the center and moved or killed the unit
 * standing there from 7r80 to 7r110; reward placement, `pulp_wars-spue`,
 * 7r111, puts it beside the center instead and harms nobody:
 * tests/unit/ruleset-v7-reward-placement.test.ts.)
 */
const CENTER = at(8, 8);
interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly captureEligible?: boolean;
  readonly activation?: Partial<UnitStateV7["activation"]>;
}

const kinds = (events: readonly { readonly kind: string }[]): string[] =>
  events.map((event) => event.kind);

function reject(state: GameStateV7, command: CommandV7): string {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (result.accepted) throw new Error("accepted");
  expect(result.state).toBe(state);
  return result.error.code;
}

const offered = (state: GameStateV7, command: CommandV7): boolean =>
  queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)).some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
  );

describe("siege rules: the identity", () => {
  // The flatter technology bases (`pulp_wars-w49.40`) took 7r81 and the
  // mission objectives (`pulp_wars-v642.1`) 7r82 and the campaign
  // follow-ups (`pulp_wars-v642.5`) 7r83, so 7r80 is a prior
  // identity.
  it("was 7r80 after 7r79, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r117");
    expect(PRIOR_RULESET_7_IDS.slice(-38, -36)).toEqual([
      "pulp-wars-poc-7r79",
      "pulp-wars-poc-7r80",
    ]);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r117.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-38, -36)).toEqual([
      "pulpWars.save.v7r79.current",
      "pulpWars.save.v7r80.current",
    ]);
  });
});

describe("siege rules: a besieged city builds", () => {
  /** Seat 1's Fighter besieges the capital; Fertile Ground and Fruit. */
  const besieged = (extra: readonly Piece[] = []): GameStateV7 => {
    const taken = (where: CoordV7): boolean =>
      extra.some((piece) => piece.at.x === where.x && piece.at.y === where.y);
    // Placeholders clear the three tiles to plain Grass.
    const placeholders = [at(9, 9), at(7, 9), at(7, 7)].filter(
      (where) => !taken(where),
    );
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: CENTER },
        ...placeholders.map((where) => ({
          seat: 0,
          role: "FIGHTER" as const,
          at: where,
        })),
        ...extra,
      ],
    );
    const cleared = checkedV7({
      ...base,
      units: base.units.filter(
        (unit) =>
          !placeholders.some(
            (where) => where.x === unit.at.x && where.y === unit.at.y,
          ),
      ),
    });
    return patchTileV7(
      patchTileV7(cleared, at(9, 9), { resource: "FERTILE_GROUND" }),
      at(7, 9),
      { resource: "FRUIT" },
    );
  };

  it("is besieged, and still cannot train", () => {
    const state = besieged();
    const city = cityOfV7(state, 0);
    expect(isCityBesiegedV7(state, city)).toBe(true);
    const train: CommandV7 = {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    };
    expect(reject(state, train)).toBe("CITY_BESIEGED");
    expect(offered(state, train)).toBe(false);
  });

  it.each([
    ["a building", { kind: "BUILD_FARM", at: at(9, 9) }],
    ["a resource action", { kind: "HARVEST_FRUIT", at: at(7, 9) }],
    ["a Road", { kind: "BUILD_ROAD", at: at(7, 7) }],
  ] as const)("offers and accepts %s in its territory", (_name, command) => {
    const state = besieged();
    expect(offered(state, command)).toBe(true);
    const result = applyOkV7(state, state.humanPlayerId, command);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
    // The siege goes on.
    expect(isCityBesiegedV7(result.state, cityOfV7(result.state, 0))).toBe(
      true,
    );
  });

  it("refuses every tile command on a tile a hostile unit stands on", () => {
    // A second enemy unit on the Fertile Ground, another on the Fruit.
    const state = besieged([
      { seat: 1, role: "FIGHTER", at: at(9, 9) },
      { seat: 1, role: "FIGHTER", at: at(7, 9) },
    ]);
    const patched = state;
    for (const command of [
      { kind: "BUILD_FARM", at: at(9, 9) },
      { kind: "BUILD_ROAD", at: at(9, 9) },
      { kind: "HARVEST_FRUIT", at: at(7, 9) },
    ] as const) {
      expect(reject(patched, command), command.kind).toBe(
        "TILE_ENEMY_OCCUPIED",
      );
      expect(offered(patched, command), command.kind).toBe(false);
    }
    const view = viewForV7(patched, patched.humanPlayerId);
    expect(publicTileEnemyOccupiedV7(view, at(9, 9))).toBe(true);
    expect(publicTileEnemyOccupiedV7(view, at(7, 7))).toBe(false);
    expect(
      isTileEnemyOccupiedV7(patched, patched.humanPlayerId, at(9, 9)),
    ).toBe(true);
    // The besieger's own seat is not blocked by its own unit.
    expect(isTileEnemyOccupiedV7(patched, seatIdV7(patched, 1), at(9, 9))).toBe(
      false,
    );
  });

  it("refuses it in a city that is not besieged, and allows a tile an own unit stands on", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: at(9, 9) },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
      ],
    );
    expect(isCityBesiegedV7(base, cityOfV7(base, 0))).toBe(false);
    expect(reject(base, { kind: "BUILD_ROAD", at: at(9, 9) })).toBe(
      "TILE_ENEMY_OCCUPIED",
    );
    expect(offered(base, { kind: "BUILD_ROAD", at: at(9, 9) })).toBe(false);
    expect(offered(base, { kind: "BUILD_ROAD", at: at(7, 7) })).toBe(true);
    applyOkV7(base, base.humanPlayerId, { kind: "BUILD_ROAD", at: at(7, 7) });
  });

  it("refuses a neutral Road under a hostile unit", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [{ seat: 1, role: "FIGHTER", at: at(6, 6) }],
    );
    expect(
      base.board.tiles.find((tile) => tile.at.x === 6 && tile.at.y === 6)
        ?.territoryCityId,
    ).toBeNull();
    expect(reject(base, { kind: "BUILD_ROAD", at: at(6, 6) })).toBe(
      "TILE_ENEMY_OCCUPIED",
    );
    expect(offered(base, { kind: "BUILD_ROAD", at: at(6, 6) })).toBe(false);
  });

  it("still blasts a Mountain under a hostile unit, besieged or not", () => {
    const state = mountainV7(
      besieged([{ seat: 1, role: "FIGHTER", at: at(9, 7) }]),
      at(9, 7),
    );
    const blast: CommandV7 = { kind: "BLAST_MOUNTAIN", at: at(9, 7) };
    expect(offered(state, blast)).toBe(true);
    const result = applyOkV7(state, state.humanPlayerId, blast);
    expect(kinds(result.events)).toContain("MOUNTAIN_BLASTED");
  });
});

describe("siege rules: the Normal AI", () => {
  it("chooses a legal command for a besieged seat that can build", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: CENTER },
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
      ],
    );
    const view = viewForV7(base, base.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    expect(commands.some((command) => command.kind === "BUILD_ROAD")).toBe(
      true,
    );
    const decision = chooseNormalCommandV7(view).command;
    expect(
      commands.some(
        (command) => JSON.stringify(command) === JSON.stringify(decision),
      ),
    ).toBe(true);
  });
});
