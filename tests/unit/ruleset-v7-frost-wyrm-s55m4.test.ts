import { describe, expect, it } from "vitest";
import {
  ICE_FOLK_BASELINE_V1_NODES,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  parseEventV7,
  parseGameStateV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  unitIsIceFolkGroundV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  FROST_BREATH_PREVIEW_V7,
  iceFolkAbilityDescriptionV7,
  iceFolkAbilityNameV7,
  iceFolkBoundaryNoticeV7,
  iceFolkCombatLinesV7,
  iceFolkRecruitNotesV7,
  iceFolkRoleUnlockTextV7,
} from "../../src/render/ice-folk-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { unitCandidatesV7 } from "../fixtures/v7-dinosaur-ai";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7, type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { activeIdV7, at, withoutTechsV7 } from "../fixtures/v7-revision20";

// The Ice Folk roster rework (`pulp_wars-s55m.4`, `pulp-wars-poc-7r125`).
// The user, 2026-11-06: the Sabretooth "is lame. This unit should be
// comparable to knight, vampire, mothership ufo etc."; "overall ice folk
// seem weak and lacking aggressive unit ... They lack the powerful
// battleship unit and don't have anything to make up for it." The Frost
// Wyrm takes the KNIGHT slot: a flyer (over Shallow and Deep Water without
// Navigation), cost 9, 14 HP, Attack 3, Defense 1, Move 3, whose Frost
// Breath Freezes every target its attack leaves alive, ships included; its
// next blow from the next tile Shatters what it froze. The Musk Ox is the
// Walrus and the Boulder Yeti the Snow Golem (the same rules). Hand-built
// states only.

const FAR: IcePieceV7 = { seat: 1, role: "FIGHTER", at: at(9, 1) };
const own = (
  role: IcePieceV7["role"],
  where: CoordV7,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 0, role, at: where, ...extra });
const foe = (
  role: IcePieceV7["role"],
  where: CoordV7,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 1, role, at: where, ...extra });
const ship = (role: "PATROL_BOAT" | "BATTLESHIP", where: CoordV7) =>
  foe(role, where, { form: "NAVAL" });

/** Every Ice Folk technology but Pack Ice (Navigation) and its children. */
const NO_NAVIGATION = { 0: withoutTechsV7("ICE_FOLK", "NAVIGATION") };

const preview = (state: GameStateV7, from: CoordV7, to: CoordV7) => {
  const result = queryCombatPreviewV7(
    viewForV7(state, activeIdV7(state)),
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
  if (result === null) throw new Error("no preview");
  return result;
};

const attack = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): Extract<CommandV7, { kind: "ATTACK" }> => ({
  kind: "ATTACK",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

/**
 * Applies an offered command (a Move: one is offered to the same tile);
 * its events and state must parse.
 */
function play(state: GameStateV7, command: CommandV7) {
  const offered = queryPlayerCommandsV7(viewForV7(state, activeIdV7(state)));
  if (command.kind === "MOVE") {
    const end = command.path.at(-1) as CoordV7;
    expect(
      offered.some(
        (other) =>
          other.kind === "MOVE" &&
          other.unitId === command.unitId &&
          other.path.at(-1)?.x === end.x &&
          other.path.at(-1)?.y === end.y,
      ),
      `a MOVE to ${String(end.x)},${String(end.y)} is offered`,
    ).toBe(true);
  } else expect(offered).toContainEqual(command);
  const result = applyCommandV7(state, activeIdV7(state), command);
  if (!result.accepted) throw new Error(JSON.stringify(result.error));
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return result;
}

describe("the identity", () => {
  // The starting border freeze (`pulp_wars-s55m.6`) took 7r126 after it.
  it("was 7r125 after 7r124, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r138");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r138.current");
    const at = PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r125");
    expect(at).toBeGreaterThan(0);
    expect(PRIOR_RULESET_7_IDS[at - 1]).toBe("pulp-wars-poc-7r124");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    const key = OBSOLETE_SAVE_STORAGE_KEYS_V7.indexOf(
      "pulpWars.save.v7r125.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7[key - 1]).toBe(
      "pulpWars.save.v7r124.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("the Frost Wyrm (the KNIGHT slot)", () => {
  it("is a 9-Coin flyer with Frost Breath, at the Sabretooth's numbers", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "ICE_FOLK")).toMatchObject({
      label: "Frost Wyrm",
      tacticalRole: "BREAKTHROUGH",
      cost: 9,
      maxHp: 14,
      attack2: 6,
      defense2: 2,
      move: 3,
      range: 1,
      minimumRange: 1,
      // Sight 2, as every flyer.
      sightRadius: 2,
      technology: "CHIVALRY",
      mayUsePrimaryActionAfterMove: true,
      // (`FREEZE` went with the one Freeze effect, `pulp_wars-xv0t`.)
      abilities: ["ATTACK", "CAPTURE", "FLY", "FROST_BREATH"],
    });
    expect(roleMechanicsV7("KNIGHT", "ICE_FOLK")).toMatchObject({
      movementMode: "FLY",
      advancesAfterKill: false,
      fliesOverDeepWater: true,
      frostBreath: true,
      // No Prowl, Cold Blood, Glide, or Overrun any more.
      ignoresZocStops: false,
      coldBloodBonus2: 0,
      glides: false,
    });
    // Chivalry trains it and grants no Overrun.
    const chivalry = ICE_FOLK_BASELINE_V1_NODES.find(
      (node) => node.id === "CHIVALRY",
    );
    expect(chivalry?.unlocks.map((unlock) => unlock.kind)).not.toContain(
      "OVERRUN",
    );
    expect(chivalry?.unlockedRoles).toEqual(["KNIGHT"]);
    // No other faction breathes frost or flies over Deep Water for free.
    for (const faction of ["ORIGINAL", "MARTIAN", "DWARF"] as const)
      for (const role of ["RAIDER", "KNIGHT"] as const)
        expect(roleMechanicsV7(role, faction)).toMatchObject({
          frostBreath: false,
          fliesOverDeepWater: false,
        });
  });

  it("renames the Musk Ox the Walrus and the Boulder Yeti the Snow Golem, with the same rules", () => {
    expect(effectiveRoleRuleV7("GUARD", "ICE_FOLK")).toMatchObject({
      label: "Walrus",
      cost: 4,
      maxHp: 16,
      abilities: ["ATTACK", "CAPTURE"],
    });
    // The one Freeze effect (`pulp_wars-xv0t`) keeps the Walrus's Frostbite.
    expect(roleMechanicsV7("GUARD", "ICE_FOLK").frostbite).toBe(true);
    // The Snow Golem and the Mammoth (`pulp_wars-3qtp`, 7r134): the Catapult's reach
    // and the Snowball in Boulders' place.
    expect(effectiveRoleRuleV7("CATAPULT", "ICE_FOLK")).toMatchObject({
      label: "Snow Golem",
      cost: 9,
      maxHp: 10,
      range: 3,
      abilities: ["ATTACK", "CAPTURE", "SNOWBALL", "MOUNTAIN_BORN"],
    });
    expect(roleMechanicsV7("CATAPULT", "ICE_FOLK")).toMatchObject({
      ignoresFortification: false,
      mountainBorn: true,
    });
  });
});

describe("the Frost Wyrm's flight", () => {
  it("crosses and hovers over Shallow and Deep Water without Navigation, in land form", () => {
    const state = iceFieldV7([own("KNIGHT", at(2, 2)), FAR], {
      water: [at(3, 2)],
      deepWater: [at(4, 2), at(5, 2)],
      techs: NO_NAVIGATION,
    });
    const run = play(state, {
      kind: "MOVE",
      unitId: unitAtV7(state, at(2, 2)).id,
      path: [at(3, 2), at(4, 2), at(5, 2)],
    });
    expect(unitAtV7(run.state, at(5, 2))).toMatchObject({
      role: "KNIGHT",
      form: "LAND",
    });
    expect(run.events.map((event) => event.kind)).not.toContain(
      "UNIT_EMBARKED",
    );
    // Another faction's flyer without Navigation still stops at Deep Water.
    const saucer = iceFieldV7([own("RAIDER", at(2, 2)), FAR], {
      factions: ["MARTIAN", "ORIGINAL"],
      water: [at(3, 2)],
      deepWater: [at(4, 2)],
      techs: { 0: withoutTechsV7("MARTIAN", "NAVIGATION") },
    });
    expect(
      queryPlayerCommandsV7(viewForV7(saucer, activeIdV7(saucer))).some(
        (command) =>
          command.kind === "MOVE" &&
          command.path.some((step) => step.x === 4 && step.y === 2),
      ),
    ).toBe(false);
  });

  it("neither skates nor dives nor glides: every step is a whole one of its Move 3", () => {
    const state = iceFieldV7([own("KNIGHT", at(2, 2)), FAR]);
    const wyrm = unitAtV7(state, at(2, 2));
    expect(unitIsIceFolkGroundV7(state, wyrm)).toBe(false);
    expect(unitIsIceFolkGroundV7(state, unitAtV7(state, at(9, 1)))).toBe(false);
    const names = roleGlossaryV7("KNIGHT", "ICE_FOLK").map(
      (entry) => entry.name,
    );
    expect(names).toEqual(
      expect.arrayContaining(["Flies", "Frost Breath", "Sea wings"]),
    );
    for (const gone of ["Skates", "Dive", "Glide", "Slips past", "Overrun"])
      expect(names, gone).not.toContain(gone);
    // Every other Ice Folk land unit Glides over Snow and ice (Skates
    // before skating became plain movement, `pulp_wars-ecnj`, 7r135).
    expect(roleGlossaryV7("FIGHTER", "ICE_FOLK").map((e) => e.name)).toContain(
      "Glide",
    );
  });
});

describe("Frost Breath", () => {
  it("freezes a ship it hits and leaves alive, for one turn, and says so in the preview", () => {
    const state = iceFieldV7(
      [own("KNIGHT", at(2, 2)), ship("BATTLESHIP", at(3, 2)), FAR],
      { water: [at(3, 2)] },
    );
    const combat = preview(state, at(2, 2), at(3, 2));
    expect(combat).toMatchObject({
      defenderDies: false,
      frostBreathApplied: true,
      shatters: false,
    });
    const view = viewForV7(state, activeIdV7(state));
    expect(iceFolkCombatLinesV7(view, combat).notes).toContain(
      FROST_BREATH_PREVIEW_V7,
    );
    expect(FROST_BREATH_PREVIEW_V7).toBe("Frost Breath: target Frozen");
    const run = play(state, attack(state, at(2, 2), at(3, 2)));
    const wyrm = unitAtV7(state, at(2, 2));
    const battleship = unitAtV7(state, at(3, 2));
    expect(run.events.filter((event) => event.kind === "UNITS_FROZEN")).toEqual(
      [
        {
          kind: "UNITS_FROZEN",
          playerId: wyrm.ownerId,
          sourceUnitId: wyrm.id,
          source: "FROST_BREATH",
          results: [{ unitId: battleship.id, turnsLeft: 1 }],
        },
      ],
    );
    expect(run.state.frozen).toEqual([{ unitId: battleship.id, turnsLeft: 1 }]);
    // The log line names the breath.
    const after = viewForV7(run.state, activeIdV7(state));
    const projected = projectEventsV7(
      state,
      run.state,
      activeIdV7(state),
      run.events,
    ).events;
    expect(iceFolkBoundaryNoticeV7(projected, view, after)?.text).toContain(
      "Frost Wyrm's Frost Breath froze a Battleship",
    );
  });

  it("freezes a land unit too, never one it kills, and its retaliation breathes no frost", () => {
    const guard = iceFieldV7([
      own("KNIGHT", at(4, 3)),
      foe("GUARD", at(5, 3)),
      FAR,
    ]);
    expect(preview(guard, at(4, 3), at(5, 3))).toMatchObject({
      defenderDies: false,
      frostBreathApplied: true,
    });
    const frozen = play(guard, attack(guard, at(4, 3), at(5, 3))).state;
    expect(frozen.frozen).toEqual([
      { unitId: unitAtV7(guard, at(5, 3)).id, turnsLeft: 1 },
    ]);
    // A kill freezes nobody.
    const kill = iceFieldV7([
      own("KNIGHT", at(4, 3)),
      foe("FIGHTER", at(5, 3), { hp: 1 }),
      FAR,
    ]);
    expect(preview(kill, at(4, 3), at(5, 3))).toMatchObject({
      defenderDies: true,
      frostBreathApplied: false,
    });
    const killed = play(kill, attack(kill, at(4, 3), at(5, 3)));
    expect(killed.events.map((event) => event.kind)).not.toContain(
      "UNITS_FROZEN",
    );
    // A Human Fighter that strikes the Wyrm is not frozen by its retaliation.
    const struck = iceFieldV7(
      [own("KNIGHT", at(4, 3)), foe("FIGHTER", at(5, 3)), FAR],
      { activeSeat: 1 },
    );
    expect(preview(struck, at(5, 3), at(4, 3))).toMatchObject({
      retaliation: true,
      frostBreathApplied: false,
    });
    const answered = play(struck, attack(struck, at(5, 3), at(4, 3)));
    expect(answered.state.frozen).toEqual([]);
  });

  it("its blow from the next tile Shatters a Frozen unit, as every Ice Folk blow does", () => {
    // A full-HP Frozen Fighter: Attack 3 deals 8 of 12, and the 4 left are
    // inside the Shatter window of 4. Unfrozen, the same blow leaves it at 4
    // and Frozen for the next blow.
    const frozen = iceFieldV7([
      own("KNIGHT", at(4, 3)),
      foe("FIGHTER", at(5, 3), { frozen: { turnsLeft: 1 } }),
      FAR,
    ]);
    expect(preview(frozen, at(4, 3), at(5, 3))).toMatchObject({
      shatters: true,
      defenderDies: true,
      damageToAttacker: 0,
      frostBreathApplied: false,
    });
    const fresh = iceFieldV7([
      own("KNIGHT", at(4, 3)),
      foe("FIGHTER", at(5, 3)),
      FAR,
    ]);
    expect(preview(fresh, at(4, 3), at(5, 3))).toMatchObject({
      damageToDefender: 8,
      defenderDies: false,
      frostBreathApplied: true,
    });
  });
});

describe("the Frost Wyrm's presentation", () => {
  it("names Frost Breath on its unlock, its card, and its recruit notes", () => {
    expect(iceFolkRoleUnlockTextV7("KNIGHT")).toBe(
      "Train Frost Wyrm (Frost Breath)",
    );
    expect(iceFolkAbilityNameV7("FROST_BREATH", "ICE_FOLK")).toBe(
      "Frost Breath",
    );
    expect(iceFolkAbilityNameV7("FLY", "ICE_FOLK")).toBe("Flies");
    expect(iceFolkAbilityDescriptionV7("FROST_BREATH", "ICE_FOLK")).toContain(
      "ships too",
    );
    expect(iceFolkRecruitNotesV7("KNIGHT", "ICE_FOLK")).toContain(
      "Flies over Shallow and Deep Water without Navigation.",
    );
  });
});

describe("the Normal AI and the Frost Wyrm", () => {
  it("flies out over Deep Water to strike and freeze a ship", () => {
    // The Wyrm on the shore (2, 2) without Rime or Pack Ice (no Freeze, no
    // Navigation); Shallow Water east of it, Deep Water from x 4; a hostile
    // Patrol Boat on the Deep Water (4, 2), out of reach from the shore.
    const state = iceFieldV7(
      [own("KNIGHT", at(2, 2)), ship("PATROL_BOAT", at(4, 2)), FAR],
      {
        water: [at(3, 1), at(3, 2), at(3, 3)],
        deepWater: [4, 5].flatMap((x) => [1, 2, 3].map((y) => at(x, y))),
        techs: { 0: withoutTechsV7("ICE_FOLK", "SHORECRAFT") },
      },
    );
    const best = unitCandidatesV7(state, at(2, 2), "MOVE")[0]?.command;
    if (best?.kind !== "MOVE") throw new Error("no Move");
    const to = best.path.at(-1) as CoordV7;
    // It ends over the water, next to the boat.
    expect(Math.max(Math.abs(to.x - 4), Math.abs(to.y - 2))).toBe(1);
    expect(to.x).toBeGreaterThanOrEqual(3);
    const flown = play(state, best).state;
    expect(unitAtV7(flown, to).form).toBe("LAND");
    const strike = unitCandidatesV7(flown, to, "ATTACK")[0]?.command;
    expect(strike).toEqual(attack(flown, to, at(4, 2)));
    const struck = play(flown, strike as CommandV7).state;
    expect(struck.frozen).toEqual([
      { unitId: unitAtV7(state, at(4, 2)).id, turnsLeft: 1 },
    ]);
  });

  it("strikes a ship beside it: the blow freezes and hurts", () => {
    // The Wyrm's Frost Breath Freezes the boat and deals damage (its
    // `FREEZE` of the boat's water went with the one Freeze effect,
    // `pulp_wars-xv0t`, 7r133).
    const state = iceFieldV7(
      [own("KNIGHT", at(2, 2)), ship("PATROL_BOAT", at(3, 2)), FAR],
      { water: [at(3, 1), at(3, 2), at(3, 3)] },
    );
    const offered = queryPlayerCommandsV7(
      viewForV7(state, activeIdV7(state)),
    ).filter(
      (command) =>
        "unitId" in command && command.unitId === unitAtV7(state, at(2, 2)).id,
    );
    expect(offered.some((command) => command.kind === "ATTACK")).toBe(true);
    const ranked = unitCandidatesV7(state, at(2, 2)).map(
      (candidate) => candidate.command,
    );
    const strike = ranked.findIndex(
      (command) =>
        command.kind === "ATTACK" &&
        command.targetUnitId === unitAtV7(state, at(3, 2)).id,
    );
    expect(strike).toBe(
      ranked.findIndex((command) => command.kind === "ATTACK"),
    );
  });
});
