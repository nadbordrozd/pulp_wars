import type { DestinationRect } from "./board-art-geometry";

interface GlowSurface {
  readonly canvas: HTMLCanvasElement;
  readonly bytes: number;
}

/** One host-owned, bounded cache. Identical ready sprites share a silhouette. */
export class BoardGlowCacheV7 {
  readonly #document: Document;
  readonly #surfaces = new Map<string, GlowSurface>();
  readonly #limitBytes: number;
  #bytes = 0;

  constructor(documentRoot: Document, limitBytes = 24 * 1024 * 1024) {
    this.#document = documentRoot;
    this.#limitBytes = limitBytes;
  }

  get byteLength(): number {
    return this.#bytes;
  }

  clear(): void {
    for (const surface of this.#surfaces.values()) {
      surface.canvas.width = 0;
      surface.canvas.height = 0;
    }
    this.#surfaces.clear();
    this.#bytes = 0;
  }

  draw(
    context: CanvasRenderingContext2D,
    image: CanvasImageSource,
    assetId: string,
    destination: DestinationRect,
    glow: {
      readonly color: string;
      readonly alpha: number;
      readonly blur: number;
    },
  ): void {
    const transform = context.getTransform();
    const scaleX = Math.max(1, Math.hypot(transform.a, transform.b));
    const scaleY = Math.max(1, Math.hypot(transform.c, transform.d));
    const blur = glow.blur * Math.max(scaleX, scaleY);
    const padding = Math.max(2, Math.ceil(blur * 3));
    const sourceWidth = destination.width * scaleX;
    const sourceHeight = destination.height * scaleY;
    const width = Math.max(1, Math.ceil(sourceWidth + padding * 2));
    const height = Math.max(1, Math.ceil(sourceHeight + padding * 2));
    const bytes = width * height * 4;
    // Oversized surfaces use the existing destination-local implementation.
    if (bytes > this.#limitBytes) {
      drawUncachedGlow(
        context,
        image,
        destination,
        glow,
        scaleX,
        scaleY,
        blur,
        padding,
        width,
        height,
        sourceWidth,
        sourceHeight,
        this.#document,
      );
      return;
    }
    const key = `${assetId}:${sourceWidth}x${sourceHeight}:${glow.color}:${glow.alpha}:${blur}`;
    let surface = this.#surfaces.get(key);
    if (surface === undefined) {
      const canvas = this.#document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const buffer = canvas.getContext("2d");
      if (buffer === null) return;
      renderGlow(buffer, image, glow, blur, padding, sourceWidth, sourceHeight);
      surface = { canvas, bytes };
      while (this.#bytes + bytes > this.#limitBytes) {
        const oldestKey = this.#surfaces.keys().next().value;
        if (oldestKey === undefined) break;
        const oldest = this.#surfaces.get(oldestKey);
        if (oldest !== undefined) {
          this.#bytes -= oldest.bytes;
          oldest.canvas.width = 0;
          oldest.canvas.height = 0;
        }
        this.#surfaces.delete(oldestKey);
      }
      this.#surfaces.set(key, surface);
      this.#bytes += bytes;
    } else {
      this.#surfaces.delete(key);
      this.#surfaces.set(key, surface);
    }
    context.drawImage(
      surface.canvas,
      destination.x - padding / scaleX,
      destination.y - padding / scaleY,
      width / scaleX,
      height / scaleY,
    );
  }
}

function renderGlow(
  buffer: CanvasRenderingContext2D,
  image: CanvasImageSource,
  glow: { readonly color: string; readonly alpha: number },
  blur: number,
  padding: number,
  sourceWidth: number,
  sourceHeight: number,
): void {
  buffer.save();
  buffer.setTransform(1, 0, 0, 1, 0, 0);
  buffer.globalCompositeOperation = "source-over";
  buffer.globalAlpha = glow.alpha;
  buffer.shadowColor = glow.color;
  buffer.shadowBlur = blur;
  buffer.shadowOffsetX = 0;
  buffer.shadowOffsetY = 0;
  buffer.drawImage(image, padding, padding, sourceWidth, sourceHeight);
  buffer.globalCompositeOperation = "destination-out";
  buffer.globalAlpha = 1;
  buffer.shadowColor = "transparent";
  buffer.shadowBlur = 0;
  buffer.drawImage(image, padding, padding, sourceWidth, sourceHeight);
  buffer.restore();
}

function drawUncachedGlow(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  destination: DestinationRect,
  glow: { readonly color: string; readonly alpha: number },
  scaleX: number,
  scaleY: number,
  blur: number,
  padding: number,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  documentRoot: Document,
): void {
  const canvas = documentRoot.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const buffer = canvas.getContext("2d");
  if (buffer === null) return;
  renderGlow(buffer, image, glow, blur, padding, sourceWidth, sourceHeight);
  context.drawImage(
    canvas,
    destination.x - padding / scaleX,
    destination.y - padding / scaleY,
    width / scaleX,
    height / scaleY,
  );
  canvas.width = 0;
  canvas.height = 0;
}
