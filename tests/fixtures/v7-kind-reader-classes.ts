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
  "src/engine/v7/eggs.ts::laidEggHpV7": "SEAT",
  "src/engine/v7/eggs.ts::laidEggTurnsV7": "SEAT",
  "src/engine/v7/event-schema.ts::trainingCosts": "SEAT",
  "src/engine/v7/ice-folk.ts::winterV7": "SEAT",
  "src/engine/v7/map.ts::createPlayers": "SEAT",
  "src/engine/v7/map.ts::createEntities": "SEAT",
  "src/engine/v7/martian.ts::rechargeShieldsAtEndTurnV7": "SEAT",
  "src/engine/v7/movement.ts::publicMovementContextV7": "SEAT",
  "src/engine/v7/query.ts::queryTechnologyTreeV7": "SEAT",
  "src/engine/v7/query.ts::queryTechnologyCapabilitiesV7": "SEAT",
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
  "src/engine/v7/setup.ts::validateMatchSetupV7": "SEAT",
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
  "src/render/dinosaur-presentation-v7.ts::matchHasDinosaurV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::dinosaurLabel": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::bigBodyRolesV7": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::bigBodySlots": "SEAT",
  "src/render/dinosaur-presentation-v7.ts::chargeRunUpBonusV7": "SEAT",
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
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#help": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#recruitHelp": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#leaderboard": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#reward": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#dispatch": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#layEggCards": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#layEggPickPanel": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#decorateHatchButton":
    "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#dwarfActionButtons":
    "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#viewerFaction": "SEAT",
  // The campaign screens (pulp_wars-68k.5) read the factions of a mission's
  // seats and of the unlock table; no unit is involved.
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#campaignList": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#briefing": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#factionEmblem": "SEAT",
  "src/render/dom/app-view-v7.ts::Ruleset7DomAppView.#missionResults": "SEAT",
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
  "src/render/goblin-presentation-v7.ts::goblinFieldDefenseBlockedV7": "SEAT",
  "src/render/goblin-presentation-v7.ts::roleLabel": "SEAT",
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
  "src/render/candy-presentation-v7.ts::rebakeUnavailableTextV7": "SEAT",
  "src/render/candy-presentation-v7.ts::candyFieldDefenseBlockedV7": "SEAT",
  "src/render/candy-presentation-v7.ts::candyRoleUnlockTextV7": "SEAT",
  "src/render/candy-presentation-v7.ts::candyRecruitNotesV7": "SEAT",
  // A `sugarRush` entry and a Rush perk follow the unit's kind (`kindOf`);
  // a Crumbs owner is a Candy seat.
  "src/engine/v7/state-schema.ts::candyListsValid": "KIND",
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
