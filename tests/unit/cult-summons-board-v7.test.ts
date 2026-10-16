import { describe, expect, it } from "vitest";
import {
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  type BoardRenderInteractionV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  cultUnitMarkersV7,
  summonPickV7,
} from "../../src/render/canvas/cult-channel-board-plan-v7";
import {
  drawCultBroodLinkV7,
  drawCultControlPipsV7,
} from "../../src/render/canvas/cult-channel-canvas-v7";
import {
  TILE_ABILITIES_V7,
  tileAbilitySummonV7,
  tileActionPlanForSelectionV7,
} from "../../src/render/canvas/tile-actions-v7";
import { abilityAreaStrokeV7 } from "../../src/render/canvas/undead-canvas-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import {
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  DRAGGED_LABEL_V7,
  DRAGGED_MOVE_V7,
  SUMMON_MASS_NEEDS_TECH_V7,
  SUMMON_NO_HELPER_V7,
  SWARMED_PREVIEW_V7,
  SWARMED_SEMANTIC_V7,
  cultChannelChipsV7,
  summonChoicesV7,
  swarmCombatNotesV7,
  unitDraggedV7,
} from "../../src/render/cult-channel-presentation-v7";
import {
  RAMPAGE_STEP_REASONS_V7,
  monsterInfoLinesV7,
  neutralArtSubjectsV7,
} from "../../src/render/curiosity-presentation-v7";
import {
  statusGlossaryV7,
  summonedGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import { cultFieldV7, withFavourV7 } from "../fixtures/v7-cult";
import {
  CULT_SUMMONS_RIVAL_UI_V7,
  CULT_SUMMONS_UI_V7,
  cultSummonsLockedUiFixtureV7,
  cultSummonsRivalUiFixtureV7,
  cultSummonsUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cult redesign's U-R3 (bead `pulp_wars-mch9.44`;
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 7.1, 7.3, 7.4, 9.2 and
 * 13): the summon chooser and each summon's badge on its tiles, the Brood's
 * links, the Doorstep's house pip, the Mass's ooze ring and "Dragged",
 * Swarm's line, the Unbound looks and the Unbound order's reason. Hand-built
 * states only: no match is played.
 */

const A = CULT_SUMMONS_UI_V7;
const R = CULT_SUMMONS_RIVAL_UI_V7;

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const viewOf = (state: GameStateV7, seat = 0): PlayerViewV7 =>
  viewForV7(state, seatIdV7(state, seat));

function planOf(
  view: PlayerViewV7,
  interaction: Partial<BoardRenderInteractionV7> = {},
) {
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: null,
    selectedUnitId: null,
    selectedAchievement: null,
    ...interaction,
  });
}

function selected(state: GameStateV7, where: CoordV7, seat = 0) {
  const unitId = idAt(state, where);
  return planOf(viewOf(state, seat), {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
  });
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** A canvas context that records the calls it gets. */
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

describe("the summon chooser", () => {
  it("lists the Imp, the Horror and the Mass with their prices and helpers, from the offered commands", () => {
    const state = cultSummonsUiFixtureV7();
    const view = viewOf(state);
    const summoner = view.units.find(
      (unit) => unit.id === idAt(state, A.summoner),
    );
    if (summoner === undefined) throw new Error("no Summoner");
    const commands = queryPlayerCommandsV7(view);
    const choices = summonChoicesV7(view, summoner, commands);
    expect(
      choices.map((choice) => [
        choice.daemon,
        choice.label,
        choice.favour,
        choice.helper,
        choice.reason,
        choice.icon,
      ]),
    ).toEqual([
      ["IMP", "Imp", 2, false, null, "ICON:ACTION:SUMMON_IMP"],
      ["HORROR", "Horror", 4, true, null, "ICON:ACTION:SUMMON_HORROR"],
      ["MASS", "Mass", 5, true, null, "ICON:ACTION:SUMMON_MASS"],
    ]);
    for (const choice of choices)
      expect(choice.offered, choice.daemon).toBe(
        commands.filter(
          (command) =>
            command.kind === "SUMMON" &&
            command.unitId === summoner.id &&
            command.daemon === choice.daemon,
        ).length,
      );
    // Another unit, or another seat's Summoner, has no chooser.
    const helper = view.units.find((unit) => unit.id === idAt(state, A.helper));
    if (helper === undefined) throw new Error("no helper");
    expect(summonChoicesV7(view, helper, commands)).toEqual([]);
    const rival = viewOf(state, 1);
    const theirs = rival.units.find((unit) => unit.id === summoner.id);
    if (theirs === undefined) throw new Error("no Summoner in sight");
    expect(
      summonChoicesV7(rival, theirs, queryPlayerCommandsV7(rival)),
    ).toEqual([]);
  });

  it("shows the Mass's technology lock, the helper it needs and the Favour short", () => {
    const locked = cultSummonsLockedUiFixtureV7();
    const view = viewOf(locked);
    const summoner = view.units.find(
      (unit) => unit.id === idAt(locked, A.summoner),
    );
    if (summoner === undefined) throw new Error("no Summoner");
    const reasons = (scene: PlayerViewV7, unitId: UnitId) => {
      const unit = scene.units.find((candidate) => candidate.id === unitId);
      if (unit === undefined) throw new Error("no unit");
      return summonChoicesV7(scene, unit, queryPlayerCommandsV7(scene)).map(
        (choice) => [choice.daemon, choice.reason],
      );
    };
    expect(SUMMON_MASS_NEEDS_TECH_V7).toBe("Needs Gibbering Masses");
    expect(reasons(view, summoner.id)).toEqual([
      ["IMP", null],
      ["HORROR", null],
      ["MASS", SUMMON_MASS_NEEDS_TECH_V7],
    ]);
    // A Summoner alone: the Imp, and the helper the other two need.
    const lone = withFavourV7(
      cultFieldV7([{ seat: 0, role: "CAPTAIN", at: at(5, 2) }]),
      0,
      9,
    );
    expect(reasons(viewOf(lone), idAt(lone, at(5, 2)))).toEqual([
      ["IMP", null],
      ["HORROR", SUMMON_NO_HELPER_V7],
      ["MASS", SUMMON_NO_HELPER_V7],
    ]);
    // 3 Favour: the Imp only.
    const poor = withFavourV7(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
      ]),
      0,
      3,
    );
    expect(reasons(viewOf(poor), idAt(poor, at(5, 2)))).toEqual([
      ["IMP", null],
      ["HORROR", "Needs 4 Favour"],
      ["MASS", "Needs 5 Favour"],
    ]);
  });

  it("badges each summon's own tiles with its own icon and price, and opens the chooser where several stand", () => {
    const state = cultSummonsUiFixtureV7();
    const view = viewOf(state);
    const commands = queryPlayerCommandsV7(view);
    const summoner = idAt(state, A.summoner);
    const plan = tileActionPlanForSelectionV7(view, commands, summoner);
    if (plan === null) throw new Error("no tile actions");
    for (const daemon of ["IMP", "HORROR", "MASS"] as const) {
      const id = `SUMMON_${daemon}`;
      expect(tileAbilitySummonV7(id)).toBe(daemon);
      const tiles = plan.tiles.filter((tile) =>
        tile.actions.some((action) => action.id === id),
      );
      const offered = commands.flatMap((command) =>
        command.kind === "SUMMON" &&
        command.unitId === summoner &&
        command.daemon === daemon
          ? [command.at]
          : [],
      );
      expect(
        tiles.map((tile) => tile.at),
        daemon,
      ).toEqual(
        [...offered].sort(
          (left, right) => left.y - right.y || left.x - right.x,
        ),
      );
      for (const tile of tiles) {
        const action = tile.actions.find((entry) => entry.id === id);
        expect(action?.raster).toBe(`ICON:ACTION:SUMMON_${daemon}`);
        expect(action?.favour).toBe(
          daemon === "IMP" ? 2 : daemon === "HORROR" ? 4 : 5,
        );
        expect(action?.label).toBe(
          daemon === "IMP"
            ? "Summon Imp"
            : daemon === "HORROR"
              ? "Summon Horror"
              : "Summon Mass",
        );
        // The Summoner's Move and the other summons share every tile.
        expect(tile.chooser).toBe(true);
        expect(action?.semanticLabel).not.toMatch(/\d+,\s*\d+/);
      }
    }
    // Every summon arms its own pick: one helper seats at once; the Imp
    // has none.
    for (const daemon of ["IMP", "HORROR", "MASS"] as const) {
      const ability = TILE_ABILITIES_V7.find(
        (entry) => entry.id === `SUMMON_${daemon}`,
      );
      expect(ability?.pick(summoner, view, commands)).toEqual({
        cultPick: summonPickV7(commands, summoner, daemon),
      });
      expect(summonPickV7(commands, summoner, daemon).helperUnitId).toBe(
        daemon === "IMP" ? null : idAt(state, A.helper),
      );
    }
    // Before Metallurgy no tile carries the Mass.
    const locked = cultSummonsLockedUiFixtureV7();
    const lockedView = viewOf(locked);
    expect(
      tileActionPlanForSelectionV7(
        lockedView,
        queryPlayerCommandsV7(lockedView),
        idAt(locked, A.summoner),
      )?.tiles.some((tile) =>
        tile.actions.some((action) => action.id === "SUMMON_MASS"),
      ),
    ).toBe(false);
  });
});

describe("the live look's rasters of the summons' badges", () => {
  it("resolves each summon's icon from the direction's registry for its tile badge", () => {
    const missing: ChibiBoardArtV7 = { resolve: () => ({ kind: "MISSING" }) };
    const samples: ChibiBoardArtV7 = {
      resolve: (request) => {
        const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
          request.subject,
        )[0];
        return asset === undefined
          ? { kind: "MISSING" }
          : {
              kind: "READY",
              asset,
              image: { id: asset.id } as unknown as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: asset.id,
            };
      },
    };
    const art = createDirectedChibiArtV7({
      base: missing,
      samples,
      direction: LIVE_DIRECTION_V7,
      environment: {
        readPixels: () => null,
        createSurface: () => null,
      },
    });
    for (const daemon of ["IMP", "HORROR", "MASS"] as const) {
      const resolved = art.resolve({
        subject: `ICON:ACTION:SUMMON_${daemon}`,
        at: { x: 0, y: 0 },
        deviceScale: 1,
      });
      expect(resolved.kind, daemon).toBe("READY");
      if (resolved.kind === "READY")
        expect(resolved.asset.id).toBe(
          `chibi-direction-icon-cult-action-summon-${daemon.toLowerCase()}`,
        );
    }
  });
});

describe("the Imp and the Mass on the board", () => {
  it("links the channelled Imp to each Imp its Brood holds, and lights their pips", () => {
    const state = cultSummonsUiFixtureV7();
    const plan = planOf(viewOf(state));
    const brood = plan.entries.filter(
      (entry) => entry.cultLink?.kind === "BROOD",
    );
    expect(brood.map((entry) => [entry.at, entry.linkTo])).toEqual([
      [A.imp, A.broodImp],
      [A.imp, A.secondBroodImp],
    ]);
    // The strand runs to the channelled Imp only.
    expect(
      plan.entries
        .filter((entry) => entry.cultLink?.kind === "STRAND")
        .map((entry) => [entry.at, entry.linkTo]),
    ).toEqual([[A.channeller, A.imp]]);
    const markers = cultUnitMarkersV7(viewOf(state));
    for (const where of [A.imp, A.broodImp, A.secondBroodImp]) {
      const control = markers.get(idAt(state, where))?.control;
      expect(control, `${where.x}`).toEqual({ control: 1, strands: 1 });
      expect(markers.get(idAt(state, where))?.eye).toBeUndefined();
    }
    // The held Imps' cards say Brood holds them, with the Brood's icon.
    const view = viewOf(state);
    const held = view.units.find((unit) => unit.id === idAt(state, A.broodImp));
    if (held === undefined) throw new Error("no Imp");
    expect(
      cultChannelChipsV7(view, held).find((chip) => chip.id === "control"),
    ).toMatchObject({ icon: "ICON:ACTION:BROOD", label: "Brood" });
    // The channelled Imp holds by its own strand.
    const channelled = view.units.find(
      (unit) => unit.id === idAt(state, A.imp),
    );
    if (channelled === undefined) throw new Error("no Imp");
    expect(
      cultChannelChipsV7(view, channelled).find(
        (chip) => chip.id === "control",
      ),
    ).toMatchObject({ icon: "ICON:ACTION:CHANNEL", label: "1 / 1" });
  });

  it("draws a Mass on its Doorstep with a house pip, and the Brood's link and the house in code", () => {
    const state = cultSummonsUiFixtureV7();
    const markers = cultUnitMarkersV7(viewOf(state));
    expect(markers.get(idAt(state, A.mass))?.control).toEqual({
      control: 1,
      strands: 1,
      doorstep: true,
    });
    // An Imp's pip stays round.
    expect(markers.get(idAt(state, A.imp))?.control?.doorstep).toBeUndefined();
    const view = viewOf(state);
    const mass = view.units.find((unit) => unit.id === idAt(state, A.mass));
    if (mass === undefined) throw new Error("no Mass");
    expect(
      cultChannelChipsV7(view, mass).find((chip) => chip.id === "control"),
    ).toMatchObject({ icon: "ICON:ACTION:DOORSTEP", label: "Doorstep" });

    for (const highContrast of [false, true]) {
      const house: string[] = [];
      drawCultControlPipsV7(
        recordingContext(house),
        0,
        0,
        1,
        { control: 1, strands: 1, doorstep: true },
        { highContrast },
      );
      const round: string[] = [];
      drawCultControlPipsV7(
        recordingContext(round),
        0,
        0,
        1,
        { control: 1, strands: 1 },
        { highContrast },
      );
      // The house is a closed gable of lines where the round pip is an arc.
      expect(house).toContain("closePath");
      expect(house.filter((entry) => entry === "lineTo").length).toBe(6);
      expect(round).not.toContain("closePath");
      const link: string[] = [];
      drawCultBroodLinkV7(
        recordingContext(link),
        { x: 0, y: 0 },
        { x: 128, y: 128 },
        1,
        { highContrast },
      );
      expect(link.filter((entry) => entry === "save").length).toBe(
        link.filter((entry) => entry === "restore").length,
      );
      // A casing, the lit line and three beads; no raster.
      expect(link.filter((entry) => entry === "stroke").length).toBe(5);
      expect(link.filter((entry) => entry === "arc").length).toBe(3);
      expect(link).not.toContain("drawImage");
      if (highContrast) expect(link.join()).not.toMatch(/#80ffbc|#007336/);
    }
  });

  it("rings every Gibbering Mass's eight tiles in the quiet ooze, bound or Unbound", () => {
    const state = cultSummonsUiFixtureV7();
    const plan = planOf(viewOf(state));
    for (const where of [A.mass, A.unboundMass]) {
      const ring = plan.entries.filter((entry) =>
        entry.key.startsWith(`cult-drag:${idAt(state, where)}:`),
      );
      expect(ring.map((entry) => entry.at)).toHaveLength(9);
      for (const entry of ring) {
        expect(entry.kind).toBe("ABILITY_AREA");
        expect(entry.abilityStyle).toBe("DRAG_RING");
        expect(chebyshev(entry.at, where)).toBeLessThanOrEqual(1);
      }
      // Only the outer edges are stroked: the Mass's own tile has none.
      expect(
        ring.find((entry) => chebyshev(entry.at, where) === 0)?.targetEdges,
      ).toEqual([]);
    }
    // A teal of the Cult's palette, apart from the warden's chalk.
    expect(abilityAreaStrokeV7("DRAG_RING")).toBe("#2aa6a6");
    expect(abilityAreaStrokeV7("DRAG_RING")).not.toBe(
      abilityAreaStrokeV7("IDOL_RING"),
    );
  });

  it("says Dragged on a unit beside a hostile Mass, on its tile, its Moves and its card", () => {
    const state = cultSummonsRivalUiFixtureV7();
    const view = viewOf(state);
    const dragged = idAt(state, R.dragged);
    expect(unitDraggedV7(view, dragged)).toBe(true);
    expect(unitDraggedV7(view, idAt(state, R.free))).toBe(false);
    const plan = selected(state, R.dragged);
    const moves = plan.targets.filter((target) => target.family === "MOVE");
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      expect(chebyshev(move.at, R.dragged)).toBe(1);
      expect(move.semanticLabel).toContain(DRAGGED_MOVE_V7);
      expect(move.semanticLabel).not.toMatch(/\d+,\s*\d+/);
    }
    expect(
      plan.entries
        .filter((entry) => entry.key.startsWith("ability-target:DRAGGED:"))
        .map((entry) => [entry.at, entry.label, entry.abilityStyle]),
    ).toEqual([[R.dragged, DRAGGED_LABEL_V7, "DRAG_RING"]]);
    const unit = view.units.find((candidate) => candidate.id === dragged);
    if (unit === undefined) throw new Error("no Fighter");
    expect(
      cultChannelChipsV7(view, unit).find((chip) => chip.id === "dragged"),
    ).toMatchObject({ label: DRAGGED_LABEL_V7, icon: "ICON:ACTION:DRAG" });
    expect(statusGlossaryV7("dragged")?.name).toBe("Drag");
    // A free unit's Moves say nothing of it, and its tile has no word.
    const free = selected(state, R.free);
    expect(
      free.targets
        .filter((target) => target.family === "MOVE")
        .some((target) => target.semanticLabel?.includes(DRAGGED_LABEL_V7)),
    ).toBe(false);
    expect(
      free.entries.some((entry) =>
        entry.key.startsWith("ability-target:DRAGGED:"),
      ),
    ).toBe(false);
    // The Mass's own seat is not dragged by it.
    const cult = cultSummonsUiFixtureV7();
    expect(unitDraggedV7(viewOf(cult), idAt(cult, A.summoner))).toBe(false);
  });

  it("reads Swarmed: no strike back on an Imp's attack the Swarm leaves unanswered", () => {
    const state = cultSummonsUiFixtureV7();
    const view = viewOf(state);
    const imp = idAt(state, A.broodImp);
    const fighter = idAt(state, A.swarmed);
    const preview = queryCombatPreviewV7(view, imp, fighter);
    expect(preview?.noRetaliationReason).toBe("SWARMED");
    expect(swarmCombatNotesV7(preview ?? {})).toEqual([SWARMED_PREVIEW_V7]);
    expect(swarmCombatNotesV7({ noRetaliationReason: null })).toEqual([]);
    const target = selected(state, A.broodImp).targets.find(
      (entry) => entry.family === "ATTACK" && entry.at.x === A.swarmed.x,
    );
    expect(target?.previewNote).toContain(SWARMED_PREVIEW_V7);
    expect(target?.semanticLabel).toContain(SWARMED_SEMANTIC_V7);
  });

  it("wears the Unbound looks and names the Unbound order's reason", () => {
    expect(neutralArtSubjectsV7("IMP", "FIGHTER")).toEqual({
      unit: "UNIT:CULT:IMP_UNBOUND",
      portrait: "UNIT:CULT:IMP_UNBOUND",
    });
    expect(neutralArtSubjectsV7("MASS", "GUARD").unit).toBe(
      "UNIT:CULT:MASS_UNBOUND",
    );
    const state = cultSummonsUiFixtureV7();
    const view = viewOf(state);
    const plan = planOf(view);
    const look = (where: CoordV7) =>
      plan.entries.find(
        (entry) =>
          entry.kind === "UNIT" && entry.key === `unit:${idAt(state, where)}`,
      )?.artSubject;
    expect(look(A.unboundImp)).toBe("UNIT:CULT:IMP_UNBOUND");
    expect(look(A.unboundMass)).toBe("UNIT:CULT:MASS_UNBOUND");
    expect(look(A.imp)).toBe("UNIT:CULT:IMP");
    expect(look(A.mass)).toBe("UNIT:CULT:MASS");
    const hunting = monsterInfoLinesV7(view, idAt(state, A.unboundImp)).find(
      (line) => line.id === "provoked",
    );
    expect(
      Object.values(RAMPAGE_STEP_REASONS_V7).some((reason) =>
        hunting?.description.endsWith(`: ${reason}.`),
      ),
    ).toBe(true);
    expect(hunting?.description).not.toMatch(/\d+,\s*\d+|\bstep\b/);
  });

  it("lists Brood and Swarm on the Imp's card, Doorstep and Drag on the Mass's", () => {
    const imp = summonedGlossaryV7("IMP").map((entry) => entry.id);
    expect(imp).toEqual(expect.arrayContaining(["BROOD", "SWARM"]));
    const mass = summonedGlossaryV7("MASS").map((entry) => entry.id);
    expect(mass).toEqual(expect.arrayContaining(["DOORSTEP", "DRAG"]));
    for (const entry of [
      ...summonedGlossaryV7("IMP"),
      ...summonedGlossaryV7("MASS"),
    ])
      expect(entry.text).not.toMatch(/\d+\s*[+×x*/]\s*\d+|_/);
  });
});
