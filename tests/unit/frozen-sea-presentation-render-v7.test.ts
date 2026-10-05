import { describe, expect, it } from "vitest";
import {
  ICE_CRUSH_DAMAGE_V7,
  applyCommandV7,
  previewFreezeV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  SEA_ICE_EDGE_EAST_V7,
  SEA_ICE_EDGE_WEST_V7,
} from "../../src/assets/sea-ice-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  moveOnIceV7,
  seaIceCellsV7,
} from "../../src/render/canvas/frozen-sea-board-plan-v7";
import {
  ICEBOUND_MARKER_FRAME_V7,
  SEA_ICE_CRACKS_V7,
  drawIceboundMarkerV7,
  drawSeaIceCellV7,
  drawSlideArrowV7,
  seaIceCracksV7,
} from "../../src/render/canvas/frozen-sea-canvas-v7";
import {
  ICE_FOLK_EFFECT_DURATIONS_V7,
  drawIceFolkFeedbackV7,
  type IceFolkFeedbackEffectV7,
} from "../../src/render/canvas/ice-folk-effects-v7";
import type { IceFolkBoardArtV7 } from "../../src/render/canvas/ice-folk-canvas-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  TARGET_HIGHLIGHT_FAMILIES_V7,
  targetHighlightStyleV7,
  targetIsSteppedV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  FREEZE_ALREADY_ACTED_V7,
  FREEZE_NEEDS_PACK_ICE_V7,
  FREEZE_NEEDS_RIME_V7,
  ICEBOUND_PREVIEW_V7,
  ICE_COVER_PREVIEW_V7,
  ICE_FOR_SHIPS_HELP_V7,
  ICE_HELP_RULES_V7,
  ICE_SEA_DOG_GOAL_V7,
  SLIDE_MOVE_LABEL_V7,
  SLIP_MOVE_LABEL_V7,
  crushWarningV7,
  freezeOutcomeV7,
  freezeTargetLabelV7,
  freezeUnavailableTextV7,
  frozenSeaBoundaryNoticeV7,
  frozenSeaCombatNotesV7,
  iceChipLabelV7,
  iceChipTooltipV7,
  iceCrackStageV7,
} from "../../src/render/frozen-sea-presentation-v7";
import { technologySubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import { galleryUnitCellV7 } from "../../src/render/gallery-presentation-v7";
import { roleAbilityDescriptionV7 } from "../../src/render/role-presentation-v7";
import {
  frozenArenaV7,
  frozenStateV7,
  patchFrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import { navalUnitAtV7 } from "../fixtures/v7-naval-branch";
import {
  FROZEN_UI_V7,
  frozenFreezeUiFixtureV7,
  frozenIceboundUiFixtureV7,
  frozenSlideUiFixtureV7,
} from "../fixtures/v7-frozen-sea-ui";

// The frozen sea interface (bead pulp_wars-5ti.7, second part;
// docs/ui/BOARD_TARGETING.md section 3.5): the board plan, the words and
// the canvas marks of Freeze, the ice, the slide, Icebound and the crush.

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const at = (coord: CoordV7): string => `${coord.x},${coord.y}`;

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

function unitAt(view: PlayerViewV7, coord: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === coord.x && candidate.at.y === coord.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at(coord)}`);
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
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 6 })
            : key === "createLinearGradient"
              ? () => ({ addColorStop: () => undefined })
              : key in target
                ? Reflect.get(target, key)
                : (...args: unknown[]) => {
                    calls.push([String(key), ...args]);
                  },
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  ) as CanvasRenderingContext2D;
  const named = (name: string) => calls.filter((call) => call[0] === name);
  return { context, calls, named };
}

describe("Freeze on the board plan", () => {
  it("is one family in the Place style, stepped with Tab", () => {
    expect(TARGET_HIGHLIGHT_FAMILIES_V7).toContain("FREEZE");
    expect(targetHighlightStyleV7("FREEZE")).toBe("PLACE");
    expect(targetIsSteppedV7("FREEZE")).toBe(true);
  });

  it("unarmed, a line role shows no Freeze target", () => {
    const view = viewOf(frozenFreezeUiFixtureV7());
    const yeti = unitAt(view, FROZEN_UI_V7.yeti);
    const built = plan(view, yeti.id);
    expect(built.targets.some((target) => target.family === "FREEZE")).toBe(
      false,
    );
    expect(
      built.entries.some((entry) =>
        entry.key.startsWith("ability-area:FREEZE"),
      ),
    ).toBe(false);
  });

  it("armed, each offered Freeze is a target with the exact outcome", () => {
    const view = viewOf(frozenFreezeUiFixtureV7());
    const yeti = unitAt(view, FROZEN_UI_V7.yeti);
    const built = plan(view, yeti.id, {
      freezePick: { kind: "FREEZE", unitId: yeti.id },
    });
    const offered = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "FREEZE" && command.unitId === yeti.id,
    );
    expect(offered).toHaveLength(3);
    expect(built.targets.map((target) => target.family)).toEqual([
      "FREEZE",
      "FREEZE",
      "FREEZE",
    ]);
    for (const target of built.targets) {
      if (target.command.kind !== "FREEZE") throw new Error("not a Freeze");
      const preview = previewFreezeV7(view, yeti.id, target.command.at);
      if (preview === null) throw new Error("preview missing");
      expect(at(target.at)).toBe(at(target.command.at));
      expect(target.freeze?.tiles).toEqual(preview.tiles);
      // With Glacier the ice lasts 5 turns; none of it is in territory.
      expect(target.previewLabel).toBe(`Ice ${preview.tiles.length} · 5 turns`);
      expect(target.semanticLabel).toContain(
        `${preview.tiles.length} ${preview.tiles.length === 1 ? "tile" : "tiles"} of ice`,
      );
      expect(target.semanticLabel).not.toMatch(COORDINATE);
    }
    // The line south of the Yeti: its own tile and the Deep Water beyond.
    const south = built.targets.find(
      (target) => at(target.at) === at(FROZEN_UI_V7.freezeAt),
    );
    expect(south?.freeze?.tiles.map(at)).toEqual([
      at(FROZEN_UI_V7.freezeAt),
      at(FROZEN_UI_V7.freezeBeyond),
    ]);
    // The far tiles are tinted and are not targets.
    const beyond = built.entries.filter((entry) =>
      entry.key.startsWith("ability-area:FREEZE:"),
    );
    expect(beyond.map((entry) => at(entry.at))).toContain(
      at(FROZEN_UI_V7.freezeBeyond),
    );
    for (const entry of beyond)
      expect(
        built.targets.some((target) => at(target.at) === at(entry.at)),
      ).toBe(false);
    // The Patrol Boat a Freeze would lock in says so.
    const prey = built.targets.find(
      (target) => at(target.at) === at(FROZEN_UI_V7.prey),
    );
    expect(prey?.previewNote).toBe("Icebound 1");
    expect(
      built.entries
        .filter((entry) => entry.key.startsWith("ability-target:ICEBOUND:"))
        .map((entry) => [at(entry.at), entry.label]),
    ).toEqual([[at(FROZEN_UI_V7.prey), "Icebound"]]);
  });

  it("with Rime alone the line stops at Deep Water and locks no ship in", () => {
    const view = viewOf(frozenFreezeUiFixtureV7({ rime: true }));
    const yeti = unitAt(view, FROZEN_UI_V7.yeti);
    const built = plan(view, yeti.id, {
      freezePick: { kind: "FREEZE", unitId: yeti.id },
    });
    // The tile under the Patrol Boat is not freezable without Icebound.
    expect(built.targets.map((target) => at(target.at))).not.toContain(
      at(FROZEN_UI_V7.prey),
    );
    const south = built.targets.find(
      (target) => at(target.at) === at(FROZEN_UI_V7.freezeAt),
    );
    expect(south?.freeze?.tiles.map(at)).toEqual([at(FROZEN_UI_V7.freezeAt)]);
    expect(south?.previewLabel).toBe("Ice 1 · 3 turns");
  });

  it("says when the ice stays: a tile in the unit owner's territory", () => {
    // A Yeti on the capital's shore: the Shallow Water beside the Port is
    // in its territory, the Deep Water beyond is not.
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 6, y: 2 } }],
    });
    const view = viewOf(state);
    const yeti = unitAt(view, { x: 6, y: 2 });
    const preview = previewFreezeV7(view, yeti.id, { x: 6, y: 3 });
    if (preview === null) throw new Error("preview missing");
    const outcome = freezeOutcomeV7(view, yeti, preview);
    expect(outcome).toMatchObject({ tiles: 2, permanent: 1, icebound: 0 });
    expect(freezeTargetLabelV7(outcome)).toBe("Ice 2 · 5 turns, 1 stays");
    // The engine agrees: after the Freeze that tile is permanent.
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "FREEZE",
      unitId: yeti.id,
      at: { x: 6, y: 3 },
    });
    if (!result.accepted) throw new Error("Freeze rejected");
    expect(
      viewOf(result.state).ice.map((entry) => [at(entry.at), entry.permanent]),
    ).toEqual([
      ["6,3", true],
      ["6,4", false],
    ]);
  });

  it("the Witch's ring is marked quietly, and prominently while her button is focused", () => {
    const view = viewOf(frozenFreezeUiFixtureV7());
    const witch = unitAt(view, FROZEN_UI_V7.witch);
    const command = queryPlayerCommandsV7(view).find(
      (candidate): candidate is Extract<CommandV7, { kind: "FREEZE" }> =>
        candidate.kind === "FREEZE" && candidate.unitId === witch.id,
    );
    if (command === undefined) throw new Error("no Freeze for the Witch");
    expect(at(command.at)).toBe(at(FROZEN_UI_V7.witch));
    const preview = previewFreezeV7(view, witch.id, command.at);
    if (preview === null) throw new Error("preview missing");
    const ring = (built: BoardRenderPlanV7) =>
      built.entries.filter((entry) =>
        entry.key.startsWith("ability-area:FREEZE:"),
      );
    const quiet = plan(view, witch.id);
    expect(
      ring(quiet)
        .map((entry) => at(entry.at))
        .sort(),
    ).toEqual(preview.tiles.map(at).sort());
    expect(new Set(ring(quiet).map((entry) => entry.abilityStyle))).toEqual(
      new Set(["FREEZE"]),
    );
    // The ring is never a target: her tiles are not picked.
    expect(quiet.targets.some((target) => target.family === "FREEZE")).toBe(
      false,
    );
    const prominent = plan(view, witch.id, {
      freezeRingFocusUnitId: witch.id,
    });
    expect(new Set(ring(prominent).map((entry) => entry.abilityStyle))).toEqual(
      new Set(["FREEZE_FOCUS"]),
    );
    const label = prominent.entries.find((entry) =>
      entry.key.startsWith("ability-target:FREEZE_RING:"),
    );
    expect(at(label?.at ?? { x: -1, y: -1 })).toBe(at(FROZEN_UI_V7.witch));
    expect(label?.label).toBe(`Ice ${preview.tiles.length} · 5 turns`);
    // A line role has no ring.
    expect(ring(plan(view, unitAt(view, FROZEN_UI_V7.yeti).id))).toEqual([]);
  });

  it("names the engine's rejection rows only next to water", () => {
    const state = frozenFreezeUiFixtureV7();
    const view = viewOf(state);
    const yeti = unitAt(view, FROZEN_UI_V7.yeti);
    expect(freezeUnavailableTextV7(view, yeti, true)).toBeNull();
    // Row 4: it already acted.
    const acted = viewOf(
      patchFrozenUnitV7(state, yeti.id, {
        activation: { ...yeti.activation, attacked: true, attacksUsed: 1 },
      }),
    );
    expect(
      queryPlayerCommandsV7(acted).some(
        (command) => command.kind === "FREEZE" && command.unitId === yeti.id,
      ),
    ).toBe(false);
    expect(
      freezeUnavailableTextV7(acted, unitAt(acted, FROZEN_UI_V7.yeti), false),
    ).toBe(FREEZE_ALREADY_ACTED_V7);
    // Row 3: no Rime.
    const noRime = viewOf(
      frozenArenaV7({
        technologies: [[], []],
        units: [{ seat: 0, role: "FIGHTER", at: FROZEN_UI_V7.yeti }],
      }),
    );
    expect(
      freezeUnavailableTextV7(noRime, unitAt(noRime, FROZEN_UI_V7.yeti), false),
    ).toBe(FREEZE_NEEDS_RIME_V7);
    // Row 6: only Deep Water beside it, and no Pack Ice.
    const deep = viewOf(
      frozenArenaV7({
        technologies: [["SHORECRAFT"], []],
        units: [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 5 } }],
        ice: [{ at: { x: 3, y: 5 } }],
      }),
    );
    const onIce = unitAt(deep, { x: 3, y: 5 });
    expect(
      queryPlayerCommandsV7(deep).some(
        (command) => command.kind === "FREEZE" && command.unitId === onIce.id,
      ),
    ).toBe(false);
    expect(freezeUnavailableTextV7(deep, onIce, false)).toBe(
      FREEZE_NEEDS_PACK_ICE_V7,
    );
    // A unit with no water next to it has no button at all.
    const inland = unitAt(view, { x: 5, y: 2 });
    expect(freezeUnavailableTextV7(view, inland, false)).not.toBeNull();
    const far = viewOf(
      frozenArenaV7({
        units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 0 } }],
      }),
    );
    expect(
      freezeUnavailableTextV7(far, unitAt(far, { x: 2, y: 0 }), false),
    ).toBeNull();
  });
});

describe("ice on the board plan", () => {
  it("gives each ice cell its depth, its open-water sides and its stage", () => {
    const view = viewOf(frozenIceboundUiFixtureV7());
    const cells = seaIceCellsV7(view);
    expect(cells.size).toBe(view.ice.length);
    // Three melting tiles in a row: 3, 2 and 1 turns left.
    const [first, second, third] = FROZEN_UI_V7.melting.map((coord) =>
      cells.get(at(coord)),
    );
    expect([first?.stage, second?.stage, third?.stage]).toEqual([1, 2, 3]);
    expect(first?.depth).toBe("DEEP");
    // The row is ice east of the first tile and west of the third.
    expect((first?.openWater ?? 0) & SEA_ICE_EDGE_EAST_V7).toBe(0);
    expect((first?.openWater ?? 0) & SEA_ICE_EDGE_WEST_V7).not.toBe(0);
    expect((third?.openWater ?? 0) & SEA_ICE_EDGE_WEST_V7).toBe(0);
    // Permanent ice in the capital's territory: snow, no cracks.
    const permanent = cells.get(at(FROZEN_UI_V7.permanent));
    expect(permanent).toMatchObject({
      depth: "SHALLOW",
      permanent: true,
      stage: 0,
    });
    // The plan carries the cells on their TERRAIN entries, and no Snow
    // stand-in on water any more.
    const built = plan(view, null);
    const iced = built.entries.filter((entry) => entry.seaIce !== undefined);
    expect(iced.map((entry) => entry.kind)).toEqual(iced.map(() => "TERRAIN"));
    expect(iced).toHaveLength(view.ice.length);
    for (const entry of iced) expect(entry.snow).toBeUndefined();
  });

  it("maps the countdown to the crack stage", () => {
    expect(iceCrackStageV7({ permanent: true, turnsLeft: 1 })).toBe(0);
    expect(iceCrackStageV7({ permanent: false, turnsLeft: 5 })).toBe(1);
    expect(iceCrackStageV7({ permanent: false, turnsLeft: 3 })).toBe(1);
    expect(iceCrackStageV7({ permanent: false, turnsLeft: 2 })).toBe(2);
    expect(iceCrackStageV7({ permanent: false, turnsLeft: 1 })).toBe(3);
    expect(iceCrackStageV7({ permanent: false, turnsLeft: 0 })).toBe(3);
    for (const stage of [0, 1, 2, 3] as const) {
      const cracks = seaIceCracksV7({ x: 4, y: 6 }, stage);
      expect(cracks).toHaveLength(SEA_ICE_CRACKS_V7.lines[stage]);
      for (const crack of cracks) {
        expect(crack).toHaveLength(SEA_ICE_CRACKS_V7.segments[stage] + 1);
        for (const [x, y] of crack) {
          expect(x).toBeGreaterThanOrEqual(0.08);
          expect(x).toBeLessThanOrEqual(0.92);
          expect(y).toBeGreaterThanOrEqual(0.08);
          expect(y).toBeLessThanOrEqual(0.92);
        }
      }
    }
    // Deterministic per cell.
    expect(seaIceCracksV7({ x: 4, y: 6 }, 3)).toEqual(
      seaIceCracksV7({ x: 4, y: 6 }, 3),
    );
    expect(seaIceCracksV7({ x: 4, y: 6 }, 3)).not.toEqual(
      seaIceCracksV7({ x: 5, y: 6 }, 3),
    );
  });

  it("labels the tile's ice with its turns, without coordinates", () => {
    const view = viewOf(frozenIceboundUiFixtureV7());
    const melting = view.ice.find(
      (entry) => at(entry.at) === at(FROZEN_UI_V7.melting[2]),
    );
    const permanent = view.ice.find(
      (entry) => at(entry.at) === at(FROZEN_UI_V7.permanent),
    );
    if (melting === undefined || permanent === undefined)
      throw new Error("ice missing");
    expect(iceChipLabelV7(melting)).toBe("Ice · 1");
    expect(iceChipLabelV7(permanent)).toBe("Ice · stays");
    expect(iceChipTooltipV7(view, melting)).toContain(
      "It melts in 1 of your turn unless a land unit stands on it",
    );
    expect(iceChipTooltipV7(view, permanent)).toContain(
      "It does not melt in your territory",
    );
    // The viewer has Black Ice (every technology): its own ice says so.
    expect(iceChipTooltipV7(view, melting)).toContain("Black Ice:");
    // Another seat's ice does not (its research is private).
    const victim = viewOf(frozenIceboundUiFixtureV7({ victim: true }));
    const theirs = victim.ice[0];
    if (theirs === undefined) throw new Error("ice missing");
    expect(iceChipTooltipV7(victim, theirs)).not.toContain("Black Ice");
    expect(iceChipTooltipV7(victim, theirs)).toContain("its owner's");
    for (const entry of view.ice)
      expect(iceChipTooltipV7(view, entry)).not.toMatch(COORDINATE);
  });
});

describe("moving on ice", () => {
  it("a slider's Move carries its slide from the shore to where the ice ends", () => {
    const view = viewOf(frozenSlideUiFixtureV7());
    const yeti = unitAt(view, FROZEN_UI_V7.bridgeHead);
    const built = plan(view, yeti.id);
    const last = FROZEN_UI_V7.bridge.at(-1);
    if (last === undefined) throw new Error("bridge missing");
    // The only destination on the ice is the tile the slide stops on.
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.map((target) => at(target.at))).toEqual([at(last)]);
    expect(onIce[0]?.slide).toEqual([
      { from: FROZEN_UI_V7.bridgeHead, tiles: FROZEN_UI_V7.bridge },
    ]);
    expect(onIce[0]?.slip).toBeUndefined();
    expect(onIce[0]?.semanticLabel).toBe(SLIDE_MOVE_LABEL_V7);
    // Its plain Moves on land carry nothing.
    for (const target of built.targets)
      if (target.family === "MOVE" && target !== onIce[0])
        expect(target.slide).toBeUndefined();
  });

  it("a Sled slides the bridge and steps ashore in the same Move", () => {
    const view = viewOf(frozenSlideUiFixtureV7({ sled: true }));
    const sled = unitAt(view, FROZEN_UI_V7.bridgeHead);
    const built = plan(view, sled.id);
    const ashore = built.targets.find(
      (target) =>
        target.family === "MOVE" && at(target.at) === at(FROZEN_UI_V7.farShore),
    );
    expect(ashore?.slide).toEqual([
      { from: FROZEN_UI_V7.bridgeHead, tiles: FROZEN_UI_V7.bridge },
    ]);
    if (ashore?.command.kind !== "MOVE") throw new Error("no Move ashore");
    expect(ashore.command.path).toHaveLength(FROZEN_UI_V7.bridge.length + 1);
  });

  it("the Sabretooth walks on ice: plain Moves, no slide and no slip", () => {
    const view = viewOf(frozenSlideUiFixtureV7());
    const sabretooth = unitAt(view, { x: 0, y: 2 });
    const built = plan(view, sabretooth.id);
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.length).toBeGreaterThan(1);
    for (const target of onIce) {
      expect(target.slide).toBeUndefined();
      expect(target.slip).toBeUndefined();
      if (target.command.kind === "MOVE")
        expect(moveOnIceV7(view, target.command)).toBeNull();
    }
  });

  it("another faction's unit slips: its Move ends on the first ice tile", () => {
    const view = viewOf(frozenSlideUiFixtureV7({ slipper: true }));
    const fighter = unitAt(view, FROZEN_UI_V7.bridgeHead);
    const built = plan(view, fighter.id);
    const first = FROZEN_UI_V7.bridge[0];
    if (first === undefined) throw new Error("bridge missing");
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.map((target) => at(target.at))).toEqual([at(first)]);
    expect(onIce[0]?.slip).toBe(true);
    expect(onIce[0]?.slide).toBeUndefined();
    expect(onIce[0]?.semanticLabel).toBe(SLIP_MOVE_LABEL_V7);
  });
});

describe("Icebound and the crush", () => {
  it("marks a ship locked in the ice, for both sides, with the crush", () => {
    for (const victim of [false, true]) {
      const view = viewOf(frozenIceboundUiFixtureV7({ victim }));
      const ship = unitAt(view, FROZEN_UI_V7.frozenShip);
      expect(
        view.unitStats.find((entry) => entry.unitId === ship.id)?.icebound,
      ).toBe(true);
      const warning = crushWarningV7(view, ship);
      expect(warning).toMatchObject({
        damage: ICE_CRUSH_DAMAGE_V7,
        lethal: false,
        label: `−${ICE_CRUSH_DAMAGE_V7} HP`,
      });
      expect(warning?.text).toBe(
        victim
          ? "The ice crushes it for 3 at the start of Player 2's turn"
          : "The ice crushes it for 3 at the start of your turn",
      );
      const entry = plan(view, null).entries.find(
        (candidate) => candidate.key === `unit:${ship.id}`,
      );
      expect(entry?.icebound).toEqual({ crush: "−3 HP", lethal: false });
      // The owner of an icebound ship is offered no Move, Attack or Board.
      if (victim)
        expect(
          queryPlayerCommandsV7(view).filter(
            (command) =>
              (command.kind === "MOVE" ||
                command.kind === "ATTACK" ||
                command.kind === "BOARD") &&
              command.unitId === ship.id,
          ),
        ).toEqual([]);
    }
  });

  it("says when the next crush sinks it", () => {
    const state = frozenIceboundUiFixtureV7({ victim: true });
    const ship = navalUnitAtV7(state, FROZEN_UI_V7.frozenShip);
    const view = viewOf(patchFrozenUnitV7(state, ship.id, { hp: 2 }));
    expect(crushWarningV7(view, unitAt(view, FROZEN_UI_V7.frozenShip))).toEqual(
      {
        damage: 2,
        lethal: true,
        label: "Sinks",
        text: "The ice crushes it at the start of Player 2's turn: it sinks",
      },
    );
    // A free ship has no warning.
    const free = viewOf(
      frozenArenaV7({
        factions: ["ORIGINAL", "ICE_FOLK"],
        units: [{ seat: 0, role: "BATTLESHIP", at: FROZEN_UI_V7.frozenShip }],
      }),
    );
    expect(
      crushWarningV7(free, unitAt(free, FROZEN_UI_V7.frozenShip)),
    ).toBeNull();
  });

  it("adds the frozen-sea notes to an attack preview", () => {
    // An Ice Folk Yeti attacks the Battleship frozen in next to it.
    const state = frozenStateV7(
      frozenArenaV7({
        units: [
          { seat: 0, role: "FIGHTER", at: { x: 7, y: 4 } },
          { seat: 1, role: "BATTLESHIP", at: FROZEN_UI_V7.frozenShip },
        ],
      }),
      [{ at: FROZEN_UI_V7.frozenShip }],
    );
    const view = viewOf(state);
    const yeti = unitAt(view, { x: 7, y: 4 });
    const ship = unitAt(view, FROZEN_UI_V7.frozenShip);
    const preview = queryCombatPreviewV7(view, yeti.id, ship.id);
    if (preview === null) throw new Error("preview missing");
    expect(preview.icebound).toBe(true);
    expect(preview.damageToAttacker).toBe(0);
    expect(frozenSeaCombatNotesV7(preview)).toEqual([ICEBOUND_PREVIEW_V7]);
    const attack = plan(view, yeti.id).targets.find(
      (target) => target.family === "ATTACK",
    );
    expect(attack?.previewNote).toContain(ICEBOUND_PREVIEW_V7);
    // The enemy's view of a Yeti on its own ice with Glacier: cover.
    const enemy = viewForV7(state, ship.ownerId);
    expect(
      enemy.unitStats.find((entry) => entry.unitId === yeti.id)?.iceFolk
        ?.iceCover,
    ).toBe(true);
    expect(
      frozenSeaCombatNotesV7({
        ...preview,
        iceCover: true,
        icebound: false,
      }),
    ).toEqual([ICE_COVER_PREVIEW_V7]);
  });
});

describe("frozen-sea cues and notices", () => {
  it("a Freeze spreads frost and is announced without coordinates", () => {
    const state = frozenFreezeUiFixtureV7();
    const before = viewOf(state);
    const yeti = unitAt(before, FROZEN_UI_V7.yeti);
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "FREEZE",
      unitId: yeti.id,
      at: FROZEN_UI_V7.prey,
    });
    if (!result.accepted) throw new Error("Freeze rejected");
    const after = viewOf(result.state);
    const envelope = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    const steps = corePresentationPlanV7(before, envelope, after);
    const cue = steps.find(
      (step) => step.kind === "ICE_FOLK" && step.effect === "ICE_FREEZE",
    );
    expect(cue).toMatchObject({
      cells: [FROZEN_UI_V7.prey],
      from: FROZEN_UI_V7.yeti,
      durationMs: ICE_FOLK_EFFECT_DURATIONS_V7.ICE_FREEZE,
    });
    const notice = frozenSeaBoundaryNoticeV7(envelope.events, before, after);
    expect(notice?.text).toBe(
      "You froze 1 tile: Player 2's Patrol Boat is icebound",
    );
    expect(notice?.text).not.toMatch(COORDINATE);
    expect(frozenSeaBoundaryNoticeV7([], before, after)).toBeNull();
  });

  it("plans the melt and the crush from their events", () => {
    const view = viewOf(frozenIceboundUiFixtureV7({ victim: true }));
    const ship = unitAt(view, FROZEN_UI_V7.frozenShip);
    const iceOwner = view.ice[0]?.ownerId;
    if (iceOwner === undefined) throw new Error("ice missing");
    const envelope = {
      ...projectEventsV7(
        frozenIceboundUiFixtureV7({ victim: true }),
        frozenIceboundUiFixtureV7({ victim: true }),
        view.viewer.id,
        [],
      ),
      events: [
        {
          kind: "UNITS_CRUSHED" as const,
          playerId: iceOwner,
          results: [
            { unitId: ship.id, damage: 3, shieldDamage: 0, hpAfter: 22 },
          ],
        },
        {
          kind: "ICE_MELTED" as const,
          tiles: [FROZEN_UI_V7.melting[2]],
          freed: [],
        },
      ],
    };
    const steps = corePresentationPlanV7(view, envelope, view);
    expect(
      steps.map((step) => (step.kind === "ICE_FOLK" ? step.effect : step.kind)),
    ).toEqual(["ICE_CRUSH", "DAMAGE", "ICE_MELT"]);
    expect(steps[1]).toMatchObject({
      unitId: ship.id,
      damage: 3,
      lethal: false,
    });
    const notice = frozenSeaBoundaryNoticeV7(envelope.events, view, view);
    expect(notice).toEqual({
      text: "The ice crushed your Battleship for 3 · Ice melted on 1 tile",
      toast: true,
    });
  });

  it("a boarding raises the captor's flag", () => {
    const steps = corePresentationPlanV7(viewOf(frozenIceboundUiFixtureV7()), {
      ...projectEventsV7(
        frozenIceboundUiFixtureV7(),
        frozenIceboundUiFixtureV7(),
        viewOf(frozenIceboundUiFixtureV7()).viewer.id,
        [],
      ),
      events: [
        {
          kind: "SHIP_BOARDED",
          playerId: viewOf(frozenIceboundUiFixtureV7()).viewer.id,
          unitId: 1 as never,
          targetUnitId: 2 as never,
          fromPlayerId: unitAt(
            viewOf(frozenIceboundUiFixtureV7()),
            FROZEN_UI_V7.frozenShip,
          ).ownerId,
          at: FROZEN_UI_V7.frozenShip,
          hp: 9,
        },
      ],
    });
    const flag = steps.find(
      (step) => step.kind === "ICE_FOLK" && step.effect === "PRIZE_FLAG",
    );
    expect(flag).toMatchObject({ cells: [FROZEN_UI_V7.frozenShip] });
    if (flag?.kind !== "ICE_FOLK") throw new Error("no flag cue");
    expect(flag.fromColour).toMatch(/^#/);
    expect(flag.toColour).toMatch(/^#/);
    expect(flag.fromColour).not.toBe(flag.toColour);
  });

  it("draws every new cue at any progress, reduced motion included", () => {
    for (const effect of [
      "ICE_FREEZE",
      "ICE_MELT",
      "ICE_CRUSH",
      "PRIZE_FLAG",
    ] as const satisfies readonly IceFolkFeedbackEffectV7[])
      for (const progress of [0, 0.25, 0.6, 0.99, 1]) {
        const { context, calls } = recorder();
        drawIceFolkFeedbackV7(
          context,
          { offsetX: 0, offsetY: 0, zoom: 1 },
          {
            effect,
            cells: [
              { x: 2, y: 3 },
              { x: 2, y: 4 },
            ],
            from: { x: 2, y: 2 },
            fromColour: "#aa2222",
            toColour: "#2222aa",
            progress,
          },
        );
        // Balanced state, and something drawn at the reduced-motion frame.
        expect(calls.filter((call) => call[0] === "save").length).toBe(
          calls.filter((call) => call[0] === "restore").length,
        );
        if (progress === 0.6)
          expect(
            calls.some(
              (call) =>
                call[0] === "fillRect" ||
                call[0] === "stroke" ||
                call[0] === "fill",
            ),
            effect,
          ).toBe(true);
      }
  });
});

describe("frozen-sea marks on the canvas", () => {
  const cell = { x: 100, y: 200, width: 80, height: 80 };
  const ice = {
    depth: "DEEP",
    openWater: SEA_ICE_EDGE_EAST_V7,
    variant: 0,
    permanent: false,
    stage: 3,
    turnsLeft: 1,
  } as const;

  it("draws the cut sheet and its cracks", () => {
    const { context, named } = recorder();
    const tile = { id: "ice" } as unknown as CanvasImageSource;
    drawSeaIceCellV7(context, cell, { x: 3, y: 4 }, ice, tile, { zoom: 0.625 });
    expect(named("drawImage")).toEqual([["drawImage", tile, 100, 200, 80, 80]]);
    // Three cracks, each stroked twice (a pale edge, then the dark line).
    expect(named("stroke")).toHaveLength(6);
  });

  it("draws a code floe without a sheet, snow on permanent ice, no cracks", () => {
    const { context, named } = recorder();
    drawSeaIceCellV7(
      context,
      cell,
      { x: 3, y: 4 },
      { ...ice, permanent: true, stage: 0 },
      null,
      { zoom: 0.625 },
    );
    expect(named("drawImage")).toEqual([]);
    // The floe is held back from its open east side only.
    expect(named("fillRect")).toEqual([["fillRect", 100, 200, 76, 80]]);
    expect(named("ellipse")).toHaveLength(3);
    expect(named("stroke")).toHaveLength(1);
  });

  it("draws a slide's arrow along its tiles", () => {
    const { context, named } = recorder();
    drawSlideArrowV7(
      context,
      [
        { x: 0, y: 0 },
        { x: 0, y: 80 },
        { x: 0, y: 160 },
      ],
      1,
      { prominent: true },
    );
    // A casing and a colour stroke of one path with an arrowhead.
    expect(named("stroke")).toHaveLength(2);
    const lines = named("lineTo");
    expect(lines[0]).toEqual(["lineTo", 0, 80]);
    // The tip passes the last tile's centre, pointing down.
    expect(lines[1]?.[2]).toBeGreaterThan(160);
    // One point alone draws nothing.
    const none = recorder();
    drawSlideArrowV7(none.context, [{ x: 0, y: 0 }], 1);
    expect(none.calls).toEqual([]);
  });

  it("draws the pack ice and the crush pill of an icebound ship", () => {
    const overlay = { id: "icebound" } as unknown as CanvasImageSource;
    const withRaster = recorder();
    drawIceboundMarkerV7(
      withRaster.context,
      { crush: "−3 HP", lethal: false },
      100,
      100,
      1,
      { overlay },
    );
    const frame = ICEBOUND_MARKER_FRAME_V7.ice;
    expect(withRaster.named("drawImage")).toEqual([
      ["drawImage", overlay, 100 + frame.left, 100, frame.width, frame.height],
    ]);
    expect(withRaster.named("fillText")[0]?.[1]).toBe("−3");
    const coded = recorder();
    drawIceboundMarkerV7(
      coded.context,
      { crush: "Sinks", lethal: true },
      100,
      100,
      1,
    );
    expect(coded.named("drawImage")).toEqual([]);
    expect(coded.named("fillText")[0]?.[1]).toBe("Sinks");
    expect(coded.named("fill").length).toBeGreaterThanOrEqual(2);
  });

  it("the board draws ice cells, the slide and the icebound marker", () => {
    const art: IceFolkBoardArtV7 = {
      snowTile: () => null,
      caps: () => null,
      casing: () => null,
      seaIce: () => null,
    };
    const draw = (built: BoardRenderPlanV7) => {
      const { context, named } = recorder();
      drawBoardV7({
        context,
        viewport: { width: 1600, height: 1600 },
        devicePixelRatio: 1,
        camera: { offsetX: 100, offsetY: 100, zoom: 1 },
        plan: built,
        images: {
          resolve: (id) =>
            ({ id, width: 128, height: 128 }) as unknown as CanvasImageSource,
          resolveTerrainGround: (id) =>
            ({ id: `ground:${id}`, width: 128, height: 128 }) as never,
          resolveRaisedTerrain: (id) =>
            ({ id: `raised:${id}`, width: 256, height: 256 }) as never,
        },
        iceFolkArt: art,
      });
      return named;
    };
    // LEGACY: every ice cell is a code floe (one ellipse set per permanent
    // cell), and the icebound ship's pill is written.
    const icebound = viewOf(frozenIceboundUiFixtureV7());
    const named = draw(plan(icebound, null));
    expect(named("ellipse").length).toBeGreaterThanOrEqual(3);
    expect(named("fillText").some((call) => call[1] === "−3")).toBe(true);
    // The slide's arrow is drawn while the Yeti is selected.
    const slide = viewOf(frozenSlideUiFixtureV7());
    const yeti = unitAt(slide, FROZEN_UI_V7.bridgeHead);
    const resting = draw(plan(slide, null));
    const selected = draw(plan(slide, yeti.id));
    expect(selected("stroke").length).toBeGreaterThan(resting("stroke").length);
  });
});

describe("frozen-sea words", () => {
  it("has the Ice Folk Help list and one line for everyone else", () => {
    expect(ICE_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Freeze",
      "Slide",
      "Thaw",
      "No ships",
      "Black Ice",
      "Icebound",
      "Glacier",
    ]);
    for (const [, sentence] of [...ICE_HELP_RULES_V7, ICE_FOR_SHIPS_HELP_V7]) {
      expect(sentence.endsWith(".")).toBe(true);
      expect(sentence).not.toMatch(COORDINATE);
    }
    expect(ICE_SEA_DOG_GOAL_V7).toBe("Hold the ice with 3 units at once.");
  });

  it("describes Freeze on every Ice Folk land role", () => {
    expect(
      roleAbilityDescriptionV7("FREEZE", 1, 1, "ICE_FOLK", null, "FIGHTER"),
    ).toMatch(/^With Rime: it turns the water next to it to ice/);
  });

  it("shows ice on the Ice Folk Naval cards and no ship in their Gallery", () => {
    expect(technologySubjectV7("NAVAL_ENGINEERING", "ICE_FOLK")).toBe(
      "OVERLAY:ICEBOUND",
    );
    expect(technologySubjectV7("NAVAL_ENGINEERING", "ORIGINAL")).toBe(
      "UNIT:BATTLESHIP",
    );
    for (const row of [
      "PATROL_BOAT",
      "BATTLESHIP",
      "SUBMARINE",
      "TRANSPORT",
    ] as const) {
      expect(galleryUnitCellV7(row, "ICE_FOLK")).toEqual({
        kind: "EMPTY",
        row,
        faction: "ICE_FOLK",
        reason: "NO_SHIPS",
      });
      expect(galleryUnitCellV7(row, "ORIGINAL").kind).toBe("UNIT");
    }
    // An Egg of a faction that lays none is a plain empty cell.
    expect(galleryUnitCellV7("EGG", "ICE_FOLK")).toEqual({
      kind: "EMPTY",
      row: "EGG",
      faction: "ICE_FOLK",
    });
  });
});
