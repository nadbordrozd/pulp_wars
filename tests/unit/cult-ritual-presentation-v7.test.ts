import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewBeginRitualV7,
  previewRitualV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import { soundCuesForStepV7 } from "../../src/audio/sound-events-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderInteractionV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  CULT_EFFECT_DURATIONS_V7,
  cultReducedMotionProgressV7,
  drawCultFeedbackV7,
} from "../../src/render/canvas/cult-effects-v7";
import {
  addCultTrickEntriesV7,
  cultTrickUnitMarkersV7,
  isCultTrickPickV7,
} from "../../src/render/canvas/cult-ritual-board-plan-v7";
import {
  TENTACLE_TURN_PIPS_V7,
  drawCultGrabV7,
  drawCultGroundMarkV7,
  drawCultOverMarkV7,
  drawCultSwapArrowsV7,
  drawCultTauntTetherV7,
  drawCultTrickUnitMarkersV7,
} from "../../src/render/canvas/cult-ritual-canvas-v7";
import {
  CULT_TRICK_EFFECTS_V7,
  CULT_TRICK_EFFECT_SPRITES_V7,
  CULT_TRICK_STILL_PROGRESS_V7,
} from "../../src/render/canvas/cult-trick-effects-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import { cultBoundaryNoticeV7 } from "../../src/render/cult-presentation-v7";
import {
  CULT_TRICK_KINDS_V7,
  CULT_TRICK_LABELS_V7,
  CULT_TRICK_PICKS_V7,
  CULT_TRICK_TOOLTIPS_V7,
  beginRitualSummaryV7,
  beginRitualTargetNameV7,
  cultTrickChipsV7,
  cultTrickCommandsV7,
  cultTrickNoticePartsV7,
  cultTrickTileLinesV7,
  cultTrickUnavailableTextV7,
  frogCardStatsV7,
  ritualMarkNameV7,
  tricksOfV7,
} from "../../src/render/cult-ritual-presentation-v7";
import {
  glossaryEntryV7,
  statusGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import { withCowedV7, withTentacleV7 } from "../fixtures/v7-cult";
import {
  CULT_RITUAL_UI_V7,
  CULT_TRICK_UI_V7,
  cultChannelUiFixtureV7,
  cultProclaimUiFixtureV7,
  cultRitualRivalUiFixtureV7,
  cultStarfallBegunUiFixtureV7,
  cultStarfallUiFixtureV7,
  cultSummoningBegunUiFixtureV7,
  cultSummoningBlockedUiFixtureV7,
  cultSummoningUiFixtureV7,
  cultTricksDoneUiFixtureV7,
  cultTricksRivalUiFixtureV7,
  cultTricksUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { at } from "../fixtures/v7-revision20";

/**
 * Rituals, hexes and tricks in the interface (bead `pulp_wars-mch9.19`):
 * the words, what the board draws for every viewer, what each event plays,
 * and the drawing of each mark. Hand-built states only: no match is played
 * (a ritual is completed by ending two turns by hand).
 */

const R = CULT_RITUAL_UI_V7;
const T = CULT_TRICK_UI_V7;

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

/** Applies `command` for `seat` and plans what `viewerSeat` is shown. */
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
    events: envelope.events,
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
    { measureText: () => ({ width: 30 }) },
    {
      get: (target, name) =>
        name in target
          ? Reflect.get(target, name)
          : (...args: unknown[]) => {
              log.push(
                name === "fillText" || name === "strokeText"
                  ? `${String(name)}:${String(args[0])}`
                  : name === "drawImage"
                    ? `drawImage:${String((args[0] as { assetId?: string }).assetId)}`
                    : String(name),
              );
            },
      set: (_target, name, value) => {
        log.push(`${String(name)}:${String(value)}`);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

const balanced = (log: readonly string[]): boolean =>
  log.filter((entry) => entry === "save").length ===
  log.filter((entry) => entry === "restore").length;

describe("the words", () => {
  it("names every action in plain words, with no formula, ID or tile", () => {
    expect([...CULT_TRICK_KINDS_V7]).toEqual([
      "STARFALL",
      "GREAT_SUMMONING",
      "PROCLAIM",
      "RIBBIT",
      "SWITCHEROO",
      "TENTACLE",
      "PICK_ME",
    ]);
    for (const kind of CULT_TRICK_KINDS_V7) {
      const words = [
        CULT_TRICK_LABELS_V7[kind],
        CULT_TRICK_TOOLTIPS_V7[kind],
        kind === "PICK_ME" ? "" : CULT_TRICK_PICKS_V7[kind],
      ].join(" | ");
      expect(words).not.toMatch(/[A-Z]{2,}_[A-Z]|\(\d+, ?\d+\)|[+*/=]\s*\d/);
      expect(CULT_TRICK_LABELS_V7[kind].length).toBeLessThanOrEqual(16);
    }
    expect(isCultTrickPickV7({ kind: "RIBBIT" })).toBe(true);
    expect(isCultTrickPickV7({ kind: "CHANNEL" })).toBe(false);
  });

  it("filters the offered commands of each action", () => {
    const state = cultSummoningUiFixtureV7();
    const view = viewOf(state);
    const commands = queryPlayerCommandsV7(view);
    const summoner = idAt(state, R.summoner);
    const rites = cultTrickCommandsV7(commands, "GREAT_SUMMONING", summoner);
    expect(rites.length).toBeGreaterThanOrEqual(3);
    expect(
      rites.every(
        (command) =>
          command.kind === "BEGIN_RITUAL" &&
          command.ritual === "GREAT_SUMMONING",
      ),
    ).toBe(true);
    expect(cultTrickCommandsV7(commands, "STARFALL", summoner)).toEqual([]);
    expect(cultTrickCommandsV7(commands, "RIBBIT", summoner)).toEqual([]);
  });

  it("gives no reason for an action that is offered, another unit's, or not the unit's", () => {
    const state = cultTricksUiFixtureV7();
    const view = viewOf(state);
    const hexer = required(
      view.units.find((unit) => unit.id === idAt(state, T.hexer)),
    );
    for (const kind of CULT_TRICK_KINDS_V7)
      expect(cultTrickUnavailableTextV7(view, hexer, kind, true)).toBeNull();
    // A Hexer has none of the others.
    for (const kind of CULT_TRICK_KINDS_V7)
      if (kind !== "RIBBIT")
        expect(
          cultTrickUnavailableTextV7(view, hexer, kind, false),
          kind,
        ).toBeNull();
    // The rival's view of the same Hexer: nothing.
    const rival = viewOf(state, 1);
    expect(
      cultTrickUnavailableTextV7(rival, hexer, "RIBBIT", false),
    ).toBeNull();
  });

  it("summarises a chosen mark and names it for the cursor", () => {
    const state = cultStarfallUiFixtureV7();
    const view = viewOf(state);
    const preview = required(
      previewBeginRitualV7(view, idAt(state, R.stargazer), "STARFALL", R.star),
    );
    expect(beginRitualSummaryV7(view, preview)).toBe(
      "2 chanters · 7 damage · 3 units · 1 of yours",
    );
    expect(beginRitualTargetNameV7(preview)).toBe(
      "Star-fall here at the start of your next turn: 7 damage to every unit on the nine tiles: 3 units there now, 1 would die.",
    );
    const summoning = cultSummoningUiFixtureV7();
    const summoner = idAt(summoning, R.summoner);
    const names = (where: CoordV7): string =>
      beginRitualTargetNameV7(
        required(
          previewBeginRitualV7(
            viewOf(summoning),
            summoner,
            "GREAT_SUMMONING",
            where,
          ),
        ),
      );
    expect(names(R.free)).toBe(
      "The Herald arrives here at the start of your next turn: the Herald starts with 5 of the 3 strands it needs. −20 Favour.",
    );
    expect(names(R.broken)).toMatch(/the unit on it is consumed for 18 Favour/);
    expect(names(R.healthy)).toMatch(
      /blocks the Herald, and the Favour is lost/,
    );
  });
});

describe("a ritual on the board, for every viewer", () => {
  it("reads a view captured before the rituals as empty", () => {
    const view = viewOf(cultChannelUiFixtureV7());
    const old = {
      ...view,
      cult: { favour: view.cult.favour },
    } as unknown as PlayerViewV7;
    expect(tricksOfV7(old)).toEqual({
      rituals: [],
      cowed: [],
      frogs: [],
      hexCooldowns: [],
      taunts: [],
      tentacles: [],
    });
    const base = new Map();
    expect(cultTrickUnitMarkersV7(old, base)).toBe(base);
    const entries: Parameters<typeof addCultTrickEntriesV7>[0] = [];
    addCultTrickEntriesV7(entries, old);
    expect(entries).toEqual([]);
  });

  it("names the mark for its seat and for a rival, and a tile in the star's path", () => {
    const state = cultStarfallBegunUiFixtureV7();
    const own = viewOf(state);
    const ritual = required(own.cult.rituals[0]);
    expect(ritualMarkNameV7(own, previewRitualV7(own, ritual))).toBe(
      "Star-fall lands here at the start of your next turn: 7 damage to every unit on the nine tiles: 3 units there now, 1 would die. Disrupt its circle and nothing happens.",
    );
    const rival = viewOf(state, 1);
    const seen = required(rival.cult.rituals[0]);
    expect(ritualMarkNameV7(rival, previewRitualV7(rival, seen))).toMatch(
      /at the start of Player 1's next turn/,
    );
    const forecast = (entry: typeof seen) => previewRitualV7(rival, entry);
    expect(cultTrickTileLinesV7(rival, R.star, forecast)).toEqual([
      "Star-fall lands here at the start of Player 1's next turn: 7 damage to every unit on the nine tiles: 3 units there now, 1 would die. Disrupt its circle and nothing happens",
    ]);
    expect(cultTrickTileLinesV7(rival, R.starKnight, forecast)).toEqual([
      "In a star's path: 7 damage at the start of Player 1's next turn",
    ]);
    expect(cultTrickTileLinesV7(rival, at(9, 1), forecast)).toEqual([]);
    // The leader's own tile: its chip, said.
    expect(cultTrickTileLinesV7(rival, R.stargazer, forecast)).toEqual([
      "Leads the chant: It chants for Star-fall, and everyone who has explored its tile sees it. Hurt, move, or hex it and it leaves the circle",
    ]);
  });

  it("names the Great Summoning's mark by what stands on it", () => {
    const free = viewOf(cultSummoningBegunUiFixtureV7(), 1);
    expect(
      ritualMarkNameV7(
        free,
        previewRitualV7(free, required(free.cult.rituals[0])),
      ),
    ).toBe(
      "The Herald arrives here at the start of Player 1's next turn: the Herald starts with 5 of the 3 strands it needs. A healthy unit on this tile blocks it.",
    );
    const blocked = viewOf(cultSummoningBlockedUiFixtureV7(), 1);
    expect(
      ritualMarkNameV7(
        blocked,
        previewRitualV7(blocked, required(blocked.cult.rituals[0])),
      ),
    ).toMatch(/the unit on it blocks the Herald, and the Favour is lost/);
  });

  it("marks a Cowed city for every viewer and says it under the cursor", () => {
    const state = cultRitualRivalUiFixtureV7();
    const view = viewOf(state);
    const plan = planOf(view);
    const cowed = plan.entries.filter(
      (entry) => entry.cultMark?.kind === "COWED",
    );
    expect(cowed.map((entry) => entry.at)).toEqual([at(8, 8)]);
    expect(
      cultTrickTileLinesV7(view, at(8, 8), (ritual) =>
        previewRitualV7(view, ritual),
      ),
    ).toEqual([
      "Cowed: A Herald Proclaimed at it: no income and no city action until its owner's turn ends",
    ]);
    // The Cult seat sees the same banner.
    expect(
      planOf(viewOf(state, 1)).entries.filter(
        (entry) => entry.cultMark?.kind === "COWED",
      ),
    ).toHaveLength(1);
  });
});

describe("the chips and a frog's numbers", () => {
  it("shows a frog's real numbers and no other unit's", () => {
    const state = cultTricksDoneUiFixtureV7();
    const view = viewOf(state);
    const unit = (where: CoordV7) =>
      required(view.units.find((entry) => entry.id === idAt(state, where)));
    expect(frogCardStatsV7(view, unit(T.knight))).toEqual({
      defense: "0.5",
      move: "1",
      attack: "—",
    });
    expect(frogCardStatsV7(view, unit(T.fighter))).toBeNull();
    expect(
      cultTrickChipsV7(view, unit(T.knight)).map((chip) => [
        chip.id,
        chip.label,
        chip.harm ?? false,
      ]),
    ).toEqual([
      ["frog", "Frog", true],
      ["grabbed", "Grabbed", true],
      ["taunted", "Taunted", true],
    ]);
    expect(
      cultTrickChipsV7(view, unit(T.fighter)).map((chip) => chip.id),
    ).toEqual(["taunted"]);
    expect(
      cultTrickChipsV7(view, unit(T.chosen)).map((chip) => chip.id),
    ).toEqual(["pick-me"]);
    expect(
      cultTrickChipsV7(view, unit(T.hexer)).map((chip) => [
        chip.id,
        chip.label,
      ]),
    ).toEqual([["hex-spent", "Spent"]]);
    // Every chip has its sentence in the unit's "?" (the glossary).
    for (const id of [
      "chanting",
      "frog",
      "grabbed",
      "taunted",
      "pick-me",
      "hex-spent",
      "attacks",
    ])
      expect(statusGlossaryV7(id), id).not.toBeNull();
    expect(statusGlossaryV7("attacks")).toEqual(glossaryEntryV7("RAVAGE"));
  });

  it("counts an own Herald's attacks, and hides them from a rival", () => {
    const state = cultProclaimUiFixtureV7();
    const view = viewOf(state);
    const herald = required(
      view.units.find((unit) => unit.summoned === "HERALD"),
    );
    expect(
      cultTrickChipsV7(view, herald).map((chip) => [chip.id, chip.pips]),
    ).toEqual([["attacks", { lit: 2, of: 2 }]]);
    expect(cultTrickChipsV7(viewOf(state, 1), herald)).toEqual([]);
  });
});

describe("the notices", () => {
  const notice = (played: ReturnType<typeof step>): string | null =>
    cultBoundaryNoticeV7(played.events, played.before, played.after)?.text ??
    null;

  it("tells the caster and the victim of each hex and trick", () => {
    const state = cultTricksUiFixtureV7();
    const ribbit: CommandV7 = {
      kind: "RIBBIT",
      unitId: idAt(state, T.hexer),
      targetUnitId: idAt(state, T.knight),
    };
    expect(notice(step(state, ribbit))).toBe("Ribbit! The Knight is a frog");
    expect(notice(step(state, ribbit, 0, 1))).toBe(
      "Your Knight is a frog until your next turn ends",
    );
    const swap: CommandV7 = {
      kind: "SWITCHEROO",
      unitId: idAt(state, T.familiar),
      targetUnitId: idAt(state, T.knight),
    };
    expect(notice(step(state, swap))).toBeNull();
    expect(notice(step(state, swap, 0, 1))).toBe(
      "Switcheroo! Your Knight was swapped away",
    );
    const shout: CommandV7 = { kind: "PICK_ME", unitId: idAt(state, T.chosen) };
    expect(notice(step(state, shout))).toBeNull();
    expect(notice(step(state, shout, 0, 1))).toBe(
      "Pick Me! Your units beside the Chosen can attack only it",
    );
    const call: CommandV7 = {
      kind: "TENTACLE",
      unitId: idAt(state, T.caller),
      at: at(5, 4),
    };
    // It rises beside the Human Knight and the Cult's own Hexer, and slaps
    // the weaker.
    expect(notice(step(state, call, 0, 1))).toMatch(/^A Tentacle rises/);
  });

  it("tells both seats of a ritual begun, a city Cowed, and a star that fell", () => {
    const state = cultStarfallUiFixtureV7();
    const begin: CommandV7 = {
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      unitId: idAt(state, R.stargazer),
      at: R.star,
    };
    const begun = step(state, begin);
    expect(notice(begun)).toBe(
      "Star-fall begun: it completes at the start of your next turn",
    );
    expect(notice(step(state, begin, 0, 1))).toBe(
      "Player 1 begins Star-fall: break its circle before their next turn",
    );
    // Both seats end their turn by hand: the star falls at the Cult's
    // Start Turn.
    const ended = step(begun.state, { kind: "END_TURN" });
    const fell = step(ended.state, { kind: "END_TURN" }, 1, 0);
    expect(fell.events.some((event) => event.kind === "STAR_FELL")).toBe(true);
    expect(notice(fell)).toMatch(/The star fell: 7 damage/);
    expect(cultSteps(fell.steps)).toContainEqual(["STARFALL", null, [R.star]]);
    expect(
      fell.steps
        .filter((entry) => entry.kind === "DAMAGE")
        .map((entry) => (entry.kind === "DAMAGE" ? entry.damage : 0))
        .sort(),
      // The Knight rested at its owner's End Turn: 8 HP, and it lives.
    ).toEqual([7, 7, 7]);

    const proclaim = cultProclaimUiFixtureV7();
    const herald = required(
      viewOf(proclaim).units.find((unit) => unit.summoned === "HERALD"),
    );
    const city = required(
      viewOf(proclaim).cities.find(
        (entry) =>
          entry.at.x === R.enemyCapital.x && entry.at.y === R.enemyCapital.y,
      ),
    );
    const kneel: CommandV7 = {
      kind: "PROCLAIM",
      unitId: herald.id,
      cityId: city.id,
    };
    expect(notice(step(proclaim, kneel))).toBe("KNEEL! The city is Cowed");
    expect(notice(step(proclaim, kneel, 0, 1))).toBe(
      "KNEEL! Your city is Cowed: no income and no city action this turn",
    );
  });

  it("names a fizzle's reason and a consumed unit", () => {
    const view = viewOf(cultSummoningUiFixtureV7());
    const viewer = view.viewer.id;
    const leader = required(view.units[0]).id;
    const events = [
      {
        kind: "RITUAL_FIZZLED",
        playerId: viewer,
        ritual: "GREAT_SUMMONING",
        unitId: leader,
        at: R.healthy,
        reason: "BLOCKED",
      },
      {
        kind: "RITUAL_FIZZLED",
        playerId: required(view.players.find((player) => player.id !== viewer))
          .id,
        ritual: "STARFALL",
        unitId: leader,
        at: R.star,
        reason: "CHANTERS",
      },
    ] as unknown as PlayerEventV7[];
    expect(cultTrickNoticePartsV7(events, view, view)).toEqual([
      "Your Great Summoning fizzled: the mark was blocked",
      "Player 2's Star-fall fizzled: too few cultists still chant",
    ]);
  });
});

describe("what each event plays", () => {
  it("plays a cue for each command, where its viewer saw it", () => {
    const state = cultTricksUiFixtureV7();
    const ribbit = step(state, {
      kind: "RIBBIT",
      unitId: idAt(state, T.hexer),
      targetUnitId: idAt(state, T.knight),
    });
    expect(cultSteps(ribbit.steps)).toEqual([["RIBBIT", T.hexer, [T.knight]]]);
    const swap = step(state, {
      kind: "SWITCHEROO",
      unitId: idAt(state, T.familiar),
      targetUnitId: idAt(state, T.knight),
    });
    expect(cultSteps(swap.steps)).toEqual([
      ["SWITCHEROO", null, [T.familiar, T.knight]],
    ]);
    const shout = step(state, {
      kind: "PICK_ME",
      unitId: idAt(state, T.chosen),
    });
    expect(cultSteps(shout.steps)).toEqual([["PICK_ME", null, [T.chosen]]]);
    const call = step(state, {
      kind: "TENTACLE",
      unitId: idAt(state, T.caller),
      at: at(9, 4),
    });
    expect(cultSteps(call.steps)).toEqual([["TENTACLE", null, [at(9, 4)]]]);

    const star = cultStarfallUiFixtureV7();
    const begun = step(star, {
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      unitId: idAt(star, R.stargazer),
      at: R.star,
    });
    expect(cultSteps(begun.steps)).toEqual([
      ["RITUAL_BEGUN", null, [R.stargazer, R.star]],
    ]);
  });

  it("plays the Herald's arrival and the consumed unit of a Great Summoning", () => {
    const state = cultSummoningUiFixtureV7();
    const begun = step(state, {
      kind: "BEGIN_RITUAL",
      ritual: "GREAT_SUMMONING",
      unitId: idAt(state, R.summoner),
      at: R.broken,
    });
    const ended = step(begun.state, { kind: "END_TURN" });
    // The Human seat ends its turn without moving the broken Knight (it
    // rests 2 HP, so it is not consumed: the arrival is blocked).
    const done = step(ended.state, { kind: "END_TURN" }, 1, 0);
    const played = cultSteps(done.steps).map(([effect]) => effect);
    expect(played).toContain("RITUAL_FIZZLE");
    expect(done.events.some((event) => event.kind === "RITUAL_FIZZLED")).toBe(
      true,
    );
    // On a free mark the Herald arrives.
    const free = step(state, {
      kind: "BEGIN_RITUAL",
      ritual: "GREAT_SUMMONING",
      unitId: idAt(state, R.summoner),
      at: R.free,
    });
    const arrived = step(
      step(free.state, { kind: "END_TURN" }).state,
      { kind: "END_TURN" },
      1,
      0,
    );
    expect(cultSteps(arrived.steps)).toContainEqual(["HERALD", null, [R.free]]);
    expect(
      cultBoundaryNoticeV7(arrived.events, arrived.before, arrived.after)?.text,
    ).toContain("The Herald arrives");
  });

  it("has a duration, a still frame, a sound list and a drawing for every cue", () => {
    expect(CULT_TRICK_EFFECTS_V7).toHaveLength(12);
    const view = viewOf(cultTricksUiFixtureV7());
    for (const effect of CULT_TRICK_EFFECTS_V7) {
      expect(CULT_EFFECT_DURATIONS_V7[effect]).toBeGreaterThanOrEqual(200);
      expect(CULT_EFFECT_DURATIONS_V7[effect]).toBeLessThanOrEqual(700);
      expect(cultReducedMotionProgressV7(effect)).toBe(
        CULT_TRICK_STILL_PROGRESS_V7[effect],
      );
      for (const progress of [0, CULT_TRICK_STILL_PROGRESS_V7[effect], 1]) {
        const log: string[] = [];
        drawCultFeedbackV7(
          recordingContext(log),
          { offsetX: 0, offsetY: 0, zoom: 1 },
          {
            effect,
            cells: [at(5, 4), at(6, 5)],
            from: at(5, 6),
            progress,
          },
        );
        expect(balanced(log), `${effect} ${progress}`).toBe(true);
      }
      const sounds = soundCuesForStepV7({
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
      });
      expect(sounds.length, effect).toBeGreaterThan(0);
    }
    for (const subject of Object.values(CULT_TRICK_EFFECT_SPRITES_V7))
      expect(
        LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject),
        subject,
      ).toHaveLength(1);
  });
});

describe("the marks, drawn", () => {
  const draw = (paint: (context: CanvasRenderingContext2D) => void) => {
    const log: string[] = [];
    paint(recordingContext(log));
    expect(balanced(log)).toBe(true);
    return log;
  };

  it("draws each ground and over-piece mark in code, with its words", () => {
    for (const leader of [true, false]) {
      const ring = draw((context) =>
        drawCultGroundMarkV7(
          context,
          { kind: "RITUAL_RING", leader },
          100,
          100,
          1,
        ),
      );
      // The leader's ring is double: two cased ellipses.
      expect(ring.filter((entry) => entry === "ellipse")).toHaveLength(
        leader ? 4 : 2,
      );
    }
    for (const ritual of ["STARFALL", "GREAT_SUMMONING"] as const)
      for (const preview of [true, false])
        expect(
          draw((context) =>
            drawCultGroundMarkV7(
              context,
              { kind: "RITUAL_MARK", ritual, preview },
              100,
              100,
              1,
            ),
          ).filter((entry) => entry === "stroke").length,
        ).toBeGreaterThanOrEqual(4);
    const countdown = draw((context) =>
      drawCultOverMarkV7(
        context,
        { kind: "COUNTDOWN", ritual: "STARFALL", turns: 1, damage: 7 },
        100,
        100,
        1,
      ),
    );
    expect(countdown).toContain("fillText:1");
    const cowed = draw((context) =>
      drawCultOverMarkV7(context, { kind: "COWED" }, 100, 100, 1, {
        banner: "KNEEL!",
      }),
    );
    expect(cowed).toContain("fillText:KNEEL!");
    expect(cowed.some((entry) => entry.startsWith("drawImage"))).toBe(false);
    // With the art's shutters, the raster is drawn in the banner.
    const raster = draw((context) =>
      drawCultOverMarkV7(context, { kind: "COWED" }, 100, 100, 1, {
        art: { cowed: { assetId: "shutters" } as unknown as CanvasImageSource },
      }),
    );
    expect(raster).toContain("drawImage:shutters");
  });

  it("draws the frog, the bubble, the badge and a Tentacle's turns", () => {
    const frog = draw((context) =>
      drawCultTrickUnitMarkersV7(context, { frog: true }, 100, 100, 1),
    );
    expect(frog.filter((entry) => entry === "ellipse").length).toBe(3);
    expect(
      draw((context) =>
        drawCultTrickUnitMarkersV7(context, { frog: true }, 100, 100, 1, {
          art: { frog: { assetId: "frog" } as unknown as CanvasImageSource },
        }),
      ),
    ).toContain("drawImage:frog");
    expect(
      draw((context) =>
        drawCultTrickUnitMarkersV7(context, { taunt: true }, 100, 100, 1, {
          bubble: "ME!",
        }),
      ),
    ).toContain("fillText:ME!");
    for (const ritual of ["STARFALL", "GREAT_SUMMONING"] as const)
      expect(
        draw((context) =>
          drawCultTrickUnitMarkersV7(context, { ritual }, 100, 100, 1),
        ),
      ).toContain("fill");
    // Three slots, lit for the turns left.
    expect(TENTACLE_TURN_PIPS_V7).toBe(3);
    for (const sinks of [1, 2, 3] as const) {
      const pips = draw((context) =>
        drawCultTrickUnitMarkersV7(context, { sinks }, 100, 100, 1),
      );
      expect(pips.filter((entry) => entry === "arc")).toHaveLength(3);
      // The plate, then one fill per lit pip.
      expect(pips.filter((entry) => entry === "fill")).toHaveLength(1 + sinks);
    }
    // High contrast keeps to black and white.
    const log: string[] = [];
    const context = recordingContext(log);
    drawCultTrickUnitMarkersV7(
      context,
      { frog: true, taunt: true, sinks: 2, ritual: "STARFALL" },
      100,
      100,
      1,
      { highContrast: true },
    );
    drawCultGrabV7(context, { x: 0, y: 0 }, { x: 128, y: 0 }, 1, {
      highContrast: true,
    });
    drawCultTauntTetherV7(context, { x: 0, y: 0 }, { x: 128, y: 0 }, 1, false, {
      highContrast: true,
    });
    drawCultSwapArrowsV7(context, { x: 0, y: 0 }, { x: 128, y: 64 }, 1, {
      highContrast: true,
    });
    const colours = new Set(
      log.flatMap((entry) =>
        /^(fillStyle|strokeStyle):/.test(entry)
          ? [entry.slice(entry.indexOf(":") + 1)]
          : [],
      ),
    );
    expect([...colours].sort()).toEqual(["#000000", "#ffffff"]);
  });

  it("draws the Grab, the tether and the swap between two tiles, and nothing on one", () => {
    expect(
      draw((context) =>
        drawCultGrabV7(context, { x: 0, y: 0 }, { x: 128, y: 0 }, 1),
      ).filter((entry) => entry === "stroke").length,
    ).toBe(3);
    expect(
      draw((context) =>
        drawCultTauntTetherV7(
          context,
          { x: 0, y: 0 },
          { x: 128, y: 0 },
          1,
          false,
        ),
      ),
    ).toContain("stroke");
    expect(
      draw((context) =>
        drawCultTauntTetherV7(context, { x: 5, y: 5 }, { x: 5, y: 5 }, 1, true),
      ),
    ).toEqual([]);
    expect(
      draw((context) =>
        drawCultSwapArrowsV7(context, { x: 5, y: 5 }, { x: 5, y: 5 }, 1),
      ),
    ).toEqual([]);
    expect(
      draw((context) =>
        drawCultSwapArrowsV7(context, { x: 0, y: 0 }, { x: 128, y: 64 }, 1),
      ).filter((entry) => entry === "stroke").length,
    ).toBe(4);
  });
});

describe("the board", () => {
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

  function drawn(state: GameStateV7, seat = 0): string[] {
    const view = viewOf(state, seat);
    const full = planOf(view);
    const log: string[] = [];
    drawBoardV7({
      context: recordingContext(log),
      viewport: { width: 1800, height: 1800 },
      devicePixelRatio: 1,
      camera,
      plan: {
        ...full,
        entries: full.entries.filter((entry) => entry.kind !== "TERRAIN"),
      },
      reducedMotion: true,
      chibiArt: classicArt,
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
    });
    return log;
  }

  it("draws a hexed board with the frog's and the Cowed city's rasters", () => {
    const log = drawn(cultTricksRivalUiFixtureV7());
    expect(balanced(log)).toBe(true);
    expect(
      log.some((entry) => /^drawImage:.*frog/i.test(entry)),
      "the frog marker",
    ).toBe(true);
    expect(log).toContain("fillText:ME!");
    const cowed = drawn(withCowedV7(cultTricksUiFixtureV7(), R.enemyCapital));
    expect(cowed).toContain("fillText:KNEEL!");
    expect(cowed.some((entry) => /^drawImage:.*cowed/i.test(entry))).toBe(true);
  });

  it("draws a ritual's countdown, and nothing of the Cult on a board without it", () => {
    const ritual = drawn(cultStarfallBegunUiFixtureV7(), 1);
    expect(balanced(ritual)).toBe(true);
    expect(ritual).toContain("fillText:1");
    const plain = drawn(cultTricksUiFixtureV7());
    expect(plain).not.toContain("fillText:ME!");
    expect(plain).not.toContain("fillText:KNEEL!");
    expect(plain.some((entry) => /^drawImage:.*frog/i.test(entry))).toBe(false);
    // A Tentacle's turns are part of the hexed board only.
    const withTentacle = planOf(
      viewOf(withTentacleV7(cultTricksUiFixtureV7(), T.caller, at(9, 2))),
    );
    expect(
      withTentacle.entries.find(
        (entry) => entry.kind === "UNIT" && entry.cult?.sinks !== undefined,
      )?.cult,
    ).toEqual({ sinks: 3 });
  });
});
