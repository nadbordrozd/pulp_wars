import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildChibiArtRegistryV7,
  CHIBI_CLASS_GEOMETRY_V7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  SUPPORT_EFFECT_SUBJECTS_V7,
  drawSupportFeedbackV7,
  type SupportEffectArtV7,
  type SupportEffectSubjectV7,
  type SupportFeedbackV7,
} from "../../src/render/canvas/support-presentation-v7";
import { AFFLICTION_MARKER_FRAME_V7 } from "../../src/render/canvas/undead-canvas-v7";
import {
  batchManifestProblems,
  type ChibiBatchManifest,
} from "../../scripts/art/chibi/batch-manifest";
import { loadFragments } from "../../scripts/art/chibi/pipeline";
import {
  offPalettePixels,
  paletteColours,
  paletteMapRaster,
} from "../../scripts/art/chibi/raster";
import {
  AFFLICTION_SHOWCASE_V7,
  afflictionHumanFixtureV7,
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

const HUMAN = AFFLICTION_SHOWCASE_V7.human;

describe("Undead effect and status art (bead pulp_wars-vkq.14)", () => {
  it("registers every effect subject and both markers in valid classes", () => {
    const { registry, problems } = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7);
    expect(problems).toEqual([]);
    for (const subject of [
      ...SUPPORT_EFFECT_SUBJECTS_V7,
      "STATUS:BITTEN",
    ] as ArtSubjectV7[]) {
      const [asset] = registry.variants(subject);
      expect(asset, subject).toBeDefined();
      expect(asset?.ownerMaskUrl, subject).toBeUndefined();
      const limits = CHIBI_CLASS_GEOMETRY_V7[asset?.assetClass ?? "EFFECT"];
      expect(asset?.width).toBeLessThanOrEqual(limits.maxWidth);
    }
    expect(registry.variants("STATUS:PLAGUED")[0]).toMatchObject({
      assetClass: "STATUS",
      width: 32,
      height: 32,
    });
  });

  it("plans the Lich splash burst and the Lifesteal drain", () => {
    const state = undeadShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const lich = unitAt(view, UNDEAD_SHOWCASE_V7.lich);
    const target = unitAt(view, UNDEAD_SHOWCASE_V7.lichTarget);
    const shot = boundary(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: lich.id,
      targetUnitId: target.id,
    });
    const steps = corePresentationPlanV7(shot.before, shot.events, shot.after);
    const kinds = steps.map((step) =>
      step.kind === "SUPPORT" ? `SUPPORT:${step.effect}` : step.kind,
    );
    // Shot, then the burst, then each splash impact.
    expect(kinds.slice(0, 2)).toEqual(["CATAPULT", "SUPPORT:SPLASH"]);
    expect(kinds.slice(2).every((kind) => kind === "DAMAGE")).toBe(true);
    expect(steps[1]).toMatchObject({
      actor: { unitId: target.id, at: target.at },
      recipients: UNDEAD_SHOWCASE_V7.lichSplash.map((at) =>
        expect.objectContaining({ at }),
      ),
    });

    const vampire = unitAt(view, UNDEAD_SHOWCASE_V7.vampire);
    const victim = unitAt(view, UNDEAD_SHOWCASE_V7.vampireTarget);
    const bite = boundary(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: vampire.id,
      targetUnitId: victim.id,
    });
    expect(
      corePresentationPlanV7(bite.before, bite.events, bite.after),
    ).toContainEqual({
      kind: "SUPPORT",
      effect: "LIFESTEAL",
      actor: { unitId: vampire.id, at: vampire.at },
      recipients: [{ unitId: victim.id, at: victim.at }],
      durationMs: 320,
    });
    // A melee attack never bursts.
    expect(
      corePresentationPlanV7(bite.before, bite.events, bite.after).filter(
        (step) => step.kind === "SUPPORT" && step.effect === "SPLASH",
      ),
    ).toEqual([]);
    // The same Lich shot seen as a Human Catapult (the owner is Human) has no burst.
    const human = (view: PlayerViewV7): PlayerViewV7 => ({
      ...view,
      players: view.players.map((player) => ({
        ...player,
        faction: "ORIGINAL" as const,
      })),
    });
    expect(
      corePresentationPlanV7(human(shot.before), shot.events, human(shot.after))
        .map((step) => step.kind)
        .slice(0, 2),
    ).toEqual(["CATAPULT", "DAMAGE"]);
  });

  it("follows a Tend that cures Plague or a bite with the cure sparkle", () => {
    const state = afflictionHumanFixtureV7();
    const humanId = state.humanPlayerId;
    const captain = unitAt(viewForV7(state, humanId), HUMAN.captain);
    const tend = boundary(state, humanId, {
      kind: "TEND_WOUNDED",
      unitId: captain.id,
    });
    const steps = corePresentationPlanV7(tend.before, tend.events, tend.after);
    const support = steps.flatMap((step) =>
      step.kind === "SUPPORT" ? [step.effect] : [],
    );
    expect(support).toEqual(["TEND", "CURE"]);
    const cure = steps.find(
      (step) => step.kind === "SUPPORT" && step.effect === "CURE",
    );
    const cured =
      cure?.kind === "SUPPORT" ? [cure.actor, ...cure.recipients] : [];
    expect(cured.length).toBeGreaterThan(0);
  });

  it("draws each Undead cue from its sprite in CHIBI and the code cue otherwise", () => {
    const camera = { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(1) };
    const images = new Map(
      SUPPORT_EFFECT_SUBJECTS_V7.map((subject) => [
        subject,
        { subject } as unknown as CanvasImageSource,
      ]),
    );
    const art: SupportEffectArtV7 = {
      devicePixelRatio: 2,
      image: (subject: SupportEffectSubjectV7) => ({
        image: images.get(subject) as CanvasImageSource,
        width: subject === "EFFECT:WISP" ? 24 : 32,
        height: subject === "EFFECT:WISP" ? 24 : 32,
      }),
    };
    const expected: Readonly<
      Partial<Record<SupportFeedbackV7["effect"], SupportEffectSubjectV7>>
    > = {
      WAIL: "EFFECT:WAIL",
      SPLASH: "EFFECT:SPLASH",
      RAISE: "EFFECT:RAISE",
      INFECT: "EFFECT:WISP",
      BITTEN: "EFFECT:WISP",
      LIFESTEAL: "EFFECT:WISP",
      PLAGUE: "STATUS:PLAGUED",
      CURE: "EFFECT:CURE",
    };
    for (const [effect, subject] of Object.entries(expected)) {
      const feedback = cue(effect as SupportFeedbackV7["effect"]);
      const chibi = recordingContext();
      drawSupportFeedbackV7(chibi.context, camera, feedback, false, art);
      const drawn = chibi.log.filter((call) => call[0] === "drawImage");
      expect(drawn.length, effect).toBeGreaterThan(0);
      expect(
        drawn.every((call) => call[1] === images.get(subject as never)),
        effect,
      ).toBe(true);
      // A 32 px sprite at zoom step 1 is 32 CSS px, snapped to DPR 2.
      for (const call of drawn) {
        expect(Number(call[2]) * 2).toBe(Math.round(Number(call[2]) * 2));
        expect(Number(call[3]) * 2).toBe(Math.round(Number(call[3]) * 2));
      }
      // LEGACY (no art) and an unloaded raster keep the code-drawn cue.
      for (const fallback of [
        null,
        { devicePixelRatio: 1, image: () => null },
      ]) {
        const legacy = recordingContext();
        drawSupportFeedbackV7(
          legacy.context,
          camera,
          feedback,
          false,
          fallback,
        );
        expect(
          legacy.log.filter((call) => call[0] === "drawImage"),
          effect,
        ).toEqual([]);
        expect(
          legacy.log.some((call) => call[0] === "arc" || call[0] === "lineTo"),
          effect,
        ).toBe(true);
      }
    }
    // Reduced motion freezes the cue at its midpoint: identical frames.
    const frozen = [0.1, 0.9].map((progress) => {
      const { context, log } = recordingContext();
      drawSupportFeedbackV7(
        context,
        camera,
        { ...cue("SPLASH"), progress },
        true,
        art,
      );
      return JSON.stringify(log.filter((call) => call[0] === "drawImage"));
    });
    expect(frozen[0]).toBe(frozen[1]);
  });

  it("draws the registered marker raster on a dark token in CHIBI, the code marker in high contrast", () => {
    const state = afflictionHumanFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const markers = new Map<string, CanvasImageSource>([
      ["STATUS:PLAGUED", { marker: "plague" } as unknown as CanvasImageSource],
      ["STATUS:BITTEN", { marker: "bite" } as unknown as CanvasImageSource],
    ]);
    const chibiArt = markerChibiArt(markers);
    const zoom = chibiCameraZoom(1);
    const camera = { offsetX: 0, offsetY: 0, zoom };
    const render = (highContrast: boolean) => {
      const { context, log } = recordingContext();
      drawBoardV7({
        context,
        viewport: { width: 2400, height: 2400 },
        devicePixelRatio: 2,
        camera,
        plan,
        images: { resolve: () => ({}) as CanvasImageSource },
        artSet: "CHIBI",
        chibiArt,
        highContrast,
      });
      return log;
    };
    const log = render(false);
    const at = HUMAN.doublyAfflicted;
    for (const [slot, subject] of [
      [0, "STATUS:PLAGUED"],
      [1, "STATUS:BITTEN"],
    ] as const) {
      const frame = AFFLICTION_MARKER_FRAME_V7.chibi[slot];
      const centreX = (at.x * 128 + frame.left + frame.size / 2) * zoom;
      const centreY = (at.y * 128 + frame.top + frame.size / 2) * zoom;
      const call = log.find(
        (entry) =>
          entry[0] === "drawImage" &&
          entry[1] === markers.get(subject) &&
          Math.abs(Number(entry[2]) + 8 - centreX) <= 0.5 &&
          Math.abs(Number(entry[3]) + 8 - centreY) <= 0.5,
      );
      // 16 CSS px at zoom step 1: the 32 px master 1:1 on DPR 2.
      expect(call?.slice(4), subject).toEqual([16, 16]);
      expect(
        log.some(
          (entry) =>
            entry[0] === "arc" &&
            Math.abs(Number(entry[1]) - centreX) < 1e-6 &&
            Math.abs(Number(entry[2]) - centreY) < 1e-6,
        ),
        `${subject} token`,
      ).toBe(true);
    }
    const contrast = render(true);
    expect(
      contrast.filter(
        (entry) =>
          entry[0] === "drawImage" &&
          [...markers.values()].includes(entry[1] as CanvasImageSource),
      ),
    ).toEqual([]);
  });

  it("maps a candidate onto its palette and validates the batch manifest", async () => {
    const palette = paletteColours({
      width: 2,
      height: 1,
      data: new Uint8Array([10, 10, 10, 255, 210, 226, 246, 255]),
    });
    const mapped = paletteMapRaster(
      {
        width: 3,
        height: 1,
        // Cyan and red candidates, plus a faint edge pixel.
        data: new Uint8Array([
          40, 200, 230, 255, 200, 30, 40, 255, 0, 0, 0, 90,
        ]),
      },
      palette,
    );
    expect([...mapped.data]).toEqual([
      210, 226, 246, 255, 10, 10, 10, 255, 0, 0, 0, 0,
    ]);
    expect(offPalettePixels(mapped, palette)).toBe(0);
    expect(
      offPalettePixels(
        { width: 1, height: 1, data: new Uint8Array([200, 30, 40, 255]) },
        palette,
      ),
    ).toBe(1);

    const fragments = await loadFragments(process.cwd());
    const manifest: ChibiBatchManifest = {
      schemaVersion: 1,
      batch: "effects-test",
      title: "test",
      bead: "pulp_wars-vkq.14",
      faction: "UNDEAD",
      dryRun: false,
      assets: [
        {
          id: "chibi-test-wisp",
          subject: "EFFECT:WISP",
          assetClass: "EFFECT",
          recipeClass: "effect",
          canvas: { width: 24, height: 24 },
        },
      ],
      recipes: [
        {
          id: "wisp-a",
          asset: "chibi-test-wisp",
          endpoint: "create-image-pixflux",
          seed: 1,
          requestSize: { width: 24, height: 24 },
        },
      ],
    };
    const problems = batchManifestProblems(manifest, fragments).join("\n");
    expect(problems).toMatch(/palette-map asset needs a palette/);
    expect(problems).toMatch(/Pixflux area must be at least 32x32/);
  });
});

function cue(effect: SupportFeedbackV7["effect"]): SupportFeedbackV7 {
  return {
    effect,
    actor: { unitId: 1, at: { x: 2, y: 2 } },
    recipients:
      effect === "INFECT" || effect === "BITTEN"
        ? []
        : [{ unitId: 2, at: { x: 3, y: 2 } }],
    progress: 0.4,
  };
}

function markerChibiArt(
  markers: ReadonlyMap<string, CanvasImageSource>,
): ChibiBoardArtV7 {
  return {
    resolve: (request) => {
      const marker = markers.get(request.subject);
      const unit =
        request.subject.startsWith("UNIT:") &&
        !request.subject.startsWith("UNIT:UNDEAD:");
      if (marker === undefined && !unit) return { kind: "MISSING" };
      return {
        kind: "READY",
        asset: {
          id: `fixture-${request.subject}`,
          subject: request.subject,
          assetClass: marker === undefined ? "STANDARD_UNIT" : "STATUS",
          width: marker === undefined ? 56 : 32,
          height: marker === undefined ? 80 : 32,
          url: "/fixture.png",
        },
        image:
          marker ??
          ({ subject: request.subject } as unknown as CanvasImageSource),
        density: 1,
        smoothing: false,
        cacheKey: request.subject,
      };
    },
  };
}

function boundary(
  state: GameStateV7,
  actor: number,
  command: CommandV7,
): {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: ReturnType<typeof projectEventsV7>;
} {
  const result = applyCommandV7(state, actor as never, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewForV7(state, actor as never),
    after: viewForV7(result.state, actor as never),
    events: projectEventsV7(state, result.state, actor as never, result.events),
  };
}

function unitAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["units"][number] {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("no unit at the fixture cell");
  return unit;
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: (readonly unknown[])[];
} {
  const log: (readonly unknown[])[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 7 })
            : key in target
              ? Reflect.get(target, key)
              : (...args: unknown[]) => {
                  log.push([String(key), ...args]);
                },
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}
