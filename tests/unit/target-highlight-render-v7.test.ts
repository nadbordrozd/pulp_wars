import { describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type MapCommandTargetV7,
} from "../../src/render/canvas/board-renderer-v7";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
import {
  BOARD_PICK_PANEL_MAX_BUTTONS_V7,
  TARGET_HIGHLIGHTS_V7,
  TARGET_HIGHLIGHT_CASING_V7,
  TARGET_HIGHLIGHT_EMPHASIS_V7,
  TARGET_HIGHLIGHT_FAMILIES_V7,
  TARGET_HIGHLIGHT_FRAME_V7,
  TARGET_HIGHLIGHT_LEAST_WIDTH_PX_V7,
  TARGET_HIGHLIGHT_STYLES_V7,
  UNARMED_TARGET_FAMILIES_V7,
  drawTargetHighlightV7,
  targetHighlightStyleV7,
  targetIsSteppedV7,
  type TargetHighlightOptionsV7,
  type TargetHighlightStyleV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  CANDY_HEALER_V7,
  CANDY_UI_V7,
  candyHealerFixtureV7,
  candyUiFixtureV7,
} from "../fixtures/v7-candy-ui";
import {
  DINOSAUR_SHOWCASE_V7,
  dinosaurCityFixtureV7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";
import { DWARF_UI_V7, dwarfUiFixtureV7 } from "../fixtures/v7-dwarf-ui";
import { ICE_FOLK_UI_V7, iceFolkUiFixtureV7 } from "../fixtures/v7-ice-folk-ui";
import {
  MARTIAN_MOBILITY_V7,
  MARTIAN_UI_V7,
  martianMobilityFixtureV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";
import {
  MOVE_TARGETS_UI_V7,
  moveTargetsFixtureV7,
} from "../fixtures/v7-move-targets-ui";

/**
 * Bead pulp_wars-9im: the board's target highlight vocabulary
 * (docs/ui/BOARD_TARGETING.md) and the style of every family of target the
 * board plans, read from the engine's offered commands on the UI fixtures.
 */

/** Every family of map target; a new one must be given a style here. */
const EVERY_FAMILY: Readonly<
  Record<MapCommandTargetV7["family"], TargetHighlightStyleV7>
> = {
  MOVE: "MOVE",
  DISEMBARK: "MOVE",
  LANDING_AFTER_MOVE: "MOVE",
  TUNNEL: "MOVE",
  TUNNEL_DESTINATION: "MOVE",
  TUNNEL_RIDER: "MOVE",
  BOMB_RUN: "MOVE",
  SUGAR_RUSH: "MOVE",
  ATTACK: "ATTACK",
  MIND_CONTROL: "ATTACK",
  TRACTOR_BEAM: "ATTACK",
  THROW_BOLAS: "ATTACK",
  COLD_SNAP: "ATTACK",
  // Ice Folk Freeze (`pulp_wars-w49.38`).
  FROST_BOLT: "ATTACK",
  STAMPEDE: "ATTACK",
  BOMB_TARGET: "ATTACK",
  WHIRL: "ATTACK",
  BOARD: "ATTACK",
  HATCH: "SUPPORT",
  SUGAR_TOSS: "SUPPORT",
  BEAM_DOWN_PASSENGER: "SUPPORT",
  TUNNEL_PASSENGER: "SUPPORT",
  LAY_EGG: "PLACE",
  BEAM_DOWN: "PLACE",
  ASSEMBLE: "PLACE",
  BARRICADE: "PLACE",
  REBAKE: "PLACE",
  // The Candy redesign (`pulp_wars-jdb.14`).
  REBAKE_CRUMBS: "PLACE",
  TOP_UP: "SUPPORT",
  FREEZE: "PLACE",
  // The giants' signatures (`pulp_wars-w49.32`).
  SWALLOW: "ATTACK",
  STOMP: "ATTACK",
  TOSS_PASSENGER: "SUPPORT",
  TOSS: "PLACE",
  BREAK_OFF_FIRST: "PLACE",
  BREAK_OFF: "PLACE",
  // The Cultists (`pulp_wars-mch9.17`).
  SACRIFICE: "SUPPORT",
  SEIZE: "ATTACK",
  // The channel (`pulp_wars-mch9.18`).
  SUMMON_HELPER: "SUPPORT",
  SUMMON: "PLACE",
  CHANNEL: "SUPPORT",
  ANCHOR: "SUPPORT",
  // Rituals, hexes and tricks (`pulp_wars-mch9.19`): a Switcheroo's own
  // unit says Help for itself (`highlight`).
  STARFALL: "PLACE",
  GREAT_SUMMONING: "PLACE",
  TENTACLE: "PLACE",
  PROCLAIM: "ATTACK",
  RIBBIT: "ATTACK",
  SWITCHEROO: "ATTACK",
  // The Cult redesign (`pulp_wars-mch9.34`): the Stargazer a cultist joins.
  JOIN_CHANT: "SUPPORT",
};

describe("target highlight vocabulary", () => {
  it("gives every family of map target exactly one of four styles", () => {
    expect([...TARGET_HIGHLIGHT_STYLES_V7]).toEqual([
      "MOVE",
      "ATTACK",
      "SUPPORT",
      "PLACE",
    ]);
    expect([...TARGET_HIGHLIGHT_FAMILIES_V7].sort()).toEqual(
      Object.keys(EVERY_FAMILY).sort(),
    );
    for (const [family, style] of Object.entries(EVERY_FAMILY))
      expect(targetHighlightStyleV7(family), family).toBe(style);
    // A target may carry its own style; an unknown family is a Move.
    expect(targetHighlightStyleV7("TRACTOR_BEAM", "SUPPORT")).toBe("SUPPORT");
    expect(targetHighlightStyleV7(undefined)).toBe("MOVE");
  });

  it("tells the styles apart by colour and by the furniture of their corner brackets", () => {
    const specs = TARGET_HIGHLIGHT_STYLES_V7.map(
      (style) => TARGET_HIGHLIGHTS_V7[style],
    );
    expect(new Set(specs.map((spec) => spec.shape)).size).toBe(4);
    expect(new Set(specs.map((spec) => spec.stroke)).size).toBe(4);
    expect(new Set(specs.map((spec) => spec.name)).size).toBe(4);
    // Bead pulp_wars-2yc.88: Move is light teal brackets, the lightest
    // weight (a unit often has 20 to 40 of them); Attack keeps its red and
    // is the heaviest; Help is lavender; Place keeps its cream.
    expect(TARGET_HIGHLIGHTS_V7.MOVE).toMatchObject({
      shape: "BRACKETS",
      stroke: "#64e6cf",
      dash: [],
    });
    expect(TARGET_HIGHLIGHTS_V7.ATTACK).toMatchObject({
      shape: "BRACKETS_FRAME",
      stroke: "#ff655f",
      dash: [],
    });
    expect(TARGET_HIGHLIGHTS_V7.SUPPORT).toMatchObject({
      shape: "BRACKETS_PLUS",
      stroke: "#c49bff",
    });
    expect(TARGET_HIGHLIGHTS_V7.PLACE).toMatchObject({
      shape: "BRACKETS_PIPS",
      stroke: "#ffe7a3",
    });
    for (const spec of specs) {
      expect(spec.width[0], spec.style).toBeGreaterThanOrEqual(
        TARGET_HIGHLIGHTS_V7.MOVE.width[0],
      );
      expect(spec.width[0], spec.style).toBeLessThanOrEqual(
        TARGET_HIGHLIGHTS_V7.ATTACK.width[0],
      );
      // High contrast is a step thicker for every style.
      expect(spec.width[1], spec.style).toBeGreaterThan(spec.width[0]);
      // The brackets sit well inside the tile (128 world units wide).
      expect(spec.inset, spec.style).toBeGreaterThanOrEqual(10);
      expect(spec.inset + spec.arm, spec.style).toBeLessThan(64);
    }
  });

  it("keeps the Help lavender apart from every faction colour (the Cult's green sat beside the old green)", () => {
    for (const [faction, colour] of Object.entries(FACTION_COLOURS_V7))
      expect(
        colourDistance(rgb(TARGET_HIGHLIGHTS_V7.SUPPORT.stroke), rgb(colour)),
        faction,
      ).toBeGreaterThan(70);
  });

  it("keeps the colours apart for red-green and blue-yellow colour blindness, and readable on a dark casing", () => {
    const strokes = TARGET_HIGHLIGHT_STYLES_V7.map(
      (style) => [style, TARGET_HIGHLIGHTS_V7[style].stroke] as const,
    );
    for (const vision of ["NORMAL", "PROTAN", "DEUTAN", "TRITAN"] as const)
      for (const [left, leftStroke] of strokes)
        for (const [right, rightStroke] of strokes) {
          if (left >= right) continue;
          expect(
            colourDistance(
              simulate(leftStroke, vision),
              simulate(rightStroke, vision),
            ),
            `${left} / ${right} (${vision})`,
          ).toBeGreaterThan(45);
        }
    // Every mark sits on a dark casing, so it reads on snow and on grass.
    const casing = TARGET_HIGHLIGHT_CASING_V7.slice(0, 7);
    for (const [style, stroke] of strokes)
      expect(contrast(stroke, casing), style).toBeGreaterThan(4.5);
    expect(contrast("#ffffff", casing)).toBeGreaterThan(12);
  });

  it("draws each style's own corners inside the tile, never on its edges, the same every time (no motion)", () => {
    const cell = { x: 100, y: 100, size: 80, zoom: 0.625 };
    const drawn = (
      style: TargetHighlightStyleV7,
      options: TargetHighlightOptionsV7 = {},
    ): readonly string[] => {
      const log: string[] = [];
      drawTargetHighlightV7(recordingContext(log), cell, style, options);
      return log;
    };
    const count = (log: readonly string[], call: string): number =>
      log.filter((entry) => entry === call || entry.startsWith(`${call}:`))
        .length;
    const move = drawn("MOVE");
    // Four two-armed brackets, solid, in teal on the casing.
    expect(count(move, "lineTo")).toBe(8);
    expect(count(move, "moveTo")).toBe(4);
    expect(count(move, "rect")).toBe(0);
    expect(count(move, "arc")).toBe(0);
    expect(move.filter((entry) => entry.startsWith("setLineDash:"))).toEqual([
      "setLineDash:",
      "setLineDash:",
    ]);
    expect(move).toContain("strokeStyle:#64e6cf");
    const attack = drawn("ATTACK");
    // A thin solid frame inside the tile, then the four brackets.
    expect(count(attack, "rect")).toBe(1);
    expect(count(attack, "lineTo")).toBe(8);
    expect(attack).toContain("strokeStyle:#ff655f");
    const support = drawn("SUPPORT");
    // The brackets and a plus badge; no ring.
    expect(count(support, "arc")).toBe(1);
    expect(count(support, "lineTo")).toBe(8 + 2);
    expect(support).toContain("strokeStyle:#c49bff");
    const place = drawn("PLACE");
    // The brackets and a square pip on each corner.
    expect(count(place, "fillRect")).toBe(4);
    expect(count(place, "lineTo")).toBe(8);
    expect(place).toContain("strokeStyle:#ffe7a3");
    // Every style is cased, and a mark never depends on time.
    for (const style of TARGET_HIGHLIGHT_STYLES_V7) {
      expect(drawn(style)).toContain(
        `strokeStyle:${TARGET_HIGHLIGHT_CASING_V7}`,
      );
      expect(drawn(style)).toEqual(drawn(style));
    }
    // Every point of every mark is inside the tile and clear of its edges,
    // so two neighbouring targets never share a line.
    for (const style of TARGET_HIGHLIGHT_STYLES_V7) {
      const points: (readonly [number, number])[] = [];
      drawTargetHighlightV7(pointContext(points), cell, style);
      expect(points.length, style).toBeGreaterThan(0);
      for (const [x, y] of points) {
        const fromEdge =
          cell.size / 2 - Math.max(Math.abs(x - cell.x), Math.abs(y - cell.y));
        expect(fromEdge, `${style} ${x},${y}`).toBeGreaterThanOrEqual(
          TARGET_HIGHLIGHT_FRAME_V7.inset * cell.zoom - 0.001,
        );
      }
    }
    // A variant keeps its own stroke and dash on a whole dark casing.
    const launch = drawn("MOVE", { stroke: "#c7e7f5", dash: [3, 5] });
    expect(launch).toContain("strokeStyle:#c7e7f5");
    expect(launch.filter((entry) => entry.startsWith("setLineDash:"))).toEqual([
      "setLineDash:",
      `setLineDash:${[3 * 0.625, 5 * 0.625].join()}`,
    ]);
    // A chosen Tunnel destination adds the solid frame to the Move mark.
    expect(count(drawn("MOVE", { frame: true }), "rect")).toBe(1);
  });

  it("draws a thicker mark in high contrast, and a heavier one with a soft wash when hovered or focused", () => {
    const cell = { x: 100, y: 100, size: 128, zoom: 1 };
    const widths = (
      style: TargetHighlightStyleV7,
      options: TargetHighlightOptionsV7 = {},
    ): number[] => {
      const log: string[] = [];
      drawTargetHighlightV7(recordingContext(log), cell, style, options);
      return log
        .filter((entry) => entry.startsWith("lineWidth:"))
        .map((entry) => Number(entry.slice("lineWidth:".length)));
    };
    for (const style of TARGET_HIGHLIGHT_STYLES_V7) {
      const normal = Math.max(...widths(style));
      expect(
        Math.max(...widths(style, { highContrast: true })),
        style,
      ).toBeCloseTo(
        (normal / TARGET_HIGHLIGHTS_V7[style].width[0]) *
          TARGET_HIGHLIGHTS_V7[style].width[1],
      );
      expect(Math.max(...widths(style, { emphasis: true })), style).toBeCloseTo(
        normal * TARGET_HIGHLIGHT_EMPHASIS_V7.widthScale,
      );
      const log: string[] = [];
      drawTargetHighlightV7(recordingContext(log), cell, style, {
        emphasis: true,
      });
      expect(log, style).toContain(
        `fillStyle:${TARGET_HIGHLIGHTS_V7[style].stroke}${TARGET_HIGHLIGHT_EMPHASIS_V7.washAlpha}`,
      );
      // At rest a mark has no wash.
      const rest: string[] = [];
      drawTargetHighlightV7(recordingContext(rest), cell, style);
      expect(
        rest.some((entry) =>
          entry.endsWith(TARGET_HIGHLIGHT_EMPHASIS_V7.washAlpha),
        ),
      ).toBe(false);
    }
    // The Move mark stays the lightest at every setting, so 20 to 40 of
    // them do not crowd the board.
    for (const highContrast of [false, true])
      for (const style of ["ATTACK", "SUPPORT", "PLACE"] as const)
        expect(
          Math.max(...widths("MOVE", { highContrast })),
          style,
        ).toBeLessThan(Math.max(...widths(style, { highContrast })));
    // A phone's small zoom keeps a visible stroke.
    const log: string[] = [];
    drawTargetHighlightV7(
      recordingContext(log),
      { x: 50, y: 50, size: 128 * 0.3, zoom: 0.3 },
      "MOVE",
    );
    const least = log
      .filter((entry) => entry.startsWith("lineWidth:"))
      .map((entry) => Number(entry.slice("lineWidth:".length)));
    expect(Math.min(...least)).toBeGreaterThanOrEqual(
      TARGET_HIGHLIGHT_LEAST_WIDTH_PX_V7,
    );
  });

  it("steps the keyboard through units and places, not plain Move tiles", () => {
    for (const family of ["MOVE", "DISEMBARK", "LANDING_AFTER_MOVE"])
      expect(targetIsSteppedV7(family)).toBe(false);
    for (const family of ["ATTACK", "SUGAR_TOSS", "HATCH", "REBAKE"])
      expect(targetIsSteppedV7(family)).toBe(true);
    // The families shown without arming never claim one tile twice.
    expect([...UNARMED_TARGET_FAMILIES_V7].sort()).toEqual(
      [
        "ATTACK",
        "DISEMBARK",
        "HATCH",
        "LANDING_AFTER_MOVE",
        "MOVE",
        "SUGAR_TOSS",
      ].sort(),
    );
    expect(BOARD_PICK_PANEL_MAX_BUTTONS_V7).toBe(5);
  });
});

describe("target plans per action family", () => {
  it("a healer shows its moves, attacks and heals together, each on its own tile", () => {
    const { view, targets } = planOf(
      candyHealerFixtureV7(),
      CANDY_HEALER_V7.gunner,
    );
    const byStyle = groupByStyle(targets);
    expect(byStyle.MOVE.length).toBeGreaterThan(0);
    expect(byStyle.ATTACK.map((target) => target.at).sort(byCoord)).toEqual(
      [CANDY_HEALER_V7.enemyNear, CANDY_HEALER_V7.enemyFar].sort(byCoord),
    );
    expect(byStyle.SUPPORT.map((target) => target.at).sort(byCoord)).toEqual(
      [CANDY_HEALER_V7.woundedNear, CANDY_HEALER_V7.woundedFar].sort(byCoord),
    );
    expect(byStyle.PLACE).toEqual([]);
    // No tile carries two targets, so a click is never ambiguous.
    expect(new Set(targets.map((target) => key(target.at))).size).toBe(
      targets.length,
    );
    for (const target of targets)
      expect(UNARMED_TARGET_FAMILIES_V7).toContain(target.family);
    // Each mark carries the engine's command and exact preview.
    const offered = queryPlayerCommandsV7(view);
    for (const target of [...byStyle.ATTACK, ...byStyle.SUPPORT]) {
      expect(offered).toContainEqual(target.command);
      expect(target.previewLabel).toMatch(/^(Deal \d+|\+\d+)/);
    }
    // Bead pulp_wars-2yc.88: no mark takes a tile edge; each is inside
    // its own tile.
    const entries = buildBoardRenderPlanV7(view, offered, {
      selection: { kind: "UNIT", unitId: unitAt(view, CANDY_HEALER_V7.gunner) },
      selectedUnitId: unitAt(view, CANDY_HEALER_V7.gunner),
      selectedAchievement: null,
    }).entries.filter((entry) => entry.kind === "TARGET");
    expect(entries.length).toBe(targets.length);
    for (const entry of entries) expect(entry.targetEdges).toBeUndefined();
  });

  it("marks only the tiles a unit may move to: a water tile and an own unit among its reach carry no mark", () => {
    const { view, targets } = planOf(
      moveTargetsFixtureV7(),
      MOVE_TARGETS_UI_V7.raider,
    );
    const byStyle = groupByStyle(targets);
    const marked = new Set(targets.map((target) => key(target.at)));
    // The holes in the reach: Shallow Water and the Raider's own Guard.
    for (const hole of [MOVE_TARGETS_UI_V7.water, MOVE_TARGETS_UI_V7.guard]) {
      expect(marked.has(key(hole)), key(hole)).toBe(false);
      // ...while at least three of its four neighbours are marked targets,
      // the case a shared-border grid made ambiguous.
      const around = [
        { x: hole.x, y: hole.y - 1 },
        { x: hole.x + 1, y: hole.y },
        { x: hole.x, y: hole.y + 1 },
        { x: hole.x - 1, y: hole.y },
      ].filter((at) => marked.has(key(at)));
      expect(around.length, key(hole)).toBeGreaterThanOrEqual(2);
    }
    // A tile beyond the water is reached round it.
    expect(marked.has(key({ x: 5, y: 3 }))).toBe(true);
    // Moves over Grass, the Forest and the Mountain, and the Attack.
    expect(marked.has(key(MOVE_TARGETS_UI_V7.forest))).toBe(true);
    expect(marked.has(key(MOVE_TARGETS_UI_V7.mountain))).toBe(true);
    expect(byStyle.MOVE.length).toBeGreaterThan(8);
    expect(byStyle.ATTACK.map((target) => target.at)).toEqual([
      MOVE_TARGETS_UI_V7.enemyNear,
    ]);
    // Every target is an offered command; the plan's entries own no edges.
    const offered = queryPlayerCommandsV7(view);
    for (const target of targets)
      expect(offered).toContainEqual(target.command);
    const raider = unitAt(view, MOVE_TARGETS_UI_V7.raider);
    const entries = buildBoardRenderPlanV7(view, offered, {
      selection: { kind: "UNIT", unitId: raider },
      selectedUnitId: raider,
      selectedAchievement: null,
    }).entries.filter((entry) => entry.kind === "TARGET");
    for (const entry of entries) expect(entry.targetEdges).toBeUndefined();
    // Drawn, each target's mark is in its own colour and inside its tile:
    // each stroked path's points, with the colour they were stroked in.
    let stroke = "";
    let path: (readonly [number, number])[] = [];
    const drawn: {
      readonly stroke: string;
      readonly x: number;
      readonly y: number;
    }[] = [];
    const context = new Proxy(
      {},
      {
        get: (_target, name) =>
          name === "canvas"
            ? undefined
            : name === "measureText"
              ? () => ({ width: 10 })
              : name === "createLinearGradient" ||
                  name === "createRadialGradient"
                ? () => ({ addColorStop: () => undefined })
                : name === "beginPath"
                  ? () => {
                      path = [];
                    }
                  : name === "moveTo" || name === "lineTo"
                    ? (x: number, y: number) => path.push([x, y])
                    : name === "stroke"
                      ? () => {
                          for (const [x, y] of path)
                            drawn.push({ stroke, x, y });
                        }
                      : () => undefined,
        set: (_target, name, value) => {
          if (name === "strokeStyle") stroke = String(value);
          return true;
        },
      },
    ) as CanvasRenderingContext2D;
    drawBoardV7({
      context,
      viewport: { width: 1400, height: 1400 },
      devicePixelRatio: 1,
      camera: { offsetX: 64, offsetY: 64, zoom: 1 },
      plan: {
        version: 7,
        targets,
        entries,
      },
    });
    const tileOf = (x: number, y: number): string =>
      key({ x: Math.round((x - 64) / 128), y: Math.round((y - 64) / 128) });
    for (const style of ["MOVE", "ATTACK"] as const) {
      const tiles = new Set(
        drawn
          .filter(
            (point) => point.stroke === TARGET_HIGHLIGHTS_V7[style].stroke,
          )
          .map((point) => tileOf(point.x, point.y)),
      );
      expect([...tiles].sort(), style).toEqual(
        byStyle[style].map((target) => key(target.at)).sort(),
      );
    }
  });

  it("Candy: Re-bake places, Sugar Toss and Top-Up help, an armed Rush moves and attacks", () => {
    const state = candyUiFixtureV7();
    // The Candy redesign (`pulp_wars-jdb.14`): the Crumbs first, then the
    // tile, both places.
    expect(
      stylesOf(state, CANDY_UI_V7.confectioner, (unitId) => ({
        candyPick: { kind: "REBAKE", unitId },
      })),
    ).toEqual({ REBAKE_CRUMBS: "PLACE" });
    expect(
      stylesOf(state, CANDY_UI_V7.confectioner, (unitId) => ({
        candyPick: { kind: "REBAKE", unitId, from: CANDY_UI_V7.crumbsBear },
      })),
    ).toEqual({ REBAKE: "PLACE" });
    expect(
      stylesOf(state, CANDY_UI_V7.confectioner, (unitId) => ({
        candyPick: { kind: "TOP_UP", unitId },
      })),
    ).toEqual({ TOP_UP: "SUPPORT" });
    expect(
      stylesOf(state, CANDY_UI_V7.gunner, (unitId) => ({
        candyPick: { kind: "SUGAR_TOSS", unitId },
      })),
    ).toEqual({ SUGAR_TOSS: "SUPPORT" });
    expect(
      stylesOf(state, CANDY_UI_V7.gumdrop, (unitId) => ({
        candyPick: { kind: "SUGAR_RUSH", unitId },
      })),
    ).toEqual({ SUGAR_RUSH: "MOVE", ATTACK: "ATTACK" });
  });

  it("Martian: Mind Control and a hostile pull attack, passengers are helped, a beam tile places", () => {
    const state = martianUiFixtureV7();
    expect(
      stylesOf(state, MARTIAN_UI_V7.brain, (unitId) => ({
        martianPick: { kind: "MIND_CONTROL", unitId },
      })),
    ).toEqual({ MIND_CONTROL: "ATTACK" });
    expect(
      stylesOf(state, MARTIAN_UI_V7.mothership, (unitId) => ({
        martianPick: { kind: "TRACTOR_BEAM", unitId },
      })),
    ).toMatchObject({ TRACTOR_BEAM: "ATTACK" });
    expect(
      stylesOf(state, MARTIAN_UI_V7.saucer, (unitId) => ({
        martianPick: { kind: "BEAM_DOWN", unitId, passengerUnitId: null },
      })),
    ).toEqual({ BEAM_DOWN_PASSENGER: "SUPPORT" });
    const view = viewForV7(state, state.humanPlayerId);
    expect(
      stylesOf(state, MARTIAN_UI_V7.saucer, (unitId) => ({
        martianPick: {
          kind: "BEAM_DOWN",
          unitId,
          passengerUnitId: unitAt(view, MARTIAN_UI_V7.capitalGrunt),
        },
      })),
    ).toEqual({ BEAM_DOWN: "PLACE" });
    // A pull of an own unit is a Help ring, by the target's own style.
    const mobility = martianMobilityFixtureV7();
    const pulls = planOf(mobility, MARTIAN_MOBILITY_V7.carrier, (unitId) => ({
      martianPick: { kind: "TRACTOR_BEAM", unitId },
    }));
    const viewer = pulls.view.viewer.id;
    expect(pulls.targets.length).toBeGreaterThan(0);
    for (const target of pulls.targets) {
      const own =
        pulls.view.units.find((unit) => key(unit.at) === key(target.at))
          ?.ownerId === viewer;
      expect(targetHighlightStyleV7(target.family, target.highlight)).toBe(
        own ? "SUPPORT" : "ATTACK",
      );
    }
  });

  it("Ice Folk: Bolas and Cold Snap attack", () => {
    const state = iceFolkUiFixtureV7();
    expect(
      stylesOf(state, ICE_FOLK_UI_V7.sled, (unitId) => ({
        iceFolkPick: { kind: "THROW_BOLAS", unitId },
      })),
    ).toEqual({ THROW_BOLAS: "ATTACK" });
    expect(
      stylesOf(state, ICE_FOLK_UI_V7.witch, (unitId) => ({
        iceFolkPick: { kind: "COLD_SNAP", unitId },
      })),
    ).toEqual({ COLD_SNAP: "ATTACK" });
  });

  it("Dwarf: a Tunnel moves and its Hammerers are helped, a bomb attacks then lands, Assemble places", () => {
    const state = dwarfUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    expect(
      stylesOf(state, DWARF_UI_V7.mole, (unitId) => ({
        dwarfPick: {
          kind: "TUNNEL",
          unitId,
          to: null,
          riderUnitId: unitAt(view, DWARF_UI_V7.rider),
          riderTo: null,
        },
      })),
    ).toEqual({ TUNNEL_PASSENGER: "SUPPORT", TUNNEL_DESTINATION: "MOVE" });
    expect(
      stylesOf(state, DWARF_UI_V7.gyrocopter, (unitId) => ({
        dwarfPick: { kind: "BOMB_RUN", unitId, targetUnitId: null },
      })),
    ).toEqual({ BOMB_TARGET: "ATTACK" });
    expect(
      stylesOf(state, DWARF_UI_V7.gyrocopter, (unitId) => ({
        dwarfPick: {
          kind: "BOMB_RUN",
          unitId,
          targetUnitId: unitAt(view, DWARF_UI_V7.bombTarget),
        },
      })),
    ).toEqual({ BOMB_RUN: "MOVE" });
    expect(
      stylesOf(state, DWARF_UI_V7.engineer, (unitId) => ({
        dwarfPick: { kind: "ASSEMBLE", unitId },
      })),
    ).toEqual({ ASSEMBLE: "PLACE" });
  });

  it("Dinosaur: an Egg to hatch is helped beside the Shaman's moves, a nest tile places", () => {
    const hatch = planOf(
      dinosaurShowcaseFixtureV7(),
      DINOSAUR_SHOWCASE_V7.shaman,
    );
    const styles = groupByStyle(hatch.targets);
    expect(styles.SUPPORT.map((target) => target.at)).toEqual([
      DINOSAUR_SHOWCASE_V7.tRexEgg,
    ]);
    expect(styles.SUPPORT[0]?.family).toBe("HATCH");
    expect(styles.MOVE.length).toBeGreaterThan(0);
    const nest = dinosaurCityFixtureV7();
    const view = viewForV7(nest, nest.humanPlayerId);
    const city = view.cities.find((entry) => entry.ownerId === view.viewer.id);
    if (city === undefined) throw new Error("city missing");
    const targets = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "CITY", cityId: city.id },
      selectedUnitId: null,
      selectedAchievement: null,
      layEgg: { cityId: city.id, role: "KNIGHT" },
    }).targets;
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets)
      expect(targetHighlightStyleV7(target.family)).toBe("PLACE");
  });
});

type PickV7 = Pick<
  BoardRenderInteractionV7,
  "martianPick" | "iceFolkPick" | "dwarfPick" | "candyPick"
>;
type UnitIdOf = PlayerViewOf["units"][number]["id"];
type PlayerViewOf = ReturnType<typeof viewForV7>;

function unitAt(view: PlayerViewOf, at: CoordV7): UnitIdOf {
  const unit = view.units.find((candidate) => key(candidate.at) === key(at));
  if (unit === undefined) throw new Error(`no unit at ${key(at)}`);
  return unit.id;
}

function planOf(
  state: GameStateV7,
  at: CoordV7,
  pick: (unitId: UnitIdOf) => PickV7 = () => ({}),
): {
  readonly view: PlayerViewOf;
  readonly targets: readonly MapCommandTargetV7[];
} {
  const view = viewForV7(state, state.humanPlayerId);
  const unitId = unitAt(view, at);
  return {
    view,
    targets: buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "UNIT", unitId },
      selectedUnitId: unitId,
      selectedAchievement: null,
      ...pick(unitId),
    }).targets,
  };
}

/** The style of each family the aimed plan holds. */
function stylesOf(
  state: GameStateV7,
  at: CoordV7,
  pick: (unitId: UnitIdOf) => PickV7,
): Record<string, TargetHighlightStyleV7> {
  const { targets } = planOf(state, at, pick);
  if (targets.length === 0) throw new Error("the pick has no target");
  return Object.fromEntries(
    targets.map((target) => [
      target.family,
      targetHighlightStyleV7(target.family, target.highlight),
    ]),
  );
}

function groupByStyle(
  targets: readonly MapCommandTargetV7[],
): Record<TargetHighlightStyleV7, MapCommandTargetV7[]> {
  const groups: Record<TargetHighlightStyleV7, MapCommandTargetV7[]> = {
    MOVE: [],
    ATTACK: [],
    SUPPORT: [],
    PLACE: [],
  };
  for (const target of targets)
    groups[targetHighlightStyleV7(target.family, target.highlight)].push(
      target,
    );
  return groups;
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const byCoord = (left: CoordV7, right: CoordV7): number =>
  left.y - right.y || left.x - right.x;

/** A canvas context that records the calls and property sets it gets. */
function recordingContext(log: string[]): CanvasRenderingContext2D {
  return new Proxy(
    {},
    {
      get:
        (_target, name) =>
        (...args: unknown[]) => {
          log.push(
            name === "setLineDash"
              ? `setLineDash:${(args[0] as number[]).join()}`
              : String(name),
          );
        },
      set: (_target, name, value) => {
        log.push(`${String(name)}:${String(value)}`);
        return true;
      },
    },
  ) as CanvasRenderingContext2D;
}

/** A canvas context that records every point a path or rectangle passes. */
function pointContext(
  points: (readonly [number, number])[],
): CanvasRenderingContext2D {
  return new Proxy(
    {},
    {
      get:
        (_target, name) =>
        (...args: number[]) => {
          const [x = 0, y = 0, width = 0, height = 0] = args;
          if (name === "moveTo" || name === "lineTo") points.push([x, y]);
          if (name === "rect" || name === "fillRect" || name === "strokeRect")
            points.push([x, y], [x + width, y + height]);
        },
      set: () => true,
    },
  ) as CanvasRenderingContext2D;
}

type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  return [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  ) as unknown as Rgb;
}

const toLinear = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (value: number): number => {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    255 *
    (clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * clamped ** (1 / 2.4) - 0.055)
  );
};

/** Machado, Oliveira and Fernandes (2009), severity 1.0, in linear RGB. */
const VISION = {
  NORMAL: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  PROTAN: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  DEUTAN: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  TRITAN: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;

function simulate(hex: string, vision: keyof typeof VISION): Rgb {
  const linear = rgb(hex).map(toLinear);
  return VISION[vision].map((row) =>
    toSrgb(
      row.reduce<number>(
        (sum, weight, index) => sum + weight * (linear[index] ?? 0),
        0,
      ),
    ),
  ) as unknown as Rgb;
}

function colourDistance(left: Rgb, right: Rgb): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function luminance(hex: string): number {
  const [red, green, blue] = rgb(hex).map(toLinear) as unknown as Rgb;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(left: string, right: string): number {
  const [light, dark] = [luminance(left), luminance(right)].sort(
    (first, second) => second - first,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
