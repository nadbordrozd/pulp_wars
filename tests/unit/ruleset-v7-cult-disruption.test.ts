import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DISRUPTING_STATUS_LISTS_V7,
  DISRUPTION_CAUSES_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  applyCommandV7,
  cultDisruptionsV7,
  disruptingStatusKeysV7,
  holdingStrandsV7,
  parseEventV7,
  parseGameStateV7,
  projectEventsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DisruptionCauseV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cultFieldV7,
  withGripV7,
  withHorrorV7,
  withIdolsV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import {
  DISRUPTION_EVENT_PATHS_V7,
  DISRUPTION_STATE_KEY_CLASSES_V7,
  UNPROVEN_DISRUPTION_PATHS_V7,
} from "../fixtures/v7-disruption-paths";
import {
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { martianFieldV7 } from "../fixtures/v7-martian";
import { at, kindsV7, unexploreV7 } from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E3 (`pulp_wars-mch9.5`,
 * docs/product/RULESET_7_CULTISTS.md section 6.2): the one disruption rule.
 * "Any Hit Point a channeller loses, any move that is not its own, any
 * status another seat puts on it, any change of owner, and any way off the
 * board breaks its strand."
 *
 * Three parts: the audit of `tests/fixtures/v7-disruption-paths.ts` against
 * the source; the rule on bare state pairs (every cause, every status
 * list); and a real command for every path the engine has of hurting,
 * moving, marking, taking, or removing a unit. Every state is built by
 * hand; no match is played.
 *
 * The board: the Cult is seat 0 with a Horror on (5, 4) and a channeller on
 * (5, 6) holding a strand to it; the other seat is to move unless the case
 * says otherwise.
 */

const HORROR = at(5, 4);
const CHANNELLER = at(5, 6);

/** The value, which the test requires to be there. */
function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

interface RigOptionsV7 {
  /** The channeller's role (an Idol Bearer by default: 16 HP). */
  readonly role?: UnitRoleIdV7;
  readonly hp?: number;
  readonly activeSeat?: number;
  /** Other seat-0 pieces. */
  readonly own?: readonly GoblinPieceV7[];
  readonly water?: readonly CoordV7[];
  /** Build the field with the Martian fixture (Shields). */
  readonly martian?: boolean;
}

/** The board of this file against `enemy` with its `pieces`. */
function rig(
  enemy: FactionIdV7,
  pieces: readonly Omit<GoblinPieceV7, "seat">[],
  options: RigOptionsV7 = {},
): GameStateV7 {
  const all: GoblinPieceV7[] = [
    {
      seat: 0,
      role: options.role ?? "GUARD",
      at: CHANNELLER,
      ...(options.hp === undefined ? {} : { hp: options.hp }),
    },
    ...(options.own ?? []),
    ...pieces.map((piece) => ({ seat: 1, ...piece })),
  ];
  const fieldOptions = {
    factions: ["CULT", enemy] as const,
    activeSeat: options.activeSeat ?? 1,
    ...(options.water === undefined ? {} : { water: options.water }),
  };
  const field =
    options.martian === true
      ? martianFieldV7(all, fieldOptions)
      : cultFieldV7(all, fieldOptions);
  return withStrandsV7(withHorrorV7(field, 0, HORROR), HORROR, [CHANNELLER]);
}

interface RunV7 {
  readonly before: GameStateV7;
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
}

/** Applies `command` for the active seat; events and state must round-trip. */
function run(state: GameStateV7, command: CommandV7): RunV7 {
  const actor = need(state.turnOrder[state.activeSeatIndex]);
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(
      `${command.kind} rejected: ${result.error.code} ${JSON.stringify(result.error.params)}`,
    );
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return { before: state, state: result.state, events: result.events };
}

const id = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;
const broken = (events: readonly DomainEventV7[]) =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: "STRAND_BROKEN" }> =>
      event.kind === "STRAND_BROKEN",
  );
const unitCommand = <K extends CommandV7["kind"]>(
  kind: K,
  state: GameStateV7,
  where: CoordV7,
) => ({ kind, unitId: id(state, where) }) as Extract<CommandV7, { kind: K }>;
const targeted = <K extends CommandV7["kind"]>(
  kind: K,
  state: GameStateV7,
  from: CoordV7,
  target: CoordV7 = CHANNELLER,
) =>
  ({
    kind,
    unitId: id(state, from),
    targetUnitId: id(state, target),
  }) as unknown as CommandV7;

/**
 * A real path: a command on a hand-built board that must emit every event
 * kind of `proves` and break the channeller's strand with `cause`.
 */
interface PathCaseV7 {
  readonly name: string;
  readonly proves: readonly DomainEventV7["kind"][];
  readonly cause: DisruptionCauseV7;
  readonly build: () => {
    readonly state: GameStateV7;
    readonly command: CommandV7;
    /** The watched cultist when it is not the one on (5, 6). */
    readonly cultist?: CoordV7;
  };
}

/** An Idol Bearer on (6, 5) with its idol raised: it wards (5, 6). */
const WARD: GoblinPieceV7 = { seat: 0, role: "GUARD", at: at(6, 5) };
const warded = (state: GameStateV7): GameStateV7 =>
  withIdolsV7(state, [WARD.at]);

const PATH_CASES: readonly PathCaseV7[] = [
  {
    name: "a ranged attack (a Marksman's shot)",
    proves: ["COMBAT_RESOLVED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("ORIGINAL", [{ role: "MARKSMAN", at: at(5, 8) }]);
      return { state, command: targeted("ATTACK", state, at(5, 8)) };
    },
  },
  {
    name: "a kill (a Knight's charge)",
    proves: ["COMBAT_RESOLVED", "UNIT_DIED"],
    cause: "GONE",
    build: () => {
      const state = rig("ORIGINAL", [{ role: "KNIGHT", at: at(5, 7) }], {
        role: "FIGHTER",
        hp: 3,
      });
      return { state, command: targeted("ATTACK", state, at(5, 7)) };
    },
  },
  {
    name: "the splash of a bomb thrown at the unit beside it",
    proves: ["COMBAT_RESOLVED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("GOBLIN", [{ role: "MARKSMAN", at: at(2, 6) }], {
        own: [{ seat: 0, role: "SWORDSMAN", at: at(4, 6) }],
      });
      return {
        state,
        command: targeted("ATTACK", state, at(2, 6), at(4, 6)),
      };
    },
  },
  {
    name: "a Kaboom beside it",
    proves: ["EXPLOSION_RESOLVED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("GOBLIN", [{ role: "FIGHTER", at: at(5, 7) }]);
      return { state, command: unitCommand("KABOOM", state, at(5, 7)) };
    },
  },
  {
    name: "the death blast of a Rocket Cart its own Horror kills",
    proves: ["EXPLOSION_RESOLVED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("GOBLIN", [{ role: "CATAPULT", at: at(5, 5), hp: 2 }], {
        activeSeat: 0,
      });
      return { state, command: targeted("ATTACK", state, HORROR, at(5, 5)) };
    },
  },
  {
    name: "a Wail",
    proves: ["WAIL_RESOLVED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("UNDEAD", [{ role: "MARKSMAN", at: at(5, 8) }]);
      return { state, command: unitCommand("WAIL", state, at(5, 8)) };
    },
  },
  {
    name: "a Whirl",
    proves: ["WHIRL_RESOLVED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("DWARF", [{ role: "KNIGHT", at: at(5, 7) }]);
      return { state, command: unitCommand("WHIRL", state, at(5, 7)) };
    },
  },
  {
    name: "a Thunder Stomp",
    proves: ["THUNDER_STOMP"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("DINOSAUR", [{ role: "JUGGERNAUT", at: at(5, 7) }]);
      return { state, command: unitCommand("STOMP", state, at(5, 7)) };
    },
  },
  {
    name: "a Crushing Shove with nowhere to go",
    proves: ["UNIT_CRUSHED"],
    cause: "HP_LOSS",
    build: () => {
      // Behind (5, 6), seen from (5, 7), is the village center (5, 5).
      const state = rig("ORIGINAL", [{ role: "JUGGERNAUT", at: at(5, 7) }]);
      return { state, command: targeted("ATTACK", state, at(5, 7)) };
    },
  },
  {
    name: "a Colossus striding over it",
    proves: ["UNITS_TRAMPLED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("MARTIAN", [{ role: "JUGGERNAUT", at: at(4, 6) }], {
        martian: true,
      });
      return {
        state,
        command: {
          kind: "MOVE",
          unitId: id(state, at(4, 6)),
          path: [at(5, 6), at(6, 6)],
        },
      };
    },
  },
  {
    name: "a Thump beside the Bunny's target",
    proves: ["THUMPED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("CANDY", [{ role: "KNIGHT", at: at(5, 7) }], {
        own: [{ seat: 0, role: "SWORDSMAN", at: at(4, 7) }],
      });
      return {
        state,
        command: targeted("ATTACK", state, at(5, 7), at(4, 7)),
      };
    },
  },
  {
    name: "a Ricochet off the unit beside it",
    proves: ["RICOCHETED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("CANDY", [{ role: "MARKSMAN", at: at(2, 6) }], {
        role: "FIGHTER",
        own: [{ seat: 0, role: "SWORDSMAN", at: at(4, 6) }],
      });
      return {
        state,
        command: targeted("ATTACK", state, at(2, 6), at(4, 6)),
      };
    },
  },
  {
    name: "a Stampede through it",
    proves: ["MAMMOTH_STAMPEDED"],
    cause: "HP_LOSS",
    build: () => {
      const state = rig("ICE_FOLK", [{ role: "SWORDSMAN", at: at(3, 6) }]);
      return {
        state,
        command: {
          kind: "STAMPEDE",
          unitId: id(state, at(3, 6)),
          at: at(5, 6),
        },
      };
    },
  },
  {
    name: "Plague damage at its own Start Turn, before the check",
    proves: ["PLAGUE_DAMAGED"],
    cause: "HP_LOSS",
    build: () => {
      const base = rig("UNDEAD", [{ role: "CATAPULT", at: at(1, 1) }]);
      const state = checkedV7({
        ...base,
        plagued: [
          {
            unitId: id(base, CHANNELLER),
            sourceUnitId: id(base, at(1, 1)),
            turnsRemaining: 2,
          },
        ],
      });
      return { state, command: { kind: "END_TURN" } };
    },
  },
  {
    name: "Plague spreading to it at its own Start Turn",
    proves: ["PLAGUE_SPREAD"],
    cause: "STATUS",
    build: () => {
      const base = rig("UNDEAD", [{ role: "CATAPULT", at: at(1, 1) }], {
        own: [{ seat: 0, role: "SWORDSMAN", at: at(4, 6) }],
      });
      const state = checkedV7({
        ...base,
        plagued: [
          {
            unitId: id(base, at(4, 6)),
            sourceUnitId: id(base, at(1, 1)),
            turnsRemaining: 3,
          },
        ],
      });
      return { state, command: { kind: "END_TURN" } };
    },
  },
  {
    name: "a Frost Bolt",
    proves: ["UNITS_FROZEN"],
    cause: "STATUS",
    build: () => {
      const state = rig("ICE_FOLK", [{ role: "CAPTAIN", at: at(5, 8) }]);
      return { state, command: targeted("FROST_BOLT", state, at(5, 8)) };
    },
  },
  {
    name: "a Cold Snap",
    proves: ["UNITS_FROZEN"],
    cause: "STATUS",
    build: () => {
      const state = rig("ICE_FOLK", [{ role: "CAPTAIN", at: at(5, 7) }]);
      return { state, command: unitCommand("COLD_SNAP", state, at(5, 7)) };
    },
  },
  {
    name: "a Sled's Bolas",
    proves: ["UNITS_FROZEN"],
    cause: "STATUS",
    build: () => {
      const state = rig("ICE_FOLK", [{ role: "RAIDER", at: at(5, 8) }]);
      return { state, command: targeted("THROW_BOLAS", state, at(5, 8)) };
    },
  },
  {
    name: "Sticky Toffee, under a raised idol (the hit is warded, the status is not)",
    proves: ["UNIT_STUCK"],
    cause: "STATUS",
    build: () => {
      const state = warded(
        rig("CANDY", [{ role: "FIGHTER", at: at(5, 7) }], { own: [WARD] }),
      );
      return { state, command: targeted("ATTACK", state, at(5, 7)) };
    },
  },
  {
    name: "a Push, under a raised idol (the hit is warded, the shove is not)",
    proves: ["UNIT_PUSHED"],
    cause: "MOVED",
    build: () => {
      // From (6, 7) the Juggernaut pushes (5, 6) to the free (4, 5).
      const state = warded(
        rig("ORIGINAL", [{ role: "JUGGERNAUT", at: at(6, 7) }], {
          own: [WARD],
        }),
      );
      return { state, command: targeted("ATTACK", state, at(6, 7)) };
    },
  },
  {
    name: "a Knockback, under a raised idol",
    proves: ["UNIT_PUSHED"],
    cause: "MOVED",
    build: () => {
      const state = warded(
        rig("DWARF", [{ role: "CATAPULT", at: at(8, 6) }], { own: [WARD] }),
      );
      return { state, command: targeted("ATTACK", state, at(8, 6)) };
    },
  },
  {
    name: "a Tractor Beam",
    proves: ["UNIT_PULLED"],
    cause: "MOVED",
    build: () => {
      const state = rig("MARTIAN", [{ role: "RAIDER", at: at(5, 8) }], {
        martian: true,
      });
      return { state, command: targeted("TRACTOR_BEAM", state, at(5, 8)) };
    },
  },
  {
    name: "a Boo! of its own seat's Horror",
    proves: ["UNITS_SCARED"],
    cause: "MOVED",
    build: () => {
      const state = withHorrorV7(
        rig("ORIGINAL", [{ role: "FIGHTER", at: at(1, 1) }], {
          activeSeat: 0,
          role: "FIGHTER",
        }),
        0,
        at(4, 6),
      );
      return { state, command: unitCommand("BOO", state, at(4, 6)) };
    },
  },
  {
    name: "Mind Control",
    proves: ["UNIT_MIND_CONTROLLED"],
    cause: "OWNER",
    build: () => {
      const state = rig("MARTIAN", [{ role: "CAPTAIN", at: at(5, 8) }], {
        martian: true,
        role: "FIGHTER",
        hp: 4,
      });
      return { state, command: targeted("MIND_CONTROL", state, at(5, 8)) };
    },
  },
  {
    name: "a Swallow",
    proves: ["UNIT_SWALLOWED"],
    cause: "GONE",
    build: () => {
      const state = rig("UNDEAD", [{ role: "JUGGERNAUT", at: at(5, 7) }], {
        role: "FIGHTER",
      });
      return { state, command: targeted("SWALLOW", state, at(5, 7)) };
    },
  },
  {
    name: "its own Summoner's Sacrifice",
    proves: ["UNIT_SACRIFICED", "UNIT_DIED"],
    cause: "GONE",
    build: () => {
      const state = rig("ORIGINAL", [{ role: "FIGHTER", at: at(1, 1) }], {
        activeSeat: 0,
        own: [{ seat: 0, role: "CAPTAIN", at: at(4, 6) }],
      });
      return {
        state,
        command: {
          kind: "SACRIFICE",
          unitId: id(state, at(4, 6)),
          victimUnitId: id(state, CHANNELLER),
        },
      };
    },
  },
  {
    name: "another lodge's Seizure",
    proves: ["UNIT_SEIZED", "UNIT_DIED"],
    cause: "GONE",
    build: () => {
      const state = rig(
        "CULT",
        [
          { role: "CAPTAIN", at: at(5, 7) },
          { role: "FIGHTER", at: at(6, 7) },
        ],
        { role: "FIGHTER", hp: 4 },
      );
      return {
        state,
        command: {
          kind: "SEIZE",
          unitId: id(state, at(5, 7)),
          victimUnitId: id(state, CHANNELLER),
        },
      };
    },
  },
];

/**
 * Paths proven outside `PATH_CASES`, on a grip instead of a strand (a
 * strand holder cannot attack, so it never gets Toothache): the Anchor
 * tests below.
 */
const OTHER_PROVEN_PATHS: readonly DomainEventV7["kind"][] = [
  "TOOTHACHE_GIVEN",
];

describe("the disruption rule: the audit (section 6.2)", () => {
  it("classifies every domain event kind", () => {
    expect(Object.keys(DISRUPTION_EVENT_PATHS_V7).sort()).toEqual(
      [...DOMAIN_EVENT_KIND_ORDER_V7].sort(),
    );
    for (const [kind, causes] of Object.entries(DISRUPTION_EVENT_PATHS_V7)) {
      expect(new Set(causes).size, kind).toBe(causes.length);
      for (const cause of causes)
        expect(DISRUPTION_CAUSES_V7, kind).toContain(cause);
    }
  });

  it("has a hand-built proof for every path, or says why not", () => {
    const proven = new Set<string>([
      ...PATH_CASES.flatMap((entry) => entry.proves),
      ...OTHER_PROVEN_PATHS,
    ]);
    const paths = Object.entries(DISRUPTION_EVENT_PATHS_V7)
      .filter(([, causes]) => causes.length > 0)
      .map(([kind]) => kind);
    const missing = paths.filter(
      (kind) =>
        !proven.has(kind as never) &&
        !Object.hasOwn(UNPROVEN_DISRUPTION_PATHS_V7, kind),
    );
    expect(missing).toEqual([]);
    // Nothing is listed as unproven that has a proof or is no path.
    for (const kind of Object.keys(UNPROVEN_DISRUPTION_PATHS_V7)) {
      expect(paths, kind).toContain(kind);
      expect(proven.has(kind as never), kind).toBe(false);
    }
    // A case proves only kinds classified with its cause.
    for (const entry of PATH_CASES)
      for (const kind of entry.proves)
        expect(
          DISRUPTION_EVENT_PATHS_V7[kind].length,
          `${entry.name}: ${kind}`,
        ).toBeGreaterThan(0);
  });

  it("classifies every key of the game state, and reads every status list", () => {
    const state = cultFieldV7([]);
    expect(Object.keys(DISRUPTION_STATE_KEY_CLASSES_V7).sort()).toEqual(
      Object.keys(state).sort(),
    );
    const statusKeys = Object.entries(DISRUPTION_STATE_KEY_CLASSES_V7)
      .filter(([, kind]) => kind === "STATUS")
      .map(([key]) => key)
      .sort();
    expect(statusKeys).toEqual([...DISRUPTING_STATUS_LISTS_V7].sort());
    // The lists it reads are exactly the keys the source reads.
    const source = readFileSync("src/engine/v7/cult-channel.ts", "utf8");
    const reader = source.slice(
      source.indexOf("export function disruptingStatusKeysV7"),
      source.indexOf("export const DISRUPTING_STATUS_LISTS_V7"),
    );
    for (const key of statusKeys)
      expect(reader, key).toMatch(new RegExp(`state\\.${key}\\b`));
  });

  it("runs every accepted command through the disruption step, and the Start Turn through its own", () => {
    const source = readFileSync("src/engine/v7/reducer.ts", "utf8");
    const body = (name: string): string => {
      const start = source.indexOf(`\nfunction ${name}(`);
      const exported = source.indexOf(`\nexport function ${name}(`);
      const from = start >= 0 ? start : exported;
      expect(from, name).toBeGreaterThanOrEqual(0);
      const end = source.indexOf("\n}\n", from);
      return source.slice(from, end);
    };
    const count = (text: string, needle: string) =>
      text.split(needle).length - 1;
    // One entry point applies commands, and it wraps the one core.
    expect(body("applyCommandV7")).toContain("applyCommandUnscoredV7(");
    expect(count(source, "applyCommandCoreV7(")).toBe(2);
    const unscored = body("applyCommandUnscoredV7");
    expect(unscored).toContain("applyCommandCoreV7(stateInput, actor, input)");
    // The disruption step wraps every other fold of the command, with the
    // state the command began with.
    expect(unscored).toMatch(
      /const core = withDisruptionsResultV7\(\s*stateInput,\s*input,/,
    );
    expect(count(source, "withDisruptionsResultV7(")).toBe(2);
    // Every later step of the command only adds events or reveals tiles.
    const after = unscored.slice(unscored.indexOf("const core ="));
    expect(after).not.toContain("applyCommandCoreV7");
    // The Start Turn: Plague and its chains, then the channel step (with
    // the state the `END_TURN` began with), then the hatch step.
    const endTurn = body("applyEndTurn");
    const plague = endTurn.indexOf("resolveStartTurnPlagueAndChainV7(");
    const channel = endTurn.indexOf("resolveStartTurnChannelStepV7(");
    const hatch = endTurn.indexOf("resolveStartTurnHatchV7(");
    expect(plague).toBeGreaterThan(0);
    expect(channel).toBeGreaterThan(plague);
    expect(hatch).toBeGreaterThan(channel);
    expect(endTurn.slice(channel, channel + 80)).toMatch(
      /resolveStartTurnChannelStepV7\(\s*original,\s*plagued\.state,/,
    );
    expect(count(source, "resolveStartTurnChannelStepV7(")).toBe(2);
    // Every Start Turn after the first runs in `applyEndTurn` (the first
    // is the match's creation: no daemon exists).
    expect(count(source, "startTurnEconomyV7(")).toBe(
      count(body("applyEndTurn"), "startTurnEconomyV7(") +
        count(body("createPlayableGameFromMapStateV7"), "startTurnEconomyV7("),
    );
  });
});

describe("the disruption rule: on bare state pairs", () => {
  const base = (): GameStateV7 =>
    rig("ORIGINAL", [{ role: "FIGHTER", at: at(1, 1) }], {
      own: [{ seat: 0, role: "FIGHTER", at: at(6, 6) }],
    });
  const fold = (
    before: GameStateV7,
    after: GameStateV7,
    acting: number | null = null,
  ) => cultDisruptionsV7(before, after, acting as never);
  const patchUnit = (
    state: GameStateV7,
    where: CoordV7,
    patch: object,
  ): GameStateV7 => ({
    ...state,
    units: state.units.map((unit) =>
      unit.at.x === where.x && unit.at.y === where.y
        ? { ...unit, ...patch }
        : unit,
    ),
  });

  it("breaks a strand for each cause and reports the first of the frozen order", () => {
    const before = base();
    const cultist = id(before, CHANNELLER);
    const expectCause = (after: GameStateV7, cause: DisruptionCauseV7) => {
      const result = fold(before, after);
      expect(result.events).toEqual([
        {
          kind: "STRAND_BROKEN",
          playerId: seatIdV7(before, 0),
          unitId: cultist,
          daemonUnitId: id(before, HORROR),
          cause,
        },
      ]);
      expect(result.cult.strands).toEqual([]);
    };
    expectCause(patchUnit(before, CHANNELLER, { hp: 15 }), "HP_LOSS");
    expectCause(patchUnit(before, CHANNELLER, { at: at(4, 6) }), "MOVED");
    expectCause(
      patchUnit(before, CHANNELLER, { ownerId: seatIdV7(before, 1) }),
      "OWNER",
    );
    expectCause(patchUnit(before, CHANNELLER, { form: "EMBARKED" }), "GONE");
    expectCause(
      {
        ...before,
        units: before.units.filter((unit) => unit.id !== cultist),
      },
      "GONE",
    );
    expectCause(patchUnit(before, CHANNELLER, { hp: 0 }), "GONE");
    // Several at once: Hit Points first, then the move, the status, the
    // owner.
    expectCause(
      patchUnit(before, CHANNELLER, { hp: 1, at: at(4, 6) }),
      "HP_LOSS",
    );
    expectCause(
      patchUnit(
        { ...before, frozen: [{ unitId: cultist, turnsLeft: 1 }] },
        CHANNELLER,
        { at: at(4, 6) },
      ),
      "MOVED",
    );
    // Nothing happened: nothing breaks. More Hit Points is no disruption.
    expect(fold(before, before)).toEqual({ cult: before.cult, events: [] });
    expect(
      fold(patchUnit(before, CHANNELLER, { hp: 3 }), before).events,
    ).toEqual([]);
  });

  it("breaks a strand for a new entry in every status list, and for none that was there", () => {
    const before = base();
    const cultist = id(before, CHANNELLER);
    const other = id(before, at(6, 6));
    const withStatus: Record<
      (typeof DISRUPTING_STATUS_LISTS_V7)[number] | "cracked",
      (unitId: number) => object
    > = {
      plagued: (unitId) => ({
        plagued: [{ unitId, sourceUnitId: 1, turnsRemaining: 3 }],
      }),
      bitten: (unitId) => ({
        bitten: [{ unitId, biterPlayerId: 2, biterUnitId: 1 }],
      }),
      frozen: (unitId) => ({ frozen: [{ unitId, turnsLeft: 2 }] }),
      stuck: (unitId) => ({ stuck: [{ unitId, endsLeft: 1 }] }),
      toothache: (unitId) => ({ toothache: [{ unitId, endsLeft: 1 }] }),
      splattedThisTurn: (unitId) => ({ splattedThisTurn: [unitId] }),
      terrorThisTurn: (unitId) => ({ terrorThisTurn: [unitId] }),
      huntedThisTurn: (unitId) => ({ huntedThisTurn: [unitId] }),
      bombedThisTurn: (unitId) => ({ bombedThisTurn: [unitId] }),
      ninthUnit: (unitId) => ({
        ninthUnit: { ...before.ninthUnit, crackedThisTurn: [unitId] },
      }),
      cracked: (unitId) => ({
        ninthUnit: { ...before.ninthUnit, crackedThisTurn: [unitId] },
      }),
    };
    for (const key of DISRUPTING_STATUS_LISTS_V7) {
      const marked = { ...before, ...withStatus[key](cultist) } as GameStateV7;
      expect(fold(before, marked).events, key).toEqual([
        expect.objectContaining({ kind: "STRAND_BROKEN", cause: "STATUS" }),
      ]);
      // A status it already had is none it was given now.
      expect(fold(marked, marked).events, key).toEqual([]);
      // Another unit's status is not its own.
      expect(
        fold(before, { ...before, ...withStatus[key](other) } as GameStateV7)
          .events,
        key,
      ).toEqual([]);
      expect(disruptingStatusKeysV7(marked).size, key).toBe(1);
    }
  });

  it("does not count the acting unit's own change of tile", () => {
    const before = base();
    const cultist = id(before, CHANNELLER);
    const after = patchUnit(before, CHANNELLER, { at: at(4, 6) });
    expect(fold(before, after, cultist).events).toEqual([]);
    expect(fold(before, after, id(before, at(6, 6))).events).toHaveLength(1);
    // Its own command does not excuse a hit it took in it.
    expect(
      fold(before, patchUnit(after, at(4, 6), { hp: 2 }), cultist).events,
    ).toEqual([expect.objectContaining({ cause: "HP_LOSS" })]);
  });

  it("is silent for a strand whose daemon left the board, and skips a seat already checked", () => {
    const before = base();
    const horror = id(before, HORROR);
    const hurt = patchUnit(before, CHANNELLER, { hp: 2 });
    expect(
      fold(before, {
        ...hurt,
        units: hurt.units.filter((unit) => unit.id !== horror),
      }).events,
    ).toEqual([]);
    expect(
      cultDisruptionsV7(before, hurt, null, seatIdV7(before, 0)).events,
    ).toEqual([]);
    // A unit already reported in this command is not reported twice.
    const first = cultDisruptionsV7(before, hurt, null);
    expect(first.events).toHaveLength(1);
    expect(
      cultDisruptionsV7(before, hurt, null, null, first.events).events,
    ).toEqual([]);
  });
});

describe("the disruption rule: every path of the engine", () => {
  for (const entry of PATH_CASES)
    it(`breaks the strand: ${entry.name}`, () => {
      const built = entry.build();
      const where = built.cultist ?? CHANNELLER;
      const cultist = unitAtV7(built.state, where);
      const strand = built.state.cult.strands.find(
        (candidate) => candidate.cultistUnitId === cultist.id,
      );
      expect(strand).toBeDefined();
      const result = run(built.state, built.command);
      const kinds = kindsV7(result.events);
      for (const kind of entry.proves) expect(kinds, kind).toContain(kind);
      expect(broken(result.events)).toEqual([
        {
          kind: "STRAND_BROKEN",
          playerId: seatIdV7(built.state, 0),
          unitId: cultist.id,
          daemonUnitId: need(strand).daemonUnitId,
          cause: entry.cause,
        },
      ]);
      expect(
        entry.proves.flatMap((kind) => DISRUPTION_EVENT_PATHS_V7[kind]),
      ).toContain(entry.cause);
      expect(
        result.state.cult.strands.some(
          (candidate) => candidate.cultistUnitId === cultist.id,
        ),
      ).toBe(false);
      // The break follows what caused it.
      expect(kinds.indexOf("STRAND_BROKEN")).toBeGreaterThan(
        kinds.indexOf(need(entry.proves[0])),
      );
    });

  it("lets the daemon go at the next check: Plague breaks the strand before it", () => {
    const built = need(
      PATH_CASES.find((entry) => entry.proves.includes("PLAGUE_DAMAGED")),
    ).build();
    const result = run(built.state, built.command);
    const kinds = kindsV7(result.events);
    expect(kinds.indexOf("PLAGUE_DAMAGED")).toBeLessThan(
      kinds.indexOf("STRAND_BROKEN"),
    );
    expect(kinds.indexOf("STRAND_BROKEN")).toBeLessThan(
      kinds.indexOf("DAEMON_UNBOUND"),
    );
    expect(
      result.events.find((event) => event.kind === "DAEMON_UNBOUND"),
    ).toMatchObject({ strands: 0, control: 1 });
    // Reported once, though the command's own disruption step runs too.
    expect(broken(result.events)).toHaveLength(1);
  });

  it("keeps a strand through a turn in which nothing happens to the cultist", () => {
    const state = rig("ORIGINAL", [
      { role: "MARKSMAN", at: at(5, 8) },
      { role: "FIGHTER", at: at(1, 1) },
    ]);
    // The enemy moves a unit elsewhere and ends its turn.
    const moved = run(state, {
      kind: "MOVE",
      unitId: id(state, at(1, 1)),
      path: [at(1, 2)],
    });
    expect(broken(moved.events)).toEqual([]);
    const ended = run(moved.state, { kind: "END_TURN" });
    expect(kindsV7(ended.events)).not.toContain("DAEMON_UNBOUND");
    expect(unitAtV7(ended.state, HORROR).summoned).toBe("HORROR");
  });

  it("shows the snap to every viewer who sees the cultist", () => {
    const state = unexploreV7(
      rig("ORIGINAL", [{ role: "MARKSMAN", at: at(5, 8) }]),
      1,
      [HORROR],
    );
    const result = run(state, targeted("ATTACK", state, at(5, 8)));
    for (const seat of [0, 1])
      expect(
        projectEventsV7(
          state,
          result.state,
          seatIdV7(state, seat),
          result.events,
        ).events.map((event) => event.kind),
        `seat ${seat}`,
      ).toContain("STRAND_BROKEN");
    // The enemy's view no longer shows the candle.
    expect(viewForV7(result.state, seatIdV7(state, 1)).cult.strands).toEqual(
      [],
    );
  });
});

describe("the disruption rule: Behold! (section 8.1)", () => {
  const shot = (state: GameStateV7, target: CoordV7) =>
    run(state, targeted("ATTACK", state, at(5, 8), target));

  it("keeps the strand of a cultist beside a raised idol that loses Hit Points", () => {
    const state = warded(
      rig("ORIGINAL", [{ role: "MARKSMAN", at: at(5, 8) }], { own: [WARD] }),
    );
    const result = shot(state, CHANNELLER);
    expect(unitAtV7(result.state, CHANNELLER).hp).toBeLessThan(16);
    expect(broken(result.events)).toEqual([]);
    expect(result.state.cult.strands).toHaveLength(1);
    expect(result.state.cult.idols).toHaveLength(1);
    // Without the idol the same shot breaks it.
    const bare = rig("ORIGINAL", [{ role: "MARKSMAN", at: at(5, 8) }], {
      own: [WARD],
    });
    expect(broken(shot(bare, CHANNELLER).events)).toHaveLength(1);
  });

  it("drops the idol when the Idol Bearer is hit, and the next hit breaks the strand", () => {
    const state = warded(
      rig(
        "ORIGINAL",
        [
          { role: "MARKSMAN", at: at(5, 8) },
          { role: "MARKSMAN", at: at(8, 5) },
        ],
        { own: [WARD] },
      ),
    );
    const first = run(state, targeted("ATTACK", state, at(8, 5), WARD.at));
    expect(
      first.events.filter((event) => event.kind === "IDOL_DROPPED"),
    ).toEqual([
      {
        kind: "IDOL_DROPPED",
        playerId: seatIdV7(state, 0),
        unitId: id(state, WARD.at),
        cause: "HP_LOSS",
      },
    ]);
    expect(first.state.cult.idols).toEqual([]);
    // The strand it warded stays kept...
    expect(first.state.cult.strands).toHaveLength(1);
    // ...until the cultist itself is hit.
    expect(broken(shot(first.state, CHANNELLER).events)).toHaveLength(1);
  });

  it("wards nobody in a command that hits the Idol Bearer too", () => {
    // A Whirligig beside both: one Whirl hits the cultist and the Idol
    // Bearer at once.
    const state = warded(
      rig("DWARF", [{ role: "KNIGHT", at: at(6, 6) }], { own: [WARD] }),
    );
    const result = run(state, unitCommand("WHIRL", state, at(6, 6)));
    expect(broken(result.events)).toHaveLength(1);
    expect(result.state.cult.idols).toEqual([]);
  });

  it("never wards a kill, a cultist two tiles away, an enemy, or the Idol Bearer itself", () => {
    // Killed under the idol: gone is gone.
    const doomed = warded(
      rig("ORIGINAL", [{ role: "KNIGHT", at: at(5, 7) }], {
        own: [WARD],
        role: "FIGHTER",
        hp: 2,
      }),
    );
    expect(
      broken(run(doomed, targeted("ATTACK", doomed, at(5, 7))).events)[0]
        ?.cause,
    ).toBe("GONE");
    // The Idol Bearer two tiles from the cultist wards nothing.
    const far: GoblinPieceV7 = { seat: 0, role: "GUARD", at: at(7, 5) };
    const distant = withIdolsV7(
      rig("ORIGINAL", [{ role: "MARKSMAN", at: at(5, 8) }], { own: [far] }),
      [far.at],
    );
    expect(broken(shot(distant, CHANNELLER).events)).toHaveLength(1);
    // A raised idol does not ward its own bearer's strand.
    const self = withIdolsV7(
      rig("ORIGINAL", [{ role: "MARKSMAN", at: at(5, 8) }]),
      [CHANNELLER],
    );
    const hit = shot(self, CHANNELLER);
    expect(broken(hit.events)).toHaveLength(1);
    expect(hit.state.cult.idols).toEqual([]);
  });
});

describe("the disruption rule: Anchor (section 8.4)", () => {
  const THING: GoblinPieceV7 = { seat: 0, role: "JUGGERNAUT", at: at(6, 6) };
  const gripped = (
    enemy: FactionIdV7,
    pieces: readonly Omit<GoblinPieceV7, "seat">[],
    options: RigOptionsV7 = {},
  ): GameStateV7 =>
    withGripV7(
      rig(enemy, pieces, { ...options, own: [THING, ...(options.own ?? [])] }),
      THING.at,
      CHANNELLER,
    );
  const strands = (state: GameStateV7): number =>
    holdingStrandsV7(state, state.units, unitAtV7(state, HORROR));
  const anchorBroken = (events: readonly DomainEventV7[]) =>
    events.filter((event) => event.kind === "ANCHOR_BROKEN");

  it("loses all three strands to one hit on the gripped cultist", () => {
    const state = gripped("ORIGINAL", [{ role: "MARKSMAN", at: at(5, 8) }]);
    expect(strands(state)).toBe(3);
    const result = run(state, targeted("ATTACK", state, at(5, 8)));
    expect(broken(result.events)).toHaveLength(1);
    // The grip ends with the strand, without an event of its own.
    expect(anchorBroken(result.events)).toEqual([]);
    expect(result.state.cult.grips).toEqual([]);
    expect(strands(result.state)).toBe(0);
  });

  it("never minds the Thing's own Hit Points", () => {
    const state = gripped("ORIGINAL", [{ role: "MARKSMAN", at: at(8, 6) }]);
    const result = run(state, targeted("ATTACK", state, at(8, 6), THING.at));
    expect(unitAtV7(result.state, THING.at).hp).toBeLessThan(40);
    expect(anchorBroken(result.events)).toEqual([]);
    expect(strands(result.state)).toBe(3);
  });

  it("counts one when only the Thing failed: a Frozen Thing's grip is gone", () => {
    const state = gripped("ICE_FOLK", [{ role: "CAPTAIN", at: at(8, 6) }]);
    const result = run(
      state,
      targeted("FROST_BOLT", state, at(8, 6), THING.at),
    );
    expect(anchorBroken(result.events)).toEqual([
      {
        kind: "ANCHOR_BROKEN",
        playerId: seatIdV7(state, 0),
        unitId: id(state, THING.at),
        cultistUnitId: id(state, CHANNELLER),
        cause: "STATUS",
      },
    ]);
    expect(broken(result.events)).toEqual([]);
    expect(strands(result.state)).toBe(1);
  });

  it("fails when the Thing gets a status from its own attack (Toothache)", () => {
    const state = gripped("CANDY", [{ role: "SWORDSMAN", at: at(7, 6) }], {
      activeSeat: 0,
    });
    const result = run(state, targeted("ATTACK", state, THING.at, at(7, 6)));
    expect(kindsV7(result.events)).toContain("TOOTHACHE_GIVEN");
    expect(anchorBroken(result.events)).toEqual([
      expect.objectContaining({ cause: "STATUS" }),
    ]);
    expect(strands(result.state)).toBe(1);
  });

  it("keeps the grip through the Thing's own attack and advance only while it stays beside the cultist", () => {
    // The Thing kills a Fighter on (7, 5) and advances there: it no longer
    // stands next to the cultist on (5, 6), so the strand counts one; the
    // advance was its own, so nothing was broken.
    const state = gripped(
      "ORIGINAL",
      [{ role: "FIGHTER", at: at(7, 5), hp: 1 }],
      { activeSeat: 0 },
    );
    const result = run(state, targeted("ATTACK", state, THING.at, at(7, 5)));
    expect(anchorBroken(result.events)).toEqual([]);
    expect(broken(result.events)).toEqual([]);
    expect(strands(result.state)).toBe(1);
  });
});

describe("the disruption rule: the registry of proofs is honest", () => {
  it("names only real event kinds as unproven, each with a reason", () => {
    for (const [kind, reason] of Object.entries(UNPROVEN_DISRUPTION_PATHS_V7)) {
      expect(DOMAIN_EVENT_KIND_ORDER_V7 as readonly string[]).toContain(kind);
      expect(reason?.length ?? 0, kind).toBeGreaterThan(20);
    }
  });
});
