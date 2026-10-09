import {
  MONSTER_HP_V7,
  NEUTRAL_MONSTER_ROLE_RULE_V7,
  NEUTRAL_OWNER_ID_V7,
  unitId,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitId,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import {
  READY_V7,
  goblinArenaV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "./v7-goblin-arena";

/**
 * Map curiosities (`pulp_wars-737.3`): a four-seat 16 x 16 revision-13
 * arena (`goblinArenaV7`) with the Curiosities option on and a Giant
 * Spider. Seats 0 to 3 are players 1 to 4 (turn order 1, 4, 3, 2, so player
 * 2's `END_TURN` ends the round). Centers: capitals (4, 4), (13, 4),
 * (4, 13), (13, 13); villages (7, 4), (10, 4), (4, 7), (4, 10), (10, 10),
 * (13, 10). The default lair (7, 7) is 3 or more from every center; the
 * tiles of its area the Spider may stand on are (7, 7), (8, 7), (7, 8),
 * (9, 7), and (7, 9) (every other area tile is within 2 of a center).
 */
export const MONSTER_LAIR_V7: CoordV7 = { x: 7, y: 7 };

export interface MonsterArenaOptionsV7 extends GoblinArenaOptionsV7 {
  /** The Spider's lair (default {@link MONSTER_LAIR_V7}). */
  readonly home?: CoordV7;
  /** Where the Spider stands (default its lair). */
  readonly monsterAt?: CoordV7;
  readonly monsterHp?: number;
  /** Piece indexes listed in its `provokedBy`. */
  readonly provokedBy?: readonly number[];
  /** Tiles cleared to Grass (the lair and the Spider's tile always are). */
  readonly grass?: readonly CoordV7[];
}

/**
 * The fourth seat is one that plays no army rules, so the arena keeps the
 * policy the curiosity rules were written against: a Candy seat since the
 * Dinosaur pass (`pulp_wars-w49.15`) made the Dinosaur seats army seats
 * (it was a Dinosaur seat).
 */
export const MONSTER_FACTIONS_V7: readonly FactionIdV7[] = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "CANDY",
];

/** The arena state; the Spider's ID follows the pieces' IDs. */
export function monsterArenaV7(
  pieces: readonly GoblinPieceV7[],
  options: MonsterArenaOptionsV7 = {},
  factions: readonly FactionIdV7[] = MONSTER_FACTIONS_V7,
): GameStateV7 {
  const base = goblinArenaV7(factions, pieces, options);
  const home = options.home ?? MONSTER_LAIR_V7;
  const monsterAt = options.monsterAt ?? home;
  const grass = [home, monsterAt, ...(options.grass ?? [])];
  const id = unitId(base.nextEntityId);
  const monster: UnitStateV7 = {
    id,
    ownerId: NEUTRAL_OWNER_ID_V7,
    homeCityId: null,
    role: NEUTRAL_MONSTER_ROLE_RULE_V7.role,
    form: "LAND",
    at: monsterAt,
    hp: options.monsterHp ?? MONSTER_HP_V7,
    maxHp: MONSTER_HP_V7,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY_V7,
  };
  const same = (a: CoordV7, b: CoordV7) => a.x === b.x && a.y === b.y;
  const provokedBy: UnitId[] = (options.provokedBy ?? [])
    .map((index) => base.units[index]?.id)
    .filter((value): value is UnitId => value !== undefined)
    .sort((left, right) => left - right);
  return checkedV7({
    ...base,
    setup: { ...base.setup, curiosities: true },
    nextEntityId: base.nextEntityId + 1,
    units: [...base.units, monster],
    monsters: [{ unitId: id, breed: "GIANT_SPIDER", home, provokedBy }],
    treasureChests: base.treasureChests.filter(
      (chest) => !grass.some((where) => same(where, chest)),
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        grass.some((where) => same(where, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

/** The Spider of an arena state. */
export function monsterOfV7(state: GameStateV7): UnitStateV7 {
  const entry = state.monsters[0];
  const unit = state.units.find((candidate) => candidate.id === entry?.unitId);
  if (unit === undefined) throw new Error("no Spider on the board");
  return unit;
}
