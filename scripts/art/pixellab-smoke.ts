/** One nonproduction PixelLab request. Outputs stay outside this repository. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const API_BASE = "https://api.pixellab.ai/v2";
const ENDPOINT = "generate-image-v2";
const REQUEST = {
  description:
    "A single simple bright red apple with one green leaf, centered on a plain white background. Clean flat illustration, bold outline, no text or other objects.",
  image_size: { width: 256, height: 256 },
  no_background: false,
  seed: 20260921,
} as const;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 12 * 60_000;

function outputPath(): string {
  const args = process.argv.slice(2);
  if (
    args.length !== 0 &&
    (args.length !== 2 || args[0] !== "--output" || !args[1])
  ) {
    throw new Error("Usage: pixellab-smoke.ts [--output /absolute/path.png]");
  }
  const output = path.resolve(
    args[1] ?? path.join(os.tmpdir(), "pulp-wars-pixellab-smoke.png"),
  );
  const repository = path.resolve(process.cwd());
  if (output === repository || output.startsWith(`${repository}${path.sep}`)) {
    throw new Error("Smoke output must be outside the repository");
  }
  if (path.extname(output).toLowerCase() !== ".png") {
    throw new Error("Smoke output must have a .png extension");
  }
  return output;
}

function property(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

function imageBase64(value: unknown): string | null {
  if (typeof value === "string" && value.includes("base64,")) return value;
  if (typeof value !== "object" || value === null) return null;
  const direct = property(value, "base64");
  if (typeof direct === "string" && direct.length > 100) return direct;
  for (const nested of Object.values(value)) {
    const found = imageBase64(nested);
    if (found !== null) return found;
  }
  return null;
}

async function main(): Promise<void> {
  const output = outputPath();
  const apiKey = process.env.PIXELLAB_API_KEY;
  if (!apiKey) throw new Error("PIXELLAB_API_KEY is missing");

  const startResponse = await fetch(`${API_BASE}/${ENDPOINT}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(REQUEST),
  });
  // Do not print provider response bodies: they may contain image data or account details.
  if (!startResponse.ok)
    throw new Error(`PixelLab POST returned HTTP ${startResponse.status}`);
  const start: unknown = await startResponse.json();
  const jobId = property(start, "background_job_id");
  if (typeof jobId !== "string" || !jobId) {
    throw new Error("PixelLab response did not contain background_job_id");
  }

  let result: unknown;
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await fetch(
      `${API_BASE}/background-jobs/${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
    if (!response.ok)
      throw new Error(`PixelLab poll returned HTTP ${response.status}`);
    const job: unknown = await response.json();
    const status = property(job, "status");
    if (status === "failed") throw new Error("PixelLab background job failed");
    if (status === "completed") {
      result = property(job, "last_response") ?? job;
      break;
    }
  }
  if (result === undefined)
    throw new Error("PixelLab background job timed out");

  const encoded = imageBase64(result);
  if (encoded === null)
    throw new Error("Completed PixelLab job contained no base64 image");
  const payload = encoded.includes("base64,")
    ? encoded.slice(encoded.indexOf("base64,") + 7)
    : encoded;
  const input = Buffer.from(payload, "base64");
  const image = sharp(input);
  const metadata = await image.metadata();
  if (
    metadata.width !== REQUEST.image_size.width ||
    metadata.height !== REQUEST.image_size.height
  ) {
    throw new Error(
      `Unexpected PixelLab dimensions: ${metadata.width}x${metadata.height}`,
    );
  }
  const png = await image.png().toBuffer();
  const sha256 = createHash("sha256").update(png).digest("hex");
  const requestMetadata = {
    provider: "PixelLab",
    apiBaseUrl: API_BASE,
    endpoint: ENDPOINT,
    model: ENDPOINT,
    request: REQUEST,
    output,
    outputSha256: sha256,
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, png);
  await writeFile(
    `${output}.request.json`,
    `${JSON.stringify(requestMetadata, null, 2)}\n`,
  );
  console.log(
    `PixelLab smoke generation succeeded: ${output} (${metadata.width}x${metadata.height}, sha256 ${sha256})`,
  );
  console.log(`Request metadata: ${output}.request.json`);
}

main().catch((error: unknown) => {
  // Error objects from HTTP clients can include request headers; print only our own message.
  console.error(
    error instanceof Error ? error.message : "PixelLab smoke generation failed",
  );
  process.exitCode = 1;
});
