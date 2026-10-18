import { describe, expect, it } from "vitest";
import {
  GANG_UP_ATTACK_PER_HELPER_V7,
  MIND_CONTROL_LIMIT_V7,
  MIND_CONTROL_RANGE_V7,
  TECHNOLOGY_IDS_V7,
  calculateCombatPreviewV7,
  controlledByBrainV7,
  gangUpBonusV7,
  isMindControlledV7,
  mindControlTargetBlockV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type PublicUnitV7,
  type UnitId,
} from "../../src/engine/index";
import {
  gangUpForPolicyV7,
  gangUpMaximumAttackV7,
  gangUpWithHelpersV7,
} from "../../src/ai/v7-goblin";
import { withHorrorV7, withStrandsV7 } from "../fixtures/v7-cult";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import { navalUnitAtV7 } from "../fixtures/v7-naval-branch";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  expectOfferedAcceptedV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  MARTIAN_BOLDER_V7,
  martianBolderCapFixtureV7,
  martianBolderTargetsFixtureV7,
} from "../fixtures/v7-martian-ui";
import { at, kindsV7, withoutTechsV7 } from "../fixtures/v7-revision20";

// Bolder abilities (`pulp_wars-w49.42`, 7r99; the user, 2026-10-18: "any
// adjacent unit gets mind controlled. limit 3 at a time ... make it +2
// instead of +1"). The Brain takes any hostile unit next to it, at any HP,
// of any size or form, three at a time; Gang Up adds +2 Attack a helper.

const BRAIN = at(4, 3);

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const control = (
  state: GameStateV7,
  brain: CoordV7,
  target: CoordV7,
): CommandV7 => ({
  kind: "MIND_CONTROL",
  unitId: idAt(state, brain),
  targetUnitId: idAt(state, target),
});

/** A Martian Brain of seat 0 on (4, 3) against seat 1 of `enemy`. */
const brainAgainst = (
  enemy: Parameters<typeof martianFieldV7>[1] extends infer O
    ? O extends { readonly factions?: readonly (infer F)[] }
      ? F
      : never
    : never,
  more: readonly MartianPieceV7[],
  options: Parameters<typeof martianFieldV7>[1] = {},
) =>
  martianFieldV7([{ seat: 0, role: "CAPTAIN", at: BRAIN }, ...more], {
    factions: ["MARTIAN", enemy],
    ...options,
  });

/** Ends turns round to seat 0 and back to it again: the state stays valid. */
const roundTrip = (state: GameStateV7): GameStateV7 => {
  const other = seatIdV7(state, 1);
  const own = seatIdV7(state, 0);
  return endTurnUntilV7(endTurnUntilV7(state, other).state, own).state;
};

describe("bolder abilities: the Brain takes any adjacent unit (7r99)", () => {
  it("the rule's numbers: reach 1, three at a time", () => {
    expect(MIND_CONTROL_RANGE_V7).toBe(1);
    expect(MIND_CONTROL_LIMIT_V7).toBe(3);
  });

  it("takes a full-HP giant, which keeps fighting for it through the turns", () => {
    const state = brainAgainst("ORIGINAL", [
      { seat: 1, role: "JUGGERNAUT", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const giant = unitAtV7(state, at(5, 3));
    expect(giant.hp).toBe(giant.maxHp);
    expect(expectOfferedAcceptedV7(state, "MIND_CONTROL")).toEqual([
      control(state, BRAIN, at(5, 3)),
    ]);
    const run = playV7(state, control(state, BRAIN, at(5, 3)));
    expect(unitAtV7(run.state, at(5, 3))).toMatchObject({
      ownerId: seatIdV7(state, 0),
      hp: giant.maxHp,
      homeCityId: null,
    });
    expect(isMindControlledV7(run.state, giant.id)).toBe(true);
    const later = roundTrip(run.state);
    expect(unitAtV7(later, at(5, 3)).ownerId).toBe(seatIdV7(state, 0));
  });

  it("takes a construct, a unit on a village center, and one on its own capital", () => {
    // A Dwarf Gunner (a construct) and a Hammerer on the village (5, 5);
    // the Brain on (4, 4).
    const dwarf = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 4) },
        { seat: 1, role: "MARKSMAN", at: at(3, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 5) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "DWARF"] },
    );
    const offered = expectOfferedAcceptedV7(dwarf, "MIND_CONTROL");
    expect(offered).toHaveLength(2);
    expect(offered).toEqual(
      expect.arrayContaining([
        control(dwarf, at(4, 4), at(3, 4)),
        control(dwarf, at(4, 4), at(5, 5)),
      ]),
    );
    playV7(dwarf, control(dwarf, at(4, 4), at(5, 5)));
    // A Guard garrisoning seat 1's capital (2, 8), the Brain beside it.
    const garrison = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(3, 7) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
      ],
      { factions: ["MARTIAN", "ORIGINAL"] },
    );
    const run = playV7(garrison, control(garrison, at(3, 7), at(2, 8)));
    expect(unitAtV7(run.state, at(2, 8)).ownerId).toBe(seatIdV7(garrison, 0));
    roundTrip(run.state);
  });

  it("takes a ship, a sea beast, and an embarked unit; afloat on Deep Water only with Navigation", () => {
    const pieces: readonly MartianPieceV7[] = [
      // A Kraken (the Cult's sea beast), a Gondola, and an embarked Initiate.
      { seat: 1, role: "SUBMARINE", at: at(5, 2), form: "NAVAL" },
      { seat: 1, role: "PATROL_BOAT", at: at(5, 3), form: "NAVAL" },
      { seat: 1, role: "FIGHTER", at: at(5, 4), form: "EMBARKED" },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ];
    const water = [at(5, 2), at(5, 3), at(5, 4)];
    const state = brainAgainst("CULT", pieces, { water });
    const offered = expectOfferedAcceptedV7(state, "MIND_CONTROL");
    expect(offered).toHaveLength(3);
    for (const where of water) {
      const run = playV7(state, control(state, BRAIN, where));
      expect(unitAtV7(run.state, where).ownerId).toBe(seatIdV7(state, 0));
      roundTrip(run.state);
    }
    // On Deep Water without Navigation: DEEP_WATER, and not offered.
    const deep = brainAgainst("CULT", pieces, {
      deepWater: [at(5, 3)],
      water: [at(5, 2), at(5, 4)],
      techs: { 0: withoutTechsV7("MARTIAN", "NAVIGATION") },
    });
    expect(rejectedV7(deep, control(deep, BRAIN, at(5, 3)))).toEqual({
      code: "MIND_CONTROL_NOT_LEGAL",
      params: { reason: "DEEP_WATER" },
    });
    expect(
      offeredV7(deep, "MIND_CONTROL").some(
        (command) =>
          command.kind === "MIND_CONTROL" &&
          command.targetUnitId === idAt(deep, at(5, 3)),
      ),
    ).toBe(false);
  });

  it("a ship whose Brain is lost on Deep Water, its owner without Navigation, is lost", () => {
    // The Martian (with Navigation) holds the ship on Deep Water; its
    // original owner has no Navigation.
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        {
          seat: 1,
          role: "PATROL_BOAT",
          at: at(5, 3),
          form: "NAVAL",
          controlledBy: BRAIN,
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["MARTIAN", "ORIGINAL"],
        water: [at(5, 3)],
        deepWater: [at(6, 3)],
        techs: { 1: withoutTechsV7("ORIGINAL", "NAVIGATION") },
      },
    );
    const ship = idAt(state, at(5, 3));
    const sailed = playV7(state, {
      kind: "MOVE",
      unitId: ship,
      path: [at(6, 3)],
    }).state;
    // Its Brain is lost (disbanded) there: the ship is lost too (no seat
    // holds a unit afloat on Deep Water without Navigation), as a unit
    // released to an eliminated owner is.
    const brain = idAt(state, BRAIN);
    const run = playV7(sailed, { kind: "DISBAND", unitId: brain });
    expect(run.state.units.some((unit) => unit.id === ship)).toBe(false);
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: ship,
      cause: "BRAIN_LOST",
    });
    // On Shallow Water it goes home.
    const home = playV7(state, { kind: "DISBAND", unitId: brain });
    expect(unitAtV7(home.state, at(5, 3)).ownerId).toBe(seatIdV7(state, 1));
  });

  it("a ship a Brain holds that another seat boards is the boarder's, of its kind, and no longer held", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        {
          seat: 1,
          role: "PATROL_BOAT",
          at: at(5, 3),
          form: "NAVAL",
          hp: 2,
          controlledBy: BRAIN,
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        { seat: 2, role: "PATROL_BOAT", at: at(6, 3), form: "NAVAL" },
        { seat: 2, role: "FIGHTER", at: at(9, 1) },
      ],
      {
        factions: ["MARTIAN", "GOBLIN", "ORIGINAL"],
        water: [at(5, 3), at(6, 3)],
        activeSeat: 2,
        techs: { 2: TECHNOLOGY_IDS_V7 },
      },
    );
    const ship = idAt(state, at(5, 3));
    const run = applyOkV7(state, seatIdV7(state, 2), {
      kind: "BOARD",
      unitId: idAt(state, at(6, 3)),
      targetUnitId: ship,
    });
    expect(unitAtV7(run.state, at(5, 3)).ownerId).toBe(seatIdV7(state, 2));
    expect(isMindControlledV7(run.state, ship)).toBe(false);
  });

  it("takes an Ice Folk unit standing on ice", () => {
    const state = frozenArenaV7({
      factions: ["MARTIAN", "ICE_FOLK"],
      units: [
        { seat: 0, role: "CAPTAIN", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 3) },
        { seat: 1, role: "FIGHTER", at: at(2, 9) },
      ],
      ice: [{ at: at(2, 3), seat: 1 }],
    });
    const brain = navalUnitAtV7(state, at(2, 2));
    const target = navalUnitAtV7(state, at(2, 3));
    expect(target.form).toBe("LAND");
    const command: CommandV7 = {
      kind: "MIND_CONTROL",
      unitId: brain.id,
      targetUnitId: target.id,
    };
    expect(expectOfferedAcceptedV7(state, "MIND_CONTROL")).toEqual([command]);
    const run = playV7(state, command);
    expect(isMindControlledV7(run.state, target.id)).toBe(true);
  });

  it("an Abomination taken spits out the victim it holds; under control it has no Swallow", () => {
    // Seat 1's Abomination swallows seat 0's Grunt on its turn, then the
    // Brain beside it takes it.
    const base = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 5 },
        { seat: 1, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const grunt = idAt(base, at(6, 3));
    const swallowed = applyOkV7(base, seatIdV7(base, 1), {
      kind: "SWALLOW",
      unitId: idAt(base, at(5, 3)),
      targetUnitId: grunt,
    }).state;
    expect(swallowed.giants.swallowed.map((entry) => entry.unit.id)).toEqual([
      grunt,
    ]);
    const state = endTurnUntilV7(swallowed, seatIdV7(base, 0)).state;
    const run = playV7(state, control(state, BRAIN, at(5, 3)));
    expect(run.state.giants.swallowed).toEqual([]);
    // The first free land tile around (5, 3) in (y, x) order: (4, 2).
    const released = run.state.units.find((unit) => unit.id === grunt);
    expect(released).toMatchObject({
      ownerId: seatIdV7(state, 0),
      at: at(4, 2),
      form: "LAND",
    });
    expect(kindsV7(run.events)).toContain("SWALLOWED_UNIT_RELEASED");
    const abomination = unitAtV7(run.state, at(5, 3));
    expect(unitRoleRuleV7(run.state, abomination).abilities).not.toContain(
      "SWALLOW",
    );
    roundTrip(run.state);
  });

  it("takes a bound daemon: its strands go, and no Start Turn check Unbinds it while the Brain holds it", () => {
    const field = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(7, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "CULT"] },
    );
    const state = withStrandsV7(withHorrorV7(field, 1, at(5, 3)), at(5, 3), [
      at(7, 3),
    ]);
    const horror = idAt(state, at(5, 3));
    const run = playV7(state, control(state, BRAIN, at(5, 3)));
    expect(run.state.cult.strands).toEqual([]);
    expect(isMindControlledV7(run.state, horror)).toBe(true);
    const later = endTurnUntilV7(
      endTurnUntilV7(run.state, seatIdV7(state, 1)).state,
      seatIdV7(state, 0),
    );
    expect(kindsV7(later.events)).not.toContain("DAEMON_UNBOUND");
    expect(unitAtV7(later.state, at(5, 3))).toMatchObject({
      ownerId: seatIdV7(state, 0),
      summoned: "HORROR",
    });
  });

  it("never takes an Egg or a neutral unit, nor reaches past the eight tiles around it", () => {
    // An Egg in its owner's territory beside the Brain on (3, 6); a
    // Caveman two tiles away. (A neutral unit: the curiosities tests.)
    const brain = at(3, 6);
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: brain },
        { seat: 1, role: "FIGHTER", at: at(5, 6) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["MARTIAN", "DINOSAUR"],
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    expect(rejectedV7(state, control(state, brain, at(2, 7))).params).toEqual({
      reason: "TARGET_IMMUNE",
    });
    expect(rejectedV7(state, control(state, brain, at(5, 6))).params).toEqual({
      reason: "OUT_OF_RANGE",
    });
    expect(offeredV7(state, "MIND_CONTROL")).toEqual([]);
    const egg = unitAtV7(state, at(2, 7));
    expect(egg.form).toBe("EGG");
    expect(
      mindControlTargetBlockV7(
        state,
        { at: brain },
        egg,
        { terrain: "GRASS" },
        true,
      ),
    ).toBe("TARGET_IMMUNE");
  });

  it("controls three at a time: the fourth waits for a release", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "KNIGHT", at: at(3, 2), controlledBy: BRAIN },
        { seat: 1, role: "KNIGHT", at: at(4, 2), controlledBy: BRAIN },
        { seat: 1, role: "KNIGHT", at: at(5, 2), controlledBy: BRAIN },
        { seat: 1, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "ORIGINAL"] },
    );
    expect(
      controlledByBrainV7(state.mindControlled, idAt(state, BRAIN)),
    ).toHaveLength(3);
    expect(offeredV7(state, "MIND_CONTROL")).toEqual([]);
    // Releasing one (Disband on a controlled unit) frees a place.
    const released = playV7(state, {
      kind: "DISBAND",
      unitId: idAt(state, at(3, 2)),
    }).state;
    expect(
      controlledByBrainV7(released.mindControlled, idAt(state, BRAIN)),
    ).toHaveLength(2);
    // (The Knight let go is seat 1's again, next to the Brain: a target.)
    const offered = expectOfferedAcceptedV7(released, "MIND_CONTROL");
    expect(offered).toHaveLength(2);
    expect(offered).toEqual(
      expect.arrayContaining([
        control(released, BRAIN, at(5, 3)),
        control(released, BRAIN, at(3, 2)),
      ]),
    );
  });
});

describe("bolder abilities: the browser review fixtures (7r99)", () => {
  it("offer the four kinds beside the Brain, and nothing at three held", () => {
    const at = MARTIAN_BOLDER_V7;
    const targets = martianBolderTargetsFixtureV7();
    const offered = expectOfferedAcceptedV7(targets, "MIND_CONTROL");
    expect(offered).toHaveLength(4);
    expect(offered).toEqual(
      expect.arrayContaining(
        [at.giant, at.villageKnight, at.battleship, at.boat].map((where) =>
          control(targets, at.brain, where),
        ),
      ),
    );
    const capped = martianBolderCapFixtureV7();
    expect(
      controlledByBrainV7(capped.mindControlled, idAt(capped, at.brain)),
    ).toHaveLength(3);
    expect(offeredV7(capped, "MIND_CONTROL")).toEqual([]);
  });
});

describe("bolder abilities: Gang Up +2 Attack a helper (7r99)", () => {
  const goblins = (helpers: readonly CoordV7[], role = "FIGHTER" as const) =>
    martianFieldV7(
      [
        { seat: 0, role, at: at(4, 4) },
        ...helpers.map((where) => ({
          seat: 0,
          role: "FIGHTER" as const,
          at: where,
        })),
        { seat: 1, role: "GUARD", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["GOBLIN", "ORIGINAL"] },
    );

  it("adds 2 Attack for each own unit beside the target, up to two of them (+4)", () => {
    expect(GANG_UP_ATTACK_PER_HELPER_V7).toBe(2);
    const cases: readonly [readonly CoordV7[], number][] = [
      [[], 0],
      [[at(5, 3)], 2],
      [[at(5, 3), at(5, 5)], 4],
      [[at(5, 3), at(5, 5), at(6, 4)], 4],
    ];
    for (const [helpers, gangUp] of cases) {
      const state = goblins(helpers);
      const attacker = unitAtV7(state, at(4, 4));
      const target = unitAtV7(state, at(5, 4));
      expect(gangUpBonusV7(state, state.units, attacker, target)).toBe(gangUp);
      const preview = calculateCombatPreviewV7(state, attacker.id, target.id);
      expect(preview.gangUp).toBe(gangUp);
      const lone = goblins([]);
      const alone = calculateCombatPreviewV7(
        lone,
        unitAtV7(lone, at(4, 4)).id,
        unitAtV7(lone, at(5, 4)).id,
      );
      // Whole Attack: attack2 is twice the Attack.
      expect(preview.attack2 - alone.attack2).toBe(2 * gangUp);
    }
  });

  it("a Rocket Cart gets at most +2 and a Bomb Chucker's bomb none", () => {
    const rocket = goblins([at(5, 3), at(5, 5)], "CATAPULT" as never);
    const cart = unitAtV7(rocket, at(4, 4));
    expect(
      gangUpBonusV7(rocket, rocket.units, cart, unitAtV7(rocket, at(5, 4))),
    ).toBe(2);
    const bombs = goblins([at(5, 3), at(5, 5)], "MARKSMAN" as never);
    expect(
      gangUpBonusV7(
        bombs,
        bombs.units,
        unitAtV7(bombs, at(4, 4)),
        unitAtV7(bombs, at(5, 4)),
      ),
    ).toBe(0);
  });
});

describe("bolder abilities: the AI reads Gang Up +2 from the rules (7r99)", () => {
  /** A Goblin seat's attacker on (4, 4), helpers on (5, 3) and (5, 5). */
  const mob = (
    role: "FIGHTER" | "CATAPULT" | "MARKSMAN",
    viewer: number,
  ): { readonly state: GameStateV7; readonly view: PlayerViewV7 } => {
    const state = martianFieldV7(
      [
        { seat: 0, role, at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 5) },
        { seat: 1, role: "GUARD", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["GOBLIN", "ORIGINAL"] },
    );
    return { state, view: viewForV7(state, seatIdV7(state, viewer)) };
  };
  const attackerOf = (view: PlayerViewV7): PublicUnitV7 => {
    const unit = view.units.find(
      (candidate) => candidate.at.x === 4 && candidate.at.y === 4,
    );
    if (unit === undefined) throw new Error("no attacker");
    return unit;
  };

  it("every seat's estimate of a Goblin's hit, its own or a hostile one, is +2 a helper", () => {
    for (const viewer of [0, 1]) {
      const { state, view } = mob("FIGHTER", viewer);
      const goblin = attackerOf(view);
      expect(gangUpForPolicyV7(view, goblin, at(5, 4))).toBe(4);
      expect(
        gangUpForPolicyV7(
          view,
          goblin,
          at(5, 4),
          new Set([idAt(state, at(5, 5))]),
        ),
      ).toBe(2);
      expect(gangUpWithHelpersV7(view, goblin, 1)).toBe(2);
      expect(gangUpWithHelpersV7(view, goblin, 5)).toBe(4);
      expect(gangUpMaximumAttackV7(view, goblin)).toBe(4);
    }
  });

  it("the most a rocket gets is +2 and a bomb +0", () => {
    const rockets = mob("CATAPULT", 0).view;
    expect(gangUpMaximumAttackV7(rockets, attackerOf(rockets))).toBe(2);
    expect(gangUpForPolicyV7(rockets, attackerOf(rockets), at(5, 4))).toBe(2);
    const bombs = mob("MARKSMAN", 0).view;
    expect(gangUpMaximumAttackV7(bombs, attackerOf(bombs))).toBe(0);
  });
});
