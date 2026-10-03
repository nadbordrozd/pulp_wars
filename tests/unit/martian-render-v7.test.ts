import { describe, expect, it, vi } from "vitest";
import { RULESET7_UNIT_ART_IDS } from "../../src/assets/ruleset7-ui-art";
import {
  applyCommandV7,
  previewBeamDownV7,
  previewMindControlV7,
  previewTractorBeamV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  chibiFallbackSubjectV7,
  cityArtSubjectV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  commandSubjectV7,
  portraitSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-martian-art-manifest";
import {
  MARTIAN_FLAG_ANCHORS_V7,
  MARTIAN_FLYER_PRESENTATION_V7,
  MARTIAN_PALETTE_V7,
} from "../../src/assets/chibi-direction-martian-presentation";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { resolveChibiWithFallbackV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  DIRECTION_FLAG_ANCHORS_V7,
  LIVE_DIRECTION_V7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  drawCoolingGlyphV7,
  drawShieldBarV7,
  drawThrallCollarV7,
  flyerPresentationV7,
} from "../../src/render/canvas/martian-canvas-v7";
import {
  MARTIAN_EFFECT_SUBJECTS_V7,
  drawMartianFeedbackV7,
  type MartianFeedbackEffectV7,
} from "../../src/render/canvas/martian-effects-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  DISINTEGRATOR_PREVIEW_V7,
  LEAVES_COOLING_V7,
  MIND_CONTROL_PROTECTED_V7,
} from "../../src/render/martian-presentation-v7";
import {
  MARTIAN_DUEL_V7,
  MARTIAN_UI_V7,
  martianDuelFixtureV7,
  martianUiFieldV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";

// Every Martian number below is read from the registry or from a public
// preview of the same view: the balance bead (`pulp_wars-t6s.5`) may retune
// Shields, Attack and the abilities without touching these expectations.
const AT = MARTIAN_UI_V7;
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

const unitEntry = (
  plan: BoardRenderPlanV7,
  view: PlayerViewV7,
  at: CoordV7,
): BoardRenderPlanEntryV7 => {
  const entry = plan.entries.find(
    (candidate) => candidate.key === `unit:${unitAt(view, at).id}`,
  );
  if (entry === undefined) throw new Error("unit entry missing");
  return entry;
};

const statsOf = (view: PlayerViewV7, at: CoordV7) => {
  const mechanics = view.unitStats.find(
    (entry) => entry.unitId === unitAt(view, at).id,
  )?.martian;
  if (mechanics === undefined) throw new Error("no Martian stats");
  return mechanics;
};

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

const fills = (log: readonly LogEntry[]): unknown[] =>
  log
    .filter((call) => call[0] === "set" && call[1] === "fillStyle")
    .map((call) => call[2]);

describe("Martian art wiring (MARTIAN.md wiring steps 1-4, 6)", () => {
  it("resolves the unit, Thrall, machine-afloat, city, portrait and icon subjects", () => {
    expect(
      unitArtSubjectV7({ role: "KNIGHT", form: "LAND", faction: "MARTIAN" }),
    ).toBe("UNIT:MARTIAN:KNIGHT");
    expect(
      unitArtSubjectV7({
        role: "FIGHTER",
        form: "LAND",
        faction: "MARTIAN",
        thrall: true,
      }),
    ).toBe("UNIT:MARTIAN:THRALL");
    // A machine afloat is drawn as itself; a foot unit at sea as the
    // transport; a ship as the shared ship.
    expect(
      unitArtSubjectV7({
        role: "CATAPULT",
        form: "EMBARKED",
        faction: "MARTIAN",
        machine: true,
      }),
    ).toBe("UNIT:MARTIAN:CATAPULT");
    expect(
      unitArtSubjectV7({
        role: "FIGHTER",
        form: "EMBARKED",
        faction: "MARTIAN",
      }),
    ).toBe("UNIT:EMBARKED_TRANSPORT");
    expect(
      unitArtSubjectV7({
        role: "PATROL_BOAT",
        form: "NAVAL",
        faction: "MARTIAN",
      }),
    ).toBe("UNIT:PATROL_BOAT");
    expect(cityArtSubjectV7({ artLevel: 2, faction: "MARTIAN" })).toBe(
      "CITY:MARTIAN:2",
    );
    expect(portraitSubjectV7("CAPTAIN", "MARTIAN")).toBe(
      "PORTRAIT:MARTIAN:CAPTAIN",
    );
    expect(technologySubjectV7("DRILL", "MARTIAN")).toBe("UNIT:MARTIAN:GUARD");
    expect(technologySubjectV7("FORTIFICATION", "MARTIAN")).toBe(
      "ICON:ACTION:FORCE_FIELD",
    );
    expect(
      commandSubjectV7({ kind: "RALLY", unitId: 1 } as CommandV7, "MARTIAN"),
    ).toBe("ICON:ACTION:MARTIAN:RALLY");
  });

  it("falls back to the Human stand-in (the Thrall to the Fighter), never to a missing subject", () => {
    expect(chibiFallbackSubjectV7("UNIT:MARTIAN:RAIDER")).toBe("UNIT:RAIDER");
    expect(chibiFallbackSubjectV7("UNIT:MARTIAN:THRALL")).toBe("UNIT:FIGHTER");
    expect(chibiFallbackSubjectV7("PORTRAIT:MARTIAN:THRALL")).toBe(
      "PORTRAIT:FIGHTER",
    );
    expect(chibiFallbackSubjectV7("CITY:MARTIAN:3")).toBe("CITY:3");
    expect(chibiFallbackSubjectV7("ICON:ACTION:MARTIAN:RALLY")).toBe(
      "ICON:ACTION:RALLY",
    );
    expect(chibiFallbackSubjectV7("ICON:ACTION:BEAM_DOWN")).toBeNull();
    // Every Martian subject either has its own raster in the live registry
    // or a Human stand-in.
    const live = chibiDirectionArtRegistryV7();
    for (const asset of CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7)
      expect(live.variants(asset.subject)).toHaveLength(1);
  });

  it("draws the live look's own Martian raster and the classic look's stand-in with the badge", () => {
    const resolveWith = (
      assets: readonly ChibiArtAssetV7[],
    ): ChibiBoardArtV7 => ({
      resolve: vi.fn((request): ChibiResolutionV7 => {
        const asset = assets.find(
          (candidate) => candidate.subject === request.subject,
        );
        return asset === undefined
          ? { kind: "MISSING" }
          : {
              kind: "READY",
              asset,
              image: {} as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: asset.id,
            };
      }),
    });
    const request = {
      subject: "UNIT:MARTIAN:CAPTAIN" as ArtSubjectV7,
      at: { x: 0, y: 0 },
      ownerColor: "#ff0000",
      deviceScale: 1,
    };
    const brain = CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.find(
      (asset) => asset.subject === "UNIT:MARTIAN:CAPTAIN",
    );
    if (brain === undefined) throw new Error("Brain asset missing");
    const live = resolveChibiWithFallbackV7(resolveWith([brain]), request);
    expect(live.factionArt).toBe(true);
    const human: ChibiArtAssetV7 = {
      ...brain,
      id: "human-captain",
      subject: "UNIT:CAPTAIN",
      fixedColours: true,
    };
    const classic = resolveChibiWithFallbackV7(resolveWith([human]), request);
    expect(classic.factionArt).toBe(false);
    expect(classic.resolution.kind).toBe("READY");
  });

  it("copies the colonies' pennant anchors and keeps the flyers' presentation", () => {
    for (const [id, anchor] of Object.entries(MARTIAN_FLAG_ANCHORS_V7))
      expect(DIRECTION_FLAG_ANCHORS_V7[id]).toEqual(anchor);
    for (const id of Object.keys(MARTIAN_FLYER_PRESENTATION_V7))
      expect(flyerPresentationV7(id)).not.toBeNull();
    expect(flyerPresentationV7("chibi-direction-martian-tripod")).toBeNull();
  });
});

describe("Martian board plan", () => {
  it("carries each unit's Shield, Cooling, Thrall and flying markers from the public stats", () => {
    const view = humanView(martianUiFixtureV7());
    const plan = planFor(view, null);
    const dented = unitEntry(plan, view, AT.dentedGrunt);
    const dentedStats = statsOf(view, AT.dentedGrunt);
    expect(dented.martian).toMatchObject({
      shield: dentedStats.shield,
      shieldSegments: dentedStats.shieldMaximum,
      shieldMaximum: dentedStats.shieldMaximum,
      cooling: false,
      thrall: false,
      flyer: false,
    });
    expect(dented.faction).toBe("MARTIAN");
    expect(dented.artSubject).toBe("UNIT:MARTIAN:FIGHTER");
    expect(unitEntry(plan, view, AT.coolingGunner).martian?.cooling).toBe(true);
    const thrall = unitEntry(plan, view, AT.thrall);
    expect(thrall).toMatchObject({
      label: "Thrall",
      artSubject: "UNIT:MARTIAN:THRALL",
    });
    expect(thrall.martian).toMatchObject({ thrall: true, shieldSegments: 0 });
    const saucer = unitEntry(plan, view, AT.saucer);
    expect(saucer.martian?.flyer).toBe(true);
    expect(saucer.martian?.shieldSegments).toBe(
      roleMechanicsV7("RAIDER", "MARTIAN").shield,
    );
    // Machines afloat are drawn as themselves (never the transport).
    const tripod = unitEntry(plan, view, AT.tripodAfloat);
    expect(tripod).toMatchObject({
      artSubject: "UNIT:MARTIAN:CATAPULT",
      assetId: RULESET7_UNIT_ART_IDS.CATAPULT,
      label: "Tripod afloat",
    });
    expect(tripod.martian).toMatchObject({ afloat: true, flyer: false });
    expect(unitEntry(plan, view, AT.saucerAfloat).martian).toMatchObject({
      afloat: true,
      flyer: true,
    });
    // Human units carry no Martian markers.
    expect(unitEntry(plan, view, AT.rayTarget).martian).toBeUndefined();
  });

  it("shows a selected Shield Projector's Force Field and the Thrall-Brain link", () => {
    const view = humanView(martianUiFixtureV7());
    const projector = planFor(view, AT.projector);
    const field = projector.entries.filter(
      (entry) =>
        entry.kind === "ABILITY_AREA" && entry.abilityStyle === "FORCE_FIELD",
    );
    expect(field.map((entry) => `${entry.at.x},${entry.at.y}`).sort()).toEqual(
      [
        [6, 2],
        [7, 2],
        [8, 2],
        [6, 3],
        [8, 3],
        [6, 4],
        [7, 4],
        [8, 4],
      ]
        .map(([x, y]) => `${x},${y}`)
        .sort(),
    );
    const brain = unitAt(view, AT.brain);
    const thrall = unitAt(view, AT.thrall);
    const fromBrain = planFor(view, AT.brain).entries.filter(
      (entry) => entry.kind === "LINK" && entry.label === "THRALL_LINK",
    );
    expect(fromBrain.map((entry) => entry.linkTo)).toEqual([thrall.at]);
    const fromThrall = planFor(view, AT.thrall).entries.filter(
      (entry) => entry.kind === "LINK" && entry.label === "THRALL_LINK",
    );
    expect(fromThrall.map((entry) => entry.linkTo)).toEqual([brain.at]);
    // Nothing of the kind without a selection.
    expect(
      planFor(view, null).entries.some(
        (entry) =>
          entry.abilityStyle === "FORCE_FIELD" || entry.label === "THRALL_LINK",
      ),
    ).toBe(false);
  });

  it("aims Beam Down in two stages from the public preview", () => {
    const view = humanView(martianUiFixtureV7());
    const saucer = unitAt(view, AT.saucer);
    const passenger = unitAt(view, AT.capitalGrunt);
    const stageOne = planFor(view, AT.saucer, {
      martianPick: {
        kind: "BEAM_DOWN",
        unitId: saucer.id,
        passengerUnitId: null,
      },
    });
    expect(stageOne.targets.map((target) => target.family)).toEqual([
      "BEAM_DOWN_PASSENGER",
    ]);
    expect(stageOne.targets[0]?.at).toEqual(passenger.at);
    const stageTwo = planFor(view, AT.saucer, {
      martianPick: {
        kind: "BEAM_DOWN",
        unitId: saucer.id,
        passengerUnitId: passenger.id,
      },
    });
    const preview = previewBeamDownV7(view, saucer.id, passenger.id);
    expect(stageTwo.targets.map((target) => target.at)).toEqual(
      preview?.destinations,
    );
    expect(
      stageTwo.targets.every(
        (target) =>
          target.family === "BEAM_DOWN" && target.command.kind === "BEAM_DOWN",
      ),
    ).toBe(true);
  });

  it("aims Mind Control: the legal target with its preview, and why the others cannot be taken", () => {
    const view = humanView(martianUiFixtureV7());
    const brain = unitAt(view, AT.brain);
    const plan = planFor(view, AT.brain, {
      martianPick: { kind: "MIND_CONTROL", unitId: brain.id },
    });
    const weak = unitAt(view, AT.weakTarget);
    const preview = previewMindControlV7(view, brain.id, weak.id);
    if (preview === null) throw new Error("Mind Control not offered");
    expect(plan.targets).toHaveLength(1);
    expect(plan.targets[0]).toMatchObject({
      family: "MIND_CONTROL",
      at: weak.at,
      previewLabel: `Thrall · ${preview.thrallHp} HP`,
    });
    const reasons = plan.entries
      .filter(
        (entry) =>
          entry.kind === "ABILITY_TARGET" &&
          entry.abilityStyle === "MARTIAN_BLOCKED",
      )
      .map((entry) => [`${entry.at.x},${entry.at.y}`, entry.label]);
    const healthy = unitAt(view, AT.healthyTarget);
    expect(reasons).toContainEqual([
      `${AT.healthyTarget.x},${AT.healthyTarget.y}`,
      `Too healthy (${healthy.hp} HP)`,
    ]);
    expect(reasons).toContainEqual([
      `${AT.protectedTarget.x},${AT.protectedTarget.y}`,
      MIND_CONTROL_PROTECTED_V7,
    ]);
  });

  it("aims the Tractor Beam with each target's pull destination", () => {
    const view = humanView(martianUiFixtureV7());
    const mothership = unitAt(view, AT.mothership);
    const plan = planFor(view, AT.mothership, {
      martianPick: { kind: "TRACTOR_BEAM", unitId: mothership.id },
    });
    const commands = queryPlayerCommandsV7(view).filter(
      (command) =>
        command.kind === "TRACTOR_BEAM" && command.unitId === mothership.id,
    );
    expect(plan.targets).toHaveLength(commands.length);
    for (const target of plan.targets) {
      if (target.command.kind !== "TRACTOR_BEAM") throw new Error("kind");
      const preview = previewTractorBeamV7(
        view,
        mothership.id,
        target.command.targetUnitId,
      );
      expect(target.family).toBe("TRACTOR_BEAM");
      expect(target.pullTo).toEqual(preview?.to);
      expect(target.at).toEqual(preview?.from);
    }
    const raider = plan.targets.find(
      (target) =>
        target.at.x === AT.pullTarget.x && target.at.y === AT.pullTarget.y,
    );
    expect(raider?.pullTo).toEqual(AT.pullTo);
    // Focusing the target draws its destination.
    const log = draw(plan, { previewFocus: AT.pullTarget });
    expect(fills(log)).toContain("rgba(255, 143, 214, 0.26)");
  });

  it("adds the Shield, ray power, Cooling, Disintegrator and Pierce lines to attack targets", () => {
    const view = humanView(martianUiFixtureV7());
    const tripod = unitAt(view, AT.tripod);
    const plan = planFor(view, AT.tripod);
    const hostile = plan.targets.find(
      (target) =>
        target.family === "ATTACK" &&
        target.at.x === AT.pierceTarget.x &&
        target.at.y === AT.pierceTarget.y,
    );
    const target = unitAt(view, AT.pierceTarget);
    const preview = queryCombatPreviewV7(view, tripod.id, target.id);
    if (preview === null || hostile === undefined) throw new Error("preview");
    expect(preview.rayPower).toBe("FULL");
    expect(hostile.previewFocusNote).toBe(`Full power · ${LEAVES_COOLING_V7}`);
    const pierced = preview.splash[0];
    expect(hostile.pierce).toMatchObject({
      at: AT.pierceVictim,
      friendly: false,
      lethal: pierced?.dies,
    });
    expect(hostile.previewLabel).toContain(`pierce ${pierced?.damage}`);
    // Two tiles south an own Grunt stands behind the target: friendly fire.
    const friendly = plan.targets.find(
      (candidate) =>
        candidate.family === "ATTACK" &&
        candidate.at.x === AT.friendlyTarget.x &&
        candidate.at.y === AT.friendlyTarget.y,
    );
    const friendlyPreview = queryCombatPreviewV7(
      view,
      tripod.id,
      unitAt(view, AT.friendlyTarget).id,
    );
    const victim = friendlyPreview?.splash[0];
    if (victim === undefined) throw new Error("no friendly pierce");
    expect(friendly?.pierce?.friendly).toBe(true);
    expect(friendly?.previewWarnings).toEqual([
      `Pierce hits your Grunt: ${victim.damage + victim.shieldDamage} damage${victim.shieldDamage > 0 ? ` (Shield absorbs ${victim.shieldDamage})` : ""}${victim.dies ? ", lethal" : ""}`,
    ]);
    // The Ray Gunner on a Guard on Field Defense: the Disintegrator.
    const gunner = planFor(view, AT.rayGunner).targets.find(
      (candidate) =>
        candidate.family === "ATTACK" &&
        candidate.at.x === AT.rayTarget.x &&
        candidate.at.y === AT.rayTarget.y,
    );
    expect(gunner?.previewNote).toContain(DISINTEGRATOR_PREVIEW_V7);
    // Two Martian seats: the defender's Shield.
    const duel = humanView(martianDuelFixtureV7());
    const shooter = unitAt(duel, MARTIAN_DUEL_V7.rayGunner);
    const shielded = unitAt(duel, MARTIAN_DUEL_V7.shieldedGrunt);
    const duelPreview = queryCombatPreviewV7(duel, shooter.id, shielded.id);
    const duelTarget = planFor(duel, MARTIAN_DUEL_V7.rayGunner).targets.find(
      (candidate) =>
        candidate.family === "ATTACK" &&
        candidate.at.x === shielded.at.x &&
        candidate.at.y === shielded.at.y,
    );
    expect(duelPreview?.defenderShieldDamage).toBeGreaterThan(0);
    expect(duelTarget?.previewNote).toContain(
      `Shield absorbs ${duelPreview?.defenderShieldDamage}`,
    );
  });

  it("draws the shooter's note only on the focused target", () => {
    const view = humanView(martianUiFixtureV7());
    const plan = planFor(view, AT.rayGunner);
    const all = draw(plan);
    const focused = draw(plan, { previewFocus: AT.rayTarget });
    const count = (log: readonly LogEntry[]): number =>
      log.filter(
        (call) =>
          call[0] === "fillText" &&
          typeof call[1] === "string" &&
          call[1].includes(LEAVES_COOLING_V7),
      ).length;
    expect(count(all)).toBe(0);
    expect(count(focused)).toBe(1);
  });

  it("adds nothing Martian in a match without a Martian seat", () => {
    const view = humanView(
      martianUiFieldV7(
        [
          { seat: 0, role: "CATAPULT", at: AT.tripod },
          { seat: 0, role: "RAIDER", at: AT.saucer },
          { seat: 1, role: "FIGHTER", at: AT.pierceTarget },
          { seat: 1, role: "MARKSMAN", at: AT.pierceVictim },
        ],
        { factions: ["ORIGINAL", "ORIGINAL"] },
      ),
    );
    for (const selected of [null, AT.tripod, AT.saucer]) {
      const plan = planFor(view, selected);
      expect(plan.entries.some((entry) => entry.martian !== undefined)).toBe(
        false,
      );
      expect(
        plan.targets.some(
          (target) =>
            target.previewFocusNote !== undefined ||
            target.pierce !== undefined ||
            target.launch !== undefined,
        ),
      ).toBe(false);
    }
  });
});

describe("Martian board markers", () => {
  it("draws one Shield segment per point of the maximum, filled for the current Shield", () => {
    const { context, log } = recordingContext();
    drawShieldBarV7(
      context,
      100,
      100,
      1,
      { shield: 1, shieldSegments: 2, shieldMaximum: 2 },
      { placement: "BASE" },
    );
    expect(
      fills(log).filter((fill) => fill === MARTIAN_PALETTE_V7.magenta),
    ).toHaveLength(1);
    const raised = recordingContext();
    drawShieldBarV7(
      raised.context,
      100,
      100,
      1,
      { shield: 4, shieldSegments: 4, shieldMaximum: 2 },
      { placement: "SIDE" },
    );
    // Force Field segments take the paler glow.
    expect(
      fills(raised.log).filter(
        (fill) => fill === MARTIAN_PALETTE_V7.magentaGlow,
      ),
    ).toHaveLength(2);
  });

  it("draws the Cooling glyph without magenta and the collar with one magenta light", () => {
    const cooling = recordingContext();
    drawCoolingGlyphV7(cooling.context, 0, 0, 1, { chibi: true });
    const strokes = cooling.log
      .filter((call) => call[0] === "set" && call[1] === "strokeStyle")
      .map((call) => call[2]);
    expect(strokes).toContain(MARTIAN_PALETTE_V7.cooling);
    expect([...strokes, ...fills(cooling.log)]).not.toContain(
      MARTIAN_PALETTE_V7.magenta,
    );
    const collar = recordingContext();
    drawThrallCollarV7(collar.context, 0, 0, 1, { chibi: false });
    expect(fills(collar.log)).toContain(MARTIAN_PALETTE_V7.magenta);
  });

  it("draws the Martian markers and badge on the board in LEGACY", () => {
    const view = humanView(martianUiFixtureV7());
    const log = draw(planFor(view, null));
    expect(fills(log)).toContain(MARTIAN_PALETTE_V7.magenta);
    // The cooling glyph's grey and the badge's gunmetal.
    const strokes = log
      .filter((call) => call[0] === "set" && call[1] === "strokeStyle")
      .map((call) => call[2]);
    expect(strokes).toContain(MARTIAN_PALETTE_V7.cooling);
    expect(fills(log)).toContain(MARTIAN_PALETTE_V7.gunmetal);
  });

  it("draws a flyer's ground shadow under its lifted sprite in the live look", () => {
    const view = humanView(martianUiFixtureV7());
    const plan = planFor(view, null);
    const saucerAsset = CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7.find(
      (asset) => asset.subject === "UNIT:MARTIAN:RAIDER",
    );
    if (saucerAsset === undefined) throw new Error("Saucer asset missing");
    const art: ChibiBoardArtV7 = {
      resolve: (request): ChibiResolutionV7 =>
        request.subject === "UNIT:MARTIAN:RAIDER"
          ? {
              kind: "READY",
              asset: saucerAsset,
              image: { saucer: true } as unknown as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: saucerAsset.id,
            }
          : { kind: "MISSING" },
    };
    const log = draw(plan, {
      artSet: "CHIBI",
      chibiArt: art,
      direction: { spec: LIVE_DIRECTION_V7, art },
    });
    expect(fills(log)).toContain(MARTIAN_PALETTE_V7.shadow);
    const shadow = log.findIndex(
      (call) =>
        call[0] === "set" &&
        call[1] === "fillStyle" &&
        call[2] === MARTIAN_PALETTE_V7.shadow,
    );
    const sprite = log.findIndex(
      (call) =>
        call[0] === "drawImage" &&
        (call[1] as { saucer?: boolean } | undefined)?.saucer === true,
    );
    expect(shadow).toBeGreaterThan(-1);
    expect(sprite).toBeGreaterThan(shadow);
  });
});

describe("Martian cues", () => {
  it("plans a heat ray, a Shield flare, Beam Down, Mind Control, the pull and the collapse", () => {
    let state = martianUiFixtureV7();
    const view = (): PlayerViewV7 => humanView(state);
    const run = (command: CommandV7) => {
      const before = state;
      const result = applyCommandV7(state, state.humanPlayerId, command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      return corePresentationPlanV7(
        viewForV7(before, before.humanPlayerId),
        projectEventsV7(before, state, state.humanPlayerId, result.events),
        view(),
      );
    };
    const tripod = unitAt(view(), AT.tripod);
    const ray = run({
      kind: "ATTACK",
      unitId: tripod.id,
      targetUnitId: unitAt(view(), AT.pierceTarget).id,
    });
    expect(ray[0]).toMatchObject({
      kind: "MARTIAN",
      effect: "HEAT_RAY",
      from: AT.tripod,
      cells: [AT.pierceTarget],
      pierce: AT.pierceVictim,
      fullPower: true,
    });
    const saucer = unitAt(view(), AT.saucer);
    const passenger = unitAt(view(), AT.capitalGrunt);
    const destination = previewBeamDownV7(view(), saucer.id, passenger.id)
      ?.destinations[0];
    if (destination === undefined) throw new Error("no destination");
    expect(
      run({
        kind: "BEAM_DOWN",
        unitId: saucer.id,
        passengerUnitId: passenger.id,
        to: destination,
      }).find((step) => step.kind === "MARTIAN"),
    ).toMatchObject({ effect: "BEAM_DOWN", cells: [destination] });
    const brain = unitAt(view(), AT.brain);
    const mind = run({
      kind: "MIND_CONTROL",
      unitId: brain.id,
      targetUnitId: unitAt(view(), AT.weakTarget).id,
    });
    expect(mind.find((step) => step.kind === "MARTIAN")).toMatchObject({
      effect: "MIND_CONTROL",
      cells: [AT.weakTarget],
      from: AT.brain,
    });
    const mothership = unitAt(view(), AT.mothership);
    const pull = run({
      kind: "TRACTOR_BEAM",
      unitId: mothership.id,
      targetUnitId: unitAt(view(), AT.pullTarget).id,
    });
    expect(pull[0]).toMatchObject({
      kind: "MARTIAN",
      effect: "TRACTOR_BEAM",
      from: AT.mothership,
      cells: [AT.pullTarget],
    });
    expect(pull[1]).toMatchObject({
      kind: "MOVE",
      path: [AT.pullTarget, AT.pullTo],
    });
  });

  it("draws every cue in code without its sprite, and with the sprite when it is loaded", () => {
    const effects: readonly MartianFeedbackEffectV7[] = [
      "HEAT_RAY",
      "SHIELD_FLARE",
      "BEAM_DOWN",
      "TRACTOR_BEAM",
      "MIND_CONTROL",
      "THRALL_COLLAPSE",
    ];
    const camera = { offsetX: 0, offsetY: 0, zoom: 1 };
    for (const effect of effects) {
      const plain = recordingContext();
      drawMartianFeedbackV7(plain.context, camera, {
        effect,
        from: { x: 1, y: 1 },
        cells: [{ x: 3, y: 3 }],
        progress: 0.5,
      });
      expect(plain.log.length, effect).toBeGreaterThan(0);
      expect(
        plain.log.some((call) => call[0] === "drawImage"),
        effect,
      ).toBe(false);
    }
    const asked: string[] = [];
    const withArt = recordingContext();
    drawMartianFeedbackV7(
      withArt.context,
      camera,
      { effect: "MIND_CONTROL", cells: [{ x: 3, y: 3 }], progress: 0.5 },
      {
        devicePixelRatio: 1,
        image: (subject) => {
          asked.push(subject);
          return { image: {} as CanvasImageSource, width: 40, height: 40 };
        },
      },
    );
    expect(asked).toEqual(["EFFECT:MIND_CONTROL"]);
    expect(withArt.log.some((call) => call[0] === "drawImage")).toBe(true);
    expect(MARTIAN_EFFECT_SUBJECTS_V7).toHaveLength(5);
  });
});
