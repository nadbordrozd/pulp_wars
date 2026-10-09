import { describe, expect, it } from "vitest";
import {
  BARRICADE_HP_V7,
  BOMB_LANDING_RANGE_V7,
  applyCommandV7,
  previewAssembleV7,
  previewBuildBarricadeV7,
  previewWhirlV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  BARRICADE_CAP_REACHED_V7,
  BARRICADE_NO_COINS_V7,
  RIDE_BADGE_V7,
  RIDING_BADGE_V7,
  WHIRL_NO_TARGET_V7,
  dwarfAbilityUnavailableTextV7,
  dwarfBoundaryNoticeV7,
  dwarfCommandLabelV7,
  whirlSummaryV7,
  whirlTargetLinesV7,
} from "../../src/render/dwarf-presentation-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  DWARF_DIG_IN_WALL_SHARE_V7,
  DWARF_ERUPTION_TIMELINE_V7,
  DWARF_FLAG_ANCHORS_V7,
} from "../../src/assets/chibi-direction-dwarf-presentation";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { unitShadowAnchorV7 } from "../../src/render/canvas/unit-shadows-v7";
import {
  TUNNEL_GHOST_ALPHA_V7,
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  MOUND_CODE_ART_ID_V7,
  TUNNEL_TETHER_LINK_V7,
  type DwarfPickV7,
} from "../../src/render/canvas/dwarf-board-plan-v7";
import {
  BARRICADE_HP_BAR_V7,
  drawBarricadeV7,
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
import {
  DIRECTED_READY_RING_COLOUR_V7,
  DIRECTION_FLAG_ANCHORS_V7,
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  DWARF_BARRICADE_VICTIM_V7,
  DWARF_CROWD_CONTROL_V7,
  DWARF_DIG_IN_V7,
  DWARF_UI_V7,
  dwarfBarricadeVictimFixtureV7,
  dwarfCrowdControlFixtureV7,
  dwarfDigInFixtureV7,
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
      { centreX: 28, centreY: 70, radiusX: 22, radiusY: 7.5 },
      1,
      "front",
    );
    expect(plain.some((call) => call[0] === "stroke")).toBe(true);
  });

  it("stands the sandbag wall on the unit's shadow anchor, inside the ready ring (bead pulp_wars-78i.9)", () => {
    const art: ChibiBoardArtV7 = {
      resolve: (request) => {
        const resolved = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
          request.subject,
        )[0];
        return resolved === undefined
          ? { kind: "MISSING" }
          : {
              kind: "READY",
              asset: resolved,
              image: { id: resolved.id } as unknown as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: resolved.id,
            };
      },
    };
    const digIn = humanView(dwarfDigInFixtureV7());
    const dugIn = buildBoardRenderPlanV7(digIn, queryPlayerCommandsV7(digIn), {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    for (const [at, ready] of [
      [DWARF_DIG_IN_V7.readyHammerer, true],
      [DWARF_DIG_IN_V7.spentHammerer, false],
      [DWARF_DIG_IN_V7.readyMole, true],
      [DWARF_DIG_IN_V7.spentMole, false],
    ] as const) {
      const entry = dugIn.entries.find(
        (candidate) =>
          candidate.kind === "UNIT" &&
          candidate.key.startsWith("unit:") &&
          same(candidate.at, at),
      );
      if (entry === undefined) throw new Error(`${at.x},${at.y}`);
      expect(entry.dwarf?.dugIn).toBe(true);
      expect(entry.ready === true).toBe(ready);
      const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
        entry.artSubject ?? "UNIT:DWARF:FIGHTER",
      )[0];
      if (asset === undefined) throw new Error("no live asset");
      const anchor = unitShadowAnchorV7(entry.artSubject, asset.id);
      if (anchor?.shadow == null || anchor.ring === null)
        throw new Error("no anchor");
      const { context, log } = recordingContext();
      const camera = { zoom: chibiCameraZoom(1), offsetX: 0, offsetY: 0 };
      drawBoardV7({
        context,
        viewport: { width: 1600, height: 1600 },
        devicePixelRatio: 1,
        camera,
        plan: { ...dugIn, entries: [entry], targets: [] },
        images: { resolve: () => null },
        artSet: "CHIBI",
        chibiArt: art,
        reducedMotion: true,
        dwarfArt: fakeDwarfArt(),
        direction: {
          spec: LIVE_DIRECTION_V7,
          art: createDirectedChibiArtV7({
            base: art,
            direction: LIVE_DIRECTION_V7,
            environment: {
              readPixels: (_image, width, height) =>
                new Uint8ClampedArray(width * height * 4).fill(200),
              createSurface: (pixels, width, height) =>
                ({ pixels, width, height }) as unknown as CanvasImageSource,
            },
          }),
        },
      });
      const sprite = log.find(
        (call) =>
          call[0] === "drawImage" &&
          (call[1] as { id?: string }).id === asset.id,
      );
      const front = log.find(
        (call) =>
          call[0] === "drawImage" &&
          (call[1] as { earthwork?: string }).earthwork === "front",
      );
      if (sprite === undefined || front === undefined)
        throw new Error("not drawn");
      const [, , spriteX, spriteY, spriteWidth] = sprite as [
        string,
        unknown,
        number,
        number,
        number,
      ];
      const [, image, left, top, width, height] = front as [
        string,
        { width: number },
        number,
        number,
        number,
        number,
      ];
      // Master px of the drawn sprite; the wall is DWARF_DIG_IN_WALL_SHARE_V7
      // of the measured shadow's width, centred on it, its foot on the
      // shadow's front edge.
      const scale = spriteWidth / asset.width;
      expect(image.width).toBe(
        Math.round(2 * anchor.shadow.radiusX * DWARF_DIG_IN_WALL_SHARE_V7),
      );
      expect(left + width / 2).toBeCloseTo(
        spriteX + anchor.shadow.x * scale,
        -0.5,
      );
      const foot = top + height;
      expect(foot).toBeCloseTo(
        spriteY + (anchor.shadow.y + anchor.shadow.radiusY) * scale,
        -0.5,
      );
      // The ready ring's front arc shows below the wall, its ends beside it.
      const ringFront = spriteY + (anchor.ring.y + anchor.ring.radiusY) * scale;
      expect(foot).toBeLessThan(ringFront);
      expect(width).toBeLessThan(2 * anchor.ring.radiusX * scale);
      const rings = log.filter(
        (call, index) =>
          call[0] === "stroke" &&
          log
            .slice(0, index)
            .some(
              (earlier) =>
                earlier[0] === "set" &&
                earlier[1] === "strokeStyle" &&
                earlier[2] === DIRECTED_READY_RING_COLOUR_V7,
            ),
      );
      expect(rings.length > 0).toBe(ready);
    }
  });
});

describe("Dwarf targets and previews on the board (section 16.1)", () => {
  const state = dwarfUiFixtureV7();
  const view = humanView(state);
  const id = (at: CoordV7) => unitAt(view, at).id;
  const aim = (selected: CoordV7, pick: DwarfPickV7) =>
    planFor(view, selected, { dwarfPick: pick });

  it("aims a Tunnel passenger first: the seated Hammerer, the destinations with their ghosts, then the chosen one with its dots", () => {
    const mole = id(AT.mole);
    const rider = id(AT.rider);
    const stage = aim(AT.mole, {
      kind: "TUNNEL",
      unitId: mole,
      to: null,
      riderUnitId: rider,
      riderTo: null,
    });
    // The Hammerer that can ride wears its badge; nothing else but the
    // destinations is a target.
    const badge = stage.targets.find((target) => same(target.at, AT.rider));
    expect(badge?.family).toBe("TUNNEL_PASSENGER");
    expect(badge?.previewLabel).toBe(RIDING_BADGE_V7);
    expect(
      stage.targets.every(
        (target) =>
          target.family === "TUNNEL_PASSENGER" ||
          target.family === "TUNNEL_DESTINATION",
      ),
    ).toBe(true);
    // The rope from the seated Hammerer to the Mole.
    expect(
      stage.entries.find(
        (entry) =>
          entry.kind === "LINK" && entry.label === TUNNEL_TETHER_LINK_V7,
      ),
    ).toMatchObject({ at: AT.rider, linkTo: AT.mole });
    const destination = stage.targets.find((target) =>
      same(target.at, AT.tunnelTo),
    );
    expect(destination?.family).toBe("TUNNEL_DESTINATION");
    expect(destination?.previewLabel).toBe("Erupt −6");
    expect(destination?.eruption?.targets.map((target) => target.at)).toEqual([
      AT.tunnelCatapult,
      AT.tunnelCaptain,
    ]);
    expect(destination?.eruption?.undermines).toEqual([AT.tunnelCaptain]);
    expect(
      stage.targets.some(
        (target) =>
          target.eruption?.targets.length === 0 &&
          target.previewLabel !== undefined,
      ),
    ).toBe(false);
    // Its ghosts: the Mole there, the Hammerer on the default landing, and
    // the command that would be dug.
    const landing = destination?.tunnel?.landing ?? null;
    expect(destination?.tunnel).toMatchObject({
      moleUnitId: mole,
      riderUnitId: rider,
      staysBehind: false,
      chosen: false,
    });
    expect(landing).not.toBeNull();
    expect(destination?.command).toEqual({
      kind: "TUNNEL",
      unitId: mole,
      to: AT.tunnelTo,
      rider: { unitId: rider, to: landing },
    });
    // Chosen: the other landings are dots (each the command with the rider
    // there), and no destination sits under the Hammerer's tiles.
    const chosen = aim(AT.mole, {
      kind: "TUNNEL",
      unitId: mole,
      to: AT.tunnelTo,
      riderUnitId: rider,
      riderTo: null,
    });
    const dots = chosen.targets.filter(
      (target) => target.family === "TUNNEL_RIDER",
    );
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      expect(
        Math.max(
          Math.abs(dot.at.x - AT.tunnelTo.x),
          Math.abs(dot.at.y - AT.tunnelTo.y),
        ),
      ).toBe(1);
      expect(same(dot.at, landing as CoordV7)).toBe(false);
      expect(dot.command).toMatchObject({ rider: { to: dot.at } });
      expect(
        chosen.targets.filter((target) => same(target.at, dot.at)),
      ).toHaveLength(1);
    }
    expect(
      chosen.targets.find((target) => target.tunnel?.chosen === true)?.at,
    ).toEqual(AT.tunnelTo);
    // A dot moves the landing; the chosen destination then digs with it.
    const moved = aim(AT.mole, {
      kind: "TUNNEL",
      unitId: mole,
      to: AT.tunnelTo,
      riderUnitId: rider,
      riderTo: dots[0]?.at ?? null,
    });
    expect(
      moved.targets.find((target) => target.tunnel?.chosen === true)?.command,
    ).toMatchObject({ rider: { unitId: rider, to: dots[0]?.at } });
    // Nobody seated: no rope, no ghost Hammerer, the Mole digs alone.
    const alone = aim(AT.mole, {
      kind: "TUNNEL",
      unitId: mole,
      to: null,
      riderUnitId: null,
      riderTo: null,
    });
    expect(
      alone.targets.find((target) => same(target.at, AT.rider))?.previewLabel,
    ).toBe(RIDE_BADGE_V7);
    expect(alone.entries.some((entry) => entry.kind === "LINK")).toBe(false);
    expect(
      alone.targets.find((target) => same(target.at, AT.tunnelTo))?.command,
    ).toEqual({ kind: "TUNNEL", unitId: mole, to: AT.tunnelTo, rider: null });
  });

  it("draws the focused destination's ghosts at the ghost strength, and the chosen one's without focus", () => {
    const art: ChibiBoardArtV7 = {
      resolve: (request) => {
        const resolved = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
          request.subject,
        )[0];
        return resolved === undefined
          ? { kind: "MISSING" }
          : {
              kind: "READY",
              asset: resolved,
              image: { id: resolved.id } as unknown as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: resolved.id,
            };
      },
    };
    const ghosts = (
      plan: BoardRenderPlanV7,
      focus: CoordV7 | null,
    ): LogEntry[] => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 1600, height: 1600 },
        devicePixelRatio: 1,
        camera: { zoom: chibiCameraZoom(1), offsetX: 0, offsetY: 0 },
        plan,
        images: { resolve: () => null },
        artSet: "CHIBI",
        chibiArt: art,
        reducedMotion: true,
        previewFocus: focus,
      });
      // The drawImage calls made at the ghost strength.
      let alpha = 1;
      return log.filter((call) => {
        if (call[0] === "set" && call[1] === "globalAlpha")
          alpha = call[2] as number;
        return (
          call[0] === "drawImage" &&
          Math.abs(alpha - TUNNEL_GHOST_ALPHA_V7) < 1e-9
        );
      });
    };
    const pick = {
      kind: "TUNNEL" as const,
      unitId: id(AT.mole),
      to: null,
      riderUnitId: id(AT.rider),
      riderTo: null,
    };
    const stage = aim(AT.mole, pick);
    expect(ghosts(stage, null)).toHaveLength(0);
    expect(ghosts(stage, AT.tunnelTo)).toHaveLength(2);
    const chosen = aim(AT.mole, { ...pick, to: AT.tunnelTo });
    expect(ghosts(chosen, null)).toHaveLength(2);
    expect(
      ghosts(aim(AT.mole, { ...pick, riderUnitId: null }), AT.tunnelTo),
    ).toHaveLength(1);
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

// Dwarf crowd control (`pulp_wars-w49.34`): the Whirl, the Barricade and
// the Bomb Run's wider landing on the board, in words and as cues, from
// hand-built states (no match is played).
describe("Dwarf crowd control on the board (pulp_wars-w49.34)", () => {
  const CC = DWARF_CROWD_CONTROL_V7;
  const state = dwarfCrowdControlFixtureV7();
  const view = humanView(state);
  const id = (at: CoordV7) => unitAt(view, at).id;
  const aim = (at: CoordV7, pick: DwarfPickV7) =>
    planFor(view, at, { dwarfPick: pick });

  it("draws every Barricade in the view with its owner and HP, never as a unit", () => {
    const plan = planFor(view, null);
    const barricades = plan.entries.filter(
      (entry) => entry.kind === "BARRICADE",
    );
    expect(barricades.map((entry) => entry.key)).toEqual([
      `barricade:${CC.wholeBarricade.x},${CC.wholeBarricade.y}`,
      `barricade:${CC.damagedBarricade.x},${CC.damagedBarricade.y}`,
    ]);
    expect(barricades[1]).toMatchObject({
      at: CC.damagedBarricade,
      hp: 6,
      maxHp: BARRICADE_HP_V7,
      barricade: { hp: 6, maxHp: BARRICADE_HP_V7, own: true },
      label: "Your Barricade, 6 of 10 HP",
    });
    expect(barricades.every((entry) => entry.ownerColor !== undefined)).toBe(
      true,
    );
    // The board draws them in code (no raster), with the segmented bar.
    const log = draw(plan);
    expect(
      log.filter(
        (call) =>
          call[0] === "fillText" && (call[1] === "6" || call[1] === "10"),
      ),
    ).toHaveLength(2);
    // A match without a Dwarf seat has no Barricade at all.
    const other = humanView(martianUiFixtureV7());
    expect(
      planFor(other, null).entries.some((entry) => entry.kind === "BARRICADE"),
    ).toBe(false);
  });

  it("draws a Barricade's HP bar in the cell's left strip, cracked at half HP", () => {
    const whole = recordingContext();
    drawBarricadeV7(whole.context, 0, 0, 1, {
      hp: 10,
      maxHp: 10,
      ownerColor: "#123456",
      highContrast: false,
    });
    const bar = BARRICADE_HP_BAR_V7;
    expect(whole.log).toContainEqual([
      "fillRect",
      bar.left,
      bar.top,
      bar.width,
      bar.height,
    ]);
    expect(whole.log).toContainEqual([
      "fillText",
      "10",
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(whole.log).toContainEqual(["set", "fillStyle", "#123456"]);
    const broken = recordingContext();
    drawBarricadeV7(broken.context, 0, 0, 1, {
      hp: 3,
      maxHp: 10,
      ownerColor: "#123456",
      highContrast: false,
    });
    // Ten segments' dividers are drawn either way; cracks add strokes.
    const strokes = (log: readonly LogEntry[]) =>
      log.filter((call) => call[0] === "stroke").length;
    expect(strokes(broken.log)).toBeGreaterThan(strokes(whole.log));
  });

  it("aims a Whirl: every visible enemy next to the Whirligig, each with its damage, and its reach", () => {
    const whirligig = id(CC.whirligig);
    const preview = previewWhirlV7(view, whirligig);
    if (preview === null) throw new Error("no Whirl preview");
    const plan = aim(CC.whirligig, { kind: "WHIRL", unitId: whirligig });
    expect(plan.targets.map((target) => target.at)).toEqual(
      preview.targets.map((target) => target.at),
    );
    // The own Hammerer next to it is never hit.
    expect(plan.targets.some((target) => same(target.at, CC.ownHammerer))).toBe(
      false,
    );
    for (const target of plan.targets) {
      expect(target.family).toBe("WHIRL");
      expect(targetHighlightStyleV7(target.family)).toBe("ATTACK");
      expect(target.command).toEqual({ kind: "WHIRL", unitId: whirligig });
      expect(target.previewLabel).toMatch(/^−\d+( · Kills)?$/);
    }
    expect(
      plan.targets.find((target) => same(target.at, CC.whirlMarksman))
        ?.previewLabel,
    ).toMatch(/· Kills$/);
    expect(
      plan.entries.filter(
        (entry) =>
          entry.kind === "ABILITY_AREA" && entry.abilityStyle === "WHIRL",
      ),
    ).toHaveLength(9);
    // The words of the dock: one line per enemy, by name.
    expect(whirlTargetLinesV7(view, preview).map((line) => line.name)).toEqual([
      "Fighter",
      "Marksman",
      "Guard",
    ]);
    expect(whirlSummaryV7(preview)).toMatch(
      /^Whirl: 3 enemies, \d+ damage, 1 kill$/,
    );
  });

  it("aims a Barricade at the Engineer's free tiles, and marks the Barricade its Repair mends", () => {
    const engineer = id(CC.engineer);
    const plan = aim(CC.engineer, {
      kind: "BUILD_BARRICADE",
      unitId: engineer,
    });
    expect(plan.targets.map((target) => target.at)).toEqual(
      previewBuildBarricadeV7(view, engineer)?.tiles,
    );
    for (const target of plan.targets) {
      expect(target.family).toBe("BARRICADE");
      expect(targetHighlightStyleV7(target.family)).toBe("PLACE");
      expect(target.command.kind).toBe("BUILD_BARRICADE");
      expect(target.semanticLabel).toBe(
        "Build barricade here: 3 Coins · 10 HP · 2/4 built",
      );
    }
    const repair = planFor(view, CC.engineer).entries.filter(
      (entry) => entry.abilityStyle === "TEND",
    );
    expect(repair).toEqual([
      expect.objectContaining({
        at: CC.damagedBarricade,
        label: "+4 HP",
        areaSupport: "QUIET",
      }),
    ]);
  });

  it("lands a Bomb Run up to 2 tiles from its target", () => {
    const gyro = id(CC.gyrocopter);
    const target = id(CC.bombTarget);
    const plan = aim(CC.gyrocopter, {
      kind: "BOMB_RUN",
      unitId: gyro,
      targetUnitId: target,
    });
    const offered = queryPlayerCommandsV7(view).flatMap((command) =>
      command.kind === "BOMB_RUN" && command.targetUnitId === target
        ? [command.to]
        : [],
    );
    expect(plan.targets.map((landing) => landing.at)).toEqual(offered);
    const reach = plan.targets.map((landing) =>
      Math.max(
        Math.abs(landing.at.x - CC.bombTarget.x),
        Math.abs(landing.at.y - CC.bombTarget.y),
      ),
    );
    expect(Math.max(...reach)).toBe(BOMB_LANDING_RANGE_V7);
    expect(reach).toContain(1);
    for (const landing of plan.targets)
      expect(landing.semanticLabel).toMatch(/^Land here\. Landing: /);
  });

  it("names the commands and why a Whirl or a Barricade is unavailable", () => {
    expect(dwarfCommandLabelV7("WHIRL", "DWARF")).toBe("Whirl");
    expect(dwarfCommandLabelV7("BUILD_BARRICADE", "DWARF")).toBe("Barricade");
    expect(dwarfCommandLabelV7("ATTACK_BARRICADE", "ORIGINAL")).toBe(
      "Attack Barricade",
    );
    const engineer = unitAt(view, CC.engineer);
    expect(
      dwarfAbilityUnavailableTextV7(
        view,
        engineer,
        "BUILD_BARRICADE",
        false,
        undefined,
        "CAP",
      ),
    ).toBe(BARRICADE_CAP_REACHED_V7);
    expect(
      dwarfAbilityUnavailableTextV7(
        view,
        engineer,
        "BUILD_BARRICADE",
        false,
        undefined,
        "INSUFFICIENT_COINS",
      ),
    ).toBe(BARRICADE_NO_COINS_V7);
    expect(
      dwarfAbilityUnavailableTextV7(
        view,
        engineer,
        "BUILD_BARRICADE",
        false,
        undefined,
        "ALREADY_ACTED",
      ),
    ).toBeNull();
    expect(
      dwarfAbilityUnavailableTextV7(
        view,
        unitAt(view, CC.whirligig),
        "WHIRL",
        false,
      ),
    ).toBe(WHIRL_NO_TARGET_V7);
  });

  it("marks an attack on a hostile Barricade with its exact damage, for melee and range", () => {
    const victim = humanView(dwarfBarricadeVictimFixtureV7());
    const V = DWARF_BARRICADE_VICTIM_V7;
    const fighter = planFor(victim, V.fighter).targets.filter(
      (target) => target.command.kind === "ATTACK_BARRICADE",
    );
    expect(fighter).toEqual([
      expect.objectContaining({
        at: V.wholeBarricade,
        family: "ATTACK",
        previewLabel: "Deal 5 · 5 left",
        semanticLabel:
          "Attack Player 2's Barricade: deals 5, nothing strikes back. 5 of 10 HP left.",
      }),
    ]);
    const catapult = planFor(victim, V.catapult).targets.filter(
      (target) => target.command.kind === "ATTACK_BARRICADE",
    );
    expect(
      catapult.find((target) => same(target.at, V.brokenBarricade))
        ?.previewLabel,
    ).toBe("Deal 3 · Breaks it");
  });

  const boundary = (
    from: GameStateV7,
    find: (command: CommandV7) => boolean,
  ) => {
    const viewer = from.humanPlayerId;
    const command = queryPlayerCommandsV7(viewForV7(from, viewer)).find(find);
    if (command === undefined) throw new Error("command not offered");
    const result = applyCommandV7(from, viewer, command);
    if (!result.accepted) throw new Error(result.error.code);
    const before = viewForV7(from, viewer);
    const after = viewForV7(result.state, viewer);
    const events = projectEventsV7(from, result.state, viewer, result.events);
    return {
      steps: corePresentationPlanV7(before, events, after),
      notice: dwarfBoundaryNoticeV7(events.events, before, after),
    };
  };

  it("whirls with hammer arcs and a hit on every target, then their damage", () => {
    const { steps, notice } = boundary(
      state,
      (command) => command.kind === "WHIRL",
    );
    expect(steps[0]).toMatchObject({
      kind: "DWARF",
      effect: "WHIRL",
      durationMs: DWARF_EFFECT_DURATIONS_V7.WHIRL,
    });
    expect(steps[0]?.kind === "DWARF" && steps[0].cells).toEqual([
      CC.whirligig,
      CC.whirlFighter,
      CC.whirlMarksman,
      CC.whirlGuard,
    ]);
    expect(
      steps.filter((step) => step.kind === "DAMAGE").map((step) => step.at),
    ).toEqual([CC.whirlFighter, CC.whirlMarksman, CC.whirlGuard]);
    expect(notice?.text).toBe("Your Whirligig whirled: 3 units hit (1 killed)");
  });

  it("builds a Barricade with earth and steam, and splinters one that is hit", () => {
    const built = boundary(
      state,
      (command) =>
        command.kind === "BUILD_BARRICADE" && same(command.to, { x: 8, y: 3 }),
    );
    expect(built.steps).toEqual([
      expect.objectContaining({
        kind: "DWARF",
        effect: "BARRICADE",
        cells: [{ x: 8, y: 3 }],
      }),
    ]);
    expect(built.notice?.text).toBe("Your Engineer built a Barricade");
    const victim = dwarfBarricadeVictimFixtureV7();
    const V = DWARF_BARRICADE_VICTIM_V7;
    const hit = boundary(
      victim,
      (command) =>
        command.kind === "ATTACK_BARRICADE" &&
        same(command.at, V.wholeBarricade),
    );
    expect(hit.steps.map((step) => step.kind)).toEqual(["MELEE", "DWARF"]);
    expect(hit.steps[0]).toMatchObject({
      from: V.fighter,
      to: V.wholeBarricade,
    });
    expect(hit.steps[1]).toMatchObject({
      effect: "SPLINTERS",
      cells: [V.wholeBarricade],
    });
    expect(hit.notice?.text).toBe(
      "Your Fighter hit Player 2's Barricade for 5",
    );
    const broken = boundary(
      victim,
      (command) =>
        command.kind === "ATTACK_BARRICADE" &&
        same(command.at, V.brokenBarricade),
    );
    expect(broken.steps[0]).toMatchObject({ kind: "CATAPULT" });
    expect(broken.notice?.text).toBe(
      "Your Catapult broke Player 2's Barricade",
    );
    const repaired = boundary(
      state,
      (command) => command.kind === "TEND_WOUNDED",
    );
    expect(repaired.steps).toContainEqual(
      expect.objectContaining({
        kind: "DWARF",
        effect: "REPAIR",
        cells: [CC.damagedBarricade],
      }),
    );
    expect(repaired.notice?.text).toBe(
      "Your Engineer mended a Barricade (+4 HP)",
    );
  });

  it("draws the Whirl, Barricade and Splinters cues without art", () => {
    for (const effect of ["WHIRL", "BARRICADE", "SPLINTERS"] as const) {
      const { context, log } = recordingContext();
      drawDwarfFeedbackV7(
        context,
        { offsetX: 0, offsetY: 0, zoom: 1 },
        {
          effect,
          cells: [CC.whirligig, CC.whirlFighter],
          progress: 0.5,
        },
      );
      expect(
        log.some((call) => call[0] === "fill" || call[0] === "stroke"),
        effect,
      ).toBe(true);
    }
  });
});
