/**
 * Game states for the victory-wave review (bead pulp_wars-556y,
 * docs/art/VICTORY_WAVE.md): a match a moment before the viewer wins, and
 * the same match won. Hand-built, no AI move is played. Loaded in the
 * browser through the Vite dev server by scripts/art/victory-wave/review.ts;
 * nothing here is part of the game build.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ~~~~~~~~~~~~~~      ^: Mountain   f: Forest   ~: water
 *    1   ~~..^^^...ff~~      C: the viewer's capital (x 4, y 3)
 *    2   ~...^^^..fff.~      S: the viewer's second city (x 10, y 8)
 *    3   ~...C......f.~      R: the rival's capital (x 2, y 7), the
 *    4   ~.ff.........~         viewer's once won by elimination
 *    5   ~fff....^^...~      V: a Village
 *    6   ~ff.....^^..~~
 *    7   ~.R....ff...~~      Most of the land is in no one's borders.
 *    8   ~~....fff.S..~
 *    9   ~~~...ff.....~
 *    A   ~~~~....V...~~
 *    B   ~~~~~..~~..~~~
 *    C   ~~~~~~~~~~~~~~
 *    D   ~~~~~~~~~~~~~~
 * ```
 */
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  buildMissionStateV7,
  createPlayableGameV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
} from "../../../src/engine/index";

export const VICTORY_SIZE = 14;
const CAPITAL: CoordV7 = { x: 4, y: 3 };
const SECOND: CoordV7 = { x: 10, y: 8 };
const RIVAL: CoordV7 = { x: 2, y: 7 };

const TERRAIN = [
  "~~~~~~~~~~~~~~",
  "~~..^^^...ff~~",
  "~...^^^..fff.~",
  "~..........f.~",
  "~.ff.........~",
  "~fff....^^...~",
  "~ff.....^^..~~",
  "~......ff...~~",
  "~~....fff....~",
  "~~~...ff.....~",
  "~~~~........~~",
  "~~~~~..~~..~~~",
  "~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~",
] as const;

const RESOURCES = TERRAIN.map((row) => ".".repeat(row.length));

function mission(
  faction: FactionIdV7,
  rival: FactionIdV7,
): MissionDefinitionV7 {
  return {
    id: "VICTORY_WAVE_REVIEW",
    revision: 1,
    hidden: true,
    size: VICTORY_SIZE,
    seed: 1,
    terrain: [...TERRAIN],
    resources: [...RESOURCES],
    biome: "PLAINS",
    villages: [{ x: 8, y: 10 }],
    aiMode: "RIVAL",
    seats: [
      {
        faction,
        coins: 0,
        technologies: [],
        cities: [
          { at: CAPITAL, level: 1, rewards: [] },
          { at: SECOND, level: 1, rewards: [] },
        ],
        units: [
          { role: "FIGHTER", at: { x: 5, y: 4 } },
          { role: "FIGHTER", at: { x: 3, y: 7 } },
          { role: "FIGHTER", at: { x: 7, y: 8 } },
        ],
        reveal: {
          radius: 0,
          rects: [{ x0: 0, y0: 0, x1: VICTORY_SIZE - 1, y1: VICTORY_SIZE - 1 }],
        },
      },
      {
        faction: rival,
        coins: 0,
        technologies: [],
        cities: [{ at: RIVAL, level: 1, rewards: [] }],
        units: [{ role: "FIGHTER", at: RIVAL }],
        reveal: { radius: 0 },
      },
    ],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  };
}

export interface VictorySceneOptions {
  readonly faction: FactionIdV7;
  readonly rival?: FactionIdV7;
  /** `BEFORE`: the match on; `WON`: the viewer has won. */
  readonly stage: "BEFORE" | "WON";
  /**
   * A Perfection match won by the score: the rival keeps its city and its
   * land. Otherwise the viewer has taken the rival's capital and won by
   * elimination.
   */
  readonly byScore?: boolean;
  /** The generated 25 x 25 map of eight seats instead (the cost). */
  readonly large?: boolean;
}

export function victoryScene(options: VictorySceneOptions): GameStateV7 {
  if (options.large === true) return largeVictoryScene(options.stage);
  const rival =
    options.rival ?? (options.faction === "UNDEAD" ? "GOBLIN" : "UNDEAD");
  const base = buildMissionStateV7(mission(options.faction, rival), {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: VICTORY_SIZE,
    height: VICTORY_SIZE,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [options.faction, rival],
    mapType: "CONTINENTS",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  const viewer = base.humanPlayerId;
  const other = base.players.find((player) => player.id !== viewer);
  if (other === undefined) throw new Error("no rival");
  const before: GameStateV7 = { ...base, commandIndex: 40, round: 12 };
  if (options.stage === "BEFORE") return before;
  if (options.byScore === true)
    return {
      ...before,
      commandIndex: 41,
      round: 30,
      outcome: {
        kind: "VICTORY",
        winnerId: viewer,
        decidedBy: "SCORE",
        ranking: [viewer, other.id],
      },
    };
  const taken = before.cities.find(
    (city) => city.at.x === RIVAL.x && city.at.y === RIVAL.y,
  );
  if (taken === undefined) throw new Error("no rival capital");
  const victor = before.units.find((unit) => unit.ownerId === viewer);
  return {
    ...before,
    commandIndex: 41,
    cities: before.cities.map((city) =>
      city.id === taken.id ? { ...city, ownerId: viewer } : city,
    ),
    units: before.units
      .filter((unit) => unit.ownerId === viewer)
      .map((unit) =>
        unit.id === victor?.id ? { ...unit, at: { ...RIVAL } } : unit,
      ),
    players: before.players.map((player) =>
      player.id === other.id
        ? { ...player, status: "ELIMINATED" as const }
        : player,
    ),
    outcome: { kind: "VICTORY", winnerId: viewer },
  };
}

/**
 * The largest map: a generated 25 x 25 match of eight seats, every cell
 * explored, which the viewer (Candy) has won. The cost of a frame is
 * measured on it.
 */
function largeVictoryScene(stage: "BEFORE" | "WON"): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 77,
    width: 25,
    height: 25,
    aiCount: 7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [
      "CANDY",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "ORIGINAL",
    ],
    mapType: "CONTINENTS",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  const explored: GameStateV7 = {
    ...state,
    commandIndex: 40,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, explored: state.board.tiles.map((tile) => tile.at) }
        : player,
    ),
  };
  if (stage === "BEFORE") return explored;
  return {
    ...explored,
    commandIndex: 41,
    outcome: {
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      decidedBy: "SCORE",
      ranking: [
        state.humanPlayerId,
        ...state.players
          .map((player) => player.id)
          .filter((id) => id !== state.humanPlayerId),
      ],
    },
  };
}
