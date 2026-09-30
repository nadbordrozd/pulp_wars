import type { DestinationRect } from "./board-art-geometry";

interface GlowSurface {
  readonly canvas: HTMLCanvasElement;
  readonly bytes: number;
  readonly assetId: string;
  readonly color: string;
}

const MAX_RECENT_PHASES_PER_SIZE = 4;

/**
 * An optional solid silhouette outline, in destination CSS pixels: the sprite
 * silhouette dilated by `width` and filled with the glow colour, with an
 * optional `rim` of `rimColor` outside it. The glow blur, when present, is a
 * soft aura around the outer edge. The sprite silhouette itself is always
 * removed, so the outline never tints or hides the sprite.
 */
export interface GlowOutlineV7 {
  readonly width: number;
  readonly rim: number;
  readonly rimColor: string | null;
}

export interface GlowSpecV7 {
  readonly color: string;
  readonly alpha: number;
  readonly blur: number;
  readonly outline?: GlowOutlineV7;
}

interface DeviceOutline {
  readonly width: number;
  readonly rim: number;
  readonly rimColor: string | null;
}

/** One host-owned, bounded cache. Identical ready sprites share a silhouette. */
export class BoardGlowCacheV7 {
  readonly #document: Document;
  readonly #surfaces = new Map<string, GlowSurface>();
  readonly #limitBytes: number;
  #bytes = 0;
  #mask: HTMLCanvasElement | null = null;

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
    if (this.#mask !== null) {
      this.#mask.width = 0;
      this.#mask.height = 0;
      this.#mask = null;
    }
  }

  draw(
    context: CanvasRenderingContext2D,
    image: CanvasImageSource,
    assetId: string,
    destination: DestinationRect,
    glow: GlowSpecV7,
  ): void {
    const transform = context.getTransform();
    const scaleX = Math.max(1, Math.hypot(transform.a, transform.b));
    const scaleY = Math.max(1, Math.hypot(transform.c, transform.d));
    const blur = glow.blur * Math.max(scaleX, scaleY);
    const outline = deviceOutline(glow.outline, Math.max(scaleX, scaleY));
    const padding = glowPadding(blur, outline);
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
        outline,
      );
      return;
    }
    const key = `${assetId}:${sourceWidth}x${sourceHeight}:${glow.color}:${glow.alpha}:${blur}${outlineKey(outline)}`;
    let surface = this.#surfaces.get(key);
    if (surface === undefined) {
      // Keep a short exact-key history for each asset/color/backing size.
      // Continuous phases repaint the oldest same-size surface after that;
      // the global byte cap also permits reuse from another asset if needed.
      let reusable: GlowSurface | undefined;
      let matchingKey: string | undefined;
      let matchingCount = 0;
      for (const [candidateKey, candidate] of this.#surfaces) {
        if (
          candidate.assetId !== assetId ||
          candidate.color !== glow.color ||
          candidate.canvas.width !== width ||
          candidate.canvas.height !== height
        )
          continue;
        matchingKey ??= candidateKey;
        matchingCount += 1;
      }
      if (
        matchingKey !== undefined &&
        (matchingCount >= MAX_RECENT_PHASES_PER_SIZE ||
          this.#bytes + bytes > this.#limitBytes)
      ) {
        reusable = this.#surfaces.get(matchingKey);
        this.#surfaces.delete(matchingKey);
        if (reusable !== undefined) this.#bytes -= reusable.bytes;
      }
      if (reusable === undefined && this.#bytes + bytes > this.#limitBytes) {
        for (const [candidateKey, candidate] of this.#surfaces) {
          if (
            candidate.canvas.width !== width ||
            candidate.canvas.height !== height
          )
            continue;
          this.#surfaces.delete(candidateKey);
          this.#bytes -= candidate.bytes;
          reusable = candidate;
          break;
        }
      }
      while (this.#bytes + bytes > this.#limitBytes) {
        const oldestKey = this.#surfaces.keys().next().value;
        if (oldestKey === undefined) break;
        const oldest = this.#surfaces.get(oldestKey);
        this.#surfaces.delete(oldestKey);
        if (oldest === undefined) continue;
        this.#bytes -= oldest.bytes;
        oldest.canvas.width = 0;
        oldest.canvas.height = 0;
      }
      const canvas = reusable?.canvas ?? this.#document.createElement("canvas");
      if (reusable === undefined) {
        canvas.width = width;
        canvas.height = height;
      }
      const buffer = canvas.getContext("2d");
      if (buffer === null) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      renderGlow(
        buffer,
        image,
        glow,
        blur,
        padding,
        sourceWidth,
        sourceHeight,
        reusable === undefined ? null : { width, height },
        outline,
        outline === null ? null : this.#maskSurface(width, height),
      );
      surface = { canvas, bytes, assetId, color: glow.color };
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

  #maskSurface(width: number, height: number): HTMLCanvasElement {
    const mask = this.#mask ?? this.#document.createElement("canvas");
    this.#mask = mask;
    if (mask.width !== width || mask.height !== height) {
      mask.width = width;
      mask.height = height;
    }
    return mask;
  }
}

/**
 * Draws a glow (or outline) without a host cache, in a temporary surface at
 * the context's backing scale. Used when a caller has no host-owned cache.
 */
export function drawUncachedGlowV7(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  destination: DestinationRect,
  glow: GlowSpecV7,
): void {
  const canvas = context.canvas as HTMLCanvasElement | undefined;
  const documentRoot = canvas?.ownerDocument as Document | undefined;
  if (documentRoot === undefined) return;
  const transform = context.getTransform();
  const scaleX = Math.max(1, Math.hypot(transform.a, transform.b));
  const scaleY = Math.max(1, Math.hypot(transform.c, transform.d));
  const blur = glow.blur * Math.max(scaleX, scaleY);
  const outline = deviceOutline(glow.outline, Math.max(scaleX, scaleY));
  const padding = glowPadding(blur, outline);
  const sourceWidth = destination.width * scaleX;
  const sourceHeight = destination.height * scaleY;
  drawUncachedGlow(
    context,
    image,
    destination,
    glow,
    scaleX,
    scaleY,
    blur,
    padding,
    Math.max(1, Math.ceil(sourceWidth + padding * 2)),
    Math.max(1, Math.ceil(sourceHeight + padding * 2)),
    sourceWidth,
    sourceHeight,
    documentRoot,
    outline,
  );
}

function deviceOutline(
  outline: GlowOutlineV7 | undefined,
  scale: number,
): DeviceOutline | null {
  if (outline === undefined) return null;
  return {
    width: Math.max(0, outline.width * scale),
    rim: outline.rimColor === null ? 0 : Math.max(0, outline.rim * scale),
    rimColor: outline.rimColor,
  };
}

function glowPadding(blur: number, outline: DeviceOutline | null): number {
  // A shadow blur is visible to about 1.5 times its radius; the plain glow
  // keeps its historical, more generous padding.
  if (outline === null) return Math.max(2, Math.ceil(blur * 3));
  return Math.max(2, Math.ceil(outline.width + outline.rim + blur * 1.5 + 2));
}

function outlineKey(outline: DeviceOutline | null): string {
  return outline === null
    ? ""
    : `:o${outline.width}:${outline.rim}:${outline.rimColor ?? ""}`;
}

/**
 * Offsets whose union of translated silhouettes is the silhouette dilated by
 * `radius`: concentric rings sampled densely enough that thin features such
 * as a spear shaft leave no gaps in the band.
 */
export function dilationOffsetsV7(
  radius: number,
): readonly (readonly [number, number])[] {
  const offsets: [number, number][] = [[0, 0]];
  if (!(radius > 0)) return offsets;
  const rings = Math.max(1, Math.ceil(radius / 3));
  for (let ring = 1; ring <= rings; ring += 1) {
    const r = (radius * ring) / rings;
    const count = Math.max(8, Math.ceil((Math.PI * 2 * r) / 1.25));
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      offsets.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }
  }
  return offsets;
}

function paintDilatedSilhouette(
  mask: HTMLCanvasElement,
  image: CanvasImageSource,
  padding: number,
  sourceWidth: number,
  sourceHeight: number,
  radius: number,
  color: string,
): boolean {
  const buffer = mask.getContext("2d");
  if (buffer === null) return false;
  buffer.save();
  buffer.setTransform(1, 0, 0, 1, 0, 0);
  buffer.globalCompositeOperation = "source-over";
  buffer.globalAlpha = 1;
  buffer.shadowColor = "transparent";
  buffer.shadowBlur = 0;
  buffer.clearRect(0, 0, mask.width, mask.height);
  for (const [dx, dy] of dilationOffsetsV7(radius))
    buffer.drawImage(
      image,
      padding + dx,
      padding + dy,
      sourceWidth,
      sourceHeight,
    );
  buffer.globalCompositeOperation = "source-in";
  buffer.fillStyle = color;
  buffer.fillRect(0, 0, mask.width, mask.height);
  buffer.restore();
  return true;
}

function renderGlow(
  buffer: CanvasRenderingContext2D,
  image: CanvasImageSource,
  glow: { readonly color: string; readonly alpha: number },
  blur: number,
  padding: number,
  sourceWidth: number,
  sourceHeight: number,
  clearSize: { readonly width: number; readonly height: number } | null = null,
  outline: DeviceOutline | null = null,
  mask: HTMLCanvasElement | null = null,
): void {
  buffer.save();
  buffer.setTransform(1, 0, 0, 1, 0, 0);
  if (clearSize !== null)
    buffer.clearRect(0, 0, clearSize.width, clearSize.height);
  buffer.globalCompositeOperation = "source-over";
  buffer.globalAlpha = glow.alpha;
  buffer.shadowColor = glow.color;
  buffer.shadowBlur = blur;
  buffer.shadowOffsetX = 0;
  buffer.shadowOffsetY = 0;
  if (outline === null || mask === null)
    buffer.drawImage(image, padding, padding, sourceWidth, sourceHeight);
  else {
    // The outer silhouette (the rim, or the band when there is no rim)
    // carries the aura; the band is then laid inside the rim.
    const rimColor = outline.rim > 0 ? outline.rimColor : null;
    if (
      paintDilatedSilhouette(
        mask,
        image,
        padding,
        sourceWidth,
        sourceHeight,
        outline.width + (rimColor === null ? 0 : outline.rim),
        rimColor ?? glow.color,
      )
    )
      buffer.drawImage(mask, 0, 0);
    buffer.shadowColor = "transparent";
    buffer.shadowBlur = 0;
    if (
      rimColor !== null &&
      paintDilatedSilhouette(
        mask,
        image,
        padding,
        sourceWidth,
        sourceHeight,
        outline.width,
        glow.color,
      )
    )
      buffer.drawImage(mask, 0, 0);
  }
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
  outline: DeviceOutline | null = null,
): void {
  const canvas = documentRoot.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const buffer = canvas.getContext("2d");
  if (buffer === null) return;
  const mask = outline === null ? null : documentRoot.createElement("canvas");
  if (mask !== null) {
    mask.width = width;
    mask.height = height;
  }
  renderGlow(
    buffer,
    image,
    glow,
    blur,
    padding,
    sourceWidth,
    sourceHeight,
    null,
    outline,
    mask,
  );
  if (mask !== null) {
    mask.width = 0;
    mask.height = 0;
  }
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
