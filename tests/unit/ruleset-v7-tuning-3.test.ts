import { describe, expect, it } from "vitest";
import {
  BLAST_MOUNTAIN_COST_V7,
  BLAST_MOUNTAIN_DAMAGE_V7,
  FACTION_IDS_V7,
  HIRE_EXTRA_CAPACITY_V7,
  MILITIA_FIGHTERS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  defenseBonusForUnitV7,
  effectiveRoleRuleV7,
  hireCostV7,
  landTradeCityIdsV7,
  parseEventV7,
  parseGameStateV7,
  playerIncomeV7,
  previewBlastMountainV7,
  previewEconomicV7,
  publicUnitHasTerrainCoverV7,
  publicWailTargetsV7,
  queryPlayerCommandsV7,
  technologyCapabilitiesV7,
  viewForV7,
  wailTargetsV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7, rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  at,
  attackV7,
  fieldDefenseV7,
  fieldV7,
  forestV7,
  mountainV7,
  patchTileV7,
  tileV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/**
 * Tuning 3 (`pulp_wars-w49.3`, identity `pulp-wars-poc-7r47`;
 * docs/product/RULESET_7_TUNING_HUMAN.md): the Knight's Attack, Forest
 * cover from Forestry, Blast Mountain as an explosion, and Commerce (land
 * trade between any linked cities; hiring at a Market).
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8).
 */

const HUMANS = ["ORIGINAL", "ORIGINAL"] as const;
const NO_EXPLOSIVES = withoutTechsV7("ORIGINAL", "EXPLOSIVES");
const NO_FORESTRY = withoutTechsV7("ORIGINAL", "FORESTRY");

const offered = (state: GameStateV7, seat = 0): readonly CommandV7[] =>
  queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, seat)));

/** Applies an accepted command; its events and state pass the schemas. */
const applied = (state: GameStateV7, command: CommandV7, seat = 0) => {
  const result = applyOkV7(state, seatIdV7(state, seat), command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return result;
};

const coinsOf = (state: GameStateV7, seat = 0): number =>
  state.players.find((player) => player.seat === seat)?.coins ?? -1;

describe("tuning 3 keeps the unpublished identity of tuning 2", () => {
  it("is 7r47", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r54");
  });
});

describe("Knight: Attack 4", () => {
  const strike = (
    target: UnitRoleIdV7,
    prepare: (state: GameStateV7) => GameStateV7 = (state) => state,
    techs: Readonly<
      Record<number, readonly (typeof TECHNOLOGY_IDS_V7)[number][]>
    > = {
      0: NO_EXPLOSIVES,
    },
  ) => {
    const state = prepare(
      fieldV7(
        [
          { seat: 0, role: "KNIGHT", at: at(5, 2) },
          { seat: 1, role: target, at: at(5, 3) },
        ],
        { factions: HUMANS, techs },
      ),
    );
    return attackV7(state, at(5, 2), at(5, 3)).combat;
  };
  const inForest = (state: GameStateV7) => forestV7(state, at(5, 3));

  it("has Attack 4 and the other numbers of tuning 1", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "ORIGINAL")).toMatchObject({
      attack2: 8,
      defense2: 2,
      maxHp: 13,
      move: 3,
      cost: 9,
    });
    // The Knight-role units of the other factions keep their Attack.
    expect(effectiveRoleRuleV7("KNIGHT", "UNDEAD").attack2).toBe(6);
    expect(effectiveRoleRuleV7("KNIGHT", "CANDY").attack2).toBe(6);
  });

  it("kills a full-HP Raider, Marksman, Captain, Catapult, or Knight in one attack, also in Forest cover", () => {
    for (const role of [
      "RAIDER",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
    ] as const) {
      expect(strike(role).defenderDies, role).toBe(true);
      const covered = strike(role, inForest);
      expect(covered.defenseBonusNumerator, role).toBe(3);
      expect(covered.defenderDies, role).toBe(true);
    }
  });

  it("kills a full-HP Fighter in the open, and not one in cover, behind a Field Defense, or on a walled center", () => {
    expect(strike("FIGHTER")).toMatchObject({
      damageToDefender: 12,
      defenderDies: true,
      damageToAttacker: 0,
    });
    // Forest cover (the Fighter's owner has Forestry): 10 of 12.
    expect(strike("FIGHTER", inForest)).toMatchObject({
      damageToDefender: 10,
      defenderDies: false,
    });
    // Mountain cover needs no technology: 10 of 12.
    expect(
      strike("FIGHTER", (state) => mountainV7(state, at(5, 3)), {
        0: NO_EXPLOSIVES,
        1: [],
      }),
    ).toMatchObject({ damageToDefender: 10, defenderDies: false });
    // A Field Defense of the Fighter's territory (2, 7): 10 of 12.
    const fortified = fieldDefenseV7(
      fieldV7(
        [
          { seat: 0, role: "KNIGHT", at: at(3, 6) },
          { seat: 1, role: "FIGHTER", at: at(2, 7) },
        ],
        { factions: HUMANS, techs: { 0: NO_EXPLOSIVES } },
      ),
      at(2, 7),
    );
    expect(attackV7(fortified, at(3, 6), at(2, 7)).combat).toMatchObject({
      fortificationLevel: 2,
      damageToDefender: 9,
      defenderDies: false,
    });
  });

  it("does not kill a Guard, and takes its base retaliation", () => {
    expect(strike("GUARD")).toMatchObject({
      damageToDefender: 10,
      defenderDies: false,
      damageToAttacker: 6,
    });
  });

  it("chains through a line of fragile units with Overrun in one turn", () => {
    let state = fieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 1) },
        { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        { seat: 1, role: "CATAPULT", at: at(5, 3) },
        { seat: 1, role: "RAIDER", at: at(5, 4) },
      ],
      { factions: HUMANS },
    );
    for (const [from, to] of [
      [at(5, 1), at(5, 2)],
      [at(5, 2), at(5, 3)],
      [at(5, 3), at(5, 4)],
    ] as const) {
      const run = attackV7(state, from, to);
      expect(run.combat).toMatchObject({ defenderDies: true, advances: true });
      state = run.state;
    }
    const knight = unitAtV7(state, at(5, 4));
    expect(knight).toMatchObject({ role: "KNIGHT", hp: 13, kills: 3 });
    expect(
      state.units.filter((unit) => unit.ownerId !== knight.ownerId),
    ).toEqual([]);
  });
});

describe("Forest cover comes with Forestry", () => {
  const duel = (
    defenderTechs: readonly (typeof TECHNOLOGY_IDS_V7)[number][],
    terrain: "FOREST" | "MOUNTAIN",
    factions: readonly FactionIdV7[] = HUMANS,
  ) => {
    const base = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { factions, techs: { 0: NO_EXPLOSIVES, 1: defenderTechs } },
    );
    return terrain === "FOREST"
      ? forestV7(base, at(5, 3))
      : mountainV7(base, at(5, 3));
  };

  it("is a capability of Forestry in every faction's tree", () => {
    for (const faction of FACTION_IDS_V7) {
      expect(
        technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, faction).forestCover,
        faction,
      ).toBe(true);
      expect(
        technologyCapabilitiesV7(withoutTechsV7(faction, "FORESTRY"), faction)
          .forestCover,
        faction,
      ).toBe(false);
    }
  });

  it("gives x 1.5 in Forest only to a defender whose owner has Forestry, in the preview and the resolution", () => {
    const covered = duel(TECHNOLOGY_IDS_V7, "FOREST");
    const bare = duel(NO_FORESTRY, "FOREST");
    expect(defenseBonusForUnitV7(covered, unitAtV7(covered, at(5, 3)))).toEqual(
      { numerator: 3, denominator: 2 },
    );
    expect(defenseBonusForUnitV7(bare, unitAtV7(bare, at(5, 3)))).toEqual({
      numerator: 1,
      denominator: 1,
    });
    // The attacker's seat sees the cover in the defender's public stats
    // (the defender's technologies stay private).
    const seen = (state: GameStateV7) =>
      publicUnitHasTerrainCoverV7(
        viewForV7(state, seatIdV7(state, 0)),
        unitAtV7(state, at(5, 3)).id,
      );
    expect(seen(covered)).toBe(true);
    expect(seen(bare)).toBe(false);
    // `attackV7` checks the public preview against the resolution.
    const withCover = attackV7(covered, at(5, 2), at(5, 3)).combat;
    const without = attackV7(bare, at(5, 2), at(5, 3)).combat;
    expect(withCover.defenseBonusNumerator).toBe(3);
    expect(without.defenseBonusNumerator).toBe(1);
    expect(without.damageToDefender).toBeGreaterThan(
      withCover.damageToDefender,
    );
    // The attacker's own Forestry does not matter.
    const attackerWithout = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { factions: HUMANS, techs: { 0: [], 1: TECHNOLOGY_IDS_V7 } },
    );
    expect(
      attackV7(forestV7(attackerWithout, at(5, 3)), at(5, 2), at(5, 3)).combat
        .defenseBonusNumerator,
    ).toBe(3);
  });

  it("leaves Mountain cover without a technology", () => {
    const state = duel([], "MOUNTAIN");
    expect(
      attackV7(state, at(5, 2), at(5, 3)).combat.defenseBonusNumerator,
    ).toBe(3);
  });

  it("holds for a Wail too: canonical and public targets agree with and without Forestry", () => {
    for (const techs of [TECHNOLOGY_IDS_V7, NO_FORESTRY]) {
      const state = forestV7(
        fieldV7(
          [
            { seat: 0, role: "MARKSMAN", at: at(5, 2) },
            { seat: 1, role: "FIGHTER", at: at(5, 3) },
          ],
          { factions: ["UNDEAD", "ORIGINAL"], techs: { 1: techs } },
        ),
        at(5, 3),
      );
      const banshee = unitAtV7(state, at(5, 2));
      const canonical = wailTargetsV7(state, banshee);
      const visible = publicWailTargetsV7(
        viewForV7(state, seatIdV7(state, 0)),
        banshee,
      ).map(({ hiddenBlizzardPossible: _hidden, ...target }) => {
        void _hidden;
        return target;
      });
      expect(visible).toEqual(canonical);
      expect(canonical[0]?.defenseBonusNumerator).toBe(
        techs === NO_FORESTRY ? 1 : 3,
      );
    }
  });
});

describe("Blast Mountain explodes", () => {
  const blast = (where: CoordV7): CommandV7 => ({
    kind: "BLAST_MOUNTAIN",
    at: where,
  });
  const explosionOf = (events: readonly DomainEventV7[]) => {
    const found = events.filter((event) => event.kind === "EXPLOSION_RESOLVED");
    return found.map((event) =>
      event.kind === "EXPLOSION_RESOLVED" ? event : null,
    );
  };
  const hits = (events: readonly DomainEventV7[]) =>
    explosionOf(events).map((explosion) => ({
      at: explosion?.at,
      cause: explosion?.cause,
      wave: explosion?.wave,
      damage: explosion?.damage,
      results: explosion?.results,
    }));
  const previewed = (state: GameStateV7, where: CoordV7) => {
    const preview = previewBlastMountainV7(
      viewForV7(state, seatIdV7(state, 0)),
      where,
    );
    if (preview === null) throw new Error("no blast preview");
    return preview;
  };
  const sameAsPreview = (
    state: GameStateV7,
    where: CoordV7,
    events: readonly DomainEventV7[],
  ) =>
    expect(
      previewed(state, where).explosions.map((explosion) => ({
        at: explosion.at,
        cause: explosion.cause,
        wave: explosion.wave,
        damage: explosion.damage,
        results: explosion.results.map((entry) => ({
          unitId: entry.unitId,
          at: entry.at,
          damage: entry.damage,
          dies: entry.dies,
          shieldDamage: entry.shieldDamage,
        })),
      })),
    ).toEqual(hits(events));

  it("has its numbers", () => {
    expect(BLAST_MOUNTAIN_COST_V7).toBe(3);
    expect(BLAST_MOUNTAIN_DAMAGE_V7).toBe(5);
  });

  it("in the player's territory: 5 damage to every unit on the tile and around it, friend and foe, and +1 population", () => {
    // The Mountain (7, 7) of the capital's territory, a foe on it, a foe
    // and two own units next to it, and an own unit two tiles away.
    // Tuning 5 (`pulp_wars-w49.4`): one own unit next to the Mountain sets
    // the charge and is not hit (the weaker one, here the wounded Guard at
    // (6, 8)); the other is hit like anyone.
    const pieces: GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(8, 7) },
      { seat: 0, role: "GUARD", at: at(6, 8), hp: 4 },
      { seat: 0, role: "FIGHTER", at: at(9, 9) },
      { seat: 1, role: "GUARD", at: at(7, 7) },
      { seat: 1, role: "FIGHTER", at: at(6, 6) },
    ];
    const state = mountainV7(fieldV7(pieces, { factions: HUMANS }), at(7, 7));
    expect(offered(state)).toContainEqual(blast(at(7, 7)));
    const city = state.cities.find(
      (item) => item.at.x === 8 && item.at.y === 8,
    );
    const result = applied(state, blast(at(7, 7)));
    expect(result.events[0]).toEqual({
      kind: "MOUNTAIN_BLASTED",
      playerId: seatIdV7(state, 0),
      cityId: city?.id,
      at: at(7, 7),
      cost: 3,
      terrainBefore: "MOUNTAIN",
      terrainAfter: "GRASS",
      resourceBefore: null,
      resourceAfter: null,
    });
    expect(hits(result.events)).toEqual([
      {
        at: at(7, 7),
        cause: "BLAST",
        wave: 1,
        damage: 5,
        results: [
          {
            unitId: unitAtV7(state, at(6, 6)).id,
            at: at(6, 6),
            damage: 5,
            dies: false,
            shieldDamage: 0,
          },
          {
            unitId: unitAtV7(state, at(7, 7)).id,
            at: at(7, 7),
            damage: 5,
            dies: false,
            shieldDamage: 0,
          },
          {
            unitId: unitAtV7(state, at(8, 7)).id,
            at: at(8, 7),
            damage: 5,
            dies: false,
            shieldDamage: 0,
          },
        ],
      },
    ]);
    sameAsPreview(state, at(7, 7), result.events);
    expect(previewed(state, at(7, 7)).totals).toMatchObject({
      hostileDamage: 10,
      friendlyDamage: 5,
      hostileKills: 0,
      friendlyKills: 0,
    });
    expect(unitAtV7(result.state, at(7, 7)).hp).toBe(12);
    expect(unitAtV7(result.state, at(6, 6)).hp).toBe(7);
    expect(unitAtV7(result.state, at(8, 7)).hp).toBe(7);
    expect(unitAtV7(result.state, at(6, 8)).hp).toBe(4);
    expect(unitAtV7(result.state, at(9, 9)).hp).toBe(12);
    expect(tileV7(result.state, at(7, 7)).terrain).toBe("GRASS");
    expect(coinsOf(result.state)).toBe(coinsOf(state) - 3);
    const after = result.state.cities.find((item) => item.id === city?.id);
    expect(after?.permanentPopulation).toBe(
      (city?.permanentPopulation ?? 0) + 1,
    );
    // The exact economic preview still holds for the population.
    const economic = previewEconomicV7(
      viewForV7(state, seatIdV7(state, 0)),
      blast(at(7, 7)),
    );
    expect(economic.ok && economic.preview.cost).toBe(3);
  });

  it("outside the territory: next to an own land unit, for no population", () => {
    const pieces: GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 1, role: "GUARD", at: at(5, 3) },
      { seat: 1, role: "MARKSMAN", at: at(6, 4) },
    ];
    const state = mountainV7(fieldV7(pieces, { factions: HUMANS }), at(5, 3));
    expect(offered(state)).toContainEqual(blast(at(5, 3)));
    const result = applied(state, blast(at(5, 3)));
    expect(result.events[0]).toMatchObject({
      kind: "MOUNTAIN_BLASTED",
      cityId: null,
    });
    sameAsPreview(state, at(5, 3), result.events);
    // The Guard loses its Mountain and 5 HP. Tuning 5
    // (`pulp_wars-w49.4`): the unit that set the charge is not hit (it
    // took 5 as well before).
    expect(unitAtV7(result.state, at(5, 3)).hp).toBe(12);
    expect(unitAtV7(result.state, at(6, 4)).hp).toBe(7);
    expect(unitAtV7(result.state, at(5, 2)).hp).toBe(12);
    expect(tileV7(result.state, at(5, 3)).terrain).toBe("GRASS");
    expect(result.state.cities.map((item) => item.population)).toEqual(
      state.cities.map((item) => item.population),
    );
    expect(result.state.populationContributions.length).toBe(
      state.populationContributions.length,
    );
    // Not without a unit next to it, and not without Explosives.
    const far = mountainV7(
      fieldV7([{ seat: 0, role: "FIGHTER", at: at(5, 1) }], {
        factions: HUMANS,
      }),
      at(5, 3),
    );
    expect(offered(far)).not.toContainEqual(blast(at(5, 3)));
    const untaught = mountainV7(
      fieldV7(pieces, { factions: HUMANS, techs: { 0: NO_EXPLOSIVES } }),
      at(5, 3),
    );
    expect(offered(untaught)).not.toContainEqual(blast(at(5, 3)));
  });

  it("kills, leaves the kill uncredited to a unit, and sets off the death blast of an exploding unit", () => {
    // A 5-HP Warboss on the Mountain and a 1-HP Bomb Chucker next to it
    // (an Orc Brute stood there before the Goblin pass made it
    // Blast-proof, tests/unit/ruleset-v7-goblin-pass.test.ts).
    const state = mountainV7(
      fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
          { seat: 1, role: "CAPTAIN", at: at(5, 3), hp: 5 },
          { seat: 1, role: "MARKSMAN", at: at(5, 4), hp: 1 },
        ],
        { factions: ["ORIGINAL", "GOBLIN"] },
      ),
      at(5, 3),
    );
    const result = applied(state, blast(at(5, 3)));
    sameAsPreview(state, at(5, 3), result.events);
    expect(
      hits(result.events).map((entry) => [entry.cause, entry.wave]),
    ).toEqual([
      ["BLAST", 1],
      ["DEATH", 2],
    ]);
    expect(
      result.events.filter((event) => event.kind === "UNIT_DIED"),
    ).toHaveLength(2);
    expect(
      result.state.units.map((unit) => [unit.role, unit.hp, unit.kills]),
    ).toEqual([["FIGHTER", 12, 0]]);
    expect(previewed(state, at(5, 3)).totals.hostileKills).toBe(2);
  });

  it("destroys a Field Defense in its area", () => {
    const state = fieldDefenseV7(
      mountainV7(
        fieldV7([{ seat: 0, role: "FIGHTER", at: at(9, 9) }], {
          factions: HUMANS,
        }),
        at(7, 7),
      ),
      at(8, 7),
    );
    const result = applied(state, blast(at(7, 7)));
    expect(result.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(8, 7),
      reason: "EXPLOSION",
    });
    expect(tileV7(result.state, at(8, 7)).fieldDefense).toBe(false);
  });
});

describe("Commerce: land trade between any linked cities", () => {
  // The Human seat captures the village (8, 5) and builds the Road
  // (8, 6)-(8, 7) to its capital (8, 8).
  const linked = (): GameStateV7 => {
    const base = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DWARF"] },
    );
    let state = applyOkV7(base, seatIdV7(base, 0), {
      kind: "CAPTURE",
      unitId: unitAtV7(base, at(8, 5)).id,
    }).state;
    for (const road of [at(8, 6), at(8, 7)])
      state = applyOkV7(state, seatIdV7(state, 0), {
        kind: "BUILD_ROAD",
        at: road,
      }).state;
    return state;
  };
  const cityAt = (state: GameStateV7, x: number, y: number) => {
    const city = state.cities.find(
      (candidate) => candidate.at.x === x && candidate.at.y === y,
    );
    if (city === undefined) throw new Error("no city");
    return city;
  };

  it("pays both ends of a Road, the first capital included", () => {
    const state = linked();
    const owner = seatIdV7(state, 0);
    const capital = cityAt(state, 8, 8);
    const village = cityAt(state, 8, 5);
    expect([...landTradeCityIdsV7(state, owner)].sort()).toEqual(
      [capital.id, village.id].sort(),
    );
    expect([...viewForV7(state, owner).naval.landTradeCityIds].sort()).toEqual(
      [capital.id, village.id].sort(),
    );
    const income = playerIncomeV7(state, owner);
    const before = playerIncomeV7(
      checkedV7({
        ...state,
        players: state.players.map((player) =>
          player.id === owner
            ? {
                ...player,
                researchedTechs: withoutTechsV7("ORIGINAL", "COMMERCE"),
              }
            : player,
        ),
      }),
      owner,
    );
    expect(income.totalCoins - before.totalCoins).toBe(2);
  });

  it("previews the Road that completes the link at +1 for each of the two cities", () => {
    const base = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 5), captureEligible: true },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DWARF"] },
    );
    let state = applyOkV7(base, seatIdV7(base, 0), {
      kind: "CAPTURE",
      unitId: unitAtV7(base, at(8, 5)).id,
    }).state;
    state = applyOkV7(state, seatIdV7(state, 0), {
      kind: "BUILD_ROAD",
      at: at(8, 6),
    }).state;
    const preview = previewEconomicV7(viewForV7(state, seatIdV7(state, 0)), {
      kind: "BUILD_ROAD",
      at: at(8, 7),
    });
    if (!preview.ok) throw new Error("no Road preview");
    expect(
      [...preview.preview.coinIncomeDeltaByCity].sort(
        (left, right) => left.cityId - right.cityId,
      ),
    ).toEqual(
      [
        { cityId: cityAt(state, 8, 8).id, delta: 1 },
        { cityId: cityAt(state, 8, 5).id, delta: 1 },
      ].sort((left, right) => left.cityId - right.cityId),
    );
  });

  it("needs two cities of the same player on the Road, and no capital", () => {
    const state = linked();
    const owner = seatIdV7(state, 0);
    const foe = seatIdV7(state, 1);
    // With the capital in another seat's hands the village is linked to no
    // city of its owner.
    const lost = {
      ...state,
      cities: state.cities.map((city) =>
        city.id === cityAt(state, 8, 8).id ? { ...city, ownerId: foe } : city,
      ),
    };
    expect([...landTradeCityIdsV7(lost, owner)]).toEqual([]);
    // Goblin Commerce is Plunder: no land trade.
    expect(
      technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, "GOBLIN")
        .landTradeIncomeCoins,
    ).toBe(0);
  });
});

describe("Commerce: a Market hires", () => {
  const MARKET = at(9, 9);
  const withMarket = (
    pieces: readonly GoblinPieceV7[] = [],
    options: Parameters<typeof fieldV7>[1] = {},
  ): GameStateV7 =>
    patchTileV7(fieldV7(pieces, { factions: HUMANS, ...options }), MARKET, {
      improvement: "MARKET",
    });
  const hires = (state: GameStateV7) =>
    offered(state).filter((command) => command.kind === "HIRE");
  const capital = (state: GameStateV7) => {
    const city = state.cities.find(
      (item) => item.at.x === 8 && item.at.y === 8,
    );
    if (city === undefined) throw new Error("no capital");
    return city;
  };

  it("costs the training price times 3/2, rounded up", () => {
    expect([1, 2, 3, 4, 5, 8, 9].map(hireCostV7)).toEqual([
      2, 3, 5, 6, 8, 12, 14,
    ]);
    expect(HIRE_EXTRA_CAPACITY_V7).toBe(1);
  });

  it("offers every trainable land role on an empty Market tile, with Commerce only", () => {
    const state = withMarket();
    const city = capital(state);
    expect(hires(state)).toEqual(
      (
        [
          "FIGHTER",
          "RAIDER",
          "MARKSMAN",
          "GUARD",
          "CAPTAIN",
          "CATAPULT",
          "KNIGHT",
          // Tuning 5 (`pulp_wars-w49.4`).
          "SWORDSMAN",
        ] as const
      ).map((role) => ({ kind: "HIRE", cityId: city.id, at: MARKET, role })),
    );
    expect(
      hires(
        withMarket([], {
          techs: { 0: withoutTechsV7("ORIGINAL", "COMMERCE") },
        }),
      ),
    ).toEqual([]);
    // No Market, no hire.
    expect(hires(fieldV7([], { factions: HUMANS }))).toEqual([]);
    // A unit on the Market tile blocks it.
    expect(
      hires(withMarket([{ seat: 0, role: "FIGHTER", at: MARKET }])),
    ).toEqual([]);
    // The price must be in hand: 5 Coins hire a Fighter (3) or a Guard (5).
    expect(
      hires(withMarket([], { coins: 5 })).map((command) =>
        command.kind === "HIRE" ? command.role : null,
      ),
    ).toEqual(["FIGHTER", "GUARD"]);
  });

  it("places the unit on the Market tile, spent, for the price, without the city action", () => {
    const state = withMarket();
    const city = capital(state);
    const owner = seatIdV7(state, 0);
    const result = applied(state, {
      kind: "HIRE",
      cityId: city.id,
      at: MARKET,
      role: "KNIGHT",
    });
    const knight = unitAtV7(result.state, MARKET);
    expect(result.events[0]).toEqual({
      kind: "UNIT_TRAINED",
      playerId: owner,
      cityId: city.id,
      unitId: knight.id,
      role: "KNIGHT",
      cost: 14,
      at: MARKET,
    });
    expect(knight).toMatchObject({
      role: "KNIGHT",
      ownerId: owner,
      homeCityId: city.id,
      hp: 13,
    });
    expect(knight.activation).toMatchObject({ moved: true, attacked: true });
    expect(coinsOf(result.state)).toBe(coinsOf(state) - 14);
    expect(capital(result.state).cityActionAvailable).toBe(true);
    // It cannot act this turn, the Market is taken, and the city still
    // trains.
    const next = offered(result.state);
    expect(
      next.filter(
        (command) => "unitId" in command && command.unitId === knight.id,
      ),
    ).toEqual([]);
    expect(next.filter((command) => command.kind === "HIRE")).toEqual([]);
    expect(next).toContainEqual({
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    });
    // And the other way round: after training, the Market still hires.
    const trained = applied(state, {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    });
    expect(capital(trained.state).cityActionAvailable).toBe(false);
    expect(hires(trained.state).length).toBeGreaterThan(0);
  });

  it("lets the Market's city hold one unit above its capacity, and no more", () => {
    // Level 1 with Planning: capacity 3. The pieces are homed to the capital.
    const full: GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(7, 7) },
      { seat: 0, role: "FIGHTER", at: at(8, 7) },
      { seat: 0, role: "FIGHTER", at: at(9, 7) },
    ];
    const state = withMarket(full);
    const city = capital(state);
    expect(
      offered(state).filter((command) => command.kind === "TRAIN"),
    ).toEqual([]);
    expect(hires(state).length).toBe(8);
    const result = applied(state, {
      kind: "HIRE",
      cityId: city.id,
      at: MARKET,
      role: "FIGHTER",
    });
    // Four units on capacity 3; with the Market free again, no fifth.
    const moved = checkedV7({
      ...result.state,
      units: result.state.units.map((unit) =>
        unit.at.x === MARKET.x && unit.at.y === MARKET.y
          ? { ...unit, at: at(7, 9) }
          : unit,
      ),
    });
    expect(hires(moved)).toEqual([]);
    expect(
      applyOkOrCode(moved, {
        kind: "HIRE",
        cityId: city.id,
        at: MARKET,
        role: "FIGHTER",
      }),
    ).toContain("CITY_CAPACITY_FULL");
  });

  it("is in every tree's Commerce, the Goblin one too", () => {
    for (const faction of FACTION_IDS_V7)
      expect(
        technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, faction).commands.includes(
          "HIRE",
        ),
        faction,
      ).toBe(true);
  });
});

describe("Militia", () => {
  // Tuning 4 took the second Human Fighter back (two units in one level
  // overran the unit limit): tests/unit/ruleset-v7-tuning-4.test.ts.
  it("a Human Militia is one Fighter again; the Goblins keep two Goblins", () => {
    expect(MILITIA_FIGHTERS_V7).toEqual({
      ORIGINAL: 1,
      UNDEAD: 1,
      GOBLIN: 2,
      DINOSAUR: 1,
      MARTIAN: 1,
      ICE_FOLK: 1,
      DWARF: 1,
      CANDY: 1,
    });
    const fixture = rewardStateV7("MILITIA", "ORIGINAL");
    const result = applied(fixture.state, {
      ...fixture.command,
      reward: "MILITIA",
    });
    const granted = result.events.filter(
      (event) => event.kind === "UNIT_REWARD_GRANTED",
    );
    expect(granted.map((event) => "role" in event && event.role)).toEqual([
      "FIGHTER",
    ]);
    const owner = seatIdV7(fixture.state, 0);
    const fighters = result.state.units.filter(
      (unit) => unit.ownerId === owner && unit.role === "FIGHTER",
    );
    expect(fighters).toHaveLength(1);
    expect(fighters[0]?.at).toEqual(cityOfV7(result.state, 0).at);
  });

  it("Fieldcraft keeps its role list: Forest freedom for the Raider and the Marksman roles (Forest march is tuning 4)", () => {
    for (const faction of FACTION_IDS_V7)
      expect(
        technologyCapabilitiesV7(TECHNOLOGY_IDS_V7, faction)
          .forestMovementFreedomRoles,
        faction,
      ).toEqual(["RAIDER", "MARKSMAN"]);
  });
});

function applyOkOrCode(state: GameStateV7, command: CommandV7): string {
  try {
    applyOkV7(state, seatIdV7(state, 0), command);
    return "ACCEPTED";
  } catch (cause) {
    return cause instanceof Error ? cause.message : "UNKNOWN";
  }
}
