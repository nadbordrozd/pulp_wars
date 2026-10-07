import {
  GROWTH_KILLS_V7,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { withEggsV7, withKillsV7, type EggPieceV7 } from "./v7-dinosaur-arena";
import { goblinArenaV7, sameV7, type GoblinPieceV7 } from "./v7-goblin-arena";

/**
 * Revision 19 Dinosaur UI fixtures (pulp_wars-c87.4) on the seed-2 Dry Land
 * 11×11 arena (seat 0 is the human; capitals (8, 8) and (2, 8); villages
 * (5, 5), (8, 5), (5, 8)). Every land tile that is not a settlement is open
 * Grass; `forests` restores cover where a fixture wants it. Achievements are unlocked in advance so that command tails emit
 * no achievement notice over the board.
 */
export interface DinosaurUiOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly eggs?: readonly EggPieceV7[];
  readonly forests?: readonly CoordV7[];
  /** Credited kills by tile (growth: 1 is Big, 3 is Alpha). */
  readonly kills?: readonly (readonly [CoordV7, number])[];
  /** Researched technologies per seat (default: every technology). */
  readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
  readonly coins?: number;
  /** Seat-0 tiles whose unit stays homed to the capital (default: none). */
  readonly homed?: readonly CoordV7[];
}

export function dinosaurUiFieldV7(
  pieces: readonly GoblinPieceV7[],
  options: DinosaurUiOptionsV7 = {},
): GameStateV7 {
  const arena = goblinArenaV7(
    options.factions ?? ["DINOSAUR", "ORIGINAL"],
    pieces,
    {
      ...(options.techs === undefined ? {} : { techs: options.techs }),
      ...(options.coins === undefined ? {} : { coins: options.coins }),
    },
  );
  const forests = options.forests ?? [];
  const homed = options.homed ?? [];
  let state = checkedV7({
    ...arena,
    treasureChests: [],
    players: arena.players.map((player) => ({
      ...player,
      // An achievement needs its technology (Scouting, Engineering, Drill).
      // (The arena's Explorer of a seat without Scouting is already earned
      // and spent, `goblinArenaV7`: it stays so.)
      achievementEntitlements: player.achievementEntitlements.map(
        (entitlement) =>
          entitlement.spent
            ? entitlement
            : {
                ...entitlement,
                unlocked: player.researchedTechs.includes(
                  entitlement.achievement === "EXPLORER"
                    ? "SCOUTING"
                    : entitlement.achievement === "ENGINEER"
                      ? "ENGINEERING"
                      : "DRILL",
                ),
              },
      ),
    })),
    // Units are orphans unless listed, so the capital's slots stay readable
    // (an orphan uses no slot anywhere).
    units: arena.units.map((unit) =>
      homed.some((at) => sameV7(at, unit.at))
        ? unit
        : { ...unit, homeCityId: null },
    ),
    board: {
      ...arena.board,
      tiles: arena.board.tiles.map((tile) =>
        tile.site !== null
          ? tile
          : forests.some((at) => sameV7(at, tile.at))
            ? {
                ...tile,
                biome: "WOODLAND" as const,
                terrain: "FOREST" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              },
      ),
    },
  });
  for (const [at, kills] of options.kills ?? [])
    state = withKillsV7(state, at, kills);
  return options.eggs === undefined ? state : withEggsV7(state, options.eggs);
}

export const DINOSAUR_SHOWCASE_V7 = {
  /** Unmoved Triceratops (revision 20: Move 2, Charge!). */
  triceratops: { x: 4, y: 2 },
  /** Own Caveman east of it (a Move passes over it). */
  laneCaveman: { x: 5, y: 2 },
  /**
   * Enemy Juggernaut 3 tiles east: it survives any tuned Charge, is pushed,
   * and the Triceratops follows. The tile next to it is `chargeFrom`.
   */
  pushTarget: { x: 7, y: 2 },
  /** Two tiles east, next to the Juggernaut: a run-up of 2 over the Caveman. */
  chargeFrom: { x: 6, y: 2 },
  /** Enemy Fighter at 1 HP, 2 tiles south: dies; the Triceratops advances. */
  killTarget: { x: 4, y: 4 },
  /** One tile south, next to that Fighter: a run-up of 1. */
  killFrom: { x: 4, y: 3 },
  /** Enemy Marksman at 1 HP, 2 tiles north-east. */
  diagonalTarget: { x: 6, y: 0 },
  /** Shaman next to both Eggs. */
  shaman: { x: 8, y: 7 },
  /** T-Rex Egg laid on an earlier turn (its full hatch time left). */
  tRexEgg: { x: 7, y: 7 },
  /** Raptor Egg laid this turn: no Hatch yet. */
  newEgg: { x: 9, y: 7 },
  /** Damaged Spitter Egg (1 HP left). */
  damagedEgg: { x: 9, y: 9 },
  /** Big Raptor (the first growth threshold). */
  bigRaptor: { x: 6, y: 6 },
  /** Alpha T-Rex (the second growth threshold) next to an enemy Fighter. */
  alphaTRex: { x: 5, y: 7 },
  tRexTarget: { x: 4, y: 7 },
  /** Spitter two tiles from an enemy Guard in a Forest (Acid). */
  spitter: { x: 6, y: 9 },
  acidTarget: { x: 4, y: 9 },
  /** Ankylosaurus next to an enemy Fighter (Armoured retaliation). */
  ankylosaurus: { x: 6, y: 4 },
  ankylosaurusTarget: { x: 7, y: 4 },
  /** Big Brontosaurus (the growth scale's width cap). */
  brontosaurus: { x: 9, y: 4 },
  capital: { x: 8, y: 8 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * Dinosaur (human) vs Human: a Triceratops with targets to Charge, Eggs with
 * countdowns, a Shaman Hatch, growth stages, Acid and Armoured.
 */
export function dinosaurShowcaseFixtureV7(): GameStateV7 {
  const at = DINOSAUR_SHOWCASE_V7;
  return dinosaurUiFieldV7(
    [
      { seat: 0, role: "SWORDSMAN", at: at.triceratops },
      { seat: 0, role: "FIGHTER", at: at.laneCaveman },
      { seat: 1, role: "JUGGERNAUT", at: at.pushTarget },
      { seat: 1, role: "FIGHTER", at: at.killTarget, hp: 1 },
      { seat: 1, role: "MARKSMAN", at: at.diagonalTarget, hp: 1 },
      { seat: 0, role: "CAPTAIN", at: at.shaman },
      { seat: 0, role: "RAIDER", at: at.bigRaptor },
      { seat: 0, role: "KNIGHT", at: at.alphaTRex },
      { seat: 1, role: "FIGHTER", at: at.tRexTarget },
      { seat: 0, role: "MARKSMAN", at: at.spitter },
      { seat: 1, role: "GUARD", at: at.acidTarget },
      { seat: 0, role: "GUARD", at: at.ankylosaurus },
      { seat: 1, role: "FIGHTER", at: at.ankylosaurusTarget },
      { seat: 0, role: "JUGGERNAUT", at: at.brontosaurus },
    ],
    {
      forests: [at.acidTarget],
      // One kill short of Big, Big, Alpha and Big: thresholds from the registry.
      kills: [
        [at.triceratops, GROWTH_KILLS_V7[0] - 1],
        [at.bigRaptor, GROWTH_KILLS_V7[0]],
        [at.alphaTRex, GROWTH_KILLS_V7[1]],
        [at.brontosaurus, GROWTH_KILLS_V7[0]],
      ],
      eggs: [
        { seat: 0, role: "KNIGHT", at: at.tRexEgg },
        {
          seat: 0,
          role: "RAIDER",
          at: at.newEgg,
          turnsRemaining: 1,
          laidThisTurn: true,
        },
        { seat: 0, role: "MARKSMAN", at: at.damagedEgg, hp: 1 },
      ],
    },
  );
}

export const DINOSAUR_BLAST_V7 = {
  triceratops: { x: 4, y: 4 },
  /** Next to the Bomb Chucker: where the Triceratops charges from. */
  chargeFrom: { x: 6, y: 3 },
  /** Goblin Bomb Chucker at 1 HP: the Charge kills it; it explodes. */
  bombChucker: { x: 7, y: 4 },
  /** Own Caveman next to the Bomb Chucker: the death blast hits it. */
  caveman: { x: 8, y: 3 },
  /** Goblin Rocket Cart at 1 HP next to it: a wave-2 chain reaction. */
  rocketCart: { x: 6, y: 5 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * Dinosaur (human) vs Goblin: a Charge that kills an exploding Bomb
 * Chucker, whose death blast hits the advanced Triceratops and an own
 * Caveman and sets off a Rocket Cart.
 */
export function dinosaurBlastFixtureV7(): GameStateV7 {
  const at = DINOSAUR_BLAST_V7;
  return dinosaurUiFieldV7(
    [
      { seat: 0, role: "SWORDSMAN", at: at.triceratops },
      { seat: 1, role: "MARKSMAN", at: at.bombChucker, hp: 1 },
      { seat: 0, role: "FIGHTER", at: at.caveman },
      { seat: 1, role: "CATAPULT", at: at.rocketCart, hp: 1 },
    ],
    { factions: ["DINOSAUR", "GOBLIN"] },
  );
}

export const DINOSAUR_ENEMY_V7 = {
  /** Human Fighter next to two enemy Eggs. */
  fighter: { x: 4, y: 8 },
  /** Enemy Raptor Egg, one turn left. */
  raptorEgg: { x: 3, y: 7 },
  /** Enemy T-Rex Egg at 1 HP, its full hatch time left. */
  tRexEgg: { x: 3, y: 9 },
  /** Human Knight next to an enemy Ankylosaurus (Armoured). */
  knight: { x: 5, y: 3 },
  ankylosaurus: { x: 6, y: 3 },
  /** Enemy grown units. */
  alphaTRex: { x: 8, y: 2 },
  bigRaptor: { x: 9, y: 3 },
  /** Enemy Triceratops (it threatens its Move-then-melee reach). */
  triceratops: { x: 6, y: 6 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * Human (human) vs Dinosaur: enemy Eggs as attack targets, an Armoured
 * defender, and enemy growth markers.
 */
export function dinosaurEnemyFixtureV7(): GameStateV7 {
  const at = DINOSAUR_ENEMY_V7;
  return dinosaurUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.fighter },
      { seat: 0, role: "KNIGHT", at: at.knight },
      { seat: 1, role: "GUARD", at: at.ankylosaurus },
      { seat: 1, role: "KNIGHT", at: at.alphaTRex },
      { seat: 1, role: "RAIDER", at: at.bigRaptor },
      { seat: 1, role: "SWORDSMAN", at: at.triceratops },
    ],
    {
      factions: ["ORIGINAL", "DINOSAUR"],
      kills: [
        [at.alphaTRex, GROWTH_KILLS_V7[1]],
        [at.bigRaptor, GROWTH_KILLS_V7[0]],
      ],
      eggs: [
        { seat: 1, role: "RAIDER", at: at.raptorEgg, turnsRemaining: 1 },
        { seat: 1, role: "KNIGHT", at: at.tRexEgg, hp: 1 },
      ],
    },
  );
}

export const DINOSAUR_CITY_V7 = {
  capital: { x: 8, y: 8 },
  caveman: { x: 8, y: 6 },
  /** An enemy on a nest tile is not possible; an own unit blocks one. */
  blocker: { x: 7, y: 7 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * Dinosaur (human) vs Human with one Caveman homed to the level-1 capital
 * (capacity 2 without Planning, 3 with it): the Lay Egg cards and their
 * reasons. `techs` and `coins` vary the disabled reasons.
 */
export function dinosaurCityFixtureV7(
  options: Pick<DinosaurUiOptionsV7, "techs" | "coins" | "eggs"> = {},
): GameStateV7 {
  const at = DINOSAUR_CITY_V7;
  return dinosaurUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.caveman },
      { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
    ],
    { ...options, homed: [at.caveman] },
  );
}

/** Every Dinosaur technology except `excluded` and what needs them. */
export function dinosaurTechsWithoutV7(
  ...excluded: TechnologyIdV7[]
): readonly TechnologyIdV7[] {
  const removed = new Set<TechnologyIdV7>(excluded);
  const nodes = factionTreeV7("DINOSAUR").nodes;
  for (let changed = true; changed;) {
    changed = false;
    for (const node of nodes)
      if (
        !removed.has(node.id) &&
        node.prerequisites.some((tech) => removed.has(tech))
      ) {
        removed.add(node.id);
        changed = true;
      }
  }
  return TECHNOLOGY_IDS_V7.filter((tech) => !removed.has(tech));
}

/**
 * The same capital with no Coins: every researched role has free slots, so
 * every Lay Egg card says it needs its cost, whatever the tuned numbers.
 */
export function dinosaurCityPoorFixtureV7(): GameStateV7 {
  return dinosaurCityFixtureV7({ coins: 0 });
}

/**
 * The capital without Planning and with three homed Cavemen: its capacity
 * (3 at level 1 with Nesting) is full, so every Lay Egg card says it needs
 * its slots. (The Industry reshuffle, `pulp_wars-w49.21`, 7r56: with
 * Nesting, where the Ankylosaurus is; without it, and with two Cavemen,
 * before.)
 */
export function dinosaurCityFullFixtureV7(): GameStateV7 {
  const at = DINOSAUR_CITY_V7;
  return dinosaurUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.caveman },
      { seat: 0, role: "FIGHTER", at: { x: 7, y: 6 } },
      { seat: 0, role: "FIGHTER", at: { x: 9, y: 6 } },
      { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
    ],
    {
      techs: { 0: dinosaurTechsWithoutV7("PLANNING") },
      homed: [at.caveman, { x: 7, y: 6 }, { x: 9, y: 6 }],
    },
  );
}

/**
 * Review only (its mix follows the tuned numbers): the capital without
 * Planning or Nesting and with the cost of a Raptor Egg in Coins, so some
 * cards can be used, some need Coins, and the two-slot roles need slots.
 */
export function dinosaurCityTightFixtureV7(): GameStateV7 {
  return dinosaurCityFixtureV7({
    coins: effectiveRoleRuleV7("RAIDER", "DINOSAUR").cost ?? 0,
    techs: { 0: dinosaurTechsWithoutV7("PLANNING", "FORTIFICATION") },
  });
}
