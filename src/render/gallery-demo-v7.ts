import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  buildMissionStateV7,
  effectiveRoleRuleV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
  type UnitRoleAbilityV7,
  type UnitRoleIdV7,
} from "../engine/index";

/**
 * The Gallery's animation preview (bead pulp_wars-ic8): a small demo board
 * on which a faction's unit plays its attack and its ability cues. The
 * scene is a real (throwaway) Ruleset 7 state built from an authored board
 * with the mission builder, and each cue is a real command applied by the
 * engine, so the board host plays exactly the presentation a match shows:
 * the lunge, arrow, stone, ray, bolt, blast, tunnel or halo of that unit.
 * Nothing here is saved or replayed; the state never leaves the Gallery.
 *
 * The board (11 x 11, the smallest mission size) is fully explored. The
 * viewer's capital is the camera's focus, so the action is placed round it:
 *
 * ```text
 *      x 0123456789A
 * y  0   ...........
 *    1   .^.......E.     E: the enemy capital (out of view)
 *    2   ........f..
 *    3   .f.+.......     +: a Grave (Raise Dead) when the cue needs one
 *    4   ....C......     C: the unit's capital, with a friendly Fighter
 *    5   ...UT......     U: the unit; T: the target, 1-3 tiles east
 *    6   ~~~~~~~~~~~
 * ```
 *
 * A ship's scene moves the capital to (2, 5), on the coast; the ship
 * stands at (3, 6) and its target at (4, 5).
 */

/** The cues the preview can play, one per unit ability with a command. */
export type GalleryDemoCueV7 =
  | "ATTACK"
  | "KABOOM"
  | "WAIL"
  | "RAISE_DEAD"
  | "DEVOUR"
  | "RALLY"
  | "TEND_WOUNDED"
  | "BEAM_DOWN"
  | "MIND_CONTROL"
  | "TRACTOR_BEAM"
  | "THROW_BOLAS"
  | "COLD_SNAP"
  | "TUNNEL"
  | "BOMB_RUN"
  | "ASSEMBLE";

/** The command-backed abilities and the cue that shows each. */
const ABILITY_CUES_V7: Partial<Record<UnitRoleAbilityV7, GalleryDemoCueV7>> = {
  ATTACK: "ATTACK",
  KABOOM: "KABOOM",
  WAIL: "WAIL",
  RAISE_DEAD: "RAISE_DEAD",
  DEVOUR: "DEVOUR",
  RALLY: "RALLY",
  TEND_WOUNDED: "TEND_WOUNDED",
  BEAM_DOWN: "BEAM_DOWN",
  MIND_CONTROL: "MIND_CONTROL",
  TRACTOR_BEAM: "TRACTOR_BEAM",
  BOLAS: "THROW_BOLAS",
  COLD_SNAP: "COLD_SNAP",
  TUNNEL: "TUNNEL",
  BOMB_RUN: "BOMB_RUN",
  ASSEMBLE: "ASSEMBLE",
};

/** The ability whose name labels a cue's button. */
export const GALLERY_DEMO_CUE_ABILITIES_V7: Readonly<
  Record<GalleryDemoCueV7, UnitRoleAbilityV7>
> = {
  ATTACK: "ATTACK",
  KABOOM: "KABOOM",
  WAIL: "WAIL",
  RAISE_DEAD: "RAISE_DEAD",
  DEVOUR: "DEVOUR",
  RALLY: "RALLY",
  TEND_WOUNDED: "TEND_WOUNDED",
  BEAM_DOWN: "BEAM_DOWN",
  MIND_CONTROL: "MIND_CONTROL",
  TRACTOR_BEAM: "TRACTOR_BEAM",
  THROW_BOLAS: "BOLAS",
  COLD_SNAP: "COLD_SNAP",
  TUNNEL: "TUNNEL",
  BOMB_RUN: "BOMB_RUN",
  ASSEMBLE: "ASSEMBLE",
};

export interface GalleryDemoSceneV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  readonly cue: GalleryDemoCueV7;
  /** The board before the cue: the unit ready, the target in reach. */
  readonly before: PlayerViewV7;
  /** The board after the engine applied the cue's command. */
  readonly after: PlayerViewV7;
  /** The viewer's events of that command, for the board presentation. */
  readonly events: PlayerEventEnvelopeV7;
  /** The commands offered before the cue (they draw the ready ring). */
  readonly offeredCommands: readonly CommandV7[];
  /** The commands offered after it (the unit that acted loses its ring). */
  readonly afterCommands: readonly CommandV7[];
  readonly command: CommandV7;
}

const SIZE = 11;
const CAPITAL: CoordV7 = { x: 4, y: 4 };
/** A ship's scene sits one row lower, on the coast, so the ship shows whole. */
const NAVAL_CAPITAL: CoordV7 = { x: 2, y: 5 };
const UNIT: CoordV7 = { x: 3, y: 5 };
const SHIP: CoordV7 = { x: 3, y: 6 };
const ENEMY_CAPITAL: CoordV7 = { x: 9, y: 1 };
const TERRAIN: readonly string[] = [
  "...........",
  ".^.........",
  "........f..",
  ".f.........",
  "...........",
  "...........",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
];

function naval(role: UnitRoleIdV7): boolean {
  return role === "PATROL_BOAT" || role === "BATTLESHIP";
}

/**
 * The faction of the demo target: a Human Guard, or for the Humans a Goblin
 * Orc Brute (a sturdy unit with no blast of its own, so the cue reads).
 */
export function galleryDemoTargetFactionV7(faction: FactionIdV7): FactionIdV7 {
  return faction === "ORIGINAL" ? "GOBLIN" : "ORIGINAL";
}

/**
 * The cues a faction's role offers, in its ability order (the attack
 * first); only cues whose demo command the engine offers are listed.
 */
export function galleryDemoCuesV7(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
): readonly GalleryDemoCueV7[] {
  const cues = effectiveRoleRuleV7(role, faction).abilities.flatMap(
    (ability) => {
      const cue = ABILITY_CUES_V7[ability];
      return cue === undefined ? [] : [cue];
    },
  );
  return [...new Set(cues)].filter(
    (cue) => buildGalleryDemoSceneV7(faction, role, cue) !== null,
  );
}

function targetAt(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  cue: GalleryDemoCueV7,
): CoordV7 {
  if (naval(role)) return { x: SHIP.x + 1, y: SHIP.y - 1 };
  if (cue === "TRACTOR_BEAM") return { x: UNIT.x + 2, y: UNIT.y };
  if (cue === "TUNNEL") return { x: UNIT.x + 3, y: UNIT.y };
  if (cue !== "ATTACK") return { x: UNIT.x + 1, y: UNIT.y };
  const rule = effectiveRoleRuleV7(role, faction);
  return { x: UNIT.x + Math.max(1, rule.minimumRange), y: UNIT.y };
}

function missionFor(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  cue: GalleryDemoCueV7,
): MissionDefinitionV7 {
  const enemy = galleryDemoTargetFactionV7(faction);
  const at = naval(role) ? SHIP : UNIT;
  const graves =
    faction === "UNDEAD" && cue === "RAISE_DEAD"
      ? [{ x: UNIT.x, y: UNIT.y - 1 }]
      : faction === "UNDEAD" && cue === "DEVOUR"
        ? [UNIT]
        : [];
  return {
    id: "GALLERY_DEMO",
    revision: 1,
    hidden: true,
    size: SIZE,
    seed: 1,
    terrain: TERRAIN,
    resources: TERRAIN.map(() => ".".repeat(SIZE)),
    biome: "PLAINS",
    villages: [],
    graves,
    aiMode: "RIVAL",
    seats: [
      {
        faction,
        coins: 60,
        technologies: [...TECHNOLOGY_IDS_V7],
        cities: [
          { at: naval(role) ? NAVAL_CAPITAL : CAPITAL, level: 1, rewards: [] },
        ],
        units: [
          { role, at },
          { role: "FIGHTER", at: naval(role) ? NAVAL_CAPITAL : CAPITAL },
        ],
        reveal: { radius: 0, rects: [{ x0: 0, y0: 0, x1: 10, y1: 10 }] },
      },
      {
        faction: enemy,
        coins: 0,
        technologies: [],
        cities: [{ at: ENEMY_CAPITAL, level: 1, rewards: [] }],
        units: [{ role: "GUARD", at: targetAt(faction, role, cue) }],
        reveal: { radius: 1 },
      },
    ],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  };
}

function setupFor(faction: FactionIdV7): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: SIZE,
    height: SIZE,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, galleryDemoTargetFactionV7(faction)],
    // The authored board is built directly (never through the mission
    // registry); the state stays in the Gallery.
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    curiosities: false,
  };
}

/**
 * Wounds the units a cue needs wounded: Mind Control takes only a wounded
 * unit, and Tend and Repair heal only one.
 */
function wounded(
  state: GameStateV7,
  cue: GalleryDemoCueV7,
  unitId: number,
): GameStateV7 {
  if (cue !== "MIND_CONTROL" && cue !== "TEND_WOUNDED") return state;
  const viewerId = state.players[0]?.id;
  return {
    ...state,
    units: state.units.map((unit) => {
      const enemy = unit.ownerId !== viewerId;
      const companion = unit.ownerId === viewerId && unit.id !== unitId;
      if (cue === "MIND_CONTROL" && enemy) return { ...unit, hp: 5 };
      if (cue === "TEND_WOUNDED" && companion)
        return { ...unit, hp: Math.max(1, unit.maxHp - 4) };
      return unit;
    }),
  };
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

/** The command a cue plays among the unit's offered commands. */
function cueCommand(
  cue: GalleryDemoCueV7,
  commands: readonly CommandV7[],
  targetId: number | undefined,
  target: CoordV7,
): CommandV7 | undefined {
  const own = commands.filter((command) => command.kind === cue);
  if (cue === "TUNNEL")
    // Surface beside the target, alone, so the eruption reaches it.
    return (
      own.find(
        (command) =>
          command.kind === "TUNNEL" &&
          command.rider === null &&
          chebyshev(command.to, target) === 1,
      ) ?? own.find((command) => command.kind === "TUNNEL")
    );
  return (
    own.find(
      (command) =>
        "targetUnitId" in command && command.targetUnitId === targetId,
    ) ?? own[0]
  );
}

/**
 * The scene of one cue: the board before, the board after the engine
 * applied the cue's command, and the viewer's events. Null when the role
 * has no such cue or the engine does not offer it on the demo board.
 */
export function buildGalleryDemoSceneV7(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  cue: GalleryDemoCueV7,
): GalleryDemoSceneV7 | null {
  let state: GameStateV7;
  try {
    state = buildMissionStateV7(
      missionFor(faction, role, cue),
      setupFor(faction),
    );
  } catch {
    return null;
  }
  const viewerId = state.players[0]?.id;
  if (viewerId === undefined) return null;
  const at = naval(role) ? SHIP : UNIT;
  const unit = state.units.find(
    (candidate) =>
      candidate.ownerId === viewerId &&
      candidate.at.x === at.x &&
      candidate.at.y === at.y,
  );
  if (unit === undefined) return null;
  state = wounded(state, cue, unit.id);
  const target = targetAt(faction, role, cue);
  const targetUnit = state.units.find(
    (candidate) => candidate.ownerId !== viewerId,
  );
  const before = viewForV7(state, viewerId);
  const offeredCommands = queryPlayerCommandsV7(before);
  const command = cueCommand(
    cue,
    offeredCommands.filter(
      (candidate) => "unitId" in candidate && candidate.unitId === unit.id,
    ),
    targetUnit?.id,
    target,
  );
  if (command === undefined) return null;
  const applied = applyCommandV7(state, viewerId, command);
  if (!applied.accepted) return null;
  const after = viewForV7(applied.state, viewerId);
  return {
    faction,
    role,
    cue,
    before,
    after,
    events: projectEventsV7(state, applied.state, viewerId, applied.events),
    offeredCommands,
    afterCommands: queryPlayerCommandsV7(after),
    command,
  };
}
