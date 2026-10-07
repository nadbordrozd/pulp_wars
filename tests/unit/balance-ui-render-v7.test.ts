import { describe, expect, it } from "vitest";
import {
  BEAM_DOWN_PICKUP_RANGE_V7,
  HEAVY_TRACTOR_PULL_V7,
  HEAVY_TRACTOR_RANGE_V7,
  TRACTOR_BEAM_RANGE_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBeamDownV7,
  previewTractorBeamV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  GLIDE_TARGET_STROKE_V7,
  buildBoardRenderPlanV7,
  drawBoardV7,
  pullPathCellsV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  glideStepsV7,
  moveIsGlideV7,
} from "../../src/render/canvas/ice-folk-board-plan-v7";
import {
  TRACTOR_BEAM_DURATION_MS_V7,
  TRACTOR_BEAM_EXTRA_STEP_MS_V7,
  TRACTOR_PULL_STEP_MS_V7,
  corePresentationPlanV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { statModifierTextV7 } from "../../src/render/dom/app-view-v7";
import {
  buildGalleryDemoSceneV7,
  galleryDemoCuesV7,
} from "../../src/render/gallery-demo-v7";
import {
  galleryUnitCellV7,
  galleryUnitDetailsV7,
} from "../../src/render/gallery-presentation-v7";
import {
  GLIDE_MOVE_LABEL_V7,
  ICE_FOLK_HELP_RULES_V7,
  snowChipTooltipV7,
} from "../../src/render/ice-folk-presentation-v7";
import {
  BEAMED_CHIP_V7,
  BEAMED_HINT_V7,
  BEAMING_BADGE_V7,
  BEAM_BADGE_V7,
  BEAM_DESTROYS_FIELD_DEFENSE_V7,
  MARTIAN_ACTED_V7,
  MARTIAN_FROZEN_MOVED_V7,
  MARTIAN_HELP_RULES_V7,
  TRACTOR_BEAM_NO_TARGET_V7,
  TRACTOR_USED_CHIP_V7,
  TRACTOR_USED_V7,
  beamDownPickupTilesV7,
  beamDownTileLabelV7,
  beamDownUnavailableTextV7,
  martianAbilityDescriptionV7,
  martianTurnChipsV7,
  tractorBeamTooltipV7,
  tractorBeamUnavailableTextV7,
} from "../../src/render/martian-presentation-v7";
import { roleAbilityDescriptionV7 } from "../../src/render/role-presentation-v7";
import {
  ICE_FOLK_GLIDE_V7,
  MARTIAN_FROZEN_V7,
  iceFolkGlideFixtureV7,
  martianFrozenFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import {
  MARTIAN_MOBILITY_V7,
  martianMobilityFixtureV7,
} from "../fixtures/v7-martian-ui";

// The balance round's UI (bead `pulp_wars-1wy.5`, ruleset `7r37`): every
// number below is an engine constant or a public preview of the same view.
const AT = MARTIAN_MOBILITY_V7;
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
  selected: CoordV7,
  extra: Partial<BoardRenderInteractionV7> = {},
): BoardRenderPlanV7 {
  const unit = unitAt(view, selected);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: { kind: "UNIT", unitId: unit.id },
    selectedUnitId: unit.id,
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
    camera: { offsetX: 100, offsetY: 100, zoom: 1 },
    plan,
    images: { resolve: () => null },
    ...options,
  });
  return log;
}

const sets = (log: readonly LogEntry[], property: string): unknown[] =>
  log
    .filter((call) => call[0] === "set" && call[1] === property)
    .map((call) => call[2]);

function accept(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** No player-facing text places anything by "x, y". */
const COORDINATE = /\(?\b\d{1,2}\s*,\s*\d{1,2}\b\)?/;

describe("Beam Down aiming (passenger first)", () => {
  it("badges every unit the carrier may beam and tints its pick-up range", () => {
    const view = humanView(martianMobilityFixtureV7());
    const carrier = unitAt(view, AT.carrier);
    const plan = planFor(view, AT.carrier, {
      martianPick: {
        kind: "BEAM_DOWN",
        unitId: carrier.id,
        passengerUnitId: null,
      },
    });
    // The pick-up two tiles away and the Grunt in the far capital.
    expect(plan.targets.map((target) => target.at)).toEqual(
      expect.arrayContaining([AT.pickUp, AT.cityGrunt]),
    );
    for (const target of plan.targets) {
      expect(target.family).toBe("BEAM_DOWN_PASSENGER");
      expect(target.previewLabel).toBe(BEAM_BADGE_V7);
      expect(target.semanticLabel).toContain(BEAMED_HINT_V7);
      expect(target.semanticLabel).not.toMatch(COORDINATE);
    }
    const labelAt = (at: CoordV7): string =>
      plan.targets.find(
        (target) => target.at.x === at.x && target.at.y === at.y,
      )?.semanticLabel ?? "";
    expect(labelAt(AT.pickUp)).toContain("picked up nearby");
    expect(labelAt(AT.cityGrunt)).toContain("from your city");
    // The range tint: the explored square round the carrier, itself
    // excluded, with a dashed edge only on its outside.
    const range = plan.entries.filter(
      (entry) =>
        entry.kind === "ABILITY_AREA" && entry.abilityStyle === "BEAM_RANGE",
    );
    expect(range.map((entry) => entry.at)).toEqual(
      beamDownPickupTilesV7(view, carrier.at),
    );
    expect(range.length).toBeGreaterThan(0);
    for (const entry of range) {
      const distance = chebyshev(entry.at, carrier.at);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThanOrEqual(BEAM_DOWN_PICKUP_RANGE_V7);
      if (distance < BEAM_DOWN_PICKUP_RANGE_V7)
        expect(entry.targetEdges).toEqual([]);
    }
    expect(range.some((entry) => (entry.targetEdges?.length ?? 0) > 0)).toBe(
      true,
    );
    // A passenger wears its badge alone: no dashed tile outline is drawn
    // for it, and the tint is.
    const log = draw(plan);
    expect(sets(log, "fillStyle")).toContain("rgba(255, 143, 214, 0.1)");
    expect(
      log.some((call) => call[0] === "fillText" && call[1] === BEAM_BADGE_V7),
    ).toBe(true);
  });

  it("then offers the tiles round the carrier and marks the chosen passenger", () => {
    const view = humanView(martianMobilityFixtureV7());
    const carrier = unitAt(view, AT.carrier);
    const passenger = unitAt(view, AT.pickUp);
    const plan = planFor(view, AT.carrier, {
      martianPick: {
        kind: "BEAM_DOWN",
        unitId: carrier.id,
        passengerUnitId: passenger.id,
      },
    });
    expect(plan.targets.map((target) => target.at)).toEqual(
      previewBeamDownV7(view, carrier.id, passenger.id)?.destinations,
    );
    expect(
      plan.targets.every((target) => chebyshev(target.at, carrier.at) === 1),
    ).toBe(true);
    expect(
      plan.entries.find(
        (entry) =>
          entry.key === `ability-target:BEAM_PASSENGER:${passenger.id}`,
      ),
    ).toMatchObject({ at: AT.pickUp, label: BEAMING_BADGE_V7 });
    // The range tint belongs to the passenger stage only.
    expect(
      plan.entries.some((entry) => entry.abilityStyle === "BEAM_RANGE"),
    ).toBe(false);
    // Minimal text: a plain tile is its outline alone; only a tile whose
    // Field Defense the landing destroys carries a label.
    const preview = previewBeamDownV7(view, carrier.id, passenger.id);
    if (preview === null) throw new Error("no preview");
    for (const target of plan.targets) {
      expect(target.previewLabel).toBeUndefined();
      expect(target.semanticLabel).toBe(
        `Beam the ${effectiveRoleRuleV7("FIGHTER", "MARTIAN").label} here. ${BEAMED_HINT_V7}`,
      );
      expect(beamDownTileLabelV7(preview, target.at)).toBeNull();
    }
    const [first] = preview.destinations;
    if (first === undefined) throw new Error("no destination");
    expect(
      beamDownTileLabelV7(
        { ...preview, fieldDefenseDestroyed: [first] },
        first,
      ),
    ).toBe(BEAM_DESTROYS_FIELD_DEFENSE_V7);
  });

  it("marks a beamed unit and lets it attack but not move", () => {
    const state = martianMobilityFixtureV7();
    const view = humanView(state);
    const carrier = unitAt(view, AT.carrier);
    const passenger = unitAt(view, AT.cityGrunt);
    const to = { x: AT.lightPullTo.x, y: AT.lightPullTo.y };
    const after = humanView(
      accept(state, {
        kind: "BEAM_DOWN",
        unitId: carrier.id,
        passengerUnitId: passenger.id,
        to,
      }),
    );
    expect(martianTurnChipsV7(after, passenger.id)).toEqual([
      expect.objectContaining({ id: "beamed", label: BEAMED_CHIP_V7 }),
    ]);
    expect(martianTurnChipsV7(after, carrier.id)).toEqual([]);
    const offered = queryPlayerCommandsV7(after).filter(
      (command) => "unitId" in command && command.unitId === passenger.id,
    );
    expect(offered.some((command) => command.kind === "ATTACK")).toBe(true);
    expect(offered.some((command) => command.kind === "MOVE")).toBe(false);
    // The carrier used its action: its buttons name that, not a missing
    // passenger or target.
    expect(beamDownUnavailableTextV7(after, carrier.id, false)).toBe(
      MARTIAN_ACTED_V7,
    );
    expect(tractorBeamUnavailableTextV7(after, carrier.id, false)).toBe(
      MARTIAN_ACTED_V7,
    );
  });
});

describe("Tractor Beam aiming", () => {
  it("carries the one-tile path of a Saucer's pull and the two-tile path of a Mothership's", () => {
    const view = humanView(martianMobilityFixtureV7());
    const saucer = unitAt(view, AT.carrier);
    const light = planFor(view, AT.carrier, {
      martianPick: { kind: "TRACTOR_BEAM", unitId: saucer.id },
    }).targets.find(
      (target) =>
        target.at.x === AT.lightTarget.x && target.at.y === AT.lightTarget.y,
    );
    expect(light?.pullPath).toEqual([AT.lightPullTo]);
    expect(light?.pullTo).toEqual(AT.lightPullTo);
    expect(light?.semanticLabel).toContain("one tile closer");
    const mothership = unitAt(view, AT.mothership);
    const plan = planFor(view, AT.mothership, {
      martianPick: { kind: "TRACTOR_BEAM", unitId: mothership.id },
    });
    const heavy = plan.targets.find(
      (target) =>
        target.at.x === AT.heavyTarget.x && target.at.y === AT.heavyTarget.y,
    );
    const preview = previewTractorBeamV7(
      view,
      mothership.id,
      unitAt(view, AT.heavyTarget).id,
    );
    expect(preview?.path).toEqual(AT.heavyPath);
    expect(heavy?.pullPath).toEqual(preview?.path);
    expect(heavy?.pullTo).toEqual(AT.heavyPath[1]);
    expect(heavy?.semanticLabel).toContain("two tiles closer");
    expect(heavy?.semanticLabel).not.toMatch(COORDINATE);
    if (heavy === undefined) throw new Error("no heavy target");
    expect(pullPathCellsV7(heavy)).toEqual(AT.heavyPath);
    expect(pullPathCellsV7({ pullTo: AT.lightPullTo })).toEqual([
      AT.lightPullTo,
    ]);
    expect(pullPathCellsV7({})).toEqual([]);
    // The focused target draws the tile it crosses (lighter) and the tile
    // it ends on.
    const fills = sets(
      draw(plan, { previewFocus: AT.heavyTarget }),
      "fillStyle",
    );
    expect(fills).toContain("rgba(255, 143, 214, 0.14)");
    expect(fills).toContain("rgba(255, 143, 214, 0.26)");
    // A one-tile pull crosses nothing.
    const single = sets(
      draw(
        planFor(view, AT.carrier, {
          martianPick: { kind: "TRACTOR_BEAM", unitId: saucer.id },
        }),
        { previewFocus: AT.lightTarget },
      ),
      "fillStyle",
    );
    expect(single).toContain("rgba(255, 143, 214, 0.26)");
    expect(single).not.toContain("rgba(255, 143, 214, 0.14)");
  });

  it("slides a heavy pull through both tiles and a light pull through one", () => {
    const state = martianMobilityFixtureV7();
    const before = humanView(state);
    const run = (command: CommandV7) => {
      const result = applyCommandV7(state, state.humanPlayerId, command);
      if (!result.accepted) throw new Error(result.error.code);
      return corePresentationPlanV7(
        before,
        projectEventsV7(
          state,
          result.state,
          state.humanPlayerId,
          result.events,
        ),
        humanView(result.state),
      );
    };
    const heavy = run({
      kind: "TRACTOR_BEAM",
      unitId: unitAt(before, AT.mothership).id,
      targetUnitId: unitAt(before, AT.heavyTarget).id,
    });
    expect(heavy[0]).toMatchObject({
      kind: "MARTIAN",
      effect: "TRACTOR_BEAM",
      from: AT.mothership,
      cells: [AT.heavyTarget],
      durationMs: TRACTOR_BEAM_DURATION_MS_V7 + TRACTOR_BEAM_EXTRA_STEP_MS_V7,
    });
    expect(heavy[1]).toMatchObject({
      kind: "MOVE",
      path: [AT.heavyTarget, ...AT.heavyPath],
      durationMs: 2 * TRACTOR_PULL_STEP_MS_V7,
    });
    const light = run({
      kind: "TRACTOR_BEAM",
      unitId: unitAt(before, AT.carrier).id,
      targetUnitId: unitAt(before, AT.lightTarget).id,
    });
    expect(light[0]).toMatchObject({
      effect: "TRACTOR_BEAM",
      durationMs: TRACTOR_BEAM_DURATION_MS_V7,
    });
    expect(light[1]).toMatchObject({
      kind: "MOVE",
      path: [AT.lightTarget, AT.lightPullTo],
      durationMs: TRACTOR_PULL_STEP_MS_V7,
    });
  });

  it("writes each unit's own Tractor Beam text", () => {
    const light = tractorBeamTooltipV7(false);
    const heavy = tractorBeamTooltipV7(true);
    expect(light).toContain(`${TRACTOR_BEAM_RANGE_V7} tiles away one tile`);
    expect(light).not.toContain("Free");
    expect(heavy).toContain(
      `${TRACTOR_BEAM_RANGE_V7} or ${HEAVY_TRACTOR_RANGE_V7} tiles away up to ${HEAVY_TRACTOR_PULL_V7} tiles closer`,
    );
    expect(heavy).toContain("Free once a turn");
    expect(
      martianAbilityDescriptionV7("TRACTOR_BEAM", "MARTIAN", "RAIDER"),
    ).toBe(light);
    expect(
      martianAbilityDescriptionV7("TRACTOR_BEAM", "MARTIAN", "KNIGHT"),
    ).toBe(heavy);
    expect(
      roleAbilityDescriptionV7("TRACTOR_BEAM", 1, 1, "MARTIAN", null, "KNIGHT"),
    ).toBe(heavy);
    // Help keeps the design's sentences (its section 11): both pullers in
    // one, and what a beamed unit may still do.
    const help = new Map(MARTIAN_HELP_RULES_V7);
    const saucer = effectiveRoleRuleV7("RAIDER", "MARTIAN").label;
    const mothership = effectiveRoleRuleV7("KNIGHT", "MARTIAN").label;
    expect(help.get("Tractor Beam")).toBe(
      `a ${saucer} pulls a unit two tiles away one tile closer; a ${mothership} pulls a unit two or three tiles away up to two tiles closer, once a turn, and can still act.`,
    );
    expect(help.get("Beam Down")).toBe(
      `a ${saucer} or ${mothership} brings one of your units, from on or next to any of your city centers or from up to ${BEAM_DOWN_PICKUP_RANGE_V7} tiles away, next to itself; the unit can still attack but not move.`,
    );
    expect(new Map(ICE_FOLK_HELP_RULES_V7).get("Snow")).toContain(
      "Ice Folk units move at half cost from Snow to Snow and have light cover on it unless they are fortified",
    );
  });

  it("names why a puller cannot pull: used, acted, Frozen, nothing in reach", () => {
    const state = martianMobilityFixtureV7();
    const view = humanView(state);
    const mothership = unitAt(view, AT.mothership);
    const pulled = humanView(
      accept(state, {
        kind: "TRACTOR_BEAM",
        unitId: mothership.id,
        targetUnitId: unitAt(view, AT.heavyTarget).id,
      }),
    );
    // The Mothership's pull is free: it may still attack, and its beam is
    // spent for the turn.
    expect(martianTurnChipsV7(pulled, mothership.id)).toEqual([
      expect.objectContaining({
        id: "tractor-used",
        label: TRACTOR_USED_CHIP_V7,
      }),
    ]);
    expect(tractorBeamUnavailableTextV7(pulled, mothership.id, false)).toBe(
      TRACTOR_USED_V7,
    );
    expect(
      queryPlayerCommandsV7(pulled).some(
        (command) =>
          command.kind === "ATTACK" && command.unitId === mothership.id,
      ),
    ).toBe(true);
    expect(tractorBeamUnavailableTextV7(view, mothership.id, true)).toBeNull();
    // A Saucer that pulled used its action.
    const saucer = unitAt(view, AT.carrier);
    const acted = humanView(
      accept(state, {
        kind: "TRACTOR_BEAM",
        unitId: saucer.id,
        targetUnitId: unitAt(view, AT.lightTarget).id,
      }),
    );
    expect(tractorBeamUnavailableTextV7(acted, saucer.id, false)).toBe(
      MARTIAN_ACTED_V7,
    );
    expect(martianTurnChipsV7(acted, saucer.id)).toEqual([]);
    // A Frozen carrier that moved may neither beam nor pull.
    const frozen = humanView(martianFrozenFixtureV7());
    for (const at of [MARTIAN_FROZEN_V7.saucer, MARTIAN_FROZEN_V7.mothership]) {
      const unit = unitAt(frozen, at);
      expect(
        queryPlayerCommandsV7(frozen).some(
          (command) =>
            (command.kind === "BEAM_DOWN" || command.kind === "TRACTOR_BEAM") &&
            command.unitId === unit.id,
        ),
      ).toBe(false);
      expect(beamDownUnavailableTextV7(frozen, unit.id, false)).toBe(
        MARTIAN_FROZEN_MOVED_V7,
      );
      expect(tractorBeamUnavailableTextV7(frozen, unit.id, false)).toBe(
        MARTIAN_FROZEN_MOVED_V7,
      );
    }
    // A ready Saucer with nothing two tiles away.
    const lone = humanView(
      accept(state, {
        kind: "MOVE",
        unitId: saucer.id,
        path: [{ x: AT.carrier.x, y: AT.carrier.y - 1 }],
      }),
    );
    if (
      !queryPlayerCommandsV7(lone).some(
        (command) =>
          command.kind === "TRACTOR_BEAM" && command.unitId === saucer.id,
      )
    )
      expect(tractorBeamUnavailableTextV7(lone, saucer.id, false)).toBe(
        TRACTOR_BEAM_NO_TARGET_V7,
      );
  });
});

describe("Glide in the movement range (Snow to Snow)", () => {
  it("marks exactly the tiles reached by half-cost steps inside the Snow", () => {
    const view = humanView(iceFolkGlideFixtureV7());
    const snowAt = (at: CoordV7): boolean =>
      view.board.tiles.some(
        (tile) =>
          tile.explored &&
          tile.at.x === at.x &&
          tile.at.y === at.y &&
          tile.snow === true,
      );
    const move = effectiveRoleRuleV7("FIGHTER", "ICE_FOLK").move;
    const targetsOf = (at: CoordV7) =>
      planFor(view, at).targets.filter((target) => target.family === "MOVE");
    // Inside the Snow: the tiles beyond its Move are all Snow, all marked,
    // and each was reached by Snow-to-Snow steps only.
    const inside = targetsOf(ICE_FOLK_GLIDE_V7.inside);
    const far = inside.filter(
      (target) => chebyshev(target.at, ICE_FOLK_GLIDE_V7.inside) > move,
    );
    expect(far.length).toBeGreaterThan(0);
    for (const target of inside) {
      const beyond = chebyshev(target.at, ICE_FOLK_GLIDE_V7.inside) > move;
      expect(target.glide === true).toBe(beyond);
      if (!beyond) continue;
      expect(snowAt(target.at)).toBe(true);
      expect(target.semanticLabel).toBe(GLIDE_MOVE_LABEL_V7);
      if (target.command.kind !== "MOVE") throw new Error("kind");
      expect(glideStepsV7(view, target.command)).toBe(
        target.command.path.length,
      );
      expect(moveIsGlideV7(view, target.command)).toBe(true);
    }
    // On the Snow's edge: a step off the Snow is a full step, so no tile
    // off the Snow lies beyond its Move.
    expect(snowAt(ICE_FOLK_GLIDE_V7.edge)).toBe(true);
    const edge = targetsOf(ICE_FOLK_GLIDE_V7.edge);
    expect(edge.some((target) => !snowAt(target.at))).toBe(true);
    for (const target of edge)
      if (!snowAt(target.at)) {
        expect(chebyshev(target.at, ICE_FOLK_GLIDE_V7.edge)).toBe(move);
        expect(target.glide).toBeUndefined();
      }
    // On open ground nothing glides.
    expect(snowAt(ICE_FOLK_GLIDE_V7.outside)).toBe(false);
    const outside = targetsOf(ICE_FOLK_GLIDE_V7.outside);
    expect(outside.length).toBeGreaterThan(0);
    for (const target of outside) {
      expect(chebyshev(target.at, ICE_FOLK_GLIDE_V7.outside)).toBe(move);
      expect(target.glide).toBeUndefined();
    }
    // A Glide tile is outlined in the faction's pale ice: one outline per
    // marked tile more than the same board draws without a selection that
    // glides (other Ice Folk cues share the colour).
    const iceStrokes = (at: CoordV7): number =>
      sets(draw(planFor(view, at)), "strokeStyle").filter(
        (stroke) => stroke === GLIDE_TARGET_STROKE_V7,
      ).length;
    expect(
      iceStrokes(ICE_FOLK_GLIDE_V7.inside) -
        iceStrokes(ICE_FOLK_GLIDE_V7.outside),
    ).toBe(far.length);
  });

  it("marks no Glide for a Martian match", () => {
    const view = humanView(martianMobilityFixtureV7());
    expect(
      planFor(view, AT.carrier).targets.some((target) => target.glide === true),
    ).toBe(false);
  });
});

describe("Snow cover in the Defense row", () => {
  it("reads as a share, never as the product's fraction", () => {
    const view = humanView(iceFolkGlideFixtureV7());
    const yeti = unitAt(view, ICE_FOLK_GLIDE_V7.inside);
    const defense = view.unitStats
      .find((entry) => entry.unitId === yeti.id)
      ?.stats.find((stat) => stat.id === "DEFENSE");
    const snow = defense?.modifiers.find(
      (modifier) => modifier.source === "SNOW",
    );
    if (defense === undefined || snow === undefined)
      throw new Error("no Snow cover on the Yeti");
    // The exact value is a Yeti's 1.5 x 0.25: never shown.
    expect(snow.value.numerator / snow.value.denominator).toBe(0.375);
    expect(statModifierTextV7(defense.base.value, snow)).toBe("+25%");
    expect(statModifierTextV7(defense.base.value, snow)).not.toMatch(/\.\d{2}/);
    // Every other term keeps its value.
    expect(
      statModifierTextV7(
        { numerator: 3, denominator: 2 },
        { source: "FOREST", value: { numerator: 3, denominator: 4 } },
      ),
    ).toBe("+0.75");
    expect(
      statModifierTextV7(
        { numerator: 2, denominator: 1 },
        { source: "INSPIRED", value: { numerator: 1, denominator: 1 } },
      ),
    ).toBe("+1");
    expect(snowChipTooltipV7(true)).toContain("from Snow to Snow");
    expect(snowChipTooltipV7(false)).not.toContain("half");
  });
});

describe("Gallery: the balance round's cues and details", () => {
  it("plays a Mothership's heavy pull through two tiles", () => {
    expect(galleryDemoCuesV7("MARTIAN", "KNIGHT")).toEqual(
      expect.arrayContaining(["TRACTOR_BEAM", "BEAM_DOWN"]),
    );
    const scene = buildGalleryDemoSceneV7("MARTIAN", "KNIGHT", "TRACTOR_BEAM");
    const pulled = scene?.events.events.find(
      (event) => event.kind === "UNIT_PULLED",
    );
    if (pulled?.kind !== "UNIT_PULLED") throw new Error("no pull");
    expect(pulled.path).toHaveLength(HEAVY_TRACTOR_PULL_V7);
    expect(scene?.steps).toHaveLength(1);
    // A Saucer's pull is one tile.
    const light = buildGalleryDemoSceneV7(
      "MARTIAN",
      "RAIDER",
      "TRACTOR_BEAM",
    )?.events.events.find((event) => event.kind === "UNIT_PULLED");
    if (light?.kind !== "UNIT_PULLED") throw new Error("no pull");
    expect(light.path).toHaveLength(1);
  });

  it("plays a Saucer's Beam Down and the beamed Grunt's shot", () => {
    const scene = buildGalleryDemoSceneV7("MARTIAN", "RAIDER", "BEAM_DOWN");
    if (scene === null) throw new Error("no scene");
    expect(scene.steps.map((step) => step.command.kind)).toEqual([
      "BEAM_DOWN",
      "ATTACK",
    ]);
    const [beam, shot] = scene.steps;
    if (beam?.command.kind !== "BEAM_DOWN" || shot?.command.kind !== "ATTACK")
      throw new Error("steps");
    expect(beam.events.events.map((event) => event.kind)).toContain(
      "UNIT_BEAMED",
    );
    // The unit that shoots is the unit that was beamed, and before the
    // beam it could not reach the target.
    const passengerId = beam.command.passengerUnitId;
    expect(shot.command.unitId).toBe(passengerId);
    expect(
      scene.offeredCommands.some(
        (command) =>
          command.kind === "ATTACK" && command.unitId === passengerId,
      ),
    ).toBe(false);
    expect(shot.before).toBe(beam.after);
    expect(scene.after).toBe(shot.after);
    expect(scene.before).toBe(beam.before);
    expect(shot.events.events.length).toBeGreaterThan(0);
  });

  it("describes each puller's own Tractor Beam and the Ice Folk Glide", () => {
    const abilityOf = (role: "RAIDER" | "KNIGHT"): string | undefined => {
      const cell = galleryUnitCellV7(role, "MARTIAN");
      if (cell?.kind !== "UNIT") throw new Error("no cell");
      return galleryUnitDetailsV7(cell).abilities.find(
        (ability) => ability.id === "TRACTOR_BEAM",
      )?.description;
    };
    expect(abilityOf("RAIDER")).toBe(tractorBeamTooltipV7(false));
    expect(abilityOf("KNIGHT")).toBe(tractorBeamTooltipV7(true));
    const yeti = galleryUnitCellV7("FIGHTER", "ICE_FOLK");
    if (yeti?.kind !== "UNIT") throw new Error("no cell");
    expect(galleryUnitDetailsV7(yeti).notes).toContain(
      "Moves at half cost from Snow to Snow.",
    );
  });
});
