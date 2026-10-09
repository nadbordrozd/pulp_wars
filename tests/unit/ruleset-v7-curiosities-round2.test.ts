import { describe, expect, it } from "vitest";
import {
  NEUTRAL_BOUNTIES_V7,
  NEUTRAL_BREEDS_V7,
  NEUTRAL_KIND_V7,
  NEUTRAL_ROLE_RULES_V7,
  WELL_OUTCOMES_V7,
  applyCommandV7,
  calculateCombatPreviewV7,
  canBeFrozenV7,
  mindControlTargetBlockV7,
  monsterWanderV7,
  neutralBreedOfV7,
  neutralCapabilitiesV7,
  neutralStandableV7,
  neutralStepsV7,
  parseEventV7,
  parseGameStateV7,
  previewGateV7,
  previewMonsterV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryGateDestinationsV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  viewForV7,
  wellOutcomeV7,
  type CommandV7,
  type CoordV7,
  type CuriosityV7,
  type DomainEventV7,
  type GameStateV7,
  type NeutralBoardFactsV7,
  type NeutralBreedV7,
  type PlayerId,
  type UnitStateV7,
  type WellOutcomeV7,
} from "../../src/engine/index";
import { tunnelTileLegalV7 } from "../../src/engine/v7/dwarf-reducer";
import { unitScoreValueV7 } from "../../src/engine/v7/score";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  round2ArenaV7,
  round2UnitAtV7,
  type Round2ArenaOptionsV7,
  type Round2NeutralV7,
} from "../fixtures/v7-round2-arena";

// Map curiosities round 2 (`pulp_wars-737.14`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 25 to 32 and 35.2):
// the neutral registration by breed, the camps, the Dimensional Gates,
// Bigfoot, and the Wishing Well. The arena is the open 20 x 20 board of
// `round2ArenaV7`: player 1 (seat 0) moves first and player 2's END_TURN
// wraps the round, so the neutral turn follows it.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const P1 = 1 as PlayerId;
const P2 = 2 as PlayerId;
const SAUCER = at(5, 9);
const GATE_A = at(2, 2);
const GATE_B = at(17, 17);
const GATES: readonly CuriosityV7[] = [
  { kind: "GATE", at: GATE_A, partner: GATE_B },
  { kind: "GATE", at: GATE_B, partner: GATE_A },
];
const WELL = at(4, 6);

const kinds = (events: readonly DomainEventV7[]) =>
  events
    .map((event) => event.kind)
    .filter((kind) => kind !== "ACHIEVEMENT_UNLOCKED");

function apply(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  return result;
}

function rejection(state: GameStateV7, actor: PlayerId, command: CommandV7) {
  const result = applyCommandV7(state, actor, command);
  if (result.accepted) throw new Error(`${command.kind} accepted`);
  return result.error;
}

/** Ends both seats' turns; returns the events from player 2's END_TURN on. */
function endRound(state: GameStateV7) {
  const first = apply(state, P1, { kind: "END_TURN" });
  const second = apply(first.state, P2, { kind: "END_TURN" });
  return second;
}

function neutralOf(state: GameStateV7, breed: NeutralBreedV7, index = 0) {
  const entry = state.monsters.filter((other) => other.breed === breed)[index];
  const unit = state.units.find((candidate) => candidate.id === entry?.unitId);
  if (entry === undefined || unit === undefined)
    throw new Error(`no ${breed} on the board`);
  return { entry, unit };
}

function facts(state: GameStateV7): NeutralBoardFactsV7 {
  return {
    board: state.board,
    units: state.units,
    burrowed: state.burrowed,
    barricades: state.barricades,
    treasureChests: state.treasureChests,
    curiosities: state.curiosities,
    monsters: state.monsters,
  };
}

function saucerArena(
  guards: readonly Round2NeutralV7[],
  options: Round2ArenaOptionsV7 = {},
): GameStateV7 {
  return round2ArenaV7({
    ...options,
    curiosities: [
      { kind: "DOWNED_SAUCER", at: SAUCER },
      ...(options.curiosities ?? []),
    ],
    neutrals: guards,
  });
}

function graveyardArena(
  zombies: readonly Round2NeutralV7[],
  options: Round2ArenaOptionsV7 = {},
): GameStateV7 {
  return round2ArenaV7({
    ...options,
    curiosities: [{ kind: "GRAVEYARD", at: SAUCER }],
    neutrals: zombies,
  });
}

const combats = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) =>
    event.kind === "COMBAT_RESOLVED" ? [event.preview] : [],
  );

describe("the neutral registration by breed (sections 25.2, 29.1, 32.3)", () => {
  const state = round2ArenaV7({
    curiosities: [{ kind: "DOWNED_SAUCER", at: SAUCER }],
    neutrals: [
      { breed: "GRUNT", home: SAUCER, at: at(5, 8) },
      { breed: "RAY_GUNNER", home: SAUCER, at: at(4, 8) },
      { breed: "SHIELD_PROJECTOR", home: SAUCER, at: at(6, 8) },
    ],
  });

  it("resolves each breed's stats, mechanics, and empty technology", () => {
    const expected: Record<
      NeutralBreedV7,
      readonly [string, string, number, number, number, number]
    > = {
      GIANT_SPIDER: ["JUGGERNAUT", "Giant Spider", 24, 6, 4, 1],
      GRUNT: ["FIGHTER", "Grunt", 10, 4, 3, 2],
      RAY_GUNNER: ["MARKSMAN", "Ray Gunner", 10, 6, 2, 2],
      SHIELD_PROJECTOR: ["GUARD", "Shield Projector", 15, 3, 5, 1],
      ZOMBIE: ["GUARD", "Zombie", 18, 4, 4, 1],
      BIGFOOT: ["RAIDER", "Bigfoot", 15, 0, 4, 0],
    };
    for (const breed of NEUTRAL_BREEDS_V7) {
      const rule = NEUTRAL_ROLE_RULES_V7[breed];
      const [role, label, maxHp, attack2, defense2, range] = expected[breed];
      expect(
        [
          rule.role,
          rule.label,
          rule.maxHp,
          rule.attack2,
          rule.defense2,
          rule.range,
        ],
        breed,
      ).toEqual([role, label, maxHp, attack2, defense2, range]);
      expect(rule.cost).toBeNull();
      expect(rule.sightRadius).toBe(0);
      expect(rule.mayUsePrimaryActionAfterMove).toBe(true);
      expect(rule.abilities.includes("CAPTURE")).toBe(false);
    }
    expect(NEUTRAL_ROLE_RULES_V7.RAY_GUNNER.abilities).toEqual([
      "ATTACK",
      "HEAT_RAY",
    ]);
    expect(NEUTRAL_ROLE_RULES_V7.BIGFOOT.abilities).toEqual([]);
    for (const { unitId } of state.monsters) {
      const unit = state.units.find((candidate) => candidate.id === unitId);
      if (unit === undefined) throw new Error("unit");
      expect(unitFactionV7(state, unit)).toBe(NEUTRAL_KIND_V7);
      expect(unitCapabilitiesV7(state, unit, [])).toBe(neutralCapabilitiesV7());
      const mechanics = unitRoleMechanicsV7(state, unit);
      expect(mechanics.advancesAfterKill).toBe(false);
      expect(mechanics.shield).toBe(0);
    }
    expect(
      unitRoleMechanicsV7(state, neutralOf(state, "RAY_GUNNER").unit).heatSink,
    ).toBe(true);
  });

  it("tells the Zombie from the Shield Projector by breed, both GUARD", () => {
    const zombies = graveyardArena([
      { breed: "ZOMBIE", home: SAUCER, at: at(5, 8) },
    ]);
    const zombie = neutralOf(zombies, "ZOMBIE").unit;
    const projector = neutralOf(state, "SHIELD_PROJECTOR").unit;
    expect(zombie.role).toBe(projector.role);
    expect(unitRoleRuleV7(zombies, zombie).label).toBe("Zombie");
    expect(unitRoleRuleV7(state, projector).label).toBe("Shield Projector");
    // A roster without the `monsters` list falls back to role and max HP.
    expect(neutralBreedOfV7({}, zombie)).toBe("ZOMBIE");
    expect(neutralBreedOfV7({}, projector)).toBe("SHIELD_PROJECTOR");
  });

  it("is immune to Mind Control, Frozen, Push, and Knockback, per breed", () => {
    for (const breed of NEUTRAL_BREEDS_V7) {
      const home = breed === "BIGFOOT" ? at(15, 10) : SAUCER;
      const standOn =
        breed === "GIANT_SPIDER" || breed === "BIGFOOT" ? home : at(5, 8);
      const options: Round2ArenaOptionsV7 = {
        pieces: [
          { seat: 0, role: "JUGGERNAUT", at: at(standOn.x - 1, standOn.y) },
        ],
        terrain: breed === "BIGFOOT" ? [{ at: home, terrain: "FOREST" }] : [],
        neutrals: [{ breed, home, at: standOn }],
        curiosities:
          breed === "ZOMBIE"
            ? [{ kind: "GRAVEYARD", at: SAUCER }]
            : breed === "GIANT_SPIDER" || breed === "BIGFOOT"
              ? []
              : [{ kind: "DOWNED_SAUCER", at: SAUCER }],
      };
      const arena = round2ArenaV7(options);
      const neutral = neutralOf(arena, breed).unit;
      const juggernaut = round2UnitAtV7(arena, at(standOn.x - 1, standOn.y));
      expect(canBeFrozenV7(arena, P1, neutral), breed).toBe(false);
      expect(
        mindControlTargetBlockV7(arena, { at: juggernaut.at }, neutral, {
          site: null,
          terrain: "GRASS",
        }),
        breed,
      ).toBe("TARGET_IMMUNE");
      const preview = calculateCombatPreviewV7(
        arena,
        juggernaut.id,
        neutral.id,
      );
      expect(preview.push, breed).toBe("BLOCKED");
    }
  });
});

describe("camps: provocation and the attack (sections 25.3 and 25.4)", () => {
  it("a saucer guard attacks a unit inside the perimeter, stepping to the first (y, x) tile in range", () => {
    // The Grunt (range 2) at (4, 8) cannot reach (6, 11) from where it
    // stands (3); of its steps only (4, 9) is within 2 of it.
    const state = saucerArena(
      [{ breed: "GRUNT", home: SAUCER, at: at(4, 8) }],
      { pieces: [{ seat: 0, role: "FIGHTER", at: at(6, 11) }] },
    );
    const grunt = neutralOf(state, "GRUNT").unit;
    const fighter = round2UnitAtV7(state, at(6, 11));
    const { events, state: after } = endRound(state);
    const moved = events.find(
      (event) => event.kind === "UNIT_MOVED" && event.unitId === grunt.id,
    );
    expect(moved).toEqual({
      kind: "UNIT_MOVED",
      unitId: grunt.id,
      path: [at(4, 9)],
    });
    expect(combats(events)).toEqual([
      expect.objectContaining({
        attackerId: grunt.id,
        targetUnitId: fighter.id,
        retaliation: false,
      }),
    ]);
    // No regeneration for a guard; the saucer stays.
    expect(kinds(events)).not.toContain("MONSTER_REGENERATED");
    expect(after.curiosities).toEqual([{ kind: "DOWNED_SAUCER", at: SAUCER }]);
  });

  it("a saucer guard attacks a unit next to a guard of the camp without stepping", () => {
    const state = saucerArena(
      [{ breed: "GRUNT", home: SAUCER, at: at(3, 7) }],
      { pieces: [{ seat: 0, role: "FIGHTER", at: at(2, 6) }] },
    );
    const grunt = neutralOf(state, "GRUNT").unit;
    const { events } = endRound(state);
    expect(
      events.some(
        (event) => event.kind === "UNIT_MOVED" && event.unitId === grunt.id,
      ),
    ).toBe(false);
    expect(combats(events)).toEqual([
      expect.objectContaining({ attackerId: grunt.id }),
    ]);
  });

  it("a unit that hurt a guard is a provoker, but only a candidate in reach", () => {
    const inReach = saucerArena(
      [{ breed: "GRUNT", home: SAUCER, at: at(3, 10), provokedBy: [0] }],
      { pieces: [{ seat: 0, role: "CATAPULT", at: at(1, 12) }] },
    );
    expect(combats(endRound(inReach).events)).toEqual([
      expect.objectContaining({
        attackerId: neutralOf(inReach, "GRUNT").unit.id,
      }),
    ]);
    const outOfReach = saucerArena(
      [{ breed: "GRUNT", home: SAUCER, at: at(3, 10), provokedBy: [0] }],
      { pieces: [{ seat: 0, role: "CATAPULT", at: at(0, 14) }] },
    );
    expect(combats(endRound(outOfReach).events)).toEqual([]);
    // The same unit far outside the perimeter, unlisted: nothing.
    const unprovoked = saucerArena(
      [{ breed: "GRUNT", home: SAUCER, at: at(3, 10) }],
      { pieces: [{ seat: 0, role: "CATAPULT", at: at(1, 12) }] },
    );
    expect(combats(endRound(unprovoked).events)).toEqual([]);
  });

  it("a Graveyard Zombie attacks any unit it can reach, stepping next to it first", () => {
    // (7, 6) is 3 from the graveyard: outside a saucer's perimeter, yet
    // the Zombie steps to (6, 7), the first step tile next to it.
    const state = graveyardArena(
      [{ breed: "ZOMBIE", home: SAUCER, at: at(5, 8) }],
      { pieces: [{ seat: 0, role: "FIGHTER", at: at(7, 6) }] },
    );
    const zombie = neutralOf(state, "ZOMBIE").unit;
    const { events } = endRound(state);
    expect(
      events.find(
        (event) => event.kind === "UNIT_MOVED" && event.unitId === zombie.id,
      ),
    ).toEqual({ kind: "UNIT_MOVED", unitId: zombie.id, path: [at(6, 7)] });
    expect(combats(events)).toEqual([
      expect.objectContaining({ attackerId: zombie.id }),
    ]);
  });

  it("targets the lowest HP, ties by the lowest unit ID", () => {
    // Every piece has moved, so no idle recovery changes its HP.
    const moved = { moved: true, movedPathLength: 1, handled: true };
    const state = saucerArena(
      [{ breed: "GRUNT", home: SAUCER, at: at(5, 8) }],
      {
        pieces: [
          { seat: 0, role: "FIGHTER", at: at(4, 7), hp: 9, activation: moved },
          { seat: 0, role: "FIGHTER", at: at(6, 7), hp: 6, activation: moved },
          { seat: 1, role: "FIGHTER", at: at(6, 9), hp: 6, activation: moved },
        ],
      },
    );
    const target = round2UnitAtV7(state, at(6, 7));
    expect(combats(endRound(state).events)[0]?.targetUnitId).toBe(target.id);
  });

  it("acts in unit-ID order on the board the earlier guards left", () => {
    // The first Grunt kills the 1-HP Fighter; the second then takes the
    // other provoker.
    const state = saucerArena(
      [
        { breed: "GRUNT", home: SAUCER, at: at(5, 8) },
        { breed: "GRUNT", home: SAUCER, at: at(5, 10) },
      ],
      {
        pieces: [
          { seat: 0, role: "FIGHTER", at: at(5, 11), hp: 1 },
          { seat: 0, role: "FIGHTER", at: at(6, 7) },
        ],
      },
    );
    const weak = round2UnitAtV7(state, at(5, 11));
    const strong = round2UnitAtV7(state, at(6, 7));
    const first = neutralOf(state, "GRUNT", 0).unit;
    const second = neutralOf(state, "GRUNT", 1).unit;
    const hits = combats(endRound(state).events);
    expect(hits.map((hit) => [hit.attackerId, hit.targetUnitId])).toEqual([
      [first.id, weak.id],
      [second.id, strong.id],
    ]);
  });

  it("fires the Ray Gunner's ray at full power without a step and at half power after one, never Cooling", () => {
    const still = saucerArena(
      [{ breed: "RAY_GUNNER", home: SAUCER, at: at(5, 8) }],
      { pieces: [{ seat: 0, role: "FIGHTER", at: at(5, 10) }] },
    );
    const full = endRound(still);
    expect(combats(full.events)[0]?.rayPower).toBe("FULL");
    expect(full.state.cooling).toEqual([]);
    const stepping = saucerArena(
      [{ breed: "RAY_GUNNER", home: SAUCER, at: at(4, 8) }],
      { pieces: [{ seat: 0, role: "FIGHTER", at: at(6, 11) }] },
    );
    const half = endRound(stepping);
    expect(combats(half.events)[0]?.rayPower).toBe("HALF");
    expect(half.state.cooling).toEqual([]);
  });

  it("wanders by the Spider's stateless draw with no candidate", () => {
    const state = saucerArena([
      { breed: "SHIELD_PROJECTOR", home: SAUCER, at: at(5, 8), hp: 5 },
    ]);
    const { unit, entry } = neutralOf(state, "SHIELD_PROJECTOR");
    const steps = neutralStepsV7(facts(state), unit, entry);
    const expected =
      monsterWanderV7(state.setup.seed, state.round, unit.id, steps) ?? unit.at;
    const after = endRound(state).state;
    const moved = neutralOf(after, "SHIELD_PROJECTOR").unit;
    expect(moved.at).toEqual(expected);
    // No regeneration.
    expect(moved.hp).toBe(5);
  });

  it("never stands on the centre or within 2 of a settlement centre", () => {
    const state = saucerArena([{ breed: "GRUNT", home: SAUCER, at: at(5, 8) }]);
    const { entry } = neutralOf(state, "GRUNT");
    expect(neutralStandableV7(facts(state), entry, SAUCER)).toBe(false);
    expect(neutralStandableV7(facts(state), entry, at(4, 10))).toBe(true);
    expect(neutralStandableV7(facts(state), entry, at(5, 12))).toBe(false);
    // A camp near a capital: its area within 2 of the capital is closed.
    const near = round2ArenaV7({
      curiosities: [{ kind: "DOWNED_SAUCER", at: at(9, 11) }],
      neutrals: [{ breed: "GRUNT", home: at(9, 11), at: at(9, 10) }],
    });
    const nearEntry = neutralOf(near, "GRUNT").entry;
    expect(neutralStandableV7(facts(near), nearEntry, at(9, 13))).toBe(false);
    expect(neutralStandableV7(facts(near), nearEntry, at(9, 12))).toBe(true);
  });
});

describe("camps: bounties and the cleared camp (section 25.6)", () => {
  for (const [breed, camp] of [
    ["GRUNT", "DOWNED_SAUCER"],
    ["RAY_GUNNER", "DOWNED_SAUCER"],
    ["SHIELD_PROJECTOR", "DOWNED_SAUCER"],
    ["ZOMBIE", "GRAVEYARD"],
  ] as const)
    it(`pays the ${breed} bounty and leaves the ${camp} as scenery`, () => {
      const state = round2ArenaV7({
        curiosities: [{ kind: camp, at: SAUCER }],
        neutrals: [{ breed, home: SAUCER, at: at(5, 8), hp: 1 }],
        pieces: [{ seat: 0, role: "FIGHTER", at: at(5, 7) }],
      });
      const guard = neutralOf(state, breed).unit;
      const fighter = round2UnitAtV7(state, at(5, 7));
      const coins = state.players[0]?.coins ?? 0;
      const killed = apply(state, P1, {
        kind: "ATTACK",
        unitId: fighter.id,
        targetUnitId: guard.id,
      });
      const bounty = killed.events.find(
        (event) => event.kind === "MONSTER_BOUNTY_AWARDED",
      );
      expect(bounty).toEqual({
        kind: "MONSTER_BOUNTY_AWARDED",
        playerId: P1,
        unitId: guard.id,
        coins: NEUTRAL_BOUNTIES_V7[breed],
      });
      expect(killed.state.players[0]?.coins).toBe(
        coins + NEUTRAL_BOUNTIES_V7[breed],
      );
      // The score ledger counts the kill once, at the breed's bounty.
      const killValue = (current: GameStateV7, playerId: PlayerId) =>
        current.scoreLedger.find((entry) => entry.playerId === playerId)
          ?.killValue ?? 0;
      expect(killValue(killed.state, P1) - killValue(state, P1)).toBe(
        NEUTRAL_BOUNTIES_V7[breed],
      );
      expect(killValue(killed.state, P2)).toBe(killValue(state, P2));
      expect(killed.state.monsters).toEqual([]);
      expect(killed.state.curiosities).toEqual([{ kind: camp, at: SAUCER }]);
      // A cleared camp has no neutral turn.
      expect(kinds(endRound(killed.state).events)).not.toContain(
        "NEUTRAL_TURN_STARTED",
      );
    });
});

describe("interactions with later rules: Barricades and the score ledger", () => {
  it("a Barricade blocks a guard's step: it takes the next (y, x) tile in range", () => {
    // The Grunt (range 2) must step to reach the Fighter inside the
    // perimeter; its first tile in range, (4, 8), holds a Barricade.
    const options = {
      factions: ["DWARF", "GOBLIN"] as const,
      curiosities: [{ kind: "DOWNED_SAUCER" as const, at: SAUCER }],
      neutrals: [{ breed: "GRUNT" as const, home: SAUCER, at: at(5, 7) }],
      pieces: [{ seat: 1, role: "FIGHTER" as const, at: at(5, 10) }],
    };
    const open = round2ArenaV7({ ...options, factions: [...options.factions] });
    const blocked = checkedV7({
      ...open,
      barricades: [{ at: at(4, 8), ownerId: P1, hp: 10 }],
    });
    const grunt = neutralOf(open, "GRUNT").unit;
    const stepOf = (state: GameStateV7) =>
      endRound(state).events.find(
        (event) => event.kind === "UNIT_MOVED" && event.unitId === grunt.id,
      );
    expect(stepOf(open)).toEqual({
      kind: "UNIT_MOVED",
      unitId: grunt.id,
      path: [at(4, 8)],
    });
    expect(stepOf(blocked)).toEqual({
      kind: "UNIT_MOVED",
      unitId: grunt.id,
      path: [at(5, 8)],
    });
    expect(
      neutralStepsV7(facts(blocked), grunt, neutralOf(blocked, "GRUNT").entry),
    ).not.toContainEqual(at(4, 8));
  });

  it("a Barricade next to an exit gate is skipped by the displacement", () => {
    const state = round2ArenaV7({
      factions: ["DWARF", "GOBLIN"],
      curiosities: [...GATES],
      pieces: [
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: GATE_B },
      ],
    });
    const walled = checkedV7({
      ...state,
      barricades: [{ at: at(17, 16), ownerId: P1, hp: 10 }],
    });
    const mover = round2UnitAtV7(walled, at(3, 3));
    const occupant = round2UnitAtV7(walled, GATE_B);
    expect(previewGateV7(viewForV7(walled, P1), mover.id, GATE_A)).toEqual(
      expect.objectContaining({
        displaces: occupant.id,
        displaceTo: at(18, 16),
      }),
    );
    const moved = apply(walled, P1, {
      kind: "MOVE",
      unitId: mover.id,
      path: [GATE_A],
    });
    expect(moved.events).toContainEqual({
      kind: "GATE_DISPLACED",
      unitId: occupant.id,
      from: GATE_B,
      to: at(18, 16),
    });
  });

  it("a neutral kill of a seat's unit is that seat's loss and nobody's kill", () => {
    const state = saucerArena(
      [{ breed: "GRUNT", home: SAUCER, at: at(5, 8) }],
      { pieces: [{ seat: 1, role: "FIGHTER", at: at(5, 10), hp: 1 }] },
    );
    const victim = round2UnitAtV7(state, at(5, 10));
    const after = endRound(state);
    expect(after.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", unitId: victim.id }),
    );
    const entry = (current: GameStateV7, playerId: PlayerId) =>
      current.scoreLedger.find((item) => item.playerId === playerId);
    expect(
      (entry(after.state, P2)?.lossValue ?? 0) -
        (entry(state, P2)?.lossValue ?? 0),
    ).toBe(unitScoreValueV7(state, victim));
    for (const playerId of [P1, P2])
      expect(entry(after.state, playerId)?.killValue).toBe(
        entry(state, playerId)?.killValue,
      );
  });
});

describe("camp previews (section 32.5)", () => {
  it("previews a saucer guard's perimeter, reach, provokers, and likely target", () => {
    const state = saucerArena(
      [
        { breed: "GRUNT", home: SAUCER, at: at(4, 8) },
        { breed: "GRUNT", home: SAUCER, at: at(6, 10) },
      ],
      {
        pieces: [
          { seat: 0, role: "FIGHTER", at: at(6, 11) },
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
        ],
      },
    );
    const view = viewForV7(state, P1);
    const grunt = neutralOf(state, "GRUNT", 0).unit;
    const other = neutralOf(state, "GRUNT", 1).unit;
    const preview = previewMonsterV7(view, grunt.id);
    if (preview === null) throw new Error("preview");
    expect(preview.breed).toBe("GRUNT");
    expect(preview.home).toEqual(SAUCER);
    // The perimeter and the tiles next to each guard.
    expect(preview.provokeTiles).toContainEqual(at(7, 11));
    expect(preview.provokeTiles).toContainEqual(at(7, 9));
    expect(preview.provokeTiles).not.toContainEqual(at(9, 9));
    expect(preview.area).not.toContainEqual(SAUCER);
    const inside = round2UnitAtV7(state, at(6, 11));
    expect(preview.provokers).toEqual([inside.id]);
    expect(preview.likelyTarget).toBe(inside.id);
    expect(preview.reachTiles).toContainEqual(at(6, 11));
    expect(preview.exact).toBe(true);
    // Threatened tiles: the provoke tiles within its reach.
    const threatened = queryThreatenedTilesV7(view, grunt.id);
    expect(threatened).toContainEqual(at(6, 11));
    expect(
      threatened.every((tile) =>
        preview.reachTiles.some((r) => r.x === tile.x && r.y === tile.y),
      ),
    ).toBe(true);
    // An attack on one guard is answered through any guard of the camp.
    const attack = queryCombatPreviewV7(view, inside.id, other.id);
    expect(attack?.monsterRetaliates).toBe(true);
  });

  it("previews Bigfoot's habitat and flight tiles, with no reach", () => {
    const state = round2ArenaV7({
      terrain: forest(13, 7, 19, 13),
      neutrals: [{ breed: "BIGFOOT", home: at(16, 10) }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(13, 10) }],
    });
    const view = viewForV7(state, P1);
    const bigfoot = neutralOf(state, "BIGFOOT").unit;
    const preview = previewMonsterV7(view, bigfoot.id);
    if (preview === null) throw new Error("preview");
    expect(preview.reachTiles).toEqual([]);
    expect(preview.likelyTarget).toBeNull();
    expect(preview.provokeTiles).toContainEqual(at(13, 10));
    expect(preview.provokeTiles).not.toContainEqual(at(12, 10));
    expect(preview.area.every((tile) => tile.x >= 13)).toBe(true);
    expect(queryThreatenedTilesV7(view, bigfoot.id)).toEqual([]);
    // An attack on Bigfoot is never answered.
    const close = round2ArenaV7({
      terrain: forest(13, 7, 19, 13),
      neutrals: [{ breed: "BIGFOOT", home: at(16, 10) }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(15, 10) }],
    });
    const attack = queryCombatPreviewV7(
      viewForV7(close, P1),
      round2UnitAtV7(close, at(15, 10)).id,
      neutralOf(close, "BIGFOOT").unit.id,
    );
    expect(attack?.monsterRetaliates).toBe(false);
    expect(attack?.retaliation).toBe(false);
  });
});

/** Forest on every tile of the rectangle. */
function forest(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { at: CoordV7; terrain: "FOREST" }[] {
  const tiles: { at: CoordV7; terrain: "FOREST" }[] = [];
  for (let y = y0; y <= y1; y += 1)
    for (let x = x0; x <= x1; x += 1)
      tiles.push({ at: at(x, y), terrain: "FOREST" });
  return tiles;
}

describe("Bigfoot (section 29)", () => {
  const terrain = forest(12, 6, 19, 14);

  it("flees from a unit within exactly 3 to the farthest tile, ties by (y, x)", () => {
    const state = round2ArenaV7({
      terrain,
      neutrals: [{ breed: "BIGFOOT", home: at(15, 10) }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(12, 10) }],
    });
    const bigfoot = neutralOf(state, "BIGFOOT").unit;
    const { events } = endRound(state);
    expect(
      events.find(
        (event) => event.kind === "UNIT_MOVED" && event.unitId === bigfoot.id,
      ),
    ).toEqual({
      kind: "UNIT_MOVED",
      unitId: bigfoot.id,
      path: [at(16, 9), at(17, 8), at(18, 7)],
    });
    expect(combats(events)).toEqual([]);
  });

  it("prefers fewer steps among the farthest tiles", () => {
    const state = round2ArenaV7({
      terrain,
      neutrals: [{ breed: "BIGFOOT", home: at(16, 10), at: at(18, 10) }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(15, 10) }],
    });
    const bigfoot = neutralOf(state, "BIGFOOT").unit;
    const after = endRound(state);
    expect(
      after.events.find(
        (event) => event.kind === "UNIT_MOVED" && event.unitId === bigfoot.id,
      ),
    ).toEqual({ kind: "UNIT_MOVED", unitId: bigfoot.id, path: [at(19, 9)] });
  });

  it("wanders when the nearest unit is 4 away", () => {
    const state = round2ArenaV7({
      terrain,
      neutrals: [{ breed: "BIGFOOT", home: at(15, 10) }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(11, 10) }],
    });
    const { unit, entry } = neutralOf(state, "BIGFOOT");
    const steps = neutralStepsV7(facts(state), unit, entry);
    const expected =
      monsterWanderV7(state.setup.seed, state.round, unit.id, steps) ?? unit.at;
    expect(neutralOf(endRound(state).state, "BIGFOOT").unit.at).toEqual(
      expected,
    );
  });

  it("never passes a unit in its flight", () => {
    const wall = [7, 8, 9, 10, 11, 12, 13].map((y) => ({
      seat: 1,
      role: "FIGHTER" as const,
      at: at(17, y),
    }));
    const state = round2ArenaV7({
      terrain,
      neutrals: [{ breed: "BIGFOOT", home: at(15, 10) }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(13, 10) }, ...wall],
    });
    const bigfoot = neutralOf(state, "BIGFOOT").unit;
    const moved = endRound(state).events.find(
      (event) => event.kind === "UNIT_MOVED" && event.unitId === bigfoot.id,
    );
    if (moved?.kind !== "UNIT_MOVED") throw new Error("Bigfoot stayed");
    expect(moved.path.every((tile) => tile.x < 17)).toBe(true);
  });

  it("keeps to its habitat: Forest, 3 from every centre and curiosity tile", () => {
    const state = round2ArenaV7({
      terrain: [
        { at: at(16, 13), terrain: "GRASS" },
        { at: at(13, 7), terrain: "GRASS" },
        ...terrain,
      ],
      neutrals: [{ breed: "BIGFOOT", home: at(15, 10) }],
      curiosities: [{ kind: "WISHING_WELL", at: at(13, 7), tossedBy: [] }],
    });
    const { entry } = neutralOf(state, "BIGFOOT");
    const standable = (tile: CoordV7) =>
      neutralStandableV7(facts(state), entry, tile, entry.unitId);
    expect(standable(at(15, 10))).toBe(true);
    expect(standable(at(16, 13))).toBe(false); // Grass
    expect(standable(at(14, 8))).toBe(false); // 1 from the Well
    expect(standable(at(16, 8))).toBe(true); // 3 from the Well
    expect(standable(at(12, 6))).toBe(false); // 2 from player 2's capital
    expect(standable(at(19, 10))).toBe(true); // 4 from home
    expect(standable(at(15, 15))).toBe(false); // 5 from home
  });

  it("never attacks or retaliates, and pays 12 Coins", () => {
    const state = round2ArenaV7({
      terrain,
      neutrals: [{ breed: "BIGFOOT", home: at(15, 10), hp: 2 }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(14, 10) }],
    });
    const bigfoot = neutralOf(state, "BIGFOOT").unit;
    const fighter = round2UnitAtV7(state, at(14, 10));
    const preview = calculateCombatPreviewV7(state, fighter.id, bigfoot.id);
    expect(preview.retaliation).toBe(false);
    const wounded = round2ArenaV7({
      terrain,
      neutrals: [{ breed: "BIGFOOT", home: at(15, 10) }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(14, 10) }],
    });
    const hit = calculateCombatPreviewV7(
      wounded,
      round2UnitAtV7(wounded, at(14, 10)).id,
      neutralOf(wounded, "BIGFOOT").unit.id,
    );
    expect(hit.retaliation).toBe(false);
    expect(hit.noRetaliationReason).toBe("OUT_OF_RANGE");
    const killed = apply(state, P1, {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: bigfoot.id,
    });
    expect(
      killed.events.find((event) => event.kind === "MONSTER_BOUNTY_AWARDED"),
    ).toEqual(expect.objectContaining({ coins: 12 }));
  });
});

describe("Dimensional Gates (section 28)", () => {
  const gateArena = (options: Round2ArenaOptionsV7 = {}) =>
    round2ArenaV7({
      ...options,
      curiosities: [...GATES, ...(options.curiosities ?? [])],
    });

  it("stops every Move that enters a gate, walkers and flyers alike", () => {
    const state = gateArena({
      pieces: [{ seat: 0, role: "KNIGHT", at: at(4, 4) }],
    });
    const knight = round2UnitAtV7(state, at(4, 4));
    expect(
      rejection(state, P1, {
        kind: "MOVE",
        unitId: knight.id,
        path: [at(3, 3), at(2, 2), at(1, 1)],
      }),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "GATE_STOPS_MOVE" },
    });
    const martian = gateArena({
      factions: ["MARTIAN", "GOBLIN"],
      pieces: [{ seat: 0, role: "RAIDER", at: at(4, 4) }],
    });
    const saucer = round2UnitAtV7(martian, at(4, 4));
    expect(
      rejection(martian, P1, {
        kind: "MOVE",
        unitId: saucer.id,
        path: [at(3, 3), at(2, 2), at(1, 1)],
      }).params,
    ).toEqual({ reason: "GATE_STOPS_MOVE" });
    // The offered Moves never pass a gate.
    expect(
      queryPlayerCommandsV7(state, P1).some(
        (command) =>
          command.kind === "MOVE" &&
          command.path
            .slice(0, -1)
            .some((tile) => tile.x === GATE_A.x && tile.y === GATE_A.y),
      ),
    ).toBe(false);
  });

  it("carries a unit that steps onto a gate to its partner, Move spent, action left", () => {
    const state = gateArena({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(3, 3) }],
    });
    const fighter = round2UnitAtV7(state, at(3, 3));
    const moved = apply(state, P1, {
      kind: "MOVE",
      unitId: fighter.id,
      path: [GATE_A],
    });
    expect(kinds(moved.events)).toEqual(["UNIT_MOVED", "GATE_TRAVERSED"]);
    expect(moved.events[1]).toEqual({
      kind: "GATE_TRAVERSED",
      playerId: P1,
      unitId: fighter.id,
      from: GATE_A,
      to: GATE_B,
    });
    const after = moved.state.units.find((unit) => unit.id === fighter.id);
    expect(after?.at).toEqual(GATE_B);
    expect(after?.activation).toEqual(
      expect.objectContaining({
        moved: true,
        movedPathLength: 1,
        attacked: false,
      }),
    );
    // The movement query marks the gate destination with its exit.
    expect(queryGateDestinationsV7(viewForV7(state, P1), fighter.id)).toEqual([
      {
        gate: GATE_A,
        exit: GATE_B,
        displaces: null,
        displaceTo: null,
        blocked: false,
        exact: true,
      },
    ]);
    // The other seat sees the traversal (it sees the unit).
    const projected = projectEventsV7(state, moved.state, P2, moved.events);
    expect(projected.events.map((event) => event.kind)).toContain(
      "GATE_TRAVERSED",
    );
  });

  it("displaces the exit's occupant clockwise from north by its own terrain rule", () => {
    const base = {
      pieces: [
        { seat: 0, role: "FIGHTER" as const, at: at(3, 3) },
        { seat: 1, role: "FIGHTER" as const, at: GATE_B },
      ],
    };
    const north = gateArena(base);
    const mover = round2UnitAtV7(north, at(3, 3));
    const occupant = round2UnitAtV7(north, GATE_B);
    expect(previewGateV7(viewForV7(north, P1), mover.id, GATE_A)).toEqual({
      gate: GATE_A,
      exit: GATE_B,
      displaces: occupant.id,
      displaceTo: at(17, 16),
      blocked: false,
      exact: true,
    });
    const result = apply(north, P1, {
      kind: "MOVE",
      unitId: mover.id,
      path: [GATE_A],
    });
    expect(kinds(result.events)).toEqual([
      "UNIT_MOVED",
      "GATE_DISPLACED",
      "GATE_TRAVERSED",
    ]);
    expect(result.events[1]).toEqual({
      kind: "GATE_DISPLACED",
      unitId: occupant.id,
      from: GATE_B,
      to: at(17, 16),
    });
    expect(
      result.state.units.find((unit) => unit.id === occupant.id)?.activation,
    ).toEqual(occupant.activation);
    // North taken by a unit and north-east a Mountain without Engineering:
    // east.
    const east = gateArena({
      pieces: [...base.pieces, { seat: 1, role: "FIGHTER", at: at(17, 16) }],
      terrain: [{ at: at(18, 16), terrain: "MOUNTAIN" }],
      techs: { 1: [] },
    });
    expect(
      previewGateV7(viewForV7(east, P1), mover.id, GATE_A)?.displaceTo,
    ).toEqual(at(18, 17));
    const moved = apply(east, P1, {
      kind: "MOVE",
      unitId: round2UnitAtV7(east, at(3, 3)).id,
      path: [GATE_A],
    });
    expect(
      moved.state.units.find((unit) => unit.id === occupant.id)?.at,
    ).toEqual(at(18, 17));
  });

  it("is blocked when the occupant has nowhere to go: the mover stays on the entry gate", () => {
    const ring = [
      at(16, 16),
      at(17, 16),
      at(18, 16),
      at(16, 17),
      at(18, 17),
      at(16, 18),
      at(17, 18),
      at(18, 18),
    ];
    const state = gateArena({
      pieces: [
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: GATE_B },
      ],
      terrain: ring.map((tile) => ({ at: tile, terrain: "MOUNTAIN" })),
      techs: { 1: [] },
    });
    const mover = round2UnitAtV7(state, at(3, 3));
    expect(previewGateV7(viewForV7(state, P1), mover.id, GATE_A)?.blocked).toBe(
      true,
    );
    const result = apply(state, P1, {
      kind: "MOVE",
      unitId: mover.id,
      path: [GATE_A],
    });
    expect(kinds(result.events)).toEqual(["UNIT_MOVED", "GATE_BLOCKED"]);
    expect(result.state.units.find((unit) => unit.id === mover.id)?.at).toEqual(
      GATE_A,
    );
    expect(
      result.state.units.find((unit) => unit.id === mover.id)?.activation.moved,
    ).toBe(true);
  });

  it("traverses on a landing (DISEMBARK), the landed unit exhausted", () => {
    const state = gateArena({
      terrain: [{ at: at(1, 3), terrain: "SHALLOW_WATER" }],
      pieces: [{ seat: 0, role: "FIGHTER", at: at(1, 3), form: "EMBARKED" }],
    });
    const boat = round2UnitAtV7(state, at(1, 3));
    const result = apply(state, P1, {
      kind: "DISEMBARK",
      unitId: boat.id,
      at: GATE_A,
    });
    expect(kinds(result.events)).toEqual([
      "UNIT_DISEMBARKED",
      "GATE_TRAVERSED",
    ]);
    const landed = result.state.units.find((unit) => unit.id === boat.id);
    expect(landed?.at).toEqual(GATE_B);
    expect(landed?.activation.handled).toBe(true);
  });

  it("does not traverse on a forced move or for a unit already standing there", () => {
    // A unit that starts on a gate and does not move stays; a gate is never
    // a tunnel destination.
    const state = gateArena({
      pieces: [{ seat: 0, role: "FIGHTER", at: GATE_A }],
    });
    const fighter = round2UnitAtV7(state, GATE_A);
    const waited = apply(state, P1, { kind: "WAIT", unitId: fighter.id });
    expect(
      waited.state.units.find((unit) => unit.id === fighter.id)?.at,
    ).toEqual(GATE_A);
    const other = gateArena({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(4, 4) }],
    });
    const unit = round2UnitAtV7(other, at(4, 4));
    expect(tunnelTileLegalV7(other, P1, unit, GATE_A)).toBe(false);
    expect(tunnelTileLegalV7(other, P1, unit, at(3, 4))).toBe(true);
  });

  it("does not traverse when a Push moves a unit onto a gate", () => {
    const state = gateArena({
      pieces: [
        { seat: 0, role: "JUGGERNAUT", at: at(4, 4) },
        { seat: 1, role: "GUARD", at: at(3, 3) },
      ],
    });
    const juggernaut = round2UnitAtV7(state, at(4, 4));
    const guard = round2UnitAtV7(state, at(3, 3));
    expect(calculateCombatPreviewV7(state, juggernaut.id, guard.id).push).toBe(
      "WILL_PUSH",
    );
    const pushed = apply(state, P1, {
      kind: "ATTACK",
      unitId: juggernaut.id,
      targetUnitId: guard.id,
    });
    expect(kinds(pushed.events)).toContain("UNIT_PUSHED");
    expect(kinds(pushed.events)).not.toContain("GATE_TRAVERSED");
    expect(pushed.state.units.find((unit) => unit.id === guard.id)?.at).toEqual(
      GATE_A,
    );
  });

  it("explores a gate's partner in the same reveal", () => {
    const hidden = new Set([
      "1,1",
      "2,1",
      "3,1",
      "1,2",
      "2,2",
      "3,2",
      "1,3",
      "2,3",
      "3,3",
      "17,17",
    ]);
    const explored: CoordV7[] = [];
    for (let y = 0; y < 20; y += 1)
      for (let x = 0; x < 20; x += 1)
        if (!hidden.has(`${x},${y}`)) explored.push(at(x, y));
    const state = gateArena({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(4, 4) }],
      explored: { 0: explored },
    });
    const fighter = round2UnitAtV7(state, at(4, 4));
    const result = apply(state, P1, {
      kind: "MOVE",
      unitId: fighter.id,
      path: [at(3, 3)],
    });
    const reveal = result.events.find(
      (event) => event.kind === "TILES_REVEALED",
    );
    if (reveal?.kind !== "TILES_REVEALED") throw new Error("no reveal");
    expect(reveal.tiles).toContainEqual(GATE_A);
    expect(reveal.tiles).toContainEqual(GATE_B);
    const player = result.state.players.find((entry) => entry.id === P1);
    expect(player?.explored).toContainEqual(GATE_B);
    expect(viewForV7(result.state, P1).curiosities).toEqual(GATES);
  });
});

describe("the Wishing Well (section 30)", () => {
  const wellArena = (
    options: Round2ArenaOptionsV7 = {},
    tossedBy: readonly PlayerId[] = [],
  ) =>
    round2ArenaV7({
      pieces: [{ seat: 0, role: "FIGHTER", at: WELL, hp: 4 }],
      ...options,
      curiosities: [
        { kind: "WISHING_WELL", at: WELL, tossedBy },
        ...(options.curiosities ?? []),
      ],
    });
  const toss = (state: GameStateV7, unitAt: CoordV7 = WELL): CommandV7 => ({
    kind: "TOSS_COIN",
    unitId: round2UnitAtV7(state, unitAt).id,
  });
  /** The arena with the setup seed whose draw gives player 1 `outcome`. */
  const withOutcome = (state: GameStateV7, outcome: WellOutcomeV7) => {
    for (let seed = 0; seed < 200; seed += 1)
      if (wellOutcomeV7(seed, P1) === outcome)
        return checkedV7({ ...state, setup: { ...state.setup, seed } });
    throw new Error(outcome);
  };

  it("checks legality in order: the Well, a primary action, once per player, a Coin", () => {
    const off = round2ArenaV7({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(4, 7) }],
      curiosities: [{ kind: "WISHING_WELL", at: WELL, tossedBy: [] }],
    });
    expect(rejection(off, P1, toss(off, at(4, 7)))).toEqual({
      code: "TOSS_COIN_NOT_LEGAL",
      params: { reason: "NOT_ON_WELL" },
    });
    const acted = wellArena(
      {
        pieces: [
          {
            seat: 0,
            role: "FIGHTER",
            at: WELL,
            activation: { attacked: true, attacksUsed: 1 },
          },
        ],
      },
      [P1],
    );
    expect(rejection(acted, P1, toss(acted)).code).toBe("UNIT_ALREADY_ACTED");
    const tossed = wellArena({}, [P1]);
    expect(rejection(tossed, P1, toss(tossed))).toEqual({
      code: "TOSS_COIN_NOT_LEGAL",
      params: { reason: "ALREADY_TOSSED" },
    });
    const poor = wellArena({ coins: 0 });
    expect(rejection(poor, P1, toss(poor))).toEqual({
      code: "INSUFFICIENT_COINS",
      params: { cost: 1 },
    });
    const foreign = wellArena({
      pieces: [{ seat: 1, role: "FIGHTER", at: WELL }],
    });
    expect(rejection(foreign, P1, toss(foreign)).code).toBe("UNIT_NOT_OWNED");
    // Offered exactly when legal.
    const offered = (state: GameStateV7) =>
      queryPlayerCommandsV7(state, P1).some(
        (command) => command.kind === "TOSS_COIN",
      );
    expect(offered(wellArena())).toBe(true);
    for (const state of [off, acted, tossed, poor])
      expect(offered(state)).toBe(false);
  });

  it("costs a Coin, spends the action, records the player once, and draws per player", () => {
    for (const outcome of WELL_OUTCOMES_V7) {
      const state = withOutcome(wellArena(), outcome);
      const coins = state.players[0]?.coins ?? 0;
      const fighter = round2UnitAtV7(state, WELL);
      const result = apply(state, P1, toss(state));
      expect(result.events[0]).toEqual({
        kind: "COIN_TOSSED",
        playerId: P1,
        unitId: fighter.id,
        at: WELL,
        outcome,
        coinsGained: outcome === "COINS" ? 5 : 0,
        hpAfter: outcome === "HEAL" ? fighter.maxHp : fighter.hp,
      });
      expect(result.state.players[0]?.coins).toBe(
        coins - 1 + (outcome === "COINS" ? 5 : 0),
      );
      const after = result.state.units.find((unit) => unit.id === fighter.id);
      expect(after?.activation.specialActed).toBe(true);
      expect(result.state.curiosities).toEqual([
        { kind: "WISHING_WELL", at: WELL, tossedBy: [P1] },
      ]);
      // The unit's action is spent (row 3 comes before row 4).
      expect(rejection(result.state, P1, toss(result.state)).code).toBe(
        "UNIT_ALREADY_ACTED",
      );
      // The other seat sees the toss (it sees the unit).
      expect(
        projectEventsV7(state, result.state, P2, result.events).events.map(
          (event) => event.kind,
        ),
      ).toContain("COIN_TOSSED");
    }
    // The draw is keyed by seed and player only.
    expect(wellOutcomeV7(7, P1)).toBe(wellOutcomeV7(7, P1));
  });

  it("does not depend on the round or the unit", () => {
    const state = withOutcome(
      wellArena({
        pieces: [
          { seat: 0, role: "FIGHTER", at: at(4, 7) },
          { seat: 0, role: "MARKSMAN", at: at(10, 10) },
        ],
      }),
      "COINS",
    );
    const later = endRound(endRound(state).state).state;
    const marksman = round2UnitAtV7(later, at(10, 10));
    const moved = apply(later, P1, {
      kind: "MOVE",
      unitId: round2UnitAtV7(later, at(4, 7)).id,
      path: [WELL],
    });
    expect(moved.state.round).toBe(3);
    const tossed = apply(moved.state, P1, toss(moved.state));
    expect(tossed.events[0]).toEqual(
      expect.objectContaining({ outcome: "COINS" }),
    );
    expect(marksman.id).toBeGreaterThan(0);
  });

  it("heals nothing on a construct", () => {
    const state = withOutcome(
      round2ArenaV7({
        factions: ["DWARF", "GOBLIN"],
        pieces: [{ seat: 0, role: "MARKSMAN", at: WELL, hp: 3 }],
        curiosities: [{ kind: "WISHING_WELL", at: WELL, tossedBy: [] }],
      }),
      "HEAL",
    );
    const gunner = round2UnitAtV7(state, WELL);
    expect(unitRoleMechanicsV7(state, gunner).construct).toBe(true);
    const result = apply(state, P1, toss(state));
    expect(result.events[0]).toEqual(expect.objectContaining({ hpAfter: 3 }));
    expect(result.state.units.find((unit) => unit.id === gunner.id)?.hp).toBe(
      3,
    );
  });

  it("reveals every tile within 5 of the Well on VISION, a gate's partner with it", () => {
    const explored: CoordV7[] = [];
    for (let y = 0; y < 20; y += 1)
      for (let x = 0; x < 20; x += 1)
        if (Math.max(Math.abs(x - WELL.x), Math.abs(y - WELL.y)) > 1)
          if (!(x === GATE_B.x && y === GATE_B.y)) explored.push(at(x, y));
    const reduced = explored.filter(
      (tile) =>
        Math.max(Math.abs(tile.x - WELL.x), Math.abs(tile.y - WELL.y)) > 5 ||
        (tile.x === 0 && tile.y === 0),
    );
    const state = withOutcome(
      wellArena({
        curiosities: GATES,
        explored: { 0: [...reduced, WELL] },
      }),
      "VISION",
    );
    const result = apply(state, P1, toss(state));
    const reveal = result.events.find(
      (event) => event.kind === "TILES_REVEALED",
    );
    if (reveal?.kind !== "TILES_REVEALED") throw new Error("no reveal");
    expect(reveal.tiles).toContainEqual(at(0, 1));
    expect(reveal.tiles).toContainEqual(at(9, 11));
    expect(reveal.tiles).toContainEqual(GATE_A);
    expect(reveal.tiles).toContainEqual(GATE_B);
    expect(reveal.tiles).not.toContainEqual(at(10, 11));
  });
});

describe("parsing (section 32.2)", () => {
  const base = round2ArenaV7();
  const parse = (patch: Partial<GameStateV7>) =>
    parseGameStateV7(JSON.parse(JSON.stringify({ ...base, ...patch })));

  it("accepts every round-2 kind and rejects broken markers", () => {
    expect(
      parse({
        curiosities: (
          [
            ...GATES,
            { kind: "WISHING_WELL", at: WELL, tossedBy: [P1] },
          ] as CuriosityV7[]
        ).sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x),
      }),
    ).not.toBeNull();
    // A gate without its partner, or naming the wrong one.
    expect(parse({ curiosities: [GATES[0] as CuriosityV7] })).toBeNull();
    expect(
      parse({
        curiosities: [
          { kind: "GATE", at: GATE_A, partner: at(10, 10) },
          { kind: "GATE", at: GATE_B, partner: GATE_A },
        ],
      }),
    ).toBeNull();
    // A toss by a non-seat, or unsorted.
    expect(
      parse({
        curiosities: [
          { kind: "WISHING_WELL", at: WELL, tossedBy: [7 as PlayerId] },
        ],
      }),
    ).toBeNull();
    expect(
      parse({
        curiosities: [{ kind: "WISHING_WELL", at: WELL, tossedBy: [P2, P1] }],
      }),
    ).toBeNull();
    // Two camps.
    expect(
      parse({
        curiosities: [
          { kind: "DOWNED_SAUCER", at: SAUCER },
          { kind: "GRAVEYARD", at: at(15, 10) },
        ],
      }),
    ).toBeNull();
  });

  it("rejects the faction exclusions and a camp with a Spider", () => {
    const martian = round2ArenaV7({ factions: ["MARTIAN", "GOBLIN"] });
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...martian,
            curiosities: [{ kind: "DOWNED_SAUCER", at: SAUCER }],
          }),
        ),
      ),
    ).toBeNull();
    const undead = round2ArenaV7({ factions: ["UNDEAD", "GOBLIN"] });
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...undead,
            curiosities: [{ kind: "GRAVEYARD", at: SAUCER }],
          }),
        ),
      ),
    ).toBeNull();
    expect(() =>
      round2ArenaV7({
        curiosities: [{ kind: "DOWNED_SAUCER", at: SAUCER }],
        neutrals: [{ breed: "GIANT_SPIDER", home: at(15, 10) }],
      }),
    ).toThrow();
    // A guard whose home is not its camp's centre, or on the centre.
    expect(() =>
      round2ArenaV7({
        curiosities: [{ kind: "GRAVEYARD", at: SAUCER }],
        neutrals: [{ breed: "GRUNT", home: SAUCER, at: at(5, 8) }],
      }),
    ).toThrow();
    expect(() =>
      round2ArenaV7({
        curiosities: [{ kind: "DOWNED_SAUCER", at: SAUCER }],
        neutrals: [{ breed: "GRUNT", home: SAUCER, at: SAUCER }],
      }),
    ).toThrow();
    // Bigfoot off its habitat (Grass).
    expect(() =>
      round2ArenaV7({ neutrals: [{ breed: "BIGFOOT", home: at(15, 10) }] }),
    ).toThrow();
  });

  it("round-trips a save mid-match: after a toss, a traversal, and a neutral turn", () => {
    // Section 35.2: saves mid-match with the round-2 kinds. A Grunt guards
    // the saucer, a Fighter tosses at the Well, another traverses a gate,
    // and the round ends (the neutral turn runs); every state on the way
    // survives a save unchanged.
    let state = round2ArenaV7({
      pieces: [
        { seat: 0, role: "FIGHTER", at: WELL },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "FIGHTER", at: at(7, 9) },
      ],
      curiosities: [
        ...GATES,
        { kind: "WISHING_WELL", at: WELL, tossedBy: [] },
        { kind: "DOWNED_SAUCER", at: SAUCER },
      ],
      neutrals: [{ breed: "GRUNT", home: SAUCER, at: at(6, 8) }],
    });
    const save = (current: GameStateV7) =>
      parseGameStateV7(JSON.parse(JSON.stringify(current)));
    expect(save(state)).toEqual(state);
    state = apply(state, P1, {
      kind: "TOSS_COIN",
      unitId: round2UnitAtV7(state, WELL).id,
    }).state;
    expect(
      state.curiosities.find((curiosity) => curiosity.kind === "WISHING_WELL"),
    ).toEqual({ kind: "WISHING_WELL", at: WELL, tossedBy: [P1] });
    expect(save(state)).toEqual(state);
    state = apply(state, P1, {
      kind: "MOVE",
      unitId: round2UnitAtV7(state, at(3, 3)).id,
      path: [GATE_A],
    }).state;
    expect(round2UnitAtV7(state, GATE_B)).toBeDefined();
    expect(save(state)).toEqual(state);
    const round = endRound(state);
    expect(kinds(round.events)).toContain("NEUTRAL_TURN_ENDED");
    expect(kinds(round.events)).toContain("COMBAT_RESOLVED");
    expect(save(round.state)).toEqual(round.state);
  });

  it("rejects a neutral unit whose role or max HP is not its breed's", () => {
    const state = saucerArena([{ breed: "GRUNT", home: SAUCER, at: at(5, 8) }]);
    const grunt = neutralOf(state, "GRUNT").unit;
    const patched = (unit: UnitStateV7) =>
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...state,
            units: state.units.map((candidate) =>
              candidate.id === unit.id ? unit : candidate,
            ),
          }),
        ),
      );
    expect(patched(grunt)).not.toBeNull();
    expect(patched({ ...grunt, maxHp: 8, hp: 8 })).toBeNull();
    expect(patched({ ...grunt, role: "GUARD" })).toBeNull();
  });
});
