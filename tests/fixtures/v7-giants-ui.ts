import {
  applyCommandV7,
  resolveCityGrowthV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { unitAtV7 } from "./v7-goblin-arena";
import { rewardStateV7 } from "./v7-dinosaur-arena";
import { iceFieldV7 } from "./v7-ice-folk";
import { at, fieldDefenseV7, fieldV7 } from "./v7-revision20";

/**
 * The giants' signatures, UI fixtures (`pulp_wars-w49.32`): one hand-built
 * scene per signature on the two-seat field of tests/fixtures/
 * v7-revision20.ts (seat 0 is the human and active; seat 0's capital at
 * (8, 8), seat 1's at (2, 8); villages (5, 5), (8, 5), (5, 8); every other
 * land tile open Grass; every seat has every technology). Achievements are
 * unlocked so that no command tail opens a notice over the board. Used by
 * the presentation, DOM and canvas tests and by
 * scripts/browser-giants-review-v7.ts; no scene plays a match.
 */
export const GIANTS_UI_V7 = {
  crush: {
    juggernaut: at(3, 3),
    /** A Zombie with a Skeleton behind it: crushed, the Skeleton hurt. */
    blocked: at(4, 3),
    blocker: at(5, 3),
    /** A Zombie with open Grass behind it: pushed, not crushed. */
    free: at(3, 4),
    /** Human scouts that see the tiles behind the two Zombies. */
    scoutEast: at(6, 2),
    scoutSouth: at(2, 6),
  },
  swallow: {
    abomination: at(3, 3),
    /** A Knight at 9 HP: swallowable (12 or less). */
    knight: at(4, 3),
    /** A full Guard (17 HP): too big, attack only. */
    guard: at(3, 4),
    /** A Fighter at 6 HP: swallowable too. */
    fighter: at(2, 2),
  },
  toss: {
    troll: at(5, 3),
    goblin: at(4, 3),
    goblin2: at(5, 2),
    enemyFighter: at(8, 3),
    enemyGuard: at(8, 2),
    /** The landing tile next to both enemies. */
    landing: at(7, 3),
  },
  stomp: {
    brontosaurus: at(4, 3),
    fighter: at(5, 3),
    /** A Champion at 6 HP: the Stomp's 4 leaves it at 2. */
    champion: at(4, 4),
    knight: at(3, 2),
    /** An empty tile around it with a Field Defense: smashed. */
    fieldDefense: at(5, 4),
  },
  overstride: {
    colossus: at(3, 3),
    fighter: at(4, 3),
    /** The tile the offered Move steps over the Fighter to reach. */
    beyond: at(5, 4),
  },
  glacial: {
    frostGiant: at(4, 3),
    /** A Chilled Guard the Frost Giant's hit leaves at 8 or less. */
    target: at(5, 3),
    shardFighter: at(6, 2),
    shardKnight: at(6, 4),
  },
  siege: {
    titan: at(3, 7),
    /** Seat 1's walled capital, a Guard on it, Field Defense on it. */
    centre: at(2, 8),
  },
  breakOff: {
    giant: at(4, 3),
    /** The two tiles the Break Off review picks (in (y, x) order). */
    first: at(3, 2),
    second: at(5, 4),
  },
} as const satisfies Readonly<
  Record<string, Readonly<Record<string, CoordV7>>>
>;

function unlockedV7(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map(
        (entitlement) => ({ ...entitlement, unlocked: true }),
      ),
    })),
  });
}

function applyHumanV7(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

/** Crushing Shove: the Human Juggernaut beside two Undead Zombies. */
export function giantsCrushFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.crush;
  return unlockedV7(
    fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at.juggernaut },
        { seat: 1, role: "GUARD", at: at.blocked },
        { seat: 1, role: "FIGHTER", at: at.blocker },
        { seat: 1, role: "GUARD", at: at.free },
        // Two Human scouts that see the tiles behind both Zombies.
        { seat: 0, role: "MARKSMAN", at: at.scoutEast },
        { seat: 0, role: "MARKSMAN", at: at.scoutSouth },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    ),
  );
}

/** Swallow: the Abomination beside a wounded Knight, a Guard, a Fighter. */
export function giantsSwallowFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.swallow;
  return unlockedV7(
    fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at.abomination, hp: 24 },
        { seat: 1, role: "KNIGHT", at: at.knight, hp: 9 },
        { seat: 1, role: "GUARD", at: at.guard },
        { seat: 1, role: "FIGHTER", at: at.fighter, hp: 6 },
      ],
      { factions: ["UNDEAD", "ORIGINAL"] },
    ),
  );
}

/** The same Abomination after swallowing the Knight (its belly badge). */
export function giantsSwallowedFixtureV7(): GameStateV7 {
  const state = giantsSwallowFixtureV7();
  const at = GIANTS_UI_V7.swallow;
  return applyHumanV7(state, {
    kind: "SWALLOW",
    unitId: idAt(state, at.abomination),
    targetUnitId: idAt(state, at.knight),
  });
}

/** Goblin Toss: the Troll with two Goblins, Humans past a gap. */
export function giantsTossFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.toss;
  return unlockedV7(
    fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at.troll },
        { seat: 0, role: "FIGHTER", at: at.goblin },
        { seat: 0, role: "FIGHTER", at: at.goblin2 },
        { seat: 1, role: "FIGHTER", at: at.enemyFighter },
        { seat: 1, role: "GUARD", at: at.enemyGuard },
      ],
      { factions: ["GOBLIN", "ORIGINAL"] },
    ),
  );
}

/** Thunder Stomp: the Brontosaurus among three Humans, a Field Defense. */
export function giantsStompFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.stomp;
  return unlockedV7(
    fieldDefenseV7(
      fieldV7(
        [
          { seat: 0, role: "JUGGERNAUT", at: at.brontosaurus },
          { seat: 1, role: "FIGHTER", at: at.fighter },
          { seat: 1, role: "SWORDSMAN", at: at.champion, hp: 6 },
          { seat: 1, role: "KNIGHT", at: at.knight },
        ],
        { factions: ["DINOSAUR", "ORIGINAL"] },
      ),
      at.fieldDefense,
    ),
  );
}

/** Overstride: the Colossus, a Human Fighter in front of it. */
export function giantsOverstrideFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.overstride;
  return unlockedV7(
    fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at.colossus },
        { seat: 1, role: "FIGHTER", at: at.fighter },
      ],
      { factions: ["MARTIAN", "ORIGINAL"] },
    ),
  );
}

/** Glacial Smash: the Frost Giant, a Frozen Guard, two Humans round it. */
export function giantsGlacialFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.glacial;
  return unlockedV7(
    iceFieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at.frostGiant },
        {
          seat: 1,
          role: "GUARD",
          at: at.target,
          hp: 14,
          frozen: { turnsLeft: 1 },
        },
        { seat: 1, role: "FIGHTER", at: at.shardFighter },
        { seat: 1, role: "KNIGHT", at: at.shardKnight },
      ],
      { factions: ["ICE_FOLK", "ORIGINAL"] },
    ),
  );
}

/**
 * Siege Hammer: the Brass Titan next to seat 1's capital, which took the
 * Walls reward, a Guard and a Field Defense on its centre.
 */
export function giantsSiegeFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.siege;
  const state = fieldDefenseV7(
    fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at.titan },
        { seat: 1, role: "GUARD", at: at.centre },
      ],
      { factions: ["DWARF", "ORIGINAL"] },
    ),
    at.centre,
  );
  return unlockedV7(walledCityV7(state, at.centre));
}

/**
 * Grows the city on `centre` to level 3 through three Farms (its first
 * free territory tiles) and gives it the level-2 Stockpile and the level-3
 * Walls (as tests/fixtures/v7-dinosaur-arena.ts grows a reward city).
 */
export function walledCityV7(state: GameStateV7, centre: CoordV7): GameStateV7 {
  const city = state.cities.find(
    (candidate) => candidate.at.x === centre.x && candidate.at.y === centre.y,
  );
  if (city === undefined) throw new Error("walled city missing");
  const farms = state.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !state.units.some(
          (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
        ),
    )
    .slice(0, 3);
  if (farms.length !== 3) throw new Error("walled city farm tiles missing");
  const economicPopulation = city.economicPopulation + farms.length * 2;
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation,
    economicPopulation,
  ).city;
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + farms.length,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...grown,
            economicPopulation,
            rewards: [
              { reachedLevel: 2, reward: "STOCKPILE" as const },
              { reachedLevel: 3, reward: "WALLS" as const },
            ],
          }
        : candidate,
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        farms.some((farm) => farm.at.x === tile.at.x && farm.at.y === tile.at.y)
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: "FERTILE_GROUND" as const,
              improvement: "FARM" as const,
            }
          : tile,
      ),
    },
    populationContributions: [
      ...state.populationContributions,
      ...farms.map((tile, index) => ({
        id: state.nextEntityId + index,
        cityId: city.id,
        category: "LIVE" as const,
        amount: 2,
        source: {
          kind: "IMPROVEMENT" as const,
          improvement: "FARM" as const,
          at: tile.at,
        },
      })),
    ],
  });
}

/** The same capital after the Titan's blow: its Walls razed. */
export function giantsSiegeRazedFixtureV7(): GameStateV7 {
  const state = giantsSiegeFixtureV7();
  const at = GIANTS_UI_V7.siege;
  return applyHumanV7(state, {
    kind: "ATTACK",
    unitId: idAt(state, at.titan),
    targetUnitId: idAt(state, at.centre),
  });
}

/** Break Off: the Gingerbread Giant at 40 HP on open Grass. */
export function giantsBreakOffFixtureV7(): GameStateV7 {
  const at = GIANTS_UI_V7.breakOff;
  return unlockedV7(
    fieldV7([{ seat: 0, role: "JUGGERNAUT", at: at.giant }], {
      factions: ["CANDY", "ORIGINAL"],
    }),
  );
}

/** The Giant after its Break Off: two Gingerbread Men beside it. */
export function giantsGingerbreadFixtureV7(): GameStateV7 {
  const state = giantsBreakOffFixtureV7();
  const at = GIANTS_UI_V7.breakOff;
  return applyHumanV7(state, {
    kind: "BREAK_OFF",
    unitId: idAt(state, at.giant),
    tiles: [at.first, at.second],
  });
}

/**
 * The reward dialog's giant card: a Goblin capital at level 6 choosing its
 * reward (tests/fixtures/v7-dinosaur-arena.ts `rewardStateV7`).
 */
export function giantsRewardFixtureV7(): GameStateV7 {
  return unlockedV7(rewardStateV7("JUGGERNAUT", "GOBLIN").state);
}
