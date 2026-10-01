import { describe, expect, it, vi } from "vitest";
import {
  EGG_HP_V7,
  effectiveRoleRuleV7,
  previewHatchV7,
  previewStampedeV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  ARMOURED_PREVIEW_V7,
  stampedePreviewTextV7,
  turnsTextV7,
} from "../../src/render/dinosaur-presentation-v7";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  EGG_CODE_ART_ID_V7,
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
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  EGG_COUNTDOWN_FRAME_V7,
  GROWTH_MARKER_FRAME_V7,
  drawEggCountdownV7,
  drawGrowthChevronsV7,
  drawStampedeLaneCellV7,
  growthSpriteScaleV7,
} from "../../src/render/canvas/dinosaur-canvas-v7";
import { drawDinosaurFeedbackV7 } from "../../src/render/canvas/dinosaur-effects-v7";
import { dinosaurUnitPulsesV7 } from "../../src/render/canvas/board-host-v7";
import {
  DINOSAUR_BLAST_V7,
  DINOSAUR_CITY_V7,
  DINOSAUR_ENEMY_V7,
  DINOSAUR_SHOWCASE_V7,
  dinosaurBlastFixtureV7,
  dinosaurCityFixtureV7,
  dinosaurEnemyFixtureV7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";

// Dinosaur numbers come from the registry and the public previews: the
// balance bead may retune them without touching these expectations.
const AT = DINOSAUR_SHOWCASE_V7;
const hatchTurns = (role: UnitRoleIdV7): number =>
  roleMechanicsV7(role, "DINOSAUR").hatchTurns ?? 0;
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

function humanView(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

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

const texts = (log: readonly LogEntry[]): readonly unknown[] =>
  log.filter((call) => call[0] === "fillText").map((call) => call[1]);

function chibiAsset(
  subject: ArtSubjectV7,
  width: number,
  height: number,
): ChibiArtAssetV7 {
  return {
    id: `fixture-${subject}`,
    subject,
    assetClass: width > 56 ? "LARGE_UNIT" : "STANDARD_UNIT",
    width,
    height,
    url: `/fixture/${subject}.png`,
  };
}

function fakeChibi(ready: readonly ChibiArtAssetV7[]): ChibiBoardArtV7 {
  return {
    resolve: vi.fn((request): ChibiResolutionV7 => {
      const asset = ready.find(
        (candidate) => candidate.subject === request.subject,
      );
      return asset === undefined
        ? { kind: "MISSING" }
        : {
            kind: "READY",
            asset,
            image: { chibi: asset.id } as unknown as CanvasImageSource,
            density: 1,
            smoothing: false,
            cacheKey: `chibi:${asset.id}`,
          };
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
    images: { resolve: () => null },
    ...options,
  });
  return log;
}

describe("Revision 19 board plan", () => {
  it("names Dinosaur units and Eggs, and carries countdowns and growth stages", () => {
    const view = humanView(dinosaurShowcaseFixtureV7());
    const plan = planFor(view, null);
    expect(unitEntry(plan, view, AT.laneCaveman)).toMatchObject({
      label: "Caveman",
      faction: "DINOSAUR",
      artSubject: "UNIT:DINOSAUR:FIGHTER",
    });
    expect(unitEntry(plan, view, AT.pushTarget).label).toBe("Juggernaut");
    // An Egg laid on an earlier turn: the T-Rex's hatch time and the Egg's HP.
    expect(unitEntry(plan, view, AT.tRexEgg)).toMatchObject({
      label: "T-Rex Egg",
      assetId: EGG_CODE_ART_ID_V7,
      artSubject: "UNIT:DINOSAUR:EGG",
      egg: { turnsRemaining: hatchTurns("KNIGHT") },
      hp: EGG_HP_V7,
      maxHp: EGG_HP_V7,
      ready: false,
    });
    expect(unitEntry(plan, view, AT.newEgg).egg).toEqual({ turnsRemaining: 1 });
    expect(unitEntry(plan, view, AT.bigRaptor).growthStage).toBe(1);
    expect(unitEntry(plan, view, AT.alphaTRex).growthStage).toBe(2);
    expect(unitEntry(plan, view, AT.brontosaurus).growthStage).toBe(1);
    expect(unitEntry(plan, view, AT.ankylosaurus).growthStage).toBeUndefined();
    expect(unitEntry(plan, view, AT.shaman).egg).toBeUndefined();
    // Enemy Eggs and grown units are public too.
    const enemy = humanView(dinosaurEnemyFixtureV7());
    const enemyPlan = planFor(enemy, null);
    expect(
      unitEntry(enemyPlan, enemy, DINOSAUR_ENEMY_V7.tRexEgg),
    ).toMatchObject({
      label: "T-Rex Egg",
      egg: { turnsRemaining: hatchTurns("KNIGHT") },
      hp: 1,
      maxHp: EGG_HP_V7,
    });
    expect(
      unitEntry(enemyPlan, enemy, DINOSAUR_ENEMY_V7.alphaTRex).growthStage,
    ).toBe(2);
  });

  it("leaves a match without a Dinosaur seat without Eggs, growth or lanes", () => {
    const view = humanView(goblinShowcaseFixtureV7());
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    if (own === undefined) throw new Error("own unit missing");
    const plan = planFor(view, own.at);
    expect(
      plan.entries.some(
        (entry) =>
          entry.kind === "LANE" ||
          entry.egg !== undefined ||
          entry.growthStage !== undefined,
      ),
    ).toBe(false);
  });

  it("targets every Stampede with its lane: run tiles, then the stand tile", () => {
    const view = humanView(dinosaurShowcaseFixtureV7());
    const plan = planFor(view, AT.triceratops);
    const stampedes = plan.targets.filter(
      (target) => target.family === "STAMPEDE",
    );
    // The damage and the run bonus are the engine preview's.
    const dealt = (at: CoordV7): string => {
      const preview = previewStampedeV7(
        view,
        unitAt(view, AT.triceratops).id,
        unitAt(view, at).id,
      );
      if (preview === null) throw new Error("Stampede not offered");
      return `Deal ${preview.combat.damageToDefender} · run +${preview.combat.stampede}`;
    };
    expect(
      stampedes.map((target) => [
        target.at,
        target.previewLabel,
        target.previewNote,
        target.needsConfirmation ?? false,
      ]),
    ).toEqual([
      [
        AT.pushTarget,
        dealt(AT.pushTarget),
        "Pushes back · follows · No retaliation",
        false,
      ],
      [
        AT.killTarget,
        dealt(AT.killTarget),
        "Kills · advances · No retaliation",
        false,
      ],
      [
        AT.diagonalTarget,
        dealt(AT.diagonalTarget),
        "Kills · advances · No retaliation",
        false,
      ],
    ]);
    const push = previewStampedeV7(
      view,
      unitAt(view, AT.triceratops).id,
      unitAt(view, AT.pushTarget).id,
    );
    if (push === null) throw new Error("Stampede not offered");
    expect(stampedes[0]?.semanticLabel).toBe(
      `Stampede preview. ${stampedePreviewTextV7(view, push).description}`,
    );
    expect(stampedes[0]?.semanticLabel).toContain(
      "Pushes Juggernaut back; Triceratops follows. No retaliation.",
    );
    expect(stampedes[0]?.lane).toEqual({
      from: AT.triceratops,
      tiles: [AT.laneCaveman, { x: 6, y: 2 }],
    });
    const lanes = plan.entries
      .filter((entry) => entry.kind === "LANE")
      .map((entry) => [entry.at, entry.lane]);
    expect(lanes).toEqual([
      [
        { x: 5, y: 1 },
        { dx: 1, dy: -1, stand: true },
      ],
      [
        { x: 5, y: 2 },
        { dx: 1, dy: 0, stand: false },
      ],
      [
        { x: 6, y: 2 },
        { dx: 1, dy: 0, stand: true },
      ],
      [
        { x: 4, y: 3 },
        { dx: 0, dy: 1, stand: true },
      ],
    ]);
    // No Stampede target is an Attack target, and none without a selection.
    expect(plan.targets.some((target) => target.family === "ATTACK")).toBe(
      false,
    );
    expect(planFor(view, null).entries.some((e) => e.kind === "LANE")).toBe(
      false,
    );
  });

  it("shows only the armed Stampede, with its death-blast chain", () => {
    const view = humanView(dinosaurBlastFixtureV7());
    const target = unitAt(view, DINOSAUR_BLAST_V7.bombChucker);
    const open = planFor(view, DINOSAUR_BLAST_V7.triceratops);
    expect(open.targets.some((entry) => entry.family === "MOVE")).toBe(true);
    const stampede = open.targets.find((entry) => entry.family === "STAMPEDE");
    const preview = previewStampedeV7(
      view,
      unitAt(view, DINOSAUR_BLAST_V7.triceratops).id,
      target.id,
    );
    if (preview === null) throw new Error("Stampede not offered");
    const text = stampedePreviewTextV7(view, preview);
    expect(text.warnings).toHaveLength(3);
    expect(stampede).toMatchObject({
      needsConfirmation: true,
      previewWarnings: text.warnings,
      previewWarningSummary: text.warningSummary,
    });
    // The attacker is hit on the tile it advances onto, by both blasts.
    expect(
      stampede?.blast?.cells.find(
        (cell) =>
          cell.at.x === DINOSAUR_BLAST_V7.bombChucker.x &&
          cell.at.y === DINOSAUR_BLAST_V7.bombChucker.y,
      )?.label,
    ).toMatch(/^Attacker −\d+$/);
    const armed = planFor(view, DINOSAUR_BLAST_V7.triceratops, {
      stampedeTargetUnitId: target.id,
    });
    expect(armed.targets.map((entry) => entry.family)).toEqual(["STAMPEDE"]);
    expect(armed.entries.filter((entry) => entry.kind === "LANE")).toHaveLength(
      2,
    );
  });

  it("targets the hatchable Egg and marks the Egg laid this turn", () => {
    const view = humanView(dinosaurShowcaseFixtureV7());
    const plan = planFor(view, AT.shaman);
    const hatch = previewHatchV7(
      view,
      unitAt(view, AT.shaman).id,
      unitAt(view, AT.tRexEgg).id,
    );
    if (hatch === null) throw new Error("Hatch not offered");
    expect(hatch.hp).toBe(effectiveRoleRuleV7("KNIGHT", "DINOSAUR").maxHp);
    expect(
      plan.targets
        .filter((target) => target.family === "HATCH")
        .map((target) => [
          target.at,
          target.previewLabel,
          target.previewNote,
          target.semanticLabel,
        ]),
    ).toEqual([
      [
        AT.tRexEgg,
        "Hatch T-Rex",
        "Cannot act this turn",
        `Hatch: a T-Rex with ${hatch.hp} HP appears here now, ${turnsTextV7(hatch.turnsSaved)} early. It cannot act this turn.`,
      ],
    ]);
    expect(
      plan.entries
        .filter((entry) => entry.abilityStyle === "HATCH_BLOCKED")
        .map((entry) => [entry.kind, entry.at, entry.label]),
    ).toEqual([["ABILITY_TARGET", AT.newEgg, "Next turn"]]);
  });

  it("offers only the legal nest tiles while an Egg's tile is picked", () => {
    const view = humanView(dinosaurCityFixtureV7());
    const city = view.cities.find((entry) => entry.ownerId === view.viewer.id);
    if (city === undefined) throw new Error("city missing");
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "CITY", cityId: city.id },
      selectedUnitId: null,
      selectedAchievement: null,
      layEgg: { cityId: city.id, role: "KNIGHT" },
    });
    const ring = [
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 9, y: 7 },
      { x: 7, y: 8 },
      { x: 9, y: 8 },
      { x: 7, y: 9 },
      { x: 8, y: 9 },
      { x: 9, y: 9 },
    ];
    expect(plan.targets.map((target) => target.family)).toEqual(
      ring.map(() => "LAY_EGG"),
    );
    expect(plan.targets.map((target) => target.at)).toEqual(ring);
    expect(plan.targets[0]?.command).toEqual({
      kind: "LAY_EGG",
      cityId: city.id,
      role: "KNIGHT",
      at: { x: 7, y: 7 },
    });
    expect(plan.targets[0]?.semanticLabel).toBe(
      "Nest tile: lay the T-Rex Egg here. Choose a tile next to the city for the Egg.",
    );
    expect(
      plan.entries
        .filter((entry) => entry.abilityStyle === "NEST")
        .map((entry) => entry.at),
    ).toEqual(ring);
    // Without the pick the city selection has no map target.
    expect(
      buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection: { kind: "CITY", cityId: city.id },
        selectedUnitId: null,
        selectedAchievement: null,
      }).targets,
    ).toEqual([]);
    expect(DINOSAUR_CITY_V7.capital).toEqual(city.at);
  });

  it("notes Acid and Armoured on attack targets, and previews attacks on Eggs", () => {
    const own = humanView(dinosaurShowcaseFixtureV7());
    const acid = planFor(own, AT.spitter).targets.find(
      (target) =>
        target.family === "ATTACK" &&
        target.at.x === AT.acidTarget.x &&
        target.at.y === AT.acidTarget.y,
    );
    const label = (view: PlayerViewV7, from: CoordV7, to: CoordV7): string => {
      const preview = queryCombatPreviewV7(
        view,
        unitAt(view, from).id,
        unitAt(view, to).id,
      );
      if (preview === null) throw new Error("preview missing");
      return `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker}`;
    };
    expect(acid).toMatchObject({
      previewLabel: label(own, AT.spitter, AT.acidTarget),
      previewNote: "Acid: ignores cover and fortification",
    });
    expect(acid?.semanticLabel).toContain(
      "Acid ignores the defender's cover and fortification.",
    );
    const enemy = humanView(dinosaurEnemyFixtureV7());
    expect(
      planFor(enemy, DINOSAUR_ENEMY_V7.knight).targets.find(
        (target) => target.family === "ATTACK",
      ),
    ).toMatchObject({ previewNote: ARMOURED_PREVIEW_V7 });
    // An Egg never retaliates.
    const eggLabels = [
      DINOSAUR_ENEMY_V7.raptorEgg,
      DINOSAUR_ENEMY_V7.tRexEgg,
    ].map((at) => [at, label(enemy, DINOSAUR_ENEMY_V7.fighter, at)]);
    expect(
      planFor(enemy, DINOSAUR_ENEMY_V7.fighter)
        .targets.filter((target) => target.family === "ATTACK")
        .map((target) => [target.at, target.previewLabel]),
    ).toEqual(eggLabels);
    for (const [, text] of eggLabels) expect(text).toMatch(/ · take 0$/);
  });
});

describe("Revision 19 board drawing", () => {
  const egg = (
    extra: Partial<BoardRenderPlanEntryV7> = {},
  ): BoardRenderPlanEntryV7 => ({
    key: "unit:7",
    kind: "UNIT",
    layer: 5,
    at: { x: 1, y: 1 },
    assetId: EGG_CODE_ART_ID_V7,
    artSubject: "UNIT:DINOSAUR:EGG",
    faction: "DINOSAUR",
    ownerColor: "#e85d5d",
    ownerSeat: 0,
    hp: 6,
    maxHp: 6,
    egg: { turnsRemaining: 2 },
    ...extra,
  });
  const plan = (
    entries: readonly BoardRenderPlanEntryV7[],
  ): BoardRenderPlanV7 => ({ version: 7, entries, targets: [] });

  it("draws the LEGACY Egg in code with its countdown, and an HP bar only when damaged", () => {
    const full = draw(plan([egg()]));
    // Nest and shell ellipses, no raster, the seat number and the countdown.
    expect(full.filter((call) => call[0] === "ellipse").length).toBe(4);
    expect(full.some((call) => call[0] === "drawImage")).toBe(false);
    expect(texts(full)).toEqual(["1", "2"]);
    // The owner colour paints the band and rings the countdown chip.
    expect(
      full.filter((call) => call[0] === "set" && call[2] === "#e85d5d").length,
    ).toBeGreaterThanOrEqual(3);
    const hpBar = (log: readonly LogEntry[]) =>
      log.filter((call) => call[0] === "set" && call[2] === "#65d889").length;
    expect(hpBar(full)).toBe(0);
    expect(hpBar(draw(plan([egg({ hp: 3 })])))).toBe(1);
    // No faction badge on an Egg: the badge disc's blue is never set.
    expect(full.some((call) => call[2] === "#7f9cc4")).toBe(false);
  });

  it("draws the CHIBI Egg from its raster with the countdown in the CHIBI frame", () => {
    const chibiArt = fakeChibi([chibiAsset("UNIT:DINOSAUR:EGG", 48, 48)]);
    const camera = { offsetX: 100, offsetY: 100, zoom: chibiCameraZoom(1) };
    const log = draw(plan([egg()]), { artSet: "CHIBI", chibiArt, camera });
    expect(log.filter((call) => call[0] === "drawImage")).toHaveLength(1);
    expect(log.some((call) => call[0] === "ellipse")).toBe(false);
    const countdown = log.find(
      (call) => call[0] === "fillText" && call[1] === "2",
    );
    const cell = 128 * camera.zoom;
    expect(countdown?.[2]).toBeCloseTo(
      100 + cell + EGG_COUNTDOWN_FRAME_V7.chibi.cx * camera.zoom,
    );
  });

  it("marks Big with one chevron and Alpha with two, in both art sets", () => {
    const grown = (stage: 1 | 2 | null): BoardRenderPlanEntryV7 => ({
      key: "unit:9",
      kind: "UNIT",
      layer: 5,
      at: { x: 1, y: 1 },
      assetId: "unit-knight",
      artSubject: "UNIT:DINOSAUR:KNIGHT",
      faction: "DINOSAUR",
      ownerColor: "#e85d5d",
      ownerSeat: 0,
      hp: 10,
      maxHp: 10,
      ...(stage === null ? {} : { growthStage: stage }),
    });
    const chevrons = (log: readonly LogEntry[]) =>
      log.filter(
        (call) =>
          call[0] === "set" &&
          call[1] === "strokeStyle" &&
          call[2] === "#efe6c8",
      ).length;
    // Each chevron is stroked twice: a black outline, then cream.
    for (const stage of [1, 2] as const) {
      const { context, log } = recordingContext();
      drawGrowthChevronsV7(context, 0, 0, 1, stage, {
        chibi: false,
        highContrast: false,
      });
      expect(log.filter((call) => call[0] === "stroke")).toHaveLength(
        stage * 2,
      );
      expect(log.filter((call) => call[0] === "lineTo")).toHaveLength(
        stage * 4,
      );
    }
    expect(chevrons(draw(plan([grown(1)])))).toBeGreaterThan(0);
    const chibiArt = fakeChibi([chibiAsset("UNIT:DINOSAUR:KNIGHT", 72, 88)]);
    const camera = { offsetX: 100, offsetY: 100, zoom: chibiCameraZoom(1) };
    const base = draw(plan([grown(null)]), {
      artSet: "CHIBI",
      chibiArt,
      camera,
    }).find((call) => call[0] === "drawImage");
    for (const [stage, scale] of [
      [1, 1.125],
      [2, 1.25],
    ] as const) {
      const log = draw(plan([grown(stage)]), {
        artSet: "CHIBI",
        chibiArt,
        camera,
      });
      const image = log.find((call) => call[0] === "drawImage");
      // Larger about the feet: the same bottom-centre, a scaled size.
      expect(image?.[4]).toBeCloseTo(72 * scale);
      expect(image?.[5]).toBeCloseTo(88 * scale);
      expect((image?.[2] as number) + (image?.[4] as number) / 2).toBeCloseTo(
        (base?.[2] as number) + 36,
      );
      expect((image?.[3] as number) + (image?.[5] as number)).toBeCloseTo(
        (base?.[3] as number) + 88,
      );
      expect(chevrons(log)).toBeGreaterThan(0);
    }
    // High contrast keeps the shape and swaps cream for white.
    const { context, log } = recordingContext();
    drawGrowthChevronsV7(context, 0, 0, 1, 2, {
      chibi: true,
      highContrast: true,
    });
    expect(log.some((call) => call[2] === "#ffffff")).toBe(true);
    expect(GROWTH_MARKER_FRAME_V7.chibi.width * chibiCameraZoom(1)).toBe(10);
  });

  it("caps the growth scale at 96 CSS px and never shrinks a sprite", () => {
    expect(growthSpriteScaleV7(undefined, 56)).toBe(1);
    expect(growthSpriteScaleV7(0, 56)).toBe(1);
    expect(growthSpriteScaleV7(1, 56)).toBe(1.125);
    expect(growthSpriteScaleV7(2, 56)).toBe(1.25);
    expect(growthSpriteScaleV7(2, 72)).toBe(1.25);
    expect(growthSpriteScaleV7(1, 88)).toBeCloseTo(96 / 88);
    expect(growthSpriteScaleV7(2, 88)).toBeCloseTo(96 / 88);
    expect(growthSpriteScaleV7(2, 104)).toBe(1);
  });

  it("scales a pulsed unit about its feet and shifts a wobbling Egg", () => {
    const chibiArt = fakeChibi([chibiAsset("UNIT:DINOSAUR:EGG", 48, 48)]);
    const camera = { offsetX: 100, offsetY: 100, zoom: chibiCameraZoom(1) };
    const image = (
      unitPulses: Parameters<typeof drawBoardV7>[0]["unitPulses"],
    ) =>
      draw(plan([egg()]), {
        artSet: "CHIBI",
        chibiArt,
        camera,
        ...(unitPulses === undefined ? {} : { unitPulses }),
      }).find((call) => call[0] === "drawImage");
    const still = image(undefined);
    const small = image([{ unitId: 7, scale: 0.5 }]);
    expect(small?.[4]).toBeCloseTo(24);
    expect((small?.[3] as number) + 24).toBeCloseTo(
      (still?.[3] as number) + 48,
    );
    const shifted = image([{ unitId: 7, scale: 1, offsetXCssPx: 3 }]);
    expect(shifted?.[2]).toBeCloseTo((still?.[2] as number) + 3);
    // Another unit's pulse leaves this sprite alone.
    expect(image([{ unitId: 8, scale: 2 }])).toEqual(still);
  });

  it("draws a countdown number, lane arrows and each cue in the unowned palette", () => {
    const owner = "#12a4a4";
    const countdown = recordingContext();
    drawEggCountdownV7(countdown.context, 0, 0, 0.3, 3, {
      chibi: true,
      ownerColor: owner,
      highContrast: false,
    });
    expect(texts(countdown.log)).toEqual(["3"]);
    // The chip never shrinks below 8 CSS px, so the number stays 10 px.
    expect(countdown.log.find((call) => call[0] === "arc")?.[3]).toBe(8);
    expect(
      countdown.log.find(
        (call) => call[0] === "set" && call[1] === "font",
      )?.[2],
    ).toBe("800 10px system-ui");
    const lane = recordingContext();
    drawStampedeLaneCellV7(
      lane.context,
      0,
      0,
      1,
      { dx: 1, dy: 0, stand: false },
      false,
    );
    // Two arrowheads on a run tile, each outlined then filled; no outline box.
    expect(lane.log.filter((call) => call[0] === "stroke")).toHaveLength(4);
    expect(lane.log.some((call) => call[0] === "strokeRect")).toBe(false);
    const stand = recordingContext();
    drawStampedeLaneCellV7(
      stand.context,
      0,
      0,
      1,
      { dx: 0, dy: 1, stand: true },
      false,
    );
    expect(stand.log.filter((call) => call[0] === "strokeRect")).toHaveLength(
      2,
    );
    expect(stand.log.filter((call) => call[0] === "stroke")).toHaveLength(2);
    const allowed = new Set([
      "#ffffff",
      "#efe6c8",
      "#aeb6c2",
      "#5b616c",
      "#33363d",
      "#000000",
    ]);
    for (const effect of [
      "STAMPEDE_RUN",
      "STAMPEDE_HIT",
      "ACID_HIT",
      "HATCH",
      "HATCH_CALL",
      "EGG_DESTROYED",
    ] as const)
      for (const progress of [0.2, 0.5, 0.8]) {
        const cue = recordingContext();
        drawDinosaurFeedbackV7(
          cue.context,
          { offsetX: 0, offsetY: 0, zoom: 1 },
          {
            effect,
            cells: [
              { x: 1, y: 1 },
              { x: 2, y: 1 },
            ],
            from: { x: 0, y: 1 },
            progress,
          },
        );
        const colours = cue.log.filter(
          (call) =>
            call[0] === "set" &&
            (call[1] === "fillStyle" || call[1] === "strokeStyle"),
        );
        expect(colours.length, `${effect} at ${progress}`).toBeGreaterThan(0);
        for (const colour of colours)
          expect(allowed.has(String(colour[2])), String(colour[2])).toBe(true);
      }
  });

  it("times the sprite cues: a laid Egg bounces, a hatchling grows in, growth pulses", () => {
    const step = (
      effect: "EGG_LAID" | "HATCH" | "GROW" | "STAMPEDE_HIT",
    ): Parameters<typeof dinosaurUnitPulsesV7>[0] => ({
      kind: "DINOSAUR",
      effect,
      cells: [{ x: 1, y: 1 }],
      unitIds: [4, 5],
      durationMs: 300,
    });
    expect(dinosaurUnitPulsesV7(step("EGG_LAID"), 0, 1)).toEqual([
      { unitId: 4, scale: 0.6 },
      { unitId: 5, scale: 0.6 },
    ]);
    expect(
      dinosaurUnitPulsesV7(step("EGG_LAID"), 0.6, 1)[0]?.scale,
    ).toBeCloseTo(1.15);
    expect(dinosaurUnitPulsesV7(step("EGG_LAID"), 1, 1)[0]?.scale).toBeCloseTo(
      1,
    );
    // The Egg wobbles before it cracks, then the hatchling grows from x0.6.
    const wobble = dinosaurUnitPulsesV7(step("HATCH"), 0.05625, 1)[0];
    expect(wobble?.scale).toBe(1);
    expect(wobble?.offsetXCssPx).toBeCloseTo(4.8);
    expect(dinosaurUnitPulsesV7(step("HATCH"), 0.45, 1)[0]).toEqual({
      unitId: 4,
      scale: 0.6,
    });
    expect(dinosaurUnitPulsesV7(step("HATCH"), 1, 1)[0]?.scale).toBeCloseTo(1);
    expect(dinosaurUnitPulsesV7(step("GROW"), 0.5, 1)[0]?.scale).toBeCloseTo(
      1.2,
    );
    expect(dinosaurUnitPulsesV7(step("GROW"), 1, 1)[0]?.scale).toBeCloseTo(1);
    expect(dinosaurUnitPulsesV7(step("STAMPEDE_HIT"), 0.5, 1)).toEqual([]);
  });
});
