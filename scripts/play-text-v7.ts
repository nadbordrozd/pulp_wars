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
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  PROMOTION_HP_V7,
  RULESET_7_ID,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
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
  duplicateFactionV7,
  effectiveRoleRuleV7,
  isNavalRoleV7,
  isNeutralOwnerV7,
  parseGameStateV7,
  playerIncomeV7,
  previewAssembleV7,
  previewAttackExplosionsV7,
  previewBeamDownV7,
  previewBoardV7,
  previewBolasV7,
  previewBombRunV7,
  previewColdSnapV7,
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
  previewSugarTossV7,
  previewTendWoundedV7,
  previewTractorBeamV7,
  previewTunnelV7,
  previewWailV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryIdleRecoveryV7,
  queryLandGrantPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  seatCountAllowedV7,
  unitCapacitySlotsV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  viewForV7,
  type BoardSizeV7,
  type CityId,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type EffectiveRoleRuleV7,
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
  type UnitRoleIdV7,
} from "../src/engine/index";
import {
  BLAST_MOUNTAIN_UNLOCK_TEXT_V7,
  BREACH_UNLOCK_TEXT_V7,
  FIELD_DEFENSE_UNLOCK_TEXT_V7,
  landTradeUnlockTextV7,
} from "../src/render/technology-unlock-text-v7";

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
          [--seat 0] [--curiosities on|off] [--overwrite]
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
        `unknown command "${args.command}" (new, view, tech, options, do, end, log, debrief, verify, help)`,
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

function roleStatsV7(rule: EffectiveRoleRuleV7): string {
  const range =
    rule.minimumRange > 1
      ? `${rule.minimumRange}-${rule.range}`
      : String(rule.range);
  const abilities = rule.abilities.filter((ability) => ability !== "ATTACK");
  return `hp ${rule.maxHp} atk ${halfV7(rule.attack2)} def ${halfV7(rule.defense2)} mov ${rule.move} rng ${range} sight ${rule.sightRadius}${abilities.length === 0 ? "" : ` abilities ${abilities.join(",")}`}`;
}

function techNameV7(faction: FactionIdV7, tech: string): string {
  const override = (
    TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7 as Readonly<
      Record<string, Readonly<Record<string, string>> | undefined>
    >
  )[faction]?.[tech];
  return override === undefined ? tech : `${tech} "${override}"`;
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
    case "SUGAR_TOSS":
      return `u${command.unitId}.toss.u${command.targetUnitId}`;
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
      return `u${command.unitId}.rebake.${xyV7(command.at)}`;
    case "DISEMBARK":
      return `u${command.unitId}.land.${xyV7(command.at)}`;
    case "ASSEMBLE":
      return `u${command.unitId}.assemble.${xyV7(command.to)}`;
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

/** The offered commands with their ids, in the public query's order. */
function offeredV7(view: PlayerViewV7): readonly OfferedV7[] {
  const used = new Map<string, number>();
  return queryPlayerCommandsV7(view).map((command) => {
    const base = textPlayCommandIdV7(command);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    // Two offers with one meaning (two paths to one tile) stay distinct.
    return { id: count === 1 ? base : `${base}~${count}`, command };
  });
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
  STOCKPILE: "+4 Coins",
  WALLS: "City Walls: stronger defense on the city center",
  MILITIA: "free basic unit(s) of your faction",
  BOOM: "+3 population",
  TREASURY_6: "+6 Coins",
  JUGGERNAUT: "a free giant unit",
  TREASURY: "+12 Coins",
};

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
]);

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
      : `no retaliation${preview.noRetaliationReason === null ? "" : ` (${preview.noRetaliationReason})`}`,
    `atk ${halfV7(preview.attack2)} vs def ${halfV7(preview.defense2)}${preview.defenseBonusNumerator === preview.defenseBonusDenominator ? "" : ` x${preview.defenseBonusNumerator}/${preview.defenseBonusDenominator}`}${preview.fortificationLevel > 0 ? ` fort ${preview.fortificationLevel}` : ""}`,
  ];
  if (preview.attacksRemaining > 0)
    parts.push(`attacks left ${preview.attacksRemaining}`);
  if (preview.push !== "BLOCKED") parts.push(`push ${preview.push}`);
  const extra = compactFieldsV7(preview, context, COMBAT_BASE_KEYS_V7, true);
  if (extra !== "") parts.push(extra);
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
                : ""
          }`
        : `cmd ${unlock.command} (${spatial.cost}c, output by neighbours)`;
    }
    case "UNIT_ROLE": {
      const rule = effectiveRoleRuleV7(unlock.role, faction);
      return `unit ${rule.label} [${unlock.role}] ${rule.cost === null ? "not trainable" : `${rule.cost}c`} ${roleStatsV7(rule)}`;
    }
    case "RESOURCE_REVEAL":
      return `reveals ${unlock.resources.join(",").toLowerCase()}`;
    // Tuning 1 (7r46): the tech card's sentences for the changed effects.
    case "MELEE_FIELD_DEMOLITION":
      return `${BREACH_UNLOCK_TEXT_V7} [${unlock.kind}]`;
    case "LAND_TRADE_INCOME":
      return `${landTradeUnlockTextV7(unlock.coins)} [${unlock.kind}]`;
    default: {
      const fields = Object.entries(unlock)
        .filter(([key]) => key !== "kind")
        .map(([key, value]) => `${key}=${String(value)}`);
      return `${unlock.kind}${fields.length === 0 ? "" : `(${fields.join(" ")})`}`;
    }
  }
}

function economicTextV7(view: PlayerViewV7, command: CommandV7): string {
  const result = previewEconomicV7(view, command);
  if (!result.ok) return "no exact public preview";
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
      return `${command.kind === "MOVE" ? "move" : "disembark"} to ${xyV7(to)} (${tileBriefV7(view, to)})${via}${near.length === 0 ? "" : ` | next to hostile ${near.map((other) => context.memory.tag(other.id)).join(" ")}`}`;
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
      return `${head}: ${combatTextV7(preview as never, context, {
        attacker: unit?.hp ?? null,
        defender: target?.hp ?? null,
      })}${blast === "" ? "" : ` | explosions ${blast}`}`;
    }
    case "CAPTURE": {
      const city =
        unit === undefined
          ? undefined
          : view.cities.find((candidate) => sameV7(candidate.at, unit.at));
      const where = unit === undefined ? "" : ` @${xyV7(unit.at)}`;
      return city === undefined
        ? `capture the settlement${where} (a neutral village becomes your level-1 city)`
        : `capture city c${city.id}${where} from ${seatNameV7(view, city.ownerId)} (L${city.level}${city.isCapital ? ", its capital" : ""})`;
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
    case "DISBAND":
      return "disband the unit (frees its city slot; the refund is in the result)";
    case "PILLAGE":
      return unit === undefined
        ? "pillage the improvement under the unit"
        : `pillage (${tileBriefV7(view, unit.at)}): destroys the improvement, +1 Coin`;
    case "BUILD_FIELD_DEFENSE":
      return "build a Field Defense on this tile (3c): fortifies units standing here | the unit keeps its move and its action";
    case "RALLY":
      return "rally: inspires own units in reach (bonus on their next attack)";
    case "TEND_WOUNDED":
      return `tend wounded${generic(previewTendWoundedV7(view, command.unitId))}`;
    case "WAIL":
      return `wail${generic(previewWailV7(view, command.unitId))}`;
    case "KABOOM":
      return `kaboom${generic(previewKaboomV7(view, command.unitId))}`;
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
      return `cold snap${generic(previewColdSnapV7(view, command.unitId))}`;
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
    case "SUGAR_RUSH":
      return `sugar rush${generic(previewSugarRushV7(view, command.unitId))}`;
    case "REBAKE":
      return `re-bake at ${xyV7(command.at)}${generic(previewRebakeV7(view, command.unitId))}`;
    case "SUGAR_TOSS":
      return `sugar toss to ${context.memory.tag(command.targetUnitId)}${generic(previewSugarTossV7(view, command.unitId))}`;
    case "TRAIN": {
      const rule = effectiveRoleRuleV7(command.role, view.viewer.faction);
      const city = view.cities.find(
        (candidate) => candidate.id === command.cityId,
      );
      const slots = city === undefined ? null : citySlotsV7(view, city);
      const cost = trainingCostV7(view, command.cityId, command.role);
      return `train ${rule.label} for ${cost}c (coins ${view.viewer.coins}->${view.viewer.coins - cost}) | ${roleStatsV7(rule)}${slots === null ? "" : ` | city slots ${slots.used}/${slots.capacity} before`} | uses the city action`;
    }
    case "TRAIN_NAVAL": {
      const rule = effectiveRoleRuleV7(command.role, view.viewer.faction);
      return `build ${rule.label} at ${xyV7(command.at)} (base ${rule.cost ?? "?"}c, a Shipyard takes 2 off) | ${roleStatsV7(rule)}`;
    }
    case "LAY_EGG": {
      const rule = effectiveRoleRuleV7(command.role, view.viewer.faction);
      return `lay a ${rule.label} egg at ${xyV7(command.at)}${generic(previewLayEggV7(view, command.cityId, command.role))}`;
    }
    case "LAND_GRANT": {
      const grant = queryLandGrantPreviewV7(view, command.cityId);
      const cost = grant?.cost ?? 6;
      const claim = grant?.tiles.length ?? 0;
      return `Land Grant for ${cost}c (2c per explored neutral tile, at least 6c; coins ${view.viewer.coins}->${view.viewer.coins - cost}): the city claims every neutral tile of its 5x5 area (${claim} explored neutral tiles now; unexplored neutral ones are claimed and revealed too, free) | once per city | uses the city action`;
    }
    case "CHOOSE_CITY_REWARD": {
      const special =
        command.reward === "JUGGERNAUT"
          ? `a free ${effectiveRoleRuleV7("JUGGERNAUT", view.viewer.faction).label}`
          : command.reward === "MILITIA"
            ? `free ${effectiveRoleRuleV7("FIGHTER", view.viewer.faction).label}(s) at the city`
            : (REWARD_TEXT_V7[command.reward] ?? command.reward);
      return `reward for city c${command.cityId} reaching level ${command.reachedLevel}: ${special}`;
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
      if (event.playerId === me)
        lines.push(
          `REVEALED ${event.tiles.length} tiles: ${event.tiles.slice(0, 16).map(xyV7).join(" ")}${event.tiles.length > 16 ? " ..." : ""}`,
        );
      break;
    case "UNIT_MOVED": {
      const from = context.memory.position(event.unitId);
      lines.push(
        `MOVE ${context.memory.tag(event.unitId)} ${from === null ? "" : `${xyV7(from)}>`}${event.path.map(xyV7).join(">")}`,
      );
      break;
    }
    case "COMBAT_RESOLVED": {
      const preview = event.preview;
      lines.push(
        `COMBAT ${context.memory.tag(preview.attackerId)} attacks ${context.memory.tag(preview.targetUnitId)}: ${combatTextV7(preview as never, context, { attacker: null, defender: null })}`,
      );
      break;
    }
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
    case "TECH_RESEARCHED":
      lines.push(
        `RESEARCHED ${seatLabelV7(context.view, event.playerId)} ${event.tech} for ${event.cost}c`,
      );
      if (event.playerId === me)
        notes.push(`RESEARCHED ${event.tech} (${event.cost}c)`);
      break;
    case "CITY_CAPTURED": {
      const city = context.view.cities.find(
        (candidate) => candidate.id === event.cityId,
      );
      const text = `CITY_CAPTURED c${event.cityId}${city === undefined ? "" : ` @${xyV7(city.at)}`} by ${seatLabelV7(context.view, event.to)} from ${event.from === null ? "neutral" : seatLabelV7(context.view, event.from)}`;
      lines.push(text);
      notes.push(text);
      break;
    }
    case "CITY_LEVELED_UP": {
      const city = context.view.cities.find(
        (candidate) => candidate.id === event.cityId,
      );
      lines.push(`CITY_LEVELED_UP c${event.cityId} to level ${event.level}`);
      if (city?.ownerId === me)
        notes.push(`LEVEL c${event.cityId} reached ${event.level}`);
      break;
    }
    case "UNIT_TRAINED":
      lines.push(
        `TRAINED ${context.memory.tag(event.unitId)} in c${event.cityId} @${xyV7(event.at)} for ${event.cost}c`,
      );
      if (event.playerId === me)
        notes.push(
          `TRAINED ${event.role} in c${event.cityId} (${event.cost}c)`,
        );
      break;
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
    default: {
      const text = `${event.kind} ${compactFieldsV7(event as unknown as Record<string, unknown>, context)}`;
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
  positions.remember(viewForV7(state, viewerId));
  memory.remember(afterView);
  const context: TextContextV7 = {
    view: afterView,
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
  const duplicate = duplicateFactionV7(factions);
  if (duplicate !== null)
    throw new TextPlayErrorV7(
      `every seat needs a different faction (${duplicate.faction} repeats)`,
    );
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
    `NEW MATCH: ${mapType.toLowerCase()} ${size}x${size} seed ${setup.seed} curiosities ${curiositiesRaw} | session ${path}`,
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
};

const LEGEND_V7 = [
  "LEGEND cell = terrain feature mark owner unit (7 chars), ??????? = unexplored. There is no re-fog: an explored tile shows everything on it.",
  "  terrain: . grass  f forest  ^ mountain  ~ shallow water  = deep water  # rift",
  "  feature: C capital  c city  v neutral village | F farm L lumber camp M mine W windmill S sawmill G forge K workshop $ market O monument P port Y shipyard | r fruit g fertile ground a game o ore h fish p pearls * hidden resource  - none",
  "  mark: ! treasure chest  & curiosity  d field defense  + road  x grave  i ice  m crumbs  - none | owner: seat digit of the territory, - neutral",
  "  unit: seat digit (N = neutral monster) + role code Fi fighter Ra raider Mk marksman Gd guard Cp captain Ct catapult Kn knight Jg juggernaut Pb patrol boat Bs battleship Sb submarine, lowercase e- = egg, --- none",
];

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
          : tile.fieldDefense
            ? "d"
            : tile.road
              ? "+"
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
      const code =
        unit === undefined
          ? "---"
          : `${seatLabelV7(view, unit.ownerId).replace("S", "")}${unit.form === "EGG" ? "e-" : ROLE_CODE_V7[unit.role]}`;
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
  const egg = view.eggs.find((entry) => entry.unitId === unit.id);
  if (egg !== undefined) parts.push(`hatches in ${egg.turnsRemaining}`);
  const plague = view.plagued.find((entry) => entry.unitId === unit.id);
  if (plague !== undefined) parts.push(`plagued ${plague.turnsRemaining}`);
  if (view.bitten.some((entry) => entry.unitId === unit.id))
    parts.push("bitten");
  const chill = view.chilled.find((entry) => entry.unitId === unit.id);
  if (chill !== undefined)
    parts.push(
      `chilled ${chill.turnsLeft}${chill.sluggish ? " sluggish" : ""}`,
    );
  if (view.mindControlled.some((entry) => entry.unitId === unit.id))
    parts.push("mind-controlled");
  const rush = view.sugarRush.find((entry) => entry.unitId === unit.id);
  if (rush !== undefined) parts.push(rush.phase.toLowerCase());
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
    `${unitLabelV7(view, unit)} [${unit.role}]`,
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
  }
  if (status !== "") parts.push(`| ${status}`);
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
  const lines = [
    `== state #${state.commandIndex} | ${RULESET_7_ID} | ${view.setup.mapType.toLowerCase()} ${view.board.width}x${view.board.height} seed ${view.setup.seed} ==`,
    `ROUND ${view.round} | you are ${seatNameV7(view, view.viewer.id)} | ${view.outcome !== null ? "MATCH OVER" : active === view.viewer.id ? "YOUR TURN" : `waiting for ${seatLabelV7(view, active ?? 0)}`} | coins ${view.viewer.coins} | income +${totalIncomeV7(view)}/turn | cities ${ownCitiesV7(view).length} | units ${allOwnedUnitsV7(view, view.viewer.id).length}`,
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
          `S${entry.seat} ${FACTION_DISPLAY_NAMES_V7[entry.faction]}${entry.isViewer ? " (you)" : " (AI)"} ${entry.status.toLowerCase()} cities ${entry.cityCount} units ${entry.livingUnitCount}`,
      )
      .join(" > ")}`,
  ];
  if (view.outcome !== null) lines.push(outcomeLineV7(view));
  for (const choice of view.pendingChoices)
    lines.push(
      `PENDING CHOICE: city c${choice.cityId} reached level ${choice.reachedLevel}; choose one with do: ${choice.candidates.map((reward) => `c${choice.cityId}.reward.${reward}`).join(" | ")} (nothing else is offered until you choose)`,
    );
  return lines;
}

function outcomeLineV7(view: PlayerViewV7): string {
  const outcome = view.outcome;
  if (outcome === null) return "OUTCOME: none yet";
  if (outcome.kind === "DEFEAT")
    return `OUTCOME: DEFEAT in round ${view.round}: you were eliminated by ${seatNameV7(view, outcome.defeatedByPlayerId)}`;
  return `OUTCOME: ${outcome.winnerId === view.viewer.id ? "VICTORY" : "DEFEAT"} in round ${view.round}: ${seatNameV7(view, outcome.winnerId)} won`;
}

function viewLinesV7(session: SessionV7, full: boolean): string[] {
  const view = viewForV7(session.state, session.playerId);
  const offered = offeredV7(view);
  const lines = headerLinesV7(session, view);
  lines.push(
    "",
    "MAP",
    ...mapLinesV7(view),
    ...LEGEND_V7.slice(0, full ? 5 : 1),
  );
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
  if (view.crumbs.length > 0)
    specials.push(
      `crumbs: ${view.crumbs.map((entry) => `${xyV7(entry.at)}(${seatLabelV7(view, entry.ownerId)})`).join(" ")}`,
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
      const why =
        city.cityActionAvailable !== true
          ? "city action used"
          : cityBesiegedV7(view, city)
            ? "besieged"
            : cost > view.viewer.coins
              ? "too dear"
              : slots.used >= slots.capacity
                ? "no free slot"
                : view.units.some((unit) => sameV7(unit.at, city.at))
                  ? "center occupied"
                  : "not offered";
      return `${rule.label} ${cost}c${id === undefined ? ` (${why})` : ` [${id.startsWith(`c${city.id}.egg`) ? `c${city.id}.egg.${role}.x,y` : id}]`}`;
    });
    lines.push(
      `c${city.id} ${city.isCapital ? "CAPITAL" : "city"} @${xyV7(city.at)} L${city.level} pop ${city.population}/${city.level + 1} income +${cityIncomeV7(view, city)} slots ${slots.used}/${slots.capacity} action ${city.cityActionAvailable === true ? "ready" : "used"}${cityBesiegedV7(view, city) ? " BESIEGED" : ""}${city.landGrantUsed ? " land-grant-used" : ""}${city.rewards.length === 0 ? "" : ` rewards ${city.rewards.map((entry) => entry.reward).join(",")}`}`,
    );
    lines.push(`   train: ${trainable.join(" | ")}`);
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

  const otherCities = view.cities.filter(
    (city) => city.ownerId !== view.viewer.id,
  );
  lines.push("", "KNOWN OTHER CITIES");
  for (const city of otherCities) {
    const garrison = view.units.find((unit) => sameV7(unit.at, city.at));
    lines.push(
      `c${city.id} ${seatNameV7(view, city.ownerId)} ${city.isCapital ? "CAPITAL" : "city"} @${xyV7(city.at)} L${city.level} pop ${city.population}/${city.level + 1}${city.rewards.some((entry) => entry.reward === "WALLS") ? " WALLS" : ""}${garrison === undefined ? " center empty" : ` center ${unitTagV7(view, garrison)}`}`,
    );
  }
  if (otherCities.length === 0) lines.push("(none)");

  lines.push(
    "",
    `TECH researched ${view.viewer.researchedTechs.length}: ${view.viewer.researchedTechs.join(", ") || "-"}`,
  );
  if (tree !== null)
    lines.push(
      `   available: ${
        tree.nodes
          .filter((node) => node.state === "AVAILABLE")
          .map(
            (node) =>
              `${node.id} ${node.cost}c${node.affordable ? "" : " (too dear)"}`,
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
        const meaning =
          entry.achievement === "SLAYER"
            ? " (most kills by one living unit)"
            : "";
        return `${entry.achievement} ${progress}${meaning}${entitlement?.spent === true ? " built" : entitlement?.unlocked === true ? " UNLOCKED (monument available)" : ""}`;
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
    `TECH TREE ${FACTION_DISPLAY_NAMES_V7[tree.faction]} | state #${session.state.commandIndex} | coins ${view.viewer.coins} | cities ${tree.ownedCityCount} (costs grow with your city count) | researched ${view.viewer.researchedTechs.length}/${tree.nodes.length}`,
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
    return lines.join("\n");
  }
  if (cityFlag !== undefined) {
    const id = parseIdNumberV7(cityFlag, "c", "--city");
    const city = view.cities.find((candidate) => candidate.id === id);
    if (city === undefined)
      throw new TextPlayErrorV7(`no known city c${id} (see view)`);
    lines.push(
      "",
      `c${id} ${seatNameV7(view, city.ownerId)} @${xyV7(city.at)} L${city.level} pop ${city.population}/${city.level + 1}`,
    );
    const mine = offered.filter(
      (entry) => commandCityIdV7(view, entry.command) === id,
    );
    if (mine.length === 0) lines.push("(no command is offered for this city)");
    for (const entry of mine) lines.push(row(entry));
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
  section("REWARD CHOICE (must be made first)", group("reward"));
  section("RESEARCH", group("research"));
  section("TRAIN", group("train"));
  section("CITY", group("city"));
  section("TILES", group("tile"));
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
    lines.push(
      `${unit === undefined ? `u${id}` : `${unitTagV7(view, unit)} @${xyV7(unit.at)} hp ${unit.hp}/${unit.maxHp}`}`,
    );
    for (const entry of actions) lines.push(`  ${row(entry)}`);
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

function unknownIdMessageV7(
  id: string,
  offered: readonly OfferedV7[],
  state: GameStateV7,
): string {
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
        ? `nothing is offered for "${prefix}" now`
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
    const wanted = id.toLowerCase();
    const entry = offered.find(
      (candidate) => candidate.id.toLowerCase() === wanted,
    );
    if (wanted === "end" || entry?.command.kind === "END_TURN") {
      rejection = `REJECTED ${id}: end the turn with the end command`;
    } else if (view.outcome !== null) {
      rejection = `REJECTED ${id}: the match is over`;
    } else if (entry === undefined) {
      rejection = `REJECTED ${id}: ${unknownIdMessageV7(id, offered, session.state)}`;
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
      `PENDING CHOICE: city c${choice.cityId} reached level ${choice.reachedLevel}; choose one with do: ${choice.candidates.map((reward) => `c${choice.cityId}.reward.${reward}`).join(" | ")}`,
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
  let state = created.state;
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
  const seatName = (seat: DebriefSeatV7): string =>
    `S${seat.seat} ${FACTION_DISPLAY_NAMES_V7[seat.faction]} (${seat.controller})`;
  const lines = [
    "PULP WARS TEXT-PLAY DEBRIEF",
    "WARNING: this file reveals hidden information of every seat. Read it only after the game.",
    `ruleset ${RULESET_7_ID} | ${session.setup.mapType.toLowerCase()} ${session.setup.width}x${session.setup.height} seed ${session.setup.seed} curiosities ${session.setup.curiosities ? "on" : "off"} | factions ${session.setup.factions.join(",")}`,
    `commands ${session.commands.length} | last round ${session.state.round} | replay ${verified ? "verified (state hash matches)" : "MISMATCH"}`,
    session.state.outcome === null
      ? "OUTCOME: the match was not finished"
      : outcomeLineV7(view),
  ];
  for (const seat of replayed.seats) {
    const final = session.state.players.find(
      (player) => player.id === seat.playerId,
    );
    lines.push(
      "",
      `SEAT ${seatName(seat)} | final status ${final?.status ?? "?"} | techs ${final?.researchedTechs.join(",") || "-"}`,
      "round | coins at end of turn | income | cities (levels) | units | techs | actions this turn",
    );
    for (const row of seat.rows) {
      const actions = [
        row.researched.length > 0 ? `research ${row.researched.join(",")}` : "",
        row.trained.length > 0 ? `train ${row.trained.join(",")}` : "",
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
          .join(", ")}} | ${row.techCount} | ${actions.join("; ") || "-"}`,
      );
    }
    const techOrder = seat.rows.flatMap((row) =>
      row.researched.map((tech) => `R${row.round} ${tech}`),
    );
    const trained = new Map<string, number>();
    for (const row of seat.rows)
      for (const role of row.trained)
        trained.set(role, (trained.get(role) ?? 0) + 1);
    lines.push(
      `TECH ORDER ${techOrder.join(" | ") || "-"}`,
      `TRAINED ${[...trained.entries()].map(([role, count]) => `${role} ${count}`).join(", ") || "-"} (mechanical roles)`,
      `COMBAT attacks made ${seat.totals.attacks} | kills on own turns ${seat.totals.kills} | units lost ${seat.totals.losses} (a row lists a loss in the seat's next own turn when it fell during another seat's turn)`,
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
