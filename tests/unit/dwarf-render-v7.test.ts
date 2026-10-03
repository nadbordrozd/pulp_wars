import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewAssembleV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  DWARF_ERUPTION_TIMELINE_V7,
  DWARF_FLAG_ANCHORS_V7,
} from "../../src/assets/chibi-direction-dwarf-presentation";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  MOUND_CODE_ART_ID_V7,
  type DwarfPickV7,
} from "../../src/render/canvas/dwarf-board-plan-v7";
import {
  drawDigInEarthworkV7,
  drawEruptionRingV7,
  type DwarfBoardArtV7,
} from "../../src/render/canvas/dwarf-canvas-v7";
import {
  DWARF_EFFECT_DURATIONS_V7,
  DWARF_EFFECT_SUBJECTS_V7,
  ERUPTION_RING_ORDER_V7,
  drawDwarfFeedbackV7,
  dwarfReducedMotionProgressV7,
  eruptionCueV7,
} from "../../src/render/canvas/dwarf-effects-v7";
import { flyerPresentationV7 } from "../../src/render/canvas/martian-canvas-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../src/render/canvas/visual-direction-v7";
import {
  DWARF_UI_V7,
  dwarfEruptionBeforeFixtureV7,
  dwarfUiFixtureV7,
} from "../fixtures/v7-dwarf-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

const AT = DWARF_UI_V7;
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
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

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

/** The earthwork rasters as named tokens. */
function fakeDwarfArt(): DwarfBoardArtV7 {
  return {
    earthwork: (width) => ({
      back: { earthwork: "back", width } as unknown as CanvasImageSource,
      front: { earthwork: "front", width } as unknown as CanvasImageSource,
      width,
      height: 27,
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
    dwarfArt: fakeDwarfArt(),
    ...options,
  });
  return log;
}

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

describe("Dwarf art on the board (DWARF.md wiring steps 3-5)", () => {
  it("anchors the pennant on each hold's own iron pole, and lifts the Gyrocopter", () => {
    for (const [id, anchor] of Object.entries(DWARF_FLAG_ANCHORS_V7))
      expect(DIRECTION_FLAG_ANCHORS_V7[id]).toEqual(anchor);
    expect(flyerPresentationV7("chibi-direction-dwarf-gyrocopter")).toEqual(
      expect.objectContaining({ hullBottom: 69, groundLine: 82 }),
    );
  });
});

describe("mounds (section 5.3 and 16.1)", () => {
  const view = humanView(dwarfUiFixtureV7());

  it("plans a mound where its unit would stand, with its HP, and never as a unit", () => {
    const plan = planFor(view, null);
    const mounds = plan.entries.filter(
      (entry) => entry.dwarfMound !== undefined,
    );
    expect(
      mounds.map((entry) => [
        entry.key.split(":")[0],
        entry.kind,
        entry.artSubject,
        entry.assetId,
        entry.at,
        entry.ready,
      ]),
    ).toEqual([
      [
        "mound",
        "UNIT",
        "UNIT:DWARF:MOUND",
        MOUND_CODE_ART_ID_V7,
        AT.mound,
        false,
      ],
      [
        "mound",
        "UNIT",
        "UNIT:DWARF:MOUND_RIDER",
        MOUND_CODE_ART_ID_V7,
        AT.moundRider,
        false,
      ],
    ]);
    const mole = view.burrowed.find((entry) => entry.moleUnitId === null);
    expect(mounds[0]).toMatchObject({
      hp: mole?.unit.hp,
      maxHp: mole?.unit.maxHp,
      dwarfMound: { rider: false, ring: false },
    });
    expect(mounds[1]?.dwarfMound).toMatchObject({
      rider: true,
      eruptionDamage: 0,
    });
    // Nothing targets a mound: no Move ends there, no attack finds it.
    const all = queryPlayerCommandsV7(view);
    expect(
      all.some(
        (command) =>
          command.kind === "MOVE" &&
          same(command.path.at(-1) ?? { x: -1, y: -1 }, AT.mound),
      ),
    ).toBe(false);
  });

  it("outlines a selected Mole mound's eruption ring", () => {
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: { kind: "TILE", at: AT.mound },
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const mound = plan.entries.find(
      (entry) => entry.dwarfMound !== undefined && same(entry.at, AT.mound),
    );
    expect(mound?.dwarfMound?.ring).toBe(true);
    const { context, log } = recordingContext();
    drawEruptionRingV7(context, { x: 0, y: 0 }, 128);
    expect(log.some((call) => call[0] === "setLineDash")).toBe(true);
    expect(log.filter((call) => call[0] === "stroke")).toHaveLength(2);
  });

  it("draws the code mound with its surfacing chip in LEGACY, never a badge", () => {
    const plan = planFor(view, null);
    const log = draw({
      ...plan,
      entries: plan.entries.filter(
        (entry) => entry.dwarfMound !== undefined || entry.kind === "TERRAIN",
      ),
    });
    // The heap is an ellipse; the chip is an arc with the arrow.
    expect(log.filter((call) => call[0] === "ellipse").length).toBeGreaterThan(
      1,
    );
    expect(log.filter((call) => call[0] === "arc").length).toBeGreaterThan(1);
  });
});

describe("Dwarf markers (section 16.1)", () => {
  const view = humanView(dwarfUiFixtureV7());
  const plan = planFor(view, null);
  const markers = (at: CoordV7) =>
    plan.entries.find(
      (entry) =>
        entry.kind === "UNIT" &&
        entry.key.startsWith("unit:") &&
        same(entry.at, at),
    )?.dwarf;

  it("marks dug-in units, clockwork and the flying Gyrocopter", () => {
    expect(markers(AT.dugInHammerer)).toEqual({
      dugIn: true,
      clockwork: false,
      flyer: false,
    });
    expect(markers(AT.dugInMole)?.dugIn).toBe(true);
    expect(markers(AT.movedHammerer)).toBeUndefined();
    expect(markers(AT.gunner)).toEqual({
      dugIn: false,
      clockwork: true,
      flyer: false,
    });
    expect(markers(AT.titan)?.clockwork).toBe(true);
    expect(markers(AT.gyrocopter)?.flyer).toBe(true);
  });

  it("puts the earthwork's bank before the sprite and its sandbags after it", () => {
    const entry = plan.entries.find(
      (candidate) =>
        candidate.kind === "UNIT" && same(candidate.at, AT.dugInHammerer),
    );
    if (entry === undefined) throw new Error("hammerer");
    const log = draw({ ...plan, entries: [entry] });
    const back = drawIndexes(log, (image) => image.earthwork === "back");
    const front = drawIndexes(log, (image) => image.earthwork === "front");
    const sprite = drawIndexes(log, (image) => image.id === entry.assetId);
    expect(back).toHaveLength(1);
    expect(front).toHaveLength(1);
    expect(back[0]).toBeLessThan(sprite[0] ?? -1);
    expect(front[0]).toBeGreaterThan(sprite[0] ?? Infinity);
    // Without the cached art a code stand-in is drawn.
    const { context, log: plain } = recordingContext();
    drawDigInEarthworkV7(
      context,
      undefined,
      { x: 0, y: 0, width: 56, height: 80 },
      1,
      "front",
    );
    expect(plain.some((call) => call[0] === "stroke")).toBe(true);
  });
});

describe("Dwarf targets and previews on the board (section 16.1)", () => {
  const state = dwarfUiFixtureV7();
  const view = humanView(state);
  const id = (at: CoordV7) => unitAt(view, at).id;
  const aim = (selected: CoordV7, pick: DwarfPickV7) =>
    planFor(view, selected, { dwarfPick: pick });

  it("aims a Tunnel: the destinations (labelled only where they erupt), then the rider prompt", () => {
    const destinations = aim(AT.mole, {
      kind: "TUNNEL",
      unitId: id(AT.mole),
      to: null,
      riderUnitId: null,
    });
    expect(
      destinations.targets.every(
        (target) =>
          target.family === "TUNNEL" || target.family === "TUNNEL_DESTINATION",
      ),
    ).toBe(true);
    const chosen = destinations.targets.find((target) =>
      same(target.at, AT.tunnelTo),
    );
    expect(chosen?.family).toBe("TUNNEL_DESTINATION");
    expect(chosen?.previewLabel).toBe("Erupt −6");
    expect(chosen?.eruption?.targets.map((target) => target.at)).toEqual([
      AT.tunnelCatapult,
      AT.tunnelCaptain,
    ]);
    expect(chosen?.eruption?.undermines).toEqual([AT.tunnelCaptain]);
    expect(
      destinations.targets.some(
        (target) =>
          target.eruption?.targets.length === 0 &&
          target.previewLabel !== undefined,
      ),
    ).toBe(false);
    const riders = aim(AT.mole, {
      kind: "TUNNEL",
      unitId: id(AT.mole),
      to: AT.tunnelTo,
      riderUnitId: null,
    });
    expect(riders.targets.length).toBeGreaterThan(0);
    for (const target of riders.targets) {
      expect(target.family).toBe("TUNNEL_RIDER");
      expect(
        Math.max(
          Math.abs(target.at.x - AT.tunnelTo.x),
          Math.abs(target.at.y - AT.tunnelTo.y),
        ),
      ).toBe(1);
    }
    // The chosen destination and its forecast stay drawn.
    expect(
      riders.entries
        .filter((entry) => entry.abilityStyle === "ERUPTION")
        .some((entry) => entry.kind === "ABILITY_TARGET"),
    ).toBe(true);
  });

  it("aims a Bomb Run: the targets, then the landings with their threat", () => {
    const targets = aim(AT.gyrocopter, {
      kind: "BOMB_RUN",
      unitId: id(AT.gyrocopter),
      targetUnitId: null,
    });
    expect(targets.targets.map((target) => target.family)).toContain(
      "BOMB_TARGET",
    );
    expect(
      targets.targets.find((target) => same(target.at, AT.bombTarget))
        ?.previewLabel,
    ).toMatch(/^Bomb −\d+/);
    const landings = aim(AT.gyrocopter, {
      kind: "BOMB_RUN",
      unitId: id(AT.gyrocopter),
      targetUnitId: id(AT.bombTarget),
    });
    expect(landings.targets.length).toBeGreaterThan(0);
    for (const landing of landings.targets) {
      expect(landing.family).toBe("BOMB_RUN");
      expect(landing.previewLabel).toMatch(/^Land · (up to \d+|safe)$/);
    }
    expect(
      landings.entries.find((entry) => entry.abilityStyle === "BOMB")?.at,
    ).toEqual(AT.bombTarget);
  });

  it("aims an Assemble at the free tiles, without the Repair targets", () => {
    const plan = aim(AT.engineer, {
      kind: "ASSEMBLE",
      unitId: id(AT.engineer),
    });
    expect(plan.targets.map((target) => target.at)).toEqual(
      previewAssembleV7(view, id(AT.engineer))?.tiles,
    );
    expect(plan.entries.some((entry) => entry.abilityStyle === "TEND")).toBe(
      false,
    );
    // Selected, not aiming: the Repair targets show +4 and +2.
    const repair = planFor(view, AT.engineer).entries.filter(
      (entry) => entry.abilityStyle === "TEND",
    );
    expect(repair.map((entry) => entry.label).sort()).toEqual([
      "+2 HP",
      "+4 HP",
    ]);
  });

  it("puts Knockback on the focused target and the Gunner's lines on its focus note", () => {
    const cannon = planFor(view, AT.cannon);
    expect(
      cannon.targets.find((target) => same(target.at, AT.knockTarget))
        ?.knockback,
    ).toEqual({ to: AT.knockTo, blocked: false });
    const blocked = cannon.targets.find((target) =>
      same(target.at, AT.blockedTarget),
    );
    expect(blocked?.knockback).toEqual({ to: { x: 2, y: 8 }, blocked: true });
    expect(blocked?.previewNote).toBe(
      "Ignores fortification · Knockback blocked",
    );
    const gunner = planFor(view, AT.gunner);
    for (const target of gunner.targets.filter(
      (candidate) => candidate.family === "ATTACK",
    )) {
      expect(target.previewNote).toBeUndefined();
      expect(target.previewFocusNote).toBe(
        "Clockwork: full strength · Then 1 more shot · Cannot move after firing",
      );
    }
  });

  it("plans nothing Dwarf in a match without a Dwarf seat", () => {
    const other = humanView(martianUiFixtureV7());
    const plan = planFor(other, null);
    expect(
      plan.entries.some(
        (entry) => entry.dwarf !== undefined || entry.dwarfMound !== undefined,
      ),
    ).toBe(false);
  });
});

describe("Dwarf cues (section 16.1, DWARF.md effects)", () => {
  const boundary = (
    state: GameStateV7,
    actor: number,
    find: (command: CommandV7) => boolean,
  ) => {
    const viewer = state.humanPlayerId;
    const command =
      actor === viewer
        ? queryPlayerCommandsV7(viewForV7(state, viewer)).find(find)
        : ({ kind: "END_TURN" } as CommandV7);
    if (command === undefined) throw new Error("command not offered");
    const result = applyCommandV7(state, actor as never, command);
    if (!result.accepted) throw new Error(result.error.code);
    return corePresentationPlanV7(
      viewForV7(state, viewer),
      projectEventsV7(state, result.state, viewer, result.events),
      viewForV7(result.state, viewer),
    );
  };
  const state = dwarfUiFixtureV7();
  const view = humanView(state);
  const id = (at: CoordV7) => unitAt(view, at).id;
  const human = state.humanPlayerId as unknown as number;

  it("dives the Mole and its rider into the tunnel", () => {
    const steps = boundary(
      state,
      human,
      (command) =>
        command.kind === "TUNNEL" &&
        same(command.to, AT.tunnelTo) &&
        command.rider !== null,
    );
    expect(steps).toEqual([
      expect.objectContaining({
        kind: "DWARF",
        effect: "TUNNEL",
        durationMs: DWARF_EFFECT_DURATIONS_V7.TUNNEL,
      }),
    ]);
    expect(steps[0]?.kind === "DWARF" && steps[0].cells.slice(0, 2)).toEqual([
      AT.mole,
      AT.tunnelTo,
    ]);
  });

  it("flies the Gyrocopter beyond its target, then drops the bomb", () => {
    const steps = boundary(
      state,
      human,
      (command) =>
        command.kind === "BOMB_RUN" &&
        command.targetUnitId === id(AT.bombTarget),
    );
    expect(steps.map((step) => step.kind)).toEqual(["MOVE", "DWARF", "DAMAGE"]);
    expect(steps[0]).toMatchObject({ unitId: id(AT.gyrocopter) });
    expect(steps[1]).toMatchObject({ effect: "BOMB", cells: [AT.bombTarget] });
  });

  it("winds up an assembled Gunner, sparks a Repair and slides a Knockback", () => {
    expect(
      boundary(state, human, (command) => command.kind === "ASSEMBLE").find(
        (step) => step.kind === "DWARF",
      ),
    ).toMatchObject({ effect: "ASSEMBLE", from: AT.engineer });
    const repair = boundary(
      state,
      human,
      (command) => command.kind === "TEND_WOUNDED",
    );
    expect(repair.map((step) => step.kind)).toEqual(["SUPPORT", "DWARF"]);
    expect(repair[1]).toMatchObject({ effect: "REPAIR" });
    const knock = boundary(
      state,
      human,
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === id(AT.cannon) &&
        command.targetUnitId === id(AT.knockTarget),
    );
    const slide = knock.find((step) => step.kind === "MOVE");
    expect(slide).toMatchObject({
      unitId: id(AT.knockTarget),
      path: [AT.knockTarget, AT.knockTo],
      pushSlide: true,
    });
    expect(knock.at(-1)).toMatchObject({
      kind: "DWARF",
      effect: "KNOCKBACK",
      cells: [AT.knockTo],
    });
  });

  it("erupts at the Dwarf Start Turn, then shows each victim's damage", () => {
    const before = dwarfEruptionBeforeFixtureV7();
    const active = before.turnOrder[before.activeSeatIndex];
    const steps = boundary(before, active as unknown as number, () => true);
    expect(steps[0]).toMatchObject({
      kind: "DWARF",
      effect: "ERUPTION",
      cells: [AT.mound],
      followCamera: true,
    });
    expect(steps.slice(1).map((step) => step.kind)).toEqual([
      "DAMAGE",
      "DAMAGE",
    ]);
  });

  it("follows the eruption timeline and draws every cue without art", () => {
    const t = DWARF_ERUPTION_TIMELINE_V7;
    expect(eruptionCueV7(0)).toMatchObject({ surfaced: false, burst: null });
    expect(eruptionCueV7(t.surface).surfaced).toBe(true);
    expect(eruptionCueV7(t.ring.from).ring[0]).toBe(0);
    expect(eruptionCueV7(t.ring.from).ring[1]).toBeNull();
    expect(ERUPTION_RING_ORDER_V7[0]).toEqual([0, -1]);
    expect(dwarfReducedMotionProgressV7("ERUPTION")).toBe(t.peak / t.end);
    expect(DWARF_EFFECT_SUBJECTS_V7).toHaveLength(4);
    for (const effect of [
      "TUNNEL",
      "ERUPTION",
      "BOMB",
      "ASSEMBLE",
      "REPAIR",
      "KNOCKBACK",
    ] as const) {
      const { context, log } = recordingContext();
      drawDwarfFeedbackV7(
        context,
        { offsetX: 0, offsetY: 0, zoom: 1 },
        {
          effect,
          from: AT.engineer,
          cells: [AT.mole, AT.tunnelTo],
          progress: effect === "ERUPTION" ? 0.36 : 0.5,
        },
      );
      expect(
        log.some((call) => call[0] === "fill" || call[0] === "stroke"),
        effect,
      ).toBe(true);
    }
  });
});
