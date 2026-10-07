import type { CoordV7 } from "../../engine/index";
import type { BoardFeedbackPortV7 } from "../canvas/feedback-host-v7";
import {
  COIN_SPRITE_CAP_V7,
  coinArcControlV7,
  coinBurstOffsetV7,
  coinEntryPointV7,
  coinFrameV7,
  coinLandingAfterMsV7,
  coinSpritePlanV7,
  coinStartDelayMsV7,
  type CoinBoundsV7,
  type FeedbackPointV7,
} from "../canvas/feedback-motion-v7";
import type { CoinGainV7 } from "../feedback-plan-v7";

/** The coin sprite's side in CSS px. */
export const COIN_SPRITE_SIZE_CSS_PX_V7 = 24;

/** The part of the board's feedback port the coin layer uses. */
export type CoinFlightPortV7 = Pick<
  BoardFeedbackPortV7,
  | "animated"
  | "timeMs"
  | "durationScale"
  | "cellClientPoint"
  | "boardClientFrame"
  | "setFrameListener"
  | "requestFrames"
>;

export interface CoinFlightLayerOptionsV7 {
  /** The game's coin art (the HUD's own icon). */
  readonly coinUrl: () => string | null;
  /** The counter's coin icon: where the coins land. */
  readonly counterIcon: () => Element | null;
  /**
   * Called when the shown balance changes (a coin landed, or everything was
   * finished): the HUD writes `displayed(true balance)` and, for a landing,
   * pulses.
   */
  readonly onBalance: (landed: boolean) => void;
}

interface Flight {
  readonly element: HTMLImageElement;
  readonly from: FeedbackPointV7;
  readonly burst: FeedbackPointV7;
  readonly to: FeedbackPointV7;
  readonly startAt: number;
  readonly pop: boolean;
  /** Which coin of its burst it is: its own arc. */
  readonly variant: number;
  /** The toss's control point, worked out once at the launch. */
  readonly control: FeedbackPointV7;
  readonly value: number;
}

/**
 * Bead pulp_wars-2yc.29: the Coins the viewer gains fly from the tile that
 * earned them to the HUD's coin counter, in screen space over the board
 * and the HUD and under menus and dialogs. The layer is a fixed pool of
 * `<img>` sprites moved with transforms; it has no clock of its own (the
 * board host's feedback port calls `frame`) and holds no game state.
 *
 * The counter never drifts: what it shows is always the true balance less
 * the Coins still held (accepted but not yet launched) or in the air, both
 * summed afresh each time, so when nothing is left it is the true balance.
 */
export class CoinFlightLayerV7 {
  readonly element: HTMLElement;
  readonly #document: Document;
  readonly #options: CoinFlightLayerOptionsV7;
  #port: CoinFlightPortV7 | null = null;
  readonly #pool: HTMLImageElement[] = [];
  #flights: Flight[] = [];
  #nextTicket = 1;
  readonly #held = new Map<number, readonly CoinGainV7[]>();

  constructor(documentRoot: Document, options: CoinFlightLayerOptionsV7) {
    this.#document = documentRoot;
    this.#options = options;
    this.element = documentRoot.createElement("div");
    this.element.className = "v7-feedback-layer";
    this.element.dataset.v7Region = "feedback";
    // Decoration only: the counter's label always has the true balance.
    this.element.setAttribute("role", "presentation");
  }

  /** Connects the layer to the board's clock; null disconnects it. */
  attach(port: CoinFlightPortV7 | null): void {
    if (this.#port === port) return;
    this.#port?.setFrameListener(null);
    this.#port = port;
    port?.setFrameListener((timeMs) => this.frame(timeMs));
  }

  /** Coins accepted but not yet shown by the counter. */
  pending(): number {
    let pending = 0;
    for (const gains of this.#held.values())
      for (const gain of gains) pending += gain.amount;
    for (const flight of this.#flights) pending += flight.value;
    return pending;
  }

  /** What the counter shows for a true balance. */
  displayed(trueBalance: number): number {
    return Math.max(0, trueBalance - this.pending());
  }

  /** Sprites in the air (review tooling and tests). */
  activeSprites(): number {
    return this.#flights.length;
  }

  /**
   * A boundary was accepted: its Coins are kept off the counter until they
   * land. Without animation (reduced motion, no board port) nothing is
   * held and the counter shows the true balance at once.
   */
  hold(gains: readonly CoinGainV7[]): number {
    const ticket = this.#nextTicket;
    this.#nextTicket += 1;
    if (gains.length === 0 || this.#port === null || !this.#port.animated())
      return ticket;
    this.#held.set(ticket, gains);
    return ticket;
  }

  /**
   * The boundary's presentation has played: its coins leave their tiles.
   * Returns the real ms until the first coin lands (for the coin sound),
   * or null when nothing flies.
   */
  launch(ticket: number): number | null {
    const gains = this.#held.get(ticket);
    if (gains === undefined) return null;
    this.#held.delete(ticket);
    const port = this.#port;
    const target = this.#target();
    if (port === null || !port.animated() || target === null) {
      this.#options.onBalance(true);
      return null;
    }
    const plan = coinSpritePlanV7(
      gains.map((gain) => gain.amount),
      COIN_SPRITE_CAP_V7 - this.#flights.length,
    );
    if (plan.length === 0) {
      // No sprite is free: the Coins are counted at once.
      this.#options.onBalance(true);
      return null;
    }
    const now = port.timeMs();
    const scale = port.durationScale();
    const layer = this.element.getBoundingClientRect();
    const frame = port.boardClientFrame();
    const perSource = new Map<number, number>();
    for (const sprite of plan)
      perSource.set(sprite.source, (perSource.get(sprite.source) ?? 0) + 1);
    const seen = new Map<number, number>();
    const ranks = new Map<number, number>();
    const inset = COIN_SPRITE_SIZE_CSS_PX_V7 / 2;
    const bounds: CoinBoundsV7 = {
      left: inset,
      top: inset + 6,
      right: Math.max(inset, layer.width - inset),
      bottom: Math.max(inset, layer.height - inset),
    };
    for (const source of perSource.keys()) ranks.set(source, ranks.size);
    let firstLanding: number | null = null;
    for (const sprite of plan) {
      const gain = gains[sprite.source];
      if (gain === undefined) continue;
      const order = seen.get(sprite.source) ?? 0;
      seen.set(sprite.source, order + 1);
      const entry = coinEntryPointV7(this.#sourcePoint(port, gain.at), frame);
      const burst = coinBurstOffsetV7(order, perSource.get(sprite.source) ?? 1);
      const rank = ranks.get(sprite.source) ?? 0;
      const delay = coinStartDelayMsV7(rank, ranks.size, order) * scale;
      const flight = {
        from: { x: entry.point.x - layer.left, y: entry.point.y - layer.top },
        // An off-screen source's coins enter side by side, without a hop.
        burst: entry.offscreen ? { x: burst.x, y: 0 } : burst,
        to: { x: target.x - layer.left, y: target.y - layer.top },
        pop: !entry.offscreen,
        variant: order + rank,
      };
      const control = coinArcControlV7(
        {
          x: flight.from.x + flight.burst.x,
          y: flight.from.y + flight.burst.y,
        },
        flight.to,
        flight.variant,
        bounds,
      );
      const landing =
        delay + coinLandingAfterMsV7({ ...flight, durationScale: scale });
      firstLanding =
        firstLanding === null ? landing : Math.min(firstLanding, landing);
      this.#flights.push({
        ...flight,
        control,
        element: this.#sprite(),
        startAt: now + delay,
        value: sprite.value,
      });
    }
    this.frame(now);
    port.requestFrames();
    return firstLanding;
  }

  /** Lands everything at once: the counter shows the true balance. */
  finish(): void {
    const changed = this.#held.size > 0 || this.#flights.length > 0;
    this.#held.clear();
    for (const flight of this.#flights) this.#recycle(flight.element);
    this.#flights = [];
    if (changed) this.#options.onBalance(false);
  }

  destroy(): void {
    this.finish();
    this.attach(null);
    this.element.replaceChildren();
    this.#pool.length = 0;
  }

  /** One frame at the feedback clock's `timeMs`; true while coins fly. */
  frame(timeMs: number): boolean {
    if (this.#flights.length === 0) return false;
    const scale = this.#port?.durationScale() ?? 1;
    const flying: Flight[] = [];
    let landed = false;
    for (const flight of this.#flights) {
      const elapsedMs = timeMs - flight.startAt;
      if (elapsedMs < 0) {
        flying.push(flight);
        continue;
      }
      const frame = coinFrameV7({
        from: flight.from,
        burst: flight.burst,
        to: flight.to,
        elapsedMs,
        durationScale: scale,
        pop: flight.pop,
        variant: flight.variant,
        control: flight.control,
      });
      if (frame === null) {
        this.#recycle(flight.element);
        landed = true;
        continue;
      }
      const half = COIN_SPRITE_SIZE_CSS_PX_V7 / 2;
      const style = flight.element.style;
      style.transform = `translate3d(${(frame.x - half).toFixed(2)}px, ${(frame.y - half).toFixed(2)}px, 0) scale(${(frame.scale * frame.spin).toFixed(3)}, ${frame.scale.toFixed(3)})`;
      style.opacity = frame.opacity.toFixed(2);
      style.visibility = "visible";
      flying.push(flight);
    }
    this.#flights = flying;
    if (landed) this.#options.onBalance(true);
    return flying.length > 0;
  }

  #sourcePoint(port: CoinFlightPortV7, at: CoordV7): FeedbackPointV7 {
    return port.cellClientPoint(at);
  }

  #target(): FeedbackPointV7 | null {
    const icon = this.#options.counterIcon();
    if (icon === null || !icon.isConnected) return null;
    const rect = icon.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  #sprite(): HTMLImageElement {
    const reused = this.#pool.pop();
    const sprite = reused ?? this.#document.createElement("img");
    if (reused === undefined) {
      sprite.className = "v7-feedback-coin";
      sprite.alt = "";
      sprite.draggable = false;
      sprite.width = COIN_SPRITE_SIZE_CSS_PX_V7;
      sprite.height = COIN_SPRITE_SIZE_CSS_PX_V7;
      this.element.append(sprite);
    }
    const url = this.#options.coinUrl();
    if (url !== null && sprite.getAttribute("src") !== url) sprite.src = url;
    sprite.style.visibility = "hidden";
    return sprite;
  }

  #recycle(sprite: HTMLImageElement): void {
    sprite.style.visibility = "hidden";
    this.#pool.push(sprite);
  }
}
