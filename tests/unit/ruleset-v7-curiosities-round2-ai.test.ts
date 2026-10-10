import { afterEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import { ARMY_PLAY_FACTIONS_V7 } from "../../src/ai/v7-army";
import {
  BIGFOOT_HUNT_MOVE_PRIORITY_V7,
  CAMP_ANSWER_HP_DIVISOR_V7,
  DEFAULT_CURIOSITY_POLICY_OPTIONS_V7,
  GATE_APPROACH_PRIORITY_V7,
  GATE_ROUTE_TURNS_SAVED_V7,
  GATE_TRAVERSE_PRIORITY_V7,
  MONSTER_STEP_AWAY_PRIORITY_V7,
  NEUTRAL_BOUNTY_FOR_POLICY_V7,
  WELL_ARRIVE_PRIORITY_V7,
  WELL_TOSS_COINS_V7,
  WELL_TOSS_PRIORITY_V7,
  curiosityFactsV7,
  planCuriosityErrandsV7,
  setCuriosityPolicyOptionsV7,
  type CuriosityPolicyToolsV7,
} from "../../src/ai/v7-curiosities";
import {
  NEUTRAL_BOUNTIES_V7,
  WELL_TOSS_COST_V7,
  applyCommandV7,
  previewGateV7,
  previewMonsterV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type CuriosityV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type NeutralBreedV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  round2ArenaV7,
  round2UnitAtV7,
  type Round2ArenaOptionsV7,
  type Round2NeutralV7,
  type Round2PieceV7,
} from "../fixtures/v7-round2-arena";

// Map curiosities round 2, the Normal AI (`pulp_wars-737.15`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 33 and 35.3): the camp
// guards, Bigfoot, the Dimensional Gates, and the Wishing Well.
//
// Every test is a small hand-built state on the open 20 x 20 arena of
// `round2ArenaV7`: the viewer (seat 0, player 1) has its capital on
// (9, 15), seat 1 on (12, 4), and there is no village. The viewer's unit
// gets the campaign job of marching on (12, 4), which is the route goal
// the gate tests use. Every army faction is tried on each curiosity.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const key = (tile: CoordV7): string => `${tile.x},${tile.y}`;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
const own = (
  role: Round2PieceV7["role"],
  x: number,
  y: number,
  extra: Partial<Round2PieceV7> = {},
): Round2PieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: Round2PieceV7["role"],
  x: number,
  y: number,
  extra: Partial<Round2PieceV7> = {},
): Round2PieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

afterEach(() => {
  setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
});

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);
const idAt = (state: GameStateV7, tile: CoordV7): UnitId =>
  round2UnitAtV7(state, tile).id;

/** The scored candidates of the viewer's unit on `from`, best first. */
function unitCandidates(
  state: GameStateV7,
  from: CoordV7,
  kind?: CommandV7["kind"],
) {
  const id = idAt(state, from);
  return chooseNormalCommandV7(viewOf(state)).candidates.filter(
    (candidate) =>
      "unitId" in candidate.command &&
      candidate.command.unitId === id &&
      (kind === undefined || candidate.command.kind === kind),
  );
}

/** The ends of the Moves the engine offers the unit on `from`. */
function offeredEnds(state: GameStateV7, from: CoordV7): readonly CoordV7[] {
  const id = idAt(state, from);
  return queryPlayerCommandsV7(viewOf(state))
    .filter((command) => command.kind === "MOVE" && command.unitId === id)
    .map(endOf)
    .filter((end): end is CoordV7 => end !== undefined);
}

/** The ends of the Move candidates of the unit on `from`. */
function candidateEnds(state: GameStateV7, from: CoordV7): readonly CoordV7[] {
  return unitCandidates(state, from, "MOVE")
    .map((candidate) => endOf(candidate.command))
    .filter((end): end is CoordV7 => end !== undefined);
}

/** The offered Move of the unit on `from` that ends on `to`. */
function offeredMove(state: GameStateV7, from: CoordV7, to: CoordV7) {
  const id = idAt(state, from);
  const command = queryPlayerCommandsV7(viewOf(state)).find((candidate) => {
    const end = endOf(candidate);
    return (
      candidate.kind === "MOVE" &&
      candidate.unitId === id &&
      end !== undefined &&
      same(end, to)
    );
  });
  if (command === undefined) throw new Error("Move not offered");
  return command;
}

function apply(state: GameStateV7, command: CommandV7) {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result;
}

const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

/** The viewer's faction with an opponent that allows the camp `without`. */
const pair = (
  faction: FactionIdV7,
  without?: FactionIdV7,
): readonly FactionIdV7[] => [
  faction,
  (["ORIGINAL", "GOBLIN", "DWARF"] as const).find(
    (other) => other !== faction && other !== without,
  ) as FactionIdV7,
];
/** (A Martian seat's Grunt shoots: its melee unit is the Swordsman role.) */
const meleeOf = (faction: FactionIdV7): Round2PieceV7["role"] =>
  faction === "MARTIAN" ? "SWORDSMAN" : "FIGHTER";

const CAMP = at(5, 9);
const BIGFOOT = at(15, 10);
const WELL = at(5, 12);
// The home gate is 4 from the viewer's capital (outside the zone where a
// wave forms) and the far gate 3 from seat 1's capital.
const GATE_HOME = at(5, 17);
const GATE_FAR = at(9, 7);
const GATES: readonly CuriosityV7[] = [
  { kind: "GATE", at: GATE_HOME, partner: GATE_FAR },
  { kind: "GATE", at: GATE_FAR, partner: GATE_HOME },
];
const ENEMY_CAPITAL = at(12, 4);

function saucerArena(
  guards: readonly Round2NeutralV7[],
  pieces: readonly Round2PieceV7[],
  options: Round2ArenaOptionsV7 = {},
): GameStateV7 {
  return round2ArenaV7({
    ...options,
    curiosities: [{ kind: "DOWNED_SAUCER", at: CAMP }],
    neutrals: guards,
    pieces,
  });
}

function graveyardArena(
  zombies: readonly Round2NeutralV7[],
  pieces: readonly Round2PieceV7[],
  options: Round2ArenaOptionsV7 = {},
): GameStateV7 {
  return round2ArenaV7({
    ...options,
    curiosities: [{ kind: "GRAVEYARD", at: CAMP }],
    neutrals: zombies,
    pieces,
  });
}

function bigfootArena(
  pieces: readonly Round2PieceV7[],
  hp?: number,
  options: Round2ArenaOptionsV7 = {},
): GameStateV7 {
  return round2ArenaV7({
    ...options,
    terrain: [{ at: BIGFOOT, terrain: "FOREST" }],
    neutrals: [
      hp === undefined
        ? { breed: "BIGFOOT", home: BIGFOOT }
        : { breed: "BIGFOOT", home: BIGFOOT, hp },
    ],
    pieces,
  });
}

const guard = (
  breed: NeutralBreedV7,
  x: number,
  y: number,
  extra: Partial<Round2NeutralV7> = {},
): Round2NeutralV7 => ({ breed, home: CAMP, at: at(x, y), ...extra });

function neutral(state: GameStateV7, breed: NeutralBreedV7, index = 0) {
  const entry = state.monsters.filter((other) => other.breed === breed)[index];
  if (entry === undefined) throw new Error(`no ${breed}`);
  return entry.unitId;
}

function provokeKeys(state: GameStateV7, unitId: UnitId): ReadonlySet<string> {
  const preview = previewMonsterV7(viewOf(state), unitId);
  if (preview === null) throw new Error("no preview");
  return new Set(preview.provokeTiles.map(key));
}

describe("the published numbers and the facts (section 33)", () => {
  it("reads the published bounties and the toss cost", () => {
    expect(NEUTRAL_BOUNTY_FOR_POLICY_V7).toEqual(NEUTRAL_BOUNTIES_V7);
    expect(WELL_TOSS_COINS_V7).toBeGreaterThanOrEqual(WELL_TOSS_COST_V7);
    expect(GATE_ROUTE_TURNS_SAVED_V7).toBe(3);
    expect(CAMP_ANSWER_HP_DIVISOR_V7).toBe(2);
  });

  it("takes a guard's tiles from the engine preview", () => {
    // A Grunt in the saucer's corner: the perimeter is 25 tiles, and its
    // reach (two tiles, after one step) leaves part of it out.
    const state = saucerArena([guard("GRUNT", 3, 7)], [own("FIGHTER", 9, 10)]);
    const view = viewOf(state);
    const grunt = neutral(state, "GRUNT");
    const preview = previewMonsterV7(view, grunt);
    const facts = curiosityFactsV7(view)?.monsterById.get(grunt);
    expect(facts?.breed).toBe("GRUNT");
    expect(facts?.bounty).toBe(NEUTRAL_BOUNTIES_V7.GRUNT);
    expect(facts?.regeneration).toBe(0);
    expect([...(facts?.provokeKeys ?? [])].sort()).toEqual(
      (preview?.provokeTiles ?? []).map((tile) => `${tile.y},${tile.x}`).sort(),
    );
    expect(facts?.avoidKeys).toBe(facts?.provokeKeys);
    const reach = new Set(
      (preview?.reachTiles ?? []).map((tile) => `${tile.y},${tile.x}`),
    );
    expect([...(facts?.threatKeys ?? [])].sort()).toEqual(
      [...(facts?.provokeKeys ?? [])].filter((tile) => reach.has(tile)).sort(),
    );
    expect(facts?.threatKeys.size).toBeLessThan(facts?.provokeKeys.size ?? 0);
  });

  it("closes no tile around Bigfoot and counts no threat from it", () => {
    const state = bigfootArena([own("FIGHTER", 11, 10)]);
    const view = viewOf(state);
    const bigfoot = neutral(state, "BIGFOOT");
    // The engine's provoke tiles of Bigfoot are the 48 where it flees.
    expect(previewMonsterV7(view, bigfoot)?.provokeTiles).toHaveLength(48);
    const facts = curiosityFactsV7(view)?.monsterById.get(bigfoot);
    expect(facts?.avoidKeys.size).toBe(0);
    expect(facts?.threatKeys.size).toBe(0);
    expect(facts?.provokedBy.size).toBe(0);
    expect(facts?.bounty).toBe(NEUTRAL_BOUNTIES_V7.BIGFOOT);
  });

  it("knows where each gate leads and the Well's state", () => {
    const state = round2ArenaV7({
      curiosities: [...GATES, { kind: "WISHING_WELL", at: WELL, tossedBy: [] }],
      pieces: [own("FIGHTER", 9, 13)],
    });
    const facts = curiosityFactsV7(viewOf(state));
    expect(facts?.gates).toEqual([
      { at: GATE_FAR, exit: GATE_HOME },
      { at: GATE_HOME, exit: GATE_FAR },
    ]);
    expect(facts?.wells).toEqual([{ at: WELL, tossed: false }]);
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(curiosityFactsV7(viewOf(state))).toBeNull();
  });
});

describe("camps: routine Moves and the step out (section 33)", () => {
  it.each(ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "MARTIAN"))(
    "ends no routine Move of a %s seat on a Downed Saucer's provoke tiles",
    (faction) => {
      const melee = meleeOf(faction);
      const options = { factions: pair(faction, "MARTIAN") };
      const state = saucerArena(
        [guard("GRUNT", 5, 8)],
        [own(melee, 8, 9)],
        options,
      );
      const closed = provokeKeys(state, neutral(state, "GRUNT"));
      expect(closed.size).toBe(25);
      expect(
        offeredEnds(state, at(8, 9)).some((end) => closed.has(key(end))),
      ).toBe(true);
      const ends = candidateEnds(state, at(8, 9));
      expect(ends.length).toBeGreaterThan(0);
      expect(ends.some((end) => closed.has(key(end)))).toBe(false);
      // Inside the perimeter with no attack to make: it steps out.
      const inside = saucerArena(
        [guard("GRUNT", 5, 8)],
        [own(melee, 7, 10)],
        options,
      );
      const best = unitCandidates(inside, at(7, 10))[0];
      expect(best?.command.kind).toBe("MOVE");
      expect(best?.score.priority).toBe(MONSTER_STEP_AWAY_PRIORITY_V7);
      const end = best === undefined ? undefined : endOf(best.command);
      expect(end !== undefined && !closed.has(key(end))).toBe(true);
      expect(
        unitCandidates(inside, at(7, 10)).some(
          (candidate) => candidate.command.kind === "ATTACK",
        ),
      ).toBe(false);
    },
  );

  it.each(ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "UNDEAD"))(
    "ends no routine Move of a %s seat inside a Graveyard Zombie's reach",
    (faction) => {
      const melee = meleeOf(faction);
      const options = { factions: pair(faction, "UNDEAD") };
      const state = graveyardArena(
        [guard("ZOMBIE", 5, 8), guard("ZOMBIE", 4, 10)],
        [own(melee, 8, 8)],
        options,
      );
      const closed = new Set([
        ...provokeKeys(state, neutral(state, "ZOMBIE", 0)),
        ...provokeKeys(state, neutral(state, "ZOMBIE", 1)),
      ]);
      expect(
        offeredEnds(state, at(8, 8)).some((end) => closed.has(key(end))),
      ).toBe(true);
      const ends = candidateEnds(state, at(8, 8));
      expect(ends.length).toBeGreaterThan(0);
      expect(ends.some((end) => closed.has(key(end)))).toBe(false);
      // Next to a Zombie with no kill to make: it steps out of their reach.
      const inside = graveyardArena(
        [guard("ZOMBIE", 5, 8), guard("ZOMBIE", 4, 10)],
        [own(melee, 6, 7)],
        options,
      );
      // (The unit stands on a tile a Zombie could step to, so the reach is
      // read again on this board.)
      const reach = new Set([
        ...provokeKeys(inside, neutral(inside, "ZOMBIE", 0)),
        ...provokeKeys(inside, neutral(inside, "ZOMBIE", 1)),
      ]);
      expect(reach.has(key(at(6, 7)))).toBe(true);
      const moves = unitCandidates(inside, at(6, 7), "MOVE");
      expect(moves[0]?.score.priority).toBe(MONSTER_STEP_AWAY_PRIORITY_V7);
      const end = moves[0] === undefined ? undefined : endOf(moves[0].command);
      expect(end !== undefined && !reach.has(key(end))).toBe(true);
    },
  );

  it("walks into a camp whose guards are dead", () => {
    // The cleared camp is scenery: no guard, no closed tile. The march on
    // (12, 4) from (4, 11) goes through it.
    const state = saucerArena([], [own("FIGHTER", 4, 11)]);
    expect(
      candidateEnds(state, at(4, 11)).some((end) => chebyshev(end, CAMP) <= 1),
    ).toBe(true);
    const guarded = saucerArena(
      [guard("SHIELD_PROJECTOR", 6, 8)],
      [own("FIGHTER", 4, 11)],
    );
    expect(
      candidateEnds(guarded, at(4, 11)).some(
        (end) => chebyshev(end, CAMP) <= 2,
      ),
    ).toBe(false);
  });
});

describe("camps: the threat estimate (section 33, Threat)", () => {
  const safety = (state: GameStateV7, from: CoordV7, to: CoordV7): number =>
    scoreCommandV7(viewOf(state), offeredMove(state, from, to)).safetyValue;

  it("counts a guard on its provoke tiles within its reach only", () => {
    // The Grunt on (3, 7) reaches x <= 6 and y <= 10 (two tiles, after one
    // step). (7, 10) is on the perimeter and out of its reach; (6, 10) is
    // on the perimeter and inside it.
    const state = saucerArena(
      [guard("GRUNT", 3, 7)],
      [own("FIGHTER", 8, 10), own("FIGHTER", 6, 11)],
    );
    const grunt = neutral(state, "GRUNT");
    const preview = previewMonsterV7(viewOf(state), grunt);
    const has = (tiles: readonly CoordV7[] | undefined, tile: CoordV7) =>
      (tiles ?? []).some((other) => same(other, tile));
    expect(has(preview?.provokeTiles, at(7, 10))).toBe(true);
    expect(has(preview?.reachTiles, at(7, 10))).toBe(false);
    expect(has(preview?.provokeTiles, at(6, 10))).toBe(true);
    expect(has(preview?.reachTiles, at(6, 10))).toBe(true);
    expect(safety(state, at(8, 10), at(7, 10))).toBe(0);
    expect(safety(state, at(6, 11), at(6, 10))).toBeLessThan(0);
    // Outside the perimeter and not next to a guard, unprovoked: no threat,
    // though the Grunt on (7, 9) reaches (9, 10).
    const outside = saucerArena(
      [guard("GRUNT", 7, 9)],
      [own("FIGHTER", 10, 10)],
    );
    const far = previewMonsterV7(viewOf(outside), neutral(outside, "GRUNT"));
    expect(has(far?.reachTiles, at(9, 10))).toBe(true);
    expect(has(far?.provokeTiles, at(9, 10))).toBe(false);
    expect(safety(outside, at(10, 10), at(9, 10))).toBe(0);
  });

  it("counts a guard for a unit that hurt its camp, inside its reach", () => {
    // The Catapult hurt the Shield Projector; the Grunt of the same camp
    // reaches (9, 10), outside the perimeter, and not (11, 10).
    const state = saucerArena(
      [
        guard("GRUNT", 7, 9),
        guard("SHIELD_PROJECTOR", 4, 8, { provokedBy: [0] }),
      ],
      [own("CATAPULT", 10, 10)],
    );
    expect(safety(state, at(10, 10), at(9, 10))).toBeLessThan(0);
    expect(safety(state, at(10, 10), at(11, 10))).toBe(0);
  });

  it("counts nothing next to Bigfoot", () => {
    const state = bigfootArena([own("FIGHTER", 13, 10)]);
    expect(safety(state, at(13, 10), at(14, 10))).toBe(0);
  });
});

describe("camps: attacks (section 33, avoid unless strong)", () => {
  const attacksOn = (state: GameStateV7, target: UnitId) =>
    chooseNormalCommandV7(viewOf(state)).candidates.filter(
      (candidate) =>
        candidate.command.kind === "ATTACK" &&
        candidate.command.targetUnitId === target,
    );
  const intoCamp = (state: GameStateV7, from: CoordV7) =>
    candidateEnds(state, from).filter((end) => chebyshev(end, CAMP) <= 2);

  it("shoots a guard from outside every guard's reach, and not from inside one", () => {
    // The Catapult is 3 from the Shield Projector, which reaches 2.
    const safe = saucerArena(
      [guard("SHIELD_PROJECTOR", 6, 9)],
      [own("CATAPULT", 9, 9)],
    );
    const projector = neutral(safe, "SHIELD_PROJECTOR");
    expect(
      queryCombatPreviewV7(viewOf(safe), idAt(safe, at(9, 9)), projector)
        ?.monsterRetaliates,
    ).toBe(false);
    expect(attacksOn(safe, projector)).toHaveLength(1);
    expect(unitCandidates(safe, at(9, 9))[0]?.command.kind).toBe("ATTACK");
    // A Grunt reaches 3: the same shot would be answered.
    const answered = saucerArena(
      [guard("GRUNT", 6, 9)],
      [own("CATAPULT", 9, 9)],
    );
    const grunt = neutral(answered, "GRUNT");
    expect(
      queryCombatPreviewV7(viewOf(answered), idAt(answered, at(9, 9)), grunt)
        ?.monsterRetaliates,
    ).toBe(true);
    expect(attacksOn(answered, grunt)).toEqual([]);
    // And the Grunt beside the Projector answers for it.
    const camp = saucerArena(
      [guard("SHIELD_PROJECTOR", 6, 9), guard("GRUNT", 6, 10)],
      [own("CATAPULT", 9, 9)],
    );
    expect(attacksOn(camp, neutral(camp, "SHIELD_PROJECTOR"))).toEqual([]);
    // With a seat's unit to shoot, the guard is left alone.
    const busy = saucerArena(
      [guard("SHIELD_PROJECTOR", 6, 9)],
      [own("CATAPULT", 9, 9), foe("FIGHTER", 11, 7)],
    );
    expect(attacksOn(busy, neutral(busy, "SHIELD_PROJECTOR"))).toEqual([]);
  });

  it("kills a lone guard with a Knight, and is paid its bounty", () => {
    // A Knight kills a Grunt outright (section 25.2): the plan's Move ends
    // inside the perimeter, next to the Grunt.
    const state = saucerArena([guard("GRUNT", 5, 8)], [own("KNIGHT", 9, 9)]);
    const grunt = neutral(state, "GRUNT");
    const move = unitCandidates(state, at(9, 9))[0];
    expect(move?.command.kind).toBe("MOVE");
    const end = move === undefined ? undefined : endOf(move.command);
    expect(end !== undefined && chebyshev(end, at(5, 8)) === 1).toBe(true);
    expect(intoCamp(state, at(9, 9))).toEqual([end]);
    const moved = apply(state, move?.command as CommandV7);
    const strike = unitCandidates(moved.state, end as CoordV7)[0];
    expect(strike?.command).toMatchObject({
      kind: "ATTACK",
      targetUnitId: grunt,
    });
    // The kill is worth the Grunt's bounty on top of the ordinary value.
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    const plain = scoreCommandV7(
      viewOf(moved.state),
      strike?.command as CommandV7,
    );
    setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
    expect((strike?.score.strategicValue ?? 0) - plain.strategicValue).toBe(
      NEUTRAL_BOUNTIES_V7.GRUNT,
    );
    const struck = apply(moved.state, strike?.command as CommandV7);
    expect(struck.state.monsters).toEqual([]);
    expect(eventsOf(struck.events, "MONSTER_BOUNTY_AWARDED")).toEqual([
      expect.objectContaining({ coins: NEUTRAL_BOUNTIES_V7.GRUNT }),
    ]);
  });

  it("does not move in on a healthy guard it cannot kill", () => {
    const state = saucerArena([guard("GRUNT", 5, 8)], [own("FIGHTER", 8, 9)]);
    expect(intoCamp(state, at(8, 9))).toEqual([]);
    const zombies = graveyardArena(
      [guard("ZOMBIE", 5, 8), guard("ZOMBIE", 4, 10)],
      [own("KNIGHT", 9, 9)],
    );
    expect(intoCamp(zombies, at(9, 9))).toEqual([]);
  });

  it("leaves a camp whose answer is too strong, and clears it with enough force", () => {
    // Two Grunts with a Shield Projector between them. One Knight (13 HP)
    // kills a Grunt, and the other Grunt and the Projector would then deal
    // it 6 and 3, more than half its HP: no plan.
    const guards = [
      guard("GRUNT", 6, 8),
      guard("GRUNT", 6, 10),
      guard("SHIELD_PROJECTOR", 6, 9),
    ];
    const alone = saucerArena(guards, [own("KNIGHT", 9, 8)]);
    expect(intoCamp(alone, at(9, 8))).toEqual([]);
    // Two Knights kill both Grunts this turn; the Projector's answer alone
    // is small. Each Knight has its own tile.
    const two = saucerArena(guards, [
      own("KNIGHT", 9, 8),
      own("KNIGHT", 9, 10),
    ]);
    const first = intoCamp(two, at(9, 8));
    const second = intoCamp(two, at(9, 10));
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]).not.toEqual(second[0]);
    // One Knight against the two Grunts alone goes: the other Grunt's 6 is
    // less than half its HP.
    const pairOfGrunts = saucerArena(guards.slice(0, 2), [own("KNIGHT", 9, 8)]);
    expect(intoCamp(pairOfGrunts, at(9, 8))).toHaveLength(1);
  });

  it.each(ARMY_PLAY_FACTIONS_V7)(
    "moves a %s seat's melee unit in for the kill of a guard",
    (faction) => {
      // A 1-HP guard two tiles away: a Grunt of a saucer, or (a Martian
      // seat never meets a saucer) a Zombie of a graveyard.
      const melee = meleeOf(faction);
      const saucer = faction !== "MARTIAN";
      const breed = saucer ? "GRUNT" : "ZOMBIE";
      const options = {
        factions: pair(faction, saucer ? "MARTIAN" : "UNDEAD"),
      };
      const guards = [guard(breed, 5, 8, { hp: 1 })];
      const pieces = [own(melee, 7, 8)];
      const state = saucer
        ? saucerArena(guards, pieces, options)
        : graveyardArena(guards, pieces, options);
      const move = unitCandidates(state, at(7, 8))[0];
      expect(move?.command.kind).toBe("MOVE");
      const end = move === undefined ? undefined : endOf(move.command);
      expect(end !== undefined && chebyshev(end, at(5, 8)) === 1).toBe(true);
      const moved = apply(state, move?.command as CommandV7);
      const strike = unitCandidates(moved.state, end as CoordV7)[0];
      expect(strike?.command.kind).toBe("ATTACK");
      const struck = apply(moved.state, strike?.command as CommandV7);
      expect(struck.state.monsters).toEqual([]);
      expect(eventsOf(struck.events, "MONSTER_BOUNTY_AWARDED")).toEqual([
        expect.objectContaining({ coins: NEUTRAL_BOUNTIES_V7[breed] }),
      ]);
    },
  );
});

describe("Bigfoot: opportunistic (section 33)", () => {
  const attacksOnBigfoot = (state: GameStateV7) => {
    const bigfoot = neutral(state, "BIGFOOT");
    return chooseNormalCommandV7(viewOf(state)).candidates.filter(
      (candidate) =>
        candidate.command.kind === "ATTACK" &&
        candidate.command.targetUnitId === bigfoot,
    );
  };

  it("makes no Move toward a healthy Bigfoot, and closes no tile for it", () => {
    const state = bigfootArena([own("FIGHTER", 13, 10)]);
    const without = round2ArenaV7({
      terrain: [{ at: BIGFOOT, terrain: "FOREST" }],
      pieces: [own("FIGHTER", 13, 10)],
    });
    const scores = (arena: GameStateV7) =>
      unitCandidates(arena, at(13, 10), "MOVE").map((candidate) => [
        endOf(candidate.command),
        candidate.score.priority,
        candidate.score.strategicValue,
        candidate.score.safetyValue,
      ]);
    // The Moves of the unit are those of the same board without Bigfoot.
    expect(scores(state)).toEqual(scores(without));
    expect(
      candidateEnds(state, at(13, 10)).some(
        (end) => chebyshev(end, BIGFOOT) <= 3,
      ),
    ).toBe(true);
  });

  it("strikes Bigfoot with a unit that has it on offer and no seat's unit", () => {
    const beside = bigfootArena([own("FIGHTER", 14, 10)]);
    expect(attacksOnBigfoot(beside)).toHaveLength(1);
    expect(unitCandidates(beside, at(14, 10))[0]?.command.kind).toBe("ATTACK");
    // With a seat's unit to strike it has no attack on Bigfoot, kill or not.
    const busy = bigfootArena(
      [own("FIGHTER", 14, 10), foe("FIGHTER", 13, 10)],
      1,
    );
    const offered = queryPlayerCommandsV7(viewOf(busy)).filter(
      (command) =>
        command.kind === "ATTACK" &&
        command.targetUnitId === neutral(busy, "BIGFOOT"),
    );
    expect(offered).toHaveLength(1);
    expect(attacksOnBigfoot(busy)).toEqual([]);
    expect(unitCandidates(busy, at(14, 10))[0]?.command).toMatchObject({
      kind: "ATTACK",
      targetUnitId: idAt(busy, at(13, 10)),
    });
  });

  it("does not send a unit that has a seat's unit to strike after Bigfoot", () => {
    // Two tiles from a 1-HP Bigfoot and next to an enemy: no hunt Move.
    const state = bigfootArena(
      [own("FIGHTER", 13, 10), foe("FIGHTER", 12, 10)],
      1,
    );
    expect(
      unitCandidates(state, at(13, 10), "MOVE").some(
        (candidate) =>
          candidate.score.priority === BIGFOOT_HUNT_MOVE_PRIORITY_V7,
      ),
    ).toBe(false);
  });

  it.each(ARMY_PLAY_FACTIONS_V7)(
    "takes the kill of a 1-HP Bigfoot with a %s seat's unit, just above a routine Move",
    (faction) => {
      const melee = meleeOf(faction);
      const state = bigfootArena([own(melee, 13, 10)], 1, {
        factions: pair(faction),
      });
      const move = unitCandidates(state, at(13, 10))[0];
      expect(move?.command.kind).toBe("MOVE");
      expect(move?.score.priority).toBe(BIGFOOT_HUNT_MOVE_PRIORITY_V7);
      const end = move === undefined ? undefined : endOf(move.command);
      expect(end !== undefined && chebyshev(end, BIGFOOT) === 1).toBe(true);
      const moved = apply(state, move?.command as CommandV7);
      const strike = unitCandidates(moved.state, end as CoordV7)[0];
      expect(strike?.command.kind).toBe("ATTACK");
      const struck = apply(moved.state, strike?.command as CommandV7);
      expect(struck.state.monsters).toEqual([]);
      expect(eventsOf(struck.events, "MONSTER_BOUNTY_AWARDED")).toEqual([
        expect.objectContaining({ coins: NEUTRAL_BOUNTIES_V7.BIGFOOT }),
      ]);
    },
  );
});

describe("the Dimensional Gates (section 33)", () => {
  const gateArena = (
    pieces: readonly Round2PieceV7[],
    options: Round2ArenaOptionsV7 = {},
  ): GameStateV7 =>
    round2ArenaV7({
      ...options,
      curiosities: [...GATES, ...(options.curiosities ?? [])],
      pieces,
    });
  const ontoGate = (state: GameStateV7, from: CoordV7) =>
    unitCandidates(state, from, "MOVE").filter((candidate) => {
      const end = endOf(candidate.command);
      return end !== undefined && (same(end, GATE_HOME) || same(end, GATE_FAR));
    });

  it.each(ARMY_PLAY_FACTIONS_V7)(
    "sends a %s seat's unit through the gate that shortens its march",
    (faction) => {
      // (6, 17) is 13 steps from the enemy capital by land, and 1 + 3
      // through the gates.
      const state = gateArena([own(meleeOf(faction), 6, 17)], {
        factions: pair(faction),
      });
      const best = unitCandidates(state, at(6, 17))[0];
      expect(best?.command.kind).toBe("MOVE");
      expect(best === undefined ? undefined : endOf(best.command)).toEqual(
        GATE_HOME,
      );
      expect(best?.score.priority).toBe(GATE_TRAVERSE_PRIORITY_V7);
      // The policy's exit is the engine preview's, and the engine's result.
      const unit = idAt(state, at(6, 17));
      expect(previewGateV7(viewOf(state), unit, GATE_HOME)).toMatchObject({
        exit: GATE_FAR,
        displaces: null,
        blocked: false,
      });
      const moved = apply(state, best?.command as CommandV7);
      expect(eventsOf(moved.events, "GATE_TRAVERSED")).toEqual([
        expect.objectContaining({
          unitId: unit,
          from: GATE_HOME,
          to: GATE_FAR,
        }),
      ]);
      expect(idAt(moved.state, GATE_FAR)).toBe(unit);
      // On the exit it has no errand back through the gate.
      expect(ontoGate(moved.state, GATE_FAR)).toEqual([]);
    },
  );

  it("walks toward the gate from farther away", () => {
    // Three steps from the gate: 3 + 3 turns against 13.
    const state = gateArena([own("FIGHTER", 5, 14)]);
    const best = unitCandidates(state, at(5, 14), "MOVE")[0];
    expect(best?.score.priority).toBe(GATE_APPROACH_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end !== undefined && chebyshev(end, GATE_HOME)).toBe(2);
  });

  it("never steps onto a gate that does not shorten the march", () => {
    // Next to the far gate, four steps from the enemy capital: the gate is
    // an offered Move and no candidate.
    const state = gateArena([own("FIGHTER", 10, 8)]);
    expect(
      offeredEnds(state, at(10, 8)).some((end) => same(end, GATE_FAR)),
    ).toBe(true);
    expect(ontoGate(state, at(10, 8))).toEqual([]);
    expect(candidateEnds(state, at(10, 8)).length).toBeGreaterThan(0);
  });

  it("does not traverse onto an own unit, and waits by the gate", () => {
    const state = gateArena([own("FIGHTER", 6, 17), own("FIGHTER", 9, 7)]);
    expect(
      offeredEnds(state, at(6, 17)).some((end) => same(end, GATE_HOME)),
    ).toBe(true);
    expect(
      previewGateV7(viewOf(state), idAt(state, at(6, 17)), GATE_HOME),
    ).toMatchObject({ displaces: idAt(state, GATE_FAR), blocked: false });
    expect(ontoGate(state, at(6, 17))).toEqual([]);
    // No routine Move takes it away from the gate.
    const ends = candidateEnds(state, at(6, 17));
    expect(ends.every((end) => chebyshev(end, GATE_HOME) <= 1)).toBe(true);
    // The unit on the exit is not sent back through it.
    expect(ontoGate(state, GATE_FAR)).toEqual([]);
  });

  it("shoves an enemy off the exit, as the gate preview says", () => {
    const state = gateArena([own("FIGHTER", 6, 17), foe("FIGHTER", 9, 7)]);
    const unit = idAt(state, at(6, 17));
    const enemy = idAt(state, GATE_FAR);
    const preview = previewGateV7(viewOf(state), unit, GATE_HOME);
    expect(preview).toMatchObject({
      exit: GATE_FAR,
      displaces: enemy,
      displaceTo: at(9, 6),
      blocked: false,
    });
    const traverse = ontoGate(state, at(6, 17));
    expect(traverse).toHaveLength(1);
    expect(traverse[0]?.score.priority).toBe(GATE_TRAVERSE_PRIORITY_V7);
    // The danger is counted on the exit, where the enemy can strike it.
    expect(traverse[0]?.score.safetyValue).toBeLessThan(0);
    const moved = apply(state, traverse[0]?.command as CommandV7);
    expect(eventsOf(moved.events, "GATE_DISPLACED")).toEqual([
      expect.objectContaining({ unitId: enemy, from: GATE_FAR, to: at(9, 6) }),
    ]);
    expect(idAt(moved.state, GATE_FAR)).toBe(unit);
    expect(idAt(moved.state, at(9, 6))).toBe(enemy);
  });

  it("does not traverse into a death at the exit", () => {
    // Two Knights beside the far gate would kill the wounded Fighter there.
    const state = gateArena([
      own("FIGHTER", 6, 17, { hp: 9 }),
      foe("KNIGHT", 10, 7),
      foe("KNIGHT", 8, 7),
    ]);
    expect(ontoGate(state, at(6, 17))).toEqual([]);
    // A Fighter that reaches it there does not kill it: it goes through.
    const survives = gateArena([
      own("FIGHTER", 6, 17, { hp: 9 }),
      foe("FIGHTER", 11, 7),
    ]);
    expect(ontoGate(survives, at(6, 17))).toHaveLength(1);
  });

  it("does not traverse onto an exit inside a camp's provoke tiles", () => {
    // (The generator keeps a camp 5 from a gate; the rule is tested on a
    // hand-built board with a saucer two tiles from the far gate.)
    const state = round2ArenaV7({
      curiosities: [...GATES, { kind: "DOWNED_SAUCER", at: at(7, 8) }],
      neutrals: [{ breed: "GRUNT", home: at(7, 8), at: at(6, 9) }],
      pieces: [own("FIGHTER", 6, 17)],
    });
    expect(provokeKeys(state, neutral(state, "GRUNT")).has(key(GATE_FAR))).toBe(
      true,
    );
    expect(ontoGate(state, at(6, 17))).toEqual([]);
  });

  describe("the route choice (`planCuriosityErrandsV7`)", () => {
    // The planner with a hand-made route goal: `direct` steps from the
    // unit, `onward` steps from the far gate.
    const tools = (
      view: PlayerViewV7,
      direct: number | undefined,
      onward: number | undefined,
      extra: Partial<CuriosityPolicyToolsV7> = {},
    ): CuriosityPolicyToolsV7 => {
      const facts = curiosityFactsV7(view);
      if (facts === null) throw new Error("no curiosity facts");
      return {
        view,
        facts,
        move: () => 1,
        construct: () => false,
        grows: () => false,
        captures: () => false,
        danger: () => 0,
        navalDanger: false,
        goal: () => ({
          at: ENEMY_CAPITAL,
          steps: (from) =>
            same(from, GATE_FAR)
              ? onward
              : same(from, GATE_HOME)
                ? undefined
                : direct,
        }),
        ...extra,
      };
    };
    // The unit is two steps from the home gate.
    const state = gateArena([own("FIGHTER", 7, 17)]);
    const view = viewOf(state);
    const unit = idAt(state, at(7, 17));

    it("counts the gate route when it saves three turns or more", () => {
      // 2 + 3 turns through the gate: 8 turns by land saves 3, 7 saves 2.
      const errand = planCuriosityErrandsV7(tools(view, 8, 3)).get(unit);
      expect(errand).toMatchObject({
        kind: "GATE",
        at: GATE_HOME,
        held: false,
      });
      expect(errand?.gate).toEqual(previewGateV7(view, unit, GATE_HOME));
      expect(planCuriosityErrandsV7(tools(view, 7, 3)).size).toBe(0);
      // A faster unit counts turns, not steps: Move 3 makes it 1 + 1
      // turns against 3.
      expect(
        planCuriosityErrandsV7(tools(view, 8, 3, { move: () => 3 })).size,
      ).toBe(0);
      expect(
        planCuriosityErrandsV7(tools(view, 13, 3, { move: () => 3 })).size,
      ).toBe(1);
    });

    it("takes the gate when it is the only route, and never without a goal", () => {
      expect(planCuriosityErrandsV7(tools(view, undefined, 3)).size).toBe(1);
      expect(planCuriosityErrandsV7(tools(view, 20, undefined)).size).toBe(0);
      expect(
        planCuriosityErrandsV7(tools(view, 20, 3, { goal: () => null })).size,
      ).toBe(0);
      // Nor into a death at the exit.
      expect(
        planCuriosityErrandsV7(tools(view, 20, 3, { danger: () => 99 })).size,
      ).toBe(0);
    });
  });
});

describe("the Wishing Well (section 33)", () => {
  const well = (tossedBy: readonly number[] = []): CuriosityV7 =>
    ({ kind: "WISHING_WELL", at: WELL, tossedBy }) as CuriosityV7;
  const wellArena = (
    pieces: readonly Round2PieceV7[],
    options: Round2ArenaOptionsV7 = {},
    tossedBy: readonly number[] = [],
  ): GameStateV7 =>
    round2ArenaV7({ ...options, curiosities: [well(tossedBy)], pieces });
  const wellMoves = (state: GameStateV7) =>
    chooseNormalCommandV7(viewOf(state)).candidates.filter((candidate) => {
      const end = endOf(candidate.command);
      return (
        end !== undefined &&
        same(end, WELL) &&
        candidate.score.priority === WELL_ARRIVE_PRIORITY_V7
      );
    });
  const tosses = (state: GameStateV7) =>
    chooseNormalCommandV7(viewOf(state)).candidates.filter(
      (candidate) => candidate.command.kind === "TOSS_COIN",
    );

  it.each(ARMY_PLAY_FACTIONS_V7)(
    "walks a %s seat's unit onto the Well and tosses once",
    (faction) => {
      const state = wellArena([own(meleeOf(faction), 6, 12)], {
        factions: pair(faction),
      });
      const move = unitCandidates(state, at(6, 12))[0];
      expect(move?.command.kind).toBe("MOVE");
      expect(move === undefined ? undefined : endOf(move.command)).toEqual(
        WELL,
      );
      expect(move?.score.priority).toBe(WELL_ARRIVE_PRIORITY_V7);
      const moved = apply(state, move?.command as CommandV7);
      const toss = unitCandidates(moved.state, WELL)[0];
      expect(toss?.command.kind).toBe("TOSS_COIN");
      expect(toss?.score.priority).toBe(WELL_TOSS_PRIORITY_V7);
      const tossed = apply(moved.state, toss?.command as CommandV7);
      expect(eventsOf(tossed.events, "COIN_TOSSED")).toHaveLength(1);
      // Once: the seat has tossed, and no second unit is sent.
      const again = round2ArenaV7({
        factions: pair(faction),
        curiosities: tossed.state.curiosities,
        pieces: [own(meleeOf(faction), 6, 12)],
      });
      expect(curiosityFactsV7(viewOf(again))?.wells).toEqual([
        { at: WELL, tossed: true },
      ]);
      expect(wellMoves(again)).toEqual([]);
      expect(tosses(tossed.state)).toEqual([]);
    },
  );

  it("keeps its Coins below three, and needs the Well within this turn's Move", () => {
    const poor = wellArena([own("FIGHTER", 6, 12)], {
      coins: WELL_TOSS_COINS_V7 - 1,
    });
    expect(wellMoves(poor)).toEqual([]);
    const onIt = wellArena([own("FIGHTER", 5, 12)], {
      coins: WELL_TOSS_COINS_V7 - 1,
    });
    expect(
      queryPlayerCommandsV7(viewOf(onIt)).some(
        (command) => command.kind === "TOSS_COIN",
      ),
    ).toBe(true);
    expect(tosses(onIt)).toEqual([]);
    const enough = wellArena([own("FIGHTER", 5, 12)], {
      coins: WELL_TOSS_COINS_V7,
    });
    expect(tosses(enough)).toHaveLength(1);
    // Two steps away with Move 1: no errand.
    const far = wellArena([own("FIGHTER", 7, 12)]);
    expect(wellMoves(far)).toEqual([]);
    // Another seat's toss does not count as the viewer's.
    const theirs = wellArena([own("FIGHTER", 6, 12)], {}, [2]);
    expect(wellMoves(theirs)).toHaveLength(1);
  });

  it("prefers a unit at half HP or less, then the lower unit ID", () => {
    const state = wellArena([
      own("FIGHTER", 6, 12),
      own("FIGHTER", 4, 12, { hp: 6 }),
    ]);
    const moves = wellMoves(state);
    expect(moves).toHaveLength(1);
    expect(moves[0]?.command).toMatchObject({
      unitId: idAt(state, at(4, 12)),
    });
    const even = wellArena([own("FIGHTER", 6, 12), own("FIGHTER", 4, 12)]);
    const first = wellMoves(even);
    expect(first).toHaveLength(1);
    expect(first[0]?.command).toMatchObject({ unitId: idAt(even, at(6, 12)) });
  });

  it("sends no unit that has a seat's unit to strike, and no unit to its death", () => {
    const busy = wellArena([own("FIGHTER", 6, 12), foe("FIGHTER", 7, 12)]);
    expect(wellMoves(busy)).toEqual([]);
    // Two Knights that reach the Well would kill the wounded Fighter there.
    const deadly = wellArena([
      own("FIGHTER", 6, 12, { hp: 4 }),
      foe("KNIGHT", 2, 10),
      foe("KNIGHT", 2, 14),
    ]);
    expect(wellMoves(deadly)).toEqual([]);
    // An enemy on the Well: it is not free.
    const taken = wellArena([own("FIGHTER", 7, 12), foe("FIGHTER", 5, 12)]);
    expect(wellMoves(taken)).toEqual([]);
  });
});
