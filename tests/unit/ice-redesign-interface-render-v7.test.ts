import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewFreezeV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { soundCuesForStepV7 } from "../../src/audio/sound-events-v7";
import {
  buildBoardRenderPlanV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import { crackIcePickTargetsV7 } from "../../src/render/canvas/frozen-sea-board-plan-v7";
import {
  ICE_BUILDING_PAD_V7,
  drawIceBuildingPadV7,
} from "../../src/render/canvas/frozen-sea-canvas-v7";
import {
  ICE_FOLK_EFFECT_DURATIONS_V7,
  drawIceFolkFeedbackV7,
} from "../../src/render/canvas/ice-folk-effects-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  TARGET_HIGHLIGHT_FAMILIES_V7,
  targetHighlightStyleV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  TILE_ACTION_COMMAND_CLASSES_V7,
  tileAbilityV7,
  tileActionPlanForSelectionV7,
  tileActionsAtV7,
} from "../../src/render/canvas/tile-actions-v7";
import {
  CRACK_ICE_ALREADY_ACTED_V7,
  CRACK_ICE_BUILT_V7,
  CRACK_ICE_OCCUPIED_V7,
  SLIP_BLACK_ICE_MOVE_LABEL_V7,
  crackIceUnavailableTextV7,
  freezeOutcomeTextV7,
  freezeOutcomeV7,
  freezeTargetLabelV7,
  frozenSeaBoundaryNoticeV7,
  unitHasCrackIceV7,
} from "../../src/render/frozen-sea-presentation-v7";
import { factionBuildingV7 } from "../../src/render/faction-buildings-v7";
import {
  ICE_REDESIGN_UI_V7,
  iceBuildUiFixtureV7,
  iceCrackUiFixtureV7,
} from "../fixtures/v7-ice-redesign-ui";
import { patchFrozenUnitV7 } from "../fixtures/v7-frozen-sea";

// The frozen sea redesign's interface (bead pulp_wars-5ti.27;
// docs/product/RULESET_7_ICE_REDESIGN.md section 4.1, docs/ui/
// BOARD_TARGETING.md section 3.5): Crack Ice's targets, labels and reasons,
// its tile badge, its notice, cue and sound; the snow pad under a building
// on ice; the Freeze preview's taken and mended tiles. Small authored
// states, no match played.

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const at = ICE_REDESIGN_UI_V7;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

function unitAt(view: PlayerViewV7, coord: CoordV7) {
  const unit = view.units.find((candidate) => same(candidate.at, coord));
  if (unit === undefined) throw new Error(`no unit at ${coord.x},${coord.y}`);
  return unit;
}

function plan(
  view: PlayerViewV7,
  unitId: number | null,
  extra: Partial<BoardRenderInteractionV7> = {},
): BoardRenderPlanV7 {
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: unitId === null ? null : { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    selectedAchievement: null,
    ...extra,
  });
}

function recorder() {
  const calls: (readonly unknown[])[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                calls.push([String(key), ...args]);
              },
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  ) as CanvasRenderingContext2D;
  return { context, calls };
}

describe("Crack Ice on the board", () => {
  it("is aimed, in the Attack style, with one badge per ice tile", () => {
    expect(TILE_ACTION_COMMAND_CLASSES_V7.CRACK_ICE).toBe("AIMED");
    expect(TARGET_HIGHLIGHT_FAMILIES_V7).toContain("CRACK_ICE");
    expect(targetHighlightStyleV7("CRACK_ICE")).toBe("ATTACK");
    expect(tileAbilityV7("CRACK_ICE")).toMatchObject({
      label: "Crack Ice",
      raster: "ICON:ACTION:CRACK_ICE",
      dockAction: "crack-ice",
    });
  });

  it("labels plain ice 'Break' and the viewer's frozen ship 'Free the ship'", () => {
    const view = viewOf(iceCrackUiFixtureV7());
    const warrior = unitAt(view, at.cracker);
    expect(unitHasCrackIceV7(view, warrior)).toBe(true);
    const targets = crackIcePickTargetsV7(view, queryPlayerCommandsV7(view), {
      kind: "CRACK_ICE",
      unitId: warrior.id,
    });
    const byTile = (coord: CoordV7) =>
      targets.find((target) => same(target.at, coord));
    expect(targets).toHaveLength(3);
    expect(byTile(at.west)).toMatchObject({
      family: "CRACK_ICE",
      previewLabel: "Break",
    });
    expect(byTile(at.west)?.highlight).toBeUndefined();
    expect(byTile(at.middle)?.previewLabel).toBe("Break");
    expect(byTile(at.frozenShip)).toMatchObject({
      previewLabel: "Free the ship",
      highlight: "SUPPORT",
    });
    expect(byTile(at.frozenShip)?.semanticLabel).toBe(
      "Crack Ice: The ice breaks into open water: the ship floats free. Choose a highlighted ice tile to crack.",
    );
    for (const target of targets) {
      expect(target.previewLabel).not.toMatch(COORDINATE);
      expect(target.semanticLabel).not.toMatch(COORDINATE);
    }
    // The armed board shows exactly these, and the board badges them.
    const armed = plan(view, warrior.id, {
      freezePick: { kind: "CRACK_ICE", unitId: warrior.id },
    });
    expect(
      armed.targets.map((target) => `${target.at.x},${target.at.y}`).sort(),
    ).toEqual(["1,3", "2,3", "3,3"]);
    const badges = tileActionPlanForSelectionV7(
      view,
      queryPlayerCommandsV7(view),
      warrior.id,
    );
    for (const tile of [at.west, at.middle, at.frozenShip])
      expect(
        tileActionsAtV7(badges, tile)?.actions.map((action) => action.id),
      ).toContain("CRACK_ICE");
    expect(
      tileActionsAtV7(badges, at.frozenShip)?.actions.find(
        (action) => action.id === "CRACK_ICE",
      )?.style,
    ).toBe("SUPPORT");
  });

  it("names thick ice's first crack and breaks a cracked tile", () => {
    const view = viewOf(iceCrackUiFixtureV7({ thick: true }));
    const warrior = unitAt(view, at.cracker);
    const targets = crackIcePickTargetsV7(view, queryPlayerCommandsV7(view), {
      kind: "CRACK_ICE",
      unitId: warrior.id,
    });
    const label = (coord: CoordV7) =>
      targets.find((target) => same(target.at, coord))?.previewLabel;
    expect(label(at.west)).toBe("Break");
    expect(label(at.middle)).toBe("Crack · 1 more breaks it");
    expect(label(at.frozenShip)).toBe("Crack · 1 more frees it");
  });

  it("gives the first failing reason, and no button to the Ice Folk", () => {
    const state = iceCrackUiFixtureV7();
    const view = viewOf(state);
    const warrior = unitAt(view, at.cracker);
    expect(crackIceUnavailableTextV7(view, warrior, true)).toBeNull();
    const acted = viewOf(
      patchFrozenUnitV7(state, warrior.id, {
        activation: { ...warrior.activation, specialActed: true },
      }),
    );
    expect(
      crackIceUnavailableTextV7(acted, unitAt(acted, at.cracker), false),
    ).toBe(CRACK_ICE_ALREADY_ACTED_V7);
    // The Ice Folk owner's own unit has no Crack Ice at all.
    const owner = state.players.find((player) => player.faction === "ICE_FOLK");
    if (owner === undefined) throw new Error("no Ice Folk seat");
    const ownerView = viewForV7(state, owner.id);
    const iceFolkUnit = ownerView.units.find(
      (unit) => unit.ownerId === ownerView.viewer.id,
    );
    if (iceFolkUnit === undefined) throw new Error("no Ice Folk unit");
    expect(crackIceUnavailableTextV7(ownerView, iceFolkUnit, false)).toBeNull();
    expect(unitHasCrackIceV7(ownerView, iceFolkUnit)).toBe(false);
  });

  it("says a unit on the ice or a building on it stops the crack", () => {
    const view = viewOf(iceCrackUiFixtureV7());
    const warrior = unitAt(view, at.cracker);
    const onlyTile = (ice: PlayerViewV7["ice"][number]) =>
      same(ice.at, at.middle);
    const occupied: PlayerViewV7 = {
      ...view,
      ice: view.ice.filter(onlyTile),
      units: [
        ...view.units,
        { ...warrior, id: 999 as never, at: at.middle, ownerId: -5 as never },
      ],
    };
    expect(crackIceUnavailableTextV7(occupied, warrior, false)).toBe(
      CRACK_ICE_OCCUPIED_V7,
    );
    const built: PlayerViewV7 = {
      ...view,
      ice: view.ice.filter(onlyTile),
      board: {
        ...view.board,
        tiles: view.board.tiles.map((tile) =>
          same(tile.at, at.middle) && tile.explored
            ? { ...tile, improvement: "FISHING_HOLE" as const }
            : tile,
        ),
      },
    };
    expect(crackIceUnavailableTextV7(built, warrior, false)).toBe(
      CRACK_ICE_BUILT_V7,
    );
  });

  it("is announced, flashed and heard when the ice breaks or cracks", () => {
    for (const thick of [false, true]) {
      const state = iceCrackUiFixtureV7({ thick });
      const before = viewOf(state);
      const warrior = unitAt(before, at.cracker);
      const command: CommandV7 = {
        kind: "CRACK_ICE",
        unitId: warrior.id,
        at: at.frozenShip,
      };
      const result = applyCommandV7(state, state.humanPlayerId, command);
      if (!result.accepted) throw new Error("Crack Ice rejected");
      const after = viewOf(result.state);
      const envelope = projectEventsV7(
        state,
        result.state,
        state.humanPlayerId,
        result.events,
      );
      const notice = frozenSeaBoundaryNoticeV7(envelope.events, before, after);
      expect(notice?.text).toBe(
        thick ? "The ice cracked" : "The ice broke: the ship floats free",
      );
      expect(notice?.toast).toBe(!thick);
      const steps = corePresentationPlanV7(before, envelope, after);
      const cue = steps.find((step) => step.kind === "ICE_FOLK");
      const effect = thick ? "ICE_CRACK" : "ICE_BREAK";
      expect(cue).toMatchObject({
        effect,
        cells: [at.frozenShip],
        from: at.cracker,
        durationMs: ICE_FOLK_EFFECT_DURATIONS_V7[effect],
      });
      if (cue === undefined) throw new Error("no cue");
      expect(
        soundCuesForStepV7({
          step: cue,
          before,
          after,
          envelope,
          durationScale: 1,
        }).map((sound) => sound.id),
      ).toEqual(["special.ice-crack"]);
    }
  });

  it("draws both cues at any progress", () => {
    for (const effect of ["ICE_CRACK", "ICE_BREAK"] as const)
      for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
        const { context, calls } = recorder();
        drawIceFolkFeedbackV7(
          context,
          { offsetX: 0, offsetY: 0, zoom: 1 },
          { effect, cells: [{ x: 2, y: 3 }], from: { x: 2, y: 2 }, progress },
        );
        expect(calls.filter((call) => call[0] === "save").length).toBe(
          calls.filter((call) => call[0] === "restore").length,
        );
        if (progress < 1)
          expect(calls.some((call) => call[0] === "stroke")).toBe(true);
      }
  });
});

describe("building on the ice", () => {
  it("names the Ice Folk dock the Ice Harbour and the Great Harbour", () => {
    expect(factionBuildingV7("PORT", "ICE_FOLK")?.name).toBe("Ice Harbour");
    expect(factionBuildingV7("SHIPYARD", "ICE_FOLK")?.name).toBe(
      "Great Harbour",
    );
    expect(factionBuildingV7("PORT", "ORIGINAL")).toBeNull();
  });

  it("draws every building on ice on the snow pad, but the Fishing Hole", () => {
    for (const greatHarbour of [false, true]) {
      const view = viewOf(iceBuildUiFixtureV7({ greatHarbour }));
      const entries = plan(view, null).entries.filter(
        (entry) => entry.kind === "IMPROVEMENT",
      );
      const on = (coord: CoordV7) =>
        entries.find((entry) => same(entry.at, coord));
      expect(on(at.hole)?.artSubject).toBe("IMPROVEMENT:ICE_FOLK:FISHING_HOLE");
      expect(on(at.hole)?.onIce).toBeUndefined();
      expect(on(at.workshop)).toMatchObject({
        artSubject: "IMPROVEMENT:ICE_FOLK:WORKSHOP",
        onIce: true,
      });
      expect(on(at.harbour)).toMatchObject({
        artSubject: greatHarbour
          ? "IMPROVEMENT:ICE_FOLK:SHIPYARD"
          : "IMPROVEMENT:ICE_FOLK:PORT",
        label: greatHarbour ? "Great Harbour" : "Ice Harbour",
        onIce: true,
      });
    }
    // A building on land has no pad.
    const land = plan(viewOf(iceCrackUiFixtureV7()), null).entries.filter(
      (entry) => entry.kind === "IMPROVEMENT" && entry.onIce === true,
    );
    expect(land).toEqual([]);
  });

  it("the pad is a snow ellipse with a blue-grey rim under the sprite", () => {
    const { context, calls } = recorder();
    drawIceBuildingPadV7(context, 100, 100, 1, {});
    const ellipses = calls.filter((call) => call[0] === "ellipse");
    expect(ellipses[0]).toEqual([
      "ellipse",
      100,
      100 + ICE_BUILDING_PAD_V7.offsetY,
      ICE_BUILDING_PAD_V7.radiusX,
      ICE_BUILDING_PAD_V7.radiusY,
      0,
      0,
      Math.PI * 2,
    ]);
    expect(ICE_BUILDING_PAD_V7.fill).toBe("#eef4f7");
    expect(ICE_BUILDING_PAD_V7.rim).toBe("#b9c9d3");
    expect(calls.filter((call) => call[0] === "save").length).toBe(
      calls.filter((call) => call[0] === "restore").length,
    );
  });
});

describe("the Freeze preview", () => {
  it("names the tiles it takes and the cracks it mends", () => {
    const view = viewOf(iceBuildUiFixtureV7());
    const yeti = unitAt(view, at.yeti);
    const taking = previewFreezeV7(view, yeti.id, at.foreign);
    const mending = previewFreezeV7(view, yeti.id, at.west);
    if (taking === null || mending === null) throw new Error("no preview");
    expect(freezeTargetLabelV7(freezeOutcomeV7(taking))).toBe(
      "Ice 2 · takes 1",
    );
    expect(freezeOutcomeTextV7(freezeOutcomeV7(taking))).toBe(
      "Freeze: 2 tiles of ice. It stays until it is cracked. 1 tile of another player's ice becomes yours.",
    );
    expect(freezeTargetLabelV7(freezeOutcomeV7(mending))).toBe(
      "Ice 2 · mends 1",
    );
  });
});

describe("Black Ice", () => {
  it("says on the slip that it freezes", () => {
    expect(SLIP_BLACK_ICE_MOVE_LABEL_V7).toBe(
      "Ice: your Move ends here (Black Ice freezes)",
    );
  });
});
