import type { CommandV7, CoordV7, PlayerViewV7 } from "../../engine/index";
import {
  EMPTY_FEEDBACK_PLAN_V7,
  promotionReadyUnitIdsV7,
  type FeedbackPlanV7,
} from "../feedback-plan-v7";
import type { FirstStepMarkerV7 } from "../first-steps-v7";
import {
  drawFirstStepMarkerV7,
  drawGroundRingV7,
  drawPopulationIconV7,
  drawPromotionMarkerV7,
  drawRoadPipGlowV7,
  drawSparkleBurstV7,
  promotionMarkerSizeCssPxV7,
  type BoardFeedbackFrameV7,
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
  ROAD_GLOW_MS_V7,
  ROAD_ICON_CAP_V7,
  ROAD_LANDING_MS_V7,
  ROAD_LINK_STAGGER_MS_V7,
  ROAD_UNLINK_MS_V7,
  cityPipCentreV7,
  easeOutBackV7,
  feedbackPulseV7,
  firstStepHopCssPxV7,
  heldCityMeterV7,
  hopOffsetCssPxV7,
  populationHopFrameV7,
  populationHopHeightV7,
  populationIconPlanV7,
  promotionMarkerBobCssPxV7,
  readyChevronBounceCssPxV7,
  roadHopFrameV7,
  roadHopMsV7,
} from "./feedback-motion-v7";
import {
  TILE_WIDTH,
  projectGrid,
  worldToScreen,
  type CameraState,
} from "./geometry";
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
  readonly highContrast?: boolean;
  /**
   * First steps (bead pulp_wars-2yc.39): the marker that points at the next
   * useful thing, or null. Omitted draws none.
   */
  readonly firstStepMarker?: FirstStepMarkerV7 | null;
}

/** How far over its tile's centre a first-steps marker points, in tiles. */
const FIRST_STEP_MARKER_LIFT: Readonly<
  Record<FirstStepMarkerV7["kind"], number>
> = { CITY: 0.56, UNIT: 0.62, TILE: 0.3 };

/** When the cues of a launch happen, in real ms from the launch. */
export interface FeedbackLaunchV7 {
  /** The first population icon reaches its city, or null for none. */
  readonly populationArrivalMs: number | null;
  /** The level-up ring starts, or null for no level-up. */
  readonly levelUpMs: number | null;
  /**
   * Bead pulp_wars-v56v: the first Road icon lands on its city's pips.
   * Present only when a Road link sends icons.
   */
  readonly roadArrivalMs?: number;
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

/**
 * Bead pulp_wars-v56v: a population icon hopping along a new Road link
 * from one city's pips to the other's.
 */
interface RoadFlight {
  readonly fromCityId: number;
  readonly toCityId: number;
  /** The Road tiles from the source city to the destination, both included. */
  readonly path: readonly CoordV7[];
  readonly startAt: number;
  readonly durationMs: number;
  readonly value: number;
  /** The points count toward the destination's held meter. */
  readonly holds: boolean;
  /** The last icon of a gain that levelled its city up. */
  readonly levelUp: boolean;
}

/**
 * Bead pulp_wars-v56v: a cue on a city's pip column: the sparkle where a
 * Road icon landed, the still glow of reduced motion, and the pip that
 * fades away when a link is lost.
 */
interface PipCue {
  readonly kind: "LANDING" | "GLOW" | "UNLINK";
  readonly cityId: number;
  readonly at: CoordV7;
  readonly slot: number;
  readonly startAt: number;
  readonly durationMs: number;
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
  #roadFlights: RoadFlight[] = [];
  #pipCues: PipCue[] = [];
  #bursts: Burst[] = [];
  #frame: number | null = null;
  #listener: ((timeMs: number) => boolean) | null = null;
  #listenerBusy = false;
  #lastSerial = -1;
  #pausedAt: number | null = null;
  #pausedTotal = 0;

  constructor(environment: BoardFeedbackEnvironmentV7) {
    this.#env = environment;
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
    if (model.motion === "REDUCED" && this.#moving()) this.finish();
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
    if (!this.animated()) {
      // Reduced motion: a Road link still glows on both cities' pips.
      if (plan.roadLinks.length > 0)
        this.#tickets.set(ticket, {
          ...EMPTY_FEEDBACK_PLAN_V7,
          roadLinks: plan.roadLinks,
        });
      return ticket;
    }
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
      this.#glowRoadLinks(plan);
      return NO_LAUNCH;
    }
    const now = this.timeMs();
    const scale = this.durationScale();
    let firstArrival: number | null = null;
    let levelUp: number | null = null;
    let roadArrival: number | null = null;
    // Bead pulp_wars-v56v: the links of one command start nearest first.
    const linkStart = (fromCityId: number, toCityId: number): number => {
      const index = plan.roadLinks.findIndex(
        (link) =>
          (link.capitalId === fromCityId && link.cityId === toCityId) ||
          (link.cityId === fromCityId && link.capitalId === toCityId),
      );
      return now + Math.max(0, index) * ROAD_LINK_STAGGER_MS_V7 * scale;
    };
    const flown = new Set<string>();
    const flyRoad = (
      fromCityId: number,
      toCityId: number,
      path: readonly CoordV7[],
      value: number,
      holds: boolean,
    ): RoadFlight | null => {
      if (path.length < 2 || this.#roadFlights.length >= ROAD_ICON_CAP_V7)
        return null;
      const flight: RoadFlight = {
        fromCityId,
        toCityId,
        path,
        startAt: linkStart(fromCityId, toCityId),
        durationMs: roadHopMsV7(path.length - 1) * scale,
        value,
        holds,
        levelUp: false,
      };
      this.#roadFlights.push(flight);
      flown.add(`${fromCityId}>${toCityId}`);
      const lands = flight.startAt + flight.durationMs - now;
      roadArrival = roadArrival === null ? lands : Math.min(roadArrival, lands);
      return flight;
    };
    for (const gain of plan.population) {
      // Bead pulp_wars-v56v: Road points hop along the Road.
      const roadFlights: RoadFlight[] = [];
      for (const source of gain.sources) {
        if (source.road === undefined) continue;
        const flight = flyRoad(
          source.road.fromCityId,
          gain.cityId,
          source.road.path,
          source.amount,
          true,
        );
        if (flight !== null) roadFlights.push(flight);
      }
      const roadCarried = roadFlights.reduce(
        (sum, flight) => sum + flight.value,
        0,
      );
      const room = POPULATION_ICON_CAP_V7 - this.#flights.length;
      const flying = gain.sources.filter(
        (source) =>
          source.road === undefined &&
          coordKey(source.at) !== coordKey(gain.cityAt),
      );
      const icons = populationIconPlanV7(
        flying.map((source) => source.amount),
        room,
      );
      const carried =
        icons.reduce((sum, icon) => sum + icon.value, 0) + roadCarried;
      // Points with no tile to come from (or no icon left) arrive at once.
      const instant = gain.amount - carried;
      let lastArrival = now;
      for (const flight of roadFlights)
        lastArrival = Math.max(lastArrival, flight.startAt + flight.durationMs);
      const roadLast = lastArrival;
      const regular: PopulationFlight[] = [];
      icons.forEach((icon, index) => {
        const source = flying[icon.source];
        if (source === undefined) return;
        const startAt = now + index * POPULATION_STAGGER_MS_V7 * scale;
        lastArrival = Math.max(
          lastArrival,
          startAt + POPULATION_HOP_MS_V7 * scale,
        );
        regular.push({
          cityId: gain.cityId,
          from: source.at,
          to: gain.cityAt,
          startAt,
          value: icon.value,
          levelUp: false,
        });
      });
      // The icon that lands last brings the level-up.
      if (gain.leveledUp) {
        const lastRegular = regular.at(-1);
        const lastRoad = roadFlights.reduce<RoadFlight | null>(
          (latest, flight) =>
            latest === null ||
            flight.startAt + flight.durationMs >
              latest.startAt + latest.durationMs
              ? flight
              : latest,
          null,
        );
        if (lastRoad !== null && roadLast >= lastArrival) {
          const index = this.#roadFlights.indexOf(lastRoad);
          if (index !== -1)
            this.#roadFlights[index] = { ...lastRoad, levelUp: true };
        } else if (lastRegular !== undefined)
          regular[regular.length - 1] = { ...lastRegular, levelUp: true };
      }
      this.#flights.push(...regular);
      const sent = icons.length + roadFlights.length;
      if (instant > 0 || sent === 0) {
        this.#arrive(gain.cityId, gain.amount - carried, now);
        if (gain.leveledUp && sent === 0)
          this.#levelUp(gain.cityAt, now + CITY_HOP_MS_V7 * scale);
      }
      const arrival =
        icons.length > 0
          ? POPULATION_HOP_MS_V7 * scale
          : roadFlights.length > 0
            ? Math.min(
                ...roadFlights.map(
                  (flight) => flight.startAt + flight.durationMs - now,
                ),
              )
            : 0;
      firstArrival =
        firstArrival === null ? arrival : Math.min(firstArrival, arrival);
      if (gain.leveledUp) {
        const ring = lastArrival - now + CITY_HOP_MS_V7 * scale;
        levelUp = levelUp === null ? ring : Math.min(levelUp, ring);
      }
    }
    // A link whose city shows no gain of its own (a city just captured, or
    // a capital whose other Road population fell at the same time) still
    // sends its icon; it changes no meter.
    for (const link of plan.roadLinks) {
      if (!flown.has(`${link.capitalId}>${link.cityId}`))
        flyRoad(link.capitalId, link.cityId, link.path, 1, false);
      if (!flown.has(`${link.cityId}>${link.capitalId}`))
        flyRoad(
          link.cityId,
          link.capitalId,
          [...link.path].reverse(),
          1,
          false,
        );
    }
    // A lost link is quiet: the pip that goes rises a little and fades.
    for (const unlink of plan.roadUnlinks)
      this.#pipCues.push({
        kind: "UNLINK",
        cityId: unlink.cityId,
        at: unlink.at,
        slot: this.#pipSlot(unlink.cityId, "NEXT"),
        startAt: now,
        durationMs: ROAD_UNLINK_MS_V7 * scale,
      });
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
    return roadArrival === null
      ? { populationArrivalMs: firstArrival, levelUpMs: levelUp }
      : {
          populationArrivalMs: firstArrival,
          levelUpMs: levelUp,
          roadArrivalMs: roadArrival,
        };
  }

  finish(): void {
    const busy = this.#busy() || this.#tickets.size > 0;
    this.#tickets.clear();
    this.#meterHolds.clear();
    this.#cityHops.clear();
    this.#unitHops.clear();
    this.#markerPops.clear();
    this.#flights = [];
    this.#roadFlights = [];
    this.#pipCues = [];
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
    // First steps: a hopping marker keeps the loop running too.
    if (model.firstStepMarker?.motion === "HOP") return true;
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
    const now = this.timeMs();
    const tile = TILE_WIDTH * camera.zoom;
    const centre = (at: CoordV7) => worldToScreen(projectGrid(at), camera);
    this.#drawFirstStepMarker(context, camera, now);
    this.#drawRoadCues(context, camera, now, icon("POPULATION"));
    if (this.#flights.length === 0 && this.#bursts.length === 0) return;
    const scale = this.durationScale();
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

  /**
   * Bead pulp_wars-v56v: the Road icons on their way (each from the top
   * pip of its source city, hopping over every Road tile, onto the pip of
   * its destination that fills next), the sparkle where one landed, the
   * pip that fades from a lost link, and the still glow of reduced motion.
   */
  #drawRoadCues(
    context: CanvasRenderingContext2D,
    camera: CameraState,
    now: number,
    populationIcon: CanvasImageSource | null,
  ): void {
    if (this.#roadFlights.length === 0 && this.#pipCues.length === 0) return;
    const tile = TILE_WIDTH * camera.zoom;
    const centre = (at: CoordV7) => worldToScreen(projectGrid(at), camera);
    const pip = (at: CoordV7, slot: number) =>
      cityPipCentreV7(centre(at), camera.zoom, slot);
    // The size of the other population icons in flight.
    const iconSize = Math.max(16, tile * 0.36);
    for (const cue of this.#pipCues) {
      const progress = (now - cue.startAt) / cue.durationMs;
      if (progress < 0 || progress >= 1) continue;
      if (cue.kind === "GLOW") {
        drawRoadPipGlowV7(
          context,
          cityPipCentreV7(centre(cue.at), camera.zoom, 0),
          camera.zoom,
          this.#pipWidth(cue.cityId),
        );
        continue;
      }
      const point = pip(cue.at, cue.slot);
      if (cue.kind === "LANDING")
        drawSparkleBurstV7(context, point.x, point.y, tile * 0.2, progress, {
          sparkles: 5,
        });
      else {
        context.save();
        context.globalAlpha *= 0.55 * (1 - progress);
        drawPopulationIconV7(
          context,
          point.x,
          point.y - tile * 0.22 * progress,
          iconSize * 0.8,
          { icon: populationIcon, value: 1 },
        );
        context.restore();
      }
    }
    for (const flight of this.#roadFlights) {
      const progress = (now - flight.startAt) / flight.durationMs;
      if (progress < 0 || progress >= 1) continue;
      const from = flight.path[0];
      const to = flight.path.at(-1);
      if (from === undefined || to === undefined) continue;
      const points = [
        pip(from, this.#pipSlot(flight.fromCityId, "TOP")),
        ...flight.path.slice(1, -1).map(centre),
        pip(to, this.#pipSlot(flight.toCityId, "NEXT")),
      ];
      const frame = roadHopFrameV7(points, progress, tile);
      drawPopulationIconV7(context, frame.x, frame.y, iconSize * frame.scale, {
        icon: populationIcon,
        value: flight.value,
      });
    }
  }

  /** The pips of a city's meter (its level plus one), as now drawn. */
  #pipWidth(cityId: number): number {
    return Math.max(1, this.#shownMeter(cityId).level + 1);
  }

  /** The level and meter the city shows now (held or true). */
  #shownMeter(cityId: number): {
    readonly level: number;
    readonly population: number;
  } {
    const held = this.#meterHolds.get(cityId);
    if (held !== undefined) return heldCityMeterV7(held.before, held.arrived);
    const city = this.#model?.view.cities.find((item) => item.id === cityId);
    return { level: city?.level ?? 1, population: city?.population ?? 0 };
  }

  /**
   * A pip of the meter the city shows now: its top filled pip (`TOP`, where
   * an icon leaves from or has just landed) or the pip that fills next
   * (`NEXT`, where an icon lands), never outside the meter.
   */
  #pipSlot(cityId: number, which: "TOP" | "NEXT"): number {
    const meter = this.#shownMeter(cityId);
    const slot = which === "TOP" ? meter.population - 1 : meter.population;
    return Math.max(0, Math.min(Math.max(1, meter.level + 1) - 1, slot));
  }

  /** Reduced motion: both cities of each new link glow, still, a moment. */
  #glowRoadLinks(plan: FeedbackPlanV7): void {
    const browser = this.#env.browser();
    if (
      plan.roadLinks.length === 0 ||
      this.#model?.motion !== "REDUCED" ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    )
      return;
    const now = this.timeMs();
    const glowing = new Set<number>();
    for (const link of plan.roadLinks)
      for (const [cityId, at] of [
        [link.capitalId, link.capitalAt],
        [link.cityId, link.cityAt],
      ] as const) {
        if (glowing.has(cityId)) continue;
        glowing.add(cityId);
        this.#pipCues = this.#pipCues.filter(
          (cue) => cue.kind !== "GLOW" || cue.cityId !== cityId,
        );
        this.#pipCues.push({
          kind: "GLOW",
          cityId,
          at,
          slot: 0,
          startAt: now,
          durationMs: ROAD_GLOW_MS_V7,
        });
      }
    this.#env.draw();
    this.#schedule();
  }

  /**
   * First steps: the marker over the city, tile or unit the coach points
   * at. It hops while the player may act (full motion) and stands still in
   * reduced motion; nothing is drawn while the board takes no input.
   */
  #drawFirstStepMarker(
    context: CanvasRenderingContext2D,
    camera: CameraState,
    now: number,
  ): void {
    const frame = this.firstStepMarkerFrame(now);
    if (frame === null) return;
    const at = worldToScreen(projectGrid(frame.at), camera);
    const tile = TILE_WIDTH * camera.zoom;
    drawFirstStepMarkerV7(
      context,
      at.x,
      at.y -
        tile * FIRST_STEP_MARKER_LIFT[frame.kind] +
        frame.hopCssPx * camera.zoom,
      camera.zoom,
      { highContrast: this.#model?.highContrast ?? false },
    );
  }

  /** The first-steps marker of this frame, or null (tests read it too). */
  firstStepMarkerFrame(now: number = this.timeMs()): {
    readonly kind: FirstStepMarkerV7["kind"];
    readonly at: CoordV7;
    readonly hopCssPx: number;
  } | null {
    const model = this.#model;
    const marker = model?.firstStepMarker ?? null;
    if (model === null || marker === null || !model.interactive) return null;
    return {
      kind: marker.kind,
      at: marker.at,
      hopCssPx: firstStepHopCssPxV7(
        now,
        marker.motion !== "HOP" || model.motion === "REDUCED",
      ),
    };
  }

  /** Review tooling and tests: what is in the air right now. */
  snapshot(): {
    readonly flights: number;
    readonly roadFlights: number;
    readonly pipCues: readonly PipCue["kind"][];
    readonly bursts: number;
    readonly cityHops: readonly number[];
    readonly unitHops: readonly number[];
    readonly heldCities: readonly number[];
    readonly tickets: number;
  } {
    return {
      flights: this.#flights.length,
      roadFlights: this.#roadFlights.length,
      pipCues: this.#pipCues.map((cue) => cue.kind),
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
    return this.#moving() || this.#pipCues.length > 0;
  }

  /** Busy with anything but the still glow of reduced motion. */
  #moving(): boolean {
    return (
      this.#flights.length > 0 ||
      this.#roadFlights.length > 0 ||
      this.#pipCues.some((cue) => cue.kind !== "GLOW") ||
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
    if (this.#roadFlights.length > 0) {
      const travelling: RoadFlight[] = [];
      for (const flight of this.#roadFlights) {
        if (now < flight.startAt + flight.durationMs) {
          travelling.push(flight);
          continue;
        }
        const to = flight.path.at(-1);
        if (flight.holds) this.#arrive(flight.toCityId, flight.value, now);
        else this.#hopCity(flight.toCityId, now);
        if (to !== undefined) {
          this.#pipCues.push({
            kind: "LANDING",
            cityId: flight.toCityId,
            at: to,
            slot: this.#pipSlot(flight.toCityId, "TOP"),
            startAt: now,
            durationMs: ROAD_LANDING_MS_V7 * scale,
          });
          if (flight.levelUp) this.#levelUp(to, now + CITY_HOP_MS_V7 * scale);
        }
        changed = true;
      }
      this.#roadFlights = travelling;
    }
    if (this.#pipCues.length > 0) {
      const live = this.#pipCues.filter(
        (cue) => now < cue.startAt + cue.durationMs,
      );
      if (live.length !== this.#pipCues.length) changed = true;
      this.#pipCues = live;
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
    // The still glow of reduced motion needs no redraw until it ends.
    const animating = this.#moving();
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
