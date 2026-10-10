/**
 * The Mind Control revision (docs/product/RULESET_7_MIND_CONTROL.md section
 * 2.2): the class of every raw faction read (`playerFactionV7`,
 * `effectiveRoleRuleV7`, `roleMechanicsV7`, `technologyCapabilitiesV7`, or
 * a `.faction` property) in `src/engine`, `src/ai`, `src/render`, and
 * `src/headless`, keyed by file and enclosing function
 * (`tests/fixtures/v7-kind-readers.ts`).
 *
 * - `KIND`: at least one read in the function means a unit's kind (the
 *   faction of its original owner while it is mind-controlled); the
 *   function resolves it through `unitFactionV7`, `unitCapabilitiesV7`,
 *   `unitRoleRuleV7`, or `unitRoleMechanicsV7` (or the state parser's
 *   `kindOf`), which the test checks. Its other reads may be seat-level.
 * - `KIND_RESOLVED`: the read is of a faction already resolved to the
 *   unit's kind upstream (a board plan entry's `faction`, a Mind Control
 *   preview's `faction`).
 * - `SEAT`: the seat's own faction is right: production and training,
 *   research, city and economy rules, Plunder, registry and setup, labels
 *   of seat-level things, the viewer's own plans. The Normal AI's per-unit
 *   policies (the Kaboom setup and Gang Up Moves, the Ice Folk unit rules,
 *   Tunnel, Bomb Run and its bomb damage, Repair, the Vampire's and Lich's
 *   rules, Frenzy, WAAAGH! and Psychic Command, the Dinosaur Moves) read
 *   the unit's kind through `policyUnitFactionV7` (`src/ai/v7-martian.ts`,
 *   the AI pass of the revision, section 8) and no longer appear here; the
 *   AI's remaining `SEAT` reads are its seat plans (research, production,
 *   economy, capacity) and match gates.
 *
 * `tests/unit/ruleset-v7-mind-control-kind-readers.test.ts` fails when a
 * read appears without a class or a class names no read.
 */
export const KIND_READER_CLASSES_V7: Readonly<
  Record<string, "KIND" | "KIND_RESOLVED" | "SEAT">
> = {
  "src/engine/rules/ruleset-v7.ts::cityUnitCapacityForV7": "SEAT",
  "src/engine/rules/ruleset-v7.ts::playerFactionV7": "SEAT",
  "src/engine/rules/ruleset-v7.ts::unitFactionV7": "KIND",
  // Map curiosities (`pulp_wars-737.3`): the capabilities of the empty
  // technology list, which no tree changes (the neutral registration's).
  "src/engine/rules/ruleset-v7.ts::neutralCapabilitiesV7": "SEAT",
  "src/engine/rules/ruleset-v7.ts::unitCapabilitiesV7": "KIND",
  "src/engine/rules/ruleset-v7.ts::unitRoleRuleV7": "KIND",
  "src/engine/rules/ruleset-v7.ts::unitRoleMechanicsV7": "KIND",
  "src/engine/rules/ruleset-v7.ts::seatRoleRuleV7": "SEAT",
  "src/engine/rules/ruleset-v7.ts::seatRoleMechanicsV7": "SEAT",
  "src/engine/rules/ruleset-v7.ts::isEggLaidRoleV7": "SEAT",
  "src/engine/rules/ruleset-v7.ts::assertRuleset7Registry": "SEAT",
  "src/engine/v7/afflictions.ts::isLivingOwnerV7": "SEAT",
  "src/engine/v7/dwarf-reducer.ts::applyAssembleV7": "SEAT",
  "src/engine/v7/economy.ts::cityUnitCapacityV7": "SEAT",
  "src/engine/v7/economy.ts::landTradeCityIdsV7": "SEAT",
  // Tuning 2 (`pulp_wars-w49.3`): the land trade line reads the viewer's
  // own Commerce capability (a seat-level economy rule).
  "src/render/technology-unlock-text-v7.ts::landTradeStatusV7": "SEAT",
  // Tuning 3 (`pulp_wars-w49.3`): Forest cover is the owner's Forestry, and
  // hiring is the owner's Commerce and its own roster (seat-level rules).
  "src/engine/rules/ruleset-v7.ts::ownerHasForestCoverV7": "SEAT",
  // Any unit can capture (`pulp_wars-ke95`): whether a role the seat
  // trains captures (the Normal AI's endgame training bias).
  "src/engine/rules/ruleset-v7.ts::roleCanEverCaptureV7": "SEAT",
  "src/ai/v7-campaign.ts::policyRoleCapturesV7": "SEAT",
  // The exploration plan (`pulp_wars-nc6`): a scout's Sight bonus is its
  // owner's technology (the seat's Scouting), as the reveal estimate reads
  // it; its Move, movement mode, and Glide go through the kind helpers.
  "src/ai/v7-exploration.ts::explorationProfileV7": "SEAT",
  "src/engine/v7/query.ts::appendPublicHireCommandsV7": "SEAT",
  "src/engine/v7/query.ts::publicHireCostV7": "SEAT",
  "src/engine/v7/reducer.ts::applyHire": "SEAT",
  "src/ai/v7.ts::policyForestCoverV7": "SEAT",
  // The naval branch (`pulp_wars-5ti.2`): Harbours is the dock owner's own
  // capability (a seat-level economy rule).
  "src/engine/v7/economy.ts::harbourPopulationForV7": "SEAT",
  "src/engine/v7/eggs.ts::laidEggHpV7": "SEAT",
  "src/engine/v7/eggs.ts::laidEggTurnsV7": "SEAT",
  "src/engine/v7/event-schema.ts::trainingCosts": "SEAT",
  // The naval branch: a ship's cost is the same in every registration (the
  // Human one is read).
  "src/engine/v7/event-schema.ts::trainingCost": "SEAT",
  "src/engine/v7/ice-folk.ts::winterV7": "SEAT",
  "src/engine/v7/map.ts::createPlayers": "SEAT",
  "src/engine/v7/map.ts::createEntities": "SEAT",
  "src/engine/v7/martian.ts::rechargeShieldsAtEndTurnV7": "SEAT",
  "src/engine/v7/movement.ts::publicMovementContextV7": "SEAT",
  "src/engine/v7/query.ts::queryTechnologyTreeV7": "SEAT",
  "src/engine/v7/query.ts::queryTechnologyCapabilitiesV7": "SEAT",
  // The naval branch: the viewer's own Harbours for its own docks.
  "src/engine/v7/query.ts::publicDockPopulationV7": "SEAT",
  "src/engine/v7/query.ts::appendPublicCityCommandsV7": "SEAT",
  "src/engine/v7/query.ts::publicAssembleFactsV7": "SEAT",
  "src/engine/v7/query.ts::previewLayEggV7": "SEAT",
  "src/engine/v7/query.ts::createPublicPlanningFactKeyWorkV7": "SEAT",
  "src/engine/v7/query.ts::publicEconomyGraph": "SEAT",
  "src/engine/v7/query.ts::publicGraphNavalConnectivityV7": "SEAT",
  "src/engine/v7/query.ts::IncrementalPublicRedevelopmentPossibilityWorkV7.advanceOne":
    "SEAT",
  "src/engine/v7/query.ts::createPublicChainSimulationV7": "SEAT",
  "src/engine/v7/reducer.ts::applyTrainNaval": "SEAT",
  "src/engine/v7/reducer.ts::applyTrain": "SEAT",
  "src/engine/v7/reducer.ts::applyLayEgg": "SEAT",
  "src/engine/v7/reducer.ts::applyReward": "SEAT",
  "src/engine/v7/reducer.ts::resolveTreasure": "SEAT",
  "src/engine/v7/reducer.ts::applyRaiseDead": "SEAT",
  "src/engine/v7/reducer.ts::plunderAwardsV7": "SEAT",
  "src/engine/v7/setup.ts::validateSetupWithoutModeV7": "SEAT",
  // Score and modes (`pulp_wars-kaw6.2`): Technology counts the tiers of
  // the seat's own tree; the grade names the human seat's tribe. A unit's
  // value resolves its kind through `unitRoleRuleV7` (no raw read).
  "src/engine/v7/score.ts::techTiersV7": "SEAT",
  "src/engine/v7/score-query.ts::queryStarGradeV7": "SEAT",
  // The Monument's builder (pulp_wars-eu3r.3): the building seat's faction.
  "src/engine/v7/reducer.ts::applyMonument": "SEAT",
  // `pulp_wars-68k.2`: mission registry, setup, and builder read seat
  // factions; no unit is mind-controlled at setup, so a seat's faction is
  // the kind of every unit it starts with (as in the Showcase).
  "src/engine/v7/setup.ts::validateMissionSetupV7": "SEAT",
  "src/engine/v7/missions/index.ts::missionSeatFactionsV7": "SEAT",
  "src/engine/v7/missions/index.ts::missionMatchSetupV7": "SEAT",
  "src/engine/v7/missions/build.ts::buildMissionStateV7": "SEAT",
  "src/engine/v7/missions/build.ts::validateMissionDefinitionV7": "SEAT",
  "src/engine/v7/showcase.ts::createShowcaseEntitiesV7": "SEAT",
  "src/engine/v7/state-schema.ts::parsePlayers": "SEAT",
  "src/engine/v7/state-schema.ts::parsePlayer": "SEAT",
  "src/engine/v7/state-schema.ts::parseUnit": "KIND",
  "src/engine/v7/state-schema.ts::validateCrossReferences": "KIND",
  "src/engine/v7/state-schema.ts::burrowedValid": "KIND",
  // `pulp_wars-1wy.3`: the free Tractor Beam list names units whose role,
  // under its kind (`kindOf`), has the Heavy Tractor Beam.
  "src/engine/v7/state-schema.ts::martianTurnListsValid": "KIND",
  "src/engine/v7/view.ts::viewForV7": "SEAT",
  "src/ai/v7-dinosaur.ts::dinosaurMatchForPolicyV7": "SEAT",
  "src/ai/v7-dinosaur.ts::ignoresWallsForPolicyV7": "SEAT",
  // The Dinosaur pass (`pulp_wars-w49.15`): the viewer's own research for
  // its own Triceratops (a two-slot unit is never mind-controlled).
  "src/ai/v7-dinosaur.ts::runUpTilesForPolicyV7": "SEAT",
  "src/ai/v7-dinosaur.ts::technologyWithUnlockV7": "SEAT",
  "src/ai/v7-dinosaur.ts::layEggTurnsV7": "SEAT",
  "src/ai/v7-dinosaur.ts::dinosaurProductionAdjustmentV7": "SEAT",
  "src/ai/v7-dinosaur.ts::hatchScoreV7": "SEAT",
  // `pulp_wars-jdb.4`: the Candy match gate, the seat's production and
  // research, and the roles of Crumbs (a Candy seat's own, re-baked under
  // its own registration; a controlled Confectioner cannot Re-bake).
  "src/ai/v7-candy.ts::candyMatchForPolicyV7": "SEAT",
  "src/ai/v7-candy.ts::candyProductionAdjustmentV7": "SEAT",
  "src/ai/v7-candy.ts::candyResearchV7": "SEAT",
  "src/ai/v7-candy.ts::crumbsOrderV7": "SEAT",
  "src/ai/v7-candy.ts::eatsCrumbsWorthV7": "SEAT",
  "src/ai/v7-candy.ts::fragileRebakeV7": "SEAT",
  "src/ai/v7-candy.ts::rebakeApproachValueV7": "SEAT",
  "src/ai/v7-candy.ts::rebakeScoreV7": "SEAT",
  "src/ai/v7-dwarf.ts::dwarfMatchForPolicyV7": "SEAT",
  "src/ai/v7-dwarf.ts::dwarfFactsV7": "SEAT",
  "src/ai/v7-dwarf.ts::dwarfProductionAdjustmentV7": "SEAT",
  "src/ai/v7-dwarf.ts::dwarfResearchV7": "SEAT",
  "src/ai/v7-goblin.ts::goblinMatchForPolicyV7": "SEAT",
  "src/ai/v7-ice-folk.ts::iceFolkMatchForPolicyV7": "SEAT",
  "src/ai/v7-ice-folk.ts::iceFolkFactsV7": "SEAT",
  "src/ai/v7-ice-folk.ts::iceFolkProductionAdjustmentV7": "SEAT",
  "src/ai/v7-ice-folk.ts::iceFolkResearchV7": "SEAT",
  // `pulp_wars-5ti.4`: the seat's own tree (whether Seamanship gives it
  // the Ram: a seafaring seat); a ship's Ram is read by its kind
  // (`navalRammerV7`, through `unitCapabilitiesV7`).
  "src/ai/v7-naval.ts::navalBranchResearchV7": "SEAT",
  "src/ai/v7-martian.ts::martianMatchForPolicyV7": "SEAT",
  "src/ai/v7-martian.ts::martianFactsV7": "SEAT",
  "src/ai/v7-martian.ts::martianProductionAdjustmentV7": "SEAT",
  "src/ai/v7-martian.ts::martianResearchV7": "SEAT",
  "src/ai/v7-martian.ts::technologyWithCapabilityV7": "SEAT",
  "src/ai/v7-martian.ts::policyUnitFactionV7": "KIND",
  "src/ai/v7-undead.ts::undeadMatchForPolicyV7": "SEAT",
  "src/ai/v7-undead.ts::ownerIsUndeadV7": "SEAT",
  "src/ai/v7-undead.ts::ownerIsRestlessV7": "SEAT",
  "src/ai/v7-undead.ts::hasLivingHostileSeatV7": "SEAT",
  "src/ai/v7.ts::tacticalPlanWorkV7": "SEAT",
  "src/ai/v7.ts::roadCorridorWorkV7": "SEAT",
  "src/ai/v7.ts::navalPlanWorkV7": "SEAT",
  "src/ai/v7.ts::warTrainingFirstV7": "SEAT",
  "src/ai/v7.ts::computeSavingsPlanV7": "SEAT",
  "src/ai/v7.ts::undeadAttackValueV7": "SEAT",
  "src/ai/v7.ts::sharedCityContextWorkV7": "SEAT",
  // Tuning 5 (`pulp_wars-w49.4`), army play: the match gate (every seat's
  // faction), the seat's training roster and prices, and its research.
  "src/ai/v7-army.ts::armyRoleScoreV7": "SEAT",
  "src/ai/v7.ts::bareContext": "SEAT",
  "src/ai/v7.ts::armyResearchTargetV7": "SEAT",
  // The Undead pass (`pulp_wars-w49.13`): an Undead seat keeps the Coins for
  // a Lich (the seat's own plan).
  "src/ai/v7.ts::armyDearUnitFloorV7": "SEAT",
  // The Undead pass, correction: an Undead seat's opening, economy, and
  // garrison rules are the seat's plan (the viewer's faction); so are a
  // seat's answer to Zombies (not an Undead seat's) and its cure (its own
  // Captain's rule).
  "src/ai/v7.ts::armyUndeadSeatV7": "SEAT",
  // The Martian pass (`pulp_wars-w49.14`): the seats that open like the
  // Undead (the viewer's own faction).
  "src/ai/v7.ts::armyOpeningSeatV7": "SEAT",
  // Its correction: the economy seats, the two seats of the correction's
  // rules, and the roles the viewer's own faction trains.
  "src/ai/v7.ts::armyEconomySeatV7": "SEAT",
  "src/ai/v7.ts::armyCorrectionSeatV7": "SEAT",
  "src/ai/v7.ts::armyOpenToRangedUselessV7": "SEAT",
  "src/ai/v7.ts::armyEconomyFirstV7": "SEAT",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): whether the seat's
  // own research order begins with its defender (the viewer's faction).
  "src/ai/v7.ts::armyDefenderResearchV7": "SEAT",
  "src/ai/v7.ts::defenderLastStepResearchV7": "SEAT",
  // Step two of the Human pass (`pulp_wars-w49.22`): whether the seat that
  // chooses a city's training is a Human one (the viewer's faction).
  "src/ai/v7.ts::armyChoosesWithinFloorV7": "SEAT",
  // Step two of the Goblin pass (`pulp_wars-w49.23`): whether the seat
  // that decides is a Goblin one (the viewer's faction), and the Orc
  // Brute's technology in that seat's own tree.
  "src/ai/v7.ts::goblinMobSeatV7": "SEAT",
  "src/ai/v7.ts::armyBlockerV7": "SEAT",
  "src/ai/v7.ts::armyBlockerResearchV7": "SEAT",
  // Step two of the Undead pass (`pulp_wars-w49.24`): the price of the
  // seat's own Skeleton, and the Zombie's technology in its own tree.
  "src/ai/v7.ts::armyUndeadBodiesFirstV7": "SEAT",
  "src/ai/v7.ts::armyUndeadGrowthFirstV7": "SEAT",
  // Step two of the Martian pass (`pulp_wars-w49.25`): the seat that
  // decides is a Martian one (the viewer's faction), and the order in which
  // that seat researches toward its own units.
  "src/ai/v7.ts::armyMartianSeatV7": "SEAT",
  // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the seat that
  // decides is a Dinosaur one (the viewer's faction).
  "src/ai/v7.ts::armyDinosaurSeatV7": "SEAT",
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the seat that
  // decides is an Ice Folk one (the viewer's faction), and the blow whose
  // Cold Blood, Planted, Rockfall and Shatter are projected is that seat's
  // own (the attacker's abilities are read through `unitRoleMechanicsV7`).
  "src/ai/v7.ts::armyIceFolkSeatV7": "SEAT",
  "src/ai/v7.ts::iceFolkBlowV7": "SEAT",
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): the seat that decides
  // is a Dwarf one (the viewer's faction).
  "src/ai/v7.ts::armyDwarfSeatV7": "SEAT",
  // The Candy army seat (`pulp_wars-jdb.13`): the seat that decides is a
  // Candy one (the viewer's faction).
  "src/ai/v7.ts::armyCandySeatV7": "SEAT",
  "src/ai/v7.ts::armyMartianResearchRolesV7": "SEAT",
  "src/ai/v7.ts::armyShootsBiterFirstV7": "SEAT",
  "src/ai/v7.ts::armyCureDueV7": "SEAT",
  "src/ai/v7.ts::armyCureResearchV7": "SEAT",
  "src/ai/v7.ts::armyVacatesCenterV7": "SEAT",
  // The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur army seat's slot
  // research and its Scouts choice are the viewer's faction's policy.
  "src/ai/v7.ts::armyDinosaurCrowdedV7": "SEAT",
  // The correction of the Dinosaur pass: the Ankylosaurus cap, the garrison
  // under a fast unit's eye, the Triceratops's hold, and the Ankylosaurus
  // that makes no losing attack are a Dinosaur seat's policy (the viewer's
  // faction); the Shaman's heal is read from the Dinosaur registration.
  "src/ai/v7.ts::armyDinosaurDefenderHeldV7": "SEAT",
  "src/ai/v7.ts::armyDinosaurKeepsCenterV7": "SEAT",
  "src/ai/v7.ts::armyChargeHeldV7": "SEAT",
  "src/ai/v7.ts::armyWallbreakerDueV7": "SEAT",
  "src/ai/v7.ts::dinosaurAttackRejectedV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::shamanTendDinosaurV7": "SEAT",
  // The Goblin pass, correction (`pulp_wars-w49.12`): the escort is a
  // Goblin seat's policy (the viewer's faction), whatever kind the unit is.
  "src/ai/v7.ts::armyEscortValueV7": "SEAT",
  // Tuning 7 (`pulp_wars-w49.10`): the class of the unit the seat's next
  // technology unlocks.
  "src/ai/v7.ts::armyWarHoldsResearchV7": "SEAT",
  // Tuning 8 (`pulp_wars-w49.11`): what the seat can train as a garrison,
  // the growth technology and the roles of its faction's research order,
  // and whether the seat plays the Goblin rules.
  "src/ai/v7.ts::armyBestDefenderWorthV7": "SEAT",
  "src/ai/v7.ts::armyWarGrowthDueV7": "SEAT",
  "src/ai/v7.ts::armyFrontShooterV7": "SEAT",
  // Tuning 8, correction pass: what the seat can train onto a center.
  "src/ai/v7.ts::armyHelplessGarrisonV7": "SEAT",
  "src/ai/v7.ts::sharedTrainingCostV7": "SEAT",
  "src/ai/v7.ts::scoreCommandWithContext": "SEAT",
  "src/ai/v7.ts::raisedSkeletonDoomedV7": "SEAT",
  "src/ai/v7.ts::freshUnitInLethalReachV7": "SEAT",
  "src/ai/v7.ts::goblinAttackValueV7": "SEAT",
  "src/ai/v7.ts::signatureResearchV7": "SEAT",
  "src/ai/v7.ts::laidEggHpForPolicyV7": "SEAT",
  "src/ai/v7.ts::threatenedEggValueV7": "SEAT",
  "src/ai/v7.ts::eggAbandonEmergencyV7": "SEAT",
  "src/ai/v7.ts::dwarfPlayV7": "SEAT",
  "src/ai/v7.ts::dwarfResearchFactsV7": "SEAT",
  "src/ai/v7.ts::researchValue": "SEAT",
  "src/ai/v7.ts::dinosaurBranchResearchV7": "SEAT",
  "src/ai/v7.ts::shortestResearchChainForCommand": "SEAT",
  "src/ai/v7.ts::shortestResearchChainForRole": "SEAT",
  "src/ai/v7.ts::researchChain": "SEAT",
  "src/ai/v7.ts::trainingStrategicValue": "SEAT",
  "src/ai/v7.ts::publicRevealGain": "SEAT",
  "src/ai/v7.ts::targetStrategicValue": "SEAT",
  "src/ai/v7.ts::freeCapacity": "SEAT",
  "src/ai/v7.ts::trainingCostV7": "SEAT",
  "src/ai/v7.ts::projectPublicUnits": "SEAT",
  "src/render/canvas/board-renderer-v7.ts::buildBoardRenderPlanV7": "SEAT",
  "src/render/canvas/board-renderer-v7.ts::drawBoardV7": "KIND_RESOLVED",
  "src/render/canvas/board-renderer-v7.ts::ownerPresentation": "SEAT",
  "src/render/canvas/faction-colours-v7.ts::playerFactionColourV7": "SEAT",
  "src/render/canvas/martian-board-plan-v7.ts::martianMachineV7": "SEAT",
  // pulp_wars-2yc.28: the faction of the seat that owns a territory (the
  // forest set a wood in the fog is packed with).
  "src/render/canvas/terrain-at-fog-v7.ts::terrainGhostsV7": "SEAT",
  // pulp_wars-556y: the victory wave takes the winning seat's faction skin
  // (the winner, the viewer's seat, and the Human win's sparkles).
  "src/render/canvas/victory-wave-v7.ts::victoryWaveTriggerV7": "SEAT",
  "src/render/canvas/victory-wave-v7.ts::createVictoryWaveV7": "SEAT",
  "src/render/canvas/victory-wave-v7.ts::frame": "SEAT",
  // The Human win's taller hop, and the gold tint of its crossfade.
  "src/render/canvas/victory-wave-v7.ts::hops": "SEAT",
  "src/render/canvas/board-host-v7.ts::CanvasBoardHostV7.#draw": "SEAT",
  "src/render/canvas/victory-wave-v7.ts::faction": "SEAT",
  "src/render/canvas/board-host-v7.ts::CanvasBoardHostV7.victoryWaveState":
    "SEAT",
  "src/render/dinosaur-presentation-v7.ts::matchHasDinosaurV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::dinosaurLabel": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::bigBodyRolesV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::bigBodySlots": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::chargeRunUpBonusV7": "SEAT",
  // The Dinosaur pass: the Dinosaur registration's Pack Hunt, by name.
  "src/render/dinosaur-presentation-v7.ts::packHuntBonusV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::<module>": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::dinosaurRewardLabelV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::dinosaurHelpRulesV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::eggRefundV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::layEggUnavailableTextV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::dinosaurUnitInfoLinesV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::dinosaurRecruitNotesV7": "SEAT",
  // Faction building looks (bead pulp_wars-xdh.2): the faction of the seat
  // that owns a territory, never a unit's.
  "src/render/faction-buildings-v7.ts::territoryFactionV7": "SEAT",
  "src/render/faction-buildings-v7.ts::matchHasFactionBuildingsV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::dinosaurFieldDefenseBlockedV7":
    "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#dock": "KIND",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#commandButtons": "SEAT",
  // Bead pulp_wars-2yc.39: Help is the same for every faction and reads
  // none (`#help` has no class any more).
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#recruitHelp": "SEAT",
  // Bead pulp_wars-2yc.39 (classified by pulp_wars-2yc.40): the unit
  // glossary reads the registration of the faction its caller passes, for a
  // role. The unit "?" dialog passes the unit's kind
  // (`presentedUnitFactionV7`, which goes through `unitFactionV7`), so a
  // mind-controlled unit is explained as what it is; the recruit "?" dialog
  // passes the seat's own faction, and the Gallery a column's.
  "src/render/unit-glossary-v7.ts::abilityGlossaryIdV7": "KIND_RESOLVED",
  "src/render/unit-glossary-v7.ts::roleTraitGlossaryIdsV7": "KIND_RESOLVED",
  "src/render/unit-glossary-v7.ts::roleGlossaryV7": "KIND_RESOLVED",
  // Bead pulp_wars-2yc.39 (classified by pulp_wars-2yc.40): the first-steps
  // coach names a technology the viewer can research in the viewer's own
  // faction's words ("Research Gathering to harvest your fruit"); research
  // is seat-level and no unit's kind is read.
  "src/render/first-steps-v7.ts::chooseFirstStepV7": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#leaderboard": "SEAT",
  // The Goblin pass: the Scouts reward names the seat's own Raider-role
  // unit (a Goblin city's Wolf Rider).
  "src/render/dom/app-view-v7.ts::rewardLabel": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#reward": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#dispatch": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#layEggCards": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#layEggPickPanel": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#hatchButton": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#dwarfActionButtons":
    "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#viewerFaction": "SEAT",
  // Bead pulp_wars-2yc.27: the match's theme music is the viewing seat's
  // faction theme; no unit is involved.
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#syncMusic": "SEAT",
  // The campaign screens (pulp_wars-68k.5) read the factions of a mission's
  // seats and of the unlock table; no unit is involved.
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#campaignList": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#briefing": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#factionEmblem": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#missionResults": "SEAT",
  // Many players (pulp_wars-ykw.5): seats and their factions in the setup
  // grid, the turn-order strip and the end-of-game list.
  "src/render/dom/app-view-v7.ts::syncFactionFieldsV7": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#settleSetupEmblems":
    "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#factionFields": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#resultSeats": "SEAT",
  // Score and modes (pulp_wars-kaw6.3): the winner by score is named by
  // its seat's faction.
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#scoreVerdict": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#turnStrip": "SEAT",
  // Tribe stars (pulp_wars-kaw6.4): the setup's tribe cards and the end of
  // a match's star award read the human seat's faction.
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#tribePicker": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#syncStarFields": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#starRecordLine": "SEAT",
  "src/render/dom/app-view-v7.ts::identity": "SEAT",
  "src/render/dom/app-view-v7.ts::trainingCostForViewV7": "SEAT",
  "src/render/dom/app-view-v7.ts::incomeDescription": "SEAT",
  "src/render/dom/app-view-v7.ts::effectDescription": "SEAT",
  "src/render/dom/app-view-v7.ts::technologyRoleDescriptionsV7": "SEAT",
  // Bead pulp_wars-ic8: the role-level texts moved to their own module,
  // and the Gallery reads a column's faction (the registry, never a live
  // unit, so no kind to resolve); its demo board has no controlled unit
  // before the cue it plays.
  "src/render/role-presentation-v7.ts::recruitmentRolePresentationV7": "SEAT",
  "src/render/gallery-presentation-v7.ts::galleryUnitCellV7": "SEAT",
  "src/render/gallery-presentation-v7.ts::galleryUnitDetailsV7": "SEAT",
  "src/render/gallery-demo-v7.ts::galleryDemoCuesV7": "SEAT",
  "src/render/gallery-demo-v7.ts::targetAt": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#table": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#unitCell": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#buildingCell": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#openDetail": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#closeDetail": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#neighbours": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#renderDetail": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#detailHeader": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#stepper": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#unitDetail": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#buildingDetail": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#unitCues": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#demoSection": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#startDemo": "SEAT",
  // Bead pulp_wars-2yc.3 (classified by pulp_wars-2yp): the Terrain tab
  // reads a column's faction like the rest of the Gallery: whose ground a
  // cell shows, the cell's colour and name, and the seat the sample board
  // is built for. The sample is a fresh authored state with one own
  // Fighter; no unit on it is mind-controlled, so there is no kind to
  // resolve.
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#terrainCell": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#terrainDetail": "SEAT",
  "src/render/dom/gallery-v7.ts::GalleryViewV7.#startSample": "SEAT",
  // Bead pulp_wars-2yc.19: the Gallery's Sounds tab reads the faction of a
  // theme's manifest entry and of a card's picture (whose portrait, in
  // whose colour): registry factions, never a live unit, so there is no
  // kind to resolve.
  "src/render/gallery-sounds-presentation-v7.ts::themeEntry": "SEAT",
  // Bead pulp_wars-2yc.27: the themes of no faction (the title theme)
  // are the manifest entries whose faction is null.
  "src/render/gallery-sounds-presentation-v7.ts::gallerySoundGroupsV7": "SEAT",
  "src/render/dom/gallery-sounds-v7.ts::gallerySoundsPanelV7": "SEAT",
  // Bead pulp_wars-2yc.4 (classified by pulp_wars-2yp): the title scene
  // draws authored figures, each the registry faction its layout names
  // (title-scene-v7.ts builds the art subject from that faction; `#draw`
  // reads it for the owner colour of a masked raster). There is no match
  // and no live unit behind the scene, hence no controller and no kind.
  "src/render/dom/title-scene-view-v7.ts::TitleSceneViewV7.#draw": "SEAT",
  // Bead pulp_wars-2yc.41: the tile dock's Forest and Mountain picture
  // reads the faction that owns the selected cell's territory (its ground
  // and its trees): a seat's faction, never a unit's kind.
  "src/render/dock-terrain-presentation-v7.ts::dockTerrainGroundV7": "SEAT",
  "src/render/dock-terrain-presentation-v7.ts::dockTerrainSwatchV7": "SEAT",
  "src/render/dom/app-view-v7.ts::commandLabel": "SEAT",
  "src/render/dom/app-view-v7.ts::playerTitle": "SEAT",
  "src/render/dom/app-view-v7.ts::factionBadgeArt": "SEAT",
  "src/render/dwarf-presentation-v7.ts::matchHasDwarfSeatV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::dwarfLabelV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::dwarfRolesWith": "SEAT",
  "src/render/dwarf-presentation-v7.ts::eruptionDamageOfV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::viewerBombDamageV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::viewerEruptionDamageV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::dwarfRoleUnlockTextV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::dwarfRecruitNotesV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::digInChipV7": "SEAT",
  "src/render/dwarf-presentation-v7.ts::dwarfFieldDefenseBlockedV7": "SEAT",
  "src/render/goblin-presentation-v7.ts::matchHasGoblinV7": "SEAT",
  "src/render/goblin-presentation-v7.ts::goblinRecruitNotesV7": "SEAT",
  // The Goblin pass (`pulp_wars-w49.12`): the three unit rules, read from
  // the Goblin registration for a role its callers resolved to the Goblin
  // kind (`stats.goblin` of the unit, or a Goblin seat's recruit notes).
  "src/render/goblin-presentation-v7.ts::goblinUnitInfoLinesV7":
    "KIND_RESOLVED",
  "src/render/goblin-presentation-v7.ts::goblinFieldDefenseBlockedV7": "SEAT",
  "src/render/goblin-presentation-v7.ts::roleLabel": "SEAT",
  // `pulp_wars-w49.36`: the Goblin Help's blast numbers, read from the
  // Goblin registration (a rule text, no unit).
  "src/render/goblin-presentation-v7.ts::goblinBlastListV7": "SEAT",
  // The giants' signatures (`pulp_wars-w49.32`): a faction giant's
  // signature, its rule text and reward line read its faction's
  // registration (rule texts, no unit); a button's tooltip takes the
  // giant's faction already resolved by the dock; the Break Off cue reads a
  // Candy palette colour. A unit's card line, a button's reason and a
  // victim's name resolve the unit's kind through `presentedUnitFactionV7`,
  // `unitRoleMechanicsV7` and `unitRoleRuleV7`, so they read no faction
  // themselves.
  "src/render/giant-presentation-v7.ts::factionGiantSignatureV7": "SEAT",
  "src/render/giant-presentation-v7.ts::label": "SEAT",
  "src/render/giant-presentation-v7.ts::giantSignatureRuleV7": "SEAT",
  "src/render/giant-presentation-v7.ts::giantRewardLabelV7": "SEAT",
  "src/render/giant-presentation-v7.ts::giantCommandTooltipV7": "KIND_RESOLVED",
  "src/render/canvas/giant-effects-v7.ts::drawBreakOff": "SEAT",
  // The naval branch interface (`pulp_wars-5ti.7`): Seamanship's boarding
  // and Harbours are the viewer's own capabilities (a boarded prize's kind
  // follows its new owner, and Harbours is a seat-level economy rule).
  "src/render/naval-presentation-v7.ts::viewerMayBoardV7": "SEAT",
  "src/render/naval-presentation-v7.ts::viewerHarbourPopulationV7": "SEAT",
  // The frozen sea interface (`pulp_wars-5ti.7`): Black Ice is the ice
  // owner's own capability, and the Sea Dog goal is the viewer's seat's.
  "src/render/frozen-sea-presentation-v7.ts::viewerHasBlackIceV7": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#achievements": "SEAT",
  // The viewer's own Monument look (pulp_wars-eu3r.3).
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#achievementNotice":
    "SEAT",
  "src/render/ice-folk-presentation-v7.ts::matchHasIceFolkSeatV7": "SEAT",
  "src/render/ice-folk-presentation-v7.ts::iceFolkLabelV7": "SEAT",
  "src/render/ice-folk-presentation-v7.ts::iceFolkRolesWith": "SEAT",
  "src/render/ice-folk-presentation-v7.ts::boulderThrowTextV7": "SEAT",
  "src/render/ice-folk-presentation-v7.ts::shatterThresholdAgainstV7": "SEAT",
  "src/render/ice-folk-presentation-v7.ts::iceFolkRoleUnlockTextV7": "SEAT",
  "src/render/ice-folk-presentation-v7.ts::iceFolkRecruitNotesV7": "SEAT",
  "src/render/ice-folk-presentation-v7.ts::iceFolkFieldDefenseBlockedV7":
    "SEAT",
  "src/render/ice-folk-presentation-v7.ts::snowTooltipV7": "SEAT",
  "src/render/martian-presentation-v7.ts::matchHasMartianV7": "SEAT",
  "src/render/martian-presentation-v7.ts::martianLabelV7": "SEAT",
  "src/render/martian-presentation-v7.ts::martianRolesWith": "SEAT",
  "src/render/martian-presentation-v7.ts::martianRolesMoving": "SEAT",
  "src/render/martian-presentation-v7.ts::martianHelpRulesV7": "SEAT",
  "src/render/martian-presentation-v7.ts::martianRewardLabelV7": "SEAT",
  "src/render/martian-presentation-v7.ts::martianRoleUnlockTextV7": "SEAT",
  // The Martian pass: the caller passes the unit's kind.
  "src/render/martian-presentation-v7.ts::martianAbilityDescriptionV7":
    "KIND_RESOLVED",
  "src/render/martian-presentation-v7.ts::martianRecruitNotesV7": "SEAT",
  "src/render/martian-presentation-v7.ts::mindControlPreviewLinesV7":
    "KIND_RESOLVED",
  // `pulp_wars-1wy.5`: the Tractor Beam text of a role under the faction
  // its caller resolved (the dock passes the unit's kind, the Gallery and
  // the recruit card their own column's faction).
  "src/render/martian-presentation-v7.ts::roleHasHeavyTractorBeamV7":
    "KIND_RESOLVED",
  "src/render/martian-presentation-v7.ts::martianFieldDefenseBlockedV7": "SEAT",
  "src/render/martian-presentation-v7.ts::martianSlotCapacityTooltipV7": "SEAT",
  "src/render/undead-presentation-v7.ts::cureCaptainPhraseV7": "SEAT",
  "src/render/undead-presentation-v7.ts::unitAfflictionsV7": "SEAT",
  "src/headless/cli.ts::factionsArgV7": "SEAT",
  "src/headless/ice-folk-telemetry-v7.ts::recordIceFolkV7": "SEAT",
  // `pulp_wars-1wy.2`: the Martian mobility probe. The gate is the viewer
  // seat's faction; the roles it trains are the seat's own (the carrier
  // counts come from `martianArmyCountsV7`, which leaves controlled units
  // out); the runner finds the Martian seat and names the winner's faction.
  // Every per-unit read in the probe goes through `unitRoleRuleV7`.
  "src/headless/martian-mobility-probe-match-v7.ts::runMartianMobilityProbeMatchV7":
    "SEAT",
  "src/headless/martian-mobility-probe-v7.ts::chooseMartianMobilityProbeCommandV7":
    "SEAT",
  "src/headless/martian-mobility-probe-v7.ts::probeProductionV7": "SEAT",
  "src/headless/v7.ts::ownerFaction": "SEAT",
  // The Candy revision (`pulp_wars-jdb.3`). Crumbs are a Candy SEAT's
  // resource: a death leaves them only for a unit owned by a Candy seat (a
  // mind-controlled Candy unit, owned by its controller, leaves none), and
  // their bite is their owner's research. A Re-bake builds a unit of the
  // acting seat's registration (the unit does not exist yet).
  "src/engine/v7/candy.ts::crumbsBiteV7": "SEAT",
  "src/engine/v7/candy.ts::deathLeavesCrumbsV7": "SEAT",
  "src/engine/v7/query.ts::publicRebakeFactsV7": "SEAT",
  // The Candy UI (`pulp_wars-jdb.6`): the match gate, the labels and
  // technology text of the Candy registration, the viewer's own city slots
  // and Coins behind a Re-bake's reason, and the viewer's missing Field
  // Defense. A unit's own Candy state is read from its public stats, which
  // follow its kind.
  "src/render/candy-presentation-v7.ts::matchHasCandySeatV7": "SEAT",
  "src/render/candy-presentation-v7.ts::candyLabelV7": "SEAT",
  "src/render/candy-presentation-v7.ts::candyFieldDefenseBlockedV7": "SEAT",
  "src/render/candy-presentation-v7.ts::candyRoleUnlockTextV7": "SEAT",
  "src/render/candy-presentation-v7.ts::candyRecruitNotesV7": "SEAT",
  // A `sugarRush` entry and a Rush perk follow the unit's kind (`kindOf`);
  // a Crumbs owner is a Candy seat.
  "src/engine/v7/state-schema.ts::candyListsValid": "KIND",
  // The frozen sea (`pulp_wars-5ti.3`): Black Ice is the research of the
  // seat that owns the ice; Sea Dog counts by the seat's own faction (an Ice
  // Folk seat has no ships); no unit of the Ice Folk kind is afloat
  // (`kindOf`), and no Ice Folk seat owns a boat.
  "src/engine/v7/ice.ts::resolveBlackIceV7": "SEAT",
  "src/engine/v7/achievements.ts::revision21AchievementCountsV7": "SEAT",
  "src/engine/v7/state-schema.ts::iceValid": "KIND",
  // City names (`pulp_wars-2yc.30`): a city is named from the list of a
  // seat's faction (the owner of the site at the start, or of the nearest
  // starting capital); no unit is involved.
  "src/render/city-names-presentation-v7.ts::assignCityNamesV7": "SEAT",
  "src/render/city-names-presentation-v7.ts::cityNameSitesV7": "SEAT",
  "src/render/city-names-presentation-v7.ts::cityNameEntryV7": "SEAT",
  // The ninth unit (`pulp_wars-w49.17`, 7r55). The state check: a risen
  // Wight and a Whirligig with attacks made are units of that kind
  // (`kindOf`); a marked Grave belongs to a seat whose registration has
  // Rise Again. The presentation: the Help sentences and the card notes of
  // a faction's own roster (a registration's labels, no unit involved).
  "src/engine/v7/state-schema.ts::ninthUnitValid": "KIND",
  "src/render/ninth-unit-presentation-v7.ts::<module>": "SEAT",
  "src/render/ninth-unit-presentation-v7.ts::ninthUnitMechanicsV7": "SEAT",
  "src/render/ninth-unit-presentation-v7.ts::ninthUnitHelpRulesV7": "SEAT",
  // The giants' signatures (`pulp_wars-w49.30`). The state check reads the
  // holder's and the victim's kinds (`kindOf`; a held victim is never
  // mind-controlled).
  "src/engine/v7/state-schema.ts::giantsValid": "KIND",
  // The Cult's Favour (`pulp_wars-mch9.4`). Both reads are a seat's: the
  // Offering is a city action of the seat that owns the city (its own
  // tree's Harvest Rites), and a Favour entry belongs to a Cult seat. The
  // unit rules (Sacrifice, Seize, Martyr, the robed cultists) read the
  // unit's kind through `unitRoleRuleV7` and `unitRoleMechanicsV7`.
  "src/engine/v7/cult.ts::offeringRejectionV7": "SEAT",
  "src/engine/v7/state-schema.ts::cultValid": "SEAT",
};

/**
 * Ruleset 5 and 6 files (and their shared shells) whose faction reads have
 * no Mind Control: they are not classified.
 */
export const LEGACY_KIND_READER_FILES_V7: readonly string[] = [
  "src/ai/index.ts",
  "src/engine/combat/combat.ts",
  "src/engine/commands/predicates.ts",
  "src/engine/commands/reducers.ts",
  "src/engine/fog/view.ts",
  "src/engine/queries/player-query.ts",
  "src/engine/rules/ruleset-v6.ts",
  "src/engine/simulation.ts",
  "src/engine/v6/combat.ts",
  "src/engine/v6/movement.ts",
  "src/engine/v6/query.ts",
  "src/engine/v6/reducer.ts",
  "src/engine/v6/state-schema.ts",
  "src/engine/v6/unit-stats.ts",
  "src/engine/v6/view.ts",
  "src/headless/index.ts",
  "src/headless/v6.ts",
  "src/render/canvas/board-host-v6.ts",
  "src/render/canvas/board-host.ts",
  "src/render/canvas/board-renderer-v6.ts",
  "src/render/canvas/board-renderer.ts",
  "src/render/canvas/combat-presentation-v6.ts",
  "src/render/canvas/movement-presentation-v6.ts",
  "src/render/canvas/render-plan-v6.ts",
  "src/render/dom/app-view-v6.ts",
  "src/render/dom/app-view.ts",
  "src/render/dom/selection-identity-v6.ts",
  "src/render/dom/unit-presentation-v6.ts",
];
