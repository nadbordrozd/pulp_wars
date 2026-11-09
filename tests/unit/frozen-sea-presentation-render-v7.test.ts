import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewColdSnapV7,
  previewColdWakeV7,
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
  moveOnIceLabelV7,
  moveOnIceV7,
  seaIceCellsV7,
} from "../../src/render/canvas/frozen-sea-board-plan-v7";
import {
  SEA_ICE_CRACKS_V7,
  drawSeaIceCellV7,
  drawSlideArrowV7,
  slideArrowWidthV7,
  seaIceCracksV7,
} from "../../src/render/canvas/frozen-sea-canvas-v7";
import {
  ICE_FOLK_EFFECT_DURATIONS_V7,
  drawIceFolkFeedbackV7,
  type IceFolkFeedbackEffectV7,
} from "../../src/render/canvas/ice-folk-effects-v7";
import type { IceFolkBoardArtV7 } from "../../src/render/canvas/ice-folk-canvas-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { TARGET_HIGHLIGHT_FAMILIES_V7 } from "../../src/render/canvas/target-highlight-v7";
import {
  ICE_COVER_PREVIEW_V7,
  ICE_FOR_SHIPS_HELP_V7,
  ICE_HELP_RULES_V7,
  ICE_SEA_DOG_GOAL_V7,
  SKATE_MOVE_LABEL_V7,
  SKATE_TRAIL_LABEL_V7,
  freezeRingLabelV7,
  frozenSeaBoundaryNoticeV7,
  frozenSeaCombatNotesV7,
  iceChipLabelV7,
  iceChipTooltipV7,
  iceCrackStageV7,
} from "../../src/render/frozen-sea-presentation-v7";
import { technologySubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import { galleryUnitCellV7 } from "../../src/render/gallery-presentation-v7";
import { frozenArenaV7, frozenShipsV7 } from "../fixtures/v7-frozen-sea";
import {
  FROZEN_UI_V7,
  frozenFreezeUiFixtureV7,
  frozenShipUiFixtureV7,
  frozenSlideUiFixtureV7,
} from "../fixtures/v7-frozen-sea-ui";
import { readyBoardArtV7 } from "../fixtures/v7-board-art";

// The frozen sea interface (bead pulp_wars-5ti.7, second part;
// docs/ui/BOARD_TARGETING.md section 3.5): the board plan, the words and
// the canvas marks of Freeze, the ice, and the slide (Icebound and the
// crush went with the Ice Folk freeze rework, `pulp_wars-s55m.1`).

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

// The one Freeze effect (`pulp_wars-xv0t`, 7r133): the line roles' `FREEZE`
// and its aiming are gone; the Witch's Cold Snap and a Walrus's Cold Wake
// freeze rings of tiles (water to ice, open land to Snow).
describe("Freeze on the board plan", () => {
  it("is no family of its own any more: nothing aims a Freeze", () => {
    expect(TARGET_HIGHLIGHT_FAMILIES_V7).not.toContain("FREEZE");
    const view = viewOf(frozenFreezeUiFixtureV7());
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => (command.kind as string) === "FREEZE",
      ),
    ).toBe(false);
  });

  it("unarmed, a line role shows no Freeze target", () => {
    const view = viewOf(frozenFreezeUiFixtureV7());
    const yeti = unitAt(view, FROZEN_UI_V7.yeti);
    const built = plan(view, yeti.id);
    expect(
      built.targets.some((target) => (target.family as string) === "FREEZE"),
    ).toBe(false);
    expect(
      built.entries.some((entry) =>
        entry.key.startsWith("ability-area:FREEZE"),
      ),
    ).toBe(false);
  });

  it("the Witch's Cold Snap ring is marked quietly, and prominently while its button is focused", () => {
    const view = viewOf(frozenFreezeUiFixtureV7());
    const witch = unitAt(view, FROZEN_UI_V7.witch);
    // The Ice Folk freeze rework (`pulp_wars-s55m.1`): her Cold Snap
    // freezes every tile around her.
    const command = queryPlayerCommandsV7(view).find(
      (candidate): candidate is Extract<CommandV7, { kind: "COLD_SNAP" }> =>
        candidate.kind === "COLD_SNAP" && candidate.unitId === witch.id,
    );
    if (command === undefined) throw new Error("no Cold Snap for the Witch");
    const preview = previewColdSnapV7(view, witch.id);
    if (preview === null) throw new Error("preview missing");
    const ring = (built: BoardRenderPlanV7) =>
      built.entries.filter((entry) =>
        entry.key.startsWith("ability-area:FREEZE:"),
      );
    const quiet = plan(view, witch.id);
    // The one Freeze effect (`pulp_wars-xv0t`): the water she ices and the
    // open land she snows.
    expect(
      ring(quiet)
        .map((entry) => at(entry.at))
        .sort(),
    ).toEqual([...preview.tiles, ...preview.snow].map(at).sort());
    expect(preview.snow.length).toBeGreaterThan(0);
    expect(new Set(ring(quiet).map((entry) => entry.abilityStyle))).toEqual(
      new Set(["FREEZE"]),
    );
    // The ring is never a target: her tiles are not picked.
    expect(
      quiet.targets.some((target) => (target.family as string) === "FREEZE"),
    ).toBe(false);
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
    expect(label?.label).toBe(
      freezeRingLabelV7(preview.tiles.length, preview.snow.length),
    );
    // A line role has no ring.
    expect(ring(plan(view, unitAt(view, FROZEN_UI_V7.yeti).id))).toEqual([]);
  });

  it("tints the ring a Frost Giant's Move would freeze while its destination is hovered", () => {
    // The one Freeze effect (`pulp_wars-xv0t`): the Frost Giant alone has
    // a Cold Wake (the Walrus keeps its Frostbite).
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "JUGGERNAUT", at: { x: 8, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 0 } },
      ],
    });
    const view = viewOf(state);
    const giant = unitAt(view, { x: 8, y: 1 });
    const enemy = unitAt(view, { x: 8, y: 0 });
    const to = { x: 7, y: 2 };
    const preview = previewColdWakeV7(view, giant.id, to);
    if (preview === null) throw new Error("no Cold Wake preview");
    const built = plan(view, giant.id, { cursor: to });
    const target = built.targets.find(
      (candidate) => candidate.family === "MOVE" && at(candidate.at) === at(to),
    );
    // The ring (its ice and its Snow) and the units it Freezes, a preview
    // and never a chooser: the tile stays one Move.
    expect(target?.coldWake?.ring.map(at).sort()).toEqual(
      [...preview.tiles, ...preview.snow].map(at).sort(),
    );
    expect(target?.coldWake?.units.map(at)).toEqual(
      preview.targets.length === 0 ? [] : [at(enemy.at)],
    );
    expect(target?.semanticLabel).toContain("Cold Wake");
    expect(target?.semanticLabel).not.toMatch(COORDINATE);
    // A Yeti's or a Walrus's Move has no wake.
    for (const role of ["FIGHTER", "GUARD"] as const) {
      const other = frozenArenaV7({
        units: [{ seat: 0, role, at: { x: 8, y: 1 } }],
      });
      const otherView = viewOf(other);
      expect(
        plan(otherView, unitAt(otherView, { x: 8, y: 1 }).id).targets.some(
          (candidate) => candidate.coldWake !== undefined,
        ),
        role,
      ).toBe(false);
    }
  });
});

describe("ice on the board plan", () => {
  it("gives each ice cell its depth, its open-water sides and its stage", () => {
    const view = viewOf(frozenShipUiFixtureV7());
    const cells = seaIceCellsV7(view);
    expect(cells.size).toBe(view.ice.length);
    // Three tiles in a row (the frozen sea redesign): sound, sound, and
    // cracked thick ice.
    const [first, second, third] = FROZEN_UI_V7.melting.map((coord) =>
      cells.get(at(coord)),
    );
    expect([first?.stage, second?.stage, third?.stage]).toEqual([0, 0, 2]);
    expect(first?.depth).toBe("DEEP");
    // The row is ice east of the first tile and west of the third.
    expect((first?.openWater ?? 0) & SEA_ICE_EDGE_EAST_V7).toBe(0);
    expect((first?.openWater ?? 0) & SEA_ICE_EDGE_WEST_V7).not.toBe(0);
    expect((third?.openWater ?? 0) & SEA_ICE_EDGE_WEST_V7).toBe(0);
    // Thick ice (Glacier) by the capital: snow, no cracks.
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

  it("maps a crack to the crack stage (the redesign: no melting stages)", () => {
    expect(iceCrackStageV7({ cracked: false })).toBe(0);
    expect(iceCrackStageV7({ cracked: true })).toBe(2);
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

  it("labels the tile's ice with its thickness, without coordinates or turns", () => {
    const view = viewOf(frozenShipUiFixtureV7());
    const melting = view.ice.find(
      (entry) => at(entry.at) === at(FROZEN_UI_V7.melting[2]),
    );
    const permanent = view.ice.find(
      (entry) => at(entry.at) === at(FROZEN_UI_V7.permanent),
    );
    if (melting === undefined || permanent === undefined)
      throw new Error("ice missing");
    expect(iceChipLabelV7(melting)).toBe("Ice · cracked");
    expect(iceChipLabelV7(permanent)).toBe("Ice · thick");
    expect(iceChipTooltipV7(view, melting)).toContain(
      "Cracked: one more Crack breaks it.",
    );
    expect(iceChipTooltipV7(view, permanent)).toContain(
      "Thick: two Cracks break it.",
    );
    for (const entry of view.ice)
      expect(iceChipTooltipV7(view, entry)).not.toMatch(/turn|melt/i);
    // The viewer has Black Ice (every technology): its own ice says so.
    expect(iceChipTooltipV7(view, melting)).toContain("Black Ice:");
    // Another seat's ice does not (its research is private).
    const victim = viewOf(frozenShipUiFixtureV7({ victim: true }));
    const theirs = victim.ice[0];
    if (theirs === undefined) throw new Error("ice missing");
    expect(iceChipTooltipV7(victim, theirs)).not.toContain("Black Ice");
    // Only the Ice Folk walk on ice (`pulp_wars-y242`, 7r132).
    expect(iceChipTooltipV7(victim, theirs)).toContain(
      "only Ice Folk units and units that fly or stride go onto it; other units crack it.",
    );
    for (const entry of view.ice)
      expect(iceChipTooltipV7(view, entry)).not.toMatch(COORDINATE);
  });
});

describe("moving on ice", () => {
  it("a skater's Move carries its trail over the ice it crosses (Ice Folk movement, `pulp_wars-s55m.2`)", () => {
    const view = viewOf(frozenSlideUiFixtureV7());
    const yeti = unitAt(view, FROZEN_UI_V7.bridgeHead);
    const built = plan(view, yeti.id);
    // A Yeti (Move 1) skates two bridge tiles, half a Move each, and may
    // stop on either.
    const [first, second] = FROZEN_UI_V7.bridge as readonly {
      x: number;
      y: number;
    }[];
    if (first === undefined || second === undefined)
      throw new Error("bridge missing");
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.map((target) => at(target.at))).toEqual([
      at(first),
      at(second),
    ]);
    const skated = onIce.find((target) => at(target.at) === at(second));
    expect(skated?.slide).toEqual([
      { from: FROZEN_UI_V7.bridgeHead, tiles: [first, second] },
    ]);
    // The skate reach (past the Yeti's Move) names the skate once.
    expect(skated?.skate).toBe(true);
    expect(skated?.semanticLabel).toBe(SKATE_MOVE_LABEL_V7);
    // A trail alone is named as such; a one-tile step carries none.
    expect(
      moveOnIceLabelV7(
        moveOnIceV7(view, {
          kind: "MOVE",
          unitId: yeti.id,
          path: [first, second],
        }),
      ),
    ).toBe(SKATE_TRAIL_LABEL_V7);
    expect(onIce[0]?.slide).toBeUndefined();
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

  // The Snow Golem and the Mammoth (`pulp_wars-3qtp`, 7r134): with Move 1
  // the Snow Golem skates two ice tiles, too short a path for a trail.
  it("the Snow Golem skates the ice too (every Ice Folk ground unit)", () => {
    const view = viewOf(frozenSlideUiFixtureV7());
    const golem = unitAt(view, { x: 0, y: 2 });
    const built = plan(view, golem.id);
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.length).toBeGreaterThan(1);
  });

  it("another faction's ground unit is offered no Move onto the ice (pulp_wars-y242; it slipped onto it before)", () => {
    const view = viewOf(frozenSlideUiFixtureV7({ slipper: true }));
    const fighter = unitAt(view, FROZEN_UI_V7.bridgeHead);
    const built = plan(view, fighter.id);
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce).toEqual([]);
  });
});

describe("a Frozen ship (the Ice Folk freeze rework, `pulp_wars-s55m.1`)", () => {
  it("wears the Frozen casing like a land unit, for both sides, and its owner may not sail or shoot", () => {
    for (const victim of [false, true]) {
      const view = viewOf(frozenShipUiFixtureV7({ victim }));
      const ship = unitAt(view, FROZEN_UI_V7.frozenShip);
      expect(
        view.unitStats.find((entry) => entry.unitId === ship.id)?.frozen,
      ).toEqual({ turnsLeft: 1 });
      const entry = plan(view, null).entries.find(
        (candidate) => candidate.key === `unit:${ship.id}`,
      );
      expect(entry?.iceFolk?.frozen).toEqual({ turnsLeft: 1 });
      if (victim)
        expect(
          queryPlayerCommandsV7(view).filter(
            (command) =>
              (command.kind === "MOVE" || command.kind === "ATTACK") &&
              command.unitId === ship.id,
          ),
        ).toEqual([]);
    }
  });

  it("adds the frozen-sea notes to an attack preview: a Frozen ship does not strike back", () => {
    // An Ice Folk Yeti on its own ice attacks the Frozen Battleship beside it.
    const state = frozenShipsV7(
      frozenArenaV7({
        units: [
          { seat: 0, role: "FIGHTER", at: { x: 7, y: 4 } },
          { seat: 1, role: "BATTLESHIP", at: FROZEN_UI_V7.frozenShip },
        ],
      }),
      [FROZEN_UI_V7.frozenShip],
    );
    const view = viewOf(state);
    const yeti = unitAt(view, { x: 7, y: 4 });
    const ship = unitAt(view, FROZEN_UI_V7.frozenShip);
    const preview = queryCombatPreviewV7(view, yeti.id, ship.id);
    if (preview === null) throw new Error("preview missing");
    expect(preview).toMatchObject({
      retaliation: false,
      noRetaliationReason: "FROZEN",
      damageToAttacker: 0,
    });
    expect(frozenSeaCombatNotesV7(preview)).toEqual([]);
    // The enemy's view of a Yeti on its own ice with Glacier: cover.
    const enemy = viewForV7(state, ship.ownerId);
    expect(
      enemy.unitStats.find((entry) => entry.unitId === yeti.id)?.iceFolk
        ?.iceCover,
    ).toBe(true);
    expect(frozenSeaCombatNotesV7({ ...preview, iceCover: true })).toEqual([
      ICE_COVER_PREVIEW_V7,
    ]);
  });
});

describe("frozen-sea cues and notices", () => {
  it("a Cold Snap spreads frost and is announced without coordinates", () => {
    const state = frozenFreezeUiFixtureV7();
    const before = viewOf(state);
    const witch = unitAt(before, FROZEN_UI_V7.witch);
    const preview = previewColdSnapV7(before, witch.id);
    if (preview === null) throw new Error("preview missing");
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "COLD_SNAP",
      unitId: witch.id,
    });
    if (!result.accepted) throw new Error("Cold Snap rejected");
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
      cells: [...preview.tiles, ...preview.snow],
      from: FROZEN_UI_V7.witch,
      durationMs: ICE_FOLK_EFFECT_DURATIONS_V7.ICE_FREEZE,
    });
    const notice = frozenSeaBoundaryNoticeV7(envelope.events, before, after);
    const count = preview.tiles.length + preview.snow.length;
    expect(notice?.text).toBe(`You froze ${count} tiles`);
    expect(notice?.text).not.toMatch(COORDINATE);
    expect(frozenSeaBoundaryNoticeV7([], before, after)).toBeNull();
  });

  it("a boarding raises the captor's flag", () => {
    const steps = corePresentationPlanV7(viewOf(frozenShipUiFixtureV7()), {
      ...projectEventsV7(
        frozenShipUiFixtureV7(),
        frozenShipUiFixtureV7(),
        viewOf(frozenShipUiFixtureV7()).viewer.id,
        [],
      ),
      events: [
        {
          kind: "SHIP_BOARDED",
          playerId: viewOf(frozenShipUiFixtureV7()).viewer.id,
          unitId: 1 as never,
          targetUnitId: 2 as never,
          fromPlayerId: unitAt(
            viewOf(frozenShipUiFixtureV7()),
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

  it("keeps the slide arrow readable at the desktop's zoom steps", () => {
    // `pulp_wars-5ti.10`: the camera zoom of the chibi zoom steps 0.75 and 1
    // (60 and 80 px tiles). The first arrow was a 4 to 7 px casing there.
    for (const zoom of [0.46875, 0.625]) {
      expect(slideArrowWidthV7(zoom, false)).toBeGreaterThanOrEqual(8);
      expect(slideArrowWidthV7(zoom, true)).toBeGreaterThanOrEqual(10);
      expect(slideArrowWidthV7(zoom, true)).toBeGreaterThan(
        slideArrowWidthV7(zoom, false),
      );
      const { context } = recorder();
      drawSlideArrowV7(
        context,
        [
          { x: 0, y: 0 },
          { x: 0, y: 128 * zoom },
          { x: 0, y: 256 * zoom },
        ],
        zoom,
      );
      // The pale core, stroked last, is more than half the casing: at
      // least 4 px.
      expect(context.lineWidth).toBeCloseTo(
        slideArrowWidthV7(zoom, false) * 0.55,
        6,
      );
      expect(context.lineWidth).toBeGreaterThanOrEqual(4);
    }
    // Above the floor it scales with the camera, as before.
    expect(slideArrowWidthV7(2, true)).toBe(30);
  });

  it("the board draws ice cells and the slide", () => {
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
        chibiArt: readyBoardArtV7(),
        iceFolkArt: art,
      });
      return named;
    };
    // LEGACY: every ice cell is a code floe (one ellipse set per permanent
    // cell).
    const iced = viewOf(frozenShipUiFixtureV7());
    const named = draw(plan(iced, null));
    expect(named("ellipse").length).toBeGreaterThanOrEqual(3);
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
      // Ice Folk movement (`pulp_wars-s55m.2`; "Slide" before).
      "Skate",
      "Runners",
      "Dive",
      // Fishing Hole links (`pulp_wars-vg5l`, 7r127).
      "Hole links",
      // Only the Ice Folk walk on ice (`pulp_wars-y242`, 7r132).
      "Who walks on ice",
      // The frozen sea redesign (bead pulp_wars-5ti.27): the ice stays,
      // other factions crack it, the Ice Folk build on it.
      "Ice stays",
      // The border freeze (`pulp_wars-5ti.31`).
      "Border ice",
      "Crack Ice",
      "Build",
      "No ships",
      "Black Ice",
      // (Hoarfrost's longer Freeze line went with `FREEZE`, `pulp_wars-xv0t`.)
      "Glacier",
    ]);
    for (const [, sentence] of [...ICE_HELP_RULES_V7, ICE_FOR_SHIPS_HELP_V7]) {
      expect(sentence.endsWith(".")).toBe(true);
      expect(sentence).not.toMatch(COORDINATE);
    }
    expect(ICE_SEA_DOG_GOAL_V7).toBe("Hold the ice with 5 units at once.");
  });

  it("describes no Freeze on any role (the ability is gone)", () => {
    expect(ICE_HELP_RULES_V7[0]).toEqual([
      "Freeze",
      "Freezing a tile turns water to ice and open land to Snow; an enemy on it is Frozen for a turn.",
    ]);
  });

  it("shows ice on the Ice Folk Naval cards and no ship in their Gallery", () => {
    // Its own icon since `pulp_wars-5ti.10` (the pack-ice overlay before).
    expect(technologySubjectV7("NAVAL_ENGINEERING", "ICE_FOLK")).toBe(
      "ICON:TECH:ICE_FOLK:NAVAL_ENGINEERING",
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
