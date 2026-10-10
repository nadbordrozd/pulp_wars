import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewRampageV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  unitIsUnboundV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import { soundCuesForStepV7 } from "../../src/audio/sound-events-v7";
import {
  buildBoardRenderPlanV7,
  type BoardRenderInteractionV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  cultUnitMarkersV7,
  summonHelpersV7,
  type CultChannelPickV7,
} from "../../src/render/canvas/cult-channel-board-plan-v7";
import {
  CULT_EXTRA_PIPS_V7,
  cultControlPipsV7,
  drawCultBooJumpV7,
  drawCultControlPipsV7,
  drawCultGripV7,
  drawCultStrandV7,
  drawCultUnitMarkersV7,
} from "../../src/render/canvas/cult-channel-canvas-v7";
import {
  CULT_EFFECT_DURATIONS_V7,
  cultReducedMotionProgressV7,
  drawCultFeedbackV7,
  type CultFeedbackEffectV7,
} from "../../src/render/canvas/cult-effects-v7";
import { boardUnitNameV7 } from "../../src/render/canvas/board-host-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  ANCHOR_GRIPPING_V7,
  ANCHOR_NO_CULTIST_V7,
  BEHOLD_RAISED_V7,
  BOO_NOBODY_V7,
  CHANNEL_ALREADY_ACTED_V7,
  CHANNEL_FURIOUS_V7,
  CHANNEL_HOLDING_V7,
  CHANNEL_OUT_OF_REACH_V7,
  CULT_CHANNEL_KINDS_V7,
  SUMMON_NO_HELPER_V7,
  SUMMON_NO_TILE_V7,
  booSummaryV7,
  channelOfV7,
  cultChannelChipsV7,
  cultChannelNoticePartsV7,
  cultChannelUnavailableTextV7,
  daemonsShortV7,
  endTurnUnboundQuestionV7,
  type CultChannelKindV7,
} from "../../src/render/cult-channel-presentation-v7";
import { cultBoundaryNoticeV7 } from "../../src/render/cult-presentation-v7";
import {
  cultFieldV7,
  withFavourV7,
  withHorrorV7,
  withStrandsV7,
  withUnboundV7,
} from "../fixtures/v7-cult";
import {
  CULT_CHANNEL_UI_V7,
  cultChannelBusyUiFixtureV7,
  cultChannelDozenUiFixtureV7,
  cultChannelFuriousUiFixtureV7,
  cultChannelUnboundUiFixtureV7,
  cultChannelRivalUiFixtureV7,
  cultChannelShortUiFixtureV7,
  cultChannelUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { at } from "../fixtures/v7-revision20";

/**
 * The channel's interface (bead `pulp_wars-mch9.18`): what the board draws
 * of a lodge at work, what it marks while each action is aimed, why a
 * button cannot be used, what End Turn asks, and what each event plays.
 * Hand-built states only: no match is played.
 */

const A = CULT_CHANNEL_UI_V7;

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

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

/** The plan while the unit on `where` aims `pick`. */
function aimed(
  state: GameStateV7,
  where: CoordV7,
  pick: (unitId: UnitId) => CultChannelPickV7,
) {
  const unitId = idAt(state, where);
  return planOf(viewOf(state), {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    cultPick: pick(unitId),
  });
}

/** A command of `seat`, with the views and events of `viewerSeat`. */
function step(
  state: GameStateV7,
  command: CommandV7,
  seat = 0,
  viewerSeat = seat,
) {
  const applied = applyCommandV7(state, seatIdV7(state, seat), command);
  if (!applied.accepted) throw new Error(JSON.stringify(applied.error));
  const viewer = seatIdV7(state, viewerSeat);
  const before = viewForV7(state, viewer);
  const after = viewForV7(applied.state, viewer);
  const envelope = projectEventsV7(
    state,
    applied.state,
    viewer,
    applied.events,
  );
  return {
    state: applied.state,
    before,
    after,
    envelope,
    steps: corePresentationPlanV7(before, envelope, after),
  };
}

const cultSteps = (steps: ReturnType<typeof corePresentationPlanV7>) =>
  steps.flatMap((entry) =>
    entry.kind === "CULT"
      ? [[entry.effect, entry.from ?? null, entry.cells]]
      : [],
  );

/** A canvas context that records the calls and property sets it gets. */
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

describe("the channel on the board, for every viewer", () => {
  it("draws each strand, the grip, the idol's ring, the candles and the pips", () => {
    const state = cultChannelBusyUiFixtureV7();
    const plan = planOf(viewOf(state));
    const links = plan.entries.filter((entry) => entry.cultLink !== undefined);
    // One link per strand (in the order of the view's list), then the grip.
    expect(
      links.map((entry) => [entry.cultLink, entry.at, entry.linkTo]),
    ).toEqual([
      [{ kind: "STRAND", holds: true }, A.hexer, A.horror],
      [{ kind: "STRAND", holds: true }, A.channeller, A.horror],
      [{ kind: "GRIP", holds: true }, A.thing, A.channeller],
    ]);
    const marks = new Map(
      plan.entries.flatMap((entry) =>
        entry.kind === "UNIT" && entry.cult !== undefined
          ? [[`${entry.at.x},${entry.at.y}`, entry.cult] as const]
          : [],
      ),
    );
    // A candle over each channeller and over the Thing that grips one; the
    // gripped strand counts three, the Hexer's one, against a Control of 1.
    expect(Object.fromEntries(marks)).toEqual({
      [`${A.channeller.x},${A.channeller.y}`]: { candle: true },
      [`${A.hexer.x},${A.hexer.y}`]: { candle: true },
      [`${A.thing.x},${A.thing.y}`]: { candle: true },
      [`${A.horror.x},${A.horror.y}`]: { control: { control: 1, strands: 4 } },
    });
    // The chalk ring: the Idol Bearer's nine tiles, outlined once round.
    const ring = plan.entries.filter(
      (entry) => entry.abilityStyle === "IDOL_RING",
    );
    expect(ring).toHaveLength(9);
    expect(ring.every((entry) => entry.kind === "ABILITY_AREA")).toBe(true);
    expect(
      ring.reduce((sum, entry) => sum + (entry.targetEdges?.length ?? 0), 0),
    ).toBe(12);
    expect(plan.targets).toEqual([]);
    // Nothing on the board names a tile or an ID.
    for (const entry of plan.entries)
      expect(entry.label ?? "").not.toMatch(/\d+,\s*\d+|#\d/);
  });

  it("shows a rival the same strands, candles and pips, and offers it nothing", () => {
    const state = cultChannelRivalUiFixtureV7();
    const view = viewOf(state);
    const plan = planOf(view);
    expect(
      plan.entries.filter((entry) => entry.cultLink?.kind === "STRAND"),
    ).toHaveLength(2);
    expect([...cultUnitMarkersV7(view).values()]).toEqual([
      { candle: true },
      { candle: true },
      { control: { control: 1, strands: 2 } },
    ]);
    expect(
      queryPlayerCommandsV7(view).filter((command) =>
        (CULT_CHANNEL_KINDS_V7 as readonly string[]).includes(command.kind),
      ),
    ).toEqual([]);
    // Its card says what it is, to anyone.
    const horror = view.units.find((unit) => unit.summoned === "HORROR");
    if (horror === undefined) throw new Error("no Horror");
    expect(cultChannelChipsV7(view, horror).map((chip) => chip.label)).toEqual([
      "2 / 1",
    ]);
  });

  it("draws nothing at all on a board without the Cult's channel", () => {
    const state = cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 2) }]);
    const view = viewOf(state);
    const plan = planOf(view);
    expect(cultUnitMarkersV7(view).size).toBe(0);
    expect(
      plan.entries.filter(
        (entry) => entry.cult !== undefined || entry.cultLink !== undefined,
      ),
    ).toEqual([]);
    // A view captured before the channel has no lists.
    const old = { ...view, cult: { favour: view.cult.favour } } as PlayerViewV7;
    expect(channelOfV7(old)).toEqual({
      strands: [],
      grips: [],
      idols: [],
      daemons: [],
    });
    expect(cultUnitMarkersV7(old).size).toBe(0);
  });

  it("draws a strand slack when its daemon has gone out of reach", () => {
    const state = cultChannelUiFixtureV7();
    const view = viewOf(state);
    const horror = idAt(state, A.horror);
    // The Horror walked off: four tiles from its channeller.
    const walked: PlayerViewV7 = {
      ...view,
      units: view.units.map((unit) =>
        unit.id === horror ? { ...unit, at: at(5, 2) } : unit,
      ),
    };
    expect(
      planOf(view)
        .entries.filter((entry) => entry.cultLink !== undefined)
        .map((entry) => entry.cultLink),
    ).toEqual([{ kind: "STRAND", holds: true }]);
    expect(
      planOf({
        ...walked,
        units: walked.units.filter(
          (unit) => unit.at.x !== 5 || unit.at.y !== 2 || unit.id === horror,
        ),
      })
        .entries.filter((entry) => entry.cultLink !== undefined)
        .map((entry) => entry.cultLink),
    ).toEqual([{ kind: "STRAND", holds: false }]);
  });

  it("keeps a dozen strands to one link and one mark each", () => {
    const view = viewOf(cultChannelDozenUiFixtureV7());
    const plan = planOf(view);
    expect(
      plan.entries.filter((entry) => entry.cultLink !== undefined),
    ).toHaveLength(12);
    expect(
      plan.entries.filter((entry) => entry.cult !== undefined),
    ).toHaveLength(16);
  });
});

describe("the pips under a daemon", () => {
  it("lights a pip per holding strand, leaves a missing one hollow, and counts the spare", () => {
    expect(cultControlPipsV7({ control: 3, strands: 2 })).toEqual({
      slots: 3,
      lit: 2,
      extra: 0,
      short: true,
    });
    expect(cultControlPipsV7({ control: 3, strands: 3 })).toEqual({
      slots: 3,
      lit: 3,
      extra: 0,
      short: false,
    });
    // A gripped strand shows three lit pips; two more are spare.
    expect(cultControlPipsV7({ control: 1, strands: 3 })).toEqual({
      slots: 1,
      lit: 1,
      extra: 2,
      short: false,
    });
    expect(cultControlPipsV7({ control: 1, strands: 40 }).extra).toBe(
      CULT_EXTRA_PIPS_V7,
    );
    expect(cultControlPipsV7({ control: 1, strands: 0 })).toEqual({
      slots: 1,
      lit: 0,
      extra: 0,
      short: true,
    });
  });

  it("draws one arc per pip, and the red rim only when short", () => {
    const held: string[] = [];
    drawCultControlPipsV7(recordingContext(held), 0, 0, 1, {
      control: 3,
      strands: 4,
    });
    // Three slots and one spare.
    expect(held.filter((entry) => entry === "arc")).toHaveLength(4);
    expect(held.join()).not.toContain("#ff655f");
    const short: string[] = [];
    drawCultControlPipsV7(recordingContext(short), 0, 0, 1, {
      control: 3,
      strands: 1,
    });
    expect(short.join()).toContain("strokeStyle:#ff655f");
  });
});

describe("the marks in code", () => {
  it("strokes a strand three times and never animates", () => {
    const log: string[] = [];
    drawCultStrandV7(
      recordingContext(log),
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      1,
      true,
    );
    expect(log.filter((entry) => entry === "stroke")).toHaveLength(5);
    // The casing under the green: it reads on Grass.
    expect(log.indexOf("strokeStyle:#10131c")).toBeLessThan(
      log.indexOf("strokeStyle:#80ffbc"),
    );
    const slack: string[] = [];
    drawCultStrandV7(
      recordingContext(slack),
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      1,
      false,
    );
    expect(slack.join()).toContain("strokeStyle:#e0281e");
    expect(slack.join()).not.toContain("#80ffbc");
  });

  it("draws every mark, the grip and the jumps without a raster, also in high contrast", () => {
    for (const highContrast of [false, true]) {
      const log: string[] = [];
      const context = recordingContext(log);
      drawCultUnitMarkersV7(
        context,
        {
          candle: true,
          control: { control: 3, strands: 2 },
          unbound: true,
          furious: true,
        },
        100,
        100,
        0.5,
        { highContrast },
      );
      drawCultUnitMarkersV7(context, { eye: true }, 100, 100, 0.5, {
        highContrast,
      });
      drawCultGripV7(context, { x: 0, y: 0 }, { x: 128, y: 0 }, 1, true, {
        highContrast,
      });
      for (const outcome of ["JUMPS", "STAYS", "UNKNOWN"] as const)
        drawCultBooJumpV7(
          context,
          { x: 0, y: 0 },
          { x: 128, y: 0 },
          1,
          outcome,
          {
            highContrast,
          },
        );
      expect(log.filter((entry) => entry === "save").length).toBe(
        log.filter((entry) => entry === "restore").length,
      );
      expect(log).not.toContain("drawImage");
      if (highContrast) expect(log.join()).not.toMatch(/#00ff78|#80ffbc/);
    }
  });
});

describe("Summon is aimed on the board", () => {
  it("asks for the helper when two cultists could help, then for the tile", () => {
    const state = cultChannelUiFixtureV7();
    const view = viewOf(state);
    const commands = queryPlayerCommandsV7(view);
    const summoner = idAt(state, A.summoner);
    expect(summonHelpersV7(commands, summoner)).toEqual([
      idAt(state, A.helper),
      idAt(state, A.secondHelper),
    ]);
    const helpers = aimed(state, A.summoner, (unitId) => ({
      kind: "SUMMON",
      unitId,
      helperUnitId: null,
    }));
    expect(
      helpers.targets.map((target) => [
        target.family,
        target.at,
        target.previewLabel,
      ]),
    ).toEqual([
      ["SUMMON_HELPER", A.helper, "Helper"],
      ["SUMMON_HELPER", A.secondHelper, "Helper"],
    ]);
    expect(targetHighlightStyleV7("SUMMON_HELPER")).toBe("SUPPORT");
    expect(helpers.targets[0]?.semanticLabel).toBe(
      "This Initiate helps and channels the Horror. Then choose the Horror's tile.",
    );
    const tiles = aimed(state, A.summoner, (unitId) => ({
      kind: "SUMMON",
      unitId,
      helperUnitId: idAt(state, A.helper),
    }));
    const offered = commands.filter(
      (command) =>
        command.kind === "SUMMON" &&
        command.helperUnitId === idAt(state, A.helper),
    );
    // The six free tiles round the Summoner (its two Initiates hold two).
    expect(offered).toHaveLength(6);
    expect(tiles.targets.map((target) => target.command)).toEqual(offered);
    expect(tiles.targets.every((target) => target.family === "SUMMON")).toBe(
      true,
    );
    expect(targetHighlightStyleV7("SUMMON")).toBe("PLACE");
    expect(tiles.targets[0]?.semanticLabel).toBe(
      "Summon the Horror here: −5 Favour. Both cultists channel it. Choose a tile next to it for the Horror",
    );
    // The chosen helper keeps its mark while the tile is picked.
    expect(
      tiles.entries
        .filter((entry) => entry.key.startsWith("ability-target:SUMMON_HELPER"))
        .map((entry) => [entry.at, entry.label, entry.areaSupport]),
    ).toEqual([[A.helper, "Helper", "PROMINENT"]]);
  });
});

describe("Channel and Anchor are aimed on the board", () => {
  it("marks each daemon in reach with its strands after, inside the reach", () => {
    const state = cultChannelUiFixtureV7();
    const plan = aimed(state, A.helper, (unitId) => ({
      kind: "CHANNEL",
      unitId,
    }));
    expect(
      plan.targets.map((target) => [
        target.family,
        target.at,
        target.previewLabel,
        target.command,
      ]),
    ).toEqual([
      [
        "CHANNEL",
        A.horror,
        "2 / 1",
        {
          kind: "CHANNEL",
          unitId: idAt(state, A.helper),
          daemonUnitId: idAt(state, A.horror),
        },
      ],
    ]);
    expect(targetHighlightStyleV7("CHANNEL")).toBe("SUPPORT");
    expect(plan.targets[0]?.semanticLabel).toBe(
      "Channel this Horror: 2 strands of the 1 it needs. It stays bound. Choose a daemon within 3 tiles",
    );
    // The reach: the tiles within 3 of the cultist, cut by the board's edge
    // (seven columns, six rows from the top row down).
    const reach = plan.entries.filter(
      (entry) => entry.abilityStyle === "CHANNEL_RANGE",
    );
    expect(reach).toHaveLength(42);
    expect(reach.every((entry) => entry.kind === "ABILITY_AREA")).toBe(true);
    expect(
      reach.reduce((sum, entry) => sum + (entry.targetEdges?.length ?? 0), 0),
    ).toBe(26);
  });

  it("marks the channeller beside the Thing with its strand counted three", () => {
    const state = cultChannelUiFixtureV7();
    const plan = aimed(state, A.thing, (unitId) => ({
      kind: "ANCHOR",
      unitId,
    }));
    expect(
      plan.targets.map((target) => [
        target.family,
        target.at,
        target.previewLabel,
      ]),
    ).toEqual([["ANCHOR", A.channeller, "3 / 1"]]);
    expect(targetHighlightStyleV7("ANCHOR")).toBe("SUPPORT");
    expect(plan.targets[0]?.semanticLabel).toBe(
      "Grip this Initiate: its strand to the Horror counts three (3 of 1). Hit that cultist and all three go. Choose a channelling cultist next to it",
    );
  });
});

describe("Behold! and Boo! are previewed on the board", () => {
  it("draws the ring a Behold! would raise and marks the cultist it would ward", () => {
    const state = cultChannelUiFixtureV7();
    const bearer = idAt(state, A.bearer);
    const plan = planOf(viewOf(state), {
      selection: { kind: "UNIT", unitId: bearer },
      selectedUnitId: bearer,
    });
    expect(
      plan.entries.filter(
        (entry) =>
          entry.kind === "ABILITY_AREA" &&
          entry.abilityStyle === "WARD_PREVIEW",
      ),
    ).toHaveLength(9);
    // Marked, not picked: the broken Help ring of an area support.
    expect(
      plan.entries
        .filter((entry) => entry.kind === "ABILITY_TARGET")
        .map((entry) => [entry.at, entry.label, entry.areaSupport]),
    ).toEqual([
      // The Idol Bearer could channel the one Horror in its reach instead.
      [A.horror, "2 / 1", "QUIET"],
      [A.channeller, "Warded", "QUIET"],
    ]);
    expect(plan.targets.some((target) => target.family === "CHANNEL")).toBe(
      false,
    );
  });

  it("shows where a Boo! sends each unit, and picks nothing", () => {
    const state = cultChannelUiFixtureV7();
    const plan = aimed(state, A.horror, (unitId) => ({ kind: "BOO", unitId }));
    expect(plan.targets).toEqual([]);
    expect(
      plan.entries
        .filter((entry) => entry.cultLink?.kind === "BOO_JUMP")
        .map((entry) => [entry.at, entry.linkTo, entry.cultLink]),
    ).toEqual([
      [A.fighter, at(3, 4), { kind: "BOO_JUMP", outcome: "JUMPS" }],
      [A.hexer, at(7, 6), { kind: "BOO_JUMP", outcome: "JUMPS" }],
    ]);
    // A plain jump needs no words.
    expect(
      plan.entries.filter((entry) =>
        entry.key.startsWith("ability-target:BOO"),
      ),
    ).toEqual([]);
  });

  it("warns of a strand a Boo! would break and greys a unit that stays", () => {
    // A channeller beside the Horror, and a Fighter with its back to
    // another unit.
    const state = withStrandsV7(
      withHorrorV7(
        cultFieldV7([
          {
            seat: 0,
            role: "FIGHTER",
            at: at(6, 4),
            activation: { specialActed: true },
          },
          { seat: 1, role: "FIGHTER", at: at(4, 4) },
          { seat: 1, role: "FIGHTER", at: at(3, 4) },
        ]),
        0,
        at(5, 4),
      ),
      at(5, 4),
      [at(6, 4)],
    );
    const plan = aimed(state, at(5, 4), (unitId) => ({ kind: "BOO", unitId }));
    expect(
      plan.entries
        .filter((entry) => entry.key.startsWith("ability-target:BOO"))
        .map((entry) => [entry.at, entry.label, entry.abilityStyle]),
    ).toEqual([
      [at(4, 4), "Stays", "MARTIAN_BLOCKED"],
      [at(6, 4), "Strand breaks", "BLAST_FRIENDLY"],
    ]);
    const view = viewOf(state);
    const commands = queryPlayerCommandsV7(view);
    expect(commands.some((command) => command.kind === "BOO")).toBe(true);
  });

  it("sums a Boo! in a few words", () => {
    const entry = (
      outcome: "JUMPS" | "STAYS" | "UNKNOWN",
      holdsStrand = false,
    ) => ({
      unitId: 1 as UnitId,
      ownerId: 1 as never,
      from: at(0, 0),
      to: at(1, 0),
      outcome,
      holdsStrand,
    });
    expect(
      booSummaryV7({
        unitId: 1 as UnitId,
        results: [entry("JUMPS"), entry("JUMPS", true), entry("STAYS")],
      }),
    ).toBe("2 jump · 1 stays · 1 strand breaks");
    expect(
      booSummaryV7({ unitId: 1 as UnitId, results: [entry("JUMPS")] }),
    ).toBe("1 jumps");
    expect(
      booSummaryV7({ unitId: 1 as UnitId, results: [entry("UNKNOWN")] }),
    ).toBe("1 unknown");
  });
});

describe("why a channel button cannot be used", () => {
  const reason = (
    state: GameStateV7,
    where: CoordV7,
    kind: CultChannelKindV7,
  ): string | null => {
    const view = viewOf(state);
    const unit = view.units.find(
      (candidate) => candidate.at.x === where.x && candidate.at.y === where.y,
    );
    if (unit === undefined) throw new Error("no unit");
    const offered = queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === kind &&
        "unitId" in command &&
        command.unitId === unit.id,
    );
    return cultChannelUnavailableTextV7(view, unit, kind, offered);
  };

  it("gives no reason for an offered action, and none for a unit without it", () => {
    const state = cultChannelUiFixtureV7();
    expect(reason(state, A.summoner, "SUMMON")).toBeNull();
    expect(reason(state, A.helper, "CHANNEL")).toBeNull();
    expect(reason(state, A.bearer, "BEHOLD")).toBeNull();
    expect(reason(state, A.thing, "ANCHOR")).toBeNull();
    expect(reason(state, A.horror, "BOO")).toBeNull();
    // Not its ability: no button.
    expect(reason(state, A.helper, "SUMMON")).toBeNull();
    expect(reason(state, A.horror, "CHANNEL")).toBeNull();
    // Another seat's units have none.
    const rival = viewOf(state, 1);
    const summoner = rival.units.find(
      (unit) => unit.id === idAt(state, A.summoner),
    );
    if (summoner === undefined) throw new Error("no Summoner");
    expect(
      cultChannelUnavailableTextV7(rival, summoner, "SUMMON", false),
    ).toBeNull();
  });

  it("names the first rule a Summon fails", () => {
    const lone = withFavourV7(
      cultFieldV7([{ seat: 0, role: "CAPTAIN", at: at(5, 2) }]),
      0,
      9,
    );
    expect(reason(lone, at(5, 2), "SUMMON")).toBe(SUMMON_NO_HELPER_V7);
    const poor = withFavourV7(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
      ]),
      0,
      4,
    );
    expect(reason(poor, at(5, 2), "SUMMON")).toBe("Needs 5 Favour");
    const acted = withFavourV7(
      cultFieldV7([
        {
          seat: 0,
          role: "CAPTAIN",
          at: at(5, 2),
          activation: { specialActed: true },
        },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
      ]),
      0,
      9,
    );
    expect(reason(acted, at(5, 2), "SUMMON")).toBe(CHANNEL_ALREADY_ACTED_V7);
    // Every tile round it is taken: a corner, with its helper and enemies.
    const boxed = withFavourV7(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: at(0, 0) },
        { seat: 0, role: "FIGHTER", at: at(1, 0) },
        { seat: 0, role: "FIGHTER", at: at(0, 1) },
        { seat: 0, role: "FIGHTER", at: at(1, 1) },
      ]),
      0,
      9,
    );
    expect(reason(boxed, at(0, 0), "SUMMON")).toBe(SUMMON_NO_TILE_V7);
  });

  it("says a cultist channels already, is out of reach, or has acted", () => {
    const state = cultChannelUiFixtureV7();
    expect(reason(state, A.channeller, "CHANNEL")).toBe(CHANNEL_HOLDING_V7);
    const far = withHorrorV7(
      cultFieldV7([
        { seat: 0, role: "FIGHTER", at: at(0, 0) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 2),
          activation: { specialActed: true },
        },
      ]),
      0,
      at(5, 4),
    );
    expect(reason(far, at(0, 0), "CHANNEL")).toBe(CHANNEL_OUT_OF_REACH_V7);
    expect(reason(far, at(5, 2), "CHANNEL")).toBe(CHANNEL_ALREADY_ACTED_V7);
    // No daemon of the seat on the board: nothing to channel, no button.
    const none = cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(0, 0) }]);
    expect(reason(none, at(0, 0), "CHANNEL")).toBeNull();
  });

  it("says the idol is raised, the Thing grips already, and nobody is beside the Horror", () => {
    const busy = cultChannelBusyUiFixtureV7();
    expect(reason(busy, A.bearer, "BEHOLD")).toBe(BEHOLD_RAISED_V7);
    expect(reason(busy, A.thing, "ANCHOR")).toBe(ANCHOR_GRIPPING_V7);
    // A Thing far from the channellers.
    const apart = withStrandsV7(
      withHorrorV7(
        cultFieldV7([
          { seat: 0, role: "JUGGERNAUT", at: at(0, 0) },
          {
            seat: 0,
            role: "FIGHTER",
            at: at(5, 2),
            activation: { specialActed: true },
          },
        ]),
        0,
        at(5, 4),
      ),
      at(5, 4),
      [at(5, 2)],
    );
    expect(reason(apart, at(0, 0), "ANCHOR")).toBe(ANCHOR_NO_CULTIST_V7);
    expect(reason(apart, at(5, 4), "BOO")).toBe(BOO_NOBODY_V7);
    // While the seat channels nothing a Thing shows no grip at all.
    const idle = cultFieldV7([{ seat: 0, role: "JUGGERNAUT", at: at(0, 0) }]);
    expect(reason(idle, at(0, 0), "ANCHOR")).toBeNull();
  });
});

describe("what End Turn asks", () => {
  it("names the one daemon that is short, and nothing when every daemon holds", () => {
    const short = viewOf(cultChannelShortUiFixtureV7());
    expect(daemonsShortV7(short)).toEqual([
      expect.objectContaining({ name: "Horror", strands: 0, control: 1 }),
    ]);
    expect(endTurnUnboundQuestionV7(daemonsShortV7(short))).toBe(
      "The Horror will be Unbound.",
    );
    expect(daemonsShortV7(viewOf(cultChannelBusyUiFixtureV7()))).toEqual([]);
    // Another seat's daemon is not the viewer's to lose.
    expect(daemonsShortV7(viewOf(cultChannelShortUiFixtureV7(), 1))).toEqual(
      [],
    );
  });

  it("counts several", () => {
    const two = [
      { unitId: 1 as UnitId, name: "Horror", strands: 0, control: 1 },
      { unitId: 2 as UnitId, name: "Herald", strands: 2, control: 3 },
    ];
    expect(endTurnUnboundQuestionV7(two)).toBe("2 daemons will be Unbound.");
  });
});

describe("the card's chips", () => {
  it("names Candlelit, the grip, the raised idol and a daemon's strands", () => {
    const state = cultChannelBusyUiFixtureV7();
    const view = viewOf(state);
    const chips = (where: CoordV7) =>
      cultChannelChipsV7(
        view,
        view.units.find((unit) => unit.id === idAt(state, where)) ??
          (() => {
            throw new Error("no unit");
          })(),
      ).map((chip) => [chip.id, chip.label]);
    expect(chips(A.channeller)).toEqual([
      ["candlelit", "Candlelit"],
      ["gripped", "Gripped"],
    ]);
    expect(chips(A.hexer)).toEqual([["candlelit", "Candlelit"]]);
    expect(chips(A.thing)).toEqual([["gripping", "Grips"]]);
    expect(chips(A.bearer)).toEqual([["idol", "Idol raised"]]);
    expect(chips(A.horror)).toEqual([["control", "4 / 1"]]);
    expect(chips(A.summoner)).toEqual([]);
    const loose = viewOf(cultChannelShortUiFixtureV7());
    const horror = loose.units.find(
      (unit) => unit.at.x === A.loose.x && unit.at.y === A.loose.y,
    );
    if (horror === undefined) throw new Error("no Horror");
    expect(cultChannelChipsV7(loose, horror)).toEqual([
      expect.objectContaining({ id: "control", label: "0 / 1", short: true }),
    ]);
    for (const chip of cultChannelChipsV7(view, view.units[0] ?? horror))
      expect(chip.status).not.toMatch(/\d+,\s*\d+|#\d|_/);
  });
});

describe("Unbound and Furious (the Unbound rules, bead pulp_wars-mch9.6)", () => {
  it("has no Unbound mark, steam or eye while every daemon is held", () => {
    for (const fixture of [
      cultChannelUiFixtureV7,
      cultChannelBusyUiFixtureV7,
    ]) {
      const view = viewOf(fixture());
      expect(view.units.some((unit) => unitIsUnboundV7(unit))).toBe(false);
      for (const marks of cultUnitMarkersV7(view).values()) {
        expect(marks.unbound).toBeUndefined();
        expect(marks.furious).toBeUndefined();
        expect(marks.eye).toBeUndefined();
      }
    }
  });

  it("marks an Unbound daemon, and its target with the eye of the rampage preview", () => {
    const state = cultChannelUnboundUiFixtureV7();
    const view = viewOf(state);
    const loose = idAt(state, A.loose);
    const rampage = previewRampageV7(view, loose);
    if (rampage === null || rampage.targetUnitId === null)
      throw new Error("no rampage target");
    expect(rampage).toMatchObject({ unbound: true, furious: false });
    const marks = cultUnitMarkersV7(view);
    // No pips yet: nobody holds a strand to it this turn.
    expect(marks.get(loose)).toEqual({ unbound: true });
    expect(marks.get(rampage.targetUnitId)?.eye).toBe(true);
    // One eye: the bound Horror is held.
    expect(
      [...marks.values()].filter((entry) => entry.eye === true),
    ).toHaveLength(1);
    // The plan draws it as the neutral unit it is, by its own name and look.
    const entry = planOf(view).entries.find(
      (candidate) => candidate.key === `unit:${loose}`,
    );
    expect(entry).toMatchObject({
      label: "Unbound Horror",
      artSubject: "UNIT:CULT:HORROR_UNBOUND",
      cult: { unbound: true },
    });
    // It is nobody's to lose: End Turn does not ask about it.
    expect(daemonsShortV7(view)).toEqual([]);
    // A rival sees the same marks.
    const rival = cultUnitMarkersV7(viewOf(state, 1));
    expect(rival.get(loose)).toEqual({ unbound: true });
    expect(rival.get(rampage.targetUnitId)?.eye).toBe(true);
  });

  it("adds the steam and the chip of a Furious daemon, which nobody may channel", () => {
    const state = cultChannelFuriousUiFixtureV7();
    const view = viewOf(state);
    const loose = idAt(state, A.loose);
    expect(cultUnitMarkersV7(view).get(loose)).toEqual({
      unbound: true,
      furious: true,
    });
    const unit = view.units.find((candidate) => candidate.id === loose);
    if (unit === undefined) throw new Error("no daemon");
    expect(cultChannelChipsV7(view, unit).map((chip) => chip.id)).toEqual([
      "unbound",
      "furious",
    ]);
    const calm = viewOf(cultChannelUnboundUiFixtureV7());
    expect(
      cultChannelChipsV7(
        calm,
        calm.units.find((candidate) => candidate.id === loose) ?? unit,
      ).map((chip) => chip.id),
    ).toEqual(["unbound"]);
    // No Channel on it is offered, and an Initiate with only it in reach is
    // told why.
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "CHANNEL" && command.daemonUnitId === loose,
      ),
    ).toBe(false);
    const furious = withUnboundV7(
      withHorrorV7(
        cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 2) }]),
        0,
        at(5, 4),
      ),
      at(5, 4),
      0,
      true,
    );
    const alone = viewOf(furious);
    const initiate = alone.units.find((candidate) => candidate.at.y === 2);
    if (initiate === undefined) throw new Error("no Initiate");
    expect(
      cultChannelUnavailableTextV7(alone, initiate, "CHANNEL", false),
    ).toBe(CHANNEL_FURIOUS_V7);
  });

  it("shows the eye of a bound daemon short of its Control: if it broke now", () => {
    const state = cultChannelShortUiFixtureV7();
    const view = viewOf(state);
    const loose = idAt(state, A.loose);
    const rampage = previewRampageV7(view, loose);
    if (rampage === null || rampage.targetUnitId === null)
      throw new Error("no rampage target");
    expect(rampage).toMatchObject({ unbound: false, short: true });
    const marks = cultUnitMarkersV7(view);
    expect(marks.get(rampage.targetUnitId)?.eye).toBe(true);
    expect(marks.get(loose)).toEqual({ control: { control: 1, strands: 0 } });
  });

  it("aims a Channel at an Unbound daemon as a binding, and says it is yours again", () => {
    const state = cultChannelUnboundUiFixtureV7();
    const plan = aimed(state, A.helper, (unitId) => ({
      kind: "CHANNEL",
      unitId,
    }));
    // The bound Horror and the Unbound one are both in reach.
    expect(
      plan.targets.map((target) => [target.at, target.previewLabel]),
    ).toEqual([
      [A.horror, "2 / 1"],
      [A.loose, "1 / 1"],
    ]);
    expect(plan.targets[1]?.semanticLabel).toBe(
      "Bind this Horror: 1 strand of the 1 it needs. It is yours again. Choose a daemon within 3 tiles",
    );
    const bound = step(state, required(plan.targets[1]).command);
    expect(bound.envelope.events.map((event) => event.kind)).toContain(
      "DAEMON_BOUND",
    );
    expect(
      cultChannelNoticePartsV7(
        bound.envelope.events,
        bound.before,
        bound.after,
      ),
    ).toEqual(["Horror bound again"]);
    // Bound again: held by the strand that bound it, no Unbound mark.
    const marks = cultUnitMarkersV7(bound.after);
    expect(marks.get(idAt(state, A.loose))).toEqual({
      control: { control: 1, strands: 1 },
    });
    expect(
      planOf(bound.after)
        .entries.filter((entry) => entry.cultLink?.kind === "STRAND")
        .every(
          (entry) => entry.cultLink?.kind === "STRAND" && entry.cultLink.holds,
        ),
    ).toBe(true);
  });

  it("draws the pips of a binding as progress: no red rim, no collar", () => {
    const log: string[] = [];
    drawCultControlPipsV7(recordingContext(log), 0, 0, 1, {
      control: 3,
      strands: 1,
      binding: true,
    });
    expect(log.filter((entry) => entry === "arc")).toHaveLength(3);
    expect(log.join()).not.toContain("#ff655f");
    expect(log.join()).toContain("strokeStyle:#f3e7c4");
  });

  it("reads an Unbound daemon to the cursor by its own name", () => {
    const state = cultChannelUnboundUiFixtureV7();
    const view = viewOf(state);
    const loose = view.units.find((unit) => unit.id === idAt(state, A.loose));
    const horror = view.units.find((unit) => unit.id === idAt(state, A.horror));
    if (loose === undefined || horror === undefined) throw new Error("no unit");
    expect(boardUnitNameV7(view, loose)).toBe("Unbound Horror");
    expect(boardUnitNameV7(view, horror)).toBe("Cult Horror");
  });
});

describe("one daemon in reach: the button channels it", () => {
  it("marks the one daemon with its strands after, and picks nothing", () => {
    const state = cultChannelUiFixtureV7();
    const helper = idAt(state, A.helper);
    const plan = planOf(viewOf(state), {
      selection: { kind: "UNIT", unitId: helper },
      selectedUnitId: helper,
    });
    expect(
      plan.entries
        .filter((entry) => entry.key.startsWith("ability-target:CHANNEL_ONLY"))
        .map((entry) => [entry.at, entry.label, entry.areaSupport]),
    ).toEqual([[A.horror, "2 / 1", "QUIET"]]);
    expect(plan.targets.some((target) => target.family === "CHANNEL")).toBe(
      false,
    );
    // Two daemons in reach: nothing is marked until Channel is armed.
    const two = cultChannelShortUiFixtureV7();
    const second = idAt(two, A.helper);
    expect(
      planOf(viewOf(two), {
        selection: { kind: "UNIT", unitId: second },
        selectedUnitId: second,
      }).entries.filter((entry) =>
        entry.key.startsWith("ability-target:CHANNEL_ONLY"),
      ),
    ).toEqual([]);
  });
});

describe("what each event plays", () => {
  it("pops the Horror in and runs a bead down each new strand", () => {
    const state = cultChannelUiFixtureV7();
    const played = step(state, {
      kind: "SUMMON",
      unitId: idAt(state, A.summoner),
      helperUnitId: idAt(state, A.helper),
      at: at(5, 3),
    });
    expect(cultSteps(played.steps)).toEqual([
      ["SUMMON", null, [at(5, 3)]],
      ["STRAND_FORMED", A.summoner, [at(5, 3)]],
      ["STRAND_FORMED", A.helper, [at(5, 3)]],
    ]);
    // The seat's own cues do not move the camera.
    expect(
      played.steps.every(
        (entry) => entry.kind !== "CULT" || entry.followCamera === undefined,
      ),
    ).toBe(true);
  });

  it("snaps the strand of a channeller that is hit, for its owner and for the attacker", () => {
    const state = cultFieldV7(
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 6),
          activation: { specialActed: true },
        },
        { seat: 1, role: "FIGHTER", at: at(4, 6) },
      ],
      { activeSeat: 1 },
    );
    const lodge = withStrandsV7(withHorrorV7(state, 0, at(5, 4)), at(5, 4), [
      at(5, 6),
    ]);
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: idAt(lodge, at(4, 6)),
      targetUnitId: idAt(lodge, at(5, 6)),
    };
    for (const viewer of [0, 1]) {
      const played = step(lodge, attack, 1, viewer);
      expect(cultSteps(played.steps)).toEqual([
        ["STRAND_SNAP", at(5, 6), [at(5, 4)]],
      ]);
      // The snap comes after the blow.
      const kinds = played.steps.map((entry) => entry.kind);
      expect(kinds.indexOf("CULT")).toBeGreaterThan(kinds.indexOf("MELEE"));
      const notice = cultBoundaryNoticeV7(
        played.envelope.events,
        played.before,
        played.after,
      );
      expect(notice?.text ?? null).toBe(
        viewer === 0 ? "Strand broken: it was hurt" : null,
      );
    }
  });

  it("bursts the collar of a daemon that fails its check, and says whose it was", () => {
    // The Cult ends its turn with a Horror nobody channels; the Human ends
    // its turn; the check runs at the Cult's Start Turn.
    const state = withHorrorV7(
      cultFieldV7([
        { seat: 0, role: "FIGHTER", at: at(8, 6) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ]),
      0,
      at(5, 4),
    );
    const ended = step(state, { kind: "END_TURN" }).state;
    for (const viewer of [0, 1]) {
      const played = step(ended, { kind: "END_TURN" }, 1, viewer);
      expect(
        played.envelope.events.some((event) => event.kind === "DAEMON_UNBOUND"),
      ).toBe(true);
      expect(cultSteps(played.steps)).toEqual([["UNBOUND", null, [at(5, 4)]]]);
      expect(
        cultChannelNoticePartsV7(
          played.envelope.events,
          played.before,
          played.after,
        ),
      ).toEqual([
        viewer === 0 ? "Your Horror is Unbound" : "A Horror is Unbound",
      ]);
    }
  });

  it("plays a Boo! and slides each scared unit one tile", () => {
    const state = cultChannelUiFixtureV7();
    const played = step(state, { kind: "BOO", unitId: idAt(state, A.horror) });
    expect(cultSteps(played.steps)).toEqual([["BOO", null, [A.horror]]]);
    expect(
      played.steps.flatMap((entry) =>
        entry.kind === "MOVE" ? [[entry.path, entry.pushSlide]] : [],
      ),
    ).toEqual([
      [[A.fighter, at(3, 4)], true],
      [[A.hexer, at(7, 6)], true],
    ]);
  });

  it("spreads the chalk when an idol is raised", () => {
    const state = cultChannelUiFixtureV7();
    const played = step(state, {
      kind: "BEHOLD",
      unitId: idAt(state, A.bearer),
    });
    expect(cultSteps(played.steps)).toEqual([["IDOL", null, [A.bearer]]]);
  });

  it("has a duration, a still frame, a sound list and a drawing for every cue", () => {
    const effects = Object.keys(
      CULT_EFFECT_DURATIONS_V7,
    ) as CultFeedbackEffectV7[];
    expect(effects).toHaveLength(6);
    const state = cultChannelUiFixtureV7();
    const view = viewOf(state);
    for (const effect of effects) {
      expect(CULT_EFFECT_DURATIONS_V7[effect]).toBeGreaterThanOrEqual(200);
      expect(CULT_EFFECT_DURATIONS_V7[effect]).toBeLessThanOrEqual(700);
      const still = cultReducedMotionProgressV7(effect);
      expect(still).toBeGreaterThan(0);
      expect(still).toBeLessThan(1);
      const log: string[] = [];
      for (const progress of [0, still, 1])
        drawCultFeedbackV7(
          recordingContext(log),
          { offsetX: 0, offsetY: 0, zoom: 1 },
          { effect, cells: [at(5, 4)], from: at(5, 6), progress },
        );
      expect(log.filter((entry) => entry === "save").length).toBe(
        log.filter((entry) => entry === "restore").length,
      );
      expect(
        log.some((entry) => entry === "stroke" || entry === "strokeRect"),
      ).toBe(true);
      expect(
        Array.isArray(
          soundCuesForStepV7({
            step: {
              kind: "CULT",
              effect,
              cells: [at(5, 4)],
              durationMs: CULT_EFFECT_DURATIONS_V7[effect],
            },
            before: view,
            after: view,
            envelope: { events: [] } as never,
            durationScale: 1,
          }),
        ),
      ).toBe(true);
    }
  });
});
