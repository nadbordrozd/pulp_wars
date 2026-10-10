/**
 * Text-mode play harness for Ruleset 7 (`pulp_wars-w49.1`,
 * docs/validation/TEXT_PLAY.md).
 *
 * One process invocation runs one command against a persistent session file
 * and prints compact text for an agent that plays a seat turn by turn against
 * the Normal AI. Everything shown before `debrief` is derived from the playing
 * seat's `PlayerViewV7`, the public queries over that view, and the events
 * `projectEventsV7` projects for that seat. The authoritative state is only
 * stored, advanced through `applyCommandV7`, and (for `debrief` and `verify`)
 * replayed.
 *
 * The AI seats play exactly as in the browser's normal match
 * (src/app/v7-controller.ts): the Normal policy decides on the AI seat's own
 * `PlayerViewV7`, `chooseNormalTurnCommandV7` applies the per-turn command
 * cap, and the chosen command must be one the public query offers.
 *
 * Usage: `npm run play:text -- help`.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../src/ai/index";
import { publicProjectedDamageForPolicyV7 } from "../src/ai/v7";
import {
  MONUMENT_POPULATION_V7,
  REWARD_UNIT_LEVEL_V7,
  WIGHT_RISE_AGAIN_HP_V7,
  isEggLaidRoleV7,
  technologyCapabilitiesV7,
} from "../src/engine/rules/ruleset-v7";
import { packHuntAttack2V7 } from "../src/engine/v7/combat";
import { validatePlayerMovementPathV7 } from "../src/engine/v7/movement";
import { factionBuildCommandV7 } from "../src/render/faction-buildings-v7";
import {
  absorbHitV7,
  forceFieldHoldsV7,
  shieldOfV7,
  unitShieldMaximumV7,
} from "../src/engine/v7/martian";
import {
  BARRICADE_COST_V7,
  BARRICADE_HP_V7,
  BASIC_ECONOMIC_ACTIONS_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  AI_HEAD_START_COINS_V7,
  MAP_GENERATION_REVISION_V7,
  PROMOTION_HP_V7,
  RULESET_7_ID,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  NEUTRAL_KIND_V7,
  TECHNOLOGY_IDS_V7,
  technologyDisplayNameV7,
  UNIT_ROLE_IDS_V7,
  allOwnedUnitsV7,
  allowedBoardSizesV7,
  applyCommandV7,
  arePlayersHostileV7,
  autoBoardSizeV7,
  canonicalHash,
  canonicalJson,
  cityLevelIncomeV7,
  LAND_TRADE_INCOME_COINS_V7,
  cityUnitCapacityForV7,
  createPlayableGameV7,
  aiHeadStartCoinsV7,
  duplicateFactionV7,
  effectiveRoleRuleV7,
  isNavalRoleV7,
  isNeutralOwnerV7,
  parseGameStateV7,
  playerIncomeV7,
  previewAssembleV7,
  previewAttackBarricadeV7,
  previewAttackExplosionsV7,
  previewBeamDownV7,
  previewBoardV7,
  previewBolasV7,
  previewBombRunV7,
  previewBuildBarricadeV7,
  previewColdSnapV7,
  previewFrostBoltV7,
  previewStampedeV7,
  previewDevourV7,
  previewEconomicV7,
  previewFreezeV7,
  previewHatchV7,
  previewKaboomV7,
  previewLayEggV7,
  previewMindControlV7,
  previewMonumentV7,
  previewRaiseDeadV7,
  previewRebakeV7,
  previewSugarRushV7,
  previewTopUpV7,
  previewSugarTossV7,
  previewTendWoundedV7,
  previewTractorBeamV7,
  previewTunnelV7,
  previewWailV7,
  previewWhirlV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryIdleRecoveryV7,
  queryLandGrantPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  queryThreatenedTilesV7,
  TECHNOLOGY_RESEARCH_COST_V7,
  roleMechanicsV7,
  seatCountAllowedV7,
  unitCapacitySlotsV7,
  unitMayActAfterMoveV7,
  unitRoleMechanicsV7,
  BEAM_DOWN_PICKUP_RANGE_V7,
  FORCE_FIELD_SHIELD_V7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitRoleRuleV7,
  viewForV7,
  queryScoreV7,
  queryStarGradeV7,
  scoresV7,
  type PlayerScoreV7,
  type ScoreBreakdownV7,
  type BoardSizeV7,
  type CityId,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type EffectiveRoleRuleV7,
  type RoleMechanicsV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlayerEventV7,
  type PlayerId,
  type PlayerTileViewV7,
  type PlayerViewV7,
  type PublicCityV7,
  type PublicTechnologyNodeV7,
  type PublicUnitV7,
  type TechnologyUnlockV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  previewBlastMountainV7,
  publicHireCostV7,
  cityBarracksV7,
  cityEconomicMiracleIncomeV7,
  ECONOMIC_MIRACLE_COINS_V7,
  BLAST_MOUNTAIN_COST_V7,
  CITY_REWARD_COINS_V7,
  PILLAGE_COINS_V7,
  FIELD_DEFENSE_FORTIFICATION_LEVELS_V7,
  MILITIA_FIGHTERS_V7,
  SURVEY_RAIDERS_V7,
  ACHIEVEMENT_REQUIRED_TECH_V7,
  CITY_LEVEL_INCOME_CAP_V7,
  LAND_GRANT_COST_PER_TILE_V7,
  LAND_GRANT_MINIMUM_COST_V7,
  publicLandGrantPriceV7,
  unitIgnoresZocStopsV7,
  isRallyTargetV7,
  BERSERK_MOVE_BONUS_V7,
  barricadesOfV7,
  missionByIdV7,
  missionMatchSetupV7,
} from "../src/engine/index";
import {
  DIGEST_DAMAGE_V7,
  arePlayersAlliedV7,
  crushBehindTileV7,
  tileOccupiedV7,
  unitId,
  type UnitStateV7,
  previewBreakOffV7,
  previewStompV7,
  previewSwallowV7,
  previewTossV7,
  previewTrampleV7,
  unitIsMountainBornV7,
  unitMovementModeV7,
  withFullShieldsV7,
} from "../src/engine/index";
import { FOUNTAIN_HEAL_V7 } from "../src/engine/v7/curiosities";
import {
  BLAST_MOUNTAIN_UNLOCK_TEXT_V7,
  BREACH_UNLOCK_TEXT_V7,
  FIELD_DEFENSE_UNLOCK_TEXT_V7,
  advanceCombatNotesV7,
  landTradeStatusTextV7,
  landTradeStatusV7,
  landTradeUnlockTextV7,
  BLAST_MOUNTAIN_DAMAGE_NOTE_V7,
  FOREST_COVER_UNLOCK_TEXT_V7,
  hireUnlockTextV7,
  BLAST_ORE_WARNING_V7,
  FOREST_MARCH_UNLOCK_TEXT_V7,
  BARRACKS_REWARD_TEXT_V7,
  scoutsRewardTextV7,
  pillageUnlockTextV7,
  RAIDER_SLIPS_TEXT_V7,
  CHARGE_CONDITION_TEXT_V7,
  BLAST_MOUNTAIN_SETTER_NOTE_V7,
  rangedDefenseTextV7,
  rangedDefenseWordV7,
  carrionTextV7,
  PLAGUE_NEEDS_TEXT_V7,
  strikesBackTextV7,
  NO_MOVE_AND_ATTACK_TEXT_V7,
  OVERRUN_BUDGET_TEXT_V7,
} from "../src/render/technology-unlock-text-v7";
import { MARKET_PLACEMENT_TEXT_V7 } from "../src/render/economy-presentation-v7";
import { cityNameByIdV7 } from "../src/render/city-names-presentation-v7";
import { WIGHT_GRAVE_LABEL_V7 } from "../src/render/ninth-unit-presentation-v7";
import {
  CHARGE_DESCRIPTION_V7,
  DINOSAUR_HIRE_NOTE_V7,
  HATCH_TOOLTIP_V7,
  WALLBREAKER_UNLOCK_TEXT_V7,
  dinosaurAbilityDescriptionV7,
  nestingUnlockTextV7,
  packHuntPreviewLineV7,
  packHuntTextV7,
  slotsTextV7,
  turnsTextV7,
} from "../src/render/dinosaur-presentation-v7";
import {
  DISRUPTION_CAUSE_LABELS_V7,
  FAVOUR_PURPOSE_LABELS_V7,
} from "../src/render/cult-channel-presentation-v7";
import {
  FAVOUR_SOURCE_LABELS_V7,
  OFFERING_UNLOCK_TEXT_V7,
  SUMMONER_SUPPORT_UNLOCK_TEXT_V7,
} from "../src/render/cult-presentation-v7";
import {
  factionHasFavourV7,
  favourOfV7,
  previewAnchorV7,
  previewBeholdV7,
  previewBooV7,
  previewChannelV7,
  previewOfferingV7,
  previewSacrificeV7,
  previewSeizeV7,
  previewSummonV7,
} from "../src/engine/index";
import {
  BRAIN_SUPPORT_UNLOCK_TEXT_V7,
  DISINTEGRATOR_UNLOCK_TEXT_V7,
  FORCE_FIELDS_UNLOCK_TEXT_V7,
  FORCE_FIELD_HOLDS_V7,
  HEAT_SINKS_UNLOCK_TEXT_V7,
  martianCombatLinesV7,
} from "../src/render/martian-presentation-v7";

export const TEXT_PLAY_SESSION_FORMAT_V7 = "pulp-wars-text-play-session";
export const TEXT_PLAY_SESSION_VERSION_V7 = 1;

export interface TextPlayResultV7 {
  readonly exitCode: number;
  readonly output: string;
}

/** A user-facing failure: printed as `ERROR: ...`, exit code 1. */
class TextPlayErrorV7 extends Error {}

interface JournalRoundV7 {
  readonly round: number;
  readonly coins: number;
  readonly income: number;
  readonly cities: readonly {
    readonly id: number;
    readonly level: number;
    readonly population: number;
  }[];
  readonly units: Readonly<Record<string, number>>;
  readonly techs: readonly string[];
}

interface JournalNoteV7 {
  readonly round: number;
  readonly text: string;
}

interface JournalObservedV7 {
  readonly round: number;
  readonly lines: readonly string[];
}

interface JournalV7 {
  /** One row per own turn, taken when the turn starts. */
  readonly rounds: readonly JournalRoundV7[];
  /** Milestones from the seat's own projected events. */
  readonly notes: readonly JournalNoteV7[];
  /** What the seat observed while the other seats played. */
  readonly observed: readonly JournalObservedV7[];
}

interface SessionV7 {
  readonly format: typeof TEXT_PLAY_SESSION_FORMAT_V7;
  readonly version: typeof TEXT_PLAY_SESSION_VERSION_V7;
  readonly rulesetId: string;
  readonly seat: number;
  readonly playerId: PlayerId;
  readonly setup: MatchSetupV7;
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
  readonly stateHash: string;
  readonly journal: JournalV7;
  /**
   * The giants' signatures (`pulp_wars-w49.30`): a `lab --giant` session,
   * whose first state has the seat's reward giant placed at the front
   * (`withLabGiantV7`); the replay places it the same way.
   */
  readonly labGiant?: true;
  /**
   * Set by a `do` that stopped at a rejected id and cleared by the next
   * `do` or `end`: a plain `end` right after it is refused (see `end`).
   */
  readonly rejectedDo?: {
    readonly id: string;
    readonly notExecuted: readonly string[];
  } | null;
}

const HELP_V7 = `Pulp Wars text play (Ruleset 7). One command per invocation; state lives in the session file.

  new     --session S [--map dry-land] [--size 11] [--seed 1] [--factions original,undead[,...]]
          [--seat 0] [--curiosities on|off] [--mode domination|perfection]
          [--ai-head-start 0|5|10|20] [--overwrite]
  lab     --session S <LAB> [--giant] [--overwrite]
                                        start a staged position (you play the Humans; LAB_GOBLIN_MID: the Goblins; LAB_UNDEAD_MID: the Undead; LAB_MARTIAN_MID: the Martians; LAB_DINOSAUR_MID: the Dinosaurs; LAB_ICE_FOLK_MID: the Ice Folk; LAB_DWARF_MID: the Dwarves); lab alone lists them
                                        --giant (a *_MID lab or LAB_BREAKTHROUGH): your faction's reward giant stands at the front, full HP
  view    --session S [--full]          public view of your seat: header, map, cities, units
  tech    --session S                   technology tree with costs and unlocks
  options --session S [--unit ID | --city ID | --tile x,y | --all]
                                        offered commands with ids and previews
  do      --session S <id> [<id>...] [--at N] [--end]
                                        apply offered commands in order; stops at the first rejection;
                                        --end also ends the turn, only if every id was applied
  end     --session S [--at N] [--force]
                                        end your turn; the AI seats play; prints what you observed;
                                        refused right after a do that stopped at a rejected id
                                        (issue another do first, or pass --force)
  log     --session S [--round N]       your own timeline (public information only)
  debrief --session S --out FILE [--reveal-hidden]
                                        AFTER THE GAME ONLY: reveals every seat's hidden data
  verify  --session S                   replay the command log and compare the state hash
  help

Command ids (case-insensitive, valid while offered; see docs/validation/TEXT_PLAY.md):
  u12.m.4,5        move unit 12 to x=4,y=5      u12.a.u31     attack unit 31
  u12.capture | .recover | .promote | .fortify | .pillage | .disband | .wait | .rally | .tend
  c1.t.FIGHTER     train in city 1               c1.grant      Land Grant
  c1.reward.WALLS  choose a pending city reward  r.FARMING     research
  t.4,5.build_farm tile action at 4,5            t.4,5.monument.EXPLORER
Coordinates are x,y with 0,0 in the top-left corner; x grows to the right, y grows downwards.
--at N refuses to act unless the session is at state #N (the number every header prints).`;

const BOOLEAN_FLAGS_V7 = new Set([
  "giant",
  "full",
  "all",
  "overwrite",
  "reveal-hidden",
  "end",
  "force",
]);
const VALUE_FLAGS_V7 = new Set([
  "session",
  "map",
  "size",
  "seed",
  "factions",
  "seat",
  "curiosities",
  "mode",
  "ai-head-start",
  "unit",
  "city",
  "tile",
  "round",
  "out",
  "at",
]);

interface ArgsV7 {
  readonly command: string;
  readonly flags: ReadonlyMap<string, string>;
  readonly switches: ReadonlySet<string>;
  readonly positionals: readonly string[];
}

/** Runs one text-play command. Never throws for a user error. */
export function runTextPlayV7(argv: readonly string[]): TextPlayResultV7 {
  try {
    const args = parseArgsV7(argv);
    return { exitCode: 0, output: dispatchV7(args) };
  } catch (error) {
    if (error instanceof TextPlayRejectionV7)
      return { exitCode: 1, output: error.output };
    if (error instanceof TextPlayErrorV7)
      return { exitCode: 1, output: `ERROR: ${error.message}` };
    throw error;
  }
}

/** A `do` that stopped part-way: the output so far plus the rejection. */
class TextPlayRejectionV7 extends Error {
  constructor(readonly output: string) {
    super("rejected");
  }
}

function parseArgsV7(argv: readonly string[]): ArgsV7 {
  const flags = new Map<string, string>();
  const switches = new Set<string>();
  const positionals: string[] = [];
  const command = argv[0] ?? "help";
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const name = token.slice(2);
    if (BOOLEAN_FLAGS_V7.has(name)) {
      switches.add(name);
      continue;
    }
    if (!VALUE_FLAGS_V7.has(name))
      throw new TextPlayErrorV7(`unknown option ${token} (see help)`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new TextPlayErrorV7(`${token} needs a value`);
    flags.set(name, value);
    index += 1;
  }
  return { command, flags, switches, positionals };
}

function dispatchV7(args: ArgsV7): string {
  switch (args.command) {
    case "help":
    case "--help":
    case "-h":
      return HELP_V7;
    case "new":
      return commandNewV7(args);
    case "lab":
      return commandLabV7(args);
    case "view":
      return commandViewV7(args);
    case "tech":
      return commandTechV7(args);
    case "options":
      return commandOptionsV7(args);
    case "do":
      return commandDoV7(args);
    case "end":
      return commandEndV7(args);
    case "log":
      return commandLogV7(args);
    case "debrief":
      return commandDebriefV7(args);
    case "verify":
      return commandVerifyV7(args);
    default:
      throw new TextPlayErrorV7(
        `unknown command "${args.command}" (new, lab, view, tech, options, do, end, log, debrief, verify, help)`,
      );
  }
}

// ---------------------------------------------------------------------------
// Session file
// ---------------------------------------------------------------------------

function sessionPathV7(args: ArgsV7): string {
  const value = args.flags.get("session");
  if (value === undefined)
    throw new TextPlayErrorV7("--session <path>.json is required");
  return resolve(value);
}

function loadSessionV7(args: ArgsV7): SessionV7 {
  const path = sessionPathV7(args);
  if (!existsSync(path))
    throw new TextPlayErrorV7(
      `no session file at ${path}; create one with: new --session ${path}`,
    );
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new TextPlayErrorV7(`session file ${path} is not valid JSON`);
  }
  const record = raw as Partial<SessionV7> | null;
  if (
    record === null ||
    typeof record !== "object" ||
    record.format !== TEXT_PLAY_SESSION_FORMAT_V7 ||
    record.version !== TEXT_PLAY_SESSION_VERSION_V7
  )
    throw new TextPlayErrorV7(
      `${path} is not a text-play session (format ${TEXT_PLAY_SESSION_FORMAT_V7} version ${TEXT_PLAY_SESSION_VERSION_V7})`,
    );
  if (record.rulesetId !== RULESET_7_ID)
    throw new TextPlayErrorV7(
      `stale session: it was created under ruleset ${String(record.rulesetId)} and the engine is now ${RULESET_7_ID}. Start a new session.`,
    );
  const state = parseGameStateV7(record.state);
  if (state === null)
    throw new TextPlayErrorV7(
      `stale or corrupt session: the stored state is not a valid ${RULESET_7_ID} state. Start a new session.`,
    );
  if (
    canonicalHash(state) !== record.stateHash ||
    !Array.isArray(record.commands) ||
    record.commands.length !== state.commandIndex ||
    record.journal === undefined ||
    typeof record.playerId !== "number" ||
    !state.players.some((player) => player.id === record.playerId)
  )
    throw new TextPlayErrorV7(
      "corrupt session: the stored state does not match its hash or command log. Start a new session.",
    );
  return { ...(record as SessionV7), state };
}

function saveSessionV7(path: string, session: SessionV7): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(session)}\n`);
  renameSync(temporary, path);
}

function withStateV7(
  session: SessionV7,
  state: GameStateV7,
  commands: readonly CommandV7[],
  journal: JournalV7,
): SessionV7 {
  return {
    ...session,
    state,
    commands,
    journal,
    stateHash: canonicalHash(state),
  };
}

function expectStateV7(args: ArgsV7, session: SessionV7): void {
  const expected = args.flags.get("at");
  if (expected === undefined) return;
  if (Number(expected) !== session.state.commandIndex)
    throw new TextPlayErrorV7(
      `stale: --at ${expected} but the session is at state #${session.state.commandIndex}. Run view or options again.`,
    );
}

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------

const xyV7 = (at: CoordV7): string => `${at.x},${at.y}`;
const sameV7 = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshevV7 = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const halfV7 = (value2: number): string => String(value2 / 2);
const signedV7 = (value: number): string => `${value >= 0 ? "+" : ""}${value}`;

function isCoordV7(value: unknown): value is CoordV7 {
  if (value === null || typeof value !== "object") return false;
  const keys = Object.keys(value);
  return (
    keys.length === 2 &&
    typeof (value as CoordV7).x === "number" &&
    typeof (value as CoordV7).y === "number"
  );
}

function tileAtV7(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerTileViewV7 | undefined {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= view.board.width ||
    at.y >= view.board.height
  )
    return undefined;
  return view.board.tiles[at.y * view.board.width + at.x];
}

function seatLabelV7(view: PlayerViewV7, playerId: number): string {
  if (isNeutralOwnerV7(playerId as PlayerId)) return "N";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? `P${playerId}` : `S${player.seat}`;
}

function seatNameV7(view: PlayerViewV7, playerId: number): string {
  if (isNeutralOwnerV7(playerId as PlayerId)) return "N Wilds";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined
    ? `P${playerId}`
    : `S${player.seat} ${FACTION_DISPLAY_NAMES_V7[player.faction]}`;
}

function unitLabelV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  const label = unitRoleRuleV7(view, unit).label;
  // The giants' signatures (Break Off): a Gingerbread Man is a Toffee
  // Trooper in every rule; the harness names it as it looks.
  if (unit.variant === "GINGERBREAD_MAN") return `Gingerbread Man(${label})`;
  return unit.form === "EGG" ? `Egg(${label})` : label;
}

/** `u12(S0 Fighter)`: the id is greppable, the bracket says whose and what. */
function unitTagV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  return `u${unit.id}(${seatLabelV7(view, unit.ownerId)} ${unitLabelV7(view, unit)})`;
}

/**
 * Remembers the public identity of every unit the seat has seen in the views
 * of one invocation, so an event can still name a unit that just died or
 * left sight. It never reads authoritative state.
 */
class UnitMemoryV7 implements UnitNamesV7 {
  readonly #tags = new Map<number, string>();
  readonly #owners = new Map<number, number>();
  readonly #positions = new Map<number, CoordV7>();

  remember(view: PlayerViewV7): void {
    for (const unit of [
      ...view.units,
      ...view.burrowed.map((entry) => entry.unit),
    ]) {
      this.#tags.set(unit.id, unitTagV7(view, unit));
      this.#owners.set(unit.id, unit.ownerId);
      this.#positions.set(unit.id, unit.at);
    }
  }

  tag(unitId: number): string {
    return this.#tags.get(unitId) ?? `u${unitId}`;
  }

  owner(unitId: number): number | null {
    return this.#owners.get(unitId) ?? null;
  }

  position(unitId: number): CoordV7 | null {
    return this.#positions.get(unitId) ?? null;
  }
}

/** What an event or preview line needs to name a unit. */
interface UnitNamesV7 {
  tag(unitId: number): string;
  owner(unitId: number): number | null;
  position(unitId: number): CoordV7 | null;
}

interface TextContextV7 {
  readonly view: PlayerViewV7;
  readonly memory: UnitNamesV7;
  /** The seat's view before the command (an event text may need old HP). */
  readonly before?: PlayerViewV7;
}

/**
 * Generic compact printer for event and preview payloads: unit ids become
 * unit tags, player ids seats, city ids `c<id>`, coordinates `x,y`. False,
 * null, zero-length, and (optionally) zero values are omitted.
 */
function compactValueV7(
  key: string,
  value: unknown,
  context: TextContextV7,
  omitZero = false,
): string | null {
  if (value === null || value === undefined || value === false) return null;
  if (value === true) return "yes";
  if (omitZero && (value === 0 || value === "NONE")) return null;
  if (typeof value === "number") {
    if (/playerId$|^humanId$|^winnerId$|^ownerId$/i.test(key))
      return seatLabelV7(context.view, value);
    if (/unitId$|^captainId$|^attackerId$/i.test(key))
      return context.memory.tag(value);
    if (/cityId$/i.test(key)) return `c${value}`;
    return String(value);
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const single = key.replace(/Ids(Before|After)?$/, "Id");
    const parts = value
      .map((entry) => compactValueV7(single, entry, context, omitZero))
      .filter((entry): entry is string => entry !== null);
    return parts.length === 0 ? null : `[${parts.join("; ")}]`;
  }
  if (isCoordV7(value)) return xyV7(value);
  if (typeof value === "object") {
    const body = compactFieldsV7(
      value as Record<string, unknown>,
      context,
      NO_SKIP_V7,
      omitZero,
    );
    return body === "" ? null : `{${body}}`;
  }
  return null;
}

const NO_SKIP_V7: ReadonlySet<string> = new Set();

function compactFieldsV7(
  record: Readonly<Record<string, unknown>>,
  context: TextContextV7,
  skip: ReadonlySet<string> = NO_SKIP_V7,
  omitZero = false,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === "kind" || skip.has(key)) continue;
    const text = compactValueV7(key, value, context, omitZero);
    if (text !== null) parts.push(`${key}=${text}`);
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Derived public facts (the same derivations the browser shows)
// ---------------------------------------------------------------------------

/** Mirrors `cityIncomeForViewerV7` of the browser view: view facts only. */
function cityIncomeV7(view: PlayerViewV7, city: PublicCityV7): number {
  if (cityBesiegedV7(view, city)) return 0;
  const market =
    view.improvementValues.find(
      (value) =>
        value.improvement === "MARKET" &&
        tileAtV7(view, value.at)?.explored === true &&
        (
          tileAtV7(view, value.at) as Extract<
            PlayerTileViewV7,
            { explored: true }
          >
        ).territoryCityId === city.id,
    )?.level ?? 0;
  return Math.max(
    1,
    cityLevelIncomeV7(city.level) +
      (city.isCapital ? 1 : 0) +
      // `pulp_wars-zypi`: the city's Economic Miracle rewards.
      cityEconomicMiracleIncomeV7(city) +
      Number(view.naval.landTradeCityIds.includes(city.id)) *
        LAND_TRADE_INCOME_COINS_V7 +
      Number(view.naval.seaTradeCityIds.includes(city.id)) +
      market +
      Math.min(0, city.population),
  );
}

function cityBesiegedV7(view: PlayerViewV7, city: PublicCityV7): boolean {
  return view.units.some(
    (unit) =>
      sameV7(unit.at, city.at) &&
      arePlayersHostileV7(view, city.ownerId, unit.ownerId),
  );
}

/**
 * A city as the harness prints it: its command id and, beside it, the name
 * the game shows (`c7 Aldmere`). A city out of the seat's sight has only
 * its id.
 */
function cityTagV7(view: PlayerViewV7, cityId: number): string {
  const name = cityNameByIdV7(view, cityId);
  return name === null ? `c${cityId}` : `c${cityId} ${name}`;
}

function ownCitiesV7(view: PlayerViewV7): readonly PublicCityV7[] {
  return view.cities.filter((city) => city.ownerId === view.viewer.id);
}

function totalIncomeV7(view: PlayerViewV7): number {
  return ownCitiesV7(view).reduce(
    (sum, city) => sum + cityIncomeV7(view, city),
    0,
  );
}

function citySlotsV7(
  view: PlayerViewV7,
  city: PublicCityV7,
): { readonly used: number; readonly capacity: number } {
  return {
    used: allOwnedUnitsV7(view, view.viewer.id)
      .filter((unit) => unit.homeCityId === city.id)
      .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0),
    capacity: cityUnitCapacityForV7(
      city.level,
      view.viewer.researchedTechs,
      view.viewer.faction,
      cityBarracksV7(city),
    ),
  };
}

/** Mirrors the browser's training cost: an active Forge takes 1 Coin off. */
function trainingCostV7(
  view: PlayerViewV7,
  cityId: CityId,
  role: UnitRoleIdV7,
): number {
  const base = effectiveRoleRuleV7(role, view.viewer.faction).cost ?? 0;
  const forge = view.improvementValues.some((value) => {
    if (value.improvement !== "FORGE" || value.level <= 0) return false;
    const tile = tileAtV7(view, value.at);
    return tile?.explored === true && tile.territoryCityId === cityId;
  });
  return Math.max(1, base - (forge ? 1 : 0));
}

/**
 * Tuning 4 (`pulp_wars-w49.3`): the role rules a stat line does not show,
 * for train, hire and technology lines and for the units of `view --full`.
 */
export const NO_GANG_UP_TEXT_V7 = "its bombs get no Gang Up";
export const GANG_UP_ONE_TEXT_V7 = "its rockets get Gang Up +1 at most";
export const BLAST_PROOF_TEXT_V7 =
  "Blast-proof: blasts and bomb splash don't hurt it";
export const CRASH_TEXT_V7 = "Crash: can Kaboom after attacking";
// The Martian pass (`pulp_wars-w49.14`, 7r52): the two rules a technology
// gates, and the ray rule they stand on.
export const HEAT_RAY_TEXT_V7 =
  "heat ray: half Attack after moving or while Cooling (a full shot leaves it Cooling for a turn)";
export const HEAT_SINK_TEXT_V7 =
  "with Heat Sinks it does not overheat (no Cooling)";
// The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Shield Projector
// is trained with Force Fields, so the note no longer says "needs".
export const FORCE_FIELD_NEEDS_NOTE_V7 =
  "Force Field (the Force Fields technology, which also trains it): your units that start a turn next to it have Shield 4, and at full HP one attack cannot kill them (1 HP left)";
/** The Martian pass, correction (`pulp_wars-w49.14`). */
export const PSYCHIC_COOLDOWN_TEXT_V7 =
  "Psychic Command every second turn (the Brain is Cooling in between)";
/**
 * Step two of the Martian pass (`pulp_wars-w49.25`): the Shock Trooper's
 * rule on its own line (the `tech` and train lines listed it as a unit with
 * "abilities CAPTURE" and nothing else; only its attacker's preview named
 * the Shock Field).
 */
export function shockFieldTextV7(damage: number): string {
  return `Shock Field: while it has Shield, a unit that attacks it from the next tile takes ${damage}`;
}
export const BEAM_DOWN_TEXT_V7 = `Beam Down: sets one of your units down beside itself, lifted from on or beside ANY of your city centers or from up to ${BEAM_DOWN_PICKUP_RANGE_V7} tiles away (the unit may still attack, not move)`;

function roleNotesV7(
  rule: EffectiveRoleRuleV7,
  slipsPast = false,
  mechanics: Pick<
    RoleMechanicsV7,
    | "rangedDefense2"
    | "gangUpLimit"
    | "blastProof"
    | "kaboomAfterAttack"
    | "carrionBonus2"
    | "heatSink"
    | "rallyCools"
    | "packHuntBonus2"
    | "armourReduction"
    | "capacitySlots"
    | "hatchTurns"
    | "shockFieldDamage"
  > | null = null,
): readonly string[] {
  const rangedDefense2 = mechanics?.rangedDefense2 ?? null;
  const notes: string[] = [];
  if (!rule.mayUsePrimaryActionAfterMove && rule.range > 0)
    notes.push(NO_MOVE_AND_ATTACK_TEXT_V7);
  if (rule.abilities.includes("OVERRUN")) notes.push(OVERRUN_BUDGET_TEXT_V7);
  if (slipsPast) notes.push(RAIDER_SLIPS_TEXT_V7);
  // Tuning 5 (`pulp_wars-w49.4`): the Guard's ranged Defense, and when a
  // Charge applies.
  // The Undead pass (`pulp_wars-w49.13`, 7r51): or the Skeleton's Bones.
  if (rangedDefense2 !== null)
    notes.push(rangedDefenseTextV7(rangedDefense2, rule.defense2));
  if (rule.abilities.includes("CHARGE")) notes.push(CHARGE_CONDITION_TEXT_V7);
  // The Undead pass, correction (`pulp_wars-w49.13`): Carrion, Plague
  // behind Pestilence, and why a low Attack strikes back hard (a Guard
  // deals a Skeleton 3 attacking and 8 striking back).
  if (mechanics !== null && mechanics.carrionBonus2 > 0)
    notes.push(carrionTextV7(mechanics.carrionBonus2));
  if (rule.abilities.includes("PLAGUE")) notes.push(PLAGUE_NEEDS_TEXT_V7);
  if (rule.attack2 > 0 && rule.range === 1 && rule.defense2 >= rule.attack2 + 2)
    notes.push(strikesBackTextV7(rule.defense2));
  // The Goblin pass (`pulp_wars-w49.12`, 7r50): the three Goblin unit rules.
  if (mechanics !== null) {
    if (mechanics.gangUpLimit === 0) notes.push(NO_GANG_UP_TEXT_V7);
    if (mechanics.gangUpLimit === 1) notes.push(GANG_UP_ONE_TEXT_V7);
    if (mechanics.blastProof) notes.push(BLAST_PROOF_TEXT_V7);
    if (mechanics.kaboomAfterAttack) notes.push(CRASH_TEXT_V7);
  }
  // The Martian pass (`pulp_wars-w49.14`, 7r52).
  if (rule.abilities.includes("HEAT_RAY")) notes.push(HEAT_RAY_TEXT_V7);
  if (mechanics !== null && mechanics.heatSink) notes.push(HEAT_SINK_TEXT_V7);
  if (rule.abilities.includes("FORCE_FIELD"))
    notes.push(FORCE_FIELD_NEEDS_NOTE_V7);
  if (mechanics !== null && mechanics.rallyCools)
    notes.push(PSYCHIC_COOLDOWN_TEXT_V7);
  if ((rule.abilities as readonly string[]).includes("BEAM_DOWN"))
    notes.push(BEAM_DOWN_TEXT_V7);
  if (mechanics !== null && mechanics.shockFieldDamage > 0)
    notes.push(shockFieldTextV7(mechanics.shockFieldDamage));
  // The Dinosaur pass (`pulp_wars-w49.15`, 7r53): the Dinosaur unit rules
  // in the sentences of the unit card (only a Dinosaur role has them).
  if (rule.abilities.includes("LINEBREAKER"))
    notes.push(`Charge!: ${CHARGE_DESCRIPTION_V7}`);
  if (rule.abilities.includes("ACID"))
    notes.push(
      `Acid: ${dinosaurAbilityDescriptionV7("ACID", "DINOSAUR") ?? ""}`,
    );
  if (mechanics !== null && mechanics.armourReduction > 0)
    notes.push(
      `Armoured: ${dinosaurAbilityDescriptionV7("ARMOURED", "DINOSAUR") ?? ""}`,
    );
  if (rule.abilities.includes("HATCH"))
    notes.push(`Hatch: ${HATCH_TOOLTIP_V7}`);
  if (mechanics !== null && mechanics.packHuntBonus2 > 0)
    notes.push(packHuntTextV7(mechanics.packHuntBonus2));
  if (rule.abilities.includes("GROW"))
    notes.push(
      `Grows with kills: ${dinosaurAbilityDescriptionV7("GROW", "DINOSAUR") ?? ""}`,
    );
  if (mechanics !== null && mechanics.hatchTurns !== null)
    notes.push(
      `laid as an Egg next to the city, hatches in ${turnsTextV7(mechanics.hatchTurns)} (a Shaman can hatch it sooner)`,
    );
  if (mechanics !== null && mechanics.capacitySlots > 1)
    notes.push(`fills ${slotsTextV7(mechanics.capacitySlots)}`);
  return notes;
}

function roleStatsV7(rule: EffectiveRoleRuleV7, faction?: FactionIdV7): string {
  const range =
    rule.minimumRange > 1
      ? `${rule.minimumRange}-${rule.range}`
      : String(rule.range);
  const abilities = rule.abilities.filter((ability) => ability !== "ATTACK");
  return `hp ${rule.maxHp} atk ${halfV7(rule.attack2)} def ${halfV7(rule.defense2)} mov ${rule.move} rng ${range} sight ${rule.sightRadius}${abilities.length === 0 ? "" : ` abilities ${abilities.join(",")}`}${roleNotesV7(
    rule,
    false,
    faction === undefined ? null : roleMechanicsV7(rule.role, faction),
  )
    .map((note) => ` | ${note}`)
    .join("")}`;
}

/**
 * A technology as the harness prints it: its ID, and (the ninth unit,
 * `pulp_wars-w49.17`, 7r55) the name the faction's player reads wherever
 * that is not the ID in sentence case: `DRILL "Crafting"`, `METALLURGY
 * "Armoury"`, a Dinosaur `SAWMILLING "Timber"`, and plain `ROADS`.
 */
function techNameV7(faction: FactionIdV7, tech: string): string {
  if (!(TECHNOLOGY_IDS_V7 as readonly string[]).includes(tech)) return tech;
  const name = technologyDisplayNameV7(tech as TechnologyIdV7, faction);
  return name.toUpperCase().replaceAll(" ", "_") === tech
    ? tech
    : `${tech} "${name}"`;
}

// ---------------------------------------------------------------------------
// Command ids
// ---------------------------------------------------------------------------

/**
 * The stable id of a command. It names what the command does, so the same
 * id means the same command in every state; it is valid exactly while the
 * public command query offers that command.
 */
export function textPlayCommandIdV7(command: CommandV7): string {
  switch (command.kind) {
    case "MOVE": {
      const to = command.path[command.path.length - 1];
      return `u${command.unitId}.m.${to === undefined ? "?" : xyV7(to)}`;
    }
    case "ATTACK":
      return `u${command.unitId}.a.u${command.targetUnitId}`;
    case "BOARD":
      return `u${command.unitId}.board.u${command.targetUnitId}`;
    case "MIND_CONTROL":
      return `u${command.unitId}.mind.u${command.targetUnitId}`;
    case "TRACTOR_BEAM":
      return `u${command.unitId}.tractor.u${command.targetUnitId}`;
    case "THROW_BOLAS":
      return `u${command.unitId}.bolas.u${command.targetUnitId}`;
    // Ice Folk Freeze (`pulp_wars-w49.37`).
    case "FROST_BOLT":
      return `u${command.unitId}.frostbolt.u${command.targetUnitId}`;
    case "STAMPEDE":
      return `u${command.unitId}.stampede.${xyV7(command.at)}`;
    case "SUGAR_TOSS":
      return `u${command.unitId}.toss.u${command.targetUnitId}`;
    // The Candy redesign (`pulp_wars-jdb.12`).
    case "TOP_UP":
      return `u${command.unitId}.topup.u${command.targetUnitId}`;
    // The giants' signatures (`pulp_wars-w49.30`).
    case "SWALLOW":
      return `u${command.unitId}.swallow.u${command.targetUnitId}`;
    case "TOSS":
      return `u${command.unitId}.throw.u${command.passengerUnitId}.${xyV7(command.at)}`;
    case "STOMP":
      return `u${command.unitId}.stomp`;
    case "BREAK_OFF":
      return `u${command.unitId}.breakoff.${xyV7(command.tiles[0])}+${xyV7(command.tiles[1])}`;
    // The Cultists (`pulp_wars-mch9.4`).
    case "SACRIFICE":
      return `u${command.unitId}.sacrifice.u${command.victimUnitId}`;
    case "SEIZE":
      return `u${command.unitId}.seize.u${command.victimUnitId}`;
    case "OFFERING":
      return `c${command.cityId}.offering`;
    // The channel (`pulp_wars-mch9.5`).
    case "SUMMON":
      return `u${command.unitId}.summon.u${command.helperUnitId}.${xyV7(command.at)}`;
    case "CHANNEL":
      return `u${command.unitId}.channel.u${command.daemonUnitId}`;
    case "BEHOLD":
      return `u${command.unitId}.behold`;
    case "ANCHOR":
      return `u${command.unitId}.anchor.u${command.cultistUnitId}`;
    case "BOO":
      return `u${command.unitId}.boo`;
    case "HATCH":
      return `u${command.unitId}.hatch.u${command.eggUnitId}`;
    case "BEAM_DOWN":
      return `u${command.unitId}.beam.u${command.passengerUnitId}.${xyV7(command.to)}`;
    case "BOMB_RUN":
      return `u${command.unitId}.bomb.u${command.targetUnitId}.${xyV7(command.to)}`;
    case "TUNNEL":
      return `u${command.unitId}.tunnel.${xyV7(command.to)}${command.rider === null ? "" : `.u${command.rider.unitId}.${xyV7(command.rider.to)}`}`;
    case "FREEZE":
      return `u${command.unitId}.freeze.${xyV7(command.at)}`;
    case "REBAKE":
      return `u${command.unitId}.rebake.${xyV7(command.from)}>${xyV7(command.at)}`;
    case "DISEMBARK":
      return `u${command.unitId}.land.${xyV7(command.at)}`;
    case "ASSEMBLE":
      return `u${command.unitId}.assemble.${xyV7(command.to)}`;
    // Dwarf crowd control (`pulp_wars-w49.33`).
    case "WHIRL":
      return `u${command.unitId}.whirl`;
    case "BUILD_BARRICADE":
      return `u${command.unitId}.barricade.${xyV7(command.to)}`;
    case "ATTACK_BARRICADE":
      return `u${command.unitId}.a.${xyV7(command.at)}`;
    case "RALLY":
      return `u${command.unitId}.rally`;
    case "TEND_WOUNDED":
      return `u${command.unitId}.tend`;
    case "RAISE_DEAD":
      return `u${command.unitId}.raise`;
    case "DEVOUR":
      return `u${command.unitId}.devour`;
    case "COLD_SNAP":
      return `u${command.unitId}.coldsnap`;
    case "SUGAR_RUSH":
      return `u${command.unitId}.rush`;
    case "RECOVER":
    case "CAPTURE":
    case "PROMOTE":
    case "PILLAGE":
    case "DISBAND":
    case "WAIT":
    case "WAIL":
    case "KABOOM":
      return `u${command.unitId}.${command.kind.toLowerCase()}`;
    case "TOSS_COIN":
      return `u${command.unitId}.toss`;
    case "BUILD_FIELD_DEFENSE":
      return `u${command.unitId}.fortify`;
    case "LAY_EGG":
      return `c${command.cityId}.egg.${command.role}.${xyV7(command.at)}`;
    case "LAND_GRANT":
      return `c${command.cityId}.grant`;
    case "TRAIN":
      return `c${command.cityId}.t.${command.role}`;
    case "TRAIN_NAVAL":
      return `c${command.cityId}.tn.${command.role}.${xyV7(command.at)}`;
    case "HIRE":
      return `c${command.cityId}.hire.${command.role}.${xyV7(command.at)}`;
    case "CHOOSE_CITY_REWARD":
      return `c${command.cityId}.reward.${command.reward}`;
    case "RESEARCH":
      return `r.${command.tech}`;
    case "BUILD_MONUMENT":
      return `t.${xyV7(command.at)}.monument.${command.achievement}`;
    case "END_TURN":
      return "end";
    default:
      return `t.${xyV7(command.at)}.${command.kind.toLowerCase()}`;
  }
}

interface OfferedV7 {
  readonly id: string;
  readonly command: CommandV7;
}

/**
 * Tuning 5 (`pulp_wars-w49.4`): the name a seat sees for a level reward.
 * The engine's `SURVEY` is Scouts for a faction whose survey also gives a
 * Raider (the Humans); `SURVEY` stays accepted as an id.
 */
function rewardNameV7(faction: FactionIdV7, reward: string): string {
  return reward === "SURVEY" && SURVEY_RAIDERS_V7[faction] === 1
    ? "SCOUTS"
    : reward;
}
function rewardIdV7(
  faction: FactionIdV7,
  cityId: number,
  reward: string,
): string {
  return `c${cityId}.reward.${rewardNameV7(faction, reward)}`;
}
/** A pending choice's ids, each with what it gives in a few words. */
function rewardChoicesTextV7(
  view: PlayerViewV7,
  choice: PlayerViewV7["pendingChoices"][number],
): string {
  return choice.candidates
    .map((reward) => {
      const name = rewardNameV7(view.viewer.faction, reward);
      const gives =
        name === "SCOUTS"
          ? `free ${effectiveRoleRuleV7("RAIDER", view.viewer.faction).label}, reveals the area`
          : (REWARD_TEXT_V7[reward] ?? null);
      return `c${choice.cityId}.reward.${name}${gives === null ? "" : ` (${gives})`}`;
    })
    .join(" | ");
}

/** The offered commands with their ids, in the public query's order. */
function queriedV7(view: PlayerViewV7): readonly OfferedV7[] {
  const used = new Map<string, number>();
  return queryPlayerCommandsV7(view).map((command) => {
    // Tuning 5 (`pulp_wars-w49.4`): a seat whose Survey gives a Raider
    // sees the reward under its name, Scouts.
    const base =
      command.kind === "CHOOSE_CITY_REWARD"
        ? rewardIdV7(view.viewer.faction, command.cityId, command.reward)
        : textPlayCommandIdV7(command);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    // Two offers with one meaning (two paths to one tile) stay distinct.
    return { id: count === 1 ? base : `${base}~${count}`, command };
  });
}

/**
 * The Dinosaur pass, correction (`pulp_wars-w49.15`): the offered commands
 * plus, for an own Triceratops whose run-up counts two tiles (Wallbreaker),
 * a two-tile Move to every tile it can also reach in one step
 * (`u7.run.4,5`). The public query offers one path a tile, the shortest,
 * so the second tile of the run-up could not be chosen for a target next
 * to that tile. The engine accepts any legal path; these are legal by the
 * public path check.
 */
function offeredV7(view: PlayerViewV7): readonly OfferedV7[] {
  const offered = queriedV7(view);
  const tiles = technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).runUpTiles;
  if (tiles < 2) return offered;
  const extra: OfferedV7[] = [];
  for (const unit of view.units) {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      unit.activation.moved ||
      !unitRoleRuleV7(view, unit).abilities.includes("LINEBREAKER")
    )
      continue;
    for (const entry of offered) {
      const command = entry.command;
      if (
        command.kind !== "MOVE" ||
        command.unitId !== unit.id ||
        command.path.length !== 1
      )
        continue;
      const to = command.path[0] as CoordV7;
      let found: readonly CoordV7[] | null = null;
      for (let dy = -1; dy <= 1 && found === null; dy += 1)
        for (let dx = -1; dx <= 1 && found === null; dx += 1) {
          const via = { x: unit.at.x + dx, y: unit.at.y + dy };
          if (
            (dx === 0 && dy === 0) ||
            sameV7(via, to) ||
            chebyshevV7(via, to) !== 1
          )
            continue;
          const result = validatePlayerMovementPathV7(view, unit, [via, to]);
          if (
            result.legal &&
            sameV7(result.destination, to) &&
            result.traversedPath.length === 2
          )
            found = [via, to];
        }
      if (found !== null)
        extra.push({
          id: `u${unit.id}.run.${xyV7(to)}`,
          command: { kind: "MOVE", unitId: unit.id, path: found },
        });
    }
  }
  return extra.length === 0 ? offered : [...offered, ...extra];
}

function commandUnitIdV7(command: CommandV7): number | null {
  return "unitId" in command ? command.unitId : null;
}

function commandCityIdV7(
  view: PlayerViewV7,
  command: CommandV7,
): number | null {
  if ("cityId" in command) return command.cityId;
  if ("unitId" in command || !("at" in command)) return null;
  const tile = tileAtV7(view, command.at);
  return tile?.explored === true ? tile.territoryCityId : null;
}

type CommandGroupV7 =
  | "research"
  | "train"
  | "city"
  | "reward"
  | "tile"
  | "move"
  | "attack"
  | "unit";

function commandGroupV7(command: CommandV7): CommandGroupV7 | "end" {
  switch (command.kind) {
    case "END_TURN":
      return "end";
    case "RESEARCH":
      return "research";
    case "TRAIN":
    case "TRAIN_NAVAL":
    case "HIRE":
    case "LAY_EGG":
      return "train";
    case "LAND_GRANT":
      return "city";
    case "CHOOSE_CITY_REWARD":
      return "reward";
    case "MOVE":
    case "DISEMBARK":
      return "move";
    case "ATTACK":
    case "ATTACK_BARRICADE":
      return "attack";
    default:
      return "unitId" in command ? "unit" : "tile";
  }
}

function offeredSummaryV7(offered: readonly OfferedV7[]): string {
  const counts = new Map<string, number>();
  for (const entry of offered) {
    const group = commandGroupV7(entry.command);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  const order: readonly (CommandGroupV7 | "end")[] = [
    "reward",
    "research",
    "train",
    "city",
    "tile",
    "move",
    "attack",
    "unit",
  ];
  const parts = order
    .filter((group) => (counts.get(group) ?? 0) > 0)
    .map((group) => `${group} ${counts.get(group)}`);
  const total = offered.filter(
    (entry) => entry.command.kind !== "END_TURN",
  ).length;
  return `OFFERED ${total}: ${parts.length === 0 ? "nothing" : parts.join(" | ")}${counts.has("end") ? " | end available" : " | end NOT available"}`;
}

// ---------------------------------------------------------------------------
// Previews (public queries only)
// ---------------------------------------------------------------------------

const REWARD_TEXT_V7: Readonly<Record<string, string>> = {
  SURVEY: "reveal the area around the city",
  // Tuning 4 (`pulp_wars-w49.3`).
  BARRACKS: `Barracks: ${BARRACKS_REWARD_TEXT_V7}`,
  STOCKPILE: "+4 Coins",
  WALLS: "City Walls: stronger defense on the city center",
  MILITIA: "free basic unit(s) of your faction",
  BOOM: "Population Boom: +3 population",
  // `pulp_wars-zypi`.
  ECONOMIC_MIRACLE: `Economic Miracle: +${ECONOMIC_MIRACLE_COINS_V7} Coin of this city's income every turn`,
  TREASURY_6: "+6 Coins",
  JUGGERNAUT: "a free giant unit",
  TREASURY: `+${CITY_REWARD_COINS_V7.TREASURY} Coins`,
};

/** The marked Grave of a Wight on `at` (public on an explored tile). */
function wightGraveAtV7(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["ninthUnit"]["wightGraves"][number] | null {
  return (
    view.ninthUnit.wightGraves.find((entry) => sameV7(entry.at, at)) ?? null
  );
}

/**
 * What a Wight's marked Grave means, in a tile's description: whose Wight
 * returns, when, and whether a unit keeps it down now.
 */
function wightGraveTextV7(
  view: PlayerViewV7,
  grave: PlayerViewV7["ninthUnit"]["wightGraves"][number],
): string {
  const owner = seatLabelV7(view, grave.ownerId);
  const blocker = view.units.find((unit) => sameV7(unit.at, grave.at));
  return `${WIGHT_GRAVE_LABEL_V7.toUpperCase()} of ${owner} (a Wight returns here with ${WIGHT_RISE_AGAIN_HP_V7} HP at the start of ${owner}'s turn${blocker === undefined ? "" : `; not while a unit stands on it: ${unitTagV7(view, blocker)} does`})`;
}

function tileBriefV7(view: PlayerViewV7, at: CoordV7): string {
  const tile = tileAtV7(view, at);
  if (tile === undefined) return "off board";
  if (!tile.explored) return "unexplored";
  const parts: string[] = [tile.terrain.toLowerCase()];
  if (tile.site !== null) parts.push(tile.site.toLowerCase());
  if (tile.improvement !== null) parts.push(tile.improvement.toLowerCase());
  else if (tile.resource !== null) parts.push(tile.resource.toLowerCase());
  if (tile.road) parts.push("road");
  if (tile.fieldDefense) parts.push("field-defense");
  // The Undead hand pass at 7r55 (`pulp_wars-w49.20`): a Grave, and the
  // marked Grave a Wight returns from.
  const wightGrave = wightGraveAtV7(view, at);
  if (wightGrave !== null) parts.push(wightGraveTextV7(view, wightGrave));
  else if (view.graves.some((grave) => sameV7(grave, at))) parts.push("grave");
  if (view.treasureChests.some((chest) => sameV7(chest, at)))
    parts.push("TREASURE");
  const curiosity = view.curiosities.find((entry) => sameV7(entry.at, at));
  if (curiosity !== undefined) parts.push(curiosity.kind);
  parts.push(
    tile.territoryOwnerId === null
      ? "neutral"
      : `${seatLabelV7(view, tile.territoryOwnerId)} land`,
  );
  return parts.join(" ");
}

function hostileNearV7(
  view: PlayerViewV7,
  at: CoordV7,
  exceptUnitId: number,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      unit.id !== exceptUnitId &&
      unit.ownerId !== view.viewer.id &&
      chebyshevV7(unit.at, at) === 1 &&
      (isNeutralOwnerV7(unit.ownerId) ||
        arePlayersHostileV7(view, view.viewer.id, unit.ownerId)),
  );
}

const COMBAT_BASE_KEYS_V7 = new Set([
  "attackerId",
  "targetUnitId",
  "attack2",
  "defense2",
  "minimumRange",
  "maximumRange",
  "defenseBonusNumerator",
  "defenseBonusDenominator",
  "fortificationLevel",
  "damageToDefender",
  "damageToAttacker",
  "defenderDies",
  "attackerDies",
  "retaliation",
  "noRetaliationReason",
  "attacksUsed",
  "attacksRemaining",
  "inspiredConsumed",
  "push",
  "advances",
  // The giants' signatures (`pulp_wars-w49.30`): printed by `combatTextV7`.
  "crush",
  "crushDamage",
  "collisionDamage",
  "siegeHammer",
  "wallsDestroyed",
  "glacialSmash",
]);

/**
 * Tuning 8 (`pulp_wars-w49.11`): what the `def` of a combat line is made
 * of, when it is more than the unit's own Defense: each fortification
 * level adds 1, and a Guard that is open to ranged attacks starts from 1.
 * A Lich on a Guard on a Field Defense read `def 3 fort 2` (1 for the
 * Guard, 2 for the Field Defense) beside a Rocket Cart's `def 1 x3/2` on a
 * Guard in a Forest, and looked as if the first shot had met Defense 3.
 */
function defenseBreakdownTextV7(
  preview: {
    readonly targetUnitId: number;
    readonly defense2: number;
    readonly fortificationLevel: number;
  },
  context: TextContextV7,
): string {
  const base2 = preview.defense2 - 2 * preview.fortificationLevel;
  const target =
    context.view.units.find((unit) => unit.id === preview.targetUnitId) ??
    context.before?.units.find((unit) => unit.id === preview.targetUnitId);
  const open =
    target !== undefined &&
    unitRoleMechanicsV7(context.view, target).rangedDefense2 === base2 &&
    unitRoleRuleV7(context.view, target).defense2 !== base2;
  // The Undead pass (`pulp_wars-w49.13`, 7r51): "bones" for a Skeleton.
  const word =
    open && target !== undefined
      ? rangedDefenseWordV7(
          base2,
          unitRoleRuleV7(context.view, target).defense2,
        )
      : "";
  if (preview.fortificationLevel <= 0) return open ? ` (${word})` : "";
  return ` (${halfV7(base2)}${open ? ` ${word}` : ""} + fort ${preview.fortificationLevel})`;
}

function combatTextV7(
  preview: Readonly<Record<string, unknown>> & {
    readonly attackerId: number;
    readonly targetUnitId: number;
    readonly attack2: number;
    readonly defense2: number;
    readonly defenseBonusNumerator: number;
    readonly defenseBonusDenominator: number;
    readonly fortificationLevel: number;
    readonly damageToDefender: number;
    readonly damageToAttacker: number;
    readonly defenderDies: boolean;
    readonly attackerDies: boolean;
    readonly retaliation: boolean;
    readonly noRetaliationReason: string | null;
    readonly attacksRemaining: number;
    readonly push: string;
    readonly advances: boolean;
  },
  context: TextContextV7,
  hp: { readonly attacker: number | null; readonly defender: number | null },
): string {
  const after = (current: number | null, damage: number): string =>
    current === null
      ? ""
      : ` (hp ${current}->${Math.max(0, current - damage)})`;
  const parts = [
    `deals ${preview.damageToDefender}${after(hp.defender, preview.damageToDefender)}${preview.defenderDies ? " KILLS" : ""}`,
    preview.retaliation
      ? `takes ${preview.damageToAttacker}${after(hp.attacker, preview.damageToAttacker)}${preview.attackerDies ? " ATTACKER DIES" : ""}`
      : // The ninth unit (`pulp_wars-w49.17`, 7r55): a Shock Field hits the
        // attacker without a retaliation.
        `no retaliation${preview.noRetaliationReason === null ? "" : ` (${preview.noRetaliationReason})`}${preview.damageToAttacker > 0 ? `, takes ${preview.damageToAttacker} from the Shock Field${after(hp.attacker, preview.damageToAttacker)}${preview.attackerDies ? " ATTACKER DIES" : ""}` : ""}`,
    `atk ${halfV7(preview.attack2)} vs def ${halfV7(preview.defense2)}${defenseBreakdownTextV7(preview, context)}${preview.defenseBonusNumerator === preview.defenseBonusDenominator ? "" : ` x${preview.defenseBonusNumerator}/${preview.defenseBonusDenominator}`}`,
  ];
  // Tuning 5 (`pulp_wars-w49.4`): Overrun has no budget, so no count is
  // shown ("attacks left 1" never changed); the line says what the kill
  // earns.
  // Correction pass of tuning 8 (`pulp_wars-w49.11`): the chain needs the
  // advance (RULESET_7_CURRENT.md section 13.4, Overrun: "after the unit
  // kills and advances"). A kill of a unit on a tile the attacker cannot
  // enter, or of a unit that rises in place, ends it, and the line says so.
  const overrunner =
    context.view.units.find((unit) => unit.id === preview.attackerId) ??
    context.before?.units.find((unit) => unit.id === preview.attackerId);
  if (preview.overrunAdvance === true && preview.defenderDies)
    parts.push("Overrun: advances and may attack again after this kill");
  else if (
    preview.defenderDies &&
    !preview.attackerDies &&
    overrunner !== undefined &&
    unitRoleRuleV7(context.view, overrunner).abilities.includes("OVERRUN")
  )
    parts.push("Overrun ends: it does not advance after this kill");
  if (preview.push !== "BLOCKED") parts.push(`push ${preview.push}`);
  // The giants' signatures (`pulp_wars-w49.30`): Crushing Shove, the Siege
  // Hammer, and the Glacial Smash.
  if (preview.crush !== undefined && preview.crush !== "NONE") {
    const attacker =
      context.view.units.find((unit) => unit.id === preview.attackerId) ??
      context.before?.units.find((unit) => unit.id === preview.attackerId);
    const target =
      context.view.units.find((unit) => unit.id === preview.targetUnitId) ??
      context.before?.units.find((unit) => unit.id === preview.targetUnitId);
    const behind =
      attacker === undefined || target === undefined
        ? null
        : crushBehindTileV7(attacker.at, target.at);
    const blocker =
      behind === null
        ? undefined
        : context.view.units.find(
            (unit) =>
              unit.id !== preview.targetUnitId &&
              unit.at.x === behind.x &&
              unit.at.y === behind.y,
          );
    const collision = Number(preview.collisionDamage ?? 0);
    parts.push(
      `crushes for ${String(preview.crushDamage)}${collision > 0 && blocker !== undefined ? ` (and ${collision} to ${context.memory.tag(blocker.id)})` : preview.crush === "UNKNOWN_BEHIND_FOG" ? " (a unit behind it is unknown)" : ""}`,
    );
  }
  if (preview.siegeHammer === true)
    parts.push(
      `SIEGE HAMMER (fortification ignored${preview.wallsDestroyed === true ? "; tears the city's Walls down for good" : ""})`,
    );
  if (preview.glacialSmash === true)
    parts.push("GLACIAL SMASH (shatters at 8 hp or less)");
  // Tuning 2 (7r47): whether the attacker takes the target's tile (after a
  // kill, or following a Charge! push); a ranged unit never does.
  // A preview names the tile; a resolved exchange (no HP given) does not.
  const target =
    hp.defender === null ? null : context.memory.position(preview.targetUnitId);
  if (preview.advances)
    parts.push(`advances${target === null ? "" : ` to ${xyV7(target)}`}`);
  else if (advanceCombatNotesV7(preview).length > 0) parts.push("stays");
  const extra = compactFieldsV7(preview, context, COMBAT_BASE_KEYS_V7, true);
  if (extra !== "") parts.push(extra);
  return parts.join(" | ");
}

/**
 * The Goblin pass, correction (`pulp_wars-w49.12`): a Kaboom's preview as
 * the units its chain hits and nothing else (it printed every unit on the
 * board).
 */
function kaboomTextV7(
  preview: ReturnType<typeof previewKaboomV7>,
  context: TextContextV7,
): string {
  if (preview === null) return "no public preview";
  const parts: string[] = [];
  for (const explosion of preview.explosions) {
    const hits = explosion.results.map(
      (result) =>
        `${result.unitId === null ? "a rising" : context.memory.tag(result.unitId)}${result.friendly ? " YOURS" : ""} -${result.damage}${result.dies ? " DIES" : ""}`,
    );
    parts.push(
      `${explosion.wave === 1 ? "blast" : `wave ${explosion.wave} (${context.memory.tag(explosion.unitId)} explodes)`} ${explosion.damage} at ${xyV7(explosion.at)}: ${hits.length === 0 ? "hits nobody" : hits.join(", ")}`,
    );
  }
  const totals = preview.totals;
  parts.push(
    `enemy ${totals.hostileDamage} damage, ${totals.hostileKills} kills; yours ${totals.friendlyDamage} damage, ${totals.friendlyKills} kills${totals.plunderCoins > 0 ? `; Plunder +${totals.plunderCoins}` : ""}`,
  );
  if (preview.touchesUnexplored)
    parts.push("the blast may reach unexplored tiles");
  parts.push("this unit dies");
  return parts.join(" | ");
}

const EXPLOSION_SKIP_V7: ReadonlySet<string> = new Set([
  "attackerId",
  "targetUnitId",
]);

function unlockTextV7(
  unlock: TechnologyUnlockV7,
  faction: FactionIdV7,
): string {
  switch (unlock.kind) {
    case "COMMAND": {
      const basic = (
        BASIC_ECONOMIC_ACTIONS_V7 as Readonly<
          Record<
            string,
            | {
                readonly cost: number;
                readonly population: number;
                readonly populationCategory: string;
                readonly terrain: string;
                readonly resource: string | null;
              }
            | undefined
          >
        >
      )[unlock.command];
      if (basic !== undefined)
        return `cmd ${unlock.command} (${basic.cost}c, +${basic.population} ${basic.populationCategory.toLowerCase()} pop, on ${basic.terrain.toLowerCase()}${basic.resource === null ? "" : `+${basic.resource.toLowerCase()}`})`;
      const spatial = (
        SPATIAL_ECONOMIC_ACTIONS_V7 as Readonly<
          Record<string, { readonly cost: number } | undefined>
        >
      )[unlock.command];
      return spatial === undefined
        ? `cmd ${unlock.command}${
            unlock.command === "BLAST_MOUNTAIN"
              ? ` (${BLAST_MOUNTAIN_UNLOCK_TEXT_V7})`
              : unlock.command === "BUILD_FIELD_DEFENSE"
                ? ` (${FIELD_DEFENSE_UNLOCK_TEXT_V7}; 3c, built before moving on a tile of your territory)`
                : unlock.command === "HIRE"
                  ? // The Dinosaur pass: a Dinosaur Market hires a dinosaur
                    // hatched.
                    ` (${hireUnlockTextV7(faction === "DINOSAUR" ? DINOSAUR_HIRE_NOTE_V7 : null)})`
                  : unlock.command === "PILLAGE"
                    ? ` (${pillageUnlockTextV7(effectiveRoleRuleV7("RAIDER", faction).abilities.includes("ESCAPE") ? effectiveRoleRuleV7("RAIDER", faction).label : null)})`
                    : ""
          }`
        : unlock.command === "BUILD_MARKET"
          ? `cmd ${unlock.command} (${spatial.cost}c; a Market pays 2 or 3 Coins every turn: 1, plus 1 for each family of buildings beside it (farms, timber, metal), 3 at most; ${MARKET_PLACEMENT_TEXT_V7})`
          : `cmd ${unlock.command}${factionBuildCommandV7(unlock.command, faction) === null ? "" : ` "${factionBuildCommandV7(unlock.command, faction)?.name ?? ""}"`} (${spatial.cost}c, output by neighbours; it can only be built next to at least one building that feeds it)`;
    }
    case "UNIT_ROLE": {
      const rule = effectiveRoleRuleV7(unlock.role, faction);
      return `unit ${rule.label} [${unlock.role}] ${rule.cost === null ? "not trainable" : `${rule.cost}c`} ${roleStatsV7(rule, faction)}`;
    }
    case "RESOURCE_REVEAL":
      return `reveals ${unlock.resources.join(",").toLowerCase()}`;
    // Tuning 1 (7r46): the tech card's sentences for the changed effects.
    case "MELEE_FIELD_DEMOLITION":
      return `${BREACH_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    case "LAND_TRADE_INCOME":
      return `${landTradeUnlockTextV7(unlock.coins)} [${unlock.kind}]`;
    // The Goblin pass: Plunder in a sentence.
    case "PLUNDER":
      return `Plunder: +${unlock.coins} Coins for each enemy unit your units or blasts kill [${unlock.kind}]`;
    // The Martian pass (`pulp_wars-w49.14`): the Martian unlocks in the
    // sentences of the technology card.
    case "BRAIN_SUPPORT":
      return `${BRAIN_SUPPORT_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    case "FORCE_FIELDS":
      return `${FORCE_FIELDS_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    case "HEAT_SINKS":
      return `${HEAT_SINKS_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    case "DISINTEGRATOR":
      return `${DISINTEGRATOR_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    // The Dinosaur pass (`pulp_wars-w49.15`): the Dinosaur unlocks in the
    // sentences of the technology card.
    case "NESTING":
      return `${nestingUnlockTextV7()} [${unlock.kind}]`;
    case "WALLBREAKER":
      return `${WALLBREAKER_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    // The Cultists (`pulp_wars-mch9.4`).
    case "SUMMONER_SUPPORT":
      return `${SUMMONER_SUPPORT_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    case "OFFERING":
      return `${OFFERING_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    default: {
      if (unlock.kind === "FOREST_COVER")
        return `${FOREST_COVER_UNLOCK_TEXT_V7} [${unlock.kind}]`;
      if (unlock.kind === "FOREST_MARCH")
        return `${FOREST_MARCH_UNLOCK_TEXT_V7} [${unlock.kind}]`;
      const fields = Object.entries(unlock)
        .filter(([key]) => key !== "kind")
        .map(([key, value]) => `${key}=${String(value)}`);
      return `${unlock.kind}${fields.length === 0 ? "" : `(${fields.join(" ")})`}`;
    }
  }
}

function economicTextV7(view: PlayerViewV7, command: CommandV7): string {
  const result = previewEconomicV7(view, command);
  if (!result.ok)
    return command.kind === "BUILD_ROAD"
      ? "cost 2c | what it does to your road links is not previewed while part of the map is unexplored"
      : "no exact public preview";
  const preview = result.preview;
  const parts = [`cost ${preview.cost}c`];
  for (const entry of preview.populationDeltaByCity) {
    const city = view.cities.find((candidate) => candidate.id === entry.cityId);
    parts.push(
      `pop ${signedV7(entry.delta)} c${entry.cityId}${city === undefined ? "" : ` (${city.population}/${city.level + 1} -> ${city.population + entry.delta}/${city.level + 1} at L${city.level})`}`,
    );
  }
  for (const entry of preview.coinIncomeDeltaByCity)
    parts.push(`income ${signedV7(entry.delta)}/turn c${entry.cityId}`);
  if (preview.levelsReached.length > 0)
    parts.push(`LEVEL UP to ${preview.levelsReached.join(",")}`);
  for (const change of preview.outputTransitions)
    parts.push(
      `${change.improvement.toLowerCase()}@${xyV7(change.at)} ${change.measure === "POPULATION" ? "pop" : "coins"} ${change.before}->${change.after} (${change.change.toLowerCase()})`,
    );
  if (preview.resourceRestored !== null)
    parts.push(`restores ${preview.resourceRestored.toLowerCase()}`);
  if (preview.capitalRoadConnected) parts.push("connects to the capital");
  return parts.join(" | ");
}

function describeCommandV7(
  view: PlayerViewV7,
  command: CommandV7,
  context: TextContextV7,
): string {
  const unit =
    "unitId" in command
      ? view.units.find((candidate) => candidate.id === command.unitId)
      : undefined;
  const generic = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const text = compactValueV7("preview", value, context);
    return text === null ? "" : ` | ${text}`;
  };
  switch (command.kind) {
    case "MOVE":
    case "DISEMBARK": {
      const to =
        command.kind === "MOVE"
          ? command.path[command.path.length - 1]
          : command.at;
      if (to === undefined) return "move";
      const near = hostileNearV7(view, to, command.unitId);
      const via =
        command.kind === "MOVE" && command.path.length > 1
          ? ` via ${command.path.slice(0, -1).map(xyV7).join(">")}`
          : "";
      // The Dinosaur pass, correction: what a Charge! after this Move
      // would have (the run-up is decided by the Move, before the attack).
      const mover = view.units.find(
        (candidate) => candidate.id === command.unitId,
      );
      let charge = "";
      if (
        command.kind === "MOVE" &&
        mover !== undefined &&
        mover.ownerId === view.viewer.id &&
        mover.form === "LAND" &&
        !mover.activation.moved &&
        unitRoleRuleV7(view, mover).abilities.includes("LINEBREAKER")
      ) {
        const runUp = Math.min(
          technologyCapabilitiesV7(
            view.viewer.researchedTechs,
            view.viewer.faction,
          ).runUpTiles,
          command.path.length,
        );
        const bonus2 = unitRoleMechanicsV7(view, mover).runUpBonus2 * runUp;
        charge = ` | run-up ${runUp} ${runUp === 1 ? "tile" : "tiles"}: Charge! +${bonus2 / 2} Attack${near
          .map((other) => {
            const damage = publicProjectedDamageForPolicyV7(
              view,
              mover,
              other,
              other.at,
              { bonusAttack2: bonus2 },
            );
            return `; on ${context.memory.tag(other.id)} about ${damage} (hp ${other.hp}->${Math.max(0, other.hp - damage)})${damage >= other.hp ? " KILLS" : ""}`;
          })
          .join("")}`;
      }
      // The giants' signatures (`pulp_wars-w49.30`): an Overstride's trample.
      const trampled =
        command.kind === "MOVE"
          ? (previewTrampleV7(view, command.unitId, command.path) ?? [])
          : [];
      const trample =
        trampled.length === 0
          ? ""
          : ` | tramples ${trampled.map((entry) => `${context.memory.tag(entry.unitId)} -${entry.damage}${entry.shieldDamage > 0 ? ` (shield -${entry.shieldDamage})` : ""}${entry.dies ? " KILLS" : ""}`).join(", ")}`;
      return `${command.kind === "MOVE" ? "move" : "disembark"} to ${xyV7(to)} (${tileBriefV7(view, to)})${via}${near.length === 0 ? "" : ` | next to hostile ${near.map((other) => context.memory.tag(other.id)).join(" ")}`}${charge}${trample}`;
    }
    case "ATTACK": {
      const target = view.units.find(
        (candidate) => candidate.id === command.targetUnitId,
      );
      const preview = queryCombatPreviewV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      const head = `attack ${context.memory.tag(command.targetUnitId)}${target === undefined ? "" : ` @${xyV7(target.at)}`}`;
      if (preview === null) return `${head} | no public preview`;
      const explosions = previewAttackExplosionsV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      const blast =
        explosions === null
          ? ""
          : compactFieldsV7(
              explosions as unknown as Record<string, unknown>,
              context,
              EXPLOSION_SKIP_V7,
              true,
            );
      // The Martian pass, correction: a whole Force Field holds.
      const holds = martianCombatLinesV7(view, preview).notes.includes(
        FORCE_FIELD_HOLDS_V7,
      );
      return `${head}: ${combatTextV7(preview as never, context, {
        attacker: unit?.hp ?? null,
        defender: target?.hp ?? null,
      })}${holds ? ` | ${FORCE_FIELD_HOLDS_V7}` : ""}${
        unit !== undefined &&
        target !== undefined &&
        packHuntAttack2V7(view, view.units, unit, target, view.huntedThisTurn) >
          0
          ? ` | ${packHuntPreviewLineV7()} (in the numbers)`
          : ""
      }${blast === "" ? "" : ` | explosions ${blast}`}`;
    }
    case "CAPTURE": {
      const city =
        unit === undefined
          ? undefined
          : view.cities.find((candidate) => sameV7(candidate.at, unit.at));
      const where = unit === undefined ? "" : ` @${xyV7(unit.at)}`;
      return city === undefined
        ? `capture the settlement${where} (a neutral village becomes your level-1 city)`
        : `capture city ${cityTagV7(view, city.id)}${where} from ${seatNameV7(view, city.ownerId)} (L${city.level}${city.isCapital ? ", its capital" : ""})`;
    }
    case "RECOVER": {
      const amount = queryIdleRecoveryV7(view).find(
        (entry) => entry.unitId === command.unitId,
      )?.amount;
      return `recover${amount === undefined ? "" : ` +${amount} hp`} (ending the turn idle heals the same amount)`;
    }
    case "PROMOTE":
      return `promote to veteran: max hp +${PROMOTION_HP_V7} and a full heal`;
    case "WAIT":
      return "mark the unit as handled (no effect on the game)";
    case "TOSS_COIN":
      return "toss a Coin into the Wishing Well (1c, once per player per match): nothing, +5 Coins, a full heal, or the land around the Well revealed";
    case "DISBAND":
      // The Martian pass, correction: on a controlled unit it is Release.
      return view.mindControlled.some(
        (entry) => entry.unitId === command.unitId,
      )
        ? "RELEASE the mind-controlled unit: it returns to its owner where it stands (no Coins); the Brain is free for another"
        : "disband the unit (frees its city slot; the refund is in the result)";
    case "PILLAGE":
      return unit === undefined
        ? "pillage the improvement under the unit"
        : `pillage (${tileBriefV7(view, unit.at)}): destroys the improvement, +${PILLAGE_COINS_V7} Coins${unitRoleRuleV7(view, unit).abilities.includes("ESCAPE") ? "; this unit may still move afterwards (Escape)" : ""}`;
    case "BUILD_FIELD_DEFENSE":
      return `build a Field Defense on this tile (3c): +${FIELD_DEFENSE_FORTIFICATION_LEVELS_V7} Defense for the unit standing here (a siege shot is made against it and then destroys it; a Breach ignores and destroys it; it never raises what the defender hits back with) | the unit keeps its move and its action`;
    case "RALLY": {
      // Goblin explosions and Berserk (`pulp_wars-w49.35`): the Orc
      // Warboss's Berserk replaced WAAAGH!.
      if (
        unit !== undefined &&
        unitRoleMechanicsV7(view, unit).rallyEffect === "BERSERK"
      ) {
        const count = view.units.filter((target) =>
          isRallyTargetV7(view, unit, target),
        ).length;
        return `berserk: ${count} own ${count === 1 ? "unit" : "units"} within ${unitRoleMechanicsV7(view, unit).rallyRadius} that ${count === 1 ? "has" : "have"} not moved get +${BERSERK_MOVE_BONUS_V7} move and ignore enemy zones of control until the end of the turn (still never through a unit)`;
      }
      return unit !== undefined && unitRoleMechanicsV7(view, unit).rallyCools
        ? "psychic command: inspires own units beside it (+1 Attack on their next attack); the Brain is then Cooling and cannot command next turn"
        : "rally: inspires own units in reach (bonus on their next attack)";
    }
    case "TEND_WOUNDED":
      return `tend wounded${generic(previewTendWoundedV7(view, command.unitId))}`;
    case "WAIL":
      return `wail${generic(previewWailV7(view, command.unitId))}`;
    case "KABOOM":
      return `kaboom | ${kaboomTextV7(previewKaboomV7(view, command.unitId), context)}`;
    case "RAISE_DEAD":
      return `raise dead${generic(previewRaiseDeadV7(view, command.unitId))}`;
    case "DEVOUR":
      return `devour${generic(previewDevourV7(view, command.unitId))}`;
    case "HATCH":
      return `hatch ${context.memory.tag(command.eggUnitId)}${generic(previewHatchV7(view, command.unitId, command.eggUnitId))}`;
    case "BEAM_DOWN":
      return `beam ${context.memory.tag(command.passengerUnitId)} down to ${xyV7(command.to)}${generic(previewBeamDownV7(view, command.unitId, command.passengerUnitId))}`;
    case "MIND_CONTROL":
      return `mind control ${context.memory.tag(command.targetUnitId)}${generic(previewMindControlV7(view, command.unitId, command.targetUnitId))}`;
    case "TRACTOR_BEAM":
      return `tractor beam ${context.memory.tag(command.targetUnitId)}${generic(previewTractorBeamV7(view, command.unitId, command.targetUnitId))}`;
    case "THROW_BOLAS":
      return `bolas ${context.memory.tag(command.targetUnitId)}${generic(previewBolasV7(view, command.unitId, command.targetUnitId))}`;
    case "COLD_SNAP":
      return `cold snap: freeze every enemy next to her${generic(previewColdSnapV7(view, command.unitId))}`;
    // Ice Folk Freeze (`pulp_wars-w49.37`).
    case "FROST_BOLT":
      return `frost bolt ${context.memory.tag(command.targetUnitId)}${generic(previewFrostBoltV7(view, command.unitId, command.targetUnitId))}`;
    case "STAMPEDE": {
      const preview = previewStampedeV7(view, command.unitId, command.at);
      const hits =
        preview === null
          ? []
          : preview.hits.map(
              (entry) =>
                `${context.memory.tag(entry.unitId)} -${entry.damage}${entry.shieldDamage > 0 ? ` (shield -${entry.shieldDamage})` : ""}${entry.dies ? " KILLS" : ""}`,
            );
      return `stampede to ${xyV7(command.at)}: ${hits.length === 0 ? "hits no visible unit" : hits.join(", ")} | each survivor is shoved aside; a unit that cannot be shoved stops it | no retaliation; it does not attack this turn`;
    }
    case "FREEZE":
      return `freeze from ${xyV7(command.at)}${generic(previewFreezeV7(view, command.unitId, command.at))}`;
    case "BOARD":
      return `board ${context.memory.tag(command.targetUnitId)}${generic(previewBoardV7(view, command.unitId, command.targetUnitId))}`;
    case "TUNNEL":
      return `tunnel to ${xyV7(command.to)}${generic(previewTunnelV7(view, command))}`;
    case "BOMB_RUN":
      return `bomb ${context.memory.tag(command.targetUnitId)} and land on ${xyV7(command.to)}${generic(previewBombRunV7(view, command))}`;
    case "ASSEMBLE":
      return `assemble on ${xyV7(command.to)}${generic(previewAssembleV7(view, command.unitId))}`;
    // Dwarf crowd control (`pulp_wars-w49.33`).
    case "WHIRL":
      return `whirl: hit every enemy next to it at once, nobody hits back${generic(previewWhirlV7(view, command.unitId))}`;
    case "BUILD_BARRICADE":
      return `build a barricade on ${xyV7(command.to)} (${BARRICADE_COST_V7}c, ${BARRICADE_HP_V7} HP, blocks every unit until destroyed)${generic(previewBuildBarricadeV7(view, command.unitId))}`;
    case "ATTACK_BARRICADE":
      return `attack the barricade on ${xyV7(command.at)}${generic(previewAttackBarricadeV7(view, command))}`;
    case "SUGAR_RUSH":
      return `sugar rush${generic(previewSugarRushV7(view, command.unitId))}`;
    case "REBAKE": {
      // The Candy redesign (`pulp_wars-jdb.12`): scoop from `from` (within
      // 2, from under any unit), bake next to the Confectioner on `at`.
      const option = previewRebakeV7(view, command.unitId)?.options.find(
        (entry) =>
          sameV7(entry.from, command.from) && sameV7(entry.at, command.at),
      );
      return `re-bake the Crumbs at ${xyV7(command.from)} onto ${xyV7(command.at)}${option === undefined ? "" : ` (${effectiveRoleRuleV7(option.role, view.viewer.faction).label}, ${option.cost}c, hp ${option.hp})`}`;
    }
    case "SUGAR_TOSS":
      return `sugar toss to ${context.memory.tag(command.targetUnitId)}${generic(previewSugarTossV7(view, command.unitId))}`;
    case "TOP_UP": {
      const target = previewTopUpV7(view, command.unitId)?.targets.find(
        (entry) => entry.unitId === command.targetUnitId,
      );
      return `top up ${context.memory.tag(command.targetUnitId)}${target === undefined ? "" : `: ${target.crashEnded ? "ends its Crash, " : ""}+${target.amount} hp to ${target.hpAfter}${target.cured ? ", cures it" : ""}`}`;
    }
    // The Cultists (`pulp_wars-mch9.4`, RULESET_7_CULTISTS.md section 5).
    case "SACRIFICE": {
      const preview = previewSacrificeV7(
        view,
        command.unitId,
        command.victimUnitId,
      );
      return `SACRIFICE your ${context.memory.tag(command.victimUnitId)}: it is removed for good (no kill for anyone, no Grave; its city slot frees)${preview === null ? "" : ` | +${preview.favour} Favour, its value (favour ${preview.favourAfter - preview.favour}->${preview.favourAfter})`} | not a Loss in the score, but it ends a flawless game`;
    }
    case "SEIZE": {
      const preview = previewSeizeV7(
        view,
        command.unitId,
        command.victimUnitId,
      );
      return `SEIZE ${context.memory.tag(command.victimUnitId)}: it dies, a kill for this unit (no Grave, no blast, no rising)${preview === null ? "" : ` | held down by ${context.memory.tag(preview.holderUnitId)} | +${preview.favour} Favour, twice its value (favour ${preview.favourAfter - preview.favour}->${preview.favourAfter})`}`;
    }
    case "OFFERING": {
      const preview = previewOfferingV7(view, command.cityId);
      const city = view.cities.find(
        (candidate) => candidate.id === command.cityId,
      );
      return `OFFERING${preview === null ? "" : `: the city gives up ${preview.population} population for good${city === undefined ? "" : ` (pop ${city.population}/${city.level + 1} -> ${preview.populationAfter}/${city.level + 1})`} | +${preview.favour} Favour (favour ${preview.favourAfter - preview.favour}->${preview.favourAfter})`} | uses the city action`;
    }
    // The channel (`pulp_wars-mch9.5`, RULESET_7_CULTISTS.md sections 6
    // and 8).
    case "SUMMON": {
      const preview = previewSummonV7(
        view,
        command.unitId,
        command.helperUnitId,
        command.at,
      );
      return `SUMMON a Horror at ${xyV7(command.at)} with ${context.memory.tag(command.helperUnitId)}${preview === null ? "" : `: hp ${preview.hp}, it cannot act this turn | -${preview.favour} Favour (favour ${preview.favourAfter + preview.favour}->${preview.favourAfter}) | both channel it: strands ${preview.strands}/${preview.control}`} | uses both units' actions`;
    }
    case "CHANNEL": {
      const preview = previewChannelV7(
        view,
        command.unitId,
        command.daemonUnitId,
      );
      return `CHANNEL ${context.memory.tag(command.daemonUnitId)}${preview === null ? "" : `: strands ${preview.strandsBefore}/${preview.control} -> ${preview.strandsAfter}/${preview.control}${preview.holds ? "" : " (still short: it is UNBOUND at your next turn start)"}`} | the strand breaks if this unit is hurt, moved, given a status, or taken before your next turn | uses its action`;
    }
    case "BEHOLD": {
      const preview = previewBeholdV7(view, command.unitId);
      return `BEHOLD: raise the idol until your next turn start${preview === null ? "" : ` | wards ${preview.wardedUnitIds.length === 0 ? "nobody yet" : preview.wardedUnitIds.map((unitId) => context.memory.tag(unitId)).join(", ")}`} (your robed cultists beside it keep their strands when they lose hp; a move, a status, or a kill still breaks them) | it drops when this unit is hit | uses its action (it does not channel this turn)`;
    }
    case "ANCHOR": {
      const preview = previewAnchorV7(
        view,
        command.unitId,
        command.cultistUnitId,
      );
      return `ANCHOR: grip ${context.memory.tag(command.cultistUnitId)}${preview === null ? "" : `, whose strand to ${context.memory.tag(preview.daemonUnitId)} counts three: strands ${preview.strandsBefore}/${preview.control} -> ${preview.strandsAfter}/${preview.control}`} | free, once a turn | all three go if that cultist is disrupted; the grip fails if this unit is moved, frozen, or given a status`;
    }
    case "BOO": {
      const preview = previewBooV7(view, command.unitId);
      return `BOO: every living unit beside it jumps one tile away, friend or foe${preview === null ? "" : ` | ${preview.results.map((entry) => `${context.memory.tag(entry.unitId)} ${entry.outcome === "JUMPS" ? `-> ${xyV7(entry.to)}` : entry.outcome === "STAYS" ? "stays (blocked)" : `-> ${xyV7(entry.to)}?`}${entry.holdsStrand && entry.outcome !== "STAYS" ? " (its strand BREAKS)" : ""}`).join(", ")}`} | no damage | in place of its attack`;
    }
    // The giants' signatures (`pulp_wars-w49.30`).
    case "SWALLOW": {
      const preview = previewSwallowV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      return `swallow ${context.memory.tag(command.targetUnitId)}${preview === null ? "" : ` (hp ${preview.hp}): it leaves the board; it loses ${DIGEST_DAMAGE_V7} hp at each of your turn starts (you heal what it loses) and comes out as your Zombie in ${preview.digestedAfterTurns} ${preview.digestedAfterTurns === 1 ? "turn" : "turns"}; if the giant dies first it comes back out where the giant stood`}`;
    }
    case "TOSS": {
      const preview = previewTossV7(
        view,
        command.unitId,
        command.passengerUnitId,
        command.at,
      );
      return `throw ${context.memory.tag(command.passengerUnitId)} to ${xyV7(command.at)} (${tileBriefV7(view, command.at)})${preview === null ? "" : `${preview.fieldDefenseDestroyed ? " | destroys the Field Defense there" : ""} | ${preview.passengerMayAct ? "the Goblin may still attack or Kaboom" : "the Goblin cannot act this turn"}`}`;
    }
    case "STOMP": {
      const preview = previewStompV7(view, command.unitId);
      const hits =
        preview === null
          ? []
          : preview.results.map(
              (entry) =>
                `${context.memory.tag(entry.unitId)} -${entry.damage}${entry.shieldDamage > 0 ? ` (shield -${entry.shieldDamage})` : ""}${entry.dies ? " KILLS" : ""}`,
            );
      return `thunder stomp: ${hits.length === 0 ? "hits no unit" : hits.join(", ")}${preview !== null && preview.fieldDefenses.length > 0 ? ` | smashes the Field Defense at ${preview.fieldDefenses.map(xyV7).join(" ")}` : ""} | no retaliation; the giant does not attack this turn`;
    }
    case "BREAK_OFF": {
      const preview = previewBreakOffV7(view, command.unitId);
      return `break off two Gingerbread Men (Toffee Troopers) at ${xyV7(command.tiles[0])} and ${xyV7(command.tiles[1])}${preview === null ? "" : ` (hp ${preview.trooperHp} each, homed to c${preview.cityId}, placed even when it is full) | the giant goes to hp ${preview.hpAfter}`}`;
    }
    case "TRAIN": {
      const rule = effectiveRoleRuleV7(command.role, view.viewer.faction);
      const city = view.cities.find(
        (candidate) => candidate.id === command.cityId,
      );
      const slots = city === undefined ? null : citySlotsV7(view, city);
      const cost = trainingCostV7(view, command.cityId, command.role);
      return `train ${rule.label} for ${cost}c (coins ${view.viewer.coins}->${view.viewer.coins - cost}) | ${roleStatsV7(rule, view.viewer.faction)}${slots === null ? "" : ` | city slots ${slots.used}/${slots.capacity} before`} | uses the city action`;
    }
    case "TRAIN_NAVAL": {
      const rule = effectiveRoleRuleV7(command.role, view.viewer.faction);
      return `build ${rule.label} at ${xyV7(command.at)} (base ${rule.cost ?? "?"}c, a Shipyard takes 2 off) | ${roleStatsV7(rule)}`;
    }
    case "HIRE": {
      // Tuning 3 (`pulp_wars-w49.3`): Commerce, a Market hires.
      const rule = effectiveRoleRuleV7(command.role, view.viewer.faction);
      const city = view.cities.find(
        (candidate) => candidate.id === command.cityId,
      );
      const slots = city === undefined ? null : citySlotsV7(view, city);
      const cost = publicHireCostV7(view, command.cityId, command.role) ?? 0;
      return `hire ${rule.label} on the Market at ${xyV7(command.at)} for ${cost}c, 1.5x its price (coins ${view.viewer.coins}->${view.viewer.coins - cost}) | ${roleStatsV7(rule, view.viewer.faction)}${slots === null ? "" : ` | city slots ${slots.used}/${slots.capacity} before (a hire may go 1 above the limit)`} | does not use the city action; the unit arrives spent | rule: the hired unit stands on the Market tile, so this Market hires again only when the tile is empty`;
    }
    case "BLAST_MOUNTAIN": {
      // Tuning 3: the blast is an explosion; its exact public preview.
      const blast = previewBlastMountainV7(view, command.at);
      const hits =
        blast === null
          ? []
          : blast.explosions.flatMap((explosion) =>
              explosion.results.map(
                (entry) =>
                  `${entry.unitId === null ? "a risen unit" : context.memory.tag(entry.unitId)} -${entry.damage}${entry.shieldDamage > 0 ? ` (shield -${entry.shieldDamage})` : ""}${entry.dies ? " KILLS" : ""}${explosion.cause === "BLAST" ? "" : " (chain)"}`,
              ),
            );
      const blastTile = tileAtV7(view, command.at);
      const ore =
        blastTile?.explored === true && blastTile.resource === "ORE"
          ? ` | WARNING ${BLAST_ORE_WARNING_V7}`
          : "";
      const foreign =
        blastTile?.explored === true &&
        blastTile.territoryOwnerId !== view.viewer.id
          ? ` (coins ${view.viewer.coins}->${view.viewer.coins - BLAST_MOUNTAIN_COST_V7}; not your territory, so no population)`
          : "";
      return `blast mountain at ${xyV7(command.at)} (${tileBriefV7(view, command.at)}) | ${economicTextV7(view, command)}${foreign}${ore} | BLAST ${BLAST_MOUNTAIN_DAMAGE_NOTE_V7}: ${hits.length === 0 ? "hits no visible unit" : hits.join(", ")}${blast === null || blast.setterUnitId === null ? "" : ` | ${context.memory.tag(blast.setterUnitId)} ${BLAST_MOUNTAIN_SETTER_NOTE_V7}`}${blast?.touchesUnexplored === true ? " | part of the area is unexplored" : ""}`;
    }
    case "LAY_EGG": {
      const rule = effectiveRoleRuleV7(command.role, view.viewer.faction);
      return `lay a ${rule.label} egg at ${xyV7(command.at)}${generic(previewLayEggV7(view, command.cityId, command.role))}`;
    }
    case "LAND_GRANT": {
      const grant = queryLandGrantPreviewV7(view, command.cityId);
      const cost = grant?.cost ?? LAND_GRANT_MINIMUM_COST_V7;
      const claim = grant?.tiles.length ?? 0;
      // The Undead pass, correction: the price as charged (it read "2c per
      // tile, at least 6c" since tuning 5 made it 1 Coin a tile).
      return `Land Grant for ${cost}c (${LAND_GRANT_COST_PER_TILE_V7}c per tile, at least ${LAND_GRANT_MINIMUM_COST_V7}c; coins ${view.viewer.coins}->${view.viewer.coins - cost}): the city claims the ${claim} neutral tiles of its 5x5 area that you have explored; unexplored tiles are not claimed and not charged | once per city | uses the city action`;
    }
    case "CHOOSE_CITY_REWARD": {
      const special =
        command.reward === "JUGGERNAUT"
          ? `a free ${effectiveRoleRuleV7("JUGGERNAUT", view.viewer.faction).label} (this city's giant, offered at every level from ${REWARD_UNIT_LEVEL_V7}; it may stand above the unit limit)`
          : command.reward === "MILITIA"
            ? `${MILITIA_FIGHTERS_V7[view.viewer.faction] === 1 ? "one free" : "two free"} ${effectiveRoleRuleV7("FIGHTER", view.viewer.faction).label}${MILITIA_FIGHTERS_V7[view.viewer.faction] === 1 ? "" : "s"} at the city (a reward unit may stand above the unit limit)`
            : command.reward === "SURVEY" &&
                SURVEY_RAIDERS_V7[view.viewer.faction] === 1
              ? `Scouts: ${scoutsRewardTextV7(effectiveRoleRuleV7("RAIDER", view.viewer.faction).label)} (${effectiveRoleRuleV7("RAIDER", view.viewer.faction).label}; it fills a unit slot of this city, and may stand above the unit limit)`
              : (REWARD_TEXT_V7[command.reward] ?? command.reward);
      return `reward for city ${cityTagV7(view, command.cityId)} reaching level ${command.reachedLevel}: ${special}`;
    }
    case "RESEARCH": {
      const node = safeTechTreeV7(view)?.nodes.find(
        (candidate) => candidate.id === command.tech,
      );
      if (node === undefined) return `research ${command.tech}`;
      return `research ${techNameV7(view.viewer.faction, node.id)} T${node.tier} for ${node.cost}c (coins ${view.viewer.coins}->${view.viewer.coins - node.cost}) | unlocks: ${node.effects.length === 0 ? "nothing listed" : node.effects.map((effect) => unlockTextV7(effect, view.viewer.faction)).join("; ")}`;
    }
    case "BUILD_MONUMENT": {
      const result = previewMonumentV7(view, command);
      return `build the ${command.achievement} monument at ${xyV7(command.at)}${result.ok ? ` | city c${result.preview.cityId} pop +${result.preview.populationAdded}${result.preview.levelsReached.length > 0 ? ` | LEVEL UP to ${result.preview.levelsReached.join(",")}` : ""} | free, one per city, uses the empty tile` : ""}`;
    }
    case "END_TURN":
      return "end the turn (use the end command)";
    default:
      return `${command.kind.toLowerCase().replaceAll("_", " ")} at ${xyV7(command.at)} (${tileBriefV7(view, command.at)}) | ${economicTextV7(view, command)}`;
  }
}

function safeTechTreeV7(
  view: PlayerViewV7,
): ReturnType<typeof queryTechnologyTreeV7> | null {
  // The query needs a city; a seat that lost its last city has no tree.
  return ownCitiesV7(view).length === 0 ? null : queryTechnologyTreeV7(view);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

interface EventTextV7 {
  /** Lines to print. */
  readonly lines: readonly string[];
  /** Milestones for the journal. */
  readonly notes: readonly string[];
}

const SILENT_EVENT_KINDS_V7 = new Set([
  "TURN_ENDED",
  "INCOME_PREVIEWED",
  "CITY_ECONOMY_CHANGED",
  "SEA_NETWORK_CHANGED",
  "UNIT_WAITED",
]);

function eventTextV7(
  event: PlayerEventV7,
  context: TextContextV7,
  ownCommand: boolean,
): EventTextV7 {
  const me = context.view.viewer.id;
  const lines: string[] = [];
  const notes: string[] = [];
  if (SILENT_EVENT_KINDS_V7.has(event.kind)) return { lines, notes };
  switch (event.kind) {
    case "TURN_STARTED":
      if (event.playerId === me)
        lines.push(`-- your turn starts: coins ${event.coins} --`);
      break;
    case "INCOME_AWARDED":
      lines.push(
        `INCOME ${seatLabelV7(context.view, event.playerId)} +${event.totalCoins} (${event.cities.map((entry) => `c${entry.cityId} +${entry.coins}`).join(", ")})`,
      );
      break;
    case "TILES_REVEALED":
      if (event.playerId === me) {
        // The Undead hand pass at 7r55 (`pulp_wars-w49.20`): what is worth
        // walking to among them (two testers each missed a village that a
        // line of coordinates had shown them).
        const found: string[] = [];
        for (const at of event.tiles) {
          const tile = tileAtV7(context.view, at);
          const site = tile?.explored === true ? tile.site : null;
          if (site !== null) found.push(`${site.toLowerCase()} ${xyV7(at)}`);
          if (context.view.treasureChests.some((chest) => sameV7(chest, at)))
            found.push(`chest ${xyV7(at)}`);
          const curiosity = context.view.curiosities.find((entry) =>
            sameV7(entry.at, at),
          );
          if (curiosity !== undefined)
            found.push(`${curiosity.kind} ${xyV7(at)}`);
        }
        lines.push(
          `REVEALED ${event.tiles.length} tiles: ${event.tiles.slice(0, 16).map(xyV7).join(" ")}${event.tiles.length > 16 ? " ..." : ""}${found.length === 0 ? "" : ` | among them: ${found.join(", ")}`}`,
        );
      }
      break;
    case "UNIT_MOVED": {
      const from = context.memory.position(event.unitId);
      lines.push(
        `MOVE ${context.memory.tag(event.unitId)} ${from === null ? "" : `${xyV7(from)}>`}${event.path.map(xyV7).join(">")}`,
      );
      // Tuning 8 (`pulp_wars-w49.11`): a unit that ends on the Fountain is
      // told what it does (it prints nothing for a unit at full HP).
      const end = event.path.at(-1);
      if (
        ownCommand &&
        end !== undefined &&
        context.view.curiosities.some(
          (entry) => entry.kind === "FOUNTAIN" && sameV7(entry.at, end),
        )
      )
        lines.push(
          `  on the Fountain of Youth @${xyV7(end)}: a land unit that starts your turn here heals up to ${FOUNTAIN_HEAL_V7} HP (nothing for a unit at full HP)`,
        );
      break;
    }
    case "FOUNTAIN_HEALED":
      lines.push(
        `FOUNTAIN ${context.memory.tag(event.unitId)} @${xyV7(event.at)} healed +${event.amount} (hp ${event.hpAfter - event.amount}->${event.hpAfter})`,
      );
      break;
    case "COMBAT_RESOLVED": {
      const preview = event.preview;
      lines.push(
        `COMBAT ${context.memory.tag(preview.attackerId)} attacks ${context.memory.tag(preview.targetUnitId)}: ${combatTextV7(preview as never, context, { attacker: null, defender: null })}`,
      );
      break;
    }
    case "COMBAT_SPLASH_DAMAGE":
      // Damage to own units from a source the seat does not see (tuning 6:
      // the unit an unseen attacker hit directly is listed too).
      for (const entry of event.splash) {
        const hp =
          context.before?.units.find((unit) => unit.id === entry.unitId)?.hp ??
          null;
        lines.push(
          `HIT_UNSEEN ${context.memory.tag(entry.unitId)} @${xyV7(entry.at)} takes ${entry.damage} from a source you do not see${hp === null ? "" : ` (hp ${hp}->${Math.max(0, hp - entry.damage)})`}${entry.shieldDamage > 0 ? ` shield -${entry.shieldDamage}` : ""}${entry.dies ? " DIES" : ""}`,
        );
      }
      break;
    case "UNIT_DIED": {
      const owner = context.memory.owner(event.unitId);
      lines.push(`DIED ${context.memory.tag(event.unitId)} (${event.cause})`);
      notes.push(
        owner === me
          ? `LOST ${context.memory.tag(event.unitId)} (${event.cause})`
          : `${ownCommand ? "KILLED" : "SAW DIE"} ${context.memory.tag(event.unitId)} (${event.cause})`,
      );
      break;
    }
    // The Cultists (`pulp_wars-mch9.4`): the offerings and the Favour.
    case "UNIT_SACRIFICED":
      lines.push(
        `SACRIFICED ${context.memory.tag(event.victimUnitId)} @${xyV7(event.at)} by ${context.memory.tag(event.unitId)}: it left the board (no grave, no kill) for +${event.favour} Favour`,
      );
      if (event.playerId !== me)
        notes.push(`SAW SACRIFICE ${context.memory.tag(event.victimUnitId)}`);
      break;
    case "UNIT_SEIZED":
      lines.push(
        `SEIZED ${context.memory.tag(event.victimUnitId)} @${xyV7(event.at)} by ${context.memory.tag(event.unitId)} (held by ${context.memory.tag(event.holderUnitId)}) for +${event.favour} Favour`,
      );
      break;
    case "OFFERING_MADE":
      lines.push(
        `OFFERING ${cityTagV7(context.view, event.cityId)} @${xyV7(event.at)} of ${seatLabelV7(context.view, event.playerId)}: -${event.population} population for +${event.favour} Favour`,
      );
      break;
    case "FAVOUR_GAINED":
      lines.push(
        `FAVOUR ${seatLabelV7(context.view, event.playerId)} +${event.amount} from ${FAVOUR_SOURCE_LABELS_V7[event.source]} (now ${event.favour})`,
      );
      if (event.playerId === me && event.source === "MARTYR")
        notes.push(`MARTYR +${event.amount} Favour (now ${event.favour})`);
      break;
    // The channel (`pulp_wars-mch9.5`).
    case "FAVOUR_SPENT":
      lines.push(
        `FAVOUR ${seatLabelV7(context.view, event.playerId)} -${event.amount} for ${FAVOUR_PURPOSE_LABELS_V7[event.purpose]} (now ${event.favour})`,
      );
      break;
    case "DAEMON_SUMMONED":
      lines.push(
        `SUMMONED a ${event.role === "HORROR" ? "Horror" : event.role} ${context.memory.tag(event.daemonUnitId)} @${xyV7(event.at)} hp ${event.hp} by ${context.memory.tag(event.unitId)} and ${context.memory.tag(event.helperUnitId)}`,
      );
      if (event.playerId !== me)
        notes.push(`SAW SUMMONING ${context.memory.tag(event.daemonUnitId)}`);
      break;
    case "STRAND_FORMED":
      lines.push(
        `STRAND ${context.memory.tag(event.unitId)} channels ${context.memory.tag(event.daemonUnitId)}`,
      );
      break;
    case "STRAND_BROKEN":
      lines.push(
        `STRAND BROKEN ${context.memory.tag(event.unitId)} -> ${context.memory.tag(event.daemonUnitId)}: ${DISRUPTION_CAUSE_LABELS_V7[event.cause]}`,
      );
      if (event.playerId === me)
        notes.push(
          `STRAND BROKEN ${context.memory.tag(event.unitId)} (${DISRUPTION_CAUSE_LABELS_V7[event.cause]})`,
        );
      break;
    case "IDOL_RAISED":
      lines.push(`IDOL RAISED by ${context.memory.tag(event.unitId)}`);
      break;
    case "IDOL_DROPPED":
      lines.push(
        `IDOL DROPPED ${context.memory.tag(event.unitId)}: ${event.cause === "EXPIRED" ? "its turn is over" : DISRUPTION_CAUSE_LABELS_V7[event.cause]}`,
      );
      break;
    case "ANCHOR_GRIPPED":
      lines.push(
        `ANCHOR ${context.memory.tag(event.unitId)} grips ${context.memory.tag(event.cultistUnitId)} (its strand counts three)`,
      );
      break;
    case "ANCHOR_BROKEN":
      lines.push(
        `ANCHOR BROKEN ${context.memory.tag(event.unitId)} lost its grip on ${context.memory.tag(event.cultistUnitId)}: ${DISRUPTION_CAUSE_LABELS_V7[event.cause]}`,
      );
      break;
    case "UNITS_SCARED":
      lines.push(
        `BOO by ${context.memory.tag(event.unitId)} @${xyV7(event.at)}: ${event.results.length === 0 ? "nobody you see" : event.results.map((entry) => `${context.memory.tag(entry.unitId)} ${entry.to === null ? "stays" : `${xyV7(entry.from)}->${xyV7(entry.to)}`}`).join(", ")}`,
      );
      break;
    case "DAEMON_UNBOUND":
      lines.push(
        `UNBOUND ${context.memory.tag(event.unitId)} of ${seatLabelV7(context.view, event.summonerPlayerId)}: strands ${event.strands}/${event.control} at its turn start; it is gone`,
      );
      if (event.summonerPlayerId === me)
        notes.push(
          `UNBOUND ${context.memory.tag(event.unitId)} (strands ${event.strands}/${event.control})`,
        );
      break;
    case "UNIT_DISBANDED": {
      // Tuning 7 (`pulp_wars-w49.10`): a unit another seat disbands in
      // your sight is reported (it used to vanish without a line).
      const at = context.memory.position(event.unitId);
      lines.push(
        event.playerId === me
          ? `DISBANDED ${context.memory.tag(event.unitId)}${at === null ? "" : ` @${xyV7(at)}`} for +${event.coinDelta}c`
          : `DISBANDED ${context.memory.tag(event.unitId)}${at === null ? "" : ` @${xyV7(at)}`} by its owner: it left the board (no grave, no kill)`,
      );
      if (event.playerId !== me)
        notes.push(`SAW DISBAND ${context.memory.tag(event.unitId)}`);
      break;
    }
    case "TECH_RESEARCHED":
      lines.push(
        `RESEARCHED ${seatLabelV7(context.view, event.playerId)} ${event.tech} for ${event.cost}c`,
      );
      if (event.playerId === me)
        notes.push(
          `RESEARCHED ${techNameV7(context.view.viewer.faction, event.tech)} (${event.cost}c)`,
        );
      break;
    case "CITY_CAPTURED": {
      const city = context.view.cities.find(
        (candidate) => candidate.id === event.cityId,
      );
      // The Undead pass (`pulp_wars-w49.13`): a capture is told to every
      // seat, but a city the seat has not explored is not named (its id
      // was printed; the fog test met one once an Undead AI seat took a
      // village in round 3).
      const text = `CITY_CAPTURED ${city === undefined ? "a city out of your sight" : `${cityTagV7(context.view, event.cityId)} @${xyV7(city.at)}`} by ${seatLabelV7(context.view, event.to)} from ${event.from === null ? "neutral" : seatLabelV7(context.view, event.from)}`;
      lines.push(text);
      notes.push(text);
      break;
    }
    case "CITY_LEVELED_UP": {
      const city = context.view.cities.find(
        (candidate) => candidate.id === event.cityId,
      );
      lines.push(
        `CITY_LEVELED_UP ${cityTagV7(context.view, event.cityId)} to level ${event.level}`,
      );
      if (city?.ownerId === me)
        notes.push(
          `LEVEL ${cityTagV7(context.view, event.cityId)} reached ${event.level}`,
        );
      break;
    }
    case "UNIT_TRAINED": {
      // A hire (Commerce) is the same event on the Market's tile; a
      // trained land unit appears on the center.
      const home = context.view.cities.find(
        (candidate) => candidate.id === event.cityId,
      );
      const verb =
        home !== undefined &&
        (home.at.x !== event.at.x || home.at.y !== event.at.y)
          ? "HIRED"
          : "TRAINED";
      lines.push(
        `${verb} ${context.memory.tag(event.unitId)} ${verb === "HIRED" ? "at the Market of" : "in"} c${event.cityId} @${xyV7(event.at)} for ${event.cost}c`,
      );
      if (event.playerId === me)
        notes.push(
          `${verb} ${effectiveRoleRuleV7(event.role, context.view.viewer.faction).label} in c${event.cityId} (${event.cost}c)`,
        );
      break;
    }
    case "TREASURE_CAPTURED": {
      // The serialized reward literal `KNIGHT` means "the chest unit" for
      // every faction and round, so the line names the unit that came.
      const text =
        event.spawnedUnitId === null
          ? `TREASURE_CAPTURED by ${context.memory.tag(event.unitId)} at ${xyV7(event.at)}: +${event.coinDelta} Coins${event.knightFallback ? " (no free tile or unit slot for the chest unit)" : ""}`
          : `TREASURE_CAPTURED by ${context.memory.tag(event.unitId)} at ${xyV7(event.at)}: granted ${context.memory.tag(event.spawnedUnitId)}${event.spawnedAt === null ? "" : ` at ${xyV7(event.spawnedAt)}`}${event.homeCityId === null ? "" : ` home c${event.homeCityId}`}`;
      lines.push(text);
      if (event.playerId === me) notes.push(text);
      break;
    }
    // The Undead pass, correction (`pulp_wars-w49.13`): a Captain's cure
    // of a unit you bit or plagued (the tags vanished without a line).
    case "WOUNDED_TENDED": {
      const mine =
        context.view.units.find((unit) => unit.id === event.captainId)
          ?.ownerId === me ||
        context.before?.units.find((unit) => unit.id === event.captainId)
          ?.ownerId === me;
      if (mine) {
        lines.push(
          `${event.kind} ${compactFieldsV7(event as unknown as Record<string, unknown>, context)}`.trimEnd(),
        );
        break;
      }
      for (const result of event.results) {
        const cured = [
          ...(result.curedBitten ? ["the bite"] : []),
          ...(result.curedPlague ? ["the Plague"] : []),
        ];
        if (cured.length > 0)
          lines.push(
            `CURED: ${context.memory.tag(event.captainId)} cured ${cured.join(" and ")} of ${context.memory.tag(result.unitId)}`,
          );
      }
      break;
    }
    default: {
      // Tuning 5: an own Scouts reward is printed under its name.
      // The Martian pass, correction: `CITY_REWARD_QUEUED` names no
      // player (it printed SURVEY beside the id SCOUTS); the city's owner
      // decides.
      const scouts =
        (event.kind === "CITY_REWARD_CHOSEN"
          ? event.playerId === me
          : event.kind === "CITY_REWARD_QUEUED" &&
            context.view.cities.some(
              (city) => city.id === event.cityId && city.ownerId === me,
            )) && SURVEY_RAIDERS_V7[context.view.viewer.faction] === 1;
      const raw = `${event.kind} ${compactFieldsV7(event as unknown as Record<string, unknown>, context)}`;
      const text = scouts
        ? raw.replace(
            /\bSURVEY\b/g,
            `SCOUTS (free ${effectiveRoleRuleV7("RAIDER", context.view.viewer.faction).label})`,
          )
        : raw;
      lines.push(text.trimEnd());
      const mine = "playerId" in event && event.playerId === me;
      if (
        event.kind === "PLAYER_ELIMINATED" ||
        event.kind === "MATCH_ENDED" ||
        (mine &&
          (event.kind === "ACHIEVEMENT_UNLOCKED" ||
            event.kind === "MONUMENT_BUILT" ||
            event.kind === "CITY_REWARD_CHOSEN" ||
            event.kind === "LAND_GRANTED"))
      )
        notes.push(text.trimEnd());
    }
  }
  return { lines, notes };
}

// ---------------------------------------------------------------------------
// Applying commands
// ---------------------------------------------------------------------------

interface AppliedV7 {
  readonly state: GameStateV7;
  readonly lines: readonly string[];
  readonly notes: readonly string[];
}

/**
 * Applies one accepted command and returns what the playing seat observed.
 * `memory` carries the unit identities the seat already knew.
 */
function applyObservedV7(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
  viewerId: PlayerId,
  memory: UnitMemoryV7,
):
  | (AppliedV7 & { readonly accepted: true })
  | { readonly accepted: false; readonly reason: string } {
  const applied = applyCommandV7(state, actor, command);
  if (!applied.accepted)
    return {
      accepted: false,
      reason: `${applied.error.code}${Object.keys(applied.error.params).length === 0 ? "" : ` ${JSON.stringify(applied.error.params)}`}`,
    };
  const envelope = projectEventsV7(
    state,
    applied.state,
    viewerId,
    applied.events,
  );
  const afterView = viewForV7(applied.state, viewerId);
  // Newly trained or revealed units are named from the view after the
  // command; the positions used for "from" stay those before it.
  const positions = new UnitMemoryV7();
  const beforeView = viewForV7(state, viewerId);
  positions.remember(beforeView);
  memory.remember(afterView);
  const context: TextContextV7 = {
    view: afterView,
    before: beforeView,
    memory: {
      tag: (unitId) => memory.tag(unitId),
      owner: (unitId) => memory.owner(unitId),
      position: (unitId) => positions.position(unitId),
    },
  };
  const lines: string[] = [];
  const notes: string[] = [];
  for (const event of envelope.events) {
    const text = eventTextV7(event, context, actor === viewerId);
    lines.push(...text.lines);
    notes.push(...text.notes);
  }
  return { accepted: true, state: applied.state, lines, notes };
}

function activePlayerV7(state: GameStateV7): PlayerId {
  const active = state.turnOrder[state.activeSeatIndex];
  if (active === undefined) throw new TextPlayErrorV7("corrupt turn order");
  return active;
}

function journalRowV7(view: PlayerViewV7): JournalRoundV7 {
  const units: Record<string, number> = {};
  for (const unit of allOwnedUnitsV7(view, view.viewer.id)) {
    const label = unitLabelV7(view, unit);
    units[label] = (units[label] ?? 0) + 1;
  }
  return {
    round: view.round,
    coins: view.viewer.coins,
    income: totalIncomeV7(view),
    cities: ownCitiesV7(view).map((city) => ({
      id: city.id,
      level: city.level,
      population: city.population,
    })),
    units,
    techs: [...view.viewer.researchedTechs],
  };
}

/**
 * The AI seats play until the playing seat is active again or the match
 * ends: the browser controller's loop without time slicing.
 */
function playAiSeatsV7(
  session: SessionV7,
  memory: UnitMemoryV7,
): { readonly session: SessionV7; readonly lines: readonly string[] } {
  let state = session.state;
  const commands = [...session.commands];
  const notes: JournalNoteV7[] = [...session.journal.notes];
  const lines: string[] = [];
  const startRound = state.round;
  let acceptedThisTurn = 0;
  let currentActor: PlayerId | null = null;
  while (state.outcome === null && activePlayerV7(state) !== session.playerId) {
    const actor = activePlayerV7(state);
    if (actor !== currentActor) {
      currentActor = actor;
      acceptedThisTurn = 0;
      lines.push(
        `-- ${seatNameV7(viewForV7(state, session.playerId), actor)} plays (round ${state.round}) --`,
      );
    }
    if (acceptedThisTurn >= NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7)
      throw new TextPlayErrorV7("AI exceeded its per-turn command budget");
    const aiView = viewForV7(state, actor);
    let command: CommandV7 | null;
    try {
      command = chooseNormalTurnCommandV7(
        aiView,
        acceptedThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        chooseNormalCommandV7(aiView),
      );
    } catch (error) {
      throw new TextPlayErrorV7(
        `Normal AI failed for ${seatLabelV7(aiView, actor)}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    const encoded = command === null ? null : canonicalJson(command);
    if (
      command === null ||
      !queryPlayerCommandsV7(aiView).some(
        (candidate) => canonicalJson(candidate) === encoded,
      )
    )
      throw new TextPlayErrorV7("Normal AI produced no exact public command");
    const round = state.round;
    const applied = applyObservedV7(
      state,
      actor,
      command,
      session.playerId,
      memory,
    );
    if (!applied.accepted)
      throw new TextPlayErrorV7(
        `Normal AI command rejected: ${applied.reason}`,
      );
    state = applied.state;
    commands.push(command);
    acceptedThisTurn += 1;
    lines.push(...applied.lines);
    for (const text of applied.notes) notes.push({ round, text });
  }
  const view = viewForV7(state, session.playerId);
  const rounds =
    state.outcome === null && activePlayerV7(state) === session.playerId
      ? [...session.journal.rounds, journalRowV7(view)]
      : session.journal.rounds;
  const observed =
    lines.length === 0
      ? session.journal.observed
      : [...session.journal.observed, { round: startRound, lines }];
  return {
    session: withStateV7(session, state, commands, {
      rounds,
      notes,
      observed,
    }),
    lines,
  };
}

// ---------------------------------------------------------------------------
// new
// ---------------------------------------------------------------------------

function parseFactionsV7(source: string): readonly FactionIdV7[] {
  const factions = source.split(",").map((value): FactionIdV7 => {
    const normalized = value.trim().toUpperCase().replaceAll("-", "_");
    const id =
      normalized === "HUMAN"
        ? "ORIGINAL"
        : normalized === "ICE"
          ? "ICE_FOLK"
          : normalized;
    if (!(FACTION_IDS_V7 as readonly string[]).includes(id))
      throw new TextPlayErrorV7(
        `unknown faction "${value}": use ${FACTION_IDS_V7.map((faction) => (faction === "ORIGINAL" ? "original (human)" : faction.toLowerCase())).join(", ")}`,
      );
    return id as FactionIdV7;
  });
  if (factions.length < 2 || factions.length > FACTION_IDS_V7.length)
    throw new TextPlayErrorV7(
      `--factions needs 2 to ${FACTION_IDS_V7.length} seats, seat 0 first`,
    );
  return factions;
}

function parseMapTypeV7(source: string): MapTypeV7 {
  const value = source.toUpperCase().replaceAll("-", "_");
  if (
    value === "DRY_LAND" ||
    value === "PANGEA" ||
    value === "CONTINENTS" ||
    value === "ARCHIPELAGO" ||
    value === "LAKES"
  )
    return value;
  throw new TextPlayErrorV7(
    "--map must be dry-land, pangea, continents, archipelago, or lakes",
  );
}

function integerFlagV7(args: ArgsV7, name: string, fallback: number): number {
  const raw = args.flags.get(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value))
    throw new TextPlayErrorV7(`--${name} must be an integer`);
  return value;
}

/**
 * The staged positions of `lab` (`pulp_wars-w49.3`, tuning 4): the hidden
 * mirror missions of `src/engine/v7/missions/lab-human.ts`, with what each
 * is for.
 */
const BREAKTHROUGH_LAB_TEXT_V7 =
  "hold a prepared line against numbers: you hold the only crossing between two lakes, eight tiles wide (Guards on two Mountains and two Field Defenses, Champions in four Forests, three Marksmen and two Catapults behind, a walled capital two tiles back whose land reaches the line, 14 units, 22c in hand, every unit slot full, 12c a turn); the AI attacks with twice your units' value and three level-4 cities: 13c in its first turn, 15c in its second and 19c a turn from its third (two free Monuments, Workshops and Markets)";

export const TEXT_PLAY_LABS_V7: Readonly<Record<string, string>> = {
  LAB_SIEGE:
    "assault a walled level-4 capital: Guard on the center, three Guards in front (Forest cover, a Field Defense), a Marksman and two Catapults behind, a Mountain touching the screen; you have 6 units, 60c and the prerequisites of Sawmilling, Chivalry, Explosives and Pathfinding (FIELDCRAFT; 16c the first) and of Engineering (14c; Armoury, METALLURGY, after it gives Champions)",
  LAB_BACKLINE:
    "the AI advances with four Catapults and three Marksmen behind two Guards, a Champion and two Fighters; you have three Knights, two Raiders, a Champion, two Fighters, two Marksmen, a Catapult and 40c; both sides can train Champions (Armoury)",
  LAB_LATE:
    "the late game: six road-linked cities a side, 17 technologies, armies at the unit limit (a Champion in every front city), 100c each; two of your cities have a Barracks",
  // Tuning 6 (`pulp_wars-w49.6`): the Normal AI's bar, one lab per attacker.
  LAB_BREAKTHROUGH: `${BREAKTHROUGH_LAB_TEXT_V7}; the attacker is the Human AI (Champions, Marksmen, Catapults, Knights, Raiders)`,
  LAB_BREAKTHROUGH_GOBLIN: `${BREAKTHROUGH_LAB_TEXT_V7}; the attacker is the Goblin AI (Orc Brutes, Bomb Chuckers, Rocket Carts, Scrap Buggies, Wolf Riders)`,
  LAB_BREAKTHROUGH_UNDEAD: `${BREAKTHROUGH_LAB_TEXT_V7}; the attacker is the Undead AI (Zombies, Banshees, Liches, Vampires, Ghouls)`,
  // The Goblin pass (`pulp_wars-w49.12`): the one lab played as the Goblins.
  LAB_GOBLIN_MID:
    "YOU PLAY THE GOBLINS in an even middle game against the Human AI: five cities a side (a level-4 capital, two level-3, two level-2 at the front, 15c a turn each); you can train every Goblin unit (thirteen technologies; the Ogre needs none more; Fortification, where the Orc Brute is, among them, so you can build Field Defense) and hold 6 Goblins, 4 Bomb Chuckers, 3 Wolf Riders, 3 Orc Brutes, a Warboss, 2 Rocket Carts and a Scrap Buggy, 35c in hand on the first turn and four free unit slots; the Humans hold 3 Champions, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards and 5 Fighters, a walled capital, and Forest cover",
  // The Undead pass (`pulp_wars-w49.13`): the one lab played as the Undead.
  LAB_UNDEAD_MID:
    "YOU PLAY THE UNDEAD in an even middle game against the Human AI: five cities a side (a level-4 capital, two level-3, two level-2 at the front, 15c a turn each); you can train every Undead unit (thirteen technologies; the Wight needs none more; Fortification, where the Zombie is, among them, so you can build Field Defense) and hold 4 Skeletons, 4 Zombies, 2 Ghouls, 2 Banshees, a Necromancer, 2 Liches and a Vampire, 35c in hand on the first turn and three free unit slots (the capital is full); the Humans hold 3 Champions, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards and 5 Fighters at the start (and 30c on their first turn, which buys more), a walled capital, and Forest cover; your units recover only in your own land; your Liches plague only once you research Pestilence",
  // The Martian pass (`pulp_wars-w49.14`): the one lab played as the
  // Martians, on land with Forest, Fertile Ground, and Ore.
  LAB_MARTIAN_MID:
    "YOU PLAY THE MARTIANS in an even middle game against the Human AI: five cities a side (a level-4 capital, two level-3, two level-2 at the front, 15c a turn each), every city with Forest and Fertile Ground in its land and the three larger ones with Ore and a Lumber Camp or two; you can train every Martian unit (thirteen technologies; the Shock Trooper needs none more) and hold 5 Grunts, 2 Shield Projectors, 2 Saucers, 2 Ray Gunners, a Brain, 2 Tripods and a Mothership (15 units), 35c in hand on the first turn and three free unit slots (the capital is full; a Mothership fills two); the Humans hold 3 Champions, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards and 5 Fighters (17 units) at the start (and 30c on their first turn, which buys more), a walled capital and a walled level-3 city, and Forest cover; you own Force Fields, where the Shield Projector is (units next to a Projector have Shield 4), and your Ray Gunners overheat until you research Heat Sinks",
  // The Dinosaur pass (`pulp_wars-w49.15`): the one lab played as the
  // Dinosaurs, on the same land.
  LAB_DINOSAUR_MID:
    "YOU PLAY THE DINOSAURS in an even middle game against the Human AI: five cities a side (a level-4 capital, two level-3, two level-2 at the front, 15c a turn each), every city with Forest and Fertile Ground in its land and the three larger ones with Ore and a Lumber Camp or two; you can produce every Dinosaur unit (thirteen technologies; the Stegosaurus too) and hold 3 Cavemen, 2 Raptors (one Big), 2 Spitters (one Big), 2 Ankylosauruses, a Shaman, 2 Triceratops (one Big) and a T-Rex Egg beside your capital, two turns from hatching, with the Shaman next to it (12 units and the Egg), 35c in hand on the first turn and eight free unit slots (three in the capital, two in the northern level-3 city, one in each other city; a Triceratops and a T-Rex fill two); the Humans hold 3 Champions, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards and 5 Fighters (17 units) at the start (and 30c on their first turn, which buys more), a walled capital and a walled level-3 city, and Forest cover; you own Nesting, where the Ankylosaurus is (one more unit slot in every city, Eggs with 10 HP), and not Wallbreaker (a Triceratops's run-up of two tiles)",
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the one lab played
  // as the Ice Folk, on the same land.
  LAB_ICE_FOLK_MID:
    "YOU PLAY THE ICE FOLK in an even middle game against the Human AI: five cities a side (a level-4 capital, two level-3, two level-2 at the front, 15c a turn each), every city with Forest and Fertile Ground in its land and the three larger ones with Ore and a Lumber Camp or two; you can train every Ice Folk unit (thirteen technologies) and hold 5 Yetis, 2 Sleds, 2 Snow Hunters, 2 Musk Oxen, an Ice Witch, 2 Mammoths, a Boulder Yeti and a Sabretooth (16 units), 35c in hand on the first turn and three free unit slots (two in the capital, one in the northern level-3 city); the Humans hold 3 Champions, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards and 5 Fighters (17 units) at the start (and 30c on their first turn, which buys more), a walled capital and a walled level-3 city, and Forest cover; you own Deep Winter, where the Musk Ox is (your Snow reaches two tiles beyond your cities' land, and Recover heals 6 in your land), and not Brittle (a Shatter at 4 HP or fewer)",
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): the one lab played as
  // the Dwarves, on the same land.
  LAB_DWARF_MID:
    "YOU PLAY THE DWARVES in an even middle game against the Human AI: five cities a side (a level-4 capital, two level-3, two level-2 at the front, 15c a turn each), every city with Forest and Fertile Ground in its land and the three larger ones with Ore and a Lumber Camp or two; you can train every Dwarf unit (thirteen technologies) and hold 5 Hammerers, 2 Gyrocopters, 2 Clockwork Gunners, 2 Steam Moles, an Engineer, 2 Steam Tanks, a Steam Cannon and a Whirligig (16 units), 35c in hand on the first turn and three free unit slots (two in the capital, one in the northern level-3 city); the Humans hold 3 Champions, 3 Marksmen, 2 Catapults, 2 Knights, 2 Guards and 5 Fighters (17 units) at the start (and 30c on their first turn, which buys more), a walled capital and a walled level-3 city, and Forest cover; you own Dig In, where the Steam Mole is (a Hammerer or a Mole that stands still beside one of your centers has Field Defense), Dive Bombing (bombs of 6) and Clockwork (an Engineer Assembles a Gunner), and not Blasting Charges",
};

function commandLabV7(args: ArgsV7): string {
  const name = (args.positionals[0] ?? "").toUpperCase().replaceAll("-", "_");
  const listing = Object.entries(TEXT_PLAY_LABS_V7).map(
    ([id, text]) => `  ${id}  ${text}`,
  );
  if (name === "")
    return [
      "LABS (lab --session S <LAB>): staged positions against the Normal AI, you move first; you play the Humans unless the lab says otherwise",
      ...listing,
    ].join("\n");
  const mission =
    TEXT_PLAY_LABS_V7[name] === undefined ? null : missionByIdV7(name);
  if (mission === null)
    throw new TextPlayErrorV7(
      `unknown lab "${args.positionals[0] ?? ""}"; the labs are:\n${listing.join("\n")}`,
    );
  const giant = args.switches.has("giant");
  if (giant && !LAB_GIANT_NAMES_V7.test(name))
    throw new TextPlayErrorV7(
      `--giant works with a *_MID lab or LAB_BREAKTHROUGH, not ${name}`,
    );
  const path = sessionPathV7(args);
  if (existsSync(path) && !args.switches.has("overwrite"))
    throw new TextPlayErrorV7(
      `${path} already exists; pass --overwrite to replace it`,
    );
  const setup = missionMatchSetupV7(mission);
  const created = setup === null ? null : createPlayableGameV7(setup);
  if (created === null || !created.ok)
    throw new TextPlayErrorV7(`the engine refused the lab ${name}`);
  const playerId = created.state.humanPlayerId;
  const initial = giant ? withLabGiantV7(created.state) : created.state;
  const base: SessionV7 = {
    format: TEXT_PLAY_SESSION_FORMAT_V7,
    version: TEXT_PLAY_SESSION_VERSION_V7,
    rulesetId: RULESET_7_ID,
    seat: 0,
    playerId,
    setup: created.state.setup,
    commands: [],
    state: initial,
    stateHash: canonicalHash(initial),
    journal: { rounds: [], notes: [], observed: [] },
    ...(giant ? { labGiant: true as const } : {}),
  };
  const memory = new UnitMemoryV7();
  memory.remember(viewForV7(base.state, playerId));
  const played = playAiSeatsV7(base, memory);
  saveSessionV7(path, played.session);
  return [
    `LAB ${name}: ${TEXT_PLAY_LABS_V7[name] ?? ""}${giant ? ` | --giant: your ${effectiveRoleRuleV7("JUGGERNAUT", initial.players.find((player) => player.id === playerId)?.faction ?? "ORIGINAL").label} stands at the front` : ""} | session ${path}`,
    ...played.lines,
    ...viewLinesV7(played.session, false),
  ].join("\n");
}

/** The labs `--giant` works with (`pulp_wars-w49.30`). */
const LAB_GIANT_NAMES_V7 = /^(LAB_[A-Z_]+_MID|LAB_BREAKTHROUGH)$/;

/**
 * The giants' signatures (`pulp_wars-w49.30`, RULESET_7_GIANTS.md section
 * 8): `lab --giant` places the human seat's reward giant (its faction's
 * `JUGGERNAUT`) at the front: on the free land tile it may stand on (no
 * unit, mound, chest, curiosity, or settlement site; not hostile territory)
 * that is nearest to a hostile unit without touching one (distance 2 or
 * more), then nearest to its own capital, then first in (y, x) order. It
 * has full HP, is homed to the capital, and is ready if the seat is active.
 * Only the session's first state changes, never the engine; the replay
 * places it the same way.
 */
function withLabGiantV7(state: GameStateV7): GameStateV7 {
  const owner = state.players.find(
    (player) => player.id === state.humanPlayerId,
  );
  if (owner === undefined) throw new TextPlayErrorV7("no human seat");
  const capital = state.cities.find(
    (city) => city.id === owner.originalCapitalCityId,
  );
  if (capital === undefined || capital.ownerId !== owner.id)
    throw new TextPlayErrorV7("the lab seat holds no capital");
  const rule = effectiveRoleRuleV7("JUGGERNAUT", owner.faction);
  const probe = {
    id: unitId(state.nextEntityId),
    ownerId: owner.id,
    role: "JUGGERNAUT" as const,
    form: "LAND" as const,
  };
  const hostiles = state.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.ownerId !== owner.id &&
      !arePlayersAlliedV7(state, owner.id, unit.ownerId),
  );
  const mode = unitMovementModeV7(state, probe);
  const distance = (left: CoordV7, right: CoordV7): number =>
    Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
  let best: { at: CoordV7; front: number; home: number } | null = null;
  for (const tile of state.board.tiles) {
    const at = tile.at;
    const territory =
      tile.territoryCityId === null
        ? null
        : (state.cities.find((city) => city.id === tile.territoryCityId)
            ?.ownerId ?? null);
    if (
      tile.biome === null ||
      tile.site !== null ||
      tile.terrain === "RIFT" ||
      (territory !== null && territory !== owner.id) ||
      (tile.terrain === "MOUNTAIN" &&
        mode === "GROUND" &&
        !unitIsMountainBornV7(state, probe) &&
        !owner.researchedTechs.includes("ENGINEERING")) ||
      tileOccupiedV7(state, at) ||
      state.treasureChests.some((chest) => sameV7(chest, at)) ||
      state.curiosities.some((item) => sameV7(item.at, at))
    )
      continue;
    const front = Math.min(
      Number.MAX_SAFE_INTEGER,
      ...hostiles.map((unit) => distance(unit.at, at)),
    );
    if (front < 2) continue;
    const home = distance(capital.at, at);
    if (
      best === null ||
      front < best.front ||
      (front === best.front && home < best.home)
    )
      best = { at, front, home };
  }
  if (best === null) throw new TextPlayErrorV7("no free tile for the giant");
  const active = state.turnOrder[state.activeSeatIndex] === owner.id;
  const giant: UnitStateV7 = {
    id: probe.id,
    ownerId: owner.id,
    homeCityId: capital.id,
    role: "JUGGERNAUT",
    form: "LAND",
    at: best.at,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: {
      moved: !active,
      movedPathLength: 0,
      attacked: !active,
      attacksUsed: active ? 0 : 1,
      tendedThisTurn: false,
      inspired: false,
      overrunActive: false,
      escapeAvailable: false,
      recovered: !active,
      captured: !active,
      handled: !active,
      specialActed: !active,
    },
  };
  const placed = parseGameStateV7(
    JSON.parse(
      JSON.stringify({
        ...state,
        nextEntityId: state.nextEntityId + 1,
        units: [...state.units, giant].sort(
          (left, right) => left.id - right.id,
        ),
        shields: withFullShieldsV7(state, state.shields, [giant]),
      }),
    ),
  );
  if (placed === null)
    throw new TextPlayErrorV7("the engine refused the lab giant");
  return placed;
}

/** " ai-head-start +10 Coins" for a setup with a head start, else "". */
function headStartTextV7(setup: MatchSetupV7): string {
  const coins = aiHeadStartCoinsV7(setup);
  return coins === 0 ? "" : ` ai-head-start +${coins} Coins`;
}

function commandNewV7(args: ArgsV7): string {
  const path = sessionPathV7(args);
  if (existsSync(path) && !args.switches.has("overwrite"))
    throw new TextPlayErrorV7(
      `${path} already exists; pass --overwrite to replace it`,
    );
  const factions = parseFactionsV7(
    args.flags.get("factions") ?? "original,undead",
  );
  const mapType = parseMapTypeV7(args.flags.get("map") ?? "dry-land");
  const seats = factions.length;
  const seat = integerFlagV7(args, "seat", 0);
  if (seat !== 0)
    throw new TextPlayErrorV7(
      "--seat must be 0: the engine's human seat is always seat 0 (its place in the turn order is drawn from the seed). Put the faction you want to play first in --factions.",
    );
  const allowed = allowedBoardSizesV7(mapType, seats);
  const size = integerFlagV7(
    args,
    "size",
    autoBoardSizeV7(seats, mapType) ?? allowed[0] ?? 0,
  );
  if (!seatCountAllowedV7(size, mapType, seats))
    throw new TextPlayErrorV7(
      `--size must be ${allowed.join(", ")} for ${seats} seats on ${mapType.toLowerCase()}`,
    );
  const curiositiesRaw = (args.flags.get("curiosities") ?? "on").toLowerCase();
  if (curiositiesRaw !== "on" && curiositiesRaw !== "off")
    throw new TextPlayErrorV7("--curiosities must be on or off");
  // Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section
  // 4.3): Domination by default, or the 30-round Perfection.
  const modeRaw = (args.flags.get("mode") ?? "domination").toLowerCase();
  if (modeRaw !== "domination" && modeRaw !== "perfection")
    throw new TextPlayErrorV7("--mode must be domination or perfection");
  // AI head start (`pulp_wars-w49.39`): the extra starting Coins of every
  // AI seat; 0 (the default) is no head start.
  const headStartRaw = args.flags.get("ai-head-start") ?? "0";
  const headStartCoins = AI_HEAD_START_COINS_V7.find(
    (coins) => String(coins) === headStartRaw,
  );
  if (headStartRaw !== "0" && headStartCoins === undefined)
    throw new TextPlayErrorV7("--ai-head-start must be 0, 5, 10, or 20");
  const setup: MatchSetupV7 = {
    rulesetId: RULESET_7_ID,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    seed: integerFlagV7(args, "seed", 1),
    width: size as BoardSizeV7,
    height: size as BoardSizeV7,
    aiCount: seats - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType,
    curiosities: curiositiesRaw === "on",
    gameMode: modeRaw === "perfection" ? "PERFECTION" : "DOMINATION",
    ...(headStartCoins === undefined
      ? {}
      : { aiHeadStart: { coins: headStartCoins } }),
    // A mirror match (Human against the Human AI, say): the engine's
    // tool-only path for repeated factions (`allowDuplicateFactionsV7`).
    ...(duplicateFactionV7(factions) === null
      ? {}
      : { allowDuplicateFactions: true as const }),
  };
  const created = createPlayableGameV7(setup);
  if (!created.ok)
    throw new TextPlayErrorV7(
      `the engine refused the setup: ${created.error.code}`,
    );
  const playerId = created.state.humanPlayerId;
  const base: SessionV7 = {
    format: TEXT_PLAY_SESSION_FORMAT_V7,
    version: TEXT_PLAY_SESSION_VERSION_V7,
    rulesetId: RULESET_7_ID,
    seat,
    playerId,
    setup: created.state.setup,
    commands: [],
    state: created.state,
    stateHash: canonicalHash(created.state),
    journal: { rounds: [], notes: [], observed: [] },
  };
  const memory = new UnitMemoryV7();
  memory.remember(viewForV7(base.state, playerId));
  // The AI seats ahead of the playing seat in the turn order move first;
  // then the first journal row is recorded.
  const played = playAiSeatsV7(base, memory);
  saveSessionV7(path, played.session);
  return [
    `NEW MATCH: ${mapType.toLowerCase()} ${size}x${size} seed ${setup.seed} curiosities ${curiositiesRaw}${headStartTextV7(setup)} | session ${path}`,
    ...played.lines,
    ...viewLinesV7(played.session, false),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// view
// ---------------------------------------------------------------------------

const TERRAIN_GLYPH_V7: Readonly<Record<string, string>> = {
  GRASS: ".",
  FOREST: "f",
  MOUNTAIN: "^",
  SHALLOW_WATER: "~",
  DEEP_WATER: "=",
  RIFT: "#",
};
const IMPROVEMENT_GLYPH_V7: Readonly<Record<string, string>> = {
  FARM: "F",
  LUMBER_CAMP: "L",
  MINE: "M",
  WINDMILL: "W",
  SAWMILL: "S",
  FORGE: "G",
  WORKSHOP: "K",
  MARKET: "$",
  MONUMENT: "O",
  PORT: "P",
  SHIPYARD: "Y",
};
const RESOURCE_GLYPH_V7: Readonly<Record<string, string>> = {
  FRUIT: "r",
  FERTILE_GROUND: "g",
  GAME: "a",
  ORE: "o",
  FISH: "h",
  PEARLS: "p",
  UNKNOWN_RESOURCE: "*",
};
const ROLE_CODE_V7: Readonly<Record<UnitRoleIdV7, string>> = {
  FIGHTER: "Fi",
  RAIDER: "Ra",
  MARKSMAN: "Mk",
  GUARD: "Gd",
  CAPTAIN: "Cp",
  CATAPULT: "Ct",
  KNIGHT: "Kn",
  JUGGERNAUT: "Jg",
  PATROL_BOAT: "Pb",
  BATTLESHIP: "Bs",
  SUBMARINE: "Sb",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Human heavy is the
  // Champion (`Sw`, the Swordsman, until 7r54). Every other faction's heavy
  // has its own code (`FACTION_ROLE_CODE_V7`).
  SWORDSMAN: "Ch",
};

/**
 * The Martian pass, correction (`pulp_wars-w49.14`): a Martian unit's own
 * map code (a Mothership read as a Human Knight, `Kn`, and a Tripod as a
 * Catapult, `Ct`).
 */
const MARTIAN_ROLE_CODE_V7: Readonly<Partial<Record<UnitRoleIdV7, string>>> = {
  FIGHTER: "Gr",
  RAIDER: "Sa",
  MARKSMAN: "RG",
  GUARD: "SP",
  CAPTAIN: "Br",
  CATAPULT: "Tr",
  KNIGHT: "Mo",
  JUGGERNAUT: "Co",
  // The ninth unit (7r55): the Shock Trooper.
  SWORDSMAN: "ST",
};
const MARTIAN_LEGEND_V7 =
  "  Martian units: Gr grunt Sa saucer RG ray gunner SP shield projector Br brain Tr tripod Mo mothership Co colossus ST shock trooper";
/**
 * The Dinosaur pass, correction (`pulp_wars-w49.15`): a Dinosaur unit's own
 * map code (a Triceratops read as a Human Catapult, `Ct`, an Ankylosaurus
 * as a Guard, a Spitter as a Marksman).
 */
const DINOSAUR_ROLE_CODE_V7: Readonly<Partial<Record<UnitRoleIdV7, string>>> = {
  FIGHTER: "Cv",
  RAIDER: "Rp",
  MARKSMAN: "Sp",
  GUARD: "Ak",
  CAPTAIN: "Sh",
  // The ninth unit (7r55): the Triceratops is the heavy line role and the
  // Stegosaurus the siege role.
  CATAPULT: "Sg",
  KNIGHT: "Tx",
  JUGGERNAUT: "Bo",
  SWORDSMAN: "Tc",
};
const DINOSAUR_LEGEND_V7 =
  "  Dinosaur units: Cv caveman Rp raptor Sp spitter Ak ankylosaurus Sh shaman Tc triceratops Sg stegosaurus Tx t-rex Bo brontosaurus";
/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55): the map codes of the units
 * added to (or moved inside) the rosters that otherwise print the shared
 * role codes: a Goblin `Ch` would read as a Champion and an Ice Folk `Gd`
 * as the Mammoth it was.
 */
const NINTH_UNIT_ROLE_CODE_V7: Readonly<
  Partial<Record<FactionIdV7, Readonly<Partial<Record<UnitRoleIdV7, string>>>>>
> = {
  UNDEAD: { SWORDSMAN: "Wi" },
  GOBLIN: { SWORDSMAN: "Og" },
  ICE_FOLK: { SWORDSMAN: "Mm", GUARD: "Ox" },
  DWARF: { SWORDSMAN: "Tk", KNIGHT: "Wh" },
  CANDY: { SWORDSMAN: "Jb" },
};
const NINTH_UNIT_LEGEND_V7: Readonly<Partial<Record<FactionIdV7, string>>> = {
  UNDEAD: "  Undead heavy: Wi wight",
  GOBLIN: "  Goblin heavy: Og ogre",
  ICE_FOLK: "  Ice Folk: Mm mammoth (the heavy) Ox musk ox (the defender)",
  DWARF: "  Dwarf: Tk steam tank (the heavy) Wh whirligig",
  CANDY: "  Candy heavy: Jb jawbreaker",
  // The Cultists (`pulp_wars-mch9.5`): the summoned Horror.
  CULT: "  Cult summoned: Ho horror (a daemon: its line shows strands/Control)",
};
function roleCodeV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  // The Cultists (`pulp_wars-mch9.5`): a summoned unit has its own code.
  if (unit.summoned === "HORROR") return "Ho";
  const faction = unitFactionV7(view, unit);
  return (
    (faction === "MARTIAN"
      ? MARTIAN_ROLE_CODE_V7[unit.role]
      : faction === "DINOSAUR"
        ? DINOSAUR_ROLE_CODE_V7[unit.role]
        : faction === NEUTRAL_KIND_V7
          ? undefined
          : NINTH_UNIT_ROLE_CODE_V7[faction]?.[unit.role]) ??
    ROLE_CODE_V7[unit.role]
  );
}

const LEGEND_V7 = [
  "LEGEND cell = terrain feature mark owner unit (7 chars), ??????? = unexplored. There is no re-fog: an explored tile shows everything on it.",
  "  terrain: . grass  f forest  ^ mountain  ~ shallow water  = deep water  # rift",
  "  feature: C capital  c city  v neutral village | F farm L lumber camp M mine W windmill S sawmill G forge K workshop $ market O monument P port Y shipyard | r fruit g fertile ground a game o ore h fish p pearls * hidden resource  - none",
  "  mark: ! treasure chest  & curiosity  B barricade  d field defense  + road  x grave  w Wight's marked Grave  i ice  m crumbs  - none | owner: seat digit of the territory, - neutral",
  "  unit: seat digit (N = neutral monster) + role code Fi fighter Ra raider Mk marksman Gd guard Cp captain Ct catapult Kn knight Ch champion (the heavy) Jg juggernaut Pb patrol boat Bs battleship Sb submarine, lowercase e- = egg, --- none",
];

/**
 * Step two of the Dwarf pass (`pulp_wars-w49.28`): what a mound's Mole
 * erupts for, from the public stats of its record (the owner's Blasting
 * Charges is public).
 */
function moundEruptionDamageV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  const dwarf = view.unitStats.find((entry) => entry.unitId === unit.id)?.dwarf;
  return dwarf === undefined ? "?" : String(dwarf.eruptionDamage);
}

function mapLinesV7(view: PlayerViewV7): readonly string[] {
  const { width, height } = view.board;
  const unitAt = new Map<string, PublicUnitV7>();
  for (const unit of view.units) unitAt.set(xyV7(unit.at), unit);
  const has = (list: readonly CoordV7[], at: CoordV7): boolean =>
    list.some((entry) => sameV7(entry, at));
  const lines: string[] = [];
  let header = "      ";
  for (let x = 0; x < width; x += 1) header += `x${String(x).padEnd(7)}`;
  lines.push(header.trimEnd());
  for (let y = 0; y < height; y += 1) {
    let row = `y${String(y).padEnd(3)} |`;
    for (let x = 0; x < width; x += 1) {
      const at = { x, y };
      const tile = tileAtV7(view, at);
      if (tile === undefined || !tile.explored) {
        row += "???????|";
        continue;
      }
      const feature =
        tile.site === "CAPITAL"
          ? "C"
          : tile.site === "CITY"
            ? "c"
            : tile.site === "VILLAGE"
              ? "v"
              : tile.improvement !== null
                ? (IMPROVEMENT_GLYPH_V7[tile.improvement] ?? "?")
                : tile.resource !== null
                  ? (RESOURCE_GLYPH_V7[tile.resource] ?? "?")
                  : "-";
      const mark = has(view.treasureChests, at)
        ? "!"
        : view.curiosities.some((entry) => sameV7(entry.at, at))
          ? "&"
          : barricadesOfV7(view).some((entry) => sameV7(entry.at, at))
            ? "B"
            : tile.fieldDefense
              ? "d"
              : tile.road
                ? "+"
                : wightGraveAtV7(view, at) !== null
                  ? "w"
                  : has(view.graves, at)
                    ? "x"
                    : view.ice.some((entry) => sameV7(entry.at, at))
                      ? "i"
                      : view.crumbs.some((entry) => sameV7(entry.at, at))
                        ? "m"
                        : "-";
      const owner =
        tile.territoryOwnerId === null
          ? "-"
          : seatLabelV7(view, tile.territoryOwnerId).slice(1);
      const unit = unitAt.get(xyV7(at));
      // Step two of the Dwarf pass (`pulp_wars-w49.28`): a mound (a
      // burrowed Steam Mole or its rider) is public and reserves its tile;
      // the map printed nothing there.
      const mound = view.burrowed.find((entry) => sameV7(entry.unit.at, at));
      const code =
        unit === undefined
          ? mound === undefined
            ? "---"
            : `${seatLabelV7(view, mound.unit.ownerId).replace("S", "")}##`
          : `${seatLabelV7(view, unit.ownerId).replace("S", "")}${unit.form === "EGG" ? "e-" : roleCodeV7(view, unit)}`;
      row += `${TERRAIN_GLYPH_V7[tile.terrain] ?? "?"}${feature}${mark}${owner}${code}|`;
    }
    lines.push(row);
  }
  return lines;
}

function statTotalV7(
  view: PlayerViewV7,
  unitId: number,
  id: string,
): string | null {
  const stat = view.unitStats
    .find((entry) => entry.unitId === unitId)
    ?.stats.find((entry) => entry.id === id);
  if (stat === undefined) return null;
  const value = stat.total.numerator / stat.total.denominator;
  return String(Math.round(value * 100) / 100);
}

function unitStatusV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  const parts: string[] = [];
  if (unit.form !== "LAND") parts.push(unit.form.toLowerCase());
  if (unit.veteran) parts.push("veteran");
  if (unit.kills > 0) parts.push(`kills ${unit.kills}`);
  if (unit.captureEligible) parts.push("can-capture-now");
  const shield = view.shields.find((entry) => entry.unitId === unit.id);
  if (shield !== undefined) parts.push(`shield ${shield.shield}`);
  // The Martian pass: a ray unit that is Cooling (its next ray is halved).
  if (
    view.cooling.some(
      (entry) => entry.unitId === unit.id && !entry.firedThisTurn,
    )
  )
    parts.push("cooling");
  const egg = view.eggs.find((entry) => entry.unitId === unit.id);
  if (egg !== undefined) parts.push(`hatches in ${egg.turnsRemaining}`);
  const plague = view.plagued.find((entry) => entry.unitId === unit.id);
  if (plague !== undefined) parts.push(`plagued ${plague.turnsRemaining}`);
  if (view.bitten.some((entry) => entry.unitId === unit.id))
    parts.push("bitten");
  const frozen = view.frozen.find((entry) => entry.unitId === unit.id);
  if (frozen !== undefined) parts.push(`frozen ${frozen.turnsLeft}`);
  // The Cultists' channel (`pulp_wars-mch9.5`): a daemon's strands against
  // its Control, a channeller's strand, a grip, a raised idol.
  const daemon = view.cult.daemons.find((entry) => entry.unitId === unit.id);
  if (daemon !== undefined)
    parts.push(
      `daemon: strands ${daemon.strands}/${daemon.control}${daemon.strands < daemon.control ? " (UNBOUND at its turn start)" : ""}`,
    );
  const strand = view.cult.strands.find(
    (entry) => entry.cultistUnitId === unit.id,
  );
  if (strand !== undefined)
    parts.push(
      `channels ${strand.daemonUnitId === null ? "a daemon you do not see" : `u${strand.daemonUnitId}`}`,
    );
  const grip = view.cult.grips.find(
    (entry) => entry.thingUnitId === unit.id || entry.cultistUnitId === unit.id,
  );
  if (grip !== undefined)
    parts.push(
      grip.thingUnitId === unit.id
        ? `grips u${grip.cultistUnitId}`
        : `gripped by u${grip.thingUnitId} (strand counts three)`,
    );
  if (view.cult.idols.includes(unit.id)) parts.push("idol raised");
  if (view.mindControlled.some((entry) => entry.unitId === unit.id))
    parts.push("mind-controlled");
  const rush = view.sugarRush.find((entry) => entry.unitId === unit.id);
  if (rush !== undefined) parts.push(rush.phase.toLowerCase());
  // The Candy redesign (`pulp_wars-jdb.12`): Stuck and Toothache.
  if (view.stuck.some((entry) => entry.unitId === unit.id))
    parts.push("stuck (one step)");
  if (view.toothache.some((entry) => entry.unitId === unit.id))
    parts.push("toothache (next attack -1)");
  if (view.monsters.some((entry) => entry.unitId === unit.id))
    parts.push("monster");
  for (const status of stats?.statuses ?? []) parts.push(status);
  return parts.join(", ");
}

function activationTextV7(unit: PublicUnitV7): string {
  const flags: string[] = [];
  const activation = unit.activation;
  // A unit that arrived this turn (trained, risen, a reward) has every
  // action spent.
  if (
    activation.moved &&
    activation.attacked &&
    activation.recovered &&
    activation.captured
  )
    return "spent";
  if (activation.moved) flags.push("moved");
  if (activation.attacked) flags.push("attacked");
  if (activation.recovered) flags.push("recovered");
  if (activation.captured) flags.push("captured");
  if (activation.specialActed) flags.push("acted");
  if (activation.inspired) flags.push("inspired");
  if (activation.escapeAvailable) flags.push("escape-move-left");
  if (activation.overrunActive) flags.push("overrun");
  if (activation.handled) flags.push("handled");
  return flags.length === 0 ? "fresh" : flags.join("+");
}

/**
 * Why an attack or a Field Defense is not offered for one of the viewer's
 * units on its turn, from the public facts the engine's command query
 * reads (`options --unit`). The first failed condition is named.
 */
function unitReasonLinesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: readonly OfferedV7[],
): string[] {
  if (unit.ownerId !== view.viewer.id || offered.length === 0) return [];
  const mine = offered.filter(
    (entry) => commandUnitIdV7(entry.command) === unit.id,
  );
  const rule = unitRoleRuleV7(view, unit);
  const activation = unit.activation;
  const primaryUsed =
    activation.attacked ||
    activation.recovered ||
    activation.captured ||
    activation.specialActed;
  const lines: string[] = [];
  if (
    rule.abilities.includes("ATTACK") &&
    !mine.some((entry) => entry.command.kind === "ATTACK")
  )
    lines.push(
      `no attack: ${
        activation.attacked
          ? "it has attacked this turn"
          : activation.moved && !rule.mayUsePrimaryActionAfterMove
            ? `a ${rule.label} cannot attack after it has moved this turn (it attacks only from where it started)`
            : primaryUsed
              ? "its action this turn is used"
              : "no visible hostile unit is in its range"
      }`,
    );
  if (
    view.viewer.researchedTechs.includes("FORTIFICATION") &&
    !mine.some((entry) => entry.command.kind === "BUILD_FIELD_DEFENSE")
  ) {
    const tile = tileAtV7(view, unit.at);
    const builders = UNIT_ROLE_IDS_V7.filter(
      (role) => unitRoleMechanicsV7(view, { ...unit, role }).buildsFieldDefense,
    ).map((role) => effectiveRoleRuleV7(role, view.viewer.faction).label);
    lines.push(
      `no fortify: ${
        !unitRoleMechanicsV7(view, unit).buildsFieldDefense
          ? `a ${rule.label} cannot build Field Defense${builders.length === 0 ? " (no unit of this faction can)" : ` (only ${builders.join(" and ")} can)`}`
          : unit.form !== "LAND"
            ? "only a unit on land builds Field Defense"
            : activation.moved
              ? "it has moved this turn (Field Defense is built before moving)"
              : primaryUsed
                ? "its action this turn is used"
                : tile?.explored !== true ||
                    tile.territoryOwnerId !== view.viewer.id
                  ? "the tile is not in your territory"
                  : tile.fieldDefense
                    ? "the tile already has a Field Defense"
                    : tile.biome === null || tile.terrain === "RIFT"
                      ? "Field Defense cannot stand on this tile"
                      : view.viewer.coins < 3
                        ? "it costs 3 Coins"
                        : "the engine does not offer it here"
      }`,
    );
  }
  return lines;
}

/**
 * Tuning 6 (`pulp_wars-w49.6`): a Monument costs nothing and adds
 * population (3 since the economy rejig, 7r54), and its offers used to be
 * one grouped line among the tile
 * actions. This says so in plain words, for every city or for one.
 */
function freeMonumentLinesV7(
  view: PlayerViewV7,
  offered: readonly OfferedV7[],
  cityId: number | null,
): string[] {
  const byAchievement = new Map<string, OfferedV7[]>();
  for (const entry of offered) {
    if (entry.command.kind !== "BUILD_MONUMENT") continue;
    if (cityId !== null && commandCityIdV7(view, entry.command) !== cityId)
      continue;
    const list = byAchievement.get(entry.command.achievement) ?? [];
    list.push(entry);
    byAchievement.set(entry.command.achievement, list);
  }
  const lines: string[] = [];
  for (const [achievement, entries] of byAchievement) {
    const cities = [
      ...new Set(entries.map((entry) => commandCityIdV7(view, entry.command))),
    ]
      .filter((id): id is number => id !== null)
      .map((id) => `c${id}`);
    const first = entries[0];
    if (first === undefined) continue;
    lines.push(
      `FREE MONUMENT ${achievement}: 0c, +${MONUMENT_POPULATION_V7} population in the city it is built in (one per achievement) | ${entries.length} tiles${cities.length === 0 ? "" : ` in ${cities.join(" ")}`} | e.g. ${first.id}`,
    );
  }
  return lines;
}

/**
 * Tuning 6 (`pulp_wars-w49.6`): what a visible enemy unit would deal to
 * one of yours, or what each visible enemy in reach would deal to this
 * unit. An estimate from public information: the tiles the enemy can hit
 * next turn (`queryThreatenedTilesV7`) and the damage formula on the public
 * stats, your unit standing where it stands now. It leaves out what
 * depends on the order of the enemy's turn (Gang Up, Rally, a blast).
 *
 * Tuning 7 (`pulp_wars-w49.10`): a unit that cannot attack after it moved
 * (a Zombie, an Orc Brute, a Guard, a Lich, a Catapult, a Rocket Cart)
 * counts only from where it stands; the list said "after moving into
 * range" for those too. Under your own unit a last line gives the worst
 * case: every listed attacker in turn, each on the HP the others leave.
 */
/**
 * The Martian pass, correction: the Shield a unit will have when the enemy
 * moves. Its Shield now; for the viewer's own unit with Force Fields (the
 * recharge at the end of its turn) its maximum, or 4 beside one of its
 * Shield Projectors.
 */
function shieldNextTurnV7(view: PlayerViewV7, unit: PublicUnitV7): number {
  const now = shieldOfV7(view.shields, unit.id);
  const maximum = unitShieldMaximumV7(view, unit);
  if (maximum <= 0 || unit.ownerId !== view.viewer.id) return now;
  const capabilities = unitCapabilitiesV7(
    view,
    unit,
    view.viewer.researchedTechs,
  );
  if (!capabilities.shieldsRechargeAtEndTurn) return now;
  const covered =
    capabilities.projectsForceField &&
    view.units.some(
      (other) =>
        other.id !== unit.id &&
        other.ownerId === unit.ownerId &&
        other.form === "LAND" &&
        chebyshevV7(other.at, unit.at) <= 1 &&
        (unitRoleRuleV7(view, other).abilities as readonly string[]).includes(
          "FORCE_FIELD",
        ),
    );
  return Math.max(now, covered ? FORCE_FIELD_SHIELD_V7 : maximum);
}

function threatEstimateLinesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): string[] {
  const mine = unit.ownerId === view.viewer.id;
  const pairs: { attacker: PublicUnitV7; defender: PublicUnitV7 }[] = [];
  if (mine) {
    for (const enemy of view.units)
      if (
        enemy.id !== unit.id &&
        !isNeutralOwnerV7(enemy.ownerId) &&
        arePlayersHostileV7(view, view.viewer.id, enemy.ownerId)
      )
        pairs.push({ attacker: enemy, defender: unit });
  } else if (
    !isNeutralOwnerV7(unit.ownerId) &&
    arePlayersHostileV7(view, view.viewer.id, unit.ownerId)
  )
    for (const own of allOwnedUnitsV7(view, view.viewer.id))
      pairs.push({ attacker: unit, defender: own });
  const rows: string[] = [];
  const held: string[] = [];
  const hits: {
    readonly attacker: PublicUnitV7;
    readonly damage: number;
    readonly direct: boolean;
  }[] = [];
  const reachByAttacker = new Map<number, readonly CoordV7[]>();
  for (const { attacker, defender } of pairs) {
    let reach = reachByAttacker.get(attacker.id);
    if (reach === undefined) {
      reach = queryThreatenedTilesV7(view, attacker.id);
      reachByAttacker.set(attacker.id, reach);
    }
    if (!reach.some((at) => sameV7(at, defender.at))) continue;
    const stats = view.unitStats.find((entry) => entry.unitId === attacker.id);
    const gap = chebyshevV7(attacker.at, defender.at);
    const direct =
      stats !== undefined &&
      gap >= stats.minimumRange &&
      gap <= stats.maximumRange;
    // A unit that cannot attack after it moved reaches only what stands
    // in its range now.
    if (!direct && !unitMayActAfterMoveV7(view, attacker)) {
      if (!mine) continue;
      held.push(
        `  ${unitTagV7(view, attacker)} @${xyV7(attacker.at)}: no attack on it next turn (it cannot attack after it moves; it is ${gap} tiles away)`,
      );
      continue;
    }
    // The Martian pass, correction (`pulp_wars-w49.14`): the hit is taken
    // from the Shield the unit will have (it printed "5 (hp 8->3)" for a
    // hit that cost 1 HP), a whole Force Field holds, and a Charge is
    // named as what it is: the enemy's research is private (a Saucer
    // without Raiding was credited with it).
    const raw = (charge: boolean): number =>
      publicProjectedDamageForPolicyV7(view, attacker, defender, defender.at, {
        maximumCharge: charge,
      });
    const shield = shieldNextTurnV7(view, defender);
    const through = (hit: number): number =>
      absorbHitV7(
        shield,
        defender.hp,
        hit,
        forceFieldHoldsV7(view, defender, shield),
      ).hpDamage;
    const plain = through(raw(false));
    const charged = direct ? plain : through(raw(true));
    const damage = plain;
    const chargeNote =
      charged === plain
        ? ""
        : `; ${charged} with Charge, if its owner has Raiding${charged >= defender.hp ? " (KILLS)" : ""}`;
    const shieldNote = shield > 0 ? `, after its Shield ${shield} absorbs` : "";
    rows.push(
      `  ${unitTagV7(view, attacker)} @${xyV7(attacker.at)} on ${unitTagV7(view, defender)} @${xyV7(defender.at)}: deals about ${damage} (hp ${defender.hp}->${Math.max(0, defender.hp - damage)})${damage >= defender.hp ? " KILLS" : ""}${shieldNote}${chargeNote}${direct ? "" : " after moving into range"}`,
    );
    hits.push({ attacker, damage: Math.max(plain, charged), direct });
  }
  if (pairs.length === 0) return [];
  // The worst case on an own unit: the attackers in turn, the hardest hit
  // first, each on the HP the earlier ones leave (a wounded unit defends
  // with less, so the sum of the single figures is too low).
  if (mine && hits.length >= 2) {
    let hp = unit.hp;
    let used = 0;
    let shieldLeft = shieldNextTurnV7(view, unit);
    for (const hit of [...hits].sort(
      (left, right) =>
        right.damage - left.damage || left.attacker.id - right.attacker.id,
    )) {
      if (hp <= 0) break;
      const blow = absorbHitV7(
        shieldLeft,
        hp,
        publicProjectedDamageForPolicyV7(
          view,
          hit.attacker,
          { ...unit, hp },
          unit.at,
          { maximumCharge: !hit.direct },
        ),
        forceFieldHoldsV7(view, { ...unit, hp }, shieldLeft),
      );
      shieldLeft -= blow.shieldDamage;
      hp -= blow.hpDamage;
      used += 1;
    }
    rows.push(
      `  COMBINED worst case: ${used === hits.length ? `all ${hits.length}` : `${used} of the ${hits.length}`} in turn deal about ${unit.hp - Math.max(0, hp)} (hp ${unit.hp}->${Math.max(0, hp)})${hp <= 0 ? " KILLS" : ""}`,
    );
  }
  rows.push(...held);
  return [
    "",
    mine
      ? "ENEMY ATTACKS ON IT NEXT TURN (estimate from public information; each attacker alone, then all of them)"
      : "WHAT IT WOULD DEAL TO YOUR UNITS NEXT TURN (estimate from public information)",
    ...(rows.length === 0
      ? [
          mine
            ? "  no visible enemy unit can reach it next turn"
            : "  it can reach none of your units next turn",
        ]
      : rows),
  ];
}

function unitLineV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  own: boolean,
  offered: readonly OfferedV7[],
  full: boolean,
): string {
  const stat = (id: string): string => statTotalV7(view, unit.id, id) ?? "?";
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  const range =
    stats === undefined
      ? "?"
      : stats.minimumRange > 1
        ? `${stats.minimumRange}-${stats.maximumRange}`
        : String(stats.maximumRange);
  const status = unitStatusV7(view, unit);
  const parts = [
    `u${unit.id}`,
    own ? "" : seatLabelV7(view, unit.ownerId),
    // The Cultists: a summoned unit is named by its summoned role (its
    // `role` is a mechanical one that says nothing).
    `${unitLabelV7(view, unit)} [${unit.summoned ?? unit.role}]`,
    `@${xyV7(unit.at)}`,
    `hp ${unit.hp}/${unit.maxHp}`,
    `atk ${stat("ATTACK")} def ${stat("DEFENSE")} mov ${stat("MOVE")} rng ${range}`,
  ].filter((part) => part !== "");
  if (own) {
    const count = offered.filter(
      (entry) => commandUnitIdV7(entry.command) === unit.id,
    ).length;
    parts.push(
      `home ${unit.homeCityId === null ? "-" : `c${unit.homeCityId}`}`,
    );
    parts.push(activationTextV7(unit));
    parts.push(`options ${count}`);
    // Step two of the Dwarf pass (`pulp_wars-w49.28`): a burrowed unit
    // (the map prints its mound as `##`).
    if (view.burrowed.some((entry) => entry.unit.id === unit.id))
      parts.push("| BURROWED: a mound; it surfaces at your next turn start");
  }
  if (status !== "") parts.push(`| ${status}`);
  // Tuning 4: role rules the numbers do not show.
  const unitRule = unitRoleRuleV7(view, unit);
  // The Dinosaur pass: an Egg has none of the rules of the unit inside.
  if (unit.form === "EGG")
    parts.push(
      "| an Egg: cannot move or fight, Defense 1 on any tile, lost with its city",
    );
  else
    for (const note of roleNotesV7(
      unitRule,
      unit.form === "LAND" && unitIgnoresZocStopsV7(view, unit),
      unit.form === "LAND" ? unitRoleMechanicsV7(view, unit) : null,
    ))
      parts.push(`| ${note}`);
  if (full && stats !== undefined) {
    const modifiers = stats.stats.flatMap((entry) =>
      entry.modifiers.map(
        (modifier) =>
          `${entry.label} ${signedV7(modifier.value.numerator / modifier.value.denominator)} ${modifier.sourceLabel}`,
      ),
    );
    if (modifiers.length > 0)
      parts.push(`| modifiers: ${modifiers.join("; ")}`);
    if (stats.abilities.length > 0)
      parts.push(`| abilities: ${stats.abilities.join(", ")}`);
  }
  return parts.join(" ");
}

function headerLinesV7(session: SessionV7, view: PlayerViewV7): string[] {
  const state = session.state;
  const active = view.turnOrder[view.activeSeatIndex];
  // Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section
  // 4.3): the mode, "Round N of 30" in Perfection, and the score.
  const score = queryScoreV7(view);
  const lines = [
    `== state #${state.commandIndex} | ${RULESET_7_ID} | ${view.setup.mapType.toLowerCase()} ${view.board.width}x${view.board.height} seed ${view.setup.seed} | ${score.gameMode.toLowerCase()} ==`,
    `ROUND ${view.round}${score.roundLimit === null ? "" : ` of ${score.roundLimit}`} | you are ${seatNameV7(view, view.viewer.id)} | ${view.outcome !== null ? "MATCH OVER" : active === view.viewer.id ? "YOUR TURN" : `waiting for ${seatLabelV7(view, active ?? 0)}`} | coins ${view.viewer.coins}${factionHasFavourV7(view.viewer.faction) ? ` | favour ${favourOfV7(view, view.viewer.id)}` : ""} | income +${totalIncomeV7(view)}/turn | cities ${ownCitiesV7(view).length} | units ${allOwnedUnitsV7(view, view.viewer.id).length} | score ${score.own?.total ?? 0}`,
    `PLAYERS in turn order: ${[
      ...view.turnOrder.flatMap((playerId) =>
        view.leaderboard.filter((entry) => entry.playerId === playerId),
      ),
      ...view.leaderboard.filter(
        (entry) => !view.turnOrder.includes(entry.playerId),
      ),
    ]
      .map(
        (entry) =>
          `S${entry.seat} ${FACTION_DISPLAY_NAMES_V7[entry.faction]}${entry.isViewer ? " (you)" : " (AI)"} ${entry.status.toLowerCase()} score ${entry.score} cities ${entry.cityCount} units ${entry.livingUnitCount}${factionHasFavourV7(entry.faction) && entry.status === "ACTIVE" ? ` favour ${favourOfV7(view, entry.playerId)}` : ""}`,
      )
      .join(" > ")}`,
  ];
  if (score.own !== null)
    lines.push(`SCORE (yours): ${scoreBreakdownTextV7(score.own)}`);
  if (view.outcome !== null) lines.push(...outcomeLinesV7(view));
  for (const choice of view.pendingChoices)
    lines.push(
      `PENDING CHOICE: city ${cityTagV7(view, choice.cityId)} reached level ${choice.reachedLevel}; choose one with do: ${rewardChoicesTextV7(view, choice)} (nothing else is offered until you choose)`,
    );
  return lines;
}

function outcomeLineV7(view: PlayerViewV7): string {
  const outcome = view.outcome;
  if (outcome === null) return "OUTCOME: none yet";
  // Score and modes (section 4.2): a Perfection result decided by the score.
  if (outcome.kind !== "HEADLESS_VICTORY" && outcome.decidedBy === "SCORE") {
    const ranking = (outcome.ranking ?? [])
      .map(
        (playerId, index) =>
          `${index + 1}. ${seatNameV7(view, playerId)} ${view.leaderboard.find((entry) => entry.playerId === playerId)?.score ?? 0}`,
      )
      .join(", ");
    return outcome.kind === "VICTORY"
      ? `OUTCOME: VICTORY after round ${view.round}: you have the highest score (${ranking})`
      : `OUTCOME: DEFEAT after round ${view.round}: ${seatNameV7(view, outcome.defeatedByPlayerId)} has the highest score (${ranking})`;
  }
  if (outcome.kind === "DEFEAT")
    return `OUTCOME: DEFEAT in round ${view.round}: you were eliminated by ${seatNameV7(view, outcome.defeatedByPlayerId)}`;
  return `OUTCOME: ${outcome.winnerId === view.viewer.id ? "VICTORY" : "DEFEAT"} in round ${view.round}: ${seatNameV7(view, outcome.winnerId)} won`;
}

/** Section 5: the outcome and, for the human seat, the star grade. */
function outcomeLinesV7(view: PlayerViewV7): string[] {
  const lines = [outcomeLineV7(view)];
  const graded = queryStarGradeV7(view);
  if (graded === null || view.viewer.id !== view.humanPlayerId) return lines;
  const { grade, inputs } = graded;
  const met = (value: boolean | null): string =>
    value === null ? "n/a" : value ? "yes" : "no";
  lines.push(
    `GRADE: ${grade.stars} star${grade.stars === 1 ? "" : "s"}${grade.glow ? " and the glow (flawless)" : ""} | rating ${grade.rating.display} (${grade.rating.numerator}/${grade.rating.denominator} at round ${grade.ratingRound}; 2 stars ${(grade.thresholds.twoStarsHundredths / 100).toFixed(2)}, 3 stars ${(grade.thresholds.threeStarsHundredths / 100).toFixed(2)} with ${inputs.rivals} rival${inputs.rivals === 1 ? "" : "s"}) | victory ${met(grade.conditions.victory)}, hardest difficulty ${met(grade.conditions.hardestDifficulty)}, every rival eliminated by you ${met(grade.conditions.everyRivalEliminatedByYou)}, flawless ${met(grade.conditions.flawless)}${graded.recordable ? "" : " | not recorded (Showcase, mission, or mirror setup)"}`,
  );
  return lines;
}

/** Section 3.1: one breakdown as text (counts and points). */
function scoreBreakdownTextV7(score: ScoreBreakdownV7): string {
  return `${score.total} = territory ${score.territory.count} tiles ${score.territory.points} + cities ${score.cities.count} levels ${score.cities.points} + technology ${score.technology.count} tiers ${score.technology.points} + achievements ${score.achievements.count} ${score.achievements.points} + army ${score.army.count} coins ${score.army.points} + kills ${score.kills.count} coins ${score.kills.points} (positive ${score.positive}); losses ${score.losses.count} coins ${score.losses.points}, damage ${score.damage.count} HP ${score.damage.points}${score.capReturned > 0 ? `, capped at half (${score.capReturned} given back)` : ""}`;
}

function viewLinesV7(session: SessionV7, full: boolean): string[] {
  const view = viewForV7(session.state, session.playerId);
  const offered = offeredV7(view);
  const lines = headerLinesV7(session, view);
  lines.push(
    "",
    "MAP",
    ...mapLinesV7(view),
    // Tuning 8 (`pulp_wars-w49.11`): the feature glyphs too (K Workshop,
    // M Mine, O Monument: a Workshop was taken for a city).
    ...(full
      ? LEGEND_V7
      : LEGEND_V7.filter((_line, index) => index === 0 || index === 2)),
  );
  if (view.players.some((player) => player.faction === "MARTIAN"))
    lines.push(MARTIAN_LEGEND_V7);
  if (view.players.some((player) => player.faction === "DINOSAUR"))
    lines.push(DINOSAUR_LEGEND_V7);
  // The ninth unit (7r55): the codes of the other factions' new units.
  for (const faction of FACTION_IDS_V7) {
    const legend = NINTH_UNIT_LEGEND_V7[faction];
    if (
      legend !== undefined &&
      view.players.some((player) => player.faction === faction)
    )
      lines.push(legend);
  }
  if (!full) lines.push("  (view --full prints the whole legend)");

  const specials: string[] = [];
  const villages = view.board.tiles.filter(
    (tile) => tile.explored && tile.site === "VILLAGE",
  );
  if (villages.length > 0)
    specials.push(
      `neutral villages: ${villages.map((tile) => xyV7(tile.at)).join(" ")}`,
    );
  if (view.treasureChests.length > 0)
    specials.push(
      `treasure chests: ${view.treasureChests.map(xyV7).join(" ")}`,
    );
  if (view.curiosities.length > 0)
    specials.push(
      `curiosities: ${view.curiosities.map((entry) => `${entry.kind}@${xyV7(entry.at)}`).join(" ")}`,
    );
  if (view.graves.length > 0)
    specials.push(`graves: ${view.graves.map(xyV7).join(" ")}`);
  // The Undead hand pass at 7r55 (`pulp_wars-w49.20`): the marked Graves,
  // which the list above did not tell from the others.
  if (view.ninthUnit.wightGraves.length > 0)
    specials.push(
      `Wight's Graves (a Wight returns with ${WIGHT_RISE_AGAIN_HP_V7} HP at its owner's turn start unless a unit stands there): ${view.ninthUnit.wightGraves
        .map((entry) => {
          const blocker = view.units.find((unit) => sameV7(unit.at, entry.at));
          return `${xyV7(entry.at)}(${seatLabelV7(view, entry.ownerId)}${blocker === undefined ? ", free" : `, under ${unitTagV7(view, blocker)}`})`;
        })
        .join(" ")}`,
    );
  if (view.crumbs.length > 0)
    specials.push(
      `crumbs: ${view.crumbs.map((entry) => `${xyV7(entry.at)}(${seatLabelV7(view, entry.ownerId)})`).join(" ")}`,
    );
  // Dwarf crowd control (`pulp_wars-w49.33`): every Barricade on an
  // explored tile, with its owner and HP.
  if (barricadesOfV7(view).length > 0)
    specials.push(
      `barricades (block every unit until destroyed): ${barricadesOfV7(view)
        .map(
          (entry) =>
            `${xyV7(entry.at)}(${seatLabelV7(view, entry.ownerId)} ${String(entry.hp)}/${String(BARRICADE_HP_V7)} HP)`,
        )
        .join(" ")}`,
    );
  if (view.ice.length > 0)
    specials.push(`ice: ${view.ice.map((entry) => xyV7(entry.at)).join(" ")}`);
  const defenses = view.board.tiles.filter(
    (tile) => tile.explored && tile.fieldDefense,
  );
  if (defenses.length > 0)
    specials.push(
      `field defenses: ${defenses.map((tile) => xyV7(tile.at)).join(" ")}`,
    );
  const explored = view.board.tiles.filter((tile) => tile.explored).length;
  specials.push(`explored ${explored}/${view.board.tiles.length} tiles`);
  lines.push("", `ON THE MAP ${specials.join(" | ")}`);

  lines.push("", "YOUR CITIES");
  const tree = safeTechTreeV7(view);
  for (const city of ownCitiesV7(view)) {
    const slots = citySlotsV7(view, city);
    const trainable = UNIT_ROLE_IDS_V7.filter((role) => {
      const rule = effectiveRoleRuleV7(role, view.viewer.faction);
      return (
        !isNavalRoleV7(role) &&
        rule.cost !== null &&
        (rule.technology === null ||
          view.viewer.researchedTechs.includes(rule.technology))
      );
    }).map((role) => {
      const rule = effectiveRoleRuleV7(role, view.viewer.faction);
      const id = offered.find(
        (entry) =>
          (entry.command.kind === "TRAIN" ||
            entry.command.kind === "LAY_EGG") &&
          entry.command.cityId === city.id &&
          entry.command.role === role,
      )?.id;
      const cost = trainingCostV7(view, city.id, role);
      // The Dinosaur pass, correction: a unit of two slots says how many
      // it needs (it read "center occupied" at a city with one free slot),
      // and an Egg is laid beside the center, so an occupied center is not
      // its reason.
      const need = roleMechanicsV7(role, view.viewer.faction).capacitySlots;
      const free = slots.capacity - slots.used;
      const laid = isEggLaidRoleV7(role, view.viewer.faction);
      const why =
        city.cityActionAvailable !== true
          ? "city action used"
          : cityBesiegedV7(view, city)
            ? "besieged"
            : cost > view.viewer.coins
              ? "too dear"
              : free < need
                ? need === 1
                  ? "no free slot"
                  : `needs ${need} free slots, the city has ${free}`
                : laid
                  ? "no free tile next to the city"
                  : view.units.some((unit) => sameV7(unit.at, city.at))
                    ? "center occupied"
                    : "not offered";
      return `${rule.label} ${cost}c${id === undefined ? ` (${why})` : ` [${id.startsWith(`c${city.id}.egg`) ? `c${city.id}.egg.${role}.x,y` : id}]`}`;
    });
    lines.push(
      `${cityTagV7(view, city.id)} ${city.isCapital ? "CAPITAL" : "city"} @${xyV7(city.at)} L${city.level} pop ${city.population}/${city.level + 1} income +${cityIncomeV7(view, city)} slots ${slots.used}/${slots.capacity} action ${city.cityActionAvailable === true ? "ready" : "used"}${cityBesiegedV7(view, city) ? " BESIEGED" : ""}${city.landGrantUsed ? " land-grant-used" : ""}${city.rewards.length === 0 ? "" : ` rewards ${city.rewards.map((entry) => rewardNameV7(view.viewer.faction, entry.reward)).join(",")}`}`,
    );
    // The Martian pass, correction: where the giant unit comes from (a
    // tester reached level 5 in another city and never found it). The
    // reward ladder rework (`pulp_wars-zypi`): every level from
    // `REWARD_UNIT_LEVEL_V7` (5) offers it or the Treasury, in every city,
    // with no once-per-city limit. (Printed from level 4, the level before
    // the offer, so that a wide empire's view does not grow by a line for
    // every village.)
    if (city.level >= REWARD_UNIT_LEVEL_V7 - 1)
      lines.push(
        `   giant unit: every level of this city from ${REWARD_UNIT_LEVEL_V7} offers a free ${effectiveRoleRuleV7("JUGGERNAUT", view.viewer.faction).label} or ${CITY_REWARD_COINS_V7.TREASURY} Coins`,
      );
    // Tuning 5 (`pulp_wars-w49.4`): two things the numbers do not say.
    // The level term of income stops at 4, so more population past level 4
    // buys unit slots and rewards and no Coins; and a city that lost
    // population it had already spent on a level shows a negative meter
    // and pays that much less until it regrows.
    if (city.level >= CITY_LEVEL_INCOME_CAP_V7)
      lines.push(
        `   income: a level pays ${CITY_LEVEL_INCOME_CAP_V7} Coins at most; higher levels add unit slots and rewards`,
      );
    if (city.population < 0)
      lines.push(
        `   population ${city.population}: a level's population was lost (a destroyed building, a cut Road); income ${city.population} until it is regrown`,
      );
    lines.push(`   train: ${trainable.join(" | ")}`);
    // Tuning 4: the Land Grant and its price, also while it is too dear.
    const grantPrice = publicLandGrantPriceV7(view, city.id);
    if (grantPrice !== null) {
      const grantId = offered.find(
        (entry) =>
          entry.command.kind === "LAND_GRANT" &&
          entry.command.cityId === city.id,
      )?.id;
      const why =
        grantPrice.cost > view.viewer.coins
          ? `too dear, you have ${view.viewer.coins}c`
          : city.cityActionAvailable !== true
            ? "city action used"
            : "not offered now";
      lines.push(
        `   land grant: ${grantPrice.cost}c for ${grantPrice.tiles.length} explored neutral tiles (${LAND_GRANT_COST_PER_TILE_V7}c each) ${grantId === undefined ? `(${why})` : `[${grantId}]`}`,
      );
    }
    if (cityBarracksV7(city) > 0)
      lines.push(
        `   barracks x${cityBarracksV7(city)}: +${cityBarracksV7(city)} unit slot(s)`,
      );
    // `pulp_wars-zypi`: the Economic Miracle's Coins, in the income above.
    if (cityEconomicMiracleIncomeV7(city) > 0)
      lines.push(
        `   economic miracle: +${cityEconomicMiracleIncomeV7(city)} income every turn`,
      );
    // Tuning 2 (7r47): Commerce's capital rule, city by city.
    const landTrade = landTradeStatusV7(view, city.id);
    if (landTrade !== null)
      lines.push(`   ${landTradeStatusTextV7(landTrade)}`);
  }
  if (ownCitiesV7(view).length === 0) lines.push("(none)");

  lines.push("", "YOUR UNITS");
  const own = allOwnedUnitsV7(view, view.viewer.id);
  for (const unit of own)
    lines.push(unitLineV7(view, unit, true, offered, full));
  if (own.length === 0) lines.push("(none)");

  const others = view.units.filter((unit) => unit.ownerId !== view.viewer.id);
  lines.push("", "VISIBLE OTHER UNITS");
  for (const unit of others)
    lines.push(unitLineV7(view, unit, false, offered, full));
  if (others.length === 0) lines.push("(none)");
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): another seat's mounds,
  // which are public (the hand player could not see a tunnel's eruption
  // coming).
  const mounds = view.burrowed.filter(
    (entry) => entry.unit.ownerId !== view.viewer.id,
  );
  if (mounds.length > 0) {
    lines.push(
      "",
      "MOUNDS (burrowed; each surfaces at its owner's next turn start, and a Steam Mole's eruption hits every ground unit of another seat next to it)",
    );
    for (const entry of mounds)
      lines.push(
        `${unitTagV7(view, entry.unit)} @${xyV7(entry.unit.at)} hp ${entry.unit.hp}/${entry.unit.maxHp}${entry.moleUnitId === null ? ` | erupts for ${moundEruptionDamageV7(view, entry.unit)} on the 8 tiles around it` : ` | rider of u${entry.moleUnitId}`}`,
      );
  }

  const otherCities = view.cities.filter(
    (city) => city.ownerId !== view.viewer.id,
  );
  lines.push("", "KNOWN OTHER CITIES");
  for (const city of otherCities) {
    const garrison = view.units.find((unit) => sameV7(unit.at, city.at));
    lines.push(
      `${cityTagV7(view, city.id)} ${seatNameV7(view, city.ownerId)} ${city.isCapital ? "CAPITAL" : "city"} @${xyV7(city.at)} L${city.level} pop ${city.population}/${city.level + 1}${city.rewards.some((entry) => entry.reward === "WALLS") ? " WALLS" : ""}${garrison === undefined ? " center empty" : ` center ${unitTagV7(view, garrison)}`}`,
    );
  }
  if (otherCities.length === 0) lines.push("(none)");

  lines.push(
    "",
    `TECH researched ${view.viewer.researchedTechs.length}: ${
      view.viewer.researchedTechs
        .map((tech) => techNameV7(view.viewer.faction, tech))
        .join(", ") || "-"
    }`,
  );
  if (tree !== null)
    lines.push(
      `   available: ${
        tree.nodes
          .filter((node) => node.state === "AVAILABLE")
          .map(
            (node) =>
              // The faction's own name beside the id (Nesting, Heat Sinks).
              `${techNameV7(view.viewer.faction, node.id)} ${node.cost}c${node.affordable ? "" : " (too dear)"}`,
          )
          .join(" | ") || "-"
      }`,
    );
  lines.push(
    `ACHIEVEMENTS ${view.achievementProgress
      .map((entry) => {
        const entitlement = view.viewer.achievementEntitlements.find(
          (candidate) => candidate.achievement === entry.achievement,
        );
        const progress =
          "current" in entry
            ? `${entry.current}/${entry.required}`
            : "currentExploredTiles" in entry
              ? `${entry.currentExploredTiles}/${entry.requiredExploredTiles}`
              : "currentMaximumOutput" in entry
                ? `${entry.currentMaximumOutput}/${entry.requiredOutput}`
                : `${entry.currentDistinctTrainableRoles}/${entry.requiredDistinctTrainableRoles}`;
        // Slayer reads the most kills held by ONE of the viewer's units
        // that is still on the board, not the seat's total kills.
        // Tuning 8 (`pulp_wars-w49.11`): what Muster and Engineer count
        // (MUSTER read 2/4 with seven units; ENGINEER 3/6 with seven
        // Mines and four Workshops built).
        const meaning =
          entry.achievement === "SLAYER"
            ? " (most kills by one living unit)"
            : entry.achievement === "MUSTER"
              ? " (different unit kinds you can train that you have on the board at once; a reward-only unit does not count)"
              : entry.achievement === "ENGINEER"
                ? " (highest output of one Windmill, Sawmill, Forge, or Workshop; Mines do not count; it counts your Farms, Lumber Camps, or Mines next to it on any of your cities' land)"
                : entry.achievement === "EXPLORER"
                  ? " (tiles explored; half the map)"
                  : entry.achievement === "CONQUEROR"
                    ? " (capture an enemy capital; another enemy city does not count)"
                    : entry.achievement === "LAND_BARON"
                      ? " (cities owned at once)"
                      : "";
        // Tuning 5 (`pulp_wars-w49.4`): Explorer, Engineer, and Muster
        // count before their technology is researched but unlock only
        // with it (a meter read 139/100 and nothing said why).
        const tech = ACHIEVEMENT_REQUIRED_TECH_V7[entry.achievement];
        const needs =
          tech !== null &&
          entitlement?.unlocked !== true &&
          !view.viewer.researchedTechs.includes(tech)
            ? ` (needs ${techNameV7(view.viewer.faction, tech)})`
            : "";
        return `${entry.achievement} ${progress}${meaning}${needs}${entitlement?.spent === true ? " built" : entitlement?.unlocked === true ? " UNLOCKED (monument available)" : ""}`;
      })
      .join(" | ")}`,
  );
  if (full) {
    if (view.improvementValues.length > 0)
      lines.push(
        `BUILDING OUTPUT ${view.improvementValues.map((value) => `${value.improvement.toLowerCase()}@${xyV7(value.at)} ${value.measure === "POPULATION" ? "pop" : "coins"} +${value.level}`).join(" | ")}`,
      );
    if (
      view.naval.landTradeCityIds.length + view.naval.seaTradeCityIds.length >
      0
    )
      lines.push(
        `TRADE land ${view.naval.landTradeCityIds.map((id) => `c${id}`).join(",") || "-"} sea ${view.naval.seaTradeCityIds.map((id) => `c${id}`).join(",") || "-"}`,
      );
  }
  lines.push("", offeredSummaryV7(offered));
  return lines;
}

function commandViewV7(args: ArgsV7): string {
  const session = loadSessionV7(args);
  return viewLinesV7(session, args.switches.has("full")).join("\n");
}

// ---------------------------------------------------------------------------
// tech
// ---------------------------------------------------------------------------

function commandTechV7(args: ArgsV7): string {
  const session = loadSessionV7(args);
  const view = viewForV7(session.state, session.playerId);
  const tree = safeTechTreeV7(view);
  if (tree === null)
    return "TECH: you own no city, so nothing can be researched.";
  const lines = [
    `TECH TREE ${FACTION_DISPLAY_NAMES_V7[tree.faction]} | state #${session.state.commandIndex} | coins ${view.viewer.coins} | cities ${tree.ownedCityCount} (price = ${[1, 2, 3].map((tier) => `tier ${tier}: ${TECHNOLOGY_RESEARCH_COST_V7[tier as 1 | 2 | 3].base}c +${TECHNOLOGY_RESEARCH_COST_V7[tier as 1 | 2 | 3].step}c`).join(", ")} per city you own beyond the first; technologies owned do not matter) | researched ${view.viewer.researchedTechs.length}/${tree.nodes.length}`,
  ];
  for (const branch of tree.branches) {
    const nodes = tree.nodes.filter((node) => node.branch === branch);
    if (nodes.length === 0) continue;
    lines.push("", `BRANCH ${branch}`);
    for (const node of nodes) lines.push(techLineV7(node, tree.faction));
  }
  lines.push(
    "",
    "States: OWNED researched | AVAILABLE can be researched (do r.<ID> when affordable) | BLOCKED needs the listed technology first | DISABLED not in this match.",
  );
  return lines.join("\n");
}

function techLineV7(
  node: PublicTechnologyNodeV7,
  faction: FactionIdV7,
): string {
  const state =
    node.state === "AVAILABLE"
      ? `AVAILABLE ${node.cost}c${node.affordable ? ` affordable [r.${node.id}]` : " too dear"}`
      : node.state === "BLOCKED"
        ? `BLOCKED ${node.cost}c needs ${node.missingPrerequisites.join("+")}`
        : node.state === "DISABLED"
          ? "DISABLED"
          : "OWNED";
  return `T${node.tier} ${techNameV7(faction, node.id)} | ${state}${node.prerequisites.length === 0 ? "" : ` | after ${node.prerequisites.join("+")}`} | unlocks: ${node.effects.length === 0 ? "-" : node.effects.map((effect) => unlockTextV7(effect, faction)).join("; ")}`;
}

// ---------------------------------------------------------------------------
// options
// ---------------------------------------------------------------------------

function parseIdNumberV7(raw: string, prefix: string, flag: string): number {
  const match = new RegExp(`^${prefix}?(\\d+)$`, "i").exec(raw.trim());
  if (match === null)
    throw new TextPlayErrorV7(`${flag} must be an id such as ${prefix}12`);
  return Number(match[1]);
}

function parseCoordV7(raw: string, flag: string): CoordV7 {
  const match = /^(\d+),(\d+)$/.exec(raw.trim());
  if (match === null) throw new TextPlayErrorV7(`${flag} must be x,y`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** `options`: more offers of one kind than this become one line. */
const OPTIONS_GROUP_MINIMUM_V7 = 3;
/** `options`: the tiles a grouped line lists before "+N more". */
const OPTIONS_GROUP_TILES_V7 = 40;

function commandOptionsV7(args: ArgsV7): string {
  const session = loadSessionV7(args);
  const view = viewForV7(session.state, session.playerId);
  const memory = new UnitMemoryV7();
  memory.remember(view);
  const context: TextContextV7 = { view, memory };
  const offered = offeredV7(view);
  const lines = [
    `== options at state #${session.state.commandIndex} | round ${view.round} | coins ${view.viewer.coins} ==`,
    offeredSummaryV7(offered),
  ];
  if (view.outcome !== null) return [...lines, outcomeLineV7(view)].join("\n");
  lines.push(...freeMonumentLinesV7(view, offered, null));
  const row = (entry: OfferedV7): string =>
    `${entry.id}  ${describeCommandV7(view, entry.command, context)}`;
  const unitFlag = args.flags.get("unit");
  const cityFlag = args.flags.get("city");
  const tileFlag = args.flags.get("tile");
  const all = args.switches.has("all");

  if (unitFlag !== undefined) {
    const id = parseIdNumberV7(unitFlag, "u", "--unit");
    const unit = allOwnedUnitsV7(view).find((candidate) => candidate.id === id);
    if (unit === undefined)
      throw new TextPlayErrorV7(`no visible unit u${id} (see view)`);
    lines.push(
      "",
      unitLineV7(view, unit, unit.ownerId === view.viewer.id, offered, true),
    );
    const mine = offered.filter(
      (entry) => commandUnitIdV7(entry.command) === id,
    );
    if (mine.length === 0)
      lines.push(
        unit.ownerId === view.viewer.id
          ? "(no command is offered for this unit now)"
          : "(not your unit)",
      );
    for (const entry of mine) lines.push(row(entry));
    lines.push(...unitReasonLinesV7(view, unit, offered));
    const targeted = offered.filter(
      (entry) =>
        "targetUnitId" in entry.command && entry.command.targetUnitId === id,
    );
    if (targeted.length > 0) lines.push("", "COMMANDS TARGETING IT");
    for (const entry of targeted) lines.push(row(entry));
    lines.push(...threatEstimateLinesV7(view, unit));
    return lines.join("\n");
  }
  if (cityFlag !== undefined) {
    const id = parseIdNumberV7(cityFlag, "c", "--city");
    const city = view.cities.find((candidate) => candidate.id === id);
    if (city === undefined)
      throw new TextPlayErrorV7(`no known city c${id} (see view)`);
    lines.push(
      "",
      `${cityTagV7(view, id)} ${seatNameV7(view, city.ownerId)} @${xyV7(city.at)} L${city.level} pop ${city.population}/${city.level + 1}`,
    );
    const mine = offered.filter(
      (entry) => commandCityIdV7(view, entry.command) === id,
    );
    if (mine.length === 0) lines.push("(no command is offered for this city)");
    for (const entry of mine) lines.push(row(entry));
    lines.push(...freeMonumentLinesV7(view, offered, id));
    return lines.join("\n");
  }
  if (tileFlag !== undefined) {
    const at = parseCoordV7(tileFlag, "--tile");
    lines.push("", `TILE ${xyV7(at)}: ${tileBriefV7(view, at)}`);
    const unit = view.units.find((candidate) => sameV7(candidate.at, at));
    if (unit !== undefined)
      lines.push(
        unitLineV7(view, unit, unit.ownerId === view.viewer.id, offered, false),
      );
    const here = offered.filter((entry) => {
      const command = entry.command;
      if (command.kind === "MOVE") {
        const to = command.path[command.path.length - 1];
        return to !== undefined && sameV7(to, at);
      }
      if ("at" in command && sameV7(command.at, at)) return true;
      if ("to" in command && sameV7(command.to, at)) return true;
      return (
        unit !== undefined &&
        (commandUnitIdV7(command) === unit.id ||
          ("targetUnitId" in command && command.targetUnitId === unit.id))
      );
    });
    if (here.length === 0)
      lines.push("(no offered command involves this tile)");
    for (const entry of here) lines.push(row(entry));
    return lines.join("\n");
  }

  const group = (name: CommandGroupV7): readonly OfferedV7[] =>
    offered.filter((entry) => commandGroupV7(entry.command) === name);
  const section = (title: string, entries: readonly OfferedV7[]): void => {
    if (entries.length === 0) return;
    lines.push("", title);
    for (const entry of entries) lines.push(row(entry));
  };
  // Tuning 4 (`pulp_wars-w49.3`): many offers of one kind (Roads, Monuments,
  // hires on every Market) are one line with their count, id pattern and
  // tiles; `--all`, `--tile` and `--city` still describe each one.
  let grouped = false;
  const groupedSection = (
    title: string,
    entries: readonly OfferedV7[],
  ): void => {
    if (entries.length === 0) return;
    if (all) {
      section(title, entries);
      return;
    }
    lines.push("", title);
    // The hires of one Market are one line: its roles and prices.
    const markets = new Map<string, OfferedV7[]>();
    for (const entry of entries)
      if (entry.command.kind === "HIRE") {
        const marketKey = `c${entry.command.cityId}.hire.ROLE.${xyV7(entry.command.at)}`;
        markets.set(marketKey, [...(markets.get(marketKey) ?? []), entry]);
      }
    for (const [pattern, hires] of markets) {
      const first = hires[0]?.command;
      if (first?.kind !== "HIRE") continue;
      const city = view.cities.find(
        (candidate) => candidate.id === first.cityId,
      );
      const slots = city === undefined ? null : citySlotsV7(view, city);
      grouped = true;
      lines.push(
        `${pattern}  x${hires.length} hire on the Market at ${xyV7(first.at)} (1.5x the price${slots === null ? "" : `; city slots ${slots.used}/${slots.capacity}, a hire may go 1 above`}; the unit arrives spent on the Market tile, which must be empty): ${[
          ...hires.map((entry) =>
            entry.command.kind === "HIRE"
              ? `${effectiveRoleRuleV7(entry.command.role, view.viewer.faction).label} [${entry.command.role}] ${publicHireCostV7(view, entry.command.cityId, entry.command.role) ?? "?"}c`
              : "",
          ),
          // The Dinosaur pass, correction: the roles the Market would hire
          // with more Coins (a hidden role read as "cannot be hired").
          ...UNIT_ROLE_IDS_V7.flatMap((role) => {
            if (
              hires.some(
                (entry) =>
                  entry.command.kind === "HIRE" && entry.command.role === role,
              )
            )
              return [];
            const cost = publicHireCostV7(view, first.cityId, role);
            return cost === null || cost <= view.viewer.coins
              ? []
              : [
                  `${effectiveRoleRuleV7(role, view.viewer.faction).label} [${role}] ${cost}c (too dear, you have ${view.viewer.coins}c)`,
                ];
          }),
        ].join(" | ")}`,
      );
    }
    const buckets = new Map<string, OfferedV7[]>();
    for (const entry of entries) {
      if (entry.command.kind === "HIRE") continue;
      const pattern = entry.id.replace(/~\d+$/, "").replace(/\d+,\d+/, "x,y");
      buckets.set(pattern, [...(buckets.get(pattern) ?? []), entry]);
    }
    for (const [pattern, bucket] of buckets) {
      const first = bucket[0];
      if (first === undefined) continue;
      if (bucket.length <= OPTIONS_GROUP_MINIMUM_V7) {
        for (const entry of bucket) lines.push(row(entry));
        continue;
      }
      grouped = true;
      const tiles = bucket.map(
        (entry) => /\d+,\d+/.exec(entry.id)?.[0] ?? entry.id,
      );
      const shown = tiles.slice(0, OPTIONS_GROUP_TILES_V7);
      lines.push(
        `${pattern}  x${bucket.length} at ${shown.join(" ")}${tiles.length > shown.length ? ` ... +${tiles.length - shown.length} more` : ""} | e.g. ${row(first)}`,
      );
    }
  };
  section("REWARD CHOICE (must be made first)", group("reward"));
  section("RESEARCH", group("research"));
  groupedSection("TRAIN", group("train"));
  // Tuning 8 (`pulp_wars-w49.11`): say why no city trains (the section was
  // simply absent with every slot filled).
  if (group("train").length === 0 && group("reward").length === 0) {
    const reasons = ownCitiesV7(view).map(
      (city) => `c${city.id} ${noTrainingReasonV7(view, city)}`,
    );
    if (reasons.length > 0)
      lines.push("", "TRAIN", `nothing to train: ${reasons.join(" | ")}`);
  }
  section("CITY", group("city"));
  groupedSection("TILES", group("tile"));
  if (grouped)
    lines.push(
      "",
      "A line with xN stands for N offers of one kind (replace x,y in the id with a listed tile, ROLE with a listed role); options --tile x,y, --city cN or --all describes each one.",
    );
  section("ATTACKS", group("attack"));
  const unitActions = group("unit");
  const moves = group("move");
  const unitIds = [
    ...new Set(
      [...unitActions, ...moves].map((entry) => commandUnitIdV7(entry.command)),
    ),
  ].filter((id): id is number => id !== null);
  if (unitIds.length > 0) lines.push("", "UNITS");
  for (const id of unitIds) {
    const unit = allOwnedUnitsV7(view).find((candidate) => candidate.id === id);
    const actions = unitActions.filter(
      (entry) => commandUnitIdV7(entry.command) === id,
    );
    const unitMoves = moves.filter(
      (entry) => commandUnitIdV7(entry.command) === id,
    );
    // Wait and Disband need no description: their ids stand on the unit's
    // line (`--all` and `--unit` describe them).
    const plain = all
      ? []
      : actions.filter(
          (entry) =>
            entry.command.kind === "WAIT" || entry.command.kind === "DISBAND",
        );
    lines.push(
      `${unit === undefined ? `u${id}` : `${unitTagV7(view, unit)} @${xyV7(unit.at)} hp ${unit.hp}/${unit.maxHp}`}${plain.length === 0 ? "" : ` | also ${plain.map((entry) => entry.id).join(" ")}`}`,
    );
    for (const entry of actions)
      if (!plain.includes(entry)) lines.push(`  ${row(entry)}`);
    if (all) for (const entry of unitMoves) lines.push(`  ${row(entry)}`);
    else if (unitMoves.length > 0)
      lines.push(
        `  moves ${unitMoves.length} (id u${id}.m.x,y): ${unitMoves.map((entry) => entry.id.split(".m.")[1] ?? entry.id).join(" ")}`,
      );
  }
  if (!all && moves.length > 0)
    lines.push(
      "",
      "Move destinations are listed as x,y; options --unit ID (or --all) describes each one, and says why an attack or fortify is not offered.",
    );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// do / end
// ---------------------------------------------------------------------------

function requireOwnTurnV7(session: SessionV7): PlayerViewV7 {
  const view = viewForV7(session.state, session.playerId);
  if (view.outcome !== null)
    throw new TextPlayErrorV7(`the match is over. ${outcomeLineV7(view)}`);
  if (activePlayerV7(session.state) !== session.playerId)
    throw new TextPlayErrorV7("it is not your turn (corrupt session?)");
  return view;
}

/**
 * Tuning 6 (`pulp_wars-w49.6`): why a move id is not offered, from the
 * seat's own view: the unit, its activation, the destination tile, what
 * stands on it, and the distance. The engine's path rules are not replayed
 * here; when none of the plain reasons applies the line names the three
 * rules that end a Move early.
 */
function moveRejectionReasonV7(view: PlayerViewV7, id: string): string | null {
  const match = /^u(\d+)\.m\.(\d+),(\d+)$/i.exec(id);
  if (match === null) return null;
  const unit = allOwnedUnitsV7(view).find(
    (candidate) => candidate.id === Number(match[1]),
  );
  const to = { x: Number(match[2]), y: Number(match[3]) };
  if (unit === undefined) return `no visible unit u${match[1]}`;
  if (unit.ownerId !== view.viewer.id) return "it is not your unit";
  const label = unitLabelV7(view, unit);
  // Tuning 7 (`pulp_wars-w49.10`): a unit with its Escape move left has
  // moved and may still move: the reason is the Escape's reach.
  const escapes = unit.activation.escapeAvailable;
  if (unit.activation.moved && !escapes)
    return `the ${label} has already moved this turn`;
  const state = activationTextV7(unit);
  if (state === "spent") return `the ${label} arrived this turn and is spent`;
  if (sameV7(unit.at, to)) return "it already stands there";
  const tile = tileAtV7(view, to);
  if (tile === undefined) return "the tile is off the board";
  if (!tile.explored) return "the tile is unexplored";
  const occupant = view.units.find((candidate) => sameV7(candidate.at, to));
  if (occupant !== undefined)
    return `the tile is occupied by ${unitTagV7(view, occupant)}`;
  const move = Number(statTotalV7(view, unit.id, "MOVE") ?? "0");
  const gap = chebyshevV7(unit.at, to);
  if (escapes) {
    const reach = queryPlayerCommandsV7(view).flatMap((command) => {
      const end =
        command.kind === "MOVE" && command.unitId === unit.id
          ? command.path.at(-1)
          : undefined;
      return end === undefined ? [] : [xyV7(end)];
    });
    return `the ${label}'s Escape does not reach it (${gap} tiles away): after its attack it may still move to ${reach.length === 0 ? "no tile" : reach.join(" ")}`;
  }
  if (Number.isFinite(move) && move > 0 && gap > move)
    return `the tile is ${gap} tiles away and the ${label} has Move ${move}`;
  const offeredMoves = queryPlayerCommandsV7(view).filter(
    (command) => command.kind === "MOVE" && command.unitId === unit.id,
  ).length;
  if (offeredMoves === 0)
    return `no move is offered for the ${label} now (it is ${state})`;
  return `no legal path ends there this turn: entering a Forest or a Mountain ends a Move (unless both tiles are on your Road, or Fieldcraft frees Forests), a tile next to an enemy unit stops it (zone of control; a Raider slips by), a unit cannot pass an enemy unit, and some terrain needs a technology (Mountain: Engineering; water: Shorecraft)`;
}

/**
 * Tuning 8: why a city offers no training now, in the words of the city
 * line of `view`.
 */
function noTrainingReasonV7(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): string {
  const slots = citySlotsV7(view, city);
  if (city.cityActionAvailable !== true) return "city action used";
  if (cityBesiegedV7(view, city)) return "besieged";
  if (slots.used >= slots.capacity)
    return `no free slot (${slots.used}/${slots.capacity})`;
  if (view.units.some((unit) => sameV7(unit.at, city.at)))
    return "center occupied";
  return "too dear";
}

/** Tuning 8: the reason behind a rejected `cN.t.ROLE`. */
function noTrainingHintV7(
  prefix: string,
  segments: readonly string[],
  view: PlayerViewV7 | undefined,
): string {
  if (view === undefined || segments[1] !== "t") return "";
  const city = ownCitiesV7(view).find((entry) => `c${entry.id}` === prefix);
  return city === undefined ? "" : ` (${noTrainingReasonV7(view, city)})`;
}

function unknownIdMessageV7(
  id: string,
  offered: readonly OfferedV7[],
  state: GameStateV7,
  view?: PlayerViewV7,
): string {
  const reason =
    view === undefined || state.pendingChoices.length > 0
      ? null
      : moveRejectionReasonV7(view, id);
  if (reason !== null)
    return `"${id}" is not an offered move at state #${state.commandIndex}: ${reason}`;
  const segments = id.toLowerCase().split(".");
  // A tile id is `t.x,y.<action>`: the tile is its first two segments.
  const prefix =
    segments[0] === "t" && segments.length > 1
      ? `${segments[0]}.${segments[1]}`
      : (segments[0] ?? "");
  const related = offered
    .filter((entry) => entry.id.toLowerCase().startsWith(`${prefix}.`))
    .map((entry) => entry.id);
  const hint =
    state.pendingChoices.length > 0
      ? `a city reward choice is pending and only it is offered: ${offered.map((entry) => entry.id).join(" ")}`
      : related.length === 0
        ? `nothing is offered for "${prefix}" now${noTrainingHintV7(prefix, segments, view)}`
        : `offered for ${prefix}: ${related.slice(0, 24).join(" ")}${related.length > 24 ? " ..." : ""}`;
  return `"${id}" is not an offered command at state #${state.commandIndex} (unknown, illegal, or from an older state); ${hint}`;
}

function commandDoV7(args: ArgsV7): string {
  const path = sessionPathV7(args);
  let session = loadSessionV7(args);
  expectStateV7(args, session);
  requireOwnTurnV7(session);
  if (args.positionals.length === 0)
    throw new TextPlayErrorV7("do needs at least one command id (see options)");
  const memory = new UnitMemoryV7();
  const lines: string[] = [];
  let rejection: string | null = null;
  let rejectedDo: SessionV7["rejectedDo"] = null;
  for (const [index, id] of args.positionals.entries()) {
    const view = viewForV7(session.state, session.playerId);
    memory.remember(view);
    const offered = offeredV7(view);
    // The engine's name of the Scouts reward stays a valid id.
    const wanted = id
      .toLowerCase()
      .replace(/\.reward\.survey$/, ".reward.scouts");
    const entry =
      offered.find((candidate) => candidate.id.toLowerCase() === wanted) ??
      offered.find(
        (candidate) => candidate.id.toLowerCase() === id.toLowerCase(),
      );
    if (wanted === "end" || entry?.command.kind === "END_TURN") {
      rejection = `REJECTED ${id}: end the turn with the end command`;
    } else if (view.outcome !== null) {
      rejection = `REJECTED ${id}: the match is over`;
    } else if (entry === undefined) {
      rejection = `REJECTED ${id}: ${unknownIdMessageV7(id, offered, session.state, viewForV7(session.state, session.playerId))}`;
    } else {
      const round = session.state.round;
      const applied = applyObservedV7(
        session.state,
        session.playerId,
        entry.command,
        session.playerId,
        memory,
      );
      if (!applied.accepted) {
        rejection = `REJECTED ${id}: engine refused it: ${applied.reason}`;
      } else {
        lines.push(`OK ${entry.id} -> state #${applied.state.commandIndex}`);
        for (const line of applied.lines) lines.push(`  ${line}`);
        session = withStateV7(
          session,
          applied.state,
          [...session.commands, entry.command],
          {
            ...session.journal,
            notes: [
              ...session.journal.notes,
              ...applied.notes.map((text) => ({ round, text })),
            ],
          },
        );
      }
    }
    if (rejection !== null) {
      lines.push(rejection);
      const skipped = args.positionals.slice(index + 1);
      if (skipped.length > 0) lines.push(`NOT EXECUTED: ${skipped.join(" ")}`);
      rejectedDo = { id, notExecuted: skipped };
      break;
    }
  }
  session = { ...session, rejectedDo };
  saveSessionV7(path, session);
  // `--end`: end the turn only when every id was applied and the turn can
  // end (no pending city reward, the match not over).
  let endRefused: string | null = null;
  if (args.switches.has("end")) {
    const now = viewForV7(session.state, session.playerId);
    if (rejection !== null)
      endRefused =
        "TURN NOT ENDED: --end ends the turn only when every id was applied";
    else if (now.outcome === null) {
      if (offeredV7(now).some((entry) => entry.command.kind === "END_TURN")) {
        lines.push(...endTurnLinesV7(path, session));
        return lines.join("\n");
      }
      endRefused =
        now.pendingChoices.length > 0
          ? "TURN NOT ENDED: a city reward choice is pending; choose it, then end"
          : "TURN NOT ENDED: ending the turn is not offered now";
    }
  }
  if (endRefused !== null) lines.push(endRefused);
  const view = viewForV7(session.state, session.playerId);
  lines.push(
    `== state #${session.state.commandIndex} | round ${view.round} | coins ${view.viewer.coins} | income +${totalIncomeV7(view)}/turn ==`,
  );
  for (const choice of view.pendingChoices)
    lines.push(
      `PENDING CHOICE: city ${cityTagV7(view, choice.cityId)} reached level ${choice.reachedLevel}; choose one with do: ${rewardChoicesTextV7(view, choice)}`,
    );
  if (view.outcome !== null) lines.push(outcomeLineV7(view));
  else lines.push(offeredSummaryV7(offeredV7(view)));
  if (rejection !== null || endRefused !== null)
    throw new TextPlayRejectionV7(lines.join("\n"));
  return lines.join("\n");
}

function commandEndV7(args: ArgsV7): string {
  const path = sessionPathV7(args);
  const session = loadSessionV7(args);
  expectStateV7(args, session);
  requireOwnTurnV7(session);
  const rejected = session.rejectedDo ?? null;
  if (rejected !== null && !args.switches.has("force"))
    throw new TextPlayErrorV7(
      `turn NOT ended: your last do stopped at the rejected id ${rejected.id}${rejected.notExecuted.length === 0 ? "" : ` and did not execute ${rejected.notExecuted.join(" ")}`}. Run options and issue the rest with do, or end the turn anyway with: end --force`,
    );
  return endTurnLinesV7(path, session).join("\n");
}

/** Ends the playing seat's turn, lets the AI seats play, saves, and reports. */
function endTurnLinesV7(path: string, session: SessionV7): string[] {
  const view = requireOwnTurnV7(session);
  const end = offeredV7(view).find(
    (entry) => entry.command.kind === "END_TURN",
  );
  if (end === undefined)
    throw new TextPlayErrorV7(
      view.pendingChoices.length > 0
        ? "you cannot end the turn while a city reward choice is pending (see view)"
        : "ending the turn is not offered now",
    );
  const memory = new UnitMemoryV7();
  memory.remember(view);
  const round = session.state.round;
  const applied = applyObservedV7(
    session.state,
    session.playerId,
    end.command,
    session.playerId,
    memory,
  );
  if (!applied.accepted)
    throw new TextPlayErrorV7(`the engine refused End Turn: ${applied.reason}`);
  // End Turn also starts the next seat's turn; the playing seat's own next
  // Start Turn arrives with the last AI seat's End Turn, below.
  const lines = [`END OF YOUR TURN (round ${round})`];
  for (const line of applied.lines) lines.push(`  ${line}`);
  const ended = withStateV7(
    { ...session, rejectedDo: null },
    applied.state,
    [...session.commands, end.command],
    {
      ...session.journal,
      notes: [
        ...session.journal.notes,
        ...applied.notes.map((text) => ({ round, text })),
      ],
    },
  );
  const played = playAiSeatsV7(ended, memory);
  saveSessionV7(path, played.session);
  for (const line of played.lines)
    lines.push(line.startsWith("--") ? line : `  ${line}`);
  const after = viewForV7(played.session.state, played.session.playerId);
  lines.push("", ...headerLinesV7(played.session, after));
  if (after.outcome === null) lines.push(offeredSummaryV7(offeredV7(after)));
  return lines;
}

// ---------------------------------------------------------------------------
// log
// ---------------------------------------------------------------------------

function commandLogV7(args: ArgsV7): string {
  const session = loadSessionV7(args);
  const only = args.flags.get("round");
  const wanted = only === undefined ? null : Number(only);
  const journal = session.journal;
  const lines = [
    `LOG of ${seatNameV7(viewForV7(session.state, session.playerId), session.playerId)} | state #${session.state.commandIndex} | own view only (start of each of your turns)`,
  ];
  const rounds = journal.rounds.filter(
    (row) => wanted === null || row.round === wanted,
  );
  for (const row of rounds) {
    lines.push(
      `R${row.round} coins ${row.coins} income +${row.income} | cities ${row.cities.length} [${row.cities.map((city) => `c${city.id} L${city.level} pop ${city.population}/${city.level + 1}`).join(", ")}] | units ${Object.values(row.units).reduce((sum, count) => sum + count, 0)} {${Object.entries(
        row.units,
      )
        .map(([label, count]) => `${label} ${count}`)
        .join(", ")}} | techs ${row.techs.length}`,
    );
    for (const note of journal.notes.filter(
      (entry) => entry.round === row.round,
    ))
      lines.push(`   ${note.text}`);
    if (wanted !== null)
      for (const entry of journal.observed.filter(
        (candidate) => candidate.round === row.round,
      )) {
        lines.push("   OBSERVED WHILE THE OTHER SEATS PLAYED");
        for (const line of entry.lines) lines.push(`   ${line}`);
      }
  }
  if (rounds.length === 0) lines.push("(no such round yet)");
  if (wanted === null) {
    const techs = journal.notes.filter((note) =>
      note.text.startsWith("RESEARCHED "),
    );
    lines.push(
      "",
      `TECH ORDER ${techs.map((note) => `R${note.round} ${note.text.slice("RESEARCHED ".length)}`).join(" | ") || "-"}`,
    );
    const count = (prefix: string): number =>
      journal.notes.filter((note) => note.text.startsWith(prefix)).length;
    lines.push(
      `TOTALS units lost ${count("LOST ")} | killed on your turns ${count("KILLED ")} | other deaths seen ${count("SAW DIE ")}`,
      "log --round N adds what you observed while the other seats played that round.",
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// debrief / verify (authoritative replay: hidden information)
// ---------------------------------------------------------------------------

interface DebriefRowV7 {
  readonly round: number;
  /**
   * Score and modes (section 9.4): the seat's score breakdown at the end of
   * its turn of the round (before its End Turn).
   */
  readonly score: PlayerScoreV7;
  readonly coins: number;
  readonly income: number;
  readonly cityLevels: readonly number[];
  readonly units: Readonly<Record<string, number>>;
  readonly techCount: number;
  readonly researched: string[];
  readonly trained: string[];
  attacks: number;
  kills: number;
  losses: number;
  readonly captures: string[];
}

interface DebriefSeatV7 {
  readonly seat: number;
  readonly playerId: PlayerId;
  readonly faction: FactionIdV7;
  readonly controller: string;
  readonly rows: DebriefRowV7[];
  /** Whole-match counts (a row only holds what its own turn recorded). */
  readonly totals: { attacks: number; kills: number; losses: number };
}

interface ReplayedV7 {
  readonly state: GameStateV7;
  readonly seats: readonly DebriefSeatV7[];
}

function replaySessionV7(session: SessionV7): ReplayedV7 {
  const created = createPlayableGameV7(session.setup);
  if (!created.ok)
    throw new TextPlayErrorV7("replay failed: the setup is no longer valid");
  // The giants' signatures (`pulp_wars-w49.30`): a `lab --giant` session.
  let state =
    session.labGiant === true ? withLabGiantV7(created.state) : created.state;
  const seats: DebriefSeatV7[] = state.players.map((player) => ({
    seat: player.seat,
    playerId: player.id,
    faction: player.faction,
    controller: player.id === session.playerId ? "TEXT PLAYER" : "NORMAL AI",
    rows: [],
    totals: { attacks: 0, kills: 0, losses: 0 },
  }));
  const totals = (playerId: number): DebriefSeatV7["totals"] =>
    seats.find((seat) => seat.playerId === playerId)?.totals ?? {
      attacks: 0,
      kills: 0,
      losses: 0,
    };
  const pending = new Map<
    number,
    Pick<
      DebriefRowV7,
      "researched" | "trained" | "attacks" | "kills" | "losses" | "captures"
    >
  >();
  const open = (playerId: number) => {
    let entry = pending.get(playerId);
    if (entry === undefined) {
      entry = {
        researched: [],
        trained: [],
        attacks: 0,
        kills: 0,
        losses: 0,
        captures: [],
      };
      pending.set(playerId, entry);
    }
    return entry;
  };
  for (const [index, command] of session.commands.entries()) {
    const actor = activePlayerV7(state);
    const before = state;
    if (command.kind === "END_TURN") {
      const player = before.players.find((entry) => entry.id === actor);
      const seat = seats.find((entry) => entry.playerId === actor);
      if (player !== undefined && seat !== undefined) {
        const units: Record<string, number> = {};
        for (const unit of allOwnedUnitsV7(before, actor)) {
          if (unit.hp <= 0) continue;
          const label = unitRoleRuleV7(before, unit).label;
          units[label] = (units[label] ?? 0) + 1;
        }
        seat.rows.push({
          round: before.round,
          score: scoresV7(before).find(
            (entry) => entry.playerId === actor,
          ) as PlayerScoreV7,
          coins: player.coins,
          income: playerIncomeV7(before, actor).totalCoins,
          cityLevels: before.cities
            .filter((city) => city.ownerId === actor)
            .map((city) => city.level),
          units,
          techCount: player.researchedTechs.length,
          ...open(actor),
        });
        pending.delete(actor);
      }
    }
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted)
      throw new TextPlayErrorV7(
        `replay failed at command ${index}: ${applied.error.code}`,
      );
    if (command.kind === "ATTACK") {
      open(actor).attacks += 1;
      totals(actor).attacks += 1;
    }
    for (const event of applied.events as readonly DomainEventV7[]) {
      if (event.kind === "TECH_RESEARCHED")
        open(event.playerId).researched.push(event.tech);
      else if (
        event.kind === "UNIT_TRAINED" ||
        event.kind === "NAVAL_UNIT_TRAINED" ||
        event.kind === "EGG_LAID"
      )
        open(event.playerId).trained.push(event.role);
      else if (event.kind === "UNIT_REWARD_GRANTED")
        open(event.playerId).trained.push(`${event.role}(reward)`);
      else if (event.kind === "CITY_CAPTURED")
        open(event.to).captures.push(
          `c${event.cityId} from ${event.from === null ? "neutral" : `P${event.from}`}`,
        );
      else if (event.kind === "UNIT_DIED") {
        const owner = allOwnedUnitsV7(before).find(
          (unit) => unit.id === event.unitId,
        )?.ownerId;
        if (owner === undefined) continue;
        if (!isNeutralOwnerV7(owner)) {
          open(owner).losses += 1;
          totals(owner).losses += 1;
        }
        if (owner !== actor) {
          open(actor).kills += 1;
          totals(actor).kills += 1;
        }
      }
    }
    state = applied.state;
  }
  return { state, seats };
}

function commandVerifyV7(args: ArgsV7): string {
  const session = loadSessionV7(args);
  const replayed = replaySessionV7(session);
  const hash = canonicalHash(replayed.state);
  if (hash !== session.stateHash)
    throw new TextPlayErrorV7(
      `replay of ${session.commands.length} commands gives state hash ${hash}, the session stores ${session.stateHash}`,
    );
  return `VERIFIED: replaying ${session.commands.length} commands from the setup reproduces state #${session.state.commandIndex} (hash ${hash.slice(0, 16)}).`;
}

function commandDebriefV7(args: ArgsV7): string {
  const session = loadSessionV7(args);
  const out = args.flags.get("out");
  if (out === undefined) throw new TextPlayErrorV7("debrief needs --out FILE");
  if (session.state.outcome === null && !args.switches.has("reveal-hidden"))
    throw new TextPlayErrorV7(
      "the match is not over. A debrief reveals every seat's hidden information and spoils the game; pass --reveal-hidden only if you are done playing this session.",
    );
  const replayed = replaySessionV7(session);
  const verified = canonicalHash(replayed.state) === session.stateHash;
  const view = viewForV7(session.state, session.playerId);
  const finalScores = scoresV7(session.state);
  const seatName = (seat: DebriefSeatV7): string =>
    `S${seat.seat} ${FACTION_DISPLAY_NAMES_V7[seat.faction]} (${seat.controller})`;
  const lines = [
    "PULP WARS TEXT-PLAY DEBRIEF",
    "WARNING: this file reveals hidden information of every seat. Read it only after the game.",
    `ruleset ${RULESET_7_ID} | ${session.setup.mapType.toLowerCase()} ${session.setup.width}x${session.setup.height} seed ${session.setup.seed} curiosities ${session.setup.curiosities ? "on" : "off"}${headStartTextV7(session.setup)} | factions ${session.setup.factions.join(",")}`,
    `commands ${session.commands.length} | last round ${session.state.round} | replay ${verified ? "verified (state hash matches)" : "MISMATCH"}`,
    ...(session.state.outcome === null
      ? ["OUTCOME: the match was not finished"]
      : outcomeLinesV7(view)),
  ];
  for (const seat of replayed.seats) {
    const final = session.state.players.find(
      (player) => player.id === seat.playerId,
    );
    lines.push(
      "",
      `SEAT ${seatName(seat)} | final status ${final?.status ?? "?"} | techs ${final?.researchedTechs.map((tech) => techNameV7(seat.faction, tech)).join(",") || "-"}`,
      "round | coins at end of turn | income | cities (levels) | units | techs | actions this turn | score",
    );
    // The Dinosaur pass, correction: the faction's own names (Nesting
    // read as FORTIFICATION and a Triceratops as CATAPULT).
    const techName = (tech: string): string => techNameV7(seat.faction, tech);
    const roleName = (role: string): string => {
      const [id, suffix] = role.split("(") as [string, string | undefined];
      const known = (UNIT_ROLE_IDS_V7 as readonly string[]).includes(id);
      return `${known ? effectiveRoleRuleV7(id as UnitRoleIdV7, seat.faction).label : id}${suffix === undefined ? "" : `(${suffix}`}`;
    };
    for (const row of seat.rows) {
      const actions = [
        row.researched.length > 0
          ? `research ${row.researched.map(techName).join(",")}`
          : "",
        row.trained.length > 0
          ? `train ${row.trained.map(roleName).join(",")}`
          : "",
        row.attacks > 0 ? `attacks ${row.attacks}` : "",
        row.kills > 0 ? `kills ${row.kills}` : "",
        row.losses > 0 ? `losses ${row.losses}` : "",
        row.captures.length > 0 ? `captures ${row.captures.join(",")}` : "",
      ].filter((text) => text !== "");
      lines.push(
        `R${row.round} | ${row.coins} | +${row.income} | ${row.cityLevels.length} (${row.cityLevels.join(",")}) | ${Object.values(row.units).reduce((sum, count) => sum + count, 0)} {${Object.entries(
          row.units,
        )
          .map(([label, count]) => `${label} ${count}`)
          .join(
            ", ",
          )}} | ${row.techCount} | ${actions.join("; ") || "-"} | ${row.score.total} (T${row.score.territory.points} L${row.score.cities.points} R${row.score.technology.points} A${row.score.achievements.points} V${row.score.army.points} K${row.score.kills.points} X${row.score.losses.points} H${row.score.damage.points}${row.score.capReturned > 0 ? ` cap+${row.score.capReturned}` : ""})`,
      );
    }
    const techOrder = seat.rows.flatMap((row) =>
      row.researched.map((tech) => `R${row.round} ${techName(tech)}`),
    );
    const trained = new Map<string, number>();
    for (const row of seat.rows)
      for (const role of row.trained)
        trained.set(role, (trained.get(role) ?? 0) + 1);
    lines.push(
      `TECH ORDER ${techOrder.join(" | ") || "-"}`,
      `TRAINED ${[...trained.entries()].map(([role, count]) => `${roleName(role)} ${count}`).join(", ") || "-"}`,
      `COMBAT attacks made ${seat.totals.attacks} | kills on own turns ${seat.totals.kills} | units lost ${seat.totals.losses} (a row lists a loss in the seat's next own turn when it fell during another seat's turn)`,
      `FINAL SCORE ${scoreBreakdownTextV7(finalScores.find((entry) => entry.playerId === seat.playerId) as PlayerScoreV7)} | peak ${session.state.scoreLedger.find((entry) => entry.playerId === seat.playerId)?.peakScore ?? 0}`,
    );
  }
  lines.push(
    "",
    "Attack refusals are not listed: the Normal AI exposes no telemetry for attacks it considered and declined.",
  );
  const target = resolve(out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    target.endsWith(".json")
      ? `${JSON.stringify(
          {
            warning: "reveals hidden information of every seat",
            rulesetId: RULESET_7_ID,
            setup: session.setup,
            outcome: session.state.outcome,
            // Score and modes (section 9.4): the final scores and the grade.
            score: queryScoreV7(view),
            grade: queryStarGradeV7(view),
            lastRound: session.state.round,
            replayVerified: verified,
            seats: replayed.seats,
          },
          null,
          2,
        )}\n`
      : `${lines.join("\n")}\n`,
  );
  return [
    "WARNING: the debrief reveals hidden information of every seat (economy, technology, armies). Do not read it while you are still playing this session.",
    `DEBRIEF written to ${target} (${replayed.seats.length} seats, ${session.commands.length} commands, replay ${verified ? "verified" : "MISMATCH"}).`,
  ].join("\n");
}

// `npm run play:text -- <command>`. Importing the module (the test) runs
// nothing.
if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = runTextPlayV7(process.argv.slice(2));
  process.stdout.write(`${result.output}\n`);
  process.exitCode = result.exitCode;
}
