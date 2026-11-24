// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  BEAM_DOWN_KILL_PRIORITY_V7,
  BEAM_DOWN_PRIORITY_V7,
} from "../../src/ai/v7-martian";
import {
  BEAM_DOWN_PICKUP_RANGE_V7,
  MOTHERSHIP_BEAM_RANGE_V7,
  MOTHERSHIP_BEAMS_PER_TURN_V7,
  applyCommandV7,
  parseGameStateV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { mothershipBeamLabelV7 } from "../../src/render/martian-presentation-v7";
import {
  boardPlan,
  required,
  requiredButton,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7 } from "../fixtures/v7-ice-folk";
import {
  activeViewV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import { activeIdV7, at, movedV7 } from "../fixtures/v7-revision20";

// `pulp_wars-eg3k` (7r146, docs/product/RULESET_7_CURRENT.md section
// 20.7.1): the Mothership beams one own unit per `BEAM_DOWN`, from within
// two tiles of it onto any legal tile within three, up to three times a
// turn. The first beam spends its primary action; it may move before it
// and keeps its free Heavy Tractor Beam. The field
// (tests/fixtures/v7-martian.ts): 11 x 11, seat 0 (Martian) capital
// (8, 8), seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8).

const own = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

const MOTHERSHIP = at(2, 2);
const GRUNTS = [at(1, 1), at(2, 1), at(3, 1), at(1, 2)] as const;

/** The Mothership at (2, 2) with four Grunts beside it. */
const strikeForce = (
  extra: readonly MartianPieceV7[] = [],
  mothership: Partial<MartianPieceV7> = {},
): GameStateV7 =>
  martianFieldV7([
    own("KNIGHT", MOTHERSHIP.x, MOTHERSHIP.y, mothership),
    ...GRUNTS.map((where) => own("FIGHTER", where.x, where.y)),
    ...extra,
  ]);

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

const beam = (
  state: GameStateV7,
  passenger: CoordV7,
  to: CoordV7,
  carrier: CoordV7 = MOTHERSHIP,
): Extract<CommandV7, { kind: "BEAM_DOWN" }> => ({
  kind: "BEAM_DOWN",
  unitId: idAt(state, carrier),
  passengerUnitId: idAt(state, passenger),
  to,
});

const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** The Mothership's own offered commands of `kind`. */
const mothershipOffers = (
  state: GameStateV7,
  kind: CommandV7["kind"],
): readonly CommandV7[] =>
  offeredV7(state, kind).filter(
    (command) =>
      "unitId" in command && command.unitId === idAt(state, MOTHERSHIP),
  );

describe("the Mothership's sequential Beam Down", () => {
  it("beams three times a turn, one unit each, and refuses a fourth", () => {
    expect([MOTHERSHIP_BEAM_RANGE_V7, MOTHERSHIP_BEAMS_PER_TURN_V7]).toEqual([
      3, 3,
    ]);
    const start = strikeForce();
    const mothership = idAt(start, MOTHERSHIP);
    expect(start.mothershipBeams).toBeUndefined();
    const landings = [at(2, 5), at(3, 5), at(4, 5)];
    let state = start;
    for (const [index, landing] of landings.entries()) {
      const passenger = GRUNTS[index] as CoordV7;
      const command = beam(state, passenger, landing);
      const { state: after, events } = playV7(state, command);
      expect(events[0]).toEqual({
        kind: "UNIT_BEAMED",
        playerId: activeIdV7(state),
        unitId: mothership,
        passengerUnitId: command.passengerUnitId,
        from: passenger,
        to: landing,
      });
      expect(unitAtV7(after, landing).id).toBe(command.passengerUnitId);
      expect(after.mothershipBeams).toEqual([
        { unitId: mothership, beams: index + 1 },
      ]);
      // The Mothership stays where it is, its primary action spent.
      expect(unitAtV7(after, MOTHERSHIP).activation).toMatchObject({
        specialActed: true,
        handled: true,
      });
      // The view shows the count, and the state round-trips.
      expect(activeViewV7(after).mothershipBeams).toEqual(
        after.mothershipBeams,
      );
      expect(parseGameStateV7(JSON.parse(JSON.stringify(after)))).toEqual(
        after,
      );
      state = after;
    }
    expect(state.beamedThisTurn).toEqual(
      GRUNTS.slice(0, 3)
        .map((where) => idAt(start, where))
        .sort((left, right) => left - right),
    );
    // The fourth Grunt still stands beside it, but no beam is left.
    expect(mothershipOffers(state, "BEAM_DOWN")).toEqual([]);
    expect(rejectedV7(state, beam(state, GRUNTS[3], at(1, 5)))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: mothership },
    });
  });

  it("lands within three tiles and picks up within two, never from a city", () => {
    const state = strikeForce([
      own("FIGHTER", 5, 2),
      // On the own capital's center: a Saucer's city pick-up, not a
      // Mothership's.
      own("FIGHTER", 8, 8),
    ]);
    const offered = mothershipOffers(state, "BEAM_DOWN");
    expect(offered.length).toBeGreaterThan(0);
    const passengers = new Set<number>();
    for (const command of offered) {
      if (command.kind !== "BEAM_DOWN") throw new Error(command.kind);
      expect(distance(command.to, MOTHERSHIP)).toBeLessThanOrEqual(
        MOTHERSHIP_BEAM_RANGE_V7,
      );
      passengers.add(command.passengerUnitId);
      // Every offered beam is accepted.
      expect(applyCommandV7(state, activeIdV7(state), command).accepted).toBe(
        true,
      );
    }
    expect([...passengers].sort((left, right) => left - right)).toEqual(
      GRUNTS.map((where) => idAt(state, where)).sort(
        (left, right) => left - right,
      ),
    );
    // Three tiles away is in reach, four is not.
    expect(offered).toContainEqual(beam(state, GRUNTS[0], at(2, 5)));
    expect(offered).toContainEqual(beam(state, GRUNTS[0], at(5, 4)));
    expect(rejectedV7(state, beam(state, GRUNTS[0], at(2, 6)))).toEqual({
      code: "INVALID_TILE",
      params: { action: "BEAM_DOWN" },
    });
    // A unit three tiles away, or on a city, is no passenger.
    expect(BEAM_DOWN_PICKUP_RANGE_V7).toBe(2);
    for (const far of [at(5, 2), at(8, 8)])
      expect(rejectedV7(state, beam(state, far, at(2, 4)))).toEqual({
        code: "BEAM_DOWN_NOT_LEGAL",
        params: { reason: "NO_PASSENGER" },
      });
  });

  it("spends its primary action on the first beam: it may move before, not attack or move after, and keeps its free pull", () => {
    // An enemy Fighter beside it, and an enemy Swordsman three tiles away
    // (a Heavy Tractor Beam target).
    const state = strikeForce([foe("FIGHTER", 3, 3), foe("SWORDSMAN", 5, 3)], {
      activation: movedV7(1),
    });
    expect(mothershipOffers(state, "ATTACK").length).toBe(1);
    expect(mothershipOffers(state, "TRACTOR_BEAM").length).toBeGreaterThan(0);
    // It moved, and still beams.
    const { state: after } = playV7(state, beam(state, GRUNTS[0], at(2, 5)));
    expect(mothershipOffers(after, "ATTACK")).toEqual([]);
    expect(mothershipOffers(after, "MOVE")).toEqual([]);
    expect(mothershipOffers(after, "BEAM_DOWN").length).toBeGreaterThan(0);
    expect(mothershipOffers(after, "TRACTOR_BEAM").length).toBeGreaterThan(0);
    expect(
      rejectedV7(after, {
        kind: "ATTACK",
        unitId: idAt(after, MOTHERSHIP),
        targetUnitId: idAt(after, at(3, 3)),
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
    // A Mothership that attacked first cannot beam at all.
    const attacked = strikeForce([], {
      activation: { attacked: true, attacksUsed: 1, handled: true },
    });
    expect(mothershipOffers(attacked, "BEAM_DOWN")).toEqual([]);
    expect(rejectedV7(attacked, beam(attacked, GRUNTS[0], at(2, 5))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
  });

  it("refuses a passenger beamed already this turn", () => {
    const state = strikeForce();
    // Set down beside the Mothership: still within its pick-up range.
    const { state: after } = playV7(state, beam(state, GRUNTS[0], at(2, 3)));
    expect(
      mothershipOffers(after, "BEAM_DOWN").some(
        (command) =>
          command.kind === "BEAM_DOWN" &&
          command.passengerUnitId === idAt(after, at(2, 3)),
      ),
    ).toBe(false);
    expect(rejectedV7(after, beam(after, at(2, 3), at(2, 5)))).toEqual({
      code: "BEAM_DOWN_NOT_LEGAL",
      params: { reason: "NO_PASSENGER" },
    });
  });

  it("resets the count at the next turn", () => {
    let state = strikeForce();
    for (const [index, landing] of [at(2, 5), at(3, 5), at(4, 5)].entries())
      state = playV7(
        state,
        beam(state, GRUNTS[index] as CoordV7, landing),
      ).state;
    expect(state.mothershipBeams).toEqual([
      { unitId: idAt(state, MOTHERSHIP), beams: 3 },
    ]);
    state = playV7(state, { kind: "END_TURN" }).state;
    // Emptied at the End Turn: the key is gone, as before any beam.
    expect("mothershipBeams" in state).toBe(false);
    expect(state.beamedThisTurn).toEqual([]);
    state = playV7(state, { kind: "END_TURN" }).state;
    expect(activeIdV7(state)).toBe(activeIdV7(strikeForce()));
    expect(mothershipOffers(state, "BEAM_DOWN").length).toBeGreaterThan(0);
    playV7(state, beam(state, GRUNTS[3], at(1, 5)));
  });

  it("parses only a Mothership's count of 1 to 3, sorted, for the active seat", () => {
    const state = strikeForce([
      own("RAIDER", 6, 2),
      own("KNIGHT", 6, 6),
      foe("KNIGHT", 9, 9),
    ]);
    const ship = idAt(state, MOTHERSHIP);
    const other = idAt(state, at(6, 6));
    const valid = {
      ...state,
      mothershipBeams: [
        { unitId: ship, beams: 3 },
        { unitId: other, beams: 1 },
      ],
    };
    expect(parseGameStateV7(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
    for (const [label, mothershipBeams] of [
      ["empty (the key is absent instead)", []],
      ["no beam", [{ unitId: ship, beams: 0 }]],
      ["a fourth beam", [{ unitId: ship, beams: 4 }]],
      ["a Saucer", [{ unitId: idAt(state, at(6, 2)), beams: 1 }]],
      ["a rival's Knight", [{ unitId: idAt(state, at(9, 9)), beams: 1 }]],
      ["a Grunt", [{ unitId: idAt(state, GRUNTS[0]), beams: 1 }]],
      [
        "unsorted",
        [
          { unitId: other, beams: 1 },
          { unitId: ship, beams: 1 },
        ],
      ],
      ["an extra key", [{ unitId: ship, beams: 1, more: true }]],
    ] as const)
      expect(
        parseGameStateV7(
          JSON.parse(JSON.stringify({ ...state, mothershipBeams })),
        ),
        label,
      ).toBeNull();
  });

  it("refuses a Frozen Mothership", () => {
    const state = iceFieldV7(
      [
        {
          seat: 0,
          role: "KNIGHT",
          at: MOTHERSHIP,
          frozen: { turnsLeft: 1 },
        },
        { seat: 0, role: "FIGHTER", at: GRUNTS[0] },
        { seat: 1, role: "FIGHTER", at: at(8, 2) },
      ],
      { factions: ["MARTIAN", "ICE_FOLK"] },
    );
    expect(mothershipOffers(state, "BEAM_DOWN")).toEqual([]);
    expect(rejectedV7(state, beam(state, GRUNTS[0], at(2, 5))).code).toBe(
      "UNIT_FROZEN",
    );
  });
});

describe("the Normal AI's Mothership beams", () => {
  it("beams one unit at a time onto a kill, scoring each beam on its own", () => {
    // A wounded Fighter four tiles from the Grunts: none reaches it on
    // foot, but beamed beside it a Grunt shoots it on arrival.
    const state = strikeForce([foe("FIGHTER", 2, 6, { hp: 2 })]);
    const decision = chooseNormalCommandV7(activeViewV7(state));
    const group = new Set(
      [MOTHERSHIP, ...GRUNTS].map((where) => idAt(state, where)),
    );
    const best = decision.candidates.find(
      (candidate) =>
        "unitId" in candidate.command && group.has(candidate.command.unitId),
    );
    expect(best?.command.kind).toBe("BEAM_DOWN");
    if (best?.command.kind !== "BEAM_DOWN") throw new Error("no beam");
    expect(best.command.unitId).toBe(idAt(state, MOTHERSHIP));
    expect(best.score.priority).toBe(BEAM_DOWN_KILL_PRIORITY_V7);
    expect(distance(best.command.to, at(2, 6))).toBeLessThanOrEqual(2);
    // One passenger a beam: after it, the next beams are scored again.
    const { state: after } = playV7(state, best.command);
    const next = chooseNormalCommandV7(activeViewV7(after)).candidates.filter(
      (candidate) =>
        candidate.command.kind === "BEAM_DOWN" &&
        candidate.command.unitId === idAt(after, MOTHERSHIP),
    );
    expect(next.length).toBeGreaterThan(0);
    for (const candidate of next) {
      if (candidate.command.kind !== "BEAM_DOWN") continue;
      expect(candidate.command.passengerUnitId).not.toBe(
        best.command.passengerUnitId,
      );
    }
  });

  it("without a shot, only delivers the army toward its target at the routine tier", () => {
    const state = strikeForce([foe("FIGHTER", 9, 1)]);
    const beams = chooseNormalCommandV7(activeViewV7(state)).candidates.filter(
      (candidate) =>
        candidate.command.kind === "BEAM_DOWN" && candidate.score.priority > 0,
    );
    for (const candidate of beams)
      expect(candidate.score.priority).toBe(BEAM_DOWN_PRIORITY_V7);
  });

  it("offers no beam once the three are spent", () => {
    let state = strikeForce([foe("FIGHTER", 2, 6, { hp: 2 })]);
    for (const [index, landing] of [at(1, 5), at(3, 5), at(4, 4)].entries())
      state = playV7(
        state,
        beam(state, GRUNTS[index] as CoordV7, landing),
      ).state;
    expect(
      chooseNormalCommandV7(activeViewV7(state)).candidates.some(
        (candidate) =>
          candidate.command.kind === "BEAM_DOWN" &&
          candidate.command.unitId === idAt(state, MOTHERSHIP),
      ),
    ).toBe(false);
  });
});

describe("the Mothership's Beam Down button", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.localStorage.clear();
  });

  it("shows the beams left, and picking a passenger then a tile on the board beams", async () => {
    const state = strikeForce();
    const scene = rig(state);
    const select = (): void =>
      scene.host.callbacks?.onSelection({
        kind: "UNIT",
        unitId: scene.unitAt(MOTHERSHIP).id,
      });
    select();
    const label = (): string =>
      requiredButton("martian-beam-down").querySelector(".v7-action-label")
        ?.textContent ?? "";
    expect(label()).toBe("Beam Down (3 left)");
    expect(label()).toBe(mothershipBeamLabelV7(3));
    // The Mass Beam Down button and its multi-select are gone.
    expect(
      document.querySelector('[data-action="martian-mass-beam-down"]'),
    ).toBeNull();
    requiredButton("martian-beam-down").click();
    // First the passenger, on the board: one target per unit it may take.
    const passengers = boardPlan(scene.host).targets.filter(
      (target) => target.family === "BEAM_DOWN_PASSENGER",
    );
    expect(passengers.map((target) => target.at)).toEqual(
      expect.arrayContaining([...GRUNTS]),
    );
    expect(passengers).toHaveLength(GRUNTS.length);
    const grunt = required(
      passengers.find(
        (target) => target.at.x === GRUNTS[1].x && target.at.y === GRUNTS[1].y,
      ),
    );
    scene.host.callbacks?.onCommand(grunt);
    // Then the tile, on the board: every tile in reach, nothing in the dock.
    const tiles = boardPlan(scene.host).targets.filter(
      (target) => target.family === "BEAM_DOWN",
    );
    expect(tiles.length).toBeGreaterThan(8);
    for (const tile of tiles)
      expect(distance(tile.at, MOTHERSHIP)).toBeLessThanOrEqual(3);
    // The aiming panel holds its "?", Back and Cancel: no tile buttons.
    expect(
      [...document.querySelectorAll(".v7-martian-pick button")].map(
        (node) => (node as HTMLElement).dataset.action ?? "",
      ),
    ).toEqual(
      expect.arrayContaining(["martian-pick-back", "martian-pick-cancel"]),
    );
    expect(
      document.querySelectorAll(".v7-martian-pick button").length,
    ).toBeLessThanOrEqual(3);
    const landing = required(
      tiles.find((target) => target.at.x === 2 && target.at.y === 5),
    );
    scene.host.callbacks?.onCommand(landing);
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "BEAM_DOWN",
      unitId: scene.unitAt(MOTHERSHIP).id,
      passengerUnitId: scene.unitAt(GRUNTS[1]).id,
      to: at(2, 5),
    });
    // Two left.
    select();
    await waitUntil(() => label() === "Beam Down (2 left)");
    expect(viewForV7(state, activeIdV7(state)).mothershipBeams).toBeUndefined();
    scene.app.destroy();
  });
});
