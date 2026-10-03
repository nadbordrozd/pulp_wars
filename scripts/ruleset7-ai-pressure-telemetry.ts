/**
 * Ruleset 7 Normal AI pressure telemetry (`pulp_wars-9s0.1`).
 *
 * Runs Normal-vs-Normal matches and replays each accepted command log
 * through the reducer to measure how expansionist and aggressive every seat
 * plays: first contact, first attack, first siege and capture, the share of
 * its turns with units in or next to enemy territory, quiet runs, what its
 * units do, where its Coins go, how fast it takes villages, and how all of
 * that depends on the gap between its cities and the nearest known enemy
 * city. It is diagnostic tooling: nothing here is read by the policy, and no
 * gate runs it. Matches are independent and seeded, so results do not depend
 * on `--jobs`.
 *
 *   npx tsx scripts/ruleset7-ai-pressure-telemetry.ts
 *     [--pairings HU,UH,...,HUGD] [--maps dry-land,pangea,...]
 *     [--sizes 11,14] [--multi-size 16] [--seeds 3] [--first-seed 0]
 *     [--max-rounds 150] [--jobs N] [--output file.json] [--markdown]
 *     [--from-output a.json,b.json] [--turtle]
 *
 * `--turtle` makes seat 0 a defender that never leaves home: it plays the
 * Normal policy's best command that is not a Move ending more than three
 * tiles from its own cities, onto a Port, or a landing. It develops, trains,
 * and kills whatever comes into reach, like a player who sits behind their
 * walls, so the other seats' numbers show how much pressure the policy puts
 * on such a player and how long it needs to take the capital.
 *
 * `--from-output` runs no match: it reads the matches of earlier `--output`
 * files and summarises the cells the other parameters select.
 *
 * A pairing is one letter per seat: `H` Human, `U` Undead, `G` Goblin, `D`
 * Dinosaur, `M` Martian, `I` Ice Folk. Two-letter pairings run on every `--sizes` value, longer ones on
 * `--multi-size`.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../src/ai/v7";
import { runAiMatchV7 } from "../src/headless/v7";
import { duplicateFactionV7 } from "../src/engine/v7/setup";
import type { PlayerId } from "../src/engine/model/ids";
import type { CommandV7 } from "../src/engine/v7/commands";
import { viewForV7, type PlayerViewV7 } from "../src/engine/v7/view";
import {
  RULESET_7_ID,
  type AiCountV7,
  type BoardSizeV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../src/engine/v7/types";
import {
  arePlayersAlliedV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
} from "../src/engine/v7/economy";
import { applyCommandV7, createPlayableGameV7 } from "../src/engine/v7/reducer";

const FACTION_BY_LETTER: Readonly<Record<string, FactionIdV7>> = {
  H: "ORIGINAL",
  U: "UNDEAD",
  G: "GOBLIN",
  D: "DINOSAUR",
  M: "MARTIAN",
  I: "ICE_FOLK",
};
const MAP_BY_NAME: Readonly<Record<string, MapTypeV7>> = {
  "dry-land": "DRY_LAND",
  pangea: "PANGEA",
  continents: "CONTINENTS",
  archipelago: "ARCHIPELAGO",
  lakes: "LAKES",
};
const ROUND_BUCKETS = [
  { label: "1-10", from: 1, to: 10 },
  { label: "11-20", from: 11, to: 20 },
  { label: "21-30", from: 21, to: 30 },
  { label: "31+", from: 31, to: Number.POSITIVE_INFINITY },
] as const;
const GAP_BUCKETS = [
  { label: "<=3", from: 0, to: 3 },
  { label: "4-5", from: 4, to: 5 },
  { label: "6-8", from: 6, to: 8 },
  { label: "9+", from: 9, to: Number.POSITIVE_INFINITY },
] as const;
const START_GAP_BUCKETS = [
  { label: "<=6", from: 0, to: 6 },
  { label: "7-9", from: 7, to: 9 },
  { label: "10-13", from: 10, to: 13 },
  { label: "14+", from: 14, to: Number.POSITIVE_INFINITY },
] as const;
const ARMY_ROUNDS = [5, 10, 15, 20, 30, 40] as const;

interface Cell {
  /** Seat 0 never leaves home (`--turtle`). */
  readonly turtle: boolean;
  readonly pairing: string;
  readonly mapType: MapTypeV7;
  readonly size: BoardSizeV7;
  readonly seed: number;
  readonly maxRounds: number;
}

interface Spend {
  military: number;
  economy: number;
  research: number;
  earned: number;
}

interface GapPressure {
  turns: number;
  front1: number;
  front2: number;
}

interface SeatPressure {
  readonly seat: number;
  readonly faction: FactionIdV7;
  /** Chebyshev distance from the own capital to the nearest other capital. */
  readonly startGap: number;
  turns: number;
  /** First round an enemy city or enemy territory was explored. */
  contactRound: number | null;
  /** First round an enemy city center was explored, and the gap then. */
  cityKnownRound: number | null;
  gapAtCityKnown: number | null;
  firstAttackRound: number | null;
  /** First attack on a unit on an enemy city center, or a step onto one. */
  firstSiegeRound: number | null;
  firstCityCaptureRound: number | null;
  cityCaptures: number;
  villageCaptures: number;
  /** Rounds from a village's first sighting by the seat to its capture. */
  villageLatencies: number[];
  /** Explored neutral villages summed over the seat's turns. */
  knownVillageTurns: number;
  citiesAtRound: Record<string, number>;
  armyAtRound: Record<string, number>;
  /**
   * Own turns after first contact with no hostile land unit within two
   * tiles of an own city (the seat is free to attack), those with units at
   * the front, and the longest run of such turns without any.
   */
  freeTurns: number;
  freeFront1Turns: number;
  freeFront2Turns: number;
  longestFreeQuietRun: number;
  /** Own turns after first contact. */
  contactTurns: number;
  front1Turns: number;
  front2Turns: number;
  front3Turns: number;
  frontUnitTurns: number;
  longestQuietRun: number;
  quietRunsOfFourOrMore: number;
  /** Front presence lost (to deaths or withdrawal) and turns until back. */
  wipes: number;
  withdrawals: number;
  returnLatencies: number[];
  neverReturned: number;
  byGap: Record<string, GapPressure>;
  /** End-of-turn unit-turns of mobile land units, by what the unit did. */
  unitTurns: {
    total: number;
    front: number;
    garrisonIdle: number;
    homeIdle: number;
    fieldIdle: number;
    advancing: number;
    retreating: number;
    otherMoved: number;
    acted: number;
    /** Embarked units, and those of them that did not move this turn. */
    embarked: number;
    embarkedIdle: number;
    /** Raiders that end the turn within two tiles of an own city. */
    raiders: number;
    raidersAtHome: number;
  };
  spend: Record<string, Spend>;
  bankAtEndTurns: number;
  cityTurns: number;
  fullCityTurns: number;
}

/**
 * What the turtle (seat 0) sees: hostile land units in or next to its
 * territory at the end of each of its turns.
 */
interface TurtleView {
  turns: number;
  /** First round with a hostile unit in or next to its territory. */
  firstPressureRound: number | null;
  /** Turns from that round on, and those with one, two, or more units. */
  turnsSince: number;
  pressure1Turns: number;
  pressure2Turns: number;
  pressure3Turns: number;
  hostileUnitTurns: number;
  longestCalmRun: number;
  calmRunsOfFiveOrMore: number;
}

interface MatchPressure extends Cell {
  readonly termination: string;
  readonly rounds: number;
  readonly errors: number;
  readonly stalls: number;
  readonly winnerSeat: number | null;
  readonly outcomeKind: string | null;
  readonly finalHash: string;
  readonly neutralVillages: number;
  readonly turtleView: TurtleView | null;
  readonly seats: SeatPressure[];
}

const args = process.argv.slice(2);

function valueAfter(name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function integer(name: string, fallback: number): number {
  const raw = valueAfter(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${name} must be a non-negative integer`);
  return value;
}

function key(at: CoordV7): string {
  return `${at.x},${at.y}`;
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function bucketOf<T extends { from: number; to: number; label: string }>(
  buckets: readonly T[],
  value: number,
): string {
  return (
    buckets.find((bucket) => value >= bucket.from && value <= bucket.to)
      ?.label ?? "?"
  );
}

function buildCells(): Cell[] {
  const pairings = (valueAfter("--pairings") ?? "HU,UH,GD,DG,HH,UU,GG,DD")
    .split(",")
    .map((item) => item.trim().toUpperCase());
  const maps = (
    valueAfter("--maps") ?? "dry-land,pangea,continents,archipelago,lakes"
  )
    .split(",")
    .map((item) => {
      const map = MAP_BY_NAME[item.trim().toLowerCase()];
      if (map === undefined) throw new RangeError(`Unknown map ${item}`);
      return map;
    });
  const sizes = (valueAfter("--sizes") ?? "11,14")
    .split(",")
    .map((item) => Number(item) as BoardSizeV7);
  const multiSize = integer("--multi-size", 16) as BoardSizeV7;
  const seeds = integer("--seeds", 3);
  const firstSeed = integer("--first-seed", 0);
  const maxRounds = integer("--max-rounds", 150);
  const turtle = args.includes("--turtle");
  const cells: Cell[] = [];
  for (const pairing of pairings) {
    for (const letter of pairing)
      if (FACTION_BY_LETTER[letter] === undefined)
        throw new RangeError(`Unknown pairing ${pairing}`);
    for (const mapType of maps)
      for (const size of pairing.length === 2 ? sizes : [multiSize])
        for (let seed = firstSeed; seed < firstSeed + seeds; seed += 1)
          cells.push({ turtle, pairing, mapType, size, seed, maxRounds });
  }
  return cells;
}

function emptySeat(
  seat: number,
  faction: FactionIdV7,
  startGap: number,
): SeatPressure {
  return {
    seat,
    faction,
    startGap,
    turns: 0,
    contactRound: null,
    cityKnownRound: null,
    gapAtCityKnown: null,
    firstAttackRound: null,
    firstSiegeRound: null,
    firstCityCaptureRound: null,
    cityCaptures: 0,
    villageCaptures: 0,
    villageLatencies: [],
    knownVillageTurns: 0,
    citiesAtRound: {},
    armyAtRound: {},
    freeTurns: 0,
    freeFront1Turns: 0,
    freeFront2Turns: 0,
    longestFreeQuietRun: 0,
    contactTurns: 0,
    front1Turns: 0,
    front2Turns: 0,
    front3Turns: 0,
    frontUnitTurns: 0,
    longestQuietRun: 0,
    quietRunsOfFourOrMore: 0,
    wipes: 0,
    withdrawals: 0,
    returnLatencies: [],
    neverReturned: 0,
    byGap: Object.fromEntries(
      GAP_BUCKETS.map((bucket) => [
        bucket.label,
        { turns: 0, front1: 0, front2: 0 },
      ]),
    ),
    unitTurns: {
      total: 0,
      front: 0,
      garrisonIdle: 0,
      homeIdle: 0,
      fieldIdle: 0,
      advancing: 0,
      retreating: 0,
      otherMoved: 0,
      acted: 0,
      embarked: 0,
      embarkedIdle: 0,
      raiders: 0,
      raidersAtHome: 0,
    },
    spend: Object.fromEntries(
      ROUND_BUCKETS.map((bucket) => [
        bucket.label,
        { military: 0, economy: 0, research: 0, earned: 0 },
      ]),
    ),
    bankAtEndTurns: 0,
    cityTurns: 0,
    fullCityTurns: 0,
  };
}

interface SeatRun {
  freeQuietRun: number;
  quietRun: number;
  lostAtTurn: number | null;
  previousFrontIds: number[];
  turnStartAt: Map<number, CoordV7>;
  villageSeen: Map<string, number>;
  turnIndex: number;
}

export function runCell(cell: Cell): MatchPressure {
  const factions = [...cell.pairing].map(
    (letter) => FACTION_BY_LETTER[letter] as FactionIdV7,
  );
  const setup: MatchSetupV7 = {
    rulesetId: RULESET_7_ID,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    curiosities: false,
    seed: cell.seed,
    width: cell.size,
    height: cell.size,
    aiCount: (factions.length - 1) as AiCountV7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: cell.mapType,
    // Mirror pairings (HH, UU, GG, DD, MM, II and repeated four-seat
    // mixes) use the headless and test only mirror option
    // (docs/architecture/HEADLESS_SIMULATION.md); other cells are unchanged.
    ...(duplicateFactionV7(factions) === null
      ? {}
      : { allowDuplicateFactions: true as const }),
  };
  const result = cell.turtle
    ? runTurtleMatch(setup, cell.maxRounds)
    : runAiMatchV7(setup, {
        maxRounds: cell.maxRounds,
        recordCheckpointHashes: false,
      });
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state: GameStateV7 = created.state;
  const capitals = new Map(
    state.players.map((player) => [
      player.id as number,
      state.cities.find((city) => city.id === player.originalCapitalCityId)
        ?.at ?? { x: 0, y: 0 },
    ]),
  );
  const seats = new Map<number, SeatPressure>();
  const runs = new Map<number, SeatRun>();
  for (const player of state.players) {
    const own = capitals.get(player.id) as CoordV7;
    const startGap = Math.min(
      ...state.players
        .filter((other) => other.id !== player.id)
        .map((other) => chebyshev(own, capitals.get(other.id) as CoordV7)),
    );
    seats.set(player.id, emptySeat(player.seat, player.faction, startGap));
    runs.set(player.id, {
      freeQuietRun: 0,
      quietRun: 0,
      lostAtTurn: null,
      previousFrontIds: [],
      turnStartAt: new Map(),
      villageSeen: new Map(),
      turnIndex: 0,
    });
  }
  const neutralVillages = state.board.tiles.filter(
    (tile) => tile.site === "VILLAGE" && tile.territoryCityId === null,
  ).length;
  const first = state.turnOrder[0];
  let round = 1;
  let turnOpen: number | null = null;
  const turtleId = state.players.find((player) => player.seat === 0)?.id;
  const turtleView: TurtleView = {
    turns: 0,
    firstPressureRound: null,
    turnsSince: 0,
    pressure1Turns: 0,
    pressure2Turns: 0,
    pressure3Turns: 0,
    hostileUnitTurns: 0,
    longestCalmRun: 0,
    calmRunsOfFiveOrMore: 0,
  };
  let calmRun = 0;

  for (const record of result.commandLog) {
    const before = state;
    const playerId = record.playerId as number;
    const seat = seats.get(playerId) as SeatPressure;
    const run = runs.get(playerId) as SeatRun;
    const command = record.command;
    const hostile = (ownerId: number): boolean =>
      ownerId !== playerId &&
      !arePlayersAlliedV7(before, record.playerId, ownerId as never);
    if (turnOpen !== playerId) {
      turnOpen = playerId;
      run.turnStartAt = new Map(
        before.units
          .filter((unit) => unit.ownerId === record.playerId && unit.hp > 0)
          .map((unit) => [unit.id as number, unit.at]),
      );
    }
    const cityOwnerById = new Map(
      before.cities.map((city) => [city.id as number, city.ownerId as number]),
    );
    const cityByKey = new Map(
      before.cities.map((city) => [key(city.at), city]),
    );
    const actorUnit =
      "unitId" in command
        ? before.units.find((unit) => unit.id === command.unitId)
        : undefined;
    if (command.kind === "ATTACK") {
      const target = before.units.find(
        (unit) => unit.id === command.targetUnitId,
      );
      if (target !== undefined && hostile(target.ownerId)) {
        seat.firstAttackRound ??= round;
        const city = cityByKey.get(key(target.at));
        if (city !== undefined && hostile(city.ownerId))
          seat.firstSiegeRound ??= round;
      }
    }
    if (command.kind === "MOVE") {
      const end = command.path.at(-1);
      const city = end === undefined ? undefined : cityByKey.get(key(end));
      if (city !== undefined && hostile(city.ownerId))
        seat.firstSiegeRound ??= round;
    }
    if (command.kind === "CAPTURE" && actorUnit !== undefined) {
      const city = cityByKey.get(key(actorUnit.at));
      if (city === undefined) {
        seat.villageCaptures += 1;
        const seen = run.villageSeen.get(key(actorUnit.at));
        seat.villageLatencies.push(seen === undefined ? 0 : round - seen);
      } else if (hostile(city.ownerId)) {
        seat.cityCaptures += 1;
        seat.firstSiegeRound ??= round;
        seat.firstCityCaptureRound ??= round;
      }
    }

    if (cell.turtle && command.kind === "END_TURN" && playerId === turtleId) {
      const own = new Set<string>();
      for (const tile of before.board.tiles)
        if (
          tile.territoryCityId !== null &&
          cityOwnerById.get(tile.territoryCityId as number) === playerId
        )
          own.add(key(tile.at));
      const near = (at: CoordV7): boolean => {
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1)
            if (own.has(key({ x: at.x + dx, y: at.y + dy }))) return true;
        return false;
      };
      const pressing = before.units.filter(
        (unit) =>
          unit.hp > 0 &&
          unit.form === "LAND" &&
          hostile(unit.ownerId) &&
          near(unit.at),
      ).length;
      turtleView.turns += 1;
      if (pressing > 0) turtleView.firstPressureRound ??= round;
      if (turtleView.firstPressureRound !== null) {
        turtleView.turnsSince += 1;
        turtleView.hostileUnitTurns += pressing;
        if (pressing >= 1) turtleView.pressure1Turns += 1;
        if (pressing >= 2) turtleView.pressure2Turns += 1;
        if (pressing >= 3) turtleView.pressure3Turns += 1;
        if (pressing === 0) calmRun += 1;
        else {
          if (calmRun >= 5) turtleView.calmRunsOfFiveOrMore += 1;
          calmRun = 0;
        }
        turtleView.longestCalmRun = Math.max(
          turtleView.longestCalmRun,
          calmRun,
        );
      }
    }

    if (command.kind === "END_TURN") {
      const player = before.players.find((item) => item.id === record.playerId);
      const explored = new Set((player?.explored ?? []).map(key));
      const hostileTerritory = new Set<string>();
      const ownTerritory = new Set<string>();
      let contact = false;
      for (const tile of before.board.tiles) {
        if (tile.territoryCityId === null) {
          if (
            tile.site === "VILLAGE" &&
            explored.has(key(tile.at)) &&
            !cityByKey.has(key(tile.at))
          ) {
            seat.knownVillageTurns += 1;
            if (!run.villageSeen.has(key(tile.at)))
              run.villageSeen.set(key(tile.at), round);
          }
          continue;
        }
        const owner = cityOwnerById.get(tile.territoryCityId as number);
        if (owner === undefined) continue;
        if (owner === playerId) ownTerritory.add(key(tile.at));
        else if (hostile(owner)) {
          hostileTerritory.add(key(tile.at));
          if (explored.has(key(tile.at))) contact = true;
        }
      }
      const ownCities = before.cities.filter(
        (city) => city.ownerId === record.playerId,
      );
      const knownEnemyCities = before.cities.filter(
        (city) => hostile(city.ownerId) && explored.has(key(city.at)),
      );
      const gap =
        ownCities.length === 0 || knownEnemyCities.length === 0
          ? null
          : Math.min(
              ...ownCities.flatMap((own) =>
                knownEnemyCities.map((enemy) => chebyshev(own.at, enemy.at)),
              ),
            );
      if (contact) seat.contactRound ??= round;
      if (gap !== null && seat.cityKnownRound === null) {
        seat.cityKnownRound = round;
        seat.gapAtCityKnown = gap;
      }
      seat.turns += 1;
      run.turnIndex += 1;
      seat.bankAtEndTurns += player?.coins ?? 0;
      for (const city of ownCities) {
        seat.cityTurns += 1;
        if (
          assignedUnitCountV7(before, city.id) >=
          cityUnitCapacityV7(before, city)
        )
          seat.fullCityTurns += 1;
      }
      const mobile = before.units.filter(
        (unit) =>
          unit.ownerId === record.playerId &&
          unit.hp > 0 &&
          (unit.form === "LAND" || unit.form === "EMBARKED"),
      );
      for (const at of ARMY_ROUNDS)
        if (round === at) {
          seat.armyAtRound[String(at)] = mobile.length;
          seat.citiesAtRound[String(at)] = ownCities.length;
        }
      const nearFront = (at: CoordV7): boolean => {
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1)
            if (hostileTerritory.has(key({ x: at.x + dx, y: at.y + dy })))
              return true;
        return false;
      };
      const front = mobile.filter((unit) => nearFront(unit.at));
      const enemyCityCoords = knownEnemyCities.map((city) => city.at);
      for (const unit of mobile) {
        seat.unitTurns.total += 1;
        const activation = unit.activation;
        const start = run.turnStartAt.get(unit.id as number) ?? unit.at;
        const moved = start.x !== unit.at.x || start.y !== unit.at.y;
        if (unit.form === "EMBARKED") {
          seat.unitTurns.embarked += 1;
          if (!moved) seat.unitTurns.embarkedIdle += 1;
        }
        if (unit.role === "RAIDER" && unit.form === "LAND") {
          seat.unitTurns.raiders += 1;
          if (ownCities.some((city) => chebyshev(city.at, unit.at) <= 2))
            seat.unitTurns.raidersAtHome += 1;
        }
        if (front.includes(unit)) seat.unitTurns.front += 1;
        else if (moved) {
          const from =
            enemyCityCoords.length === 0
              ? 0
              : Math.min(...enemyCityCoords.map((at) => chebyshev(start, at)));
          const to =
            enemyCityCoords.length === 0
              ? 0
              : Math.min(
                  ...enemyCityCoords.map((at) => chebyshev(unit.at, at)),
                );
          if (to < from) seat.unitTurns.advancing += 1;
          else if (to > from) seat.unitTurns.retreating += 1;
          else seat.unitTurns.otherMoved += 1;
        } else if (
          activation.attacked ||
          activation.captured ||
          activation.specialActed ||
          activation.recovered
        )
          seat.unitTurns.acted += 1;
        else if (
          ownCities.some(
            (city) => city.at.x === unit.at.x && city.at.y === unit.at.y,
          )
        )
          seat.unitTurns.garrisonIdle += 1;
        else if (ownTerritory.has(key(unit.at))) seat.unitTurns.homeIdle += 1;
        else seat.unitTurns.fieldIdle += 1;
      }
      if (seat.contactRound !== null) {
        const invaded = before.units.some(
          (unit) =>
            unit.hp > 0 &&
            unit.form === "LAND" &&
            hostile(unit.ownerId) &&
            ownCities.some((city) => chebyshev(city.at, unit.at) <= 2),
        );
        if (!invaded) {
          seat.freeTurns += 1;
          if (front.length >= 1) seat.freeFront1Turns += 1;
          if (front.length >= 2) seat.freeFront2Turns += 1;
          run.freeQuietRun = front.length === 0 ? run.freeQuietRun + 1 : 0;
          seat.longestFreeQuietRun = Math.max(
            seat.longestFreeQuietRun,
            run.freeQuietRun,
          );
        }
        seat.contactTurns += 1;
        seat.frontUnitTurns += front.length;
        if (front.length >= 1) seat.front1Turns += 1;
        if (front.length >= 2) seat.front2Turns += 1;
        if (front.length >= 3) seat.front3Turns += 1;
        if (gap !== null) {
          const bucket = seat.byGap[bucketOf(GAP_BUCKETS, gap)];
          if (bucket !== undefined) {
            bucket.turns += 1;
            if (front.length >= 1) bucket.front1 += 1;
            if (front.length >= 2) bucket.front2 += 1;
          }
        }
        if (front.length === 0) {
          run.quietRun += 1;
          if (run.previousFrontIds.length > 0) {
            const alive = new Set(
              before.units
                .filter((unit) => unit.hp > 0)
                .map((unit) => unit.id as number),
            );
            if (run.previousFrontIds.every((id) => !alive.has(id)))
              seat.wipes += 1;
            else seat.withdrawals += 1;
            run.lostAtTurn = run.turnIndex;
          }
        } else {
          if (run.quietRun >= 4) seat.quietRunsOfFourOrMore += 1;
          seat.longestQuietRun = Math.max(seat.longestQuietRun, run.quietRun);
          run.quietRun = 0;
          if (run.lostAtTurn !== null) {
            seat.returnLatencies.push(run.turnIndex - run.lostAtTurn);
            run.lostAtTurn = null;
          }
        }
        run.previousFrontIds = front.map((unit) => unit.id as number);
      }
    }

    const applied = applyCommandV7(state, record.playerId, command);
    if (!applied.accepted)
      throw new Error(`REPLAY_REJECTED:${applied.error.code}`);
    state = applied.state;
    const label = bucketOf(ROUND_BUCKETS, round);
    for (const player of state.players) {
      const previous = before.players.find((item) => item.id === player.id);
      const delta = player.coins - (previous?.coins ?? 0);
      if (delta === 0) continue;
      const spend = seats.get(player.id)?.spend[label];
      if (spend === undefined) continue;
      if (delta > 0) spend.earned += delta;
      else if (player.id !== record.playerId) continue;
      else if (
        command.kind === "TRAIN" ||
        command.kind === "LAY_EGG" ||
        command.kind === "TRAIN_NAVAL"
      )
        spend.military -= delta;
      else if (command.kind === "RESEARCH") spend.research -= delta;
      else spend.economy -= delta;
    }
    if (
      command.kind === "END_TURN" &&
      state.turnOrder[state.activeSeatIndex] === first
    )
      round = state.round;
  }
  for (const [playerId, seat] of seats) {
    const run = runs.get(playerId) as SeatRun;
    seat.longestQuietRun = Math.max(seat.longestQuietRun, run.quietRun);
    if (run.quietRun >= 4) seat.quietRunsOfFourOrMore += 1;
    if (run.lostAtTurn !== null) seat.neverReturned += 1;
  }
  const outcome = result.outcome;
  const seatOf = (playerId: number): number =>
    state.players.find((player) => player.id === playerId)?.seat ?? -1;
  return {
    ...cell,
    termination: result.termination,
    rounds: result.rounds,
    errors: result.errors.length,
    stalls: result.stalls.length,
    winnerSeat:
      outcome?.kind === "VICTORY" || outcome?.kind === "HEADLESS_VICTORY"
        ? seatOf(outcome.winnerId)
        : outcome?.kind === "DEFEAT" && factions.length === 2
          ? seatOf(outcome.defeatedByPlayerId)
          : null,
    outcomeKind: outcome?.kind ?? null,
    finalHash: result.stateHash,
    neutralVillages,
    turtleView: cell.turtle
      ? {
          ...turtleView,
          calmRunsOfFiveOrMore:
            turtleView.calmRunsOfFiveOrMore + Number(calmRun >= 5),
        }
      : null,
    seats: [...seats.values()],
  };
}

/**
 * A match in which seat 0 is the turtle: every seat plays the Normal policy,
 * and seat 0 takes its best command that keeps its units at home.
 */
export function runTurtleMatch(
  setup: MatchSetupV7,
  maxRounds: number,
): {
  readonly commandLog: readonly {
    readonly playerId: PlayerId;
    readonly command: CommandV7;
  }[];
  readonly outcome: GameStateV7["outcome"];
  readonly termination: string;
  readonly rounds: number;
  readonly errors: readonly unknown[];
  readonly stalls: readonly unknown[];
  readonly stateHash: string;
} {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state: GameStateV7 = created.state;
  const turtleId = state.players.find((player) => player.seat === 0)?.id;
  const commandLog: { playerId: PlayerId; command: CommandV7 }[] = [];
  const errors: string[] = [];
  let termination = "COMMAND_CAP";
  let turnPlayer: PlayerId | undefined;
  let commandsThisTurn = 0;
  const staysHome = (view: PlayerViewV7, command: CommandV7): boolean => {
    if (command.kind === "DISEMBARK") return false;
    if (command.kind !== "MOVE") return true;
    const end = command.path.at(-1);
    if (end === undefined) return true;
    const tile = view.board.tiles[end.y * view.board.width + end.x];
    if (tile?.explored === true && tile.improvement === "PORT") return false;
    return view.cities.some(
      (city) => city.ownerId === view.viewer.id && chebyshev(city.at, end) <= 3,
    );
  };
  while (state.outcome === null) {
    if (state.commandIndex >= 30_000) break;
    if (state.round > maxRounds) {
      termination = "ROUND_CAP";
      break;
    }
    const actor = state.turnOrder[state.activeSeatIndex] as PlayerId;
    if (actor !== turnPlayer) {
      turnPlayer = actor;
      commandsThisTurn = 0;
    }
    const view = viewForV7(state, actor);
    let command: CommandV7 | null;
    try {
      const chosen = chooseNormalCommandV7(view);
      const candidates =
        actor === turtleId
          ? chosen.candidates.filter((candidate) =>
              staysHome(view, candidate.command),
            )
          : chosen.candidates;
      command = chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        { ...chosen, candidates, command: candidates[0]?.command ?? null },
      );
    } catch (cause) {
      errors.push(cause instanceof Error ? cause.message : String(cause));
      termination = "ERROR";
      break;
    }
    if (command === null) {
      termination = "STALL";
      break;
    }
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted) {
      errors.push(`COMMAND_REJECTED:${applied.error.code}`);
      termination = "ERROR";
      break;
    }
    commandLog.push({ playerId: actor, command });
    state = applied.state;
    commandsThisTurn = command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
  }
  if (state.outcome !== null) termination = "OUTCOME";
  return {
    commandLog,
    outcome: state.outcome,
    termination,
    rounds: state.round,
    errors,
    stalls: termination === "STALL" ? ["NO_PUBLIC_COMMAND"] : [],
    stateHash: "",
  };
}

// ---------------------------------------------------------------------------
// Summary

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.floor(q * sorted.length))
  ] as number;
}

function total(values: readonly number[]): number {
  return values.reduce((left, right) => left + right, 0);
}

function share(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((1000 * part) / whole) / 10;
}

function present(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => value !== null);
}

function seatSummary(seats: readonly SeatPressure[]) {
  const spend = Object.fromEntries(
    ROUND_BUCKETS.map((bucket) => {
      const rows = seats.map((seat) => seat.spend[bucket.label] as Spend);
      const military = total(rows.map((row) => row.military));
      const economy = total(rows.map((row) => row.economy));
      const research = total(rows.map((row) => row.research));
      const spent = military + economy + research;
      return [
        bucket.label,
        {
          militaryShare: share(military, spent),
          economyShare: share(economy, spent),
          researchShare: share(research, spent),
          spentOfEarned: share(spent, total(rows.map((row) => row.earned))),
        },
      ];
    }),
  );
  const unit = (name: keyof SeatPressure["unitTurns"]) =>
    share(
      total(seats.map((seat) => seat.unitTurns[name])),
      total(seats.map((seat) => seat.unitTurns.total)),
    );
  const contactTurns = total(seats.map((seat) => seat.contactTurns));
  return {
    seatGames: seats.length,
    contactRound: {
      median: median(present(seats.map((seat) => seat.contactRound))),
      never: seats.filter((seat) => seat.contactRound === null).length,
    },
    firstAttackRound: {
      median: median(present(seats.map((seat) => seat.firstAttackRound))),
      never: seats.filter((seat) => seat.firstAttackRound === null).length,
    },
    firstSiegeRound: {
      median: median(present(seats.map((seat) => seat.firstSiegeRound))),
      p75: quantile(present(seats.map((seat) => seat.firstSiegeRound)), 0.75),
      never: seats.filter((seat) => seat.firstSiegeRound === null).length,
    },
    contactToSiegeRounds: median(
      seats.flatMap((seat) =>
        seat.firstSiegeRound === null || seat.contactRound === null
          ? []
          : [seat.firstSiegeRound - seat.contactRound],
      ),
    ),
    firstCityCaptureRound: {
      median: median(present(seats.map((seat) => seat.firstCityCaptureRound))),
      never: seats.filter((seat) => seat.firstCityCaptureRound === null).length,
    },
    freePressure: {
      front1Share: share(
        total(seats.map((seat) => seat.freeFront1Turns)),
        total(seats.map((seat) => seat.freeTurns)),
      ),
      front2Share: share(
        total(seats.map((seat) => seat.freeFront2Turns)),
        total(seats.map((seat) => seat.freeTurns)),
      ),
      longestQuietRunMedian: median(
        seats.map((seat) => seat.longestFreeQuietRun),
      ),
      longestQuietRunP90: quantile(
        seats.map((seat) => seat.longestFreeQuietRun),
        0.9,
      ),
      seatsWithQuietRunOfFour: share(
        seats.filter((seat) => seat.longestFreeQuietRun >= 4).length,
        seats.length,
      ),
    },
    pressure: {
      front1Share: share(
        total(seats.map((seat) => seat.front1Turns)),
        contactTurns,
      ),
      front2Share: share(
        total(seats.map((seat) => seat.front2Turns)),
        contactTurns,
      ),
      front3Share: share(
        total(seats.map((seat) => seat.front3Turns)),
        contactTurns,
      ),
      meanFrontUnits:
        contactTurns === 0
          ? null
          : Math.round(
              (100 * total(seats.map((seat) => seat.frontUnitTurns))) /
                contactTurns,
            ) / 100,
      longestQuietRunMedian: median(seats.map((seat) => seat.longestQuietRun)),
      longestQuietRunP90: quantile(
        seats.map((seat) => seat.longestQuietRun),
        0.9,
      ),
      seatsWithQuietRunOfFour: share(
        seats.filter((seat) => seat.quietRunsOfFourOrMore > 0).length,
        seats.length,
      ),
    },
    afterFrontLost: {
      wipes: total(seats.map((seat) => seat.wipes)),
      withdrawals: total(seats.map((seat) => seat.withdrawals)),
      returnTurnsMedian: median(seats.flatMap((seat) => seat.returnLatencies)),
      returnTurnsP90: quantile(
        seats.flatMap((seat) => seat.returnLatencies),
        0.9,
      ),
      neverReturned: total(seats.map((seat) => seat.neverReturned)),
    },
    byGap: Object.fromEntries(
      GAP_BUCKETS.map((bucket) => {
        const rows = seats.map(
          (seat) => seat.byGap[bucket.label] as GapPressure,
        );
        const turns = total(rows.map((row) => row.turns));
        return [
          bucket.label,
          {
            turns,
            front1Share: share(total(rows.map((row) => row.front1)), turns),
            front2Share: share(total(rows.map((row) => row.front2)), turns),
          },
        ];
      }),
    ),
    unitTurnShares: {
      front: unit("front"),
      advancing: unit("advancing"),
      retreating: unit("retreating"),
      otherMoved: unit("otherMoved"),
      acted: unit("acted"),
      garrisonIdle: unit("garrisonIdle"),
      homeIdle: unit("homeIdle"),
      fieldIdle: unit("fieldIdle"),
      embarked: unit("embarked"),
      embarkedIdle: unit("embarkedIdle"),
      raidersAtHomeOfRaiders: share(
        total(seats.map((seat) => seat.unitTurns.raidersAtHome)),
        total(seats.map((seat) => seat.unitTurns.raiders)),
      ),
    },
    spend,
    meanBankAtEndTurn:
      Math.round(
        (10 * total(seats.map((seat) => seat.bankAtEndTurns))) /
          Math.max(1, total(seats.map((seat) => seat.turns))),
      ) / 10,
    fullCityTurnShare: share(
      total(seats.map((seat) => seat.fullCityTurns)),
      total(seats.map((seat) => seat.cityTurns)),
    ),
    army: Object.fromEntries(
      ARMY_ROUNDS.map((round) => [
        round,
        median(
          seats.flatMap((seat) => {
            const value = seat.armyAtRound[String(round)];
            return value === undefined ? [] : [value];
          }),
        ),
      ]),
    ),
    cities: Object.fromEntries(
      ARMY_ROUNDS.map((round) => [
        round,
        median(
          seats.flatMap((seat) => {
            const value = seat.citiesAtRound[String(round)];
            return value === undefined ? [] : [value];
          }),
        ),
      ]),
    ),
    villages: {
      capturesPerSeat:
        Math.round(
          (100 * total(seats.map((seat) => seat.villageCaptures))) /
            Math.max(1, seats.length),
        ) / 100,
      seenToCaptureRoundsMedian: median(
        seats.flatMap((seat) => seat.villageLatencies),
      ),
      seenToCaptureRoundsP90: quantile(
        seats.flatMap((seat) => seat.villageLatencies),
        0.9,
      ),
      knownUnclaimedPerTurn:
        Math.round(
          (100 * total(seats.map((seat) => seat.knownVillageTurns))) /
            Math.max(1, total(seats.map((seat) => seat.turns))),
        ) / 100,
    },
  };
}

function turtleSummary(views: readonly TurtleView[]) {
  if (views.length === 0) return null;
  const since = total(views.map((view) => view.turnsSince));
  return {
    firstPressureRoundMedian: median(
      present(views.map((view) => view.firstPressureRound)),
    ),
    neverPressed: views.filter((view) => view.firstPressureRound === null)
      .length,
    pressure1Share: share(
      total(views.map((view) => view.pressure1Turns)),
      since,
    ),
    pressure2Share: share(
      total(views.map((view) => view.pressure2Turns)),
      since,
    ),
    pressure3Share: share(
      total(views.map((view) => view.pressure3Turns)),
      since,
    ),
    meanHostileUnits:
      since === 0
        ? null
        : Math.round(
            (100 * total(views.map((view) => view.hostileUnitTurns))) / since,
          ) / 100,
    longestCalmRunMedian: median(views.map((view) => view.longestCalmRun)),
    longestCalmRunP90: quantile(
      views.map((view) => view.longestCalmRun),
      0.9,
    ),
    calmRunsOfFiveOrMorePerMatch:
      Math.round(
        (100 * total(views.map((view) => view.calmRunsOfFiveOrMore))) /
          views.length,
      ) / 100,
  };
}

function matchSummary(matches: readonly MatchPressure[]) {
  const decided = matches.filter((match) => match.termination === "OUTCOME");
  return {
    matches: matches.length,
    /** `--turtle`: matches in which the turtle (seat 0) lost its last city. */
    turtleDefeated: matches.filter(
      (match) => match.turtle && match.outcomeKind === "DEFEAT",
    ).length,
    turtleView: turtleSummary(
      matches.flatMap((match) =>
        match.turtleView === null ? [] : [match.turtleView],
      ),
    ),
    medianRounds: median(matches.map((match) => match.rounds)),
    medianDecidedRounds: median(decided.map((match) => match.rounds)),
    p90Rounds: quantile(
      matches.map((match) => match.rounds),
      0.9,
    ),
    roundCapRate: share(
      matches.filter((match) => match.termination === "ROUND_CAP").length,
      matches.length,
    ),
    errors: total(matches.map((match) => match.errors)),
    stalls: total(matches.map((match) => match.stalls)),
  };
}

function group<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) (result[keyOf(item)] ??= []).push(item);
  return result;
}

export function summarize(matches: readonly MatchPressure[]) {
  const seats = matches.flatMap((match) =>
    match.seats
      .filter((seat) => !(match.turtle && seat.seat === 0))
      .map((seat) => ({ ...seat, match })),
  );
  const mapSeats = (items: typeof seats) => seatSummary(items);
  const wins: Record<string, { wins: number; decided: number }> = {};
  for (const match of matches.filter((item) => item.pairing.length === 2)) {
    if (match.winnerSeat === null) continue;
    for (const seat of match.seats) {
      const entry = (wins[seat.faction] ??= { wins: 0, decided: 0 });
      // A mirror has no faction winner.
      if (match.seats.every((other) => other.faction === seat.faction))
        continue;
      entry.decided += 1;
      if (seat.seat === match.winnerSeat) entry.wins += 1;
    }
  }
  const matchups: Record<string, { wins: number; decided: number }> = {};
  for (const match of matches.filter((item) => item.pairing.length === 2)) {
    const [left, right] = [...match.pairing].sort();
    if (match.winnerSeat === null || left === right) continue;
    const entry = (matchups[`${left} over ${right}`] ??= {
      wins: 0,
      decided: 0,
    });
    entry.decided += 1;
    if (match.pairing[match.winnerSeat] === left) entry.wins += 1;
  }
  return {
    matches: matchSummary(matches),
    winRateByMatchup: Object.fromEntries(
      Object.entries(matchups).map(([name, entry]) => [
        name,
        { ...entry, rate: share(entry.wins, entry.decided) },
      ]),
    ),
    matchesBySeats: Object.fromEntries(
      Object.entries(group(matches, (match) => `${match.pairing.length}p`)).map(
        ([name, items]) => [name, matchSummary(items)],
      ),
    ),
    matchesByMap: Object.fromEntries(
      Object.entries(group(matches, (match) => match.mapType)).map(
        ([name, items]) => [name, matchSummary(items)],
      ),
    ),
    winRateByFaction: Object.fromEntries(
      Object.entries(wins).map(([faction, entry]) => [
        faction,
        { ...entry, rate: share(entry.wins, entry.decided) },
      ]),
    ),
    all: mapSeats(seats),
    byFaction: Object.fromEntries(
      Object.entries(group(seats, (seat) => seat.faction)).map(
        ([name, items]) => [name, mapSeats(items)],
      ),
    ),
    byMap: Object.fromEntries(
      Object.entries(group(seats, (seat) => seat.match.mapType)).map(
        ([name, items]) => [name, mapSeats(items)],
      ),
    ),
    bySeats: Object.fromEntries(
      Object.entries(
        group(seats, (seat) => `${seat.match.pairing.length}p`),
      ).map(([name, items]) => [name, mapSeats(items)]),
    ),
    byStartGap: Object.fromEntries(
      Object.entries(
        group(seats, (seat) => bucketOf(START_GAP_BUCKETS, seat.startGap)),
      ).map(([name, items]) => [name, mapSeats(items)]),
    ),
  };
}

function markdown(summary: ReturnType<typeof summarize>): string {
  const lines: string[] = [];
  const cell = (value: number | null | undefined): string =>
    value === null || value === undefined ? "-" : String(value);
  lines.push(
    "| Group | Matches | Median rounds | Decided median | p90 | Round cap % | Errors | Stalls | Turtle defeated |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  const matchRow = (name: string, row: ReturnType<typeof matchSummary>) =>
    lines.push(
      `| ${name} | ${row.matches} | ${cell(row.medianRounds)} | ${cell(row.medianDecidedRounds)} | ${cell(row.p90Rounds)} | ${cell(row.roundCapRate)} | ${row.errors} | ${row.stalls} | ${row.turtleDefeated} |`,
    );
  matchRow("all", summary.matches);
  for (const [name, row] of Object.entries(summary.matchesBySeats))
    matchRow(name, row);
  for (const [name, row] of Object.entries(summary.matchesByMap))
    matchRow(name, row);
  if (summary.matches.turtleView !== null) {
    lines.push(
      "",
      "| Turtle's view | First pressure round (never) | Pressed>=1 % | Pressed>=2 % | Pressed>=3 % | Mean hostile units | Longest calm med/p90 | Calm runs>=5 per match |",
      "| --- | --- | ---: | ---: | ---: | ---: | --- | ---: |",
    );
    const turtleRow = (name: string, row: ReturnType<typeof matchSummary>) => {
      const view = row.turtleView;
      if (view !== null)
        lines.push(
          `| ${name} | ${cell(view.firstPressureRoundMedian)} (${view.neverPressed}) | ${cell(view.pressure1Share)} | ${cell(view.pressure2Share)} | ${cell(view.pressure3Share)} | ${cell(view.meanHostileUnits)} | ${cell(view.longestCalmRunMedian)}/${cell(view.longestCalmRunP90)} | ${cell(view.calmRunsOfFiveOrMorePerMatch)} |`,
        );
    };
    turtleRow("all", summary.matches);
    for (const [name, row] of Object.entries(summary.matchesBySeats))
      turtleRow(name, row);
    for (const [name, row] of Object.entries(summary.matchesByMap))
      turtleRow(name, row);
  }
  lines.push(
    "",
    "| Seats | n | Contact | First attack | First siege (p75, never) | Contact->siege | First capture (never) | Front>=1 % | Front>=2 % | Front>=3 % | Mean front | Longest quiet med/p90 | Quiet>=4 seats % | Free front>=1 % | Free front>=2 % | Free quiet med/p90 | Free quiet>=4 seats % |",
    "| --- | ---: | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | ---: |",
  );
  const seatRow = (name: string, row: ReturnType<typeof seatSummary>) =>
    lines.push(
      `| ${name} | ${row.seatGames} | ${cell(row.contactRound.median)} | ${cell(row.firstAttackRound.median)} | ${cell(row.firstSiegeRound.median)} (${cell(row.firstSiegeRound.p75)}, ${row.firstSiegeRound.never}) | ${cell(row.contactToSiegeRounds)} | ${cell(row.firstCityCaptureRound.median)} (${row.firstCityCaptureRound.never}) | ${cell(row.pressure.front1Share)} | ${cell(row.pressure.front2Share)} | ${cell(row.pressure.front3Share)} | ${cell(row.pressure.meanFrontUnits)} | ${cell(row.pressure.longestQuietRunMedian)}/${cell(row.pressure.longestQuietRunP90)} | ${cell(row.pressure.seatsWithQuietRunOfFour)} | ${cell(row.freePressure.front1Share)} | ${cell(row.freePressure.front2Share)} | ${cell(row.freePressure.longestQuietRunMedian)}/${cell(row.freePressure.longestQuietRunP90)} | ${cell(row.freePressure.seatsWithQuietRunOfFour)} |`,
    );
  seatRow("all", summary.all);
  for (const [name, row] of Object.entries(summary.byFaction))
    seatRow(name, row);
  for (const [name, row] of Object.entries(summary.byMap)) seatRow(name, row);
  for (const [name, row] of Object.entries(summary.bySeats)) seatRow(name, row);
  for (const [name, row] of Object.entries(summary.byStartGap))
    seatRow(`start gap ${name}`, row);
  lines.push(
    "",
    "| Current gap | Turns | Front>=1 % | Front>=2 % |",
    "| --- | ---: | ---: | ---: |",
  );
  for (const [name, row] of Object.entries(summary.all.byGap))
    lines.push(
      `| ${name} | ${row.turns} | ${cell(row.front1Share)} | ${cell(row.front2Share)} |`,
    );
  const all = summary.all;
  lines.push(
    "",
    `Unit-turns %: ${JSON.stringify(all.unitTurnShares)}`,
    `After front lost: ${JSON.stringify(all.afterFrontLost)}`,
    `Spend by rounds: ${JSON.stringify(all.spend)}`,
    `Mean bank at end of turn: ${all.meanBankAtEndTurn}; full city-turns %: ${cell(all.fullCityTurnShare)}`,
    `Army (median by round): ${JSON.stringify(all.army)}`,
    `Cities (median by round): ${JSON.stringify(all.cities)}`,
    `Villages: ${JSON.stringify(all.villages)}`,
    `Win rate by faction (mixed 1v1): ${JSON.stringify(summary.winRateByFaction)}`,
    `Win rate by matchup (mixed 1v1): ${JSON.stringify(summary.winRateByMatchup)}`,
    "",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Process control

async function runWorker(): Promise<void> {
  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    if (line.trim() === "") continue;
    const cell = JSON.parse(line) as Cell;
    try {
      process.stdout.write(`${JSON.stringify(runCell(cell))}\n`);
    } catch (cause) {
      const exception = cause instanceof Error ? cause.message : String(cause);
      process.stdout.write(`${JSON.stringify({ cell, exception })}\n`);
    }
  }
}

function cellKey(cell: Cell): string {
  return `${cell.turtle ? "T" : "N"}:${cell.pairing}:${cell.mapType}:${cell.size}:${cell.seed}`;
}

async function runMain(): Promise<void> {
  const cells = buildCells();
  const jobs = Math.max(
    1,
    integer("--jobs", Math.max(1, availableParallelism() - 2)),
  );
  const started = performance.now();
  const results = new Map<string, MatchPressure>();
  let exceptions = 0;
  const from = valueAfter("--from-output");
  if (from !== undefined) {
    for (const file of from.split(",")) {
      const saved = JSON.parse(readFileSync(file, "utf8")) as {
        readonly matches: readonly MatchPressure[];
      };
      for (const match of saved.matches) results.set(cellKey(match), match);
    }
    const selected = cells.flatMap((cell) => {
      const entry = results.get(cellKey(cell));
      return entry === undefined ? [] : [entry];
    });
    process.stderr.write(`${selected.length} of ${cells.length} matches\n`);
    const summary = summarize(selected);
    if (args.includes("--markdown")) process.stdout.write(markdown(summary));
    else process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  const queue = [...cells].sort(
    (left, right) =>
      right.size * right.pairing.length - left.size * left.pairing.length,
  );
  const script = fileURLToPath(import.meta.url);
  const tsx = resolve("node_modules/tsx/dist/cli.mjs");
  let completed = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(jobs, queue.length) },
      () =>
        new Promise<void>((done, fail) => {
          const child = spawn(process.execPath, [tsx, script, "--worker"], {
            stdio: ["pipe", "pipe", "inherit"],
          });
          const next = () => {
            const cell = queue.shift();
            if (cell === undefined) child.stdin.end();
            else child.stdin.write(`${JSON.stringify(cell)}\n`);
          };
          createInterface({ input: child.stdout }).on("line", (line) => {
            const parsed = JSON.parse(line) as
              | MatchPressure
              | { readonly cell: Cell; readonly exception: string };
            if ("exception" in parsed) {
              exceptions += 1;
              process.stderr.write(
                `EXCEPTION ${cellKey(parsed.cell)}: ${parsed.exception}\n`,
              );
            } else results.set(cellKey(parsed), parsed);
            completed += 1;
            if (completed % 25 === 0)
              process.stderr.write(`${completed}/${cells.length}\n`);
            next();
          });
          child.on("error", fail);
          child.on("exit", (code) =>
            code === 0 ? done() : fail(new Error(`worker exited ${code}`)),
          );
          next();
        }),
    ),
  );
  const ordered = cells.flatMap((cell) => {
    const entry = results.get(cellKey(cell));
    return entry === undefined ? [] : [entry];
  });
  const summary = summarize(ordered);
  process.stderr.write(
    `${ordered.length} matches in ${Math.round((performance.now() - started) / 1000)}s with ${jobs} jobs; ${exceptions} exceptions\n`,
  );
  const output = valueAfter("--output");
  if (output !== undefined)
    writeFileSync(output, JSON.stringify({ summary, matches: ordered }));
  if (args.includes("--markdown")) process.stdout.write(markdown(summary));
  else if (output === undefined)
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint && args.includes("--worker")) await runWorker();
else if (isEntryPoint) await runMain();
