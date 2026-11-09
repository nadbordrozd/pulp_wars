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
import { seaIceCellsV7 } from "../../src/render/canvas/frozen-sea-board-plan-v7";
import { drawSeaIceCellV7 } from "../../src/render/canvas/frozen-sea-canvas-v7";
import {
  ICE_FOLK_EFFECT_DURATIONS_V7,
  drawIceFolkFeedbackV7,
  type IceFolkFeedbackEffectV7,
} from "../../src/render/canvas/ice-folk-effects-v7";
import type { IceFolkBoardArtV7 } from "../../src/render/canvas/ice-folk-canvas-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { TARGET_HIGHLIGHT_FAMILIES_V7 } from "../../src/render/canvas/target-highlight-v7";
import {
  HARPOON_PREVIEW_V7,
  ICE_FOR_SHIPS_HELP_V7,
  ICE_HELP_RULES_V7,
  ICE_SEA_DOG_GOAL_V7,
  freezeRingLabelV7,
  frozenSeaBoundaryNoticeV7,
  frozenSeaCombatNotesV7,
  iceChipLabelV7,
  iceChipTooltipV7,
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
// the canvas marks of Freeze and the ice (the slide went with `pulp_wars-ecnj`,
// 7r135: a Move on ice is plain movement; Icebound and the
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
  it("gives each ice cell its depth and its open-water sides", () => {
    const view = viewOf(frozenShipUiFixtureV7());
    const cells = seaIceCellsV7(view);
    expect(cells.size).toBe(view.ice.length);
    // Three tiles in a row. (Their crack stages and thick ice's snow went
    // with Glacier: the naval branch rebuilt, `pulp_wars-tzk6`, 7r137.)
    const [first, , third] = FROZEN_UI_V7.melting.map((coord) =>
      cells.get(at(coord)),
    );
    expect(first).not.toHaveProperty("stage");
    expect(first).not.toHaveProperty("permanent");
    expect(first?.depth).toBe("DEEP");
    // The row is ice east of the first tile and west of the third.
    expect((first?.openWater ?? 0) & SEA_ICE_EDGE_EAST_V7).toBe(0);
    expect((first?.openWater ?? 0) & SEA_ICE_EDGE_WEST_V7).not.toBe(0);
    expect((third?.openWater ?? 0) & SEA_ICE_EDGE_WEST_V7).toBe(0);
    // The ice by the capital.
    const permanent = cells.get(at(FROZEN_UI_V7.permanent));
    expect(permanent).toMatchObject({ depth: "SHALLOW" });
    // The plan carries the cells on their TERRAIN entries, and no Snow
    // stand-in on water any more.
    const built = plan(view, null);
    const iced = built.entries.filter((entry) => entry.seaIce !== undefined);
    expect(iced.map((entry) => entry.kind)).toEqual(iced.map(() => "TERRAIN"));
    expect(iced).toHaveLength(view.ice.length);
    for (const entry of iced) expect(entry.snow).toBeUndefined();
  });

  it("labels the tile's ice plainly, without coordinates, turns or a thickness", () => {
    // The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): every ice tile
    // reads the same (no thick ice), so the chip takes no entry.
    const view = viewOf(frozenShipUiFixtureV7());
    expect(view.ice.length).toBeGreaterThan(0);
    expect(iceChipLabelV7()).toBe("Ice");
    expect(iceChipTooltipV7()).not.toMatch(/turn|melt|thick|Black Ice/i);
    // Only the Ice Folk walk on ice (`pulp_wars-y242`, 7r132).
    expect(iceChipTooltipV7()).toContain(
      "only Ice Folk units and units that fly or stride go onto it; other units crack it.",
    );
    expect(iceChipTooltipV7()).not.toMatch(COORDINATE);
  });
});

describe("moving on ice (skating is plain movement, `pulp_wars-ecnj`, 7r135)", () => {
  it("a Yeti's Move onto the ice is a plain Move mark: no trail, no skate tile, no label", () => {
    const view = viewOf(frozenSlideUiFixtureV7());
    const yeti = unitAt(view, FROZEN_UI_V7.bridgeHead);
    const built = plan(view, yeti.id);
    // A Yeti (Move 1) on the bare shore: the step onto the ice is a full
    // one, so it reaches the first bridge tile only (two, skating, before).
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.map((target) => at(target.at))).toEqual([
      at(FROZEN_UI_V7.bridge[0] as CoordV7),
    ]);
    for (const target of built.targets.filter(
      (candidate) => candidate.family === "MOVE",
    )) {
      for (const gone of ["slide", "skate", "glide"])
        expect(target).not.toHaveProperty(gone);
      expect(target.semanticLabel ?? "").not.toMatch(/skate|slide|glide/i);
    }
  });

  it("a Sled Glides two bridge tiles past the first and stops short of the far shore", () => {
    const view = viewOf(frozenSlideUiFixtureV7({ sled: true }));
    const sled = unitAt(view, FROZEN_UI_V7.bridgeHead);
    const built = plan(view, sled.id);
    const reached = built.targets
      .filter((target) => target.family === "MOVE")
      .map((target) => at(target.at));
    // A full point onto the ice, then half a point a tile: three tiles of
    // the bridge (Runners slid it to the far shore before).
    for (const tile of FROZEN_UI_V7.bridge.slice(0, 3))
      expect(reached).toContain(at(tile));
    for (const tile of [...FROZEN_UI_V7.bridge.slice(3), FROZEN_UI_V7.farShore])
      expect(reached).not.toContain(at(tile));
  });

  // The Snow Golem and the Mammoth (`pulp_wars-3qtp`, 7r134): the Snow
  // Golem has Move 1; from the bare shore it reaches one ice tile.
  it("the Snow Golem walks onto the ice too (every Ice Folk ground unit)", () => {
    const view = viewOf(frozenSlideUiFixtureV7());
    const golem = unitAt(view, { x: 0, y: 2 });
    const built = plan(view, golem.id);
    const onIce = built.targets.filter(
      (target) =>
        target.family === "MOVE" &&
        FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce).toHaveLength(1);
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
    // The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): the Yeti's seat
    // has every Naval technology, Harpoons among them: its preview row.
    expect(preview.harpoon).toBe(true);
    expect(frozenSeaCombatNotesV7(preview)).toEqual([HARPOON_PREVIEW_V7]);
    expect(HARPOON_PREVIEW_V7).toBe("Harpoon +1");
    expect(frozenSeaCombatNotesV7({ ...preview, harpoon: false })).toEqual([]);
    // The enemy's view of a Yeti on its own ice: no cover (Glacier's went).
    const enemy = viewForV7(state, ship.ownerId);
    expect(
      enemy.unitStats.find((entry) => entry.unitId === yeti.id)?.iceFolk,
    ).not.toHaveProperty("iceCover");
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
  } as const;

  it("draws the cut sheet, and no cracks (Glacier's cracked ice went with 7r137)", () => {
    const { context, named } = recorder();
    const tile = { id: "ice" } as unknown as CanvasImageSource;
    drawSeaIceCellV7(context, cell, { x: 3, y: 4 }, ice, tile, { zoom: 0.625 });
    expect(named("drawImage")).toEqual([["drawImage", tile, 100, 200, 80, 80]]);
    expect(named("stroke")).toHaveLength(0);
  });

  it("draws a code floe without a sheet, with no snow and no cracks", () => {
    const { context, named } = recorder();
    drawSeaIceCellV7(context, cell, { x: 3, y: 4 }, ice, null, {
      zoom: 0.625,
    });
    expect(named("drawImage")).toEqual([]);
    // The floe is held back from its open east side only.
    expect(named("fillRect")).toEqual([["fillRect", 100, 200, 76, 80]]);
    expect(named("ellipse")).toHaveLength(0);
    expect(named("stroke")).toHaveLength(1);
  });

  it("the board draws ice cells, and a Move onto the ice as any Move (no arrow)", () => {
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
    // LEGACY: every ice cell is a code floe (a fill each).
    const iced = viewOf(frozenShipUiFixtureV7());
    const named = draw(plan(iced, null));
    expect(named("fillRect").length).toBeGreaterThanOrEqual(iced.ice.length);
    // Skating is plain movement (`pulp_wars-ecnj`, 7r135: the slide's
    // arrow is gone). With the Sled selected, the Move mark on the ice
    // costs the canvas exactly what a Move mark on land costs: leaving
    // either out of the plan removes the same draw calls.
    const bridge = viewOf(frozenSlideUiFixtureV7({ sled: true }));
    const sled = unitAt(bridge, FROZEN_UI_V7.bridgeHead);
    const selected = plan(bridge, sled.id);
    const onBridge = (target: { readonly at: CoordV7 }) =>
      FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at));
    const iceMove = selected.targets.find(
      (target) =>
        target.family === "MOVE" &&
        at(target.at) === at(FROZEN_UI_V7.bridge[2] as CoordV7),
    );
    const landMove = selected.targets.find(
      (target) => target.family === "MOVE" && !onBridge(target),
    );
    if (iceMove === undefined || landMove === undefined)
      throw new Error("no Move on the ice or on land");
    const without = (left: unknown) =>
      draw({
        ...selected,
        targets: selected.targets.filter((target) => target !== left),
      });
    const whole = draw(selected);
    for (const call of ["stroke", "lineTo", "moveTo", "fill"])
      expect(whole(call).length - without(iceMove)(call).length, call).toBe(
        whole(call).length - without(landMove)(call).length,
      );
  });
});

describe("frozen-sea words", () => {
  it("has the Ice Folk Help list and one line for everyone else", () => {
    expect(ICE_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Freeze",
      // Skating is plain movement (`pulp_wars-ecnj`, 7r135: one Glide line;
      // "Skate" and "Runners" before, "Slide" before them).
      "Glide",
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
      // The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): the swimming
      // Walrus, Harpoons, the Ice Fortress and Under the Ice (Black Ice and
      // Glacier before; Hoarfrost's line went with `FREEZE`).
      "Swim",
      "Harpoons",
      "Ice Fortress",
      "Under the Ice",
    ]);
    for (const [, sentence] of [...ICE_HELP_RULES_V7, ICE_FOR_SHIPS_HELP_V7]) {
      expect(sentence.endsWith(".")).toBe(true);
      expect(sentence).not.toMatch(COORDINATE);
    }
    // The rebuilt branch's lines carry at most one number each.
    for (const [, sentence] of ICE_HELP_RULES_V7.slice(-4))
      expect((sentence.match(/\d+/g) ?? []).length).toBeLessThanOrEqual(1);
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
