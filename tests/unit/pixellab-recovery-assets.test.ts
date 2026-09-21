import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertRecoveryReference,
  loadSubmissionReceipt,
  resolveRecoveryRequest,
  saveSubmissionReceipt,
  type JobSnapshot,
} from "../../scripts/art/pixellab-recovery";

const hash = (bytes: string | Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");
const request = {
  prompt: "Historical provider prompt",
  styleReference: {
    id: "style",
    sha256: hash("submitted style"),
    usageDescription: "Copy palette",
  },
  groundReference: {
    id: "ground",
    sha256: hash("selected ground"),
    usageDescription: "Local ground composition",
  },
};
const current = {
  ...request,
  styleReference: { id: "style", usageDescription: "Copy palette" },
  groundReference: {
    id: "ground",
    usageDescription: "Local ground composition",
  },
};
const recorded = { id: "asset", jobId: "job", request };
const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "pulp-wars-recovery-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("PixelLab job recovery provenance", () => {
  it("rejects an unrecorded job even when current reference hashes are available", () => {
    expect(() => resolveRecoveryRequest("asset", "job", request)).toThrow(
      "unknown historical request",
    );
  });

  it("preserves the exact same-job request without assigning current hashes", () => {
    const changedCurrent = {
      ...current,
      styleReference: { ...current.styleReference, sha256: hash("new style") },
      groundReference: {
        ...current.groundReference,
        sha256: hash("new ground"),
      },
    };
    expect(
      resolveRecoveryRequest("asset", "job", changedCurrent, recorded),
    ).toBe(request);
  });

  it.each([
    { ...recorded, jobId: "another-job" },
    { ...recorded, id: "another-asset" },
    { id: "asset", jobId: "job" },
  ])("rejects an unrelated or incomplete prior record: %j", (previous) => {
    expect(() =>
      resolveRecoveryRequest("asset", "job", current, previous),
    ).toThrow("unknown historical request");
  });

  it.each(["styleReference", "groundReference"] as const)(
    "rejects unknown %s bytes instead of filling from current metadata",
    (name) => {
      const incomplete = {
        ...recorded,
        request: { ...request, [name]: current[name] },
      };
      expect(() =>
        resolveRecoveryRequest<typeof current>(
          "asset",
          "job",
          request,
          incomplete,
        ),
      ).toThrow(`unknown historical ${name} hash`);
    },
  );

  it("rejects changed recipe metadata without rewriting the old prompt", () => {
    expect(() =>
      resolveRecoveryRequest(
        "asset",
        "job",
        { ...current, prompt: "Changed" },
        recorded,
      ),
    ).toThrow("current recipe differs");
    expect(request.prompt).toBe("Historical provider prompt");
  });

  it.each(["styleReference", "groundReference"] as const)(
    "rejects changed %s bytes used by local processing",
    (name) => {
      expect(() =>
        assertRecoveryReference(
          "asset",
          name,
          request[name],
          Buffer.from("changed"),
        ),
      ).toThrow(`${name} bytes changed`);
      const original =
        name === "styleReference" ? "submitted style" : "selected ground";
      expect(() =>
        assertRecoveryReference(
          "asset",
          name,
          request[name],
          Buffer.from(original),
        ),
      ).not.toThrow();
    },
  );

  it("recovers an interrupted job from a durable receipt without a prior record", async () => {
    const directory = await temporaryDirectory();
    await saveSubmissionReceipt(directory, "asset", "job", request);
    const submission = await loadSubmissionReceipt<typeof request>(
      directory,
      "job",
    );
    expect(
      resolveRecoveryRequest("asset", "job", current, undefined, submission),
    ).toEqual(request);
    // An unrelated previous attempt must never override the matching receipt.
    expect(
      resolveRecoveryRequest(
        "asset",
        "job",
        current,
        { ...recorded, jobId: "old" },
        submission,
      ),
    ).toEqual(request);
    expect(await loadSubmissionReceipt(directory, "missing")).toBeUndefined();
    const [file] = await readdir(directory);
    if (file === undefined) throw new Error("Receipt file missing");
    expect(
      JSON.parse(await readFile(path.join(directory, file), "utf8")),
    ).toEqual(recorded);
  });

  it("does not overwrite an existing receipt, even for the same job", async () => {
    const directory = await temporaryDirectory();
    await saveSubmissionReceipt(directory, "asset", "job", request);
    await expect(
      saveSubmissionReceipt(directory, "other", "job", current),
    ).rejects.toMatchObject({ code: "EEXIST" });
    expect(await loadSubmissionReceipt(directory, "job")).toEqual(recorded);
  });

  it("rejects conflicting and mismatched receipts", () => {
    expect(() =>
      resolveRecoveryRequest("asset", "job", current, recorded, {
        ...recorded,
        jobId: "other",
      }),
    ).toThrow("does not match");
    expect(() =>
      resolveRecoveryRequest("asset", "job", current, recorded, {
        ...recorded,
        request: current,
      }),
    ).toThrow("conflicting request provenance");
  });

  it("rejects an incomplete submission receipt", () => {
    expect(() =>
      resolveRecoveryRequest("asset", "job", current, undefined, {
        ...recorded,
        request: current,
      }),
    ).toThrow("unknown historical styleReference hash");
  });

  it("rejects a truncated receipt without echoing its contents", async () => {
    const directory = await temporaryDirectory();
    await saveSubmissionReceipt(directory, "asset", "job", request);
    const [file] = await readdir(directory);
    if (file === undefined) throw new Error("Receipt file missing");
    await writeFile(path.join(directory, file), '{"truncated');
    await expect(loadSubmissionReceipt(directory, "job")).rejects.toThrow(
      "Invalid PixelLab submission receipt; recovery refused",
    );
  });
});

describe("PixelLab interrupted CLI recovery", () => {
  it("persists submitted style bytes before polling and recovers after reference replacement", async () => {
    const directory = await temporaryDirectory();
    const root = process.cwd();
    const sourcePath = "scripts/art/pixellab-manifest.json";
    const generatedPath = "scripts/art/pixellab-generated.json";
    const source = JSON.parse(await readFile(sourcePath, "utf8")) as {
      recipes: { id: string; output: string; styleReference?: string }[];
    };
    const generated = JSON.parse(await readFile(generatedPath, "utf8")) as {
      records: Record<string, JobSnapshot<typeof request>>;
    };
    const recipe = source.recipes.find(
      ({ id }) => id === "ui-action-defection",
    );
    if (recipe === undefined) throw new Error("Defection fixture missing");
    const reference = source.recipes.find(
      ({ id }) => id === recipe.styleReference,
    );
    if (reference === undefined) throw new Error("Style fixture missing");
    Reflect.deleteProperty(generated.records, recipe.id);
    await mkdir(path.join(directory, "scripts/art"), { recursive: true });
    await copyFile(sourcePath, path.join(directory, sourcePath));
    await writeFile(
      path.join(directory, generatedPath),
      JSON.stringify(generated),
    );
    await mkdir(path.dirname(path.join(directory, reference.output)), {
      recursive: true,
    });
    await copyFile(reference.output, path.join(directory, reference.output));
    const originalReferenceHash = hash(await readFile(reference.output));
    // This fixture is only returned by mocked fetch; no provider is contacted.
    await copyFile(recipe.output, path.join(directory, "provider.png"));
    const runner = path.join(directory, "mock-provider.mjs");
    await writeFile(
      runner,
      `
import { readFileSync } from "node:fs";
const timeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, _delay, ...args) => timeout(callback, 0, ...args);
globalThis.fetch = async (_url, options) => {
  if (options?.method === "POST") return Response.json({ background_job_id: "fixture-job" });
  if (process.argv[2] === "generate") process.exit(0);
  return Response.json({ status: "completed", last_response: {
    base64: "data:image/png;base64," + readFileSync("provider.png").toString("base64")
  } });
};
await import(${JSON.stringify(pathToFileURL(path.join(root, "scripts/art/pixellab.ts")).href)});
`,
    );
    const run = (...args: string[]): string =>
      execFileSync(
        process.execPath,
        [
          "--import",
          pathToFileURL(path.join(root, "node_modules/tsx/dist/loader.mjs"))
            .href,
          runner,
          ...args,
        ],
        {
          cwd: directory,
          env: { ...process.env, PIXELLAB_API_KEY: "fixture-only" },
          encoding: "utf8",
          stdio: "pipe",
        },
      );
    const untouchedManifest = await readFile(
      path.join(directory, generatedPath),
      "utf8",
    );
    expect(() =>
      run("resume-job", "--id", recipe.id, "--job-id", "unrecorded-job"),
    ).toThrow("unknown historical request");
    expect(await readFile(path.join(directory, generatedPath), "utf8")).toBe(
      untouchedManifest,
    );
    expect(
      run(
        "generate",
        "--stage",
        "batch",
        "--ids",
        `${recipe.id},ui-action-blackout`,
      ),
    ).toContain("submitted job fixture-job");
    const receipt = await loadSubmissionReceipt<typeof request>(
      path.join(directory, "art/pixellab/submissions"),
      "fixture-job",
    );
    expect(receipt?.request?.styleReference.sha256).toBe(originalReferenceHash);
    expect(
      JSON.parse(await readFile(path.join(directory, generatedPath), "utf8"))
        .records[recipe.id],
    ).toBeUndefined();
    await writeFile(
      path.join(directory, reference.output),
      "replacement style bytes",
    );
    expect(
      run("resume-job", "--id", recipe.id, "--job-id", "fixture-job"),
    ).toContain("resumed candidate ready");
    const recovered = JSON.parse(
      await readFile(path.join(directory, generatedPath), "utf8"),
    ).records[recipe.id];
    expect(recovered.request).toEqual(receipt?.request);
    expect(recovered.request.styleReference.sha256).toBe(originalReferenceHash);
    expect(recovered.status).toBe("CANDIDATE");
  });
});
