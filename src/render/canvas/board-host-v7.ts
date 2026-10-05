import {
  unitFactionV7,
  unitRoleRuleV7,
  type CoordV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
} from "../../engine/index";
import {
  afflictionCursorCueV7,
  unitIsUndeadV7,
} from "../undead-presentation-v7";
import { unitIsGoblinV7 } from "../goblin-presentation-v7";
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
import { DINOSAUR_CUE_COLORS_V7 } from "./dinosaur-canvas-v7";
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
import { moundAtV7, moundInfoLinesV7 } from "../dwarf-presentation-v7";
import {
  CANDY_EFFECT_SUBJECTS_V7,
  candyReducedMotionProgressV7,
  drawCandyFeedbackV7,
  type CandyFeedbackV7,
} from "./candy-effects-v7";
import { CRASHED_SPRITE_SATURATION_V7 } from "./candy-canvas-v7";
import { candyCursorCueV7 } from "./candy-board-plan-v7";
import {
  crumbsTileLinesV7,
  matchHasCandySeatV7,
} from "../candy-presentation-v7";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  boardWorldBounds,
  cellWorldBounds,
  centerCameraOn,
  fitCamera,
  frameCameraOnArea,
  panCamera,
  panToFrameArea,
  pickGridTile,
  projectGrid,
  screenToWorld,
  worldToScreen,
  zoomCameraAt,
  type CameraState,
  type Point,
  type ScreenBand,
  type Size,
} from "./geometry";
import {
  buildBoardRenderPlanV7,
  createBoardImageResolverV7,
  drawBoardV7,
  type BoardImageResolverV7,
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
  archerProjectileEndpoints,
  arrowGeometry,
} from "./combat-presentation";
import { BoardGlowCacheV7 } from "./glow-cache-v7";
import type { ArtSetV7 } from "../../assets/chibi-art-v7";
import {
  browserChibiRasterEnvironmentV7,
  createChibiArtResolverV7,
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
  createSpriteSaturationCacheV7,
  type BoardSaturationV7,
  type SpriteSaturationCacheV7,
} from "./sprite-saturation-v7";
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
} from "../curiosity-presentation-v7";

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
  /** Presentation-only art set; omitted means LEGACY. */
  readonly artSet?: ArtSetV7;
  /**
   * Developer experiment (pulp_wars-x6c): building and city saturation in
   * percent. Omitted, or 100, draws exactly as without it.
   */
  readonly saturation?: BoardSaturationV7;
  /**
   * The visual direction of the CHIBI art set (pulp_wars-3tq.6: the app
   * passes the live direction by default). Omitted draws the classic look,
   * exactly as before the direction existed; the LEGACY set ignores it.
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
}

export interface BoardHostCallbacksV7 {
  readonly onSelection: (selection: BoardSelectionV7 | null) => void;
  readonly onCommand: (target: MapCommandTargetV7) => void;
}

export interface BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void;
  update(model: BoardHostModelV7): void;
  activate(at: CoordV7): void;
  resetInspectionCycle?(): void;
  zoom(direction: "IN" | "OUT"): void;
  focus(): void;
  presentBoundary?(
    before: PlayerViewV7,
    after: PlayerViewV7,
    events: PlayerEventEnvelopeV7,
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
  destroy(): void;
}

export class CanvasBoardHostV7 implements BoardHostV7 {
  readonly #document: Document;
  readonly #images: BoardImageResolverV7;
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
  #canvas: HTMLCanvasElement | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #effectsCanvas: HTMLCanvasElement | null = null;
  #effectsContext: CanvasRenderingContext2D | null = null;
  #description: HTMLElement | null = null;
  #callbacks: BoardHostCallbacksV7 | null = null;
  #model: BoardHostModelV7 | null = null;
  #viewport: Size = { width: 1024, height: 640 };
  #camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
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
  #animatedUnit: { readonly id: number; readonly at: CoordV7 } | null = null;
  #animationFrame: number | null = null;
  #animationResolve: (() => void) | null = null;
  #presentationToken = 0;
  #stepListener: ((cue: PresentationStepCueV7) => void) | null = null;
  #cameraFollowAllowed = false;
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
  readonly #mountainArt: { resolve(): ChibiMassifArtV7 | null };
  /** EXPERIMENT pulp_wars-2o7.4: undefined with the switch off. */
  readonly #factionGrassArt?: { resolve(): FactionGrassArtV7 | null };
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
    } = {},
  ) {
    this.#document = documentRoot;
    this.#glowCache = new BoardGlowCacheV7(documentRoot);
    this.#images = createBoardImageResolverV7(documentRoot, () => {
      this.#glowCache.clear();
      this.#draw();
    });
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
    )
      this.finishPresentations();
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
    const key = `${String(model.matchInstanceId)}:${model.view.board.width}x${model.view.board.height}:${this.#artSet()}`;
    if (this.#boardKey !== key) {
      this.#boardKey = key;
      const chibi = this.#artSet() === "CHIBI";
      const fitted = chibi
        ? fitChibiCamera(model.view.board, this.#viewport)
        : fitCamera(model.view.board, this.#viewport);
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
        board: chibi
          ? chibiBoardWorldBounds(model.view.board)
          : boardWorldBounds(model.view.board.width, model.view.board.height),
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
   * motion jumps, full motion eases for a moment.
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
    // The naval branch interface: an aimed Board likewise, and (the
    // frozen sea) an aimed Freeze.
    const navalPick =
      model.interaction.navalPick ?? model.interaction.freezePick ?? null;
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
    this.#panCameraTo(panCamera(this.#camera, delta), model.motion === "FULL");
  }

  #panCameraTo(target: CameraState, animate: boolean): void {
    this.#cancelCameraPan();
    const browser = this.#document.defaultView;
    if (
      !animate ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    ) {
      this.#camera = target;
      return;
    }
    const start = this.#camera;
    const startedAt = this.#now();
    const step = (): void => {
      const progress = Math.min(1, (this.#now() - startedAt) / 180);
      const eased = 1 - (1 - progress) * (1 - progress);
      this.#camera = {
        ...start,
        offsetX: start.offsetX + (target.offsetX - start.offsetX) * eased,
        offsetY: start.offsetY + (target.offsetY - start.offsetY) * eased,
      };
      this.#draw();
      this.#cameraPanFrame =
        progress < 1 ? browser.requestAnimationFrame(step) : null;
    };
    this.#cameraPanFrame = browser.requestAnimationFrame(step);
  }

  #cancelCameraPan(): void {
    if (this.#cameraPanFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#cameraPanFrame);
    this.#cameraPanFrame = null;
  }

  activate(at: CoordV7): void {
    this.#focused = at;
    const serial = this.#drawSerial;
    this.#activate(at);
    this.#describe();
    if (serial === this.#drawSerial) this.#draw();
  }

  zoom(direction: "IN" | "OUT"): void {
    this.#cameraFollowAllowed = false;
    this.#cancelCameraPan();
    if (this.#artSet() === "CHIBI") {
      this.#camera = zoomChibiCameraAt(
        this.#camera,
        adjacentChibiZoomStep(chibiZoomStepForCamera(this.#camera), direction),
        { x: this.#viewport.width / 2, y: this.#viewport.height / 2 },
      );
      this.#draw();
      return;
    }
    const factor = direction === "IN" ? 1.2 : 1 / 1.2;
    this.#camera = zoomCameraAt(
      this.#camera,
      Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.#camera.zoom * factor)),
      { x: this.#viewport.width / 2, y: this.#viewport.height / 2 },
    );
    this.#draw();
  }

  focus(): void {
    this.#canvas?.focus();
  }

  resetInspectionCycle(): void {
    this.#inspectionCycle = null;
  }

  destroy(): void {
    this.finishPresentations();
    this.#detach();
    this.#model = null;
    this.#planCache.length = 0;
    this.#glowCache.clear();
  }

  finishPresentations(redraw = true): void {
    this.#cameraFollowAllowed = false;
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
    this.#martianFeedback = null;
    this.#pinnedMartianFeedback = [];
    this.#iceFolkFeedback = null;
    this.#pinnedIceFolkFeedback = [];
    this.#iceFolkShatter = null;
    this.#dwarfFeedback = null;
    this.#pinnedDwarfFeedback = [];
    this.#candyFeedback = null;
    this.#pinnedCandyFeedback = [];
    this.#unitPulses = [];
    this.#heldUnits = new Map();
    this.#drawSupportOverlay();
    this.#crossfade = null;
    this.#selectionJump = null;
    const resolve = this.#animationResolve;
    this.#animationResolve = null;
    resolve?.();
    if (redraw) this.#draw();
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
  ): Promise<void> {
    this.finishPresentations(false);
    this.#cancelAmbientFrame();
    const token = this.#presentationToken;
    this.#inspectionCycle = null;
    const model = this.#model;
    if (model === null) return;
    const steps = corePresentationPlanV7(before, envelope, after);
    if (steps.length === 0) return;
    this.#cameraFollowAllowed = this.#pointers.size === 0;
    const durationScale = model.animationSpeed === "FAST" ? 0.5 : 1;
    this.#presentedView = before;
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
      // Reduced motion frames the final public location once, without travel.
      const focus = [...steps]
        .reverse()
        .find(
          (step) =>
            step.kind === "BUILD" ||
            (step.kind === "MOVE" && step.followCamera),
        );
      const at =
        focus?.kind === "BUILD"
          ? focus.at
          : focus?.kind === "MOVE"
            ? focus.path.at(-1)
            : undefined;
      if (at !== undefined) this.#followCamera(at);
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
        candySteps.length > 0
      ) {
        this.#presentedView = after;
        this.#draw();
        // Bead pulp_wars-b5f.5: each attack cue holds one frame, the shot
        // close to its target with its trail, before the cues it causes.
        for (const step of attackSteps) {
          const effect = attackEffectOf(step);
          if (effect === null) continue;
          announce(step);
          this.#attackFeedback = this.#attackFeedbackOf(
            effect,
            step.from,
            step.to,
            attackReducedMotionProgressV7(effect),
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
          if (step.followCamera === true && step.cells[0] !== undefined)
            this.#followCamera(step.cells[0]);
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
          if (step.followCamera === true && step.cells[0] !== undefined)
            this.#followCamera(step.cells[0]);
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
          if (step.followCamera === true && step.cells[0] !== undefined)
            this.#followCamera(step.cells[0]);
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
          if (step.followCamera === true && step.cells[0] !== undefined)
            this.#followCamera(step.cells[0]);
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
        // The Candy revision: each Candy cue holds one still frame where it
        // reads (a Sugar Toss its "+n", the swirl settled).
        for (const step of candySteps) {
          announce(step);
          if (step.followCamera === true && step.cells[0] !== undefined)
            this.#followCamera(step.cells[0]);
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
          if (step.followCamera === true) this.#followCamera(step.actor.at);
          const hold =
            step.effect === "REGENERATE" ||
            // Map curiosities: the still "+N" of a Fountain, a Wreck or a
            // bounty, and the blessing's star, hold as long.
            step.effect === "FOUNTAIN" ||
            step.effect === "BLESSING" ||
            step.effect === "SALVAGE" ||
            step.effect === "BOUNTY"
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
            candySteps.length ===
          steps.length
        ) {
          this.#presentedView = null;
          this.#draw();
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
      this.#presentedView = null;
      this.#draw();
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
      announce(step);
      if (step.kind === "MOVE") {
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
        await this.#animatePath(
          step.unitId,
          step.path,
          step.durationMs * durationScale,
          step.followCamera === true,
        );
        if (token !== this.#presentationToken) return;
        this.#animatedUnit = null;
        this.#presentedView = after;
      } else if (step.kind === "DINOSAUR") {
        const first = step.cells[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first);
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
        const first = step.cells[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first);
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
        const first = step.cells[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first);
        // A Shatter shows the defender cased in ice, cracking, until it
        // bursts (ICE_FOLK.md timeline); every other cue shows the result
        // (the Chill markers appear as the frost forms).
        const shatter = step.effect === "SHATTER" && step.unitId !== undefined;
        this.#presentedView = shatter ? before : after;
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
        const first = step.cells[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first);
        // An eruption shows the mound until the Mole and its rider are back
        // (DWARF_ERUPTION_TIMELINE_V7.surface); every other cue shows the
        // result (the mound, the bombed target, the new Gunner).
        const eruption = step.effect === "ERUPTION";
        this.#presentedView = eruption ? before : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#dwarfFeedback = dwarfFeedbackOf(step, progress);
          if (
            eruption &&
            this.#presentedView !== after &&
            eruptionCueV7(progress * DWARF_EFFECT_DURATIONS_V7.ERUPTION)
              .surfaced
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
        const first = step.cells[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first);
        this.#presentedView = after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#candyFeedback = candyFeedbackOf(step, progress);
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#candyFeedback = null;
        this.#drawSupportOverlay();
      } else if (step.kind === "BUILD") {
        this.#followCamera(step.at);
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
        this.#presentedView = after;
        if (step.followCamera === true) this.#followCamera(step.actor.at);
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
        const first = step.blasts[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first.at);
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
    this.#animatedUnit = null;
    this.#heldUnits = NO_HELD_UNITS;
    this.#presentedView = null;
    this.#draw();
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
      this.#camera = centerCameraOn(this.#camera, priorCenter, this.#viewport);
    this.#glowCache.clear();
    this.#draw();
  }

  #planFor(
    view: PlayerViewV7,
    commands: BoardHostModelV7["offeredCommands"],
  ): BoardRenderPlanV7 {
    const model = this.#model;
    if (model === null) throw new Error("Board plan requires a mounted model");
    const interaction = {
      ...model.interaction,
      cursor: model.showCursor === false ? null : this.#focused,
    };
    const interactionKey = JSON.stringify(interaction);
    const cached = this.#planCache.find(
      (item) =>
        item.view === view &&
        item.commands === commands &&
        item.interactionKey === interactionKey,
    );
    if (cached !== undefined) return cached.plan;
    const plan = buildBoardRenderPlanV7(view, commands, interaction);
    if (this.#planCache.length === 2) this.#planCache.shift();
    this.#planCache.push({ view, commands, interactionKey, plan });
    return plan;
  }

  #artSet(): ArtSetV7 {
    return this.#model?.artSet ?? "LEGACY";
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

  /** Public diagnostics for the art set and its exact cell size. */
  #syncArtSetDataset(): void {
    const canvas = this.#canvas;
    if (canvas === null) return;
    const artSet = this.#artSet();
    const tile = String(chibiTileCssPx(this.#camera));
    const step =
      artSet === "CHIBI" ? String(chibiZoomStepForCamera(this.#camera)) : null;
    if (canvas.dataset.artSet !== artSet) canvas.dataset.artSet = artSet;
    if (canvas.dataset.tileCssPx !== tile) canvas.dataset.tileCssPx = tile;
    if (step === null) delete canvas.dataset.zoomStep;
    else if (canvas.dataset.zoomStep !== step) canvas.dataset.zoomStep = step;
  }

  #draw(): void {
    const model = this.#model;
    this.#syncArtSetDataset();
    this.#requestEffectArt();
    const context = this.#context;
    if (model === null || context === null) return;
    this.#drawSerial += 1;
    const now = this.#now();
    const jump = this.#selectionJump;
    // Preview labels stay clear of the HUD and the open dock (the band the
    // start-camera framing uses); measured only when a preview is offered.
    const labelSafeArea =
      this.#presentedView === null && model.offeredCommands.length > 0
        ? this.#unobscuredBand()
        : null;
    const renderView = (
      view: PlayerViewV7,
      clear: boolean,
      sceneAlpha: number,
    ): void => {
      const plan = this.#planFor(
        view,
        this.#presentedView === null ? model.offeredCommands : NO_COMMANDS,
      );
      const animated = this.#animatedUnit;
      const held = this.#heldUnits;
      const presented =
        animated === null && held.size === 0
          ? plan
          : {
              ...plan,
              entries: plan.entries.map((entry) => {
                if (entry.kind !== "UNIT") return entry;
                if (animated !== null && entry.key === `unit:${animated.id}`)
                  return { ...entry, at: animated.at };
                const hold = held.get(Number(entry.key.slice(5)));
                return hold === undefined ? entry : { ...entry, at: hold };
              }),
            };
      drawBoardV7({
        context,
        viewport: this.#viewport,
        devicePixelRatio: this.#document.defaultView?.devicePixelRatio ?? 1,
        camera: this.#camera,
        plan: presented,
        images: this.#images,
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
        artSet: this.#artSet(),
        chibiArt: this.#chibiArt,
        ...(model.saturation === undefined
          ? {}
          : {
              saturation: {
                levels: model.saturation,
                cache: this.#saturationCache,
              },
            }),
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
        forestArt: this.#forestArt,
        mountainArt: this.#mountainArt,
        ...(this.#factionGrassArt === undefined
          ? {}
          : { factionGrassArt: this.#factionGrassArt }),
        // The Candy revision: a Crashed unit's faded sprite.
        candyDroop: (image) =>
          this.#candyDroopCache.resolve(image, CRASHED_SPRITE_SATURATION_V7),
        // The Mind Control revision: the control halo's pulse (static for
        // reduced motion).
        controlPulseTimeMs: model.motion === "REDUCED" ? 0 : now,
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
    if (this.#crossfade !== null) {
      renderView(this.#crossfade.before, true, 1 - this.#crossfade.progress);
      renderView(this.#crossfade.after, false, this.#crossfade.progress);
    } else renderView(this.#presentedView ?? model.view, true, 1);
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
    this.#drawSupportOverlay();
  }

  /**
   * CHIBI effect rasters for the support cues (bead pulp_wars-vkq.14), or
   * null in LEGACY. Asking for every subject once starts their loads, so the
   * first Undead cue of a game usually finds its sprite ready; a sprite
   * still loading draws the code cue for that frame.
   */
  #supportEffectArt(): SupportEffectArtV7 | null {
    if (this.#artSet() !== "CHIBI") return null;
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

  /** Starts loading the CHIBI effect rasters once, before the first cue. */
  #requestEffectArt(): void {
    if (this.#effectArtRequested || this.#artSet() !== "CHIBI") return;
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
      ),
    );
    this.#drawSupportOverlay();
  }

  /** An attack cue at `progress`, in the look's Undead accent. */
  #attackFeedbackOf(
    effect: AttackEffectIdV7,
    from: CoordV7,
    to: CoordV7,
    progress: number,
  ): AttackFeedbackV7 {
    return {
      effect,
      from,
      to,
      progress,
      ...(this.#model?.visualDirection?.undeadAccent === "VIOLET"
        ? { undeadViolet: true }
        : {}),
      // LEGACY draws its stand-in units at a larger zoom.
      ...(this.#artSet() === "CHIBI" ? {} : { scale: 1 }),
    };
  }

  #drawSupportOverlay(): void {
    const context = this.#effectsContext;
    const canvas = this.#effectsCanvas;
    if (context === null || canvas === null) return;
    const dpr = this.#document.defaultView?.devicePixelRatio ?? 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, this.#viewport.width, this.#viewport.height);
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
    if (this.#inspectionCycle !== null && !same(this.#inspectionCycle.at, at))
      this.#inspectionCycle = null;
    const plan = this.#planFor(model.view, model.offeredCommands);
    const target = plan.targets.find((candidate) => same(candidate.at, at));
    if (target !== undefined && model.interactive) {
      this.#callbacks?.onCommand(target);
      return;
    }
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
    const actions = this.#planFor(model.view, model.offeredCommands)
      .targets.filter((target) => same(target.at, at))
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
        (interaction.martianPick ?? null) !== null ||
        (interaction.iceFolkPick ?? null) !== null ||
        (interaction.navalPick ?? null) !== null ||
        (interaction.freezePick ?? null) !== null ||
        (interaction.layEgg ?? null) !== null);
    this.#description.textContent = [
      aimed ? actions.join(", ") : "",
      title(tile.terrain),
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
      city === undefined
        ? ""
        : `${city.isCapital ? "Capital" : "City"} level ${city.level}`,
      unit === undefined
        ? ""
        : [
            `${unitName(model.view, unit)}, ${unit.hp} of ${unit.maxHp} HP`,
            afflictionCursorCueV7(model.view, unit.id),
            // The Candy revision: Rushed, Crashed and Splatted, said.
            candyCursorCueV7(model.view, unit),
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
    this.#cameraFollowAllowed = false;
    this.#cancelCameraPan();
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
        this.#camera = panCamera(this.#camera, {
          x: current.midpoint.x - prior.midpoint.x,
          y: current.midpoint.y - prior.midpoint.y,
        });
        const start = this.#pinchStart;
        if (this.#artSet() !== "CHIBI")
          this.#camera = zoomCameraAt(
            this.#camera,
            Math.max(
              MIN_ZOOM,
              Math.min(
                MAX_ZOOM,
                this.#camera.zoom * (current.distance / prior.distance),
              ),
            ),
            current.midpoint,
          );
        else if (start !== null && start.distance > 0) {
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
        this.#draw();
      }
      this.#pinch = current;
      return;
    }
    if (this.#pointer?.id !== event.pointerId) return;
    const dx = next.x - this.#pointer.current.x;
    const dy = next.y - this.#pointer.current.y;
    if (
      Math.hypot(
        next.x - this.#pointer.start.x,
        next.y - this.#pointer.start.y,
      ) > 6
    ) {
      this.#camera = panCamera(this.#camera, { x: dx, y: dy });
      this.#draw();
    }
    this.#pointer.current = next;
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
    const splashAt = (cell: CoordV7 | null): boolean =>
      cell !== null &&
      this.#planFor(model.view, model.offeredCommands).targets.some(
        (target) =>
          (target.splash !== undefined || target.blast !== undefined) &&
          same(target.at, cell),
      );
    if (splashAt(prior) || splashAt(at)) this.#draw();
  }
  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#pointers.delete(event.pointerId);
    this.#pointer = null;
    this.#pinch = null;
    this.#pinchStart = null;
  };
  readonly #onWheel = (event: WheelEvent): void => {
    this.#cameraFollowAllowed = false;
    event.preventDefault();
    const canvas = this.#canvas;
    if (canvas === null) return;
    if (this.#artSet() === "CHIBI") {
      // Accumulate trackpad deltas so one wheel notch moves one discrete step.
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 800 : 1;
      const delta = event.deltaY * unit;
      if (Math.sign(delta) !== Math.sign(this.#wheelDelta))
        this.#wheelDelta = 0;
      this.#wheelDelta += delta;
      if (Math.abs(this.#wheelDelta) < CHIBI_WHEEL_STEP_DELTA) return;
      const direction = this.#wheelDelta < 0 ? "IN" : "OUT";
      this.#wheelDelta = 0;
      this.#camera = zoomChibiCameraAt(
        this.#camera,
        adjacentChibiZoomStep(chibiZoomStepForCamera(this.#camera), direction),
        localPoint(canvas, event),
      );
      this.#draw();
      return;
    }
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.#camera = zoomCameraAt(
      this.#camera,
      Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.#camera.zoom * factor)),
      localPoint(canvas, event),
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
      (interaction.martianPick ?? null) !== null ||
      (interaction.iceFolkPick ?? null) !== null ||
      (interaction.navalPick ?? null) !== null ||
      (interaction.freezePick ?? null) !== null ||
      (interaction.layEgg ?? null) !== null;
    if (!aimed && !model.interactive) return [];
    const cells = new Map<string, CoordV7>();
    for (const target of this.#planFor(model.view, model.offeredCommands)
      .targets)
      if (aimed || targetIsSteppedV7(target.family))
        cells.set(`${target.at.x},${target.at.y}`, target.at);
    return [...cells.values()].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    );
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const model = this.#model;
    if (model === null) return;
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
      this.#cameraFollowAllowed = false;
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
    this.#cameraFollowAllowed = false;
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
      this.#camera = panCamera(this.#camera, { x: dx, y: dy });
  }

  #detach(): void {
    this.#cancelCameraPan();
    if (this.#animationFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = null;
    this.#cancelAmbientFrame();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    const canvas = this.#canvas;
    if (canvas !== null) {
      canvas.removeEventListener("pointerdown", this.#onPointerDown);
      canvas.removeEventListener("pointermove", this.#onPointerMove);
      canvas.removeEventListener("pointerup", this.#onPointerUp);
      canvas.removeEventListener("pointercancel", this.#onPointerCancel);
      canvas.removeEventListener("pointerleave", this.#onPointerLeave);
      canvas.removeEventListener("wheel", this.#onWheel);
      canvas.removeEventListener("keydown", this.#onKeyDown);
    }
    this.#canvas = null;
    this.#context = null;
    this.#effectsCanvas = null;
    this.#effectsContext = null;
    this.#description = null;
    this.#callbacks = null;
    this.#pointers.clear();
    this.#pointer = null;
    this.#hovered = null;
    this.#pinch = null;
    this.#pinchStart = null;
    this.#wheelDelta = 0;
    this.#selectionJump = null;
    this.#readinessKey = null;
  }

  async #animatePath(
    unitId: number,
    path: readonly CoordV7[],
    duration: number,
    followCamera = false,
  ): Promise<void> {
    const first = path[0];
    if (first === undefined) return;
    if (followCamera) {
      this.#animatedUnit = { id: unitId, at: first };
      this.#followCamera(first);
      this.#draw();
    }
    await this.#animate(duration, (progress) => {
      if (path.length === 1) {
        this.#draw();
        return;
      }
      const scaled = progress * (path.length - 1);
      const index = Math.min(path.length - 2, Math.floor(scaled));
      const from = path[index];
      const to = path[index + 1];
      if (from === undefined || to === undefined) return;
      const local = scaled - index;
      this.#animatedUnit = {
        id: unitId,
        at: {
          x: from.x + (to.x - from.x) * local,
          y: from.y + (to.y - from.y) * local,
        },
      };
      if (followCamera) this.#followCamera(this.#animatedUnit.at);
      this.#draw();
    });
  }

  #followCamera(at: CoordV7): void {
    if (!this.#cameraFollowAllowed) return;
    this.#camera = centerCameraOn(
      this.#camera,
      projectGrid(at),
      this.#viewport,
    );
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
      this.#attackFeedback = this.#attackFeedbackOf(effect, from, to, progress);
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
    return new Promise((resolve) => {
      let started = browser.performance.now();
      let pausedAt: number | null = null;
      this.#animationResolve = resolve;
      const frame = (now: number): void => {
        if (this.#model?.presentationPaused) {
          pausedAt ??= now;
          this.#animationFrame = browser.requestAnimationFrame(frame);
          return;
        }
        if (pausedAt !== null) {
          started += now - pausedAt;
          pausedAt = null;
        }
        const progress = Math.min(1, (now - started) / duration);
        update(1 - Math.pow(1 - progress, 3));
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
      model.view.units.some(
        (unit) =>
          unit.ownerId === model.view.viewer.id &&
          !unit.activation.handled &&
          model.offeredCommands.some(
            (command) => command.kind === "MOVE" && command.unitId === unit.id,
          ),
      );
    const jump = this.#selectionJump;
    const jumping =
      jump !== null &&
      this.#now() - jump.startedAt <
        selectionJumpDurationMs(model.animationSpeed);
    if (!ready && !jumping) {
      if (!jumping) this.#selectionJump = null;
      // The Ice Folk revision: a visible Blizzard keeps its flakes falling
      // with a calm redraw about fifteen times a second (full motion only);
      // the Mind Control revision: so does a visible controlled unit's halo.
      if (
        model.motion === "FULL" &&
        (model.view.board.tiles.some(
          (tile) => tile.explored && tile.blizzard === true,
        ) ||
          (model.view.mindControlled ?? []).length > 0) &&
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

/** The attack cue of a shot step (bead pulp_wars-b5f.5), or null. */
function attackEffectOf(step: CorePresentationStepV7): AttackEffectIdV7 | null {
  return (step.kind === "RANGED" || step.kind === "CATAPULT") &&
    step.attackEffect !== undefined
    ? step.attackEffect
    : null;
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
  return title(unit.role);
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
