import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanV7,
  type BoardSelectionV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { SERPENT_CODE_ART_ID_V7 } from "../../src/render/canvas/curiosity-canvas-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import {
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  CURIOSITIES_SETUP_HINT_V7,
  CURIOSITY_LABELS_V7,
  CURIOSITY_RULES_V7,
  SEA_SERPENT_RULE_V7,
  SERPENT_OUT_OF_REACH_V7,
  SERPENT_PROVOKE_WARNING_V7,
  SERPENT_RETALIATES_V7,
  curiosityBoundaryNoticeV7,
  curiosityHelpRulesV7,
  curiosityIconSubjectV7,
  curiosityOverlayOnTileV7,
  monsterInfoLinesV7,
  monsterRetaliationNoteV7,
  neutralArtSubjectsV7,
  provokeMoveWarningV7,
} from "../../src/render/curiosity-presentation-v7";
import {
  GALLERY_CURIOSITY_GRID_V7,
  galleryCuriosityCellV7,
  galleryCuriosityDetailsV7,
} from "../../src/render/gallery-presentation-v7";
import { serpentFigureV7 } from "../../src/render/dom/curiosity-dom-v7";
import { seaBeastAttacksV7 } from "../../src/audio/sound-events-v7";
import { SOUND_IDS_V1 } from "../../src/audio/sound-manifest";
import {
  SERPENT_UI_V7,
  serpentUiFixtureV7,
} from "../fixtures/v7-curiosities-serpent-ui";
import { serpentArenaV7, serpentOfV7 } from "../fixtures/v7-serpent-arena";

/**
 * Map curiosities round 3 B in the interface (bead pulp_wars-737.21,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 12): the Serpent's
 * words, its board entries (its sprite, its lair under it, its area and
 * reach when selected), the live raster and the classic code marker, the
 * Gallery's fifth cell of the third row, and its bite's sound. Hand-built
 * boards only.
 */
type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    { measureText: () => ({ width: 20 }) },
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
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
  return { context: context as unknown as CanvasRenderingContext2D, log };
}

const liveArt: ChibiBoardArtV7 = {
  resolve: (request) => {
    const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(request.subject)[0];
    return asset === undefined
      ? { kind: "MISSING" }
      : {
          kind: "READY",
          asset,
          image: { assetId: asset.id } as unknown as CanvasImageSource,
          density: 1,
          smoothing: false,
          cacheKey: asset.id,
        };
  },
};
const classicArt: ChibiBoardArtV7 = { resolve: () => ({ kind: "MISSING" }) };
const camera = { zoom: chibiCameraZoom(1), offsetX: 40, offsetY: 40 };
const AT = SERPENT_UI_V7;
const P1 = 1 as PlayerId;
const key = (at: CoordV7) => `${at.x},${at.y}`;

function plan(
  state: GameStateV7,
  selection: BoardSelectionV7 | null = null,
): BoardRenderPlanV7 {
  const view = viewForV7(state, state.humanPlayerId);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection,
    selectedUnitId: selection?.kind === "UNIT" ? selection.unitId : null,
    selectedAchievement: null,
  });
}

function draw(look: "LIVE" | "CLASSIC", board: BoardRenderPlanV7): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1800, height: 1800 },
    devicePixelRatio: 1,
    camera,
    plan: {
      ...board,
      entries: board.entries.filter((entry) => entry.kind !== "TERRAIN"),
    },
    reducedMotion: true,
    chibiArt: classicArt,
    ...(look === "LIVE"
      ? {
          direction: {
            spec: LIVE_DIRECTION_V7,
            art: createDirectedChibiArtV7({
              base: classicArt,
              samples: liveArt,
              direction: LIVE_DIRECTION_V7,
              environment: {
                readPixels: (_image, width, height) =>
                  new Uint8ClampedArray(width * height * 4).fill(200),
                createSurface: (pixels, width, height) =>
                  ({ pixels, width, height }) as unknown as CanvasImageSource,
              },
            }),
          },
        }
      : {}),
  });
  return log;
}

const imagesDrawn = (log: readonly LogEntry[]): string[] =>
  log
    .filter((call) => call[0] === "drawImage")
    .map((call) => (call[1] as { assetId?: string }).assetId ?? "?");

describe("the Sea Serpent's words (section 12.1)", () => {
  const state = serpentUiFixtureV7();
  const view = viewForV7(state, P1);
  const serpent = serpentOfV7(state);

  it("has its one sentence, its lair, its Help line and the setup hint", () => {
    expect(SEA_SERPENT_RULE_V7).toBe(
      "A Sea Serpent owned by nobody prowls its waters and, after every round, swims up to 2 tiles to bite the weakest unit that came next to it or hurt it.",
    );
    expect(CURIOSITY_LABELS_V7.SERPENT_LAIR).toBe("Serpent's lair");
    expect(CURIOSITY_RULES_V7.SERPENT_LAIR).toBe(SEA_SERPENT_RULE_V7);
    expect(curiosityOverlayOnTileV7(view, AT.serpent)).toBe("SERPENT_LAIR");
    expect(curiosityHelpRulesV7()).toContainEqual({
      icon: "SEA_SERPENT",
      name: "Sea Serpent",
      rule: SEA_SERPENT_RULE_V7,
    });
    expect(curiosityIconSubjectV7("SEA_SERPENT")).toBe(
      "ICON:CURIOSITY:SEA_SERPENT",
    );
    expect(curiosityIconSubjectV7("SERPENT_LAIR")).toBe(
      "ICON:CURIOSITY:SEA_SERPENT",
    );
    expect(CURIOSITIES_SETUP_HINT_V7).toMatch(/a sea serpent/);
    expect(neutralArtSubjectsV7("SEA_SERPENT", "BATTLESHIP")).toEqual({
      unit: "UNIT:NEUTRAL_SEA_SERPENT",
      portrait: "PORTRAIT:NEUTRAL_SEA_SERPENT",
    });
  });

  it("states its regeneration, bounty, and whom it will bite", () => {
    const lines = monsterInfoLinesV7(view, serpent.id);
    expect(lines.map((line) => [line.id, line.description])).toEqual([
      ["neutral", SEA_SERPENT_RULE_V7],
      ["regeneration", "+4 HP after every round."],
      ["bounty", "15 Coins for the kill."],
      ["provoked", "Will bite your Patrol Boat after this round."],
    ]);
  });

  it("warns a Move that ends next to it", () => {
    const transport = state.units.find(
      (unit) => key(unit.at) === key(AT.battleship),
    );
    const move = queryPlayerCommandsV7(view).find(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" &&
        command.unitId === transport?.id &&
        Math.max(
          Math.abs((command.path.at(-1)?.x ?? 0) - AT.serpent.x),
          Math.abs((command.path.at(-1)?.y ?? 0) - AT.serpent.y),
        ) === 1,
    );
    if (move === undefined) throw new Error("no Move next to the Serpent");
    expect(provokeMoveWarningV7(view, move)).toBe(SERPENT_PROVOKE_WARNING_V7);
    expect(SERPENT_PROVOKE_WARNING_V7).toBe(
      "Ends next to the Sea Serpent: it will bite after this round.",
    );
  });

  it("says whether an attack on it is answered next round", () => {
    const battleship = state.units.find(
      (unit) => key(unit.at) === key(AT.battleship),
    );
    const preview = queryCombatPreviewV7(
      view,
      battleship?.id as never,
      serpent.id,
    );
    if (preview === null) throw new Error("no preview");
    expect(monsterRetaliationNoteV7(view, preview)).toBe(SERPENT_RETALIATES_V7);
    expect(
      monsterRetaliationNoteV7(view, { ...preview, monsterRetaliates: false }),
    ).toBe(SERPENT_OUT_OF_REACH_V7);
  });

  it("logs its bite: The wilds stir · Sea Serpent bit your Patrol Boat", () => {
    const ended = applyCommandV7(state, P1, { kind: "END_TURN" });
    if (!ended.accepted) throw new Error(ended.error.code);
    const projected = projectEventsV7(state, ended.state, P1, ended.events);
    const notice = curiosityBoundaryNoticeV7(
      projected.events,
      view,
      viewForV7(ended.state, P1),
    );
    expect(notice?.text).toMatch(
      /^The wilds stir · Sea Serpent bit your Patrol Boat/,
    );
    expect(notice?.toast).toBe(true);
  });

  it("bites with its own sound, a hiss and a splash", () => {
    expect(SOUND_IDS_V1).toContain("attack.serpent");
    expect(seaBeastAttacksV7([view], serpent.id)).toBe("attack.serpent");
  });
});

describe("the Sea Serpent on the board (section 12.1)", () => {
  const state = serpentUiFixtureV7();
  const serpent = serpentOfV7(state);

  it("draws its lair under it and its own sprite with no owner colour", () => {
    const entries = plan(state).entries;
    const lair = entries.find((entry) => entry.key.startsWith("curiosity:"));
    expect(lair).toMatchObject({
      kind: "CURIOSITY",
      layer: 3.5,
      at: AT.serpent,
      artSubject: "CURIOSITY:SERPENT_LAIR",
      curiosity: "SERPENT_LAIR",
      label: "Serpent's lair",
    });
    const unit = entries.find((entry) => entry.key === `unit:${serpent.id}`);
    expect(unit).toMatchObject({
      artSubject: "UNIT:NEUTRAL_SEA_SERPENT",
      assetId: SERPENT_CODE_ART_ID_V7,
      label: "Sea Serpent",
      monster: { provoked: true, breed: "SEA_SERPENT" },
    });
    expect(unit && "ownerColor" in unit ? unit.ownerColor : undefined).toBe(
      undefined,
    );
  });

  it("outlines its area and shades its reach when selected, or its lair", () => {
    for (const selection of [
      { kind: "UNIT", unitId: serpent.id },
      { kind: "TILE", at: AT.serpent },
    ] as const) {
      const entries = plan(state, selection).entries;
      expect(
        entries.filter((entry) =>
          entry.key.startsWith("ability-area:MONSTER_AREA:"),
        ).length,
      ).toBeGreaterThan(20);
      expect(
        entries.some(
          (entry) => entry.key === "ability-area:MONSTER_REACH:6,10",
        ),
      ).toBe(true);
    }
  });

  it("LIVE: draws the Serpent and its lair from the live rasters", () => {
    const images = imagesDrawn(draw("LIVE", plan(state)));
    expect(images).toContain("chibi-curiosity-sea-serpent");
    expect(images).toContain("chibi-curiosity-serpent-lair");
  });

  it("CLASSIC: draws its code disc and the rocks, never a raster or a missing-art letter", () => {
    const log = draw("CLASSIC", plan(state));
    expect(
      imagesDrawn(log).filter((id) => id.startsWith("chibi-curiosity")),
    ).toEqual([]);
    expect(log.filter((entry) => entry[0] === "fillText")).not.toContainEqual(
      expect.arrayContaining(["S"]),
    );
    expect(
      log.filter((entry) => entry[0] === "ellipse").length,
    ).toBeGreaterThanOrEqual(7);
  });

  it("gives the dock a code figure in the classic look", () => {
    expect(typeof serpentFigureV7).toBe("function");
  });
});

describe("the Gallery's Serpent (section 12.1)", () => {
  it("fills the fifth cell of the third row", () => {
    expect(GALLERY_CURIOSITY_GRID_V7[2]).toEqual([
      "TESLA_TOWER",
      "MOON_GUN",
      "GOLD_CLAIM",
      "LOST_EXPEDITION",
      "SEA_SERPENT",
    ]);
    expect(galleryCuriosityCellV7("SEA_SERPENT")).toEqual({
      row: "SEA_SERPENT",
      name: "Sea Serpent",
      subject: "UNIT:NEUTRAL_SEA_SERPENT",
      ground: "TERRAIN:DEEP_WATER",
      portrait: "PORTRAIT:NEUTRAL_SEA_SERPENT",
    });
    const details = galleryCuriosityDetailsV7("SEA_SERPENT");
    expect(details.description).toBe(SEA_SERPENT_RULE_V7);
    expect(details.stats).toEqual([
      { label: "HP", value: "32" },
      { label: "Attack", value: "3.5" },
      { label: "Defense", value: "2.5" },
      { label: "Move", value: "2" },
      { label: "Range", value: "1" },
    ]);
  });

  it("is absent from a board with no Serpent", () => {
    const empty = serpentArenaV7({ home: null });
    expect(
      plan(empty).entries.some((entry) => entry.kind === "CURIOSITY"),
    ).toBe(false);
  });
});
