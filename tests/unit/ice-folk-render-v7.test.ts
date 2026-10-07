import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewBolasV7,
  previewColdSnapV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiFallbackSubjectV7,
  cityArtSubjectV7,
  unitArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import {
  commandSubjectV7,
  portraitSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  ICE_FOLK_FLAG_ANCHORS_V7,
  ICE_FOLK_SHATTER_TIMELINE_V7,
  iceFolkBlizzardFlakesV7,
  iceFolkSnowVariantV7,
} from "../../src/assets/chibi-direction-ice-folk-presentation";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  SNOW_EDGE_EAST_V7,
  SNOW_EDGE_NORTH_V7,
  SNOW_EDGE_SOUTH_V7,
  SNOW_EDGE_WEST_V7,
  iceFolkTerrainCellsV7,
} from "../../src/render/canvas/ice-folk-board-plan-v7";
import {
  drawShatterWindowV7,
  type IceFolkBoardArtV7,
} from "../../src/render/canvas/ice-folk-canvas-v7";
import {
  ICE_FOLK_EFFECT_DURATIONS_V7,
  ICE_FOLK_EFFECT_SUBJECTS_V7,
  drawIceFolkFeedbackV7,
  shatterBoardCueV7,
} from "../../src/render/canvas/ice-folk-effects-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../src/render/canvas/visual-direction-v7";
import {
  CHILLED_PREVIEW_V7,
  SHATTERS_PREVIEW_V7,
  bolasPreviewLinesV7,
  iceFolkCombatLinesV7,
} from "../../src/render/ice-folk-presentation-v7";
import {
  ICE_FOLK_UI_V7,
  ICE_FOLK_VICTIM_V7,
  iceFolkUiFixtureV7,
  iceFolkVictimFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Every Ice Folk number below is read from a public preview of the same
// view: the balance bead (`pulp_wars-7g3.7`) may retune the faction.
const AT = ICE_FOLK_UI_V7;
type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 6 })
            : key === "createLinearGradient"
              ? () => ({ addColorStop: () => undefined })
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
  return { context: context as CanvasRenderingContext2D, log };
}

const humanView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

function planFor(
  view: PlayerViewV7,
  selected: CoordV7 | null,
  extra: Partial<BoardRenderInteractionV7> = {},
): BoardRenderPlanV7 {
  const unit = selected === null ? null : unitAt(view, selected);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: unit === null ? null : { kind: "UNIT", unitId: unit.id },
    selectedUnitId: unit?.id ?? null,
    selectedAchievement: null,
    ...extra,
  });
}

/** Rasters as named tokens, so the log shows what was drawn where. */
function fakeIceFolkArt(): IceFolkBoardArtV7 {
  return {
    snowTile: (edges, variant) =>
      ({ snow: `${edges}|${variant}` }) as unknown as CanvasImageSource,
    seaIce: (_sheet, openWater, variant, permanent) =>
      ({
        seaIce: `${openWater}|${variant}|${String(permanent)}`,
      }) as unknown as CanvasImageSource,
    caps: (image, kind) =>
      ({
        caps: kind,
        of: (image as unknown as { id?: string }).id,
      }) as unknown as CanvasImageSource,
    casing: (image, heightShare) => ({
      image: {
        casing: heightShare,
        of: (image as unknown as { id?: string }).id,
      } as unknown as CanvasImageSource,
      margin: 3,
    }),
  };
}

function draw(
  plan: BoardRenderPlanV7,
  options: Partial<Parameters<typeof drawBoardV7>[0]> = {},
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1600, height: 1600 },
    devicePixelRatio: 1,
    camera: { offsetX: 100, offsetY: 100, zoom: 1 },
    plan,
    images: {
      resolve: (id) =>
        ({ id, width: 128, height: 128 }) as unknown as CanvasImageSource,
      resolveTerrainGround: (id) =>
        ({ id: `ground:${id}`, width: 128, height: 128 }) as never,
      resolveRaisedTerrain: (id) =>
        ({ id: `raised:${id}`, width: 256, height: 256 }) as never,
    },
    iceFolkArt: fakeIceFolkArt(),
    ...options,
  });
  return log;
}

/** The index of every drawImage call of a token with `key`. */
const drawIndexes = (
  log: readonly LogEntry[],
  test: (image: Record<string, unknown>) => boolean,
): number[] =>
  log.flatMap((call, index) =>
    call[0] === "drawImage" &&
    typeof call[1] === "object" &&
    call[1] !== null &&
    test(call[1] as Record<string, unknown>)
      ? [index]
      : [],
  );

describe("Ice Folk art wiring (ICE_FOLK.md wiring steps 1-3, 5)", () => {
  it("resolves the unit, city, portrait, technology and command subjects", () => {
    expect(
      unitArtSubjectV7({
        role: "SWORDSMAN",
        form: "LAND",
        faction: "ICE_FOLK",
      }),
    ).toBe("UNIT:ICE_FOLK:GUARD");
    // Since bead pulp_wars-w5j.3 boats and embarked units are the Ice
    // Folk's own naval subjects.
    expect(
      unitArtSubjectV7({
        role: "PATROL_BOAT",
        form: "NAVAL",
        faction: "ICE_FOLK",
      }),
    ).toBe("UNIT:ICE_FOLK:PATROL_BOAT");
    expect(
      unitArtSubjectV7({
        role: "FIGHTER",
        form: "EMBARKED",
        faction: "ICE_FOLK",
      }),
    ).toBe("UNIT:ICE_FOLK:EMBARKED_TRANSPORT");
    expect(portraitSubjectV7("BATTLESHIP", "ICE_FOLK")).toBe(
      "PORTRAIT:ICE_FOLK:BATTLESHIP",
    );
    expect(cityArtSubjectV7({ artLevel: 2, faction: "ICE_FOLK" })).toBe(
      "CITY:ICE_FOLK:2",
    );
    expect(portraitSubjectV7("CAPTAIN", "ICE_FOLK")).toBe(
      "PORTRAIT:ICE_FOLK:CAPTAIN",
    );
    expect(technologySubjectV7("FORTIFICATION", "ICE_FOLK")).toBe(
      "ICON:TECH:ICE_FOLK:FORTIFICATION",
    );
    expect(technologySubjectV7("EXPLOSIVES", "ICE_FOLK")).toBe(
      "ICON:TECH:ICE_FOLK:EXPLOSIVES",
    );
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the root's card is
    // the Workshop (the Musk Ox, which it showed at 7r55, is at Deep
    // Winter, whose card is the icon above).
    expect(technologySubjectV7("DRILL", "ICE_FOLK")).toBe(
      "IMPROVEMENT:WORKSHOP",
    );
    expect(technologySubjectV7("FORTIFICATION", "ORIGINAL")).toBe(
      "ICON:TECH:FORTIFICATION",
    );
    const bolas: CommandV7 = {
      kind: "THROW_BOLAS",
      unitId: 1 as never,
      targetUnitId: 2 as never,
    };
    expect(commandSubjectV7(bolas, "ICE_FOLK")).toBe("ICON:ACTION:THROW_BOLAS");
    expect(
      commandSubjectV7({ kind: "COLD_SNAP", unitId: 1 as never }, "ICE_FOLK"),
    ).toBe("ICON:ACTION:COLD_SNAP");
  });

  it("falls back to the Human art in the Classic look and LEGACY", () => {
    expect(chibiFallbackSubjectV7("UNIT:ICE_FOLK:KNIGHT")).toBe("UNIT:KNIGHT");
    expect(chibiFallbackSubjectV7("PORTRAIT:ICE_FOLK:GUARD")).toBe(
      "PORTRAIT:GUARD",
    );
    expect(chibiFallbackSubjectV7("CITY:ICE_FOLK:3")).toBe("CITY:3");
    expect(chibiFallbackSubjectV7("ICON:TECH:ICE_FOLK:FORTIFICATION")).toBe(
      "ICON:TECH:FORTIFICATION",
    );
    expect(chibiFallbackSubjectV7("ICON:ACTION:COLD_SNAP")).toBeNull();
    // The live registry holds the Ice Folk art; the default one does not.
    const live = chibiDirectionArtRegistryV7();
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    for (const subject of [
      "UNIT:ICE_FOLK:FIGHTER",
      "CITY:ICE_FOLK:1",
      ...ICE_FOLK_EFFECT_SUBJECTS_V7,
    ] as const) {
      expect(live.variants(subject), subject).toHaveLength(1);
      expect(classic.variants(subject), subject).toHaveLength(0);
    }
  });

  it("anchors the pennant on each camp's own bone pole", () => {
    for (const [id, anchor] of Object.entries(ICE_FOLK_FLAG_ANCHORS_V7))
      expect(DIRECTION_FLAG_ANCHORS_V7[id], id).toEqual(anchor);
  });
});

describe("the Snow overlay and the Blizzard (section 13.1)", () => {
  const view = humanView(iceFolkUiFixtureV7());

  it("plans Snow and the Blizzard from the view's flags, with exposed edges", () => {
    const plan = planFor(view, null);
    const cells = iceFolkTerrainCellsV7(view);
    const terrain = plan.entries.filter((entry) => entry.kind === "TERRAIN");
    for (const tile of view.board.tiles) {
      if (!tile.explored) continue;
      const entry = terrain.find(
        (candidate) =>
          candidate.at.x === tile.at.x && candidate.at.y === tile.at.y,
      );
      expect(entry?.snow !== undefined, `${tile.at.x},${tile.at.y}`).toBe(
        tile.snow === true && tile.biome !== null,
      );
      expect(entry?.blizzard === true, `${tile.at.x},${tile.at.y}`).toBe(
        tile.blizzard === true,
      );
    }
    const snowy = (x: number, y: number): boolean =>
      view.board.tiles.some(
        (tile) =>
          tile.at.x === x &&
          tile.at.y === y &&
          tile.explored &&
          tile.snow === true &&
          tile.biome !== null,
      );
    for (const [key, cell] of cells.snow) {
      const [x, y] = key.split(",").map(Number) as [number, number];
      const exposed = (dx: number, dy: number): boolean => {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= view.board.width ||
          ny >= view.board.height
        )
          return false;
        return !snowy(nx, ny);
      };
      expect(cell.edges, key).toBe(
        (exposed(0, -1) ? SNOW_EDGE_NORTH_V7 : 0) |
          (exposed(1, 0) ? SNOW_EDGE_EAST_V7 : 0) |
          (exposed(0, 1) ? SNOW_EDGE_SOUTH_V7 : 0) |
          (exposed(-1, 0) ? SNOW_EDGE_WEST_V7 : 0),
      );
      expect(cell.variant).toBe(iceFolkSnowVariantV7({ x, y }));
    }
    expect(cells.snow.size).toBeGreaterThan(0);
    expect(cells.blizzard.size).toBe(9);
  });

  it("plans nothing of the winter in a match without an Ice Folk seat", () => {
    const martian = humanView(martianUiFixtureV7());
    const plan = planFor(martian, null);
    expect(
      plan.entries.some(
        (entry) =>
          entry.snow !== undefined ||
          entry.blizzard !== undefined ||
          entry.iceFolk !== undefined,
      ),
    ).toBe(false);
  });

  it("draws one cached Snow tile per Snow cell, over the ground and before any Road or piece", () => {
    const plan = planFor(view, null);
    const log = draw(plan);
    const snow = drawIndexes(log, (image) => "snow" in image);
    expect(snow).toHaveLength(
      plan.entries.filter((entry) => entry.snow !== undefined).length,
    );
    const pieces = drawIndexes(
      log,
      (image) =>
        typeof image.id === "string" &&
        (image.id.startsWith("unit-") || image.id.startsWith("building-")),
    );
    const firstRoad = log.findIndex((call) => call[0] === "lineTo");
    expect(Math.max(...snow)).toBeLessThan(Math.min(...pieces));
    expect(Math.max(...snow)).toBeLessThan(firstRoad);
    // Every tile is the one of its cell's edges and variant.
    const tokens = snow.map(
      (index) => (log[index]?.[1] as { snow: string }).snow,
    );
    expect(tokens).toEqual(
      plan.entries
        .filter((entry) => entry.kind === "TERRAIN" && entry.snow !== undefined)
        .map((entry) => `${entry.snow?.edges}|${entry.snow?.variant}`),
    );
  });

  it("caps the raised Forest and Mountain bodies on Snow", () => {
    const log = draw(planFor(view, null));
    const caps = drawIndexes(log, (image) => image.caps === "SNOW");
    const tall = view.board.tiles.filter(
      (tile) =>
        tile.explored &&
        tile.snow === true &&
        (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN"),
    );
    expect(caps).toHaveLength(tall.length);
  });

  it("drops the same Blizzard flakes for the same clock, and freezes them at 0", () => {
    const plan = planFor(view, null);
    const fills = (log: readonly LogEntry[]) =>
      log.filter((call) => call[0] === "fillRect");
    const at1 = fills(draw(plan, { blizzardTimeMs: 1_234 }));
    expect(fills(draw(plan, { blizzardTimeMs: 1_234 }))).toEqual(at1);
    expect(fills(draw(plan, { blizzardTimeMs: 5_678 }))).not.toEqual(at1);
    // Reduced motion draws the time-0 flakes whatever the clock says.
    expect(
      fills(draw(plan, { blizzardTimeMs: 5_678, reducedMotion: true })),
    ).toEqual(fills(draw(plan, { blizzardTimeMs: 0 })));
    expect(iceFolkBlizzardFlakesV7({ x: 1, y: 1 }, 0)).toEqual(
      iceFolkBlizzardFlakesV7({ x: 1, y: 1 }, 0),
    );
  });
});

describe("Chill markers on the board (section 13.1)", () => {
  const view = humanView(iceFolkUiFixtureV7());
  const plan = planFor(view, null);
  const marker = (at: CoordV7) =>
    plan.entries.find(
      (entry) =>
        entry.kind === "UNIT" && entry.at.x === at.x && entry.at.y === at.y,
    );

  it("marks Frozen and Frosted units of any owner, and never a thawing one", () => {
    expect(marker(AT.frozenEnemy)?.iceFolk?.chill).toBe("FROZEN");
    expect(marker(AT.shatterTarget)?.iceFolk?.chill).toBe("FROSTED");
    expect(marker(AT.thawingEnemy)?.iceFolk).toBeUndefined();
    expect(marker(AT.sweepTarget)?.iceFolk).toBeUndefined();
    expect(marker(AT.witch)?.iceFolk).toEqual({
      chill: null,
      shatterWindow: null,
      witch: true,
    });
    expect(marker(AT.yeti)?.faction).toBe("ICE_FOLK");
    // Thanks to Brittle the window is four HP here.
    expect(marker(AT.shatterTarget)?.iceFolk?.shatterWindow).toBe(4);
  });

  it("cases a Frozen unit and rimes a Frosted one over its own sprite", () => {
    const log = draw(plan);
    const casings = drawIndexes(log, (image) => "casing" in image);
    const rimes = drawIndexes(log, (image) => image.caps === "RIME");
    expect(casings).toHaveLength(1);
    expect(rimes).toHaveLength(
      plan.entries.filter((entry) => entry.iceFolk?.chill === "FROSTED").length,
    );
    // A Shatter in progress cases its unit to the top, then it is gone.
    const target = unitAt(view, AT.shatterTarget);
    const shatter = draw(plan, {
      iceFolkShatter: { unitId: target.id, elapsedMs: 50 },
    });
    expect(drawIndexes(shatter, (image) => image.casing === 1).length).toBe(1);
  });

  it("draws the Shatter window as the lowest threshold HP of the bar", () => {
    const { context, log } = recordingContext();
    drawShatterWindowV7(
      context,
      {
        vertical: false,
        inner: { x: 0, y: 0, width: 100, height: 5 },
      },
      8,
      10,
      4,
    );
    const rects = log.filter((call) => call[0] === "fillRect");
    // The solid window (4 of 10 HP) and the 1 px divider at its edge.
    expect(rects[0]).toEqual(["fillRect", 0, 0, 40, 5]);
    expect(rects[1]?.[3]).toBe(1);
  });
});

describe("Ice Folk targets and previews on the board (section 13.1)", () => {
  const state = iceFolkUiFixtureV7();
  const view = humanView(state);

  it("aims a Bolas: only its targets, each with the Frozen or Frosted hint", () => {
    const sled = unitAt(view, AT.sled);
    const plan = planFor(view, AT.sled, {
      iceFolkPick: { kind: "THROW_BOLAS", unitId: sled.id },
    });
    const offered = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "THROW_BOLAS" && command.unitId === sled.id,
    );
    expect(plan.targets.map((target) => target.family)).toEqual(
      offered.map(() => "THROW_BOLAS"),
    );
    const target = plan.targets.find(
      (candidate) =>
        candidate.at.x === AT.bolasTarget.x &&
        candidate.at.y === AT.bolasTarget.y,
    );
    const preview = previewBolasV7(
      view,
      sled.id,
      unitAt(view, AT.bolasTarget).id,
    );
    if (preview === null) throw new Error("no Bolas preview");
    const lines = bolasPreviewLinesV7(view, preview);
    expect(target?.previewLabel).toBe(
      preview.becomesSluggish ? "Frozen" : "Frosted",
    );
    expect(target?.previewNote).toBe(lines.slice(1).join(" · "));
  });

  it("aims a Cold Snap: every target carries the one command, inside its reach", () => {
    const witch = unitAt(view, AT.witch);
    const plan = planFor(view, AT.witch, {
      iceFolkPick: { kind: "COLD_SNAP", unitId: witch.id },
    });
    const preview = previewColdSnapV7(view, witch.id);
    expect(plan.targets).toHaveLength(preview?.targets.length ?? -1);
    expect(
      plan.targets.every(
        (target) =>
          target.family === "COLD_SNAP" &&
          target.command.kind === "COLD_SNAP" &&
          target.command.unitId === witch.id,
      ),
    ).toBe(true);
    expect(
      plan.entries.some(
        (entry) =>
          entry.kind === "ABILITY_AREA" && entry.abilityStyle === "COLD_SNAP",
      ),
    ).toBe(true);
  });

  it("labels a shattering attack Shatters and draws a Sweep's flank victims", () => {
    const shatter = planFor(view, AT.yeti).targets.find(
      (target) =>
        target.family === "ATTACK" &&
        target.at.x === AT.shatterTarget.x &&
        target.at.y === AT.shatterTarget.y,
    );
    expect(shatter?.previewLabel).toBe(SHATTERS_PREVIEW_V7);
    expect(shatter?.previewNote).toContain(CHILLED_PREVIEW_V7);
    const sweepPreview = queryCombatPreviewV7(
      view,
      unitAt(view, AT.mammoth).id,
      unitAt(view, AT.sweepTarget).id,
    );
    if (sweepPreview === null) throw new Error("no Sweep preview");
    const sweep = planFor(view, AT.mammoth).targets.find(
      (target) =>
        target.family === "ATTACK" &&
        target.at.x === AT.sweepTarget.x &&
        target.at.y === AT.sweepTarget.y,
    );
    expect(sweep?.sweep).toEqual(
      iceFolkCombatLinesV7(view, sweepPreview).sweep.map((entry) => ({
        at: entry.at,
        label: `−${entry.damage}`,
        lethal: entry.dies,
      })),
    );
    expect(sweep?.previewLabel).toBe(
      `Deal ${sweepPreview.damageToDefender} · take ${sweepPreview.damageToAttacker} · sweep ${sweepPreview.splash.length}`,
    );
  });

  it("outlines the selected Witch's nine tiles", () => {
    const plan = planFor(view, AT.witch);
    expect(
      plan.entries.find((entry) => entry.blizzardRing === true)?.at,
    ).toEqual(AT.witch);
    const log = draw(plan);
    expect(log.some((call) => call[0] === "arcTo")).toBe(true);
  });
});

describe("Ice Folk cues (section 13.1, ICE_FOLK.md effects)", () => {
  const boundary = (
    state: GameStateV7,
    find: (command: CommandV7) => boolean,
  ) => {
    const view = humanView(state);
    const command = queryPlayerCommandsV7(view).find(find);
    if (command === undefined) throw new Error("command not offered");
    const result = applyCommandV7(state, state.humanPlayerId, command);
    if (!result.accepted) throw new Error("rejected");
    const after = humanView(result.state);
    const envelope = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    return corePresentationPlanV7(view, envelope, after);
  };
  const state = iceFolkUiFixtureV7();
  const view = humanView(state);
  const id = (at: CoordV7) => unitAt(view, at).id;

  it("holds a shattered unit for its Shatter, which follows the hit", () => {
    const steps = boundary(
      state,
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === id(AT.yeti) &&
        command.targetUnitId === id(AT.shatterTarget),
    );
    const hit = steps.findIndex((step) => step.kind === "MELEE");
    expect(steps[hit]).toMatchObject({ holdTarget: true });
    expect(steps[hit + 1]).toMatchObject({
      kind: "ICE_FOLK",
      effect: "SHATTER",
      unitId: id(AT.shatterTarget),
      durationMs: ICE_FOLK_EFFECT_DURATIONS_V7.SHATTER,
    });
  });

  it("throws the Bolas from the Sled and rings the Cold Snap from the Witch", () => {
    const bolas = boundary(
      state,
      (command) =>
        command.kind === "THROW_BOLAS" &&
        command.targetUnitId === id(AT.bolasTarget),
    );
    expect(bolas).toEqual([
      expect.objectContaining({
        kind: "ICE_FOLK",
        effect: "BOLAS",
        from: AT.sled,
        cells: [AT.bolasTarget],
      }),
    ]);
    const snap = boundary(state, (command) => command.kind === "COLD_SNAP");
    expect(snap[0]).toMatchObject({
      kind: "ICE_FOLK",
      effect: "COLD_SNAP",
      from: AT.witch,
    });
  });

  it("sweeps the Mammoth's three tiles and lobs the Yeti's Rockfall", () => {
    const sweep = boundary(
      state,
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === id(AT.mammoth) &&
        command.targetUnitId === id(AT.sweepTarget),
    );
    expect(sweep.find((step) => step.kind === "ICE_FOLK")).toMatchObject({
      effect: "SWEEP",
      from: AT.mammoth,
    });
    const rockfall = boundary(
      state,
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === id(AT.rockfallYeti) &&
        command.targetUnitId === id(AT.rockfallTarget),
    );
    expect(rockfall[0]?.kind).toBe("CATAPULT");
  });

  it("follows the Shatter timeline on the board and draws every cue without art", () => {
    const [freeze, crack, burst] = ICE_FOLK_SHATTER_TIMELINE_V7;
    expect(shatterBoardCueV7(0)).toMatchObject({ casing: true, gone: false });
    expect(shatterBoardCueV7(crack?.fromMs ?? 0).cracks).toBe(0);
    expect(shatterBoardCueV7((freeze?.toMs ?? 0) + 40).cracks).toBeGreaterThan(
      0,
    );
    expect(shatterBoardCueV7(burst?.fromMs ?? 0).gone).toBe(true);
    for (const effect of [
      "SHATTER",
      "COLD_SNAP",
      "BOLAS",
      "COLD_AURA",
      "SWEEP",
    ] as const) {
      const { context, log } = recordingContext();
      drawIceFolkFeedbackV7(
        context,
        { offsetX: 0, offsetY: 0, zoom: 1 },
        {
          effect,
          from: AT.witch,
          cells: [AT.snapFrozen],
          progress: effect === "SHATTER" ? 0.3 : 0.6,
        },
      );
      expect(
        log.some((call) => call[0] === "fill" || call[0] === "stroke"),
        effect,
      ).toBe(true);
    }
  });

  it("draws the victim's view of a Blizzard on the enemy land", () => {
    const victim = humanView(iceFolkVictimFixtureV7());
    const plan = planFor(victim, null);
    const blizzard = plan.entries.filter(
      (entry) => entry.kind === "TERRAIN" && entry.blizzard === true,
    );
    expect(blizzard.map((entry) => entry.at)).toContainEqual(
      ICE_FOLK_VICTIM_V7.frozenFighter,
    );
  });
});
