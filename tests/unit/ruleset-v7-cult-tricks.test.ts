import { describe, expect, it } from "vitest";
import {
  COMMAND_KIND_ORDER_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FROG_DEFENSE2_V7,
  FROG_MOVE_V7,
  HEX_COOLDOWN_TURNS_V7,
  MIND_CONTROLLED_LOST_ABILITIES_V7,
  NEUTRAL_BREEDS_V7,
  NEUTRAL_OWNER_ID_V7,
  NEUTRAL_ROLE_MECHANICS_V7,
  NEUTRAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  RIBBIT_RANGE_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SWITCHEROO_RANGE_V7,
  TECHNOLOGY_IDS_V7,
  TENTACLE_LIFETIME_V7,
  TENTACLE_RANGE_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  canBeFrozenV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  favourOfV7,
  isWildBreedV7,
  joinChantRejectionV7,
  missionByIdV7,
  missionInitialStateV7,
  missionMatchSetupV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  previewMonsterV7,
  previewRibbitV7,
  previewSwitcherooV7,
  previewTentacleV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  technologyCapabilitiesV7,
  tentacleSlapTargetV7,
  trickTakesV7,
  unitIsFrogV7,
  unitIsSeizableV7,
  unitIsTentacleV7,
  unitIsWildV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  validateMissionDefinitionV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { buildMissionStateV7 } from "../../src/engine/v7/missions/build";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cultFieldV7,
  withFrogsV7,
  withHorrorV7,
  withRitualV7,
  withStrandsV7,
  withTentacleV7,
} from "../fixtures/v7-cult";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  at,
  attackV7,
  fieldDefenseV7,
  forestV7,
  mountainV7,
  patchUnitV7,
  unexploreV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E6 (`pulp_wars-mch9.8`,
 * docs/product/RULESET_7_CULTISTS.md sections 9.1 to 9.3, 8.2, and 8.7):
 * Ribbit and the frog, Switcheroo, the Tentacle and Grab, Pamphlets, and
 * the hand-play lab `LAB_CULT_MID` (built, not played). The Cult redesign's
 * roster (`pulp_wars-mch9.31`): Pick Me! retired with the Chosen, and the
 * Tentacle is the Summoner's, with Tentacles (the Cult `CHIVALRY`).
 *
 * Every state here is built by hand; no match is played. The field is the
 * two-seat 11 x 11 board of `fieldV7`: seat 0 (the Cult) capital (8, 8)
 * with territory x 7 to 9, y 7 to 9; seat 1 (Human unless a case says
 * otherwise) capital (2, 8) with territory x 1 to 3, y 7 to 9; villages on
 * (5, 5), (8, 5), and (5, 8); everything else open Grass, all of it explored
 * by both seats. The Cult's roles: `FIGHTER` Initiate, `GUARD` Idol Bearer,
 * `RAIDER` Familiar, `MARKSMAN` Hexer, `CAPTAIN` Summoner (and the vacant
 * `KNIGHT` and `SWORDSMAN`).
 */

function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

const cultId = (state: GameStateV7): PlayerId => seatIdV7(state, 0);
const otherId = (state: GameStateV7): PlayerId => seatIdV7(state, 1);
const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;
const unitOf = (state: GameStateV7, unitId: number) =>
  state.units.find((unit) => unit.id === unitId);

const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

/** Ends turns until the Cult's turn has started. */
const toCultTurn = (state: GameStateV7) => endTurnUntilV7(state, cultId(state));
/** Ends turns until the other seat's turn has started. */
const toOtherTurn = (state: GameStateV7) =>
  endTurnUntilV7(state, otherId(state));

/** The Cult's technologies without `without` and what needs it. */
const techsWithout = (without: TechnologyIdV7): readonly TechnologyIdV7[] =>
  withoutTechsV7("CULT", without);

const targeted = (
  kind: "RIBBIT" | "SWITCHEROO",
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): CommandV7 => ({
  kind,
  unitId: idAt(state, from),
  targetUnitId: idAt(state, to),
});

const HEXER = at(5, 2);
const FAMILIAR = at(5, 2);
/** The Summoner that calls the Tentacle (the retired Caller's tile). */
const CALLER = at(5, 2);

describe("tricks: identity and registration", () => {
  // The spread villages (`pulp_wars-9s0.12`) took 7r79, so 7r78 is a prior
  // identity.
  it("was 7r78 after 7r77, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r113");
    expect(PRIOR_RULESET_7_IDS.slice(-36, -34)).toEqual([
      "pulp-wars-poc-7r77",
      "pulp-wars-poc-7r78",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r113.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-36, -34)).toEqual([
      "pulpWars.save.v7r77.current",
      "pulpWars.save.v7r78.current",
    ]);
    // A state of the rituals' identity is not read as a current one.
    const state = cultFieldV7([]);
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r77" }),
    ).toBeNull();
  });

  it("orders the three commands and the five events after the rituals'", () => {
    const commands = COMMAND_KIND_ORDER_V7 as readonly string[];
    const from = commands.indexOf("PROCLAIM");
    expect(commands.slice(from, from + 8)).toEqual([
      "PROCLAIM",
      "RIBBIT",
      "SWITCHEROO",
      "TENTACLE",
      // The Cult redesign (`pulp_wars-mch9.34`): joining a star's chant.
      "JOIN_CHANT",
      // Map curiosities round 3 (`pulp_wars-737.20`).
      "ZAP",
      "FIRE_MOON_GUN",
      "CAPTURE",
    ]);
    const events = DOMAIN_EVENT_KIND_ORDER_V7 as readonly string[];
    const cowed = events.indexOf("CITY_COWED");
    expect(events.slice(cowed, cowed + 7)).toEqual([
      "CITY_COWED",
      "UNIT_FROGGED",
      "UNITS_SWAPPED",
      "TENTACLE_ROSE",
      "UNIT_GRABBED",
      "TENTACLE_SANK",
      "SPOILS_AWARDED",
    ]);
    // Pick Me! retired with the Chosen (`pulp_wars-mch9.31`).
    expect(commands).not.toContain("PICK_ME");
    expect(events).not.toContain("PICK_ME_SHOUTED");
  });

  it("parses the three commands and nothing near them", () => {
    for (const kind of ["RIBBIT", "SWITCHEROO"] as const) {
      expect(parseCommandV7({ kind, unitId: 3, targetUnitId: 4 })).toEqual({
        ok: true,
        value: { kind, unitId: 3, targetUnitId: 4 },
      });
      expect(parseCommandV7({ kind, unitId: 3 }).ok).toBe(false);
      expect(parseCommandV7({ kind, unitId: 3, victimUnitId: 4 }).ok).toBe(
        false,
      );
    }
    expect(
      parseCommandV7({ kind: "TENTACLE", unitId: 3, at: { x: 1, y: 2 } }),
    ).toEqual({
      ok: true,
      value: { kind: "TENTACLE", unitId: 3, at: { x: 1, y: 2 } },
    });
    expect(parseCommandV7({ kind: "TENTACLE", unitId: 3 }).ok).toBe(false);
    // Pick Me! is no command any more.
    expect(parseCommandV7({ kind: "PICK_ME", unitId: 3 }).ok).toBe(false);
  });

  it("holds the spec's numbers", () => {
    expect([
      RIBBIT_RANGE_V7,
      FROG_DEFENSE2_V7 / 2,
      FROG_MOVE_V7,
      HEX_COOLDOWN_TURNS_V7,
      SWITCHEROO_RANGE_V7,
      TENTACLE_RANGE_V7,
      TENTACLE_LIFETIME_V7,
      // Switcheroo reaches 4 since the Cult redesign (`pulp_wars-mch9.34`).
    ]).toEqual([2, 0.5, 1, 2, 4, 3, 3]);
  });

  it("gives each trick to its unit and to no other role of any faction", () => {
    const owners = {
      PAMPHLETS: "FIGHTER",
      SWITCHEROO: "RAIDER",
      RIBBIT: "MARKSMAN",
      // The Cult redesign (`pulp_wars-mch9.31`): the Summoner's.
      TENTACLE: "CAPTAIN",
    } as const;
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7) {
        const abilities = effectiveRoleRuleV7(role, faction).abilities;
        for (const [ability, owner] of Object.entries(owners))
          expect(
            abilities.includes(ability as keyof typeof owners),
            `${faction} ${role} ${ability}`,
          ).toBe(faction === "CULT" && role === owner);
        expect(abilities.includes("GRAB"), `${faction} ${role}`).toBe(false);
      }
    // Switcheroo is the Cult's Scouting (Familiars).
    const scouting = need(
      factionTreeV7("CULT").nodes.find((node) => node.id === "SCOUTING"),
    );
    expect(scouting.unlocks.map((unlock) => unlock.kind)).toContain(
      "SWITCHEROO",
    );
    for (const faction of FACTION_IDS_V7)
      expect(
        technologyCapabilitiesV7([...TECHNOLOGY_IDS_V7], faction).switcheroo,
        faction,
      ).toBe(faction === "CULT");
    expect(
      technologyCapabilitiesV7(techsWithout("SCOUTING"), "CULT").switcheroo,
    ).toBe(false);
    // The Tentacle is the Cult's Chivalry (Tentacles).
    const chivalry = need(
      factionTreeV7("CULT").nodes.find((node) => node.id === "CHIVALRY"),
    );
    expect(chivalry.unlocks.map((unlock) => unlock.kind)).toContain(
      "TENTACLES",
    );
    for (const faction of FACTION_IDS_V7)
      expect(
        technologyCapabilitiesV7([...TECHNOLOGY_IDS_V7], faction).tentacles,
        faction,
      ).toBe(faction === "CULT");
    expect(
      technologyCapabilitiesV7(techsWithout("CHIVALRY"), "CULT").tentacles,
    ).toBe(false);
    // Unit tricks follow a mind-controlled unit; a Tentacle needs a Cult
    // seat.
    expect(MIND_CONTROLLED_LOST_ABILITIES_V7).toContain("TENTACLE");
    for (const ability of ["RIBBIT", "SWITCHEROO", "PAMPHLETS"])
      expect(MIND_CONTROLLED_LOST_ABILITIES_V7).not.toContain(ability);
  });

  it("registers the Tentacle as a neutral breed: rooted, no living thing, and nobody's", () => {
    // (The Unbound Imp and Gibbering Mass follow it: the Cult redesign,
    // `pulp_wars-mch9.36` and `pulp_wars-mch9.37`; then the Sea Serpent,
    // `pulp_wars-737.21`.)
    expect(NEUTRAL_BREEDS_V7.at(-4)).toBe("TENTACLE");
    expect(isWildBreedV7("TENTACLE")).toBe(true);
    expect(isWildBreedV7("GIANT_SPIDER")).toBe(false);
    const rule = NEUTRAL_ROLE_RULES_V7.TENTACLE;
    const summoned = CULT_SUMMONED_ROLE_RULES_V7.TENTACLE;
    expect(rule).toMatchObject({
      role: "JUGGERNAUT",
      label: "Tentacle",
      cost: null,
      technology: null,
      maxHp: summoned.maxHp,
      attack2: summoned.attack2,
      defense2: summoned.defense2,
      move: 0,
      range: 1,
      sightRadius: 0,
      abilities: ["ATTACK", "GRAB"],
    });
    expect([rule.maxHp, rule.attack2 / 2, rule.defense2 / 2]).toEqual([
      8, 3, 1,
    ]);
    expect(NEUTRAL_ROLE_MECHANICS_V7.TENTACLE).toMatchObject({
      construct: true,
      immovable: true,
      advancesAfterKill: false,
    });
    expect(summoned.value).toBe(0);
  });
});

// ------------------------------------------------------------ Ribbit ---

describe("Ribbit and the frog (section 9.1)", () => {
  const field = (
    pieces: readonly GoblinPieceV7[],
    options: Parameters<typeof cultFieldV7>[1] = {},
  ) =>
    cultFieldV7([{ seat: 0, role: "MARKSMAN", at: HEXER }, ...pieces], options);

  it("turns a hostile unit within 2 into a frog and spends the Hexer's action and its next turn's Ribbit", () => {
    const state = field([{ seat: 1, role: "KNIGHT", at: at(5, 4) }]);
    const command = targeted("RIBBIT", state, HEXER, at(5, 4));
    const hexer = idAt(state, HEXER);
    const knight = idAt(state, at(5, 4));
    const view = viewForV7(state, cultId(state));
    expect(previewRibbitV7(view, hexer, knight)).toEqual({
      unitId: hexer,
      targetUnitId: knight,
      targetOwnerId: otherId(state),
      at: at(5, 4),
      defense2After: 1,
      moveAfter: 1,
      holdsStrand: false,
      inRitual: false,
      cooldownTurns: 2,
    });
    const cast = playV7(state, command);
    expect(cast.events).toEqual([
      {
        kind: "UNIT_FROGGED",
        playerId: cultId(state),
        unitId: hexer,
        targetUnitId: knight,
        targetOwnerId: otherId(state),
        at: at(5, 4),
      },
    ]);
    expect(cast.state.cult.frogs).toEqual([knight]);
    expect(cast.state.cult.hexCooldowns).toEqual([
      { unitId: hexer, turnsRemaining: 2 },
    ]);
    expect(unitIsFrogV7(cast.state, { id: knight })).toBe(true);
    expect(unitOf(cast.state, hexer)?.activation).toMatchObject({
      specialActed: true,
      handled: true,
      attacked: false,
    });
    // It is public: both seats see the frog and the spent Hexer.
    for (const viewer of [cultId(state), otherId(state)]) {
      const seen = viewForV7(cast.state, viewer);
      expect(seen.cult.frogs).toEqual([knight]);
      expect(seen.cult.hexCooldowns).toEqual([
        { unitId: hexer, turnsRemaining: 2 },
      ]);
      expect(
        projectEventsV7(state, cast.state, viewer, cast.events).events.map(
          (event) => event.kind,
        ),
      ).toEqual(["UNIT_FROGGED"]);
    }
    // The Hexer has used its action.
    expect(rejectedV7(cast.state, command).code).toBe("UNIT_ALREADY_ACTED");
  });

  it("may follow the Hexer's Move, and takes the place of its attack", () => {
    const state = field([{ seat: 1, role: "FIGHTER", at: at(5, 5 - 1) }]);
    const moved = applyOkV7(state, cultId(state), {
      kind: "MOVE",
      unitId: idAt(state, HEXER),
      path: [at(4, 2)],
    }).state;
    const cast = playV7(moved, targeted("RIBBIT", moved, at(4, 2), at(5, 4)));
    expect(offeredV7(cast.state, "ATTACK")).toEqual([]);
  });

  it("leaves a frog one hop and nothing else until its owner's turn ends", () => {
    // A Knight (Move 2) with a Cult Initiate beside it.
    const state = field([
      { seat: 0, role: "FIGHTER", at: at(4, 5) },
      { seat: 1, role: "KNIGHT", at: at(5, 4) },
    ]);
    const knight = idAt(state, at(5, 4));
    const cast = playV7(state, targeted("RIBBIT", state, HEXER, at(5, 4)));
    const turn = toOtherTurn(cast.state).state;
    // Still a frog in its own turn.
    expect(turn.cult.frogs).toEqual([knight]);
    const offered = offeredV7(turn).filter(
      (command) => "unitId" in command && command.unitId === knight,
    );
    expect(new Set(offered.map((command) => command.kind))).toEqual(
      new Set(["MOVE", "WAIT", "DISBAND"]),
    );
    // Move 1 whatever its role.
    for (const command of offered)
      if (command.kind === "MOVE") expect(command.path).toHaveLength(1);
    expect(
      rejectedV7(turn, {
        kind: "MOVE",
        unitId: knight,
        path: [at(6, 4), at(7, 4)],
      }).code,
    ).toBe("MOVEMENT_ILLEGAL");
    // No attack.
    expect(
      rejectedV7(turn, {
        kind: "ATTACK",
        unitId: knight,
        targetUnitId: idAt(turn, at(4, 5)),
      }),
    ).toEqual({ code: "UNIT_FROGGED", params: { unitId: knight } });
    // It hops, and is itself again when its owner's turn ends.
    const hopped = playV7(turn, {
      kind: "MOVE",
      unitId: knight,
      path: [at(6, 4)],
    }).state;
    expect(hopped.cult.frogs).toEqual([knight]);
    const ended = applyOkV7(hopped, otherId(hopped), { kind: "END_TURN" });
    expect(ended.state.cult.frogs).toEqual([]);
    expect(viewForV7(ended.state, cultId(state)).cult.frogs).toEqual([]);
  });

  it("makes a frog soft: Defense 0.5 flat, no fortification, no cover, no strike back", () => {
    // The spec's numbers (section 9.1): an Initiate deals a frogged Fighter
    // 5 and a frogged Knight 5, and takes nothing (7 each before the Cult
    // redesign's Attack 1.5 Initiate, `pulp_wars-mch9.31`).
    for (const [role, left] of [
      ["FIGHTER", 7],
      ["KNIGHT", 8],
    ] as const) {
      const open = cultFieldV7([
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role, at: at(5, 4) },
      ]);
      const plain = attackV7(open, at(5, 3), at(5, 4));
      expect(plain.combat.retaliation, role).toBe(true);
      const frogged = attackV7(
        withFrogsV7(open, [at(5, 4)]),
        at(5, 3),
        at(5, 4),
      );
      expect(frogged.combat, role).toMatchObject({
        damageToDefender: 5,
        retaliation: false,
        damageToAttacker: 0,
      });
      expect(frogged.target?.hp, role).toBe(left);
    }
    // A Guard in Forest on a Field Defense in its own land is as soft as
    // one in the open.
    const dugIn = fieldDefenseV7(
      forestV7(
        cultFieldV7([
          { seat: 0, role: "FIGHTER", at: at(4, 8) },
          { seat: 1, role: "GUARD", at: at(3, 8) },
        ]),
        at(3, 8),
      ),
      at(3, 8),
    );
    const covered = attackV7(dugIn, at(4, 8), at(3, 8));
    const soft = attackV7(withFrogsV7(dugIn, [at(3, 8)]), at(4, 8), at(3, 8));
    const bare = attackV7(
      withFrogsV7(
        cultFieldV7([
          { seat: 0, role: "FIGHTER", at: at(4, 5) },
          { seat: 1, role: "GUARD", at: at(4, 6) },
        ]),
        [at(4, 6)],
      ),
      at(4, 5),
      at(4, 6),
    );
    expect(soft.combat.damageToDefender).toBe(bare.combat.damageToDefender);
    expect(soft.combat.damageToDefender).toBeGreaterThan(
      covered.combat.damageToDefender,
    );
    expect(covered.combat.retaliation).toBe(true);
    expect(soft.combat.retaliation).toBe(false);
  });

  it("is back on the second turn after the cast, not the first", () => {
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(6, 4) },
    ]);
    const hexer = idAt(state, HEXER);
    const cast = playV7(state, targeted("RIBBIT", state, HEXER, at(5, 4)));
    const next = toCultTurn(cast.state).state;
    expect(next.cult.hexCooldowns).toEqual([
      { unitId: hexer, turnsRemaining: 1 },
    ]);
    expect(offeredV7(next, "RIBBIT")).toEqual([]);
    expect(rejectedV7(next, targeted("RIBBIT", next, HEXER, at(6, 4)))).toEqual(
      { code: "RIBBIT_NOT_LEGAL", params: { reason: "COOLDOWN" } },
    );
    // It may still shoot.
    expect(offeredV7(next, "ATTACK").length).toBeGreaterThan(0);
    const after = toCultTurn(next).state;
    expect(after.cult.hexCooldowns).toEqual([]);
    expect(offeredV7(after, "RIBBIT")).toHaveLength(2);
  });

  it("refuses its own side, giants, two-slot units, Eggs, neutral units, daemons, frogs, and anything beyond 2", () => {
    const reason = (state: GameStateV7, target: CoordV7) =>
      rejectedV7(state, targeted("RIBBIT", state, HEXER, target));
    // Its own unit.
    const own = field([{ seat: 0, role: "FIGHTER", at: at(5, 3) }]);
    expect(reason(own, at(5, 3))).toEqual({
      code: "RIBBIT_NOT_LEGAL",
      params: { reason: "TARGET" },
    });
    // A reward giant.
    const giant = field([{ seat: 1, role: "JUGGERNAUT", at: at(5, 4) }]);
    expect(reason(giant, at(5, 4)).params).toEqual({ reason: "IMMUNE" });
    // A two-slot dinosaur; an Egg and an embarked unit are not in land
    // form.
    const dinosaurs = field([{ seat: 1, role: "KNIGHT", at: at(5, 4) }], {
      factions: ["CULT", "DINOSAUR"],
    });
    expect(reason(dinosaurs, at(5, 4)).params).toEqual({ reason: "IMMUNE" });
    const fighter = unitAtV7(giant, at(5, 4));
    for (const form of ["EGG", "EMBARKED", "NAVAL"] as const)
      expect(trickTakesV7(giant, { ...fighter, role: "FIGHTER", form })).toBe(
        false,
      );
    expect(trickTakesV7(giant, { ...fighter, role: "FIGHTER" })).toBe(true);
    // A daemon of another lodge, and a Tentacle.
    const lodges = withTentacleV7(
      withHorrorV7(
        field([{ seat: 0, role: "CAPTAIN", at: at(8, 2) }], {
          factions: ["CULT", "CULT"],
        }),
        1,
        at(5, 4),
      ),
      at(8, 2),
      at(6, 3),
    );
    expect(reason(lodges, at(5, 4)).params).toEqual({ reason: "IMMUNE" });
    expect(reason(lodges, at(6, 3)).params).toEqual({ reason: "IMMUNE" });
    // A frog already, and a unit 3 tiles away.
    const far = field([
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(8, 2) },
    ]);
    expect(reason(withFrogsV7(far, [at(5, 4)]), at(5, 4)).params).toEqual({
      reason: "FROG",
    });
    expect(reason(far, at(8, 2)).params).toEqual({ reason: "RANGE" });
    // A unit it cannot see is no target.
    const hidden = unexploreV7(far, 0, [at(5, 4)]);
    expect(reason(hidden, at(5, 4)).params).toEqual({ reason: "TARGET" });
    // Nobody else Ribbits.
    const initiate = cultFieldV7([
      { seat: 0, role: "FIGHTER", at: HEXER },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
    ]);
    expect(reason(initiate, at(5, 4)).code).toBe("UNIT_ROLE_INVALID");
  });

  it("is cured by Tend Wounded, also at full Hit Points", () => {
    const state = withFrogsV7(
      cultFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(6, 4) },
          { seat: 1, role: "CAPTAIN", at: at(4, 4) },
          { seat: 1, role: "FIGHTER", at: at(5, 4) },
        ],
        { activeSeat: 1 },
      ),
      [at(5, 4)],
    );
    const frog = idAt(state, at(5, 4));
    const captain = idAt(state, at(4, 4));
    expect(offeredV7(state, "ATTACK")).toEqual([]);
    const tended = playV7(state, { kind: "TEND_WOUNDED", unitId: captain });
    expect(tended.events).toEqual([
      {
        kind: "WOUNDED_TENDED",
        captainId: captain,
        results: [
          {
            unitId: frog,
            amount: 0,
            hpAfter: 12,
            curedPlague: false,
            curedBitten: false,
            curedFrozen: false,
            curedFrog: true,
          },
        ],
      },
    ]);
    expect(tended.state.cult.frogs).toEqual([]);
    // The hexing seat sees the cure.
    expect(
      projectEventsV7(state, tended.state, cultId(state), tended.events).events,
    ).toEqual(tended.events);
    // It is itself again at once: it may attack this turn.
    expect(offeredV7(tended.state, "ATTACK")).toContainEqual({
      kind: "ATTACK",
      unitId: frog,
      targetUnitId: idAt(state, at(6, 4)),
    });
  });

  it("lets a Summoner Seize a frog at half its Hit Points", () => {
    // A Knight has 13 HP: 6 is half or less, and more than the 5 of a
    // broken unit.
    const base = cultFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "KNIGHT", at: at(5, 4), hp: 6 },
    ]);
    const seize: CommandV7 = {
      kind: "SEIZE",
      unitId: idAt(base, at(5, 3)),
      victimUnitId: idAt(base, at(5, 4)),
    };
    expect(rejectedV7(base, seize)).toEqual({
      code: "SEIZE_NOT_LEGAL",
      params: { reason: "HEALTHY" },
    });
    const knight = unitAtV7(base, at(5, 4));
    expect(unitIsSeizableV7(base, knight)).toBe(false);
    const frogged = withFrogsV7(base, [at(5, 4)]);
    expect(unitIsSeizableV7(frogged, knight)).toBe(true);
    expect(unitIsSeizableV7(frogged, { ...knight, hp: 7 })).toBe(false);
    const seized = playV7(frogged, seize);
    expect(seized.events.map((event) => event.kind)).toContain("UNIT_SEIZED");
    expect(seized.state.cult.frogs).toEqual([]);
    // A frog at 7 of 13 is still too healthy.
    expect(
      rejectedV7(patchUnitV7(frogged, at(5, 4), { hp: 7 }), seize).params,
    ).toEqual({ reason: "HEALTHY" });
  });

  it("disrupts a frogged cultist: its strand breaks, and a frog neither chants nor helps", () => {
    // Two lodges: seat 1's Hexer frogs seat 0's channeller.
    const state = withStrandsV7(
      withHorrorV7(
        cultFieldV7(
          [
            { seat: 0, role: "FIGHTER", at: at(5, 6) },
            { seat: 1, role: "MARKSMAN", at: at(5, 8 - 1) },
          ],
          { factions: ["CULT", "CULT"], activeSeat: 1 },
        ),
        0,
        at(5, 4),
      ),
      at(5, 4),
      [at(5, 6)],
    );
    const cast = playV7(state, targeted("RIBBIT", state, at(5, 7), at(5, 6)));
    expect(cast.events.map((event) => event.kind)).toEqual([
      "UNIT_FROGGED",
      "STRAND_BROKEN",
    ]);
    expect(eventsOf(cast.events, "STRAND_BROKEN")[0]?.cause).toBe("STATUS");
    expect(cast.state.cult.strands).toEqual([]);
    // A frogged chanter leaves its circle, and a frog joins none.
    const circle = withRitualV7(
      cultFieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
          { seat: 1, role: "MARKSMAN", at: at(5, 6) },
        ],
        { factions: ["CULT", "CULT"], activeSeat: 1 },
      ),
      "STARFALL",
      at(5, 3),
      [at(5, 4)],
      at(2, 3),
    );
    const broken = playV7(
      circle,
      targeted("RIBBIT", circle, at(5, 6), at(5, 4)),
    );
    // (A star never fizzles for want of chanters since the Cult redesign,
    // `pulp_wars-mch9.34`: it goes on alone.)
    expect(broken.events.map((event) => event.kind)).toEqual([
      "UNIT_FROGGED",
      "RITUAL_DISRUPTED",
    ]);
    expect(broken.state.cult.rituals).toMatchObject([{ chanterUnitIds: [] }]);
    // A frog is offered no join of a star beside it.
    const frogged = withFrogsV7(
      withRitualV7(
        cultFieldV7([
          { seat: 0, role: "CATAPULT", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(5, 4) },
        ]),
        "STARFALL",
        at(5, 3),
        [],
        at(2, 3),
      ),
      [at(5, 4)],
    );
    expect(offeredV7(frogged, "JOIN_CHANT")).toEqual([]);
    expect(
      joinChantRejectionV7(
        frogged,
        frogged.cult.rituals,
        unitAtV7(frogged, at(5, 4)),
        unitAtV7(frogged, at(5, 3)),
      ),
    ).toEqual({ code: "JOIN_CHANT_NOT_LEGAL", reason: "STATUS" });
  });
});

// -------------------------------------------------------- Switcheroo ---

describe("Switcheroo (section 9.2)", () => {
  const field = (
    pieces: readonly GoblinPieceV7[],
    options: Parameters<typeof cultFieldV7>[1] = {},
  ) =>
    cultFieldV7(
      [{ seat: 0, role: "RAIDER", at: FAMILIAR }, ...pieces],
      options,
    );

  it("swaps the Familiar with an enemy within 2, and neither unit's turn changes otherwise", () => {
    const state = field([{ seat: 1, role: "CATAPULT", at: at(5, 4) }]);
    const familiar = idAt(state, FAMILIAR);
    const catapult = idAt(state, at(5, 4));
    const command = targeted("SWITCHEROO", state, FAMILIAR, at(5, 4));
    expect(
      previewSwitcherooV7(viewForV7(state, cultId(state)), familiar, catapult),
    ).toEqual({
      unitId: familiar,
      targetUnitId: catapult,
      targetOwnerId: otherId(state),
      from: FAMILIAR,
      to: at(5, 4),
      targetHoldsStrand: false,
      targetInRitual: false,
      targetGrabbed: false,
      cooldownTurns: 2,
    });
    const swapped = playV7(state, command);
    expect(swapped.events).toEqual([
      {
        kind: "UNITS_SWAPPED",
        playerId: cultId(state),
        unitId: familiar,
        targetUnitId: catapult,
        targetOwnerId: otherId(state),
        from: FAMILIAR,
        to: at(5, 4),
      },
    ]);
    expect(unitOf(swapped.state, familiar)?.at).toEqual(at(5, 4));
    expect(unitOf(swapped.state, catapult)?.at).toEqual(FAMILIAR);
    expect(unitOf(swapped.state, catapult)?.activation).toEqual(
      unitOf(state, catapult)?.activation,
    );
    expect(unitOf(swapped.state, familiar)?.activation).toMatchObject({
      specialActed: true,
      moved: false,
    });
    expect(swapped.state.cult.hexCooldowns).toEqual([
      { unitId: familiar, turnsRemaining: 2 },
    ]);
    // Not on its owner's next turn; on the one after.
    const next = toCultTurn(swapped.state).state;
    expect(offeredV7(next, "SWITCHEROO")).toEqual([]);
    expect(
      rejectedV7(next, targeted("SWITCHEROO", next, at(5, 4), FAMILIAR)).params,
    ).toEqual({ reason: "COOLDOWN" });
    expect(offeredV7(toCultTurn(next).state, "SWITCHEROO")).toHaveLength(1);
  });

  it("swaps with an own unit too, after the Familiar's Move", () => {
    const state = field([{ seat: 0, role: "FIGHTER", at: at(7, 4) }]);
    const moved = applyOkV7(state, cultId(state), {
      kind: "MOVE",
      unitId: idAt(state, FAMILIAR),
      path: [at(6, 2), at(7, 2)],
    }).state;
    const swapped = playV7(
      moved,
      targeted("SWITCHEROO", moved, at(7, 2), at(7, 4)),
    );
    expect(unitAtV7(swapped.state, at(7, 4)).role).toBe("RAIDER");
    expect(unitAtV7(swapped.state, at(7, 2)).role).toBe("FIGHTER");
  });

  it("never touches a settlement center", () => {
    // The target stands on a village; then the Familiar does.
    const onVillage = field([{ seat: 1, role: "FIGHTER", at: at(5, 5 - 1) }]);
    const target = cultFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 5) },
    ]);
    expect(
      rejectedV7(target, targeted("SWITCHEROO", target, at(5, 4), at(5, 5))),
    ).toEqual({ code: "SWITCHEROO_NOT_LEGAL", params: { reason: "CENTER" } });
    const familiar = cultFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 5) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
    ]);
    expect(
      rejectedV7(familiar, targeted("SWITCHEROO", familiar, at(5, 5), at(5, 4)))
        .params,
    ).toEqual({ reason: "CENTER" });
    expect(offeredV7(onVillage, "SWITCHEROO")).toHaveLength(1);
  });

  it("needs Familiars (Scouting), and takes no giant, daemon, neutral unit, or unit out of reach", () => {
    const reason = (state: GameStateV7, target: CoordV7) =>
      rejectedV7(state, targeted("SWITCHEROO", state, FAMILIAR, target));
    const noTech = field([{ seat: 1, role: "FIGHTER", at: at(5, 4) }], {
      techs: { 0: techsWithout("SCOUTING") },
    });
    expect(reason(noTech, at(5, 4))).toEqual({
      code: "SWITCHEROO_NOT_LEGAL",
      params: { reason: "TECHNOLOGY" },
    });
    const giant = field([{ seat: 1, role: "JUGGERNAUT", at: at(5, 4) }]);
    expect(reason(giant, at(5, 4)).params).toEqual({ reason: "IMMUNE" });
    const daemon = withHorrorV7(field([]), 0, at(5, 4));
    expect(reason(daemon, at(5, 4)).params).toEqual({ reason: "IMMUNE" });
    const tentacle = withTentacleV7(
      field([{ seat: 0, role: "CAPTAIN", at: at(8, 2) }]),
      at(8, 2),
      at(6, 3),
    );
    expect(reason(tentacle, at(6, 3)).params).toEqual({ reason: "IMMUNE" });
    // The Cult redesign (`pulp_wars-mch9.34`): legal at 4 tiles, refused
    // at 5.
    const four = field([{ seat: 1, role: "FIGHTER", at: at(9, 2) }]);
    expect(
      playV7(four, targeted("SWITCHEROO", four, FAMILIAR, at(9, 2))).events,
    ).toMatchObject([{ kind: "UNITS_SWAPPED", from: FAMILIAR, to: at(9, 2) }]);
    const far = field([{ seat: 1, role: "FIGHTER", at: at(10, 2) }]);
    expect(reason(far, at(10, 2)).params).toEqual({ reason: "RANGE" });
    // Itself is no target.
    expect(reason(far, FAMILIAR).params).toEqual({ reason: "TARGET" });
  });

  it("puts each unit only where it may stand by the shove rule", () => {
    // The target stands on a Mountain, and the Cult has no Engineering:
    // the Familiar could not stand there.
    const state = mountainV7(
      field([{ seat: 1, role: "FIGHTER", at: at(5, 4) }], {
        techs: { 0: techsWithout("ENGINEERING") },
      }),
      at(5, 4),
    );
    expect(
      rejectedV7(state, targeted("SWITCHEROO", state, FAMILIAR, at(5, 4))),
    ).toEqual({ code: "SWITCHEROO_NOT_LEGAL", params: { reason: "TILE" } });
    // With Engineering it may (the actor's technology decides, as for a
    // Tractor Beam, so the offer is exact).
    const engineers = mountainV7(
      field([{ seat: 1, role: "FIGHTER", at: at(5, 4) }]),
      at(5, 4),
    );
    expect(offeredV7(engineers, "SWITCHEROO")).toHaveLength(1);
  });

  it("moves the swapped unit: its strand breaks and a Tentacle's Grab ends", () => {
    // Another lodge's Familiar swaps with a channeller that a Tentacle
    // holds.
    const state = withTentacleV7(
      withStrandsV7(
        withHorrorV7(
          cultFieldV7(
            [
              { seat: 0, role: "FIGHTER", at: at(5, 6) },
              { seat: 0, role: "CAPTAIN", at: at(8, 2) },
              { seat: 1, role: "RAIDER", at: at(4, 7) },
            ],
            { factions: ["CULT", "CULT"], activeSeat: 1 },
          ),
          0,
          at(5, 4),
        ),
        at(5, 4),
        [at(5, 6)],
      ),
      at(8, 2),
      at(6, 6),
      { grabbed: at(5, 6) },
    );
    const view = viewForV7(state, otherId(state));
    expect(
      previewSwitcherooV7(view, idAt(state, at(4, 7)), idAt(state, at(5, 6))),
    ).toMatchObject({
      targetHoldsStrand: true,
      targetGrabbed: true,
    });
    const swapped = playV7(
      state,
      targeted("SWITCHEROO", state, at(4, 7), at(5, 6)),
    );
    expect(swapped.events.map((event) => event.kind)).toEqual([
      "UNITS_SWAPPED",
      "STRAND_BROKEN",
    ]);
    expect(eventsOf(swapped.events, "STRAND_BROKEN")[0]?.cause).toBe("MOVED");
    expect(swapped.state.cult.tentacles[0]?.grabbedUnitId).toBeNull();
  });
});

// ------------------------------------------------ Tentacle and Grab ---

// The Cult redesign (`pulp_wars-mch9.31`): Pick Me! and Martyr retired with
// the Chosen; nothing of them is left to offer, shout, or pay.
describe("Pick Me! and Martyr, retired with the Chosen", () => {
  it("leaves no Chosen, no shout, and no Martyr's Favour", () => {
    expect(effectiveRoleRuleV7("SWORDSMAN", "CULT")).toMatchObject({
      cost: null,
      technology: null,
      abilities: [],
    });
    // A Chosen's death paid 6 Favour; a dying Cult unit pays nothing now.
    const state = cultFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
    ]);
    const fighter = idAt(state, at(5, 4));
    const killed = playV7(toOtherTurn(state).state, {
      kind: "ATTACK",
      unitId: fighter,
      targetUnitId: idAt(state, at(5, 3)),
    });
    expect(eventsOf(killed.events, "UNIT_DIED")).toHaveLength(1);
    expect(eventsOf(killed.events, "FAVOUR_GAINED")).toEqual([]);
    expect(killed.state.cult).not.toHaveProperty("taunts");
  });
});

describe("Tentacle and Grab (section 9.3)", () => {
  // The Cult redesign (`pulp_wars-mch9.31`): the Summoner calls it, with
  // Tentacles (the field researches every technology).
  const field = (
    pieces: readonly GoblinPieceV7[],
    options: Parameters<typeof cultFieldV7>[1] = {},
  ) =>
    cultFieldV7([{ seat: 0, role: "CAPTAIN", at: CALLER }, ...pieces], options);
  const tentacleAt = (state: GameStateV7, where: CoordV7): CommandV7 => ({
    kind: "TENTACLE",
    unitId: idAt(state, CALLER),
    at: where,
  });
  const tentacleOf = (state: GameStateV7) =>
    need(state.units.find((unit) => unitIsTentacleV7(unit)));

  it("calls up a wild Tentacle that slaps the weakest unit beside it at once, and holds it", () => {
    // A Marksman and a Fighter beside the tile, both at 12 HP: the lower
    // ID (the Marksman) is slapped.
    const state = field([
      { seat: 1, role: "MARKSMAN", at: at(4, 5) },
      { seat: 1, role: "FIGHTER", at: at(6, 5) },
    ]);
    const caller = idAt(state, CALLER);
    const marksman = idAt(state, at(4, 5));
    const command = tentacleAt(state, at(5, 4));
    expect(
      previewTentacleV7(viewForV7(state, cultId(state)), caller, at(5, 4)),
    ).toEqual({
      unitId: caller,
      at: at(5, 4),
      slapTargetUnitId: marksman,
      neutralTurns: 3,
      exact: true,
    });
    const risen = playV7(state, command);
    const tentacle = tentacleOf(risen.state);
    expect(tentacle).toMatchObject({
      ownerId: NEUTRAL_OWNER_ID_V7,
      role: "JUGGERNAUT",
      summoned: "TENTACLE",
      at: at(5, 4),
      maxHp: 8,
      homeCityId: null,
    });
    expect(unitIsWildV7(tentacle)).toBe(true);
    expect(unitRoleRuleV7(risen.state, tentacle).label).toBe("Tentacle");
    expect(risen.events.map((event) => event.kind)).toEqual([
      "TENTACLE_ROSE",
      "COMBAT_RESOLVED",
      "UNIT_GRABBED",
    ]);
    expect(risen.events[0]).toEqual({
      kind: "TENTACLE_ROSE",
      playerId: cultId(state),
      unitId: caller,
      tentacleUnitId: tentacle.id,
      at: at(5, 4),
      hp: 8,
    });
    // The spec's numbers (section 9.3): it leaves a Marksman at 2.
    const slap = need(eventsOf(risen.events, "COMBAT_RESOLVED")[0]).preview;
    expect(slap).toMatchObject({
      attackerId: tentacle.id,
      targetUnitId: marksman,
    });
    expect(unitOf(risen.state, marksman)?.hp).toBe(2);
    expect(risen.state.monsters).toEqual([
      {
        unitId: tentacle.id,
        breed: "TENTACLE",
        home: at(5, 4),
        provokedBy: [],
      },
    ]);
    expect(risen.state.cult.tentacles).toEqual([
      {
        unitId: tentacle.id,
        callerUnitId: caller,
        turnsLeft: 3,
        grabbedUnitId: marksman,
      },
    ]);
    expect(unitOf(risen.state, caller)?.activation.specialActed).toBe(true);
    // Both seats see it, its lifetime, and its Grab.
    for (const viewer of [cultId(state), otherId(state)]) {
      const view = viewForV7(risen.state, viewer);
      expect(view.monsters.map((entry) => entry.breed)).toEqual(["TENTACLE"]);
      expect(view.cult.tentacles).toEqual(risen.state.cult.tentacles);
      expect(previewMonsterV7(view, tentacle.id)).toMatchObject({
        breed: "TENTACLE",
        likelyTarget: marksman,
        exact: true,
      });
      expect(
        projectEventsV7(state, risen.state, viewer, risen.events).events.map(
          (event) => event.kind,
        ),
      ).toEqual(["TENTACLE_ROSE", "COMBAT_RESOLVED", "UNIT_GRABBED"]);
    }
  });

  it("matches the spec's slap numbers", () => {
    // It kills a full-HP Catapult on arrival, and a full-HP Initiate (7 HP
    // since the Cult redesign, `pulp_wars-mch9.31`; left at 1 before), and
    // leaves a Fighter at 4 (and takes 4).
    const cases = [
      { seat: 1, role: "CATAPULT", left: null, taken: 0 },
      { seat: 0, role: "FIGHTER", left: null, taken: null },
      { seat: 1, role: "FIGHTER", left: 4, taken: 4 },
    ] as const;
    for (const entry of cases) {
      const state = field([
        { seat: entry.seat, role: entry.role, at: at(6, 5) },
      ]);
      const victim = idAt(state, at(6, 5));
      const risen = playV7(state, tentacleAt(state, at(5, 4)));
      const label = `${String(entry.seat)} ${entry.role}`;
      expect(unitOf(risen.state, victim)?.hp ?? null, label).toBe(entry.left);
      if (entry.taken !== null)
        expect(tentacleOf(risen.state).hp, label).toBe(8 - entry.taken);
      // A unit it killed is not held.
      expect(eventsOf(risen.events, "UNIT_GRABBED").length, label).toBe(
        entry.left === null ? 0 : 1,
      );
    }
  });

  it("slaps friend and foe alike, the fewest Hit Points first, the lowest ID on a tie, and nobody when alone", () => {
    const state = field([
      { seat: 0, role: "FIGHTER", at: at(4, 5), hp: 3 },
      { seat: 1, role: "FIGHTER", at: at(6, 5), hp: 3 },
      { seat: 1, role: "KNIGHT", at: at(5, 3), hp: 9 },
    ]);
    const own = unitAtV7(state, at(4, 5));
    expect(tentacleSlapTargetV7(state.units, at(5, 4))?.id).toBe(own.id);
    const risen = playV7(state, tentacleAt(state, at(5, 4)));
    // Its own Initiate dies of it; the kill is nobody's.
    expect(unitOf(risen.state, own.id)).toBeUndefined();
    expect(
      eventsOf(risen.events, "COMBAT_RESOLVED")[0]?.preview.targetUnitId,
    ).toBe(own.id);
    expect(favourOfV7(risen.state, cultId(state))).toBe(0);
    for (const entry of risen.state.scoreLedger)
      expect(entry.killValue, String(entry.playerId)).toBe(0);
    // Alone: it rises and waits.
    const alone = field([]);
    const quiet = playV7(alone, tentacleAt(alone, at(5, 4)));
    expect(quiet.events.map((event) => event.kind)).toEqual(["TENTACLE_ROSE"]);
    expect(quiet.state.cult.tentacles[0]?.grabbedUnitId).toBeNull();
  });

  it("needs Tentacles: a Summoner without Chivalry calls none, and no other unit calls one", () => {
    const state = field([], { techs: { 0: techsWithout("CHIVALRY") } });
    expect(rejectedV7(state, tentacleAt(state, at(5, 4)))).toEqual({
      code: "TENTACLE_NOT_LEGAL",
      params: { reason: "TECHNOLOGY" },
    });
    expect(offeredV7(state, "TENTACLE")).toEqual([]);
    // The vacant `KNIGHT` slot calls nothing.
    expect(effectiveRoleRuleV7("KNIGHT", "CULT").abilities).toEqual([]);
  });

  it("rises only on a free tile within 3 that is no settlement center, one per Summoner", () => {
    const state = field([
      { seat: 0, role: "CAPTAIN", at: at(8, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
    ]);
    const reason = (target: GameStateV7, where: CoordV7) =>
      rejectedV7(target, tentacleAt(target, where));
    // An occupied tile, its own tile, a village center, a tile 4 away.
    for (const where of [at(5, 4), CALLER, at(5, 5), at(5, 6)])
      expect(
        reason(state, where),
        `${String(where.x)},${String(where.y)}`,
      ).toEqual({
        code: "TENTACLE_NOT_LEGAL",
        params: { reason: "TILE" },
      });
    // A tile it has not explored.
    expect(reason(unexploreV7(state, 0, [at(3, 3)]), at(3, 3)).params).toEqual({
      reason: "TILE",
    });
    // Every tile within 3 on the board is offered but its own, the two
    // units' (the Fighter, the other Summoner), and the two village centers
    // ((5, 5) and (8, 5)): 7 columns by 6 rows (y 0 to 5), less five.
    const offered = offeredV7(state, "TENTACLE").filter(
      (command) =>
        command.kind === "TENTACLE" && command.unitId === idAt(state, CALLER),
    );
    expect(offered).toHaveLength(7 * 6 - 5);
    // One Tentacle per Summoner: the other Summoner may still call one.
    const one = playV7(state, tentacleAt(state, at(4, 4))).state;
    const next = toCultTurn(one).state;
    expect(reason(next, at(6, 3))).toEqual({
      code: "TENTACLE_NOT_LEGAL",
      params: { reason: "EXISTS" },
    });
    expect(
      offeredV7(next, "TENTACLE").every(
        (command) =>
          command.kind === "TENTACLE" &&
          command.unitId === idAt(next, at(8, 2)),
      ),
    ).toBe(true);
    expect(offeredV7(next, "TENTACLE").length).toBeGreaterThan(0);
    // Nobody else calls one.
    const initiate = cultFieldV7([{ seat: 0, role: "FIGHTER", at: CALLER }]);
    expect(reason(initiate, at(5, 4)).code).toBe("UNIT_ROLE_INVALID");
  });

  it("rises on water too", () => {
    const state = field([], { water: [at(5, 4), at(4, 4), at(6, 4)] });
    const risen = playV7(state, tentacleAt(state, at(5, 4)));
    expect(tentacleOf(risen.state).at).toEqual(at(5, 4));
    expect(parseGameStateV7(JSON.parse(JSON.stringify(risen.state)))).toEqual(
      risen.state,
    );
  });

  it("holds the unit it slapped: it moves only to tiles next to the Tentacle", () => {
    const state = withTentacleV7(
      field([{ seat: 1, role: "KNIGHT", at: at(6, 5) }], { activeSeat: 1 }),
      CALLER,
      at(5, 4),
      { grabbed: at(6, 5) },
    );
    const knight = idAt(state, at(6, 5));
    const moves = offeredV7(state, "MOVE").filter(
      (command) => command.kind === "MOVE" && command.unitId === knight,
    );
    expect(moves.length).toBeGreaterThan(0);
    for (const command of moves)
      if (command.kind === "MOVE")
        for (const step of command.path)
          expect(
            Math.max(Math.abs(step.x - 5), Math.abs(step.y - 4)),
            JSON.stringify(command.path),
          ).toBe(1);
    expect(
      rejectedV7(state, { kind: "MOVE", unitId: knight, path: [at(7, 5)] }),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "GRABBED" } });
    // A step along its side keeps the grab.
    const stepped = playV7(state, {
      kind: "MOVE",
      unitId: knight,
      path: [at(6, 4)],
    });
    expect(stepped.state.cult.tentacles[0]?.grabbedUnitId).toBe(knight);
    // Without the grab it rides away.
    const free = withTentacleV7(
      field([{ seat: 1, role: "KNIGHT", at: at(6, 5) }], { activeSeat: 1 }),
      CALLER,
      at(5, 4),
    );
    expect(
      applyCommandV7(free, otherId(free), {
        kind: "MOVE",
        unitId: knight,
        path: [at(7, 5)],
      }).accepted,
    ).toBe(true);
  });

  it("slaps again in the neutral turn, the weakest unit beside it then", () => {
    // A Tentacle that holds a Knight; a weaker Fighter stands beside it
    // when the round ends: it slaps the Fighter and lets the Knight go.
    const state = withTentacleV7(
      field(
        [
          { seat: 1, role: "KNIGHT", at: at(6, 5) },
          { seat: 1, role: "FIGHTER", at: at(4, 5), hp: 9 },
        ],
        { activeSeat: 1 },
      ),
      CALLER,
      at(5, 4),
      { grabbed: at(6, 5) },
    );
    const tentacle = tentacleOf(state).id;
    const fighter = idAt(state, at(4, 5));
    // (The fixture's round is seat 1 then seat 0: the neutral turn follows
    // the Cult's.)
    const round = toOtherTurn(state);
    for (const event of round.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    const neutral = round.events.slice(
      round.events.findIndex((event) => event.kind === "NEUTRAL_TURN_STARTED"),
      round.events.findIndex((event) => event.kind === "NEUTRAL_TURN_ENDED") +
        1,
    );
    expect(neutral.map((event) => event.kind)).toEqual([
      "NEUTRAL_TURN_STARTED",
      "COMBAT_RESOLVED",
      "UNIT_GRABBED",
      "NEUTRAL_TURN_ENDED",
    ]);
    expect(eventsOf(neutral, "COMBAT_RESOLVED")[0]?.preview).toMatchObject({
      attackerId: tentacle,
      targetUnitId: fighter,
    });
    expect(eventsOf(neutral, "UNIT_GRABBED")).toEqual([
      {
        kind: "UNIT_GRABBED",
        unitId: tentacle,
        targetUnitId: fighter,
        at: at(5, 4),
      },
    ]);
    expect(round.state.cult.tentacles).toEqual([
      {
        unitId: tentacle,
        callerUnitId: idAt(state, CALLER),
        turnsLeft: 2,
        grabbedUnitId: fighter,
      },
    ]);
    expect(unitOf(round.state, tentacle)?.activation).toMatchObject({
      attacked: true,
      attacksUsed: 1,
      handled: true,
    });
  });

  it("sinks at the end of its third neutral turn", () => {
    // Alone: nobody to slap, and nobody hurts it.
    const state = field([{ seat: 1, role: "GUARD", at: at(2, 2) }]);
    const guard = idAt(state, at(2, 2));
    let current = playV7(state, tentacleAt(state, at(5, 4))).state;
    const tentacle = tentacleOf(current).id;
    for (const left of [2, 1] as const) {
      const round = toCultTurn(current);
      const neutral = round.events.slice(
        round.events.findIndex(
          (event) => event.kind === "NEUTRAL_TURN_STARTED",
        ),
        round.events.findIndex((event) => event.kind === "NEUTRAL_TURN_ENDED") +
          1,
      );
      expect(neutral.map((event) => event.kind)).toEqual([
        "NEUTRAL_TURN_STARTED",
        "NEUTRAL_TURN_ENDED",
      ]);
      current = round.state;
      expect(current.cult.tentacles).toEqual([
        {
          unitId: tentacle,
          callerUnitId: idAt(state, CALLER),
          turnsLeft: left,
          grabbedUnitId: null,
        },
      ]);
      // One Tentacle per Summoner, while it lasts.
      expect(offeredV7(current, "TENTACLE")).toEqual([]);
    }
    const last = toCultTurn(current);
    for (const event of last.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    const kinds = last.events.map((event) => event.kind);
    expect(
      kinds.slice(
        kinds.indexOf("NEUTRAL_TURN_STARTED"),
        kinds.indexOf("NEUTRAL_TURN_ENDED") + 1,
      ),
    ).toEqual([
      "NEUTRAL_TURN_STARTED",
      "TENTACLE_SANK",
      "UNIT_DIED",
      "NEUTRAL_TURN_ENDED",
    ]);
    // Every seat that saw it sees it sink.
    for (const viewer of [cultId(state), otherId(state)])
      expect(
        projectEventsV7(current, last.state, viewer, last.events)
          .events.map((event) => event.kind)
          .filter((kind) => kind === "TENTACLE_SANK"),
      ).toEqual(["TENTACLE_SANK"]);
    expect(eventsOf(last.events, "TENTACLE_SANK")).toEqual([
      { kind: "TENTACLE_SANK", unitId: tentacle, at: at(5, 4) },
    ]);
    expect(eventsOf(last.events, "UNIT_DIED")).toEqual([
      { kind: "UNIT_DIED", unitId: tentacle, cause: "SANK" },
    ]);
    expect(unitOf(last.state, tentacle)).toBeUndefined();
    expect(last.state.monsters).toEqual([]);
    expect(last.state.cult.tentacles).toEqual([]);
    expect(last.state.graves).toEqual([]);
    // The Summoner may call another now.
    expect(offeredV7(last.state, "TENTACLE").length).toBeGreaterThan(0);
    expect(unitOf(last.state, guard)?.hp).toBe(17);
  });

  it("can be attacked by anyone, pays nothing, and lets go when it dies", () => {
    const state = withTentacleV7(
      field([{ seat: 1, role: "KNIGHT", at: at(6, 5) }], { activeSeat: 1 }),
      CALLER,
      at(5, 4),
      { hp: 3, grabbed: at(6, 5) },
    );
    const before = need(
      state.players.find((player) => player.id === otherId(state)),
    ).coins;
    const killed = playV7(state, {
      kind: "ATTACK",
      unitId: idAt(state, at(6, 5)),
      targetUnitId: tentacleOf(state).id,
    });
    expect(killed.state.units.some((unit) => unitIsTentacleV7(unit))).toBe(
      false,
    );
    expect(killed.events.map((event) => event.kind)).not.toContain(
      "MONSTER_BOUNTY_AWARDED",
    );
    // A kill worth nothing.
    for (const entry of killed.state.scoreLedger)
      expect(entry.killValue, String(entry.playerId)).toBe(0);
    expect(
      need(killed.state.players.find((player) => player.id === otherId(state)))
        .coins,
    ).toBe(before);
    expect(killed.state.cult.tentacles).toEqual([]);
    expect(killed.state.monsters).toEqual([]);
    expect(killed.state.graves).toEqual([]);
    // Its own seat may attack it too.
    const own = withTentacleV7(
      field([{ seat: 0, role: "FIGHTER", at: at(6, 5) }]),
      CALLER,
      at(5, 4),
    );
    expect(offeredV7(own, "ATTACK")).toContainEqual({
      kind: "ATTACK",
      unitId: idAt(own, at(6, 5)),
      targetUnitId: tentacleOf(own).id,
    });
  });

  it("is rooted and no living thing: nothing freezes, shoves, or scares it", () => {
    const state = withTentacleV7(
      field([{ seat: 1, role: "JUGGERNAUT", at: at(6, 5) }], { activeSeat: 1 }),
      CALLER,
      at(5, 4),
    );
    const tentacle = tentacleOf(state);
    expect(canBeFrozenV7(state, otherId(state), tentacle)).toBe(false);
    expect(unitRoleMechanicsV7(state, tentacle)).toMatchObject({
      construct: true,
      immovable: true,
    });
    // A Juggernaut's Push does not move it (it has 8 HP: the blow kills
    // it; a weakened giant's does not).
    const weak = patchUnitV7(state, at(6, 5), { hp: 4 });
    const pushed = playV7(weak, {
      kind: "ATTACK",
      unitId: idAt(weak, at(6, 5)),
      targetUnitId: tentacle.id,
    });
    const combat = need(eventsOf(pushed.events, "COMBAT_RESOLVED")[0]).preview;
    expect(combat.push).toBe("BLOCKED");
    expect(unitOf(pushed.state, tentacle.id)?.at ?? at(5, 4)).toEqual(at(5, 4));
    // A Horror's Boo! does not scare it.
    const boo = withTentacleV7(
      withHorrorV7(field([]), 0, at(4, 4)),
      CALLER,
      at(5, 4),
    );
    expect(offeredV7(boo, "BOO")).toEqual([]);
  });
});

// --------------------------------------------------------- Pamphlets ---

describe("Pamphlets (section 8.7)", () => {
  it("lets an Initiate capture a neutral village in the turn it walks onto it", () => {
    const state = cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 4) }]);
    const initiate = idAt(state, at(5, 4));
    expect(offeredV7(state, "CAPTURE")).toEqual([]);
    const moved = playV7(state, {
      kind: "MOVE",
      unitId: initiate,
      path: [at(5, 5)],
    }).state;
    expect(unitOf(moved, initiate)).toMatchObject({
      at: at(5, 5),
      captureEligible: true,
    });
    const capture: CommandV7 = { kind: "CAPTURE", unitId: initiate };
    expect(offeredV7(moved, "CAPTURE")).toEqual([capture]);
    const captured = playV7(moved, capture);
    expect(
      need(
        captured.state.cities.find(
          (city) => city.at.x === 5 && city.at.y === 5,
        ),
      ).ownerId,
    ).toBe(cultId(state));
  });

  it("is the Initiate's alone, on a neutral village alone, and spends the action as any capture", () => {
    // A Human Fighter waits a turn, as every other unit does.
    const human = cultFieldV7([{ seat: 1, role: "FIGHTER", at: at(5, 4) }], {
      activeSeat: 1,
    });
    const fighter = idAt(human, at(5, 4));
    const walked = playV7(human, {
      kind: "MOVE",
      unitId: fighter,
      path: [at(5, 5)],
    }).state;
    expect(unitOf(walked, fighter)?.captureEligible).toBe(false);
    expect(rejectedV7(walked, { kind: "CAPTURE", unitId: fighter })).toEqual({
      code: "CAPTURE_NOT_ELIGIBLE",
      params: { reason: "NOT_READY" },
    });
    // So does a Familiar.
    const familiar = cultFieldV7([{ seat: 0, role: "RAIDER", at: at(5, 4) }]);
    const hopped = playV7(familiar, {
      kind: "MOVE",
      unitId: idAt(familiar, at(5, 4)),
      path: [at(5, 5)],
    }).state;
    expect(offeredV7(hopped, "CAPTURE")).toEqual([]);
    // An Initiate that walks onto a player's city center waits too.
    const city = cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(3, 8) }]);
    const initiate = idAt(city, at(3, 8));
    const entered = playV7(city, {
      kind: "MOVE",
      unitId: initiate,
      path: [at(2, 8)],
    }).state;
    expect(unitOf(entered, initiate)?.captureEligible).toBe(false);
    expect(
      rejectedV7(entered, { kind: "CAPTURE", unitId: initiate }).code,
    ).toBe("CAPTURE_NOT_ELIGIBLE");
    // A frogged Initiate hops onto the village and cannot preach.
    const frog = withFrogsV7(
      cultFieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 4) }], {
        factions: ["CULT", "CULT"],
      }),
      [at(5, 4)],
    );
    const hop = playV7(frog, {
      kind: "MOVE",
      unitId: idAt(frog, at(5, 4)),
      path: [at(5, 5)],
    }).state;
    expect(
      rejectedV7(hop, { kind: "CAPTURE", unitId: idAt(hop, at(5, 5)) }).code,
    ).toBe("UNIT_FROGGED");
  });
});

// ------------------------------------------------------------ The lab ---

describe("the hand-play lab LAB_CULT_MID (built, not played)", () => {
  const lab = need(missionByIdV7("LAB_CULT_MID"));
  const setup = need(missionMatchSetupV7(lab));

  it("is a hidden mission on the Dwarf lab's land against its Human side", () => {
    expect(lab).toMatchObject({ revision: 2, hidden: true, size: 16 });
    expect(() => validateMissionDefinitionV7(lab)).not.toThrow();
    const dwarf = need(missionByIdV7("LAB_DWARF_MID"));
    const [cult, humans] = lab.seats;
    expect(need(cult).faction).toBe("CULT");
    expect(need(humans)).toEqual(dwarf.seats[1]);
    expect([lab.terrain, lab.resources, lab.villages]).toEqual([
      dwarf.terrain,
      dwarf.resources,
      dwarf.villages,
    ]);
    expect(need(cult).cities).toEqual(need(dwarf.seats[0]).cities);
    expect(need(cult).technologies).toHaveLength(14);
    expect(need(cult).technologies).toEqual(
      expect.arrayContaining(["SCOUTING", "EXPLOSIVES", "ADMINISTRATION"]),
    );
    expect(need(cult).technologies).not.toContain("FARMING");
    const roles = need(cult).units.map((unit) => unit.role);
    const tally = Object.fromEntries(
      [...new Set(roles)].map((role) => [
        role,
        roles.filter((item) => item === role).length,
      ]),
    );
    // Revision 2 (`pulp_wars-mch9.31`): the Caller is a Hexer and the two
    // Chosen an Idol Bearer and an Initiate.
    expect(tally).toEqual({
      CAPTAIN: 2,
      MARKSMAN: 3,
      CATAPULT: 1,
      FIGHTER: 6,
      RAIDER: 2,
      GUARD: 3,
    });
    expect(
      roles.reduce(
        (sum, role) => sum + (effectiveRoleRuleV7(role, "CULT").cost ?? 0),
        0,
      ),
    ).toBe(53);
    expect(need(cult).favour).toBe(12);
    // Favour is a Cult seat's alone.
    expect(() =>
      validateMissionDefinitionV7({
        ...lab,
        seats: [need(cult), { ...need(humans), favour: 3 }],
      }),
    ).toThrow();
  });

  // The Cult redesign (`pulp_wars-mch9.31`, RULESET_7_CULT_REDESIGN.md
  // sections 4.2 and 6): no mission places a unit of a vacant role, and a
  // Cult seat with no Favour of its own starts with every Cult seat's 2.
  it("refuses a vacant role, and gives a Cult seat without Favour the starting 2", () => {
    const [cult, humans] = lab.seats;
    const free = at(2, 7);
    for (const role of ["KNIGHT", "SWORDSMAN"] as const) {
      expect(() =>
        validateMissionDefinitionV7({
          ...lab,
          seats: [
            { ...need(cult), units: [...need(cult).units, { role, at: free }] },
            need(humans),
          ],
        }),
      ).toThrow(/does not field/);
      expect(() =>
        validateMissionDefinitionV7({
          ...lab,
          reinforcements: [{ seat: 0, round: 3, units: [{ role, at: free }] }],
        }),
      ).toThrow(/vacant role/);
    }
    // The Human seat's Knights stand as before.
    expect(need(humans).units.some((unit) => unit.role === "KNIGHT")).toBe(
      true,
    );
    expect(() => validateMissionDefinitionV7(lab)).not.toThrow();
    // Without its own `favour` the Cult seat starts with 2.
    const { favour: _favour, ...plain } = need(cult);
    void _favour;
    const state = buildMissionStateV7(
      { ...lab, seats: [plain, need(humans)] },
      setup,
    );
    const seat = need(state.players[0]).id;
    expect(favourOfV7(state, seat)).toBe(2);
    expect(state.cult.favour).toEqual([{ playerId: seat, favour: 2 }]);
    // A seat's own `favour` is clamped to the cap of 30 (the Cult redesign,
    // `pulp_wars-mch9.32`).
    const rich = buildMissionStateV7(
      { ...lab, seats: [{ ...need(cult), favour: 40 }, need(humans)] },
      setup,
    );
    expect(favourOfV7(rich, need(rich.players[0]).id)).toBe(30);
  });

  it("builds a valid opening state with Favour and no daemon", () => {
    const state = missionInitialStateV7(setup);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const cult = need(state.players[0]);
    expect(cult.faction).toBe("CULT");
    expect(state.turnOrder[state.activeSeatIndex]).toBe(cult.id);
    expect(favourOfV7(state, cult.id)).toBe(12);
    expect(state.cult).toMatchObject({
      favour: [{ playerId: cult.id, favour: 12 }],
      strands: [],
      rituals: [],
      frogs: [],
      tentacles: [],
    });
    expect(state.units.filter((unit) => unit.ownerId === cult.id)).toHaveLength(
      17,
    );
    expect(state.units.some((unit) => unit.summoned !== undefined)).toBe(false);
    expect(state.monsters).toEqual([]);
  });

  it("offers the Cult's commands on the first turn", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const cult = need(state.players[0]).id;
    // 20 Coins and the income of the first turn.
    expect(need(state.players[0]).coins).toBe(35);
    const offered = queryPlayerCommandsV7(viewForV7(state, cult));
    const kinds = new Set(offered.map((command) => command.kind));
    // The two Summoners stand side by side with 12 Favour: a Horror, a
    // Sacrifice, a Tentacle, and (with the Stargazer and the Hexer beside
    // them) the Great Summoning's circle is one Favour-step away.
    for (const kind of [
      "MOVE",
      "TRAIN",
      "RESEARCH",
      "SUMMON",
      "SACRIFICE",
      "BEGIN_RITUAL",
      "TENTACLE",
      "SWITCHEROO",
      "END_TURN",
    ] as const)
      expect(kinds.has(kind), kind).toBe(true);
    // No enemy is within a Hexer's reach yet, and there is no daemon.
    for (const kind of [
      "RIBBIT",
      "CHANNEL",
      "BOO",
      "PROCLAIM",
      "SEIZE",
    ] as const)
      expect(kinds.has(kind), kind).toBe(false);
    // 12 Favour does not pay for the Great Summoning: only Star-fall.
    expect(
      offered.every(
        (command) =>
          command.kind !== "BEGIN_RITUAL" || command.ritual === "STARFALL",
      ),
    ).toBe(true);
    // Every offered command of a trick is accepted.
    for (const kind of ["SUMMON", "TENTACLE", "SWITCHEROO"] as const) {
      const command = need(offered.find((entry) => entry.kind === kind));
      expect(applyCommandV7(state, cult, command).accepted, kind).toBe(true);
    }
    // The redesigned roster on the first turn (`pulp_wars-mch9.46`): the
    // Summoners call an Imp, a Horror, or (Gibbering Masses) a Mass, and a
    // star begun alone can be joined by a robed cultist beside the
    // Stargazer.
    const daemons = new Set(
      offered.flatMap((command) =>
        command.kind === "SUMMON" ? [command.daemon] : [],
      ),
    );
    expect([...daemons].sort()).toEqual(["HORROR", "IMP", "MASS"]);
    const star = need(
      offered.find(
        (command) =>
          command.kind === "BEGIN_RITUAL" && command.ritual === "STARFALL",
      ),
    );
    const begun = applyCommandV7(state, cult, star);
    expect(begun.accepted).toBe(true);
    if (!begun.accepted) return;
    expect(
      queryPlayerCommandsV7(viewForV7(begun.state, cult)).some(
        (command) => command.kind === "JOIN_CHANT",
      ),
    ).toBe(true);
    // It builds the same state every time.
    expect(checkedV7(missionInitialStateV7(setup))).toEqual(
      missionInitialStateV7(setup),
    );
  });
});
