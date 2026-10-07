import {
  RULESET_7_ID,
  buildMissionStateV7,
  type CoordV7,
  type GameStateV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

/**
 * Multi-cell terrain at the fog (bead pulp_wars-2yc.37,
 * docs/art/TERRAIN_AT_THE_FOG.md): a horizontal and a vertical Rift, a
 * ridge and a small wood, with exactly the cells the caller names
 * explored. The module imports no test runner, so the browser review
 * (scripts/art/terrain-fog/review.ts) mounts it through the dev server.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ~~~~~~~~~~~~~~      x: Rift   ^: Mountain   f: Forest   ~: water
 *    1   ~............~      C: the viewer's capital (x 4, y 10)
 *    2   ~..xxx....x..~      E: the other seat's capital (x 10, y 10)
 *    3   ~.........x..~
 *    4   ~.........x..~      The horizontal Rift: x 3 to 5, y 2.
 *    5   ~............~      The vertical Rift: x 10, y 2 to 4.
 *    6   ~..^^...ff...~      The ridge: x 3 and 4, y 6.
 *    7   ~.......ff...~      The wood: x 8 and 9, y 6 and 7.
 *    8   ~............~
 *    9   ~............~
 *    A   ~...C.....E..~
 *    B   ~............~
 *    C   ~~~~~~~~~~~~~~
 *    D   ~~~~~~~~~~~~~~
 * ```
 */
export const RIFT_FOG_SIZE_V7 = 14;

export const RIFT_FOG_TERRAIN_V7 = [
  "~~~~~~~~~~~~~~",
  "~............~",
  "~..xxx....x..~",
  "~.........x..~",
  "~.........x..~",
  "~............~",
  "~..^^...ff...~",
  "~.......ff...~",
  "~............~",
  "~............~",
  "~............~",
  "~............~",
  "~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~",
] as const;

export const RIFT_FOG_V7 = {
  /** West to east. */
  horizontal: [
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
  ],
  /** North to south. */
  vertical: [
    { x: 10, y: 2 },
    { x: 10, y: 3 },
    { x: 10, y: 4 },
  ],
  ridge: [
    { x: 3, y: 6 },
    { x: 4, y: 6 },
  ],
  wood: [
    { x: 8, y: 6 },
    { x: 9, y: 6 },
    { x: 8, y: 7 },
    { x: 9, y: 7 },
  ],
  capital: { x: 4, y: 10 },
  enemyCapital: { x: 10, y: 10 },
} as const;

/** The seven ways one, two or all three cells of a Rift are explored. */
export const RIFT_FOG_MASKS_V7: readonly (readonly [
  boolean,
  boolean,
  boolean,
])[] = [
  [true, false, false],
  [false, true, false],
  [false, false, true],
  [true, true, false],
  [false, true, true],
  [true, false, true],
  [true, true, true],
];

/** "100", "011"...: the name of a mask, first cell first. */
export const riftFogMaskNameV7 = (
  mask: readonly [boolean, boolean, boolean],
): string => mask.map((seen) => (seen ? "1" : "0")).join("");

const MISSION: MissionDefinitionV7 = {
  id: "RIFT_FOG_REVIEW",
  revision: 1,
  hidden: true,
  size: RIFT_FOG_SIZE_V7,
  seed: 1,
  terrain: [...RIFT_FOG_TERRAIN_V7],
  resources: RIFT_FOG_TERRAIN_V7.map(() => ".".repeat(RIFT_FOG_SIZE_V7)),
  biome: "PLAINS",
  villages: [],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 0,
      technologies: [],
      cities: [{ at: RIFT_FOG_V7.capital, level: 1, rewards: [] }],
      units: [{ role: "FIGHTER", at: RIFT_FOG_V7.capital }],
      reveal: { radius: 1 },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
      cities: [{ at: RIFT_FOG_V7.enemyCapital, level: 1, rewards: [] }],
      units: [{ role: "FIGHTER", at: RIFT_FOG_V7.enemyCapital }],
      reveal: { radius: 1 },
    },
  ],
  forbiddenTechnologies: [],
  objective: { kind: "DOMINATION" },
};

export interface RiftFogOptionsV7 {
  /** Cells the viewer has explored besides its capital's ring. */
  readonly explored?: readonly CoordV7[];
  /** Everything is explored. */
  readonly all?: boolean;
  /**
   * Also explored: every cell next to an explored cell of `explored` that
   * is not one of the Rifts' cells, the ridge's or the wood's (what a unit
   * walking past sees of the ground around them).
   */
  readonly halo?: boolean;
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The cells of `cells` a mask names. */
export function riftFogCellsV7(
  cells: readonly CoordV7[],
  mask: readonly boolean[],
): CoordV7[] {
  return cells.filter((_, index) => mask[index] === true);
}

export function riftFogSceneV7(options: RiftFogOptionsV7 = {}): GameStateV7 {
  const state = buildMissionStateV7(MISSION, {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: RIFT_FOG_SIZE_V7,
    height: RIFT_FOG_SIZE_V7,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "GOBLIN"],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });
  const named = new Set((options.explored ?? []).map(key));
  const multi = new Set(
    [
      ...RIFT_FOG_V7.horizontal,
      ...RIFT_FOG_V7.vertical,
      ...RIFT_FOG_V7.ridge,
      ...RIFT_FOG_V7.wood,
    ].map(key),
  );
  const seen = (at: CoordV7): boolean => {
    if (options.all === true || named.has(key(at))) return true;
    if (
      Math.max(
        Math.abs(at.x - RIFT_FOG_V7.capital.x),
        Math.abs(at.y - RIFT_FOG_V7.capital.y),
      ) <= 1
    )
      return true;
    if (options.halo !== true || multi.has(key(at))) return false;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1)
        if (named.has(key({ x: at.x + dx, y: at.y + dy }))) return true;
    return false;
  };
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: state.board.tiles.map((tile) => tile.at).filter(seen),
          }
        : player,
    ),
  };
}
