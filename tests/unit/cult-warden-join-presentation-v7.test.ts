import { describe, expect, it } from "vitest";
import {
  SWITCHEROO_RANGE_V7,
  previewJoinChantV7,
  previewWardenV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  IDOL_RING_CASING_V7,
  buildBoardRenderPlanV7,
  focusedCultPreviewV7,
  type BoardRenderInteractionV7,
} from "../../src/render/canvas/board-renderer-v7";
import { cultUnitMarkersV7 } from "../../src/render/canvas/cult-channel-board-plan-v7";
import {
  CULT_MARKER_FRAME_V7,
  drawCultUnitMarkersV7,
} from "../../src/render/canvas/cult-channel-canvas-v7";
import {
  joinChantFocusV7,
  starfallForecastKeyV7,
} from "../../src/render/canvas/cult-ritual-board-plan-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { tileActionPlanForSelectionV7 } from "../../src/render/canvas/tile-actions-v7";
import {
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  AWESTRUCK_LABEL_V7,
  AWESTRUCK_REASON_V7,
  AWESTRUCK_STATUS_V7,
  IDOL_HALVED_PREVIEW_V7,
  IDOL_HALVED_SEMANTIC_V7,
  SHIELDED_LABEL_V7,
  SHIELDED_STATUS_V7,
  cultChannelChipsV7,
  wardenCombatNotesV7,
  wardenTileLinesV7,
} from "../../src/render/cult-channel-presentation-v7";
import {
  UNIT_STATUS_IDS_V7,
  statusGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import { withFrogsV7 } from "../fixtures/v7-cult";
import {
  CULT_RITUAL_UI_V7,
  CULT_TRICK_UI_V7,
  CULT_WARDEN_UI_V7,
  cultJoinUiFixtureV7,
  cultTricksUiFixtureV7,
  cultWardenRivalUiFixtureV7,
  cultWardenUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";

/**
 * The Cult redesign's interface, U-R2 (bead `pulp_wars-mch9.43`;
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 8.1 to 8.3 and 13): the
 * warden's chalk ring, the small idol on each unit its shield wall covers,
 * the halved shot in an attack's preview and its cursor line, the
 * Awestruck tether and the grey reason on the targets an Awestruck unit
 * may not take; the join icon on a pending Stargazer and the live preview
 * of a focused join; Switcheroo's reach of 4. Hand-built states only: no
 * match is played.
 */

const W = CULT_WARDEN_UI_V7;
const R = CULT_RITUAL_UI_V7;
const T = CULT_TRICK_UI_V7;

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;
const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, seatIdV7(state, 0));

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

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

function selected(
  state: GameStateV7,
  where: CoordV7,
  extra: (unitId: UnitId) => Partial<BoardRenderInteractionV7> = () => ({}),
) {
  const unitId = idAt(state, where);
  return planOf(viewOf(state), {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    ...extra(unitId),
  });
}

const noCoordinates = (text: string | undefined): void =>
  expect(text ?? "").not.toMatch(/\d+\s*,\s*\d+|#\d|\(\d/);

describe("the warden's aura on the board", () => {
  it("rings the standing idol's nine tiles and marks the own units it shields, for both sides", () => {
    for (const state of [
      cultWardenUiFixtureV7(),
      cultWardenRivalUiFixtureV7(),
    ]) {
      const view = viewOf(state);
      const plan = planOf(view);
      const ring = plan.entries.filter(
        (entry) => entry.abilityStyle === "IDOL_RING",
      );
      expect(ring.map((entry) => key(entry.at)).sort()).toEqual(
        [-1, 0, 1]
          .flatMap((dy) =>
            [-1, 0, 1].map((dx) =>
              key({ x: W.bearer.x + dx, y: W.bearer.y + dy }),
            ),
          )
          .sort(),
      );
      // Outlined once round: twelve outer edges.
      expect(
        ring.reduce((sum, entry) => sum + (entry.targetEdges?.length ?? 0), 0),
      ).toBe(12);
      // The small idol: the engine's own shielded list, never the bearer.
      const shielded = plan.entries
        .filter((entry) => entry.kind === "UNIT" && entry.cult?.shielded)
        .map((entry) => key(entry.at))
        .sort();
      expect(shielded).toEqual([key(W.initiate), key(W.stargazer)].sort());
      const bearer = idAt(state, W.bearer);
      expect(
        required(previewWardenV7(view, bearer)).shieldedUnitIds.map((id) =>
          key(required(view.units.find((unit) => unit.id === id)).at),
        ),
      ).toEqual(expect.arrayContaining(shielded));
      // The Awestruck tether from each enemy beside the bearer.
      expect(
        plan.entries
          .filter((entry) => entry.cultLink?.kind === "TAUNT")
          .map((entry) => [key(entry.at), key(required(entry.linkTo))])
          .sort(),
      ).toEqual(
        [
          [key(W.fighter), key(W.bearer)],
          [key(W.knight), key(W.bearer)],
        ].sort(),
      );
      for (const entry of plan.entries) noCoordinates(entry.label);
    }
  });

  it("drops the ring, the idols and the tethers while the idol is down (a frog)", () => {
    const state = withFrogsV7(cultWardenUiFixtureV7(), [W.bearer]);
    const plan = planOf(viewOf(state));
    expect(
      plan.entries.filter((entry) => entry.abilityStyle === "IDOL_RING"),
    ).toEqual([]);
    expect(
      plan.entries.some(
        (entry) => entry.kind === "UNIT" && entry.cult?.shielded === true,
      ),
    ).toBe(false);
    expect(plan.entries.some((entry) => entry.cultLink?.kind === "TAUNT")).toBe(
      false,
    );
  });

  it("puts the Shielded chip on a covered unit and Awestruck on a held enemy, each with its glossary entry", () => {
    const state = cultWardenUiFixtureV7();
    const view = viewOf(state);
    const unit = (where: CoordV7) =>
      required(
        view.units.find((candidate) => key(candidate.at) === key(where)),
      );
    const ids = (where: CoordV7) =>
      cultChannelChipsV7(view, unit(where)).map((chip) => [
        chip.id,
        chip.label,
      ]);
    expect(ids(W.initiate)).toEqual([["shielded", SHIELDED_LABEL_V7]]);
    expect(ids(W.knight)).toEqual([["awestruck", AWESTRUCK_LABEL_V7]]);
    expect(ids(W.hexer)).toEqual([]);
    expect(ids(W.archer)).toEqual([]);
    expect(ids(W.bearer)).toEqual([["idol", "Idol raised"]]);
    for (const [id, name] of [
      ["shielded", "Shielded"],
      ["awestruck", "Awestruck"],
    ] as const) {
      expect(UNIT_STATUS_IDS_V7).toContain(id);
      const entry = required(statusGlossaryV7(id));
      expect(entry.name).toBe(name);
      // Plain words, no formulas.
      expect(entry.text).not.toMatch(/\d\s*[x×/*]\s*\d|=/);
    }
  });
});

describe("the cursor's lines of the warden", () => {
  it("reads Shielded and Awestruck on their tiles in one sentence each, and nothing elsewhere", () => {
    for (const state of [
      cultWardenUiFixtureV7(),
      cultWardenRivalUiFixtureV7(),
    ]) {
      const view = viewOf(state);
      expect(wardenTileLinesV7(view, W.initiate)).toEqual([
        `${SHIELDED_LABEL_V7}: ${SHIELDED_STATUS_V7}`,
      ]);
      expect(wardenTileLinesV7(view, W.knight)).toEqual([
        `${AWESTRUCK_LABEL_V7}: ${AWESTRUCK_STATUS_V7}`,
      ]);
      for (const where of [W.bearer, W.hexer, W.archer, { x: 0, y: 0 }])
        expect(wardenTileLinesV7(view, where)).toEqual([]);
    }
  });
});

describe("the shield wall in a shot's preview", () => {
  it("notes the halving on a shot at a shielded unit, in the label's note and the cursor's line", () => {
    const state = cultWardenRivalUiFixtureV7();
    const view = viewOf(state);
    const archer = idAt(state, W.archer);
    const plan = selected(state, W.archer);
    const shot = required(
      plan.targets.find(
        (target) =>
          target.family === "ATTACK" && key(target.at) === key(W.initiate),
      ),
    );
    const preview = required(
      queryCombatPreviewV7(view, archer, idAt(state, W.initiate)),
    );
    expect(preview.idolHalved).toBe(true);
    expect(shot.previewNote ?? "").toContain(IDOL_HALVED_PREVIEW_V7);
    expect(shot.semanticLabel ?? "").toContain(IDOL_HALVED_SEMANTIC_V7);
    expect(shot.previewLabel).toBe(
      `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker}`,
    );
    // A unit off the ring, and the bearer itself, take the full shot.
    for (const where of [W.hexer, W.bearer]) {
      const plain = required(
        plan.targets.find(
          (target) =>
            target.family === "ATTACK" && key(target.at) === key(where),
        ),
      );
      expect(plain.previewNote ?? "").not.toContain(IDOL_HALVED_PREVIEW_V7);
      expect(plain.semanticLabel ?? "").not.toContain(IDOL_HALVED_SEMANTIC_V7);
    }
    noCoordinates(shot.previewNote);
    noCoordinates(shot.semanticLabel);
  });

  it("says nothing of an idol when none halves the shot", () => {
    expect(wardenCombatNotesV7({ idolHalved: false })).toEqual([]);
    expect(wardenCombatNotesV7({})).toEqual([]);
    expect(wardenCombatNotesV7({ idolHalved: true })).toEqual([
      IDOL_HALVED_PREVIEW_V7,
    ]);
  });
});

describe("Awestruck on the board", () => {
  it("leaves the Idol Bearer the only Attack target and greys each other unit in reach with its reason", () => {
    const state = cultWardenRivalUiFixtureV7();
    const plan = selected(state, W.knight);
    expect(
      plan.targets
        .filter((target) => target.family === "ATTACK")
        .map((target) => key(target.at)),
    ).toEqual([key(W.bearer)]);
    const grey = plan.entries.filter((entry) =>
      entry.key.startsWith("ability-target:AWESTRUCK:"),
    );
    expect(grey.map((entry) => key(entry.at)).sort()).toEqual(
      [key(W.initiate), key(W.hexer)].sort(),
    );
    for (const entry of grey) {
      expect(entry.label).toBe(AWESTRUCK_REASON_V7);
      expect(entry.abilityStyle).toBe("MARTIAN_BLOCKED");
    }
  });

  it("greys nothing for a free unit, an enemy's unit, or a unit with no attack left", () => {
    const rival = cultWardenRivalUiFixtureV7();
    // The Archer stands two tiles from the bearer: it is free.
    expect(
      selected(rival, W.archer).entries.some((entry) =>
        entry.key.startsWith("ability-target:AWESTRUCK:"),
      ),
    ).toBe(false);
    // The Cult player selecting the held Knight sees its tether, no greys.
    expect(
      selected(cultWardenUiFixtureV7(), W.knight).entries.some((entry) =>
        entry.key.startsWith("ability-target:AWESTRUCK:"),
      ),
    ).toBe(false);
    // The idol down: the Knight is free again.
    const down = withFrogsV7(rival, [W.bearer]);
    const free = selected(down, W.knight);
    expect(
      free.entries.some((entry) =>
        entry.key.startsWith("ability-target:AWESTRUCK:"),
      ),
    ).toBe(false);
    expect(
      free.targets
        .filter((target) => target.family === "ATTACK")
        .map((target) => key(target.at))
        .sort(),
    ).toEqual(expect.arrayContaining([key(W.initiate), key(W.hexer)]));
  });
});

describe("join the chant: the icon and the live preview", () => {
  it("badges the pending Stargazer with the join icon for a cultist beside it", () => {
    const state = cultJoinUiFixtureV7();
    const view = viewOf(state);
    const plan = required(
      tileActionPlanForSelectionV7(
        view,
        queryPlayerCommandsV7(view),
        idAt(state, R.chanter),
      ),
    );
    const tile = required(
      plan.tiles.find((entry) => key(entry.at) === key(R.stargazer)),
    );
    expect(
      tile.actions.map((action) => [action.id, action.raster, action.oneTap]),
    ).toEqual([["JOIN_CHANT", "ICON:ACTION:JOIN_CHANT", true]]);
    expect(tile.chooser).toBe(false);
  });

  it("shows the star's nine tiles with the joined damage on the focused badge, in place of its labels", () => {
    const state = cultJoinUiFixtureV7();
    const view = viewOf(state);
    const leader = idAt(state, R.stargazer);
    const plan = selected(state, R.chanter);
    // Nothing aimed: the star as it stands, 6 a unit.
    const standing = plan.entries.filter((entry) =>
      entry.key.startsWith(starfallForecastKeyV7(leader)),
    );
    expect(standing.map((entry) => entry.label)).toEqual(["−6", "−6", "−6"]);
    expect(standing.some((entry) => entry.lethal === true)).toBe(false);
    const focus = required(plan.focusPreviews?.[0]);
    expect(plan.focusPreviews).toHaveLength(1);
    expect(key(focus.at)).toBe(key(R.stargazer));
    expect(focus.cultFocus.supersedes).toBe(starfallForecastKeyV7(leader));
    const marks = new Map(
      (focus.cultFocus.marks ?? []).map((mark) => [key(mark.at), mark]),
    );
    // 6 + 3: the Knight at 8 HP now dies (it loses its 8, in red); the
    // own Initiate is striped.
    expect(marks.get(key(R.starKnight))).toEqual({
      at: R.starKnight,
      label: "−8",
      friendly: false,
      lethal: true,
    });
    expect(marks.get(key(R.starFighter))?.label).toBe("−9");
    expect(marks.get(key(R.starFighter))?.lethal).toBe(false);
    expect(marks.get(key(R.starInitiate))?.friendly).toBe(true);
    // The engine's own preview, mark for mark.
    const preview = required(
      previewJoinChantV7(view, idAt(state, R.chanter), leader),
    );
    expect(joinChantFocusV7(view, preview)).toEqual(focus.cultFocus);
    expect(preview.newlyKills).toContain(idAt(state, R.starKnight));
    for (const mark of focus.cultFocus.marks ?? [])
      expect(mark.lethal).toBe(
        preview.newlyKills.some(
          (unitId) =>
            key(required(view.units.find((unit) => unit.id === unitId)).at) ===
            key(mark.at),
        ),
      );
    // Shown only while the Stargazer's tile is hovered or focused.
    expect(focusedCultPreviewV7(plan, R.stargazer)).toBe(focus.cultFocus);
    expect(focusedCultPreviewV7(plan, null)).toBeUndefined();
    expect(focusedCultPreviewV7(plan, R.star)).toBeUndefined();
    for (const mark of focus.cultFocus.marks ?? []) noCoordinates(mark.label);
  });

  it("shows the same preview on the armed join's only target, and nothing for the Stargazer itself", () => {
    const state = cultJoinUiFixtureV7();
    const plan = selected(state, R.secondChanter, (unitId) => ({
      cultPick: { kind: "JOIN_CHANT", unitId },
    }));
    expect(plan.targets).toHaveLength(1);
    const target = required(plan.targets[0]);
    expect(target.family).toBe("JOIN_CHANT");
    expect(target.previewLabel).toBe("+3");
    expect(focusedCultPreviewV7(plan, null)).toBe(target.cultFocus);
    // An armed pick is not doubled by the badge's hover preview.
    expect(plan.focusPreviews).toBeUndefined();
    // The leader joins nothing.
    expect(selected(state, R.stargazer).focusPreviews).toBeUndefined();
  });
});

describe("Switcheroo's reach of 4", () => {
  it("outlines every tile within 4 of the Familiar while aimed, and offers the unit 4 tiles away", () => {
    const state = cultTricksUiFixtureV7();
    const plan = selected(state, T.familiar, (unitId) => ({
      cultPick: { kind: "SWITCHEROO", unitId },
    }));
    const view = viewOf(state);
    const reach = plan.entries.filter((entry) =>
      entry.key.startsWith("ability-area:SWITCHEROO_RANGE:"),
    );
    const inside = (at: CoordV7): boolean =>
      at.x >= 0 &&
      at.y >= 0 &&
      at.x < view.board.width &&
      at.y < view.board.height;
    const expected: string[] = [];
    for (let dy = -SWITCHEROO_RANGE_V7; dy <= SWITCHEROO_RANGE_V7; dy += 1)
      for (let dx = -SWITCHEROO_RANGE_V7; dx <= SWITCHEROO_RANGE_V7; dx += 1) {
        const at = { x: T.familiar.x + dx, y: T.familiar.y + dy };
        if (inside(at)) expected.push(key(at));
      }
    expect(SWITCHEROO_RANGE_V7).toBe(4);
    expect(reach.map((entry) => key(entry.at)).sort()).toEqual(expected.sort());
    expect(reach.every((entry) => entry.abilityStyle === "TRICK_RANGE")).toBe(
      true,
    );
    // The Summoner stands 4 away: a Swap target, and its badge unarmed.
    expect(
      plan.targets
        .filter((target) => target.family === "SWITCHEROO")
        .map((target) => key(target.at)),
    ).toContain(key(T.caller));
    const unarmed = required(
      tileActionPlanForSelectionV7(
        view,
        queryPlayerCommandsV7(view),
        idAt(state, T.familiar),
      ),
    );
    expect(
      unarmed.tiles
        .find((tile) => key(tile.at) === key(T.caller))
        ?.actions.map((action) => action.id),
    ).toContain("SWITCHEROO");
    // Nothing beyond 4 is a target.
    for (const target of plan.targets)
      expect(
        Math.max(
          Math.abs(target.at.x - T.familiar.x),
          Math.abs(target.at.y - T.familiar.y),
        ),
      ).toBeLessThanOrEqual(SWITCHEROO_RANGE_V7);
    // Unarmed, no reach is drawn.
    expect(
      selected(state, T.familiar).entries.some((entry) =>
        entry.key.startsWith("ability-area:SWITCHEROO_RANGE:"),
      ),
    ).toBe(false);
  });
});

/** A context that records its calls. */
function recorder() {
  const calls: { readonly name: string; readonly args: unknown[] }[] = [];
  const state: Record<string, unknown> = {};
  const context = new Proxy(state, {
    get: (target, name) =>
      name in target
        ? Reflect.get(target, name)
        : (...args: unknown[]) => {
            calls.push({ name: String(name), args });
          },
    set: (target, name, value) => {
      calls.push({ name: `set:${String(name)}`, args: [value] });
      return Reflect.set(target, name, value);
    },
  });
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

describe("the live look's rasters of the warden and the join", () => {
  it("resolves the shield wall's idol and the join icon from the direction's registry", () => {
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
    for (const [subject, id] of [
      ["ICON:STATUS:WARDED", "chibi-direction-icon-cult-status-warded"],
      ["ICON:ACTION:JOIN_CHANT", "chibi-direction-icon-cult-action-join-chant"],
    ] as const) {
      const resolved = art.resolve({
        subject,
        at: { x: 0, y: 0 },
        deviceScale: 1,
      });
      expect(resolved.kind, subject).toBe("READY");
      if (resolved.kind === "READY") expect(resolved.asset.id).toBe(id);
    }
  });
});

describe("the small idol of the shield wall", () => {
  it("draws the WARDED raster on a dark disc at the unit's lower left, or a code idol while it loads", () => {
    const image = { width: 48, height: 48 } as unknown as CanvasImageSource;
    const raster = recorder();
    drawCultUnitMarkersV7(raster.context, { shielded: true }, 200, 300, 1, {
      art: { warded: image },
    });
    const frame = CULT_MARKER_FRAME_V7.shield;
    const disc = raster.calls.find((call) => call.name === "arc");
    expect(disc?.args.slice(0, 3)).toEqual([
      200 + frame.x,
      300 + frame.y,
      frame.radius,
    ]);
    const drawn = raster.calls.filter((call) => call.name === "drawImage");
    expect(drawn).toHaveLength(1);
    expect(drawn[0]?.args[0]).toBe(image);
    const code = recorder();
    drawCultUnitMarkersV7(code.context, { shielded: true }, 200, 300, 1);
    expect(code.calls.some((call) => call.name === "drawImage")).toBe(false);
    expect(code.calls.some((call) => call.name === "roundRect")).toBe(true);
    // Nothing for a unit the wall does not cover.
    const none = recorder();
    drawCultUnitMarkersV7(none.context, {}, 200, 300, 1);
    expect(none.calls.some((call) => call.name === "arc")).toBe(false);
  });

  it("keeps the ring's casing dark and translucent, under the chalk", () => {
    expect(IDOL_RING_CASING_V7).toMatch(/^rgba\(16, 19, 28, 0\.\d+\)$/);
  });

  it("lists the shield wall in the channel markers only while an idol stands", () => {
    const state = cultWardenUiFixtureV7();
    const markers = cultUnitMarkersV7(viewOf(state));
    expect(markers.get(idAt(state, W.initiate))?.shielded).toBe(true);
    expect(markers.get(idAt(state, W.bearer))?.shielded).toBeUndefined();
    const down = cultUnitMarkersV7(viewOf(withFrogsV7(state, [W.bearer])));
    expect(down.get(idAt(state, W.initiate))?.shielded).toBeUndefined();
  });
});
