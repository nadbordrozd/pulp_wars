import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  previewTopUpV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { soundCuesForStepV7 } from "../../src/audio/sound-events-v7";
import {
  GLAZED_OWN_TILE_V7,
  HOP_MOVE_TEXT_V7,
  STUCK_ATTACKER_PREVIEW_V7,
  STUCK_STATUS_V7,
  STUCK_TARGET_PREVIEW_V7,
  THUMP_UNCERTAIN_PREVIEW_V7,
  TOOTHACHE_ATTACK_PREVIEW_V7,
  TOOTHACHE_GIVEN_PREVIEW_V7,
  TOOTHACHE_STATUS_V7,
  TOP_UP_NO_TARGET_V7,
  candyBoundaryNoticeV7,
  candyChipsV7,
  candyCombatLinesV7,
  candyUnitInfoLinesV7,
  glazeTileLinesV7,
  glazedTileTextV7,
  rebakeUnavailableTextV7,
  ricochetPreviewV7,
  thumpPreviewV7,
  topUpBoardLabelV7,
  topUpTargetNameV7,
  topUpUnavailableTextV7,
} from "../../src/render/candy-presentation-v7";
import {
  RICOCHET_LANDS_V7,
  RICOCHET_LEAVES_V7,
  THUMP_DURATION_MS_V7,
  THUMP_HIT_V7,
  attackEffectPlanV7,
  attackReducedMotionProgressV7,
  drawThumpFeedbackV7,
  thumpEffectPlanV7,
  thumpReducedMotionProgressV7,
} from "../../src/render/canvas/attack-effects-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import { HOP_LIFT_TILES_V7 } from "../../src/render/canvas/board-host-v7";
import {
  candyUnitMarkersV7,
  moveHopV7,
} from "../../src/render/canvas/candy-board-plan-v7";
import {
  GLAZE_COLOURS_V7,
  candyMarkerPlacesV7,
  drawCandyGlazeCellV7,
  drawCandyHopArcV7,
  drawCandyStuckToffeeV7,
  drawCandyUnitMarkersV7,
} from "../../src/render/canvas/candy-canvas-v7";
import {
  CANDY_EFFECT_DURATIONS_V7,
  candyReducedMotionProgressV7,
  drawCandyFeedbackV7,
} from "../../src/render/canvas/candy-effects-v7";
import { projectGrid, worldToScreen } from "../../src/render/canvas/geometry";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { statusGlossaryV7 } from "../../src/render/unit-glossary-v7";
import {
  CANDY_REDESIGN_V7,
  candyRedesignFixtureV7,
} from "../fixtures/v7-candy-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Bead pulp_wars-jdb.14 (docs/product/RULESET_7_CANDY_REDESIGN.md section
// 14): the Candy redesign's markers, overlays, previews, pickers, cues and
// texts, each read from a small hand-built board (no match is played). Every
// expected number comes from a public preview or the engine constants.
const AT = CANDY_REDESIGN_V7;
type LogEntry = readonly unknown[];
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "CANDY").label;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const camera = { offsetX: 100, offsetY: 100, zoom: 1 };

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
            : key === "createLinearGradient" || key === "createRadialGradient"
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

const calls = (log: readonly LogEntry[], name: string): LogEntry[] =>
  log.filter((call) => call[0] === name);
const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find((candidate) => same(candidate.at, at));
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

function draw(
  plan: BoardRenderPlanV7,
  options: Partial<Parameters<typeof drawBoardV7>[0]> = {},
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1600, height: 1600 },
    devicePixelRatio: 1,
    camera,
    plan,
    images: {
      resolve: (id) =>
        ({ id, width: 128, height: 128 }) as unknown as CanvasImageSource,
      resolveTerrainGround: (id) =>
        ({ id: `ground:${id}`, width: 128, height: 128 }) as never,
      resolveRaisedTerrain: (id) =>
        ({ id: `raised:${id}`, width: 256, height: 256 }) as never,
    },
    ...options,
  });
  return log;
}

/** Plays a command for the human seat; returns its plan and its notice. */
function play(state: GameStateV7, command: CommandV7) {
  const before = viewOf(state);
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  const envelope = projectEventsV7(
    state,
    result.state,
    state.humanPlayerId,
    result.events,
  );
  const after = viewOf(result.state);
  return {
    state: result.state,
    steps: corePresentationPlanV7(before, envelope, after),
    text: candyBoundaryNoticeV7(envelope.events, before, after)?.text ?? null,
  };
}

const attack = (view: PlayerViewV7, from: CoordV7, to: CoordV7): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitAt(view, from).id,
  targetUnitId: unitAt(view, to).id,
});

describe("Stuck and Toothache on units (section 14)", () => {
  const view = viewOf(candyRedesignFixtureV7());

  it("chips a Stuck and a Toothache unit of any owner with the spec's sentences", () => {
    expect(STUCK_STATUS_V7).toBe("Stuck: one step");
    expect(TOOTHACHE_STATUS_V7).toBe("Toothache: next attack −1");
    expect(
      candyChipsV7(view, unitAt(view, AT.stuckEnemy)).map((chip) => [
        chip.id,
        chip.status,
        chip.icon,
      ]),
    ).toEqual([["stuck", STUCK_STATUS_V7, "ICON:STATUS:STUCK"]]);
    expect(
      candyChipsV7(view, unitAt(view, AT.toothacheEnemy)).map((chip) => [
        chip.id,
        chip.status,
        chip.icon,
      ]),
    ).toEqual([["toothache", TOOTHACHE_STATUS_V7, "ICON:STATUS:TOOTHACHE"]]);
    // The glossary explains both chips.
    expect(statusGlossaryV7("stuck")?.name).toBe("Stuck");
    expect(statusGlossaryV7("toothache")?.name).toBe("Toothache");
  });

  it("says when the status wears off, from its public count", () => {
    // An own unit Stuck on its own turn (two End Turns left): the next.
    const own = candyUnitInfoLinesV7(view, unitAt(view, AT.topUpTarget));
    expect(own.find((line) => line.id === "stuck")?.description).toBe(
      "It can move only one tile until the end of its next turn.",
    );
    expect(
      candyUnitInfoLinesV7(view, unitAt(view, AT.toothacheEnemy)).find(
        (line) => line.id === "toothache",
      )?.description,
    ).toBe(
      "Its next attack is 1 weaker; unused, it wears off at the end of its next turn.",
    );
  });

  it("marks them in the board plan and draws the toffee and the tooth", () => {
    const plan = planFor(view, null);
    const marker = (at: CoordV7) =>
      plan.entries.find((entry) => entry.kind === "UNIT" && same(entry.at, at))
        ?.candy;
    expect(marker(AT.stuckEnemy)).toEqual(
      expect.objectContaining({ stuck: true, toothache: false }),
    );
    expect(marker(AT.toothacheEnemy)).toEqual(
      expect.objectContaining({ stuck: false, toothache: true }),
    );
    expect(candyUnitMarkersV7(view, unitAt(view, AT.trooper))).toBeUndefined();
    // The tooth hangs beside the head, opposite the Rushed chip; the
    // toffee sits on the feet.
    const anchor = { x: 200, top: 100, bottom: 200 };
    const places = candyMarkerPlacesV7(anchor, 1);
    expect(places.toothache.x).toBeLessThan(anchor.x);
    expect(places.rushed.x).toBeGreaterThan(anchor.x);
    expect(places.stuck.y).toBeGreaterThan(anchor.top + 80);
    const { context, log } = recordingContext();
    drawCandyUnitMarkersV7(
      context,
      {
        rushed: false,
        crashed: false,
        splatted: false,
        home: false,
        stuck: true,
        toothache: true,
      },
      anchor,
      1,
    );
    expect(calls(log, "ellipse").length).toBeGreaterThan(0);
    expect(calls(log, "drawImage")).toHaveLength(0);
    const contrast = recordingContext();
    drawCandyStuckToffeeV7(contrast.context, 10, 10, 1, true);
    expect(
      contrast.log.some((call) => call[0] === "set" && call[2] === "#e0a040"),
    ).toBe(false);
  });
});

describe("The Glaze overlay (section 7.2)", () => {
  const view = viewOf(candyRedesignFixtureV7());

  it("marks each Glazed tile of the active seat's turn, and says so", () => {
    const plan = planFor(view, null);
    const glazed = plan.entries
      .filter((entry) => entry.kind === "TERRAIN" && entry.glazed === true)
      .map((entry) => entry.at);
    expect(glazed).toEqual(view.glazedThisTurn);
    expect(glazed).toEqual(AT.glazed);
    expect(glazeTileLinesV7(view, AT.glazed[0])).toEqual([GLAZED_OWN_TILE_V7]);
    expect(glazeTileLinesV7(view, AT.racer)).toEqual([]);
    expect(GLAZED_OWN_TILE_V7).not.toMatch(/\d+, ?\d+/);
  });

  it("names whose Glaze it is on another seat's turn", () => {
    const other = viewForV7(
      candyRedesignFixtureV7(),
      view.players.find((player) => player.id !== view.viewer.id)?.id ??
        view.viewer.id,
    );
    expect(glazedTileTextV7(other)).toBe(
      "Glazed: Player 1's units step onto it at half cost this turn",
    );
  });

  it("draws a flat, translucent smear on each Glazed cell, with no outline", () => {
    const plan = planFor(view, null);
    const fills = (log: readonly LogEntry[]) =>
      log.filter(
        (call) =>
          call[0] === "set" &&
          call[1] === "fillStyle" &&
          call[2] === GLAZE_COLOURS_V7.smear,
      ).length;
    // One smear per Glazed cell, after the Roads and before the pieces.
    expect(fills(draw(plan))).toBe(AT.glazed.length);
    const { context, log } = recordingContext();
    drawCandyGlazeCellV7(
      context,
      { x: 0, y: 0, width: 128, height: 128 },
      { x: 1, y: 1 },
      { zoom: 1 },
    );
    // Translucent, no dark outline (nothing stroked in a dark colour), and
    // its ends meet both sides of the cell at one height.
    expect(GLAZE_COLOURS_V7.smearAlpha).toBeLessThan(0.9);
    const strokes = log
      .filter((call) => call[0] === "set" && call[1] === "strokeStyle")
      .map((call) => call[2]);
    expect(strokes).not.toContain("#24121a");
    expect(strokes).not.toContain("#4a2412");
    expect(calls(log, "stroke").length).toBe(4);
    const moved = calls(log, "moveTo")[0];
    const joined = calls(log, "lineTo").find((call) => call[1] === 128);
    expect(moved?.[2]).toBeCloseTo(128 * 0.68 - 128 * 0.095);
    expect(joined?.[2]).toBeCloseTo(128 * 0.68 - 128 * 0.095);
    // Code only; high contrast keeps it in black and white.
    const contrast = recordingContext();
    drawCandyGlazeCellV7(
      contrast.context,
      { x: 0, y: 0, width: 128, height: 128 },
      { x: 1, y: 1 },
      { zoom: 1, highContrast: true },
    );
    const colours = contrast.log
      .filter((call) => call[0] === "set" && String(call[1]).endsWith("Style"))
      .map((call) => call[2]);
    expect(new Set(colours)).toEqual(new Set(["#ffffff"]));
    expect(calls(contrast.log, "drawImage")).toHaveLength(0);
  });

  it("plans no Glaze in a match without a Candy seat", () => {
    const plain = viewOf(martianUiFixtureV7());
    expect(
      planFor(plain, null).entries.some((entry) => entry.glazed === true),
    ).toBe(false);
  });
});

describe("The hop in a Move preview (section 7.7)", () => {
  const view = viewOf(candyRedesignFixtureV7());

  it("marks a Bunny's hopping Move with its take-off, jumped and landing tiles", () => {
    const plan = planFor(view, AT.hopBunny);
    const landing = plan.targets.find(
      (target) => target.family === "MOVE" && same(target.at, AT.hopLanding),
    );
    expect(landing?.hop).toEqual({
      from: AT.hopBunny,
      over: AT.hopOver,
      to: AT.hopLanding,
    });
    expect(landing?.semanticLabel).toContain(HOP_MOVE_TEXT_V7);
    // A one-tile walk has no hop.
    const walk = plan.targets.find(
      (target) => target.family === "MOVE" && same(target.at, { x: 1, y: 4 }),
    );
    expect(walk?.hop).toBeUndefined();
    const bunny = unitAt(view, AT.hopBunny);
    expect(
      moveHopV7(view, { kind: "MOVE", unitId: bunny.id, path: [AT.hopOver] }),
    ).toBeNull();
  });

  it("draws the arc only for the focused hop, peaking over the jumped tile", () => {
    const plan = planFor(view, AT.hopBunny);
    const focused = draw(plan, { previewFocus: AT.hopLanding });
    const unfocused = draw(plan, { previewFocus: { x: 1, y: 4 } });
    // The paw print's three toe pads (radius 5) show only for the focus.
    const pawPads = (log: readonly LogEntry[]) =>
      calls(log, "arc").filter((call) => call[3] === 5).length;
    expect(pawPads(focused) - pawPads(unfocused)).toBe(3);
    const { context, log } = recordingContext();
    drawCandyHopArcV7(
      context,
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      1,
    );
    const highest = Math.min(
      ...calls(log, "lineTo").map((call) => call[2] as number),
    );
    expect(highest).toBeLessThan(100 - 40);
    // The hop's animation rises over the jumped tile.
    expect(HOP_LIFT_TILES_V7).toBeGreaterThan(0.3);
  });
});

describe("Preview lines of the new combat fields (section 14)", () => {
  const state = candyRedesignFixtureV7();
  const view = viewOf(state);
  const lines = (from: CoordV7, to: CoordV7) => {
    const preview = queryCombatPreviewV7(
      view,
      unitAt(view, from).id,
      unitAt(view, to).id,
    );
    if (preview === null) throw new Error("no preview");
    return { preview, lines: candyCombatLinesV7(preview) };
  };

  it("says a Toffee Trooper's target is Stuck", () => {
    expect(lines(AT.trooper, AT.stuckEnemy).lines.notes).toContain(
      STUCK_TARGET_PREVIEW_V7,
    );
  });

  it("names the ricochet and marks the unit it bounces to", () => {
    const { preview, lines: result } = lines(AT.gunner, AT.gunnerTarget);
    const ricochet = preview.ricochet;
    if (ricochet === null) throw new Error("no ricochet");
    expect(result.notes).toContain(ricochetPreviewV7(ricochet.damage));
    expect(result.hits).toEqual([
      {
        unitId: unitAt(view, AT.ricochetVictim).id,
        kind: "RICOCHET",
        label: `−${ricochet.damage}`,
        lethal: false,
      },
    ]);
    const target = planFor(view, AT.gunner).targets.find(
      (entry) => entry.family === "ATTACK" && same(entry.at, AT.gunnerTarget),
    );
    expect(target?.giantHits).toEqual([
      { at: AT.ricochetVictim, label: `−${ricochet.damage}`, lethal: false },
    ]);
    expect(target?.previewNote).toContain(ricochetPreviewV7(ricochet.damage));
  });

  it("names the Thump and marks every enemy it hits", () => {
    const { preview, lines: result } = lines(AT.thumpBunny, AT.thumpTarget);
    expect(preview.thump.length).toBe(2);
    expect(result.notes).toContain(thumpPreviewV7(preview.thump));
    expect(thumpPreviewV7(preview.thump)).toBe("Thump −2 to 2");
    const target = planFor(view, AT.thumpBunny).targets.find(
      (entry) => entry.family === "ATTACK" && same(entry.at, AT.thumpTarget),
    );
    expect(target?.giantHits?.map((hit) => hit.at)).toEqual(
      expect.arrayContaining([...AT.thumpNeighbours]),
    );
  });

  it("reads the Toothache given and used, the struck-back Stuck and an uncertain Thump", () => {
    const base = {
      sugarRushApplied: false,
      splatApplied: false,
      noRetaliationReason: null,
      bounce: "NONE",
      bounceTo: null,
    } as const;
    expect(
      candyCombatLinesV7({
        ...base,
        stuckApplied: "ATTACKER",
        toothacheApplied: true,
        toothacheAttack: true,
        ricochet: null,
        thump: [],
        thumpUncertain: true,
      }).notes,
    ).toEqual([
      TOOTHACHE_ATTACK_PREVIEW_V7,
      STUCK_ATTACKER_PREVIEW_V7,
      TOOTHACHE_GIVEN_PREVIEW_V7,
      THUMP_UNCERTAIN_PREVIEW_V7,
    ]);
    expect(candyCombatLinesV7({ ...base, stuckApplied: "BOTH" }).notes).toEqual(
      [STUCK_TARGET_PREVIEW_V7, STUCK_ATTACKER_PREVIEW_V7],
    );
  });
});

describe("Top-Up and the Re-bake why-not (section 14)", () => {
  const view = viewOf(candyRedesignFixtureV7());

  it("aims a Top-Up at each unit with what it gets", () => {
    const confectioner = unitAt(view, AT.confectioner);
    const preview = previewTopUpV7(view, confectioner.id);
    if (preview === null) throw new Error("no Top-Up");
    const plan = planFor(view, AT.confectioner, {
      candyPick: { kind: "TOP_UP", unitId: confectioner.id },
    });
    expect(
      plan.targets.map((target) => [
        target.family,
        target.at,
        target.previewLabel,
        target.semanticLabel,
      ]),
    ).toEqual([
      [
        "TOP_UP",
        AT.topUpTarget,
        "+2 · Crash ends · Cures",
        topUpTargetNameV7(label("FIGHTER"), preview.targets[0] ?? never()),
      ],
    ]);
    expect(
      topUpBoardLabelV7({ amount: 0, crashEnded: false, cured: true }),
    ).toBe("Cures");
  });

  it("says why a Confectioner has no Top-Up or no Re-bake", () => {
    const idle = unitAt(view, AT.idleConfectioner);
    expect(topUpUnavailableTextV7(view, idle, false)).toBe(TOP_UP_NO_TARGET_V7);
    expect(rebakeUnavailableTextV7(view, idle, false, () => "Home")).toBe(
      "No Crumbs within two tiles",
    );
    expect(
      topUpUnavailableTextV7(view, unitAt(view, AT.confectioner), true),
    ).toBeNull();
  });
});

describe("Cues and log lines of the redesign (section 14)", () => {
  const state = candyRedesignFixtureV7();
  const view = viewOf(state);

  it("bounces the gumball on to the ricochet's victim, which then shakes", () => {
    const run = play(state, attack(view, AT.gunner, AT.gunnerTarget));
    const shot = run.steps.find((step) => step.kind === "RANGED");
    expect(shot).toEqual(
      expect.objectContaining({
        attackEffect: "GUMBALL_SHOT",
        ricochet: AT.ricochetVictim,
      }),
    );
    expect(run.steps).toContainEqual(
      expect.objectContaining({ kind: "DAMAGE", at: AT.ricochetVictim }),
    );
    expect(run.text).toContain(
      `${label("MARKSMAN")} ricocheted onto Fighter (−`,
    );
    // The cue: the gumball flies on after the hit and pops again.
    const plan = (progress: number) =>
      attackEffectPlanV7(
        {
          effect: "GUMBALL_SHOT",
          from: AT.gunner,
          to: AT.gunnerTarget,
          ricochet: AT.ricochetVictim,
          progress,
        },
        camera,
      );
    const middle = (RICOCHET_LEAVES_V7 + RICOCHET_LANDS_V7) / 2;
    expect(plan(middle).shots.some((entry) => entry.ricochet === true)).toBe(
      true,
    );
    expect(plan(0.95).impacts.some((entry) => entry.ricochet === true)).toBe(
      true,
    );
    expect(
      attackReducedMotionProgressV7("GUMBALL_SHOT", { ricochet: true }),
    ).toBe(middle);
    // Its sound: the hit, a boing, and the second pop.
    const sounds = soundCuesForStepV7({
      step: shot as CorePresentationStepV7,
      before: view,
      after: viewOf(run.state),
      envelope: { events: [] } as never,
      durationScale: 1,
    }).map((cue) => cue.id);
    expect(sounds).toContain("special.boing");
  });

  it("rings a Thump round the Bunny with a −2 over each hit enemy", () => {
    const run = play(state, attack(view, AT.thumpBunny, AT.thumpTarget));
    const thump = run.steps.find(
      (step) => step.kind === "CANDY" && step.effect === "THUMP",
    );
    expect(thump).toEqual(
      expect.objectContaining({
        from: AT.thumpBunny,
        amounts: [2, 2],
        durationMs: THUMP_DURATION_MS_V7,
      }),
    );
    if (thump?.kind !== "CANDY") throw new Error("no Thump cue");
    expect(thump.cells).toEqual(
      expect.arrayContaining([...AT.thumpNeighbours]),
    );
    expect(
      run.steps.filter((step) => step.kind === "DAMAGE").length,
    ).toBeGreaterThanOrEqual(2);
    expect(run.text).toContain(`${label("KNIGHT")} thumped 2 units`);
    expect(CANDY_EFFECT_DURATIONS_V7.THUMP).toBe(THUMP_DURATION_MS_V7);
    expect(candyReducedMotionProgressV7("THUMP")).toBe(
      thumpReducedMotionProgressV7(),
    );
    // The held frame shows the ring and both numbers.
    const held = thumpEffectPlanV7(
      {
        at: AT.thumpBunny,
        hits: AT.thumpNeighbours.map((at) => ({ at, damage: 2 })),
        progress: thumpReducedMotionProgressV7(),
      },
      camera,
    );
    expect(held.ring).not.toBeNull();
    expect(held.hits.map((hit) => hit.text)).toEqual(["−2", "−2"]);
    expect(
      thumpEffectPlanV7(
        { at: AT.thumpBunny, hits: [], progress: THUMP_HIT_V7 - 0.05 },
        camera,
      ).hits,
    ).toEqual([]);
    const centre = worldToScreen(projectGrid(AT.thumpBunny), camera);
    expect(Math.abs(held.centre.x - centre.x)).toBeLessThan(1);
    // Drawn in code, balanced, with its numbers.
    const { context, log } = recordingContext();
    drawCandyFeedbackV7(context, camera, {
      effect: "THUMP",
      from: AT.thumpBunny,
      cells: [...AT.thumpNeighbours],
      amounts: [2, 2],
      progress: 0.6,
    });
    expect(calls(log, "fillText").map((call) => call[1])).toEqual(["−2", "−2"]);
    expect(calls(log, "drawImage")).toHaveLength(0);
    expect(calls(log, "save").length).toBe(calls(log, "restore").length);
    const direct = recordingContext();
    drawThumpFeedbackV7(direct.context, camera, {
      at: AT.thumpBunny,
      hits: [],
      progress: 0.2,
    });
    expect(calls(direct.log, "arcTo").length).toBe(4);
  });

  it("logs Stuck and Toothache, and sugars a Top-Up", () => {
    const stuck = play(state, attack(view, AT.trooper, AT.stuckEnemy));
    expect(stuck.text).toContain("Fighter is stuck in toffee");
    const confectioner = unitAt(view, AT.confectioner);
    const topped = play(state, {
      kind: "TOP_UP",
      unitId: confectioner.id,
      targetUnitId: unitAt(view, AT.topUpTarget).id,
    });
    expect(topped.text).toBe(
      `Your ${label("CAPTAIN")} topped up a ${label("FIGHTER")}`,
    );
    expect(topped.steps).toContainEqual({
      kind: "CANDY",
      effect: "TOP_UP",
      cells: [AT.topUpTarget],
      from: AT.confectioner,
      amount: 2,
      durationMs: CANDY_EFFECT_DURATIONS_V7.TOP_UP,
    });
    // A Re-bake from a pile two tiles away flies the crumbs from it.
    const baked = play(state, {
      kind: "REBAKE",
      unitId: confectioner.id,
      from: AT.crumbsFar,
      at: { x: 7, y: 5 },
    });
    expect(baked.steps).toContainEqual(
      expect.objectContaining({
        kind: "CANDY",
        effect: "REBAKE",
        cells: [{ x: 7, y: 5 }],
        source: AT.crumbsFar,
      }),
    );
    const trail = recordingContext();
    drawCandyFeedbackV7(trail.context, camera, {
      effect: "REBAKE",
      cells: [{ x: 7, y: 5 }],
      from: AT.confectioner,
      source: AT.crumbsFar,
      progress: 0.25,
    });
    expect(calls(trail.log, "arc").length).toBeGreaterThanOrEqual(4);
  });

  it("logs a Toothache given by a Jawbreaker", () => {
    const events = [
      {
        kind: "TOOTHACHE_GIVEN" as const,
        playerId: view.viewer.id,
        sourceUnitId: unitAt(view, AT.trooper).id,
        unitId: unitAt(view, AT.toothacheEnemy).id,
        endsLeft: 1 as const,
      },
    ];
    expect(candyBoundaryNoticeV7(events, view, view)?.text).toBe(
      "Guard has a toothache",
    );
  });
});

function never(): never {
  throw new Error("missing");
}
