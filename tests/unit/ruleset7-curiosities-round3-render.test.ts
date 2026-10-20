import { describe, expect, it } from "vitest";
import {
  MOON_GUN_DANGER_LABEL_V7,
  type CuriosityPickV7,
} from "../../src/render/canvas/curiosity-board-plan-v7";
import {
  previewZapV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanV7,
  type BoardSelectionV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  curiosityStatusLineV7,
  zapTargetLabelV7,
} from "../../src/render/curiosity-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  ROUND3_UI_V7,
  round3UiFixtureV7,
} from "../fixtures/v7-curiosities-round3-ui";

/**
 * Map curiosities round 3 on the board (bead pulp_wars-737.20,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 12.1;
 * docs/ui/BOARD_TARGETING.md section 3.10), on the hand-built round-3 UI
 * board: the plan's entries (a staked Claim's owner colour, a played-out
 * Claim and a found Expedition dimmed), the Tower's and the Gun's range
 * outlines, the Zap targets with the previewed damage and the Moon Gun
 * landings with the threat marker, the live rasters and corner badges,
 * the classic code markers, and the dock's state lines.
 */
type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    { measureText: () => ({ width: 20 }) },
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                log.push([String(key), ...args]);
              },
      set: (target, key, value) => {
        log.push(["set", String(key), value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as unknown as CanvasRenderingContext2D, log };
}

const liveArt: ChibiBoardArtV7 = {
  resolve: (request) => {
    const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(request.subject)[0];
    return asset === undefined
      ? { kind: "MISSING" }
      : {
          kind: "READY",
          asset,
          image: { assetId: asset.id } as unknown as CanvasImageSource,
          density: 1,
          smoothing: false,
          cacheKey: asset.id,
        };
  },
};
const classicArt: ChibiBoardArtV7 = { resolve: () => ({ kind: "MISSING" }) };

const camera = { zoom: chibiCameraZoom(1), offsetX: 40, offsetY: 40 };

const AT = ROUND3_UI_V7;
const P1 = 1 as PlayerId;
const P2 = 2 as PlayerId;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** The fixture with its curiosity on `at` replaced. */
function withMarker(
  state: GameStateV7,
  marker: GameStateV7["curiosities"][number],
): GameStateV7 {
  return checkedV7({
    ...state,
    curiosities: state.curiosities.map((entry) =>
      same(entry.at, marker.at) ? marker : entry,
    ),
  });
}

function unitAt(state: GameStateV7, at: CoordV7) {
  const unit = state.units.find((candidate) => same(candidate.at, at));
  if (unit === undefined) throw new Error("no unit there");
  return unit;
}

function plan(
  state: GameStateV7,
  selection: BoardSelectionV7 | null = null,
  curiosityPick?: CuriosityPickV7,
): BoardRenderPlanV7 {
  const view = viewForV7(state, state.humanPlayerId);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection,
    selectedUnitId: selection?.kind === "UNIT" ? selection.unitId : null,
    selectedAchievement: null,
    ...(curiosityPick === undefined ? {} : { curiosityPick }),
  });
}

function draw(look: "LIVE" | "CLASSIC", board: BoardRenderPlanV7): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1800, height: 1800 },
    devicePixelRatio: 1,
    camera,
    plan: {
      ...board,
      entries: board.entries.filter((entry) => entry.kind !== "TERRAIN"),
    },
    reducedMotion: true,
    chibiArt: classicArt,
    ...(look === "LIVE"
      ? {
          direction: {
            spec: LIVE_DIRECTION_V7,
            art: createDirectedChibiArtV7({
              base: classicArt,
              samples: liveArt,
              direction: LIVE_DIRECTION_V7,
              environment: {
                readPixels: (_image, width, height) =>
                  new Uint8ClampedArray(width * height * 4).fill(200),
                createSurface: (pixels, width, height) =>
                  ({ pixels, width, height }) as unknown as CanvasImageSource,
              },
            }),
          },
        }
      : {}),
  });
  return log;
}

const imagesDrawn = (log: readonly LogEntry[]): string[] =>
  log
    .filter((call) => call[0] === "drawImage")
    .map((call) => (call[1] as { assetId?: string }).assetId ?? "?");

describe("curiosities round three in the board plan", () => {
  it("adds the four kinds, the Claim with its owner's colour", () => {
    const entries = plan(round3UiFixtureV7()).entries.filter(
      (entry) => entry.kind === "CURIOSITY",
    );
    expect(entries.map((entry) => entry.artSubject).sort()).toEqual([
      "CURIOSITY:GOLD_CLAIM",
      "CURIOSITY:LOST_EXPEDITION",
      "CURIOSITY:MOON_GUN",
      "CURIOSITY:TESLA_TOWER",
    ]);
    const claim = entries.find((entry) => entry.curiosity === "GOLD_CLAIM");
    expect(claim?.ownerColor).toBeDefined();
    expect(claim?.curiosityDimmed).toBeUndefined();
    expect(
      entries.filter((entry) => entry.curiosity !== "GOLD_CLAIM"),
    ).toSatisfy((others: typeof entries) =>
      others.every((entry) => entry.ownerColor === undefined),
    );
  });

  it("dims a played-out Claim and a found Expedition", () => {
    const state = withMarker(
      withMarker(round3UiFixtureV7(), {
        kind: "GOLD_CLAIM",
        at: AT.claim,
        ownerId: null,
        left: 0,
      }),
      { kind: "LOST_EXPEDITION", at: AT.expedition, foundBy: P2 },
    );
    const entries = plan(state).entries.filter(
      (entry) => entry.kind === "CURIOSITY",
    );
    for (const kind of ["GOLD_CLAIM", "LOST_EXPEDITION"] as const) {
      const entry = entries.find((candidate) => candidate.curiosity === kind);
      expect(entry?.curiosityDimmed, kind).toBe(true);
      expect(entry?.ownerColor, kind).toBeUndefined();
    }
  });

  it("outlines the Tower's zap range and the Gun's landing range when selected", () => {
    const state = round3UiFixtureV7();
    const range = (at: CoordV7) =>
      plan(state, { kind: "TILE", at }).entries.filter(
        (entry) =>
          entry.kind === "ABILITY_AREA" &&
          entry.abilityStyle === "CURIOSITY_RANGE",
      );
    // Within 2 of (9, 9): 5 x 5 tiles.
    expect(range(AT.tower)).toHaveLength(25);
    // Within 5 of (4, 10), clipped at the board's left edge: 10 x 11.
    expect(range(AT.gun)).toHaveLength(110);
    expect(range(AT.claim)).toHaveLength(0);
  });

  it("aims the Zap at each hostile unit within 2, with the exact damage", () => {
    const state = round3UiFixtureV7();
    const gunner = unitAt(state, AT.gunner);
    const board = plan(
      state,
      { kind: "UNIT", unitId: gunner.id },
      { kind: "ZAP", unitId: gunner.id },
    );
    const zaps = board.targets.filter((target) => target.family === "ZAP");
    const view = viewForV7(state, state.humanPlayerId);
    const preview = previewZapV7(view, gunner.id);
    expect(zaps).toHaveLength(preview?.targets.length ?? -1);
    for (const zap of zaps) {
      const hit = preview?.targets.find(
        (entry) =>
          zap.command.kind === "ZAP" &&
          entry.targetUnitId === zap.command.targetUnitId,
      );
      if (hit === undefined) throw new Error("no preview");
      expect(zap.previewLabel).toBe(zapTargetLabelV7(hit));
      expect(targetHighlightStyleV7(zap.family)).toBe("ATTACK");
    }
    expect(
      zaps.find((zap) => same(zap.at, AT.wounded))?.previewSkullBefore,
    ).toEqual(["KO"]);
    // Not armed: no Zap target, the unit's ordinary marks only.
    expect(
      plan(state, { kind: "UNIT", unitId: gunner.id }).targets.some(
        (target) => target.family === "ZAP",
      ),
    ).toBe(false);
  });

  it("aims the Fire at every offered landing, the risky ones with the threat marker and no label", () => {
    const state = round3UiFixtureV7();
    const knight = unitAt(state, AT.knight);
    const board = plan(
      state,
      { kind: "UNIT", unitId: knight.id },
      { kind: "FIRE_MOON_GUN", unitId: knight.id },
    );
    const landings = board.targets.filter(
      (target) => target.family === "MOON_GUN",
    );
    const view = viewForV7(state, state.humanPlayerId);
    expect(landings).toHaveLength(
      queryPlayerCommandsV7(view).filter(
        (command) =>
          command.kind === "FIRE_MOON_GUN" && command.unitId === knight.id,
      ).length,
    );
    expect(targetHighlightStyleV7("MOON_GUN")).toBe("MOVE");
    for (const landing of landings)
      expect(landing.previewLabel, JSON.stringify(landing.at)).toBeUndefined();
    // The enemy Guard at (9, 11) reaches the landings beside it.
    const risky = landings.filter((landing) => landing.provokes === true);
    expect(risky.length).toBeGreaterThan(0);
    for (const landing of risky)
      expect(landing.semanticLabel).toContain(
        MOON_GUN_DANGER_LABEL_V7.toLowerCase(),
      );
    expect(
      landings.find((landing) => same(landing.at, { x: 0, y: 6 }))?.provokes,
    ).toBeUndefined();
  });
});

describe("curiosities round three on the canvas", () => {
  it("LIVE: draws the four rasters, and the corner badge of a kind under a unit", () => {
    const images = imagesDrawn(draw("LIVE", plan(round3UiFixtureV7())));
    const times = (id: string) =>
      images.filter((candidate) => candidate === id).length;
    // The Tower and the Gun each hold a unit: the overlay again as the
    // corner badge over it. Nobody stands on the Claim or the Expedition.
    expect(times("chibi-curiosity-tesla-tower")).toBe(2);
    expect(times("chibi-curiosity-moon-gun")).toBe(2);
    expect(times("chibi-curiosity-gold-claim")).toBe(1);
    expect(times("chibi-curiosity-lost-expedition")).toBe(1);
  });

  it("CLASSIC: draws code markers and no curiosity raster", () => {
    const log = draw("CLASSIC", plan(round3UiFixtureV7()));
    expect(
      imagesDrawn(log).filter((id) => id.startsWith("chibi-curiosity")),
    ).toEqual([]);
    expect(log.filter((entry) => entry[0] === "stroke").length).toBeGreaterThan(
      8,
    );
  });
});

describe("curiosities round three: the dock's words", () => {
  it("states each kind's line, for the viewer", () => {
    const base = round3UiFixtureV7();
    const line = (state: GameStateV7, at: CoordV7) =>
      curiosityStatusLineV7(viewForV7(state, state.humanPlayerId), at);
    expect(line(base, AT.tower)).toMatch(
      /zap an enemy within 2 for 16, then the lightning jumps on: 8 · 4 · 2 · 1/,
    );
    expect(line(base, AT.gun)).toMatch(/^Loaded · /);
    expect(
      line(
        withMarker(base, {
          kind: "MOON_GUN",
          at: AT.gun,
          lastFired: { round: base.round, playerId: P1 },
        }),
        AT.gun,
      ),
    ).toMatch(/^Reloading · /);
    expect(line(base, AT.claim)).toBe("The Goblins' · 18 Coins left");
    expect(
      line(
        withMarker(base, {
          kind: "GOLD_CLAIM",
          at: AT.claim,
          ownerId: P1,
          left: 4,
        }),
        AT.claim,
      ),
    ).toBe("Yours · 4 Coins left");
    expect(
      line(
        withMarker(base, {
          kind: "GOLD_CLAIM",
          at: AT.claim,
          ownerId: null,
          left: 30,
        }),
        AT.claim,
      ),
    ).toBe("Unclaimed · 30 Coins left");
    expect(
      line(
        withMarker(base, {
          kind: "GOLD_CLAIM",
          at: AT.claim,
          ownerId: null,
          left: 0,
        }),
        AT.claim,
      ),
    ).toBe("Played out");
    expect(line(base, AT.expedition)).toBe(
      "The first to arrive gets a free technology.",
    );
    expect(
      line(
        withMarker(base, {
          kind: "LOST_EXPEDITION",
          at: AT.expedition,
          foundBy: P2,
        }),
        AT.expedition,
      ),
    ).toMatch(/^Notes taken by /);
    expect(line(base, { x: 0, y: 0 })).toBeNull();
  });

  it("labels a zap with its damage, the Shield's part, and a kill", () => {
    expect(zapTargetLabelV7({ damage: 4, shieldDamage: 0, kills: false })).toBe(
      "Zap −4",
    );
    expect(zapTargetLabelV7({ damage: 2, shieldDamage: 2, kills: false })).toBe(
      "Zap −2 · Shield −2",
    );
    expect(zapTargetLabelV7({ damage: 3, shieldDamage: 0, kills: true })).toBe(
      "Zap −3 · KO",
    );
  });
});
