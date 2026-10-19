import {
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_RULES_V7,
  SEA_SERPENT_HP_V7,
  TECHNOLOGY_IDS_V7,
  unitId,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type IceTileV7,
  type MapTypeV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { READY_V7 } from "./v7-goblin-arena";
import {
  round2ArenaV7,
  type Round2ArenaOptionsV7,
  type Round2PieceV7,
} from "./v7-round2-arena";

/**
 * Map curiosities round 3, bead B (`pulp_wars-737.21`,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md sections 8 and 13): the
 * hand-built sea of the Sea Serpent tests. It is `round2ArenaV7`'s open
 * 20 x 20 board (player 1's capital at (9, 15), player 2's at (12, 4),
 * everything explored) on a Lakes setup, with a lake of 8 x 8 tiles from
 * (1, 5) to (8, 12): Shallow Water on its rim, Deep Water inside. The
 * Serpent's home is (5, 9) unless the options say otherwise; its area is
 * the lake within 3 of home (x 2 to 8, y 6 to 12), every tile of it 3 or
 * more from both capitals.
 *
 * Pieces are seat units (a ship: `form: "NAVAL"`); the Serpent follows
 * them in ID order; `provokedBy` names piece indexes. Every seat has every
 * technology unless `techs` says otherwise.
 */
export const SERPENT_HOME_V7: CoordV7 = { x: 5, y: 9 };
export const LAKE_V7 = { x0: 1, y0: 5, x1: 8, y1: 12 } as const;

export const at = (x: number, y: number): CoordV7 => ({ x, y });

/** Every technology (the naval branch included). */
export const ALL_TECHS_V7: readonly TechnologyIdV7[] = TECHNOLOGY_IDS_V7;

export interface SerpentArenaOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly pieces?: readonly Round2PieceV7[];
  /** The Serpent's home (default {@link SERPENT_HOME_V7}); null: none. */
  readonly home?: CoordV7 | null;
  /** Where it stands (default its home). */
  readonly serpentAt?: CoordV7;
  readonly serpentHp?: number;
  readonly provokedBy?: readonly number[];
  readonly ice?: readonly IceTileV7[];
  /** More terrain overrides, applied after the lake. */
  readonly terrain?: Round2ArenaOptionsV7["terrain"];
  readonly techs?: Round2ArenaOptionsV7["techs"];
  readonly coins?: number;
  readonly explored?: Round2ArenaOptionsV7["explored"];
  readonly mapType?: MapTypeV7;
  readonly curiosities?: Round2ArenaOptionsV7["curiosities"];
  readonly neutrals?: Round2ArenaOptionsV7["neutrals"];
}

/** The lake's terrain: Shallow on the rim, Deep inside. */
export function lakeTerrainV7(): NonNullable<Round2ArenaOptionsV7["terrain"]> {
  const tiles: { at: CoordV7; terrain: "SHALLOW_WATER" | "DEEP_WATER" }[] = [];
  for (let y = LAKE_V7.y0; y <= LAKE_V7.y1; y += 1)
    for (let x = LAKE_V7.x0; x <= LAKE_V7.x1; x += 1)
      tiles.push({
        at: { x, y },
        terrain:
          x === LAKE_V7.x0 ||
          x === LAKE_V7.x1 ||
          y === LAKE_V7.y0 ||
          y === LAKE_V7.y1
            ? "SHALLOW_WATER"
            : "DEEP_WATER",
      });
  return tiles;
}

export function serpentArenaV7(
  options: SerpentArenaOptionsV7 = {},
): GameStateV7 {
  const factions = options.factions ?? ["ORIGINAL", "GOBLIN"];
  const techs =
    options.techs ??
    Object.fromEntries(factions.map((_, seat) => [seat, ALL_TECHS_V7]));
  // A land unit may stand on ice; the round-2 arena parses its board
  // before the ice is laid, so the ice tiles are built as Grass and turned
  // back to water with their ice afterwards.
  const iceKey = new Set(
    (options.ice ?? []).map((entry) => `${entry.at.x},${entry.at.y}`),
  );
  const terrain = [...lakeTerrainV7(), ...(options.terrain ?? [])];
  const built = round2ArenaV7({
    factions,
    pieces: options.pieces ?? [],
    terrain: terrain.map((entry) =>
      iceKey.has(`${entry.at.x},${entry.at.y}`)
        ? { at: entry.at, terrain: "GRASS" as const }
        : entry,
    ),
    techs,
    ...(options.coins === undefined ? {} : { coins: options.coins }),
    ...(options.explored === undefined ? {} : { explored: options.explored }),
    ...(options.curiosities === undefined
      ? {}
      : { curiosities: options.curiosities }),
    ...(options.neutrals === undefined ? {} : { neutrals: options.neutrals }),
  });
  const base: GameStateV7 = {
    ...built,
    board: {
      ...built.board,
      tiles: built.board.tiles.map((tile) => {
        if (!iceKey.has(`${tile.at.x},${tile.at.y}`)) return tile;
        const water = [...terrain]
          .reverse()
          .find(
            (entry) => entry.at.x === tile.at.x && entry.at.y === tile.at.y,
          );
        return water === undefined
          ? tile
          : { ...tile, biome: null, terrain: water.terrain };
      }),
    },
  };
  const home = options.home === undefined ? SERPENT_HOME_V7 : options.home;
  const ice = [...(options.ice ?? [])].sort(
    (left, right) => left.at.y - right.at.y || left.at.x - right.at.x,
  );
  const setup = { ...base.setup, mapType: options.mapType ?? "LAKES" };
  if (home === null) return checkedV7({ ...base, setup, ice });
  const rule = NEUTRAL_ROLE_RULES_V7.SEA_SERPENT;
  const id = unitId(base.nextEntityId);
  const serpent: UnitStateV7 = {
    id,
    ownerId: NEUTRAL_OWNER_ID_V7,
    homeCityId: null,
    role: rule.role,
    form: "NAVAL",
    at: options.serpentAt ?? home,
    hp: options.serpentHp ?? SEA_SERPENT_HP_V7,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY_V7,
  };
  const pieceIds = base.units
    .filter((unit) => unit.ownerId !== NEUTRAL_OWNER_ID_V7)
    .map((unit) => unit.id);
  const provokedBy: UnitId[] = (options.provokedBy ?? [])
    .map((index) => pieceIds[index])
    .filter((value): value is UnitId => value !== undefined)
    .sort((left, right) => left - right);
  return checkedV7({
    ...base,
    setup,
    ice,
    nextEntityId: base.nextEntityId + 1,
    units: [...base.units, serpent],
    monsters: [
      ...base.monsters,
      { unitId: id, breed: "SEA_SERPENT", home, provokedBy },
    ],
  });
}

/** The Serpent of an arena state. */
export function serpentOfV7(state: GameStateV7): UnitStateV7 {
  const entry = state.monsters.find(
    (candidate) => candidate.breed === "SEA_SERPENT",
  );
  const unit = state.units.find((candidate) => candidate.id === entry?.unitId);
  if (unit === undefined) throw new Error("no Serpent on the board");
  return unit;
}

/** The Serpent's ID in an arena state. */
export function serpentIdV7(state: GameStateV7): UnitId {
  return serpentOfV7(state).id;
}
