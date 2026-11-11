import { describe, expect, it } from "vitest";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  BITTEN_RISING_HP_V7,
  INFECT_RISING_HP_V7,
  PRIOR_RULESET_7_IDS,
  RAISE_DEAD_SKELETON_HP_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  booScaresV7,
  deathCreatesGraveV7,
  effectiveRoleRuleV7,
  isLivingUnitV7,
  previewRaiseDeadV7,
  previewSwallowV7,
  queryCombatPreviewV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  unitRoleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  withHorrorV7,
  withTentacleV7,
  withUnboundV7,
} from "../fixtures/v7-cult";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  at,
  attackV7,
  fieldV7,
  kindsV7,
  patchUnitV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/**
 * Full-strength risings (`pulp_wars-1uof`, ruleset 7r139), user request of
 * 2026-11-10: Grave Rites (the Undead Planning) raises whole Skeletons,
 * Pestilence (the Undead Explosives) makes every new Zombie whole, and the
 * Cult's daemons are ordinary for death and infection (Infect, a bite,
 * Plague, the Wail, Swallow, and their Graves), with the exemptions that
 * belong to a unit's own identity kept (the Herald's Unstoppable, the
 * Gibbering Mass's immovability, the Tentacle, the Cult's own rites, and a
 * daemon's "never heals").
 *
 * Every state is built by hand on the two-seat 11 x 11 field of `fieldV7`
 * (seat 0 capital (8, 8), seat 1 capital (2, 8), open Grass elsewhere, all
 * of it explored); no match is played.
 */

const EVERY: readonly TechnologyIdV7[] = TECHNOLOGY_IDS_V7;

const field = (
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  techs: readonly TechnologyIdV7[] = EVERY,
  activeSeat = 0,
): GameStateV7 =>
  fieldV7(pieces, { factions, techs: { 0: techs, 1: EVERY }, activeSeat });

const withGraves = (state: GameStateV7, graves: readonly CoordV7[]) =>
  checkedV7({ ...state, graves: [...graves] });

const attack = (state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

/** A daemon of seat 1 (the Cult) on `where`. */
const daemon = (
  state: GameStateV7,
  where: CoordV7,
  role: "IMP" | "HORROR" | "MASS" | "HERALD",
  hp?: number,
): GameStateV7 =>
  withHorrorV7(state, 1, where, { role, ...(hp === undefined ? {} : { hp }) });

const unitById = (state: GameStateV7, id: number): UnitStateV7 | undefined =>
  state.units.find((unit) => unit.id === id);

describe("full-strength risings: the identity", () => {
  it("is 7r139 after 7r138, whose save key is obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r139");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r139.current");
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe("pulp-wars-poc-7r138");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r138.current",
    );
  });
});

describe("full-strength risings: the technologies (7r139)", () => {
  it("names Planning Grave Rites for the Undead and gives whole risings to the Undead tree alone", () => {
    expect(technologyDisplayNameV7("PLANNING", "UNDEAD")).toBe("Grave Rites");
    expect(technologyDisplayNameV7("PLANNING", "ORIGINAL")).toBe("Land Grants");
    expect(technologyDisplayNameV7("EXPLOSIVES", "UNDEAD")).toBe("Pestilence");
    const planning = technologyCapabilitiesV7(["PLANNING"], "UNDEAD");
    // Grave Rites keeps what Land Grants gave (the city slot and the Land
    // Grant) and raises whole Skeletons.
    expect(planning.wholeSkeletons).toBe(true);
    expect(planning.wholeZombies).toBe(false);
    expect(planning.ownedCityCapacityBonus).toBe(1);
    expect(planning.commands).toContain("LAND_GRANT");
    const pestilence = technologyCapabilitiesV7(["EXPLOSIVES"], "UNDEAD");
    expect([pestilence.plague, pestilence.wholeZombies]).toEqual([true, true]);
    expect(pestilence.wholeSkeletons).toBe(false);
    // Two separate research choices, and no other tree has either.
    for (const faction of [
      "ORIGINAL",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
      "CULT",
    ] as const) {
      const all = technologyCapabilitiesV7(EVERY, faction);
      expect([all.wholeSkeletons, all.wholeZombies], faction).toEqual([
        false,
        false,
      ]);
    }
    expect([RAISE_DEAD_SKELETON_HP_V7, INFECT_RISING_HP_V7]).toEqual([5, 12]);
    expect(BITTEN_RISING_HP_V7).toBe(12);
  });
});

describe("full-strength risings: Raise Dead with Grave Rites", () => {
  const raise = (techs: readonly TechnologyIdV7[]) => {
    const state = withGraves(
      field(
        ["UNDEAD", "ORIGINAL"],
        [{ seat: 0, role: "CAPTAIN", at: at(5, 3) }],
        techs,
      ),
      [at(4, 2), at(6, 4)],
    );
    const necromancer = unitAtV7(state, at(5, 3));
    const preview = previewRaiseDeadV7(
      viewForV7(state, necromancer.ownerId),
      necromancer.id,
    );
    const raised = playV7(state, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    return {
      preview,
      skeletons: [at(4, 2), at(6, 4)].map((where) =>
        unitAtV7(raised.state, where),
      ),
    };
  };

  it("raises 5-HP Skeletons without it and whole 10-HP ones with it, as previewed", () => {
    const without = raise(withoutTechsV7("UNDEAD", "PLANNING"));
    expect(without.preview?.hp).toBe(5);
    for (const skeleton of without.skeletons)
      expect(skeleton).toMatchObject({ role: "FIGHTER", hp: 5, maxHp: 10 });
    const whole = raise(EVERY);
    expect(whole.preview?.hp).toBe(10);
    for (const skeleton of whole.skeletons)
      expect(skeleton).toMatchObject({ role: "FIGHTER", hp: 10, maxHp: 10 });
  });
});

describe("full-strength risings: new Zombies with Pestilence", () => {
  const without = withoutTechsV7("UNDEAD", "EXPLOSIVES");

  it("raises an Infect victim at 12 without it and whole at 18 with it", () => {
    for (const [techs, hp] of [
      [without, 12],
      [EVERY, 18],
    ] as const) {
      const state = field(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
        ],
        techs,
      );
      const run = attackV7(state, at(5, 3), at(5, 2));
      expect(run.combat.defenderInfected).toBe(true);
      expect(unitAtV7(run.state, at(5, 2))).toMatchObject({
        role: "GUARD",
        ownerId: seatIdV7(state, 0),
        hp,
        maxHp: 18,
      });
    }
  });

  it("raises a Bitten victim at 12 without it and whole at 18 with it", () => {
    for (const [techs, hp] of [
      [without, 12],
      [EVERY, 18],
    ] as const) {
      const base = field(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 0, role: "GUARD", at: at(7, 3) },
          { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
        ],
        techs,
      );
      const state = checkedV7({
        ...base,
        bitten: [
          {
            unitId: unitAtV7(base, at(5, 2)).id,
            biterPlayerId: seatIdV7(base, 0),
            biterUnitId: unitAtV7(base, at(7, 3)).id,
          },
        ],
      });
      const run = attackV7(state, at(5, 3), at(5, 2));
      expect(kindsV7(run.events)).toContain("BITTEN_UNIT_RISEN");
      expect(unitAtV7(run.state, at(5, 2))).toMatchObject({
        role: "GUARD",
        ownerId: seatIdV7(state, 0),
        hp,
      });
    }
  });

  it("spits out a digested victim at 12 without it and whole at 18 with it", () => {
    for (const [techs, hp] of [
      [without, 12],
      [EVERY, 18],
    ] as const) {
      const state = field(
        ["UNDEAD", "ORIGINAL"],
        [
          { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 3 },
        ],
        techs,
      );
      const undead = seatIdV7(state, 0);
      // The Abomination's attack on a unit it may swallow is a Swallow.
      const swallowed = applyOkV7(
        state,
        undead,
        attack(state, at(5, 3), at(6, 3)),
      );
      expect(kindsV7(swallowed.events)).toContain("UNIT_SWALLOWED");
      // At its owner's next Start Turn the 3-HP victim is digested.
      const turn = endTurnUntilV7(swallowed.state, undead);
      const spat = turn.events.find(
        (event) => event.kind === "UNIT_REGURGITATED",
      );
      if (spat?.kind !== "UNIT_REGURGITATED" || spat.zombieUnitId === null)
        throw new Error("no Zombie");
      expect(unitById(turn.state, spat.zombieUnitId)).toMatchObject({
        role: "GUARD",
        ownerId: undead,
        hp,
        maxHp: 18,
      });
    }
  });
});

describe("full-strength risings: daemons are ordinary for death and infection", () => {
  const vsCult = (pieces: readonly GoblinPieceV7[]) =>
    field(["UNDEAD", "CULT"], pieces);

  it("raises an Imp and a Horror a Zombie kills as Zombies, with no Grave", () => {
    for (const role of ["IMP", "HORROR"] as const) {
      const state = daemon(
        vsCult([{ seat: 0, role: "GUARD", at: at(5, 3) }]),
        at(5, 2),
        role,
        1,
      );
      const run = attackV7(state, at(5, 3), at(5, 2));
      expect(run.preview.defenderInfected, role).toBe(true);
      expect(kindsV7(run.events), role).toContain("UNIT_INFECTED");
      const risen = unitAtV7(run.state, at(5, 2));
      expect(risen, role).toMatchObject({
        role: "GUARD",
        ownerId: seatIdV7(state, 0),
        hp: 18,
      });
      expect(risen.summoned, role).toBeUndefined();
      expect(run.state.graves, role).toEqual([]);
    }
  });

  it("bites a daemon, and the bitten daemon rises as a Zombie when it dies", () => {
    const state = daemon(
      vsCult([
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
      ]),
      at(5, 2),
      "HORROR",
    );
    const horror = unitAtV7(state, at(5, 2));
    expect(isLivingUnitV7(state, horror)).toBe(true);
    const bite = attackV7(state, at(5, 3), at(5, 2));
    expect(bite.preview.defenderBitten).toBe(true);
    expect(bite.state.bitten).toEqual([
      expect.objectContaining({
        unitId: horror.id,
        biterPlayerId: seatIdV7(state, 0),
      }),
    ]);
    // Broken, it dies to a Skeleton and rises for the biter seat.
    const broken = patchUnitV7(bite.state, at(5, 2), { hp: 1 });
    const kill = attackV7(broken, at(4, 2), at(5, 2));
    expect(kill.preview.defenderBittenRises).toBe(true);
    expect(kindsV7(kill.events)).toContain("BITTEN_UNIT_RISEN");
    expect(unitAtV7(kill.state, at(5, 2))).toMatchObject({
      role: "GUARD",
      ownerId: seatIdV7(state, 0),
    });
  });

  it("plagues a daemon a Lich hits", () => {
    const state = daemon(
      vsCult([{ seat: 0, role: "CATAPULT", at: at(5, 5 - 1) }]),
      at(5, 2),
      "HORROR",
    );
    const shot = attackV7(state, at(5, 4), at(5, 2));
    expect(shot.preview.plagued).toEqual([unitAtV7(state, at(5, 2)).id]);
    expect(shot.state.plagued).toEqual([
      expect.objectContaining({ unitId: unitAtV7(state, at(5, 2)).id }),
    ]);
  });

  it("wails a daemon to death; it leaves a Grave that Raise Dead uses", () => {
    const state = daemon(
      vsCult([
        { seat: 0, role: "MARKSMAN", at: at(5, 4) },
        { seat: 0, role: "CAPTAIN", at: at(6, 4) },
      ]),
      at(5, 2),
      "IMP",
      1,
    );
    const wail = playV7(state, {
      kind: "WAIL",
      unitId: unitAtV7(state, at(5, 4)).id,
    });
    expect(kindsV7(wail.events)).toContain("GRAVE_CREATED");
    expect(wail.state.graves).toEqual([at(5, 2)]);
    const necromancer = unitAtV7(wail.state, at(6, 4));
    const raised = playV7(wail.state, {
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    expect(raised.state.graves).toEqual([]);
    expect(unitAtV7(raised.state, at(5, 2))).toMatchObject({
      role: "FIGHTER",
      ownerId: seatIdV7(state, 0),
      // Whole with Grave Rites (every technology).
      hp: 10,
    });
  });

  it("swallows a hurt Imp, but never a Gibbering Mass (immovable)", () => {
    const imp = daemon(
      vsCult([{ seat: 0, role: "JUGGERNAUT", at: at(5, 3) }]),
      at(5, 2),
      "IMP",
    );
    const undead = seatIdV7(imp, 0);
    expect(
      previewSwallowV7(
        viewForV7(imp, undead),
        unitAtV7(imp, at(5, 3)).id,
        unitAtV7(imp, at(5, 2)).id,
      ),
    ).not.toBeNull();
    const swallowed = applyOkV7(imp, undead, attack(imp, at(5, 3), at(5, 2)));
    expect(kindsV7(swallowed.events)).toContain("UNIT_SWALLOWED");
    expect(swallowed.state.giants.swallowed[0]?.unit.summoned).toBe("IMP");
    const mass = daemon(
      vsCult([{ seat: 0, role: "JUGGERNAUT", at: at(5, 3) }]),
      at(5, 2),
      "MASS",
      6,
    );
    expect(
      previewSwallowV7(
        viewForV7(mass, undead),
        unitAtV7(mass, at(5, 3)).id,
        unitAtV7(mass, at(5, 2)).id,
      ),
    ).toBeNull();
  });
});

describe("full-strength risings: the exemptions a unit's identity keeps", () => {
  it("keeps every status off the Herald (Unstoppable), yet a Zombie that kills it Infects it", () => {
    const zombie = daemon(
      field(["UNDEAD", "CULT"], [{ seat: 0, role: "GUARD", at: at(5, 3) }]),
      at(5, 2),
      "HERALD",
    );
    const herald = unitAtV7(zombie, at(5, 2));
    const bite = attackV7(zombie, at(5, 3), at(5, 2));
    expect(bite.preview.defenderBitten).toBe(false);
    expect(bite.state.bitten).toEqual([]);
    const lich = daemon(
      field(["UNDEAD", "CULT"], [{ seat: 0, role: "CATAPULT", at: at(5, 4) }]),
      at(5, 2),
      "HERALD",
    );
    expect(attackV7(lich, at(5, 4), at(5, 2)).state.plagued).toEqual([]);
    // The Wail hurts it (damage of every kind does) but never terrifies it.
    const banshee = daemon(
      field(["UNDEAD", "CULT"], [{ seat: 0, role: "MARKSMAN", at: at(5, 4) }]),
      at(5, 2),
      "HERALD",
    );
    const wail = playV7(banshee, {
      kind: "WAIL",
      unitId: unitAtV7(banshee, at(5, 4)).id,
    });
    const resolved = wail.events.find(
      (event) => event.kind === "WAIL_RESOLVED",
    );
    if (resolved?.kind !== "WAIL_RESOLVED") throw new Error("no Wail");
    expect(resolved.results.map((entry) => entry.unitId)).toEqual([
      unitAtV7(banshee, at(5, 2)).id,
    ]);
    expect(resolved.terrified).toEqual([]);
    expect(wail.state.terrorThisTurn).toEqual([]);
    // Infect is a death, not a status: a Herald a Zombie kills rises.
    const dying = patchUnitV7(zombie, at(5, 2), { hp: 1 });
    const kill = attackV7(dying, at(5, 3), at(5, 2));
    expect(kindsV7(kill.events)).toContain("UNIT_INFECTED");
    expect(unitById(kill.state, herald.id)).toBeUndefined();
    expect(unitAtV7(kill.state, at(5, 2)).role).toBe("GUARD");
  });

  it("never heals a daemon: a hurt Imp idle in its own land stays hurt", () => {
    const state = daemon(
      field(
        ["UNDEAD", "CULT"],
        [{ seat: 1, role: "FIGHTER", at: at(2, 7), hp: 3 }],
        EVERY,
        1,
      ),
      at(3, 7),
      "IMP",
      3,
    );
    const imp = unitAtV7(state, at(3, 7));
    const initiate = unitAtV7(state, at(2, 7));
    const ended = applyOkV7(state, imp.ownerId, { kind: "END_TURN" });
    // The Initiate beside it recovers; the Imp does not.
    expect(unitById(ended.state, initiate.id)?.hp).toBeGreaterThan(3);
    expect(unitById(ended.state, imp.id)?.hp).toBe(3);
  });

  it("keeps the Cult's own rites off a daemon: no Seizure and no Boo!", () => {
    // A Summoner of seat 0 beside a broken enemy Imp that its Initiate holds.
    const state = withHorrorV7(
      fieldV7(
        [
          { seat: 0, role: "CAPTAIN", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(4, 2) },
        ],
        { factions: ["CULT", "CULT"] },
      ),
      1,
      at(5, 2),
      { role: "IMP", hp: 2 },
    );
    const imp = unitAtV7(state, at(5, 2));
    expect(
      rejectedV7(state, {
        kind: "SEIZE",
        unitId: unitAtV7(state, at(5, 3)).id,
        victimUnitId: imp.id,
      }),
    ).toEqual({ code: "SEIZE_NOT_LEGAL", params: { reason: "IMMUNE" } });
    expect(booScaresV7(state, imp)).toBe(false);
    expect(booScaresV7(state, unitAtV7(state, at(4, 2)))).toBe(true);
  });

  it("leaves no Grave of a Tentacle, which is still no living thing", () => {
    const state = withTentacleV7(
      field(["CULT", "UNDEAD"], [{ seat: 0, role: "CAPTAIN", at: at(5, 3) }]),
      at(5, 3),
      at(5, 2),
    );
    const tentacle = unitAtV7(state, at(5, 2));
    expect(unitRoleMechanicsV7(state, tentacle).construct).toBe(true);
    expect(deathCreatesGraveV7(state, [], tentacle)).toBe(false);
    // A daemon's death on the same tile leaves one.
    const imp = withHorrorV7(field(["CULT", "UNDEAD"], []), 0, at(5, 2), {
      role: "IMP",
    });
    expect(deathCreatesGraveV7(imp, [], unitAtV7(imp, at(5, 2)))).toBe(true);
  });

  it("drops a daemon's bite when it breaks loose, and an Unbound daemon never rises", () => {
    const base = daemon(
      field(["UNDEAD", "CULT"], [{ seat: 0, role: "GUARD", at: at(5, 3) }]),
      at(5, 2),
      "IMP",
      1,
    );
    const imp = unitAtV7(base, at(5, 2));
    const bitten = checkedV7({
      ...base,
      bitten: [
        {
          unitId: imp.id,
          biterPlayerId: seatIdV7(base, 0),
          biterUnitId: unitAtV7(base, at(5, 3)).id,
        },
      ],
    });
    const loose = withUnboundV7(bitten, at(5, 2), 1);
    expect(loose.bitten).toEqual([]);
    const preview = queryCombatPreviewV7(
      viewForV7(loose, seatIdV7(loose, 0)),
      unitAtV7(loose, at(5, 3)).id,
      imp.id,
    );
    expect(preview?.defenderDies).toBe(true);
    // Like every neutral unit (the Giant Spider) it takes no status.
    expect(preview?.defenderInfected).toBe(false);
    expect(effectiveRoleRuleV7("GUARD", "UNDEAD").maxHp).toBe(18);
  });
});
