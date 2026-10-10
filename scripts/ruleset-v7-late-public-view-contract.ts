export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH =
  "tests/fixtures/ruleset-v7-late-public-view.json";

export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_URL = `/${RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH}`;

export const RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX = 150;

/**
 * The Normal policy's decision for the upgraded retained view: the single
 * pin shared by `tests/unit/ruleset-v7-normal-policy.test.ts` (which keeps it
 * current under `npm run check`) and
 * `scripts/benchmark-ruleset-v7-normal-policy.ts`. The benchmark used to
 * carry its own copy, which no gate ran: it went stale at 521c3da (revision
 * 4, 2026-09-12), when the decision changed from a Forge to this Attack, and
 * the decision hash then changed twelve more times unnoticed
 * (`pulp_wars-c87.8`). Refresh it here, with the cause, whenever a change is
 * meant to alter this decision or its candidate list.
 *
 * Revision 20 (`pulp_wars-0hi.2`): `policyDecisionHash` was 27ee3b…bfeb. The
 * `STAMPEDE` command kind is removed, so the `-ordinal` tie-break of every
 * candidate whose kind follows `KABOOM` moves by one. The command, the
 * candidate count, and the hash with revision-12 ordinals are unchanged.
 *
 * `pulp_wars-9s0.1` (campaign plan): `policyDecisionHash` was 74d605…ed4b
 * and the command the Attack of unit 19 on unit 34. An enemy city is known
 * and fewer than two thirds of the seat's unit slots are filled, so land
 * production takes priority 1205 and the Guard is trained in city 16
 * before that Attack (which is still a candidate). The candidate count is
 * unchanged; Move candidates follow the units' campaign jobs.
 *
 * The Martian revision (`pulp_wars-t6s.2`): `policyDecisionHash` was
 * 455981…4e25. `BEAM_DOWN`, `MIND_CONTROL`, and `TRACTOR_BEAM` are inserted
 * after `HATCH`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `HATCH` moves by three. The command, the candidate count, and the
 * hash with revision-12 ordinals are unchanged.
 *
 * `pulp_wars-0hi.3` (revision 20 section 6.3, Human HP): `policyDecisionHash`
 * was 312823…8c44. The command and the candidate count are unchanged; three
 * of the 28 candidates score differently, all because a role's maximum HP is
 * part of its value: the two Train Guard candidates have strategic value 17
 * (was 15), and Research Scouting is now the missing-role plan (priority
 * 1060 and value 6, was 1040 and 0), because the Raider's value rose from
 * 16 to 18.
 *
 * The Ice Folk revision (`pulp_wars-7g3.3`): `policyDecisionHash` was
 * 5f5406…2618. `THROW_BOLAS` and `COLD_SNAP` are inserted after
 * `TRACTOR_BEAM`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `TRACTOR_BEAM` moves by two. The command, the candidate count,
 * and the hash with revision-12 ordinals are unchanged.
 *
 * The Dwarf revision (`pulp_wars-78i.3`): `policyDecisionHash` was
 * 9aa14a…171f. `TUNNEL`, `BOMB_RUN`, and `ASSEMBLE` are inserted after
 * `COLD_SNAP`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `COLD_SNAP` moves by three. The command, the candidate count,
 * and the hash with revision-12 ordinals are unchanged.
 *
 * The Candy revision (`pulp_wars-jdb.3`): `policyDecisionHash` was
 * 634f04…55da. `SUGAR_RUSH`, `REBAKE`, and `SUGAR_TOSS` are inserted after
 * `ASSEMBLE`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `ASSEMBLE` moves by three. The command, the candidate count, and
 * the hash with revision-12 ordinals are unchanged.
 *
 * Tuning 5 (`pulp_wars-w49.4`): the command was the training of a Guard in
 * city 16. The view owns Engineering, so the city now offers the Swordsman,
 * and the Normal AI's army play (a match of Human seats with an enemy in
 * sight) trains the best line unit it can pay for instead of a Guard.
 * `DRILL_UNIT` is removed, so every kind after `PROMOTE` moves back by one.
 *
 * Tuning 6 (`pulp_wars-w49.6`): `policyDecisionHash` was d083c1…4725. The
 * command is unchanged. A hostile unit stands within three tiles of an own
 * center and two cities can still train, so no construction that costs
 * Coins is a candidate; the five own units outweigh the hostile position
 * and are committed, so their Moves are those that close in on it.
 *
 * Tuning 7 (`pulp_wars-w49.10`): `policyDecisionHash` was 5c5ef6…500c. The
 * command and the candidate count are unchanged. Research Marksmanship is a
 * candidate again (1165): it is the due technology and unlocks a unit, and
 * the wartime rule holds back only research that does neither. Of the
 * committed units' Moves, unit 19 may step to (3, 3), into the reach of the
 * position it attacks, and two Moves that close no distance to it are no
 * candidates (unit 20 to (5, 1), unit 33 to (8, 6)); three more score
 * differently (the march on the hostile center and the chain spacing).
 *
 * Tuning 8 (`pulp_wars-w49.11`): the command was the training of a
 * Swordsman in city 16 and `policyDecisionHash` 6d1529…f3da. The view is
 * round 16 with five technologies and an enemy army in the field: on the
 * research clock (three rounds a technology) Marksmanship is due, and a due
 * technology is bought before the units (1219; it was 1165, after them).
 * The candidate count is unchanged. Unit 19's step to (3, 3) is a stormer's
 * (762; the hostile center beside it is empty), and unit 20's two Moves
 * score lower.
 *
 * The economy rejig (`pulp_wars-w49.16`, 7r54): the command is the training
 * of a Swordsman in city 16 again. Research is priced by the cities owned
 * (tier 2: 7 Coins and 2 for each city beyond the first), so with the
 * view's four cities Marksmanship costs 13 and its 12 Coins do not buy it.
 * (Scouting, at 8, is offered and is not the army's technology.)
 *
 * The ninth unit (`pulp_wars-w49.17`, 7r55): `policyDecisionHash` was
 * d572ee…1c7e. The command (the training of the heavy line unit, the
 * Champion, in city 16) and the candidate count are unchanged; the Champion
 * costs 6 Coins (5) and is unlocked by Metallurgy, so the candidates that
 * weigh its price or its chain score differently.
 *
 * The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the command, the
 * candidate count, and `policyDecisionHash` are unchanged. The view owns
 * the root of Industry and not Fortification, where the Guard is now, so
 * its command surface has 64 commands (66: cities 3 and 16 no longer offer
 * the Guard); neither offer was a candidate. The digests of that surface
 * are pinned in `tests/unit/ruleset-v7-public-query-performance.test.ts`
 * and the three tests beside it.
 *
 * The exploration plan (`pulp_wars-nc6`): `policyDecisionHash` was
 * 425276…bae5. The command and the candidate count are unchanged. The
 * seat's one scout was unit 20, which stands inside the reach of a visible
 * enemy; a unit in a fight scouts last now, so unit 31 scouts (a frontier
 * tile at (9, 3), by a route outside every enemy's reach) and unit 20
 * marches on city 1. Unit 31's three Moves keep their endgame priority and
 * make no progress toward its new job (objective value 0, was 1).
 */
export const RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION = Object.freeze({
  /** `canonicalHash` of the retained fixture as read from disk. */
  fixtureViewHash:
    "d095b657a12242e56e4bf3ada5e3a0a8d1982da358a906c9bd477e0eabe6c75b",
  /** `canonicalHash` of the whole decision (command and candidates). */
  policyDecisionHash:
    // The naval branch (`pulp_wars-5ti.2`) inserts BOARD after ATTACK, moving
    // every later command kind forward by one (was 7622b4…e548).
    // The frozen sea (`pulp_wars-5ti.3`) inserts FREEZE after COLD_SNAP,
    // moving every later command kind forward by one (was a30271…8cc3).
    // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL, moving every later command kind forward by one
    // (was 0618e5…b49c).
    // Tuning 4 (`pulp_wars-w49.3`) inserts DRILL_UNIT after PROMOTE and
    // prices research by the technologies owned, so the view's one RESEARCH
    // candidate is gone (was 28c2e6…c05b).
    // Tuning 5 (`pulp_wars-w49.4`): army play and the Swordsman, as in the
    // comment above (was 0cd4ad…5ea7).
    // Tuning 6 (`pulp_wars-w49.6`): the assault and the pressed seat, as
    // in the comment above (was d083c1…4725). Tuning 7
    // (`pulp_wars-w49.10`): see the comment above (was 5c5ef6…500c).
    // Tuning 8 (`pulp_wars-w49.11`): see the comment above (was
    // 6d1529…f3da).
    // The Martian pass's correction (`pulp_wars-w49.14`): the growth a
    // Human seat at war still buys (was 2a38fd…aae3).
    // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
    // 3b4bad…d678).
    // The ninth unit (`pulp_wars-w49.17`, 7r55): see the comment above
    // (was d572ee…1c7e).
    // Dwarf crowd control (`pulp_wars-w49.33`) inserts WHIRL,
    // BUILD_BARRICADE, and ATTACK_BARRICADE after ASSEMBLE, moving every
    // later command kind forward by three (was 9c715b…2a52).
    // The giants' signatures (`pulp_wars-w49.30`) insert SWALLOW, TOSS,
    // STOMP, and BREAK_OFF after RECOVER, moving every later command kind
    // forward by four (was 054981…efe7).
    // Map curiosities round 2 (`pulp_wars-737.14`) insert TOSS_COIN before
    // RECOVER and Ice Folk Freeze (`pulp_wars-w49.37`) inserts FROST_BOLT
    // and STAMPEDE after BREAK_OFF, moving the later command kinds forward
    // (was 6bcb02…2921); the revision-12-ordinal value is unchanged.
    // The Candy redesign (`pulp_wars-jdb.12`) inserts TOP_UP after
    // TOSS_COIN, moving the later command kinds forward by one (was
    // ec779f…fb5d); the revision-12-ordinal value is unchanged.
    // The Cult's Favour (`pulp_wars-mch9.4`) inserts SACRIFICE and SEIZE
    // after STAMPEDE and OFFERING after LAY_EGG, moving the later command
    // kinds forward (was 9cad87…0bcc); the revision-12-ordinal value is
    // unchanged.
    // The exploration plan (`pulp_wars-nc6`): see the comment above (was
    // 425276…bae5).
    "2b64e38bdff8f52b96a59a03acdae0cb14fafb7bb84846f3ebdeafbef83c7b6e",
  command: Object.freeze({
    kind: "TRAIN",
    cityId: 16,
    role: "SWORDSMAN",
  }),
  // Tuning 4 (`pulp_wars-w49.3`): 27 (28 before): the view's 12 Coins no
  // longer buy a technology (a tier 1 as the sixth costs 13).
  // Tuning 5: 21. Two Train Swordsman candidates are new, and the army
  // play's garrison and formation rules leave fewer Moves as candidates.
  // Tuning 6: 20 (see the comment above). Tuning 7: 20 (one Move and
  // Research Marksmanship are new, two Moves are gone). Tuning 8: 20.
  // The Martian pass's correction (`pulp_wars-w49.14`): 27. The Human
  // seat at war still buys the growth that leaves the Coins for any unit
  // on offer, so seven construction candidates are back.
  // The economy rejig (`pulp_wars-w49.16`): 26, without Research
  // Marksmanship (13 Coins with the view's four cities; it has 12).
  candidateCount: 26,
});

/**
 * Upgrade the immutable retained benchmark fixture at its revision-9 read
 * boundary. This is a public-fixture adapter, never a runtime save migration.
 */
export function upgradeRetainedPublicViewV7(
  retained: PlayerViewV7,
): PlayerViewV7 {
  const upgradedTechs = (
    technologies: readonly TechnologyIdV7[],
  ): readonly TechnologyIdV7[] => {
    const upgradedIds = new Set<TechnologyIdV7>();
    const addWithPrerequisites = (technology: TechnologyIdV7): void => {
      if (upgradedIds.has(technology)) return;
      const node = ORIGINAL_BASELINE_V5_NODES.find(
        (candidate) => candidate.id === technology,
      );
      if (node === undefined) throw new RangeError("UNSUPPORTED_RETAINED_TECH");
      for (const prerequisite of node.prerequisites)
        addWithPrerequisites(prerequisite);
      upgradedIds.add(technology);
    };
    for (const retainedTechnology of technologies) {
      if (!TECHNOLOGY_IDS_V7.includes(retainedTechnology))
        throw new RangeError("UNSUPPORTED_RETAINED_TECH");
      addWithPrerequisites(retainedTechnology);
    }
    return TECHNOLOGY_IDS_V7.filter((technology) =>
      upgradedIds.has(technology),
    );
  };
  const viewer = {
    ...retained.viewer,
    factionTreeId: "ORIGINAL_BASELINE_V5" as const,
    originalCapitalCityId: cityId(retained.viewer.seat * 2 + 1),
    researchedTechs: upgradedTechs(retained.viewer.researchedTechs),
  };
  const units = retained.units.map((unit) => {
    if (!RETAINED_SUPPORTED_ROLES.has(unit.role))
      throw new RangeError("UNSUPPORTED_RETAINED_ROLE");
    return {
      id: unit.id,
      ownerId: unit.ownerId,
      homeCityId: unit.homeCityId,
      role: unit.role,
      form: "LAND" as const,
      at: unit.at,
      hp: unit.hp,
      maxHp: unit.maxHp,
      kills: unit.kills,
      veteran: unit.veteran,
      captureEligible: unit.captureEligible,
      activation: {
        moved: unit.activation.moved,
        movedPathLength: unit.activation.movedPathLength,
        attacked: unit.activation.attacked,
        attacksUsed: unit.activation.attacksUsed,
        tendedThisTurn: false,
        inspired: false,
        overrunActive: false,
        escapeAvailable: false,
        recovered: unit.activation.recovered,
        captured: unit.activation.captured,
        handled: unit.activation.handled,
        specialActed: unit.activation.specialActed,
      },
    };
  });
  return {
    ...retained,
    rulesetId: "pulp-wars-poc-7r73",
    setup: {
      ...retained.setup,
      rulesetId: "pulp-wars-poc-7r73",
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    },
    viewer,
    players: retained.players.map((player) => ({
      ...player,
      factionTreeId: "ORIGINAL_BASELINE_V5",
      originalCapitalCityId: cityId(player.seat * 2 + 1),
    })),
    cities: retained.cities.map((city) => ({
      id: city.id,
      ownerId: city.ownerId,
      at: city.at,
      level: city.level,
      permanentPopulation: city.permanentPopulation,
      economicPopulation: city.economicPopulation,
      population: city.population,
      isCapital: city.isCapital,
      expanded: false,
      landGrantUsed: city.expanded,
      ...(city.ownerId === retained.viewer.id
        ? { cityActionAvailable: true }
        : {}),
      rewards: city.rewards.map((reward) => ({
        ...reward,
        reward:
          String(reward.reward) === "EXPAND" ? "TREASURY_6" : reward.reward,
      })),
    })),
    units,
    unitStats: retained.unitStats.map((entry) => ({
      ...entry,
      stats: entry.stats.map((stat) => {
        const modifiers = stat.modifiers.filter(
          (modifier) => !LEGACY_DEFENSE_SOURCES.has(String(modifier.source)),
        );
        return {
          ...stat,
          modifiers,
          total: modifiers.reduce(
            (sum, modifier) => addValues(sum, modifier.value),
            stat.base.value,
          ),
        };
      }),
    })),
    board: {
      ...retained.board,
      tiles: retained.board.tiles.map((tile) => {
        if (!tile.explored) return tile;
        const city = retained.cities.find(
          (candidate) =>
            candidate.at.x === tile.at.x && candidate.at.y === tile.at.y,
        );
        const knownOwnedCity = city?.ownerId === viewer.id;
        const walls =
          knownOwnedCity &&
          city.rewards.some((reward) => reward.reward === "WALLS")
            ? 2
            : 0;
        return {
          ...tile,
          biome: "HIGHLANDS",
          fieldDefense: false,
          fortificationLevel:
            tile.territoryOwnerId === viewer.id
              ? knownOwnedCity
                ? walls
                : 0
              : null,
        };
      }),
    },
    naval: {
      ownedPorts: [],
      tradeCityIds: [],
      landTradeCityIds: [],
      seaTradeCityIds: [],
      networkCityIds: [],
      networkRoads: [],
      seaRoutes: [],
      recoverableNavalUnitIds: [],
    },
    // Map curiosities: the retained match was generated without any (and
    // without a Monster).
    curiosities: [],
    // The frozen sea: nor any ice.
    ice: [],
    monsters: [],
    // Revision 13: the retained all-Human match has no Graves.
    graves: [],
    // Revision 14: nor any Plague or Bitten status.
    plagued: [],
    bitten: [],
    // The Martian revision: nor any Shield, Cooling, control, or cooldown.
    shields: [],
    cooling: [],
    mindControlled: [],
    mindControlCooldowns: [],
    // The Ice Folk revision: nor any Frozen unit (Ice Folk Freeze).
    frozen: [],
    // The Dwarf revision: nor any mound, surfacing, or bomb.
    burrowed: [],
    surfacedThisTurn: [],
    bombedThisTurn: [],
    beamedThisTurn: [],
    tractorUsedThisTurn: [],
    // The Candy revision: nor any Rush, Crumbs, Splat, or Toss.
    sugarRush: [],
    crumbs: [],
    splattedThisTurn: [],
    tossedThisTurn: [],
    huntedThisTurn: [],
    // Goblin explosions and Berserk (`pulp_wars-w49.35`): nor any Berserk unit.
    berserkThisTurn: [],
    // The Vampire and Banshee rework (`pulp_wars-ty6i`): nor any terrified
    // or Feasting unit.
    terrorThisTurn: [],
    feastedThisTurn: [],
    // The ninth unit (`pulp_wars-w49.17`): nor any Wight's Grave, risen
    // Wight, or Cracked unit.
    ninthUnit: {
      wightGraves: [],
      risenWights: [],
      crackedThisTurn: [],
    },
    // Dwarf crowd control (`pulp_wars-w49.33`): nor any Barricade.
    barricades: [],
    // The giants' signatures (`pulp_wars-w49.30`): nor any held victim.
    giants: { swallowed: [] },
    // The Cultists (`pulp_wars-mch9.4`): nor any Cult seat's Favour.
    cult: { favour: [] },
  };
}
import {
  ORIGINAL_BASELINE_V5_NODES,
  TECHNOLOGY_IDS_V7,
  cityId,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../src/engine/index";

const RETAINED_SUPPORTED_ROLES = new Set(["FIGHTER", "GUARD"]);
const LEGACY_DEFENSE_SOURCES = new Set(["FRIENDLY_CITY", "CITY_FORTIFICATION"]);

function addValues(
  left: { readonly numerator: number; readonly denominator: number },
  right: { readonly numerator: number; readonly denominator: number },
): { readonly numerator: number; readonly denominator: number } {
  const numerator =
    left.numerator * right.denominator + right.numerator * left.denominator;
  const denominator = left.denominator * right.denominator;
  const divisor = greatestCommonDivisor(Math.abs(numerator), denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function greatestCommonDivisor(left: number, right: number): number {
  while (right !== 0) [left, right] = [right, left % right];
  return left || 1;
}
