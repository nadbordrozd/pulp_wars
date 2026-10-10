import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  viewForV7,
  type FactionIdV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  FACTION_COLOURS_V7,
  factionColourV7,
  playerFactionColourV7,
} from "../../src/render/canvas/faction-colours-v7";
import { parseHexColourV7 } from "../../src/render/canvas/owner-recolour-v7";
import {
  DIRECTION_FLAG_ANCHORS_V7,
  HUMAN_DEMO_DIRECTION_V7,
  LIVE_DIRECTION_V7,
  drawDirectedFlagV7,
  drawDirectedPieceChromeV7,
} from "../../src/render/canvas/visual-direction-v7";
import { factionLooksFixtureV7 } from "../fixtures/v7-faction-looks";

/**
 * Faction colours (bead pulp_wars-b5f.4, docs/art/FACTION_COLOURS.md): each
 * faction's permanent owner colour, measured for distinctness (also under
 * the two red-green colour vision deficiencies) and for readability as a
 * territory border; and the live look without code-drawn pennants.
 */

type Rgb = readonly [number, number, number];

const linear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const encode = (value: number): number => {
  const c = Math.max(0, Math.min(1, value));
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
};

/** Machado, Oliveira and Fernandes (2009), severity 1, on linear RGB. */
const DEFICIENCIES = {
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
} as const;

function simulate(
  rgb: Rgb,
  matrix: (typeof DEFICIENCIES)[keyof typeof DEFICIENCIES],
): Rgb {
  const [r, g, b] = rgb.map(linear) as unknown as Rgb;
  const row = (index: 0 | 1 | 2): number => {
    const [m0, m1, m2] = matrix[index];
    return encode(m0 * r + m1 * g + m2 * b);
  };
  return [row(0), row(1), row(2)];
}

/** CIE L*a*b* (D65) of an sRGB colour. */
function lab(rgb: Rgb): Rgb {
  const [r, g, b] = rgb.map(linear) as unknown as Rgb;
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const cie76 = (left: Rgb, right: Rgb): number => {
  const [l1, a1, b1] = lab(left);
  const [l2, a2, b2] = lab(right);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

function rgbOf(hex: string): Rgb {
  const parsed = parseHexColourV7(hex);
  if (parsed === null) throw new Error(`not #rrggbb: ${hex}`);
  return [parsed.r, parsed.g, parsed.b];
}

const mix = (left: Rgb, right: Rgb, share: number): Rgb => [
  left[0] + (right[0] - left[0]) * share,
  left[1] + (right[1] - left[1]) * share,
  left[2] + (right[2] - left[2]) * share,
];

/**
 * Mean colours of the CHIBI ground the borders are drawn on (measured from
 * public/assets/chibi/terrain): Grass, both waters, the rocky Mountain
 * ground, and Snow (the Ice Folk overlay's 42% wash of #f5f8fc on Grass).
 */
const GRASS: Rgb = [137, 183, 91];
const TERRAIN = {
  grass: GRASS,
  shallowWater: [143, 211, 220],
  deepWater: [66, 119, 165],
  mountainGround: [162, 170, 182],
  snow: mix(GRASS, [245, 248, 252], 0.42),
} as const satisfies Readonly<Record<string, Rgb>>;

const pairs = (): [FactionIdV7, FactionIdV7][] =>
  FACTION_IDS_V7.flatMap((left, index) =>
    FACTION_IDS_V7.slice(index + 1).map((right): [FactionIdV7, FactionIdV7] => [
      left,
      right,
    ]),
  );

describe("faction colours (pulp_wars-b5f.4)", () => {
  it("gives each of the nine factions one distinct #rrggbb colour", () => {
    expect(Object.keys(FACTION_COLOURS_V7).sort()).toEqual(
      [...FACTION_IDS_V7].sort(),
    );
    expect(FACTION_IDS_V7).toHaveLength(9);
    // The Candy revision (`pulp_wars-jdb.3`): cotton-candy pink.
    expect(FACTION_COLOURS_V7.CANDY).toBe("#ffb8d8");
    // The Cultists (`pulp_wars-mch9.3`): eldritch green, the candidate of
    // RULESET_7_CULTISTS.md section 14.2. The two tests below hold it to the
    // same distances as the eight before it.
    expect(FACTION_COLOURS_V7.CULT).toBe("#00ff78");
    for (const faction of FACTION_IDS_V7) {
      expect(factionColourV7(faction)).toBe(FACTION_COLOURS_V7[faction]);
      expect(factionColourV7(faction)).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(Object.values(FACTION_COLOURS_V7)).size).toBe(9);
  });

  it("keeps every pair apart in CIE76, also under deuteranopia and protanopia", () => {
    for (const [left, right] of pairs()) {
      const a = rgbOf(FACTION_COLOURS_V7[left]);
      const b = rgbOf(FACTION_COLOURS_V7[right]);
      expect(cie76(a, b), `${left}/${right}`).toBeGreaterThanOrEqual(45);
      for (const [name, matrix] of Object.entries(DEFICIENCIES))
        expect(
          cie76(simulate(a, matrix), simulate(b, matrix)),
          `${left}/${right} ${name}`,
        ).toBeGreaterThanOrEqual(20);
    }
  });

  it("reads as a border on Grass, both waters and Mountain ground, and the Ice Folk on Snow", () => {
    for (const faction of FACTION_IDS_V7) {
      const colour = rgbOf(FACTION_COLOURS_V7[faction]);
      for (const [name, ground] of Object.entries(TERRAIN))
        expect(cie76(colour, ground), `${faction} on ${name}`).toBeGreaterThan(
          25,
        );
      // Light enough to stand out of the border's dark casing (#1d2a28 at
      // 55% over the ground, about L* 30 on Grass).
      expect(lab(colour)[0], faction).toBeGreaterThan(42);
    }
    expect(
      cie76(rgbOf(FACTION_COLOURS_V7.ICE_FOLK), TERRAIN.snow),
    ).toBeGreaterThan(60);
  });

  it("gives the Undead violet, the user's example", () => {
    const [, a, b] = lab(rgbOf(FACTION_COLOURS_V7.UNDEAD));
    const hue = (Math.atan2(b, a) * 180) / Math.PI + 360;
    expect(hue % 360).toBeGreaterThan(290);
    expect(hue % 360).toBeLessThan(320);
  });

  it("colours every owned piece and border by its owner's faction, never by the seat colour", () => {
    const state = factionLooksFixtureV7([
      "DWARF",
      "MARTIAN",
      "ICE_FOLK",
      "UNDEAD",
    ]);
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.players).toHaveLength(4);
    const plan = (players = view.players) =>
      buildBoardRenderPlanV7({ ...view, players }, [], {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      }).entries.filter(
        (entry): entry is BoardRenderPlanEntryV7 & { ownerId: number } =>
          entry.ownerId !== undefined && entry.ownerId !== null,
      );
    const owned = plan();
    expect(owned.some((entry) => entry.kind === "CITY")).toBe(true);
    expect(owned.some((entry) => entry.kind === "UNIT")).toBe(true);
    expect(owned.some((entry) => entry.kind === "TERRITORY_BOUNDARY")).toBe(
      true,
    );
    for (const entry of owned)
      expect(entry.ownerColor, entry.key).toBe(
        playerFactionColourV7(view, entry.ownerId),
      );
    expect(new Set(owned.map((entry) => entry.ownerColor)).size).toBe(4);
    // The engine's seat colours, rotated, change nothing.
    const rotated = view.players.map((player, index) => ({
      ...player,
      color:
        view.players[(index + 1) % view.players.length]?.color ?? player.color,
    }));
    expect(plan(rotated).map((entry) => entry.ownerColor)).toEqual(
      owned.map((entry) => entry.ownerColor),
    );
    expect(playerFactionColourV7(view, null)).toBeUndefined();
    expect(playerFactionColourV7(view, 999)).toBeUndefined();
  });

  it("draws no code-drawn pennant in the live look, on any anchored city or building", () => {
    const log: unknown[] = [];
    const context = new Proxy(
      {},
      {
        get:
          () =>
          (...args: unknown[]) =>
            log.push(args),
        set: (_target, key, value) => {
          log.push(["set", key, value]);
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    const rect = { x: 0, y: 0, width: 96, height: 104 };
    const anchored = Object.keys(DIRECTION_FLAG_ANCHORS_V7);
    expect(anchored.length).toBeGreaterThan(20);
    for (const kind of ["CITY", "IMPROVEMENT"] as const) {
      const piece: BoardRenderPlanEntryV7 = {
        key: `${kind}:1`,
        kind,
        layer: 4,
        at: { x: 0, y: 0 },
        assetId: "legacy",
        ownerColor: FACTION_COLOURS_V7.UNDEAD,
        ownerSeat: 1,
        capital: true,
      };
      for (const id of anchored) {
        expect(
          drawDirectedFlagV7(context, LIVE_DIRECTION_V7, piece, id, rect, 1),
          `${kind} ${id}`,
        ).toBe(false);
        // The study benches still fly them.
        expect(
          drawDirectedFlagV7(
            context,
            HUMAN_DEMO_DIRECTION_V7,
            piece,
            id,
            rect,
            1,
          ),
          `${kind} ${id} (study)`,
        ).toBe(true);
      }
    }
    // No corner pennant either: the chrome draws nothing for a city and
    // leaves the capital to the stock crown.
    log.length = 0;
    const city: BoardRenderPlanEntryV7 = {
      key: "city:1",
      kind: "CITY",
      layer: 4,
      at: { x: 0, y: 0 },
      assetId: "legacy",
      artSubject: "CITY:2",
      ownerColor: FACTION_COLOURS_V7.ORIGINAL,
      ownerSeat: 0,
      capital: true,
    };
    expect(
      drawDirectedPieceChromeV7(context, LIVE_DIRECTION_V7, city, 0, 0, 1),
    ).toEqual({ badge: true, hp: false, crown: false });
    expect(
      log.filter(
        (call) =>
          Array.isArray(call) && call[0] === "set" && call[1] === "fillStyle",
      ),
    ).toEqual([]);
  });
});
