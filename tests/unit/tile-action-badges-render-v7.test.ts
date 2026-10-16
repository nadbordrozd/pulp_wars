import { describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { TILE_WIDTH } from "../../src/render/canvas/geometry";
import { TARGET_HIGHLIGHTS_V7 } from "../../src/render/canvas/target-highlight-v7";
import {
  TILE_ACTION_BADGE_V7,
  drawTileActionBadgesV7,
  tileActionBadgeLayoutV7,
} from "../../src/render/canvas/tile-action-badges-v7";
import type {
  TileActionPlanV7,
  TileActionV7,
} from "../../src/render/canvas/tile-actions-v7";

const action = (
  id: string,
  style: TileActionV7["style"] = "ATTACK",
): TileActionV7 => ({
  id,
  label: id,
  icon: "frog",
  style,
  ability: id,
});

function plan(
  tiles: readonly { at: CoordV7; actions: readonly TileActionV7[] }[],
  compact = false,
): TileActionPlanV7 {
  return {
    unitId: 1,
    compact,
    tiles: tiles.map((tile) => ({
      ...tile,
      ownUnit: false,
      occupied: true,
      chooser: tile.actions.length > 1,
    })),
  };
}

/** A context that records its calls (and the fill colour at each arc). */
function recorder() {
  const calls: { readonly name: string; readonly args: unknown[] }[] = [];
  const state: Record<string, unknown> = {};
  const context = new Proxy(state, {
    get: (target, key) =>
      key in target
        ? Reflect.get(target, key)
        : (...args: unknown[]) => {
            calls.push({ name: String(key), args });
          },
    set: (target, key, value) => {
      calls.push({ name: `set:${String(key)}`, args: [value] });
      return Reflect.set(target, key, value);
    },
  });
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

describe("tile action badges", () => {
  const camera = { offsetX: 100, offsetY: 50, zoom: 0.75 };
  const size = TILE_WIDTH * camera.zoom;

  it("stand down the tile's right edge from its upper corner, clear of its middle", () => {
    const at = { x: 3, y: 2 };
    const [first, second] = tileActionBadgeLayoutV7(
      plan([{ at, actions: [action("ATTACK"), action("RIBBIT")] }]),
      camera,
    );
    const centreX = camera.offsetX + at.x * size;
    const centreY = camera.offsetY + at.y * size;
    for (const badge of [first, second]) {
      if (badge === undefined) throw new Error("missing badge");
      // Near the right edge, the whole badge on the tile.
      expect(badge.x + badge.radius).toBeLessThanOrEqual(centreX + size / 2);
      expect(badge.x).toBeGreaterThan(centreX + size / 4);
      expect(badge.y - badge.radius).toBeGreaterThanOrEqual(centreY - size / 2);
      expect(badge.y + badge.radius).toBeLessThanOrEqual(centreY + size / 2);
      // The unit in the middle of the tile stays visible.
      expect(Math.hypot(badge.x - centreX, badge.y - centreY)).toBeGreaterThan(
        size / 4,
      );
    }
    // The first action is in the corner, the next one under it.
    expect(first?.y).toBeLessThan(centreY - size / 4);
    expect(second?.y).toBeGreaterThan(first?.y ?? 0);
    expect(first?.x).toBe(second?.x);
  });

  it("sit in the middle of an empty tile, in a row in the chooser's order", () => {
    const at = { x: 1, y: 1 };
    const empty = plan([
      { at, actions: [action("MOVE", "MOVE"), action("TENTACLE", "PLACE")] },
    ]);
    const [first, second] = tileActionBadgeLayoutV7(
      {
        ...empty,
        tiles: empty.tiles.map((tile) => ({ ...tile, occupied: false })),
      },
      camera,
    );
    const centreX = camera.offsetX + at.x * size;
    const centreY = camera.offsetY + at.y * size;
    expect(first?.y).toBe(centreY);
    expect(second?.y).toBe(centreY);
    expect(first?.x).toBeLessThan(centreX);
    expect(second?.x).toBeGreaterThan(centreX);
    expect((first?.x ?? 0) + (second?.x ?? 0)).toBeCloseTo(2 * centreX);
    expect(first?.action?.id).toBe("MOVE");
  });

  it("are readable at the farthest zoom and shrink, not vanish, when many tiles are badged", () => {
    const far = { offsetX: 0, offsetY: 0, zoom: 0.625 };
    const one = plan([{ at: { x: 0, y: 0 }, actions: [action("RIBBIT")] }]);
    const [full] = tileActionBadgeLayoutV7(one, far);
    const [compact] = tileActionBadgeLayoutV7({ ...one, compact: true }, far);
    expect(full?.radius).toBeGreaterThanOrEqual(
      TILE_ACTION_BADGE_V7.minRadiusCssPx,
    );
    expect(compact?.radius).toBeLessThan(full?.radius ?? 0);
    expect(compact?.radius).toBeGreaterThanOrEqual(
      TILE_ACTION_BADGE_V7.compactMinRadiusCssPx,
    );
  });

  it("show the first actions and +N past the badges that fit", () => {
    const badges = tileActionBadgeLayoutV7(
      plan([
        {
          at: { x: 0, y: 0 },
          actions: ["A", "B", "C", "D"].map((id) => action(id)),
        },
      ]),
      camera,
    );
    expect(badges).toHaveLength(TILE_ACTION_BADGE_V7.maxPerTile);
    expect(badges.map((badge) => badge.action?.id ?? `+${badge.more}`)).toEqual(
      ["A", "B", "+2"],
    );
  });

  it("draws an action's registered icon in its disc once loaded, and its glyph until then (the join icon, pulp_wars-mch9.43)", () => {
    const join: TileActionV7 = {
      ...action("JOIN_CHANT", "SUPPORT"),
      icon: "candle",
      raster: "ICON:ACTION:JOIN_CHANT",
    };
    const board = plan([{ at: { x: 2, y: 2 }, actions: [join] }]);
    const image = { width: 48, height: 48 } as unknown as CanvasImageSource;
    const asked: string[] = [];
    const loaded = recorder();
    drawTileActionBadgesV7(loaded.context, board, camera, {
      raster: (subject) => {
        asked.push(subject);
        return image;
      },
    });
    expect(asked).toEqual(["ICON:ACTION:JOIN_CHANT"]);
    const drawn = loaded.calls.filter((call) => call.name === "drawImage");
    expect(drawn).toHaveLength(1);
    const [badge] = tileActionBadgeLayoutV7(board, camera);
    const side = (badge?.radius ?? 0) * TILE_ACTION_BADGE_V7.raster;
    expect(drawn[0]?.args).toEqual([
      image,
      (badge?.x ?? 0) - side / 2,
      (badge?.y ?? 0) - side / 2,
      side,
      side,
    ]);
    // The icon stays inside the disc and its rim.
    expect(side / 2).toBeLessThan(badge?.radius ?? 0);
    // Still loading: the candle glyph, no picture.
    const loading = recorder();
    drawTileActionBadgesV7(loading.context, board, camera, {
      raster: () => null,
    });
    expect(loading.calls.some((call) => call.name === "drawImage")).toBe(false);
  });

  it("rims each badge in the colour of its target's mark and writes no coordinate", () => {
    const { context, calls } = recorder();
    drawTileActionBadgesV7(
      context,
      plan([
        {
          at: { x: 4, y: 5 },
          actions: [
            action("MOVE", "MOVE"),
            action("CHANNEL", "SUPPORT"),
            action("TENTACLE", "PLACE"),
            action("RIBBIT", "ATTACK"),
          ],
        },
      ]),
      camera,
    );
    const rims = calls
      .filter((call) => call.name === "set:strokeStyle")
      .map((call) => call.args[0]);
    expect(rims).toEqual([
      TARGET_HIGHLIGHTS_V7.MOVE.stroke,
      TARGET_HIGHLIGHTS_V7.SUPPORT.stroke,
      TILE_ACTION_BADGE_V7.ink,
    ]);
    const words = calls
      .filter((call) => call.name === "fillText")
      .map((call) => call.args[0]);
    expect(words).toEqual(["+2"]);
  });
});
