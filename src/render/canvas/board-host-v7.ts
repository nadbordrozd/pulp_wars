import {
  previewRitualV7,
  unitFactionV7,
  unitIsFrogV7,
  unitRoleRuleV7,
  type CoordV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
} from "../../engine/index";
import {
  afflictionCursorCueV7,
  terrorCursorCueV7,
  unitIsUndeadV7,
} from "../undead-presentation-v7";
import { berserkCursorCueV7, unitIsGoblinV7 } from "../goblin-presentation-v7";
import { mindControlledInfoV7 } from "../martian-presentation-v7";
import {
  eggCountdownTextV7,
  eggTurnsRemainingV7,
  unitDisplayNameV7,
  unitIsDinosaurV7,
} from "../dinosaur-presentation-v7";
import {
  drawBombProjectileV7,
  drawExplosionFeedbackV7,
  type ExplosionFeedbackV7,
} from "./goblin-explosion-v7";
import {
  drawDinosaurFeedbackV7,
  type DinosaurFeedbackV7,
} from "./dinosaur-effects-v7";
import {
  DINOSAUR_CUE_COLORS_V7,
  growthSpriteScaleV7,
} from "./dinosaur-canvas-v7";
import { GINGERBREAD_MAN_SPRITE_SCALE_V7 } from "./giant-canvas-v7";
import {
  CULT_EFFECT_SUBJECTS_V7,
  cultReducedMotionProgressV7,
  drawCultFeedbackV7,
  type CultFeedbackV7,
} from "./cult-effects-v7";
import { favourEntriesV7 } from "../cult-presentation-v7";
import { wardenTileLinesV7 } from "../cult-channel-presentation-v7";
import {
  cultTrickTileLinesV7,
  frogNameV7,
} from "../cult-ritual-presentation-v7";
import {
  MARTIAN_EFFECT_SUBJECTS_V7,
  drawMartianFeedbackV7,
  type MartianFeedbackV7,
} from "./martian-effects-v7";
import { iceChipTooltipV7, iceOnTileV7 } from "../frozen-sea-presentation-v7";
import {
  ICE_FOLK_EFFECT_DURATIONS_V7,
  ICE_FOLK_EFFECT_SUBJECTS_V7,
  drawIceFolkFeedbackV7,
  shatterBoardCueV7,
  type IceFolkFeedbackV7,
} from "./ice-folk-effects-v7";
import {
  createIceFolkBoardArtV7,
  type IceFolkBoardArtV7,
} from "./ice-folk-canvas-v7";
import {
  snowTooltipV7,
  BLIZZARD_TOOLTIP_V7,
} from "../ice-folk-presentation-v7";
import {
  DWARF_EFFECT_SUBJECTS_V7,
  drawDwarfFeedbackV7,
  dwarfReducedMotionProgressV7,
  eruptionCueV7,
  DWARF_EFFECT_DURATIONS_V7,
  type DwarfFeedbackV7,
} from "./dwarf-effects-v7";
import { createDwarfBoardArtV7, type DwarfBoardArtV7 } from "./dwarf-canvas-v7";
import {
  ATTACK_EFFECT_DURATIONS_V7,
  ATTACK_EFFECT_HIT_V7,
  attackReducedMotionProgressV7,
  drawAttackFeedbackV7,
  type AttackEffectIdV7,
  type AttackFeedbackV7,
} from "./attack-effects-v7";
import {
  BARRICADE_RULE_V7,
  moundAtV7,
  moundInfoLinesV7,
} from "../dwarf-presentation-v7";
import { barricadeTileLineV7 } from "./dwarf-board-plan-v7";
import {
  CANDY_EFFECT_SUBJECTS_V7,
  candyReducedMotionProgressV7,
  drawCandyFeedbackV7,
  type CandyFeedbackV7,
} from "./candy-effects-v7";
import { CRASHED_SPRITE_SATURATION_V7 } from "./candy-canvas-v7";
import { GINGERBREAD_MAN_LABEL_V7 } from "../giant-presentation-v7";
import {
  GIANT_EFFECT_HIT_V7,
  drawGiantFeedbackV7,
  giantBoardShakeCssPxV7,
  giantReducedMotionProgressV7,
  giantUnitPulsesV7,
  type GiantFeedbackV7,
  type GiantSpriteV7,
} from "./giant-effects-v7";
import { candyCursorCueV7 } from "./candy-board-plan-v7";
import {
  crumbsTileLinesV7,
  glazeTileLinesV7,
  matchHasCandySeatV7,
} from "../candy-presentation-v7";
import {
  cameraLimitArea,
  cellWorldBounds,
  centerCameraOn,
  clampCamera,
  frameCameraOnArea,
  panCamera,
  panToFrameArea,
  pickGridTile,
  projectGrid,
  screenToWorld,
  TILE_WIDTH,
  worldToScreen,
  type CameraState,
  type Point,
  type ScreenBand,
  type Size,
} from "./geometry";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  selectsFogV7,
  type BoardRenderInteractionV7,
  type BoardSelectionV7,
  type BoardRenderPlanV7,
  type MapCommandTargetV7,
  type UnitPulseV7,
} from "./board-renderer-v7";
import { targetIsSteppedV7 } from "./target-highlight-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
  type PresentationStepCueV7,
} from "./presentation-plan-v7";
import { selectionJumpDurationMs } from "./selection-jump-presentation";
import {
  cameraGlideAtV7,
  cellsOffscreenV7,
  playbackCameraEventsV7,
  playbackCameraTargetV7,
  playbackFollowAllowedV7,
  startCameraGlideV7,
  suppressedSeatAfterInputV7,
  type CameraGlideV7,
} from "./playback-camera-v7";
import {
  MIN_DURATION_SCALE_V7,
  movePathProgressV7,
  playbackDurationScaleV7,
  settleRemainingMsV7,
} from "./playback-pacing-v7";
import {
  archerProjectileEndpoints,
  arrowGeometry,
} from "./combat-presentation";
import { BoardGlowCacheV7 } from "./glow-cache-v7";
import { unitArtSubjectV7 } from "../../assets/chibi-art-v7";
import { playerFactionColourV7 } from "./faction-colours-v7";
import { presentedUnitFactionV7 } from "../neutral-presentation-v7";
import {
  browserChibiRasterEnvironmentV7,
  createChibiArtResolverV7,
  resolveChibiWithFallbackV7,
  type ChibiBoardArtV7,
} from "./chibi-art-resolver-v7";
import {
  adjacentChibiZoomStep,
  chibiBoardWorldBounds,
  chibiMasterScale,
  chibiTileCssPx,
  chibiZoomStepForCamera,
  fitChibiCamera,
  nearestChibiZoomStep,
  zoomChibiCameraAt,
  type ChibiZoomStepV7,
} from "./chibi-geometry-v7";
import {
  CURIOSITY_EFFECT_SUBJECTS_V7,
  SUPPORT_EFFECT_SUBJECTS_V7,
  drawSupportFeedbackV7,
  UNDEAD_VIOLET_GLOW_V7,
  drawWindmillHealingFeedbackV7,
  type SupportEffectArtV7,
  type SupportFeedbackV7,
  type WindmillHealingFeedbackV7,
} from "./support-presentation-v7";
import {
  DEFAULT_BOARD_SATURATION_V7,
  createSpriteSaturationCacheV7,
  type BoardSaturationV7,
  type SpriteSaturationCacheV7,
} from "./sprite-saturation-v7";
import { buildingFadeFromSearchV7 } from "./building-fade-v7";
import {
  createDirectedChibiArtV7,
  type BoardDirectionRuntimeV7,
  type BoardVisualDirectionV7,
} from "./visual-direction-v7";
import type { ChibiArtRegistryV7 } from "../../assets/chibi-art-v7";
import { CHIBI_FOREST_ART_SET_V7 } from "../../assets/chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../../assets/chibi-mountain-ranges-manifest";
import {
  createChibiMassifArtV7,
  type ChibiMassifArtV7,
} from "./chibi-massif-v7";
import { FACTION_GRASS_TILES_V7 } from "../../assets/faction-grass-manifest";
import {
  coastSandEnabledV7,
  createCoastSandArtV7,
  type CoastSandArtV7,
} from "./coast-sand-v7";
import {
  settlementShadowEnabledV7,
  settlementShadowPlainV7,
} from "./settlement-shadow-v7";
import {
  createTerrainRippleV7,
  terrainRippleEnabledV7,
} from "./terrain-ripple-v7";
import {
  createVictoryWaveV7,
  drawVictoryFadeTintV7,
  victoryWaveEnabledV7,
  type VictoryWaveFrameV7,
  type VictoryWaveModeV7,
} from "./victory-wave-v7";
import {
  terrainAtFogEnabledV7,
  terrainGhostsOfV7,
  terrainSkeletonOfViewV7,
  type TerrainSkeletonV7,
} from "./terrain-at-fog-v7";
import {
  createFogArtV7,
  fogStyleV7,
  type FogArtV7,
  type FogPaletteIdV7,
} from "./fog-of-war-v7";
import {
  createFogPuffClockV7,
  createFogPuffSurfaceV7,
  drawFogPuffV7,
  fogPuffAtV7,
  fogPuffColoursV7,
  fogPuffDurationMsV7,
  fogPuffEnabledV7,
  fogPuffLengthMsV7,
  type FogPuffSurfaceV7,
  type FogPuffV7,
} from "./fog-puff-v7";
import {
  createFogLiftClockV7,
  createFogLiftScratchV7,
  FOG_LIFT_V7,
  createFogLiftSpritesV7,
  drawFogLiftV7,
  fogLiftColoursV7,
  fogLiftEnabledV7,
  fogLiftTimingV7,
  type FogLiftScratchV7,
  type FogLiftSpritesV7,
  type FogLiftTimingV7,
} from "./fog-lift-v7";
import { starfieldEnabledV7 } from "./starfield-v7";
import {
  CombatJuiceV7,
  DAMAGE_FLOAT_V7,
  DEATH_POOF_V7,
  SPAWN_POP_V7,
  combatJuiceDeathsV7,
  combatJuiceHitsForStepV7,
  combatJuiceScaleV7,
  combatJuiceSpawnsV7,
  combatJuiceSpriteOfV7,
  drawCombatJuiceFloatsV7,
  drawCombatJuiceUnitsV7,
  type CombatJuiceEntryV7,
  type CombatJuiceSpriteV7,
} from "./combat-juice-v7";
import {
  createWaterBlendArtV7,
  waterBlendStyleV7,
  type WaterBlendArtV7,
} from "./water-blend-v7";
import { FACTION_FOREST_ART_SETS_V7 } from "../../assets/faction-forest-pieces-manifest";
import {
  createFactionForestArtV7,
  factionForestsEnabledV7,
} from "./faction-forests-v7";
import {
  createFactionGrassArtV7,
  factionGrassEnabledV7,
  type FactionGrassArtV7,
} from "./faction-grass-v7";
import {
  createChibiForestArtV7,
  type ChibiForestArtV7,
} from "./chibi-forest-v7";
import {
  CURIOSITY_LABELS_V7,
  CURIOSITY_RULES_V7,
  curiosityOverlayOnTileV7,
  isMonsterUnitV7,
  neutralBreedOfUnitV7,
  neutralUnitLabelV7,
} from "../curiosity-presentation-v7";
import { BoardFeedbackV7, type BoardFeedbackPortV7 } from "./feedback-host-v7";
import type { FirstStepMarkerV7 } from "../first-steps-v7";
import type { MissionMarkerV7 } from "../mission-presentation-v7";
import { cityAccessibleNameV7 } from "../city-names-presentation-v7";
import { tileSiteDockV7 } from "../tile-site-presentation-v7";
import { tileActionsAtV7, type TileActionPlanV7 } from "./tile-actions-v7";
import { drawTileActionBadgesV7 } from "./tile-action-badges-v7";
import { reportPresentationFailureV7 } from "../presentation-guard-v7";

export interface BoardHostModelV7 {
  readonly matchInstanceId: string | number;
  readonly view: PlayerViewV7;
  readonly offeredCommands: Parameters<typeof buildBoardRenderPlanV7>[1];
  readonly interaction: BoardRenderInteractionV7;
  readonly interactive: boolean;
  readonly motion: "FULL" | "REDUCED";
  readonly animationSpeed: "NORMAL" | "FAST";
  readonly presentationPaused: boolean;
  readonly highContrast: boolean;
  /**
   * Developer experiment (pulp_wars-x6c): building and city saturation in
   * percent. Omitted, or 100, draws exactly as without it.
   */
  readonly saturation?: BoardSaturationV7;
  /**
   * The visual direction of the art (pulp_wars-3tq.6: the app passes the
   * live direction by default). Omitted draws the classic look, exactly as
   * before the direction existed.
   */
  readonly visualDirection?: BoardVisualDirectionV7;
  /**
   * The direction's own art, resolved before the default art. A piece whose
   * direction raster fails to load falls back to its default asset.
   */
  readonly visualDirectionArt?: ChibiArtRegistryV7;
  /**
   * False hides the keyboard cursor (the Gallery's animation preview,
   * bead pulp_wars-ic8, which no one steers). Omitted draws it as before.
   */
  readonly showCursor?: boolean;
  /**
   * First steps (bead pulp_wars-2yc.39): the marker the coach points at a
   * city, tile or unit with. Omitted or null draws none.
   */
  readonly firstStepMarker?: FirstStepMarkerV7 | null;
  /**
   * A mission's marks over the board (`pulp_wars-v642.1`): the objective's
   * places and named units. Omitted draws none.
   */
  readonly missionMarkers?: readonly MissionMarkerV7[];
  /**
   * Tile actions (bead pulp_wars-2yc.60): the selected unit's actions by
   * tile, with nothing armed. Each listed tile wears its action badges and
   * a tap (or Enter) on it goes to `onTileActions`. Omitted or null shows
   * none.
   */
  readonly tileActions?: TileActionPlanV7 | null;
}

/**
 * Where a tile is on screen, in CSS px from the canvas's top-left corner:
 * its centre and its width (the tile chooser is anchored to it).
 */
export interface TileAnchorV7 {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** A boundary waiting to play after the one being presented. */
export interface QueuedBoundaryV7 {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: PlayerEventEnvelopeV7;
}

/** Calm playback (bead pulp_wars-2yc.49): what the host may know ahead. */
export interface PresentBoundaryOptionsV7 {
  /**
   * The boundaries queued behind this one, in order. The camera frames an
   * event together with the same player's queued events that fit the view
   * with it, and playback hurries as the queue grows.
   */
  readonly upcoming?: readonly QueuedBoundaryV7[];
  /**
   * Asked as the boundary ends (bead pulp_wars-2yc.62): true while another
   * boundary waits to play next. The board then keeps showing this one's
   * result until the next starts, instead of the game's latest view, which
   * is ahead of the playback (its units already where later commands take
   * them) and would show for a frame before snapping back.
   */
  readonly holdResult?: () => boolean;
}

/**
 * The board plans kept (bead pulp_wars-2yc.62): a playing boundary draws
 * its views before and after, the territory ripple reads the view drawn
 * last, and the game's latest view is described for screen readers; with
 * room for all four, each command of an AI turn builds one new plan.
 */
const PLAN_CACHE_SIZE_V7 = 4;

/** How many queued boundaries the camera looks ahead when it frames. */
const PLAYBACK_LOOKAHEAD_V7 = 8;

export interface BoardHostCallbacksV7 {
  readonly onSelection: (selection: BoardSelectionV7 | null) => void;
  readonly onCommand: (target: MapCommandTargetV7) => void;
  /**
   * A tap or Enter on a tile of the model's `tileActions`: the app does its
   * one action or opens its chooser there. Without it such a tap does what
   * it did before.
   */
  readonly onTileActions?: (at: CoordV7, anchor: TileAnchorV7) => void;
}

export interface BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void;
  update(model: BoardHostModelV7): void;
  activate(at: CoordV7): void;
  /**
   * Bead pulp_wars-2yc.82 (UI review S1), narrowed by pulp_wars-2yc.87: the
   * unexplored tile just tapped opens no dock and is not kept selected.
   * The fog's puff answers the tap and, after a pointer tap, no cursor box
   * is drawn on it until the keyboard moves on. An explored tile always
   * keeps its dock and its box, with no puff.
   */
  quietTap?(at: CoordV7): void;
  /**
   * Bead pulp_wars-2yc.82: the selected tile `at` was let go without a
   * tap (a harvest emptied it). After a pointer tap put the cursor there,
   * no cursor box is drawn on it until the keyboard moves on.
   */
  releaseCursor?(at: CoordV7): void;
  resetInspectionCycle?(): void;
  zoom(direction: "IN" | "OUT"): void;
  focus(): void;
  presentBoundary?(
    before: PlayerViewV7,
    after: PlayerViewV7,
    events: PlayerEventEnvelopeV7,
    options?: PresentBoundaryOptionsV7,
  ): Promise<void>;
  finishPresentations?(): void;
  /**
   * Bead pulp_wars-2yc.10: called as each presentation step starts to play
   * (in reduced motion, as its still frame shows), so sound is timed with
   * the animation. Null removes the listener.
   */
  setPresentationStepListener?(
    listener: ((cue: PresentationStepCueV7) => void) | null,
  ): void;
  /**
   * Bead pulp_wars-2yc.29: the feedback animations of this board (Coins,
   * population, Promotions; feedback-host-v7.ts). A host without them
   * shows every gain at once.
   */
  readonly feedback?: BoardFeedbackPortV7;
  /**
   * The victory wave (bead pulp_wars-556y, victory-wave-v7.ts): whether a
   * victory reached now would play on this board, as the wave or (reduced
   * motion) the crossfade: the switch on, a board that draws frames. The
   * Victory dialog waits for it only then.
   */
  victoryWaveAnimates?(): boolean;
  /**
   * Called once when a victory wave has landed and the dialog may show
   * (at once for a crossfade or a won match loaded as it is). Null
   * removes the listener.
   */
  setVictoryWaveListener?(listener: (() => void) | null): void;
  destroy(): void;
}

/** The most the atmosphere's clock advances in one drawn frame. */
const ATMOSPHERE_STEP_MS = 50;

export class CanvasBoardHostV7 implements BoardHostV7 {
  readonly #document: Document;
  readonly #chibiArt: ChibiBoardArtV7;
  readonly #glowCache: BoardGlowCacheV7;
  readonly #saturationCache: SpriteSaturationCacheV7;
  #direction: {
    readonly key: string;
    readonly registry: ChibiArtRegistryV7 | undefined;
    readonly runtime: BoardDirectionRuntimeV7;
  } | null = null;
  readonly #planCache: {
    view: PlayerViewV7;
    commands: BoardHostModelV7["offeredCommands"];
    interactionKey: string;
    plan: BoardRenderPlanV7;
  }[] = [];
  #drawSerial = 0;
  /** The match and command index of the view drawn last (see drawnKeyV7). */
  #drawnKey: string | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #effectsCanvas: HTMLCanvasElement | null = null;
  #effectsContext: CanvasRenderingContext2D | null = null;
  #description: HTMLElement | null = null;
  #callbacks: BoardHostCallbacksV7 | null = null;
  #model: BoardHostModelV7 | null = null;
  #viewport: Size = { width: 1024, height: 640 };
  #camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  #exploredCache: {
    readonly tiles: PlayerViewV7["board"]["tiles"];
    readonly cells: readonly CoordV7[];
  } | null = null;
  #focused: CoordV7 | null = null;
  /** Mouse hover cell; it only focuses revision-13 splash previews. */
  #hovered: CoordV7 | null = null;
  #boardKey: string | null = null;
  #pointer: { id: number; start: Point; current: Point } | null = null;
  readonly #pointers = new Map<number, Point>();
  #pinch: { readonly distance: number; readonly midpoint: Point } | null = null;
  /** CHIBI pinch zoom snaps to discrete steps relative to the gesture start. */
  #pinchStart: {
    readonly distance: number;
    readonly step: ChibiZoomStepV7;
  } | null = null;
  #wheelDelta = 0;
  #resizeObserver: ResizeObserver | null = null;
  /**
   * The unit drawn off its tile this frame. `travels`: it is on its way to
   * another tile (a Move step), not lunging and coming back, so the
   * selection box goes with it (bead pulp_wars-2yc.84).
   */
  #animatedUnit: {
    readonly id: number;
    readonly at: CoordV7;
    readonly travels?: true;
  } | null = null;
  #animationFrame: number | null = null;
  #animationResolve: (() => void) | null = null;
  #presentationToken = 0;
  #stepListener: ((cue: PresentationStepCueV7) => void) | null = null;
  #cameraFollowAllowed = false;
  /**
   * Calm playback (bead pulp_wars-2yc.49). The seat of the boundary last
   * played with steps the camera frames (it is playing while a presented
   * view is held); the seat the player took the
   * camera from (its events no longer move the camera until another seat
   * plays); and the last unit of another player that walked, with when it
   * stopped (the beat before the next unit starts).
   */
  #presentingFollowSeat: number | null = null;
  #followSuppressedSeat: number | null = null;
  #lastFollowMove: {
    readonly unitId: number;
    readonly endedAt: number;
  } | null = null;
  /** The camera glide in progress (playback-camera-v7.ts). */
  #cameraGlide: {
    readonly glide: CameraGlideV7;
    readonly target: CameraState;
    startedAt: number;
    pausedAt: number | null;
    readonly resolve: () => void;
  } | null = null;
  #ambientFrame: number | null = null;
  #readinessStartedAt = 0;
  #readinessKey: string | null = null;
  #selectionJump: {
    readonly unitId: number;
    readonly startedAt: number;
  } | null = null;
  #presentedView: PlayerViewV7 | null = null;
  #projectile: {
    readonly from: CoordV7;
    readonly to: CoordV7;
    readonly progress: number;
    readonly catapult: boolean;
    /** Revision 17: a Bomb Chucker's round black bomb. */
    readonly bomb?: boolean;
    /** Revision 19: a Spitter's pale cream acid blob. */
    readonly acid?: boolean;
  } | null = null;
  /** The Cultists (bead pulp_wars-mch9.18): the channel cue playing. */
  #cultFeedback: CultFeedbackV7 | null = null;
  /** Review tooling only (pinCultFeedback): cues frozen mid-animation. */
  #pinnedCultFeedback: readonly CultFeedbackV7[] = [];
  /** Revision 19: the Dinosaur cue playing on the effects overlay. */
  #dinosaurFeedback: DinosaurFeedbackV7 | null = null;
  /** Review tooling only (pinDinosaurFeedback): cues frozen mid-animation. */
  #pinnedDinosaurFeedback: readonly DinosaurFeedbackV7[] = [];
  /** The Martian cue playing on the effects overlay (bead pulp_wars-t6s.4). */
  #martianFeedback: MartianFeedbackV7 | null = null;
  /** Review tooling only (pinMartianFeedback): cues frozen mid-animation. */
  #pinnedMartianFeedback: readonly MartianFeedbackV7[] = [];
  /** The Ice Folk cue playing on the effects overlay (bead pulp_wars-7g3.6). */
  #iceFolkFeedback: IceFolkFeedbackV7 | null = null;
  /** Review tooling only (pinIceFolkFeedback): cues frozen mid-animation. */
  #pinnedIceFolkFeedback: readonly IceFolkFeedbackV7[] = [];
  /** The Ice Folk Snow tiles, snow caps, rime and casings, built once. */
  readonly #iceFolkArt: IceFolkBoardArtV7;
  readonly #forestArt: { resolve(): ChibiForestArtV7 | null };
  /** Faction forests (pulp_wars-2yc.2): undefined with the switch off. */
  readonly #factionForestArt?: { resolve(): ChibiForestArtV7 | null };
  readonly #mountainArt: { resolve(): ChibiMassifArtV7 | null };
  /** EXPERIMENT pulp_wars-2o7.4: undefined with the switch off. */
  readonly #factionGrassArt?: { resolve(): FactionGrassArtV7 | null };
  /** A TRY (pulp_wars-2yc.8): the settlement shadow switch, read once. */
  readonly #settlementShadow = settlementShadowEnabledV7();
  readonly #settlementShadowPlain = settlementShadowPlainV7();
  /** Bead pulp_wars-2yc.61: the faded tile buildings, read once. */
  readonly #buildingFade = buildingFadeFromSearchV7();
  /** The shoreline (pulp_wars-2yc.5): undefined with the switch off. */
  readonly #coastArt?: CoastSandArtV7;
  /** The atmosphere (pulp_wars-2yc.17): each undefined with its switch off. */
  readonly #waterBlendArt?: WaterBlendArtV7;
  readonly #fogArt?: FogArtV7;
  readonly #starfield = starfieldEnabledV7();
  /**
   * The fog's drift and the stars' twinkle clock. It advances only with
   * frames that are drawn anyway, by at most ATMOSPHERE_STEP_MS a frame, so
   * the atmosphere never asks for a frame of its own and never jumps after
   * a pause.
   */
  #atmosphereClockMs = 0;
  #atmosphereDrawnAt: number | null = null;
  /**
   * Multi-cell terrain at the fog (pulp_wars-2yc.28): the map's skeleton
   * of a view, from which a plan gets its ghosts. Null draws without them.
   */
  readonly #terrainSkeleton: (view: PlayerViewV7) => TerrainSkeletonV7 | null;
  /**
   * The territory ripple (pulp_wars-2yc.28, terrain-ripple-v7.ts): cells
   * whose territory changed owner hop and change one after another. It
   * runs on the atmosphere's clock and asks for frames only while a cell
   * is still to change.
   */
  readonly #terrainRipple = createTerrainRippleV7<
    BoardRenderPlanV7["entries"][number],
    BoardRenderPlanV7
  >();
  readonly #terrainRippleEnabled = terrainRippleEnabledV7();
  #terrainRippleFrame: number | null = null;
  /** Review tooling only (pinTerrainRipple): the ripple held at a time. */
  #pinnedTerrainRippleMs: number | null = null;
  /**
   * The fog puff (bead pulp_wars-2yc.77, fog-puff-v7.ts): a tap on an
   * unexplored tile stirs its cloud on the effects overlay. It asks for
   * frames (a timer with reduced motion) only while it plays, and only the
   * overlay repaints.
   */
  readonly #fogPuff = createFogPuffClockV7();
  readonly #fogPuffEnabled = fogPuffEnabledV7();
  #fogPuffFrame: number | null = null;
  #fogPuffTimer: number | null = null;
  #fogPuffSurface: FogPuffSurfaceV7 | null | undefined;
  /** Review tooling only (pinFogPuff): a puff held at a time. */
  #pinnedFogPuff: FogPuffV7 | null = null;
  /**
   * Combat juice (bead pulp_wars-2yc.80, combat-juice-v7.ts): damage
   * numbers, death poofs and spawn pops on the effects overlay, on their
   * own clock. The playback's frames draw them while it plays; otherwise
   * they ask for frames (a timer with reduced motion) only while they play.
   */
  readonly #combatJuice = new CombatJuiceV7();
  #combatJuiceFrame: number | null = null;
  #combatJuiceTimer: number | null = null;
  /** The boundary playing: its deaths and arrivals start with its result. */
  #juiceBoundary: {
    readonly before: PlayerViewV7;
    readonly after: PlayerViewV7;
    readonly envelope: PlayerEventEnvelopeV7;
    readonly steps: readonly CorePresentationStepV7[];
    readonly durationScale: number;
    fired: boolean;
  } | null = null;
  /** The units the board leaves out while a cue draws them. */
  #juiceHidden: ReadonlySet<number> = new Set();
  /** Whether a playback frame has drawn the overlay already. */
  #overlayDrawn = false;
  /** Review tooling only (pinCombatJuice): cues held at a moment. */
  #pinnedCombatJuice: readonly CombatJuiceEntryV7[] | null = null;
  /** The white silhouette of each unit raster, for the death flash. */
  readonly #juiceSilhouettes = new WeakMap<object, CanvasImageSource | null>();
  /**
   * The fog lift (bead pulp_wars-2yc.83, fog-lift-v7.ts): cells the viewer
   * has just explored keep their cloud on the effects overlay and lift it
   * away in a wave. It shares the puff's frame pump: frames only while a
   * lift plays, and only the overlay repaints.
   */
  readonly #fogLift = createFogLiftClockV7();
  readonly #fogLiftEnabled = fogLiftEnabledV7();
  #fogLiftSprites: FogLiftSpritesV7 | undefined;
  #fogLiftScratch: FogLiftScratchV7 | undefined;
  /** The palette whose wisp frames are all built, and the warming timer. */
  #fogLiftWarmed: string | null = null;
  #fogLiftWarmTimer: number | null = null;
  /** Review tooling only (pinFogLift): the lift held this long after it starts. */
  #pinnedFogLiftMs: number | null = null;
  /** A let-go tile (a fog tap, an emptied tile): no cursor box while it rests. */
  #quietCursorAt: CoordV7 | null = null;
  /** Whether a pointer tap (not the keyboard) put the cursor where it is. */
  #focusedByPointer = false;
  /**
   * The victory wave (pulp_wars-556y, victory-wave-v7.ts): when the viewer
   * wins, every explored cell hops in a widening ring and takes the
   * winner's faction skin. It runs on a clock of its own
   * (#victoryClockMs) and asks for frames only while it plays.
   */
  readonly #victoryWave = createVictoryWaveV7();
  readonly #victoryWaveEnabled = victoryWaveEnabledV7();
  #victoryWaveFrame: number | null = null;
  /**
   * The wave's clock: it advances like the atmosphere's (at most
   * ATMOSPHERE_STEP_MS a drawn frame, in reduced motion too), but only
   * with frames that draw the game's own view.
   */
  #victoryClockMs = 0;
  #victoryWaveListener: (() => void) | null = null;
  /** The start of the wave whose landing the listener has heard. */
  #victoryWaveHeard: number | null = null;
  /** The reduced-motion crossfade's own canvas (see #victoryFadeLayer). */
  #victoryFadeContext: CanvasRenderingContext2D | null = null;
  /** The crossfade's own canvas (see #crossfadeLayer). */
  #crossfadeCanvas: {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
  } | null = null;
  /** Review tooling only (pinVictoryWave): the wave held at a time. */
  #pinnedVictoryWaveMs: number | null = null;
  /** The Blizzard's slow ambient redraw (a timer, not every frame). */
  #blizzardTimer: number | null = null;
  /** The unit being shattered on the board, cased in ice until it bursts. */
  #iceFolkShatter: {
    readonly unitId: number;
    readonly elapsedMs: number;
  } | null = null;
  /** The Dwarf cue playing on the effects overlay (bead pulp_wars-78i.6). */
  #dwarfFeedback: DwarfFeedbackV7 | null = null;
  /** Review tooling only (pinDwarfFeedback): cues frozen mid-animation. */
  #pinnedDwarfFeedback: readonly DwarfFeedbackV7[] = [];
  /** The Dig In earthwork rasters, built once per width. */
  readonly #dwarfArt: DwarfBoardArtV7;
  /** The Candy cue playing on the effects overlay (bead pulp_wars-jdb.6). */
  #candyFeedback: CandyFeedbackV7 | null = null;
  /** Review tooling only (pinCandyFeedback): cues frozen mid-animation. */
  #pinnedCandyFeedback: readonly CandyFeedbackV7[] = [];
  /** The faded copies of Crashed units' sprites, built once per sprite. */
  readonly #candyDroopCache: SpriteSaturationCacheV7;
  /**
   * The giants' signature cue playing on the effects overlay (bead
   * `pulp_wars-w49.32`).
   */
  #giantFeedback: GiantFeedbackV7 | null = null;
  /** Review tooling only (pinGiantFeedback): cues frozen mid-animation. */
  #pinnedGiantFeedback: readonly GiantFeedbackV7[] = [];
  /** Revision 19: this frame's unit sprite cues (growth, Egg, hatchling). */
  #unitPulses: readonly UnitPulseV7[] = [];
  /**
   * Revision 20: units of a Charge! boundary with a Push held where their
   * next slide starts (the Triceratops and the survivor on their tiles), so
   * the board never shows them at their final tile early.
   */
  #heldUnits: ReadonlyMap<number, CoordV7> = new Map();
  #impact: {
    readonly at: CoordV7;
    readonly shakeCssPx: number;
    readonly flashAlpha: number;
  } | null = null;
  #statusPulse: {
    readonly at: CoordV7;
    readonly progress: number;
    readonly statusId: string;
  } | null = null;
  #supportFeedback: SupportFeedbackV7 | null = null;
  /** Review tooling only (pinSupportFeedback): cues frozen mid-animation. */
  #pinnedSupportFeedback: readonly SupportFeedbackV7[] = [];
  #effectArtRequested = false;
  #windmillHealingFeedback: WindmillHealingFeedbackV7 | null = null;
  /** Revision 17: the explosion wave bursting on the effects overlay. */
  #explosionFeedback: ExplosionFeedbackV7 | null = null;
  /** Review tooling only (pinExplosionFeedback): bursts frozen mid-animation. */
  #pinnedExplosionFeedback: readonly ExplosionFeedbackV7[] = [];
  /** Bead pulp_wars-b5f.5: the attack cue on the effects overlay. */
  #attackFeedback: AttackFeedbackV7 | null = null;
  /** Review tooling only (pinAttackFeedback): cues frozen mid-animation. */
  #pinnedAttackFeedback: readonly AttackFeedbackV7[] = [];
  #crossfade: {
    readonly before: PlayerViewV7;
    readonly after: PlayerViewV7;
    readonly progress: number;
  } | null = null;
  #modelInstance: string | number | null = null;
  #inspectionCycle: {
    readonly at: CoordV7;
    readonly occupantUnitId: number;
    readonly next: "UNDERLYING" | "UNIT";
  } | null = null;
  #observedCommandIndex: number | null = null;
  /**
   * Revision 17: the Kaboom! preview last framed (unit, visible band and
   * viewport), so the camera frames a blast once per preview and band and a
   * player's own pan is not undone by a later redraw.
   */
  #kaboomFramedKey: string | null = null;
  #cameraPanFrame: number | null = null;
  /**
   * Bead pulp_wars-2yc.29: the feedback animations. They run on this
   * host's clock and frames and draw through `#draw`; presentations do not
   * cancel them (`finishPresentations` leaves them alone).
   */
  readonly feedback: BoardFeedbackV7;

  /**
   * `composedForests: false` draws every Forest cell as its single clump
   * (the look before bead pulp_wars-maw.3) and `composedMountains: false`
   * every Mountain cell as its single mountain (before bead pulp_wars-e9f);
   * only the art reviews use them, for their "before" captures.
   */
  constructor(
    documentRoot: Document,
    options: {
      readonly composedForests?: boolean;
      readonly composedMountains?: boolean;
      /**
       * The map's skeleton of a view, in place of the one made from the
       * match's setup: for the art reviews and the tests, whose states are
       * built by hand (terrain-at-fog-v7.ts).
       */
      readonly terrainSkeleton?: (
        view: PlayerViewV7,
      ) => TerrainSkeletonV7 | null;
    } = {},
  ) {
    this.#document = documentRoot;
    this.#terrainSkeleton =
      options.terrainSkeleton ??
      (terrainAtFogEnabledV7() ? terrainSkeletonOfViewV7 : () => null);
    this.feedback = new BoardFeedbackV7({
      now: () => this.#now(),
      draw: () => this.#draw(),
      drawSerial: () => this.#drawSerial,
      browser: () => this.#document.defaultView,
      camera: () => this.#camera,
      canvasClientRect: () => this.#canvas?.getBoundingClientRect() ?? null,
    });
    this.#glowCache = new BoardGlowCacheV7(documentRoot);
    this.#saturationCache = createSpriteSaturationCacheV7(
      browserChibiRasterEnvironmentV7(documentRoot),
    );
    this.#iceFolkArt = createIceFolkBoardArtV7(
      browserChibiRasterEnvironmentV7(documentRoot),
    );
    this.#dwarfArt = createDwarfBoardArtV7(
      browserChibiRasterEnvironmentV7(documentRoot),
    );
    this.#candyDroopCache = createSpriteSaturationCacheV7(
      browserChibiRasterEnvironmentV7(documentRoot),
    );
    this.#chibiArt = createChibiArtResolverV7({
      environment: browserChibiRasterEnvironmentV7(documentRoot),
      redraw: () => {
        this.#glowCache.clear();
        this.#draw();
      },
    });
    // Composed forests (pulp_wars-maw.3): the multi-tile Forest pieces of
    // the CHIBI art set.
    this.#forestArt =
      options.composedForests === false
        ? { resolve: () => null }
        : createChibiForestArtV7({
            environment: browserChibiRasterEnvironmentV7(documentRoot),
            redraw: () => this.#draw(),
            set: CHIBI_FOREST_ART_SET_V7,
          });
    if (factionForestsEnabledV7())
      this.#factionForestArt = createFactionForestArtV7({
        environment: browserChibiRasterEnvironmentV7(documentRoot),
        redraw: () => this.#draw(),
        base: this.#forestArt,
        sets: FACTION_FOREST_ART_SETS_V7,
      });
    // Mountains as massifs (pulp_wars-e9f, pulp_wars-2o7.1): ridges and
    // single mountains that fill their cells, tall under other Mountains.
    this.#mountainArt =
      options.composedMountains === false
        ? { resolve: () => null }
        : createChibiMassifArtV7({
            environment: browserChibiRasterEnvironmentV7(documentRoot),
            redraw: () => this.#draw(),
            set: CHIBI_MOUNTAIN_ART_SET_V7,
          });
    if (coastSandEnabledV7())
      this.#coastArt = createCoastSandArtV7(
        browserChibiRasterEnvironmentV7(documentRoot),
      );
    const waterBlend = waterBlendStyleV7();
    if (waterBlend !== "OFF")
      this.#waterBlendArt = createWaterBlendArtV7(
        waterBlend,
        browserChibiRasterEnvironmentV7(documentRoot),
      );
    const fogStyle = fogStyleV7();
    if (fogStyle !== "OFF")
      this.#fogArt = createFogArtV7(
        browserChibiRasterEnvironmentV7(documentRoot),
        fogStyle,
      );
    if (factionGrassEnabledV7())
      this.#factionGrassArt = createFactionGrassArtV7({
        environment: browserChibiRasterEnvironmentV7(documentRoot),
        redraw: () => this.#draw(),
        tiles: FACTION_GRASS_TILES_V7,
      });
  }

  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.#detach();
    this.#callbacks = callbacks;
    const canvas = this.#document.createElement("canvas");
    const effectsCanvas = this.#document.createElement("canvas");
    const description = this.#document.createElement("p");
    description.id = `ruleset7-map-cursor-${nextDescriptionIdV7++}`;
    description.className = "sr-only";
    description.setAttribute("aria-live", "polite");
    canvas.className = "board-canvas board-canvas-v7";
    canvas.tabIndex = 0;
    canvas.dataset.focusId = "board-v7";
    canvas.setAttribute("role", "application");
    canvas.setAttribute(
      "aria-label",
      "Ruleset 7 square-grid battlefield. Arrow keys move the map cursor; Enter or Space activates; drag pans; plus or minus zooms.",
    );
    canvas.setAttribute("aria-describedby", description.id);
    canvas.style.touchAction = "none";
    effectsCanvas.className = "board-effects-canvas-v7";
    effectsCanvas.setAttribute("aria-hidden", "true");
    canvas.addEventListener("pointerdown", this.#onPointerDown);
    canvas.addEventListener("pointermove", this.#onPointerMove);
    canvas.addEventListener("pointerup", this.#onPointerUp);
    canvas.addEventListener("pointercancel", this.#onPointerCancel);
    canvas.addEventListener("pointerleave", this.#onPointerLeave);
    canvas.addEventListener("wheel", this.#onWheel, { passive: false });
    canvas.addEventListener("keydown", this.#onKeyDown);
    container.replaceChildren(canvas, description, effectsCanvas);
    this.#canvas = canvas;
    this.#effectsCanvas = effectsCanvas;
    this.#description = description;
    try {
      this.#context = canvas.getContext("2d");
      this.#effectsContext = effectsCanvas.getContext("2d");
    } catch {
      this.#context = null;
      this.#effectsContext = null;
    }
    if (typeof ResizeObserver !== "undefined") {
      this.#resizeObserver = new ResizeObserver(() => this.#resize(container));
      this.#resizeObserver.observe(container);
    }
    this.#resize(container);
  }

  update(model: BoardHostModelV7): void {
    const priorSelectedUnitId = this.#model?.interaction.selectedUnitId ?? null;
    if (
      this.#modelInstance !== null &&
      this.#modelInstance !== model.matchInstanceId
    ) {
      this.finishPresentations();
      this.#clearCombatJuice();
    }
    if (this.#modelInstance !== model.matchInstanceId)
      this.#inspectionCycle = null;
    if (
      this.#observedCommandIndex !== null &&
      this.#observedCommandIndex !== model.view.commandIndex
    )
      this.#inspectionCycle = null;
    this.#observedCommandIndex = model.view.commandIndex;
    this.#modelInstance = model.matchInstanceId;
    this.#model = model;
    this.feedback.sync(model);
    // First steps: what the coach's marker points at, for review tooling
    // and tests (never a coordinate).
    const firstStep = this.feedback.firstStepMarkerFrame();
    const marked = this.#canvas;
    if (marked !== null) {
      if (firstStep === null) {
        delete marked.dataset.firstStepMarker;
        delete marked.dataset.firstStepMotion;
      } else {
        marked.dataset.firstStepMarker = firstStep.kind.toLowerCase();
        marked.dataset.firstStepMotion =
          model.firstStepMarker?.motion === "HOP" && model.motion === "FULL"
            ? "hop"
            : "still";
      }
    }
    // A mission's marks, by kind and name (never a coordinate).
    if (marked !== null) {
      const marks = model.missionMarkers ?? [];
      if (marks.length === 0) delete marked.dataset.missionMarkers;
      else
        marked.dataset.missionMarkers = marks
          .map((mark) => `${mark.kind.toLowerCase()}:${mark.label}`)
          .join("|");
    }
    const activePlayerId = model.view.turnOrder[model.view.activeSeatIndex];
    const readinessKey = `${String(model.matchInstanceId)}:${model.view.round}:${activePlayerId ?? "none"}`;
    if (readinessKey !== this.#readinessKey) {
      this.#readinessKey = readinessKey;
      this.#readinessStartedAt = this.#now();
    }
    if (
      model.interaction.selectedUnitId !== priorSelectedUnitId &&
      model.interaction.selectedUnitId !== null &&
      model.motion === "FULL" &&
      model.interactive
    )
      this.#selectionJump = {
        unitId: model.interaction.selectedUnitId,
        startedAt: this.#now(),
      };
    else if (
      model.interaction.selectedUnitId === null ||
      !model.interactive ||
      model.motion === "REDUCED"
    )
      this.#selectionJump = null;
    if (
      this.#inspectionCycle !== null &&
      !model.view.units.some(
        (unit) =>
          same(unit.at, this.#inspectionCycle?.at ?? unit.at) &&
          unit.id === this.#inspectionCycle?.occupantUnitId,
      )
    )
      this.#inspectionCycle = null;
    const key = `${String(model.matchInstanceId)}:${model.view.board.width}x${model.view.board.height}`;
    if (this.#boardKey !== key) {
      this.#boardKey = key;
      const fitted = fitChibiCamera(model.view.board, this.#viewport);
      const capital = model.view.cities.find(
        (city) => city.ownerId === model.view.viewer.id && city.isCapital,
      );
      this.#focused = capital?.at ?? model.view.cities[0]?.at ?? { x: 0, y: 0 };
      // Frame the explored area (the capital's surroundings at creation) in
      // the map region the HUD and the open or reserved dock leave visible.
      this.#camera = frameCameraOnArea(fitted, {
        area: cellWorldBounds(
          model.view.board.tiles
            .filter((tile) => tile.explored)
            .map((tile) => tile.at),
        ),
        focus: projectGrid(this.#focused),
        board: chibiBoardWorldBounds(model.view.board),
        viewport: this.#viewport,
        band: this.#unobscuredBand(true),
      });
    }
    this.#frameKaboomPreview(model);
    this.#describe();
    this.#draw();
    this.#syncAmbientFrame();
  }

  /**
   * Revision 17: while a Kaboom! is previewed (focused, hovered or armed),
   * pans the camera the least distance that shows every blast area of the
   * chain above the dock and below the HUD. The zoom never changes; reduced
   * motion jumps, full motion glides (playback-camera-v7.ts).
   */
  #frameKaboomPreview(model: BoardHostModelV7): void {
    const unitId = model.interaction.kaboomPreviewUnitId ?? null;
    // Revision 19: the nest tiles of the Egg being laid are framed the same
    // way, once per preview.
    const layEgg = model.interaction.layEgg ?? null;
    // The Martian revision: an aimed Beam Down, Mind Control or Tractor
    // Beam frames its unit and targets the same way, once per stage.
    const martianPick = model.interaction.martianPick ?? null;
    // The Ice Folk revision: an aimed Bolas or Cold Snap likewise.
    const iceFolkPick = model.interaction.iceFolkPick ?? null;
    // The Dwarf revision: an aimed Tunnel, Bomb Run or Assemble likewise,
    // once per stage.
    const dwarfPick = model.interaction.dwarfPick ?? null;
    // The Candy revision: an armed Sugar Rush, a Re-bake or a Sugar Toss
    // likewise.
    const candyPick = model.interaction.candyPick ?? null;
    // The giants' signatures (`pulp_wars-w49.32`): an aimed Swallow, Toss,
    // Stomp or Break Off likewise, once per stage.
    const giantPick = model.interaction.giantPick ?? null;
    // The naval branch interface: an aimed Board likewise, (the frozen
    // sea) an aimed Freeze, and (the Cultists) an aimed Sacrifice or Seize.
    const navalPick =
      model.interaction.navalPick ??
      model.interaction.freezePick ??
      model.interaction.cultPick ??
      null;
    const subject =
      unitId !== null
        ? String(unitId)
        : layEgg !== null
          ? `nest:${layEgg.cityId}:${layEgg.role}`
          : martianPick !== null
            ? `martian:${martianPick.kind}:${martianPick.unitId}:${martianPick.kind === "BEAM_DOWN" ? String(martianPick.passengerUnitId) : ""}`
            : iceFolkPick !== null
              ? `ice-folk:${iceFolkPick.kind}:${iceFolkPick.unitId}`
              : dwarfPick !== null
                ? `dwarf:${dwarfPick.kind}:${dwarfPick.unitId}:${dwarfPick.kind === "TUNNEL" ? (dwarfPick.to === null ? "" : `${dwarfPick.to.x},${dwarfPick.to.y}`) : dwarfPick.kind === "BOMB_RUN" ? String(dwarfPick.targetUnitId) : ""}`
                : candyPick !== null
                  ? `candy:${candyPick.kind}:${candyPick.unitId}`
                  : giantPick !== null
                    ? `giant:${giantPick.kind}:${giantPick.unitId}:${giantPick.kind === "TOSS" ? String(giantPick.passengerUnitId) : giantPick.kind === "BREAK_OFF" && giantPick.first !== null ? `${giantPick.first.x},${giantPick.first.y}` : ""}`
                    : navalPick !== null
                      ? `naval:${navalPick.kind}:${navalPick.unitId}`
                      : null;
    if (subject === null) {
      this.#kaboomFramedKey = null;
      return;
    }
    const band = this.#unobscuredBand();
    const key = `${subject}:${Math.round(band.top)}:${Math.round(band.bottom)}:${this.#viewport.width}x${this.#viewport.height}`;
    if (key === this.#kaboomFramedKey) return;
    this.#kaboomFramedKey = key;
    const framed = this.#planFor(model.view, model.offeredCommands);
    const pickUnitId =
      martianPick?.unitId ??
      iceFolkPick?.unitId ??
      dwarfPick?.unitId ??
      candyPick?.unitId ??
      giantPick?.unitId ??
      navalPick?.unitId ??
      null;
    const pickUnit =
      pickUnitId === null
        ? undefined
        : model.view.units.find((unit) => unit.id === pickUnitId);
    const area = cellWorldBounds(
      (martianPick !== null ||
        iceFolkPick !== null ||
        dwarfPick !== null ||
        candyPick !== null ||
        giantPick !== null ||
        navalPick !== null) &&
        unitId === null &&
        layEgg === null
        ? [
            ...(pickUnit === undefined ? [] : [pickUnit.at]),
            ...framed.targets.map((target) => target.at),
          ]
        : framed.entries
            .filter(
              (entry) =>
                entry.kind === "ABILITY_AREA" &&
                entry.abilityStyle === (unitId !== null ? "BLAST" : "NEST"),
            )
            .map((entry) => entry.at),
    );
    if (area === null) return;
    const delta = panToFrameArea(this.#camera, area, this.#viewport, band);
    if (delta.x === 0 && delta.y === 0) return;
    void this.#glideCameraTo(
      panCamera(this.#camera, delta),
      model.motion === "FULL",
    );
  }

  /**
   * Moves the camera to `target` at the same zoom: a spring glide
   * (playback-camera-v7.ts), or a cut when `animate` is false or no frame
   * can be asked for. The promise resolves when the camera rests there, or
   * when the glide is cancelled: a player's pan, zoom or tap leaves the
   * camera where it is; a finished presentation puts it on the target.
   */
  #glideCameraTo(
    target: CameraState,
    animate: boolean,
    durationScale = 1,
  ): Promise<void> {
    const prior = this.#cameraGlide;
    const velocity =
      prior === null
        ? undefined
        : cameraGlideAtV7(
            prior.glide,
            (prior.pausedAt ?? this.#now()) - prior.startedAt,
          ).velocity;
    this.#cancelCameraPan();
    const browser = this.#document.defaultView;
    if (
      !animate ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    ) {
      this.#camera = target;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const state = {
        glide: startCameraGlideV7({
          from: { x: this.#camera.offsetX, y: this.#camera.offsetY },
          target: { x: target.offsetX, y: target.offsetY },
          viewport: this.#viewport,
          durationScale,
          ...(velocity === undefined ? {} : { velocity }),
        }),
        target,
        startedAt: this.#now(),
        pausedAt: null as number | null,
        resolve,
      };
      this.#cameraGlide = state;
      const frame = (): void => {
        if (this.#cameraGlide !== state) return;
        const now = this.#now();
        if (this.#model?.presentationPaused) {
          state.pausedAt ??= now;
          this.#cameraPanFrame = browser.requestAnimationFrame(frame);
          return;
        }
        if (state.pausedAt !== null) {
          state.startedAt += now - state.pausedAt;
          state.pausedAt = null;
        }
        let sample: ReturnType<typeof cameraGlideAtV7>;
        try {
          sample = cameraGlideAtV7(state.glide, now - state.startedAt);
        } catch (error) {
          // Bead pulp_wars-2yc.93: a glide that cannot be sampled lands on
          // its target at once; the playback waiting for it goes on.
          reportPresentationFailureV7("a camera glide", error);
          this.#cameraPanFrame = null;
          this.#cameraGlide = null;
          this.#camera = target;
          this.#draw();
          resolve();
          return;
        }
        this.#camera = {
          ...this.#camera,
          offsetX: sample.offset.x,
          offsetY: sample.offset.y,
        };
        if (sample.settled) {
          this.#cameraPanFrame = null;
          this.#cameraGlide = null;
          this.#draw();
          resolve();
          return;
        }
        this.#draw();
        this.#cameraPanFrame = browser.requestAnimationFrame(frame);
      };
      this.#cameraPanFrame = browser.requestAnimationFrame(frame);
    });
  }

  /** Stops a glide where it is, or (`finish`) on its target. */
  #cancelCameraPan(finish = false): void {
    if (this.#cameraPanFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#cameraPanFrame);
    this.#cameraPanFrame = null;
    const state = this.#cameraGlide;
    this.#cameraGlide = null;
    if (state === null) return;
    if (finish)
      this.#camera = {
        ...this.#camera,
        offsetX: state.target.offsetX,
        offsetY: state.target.offsetY,
      };
    state.resolve();
  }

  /**
   * Player input wins (bead pulp_wars-2yc.49): a pan, zoom, tap or cursor
   * key stops a glide where it is and takes the camera from the seat whose
   * events are playing, until another seat's playback starts.
   */
  #playerTookCamera(): void {
    this.#cameraFollowAllowed = false;
    const model = this.#model;
    if (model !== null)
      this.#followSuppressedSeat = suppressedSeatAfterInputV7({
        // A boundary is playing while a presented view is held.
        presentingSeat:
          this.#presentedView === null ? null : this.#presentingFollowSeat,
        activeSeat: model.view.turnOrder[model.view.activeSeatIndex] ?? null,
        viewerSeat: model.view.viewer.id,
        suppressedSeat: this.#followSuppressedSeat,
      });
    this.#cancelCameraPan();
  }

  /**
   * The comfort-zone rule for the event on `cells`: null while the camera
   * should hold still (the event is in view, or the player has the
   * camera), else the camera that frames it with what is still to play.
   */
  #playbackTarget(
    cells: readonly CoordV7[],
    upcoming: () => readonly (readonly CoordV7[])[],
  ): CameraState | null {
    const model = this.#model;
    if (!this.#cameraFollowAllowed || model === null) return null;
    const input = {
      camera: this.#camera,
      viewport: this.#viewport,
      band: this.#unobscuredBand(),
      cells,
      board: chibiBoardWorldBounds(model.view.board),
    };
    if (playbackCameraTargetV7(input) === null) return null;
    return playbackCameraTargetV7({ ...input, upcoming: upcoming() });
  }

  activate(at: CoordV7): void {
    this.#focused = at;
    this.#focusedByPointer = false;
    const serial = this.#drawSerial;
    this.#activate(at);
    this.#describe();
    if (serial === this.#drawSerial) this.#draw();
  }

  zoom(direction: "IN" | "OUT"): void {
    this.#playerTookCamera();
    this.#camera = this.#limitCamera(
      zoomChibiCameraAt(
        this.#camera,
        adjacentChibiZoomStep(chibiZoomStepForCamera(this.#camera), direction),
        { x: this.#viewport.width / 2, y: this.#viewport.height / 2 },
      ),
    );
    this.#draw();
  }

  /**
   * Bead pulp_wars-eu3r.5: bounds a user pan or zoom so the explored map
   * plus a one-cell margin stays wholly in view where it fits, else the
   * explored cells cover half the visible map region on that axis (see
   * `cameraPanLimits`). Gentle against `prior`: never snaps a camera that
   * an AI-turn move, resize or dock left past a limit, only stops it moving
   * further out. A null `prior` clamps outright (a resize). `include` adds
   * cells to the limit area (the keyboard cursor). Programmatic framing and
   * the follow camera are not clamped.
   */
  #limitCamera(
    next: CameraState,
    prior: CameraState | null = this.#camera,
    include: readonly CoordV7[] = [],
  ): CameraState {
    const model = this.#model;
    if (model === null) return next;
    return clampCamera(
      next,
      {
        area: cameraLimitArea(
          model.view.board,
          this.#exploredCells(model.view),
          include,
        ),
        viewport: this.#viewport,
        band: this.#unobscuredBand(),
      },
      prior ?? undefined,
    );
  }

  /** The viewer's explored cells, cached per view's tile list. */
  #exploredCells(view: PlayerViewV7): readonly CoordV7[] {
    const cached = this.#exploredCache;
    if (cached?.tiles === view.board.tiles) return cached.cells;
    const cells = view.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => tile.at);
    this.#exploredCache = { tiles: view.board.tiles, cells };
    return cells;
  }

  focus(): void {
    this.#canvas?.focus();
  }

  resetInspectionCycle(): void {
    this.#inspectionCycle = null;
  }

  destroy(): void {
    // Bead pulp_wars-2yc.93: the canvas and its listeners always go, even
    // when finishing a playback or the feedback throws.
    try {
      this.finishPresentations();
      this.feedback.destroy();
    } catch (error) {
      reportPresentationFailureV7("taking down the board", error);
    }
    this.#detach();
    this.#model = null;
    this.#planCache.length = 0;
    this.#glowCache.clear();
  }

  finishPresentations(redraw = true): void {
    this.#cameraFollowAllowed = false;
    this.#presentingFollowSeat = null;
    this.#cancelCameraPan(true);
    this.#presentationToken += 1;
    if (this.#animationFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = null;
    this.#presentedView = null;
    this.#animatedUnit = null;
    this.#projectile = null;
    this.#impact = null;
    this.#statusPulse = null;
    this.#supportFeedback = null;
    this.#pinnedSupportFeedback = [];
    this.#windmillHealingFeedback = null;
    this.#explosionFeedback = null;
    this.#pinnedExplosionFeedback = [];
    this.#attackFeedback = null;
    this.#pinnedAttackFeedback = [];
    this.#dinosaurFeedback = null;
    this.#pinnedDinosaurFeedback = [];
    this.#cultFeedback = null;
    this.#pinnedCultFeedback = [];
    this.#martianFeedback = null;
    this.#pinnedMartianFeedback = [];
    this.#iceFolkFeedback = null;
    this.#pinnedIceFolkFeedback = [];
    this.#iceFolkShatter = null;
    this.#dwarfFeedback = null;
    this.#pinnedDwarfFeedback = [];
    this.#candyFeedback = null;
    this.#pinnedCandyFeedback = [];
    this.#giantFeedback = null;
    this.#pinnedGiantFeedback = [];
    this.#setBoardShake(0);
    this.#unitPulses = [];
    this.#heldUnits = new Map();
    this.#combatJuice.dropPending(this.#now());
    this.#juiceBoundary = null;
    this.#drawSupportOverlay();
    this.#crossfade = null;
    this.#selectionJump = null;
    const resolve = this.#animationResolve;
    this.#animationResolve = null;
    resolve?.();
    if (redraw) this.#draw();
    this.#pumpCombatJuice();
  }

  setPresentationStepListener(
    listener: ((cue: PresentationStepCueV7) => void) | null,
  ): void {
    this.#stepListener = listener;
  }

  async presentBoundary(
    before: PlayerViewV7,
    after: PlayerViewV7,
    envelope: PlayerEventEnvelopeV7,
    options: PresentBoundaryOptionsV7 = {},
  ): Promise<void> {
    this.finishPresentations(false);
    this.#cancelAmbientFrame();
    const token = this.#presentationToken;
    this.#inspectionCycle = null;
    const model = this.#model;
    if (model === null) return;
    const steps = corePresentationPlanV7(before, envelope, after);
    // Combat juice: the boundary's deaths and arrivals start on the frame
    // that first shows its result.
    this.#juiceBoundary = {
      before,
      after,
      envelope,
      steps,
      durationScale: playbackDurationScaleV7(
        model.animationSpeed,
        options.upcoming?.length ?? 0,
      ),
      fired: false,
    };
    if (steps.length === 0) {
      // Nothing to play (a captured city's land ripples on its own): the
      // board shows the result, held while a later boundary waits for it.
      this.#fireBoundaryJuice();
      if (options.holdResult?.() === true) this.#presentedView = after;
      else this.#draw();
      return;
    }
    // Calm playback (bead pulp_wars-2yc.49): the camera frames another
    // player's steps by the comfort-zone rule, unless the player took the
    // camera during this seat's playback.
    const seat = before.turnOrder[before.activeSeatIndex] ?? null;
    const cameraEvents = playbackCameraEventsV7(
      steps,
      seat !== before.viewer.id,
    );
    if (this.#followSuppressedSeat !== seat) this.#followSuppressedSeat = null;
    this.#cameraFollowAllowed =
      this.#pointers.size === 0 &&
      playbackFollowAllowedV7(this.#followSuppressedSeat, seat);
    this.#presentingFollowSeat = cameraEvents.length > 0 ? seat : null;
    const cameraCells = new Map(
      cameraEvents.map((event) => [steps[event.index], event.cells]),
    );
    let queuedCells: readonly (readonly CoordV7[])[] | null = null;
    /** The tiles of the events still to play after step `index`. */
    const laterCells = (index: number): readonly (readonly CoordV7[])[] => {
      queuedCells ??= (options.upcoming ?? [])
        .slice(0, PLAYBACK_LOOKAHEAD_V7)
        .flatMap((queued) => {
          const queuedSeat =
            queued.before.turnOrder[queued.before.activeSeatIndex] ?? null;
          return queuedSeat !== seat
            ? []
            : playbackCameraEventsV7(
                corePresentationPlanV7(
                  queued.before,
                  queued.events,
                  queued.after,
                ),
                queuedSeat !== queued.before.viewer.id,
              ).map((event) => event.cells);
        });
      return [
        ...cameraEvents
          .filter((event) => event.index > index)
          .map((event) => event.cells),
        ...queuedCells,
      ];
    };
    const baseDurationScale = playbackDurationScaleV7(
      model.animationSpeed,
      options.upcoming?.length ?? 0,
    );
    let durationScale = baseDurationScale;
    this.#presentedView = before;
    // Bead pulp_wars-2yc.62: a boundary queued while the board was idle was
    // drawn at once as the game's view (its result); the view before is
    // drawn now, so that result never shows for a frame before it plays.
    if (this.#drawnKey !== drawnKeyV7(model.matchInstanceId, before))
      this.#draw();
    // Bead pulp_wars-2yc.10: each step is announced once, as it starts.
    const announced = new Set<CorePresentationStepV7>();
    const announce = (step: CorePresentationStepV7): void => {
      if (announced.has(step)) return;
      announced.add(step);
      try {
        this.#stepListener?.({ step, before, after, envelope, durationScale });
      } catch {
        // A listener cannot stop or disturb the presentation.
      }
    };
    if (model.motion === "REDUCED") {
      // Reduced motion never glides: the camera cuts, and only when the
      // comfort-zone rule finds an event out of view (it frames the first
      // such event with the later ones that fit, then holds still).
      const cut = (
        step: CorePresentationStepV7,
        later: readonly (readonly CoordV7[])[] = [],
      ): void => {
        const cells = cameraCells.get(step);
        if (cells === undefined) return;
        const target = this.#playbackTarget(cells, () => later);
        if (target === null) return;
        this.#camera = target;
        this.#draw();
      };
      const firstEvent = cameraEvents[0];
      const firstStep =
        firstEvent === undefined ? undefined : steps[firstEvent.index];
      if (firstEvent !== undefined && firstStep !== undefined)
        cut(firstStep, laterCells(firstEvent.index));
      const supportSteps = steps.filter((step) => step.kind === "SUPPORT");
      const windmillSteps = steps.filter(
        (step) => step.kind === "WINDMILL_HEALING",
      );
      const explosionSteps = steps.filter((step) => step.kind === "EXPLOSION");
      const dinosaurSteps = steps.filter((step) => step.kind === "DINOSAUR");
      const martianSteps = steps.filter((step) => step.kind === "MARTIAN");
      const iceFolkSteps = steps.filter((step) => step.kind === "ICE_FOLK");
      const dwarfSteps = steps.filter((step) => step.kind === "DWARF");
      const candySteps = steps.filter((step) => step.kind === "CANDY");
      const giantSteps = steps.filter((step) => step.kind === "GIANT");
      const cultSteps = steps.filter((step) => step.kind === "CULT");
      const attackSteps = steps.filter(
        (step): step is ShotStepV7 => attackEffectOf(step) !== null,
      );
      // Bead pulp_wars-2yc.10: the steps without a still frame of their own
      // are announced now, with the result; the others as their frame shows.
      const framed = new Set<CorePresentationStepV7>([
        ...attackSteps,
        ...supportSteps,
        ...windmillSteps,
        ...explosionSteps,
        ...dinosaurSteps,
        ...martianSteps,
        ...iceFolkSteps,
        ...dwarfSteps,
        ...candySteps,
        ...giantSteps,
        ...cultSteps,
      ]);
      for (const step of steps) if (!framed.has(step)) announce(step);
      if (
        attackSteps.length > 0 ||
        supportSteps.length > 0 ||
        windmillSteps.length > 0 ||
        explosionSteps.length > 0 ||
        dinosaurSteps.length > 0 ||
        martianSteps.length > 0 ||
        iceFolkSteps.length > 0 ||
        dwarfSteps.length > 0 ||
        candySteps.length > 0 ||
        giantSteps.length > 0 ||
        cultSteps.length > 0
      ) {
        this.#presentedView = after;
        this.#draw();
        // Bead pulp_wars-b5f.5: each attack cue holds one frame, the shot
        // close to its target with its trail, before the cues it causes.
        for (const step of attackSteps) {
          const effect = attackEffectOf(step);
          if (effect === null) continue;
          cut(step);
          announce(step);
          this.#attackFeedback = this.#attackFeedbackOf(
            effect,
            step.from,
            step.to,
            attackReducedMotionProgressV7(effect, {
              ricochet: step.ricochet !== undefined,
            }),
            broadsideOf(step),
          );
          this.#drawSupportOverlay();
          await this.#animate(220 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#attackFeedback = null;
          this.#drawSupportOverlay();
        }
        // Revision 19: each Dinosaur cue holds its midpoint; growth and a
        // laid Egg show their new sprite and marker at once.
        for (const step of dinosaurSteps) {
          announce(step);
          cut(step);
          if (step.effect === "GROW" || step.effect === "EGG_LAID") continue;
          this.#dinosaurFeedback = {
            effect: step.effect,
            cells: step.cells,
            ...(step.from === undefined ? {} : { from: step.from }),
            progress: 0.5,
          };
          this.#draw();
          await this.#animate(260 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#dinosaurFeedback = null;
          this.#drawSupportOverlay();
        }
        // The Martian revision: each Martian cue holds its midpoint.
        for (const step of martianSteps) {
          announce(step);
          cut(step);
          this.#martianFeedback = martianFeedbackOf(step, 0.5);
          this.#drawSupportOverlay();
          await this.#animate(220 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#martianFeedback = null;
          this.#drawSupportOverlay();
        }
        // The Ice Folk revision: each Ice Folk cue holds a frame after its
        // midpoint (a Shatter shows its burst, the shattered unit gone).
        for (const step of iceFolkSteps) {
          announce(step);
          cut(step);
          this.#iceFolkFeedback = iceFolkFeedbackOf(
            step,
            step.effect === "SHATTER" ? 0.4 : 0.6,
          );
          this.#drawSupportOverlay();
          await this.#animate(240 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#iceFolkFeedback = null;
          this.#drawSupportOverlay();
        }
        // The Dwarf revision: each Dwarf cue holds one frame (the eruption
        // its peak) long enough to read.
        for (const step of dwarfSteps) {
          announce(step);
          cut(step);
          this.#dwarfFeedback = dwarfFeedbackOf(
            step,
            dwarfReducedMotionProgressV7(step.effect),
          );
          this.#drawSupportOverlay();
          await this.#animate(240 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#dwarfFeedback = null;
          this.#drawSupportOverlay();
        }
        // The Cultists' channel: each cue holds one still frame where it
        // reads (the strand red and parted, the collar bursting).
        for (const step of cultSteps) {
          announce(step);
          cut(step);
          this.#cultFeedback = cultFeedbackOf(
            step,
            cultReducedMotionProgressV7(step.effect),
          );
          this.#drawSupportOverlay();
          await this.#animate(240 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#cultFeedback = null;
          this.#drawSupportOverlay();
        }
        // The Candy revision: each Candy cue holds one still frame where it
        // reads (a Sugar Toss its "+n", the swirl settled).
        for (const step of candySteps) {
          announce(step);
          cut(step);
          this.#candyFeedback = candyFeedbackOf(
            step,
            candyReducedMotionProgressV7(step.effect),
          );
          this.#drawSupportOverlay();
          await this.#animate(240 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#candyFeedback = null;
          this.#drawSupportOverlay();
        }
        // The giants' signatures (`pulp_wars-w49.32`): each giant cue holds
        // one still frame where it reads (the crack ring and its numbers,
        // the Goblin at the top of its arc); the board never shakes.
        for (const step of giantSteps) {
          announce(step);
          cut(step);
          this.#giantFeedback = this.#giantFeedbackOf(
            step,
            giantReducedMotionProgressV7(step.effect),
            before,
          );
          this.#drawSupportOverlay();
          await this.#animate(240 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#giantFeedback = null;
          this.#drawSupportOverlay();
        }
        // Revision 17: each explosion wave holds its midpoint burst, in
        // wave order, long enough to read.
        for (const step of explosionSteps) {
          announce(step);
          this.#explosionFeedback = {
            wave: step.wave,
            blasts: step.blasts,
            progress: 0.5,
          };
          this.#drawSupportOverlay();
          await this.#animate(260 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#explosionFeedback = null;
          this.#drawSupportOverlay();
        }
        for (const step of supportSteps) {
          announce(step);
          // Revision 17: the still "+N" of Troll regeneration holds long
          // enough to read; a Recover's "+N" a little less.
          cut(step);
          const hold =
            step.effect === "REGENERATE" ||
            // Map curiosities: the still "+N" of a Fountain, a Wreck or a
            // bounty, and the blessing's star, hold as long.
            step.effect === "FOUNTAIN" ||
            step.effect === "BLESSING" ||
            step.effect === "SALVAGE" ||
            step.effect === "BOUNTY" ||
            // Round 2: the gate burst and the Well's splash.
            step.effect === "GATE" ||
            step.effect === "WELL"
              ? 480
              : step.effect === "RECOVER"
                ? 320
                : 100;
          await this.#animate(hold * durationScale, () => {
            this.#supportFeedback = {
              effect: step.effect,
              actor: step.actor,
              recipients: step.recipients,
              progress: 0.5,
            };
            this.#drawSupportOverlay();
          });
          if (token !== this.#presentationToken) return;
          this.#supportFeedback = null;
          this.#drawSupportOverlay();
        }
        for (const step of windmillSteps) {
          announce(step);
          for (const phase of ["SOURCES", "RECIPIENTS"] as const) {
            this.#windmillHealingFeedback = {
              phase,
              sources: step.sources,
              recipients: step.recipients,
              progress: 0.5,
            };
            this.#drawSupportOverlay();
            await this.#animate(100 * durationScale, () => undefined);
            if (token !== this.#presentationToken) return;
          }
          this.#windmillHealingFeedback = null;
          this.#drawSupportOverlay();
        }
        if (
          attackSteps.length +
            supportSteps.length +
            windmillSteps.length +
            explosionSteps.length +
            dinosaurSteps.length +
            martianSteps.length +
            iceFolkSteps.length +
            dwarfSteps.length +
            candySteps.length +
            giantSteps.length +
            cultSteps.length ===
          steps.length
        ) {
          this.#settlePresentation(after, options);
          return;
        }
      }
      this.#crossfade = { before, after, progress: 0 };
      await this.#animate(100 * durationScale, (progress) => {
        this.#crossfade = { before, after, progress };
        this.#draw();
      });
      if (token !== this.#presentationToken) return;
      this.#crossfade = null;
      this.#settlePresentation(after, options);
      return;
    }
    const pushBoundary = steps.some(
      (step) => step.kind === "MOVE" && step.pushSlide === true,
    );
    for (const [index, step] of steps.entries()) {
      // Revision 20: in a Charge! boundary with a Push, a unit with a later
      // slide waits where that slide starts.
      this.#heldUnits = pushBoundary
        ? heldUnitsAfterV7(steps, index)
        : NO_HELD_UNITS;
      durationScale = baseDurationScale;
      const cells = cameraCells.get(step);
      if (step.kind === "MOVE") {
        // Bead pulp_wars-2yc.83: the ground this walk shows lifts its fog
        // as the unit comes nearest to it.
        this.#fogLift.walk(
          {
            unitId: step.unitId,
            path: step.path,
            walkMs: step.durationMs * durationScale,
          },
          this.#now(),
        );
        this.#presentedView = after;
        const unit = before.units.find(
          (candidate) => candidate.id === step.unitId,
        );
        if (
          step.followCamera &&
          unit !== undefined &&
          !after.units.some((candidate) => candidate.id === unit.id)
        )
          this.#presentedView = { ...after, units: [...after.units, unit] };
        // The unit waits on its first tile while the camera comes to it.
        const first = step.path[0];
        if (cells !== undefined && first !== undefined)
          this.#animatedUnit = { id: step.unitId, at: first, travels: true };
      }
      if (cells !== undefined) {
        // The camera moves only for an event outside the comfort zone, and
        // the step starts once it rests (playback-camera-v7.ts).
        const target = this.#playbackTarget(cells, () => laterCells(index));
        if (target !== null) {
          await this.#glideCameraTo(target, true, durationScale);
          if (token !== this.#presentationToken) return;
        }
        if (
          !this.#cameraFollowAllowed &&
          cellsOffscreenV7(this.#camera, cells, this.#viewport)
        )
          // The player has the camera and this plays out of view: quickly.
          durationScale = Math.min(durationScale, MIN_DURATION_SCALE_V7);
        else if (
          target === null &&
          step.kind === "MOVE" &&
          step.pushSlide !== true &&
          this.#lastFollowMove !== null &&
          this.#lastFollowMove.unitId !== step.unitId
        ) {
          // A beat between two units that walk in the same view.
          const rest = settleRemainingMsV7({
            nowMs: this.#now(),
            lastEndedAtMs: this.#lastFollowMove.endedAt,
            durationScale,
          });
          if (rest > 0) {
            this.#draw();
            await this.#animate(rest, () => undefined);
            if (token !== this.#presentationToken) return;
          }
        }
      }
      announce(step);
      this.#scheduleStepJuice(steps, index, envelope, durationScale);
      if (step.kind === "MOVE") {
        await this.#animatePath(
          step.unitId,
          step.path,
          step.durationMs * durationScale,
          step.pushSlide !== true,
        );
        if (token !== this.#presentationToken) return;
        if (cells !== undefined && step.pushSlide !== true)
          this.#lastFollowMove = { unitId: step.unitId, endedAt: this.#now() };
        this.#animatedUnit = null;
        this.#presentedView = after;
      } else if (step.kind === "DINOSAUR") {
        // Hatching shows the Egg first; every other cue shows the result.
        this.#presentedView = step.effect === "HATCH" ? before : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#unitPulses = dinosaurUnitPulsesV7(
            step,
            progress,
            this.#camera.zoom,
          );
          if (
            step.effect === "HATCH" &&
            progress >= 0.45 &&
            this.#presentedView !== after
          )
            this.#presentedView = after;
          this.#dinosaurFeedback = {
            effect: step.effect,
            cells: step.cells,
            ...(step.from === undefined ? {} : { from: step.from }),
            progress,
          };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#unitPulses = [];
        this.#dinosaurFeedback = null;
        this.#presentedView = after;
        this.#drawSupportOverlay();
      } else if (step.kind === "MARTIAN") {
        // A heat ray shows the target before the hit and the result after
        // it; every other cue shows the result (the arrival, the pull's
        // start, the taken unit under its control halo, the released unit
        // back with its owner).
        const ray = step.effect === "HEAT_RAY";
        this.#presentedView = ray ? before : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          if (ray && progress >= 0.35 && this.#presentedView !== after) {
            this.#presentedView = after;
            this.#draw();
          }
          this.#martianFeedback = martianFeedbackOf(step, progress);
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#martianFeedback = null;
        this.#presentedView = after;
        this.#draw();
        this.#drawSupportOverlay();
      } else if (step.kind === "ICE_FOLK") {
        // A Shatter shows the defender cased in ice, cracking, until it
        // bursts (ICE_FOLK.md timeline); every other cue shows the result
        // (the Frozen markers appear as the frost forms).
        const shatter = step.effect === "SHATTER" && step.unitId !== undefined;
        // Ice Folk Freeze: a Stampede's dust runs over the board as it was;
        // its slides, hits and charge follow as their own steps.
        this.#presentedView =
          shatter || step.effect === "STAMPEDE" ? before : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#iceFolkFeedback = iceFolkFeedbackOf(step, progress);
          if (shatter) {
            const elapsedMs = progress * ICE_FOLK_EFFECT_DURATIONS_V7.SHATTER;
            const gone = shatterBoardCueV7(elapsedMs).gone;
            this.#iceFolkShatter = gone
              ? null
              : { unitId: step.unitId ?? -1, elapsedMs };
            if (gone) this.#presentedView = after;
            this.#draw();
          }
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#iceFolkShatter = null;
        this.#iceFolkFeedback = null;
        this.#presentedView = after;
        this.#draw();
        this.#drawSupportOverlay();
      } else if (step.kind === "DWARF") {
        // An eruption shows the mound until the Mole and its rider are back
        // (DWARF_ERUPTION_TIMELINE_V7.surface); every other cue shows the
        // result (the mound, the bombed target, the new Gunner).
        // Dwarf crowd control (`pulp_wars-w49.34`): a Whirl shows its
        // targets until the hammers land, halfway through.
        const eruption = step.effect === "ERUPTION";
        const whirl = step.effect === "WHIRL";
        this.#presentedView = eruption || whirl ? before : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#dwarfFeedback = dwarfFeedbackOf(step, progress);
          if (
            this.#presentedView !== after &&
            (eruption
              ? eruptionCueV7(progress * DWARF_EFFECT_DURATIONS_V7.ERUPTION)
                  .surfaced
              : whirl && progress >= 0.5)
          ) {
            this.#presentedView = after;
            this.#draw();
          }
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#dwarfFeedback = null;
        this.#presentedView = after;
        this.#draw();
        this.#drawSupportOverlay();
      } else if (step.kind === "CANDY") {
        // The Candy revision: every Candy cue plays over the result (the
        // new marker, the re-baked unit, the healed HP).

        this.#presentedView = after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#candyFeedback = candyFeedbackOf(step, progress);
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#candyFeedback = null;
        this.#drawSupportOverlay();
      } else if (step.kind === "CULT") {
        // The Cultists' channel: every cue plays over the result (the
        // Horror arrived, the strand drawn or gone, the daemon off the
        // board).

        this.#presentedView = after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#cultFeedback = cultFeedbackOf(step, progress);
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#cultFeedback = null;
        this.#drawSupportOverlay();
      } else if (step.kind === "GIANT") {
        // The giants' signatures (`pulp_wars-w49.32`): the cue plays on
        // its own linear timeline. The board shows the view before the
        // command until the cue's hit (a thrown Goblin is in the air, off
        // its tile; the victim shrinks; the men are not there yet), then
        // the result; the cue moves its units, and a Stomp shakes the
        // board.

        const hit = GIANT_EFFECT_HIT_V7[step.effect];
        const flying = step.effect === "TOSS" ? step.unitIds : [];
        const beforeView =
          flying.length === 0
            ? before
            : {
                ...before,
                units: before.units.filter((unit) => !flying.includes(unit.id)),
              };
        this.#presentedView = hit > 0 ? beforeView : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (eased) => {
          const progress = 1 - Math.cbrt(1 - eased);
          if (hit > 0 && progress >= hit && this.#presentedView !== after)
            this.#presentedView = after;
          this.#giantFeedback = this.#giantFeedbackOf(step, progress, before);
          this.#unitPulses = giantUnitPulsesV7(
            step,
            progress,
            this.#camera.zoom,
          );
          this.#setBoardShake(giantBoardShakeCssPxV7(step.effect, progress));
          this.#draw();
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#unitPulses = [];
        this.#setBoardShake(0);
        this.#giantFeedback = null;
        this.#presentedView = after;
        this.#draw();
        this.#drawSupportOverlay();
      } else if (step.kind === "BUILD") {
        this.#crossfade = { before, after, progress: 0 };
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#crossfade = { before, after, progress };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#crossfade = null;
        this.#presentedView = after;
      } else if (
        step.kind === "MELEE" ||
        step.kind === "RANGED" ||
        step.kind === "CATAPULT"
      ) {
        this.#presentedView = before;
        const effect = attackEffectOf(step);
        if (effect !== null) {
          // Bead pulp_wars-b5f.5: the shot is its own cue on the effects
          // overlay; the board shows the result (and shakes) when it lands.
          await this.#animateAttack(
            effect,
            step.from,
            step.to,
            after,
            step.holdTarget === true,
            durationScale,
            broadsideOf(step),
          );
          if (token !== this.#presentationToken) return;
          continue;
        }
        if (step.kind === "MELEE")
          await this.#animateLunge(
            step.unitId,
            step.from,
            step.to,
            230 * durationScale,
          );
        else
          await this.#animateProjectile(
            step.kind === "CATAPULT",
            step.from,
            step.to,
            280 * durationScale,
            step.projectile === "BOMB",
            step.projectile === "ACID",
          );
        if (token !== this.#presentationToken) return;
        // The Ice Folk revision: a shattered target stays for its Shatter.
        if (step.holdTarget === true) continue;
        this.#presentedView = after;
        await this.#animateImpact(step.to, 100 * durationScale);
        if (token !== this.#presentationToken) return;
      } else if (step.kind === "VISIBILITY_CROSSFADE") {
        this.#crossfade = { before, after, progress: 0 };
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#crossfade = { before, after, progress };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#crossfade = null;
        this.#presentedView = after;
      } else if (step.kind === "DISBAND") {
        // Tuning 7: the disbanded unit fades out where it stood.

        this.#crossfade = { before, after, progress: 0 };
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#crossfade = { before, after, progress };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#crossfade = null;
        this.#presentedView = after;
      } else if (step.kind === "TACTICAL_STATUS") {
        this.#presentedView = after;
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#statusPulse = {
            at: step.at,
            statusId: step.symbolId,
            progress,
          };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#statusPulse = null;
      } else if (step.kind === "SUPPORT") {
        // The Vampire and Banshee rework (`pulp_wars-iqhp`): the bats swirl
        // round the Vampire where it still stands, before its Escape Move.
        this.#presentedView = step.effect === "BAT_SWIRL" ? before : after;

        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#supportFeedback = {
            effect: step.effect,
            actor: step.actor,
            recipients: step.recipients,
            progress,
          };
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#supportFeedback = null;
        this.#drawSupportOverlay();
      } else if (step.kind === "WINDMILL_HEALING") {
        this.#presentedView = after;
        this.#draw();
        for (const phase of ["SOURCES", "RECIPIENTS"] as const) {
          const duration =
            phase === "SOURCES"
              ? step.sourceDurationMs
              : step.recipientDurationMs;
          await this.#animate(duration * durationScale, (progress) => {
            this.#windmillHealingFeedback = {
              phase,
              sources: step.sources,
              recipients: step.recipients,
              progress,
            };
            this.#drawSupportOverlay();
          });
          if (token !== this.#presentationToken) return;
        }
        this.#windmillHealingFeedback = null;
        this.#drawSupportOverlay();
      } else if (step.kind === "DAMAGE") {
        this.#presentedView = after;
        await this.#animateImpact(step.at, step.durationMs * durationScale);
        if (token !== this.#presentationToken) return;
      } else if (step.kind === "EXPLOSION") {
        // Revision 17: the blast bursts over the units it hits, then the
        // board shows the result under the fading smoke.

        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          if (progress >= 0.45 && this.#presentedView !== after) {
            this.#presentedView = after;
            this.#draw();
          }
          this.#explosionFeedback = {
            wave: step.wave,
            blasts: step.blasts,
            progress,
          };
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#explosionFeedback = null;
        this.#presentedView = after;
        this.#drawSupportOverlay();
        // A short beat between chain waves.
        await this.#animate(90 * durationScale, () => undefined);
        if (token !== this.#presentationToken) return;
      }
      if (token !== this.#presentationToken) return;
    }
    this.#settlePresentation(after, options);
  }

  /**
   * A boundary has played: the board shows the game's view again, or
   * (bead pulp_wars-2yc.62) keeps the boundary's result while the next
   * boundary waits, so the game's latest view (ahead of the playback)
   * never shows for a frame between two boundaries.
   */
  #settlePresentation(
    after: PlayerViewV7,
    options: PresentBoundaryOptionsV7,
  ): void {
    this.#animatedUnit = null;
    this.#heldUnits = NO_HELD_UNITS;
    this.#presentedView = options.holdResult?.() === true ? after : null;
    this.#fireBoundaryJuice();
    this.#draw();
    this.#pumpCombatJuice();
  }

  #resize(container: HTMLElement): void {
    const priorViewport = this.#viewport;
    const priorCenter =
      this.#model === null
        ? null
        : screenToWorld(
            {
              x: priorViewport.width / 2,
              y: priorViewport.height * 0.55,
            },
            this.#camera,
          );
    const rect = container.getBoundingClientRect();
    const nextViewport = {
      width: Math.max(320, rect.width || 1024),
      height: Math.max(320, rect.height || 640),
    };
    const dpr = this.#document.defaultView?.devicePixelRatio ?? 1;
    const canvas = this.#canvas;
    const effectsCanvas = this.#effectsCanvas;
    if (
      canvas !== null &&
      nextViewport.width === priorViewport.width &&
      nextViewport.height === priorViewport.height &&
      canvas.width === Math.round(nextViewport.width * dpr) &&
      canvas.height === Math.round(nextViewport.height * dpr)
    )
      return;
    this.#viewport = nextViewport;
    if (canvas !== null) {
      canvas.width = Math.round(this.#viewport.width * dpr);
      canvas.height = Math.round(this.#viewport.height * dpr);
      canvas.style.width = `${this.#viewport.width}px`;
      canvas.style.height = `${this.#viewport.height}px`;
    }
    if (effectsCanvas !== null) {
      effectsCanvas.width = Math.round(this.#viewport.width * dpr);
      effectsCanvas.height = Math.round(this.#viewport.height * dpr);
      effectsCanvas.style.width = `${this.#viewport.width}px`;
      effectsCanvas.style.height = `${this.#viewport.height}px`;
    }
    if (priorCenter !== null)
      this.#camera = this.#limitCamera(
        centerCameraOn(this.#camera, priorCenter, this.#viewport),
        null,
      );
    this.#glowCache.clear();
    this.#draw();
  }

  #planFor(
    view: PlayerViewV7,
    offered: BoardHostModelV7["offeredCommands"],
  ): BoardRenderPlanV7 {
    // Bead pulp_wars-2yc.62: no commands are no commands, whichever empty
    // list carries them (each game snapshot brings its own), so a view's
    // plan is not built again for every snapshot of an AI turn.
    const commands = offered.length === 0 ? NO_COMMANDS : offered;
    const model = this.#model;
    if (model === null) throw new Error("Board plan requires a mounted model");
    const quiet = this.#quietCursorAt;
    const interaction = {
      ...model.interaction,
      cursor:
        model.showCursor === false ||
        // Bead pulp_wars-2yc.82: a let-go tile (fog, emptied) draws no box.
        (quiet !== null && this.#focused !== null && same(quiet, this.#focused))
          ? null
          : this.#focused,
    };
    const interactionKey = JSON.stringify(interaction);
    const cached = this.#planCache.find(
      (item) =>
        item.view === view &&
        item.commands === commands &&
        item.interactionKey === interactionKey,
    );
    if (cached !== undefined) return cached.plan;
    // The Rift's pieces read the map's skeleton too (pulp_wars-2yc.37), in
    // every art set: the plan asks for it only when the view has a Rift.
    const built = buildBoardRenderPlanV7(view, commands, interaction, {
      terrainSkeleton: this.#terrainSkeleton,
    });
    // Multi-cell terrain at the fog (pulp_wars-2yc.28): the forests and
    // massifs are packed over the explored cells and the ghosts.
    const ghosts = terrainGhostsOfV7(view, this.#terrainSkeleton(view));
    const plan = ghosts.length === 0 ? built : { ...built, ghosts };
    if (this.#planCache.length === PLAN_CACHE_SIZE_V7) this.#planCache.shift();
    this.#planCache.push({ view, commands, interactionKey, plan });
    return plan;
  }

  /**
   * The direction's wrapped art resolver, rebuilt only when the direction or
   * its art registry changes (never per frame).
   */
  #directionRuntime(
    spec: BoardVisualDirectionV7,
    registry: ChibiArtRegistryV7 | undefined,
  ): BoardDirectionRuntimeV7 {
    const key = JSON.stringify(spec);
    const cached = this.#direction;
    if (cached?.key === key && cached.registry === registry)
      return cached.runtime;
    const environment = browserChibiRasterEnvironmentV7(this.#document);
    const runtime: BoardDirectionRuntimeV7 = {
      spec,
      art: createDirectedChibiArtV7({
        base: this.#chibiArt,
        direction: spec,
        environment,
        ...(registry === undefined
          ? {}
          : {
              samples: createChibiArtResolverV7({
                environment,
                registry,
                redraw: () => {
                  this.#glowCache.clear();
                  this.#draw();
                },
              }),
            }),
      }),
    };
    this.#direction = { key, registry, runtime };
    this.#glowCache.clear();
    return runtime;
  }

  /**
   * Public diagnostics for the exact cell size and zoom step. The art set
   * is always CHIBI (Ruleset 7 has one); review scripts still read it.
   */
  #syncArtSetDataset(): void {
    const canvas = this.#canvas;
    if (canvas === null) return;
    const tile = String(chibiTileCssPx(this.#camera));
    const step = String(chibiZoomStepForCamera(this.#camera));
    if (canvas.dataset.artSet !== "CHIBI") canvas.dataset.artSet = "CHIBI";
    if (canvas.dataset.tileCssPx !== tile) canvas.dataset.tileCssPx = tile;
    if (canvas.dataset.zoomStep !== step) canvas.dataset.zoomStep = step;
  }

  /**
   * Bead pulp_wars-2yc.93: a frame that throws is logged and skipped; the
   * board, its input and the playback that asked for it go on.
   */
  #draw(): void {
    try {
      this.#drawFrame();
    } catch (error) {
      reportPresentationFailureV7("the board's frame", error);
    }
  }

  #drawFrame(): void {
    const model = this.#model;
    this.#syncArtSetDataset();
    this.#requestEffectArt();
    const context = this.#context;
    if (model === null || context === null) return;
    this.#drawSerial += 1;
    const now = this.#now();
    // Combat juice: the frame that first shows a boundary's result starts
    // its poofs and pops; a unit a cue draws is left out of the board.
    const juiceBoundary = this.#juiceBoundary;
    if (
      juiceBoundary !== null &&
      !juiceBoundary.fired &&
      (this.#crossfade?.after ?? this.#presentedView) === juiceBoundary.after
    )
      this.#fireBoundaryJuice();
    this.#juiceHidden = this.#juiceHiddenAt(now);
    const step =
      this.#atmosphereDrawnAt === null
        ? 0
        : Math.min(
            ATMOSPHERE_STEP_MS,
            Math.max(0, now - this.#atmosphereDrawnAt),
          );
    if (model.motion !== "REDUCED") this.#atmosphereClockMs += step;
    // The victory wave's clock runs only while the game's own view is
    // drawn: a presentation that plays first never eats into the wave.
    const gameViewShown =
      this.#presentedView === null && this.#crossfade === null;
    if (gameViewShown) this.#victoryClockMs += step;
    this.#atmosphereDrawnAt = now;
    const jump = this.#selectionJump;
    // Preview labels stay clear of the HUD and the open dock (the band the
    // start-camera framing uses); measured only when a preview is offered.
    const labelSafeArea =
      this.#presentedView === null && model.offeredCommands.length > 0
        ? this.#unobscuredBand()
        : null;
    // The victory wave: the view the game is at (never a presentation's)
    // starts it once the viewer has won.
    if (this.#victoryWaveEnabled && gameViewShown)
      this.#victoryWave.observe(
        model.view,
        model.matchInstanceId,
        this.#victoryClockMs,
        this.#victoryWaveMode(model),
      );
    const victoryNow = this.#victoryWaveNow(model);
    const renderView = (
      view: PlayerViewV7,
      clear: boolean,
      sceneAlpha: number,
      target: CanvasRenderingContext2D = context,
    ): void => {
      // The territory ripple: a view newer than the last one drawn starts
      // it; the cells still to change keep their old look in the plan.
      const rippleNow = this.#terrainRippleNow();
      this.#terrainRipple.observe(
        view,
        model.matchInstanceId,
        rippleNow,
        this.#terrainRippleEnabled &&
          model.motion !== "REDUCED" &&
          typeof this.#document.defaultView?.requestAnimationFrame ===
            "function",
        (prior) => this.#planFor(prior, NO_COMMANDS).entries,
      );
      const rippled = this.#terrainRipple.plan(
        this.#planFor(
          view,
          this.#presentedView === null ? model.offeredCommands : NO_COMMANDS,
        ),
        view,
        this.#terrainRippleNow(),
      );
      // The victory wave: the cells it has passed wear the winner's skin;
      // with reduced motion the skin crossfades in over the old look.
      const plan = this.#victoryWave.plan(rippled, view, victoryNow);
      const fade =
        plan === rippled ? null : this.#victoryWave.fade(view, victoryNow);
      const tileHops = [
        ...this.#terrainRipple.hops(this.#terrainRippleNow()),
        ...this.#victoryWave.hops(view, victoryNow),
      ];
      const victoryWave = this.#victoryWave.frame(view, victoryNow);
      const animated = this.#animatedUnit;
      const held = this.#heldUnits;
      const hidden = this.#juiceHidden;
      // Bead pulp_wars-2yc.84: a selected unit's box goes where the unit is
      // drawn: with it while it travels (a forced advance after a kill, a
      // Move), on its tile while it lunges or waits, so it never arrives on
      // the far tile before the unit does.
      const selection = model.interaction.selection;
      const selectedUnitId =
        selection?.kind === "UNIT" ? selection.unitId : null;
      const selectedAt =
        selectedUnitId === null
          ? undefined
          : animated?.id === selectedUnitId
            ? animated.travels === true
              ? animated.at
              : { x: Math.round(animated.at.x), y: Math.round(animated.at.y) }
            : held.get(selectedUnitId);
      const present = (shown: typeof plan): typeof plan =>
        animated === null && held.size === 0 && hidden.size === 0
          ? shown
          : {
              ...shown,
              entries: (hidden.size === 0
                ? shown.entries
                : shown.entries.filter(
                    (entry) =>
                      entry.kind !== "UNIT" ||
                      !hidden.has(Number(entry.key.slice(5))),
                  )
              ).map((entry) => {
                if (entry.kind === "SELECTION")
                  return selectedAt === undefined
                    ? entry
                    : { ...entry, at: selectedAt };
                if (entry.kind !== "UNIT") return entry;
                if (animated !== null && entry.key === `unit:${animated.id}`)
                  return { ...entry, at: animated.at };
                const hold = held.get(Number(entry.key.slice(5)));
                return hold === undefined ? entry : { ...entry, at: hold };
              }),
            };
      const layer = fade === null ? null : this.#victoryFadeLayer();
      if (fade !== null && layer !== null) {
        // The crossfade: the skinned board is drawn whole, apart, and laid
        // over the old one, so a unit or a city never shows through it.
        drawLayer(
          target,
          view,
          present(rippled),
          clear,
          sceneAlpha,
          tileHops,
          null,
        );
        drawLayer(layer, view, present(plan), true, 1, tileHops, null);
        target.save();
        target.setTransform(1, 0, 0, 1, 0, 0);
        target.globalAlpha = sceneAlpha * fade;
        target.drawImage(layer.canvas, 0, 0);
        target.restore();
        // A Human win's look does not change: a gold tint shows the fade.
        if (this.#victoryWave.faction === "ORIGINAL")
          drawVictoryFadeTintV7(
            target,
            {
              camera: this.#camera,
              devicePixelRatio:
                this.#document.defaultView?.devicePixelRatio ?? 1,
              sceneAlpha,
            },
            view.board,
            fade,
          );
      } else
        drawLayer(
          target,
          view,
          present(plan),
          clear,
          sceneAlpha,
          tileHops,
          victoryWave,
        );
    };
    const drawLayer = (
      target: CanvasRenderingContext2D,
      view: PlayerViewV7,
      presented: BoardRenderPlanV7,
      clear: boolean,
      sceneAlpha: number,
      tileHops: NonNullable<Parameters<typeof drawBoardV7>[0]["tileHops"]>,
      victoryWave: VictoryWaveFrameV7 | null,
    ): void => {
      drawBoardV7({
        context: target,
        viewport: this.#viewport,
        devicePixelRatio: this.#document.defaultView?.devicePixelRatio ?? 1,
        camera: this.#camera,
        plan: presented,
        glowCache: this.#glowCache,
        readinessElapsedMs: now - this.#readinessStartedAt,
        reducedMotion: model.motion === "REDUCED",
        highContrast: model.highContrast,
        clear,
        sceneAlpha,
        impact: this.#impact,
        statusPulse: this.#statusPulse,
        ...(this.#unitPulses.length === 0
          ? {}
          : { unitPulses: this.#unitPulses }),
        chibiArt: this.#chibiArt,
        // The saturation cache also holds the faded buildings
        // (pulp_wars-2yc.61), drawn in the live look only.
        saturation: {
          levels: model.saturation ?? DEFAULT_BOARD_SATURATION_V7,
          cache: this.#saturationCache,
        },
        ...(model.visualDirection === undefined
          ? {}
          : { buildingFade: this.#buildingFade }),
        ...(model.visualDirection === undefined
          ? {}
          : {
              direction: this.#directionRuntime(
                model.visualDirection,
                model.visualDirectionArt,
              ),
            }),
        previewFocus: this.#hovered ?? this.#focused,
        labelSafeArea,
        // The Ice Folk revision: Snow, the Blizzard's clock (frozen at 0 for
        // reduced motion), and a Shatter in progress.
        iceFolkArt: this.#iceFolkArt,
        blizzardTimeMs: model.motion === "REDUCED" ? 0 : now,
        iceFolkShatter: this.#iceFolkShatter,
        // The Dwarf revision: the Dig In earthwork rasters.
        dwarfArt: this.#dwarfArt,
        forestArt: this.#factionForestArt ?? this.#forestArt,
        mountainArt: this.#mountainArt,
        ...(this.#coastArt === undefined ? {} : { coastArt: this.#coastArt }),
        settlementShadow: this.#settlementShadow,
        ...(this.#settlementShadowPlain ? { settlementShadowPlain: true } : {}),
        ...(this.#waterBlendArt === undefined
          ? {}
          : { waterBlendArt: this.#waterBlendArt }),
        ...(this.#fogArt === undefined ? {} : { fogArt: this.#fogArt }),
        starfield: this.#starfield,
        atmosphereTimeMs:
          model.motion === "REDUCED" ? 0 : this.#atmosphereClockMs,
        tileHops,
        victoryWave,
        ...(this.#factionGrassArt === undefined
          ? {}
          : { factionGrassArt: this.#factionGrassArt }),
        // The Candy revision: a Crashed unit's faded sprite.
        candyDroop: (image) =>
          this.#candyDroopCache.resolve(image, CRASHED_SPRITE_SATURATION_V7),
        // The Mind Control revision: the control halo's pulse (static for
        // reduced motion).
        controlPulseTimeMs: model.motion === "REDUCED" ? 0 : now,
        // Bead pulp_wars-2yc.81: the aimed attack's HP chunks pulse (steady
        // for reduced motion).
        hpLossPulseTimeMs: model.motion === "REDUCED" ? 0 : now,
        feedback: this.feedback.boardFrame(view),
        selectionJump:
          jump === null
            ? null
            : {
                unitId: jump.unitId,
                elapsedMs: now - jump.startedAt,
                speed: model.animationSpeed,
              },
      });
    };
    const shownView =
      this.#crossfade?.after ?? this.#presentedView ?? model.view;
    this.#drawnKey = drawnKeyV7(model.matchInstanceId, shownView);
    // Bead pulp_wars-2yc.83: cells this view has explored and the last one
    // drawn had not keep their cloud on the overlay (drawn with this board,
    // below) and lift it away.
    if (
      this.#fogLiftEnabled &&
      this.#fogLift.observe(
        shownView,
        model.matchInstanceId,
        this.#now(),
        this.#fogLiftTiming(),
      ) > 0
    )
      this.#pumpFogPuff();
    if (this.#fogLiftEnabled && model.motion !== "REDUCED")
      this.#warmFogLift(shownView);
    if (this.#crossfade !== null) {
      // Bead pulp_wars-2yc.62: the view before is drawn whole and the view
      // after, drawn whole apart, is laid over it, so only what changes
      // fades. Two half-faded boards over the background dimmed the whole
      // map at the middle of every crossfade, a flicker of the board.
      const { before, after, progress } = this.#crossfade;
      renderView(before, true, 1);
      // A context that cannot lay one canvas over another (a stand-in with
      // no drawImage) draws the view after over the view before instead.
      const layer = canCompositeV7(context) ? this.#crossfadeLayer() : null;
      if (layer === null) renderView(after, false, progress);
      else {
        renderView(after, true, 1, layer.context);
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = progress;
        context.drawImage(layer.canvas, 0, 0);
        context.restore();
      }
    } else renderView(this.#presentedView ?? model.view, true, 1);
    // Tile actions (bead pulp_wars-2yc.60): the selected unit's action
    // badges, over its marks, on the game's own view only.
    if (
      this.#presentedView === null &&
      this.#crossfade === null &&
      model.tileActions !== undefined &&
      model.tileActions !== null
    ) {
      const ratio = this.#document.defaultView?.devicePixelRatio ?? 1;
      // A badge's registered icon (the Cult's join icon, bead
      // pulp_wars-mch9.43), from the look's own art.
      const art =
        model.visualDirection === undefined
          ? this.#chibiArt
          : this.#directionRuntime(
              model.visualDirection,
              model.visualDirectionArt,
            ).art;
      context.save();
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawTileActionBadgesV7(context, model.tileActions, this.#camera, {
        highContrast: model.highContrast,
        raster: (subject) => {
          const resolved = art.resolve({
            subject,
            at: { x: 0, y: 0 },
            deviceScale: ratio,
          });
          return resolved.kind === "READY" ? resolved.image : null;
        },
      });
      context.restore();
    }
    this.#pumpTerrainRipple();
    this.#pumpVictoryWave(victoryNow);
    if (this.#projectile !== null) {
      const from = worldToScreen(
        projectGrid(this.#projectile.from),
        this.#camera,
      );
      const to = worldToScreen(projectGrid(this.#projectile.to), this.#camera);
      const progress = this.#projectile.progress;
      const x = from.x + (to.x - from.x) * progress;
      const linearY = from.y + (to.y - from.y) * progress;
      const y = this.#projectile.catapult
        ? linearY - Math.sin(Math.PI * progress) * 72 * this.#camera.zoom
        : linearY;
      context.save();
      context.strokeStyle = "#19282a";
      context.lineWidth = 2 * this.#camera.zoom;
      if (this.#projectile.bomb === true)
        drawBombProjectileV7(context, x, y, this.#camera.zoom, progress);
      else if (this.#projectile.acid === true) {
        // Revision 19: a pale cream blob with a charcoal outline (never
        // green), and a small trailing drop.
        context.fillStyle = DINOSAUR_CUE_COLORS_V7.cream;
        context.strokeStyle = DINOSAUR_CUE_COLORS_V7.charcoal;
        context.lineWidth = Math.max(1, 2 * this.#camera.zoom);
        for (const [dx, dy, radius] of [
          [0, 0, 8],
          [-9, 6, 3.5],
        ] as const) {
          context.beginPath();
          context.arc(
            x + dx * this.#camera.zoom,
            y + dy * this.#camera.zoom,
            radius * this.#camera.zoom,
            0,
            Math.PI * 2,
          );
          context.fill();
          context.stroke();
        }
      } else if (this.#projectile.catapult) {
        context.fillStyle = "#6d665e";
        context.beginPath();
        context.arc(x, y, 7 * this.#camera.zoom, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      } else {
        const geometry = arrowGeometry(
          archerProjectileEndpoints(from, to, this.#camera.zoom),
          progress,
          this.#camera.zoom,
        );
        context.strokeStyle = "#19282a";
        context.lineWidth = geometry.outlineWidth + 2;
        context.beginPath();
        context.moveTo(geometry.tail.x, geometry.tail.y);
        context.lineTo(geometry.shaftEnd.x, geometry.shaftEnd.y);
        context.stroke();
        context.strokeStyle = "#f4d291";
        context.lineWidth = geometry.outlineWidth;
        context.beginPath();
        context.moveTo(geometry.tail.x, geometry.tail.y);
        context.lineTo(geometry.shaftEnd.x, geometry.shaftEnd.y);
        context.stroke();
        context.fillStyle = "#e9edf0";
        context.strokeStyle = "#19282a";
        context.lineWidth = Math.max(1, geometry.outlineWidth * 0.6);
        context.beginPath();
        context.moveTo(geometry.tip.x, geometry.tip.y);
        context.lineTo(geometry.headLeft.x, geometry.headLeft.y);
        context.lineTo(geometry.headRight.x, geometry.headRight.y);
        context.closePath();
        context.fill();
        context.stroke();
      }
      context.restore();
    }
    // Bead pulp_wars-2yc.29: population icons on their way, the sparkles
    // of a Promotion and the ring of a level-up, over the board.
    this.feedback.drawAbove(context, this.#camera, (kind) =>
      this.#feedbackIcon(kind),
    );
    this.#drawSupportOverlay();
  }

  /** The game's own population and Promote icons, or null while loading. */
  #feedbackIcon(kind: "POPULATION" | "PROMOTE"): CanvasImageSource | null {
    const model = this.#model;
    const art =
      model?.visualDirection === undefined
        ? this.#chibiArt
        : this.#directionRuntime(
            model.visualDirection,
            model.visualDirectionArt,
          ).art;
    const resolved = art.resolve({
      subject:
        kind === "POPULATION" ? "ICON:HUD:POPULATION" : "ICON:ACTION:PROMOTE",
      at: { x: 0, y: 0 },
      deviceScale:
        chibiMasterScale(this.#camera) *
        (this.#document.defaultView?.devicePixelRatio ?? 1),
    });
    return resolved.kind === "READY" ? resolved.image : null;
  }

  /**
   * Effect rasters for the support cues (bead pulp_wars-vkq.14). Asking
   * for every subject once starts their loads, so the first Undead cue of a
   * game usually finds its sprite ready; a sprite still loading draws the
   * code cue for that frame.
   */
  #supportEffectArt(): SupportEffectArtV7 {
    const devicePixelRatio = this.#document.defaultView?.devicePixelRatio ?? 1;
    const deviceScale = chibiMasterScale(this.#camera) * devicePixelRatio;
    // The default look draws the direction's own effect sprites (the Undead
    // violet set, bead pulp_wars-3tq.12) and tints the code-drawn glows to
    // match; the classic look keeps the pale blue set.
    const model = this.#model;
    const directed = model?.visualDirection?.undeadAccent === "VIOLET";
    const art =
      model?.visualDirection === undefined
        ? this.#chibiArt
        : this.#directionRuntime(
            model.visualDirection,
            model.visualDirectionArt,
          ).art;
    return {
      devicePixelRatio,
      ...(directed ? { glow: UNDEAD_VIOLET_GLOW_V7 } : {}),
      image: (subject) => {
        const resolved = art.resolve({
          subject,
          at: { x: 0, y: 0 },
          deviceScale,
        });
        return resolved.kind === "READY"
          ? {
              image: resolved.image,
              width: resolved.asset.width,
              height: resolved.asset.height,
            }
          : null;
      },
    };
  }

  /** Starts loading the effect rasters once, before the first cue. */
  #requestEffectArt(): void {
    if (this.#effectArtRequested) return;
    this.#effectArtRequested = true;
    const art = this.#supportEffectArt();
    for (const subject of SUPPORT_EFFECT_SUBJECTS_V7) art?.image(subject);
    // Map curiosities: only a match that may have them loads their cues.
    if (this.#model?.view.setup.curiosities === true)
      for (const subject of CURIOSITY_EFFECT_SUBJECTS_V7) art?.image(subject);
    for (const subject of MARTIAN_EFFECT_SUBJECTS_V7) art?.image(subject);
    for (const subject of ICE_FOLK_EFFECT_SUBJECTS_V7) art?.image(subject);
    for (const subject of DWARF_EFFECT_SUBJECTS_V7) art?.image(subject);
    // The Candy revision: only a match with a Candy seat loads its cues.
    if (this.#model !== null && matchHasCandySeatV7(this.#model.view))
      for (const subject of CANDY_EFFECT_SUBJECTS_V7) art?.image(subject);
    // The Cultists' channel: only a match with a Cult seat loads its cues.
    if (this.#model !== null && favourEntriesV7(this.#model.view).length > 0)
      for (const subject of CULT_EFFECT_SUBJECTS_V7) art?.image(subject);
  }

  /**
   * Review tooling and tests: draws the given support cues at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinSupportFeedback(feedback: readonly SupportFeedbackV7[]): void {
    this.#pinnedSupportFeedback = feedback;
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given explosion waves at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinExplosionFeedback(feedback: readonly ExplosionFeedbackV7[]): void {
    this.#pinnedExplosionFeedback = feedback;
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given revision-19 Dinosaur cues at
   * their fixed progress on the effects canvas until cleared with an empty
   * list. The game never calls it; presentations clear it.
   */
  pinDinosaurFeedback(feedback: readonly DinosaurFeedbackV7[]): void {
    this.#pinnedDinosaurFeedback = feedback;
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: the centre of a cell in CSS px from the
   * canvas's top-left corner, under the current camera (review scripts crop
   * and enlarge a piece of the board around it). The game never calls it.
   */
  cellCentreCssPx(at: CoordV7): { readonly x: number; readonly y: number } {
    return worldToScreen(projectGrid(at), this.#camera);
  }

  /**
   * Review tooling and tests: draws the given Martian cues at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinMartianFeedback(feedback: readonly MartianFeedbackV7[]): void {
    this.#pinnedMartianFeedback = feedback;
    this.#requestEffectArt();
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given Ice Folk cues at their fixed
   * progress on the effects canvas until cleared with an empty list; a
   * pinned Shatter before its burst also cases its unit (`unitId`) in ice on
   * the board. The game never calls it; presentations clear it.
   */
  pinIceFolkFeedback(feedback: readonly IceFolkFeedbackV7[]): void {
    this.#pinnedIceFolkFeedback = feedback;
    const shatter = feedback.find(
      (entry) => entry.effect === "SHATTER" && entry.unitId !== undefined,
    );
    const elapsedMs =
      (shatter?.progress ?? 0) * ICE_FOLK_EFFECT_DURATIONS_V7.SHATTER;
    const gone = shatter !== undefined && shatterBoardCueV7(elapsedMs).gone;
    this.#iceFolkShatter =
      shatter === undefined || gone
        ? null
        : { unitId: shatter.unitId ?? -1, elapsedMs };
    // After the burst the shattered unit is gone from the board, as in the
    // game, where the board then shows the view after the attack.
    const model = this.#model;
    this.#presentedView =
      gone && model !== null
        ? {
            ...model.view,
            units: model.view.units.filter(
              (unit) => unit.id !== shatter?.unitId,
            ),
          }
        : null;
    this.#requestEffectArt();
    this.#draw();
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given cues of the Cult's channel at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinCultFeedback(feedback: readonly CultFeedbackV7[]): void {
    this.#pinnedCultFeedback = feedback;
    const art = this.#supportEffectArt();
    for (const subject of CULT_EFFECT_SUBJECTS_V7) art?.image(subject);
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given Candy cues at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinCandyFeedback(feedback: readonly CandyFeedbackV7[]): void {
    this.#pinnedCandyFeedback = feedback;
    this.#requestEffectArt();
    // A match that started without a Candy seat loaded no Candy cue.
    const art = this.#supportEffectArt();
    for (const subject of CANDY_EFFECT_SUBJECTS_V7) art?.image(subject);
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given Dwarf cues at their fixed
   * progress on the effects canvas until cleared with an empty list. A
   * pinned eruption before its surfacing frame shows the view with the
   * mound (`before`), after it the view the host shows. The game never
   * calls it; presentations clear it.
   */
  pinDwarfFeedback(
    feedback: readonly DwarfFeedbackV7[],
    before: PlayerViewV7 | null = null,
  ): void {
    this.#pinnedDwarfFeedback = feedback;
    const eruption = feedback.find((entry) => entry.effect === "ERUPTION");
    this.#presentedView =
      eruption !== undefined &&
      before !== null &&
      !eruptionCueV7(eruption.progress * DWARF_EFFECT_DURATIONS_V7.ERUPTION)
        .surfaced
        ? before
        : null;
    this.#requestEffectArt();
    this.#draw();
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests (bead `pulp_wars-w49.32`): draws the given
   * giant cues at their fixed progress on the effects canvas until cleared
   * with an empty list, with their units moved as the cue moves them and
   * the board before the command until each cue's hit when `before` is
   * given. The game never calls it; presentations clear it.
   */
  pinGiantFeedback(
    feedback: readonly (Omit<GiantFeedbackV7, "undeadViolet" | "scale"> & {
      readonly unitIds?: readonly number[];
      readonly actorUnitId?: number;
    })[],
    before: PlayerViewV7 | null = null,
  ): void {
    this.#pinnedGiantFeedback = feedback.map((entry) =>
      this.#giantFeedbackOf(
        {
          effect: entry.effect,
          from: entry.from,
          cells: entry.cells,
          ...(entry.amounts === undefined ? {} : { amounts: entry.amounts }),
          ...(entry.marks === undefined ? {} : { marks: entry.marks }),
          ...(entry.walls === true ? { walls: true as const } : {}),
          ...(entry.unitIds === undefined ? {} : { unitIds: entry.unitIds }),
        },
        entry.progress,
        before ?? this.#model?.view ?? null,
      ),
    );
    this.#unitPulses = feedback.flatMap((entry) =>
      giantUnitPulsesV7(
        { ...entry, unitIds: entry.unitIds ?? [] },
        entry.progress,
        this.#camera.zoom,
      ),
    );
    const pending = feedback.find(
      (entry) =>
        GIANT_EFFECT_HIT_V7[entry.effect] > 0 &&
        entry.progress < GIANT_EFFECT_HIT_V7[entry.effect],
    );
    const flying = pending?.effect === "TOSS" ? (pending.unitIds ?? []) : [];
    this.#presentedView =
      pending === undefined || before === null
        ? null
        : {
            ...before,
            units: before.units.filter((unit) => !flying.includes(unit.id)),
          };
    this.#draw();
    this.#drawSupportOverlay();
  }

  /**
   * A giant cue at `progress`, in the look's Undead accent and scale; a
   * Goblin Toss with the thrown Goblin's own sprite (CHIBI) from `view`.
   */
  #giantFeedbackOf(
    step: Pick<
      GiantFeedbackV7,
      "effect" | "from" | "cells" | "amounts" | "marks" | "walls"
    > & { readonly unitIds?: readonly number[] },
    progress: number,
    view: PlayerViewV7 | null = this.#model?.view ?? null,
  ): GiantFeedbackV7 {
    const flyer =
      step.effect === "TOSS"
        ? view?.units.find((unit) => unit.id === step.unitIds?.[0])
        : undefined;
    const sprite = flyer === undefined ? null : this.#unitSprite(view, flyer);
    return {
      ...(sprite === null ? {} : { sprite }),
      effect: step.effect,
      from: step.from,
      cells: step.cells,
      ...(step.amounts === undefined ? {} : { amounts: step.amounts }),
      ...(step.marks === undefined ? {} : { marks: step.marks }),
      ...(step.walls === true ? { walls: true } : {}),
      progress,
      ...(this.#model?.visualDirection?.undeadAccent === "VIOLET"
        ? { undeadViolet: true }
        : {}),
    };
  }

  /**
   * A unit's own sprite at its drawn size, or null while it loads or when
   * it has no raster.
   */
  #unitSprite(
    view: PlayerViewV7 | null,
    unit: PlayerViewV7["units"][number],
  ): GiantSpriteV7 | null {
    if (view === null) return null;
    const model = this.#model;
    const art =
      model?.visualDirection === undefined
        ? this.#chibiArt
        : this.#directionRuntime(
            model.visualDirection,
            model.visualDirectionArt,
          ).art;
    const scale = chibiMasterScale(this.#camera);
    const resolved = resolveChibiWithFallbackV7(art, {
      subject: unitArtSubjectV7({
        ...unit,
        faction: presentedUnitFactionV7(view, unit),
      }),
      at: unit.at,
      ownerColor: playerFactionColourV7(view, unit.ownerId),
      deviceScale: scale * (this.#document.defaultView?.devicePixelRatio ?? 1),
    }).resolution;
    return resolved.kind === "READY"
      ? {
          image: resolved.image,
          width: resolved.asset.width * scale,
          height: resolved.asset.height * scale,
        }
      : null;
  }

  /** A Thunder Stomp's board shake: both canvases moved sideways. */
  #setBoardShake(cssPx: number): void {
    const transform =
      cssPx === 0 || this.#model?.motion === "REDUCED"
        ? ""
        : `translateX(${cssPx.toFixed(2)}px)`;
    for (const canvas of [this.#canvas, this.#effectsCanvas])
      if (canvas !== null && canvas.style.transform !== transform)
        canvas.style.transform = transform;
  }

  /**
   * Review tooling and tests: draws the given attack cues (bead
   * pulp_wars-b5f.5) at their fixed progress on the effects canvas until
   * cleared with an empty list. The Lich's bolt takes the look's Undead
   * accent. The game never calls it; presentations clear it.
   */
  pinAttackFeedback(
    feedback: readonly Omit<AttackFeedbackV7, "undeadViolet">[],
  ): void {
    this.#pinnedAttackFeedback = feedback.map((entry) =>
      this.#attackFeedbackOf(
        entry.effect,
        entry.from,
        entry.to,
        entry.progress,
        {
          ...(entry.shell === undefined ? {} : { shell: entry.shell }),
          ...(entry.splash === undefined ? {} : { splash: entry.splash }),
          ...(entry.ricochet === undefined ? {} : { ricochet: entry.ricochet }),
        },
      ),
    );
    this.#drawSupportOverlay();
  }

  /**
   * An attack cue at `progress`, in the look's Undead accent; a broadside
   * with its shell and splash cells.
   */
  #attackFeedbackOf(
    effect: AttackEffectIdV7,
    from: CoordV7,
    to: CoordV7,
    progress: number,
    broadside: BroadsideFeedbackV7 = {},
  ): AttackFeedbackV7 {
    return {
      effect,
      from,
      to,
      progress,
      ...broadside,
      ...(this.#model?.visualDirection?.undeadAccent === "VIOLET"
        ? { undeadViolet: true }
        : {}),
    };
  }

  /** Bead pulp_wars-2yc.93: like `#draw`, an overlay frame that throws is logged. */
  #drawSupportOverlay(): void {
    try {
      this.#drawSupportOverlayFrame();
    } catch (error) {
      reportPresentationFailureV7("the board's effects frame", error);
    }
  }

  #drawSupportOverlayFrame(): void {
    const context = this.#effectsContext;
    const canvas = this.#effectsCanvas;
    if (context === null || canvas === null) return;
    this.#overlayDrawn = true;
    const dpr = this.#document.defaultView?.devicePixelRatio ?? 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, this.#viewport.width, this.#viewport.height);
    this.#drawFogLift(context, canvas, dpr);
    this.#drawFogPuff(context, canvas, dpr);
    // Combat juice: the poofs and pops under the other cues, the numbers
    // over every one of them.
    const now = this.#now();
    if (this.#pinnedCombatJuice === null) this.#combatJuice.prune(now);
    const juice = this.#pinnedCombatJuice ?? this.#combatJuice.entries;
    const juiceNow = this.#pinnedCombatJuice === null ? now : 0;
    const units =
      juice.length === 0
        ? 0
        : drawCombatJuiceUnitsV7(context, this.#camera, juice, juiceNow);
    this.#drawSupportCues(context, canvas);
    const floats =
      juice.length === 0
        ? 0
        : drawCombatJuiceFloatsV7(context, this.#camera, juice, juiceNow);
    if (units === 0) delete canvas.dataset.combatJuiceUnits;
    else canvas.dataset.combatJuiceUnits = String(units);
    if (floats === 0) delete canvas.dataset.combatJuiceFloats;
    else canvas.dataset.combatJuiceFloats = String(floats);
  }

  /** The cues of the playback and the pinned review cues, on the overlay. */
  #drawSupportCues(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ): void {
    const effectArt = this.#supportEffectArt();
    for (const pinned of this.#pinnedAttackFeedback)
      drawAttackFeedbackV7(context, this.#camera, pinned, effectArt);
    const attack = this.#attackFeedback;
    if (attack === null) {
      delete canvas.dataset.attackEffect;
      delete canvas.dataset.attackProgress;
    } else {
      canvas.dataset.attackEffect = attack.effect;
      canvas.dataset.attackProgress = attack.progress.toFixed(3);
      drawAttackFeedbackV7(context, this.#camera, attack, effectArt);
    }
    for (const pinned of this.#pinnedCandyFeedback)
      drawCandyFeedbackV7(context, this.#camera, pinned, effectArt);
    const candy = this.#candyFeedback;
    if (candy === null) {
      delete canvas.dataset.candyEffect;
      delete canvas.dataset.candyProgress;
    } else {
      canvas.dataset.candyEffect = candy.effect;
      canvas.dataset.candyProgress = candy.progress.toFixed(3);
      drawCandyFeedbackV7(context, this.#camera, candy, effectArt);
    }
    for (const pinned of this.#pinnedCultFeedback)
      drawCultFeedbackV7(context, this.#camera, pinned, effectArt);
    const cult = this.#cultFeedback;
    if (cult === null) {
      delete canvas.dataset.cultEffect;
      delete canvas.dataset.cultProgress;
    } else {
      canvas.dataset.cultEffect = cult.effect;
      canvas.dataset.cultProgress = cult.progress.toFixed(3);
      drawCultFeedbackV7(context, this.#camera, cult, effectArt);
    }
    for (const pinned of this.#pinnedGiantFeedback)
      drawGiantFeedbackV7(context, this.#camera, pinned);
    const giant = this.#giantFeedback;
    if (giant === null) {
      delete canvas.dataset.giantEffect;
      delete canvas.dataset.giantProgress;
    } else {
      canvas.dataset.giantEffect = giant.effect;
      canvas.dataset.giantProgress = giant.progress.toFixed(3);
      drawGiantFeedbackV7(context, this.#camera, giant);
    }
    for (const pinned of this.#pinnedDwarfFeedback)
      drawDwarfFeedbackV7(context, this.#camera, pinned, effectArt);
    const dwarf = this.#dwarfFeedback;
    if (dwarf === null) {
      delete canvas.dataset.dwarfEffect;
      delete canvas.dataset.dwarfProgress;
    } else {
      canvas.dataset.dwarfEffect = dwarf.effect;
      canvas.dataset.dwarfProgress = dwarf.progress.toFixed(3);
      drawDwarfFeedbackV7(context, this.#camera, dwarf, effectArt);
    }
    for (const pinned of this.#pinnedIceFolkFeedback)
      drawIceFolkFeedbackV7(context, this.#camera, pinned, effectArt);
    const iceFolk = this.#iceFolkFeedback;
    if (iceFolk === null) {
      delete canvas.dataset.iceFolkEffect;
      delete canvas.dataset.iceFolkProgress;
    } else {
      canvas.dataset.iceFolkEffect = iceFolk.effect;
      canvas.dataset.iceFolkProgress = iceFolk.progress.toFixed(3);
      drawIceFolkFeedbackV7(context, this.#camera, iceFolk, effectArt);
    }
    for (const pinned of this.#pinnedSupportFeedback)
      drawSupportFeedbackV7(context, this.#camera, pinned, false, effectArt);
    for (const pinned of this.#pinnedExplosionFeedback)
      drawExplosionFeedbackV7(context, this.#camera, pinned, false);
    for (const pinned of this.#pinnedDinosaurFeedback)
      drawDinosaurFeedbackV7(context, this.#camera, pinned);
    for (const pinned of this.#pinnedMartianFeedback)
      drawMartianFeedbackV7(context, this.#camera, pinned, effectArt);
    const martian = this.#martianFeedback;
    if (martian === null) {
      delete canvas.dataset.martianEffect;
      delete canvas.dataset.martianProgress;
    } else {
      canvas.dataset.martianEffect = martian.effect;
      canvas.dataset.martianProgress = martian.progress.toFixed(3);
      drawMartianFeedbackV7(context, this.#camera, martian, effectArt);
    }
    const dinosaur = this.#dinosaurFeedback;
    if (dinosaur === null) {
      delete canvas.dataset.dinosaurEffect;
      delete canvas.dataset.dinosaurCells;
      delete canvas.dataset.dinosaurProgress;
    } else {
      canvas.dataset.dinosaurEffect = dinosaur.effect;
      canvas.dataset.dinosaurCells = String(dinosaur.cells.length);
      canvas.dataset.dinosaurProgress = dinosaur.progress.toFixed(3);
      drawDinosaurFeedbackV7(context, this.#camera, dinosaur);
    }
    const explosion = this.#explosionFeedback;
    if (explosion === null) {
      delete canvas.dataset.explosionWave;
      delete canvas.dataset.explosionBlasts;
      delete canvas.dataset.explosionProgress;
    } else {
      canvas.dataset.explosionWave = String(explosion.wave);
      canvas.dataset.explosionBlasts = String(explosion.blasts.length);
      canvas.dataset.explosionProgress = explosion.progress.toFixed(3);
      drawExplosionFeedbackV7(
        context,
        this.#camera,
        explosion,
        this.#model?.motion === "REDUCED",
      );
    }
    const feedback = this.#supportFeedback;
    const windmill = this.#windmillHealingFeedback;
    if (feedback === null && windmill === null) {
      delete canvas.dataset.supportEffect;
      delete canvas.dataset.supportRecipients;
      delete canvas.dataset.supportProgress;
      delete canvas.dataset.healingPhase;
      delete canvas.dataset.healingSources;
      delete canvas.dataset.healingRecipients;
      delete canvas.dataset.healingProgress;
      return;
    }
    if (feedback !== null) {
      canvas.dataset.supportEffect = feedback.effect;
      canvas.dataset.supportRecipients = String(feedback.recipients.length);
      canvas.dataset.supportProgress = feedback.progress.toFixed(3);
      drawSupportFeedbackV7(
        context,
        this.#camera,
        feedback,
        this.#model?.motion === "REDUCED",
        effectArt,
      );
    } else {
      delete canvas.dataset.supportEffect;
      delete canvas.dataset.supportRecipients;
      delete canvas.dataset.supportProgress;
    }
    if (windmill !== null) {
      canvas.dataset.healingPhase = windmill.phase;
      canvas.dataset.healingSources = String(windmill.sources.length);
      canvas.dataset.healingRecipients = String(windmill.recipients.length);
      canvas.dataset.healingProgress = windmill.progress.toFixed(3);
      drawWindmillHealingFeedbackV7(
        context,
        this.#camera,
        windmill,
        this.#model?.motion === "REDUCED",
      );
    } else {
      delete canvas.dataset.healingPhase;
      delete canvas.dataset.healingSources;
      delete canvas.dataset.healingRecipients;
      delete canvas.dataset.healingProgress;
    }
  }

  #activate(at: CoordV7): void {
    const model = this.#model;
    if (model === null) return;
    this.#quietCursorAt = null;
    if (this.#inspectionCycle !== null && !same(this.#inspectionCycle.at, at))
      this.#inspectionCycle = null;
    // Tile actions (bead pulp_wars-2yc.60): a badged tile's action, or its
    // chooser, is the app's to open.
    const onTileActions = this.#callbacks?.onTileActions;
    if (
      model.interactive &&
      onTileActions !== undefined &&
      tileActionsAtV7(model.tileActions, at) !== undefined
    ) {
      const centre = this.cellCentreCssPx(at);
      onTileActions(at, {
        x: centre.x,
        y: centre.y,
        size: TILE_WIDTH * this.#camera.zoom,
      });
      return;
    }
    const plan = this.#planFor(model.view, model.offeredCommands);
    const target = plan.targets.find((candidate) => same(candidate.at, at));
    if (target !== undefined && model.interactive) {
      this.#callbacks?.onCommand(target);
      return;
    }
    // Bead pulp_wars-2yc.29: the city whose territory holds the tile hops.
    this.feedback.territoryClick(model.view, at);
    const unit = model.view.units.find((candidate) => same(candidate.at, at));
    const city = model.view.cities.find((candidate) => same(candidate.at, at));
    const sameCycle =
      this.#inspectionCycle !== null && same(this.#inspectionCycle.at, at);
    if (
      unit !== undefined &&
      (!sameCycle || this.#inspectionCycle?.next === "UNIT")
    ) {
      this.#callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
      this.#inspectionCycle = {
        at,
        occupantUnitId: unit.id,
        next: "UNDERLYING",
      };
    } else {
      this.#callbacks?.onSelection(
        city === undefined
          ? { kind: "TILE", at }
          : { kind: "CITY", cityId: city.id },
      );
      // Bead pulp_wars-2yc.77: a tap on the fog stirs it (and draws no box).
      if (city === undefined && selectsFogV7(model.view, { kind: "TILE", at }))
        this.#startFogPuff(at);
      this.#inspectionCycle =
        unit === undefined
          ? null
          : { at, occupantUnitId: unit.id, next: "UNIT" };
    }
  }

  #describe(): void {
    const model = this.#model;
    const at = this.#focused;
    if (model === null || at === null || this.#description === null) return;
    const tile = model.view.board.tiles.find((candidate) =>
      same(candidate.at, at),
    );
    const unit = model.view.units.find((candidate) => same(candidate.at, at));
    if (tile === undefined || !tile.explored) {
      this.#description.textContent =
        unit === undefined
          ? "Unexplored tile."
          : `${unitName(model.view, unit)}, ${unit.hp} of ${unit.maxHp} HP. Explicitly revealed unit on unexplored terrain.`;
      return;
    }
    const city = model.view.cities.find((candidate) => same(candidate.at, at));
    // Tile actions (bead pulp_wars-2yc.60): a badged tile names each of
    // its actions. Every other map target is an offered command's (bead
    // pulp_wars-2yc.62): with none offered (another player's turn) no plan
    // is built to find none, so an AI command builds a plan only for the
    // view the board plays.
    const tileActions = tileActionsAtV7(model.tileActions, at);
    const actions =
      tileActions !== undefined
        ? tileActions.actions.map((action) =>
            action.target === undefined
              ? action.semanticLabel === undefined
                ? action.label
                : `${action.label}: ${action.semanticLabel}`
              : (action.target.semanticLabel ??
                (action.target.previewLabel === undefined
                  ? action.label
                  : `${action.label}: ${action.target.previewLabel}`)),
          )
        : (model.offeredCommands.length === 0
            ? []
            : this.#planFor(model.view, model.offeredCommands).targets
          )
            .filter((target) => same(target.at, at))
            .map((target) =>
              target.semanticLabel !== undefined
                ? target.semanticLabel
                : target.previewLabel === undefined
                  ? target.family
                  : `${target.family}: ${target.previewLabel}`,
            );
    // While an ability is aimed its target's name is read first (bead
    // pulp_wars-b5f.8), so Tab through the targets speaks what each does.
    const interaction = model.interaction;
    const aimed =
      actions.length > 0 &&
      ((interaction.dwarfPick ?? null) !== null ||
        (interaction.candyPick ?? null) !== null ||
        (interaction.giantPick ?? null) !== null ||
        (interaction.martianPick ?? null) !== null ||
        (interaction.iceFolkPick ?? null) !== null ||
        (interaction.navalPick ?? null) !== null ||
        (interaction.freezePick ?? null) !== null ||
        (interaction.cultPick ?? null) !== null ||
        (interaction.layEgg ?? null) !== null);
    this.#description.textContent = [
      aimed ? actions.join(", ") : "",
      title(tile.terrain),
      // Bead pulp_wars-2yc.89: a neutral village or a treasure chest.
      ...(() => {
        const site = tileSiteDockV7(model.view, at);
        return site === null ? [] : [site.name, site.line.replace(/\.$/, "")];
      })(),
      // The Ice Folk revision: what Snow and a Blizzard do for the viewer.
      // The frozen sea: the tile's ice, when it melts, and Black Ice.
      ...(() => {
        const ice = iceOnTileV7(model.view, at);
        return ice === undefined ? [] : [iceChipTooltipV7(model.view, ice)];
      })(),
      tile.snow === true ? snowTooltipV7(model.view) : "",
      tile.blizzard === true ? BLIZZARD_TOOLTIP_V7 : "",
      tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE"
        ? title(tile.resource)
        : "",
      tile.improvement === null ? "" : title(tile.improvement),
      model.view.graves.some((grave) => same(grave, at)) ? "Grave" : "",
      // The Candy revision: the tile's Crumbs, their turns and their bite.
      ...crumbsTileLinesV7(model.view, at),
      // The Candy redesign: the tile's Glaze this turn.
      ...glazeTileLinesV7(model.view, at),
      // The Cultists (bead pulp_wars-mch9.19): a ritual's mark and what
      // it will do, a star's path, a Cowed city, and the tile's hexes.
      ...cultTrickTileLinesV7(model.view, at, (ritual) =>
        previewRitualV7(model.view, ritual),
      ),
      // The Cult redesign's warden (bead pulp_wars-mch9.43): a unit its
      // idol shields, or an enemy it holds Awestruck.
      ...wardenTileLinesV7(model.view, at),
      // Map curiosities: the tile's curiosity and its one sentence.
      ...(() => {
        const curiosity = curiosityOverlayOnTileV7(model.view, at);
        return curiosity === null
          ? []
          : [
              `${CURIOSITY_LABELS_V7[curiosity]}: ${CURIOSITY_RULES_V7[curiosity].replace(/\.$/, "")}`,
            ];
      })(),
      // The Dwarf revision: a mound, its unit and its eruption.
      ...(() => {
        const mound = moundAtV7(model.view, at);
        if (mound === undefined) return [];
        const lines = moundInfoLinesV7(model.view, mound);
        return [
          `${lines.name}, ${mound.unit.hp} of ${mound.unit.maxHp} HP`,
          lines.burrowed,
          lines.eruption ?? "",
          lines.rider ?? "",
        ];
      })(),
      // Dwarf crowd control: the tile's Barricade, its HP and its rule.
      ...(() => {
        const line = barricadeTileLineV7(model.view, at);
        return line === null ? [] : [line, BARRICADE_RULE_V7];
      })(),
      city === undefined
        ? ""
        : `${cityAccessibleNameV7(model.view, city)}, level ${city.level}`,
      unit === undefined
        ? ""
        : [
            `${unitName(model.view, unit)}, ${unit.hp} of ${unit.maxHp} HP`,
            afflictionCursorCueV7(model.view, unit.id),
            // The Candy revision: Rushed, Crashed and Splatted, said.
            candyCursorCueV7(model.view, unit),
            // Goblin explosions and Berserk (`pulp_wars-w49.36`).
            berserkCursorCueV7(model.view, unit),
            // The Vampire and Banshee rework: a terrified unit, said.
            terrorCursorCueV7(model.view, unit),
            // The Mind Control revision: the halo, said.
            mindControlledInfoV7(model.view, unit)?.byLine ?? "",
          ]
            .filter(Boolean)
            .join(", "),
      actions.length === 0 || aimed ? "" : `Available: ${actions.join(", ")}`,
    ]
      .filter(Boolean)
      .join(". ");
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    this.#playerTookCamera();
    const canvas = this.#canvas;
    if (canvas === null) return;
    const point = localPoint(canvas, event);
    this.#pointers.set(event.pointerId, point);
    if (this.#pointers.size === 1)
      this.#pointer = { id: event.pointerId, start: point, current: point };
    else if (this.#pointers.size === 2) {
      this.#pointer = null;
      this.#pinch = pinchState([...this.#pointers.values()]);
      this.#pinchStart =
        this.#pinch === null
          ? null
          : {
              distance: this.#pinch.distance,
              step: chibiZoomStepForCamera(this.#camera),
            };
    }
    canvas.setPointerCapture?.(event.pointerId);
  };
  readonly #onPointerMove = (event: PointerEvent): void => {
    const canvas = this.#canvas;
    if (canvas === null) return;
    if (!this.#pointers.has(event.pointerId)) {
      if (this.#pointers.size === 0 && event.pointerType !== "touch")
        this.#hover(localPoint(canvas, event));
      return;
    }
    const next = localPoint(canvas, event);
    this.#pointers.set(event.pointerId, next);
    if (this.#pointers.size === 2) {
      const current = pinchState([...this.#pointers.values()]);
      const prior = this.#pinch;
      if (current !== null && prior !== null && prior.distance > 0) {
        const before = this.#camera;
        this.#camera = panCamera(this.#camera, {
          x: current.midpoint.x - prior.midpoint.x,
          y: current.midpoint.y - prior.midpoint.y,
        });
        const start = this.#pinchStart;
        if (start !== null && start.distance > 0) {
          const step = nearestChibiZoomStep(
            start.step * (current.distance / start.distance),
          );
          if (step !== chibiZoomStepForCamera(this.#camera))
            this.#camera = zoomChibiCameraAt(
              this.#camera,
              step,
              current.midpoint,
            );
        }
        this.#camera = this.#limitCamera(this.#camera, before);
        this.#draw();
      }
      this.#pinch = current;
      return;
    }
    if (this.#pointer?.id !== event.pointerId) return;
    const dx = next.x - this.#pointer.current.x;
    const dy = next.y - this.#pointer.current.y;
    // Bead pulp_wars-2yc.93: the pointer's place is kept before the board
    // draws, so a drag never pans by more than the finger moved.
    const travelled = Math.hypot(
      next.x - this.#pointer.start.x,
      next.y - this.#pointer.start.y,
    );
    this.#pointer.current = next;
    if (travelled > 6) {
      this.#camera = this.#limitCamera(
        panCamera(this.#camera, { x: dx, y: dy }),
      );
      this.#draw();
    }
  };
  readonly #onPointerUp = (event: PointerEvent): void => {
    const pointer = this.#pointer;
    const canvas = this.#canvas;
    const model = this.#model;
    this.#pointers.delete(event.pointerId);
    if (this.#pinch !== null) {
      this.#pinch = null;
      this.#pinchStart = null;
      this.#pointer = null;
      return;
    }
    if (
      pointer === null ||
      pointer.id !== event.pointerId ||
      canvas === null ||
      model === null
    )
      return;
    const point = localPoint(canvas, event);
    this.#pointer = null;
    if (Math.hypot(point.x - pointer.start.x, point.y - pointer.start.y) <= 6) {
      const at = pickGridTile(point, this.#camera, model.view.board);
      if (at !== null) {
        this.#focused = at;
        this.#focusedByPointer = true;
        const serial = this.#drawSerial;
        this.#activate(at);
        this.#describe();
        if (serial === this.#drawSerial) this.#draw();
      }
    }
  };
  readonly #onPointerLeave = (): void => {
    this.#hover(null);
  };
  /**
   * Revision 13: hovering an attack target that splashes previews its splash
   * area. Hover never moves the keyboard cursor, and a hover that cannot
   * change a splash preview does not redraw.
   */
  #hover(point: Point | null): void {
    const model = this.#model;
    const at =
      point === null || model === null
        ? null
        : pickGridTile(point, this.#camera, model.view.board);
    const prior = this.#hovered;
    if (
      (prior === null && at === null) ||
      (prior !== null && at !== null && same(prior, at))
    )
      return;
    this.#hovered = at;
    if (model === null || this.#presentedView !== null) return;
    const splashAt = (cell: CoordV7 | null): boolean => {
      if (cell === null) return false;
      const plan = this.#planFor(model.view, model.offeredCommands);
      return (
        plan.targets.some(
          (target) =>
            // The Vampire and Banshee rework: a Bat Escape landing's flight
            // is drawn at full weight while it is hovered. The Cultists: a
            // trick's focus preview (a Switcheroo's ghosts, a join's star).
            (target.splash !== undefined ||
              target.blast !== undefined ||
              target.batEscape !== undefined ||
              target.cultFocus !== undefined) &&
            same(target.at, cell),
        ) ||
        // The join badge's star on a pending Stargazer (pulp_wars-mch9.43).
        (plan.focusPreviews ?? []).some((entry) => same(entry.at, cell))
      );
    };
    if (splashAt(prior) || splashAt(at)) this.#draw();
  }
  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#pointers.delete(event.pointerId);
    this.#pointer = null;
    this.#pinch = null;
    this.#pinchStart = null;
  };
  readonly #onWheel = (event: WheelEvent): void => {
    this.#playerTookCamera();
    event.preventDefault();
    const canvas = this.#canvas;
    if (canvas === null) return;
    // Accumulate trackpad deltas so one wheel notch moves one discrete step.
    const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 800 : 1;
    const delta = event.deltaY * unit;
    if (Math.sign(delta) !== Math.sign(this.#wheelDelta)) this.#wheelDelta = 0;
    this.#wheelDelta += delta;
    if (Math.abs(this.#wheelDelta) < CHIBI_WHEEL_STEP_DELTA) return;
    const direction = this.#wheelDelta < 0 ? "IN" : "OUT";
    this.#wheelDelta = 0;
    this.#camera = this.#limitCamera(
      zoomChibiCameraAt(
        this.#camera,
        adjacentChibiZoomStep(chibiZoomStepForCamera(this.#camera), direction),
        localPoint(canvas, event),
      ),
    );
    this.#draw();
  };
  /**
   * The tiles of the aimed ability's targets (a Tunnel, Bomb Run,
   * Assemble, Beam Down, Mind Control, Tractor Beam, Bolas, Cold Snap or
   * nest tile), once each in reading order. Bead pulp_wars-9im: with
   * nothing aimed, the units the selection may attack, heal or hatch (its
   * plain Move tiles are reached with the arrow keys); empty when there
   * are none.
   */
  #aimedTargetCells(model: BoardHostModelV7): CoordV7[] {
    const interaction = model.interaction;
    const aimed =
      (interaction.dwarfPick ?? null) !== null ||
      (interaction.candyPick ?? null) !== null ||
      (interaction.giantPick ?? null) !== null ||
      (interaction.martianPick ?? null) !== null ||
      (interaction.iceFolkPick ?? null) !== null ||
      (interaction.navalPick ?? null) !== null ||
      (interaction.freezePick ?? null) !== null ||
      (interaction.cultPick ?? null) !== null ||
      (interaction.layEgg ?? null) !== null;
    if (!aimed && !model.interactive) return [];
    const cells = new Map<string, CoordV7>();
    for (const target of this.#planFor(model.view, model.offeredCommands)
      .targets)
      if (aimed || targetIsSteppedV7(target.family))
        cells.set(`${target.at.x},${target.at.y}`, target.at);
    // Tile actions (bead pulp_wars-2yc.60): every badged tile is a stop.
    if (!aimed)
      for (const tile of model.tileActions?.tiles ?? [])
        cells.set(`${tile.at.x},${tile.at.y}`, tile.at);
    return [...cells.values()].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    );
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const model = this.#model;
    if (model === null) return;
    // Bead pulp_wars-2yc.82: the keyboard shows its cursor again.
    this.#quietCursorAt = null;
    this.#focusedByPointer = false;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.zoom("IN");
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      this.zoom("OUT");
      return;
    }
    if (event.key === "Escape") {
      this.#inspectionCycle = null;
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (this.#focused !== null) this.#activate(this.#focused);
      return;
    }
    if (
      event.key === "Tab" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      // Bead pulp_wars-b5f.8: while an ability is aimed, Tab and Shift+Tab
      // step through its targets in reading order (the dock lists no
      // tiles); past the last one Tab leaves the board for the dock.
      const cells = this.#aimedTargetCells(model);
      if (cells.length === 0) return;
      const focused = this.#focused;
      const index =
        focused === null ? -1 : cells.findIndex((cell) => same(cell, focused));
      const next = event.shiftKey
        ? index === -1
          ? cells.length - 1
          : index - 1
        : index + 1;
      const cell = cells[next];
      if (cell === undefined) return;
      event.preventDefault();
      this.#playerTookCamera();
      this.#focused = cell;
      this.#keepFocusedOnscreen();
      this.#describe();
      this.#draw();
      return;
    }
    const directions: Record<string, readonly [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = directions[event.key];
    if (delta === undefined) return;
    this.#playerTookCamera();
    event.preventDefault();
    const current = this.#focused ?? { x: 0, y: 0 };
    const multiplier = event.shiftKey ? 1 : 0;
    const diagonalX =
      event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")
        ? 1
        : 0;
    this.#focused = {
      x: Math.max(
        0,
        Math.min(
          model.view.board.width - 1,
          current.x + delta[0] + diagonalX * multiplier,
        ),
      ),
      y: Math.max(
        0,
        Math.min(model.view.board.height - 1, current.y + delta[1]),
      ),
    };
    this.#keepFocusedOnscreen();
    this.#describe();
    this.#draw();
  };

  /**
   * The canvas rows not covered by the top HUD or an open selection dock, in
   * CSS px from the canvas top; the whole canvas when neither is mounted.
   * With `reserveDock`, a closed dock still reserves the board host's
   * `scroll-padding-bottom` (set by the stylesheet on layouts where the
   * full-width dock covers the map), so a new match is framed above where
   * the dock will open.
   */
  #unobscuredBand(reserveDock = false): ScreenBand {
    const canvas = this.#canvas;
    if (canvas === null) return { top: 0, bottom: this.#viewport.height };
    const canvasRect = canvas.getBoundingClientRect();
    const shell = canvas.closest<HTMLElement>(".v7-app-shell");
    const hudRect = shell
      ?.querySelector<HTMLElement>(".v7-match-hud")
      ?.getBoundingClientRect();
    const dockRect = shell
      ?.querySelector<HTMLElement>(".v7-selection-dock")
      ?.getBoundingClientRect();
    const host = canvas.parentElement;
    const reserve =
      reserveDock && host !== null
        ? Number.parseFloat(
            this.#document.defaultView?.getComputedStyle(host)
              .scrollPaddingBottom ?? "",
          )
        : Number.NaN;
    return {
      top: Math.max(
        0,
        hudRect === undefined || hudRect.bottom <= canvasRect.top
          ? 0
          : Math.min(this.#viewport.height, hudRect.bottom - canvasRect.top),
      ),
      bottom: Math.min(
        this.#viewport.height,
        dockRect !== undefined && dockRect.top < canvasRect.bottom
          ? Math.max(0, dockRect.top - canvasRect.top)
          : Number.isFinite(reserve) && reserve > 0
            ? this.#viewport.height - reserve
            : this.#viewport.height,
      ),
    };
  }

  #keepFocusedOnscreen(): void {
    const canvas = this.#canvas;
    if (this.#focused === null || canvas === null) return;
    const point = worldToScreen(projectGrid(this.#focused), this.#camera);
    const margin = Math.min(
      64,
      this.#viewport.width / 4,
      this.#viewport.height / 4,
    );
    const { top: unobscuredTop, bottom: unobscuredBottom } =
      this.#unobscuredBand();
    const unobscuredHeight = unobscuredBottom - unobscuredTop;
    const verticalInset =
      unobscuredHeight > 0 ? Math.min(margin, unobscuredHeight / 4) : margin;
    const safeTop =
      unobscuredHeight > 0 ? unobscuredTop + verticalInset : margin;
    const safeBottom =
      unobscuredHeight > 0
        ? unobscuredBottom - verticalInset
        : this.#viewport.height - margin;
    const dx =
      point.x < margin
        ? margin - point.x
        : point.x > this.#viewport.width - margin
          ? this.#viewport.width - margin - point.x
          : 0;
    const dy =
      point.y < safeTop
        ? safeTop - point.y
        : point.y > safeBottom
          ? safeBottom - point.y
          : 0;
    if (dx !== 0 || dy !== 0)
      this.#camera = this.#limitCamera(
        panCamera(this.#camera, { x: dx, y: dy }),
        this.#camera,
        [this.#focused],
      );
  }

  #detach(): void {
    // Bead pulp_wars-2yc.93: the old canvas's listeners go first, whatever
    // the cleanup after them does, so a board mounted again never has two
    // sets of input handlers.
    const mounted = this.#canvas;
    if (mounted !== null) {
      mounted.removeEventListener("pointerdown", this.#onPointerDown);
      mounted.removeEventListener("pointermove", this.#onPointerMove);
      mounted.removeEventListener("pointerup", this.#onPointerUp);
      mounted.removeEventListener("pointercancel", this.#onPointerCancel);
      mounted.removeEventListener("pointerleave", this.#onPointerLeave);
      mounted.removeEventListener("wheel", this.#onWheel);
      mounted.removeEventListener("keydown", this.#onKeyDown);
    }
    try {
      this.#detachEffects();
    } catch (error) {
      reportPresentationFailureV7("detaching the board", error);
    }
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#canvas = null;
    this.#context = null;
    this.#effectsCanvas = null;
    this.#effectsContext = null;
    this.#description = null;
    this.#callbacks = null;
    this.#pointers.clear();
    this.#detachPointerState();
  }

  #detachEffects(): void {
    this.#cancelCameraPan();
    if (this.#animationFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = null;
    this.#cancelAmbientFrame();
    if (this.#terrainRippleFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(
        this.#terrainRippleFrame,
      );
    this.#terrainRippleFrame = null;
    this.#terrainRipple.reset();
    this.#cancelFogPuff();
    this.#fogPuff.reset();
    this.#pinnedFogPuff = null;
    this.#fogLift.reset();
    this.#pinnedFogLiftMs = null;
    if (this.#fogLiftWarmTimer !== null)
      this.#document.defaultView?.clearTimeout(this.#fogLiftWarmTimer);
    this.#fogLiftWarmTimer = null;
    this.#clearCombatJuice();
    if (this.#victoryWaveFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#victoryWaveFrame);
    this.#victoryWaveFrame = null;
    this.#victoryWave.reset();
    this.#victoryWaveHeard = null;
    this.#victoryFadeContext = null;
  }

  #detachPointerState(): void {
    this.#pointer = null;
    this.#hovered = null;
    this.#pinch = null;
    this.#pinchStart = null;
    this.#wheelDelta = 0;
    this.#selectionJump = null;
    this.#readinessKey = null;
  }

  /**
   * Slides a unit along `path`. A `walk` (an ordinary Move) speeds up,
   * holds its pace and slows down (playback-pacing-v7.ts); a shove keeps
   * the abrupt ease-out of `#animate`. The camera does not follow it: it
   * was framed before the step started.
   */
  async #animatePath(
    unitId: number,
    path: readonly CoordV7[],
    duration: number,
    walk: boolean,
  ): Promise<void> {
    const first = path[0];
    if (first === undefined) return;
    await this.#animate(duration, (eased) => {
      if (path.length === 1) {
        this.#draw();
        return;
      }
      const progress = walk
        ? movePathProgressV7(1 - Math.cbrt(1 - eased), path.length - 1)
        : eased;
      const scaled = progress * (path.length - 1);
      const index = Math.min(path.length - 2, Math.floor(scaled));
      const from = path[index];
      const to = path[index + 1];
      if (from === undefined || to === undefined) return;
      const local = scaled - index;
      // The Candy redesign (section 14): a Chocolate Bunny's hop (two
      // tiles in one step of the path) arcs up over the jumped tile.
      const hop =
        Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) === 2
          ? Math.sin(Math.PI * local) * HOP_LIFT_TILES_V7
          : 0;
      this.#animatedUnit = {
        id: unitId,
        at: {
          x: from.x + (to.x - from.x) * local,
          y: from.y + (to.y - from.y) * local - hop,
        },
        travels: true,
      };
      this.#draw();
    });
  }

  async #animateLunge(
    unitId: number,
    from: CoordV7,
    target: CoordV7,
    duration: number,
  ): Promise<void> {
    await this.#animate(duration, (progress) => {
      const phase = progress < 0.56 ? progress / 0.56 : (1 - progress) / 0.44;
      const amount = Math.max(0, phase) * 0.22;
      this.#animatedUnit = {
        id: unitId,
        at: {
          x: from.x + (target.x - from.x) * amount,
          y: from.y + (target.y - from.y) * amount,
        },
      };
      this.#draw();
    });
  }

  async #animateProjectile(
    catapult: boolean,
    from: CoordV7,
    to: CoordV7,
    duration: number,
    bomb = false,
    acid = false,
  ): Promise<void> {
    await this.#animate(duration, (progress) => {
      this.#projectile = { from, to, progress, catapult, bomb, acid };
      this.#draw();
    });
    this.#projectile = null;
  }

  /**
   * Bead pulp_wars-b5f.5: plays an attack cue on the effects overlay. The
   * board shows the view before the attack until the shot lands at
   * ATTACK_EFFECT_HIT_V7, then the result with the usual 100 ms impact
   * shake (a shattered target stays for its Shatter, without the shake).
   * Only the overlay repaints during the flight.
   */
  async #animateAttack(
    effect: AttackEffectIdV7,
    from: CoordV7,
    to: CoordV7,
    after: PlayerViewV7,
    holdTarget: boolean,
    durationScale: number,
    broadside: BroadsideFeedbackV7,
  ): Promise<void> {
    const duration = ATTACK_EFFECT_DURATIONS_V7[effect] * durationScale;
    const hit = ATTACK_EFFECT_HIT_V7[effect];
    const impactShare = duration > 0 ? (100 * durationScale) / duration : 1;
    let landed = false;
    this.#draw();
    await this.#animate(duration, (eased) => {
      // The cue keeps its own timeline: #animate's cubic ease-out would
      // spend a quarter of the time on the flight and the rest on the burst.
      const progress = 1 - Math.cbrt(1 - eased);
      this.#attackFeedback = this.#attackFeedbackOf(
        effect,
        from,
        to,
        progress,
        broadside,
      );
      // The board repaints from the hit until the shake settles; otherwise
      // only the overlay does.
      if (
        progress >= hit &&
        !holdTarget &&
        (!landed || this.#impact !== null)
      ) {
        const local = (progress - hit) / impactShare;
        this.#presentedView = after;
        this.#impact =
          local >= 1
            ? null
            : {
                at: to,
                shakeCssPx: Math.sin(local * Math.PI * 6) * (1 - local) * 6,
                flashAlpha: Math.sin(local * Math.PI) * 0.42,
              };
        landed = true;
        this.#draw();
      } else this.#drawSupportOverlay();
    });
    this.#impact = null;
    this.#attackFeedback = null;
    if (!holdTarget) this.#presentedView = after;
    this.#draw();
  }

  async #animateImpact(at: CoordV7, duration: number): Promise<void> {
    await this.#animate(duration, (progress) => {
      this.#impact = {
        at,
        shakeCssPx: Math.sin(progress * Math.PI * 6) * (1 - progress) * 6,
        flashAlpha: Math.sin(progress * Math.PI) * 0.42,
      };
      this.#draw();
    });
    this.#impact = null;
  }

  /**
   * Combat juice: the boundary's death poofs and spawn pops (and, with
   * reduced motion, every number at once) start now, once per boundary.
   */
  #fireBoundaryJuice(): void {
    const boundary = this.#juiceBoundary;
    const model = this.#model;
    if (boundary === null || boundary.fired || model === null) return;
    boundary.fired = true;
    if (!this.#combatJuiceAvailable()) return;
    const now = this.#now();
    const still = model.motion === "REDUCED";
    const scale = combatJuiceScaleV7(boundary.durationScale);
    const { before, after, envelope, steps } = boundary;
    for (const death of combatJuiceDeathsV7(before, after, envelope, steps)) {
      const unit = before.units.find(
        (candidate) => candidate.id === death.unitId,
      );
      this.#combatJuice.addUnitCue(
        "POOF",
        death.unitId,
        death.at,
        now,
        still ? DEATH_POOF_V7.reducedHoldMs : DEATH_POOF_V7.durationMs * scale,
        still,
        still || unit === undefined
          ? null
          : this.#juiceSprite(before, unit, death.at, true),
      );
    }
    for (const spawn of combatJuiceSpawnsV7(before, after, envelope)) {
      const unit = after.units.find(
        (candidate) => candidate.id === spawn.unitId,
      );
      this.#combatJuice.addUnitCue(
        "POP",
        spawn.unitId,
        spawn.at,
        now,
        still ? SPAWN_POP_V7.reducedHoldMs : SPAWN_POP_V7.durationMs * scale,
        still,
        still || unit === undefined
          ? null
          : this.#juiceSprite(after, unit, spawn.at, false),
      );
    }
    // Reduced motion shows the result at once: every number with it, still.
    if (still)
      for (const index of steps.keys())
        for (const hit of combatJuiceHitsForStepV7(steps, index, envelope))
          this.#combatJuice.addFloat(
            hit.at,
            hit.amount,
            now,
            DAMAGE_FLOAT_V7.reducedHoldMs,
            true,
          );
    this.#pumpCombatJuice();
  }

  /** Combat juice: the numbers of a step that starts playing now. */
  #scheduleStepJuice(
    steps: readonly CorePresentationStepV7[],
    index: number,
    envelope: PlayerEventEnvelopeV7,
    durationScale: number,
  ): void {
    if (this.#model?.motion === "REDUCED" || !this.#combatJuiceAvailable())
      return;
    const hits = combatJuiceHitsForStepV7(steps, index, envelope);
    if (hits.length === 0) return;
    const now = this.#now();
    const length =
      DAMAGE_FLOAT_V7.durationMs * combatJuiceScaleV7(durationScale);
    for (const hit of hits)
      this.#combatJuice.addFloat(
        hit.at,
        hit.amount,
        now + hit.delayMs * durationScale,
        length,
        false,
      );
  }

  /** Cues need frames: without them (a test stand-in) none plays. */
  #combatJuiceAvailable(): boolean {
    const browser = this.#document.defaultView;
    return (
      browser !== null &&
      typeof browser.requestAnimationFrame === "function" &&
      typeof browser.setTimeout === "function"
    );
  }

  /** The units the board leaves out at `nowMs`: a cue draws them. */
  #juiceHiddenAt(nowMs: number): ReadonlySet<number> {
    const pinned = this.#pinnedCombatJuice;
    if (pinned !== null)
      return new Set(
        pinned.flatMap((entry) =>
          entry.kind !== "FLOAT" && entry.sprite !== null && !entry.still
            ? [entry.unitId]
            : [],
        ),
      );
    return this.#combatJuice.hiddenUnitIds(nowMs);
  }

  /**
   * One frame of the cues: the board again when a unit a cue drew is back
   * (or a new one is left out), otherwise the overlay alone, unless the
   * playback's frame drew it already.
   */
  #drawCombatJuiceFrame(overlayDrawn: boolean): void {
    const hidden = this.#juiceHiddenAt(this.#now());
    const changed =
      hidden.size !== this.#juiceHidden.size ||
      [...hidden].some((unitId) => !this.#juiceHidden.has(unitId));
    if (changed) this.#draw();
    else if (!overlayDrawn) this.#drawSupportOverlay();
  }

  /** A playback frame: the cues move with it. */
  #tickCombatJuice(): void {
    if (this.#pinnedCombatJuice !== null) return;
    if (this.#combatJuice.entries.length === 0 && this.#juiceHidden.size === 0)
      return;
    this.#drawCombatJuiceFrame(this.#overlayDrawn);
    this.#overlayDrawn = false;
  }

  /**
   * Asks for the next frame while a cue moves and no playback frame draws
   * it (a timer to the end of a still frame with reduced motion); clears
   * the overlay once the last one is over.
   */
  #pumpCombatJuice(): void {
    const browser = this.#document.defaultView;
    if (browser === null || this.#pinnedCombatJuice !== null) return;
    const now = this.#now();
    if (!this.#combatJuice.active(now)) {
      if (this.#combatJuice.entries.length > 0 || this.#juiceHidden.size > 0) {
        this.#combatJuice.prune(now);
        this.#drawCombatJuiceFrame(false);
      }
      return;
    }
    if (this.#combatJuice.moving(now)) {
      if (
        this.#animationFrame !== null ||
        this.#combatJuiceFrame !== null ||
        typeof browser.requestAnimationFrame !== "function"
      )
        return;
      this.#combatJuiceFrame = browser.requestAnimationFrame(() => {
        this.#combatJuiceFrame = null;
        this.#drawCombatJuiceFrame(false);
        this.#pumpCombatJuice();
      });
      return;
    }
    const next = this.#combatJuice.nextStillEndMs(now);
    if (
      next === null ||
      this.#combatJuiceTimer !== null ||
      typeof browser.setTimeout !== "function"
    )
      return;
    this.#combatJuiceTimer = browser.setTimeout(
      () => {
        this.#combatJuiceTimer = null;
        this.#drawCombatJuiceFrame(false);
        this.#pumpCombatJuice();
      },
      Math.max(0, next - now),
    );
  }

  #cancelCombatJuiceFrame(): void {
    if (this.#combatJuiceFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#combatJuiceFrame);
    this.#combatJuiceFrame = null;
  }

  #clearCombatJuice(): void {
    this.#cancelCombatJuiceFrame();
    if (this.#combatJuiceTimer !== null)
      this.#document.defaultView?.clearTimeout(this.#combatJuiceTimer);
    this.#combatJuiceTimer = null;
    this.#combatJuice.clear();
    this.#juiceBoundary = null;
    this.#juiceHidden = new Set();
    this.#pinnedCombatJuice = null;
  }

  /**
   * A unit's sprite for a poof or a pop, as the board draws it on `at` in
   * `view` (with its white silhouette for a poof's flash), or null while
   * its raster loads or when it has none (the cue is then dust alone).
   */
  #juiceSprite(
    view: PlayerViewV7,
    unit: PlayerViewV7["units"][number],
    at: CoordV7,
    flash: boolean,
  ): CombatJuiceSpriteV7 | null {
    const model = this.#model;
    if (model === null) return null;
    const art =
      model.visualDirection === undefined
        ? this.#chibiArt
        : this.#directionRuntime(
            model.visualDirection,
            model.visualDirectionArt,
          ).art;
    const subject = unitArtSubjectV7({
      ...unit,
      faction: presentedUnitFactionV7(view, unit),
    });
    const resolved = resolveChibiWithFallbackV7(art, {
      subject,
      at: unit.at,
      ownerColor: playerFactionColourV7(view, unit.ownerId),
      deviceScale:
        chibiMasterScale(this.#camera) *
        (this.#document.defaultView?.devicePixelRatio ?? 1),
    }).resolution;
    if (resolved.kind !== "READY") return null;
    const entries = this.#planFor(view, NO_COMMANDS).entries;
    const entry = entries.find(
      (candidate) =>
        candidate.kind === "UNIT" && candidate.key === `unit:${unit.id}`,
    );
    const garrison = entries.some(
      (candidate) =>
        (candidate.kind === "CITY" ||
          (candidate.kind === "SITE" &&
            candidate.artSubject === "SITE:VILLAGE")) &&
        candidate.at.x === at.x &&
        candidate.at.y === at.y,
    );
    const piece = entry?.kind === "UNIT" ? entry : undefined;
    return combatJuiceSpriteOfV7({
      image: resolved.image,
      silhouette: flash ? this.#juiceSilhouette(resolved.image) : null,
      asset: resolved.asset,
      subject,
      garrison,
      flyer: piece?.martian?.flyer === true || piece?.dwarf?.flyer === true,
      growth:
        growthSpriteScaleV7(piece?.growthStage, resolved.asset.width) *
        (piece?.gingerbreadMan === true ? GINGERBREAD_MAN_SPRITE_SCALE_V7 : 1),
    });
  }

  /** The raster's shape in white (made once per raster), or null. */
  #juiceSilhouette(image: CanvasImageSource): CanvasImageSource | null {
    const key = image as object;
    if (this.#juiceSilhouettes.has(key))
      return this.#juiceSilhouettes.get(key) ?? null;
    let silhouette: CanvasImageSource | null = null;
    try {
      const { width, height } = image as {
        readonly width?: number;
        readonly height?: number;
      };
      if (
        width !== undefined &&
        height !== undefined &&
        width > 0 &&
        height > 0
      ) {
        const canvas = this.#document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (context !== null) {
          context.drawImage(image, 0, 0);
          context.globalCompositeOperation = "source-in";
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          silhouette = canvas;
        }
      }
    } catch {
      silhouette = null;
    }
    this.#juiceSilhouettes.set(key, silhouette);
    return silhouette;
  }

  /**
   * Review tooling and tests: holds combat cues at a moment and redraws, or
   * lets them go with null. A FLOAT floats `amount` on `at`; a POOF or a
   * POP plays on the unit `unitId` of the game's view (left out of the
   * board while its sprite is drawn). `elapsedMs` is the time into each;
   * `still` takes the reduced-motion frame. The game never calls it.
   */
  pinCombatJuice(
    pins:
      | readonly (
          | {
              readonly kind: "FLOAT";
              readonly at: CoordV7;
              readonly amount: number;
              readonly elapsedMs: number;
              readonly slot?: number;
              readonly still?: boolean;
            }
          | {
              readonly kind: "POOF" | "POP";
              readonly unitId: number;
              readonly elapsedMs: number;
              readonly still?: boolean;
            }
        )[]
      | null,
  ): void {
    const view = this.#model?.view ?? null;
    this.#pinnedCombatJuice =
      pins === null
        ? null
        : pins.flatMap((pin): CombatJuiceEntryV7[] => {
            const still = pin.still === true;
            if (pin.kind === "FLOAT")
              return [
                {
                  kind: "FLOAT",
                  at: pin.at,
                  amount: pin.amount,
                  requestedMs: -pin.elapsedMs,
                  startMs: -pin.elapsedMs,
                  durationMs: still
                    ? DAMAGE_FLOAT_V7.reducedHoldMs
                    : DAMAGE_FLOAT_V7.durationMs,
                  still,
                  slot: pin.slot ?? 0,
                },
              ];
            const unit = view?.units.find(
              (candidate) => candidate.id === pin.unitId,
            );
            if (view === null || unit === undefined) return [];
            const spec = pin.kind === "POOF" ? DEATH_POOF_V7 : SPAWN_POP_V7;
            return [
              {
                kind: pin.kind,
                unitId: unit.id,
                at: unit.at,
                startMs: -pin.elapsedMs,
                durationMs: still ? spec.reducedHoldMs : spec.durationMs,
                still,
                sprite: still
                  ? null
                  : this.#juiceSprite(view, unit, unit.at, pin.kind === "POOF"),
              },
            ];
          });
    this.#draw();
  }

  releaseCursor(at: CoordV7): void {
    const focused = this.#focused;
    if (this.#focusedByPointer && focused !== null && same(focused, at))
      this.#quietCursorAt = { x: at.x, y: at.y };
  }

  quietTap(at: CoordV7): void {
    // The fog's own puff plays from the tap itself (`#activate`); explored
    // ground plays none (bead pulp_wars-2yc.87).
    this.releaseCursor(at);
  }

  /** Bead pulp_wars-2yc.77: starts (or starts again) the fog puff on `at`. */
  #startFogPuff(at: CoordV7): void {
    if (!this.#fogPuffEnabled) return;
    this.#cancelFogPuff();
    this.#fogPuff.start(at, this.#now());
    this.#drawSupportOverlay();
    this.#pumpFogPuff();
  }

  /** The puff's length and motion, as the model has them. */
  #fogPuffTiming(): {
    readonly durationMs: number;
    readonly reduced: boolean;
  } {
    const model = this.#model;
    return {
      durationMs: fogPuffDurationMsV7(model?.animationSpeed ?? "NORMAL"),
      reduced: model?.motion === "REDUCED",
    };
  }

  /** The fog lift's length, wave and motion, as the model has them. */
  #fogLiftTiming(): FogLiftTimingV7 {
    const model = this.#model;
    return fogLiftTimingV7(
      model?.animationSpeed ?? "NORMAL",
      model?.motion === "REDUCED",
    );
  }

  /** The fog lift's time: now, or the pinned time after its wave began. */
  #fogLiftNow(): number {
    return this.#pinnedFogLiftMs === null
      ? this.#now()
      : (this.#fogLift.startedAtMs ?? 0) + this.#pinnedFogLiftMs;
  }

  /** Draws the cells whose cloud is lifting on the effects overlay. */
  #drawFogLift(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dpr: number,
  ): void {
    const lifts = this.#fogLiftEnabled
      ? this.#fogLift.frame(this.#fogLiftNow(), this.#fogLiftTiming())
      : [];
    if (lifts.length === 0) {
      if (canvas.dataset.fogLift !== undefined) {
        delete canvas.dataset.fogLift;
        delete canvas.dataset.fogLiftPuffs;
      }
      return;
    }
    const model = this.#model;
    const live = model?.visualDirection !== undefined;
    const palette = this.#fogLiftPalette();
    const cost = drawFogLiftV7(
      context,
      {
        camera: this.#camera,
        devicePixelRatio: dpr,
        viewport: this.#viewport,
        timeMs: model?.motion === "REDUCED" ? 0 : this.#atmosphereClockMs,
      },
      lifts,
      {
        art: live ? (this.#fogArt ?? null) : null,
        flat: "#1c2a2e",
        colourKey: palette,
        colours: fogLiftColoursV7(palette),
      },
      this.#fogLiftSpriteCache(),
      (this.#fogLiftScratch ??= createFogLiftScratchV7(this.#document)),
      this.#fogLift.fogNeighbours(),
    );
    const count = String(lifts.length);
    const puffs = String(cost.puffs);
    if (canvas.dataset.fogLift !== count) canvas.dataset.fogLift = count;
    if (canvas.dataset.fogLiftPuffs !== puffs)
      canvas.dataset.fogLiftPuffs = puffs;
  }

  /** The cloud's palette in the live look; the flat fog's otherwise. */
  #fogLiftPalette(): FogPaletteIdV7 | "OFF" {
    return this.#model?.visualDirection === undefined
      ? "OFF"
      : (this.#fogArt?.palette ?? "OFF");
  }

  #fogLiftSpriteCache(): FogLiftSpritesV7 {
    if (this.#fogLiftSprites === undefined) {
      const environment = browserChibiRasterEnvironmentV7(this.#document);
      this.#fogLiftSprites = createFogLiftSpritesV7((pixels, width, height) =>
        environment.createSurface(pixels, width, height),
      );
    }
    return this.#fogLiftSprites;
  }

  /**
   * Builds the lift's cached wisp frames a few at a time, apart, while the
   * board shows fog, so that the first reveal finds them ready.
   */
  #warmFogLift(view: PlayerViewV7): void {
    const palette = this.#fogLiftPalette();
    if (
      this.#fogLiftWarmed === palette ||
      this.#fogLiftWarmTimer !== null ||
      this.#exploredCells(view).length >= view.board.tiles.length
    )
      return;
    const browser = this.#document.defaultView;
    if (browser === null || typeof browser.setTimeout !== "function") return;
    this.#fogLiftWarmTimer = browser.setTimeout(() => {
      this.#fogLiftWarmTimer = null;
      if (this.#model === null) return;
      const current = this.#fogLiftPalette();
      if (
        this.#fogLiftSpriteCache().warm(
          current,
          fogLiftColoursV7(current),
          FOG_LIFT_V7.warmPerStep,
        )
      )
        this.#fogLiftWarmed = current;
      else this.#warmFogLift(this.#model.view);
    }, FOG_LIFT_V7.warmGapMs);
  }

  /**
   * Review tooling and tests: holds the latest fog lift `elapsedMs` after
   * its wave began (the Motion setting's look), or lets it go with null.
   */
  pinFogLift(elapsedMs: number | null): void {
    this.#pinnedFogLiftMs = elapsedMs;
    this.#drawSupportOverlay();
    if (elapsedMs === null) this.#pumpFogPuff();
  }

  /**
   * Repaints the overlay each frame while the puff plays (with reduced
   * motion, once when its still frame is over), then clears it.
   */
  #pumpFogPuff(): void {
    const browser = this.#document.defaultView;
    if (browser === null) return;
    const { durationMs, reduced } = this.#fogPuffTiming();
    const puffing = this.#fogPuff.active(this.#now(), durationMs, reduced);
    // Bead pulp_wars-2yc.83: the fog lift shares this pump; it plays a
    // frame at a time (a plain fade with reduced motion).
    const lifting =
      this.#pinnedFogLiftMs === null &&
      this.#fogLift.active(this.#now(), this.#fogLiftTiming());
    if (!puffing && !lifting) {
      this.#drawSupportOverlay();
      return;
    }
    if (lifting) {
      if (
        this.#fogPuffFrame !== null ||
        typeof browser.requestAnimationFrame !== "function"
      )
        return;
      this.#fogPuffFrame = browser.requestAnimationFrame(() => {
        this.#fogPuffFrame = null;
        this.#drawSupportOverlay();
        this.#pumpFogPuff();
      });
      return;
    }
    if (reduced) {
      if (
        this.#fogPuffTimer !== null ||
        typeof browser.setTimeout !== "function"
      )
        return;
      this.#fogPuffTimer = browser.setTimeout(
        () => {
          this.#fogPuffTimer = null;
          this.#pumpFogPuff();
        },
        fogPuffLengthMsV7(durationMs, true),
      );
      return;
    }
    if (
      this.#fogPuffFrame !== null ||
      typeof browser.requestAnimationFrame !== "function"
    )
      return;
    this.#fogPuffFrame = browser.requestAnimationFrame(() => {
      this.#fogPuffFrame = null;
      this.#drawSupportOverlay();
      this.#pumpFogPuff();
    });
  }

  #cancelFogPuff(): void {
    const browser = this.#document.defaultView;
    if (this.#fogPuffFrame !== null)
      browser?.cancelAnimationFrame(this.#fogPuffFrame);
    this.#fogPuffFrame = null;
    if (this.#fogPuffTimer !== null) browser?.clearTimeout(this.#fogPuffTimer);
    this.#fogPuffTimer = null;
  }

  /** Draws the fog puff, if one plays, on the effects overlay. */
  #drawFogPuff(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dpr: number,
  ): void {
    const { durationMs, reduced } = this.#fogPuffTiming();
    const puff =
      this.#pinnedFogPuff ??
      this.#fogPuff.frame(this.#now(), durationMs, reduced);
    if (puff === null) {
      delete canvas.dataset.fogPuff;
      delete canvas.dataset.fogPuffProgress;
      return;
    }
    canvas.dataset.fogPuff = puff.alphaScale < 1 ? "still" : "playing";
    canvas.dataset.fogPuffProgress = puff.progress.toFixed(3);
    if (this.#fogPuffSurface === undefined)
      this.#fogPuffSurface = createFogPuffSurfaceV7(this.#document);
    drawFogPuffV7(
      context,
      {
        camera: this.#camera,
        devicePixelRatio: dpr,
        viewport: this.#viewport,
      },
      puff,
      // The cloud's palette in the live look; the flat fog's otherwise.
      fogPuffColoursV7(
        this.#model?.visualDirection === undefined
          ? "OFF"
          : (this.#fogArt?.palette ?? "OFF"),
      ),
      this.#fogPuffSurface,
    );
  }

  /**
   * Review tooling and tests: holds a fog puff on `at` `elapsedMs` after
   * its tap (the Motion setting's frame), or lets it go with null.
   */
  pinFogPuff(at: CoordV7, elapsedMs: number | null): void {
    const { durationMs, reduced } = this.#fogPuffTiming();
    this.#pinnedFogPuff =
      elapsedMs === null
        ? null
        : fogPuffAtV7(at, elapsedMs, durationMs, reduced, 1);
    this.#drawSupportOverlay();
  }

  /** The ripple's time: the atmosphere's clock, or the pinned time. */
  #terrainRippleNow(): number {
    return this.#pinnedTerrainRippleMs === null
      ? this.#atmosphereClockMs
      : (this.#terrainRipple.startedAtMs ?? 0) + this.#pinnedTerrainRippleMs;
  }

  /** Asks for the next frame while a cell is still to change. */
  #pumpTerrainRipple(): void {
    const browser = this.#document.defaultView;
    if (
      this.#terrainRippleFrame !== null ||
      this.#pinnedTerrainRippleMs !== null ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function" ||
      !this.#terrainRipple.active(this.#atmosphereClockMs)
    )
      return;
    this.#terrainRippleFrame = browser.requestAnimationFrame(() => {
      this.#terrainRippleFrame = null;
      this.#draw();
    });
  }

  /**
   * Review tooling and tests: holds the territory ripple `elapsedMs` after
   * its last start and redraws (null lets it run again). The game never
   * calls it.
   */
  pinTerrainRipple(elapsedMs: number | null): void {
    this.#pinnedTerrainRippleMs = elapsedMs;
    this.#draw();
  }

  /**
   * The reduced-motion crossfade's own canvas, the board's size, made
   * when first needed (null where no canvas can be made).
   */
  #victoryFadeLayer(): CanvasRenderingContext2D | null {
    const board = this.#canvas;
    if (board === null) return null;
    let layer = this.#victoryFadeContext;
    if (layer === null) {
      try {
        layer = this.#document.createElement("canvas").getContext("2d");
      } catch {
        layer = null;
      }
      this.#victoryFadeContext = layer;
    }
    if (layer === null) return null;
    if (layer.canvas.width !== board.width) layer.canvas.width = board.width;
    if (layer.canvas.height !== board.height)
      layer.canvas.height = board.height;
    return layer;
  }

  /**
   * The crossfade's own canvas (bead pulp_wars-2yc.62), the board's size,
   * where the view after is drawn whole before it is laid over the view
   * before; made when first needed (null where no canvas can be made). Its
   * size is set only when the board's has changed, since that clears it.
   */
  #crossfadeLayer(): {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
  } | null {
    const board = this.#canvas;
    if (board === null) return null;
    let layer = this.#crossfadeCanvas;
    if (layer === null) {
      try {
        const canvas = this.#document.createElement("canvas");
        const context = canvas.getContext("2d");
        layer = context === null ? null : { canvas, context };
      } catch {
        layer = null;
      }
      this.#crossfadeCanvas = layer;
    }
    if (layer === null) return null;
    if (layer.canvas.width !== board.width) layer.canvas.width = board.width;
    if (layer.canvas.height !== board.height)
      layer.canvas.height = board.height;
    return layer;
  }

  /** How a victory reached now shows on this board. */
  #victoryWaveMode(model: BoardHostModelV7): VictoryWaveModeV7 {
    if (model.motion === "REDUCED") return "FADE";
    const browser = this.#document.defaultView;
    return this.#context !== null &&
      browser !== null &&
      typeof browser.requestAnimationFrame === "function"
      ? "WAVE"
      : "INSTANT";
  }

  /**
   * The wave's time: its own clock (a switch to reduced motion in the
   * middle of the wave ends it at once), or the pinned time.
   */
  #victoryWaveNow(model: BoardHostModelV7): number {
    const started = this.#victoryWave.startedAtMs;
    if (this.#pinnedVictoryWaveMs !== null)
      return (started ?? 0) + this.#pinnedVictoryWaveMs;
    return model.motion === "REDUCED" &&
      started !== null &&
      this.#victoryWave.mode === "WAVE"
      ? Number.MAX_SAFE_INTEGER
      : this.#victoryClockMs;
  }

  /**
   * Asks for the next frame while the wave plays, and tells the listener
   * once it has landed.
   */
  #pumpVictoryWave(nowMs: number): void {
    const wave = this.#victoryWave;
    const started = wave.startedAtMs;
    const settled = wave.settledAtMs;
    const browser = this.#document.defaultView;
    if (
      started !== null &&
      settled !== null &&
      nowMs >= settled &&
      this.#victoryWaveHeard !== started &&
      this.#pinnedVictoryWaveMs === null
    ) {
      this.#victoryWaveHeard = started;
      const listener = this.#victoryWaveListener;
      // After this frame: the listener renders the dialog, which updates
      // this host again.
      if (listener !== null)
        if (browser !== null && typeof browser.setTimeout === "function")
          browser.setTimeout(listener, 0);
        else listener();
    }
    if (
      this.#victoryWaveFrame !== null ||
      this.#pinnedVictoryWaveMs !== null ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function" ||
      (!wave.active(nowMs) && (settled === null || nowMs >= settled))
    )
      return;
    this.#victoryWaveFrame = browser.requestAnimationFrame(() => {
      this.#victoryWaveFrame = null;
      this.#draw();
    });
  }

  victoryWaveAnimates(): boolean {
    const model = this.#model;
    const browser = this.#document.defaultView;
    return (
      this.#victoryWaveEnabled &&
      model !== null &&
      this.#context !== null &&
      browser !== null &&
      typeof browser.requestAnimationFrame === "function"
    );
  }

  setVictoryWaveListener(listener: (() => void) | null): void {
    this.#victoryWaveListener = listener;
    // A wave that has landed already is heard at once.
    const started = this.#victoryWave.startedAtMs;
    if (
      listener !== null &&
      started !== null &&
      this.#victoryWaveHeard === started
    )
      this.#document.defaultView?.setTimeout(listener, 0);
  }

  /**
   * Review tooling and tests: holds the victory wave `elapsedMs` after its
   * start and redraws (null lets it run again). The game never calls it.
   */
  pinVictoryWave(elapsedMs: number | null): void {
    this.#pinnedVictoryWaveMs = elapsedMs;
    this.#draw();
  }

  /** Review tooling and tests: the wave's start cell, faction and mode. */
  victoryWaveState(): {
    readonly origin: CoordV7 | null;
    readonly faction: string | null;
    readonly mode: VictoryWaveModeV7 | null;
    readonly startedAtMs: number | null;
    readonly settledAtMs: number | null;
  } {
    const wave = this.#victoryWave;
    return {
      origin: wave.origin,
      faction: wave.faction,
      mode: wave.mode,
      startedAtMs: wave.startedAtMs,
      settledAtMs: wave.settledAtMs,
    };
  }

  #animate(
    duration: number,
    update: (progress: number) => void,
  ): Promise<void> {
    const browser = this.#document.defaultView;
    if (
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    ) {
      update(1);
      return Promise.resolve();
    }
    // Combat juice: the playback's frames draw it while it plays.
    this.#cancelCombatJuiceFrame();
    return new Promise((resolve) => {
      let started = browser.performance.now();
      let pausedAt: number | null = null;
      this.#animationResolve = resolve;
      const frame = (now: number): void => {
        if (this.#model?.presentationPaused) {
          pausedAt ??= now;
          this.#animationFrame = browser.requestAnimationFrame(frame);
          this.#tickCombatJuice();
          return;
        }
        if (pausedAt !== null) {
          started += now - pausedAt;
          pausedAt = null;
        }
        // Bead pulp_wars-2yc.93: a busy phone stamps a frame before the
        // moment the step started (the frame began before the task that
        // started it ran); such a frame shows the step's start, never a
        // progress below 0.
        const progress =
          duration > 0
            ? Math.max(0, Math.min(1, (now - started) / duration))
            : 1;
        this.#overlayDrawn = false;
        // Bead pulp_wars-2yc.93: a step's frame that throws is logged and
        // the step still ends, so its playback never waits forever.
        try {
          update(1 - Math.pow(1 - progress, 3));
          this.#tickCombatJuice();
        } catch (error) {
          reportPresentationFailureV7("a playback frame", error);
        }
        if (progress >= 1) {
          this.#animationFrame = null;
          this.#animationResolve = null;
          resolve();
        } else this.#animationFrame = browser.requestAnimationFrame(frame);
      };
      this.#animationFrame = browser.requestAnimationFrame(frame);
    });
  }

  #syncAmbientFrame(): void {
    this.#cancelAmbientFrame();
    const model = this.#model;
    const browser = this.#document.defaultView;
    if (
      model === null ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function" ||
      !model.interactive ||
      this.#presentedView !== null
    )
      return;
    const ready =
      model.motion === "FULL" &&
      (model.view.units.some(
        (unit) =>
          unit.ownerId === model.view.viewer.id &&
          !unit.activation.handled &&
          model.offeredCommands.some(
            (command) => command.kind === "MOVE" && command.unitId === unit.id,
          ),
      ) ||
        // Bead pulp_wars-2yc.29: a waiting Promotion marker bobs.
        this.feedback.wantsAmbientFrames());
    const jump = this.#selectionJump;
    const jumping =
      jump !== null &&
      this.#now() - jump.startedAt <
        selectionJumpDurationMs(model.animationSpeed);
    if (!ready && !jumping) {
      if (!jumping) this.#selectionJump = null;
      // The Ice Folk revision: a visible Blizzard keeps its flakes falling
      // with a calm redraw about fifteen times a second (full motion only);
      // the Mind Control revision: so does a visible controlled unit's halo;
      // bead pulp_wars-2yc.81: so do the HP chunks of an aimed attack.
      if (
        model.motion === "FULL" &&
        (model.view.board.tiles.some(
          (tile) => tile.explored && tile.blizzard === true,
        ) ||
          (model.view.mindControlled ?? []).length > 0 ||
          this.#planFor(model.view, model.offeredCommands).targets.some(
            (target) => (target.hpLoss?.length ?? 0) > 0,
          )) &&
        typeof browser.setTimeout === "function"
      )
        this.#blizzardTimer = browser.setTimeout(() => {
          this.#blizzardTimer = null;
          this.#draw();
          this.#syncAmbientFrame();
        }, 66);
      return;
    }
    this.#ambientFrame = browser.requestAnimationFrame(() => {
      this.#ambientFrame = null;
      this.#draw();
      this.#syncAmbientFrame();
    });
  }

  #cancelAmbientFrame(): void {
    if (this.#ambientFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#ambientFrame);
    this.#ambientFrame = null;
    if (this.#blizzardTimer !== null)
      this.#document.defaultView?.clearTimeout(this.#blizzardTimer);
    this.#blizzardTimer = null;
  }

  #now(): number {
    return this.#document.defaultView?.performance.now() ?? Date.now();
  }
}

type ShotStepV7 = Extract<
  CorePresentationStepV7,
  { readonly kind: "MELEE" | "RANGED" | "CATAPULT" }
>;

/**
 * A broadside's shell and splash cells (bead pulp_wars-eu3r.4), and a
 * gumball's ricochet (the Candy redesign, bead pulp_wars-jdb.14).
 */
type BroadsideFeedbackV7 = Pick<
  AttackFeedbackV7,
  "shell" | "splash" | "ricochet"
>;

function broadsideOf(step: ShotStepV7): BroadsideFeedbackV7 {
  return {
    ...(step.shell === undefined ? {} : { shell: step.shell }),
    ...(step.splash === undefined ? {} : { splash: step.splash }),
    ...(step.ricochet === undefined ? {} : { ricochet: step.ricochet }),
  };
}

/**
 * The Candy redesign (section 14): how high a hopping Chocolate Bunny rises
 * over the jumped tile, in tiles.
 */
export const HOP_LIFT_TILES_V7 = 0.55;

/** The attack cue of a shot step (bead pulp_wars-b5f.5), or null. */
function attackEffectOf(step: CorePresentationStepV7): AttackEffectIdV7 | null {
  return (step.kind === "RANGED" || step.kind === "CATAPULT") &&
    step.attackEffect !== undefined
    ? step.attackEffect
    : null;
}

/** The effects-overlay cue of a Cult presentation step at `progress`. */
function cultFeedbackOf(
  step: Extract<CorePresentationStepV7, { readonly kind: "CULT" }>,
  progress: number,
): CultFeedbackV7 {
  return {
    effect: step.effect,
    cells: step.cells,
    ...(step.from === undefined ? {} : { from: step.from }),
    progress,
  };
}

/** The effects-overlay cue of a Candy presentation step at `progress`. */
function candyFeedbackOf(
  step: Extract<CorePresentationStepV7, { readonly kind: "CANDY" }>,
  progress: number,
): CandyFeedbackV7 {
  return {
    effect: step.effect,
    cells: step.cells,
    ...(step.from === undefined ? {} : { from: step.from }),
    ...(step.amount === undefined ? {} : { amount: step.amount }),
    ...(step.amounts === undefined ? {} : { amounts: step.amounts }),
    ...(step.source === undefined ? {} : { source: step.source }),
    progress,
  };
}

/** The effects-overlay cue of a Dwarf presentation step at `progress`. */
function dwarfFeedbackOf(
  step: Extract<CorePresentationStepV7, { readonly kind: "DWARF" }>,
  progress: number,
): DwarfFeedbackV7 {
  return {
    effect: step.effect,
    cells: step.cells,
    ...(step.from === undefined ? {} : { from: step.from }),
    progress,
  };
}

/** The effects-overlay cue of an Ice Folk presentation step at `progress`. */
function iceFolkFeedbackOf(
  step: Extract<CorePresentationStepV7, { readonly kind: "ICE_FOLK" }>,
  progress: number,
): IceFolkFeedbackV7 {
  return {
    effect: step.effect,
    cells: step.cells,
    ...(step.from === undefined ? {} : { from: step.from }),
    ...(step.hits === undefined ? {} : { hits: step.hits }),
    ...(step.unitId === undefined ? {} : { unitId: step.unitId }),
    ...(step.fromColour === undefined ? {} : { fromColour: step.fromColour }),
    ...(step.toColour === undefined ? {} : { toColour: step.toColour }),
    progress,
  };
}

/** The effects-overlay cue of a Martian presentation step at `progress`. */
function martianFeedbackOf(
  step: Extract<CorePresentationStepV7, { readonly kind: "MARTIAN" }>,
  progress: number,
): MartianFeedbackV7 {
  return {
    effect: step.effect,
    cells: step.cells,
    ...(step.from === undefined ? {} : { from: step.from }),
    ...(step.pierce === undefined ? {} : { pierce: step.pierce }),
    ...(step.fullPower === true ? { fullPower: true } : {}),
    progress,
  };
}

function localPoint(canvas: HTMLCanvasElement, event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function pinchState(
  points: readonly Point[],
): { readonly distance: number; readonly midpoint: Point } | null {
  const first = points[0];
  const second = points[1];
  if (first === undefined || second === undefined) return null;
  return {
    distance: Math.hypot(second.x - first.x, second.y - first.y),
    midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
  };
}
function same(a: CoordV7, b: CoordV7): boolean {
  return a.x === b.x && a.y === b.y;
}
/** Human units keep their revision-12 names; Undead units use their own. */
function unitName(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): string {
  return boardUnitNameV7(view, unit);
}

/** The name the board's cursor reads for a visible unit. */
export function boardUnitNameV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): string {
  // Bead pulp_wars-mch9.26: a frog (on land) by what it is drawn as, with
  // what it was: "Frog (Human Knight)".
  const own = ownBoardUnitNameV7(view, unit);
  return unit.form === "LAND" && unitIsFrogV7(view, unit)
    ? frogNameV7(own)
    : own;
}
/** The name of a visible unit's own kind (a frog's: what it was). */
function ownBoardUnitNameV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): string {
  // A neutral unit by its own name, never its mechanical role: the Giant
  // Spider, a camp guard, Bigfoot, and (bead pulp_wars-mch9.18) an Unbound
  // daemon: "Unbound Horror".
  if (isMonsterUnitV7(unit))
    return neutralUnitLabelV7(neutralBreedOfUnitV7(view, unit));
  // The giants' signatures (`pulp_wars-w49.32`): a Gingerbread Man by its
  // own name (a Toffee Trooper in every rule).
  if (unit.variant === "GINGERBREAD_MAN")
    return `Candy ${GINGERBREAD_MAN_LABEL_V7}`;
  if (unitIsUndeadV7(view, unit))
    return `Undead ${unitRoleRuleV7(view, unit).label}`;
  if (unitIsGoblinV7(view, unit))
    return `Goblin ${unitRoleRuleV7(view, unit).label}`;
  // Revision 19: Dinosaur units by their own names; an Egg with its
  // countdown.
  if (unitIsDinosaurV7(view, unit)) {
    const turns = eggTurnsRemainingV7(view, unit.id);
    return `Dinosaur ${unitDisplayNameV7(view, unit)}${
      unit.form === "EGG" && turns !== null
        ? ` (${eggCountdownTextV7(turns)})`
        : ""
    }`;
  }
  // The Mind Control revision: the Martian, Ice Folk and Dwarf kinds by
  // their own names too (a controlled Yeti is a Yeti, a Brain a Brain).
  const faction = unitFactionV7(view, unit);
  if (faction === "MARTIAN" || faction === "ICE_FOLK" || faction === "DWARF")
    return `${faction === "MARTIAN" ? "Martian" : faction === "ICE_FOLK" ? "Ice Folk" : "Dwarf"} ${unitRoleRuleV7(view, unit).label}`;
  // The Cultists (bead pulp_wars-mch9.17): likewise (a Summoner, not a
  // Captain, is what a Sacrifice or a Seizure is aimed from).
  if (faction === "CULT") return `Cult ${unitRoleRuleV7(view, unit).label}`;
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the heavy line role by its
  // unit's name (the Human Champion, the Candy Jawbreaker), not its role ID.
  return unit.role === "SWORDSMAN"
    ? unitRoleRuleV7(view, unit).label
    : title(unit.role);
}
const NO_HELD_UNITS: ReadonlyMap<number, CoordV7> = new Map();
/**
 * Revision 19: where each unit with a later slide in `steps` waits: the
 * start of its next `MOVE` step after `index`.
 */
function heldUnitsAfterV7(
  steps: readonly CorePresentationStepV7[],
  index: number,
): ReadonlyMap<number, CoordV7> {
  const held = new Map<number, CoordV7>();
  for (let later = steps.length - 1; later > index; later -= 1) {
    const step = steps[later];
    if (step?.kind !== "MOVE") continue;
    const start = step.path[0];
    if (start !== undefined) held.set(step.unitId, start);
  }
  return held;
}
/**
 * Revision 19 sprite cues of a Dinosaur step at `progress` (0 to 1): a laid
 * Egg pops in with one small bounce, a hatching Egg wobbles twice before
 * its hatchling grows from x0.6, and a grown unit pulses to x1.2 and
 * settles. Other cues move no sprite.
 */
export function dinosaurUnitPulsesV7(
  step: Extract<CorePresentationStepV7, { readonly kind: "DINOSAUR" }>,
  progress: number,
  zoom: number,
): readonly UnitPulseV7[] {
  const pulse = (): Omit<UnitPulseV7, "unitId"> | null => {
    if (step.effect === "EGG_LAID")
      return {
        scale:
          progress < 0.6
            ? 0.6 + 0.55 * (progress / 0.6)
            : 1.15 - 0.15 * ((progress - 0.6) / 0.4),
      };
    if (step.effect === "GROW")
      return { scale: 1 + 0.2 * Math.sin(Math.PI * progress) };
    if (step.effect === "HATCH")
      return progress < 0.45
        ? {
            scale: 1,
            offsetXCssPx:
              Math.sin((progress / 0.45) * Math.PI * 4) * 4.8 * zoom,
          }
        : { scale: 0.6 + 0.4 * ((progress - 0.45) / 0.55) };
    return null;
  };
  const value = pulse();
  return value === null
    ? []
    : step.unitIds.map((unitId) => ({ unitId, ...value }));
}
/** Pixel wheel delta for one CHIBI zoom step (one ordinary mouse notch). */
const CHIBI_WHEEL_STEP_DELTA = 50;
const NO_COMMANDS: readonly BoardHostModelV7["offeredCommands"][number][] = [];
const title = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
let nextDescriptionIdV7 = 1;

/**
 * Whether `context` can lay an offscreen canvas over the board (bead
 * pulp_wars-2yc.62); a stand-in context without these methods cannot.
 */
function canCompositeV7(context: CanvasRenderingContext2D): boolean {
  const methods = context as unknown as Record<string, unknown>;
  return ["save", "restore", "setTransform", "drawImage"].every(
    (name) => typeof methods[name] === "function",
  );
}

/** Which game state a drawn view shows: its match and command index. */
function drawnKeyV7(
  matchInstanceId: BoardHostModelV7["matchInstanceId"],
  view: PlayerViewV7,
): string {
  return `${String(matchInstanceId)}:${view.commandIndex}`;
}
