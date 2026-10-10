import { describe, expect, it } from "vitest";
import {
  createPlayableGameV7,
  viewForV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TerrainIdV7,
} from "../../src/engine/index";
import type {
  BoardRenderPlanEntryV7,
  BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { factionColourV7 } from "../../src/render/canvas/faction-colours-v7";
import {
  SNOW_EDGE_EAST_V7,
  SNOW_EDGE_NORTH_V7,
  SNOW_EDGE_SOUTH_V7,
  SNOW_EDGE_WEST_V7,
} from "../../src/render/canvas/ice-folk-board-plan-v7";
import {
  tileHopLiftsV7,
  tileHopWidensV7,
} from "../../src/render/canvas/terrain-ripple-v7";
import {
  VICTORY_WAVE_ENABLED_V7,
  VICTORY_WAVE_V7,
  capturedCitiesV7,
  createVictoryWaveV7,
  drawVictoryFadeTintV7,
  drawVictoryGlowsV7,
  victoryGlowV7,
  victoryHopSwappedV7,
  victoryHopV7,
  victorySkinPlanV7,
  victoryTerrainSkinV7,
  victoryWaveDurationMsV7,
  victoryWaveEnabledV7,
  victoryWaveOriginV7,
  victoryWaveRingsV7,
  victoryWaveStepMsV7,
  victoryWaveTriggerV7,
} from "../../src/render/canvas/victory-wave-v7";
import { browserSetupV7 } from "../fixtures/v7-builders";
import {
  scoreDominationVictoryV7,
  scorePerfectionEndV7,
  scoreUiStateV7,
} from "../fixtures/v7-score-ui";

/**
 * pulp_wars-556y (docs/art/VICTORY_WAVE.md): when the viewer wins, every
 * explored cell hops in a widening ring and takes the winner's faction
 * skin; a defeat plays nothing. Small hand-built states only: no match is
 * played.
 */

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

describe("victory wave: the trigger", () => {
  it("plays when the viewer wins by elimination", () => {
    const view = viewOf(scoreDominationVictoryV7());
    const trigger = victoryWaveTriggerV7(view);
    expect(trigger).toEqual({
      winnerId: view.viewer.id,
      faction: view.viewer.faction,
      byScore: false,
    });
  });

  it("plays when the viewer wins a Perfection match by the score", () => {
    const view = viewOf(scorePerfectionEndV7(true));
    expect(view.outcome).toMatchObject({ kind: "VICTORY", decidedBy: "SCORE" });
    expect(victoryWaveTriggerV7(view)).toMatchObject({
      winnerId: view.viewer.id,
      byScore: true,
    });
  });

  it("plays nothing when the viewer loses, by score or otherwise", () => {
    const byScore = viewOf(scorePerfectionEndV7(false));
    expect(byScore.outcome?.kind).toBe("DEFEAT");
    expect(victoryWaveTriggerV7(byScore)).toBeNull();
    const live = viewOf(scoreUiStateV7());
    const rival = live.players.find((player) => player.id !== live.viewer.id);
    expect(
      victoryWaveTriggerV7({
        ...live,
        outcome: {
          kind: "DEFEAT",
          humanId: live.viewer.id,
          defeatedByPlayerId: rival?.id ?? live.viewer.id,
        },
      }),
    ).toBeNull();
  });

  it("plays nothing while the match is on, or for a headless result", () => {
    const live = viewOf(scoreUiStateV7());
    expect(victoryWaveTriggerV7(live)).toBeNull();
    expect(
      victoryWaveTriggerV7({
        ...live,
        outcome: { kind: "HEADLESS_VICTORY", winnerId: live.viewer.id },
      }),
    ).toBeNull();
  });

  it("plays on the Showcase too", () => {
    const created = createPlayableGameV7({
      ...browserSetupV7(71, 1),
      width: 16,
      height: 16,
      mapType: "SHOWCASE",
    });
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const won = viewOf({
      ...state,
      outcome: { kind: "VICTORY", winnerId: state.humanPlayerId },
    });
    expect(won.setup.mapType).toBe("SHOWCASE");
    expect(victoryWaveTriggerV7(won)).toMatchObject({
      winnerId: state.humanPlayerId,
      byScore: false,
    });
    // The wave starts from the viewer's capital on the fixed board.
    const capital = won.cities.find(
      (city) => city.ownerId === state.humanPlayerId && city.isCapital,
    );
    expect(victoryWaveOriginV7(won, state.humanPlayerId)).toEqual(capital?.at);
  });

  it("can be switched off by its parameter", () => {
    expect(VICTORY_WAVE_ENABLED_V7).toBe(true);
    expect(victoryWaveEnabledV7("?victory-wave=0")).toBe(false);
    expect(victoryWaveEnabledV7("?victory-wave=off")).toBe(false);
    expect(victoryWaveEnabledV7("?victory-wave=1")).toBe(true);
    expect(victoryWaveEnabledV7("")).toBe(true);
  });
});

describe("victory wave: the skin of each faction", () => {
  const LAND: readonly TerrainIdV7[] = ["GRASS", "FOREST", "MOUNTAIN"];

  it("maps every faction's land to its grounds, trees and Snow", () => {
    const table = Object.fromEntries(
      (
        [
          "ORIGINAL",
          "UNDEAD",
          "GOBLIN",
          "DINOSAUR",
          "MARTIAN",
          "ICE_FOLK",
          "DWARF",
          "CANDY",
        ] as const satisfies readonly FactionIdV7[]
      ).map((faction) => [
        faction,
        Object.fromEntries(
          LAND.map((terrain) => [
            terrain,
            victoryTerrainSkinV7(terrain, faction),
          ]),
        ),
      ]),
    );
    expect(table).toEqual({
      // Humans: the default look, no member at all.
      ORIGINAL: {
        GRASS: { snow: false },
        FOREST: { snow: false },
        MOUNTAIN: { snow: false },
      },
      UNDEAD: {
        GRASS: {
          territoryGround: "UNDEAD",
          factionGrass: "UNDEAD",
          snow: false,
        },
        FOREST: {
          territoryGround: "UNDEAD",
          factionGrass: "UNDEAD",
          factionForest: "UNDEAD",
          snow: false,
        },
        MOUNTAIN: {
          territoryGround: "UNDEAD",
          factionGrass: "UNDEAD",
          snow: false,
        },
      },
      GOBLIN: {
        GRASS: { factionGrass: "GOBLIN", snow: false },
        FOREST: {
          factionGrass: "GOBLIN",
          factionForest: "GOBLIN",
          snow: false,
        },
        MOUNTAIN: { factionGrass: "GOBLIN", snow: false },
      },
      DINOSAUR: {
        GRASS: { factionGrass: "DINOSAUR", snow: false },
        FOREST: {
          factionGrass: "DINOSAUR",
          factionForest: "DINOSAUR",
          snow: false,
        },
        MOUNTAIN: { factionGrass: "DINOSAUR", snow: false },
      },
      MARTIAN: {
        GRASS: { factionGrass: "MARTIAN", snow: false },
        FOREST: {
          factionGrass: "MARTIAN",
          factionForest: "MARTIAN",
          snow: false,
        },
        MOUNTAIN: { factionGrass: "MARTIAN", snow: false },
      },
      // The Ice Folk ground is Snow; their forest is the tundra forest.
      ICE_FOLK: {
        GRASS: { snow: true },
        FOREST: { factionForest: "ICE_FOLK", snow: true },
        MOUNTAIN: { snow: true },
      },
      DWARF: {
        GRASS: { factionGrass: "DWARF", snow: false },
        FOREST: {
          factionGrass: "DWARF",
          factionForest: "DWARF",
          snow: false,
        },
        MOUNTAIN: { factionGrass: "DWARF", snow: false },
      },
      CANDY: {
        GRASS: { factionGrass: "CANDY", snow: false },
        FOREST: {
          factionGrass: "CANDY",
          factionForest: "CANDY",
          snow: false,
        },
        MOUNTAIN: { factionGrass: "CANDY", snow: false },
      },
    });
  });

  it("keeps water and the Rift as they are, even for the Ice Folk", () => {
    for (const faction of ["ICE_FOLK", "MARTIAN", "UNDEAD"] as const)
      for (const terrain of ["SHALLOW_WATER", "DEEP_WATER", "RIFT"] as const)
        expect(victoryTerrainSkinV7(terrain, faction)).toEqual({ snow: false });
  });
});

/**
 * A view from rows: "." Grass, "f" Forest, "^" Mountain, "~" water, "?"
 * unexplored. Cities as given.
 */
function boardView(
  rows: readonly string[],
  options: {
    readonly commandIndex?: number;
    readonly outcome?: PlayerViewV7["outcome"];
    readonly cities?: readonly {
      readonly id: number;
      readonly at: { readonly x: number; readonly y: number };
      readonly ownerId: number;
      readonly isCapital?: boolean;
    }[];
    readonly faction?: FactionIdV7;
  } = {},
): PlayerViewV7 {
  const terrain = (mark: string): TerrainIdV7 =>
    mark === "f"
      ? "FOREST"
      : mark === "^"
        ? "MOUNTAIN"
        : mark === "~"
          ? "SHALLOW_WATER"
          : "GRASS";
  return {
    commandIndex: options.commandIndex ?? 1,
    viewer: { id: 1, faction: options.faction ?? "MARTIAN" },
    players: [
      { id: 1, faction: options.faction ?? "MARTIAN" },
      { id: 2, faction: "UNDEAD" },
    ],
    outcome: options.outcome ?? null,
    cities: (options.cities ?? []).map((city) => ({
      isCapital: false,
      ...city,
    })),
    board: {
      width: rows[0]?.length ?? 0,
      height: rows.length,
      tiles: rows.flatMap((row, y) =>
        [...row].map((mark, x) => ({
          at: { x, y },
          explored: mark !== "?",
          terrain: terrain(mark),
        })),
      ),
    },
  } as unknown as PlayerViewV7;
}

/** A plan of a view: one terrain entry per explored cell, and a unit. */
function planOf(
  view: PlayerViewV7,
  member: Partial<BoardRenderPlanEntryV7> = {},
): BoardRenderPlanV7 {
  const entries: BoardRenderPlanEntryV7[] = view.board.tiles.flatMap(
    (tile): BoardRenderPlanEntryV7[] =>
      tile.explored
        ? [
            {
              key: `terrain:${tile.at.x},${tile.at.y}`,
              kind: "TERRAIN",
              layer: 1,
              at: tile.at,
              artSubject: `TERRAIN:${tile.terrain}`,
              ...(tile.terrain === "SHALLOW_WATER" ? {} : member),
            },
          ]
        : [
            {
              key: `fog:${tile.at.x},${tile.at.y}`,
              kind: "FOG",
              layer: 0,
              at: tile.at,
            },
          ],
  );
  entries.push({
    key: "unit:9",
    kind: "UNIT",
    layer: 5,
    at: { x: 0, y: 0 },
    factionGrass: "UNDEAD",
  } as BoardRenderPlanEntryV7);
  return { version: 7, entries, targets: [] };
}

const terrainAt = (plan: BoardRenderPlanV7, x: number, y: number) =>
  plan.entries.find(
    (entry) => entry.kind === "TERRAIN" && entry.at.x === x && entry.at.y === y,
  );

describe("victory wave: the skinned plan", () => {
  const ROWS = ["~...~", ".ff^.", "..?..", "~~..."];

  it("puts every explored land cell in the winner's skin, in and out of borders", () => {
    const view = boardView(ROWS);
    // The board before: the Undead's ground everywhere (their territory).
    const before = planOf(view, {
      territoryGround: "UNDEAD",
      factionGrass: "UNDEAD",
      factionForest: "UNDEAD",
    });
    const martian = victorySkinPlanV7(before, view, "MARTIAN");
    expect(martian.entries).toHaveLength(before.entries.length);
    expect(terrainAt(martian, 1, 0)).toMatchObject({
      factionGrass: "MARTIAN",
    });
    expect(terrainAt(martian, 1, 0)?.territoryGround).toBeUndefined();
    expect(terrainAt(martian, 1, 1)).toMatchObject({
      factionGrass: "MARTIAN",
      factionForest: "MARTIAN",
    });
    expect(terrainAt(martian, 3, 1)).toMatchObject({ factionGrass: "MARTIAN" });
    // Water keeps its look; the fog stays fog; a unit is untouched.
    expect(terrainAt(martian, 0, 0)).toEqual(terrainAt(before, 0, 0));
    expect(martian.entries.find((entry) => entry.kind === "FOG")).toEqual(
      before.entries.find((entry) => entry.kind === "FOG"),
    );
    expect(martian.entries.at(-1)).toBe(before.entries.at(-1));
    // A Human win is the default look: no faction member is left.
    const human = victorySkinPlanV7(before, view, "ORIGINAL");
    for (const entry of human.entries.filter((e) => e.kind === "TERRAIN")) {
      expect(entry.factionGrass).toBeUndefined();
      expect(entry.factionForest).toBeUndefined();
      expect(entry.territoryGround).toBeUndefined();
      expect(entry.snow).toBeUndefined();
    }
  });

  it("lays Snow on an Ice Folk win's land, cut against water and fog", () => {
    const view = boardView(ROWS, { faction: "ICE_FOLK" });
    const plan = victorySkinPlanV7(planOf(view), view, "ICE_FOLK");
    expect(terrainAt(plan, 0, 0)?.snow).toBeUndefined();
    // (1, 0): water to the west, the board's edge north (never cut).
    expect(terrainAt(plan, 1, 0)?.snow?.edges).toBe(SNOW_EDGE_WEST_V7);
    // (2, 1): Forest, the fog to the south.
    expect(terrainAt(plan, 2, 1)).toMatchObject({
      factionForest: "ICE_FOLK",
    });
    expect(terrainAt(plan, 2, 1)?.snow?.edges).toBe(SNOW_EDGE_SOUTH_V7);
    // (2, 3): water west, fog north.
    expect(terrainAt(plan, 2, 3)?.snow?.edges).toBe(
      SNOW_EDGE_WEST_V7 | SNOW_EDGE_NORTH_V7,
    );
    expect(SNOW_EDGE_EAST_V7).toBeGreaterThan(0);
  });

  it("clears another faction's Snow, but not a Blizzard's", () => {
    const view = boardView(ROWS);
    const snow = { edges: 0, variant: 0 };
    const before = planOf(view, { snow });
    const blizzard = {
      ...before,
      entries: before.entries.map((entry) =>
        entry.at.x === 4 && entry.at.y === 1 && entry.kind === "TERRAIN"
          ? { ...entry, blizzard: true as const }
          : entry,
      ),
    };
    const plan = victorySkinPlanV7(blizzard, view, "CANDY");
    expect(terrainAt(plan, 1, 0)?.snow).toBeUndefined();
    expect(terrainAt(plan, 4, 1)?.snow).toEqual(snow);
  });
});

describe("victory wave: where it starts and how it runs", () => {
  const ROWS = ["......", "......", "......", "~~~~~~"];

  it("starts at the capital, else the city taken last, else any city", () => {
    const capital = { id: 1, at: { x: 1, y: 1 }, ownerId: 1, isCapital: true };
    const taken = { id: 2, at: { x: 4, y: 0 }, ownerId: 1 };
    const other = { id: 3, at: { x: 5, y: 2 }, ownerId: 1 };
    expect(
      victoryWaveOriginV7(boardView(ROWS, { cities: [taken, capital] }), 1, {
        x: 4,
        y: 0,
      }),
    ).toEqual({ x: 1, y: 1 });
    expect(
      victoryWaveOriginV7(boardView(ROWS, { cities: [other, taken] }), 1, {
        x: 4,
        y: 0,
      }),
    ).toEqual({ x: 4, y: 0 });
    expect(
      victoryWaveOriginV7(boardView(ROWS, { cities: [other, taken] }), 1),
    ).toEqual({ x: 5, y: 2 });
    expect(victoryWaveOriginV7(boardView(ROWS), 1)).toEqual({ x: 3, y: 2 });
  });

  it("finds the cities the viewer took between two views", () => {
    const before = boardView(ROWS, {
      cities: [
        { id: 1, at: { x: 1, y: 1 }, ownerId: 1 },
        { id: 2, at: { x: 4, y: 0 }, ownerId: 2 },
      ],
    });
    const after = boardView(ROWS, {
      cities: [
        { id: 1, at: { x: 1, y: 1 }, ownerId: 1 },
        { id: 2, at: { x: 4, y: 0 }, ownerId: 1 },
      ],
    });
    expect(capturedCitiesV7(before, after, 1)).toEqual([{ x: 4, y: 0 }]);
  });

  it("rings the cells by distance, water marked, the fog left out", () => {
    const { rings } = victoryWaveRingsV7(boardView(["..?", "...", "~~~"]), {
      x: 0,
      y: 0,
    });
    expect(
      rings.map((cells) => cells.map((cell) => `${cell.at.x},${cell.at.y}`)),
    ).toEqual([["0,0"], ["1,0", "0,1", "1,1"], ["2,1", "0,2", "1,2"], ["2,2"]]);
    expect(rings[2]?.map((cell) => cell.water)).toEqual([false, true, true]);
  });

  it("fits the largest board's rings into the spread", () => {
    expect(victoryWaveStepMsV7(4)).toBe(VICTORY_WAVE_V7.stepMs);
    // A 25 x 25 board from a corner: 34 rings.
    expect(victoryWaveStepMsV7(34) * 34).toBeCloseTo(VICTORY_WAVE_V7.spreadMs);
    expect(victoryWaveDurationMsV7(34)).toBeLessThanOrEqual(
      VICTORY_WAVE_V7.spreadMs + VICTORY_WAVE_V7.hopMs,
    );
  });

  it("crouches wide, rises, swaps at the top, lands and bounces", () => {
    const { hopMs, apex, crouch } = VICTORY_WAVE_V7;
    expect(victoryHopV7(0)).toEqual({ lift: 0, widen: 0 });
    expect(victoryHopV7(hopMs * crouch * 0.5).widen).toBeGreaterThan(0);
    expect(victoryHopV7(hopMs * crouch * 0.5).lift).toBe(0);
    expect(victoryHopV7(hopMs * apex - 1).lift).toBeGreaterThan(0.99);
    expect(victoryHopSwappedV7(hopMs * apex - 1)).toBe(false);
    expect(victoryHopSwappedV7(hopMs * apex)).toBe(true);
    expect(victoryHopV7(hopMs * 0.94).lift).toBeGreaterThan(0);
    expect(victoryHopV7(hopMs * 0.94).lift).toBeLessThan(0.2);
    expect(victoryHopV7(hopMs)).toEqual({ lift: 0, widen: 0 });
    for (let ms = 0; ms <= hopMs; ms += 5) {
      const hop = victoryHopV7(ms);
      expect(hop.lift).toBeGreaterThanOrEqual(0);
      expect(hop.widen).toBeGreaterThanOrEqual(0);
    }
  });

  it("glows from the top of the hop: a quick flare, then a fade", () => {
    const { glowMs, glowRise } = VICTORY_WAVE_V7;
    expect(victoryGlowV7(0)).toBe(0);
    expect(victoryGlowV7(glowMs * glowRise)).toBeCloseTo(1);
    expect(victoryGlowV7(glowMs * 0.6)).toBeGreaterThan(0);
    expect(victoryGlowV7(glowMs * 0.6)).toBeLessThan(0.5);
    expect(victoryGlowV7(glowMs)).toBe(0);
  });

  it("draws a hop its own height and widening, in whole device pixels", () => {
    const camera = { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(1) };
    const hop = { at: { x: 2, y: 3 }, lift: 1, height: 0.14, widen: 0.05 };
    // 11 px of an 80 px cell.
    expect(tileHopLiftsV7([hop], camera, 1).get("2,3")).toBe(11);
    // Without its own height, the ripple's: 7 px.
    expect(
      tileHopLiftsV7([{ at: hop.at, lift: 1 }], camera, 1).get("2,3"),
    ).toBe(7);
    // 2 px each side of 80.
    expect(tileHopWidensV7([hop], camera, 1).get("2,3")).toBeCloseTo(84 / 80);
    expect(tileHopWidensV7([{ ...hop, widen: 0 }], camera, 1).size).toBe(0);
  });
});

describe("victory wave: the wave over time", () => {
  const ROWS = ["~....", ".....", ".....", "....~"];
  const city = { id: 1, at: { x: 0, y: 1 }, ownerId: 1, isCapital: true };
  const live = boardView(ROWS, { commandIndex: 5, cities: [city] });
  const won = boardView(ROWS, {
    commandIndex: 6,
    cities: [city],
    outcome: { kind: "VICTORY", winnerId: 1 } as PlayerViewV7["outcome"],
  });
  const lost = boardView(ROWS, {
    commandIndex: 6,
    cities: [city],
    outcome: {
      kind: "DEFEAT",
      humanId: 1,
      defeatedByPlayerId: 2,
    } as PlayerViewV7["outcome"],
  });
  const skinned = (plan: BoardRenderPlanV7): number =>
    plan.entries.filter(
      (entry) => entry.kind === "TERRAIN" && entry.factionGrass === "MARTIAN",
    ).length;

  it("starts when a watched match is won, from the capital", () => {
    const wave = createVictoryWaveV7();
    wave.observe(live, "match", 0, "WAVE");
    expect(wave.startedAtMs).toBeNull();
    wave.observe(won, "match", 1000, "WAVE");
    expect(wave.startedAtMs).toBe(1000);
    expect(wave.mode).toBe("WAVE");
    expect(wave.origin).toEqual({ x: 0, y: 1 });
    expect(wave.faction).toBe("MARTIAN");
    // The view before the win (a presentation's) is never skinned.
    const before = planOf(live);
    expect(wave.plan(before, live, 5000)).toBe(before);
    expect(skinned(wave.plan(planOf(won), won, 5000))).toBe(18);
  });

  it("plays nothing for a defeat", () => {
    const wave = createVictoryWaveV7();
    wave.observe(live, "match", 0, "WAVE");
    wave.observe(lost, "match", 1000, "WAVE");
    expect(wave.startedAtMs).toBeNull();
    const plan = planOf(lost);
    expect(wave.plan(plan, lost, 5000)).toBe(plan);
    expect(wave.hops(lost, 1200)).toEqual([]);
    expect(wave.frame(lost, 1200)).toBeNull();
    expect(wave.settledAtMs).toBeNull();
  });

  it("shows a match loaded already won in its skin at once", () => {
    const wave = createVictoryWaveV7();
    wave.observe(won, "match", 0, "WAVE");
    expect(wave.mode).toBe("INSTANT");
    expect(wave.active(0)).toBe(false);
    expect(skinned(wave.plan(planOf(won), won, 0))).toBe(18);
    expect(wave.hops(won, 0)).toEqual([]);
  });

  it("changes the cells ring by ring at the top of their hop", () => {
    const wave = createVictoryWaveV7();
    wave.observe(live, "match", 0, "WAVE");
    wave.observe(won, "match", 0, "WAVE");
    const plan = planOf(won);
    const { hopMs, apex, stepMs } = VICTORY_WAVE_V7;
    const top = hopMs * apex;
    expect(skinned(wave.plan(plan, won, top - 1))).toBe(0);
    // Ring 0 (the capital's cell) at its top.
    expect(skinned(wave.plan(plan, won, top))).toBe(1);
    // The same object while the same rings have changed.
    expect(wave.plan(plan, won, top + 1)).toBe(wave.plan(plan, won, top + 2));
    const rings = victoryWaveRingsV7(won, { x: 0, y: 1 }).rings;
    const step = victoryWaveStepMsV7(rings.length - 1);
    expect(step).toBe(stepMs);
    expect(skinned(wave.plan(plan, won, top + step))).toBe(
      1 + (rings[1]?.filter((cell) => !cell.water).length ?? 0),
    );
    // All 18 land cells once the wave has landed; the plan then stays.
    const end = victoryWaveDurationMsV7(rings.length - 1);
    expect(skinned(wave.plan(plan, won, end))).toBe(18);
    expect(wave.plan(plan, won, end + 9000)).toBe(wave.plan(plan, won, end));
    expect(wave.settledAtMs).toBe(end + VICTORY_WAVE_V7.dialogBeatMs);
  });

  it("hops land cells only, and ripples water, as the wave passes", () => {
    const wave = createVictoryWaveV7();
    wave.observe(live, "match", 0, "WAVE");
    wave.observe(won, "match", 0, "WAVE");
    const water = new Set(["0,0", "4,3"]);
    let hopped = 0;
    let rippled = 0;
    let glowed = 0;
    for (let ms = 0; ms <= 2000; ms += 16) {
      for (const hop of wave.hops(won, ms)) {
        expect(water.has(`${hop.at.x},${hop.at.y}`)).toBe(false);
        expect(hop.height).toBe(VICTORY_WAVE_V7.height);
        hopped += 1;
      }
      const frame = wave.frame(won, ms);
      for (const ripple of frame?.ripples ?? []) {
        expect(water.has(`${ripple.at.x},${ripple.at.y}`)).toBe(true);
        rippled += 1;
      }
      // Sparkles are a Human win's; every winner's glow is faint and in
      // its faction colour, on its own board.
      expect(frame?.sparkles ?? []).toEqual([]);
      if (frame !== null) {
        expect(frame.glowColor).toBe(factionColourV7("MARTIAN"));
        expect(frame.glowAlpha).toBe(VICTORY_WAVE_V7.factionGlowAlpha);
        expect(frame.board).toEqual({ width: 5, height: 4 });
        glowed += frame.glows.length;
      }
    }
    expect(hopped).toBeGreaterThan(0);
    expect(rippled).toBeGreaterThan(0);
    expect(glowed).toBeGreaterThan(0);
    expect(wave.active(5000)).toBe(false);
  });

  it("gives a Human win a golden glow, sparkles and a taller hop", () => {
    const human = boardView(ROWS, {
      commandIndex: 6,
      faction: "ORIGINAL",
      cities: [city],
      outcome: { kind: "VICTORY", winnerId: 1 } as PlayerViewV7["outcome"],
    });
    const wave = createVictoryWaveV7();
    wave.observe(boardView(ROWS, { faction: "ORIGINAL" }), "m", 0, "WAVE");
    wave.observe(human, "m", 0, "WAVE");
    const sparkled = new Set<string>();
    const glowed = new Set<string>();
    for (let ms = 0; ms <= 3000; ms += 16) {
      const frame = wave.frame(human, ms);
      for (const sparkle of frame?.sparkles ?? []) {
        sparkled.add(`${sparkle.at.x},${sparkle.at.y}`);
        expect(Math.abs(sparkle.dx)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(sparkle.dy)).toBeLessThanOrEqual(0.5);
      }
      for (const glow of frame?.glows ?? []) {
        glowed.add(`${glow.at.x},${glow.at.y}`);
        expect(glow.strength).toBeGreaterThan(0);
        expect(glow.strength).toBeLessThanOrEqual(1);
      }
      if (frame !== null) {
        expect(frame.glowColor).toBe(VICTORY_WAVE_V7.humanGlow.color);
        expect(frame.glowAlpha).toBe(VICTORY_WAVE_V7.humanGlow.alpha);
      }
      for (const hop of wave.hops(human, ms))
        expect(hop.height).toBe(VICTORY_WAVE_V7.humanHeight);
    }
    // Every cell, water too, sparkles and glows.
    expect(sparkled.size).toBe(20);
    expect(glowed.size).toBe(20);
    expect(VICTORY_WAVE_V7.humanHeight).toBeGreaterThan(VICTORY_WAVE_V7.height);
    expect(VICTORY_WAVE_V7.humanGlow.alpha).toBeGreaterThan(
      VICTORY_WAVE_V7.factionGlowAlpha * 2,
    );
  });

  it("crossfades with reduced motion: no hop, no ripple", () => {
    const wave = createVictoryWaveV7();
    wave.observe(live, "match", 0, "FADE");
    wave.observe(won, "match", 100, "FADE");
    expect(wave.mode).toBe("FADE");
    const plan = planOf(won);
    expect(skinned(wave.plan(plan, won, 100))).toBe(18);
    expect(wave.fade(won, 100)).toBe(0);
    expect(wave.fade(won, 100 + VICTORY_WAVE_V7.fadeMs / 2)).toBeCloseTo(0.5);
    expect(wave.fade(won, 100 + VICTORY_WAVE_V7.fadeMs)).toBeNull();
    expect(wave.hops(won, 200)).toEqual([]);
    expect(wave.frame(won, 200)).toBeNull();
    expect(wave.settledAtMs).toBe(100 + VICTORY_WAVE_V7.fadeMs);
  });

  it("shows three sparkles a cell on a Human win, and none in its crossfade", () => {
    const human = boardView(ROWS, {
      commandIndex: 6,
      faction: "ORIGINAL",
      cities: [city],
      outcome: {
        kind: "VICTORY",
        winnerId: 1,
        decidedBy: "SCORE",
        ranking: [1],
      } as unknown as PlayerViewV7["outcome"],
    });
    const before = boardView(ROWS, { faction: "ORIGINAL" });
    const wave = createVictoryWaveV7();
    wave.observe(before, "m", 0, "WAVE");
    wave.observe(human, "m", 0, "WAVE");
    expect(VICTORY_WAVE_V7.sparkles).toBeGreaterThanOrEqual(2);
    // The capital's cell (ring 0) once all of its sparkles are alight.
    const { hopMs, apex, sparkles, sparkleGapMs } = VICTORY_WAVE_V7;
    const frame = wave.frame(
      human,
      hopMs * apex + (sparkles - 1) * sparkleGapMs + 1,
    );
    const own = (frame?.sparkles ?? []).filter(
      (sparkle) => sparkle.at.x === 0 && sparkle.at.y === 1,
    );
    expect(own).toHaveLength(sparkles);
    // Each in a place of its own in the cell.
    expect(
      new Set(own.map((sparkle) => `${sparkle.dx},${sparkle.dy}`)).size,
    ).toBe(sparkles);

    // Reduced motion: the Human win crossfades (the host tints it in gold
    // by the wave's faction and this progress), with no hop and no light.
    const reduced = createVictoryWaveV7();
    reduced.observe(before, "m", 0, "FADE");
    reduced.observe(human, "m", 0, "FADE");
    expect(reduced.mode).toBe("FADE");
    expect(reduced.faction).toBe("ORIGINAL");
    expect(reduced.fade(human, VICTORY_WAVE_V7.fadeMs / 2)).toBeCloseTo(0.5);
    expect(reduced.hops(human, 100)).toEqual([]);
    expect(reduced.frame(human, 100)).toBeNull();
    expect(reduced.fade(human, VICTORY_WAVE_V7.fadeMs)).toBeNull();
  });

  it("forgets the wave with another match", () => {
    const wave = createVictoryWaveV7();
    wave.observe(live, "one", 0, "WAVE");
    wave.observe(won, "one", 0, "WAVE");
    wave.observe(live, "two", 10, "WAVE");
    expect(wave.startedAtMs).toBeNull();
    const plan = planOf(live);
    expect(wave.plan(plan, live, 5000)).toBe(plan);
  });
});

describe("victory wave: the Human win's light", () => {
  /** A context that records what is filled, with what alpha and blending. */
  const recorder = () => {
    const fills: { alpha: number; blend: string; colour: string }[] = [];
    const context = {
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      fillStyle: "" as unknown,
      canvas: {},
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      clip() {},
      createRadialGradient: () => ({ addColorStop() {} }),
      fillRect() {
        fills.push({
          alpha: this.globalAlpha,
          blend: this.globalCompositeOperation,
          colour: String(this.fillStyle),
        });
      },
    };
    return { context: context as unknown as CanvasRenderingContext2D, fills };
  };
  const frame = {
    camera: { offsetX: 40, offsetY: 40, zoom: 1 },
    devicePixelRatio: 1,
    sceneAlpha: 1,
  } as const;

  it("washes a reduced-motion Human crossfade in gold, strongest halfway", () => {
    const board = { width: 5, height: 4 };
    const at = (progress: number) => {
      const { context, fills } = recorder();
      drawVictoryFadeTintV7(context, frame, board, progress);
      return fills;
    };
    expect(at(0)).toEqual([]);
    expect(at(1)).toEqual([]);
    const half = at(0.5);
    expect(half).toHaveLength(1);
    expect(half[0]?.colour).toBe(VICTORY_WAVE_V7.humanGlow.color);
    expect(half[0]?.blend).toBe("screen");
    expect(half[0]?.alpha).toBeCloseTo(VICTORY_WAVE_V7.humanFadeTint);
    expect(at(0.2)[0]?.alpha ?? 0).toBeLessThan(half[0]?.alpha ?? 0);
  });

  it("lights each glowing cell, scaled by its strength, in screen blending", () => {
    const { context, fills } = recorder();
    drawVictoryGlowsV7(context, frame, {
      glows: [
        { at: { x: 0, y: 0 }, strength: 1 },
        { at: { x: 1, y: 0 }, strength: 0.5 },
      ],
      glowColor: VICTORY_WAVE_V7.humanGlow.color,
      glowAlpha: VICTORY_WAVE_V7.humanGlow.alpha,
      board: { width: 3, height: 3 },
    });
    // No document to make a sprite on: the gradient is drawn per cell.
    expect(fills.map((fill) => fill.alpha)).toEqual([
      VICTORY_WAVE_V7.humanGlow.alpha,
      VICTORY_WAVE_V7.humanGlow.alpha * 0.5,
    ]);
    expect(fills.every((fill) => fill.blend === "screen")).toBe(true);
  });
});
