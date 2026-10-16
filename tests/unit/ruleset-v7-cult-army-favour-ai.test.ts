import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
} from "../../src/ai/v7";
import {
  ARMY_PLAY_FACTIONS_V7,
  setArmyPlayFactionsV7,
} from "../../src/ai/v7-army";
import {
  CULT_CAP_SPEND_FAVOUR_V7,
  CULT_FAVOUR_CAP_V7,
  CULT_FEED_INITIATE_VALUE_V7,
  CULT_HUNGER_FAVOUR_V7,
  CULT_MASS_ALERT_RADIUS_V7,
  cultBodiesWantedV7,
  cultCasterV7,
  cultFeedWantedV7,
  cultHungerV7,
  cultMassWantedV7,
  cultUpkeepV7,
  cultWardenV7,
} from "../../src/ai/v7-cult";
import {
  CULT_FLEE_PRIORITY_V7,
  CULT_RELEASE_PRIORITY_V7,
  CULT_SACRIFICE_PRIORITY_V7,
  CULT_SUMMON_FRONT_V7,
  CULT_WARDEN_PRIORITY_V7,
} from "../../src/ai/v7-cult-channel";
import {
  TECHNOLOGY_IDS_V7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  queryThreatenedTilesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  cultFieldV7,
  withFarmsV7,
  withFavourV7,
  withFrogsV7,
  withHorrorV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import { unitCandidatesV7 } from "../fixtures/v7-dinosaur-ai";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import type { FieldOptionsV7 } from "../fixtures/v7-revision20";

// The Cult redesign's A-R1 (`pulp_wars-mch9.38`,
// docs/product/RULESET_7_CULT_REDESIGN.md sections 12.1 and 12.2; the
// research order and the shares are in ruleset-v7-cult-ai.test.ts): the
// Cult seat's army rules and its Favour. No match was played: every rule is
// a decision, or the one turn the seat plays, on a small hand-built state,
// each beside the nearest state in which it must not fire.
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (the Cult, the
// viewer, to move) capital (8, 8) with territory x 7-9, y 7-9; seat 1
// (Human) capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
// (8, 5), (5, 8); every other land tile open Grass; every tile explored;
// every technology; no Coins unless stated. Roles: FIGHTER the Initiate,
// CAPTAIN the Summoner, MARKSMAN the Hexer, GUARD the Idol Bearer, RAIDER
// the Familiar, JUGGERNAUT the Thing.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7 | undefined, right: CoordV7): boolean =>
  left !== undefined && left.x === right.x && left.y === right.y;

const own = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

/** A unit that can do nothing more this turn (a daemon summoned today). */
const SPENT: Partial<UnitStateV7["activation"]> = {
  moved: true,
  attacked: true,
  attacksUsed: 1,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};
/** A cultist that has channelled this turn. */
const CHANNELLED: Partial<UnitStateV7["activation"]> = {
  specialActed: true,
  handled: true,
};

/** The Human garrison: the enemy the board always has, far from the scene. */
const GARRISON = foe("FIGHTER", 2, 8);

const scene = (
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 => {
  const state = cultFieldV7([...pieces, GARRISON], { coins: 0, ...options });
  return {
    ...state,
    round: 12,
    // No free Monument left to build: the capital stays as it is, and no
    // Militia joins the scene.
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.unlocked ? { ...entry, spent: true } : entry,
      ),
    })),
  };
};

/** The state with `amount` Favour for seat 0 (no entry for none). */
const favoured = (
  state: GameStateV7,
  seat: number,
  amount: number,
): GameStateV7 =>
  amount > 0
    ? withFavourV7(state, seat, amount)
    : { ...state, cult: { ...state.cult, favour: [] } };

/** Every technology but Tentacles: no Summoner calls a Tentacle. */
const NO_TENTACLES: FieldOptionsV7 = {
  techs: {
    0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "CHIVALRY"),
    1: TECHNOLOGY_IDS_V7,
  },
};

function viewOf(state: GameStateV7): PlayerViewV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
}

const decision = (state: GameStateV7) => chooseNormalCommandV7(viewOf(state));

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
    const chosen = chooseNormalCommandV7(view);
    const command = chooseNormalTurnCommandV7(view, accepted, 128, chosen);
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
    // Every command the seat plays is one the engine offers it.
    expect(
      queryAiReadyCommandsV7(view).some(
        (item) => JSON.stringify(item.command) === JSON.stringify(command),
      ),
      command.kind,
    ).toBe(true);
    commands.push(command);
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

const ofKind = <K extends CommandV7["kind"]>(
  commands: readonly CommandV7[],
  kind: K,
): readonly Extract<CommandV7, { kind: K }>[] =>
  commands.filter(
    (command): command is Extract<CommandV7, { kind: K }> =>
      command.kind === kind,
  );

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const nowAt = (state: GameStateV7, id: UnitId): CoordV7 | undefined =>
  state.units.find((unit) => unit.id === id)?.at;

const favourOf = (state: GameStateV7): number =>
  state.cult.favour.find((entry) => entry.playerId === seatIdV7(state, 0))
    ?.favour ?? 0;

/** The holding strands of the daemon on `where`, as its owner sees them. */
const strandsOn = (state: GameStateV7, where: CoordV7): number => {
  const daemon = unitAtV7(state, where);
  return (
    viewOf(state).cult.daemons.find((entry) => entry.unitId === daemon.id)
      ?.strands ?? -1
  );
};

/** The tiles the Move candidates of the unit on `from` end on. */
const ends = (state: GameStateV7, from: CoordV7): readonly CoordV7[] =>
  unitCandidatesV7(state, from, "MOVE").flatMap((candidate) => {
    const end =
      candidate.command.kind === "MOVE"
        ? candidate.command.path.at(-1)
        : undefined;
    return end === undefined ? [] : [end];
  });

const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));

describe("the Cult seat (A-R1): casters and the warden", () => {
  it("names every robed cultist but the Idol Bearer a caster, and the Idol Bearer the warden", () => {
    const state = scene([
      own("FIGHTER", 6, 1),
      own("MARKSMAN", 7, 1),
      own("CAPTAIN", 8, 1),
      own("CATAPULT", 9, 1),
      own("GUARD", 6, 2),
      own("RAIDER", 7, 2),
      own("JUGGERNAUT", 8, 2),
    ]);
    const view = viewOf(state);
    const mine = view.units.filter((unit) => unit.ownerId === view.viewer.id);
    expect(
      mine
        .filter((unit) => cultCasterV7(view, unit))
        .map((unit) => unit.role)
        .sort(),
    ).toEqual(["CAPTAIN", "CATAPULT", "FIGHTER", "MARKSMAN"]);
    expect(
      mine.filter((unit) => cultWardenV7(view, unit)).map((unit) => unit.role),
    ).toEqual(["GUARD"]);
  });
});

describe("the Cult seat (A-R1): cultists do not brawl", () => {
  // An Initiate beside a Human Fighter. (No Tentacles: a Summoner would
  // call one on the Fighter first.)
  const brawl = (
    hp: number,
    extra: readonly GoblinPieceV7[] = [],
  ): GameStateV7 =>
    scene(
      [own("FIGHTER", 5, 3), foe("FIGHTER", 4, 3, { hp }), ...extra],
      NO_TENTACLES,
    );
  const attacks = (state: GameStateV7, from: CoordV7): number =>
    unitCandidatesV7(state, from, "ATTACK").length;
  const blow = (state: GameStateV7) =>
    queryCombatPreviewV7(
      viewOf(state),
      idAt(state, at(5, 3)),
      idAt(state, at(4, 3)),
    );

  it("makes no blow that neither kills nor sets up a Seizure", () => {
    // A Fighter at 7 HP: the Initiate's blow leaves it alive (broken, but
    // no Summoner is near to Seize it).
    const lone = brawl(7);
    expect(blow(lone)?.defenderDies).toBe(false);
    expect(7 - (blow(lone)?.damageToDefender ?? 0)).toBeLessThanOrEqual(5);
    expect(attacks(lone, at(5, 3))).toBe(0);
    // Without the rule the army policy strikes it (a wounded enemy): the
    // older policy, which has no Cult rules, does too.
    const previous = setArmyPlayFactionsV7(
      ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "CULT"),
    );
    try {
      expect(attacks(lone, at(5, 3))).toBe(1);
    } finally {
      setArmyPlayFactionsV7(previous);
    }
    // Sanity (the mutation): the blow that kills is made.
    const weak = brawl(2);
    expect(blow(weak)?.defenderDies).toBe(true);
    expect(attacks(weak, at(5, 3))).toBe(1);
  });

  it("strikes a blow that leaves the enemy broken beside a Summoner", () => {
    // 7 HP: the Initiate's blow leaves it at 5 or less, alive.
    // A Summoner beside the Fighter: the Initiate holds it down, and the
    // Seizure follows the blow.
    const company = brawl(7, [own("CAPTAIN", 4, 2)]);
    expect(attacks(company, at(5, 3))).toBe(1);
    const turn = policyTurn(company);
    expect(ofKind(turn.commands, "SEIZE")).toHaveLength(1);
  });

  it("strikes a frog", () => {
    const frog = withFrogsV7(brawl(10), [at(4, 3)]);
    expect(attacks(frog, at(5, 3))).toBe(1);
  });

  // Two Human Fighters on (2, 2) and (3, 2) attack every tile within two of
  // them next turn, and the garrison on (2, 8) every tile within two of it;
  // the mover on (2, 5) stands outside every reach.
  const approach = (
    mover: UnitRoleIdV7,
    screen: readonly GoblinPieceV7[] = [],
  ): GameStateV7 => ({
    ...cultFieldV7([
      own(mover, 2, 5),
      own("FIGHTER", 8, 8),
      ...screen,
      foe("FIGHTER", 2, 2),
      foe("FIGHTER", 3, 2),
      GARRISON,
    ]),
    round: 12,
  });
  const reached = (state: GameStateV7, where: CoordV7): boolean => {
    const view = viewOf(state);
    return view.units.some(
      (unit) =>
        unit.ownerId !== view.viewer.id &&
        queryThreatenedTilesV7(view, unit.id).some((tile) => same(tile, where)),
    );
  };
  const offered = (state: GameStateV7, from: CoordV7): readonly CoordV7[] => {
    const id = idAt(state, from);
    return queryAiReadyCommandsV7(viewOf(state)).flatMap((item) => {
      const end =
        item.command.kind === "MOVE" && item.command.unitId === id
          ? item.command.path.at(-1)
          : undefined;
      return end === undefined ? [] : [end];
    });
  };

  it("walks no Initiate into a visible enemy's reach", () => {
    const state = approach("FIGHTER");
    expect(reached(state, at(2, 5))).toBe(false);
    // The engine offers it Moves into the Fighters' reach and the
    // garrison's (the ordinary play makes the one to (3, 6) without the rule).
    expect(offered(state, at(2, 5)).some((end) => reached(state, end))).toBe(
      true,
    );
    expect(ends(state, at(2, 5)).some((end) => reached(state, end))).toBe(
      false,
    );
    // Nor another caster behind an Initiate: it is no screen.
    const screened = approach("MARKSMAN", [own("FIGHTER", 2, 3)]);
    expect(ends(screened, at(2, 5)).some((end) => reached(screened, end))).toBe(
      false,
    );
  });

  it("walks one in behind an Idol Bearer or a bound summon nearer the enemy", () => {
    // (3, 4) is in the Fighters' reach; the Idol Bearer on (2, 3) stands
    // nearer them.
    const bearer = approach("FIGHTER", [own("GUARD", 2, 3)]);
    expect(reached(bearer, at(3, 4))).toBe(true);
    expect(ends(bearer, at(2, 5))).toContainEqual(at(3, 4));
    // A Horror on (2, 3), held by two cultists that have channelled
    // (Control and one to spare): the mover is no channeller of it.
    const horror = withStrandsV7(
      withHorrorV7(
        approach("FIGHTER", [
          own("FIGHTER", 4, 5, { activation: CHANNELLED }),
          own("FIGHTER", 4, 6, { activation: CHANNELLED }),
        ]),
        0,
        at(2, 3),
        { activation: SPENT },
      ),
      at(2, 3),
      [at(4, 5), at(4, 6)],
    );
    expect(strandsOn(horror, at(2, 3))).toBe(2);
    expect(ends(horror, at(2, 5))).toContainEqual(at(2, 4));
    // Still none into the garrison's reach, which nothing screens.
    expect(reached(bearer, at(3, 6))).toBe(true);
    expect(ends(bearer, at(2, 5))).not.toContainEqual(at(3, 6));
  });
});

describe("the Cult seat (A-R1): bodies first, and spare Coins become Favour", () => {
  // A Summoner and two Initiates in the north-east corner; a Human Fighter
  // within six of the Summoner, or none (the Human capital and its
  // garrison stand eight tiles off).
  const field = (
    favour: number,
    near: boolean,
    options: FieldOptionsV7 = {},
  ): GameStateV7 =>
    favoured(
      scene(
        [
          own("CAPTAIN", 10, 1),
          own("FIGHTER", 10, 0),
          own("FIGHTER", 9, 0),
          ...(near ? [foe("FIGHTER", 6, 1)] : []),
        ],
        options,
      ),
      0,
      favour,
    );
  const hostile = (view: PlayerViewV7) => (owner: number) =>
    owner !== view.viewer.id;
  const wanted = (state: GameStateV7): boolean => {
    const view = viewOf(state);
    return cultFeedWantedV7(view, hostile(view));
  };

  it("wants an Initiate to Sacrifice when a summon is wanted and one reaches the Horror's 4", () => {
    expect(gap(at(10, 1), at(6, 1))).toBeLessThanOrEqual(CULT_SUMMON_FRONT_V7);
    expect(gap(at(10, 1), GARRISON.at)).toBeGreaterThan(CULT_SUMMON_FRONT_V7);
    expect(wanted(field(2, true))).toBe(true);
    expect(wanted(field(3, true))).toBe(true);
    // Sanity (the mutations): with 4 it summons already; with 1 one
    // Initiate (2) does not reach 4; with no enemy near no summon is wanted.
    expect(wanted(field(4, true))).toBe(false);
    expect(wanted(field(1, true))).toBe(false);
    expect(wanted(field(2, false))).toBe(false);
  });

  it("feeds a Herald's Hunger and the Great Summoning's price too", () => {
    // A bound Herald eats 2: the Horror is 6 away then, and 4 Favour is
    // short of it.
    const herald = (favour: number): GameStateV7 =>
      withHorrorV7(field(favour, true), 0, at(8, 3), { role: "HERALD" });
    expect(wanted(herald(4))).toBe(true);
    expect(wanted(herald(6))).toBe(false);
    // With The Stars Are Right, 16 is one Initiate short of 18.
    expect(wanted(field(16, true))).toBe(true);
    expect(
      wanted(
        field(16, true, {
          techs: {
            0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
            1: TECHNOLOGY_IDS_V7,
          },
        }),
      ),
    ).toBe(false);
  });

  it("wants robed cultists for every daemon's strands and two, and the Initiate it feeds on", () => {
    // One city: its cities and two (3); with a Horror its Control + 1 and
    // two (4); the Initiate to Sacrifice on top (5).
    const plain = viewOf(field(4, true));
    expect(cultUpkeepV7(plain)).toBe(0);
    expect(cultBodiesWantedV7(plain, hostile(plain))).toBe(3);
    const horror = viewOf(withHorrorV7(field(4, true), 0, at(8, 3)));
    expect(cultUpkeepV7(horror)).toBe(2);
    expect(cultBodiesWantedV7(horror, hostile(horror))).toBe(4);
    const fed = viewOf(withHorrorV7(field(2, true), 0, at(8, 3)));
    expect(cultBodiesWantedV7(fed, hostile(fed))).toBe(5);
  });

  it("trains the Initiate it will Sacrifice", () => {
    // The capital has a free slot (the units are homeless) and 2 Coins.
    const build = (favour: number): GameStateV7 => {
      const state = field(favour, true, { coins: 2 });
      return {
        ...state,
        units: state.units.map((unit) =>
          unit.ownerId === seatIdV7(state, 0)
            ? { ...unit, homeCityId: null }
            : unit,
        ),
      };
    };
    const initiate = (state: GameStateV7) =>
      decision(state).candidates.find(
        (candidate) =>
          candidate.command.kind === "TRAIN" &&
          candidate.command.role === "FIGHTER",
      )?.score;
    // (With 2 Favour the seat first Sacrifices the spare Initiate it has, a
    // step of its plan, for the Horror's 4.)
    expect(initiate(build(2))).toBeDefined();
    // With 4 Favour the same Initiate is worth the feeding's value less.
    expect(
      (initiate(build(2))?.strategicValue ?? 0) -
        (initiate(build(4))?.strategicValue ?? 0),
    ).toBe(CULT_FEED_INITIATE_VALUE_V7);
  });
});

describe("the Cult seat (A-R1): the research", () => {
  // The seat owns Leadership, Crafting, and Warding Circles; one Human
  // unit stands within six of its capital (8, 8), or far away (no other
  // unit of the Human seat on the board).
  const quiet = (hostile: GoblinPieceV7): GameStateV7 => {
    const state = cultFieldV7(
      [
        own("FIGHTER", 9, 9),
        own("FIGHTER", 9, 8),
        own("FIGHTER", 9, 7),
        hostile,
      ],
      {
        coins: 0,
        techs: {
          0: techsOf("GATHERING", "ADMINISTRATION", "DRILL", "FORTIFICATION"),
          1: [],
        },
      },
    );
    return {
      ...state,
      units: state.units.map((unit) =>
        unit.ownerId === seatIdV7(state, 0)
          ? { ...unit, homeCityId: null }
          : unit,
      ),
    };
  };
  const hostilesOf = (state: GameStateV7) => {
    const view = viewOf(state);
    return view.units.filter((unit) => unit.ownerId !== view.viewer.id);
  };

  it("moves Gibbering Masses up after Warding Circles with an enemy near an own city", () => {
    const near = quiet(foe("FIGHTER", 4, 4));
    const far = quiet(foe("FIGHTER", 0, 0));
    expect(gap(at(4, 4), at(8, 8))).toBeLessThanOrEqual(
      CULT_MASS_ALERT_RADIUS_V7,
    );
    expect(gap(at(0, 0), at(8, 8))).toBeGreaterThan(CULT_MASS_ALERT_RADIUS_V7);
    expect(cultMassWantedV7(viewOf(near), hostilesOf(near))).toBe(true);
    expect(cultMassWantedV7(viewOf(far), hostilesOf(far))).toBe(false);
    // Engineering is the first step to Gibbering Masses.
    expect(inspectNormalArmyV7(viewOf(near)).research?.tech).toBe(
      "ENGINEERING",
    );
    // Sanity (the mutations): with nobody near, the order's Hunting; with
    // a Raider near, the Hexers-wanted rule's Hunting first.
    expect(inspectNormalArmyV7(viewOf(far)).research?.tech).toBe("HUNTING");
    expect(
      inspectNormalArmyV7(viewOf(quiet(foe("RAIDER", 4, 4)))).research?.tech,
    ).toBe("HUNTING");
  });

  it("wants no Masses before Leadership and Warding Circles, nor once it has them", () => {
    const build = (
      techs: readonly TechnologyIdV7[],
    ): readonly [PlayerViewV7, ReturnType<typeof hostilesOf>] => {
      const state = cultFieldV7([own("FIGHTER", 9, 9), foe("FIGHTER", 4, 4)], {
        techs: { 0: techsOf(...techs), 1: [] },
      });
      return [viewOf(state), hostilesOf(state)];
    };
    expect(
      cultMassWantedV7(...build(["GATHERING", "ADMINISTRATION", "DRILL"])),
    ).toBe(false);
    // Nor without Leadership: only a Summoner summons a Mass.
    expect(
      cultMassWantedV7(...build(["GATHERING", "DRILL", "FORTIFICATION"])),
    ).toBe(false);
    expect(
      cultMassWantedV7(
        ...build(["GATHERING", "ADMINISTRATION", "DRILL", "FORTIFICATION"]),
      ),
    ).toBe(true);
    expect(
      cultMassWantedV7(
        ...build([
          "GATHERING",
          "ADMINISTRATION",
          "DRILL",
          "FORTIFICATION",
          "ENGINEERING",
          "METALLURGY",
        ]),
      ),
    ).toBe(false);
  });
});

describe("the Cult seat (A-R1): the Herald's Hunger", () => {
  it("counts 2 Favour a bound Herald", () => {
    const state = withHorrorV7(
      withHorrorV7(scene([]), 0, at(4, 2)),
      0,
      at(4, 4),
      { role: "HERALD" },
    );
    expect(CULT_HUNGER_FAVOUR_V7).toBe(2);
    expect(cultHungerV7(viewOf(state))).toBe(2);
    expect(cultUpkeepV7(viewOf(state))).toBe(6);
  });

  // A Herald that can act, four Initiates behind it, a Human Fighter in
  // front: the seat cannot feed it with Favour 0 and nobody to Sacrifice.
  const loose = (favour: number): GameStateV7 =>
    favoured(
      withHorrorV7(
        scene([
          own("FIGHTER", 4, 6),
          own("FIGHTER", 5, 6),
          own("FIGHTER", 6, 6),
          own("FIGHTER", 7, 6),
          foe("FIGHTER", 5, 1),
        ]),
        0,
        at(5, 4),
        { role: "HERALD" },
      ),
      0,
      favour,
    );

  it("lets a Herald go that it cannot feed: released toward the enemy, before anything else", () => {
    const starving = decision(loose(0));
    expect([CULT_RELEASE_PRIORITY_V7, CULT_FLEE_PRIORITY_V7]).toContain(
      starving.candidates[0]?.score.priority,
    );
    const turn = policyTurn(loose(0));
    expect(ofKind(turn.commands, "CHANNEL")).toHaveLength(0);
    // Sanity (the mutation): with its 2 Favour it is held (Control and
    // one to spare), and nothing is released.
    const fed = decision(loose(2));
    expect(fed.candidates[0]?.score.priority).toBeLessThan(
      CULT_FLEE_PRIORITY_V7,
    );
    const held = policyTurn(loose(2));
    expect(ofKind(held.commands, "CHANNEL").length).toBeGreaterThanOrEqual(3);
  });

  // A Herald that has acted, held by three cultists that have channelled; a
  // Summoner with its action and an Initiate beside it.
  const hungry = (favour: number, spare: boolean): GameStateV7 =>
    favoured(
      withStrandsV7(
        withHorrorV7(
          scene([
            own("FIGHTER", 6, 3, { activation: CHANNELLED }),
            own("FIGHTER", 6, 4, { activation: CHANNELLED }),
            own("FIGHTER", 6, 5, { activation: CHANNELLED }),
            own("CAPTAIN", 7, 2),
            ...(spare ? [own("FIGHTER", 8, 2)] : []),
          ]),
          0,
          at(4, 4),
          { activation: SPENT, role: "HERALD" },
        ),
        at(4, 4),
        [at(6, 3), at(6, 4), at(6, 5)],
      ),
      0,
      favour,
    );

  it("Sacrifices a spare Initiate to feed it", () => {
    const start = hungry(0, true);
    const view = viewOf(start);
    const step = chooseNormalCommandV7(view).candidates.find(
      (candidate) => candidate.command.kind === "SACRIFICE",
    );
    expect(step?.score.priority).toBe(CULT_SACRIFICE_PRIORITY_V7);
    expect(step?.command).toMatchObject({
      kind: "SACRIFICE",
      unitId: idAt(start, at(7, 2)),
      victimUnitId: idAt(start, at(8, 2)),
    });
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "SACRIFICE")).toHaveLength(1);
    expect(favourOf(turn.state)).toBeGreaterThanOrEqual(CULT_HUNGER_FAVOUR_V7);
    expect(strandsOn(turn.state, at(4, 4))).toBeGreaterThanOrEqual(3);
    // Sanity (the mutation): with its 2 Favour nothing is Sacrificed.
    expect(
      ofKind(policyTurn(hungry(2, true)).commands, "SACRIFICE"),
    ).toHaveLength(0);
  });

  it("channels the Summoner for the trickle when that is what pays it", () => {
    // 1 Favour, nobody to Sacrifice: the Summoner's strand pays 1 at the
    // check, before the Hunger.
    const start = hungry(1, false);
    const summoner = idAt(start, at(7, 2));
    const turn = policyTurn(start);
    expect(
      ofKind(turn.commands, "CHANNEL").some(
        (command) => command.unitId === summoner,
      ),
    ).toBe(true);
    expect(strandsOn(turn.state, at(4, 4))).toBe(4);
    // Sanity (the mutation): with 0 even the trickle does not pay it, and
    // the seat lets it go.
    expect([CULT_RELEASE_PRIORITY_V7, CULT_FLEE_PRIORITY_V7]).toContain(
      decision(hungry(0, false)).candidates[0]?.score.priority,
    );
  });

  it("spends none of the Hunger on a Horror", () => {
    // Four channellers hold the Herald (Control and one); a Summoner, its
    // helper, and a Human Fighter within six.
    const build = (favour: number): GameStateV7 =>
      favoured(
        withStrandsV7(
          withHorrorV7(
            scene([
              own("FIGHTER", 6, 3, { activation: CHANNELLED }),
              own("FIGHTER", 6, 4, { activation: CHANNELLED }),
              own("FIGHTER", 6, 5, { activation: CHANNELLED }),
              own("FIGHTER", 5, 6, { activation: CHANNELLED }),
              own("CAPTAIN", 9, 2),
              own("FIGHTER", 9, 3),
              foe("FIGHTER", 4, 1),
            ]),
            0,
            at(4, 4),
            { activation: SPENT, role: "HERALD" },
          ),
          at(4, 4),
          [at(6, 3), at(6, 4), at(6, 5), at(5, 6)],
        ),
        0,
        favour,
      );
    expect(ofKind(policyTurn(build(5)).commands, "SUMMON")).toHaveLength(0);
    // Sanity (the mutation): with 6 the Horror's 4 leaves the Hunger's 2.
    const rich = policyTurn(build(6));
    expect(ofKind(rich.commands, "SUMMON")).toHaveLength(1);
    expect(favourOf(rich.state)).toBe(2);
  });

  it("makes an Offering to feed it, short of nothing else", () => {
    // The capital at level 2 with 2 population (two Farms), its slots full;
    // a Summoner and an Idol Bearer (no bodies for a Horror: the Offering
    // was made only toward a summon before), and a Herald.
    const build = (favour: number): GameStateV7 =>
      favoured(
        withHorrorV7(
          withFarmsV7(
            scene([own("CAPTAIN", 9, 2), own("GUARD", 8, 8)], {
              techs: {
                0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
                1: [],
              },
            }),
            0,
            2,
          ),
          0,
          at(5, 2),
          { activation: SPENT, role: "HERALD" },
        ),
        0,
        favour,
      );
    const offered = queryAiReadyCommandsV7(viewOf(build(1))).some(
      (item) => item.command.kind === "OFFERING",
    );
    expect(offered).toBe(true);
    expect(ofKind(policyTurn(build(1)).commands, "OFFERING")).toHaveLength(1);
    // Sanity (the mutation): with the Hunger's 2 it makes none.
    expect(ofKind(policyTurn(build(2)).commands, "OFFERING")).toHaveLength(0);
  });
});

describe("the Cult seat (A-R1): the cap", () => {
  it("summons with no enemy near from 26 Favour, before its gains are lost", () => {
    expect(CULT_FAVOUR_CAP_V7).toBe(30);
    const far = (favour: number): GameStateV7 =>
      favoured(
        scene([own("CAPTAIN", 10, 0), own("FIGHTER", 10, 1)]),
        0,
        favour,
      );
    expect(gap(at(10, 0), GARRISON.at)).toBeGreaterThan(
      CULT_SUMMON_FRONT_V7 + 1,
    );
    expect(
      ofKind(policyTurn(far(CULT_CAP_SPEND_FAVOUR_V7)).commands, "SUMMON"),
    ).toHaveLength(1);
    // Sanity (the mutation): one below, it waits for an enemy.
    expect(
      ofKind(policyTurn(far(CULT_CAP_SPEND_FAVOUR_V7 - 1)).commands, "SUMMON"),
    ).toHaveLength(0);
  });
});

describe("the Cult seat (A-R1): the trickle", () => {
  // A Horror that has acted, an Initiate beside it, a Summoner two tiles
  // off with nothing to Seize, Summon, or call up, and an Initiate one step
  // from the neutral village (5, 5).
  const build = (favour: number, village: boolean): GameStateV7 =>
    favoured(
      withHorrorV7(
        scene([
          own("FIGHTER", 6, 3),
          own("CAPTAIN", 7, 2),
          ...(village ? [own("FIGHTER", 6, 6)] : [own("FIGHTER", 6, 1)]),
        ]),
        0,
        at(5, 3),
        { activation: SPENT },
      ),
      0,
      favour,
    );

  it("channels a Summoner with nothing better to do, before an Initiate with a village to take", () => {
    const start = build(0, true);
    const summoner = idAt(start, at(7, 2));
    const walker = idAt(start, at(6, 6));
    const turn = policyTurn(start);
    expect(
      ofKind(turn.commands, "CHANNEL").map((command) => command.unitId),
    ).toContain(summoner);
    // The Initiate takes the village (Pamphlets) instead of a strand.
    expect(same(nowAt(turn.state, walker), at(5, 5))).toBe(true);
    // Sanity (the mutation): an Initiate with no village to take channels
    // before the Summoner (the plain cultists first), and the Summoner
    // channels too (the trickle).
    const plain = build(0, false);
    const other = idAt(plain, at(6, 1));
    const both = policyTurn(plain);
    const channellers = ofKind(both.commands, "CHANNEL").map(
      (command) => command.unitId,
    );
    expect(channellers).toContain(other);
    expect(channellers).toContain(idAt(plain, at(7, 2)));
  });

  it("channels no Summoner for the trickle at the cap", () => {
    const capped = policyTurn(build(CULT_FAVOUR_CAP_V7, false));
    const summoner = idAt(build(CULT_FAVOUR_CAP_V7, false), at(7, 2));
    expect(
      ofKind(capped.commands, "CHANNEL").some(
        (command) => command.unitId === summoner,
      ),
    ).toBe(false);
  });
});

describe("the Cult seat (A-R1): the warden's placement", () => {
  // A Horror held by two Initiates that have channelled, on (4, 5) and
  // (6, 5); a Human Fighter on (5, 7) can attack both next turn, or one far
  // away cannot; an Idol Bearer on (6, 3).
  const build = (near: boolean): GameStateV7 =>
    withStrandsV7(
      withHorrorV7(
        scene([
          own("FIGHTER", 4, 5, { activation: CHANNELLED }),
          own("FIGHTER", 6, 5, { activation: CHANNELLED }),
          own("GUARD", 6, 3),
          foe("FIGHTER", near ? 5 : 0, near ? 7 : 0),
        ]),
        0,
        at(5, 3),
        { activation: SPENT },
      ),
      at(5, 3),
      [at(4, 5), at(6, 5)],
    );

  it("steps the Idol Bearer beside the channellers a visible enemy can reach", () => {
    const start = build(true);
    const bearer = idAt(start, at(6, 3));
    const step = decision(start).candidates.find(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        candidate.command.unitId === bearer,
    );
    expect(step?.score.priority).toBe(CULT_WARDEN_PRIORITY_V7);
    const end =
      step?.command.kind === "MOVE" ? step.command.path.at(-1) : undefined;
    expect(end).toEqual(at(5, 4));
    const turn = policyTurn(start);
    expect(same(nowAt(turn.state, bearer), at(5, 4))).toBe(true);
    // Sanity (the mutation): with nobody to reach them, no such step.
    const quiet = build(false);
    expect(
      decision(quiet).candidates.some(
        (candidate) => candidate.score.priority === CULT_WARDEN_PRIORITY_V7,
      ),
    ).toBe(false);
  });

  it("keeps a warden beside them: it ends no Move where it covers fewer", () => {
    // The Idol Bearer on (7, 4) covers the channeller on (6, 5) (no tile it
    // can reach covers both). The engine offers it the neutral village
    // (8, 5), which the ordinary play would take (a capture): it leaves the
    // channeller there, so it is no candidate.
    const start = withStrandsV7(
      withHorrorV7(
        scene([
          own("FIGHTER", 4, 5, { activation: CHANNELLED }),
          own("FIGHTER", 6, 5, { activation: CHANNELLED }),
          own("GUARD", 7, 4),
          foe("FIGHTER", 5, 7),
        ]),
        0,
        at(5, 3),
        { activation: SPENT },
      ),
      at(5, 3),
      [at(4, 5), at(6, 5)],
    );
    const bearer = idAt(start, at(7, 4));
    expect(
      queryAiReadyCommandsV7(viewOf(start)).some(
        (item) =>
          item.command.kind === "MOVE" &&
          item.command.unitId === bearer &&
          same(item.command.path.at(-1), at(8, 5)),
      ),
    ).toBe(true);
    const moves = ends(start, at(7, 4));
    expect(moves.length).toBeGreaterThan(0);
    for (const end of moves) expect(gap(end, at(6, 5))).toBe(1);
  });
});

describe("the Cult seat (A-R1): the Summoner's Tentacle comes after its Summon", () => {
  // A Summoner with a helper and 4 Favour, a Human Fighter three tiles off
  // (a Tentacle beside it slaps it).
  const build = (favour: number): GameStateV7 =>
    favoured(
      scene([own("CAPTAIN", 7, 3), own("FIGHTER", 7, 2), foe("FIGHTER", 4, 3)]),
      0,
      favour,
    );
  const tentacles = (state: GameStateV7): number =>
    decision(state).candidates.filter(
      (candidate) => candidate.command.kind === "TENTACLE",
    ).length;

  it("offers no Tentacle of a Summoner that Summons", () => {
    expect(
      queryAiReadyCommandsV7(viewOf(build(4))).some(
        (item) => item.command.kind === "TENTACLE",
      ),
    ).toBe(true);
    expect(decision(build(4)).command?.kind).toBe("SUMMON");
    expect(tentacles(build(4))).toBe(0);
    // Sanity (the mutation): with no Favour for a summon it calls one.
    expect(tentacles(build(0))).toBe(1);
  });
});
