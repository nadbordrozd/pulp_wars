/**
 * PixelLab's top-down tileset endpoint (bead pulp_wars-2yc.50; schema read
 * from https://api.pixellab.ai/v2/openapi.json on 2026-10-14, operation
 * `generate_tileset_create_tileset_post`, and the tool page
 * https://www.pixellab.ai/docs/tools/create-tileset).
 *
 * `POST /v2/create-tileset` takes two terrain descriptions, `lower` and
 * `upper`, and answers at once with `{ background_job_id, tileset_id,
 * status: "processing" }`. The job is polled at `GET /v2/background-jobs/
 * {id}` until `completed` or `failed`; the tiles are then read from
 * `GET /v2/tilesets/{tileset_id}` (HTTP 423 while it is still being made):
 * 16 Wang corner tiles (25 with `transition_size` 1), each with its
 * `corners` (`NW`, `NE`, `SW`, `SE`: "lower" or "upper") and a base64 PNG.
 * A map is a grid of vertices, one terrain a vertex; a cell takes the tile
 * whose four corners match its four vertices, so tiles meet without a seam
 * by construction.
 *
 * The key is read from the `PIXELLAB_API_KEY` environment variable and is
 * never written anywhere: a receipt holds the request with the palette
 * image as a path and hash.
 */
import process from "node:process";
import {
  CHIBI_API_BASE_URL,
  CHIBI_CREDENTIAL_VARIABLE,
  MAX_POLL_MS,
  POLL_INTERVAL_MS,
  safeError,
} from "./pipeline";

export type TilesetCorner = "lower" | "upper" | "transition";

/** The request body of `POST /v2/create-tileset`, as far as it is used. */
export interface TilesetRequestBody {
  readonly lower_description: string;
  readonly upper_description: string;
  readonly transition_description?: string;
  readonly mode?: "standard" | "pro";
  readonly tile_size: { readonly width: number; readonly height: number };
  readonly transition_size: number;
  readonly view?: "high top-down" | "low top-down";
  readonly outline?: string;
  readonly shading?: string;
  readonly detail?: string;
  readonly text_guidance_scale?: number;
  readonly raggedness?: number;
  readonly roundness?: number;
  readonly boundary_amplitude?: number;
  readonly boundary_seed?: number;
  readonly shape_style?: "square" | "round";
  readonly color_image?: {
    readonly type: "base64";
    readonly base64: string;
    readonly format: "png";
  };
  readonly seed: number;
}

export interface TilesetTile {
  readonly name: string;
  readonly corners: Readonly<Record<"NW" | "NE" | "SW" | "SE", TilesetCorner>>;
  readonly png: Buffer;
}

export interface TilesetResult {
  readonly tilesetId: string;
  readonly jobId: string;
  readonly tiles: readonly TilesetTile[];
  /** The tileset's own metadata, as PixelLab returned it. */
  readonly metadata: unknown;
  readonly usageUsd?: number;
}

function key(): string {
  const value = process.env[CHIBI_CREDENTIAL_VARIABLE];
  if (!value)
    throw new Error(
      `${CHIBI_CREDENTIAL_VARIABLE} is missing from the environment`,
    );
  return value;
}

function property(value: unknown, name: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, name)
    : undefined;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Submits a tileset; returns its job and tileset ids at once. */
export async function submitTileset(
  body: TilesetRequestBody,
): Promise<{ readonly jobId: string; readonly tilesetId: string }> {
  const response = await fetch(`${CHIBI_API_BASE_URL}/create-tileset`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `create-tileset returned HTTP ${response.status}: ${await safeError(response)}`,
    );
  const start = (await response.json()) as unknown;
  const jobId = property(start, "background_job_id");
  const tilesetId = property(start, "tileset_id");
  if (typeof jobId !== "string" || typeof tilesetId !== "string")
    throw new Error("create-tileset answered without a job or tileset id");
  return { jobId, tilesetId };
}

/**
 * Waits for the job, then reads the tileset. A dropped connection or a 5xx
 * is retried until the deadline: the job is already paid for.
 */
export async function awaitTileset(
  jobId: string,
  tilesetId: string,
): Promise<TilesetResult> {
  const deadline = Date.now() + MAX_POLL_MS;
  const headers = { Authorization: `Bearer ${key()}` };
  let usageUsd: number | undefined;
  for (;;) {
    if (Date.now() > deadline)
      throw new Error(`tileset job ${jobId} timed out`);
    await wait(POLL_INTERVAL_MS);
    let poll: Response;
    try {
      poll = await fetch(
        `${CHIBI_API_BASE_URL}/background-jobs/${encodeURIComponent(jobId)}`,
        { headers },
      );
    } catch {
      continue;
    }
    if (poll.status >= 500 || poll.status === 429) continue;
    if (!poll.ok)
      throw new Error(
        `background-jobs returned HTTP ${poll.status}: ${await safeError(poll)}`,
      );
    const job = (await poll.json()) as unknown;
    const usage = property(property(job, "usage"), "usd");
    if (typeof usage === "number") usageUsd = usage;
    const status = property(job, "status");
    if (status === "failed") throw new Error(`tileset job ${jobId} failed`);
    if (status === "completed") break;
  }
  for (;;) {
    if (Date.now() > deadline)
      throw new Error(`tileset ${tilesetId} was not ready in time`);
    let response: Response;
    try {
      response = await fetch(
        `${CHIBI_API_BASE_URL}/tilesets/${encodeURIComponent(tilesetId)}`,
        { headers },
      );
    } catch {
      await wait(POLL_INTERVAL_MS);
      continue;
    }
    if (response.status === 423 || response.status >= 500) {
      await wait(POLL_INTERVAL_MS);
      continue;
    }
    if (!response.ok)
      throw new Error(
        `tilesets returned HTTP ${response.status}: ${await safeError(response)}`,
      );
    const answer = (await response.json()) as unknown;
    const tileset = property(answer, "tileset");
    const list = property(tileset, "tiles");
    if (!Array.isArray(list)) throw new Error("the tileset holds no tiles");
    const tiles = list.map((tile: unknown, index): TilesetTile => {
      const image = property(tile, "image");
      const encoded =
        property(image, "base64") ?? property(tile, "image_data") ?? "";
      if (typeof encoded !== "string" || encoded.length === 0)
        throw new Error(`tile ${index} has no image`);
      const payload = encoded.includes("base64,")
        ? encoded.slice(encoded.indexOf("base64,") + 7)
        : encoded;
      const corners = property(tile, "corners") as TilesetTile["corners"];
      const name = property(tile, "name");
      return {
        name: typeof name === "string" ? name : `tile-${index}`,
        corners,
        png: Buffer.from(payload, "base64"),
      };
    });
    return {
      tilesetId,
      jobId,
      tiles,
      metadata: property(answer, "metadata") ?? null,
      ...(usageUsd === undefined ? {} : { usageUsd }),
    };
  }
}
