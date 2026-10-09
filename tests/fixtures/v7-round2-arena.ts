import {
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_RULES_V7,
  RULESET_7_ID,
  createInitialMapStateV7,
  effectiveRoleRuleV7,
  unitId,
  type CoordV7,
  type CuriosityV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type MonsterStateV7,
  type NeutralBreedV7,
  type PlayerId,
  type TechnologyIdV7,
  type TerrainIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { PRE_NAVAL_BRANCH_TECHS_V7, checkedV7 } from "./v7-builders";
import { READY_V7 } from "./v7-goblin-arena";

/**
 * Map curiosities round 2 (`pulp_wars-737.14`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md sections 24 to 31): an open
 * 20 x 20 Dry Land arena (seed 1, two seats, the option on). The generated
 * board is cleared to Grass, every neutral village is removed, and the
 * only centres are the two capitals: player 1's at (9, 15) and player 2's
 * at (12, 4) (with four seats: (7, 3), (2, 14), (17, 6), and (17, 16)). Turn order: `turnOrder[0]` is active, and its `END_TURN`
 * after every other seat's wraps the round (the neutral turn). The whole
 * board is explored by every seat unless `explored` says otherwise.
 *
 * Pieces are seat units (seat 0 is player 1); neutral units follow them in
 * ID order; `provokedBy` names piece indexes.
 */
export const ROUND2_CAPITALS_V7: readonly CoordV7[] = [
  { x: 9, y: 15 },
  { x: 12, y: 4 },
];

export interface Round2PieceV7 {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly form?: UnitStateV7["form"];
  readonly activation?: Partial<UnitStateV7["activation"]>;
}

export interface Round2NeutralV7 {
  readonly breed: NeutralBreedV7;
  readonly home: CoordV7;
  /** Where it stands (default its home). */
  readonly at?: CoordV7;
  readonly hp?: number;
  /** Piece indexes listed in its `provokedBy`. */
  readonly provokedBy?: readonly number[];
}

export interface Round2ArenaOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly aiMode?: MatchSetupV7["aiMode"];
  readonly pieces?: readonly Round2PieceV7[];
  readonly neutrals?: readonly Round2NeutralV7[];
  readonly curiosities?: readonly CuriosityV7[];
  /** Terrain overrides (default Grass everywhere off the capitals). */
  readonly terrain?: readonly {
    readonly at: CoordV7;
    readonly terrain: TerrainIdV7;
  }[];
  readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
  readonly coins?: number;
  /** Explored tiles per seat (default: the whole board). */
  readonly explored?: Readonly<Record<number, readonly CoordV7[]>>;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

export function round2SetupV7(
  factions: readonly FactionIdV7[] = ["ORIGINAL", "GOBLIN"],
  aiMode: MatchSetupV7["aiMode"] = "RIVAL",
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: 20,
    height: 20,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: true,
  };
}

export function round2ArenaV7(options: Round2ArenaOptionsV7 = {}): GameStateV7 {
  const factions = options.factions ?? ["ORIGINAL", "GOBLIN"];
  const setup = round2SetupV7(factions, options.aiMode);
  const created = createInitialMapStateV7({ ...setup, curiosities: false });
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const capitals = base.cities.map((city) => city.at);
  if (
    factions.length === 2 &&
    !ROUND2_CAPITALS_V7.every((at) => capitals.some((city) => same(city, at)))
  )
    throw new Error("the round-2 arena's capitals moved");
  const player = (seat: number) => {
    const found = base.players.find((candidate) => candidate.seat === seat);
    if (found === undefined) throw new Error("seat missing");
    return found;
  };
  const pieces = options.pieces ?? [];
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: piece.form ?? "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: { ...READY_V7, ...piece.activation },
    };
  });
  let next = base.nextEntityId + pieces.length;
  const neutralUnits: UnitStateV7[] = [];
  const monsters: MonsterStateV7[] = [];
  for (const neutral of options.neutrals ?? []) {
    const rule = NEUTRAL_ROLE_RULES_V7[neutral.breed];
    const id = unitId(next);
    next += 1;
    neutralUnits.push({
      id,
      ownerId: NEUTRAL_OWNER_ID_V7,
      homeCityId: null,
      role: rule.role,
      form: "LAND",
      at: neutral.at ?? neutral.home,
      hp: neutral.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY_V7,
    });
    monsters.push({
      unitId: id,
      breed: neutral.breed,
      home: neutral.home,
      provokedBy: (neutral.provokedBy ?? [])
        .map((index) => units[index]?.id)
        .filter((value): value is UnitId => value !== undefined)
        .sort((left, right) => left - right),
    });
  }
  const terrain = options.terrain ?? [];
  const all = base.board.tiles.map((tile) => tile.at);
  return checkedV7({
    ...base,
    setup,
    nextEntityId: next,
    activeSeatIndex: 0,
    players: base.players.map((candidate) => {
      const researchedTechs =
        options.techs?.[candidate.seat] ?? PRE_NAVAL_BRANCH_TECHS_V7;
      return {
        ...candidate,
        researchedTechs,
        coins: options.coins ?? 100,
        explored: [...(options.explored?.[candidate.seat] ?? all)].sort(
          (left, right) => left.y - right.y || left.x - right.x,
        ),
        // Explorer is already earned and spent (the goblin arena's rule).
        achievementEntitlements: candidate.achievementEntitlements.map(
          (entry) =>
            entry.achievement === "EXPLORER" &&
            !researchedTechs.includes("SCOUTING")
              ? { ...entry, unlocked: true, spent: true }
              : entry,
        ),
      };
    }),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units: [...units, ...neutralUnits],
    monsters,
    curiosities: [...(options.curiosities ?? [])].sort(
      (left, right) => left.at.y - right.at.y || left.at.x - right.at.x,
    ),
    shields: [],
    treasureChests: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        if (tile.site === "CAPITAL" || tile.site === "CITY") return tile;
        const override = terrain.find((entry) => same(entry.at, tile.at));
        const kind = override?.terrain ?? "GRASS";
        const water = kind === "SHALLOW_WATER" || kind === "DEEP_WATER";
        return {
          ...tile,
          site: null,
          biome: water ? null : (tile.biome ?? "PLAINS"),
          terrain: kind,
          resource: null,
          improvement: null,
          road: false,
          fieldDefense: false,
        };
      }),
    },
  });
}

/** The unit standing on `at`. */
export function round2UnitAtV7(state: GameStateV7, at: CoordV7): UnitStateV7 {
  const unit = state.units.find(
    (candidate) => candidate.hp > 0 && same(candidate.at, at),
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

/** The seat's player ID. */
export function round2SeatV7(state: GameStateV7, seat: number): PlayerId {
  const found = state.players.find((candidate) => candidate.seat === seat);
  if (found === undefined) throw new Error("seat missing");
  return found.id;
}
