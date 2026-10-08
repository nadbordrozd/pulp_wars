/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 5.2): the
 * class of every reader of a unit list (`<expression>.units`) in `src`,
 * keyed by file and enclosing function. `BOARD`: the reader means what
 * stands on the board (combat, targeting, movement, occupancy, siege, the
 * view's `units`, previews, the Start Turn steps, Muster, the UI, and the
 * Normal AI, which reads mounds only through the view's `burrowed` list).
 * `ALL`: the reader means everything a player owns, burrowed units included
 * (capacity and used slots, orphaning and elimination on a capture, the
 * status lists and their pruning, the Chill countdown, the leaderboard and
 * headless metrics, state parsing and entity IDs); such a function reads the
 * `burrowed` list or `allOwnedUnitsV7`.
 * `tests/unit/ruleset-v7-dwarf-unit-readers.test.ts` fails when a reader
 * appears without a class or a class names no reader.
 */
export const UNIT_READER_CLASSES_V7: Readonly<Record<string, "BOARD" | "ALL">> =
  {
    "src/ai/v7-campaign.ts::campaignPlanForPolicyV7": "BOARD",
    // `pulp_wars-68k.6`: the siege of a single-file front reads the board:
    // who stands on the corridor, the apron, the yard, and the mouth. A
    // burrowed unit stands on none of them and takes no command.
    "src/ai/v7-chokepoint.ts::chokepointApronJammedV7": "BOARD",
    "src/ai/v7-chokepoint.ts::chokepointColumnBeyondV7": "BOARD",
    "src/ai/v7-chokepoint.ts::chokepointOwnUnitAtV7": "BOARD",
    "src/ai/v7-chokepoint.ts::chokepointPlanForPolicyV7": "BOARD",
    "src/ai/v7-chokepoint.ts::chokepointReplacementStagedV7": "BOARD",
    "src/ai/v7-chokepoint.ts::chokepointSiegeStagedV7": "BOARD",
    "src/ai/v7-chokepoint.ts::chokepointYardFullV7": "BOARD",
    "src/ai/v7.ts::chokepointClaimedSlotsV7": "BOARD",
    "src/ai/v7.ts::chokepointSiegeShortfallV7": "BOARD",
    "src/ai/v7.ts::chokepointSlotV7": "BOARD",
    // Bead pulp_wars-ic8: the Gallery's demo board, a fresh authored
    // state on which nothing is burrowed before its cue plays.
    "src/render/gallery-demo-v7.ts::buildGalleryDemoSceneV7": "BOARD",
    "src/render/gallery-demo-v7.ts::wounded": "BOARD",
    // Bead pulp_wars-2yc.29: the feedback animations read the view's units
    // for what the board draws: the "yet to move" cue, the Promotion marker
    // over a unit's head, and the tile of a kill or a refund. A burrowed
    // unit is not drawn (its mound is), takes no command, and is neither
    // promoted nor disbanded while underground.
    "src/render/canvas/feedback-host-v7.ts::BoardFeedbackV7.boardFrame":
      "BOARD",
    "src/render/canvas/feedback-host-v7.ts::BoardFeedbackV7.wantsAmbientFrames":
      "BOARD",
    "src/render/canvas/unit-turn-state-v7.ts::unitTurnStatesV7": "BOARD",
    "src/render/feedback-plan-v7.ts::feedbackPlanV7": "BOARD",
    "src/render/feedback-plan-v7.ts::promotionReadyUnitIdsV7": "BOARD",
    // Bead pulp_wars-2yc.39 (classified by pulp_wars-2yc.40): the
    // first-steps coach reads the view's units for the unit a marker stands
    // over and for the units that still have a Move the engine offers. A
    // burrowed unit is not drawn and is offered no Move or Capture, so the
    // coach has nothing to point at underground.
    "src/render/first-steps-v7.ts::chooseFirstStepV7": "BOARD",
    // Bead pulp_wars-2yc.10 (classified by pulp_wars-2yp): the boundary
    // sounds read the views' units only to ask whether a promoted unit is
    // the viewer's (`UNIT_PROMOTED`, the level-up sound). A unit is promoted
    // by the Promote command or by claiming a Shrine, both of which take a
    // unit standing on the board before and after; a burrowed unit takes no
    // command and steps on no tile, so it is never the subject. Deaths,
    // training and Tunnels are heard from events and presentation steps,
    // not from this list.
    "src/audio/sound-events-v7.ts::soundCuesForBoundaryV7": "BOARD",
    // `pulp_wars-737.4`: the curiosity policy reads the board: the visible
    // Monsters, the units that walk to a Fountain, a Shrine, or a Wreck, and
    // the units that defend a center (a burrowed unit takes no errand and
    // holds no center this turn).
    // `pulp_wars-jdb.4`: the Candy policy reads the board: the units a Rush
    // plan attacks or claims, the units on or beside Crumbs, the melee
    // attackers a Splat helps, the Toss targets, and the own army counts (a
    // Candy seat has no burrowed unit; a mound on Crumbs is read from the
    // view's `burrowed` list).
    "src/ai/v7-candy.ts::candyArmyCountsV7": "BOARD",
    "src/ai/v7-candy.ts::claimedRushTargetsV7": "BOARD",
    "src/ai/v7-candy.ts::fragileRebakeV7": "BOARD",
    "src/ai/v7-candy.ts::planSugarRushV7": "BOARD",
    "src/ai/v7-candy.ts::rebakeApproachValueV7": "BOARD",
    "src/ai/v7-candy.ts::rebakeScoreV7": "BOARD",
    "src/ai/v7-candy.ts::splatSavedHpV7": "BOARD",
    "src/ai/v7-candy.ts::sugarTossScoreV7": "BOARD",
    "src/ai/v7.ts::candyCacheV7": "BOARD",
    "src/ai/v7-curiosities.ts::curiosityFactsV7": "BOARD",
    "src/ai/v7-curiosities.ts::planCuriosityErrandsV7": "BOARD",
    "src/ai/v7-curiosities.ts::soleCityDefenderV7": "BOARD",
    "src/ai/v7-dinosaur.ts::chosenLayEggCommandsV7": "BOARD",
    "src/ai/v7-dinosaur.ts::dinosaurProductionAdjustmentV7": "BOARD",
    // `pulp_wars-68k.3`: the mission directives read the board. A burrowed
    // unit can take no command and stands in no zone this turn, so it is
    // neither leashed nor a garrison candidate; a Tunnel that would surface
    // a leashed Mole or rider outside the zone is removed by the leash (its
    // `to` and `rider.to` are relocations).
    "src/ai/v7-directives.ts::directivePlanForViewV7": "BOARD",
    "src/ai/v7-directives.ts::guardGarrisonV7": "BOARD",
    "src/ai/v7-directives.ts::leashReadyCommandsV7": "BOARD",
    // `pulp_wars-78i.4`: the Dwarf policy reads the board, and mounds only
    // through the view's `burrowed` list; the army counts include the own
    // burrowed units (they keep their slots and come back next turn).
    "src/ai/v7-dwarf.ts::dwarfArmyCountsV7": "ALL",
    "src/ai/v7-dwarf.ts::dwarfFactsV7": "BOARD",
    "src/ai/v7-dwarf.ts::dwarfTargetBonusV7": "BOARD",
    "src/ai/v7-dwarf.ts::engineerMoveValueV7": "BOARD",
    "src/ai/v7-dwarf.ts::expansionVillagesV7": "BOARD",
    "src/ai/v7-dwarf.ts::planAssemblesV7": "BOARD",
    "src/ai/v7-dwarf.ts::planTunnelsV7": "BOARD",
    "src/ai/v7-dwarf.ts::repairValueV7": "BOARD",
    "src/ai/v7-endgame.ts::endgamePlanForPolicyV7": "BOARD",
    "src/ai/v7-endgame.ts::routeDistances": "BOARD",
    "src/ai/v7-goblin.ts::explosionChainValueV7": "BOARD",
    "src/ai/v7-goblin.ts::gangUpForPolicyV7": "BOARD",
    "src/ai/v7-goblin.ts::hypotheticalBlastV7": "BOARD",
    "src/ai/v7-ice-folk.ts::bolasScoreV7": "BOARD",
    "src/ai/v7-ice-folk.ts::coldSnapScoreV7": "BOARD",
    "src/ai/v7-ice-folk.ts::iceFolkArmyCountsV7": "BOARD",
    "src/ai/v7-ice-folk.ts::iceFolkFactsV7": "BOARD",
    "src/ai/v7-ice-folk.ts::iceFolkResearchV7": "BOARD",
    "src/ai/v7-ice-folk.ts::iceFolkTargetBonusV7": "BOARD",
    "src/ai/v7-ice-folk.ts::witchMoveKeyV7": "BOARD",
    "src/ai/v7-martian.ts::beamDownPassengerIsGarrisonV7": "BOARD",
    "src/ai/v7-martian.ts::martianArmyCountsV7": "BOARD",
    "src/ai/v7-martian.ts::martianFactsV7": "BOARD",
    "src/ai/v7-martian.ts::martianResearchV7": "BOARD",
    "src/ai/v7-martian.ts::martianRetainedValueV7": "BOARD",
    "src/ai/v7-martian.ts::martianTargetBonusV7": "BOARD",
    // `pulp_wars-1wy.4`: the siege pull's setup reads the defender on a
    // center and the first tile of the pull (a mound there blocks the pull
    // itself; the engine then offers none).
    "src/ai/v7-martian.ts::pullCaptureMoveV7": "BOARD",
    "src/ai/v7-martian.ts::readyHostileBrainsV7": "BOARD",
    "src/ai/v7-opening.ts::surveyCapital": "BOARD",
    "src/ai/v7-undead.ts::healthyLivingNeighboursV7": "BOARD",
    "src/ai/v7-undead.ts::hostileNecromancersNearV7": "BOARD",
    "src/ai/v7-undead.ts::ownNecromancersNearV7": "BOARD",
    "src/ai/v7-undead.ts::plagueApplicationValueV7": "BOARD",
    "src/ai/v7-undead.ts::plagueSourceVictimsV7": "BOARD",
    "src/ai/v7-undead.ts::plaguedNeighboursV7": "BOARD",
    "src/ai/v7-undead.ts::plaguingLichesV7": "BOARD",
    "src/ai/v7-undead.ts::projectedWailSummaryV7": "BOARD",
    "src/ai/v7-undead.ts::publicTendValueV7": "BOARD",
    "src/ai/v7-undead.ts::raisableGravesAtV7": "BOARD",
    "src/ai/v7-undead.ts::summarizeWail": "BOARD",
    "src/ai/v7.ts::NormalPolicyWorkV7.constructor": "BOARD",
    "src/ai/v7.ts::afflictionMoveValueV7": "BOARD",
    "src/ai/v7.ts::bestKnightOverrunMoveSequenceSteps": "BOARD",
    "src/ai/v7.ts::bestKnightOverrunSequenceSteps": "BOARD",
    "src/ai/v7.ts::biteExposureCostV7": "BOARD",
    "src/ai/v7.ts::chargeAttackScoreV7": "BOARD",
    "src/ai/v7.ts::chargeExposureV7": "BOARD",
    "src/ai/v7.ts::combatStrategicValue": "BOARD",
    "src/ai/v7.ts::computeSavingsPlanV7": "BOARD",
    "src/ai/v7.ts::dinosaurBranchResearchV7": "BOARD",
    "src/ai/v7.ts::dinosaurFactsV7": "BOARD",
    "src/ai/v7.ts::dwarfAttackAdjustmentV7": "BOARD",
    "src/ai/v7.ts::dwarfMoveValueV7": "BOARD",
    "src/ai/v7.ts::endgameCapturersWaitingV7": "BOARD",
    "src/ai/v7.ts::endgameMoveValueV7": "BOARD",
    "src/ai/v7.ts::endgameRoutedUnitsV7": "BOARD",
    "src/ai/v7.ts::exploderSpacingLossV7": "BOARD",
    "src/ai/v7.ts::fallbackTie": "BOARD",
    "src/ai/v7.ts::freeCapacity": "BOARD",
    "src/ai/v7.ts::freshCapturerNextToV7": "BOARD",
    "src/ai/v7.ts::friendlySplashUnitV7": "BOARD",
    "src/ai/v7.ts::hasDurableScreen": "BOARD",
    "src/ai/v7.ts::hasReachableScreenAtV7": "BOARD",
    "src/ai/v7.ts::hasReplacementPathWorkV7": "BOARD",
    "src/ai/v7.ts::huntPlansV7": "BOARD",
    // Tuning 5 (`pulp_wars-w49.4`), army play: the army count, the units
    // next to a Move's tile, the hunted hostile units and the line in front
    // of a ranged unit are what stands on the board in the public view.
    "src/ai/v7-army.ts::armyCountsV7": "BOARD",
    "src/ai/v7.ts::armySupportedV7": "BOARD",
    "src/ai/v7.ts::armyHuntTargetsV7": "BOARD",
    "src/ai/v7.ts::armyScreenedV7": "BOARD",
    // Tuning 7 (`pulp_wars-w49.10`): the own units a bomb would splash,
    // the unit that strikes on arrival beside a slow one, and the units a
    // WAAAGH! would reach are what stands on the board in the public view.
    // The Goblin pass, correction (`pulp_wars-w49.12`): the splash is
    // weighed in its own function.
    "src/ai/v7.ts::armyBombSplashAcceptedV7": "BOARD",
    "src/ai/v7.ts::armyStrikerNearV7": "BOARD",
    "src/ai/v7.ts::waaaghUsefulV7": "BOARD",
    // Tuning 8 (`pulp_wars-w49.11`): the units that storm or cover a
    // hostile center, the own units an attack would free a shot for, and
    // the unit standing beside a threatened center are what stands on the
    // board in the public view.
    "src/ai/v7.ts::armyStormV7": "BOARD",
    "src/ai/v7.ts::armyAttackValueV7": "BOARD",
    "src/ai/v7.ts::armyBesideCenterWorthV7": "BOARD",
    // The Martian pass's correction (`pulp_wars-w49.14`): the Projector by
    // a center, and the capturers and enemies around a free village.
    "src/ai/v7.ts::armyHelplessGarrisonV7": "BOARD",
    "src/ai/v7.ts::armyVillageFerryV7": "BOARD",
    "src/ai/v7.ts::armyVillageDeliveryV7": "BOARD",
    // Tuning 8, correction pass: the hostile unit at a city's gates, the
    // own units near a weak garrison or a battery, and the units beside a
    // bomber's end tile are what stands on the board in the public view.
    "src/ai/v7.ts::armyAtTheGatesV7": "BOARD",
    "src/ai/v7.ts::armyWeakGarrisonV7": "BOARD",
    "src/ai/v7.ts::armyCenterDeadlyV7": "BOARD",
    "src/ai/v7.ts::armyBomberCrowdV7": "BOARD",
    // Tuning 6 (`pulp_wars-w49.6`): the own units weighed against a hostile
    // position, the own units near a lone unit, and the friend it walks back
    // to are what stands on the board in the public view.
    "src/ai/v7.ts::armyAssaultV7": "BOARD",
    "src/ai/v7.ts::armyAloneV7": "BOARD",
    "src/ai/v7.ts::armyNearestFriendV7": "BOARD",
    "src/ai/v7.ts::iceFolkAttackAdjustmentV7": "BOARD",
    "src/ai/v7.ts::iceFolkWoundedAtHomeV7": "BOARD",
    "src/ai/v7.ts::isPolicyCandidate": "BOARD",
    "src/ai/v7.ts::knightOverrunLeafValue": "BOARD",
    "src/ai/v7.ts::livingTrainingAdjustmentsV7": "BOARD",
    "src/ai/v7.ts::makeContext": "BOARD",
    "src/ai/v7.ts::mandatoryWorkDeltaV7": "BOARD",
    "src/ai/v7.ts::martianBeamDownScoreV7": "BOARD",
    "src/ai/v7.ts::martianCapturerCanEnterV7": "BOARD",
    // `pulp_wars-1wy.4`: a carrier extracts the units on the board (a
    // burrowed unit is no passenger).
    "src/ai/v7.ts::martianRescueUnitsV7": "BOARD",
    "src/ai/v7.ts::martianConvertibleAfterV7": "BOARD",
    "src/ai/v7.ts::martianMoveValueV7": "BOARD",
    "src/ai/v7.ts::martianProjectedKillersV7": "BOARD",
    "src/ai/v7.ts::martianSoleDefenderBesideV7": "BOARD",
    "src/ai/v7.ts::navalPlanWorkV7": "BOARD",
    "src/ai/v7.ts::nextNavalTechnologyV7": "BOARD",
    "src/ai/v7.ts::plunderResearchValueV7": "BOARD",
    "src/ai/v7.ts::policyLookupWorkV7": "BOARD",
    "src/ai/v7.ts::preferredReward": "BOARD",
    "src/ai/v7.ts::projectKnightOverrunAttack": "BOARD",
    "src/ai/v7.ts::projectPublicUnitForPolicyV7": "BOARD",
    "src/ai/v7.ts::publicKnightOverrunAttacksSteps": "BOARD",
    "src/ai/v7.ts::publicSplashDangerV7": "BOARD",
    "src/ai/v7.ts::publicThreatLookupWorkV7": "BOARD",
    "src/ai/v7.ts::researchValue": "BOARD",
    "src/ai/v7.ts::scoreCommandWithContext": "BOARD",
    "src/ai/v7.ts::screenValue": "BOARD",
    "src/ai/v7.ts::sharedCityContextWorkV7": "BOARD",
    "src/ai/v7.ts::tacticalPlanWorkV7": "BOARD",
    "src/ai/v7.ts::targetStrategicValue": "BOARD",
    "src/ai/v7.ts::undeadFrenzyValueV7": "BOARD",
    "src/ai/v7.ts::undeadMoveValueV7": "BOARD",
    "src/ai/v7.ts::undeadTrainingAdjustmentsV7": "BOARD",
    "src/ai/v7.ts::unitForCommand": "BOARD",
    // The Undead pass, correction (`pulp_wars-w49.13`): the own Liches on
    // the board (Pestilence), the unit beside a center that takes it, the
    // own units that tend, and a Zombie's company.
    "src/ai/v7.ts::armyResearchTargetV7": "BOARD",
    "src/ai/v7.ts::armySwapsOutV7": "BOARD",
    "src/ai/v7.ts::armyCureDueV7": "BOARD",
    // The Dinosaur pass (`pulp_wars-w49.15`): the own units and Eggs on
    // the board of a Dinosaur seat, which has no burrowed unit.
    "src/ai/v7.ts::armyDinosaurCrowdedV7": "BOARD",
    // The correction of the Dinosaur pass: the dinosaurs and Cavemen near
    // a target, and the target of an attack, stand on the board.
    "src/ai/v7.ts::armyChargeSupportedV7": "BOARD",
    "src/ai/v7.ts::armyWallbreakerDueV7": "BOARD",
    "src/ai/v7-dinosaur.ts::packHuntForPolicyV7": "BOARD",
    "src/engine/v7/reducer.ts::huntedAfterAttackV7": "BOARD",
    "src/ai/v7.ts::armyZombieAloneV7": "BOARD",
    // Step two of the Goblin pass (`pulp_wars-w49.23`): the own units
    // beside a target, and the company of a Goblin that goes into contact,
    // stand on the board.
    "src/ai/v7.ts::armyGoblinAloneV7": "BOARD",
    // Step two of the Undead pass (`pulp_wars-w49.24`): the own land units
    // an Undead seat fields, and its Necromancer, stand on the board (an
    // Undead seat has no burrowed unit).
    "src/ai/v7.ts::armyUndeadShortOfUnitsV7": "BOARD",
    "src/ai/v7.ts::armyNecromancerDueV7": "BOARD",
    // Step two of the Martian pass (`pulp_wars-w49.25`): the viewer's own
    // ray unit where it stands on the board (a ray is fired in land form).
    "src/ai/v7.ts::movedRayAttack2V7": "BOARD",
    "src/ai/v7.ts::goblinContactCompanyV7": "BOARD",
    "src/ai/v7.ts::goblinMobHuntV7": "BOARD",
    "src/ai/v7.ts::vampireAttackAcceptableV7": "BOARD",
    // The Undead pass (`pulp_wars-w49.13`): the free tiles a Vampire flies to.
    "src/ai/v7.ts::vampireEscapeTileV7": "BOARD",
    "src/ai/v7.ts::vampireStrikesFromV7": "BOARD",
    // (Tuning 7: `visibleImmediateDamage` is the cached entry to it.)
    "src/ai/v7.ts::computeVisibleImmediateDamage": "BOARD",
    "src/ai/v7.ts::waaaghValueV7": "BOARD",
    "src/ai/v7.ts::warTrainingFirstV7": "BOARD",
    "src/engine/v7/achievements.ts::revision21AchievementCountsV7": "BOARD",
    "src/engine/v7/combat.ts::calculateCombatPreviewV7": "BOARD",
    "src/engine/v7/combat.ts::requireUnit": "BOARD",
    // `pulp_wars-737.2`: the Fountain heals a unit standing on its tile and
    // a Shrine promotes the unit that just moved onto it (map curiosities).
    // `pulp_wars-737.3`: the Giant Spider's provokers, its pruned and
    // recorded provocation lists, and its targets are units on the board (a
    // burrowed unit is out of its reach and off its list).
    "src/engine/v7/curiosities.ts::monsterProvokersV7": "BOARD",
    "src/engine/v7/curiosities.ts::prunedMonstersV7": "BOARD",
    "src/engine/v7/curiosities.ts::resolveCuriosityClaimV7": "BOARD",
    "src/engine/v7/curiosities.ts::resolveFountainHealingV7": "BOARD",
    "src/engine/v7/curiosities.ts::withMonsterProvocationsV7": "BOARD",
    "src/engine/v7/dwarf-reducer.ts::applyAssembleV7": "BOARD",
    "src/engine/v7/dwarf-reducer.ts::applyBombRunV7": "BOARD",
    "src/engine/v7/dwarf-reducer.ts::applyTunnelV7": "BOARD",
    "src/engine/v7/dwarf-reducer.ts::prunedDwarfV7": "BOARD",
    "src/engine/v7/dwarf-reducer.ts::resolveStartTurnSurfacingV7": "BOARD",
    "src/engine/v7/economy.ts::isActivePortV7": "BOARD",
    "src/engine/v7/economy.ts::isCityBesiegedV7": "BOARD",
    "src/engine/v7/economy.ts::networkFactsSignatureV7": "BOARD",
    "src/engine/v7/economy.ts::recomputeLiveEconomyV7": "BOARD",
    "src/engine/v7/economy.ts::resolveRegenerationV7": "BOARD",
    "src/engine/v7/economy.ts::resolveWindmillHealingV7": "BOARD",
    "src/engine/v7/economy.ts::startTurnEconomyV7": "BOARD",
    "src/engine/v7/eggs.ts::hatchEggV7": "BOARD",
    "src/engine/v7/eggs.ts::prunedEggsV7": "BOARD",
    "src/engine/v7/eggs.ts::resolveStartTurnHatchV7": "BOARD",
    "src/engine/v7/event-projection.ts::eventVisible": "BOARD",
    "src/engine/v7/event-projection.ts::projectEventPayload": "BOARD",
    "src/engine/v7/event-projection.ts::projectEventsV7": "BOARD",
    "src/engine/v7/event-projection.ts::visibility": "BOARD",
    "src/engine/v7/explosions.ts::resolveExplosionChainV7": "BOARD",
    "src/engine/v7/explosions.ts::resolveStateExplosionChainV7": "BOARD",
    "src/engine/v7/ice-folk.ts::resolveColdAuraV7": "BOARD",
    "src/engine/v7/ice-folk.ts::winterV7": "BOARD",
    "src/engine/v7/map.ts::initialMapStateFromV7": "BOARD",
    "src/engine/v7/map.ts::showcaseInitialStateV7": "BOARD",
    // `pulp_wars-68k.2`: the mission builder reads a definition's starting
    // units, which all stand on the board (nothing starts burrowed).
    "src/engine/v7/missions/build.ts::buildMissionStateV7": "BOARD",
    // Tuning 4 (`pulp_wars-w49.3`): the authored unit lists of the two sides
    // of `LAB_LATE`, on a board where nothing is burrowed.
    "src/engine/v7/missions/lab-human.ts::<module>": "BOARD",
    "src/engine/v7/missions/build.ts::validateMissionDefinitionV7": "BOARD",
    "src/engine/v7/martian.ts::coolingStepV7": "BOARD",
    "src/engine/v7/martian.ts::mindControlCooldownStepV7": "BOARD",
    // `pulp_wars-1wy.3`: the per-turn Martian lists name units on the board
    // (a beamed passenger and a pulling Mothership stand on it; neither can
    // burrow in the same turn).
    "src/engine/v7/martian.ts::prunedMartianTurnListsV7": "BOARD",
    "src/engine/v7/martian.ts::rechargeShieldsV7": "BOARD",
    "src/engine/v7/movement.ts::inHostileZoc": "BOARD",
    "src/engine/v7/movement.ts::publicHostileZoc": "BOARD",
    "src/engine/v7/movement.ts::publicMovementContextV7": "BOARD",
    "src/engine/v7/movement.ts::reachableMovementPathsV7": "BOARD",
    "src/engine/v7/movement.ts::validateMovementPathWithOptionsV7": "BOARD",
    "src/engine/v7/observation.ts::detectionCoversCoordV7": "BOARD",
    "src/engine/v7/observation.ts::visibleUnitIdsV7": "BOARD",
    "src/engine/v7/observation.ts::withUnitAtForObservationV7": "BOARD",
    "src/engine/v7/plague.ts::resolveStartTurnPlagueV7": "BOARD",
    "src/engine/v7/query.ts::IncrementalPublicCommandWorkV7.advance": "BOARD",
    "src/engine/v7/query.ts::IncrementalPublicRedevelopmentPossibilityWorkV7.advanceOne":
      "BOARD",
    "src/engine/v7/query.ts::IncrementalPublicRedevelopmentPossibilityWorkV7.constructor":
      "BOARD",
    "src/engine/v7/query.ts::appendPublicCityCommandsV7": "ALL",
    // Tuning 3 (`pulp_wars-w49.3`): the Market tile's occupant is a board
    // read; the city's used slots count every own unit.
    "src/engine/v7/query.ts::appendPublicHireCommandsV7": "ALL",
    // Tuning 3: a blast hits what stands on the board.
    "src/engine/v7/query.ts::previewBlastMountainV7": "BOARD",
    "src/engine/v7/query.ts::appendPublicUnitCommandsV7": "BOARD",
    "src/engine/v7/query.ts::createPublicChainSimulationV7": "BOARD",
    "src/engine/v7/query.ts::createPublicPlanningFactKeyWorkV7": "BOARD",
    "src/engine/v7/query.ts::estimateCombatV7": "BOARD",
    "src/engine/v7/query.ts::graphAfterTileCommandV7": "BOARD",
    "src/engine/v7/query.ts::offeredGraveActor": "BOARD",
    "src/engine/v7/query.ts::previewAssembleV7": "BOARD",
    "src/engine/v7/query.ts::previewBeamDownV7": "BOARD",
    "src/engine/v7/query.ts::previewBombRunV7": "BOARD",
    "src/engine/v7/query.ts::previewColdSnapV7": "BOARD",
    "src/engine/v7/query.ts::previewDisbandV7": "BOARD",
    "src/engine/v7/query.ts::previewHatchV7": "BOARD",
    "src/engine/v7/query.ts::previewKaboomV7": "BOARD",
    "src/engine/v7/query.ts::previewMindControlV7": "BOARD",
    // The naval branch (`pulp_wars-5ti.2`): Board reads ships on the board
    // (a burrowed unit is never afloat).
    "src/engine/v7/query.ts::previewBoardV7": "BOARD",
    "src/engine/v7/query.ts::publicBoardTargetsV7": "BOARD",
    "src/engine/v7/reducer.ts::applyBoard": "BOARD",
    "src/engine/v7/query.ts::previewMonsterV7": "BOARD",
    "src/engine/v7/query.ts::previewTendWoundedV7": "BOARD",
    "src/engine/v7/query.ts::previewTractorBeamV7": "BOARD",
    "src/engine/v7/query.ts::previewTunnelV7": "BOARD",
    "src/engine/v7/query.ts::previewWailV7": "BOARD",
    "src/engine/v7/query.ts::publicActiveOwnedPort": "BOARD",
    "src/engine/v7/query.ts::publicAttackChainV7": "BOARD",
    "src/engine/v7/query.ts::publicBeamDownPassengersV7": "BOARD",
    "src/engine/v7/query.ts::publicBolasTargetsV7": "BOARD",
    "src/engine/v7/query.ts::publicBombTargetsV7": "BOARD",
    "src/engine/v7/query.ts::publicCaptureTarget": "BOARD",
    "src/engine/v7/query.ts::publicCityBesieged": "BOARD",
    "src/engine/v7/query.ts::publicCombatPreview": "BOARD",
    "src/engine/v7/query.ts::publicCombatPreviewCore": "BOARD",
    "src/engine/v7/query.ts::publicCommandTarget": "BOARD",
    "src/engine/v7/query.ts::publicDetectionCovers": "BOARD",
    "src/engine/v7/query.ts::publicHatchTargetsV7": "BOARD",
    "src/engine/v7/query.ts::publicLandingThreatV7": "BOARD",
    "src/engine/v7/query.ts::publicMindControlTargetsV7": "BOARD",
    "src/engine/v7/query.ts::publicTendTargetsV7": "BOARD",
    "src/engine/v7/query.ts::publicTileCommandLegal": "BOARD",
    "src/engine/v7/query.ts::publicTractorBeamTargetsV7": "BOARD",
    "src/engine/v7/query.ts::publicTunnelCommandsV7": "BOARD",
    "src/engine/v7/query.ts::publicWitchesV7": "BOARD",
    // Idle recovery: a burrowed unit has moved and never recovers idle.
    "src/engine/v7/query.ts::queryIdleRecoveryV7": "BOARD",
    "src/engine/v7/query.ts::queryAssembleUnavailableReasonV7": "BOARD",
    "src/engine/v7/query.ts::queryCombatPreviewV7": "BOARD",
    "src/engine/v7/query.ts::queryLandingPreviewV7": "BOARD",
    "src/engine/v7/query.ts::queryPublicSelectionV7": "BOARD",
    "src/engine/v7/query.ts::queryThreatenedTilesV7": "BOARD",
    // `pulp_wars-1wy.3`: the path of a pull, between two units on the board.
    "src/engine/v7/query.ts::queryTractorBeamPathV7": "BOARD",
    "src/engine/v7/query.ts::queryUnitStatsV7": "BOARD",
    "src/engine/v7/reducer.ts::applyAttack": "BOARD",
    "src/engine/v7/reducer.ts::applyBeamDown": "BOARD",
    "src/engine/v7/reducer.ts::applyCapture": "ALL",
    "src/engine/v7/reducer.ts::applyColdSnap": "BOARD",
    "src/engine/v7/reducer.ts::applyCommandCoreV7": "BOARD",
    "src/engine/v7/reducer.ts::applyDevour": "BOARD",
    "src/engine/v7/reducer.ts::applyDisband": "BOARD",
    "src/engine/v7/reducer.ts::applyDisembark": "BOARD",
    "src/engine/v7/reducer.ts::applyEndTurn": "BOARD",
    "src/engine/v7/reducer.ts::applyHatch": "BOARD",
    "src/engine/v7/reducer.ts::applyInfrastructure": "BOARD",
    // Tuning 3: the unit next to the charge, the units the blast hits, and
    // the occupant of a Market tile stand on the board (the used slots of a
    // hire go through `assignedUnitCountV7`).
    "src/engine/v7/reducer.ts::blastPlaceV7": "BOARD",
    "src/engine/v7/reducer.ts::applyBlastMountain": "BOARD",
    "src/engine/v7/reducer.ts::applyHire": "BOARD",
    // Tuning 4: the drilled unit stands on a city center.
    "src/engine/v7/reducer.ts::applyKaboom": "BOARD",
    "src/engine/v7/reducer.ts::applyLayEgg": "BOARD",
    "src/engine/v7/reducer.ts::applyMindControl": "BOARD",
    "src/engine/v7/reducer.ts::applyMove": "BOARD",
    "src/engine/v7/reducer.ts::applyPillage": "BOARD",
    "src/engine/v7/reducer.ts::applyPromote": "BOARD",
    "src/engine/v7/reducer.ts::applyRaiseDead": "BOARD",
    "src/engine/v7/reducer.ts::applyRally": "BOARD",
    "src/engine/v7/reducer.ts::applyRecover": "BOARD",
    "src/engine/v7/reducer.ts::applyReward": "BOARD",
    "src/engine/v7/reducer.ts::applyTendWounded": "BOARD",
    "src/engine/v7/reducer.ts::applyThrowBolas": "BOARD",
    "src/engine/v7/reducer.ts::applyTractorBeam": "BOARD",
    "src/engine/v7/reducer.ts::applyTrain": "BOARD",
    "src/engine/v7/reducer.ts::applyTrainNaval": "BOARD",
    "src/engine/v7/reducer.ts::applyWail": "BOARD",
    "src/engine/v7/reducer.ts::applyWait": "BOARD",
    "src/engine/v7/reducer.ts::evaluateAchievementsV7": "BOARD",
    "src/engine/v7/reducer.ts::graveActionTail": "BOARD",
    "src/engine/v7/reducer.ts::recoverIdleUnits": "BOARD",
    "src/engine/v7/reducer.ts::resolveAttackExchangeV7": "BOARD",
    "src/engine/v7/reducer.ts::resolveNeutralTurnV7": "BOARD",
    "src/engine/v7/reducer.ts::resetTurnUnits": "BOARD",
    "src/engine/v7/reducer.ts::resolveCityCenterSpawnV7": "BOARD",
    // `pulp_wars-5ti.3`: the death-blast chain of a Start Turn step (the
    // Plague and the ice crush share it) reads who stands on the board.
    "src/engine/v7/reducer.ts::withDeathBlastChainV7": "BOARD",
    // The Mind Control revision: a released unit reveals its sight where it
    // stands on the board (a burrowed one reveals nothing).
    "src/engine/v7/reducer.ts::revealReleasedUnitsV7": "BOARD",
    "src/engine/v7/reducer.ts::validateUnitActor": "BOARD",
    "src/engine/v7/state-schema.ts::parseGameStateV7": "ALL",
    "src/engine/v7/state-schema.ts::validateCrossReferences": "ALL",
    "src/engine/v7/units.ts::allOwnedUnitsV7": "ALL",
    "src/engine/v7/units.ts::boardUnitsV7": "BOARD",
    "src/engine/v7/units.ts::tileOccupiedV7": "BOARD",
    "src/engine/v7/view.ts::achievementProgressV7": "BOARD",
    "src/engine/v7/view.ts::viewForV7": "ALL",
    "src/engine/v7/wail.ts::publicWailTargetsV7": "BOARD",
    "src/engine/v7/wail.ts::wailTargetsV7": "BOARD",
    "src/headless/ice-folk-telemetry-v7.ts::recordCombat": "BOARD",
    "src/headless/ice-folk-telemetry-v7.ts::recordIceFolkV7": "BOARD",
    // `pulp_wars-1wy.2`: the Martian mobility probe is a policy; like the
    // Normal AI it reads the board for targets, passengers, pulls, and
    // commands, and the hostile mounds through the view's `burrowed` list
    // (`hostilePresence`, and the Dwarf danger of `probeDangerV7`). Its
    // match runner looks up the unit of a `UNIT_DIED` event through
    // `allOwnedUnitsV7` (a unit that dies in its mound is a kill or a loss,
    // so it reads no unit list itself); the carriers it counts are the ones
    // on the board.
    "src/headless/martian-mobility-probe-match-v7.ts::carriersOnBoardV7":
      "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::chooseMartianMobilityProbeCommandV7":
      "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::hostileUnits": "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::ownUnits": "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::probeBestPullV7": "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::probeDeliverV7": "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::probeExtractV7": "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::probeMindControlV7": "BOARD",
    "src/headless/martian-mobility-probe-v7.ts::probeStepOnCenterV7": "BOARD",
    "src/headless/v7.ts::auditRelationshipCommandV7": "BOARD",
    "src/headless/v7.ts::cityIsBesieged": "BOARD",
    "src/headless/v7.ts::recordCommandAndEventsV7": "BOARD",
    "src/headless/v7.ts::recordEventsV7": "ALL",
    "src/headless/v7.ts::recordMartianV7": "BOARD",
    "src/headless/v7.ts::recordSnapshotV7": "BOARD",
    // Map curiosities UI (`pulp_wars-737.6`): the Spider's area and reach,
    // its dock lines and the log lines read what stands on the board (the
    // view's `units`; a burrowed unit is never a visible provoker).
    "src/render/canvas/curiosity-canvas-v7.ts::addCuriosityEntriesV7": "BOARD",
    "src/render/curiosity-presentation-v7.ts::curiosityBoundaryNoticeV7":
      "BOARD",
    "src/render/curiosity-presentation-v7.ts::monsterInfoLinesV7": "BOARD",
    // The naval branch interface (`pulp_wars-5ti.7`): Board's prizes and
    // reasons, the Submarine's reason, the ram's shove and the boarding
    // notice read the ships on the board (a ship never burrows).
    "src/render/canvas/naval-board-plan-v7.ts::navalPickTargetsV7": "BOARD",
    "src/render/canvas/naval-board-plan-v7.ts::addNavalPickEntriesV7": "BOARD",
    "src/render/canvas/naval-board-plan-v7.ts::addSubmergedReasonEntriesV7":
      "BOARD",
    "src/render/naval-presentation-v7.ts::boardUnavailableTextV7": "BOARD",
    "src/render/naval-presentation-v7.ts::navalCombatLinesV7": "BOARD",
    "src/render/naval-presentation-v7.ts::navalBoundaryNoticeV7": "BOARD",
    // The frozen sea interface (`pulp_wars-5ti.7`): Freeze's unit and the
    // ships it locks in, the slide of a Move, and the frozen-sea notices
    // read what stands on the board (nothing burrows under ice or water).
    "src/render/canvas/frozen-sea-board-plan-v7.ts::freezePickTargetsV7":
      "BOARD",
    "src/render/canvas/frozen-sea-board-plan-v7.ts::addIceboundPreviewEntries":
      "BOARD",
    "src/render/canvas/frozen-sea-board-plan-v7.ts::addFreezeRingEntriesV7":
      "BOARD",
    "src/render/canvas/frozen-sea-board-plan-v7.ts::moveOnIceV7": "BOARD",
    "src/render/frozen-sea-presentation-v7.ts::frozenSeaBoundaryNoticeV7":
      "BOARD",
    "src/render/canvas/board-host-v7.ts::<module>": "BOARD",
    "src/render/canvas/board-host-v7.ts::CanvasBoardHostV7.pinIceFolkFeedback":
      "BOARD",
    "src/render/canvas/board-host-v7.ts::CanvasBoardHostV7.presentBoundary":
      "BOARD",
    "src/render/canvas/board-host-v7.ts::CanvasBoardHostV7.update": "BOARD",
    "src/render/canvas/board-renderer-v7.ts::addAbilityPreviews": "BOARD",
    "src/render/canvas/board-renderer-v7.ts::addKaboomPreview": "BOARD",
    "src/render/canvas/board-renderer-v7.ts::buildBoardRenderPlanV7": "BOARD",
    "src/render/canvas/board-renderer-v7.ts::commandMapTargets": "BOARD",
    "src/render/canvas/board-renderer-v7.ts::landingAfterMoveTargets": "BOARD",
    "src/render/canvas/board-renderer-v7.ts::selectionCoord": "BOARD",
    // The Dwarf UI (pulp_wars-78i.6) reads the board; mounds only through
    // the view's `burrowed` list.
    "src/render/canvas/dwarf-board-plan-v7.ts::addDwarfPickEntriesV7": "BOARD",
    "src/render/canvas/dwarf-board-plan-v7.ts::dwarfPickTargetsV7": "BOARD",
    "src/render/canvas/ice-folk-board-plan-v7.ts::addIceFolkPickEntriesV7":
      "BOARD",
    "src/render/canvas/ice-folk-board-plan-v7.ts::iceFolkPickTargetsV7":
      "BOARD",
    "src/render/canvas/ice-folk-board-plan-v7.ts::selectedWitchV7": "BOARD",
    // `pulp_wars-1wy.5`: the Glide tiles of an offered Move (the mover is
    // on the board; a burrowed unit is offered no Move).
    "src/render/canvas/ice-folk-board-plan-v7.ts::glideStepsV7": "BOARD",
    "src/render/canvas/ice-folk-board-plan-v7.ts::moveIsGlideV7": "BOARD",
    "src/render/canvas/martian-board-plan-v7.ts::addMartianPickEntriesV7":
      "BOARD",
    "src/render/canvas/martian-board-plan-v7.ts::addMartianSelectionEntriesV7":
      "BOARD",
    "src/render/canvas/martian-board-plan-v7.ts::martianAttackTargetExtrasV7":
      "BOARD",
    "src/render/canvas/martian-board-plan-v7.ts::martianMoveLabelV7": "BOARD",
    "src/render/canvas/martian-board-plan-v7.ts::martianPickTargetsV7": "BOARD",
    "src/render/canvas/presentation-plan-v7.ts::corePresentationPlanV7":
      "BOARD",
    "src/render/dinosaur-presentation-v7.ts::chargePreviewLinesV7": "BOARD",
    "src/render/dinosaur-presentation-v7.ts::dinosaurBoundaryNoticeV7": "BOARD",
    "src/render/dinosaur-presentation-v7.ts::dinosaurFieldDefenseBlockedV7":
      "BOARD",
    "src/render/dinosaur-presentation-v7.ts::hatchBlockedEggsV7": "BOARD",
    "src/render/dom/app-view-v7.ts::<module>": "BOARD",
    "src/render/dwarf-presentation-v7.ts::dwarfBoundaryNoticeV7": "BOARD",
    "src/render/dwarf-presentation-v7.ts::dwarfCombatLinesV7": "BOARD",
    "src/render/dwarf-presentation-v7.ts::dwarfFieldDefenseBlockedV7": "BOARD",
    "src/render/dwarf-presentation-v7.ts::tunnelDestinationNameV7": "BOARD",
    // `pulp_wars-78i.9`: the Tunnel's riders, landing and outcome read the
    // board (a burrowed Hammerer is never a passenger or a landmark).
    "src/render/dwarf-tunnel-v7.ts::tunnelAutoLandingV7": "BOARD",
    "src/render/dwarf-tunnel-v7.ts::tunnelOutcomeV7": "BOARD",
    "src/render/dwarf-tunnel-v7.ts::tunnelRidersV7": "BOARD",
    "src/render/dom/app-view-v7.ts::cityIncomeForViewerV7": "BOARD",
    "src/render/goblin-presentation-v7.ts::blastPreviewPresentationV7": "BOARD",
    "src/render/goblin-presentation-v7.ts::goblinAttackPreviewTextV7": "BOARD",
    "src/render/goblin-presentation-v7.ts::goblinBoundaryNoticeV7": "BOARD",
    "src/render/goblin-presentation-v7.ts::goblinFieldDefenseBlockedV7":
      "BOARD",
    "src/render/goblin-presentation-v7.ts::splashEntryFriendlyV7": "BOARD",
    "src/render/ice-folk-presentation-v7.ts::bolasPreviewLinesV7": "BOARD",
    "src/render/ice-folk-presentation-v7.ts::iceFolkBoundaryNoticeV7": "BOARD",
    "src/render/ice-folk-presentation-v7.ts::iceFolkCombatLinesV7": "BOARD",
    "src/render/ice-folk-presentation-v7.ts::iceFolkFieldDefenseBlockedV7":
      "BOARD",
    "src/render/ice-folk-presentation-v7.ts::shatterThresholdAgainstV7":
      "BOARD",
    "src/render/martian-presentation-v7.ts::beamDownUnavailableTextV7": "BOARD",
    "src/render/martian-presentation-v7.ts::martianBoundaryNoticeV7": "BOARD",
    "src/render/martian-presentation-v7.ts::martianCombatLinesV7": "BOARD",
    "src/render/martian-presentation-v7.ts::martianFieldDefenseBlockedV7":
      "BOARD",
    // `pulp_wars-1wy.5`: why a puller on the board has no Tractor Beam.
    "src/render/martian-presentation-v7.ts::tractorBeamUnavailableTextV7":
      "BOARD",
    "src/render/tactical-presentation-v7.ts::tacticalAttachmentsV7": "BOARD",
    "src/render/undead-presentation-v7.ts::combatPreviewSemanticNoteV7":
      "BOARD",
    "src/render/undead-presentation-v7.ts::disbandBlockedByAfflictionV7":
      "BOARD",
    "src/render/undead-presentation-v7.ts::tendPreviewPresentationV7": "BOARD",
    "src/render/undead-presentation-v7.ts::undeadBoundaryNoticeV7": "BOARD",
    "src/render/undead-presentation-v7.ts::unitAfflictionsV7": "BOARD",
    "src/render/undead-presentation-v7.ts::wailTargetsPresentationV7": "BOARD",
    // The Candy revision (`pulp_wars-jdb.3`): every Candy list names units
    // on the board. A `sugarRush` entry is a Candy-kind unit, and no Candy
    // role tunnels or rides a tunnel; Splat and Sugar Toss entries last only
    // for the active seat's turn, during which their units cannot burrow
    // (a Mole tunnels on its own turn; a controlled Gunner tosses to its
    // Martian controller's units). Re-bake places its unit on the board
    // (its slot count goes through `assignedUnitCountV7`), eating reads the
    // mover, and the previews and the label read the view's units.
    "src/engine/v7/candy-reducer.ts::applyRebakeV7": "BOARD",
    "src/engine/v7/candy-reducer.ts::applySugarTossV7": "BOARD",
    "src/engine/v7/candy-reducer.ts::prunedCandyV7": "BOARD",
    "src/engine/v7/candy-reducer.ts::resolveCandyEndTurnV7": "BOARD",
    "src/engine/v7/candy-reducer.ts::resolveCrumbsEatingV7": "BOARD",
    "src/engine/v7/candy.ts::crumbsBiteV7": "BOARD",
    "src/engine/v7/query.ts::previewCrumbsEatV7": "BOARD",
    "src/engine/v7/query.ts::previewRebakeV7": "BOARD",
    "src/engine/v7/query.ts::previewSugarRushV7": "BOARD",
    "src/engine/v7/query.ts::previewSugarTossV7": "BOARD",
    "src/engine/v7/query.ts::publicSugarTossTargetsV7": "BOARD",
    "src/engine/v7/state-schema.ts::candyListsValid": "BOARD",
    // The frozen sea (`pulp_wars-5ti.3`): ice holds, traps, Chills, and
    // crushes what stands on the board; a Freeze and its preview read the
    // board. No Ice Folk unit is afloat anywhere, a mound included, so the
    // state check also reads the `burrowed` list.
    "src/engine/v7/ice.ts::resolveThawV7": "BOARD",
    "src/engine/v7/ice.ts::resolveBlackIceV7": "BOARD",
    "src/engine/v7/ice.ts::resolveIceCrushV7": "BOARD",
    "src/engine/v7/query.ts::publicFreezeSetV7": "BOARD",
    "src/engine/v7/query.ts::previewFreezeV7": "BOARD",
    "src/engine/v7/reducer.ts::applyFreeze": "BOARD",
    "src/engine/v7/reducer.ts::resolveStartTurnIceV7": "BOARD",
    "src/engine/v7/state-schema.ts::iceValid": "ALL",
    "src/headless/candy-telemetry-v7.ts::recordCandyV7": "BOARD",
    "src/render/dom/app-view-v7.ts::candyCommandLabelV7": "BOARD",
    // The Candy UI (`pulp_wars-jdb.6`): the dock, the board plan and the
    // log read the view's units (what stands on the board); a Re-bake's
    // "city is full" reason counts slots through `allOwnedUnitsV7`.
    "src/render/candy-presentation-v7.ts::candyBoundaryNoticeV7": "BOARD",
    "src/render/candy-presentation-v7.ts::candyFieldDefenseBlockedV7": "BOARD",
    "src/render/canvas/candy-board-plan-v7.ts::candyAttackTargetExtrasV7":
      "BOARD",
    "src/render/canvas/candy-board-plan-v7.ts::candyPickTargetsV7": "BOARD",
    // The ninth unit (`pulp_wars-w49.17`, 7r55): all board readers. The
    // Normal AI's positional values read the view's units (a mound is
    // neither a helper nor a target). A Wight that dies was on the board
    // (a burrowed unit takes no damage), and its rising appends a unit to
    // the board. The per-turn marks (Cracked, struck, risen) name units on
    // the board: a Cracked unit is another seat's and cannot Tunnel before
    // the mark ends, a struck unit is an enemy of the acting Whirligig,
    // and no Wight or Whirligig burrows (only a Mole and its Hammerer do).
    "src/ai/v7-ninth-unit.ts::hostileLandUnitsV7": "BOARD",
    "src/ai/v7-ninth-unit.ts::ownLandUnitsV7": "BOARD",
    "src/engine/v7/ninth-unit.ts::withWightGravesV7": "BOARD",
    "src/engine/v7/ninth-unit.ts::prunedNinthUnitV7": "BOARD",
    "src/engine/v7/reducer.ts::resolveStartTurnRiseAgainV7": "BOARD",
    "src/engine/v7/state-schema.ts::ninthUnitValid": "BOARD",
  };

/**
 * Ruleset 5 and 6 code: it has no burrowed list, so every reader in these
 * files is board-only by construction.
 */
export const LEGACY_UNIT_READER_FILES_V7: readonly string[] = [
  "src/ai/index.ts",
  "src/ai/v6.ts",
  "src/app/controller.ts",
  "src/engine/capture/eligibility.ts",
  "src/engine/combat/combat.ts",
  "src/engine/commands/predicates.ts",
  "src/engine/commands/reducers.ts",
  "src/engine/fog/view.ts",
  "src/engine/movement/movement.ts",
  "src/engine/queries/player-query.ts",
  "src/engine/rules/economy.ts",
  "src/engine/rules/ruleset.ts",
  "src/engine/scenarios/demo.ts",
  "src/engine/simulation.ts",
  "src/engine/turns/lifecycle.ts",
  "src/engine/v6/combat.ts",
  "src/engine/v6/economy.ts",
  "src/engine/v6/map.ts",
  "src/engine/v6/movement.ts",
  "src/engine/v6/query.ts",
  "src/engine/v6/reducer.ts",
  "src/engine/v6/state-schema.ts",
  "src/engine/v6/view.ts",
  "src/headless/index.ts",
  "src/headless/v6.ts",
  "src/render/canvas/board-host-v6.ts",
  "src/render/canvas/board-host.ts",
  "src/render/canvas/board-renderer.ts",
  "src/render/canvas/combat-presentation-v6.ts",
  "src/render/canvas/movement-presentation-v6.ts",
  "src/render/canvas/render-plan-v6.ts",
  "src/render/canvas/render-plan.ts",
  "src/render/dom/app-view-v6.ts",
  "src/render/dom/app-view.ts",
  "src/render/dom/selection-identity-v6.ts",
  "src/render/dom/unit-presentation-v6.ts",
];
