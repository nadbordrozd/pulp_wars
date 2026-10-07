import type { CommandV7, CoordV7, PlayerViewV7 } from "../../engine/index";
import {
  promotionReadyUnitIdsV7,
  type FeedbackPlanV7,
} from "../feedback-plan-v7";
import {
  createSpentSpriteCacheV7,
  drawGroundRingV7,
  drawPopulationIconV7,
  drawPromotionMarkerV7,
  drawSparkleBurstV7,
  promotionMarkerSizeCssPxV7,
  type BoardFeedbackFrameV7,
  type SpentSpriteCacheV7,
} from "./feedback-canvas-v7";
import {
  CITY_HOP_AMPLITUDE_CSS_PX_V7,
  CITY_HOP_MS_V7,
  LEVEL_UP_RING_MS_V7,
  POPULATION_HOP_MS_V7,
  POPULATION_ICON_CAP_V7,
  POPULATION_STAGGER_MS_V7,
  PROMOTION_CELEBRATION_MS_V7,
  PROMOTION_FLOURISH_MS_V7,
  PROMOTION_HOP_AMPLITUDE_CSS_PX_V7,
  PROMOTION_HOP_MS_V7,
  PROMOTION_MARKER_POP_MS_V7,
  easeOutBackV7,
  feedbackPulseV7,
  heldCityMeterV7,
  hopOffsetCssPxV7,
  populationHopFrameV7,
  populationHopHeightV7,
  populationIconPlanV7,
  promotionMarkerBobCssPxV7,
  readyChevronBounceCssPxV7,
} from "./feedback-motion-v7";
import {
  TILE_WIDTH,
  projectGrid,
  worldToScreen,
  type CameraState,
} from "./geometry";
import type { ChibiRasterEnvironmentV7 } from "./chibi-art-resolver-v7";
import { unitTurnStatesV7, type UnitTurnStateV7 } from "./unit-turn-state-v7";

/** What the feedback animations need from the board host that owns them. */
export interface BoardFeedbackEnvironmentV7 {
  /** The host's clock (`performance.now`). */
  now(): number;
  /** Redraws the board. */
  draw(): void;
  /** Counts the board's redraws, so no frame is drawn twice. */
  drawSerial(): number;
  /** The window whose animation frames drive the host, or null. */
  browser(): Pick<
    Window,
    "requestAnimationFrame" | "cancelAnimationFrame"
  > | null;
  camera(): CameraState;
  /** The board canvas in client coordinates, or null before it is mounted. */
  canvasClientRect(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  } | null;
  raster: Pick<ChibiRasterEnvironmentV7, "readPixels" | "createSurface">;
}

/** The part of the board model the feedback animations read. */
export interface BoardFeedbackModelV7 {
  readonly matchInstanceId: string | number;
  readonly view: PlayerViewV7;
  readonly offeredCommands: readonly CommandV7[];
  readonly interactive: boolean;
  readonly motion: "FULL" | "REDUCED";
  readonly animationSpeed: "NORMAL" | "FAST";
  readonly presentationPaused: boolean;
}

/** When the cues of a launch happen, in real ms from the launch. */
export interface FeedbackLaunchV7 {
  /** The first population icon reaches its city, or null for none. */
  readonly populationArrivalMs: number | null;
  /** The level-up ring starts, or null for no level-up. */
  readonly levelUpMs: number | null;
}

const NO_LAUNCH: FeedbackLaunchV7 = Object.freeze({
  populationArrivalMs: null,
  levelUpMs: null,
});

/**
 * The feedback side of the board host the DOM shell talks to (bead
 * pulp_wars-2yc.29). A boundary is `hold`-ed when it is accepted (cities
 * keep their old meter, an earned Promotion keeps its marker back) and
 * `launch`-ed when its presentation has played; `finish` drops everything
 * and shows the true state at once.
 */
export interface BoardFeedbackPortV7 {
  /** Full motion in a browser that animates; false means no holds. */
  animated(): boolean;
  /** The feedback clock in ms: the host's, stopped while paused. */
  timeMs(): number;
  /** 0.5 at Fast animation speed. */
  durationScale(): number;
  hold(plan: FeedbackPlanV7): number;
  launch(ticket: number): FeedbackLaunchV7;
  finish(): void;
  /** A tile's centre in client coordinates under the current camera. */
  cellClientPoint(at: CoordV7): { readonly x: number; readonly y: number };
  /** The board's frame in client coordinates. */
  boardClientFrame(): {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  /**
   * A listener called once per frame with the feedback clock while it
   * returns true (the coin layer). Call `requestFrames` to start it.
   */
  setFrameListener(listener: ((timeMs: number) => boolean) | null): void;
  requestFrames(): void;
}

interface MeterHold {
  readonly before: { readonly level: number; readonly population: number };
  pending: number;
  arrived: number;
}

interface PopulationFlight {
  readonly cityId: number;
  readonly from: CoordV7;
  readonly to: CoordV7;
  readonly startAt: number;
  readonly value: number;
  /** The last icon of a gain that levelled its city up. */
  readonly levelUp: boolean;
}

interface Burst {
  readonly kind: "PROMOTION_EARNED" | "PROMOTED" | "LEVEL_UP";
  readonly at: CoordV7;
  readonly startAt: number;
  readonly durationMs: number;
  readonly own: boolean;
}

interface Hop {
  readonly startAt: number;
  readonly durationMs: number;
  readonly amplitude: number;
}

const coordKey = (at: CoordV7): string => `${at.x},${at.y}`;

export class BoardFeedbackV7 implements BoardFeedbackPortV7 {
  readonly #env: BoardFeedbackEnvironmentV7;
  readonly #spent: SpentSpriteCacheV7;
  #model: BoardFeedbackModelV7 | null = null;
  #turnStates: ReadonlyMap<number, UnitTurnStateV7> = new Map();
  readonly #promotionReady = new WeakMap<PlayerViewV7, ReadonlySet<number>>();
  #nextTicket = 1;
  readonly #tickets = new Map<number, FeedbackPlanV7>();
  readonly #meterHolds = new Map<number, MeterHold>();
  readonly #cityHops = new Map<number, Hop>();
  readonly #unitHops = new Map<number, Hop>();
  /** Markers kept back for a celebration; `showAt` is set at the launch. */
  readonly #markerPops = new Map<number, { showAt: number | null }>();
  #flights: PopulationFlight[] = [];
  #bursts: Burst[] = [];
  #frame: number | null = null;
  #listener: ((timeMs: number) => boolean) | null = null;
  #listenerBusy = false;
  #lastSerial = -1;
  #pausedAt: number | null = null;
  #pausedTotal = 0;

  constructor(environment: BoardFeedbackEnvironmentV7) {
    this.#env = environment;
    this.#spent = createSpentSpriteCacheV7(environment.raster);
  }

  /** The host's `update`: the model the next frames are drawn from. */
  sync(model: BoardFeedbackModelV7): void {
    const prior = this.#model;
    if (prior !== null && prior.matchInstanceId !== model.matchInstanceId) {
      this.#model = model;
      this.finish();
    }
    this.#model = model;
    const now = this.#env.now();
    if (model.presentationPaused && this.#pausedAt === null)
      this.#pausedAt = now;
    else if (!model.presentationPaused && this.#pausedAt !== null) {
      this.#pausedTotal += now - this.#pausedAt;
      this.#pausedAt = null;
    }
    const viewersTurn =
      model.view.turnOrder[model.view.activeSeatIndex] === model.view.viewer.id;
    // While a command settles the engine offers nothing for a moment: the
    // units keep the states they had instead of all turning spent.
    if (!viewersTurn || model.offeredCommands.length > 0)
      this.#turnStates = unitTurnStatesV7(model.view, model.offeredCommands);
    if (model.motion === "REDUCED" && this.#busy()) this.finish();
    this.#schedule();
  }

  animated(): boolean {
    const browser = this.#env.browser();
    return (
      this.#model?.motion === "FULL" &&
      browser !== null &&
      typeof browser.requestAnimationFrame === "function"
    );
  }

  timeMs(): number {
    return (this.#pausedAt ?? this.#env.now()) - this.#pausedTotal;
  }

  durationScale(): number {
    return this.#model?.animationSpeed === "FAST" ? 0.5 : 1;
  }

  hold(plan: FeedbackPlanV7): number {
    const ticket = this.#nextTicket;
    this.#nextTicket += 1;
    if (!this.animated()) return ticket;
    this.#tickets.set(ticket, plan);
    for (const gain of plan.population) {
      const held = this.#meterHolds.get(gain.cityId);
      if (held === undefined)
        this.#meterHolds.set(gain.cityId, {
          before: gain.meterBefore,
          pending: gain.amount,
          arrived: 0,
        });
      else held.pending += gain.amount;
    }
    for (const cue of plan.promotionsEarned)
      this.#markerPops.set(cue.unitId, { showAt: null });
    return ticket;
  }

  launch(ticket: number): FeedbackLaunchV7 {
    const plan = this.#tickets.get(ticket);
    if (plan === undefined) return NO_LAUNCH;
    this.#tickets.delete(ticket);
    if (!this.animated()) {
      this.#release(plan);
      return NO_LAUNCH;
    }
    const now = this.timeMs();
    const scale = this.durationScale();
    let firstArrival: number | null = null;
    let levelUp: number | null = null;
    for (const gain of plan.population) {
      const room = POPULATION_ICON_CAP_V7 - this.#flights.length;
      const flying = gain.sources.filter(
        (source) => coordKey(source.at) !== coordKey(gain.cityAt),
      );
      const icons = populationIconPlanV7(
        flying.map((source) => source.amount),
        room,
      );
      const carried = icons.reduce((sum, icon) => sum + icon.value, 0);
      // Points with no tile to come from (or no icon left) arrive at once.
      const instant = gain.amount - carried;
      let lastArrival = now;
      icons.forEach((icon, index) => {
        const source = flying[icon.source];
        if (source === undefined) return;
        const startAt = now + index * POPULATION_STAGGER_MS_V7 * scale;
        lastArrival = startAt + POPULATION_HOP_MS_V7 * scale;
        this.#flights.push({
          cityId: gain.cityId,
          from: source.at,
          to: gain.cityAt,
          startAt,
          value: icon.value,
          levelUp: gain.leveledUp && index === icons.length - 1,
        });
      });
      if (instant > 0 || icons.length === 0) {
        this.#arrive(gain.cityId, gain.amount - carried, now);
        if (gain.leveledUp && icons.length === 0)
          this.#levelUp(gain.cityAt, now + CITY_HOP_MS_V7 * scale);
      }
      const arrival = icons.length === 0 ? 0 : POPULATION_HOP_MS_V7 * scale;
      firstArrival =
        firstArrival === null ? arrival : Math.min(firstArrival, arrival);
      if (gain.leveledUp) {
        const ring = lastArrival - now + CITY_HOP_MS_V7 * scale;
        levelUp = levelUp === null ? ring : Math.min(levelUp, ring);
      }
    }
    for (const cue of plan.promotionsEarned) {
      this.#unitHops.set(cue.unitId, {
        startAt: now,
        durationMs: PROMOTION_HOP_MS_V7 * scale,
        amplitude: PROMOTION_HOP_AMPLITUDE_CSS_PX_V7,
      });
      this.#bursts.push({
        kind: "PROMOTION_EARNED",
        at: cue.at,
        startAt: now + PROMOTION_HOP_MS_V7 * scale * 0.35,
        durationMs: PROMOTION_CELEBRATION_MS_V7 * scale,
        own: cue.own,
      });
      this.#markerPops.set(cue.unitId, {
        showAt: now + PROMOTION_CELEBRATION_MS_V7 * scale * 0.6,
      });
    }
    for (const cue of plan.promoted)
      this.#bursts.push({
        kind: "PROMOTED",
        at: cue.at,
        startAt: now,
        durationMs: PROMOTION_FLOURISH_MS_V7 * scale,
        own: cue.own,
      });
    this.#schedule();
    return { populationArrivalMs: firstArrival, levelUpMs: levelUp };
  }

  finish(): void {
    const busy = this.#busy() || this.#tickets.size > 0;
    this.#tickets.clear();
    this.#meterHolds.clear();
    this.#cityHops.clear();
    this.#unitHops.clear();
    this.#markerPops.clear();
    this.#flights = [];
    this.#bursts = [];
    if (busy) this.#env.draw();
  }

  /**
   * The board is unmounted: nothing fires until it is mounted and given a
   * model again. The frame listener stays (the host object is reused).
   */
  destroy(): void {
    this.finish();
    this.#listenerBusy = false;
    if (this.#frame !== null)
      this.#env.browser()?.cancelAnimationFrame(this.#frame);
    this.#frame = null;
    this.#model = null;
  }

  cellClientPoint(at: CoordV7): { readonly x: number; readonly y: number } {
    const rect = this.#env.canvasClientRect();
    const point = worldToScreen(projectGrid(at), this.#env.camera());
    return { x: (rect?.left ?? 0) + point.x, y: (rect?.top ?? 0) + point.y };
  }

  boardClientFrame(): {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  } {
    const rect = this.#env.canvasClientRect();
    return rect === null
      ? { left: 0, top: 0, right: 0, bottom: 0 }
      : {
          left: rect.left,
          top: rect.top,
          right: rect.left + rect.width,
          bottom: rect.top + rect.height,
        };
  }

  setFrameListener(listener: ((timeMs: number) => boolean) | null): void {
    this.#listener = listener;
    this.#listenerBusy = false;
  }

  requestFrames(): void {
    this.#listenerBusy = this.#listener !== null;
    this.#schedule();
  }

  /**
   * A click or tap on a tile: the city whose territory holds it does its
   * small hop (any player's city the viewer can see); a tile outside every
   * territory moves nothing. Reduced motion hops nothing.
   */
  territoryClick(view: PlayerViewV7, at: CoordV7): void {
    if (!this.animated()) return;
    const tile = view.board.tiles.find(
      (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
    );
    if (tile === undefined || !tile.explored || tile.territoryCityId === null)
      return;
    const city = view.cities.find((item) => item.id === tile.territoryCityId);
    if (city === undefined) return;
    this.#hopCity(city.id, this.timeMs());
    this.#schedule();
  }

  /**
   * Whether the bob of a waiting Promotion marker should keep the host's
   * calm ambient loop running (the viewer's own turn, full motion).
   */
  wantsAmbientFrames(): boolean {
    const model = this.#model;
    if (model === null || model.motion !== "FULL" || !model.interactive)
      return false;
    const ready = this.#readyIds(model.view);
    if (ready.size === 0) return false;
    return model.view.units.some(
      (unit) => unit.ownerId === model.view.viewer.id && ready.has(unit.id),
    );
  }

  /** What the board draws for the frame of `view`. */
  boardFrame(view: PlayerViewV7): BoardFeedbackFrameV7 {
    const model = this.#model;
    const reduced = model === null || model.motion === "REDUCED";
    const now = this.timeMs();
    const ready = this.#readyIds(view);
    const viewer = view.viewer.id;
    const owners = new Map<number, number>();
    if (ready.size > 0)
      for (const unit of view.units)
        if (ready.has(unit.id)) owners.set(unit.id, unit.ownerId);
    const hop = (entry: Hop | undefined): number =>
      entry === undefined
        ? 0
        : hopOffsetCssPxV7(
            now - entry.startAt,
            entry.durationMs,
            entry.amplitude,
            reduced,
          );
    return {
      cityHopCssPx: (cityId) => hop(this.#cityHops.get(cityId)),
      unitHopCssPx: (unitId) => hop(this.#unitHops.get(unitId)),
      cityMeter: (cityId) => {
        const held = this.#meterHolds.get(cityId);
        return held === undefined
          ? null
          : heldCityMeterV7(held.before, held.arrived);
      },
      turnState: (unitId) => this.#turnStates.get(unitId) ?? null,
      promotionMarker: (unitId) => {
        const owner = owners.get(unitId);
        if (owner === undefined) return null;
        const own = owner === viewer;
        const pop = this.#markerPops.get(unitId);
        if (pop === undefined || reduced)
          return {
            own,
            scale: 1,
            bobCssPx: own ? promotionMarkerBobCssPxV7(now, reduced) : 0,
          };
        if (pop.showAt === null || now < pop.showAt) return null;
        const grown =
          (now - pop.showAt) /
          (PROMOTION_MARKER_POP_MS_V7 * this.durationScale());
        return {
          own,
          scale: grown >= 1 ? 1 : easeOutBackV7(grown),
          bobCssPx: own ? promotionMarkerBobCssPxV7(now, reduced) : 0,
        };
      },
      pulse: feedbackPulseV7(now, reduced),
      chevronBounceCssPx: readyChevronBounceCssPxV7(now, reduced),
      spentSprite: (image) => this.#spent.resolve(image),
    };
  }

  /**
   * The cues drawn over the board: the population icons on their way, the
   * sparkles of a Promotion and the ring of a level-up. `icon` resolves the
   * game's own population and Promote icons (null while one loads).
   */
  drawAbove(
    context: CanvasRenderingContext2D,
    camera: CameraState,
    icon: (kind: "POPULATION" | "PROMOTE") => CanvasImageSource | null,
  ): void {
    if (this.#flights.length === 0 && this.#bursts.length === 0) return;
    const now = this.timeMs();
    const scale = this.durationScale();
    const tile = TILE_WIDTH * camera.zoom;
    const centre = (at: CoordV7) => worldToScreen(projectGrid(at), camera);
    for (const burst of this.#bursts) {
      const progress = (now - burst.startAt) / burst.durationMs;
      if (progress <= 0 || progress >= 1) continue;
      const at = centre(burst.at);
      if (burst.kind === "LEVEL_UP") {
        drawGroundRingV7(
          context,
          at.x,
          at.y + tile * 0.16,
          tile * 0.62,
          progress,
        );
        drawSparkleBurstV7(
          context,
          at.x,
          at.y - tile * 0.2,
          tile * 0.5,
          progress,
          {
            sparkles: 8,
          },
        );
      } else if (burst.kind === "PROMOTION_EARNED")
        drawSparkleBurstV7(
          context,
          at.x,
          at.y - tile * 0.2,
          tile * 0.44,
          progress,
        );
      else {
        // The marker leaves upward and fades inside a small burst.
        const size = promotionMarkerSizeCssPxV7(camera.zoom, burst.own);
        const y = at.y - tile * 0.52 - tile * 0.22 * progress;
        drawSparkleBurstV7(
          context,
          at.x,
          at.y - tile * 0.4,
          tile * 0.36,
          progress,
          {
            sparkles: 5,
          },
        );
        drawPromotionMarkerV7(context, at.x, y, size * (1 + 0.35 * progress), {
          icon: icon("PROMOTE"),
          own: burst.own,
          alpha: 1 - progress,
        });
      }
    }
    for (const flight of this.#flights) {
      const progress = (now - flight.startAt) / (POPULATION_HOP_MS_V7 * scale);
      if (progress < 0 || progress >= 1) continue;
      const from = centre(flight.from);
      const to = centre(flight.to);
      const frame = populationHopFrameV7(
        from,
        { x: to.x, y: to.y - tile * 0.12 },
        progress,
        populationHopHeightV7(from, to, tile),
      );
      drawPopulationIconV7(
        context,
        frame.x,
        frame.y,
        Math.max(16, tile * 0.36) * frame.scale,
        { icon: icon("POPULATION"), value: flight.value },
      );
    }
  }

  /** Review tooling and tests: what is in the air right now. */
  snapshot(): {
    readonly flights: number;
    readonly bursts: number;
    readonly cityHops: readonly number[];
    readonly unitHops: readonly number[];
    readonly heldCities: readonly number[];
    readonly tickets: number;
  } {
    return {
      flights: this.#flights.length,
      bursts: this.#bursts.length,
      cityHops: [...this.#cityHops.keys()],
      unitHops: [...this.#unitHops.keys()],
      heldCities: [...this.#meterHolds.keys()],
      tickets: this.#tickets.size,
    };
  }

  #readyIds(view: PlayerViewV7): ReadonlySet<number> {
    let ready = this.#promotionReady.get(view);
    if (ready === undefined) {
      ready = promotionReadyUnitIdsV7(view);
      this.#promotionReady.set(view, ready);
    }
    return ready;
  }

  /** A plan that will not be animated gives back what it held. */
  #release(plan: FeedbackPlanV7): void {
    for (const gain of plan.population) this.#meterHolds.delete(gain.cityId);
    for (const cue of plan.promotionsEarned)
      this.#markerPops.delete(cue.unitId);
  }

  #hopCity(cityId: number, now: number): void {
    const hop = this.#cityHops.get(cityId);
    // A hop under way is not restarted: arrivals close together share it.
    if (hop !== undefined && now - hop.startAt < hop.durationMs) return;
    this.#cityHops.set(cityId, {
      startAt: now,
      durationMs: CITY_HOP_MS_V7 * this.durationScale(),
      amplitude: CITY_HOP_AMPLITUDE_CSS_PX_V7,
    });
  }

  #levelUp(at: CoordV7, startAt: number): void {
    this.#bursts.push({
      kind: "LEVEL_UP",
      at,
      startAt,
      durationMs: LEVEL_UP_RING_MS_V7 * this.durationScale(),
      own: true,
    });
  }

  #arrive(cityId: number, value: number, now: number): void {
    const held = this.#meterHolds.get(cityId);
    if (held !== undefined) {
      held.pending -= value;
      held.arrived += value;
      if (held.pending <= 0) this.#meterHolds.delete(cityId);
    }
    this.#hopCity(cityId, now);
  }

  #busy(): boolean {
    return (
      this.#flights.length > 0 ||
      this.#bursts.length > 0 ||
      this.#cityHops.size > 0 ||
      this.#unitHops.size > 0 ||
      [...this.#markerPops.values()].some((pop) => pop.showAt !== null)
    );
  }

  /** Moves the cues on to `now`; true when the board must be redrawn. */
  #advance(now: number): boolean {
    const scale = this.durationScale();
    let changed = false;
    if (this.#flights.length > 0) {
      const flying: PopulationFlight[] = [];
      for (const flight of this.#flights) {
        if (now < flight.startAt + POPULATION_HOP_MS_V7 * scale) {
          flying.push(flight);
          continue;
        }
        this.#arrive(flight.cityId, flight.value, now);
        if (flight.levelUp)
          this.#levelUp(flight.to, now + CITY_HOP_MS_V7 * scale);
        changed = true;
      }
      this.#flights = flying;
    }
    for (const hops of [this.#cityHops, this.#unitHops])
      for (const [id, hop] of hops)
        if (now - hop.startAt >= hop.durationMs) {
          hops.delete(id);
          changed = true;
        }
    if (this.#bursts.length > 0) {
      const live = this.#bursts.filter(
        (burst) => now < burst.startAt + burst.durationMs,
      );
      if (live.length !== this.#bursts.length) changed = true;
      this.#bursts = live;
    }
    for (const [unitId, pop] of this.#markerPops)
      if (
        pop.showAt !== null &&
        now >= pop.showAt + PROMOTION_MARKER_POP_MS_V7 * scale
      ) {
        this.#markerPops.delete(unitId);
        changed = true;
      }
    return changed;
  }

  #schedule(): void {
    if (this.#frame !== null) return;
    if (!this.#busy() && !this.#listenerBusy) return;
    const browser = this.#env.browser();
    if (
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    ) {
      // Nothing can animate: show the true state.
      this.finish();
      return;
    }
    this.#frame = browser.requestAnimationFrame(() => {
      this.#frame = null;
      this.#tick();
    });
  }

  #tick(): void {
    if (this.#pausedAt !== null) {
      // Settings is open: time stands still, the cues wait.
      this.#schedule();
      return;
    }
    const now = this.timeMs();
    const animating = this.#busy();
    const changed = this.#advance(now);
    if (this.#listenerBusy) {
      try {
        this.#listenerBusy = this.#listener?.(now) ?? false;
      } catch {
        this.#listenerBusy = false;
      }
    }
    // The board is drawn once per frame: when the host has drawn since the
    // last tick (a presentation or its ambient loop) that frame is used.
    if ((animating || changed) && this.#env.drawSerial() === this.#lastSerial)
      this.#env.draw();
    this.#lastSerial = this.#env.drawSerial();
    this.#schedule();
  }
}
