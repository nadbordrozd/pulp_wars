import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  frozenByRetirement,
  planRetirement,
  retireFromManifestText,
  retirementProblems,
  submissionReceiptName,
  type RetirableGenerated,
  type RetirableSource,
} from "../../scripts/art/pixellab-retire";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function source(): RetirableSource {
  return {
    aliases: [{ id: "alias-ground", source: "ground" }],
    recipes: [
      {
        id: "ground",
        class: "terrain",
        output: "public/assets/pixellab/g.png",
      },
      {
        id: "old-icon",
        class: "ui",
        output: "public/assets/pixellab/ui/old.png",
        reframeSource: "art/pixellab/reframe-sources/old.png",
      },
      {
        id: "new-icon",
        class: "ui",
        output: "public/assets/pixellab/ui/new.png",
        postprocess: "lanczos3-resize",
        styleReference: "old-icon",
        reframeSource: "art/pixellab/reframe-sources/shared.png",
      },
      {
        id: "old-tree",
        class: "terrain",
        output: "public/assets/pixellab/tree.png",
        groundReference: "ground",
        reframeSource: "art/pixellab/reframe-sources/shared.png",
      },
      {
        id: "portrait",
        class: "ui",
        output: "public/assets/pixellab/ui/portrait.png",
        postprocess: "sprite-derived-portrait",
        styleReference: "old-tree",
      },
    ],
  };
}

function generated(): RetirableGenerated {
  return {
    records: {
      ground: { status: "ACCEPTED", outputSha256: HASH_B },
      "old-icon": {
        status: "ACCEPTED",
        outputSha256: HASH_A,
        candidate: "art/pixellab/candidates/old-icon.png",
        jobId: "job-accepted",
        rejectedAttempts: [
          {
            candidate: "art/pixellab/quarantine/old-icon-1.png",
            jobId: "job-rejected",
          },
        ],
      },
      "new-icon": {
        status: "ACCEPTED",
        candidate: "art/pixellab/candidates/new-icon.png",
        jobId: "job-new",
        request: { styleReference: { id: "old-icon", sha256: HASH_A } },
      },
      "old-tree": { status: "REJECTED", jobId: "job-tree" },
    },
  };
}

describe("retiring PixelLab recipes", () => {
  it("plans the files, jobs and frozen dependants of a retirement", () => {
    const plan = planRetirement(source(), generated(), ["old-icon"], "unused");
    expect(plan.retired).toEqual([
      {
        id: "old-icon",
        class: "ui",
        output: "public/assets/pixellab/ui/old.png",
        outputSha256: HASH_A,
        reason: "unused",
      },
    ]);
    expect(plan.files).toEqual([
      "art/pixellab/candidates/old-icon.png",
      "art/pixellab/quarantine/old-icon-1.png",
      "art/pixellab/reframe-sources/old.png",
      "public/assets/pixellab/ui/old.png",
    ]);
    expect(plan.jobIds).toEqual(["job-accepted", "job-rejected"]);
    expect(plan.frozen).toEqual(["new-icon"]);
  });

  it("records no hash for a recipe without an accepted raster and leaves shared files", () => {
    const plan = planRetirement(
      source(),
      generated(),
      ["old-tree", "portrait"],
      "unused",
    );
    expect(plan.retired[0]).toEqual({
      id: "old-tree",
      class: "terrain",
      output: "public/assets/pixellab/tree.png",
      reason: "unused",
    });
    // `shared.png` is still the reframe source of new-icon.
    expect(plan.files).toEqual([
      "public/assets/pixellab/tree.png",
      "public/assets/pixellab/ui/portrait.png",
    ]);
    expect(plan.frozen).toEqual([]);
  });

  it("refuses a retirement something still depends on", () => {
    const refuse =
      (ids: readonly string[], records = generated(), reason = "unused") =>
      (): unknown =>
        planRetirement(source(), records, ids, reason);
    expect(refuse([])).toThrow("at least one");
    expect(refuse(["old-icon"], generated(), " ")).toThrow("needs a reason");
    expect(refuse(["old-icon", "old-icon"])).toThrow("named twice");
    expect(refuse(["nothing"])).toThrow("Unknown recipe nothing");
    // An alias and a composed ground are live uses.
    expect(refuse(["ground"])).toThrow("Alias alias-ground");
    // A portrait is redrawn from its source's raster.
    expect(refuse(["old-tree"])).toThrow("portrait reads the raster");
    // A style reference survives only as a hash an accepted record holds.
    const unrecorded: RetirableGenerated = {
      records: {
        ...generated().records,
        "new-icon": { status: "ACCEPTED", request: {} },
      },
    };
    expect(refuse(["old-icon"], unrecorded)).toThrow(
      "new-icon has no accepted record holding the hash",
    );
    const candidate: RetirableGenerated = {
      records: {
        ...generated().records,
        "new-icon": {
          status: "CANDIDATE",
          request: { styleReference: { id: "old-icon", sha256: HASH_A } },
        },
      },
    };
    expect(refuse(["old-icon"], candidate)).toThrow("no accepted record");
  });

  it("refuses to retire the ground a staying recipe composes", () => {
    const withoutAlias = { ...source(), aliases: [] };
    expect(() =>
      planRetirement(withoutAlias, generated(), ["ground"], "unused"),
    ).toThrow("old-tree still composes ground as its groundReference");
  });

  it("rewrites the manifest text, keeping every staying recipe byte for byte", () => {
    const text = `{
  "schemaVersion": 1,
  "aliases": [{ "id": "a", "source": "kept" }],
  "recipes": [
    {
      "id": "kept",
      "requestSize": { "width": 1, "height": 2 },
      "prompt": "a ] tricky, \\"quoted\\" [ prompt"
    },
    { "id": "gone", "prompt": "recipes" },
    {
      "id": "last", "hardBounds": { "left": 0 } }
  ]
}
`;
    const gone = {
      id: "gone",
      class: "ui",
      output: "public/assets/pixellab/ui/gone.png",
      outputSha256: HASH_A,
      reason: "unused",
    };
    const retired = [gone];
    const once = retireFromManifestText(text, retired);
    expect(once).toContain(`    {
      "id": "kept",
      "requestSize": { "width": 1, "height": 2 },
      "prompt": "a ] tricky, \\"quoted\\" [ prompt"
    },
    {
      "id": "last", "hardBounds": { "left": 0 } }
  ]`);
    const parsed = JSON.parse(once) as {
      aliases: unknown[];
      retired: unknown[];
      recipes: { id: string }[];
    };
    expect(Object.keys(parsed)).toEqual([
      "schemaVersion",
      "aliases",
      "retired",
      "recipes",
    ]);
    expect(parsed.recipes.map(({ id }) => id)).toEqual(["kept", "last"]);
    expect(parsed.retired).toEqual(retired);
    // A later retirement appends to the list.
    const twice = JSON.parse(
      retireFromManifestText(once, [{ ...gone, id: "last" }]),
    ) as { retired: { id: string }[]; recipes: { id: string }[] };
    expect(twice.retired.map(({ id }) => id)).toEqual(["gone", "last"]);
    expect(twice.recipes.map(({ id }) => id)).toEqual(["kept"]);
    expect(() => retireFromManifestText(once, [gone])).toThrow(
      "missing from the source manifest",
    );
  });

  it("validates the retired list and the recipes frozen on it", () => {
    const base = source();
    const after: RetirableSource = {
      aliases: base.aliases ?? [],
      recipes: base.recipes.filter(({ id }) => id !== "old-icon"),
      retired: [
        {
          id: "old-icon",
          class: "ui",
          output: "public/assets/pixellab/ui/old.png",
          outputSha256: HASH_A,
          reason: "unused",
        },
      ],
    };
    const records = { ...generated().records };
    delete records["old-icon"];
    expect(retirementProblems(after, { records })).toEqual([]);
    const frozen = after.recipes.find(({ id }) => id === "new-icon");
    const free = after.recipes.find(({ id }) => id === "ground");
    if (frozen === undefined || free === undefined) throw new Error("fixture");
    expect(frozenByRetirement(after, frozen)).toBe(true);
    expect(frozenByRetirement(after, free)).toBe(false);
    expect(frozenByRetirement(base, frozen)).toBe(false);

    expect(retirementProblems(after, generated())).toEqual([
      "Retired recipe still has a record: old-icon",
    ]);
    expect(
      retirementProblems(
        { ...after, recipes: base.recipes },
        { records },
      ).sort(),
    ).toEqual([
      "Retired output is in use again: public/assets/pixellab/ui/old.png",
      "Retired recipe id is in use again: old-icon",
    ]);
    expect(
      retirementProblems(after, {
        records: { ...records, "new-icon": { status: "ACCEPTED" } },
      }),
    ).toEqual([
      "new-icon has no accepted record holding the hash of its style reference old-icon",
    ]);
    expect(
      retirementProblems(
        {
          ...after,
          retired: [
            {
              id: "x",
              class: "ui",
              output: "elsewhere/x.png",
              outputSha256: "short",
              reason: "",
            },
          ],
          recipes: [],
        },
        { records: {} },
      ),
    ).toEqual([
      "Retired output is outside the art folder: x",
      "Retired recipe has a malformed hash: x",
      "Retired recipe has no reason: x",
    ]);
  });

  it("names a submission receipt as the recovery store does", () => {
    expect(submissionReceiptName("job-1")).toBe(
      `${createHash("sha256").update("job-1").digest("hex")}.json`,
    );
  });
});

describe("the checked-in retirement of the legacy PixelLab art", () => {
  const manifest = JSON.parse(
    readFileSync("scripts/art/pixellab-manifest.json", "utf8"),
  ) as RetirableSource;
  const records = JSON.parse(
    readFileSync("scripts/art/pixellab-generated.json", "utf8"),
  ) as RetirableGenerated & { readonly sourceManifestSha256: string };

  it("is sound, complete and leaves no raster behind", () => {
    expect(retirementProblems(manifest, records)).toEqual([]);
    // 42 went with bead pulp_wars-67q.15 (the Ruleset 7 legacy art) and
    // the other 188 with bead pulp_wars-lky5 (the art of the retired
    // Ruleset 6 and legacy prototypes): every recipe this manifest held.
    expect(manifest.retired).toHaveLength(230);
    expect(manifest.recipes).toEqual([]);
    expect(manifest.aliases).toEqual([]);
    expect(Object.keys(records.records)).toEqual([]);
    const withoutHash: string[] = [];
    for (const entry of manifest.retired ?? []) {
      expect(existsSync(entry.output), entry.output).toBe(false);
      if (entry.outputSha256 === undefined) withoutHash.push(entry.id);
      else expect(entry.outputSha256, entry.id).toMatch(/^[a-f0-9]{64}$/);
    }
    // Two Fruit attempts were rejected and never had an accepted raster.
    expect(withoutHash).toEqual([
      "terrain-fruit-attempt-1",
      "terrain-fruit-attempt-2",
    ]);
    for (const folder of [
      "public/assets/pixellab",
      "art/pixellab/candidates",
      "art/pixellab/quarantine",
      "art/pixellab/reframe-sources",
      "src/assets/generated-art-manifest.ts",
    ])
      expect(existsSync(folder), folder).toBe(false);
  });

  it("keeps the hash of each accepted raster on record", () => {
    const hashOf = (id: string): string | undefined =>
      manifest.retired?.find((entry) => entry.id === id)?.outputSha256;
    // Hashes the art tests pinned while these rasters were drawn.
    expect(hashOf("building-square-farm")).toBe(
      "34f46d4f1aad59200a53511dadfe460ba2ca465a7f4536985425d19b5cc03d0f",
    );
    expect(hashOf("building-square-barracks")).toBe(
      "f924d1646ec42185ef42dbb79966e0405b2e619447365044bda8b2d46037fae6",
    );
    expect(hashOf("unit-original-catapult")).toBe(
      "67e7f8cb6fc9a36b385eed9aecc2a12fb2884701cb7661d5503f8dbcf373c360",
    );
  });

  it("keeps the generated manifest chained to the source text", () => {
    expect(records.sourceManifestSha256).toBe(
      createHash("sha256")
        .update(readFileSync("scripts/art/pixellab-manifest.json"))
        .digest("hex"),
    );
  });

  it("leaves no recipe frozen on a retired style reference", () => {
    // Defection and Blackout were frozen on the retired Disband and
    // Pillage icons; they are retired themselves now.
    expect(
      manifest.recipes.filter((recipe) => frozenByRetirement(manifest, recipe)),
    ).toEqual([]);
  });
});
