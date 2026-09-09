import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  viewForV7,
  type CityId,
  type PlayerViewV7,
} from "../../src/engine/index";
import { RULESET7_FARM_ART_IDS } from "../../src/assets/ruleset7-ui-art";
import { farmPresentationV7 } from "../../src/render/canvas/board-renderer-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

const root = process.cwd();

describe("Ruleset 7 Farm assets", () => {
  it("records three accepted independent PixelLab recipes with opaque exact footprints", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(root, "scripts/art/pixellab-manifest.json"),
        "utf8",
      ),
    ) as { recipes: Array<Record<string, unknown>> };
    const generated = JSON.parse(
      await readFile(
        path.join(root, "scripts/art/pixellab-generated.json"),
        "utf8",
      ),
    ) as {
      records: Record<string, { status?: string; outputSha256?: string }>;
    };
    const expected = new Map([
      [RULESET7_FARM_ART_IDS.SINGLE, [256, 256]],
      [RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR, [512, 256]],
      [RULESET7_FARM_ART_IDS.VERTICAL_PAIR, [256, 512]],
    ]);
    for (const [id, [width, height]] of expected) {
      const recipe = manifest.recipes.find((candidate) => candidate.id === id);
      expect(recipe).toMatchObject({
        id,
        stage: "sample",
        class: "buildings",
        postprocess: "farm-full-rectangle",
        outputSize: { width, height },
        hardBounds: { left: 0, top: 0, right: width, bottom: height },
        squareFootprint: { left: 0, top: 0, right: width, bottom: height },
      });
      expect(generated.records[id]).toMatchObject({ status: "ACCEPTED" });
      const output = path.join(root, String(recipe?.output));
      const image = sharp(output);
      expect(await image.metadata()).toMatchObject({ width, height });
      const { channels } = await image.stats();
      expect(channels[3]?.min).toBe(255);
      const bytes = await readFile(output);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        generated.records[id]?.outputSha256,
      );
    }
    expect(
      manifest.recipes.find(
        (candidate) => candidate.id === RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR,
      ),
    ).toMatchObject({ styleReference: RULESET7_FARM_ART_IDS.SINGLE });
    expect(
      manifest.recipes.find(
        (candidate) => candidate.id === RULESET7_FARM_ART_IDS.VERTICAL_PAIR,
      ),
    ).toMatchObject({ styleReference: RULESET7_FARM_ART_IDS.SINGLE });
  });

  it("preserves the accepted v6 processed Farm unchanged", async () => {
    const bytes = await readFile(
      path.join(root, "public/assets/pixellab/buildings-square/farm.png"),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "34f46d4f1aad59200a53511dadfe460ba2ca465a7f4536985425d19b5cc03d0f",
    );
  });

  it("pairs canonical same-city revealed cardinal layouts without holes", () => {
    expect(layout([[1, 1]])).toEqual(["1,1:SINGLE"]);
    expect(
      layout([
        [1, 1],
        [2, 1],
      ]),
    ).toEqual(["1,1:HORIZONTAL_PAIR:0,0", "2,1:HORIZONTAL_PAIR:256,0"]);
    expect(
      layout([
        [1, 1],
        [1, 2],
      ]),
    ).toEqual(["1,1:VERTICAL_PAIR:0,0", "1,2:VERTICAL_PAIR:0,256"]);
    expect(
      layout([
        [1, 1],
        [2, 1],
        [1, 2],
      ]),
    ).toEqual([
      "1,1:HORIZONTAL_PAIR:0,0",
      "1,2:SINGLE",
      "2,1:HORIZONTAL_PAIR:256,0",
    ]);
    expect(
      layout([
        [1, 1],
        [2, 1],
        [3, 1],
        [2, 2],
      ]),
    ).toEqual([
      "1,1:HORIZONTAL_PAIR:0,0",
      "2,1:HORIZONTAL_PAIR:256,0",
      "2,2:SINGLE",
      "3,1:SINGLE",
    ]);
    expect(
      layout([
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ]),
    ).toEqual([
      "1,1:HORIZONTAL_PAIR:0,0",
      "1,2:HORIZONTAL_PAIR:0,0",
      "2,1:HORIZONTAL_PAIR:256,0",
      "2,2:HORIZONTAL_PAIR:256,0",
    ]);
    expect(
      layout([
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 1],
      ]),
    ).toEqual([
      "1,1:HORIZONTAL_PAIR:0,0",
      "2,1:HORIZONTAL_PAIR:256,0",
      "3,1:HORIZONTAL_PAIR:0,0",
      "4,1:HORIZONTAL_PAIR:256,0",
      "5,1:SINGLE",
    ]);
    expect(
      layout(
        [
          [5, 1],
          [4, 1],
          [3, 1],
          [2, 1],
          [1, 1],
        ],
        {},
        new Set(),
        true,
      ),
    ).toEqual(
      layout([
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 1],
      ]),
    );
  });

  it("recomputes presentation after removal, fog, pillage, or city ownership partition changes", () => {
    const pair = farmView([
      [1, 1],
      [2, 1],
    ]);
    expect(farmPresentationV7(pair).size).toBe(2);
    expect(
      layout(
        [
          [1, 1],
          [2, 1],
        ],
        { "2,1": 2 },
      ),
    ).toEqual(["1,1:SINGLE", "2,1:SINGLE"]);
    expect(
      layout(
        [
          [1, 1],
          [2, 1],
        ],
        {},
        new Set(["2,1"]),
      ),
    ).toEqual(["1,1:SINGLE"]);
    expect(layout([[1, 1]])).toEqual(["1,1:SINGLE"]);
  });
});

function farmView(
  coords: readonly (readonly [number, number])[],
  cityIds: Readonly<Record<string, number>> = {},
  hidden: ReadonlySet<string> = new Set(),
  reverseBoard = false,
): PlayerViewV7 {
  const state = exploredAllV7(initialV7(7721));
  const base = viewForV7(state, state.humanPlayerId);
  const selected = new Set(coords.map(([x, y]) => `${x},${y}`));
  return {
    ...base,
    board: {
      ...base.board,
      tiles: (reverseBoard
        ? [...base.board.tiles].reverse()
        : base.board.tiles
      ).map((tile) => {
        const key = `${tile.at.x},${tile.at.y}`;
        if (hidden.has(key)) return { at: tile.at, explored: false as const };
        if (!tile.explored) return tile;
        return {
          ...tile,
          improvement: selected.has(key) ? ("FARM" as const) : null,
          territoryCityId: selected.has(key)
            ? ((cityIds[key] ?? 1) as CityId)
            : tile.territoryCityId,
        };
      }),
    },
  };
}

function layout(
  coords: readonly (readonly [number, number])[],
  cityIds: Readonly<Record<string, number>> = {},
  hidden: ReadonlySet<string> = new Set(),
  reverseBoard = false,
): string[] {
  return [
    ...farmPresentationV7(farmView(coords, cityIds, hidden, reverseBoard)),
  ]
    .map(([key, value]) => {
      const name = Object.entries(RULESET7_FARM_ART_IDS).find(
        ([, id]) => id === value.assetId,
      )?.[0];
      return `${key}:${name}${
        value.sourceCrop === undefined
          ? ""
          : `:${value.sourceCrop.x},${value.sourceCrop.y}`
      }`;
    })
    .sort();
}
