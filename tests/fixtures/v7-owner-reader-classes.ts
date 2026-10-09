/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 10.5,
 * `pulp_wars-737.3`): the class of every reader that resolves a player
 * record or a seat's faction from an owner ID in the Ruleset 7 engine, the
 * Normal AI, and the headless runner (`tests/fixtures/v7-owner-readers.ts`),
 * keyed by file and enclosing function.
 *
 * - `NEUTRAL_AWARE`: the function handles the neutral owner
 *   (`NEUTRAL_OWNER_ID_V7`, the Giant Spider's) explicitly: it resolves the
 *   neutral registration, an empty technology list, or the neutral answer,
 *   or keeps the neutral owner hostile; the test checks that its text names
 *   the neutral owner.
 * - `NEUTRAL_SAFE`: a lookup whose missing result already gives the right
 *   answer for an owner that is no player (not Undead, not Restless).
 * - `PLAYER_ONLY`: reached only with a seat's ID (the acting seat of a
 *   command or a Start Turn, a city's owner, the viewer, the original owner
 *   of a controlled unit, the biter of a bite, the owner of a unit whose
 *   role the Spider never has), or a setup check that is no alliance test.
 *   `requirePlayer` and `playerFactionV7` throw for any other ID, so a
 *   player-only reader asserts.
 *
 * `tests/unit/ruleset-v7-owner-readers.test.ts` fails when a reader appears
 * without a class or a class names no reader.
 */
export const OWNER_READER_CLASSES_V7: Readonly<
  Record<string, "NEUTRAL_AWARE" | "NEUTRAL_SAFE" | "PLAYER_ONLY">
> = {
  // The Normal AI: the viewer seat's own role, the kind resolver of the
  // per-unit policies, and the public Undead faction reads.
  "src/ai/v7-martian.ts::factionShieldV7": "PLAYER_ONLY",
  "src/ai/v7-martian.ts::policyUnitFactionV7": "NEUTRAL_AWARE",
  "src/ai/v7-undead.ts::ownerIsRestlessV7": "NEUTRAL_SAFE",
  "src/ai/v7-undead.ts::ownerIsUndeadV7": "NEUTRAL_SAFE",
  // The resolvers: the owner's research and the unit's kind resolve the
  // neutral registration; the seat-level role reads are a seat's.
  "src/engine/rules/ruleset-v7.ts::ownerResearchedTechsV7": "NEUTRAL_AWARE",
  // Tuning 3 (`pulp_wars-w49.3`): the neutral owner keeps the Forest cover.
  "src/engine/rules/ruleset-v7.ts::ownerHasForestCoverV7": "NEUTRAL_AWARE",
  "src/engine/rules/ruleset-v7.ts::seatRoleMechanicsV7": "PLAYER_ONLY",
  "src/engine/rules/ruleset-v7.ts::seatRoleRuleV7": "PLAYER_ONLY",
  "src/engine/rules/ruleset-v7.ts::unitFactionV7": "NEUTRAL_AWARE",
  "src/engine/v7/afflictions.ts::isLivingOwnerV7": "PLAYER_ONLY",
  // A bitten victim rises for its biter's seat.
  "src/engine/v7/afflictions.ts::recordBittenRisingV7": "PLAYER_ONLY",
  // Push and Knockback: the moved unit may be the Spider (never moved); the
  // attacker has Push, Charge!, or Knockback, which the Spider never has.
  "src/engine/v7/combat.ts::displacementDestinationLegalV7": "NEUTRAL_AWARE",
  "src/engine/v7/combat.ts::knockbackStateV7": "PLAYER_ONLY",
  "src/engine/v7/combat.ts::pushState": "PLAYER_ONLY",
  "src/engine/v7/combat.ts::pushedDestinationV7": "PLAYER_ONLY",
  // The naval branch (`pulp_wars-5ti.2`): the rammer is a seat's Patrol
  // Boat with Seamanship (the Spider is a land unit with no technology).
  "src/engine/v7/combat.ts::ramShoveDestinationV7": "PLAYER_ONLY",
  "src/engine/v7/dwarf-reducer.ts::applyAssembleV7": "PLAYER_ONLY",
  // The tunnelling Mole is the acting seat's unit.
  "src/engine/v7/dwarf-reducer.ts::tunnelTileLegalV7": "PLAYER_ONLY",
  "src/engine/v7/economy.ts::cityUnitCapacityV7": "PLAYER_ONLY",
  // THE Cooperative alliance rule: the neutral owner is never an ally.
  "src/engine/v7/economy.ts::cooperativeAlliesV7": "NEUTRAL_AWARE",
  // The naval branch: a dock's owner is a city's owner (a seat); an owner
  // that is no player has no Harbours (0).
  "src/engine/v7/economy.ts::harbourPopulationForV7": "NEUTRAL_SAFE",
  "src/engine/v7/economy.ts::roadPopulationForCityV7": "PLAYER_ONLY",
  "src/engine/v7/eggs.ts::isNestTileV7": "PLAYER_ONLY",
  // The killing Zombie's seat (the Spider has no Infect).
  "src/engine/v7/infect.ts::recordInfectionV7": "PLAYER_ONLY",
  // A released unit goes back to its original owner's seat.
  "src/engine/v7/martian.ts::releaseControlledV7": "PLAYER_ONLY",
  // Mission definition checks of the mode (no alliance test).
  "src/engine/v7/missions/build.ts::validateMissionDefinitionV7": "PLAYER_ONLY",
  // Zone of control: the Spider projects none (section 8.3).
  "src/engine/v7/movement.ts::projectsZocV7": "NEUTRAL_AWARE",
  // Movement and reveals of the acting seat's own unit.
  "src/engine/v7/movement.ts::reachableMovementPathsV7": "PLAYER_ONLY",
  "src/engine/v7/movement.ts::revealFromV7": "PLAYER_ONLY",
  "src/engine/v7/movement.ts::validateMovementPathWithOptionsV7": "PLAYER_ONLY",
  // The viewer seat's city commands and previews; a chain preview's risings
  // belong to the biter's or killer's seat, releases to an original owner.
  "src/engine/v7/query.ts::appendPublicCityCommandsV7": "PLAYER_ONLY",
  "src/engine/v7/query.ts::appendPublicHireCommandsV7": "PLAYER_ONLY",
  "src/engine/v7/query.ts::createPublicChainSimulationV7": "PLAYER_ONLY",
  "src/engine/v7/query.ts::previewCityCapacityV7": "PLAYER_ONLY",
  "src/engine/v7/query.ts::previewLayEggV7": "PLAYER_ONLY",
  "src/engine/v7/query.ts::publicAssembleFactsV7": "PLAYER_ONLY",
  // Commands: `commonError` admits only the active seat as the actor.
  "src/engine/v7/reducer.ts::applyBeamDown": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyCapture": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyDisband": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyDisembark": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyEndTurn": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyFieldDefense": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyInfrastructure": "PLAYER_ONLY",
  // Tuning 3: commands of a player (never the neutral owner).
  "src/engine/v7/reducer.ts::applyBlastMountain": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyHire": "PLAYER_ONLY",
  // Tuning 4: a command of a player, and a city's owner (a city is never
  // the neutral owner's).
  "src/engine/v7/reducer.ts::applyLandGrant": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyLayEgg": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyMonument": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyPearls": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyPillage": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyPort": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyRaiseDead": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyResearch": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyReward": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyShipyard": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applySpatial": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyTractorBeam": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyTrain": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::applyTrainNaval": "PLAYER_ONLY",
  // Kill credit: the Spider's kills are nobody's; its death pays the bounty.
  "src/engine/v7/reducer.ts::plunderAwardsV7": "NEUTRAL_AWARE",
  // A Recover of the acting seat's unit, and idle recovery of the ending
  // seat's own units.
  "src/engine/v7/reducer.ts::recoveryFacts": "PLAYER_ONLY",
  // The shared attack exchange: the Spider's attack in the neutral turn.
  "src/engine/v7/reducer.ts::resolveAttackExchangeV7": "NEUTRAL_AWARE",
  "src/engine/v7/reducer.ts::resolveTreasure": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::revealRadius": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::rewardDisplacementCellV7": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::settleCityRewardsV7": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::treasureKnightPlacement": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::unitSightRadius": "PLAYER_ONLY",
  "src/engine/v7/reducer.ts::validateTileContext": "PLAYER_ONLY",
  // Setup checks of the mode (no alliance test).
  "src/engine/v7/setup.ts::validateSetupWithoutModeV7": "PLAYER_ONLY",
  "src/engine/v7/setup.ts::validateMissionSetupV7": "PLAYER_ONLY",
  // State parsing: a burrowed unit is never neutral; a unit and the cross
  // references accept exactly the listed Monsters.
  "src/engine/v7/state-schema.ts::burrowedValid": "PLAYER_ONLY",
  "src/engine/v7/state-schema.ts::parseUnit": "NEUTRAL_AWARE",
  "src/engine/v7/state-schema.ts::validateCrossReferences": "NEUTRAL_AWARE",
  // Headless faction metrics: the Spider's numbers are skipped first.
  "src/headless/v7.ts::unitKind": "NEUTRAL_AWARE",
  // The Candy revision (`pulp_wars-jdb.3`). Re-bake: the acting seat and its
  // registration. Crumbs: a dead unit whose owner is no player (the Spider)
  // leaves none, and an owner that is no player has no bite (the lookups'
  // missing result is the right answer). The state parser refuses a
  // `sugarRush` or Splat entry of a neutral unit by name.
  "src/engine/v7/candy-reducer.ts::applyRebakeV7": "PLAYER_ONLY",
  "src/engine/v7/candy-reducer.ts::rebakeTileLegalV7": "PLAYER_ONLY",
  "src/engine/v7/candy.ts::crumbsBiteV7": "NEUTRAL_SAFE",
  "src/engine/v7/candy.ts::deathLeavesCrumbsV7": "NEUTRAL_SAFE",
  "src/engine/v7/query.ts::publicRebakeFactsV7": "PLAYER_ONLY",
  "src/engine/v7/state-schema.ts::candyListsValid": "NEUTRAL_AWARE",
  // The frozen sea (`pulp_wars-5ti.3`): ice is owned by a seat (the Freezing
  // unit's owner), never by the neutral owner; a Freeze is a seat's command.
  // The state check skips the neutral owner's units by name.
  "src/engine/v7/ice.ts::iceIsPermanentV7": "NEUTRAL_SAFE",
  "src/engine/v7/reducer.ts::applyFreeze": "PLAYER_ONLY",
  "src/engine/v7/state-schema.ts::iceValid": "NEUTRAL_AWARE",
  // The ninth unit (`pulp_wars-w49.17`, 7r55). A marked Grave belongs to
  // the seat whose Wight died (the neutral owner's units mark none:
  // `deathMarksWightGraveV7`), so the rising reads a seat's registration.
  // The state check refuses a Cracked unit of the neutral owner by name
  // and requires a marked Grave's owner to be a player.
  "src/engine/v7/ninth-unit.ts::wightRisingRuleV7": "PLAYER_ONLY",
  "src/engine/v7/state-schema.ts::ninthUnitValid": "NEUTRAL_AWARE",
  // Dwarf crowd control (`pulp_wars-w49.33`): a Barricade's owner must be a
  // player of the match, so one of the neutral owner (no player) is refused.
  "src/engine/v7/state-schema.ts::barricadesValid": "NEUTRAL_SAFE",
  // The giants' signatures (`pulp_wars-w49.30`). The Toss and Break Off
  // placement rules, the Gingerbread Men's HP, and the Break Off command read the
  // acting seat's roles; the regurgitated Zombie is the holder's seat's (an
  // Abomination is never the neutral owner's) and the digest runs at a
  // seat's Start Turn. A held victim's owner is always a seat (the Giant
  // Spider is immune to Swallow): its missing record drops the victim in
  // the prune and the fold, and refuses the state in the check.
  "src/engine/v7/giants.ts::placementTileLegalV7": "PLAYER_ONLY",
  "src/engine/v7/giants.ts::breakOffTrooperHpV7": "PLAYER_ONLY",
  "src/engine/v7/giants.ts::applyBreakOffV7": "PLAYER_ONLY",
  "src/engine/v7/giants.ts::regurgitationTileV7": "PLAYER_ONLY",
  "src/engine/v7/giants.ts::resolveStartTurnDigestV7": "PLAYER_ONLY",
  "src/engine/v7/giants.ts::prunedGiantsV7": "NEUTRAL_SAFE",
  "src/engine/v7/giants.ts::swallowedOutcomeEventsV7": "NEUTRAL_SAFE",
  "src/engine/v7/state-schema.ts::giantsValid": "NEUTRAL_SAFE",
};
