import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  ARMY_PLAY_FACTIONS_V7,
  setArmyPlayFactionsV7,
} from "../../src/ai/v7-army";
import {
  CULT_CHANNEL_PRIORITY_V7,
  CULT_CHANNEL_RANGE_V7,
  CULT_DAEMON_LEASH_V7,
  CULT_DAEMON_PRIORITY_V7,
  CULT_DOOMED_PRIORITY_V7,
  CULT_SEIZE_PRIORITY_V7,
  CULT_SUMMON_FRONT_V7,
  cultInitiateV7,
  cultNearestToV7,
} from "../../src/ai/v7-cult-channel";
import {
  TECHNOLOGY_IDS_V7,
  queryAiReadyCommandsV7,
  queryThreatenedTilesV7,
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
  withFarmsV7,
  withFavourV7,
  withHorrorV7,
  withStrandsV7,
  withUnboundV7,
} from "../fixtures/v7-cult";
import { unitCandidatesV7 } from "../fixtures/v7-dinosaur-ai";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import type { FieldOptionsV7 } from "../fixtures/v7-revision20";

// The Cult seat's own commands (`pulp_wars-mch9.10`, bead A2 of
// docs/product/RULESET_7_CULTISTS.md sections 15.2 to 15.4, as built in
// section 15.7; `src/ai/v7-cult-channel.ts`): channel first, summon only
// what it can hold, Sacrifice, Seize, Offering, Anchor, Behold!.
// A baseline designed from judgement: no match was played for this bead.
// Every rule is shown on a small hand-built state, as a decision or as the
// one turn the seat plays from it.
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (the Cult, the
// viewer, to move) capital (8, 8) with territory x 7-9, y 7-9; seat 1
// (Human) capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
// (8, 5), (5, 8); every other land tile open Grass; every tile explored;
// every technology; no Coins unless stated (so the economy stays quiet).
// Roles: FIGHTER the Initiate, CAPTAIN the Summoner, MARKSMAN the Hexer,
// GUARD the Idol Bearer, RAIDER the Familiar, JUGGERNAUT the Thing.

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

function viewOf(state: GameStateV7): PlayerViewV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
}

/** The command the seat decides on this view. */
const decides = (state: GameStateV7): CommandV7 | null =>
  chooseNormalCommandV7(viewOf(state)).command;

interface PlayedV7 {
  readonly command: CommandV7;
  /** The acting unit as it stood before the command. */
  readonly unit: UnitStateV7 | undefined;
}

/** The active seat plays its one turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly played: readonly PlayedV7[];
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const played: PlayedV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const decision = chooseNormalCommandV7(view);
    const command = chooseNormalTurnCommandV7(view, accepted, 128, decision);
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN")
      return {
        played,
        commands: played.map((item) => item.command),
        state,
      };
    // Every command the seat plays is one the engine offers it.
    expect(
      queryAiReadyCommandsV7(view).some(
        (item) => JSON.stringify(item.command) === JSON.stringify(command),
      ),
      command.kind,
    ).toBe(true);
    played.push({
      command,
      unit:
        "unitId" in command
          ? state.units.find((unit) => unit.id === command.unitId)
          : undefined,
    });
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

/** The holding strands of the daemon on `where`, as its owner sees them. */
const strandsOn = (state: GameStateV7, where: CoordV7): number => {
  const daemon = unitAtV7(state, where);
  return (
    viewOf(state).cult.daemons.find((entry) => entry.unitId === daemon.id)
      ?.strands ?? -1
  );
};

const favourOf = (state: GameStateV7): number =>
  state.cult.favour.find((entry) => entry.playerId === seatIdV7(state, 0))
    ?.favour ?? 0;

const nowAt = (state: GameStateV7, id: UnitId): CoordV7 => {
  const unit = state.units.find((item) => item.id === id);
  if (unit === undefined) throw new Error("unit gone");
  return unit.at;
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

describe("the Cult seat: channel first (section 15.2)", () => {
  // A Horror that has acted, three Initiates within reach of it.
  const circle = (initiates: readonly GoblinPieceV7[]): GameStateV7 =>
    withHorrorV7(scene([...initiates, foe("FIGHTER", 1, 3)]), 0, at(5, 3), {
      activation: SPENT,
    });
  const three = [
    own("FIGHTER", 6, 2),
    own("FIGHTER", 7, 3),
    own("FIGHTER", 7, 1),
  ];

  it("holds a Horror with its Control and one strand to spare, before anything else", () => {
    const start = circle(three);
    const turn = policyTurn(start);
    const channels = ofKind(turn.commands, "CHANNEL");
    expect(channels).toHaveLength(2);
    expect(strandsOn(turn.state, at(5, 3))).toBe(2);
    // The first commands of the turn are the two channellers' (a Move and a
    // Channel each at most); the third Initiate plays after them.
    const channellers = new Set(channels.map((command) => command.unitId));
    const lastChannel = turn.commands.lastIndexOf(channels[1] as CommandV7);
    for (const item of turn.played.slice(0, lastChannel + 1)) {
      expect(["MOVE", "CHANNEL"]).toContain(item.command.kind);
      expect(item.unit !== undefined && channellers.has(item.unit.id)).toBe(
        true,
      );
    }
    // Each channeller stands within 3 of the Horror.
    for (const id of channellers)
      expect(gap(nowAt(turn.state, id), at(5, 3))).toBeLessThanOrEqual(
        CULT_CHANNEL_RANGE_V7,
      );
    // The step is scored above every ordinary command.
    const first = chooseNormalCommandV7(viewOf(start)).candidates[0];
    expect(first?.score.priority).toBe(CULT_CHANNEL_PRIORITY_V7);
  });

  it("wants its Control alone with one cultist, and nothing with none in reach", () => {
    const one = policyTurn(circle([own("FIGHTER", 6, 2)]));
    expect(ofKind(one.commands, "CHANNEL")).toHaveLength(1);
    expect(strandsOn(one.state, at(5, 3))).toBe(1);
    // An Initiate eight tiles away cannot come: nobody channels.
    const none = policyTurn(circle([own("FIGHTER", 9, 9)]));
    expect(ofKind(none.commands, "CHANNEL")).toHaveLength(0);
  });

  it("gives an assigned channeller no other action: it channels instead of the kill it has", () => {
    // The Initiate at (6, 3) stands beside a Fighter with 1 HP left.
    const pieces = [own("FIGHTER", 6, 3), foe("FIGHTER", 7, 4, { hp: 1 })];
    const initiate = (state: GameStateV7): UnitId =>
      unitAtV7(state, at(6, 3)).id;
    const without = scene(pieces);
    // Sanity (the mutation): with no daemon to hold, it takes the kill.
    expect(
      ofKind(policyTurn(without).commands, "ATTACK").some(
        (command) => command.unitId === initiate(without),
      ),
    ).toBe(true);
    const held = withHorrorV7(without, 0, at(5, 3), { activation: SPENT });
    const turn = policyTurn(held);
    expect(
      ofKind(turn.commands, "ATTACK").some(
        (command) => command.unitId === initiate(held),
      ),
    ).toBe(false);
    expect(
      ofKind(turn.commands, "CHANNEL").map((command) => command.unitId),
    ).toEqual([initiate(held)]);
  });

  it("places a channeller next to an own Idol Bearer", () => {
    // The Fighter at (4, 0) is far from both; away from it is the row y 5.
    const build = (bearer: boolean): GameStateV7 =>
      withHorrorV7(
        scene([
          own("FIGHTER", 6, 4),
          ...(bearer ? [own("GUARD", 7, 2, { activation: SPENT })] : []),
          foe("FIGHTER", 4, 0),
        ]),
        0,
        at(4, 4),
        { activation: SPENT },
      );
    const where = (state: GameStateV7): CoordV7 => {
      const id = unitAtV7(state, at(6, 4)).id;
      const turn = policyTurn(state);
      expect(
        ofKind(turn.commands, "CHANNEL").map((command) => command.unitId),
      ).toContain(id);
      return nowAt(turn.state, id);
    };
    const beside = where(build(true));
    expect(gap(beside, at(7, 2))).toBe(1);
    expect(gap(beside, at(4, 4))).toBeLessThanOrEqual(CULT_CHANNEL_RANGE_V7);
    // Without the Idol Bearer it goes the farthest from the enemy instead.
    const away = where(build(false));
    expect(gap(away, at(7, 2))).toBeGreaterThan(1);
    expect(gap(away, at(4, 0))).toBeGreaterThan(gap(beside, at(4, 0)));
  });

  it("places a channeller outside every visible enemy's threatened tiles", () => {
    const state = withHorrorV7(
      scene([own("FIGHTER", 5, 2), foe("FIGHTER", 5, 0)]),
      0,
      at(4, 4),
      { activation: SPENT },
    );
    const view = viewOf(state);
    const fighter = unitAtV7(state, at(5, 0));
    const reach = queryThreatenedTilesV7(view, fighter.id);
    const inside = (where: CoordV7): boolean =>
      reach.some((tile) => gap(tile, where) === 0);
    expect(inside(at(5, 2))).toBe(true);
    const id = unitAtV7(state, at(5, 2)).id;
    const turn = policyTurn(state);
    expect(ofKind(turn.commands, "CHANNEL")).toHaveLength(1);
    expect(inside(nowAt(turn.state, id))).toBe(false);
  });

  it("holds the Herald first, then the Horrors; the spare strands come after every Control", () => {
    const build = (initiates: readonly GoblinPieceV7[]): GameStateV7 =>
      withHorrorV7(
        withHorrorV7(scene(initiates), 0, at(4, 2), { activation: SPENT }),
        0,
        at(4, 4),
        { activation: SPENT, role: "HERALD" },
      );
    const four = [
      own("FIGHTER", 6, 2),
      own("FIGHTER", 6, 3),
      own("FIGHTER", 6, 4),
      own("FIGHTER", 7, 3),
    ];
    // Four cultists: the Herald's three and the Horror's one, none to spare.
    const few = policyTurn(build(four));
    expect(strandsOn(few.state, at(4, 4))).toBe(3);
    expect(strandsOn(few.state, at(4, 2))).toBe(1);
    // Six: Control + 1 each.
    const enough = policyTurn(
      build([...four, own("FIGHTER", 7, 2), own("FIGHTER", 7, 4)]),
    );
    expect(strandsOn(enough.state, at(4, 4))).toBe(4);
    expect(strandsOn(enough.state, at(4, 2))).toBe(2);
    // Three: the Herald's three, and the Horror goes without.
    const short = policyTurn(build(four.slice(0, 3)));
    expect(strandsOn(short.state, at(4, 4))).toBe(3);
    expect(strandsOn(short.state, at(4, 2))).toBe(0);
  });
});

describe("the Cult seat: a daemon moves first, and only where it can be held", () => {
  // A Horror that can act, two Initiates three tiles behind it, a Fighter
  // three tiles ahead of it.
  const start = withHorrorV7(
    scene([own("FIGHTER", 8, 4), own("FIGHTER", 8, 3), foe("FIGHTER", 2, 4)]),
    0,
    at(5, 4),
  );
  const near = (where: CoordV7): number =>
    [at(8, 4), at(8, 3)].filter(
      (tile) => gap(tile, where) <= CULT_DAEMON_LEASH_V7,
    ).length;

  it("ends no Move beyond four tiles of its wanted channellers", () => {
    // The engine offers the Horror tiles five tiles from them.
    expect(offeredEnds(start, at(5, 4)).some((end) => near(end) < 2)).toBe(
      true,
    );
    const allowed = ends(start, at(5, 4));
    expect(allowed.length).toBeGreaterThan(0);
    for (const end of allowed) expect(near(end)).toBe(2);
  });

  it("leaves a village it would take alone: the Move is made only with its channellers near", () => {
    // The village (5, 5) is one step from the Horror at (5, 4). With its
    // two Initiates on (4, 0) and (6, 0) the village is five tiles from
    // them; with them on (4, 1) and (6, 1) it is four. (The seat sends a
    // unit for a village with an enemy unit in sight.)
    const build = (initiates: readonly GoblinPieceV7[]): GameStateV7 =>
      withHorrorV7(scene([...initiates, foe("FIGHTER", 2, 4)]), 0, at(5, 4));
    const takes = (state: GameStateV7): boolean =>
      ends(state, at(5, 4)).some((end) => gap(end, at(5, 5)) === 0);
    const far = build([own("FIGHTER", 4, 0), own("FIGHTER", 6, 0)]);
    expect(
      offeredEnds(far, at(5, 4)).some((end) => gap(end, at(5, 5)) === 0),
    ).toBe(true);
    expect(takes(far)).toBe(false);
    // It is held where it stands, all the same.
    const turn = policyTurn(far);
    const horror = unitAtV7(far, at(5, 4)).id;
    expect(strandsOn(turn.state, nowAt(turn.state, horror))).toBe(2);
    // Sanity (the mutation): with the Initiates one row nearer, it goes.
    expect(takes(build([own("FIGHTER", 4, 1), own("FIGHTER", 6, 1)]))).toBe(
      true,
    );
  });

  it("plays the daemon before its channellers, which then follow it", () => {
    const horror = unitAtV7(start, at(5, 4)).id;
    const turn = policyTurn(start);
    const firstChannel = turn.commands.findIndex(
      (command) => command.kind === "CHANNEL",
    );
    expect(firstChannel).toBeGreaterThanOrEqual(0);
    turn.played.forEach((item, index) => {
      if (item.unit?.id === horror) expect(index).toBeLessThan(firstChannel);
    });
    expect(turn.played[0]?.unit?.id).toBe(horror);
    expect(strandsOn(turn.state, nowAt(turn.state, horror))).toBe(2);
    // Its ordinary command keeps its ordinary order, above the channel.
    const first = chooseNormalCommandV7(viewOf(start)).candidates[0];
    expect(first?.score.priority).toBeGreaterThanOrEqual(
      CULT_DAEMON_PRIORITY_V7,
    );
  });

  it("stays within three tiles of a cultist that channels it already", () => {
    const channelled = withStrandsV7(
      withHorrorV7(
        scene([
          own("FIGHTER", 8, 4, { activation: CHANNELLED }),
          own("FIGHTER", 8, 3),
          foe("FIGHTER", 2, 4),
        ]),
        0,
        at(5, 4),
      ),
      at(5, 4),
      [at(8, 4)],
    );
    expect(
      offeredEnds(channelled, at(5, 4)).some((end) => gap(end, at(8, 4)) > 3),
    ).toBe(true);
    for (const end of ends(channelled, at(5, 4)))
      expect(gap(end, at(8, 4))).toBeLessThanOrEqual(CULT_CHANNEL_RANGE_V7);
    // The village (5, 5) again: four tiles from the cultist on (5, 1) that
    // channels the Horror on (5, 4), three from one on (5, 2).
    const village = (holder: CoordV7): boolean => {
      const state = withStrandsV7(
        withHorrorV7(
          scene([
            own("FIGHTER", holder.x, holder.y, { activation: CHANNELLED }),
            foe("FIGHTER", 2, 4),
          ]),
          0,
          at(5, 4),
        ),
        at(5, 4),
        [holder],
      );
      return ends(state, at(5, 4)).some((end) => gap(end, at(5, 5)) === 0);
    };
    expect(village(at(5, 1))).toBe(false);
    expect(village(at(5, 2))).toBe(true);
  });
});

describe("the Cult seat: a daemon that cannot be held (section 15.2 step 4)", () => {
  it("brings a daemon that ran ahead back within reach of its cultists", () => {
    const start = withHorrorV7(
      scene([own("FIGHTER", 9, 1), own("FIGHTER", 9, 2), foe("FIGHTER", 2, 3)]),
      0,
      at(3, 2),
    );
    const horror = unitAtV7(start, at(3, 2)).id;
    const first = decides(start);
    expect(first?.kind).toBe("MOVE");
    expect(first !== null && "unitId" in first && first.unitId).toBe(horror);
    const turn = policyTurn(start);
    expect(strandsOn(turn.state, nowAt(turn.state, horror))).toBe(2);
  });

  it("releases it toward the enemy: the nearest visible enemy nearer to it than any own unit", () => {
    // No robed cultist anywhere: a Familiar beside the Horror, a Fighter
    // three tiles from it.
    const start = withHorrorV7(
      scene([own("RAIDER", 5, 3), foe("FIGHTER", 1, 3)]),
      0,
      at(4, 3),
    );
    const horror = unitAtV7(start, at(4, 3)).id;
    const first = decides(start);
    expect(first?.kind).toBe("MOVE");
    expect(first !== null && "unitId" in first && first.unitId).toBe(horror);
    const end = first?.kind === "MOVE" ? first.path.at(-1) : undefined;
    if (end === undefined) throw new Error("no Move");
    expect(gap(end, at(1, 3))).toBeLessThan(gap(end, at(5, 3)));
    // If it broke there, it would go for the Fighter.
    const view = viewOf(start);
    const moved: PlayerViewV7 = {
      ...view,
      units: view.units.map((unit) =>
        unit.id === horror ? { ...unit, at: end } : unit,
      ),
    };
    expect(cultNearestToV7(moved, end, horror)?.ownerId).not.toBe(
      view.viewer.id,
    );
    // Nobody channels it.
    expect(ofKind(policyTurn(start).commands, "CHANNEL")).toHaveLength(0);
  });

  it("steps its own units away from one that stays where it is", () => {
    const start = withHorrorV7(scene([own("RAIDER", 5, 3)]), 0, at(4, 3), {
      activation: SPENT,
    });
    const familiar = unitAtV7(start, at(5, 3)).id;
    const first = decides(start);
    expect(first?.kind).toBe("MOVE");
    expect(first !== null && "unitId" in first && first.unitId).toBe(familiar);
    const end = first?.kind === "MOVE" ? first.path.at(-1) : undefined;
    expect(end === undefined ? 0 : gap(end, at(4, 3))).toBeGreaterThan(1);
  });

  it("lets a Herald go that two cultists cannot hold: they step away and do not channel", () => {
    const start = withHorrorV7(
      scene([own("FIGHTER", 6, 3), own("FIGHTER", 6, 5)]),
      0,
      at(4, 4),
      { activation: SPENT, role: "HERALD" },
    );
    const ids = [at(6, 3), at(6, 5)].map((tile) => unitAtV7(start, tile).id);
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "CHANNEL")).toHaveLength(0);
    for (const id of ids)
      expect(gap(nowAt(turn.state, id), at(4, 4))).toBeGreaterThan(2);
  });
});

describe("the Cult seat: Anchor (section 15.4)", () => {
  it("grips the channeller beside the Thing, and still channels one strand from elsewhere", () => {
    const build = (second: boolean): GameStateV7 =>
      withHorrorV7(
        scene([
          own("JUGGERNAUT", 6, 4),
          own("FIGHTER", 5, 3, { activation: { moved: true } }),
          ...(second ? [own("FIGHTER", 7, 2)] : []),
        ]),
        0,
        at(4, 4),
        { activation: SPENT },
      );
    const alone = policyTurn(build(false));
    expect(ofKind(alone.commands, "ANCHOR")).toHaveLength(1);
    expect(alone.state.cult.grips).toHaveLength(1);
    expect(strandsOn(alone.state, at(4, 4))).toBe(3);
    // The grip follows the Channel at once.
    const kinds = alone.commands.map((command) => command.kind);
    expect(kinds.indexOf("ANCHOR")).toBe(kinds.indexOf("CHANNEL") + 1);
    const two = policyTurn(build(true));
    expect(two.state.cult.grips).toHaveLength(1);
    expect(ofKind(two.commands, "CHANNEL")).toHaveLength(2);
    expect(strandsOn(two.state, at(4, 4))).toBe(4);
  });

  it("holds a Herald with two cultists and a Thing: one steps beside the Thing and is gripped", () => {
    const start = withHorrorV7(
      scene([
        own("JUGGERNAUT", 6, 6),
        own("FIGHTER", 6, 3),
        own("FIGHTER", 7, 4),
      ]),
      0,
      at(4, 4),
      { activation: SPENT, role: "HERALD" },
    );
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "CHANNEL")).toHaveLength(2);
    expect(turn.state.cult.grips).toHaveLength(1);
    expect(strandsOn(turn.state, at(4, 4))).toBe(4);
    const gripped = turn.state.cult.grips[0]?.cultistUnitId;
    expect(
      gripped === undefined ? 9 : gap(nowAt(turn.state, gripped), at(6, 6)),
    ).toBe(1);
  });
});

describe("the Cult seat: Bind again (section 15.2 step 5)", () => {
  const loose = (furious: boolean, initiate: GoblinPieceV7): GameStateV7 =>
    withUnboundV7(
      withHorrorV7(scene([initiate]), 0, at(5, 3)),
      at(5, 3),
      0,
      furious,
    );

  it("binds an Unbound Horror a cultist can reach this turn", () => {
    const start = loose(false, own("FIGHTER", 9, 3));
    const horror = unitAtV7(start, at(5, 3)).id;
    const turn = policyTurn(start);
    expect(
      ofKind(turn.commands, "CHANNEL").map((command) => command.daemonUnitId),
    ).toEqual([horror]);
    expect(turn.state.units.find((unit) => unit.id === horror)?.ownerId).toBe(
      seatIdV7(start, 0),
    );
  });

  it("leaves a Furious one, and one nobody reaches", () => {
    expect(
      ofKind(policyTurn(loose(true, own("FIGHTER", 7, 3))).commands, "CHANNEL"),
    ).toHaveLength(0);
    expect(
      ofKind(
        policyTurn(loose(false, own("FIGHTER", 10, 10))).commands,
        "CHANNEL",
      ),
    ).toHaveLength(0);
  });
});

describe("the Cult seat: summon only what it can hold (section 15.3)", () => {
  it("summons a Horror with 4 Favour, a helper, and an enemy near enough", () => {
    const start = withFavourV7(
      scene([own("CAPTAIN", 7, 3), own("FIGHTER", 7, 2), foe("FIGHTER", 2, 3)]),
      0,
      4,
    );
    const first = decides(start);
    expect(first?.kind).toBe("SUMMON");
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "SUMMON")).toHaveLength(1);
    expect(favourOf(turn.state)).toBe(0);
    const horror = turn.state.units.find((unit) => unit.summoned === "HORROR");
    if (horror === undefined) throw new Error("no Horror");
    // The Summoner and its helper channel it: Control + 1.
    expect(strandsOn(turn.state, horror.at)).toBe(2);
  });

  it("summons none with no enemy unit or center within six tiles of the Summoner", () => {
    // Also after the one step the Summoner may take this turn.
    const far = withFavourV7(
      scene([own("CAPTAIN", 10, 0), own("FIGHTER", 10, 1)]),
      0,
      5,
    );
    expect(gap(at(10, 0), GARRISON.at)).toBeGreaterThan(
      CULT_SUMMON_FRONT_V7 + 1,
    );
    expect(
      queryAiReadyCommandsV7(viewOf(far)).some(
        (item) => item.command.kind === "SUMMON",
      ),
    ).toBe(true);
    expect(ofKind(policyTurn(far).commands, "SUMMON")).toHaveLength(0);
  });

  it("summons a second Horror only with a spare cultist for both: four bodies, not three", () => {
    const build = (fourth: boolean): GameStateV7 =>
      withFavourV7(
        withHorrorV7(
          scene([
            own("CAPTAIN", 7, 3),
            own("FIGHTER", 7, 2),
            own("FIGHTER", 6, 2),
            ...(fourth ? [own("FIGHTER", 6, 4)] : []),
            foe("FIGHTER", 1, 3),
          ]),
          0,
          at(5, 3),
          { activation: SPENT },
        ),
        0,
        5,
      );
    // Three bodies: two hold the Horror it has, and it summons no other.
    const three = policyTurn(build(false));
    expect(ofKind(three.commands, "SUMMON")).toHaveLength(0);
    expect(strandsOn(three.state, at(5, 3))).toBe(2);
    expect(favourOf(three.state)).toBe(5);
    // Four: the Initiates hold the first (the Summoner is kept for the
    // summoning), then the Summoner and the last Initiate summon.
    const four = policyTurn(build(true));
    expect(ofKind(four.commands, "SUMMON")).toHaveLength(1);
    expect(strandsOn(four.state, at(5, 3))).toBe(2);
    const kinds = four.commands.map((command) => command.kind);
    expect(kinds.lastIndexOf("CHANNEL")).toBeLessThan(kinds.indexOf("SUMMON"));
  });

  it("summons beside an enemy only where the Summoner and its helper are not the Horror's nearest units", () => {
    const build = (familiar: boolean): GameStateV7 =>
      withFavourV7(
        scene([
          own("CAPTAIN", 4, 3),
          own("FIGHTER", 4, 4),
          ...(familiar ? [own("RAIDER", 3, 4, { hp: 1 })] : []),
          foe("FIGHTER", 2, 3),
        ]),
        0,
        5,
      );
    const where = (state: GameStateV7): CoordV7 => {
      const summon = ofKind(policyTurn(state).commands, "SUMMON")[0];
      if (summon === undefined) throw new Error("no Summon");
      return summon.at;
    };
    // The engine offers tiles beside the Fighter; the seat takes none.
    const alone = build(false);
    expect(
      queryAiReadyCommandsV7(viewOf(alone)).some(
        (item) =>
          item.command.kind === "SUMMON" &&
          gap(item.command.at, at(2, 3)) === 1,
      ),
    ).toBe(true);
    expect(gap(where(alone), at(2, 3))).toBeGreaterThan(1);
    // With a wounded Familiar beside that tile, the Familiar is the unit
    // the Horror would go for: the tile beside the enemy is taken.
    expect(gap(where(build(true)), at(2, 3))).toBe(1);
  });
});

describe("the Cult seat: Sacrifice (section 15.4)", () => {
  const spare = (
    favour: number,
    initiates: number,
    options: FieldOptionsV7 = {},
  ): GameStateV7 =>
    withFavourV7(
      scene(
        [
          own("CAPTAIN", 9, 2),
          ...[
            own("FIGHTER", 8, 2),
            own("FIGHTER", 8, 1),
            own("FIGHTER", 9, 1),
          ].slice(0, initiates),
        ],
        options,
      ),
      0,
      favour,
    );

  it("offers up a spare Initiate when its value brings Favour to a Horror's 4", () => {
    const start = spare(3, 3);
    const first = decides(start);
    expect(first?.kind).toBe("SACRIFICE");
    const victim =
      first?.kind === "SACRIFICE"
        ? viewOf(start).units.find((unit) => unit.id === first.victimUnitId)
        : undefined;
    expect(victim !== undefined && cultInitiateV7(viewOf(start), victim)).toBe(
      true,
    );
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "SACRIFICE")).toHaveLength(1);
    expect(favourOf(turn.state)).toBe(5);
  });

  it("offers none when the value does not reach 4, nor without bodies to spare", () => {
    expect(ofKind(policyTurn(spare(1, 3)).commands, "SACRIFICE")).toHaveLength(
      0,
    );
    // The Summoner and one Initiate are the two a Horror needs.
    expect(ofKind(policyTurn(spare(3, 1)).commands, "SACRIFICE")).toHaveLength(
      0,
    );
  });

  it("counts the bodies its daemons need: three cultists beside a Horror spare none", () => {
    const start = withFavourV7(
      withHorrorV7(
        scene([
          own("CAPTAIN", 9, 2),
          own("FIGHTER", 8, 2),
          own("FIGHTER", 8, 1),
          own("FIGHTER", 9, 1),
        ]),
        0,
        at(7, 3),
        { activation: SPENT },
      ),
      0,
      3,
    );
    // Four bodies, wanted 2 for the Horror and 2 more: none beyond them.
    expect(ofKind(policyTurn(start).commands, "SACRIFICE")).toHaveLength(0);
  });

  it("works toward 18 only with The Stars Are Right", () => {
    expect(ofKind(policyTurn(spare(16, 3)).commands, "SACRIFICE")).toHaveLength(
      1,
    );
    const without = spare(16, 3, {
      techs: {
        0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
        1: [],
      },
    });
    expect(ofKind(policyTurn(without).commands, "SACRIFICE")).toHaveLength(0);
  });

  // An Initiate that has moved and struck, beside its Summoner and two
  // Fighters.
  const doomed = (hp: number, fighters: number): GameStateV7 =>
    scene([
      own("CAPTAIN", 7, 3),
      own("FIGHTER", 6, 3, {
        hp,
        activation: { moved: true, attacked: true, attacksUsed: 1 },
      }),
      ...[foe("FIGHTER", 5, 2), foe("FIGHTER", 5, 3)].slice(0, fighters),
    ]);

  it("offers up an own unit the visible enemy kills this round and that cannot retreat, last of all", () => {
    const start = doomed(2, 2);
    const summoner = unitAtV7(start, at(7, 3)).id;
    const victim = unitAtV7(start, at(6, 3)).id;
    const decision = chooseNormalCommandV7(viewOf(start));
    const candidate = decision.candidates.find(
      (item) => item.command.kind === "SACRIFICE",
    );
    expect(candidate?.score.priority).toBe(CULT_DOOMED_PRIORITY_V7);
    // The Summoner keeps its action for it: it has no other candidate.
    expect(
      decision.candidates.filter(
        (item) =>
          "unitId" in item.command &&
          item.command.unitId === summoner &&
          item.command.kind !== "SACRIFICE",
      ),
    ).toHaveLength(0);
    const turn = policyTurn(start);
    const last = turn.commands.at(-1);
    expect(last).toEqual({
      kind: "SACRIFICE",
      unitId: summoner,
      victimUnitId: victim,
    });
    expect(favourOf(turn.state)).toBe(2);
  });

  it("offers up no unit the enemy does not kill", () => {
    expect(
      // (7 HP: a full-HP Initiate since the Cult redesign, `pulp_wars-mch9.31`.)
      ofKind(policyTurn(doomed(7, 1)).commands, "SACRIFICE"),
    ).toHaveLength(0);
  });

  it("never offers up the unit on a center with an enemy within three tiles", () => {
    const start = scene([
      own("CAPTAIN", 9, 8),
      own("FIGHTER", 8, 8, {
        hp: 1,
        activation: { moved: true, attacked: true, attacksUsed: 1 },
      }),
      foe("FIGHTER", 7, 7),
      foe("FIGHTER", 8, 7),
    ]);
    expect(
      queryAiReadyCommandsV7(viewOf(start)).some(
        (item) => item.command.kind === "SACRIFICE",
      ),
    ).toBe(true);
    expect(ofKind(policyTurn(start).commands, "SACRIFICE")).toHaveLength(0);
  });
});

describe("the Cult seat: Seize (section 15.4)", () => {
  it("seizes a broken enemy at once, for twice its value", () => {
    const start = scene([
      own("CAPTAIN", 6, 2),
      own("FIGHTER", 6, 3),
      foe("FIGHTER", 5, 2, { hp: 4 }),
    ]);
    const decision = chooseNormalCommandV7(viewOf(start));
    expect(decision.command?.kind).toBe("SEIZE");
    expect(decision.candidates[0]?.score.priority).toBe(CULT_SEIZE_PRIORITY_V7);
    const turn = policyTurn(start);
    expect(turn.commands[0]?.kind).toBe("SEIZE");
    expect(favourOf(turn.state)).toBe(4);
  });

  it("keeps the broken enemy for the Seizure: no attack on it is a candidate", () => {
    const build = (hp: number): GameStateV7 =>
      scene([
        own("CAPTAIN", 6, 2),
        own("FIGHTER", 6, 3),
        own("MARKSMAN", 7, 2),
        foe("FIGHTER", 5, 2, { hp }),
      ]);
    const attacksOn = (state: GameStateV7): number => {
      const victim = unitAtV7(state, at(5, 2)).id;
      return chooseNormalCommandV7(viewOf(state)).candidates.filter(
        (item) =>
          item.command.kind === "ATTACK" &&
          item.command.targetUnitId === victim,
      ).length;
    };
    expect(attacksOn(build(4))).toBe(0);
    // Sanity (the mutation): a Fighter that is not broken is attacked.
    expect(attacksOn(build(6))).toBeGreaterThan(0);
  });

  it("steps the Summoner up to a broken enemy a holder stands beside, then seizes it", () => {
    const start = scene([
      own("FIGHTER", 6, 3),
      own("CAPTAIN", 7, 2),
      foe("FIGHTER", 5, 2, { hp: 4 }),
    ]);
    const summoner = unitAtV7(start, at(7, 2)).id;
    const turn = policyTurn(start);
    expect(turn.commands.slice(0, 2).map((command) => command.kind)).toEqual([
      "MOVE",
      "SEIZE",
    ]);
    expect(turn.played[0]?.unit?.id).toBe(summoner);
    expect(favourOf(turn.state)).toBe(4);
  });

  it("steps a holder up beside the broken enemy first: its Move is exempt from contact with company", () => {
    // Two Fighters; the one at (5, 2) is broken. The Initiate at (7, 4) can
    // step to (6, 3), beside both, where the two would kill it.
    const start = scene([
      own("CAPTAIN", 6, 1),
      own("FIGHTER", 7, 4, { hp: 3 }),
      foe("FIGHTER", 5, 2, { hp: 4 }),
      foe("FIGHTER", 5, 4),
    ]);
    const initiate = unitAtV7(start, at(7, 4)).id;
    const turn = policyTurn(start);
    expect(turn.commands.slice(0, 2).map((command) => command.kind)).toEqual([
      "MOVE",
      "SEIZE",
    ]);
    expect(turn.played[0]?.unit?.id).toBe(initiate);
    expect(gap(nowAt(turn.state, initiate), at(5, 2))).toBe(1);
  });

  it("makes no such step toward an enemy that is not broken", () => {
    const start = scene([
      own("FIGHTER", 6, 3),
      own("CAPTAIN", 7, 2),
      foe("FIGHTER", 5, 2, { hp: 6 }),
    ]);
    // (Since the Cult redesign's Attack 1.5 Initiate, `pulp_wars-mch9.31`,
    // the Initiate's own attack leaves the Fighter broken and the Summoner
    // may Seize it after: the rule is only that no step is made toward it
    // first.)
    expect(decides(start)?.kind).not.toBe("SEIZE");
    expect(
      chooseNormalCommandV7(viewOf(start)).candidates[0]?.score.priority,
    ).toBeLessThan(CULT_SEIZE_PRIORITY_V7);
  });
});

describe("the Cult seat: Offering (section 15.4)", () => {
  // The capital with two Farms (level 2, population 2); every Cult unit is
  // homed to it, so two units fill its slots.
  const build = (
    favour: number,
    pieces: readonly GoblinPieceV7[],
    options: FieldOptionsV7 = {},
  ): GameStateV7 =>
    withFavourV7(withFarmsV7(scene(pieces, options), 0, 2), 0, favour);
  // A Summoner and an Idol Bearer: the two bodies a Horror needs, and no
  // Initiate to spare.
  const home = [own("CAPTAIN", 9, 2), own("GUARD", 8, 8)];
  const noStars: FieldOptionsV7 = {
    techs: {
      0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
      1: [],
    },
  };
  const offered = (state: GameStateV7): boolean =>
    queryAiReadyCommandsV7(viewOf(state)).some(
      (item) => item.command.kind === "OFFERING",
    );

  it("gives up population for Favour in a city that can train nothing, short of 4 Favour", () => {
    const start = build(1, home, noStars);
    expect(offered(start)).toBe(true);
    const first = decides(start);
    expect(first?.kind).toBe("OFFERING");
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "OFFERING")).toHaveLength(1);
    expect(favourOf(turn.state)).toBe(7);
  });

  it("makes none with an enemy within three tiles of the center", () => {
    const start = build(1, [...home, foe("FIGHTER", 6, 6)], noStars);
    expect(offered(start)).toBe(true);
    expect(ofKind(policyTurn(start).commands, "OFFERING")).toHaveLength(0);
  });

  it("makes none with 5 Favour (but works on toward 20 with The Stars Are Right)", () => {
    const rich = build(5, home, noStars);
    expect(offered(rich)).toBe(true);
    expect(ofKind(policyTurn(rich).commands, "OFFERING")).toHaveLength(0);
    expect(
      ofKind(policyTurn(build(5, home)).commands, "OFFERING"),
    ).toHaveLength(1);
  });

  it("makes none without a Summoner to spend the Favour", () => {
    const nobody = build(
      1,
      [own("FIGHTER", 9, 2), own("GUARD", 8, 8)],
      noStars,
    );
    expect(offered(nobody)).toBe(true);
    expect(ofKind(policyTurn(nobody).commands, "OFFERING")).toHaveLength(0);
  });

  it("makes none in a city that can train", () => {
    // The same city with Coins, its center empty, and its units homeless:
    // it has free slots and a unit to train.
    const start = build(1, [own("CAPTAIN", 9, 2), own("GUARD", 9, 3)], {
      ...noStars,
      coins: 20,
    });
    const free: GameStateV7 = {
      ...start,
      units: start.units.map((unit) => ({ ...unit, homeCityId: null })),
    };
    expect(offered(free)).toBe(true);
    expect(
      queryAiReadyCommandsV7(viewOf(free)).some(
        (item) => item.command.kind === "TRAIN",
      ),
    ).toBe(true);
    expect(decides(free)?.kind).not.toBe("OFFERING");
  });
});

describe("the Cult seat: legal, deterministic turns on what A2 covers", () => {
  // Bead A3 (`pulp_wars-mch9.11`) plays these, by the same plan
  // (tests/unit/ruleset-v7-cult-rituals-ai.test.ts).
  const A3: readonly CommandV7["kind"][] = [
    "BOO",
    "BEGIN_RITUAL",
    "PROCLAIM",
    "RIBBIT",
    "SWITCHEROO",
    "TENTACLE",
  ];
  const A2: readonly CommandV7["kind"][] = [
    "SACRIFICE",
    "SEIZE",
    "OFFERING",
    "SUMMON",
    "CHANNEL",
    "ANCHOR",
  ];

  const midGame = (): GameStateV7 =>
    withFavourV7(
      withHorrorV7(
        {
          ...cultFieldV7(
            [
              own("FIGHTER", 6, 6),
              own("FIGHTER", 6, 7),
              own("FIGHTER", 6, 8),
              own("GUARD", 8, 8),
              own("MARKSMAN", 7, 6),
              own("CAPTAIN", 7, 7),
              own("CATAPULT", 7, 8),
              own("MARKSMAN", 7, 9),
              own("RAIDER", 9, 6),
              own("JUGGERNAUT", 8, 7),
              foe("FIGHTER", 4, 6),
              foe("MARKSMAN", 3, 6),
              foe("KNIGHT", 3, 7),
              foe("GUARD", 2, 8),
            ],
            { coins: 30 },
          ),
          round: 12,
        },
        0,
        at(5, 6),
      ),
      0,
      30,
    );

  it("plays a whole mid-game turn with offered commands only, and holds its Horror", () => {
    const turn = policyTurn(midGame());
    expect(turn.commands.length).toBeGreaterThan(0);
    const horror = turn.state.units.find((unit) => unit.summoned === "HORROR");
    if (horror !== undefined)
      expect(strandsOn(turn.state, horror.at)).toBeGreaterThanOrEqual(1);
  });

  it("decides the same command for the same public view", () => {
    const view = viewOf(midGame());
    const first = chooseNormalCommandV7(view);
    const second = chooseNormalCommandV7(
      JSON.parse(JSON.stringify(view)) as PlayerViewV7,
    );
    expect(second.command).toEqual(first.command);
    expect(second.candidates.map((item) => item.command)).toEqual(
      first.candidates.map((item) => item.command),
    );
    expect(first.prngDraws).toBe(0);
  });

  it("plays none of its commands on the older policy (the tests' switch)", () => {
    const previous = setArmyPlayFactionsV7(
      ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "CULT"),
    );
    try {
      const turn = policyTurn(midGame());
      for (const command of turn.commands)
        expect([...A2, ...A3], command.kind).not.toContain(command.kind);
    } finally {
      setArmyPlayFactionsV7(previous);
    }
  });
});
