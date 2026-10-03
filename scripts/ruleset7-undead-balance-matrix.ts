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
 * Revision 17 (`pulp_wars-0ao.7`) adds the Goblin pairings `GH`, `HG`, `GU`,
 * `UG`, and `GG`, the four-seat mixes with all three factions (`GHUG`,
 * `HUGH`, `UGHU`), and the section 14.2 Goblin telemetry (`summary.goblin`).
 *
 * Revision 19 (`pulp_wars-c87.8`) adds the Dinosaur pairings `DH`, `HD`,
 * `DU`, `UD`, `DG`, `GD`, and `DD`, the four-seat mixes with all four
 * factions (`HUGD`, `DHUG`, `GDHU`, `UGDH`), and the section 15.2 Dinosaur
 * telemetry (`summary.dinosaur`).
 *
 * Revision 20 balance (`pulp_wars-0hi.3`) adds per-match telemetry to the
 * detail entries only (`--detail-output`; the summary is unchanged): for
 * every faction, Promotions with the damage their full heal removed, losses
 * by role, and accepted commands by kind (`MatrixEntry.promotions`); for
 * every Dinosaur seat, the damage removed by growth heals by role, T-Rex
 * attacks, and Rampage chain lengths.
 *
 * Usage:
 *   npm run balance:ruleset7-undead -- [--seeds 30] [--multi-seeds 4]
 *     [--sizes 11,14] [--maps dry-land,pangea,continents,archipelago,lakes]
 *     [--pairings HU,UH,UU,HH,GH,HG,GU,UG,GG,DH,HD,DU,UD,DG,GD,DD,
 *       HUHU,UHUH,GHUG,HUGH,UGHU,HUGD,DHUG,GDHU,UGDH]
 *     [--max-rounds 150]
 *     [--multi-max-rounds 120] [--jobs N] [--output file.json]
 *     [--detail-output file.json] [--markdown] [--strict]
 *     [--first-seed 0] [--from-detail a.json,b.json]
 *
 * Seeds are 0..N-1 for every cell (`--first-seed K` starts the 1v1 seeds at
 * K). `--strict` exits non-zero when any match ends in a policy error or
 * stall (they are always counted in the summary). `--from-detail` runs no
 * match: it reads the per-match entries of earlier `--detail-output` files
 * and summarises the cells the other parameters select, so one run can be
 * split over several processes or summarised for a seed subset.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
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
import {
  attackIsChargeV7,
  factionTreeV7,
  unitGrowthStageV7,
} from "../src/engine/rules/ruleset-v7";
import type { PlayerId } from "../src/engine/model/ids";
import {
  arePlayersAlliedV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
} from "../src/engine/v7/economy";
import {
  defenseBonusForUnitV7,
  fortificationLevelForUnitV7,
} from "../src/engine/v7/combat";
import { nestTilesV7 } from "../src/engine/v7/eggs";
import { applyCommandV7, createPlayableGameV7 } from "../src/engine/v7/reducer";

const MAP_TYPES: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
/**
 * Seat-ordered pairings: `H` Human (`ORIGINAL`), `U` Undead, `G` Goblin
 * (`pulp_wars-0ao.7` adds the Goblin 1v1 pairings and the four-seat mixes
 * with all three factions), `D` Dinosaur (`pulp_wars-c87.8` adds the
 * Dinosaur 1v1 pairings and the four-seat mixes with all four factions).
 */
const PAIRINGS = {
  HU: ["ORIGINAL", "UNDEAD"],
  UH: ["UNDEAD", "ORIGINAL"],
  UU: ["UNDEAD", "UNDEAD"],
  HH: ["ORIGINAL", "ORIGINAL"],
  GH: ["GOBLIN", "ORIGINAL"],
  HG: ["ORIGINAL", "GOBLIN"],
  GU: ["GOBLIN", "UNDEAD"],
  UG: ["UNDEAD", "GOBLIN"],
  GG: ["GOBLIN", "GOBLIN"],
  DH: ["DINOSAUR", "ORIGINAL"],
  HD: ["ORIGINAL", "DINOSAUR"],
  DU: ["DINOSAUR", "UNDEAD"],
  UD: ["UNDEAD", "DINOSAUR"],
  DG: ["DINOSAUR", "GOBLIN"],
  GD: ["GOBLIN", "DINOSAUR"],
  DD: ["DINOSAUR", "DINOSAUR"],
  HUHU: ["ORIGINAL", "UNDEAD", "ORIGINAL", "UNDEAD"],
  UHUH: ["UNDEAD", "ORIGINAL", "UNDEAD", "ORIGINAL"],
  GHUG: ["GOBLIN", "ORIGINAL", "UNDEAD", "GOBLIN"],
  HUGH: ["ORIGINAL", "UNDEAD", "GOBLIN", "ORIGINAL"],
  UGHU: ["UNDEAD", "GOBLIN", "ORIGINAL", "UNDEAD"],
  HUGD: ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"],
  DHUG: ["DINOSAUR", "ORIGINAL", "UNDEAD", "GOBLIN"],
  GDHU: ["GOBLIN", "DINOSAUR", "ORIGINAL", "UNDEAD"],
  UGDH: ["UNDEAD", "GOBLIN", "DINOSAUR", "ORIGINAL"],
} as const satisfies Record<string, readonly FactionIdV7[]>;
type PairingId = keyof typeof PAIRINGS;
const ONE_VS_ONE: readonly PairingId[] = [
  "HU",
  "UH",
  "UU",
  "HH",
  "GH",
  "HG",
  "GU",
  "UG",
  "GG",
  "DH",
  "HD",
  "DU",
  "UD",
  "DG",
  "GD",
  "DD",
];
const MULTI: readonly PairingId[] = [
  "HUHU",
  "UHUH",
  "GHUG",
  "HUGH",
  "UGHU",
  "HUGD",
  "DHUG",
  "GDHU",
  "UGDH",
];
/** 1v1 pairings without a Goblin seat (the cap-rate reference). */
const NON_GOBLIN_ONE_VS_ONE: readonly PairingId[] = ["HU", "UH", "UU", "HH"];
/** The revision-17 Goblin 1v1 pairings and mixes (section 14.3 measures). */
const GOBLIN_ONE_VS_ONE: readonly PairingId[] = ["GH", "HG", "GU", "UG", "GG"];
const GOBLIN_MULTI: readonly PairingId[] = ["GHUG", "HUGH", "UGHU"];
/** The revision-19 Dinosaur 1v1 pairings and mixes (section 15.3). */
const DINOSAUR_ONE_VS_ONE: readonly PairingId[] = [
  "DH",
  "HD",
  "DU",
  "UD",
  "DG",
  "GD",
  "DD",
];
const DINOSAUR_MULTI: readonly PairingId[] = ["HUGD", "DHUG", "GDHU", "UGDH"];

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
  /** `pulp_wars-vkq.21` Lich lifecycles (Undead seats' `CATAPULT` role). */
  readonly liches: LichStats;
  /** `pulp_wars-0ao.7` Goblin telemetry; null in a match without Goblins. */
  readonly goblin: GoblinMatchStats | null;
  /** `pulp_wars-c87.8` Dinosaur telemetry; null without a Dinosaur seat. */
  readonly dinosaur: DinosaurMatchStats | null;
  /**
   * `pulp_wars-0hi.3` Promotions per faction (revision 20 section 8.2);
   * absent in detail files written before it was added.
   */
  readonly promotions?: Partial<Record<FactionIdV7, PromotionStats>>;
}

/** Promotions of one faction's units in one match (revision 20 section 5). */
interface PromotionStats {
  promotions: number;
  /** Units promoted while wounded, and the damage the Promotion removed. */
  wounded: number;
  hpRestored: number;
  byRole: Partial<Record<UnitRoleIdV7, number>>;
  /** Units lost other than by elimination, by role (Eggs excluded). */
  lossesByRole: Partial<Record<UnitRoleIdV7, number>>;
  /** Accepted commands by kind (which abilities the faction used). */
  commands: Record<string, number>;
}

/**
 * Replays the accepted command log and counts every accepted `PROMOTE` with
 * the damage its full heal removed (the unit's missing HP just before it).
 */
function promotionTelemetry(
  setup: MatchSetupV7,
  log: ReturnType<typeof runAiMatchV7>["commandLog"],
): Partial<Record<FactionIdV7, PromotionStats>> {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state = created.state;
  const factionOf = new Map<number, FactionIdV7>(
    state.players.map((player) => [player.id as number, player.faction]),
  );
  const totals: Partial<Record<FactionIdV7, PromotionStats>> = {};
  for (const faction of factionOf.values())
    totals[faction] ??= {
      promotions: 0,
      wounded: 0,
      hpRestored: 0,
      byRole: {},
      lossesByRole: {},
      commands: {},
    };
  for (const record of log) {
    const command = record.command;
    if (command.kind === "PROMOTE") {
      const unit = state.units.find((item) => item.id === command.unitId);
      const faction = factionOf.get(record.playerId);
      const stats = faction === undefined ? undefined : totals[faction];
      if (unit !== undefined && stats !== undefined) {
        const missing = Math.max(0, unit.maxHp - unit.hp);
        stats.promotions += 1;
        stats.wounded += Number(missing > 0);
        stats.hpRestored += missing;
        bump(stats.byRole, unit.role);
      }
    }
    const actorFaction = factionOf.get(record.playerId);
    const actorStats =
      actorFaction === undefined ? undefined : totals[actorFaction];
    if (actorStats !== undefined)
      actorStats.commands[command.kind] =
        (actorStats.commands[command.kind] ?? 0) + 1;
    for (const event of record.events) {
      if (event.kind !== "UNIT_DIED" || event.cause === "ELIMINATION") continue;
      const dead = state.units.find((item) => item.id === event.unitId);
      if (dead === undefined || dead.form === "EGG") continue;
      const faction = factionOf.get(dead.ownerId);
      const stats = faction === undefined ? undefined : totals[faction];
      if (stats !== undefined) bump(stats.lossesByRole, dead.role);
    }
    const result = applyCommandV7(state, record.playerId, command);
    if (!result.accepted)
      throw new Error("Promotion telemetry replay rejected");
    state = result.state;
  }
  return totals;
}

/**
 * Revision 17 section 14.2 Goblin telemetry for one Goblin seat of one match
 * (`pulp_wars-0ao.7`). "Friendly" is the seat's own or allied units; the
 * exploding unit itself is never a victim of its own blast.
 */
interface GoblinSeatStats {
  seat: number;
  kabooms: number;
  kaboomsByRole: Partial<Record<UnitRoleIdV7, number>>;
  deathBlasts: number;
  deathBlastsByRole: Partial<Record<UnitRoleIdV7, number>>;
  /** This seat's explosions by chain wave (index 0 is wave 1). */
  explosionsByWave: number[];
  /** Hits of this seat's explosions (credited to it), by victim side. */
  blastHostileDamage: number;
  blastHostileKills: number;
  blastOwnDamage: number;
  blastOwnKills: number;
  blastAlliedDamage: number;
  blastAlliedKills: number;
  /** Death blasts only (a subset of the blast totals). */
  deathBlastHostileDamage: number;
  deathBlastHostileKills: number;
  deathBlastFriendlyDamage: number;
  deathBlastFriendlyKills: number;
  /**
   * Every explosion of chains this seat's Kaboom started, by side relative
   * to this seat (whoever owns the exploding units of later waves).
   */
  kaboomChainHostileDamage: number;
  kaboomChainHostileKills: number;
  kaboomChainFriendlyDamage: number;
  kaboomChainFriendlyKills: number;
  /** Kabooms whose chain did more hostile than friendly damage. */
  kaboomsNetPositive: number;
  /** Bomb splash of this seat's attacks, by victim side. */
  bombHostileDamage: number;
  bombHostileKills: number;
  bombFriendlyDamage: number;
  bombFriendlyKills: number;
  plunderCoins: number;
  /** Attacks by this seat's units by Gang Up bonus 0, +1, +2. */
  gangUp: [number, number, number];
  /** Attacks with a Gang Up bonus that killed their target. */
  gangUpKills: number;
  waaaghs: number;
  waaaghUnits: number;
  trolls: number;
  trollRegeneration: number;
  /** Own turns, and those that reached 128 accepted commands. */
  turns: number;
  capTurns: number;
  /** Most units the seat owned at one End Turn. */
  maxUnits: number;
  /**
   * Hostile kills and damage by the role of the unit credited with them:
   * attacks, retaliation, hostile splash, and explosions of that role.
   */
  killsByRole: Partial<Record<UnitRoleIdV7, number>>;
  damageByRole: Partial<Record<UnitRoleIdV7, number>>;
  /** This seat's unit deaths by role and by cause (`EXPLOSION_OWN` etc.). */
  lossesByRole: Partial<Record<UnitRoleIdV7, number>>;
  lossesByCause: Record<string, number>;
  /** Own and allied units killed by this seat's explosions, by role. */
  friendlyBlastKillsByRole: Partial<Record<UnitRoleIdV7, number>>;
  /**
   * Explosions that killed an own or allied unit, by exploding role and
   * how it died (`KABOOM` for its own Kaboom).
   */
  friendlyKillingBlastsByRole: Partial<Record<string, number>>;
}

/** Goblin telemetry for one match: per Goblin seat plus chain shape. */
interface GoblinMatchStats {
  readonly seats: GoblinSeatStats[];
  /** Commands (or Start Turns) with at least one explosion. */
  chains: number;
  /** Most explosions in one chain, and the deepest wave. */
  longestChain: number;
  deepestWave: number;
  /** Chains by explosion count: 1, 2, 3, 4, 5 or more. */
  chainSizes: [number, number, number, number, number];
}

function emptyGoblinSeat(seat: number): GoblinSeatStats {
  return {
    seat,
    kabooms: 0,
    kaboomsByRole: {},
    deathBlasts: 0,
    deathBlastsByRole: {},
    explosionsByWave: [],
    blastHostileDamage: 0,
    blastHostileKills: 0,
    blastOwnDamage: 0,
    blastOwnKills: 0,
    blastAlliedDamage: 0,
    blastAlliedKills: 0,
    deathBlastHostileDamage: 0,
    deathBlastHostileKills: 0,
    deathBlastFriendlyDamage: 0,
    deathBlastFriendlyKills: 0,
    kaboomChainHostileDamage: 0,
    kaboomChainHostileKills: 0,
    kaboomChainFriendlyDamage: 0,
    kaboomChainFriendlyKills: 0,
    kaboomsNetPositive: 0,
    bombHostileDamage: 0,
    bombHostileKills: 0,
    bombFriendlyDamage: 0,
    bombFriendlyKills: 0,
    plunderCoins: 0,
    gangUp: [0, 0, 0],
    gangUpKills: 0,
    waaaghs: 0,
    waaaghUnits: 0,
    trolls: 0,
    trollRegeneration: 0,
    turns: 0,
    capTurns: 0,
    maxUnits: 0,
    killsByRole: {},
    damageByRole: {},
    lossesByRole: {},
    lossesByCause: {},
    friendlyBlastKillsByRole: {},
    friendlyKillingBlastsByRole: {},
  };
}

const bump = <K extends string>(
  record: Partial<Record<K, number>>,
  key: K,
  amount = 1,
) => {
  record[key] = (record[key] ?? 0) + amount;
};

/**
 * Replays the accepted command log from the setup (the reducer is
 * deterministic) so every event can be attributed with the owners and roles
 * of the units just before it. Only called for matches with a Goblin seat.
 */
function goblinTelemetry(
  setup: MatchSetupV7,
  log: ReturnType<typeof runAiMatchV7>["commandLog"],
): GoblinMatchStats {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state = created.state;
  const seats = new Map<number, GoblinSeatStats>();
  for (const player of state.players)
    if (player.faction === "GOBLIN")
      seats.set(player.id, emptyGoblinSeat(player.seat));
  const match: GoblinMatchStats = {
    seats: [...seats.values()],
    chains: 0,
    longestChain: 0,
    deepestWave: 0,
    chainSizes: [0, 0, 0, 0, 0],
  };
  const friendly = (credited: PlayerId, owner: PlayerId | undefined) =>
    owner === credited ||
    (owner !== undefined && arePlayersAlliedV7(state, credited, owner));
  let turnCommands = 0;
  for (const record of log) {
    const before = state;
    const units = new Map(
      before.units.map((unit) => [unit.id as number, unit]),
    );
    const result = applyCommandV7(state, record.playerId, record.command);
    if (!result.accepted) throw new Error("Goblin telemetry replay rejected");
    state = result.state;
    const after = new Map(state.units.map((unit) => [unit.id as number, unit]));
    const unitOf = (unitId: number) => units.get(unitId) ?? after.get(unitId);
    const ownerOf = (unitId: number) => unitOf(unitId)?.ownerId;
    turnCommands += 1;
    const actor = seats.get(record.playerId);
    if (record.command.kind === "END_TURN") {
      if (actor !== undefined) {
        actor.turns += 1;
        actor.capTurns += Number(turnCommands >= 128);
        actor.maxUnits = Math.max(
          actor.maxUnits,
          before.units.filter((unit) => unit.ownerId === record.playerId)
            .length,
        );
      }
      turnCommands = 0;
    }
    if (actor !== undefined && record.command.kind === "RALLY")
      actor.waaaghs += 1;
    const kaboomSeat =
      record.command.kind === "KABOOM" ? seats.get(record.playerId) : undefined;
    let chainExplosions = 0;
    let kaboomHostile = 0;
    let kaboomFriendly = 0;
    // How each unit died in this command (an exploder's blast follows).
    const deathCause = new Map<number, string>();
    for (const event of record.events) {
      if (event.kind === "UNITS_RALLIED" && actor !== undefined)
        actor.waaaghUnits += event.unitIds.length;
      if (event.kind === "PLUNDER_AWARDED") {
        const seat = seats.get(event.playerId);
        if (seat !== undefined) seat.plunderCoins += event.coins;
      }
      if (event.kind === "UNIT_REWARD_GRANTED" && event.role === "JUGGERNAUT") {
        const seat = seats.get(event.playerId);
        if (seat !== undefined) seat.trolls += 1;
      }
      if (event.kind === "UNITS_REGENERATED") {
        const seat = seats.get(event.playerId);
        if (seat !== undefined)
          seat.trollRegeneration += sum(
            event.results.map((entry) => entry.amount),
          );
      }
      if (event.kind === "UNIT_DIED") deathCause.set(event.unitId, event.cause);
      if (event.kind === "UNIT_DIED" && event.cause !== "ELIMINATION") {
        const unit = unitOf(event.unitId);
        const seat = unit === undefined ? undefined : seats.get(unit.ownerId);
        if (unit !== undefined && seat !== undefined) {
          bump(seat.lossesByRole, unit.role);
          seat.lossesByCause[event.cause] =
            (seat.lossesByCause[event.cause] ?? 0) + 1;
        }
      }
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        const attacker = unitOf(preview.attackerId);
        const defender = unitOf(preview.targetUnitId);
        const attackerSeat =
          attacker === undefined ? undefined : seats.get(attacker.ownerId);
        const defenderSeat =
          defender === undefined ? undefined : seats.get(defender.ownerId);
        if (attacker !== undefined && attackerSeat !== undefined) {
          attackerSeat.gangUp[preview.gangUp] += 1;
          if (preview.gangUp > 0 && preview.defenderDies)
            attackerSeat.gangUpKills += 1;
          bump(
            attackerSeat.damageByRole,
            attacker.role,
            preview.damageToDefender,
          );
          if (preview.defenderDies)
            bump(attackerSeat.killsByRole, attacker.role);
          // Bomb Chucker bombs; a Battleship's (hostile-only) splash counts
          // only towards its role's damage and kills.
          const bomb = attacker.role === "MARKSMAN";
          for (const entry of preview.splash) {
            if (friendly(attacker.ownerId, ownerOf(entry.unitId))) {
              attackerSeat.bombFriendlyDamage += entry.damage;
              attackerSeat.bombFriendlyKills += Number(entry.dies);
            } else {
              if (bomb) {
                attackerSeat.bombHostileDamage += entry.damage;
                attackerSeat.bombHostileKills += Number(entry.dies);
              }
              bump(attackerSeat.damageByRole, attacker.role, entry.damage);
              if (entry.dies) bump(attackerSeat.killsByRole, attacker.role);
            }
          }
        }
        if (defender !== undefined && defenderSeat !== undefined) {
          bump(
            defenderSeat.damageByRole,
            defender.role,
            preview.damageToAttacker,
          );
          if (preview.attackerDies)
            bump(defenderSeat.killsByRole, defender.role);
        }
      }
      if (event.kind === "EXPLOSION_RESOLVED") {
        chainExplosions += 1;
        match.deepestWave = Math.max(match.deepestWave, event.wave);
        const seat = seats.get(event.playerId);
        if (seat !== undefined) {
          if (event.cause === "KABOOM") {
            seat.kabooms += 1;
            bump(seat.kaboomsByRole, event.role);
          } else {
            seat.deathBlasts += 1;
            bump(seat.deathBlastsByRole, event.role);
          }
          seat.explosionsByWave[event.wave - 1] =
            (seat.explosionsByWave[event.wave - 1] ?? 0) + 1;
        }
        let killedFriendly = false;
        for (const hit of event.results) {
          const owner = ownerOf(hit.unitId);
          if (seat !== undefined) {
            const own = owner === event.playerId;
            const allied = !own && friendly(event.playerId, owner);
            const victim = unitOf(hit.unitId);
            if ((own || allied) && hit.dies && victim !== undefined) {
              bump(seat.friendlyBlastKillsByRole, victim.role);
              killedFriendly = true;
            }
            if (own) {
              seat.blastOwnDamage += hit.damage;
              seat.blastOwnKills += Number(hit.dies);
            } else if (allied) {
              seat.blastAlliedDamage += hit.damage;
              seat.blastAlliedKills += Number(hit.dies);
            } else {
              seat.blastHostileDamage += hit.damage;
              seat.blastHostileKills += Number(hit.dies);
              bump(seat.damageByRole, event.role, hit.damage);
              if (hit.dies) bump(seat.killsByRole, event.role);
            }
            if (event.cause === "DEATH") {
              if (own || allied) {
                seat.deathBlastFriendlyDamage += hit.damage;
                seat.deathBlastFriendlyKills += Number(hit.dies);
              } else {
                seat.deathBlastHostileDamage += hit.damage;
                seat.deathBlastHostileKills += Number(hit.dies);
              }
            }
          }
          if (kaboomSeat !== undefined) {
            if (friendly(record.playerId, owner)) {
              kaboomSeat.kaboomChainFriendlyDamage += hit.damage;
              kaboomSeat.kaboomChainFriendlyKills += Number(hit.dies);
              kaboomFriendly += hit.damage;
            } else {
              kaboomSeat.kaboomChainHostileDamage += hit.damage;
              kaboomSeat.kaboomChainHostileKills += Number(hit.dies);
              kaboomHostile += hit.damage;
            }
          }
        }
        if (killedFriendly && seat !== undefined)
          bump(
            seat.friendlyKillingBlastsByRole,
            `${event.role}:${event.cause === "KABOOM" ? "KABOOM" : (deathCause.get(event.unitId) ?? "?")}`,
          );
      }
    }
    if (kaboomSeat !== undefined && kaboomHostile > kaboomFriendly)
      kaboomSeat.kaboomsNetPositive += 1;
    if (chainExplosions > 0) {
      match.chains += 1;
      match.longestChain = Math.max(match.longestChain, chainExplosions);
      const size = Math.min(5, chainExplosions) - 1;
      match.chainSizes[size] = (match.chainSizes[size] ?? 0) + 1;
    }
  }
  return match;
}

type RoleCounts = Partial<Record<UnitRoleIdV7, number>>;

/**
 * Revision 19 section 15.2 Dinosaur telemetry for one Dinosaur seat of one
 * match (`pulp_wars-c87.8`). Rounds advance at each Start Turn of the first
 * seat in turn order; an Egg's role is the role of the unit inside.
 */
interface DinosaurSeatStats {
  seat: number;
  /** Own turns, and those that reached 128 accepted commands. */
  turns: number;
  capTurns: number;
  /** Units owned at each End Turn (Eggs included): the sum and the most. */
  unitTurns: number;
  maxUnits: number;
  /** Units trained with `TRAIN` or `TRAIN_NAVAL`, by role. */
  trained: RoleCounts;
  eggsLaid: RoleCounts;
  eggsHatchedByTime: RoleCounts;
  eggsHatchedByShaman: RoleCounts;
  /** Eggs destroyed by enemies (attack, splash, Wail, or explosion). */
  eggsDestroyed: RoleCounts;
  eggsDestroyedByCause: Record<string, number>;
  /** `<faction initial>:<role>` of the unit credited, or `WAIL`. */
  eggsDestroyedByAttacker: Record<string, number>;
  /** Eggs destroyed because their home city was captured. */
  eggsLostWithCity: RoleCounts;
  /** Eggs removed with their eliminated owner. */
  eggsEliminated: RoleCounts;
  /** Eggs abandoned with `DISBAND`. */
  eggsAbandoned: RoleCounts;
  /** Coins paid for Eggs, and those paid for Eggs enemies destroyed. */
  eggCoins: number;
  eggCoinsDestroyed: number;
  /** Own End Turns at which an Egg was on the board, summed over Eggs. */
  eggTurns: number;
  /** Hatched Eggs by rounds from laying to hatching: 0, 1, 2, 3, 4 or more. */
  hatchDelays: [number, number, number, number, number];
  /** Units that reached Big and Alpha, and grown units killed, by role. */
  big: RoleCounts;
  alpha: RoleCounts;
  grownLost: RoleCounts;
  alphaLost: RoleCounts;
  /** Revision 20 Charge!: attacks by a land-form Triceratops. */
  charges: number;
  /** Charges by run-up: 0, 1, and 2 tiles moved before the attack. */
  chargesByRunUp: [number, number, number];
  chargeKills: number;
  chargeEggKills: number;
  chargePushes: number;
  /** The target survived and was not pushed (never counted for an Egg). */
  chargeBlockedPushes: number;
  /** Charges after which the Triceratops followed the pushed target. */
  chargeFollows: number;
  chargeDamage: number;
  /** Field Defense destroyed on the target tile by a Charge. */
  chargeFieldDefense: number;
  /** Charges that ignored fortification, and the levels they ignored. */
  chargeFortifiedTargets: number;
  chargeFortificationIgnored: number;
  /** Charges at a unit on a city center, and those that pushed it off. */
  chargeCenterTargets: number;
  chargeCenterPushes: number;
  /** Triceratops killed before their owner's next turn after a Charge. */
  triceratopsLostAfterCharge: number;
  /** Attacks of other dinosaurs that ignored City Walls (Wallbreaker). */
  wallbreakerAttacks: number;
  /** Own turns that began with a land-form Triceratops. */
  turnsWithTriceratops: number;
  /** Land-form Triceratops at the start of own turns. */
  triceratopsTurns: number;
  /** Spitter attacks, and those that ignored cover or fortification. */
  acidAttacks: number;
  acidIgnored: number;
  /** Hits on this seat's units that Armoured reduced (1 damage each). */
  armouredPrevented: number;
  hatches: number;
  warDrums: number;
  warDrumsUnits: number;
  tends: number;
  /** Own cities at each End Turn, with their used slots and capacity. */
  cityTurns: number;
  slotsUsed: number;
  slotsCapacity: number;
  maxSlotsUsed: number;
  overCapacityCityTurns: number;
  /** City-turns with no free slot, with fewer than two, and with no nest tile. */
  fullCityTurns: number;
  noTwoSlotCityTurns: number;
  noNestCityTurns: number;
  /** Land-form units of the two-slot roles at each End Turn, summed. */
  bigBodyTurns: RoleCounts;
  /** Hostile kills by the credited unit's role; losses by role and cause. */
  killsByRole: RoleCounts;
  lossesByRole: RoleCounts;
  lossesByCause: Record<string, number>;
  /** Round each technology was researched in. */
  researchRound: Record<string, number>;
  /** Round the first Egg of each role was laid in. */
  firstEggRound: RoleCounts;
  /**
   * `pulp_wars-0hi.3` (revision 20 section 8.2): damage removed by the full
   * heal of a growth stage, by role (the +4 maximum HP is not counted).
   */
  growthHpRestored?: RoleCounts;
  /**
   * Attacks one T-Rex made in one own turn (a Rampage chain), by length:
   * 1, 2, 3, 4 or more.
   */
  tRexChains?: [number, number, number, number];
  /** Attacks by a land-form T-Rex. */
  tRexAttacks?: number;
}

/** Dinosaur telemetry for one match: one entry per Dinosaur seat. */
interface DinosaurMatchStats {
  readonly seats: DinosaurSeatStats[];
}

function emptyDinosaurSeat(seat: number): DinosaurSeatStats {
  return {
    seat,
    turns: 0,
    capTurns: 0,
    unitTurns: 0,
    maxUnits: 0,
    trained: {},
    eggsLaid: {},
    eggsHatchedByTime: {},
    eggsHatchedByShaman: {},
    eggsDestroyed: {},
    eggsDestroyedByCause: {},
    eggsDestroyedByAttacker: {},
    eggsLostWithCity: {},
    eggsEliminated: {},
    eggsAbandoned: {},
    eggCoins: 0,
    eggCoinsDestroyed: 0,
    eggTurns: 0,
    hatchDelays: [0, 0, 0, 0, 0],
    big: {},
    alpha: {},
    grownLost: {},
    alphaLost: {},
    charges: 0,
    chargesByRunUp: [0, 0, 0],
    chargeKills: 0,
    chargeEggKills: 0,
    chargePushes: 0,
    chargeBlockedPushes: 0,
    chargeFollows: 0,
    chargeDamage: 0,
    chargeFieldDefense: 0,
    chargeFortifiedTargets: 0,
    chargeFortificationIgnored: 0,
    chargeCenterTargets: 0,
    chargeCenterPushes: 0,
    triceratopsLostAfterCharge: 0,
    wallbreakerAttacks: 0,
    turnsWithTriceratops: 0,
    triceratopsTurns: 0,
    acidAttacks: 0,
    acidIgnored: 0,
    armouredPrevented: 0,
    hatches: 0,
    warDrums: 0,
    warDrumsUnits: 0,
    tends: 0,
    cityTurns: 0,
    slotsUsed: 0,
    slotsCapacity: 0,
    maxSlotsUsed: 0,
    overCapacityCityTurns: 0,
    fullCityTurns: 0,
    noTwoSlotCityTurns: 0,
    noNestCityTurns: 0,
    bigBodyTurns: {},
    killsByRole: {},
    lossesByRole: {},
    lossesByCause: {},
    researchRound: {},
    firstEggRound: {},
    growthHpRestored: {},
    tRexChains: [0, 0, 0, 0],
    tRexAttacks: 0,
  };
}

/**
 * Replays the accepted command log (as {@link goblinTelemetry} does) and
 * attributes every Dinosaur event. Only called for matches with a Dinosaur
 * seat. Revision 20: the Stampede counters are Charge! counters (attacks by
 * a land-form Triceratops, by run-up, with pushes, follows, and the
 * fortification they ignored).
 */
function dinosaurTelemetry(
  setup: MatchSetupV7,
  log: ReturnType<typeof runAiMatchV7>["commandLog"],
): DinosaurMatchStats {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state = created.state;
  const seats = new Map<number, DinosaurSeatStats>();
  const factionOf = new Map<number, FactionIdV7>();
  for (const player of state.players) {
    factionOf.set(player.id, player.faction);
    if (player.faction === "DINOSAUR")
      seats.set(player.id, emptyDinosaurSeat(player.seat));
  }
  const first = state.turnOrder[0];
  let round = 1;
  let turnCommands = 0;
  let newTurn = true;
  const cityCenters = new Set(state.cities.map((city) => coordKey(city.at)));
  // Eggs on the board: owner, role, cost, and the round they were laid in.
  const eggs = new Map<
    number,
    { owner: number; role: UnitRoleIdV7; cost: number; round: number }
  >();
  // Triceratops that charged since their owner's last Start Turn.
  const charged = new Map<number, number>();
  // Attacks each land-form T-Rex has made in its owner's current turn.
  const rampage = new Map<number, number>();
  for (const record of log) {
    const before = state;
    const units = new Map(
      before.units.map((unit) => [unit.id as number, unit]),
    );
    const actor = seats.get(record.playerId);
    const command = record.command;
    // A pending city reward is settled before anything is offered.
    const settling: boolean = newTurn && command.kind === "CHOOSE_CITY_REWARD";
    if (newTurn && !settling && actor !== undefined) {
      const triceratops = before.units.filter(
        (unit) =>
          unit.ownerId === record.playerId &&
          unit.hp > 0 &&
          attackIsChargeV7(before, unit),
      );
      if (triceratops.length > 0) {
        actor.turnsWithTriceratops += 1;
        actor.triceratopsTurns += triceratops.length;
      }
    }
    newTurn = command.kind === "END_TURN" || settling;
    turnCommands += 1;
    if (command.kind === "END_TURN") {
      if (actor !== undefined) {
        actor.turns += 1;
        actor.capTurns += Number(turnCommands >= 128);
        const own = before.units.filter(
          (unit) => unit.ownerId === record.playerId && unit.hp > 0,
        );
        actor.unitTurns += own.length;
        actor.maxUnits = Math.max(actor.maxUnits, own.length);
        for (const unit of own) {
          if (unit.form === "EGG") actor.eggTurns += 1;
          else if (
            unit.form === "LAND" &&
            (unit.role === "CATAPULT" ||
              unit.role === "KNIGHT" ||
              unit.role === "JUGGERNAUT")
          )
            bump(actor.bigBodyTurns, unit.role);
        }
        for (const city of before.cities) {
          if (city.ownerId !== record.playerId) continue;
          const capacity = cityUnitCapacityV7(before, city);
          const used = assignedUnitCountV7(before, city.id);
          actor.cityTurns += 1;
          actor.slotsUsed += used;
          actor.slotsCapacity += capacity;
          actor.maxSlotsUsed = Math.max(actor.maxSlotsUsed, used);
          actor.overCapacityCityTurns += Number(used > capacity);
          actor.fullCityTurns += Number(used >= capacity);
          actor.noTwoSlotCityTurns += Number(capacity - used < 2);
          actor.noNestCityTurns += Number(
            nestTilesV7(before, city).length === 0,
          );
        }
      }
      turnCommands = 0;
      if (actor !== undefined) {
        for (const attacks of rampage.values()) {
          const index = Math.min(4, attacks) - 1;
          const chains = (actor.tRexChains ??= [0, 0, 0, 0]);
          chains[index] = (chains[index] ?? 0) + 1;
        }
      }
      rampage.clear();
    }
    if (command.kind === "ATTACK" && actor !== undefined) {
      const attacker = units.get(command.unitId);
      if (
        attacker !== undefined &&
        attacker.role === "KNIGHT" &&
        attacker.form === "LAND"
      ) {
        rampage.set(command.unitId, (rampage.get(command.unitId) ?? 0) + 1);
        actor.tRexAttacks = (actor.tRexAttacks ?? 0) + 1;
      }
    }
    const result = applyCommandV7(state, record.playerId, command);
    if (!result.accepted) throw new Error("Dinosaur telemetry replay rejected");
    state = result.state;
    const after = new Map(state.units.map((unit) => [unit.id as number, unit]));
    const unitOf = (unitId: number) => units.get(unitId) ?? after.get(unitId);
    const killerName = (unitId: number, suffix = "") => {
      const unit = unitOf(unitId);
      return unit === undefined
        ? "?"
        : `${(factionOf.get(unit.ownerId) ?? "?").slice(0, 1)}:${unit.role}${suffix}`;
    };
    if (actor !== undefined) {
      if (command.kind === "HATCH") actor.hatches += 1;
      if (command.kind === "RALLY") actor.warDrums += 1;
      if (command.kind === "TEND_WOUNDED") actor.tends += 1;
    }
    // Who destroyed each unit in this command (events may come in any order).
    const killedBy = new Map<number, string>();
    for (const event of record.events) {
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        if (preview.defenderDies)
          killedBy.set(preview.targetUnitId, killerName(preview.attackerId));
        for (const entry of preview.splash)
          if (entry.dies)
            killedBy.set(
              entry.unitId,
              killerName(preview.attackerId, ":SPLASH"),
            );
      }
      if (event.kind === "WAIL_RESOLVED")
        for (const entry of event.results)
          if (entry.dies) killedBy.set(entry.unitId, "WAIL");
      if (event.kind === "EXPLOSION_RESOLVED")
        for (const hit of event.results)
          if (hit.dies)
            killedBy.set(
              hit.unitId,
              `${(factionOf.get(event.playerId) ?? "?").slice(0, 1)}:${event.role}:BLAST`,
            );
    }
    // Revision 20: an `ATTACK` by a land-form Triceratops is a Charge!.
    const charger =
      command.kind === "ATTACK" ? units.get(command.unitId) : undefined;
    const chargeActor =
      charger !== undefined && attackIsChargeV7(before, charger)
        ? actor
        : undefined;
    let chargePushed = false;
    let chargeFollowed = false;
    let chargeSurvivor: number | null = null;
    for (const event of record.events) {
      if (event.kind === "TURN_STARTED") {
        if (event.playerId === first) round += 1;
        for (const [unitId, owner] of charged)
          if (owner === event.playerId) charged.delete(unitId);
      }
      if (event.kind === "TECH_RESEARCHED") {
        const seat = seats.get(event.playerId);
        if (seat !== undefined) seat.researchRound[event.tech] = round;
      }
      if (
        event.kind === "UNIT_TRAINED" ||
        event.kind === "NAVAL_UNIT_TRAINED"
      ) {
        const seat = seats.get(event.playerId);
        if (seat !== undefined) bump(seat.trained, event.role);
      }
      if (event.kind === "UNITS_RALLIED" && actor !== undefined)
        actor.warDrumsUnits += event.unitIds.length;
      if (event.kind === "EGG_LAID") {
        const seat = seats.get(event.playerId);
        eggs.set(event.unitId, {
          owner: event.playerId,
          role: event.role,
          cost: event.cost,
          round,
        });
        if (seat !== undefined) {
          bump(seat.eggsLaid, event.role);
          seat.eggCoins += event.cost;
          seat.firstEggRound[event.role] ??= round;
        }
      }
      if (event.kind === "EGG_HATCHED") {
        const egg = eggs.get(event.unitId);
        eggs.delete(event.unitId);
        const seat = seats.get(event.playerId);
        if (seat !== undefined) {
          bump(
            event.cause === "TIME"
              ? seat.eggsHatchedByTime
              : seat.eggsHatchedByShaman,
            event.role,
          );
          const delay = Math.min(4, round - (egg?.round ?? round));
          seat.hatchDelays[delay] = (seat.hatchDelays[delay] ?? 0) + 1;
        }
      }
      if (event.kind === "UNIT_DISBANDED") {
        const egg = eggs.get(event.unitId);
        if (egg !== undefined) {
          eggs.delete(event.unitId);
          const seat = seats.get(egg.owner);
          if (seat !== undefined) bump(seat.eggsAbandoned, egg.role);
        }
      }
      if (event.kind === "UNIT_GREW") {
        const unit = unitOf(event.unitId);
        const seat = unit === undefined ? undefined : seats.get(unit.ownerId);
        if (unit !== undefined && seat !== undefined) {
          bump(event.stage === 1 ? seat.big : seat.alpha, unit.role);
          // HP after the exchange: before the command, less the damage of
          // every exchange of this command the unit took part in.
          const prior = units.get(event.unitId);
          if (prior !== undefined) {
            let hp = prior.hp;
            for (const other of record.events)
              if (other.kind === "COMBAT_RESOLVED") {
                if (other.preview.attackerId === event.unitId)
                  hp -= other.preview.damageToAttacker;
                if (other.preview.targetUnitId === event.unitId)
                  hp -= other.preview.damageToDefender;
              }
            // Only the first stage of a command heals damage.
            const restored =
              prior.maxHp + 4 === event.maxHp
                ? Math.max(0, prior.maxHp - Math.max(0, hp))
                : 0;
            const record20 = (seat.growthHpRestored ??= {});
            record20[unit.role] = (record20[unit.role] ?? 0) + restored;
          }
        }
      }
      if (event.kind === "UNIT_DIED") {
        const egg = eggs.get(event.unitId);
        if (egg !== undefined) {
          eggs.delete(event.unitId);
          const seat = seats.get(egg.owner);
          if (seat !== undefined) {
            if (event.cause === "CITY_CAPTURED")
              bump(seat.eggsLostWithCity, egg.role);
            else if (event.cause === "ELIMINATION")
              bump(seat.eggsEliminated, egg.role);
            else {
              bump(seat.eggsDestroyed, egg.role);
              seat.eggCoinsDestroyed += egg.cost;
              seat.eggsDestroyedByCause[event.cause] =
                (seat.eggsDestroyedByCause[event.cause] ?? 0) + 1;
              const by = killedBy.get(event.unitId) ?? event.cause;
              seat.eggsDestroyedByAttacker[by] =
                (seat.eggsDestroyedByAttacker[by] ?? 0) + 1;
            }
          }
        } else if (event.cause !== "ELIMINATION") {
          const unit = unitOf(event.unitId);
          const seat = unit === undefined ? undefined : seats.get(unit.ownerId);
          if (unit !== undefined && seat !== undefined) {
            bump(seat.lossesByRole, unit.role);
            seat.lossesByCause[event.cause] =
              (seat.lossesByCause[event.cause] ?? 0) + 1;
            const stage = unitGrowthStageV7(before, unit) ?? 0;
            if (stage >= 1) bump(seat.grownLost, unit.role);
            if (stage >= 2) bump(seat.alphaLost, unit.role);
            if (charged.delete(event.unitId))
              seat.triceratopsLostAfterCharge += 1;
          }
        }
      }
      if (event.kind === "UNIT_PUSHED" && chargeActor !== undefined)
        chargePushed = true;
      if (
        event.kind === "UNIT_MOVED" &&
        chargeActor !== undefined &&
        chargePushed
      )
        chargeFollowed = true;
      if (
        event.kind === "FIELD_DEFENSE_DESTROYED" &&
        chargeActor !== undefined &&
        event.reason === "CATAPULT"
      )
        chargeActor.chargeFieldDefense += 1;
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        const attacker = unitOf(preview.attackerId);
        const defender = unitOf(preview.targetUnitId);
        const attackerSeat =
          attacker === undefined ? undefined : seats.get(attacker.ownerId);
        const defenderSeat =
          defender === undefined ? undefined : seats.get(defender.ownerId);
        if (attacker !== undefined && attackerSeat !== undefined) {
          if (preview.defenderDies)
            bump(attackerSeat.killsByRole, attacker.role);
          for (const entry of preview.splash)
            if (entry.dies) bump(attackerSeat.killsByRole, attacker.role);
          if (attacker.role === "MARKSMAN") {
            attackerSeat.acidAttacks += 1;
            const covered = units.get(preview.targetUnitId);
            attackerSeat.acidIgnored += Number(
              preview.acid &&
                covered !== undefined &&
                (defenseBonusForUnitV7(before, covered).numerator !==
                  defenseBonusForUnitV7(before, covered).denominator ||
                  fortificationLevelForUnitV7(before, covered) > 0),
            );
          }
          attackerSeat.armouredPrevented += Number(preview.attackerArmoured);
          if (chargeActor !== undefined) {
            attackerSeat.charges += 1;
            const runUp = Math.max(0, Math.min(2, preview.runUp));
            attackerSeat.chargesByRunUp[runUp] =
              (attackerSeat.chargesByRunUp[runUp] ?? 0) + 1;
            attackerSeat.chargeDamage += preview.damageToDefender;
            attackerSeat.chargeFortifiedTargets += Number(
              preview.fortificationIgnored > 0,
            );
            attackerSeat.chargeFortificationIgnored +=
              preview.fortificationIgnored;
            const egg = defender?.form === "EGG";
            if (preview.defenderDies) {
              attackerSeat.chargeKills += 1;
              attackerSeat.chargeEggKills += Number(egg);
            } else if (!egg) chargeSurvivor = preview.targetUnitId;
            if (
              defender !== undefined &&
              cityCenters.has(coordKey(defender.at))
            )
              attackerSeat.chargeCenterTargets += 1;
            charged.set(preview.attackerId, attacker.ownerId);
          } else if (preview.fortificationIgnored > 0)
            attackerSeat.wallbreakerAttacks += 1;
        }
        if (defender !== undefined && defenderSeat !== undefined) {
          if (preview.attackerDies)
            bump(defenderSeat.killsByRole, defender.role);
          defenderSeat.armouredPrevented += Number(preview.defenderArmoured);
        }
      }
    }
    if (chargeActor !== undefined && chargeSurvivor !== null) {
      if (chargePushed) {
        chargeActor.chargePushes += 1;
        chargeActor.chargeFollows += Number(chargeFollowed);
        const target = units.get(chargeSurvivor);
        if (target !== undefined && cityCenters.has(coordKey(target.at)))
          chargeActor.chargeCenterPushes += 1;
      } else chargeActor.chargeBlockedPushes += 1;
    }
  }
  return { seats: [...seats.values()] };
}

/**
 * Lich lifecycle statistics for one match (`pulp_wars-vkq.21`), summed over
 * every Undead seat.
 */
interface LichStats {
  units: number;
  /** Deaths other than elimination. */
  died: number;
  /** Deaths from splash damage, and those from a Battleship's splash. */
  diedToSplash: number;
  diedToBattleshipSplash: number;
  /** Deaths as the primary target of a Battleship attack. */
  diedToBattleship: number;
  /** Liches that newly plagued at least one unit. */
  sources: number;
  /** Of those, Liches killed (not eliminated) later. */
  sourcesKilled: number;
  /** Rounds from a source Lich's first Plague to its death, summed. */
  sourceRoundsToKill: number;
  /** Source Liches killed within three rounds of their first Plague. */
  sourcesKilledWithinThree: number;
  /**
   * Lich and Undead Vampire deaths by killer: `<faction initial>:<role>` of
   * the attacker (`:SPLASH` for splash, `:RETALIATION` for retaliation), or
   * `WAIL`/`PLAGUE`.
   */
  lichKilledBy: Record<string, number>;
  vampireKilledBy: Record<string, number>;
}

function emptyLiches(): LichStats {
  return {
    units: 0,
    died: 0,
    diedToSplash: 0,
    diedToBattleshipSplash: 0,
    diedToBattleship: 0,
    sources: 0,
    sourcesKilled: 0,
    sourceRoundsToKill: 0,
    sourcesKilledWithinThree: 0,
    lichKilledBy: {},
    vampireKilledBy: {},
  };
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
    firstSeed: positiveInteger("--first-seed", 0),
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
        for (
          let seed = parameters.firstSeed;
          seed < parameters.seeds;
          seed += 1
        )
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
    rulesetId: "pulp-wars-poc-7r24",
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
    liches: analysis.liches,
    goblin: (factions as readonly FactionIdV7[]).includes("GOBLIN")
      ? goblinTelemetry(setup, result.commandLog)
      : null,
    dinosaur: (factions as readonly FactionIdV7[]).includes("DINOSAUR")
      ? dinosaurTelemetry(setup, result.commandLog)
      : null,
    promotions: promotionTelemetry(setup, result.commandLog),
  };
}

interface SeatEconomy extends SeatSnapshots {
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
  /** Technologies in the seat's tree on this map (Dry Land has no Naval). */
  treeSize: number;
  /** Round in which the seat researched its whole tree (null if never). */
  treeCompletionRound: number | null;
}

/**
 * Rounds whose economy is snapshotted per seat (`pulp_wars-4gc` adds round 50
 * and the technology counts).
 */
const SNAPSHOT_ROUNDS = [10, 20, 30, 40, 50] as const;
type SnapshotRound = (typeof SNAPSHOT_ROUNDS)[number];

/**
 * Per-round snapshots taken when the seat's turn income is awarded in that
 * round: Coins carried into the turn (before income), the income, and the
 * technologies researched so far. `null` when the seat had no turn then.
 */
type SeatSnapshots = Record<
  | `bankRound${SnapshotRound}`
  | `incomeRound${SnapshotRound}`
  | `techsRound${SnapshotRound}`,
  number | null
>;

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
    treeSize: 0,
    treeCompletionRound: null,
    ...(Object.fromEntries(
      SNAPSHOT_ROUNDS.flatMap((round) => [
        [`bankRound${round}`, null],
        [`incomeRound${round}`, null],
        [`techsRound${round}`, null],
      ]),
    ) as SeatSnapshots),
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
  readonly liches: LichStats;
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
  const liches = emptyLiches();
  const lichFirstPlague = new Map<number, number>();
  const isLich = (unitId: number) =>
    unitRole.get(unitId) === "CATAPULT" &&
    factionOf.get(unitOwner.get(unitId) ?? -1) === "UNDEAD";
  const killer = (unitId: number, suffix = "") =>
    `${(factionOf.get(unitOwner.get(unitId) ?? -1) ?? "?").slice(0, 1)}:${unitRole.get(unitId) ?? "?"}${suffix}`;
  const recordDeath = (unitId: number, by: string) => {
    const record = isLich(unitId)
      ? liches.lichKilledBy
      : unitRole.get(unitId) === "KNIGHT" &&
          factionOf.get(unitOwner.get(unitId) ?? -1) === "UNDEAD"
        ? liches.vampireKilledBy
        : undefined;
    if (record !== undefined) record[by] = (record[by] ?? 0) + 1;
  };
  const pendingBank = new Map<number, number>();
  // `pulp_wars-4gc`: technologies per seat and the size of its tree here.
  const techCount = new Map<number, number>();
  for (const player of state.players) {
    const tree = factionTreeV7(player.faction);
    techCount.set(player.id, tree.startingTechIds.length);
    const economy = seats.get(player.id);
    if (economy !== undefined)
      economy.treeSize = tree.nodes.filter(
        (node) => state.setup.mapType !== "DRY_LAND" || node.branch !== "NAVAL",
      ).length;
  }
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
    if (isLich(unitId)) liches.units += 1;
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
          const snapshot = SNAPSHOT_ROUNDS.find((item) => item === round);
          if (snapshot !== undefined) {
            economy[`bankRound${snapshot}`] = bank;
            economy[`incomeRound${snapshot}`] = event.totalCoins;
            economy[`techsRound${snapshot}`] =
              techCount.get(event.playerId) ?? 0;
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
        if (event.kind === "TECH_RESEARCHED") {
          gainer.researchCoins += event.cost;
          const count = (techCount.get(event.playerId) ?? 0) + 1;
          techCount.set(event.playerId, count);
          if (count === gainer.treeSize && gainer.treeCompletionRound === null)
            gainer.treeCompletionRound = round;
        } else if (
          event.kind === "UNIT_TRAINED" ||
          event.kind === "NAVAL_UNIT_TRAINED" ||
          // Revision 19: an Egg is the Dinosaur seat's unit production.
          event.kind === "EGG_LAID"
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
        const battleship = unitRole.get(preview.attackerId) === "BATTLESHIP";
        for (const entry of preview.splash)
          if (entry.dies && isLich(entry.unitId)) {
            liches.diedToSplash += 1;
            liches.diedToBattleshipSplash += Number(battleship);
          }
        if (battleship && preview.defenderDies && isLich(preview.targetUnitId))
          liches.diedToBattleship += 1;
        if (preview.defenderDies)
          recordDeath(preview.targetUnitId, killer(preview.attackerId));
        if (preview.attackerDies)
          recordDeath(
            preview.attackerId,
            killer(preview.targetUnitId, ":RETALIATION"),
          );
        for (const entry of preview.splash)
          if (entry.dies)
            recordDeath(entry.unitId, killer(preview.attackerId, ":SPLASH"));
        if (
          preview.plagued.length > 0 &&
          !lichFirstPlague.has(preview.attackerId)
        ) {
          lichFirstPlague.set(preview.attackerId, round);
          liches.sources += 1;
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
      if (
        event.kind === "UNIT_DIED" &&
        (event.cause === "WAIL" || event.cause === "PLAGUE")
      )
        recordDeath(event.unitId, event.cause);
      if (
        event.kind === "UNIT_DIED" &&
        event.cause !== "ELIMINATION" &&
        isLich(event.unitId)
      ) {
        liches.died += 1;
        const plaguedAt = lichFirstPlague.get(event.unitId);
        if (plaguedAt !== undefined) {
          liches.sourcesKilled += 1;
          liches.sourceRoundsToKill += round - plaguedAt;
          liches.sourcesKilledWithinThree += Number(round - plaguedAt <= 3);
        }
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
  return { seats, knights, trench, lastCaptureRound, plague, liches };
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
  const entries =
    valueAfter("--from-detail") === undefined
      ? await runParallel(cells, jobs)
      : entriesFromDetail(valueAfter("--from-detail") ?? "");
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
          rulesetId: "pulp-wars-poc-7r24",
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

/** The per-match entries of earlier `--detail-output` files, by cell. */
function entriesFromDetail(files: string): {
  readonly results: Map<string, MatrixEntry>;
  readonly exceptions: { cell: MatrixCell; exception: string }[];
} {
  const results = new Map<string, MatrixEntry>();
  for (const file of files.split(",")) {
    const detail = JSON.parse(readFileSync(file, "utf8")) as {
      readonly entries: readonly MatrixEntry[];
    };
    for (const entry of detail.entries) results.set(cellKey(entry), entry);
  }
  return { results, exceptions: [] };
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

/** Tree-completion rounds: distribution, earliest, and completing share. */
function completion(rounds: readonly number[], seats: number) {
  return {
    ...stats(rounds),
    earliest: rounds.length === 0 ? null : Math.min(...rounds),
    completedShare:
      seats === 0 ? null : Math.round((1000 * rounds.length) / seats) / 1000,
  };
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
  // The pre-Goblin pairings with an Undead seat (`HU`, `UH`, `UU`).
  const undeadGames = duel.filter(
    (entry) =>
      NON_GOBLIN_ONE_VS_ONE.includes(entry.pairing) && entry.pairing !== "HH",
  );
  /** Seat means for one faction's seats, or every seat when `null`. */
  const seatMeans = (
    group: readonly MatrixEntry[],
    faction: FactionIdV7 | null,
  ) => {
    const seats = group.flatMap((entry) =>
      entry.seats.filter(
        (seat) => faction === null || seat.faction === faction,
      ),
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
      ...(Object.fromEntries(
        SNAPSHOT_ROUNDS.flatMap((round) =>
          (["bankRound", "incomeRound", "techsRound"] as const).map((key) => [
            `${key}${round}`,
            numeric(`${key}${round}`),
          ]),
        ),
      ) as Record<keyof SeatSnapshots, number | null>),
      // `pulp_wars-4gc`: whole-tree completion over the seats that did it.
      treeCompletion: completion(
        present(seats.map((seat) => seat.treeCompletionRound)),
        seats.length,
      ),
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
  const lichTotals = (group: readonly MatrixEntry[]) => {
    const totals = emptyLiches();
    for (const entry of group)
      for (const key of Object.keys(totals) as (keyof LichStats)[]) {
        const value = entry.liches[key];
        const total = totals[key];
        if (typeof value === "number" && typeof total === "number")
          (totals[key] as number) = total + value;
        else if (typeof value === "object" && typeof total === "object")
          for (const [name, count] of Object.entries(value))
            total[name] = (total[name] ?? 0) + count;
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
    goblin: goblinSummary(entries),
    dinosaur: dinosaurSummary(entries),
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
        // `pulp_wars-4gc`: every 1v1 seat of every pre-Goblin pairing.
        all: seatMeans(
          duel.filter((entry) => NON_GOBLIN_ONE_VS_ONE.includes(entry.pairing)),
          null,
        ),
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
      liches: {
        mixed: lichTotals(mixed),
        undeadMirror: lichTotals(byPairing.UU ?? []),
      },
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

const goblinWon = (entry: MatrixEntry) => entry.winnerFaction === "GOBLIN";

/** Goblin seats of a group with their matches (for per-seat economy). */
function goblinSeatsOf(group: readonly MatrixEntry[]) {
  return group.flatMap((entry) =>
    (entry.goblin?.seats ?? []).map((seatStats) => ({
      entry,
      seatStats,
      economy: entry.seats.find((seat) => seat.seat === seatStats.seat),
    })),
  );
}

const share = (part: number, whole: number) =>
  whole === 0 ? null : Math.round((1000 * part) / whole) / 1000;

/**
 * Section 14.2 Goblin telemetry summed over every Goblin seat of `group`,
 * with the section 14.3 ratios.
 */
function goblinAggregate(group: readonly MatrixEntry[]) {
  const seats = goblinSeatsOf(group);
  const games = group.filter((entry) => entry.goblin !== null);
  const total = (key: keyof GoblinSeatStats) =>
    sum(
      seats.map(({ seatStats }) => {
        const value = seatStats[key];
        return typeof value === "number" ? value : 0;
      }),
    );
  const roles = (
    pick: (seat: GoblinSeatStats) => Partial<Record<string, number>>,
  ) => {
    const totals: Record<string, number> = {};
    for (const { seatStats } of seats)
      for (const [key, value] of Object.entries(pick(seatStats) ?? {}))
        totals[key] = (totals[key] ?? 0) + (value ?? 0);
    return totals;
  };
  const friendlyBlastKills = total("blastOwnKills") + total("blastAlliedKills");
  const blastKills = friendlyBlastKills + total("blastHostileKills");
  const bombKills = total("bombFriendlyKills") + total("bombHostileKills");
  const kaboomSeats = seats.filter(
    ({ seatStats }) => seatStats.kabooms > 0,
  ).length;
  const income = sum(seats.map(({ economy }) => economy?.income ?? 0));
  const waves: number[] = [];
  for (const { seatStats } of seats)
    seatStats.explosionsByWave.forEach((count, index) => {
      waves[index] = (waves[index] ?? 0) + count;
    });
  const chainSizes = [0, 0, 0, 0, 0];
  for (const entry of games)
    entry.goblin?.chainSizes.forEach((count, index) => {
      chainSizes[index] = (chainSizes[index] ?? 0) + count;
    });
  const trained: Record<string, number> = {};
  let overcapacityStates = 0;
  let gamesWithOvercapacity = 0;
  for (const entry of group) {
    const goblins = entry.byFaction.GOBLIN;
    if (goblins === undefined) continue;
    for (const [role, count] of Object.entries(goblins.trained))
      trained[role] = (trained[role] ?? 0) + (count ?? 0);
    overcapacityStates += goblins.overcapacityStates;
    gamesWithOvercapacity += Number(goblins.overcapacityStates > 0);
  }
  const perSeat = (value: number) =>
    seats.length === 0 ? null : Math.round((100 * value) / seats.length) / 100;
  return {
    games: games.length,
    seatGames: seats.length,
    kabooms: total("kabooms"),
    kaboomsPerSeatGame: perSeat(total("kabooms")),
    seatGamesWithKaboom: kaboomSeats,
    seatGamesWithKaboomShare: share(kaboomSeats, seats.length),
    kaboomsByRole: roles((seat) => seat.kaboomsByRole),
    kaboomsNetPositive: total("kaboomsNetPositive"),
    kaboomChain: {
      hostileDamage: total("kaboomChainHostileDamage"),
      hostileKills: total("kaboomChainHostileKills"),
      friendlyDamage: total("kaboomChainFriendlyDamage"),
      friendlyKills: total("kaboomChainFriendlyKills"),
      netDamage:
        total("kaboomChainHostileDamage") - total("kaboomChainFriendlyDamage"),
    },
    deathBlasts: total("deathBlasts"),
    deathBlastsByRole: roles((seat) => seat.deathBlastsByRole),
    deathBlast: {
      hostileDamage: total("deathBlastHostileDamage"),
      hostileKills: total("deathBlastHostileKills"),
      friendlyDamage: total("deathBlastFriendlyDamage"),
      friendlyKills: total("deathBlastFriendlyKills"),
    },
    explosionsByWave: waves,
    blast: {
      hostileDamage: total("blastHostileDamage"),
      hostileKills: total("blastHostileKills"),
      ownDamage: total("blastOwnDamage"),
      ownKills: total("blastOwnKills"),
      alliedDamage: total("blastAlliedDamage"),
      alliedKills: total("blastAlliedKills"),
      friendlyDeathShare: share(friendlyBlastKills, blastKills),
    },
    bomb: {
      hostileDamage: total("bombHostileDamage"),
      hostileKills: total("bombHostileKills"),
      friendlyDamage: total("bombFriendlyDamage"),
      friendlyKills: total("bombFriendlyKills"),
      friendlyDeathShare: share(total("bombFriendlyKills"), bombKills),
    },
    chains: {
      count: sum(games.map((entry) => entry.goblin?.chains ?? 0)),
      sizes: chainSizes,
      longest: Math.max(
        0,
        ...games.map((entry) => entry.goblin?.longestChain ?? 0),
      ),
      deepestWave: Math.max(
        0,
        ...games.map((entry) => entry.goblin?.deepestWave ?? 0),
      ),
      gamesWithChainOfThreePlus: games.filter(
        (entry) => (entry.goblin?.longestChain ?? 0) >= 3,
      ).length,
    },
    plunderCoins: total("plunderCoins"),
    plunderPerSeatGame: perSeat(total("plunderCoins")),
    plunderShareOfIncome: share(total("plunderCoins"), income),
    gangUp: [0, 1, 2].map((bonus) =>
      sum(seats.map(({ seatStats }) => seatStats.gangUp[bonus] ?? 0)),
    ),
    gangUpKills: total("gangUpKills"),
    waaaghs: total("waaaghs"),
    waaaghUnits: total("waaaghUnits"),
    seatGamesWithWaaagh: seats.filter(({ seatStats }) => seatStats.waaaghs > 0)
      .length,
    trolls: total("trolls"),
    seatGamesWithTroll: seats.filter(({ seatStats }) => seatStats.trolls > 0)
      .length,
    trollRegeneration: total("trollRegeneration"),
    turns: total("turns"),
    capTurns: total("capTurns"),
    maxUnits: stats(seats.map(({ seatStats }) => seatStats.maxUnits)),
    trained,
    /** Goblin-faction over-capacity snapshots, and games with any. */
    overcapacityStates,
    gamesWithOvercapacity,
    killsByRole: roles((seat) => seat.killsByRole),
    damageByRole: roles((seat) => seat.damageByRole),
    lossesByRole: roles((seat) => seat.lossesByRole),
    lossesByCause: roles((seat) => seat.lossesByCause),
    friendlyBlastKillsByRole: roles((seat) => seat.friendlyBlastKillsByRole),
    friendlyKillingBlastsByRole: roles(
      (seat) => seat.friendlyKillingBlastsByRole,
    ),
  };
}

function capRateOf(group: readonly MatrixEntry[]): number | null {
  return share(
    group.filter((entry) => entry.termination !== "OUTCOME").length,
    group.length,
  );
}

/** Section 14.3 Goblin acceptance measures and section 14.2 telemetry. */
function goblinSummary(entries: readonly MatrixEntry[]) {
  // The revision-17 pairings only: Goblin seats of the Dinosaur pairings
  // (`DG`, `GD`) are reported under `summary.dinosaur`.
  const duel = entries.filter(
    (entry) =>
      entry.aiCount === 1 &&
      (GOBLIN_ONE_VS_ONE.includes(entry.pairing) ||
        NON_GOBLIN_ONE_VS_ONE.includes(entry.pairing)),
  );
  const versus = (opponent: FactionIdV7) =>
    duel.filter(
      (entry) =>
        entry.factions.includes("GOBLIN") && entry.factions.includes(opponent),
    );
  const byKey = (
    group: readonly MatrixEntry[],
    key: (entry: MatrixEntry) => string,
  ) =>
    Object.fromEntries(
      Object.entries(groupBy(group, key)).map(([name, items]) => [
        name,
        rateFor(items, goblinWon),
      ]),
    );
  const nonGoblin = duel.filter((entry) =>
    NON_GOBLIN_ONE_VS_ONE.includes(entry.pairing),
  );
  const goblinPairings = GOBLIN_ONE_VS_ONE;
  const pairingCaps: Record<string, number | null> = Object.fromEntries(
    goblinPairings.flatMap((pairing) => {
      const group = duel.filter((entry) => entry.pairing === pairing);
      return group.length === 0 ? [] : [[pairing, capRateOf(group)]];
    }),
  );
  const reference = capRateOf(nonGoblin);
  const excesses = Object.values(pairingCaps).map(
    (rate) => (rate ?? 0) - (reference ?? 0),
  );
  const multi = entries.filter(
    (entry) => entry.aiCount === 3 && GOBLIN_MULTI.includes(entry.pairing),
  );
  return {
    versusHuman: rateFor(versus("ORIGINAL"), goblinWon),
    versusUndead: rateFor(versus("UNDEAD"), goblinWon),
    versusHumanBySeat: byKey(versus("ORIGINAL"), (entry) => entry.pairing),
    versusUndeadBySeat: byKey(versus("UNDEAD"), (entry) => entry.pairing),
    versusHumanBySize: byKey(versus("ORIGINAL"), (entry) => String(entry.size)),
    versusUndeadBySize: byKey(versus("UNDEAD"), (entry) => String(entry.size)),
    versusHumanByMapSize: byKey(
      versus("ORIGINAL"),
      (entry) => `${entry.mapType}/${entry.size}`,
    ),
    versusUndeadByMapSize: byKey(
      versus("UNDEAD"),
      (entry) => `${entry.mapType}/${entry.size}`,
    ),
    mirrorSeatZeroWin: rateFor(
      duel.filter((entry) => entry.pairing === "GG"),
      seatZeroWon,
    ),
    capRates: {
      nonGoblinReference: reference,
      byPairing: pairingCaps,
      /** Percentage points above the reference (worst Goblin pairing). */
      worstExcessPoints:
        reference === null || excesses.length === 0
          ? null
          : Math.round(1000 * Math.max(...excesses)) / 10,
    },
    telemetry: {
      ...Object.fromEntries(
        goblinPairings.flatMap((pairing) => {
          const group = duel.filter((entry) => entry.pairing === pairing);
          return group.length === 0 ? [] : [[pairing, goblinAggregate(group)]];
        }),
      ),
      mixedVersusHuman: goblinAggregate(versus("ORIGINAL")),
      mixedVersusUndead: goblinAggregate(versus("UNDEAD")),
      allOneVsOne: goblinAggregate(duel),
      multi: goblinAggregate(multi),
    },
    multi: Object.fromEntries(
      Object.entries(groupBy(multi, (entry) => entry.pairing)).map(
        ([pairing, group]) => [
          pairing,
          {
            games: group.length,
            capRate: capRateOf(group),
            winnerFaction: groupCount(
              group,
              (entry) => entry.winnerFaction ?? entry.termination,
            ),
            aliveSeatsByFaction: groupCount(
              group.flatMap((entry) =>
                entry.seats.filter((seat) => seat.alive),
              ),
              (seat) => seat.faction,
            ),
            citiesByFaction: Object.fromEntries(
              FACTION_IDS_V7.map((faction) => [
                faction,
                sum(
                  group.flatMap((entry) =>
                    entry.seats
                      .filter((seat) => seat.faction === faction)
                      .map((seat) => seat.cities),
                  ),
                ),
              ]),
            ),
          },
        ],
      ),
    ),
  };
}

const dinosaurWon = (entry: MatrixEntry) => entry.winnerFaction === "DINOSAUR";

/** Dinosaur seats of a group with their matches (for per-seat economy). */
function dinosaurSeatsOf(group: readonly MatrixEntry[]) {
  return group.flatMap((entry) =>
    (entry.dinosaur?.seats ?? []).map((seatStats) => ({
      entry,
      seatStats,
      economy: entry.seats.find((seat) => seat.seat === seatStats.seat),
    })),
  );
}

const totalOf = (record: Partial<Record<string, number>>) =>
  sum(Object.values(record).map((value) => value ?? 0));

/**
 * Section 15.2 Dinosaur telemetry summed over every Dinosaur seat of
 * `group`, with the section 15.3 ratios.
 */
function dinosaurAggregate(group: readonly MatrixEntry[]) {
  const seats = dinosaurSeatsOf(group);
  const total = (key: keyof DinosaurSeatStats) =>
    sum(
      seats.map(({ seatStats }) => {
        const value = seatStats[key];
        return typeof value === "number" ? value : 0;
      }),
    );
  const roles = (
    pick: (seat: DinosaurSeatStats) => Partial<Record<string, number>>,
  ) => {
    const totals: Record<string, number> = {};
    for (const { seatStats } of seats)
      for (const [key, value] of Object.entries(pick(seatStats)))
        totals[key] = (totals[key] ?? 0) + (value ?? 0);
    return totals;
  };
  const count = (
    test: (seat: DinosaurSeatStats, entry: MatrixEntry) => boolean,
  ) => seats.filter(({ seatStats, entry }) => test(seatStats, entry)).length;
  const perSeat = (value: number) =>
    seats.length === 0 ? null : Math.round((100 * value) / seats.length) / 100;
  const researched = (tech: string) => (seat: DinosaurSeatStats) =>
    seat.researchRound[tech] !== undefined;
  const sawmilling = researched("SAWMILLING");
  const chivalry = researched("CHIVALRY");
  const laid = (role: UnitRoleIdV7) => (seat: DinosaurSeatStats) =>
    (seat.eggsLaid[role] ?? 0) > 0;
  const hatched = (role: UnitRoleIdV7) => (seat: DinosaurSeatStats) =>
    (seat.eggsHatchedByTime[role] ?? 0) +
      (seat.eggsHatchedByShaman[role] ?? 0) >
    0;
  const eggsLaid = roles((seat) => seat.eggsLaid);
  const eggsDestroyed = roles((seat) => seat.eggsDestroyed);
  const hatchedByTime = roles((seat) => seat.eggsHatchedByTime);
  const hatchedByShaman = roles((seat) => seat.eggsHatchedByShaman);
  const big = roles((seat) => seat.big);
  const alpha = roles((seat) => seat.alpha);
  const grownLost = roles((seat) => seat.grownLost);
  const hatchDelays = [0, 1, 2, 3, 4].map((index) =>
    sum(seats.map(({ seatStats }) => seatStats.hatchDelays[index] ?? 0)),
  );
  const sawmillingSeats = count(sawmilling);
  const sawmillingChargeSeats = count(
    (seat) => sawmilling(seat) && seat.charges > 0,
  );
  const hatchedTriceratopsSeats = count(hatched("CATAPULT"));
  const runUpChargeSeats = count(
    (seat) =>
      hatched("CATAPULT")(seat) &&
      (seat.chargesByRunUp[1] ?? 0) + (seat.chargesByRunUp[2] ?? 0) > 0,
  );
  const longSeats = count((_, entry) => entry.rounds >= 35);
  const research = (tech: string) => ({
    seatGames: count(researched(tech)),
    round: stats(
      seats.flatMap(({ seatStats }) => {
        const value = seatStats.researchRound[tech];
        return value === undefined ? [] : [value];
      }),
    ),
  });
  const firstEgg = (role: UnitRoleIdV7) =>
    stats(
      seats.flatMap(({ seatStats }) => {
        const value = seatStats.firstEggRound[role];
        return value === undefined ? [] : [value];
      }),
    );
  const techs: Record<string, number> = {};
  for (const { seatStats } of seats)
    for (const tech of Object.keys(seatStats.researchRound))
      techs[tech] = (techs[tech] ?? 0) + 1;
  return {
    games: group.filter((entry) => entry.dinosaur !== null).length,
    seatGames: seats.length,
    turns: total("turns"),
    capTurns: total("capTurns"),
    maxUnits: stats(seats.map(({ seatStats }) => seatStats.maxUnits)),
    meanUnitsAtEndTurn: share(total("unitTurns"), total("turns")),
    trained: roles((seat) => seat.trained),
    eggs: {
      laid: eggsLaid,
      laidPerSeatGame: perSeat(totalOf(eggsLaid)),
      hatchedByTime,
      hatchedByShaman,
      destroyed: eggsDestroyed,
      destroyedByCause: roles((seat) => seat.eggsDestroyedByCause),
      destroyedByAttacker: roles((seat) => seat.eggsDestroyedByAttacker),
      lostWithCity: roles((seat) => seat.eggsLostWithCity),
      eliminated: roles((seat) => seat.eggsEliminated),
      abandoned: roles((seat) => seat.eggsAbandoned),
      /** Section 15.3: the share of all laid Eggs enemies destroyed. */
      destroyedShare: share(totalOf(eggsDestroyed), totalOf(eggsLaid)),
      /** Section 15.3: seat-games with at least one Egg destroyed. */
      seatGamesWithDestroyed: count((seat) => totalOf(seat.eggsDestroyed) > 0),
      seatGamesWithDestroyedShare: share(
        count((seat) => totalOf(seat.eggsDestroyed) > 0),
        seats.length,
      ),
      seatGamesWithEgg: count((seat) => totalOf(seat.eggsLaid) > 0),
      coins: total("eggCoins"),
      coinsDestroyed: total("eggCoinsDestroyed"),
      eggTurns: total("eggTurns"),
      /** Hatched Eggs by rounds from laying to hatching: 0, 1, 2, 3, 4+. */
      hatchDelays,
      firstEggRound: {
        RAIDER: firstEgg("RAIDER"),
        MARKSMAN: firstEgg("MARKSMAN"),
        GUARD: firstEgg("GUARD"),
        CATAPULT: firstEgg("CATAPULT"),
        KNIGHT: firstEgg("KNIGHT"),
      },
    },
    growth: {
      big,
      alpha,
      bigPerSeatGame: perSeat(totalOf(big)),
      alphaPerSeatGame: perSeat(totalOf(alpha)),
      /** Section 15.3: seat-games in which a unit reached Big. */
      seatGamesWithBig: count((seat) => totalOf(seat.big) > 0),
      seatGamesWithBigShare: share(
        count((seat) => totalOf(seat.big) > 0),
        seats.length,
      ),
      seatGamesWithAlpha: count((seat) => totalOf(seat.alpha) > 0),
      grownLost,
      alphaLost: roles((seat) => seat.alphaLost),
      /** Grown units killed, as a share of the units that reached Big. */
      grownLostShare: share(totalOf(grownLost), totalOf(big)),
    },
    /** Revision 20 Charge! (the former Stampede block). */
    charge: {
      charges: total("charges"),
      perSeatGame: perSeat(total("charges")),
      /** Charges after 0, 1, and 2 tiles moved. */
      byRunUp: [0, 1, 2].map((index) =>
        sum(seats.map(({ seatStats }) => seatStats.chargesByRunUp[index] ?? 0)),
      ),
      kills: total("chargeKills"),
      eggKills: total("chargeEggKills"),
      pushes: total("chargePushes"),
      blockedPushes: total("chargeBlockedPushes"),
      follows: total("chargeFollows"),
      damage: total("chargeDamage"),
      fieldDefenseDestroyed: total("chargeFieldDefense"),
      fortifiedTargets: total("chargeFortifiedTargets"),
      fortificationLevelsIgnored: total("chargeFortificationIgnored"),
      centerTargets: total("chargeCenterTargets"),
      centerPushes: total("chargeCenterPushes"),
      triceratopsLostAfterCharge: total("triceratopsLostAfterCharge"),
      wallbreakerAttacks: total("wallbreakerAttacks"),
      seatGamesWithCharge: count((seat) => seat.charges > 0),
      /** Charge among the seat-games with Sawmilling. */
      seatGamesWithSawmilling: sawmillingSeats,
      seatGamesWithSawmillingAndCharge: sawmillingChargeSeats,
      chargeShareOfSawmillingSeatGames: share(
        sawmillingChargeSeats,
        sawmillingSeats,
      ),
      /** The funnel from Sawmilling to a Charge. */
      sawmillingSeatGamesWithTriceratopsEgg: count(
        (seat) => sawmilling(seat) && laid("CATAPULT")(seat),
      ),
      sawmillingSeatGamesWithTriceratops: count(
        (seat) => sawmilling(seat) && hatched("CATAPULT")(seat),
      ),
      /**
       * Revision 20 section 8.2 usefulness: seat-games with a hatched
       * Triceratops, and those in which one attacked with a run-up.
       */
      seatGamesWithTriceratops: hatchedTriceratopsSeats,
      seatGamesWithRunUpCharge: runUpChargeSeats,
      runUpChargeShareOfTriceratopsSeatGames: share(
        runUpChargeSeats,
        hatchedTriceratopsSeats,
      ),
      turnsWithTriceratops: total("turnsWithTriceratops"),
      triceratopsTurns: total("triceratopsTurns"),
    },
    tRex: {
      seatGamesWithChivalry: count(chivalry),
      seatGamesWithEgg: count(laid("KNIGHT")),
      seatGamesWithTRex: count(hatched("KNIGHT")),
      /** Seat-games of matches that lasted 35 or more rounds. */
      longSeatGames: longSeats,
      longSeatGamesWithChivalry: count(
        (seat, entry) => entry.rounds >= 35 && chivalry(seat),
      ),
      longSeatGamesWithEgg: count(
        (seat, entry) => entry.rounds >= 35 && laid("KNIGHT")(seat),
      ),
      longSeatGamesWithEggShare: share(
        count((seat, entry) => entry.rounds >= 35 && laid("KNIGHT")(seat)),
        longSeats,
      ),
    },
    research: {
      SAWMILLING: research("SAWMILLING"),
      CHIVALRY: research("CHIVALRY"),
      FORTIFICATION: research("FORTIFICATION"),
      ADMINISTRATION: research("ADMINISTRATION"),
      seatGamesByTech: techs,
    },
    abilities: {
      acidAttacks: total("acidAttacks"),
      acidIgnored: total("acidIgnored"),
      armouredPrevented: total("armouredPrevented"),
      hatches: total("hatches"),
      seatGamesWithHatch: count((seat) => seat.hatches > 0),
      warDrums: total("warDrums"),
      warDrumsUnits: total("warDrumsUnits"),
      tends: total("tends"),
    },
    slots: {
      cityTurns: total("cityTurns"),
      meanUsed: share(total("slotsUsed"), total("cityTurns")),
      meanCapacity: share(total("slotsCapacity"), total("cityTurns")),
      usedShare: share(total("slotsUsed"), total("slotsCapacity")),
      maxUsed: Math.max(
        0,
        ...seats.map(({ seatStats }) => seatStats.maxSlotsUsed),
      ),
      overCapacityCityTurns: total("overCapacityCityTurns"),
      fullCityTurns: total("fullCityTurns"),
      noTwoSlotCityTurns: total("noTwoSlotCityTurns"),
      noNestCityTurns: total("noNestCityTurns"),
      bigBodyTurns: roles((seat) => seat.bigBodyTurns),
    },
    killsByRole: roles((seat) => seat.killsByRole),
    lossesByRole: roles((seat) => seat.lossesByRole),
    lossesByCause: roles((seat) => seat.lossesByCause),
    economy: {
      income: perSeat(sum(seats.map(({ economy }) => economy?.income ?? 0))),
      trainingCoins: perSeat(
        sum(seats.map(({ economy }) => economy?.trainingCoins ?? 0)),
      ),
      researchCoins: perSeat(
        sum(seats.map(({ economy }) => economy?.researchCoins ?? 0)),
      ),
      techs: perSeat(sum(seats.map(({ economy }) => economy?.techs ?? 0))),
      finalCoins: perSeat(
        sum(seats.map(({ economy }) => economy?.finalCoins ?? 0)),
      ),
    },
  };
}

/** Section 15.3 Dinosaur acceptance measures and section 15.2 telemetry. */
function dinosaurSummary(entries: readonly MatrixEntry[]) {
  const duel = entries.filter((entry) => entry.aiCount === 1);
  const dinosaurDuel = duel.filter((entry) =>
    DINOSAUR_ONE_VS_ONE.includes(entry.pairing),
  );
  const versus = (opponent: FactionIdV7) =>
    dinosaurDuel.filter(
      (entry) => entry.pairing !== "DD" && entry.factions.includes(opponent),
    );
  const byKey = (
    group: readonly MatrixEntry[],
    key: (entry: MatrixEntry) => string,
  ) =>
    Object.fromEntries(
      Object.entries(groupBy(group, key)).map(([name, items]) => [
        name,
        rateFor(items, dinosaurWon),
      ]),
    );
  const against = (opponent: FactionIdV7) => {
    const group = versus(opponent);
    return {
      win: rateFor(group, dinosaurWon),
      bySeat: byKey(group, (entry) => entry.pairing),
      bySize: byKey(group, (entry) => String(entry.size)),
      byMap: byKey(group, (entry) => entry.mapType),
      byMapSize: byKey(group, (entry) => `${entry.mapType}/${entry.size}`),
    };
  };
  // The reference: every 1v1 pairing of the same run without a Dinosaur seat.
  const reference = capRateOf(
    duel.filter((entry) => !DINOSAUR_ONE_VS_ONE.includes(entry.pairing)),
  );
  const pairingCaps: Record<string, number | null> = Object.fromEntries(
    DINOSAUR_ONE_VS_ONE.flatMap((pairing) => {
      const group = duel.filter((entry) => entry.pairing === pairing);
      return group.length === 0 ? [] : [[pairing, capRateOf(group)]];
    }),
  );
  const excesses = Object.values(pairingCaps).map(
    (rate) => (rate ?? 0) - (reference ?? 0),
  );
  const multi = entries.filter(
    (entry) => entry.aiCount === 3 && DINOSAUR_MULTI.includes(entry.pairing),
  );
  return {
    versusHuman: against("ORIGINAL"),
    versusUndead: against("UNDEAD"),
    versusGoblin: against("GOBLIN"),
    mirrorSeatZeroWin: rateFor(
      duel.filter((entry) => entry.pairing === "DD"),
      seatZeroWon,
    ),
    capRates: {
      nonDinosaurReference: reference,
      byPairing: pairingCaps,
      /** Percentage points above the reference (worst Dinosaur pairing). */
      worstExcessPoints:
        reference === null || excesses.length === 0
          ? null
          : Math.round(1000 * Math.max(...excesses)) / 10,
    },
    telemetry: {
      ...Object.fromEntries(
        DINOSAUR_ONE_VS_ONE.flatMap((pairing) => {
          const group = duel.filter((entry) => entry.pairing === pairing);
          return group.length === 0
            ? []
            : [[pairing, dinosaurAggregate(group)]];
        }),
      ),
      mixedVersusHuman: dinosaurAggregate(versus("ORIGINAL")),
      mixedVersusUndead: dinosaurAggregate(versus("UNDEAD")),
      mixedVersusGoblin: dinosaurAggregate(versus("GOBLIN")),
      allOneVsOne: dinosaurAggregate(dinosaurDuel),
      multi: dinosaurAggregate(multi),
    },
    multi: Object.fromEntries(
      Object.entries(groupBy(multi, (entry) => entry.pairing)).map(
        ([pairing, group]) => [
          pairing,
          {
            games: group.length,
            capRate: capRateOf(group),
            winnerFaction: groupCount(
              group,
              (entry) => entry.winnerFaction ?? entry.termination,
            ),
            aliveSeatsByFaction: groupCount(
              group.flatMap((entry) =>
                entry.seats.filter((seat) => seat.alive),
              ),
              (seat) => seat.faction,
            ),
            citiesByFaction: Object.fromEntries(
              FACTION_IDS_V7.map((faction) => [
                faction,
                sum(
                  group.flatMap((entry) =>
                    entry.seats
                      .filter((seat) => seat.faction === faction)
                      .map((seat) => seat.cities),
                  ),
                ),
              ]),
            ),
          },
        ],
      ),
    ),
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
    ...goblinMarkdown(summary.goblin, pct),
    ...dinosaurMarkdown(summary.dinosaur, pct),
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

/** Section 14.3 Goblin acceptance lines (empty without Goblin games). */
function goblinMarkdown(
  goblin: ReturnType<typeof goblinSummary>,
  pct: (rate: Rate) => string,
): string[] {
  const all = goblin.telemetry.allOneVsOne;
  if (all.seatGames === 0) return [];
  const caps = goblin.capRates;
  return [
    `Goblin win vs Human (GH+HG): ${pct(goblin.versusHuman)}`,
    `Goblin win vs Undead (GU+UG): ${pct(goblin.versusUndead)}`,
    `Cap rates: non-Goblin reference ${caps.nonGoblinReference}; ${Object.entries(
      caps.byPairing,
    )
      .map(([pairing, rate]) => `${pairing} ${rate}`)
      .join(", ")}; worst excess ${caps.worstExcessPoints} points`,
    `Kaboom (1v1): ${all.kabooms} in ${all.seatGamesWithKaboom}/${all.seatGames} seat-games; chain damage hostile ${all.kaboomChain.hostileDamage} vs friendly ${all.kaboomChain.friendlyDamage}`,
    `Goblin explosion deaths (1v1): hostile ${all.blast.hostileKills}, own ${all.blast.ownKills}, allied ${all.blast.alliedKills}; friendly share ${all.blast.friendlyDeathShare}; bomb friendly share ${all.bomb.friendlyDeathShare}`,
    `Chains (1v1): ${all.chains.count}, sizes 1/2/3/4/5+ ${all.chains.sizes.join("/")}, longest ${all.chains.longest}; Plunder ${all.plunderCoins} (${all.plunderShareOfIncome} of income); Gang Up 0/1/2 ${all.gangUp.join("/")}; WAAAGH! ${all.waaaghs}; Trolls ${all.trolls}`,
    "",
  ];
}

/** Section 15.3 Dinosaur acceptance lines (empty without Dinosaur games). */
function dinosaurMarkdown(
  dinosaur: ReturnType<typeof dinosaurSummary>,
  pct: (rate: Rate) => string,
): string[] {
  const all = dinosaur.telemetry.allOneVsOne;
  if (all.seatGames === 0) return [];
  const caps = dinosaur.capRates;
  const flat = (record: Record<string, number>) =>
    Object.entries(record)
      .map(([key, value]) => `${key} ${value}`)
      .join(", ");
  return [
    `Dinosaur win vs Human (DH+HD): ${pct(dinosaur.versusHuman.win)}`,
    `Dinosaur win vs Undead (DU+UD): ${pct(dinosaur.versusUndead.win)}`,
    `Dinosaur win vs Goblin (DG+GD): ${pct(dinosaur.versusGoblin.win)}`,
    `Dinosaur mirror seat 0: ${pct(dinosaur.mirrorSeatZeroWin)}`,
    `Cap rates: non-Dinosaur reference ${caps.nonDinosaurReference}; ${Object.entries(
      caps.byPairing,
    )
      .map(([pairing, rate]) => `${pairing} ${rate}`)
      .join(", ")}; worst excess ${caps.worstExcessPoints} points`,
    `Charge (1v1): ${all.charge.charges} (run-up 0/1/2 ${all.charge.byRunUp.join("/")}; kills ${all.charge.kills}, pushes ${all.charge.pushes}, follows ${all.charge.follows}, blocked ${all.charge.blockedPushes}, Field Defense ${all.charge.fieldDefenseDestroyed}, fortification levels ignored ${all.charge.fortificationLevelsIgnored}) in ${all.charge.seatGamesWithSawmillingAndCharge}/${all.charge.seatGamesWithSawmilling} Sawmilling seat-games (${all.charge.chargeShareOfSawmillingSeatGames}); funnel egg ${all.charge.sawmillingSeatGamesWithTriceratopsEgg}, hatched ${all.charge.sawmillingSeatGamesWithTriceratops}; run-up charge in ${all.charge.seatGamesWithRunUpCharge}/${all.charge.seatGamesWithTriceratops} Triceratops seat-games (${all.charge.runUpChargeShareOfTriceratopsSeatGames}); Wallbreaker attacks ${all.charge.wallbreakerAttacks}`,
    `Eggs (1v1): laid ${flat(all.eggs.laid)} (${all.eggs.laidPerSeatGame} per seat-game); hatched by time ${totalOf(all.eggs.hatchedByTime)}, by Shaman ${totalOf(all.eggs.hatchedByShaman)}; destroyed ${totalOf(all.eggs.destroyed)} (${all.eggs.destroyedShare} of laid) in ${all.eggs.seatGamesWithDestroyed}/${all.seatGames} seat-games (${all.eggs.seatGamesWithDestroyedShare}); lost with city ${totalOf(all.eggs.lostWithCity)}, abandoned ${totalOf(all.eggs.abandoned)}`,
    `Growth (1v1): Big ${all.growth.bigPerSeatGame} and Alpha ${all.growth.alphaPerSeatGame} per seat-game; Big in ${all.growth.seatGamesWithBig}/${all.seatGames} seat-games (${all.growth.seatGamesWithBigShare}); grown lost ${all.growth.grownLostShare}`,
    `T-Rex (1v1): Chivalry ${all.tRex.seatGamesWithChivalry}, Egg ${all.tRex.seatGamesWithEgg} of ${all.seatGames} seat-games; in 35+ round games ${all.tRex.longSeatGamesWithEgg}/${all.tRex.longSeatGames} (${all.tRex.longSeatGamesWithEggShare})`,
    `Slots (1v1): used ${all.slots.meanUsed} of ${all.slots.meanCapacity} per city-turn; full ${all.slots.fullCityTurns}, under two free ${all.slots.noTwoSlotCityTurns}, no nest ${all.slots.noNestCityTurns} of ${all.slots.cityTurns}; cap turns ${all.capTurns}/${all.turns}`,
    "",
  ];
}

// Dispatch last so every module-level constant above is initialized.
if (isEntryPoint && args.includes("--worker")) await runWorker();
else if (isEntryPoint) await runMain();
