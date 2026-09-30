/**
 * Ruleset 7 Human-vs-Undead balance matrix (`pulp_wars-vkq.10`), run on the
 * current identity (revision 14 adds Plague and Bitten counters; revision 15
 * adds Plague expiry and per-infection duration).
 *
 * Runs deterministic headless Normal-vs-Normal matches for Human-vs-Undead in
 * both seat orders, Undead mirror, and Human mirror across map types and
 * sizes, plus a smaller three-AI (four-seat) alternating extra. Every match is
 * independent and seeded, so results do not depend on `--jobs`; wall-clock
 * time is printed to stderr and never written to the JSON output.
 *
 * Usage:
 *   npm run balance:ruleset7-undead -- [--seeds 30] [--multi-seeds 4]
 *     [--sizes 11,14] [--maps dry-land,pangea,continents,archipelago,lakes]
 *     [--pairings HU,UH,UU,HH,HUHU,UHUH] [--max-rounds 150]
 *     [--multi-max-rounds 120] [--jobs N] [--output file.json]
 *     [--detail-output file.json] [--markdown] [--strict]
 *
 * Seeds are 0..N-1 for every cell. `--strict` exits non-zero when any match
 * ends in a policy error or stall (they are always counted in the summary).
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  runAiMatchV7,
  type HeadlessMetricsV7,
  type UndeadMetricsV7,
} from "../src/headless/v7";
import {
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type AiCountV7,
  type BoardSizeV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../src/engine/v7/types";

const MAP_TYPES: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
const PAIRINGS = {
  HU: ["ORIGINAL", "UNDEAD"],
  UH: ["UNDEAD", "ORIGINAL"],
  UU: ["UNDEAD", "UNDEAD"],
  HH: ["ORIGINAL", "ORIGINAL"],
  HUHU: ["ORIGINAL", "UNDEAD", "ORIGINAL", "UNDEAD"],
  UHUH: ["UNDEAD", "ORIGINAL", "UNDEAD", "ORIGINAL"],
} as const satisfies Record<string, readonly FactionIdV7[]>;
type PairingId = keyof typeof PAIRINGS;
const ONE_VS_ONE: readonly PairingId[] = ["HU", "UH", "UU", "HH"];
const MULTI: readonly PairingId[] = ["HUHU", "UHUH"];

export interface MatrixCell {
  readonly pairing: PairingId;
  readonly mapType: MapTypeV7;
  readonly size: BoardSizeV7;
  readonly aiCount: AiCountV7;
  readonly seed: number;
  readonly maxRounds: number;
  readonly maxCommands: number;
}

interface SeatResult extends Readonly<SeatEconomy> {
  readonly seat: number;
  readonly faction: FactionIdV7;
  readonly alive: boolean;
  readonly cities: number;
  readonly units: number;
  readonly techs: number;
  readonly finalCoins: number;
}

interface FactionSummary {
  readonly trained: Partial<Record<UnitRoleIdV7, number>>;
  readonly trainingCoins: number;
  readonly damage: number;
  readonly kills: number;
  readonly losses: number;
  readonly captures: number;
  readonly killsByRole: Partial<Record<UnitRoleIdV7, number>>;
  readonly damageByRole: Partial<Record<UnitRoleIdV7, number>>;
  readonly overcapacityStates: number;
}

export interface MatrixEntry extends MatrixCell {
  readonly factions: readonly FactionIdV7[];
  readonly termination: string;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: number;
  readonly stalls: number;
  /** Seat that moves first in the turn order. */
  readonly firstSeat: number;
  /** 1v1: the surviving seat; multi-seat: VICTORY seat or null. */
  readonly winnerSeat: number | null;
  readonly winnerFaction: FactionIdV7 | null;
  readonly outcomeKind: string | null;
  readonly finalHash: string;
  readonly seats: readonly SeatResult[];
  readonly byFaction: Partial<Record<FactionIdV7, FactionSummary>>;
  readonly undead: UndeadMetricsV7;
  readonly maximumOvercapacity: number;
  readonly disbands: number;
  readonly disbandCoins: number;
  readonly knights: Partial<Record<FactionIdV7, KnightStats>>;
  readonly trench: Partial<Record<FactionIdV7, TrenchStats>>;
  /** Round of the last city capture (0 when none). */
  readonly lastCaptureRound: number;
  /** Revision 14 Plague extent and duration from the event log. */
  readonly plague: PlagueDuration;
}

/** Plague duration statistics for one match (revision 14). */
interface PlagueDuration {
  /** Rounds in which any Start Turn Plague damage resolved. */
  rounds: number;
  /** Longest run of consecutive such rounds. */
  longestStreak: number;
  /** Distinct units that took Plague damage at least once. */
  units: number;
  /** Most Start Turn Plague damage entries taken by one unit. */
  longestUnitTurns: number;
  /** Units that took Plague damage on 5 or more of their turns. */
  unitsFivePlusTurns: number;
  /** First and last round with Plague damage (0 when none). */
  firstRound: number;
  lastRound: number;
}

function emptyPlague(): PlagueDuration {
  return {
    rounds: 0,
    longestStreak: 0,
    units: 0,
    longestUnitTurns: 0,
    unitsFivePlusTurns: 0,
    firstRound: 0,
    lastRound: 0,
  };
}

const args = process.argv.slice(2);
const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function valueAfter(name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function positiveInteger(name: string, fallback: number): number {
  const raw = valueAfter(name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${name} must be a non-negative integer`);
  return value;
}

function parseSizes(): readonly BoardSizeV7[] {
  return (valueAfter("--sizes") ?? "11,14").split(",").map((raw) => {
    const size = Number(raw);
    if (size !== 11 && size !== 14 && size !== 16 && size !== 20 && size !== 25)
      throw new RangeError("--sizes values must be 11, 14, 16, 20, or 25");
    return size;
  });
}

function parseMaps(): readonly MapTypeV7[] {
  const raw = valueAfter("--maps");
  if (raw === undefined) return MAP_TYPES;
  return raw.split(",").map((value) => {
    const normalized = value.toUpperCase().replaceAll("-", "_");
    const found = MAP_TYPES.find((mapType) => mapType === normalized);
    if (found === undefined)
      throw new RangeError(
        "--maps values must be dry-land, pangea, continents, archipelago, or lakes",
      );
    return found;
  });
}

function parsePairings(): readonly PairingId[] {
  const raw = valueAfter("--pairings");
  const all = [...ONE_VS_ONE, ...MULTI];
  if (raw === undefined) return all;
  return raw.split(",").map((value) => {
    const found = all.find((pairing) => pairing === value.toUpperCase());
    if (found === undefined)
      throw new RangeError(`--pairings values must be ${all.join(", ")}`);
    return found;
  });
}

/** Every matrix parameter, with the checked-in defaults. */
function matrixParameters() {
  return {
    seeds: positiveInteger("--seeds", 30),
    multiSeeds: positiveInteger("--multi-seeds", 4),
    sizes: parseSizes(),
    maps: parseMaps(),
    pairings: parsePairings(),
    maxRounds: positiveInteger("--max-rounds", 150),
    multiMaxRounds: positiveInteger("--multi-max-rounds", 120),
    maxCommands: positiveInteger("--max-commands", 30_000),
  };
}

function buildCells(): MatrixCell[] {
  const parameters = matrixParameters();
  const cells: MatrixCell[] = [];
  for (const pairing of ONE_VS_ONE.filter((item) =>
    parameters.pairings.includes(item),
  ))
    for (const mapType of parameters.maps)
      for (const size of parameters.sizes)
        for (let seed = 0; seed < parameters.seeds; seed += 1)
          cells.push({
            pairing,
            mapType,
            size,
            aiCount: 1,
            seed,
            maxRounds: parameters.maxRounds,
            maxCommands: parameters.maxCommands,
          });
  for (const pairing of MULTI.filter((item) =>
    parameters.pairings.includes(item),
  ))
    for (const mapType of parameters.maps)
      for (let seed = 0; seed < parameters.multiSeeds; seed += 1)
        cells.push({
          pairing,
          mapType,
          size: 16,
          aiCount: 3,
          seed,
          maxRounds: parameters.multiMaxRounds,
          maxCommands: parameters.maxCommands,
        });
  return cells;
}

export function runCell(cell: MatrixCell): MatrixEntry {
  const factions = PAIRINGS[cell.pairing];
  const setup: MatchSetupV7 = {
    rulesetId: "pulp-wars-poc-7r15",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    seed: cell.seed,
    width: cell.size,
    height: cell.size,
    aiCount: cell.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: cell.mapType,
  };
  const result = runAiMatchV7(setup, {
    maxRounds: cell.maxRounds,
    maxCommands: cell.maxCommands,
    recordCheckpointHashes: false,
  });
  const { state, metrics } = result;
  const seatOf = (playerId: number): number =>
    state.players.find((player) => player.id === playerId)?.seat ?? -1;
  let winnerSeat: number | null = null;
  const outcome = result.outcome;
  if (outcome?.kind === "VICTORY" || outcome?.kind === "HEADLESS_VICTORY")
    winnerSeat = seatOf(outcome.winnerId);
  else if (outcome?.kind === "DEFEAT" && cell.aiCount === 1)
    winnerSeat = seatOf(outcome.defeatedByPlayerId);
  const firstPlayer = state.turnOrder[0];
  const analysis = analyzeLog(
    result.state,
    result.commandLog,
    cell.maxRounds,
    result.termination === "ROUND_CAP",
  );
  return {
    ...cell,
    factions,
    termination: result.termination,
    rounds: result.rounds,
    commands: result.acceptedCommands,
    errors: result.errors.length,
    stalls: result.stalls.length,
    firstSeat: firstPlayer === undefined ? -1 : seatOf(firstPlayer),
    winnerSeat,
    winnerFaction: winnerSeat === null ? null : (factions[winnerSeat] ?? null),
    outcomeKind: outcome?.kind ?? null,
    finalHash: result.stateHash,
    seats: state.players.map((player) => ({
      seat: player.seat,
      faction: player.faction,
      alive: player.status === "ACTIVE",
      cities: state.cities.filter((city) => city.ownerId === player.id).length,
      units: state.units.filter(
        (unit) => unit.ownerId === player.id && unit.hp > 0,
      ).length,
      techs: player.researchedTechs.length,
      finalCoins: player.coins,
      ...(analysis.seats.get(player.id) ?? emptyEconomy()),
    })),
    byFaction: Object.fromEntries(
      FACTION_IDS_V7.filter((faction) =>
        (factions as readonly FactionIdV7[]).includes(faction),
      ).map((faction) => [faction, factionSummary(metrics, faction)]),
    ),
    undead: metrics.undead,
    maximumOvercapacity: metrics.capacity.maximumOvercapacity,
    disbands: metrics.commandsByKind.DISBAND ?? 0,
    disbandCoins: metrics.economy.disbandCoins,
    knights: analysis.knights,
    trench: analysis.trench,
    lastCaptureRound: analysis.lastCaptureRound,
    plague: analysis.plague,
  };
}

interface SeatEconomy {
  income: number;
  rewardCoins: number;
  treasureCoins: number;
  otherGains: number;
  trainingCoins: number;
  researchCoins: number;
  buildingCoins: number;
  trainedUnits: number;
  cityCaptures: number;
  citiesRound15: number | null;
  citiesRound30: number | null;
  /** Coins carried into the seat's turn (before income) in rounds 10–40. */
  bankRound10: number | null;
  bankRound20: number | null;
  bankRound30: number | null;
  bankRound40: number | null;
  /** Turn income awarded in rounds 10–40. */
  incomeRound10: number | null;
  incomeRound20: number | null;
  incomeRound30: number | null;
  incomeRound40: number | null;
}

function emptyEconomy(): SeatEconomy {
  return {
    income: 0,
    rewardCoins: 0,
    treasureCoins: 0,
    otherGains: 0,
    trainingCoins: 0,
    researchCoins: 0,
    buildingCoins: 0,
    trainedUnits: 0,
    cityCaptures: 0,
    citiesRound15: null,
    citiesRound30: null,
    bankRound10: null,
    bankRound20: null,
    bankRound30: null,
    bankRound40: null,
    incomeRound10: null,
    incomeRound20: null,
    incomeRound30: null,
    incomeRound40: null,
  };
}

/** Lifecycle totals for one faction's `KNIGHT` role (Knight or Vampire). */
interface KnightStats {
  units: number;
  died: number;
  /** Rounds from creation to death, summed over units that died. */
  lifetimeRoundsOfDead: number;
  attacks: number;
  damageDealt: number;
  damageTaken: number;
  healing: number;
  kills: number;
  /** Units that died having made at most one attack. */
  diedWithinOneAttack: number;
  fromTreasure: number;
}

function emptyKnights(): KnightStats {
  return {
    units: 0,
    died: 0,
    lifetimeRoundsOfDead: 0,
    attacks: 0,
    damageDealt: 0,
    damageTaken: 0,
    healing: 0,
    kills: 0,
    diedWithinOneAttack: 0,
    fromTreasure: 0,
  };
}

/** Attacks into fortified defenders and Field Defense play, per faction. */
interface TrenchStats {
  attacks: number;
  fortifiedAttacks: number;
  fortifiedDamage: number;
  fortifiedKills: number;
  /** Attacks whose attacker died to retaliation from a fortified defender. */
  fortifiedAttackerDeaths: number;
  fieldDefenseBuilt: number;
  /** Field Defense this faction destroyed (by reason). */
  fieldDefenseDestroyed: Record<string, number>;
  siegeAttacks: number;
  siegeDamage: number;
  /** Attacks plus Wails in the last 50 rounds of a capped match. */
  lateActions: number;
}

function emptyTrench(): TrenchStats {
  return {
    attacks: 0,
    fortifiedAttacks: 0,
    fortifiedDamage: 0,
    fortifiedKills: 0,
    fortifiedAttackerDeaths: 0,
    fieldDefenseBuilt: 0,
    fieldDefenseDestroyed: {},
    siegeAttacks: 0,
    siegeDamage: 0,
    lateActions: 0,
  };
}

interface LogAnalysis {
  readonly seats: Map<number, SeatEconomy>;
  readonly knights: Partial<Record<FactionIdV7, KnightStats>>;
  readonly trench: Partial<Record<FactionIdV7, TrenchStats>>;
  readonly lastCaptureRound: number;
  readonly plague: PlagueDuration;
}

/**
 * Per-seat economy, Knight/Vampire lifecycles, and trench statistics,
 * reconstructed from the accepted command log (rounds advance at each Start
 * Turn of the first seat in turn order).
 */
function analyzeLog(
  state: GameStateV7,
  log: ReturnType<typeof runAiMatchV7>["commandLog"],
  maxRounds: number,
  capped: boolean,
): LogAnalysis {
  const seats = new Map(
    state.players.map((player) => [player.id as number, emptyEconomy()]),
  );
  const factionOf = new Map(
    state.players.map((player) => [player.id as number, player.faction]),
  );
  const knights: Partial<Record<FactionIdV7, KnightStats>> = {};
  const trench: Partial<Record<FactionIdV7, TrenchStats>> = {};
  for (const faction of new Set(factionOf.values())) {
    knights[faction] = emptyKnights();
    trench[faction] = emptyTrench();
  }
  const cityOwner = new Map<number, number>();
  for (const player of state.players)
    cityOwner.set(player.originalCapitalCityId, player.id);
  const unitOwner = new Map<number, number>();
  const unitRole = new Map<number, UnitRoleIdV7>();
  const knightBorn = new Map<number, number>();
  const knightAttacks = new Map<number, number>();
  const unitAt = new Map<number, { readonly x: number; readonly y: number }>();
  const first = state.turnOrder[0];
  let round = 1;
  let lastCaptureRound = 0;
  const plagueRounds = new Set<number>();
  const plagueTurnsByUnit = new Map<number, number>();
  const pendingBank = new Map<number, number>();
  const snapshotCities = (key: "citiesRound15" | "citiesRound30") => {
    for (const [playerId, economy] of seats)
      economy[key] = [...cityOwner.values()].filter(
        (owner) => owner === playerId,
      ).length;
  };
  const born = (
    unitId: number,
    playerId: number,
    role: UnitRoleIdV7,
    treasure = false,
  ) => {
    unitOwner.set(unitId, playerId);
    unitRole.set(unitId, role);
    if (role !== "KNIGHT") return;
    const stats = knights[factionOf.get(playerId) ?? "ORIGINAL"];
    if (stats === undefined) return;
    stats.units += 1;
    stats.fromTreasure += Number(treasure);
    knightBorn.set(unitId, round);
    knightAttacks.set(unitId, 0);
  };
  const knightStats = (unitId: number) =>
    unitRole.get(unitId) === "KNIGHT"
      ? knights[factionOf.get(unitOwner.get(unitId) ?? -1) ?? "ORIGINAL"]
      : undefined;
  const cityCenters = new Set(state.cities.map((city) => coordKey(city.at)));
  const cityAt = new Map(
    state.cities.map((city) => [city.id as number, city.at]),
  );
  for (const record of log) {
    const actorFaction = factionOf.get(record.playerId) ?? "ORIGINAL";
    const actorTrench = trench[actorFaction];
    const command = record.command;
    if (
      actorTrench !== undefined &&
      capped &&
      round > maxRounds - 50 &&
      (command.kind === "ATTACK" || command.kind === "WAIL")
    )
      actorTrench.lateActions += 1;
    for (const event of record.events) {
      if (event.kind === "TURN_STARTED") {
        if (event.playerId === first) {
          round += 1;
          if (round === 15) snapshotCities("citiesRound15");
          if (round === 30) snapshotCities("citiesRound30");
        }
        pendingBank.set(event.playerId, event.coins);
      }
      if (event.kind === "INCOME_AWARDED") {
        const economy = seats.get(event.playerId);
        if (economy !== undefined) {
          economy.income += event.totalCoins;
          const bank =
            (pendingBank.get(event.playerId) ?? 0) - event.totalCoins;
          if (round === 10) {
            economy.bankRound10 = bank;
            economy.incomeRound10 = event.totalCoins;
          }
          if (round === 20) {
            economy.bankRound20 = bank;
            economy.incomeRound20 = event.totalCoins;
          }
          if (round === 30) {
            economy.bankRound30 = bank;
            economy.incomeRound30 = event.totalCoins;
          }
          if (round === 40) {
            economy.bankRound40 = bank;
            economy.incomeRound40 = event.totalCoins;
          }
        }
      }
      const gainer = seats.get(
        "playerId" in event && typeof event.playerId === "number"
          ? event.playerId
          : record.playerId,
      );
      if (gainer !== undefined) {
        if (event.kind === "CITY_REWARD_CHOSEN" && event.coinDelta > 0)
          gainer.rewardCoins += event.coinDelta;
        if (event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED")
          gainer.rewardCoins += event.coins;
        if (event.kind === "TREASURE_CAPTURED")
          gainer.treasureCoins += event.coinDelta;
        if (event.kind === "PEARLS_GATHERED")
          gainer.otherGains += event.coinsReceived;
        if (
          event.kind === "SPOILS_AWARDED" ||
          event.kind === "IMPROVEMENT_PILLAGED" ||
          event.kind === "UNIT_DISBANDED" ||
          event.kind === "FOREST_CLEARED"
        )
          gainer.otherGains += Math.max(
            0,
            event.kind === "SPOILS_AWARDED" ? event.coins : event.coinDelta,
          );
        if (event.kind === "TECH_RESEARCHED")
          gainer.researchCoins += event.cost;
        else if (
          event.kind === "UNIT_TRAINED" ||
          event.kind === "NAVAL_UNIT_TRAINED"
        ) {
          gainer.trainingCoins += event.cost;
          gainer.trainedUnits += 1;
        } else if ("cost" in event && typeof event.cost === "number")
          gainer.buildingCoins += event.cost;
      }
      if (event.kind === "UNIT_TRAINED" || event.kind === "NAVAL_UNIT_TRAINED")
        born(event.unitId, event.playerId, event.role);
      if (event.kind === "UNIT_REWARD_GRANTED")
        born(event.unitId, event.playerId, event.role);
      if (event.kind === "TREASURE_CAPTURED" && event.spawnedUnitId !== null)
        born(event.spawnedUnitId, event.playerId, "KNIGHT", true);
      if (event.kind === "DEAD_RAISED")
        for (const rising of event.results)
          born(rising.unitId, event.playerId, "FIGHTER");
      if (event.kind === "UNIT_INFECTED")
        born(event.unitId, event.playerId, "GUARD");
      if (event.kind === "FIELD_DEFENSE_BUILT") {
        const stats = trench[factionOf.get(event.playerId) ?? "ORIGINAL"];
        if (stats !== undefined) stats.fieldDefenseBuilt += 1;
      }
      if (event.kind === "FIELD_DEFENSE_DESTROYED" && actorTrench !== undefined)
        actorTrench.fieldDefenseDestroyed[event.reason] =
          (actorTrench.fieldDefenseDestroyed[event.reason] ?? 0) + 1;
      if (event.kind === "CITY_CAPTURED") {
        cityOwner.set(event.cityId, event.to);
        lastCaptureRound = round;
        const economy = seats.get(event.to);
        if (economy !== undefined) economy.cityCaptures += 1;
      }
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        if (actorTrench !== undefined) {
          actorTrench.attacks += 1;
          if (preview.fortificationLevel > 0) {
            actorTrench.fortifiedAttacks += 1;
            actorTrench.fortifiedDamage += preview.damageToDefender;
            actorTrench.fortifiedKills += Number(preview.defenderDies);
            actorTrench.fortifiedAttackerDeaths += Number(preview.attackerDies);
          }
          const targetAt = unitAt.get(preview.targetUnitId);
          if (targetAt !== undefined && cityCenters.has(coordKey(targetAt))) {
            actorTrench.siegeAttacks += 1;
            actorTrench.siegeDamage += preview.damageToDefender;
          }
        }
        const attacker = knightStats(preview.attackerId);
        if (attacker !== undefined) {
          attacker.attacks += 1;
          attacker.damageDealt += preview.damageToDefender;
          attacker.damageTaken += preview.damageToAttacker;
          attacker.healing += preview.attackerHeal;
          attacker.kills += Number(preview.defenderDies);
          knightAttacks.set(
            preview.attackerId,
            (knightAttacks.get(preview.attackerId) ?? 0) + 1,
          );
        }
        const defender = knightStats(preview.targetUnitId);
        if (defender !== undefined) {
          defender.damageDealt += preview.damageToAttacker;
          defender.damageTaken += preview.damageToDefender;
          defender.healing += preview.defenderHeal;
          defender.kills += Number(preview.attackerDies);
        }
        for (const entry of preview.splash) {
          const splashed = knightStats(entry.unitId);
          if (splashed !== undefined) splashed.damageTaken += entry.damage;
        }
      }
      if (event.kind === "WAIL_RESOLVED")
        for (const entry of event.results) {
          const target = knightStats(entry.unitId);
          if (target !== undefined) target.damageTaken += entry.damage;
        }
      if (event.kind === "UNIT_MOVED") {
        const end = event.path.at(-1);
        if (end !== undefined) unitAt.set(event.unitId, end);
      }
      if (event.kind === "UNIT_TRAINED" || event.kind === "NAVAL_UNIT_TRAINED")
        unitAt.set(event.unitId, event.at);
      if (event.kind === "UNIT_PUSHED")
        unitAt.set(event.targetUnitId, event.to);
      if (
        (event.kind === "UNIT_EMBARKED" || event.kind === "UNIT_DISEMBARKED") &&
        event.to !== undefined
      )
        unitAt.set(event.unitId, event.to);
      if (event.kind === "UNIT_SPAWN_DISPLACED" && event.to !== null)
        unitAt.set(event.displacedUnitId, event.to);
      if (event.kind === "UNIT_REWARD_GRANTED") {
        const at = cityAt.get(event.cityId);
        if (at !== undefined) unitAt.set(event.unitId, at);
      }
      if (
        event.kind === "TREASURE_CAPTURED" &&
        event.spawnedUnitId !== null &&
        event.spawnedAt !== null
      )
        unitAt.set(event.spawnedUnitId, event.spawnedAt);
      if (event.kind === "DEAD_RAISED")
        for (const rising of event.results)
          unitAt.set(rising.unitId, rising.at);
      if (event.kind === "UNIT_INFECTED") unitAt.set(event.unitId, event.at);
      if (event.kind === "PLAGUE_DAMAGED" && event.results.length > 0) {
        plagueRounds.add(round);
        for (const entry of event.results)
          plagueTurnsByUnit.set(
            entry.unitId,
            (plagueTurnsByUnit.get(entry.unitId) ?? 0) + 1,
          );
      }
      if (event.kind === "UNIT_DIED") {
        const stats = knightStats(event.unitId);
        if (stats !== undefined && event.cause !== "ELIMINATION") {
          stats.died += 1;
          stats.lifetimeRoundsOfDead +=
            round - (knightBorn.get(event.unitId) ?? round);
          stats.diedWithinOneAttack += Number(
            (knightAttacks.get(event.unitId) ?? 0) <= 1,
          );
        }
      }
    }
  }
  const plague = emptyPlague();
  const plaguedRounds = [...plagueRounds].sort((left, right) => left - right);
  plague.rounds = plaguedRounds.length;
  plague.firstRound = plaguedRounds[0] ?? 0;
  plague.lastRound = plaguedRounds.at(-1) ?? 0;
  let streak = 0;
  for (const [index, value] of plaguedRounds.entries()) {
    streak =
      index > 0 && plaguedRounds[index - 1] === value - 1 ? streak + 1 : 1;
    plague.longestStreak = Math.max(plague.longestStreak, streak);
  }
  plague.units = plagueTurnsByUnit.size;
  for (const turns of plagueTurnsByUnit.values()) {
    plague.longestUnitTurns = Math.max(plague.longestUnitTurns, turns);
    plague.unitsFivePlusTurns += Number(turns >= 5);
  }
  return { seats, knights, trench, lastCaptureRound, plague };
}

const coordKey = (at: { readonly x: number; readonly y: number }) =>
  `${at.y},${at.x}`;

function factionSummary(
  metrics: HeadlessMetricsV7,
  faction: FactionIdV7,
): FactionSummary {
  const roles = metrics.factionRoles[faction];
  const nonZero = (record: Record<UnitRoleIdV7, number>) =>
    Object.fromEntries(
      UNIT_ROLE_IDS_V7.filter((role) => record[role] > 0).map((role) => [
        role,
        record[role],
      ]),
    );
  const total = (record: Record<UnitRoleIdV7, number>) =>
    UNIT_ROLE_IDS_V7.reduce((sum, role) => sum + record[role], 0);
  return {
    trained: nonZero(roles.trained),
    trainingCoins: total(roles.trainingCoins),
    damage: total(roles.damage),
    kills: total(roles.kills),
    losses: total(roles.losses),
    captures: total(roles.captures),
    killsByRole: nonZero(roles.kills),
    damageByRole: nonZero(roles.damage),
    overcapacityStates: metrics.capacity.overcapacityStatesByFaction[faction],
  };
}

async function runWorker(): Promise<void> {
  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    if (line.trim() === "") continue;
    const cell = JSON.parse(line) as MatrixCell;
    const started = performance.now();
    try {
      const entry = runCell(cell);
      // Wall time is diagnostic only; compact and summary outputs omit it.
      const wallMs = Math.round(performance.now() - started);
      process.stdout.write(`${JSON.stringify({ ...entry, wallMs })}\n`);
    } catch (cause) {
      // A thrown match (for example a rejected map) is reported, not fatal.
      const exception = cause instanceof Error ? cause.message : String(cause);
      process.stdout.write(`${JSON.stringify({ cell, exception })}\n`);
    }
  }
}

async function runMain(): Promise<void> {
  const cells = buildCells();
  const jobs = Math.max(
    1,
    positiveInteger("--jobs", Math.max(1, availableParallelism() - 2)),
  );
  const started = performance.now();
  const entries = await runParallel(cells, jobs);
  const ordered = cells.flatMap((cell) => {
    const entry = entries.results.get(cellKey(cell));
    if (entry !== undefined) return [entry];
    if (
      !entries.exceptions.some((item) => cellKey(item.cell) === cellKey(cell))
    )
      throw new Error(`Missing ${cellKey(cell)}`);
    return [];
  });
  for (const item of entries.exceptions)
    process.stderr.write(
      `EXCEPTION ${cellKey(item.cell)}: ${item.exception}\n`,
    );
  const failures = ordered.filter(
    (entry) => entry.errors > 0 || entry.stalls > 0,
  );
  const summary = summarize(ordered);
  const seconds = Math.round((performance.now() - started) / 1000);
  process.stderr.write(
    `${ordered.length} matches in ${seconds}s with ${jobs} jobs; ${failures.length} with errors or stalls; ${entries.exceptions.length} exceptions\n`,
  );
  const parameters = matrixParameters();
  const output = valueAfter("--output");
  if (output !== undefined)
    writeFileSync(
      output,
      await format(
        JSON.stringify({
          format: "pulp-wars-ruleset7-undead-balance-matrix",
          version: 1,
          rulesetId: "pulp-wars-poc-7r15",
          parameters,
          summary,
          games: ordered.map(compactEntry),
        }),
        { parser: "json" },
      ),
    );
  const detail = valueAfter("--detail-output");
  if (detail !== undefined)
    writeFileSync(detail, JSON.stringify({ parameters, entries: ordered }));
  if (args.includes("--markdown")) process.stdout.write(markdown(summary));
  else if (output === undefined)
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (
    (failures.length > 0 || entries.exceptions.length > 0) &&
    args.includes("--strict")
  )
    process.exitCode = 1;
}

function cellKey(cell: MatrixCell): string {
  return `${cell.pairing}:${cell.mapType}:${cell.size}:${cell.seed}`;
}

async function runParallel(
  cells: readonly MatrixCell[],
  jobs: number,
): Promise<{
  readonly results: Map<string, MatrixEntry>;
  readonly exceptions: {
    readonly cell: MatrixCell;
    readonly exception: string;
  }[];
}> {
  const results = new Map<string, MatrixEntry>();
  const exceptions: { cell: MatrixCell; exception: string }[] = [];
  const queue = [...cells].sort(
    // Larger boards and more seats first for better load balance.
    (left, right) =>
      right.size * (right.aiCount + 1) - left.size * (left.aiCount + 1),
  );
  const script = fileURLToPath(import.meta.url);
  const tsx = resolve("node_modules/tsx/dist/cli.mjs");
  let completed = 0;
  const workers = Array.from(
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
        const lines = createInterface({ input: child.stdout });
        lines.on("line", (line) => {
          const parsed = JSON.parse(line) as
            | MatrixEntry
            | { readonly cell: MatrixCell; readonly exception: string };
          if ("exception" in parsed) exceptions.push(parsed);
          else results.set(cellKey(parsed), parsed);
          completed += 1;
          if (completed % 50 === 0)
            process.stderr.write(`${completed}/${cells.length}\n`);
          next();
        });
        child.on("error", fail);
        child.on("exit", (code) =>
          code === 0 ? done() : fail(new Error(`worker exited ${code}`)),
        );
        next();
      }),
  );
  await Promise.all(workers);
  return { results, exceptions };
}

function compactEntry(entry: MatrixEntry) {
  return {
    pairing: entry.pairing,
    mapType: entry.mapType,
    size: entry.size,
    seed: entry.seed,
    termination: entry.termination,
    rounds: entry.rounds,
    firstSeat: entry.firstSeat,
    winnerSeat: entry.winnerSeat,
    winnerFaction: entry.winnerFaction,
    finalHash: entry.finalHash,
  };
}

// ---------------------------------------------------------------------------
// Aggregation

interface Rate {
  readonly wins: number;
  readonly decided: number;
  readonly capped: number;
  readonly rate: number | null;
  /** Wilson 95% interval on decided games. */
  readonly low: number | null;
  readonly high: number | null;
}

function wilson(wins: number, decided: number, capped: number): Rate {
  if (decided === 0)
    return { wins, decided, capped, rate: null, low: null, high: null };
  const z = 1.96;
  const p = wins / decided;
  const denominator = 1 + (z * z) / decided;
  const centre = (p + (z * z) / (2 * decided)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / decided + (z * z) / (4 * decided ** 2))) /
    denominator;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    wins,
    decided,
    capped,
    rate: round(p),
    low: round(Math.max(0, centre - margin)),
    high: round(Math.min(1, centre + margin)),
  };
}

function rateFor(
  entries: readonly MatrixEntry[],
  won: (entry: MatrixEntry) => boolean,
): Rate {
  const decided = entries.filter((entry) => entry.winnerSeat !== null);
  return wilson(
    decided.filter(won).length,
    decided.length,
    entries.length - decided.length,
  );
}

function stats(values: readonly number[]) {
  if (values.length === 0) return { n: 0, mean: null, median: null, p90: null };
  const sorted = [...values].sort((left, right) => left - right);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? null;
  return {
    n: values.length,
    mean: Math.round((10 * sum(values)) / values.length) / 10,
    median: at(0.5),
    p90: at(0.9),
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) (groups[key(item)] ??= []).push(item);
  return groups;
}

const undeadWon = (entry: MatrixEntry) => entry.winnerFaction === "UNDEAD";
const seatZeroWon = (entry: MatrixEntry) => entry.winnerSeat === 0;
const firstSeatWon = (entry: MatrixEntry) =>
  entry.winnerSeat === entry.firstSeat;

export function summarize(entries: readonly MatrixEntry[]) {
  const duel = entries.filter((entry) => entry.aiCount === 1);
  const mixed = duel.filter(
    (entry) => entry.pairing === "HU" || entry.pairing === "UH",
  );
  const multi = entries.filter((entry) => entry.aiCount === 3);
  const byPairing = groupBy(duel, (entry) => entry.pairing);
  const perPairing = Object.fromEntries(
    Object.entries(byPairing).map(([pairing, group]) => [
      pairing,
      {
        games: group.length,
        undeadWin:
          pairing === "HU" || pairing === "UH"
            ? rateFor(group, undeadWon)
            : null,
        seatZeroWin: rateFor(group, seatZeroWon),
        firstMoverWin: rateFor(group, firstSeatWon),
        rounds: stats(
          group
            .filter((entry) => entry.termination === "OUTCOME")
            .map((entry) => entry.rounds),
        ),
        capRate:
          Math.round(
            (1000 *
              group.filter((entry) => entry.termination !== "OUTCOME").length) /
              group.length,
          ) / 1000,
        errors: sum(group.map((entry) => entry.errors)),
        stalls: sum(group.map((entry) => entry.stalls)),
      },
    ]),
  );
  const mixedBy = (key: (entry: MatrixEntry) => string) =>
    Object.fromEntries(
      Object.entries(groupBy(mixed, key)).map(([name, group]) => [
        name,
        rateFor(group, undeadWon),
      ]),
    );
  const abilityTotals = (group: readonly MatrixEntry[]) => {
    const keys = Object.keys(
      group[0]?.undead ?? {},
    ) as (keyof UndeadMetricsV7)[];
    return Object.fromEntries(
      keys.map((key) => [
        key,
        key === "plagueTurnsAtEnd"
          ? group.reduce<number[]>(
              (total, entry) =>
                entry.undead.plagueTurnsAtEnd.map(
                  (value, index) => value + (total[index] ?? 0),
                ),
              [],
            )
          : key === "maximumSkeletonsPerRaise" ||
              key === "gravesMaximum" ||
              key === "plaguedMaximum" ||
              key === "bittenMaximum"
            ? Math.max(0, ...group.map((entry) => entry.undead[key]))
            : sum(group.map((entry) => entry.undead[key])),
      ]),
    );
  };
  const factionAggregate = (
    group: readonly MatrixEntry[],
    faction: FactionIdV7,
  ) => {
    const present = group
      .map((entry) => entry.byFaction[faction])
      .filter((item): item is FactionSummary => item !== undefined);
    const roleSum = (
      pick: (item: FactionSummary) => Partial<Record<UnitRoleIdV7, number>>,
    ) =>
      Object.fromEntries(
        UNIT_ROLE_IDS_V7.map((role) => [
          role,
          sum(present.map((item) => pick(item)[role] ?? 0)),
        ]).filter(([, value]) => value !== 0),
      );
    return {
      games: present.length,
      trained: roleSum((item) => item.trained),
      trainingCoins: sum(present.map((item) => item.trainingCoins)),
      damage: sum(present.map((item) => item.damage)),
      kills: sum(present.map((item) => item.kills)),
      losses: sum(present.map((item) => item.losses)),
      captures: sum(present.map((item) => item.captures)),
      killsByRole: roleSum((item) => item.killsByRole),
      damageByRole: roleSum((item) => item.damageByRole),
      overcapacityStates: sum(present.map((item) => item.overcapacityStates)),
      gamesWithOvercapacity: present.filter(
        (item) => item.overcapacityStates > 0,
      ).length,
    };
  };
  const undeadGames = duel.filter((entry) => entry.pairing !== "HH");
  const seatMeans = (group: readonly MatrixEntry[], faction: FactionIdV7) => {
    const seats = group.flatMap((entry) =>
      entry.seats.filter((seat) => seat.faction === faction),
    );
    const mean = (values: readonly number[]) =>
      values.length === 0
        ? null
        : Math.round((100 * sum(values)) / values.length) / 100;
    const present = (values: readonly (number | null)[]) =>
      values.filter((value): value is number => value !== null);
    const numeric = (key: keyof SeatEconomy | "techs" | "finalCoins") =>
      mean(present(seats.map((seat) => seat[key])));
    return {
      seats: seats.length,
      income: numeric("income"),
      rewardCoins: numeric("rewardCoins"),
      treasureCoins: numeric("treasureCoins"),
      otherGains: numeric("otherGains"),
      trainingCoins: numeric("trainingCoins"),
      researchCoins: numeric("researchCoins"),
      buildingCoins: numeric("buildingCoins"),
      finalCoins: numeric("finalCoins"),
      trainedUnits: numeric("trainedUnits"),
      cityCaptures: numeric("cityCaptures"),
      citiesRound15: numeric("citiesRound15"),
      citiesRound30: numeric("citiesRound30"),
      bankRound10: numeric("bankRound10"),
      bankRound20: numeric("bankRound20"),
      bankRound30: numeric("bankRound30"),
      bankRound40: numeric("bankRound40"),
      incomeRound10: numeric("incomeRound10"),
      incomeRound20: numeric("incomeRound20"),
      incomeRound30: numeric("incomeRound30"),
      incomeRound40: numeric("incomeRound40"),
      techs: numeric("techs"),
    };
  };
  const knightTotals = (
    group: readonly MatrixEntry[],
    faction: FactionIdV7,
  ) => {
    const totals = emptyKnights();
    for (const entry of group) {
      const stats = entry.knights[faction];
      if (stats === undefined) continue;
      for (const key of Object.keys(totals) as (keyof KnightStats)[])
        totals[key] += stats[key];
    }
    return totals;
  };
  const trenchTotals = (
    group: readonly MatrixEntry[],
    faction: FactionIdV7,
  ) => {
    const totals = emptyTrench();
    for (const entry of group) {
      const stats = entry.trench[faction];
      if (stats === undefined) continue;
      for (const key of Object.keys(totals) as (keyof TrenchStats)[])
        if (key === "fieldDefenseDestroyed")
          for (const [reason, count] of Object.entries(stats[key]))
            totals[key][reason] = (totals[key][reason] ?? 0) + count;
        else totals[key] += stats[key];
    }
    return totals;
  };
  const cappedStall = (group: readonly MatrixEntry[]) => {
    const capped = group.filter((entry) => entry.termination === "ROUND_CAP");
    return {
      capped: capped.length,
      meanLastCaptureRound:
        capped.length === 0
          ? null
          : Math.round(
              (10 * sum(capped.map((entry) => entry.lastCaptureRound))) /
                capped.length,
            ) / 10,
    };
  };
  const plagueSummary = (group: readonly MatrixEntry[]) => {
    const withPlague = group.filter((entry) => entry.plague.rounds > 0);
    const meanOf = (values: readonly number[]) =>
      values.length === 0
        ? null
        : Math.round((10 * sum(values)) / values.length) / 10;
    return {
      games: group.length,
      gamesWithPlague: withPlague.length,
      plaguedMaximum: stats(
        withPlague.map((entry) => entry.undead.plaguedMaximum),
      ),
      plagueRounds: stats(withPlague.map((entry) => entry.plague.rounds)),
      longestStreak: stats(
        withPlague.map((entry) => entry.plague.longestStreak),
      ),
      longestUnitTurns: stats(
        withPlague.map((entry) => entry.plague.longestUnitTurns),
      ),
      plaguedUnitTurnsPerGame: meanOf(
        group.map((entry) => entry.undead.plagueDamageEntries),
      ),
      unitsFivePlusTurns: sum(
        group.map((entry) => entry.plague.unitsFivePlusTurns),
      ),
      plaguedUnits: sum(group.map((entry) => entry.plague.units)),
      // Revision 15: Start Turn damage entries per distinct plagued unit.
      turnsPerPlaguedUnit:
        sum(group.map((entry) => entry.plague.units)) === 0
          ? null
          : Math.round(
              (10 *
                sum(group.map((entry) => entry.undead.plagueDamageEntries))) /
                sum(group.map((entry) => entry.plague.units)),
            ) / 10,
      plagueExpired: sum(group.map((entry) => entry.undead.plagueExpired)),
      gamesWithPlagueTwentyPlusRounds: withPlague.filter(
        (entry) => entry.plague.rounds >= 20,
      ).length,
      gamesWithTenPlusPlagued: withPlague.filter(
        (entry) => entry.undead.plaguedMaximum >= 10,
      ).length,
    };
  };
  const multiByFaction = Object.fromEntries(
    FACTION_IDS_V7.map((faction) => {
      const seats = multi.flatMap((entry) =>
        entry.seats.filter((seat) => seat.faction === faction),
      );
      return [
        faction,
        {
          seats: seats.length,
          alive: seats.filter((seat) => seat.alive).length,
          cities: sum(seats.map((seat) => seat.cities)),
          units: sum(seats.map((seat) => seat.units)),
        },
      ];
    }),
  );
  return {
    matches: entries.length,
    errors: sum(entries.map((entry) => entry.errors)),
    stalls: sum(entries.map((entry) => entry.stalls)),
    duel: {
      perPairing,
      undeadWinMixed: rateFor(mixed, undeadWon),
      undeadWinByMap: mixedBy((entry) => entry.mapType),
      undeadWinBySize: mixedBy((entry) => String(entry.size)),
      undeadWinByMapSize: mixedBy((entry) => `${entry.mapType}/${entry.size}`),
      undeadWinUndeadMovesFirst: rateFor(
        mixed.filter((entry) => entry.factions[entry.firstSeat] === "UNDEAD"),
        undeadWon,
      ),
      undeadWinHumanMovesFirst: rateFor(
        mixed.filter((entry) => entry.factions[entry.firstSeat] === "ORIGINAL"),
        undeadWon,
      ),
      mixedRoundsByWinner: {
        UNDEAD: stats(
          mixed
            .filter((entry) => entry.winnerFaction === "UNDEAD")
            .map((entry) => entry.rounds),
        ),
        ORIGINAL: stats(
          mixed
            .filter((entry) => entry.winnerFaction === "ORIGINAL")
            .map((entry) => entry.rounds),
        ),
      },
      abilities: {
        mixed: abilityTotals(mixed),
        undeadMirror: abilityTotals(byPairing.UU ?? []),
        gamesWithRaiseDead: undeadGames.filter(
          (entry) => entry.undead.raiseDeadUses > 0,
        ).length,
        gamesWithInfectOnCityCenter: undeadGames.filter(
          (entry) => entry.undead.infectionsOnCityCenters > 0,
        ).length,
        gamesWithCenterRisingCapture: undeadGames.filter(
          (entry) => entry.undead.centerRisingCaptures > 0,
        ).length,
        // Revision 14 afflictions.
        gamesWithPlague: undeadGames.filter(
          (entry) => entry.undead.plagueApplications > 0,
        ).length,
        gamesWithBittenRising: undeadGames.filter(
          (entry) => entry.undead.bittenRisings > 0,
        ).length,
        undeadGames: undeadGames.length,
      },
      factions: {
        mixedHuman: factionAggregate(mixed, "ORIGINAL"),
        mixedUndead: factionAggregate(mixed, "UNDEAD"),
        humanMirror: factionAggregate(byPairing.HH ?? [], "ORIGINAL"),
        undeadMirror: factionAggregate(byPairing.UU ?? [], "UNDEAD"),
      },
      disbands: {
        mixedDisbands: sum(mixed.map((entry) => entry.disbands)),
        mixedDisbandCoins: sum(mixed.map((entry) => entry.disbandCoins)),
        mirrorHumanDisbands: sum(
          (byPairing.HH ?? []).map((entry) => entry.disbands),
        ),
      },
      seatEconomy: {
        mixedHuman: seatMeans(mixed, "ORIGINAL"),
        mixedUndead: seatMeans(mixed, "UNDEAD"),
        humanMirror: seatMeans(byPairing.HH ?? [], "ORIGINAL"),
        undeadMirror: seatMeans(byPairing.UU ?? [], "UNDEAD"),
      },
      knights: {
        mixedHuman: knightTotals(mixed, "ORIGINAL"),
        mixedUndead: knightTotals(mixed, "UNDEAD"),
        undeadMirror: knightTotals(byPairing.UU ?? [], "UNDEAD"),
      },
      trench: {
        mixedHuman: trenchTotals(mixed, "ORIGINAL"),
        mixedUndead: trenchTotals(mixed, "UNDEAD"),
        humanMirror: trenchTotals(byPairing.HH ?? [], "ORIGINAL"),
        undeadMirror: trenchTotals(byPairing.UU ?? [], "UNDEAD"),
        stallByPairing: Object.fromEntries(
          Object.entries(byPairing).map(([pairing, group]) => [
            pairing,
            cappedStall(group),
          ]),
        ),
      },
      maximumOvercapacity: Math.max(
        0,
        ...duel.map((entry) => entry.maximumOvercapacity),
      ),
      plague: plagueSummary(mixed),
    },
    multi: {
      games: multi.length,
      capRate:
        multi.length === 0
          ? null
          : Math.round(
              (1000 *
                multi.filter((entry) => entry.termination !== "OUTCOME")
                  .length) /
                multi.length,
            ) / 1000,
      seatZeroOutcome: groupCount(multi, (entry) =>
        entry.outcomeKind === null
          ? entry.termination
          : `${entry.outcomeKind}:${entry.factions[0]}`,
      ),
      rounds: stats(multi.map((entry) => entry.rounds)),
      byFaction: multiByFaction,
      abilities: abilityTotals(multi),
    },
  };
}

function groupCount<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
}

function markdown(summary: ReturnType<typeof summarize>): string {
  const pct = (rate: Rate) =>
    rate.rate === null
      ? "n/a"
      : `${Math.round(rate.rate * 100)}% [${Math.round((rate.low ?? 0) * 100)}–${Math.round((rate.high ?? 0) * 100)}] (${rate.wins}/${rate.decided}, ${rate.capped} capped)`;
  const lines = [
    `Matches ${summary.matches}; errors ${summary.errors}; stalls ${summary.stalls}`,
    "",
    `Undead win (mixed 1v1): ${pct(summary.duel.undeadWinMixed)}`,
    `Undead moves first: ${pct(summary.duel.undeadWinUndeadMovesFirst)}`,
    `Human moves first: ${pct(summary.duel.undeadWinHumanMovesFirst)}`,
    "",
    `Plague (mixed): ${summary.duel.abilities.mixed.plagueApplications ?? 0} applied, ${summary.duel.abilities.mixed.plagueSpreads ?? 0} spread, ${summary.duel.abilities.mixed.plagueDamage ?? 0} damage, ${summary.duel.abilities.mixed.plagueDeaths ?? 0} deaths, ${summary.duel.abilities.mixed.plagueCleared ?? 0} cleared, ${summary.duel.abilities.mixed.plagueExpired ?? 0} expired, ${summary.duel.abilities.mixed.plagueCures ?? 0} cured; infections ended after 0/1/2/3 turns ${[summary.duel.abilities.mixed.plagueTurnsAtEnd ?? []].flat().join("/")}; games with Plague ${summary.duel.abilities.gamesWithPlague}/${summary.duel.abilities.undeadGames}`,
    `Bitten (mixed): ${summary.duel.abilities.mixed.bites ?? 0} bites, ${summary.duel.abilities.mixed.bittenRisings ?? 0} risings, ${summary.duel.abilities.mixed.bittenCures ?? 0} cured; games with a Bitten rising ${summary.duel.abilities.gamesWithBittenRising}/${summary.duel.abilities.undeadGames}; unanswered attacks ${summary.duel.abilities.mixed.unansweredAttacks ?? 0}`,
    `Plague duration (mixed games with Plague ${summary.duel.plague.gamesWithPlague}/${summary.duel.plague.games}): most plagued at once mean ${summary.duel.plague.plaguedMaximum.mean} p90 ${summary.duel.plague.plaguedMaximum.p90}; rounds with Plague mean ${summary.duel.plague.plagueRounds.mean} p90 ${summary.duel.plague.plagueRounds.p90}; longest streak mean ${summary.duel.plague.longestStreak.mean}; longest single-unit Plague mean ${summary.duel.plague.longestUnitTurns.mean} turns; plagued unit-turns per game ${summary.duel.plague.plaguedUnitTurnsPerGame}; turns per plagued unit ${summary.duel.plague.turnsPerPlaguedUnit}`,
    "",
    "| Pairing | Games | Undead win | Seat-0 win | First mover win | Rounds mean/median/p90 | Cap rate |",
    "| --- | ---: | --- | --- | --- | --- | ---: |",
    ...Object.entries(summary.duel.perPairing).map(
      ([pairing, row]) =>
        `| ${pairing} | ${row.games} | ${row.undeadWin === null ? "—" : pct(row.undeadWin)} | ${pct(row.seatZeroWin)} | ${pct(row.firstMoverWin)} | ${row.rounds.mean}/${row.rounds.median}/${row.rounds.p90} | ${row.capRate} |`,
    ),
    "",
    "| Map | Undead win |",
    "| --- | --- |",
    ...Object.entries(summary.duel.undeadWinByMap).map(
      ([name, rate]) => `| ${name} | ${pct(rate)} |`,
    ),
    "",
    "| Size | Undead win |",
    "| --- | --- |",
    ...Object.entries(summary.duel.undeadWinBySize).map(
      ([name, rate]) => `| ${name} | ${pct(rate)} |`,
    ),
    "",
    "| Map/size | Undead win |",
    "| --- | --- |",
    ...Object.entries(summary.duel.undeadWinByMapSize).map(
      ([name, rate]) => `| ${name} | ${pct(rate)} |`,
    ),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

// Dispatch last so every module-level constant above is initialized.
if (isEntryPoint && args.includes("--worker")) await runWorker();
else if (isEntryPoint) await runMain();
