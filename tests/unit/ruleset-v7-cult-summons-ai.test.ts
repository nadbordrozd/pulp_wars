import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  CULT_CAP_SPEND_FAVOUR_V7,
  cultBroodCoverV7,
  cultBroodLeadsV7,
  cultUpkeepV7,
} from "../../src/ai/v7-cult";
import {
  CULT_CHANNEL_PRIORITY_V7,
  CULT_IMP_FRONT_V7,
  CULT_RELEASE_PRIORITY_V7,
  CULT_SUMMON_FRONT_V7,
  CULT_SWARM_MOVE_PRIORITY_V7,
  CULT_SWARM_PRIORITY_V7,
} from "../../src/ai/v7-cult-channel";
import { CULT_HERALD_PRIORITY_V7 } from "../../src/ai/v7-cult-rituals";
import {
  TECHNOLOGY_IDS_V7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  cultFieldV7,
  withFavourV7,
  withFogV7,
  withHorrorV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import { unitCandidatesV7 } from "../fixtures/v7-dinosaur-ai";
import {
  applyOkV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import type { FieldOptionsV7 } from "../fixtures/v7-revision20";

// The Cult redesign's A-R3 (`pulp_wars-mch9.40`,
// docs/product/RULESET_7_CULT_REDESIGN.md sections 12.2 and 12.3): the Cult
// seat's summons: what to summon (a Gibbering Mass for a watched city, a
// Horror at the front, an Imp beside a Brood, the best it can at the cap),
// Brood planning (one channeller a Brood), Doorstep (no channeller for a
// Mass at home; an Idol Bearer that holds one stays by it, or steps beside
// one), Swarm (the second Imp comes beside the target first, then the
// unanswered attacks), the Mass in the garrison list, the Summoner a
// Seizure may need, and the Herald's wound-then-kill. No match was played:
// every rule is a decision, or the one turn the seat plays, on a small
// hand-built state, each beside the nearest state in which it must not
// fire.
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (the Cult, the
// viewer, to move) capital (8, 8) with territory x 7-9, y 7-9; seat 1
// (Human) capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
// (8, 5), (5, 8); every other land tile open Grass; every tile explored;
// every technology; no Coins. Roles: FIGHTER the Initiate, CAPTAIN the
// Summoner, GUARD the Idol Bearer.

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
    // No free Monument left to build, and no Militia joins the scene.
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.unlocked ? { ...entry, spent: true } : entry,
      ),
    })),
  };
};

/** Nothing west of x = 5 in sight: no enemy within an Imp's front. */
const fogged = (state: GameStateV7): GameStateV7 =>
  withFogV7(state, 0, (where) => where.x >= 5);

/** The daemon of `role` on `where`, spent unless `ready`. */
const daemon = (
  state: GameStateV7,
  where: CoordV7,
  role: "IMP" | "HORROR" | "MASS" | "HERALD",
  ready = false,
): GameStateV7 =>
  withHorrorV7(state, 0, where, {
    role,
    ...(ready ? {} : { activation: SPENT }),
  });

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

const summoned = (commands: readonly CommandV7[]): readonly string[] =>
  ofKind(commands, "SUMMON").map((command) => command.daemon);

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const nowAt = (state: GameStateV7, id: UnitId): CoordV7 | undefined =>
  state.units.find((unit) => unit.id === id)?.at;

const alive = (state: GameStateV7, id: UnitId): boolean =>
  state.units.some((unit) => unit.id === id && unit.hp > 0);

/** The tiles the Move candidates of the unit on `from` end on. */
const ends = (state: GameStateV7, from: CoordV7): readonly CoordV7[] =>
  unitCandidatesV7(state, from, "MOVE").flatMap((candidate) => {
    const end =
      candidate.command.kind === "MOVE"
        ? candidate.command.path.at(-1)
        : undefined;
    return end === undefined ? [] : [end];
  });

/** The tiles the engine offers the unit on `from` a Move to. */
const offeredEnds = (state: GameStateV7, from: CoordV7): readonly CoordV7[] => {
  const id = unitAtV7(state, from).id;
  return queryAiReadyCommandsV7(viewOf(state)).flatMap((item) => {
    const end =
      item.command.kind === "MOVE" && item.command.unitId === id
        ? item.command.path.at(-1)
        : undefined;
    return end === undefined ? [] : [end];
  });
};

describe("the Cult seat (A-R3): Brood planning", () => {
  const imp = (id: number, x: number, y: number) => ({
    id: unitId(id),
    at: at(x, y),
  });

  it("takes the Brood as the engine's check does", () => {
    // Three Imps around a lead: the two lowest IDs beside it are held.
    const imps = [imp(1, 5, 5), imp(2, 4, 5), imp(3, 6, 5), imp(4, 5, 6)];
    const cover = cultBroodCoverV7(imps, new Set([unitId(1)]));
    expect(cover.get(unitId(1))).toBe(unitId(1));
    expect(cover.get(unitId(2))).toBe(unitId(1));
    expect(cover.get(unitId(3))).toBe(unitId(1));
    expect(cover.get(unitId(4))).toBeNull();
  });

  it("channels the fewest Imps: one for a Brood of three, two for four in a row", () => {
    const three = cultBroodLeadsV7(
      [imp(1, 4, 5), imp(2, 5, 5), imp(3, 6, 5)],
      new Set(),
    );
    // The middle one holds both.
    expect([...new Set(three.values())]).toEqual([unitId(2)]);
    const row = cultBroodLeadsV7(
      [imp(1, 3, 5), imp(2, 4, 5), imp(3, 5, 5), imp(4, 6, 5)],
      new Set(),
    );
    expect(new Set(row.values()).size).toBe(2);
    // Sanity: two apart are two leads; an Imp held by its own strand
    // leads.
    const apart = cultBroodLeadsV7([imp(1, 2, 2), imp(2, 6, 6)], new Set());
    expect(new Set(apart.values()).size).toBe(2);
    const held = cultBroodLeadsV7(
      [imp(1, 4, 5), imp(2, 5, 5)],
      new Set([unitId(1)]),
    );
    expect(held.get(unitId(2))).toBe(unitId(1));
  });

  it("agrees with the engine's view once the lead is channelled", () => {
    // Three Imps together, an Initiate channelling the middle one.
    const state = withStrandsV7(
      daemon(
        daemon(
          daemon(
            scene([own("FIGHTER", 5, 3, { activation: CHANNELLED })]),
            at(4, 2),
            "IMP",
          ),
          at(5, 2),
          "IMP",
        ),
        at(6, 2),
        "IMP",
      ),
      at(5, 2),
      [at(5, 3)],
    );
    const view = viewOf(state);
    const lead = idAt(state, at(5, 2));
    const imps = view.units.filter((unit) => unit.summoned === "IMP");
    const leads = cultBroodLeadsV7(
      imps,
      new Set(
        view.cult.daemons
          .filter((entry) => entry.strands >= entry.control)
          .map((entry) => entry.unitId),
      ),
    );
    for (const entry of view.cult.daemons) {
      const planned = leads.get(entry.unitId);
      expect(entry.broodOf ?? entry.unitId).toBe(planned);
    }
    expect(leads.get(idAt(state, at(4, 2)))).toBe(lead);
  });

  it("budgets the strands by Brood: one a Brood, one to spare for three; none for a Mass at home", () => {
    const upkeep = (state: GameStateV7): number => cultUpkeepV7(viewOf(state));
    const base = scene([own("FIGHTER", 9, 1)]);
    // Two Imps together: one strand. Apart: one each.
    expect(upkeep(daemon(daemon(base, at(4, 2), "IMP"), at(5, 2), "IMP"))).toBe(
      1,
    );
    expect(upkeep(daemon(daemon(base, at(2, 2), "IMP"), at(5, 2), "IMP"))).toBe(
      2,
    );
    // Three together: one and one to spare.
    expect(
      upkeep(
        daemon(
          daemon(daemon(base, at(4, 2), "IMP"), at(5, 2), "IMP"),
          at(6, 2),
          "IMP",
        ),
      ),
    ).toBe(2);
    // A Mass beside the capital: none; in the open: its Control and one.
    expect(upkeep(daemon(base, at(7, 7), "MASS"))).toBe(0);
    expect(upkeep(daemon(base, at(5, 2), "MASS"))).toBe(2);
  });

  it("holds a Brood with one channeller (and one to spare for three)", () => {
    // Imps that have acted, together, and three free Initiates near.
    const build = (imps: readonly CoordV7[]): GameStateV7 =>
      imps.reduce(
        (state, where) => daemon(state, where, "IMP"),
        scene([
          own("FIGHTER", 4, 4),
          own("FIGHTER", 5, 4),
          own("FIGHTER", 6, 4),
        ]),
      );
    const channels = (state: GameStateV7) =>
      ofKind(policyTurn(state).commands, "CHANNEL");
    const pair = build([at(4, 2), at(5, 2)]);
    expect(channels(pair)).toHaveLength(1);
    const three = build([at(4, 2), at(5, 2), at(6, 2)]);
    const strands = channels(three);
    expect(strands).toHaveLength(2);
    // Both on the lead (the middle Imp).
    expect(new Set(strands.map((command) => command.daemonUnitId))).toEqual(
      new Set([idAt(three, at(5, 2))]),
    );
    // Sanity (the mutation): two Imps apart want a strand each.
    expect(channels(build([at(2, 2), at(6, 2)]))).toHaveLength(2);
  });

  it("ends an Imp's Move beside its lead, or where a cultist can follow it", () => {
    // A lead Imp that has acted and its channeller; a second Imp ready to
    // move; no other cultist (none to follow it elsewhere).
    const build = (spare: boolean): GameStateV7 =>
      daemon(
        withStrandsV7(
          daemon(
            scene([
              own("FIGHTER", 5, 3, { activation: CHANNELLED }),
              ...(spare ? [own("FIGHTER", 9, 1)] : []),
            ]),
            at(5, 2),
            "IMP",
          ),
          at(5, 2),
          [at(5, 3)],
        ),
        at(6, 2),
        "IMP",
        true,
      );
    const lonely = build(false);
    expect(
      offeredEnds(lonely, at(6, 2)).some((end) => gap(end, at(5, 2)) > 1),
    ).toBe(true);
    const moves = ends(lonely, at(6, 2));
    expect(moves.length).toBeGreaterThan(0);
    for (const end of moves) expect(gap(end, at(5, 2))).toBe(1);
    // Sanity (the mutation): with a free Initiate to follow it, it may go
    // further.
    expect(
      ends(build(true), at(6, 2)).some((end) => gap(end, at(5, 2)) > 1),
    ).toBe(true);
  });
});

describe("the Cult seat (A-R3): an Imp no cultist can hold", () => {
  it("goes back beside a held lead Imp, whose Brood holds it", () => {
    // A lead Imp channelled by an Initiate that has acted; a lone Imp
    // three tiles off and nobody else to channel it.
    const start = daemon(
      withStrandsV7(
        daemon(
          scene([own("FIGHTER", 5, 3, { activation: CHANNELLED })]),
          at(5, 2),
          "IMP",
        ),
        at(5, 2),
        [at(5, 3)],
      ),
      at(8, 1),
      "IMP",
      true,
    );
    const step = decision(start).candidates[0];
    expect(step?.score.priority).toBe(CULT_RELEASE_PRIORITY_V7);
    const end =
      step?.command.kind === "MOVE" ? step.command.path.at(-1) : undefined;
    expect(gap(end ?? at(0, 0), at(5, 2))).toBe(1);
    // After it the Brood holds it: no eye mark.
    const lone = idAt(start, at(8, 1));
    const turn = policyTurn(start);
    expect(
      viewOf(turn.state).cult.daemons.find((entry) => entry.unitId === lone)
        ?.broodOf,
    ).toBe(idAt(start, at(5, 2)));
  });
});

describe("the Cult seat (A-R3): Doorstep", () => {
  it("gives a Mass on its Doorstep no channeller", () => {
    const build = (where: CoordV7): GameStateV7 =>
      daemon(
        scene([own("FIGHTER", 6, 4), own("FIGHTER", 7, 4)]),
        where,
        "MASS",
      );
    const home = policyTurn(build(at(7, 7)));
    expect(ofKind(home.commands, "CHANNEL")).toHaveLength(0);
    // Sanity (the mutation): in the open it wants its Control and one.
    expect(
      ofKind(policyTurn(build(at(5, 2))).commands, "CHANNEL"),
    ).toHaveLength(2);
  });

  it("moves no Mass off its Doorstep unless a channeller can follow it", () => {
    const build = (cultist: boolean): GameStateV7 =>
      daemon(
        scene(cultist ? [own("FIGHTER", 8, 4)] : []),
        at(9, 7),
        "MASS",
        true,
      );
    const alone = build(false);
    expect(
      offeredEnds(alone, at(9, 7)).some((end) => gap(end, at(8, 8)) > 1),
    ).toBe(true);
    const moves = ends(alone, at(9, 7));
    expect(moves.length).toBeGreaterThan(0);
    for (const end of moves) expect(gap(end, at(8, 8))).toBeLessThanOrEqual(1);
    // Sanity (the mutation): with a free cultist near, it may step off.
    expect(
      ends(build(true), at(9, 7)).some((end) => gap(end, at(8, 8)) > 1),
    ).toBe(true);
  });

  it("keeps an Idol Bearer beside the forward Mass its idol holds", () => {
    // An Idol Bearer beside the neutral village (8, 5), which the ordinary
    // play would take; a Mass beside the bearer, two tiles from the
    // village.
    const build = (bearer: CoordV7, mass: CoordV7): GameStateV7 =>
      daemon(scene([own("GUARD", bearer.x, bearer.y)]), mass, "MASS");
    const village = at(8, 5);
    // Forward: no own center beside the Mass, so the idol holds it.
    const forward = build(at(7, 4), at(6, 4));
    expect(
      viewOf(forward).cult.daemons.find(
        (entry) => entry.unitId === idAt(forward, at(6, 4)),
      )?.doorstep,
    ).toBe(true);
    expect(
      offeredEnds(forward, at(7, 4)).some((end) => same(end, village)),
    ).toBe(true);
    const bearer = idAt(forward, at(7, 4));
    const turn = policyTurn(forward);
    expect(gap(nowAt(turn.state, bearer) ?? at(0, 0), at(6, 4))).toBe(1);
    // Sanity (the mutation): a Mass beside its city frees the bearer, and
    // it takes the village.
    const home = build(at(8, 6), at(9, 7));
    const free = idAt(home, at(8, 6));
    expect(same(nowAt(policyTurn(home).state, free), village)).toBe(true);
  });

  it("steps a free Idol Bearer beside a Mass that needs a strand, so no cultist channels it", () => {
    const build = (bearer: boolean): GameStateV7 =>
      daemon(
        scene([
          own("FIGHTER", 7, 4),
          ...(bearer ? [own("GUARD", 5, 4)] : [own("FIGHTER", 5, 4)]),
        ]),
        at(5, 2),
        "MASS",
      );
    const start = build(true);
    const step = decision(start).candidates[0];
    expect(step?.score.priority).toBe(CULT_CHANNEL_PRIORITY_V7);
    expect(step?.command.kind).toBe("MOVE");
    expect(
      step?.command.kind === "MOVE" ? step.command.unitId : undefined,
    ).toBe(idAt(start, at(5, 4)));
    const turn = policyTurn(start);
    expect(
      gap(nowAt(turn.state, idAt(start, at(5, 4))) ?? at(0, 0), at(5, 2)),
    ).toBe(1);
    expect(ofKind(turn.commands, "CHANNEL")).toHaveLength(0);
    // Sanity (the mutation): without a bearer, cultists channel it.
    expect(ofKind(policyTurn(build(false)).commands, "CHANNEL")).toHaveLength(
      2,
    );
  });

  it("steps a Mass onto an empty watched center: it joins the garrison list", () => {
    // A Mass beside the capital, a Human Fighter coming within six.
    const build = (role: "MASS" | "HORROR"): GameStateV7 =>
      daemon(scene([foe("FIGHTER", 4, 6)]), at(8, 7), role, true);
    const turn = policyTurn(build("MASS"));
    const mass = idAt(build("MASS"), at(8, 7));
    expect(same(nowAt(turn.state, mass), at(8, 8))).toBe(true);
    // Sanity (the mutation): a Horror is no garrison.
    const horror = idAt(build("HORROR"), at(8, 7));
    expect(
      same(nowAt(policyTurn(build("HORROR")).state, horror), at(8, 8)),
    ).toBe(false);
  });
});

describe("the Cult seat (A-R3): what to summon", () => {
  it("summons a Mass beside a watched city with no Mass by it, nearest the enemy", () => {
    // A Summoner and a helper by the capital; a Human Fighter coming.
    const build = (guarded: boolean, enemy: CoordV7): GameStateV7 => {
      const state = withFavourV7(
        scene([
          own("CAPTAIN", 9, 7),
          own("FIGHTER", 9, 6),
          foe("FIGHTER", enemy.x, enemy.y),
        ]),
        0,
        5,
      );
      return guarded ? daemon(state, at(9, 9), "MASS") : state;
    };
    const turn = policyTurn(build(false, at(4, 6)));
    const summons = ofKind(turn.commands, "SUMMON");
    expect(summons.map((command) => command.daemon)).toEqual(["MASS"]);
    const tile = summons[0]?.at ?? at(0, 0);
    expect(gap(tile, at(8, 8))).toBe(1);
    // Nearest the enemy of the tiles beside the Summoner and the center.
    expect(tile.x).toBe(8);
    // Sanity (the mutations): with a Mass by the city, a Horror at the
    // front; with the enemy in its own land (the Human garrison only), no
    // Mass.
    expect(summoned(policyTurn(build(true, at(4, 6))).commands)).toEqual([
      "HORROR",
    ]);
    expect(summoned(policyTurn(build(false, at(2, 7))).commands)).not.toContain(
      "MASS",
    );
  });

  it("summons a Mass beside a standing idol that shields a caster the enemy can reach, before a Horror", () => {
    // An Idol Bearer beside an Initiate a Human Fighter can attack next
    // turn; a Summoner and a helper beside the bearer.
    const build = (threat: boolean): GameStateV7 =>
      withFavourV7(
        scene([
          own("GUARD", 5, 3),
          own("FIGHTER", 5, 4),
          own("CAPTAIN", 6, 2),
          own("FIGHTER", 7, 2),
          ...(threat ? [foe("FIGHTER", 3, 4)] : []),
        ]),
        0,
        5,
      );
    const turn = policyTurn(build(true));
    const summons = ofKind(turn.commands, "SUMMON");
    expect(summons.map((command) => command.daemon)).toEqual(["MASS"]);
    expect(gap(summons[0]?.at ?? at(0, 0), at(5, 3))).toBe(1);
    // Sanity (the mutation): with nobody to reach the caster, the Horror
    // (the Human capital is within six of the Summoner).
    expect(summoned(policyTurn(build(false)).commands)).toEqual(["HORROR"]);
  });

  it("summons a Horror at the front with 4 Favour and a helper, an Imp with less", () => {
    const build = (favour: number): GameStateV7 =>
      withFavourV7(
        scene([
          own("CAPTAIN", 7, 3),
          own("FIGHTER", 7, 2),
          foe("FIGHTER", 3, 3),
        ]),
        0,
        favour,
      );
    expect(gap(at(7, 3), at(3, 3))).toBeLessThanOrEqual(CULT_SUMMON_FRONT_V7);
    expect(summoned(policyTurn(build(4)).commands)).toEqual(["HORROR"]);
    expect(summoned(policyTurn(build(3)).commands)).toEqual(["IMP"]);
    // Sanity: with 1 neither.
    expect(summoned(policyTurn(build(1)).commands)).toEqual([]);
  });

  it("summons an Imp beside an own Imp with room in its Brood, with no body to spare", () => {
    // Three bodies: a Summoner and two Initiates that hold a Horror; an
    // own Imp (its own strand wanted). No body for a lone Imp: only one
    // beside the Imp, which its Brood holds.
    const build = (impAt: CoordV7): GameStateV7 =>
      withFavourV7(
        daemon(
          daemon(
            scene([
              own("CAPTAIN", 7, 3),
              own("FIGHTER", 6, 5),
              own("FIGHTER", 7, 5),
              foe("FIGHTER", 3, 3),
            ]),
            at(6, 4),
            "HORROR",
          ),
          impAt,
          "IMP",
        ),
        0,
        3,
      );
    const near = build(at(8, 2));
    const turn = policyTurn(near);
    const imps = ofKind(turn.commands, "SUMMON");
    expect(imps.map((command) => command.daemon)).toEqual(["IMP"]);
    expect(gap(imps[0]?.at ?? at(0, 0), at(8, 2))).toBe(1);
    // Sanity (the mutation): with the Imp out of the Summoner's ring, no
    // Imp is summoned (it would need a body).
    expect(summoned(policyTurn(build(at(10, 0))).commands)).toEqual([]);
  });

  it("puts an Imp beside an own Imp before a tile nearer the enemy, bodies or not", () => {
    // A Summoner with Initiates to spare, an own Imp that has acted beside
    // it, a Human Fighter to the west.
    const start = withFavourV7(
      daemon(
        scene([
          own("CAPTAIN", 7, 3),
          own("FIGHTER", 9, 4),
          own("FIGHTER", 9, 5),
          own("FIGHTER", 10, 4),
          foe("FIGHTER", 2, 3),
        ]),
        at(8, 2),
        "IMP",
      ),
      0,
      3,
    );
    const imps = ofKind(policyTurn(start).commands, "SUMMON");
    expect(imps.map((command) => command.daemon)).toEqual(["IMP"]);
    expect(gap(imps[0]?.at ?? at(0, 0), at(8, 2))).toBe(1);
    // The engine offers tiles nearer the Fighter too.
    expect(
      queryAiReadyCommandsV7(viewOf(start)).some(
        (item) =>
          item.command.kind === "SUMMON" &&
          item.command.daemon === "IMP" &&
          gap(item.command.at, at(8, 2)) > 1 &&
          item.command.at.x < 7,
      ),
    ).toBe(true);
  });

  it("summons with no enemy near at the cap, the best it can: a Mass by the city before a Horror", () => {
    // A Summoner and a helper by the capital, and two Initiates that hold
    // a Horror (its Control and one). With no enemy near, a Mass beside
    // the city (a wall its Doorstep holds) before a second Horror (a
    // fighter with nobody to fight, two strands a turn).
    const build = (favour: number): GameStateV7 =>
      fogged(
        withFavourV7(
          daemon(
            scene([
              own("CAPTAIN", 9, 7),
              own("FIGHTER", 9, 6),
              own("FIGHTER", 10, 3),
              own("FIGHTER", 9, 2),
            ]),
            at(10, 2),
            "HORROR",
          ),
          0,
          favour,
        ),
      );
    expect(
      summoned(policyTurn(build(CULT_CAP_SPEND_FAVOUR_V7)).commands),
    ).toEqual(["MASS"]);
    // Sanity (the mutation): below the cap's mark, nothing (no enemy in
    // sight).
    expect(
      summoned(policyTurn(build(CULT_CAP_SPEND_FAVOUR_V7 - 1)).commands),
    ).toEqual([]);
  });

  it("summons an Imp within its front of 8, none beyond it", () => {
    const build = (favour: number): GameStateV7 =>
      withFavourV7(scene([own("CAPTAIN", 10, 1)]), 0, favour);
    expect(gap(at(10, 1), GARRISON.at)).toBeLessThanOrEqual(CULT_IMP_FRONT_V7);
    expect(summoned(policyTurn(build(2)).commands)).toEqual(["IMP"]);
    expect(summoned(policyTurn(fogged(build(2))).commands)).toEqual([]);
  });
});

describe("the Cult seat (A-R3): Swarm", () => {
  // A Human Fighter with an own Imp beside it; a second Imp two tiles off.
  const build = (second: boolean): GameStateV7 => {
    let state = scene([
      own("FIGHTER", 7, 2),
      own("FIGHTER", 7, 3),
      foe("FIGHTER", 4, 3),
    ]);
    state = daemon(state, at(5, 3), "IMP", true);
    if (second) state = daemon(state, at(6, 4), "IMP", true);
    return state;
  };

  it("brings the second Imp beside the target first, then strikes unanswered", () => {
    const start = build(true);
    const first = decision(start).candidates[0];
    expect(first?.score.priority).toBe(CULT_SWARM_MOVE_PRIORITY_V7);
    expect(first?.command.kind).toBe("MOVE");
    const end =
      first?.command.kind === "MOVE" ? first.command.path.at(-1) : undefined;
    expect(gap(end ?? at(0, 0), at(4, 3))).toBe(1);
    const lead = idAt(start, at(5, 3));
    const turn = policyTurn(start);
    const attacks = ofKind(turn.commands, "ATTACK");
    expect(attacks.length).toBeGreaterThanOrEqual(1);
    // The Imp that was beside the Fighter took no retaliation.
    expect(turn.state.units.find((unit) => unit.id === lead)?.hp ?? 0).toBe(6);
  });

  it("names the unanswered attack a step, and makes none with one Imp", () => {
    // Both Imps beside the Fighter already.
    const both = daemon(
      daemon(
        scene([own("FIGHTER", 7, 3), foe("FIGHTER", 4, 3)]),
        at(5, 3),
        "IMP",
        true,
      ),
      at(5, 4),
      "IMP",
      true,
    );
    const view = viewOf(both);
    expect(
      queryCombatPreviewV7(view, idAt(both, at(5, 3)), idAt(both, at(4, 3)))
        ?.noRetaliationReason,
    ).toBe("SWARMED");
    expect(decision(both).candidates[0]?.score.priority).toBe(
      CULT_SWARM_PRIORITY_V7,
    );
    // Sanity (the mutation): one Imp alone gets neither step.
    const lone = build(false);
    expect(
      decision(lone).candidates.some(
        (candidate) =>
          candidate.score.priority === CULT_SWARM_PRIORITY_V7 ||
          candidate.score.priority === CULT_SWARM_MOVE_PRIORITY_V7,
      ),
    ).toBe(false);
  });
});

describe("the Cult seat (A-R3): the Summoner a Seizure may need", () => {
  // A Horror that has acted, held by two Initiates (its Control and one);
  // a Summoner with nothing to summon (no Favour, no Tentacles) two tiles
  // from a Human Swordsman, and an Initiate beside the Swordsman (the
  // holder).
  const build = (hp: number): GameStateV7 => {
    const state = daemon(
      scene(
        [
          own("CAPTAIN", 6, 1),
          own("FIGHTER", 7, 5),
          own("FIGHTER", 8, 4),
          own("FIGHTER", 4, 4),
          foe("SWORDSMAN", 4, 3, { hp }),
        ],
        {
          techs: {
            0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "CHIVALRY"),
            1: TECHNOLOGY_IDS_V7,
          },
        },
      ),
      at(7, 3),
      "HORROR",
    );
    return { ...state, cult: { ...state.cult, favour: [] } };
  };

  it("asks no Summoner a Seizure needs to channel for the trickle: it steps up and seizes", () => {
    const start = build(4);
    const summoner = idAt(start, at(6, 1));
    const turn = policyTurn(start);
    expect(
      turn.commands.flatMap((command) =>
        command.kind === "SEIZE" ? [command.unitId] : [],
      ),
    ).toEqual([summoner]);
    expect(
      ofKind(turn.commands, "CHANNEL").some(
        (command) => command.unitId === summoner,
      ),
    ).toBe(false);
    // Sanity (the mutation): with the Swordsman not broken, the Summoner
    // channels for the trickle (A-R1).
    const sturdy = build(9);
    expect(
      ofKind(policyTurn(sturdy).commands, "CHANNEL").some(
        (command) => command.unitId === summoner,
      ),
    ).toBe(true);
  });
});

describe("the Cult seat (A-R3): the Herald's wound-then-kill", () => {
  // A Herald with four Initiates behind it; a sturdy unit beside it that
  // one hit does not kill and two do.
  const CULTISTS = [
    own("FIGHTER", 4, 6),
    own("FIGHTER", 5, 6),
    own("FIGHTER", 6, 6),
    own("FIGHTER", 7, 6),
  ];
  const build = (hp: number): GameStateV7 =>
    withFavourV7(
      withHorrorV7(
        scene([...CULTISTS, foe("JUGGERNAUT", 5, 3, { hp })]),
        0,
        at(5, 4),
        { role: "HERALD" },
      ),
      0,
      2,
    );

  it("strikes the same unit twice when the second blow kills it", () => {
    const start = build(30);
    const view = viewOf(start);
    const herald = idAt(start, at(5, 4));
    const victim = idAt(start, at(5, 3));
    const preview = queryCombatPreviewV7(view, herald, victim);
    expect(preview?.defenderDies).toBe(false);
    const first = decision(start).candidates[0];
    expect(first?.score.priority).toBe(CULT_HERALD_PRIORITY_V7);
    const turn = policyTurn(start);
    expect(
      ofKind(turn.commands, "ATTACK").filter(
        (command) =>
          command.unitId === herald && command.targetUnitId === victim,
      ),
    ).toHaveLength(2);
    expect(alive(turn.state, victim)).toBe(false);
    // Sanity (the mutation): the first blow, which kills nothing, is the
    // plan's step only for the kill that follows it (A-R2 named none).
    expect(first?.command.kind).toBe("ATTACK");
    expect(
      first?.command.kind === "ATTACK" ? first.command.targetUnitId : null,
    ).toBe(victim);
  });
});
