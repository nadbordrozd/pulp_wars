import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  ARMY_GARRISON_FILL_PRIORITY_V7,
  ARMY_GARRISON_WATCH_PRIORITY_V7,
} from "../../src/ai/v7-army";
import {
  CULT_GARRISON_SWAP_PRIORITY_V7,
  CULT_OFFERING_PACE_ROUNDS_V7,
  CULT_SUMMON_PRIORITY_V7,
  cultOfferingDueV7,
} from "../../src/ai/v7-cult-channel";
import {
  cityId,
  queryAiReadyCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { cultFieldV7, withFarmsV7, withFavourV7 } from "../fixtures/v7-cult";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import type { FieldOptionsV7 } from "../fixtures/v7-revision20";

// The Cult seat's first real matches (`pulp_wars-mch9.27`,
// docs/product/RULESET_7_CULTISTS.md section 15.10; the matches are
// docs/product/CAMPAIGN.md section 11.11): the garrison of a watched center
// (a rule of every army seat, docs/architecture/NORMAL_AI.md "The garrison
// of a watched center"), the Summoner that killed its way into the enemy
// line, and the Offering in every city every turn. No match was played:
// every rule is a decision, or the one turn the seat plays, on a small
// hand-built state, each beside the state in which the rule does not apply.
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (the viewer, to
// move) capital (8, 8) with territory x 7-9, y 7-9; seat 1 capital (2, 8)
// with territory x 1-3, y 7-9; villages (5, 5), (8, 5), (5, 8); every other
// land tile open Grass; every tile explored; every technology; no Coins, so
// no city trains. Every unit is homed to its seat's capital.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7 | undefined, right: CoordV7): boolean =>
  left !== undefined && left.x === right.x && left.y === right.y;

const own = (role: UnitRoleIdV7, x: number, y: number): GoblinPieceV7 => ({
  seat: 0,
  role,
  at: at(x, y),
});
const foe = (role: UnitRoleIdV7, x: number, y: number): GoblinPieceV7 => ({
  seat: 1,
  role,
  at: at(x, y),
});

const CENTER = at(8, 8);
/** The enemy's garrison, on its own capital: it watches nothing. */
const HOME_GUARD = foe("FIGHTER", 2, 8);

const scene = (
  factions: readonly ["CULT", "ORIGINAL"] | readonly ["ORIGINAL", "CULT"],
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 => {
  const state = cultFieldV7([...pieces, HOME_GUARD], {
    coins: 0,
    factions,
    ...options,
  });
  return {
    ...state,
    round: 12,
    // No free Monument left to build: the capital stays as it is.
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.unlocked ? { ...entry, spent: true } : entry,
      ),
    })),
  };
};
const cultScene = (
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 => scene(["CULT", "ORIGINAL"], pieces, options);
const humanScene = (
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 => scene(["ORIGINAL", "CULT"], pieces, options);

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, seatIdV7(state, 0));
const decision = (state: GameStateV7): NormalAiDecisionV7 =>
  chooseNormalCommandV7(viewOf(state));

/** The priority of the candidate Move of the unit on `from` to `to`, or null. */
const movePriority = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): number | null => {
  const id = unitAtV7(state, from).id;
  const found = decision(state).candidates.find(
    (candidate) =>
      candidate.command.kind === "MOVE" &&
      candidate.command.unitId === id &&
      same(candidate.command.path.at(-1), to),
  );
  return found === undefined ? null : found.score.priority;
};

/** The active seat plays its one turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
    commands.push(command);
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

const roleOn = (state: GameStateV7, where: CoordV7): UnitRoleIdV7 | null =>
  state.units.find((unit) => same(unit.at, where))?.role ?? null;

describe("the garrison of a watched center, every army seat (section 15.10)", () => {
  // A Human seat: its capital's center is empty and cannot be trained onto
  // (no Coins). The Guard (17 HP, Defense 3) is a clearly better garrison
  // than the Fighter (12 HP, Defense 2) beside the center.
  const guard = own("GUARD", 7, 7);
  const fighter = own("FIGHTER", 9, 8);
  // A Cult Initiate out of its own land, four tiles from the center: it
  // cannot strike the center next turn, but it watches it.
  const coming = foe("FIGHTER", 4, 6);

  it("steps the best garrison onto an empty watched center, and nobody weaker", () => {
    const state = humanScene([guard, fighter, coming]);
    expect(movePriority(state, guard.at, CENTER)).toBe(
      ARMY_GARRISON_WATCH_PRIORITY_V7,
    );
    // The Fighter waits for the Guard.
    expect(movePriority(state, fighter.at, CENTER)).toBeNull();
    expect(roleOn(policyTurn(state).state, CENTER)).toBe("GUARD");
  });

  it("on a threatened center too: the weaker unit does not take the step meant for the better one", () => {
    // An Initiate two tiles from the empty center strikes it next turn; the
    // step onto it has the threatened center's priority, and only the Guard
    // takes it (a Captain, 10 HP and Defense 1, waits for it).
    const captain = own("CAPTAIN", 9, 8);
    const state = humanScene([guard, captain, foe("FIGHTER", 6, 8)]);
    expect(movePriority(state, guard.at, CENTER)).toBe(
      ARMY_GARRISON_FILL_PRIORITY_V7,
    );
    expect(movePriority(state, captain.at, CENTER)).toBeNull();
    expect(roleOn(policyTurn(state).state, CENTER)).toBe("GUARD");
  });

  it("on a threatened center, takes a clearly better garrison over the unit its city could train", () => {
    // The city can train (Coins, a free slot, an empty center), and an
    // Initiate two tiles away strikes the center next turn (out of the
    // Juggernaut's reach this turn). A Juggernaut
    // (40 HP, Defense 4) beside it is more than twice the best unit the seat
    // can train (a Guard): it steps on, and the city trains nobody.
    const threat = foe("FIGHTER", 6, 6);
    const giant = own("JUGGERNAUT", 8, 9);
    const rich = { coins: 20 };
    const state = humanScene([giant, threat], rich);
    const trains = (candidate: NormalAiDecisionV7["candidates"][number]) =>
      candidate.command.kind === "TRAIN";
    expect(
      queryAiReadyCommandsV7(viewOf(state)).some((item) =>
        trains({ command: item.command } as never),
      ),
    ).toBe(true);
    expect(decision(state).candidates.some(trains)).toBe(false);
    expect(movePriority(state, giant.at, CENTER)).toBe(
      ARMY_GARRISON_FILL_PRIORITY_V7,
    );
    // It is the seat's first command (before any construction or training).
    const first = decision(state).command;
    expect(first?.kind === "MOVE" ? first.path.at(-1) : null).toEqual(CENTER);
    expect(first?.kind === "MOVE" ? first.unitId : null).toBe(
      unitAtV7(state, giant.at).id,
    );
    // A Swordsman (not twice a Guard) leaves the center to the training.
    const trained = humanScene([own("SWORDSMAN", 8, 9), threat], rich);
    expect(decision(trained).candidates.some(trains)).toBe(true);
  });

  it("does nothing of it when the only enemy near stands in its own land", () => {
    // The same Initiate inside the Cult's territory: a garrison, not an
    // attacker (an assault column must not walk home for it).
    const state = humanScene([guard, fighter, foe("FIGHTER", 3, 7)]);
    expect(movePriority(state, guard.at, CENTER)).not.toBe(
      ARMY_GARRISON_WATCH_PRIORITY_V7,
    );
    expect(roleOn(policyTurn(state).state, CENTER)).not.toBe("GUARD");
  });

  it("swaps a weak garrison out for a clearly better one beside it", () => {
    // A Captain (10 HP, Defense 1) holds the center, the Guard stands beside.
    const start = humanScene([
      own("CAPTAIN", 8, 8),
      own("GUARD", 8, 7),
      coming,
    ]);
    const end = policyTurn(start).state;
    expect(roleOn(end, CENTER)).toBe("GUARD");
    // Beside a Marksman (12 HP, Defense 1: not twice the Captain) it stays.
    const kept = policyTurn(
      humanScene([own("CAPTAIN", 8, 8), own("MARKSMAN", 8, 7), coming]),
    ).state;
    expect(roleOn(kept, CENTER)).toBe("CAPTAIN");
  });

  it("keeps the best garrison on a threatened center although a weaker unit could replace it", () => {
    // (The rules the seat had already do this: the hunt takes the garrison
    // off its center only for a replacement that can hold it. Pinned here
    // because the bead asks that the best defender is not walked off.)
    // A Swordsman (15 HP, Defense 2.5) holds the center; a wounded Cult
    // Initiate two tiles away can strike it next turn, and the Swordsman
    // could step out and kill it. A Captain beside the center could take its
    // place.
    const pieces = [own("SWORDSMAN", 8, 8), { ...foe("FIGHTER", 6, 6), hp: 4 }];
    const movesOff = (state: GameStateV7) => {
      const id = unitAtV7(state, CENTER).id;
      return decision(state).candidates.filter(
        (candidate) =>
          candidate.command.kind === "MOVE" && candidate.command.unitId === id,
      );
    };
    expect(movesOff(humanScene([...pieces, own("CAPTAIN", 8, 9)]))).toEqual([]);
    // Beside a Fighter (12 HP, Defense 2: more than half the Swordsman) the
    // tactical plan's replacement still lets the Swordsman go.
    expect(
      movesOff(humanScene([...pieces, own("FIGHTER", 8, 9)])).length,
    ).toBeGreaterThan(0);
  });
});

describe("the Cult seat's capital (section 15.10)", () => {
  // The Cult's capital: empty, at its unit limit (every unit is homed to it),
  // no Coins. The Idol Bearer (16 HP, Defense 2.5) beside it is a clearly
  // better garrison than the Summoner (10 HP, Defense 1).
  const bearer = own("GUARD", 8, 7);
  const summoner = own("CAPTAIN", 9, 8);
  // A Human Fighter out of its own land, four tiles from the center.
  const coming = foe("FIGHTER", 4, 6);

  it("steps the Idol Bearer onto the watched lodge at a threatened center's priority", () => {
    const state = cultScene([bearer, summoner, coming]);
    expect(movePriority(state, bearer.at, CENTER)).toBe(
      ARMY_GARRISON_FILL_PRIORITY_V7,
    );
    expect(movePriority(state, summoner.at, CENTER)).toBeNull();
    expect(roleOn(policyTurn(state).state, CENTER)).toBe("GUARD");
    // With nobody coming, the rule does not apply.
    const quiet = cultScene([bearer, summoner]);
    expect(movePriority(quiet, bearer.at, CENTER)).not.toBe(
      ARMY_GARRISON_FILL_PRIORITY_V7,
    );
  });

  it("steps a Summoner off the lodge for the Thing before it Summons there", () => {
    // The Summoner on the center with an Initiate beside it (its helper) and
    // 5 Favour: a Horror is on offer at once. The Thing stands beside.
    const start = withFavourV7(
      cultScene([
        own("CAPTAIN", 8, 8),
        own("FIGHTER", 7, 8),
        own("FIGHTER", 7, 7),
        own("JUGGERNAUT", 8, 9),
        foe("FIGHTER", 5, 6),
      ]),
      0,
      5,
    );
    const summonerId = unitAtV7(start, CENTER).id;
    const first = decision(start);
    const step = first.candidates.find(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        candidate.command.unitId === summonerId,
    );
    expect(step?.score.priority).toBe(CULT_GARRISON_SWAP_PRIORITY_V7);
    expect(CULT_GARRISON_SWAP_PRIORITY_V7).toBeGreaterThan(
      CULT_SUMMON_PRIORITY_V7,
    );
    const turn = policyTurn(start);
    const stepAt = turn.commands.findIndex(
      (command) => command.kind === "MOVE" && command.unitId === summonerId,
    );
    const summonAt = turn.commands.findIndex(
      (command) => command.kind === "SUMMON",
    );
    expect(stepAt).toBeGreaterThanOrEqual(0);
    if (summonAt >= 0) expect(stepAt).toBeLessThan(summonAt);
    expect(roleOn(turn.state, CENTER)).toBe("JUGGERNAUT");
  });

  it("makes room on a ringed summit so the Thing can take the center", () => {
    // Every tile beside the center is taken by an own unit; the Summoner on
    // the center cannot step off until one of them leaves the ring. The
    // first command of the turn is that step out of the ring.
    const ring = [
      own("JUGGERNAUT", 8, 9),
      own("FIGHTER", 7, 7),
      own("FIGHTER", 8, 7),
      own("FIGHTER", 9, 7),
      own("FIGHTER", 7, 8),
      own("FIGHTER", 9, 8),
      own("FIGHTER", 7, 9),
      own("FIGHTER", 9, 9),
    ];
    const start = cultScene([own("CAPTAIN", 8, 8), ...ring, coming]);
    const first = decision(start);
    const out = first.command;
    expect(out?.kind).toBe("MOVE");
    if (out?.kind === "MOVE") {
      const leaver = start.units.find((unit) => unit.id === out.unitId);
      expect(leaver?.role).toBe("FIGHTER");
      expect(
        Math.max(
          Math.abs((out.path.at(-1)?.x ?? 8) - 8),
          Math.abs((out.path.at(-1)?.y ?? 8) - 8),
        ),
      ).toBeGreaterThanOrEqual(2);
    }
    expect(first.candidates[0]?.score.priority).toBe(
      CULT_GARRISON_SWAP_PRIORITY_V7,
    );
    expect(roleOn(policyTurn(start).state, CENTER)).toBe("JUGGERNAUT");
  });
});

describe("the Summoner does not kill its way into the enemy line (section 15.10)", () => {
  // A wounded Human Catapult beside a Cult Summoner; a Human Fighter two
  // tiles beyond it can strike the Catapult's tile next turn.
  const catapult = { ...foe("CATAPULT", 6, 2), hp: 1 };
  const attacks = (state: GameStateV7, from: CoordV7) => {
    const id = unitAtV7(state, from).id;
    return decision(state).candidates.filter(
      (candidate) =>
        candidate.command.kind === "ATTACK" && candidate.command.unitId === id,
    );
  };

  it("makes no kill that advances it into another enemy's reach", () => {
    const state = cultScene([
      own("CAPTAIN", 6, 3),
      catapult,
      foe("FIGHTER", 6, 0),
    ]);
    expect(attacks(state, at(6, 3))).toEqual([]);
    // With nobody else near, the kill is made.
    const alone = cultScene([own("CAPTAIN", 6, 3), catapult]);
    expect(attacks(alone, at(6, 3)).length).toBeGreaterThan(0);
    // An Initiate is no back-row unit: it makes the kill.
    const initiate = cultScene([
      own("FIGHTER", 6, 3),
      catapult,
      foe("FIGHTER", 6, 0),
    ]);
    expect(attacks(initiate, at(6, 3)).length).toBeGreaterThan(0);
  });
});

describe("the Offering is paced (section 15.10)", () => {
  const viewWith = (
    round: number,
    cities: readonly { id: number; offered?: number; owner?: number }[],
  ): PlayerViewV7 =>
    ({
      round,
      viewer: { id: 1 },
      cities: cities.map((city) => ({
        id: city.id,
        ownerId: city.owner ?? 1,
        ...(city.offered === undefined
          ? {}
          : { offeredPopulation: city.offered }),
      })),
    }) as unknown as PlayerViewV7;

  it("lets one city a round offer, in turn, and one Offering every other round", () => {
    const three = [{ id: 4 }, { id: 9 }, { id: 2 }];
    // Round 1: the second city by ID (round 1 modulo 3), and no other.
    const due = (round: number, cities = three) =>
      [2, 4, 9].filter((id) =>
        cultOfferingDueV7(viewWith(round, cities), cityId(id)),
      );
    expect(due(1)).toEqual([4]);
    // One Offering made (city 4 gave up 2): none in round 2.
    const once = [{ id: 4, offered: 2 }, { id: 9 }, { id: 2 }];
    expect(due(2, once)).toEqual([]);
    expect(due(3, once)).toEqual([2]);
    // A seat that never offered still offers in one city a round only.
    expect(due(12)).toEqual([2]);
    // Another seat's city is not counted, nor offered.
    expect(
      cultOfferingDueV7(
        viewWith(1, [{ id: 3, owner: 2 }, { id: 5 }]),
        cityId(3),
      ),
    ).toBe(false);
    expect(CULT_OFFERING_PACE_ROUNDS_V7).toBe(2);
  });

  it("does not offer in every turn from a city at its unit limit (the lodge's Herald in round 2)", () => {
    // The capital with four Farms (level 3, population 3), at its unit
    // limit (a Summoner and an Idol Bearer homed to it), with The Stars Are
    // Right and 9 Favour: short of the Great Summoning's 20.
    const start: GameStateV7 = {
      ...withFavourV7(
        withFarmsV7(
          cultScene([own("CAPTAIN", 9, 2), own("GUARD", 8, 8)]),
          0,
          4,
        ),
        0,
        9,
      ),
      round: 1,
    };
    const offerings = (state: GameStateV7): number =>
      policyTurn(state).commands.filter(
        (command) => command.kind === "OFFERING",
      ).length;
    const first = policyTurn(start);
    expect(
      first.commands.filter((command) => command.kind === "OFFERING"),
    ).toHaveLength(1);
    // A later round with that Offering made, a Farm more (population 3
    // again), and the city's action back.
    const later = (round: number): GameStateV7 => ({
      ...withFarmsV7(first.state, 0, 1),
      round,
    });
    expect(cityOfV7(later(2), 0).offeredPopulation).toBe(2);
    expect(
      queryAiReadyCommandsV7(viewOf(later(2))).some(
        (item) => item.command.kind === "OFFERING",
      ),
    ).toBe(true);
    // None in round 2 (one every other round); one again in round 3.
    expect(offerings(later(2))).toBe(0);
    expect(offerings(later(3))).toBe(1);
  });
});
