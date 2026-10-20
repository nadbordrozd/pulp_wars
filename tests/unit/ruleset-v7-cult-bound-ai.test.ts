import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  CULT_LOOSE_KILL_RATIO_V7,
  cultDaemonWorthV7,
} from "../../src/ai/v7-cult-channel";
import { CULT_HERALD_LOOSE_KILLS_V7 } from "../../src/ai/v7-cult-rituals";
import { guardGarrisonV7 } from "../../src/ai/v7-directives";
import {
  missionByIdV7,
  missionInitialStateV7,
  missionMatchSetupV7,
  queryAiReadyCommandsV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { cultFieldV7, withFavourV7, withHorrorV7 } from "../fixtures/v7-cult";
import {
  applyOkV7,
  endTurnUntilV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import type { FieldOptionsV7 } from "../fixtures/v7-revision20";

// `pulp_wars-mch9.57` (the user, 2026-10-20: "cultists AI should make more
// of an effort to avoid having their summons unbound. units on the front
// line should be channelling"), with `pulp_wars-mch9.56` (a bound Herald in
// a GUARD zone stood idle). Each state is a front-line situation in which
// the Cult seat ended its turn with a summon that went Unbound at its next
// check (or that the visible enemy could break loose with one hit on each
// channeller it reaches); the seat now plays its one turn and ends it with
// every summon held, or, where the cultists are too few, with the cheapest
// one let go. No match is played: one turn of the Cult seat, then End Turns
// with the other seats idle to see the check.
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (the Cult, the
// viewer, to move) capital (8, 8) with territory x 7-9, y 7-9; seat 1
// (Human) capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
// (8, 5), (5, 8); every other land tile open Grass; every tile explored;
// every technology. Roles: FIGHTER the Initiate, CAPTAIN the Summoner,
// GUARD the Idol Bearer; on the Human side FIGHTER the Warrior and
// MARKSMAN the Archer (Move 1, range 2).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

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

/** The Human garrison: the enemy the board always has, far from the scene. */
const GARRISON = foe("FIGHTER", 2, 8);

const scene = (
  pieces: readonly GoblinPieceV7[],
  favour: number,
  options: FieldOptionsV7 = {},
): GameStateV7 => {
  const state = cultFieldV7([...pieces, GARRISON], { coins: 0, ...options });
  return withFavourV7(
    {
      ...state,
      round: 12,
      // No free Monument left to build, and no Militia joins the scene.
      players: state.players.map((player) => ({
        ...player,
        achievementEntitlements: player.achievementEntitlements.map((entry) =>
          entry.unlocked ? { ...entry, spent: true } : entry,
        ),
      })),
    },
    0,
    favour,
  );
};

/** The daemon of `role` on `where` for the seat `seat`. */
const daemon = (
  state: GameStateV7,
  where: CoordV7,
  role: "IMP" | "HORROR" | "MASS" | "HERALD",
  activation: Partial<UnitStateV7["activation"]> = SPENT,
  seat = 0,
): GameStateV7 => withHorrorV7(state, seat, where, { role, activation });

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

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

interface DaemonEndV7 {
  readonly unitId: UnitId;
  readonly role: string;
  readonly at: CoordV7;
  readonly control: number;
  /** Held now: its strands reach its Control, or its Brood or Doorstep. */
  readonly held: boolean;
  /**
   * The strands left after the visible enemy's best hits (each enemy unit
   * hits one channeller in its Move + range), or its Control when a Brood
   * or a Doorstep holds it.
   */
  readonly kept: number;
}

/** The strands of `holders` the enemies can break, one each (a matching). */
function breakable(view: PlayerViewV7, holders: readonly CoordV7[]): number {
  const enemies = view.units.filter(
    (unit) =>
      unit.hp > 0 && unit.ownerId !== view.viewer.id && unit.ownerId >= 0,
  );
  const reaches = holders.map((tile) =>
    enemies.flatMap((enemy, index) => {
      const rule = unitRoleRuleV7(view, enemy);
      return gap(enemy.at, tile) <= rule.move + rule.range ? [index] : [];
    }),
  );
  const matched = new Map<number, number>();
  const augment = (index: number, seen: Set<number>): boolean => {
    for (const enemy of reaches[index] ?? []) {
      if (seen.has(enemy)) continue;
      seen.add(enemy);
      const other = matched.get(enemy);
      if (other === undefined || augment(other, seen)) {
        matched.set(enemy, index);
        return true;
      }
    }
    return false;
  };
  return holders.filter((_, index) => augment(index, new Set())).length;
}

/** The Cult seat's turn, then the check with every other seat idle. */
function turnAndCheck(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
  readonly daemons: readonly DaemonEndV7[];
  /** The daemons that broke loose at the next check (the enemy idle). */
  readonly unbound: readonly UnitId[];
} {
  const { commands, state } = policyTurn(start);
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const view = viewForV7(state, actor);
  const daemons = view.cult.daemons.map((entry): DaemonEndV7 => {
    const unit = view.units.find((item) => item.id === entry.unitId);
    if (unit === undefined) throw new Error("no daemon");
    const holders = view.cult.strands
      .filter((strand) => strand.daemonUnitId === entry.unitId)
      .flatMap((strand) => {
        const cultist = view.units.find(
          (item) => item.id === strand.cultistUnitId,
        );
        return cultist !== undefined &&
          gap(cultist.at, unit.at) <= 3 &&
          !view.cult.grips.some(
            (grip) => grip.cultistUnitId === strand.cultistUnitId,
          )
          ? [cultist.at]
          : [];
      });
    const free = entry.broodOf !== undefined || entry.doorstep === true;
    return {
      unitId: entry.unitId,
      role: entry.role,
      at: unit.at,
      control: entry.control,
      held: free || entry.strands >= entry.control,
      kept: free ? entry.control : holders.length - breakable(view, holders),
    };
  });
  const unbound = endTurnUntilV7(state, actor).events.flatMap((event) =>
    event.kind === "DAEMON_UNBOUND" ? [event.unitId] : [],
  );
  return { commands, state, daemons, unbound };
}

/** Every summon is held, out of the visible enemy's power to break it. */
function expectAllSecure(result: ReturnType<typeof turnAndCheck>): void {
  expect(result.unbound).toEqual([]);
  for (const entry of result.daemons) {
    expect(entry.held, `${entry.role} ${entry.unitId} held`).toBe(true);
    expect(
      entry.kept,
      `${entry.role} ${entry.unitId} strands the enemy cannot break`,
    ).toBeGreaterThanOrEqual(entry.control);
  }
}

describe("the Cult seat keeps its summons bound (pulp_wars-mch9.57)", () => {
  it("1. a Horror summoned at the front: the cultists behind channel it from out of reach", () => {
    // A Summoner and an Initiate face two Archers; three Initiates stand
    // behind. The Summoner and its helper hold the new Horror from tiles
    // both Archers reach: each Archer shoots one and the Horror breaks.
    // Before, the Initiates behind took a village and wandered forward.
    const start = scene(
      [
        own("CAPTAIN", 5, 4),
        own("FIGHTER", 5, 5),
        own("FIGHTER", 7, 4),
        own("FIGHTER", 7, 5),
        own("FIGHTER", 8, 4),
        foe("MARKSMAN", 2, 4),
        foe("MARKSMAN", 2, 5),
      ],
      5,
    );
    const result = turnAndCheck(start);
    expect(result.commands.some((command) => command.kind === "SUMMON")).toBe(
      true,
    );
    const horror = result.daemons.find((entry) => entry.role === "HORROR");
    expect(horror).toBeDefined();
    expectAllSecure(result);
    // Two more strands came from tiles no Archer reaches.
    expect(
      result.commands.filter((command) => command.kind === "CHANNEL").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("2. an Imp of a Brood makes no kill whose advance leaves its strand behind", () => {
    // Two Imps together, the lead channelled from behind. The other Imp
    // could kill a wounded Warrior (worth 2) and advance two tiles away from
    // the lead, where nobody holds it: it broke loose at the next check.
    const start = daemon(
      daemon(
        scene([own("FIGHTER", 7, 4), foe("FIGHTER", 4, 6, { hp: 1 })], 1),
        at(6, 4),
        "IMP",
      ),
      at(5, 5),
      "IMP",
      {},
    );
    const imp = idAt(start, at(5, 5));
    const result = turnAndCheck(start);
    expect(
      result.commands.some(
        (command) => command.kind === "ATTACK" && command.unitId === imp,
      ),
    ).toBe(false);
    expectAllSecure(result);
  });

  it("2b. but makes it for a victim worth twice the daemon (a Knight for an Imp)", () => {
    // The same Imp beside a wounded Knight (9 Coins against the Imp's 2
    // Favour): the kill is worth the bind.
    expect(9).toBeGreaterThanOrEqual(
      CULT_LOOSE_KILL_RATIO_V7 * cultDaemonWorthV7("IMP"),
    );
    const start = daemon(
      daemon(
        scene([own("FIGHTER", 7, 4), foe("KNIGHT", 4, 6, { hp: 1 })], 1),
        at(6, 4),
        "IMP",
      ),
      at(5, 5),
      "IMP",
      {},
    );
    const imp = idAt(start, at(5, 5));
    const knight = idAt(start, at(4, 6));
    const { commands } = policyTurn(start);
    expect(commands).toContainEqual({
      kind: "ATTACK",
      unitId: imp,
      targetUnitId: knight,
    });
  });

  it("3. with one cultist for two daemons it holds the dearer and lets the Imp go", () => {
    // An Imp (the lower unit ID) beside a Warrior and a Horror, one
    // Initiate between them that can channel either. Before, the Imp (by
    // unit ID) took the strand; the Horror broke loose and its rampage
    // fell on that Initiate, within 2 of it.
    const start = daemon(
      daemon(
        scene([own("FIGHTER", 5, 3), foe("FIGHTER", 4, 7)], 1),
        at(5, 6),
        "IMP",
      ),
      at(5, 1),
      "HORROR",
    );
    const horror = idAt(start, at(5, 1));
    const imp = idAt(start, at(5, 6));
    const result = turnAndCheck(start);
    expect(result.unbound).toEqual([imp]);
    expect(result.daemons.find((entry) => entry.unitId === horror)?.held).toBe(
      true,
    );
  });

  it("4. a channeller takes a tile out of reach before one beside an Idol Bearer", () => {
    // A Horror, an Idol Bearer and an Initiate; two Archers reach the
    // Bearer and the tiles beside it. The shield wall halves a shot, but any
    // hit breaks a strand: the Initiate channelled from beside the Bearer,
    // both channellers were shot, and the Horror broke loose.
    const start = daemon(
      scene(
        [
          own("FIGHTER", 5, 1),
          own("GUARD", 3, 2),
          foe("MARKSMAN", 1, 4),
          foe("MARKSMAN", 1, 1),
        ],
        1,
      ),
      at(5, 3),
      "HORROR",
    );
    const initiate = idAt(start, at(5, 1));
    const result = turnAndCheck(start);
    const tile = result.state.units.find((unit) => unit.id === initiate)?.at;
    if (tile === undefined) throw new Error("the Initiate is gone");
    // Out of both Archers' reach (Move 1 + range 2).
    expect(Math.min(gap(tile, at(1, 4)), gap(tile, at(1, 1)))).toBeGreaterThan(
      3,
    );
    expectAllSecure(result);
  });

  it("5. a Horror ends no Move where its cultists cannot follow (a lake between)", () => {
    // Two Initiates behind a lake, four tiles from where the Horror would
    // strike a wounded Warrior. "Within 4" counted them, but no Move
    // brings them within 3: the Horror broke loose.
    const start = daemon(
      scene(
        [
          own("FIGHTER", 9, 2),
          own("FIGHTER", 9, 4),
          foe("FIGHTER", 4, 3, { hp: 4 }),
        ],
        1,
        {
          water: [at(8, 1), at(8, 2), at(8, 3), at(8, 4), at(8, 5)],
        },
      ),
      at(6, 3),
      "HORROR",
      {},
    );
    const result = turnAndCheck(start);
    expectAllSecure(result);
    const horror = result.daemons.find((entry) => entry.role === "HORROR");
    expect(horror?.at.x).toBeGreaterThanOrEqual(6);
  });

  it("6. a Gibbering Mass on its Doorstep stays where it is held (a guard of the change)", () => {
    // A Mass beside the capital (its Doorstep) and one Initiate across a
    // lake, four tiles from the Mass's step toward a wounded Warrior. (Not
    // a failure before this bead: the Mass took the capital's center, its
    // Doorstep; kept so the new follow rule, an offered Move within the
    // Channel's reach, holds it there too.)
    const start = daemon(
      scene([own("FIGHTER", 2, 4), foe("FIGHTER", 5, 6, { hp: 4 })], 1, {
        water: [at(3, 2), at(3, 3), at(3, 4), at(3, 5), at(3, 6)],
      }),
      at(7, 7),
      "MASS",
      {},
    );
    const result = turnAndCheck(start);
    expectAllSecure(result);
  });

  it("7. the Herald makes no pair of cheap kills that carries it off its leash", () => {
    // A Herald that has moved, beside two wounded Warriors in a row; its
    // four cultists can follow it only to x = 5. Killing both (4 Coins
    // together) advanced it to x = 3: Unbound, for two Warriors.
    expect(4).toBeLessThan(CULT_HERALD_LOOSE_KILLS_V7);
    const start = daemon(
      scene(
        [
          own("FIGHTER", 9, 1),
          own("FIGHTER", 9, 2),
          own("FIGHTER", 9, 3),
          own("FIGHTER", 9, 4),
          foe("FIGHTER", 4, 3, { hp: 3 }),
          foe("FIGHTER", 3, 3, { hp: 3 }),
        ],
        10,
      ),
      at(5, 3),
      "HERALD",
      { moved: true, movedPathLength: 1 },
    );
    const result = turnAndCheck(start);
    expectAllSecure(result);
    const herald = result.daemons.find((entry) => entry.role === "HERALD");
    expect(herald?.at.x).toBeGreaterThanOrEqual(5);
  });

  it("7b. but makes the pair when the victims are worth its price (two Knights)", () => {
    const start = daemon(
      scene(
        [
          own("FIGHTER", 9, 1),
          own("FIGHTER", 9, 2),
          own("FIGHTER", 9, 3),
          own("FIGHTER", 9, 4),
          foe("KNIGHT", 4, 3, { hp: 3 }),
          foe("KNIGHT", 3, 3, { hp: 3 }),
        ],
        10,
      ),
      at(5, 3),
      "HERALD",
      { moved: true, movedPathLength: 1 },
    );
    const herald = idAt(start, at(5, 3));
    const { commands } = policyTurn(start);
    expect(
      commands.filter(
        (command) => command.kind === "ATTACK" && command.unitId === herald,
      ),
    ).toHaveLength(2);
  });
});

describe("a bound Herald under a GUARD directive (pulp_wars-mch9.56)", () => {
  /**
   * DINOSAUR_6 at the Lodge's first turn, the Initiate on (11, 7) replaced
   * by a Herald and three Lodge units gone, so the units inside the island
   * zone are eight with the Herald: it took a garrison place and stood still.
   */
  const lodge = (): GameStateV7 => {
    const mission = missionByIdV7("DINOSAUR_6");
    if (mission === null) throw new Error("no DINOSAUR_6");
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no setup");
    let state = missionInitialStateV7(setup);
    const queen = state.turnOrder[state.activeSeatIndex];
    if (queen === undefined) throw new Error("no seat");
    state = applyOkV7(state, queen, { kind: "END_TURN" }).state;
    const gone = [at(11, 7), at(5, 5), at(5, 6), at(8, 4)];
    state = {
      ...state,
      units: state.units.filter(
        (unit) => !gone.some((where) => gap(where, unit.at) === 0),
      ),
    };
    state = withHorrorV7(state, 1, at(11, 7), { role: "HERALD" });
    return withFavourV7(state, 1, 10);
  };

  it("is never the garrison: it joins the assault and stays held", () => {
    const start = lodge();
    const herald = idAt(start, at(11, 7));
    const actor = start.turnOrder[start.activeSeatIndex];
    if (actor === undefined) throw new Error("no seat");
    const view = viewForV7(start, actor);
    const garrison = guardGarrisonV7(
      view,
      [{ x0: 4, y0: 4, x1: 11, y1: 7 }],
      8,
    );
    expect(garrison).not.toContain(herald);
    expect(garrison).toHaveLength(8);
    const result = turnAndCheck(start);
    // It acts: it walks toward Mire's Edge (6, 11), off the island.
    expect(
      result.commands.some(
        (command) => command.kind === "MOVE" && command.unitId === herald,
      ),
    ).toBe(true);
    const end = result.daemons.find((entry) => entry.unitId === herald);
    expect(end?.at.y).toBeGreaterThan(7);
    expect(end?.held).toBe(true);
    expect(result.unbound).toEqual([]);
  });
});

describe("the Cult seat without summons decides as before (pulp_wars-mch9.57)", () => {
  // Recorded on the code before this bead: the plan's new parts read only
  // the daemons, so a seat with none plays the same turn.
  it("plays the same turn at the front and at home", () => {
    const field = (pieces: readonly GoblinPieceV7[]): GameStateV7 =>
      withFavourV7(cultFieldV7([...pieces, GARRISON], { coins: 0 }), 0, 1);
    const front = field([
      own("FIGHTER", 5, 4),
      own("FIGHTER", 6, 5),
      own("CAPTAIN", 7, 4),
      own("FIGHTER", 6, 3),
      own("GUARD", 6, 6),
      foe("FIGHTER", 3, 4),
      foe("MARKSMAN", 2, 5),
    ]);
    const home = field([own("FIGHTER", 7, 4), own("CAPTAIN", 8, 4)]);
    expect(JSON.stringify(policyTurn(home).commands)).toBe(
      JSON.stringify([
        { kind: "MOVE", unitId: 5, path: [{ x: 8, y: 5 }] },
        { kind: "CAPTURE", unitId: 5 },
        { kind: "BUILD_MONUMENT", achievement: "EXPLORER", at: { x: 7, y: 4 } },
        {
          kind: "CHOOSE_CITY_REWARD",
          cityId: 8,
          reachedLevel: 2,
          reward: "MILITIA",
        },
        { kind: "SACRIFICE", unitId: 6, victimUnitId: 5 },
      ]),
    );
    expect(JSON.stringify(policyTurn(front).commands)).toBe(
      JSON.stringify([
        { kind: "SACRIFICE", unitId: 7, victimUnitId: 6 },
        { kind: "BUILD_MONUMENT", achievement: "EXPLORER", at: { x: 7, y: 7 } },
        {
          kind: "CHOOSE_CITY_REWARD",
          cityId: 1,
          reachedLevel: 2,
          reward: "STOCKPILE",
        },
        { kind: "REPLANT_FOREST", at: { x: 8, y: 7 } },
        { kind: "MOVE", unitId: 8, path: [{ x: 6, y: 4 }] },
        { kind: "MOVE", unitId: 9, path: [{ x: 5, y: 5 }] },
        { kind: "MOVE", unitId: 5, path: [{ x: 6, y: 5 }] },
      ]),
    );
  });
});
