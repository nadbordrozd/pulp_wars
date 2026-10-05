import { describe, expect, it } from "vitest";
import {
  DINOSAUR_BASELINE_V1_NODES,
  FACTION_IDS_V7,
  GOBLIN_BASELINE_V1_NODES,
  ORIGINAL_BASELINE_V5_NODES,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNDEAD_BASELINE_V1_NODES,
  applyCommandV7,
  assignedUnitCountV7,
  cityUnitCapacityForV7,
  cityUnitCapacityV7,
  createInitialMapStateV7,
  estimateCombatV7,
  fortificationLevelForUnitV7,
  previewCityCapacityV7,
  previewLayEggV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type MatchSetupV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  fieldV7,
  forestV7,
  kindsV7,
  patchUnitV7,
  tileV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// Revision 20 (`pulp_wars-0hi.2`): the Dinosaur Industry branch
// (docs/product/RULESET_7_REVISION_20.md section 4): Nesting's unit slot and
// Wallbreaker.

const WITHOUT_NESTING = withoutTechsV7("DINOSAUR", "FORTIFICATION");
const WITHOUT_WALLBREAKER = withoutTechsV7("DINOSAUR", "EXPLOSIVES");

describe("ruleset-7 revision-20 Nesting city slot", () => {
  it("registers the unlock and reads it through the capability", () => {
    expect(
      DINOSAUR_BASELINE_V1_NODES.find((node) => node.id === "FORTIFICATION")
        ?.unlocks,
    ).toEqual([{ kind: "NESTING", eggHp: 4, hatchTurns: 1, citySlots: 1 }]);
    expect(
      FACTION_IDS_V7.map((faction) => [
        faction,
        technologyCapabilitiesV7([...TECHNOLOGY_IDS_V7], faction)
          .nestingCityCapacityBonus,
      ]),
    ).toEqual([
      ["ORIGINAL", 0],
      ["UNDEAD", 0],
      ["GOBLIN", 0],
      ["DINOSAUR", 1],
      ["MARTIAN", 0],
      ["ICE_FOLK", 0],
      ["DWARF", 0],
      ["CANDY", 0],
    ]);
    expect(
      technologyCapabilitiesV7(["DRILL"], "DINOSAUR").nestingCityCapacityBonus,
    ).toBe(0);
    // The Egg effects are unchanged.
    expect(
      technologyCapabilitiesV7(["DRILL", "FORTIFICATION"], "DINOSAUR"),
    ).toMatchObject({
      eggHpBonus: 4,
      eggHatchTurnReduction: 1,
      nestingCityCapacityBonus: 1,
    });
  });

  it("adds one slot at every level, with and without Planning, for a Dinosaur owner only", () => {
    for (const level of [1, 2, 3, 4, 5]) {
      // level + 1, +1 Planning, +1 Warrens, +1 Nesting.
      expect(cityUnitCapacityForV7(level, [], "DINOSAUR")).toBe(level + 1);
      expect(cityUnitCapacityForV7(level, ["FORTIFICATION"], "DINOSAUR")).toBe(
        level + 2,
      );
      expect(cityUnitCapacityForV7(level, ["PLANNING"], "DINOSAUR")).toBe(
        level + 2,
      );
      expect(
        cityUnitCapacityForV7(level, ["PLANNING", "FORTIFICATION"], "DINOSAUR"),
      ).toBe(level + 3);
      // Fortification is Field Defense for every other faction: no slot.
      expect(
        cityUnitCapacityForV7(level, ["PLANNING", "FORTIFICATION"], "ORIGINAL"),
      ).toBe(level + 2);
      expect(
        cityUnitCapacityForV7(level, ["PLANNING", "FORTIFICATION"], "UNDEAD"),
      ).toBe(level + 2);
      // Warrens and Nesting never combine: only the Dinosaur tree has it.
      expect(
        cityUnitCapacityForV7(level, ["PLANNING", "FORTIFICATION"], "GOBLIN"),
      ).toBe(level + 3);
    }
  });

  it("rejects a full city before Nesting and accepts the Egg after researching it", () => {
    // A level-1 capital with Planning holds three slots; three Cavemen fill
    // it.
    const full = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: WITHOUT_NESTING } },
    );
    const actor = activeIdV7(full);
    const city = cityOfV7(full, 0);
    const lay: CommandV7 = {
      kind: "LAY_EGG",
      cityId: city.id,
      role: "RAIDER",
      at: at(7, 7),
    };
    expect(cityUnitCapacityV7(full, city)).toBe(3);
    expect(previewCityCapacityV7(full, city.id)).toMatchObject({
      capacity: 3,
      assigned: 3,
      available: 0,
    });
    expect(
      previewLayEggV7(viewForV7(full, actor), city.id, "RAIDER"),
    ).toMatchObject({ capacity: 3, unavailableReason: "CITY_CAPACITY_FULL" });
    expect(queryPlayerCommandsV7(full, actor)).not.toContainEqual(lay);
    expect(applyCommandV7(full, actor, lay)).toMatchObject({
      accepted: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });
    expect(
      applyCommandV7(full, actor, {
        kind: "TRAIN",
        cityId: city.id,
        role: "FIGHTER",
      }),
    ).toMatchObject({ accepted: false, error: { code: "CITY_CAPACITY_FULL" } });
    // Researching Nesting raises the capacity of every owned city at once.
    const researched = applyOkV7(full, actor, {
      kind: "RESEARCH",
      tech: "FORTIFICATION",
    }).state;
    const after = cityOfV7(researched, 0);
    expect(cityUnitCapacityV7(researched, after)).toBe(4);
    expect(previewCityCapacityV7(researched, after.id)).toMatchObject({
      capacity: 4,
      assigned: 3,
      available: 1,
      overCapacity: 0,
    });
    expect(
      previewLayEggV7(viewForV7(researched, actor), after.id, "RAIDER"),
    ).toMatchObject({
      capacity: 4,
      usedSlots: 3,
      hp: 10,
      unavailableReason: null,
    });
    expect(queryPlayerCommandsV7(researched, actor)).toContainEqual(lay);
    const laid = applyOkV7(researched, actor, lay);
    expect(assignedUnitCountV7(laid.state, after.id)).toBe(4);
    // A two-slot Egg still needs two free slots.
    expect(
      previewLayEggV7(viewForV7(researched, actor), after.id, "CATAPULT"),
    ).toMatchObject({ slots: 2, unavailableReason: "CITY_CAPACITY_FULL" });
    // The opponent's capacity is untouched.
    expect(cityUnitCapacityV7(researched, cityOfV7(researched, 1))).toBe(3);
  });

  const capture = (
    factions: readonly [FactionIdV7, FactionIdV7],
    techs: Readonly<Record<number, readonly TechnologyIdV7[]>> = {},
  ): { readonly before: number; readonly after: number } => {
    const target = cityOfV7(
      goblinArenaV7(factions, [{ seat: 0, role: "FIGHTER", at: at(4, 3) }]),
      1,
    );
    const state = goblinArenaV7(
      factions,
      [
        { seat: 0, role: "FIGHTER", at: target.at, captureEligible: true },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "KNIGHT", at: at(1, 1) },
      ],
      { techs },
    );
    const before = cityUnitCapacityV7(state, target);
    const captured = applyOkV7(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, target.at).id,
    });
    const city = captured.state.cities.find((item) => item.id === target.id);
    if (city === undefined) throw new Error("city missing");
    expect(city.ownerId).toBe(state.humanPlayerId);
    return { before, after: cityUnitCapacityV7(captured.state, city) };
  };

  it("follows the current owner: gained by a Dinosaur capturer with Nesting, lost by the city's captor", () => {
    // A Dinosaur seat with Nesting captures a Human city: the slot at once.
    expect(capture(["DINOSAUR", "ORIGINAL"])).toEqual({ before: 3, after: 4 });
    // Without Nesting it gains nothing.
    expect(capture(["DINOSAUR", "ORIGINAL"], { 0: WITHOUT_NESTING })).toEqual({
      before: 3,
      after: 3,
    });
    // A Human seat captures a Dinosaur city: the slot is lost.
    expect(capture(["ORIGINAL", "DINOSAUR"])).toEqual({ before: 4, after: 3 });
    // A Goblin-captured Dinosaur city has Warrens and no Nesting slot.
    expect(capture(["GOBLIN", "DINOSAUR"])).toEqual({ before: 4, after: 4 });
    expect(capture(["GOBLIN", "DINOSAUR"], { 1: WITHOUT_NESTING })).toEqual({
      before: 3,
      after: 4,
    });
    // A Dinosaur-captured Goblin city trades Warrens for Nesting.
    expect(capture(["DINOSAUR", "GOBLIN"])).toEqual({ before: 4, after: 4 });
    expect(capture(["DINOSAUR", "GOBLIN"], { 0: WITHOUT_NESTING })).toEqual({
      before: 4,
      after: 3,
    });
  });

  it("starts the Showcase capital at 8 of 8 slots, North 3 of 7, Coast 2 of 6", () => {
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 1,
      width: 16,
      height: 16,
      aiCount: 3,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["DINOSAUR", "ORIGINAL", "GOBLIN", "UNDEAD"],
      mapType: "SHOWCASE",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    };
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const slots = (seat: number): readonly (readonly number[])[] =>
      state.cities
        .filter((city) => city.ownerId === seatIdV7(state, seat))
        .map((city) => [
          assignedUnitCountV7(state, city.id),
          cityUnitCapacityV7(state, city),
        ]);
    expect(slots(0)).toEqual([
      [8, 8],
      [3, 7],
      [2, 6],
    ]);
    // Human: level + 1 + Planning; Goblin adds Warrens; no Nesting slot.
    expect(slots(1).map(([, capacity]) => capacity)).toEqual([7, 6, 5]);
    expect(slots(2).map(([, capacity]) => capacity)).toEqual([8, 7, 6]);
    expect(slots(3).map(([, capacity]) => capacity)).toEqual([7, 6, 5]);
  });
});

describe("ruleset-7 revision-20 Wallbreaker", () => {
  it("registers the unlock beside both Explosives unlocks, for Dinosaurs only", () => {
    const explosives = (
      nodes: readonly {
        readonly id: string;
        readonly unlocks: readonly unknown[];
      }[],
    ): readonly unknown[] =>
      nodes.find((node) => node.id === "EXPLOSIVES")?.unlocks ?? [];
    const human = explosives(ORIGINAL_BASELINE_V5_NODES);
    expect(human).toEqual([
      { kind: "COMMAND", command: "BLAST_MOUNTAIN" },
      { kind: "MELEE_FIELD_DEMOLITION" },
    ]);
    expect(explosives(UNDEAD_BASELINE_V1_NODES)).toEqual(human);
    expect(explosives(GOBLIN_BASELINE_V1_NODES)).toEqual(human);
    expect(explosives(DINOSAUR_BASELINE_V1_NODES)).toEqual([
      ...human,
      { kind: "WALLBREAKER" },
    ]);
    expect(
      FACTION_IDS_V7.map((faction) => {
        const capabilities = technologyCapabilitiesV7(
          [...TECHNOLOGY_IDS_V7],
          faction,
        );
        return [
          faction,
          capabilities.ignoresCityWalls,
          capabilities.commands.includes("BLAST_MOUNTAIN"),
        ];
      }),
    ).toEqual([
      ["ORIGINAL", false, true],
      ["UNDEAD", false, true],
      ["GOBLIN", false, true],
      ["DINOSAUR", true, true],
      ["MARTIAN", false, true],
      ["ICE_FOLK", false, true],
      ["DWARF", false, true],
      ["CANDY", false, true],
    ]);
    expect(
      technologyCapabilitiesV7([...WITHOUT_WALLBREAKER], "DINOSAUR")
        .ignoresCityWalls,
    ).toBe(false);
  });

  it("names Explosives Wallbreaker and describes it for a Dinosaur viewer only", () => {
    expect(
      FACTION_IDS_V7.map((faction) => technologyNameV7("EXPLOSIVES", faction)),
    ).toEqual([
      "Explosives",
      "Explosives",
      "Explosives",
      "Wallbreaker",
      "Disintegrator",
      "Brittle",
      "Blasting Charges",
      "Peppermint Surprise",
    ]);
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
    );
    const text = (viewer: number, tech: string): readonly string[] => {
      const tree = queryTechnologyTreeV7(state, seatIdV7(state, viewer));
      const node = tree.nodes.find((item) => item.id === tech);
      if (node === undefined) throw new Error("node missing");
      return technologyEffectGroupsV7(node.effects, tree.faction).flatMap(
        (group) => group.items,
      );
    };
    expect(text(0, "EXPLOSIVES")).toEqual([
      "Blast mountain",
      "Surviving melee attacks destroy Field Defense",
      "Dinosaurs ignore City Walls",
    ]);
    expect(text(1, "EXPLOSIVES")).toEqual([
      "Blast mountain",
      "Surviving melee attacks destroy Field Defense",
    ]);
    expect(text(0, "FORTIFICATION")).toEqual([
      "Eggs have +4 HP and hatch one turn sooner; +1 unit slot in every city",
    ]);
    expect(text(0, "SAWMILLING")).toContain("Triceratops Egg (Charge!)");
  });

  /** The attack of `role` from (7, 8) (or two tiles away) on the center. */
  const onWalls = (
    role: UnitRoleIdV7,
    options: {
      readonly wallbreaker: boolean;
      readonly defender?: UnitRoleIdV7;
      readonly fieldDefense?: boolean;
      readonly attackerFaction?: FactionIdV7;
      readonly from?: ReturnType<typeof at>;
    },
  ) => {
    const from = options.from ?? at(7, 8);
    const state = walledV7({
      attackers: [{ role, at: from }],
      ...(options.defender === undefined ? {} : { defender: options.defender }),
      ...(options.fieldDefense === true ? { fieldDefense: true } : {}),
      ...(options.attackerFaction === undefined
        ? {}
        : { attackerFaction: options.attackerFaction }),
      ...(options.wallbreaker ? {} : { attackerTechs: WITHOUT_WALLBREAKER }),
    });
    return attackV7(state, from, at(8, 8));
  };

  it("matches the section 4.2 table", () => {
    for (const [role, defender, fieldDefense, without, withIt] of [
      ["KNIGHT", "GUARD", false, [8, 13], [10, 6]],
      ["KNIGHT", "GUARD", true, [7, 16], [9, 9]],
      ["RAIDER", "FIGHTER", false, [4, 11], [6, 4]],
      // The spec's table prints the Ankylosaurus's retaliation before its
      // own Armoured reduction (12 and 5); the exchange takes 1 less.
      ["GUARD", "FIGHTER", false, [3, 11], [5, 4]],
    ] as const) {
      const plain = onWalls(role, {
        wallbreaker: false,
        defender,
        fieldDefense,
      });
      expect(
        [plain.combat.damageToDefender, plain.combat.damageToAttacker],
        `${role} without`,
      ).toEqual(without);
      expect(plain.combat).toMatchObject({
        fortificationLevel: fieldDefense ? 3 : 2,
        fortificationIgnored: 0,
      });
      const broken = onWalls(role, {
        wallbreaker: true,
        defender,
        fieldDefense,
      });
      expect(
        [broken.combat.damageToDefender, broken.combat.damageToAttacker],
        `${role} with`,
      ).toEqual(withIt);
      // The Field Defense level stays; only the two Walls levels go.
      expect(broken.combat).toMatchObject({
        fortificationLevel: fieldDefense ? 1 : 0,
        fortificationIgnored: 2,
        acid: false,
        runUp: 0,
      });
    }
  });

  it("applies to each of the six dinosaur units and to no other unit", () => {
    // Raptor, Ankylosaurus, T-Rex, Brontosaurus: Walls ignored with it only.
    for (const role of ["RAIDER", "GUARD", "KNIGHT", "JUGGERNAUT"] as const) {
      expect(onWalls(role, { wallbreaker: false }).combat).toMatchObject({
        fortificationLevel: 2,
        fortificationIgnored: 0,
      });
      expect(onWalls(role, { wallbreaker: true }).combat).toMatchObject({
        fortificationLevel: 0,
        fortificationIgnored: 2,
      });
    }
    // Moot for the Triceratops (Charge! removes every level) and for the
    // Spitter (Acid removes cover and fortification and keeps `acid`).
    for (const wallbreaker of [false, true]) {
      expect(onWalls("CATAPULT", { wallbreaker }).combat).toMatchObject({
        fortificationLevel: 0,
        fortificationIgnored: 2,
      });
      expect(
        onWalls("MARKSMAN", { wallbreaker, from: at(6, 8) }).combat,
      ).toMatchObject({
        fortificationLevel: 0,
        fortificationIgnored: 0,
        acid: true,
      });
    }
    // Never the Caveman or the Shaman, and never another faction's units.
    for (const role of ["FIGHTER", "CAPTAIN"] as const)
      expect(onWalls(role, { wallbreaker: true }).combat).toMatchObject({
        fortificationLevel: 2,
        fortificationIgnored: 0,
      });
    for (const attackerFaction of ["ORIGINAL", "UNDEAD", "GOBLIN"] as const)
      for (const role of ["RAIDER", "KNIGHT", "JUGGERNAUT"] as const)
        expect(
          onWalls(role, { wallbreaker: true, attackerFaction }).combat,
          `${attackerFaction} ${role}`,
        ).toMatchObject({ fortificationLevel: 2, fortificationIgnored: 0 });
  });

  it("never applies to a boat", () => {
    // A Dinosaur Battleship three tiles from the Walled center.
    const base = walledV7({ attackers: [{ role: "FIGHTER", at: at(1, 1) }] });
    const water = [at(5, 8), at(4, 8)];
    const state = checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 1,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          water.some((where) => where.x === tile.at.x && where.y === tile.at.y)
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
                site: null,
              }
            : tile,
        ),
      },
      units: [
        ...base.units,
        {
          ...unitAtV7(base, at(1, 1)),
          id: base.nextEntityId as number as never,
          role: "BATTLESHIP" as const,
          form: "NAVAL" as const,
          at: at(5, 8),
          hp: 25,
          maxHp: 25,
        },
      ],
    });
    const preview = estimateCombatV7(
      state,
      unitAtV7(state, at(5, 8)).id,
      unitAtV7(state, at(8, 8)).id,
    );
    expect(preview).toMatchObject({
      fortificationLevel: 2,
      fortificationIgnored: 0,
    });
  });

  it("keeps Field Defense and cover, and leaves the Walls standing", () => {
    const run = onWalls("KNIGHT", { wallbreaker: true, fieldDefense: true });
    expect(run.combat).toMatchObject({
      fortificationLevel: 1,
      fortificationIgnored: 2,
    });
    // The Walls reward stays, and so does the fortification of the center.
    expect(cityOfV7(run.state, 0).rewards).toContainEqual({
      reachedLevel: 3,
      reward: "WALLS",
    });
    const guard = run.target;
    if (guard === undefined) throw new Error("Guard died");
    // (The surviving T-Rex's melee attack destroyed the Field Defense
    // through the ordinary Explosives rule.)
    expect(run.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(8, 8),
      reason: "EXPLOSIVES",
    });
    expect(fortificationLevelForUnitV7(run.state, guard)).toBe(2);
    // Cover is not fortification: a Guard in a Forest keeps x1.5.
    const covered = forestV7(
      fieldV7([
        { seat: 0, role: "KNIGHT", at: at(4, 7) },
        { seat: 1, role: "GUARD", at: at(3, 7) },
      ]),
      at(3, 7),
    );
    expect(attackV7(covered, at(4, 7), at(3, 7)).combat).toMatchObject({
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
      fortificationIgnored: 0,
    });
    // Field Defense off a city center is not Walls.
    const fortified = fieldDefenseV7(
      fieldV7([
        { seat: 0, role: "KNIGHT", at: at(4, 7) },
        { seat: 1, role: "GUARD", at: at(3, 7) },
      ]),
      at(3, 7),
    );
    expect(attackV7(fortified, at(4, 7), at(3, 7)).combat).toMatchObject({
      fortificationLevel: 1,
      fortificationIgnored: 0,
    });
  });

  it("applies to every Rampage attack of the turn", () => {
    // A weak Fighter stands next to the Walled center; the T-Rex kills it,
    // advances, and Rampages into the Guard on the Walls.
    const state = patchUnitV7(
      walledV7({
        attackers: [{ role: "KNIGHT", at: at(6, 8) }],
        defenders: [{ role: "FIGHTER", at: at(7, 8) }],
      }),
      at(7, 8),
      { hp: 1 },
    );
    const first = attackV7(state, at(6, 8), at(7, 8));
    expect(first.combat).toMatchObject({
      defenderDies: true,
      overrunContinues: true,
    });
    const second = attackV7(first.state, at(7, 8), at(8, 8));
    expect(second.combat).toMatchObject({
      attacksUsed: 2,
      fortificationLevel: 0,
      fortificationIgnored: 2,
    });
  });

  it("is read from the attacker's owner only: never on a retaliation or a defence", () => {
    // A Human Guard on its Walled center attacks an adjacent T-Rex whose
    // owner has Wallbreaker: nothing is ignored in that exchange.
    const state = walledV7({ attackers: [{ role: "KNIGHT", at: at(7, 8) }] });
    const human = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 0)),
    });
    const preview = estimateCombatV7(
      human,
      unitAtV7(human, at(8, 8)).id,
      unitAtV7(human, at(7, 8)).id,
    );
    expect(preview).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 0,
    });
    // The Guard's own fortification is not part of its attack either way.
    expect(fortificationLevelForUnitV7(human, unitAtV7(human, at(8, 8)))).toBe(
      2,
    );
  });

  it("keeps Blast Mountain and the melee Field Defense demolition", () => {
    const base = fieldDefenseV7(
      fieldV7([
        { seat: 0, role: "RAIDER", at: at(4, 7) },
        { seat: 1, role: "GUARD", at: at(3, 7) },
      ]),
      at(3, 7),
    );
    const demolished = attackV7(base, at(4, 7), at(3, 7));
    expect(demolished.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(3, 7),
      reason: "EXPLOSIVES",
    });
    expect(tileV7(demolished.state, at(3, 7)).fieldDefense).toBe(false);
    const without = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.seat === 0
          ? { ...player, researchedTechs: WITHOUT_WALLBREAKER }
          : player,
      ),
    });
    const kept = attackV7(without, at(4, 7), at(3, 7));
    expect(kindsV7(kept.events)).not.toContain("FIELD_DEFENSE_DESTROYED");
    expect(
      technologyCapabilitiesV7([...TECHNOLOGY_IDS_V7], "DINOSAUR").commands,
    ).toContain("BLAST_MOUNTAIN");
  });

  it("is public: the Dinosaur owner's preview equals the resolution", () => {
    // `attackV7` compares the owner's public preview with the resolution;
    // this pins the numbers of one such preview for a wounded attacker.
    const state = patchUnitV7(
      walledV7({ attackers: [{ role: "KNIGHT", at: at(7, 8) }] }),
      at(7, 8),
      { hp: 14 },
    );
    const run = attackV7(state, at(7, 8), at(8, 8));
    expect(run.preview).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 2,
      defense2: 6,
    });
    expect(activeIdV7(state)).toBe(seatIdV7(state, 1));
  });
});
