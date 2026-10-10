import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  viewForV7,
  type CityId,
  type PlayerViewV7,
} from "../../src/engine/index";
import { FARM_ART_KEYS_V7 } from "../../src/assets/art-keys-v7";
import { farmPresentationV7 } from "../../src/render/canvas/board-renderer-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

const root = process.cwd();

describe("Ruleset 7 Farm presentation", () => {
  it("retires the three legacy Farm rasters and keeps their keys apart", async () => {
    // Bead pulp_wars-67q.15: the board keys a Farm as single or paired; the
    // picture is the chibi Farm.
    const manifest = JSON.parse(
      await readFile(
        path.join(root, "scripts/art/pixellab-manifest.json"),
        "utf8",
      ),
    ) as {
      recipes: Array<{ id: string }>;
      retired: Array<{ id: string }>;
    };
    for (const id of [
      "building-ruleset7-farm-single",
      "building-ruleset7-farm-pair-horizontal",
      "building-ruleset7-farm-pair-vertical",
    ]) {
      expect(manifest.recipes.some((recipe) => recipe.id === id)).toBe(false);
      expect(manifest.retired.some((entry) => entry.id === id)).toBe(true);
    }
    expect(new Set(Object.values(FARM_ART_KEYS_V7)).size).toBe(3);
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
      const name = Object.entries(FARM_ART_KEYS_V7).find(
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
