import type { CoordV7, FactionIdV7, UnitRoleIdV7 } from "../../engine/index";
import { DWARF_PALETTE_V7 } from "../../assets/chibi-direction-dwarf-presentation";
import { ICE_FOLK_PALETTE_V7 } from "../../assets/chibi-direction-ice-folk-presentation";
import { CANDY_PALETTE_V7 } from "../../assets/chibi-direction-candy-presentation";
import { MARTIAN_PALETTE_V7 } from "../../assets/chibi-direction-martian-presentation";
import { GOBLIN_BLAST_PALETTE_V7 } from "./goblin-explosion-v7";
import {
  TILE_WIDTH,
  projectGrid,
  worldToScreen,
  type CameraState,
} from "./geometry";
import type { SupportEffectArtV7 } from "./support-presentation-v7";

/**
 * Attack cues on the board's effects overlay (bead pulp_wars-b5f.5,
 * docs/art/ATTACK_EFFECTS.md): a few ranged attacks whose unit clearly
 * shoots something of its own get a short code-drawn shot in the style of
 * the Martian heat ray and the Goblin bang, in place of the generic arrow
 * or grey catapult stone. Every other attack keeps its lunge or projectile.
 *
 * Each cue has a flight (the shot leaves the shooter and reaches the
 * target), a hit at `ATTACK_EFFECT_HIT_V7` (the board then shows the
 * result) and a short impact burst. `progress` runs 0 to 1 over
 * `ATTACK_EFFECT_DURATIONS_V7`; reduced motion holds one frame
 * (`attackReducedMotionProgressV7`) where the shot and its trail read. The
 * cues are code only, so they draw the same in the live look, the Classic
 * look and LEGACY; the Lich's bolt takes the Undead violet of the live look
 * and the classic pale blue elsewhere, as the other Undead cues do. The
 * two Candy cues (bead pulp_wars-jdb.6) draw the pie, splat and gumball
 * sprites of the Candy art where the look has them, and code elsewhere.
 *
 * The Battleship's broadside (bead pulp_wars-eu3r.4) is one cue for every
 * faction, flavoured by its shell (`BroadsideShellV7`): three guns flash
 * along the hull, a heavy shell arcs over, the target bursts, and a shock
 * ring spreads over the 3 x 3 tiles of the Battleship's splash, bursting
 * again on each splashed unit.
 */
export type AttackEffectIdV7 =
  /** The Lich (Undead CATAPULT): a necromantic orb with a wisp tail. */
  | "NECRO_BOLT"
  /** The Rocket Cart (Goblin CATAPULT): a paper firework and its burst. */
  | "FIREWORK_ROCKET"
  /** The Clockwork Gunner (Dwarf MARKSMAN): a three-round gatling burst. */
  | "GATLING_BURST"
  /** The Steam Cannon (Dwarf CATAPULT): muzzle flash, steam, iron ball. */
  | "CANNON_BLAST"
  /** The Boulder Yeti and a Yeti's Rockfall: an ice-crusted boulder. */
  | "ICE_BOULDER"
  /** The Snow Hunter (Ice Folk MARKSMAN): an ice-tipped harpoon on a line. */
  | "HARPOON"
  /** The Pie Launcher (Candy CATAPULT): a cream pie, lobbed, and its splat. */
  | "PIE_THROW"
  /** The Gumball Gunner (Candy MARKSMAN): a gumball and a sugar pop. */
  | "GUMBALL_SHOT"
  /**
   * The Battleship (every faction, bead pulp_wars-eu3r.4): a broadside, a
   * heavy shell of the faction's own and an area blast over its splash.
   */
  | "BROADSIDE";

export const ATTACK_EFFECT_IDS_V7: readonly AttackEffectIdV7[] = [
  "NECRO_BOLT",
  "FIREWORK_ROCKET",
  "GATLING_BURST",
  "CANNON_BLAST",
  "ICE_BOULDER",
  "HARPOON",
  "PIE_THROW",
  "GUMBALL_SHOT",
  "BROADSIDE",
];

/**
 * The Battleship's shell, by the shooter's faction (bead pulp_wars-eu3r.4):
 * a Human iron cannonball, Undead ghost fire, a Goblin bundle of scrap, a
 * Dinosaur basalt boulder, a Martian plasma bolt, an Ice Folk ice chunk, a
 * Dwarf steam-shot iron ball and a Candy chocolate truffle.
 */
export type BroadsideShellV7 =
  | "CANNONBALL"
  | "GHOST_FIRE"
  | "SCRAP"
  | "BOULDER"
  | "PLASMA"
  | "ICE"
  | "STEAM"
  | "CANDY";

export const BROADSIDE_SHELLS_V7: Readonly<
  Record<FactionIdV7, BroadsideShellV7>
> = {
  ORIGINAL: "CANNONBALL",
  UNDEAD: "GHOST_FIRE",
  GOBLIN: "SCRAP",
  DINOSAUR: "BOULDER",
  MARTIAN: "PLASMA",
  ICE_FOLK: "ICE",
  DWARF: "STEAM",
  CANDY: "CANDY",
};

/** The shell of a faction's Battleship; the Human cannonball without one. */
export function broadsideShellForV7(
  faction: FactionIdV7 | undefined,
): BroadsideShellV7 {
  return faction === undefined ? "CANNONBALL" : BROADSIDE_SHELLS_V7[faction];
}

export interface AttackFeedbackV7 {
  readonly effect: AttackEffectIdV7;
  /** The shooter's cell. */
  readonly from: CoordV7;
  /** The target's cell. */
  readonly to: CoordV7;
  readonly progress: number;
  /**
   * NECRO_BOLT and the BROADSIDE's GHOST_FIRE: the live look's violet (else
   * the classic pale blue).
   */
  readonly undeadViolet?: boolean;
  /** BROADSIDE: the shell (the Human cannonball when omitted). */
  readonly shell?: BroadsideShellV7;
  /**
   * BROADSIDE: the cells of the units its splash hits; each bursts as the
   * shock ring reaches it.
   */
  readonly splash?: readonly CoordV7[];
  /**
   * Drawn size per world unit, over the camera zoom: the CHIBI board's
   * ATTACK_EFFECT_SCALE_V7 when omitted; LEGACY, whose stand-in units are
   * drawn at a larger zoom, passes 1.
   */
  readonly scale?: number;
}

/** The duration of each cue in ms (the old shot plus impact was 380). */
export const ATTACK_EFFECT_DURATIONS_V7: Readonly<
  Record<AttackEffectIdV7, number>
> = {
  NECRO_BOLT: 440,
  FIREWORK_ROCKET: 480,
  GATLING_BURST: 380,
  CANNON_BLAST: 460,
  ICE_BOULDER: 460,
  HARPOON: 380,
  PIE_THROW: 460,
  GUMBALL_SHOT: 380,
  // The heaviest shot in the game: a broadside, a long arc, an area blast.
  BROADSIDE: 580,
};

/**
 * The share of each cue at which the shot lands: the board shows the
 * attack's result from here, under the impact burst.
 */
export const ATTACK_EFFECT_HIT_V7: Readonly<Record<AttackEffectIdV7, number>> =
  {
    NECRO_BOLT: 0.55,
    FIREWORK_ROCKET: 0.58,
    GATLING_BURST: 0.54,
    CANNON_BLAST: 0.56,
    ICE_BOULDER: 0.58,
    HARPOON: 0.5,
    PIE_THROW: 0.58,
    GUMBALL_SHOT: 0.52,
    BROADSIDE: 0.5,
  };

/** BROADSIDE: the three guns fire this far apart (share of the cue). */
const BROADSIDE_GUN_GAP = 0.05;

/** Flight windows (share of the cue): the shot leaves, then lands. */
const FLIGHT: Readonly<
  Record<AttackEffectIdV7, { readonly from: number; readonly to: number }>
> = {
  NECRO_BOLT: { from: 0.05, to: ATTACK_EFFECT_HIT_V7.NECRO_BOLT },
  FIREWORK_ROCKET: { from: 0.04, to: ATTACK_EFFECT_HIT_V7.FIREWORK_ROCKET },
  // Each of the three rounds; the last lands at the hit.
  GATLING_BURST: { from: 0, to: 0.3 },
  CANNON_BLAST: { from: 0.06, to: ATTACK_EFFECT_HIT_V7.CANNON_BLAST },
  ICE_BOULDER: { from: 0, to: ATTACK_EFFECT_HIT_V7.ICE_BOULDER },
  HARPOON: { from: 0, to: ATTACK_EFFECT_HIT_V7.HARPOON },
  PIE_THROW: { from: 0, to: ATTACK_EFFECT_HIT_V7.PIE_THROW },
  GUMBALL_SHOT: { from: 0, to: ATTACK_EFFECT_HIT_V7.GUMBALL_SHOT },
  // The middle gun's shell leaves with its flash.
  BROADSIDE: { from: BROADSIDE_GUN_GAP, to: ATTACK_EFFECT_HIT_V7.BROADSIDE },
};

/**
 * BROADSIDE: the shock ring reaches the splash tiles this long after the hit
 * (share of the cue); each splashed unit bursts from then.
 */
export const BROADSIDE_SPLASH_DELAY_V7 = 0.09;

/** The gatling's rounds leave this far apart (share of the cue). */
export const GATLING_ROUND_GAP_V7 = 0.12;

/** Arc heights in world units (the old catapult stone flew 72 high). */
const ARC: Readonly<Record<AttackEffectIdV7, number>> = {
  NECRO_BOLT: 34,
  FIREWORK_ROCKET: 58,
  GATLING_BURST: 0,
  CANNON_BLAST: 52,
  ICE_BOULDER: 72,
  HARPOON: 14,
  PIE_THROW: 64,
  GUMBALL_SHOT: 10,
  BROADSIDE: 76,
};

/**
 * The frame reduced motion holds: the shot close to its target with its
 * whole trail behind it (the gatling with one round landed). The broadside
 * holds its blast instead, with the shock ring over the splash tiles and
 * each splashed unit bursting: the area is what the frame must say.
 */
export function attackReducedMotionProgressV7(
  effect: AttackEffectIdV7,
): number {
  return effect === "GATLING_BURST"
    ? 0.45
    : effect === "HARPOON"
      ? 0.42
      : effect === "BROADSIDE"
        ? 0.64
        : 0.48;
}

/**
 * Which attacks get a cue: the shooter's faction and role, and whether the
 * attack is a Yeti's Rockfall. The Martian rays have their own cue
 * (martian-effects-v7); every other attack keeps its lunge, arrow or stone
 * (docs/art/ATTACK_EFFECTS.md says why).
 */
export function attackEffectForV7(
  faction: FactionIdV7 | undefined,
  role: UnitRoleIdV7,
  options: { readonly rockfall?: boolean } = {},
): AttackEffectIdV7 | null {
  if (faction === "UNDEAD" && role === "CATAPULT") return "NECRO_BOLT";
  if (faction === "GOBLIN" && role === "CATAPULT") return "FIREWORK_ROCKET";
  if (faction === "DWARF" && role === "MARKSMAN") return "GATLING_BURST";
  if (faction === "DWARF" && role === "CATAPULT") return "CANNON_BLAST";
  if (faction === "ICE_FOLK" && role === "CATAPULT") return "ICE_BOULDER";
  if (faction === "ICE_FOLK" && options.rockfall === true) return "ICE_BOULDER";
  if (faction === "ICE_FOLK" && role === "MARKSMAN") return "HARPOON";
  // The Candy revision (bead pulp_wars-jdb.6): the pie and the gumball.
  if (faction === "CANDY" && role === "CATAPULT") return "PIE_THROW";
  if (faction === "CANDY" && role === "MARKSMAN") return "GUMBALL_SHOT";
  // Bead pulp_wars-eu3r.4: every faction's Battleship fires a broadside.
  if (role === "BATTLESHIP") return "BROADSIDE";
  return null;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/** One shot in flight: where it is, its heading and the trail behind it. */
export interface AttackShotPlanV7 {
  readonly at: Point;
  /** Heading in radians (screen space), along the flight's tangent. */
  readonly angle: number;
  /** Earlier points of the flight, newest first (for trails). */
  readonly trail: readonly Point[];
  /** 0 to 1 along the flight. */
  readonly flight: number;
}

/** One impact burst: where, and 0 to 1 through its fade. */
export interface AttackImpactPlanV7 {
  readonly at: Point;
  readonly local: number;
  /** BROADSIDE: a splashed unit's smaller burst. */
  readonly splash?: true;
}

/** BROADSIDE: one gun along the hull, and 0 to 1 through its flash. */
export interface AttackGunPlanV7 {
  readonly at: Point;
  readonly local: number;
}

/**
 * BROADSIDE: the shock ring, a rounded square round the target's cell
 * growing to the edge of the 3 x 3 splash tiles.
 */
export interface AttackRingPlanV7 {
  /** The target cell's centre (on the ground). */
  readonly at: Point;
  /** Half the square's side, in screen pixels. */
  readonly halfSize: number;
  /** Half the side of the whole splash area (three tiles). */
  readonly areaHalfSize: number;
  readonly local: number;
}

/** What one frame of a cue draws, in screen pixels. */
export interface AttackEffectPlanV7 {
  readonly effect: AttackEffectIdV7;
  readonly zoom: number;
  /** Drawn size per world unit, over the zoom (see AttackFeedbackV7). */
  readonly scale: number;
  /** The launch point (the shooter's weapon). */
  readonly source: Point;
  /** The aim point on the target. */
  readonly target: Point;
  /** Unit vector from the source to the target. */
  readonly direction: Point;
  readonly shots: readonly AttackShotPlanV7[];
  readonly impacts: readonly AttackImpactPlanV7[];
  /** 0 to 1 through the muzzle or launch flare, or null outside it. */
  readonly muzzle: number | null;
  /** HARPOON: 0 to 1 opacity of the line back to the hunter. */
  readonly line: number;
  /** BROADSIDE: the guns firing along the hull (else empty). */
  readonly guns: readonly AttackGunPlanV7[];
  /** BROADSIDE: the shock ring over the splash tiles, or null. */
  readonly ring: AttackRingPlanV7 | null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function phase(progress: number, from: number, to: number): number | null {
  return progress < from || progress > to
    ? null
    : (progress - from) / (to - from);
}

/** BROADSIDE: world units between the guns along the hull. */
const BROADSIDE_GUN_SPACING = 24;

/** Lifts the aim point to the target's chest (world units). */
const BODY_LIFT = 18;

/**
 * Drawn sizes are in world units times this: the board's chibi zoom step 1
 * is about 0.63 CSS px per world unit, at which a shot drawn at world size
 * is too small to read beside a 70 px unit.
 */
export const ATTACK_EFFECT_SCALE_V7 = 1.7;

/**
 * The geometry of one frame: the shots in flight with their trails, the
 * impact bursts and the muzzle flare. Pure, so tests can check it.
 */
export function attackEffectPlanV7(
  feedback: AttackFeedbackV7,
  camera: CameraState,
): AttackEffectPlanV7 {
  const zoom = camera.zoom;
  const progress = clamp01(feedback.progress);
  const effect = feedback.effect;
  const cellCentre = (at: CoordV7): Point =>
    worldToScreen(projectGrid(at), camera);
  const fromCentre = cellCentre(feedback.from);
  const toCentre = cellCentre(feedback.to);
  const dx = toCentre.x - fromCentre.x;
  const dy = toCentre.y - fromCentre.y;
  const length = Math.hypot(dx, dy) || 1;
  const direction = { x: dx / length, y: dy / length };
  // The weapon: the Lich's raised orb, the cannon's and the gun's muzzle,
  // the rocket's cone, the boulder over the Yeti's head, the hunter's hand.
  // The Battleship's middle gun port, on the hull below the sails.
  const reach =
    effect === "BROADSIDE"
      ? 6
      : effect === "CANNON_BLAST"
        ? 50
        : effect === "GATLING_BURST"
          ? 24
          : effect === "NECRO_BOLT"
            ? 4
            : 14;
  const lift =
    effect === "ICE_BOULDER"
      ? 62
      : effect === "NECRO_BOLT"
        ? 62
        : effect === "FIREWORK_ROCKET"
          ? 30
          : effect === "CANNON_BLAST"
            ? -12
            : effect === "BROADSIDE"
              ? 2
              : 22;
  const source = {
    x: fromCentre.x + direction.x * reach * zoom,
    y: fromCentre.y + direction.y * reach * zoom - lift * zoom,
  };
  const target = { x: toCentre.x, y: toCentre.y - BODY_LIFT * zoom };
  const arc = ARC[effect] * zoom;
  const point = (t: number, start: Point, end: Point): Point => {
    // A fireworks rocket wobbles across its path.
    const wobble =
      effect === "FIREWORK_ROCKET"
        ? Math.sin(t * Math.PI * 3) * (1 - t) * 6 * zoom
        : 0;
    return {
      x: start.x + (end.x - start.x) * t - direction.y * wobble,
      y:
        start.y +
        (end.y - start.y) * t -
        Math.sin(Math.PI * t) * arc +
        direction.x * wobble,
    };
  };
  // A rocket picks up speed; everything else flies at an even pace.
  const eased = (t: number): number =>
    effect === "FIREWORK_ROCKET" ? 0.4 * t + 0.6 * t * t : t;
  const shot = (
    flight: number,
    start: Point,
    end: Point,
    trailStep: number,
    trailCount: number,
  ): AttackShotPlanV7 => {
    const t = eased(flight);
    const at = point(t, start, end);
    const ahead = point(Math.min(1, t + 0.02), start, end);
    const behind = point(Math.max(0, t - 0.02), start, end);
    const trail: Point[] = [];
    for (let index = 1; index <= trailCount; index += 1) {
      const earlier = flight - index * trailStep;
      if (earlier < 0) break;
      trail.push(point(eased(earlier), start, end));
    }
    return {
      at,
      angle: Math.atan2(ahead.y - behind.y, ahead.x - behind.x),
      trail,
      flight,
    };
  };
  const shots: AttackShotPlanV7[] = [];
  const impacts: AttackImpactPlanV7[] = [];
  const window = FLIGHT[effect];
  if (effect === "GATLING_BURST") {
    // Three rounds, a little apart on the target so each hit shows.
    for (let round = 0; round < 3; round += 1) {
      const from = window.from + round * GATLING_ROUND_GAP_V7;
      const to = window.to + round * GATLING_ROUND_GAP_V7;
      const spread = (round - 1) * 7 * zoom;
      const end = {
        x: target.x - direction.y * spread,
        y: target.y + direction.x * spread + (round === 1 ? -5 : 3) * zoom,
      };
      const flight = phase(progress, from, to);
      if (flight !== null) shots.push(shot(flight, source, end, 0.12, 1));
      const impact = phase(progress, to, to + 0.26);
      if (impact !== null && progress > to)
        impacts.push({ at: end, local: impact });
    }
  } else {
    const flight = phase(progress, window.from, window.to);
    if (flight !== null)
      shots.push(
        shot(
          flight,
          source,
          target,
          effect === "FIREWORK_ROCKET" ? 0.07 : 0.06,
          effect === "HARPOON"
            ? 0
            : effect === "FIREWORK_ROCKET"
              ? 8
              : effect === "PIE_THROW"
                ? 3
                : effect === "BROADSIDE"
                  ? 7
                  : 6,
        ),
      );
    const impact = phase(progress, window.to, 1);
    if (impact !== null && progress > window.to)
      impacts.push({ at: target, local: impact });
    // The broadside's splash: each splashed unit bursts as the ring
    // reaches it.
    if (effect === "BROADSIDE") {
      const splashFrom = window.to + BROADSIDE_SPLASH_DELAY_V7;
      const local = phase(progress, splashFrom, 1);
      if (local !== null && progress > splashFrom)
        for (const at of feedback.splash ?? []) {
          const centre = cellCentre(at);
          impacts.push({
            at: { x: centre.x, y: centre.y - BODY_LIFT * zoom },
            local,
            splash: true,
          });
        }
    }
  }
  // Three guns along the hull, fired one after another from the stern.
  const guns: AttackGunPlanV7[] = [];
  if (effect === "BROADSIDE")
    for (let gun = 0; gun < 3; gun += 1) {
      const local = phase(
        progress,
        gun * BROADSIDE_GUN_GAP,
        gun * BROADSIDE_GUN_GAP + 0.42,
      );
      if (local !== null)
        guns.push({
          at: {
            x: source.x + (gun - 1) * BROADSIDE_GUN_SPACING * zoom,
            y: source.y + (gun === 1 ? 0 : 3 * zoom),
          },
          local,
        });
    }
  const ringLocal =
    effect === "BROADSIDE" ? phase(progress, window.to, 1) : null;
  const areaHalfSize = 1.5 * TILE_WIDTH * zoom;
  const ring: AttackRingPlanV7 | null =
    ringLocal === null || progress <= window.to
      ? null
      : {
          at: toCentre,
          // The ring reaches the splash tiles' centres with the splash
          // bursts, and the area's edge as it fades.
          halfSize:
            areaHalfSize *
            (0.25 + 0.67 * easeOut(Math.min(1, ringLocal / 0.55))),
          areaHalfSize,
          local: ringLocal,
        };
  const muzzle =
    effect === "GATLING_BURST"
      ? phase(progress, 0, 0.46)
      : effect === "CANNON_BLAST"
        ? phase(progress, 0, 0.5)
        : effect === "NECRO_BOLT"
          ? phase(progress, 0, 0.3)
          : effect === "FIREWORK_ROCKET"
            ? phase(progress, 0, 0.28)
            : null;
  const line =
    effect !== "HARPOON"
      ? 0
      : progress <= window.to
        ? 1
        : clamp01(1 - (progress - window.to) / 0.3);
  return {
    effect,
    zoom,
    scale: feedback.scale ?? ATTACK_EFFECT_SCALE_V7,
    source,
    target,
    direction,
    shots,
    impacts,
    muzzle,
    line,
    guns,
    ring,
  };
}

/** The Undead violet of the live look (docs/art/factions/UNDEAD.md). */
export const NECRO_BOLT_VIOLET_V7 = {
  dark: "#46247c",
  mid: "#7b36c9",
  lit: "#b06bf2",
  pale: "#dcc4ff",
  outline: "#1d1233",
} as const;

/** The classic Undead pale blue (the Classic look and LEGACY). */
export const NECRO_BOLT_CLASSIC_V7 = {
  dark: "#3a4558",
  mid: "#7f8ca0",
  lit: "#a9bdd8",
  pale: "#d2e2f6",
  outline: "#18202c",
} as const;

/**
 * The fireworks' star colours: the Rocket Cart's rocket paper
 * (docs/art/factions/GOBLIN.md), no orange, plus the blast's cream.
 */
export const FIREWORK_COLOURS_V7 = [
  "#ff5a4f",
  "#ffd84a",
  "#5ab8ff",
  "#86e070",
  "#fee388",
] as const;

const ROCKET_RED = "#d23a2c";
const ROCKET_CREAM = "#fee388";
const GOBLIN = GOBLIN_BLAST_PALETTE_V7;
const DWARF = DWARF_PALETTE_V7;
const ICE = ICE_FOLK_PALETTE_V7;
const MARTIAN = MARTIAN_PALETTE_V7;
/** The Snow Hunter's ivory harpoon shaft. */
const IVORY = "#efe6c8";
/** The muzzle flash's hot core and the gatling tracer. */
const MUZZLE_HOT = "#fff3b0";

/**
 * Draws one frame of an attack cue on the effects overlay. `art` is read by
 * the Candy cues only (their pie, splat and gumball sprites, bead
 * pulp_wars-jdb.6); without it, and for every other cue, the frame is code.
 */
export function drawAttackFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: AttackFeedbackV7,
  art: SupportEffectArtV7 | null = null,
): void {
  const plan = attackEffectPlanV7(feedback, camera);
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  switch (plan.effect) {
    case "NECRO_BOLT":
      drawNecroBolt(
        context,
        plan,
        feedback.undeadViolet === true
          ? NECRO_BOLT_VIOLET_V7
          : NECRO_BOLT_CLASSIC_V7,
      );
      break;
    case "FIREWORK_ROCKET":
      drawFireworkRocket(context, plan);
      break;
    case "GATLING_BURST":
      drawGatlingBurst(context, plan, feedback.progress);
      break;
    case "CANNON_BLAST":
      drawCannonBlast(context, plan);
      break;
    case "ICE_BOULDER":
      drawIceBoulder(context, plan);
      break;
    case "HARPOON":
      drawHarpoon(context, plan);
      break;
    case "PIE_THROW":
      drawPieThrow(context, plan, art);
      break;
    case "GUMBALL_SHOT":
      drawGumballShot(context, plan, art);
      break;
    case "BROADSIDE":
      drawBroadside(
        context,
        plan,
        broadsideLookV7(
          feedback.shell ?? "CANNONBALL",
          feedback.undeadViolet === true,
        ),
      );
      break;
  }
  context.restore();
}

type Palette = typeof NECRO_BOLT_VIOLET_V7 | typeof NECRO_BOLT_CLASSIC_V7;

function circle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  context.beginPath();
  context.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
}

function starPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outer: number,
  inner: number,
  points: number,
  twist = 0,
): void {
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (index / (points * 2)) * Math.PI * 2 - Math.PI / 2 + twist;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

/** A round puff: three overlapping lobes with a light top (Goblin style). */
function puff(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  light: string,
  outline: string,
  zoom: number,
): void {
  context.beginPath();
  for (const [dx, dy, scale] of [
    [-0.55, 0.15, 0.7],
    [0.55, 0.2, 0.72],
    [0, -0.1, 1],
  ] as const) {
    context.moveTo(x + dx * radius + scale * radius, y + dy * radius);
    context.arc(
      x + dx * radius,
      y + dy * radius,
      scale * radius,
      0,
      Math.PI * 2,
    );
  }
  context.strokeStyle = outline;
  context.lineWidth = Math.max(1, 2.2 * zoom);
  context.stroke();
  context.fillStyle = fill;
  context.fill();
  circle(context, x - radius * 0.2, y - radius * 0.35, radius * 0.42);
  context.fillStyle = light;
  context.fill();
}

function easeOut(value: number): number {
  return 1 - (1 - value) * (1 - value);
}

function drawNecroBolt(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
  palette: Palette,
): void {
  const zoom = plan.zoom * plan.scale;
  // The Lich's orb flares as it casts.
  if (plan.muzzle !== null) {
    const local = plan.muzzle;
    context.globalAlpha = 1 - local;
    context.strokeStyle = palette.lit;
    context.lineWidth = Math.max(1, 3 * zoom * (1 - local) + 1);
    circle(context, plan.source.x, plan.source.y, (7 + 16 * local) * zoom);
    context.stroke();
    context.globalAlpha = 1;
  }
  for (const shot of plan.shots) {
    // A wisp tail: a tapering ribbon of the faction's light behind the orb.
    const tail = [shot.at, ...shot.trail];
    for (const [colour, width, alpha] of [
      [palette.dark, 13, 0.55],
      [palette.lit, 8, 0.9],
      [palette.pale, 3, 0.9],
    ] as const)
      for (let index = 1; index < tail.length; index += 1) {
        const head = tail[index - 1];
        const end = tail[index];
        if (head === undefined || end === undefined) continue;
        const fade = 1 - (index - 1) / tail.length;
        context.globalAlpha = alpha * fade;
        context.strokeStyle = colour;
        context.lineWidth = Math.max(1, width * fade * zoom);
        context.beginPath();
        context.moveTo(head.x, head.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      }
    context.globalAlpha = 1;
    const { x, y } = shot.at;
    // A halo, the outlined orb, a pale core.
    context.globalAlpha = 0.45;
    context.fillStyle = palette.lit;
    circle(context, x, y, 15 * zoom);
    context.fill();
    context.globalAlpha = 1;
    circle(context, x, y, 9 * zoom);
    context.fillStyle = palette.mid;
    context.fill();
    context.strokeStyle = palette.outline;
    context.lineWidth = Math.max(1, 2.2 * zoom);
    context.stroke();
    circle(context, x - 1.5 * zoom, y - 1.5 * zoom, 5.5 * zoom);
    context.fillStyle = palette.lit;
    context.fill();
    circle(context, x - 2.5 * zoom, y - 2.5 * zoom, 2.6 * zoom);
    context.fillStyle = palette.pale;
    context.fill();
    // Three motes circling the orb.
    context.fillStyle = palette.pale;
    for (let mote = 0; mote < 3; mote += 1) {
      const angle = shot.flight * Math.PI * 6 + (mote * Math.PI * 2) / 3;
      circle(
        context,
        x + Math.cos(angle) * 13 * zoom,
        y + Math.sin(angle) * 13 * zoom,
        1.8 * zoom,
      );
      context.fill();
    }
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    const alpha = local < 0.4 ? 1 : 1 - (local - 0.4) / 0.6;
    // A pale flash, then a ring of the faction's light spreading out with
    // six short wisps (the Lich's splash cue follows on its own cells).
    if (local < 0.4) {
      context.globalAlpha = 1 - local / 0.4;
      context.fillStyle = palette.pale;
      circle(context, x, y, (14 - 8 * local) * zoom);
      context.fill();
    }
    context.globalAlpha = alpha;
    const radius = (10 + 26 * easeOut(local)) * zoom;
    context.strokeStyle = palette.dark;
    context.lineWidth = Math.max(1, 6 * zoom * (1 - local) + 1);
    circle(context, x, y, radius);
    context.stroke();
    context.strokeStyle = palette.lit;
    context.lineWidth = Math.max(1, 3 * zoom * (1 - local) + 0.5);
    context.stroke();
    context.strokeStyle = palette.pale;
    context.lineWidth = Math.max(1, 2.4 * zoom);
    for (let wisp = 0; wisp < 6; wisp += 1) {
      const angle = (wisp / 6) * Math.PI * 2 + 0.3;
      const inner = radius * 0.7;
      const outer = radius * 1.15;
      context.beginPath();
      context.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      context.lineTo(
        x + Math.cos(angle + 0.25) * outer,
        y + Math.sin(angle + 0.25) * outer - 4 * zoom * local,
      );
      context.stroke();
    }
    context.globalAlpha = 1;
  }
}

function drawFireworkRocket(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
): void {
  const zoom = plan.zoom * plan.scale;
  // The fuse catches: a spark and a soot puff at the cart.
  if (plan.muzzle !== null) {
    const local = plan.muzzle;
    context.globalAlpha = 1 - local;
    puff(
      context,
      plan.source.x - plan.direction.x * 10 * zoom,
      plan.source.y + 6 * zoom - local * 14 * zoom,
      (8 + 8 * local) * zoom,
      GOBLIN.lightGrey,
      GOBLIN.cream,
      GOBLIN.soot,
      zoom,
    );
    context.globalAlpha = 1;
  }
  for (const shot of plan.shots) {
    // Smoke left behind, oldest largest and palest; sparks between.
    shot.trail.forEach((point, index) => {
      const age = (index + 1) / (shot.trail.length + 1);
      context.globalAlpha = 0.75 * (1 - age);
      context.fillStyle = index % 2 === 0 ? GOBLIN.lightGrey : GOBLIN.cream;
      circle(context, point.x, point.y - age * 6 * zoom, (3 + 6 * age) * zoom);
      context.fill();
      if (index < 3) {
        context.globalAlpha = 1 - age;
        context.fillStyle =
          FIREWORK_COLOURS_V7[(index * 2) % 5] ?? ROCKET_CREAM;
        starPath(
          context,
          point.x + Math.sin(index * 2.1) * 5 * zoom,
          point.y + Math.cos(index * 1.7) * 5 * zoom,
          3.2 * zoom,
          1.3 * zoom,
          4,
          shot.flight * 6,
        );
        context.fill();
      }
    });
    context.globalAlpha = 1;
    context.save();
    context.translate(shot.at.x, shot.at.y);
    context.rotate(shot.angle);
    const length = 24 * zoom;
    const width = 10 * zoom;
    // The tail spark, the stick, the red paper tube, the cream cone.
    starPath(
      context,
      -length / 2 - 3 * zoom,
      0,
      (6 + 2 * Math.sin(shot.flight * 40)) * zoom,
      2.5 * zoom,
      5,
      shot.flight * 8,
    );
    context.fillStyle = GOBLIN.spark;
    context.fill();
    context.strokeStyle = GOBLIN.charcoal;
    context.lineWidth = Math.max(1, 2 * zoom);
    context.beginPath();
    context.moveTo(-length / 2, width * 0.35);
    context.lineTo(-length / 2 - 16 * zoom, width * 0.35);
    context.stroke();
    context.beginPath();
    context.rect(-length / 2, -width / 2, length, width);
    context.fillStyle = ROCKET_RED;
    context.fill();
    context.lineWidth = Math.max(1, 2 * zoom);
    context.stroke();
    context.fillStyle = ROCKET_CREAM;
    starPath(context, -2 * zoom, 0, 3 * zoom, 1.3 * zoom, 5);
    context.fill();
    context.beginPath();
    context.moveTo(length / 2, -width / 2 - 1 * zoom);
    context.lineTo(length / 2 + 9 * zoom, 0);
    context.lineTo(length / 2, width / 2 + 1 * zoom);
    context.closePath();
    context.fillStyle = ROCKET_CREAM;
    context.fill();
    context.stroke();
    context.restore();
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    // A white bang star, then the stars burst out, droop and fade.
    if (local < 0.45) {
      const swell = easeOut(local / 0.25 > 1 ? 1 : local / 0.25);
      context.globalAlpha = local < 0.25 ? 1 : 1 - (local - 0.25) / 0.2;
      starPath(
        context,
        x,
        y,
        (10 + 20 * swell) * zoom,
        (6 + 9 * swell) * zoom,
        10,
      );
      context.fillStyle = GOBLIN.white;
      context.fill();
      context.strokeStyle = GOBLIN.charcoal;
      context.lineWidth = Math.max(1, 2.5 * zoom);
      context.stroke();
      circle(context, x, y, (5 + 6 * swell) * zoom);
      context.fillStyle = GOBLIN.spark;
      context.fill();
    }
    const spread = easeOut(Math.min(1, local / 0.7));
    const alpha = local < 0.55 ? 1 : 1 - (local - 0.55) / 0.45;
    for (let star = 0; star < 10; star += 1) {
      const angle = (star / 10) * Math.PI * 2 + 0.2;
      const distance = (8 + 48 * spread) * zoom;
      const droop = local * local * 18 * zoom;
      const sx = x + Math.cos(angle) * distance;
      const sy = y + Math.sin(angle) * distance * 0.85 + droop;
      const colour = FIREWORK_COLOURS_V7[star % 5] ?? ROCKET_CREAM;
      context.globalAlpha = Math.max(0, alpha) * 0.7;
      context.strokeStyle = colour;
      context.lineWidth = Math.max(1, 2 * zoom);
      context.beginPath();
      context.moveTo(
        x + Math.cos(angle) * distance * 0.55,
        y + Math.sin(angle) * distance * 0.5 + droop * 0.5,
      );
      context.lineTo(sx, sy);
      context.stroke();
      context.globalAlpha = Math.max(0, alpha);
      starPath(context, sx, sy, 4.5 * zoom, 1.8 * zoom, 4, local * 3);
      context.fillStyle = colour;
      context.fill();
    }
    context.globalAlpha = 1;
  }
}

function drawGatlingBurst(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
  progress: number,
): void {
  const zoom = plan.zoom * plan.scale;
  // The barrel flashes on each round (flickering), and the boiler belly
  // vents a little steam.
  if (plan.muzzle !== null) {
    const local = plan.muzzle;
    context.globalAlpha = (1 - local) * 0.85;
    puff(
      context,
      plan.source.x - plan.direction.x * 26 * zoom,
      plan.source.y - (4 + 18 * local) * zoom,
      (5 + 6 * local) * zoom,
      DWARF.steam,
      "#ffffff",
      DWARF.ironRim,
      zoom,
    );
    context.globalAlpha = 1;
    if (Math.floor(clamp01(progress) * 26) % 3 !== 2) {
      starPath(
        context,
        plan.source.x,
        plan.source.y,
        9 * zoom,
        3.5 * zoom,
        6,
        progress * 9,
      );
      context.fillStyle = MUZZLE_HOT;
      context.fill();
      context.strokeStyle = DWARF.copper;
      context.lineWidth = Math.max(1, 1.8 * zoom);
      context.stroke();
    }
  }
  for (const shot of plan.shots) {
    const tail = {
      x: shot.at.x - Math.cos(shot.angle) * 16 * zoom,
      y: shot.at.y - Math.sin(shot.angle) * 16 * zoom,
    };
    for (const [colour, width] of [
      [DWARF.outline, 5],
      [DWARF.copper, 3.4],
      [MUZZLE_HOT, 1.6],
    ] as const) {
      context.strokeStyle = colour;
      context.lineWidth = Math.max(1, width * zoom);
      context.beginPath();
      context.moveTo(tail.x, tail.y);
      context.lineTo(shot.at.x, shot.at.y);
      context.stroke();
    }
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    context.globalAlpha = 1 - local;
    starPath(context, x, y, (12 - 5 * local) * zoom, 4.5 * zoom, 5, local * 2);
    context.fillStyle = MUZZLE_HOT;
    context.fill();
    context.strokeStyle = DWARF.copper;
    context.lineWidth = Math.max(1, 2 * zoom);
    context.stroke();
    context.fillStyle = DWARF.copper;
    for (let spark = 0; spark < 4; spark += 1) {
      const angle = (spark / 4) * Math.PI * 2 + 0.6;
      const distance = (6 + 14 * local) * zoom;
      context.fillRect(
        x + Math.cos(angle) * distance - zoom,
        y + Math.sin(angle) * distance - zoom + local * 6 * zoom,
        2.5 * zoom,
        2.5 * zoom,
      );
    }
    context.globalAlpha = 1;
  }
}

function drawCannonBlast(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
): void {
  const zoom = plan.zoom * plan.scale;
  // The muzzle: a hot flash, then steam rolling out and up.
  if (plan.muzzle !== null) {
    const local = plan.muzzle;
    const { x, y } = plan.source;
    const steamAlpha = local < 0.4 ? 1 : 1 - (local - 0.4) / 0.6;
    context.globalAlpha = Math.max(0, steamAlpha);
    for (let index = 0; index < 4; index += 1) {
      const angle =
        Math.atan2(plan.direction.y, plan.direction.x) +
        (index - 1.5) * 0.7 +
        Math.PI * (index % 2 === 0 ? 0 : 0.1);
      const distance = (6 + 20 * easeOut(local)) * zoom;
      puff(
        context,
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance - local * 16 * zoom,
        (6 + 9 * easeOut(local)) * zoom,
        DWARF.steam,
        "#ffffff",
        DWARF.ironRim,
        zoom,
      );
    }
    context.globalAlpha = 1;
    if (local < 0.32) {
      const flash = 1 - local / 0.32;
      context.globalAlpha = flash;
      starPath(context, x, y, (12 + 8 * flash) * zoom, 6 * zoom, 8, 0.2);
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = DWARF.outline;
      context.lineWidth = Math.max(1, 2.2 * zoom);
      context.stroke();
      circle(context, x, y, 6 * zoom);
      context.fillStyle = MUZZLE_HOT;
      context.fill();
      context.globalAlpha = 1;
    }
  }
  for (const shot of plan.shots) {
    shot.trail.forEach((point, index) => {
      const age = (index + 1) / (shot.trail.length + 1);
      context.globalAlpha = 0.6 * (1 - age);
      context.fillStyle = DWARF.steam;
      circle(context, point.x, point.y, (2 + 4 * age) * zoom);
      context.fill();
    });
    context.globalAlpha = 1;
    const { x, y } = shot.at;
    circle(context, x, y, 8 * zoom);
    context.fillStyle = DWARF.iron;
    context.fill();
    context.strokeStyle = DWARF.outline;
    context.lineWidth = Math.max(1, 2 * zoom);
    context.stroke();
    context.beginPath();
    context.arc(x, y, 5 * zoom, Math.PI * 1.05, Math.PI * 1.6);
    context.strokeStyle = DWARF.ironRim;
    context.lineWidth = Math.max(1, 2 * zoom);
    context.stroke();
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    const ground = y + 14 * zoom;
    const alpha = local < 0.5 ? 1 : 1 - (local - 0.5) / 0.5;
    // Earth thrown up round the hit, a short star and flying clods.
    context.globalAlpha = Math.max(0, alpha);
    for (let index = 0; index < 5; index += 1) {
      const angle = Math.PI + (index / 4) * Math.PI;
      const distance = (8 + 20 * easeOut(local)) * zoom;
      puff(
        context,
        x + Math.cos(angle) * distance,
        ground + Math.sin(angle) * distance * 0.5 - local * 10 * zoom,
        (6 + 6 * easeOut(local)) * zoom,
        DWARF.earthLight,
        DWARF.sandbag,
        DWARF.earthDark,
        zoom,
      );
    }
    if (local < 0.35) {
      context.globalAlpha = 1 - local / 0.35;
      starPath(context, x, y, (12 + 10 * local) * zoom, 6 * zoom, 8, 0.4);
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = DWARF.outline;
      context.lineWidth = Math.max(1, 2.2 * zoom);
      context.stroke();
    }
    context.globalAlpha = Math.max(0, alpha);
    context.fillStyle = DWARF.earthDark;
    for (let clod = 0; clod < 4; clod += 1) {
      const angle = -Math.PI / 2 + (clod - 1.5) * 0.6;
      const distance = (10 + 30 * easeOut(local)) * zoom;
      const size = 4.5 * zoom;
      context.fillRect(
        x + Math.cos(angle) * distance - size / 2,
        y + Math.sin(angle) * distance + local * local * 30 * zoom - size / 2,
        size,
        size,
      );
    }
    context.globalAlpha = 1;
  }
}

/** An irregular eight-sided rock outline. */
const ROCK_SHAPE = [1, 0.82, 0.95, 0.78, 1, 0.86, 0.92, 0.8] as const;

function drawIceBoulder(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
): void {
  const zoom = plan.zoom * plan.scale;
  for (const shot of plan.shots) {
    // Snow shaken off the boulder.
    shot.trail.forEach((point, index) => {
      const age = (index + 1) / (shot.trail.length + 1);
      context.globalAlpha = 0.9 * (1 - age);
      context.fillStyle = ICE.snow;
      const size = (3.5 - 1.5 * age) * zoom;
      context.fillRect(
        point.x + Math.sin(index * 2.3) * 6 * zoom - size / 2,
        point.y + age * 10 * zoom - size / 2,
        size,
        size,
      );
    });
    context.globalAlpha = 1;
    context.save();
    context.translate(shot.at.x, shot.at.y);
    const radius = 13 * zoom;
    // A lumpy slate rock, lit from above (the light does not spin).
    const rock = (scale: number): void => {
      context.beginPath();
      ROCK_SHAPE.forEach((lump, index) => {
        const angle =
          (index / ROCK_SHAPE.length) * Math.PI * 2 + shot.flight * Math.PI;
        const px = Math.cos(angle) * radius * lump * scale;
        const py = Math.sin(angle) * radius * lump * scale;
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.closePath();
    };
    rock(1);
    context.fillStyle = ICE.slate;
    context.fill();
    context.strokeStyle = ICE.outline;
    context.lineWidth = Math.max(1, 2.4 * zoom);
    context.stroke();
    context.save();
    context.translate(-radius * 0.18, -radius * 0.22);
    rock(0.62);
    context.fillStyle = "#6f7a8e";
    context.fill();
    context.restore();
    // Ice crystals crusted on it, turning with the rock.
    context.rotate(shot.flight * Math.PI);
    for (const [cx, cy, size] of [
      [-0.45, -0.35, 0.42],
      [0.4, -0.15, 0.36],
      [0.05, 0.45, 0.3],
    ] as const) {
      const s = radius * size;
      context.beginPath();
      context.moveTo(radius * cx, radius * cy - s);
      context.lineTo(radius * cx + s * 0.7, radius * cy);
      context.lineTo(radius * cx, radius * cy + s);
      context.lineTo(radius * cx - s * 0.7, radius * cy);
      context.closePath();
      context.fillStyle = ICE.ice;
      context.fill();
      context.strokeStyle = ICE.iceDark;
      context.lineWidth = Math.max(1, 1.4 * zoom);
      context.stroke();
      context.fillStyle = ICE.icePale;
      context.fillRect(
        radius * cx - s * 0.25,
        radius * cy - s * 0.5,
        Math.max(1, s * 0.35),
        Math.max(1, s * 0.35),
      );
    }
    context.restore();
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    const alpha = local < 0.5 ? 1 : 1 - (local - 0.5) / 0.5;
    // A snow puff, a pale flash, ice shards flung out and falling.
    context.globalAlpha = Math.max(0, alpha);
    for (let index = 0; index < 5; index += 1) {
      const angle = Math.PI * 0.9 + (index / 4) * Math.PI * 1.2;
      const distance = (8 + 18 * easeOut(local)) * zoom;
      puff(
        context,
        x + Math.cos(angle) * distance,
        y + 12 * zoom + Math.sin(angle) * distance * 0.5 - local * 8 * zoom,
        (6 + 6 * easeOut(local)) * zoom,
        ICE.snow,
        "#ffffff",
        ICE.snowRim,
        zoom,
      );
    }
    if (local < 0.3) {
      context.globalAlpha = 1 - local / 0.3;
      starPath(context, x, y, (14 + 8 * local) * zoom, 5 * zoom, 4, 0.785);
      context.fillStyle = ICE.icePale;
      context.fill();
      context.strokeStyle = ICE.iceDark;
      context.lineWidth = Math.max(1, 2 * zoom);
      context.stroke();
    }
    context.globalAlpha = Math.max(0, alpha);
    for (let shard = 0; shard < 7; shard += 1) {
      const angle = -Math.PI / 2 + (shard - 3) * 0.5;
      const distance = (10 + 34 * easeOut(local)) * zoom;
      const sx = x + Math.cos(angle) * distance;
      const sy = y + Math.sin(angle) * distance + local * local * 34 * zoom;
      context.save();
      context.translate(sx, sy);
      context.rotate(angle + local * 8 * (shard % 2 === 0 ? 1 : -1));
      const size = (shard % 3 === 0 ? 7 : 5) * zoom;
      context.beginPath();
      context.moveTo(size, 0);
      context.lineTo(-size * 0.6, -size * 0.55);
      context.lineTo(-size * 0.6, size * 0.55);
      context.closePath();
      context.fillStyle = shard % 2 === 0 ? ICE.ice : ICE.icePale;
      context.fill();
      context.strokeStyle = ICE.iceDark;
      context.lineWidth = Math.max(1, 1.4 * zoom);
      context.stroke();
      context.restore();
    }
    context.globalAlpha = 1;
  }
}

function drawHarpoon(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
): void {
  const zoom = plan.zoom * plan.scale;
  const shot = plan.shots[0];
  const length = 34 * zoom;
  // The line back to the hunter, sagging a little.
  if (plan.line > 0) {
    const end =
      shot === undefined
        ? {
            x: plan.target.x - plan.direction.x * length,
            y: plan.target.y - plan.direction.y * length,
          }
        : {
            x: shot.at.x - Math.cos(shot.angle) * length,
            y: shot.at.y - Math.sin(shot.angle) * length,
          };
    context.globalAlpha = plan.line;
    context.strokeStyle = ICE.furShade;
    context.lineWidth = Math.max(1, 1.6 * zoom);
    context.beginPath();
    context.moveTo(plan.source.x, plan.source.y);
    context.quadraticCurveTo(
      (plan.source.x + end.x) / 2,
      (plan.source.y + end.y) / 2 + 10 * zoom,
      end.x,
      end.y,
    );
    context.stroke();
    context.globalAlpha = 1;
  }
  if (shot !== undefined) {
    context.save();
    context.translate(shot.at.x, shot.at.y);
    context.rotate(shot.angle);
    // The ivory shaft, a fur tuft at its butt, the ice-crystal head.
    context.strokeStyle = ICE.outline;
    context.lineWidth = Math.max(1, 5 * zoom);
    context.beginPath();
    context.moveTo(-length, 0);
    context.lineTo(-8 * zoom, 0);
    context.stroke();
    context.strokeStyle = IVORY;
    context.lineWidth = Math.max(1, 2.8 * zoom);
    context.stroke();
    context.fillStyle = ICE.fur;
    context.strokeStyle = ICE.outline;
    context.lineWidth = Math.max(1, 1.4 * zoom);
    circle(context, -length + 2 * zoom, 0, 3.4 * zoom);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(4 * zoom, 0);
    context.lineTo(-8 * zoom, -5 * zoom);
    context.lineTo(-12 * zoom, 0);
    context.lineTo(-8 * zoom, 5 * zoom);
    context.closePath();
    context.fillStyle = ICE.ice;
    context.fill();
    context.strokeStyle = ICE.iceDark;
    context.lineWidth = Math.max(1, 1.6 * zoom);
    context.stroke();
    context.fillStyle = ICE.icePale;
    context.fillRect(-7 * zoom, -2.5 * zoom, 3 * zoom, 2 * zoom);
    context.restore();
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    context.globalAlpha = 1 - local;
    starPath(context, x, y, (15 - 6 * local) * zoom, 4 * zoom, 4, local);
    context.fillStyle = ICE.icePale;
    context.fill();
    context.strokeStyle = ICE.iceDark;
    context.lineWidth = Math.max(1, 2 * zoom);
    context.stroke();
    context.fillStyle = ICE.ice;
    for (let spark = 0; spark < 5; spark += 1) {
      const angle = (spark / 5) * Math.PI * 2 + 0.4;
      const distance = (10 + 16 * easeOut(local)) * zoom;
      const size = 3 * zoom;
      context.fillRect(
        x + Math.cos(angle) * distance - size / 2,
        y + Math.sin(angle) * distance - size / 2,
        size,
        size,
      );
    }
    context.globalAlpha = 1;
  }
}

const CANDY = CANDY_PALETTE_V7;

/**
 * A Candy effect sprite centred on a point, `size` CSS pixels wide; false
 * without a loaded sprite (the cue is then code-drawn).
 */
function candySprite(
  context: CanvasRenderingContext2D,
  art: SupportEffectArtV7 | null,
  subject: "EFFECT:PIE" | "EFFECT:SPLAT" | "EFFECT:GUMBALL_SHOT",
  x: number,
  y: number,
  size: number,
  angle = 0,
): boolean {
  const image = art?.image(subject) ?? null;
  if (image === null) return false;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.imageSmoothingEnabled = true;
  context.drawImage(image.image, -size / 2, -size / 2, size, size);
  context.restore();
  return true;
}

/** The Pie Launcher's cream pie: a lobbed pie, then cream over the target. */
function drawPieThrow(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
  art: SupportEffectArtV7 | null,
): void {
  const zoom = plan.zoom * plan.scale;
  for (const shot of plan.shots) {
    // Flecks of cream fall behind the pie.
    shot.trail.forEach((point, index) => {
      const age = (index + 1) / (shot.trail.length + 1);
      context.globalAlpha = 0.9 * (1 - age);
      circle(context, point.x, point.y + age * 8 * zoom, (3 - age) * zoom);
      context.fillStyle = CANDY.white;
      context.fill();
    });
    context.globalAlpha = 1;
    const spin = shot.flight * Math.PI * 1.5;
    if (
      !candySprite(
        context,
        art,
        "EFFECT:PIE",
        shot.at.x,
        shot.at.y,
        30 * zoom,
        spin,
      )
    ) {
      // A biscuit crust seen from the side, a dome of whipped cream.
      context.save();
      context.translate(shot.at.x, shot.at.y);
      context.rotate(spin);
      context.lineWidth = Math.max(1, 2.2 * zoom);
      context.strokeStyle = CANDY.outline;
      context.beginPath();
      context.ellipse(0, 3 * zoom, 12 * zoom, 5 * zoom, 0, 0, Math.PI * 2);
      context.fillStyle = CANDY.biscuit;
      context.fill();
      context.stroke();
      circle(context, 0, -2 * zoom, 8 * zoom);
      context.fillStyle = CANDY.white;
      context.fill();
      context.stroke();
      circle(context, -2 * zoom, -5 * zoom, 2.6 * zoom);
      context.fillStyle = CANDY.caramel;
      context.fill();
      context.restore();
    }
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    context.globalAlpha = local < 0.6 ? 1 : (1 - local) / 0.4;
    const size = (34 + 20 * easeOut(local)) * zoom;
    if (!candySprite(context, art, "EFFECT:SPLAT", x, y, size)) {
      puff(
        context,
        x,
        y,
        (12 + 8 * easeOut(local)) * zoom,
        CANDY.white,
        "#ffffff",
        CANDY.outline,
        zoom,
      );
      context.fillStyle = CANDY.cream;
      for (let drop = 0; drop < 6; drop += 1) {
        const angle = (drop / 6) * Math.PI * 2 + 0.5;
        const distance = (12 + 18 * easeOut(local)) * zoom;
        circle(
          context,
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance * 0.8,
          2.6 * zoom,
        );
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }
}

/** The Gumball Gunner's shot: one glossy gumball and a sugar pop. */
function drawGumballShot(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
  art: SupportEffectArtV7 | null,
): void {
  const zoom = plan.zoom * plan.scale;
  for (const shot of plan.shots) {
    shot.trail.forEach((point, index) => {
      const age = (index + 1) / (shot.trail.length + 1);
      context.globalAlpha = 0.7 * (1 - age);
      circle(context, point.x, point.y, (4 - 2.5 * age) * zoom);
      context.fillStyle = CANDY.caramel;
      context.fill();
    });
    context.globalAlpha = 1;
    if (
      !candySprite(
        context,
        art,
        "EFFECT:GUMBALL_SHOT",
        shot.at.x,
        shot.at.y,
        24 * zoom,
        shot.angle,
      )
    ) {
      circle(context, shot.at.x, shot.at.y, 6.5 * zoom);
      context.fillStyle = CANDY.caramel;
      context.fill();
      context.strokeStyle = CANDY.outline;
      context.lineWidth = Math.max(1, 2 * zoom);
      context.stroke();
      circle(context, shot.at.x - 2 * zoom, shot.at.y - 2.4 * zoom, 2 * zoom);
      context.fillStyle = CANDY.white;
      context.fill();
    }
  }
  for (const impact of plan.impacts) {
    const local = impact.local;
    const { x, y } = impact.at;
    context.globalAlpha = 1 - local;
    starPath(context, x, y, (14 - 5 * local) * zoom, 5 * zoom, 6, local);
    context.fillStyle = CANDY.white;
    context.fill();
    context.strokeStyle = CANDY.milkChocolate;
    context.lineWidth = Math.max(1, 2 * zoom);
    context.stroke();
    for (let spark = 0; spark < 6; spark += 1) {
      const angle = (spark / 6) * Math.PI * 2 + 0.3;
      const distance = (9 + 15 * easeOut(local)) * zoom;
      circle(
        context,
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        2.2 * zoom,
      );
      context.fillStyle = spark % 2 === 0 ? CANDY.caramel : CANDY.mint;
      context.fill();
    }
    context.globalAlpha = 1;
  }
}

/**
 * The colours of one Battleship broadside (bead pulp_wars-eu3r.4), from the
 * faction palettes: the muzzle flash, the gunsmoke, the blast's fireball,
 * the shock ring and the debris flung out.
 */
export interface BroadsideLookV7 {
  readonly shell: BroadsideShellV7;
  readonly flashCore: string;
  readonly flash: string;
  readonly flashRim: string;
  readonly smoke: string;
  readonly smokeLight: string;
  readonly smokeRim: string;
  readonly fire: string;
  readonly fireLight: string;
  readonly fireRim: string;
  readonly ring: string;
  readonly ringDark: string;
  readonly debris: readonly string[];
  /** Square chips, ice shards, candy sprinkles or glowing motes. */
  readonly debrisShape: "CHIP" | "SHARD" | "SPRINKLE" | "MOTE";
}

/** The Human gold (docs/art/NAVAL_FACTIONS.md) and gunpowder smoke. */
const HUMAN_GOLD = "#fddb21";
const HUMAN_GOLD_LIGHT = "#ffdb6a";
const HUMAN_HULL = "#aa6b27";
/** The Goblin hazard yellow and tin (docs/art/NAVAL_FACTIONS.md). */
const GOBLIN_HAZARD = "#fcd701";
const GOBLIN_TIN = "#899a9c";
const GOBLIN_RUST = "#ac6f41";
/** The Dinosaur basalt, hide sails and red-orange accent. */
const DINOSAUR_BASALT = "#5b616c";
const DINOSAUR_CHARCOAL = "#33363d";
const DINOSAUR_SAND = "#debb78";
const DINOSAUR_HIDE = "#cda461";
const DINOSAUR_WOOD = "#5d351b";
const DINOSAUR_ACCENT = "#fe7500";
/** The Martian glass. */
const MARTIAN_GLASS = "#acf1ec";
const MARTIAN_GUNMETAL = "#3d4c61";
/** Candy: vanilla cream and the small cherry accent (docs/art/factions/CANDY.md). */
const CANDY_VANILLA = "#fff1d0";
const CANDY_CHERRY = "#e8506e";

/** The look of a broadside's shell; GHOST_FIRE takes the Undead accent. */
export function broadsideLookV7(
  shell: BroadsideShellV7,
  undeadViolet: boolean,
): BroadsideLookV7 {
  switch (shell) {
    case "CANNONBALL":
      return {
        shell,
        flashCore: "#ffffff",
        flash: MUZZLE_HOT,
        flashRim: "#5a3a12",
        smoke: "#d8d4cc",
        smokeLight: "#ffffff",
        smokeRim: "#5f5a52",
        fire: HUMAN_GOLD,
        fireLight: MUZZLE_HOT,
        fireRim: "#7a3e0c",
        ring: "#fff3d0",
        ringDark: "#5a3a12",
        debris: [DWARF.iron, "#6d665e", HUMAN_HULL, HUMAN_GOLD_LIGHT],
        debrisShape: "CHIP",
      };
    case "GHOST_FIRE": {
      const palette = undeadViolet
        ? NECRO_BOLT_VIOLET_V7
        : NECRO_BOLT_CLASSIC_V7;
      return {
        shell,
        flashCore: "#ffffff",
        flash: palette.pale,
        flashRim: palette.outline,
        smoke: "#535353",
        smokeLight: "#737473",
        smokeRim: "#1b1a1d",
        fire: palette.mid,
        fireLight: palette.lit,
        fireRim: palette.outline,
        ring: palette.lit,
        ringDark: palette.outline,
        debris: [palette.pale, palette.lit, "#e8dfc8"],
        debrisShape: "MOTE",
      };
    }
    case "SCRAP":
      return {
        shell,
        flashCore: GOBLIN.white,
        flash: GOBLIN.spark,
        flashRim: GOBLIN.charcoal,
        smoke: GOBLIN.soot,
        smokeLight: GOBLIN.lightGrey,
        smokeRim: GOBLIN.charcoal,
        fire: GOBLIN_HAZARD,
        fireLight: GOBLIN.spark,
        fireRim: GOBLIN.charcoal,
        ring: GOBLIN.cream,
        ringDark: GOBLIN.charcoal,
        debris: [GOBLIN_TIN, GOBLIN_HAZARD, GOBLIN_RUST, GOBLIN.charcoal],
        debrisShape: "CHIP",
      };
    case "BOULDER":
      return {
        shell,
        flashCore: "#ffffff",
        flash: "#efe6c8",
        flashRim: DINOSAUR_WOOD,
        smoke: DINOSAUR_HIDE,
        smokeLight: DINOSAUR_SAND,
        smokeRim: DINOSAUR_WOOD,
        fire: DINOSAUR_SAND,
        fireLight: "#efe6c8",
        fireRim: DINOSAUR_WOOD,
        ring: "#efe6c8",
        ringDark: DINOSAUR_WOOD,
        debris: [
          DINOSAUR_BASALT,
          DINOSAUR_CHARCOAL,
          DINOSAUR_ACCENT,
          "#ab8344",
        ],
        debrisShape: "CHIP",
      };
    case "PLASMA":
      return {
        shell,
        flashCore: "#ffffff",
        flash: MARTIAN.magentaPale,
        flashRim: MARTIAN.magentaDark,
        smoke: MARTIAN_GLASS,
        smokeLight: "#ffffff",
        smokeRim: MARTIAN_GUNMETAL,
        fire: MARTIAN.magenta,
        fireLight: MARTIAN.magentaGlow,
        fireRim: MARTIAN.magentaDark,
        ring: MARTIAN.magentaGlow,
        ringDark: MARTIAN.magentaDark,
        debris: [MARTIAN.magentaPale, MARTIAN_GLASS, "#ffffff"],
        debrisShape: "MOTE",
      };
    case "ICE":
      return {
        shell,
        flashCore: "#ffffff",
        flash: ICE.icePale,
        flashRim: ICE.iceDark,
        smoke: ICE.snow,
        smokeLight: "#ffffff",
        smokeRim: ICE.snowRim,
        fire: ICE.iceGlow,
        fireLight: ICE.icePale,
        fireRim: ICE.iceDark,
        ring: ICE.icePale,
        ringDark: ICE.iceDark,
        debris: [ICE.ice, ICE.icePale, ICE.iceGlow],
        debrisShape: "SHARD",
      };
    case "STEAM":
      return {
        shell,
        flashCore: "#ffffff",
        flash: MUZZLE_HOT,
        flashRim: DWARF.outline,
        smoke: DWARF.steam,
        smokeLight: "#ffffff",
        smokeRim: DWARF.ironRim,
        fire: DWARF.copper,
        fireLight: MUZZLE_HOT,
        fireRim: DWARF.copperShade,
        ring: DWARF.steam,
        ringDark: DWARF.outline,
        debris: [DWARF.earthDark, DWARF.iron, DWARF.copper, DWARF.earthLight],
        debrisShape: "CHIP",
      };
    case "CANDY":
      return {
        shell,
        flashCore: CANDY.white,
        flash: CANDY_VANILLA,
        flashRim: CANDY.milkChocolate,
        smoke: CANDY.cream,
        smokeLight: CANDY.white,
        smokeRim: CANDY.milkChocolate,
        fire: CANDY.caramel,
        fireLight: CANDY_VANILLA,
        fireRim: CANDY.chocolate,
        ring: CANDY.caramel,
        ringDark: CANDY.chocolate,
        debris: [CANDY.mint, CANDY.caramel, CANDY.white, CANDY_CHERRY],
        debrisShape: "SPRINKLE",
      };
  }
}

/** A rounded square path centred on a point. */
function roundedSquare(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  half: number,
  corner: number,
): void {
  const radius = Math.max(0, Math.min(corner, half));
  context.beginPath();
  context.moveTo(x - half + radius, y - half);
  context.arcTo(x + half, y - half, x + half, y + half, radius);
  context.arcTo(x + half, y + half, x - half, y + half, radius);
  context.arcTo(x - half, y + half, x - half, y - half, radius);
  context.arcTo(x - half, y - half, x + half, y - half, radius);
  context.closePath();
}

/** One piece of debris at a point, turned by `spin`. */
function debrisPiece(
  context: CanvasRenderingContext2D,
  look: BroadsideLookV7,
  x: number,
  y: number,
  size: number,
  spin: number,
  colour: string,
  zoom: number,
): void {
  context.fillStyle = colour;
  switch (look.debrisShape) {
    case "CHIP":
      context.save();
      context.translate(x, y);
      context.rotate(spin);
      context.fillRect(-size / 2, -size / 2, size, size);
      context.strokeStyle = look.fireRim;
      context.lineWidth = Math.max(1, 1.2 * zoom);
      context.strokeRect(-size / 2, -size / 2, size, size);
      context.restore();
      return;
    case "SHARD":
      context.save();
      context.translate(x, y);
      context.rotate(spin);
      context.beginPath();
      context.moveTo(size * 1.1, 0);
      context.lineTo(-size * 0.6, -size * 0.55);
      context.lineTo(-size * 0.6, size * 0.55);
      context.closePath();
      context.fill();
      context.strokeStyle = look.fireRim;
      context.lineWidth = Math.max(1, 1.3 * zoom);
      context.stroke();
      context.restore();
      return;
    case "SPRINKLE":
      context.strokeStyle = colour;
      context.lineWidth = Math.max(1, size * 0.6);
      context.beginPath();
      context.moveTo(x - Math.cos(spin) * size, y - Math.sin(spin) * size);
      context.lineTo(x + Math.cos(spin) * size, y + Math.sin(spin) * size);
      context.stroke();
      return;
    case "MOTE":
      circle(context, x, y, size * 0.6);
      context.fill();
      return;
  }
}

/**
 * One blast: a hot flash, a fireball of the shell's colours, smoke rising
 * from it and debris flung out. `size` is 1 for the target's blast and
 * smaller for a splashed unit's.
 */
function broadsideBlast(
  context: CanvasRenderingContext2D,
  look: BroadsideLookV7,
  x: number,
  y: number,
  local: number,
  size: number,
  zoom: number,
): void {
  const z = zoom * size;
  const grow = easeOut(Math.min(1, local / 0.5));
  // Smoke rising behind the fireball.
  if (local > 0.18) {
    const smoke = (local - 0.18) / 0.82;
    context.globalAlpha = Math.max(0, 0.85 * (1 - smoke * smoke));
    for (let index = 0; index < 3; index += 1) {
      const dx = (index - 1) * 14 * z;
      puff(
        context,
        x + dx * (0.6 + smoke * 0.6),
        y - (10 + 34 * easeOut(smoke)) * z - (index === 1 ? 8 * z : 0),
        (9 + 9 * easeOut(smoke)) * z,
        look.smoke,
        look.smokeLight,
        look.smokeRim,
        zoom,
      );
    }
  }
  // The fireball: seven lobes swelling out round the hit.
  const fireAlpha = local < 0.45 ? 1 : 1 - (local - 0.45) / 0.55;
  context.globalAlpha = Math.max(0, fireAlpha);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2 - Math.PI / 2 + 0.3;
    const distance = (5 + 22 * grow) * z;
    puff(
      context,
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance * 0.8 - local * 8 * z,
      (8 + 9 * grow) * z * (1 - 0.35 * Math.max(0, local - 0.5)),
      look.fire,
      look.fireLight,
      look.fireRim,
      zoom,
    );
  }
  circle(context, x, y - local * 8 * z, (10 + 10 * grow) * z);
  context.fillStyle = look.fireLight;
  context.fill();
  // The flash: a big star, white hot, gone by a third of the burst.
  if (local < 0.34) {
    const flash = 1 - local / 0.34;
    const swell = easeOut(Math.min(1, local / 0.12));
    context.globalAlpha = flash;
    starPath(
      context,
      x,
      y,
      (22 + 20 * swell) * z,
      (11 + 8 * swell) * z,
      12,
      0.13,
    );
    context.fillStyle = look.flash;
    context.fill();
    context.strokeStyle = look.flashRim;
    context.lineWidth = Math.max(1, 2.6 * zoom);
    context.stroke();
    circle(context, x, y, (8 + 9 * swell) * z);
    context.fillStyle = look.flashCore;
    context.fill();
  }
  // Debris flung out in every direction, falling.
  context.globalAlpha = Math.max(0, local < 0.6 ? 1 : 1 - (local - 0.6) / 0.4);
  const pieces = size < 1 ? 5 : 10;
  for (let piece = 0; piece < pieces; piece += 1) {
    const angle = (piece / pieces) * Math.PI * 2 + 0.4;
    const distance = (12 + (size < 1 ? 26 : 46) * easeOut(local)) * z;
    const colour = look.debris[piece % look.debris.length] ?? look.fire;
    debrisPiece(
      context,
      look,
      x + Math.cos(angle) * distance,
      y +
        Math.sin(angle) * distance * 0.75 -
        14 * z * Math.sin(Math.PI * Math.min(1, local * 1.4)) +
        local * local * 26 * z,
      (piece % 3 === 0 ? 6 : 4.5) * z,
      angle + local * 9 * (piece % 2 === 0 ? 1 : -1),
      colour,
      zoom,
    );
  }
  context.globalAlpha = 1;
}

/** The shell in flight, at the origin, heading along +x. */
function broadsideShell(
  context: CanvasRenderingContext2D,
  look: BroadsideLookV7,
  flight: number,
  angle: number,
  zoom: number,
): void {
  const radius = 13 * zoom;
  const line = Math.max(1, 2.4 * zoom);
  const spin = flight * Math.PI * 2.5;
  const ball = (fill: string, rim: string, light: string): void => {
    circle(context, 0, 0, radius);
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = rim;
    context.lineWidth = line;
    context.stroke();
    context.beginPath();
    context.arc(0, 0, radius * 0.62, Math.PI * 1.05, Math.PI * 1.6);
    context.strokeStyle = light;
    context.lineWidth = Math.max(1, 2.4 * zoom);
    context.stroke();
  };
  switch (look.shell) {
    case "CANNONBALL":
      ball(DWARF.iron, DWARF.outline, "#8d8c8a");
      // A lit fuse spark at the back.
      starPath(
        context,
        -Math.cos(angle) * radius,
        -Math.sin(angle) * radius,
        5 * zoom,
        2 * zoom,
        5,
        flight * 9,
      );
      context.fillStyle = HUMAN_GOLD;
      context.fill();
      return;
    case "STEAM":
      ball(DWARF.iron, DWARF.outline, DWARF.ironRim);
      // A riveted copper band.
      context.save();
      context.rotate(spin);
      context.strokeStyle = DWARF.copper;
      context.lineWidth = Math.max(1, 3 * zoom);
      context.beginPath();
      context.moveTo(0, -radius + 1.5 * zoom);
      context.lineTo(0, radius - 1.5 * zoom);
      context.stroke();
      context.restore();
      return;
    case "GHOST_FIRE": {
      // Flame tongues trailing behind a burning orb.
      context.save();
      context.rotate(angle + Math.PI);
      for (const [colour, scale] of [
        [look.fireRim, 1.25],
        [look.fire, 1],
        [look.fireLight, 0.62],
      ] as const) {
        context.beginPath();
        context.moveTo(0, -radius * scale);
        context.quadraticCurveTo(
          radius * 1.4 * scale,
          -radius * 0.5 * scale + Math.sin(flight * 30) * 3 * zoom,
          radius * 2.4 * scale,
          0,
        );
        context.quadraticCurveTo(
          radius * 1.4 * scale,
          radius * 0.5 * scale - Math.sin(flight * 30) * 3 * zoom,
          0,
          radius * scale,
        );
        context.closePath();
        context.fillStyle = colour;
        context.fill();
      }
      context.restore();
      context.globalAlpha = 0.5;
      circle(context, 0, 0, radius * 1.45);
      context.fillStyle = look.fireLight;
      context.fill();
      context.globalAlpha = 1;
      circle(context, 0, 0, radius * 0.85);
      context.fillStyle = look.fire;
      context.fill();
      context.strokeStyle = look.fireRim;
      context.lineWidth = line;
      context.stroke();
      circle(context, -2 * zoom, -2 * zoom, radius * 0.45);
      context.fillStyle = look.flash;
      context.fill();
      return;
    }
    case "SCRAP": {
      // A tumbling bundle of junk: a tin drum, a gear, a hazard plate.
      context.save();
      context.rotate(spin);
      context.lineWidth = line;
      context.strokeStyle = GOBLIN.charcoal;
      starPath(
        context,
        radius * 0.35,
        -radius * 0.2,
        radius * 0.8,
        radius * 0.55,
        8,
      );
      context.fillStyle = GOBLIN_TIN;
      context.fill();
      context.stroke();
      circle(context, radius * 0.35, -radius * 0.2, radius * 0.22);
      context.fillStyle = GOBLIN.charcoal;
      context.fill();
      context.beginPath();
      context.rect(-radius * 0.95, -radius * 0.5, radius * 1.1, radius * 1.15);
      context.fillStyle = GOBLIN_RUST;
      context.fill();
      context.stroke();
      context.beginPath();
      context.rect(-radius * 0.95, -radius * 0.05, radius * 1.1, radius * 0.3);
      context.fillStyle = GOBLIN_HAZARD;
      context.fill();
      context.restore();
      return;
    }
    case "BOULDER": {
      context.save();
      context.rotate(spin * 0.6);
      const rock = (scale: number): void => {
        context.beginPath();
        ROCK_SHAPE.forEach((lump, index) => {
          const turn = (index / ROCK_SHAPE.length) * Math.PI * 2;
          const px = Math.cos(turn) * radius * 1.2 * lump * scale;
          const py = Math.sin(turn) * radius * 1.2 * lump * scale;
          if (index === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        });
        context.closePath();
      };
      rock(1);
      context.fillStyle = DINOSAUR_BASALT;
      context.fill();
      context.strokeStyle = DINOSAUR_CHARCOAL;
      context.lineWidth = line;
      context.stroke();
      context.restore();
      context.save();
      context.translate(-radius * 0.22, -radius * 0.25);
      circle(context, 0, 0, radius * 0.5);
      context.fillStyle = "#7d8592";
      context.fill();
      context.restore();
      // A red-orange war-paint stripe.
      context.save();
      context.rotate(spin * 0.6);
      context.strokeStyle = DINOSAUR_ACCENT;
      context.lineWidth = Math.max(1, 2.6 * zoom);
      context.beginPath();
      context.moveTo(-radius * 0.5, radius * 0.45);
      context.lineTo(radius * 0.5, -radius * 0.1);
      context.stroke();
      context.restore();
      return;
    }
    case "PLASMA": {
      context.globalAlpha = 0.45;
      circle(context, 0, 0, radius * 1.7);
      context.fillStyle = MARTIAN.magentaGlow;
      context.fill();
      context.globalAlpha = 1;
      circle(context, 0, 0, radius);
      context.fillStyle = MARTIAN.magenta;
      context.fill();
      context.strokeStyle = MARTIAN.magentaDark;
      context.lineWidth = line;
      context.stroke();
      circle(context, 0, 0, radius * 0.55);
      context.fillStyle = "#ffffff";
      context.fill();
      // Crackling arcs round the bolt.
      context.strokeStyle = MARTIAN_GLASS;
      context.lineWidth = Math.max(1, 1.8 * zoom);
      for (let arc = 0; arc < 3; arc += 1) {
        const turn = spin * 2 + (arc * Math.PI * 2) / 3;
        context.beginPath();
        context.arc(0, 0, radius * 1.35, turn, turn + 0.9);
        context.stroke();
      }
      return;
    }
    case "ICE": {
      // A cluster of ice crystals, turning.
      context.save();
      context.rotate(spin * 0.7);
      for (const [cx, cy, scale] of [
        [0, 0, 1.2],
        [-0.55, -0.45, 0.7],
        [0.6, 0.35, 0.75],
      ] as const) {
        const s = radius * scale;
        context.beginPath();
        context.moveTo(radius * cx, radius * cy - s);
        context.lineTo(radius * cx + s * 0.62, radius * cy);
        context.lineTo(radius * cx, radius * cy + s);
        context.lineTo(radius * cx - s * 0.62, radius * cy);
        context.closePath();
        context.fillStyle = ICE.ice;
        context.fill();
        context.strokeStyle = ICE.iceDark;
        context.lineWidth = line;
        context.stroke();
        context.fillStyle = ICE.icePale;
        context.fillRect(
          radius * cx - s * 0.22,
          radius * cy - s * 0.55,
          Math.max(1, s * 0.3),
          Math.max(1, s * 0.4),
        );
      }
      context.restore();
      return;
    }
    case "CANDY": {
      // A chocolate truffle with a caramel drizzle and a hard shine.
      circle(context, 0, 0, radius);
      context.fillStyle = CANDY.chocolate;
      context.fill();
      context.strokeStyle = CANDY.outline;
      context.lineWidth = line;
      context.stroke();
      context.save();
      context.rotate(spin);
      context.strokeStyle = CANDY.caramel;
      context.lineWidth = Math.max(1, 2.4 * zoom);
      context.beginPath();
      for (let step = 0; step <= 4; step += 1) {
        const px = -radius * 0.7 + (step / 4) * radius * 1.4;
        const py = (step % 2 === 0 ? -0.25 : 0.25) * radius;
        if (step === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.stroke();
      context.restore();
      circle(context, -radius * 0.38, -radius * 0.4, radius * 0.22);
      context.fillStyle = CANDY.white;
      context.fill();
      return;
    }
  }
}

/**
 * The Battleship's broadside (bead pulp_wars-eu3r.4): three guns flash
 * along the hull with gunsmoke rolling out, a heavy shell of the faction's
 * own arcs over, the target bursts, and a shock ring spreads over the
 * splash tiles while each splashed unit bursts in turn.
 */
function drawBroadside(
  context: CanvasRenderingContext2D,
  plan: AttackEffectPlanV7,
  look: BroadsideLookV7,
): void {
  const zoom = plan.zoom * plan.scale;
  // The shock ring under the blasts: the splash area flushes, and a ring
  // runs out over it to the edge of the 3 x 3 tiles.
  const ring = plan.ring;
  if (ring !== null) {
    const { x, y } = ring.at;
    const fade = 1 - ring.local;
    context.globalAlpha = 0.3 * fade * fade;
    roundedSquare(
      context,
      x,
      y,
      Math.min(ring.areaHalfSize, ring.halfSize * 1.05),
      ring.halfSize * 0.35,
    );
    context.fillStyle = look.ring;
    context.fill();
    context.globalAlpha = Math.min(1, fade * 1.6);
    roundedSquare(context, x, y, ring.halfSize, ring.halfSize * 0.35);
    context.strokeStyle = look.ringDark;
    context.lineWidth = Math.max(1.5, (7 * fade + 2) * zoom);
    context.stroke();
    context.strokeStyle = look.ring;
    context.lineWidth = Math.max(1, (4 * fade + 1) * zoom);
    context.stroke();
    context.globalAlpha = 1;
  }
  // Each splashed unit's burst, then the target's.
  for (const impact of plan.impacts)
    if (impact.splash === true)
      broadsideBlast(
        context,
        look,
        impact.at.x,
        impact.at.y,
        impact.local,
        0.62,
        zoom,
      );
  for (const impact of plan.impacts)
    if (impact.splash !== true)
      broadsideBlast(
        context,
        look,
        impact.at.x,
        impact.at.y,
        impact.local,
        1,
        zoom,
      );
  // The guns: a flash at each port, then gunsmoke rolling out toward the
  // target and up.
  for (const gun of plan.guns) {
    const { x, y } = gun.at;
    const local = gun.local;
    const smokeAlpha = local < 0.35 ? 1 : 1 - (local - 0.35) / 0.65;
    context.globalAlpha = Math.max(0, smokeAlpha) * 0.95;
    for (let index = 0; index < 2; index += 1) {
      const distance = (6 + (index === 0 ? 14 : 26) * easeOut(local)) * zoom;
      puff(
        context,
        x + plan.direction.x * distance,
        y + plan.direction.y * distance - (4 + 18 * local) * zoom,
        (5 + 8 * easeOut(local)) * zoom,
        look.smoke,
        look.smokeLight,
        look.smokeRim,
        zoom,
      );
    }
    if (local < 0.36) {
      const flash = 1 - local / 0.36;
      context.globalAlpha = flash;
      starPath(
        context,
        x + plan.direction.x * 6 * zoom,
        y + plan.direction.y * 6 * zoom,
        (11 + 9 * flash) * zoom,
        5 * zoom,
        8,
        0.2,
      );
      context.fillStyle = look.flash;
      context.fill();
      context.strokeStyle = look.flashRim;
      context.lineWidth = Math.max(1, 2.2 * zoom);
      context.stroke();
      circle(
        context,
        x + plan.direction.x * 6 * zoom,
        y + plan.direction.y * 6 * zoom,
        5 * zoom,
      );
      context.fillStyle = look.flashCore;
      context.fill();
    }
    context.globalAlpha = 1;
  }
  // The shell: a smoky trail, then the shell itself.
  for (const shot of plan.shots) {
    shot.trail.forEach((point, index) => {
      const age = (index + 1) / (shot.trail.length + 1);
      context.globalAlpha = 0.75 * (1 - age);
      circle(context, point.x, point.y - age * 4 * zoom, (3 + 6 * age) * zoom);
      context.fillStyle = index % 2 === 0 ? look.smoke : look.fireLight;
      context.fill();
    });
    context.globalAlpha = 1;
    context.save();
    context.translate(shot.at.x, shot.at.y);
    broadsideShell(context, look, shot.flight, shot.angle, zoom);
    context.restore();
  }
}
