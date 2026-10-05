import {
  HEAVY_TRACTOR_RANGE_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  TRACTOR_BEAM_RANGE_V7,
  applyCommandV7,
  buildMissionStateV7,
  effectiveRoleRuleV7,
  isNavalRoleV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
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
 * Bead pulp_wars-1wy.5: a Mothership's Tractor Beam target stands three
 * tiles east, so its heavy pull slides the target two tiles. For a Beam
 * Down the friendly Fighter (a Grunt) stands at (3, 3), next to the capital
 * and three tiles from the target at (6, 5), which it cannot reach; the
 * carrier sets it down at (4, 5) and it shoots on arrival (the scene's
 * second step).
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
  | "ASSEMBLE"
  // The Candy revision (bead pulp_wars-jdb.6).
  | "SUGAR_RUSH"
  | "REBAKE"
  | "SUGAR_TOSS";

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
  SUGAR_RUSH: "SUGAR_RUSH",
  REBAKE: "REBAKE",
  SUGAR_TOSS: "SUGAR_TOSS",
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
  SUGAR_RUSH: "SUGAR_RUSH",
  REBAKE: "REBAKE",
  SUGAR_TOSS: "SUGAR_TOSS",
};

/** One command of a scene and the boundary the board host plays for it. */
export interface GalleryDemoStepV7 {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  /** The viewer's events of the command, for the board presentation. */
  readonly events: PlayerEventEnvelopeV7;
  readonly command: CommandV7;
}

export interface GalleryDemoSceneV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  readonly cue: GalleryDemoCueV7;
  /** The board before the cue: the unit ready, the target in reach. */
  readonly before: PlayerViewV7;
  /** The board after the engine applied every command of the scene. */
  readonly after: PlayerViewV7;
  /** The viewer's events of the cue's own command (the first step). */
  readonly events: PlayerEventEnvelopeV7;
  /** The commands offered before the cue (they draw the ready ring). */
  readonly offeredCommands: readonly CommandV7[];
  /** The commands offered after it (the unit that acted loses its ring). */
  readonly afterCommands: readonly CommandV7[];
  /** The cue's own command (the first step). */
  readonly command: CommandV7;
  /**
   * The commands the scene plays, in order (bead pulp_wars-1wy.5): the
   * cue's own, and for a Beam Down the beamed unit's attack on arrival
   * ("beam down and shoot"). Every other cue is one step.
   */
  readonly steps: readonly GalleryDemoStepV7[];
}

const SIZE = 11;
const CAPITAL: CoordV7 = { x: 4, y: 4 };
/** A ship's scene sits one row lower, on the coast, so the ship shows whole. */
const NAVAL_CAPITAL: CoordV7 = { x: 2, y: 5 };
const UNIT: CoordV7 = { x: 3, y: 5 };
/** The friendly Fighter of a Beam Down scene: next to the capital. */
const BEAM_PASSENGER: CoordV7 = { x: 3, y: 3 };
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
  return isNavalRoleV7(role);
}

/** The role attacks only units afloat (the Submarine's Torpedo). */
function torpedoes(role: UnitRoleIdV7): boolean {
  return role === "SUBMARINE";
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
  // The naval branch (bead pulp_wars-5ti.2): a Submarine torpedoes only
  // units afloat, so its target is a Patrol Boat on the water beside it.
  if (torpedoes(role)) return { x: SHIP.x + 1, y: SHIP.y };
  if (naval(role)) return { x: SHIP.x + 1, y: SHIP.y - 1 };
  // Bead pulp_wars-1wy.5: a Mothership's Heavy Tractor Beam pulls from its
  // full reach, so the target slides two tiles; a Saucer's pulls one.
  if (cue === "TRACTOR_BEAM")
    return {
      x:
        UNIT.x +
        (roleMechanicsV7(role, faction).heavyTractorBeam
          ? HEAVY_TRACTOR_RANGE_V7
          : TRACTOR_BEAM_RANGE_V7),
      y: UNIT.y,
    };
  // A Beam Down's target stands three tiles east, out of the reach of the
  // Grunt beside the capital (`BEAM_PASSENGER`): the carrier sets the Grunt
  // down between itself and the target, and the Grunt shoots on arrival.
  if (cue === "BEAM_DOWN") return { x: UNIT.x + 3, y: UNIT.y };
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
          {
            role: "FIGHTER",
            at: naval(role)
              ? NAVAL_CAPITAL
              : cue === "BEAM_DOWN"
                ? BEAM_PASSENGER
                : CAPITAL,
          },
        ],
        reveal: { radius: 0, rects: [{ x0: 0, y0: 0, x1: 10, y1: 10 }] },
      },
      {
        faction: enemy,
        coins: 0,
        technologies: [],
        cities: [{ at: ENEMY_CAPITAL, level: 1, rewards: [] }],
        units: [
          {
            role: torpedoes(role) ? "PATROL_BOAT" : "GUARD",
            at: targetAt(faction, role, cue),
          },
        ],
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
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * Wounds the units a cue needs wounded: Mind Control takes only a wounded
 * unit, and Tend, Repair and a Sugar Toss heal only one. A Re-bake's scene
 * gets the Crumbs it bakes back.
 */
function wounded(
  state: GameStateV7,
  cue: GalleryDemoCueV7,
  unitId: number,
): GameStateV7 {
  const viewerId = state.players[0]?.id;
  // The Candy revision: a Re-bake needs Crumbs next to the Confectioner (a
  // fallen Gumdrop's, one tile west of it).
  if (cue === "REBAKE" && viewerId !== undefined)
    return {
      ...state,
      crumbs: [
        {
          at: { x: UNIT.x - 1, y: UNIT.y },
          role: "FIGHTER",
          ownerId: viewerId,
          turnsLeft: 3,
        },
      ],
    };
  if (cue !== "MIND_CONTROL" && cue !== "TEND_WOUNDED" && cue !== "SUGAR_TOSS")
    return state;
  return {
    ...state,
    units: state.units.map((unit) => {
      const enemy = unit.ownerId !== viewerId;
      const companion = unit.ownerId === viewerId && unit.id !== unitId;
      if (cue === "MIND_CONTROL" && enemy) return { ...unit, hp: 5 };
      // A Sugar Toss heals only a wounded unit, like Tend and Repair.
      if ((cue === "TEND_WOUNDED" || cue === "SUGAR_TOSS") && companion)
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
  if (cue === "BEAM_DOWN")
    // Set the passenger down beside the target, in the target's row.
    return [...own]
      .filter((command) => command.kind === "BEAM_DOWN")
      .sort(
        (left, right) =>
          chebyshev(left.to, target) - chebyshev(right.to, target) ||
          Math.abs(left.to.y - target.y) - Math.abs(right.to.y - target.y),
      )[0];
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
  const first: GalleryDemoStepV7 = {
    before,
    after: viewForV7(applied.state, viewerId),
    events: projectEventsV7(state, applied.state, viewerId, applied.events),
    command,
  };
  const steps: GalleryDemoStepV7[] = [first];
  let after = first.after;
  // Bead pulp_wars-1wy.5: "beam down and shoot": the beamed unit counts as
  // moved but may still attack, so the scene plays its attack on arrival
  // when the engine offers one on the demo target.
  if (command.kind === "BEAM_DOWN") {
    const arrived = first.after;
    const shot = queryPlayerCommandsV7(arrived).find(
      (candidate) =>
        candidate.kind === "ATTACK" &&
        candidate.unitId === command.passengerUnitId &&
        candidate.targetUnitId === targetUnit?.id,
    );
    const fired =
      shot === undefined ? null : applyCommandV7(applied.state, viewerId, shot);
    if (shot !== undefined && fired?.accepted === true) {
      after = viewForV7(fired.state, viewerId);
      steps.push({
        before: arrived,
        after,
        events: projectEventsV7(
          applied.state,
          fired.state,
          viewerId,
          fired.events,
        ),
        command: shot,
      });
    }
  }
  return {
    faction,
    role,
    cue,
    before,
    after,
    events: first.events,
    offeredCommands,
    afterCommands: queryPlayerCommandsV7(after),
    command,
    steps,
  };
}
