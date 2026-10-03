import { describe, expect, it } from "vitest";
import { isSnowV7 } from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { chillAtV7, iceFieldV7 } from "../fixtures/v7-ice-folk";
import { playV7 } from "../fixtures/v7-martian";
import { at, attackV7, kindsV7, walledV7 } from "../fixtures/v7-revision20";

// The Ice Folk revision (`pulp_wars-7g3.3`): interactions with the other
// five factions (docs/product/RULESET_7_ICE_FOLK.md section 10).

/** Seat 1 (`faction`, active) attacks Ice Folk units beside a Witch on (5, 2). */
const besideWitch = (
  faction: "ORIGINAL" | "UNDEAD" | "GOBLIN" | "DINOSAUR" | "MARTIAN",
  attacker: Parameters<typeof iceFieldV7>[0][number],
  more: Parameters<typeof iceFieldV7>[0] = [],
) =>
  iceFieldV7(
    [
      { seat: 0, role: "CAPTAIN", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      attacker,
      ...more,
    ],
    { factions: ["ICE_FOLK", faction], activeSeat: 1, techs: { 0: [] } },
  );

describe("Undead (section 10.1)", () => {
  it("a Lich's shot at a Yeti in a Blizzard is halved; its splash is computed from the halved hit", () => {
    const state = besideWitch("UNDEAD", {
      seat: 1,
      role: "CATAPULT",
      at: at(5, 5),
    });
    const run = attackV7(state, at(5, 5), at(5, 3));
    expect(run.combat.blizzardHalved).toBe(true);
    const hit = run.combat.damageToDefender + run.combat.defenderShieldDamage;
    // The Witch on (5, 2) is next to the target and is splashed.
    expect(run.combat.splash.map((entry) => entry.damage)).toEqual([
      Math.max(1, Math.ceil(hit / 2)),
    ]);
  });

  it("a Witch killed by a Zombie rises and her Blizzard ends", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2), hp: 1 },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["ICE_FOLK", "UNDEAD"], activeSeat: 1, techs: { 0: [] } },
    );
    expect(isSnowV7(state, at(6, 1))).toBe(true);
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat.defenderInfected).toBe(true);
    expect(isSnowV7(run.state, at(6, 1))).toBe(false);
  });
});

describe("Goblins (section 10.2)", () => {
  it("a Kaboom deals its fixed damage, ignoring Snow cover and the Blizzard", () => {
    const state = besideWitch("GOBLIN", {
      seat: 1,
      role: "FIGHTER",
      at: at(6, 4),
    });
    const result = playV7(state, {
      kind: "KABOOM",
      unitId: unitAtV7(state, at(6, 4)).id,
    });
    const blast = result.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    expect(blast?.kind).toBe("EXPLOSION_RESOLVED");
    if (blast?.kind !== "EXPLOSION_RESOLVED") return;
    const yeti = blast.results.find(
      (entry) => entry.unitId === unitAtV7(state, at(5, 3)).id,
    );
    expect(yeti?.damage).toBe(blast.damage);
  });
});

describe("Dinosaurs (section 10.3)", () => {
  it("a Spitter's Acid ignores Snow cover, and its shot from distance 2 into a Blizzard is halved (5 becomes 3)", () => {
    const state = besideWitch("DINOSAUR", {
      seat: 1,
      role: "MARKSMAN",
      at: at(5, 5),
    });
    expect(attackV7(state, at(5, 5), at(5, 3)).combat).toMatchObject({
      acid: true,
      snowCover: false,
      blizzardHalved: true,
      damageToDefender: 3,
    });
  });
});

describe("Martians (section 10.4)", () => {
  it("a full-power ray at distance 2 on a Yeti beside a Witch deals 4", () => {
    const state = besideWitch("MARTIAN", {
      seat: 1,
      role: "MARKSMAN",
      at: at(5, 5),
    });
    expect(attackV7(state, at(5, 5), at(5, 3)).combat).toMatchObject({
      rayPower: "FULL",
      blizzardHalved: true,
      damageToDefender: 4,
    });
  });

  it("the Tractor Beam pulls a Chilled unit, which keeps its Chill; Mind Control of a Witch ends her Blizzard", () => {
    const pull = iceFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(4, 3) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(6, 3),
          chill: { sluggish: false, turnsLeft: 1 },
        },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"], activeSeat: 1, techs: { 0: [] } },
    );
    const pulled = playV7(pull, {
      kind: "TRACTOR_BEAM",
      unitId: unitAtV7(pull, at(4, 3)).id,
      targetUnitId: unitAtV7(pull, at(6, 3)).id,
    });
    expect(chillAtV7(pulled.state, at(5, 3))).toMatchObject({ turnsLeft: 1 });
    const control = iceFieldV7(
      [
        { seat: 1, role: "CAPTAIN", at: at(4, 3) },
        { seat: 0, role: "CAPTAIN", at: at(5, 3), hp: 4 },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"], activeSeat: 1, techs: { 0: [] } },
    );
    expect(isSnowV7(control, at(6, 4))).toBe(true);
    const mind = playV7(control, {
      kind: "MIND_CONTROL",
      unitId: unitAtV7(control, at(4, 3)).id,
      targetUnitId: unitAtV7(control, at(5, 3)).id,
    });
    expect(isSnowV7(mind.state, at(6, 4))).toBe(false);
  });

  it("the Disintegrator removes a Yeti's Walls, which still leaves it without Snow cover", () => {
    const walled = walledV7({
      defenderFaction: "ICE_FOLK",
      defender: "FIGHTER",
      attackerFaction: "MARTIAN",
      attackers: [{ role: "MARKSMAN", at: at(8, 6) }],
    });
    const run = attackV7(walled, at(8, 6), at(8, 8));
    expect(run.combat).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 2,
      snowCover: false,
      defenseBonusNumerator: 1,
    });
    expect(kindsV7(run.events)).toContain("COMBAT_RESOLVED");
  });
});

describe("Humans (section 10.5)", () => {
  it("a Catapult's shot is halved against a unit in a Blizzard", () => {
    const state = besideWitch("ORIGINAL", {
      seat: 1,
      role: "CATAPULT",
      at: at(5, 6),
    });
    expect(attackV7(state, at(5, 6), at(5, 3)).combat.blizzardHalved).toBe(
      true,
    );
    expect(checkedV7(state).chilled).toEqual([]);
  });
});
