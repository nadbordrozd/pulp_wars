import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
  resourceMapArtIdV7,
  RULESET7_TECH_ART_IDS,
  RULESET7_TERRAIN_ART_IDS,
  RULESET7_UNIT_ART_IDS,
  commandArtIdV7,
  rewardArtIdV7,
} from "../../assets/ruleset7-ui-art";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserController,
  Ruleset7BrowserSnapshot,
  Ruleset7CampaignProgressV7,
} from "../../app/v7-controller";
import { CHAPTER_ONE_V7 } from "../../campaign/chapter-1";
import {
  campaignFactionChoicesV7,
  campaignMissionCardsV7,
  campaignMissionStatusV7,
  campaignMissionV7,
  campaignNextMissionV7,
  campaignUnlockedFactionsV7,
  type CampaignMissionCardV7,
} from "../../campaign/progress-v7";
import {
  missionByIdV7,
  missionMatchSetupV7,
  cityUnitCapacityForV7,
  distinctFactionsV7,
  effectiveRoleRuleV7,
  factionRulesV7,
  seatRoleMechanicsV7,
  unitFactionV7,
  previewKaboomV7,
  unitRoleRuleV7,
  unitRoleMechanicsV7,
  tractorBeamRuleV7,
  previewDevourV7,
  previewRaiseDeadV7,
  previewTendWoundedV7,
  previewWailV7,
  previewEconomicV7,
  isEggLaidRoleV7,
  previewHatchV7,
  previewLayEggV7,
  previewColdSnapV7,
  previewAssembleV7,
  previewTunnelV7,
  queryAssembleUnavailableReasonV7,
  queryLandingPreviewV7,
  unitCapacitySlotsV7,
  UNIT_ROLE_IDS_V7,
  ACHIEVEMENT_REQUIRED_TECH_V7,
  CITY_LEVEL_INCOME_CAP_V7,
  cityLevelIncomeV7,
  forbiddenTechnologiesV7,
  dockPopulationV7,
  queryTechnologyTreeV7,
  queryIdleRecoveryV7,
  type CommandV7,
  type CoordV7,
  type EconomicPreviewV7,
  type MatchSetupV7,
  type MapTypeV7,
  type PlayerViewV7,
  type PublicTechnologyNodeV7,
  type TechnologyIdV7,
  type AchievementIdV7,
  type UnitRoleIdV7,
  type UnitId,
  type CityId,
  type FactionIdV7,
  type BoardSizeV7,
  BOARD_SIZES_V7,
  maxSeatCountV7,
} from "../../engine/index";
import {
  CROWDED_HINT_V7,
  CROWDED_LABEL_V7,
  SETUP_MAP_TYPES_V7,
  clampOpponentCountV7,
  resolveSetupChoiceV7,
  setupMapLimitReasonV7,
  setupMapOptionsV7,
  setupOpponentCountsV7,
  setupSizeOptionsV7,
  setupVillageLineV7,
} from "../setup-options-v7";
import {
  aiTurnPlaceV7,
  playerCountLabelV7,
} from "../turn-order-presentation-v7";
import { presentedUnitFactionV7 } from "../neutral-presentation-v7";
import { curiosityGlyphV7, spiderFigureV7 } from "./curiosity-dom-v7";
import {
  CURIOSITIES_SETUP_HINT_V7,
  CURIOSITY_LABELS_V7,
  CURIOSITY_RULES_V7,
  NEUTRAL_LABEL_V7,
  curiosityBoundaryNoticeV7,
  curiosityHelpRulesV7,
  curiosityIconSubjectV7,
  curiosityOverlayOnTileV7,
  isMonsterUnitV7,
  matchOffersCuriositiesV7,
  monsterInfoLinesV7,
} from "../curiosity-presentation-v7";
import {
  endTurnRecoveryLabelV7,
  idleRecoveryChipV7,
  idleRecoveryExplanationV7,
} from "../recovery-presentation-v7";
import { downloadJsonFile } from "../../app/browser-download";
import {
  loadBoardSaturationV7,
  storeBoardSaturationV7,
} from "../../app/board-saturation-v7";
import {
  loadBoardClassicLookV7,
  storeBoardClassicLookV7,
} from "../../app/board-visual-direction-v7";
import {
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
} from "../canvas/live-board-look-v7";
import {
  SETTINGS_STORAGE_KEY,
  parseSettings,
  type StorageAdapter,
} from "../../persistence/index";
import { CanvasBoardHostV7, type BoardHostV7 } from "../canvas/board-host-v7";
import type {
  AreaSupportFocusV7,
  BoardSelectionV7,
} from "../canvas/board-renderer-v7";
import {
  DEFAULT_BOARD_SATURATION_V7,
  SATURATION_STEP_V7,
  clampSaturationPercentV7,
  type BoardSaturationV7,
} from "../canvas/sprite-saturation-v7";
import {
  LANDING_AFTER_MOVE_LABEL_V7,
  LANDING_NOW_LABEL_V7,
  type MapCommandTargetV7,
} from "../canvas/board-renderer-v7";
import { TARGET_HIGHLIGHT_HELP_TIP_V7 } from "../canvas/target-highlight-v7";
import { targetLegendV7 } from "./target-legend-v7";
import { technologyTreeLayoutV7 } from "./technology-tree-layout-v7";
import { createTacticalSymbolV7 } from "./tactical-symbol-v7";
import type { TacticalSymbolTheme } from "../../assets/ruleset7-tactical-ui-symbols";
import {
  selectionIdentityArtworkLayoutV7,
  technologyArtworkLayoutV7,
} from "./selection-identity-v7";
import { uiIconV7, type UiIconIdV7 } from "./ui-icons-v7";
import {
  cityArtSubjectV7,
  territoryGroundV7,
  territoryTerrainSubjectV7,
  unitArtSubjectV7,
  type ArtSetV7,
  type ArtSubjectV7,
} from "../../assets/chibi-art-v7";
import {
  commandSubjectV7,
  factionImprovementSubjectV7,
  portraitSubjectV7,
  rewardSubjectV7,
  technologySubjectV7,
} from "../../assets/chibi-ui-art-v7";
import {
  FACTION_BUILDINGS_HELP_V7,
  factionBuildCommandV7,
  factionBuildingV7,
  matchHasFactionBuildingsV7,
  territoryFactionV7,
} from "../faction-buildings-v7";
import {
  CHIBI_DOM_BOXES_V7,
  browserChibiDomEnvironmentV7,
  chibiDomImageV7,
  createChibiDomArtV7,
  type ChibiDomArtV7,
  type ChibiDomBoxV7,
  type ChibiDomEnvironmentV7,
} from "./chibi-dom-art-v7";
import {
  factionColourV7,
  playerFactionColourV7,
} from "../canvas/faction-colours-v7";
import { riftPieceV7 } from "../canvas/rift-presentation-v7";
import {
  DISBAND_BLOCKED_EXPLANATION_V7,
  RESTLESS_EXPLANATION_V7,
  devourPreviewDescriptionV7,
  disbandBlockedByAfflictionV7,
  factionCanCureAfflictionsV7,
  factionNameV7,
  matchHasUndeadV7,
  raiseDeadPreviewDescriptionV7,
  restlessOutsideTerritoryV7,
  restlessRecoverBlockedV7,
  tendPreviewPresentationV7,
  cureCaptainPhraseV7,
  undeadBoundaryNoticeV7,
  undeadCommandLabelV7,
  unitAfflictionsV7,
  unitIsUndeadV7,
  wailPreviewDescriptionV7,
} from "../undead-presentation-v7";
import {
  researchPathStepV7,
  tileResearchPromptsV7,
  type TileResearchPromptV7,
} from "../research-prompt-v7";
import {
  GOBLIN_FIELD_DEFENSE_EXPLANATION_V7,
  GOBLIN_HELP_RULES_V7,
  goblinBoundaryNoticeV7,
  goblinCommandLabelV7,
  goblinFieldDefenseBlockedV7,
  goblinUnitInfoLinesV7,
  kaboomPreviewTextV7,
  kaboomTooltipV7,
  matchHasGoblinV7,
  technologyNameV7,
  type KaboomPreviewTextV7,
} from "../goblin-presentation-v7";
import {
  ACHIEVEMENT_GOALS_V7,
  ACHIEVEMENT_HELP_TIP_V7,
  achievementNameV7,
  achievementProgressCountsV7,
  listedAchievementIdsV7,
} from "../achievement-presentation-v7";
import {
  ABANDON_EGG_LABEL_V7,
  CHARGE_LABEL_V7,
  DINOSAUR_FIELD_DEFENSE_EXPLANATION_V7,
  DINOSAUR_HELP_RULES_V7,
  HATCH_LABEL_V7,
  HATCH_NEW_EGG_V7,
  HATCH_PICK_V7,
  HATCH_TOOLTIP_V7,
  LAY_EGG_LABEL_V7,
  LAY_EGG_PROMPT_V7,
  PROMOTE_TOOLTIP_V7,
  PROMOTION_HELP_TIP_V7,
  WALLBREAKER_UNLOCK_TEXT_V7,
  nestingUnlockTextV7,
  abandonEggTooltipV7,
  cityCapacityTextV7,
  dinosaurBoundaryNoticeV7,
  dinosaurCommandLabelV7,
  dinosaurFieldDefenseBlockedV7,
  dinosaurRewardLabelV7,
  dinosaurUnitInfoLinesV7,
  eggCountdownTextV7,
  eggInfoTextV7,
  eggLaidRolesV7,
  eggRefundV7,
  eggTurnsRemainingV7,
  growthChipTextV7,
  growthTooltipV7,
  hatchBlockedEggsV7,
  layEggRowTextV7,
  layEggUnavailableTextV7,
  matchHasDinosaurV7,
  slotCapacityTooltipV7,
  slotsTextV7,
  turnsTextV7,
} from "../dinosaur-presentation-v7";
import {
  BEAMED_CAN_ATTACK_V7,
  BEAMED_HINT_V7,
  BEAMED_NO_MOVE_V7,
  BEAM_DOWN_LABEL_V7,
  BEAM_DOWN_PICK_PASSENGER_V7,
  BEAM_DOWN_PICK_TILE_V7,
  BEAM_DOWN_TOOLTIP_V7,
  BRAIN_SUPPORT_UNLOCK_TEXT_V7,
  COOLING_LABEL_V7,
  COOLING_TOOLTIP_V7,
  DISINTEGRATOR_UNLOCK_TEXT_V7,
  FORCE_FIELDS_UNLOCK_TEXT_V7,
  MARTIAN_FIELD_DEFENSE_EXPLANATION_V7,
  MARTIAN_FROZEN_MOVED_V7,
  MARTIAN_HELP_RULES_V7,
  MIND_CONTROL_LABEL_V7,
  MIND_CONTROL_PICK_V7,
  MIND_CONTROL_TOOLTIP_V7,
  STRAFE_LABEL_V7,
  MIND_CONTROLLED_LABEL_V7,
  MIND_CONTROLLED_NO_SLOT_V7,
  MIND_CONTROL_NO_TARGET_V7,
  TRACTOR_BEAM_LABEL_V7,
  TRACTOR_BEAM_PICK_V7,
  TRACTOR_FREE_TAG_V7,
  beamDownUnavailableTextV7,
  brainControlTextV7,
  martianBoundaryNoticeV7,
  martianCommandLabelV7,
  martianFieldDefenseBlockedV7,
  martianRewardLabelV7,
  martianRoleUnlockTextV7,
  martianSlotCapacityTooltipV7,
  martianStatsV7,
  martianTurnChipsV7,
  martianUnitInfoLinesV7,
  martianUnitNameV7,
  matchHasMartianV7,
  mindControlUnavailableTextV7,
  mindControlledInfoV7,
  rayPowerTextV7,
  type MindControlledInfoV7,
  shieldTextV7,
  tractorBeamTooltipV7,
  tractorBeamUnavailableTextV7,
} from "../martian-presentation-v7";
import {
  martianMachineV7,
  martianMoveLabelV7,
  type MartianPickV7,
} from "../canvas/martian-board-plan-v7";
import {
  BLIZZARD_LABEL_V7,
  BLIZZARD_TOOLTIP_V7,
  BOLAS_LABEL_V7,
  BOLAS_PICK_V7,
  BOLAS_TOOLTIP_V7,
  BRITTLE_UNLOCK_TEXT_V7,
  COLD_SNAP_CAST_V7,
  COLD_SNAP_LABEL_V7,
  COLD_SNAP_TOOLTIP_V7,
  DEEP_WINTER_UNLOCK_TEXT_V7,
  FROZEN_MOVED_V7,
  GLIDE_MOVE_LABEL_V7,
  ICE_FOLK_FIELD_DEFENSE_EXPLANATION_V7,
  ICE_FOLK_HELP_RULES_V7,
  SNOW_LABEL_V7,
  WITCH_SUPPORT_UNLOCK_TEXT_V7,
  chillChipV7,
  coldSnapSummaryV7,
  frozenAfterMoveV7,
  iceFolkAbilityUnavailableTextV7,
  iceFolkBoundaryNoticeV7,
  iceFolkCommandLabelV7,
  iceFolkFieldDefenseBlockedV7,
  iceFolkRewardLabelV7,
  iceFolkRoleUnlockTextV7,
  iceFolkUnitInfoLinesV7,
  boulderThrowTextV7,
  snowChipTooltipV7,
  matchHasIceFolkSeatV7,
  snowTooltipV7,
} from "../ice-folk-presentation-v7";
import {
  moveIsGlideV7,
  type IceFolkPickV7,
} from "../canvas/ice-folk-board-plan-v7";
import {
  BOARDABLE_LABEL_V7,
  BOARD_LABEL_V7,
  BOARD_PICK_V7,
  BOARD_TOOLTIP_V7,
  BOARD_UNLOCK_V7,
  HARBOURS_LABEL_V7,
  NAVAL_HELP_RULES_V7,
  NAVAL_RAM_UNLOCK_V7,
  SHORECRAFT_EMBARK_NOTE_V7,
  SUBMARINE_UNLOCK_NOTE_V7,
  SUBMERGED_LABEL_V7,
  SUBMERGED_TOOLTIP_V7,
  boardUnavailableTextV7,
  boardableTooltipV7,
  harboursUnlockTextV7,
  navalBoundaryNoticeV7,
  viewerHarbourPopulationV7,
} from "../naval-presentation-v7";
import type { NavalPickV7 } from "../canvas/naval-board-plan-v7";
import {
  ASSEMBLE_LABEL_V7,
  ASSEMBLE_PICK_V7,
  ASSEMBLE_UNLOCK_TEXT_V7,
  BLASTING_CHARGES_UNLOCK_TEXT_V7,
  BOMBED_MARK_V7,
  BOMB_RUN_LABEL_V7,
  BOMB_RUN_PICK_LANDING_V7,
  BOMB_RUN_PICK_TARGET_V7,
  CLOCKWORK_INFO_V7,
  CLOCKWORK_LABEL_V7,
  CLOCKWORK_RECOVER_V7,
  DIG_IN_UNLOCK_TEXT_V7,
  DIVE_UNLOCK_TEXT_V7,
  DWARF_FIELD_DEFENSE_EXPLANATION_V7,
  DWARF_HELP_RULES_V7,
  DWARF_SLOT_TOOLTIP_V7,
  ENGINEER_SUPPORT_UNLOCK_TEXT_V7,
  REPAIR_CHIP_V7,
  REPAIR_TOOLTIP_V7,
  TUNNEL_ALONE_V7,
  TUNNEL_CONFIRM_HINT_V7,
  TUNNEL_CONFIRM_INFO_V7,
  TUNNEL_NO_PASSENGER_V7,
  TUNNEL_PASSENGER_V7,
  TUNNEL_PICK_INFO_V7,
  noPassengerAccessibleNameV7,
  passengerAccessibleNameV7,
  RIDER_SURFACED_V7,
  TUNNEL_LABEL_V7,
  TUNNEL_PICK_V7,
  assembleCostLineV7,
  assembleSummaryV7,
  assembleTooltipV7,
  bombRunTooltipV7,
  clockworkRecoverBlockedV7,
  digInChipV7,
  dwarfAbilityUnavailableTextV7,
  dwarfBoundaryNoticeV7,
  dwarfCityNameV7,
  dwarfCommandLabelV7,
  dwarfFieldDefenseBlockedV7,
  dwarfLabelV7,
  dwarfRewardLabelV7,
  dwarfRoleUnlockTextV7,
  dwarfUnitInfoLinesV7,
  gunnerShotsTextV7,
  matchHasDwarfSeatV7,
  moundAtV7,
  moundInfoLinesV7,
  tunnelDestinationNameV7,
  tunnelTooltipV7,
  viewerBombDamageV7,
  viewerEruptionDamageV7,
} from "../dwarf-presentation-v7";
import {
  tunnelCommandsV7,
  tunnelDestinationsV7,
  tunnelOutcomeV7,
  tunnelRidersV7,
} from "../dwarf-tunnel-v7";
import type { DwarfPickV7 } from "../canvas/dwarf-board-plan-v7";
import {
  CANDY_FIELD_DEFENSE_EXPLANATION_V7,
  CANDY_HELP_RULES_V7,
  CONFECTIONER_SUPPORT_UNLOCK_TEXT_V7,
  FROSTING_TOOLTIP_V7,
  HOME_SWEET_HOME_UNLOCK_TEXT_V7,
  PEPPERMINT_SURPRISE_UNLOCK_TEXT_V7,
  REBAKE_LABEL_V7,
  REBAKE_TOOLTIP_V7,
  SUGAR_RUSH_LABEL_V7,
  SUGAR_RUSH_TOOLTIP_V7,
  SUGAR_TOSS_LABEL_V7,
  SUGAR_TOSS_TOOLTIP_V7,
  candyBoundaryNoticeV7,
  candyChipsV7,
  candyCommandNameV7,
  candyFieldDefenseBlockedV7,
  candyRoleUnlockTextV7,
  candyUnitInfoLinesV7,
  crumbsTileLinesV7,
  matchHasCandySeatV7,
  rebakeUnavailableTextV7,
  sugarRushUnavailableTextV7,
  sugarTossUnavailableTextV7,
} from "../candy-presentation-v7";
import type { CandyPickV7 } from "../canvas/candy-board-plan-v7";
import {
  AT_SEA_MOVE_TEXT_V7,
  recruitmentRolePresentationV7,
  roleAbilityDescriptionV7,
  roleAbilityNameV7,
} from "../role-presentation-v7";
import { economicFormulaV7 } from "../economy-presentation-v7";
import { GalleryViewV7 } from "./gallery-v7";

export {
  AT_SEA_MOVE_TEXT_V7,
  recruitmentRolePresentationV7,
  type RecruitmentRolePresentationV7,
} from "../role-presentation-v7";
export { economicFormulaV7 } from "../economy-presentation-v7";

const BOARD_SIZES = BOARD_SIZES_V7;
/** The Rift (bead pulp_wars-9s0.5, RULESET_7_RIFT.md section 8). */
export const RIFT_LABEL_V7 = "Only flyers";
export const RIFT_TOOLTIP_V7 =
  "A Rift: only flying units can cross or stand on it, and nothing can be built on it.";
export const RIFT_HELP_TIP_V7 =
  "Rift: a crack in the ground. Only flying units can cross or stand on it, and nothing can be built on it.";
const MAP_TYPES = SETUP_MAP_TYPES_V7;
/** Revision 18 section 5: the fixed Showcase board is always 16 x 16. */
const SHOWCASE_BOARD_SIZE = 16;
/** The Showcase board ignores the seed; its setup carries this valid one. */
const SHOWCASE_SEED = 0;
const AI_MODE_LABELS: Readonly<Record<string, string>> = {
  RIVAL: "Free-for-all",
  COOPERATIVE: "AIs allied",
};
/** Help: the player limit, one player per faction (map scale section 6.1). */
const PLAYER_LIMIT_HELP_TIP_V7 = (): string =>
  `A game holds up to ${maxSeatCountV7()} players, each a different faction.`;
/** Map scale section 6.4: what "AIs allied" means, as the Mode tooltip. */
const AI_MODE_HINT_V7 = "AIs allied: every opponent is allied against you.";
const MAP_TYPE_LABELS: Readonly<Record<string, string>> = {
  DRY_LAND: "Dry land",
  PANGEA: "Pangea",
  CONTINENTS: "Continents",
  ARCHIPELAGO: "Archipelago",
  LAKES: "Lakes",
  SHOWCASE: "Showcase",
};
const BOARD_SIZE_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  BOARD_SIZES.map((size) => [String(size), `${size} × ${size}`]),
);
/**
 * The factions the setup screen offers: every registered faction. The
 * Martians joined with their UI bead (`pulp_wars-t6s.4`), the Ice Folk with
 * theirs (`pulp_wars-7g3.6`), the Dwarves with theirs (`pulp_wars-78i.6`).
 * The Candy joined with their engine bead (`pulp_wars-jdb.3`) so that the
 * game runs with eight factions; their units, portraits, cities and ships use
 * the Candy art, and their commands are plain buttons until their UI bead
 * (`pulp_wars-jdb.6`).
 */
const FACTIONS: readonly FactionIdV7[] = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
  "DWARF",
  "CANDY",
];
/** The setup's helper text under "Factions". */
const FACTIONS_HINT_V7 =
  "Every player plays a different faction. Take an opponent's and they switch to a free one.";
/**
 * Brings the faction selects in line with the draft: each shows its seat's
 * faction. In an opponent's select a faction another shown seat plays is
 * disabled; "Your faction" offers every faction, because the human's choice
 * comes first and moves the opponent who played it to a free faction.
 */
function syncFactionFieldsV7(
  fieldset: HTMLElement,
  draft: DraftV7,
  emblem: (faction: FactionIdV7) => HTMLElement,
): void {
  const shown = draft.factions.slice(0, draft.aiCount + 1);
  shown.forEach((faction, seat) => {
    const field = fieldset.querySelector<HTMLSelectElement>(
      `#v7-faction-${seat}`,
    );
    if (field === null) return;
    // The seat's emblem follows its faction (portrait and colour).
    const cell = field.closest<HTMLElement>(".v7-setup-seat");
    if (cell !== null && cell.dataset.faction !== faction) {
      cell.dataset.faction = faction;
      cell.style.setProperty("--player", factionColourV7(faction));
      cell.querySelector(".v7-faction-emblem")?.replaceWith(emblem(faction));
    }
    for (const option of Array.from(field.options))
      option.disabled =
        seat !== 0 &&
        shown.some(
          (other, otherSeat) => otherSeat !== seat && other === option.value,
        );
    if (field.value !== faction) field.value = faction;
  });
}
const FACTION_LABELS: Readonly<Record<string, string>> = {
  ORIGINAL: "Human",
  UNDEAD: "Undead",
  GOBLIN: "Goblin",
  DINOSAUR: "Dinosaur",
  MARTIAN: "Martian",
  ICE_FOLK: "Ice Folk",
  DWARF: "Dwarf",
  CANDY: "Candy",
};
/** Non-Human factions drawn with a placeholder badge over Human art. */
type FactionBadgeV7 =
  "UNDEAD" | "GOBLIN" | "DINOSAUR" | "MARTIAN" | "ICE_FOLK" | "DWARF" | null;
/**
 * The placeholder badge of a faction. Revision 19 (bead `pulp_wars-c87.7`):
 * Dinosaur units shown with Human art wear the footprint badge; Martian
 * units (bead `pulp_wars-t6s.4`) the saucer badge; Ice Folk units (bead
 * `pulp_wars-7g3.6`) the snow-capped peak badge; Dwarf units (bead
 * `pulp_wars-78i.6`) the cog badge.
 */
function factionBadgeV7(faction: FactionIdV7): FactionBadgeV7 {
  return faction === "UNDEAD" ||
    faction === "GOBLIN" ||
    faction === "DINOSAUR" ||
    faction === "MARTIAN" ||
    faction === "ICE_FOLK" ||
    faction === "DWARF"
    ? faction
    : null;
}
const NON_BUTTON_COMMANDS = new Set<CommandV7["kind"]>([
  "MOVE",
  "ATTACK",
  "DISEMBARK",
  "RESEARCH",
  "CHOOSE_CITY_REWARD",
  // Revision 19: an Egg is laid from its city's Lay Egg cards, by picking a
  // nest tile on the board (up to 40 commands per city are never buttons).
  "LAY_EGG",
  // Bead pulp_wars-9im: a Shaman has one Hatch button; the Egg is picked
  // on the board (with one Egg in reach the button hatches it).
  "HATCH",
  // The Martian revision: one button per unit aims the ability; its targets
  // (one command per passenger and tile, or per target) are picked on the
  // board.
  "BEAM_DOWN",
  "MIND_CONTROL",
  "TRACTOR_BEAM",
  // The Ice Folk revision: Bolas and Cold Snap have one button per unit
  // each; the targets are highlighted (and a Bolas target picked) on the
  // board.
  "THROW_BOLAS",
  "COLD_SNAP",
  // The Dwarf revision: Tunnel, Bomb Run and Assemble have one button per
  // unit each; the destination, target, landing and tile are picked on the
  // board (a Mole's tunnels alone can be dozens of commands).
  "TUNNEL",
  "BOMB_RUN",
  "ASSEMBLE",
  // The Candy revision: Sugar Rush, Re-bake and Sugar Toss have one button
  // per unit each; the Rushed reach, the Crumbs and the unit to heal are
  // picked on the board.
  "SUGAR_RUSH",
  "REBAKE",
  "SUGAR_TOSS",
  // The naval branch interface (bead pulp_wars-5ti.7): Board has one
  // button per ship that arms it; the ship to capture is picked on the
  // board (docs/ui/BOARD_TARGETING.md section 3.4).
  "BOARD",
  // The frozen sea engine (bead pulp_wars-5ti.3): likewise Freeze, which
  // aims at one of the eight tiles around the unit.
  "FREEZE",
]);
/** Revision 18 (sections 3.4 and 4.4) movement help and technology text. */
export const OWN_UNIT_PASS_THROUGH_TEXT_V7 =
  "Units can move through your own units but cannot stop on them.";
export const ROAD_MOVEMENT_TEXT_V7 =
  "Leaving a Road tile costs half a move; the tile you move onto needs no Road.";

export interface MountRuleset7AppOptions {
  readonly boardHost?: BoardHostV7;
  /** Presentation-only Ruleset 7 art set; LEGACY when omitted. */
  readonly artSet?: ArtSetV7;
  /** CHIBI DOM raster seams (tests); the browser's by default. */
  readonly chibiDomEnvironment?: ChibiDomEnvironmentV7;
  readonly downloadSafeLog?: (source: string, filename: string) => void;
  readonly downloadDebugBundle?: (source: string, filename: string) => void;
  readonly settingsStorage?: StorageAdapter | null;
  readonly startupNotice?: string;
  /**
   * Draws the map seed (0–4294967295) of a "New map" launch. The engine
   * stays deterministic: only this DOM layer picks the seed. Tests inject a
   * fixed source; the browser's crypto (or Math.random) is the default.
   */
  readonly randomSeed?: () => number;
  /**
   * The Gallery animation preview's board host (bead pulp_wars-ic8);
   * tests inject a fake. A CanvasBoardHostV7 by default.
   */
  readonly galleryDemoHost?: () => BoardHostV7;
}

/** A fresh unsigned 32-bit map seed from the browser. */
export function browserRandomSeedV7(documentRoot: Document): number {
  const crypto = documentRoot.defaultView?.crypto;
  if (crypto !== undefined && typeof crypto.getRandomValues === "function")
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return Math.floor(Math.random() * 0x1_0000_0000);
}

export type Ruleset7ControllerPortV7 = Pick<
  Ruleset7BrowserController,
  | "snapshot"
  | "subscribe"
  | "subscribeAcceptedBoundary"
  | "launch"
  | "resume"
  | "returnToMenu"
  | "dispatch"
  | "progressAiTurns"
  | "restart"
  | "deleteStoredSave"
  | "setFastForward"
  | "exportSafeLog"
  | "exportDebugBundle"
> &
  // Campaign progress (pulp_wars-68k.5); a port without it shows the
  // campaign with no progress and records nothing.
  Partial<
    Pick<
      Ruleset7BrowserController,
      "campaignProgress" | "resetCampaignProgress"
    >
  >;

/** Progress shown when the controller keeps none (tests, fixtures). */
const NO_CAMPAIGN_PROGRESS_V7: Ruleset7CampaignProgressV7 = Object.freeze({
  status: "OK",
  completed: Object.freeze({}),
  lastWin: null,
  diagnostic: null,
});

/** The front screen's two modes (CAMPAIGN.md section 5, item 1). */
type FrontModeV7 = "SKIRMISH" | "CAMPAIGN";

interface DraftV7 {
  /** Opponents: 1 up to one less than the faction count (map scale 6.1). */
  readonly aiCount: number;
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly boardSize: BoardSizeV7;
  /** NEW draws a random seed at launch; SEED uses `seedText`. */
  readonly seedMode: "NEW" | "SEED";
  readonly seedText: string;
  readonly mapType: MapTypeV7;
  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 3):
   * the "Curiosities" checkbox, on by default. A Showcase launch always sends
   * `false` (the Showcase never has curiosities).
   */
  readonly curiosities: boolean;
  /**
   * Seat factions (seat 0 is the human), one per faction and always distinct
   * (docs/product/RULESET_7_UNIQUE_FACTIONS.md), in registration order by
   * default. Seats beyond the AI count keep their choice hidden.
   */
  readonly factions: readonly FactionIdV7[];
}

type ScreenV7 =
  "MATCH" | "TECH" | "LEADERBOARD" | "ACHIEVEMENTS" | "SETTINGS" | "HELP";

/** DOM/Canvas composition whose only gameplay inputs are public snapshots and offered commands. */
export class Ruleset7DomAppView {
  readonly #document: Document;
  readonly #root: HTMLElement;
  readonly #controller: Ruleset7ControllerPortV7;
  readonly #boardHost: BoardHostV7;
  readonly #downloadSafeLog: (source: string, filename: string) => void;
  readonly #downloadDebugBundle: (source: string, filename: string) => void;
  readonly #settingsStorage: StorageAdapter | null;
  readonly #randomSeed: () => number;
  readonly #artSet: ArtSetV7;
  /** CHIBI interface art; null in LEGACY, which keeps its markup unchanged. */
  readonly #chibiDom: ChibiDomArtV7 | null;
  #chibiRenderQueued = false;
  #snapshot: Ruleset7BrowserSnapshot;
  #unsubscribe: (() => void) | null = null;
  #unsubscribeAcceptedBoundary: (() => void) | null = null;
  #draft: DraftV7 = {
    aiCount: 1,
    aiMode: "RIVAL",
    boardSize: 11,
    seedMode: "NEW",
    seedText: "42",
    mapType: "CONTINENTS",
    curiosities: true,
    factions: distinctFactionsV7(maxSeatCountV7()),
  };
  /**
   * What the setup last changed by itself (a size or map that stopped being
   * legal for the players), shown under Size until the next change.
   */
  #setupNote = "";
  /** Whether that change moved the size, the map, or both. */
  #setupMoved: { readonly size: boolean; readonly map: boolean } = {
    size: false,
    map: false,
  };
  #selection: BoardSelectionV7 | null = null;
  #screen: ScreenV7 = "MATCH";
  #selectedTech: TechnologyIdV7 | null = null;
  #achievementNotices: AchievementIdV7[] = [];
  #achievementReturnAction: string | null = null;
  #selectedModifier: string | null = null;
  #selectedRecruitHelp: UnitRoleIdV7 | null = null;
  #selectedUnitHelpId: number | null = null;
  /**
   * Revision 17: the own unit whose Kaboom! is armed (its preview stays on
   * the board and the dock asks for confirmation), and the unit whose
   * Kaboom! button is hovered or focused (preview only).
   */
  #kaboomArmedUnitId: number | null = null;
  #kaboomHoverUnitId: number | null = null;
  /**
   * Bead pulp_wars-621: the own unit whose area support button (Tend
   * Wounded, Repair, Frosting; Rally) is hovered or focused; the board
   * draws that button's recipients prominent.
   */
  #areaSupportHover: AreaSupportFocusV7 | null = null;
  /**
   * Revision 19: the own city and egg-laid role whose nest tile is being
   * picked on the board (Escape, Cancel or another selection leaves).
   */
  #layEggPick: {
    readonly cityId: CityId;
    readonly role: UnitRoleIdV7;
  } | null = null;
  /**
   * The Martian revision: the Beam Down, Mind Control or Tractor Beam the
   * selected unit is aiming on the board (Escape, Cancel or another
   * selection leaves; Escape first steps back from a Beam Down tile to its
   * passenger).
   */
  #martianPick: MartianPickV7 | null = null;
  /**
   * The Ice Folk revision: the Bolas or Cold Snap the selected unit is
   * aiming on the board (Escape, Cancel or another selection leaves).
   */
  #iceFolkPick: IceFolkPickV7 | null = null;
  /**
   * The Dwarf revision: the Tunnel, Bomb Run or Assemble the selected unit
   * is aiming on the board (Escape first steps back from the rider prompt
   * or the landing; Cancel or another selection leaves).
   */
  #dwarfPick: DwarfPickV7 | null = null;
  /**
   * The Candy revision: the armed Sugar Rush, or the Re-bake or Sugar Toss
   * the selected unit is aiming on the board (Escape, Back, Cancel or
   * another selection leaves it and sends nothing).
   */
  #candyPick: CandyPickV7 | null = null;
  /**
   * The naval branch interface: the Board the selected ship is aiming on
   * the board (Escape, Cancel or another selection leaves it and sends
   * nothing).
   */
  #navalPick: NavalPickV7 | null = null;
  #unitHelpModal: HTMLElement | null = null;
  #modalReturnAction: string | null = null;
  /**
   * Research prompts (bead pulp_wars-gl1): the technology a tile's prompt
   * asked for while the technology screen it opened is up. The screen marks
   * its card and, after a prerequisite is researched, selects the next
   * technology on the way to it.
   */
  #techGoal: TechnologyIdV7 | null = null;
  #compactMenuOpen = false;
  #notice = "";
  #error = "";
  #toast: {
    readonly id: number;
    readonly text: string;
    readonly kind: "info" | "error";
  } | null = null;
  #toastSequence = 0;
  #replacing = false;
  #matchInstance = 0;
  #presentationActive = false;
  #presentationQueue: {
    readonly matchInstance: number;
    readonly boundary: Ruleset7AcceptedBoundary;
  }[] = [];
  #presentationTail: Promise<void> = Promise.resolve();
  #humanDispatchPending = false;
  #humanDispatchSettling = false;
  #motion: "FULL" | "REDUCED";
  #animationSpeed: "NORMAL" | "FAST" = "NORMAL";
  #highContrast = false;
  #uiScale: 1 | 1.25 | 1.5 | 2 = 1;
  /** Developer experiment (pulp_wars-x6c); presentation only. */
  #boardSaturation: BoardSaturationV7 = DEFAULT_BOARD_SATURATION_V7;
  /**
   * Developer option (pulp_wars-3tq.6): draw the CHIBI set's previous look
   * instead of the new visual direction. Presentation only, off by default.
   */
  #classicLook = false;
  /**
   * Interface art of the classic look (the default registry alone); built
   * on first use, so the default game never loads the previous portraits.
   */
  #classicChibiDom: ChibiDomArtV7 | null = null;
  readonly #chibiDomEnvironment: ChibiDomEnvironmentV7 | null;
  #developerToolsOpen = false;
  /**
   * Campaign screens (pulp_wars-68k.5): the front screen's mode for the
   * page session, the mission whose briefing is open (null: the list), the
   * faction chosen in it, and whether Reset progress awaits confirmation.
   */
  #frontMode: FrontModeV7 = "SKIRMISH";
  #briefingMissionId: string | null = null;
  #briefingFaction: FactionIdV7 | null = null;
  #confirmCampaignReset = false;
  /** A front-screen control to focus after the next front render. */
  #frontFocus: string | null = null;
  #pendingFocusAction: string | null = null;
  #matchShell: HTMLElement | null = null;
  #matchRoot: HTMLElement | null = null;
  #boardContainer: HTMLElement | null = null;
  #destroyed = false;
  /** The Gallery screen (bead pulp_wars-ic8), built when first opened. */
  #gallery: GalleryViewV7 | null = null;
  #galleryOpen = false;
  readonly #galleryDemoHost: (() => BoardHostV7) | undefined;

  constructor(
    documentRoot: Document,
    root: HTMLElement,
    controller: Ruleset7ControllerPortV7,
    options: MountRuleset7AppOptions = {},
  ) {
    this.#document = documentRoot;
    this.#root = root;
    this.#controller = controller;
    this.#boardHost = options.boardHost ?? new CanvasBoardHostV7(documentRoot);
    this.#downloadSafeLog =
      options.downloadSafeLog ??
      ((source, filename) => downloadJsonFile(documentRoot, source, filename));
    this.#downloadDebugBundle =
      options.downloadDebugBundle ??
      ((source, filename) => downloadJsonFile(documentRoot, source, filename));
    this.#settingsStorage = options.settingsStorage ?? null;
    this.#randomSeed =
      options.randomSeed ?? (() => browserRandomSeedV7(documentRoot));
    this.#galleryDemoHost = options.galleryDemoHost;
    this.#artSet = options.artSet ?? "LEGACY";
    this.#chibiDomEnvironment =
      this.#artSet === "CHIBI"
        ? (options.chibiDomEnvironment ??
          browserChibiDomEnvironmentV7(documentRoot))
        : null;
    // The interface resolves the new direction's art first (Human and Goblin
    // portraits, cities, the shared improvements) and the default art for
    // everything else, like the board.
    this.#chibiDom =
      this.#chibiDomEnvironment === null
        ? null
        : createChibiDomArtV7({
            environment: this.#chibiDomEnvironment,
            onChange: () => this.#queueChibiRender(),
            preferred: LIVE_DIRECTION_ART_REGISTRY_V7,
          });
    // Every view claims the document's economy icons, so a LEGACY view never
    // inherits a CHIBI provider left by another view.
    CHIBI_ECONOMY_ICONS.set(documentRoot, this.#economyIcons);
    this.#notice = options.startupNotice ?? "";
    this.#motion =
      documentRoot.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches === true
        ? "REDUCED"
        : "FULL";
    try {
      const storedSettings =
        this.#settingsStorage?.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings !== null && storedSettings !== undefined) {
        const parsed = parseSettings(storedSettings);
        if (parsed.kind === "VALID") {
          this.#uiScale = parsed.settings.uiScale;
          this.#motion = parsed.settings.motion;
          this.#animationSpeed = parsed.settings.animationSpeed;
          this.#highContrast = parsed.settings.highContrast;
        }
      }
    } catch {
      // Restricted storage must not prevent the public UI from mounting.
    }
    this.#boardSaturation = loadBoardSaturationV7(this.#settingsStorage);
    this.#classicLook = loadBoardClassicLookV7(this.#settingsStorage);
    this.#snapshot = controller.snapshot();
    this.#document.addEventListener("keydown", this.#onKeyDown);
    this.#root.addEventListener("dragstart", this.#onDragStart);
    this.#unsubscribeAcceptedBoundary = controller.subscribeAcceptedBoundary(
      (boundary) => this.#queueBoundary(boundary),
    );
    this.#unsubscribe = controller.subscribe((snapshot) => {
      if (this.#destroyed) return;
      const prior = this.#snapshot;
      this.#snapshot = snapshot;
      if (this.#humanDispatchPending) return;
      if (
        prior.ai.active &&
        snapshot.ai.active &&
        prior.view?.commandIndex === snapshot.view?.commandIndex
      )
        this.#patchAiProgress();
      else this.#render();
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    if (CHIBI_ECONOMY_ICONS.get(this.#document) === this.#economyIcons)
      CHIBI_ECONOMY_ICONS.delete(this.#document);
    this.#document.removeEventListener("keydown", this.#onKeyDown);
    this.#root.removeEventListener("dragstart", this.#onDragStart);
    this.#unsubscribe?.();
    this.#unsubscribeAcceptedBoundary?.();
    this.#unsubscribeAcceptedBoundary = null;
    this.#cancelPresentations();
    this.#gallery?.destroy();
    this.#boardHost.destroy();
    this.#root.replaceChildren();
  }

  /**
   * The interface is not selectable, so nothing in it is draggable either:
   * images, links and stray selections never start a drag. Text fields keep
   * their own drag behaviour.
   */
  readonly #onDragStart = (event: Event): void => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    )
      return;
    event.preventDefault();
  };

  /**
   * Closes the open dismissable popup (recruit help, unit info, or a
   * tech/menu overlay) and reports whether it did. Shared by Escape and the
   * scrim; the mandatory reward, results and error dialogs never close.
   */
  #dismissPopup(): boolean {
    if (this.#selectedRecruitHelp !== null) this.#closeRecruitHelp();
    else if (this.#selectedUnitHelpId !== null) this.#closeUnitHelp();
    else if (this.#screen !== "MATCH") this.#closeOverlay();
    else return false;
    return true;
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    // The Gallery handles its own keys (grid, dialog, Escape).
    if (this.#galleryOpen) return;
    const target = event.target;
    const modal = this.#root.querySelector<HTMLElement>('[aria-modal="true"]');
    if (modal !== null) {
      if (event.key === "Tab") this.#trapModalFocus(event, modal);
      else if (event.key === "Escape") {
        if (modal.dataset.v7Region === "achievement-notice") {
          event.preventDefault();
          this.#dismissAchievementNotice();
        } else if (this.#selectedRecruitHelp !== null) {
          event.preventDefault();
          this.#closeRecruitHelp();
        } else if (this.#selectedUnitHelpId !== null) {
          event.preventDefault();
          this.#closeUnitHelp();
        } else if (this.#screen !== "MATCH") {
          event.preventDefault();
          this.#closeOverlay();
        }
      }
      return;
    }
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.#boardHost.resetInspectionCycle?.();
      if (this.#screen !== "MATCH") this.#screen = "MATCH";
      else if (this.#kaboomArmedUnitId !== null) {
        // Revision 17: Escape first disarms an armed Kaboom!.
        this.#kaboomArmedUnitId = null;
        this.#kaboomHoverUnitId = null;
        this.#pendingFocusAction = "command-kaboom";
        this.#render();
        return;
      } else if (this.#layEggPick !== null) {
        // Revision 19: Escape first leaves the nest-tile picking.
        this.#cancelLayEggPick();
        return;
      } else if (this.#martianPick !== null) {
        // The Martian revision: Escape first steps back out of the aiming.
        this.#cancelMartianPick(true);
        return;
      } else if (this.#iceFolkPick !== null) {
        // The Ice Folk revision: Escape first leaves the aiming.
        this.#cancelIceFolkPick();
        return;
      } else if (this.#dwarfPick !== null) {
        // The Dwarf revision: Escape first steps back out of the aiming.
        this.#cancelDwarfPick(true);
        return;
      } else if (this.#candyPick !== null) {
        // The Candy revision: Escape first disarms the Rush or the aiming.
        this.#cancelCandyPick();
        return;
      } else if (this.#navalPick !== null) {
        // The naval branch interface: Escape first disarms Board.
        this.#cancelNavalPick();
        return;
      } else this.#selection = null;
      this.#render();
      this.#queueBoardFocus();
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "t") {
      event.preventDefault();
      this.#open("TECH");
    } else if (key === "g") {
      event.preventDefault();
      this.#open("LEADERBOARD");
    } else if (key === "?") {
      event.preventDefault();
      this.#open("HELP");
    } else if (key === "e") {
      const command = this.#snapshot.offeredCommands.find(
        (candidate) => candidate.kind === "END_TURN",
      );
      if (command !== undefined) {
        event.preventDefault();
        void this.#dispatch(command);
      }
    }
  };

  /** A CHIBI raster settled: redraw once, after the current task. */
  #queueChibiRender(): void {
    if (this.#chibiRenderQueued || this.#destroyed) return;
    this.#chibiRenderQueued = true;
    queueMicrotask(() => {
      this.#chibiRenderQueued = false;
      if (this.#settleSetupEmblems()) return;
      this.#render();
    });
  }

  /**
   * A portrait that settles while the setup form is shown redraws only the
   * seats' emblems, in place: the form's controls are never replaced under
   * the player's hands (an open select would close). False when the setup
   * form is not on screen.
   */
  #settleSetupEmblems(): boolean {
    const fieldset = this.#root.querySelector<HTMLElement>(
      "[data-v7-setup] [data-v7-factions]",
    );
    if (fieldset === null) return false;
    for (const cell of Array.from(
      fieldset.querySelectorAll<HTMLElement>(".v7-setup-seat"),
    )) {
      const faction = FACTIONS.find(
        (candidate) => candidate === cell.dataset.faction,
      );
      if (faction !== undefined)
        cell
          .querySelector(".v7-faction-emblem")
          ?.replaceWith(this.#factionEmblem(faction, "small"));
    }
    return true;
  }

  /**
   * CHIBI art for an interface subject, or null to keep the legacy art (the
   * LEGACY set, or no usable chibi raster). factionArt is true when an
   * Undead subject drew its own art, which drops the placeholder badge.
   */
  #chibiArt(
    subject: ArtSubjectV7 | null,
    box: ChibiDomBoxV7,
    ownerColor?: string,
    at?: CoordV7,
  ): {
    readonly element: HTMLImageElement;
    readonly factionArt: boolean;
  } | null {
    if (this.#chibiDom === null || subject === null) return null;
    const request = {
      subject,
      ownerColor,
      ...(at === undefined ? {} : { at }),
    };
    const resolution = this.#interfaceArt().resolve(request);
    if (resolution.kind === "MISSING") return null;
    return {
      element: chibiDomImageV7(this.#document, resolution, box, subject),
      factionArt: resolution.factionArt,
    };
  }

  /**
   * Map curiosities: a legend icon (the live look's raster, or the
   * code-drawn glyph in LEGACY and the classic look).
   */
  #curiosityIcon(
    id: Parameters<typeof curiosityIconSubjectV7>[0],
  ): HTMLElement | SVGElement {
    const image = this.#chibiArt(
      curiosityIconSubjectV7(id),
      CHIBI_DOM_BOXES_V7.passenger,
    )?.element;
    if (image === undefined) return curiosityGlyphV7(this.#document, id);
    image.classList.add("v7-curiosity-icon");
    return image;
  }

  /** The interface art of the current look; only called for the CHIBI set. */
  #interfaceArt(): ChibiDomArtV7 {
    const directed = this.#chibiDom;
    const environment = this.#chibiDomEnvironment;
    if (directed === null || environment === null)
      throw new Error("Interface art requires the CHIBI art set");
    if (!this.#classicLook) return directed;
    this.#classicChibiDom ??= createChibiDomArtV7({
      environment,
      onChange: () => this.#queueChibiRender(),
    });
    return this.#classicChibiDom;
  }

  readonly #economyIcons = (
    kind: "coin" | "population",
  ): { readonly url: string; readonly assetId: string } | null => {
    const resolution = this.#chibiDom?.resolve({
      subject: kind === "coin" ? "ICON:HUD:COIN" : "ICON:HUD:POPULATION",
    });
    return resolution?.kind === "READY"
      ? { url: resolution.url, assetId: resolution.asset.id }
      : null;
  };

  #technologyChibiArt(tech: TechnologyIdV7) {
    return this.#chibiArt(
      technologySubjectV7(tech, this.#viewerFaction()),
      CHIBI_DOM_BOXES_V7.card,
      this.#viewerColour(),
    );
  }

  /** The owner colour of a player: its faction's (bead pulp_wars-b5f.4). */
  #playerColour(
    view: PlayerViewV7,
    playerId: number | null | undefined,
  ): string | undefined {
    return playerFactionColourV7(view, playerId);
  }

  #viewerColour(): string | undefined {
    const view = this.#snapshot.view;
    return view === null ? undefined : this.#playerColour(view, view.viewer.id);
  }

  #render(): void {
    if (this.#destroyed) return;
    if (
      this.#snapshot.view !== null &&
      (this.#snapshot.phase === "ACTIVE" ||
        this.#snapshot.phase === "COMPLETE" ||
        this.#snapshot.phase === "ERROR")
    ) {
      this.#renderStableMatch(this.#snapshot.view);
      return;
    }
    if (this.#matchRoot !== null) this.#boardHost.destroy();
    this.#matchShell = null;
    this.#matchRoot = null;
    this.#boardContainer = null;
    if (this.#galleryOpen) {
      this.#renderGallery();
      return;
    }
    const shell = el(this.#document, "div", "v7-app-shell");
    shell.dataset.phase = this.#snapshot.phase.toLowerCase();
    shell.append(
      live(this.#document, "v7-live", this.#notice, "polite"),
      live(this.#document, "v7-alert", this.#error, "assertive"),
    );
    if (this.#snapshot.saveWarning !== null)
      shell.append(
        text(
          this.#document,
          "p",
          `Save warning: ${this.#snapshot.saveWarning}`,
          "v7-warning",
        ),
      );
    if (this.#snapshot.phase === "EMPTY") shell.append(this.#front(false));
    else if (this.#snapshot.phase === "RESUMABLE")
      shell.append(this.#replacing ? this.#front(true) : this.#resume());
    else if (this.#snapshot.phase === "RECOVERY")
      shell.append(this.#recovery());
    else shell.append(this.#front(false));
    // A front screen is rebuilt whole (a settled portrait re-renders it
    // too): keep keyboard focus on the same control.
    const active = this.#document.activeElement;
    const kept =
      active instanceof HTMLElement && this.#root.contains(active)
        ? active.id !== ""
          ? `#${active.id}`
          : active.dataset.action === undefined
            ? null
            : `[data-action="${active.dataset.action}"]`
        : null;
    this.#root.replaceChildren(shell);
    const focus = this.#frontFocus ?? kept;
    this.#frontFocus = null;
    if (focus !== null)
      queueMicrotask(() => {
        if (this.#destroyed) return;
        this.#root.querySelector<HTMLElement>(focus)?.focus();
      });
  }

  /** The setup form or, in Campaign mode, the campaign screen. */
  #front(replace: boolean): HTMLElement {
    return this.#frontMode === "CAMPAIGN"
      ? this.#campaignScreen(replace)
      : this.#setup(replace);
  }

  /**
   * The Skirmish / Campaign switch under the brand (CAMPAIGN.md section 5,
   * item 1), styled like "New map / Use seed". It lasts for the page
   * session.
   */
  #modeSwitch(): HTMLElement {
    const group = el(this.#document, "div", "v7-mode-choice");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Game mode");
    group.dataset.mode = this.#frontMode.toLowerCase();
    const toggle = el(this.#document, "div", "v7-seed-toggle v7-mode-toggle");
    for (const mode of ["SKIRMISH", "CAMPAIGN"] as const) {
      const action = `mode-${mode.toLowerCase()}`;
      const option = button(
        this.#document,
        mode === "SKIRMISH" ? "Skirmish" : "Campaign",
        action,
        "v7-seed-option",
      );
      option.setAttribute("aria-pressed", String(mode === this.#frontMode));
      option.onclick = () => {
        if (this.#frontMode === mode) return;
        this.#frontFocus = `[data-action="${action}"]`;
        this.#frontMode = mode;
        this.#briefingMissionId = null;
        this.#confirmCampaignReset = false;
        this.#error = "";
        this.#render();
      };
      toggle.append(option);
    }
    group.append(toggle);
    return group;
  }

  #campaignProgress(): Ruleset7CampaignProgressV7 {
    return this.#controller.campaignProgress?.() ?? NO_CAMPAIGN_PROGRESS_V7;
  }

  /**
   * The campaign screen (CAMPAIGN.md section 5, items 2 and 3): the
   * chapter and its mission cards, or the open mission's briefing.
   */
  #campaignScreen(replace: boolean): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen v7-campaign");
    main.dataset.v7Campaign = "true";
    main.append(this.#brand(), this.#modeSwitch());
    const progress = this.#campaignProgress();
    if (progress.status === "UNREADABLE")
      main.append(this.#campaignUnreadable(progress));
    else if (this.#briefingMissionId !== null)
      main.append(this.#briefing(this.#briefingMissionId, progress, replace));
    else main.append(this.#campaignList(progress));
    main.append(this.#galleryEntry(), this.#ruleset6Link());
    return main;
  }

  /** Unreadable progress: the save-recovery pattern with a Reset button. */
  #campaignUnreadable(progress: Ruleset7CampaignProgressV7): HTMLElement {
    const section = el(this.#document, "section", "v7-campaign-recovery");
    section.dataset.v7Region = "campaign-unreadable";
    section.append(
      text(
        this.#document,
        "p",
        "Campaign progress can't be read.",
        "v7-recovery-summary",
      ),
    );
    if (progress.diagnostic !== null) {
      const details = this.#document.createElement("details");
      details.className = "v7-recovery-details";
      details.append(
        text(this.#document, "summary", "Details"),
        text(this.#document, "p", progress.diagnostic),
      );
      section.append(details);
    }
    const reset = button(
      this.#document,
      "Reset",
      "campaign-reset-unreadable",
      "destructive",
    );
    reset.onclick = () => this.#resetCampaign();
    section.append(reset);
    return section;
  }

  #campaignList(progress: Ruleset7CampaignProgressV7): HTMLElement {
    const chapter = CHAPTER_ONE_V7;
    const section = el(this.#document, "section", "v7-campaign-chapter");
    section.dataset.v7Chapter = chapter.id;
    section.append(
      text(this.#document, "h2", chapter.title, "v7-campaign-title"),
      text(this.#document, "p", chapter.intro, "v7-campaign-story"),
    );
    const list = el(this.#document, "ol", "v7-mission-list");
    list.setAttribute("aria-label", "Missions");
    for (const card of campaignMissionCardsV7(chapter, progress.completed)) {
      const item = el(this.#document, "li", "v7-mission-item");
      item.append(this.#missionCard(card));
      list.append(item);
    }
    section.append(list);
    // Every faction, dimmed until the campaign unlocks it.
    const unlocked = campaignUnlockedFactionsV7(progress.completed);
    const roster = el(this.#document, "div", "v7-campaign-roster");
    const rosterTitle = text(this.#document, "h3", "Factions");
    rosterTitle.id = "v7-campaign-roster-title";
    const factions = el(this.#document, "ul", "v7-campaign-factions");
    factions.setAttribute("aria-labelledby", rosterTitle.id);
    for (const faction of FACTIONS) {
      const open = unlocked.includes(faction);
      const label = FACTION_LABELS[faction] ?? title(faction);
      const entry = el(this.#document, "li", "v7-campaign-faction");
      entry.dataset.faction = faction;
      entry.dataset.unlocked = String(open);
      entry.setAttribute("aria-label", open ? label : `${label}, locked`);
      entry.title = open ? label : `${label} (locked)`;
      entry.append(this.#factionEmblem(faction));
      factions.append(entry);
    }
    roster.append(rosterTitle, factions);
    section.append(roster, this.#campaignSettings());
    return section;
  }

  /** One mission card: number, name, emblems, and its state. */
  #missionCard(card: CampaignMissionCardV7): HTMLButtonElement {
    const { entry, status } = card;
    const action = `mission-${entry.missionId.toLowerCase()}`;
    const node = this.#document.createElement("button");
    node.type = "button";
    node.className = "v7-mission-card";
    node.dataset.action = action;
    node.dataset.missionId = entry.missionId;
    node.dataset.status = status.toLowerCase();
    const best =
      status === "DONE" && card.bestRounds !== null
        ? `Best: ${card.bestRounds} turns`
        : null;
    const stateText =
      status === "LOCKED"
        ? "Win the previous mission"
        : status === "OPEN"
          ? "Open"
          : (best ?? "Done");
    node.setAttribute(
      "aria-label",
      `Mission ${entry.number}, ${entry.name}, ${
        status === "LOCKED"
          ? "locked"
          : status === "OPEN"
            ? "open"
            : best === null
              ? "done"
              : `done, best ${card.bestRounds} turns`
      }`,
    );
    if (status === "LOCKED") node.setAttribute("aria-disabled", "true");
    const sides = el(this.#document, "span", "v7-mission-sides");
    sides.setAttribute("aria-hidden", "true");
    for (const faction of card.leads)
      sides.append(this.#factionEmblem(faction));
    sides.append(text(this.#document, "span", "vs", "v7-mission-versus"));
    for (const faction of card.opponents)
      sides.append(this.#factionEmblem(faction));
    const state = el(this.#document, "span", "v7-mission-state");
    state.setAttribute("aria-hidden", "true");
    if (status === "DONE") state.append(uiIconV7(this.#document, "trophy"));
    state.append(text(this.#document, "span", stateText));
    node.append(
      text(this.#document, "span", String(entry.number), "v7-mission-number"),
      text(this.#document, "span", entry.name, "v7-mission-name"),
      sides,
      state,
    );
    node.onclick = () => {
      if (status === "LOCKED") return;
      this.#openBriefing(entry.missionId);
    };
    return node;
  }

  /** "Settings" on the campaign screen: Reset progress, confirmed. */
  #campaignSettings(): HTMLElement {
    const details = this.#document.createElement("details");
    details.className = "v7-campaign-settings";
    details.open = this.#confirmCampaignReset;
    details.append(text(this.#document, "summary", "Settings"));
    if (!this.#confirmCampaignReset) {
      const reset = button(
        this.#document,
        "Reset progress",
        "campaign-reset",
        "destructive",
      );
      reset.onclick = () => {
        this.#confirmCampaignReset = true;
        this.#frontFocus = '[data-action="campaign-reset-cancel"]';
        this.#render();
      };
      details.append(reset);
      return details;
    }
    const confirm = el(this.#document, "div", "v7-campaign-reset-confirm");
    confirm.setAttribute("role", "group");
    confirm.setAttribute("aria-label", "Reset progress");
    const question = text(
      this.#document,
      "p",
      "Erase all campaign progress?",
      "v7-campaign-reset-question",
    );
    const actions = el(this.#document, "div", "button-row");
    const yes = button(
      this.#document,
      "Reset",
      "campaign-reset-confirm",
      "destructive",
    );
    yes.onclick = () => this.#resetCampaign();
    const no = button(this.#document, "Cancel", "campaign-reset-cancel");
    no.onclick = () => {
      this.#confirmCampaignReset = false;
      this.#frontFocus = '[data-action="campaign-reset"]';
      this.#render();
    };
    actions.append(yes, no);
    confirm.append(question, actions);
    details.append(confirm);
    return details;
  }

  #resetCampaign(): void {
    const reset = this.#controller.resetCampaignProgress?.() ?? true;
    this.#confirmCampaignReset = false;
    if (reset) {
      this.#briefingMissionId = null;
      this.#notice = "Campaign progress reset.";
      this.#error = "";
      this.#frontFocus = '[data-action="mode-campaign"]';
    } else this.#error = "Campaign progress couldn't be reset.";
    this.#render();
  }

  #openBriefing(missionId: string): void {
    this.#briefingMissionId = missionId;
    this.#confirmCampaignReset = false;
    this.#error = "";
    this.#frontFocus = "#v7-briefing-title";
    this.#render();
  }

  /**
   * The briefing (CAMPAIGN.md section 5, item 3): the story, the
   * Objective line, up to three hints, the map size and opponent, and the
   * faction you lead, a choice filtered to unlocked factions where the
   * mission offers one.
   */
  #briefing(
    missionId: string,
    progress: Ruleset7CampaignProgressV7,
    replace: boolean,
  ): HTMLElement {
    const found = campaignMissionV7(missionId);
    const mission = missionByIdV7(missionId);
    const section = el(this.#document, "section", "v7-briefing");
    section.dataset.v7Region = "briefing";
    section.dataset.missionId = missionId;
    if (found === null || mission === null) return section;
    const { chapter, entry } = found;
    const heading = text(this.#document, "h2", entry.name, "v7-briefing-title");
    heading.id = "v7-briefing-title";
    heading.tabIndex = -1;
    section.setAttribute("aria-labelledby", heading.id);
    section.append(
      text(
        this.#document,
        "p",
        `Mission ${entry.number}`,
        "v7-briefing-kicker",
      ),
      heading,
      text(this.#document, "p", entry.briefing, "v7-campaign-story"),
    );
    const objective = el(this.#document, "p", "v7-briefing-objective");
    objective.append(
      text(this.#document, "strong", "Objective"),
      text(this.#document, "span", entry.objective),
    );
    section.append(objective);
    if (entry.hints.length > 0) {
      const hints = el(this.#document, "ul", "v7-briefing-hints");
      hints.setAttribute("aria-label", "Hints");
      for (const hint of entry.hints.slice(0, 3))
        hints.append(text(this.#document, "li", hint));
      section.append(hints);
    }
    const facts = el(this.#document, "div", "v7-briefing-facts");
    const opponents = mission.seats
      .slice(1)
      .map((seat) => (typeof seat.faction === "string" ? seat.faction : null))
      .filter((faction): faction is FactionIdV7 => faction !== null);
    const map = text(
      this.#document,
      "span",
      `${mission.size} × ${mission.size}`,
      "v7-briefing-size",
    );
    map.setAttribute("aria-label", `Map ${mission.size} by ${mission.size}`);
    const enemy = el(this.#document, "span", "v7-briefing-opponent");
    enemy.append(text(this.#document, "span", "vs", "v7-mission-versus"));
    for (const faction of opponents)
      enemy.append(
        this.#factionEmblem(faction),
        text(this.#document, "span", FACTION_LABELS[faction] ?? title(faction)),
      );
    facts.append(map, enemy);
    section.append(facts);
    const choices = campaignFactionChoicesV7(missionId, progress.completed);
    const chosen =
      this.#briefingFaction !== null && choices.includes(this.#briefingFaction)
        ? this.#briefingFaction
        : (choices[0] ?? null);
    this.#briefingFaction = chosen;
    const lead = el(this.#document, "div", "v7-briefing-lead");
    const leadEmblem = el(this.#document, "span", "v7-briefing-lead-emblem");
    if (chosen !== null) leadEmblem.append(this.#factionEmblem(chosen));
    if (choices.length > 1) {
      const field = select(
        this.#document,
        "You lead",
        "v7-campaign-faction",
        choices,
        chosen ?? "",
        FACTION_LABELS,
      );
      field.classList.add("v7-briefing-choice");
      field.querySelector("select")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        const next = choices.find((faction) => faction === value);
        if (next === undefined) return;
        this.#briefingFaction = next;
        leadEmblem.replaceChildren(this.#factionEmblem(next));
      });
      lead.append(leadEmblem, field);
    } else {
      const label = el(this.#document, "p", "v7-briefing-lead-text");
      label.append(
        text(this.#document, "span", "You lead", "v7-briefing-lead-label"),
        text(
          this.#document,
          "strong",
          chosen === null ? "–" : (FACTION_LABELS[chosen] ?? title(chosen)),
        ),
      );
      lead.append(leadEmblem, label);
    }
    section.append(lead);
    const actions = el(this.#document, "div", "button-row v7-briefing-actions");
    const start = button(
      this.#document,
      "Start mission",
      "campaign-start",
      "primary-action",
    );
    const status = campaignMissionStatusV7(chapter, entry, progress.completed);
    start.disabled = chosen === null || status === "LOCKED";
    start.onclick = () => {
      const faction = this.#briefingFaction;
      if (faction === null) return;
      const setup = missionMatchSetupV7(mission, faction);
      if (setup === null) {
        this.#error = "This mission can't be started.";
        this.#render();
        return;
      }
      void this.#launch(setup, replace);
    };
    const back = button(this.#document, "Back", "campaign-back");
    back.onclick = () => {
      this.#briefingMissionId = null;
      this.#frontFocus = `[data-action="mission-${missionId.toLowerCase()}"]`;
      this.#render();
    };
    actions.append(start, back);
    section.append(actions);
    return section;
  }

  /**
   * A faction emblem: its Fighter portrait (no new art, CAMPAIGN.md
   * section 1), in the faction's colour, with the placeholder badge where
   * the art is Human art.
   */
  #factionEmblem(
    faction: FactionIdV7,
    size: "normal" | "small" | "tiny" = "normal",
  ): HTMLElement {
    const frame = el(this.#document, "span", "v7-faction-emblem");
    frame.dataset.faction = faction;
    if (size !== "normal") frame.dataset.size = size;
    frame.setAttribute("aria-hidden", "true");
    const chibi = this.#chibiArt(
      portraitSubjectV7("FIGHTER", faction),
      size === "tiny"
        ? CHIBI_DOM_BOXES_V7.leaderboard
        : size === "small"
          ? CHIBI_DOM_BOXES_V7.passenger
          : CHIBI_DOM_BOXES_V7.action,
      factionColourV7(faction),
    );
    frame.append(
      factionBadgeArt(
        this.#document,
        chibi?.element ??
          art(this.#document, RULESET7_UNIT_ART_IDS.FIGHTER, ""),
        chibi?.factionArt === true ? null : factionBadgeV7(faction),
      ),
    );
    return frame;
  }

  #brand(): HTMLElement {
    const header = el(this.#document, "header", "v7-brand");
    header.append(text(this.#document, "h1", "Pulp Wars"));
    return header;
  }

  #setup(replace: boolean): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen");
    main.dataset.v7Setup = "true";
    main.append(this.#brand(), this.#modeSwitch());
    const form = el(this.#document, "form", "v7-setup-form");
    form.append(
      select(
        this.#document,
        "Opponents",
        "v7-ai-count",
        setupOpponentCountsV7().map(String),
        String(this.#draft.aiCount),
      ),
      select(
        this.#document,
        "Mode",
        "v7-ai-mode",
        ["RIVAL", "COOPERATIVE"],
        this.#draft.aiMode,
        AI_MODE_LABELS,
      ),
      select(
        this.#document,
        "Size",
        "v7-board-size",
        [String(effectiveBoardSize(this.#draft))],
        String(effectiveBoardSize(this.#draft)),
        BOARD_SIZE_LABELS,
      ),
      select(
        this.#document,
        "Map",
        "v7-map-type",
        MAP_TYPES,
        this.#draft.mapType,
        MAP_TYPE_LABELS,
      ),
      this.#sizeInfo(),
      text(
        this.#document,
        "p",
        mapTypeDescriptionV7(this.#draft.mapType),
        "v7-map-type-description",
      ),
      this.#curiositiesChoice(),
      this.#seedChoice(),
    );
    form.append(this.#factionFields());
    const launch = button(
      this.#document,
      replace ? "Start new game" : "Play",
      "launch",
      "primary-action v7-launch",
    );
    launch.type = "submit";
    form.append(launch);
    const mode = form.querySelector<HTMLSelectElement>("#v7-ai-mode");
    if (mode !== null) mode.title = AI_MODE_HINT_V7;
    const syncShowcase = (): void => this.#syncSetupFields(form);
    syncShowcase();
    form.addEventListener("change", () => {
      this.#readDraft(form);
      syncShowcase();
      const description = form.querySelector<HTMLElement>(
        ".v7-map-type-description",
      );
      if (description !== null)
        description.textContent = mapTypeDescriptionV7(this.#draft.mapType);
      const liveFactions =
        form.querySelector<HTMLElement>("[data-v7-factions]");
      if (
        liveFactions !== null &&
        liveFactions.querySelectorAll("select").length !==
          this.#draft.aiCount + 1
      )
        liveFactions.replaceWith(this.#factionFields());
      else if (liveFactions !== null)
        syncFactionFieldsV7(liveFactions, this.#draft, (faction) =>
          this.#factionEmblem(faction, "small"),
        );
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#readDraft(form);
      // "New map" draws its seed here, once per launch; the engine only
      // ever sees the resulting number.
      const setup = setupFrom(
        this.#draft.mapType === "SHOWCASE"
          ? { ...this.#draft, seedText: String(SHOWCASE_SEED) }
          : this.#draft.seedMode === "NEW"
            ? { ...this.#draft, seedText: String(this.#randomSeed() >>> 0) }
            : this.#draft,
      );
      if (setup === null) {
        this.#error = "Seed must be a whole number (0–4294967295).";
        this.#render();
        return;
      }
      void this.#launch(setup, replace);
    });
    main.append(form, this.#galleryEntry(), this.#ruleset6Link());
    return main;
  }

  /**
   * The line under Size and Map (map scale section 6.3): the villages of
   * the chosen board, the Crowded mark, and what the setup last changed by
   * itself. Filled by `#syncSetupFields`.
   */
  #sizeInfo(): HTMLElement {
    const info = el(this.#document, "div", "v7-setup-size-info");
    const crowded = el(this.#document, "span", "v7-chip v7-crowded-chip");
    crowded.title = CROWDED_HINT_V7;
    crowded.setAttribute("aria-description", CROWDED_HINT_V7);
    crowded.append(
      uiIconV7(this.#document, "attack"),
      text(this.#document, "span", CROWDED_LABEL_V7),
    );
    const note = el(this.#document, "span", "v7-setup-note");
    note.setAttribute("role", "status");
    note.setAttribute("aria-live", "polite");
    info.append(el(this.#document, "span", "v7-setup-villages"), crowded, note);
    return info;
  }

  /**
   * Brings Size, Map and the line under them in line with the draft, in
   * place (no control is replaced, focus stays). Size offers only the
   * sizes legal for the map type and the players, crowded ones marked; a
   * map type that cannot take the players at any size is disabled with the
   * reason. The Showcase forces 16 x 16 and ignores the seed: its Size
   * select is disabled and the seed group and Curiosities are hidden; they
   * come back, with the player's earlier choices, when another map is
   * chosen.
   */
  #syncSetupFields(form: HTMLElement): void {
    const draft = this.#draft;
    const showcase = draft.mapType === "SHOWCASE";
    form.dataset.v7Showcase = String(showcase);
    const sizes = setupSizeOptionsV7(draft.mapType, draft.aiCount);
    const effective = effectiveBoardSize(draft);
    const size = form.querySelector<HTMLSelectElement>("#v7-board-size");
    if (size !== null) {
      replaceOptions(
        this.#document,
        size,
        sizes.map((option) => String(option.size)),
        String(effective),
        Object.fromEntries(
          sizes.map((option) => [
            String(option.size),
            `${BOARD_SIZE_LABELS[String(option.size)] ?? option.size}${
              option.crowded ? ` · ${CROWDED_LABEL_V7}` : ""
            }`,
          ]),
        ),
      );
      for (const option of Array.from(size.options))
        option.dataset.crowded = String(
          sizes.some(
            (entry) => String(entry.size) === option.value && entry.crowded,
          ),
        );
      size.disabled = showcase;
      size.dataset.moved = String(this.#setupMoved.size);
    }
    const map = form.querySelector<HTMLSelectElement>("#v7-map-type");
    if (map !== null) {
      const options = setupMapOptionsV7(draft.aiCount);
      for (const option of Array.from(map.options)) {
        const entry = options.find(
          (candidate) => candidate.mapType === option.value,
        );
        if (entry === undefined) continue;
        const label = MAP_TYPE_LABELS[entry.mapType] ?? entry.mapType;
        const next = entry.enabled
          ? label
          : `${label} (${setupMapLimitReasonV7(entry)})`;
        option.disabled = !entry.enabled;
        if (option.textContent !== next) option.textContent = next;
      }
      if (map.value !== draft.mapType) map.value = draft.mapType;
      map.dataset.moved = String(this.#setupMoved.map);
    }
    const chosen = sizes.find((option) => option.size === effective);
    const villages = chosen === undefined ? null : setupVillageLineV7(chosen);
    const info = form.querySelector<HTMLElement>(".v7-setup-size-info");
    if (info !== null) {
      const line = info.querySelector<HTMLElement>(".v7-setup-villages");
      if (line !== null) {
        line.textContent = villages ?? "";
        line.hidden = villages === null;
      }
      const crowded = info.querySelector<HTMLElement>(".v7-crowded-chip");
      if (crowded !== null) crowded.hidden = chosen?.crowded !== true;
      const note = info.querySelector<HTMLElement>(".v7-setup-note");
      if (note !== null) {
        if (note.textContent !== this.#setupNote)
          note.textContent = this.#setupNote;
        note.hidden = this.#setupNote === "";
      }
      info.dataset.crowded = String(chosen?.crowded === true);
      info.hidden =
        villages === null && chosen?.crowded !== true && this.#setupNote === "";
    }
    const seed = form.querySelector<HTMLElement>(".v7-seed-choice");
    if (seed !== null) seed.hidden = showcase;
    // The Showcase never has curiosities: the checkbox is hidden (its
    // choice is kept for the next map).
    const curiosities = form.querySelector<HTMLElement>(
      ".v7-curiosities-choice",
    );
    if (curiosities !== null) curiosities.hidden = showcase;
  }

  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 3):
   * one checkbox, "Curiosities", checked by default, beside its label on
   * one row, with the hint as its tooltip and accessible description.
   */
  #curiositiesChoice(): HTMLElement {
    const label = this.#document.createElement("label");
    label.className = "v7-curiosities-choice";
    label.title = CURIOSITIES_SETUP_HINT_V7;
    const input = this.#document.createElement("input");
    input.type = "checkbox";
    input.id = "v7-curiosities";
    input.checked = this.#draft.curiosities;
    input.setAttribute("aria-description", CURIOSITIES_SETUP_HINT_V7);
    label.append(input, this.#document.createTextNode(" Curiosities"));
    return label;
  }

  /**
   * The two-state map choice: "New map" (default; a random seed is drawn at
   * launch) or "Use seed", which reveals the seed field. The field stays in
   * the form while hidden so the typed seed survives switching back.
   */
  #seedChoice(): HTMLElement {
    const group = el(this.#document, "div", "v7-seed-choice");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Map seed");
    const toggle = el(this.#document, "div", "v7-seed-toggle");
    const hint = text(
      this.#document,
      "p",
      "A new random map every game.",
      "v7-seed-hint",
    );
    const field = input(
      this.#document,
      "Seed",
      "v7-seed",
      this.#draft.seedText,
    );
    field.classList.add("v7-seed-field");
    const buttons = (["NEW", "SEED"] as const).map((mode) => {
      const option = button(
        this.#document,
        mode === "NEW" ? "New map" : "Use seed",
        mode === "NEW" ? "seed-mode-new" : "seed-mode-seed",
        "v7-seed-option",
      );
      option.onclick = () => {
        this.#draft = { ...this.#draft, seedMode: mode };
        sync();
        if (mode === "SEED") field.querySelector("input")?.focus();
      };
      return [mode, option] as const;
    });
    const sync = (): void => {
      const mode = this.#draft.seedMode;
      group.dataset.seedMode = mode.toLowerCase();
      for (const [candidate, option] of buttons)
        option.setAttribute("aria-pressed", String(candidate === mode));
      field.hidden = mode !== "SEED";
      hint.hidden = mode !== "NEW";
    };
    sync();
    toggle.append(...buttons.map(([, option]) => option));
    group.append(toggle, hint, field);
    return group;
  }

  /**
   * Per-seat faction choice: a compact grid with one cell per seat, the
   * faction's emblem (its Fighter portrait in the faction colour) beside
   * the seat's select. Every player plays a different faction
   * (docs/product/RULESET_7_UNIQUE_FACTIONS.md): an opponent's select
   * disables the factions other seats play, and the human's choice moves
   * an opponent who played it to a free faction.
   */
  #factionFields(): HTMLElement {
    const fieldset = el(this.#document, "fieldset", "v7-setup-factions");
    fieldset.dataset.v7Factions = "true";
    fieldset.dataset.seats = String(this.#draft.aiCount + 1);
    fieldset.append(
      text(this.#document, "legend", "Factions"),
      text(this.#document, "p", FACTIONS_HINT_V7, "v7-setup-factions-hint"),
    );
    for (let seat = 0; seat <= this.#draft.aiCount; seat += 1) {
      const faction = this.#draft.factions[seat] ?? "ORIGINAL";
      const cell = el(this.#document, "div", "v7-setup-seat");
      cell.dataset.seat = String(seat);
      cell.dataset.faction = faction;
      cell.style.setProperty("--player", factionColourV7(faction));
      cell.append(
        this.#factionEmblem(faction, "small"),
        select(
          this.#document,
          seat === 0 ? "Your faction" : `${playerName(seat)} faction`,
          `v7-faction-${seat}`,
          FACTIONS,
          faction,
          FACTION_LABELS,
        ),
      );
      fieldset.append(cell);
    }
    syncFactionFieldsV7(fieldset, this.#draft, (faction) =>
      this.#factionEmblem(faction, "small"),
    );
    return fieldset;
  }

  #resume(): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen");
    const view = this.#snapshot.view;
    // A campaign mission is labelled by its number and name (CAMPAIGN.md
    // section 4.2): "Mission 2 · The Warrens · Turn 7".
    const mission =
      view?.setup.mission === undefined
        ? null
        : campaignMissionV7(view.setup.mission.id);
    const summary = text(
      this.#document,
      "p",
      view === null
        ? "A saved game is waiting."
        : mission !== null
          ? `Mission ${mission.entry.number} · ${mission.entry.name} · Turn ${view.round}`
          : `Turn ${view.round} · ${view.viewer.coins} coins · ${playerCountLabelV7(view)} · ${MAP_TYPE_LABELS[view.setup.mapType] ?? title(view.setup.mapType)}`,
      "v7-resume-summary",
    );
    if (mission !== null) summary.dataset.missionId = mission.entry.missionId;
    main.append(this.#brand(), text(this.#document, "h2", "Continue"), summary);
    const actions = el(this.#document, "div", "button-row");
    const resume = button(this.#document, "Resume", "resume", "primary-action");
    resume.onclick = () => void this.#resumeMatch();
    const replace = button(this.#document, "New game", "show-replace");
    replace.onclick = () => {
      this.#replacing = true;
      this.#render();
    };
    const remove = button(
      this.#document,
      "Delete",
      "delete-save",
      "destructive",
    );
    remove.onclick = () => void this.#deleteSave();
    actions.append(resume, replace, remove);
    main.append(actions, this.#galleryEntry(), this.#ruleset6Link());
    return main;
  }

  #recovery(): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen");
    main.append(
      this.#brand(),
      text(this.#document, "h2", "Save can't be loaded"),
      text(
        this.#document,
        "p",
        "This saved game can't be opened by this version.",
        "v7-recovery-summary",
      ),
    );
    const diagnostic = this.#snapshot.recovery?.diagnostic;
    if (diagnostic !== undefined) {
      const details = this.#document.createElement("details");
      details.className = "v7-recovery-details";
      details.append(
        text(this.#document, "summary", "Details"),
        text(this.#document, "p", diagnostic),
      );
      main.append(details);
    }
    const remove = button(
      this.#document,
      "Delete save",
      "delete-save",
      "destructive",
    );
    remove.onclick = () => void this.#deleteSave();
    main.append(remove, this.#ruleset6Link());
    return main;
  }

  /**
   * The front screen's Gallery entry (bead pulp_wars-ic8): every faction's
   * units and buildings side by side, in the live CHIBI look.
   */
  #galleryEntry(): HTMLButtonElement {
    const entry = button(
      this.#document,
      "Gallery",
      "gallery",
      "secondary-action v7-gallery-entry",
    );
    entry.onclick = () => this.#openGallery();
    return entry;
  }

  #openGallery(): void {
    this.#galleryOpen = true;
    this.#gallery ??= new GalleryViewV7(this.#document, {
      storage: this.#settingsStorage,
      onBack: () => this.#closeGallery(),
      motion: () => this.#motion,
      ...(this.#chibiDomEnvironment === null
        ? {}
        : { domEnvironment: this.#chibiDomEnvironment }),
      ...(this.#galleryDemoHost === undefined
        ? {}
        : { createDemoHost: this.#galleryDemoHost }),
    });
    this.#render();
    this.#gallery.focus();
  }

  #closeGallery(): void {
    this.#galleryOpen = false;
    this.#gallery?.suspend();
    this.#render();
    this.#root.querySelector<HTMLElement>('[data-action="gallery"]')?.focus();
  }

  /**
   * The open Gallery in the app shell. It keeps its own state (filters,
   * scroll, the open detail and its preview), so a redraw of the front
   * screen while it is open leaves it in place.
   */
  #renderGallery(): void {
    const gallery = this.#gallery;
    if (gallery === null) return;
    if (gallery.root.isConnected && this.#root.contains(gallery.root)) return;
    const shell = el(this.#document, "div", "v7-app-shell");
    shell.dataset.phase = "gallery";
    shell.append(gallery.root);
    this.#root.replaceChildren(shell);
  }

  #ruleset6Link(): HTMLAnchorElement {
    const link = this.#document.createElement("a");
    const params = new URLSearchParams({ ruleset: "6" });
    if (
      new URLSearchParams(this.#document.defaultView?.location.search).get(
        "browser-smoke",
      ) === "1"
    )
      params.set("browser-smoke", "1");
    link.className = "v7-compatibility-link";
    link.dataset.route = "ruleset-6";
    link.href = `?${params.toString()}`;
    link.textContent = "Classic rules (Ruleset 6)";
    return link;
  }

  #renderStableMatch(view: PlayerViewV7): void {
    const showAchievementNotice =
      (this.#snapshot.phase === "ACTIVE" ||
        this.#snapshot.phase === "COMPLETE") &&
      view.pendingChoices.length === 0 &&
      this.#achievementNotices.length > 0;
    let shell = this.#matchShell;
    let main = this.#matchRoot;
    let board = this.#boardContainer;
    if (
      shell === null ||
      main === null ||
      board === null ||
      !main.isConnected
    ) {
      shell = el(this.#document, "div", "v7-app-shell v7-match-shell");
      main = el(this.#document, "main", "v7-match-root");
      board = el(this.#document, "div", "v7-board-host");
      main.append(board);
      shell.append(
        live(this.#document, "v7-live", this.#notice, "polite"),
        live(this.#document, "v7-alert", this.#error, "assertive"),
        main,
      );
      this.#root.replaceChildren(shell);
      this.#matchShell = shell;
      this.#matchRoot = main;
      this.#boardContainer = board;
      this.#boardHost.mount(board, {
        onSelection: (selection) => {
          this.#selection = selection;
          this.#kaboomArmedUnitId = null;
          this.#kaboomHoverUnitId = null;
          this.#areaSupportHover = null;
          this.#layEggPick = null;
          this.#martianPick = null;
          this.#iceFolkPick = null;
          this.#dwarfPick = null;
          this.#candyPick = null;
          this.#navalPick = null;
          this.#selectedRecruitHelp = null;
          this.#selectedUnitHelpId = null;
          this.#selectedModifier = null;
          this.#render();
        },
        onCommand: (target) => void this.#handleMapCommand(target),
      });
    }
    const liveNode = shell.querySelector<HTMLElement>("#v7-live");
    const alertNode = shell.querySelector<HTMLElement>("#v7-alert");
    if (liveNode !== null && liveNode.textContent !== this.#notice) {
      liveNode.replaceChildren();
      appendEconomyText(this.#document, liveNode, this.#notice);
    }
    if (alertNode !== null) alertNode.textContent = this.#error;
    const nextChildren: HTMLElement[] = [];
    this.#unitHelpModal = null;
    if (view.pendingChoices.length > 0) {
      this.#selectedRecruitHelp = null;
      this.#selectedUnitHelpId = null;
    }
    const activeId = view.turnOrder[view.activeSeatIndex];
    const active = view.players.find((player) => player.id === activeId);
    const humanTurn = active?.controller === "HUMAN";
    const hud = el(this.#document, "header", "v7-match-hud");
    hud.dataset.v7Region = "hud";
    const projectedIncome = view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .reduce(
        (sum, city) => sum + (cityIncomeForViewerV7(view, city.id) ?? 0),
        0,
      );
    const stats = el(this.#document, "div", "v7-hud-stats");
    const economy = el(this.#document, "p", "v7-coins");
    const rate = el(this.#document, "span", "v7-income-rate");
    rate.textContent = `${projectedIncome >= 0 ? "+" : ""}${projectedIncome}`;
    rate.setAttribute(
      "aria-label",
      `Projected next-turn income ${projectedIncome} Coins`,
    );
    economy.append(
      economyIcon(this.#document, "coin"),
      text(
        this.#document,
        "span",
        String(view.viewer.coins),
        "v7-coin-balance",
      ),
      rate,
    );
    economy.setAttribute(
      "aria-label",
      `${view.viewer.coins} Coins. ${incomeDescription(view)}`,
    );
    economy.title = `Coins (+${projectedIncome} next turn)`;
    const round = text(
      this.#document,
      "p",
      `Turn ${view.round}`,
      "v7-hud-round",
    );
    const status = el(this.#document, "p", "v7-turn-status");
    if (this.#snapshot.phase === "COMPLETE") status.textContent = "Game over";
    else if (humanTurn) status.textContent = "Your turn";
    else this.#fillAiStatus(status);
    status.dataset.v7AiProgress = "true";
    status.dataset.turn =
      this.#snapshot.phase === "COMPLETE"
        ? "done"
        : humanTurn
          ? "human"
          : "other";
    stats.append(economy, round, status);
    const strip = this.#turnStrip(view);
    if (strip !== null) stats.append(strip);
    const nav = el(this.#document, "nav", "v7-hud-nav");
    nav.setAttribute("aria-label", "Game");
    nav.dataset.compactMenu = this.#compactMenuOpen ? "open" : "closed";
    const blocked = view.pendingChoices.length > 0;
    const tech = iconButton(this.#document, "tech", "Tech", "tech", true);
    tech.classList.add("v7-hud-tech");
    tech.onclick = () => {
      this.#compactMenuOpen = false;
      this.#open("TECH", "tech");
    };
    tech.disabled = blocked;
    const compactMenu = iconButton(
      this.#document,
      "menu",
      "Menu",
      "compact-menu",
    );
    compactMenu.classList.add("v7-compact-menu-toggle");
    compactMenu.setAttribute("aria-expanded", String(this.#compactMenuOpen));
    compactMenu.setAttribute("aria-controls", "v7-hud-menu");
    compactMenu.onclick = () => {
      this.#compactMenuOpen = !this.#compactMenuOpen;
      this.#pendingFocusAction = "compact-menu";
      this.#render();
    };
    nav.append(tech, compactMenu);
    if (this.#compactMenuOpen) {
      const menu = el(this.#document, "div", "v7-hud-menu");
      menu.id = "v7-hud-menu";
      for (const [label, screen, action] of [
        ["Leaderboard", "LEADERBOARD", "leaderboard"],
        ["Achievements", "ACHIEVEMENTS", "achievements"],
        ["Help", "HELP", "help"],
        ["Settings", "SETTINGS", "settings"],
      ] as const) {
        const item = button(this.#document, label, action, "v7-menu-item");
        item.onclick = () => {
          this.#compactMenuOpen = false;
          this.#open(screen, "compact-menu");
        };
        item.disabled = blocked;
        menu.append(item);
      }
      if (this.#snapshot.phase === "ACTIVE") {
        const mainMenu = button(
          this.#document,
          "Save & quit",
          "main-menu",
          "v7-menu-item v7-main-menu-action",
        );
        mainMenu.onclick = () => void this.#returnToMenu();
        menu.append(mainMenu);
      }
      nav.append(menu);
    }
    hud.append(stats, nav);
    const endTurn = this.#snapshot.offeredCommands.find(
      (candidate) => candidate.kind === "END_TURN",
    );
    if (endTurn !== undefined) {
      const end = button(
        this.#document,
        "End turn",
        "end-turn",
        "v7-hud-end-turn",
      );
      // Section 10: how many own units recover by themselves at this End
      // Turn (a heal icon and the count; never a unit or a coordinate).
      const recovering = queryIdleRecoveryV7(view).length;
      if (recovering > 0) {
        const label = endTurnRecoveryLabelV7(recovering);
        const hint = el(this.#document, "span", "v7-end-turn-recover");
        hint.dataset.endTurnRecover = String(recovering);
        hint.setAttribute("aria-hidden", "true");
        hint.append(
          uiIconV7(this.#document, "hp", "v7-ui-icon v7-end-turn-recover-icon"),
          text(this.#document, "span", String(recovering)),
        );
        end.append(hint);
        end.title = label;
        end.setAttribute("aria-label", `End turn. ${label}.`);
      }
      end.onclick = () => void this.#dispatch(endTurn);
      end.disabled = this.#localBusy() || blocked;
      nav.append(end);
    }
    nextChildren.push(hud);
    const zoom = el(this.#document, "div", "v7-zoom-controls");
    zoom.dataset.v7Region = "zoom";
    const zoomIn = iconButton(this.#document, "zoom-in", "Zoom in", "zoom-in");
    zoomIn.onclick = () => this.#boardHost.zoom("IN");
    const zoomOut = iconButton(
      this.#document,
      "zoom-out",
      "Zoom out",
      "zoom-out",
    );
    zoomOut.onclick = () => this.#boardHost.zoom("OUT");
    zoom.append(zoomIn, zoomOut);
    nextChildren.push(zoom);
    const toastMessage =
      this.#error !== ""
        ? { id: -1, text: this.#error, kind: "error" as const }
        : this.#toast;
    if (toastMessage !== null) {
      const toast = text(
        this.#document,
        "p",
        toastMessage.text,
        toastMessage.kind === "error" ? "v7-toast v7-toast-error" : "v7-toast",
      );
      toast.dataset.v7Region = "toast";
      toast.dataset.toastId = String(toastMessage.id);
      nextChildren.push(toast);
    }
    // Every render rebuilds the dock. On narrow screens it can exceed its
    // height cap and scroll vertically, so remember where the outgoing dock
    // was scrolled and put the new one back there while the same selection
    // stays selected; a different selection starts at the top.
    const previousDockScroll = dockScrollPosition(main);
    // Every render rebuilds the technology screen too. It keeps where the
    // screen was scrolled (a phone shows one branch at a time), and a render
    // that nobody asked a focus of (interface art settling) keeps the
    // focused control, so the technology a research prompt opened on stays
    // in view with its Research control ready (bead pulp_wars-gl1).
    const techBefore = main.querySelector<HTMLElement>(
      '[data-v7-region="overlay-tech"]',
    );
    const techScroll =
      techBefore === null
        ? null
        : {
            top: techBefore.scrollTop,
            left:
              techBefore.querySelector<HTMLElement>(".v7-tech-graph")
                ?.scrollLeft ?? 0,
          };
    const focusedBefore = this.#document.activeElement;
    const techFocusAction =
      focusedBefore instanceof HTMLElement &&
      focusedBefore.closest('[data-v7-region="overlay-tech"]') !== null
        ? (focusedBefore.dataset.action ?? null)
        : null;
    const dock =
      this.#selection === null ? null : this.#dock(view, this.#selection);
    if (dock !== null) {
      dock.dataset.v7Region = "dock";
      nextChildren.push(dock);
    }
    if (
      this.#unitHelpModal !== null &&
      !showAchievementNotice &&
      view.pendingChoices.length === 0
    )
      nextChildren.push(this.#unitHelpModal);
    if (this.#snapshot.ai.active) {
      const fast = iconButton(
        this.#document,
        "skip",
        "Skip",
        "fast-forward",
        true,
      );
      fast.classList.add("v7-fast-forward");
      fast.setAttribute("aria-label", "Fast forward opponent turns");
      if (this.#snapshot.ai.fastForward) fast.classList.add("is-active");
      fast.onclick = () => {
        this.#cancelPresentations();
        this.#controller.setFastForward(true);
      };
      fast.dataset.v7Region = "fast-forward";
      nextChildren.push(fast);
    }
    if (
      this.#snapshot.phase === "ACTIVE" &&
      this.#screen !== "MATCH" &&
      view.pendingChoices.length === 0 &&
      !showAchievementNotice
    )
      nextChildren.push(this.#overlay(view));
    if (
      this.#snapshot.phase === "ACTIVE" &&
      this.#screen === "MATCH" &&
      this.#selectedRecruitHelp !== null &&
      view.pendingChoices.length === 0 &&
      !showAchievementNotice
    )
      nextChildren.push(this.#recruitHelp(this.#selectedRecruitHelp));
    if (view.pendingChoices[0] !== undefined)
      nextChildren.push(this.#reward(view));
    else if (showAchievementNotice)
      nextChildren.push(this.#achievementNotice());
    if (this.#snapshot.phase === "COMPLETE" && !showAchievementNotice)
      nextChildren.push(this.#results(view));
    if (this.#snapshot.phase === "ERROR") nextChildren.push(this.#errorPanel());
    if (this.#snapshot.saveWarning !== null) {
      const warning = text(
        this.#document,
        "p",
        `Save warning: ${this.#snapshot.saveWarning}`,
        "v7-warning v7-match-warning",
      );
      warning.setAttribute("role", "status");
      warning.setAttribute("aria-live", "polite");
      warning.dataset.v7Region = "save-warning";
      nextChildren.push(warning);
    }
    // Every popup dims the rest of the screen with a scrim that also takes
    // the pointer, so no click reaches the board or HUD behind it.
    const popup = nextChildren.find(
      (child) => child.getAttribute("aria-modal") === "true",
    );
    if (popup !== undefined) nextChildren.push(this.#scrim(popup));
    reconcileMatchChildren(main, board, nextChildren);
    if (
      dock !== null &&
      previousDockScroll !== null &&
      previousDockScroll.key === dock.dataset.selectionKey
    )
      dock.scrollTop = previousDockScroll.top;
    if (techScroll !== null && popup?.dataset.v7Region === "overlay-tech") {
      popup.scrollTop = techScroll.top;
      const graph = popup.querySelector<HTMLElement>(".v7-tech-graph");
      if (graph !== null) graph.scrollLeft = techScroll.left;
    }
    shell.dataset.contrast = this.#highContrast ? "high" : "standard";
    shell.dataset.uiScale = String(this.#uiScale);
    shell.style.setProperty("--ui-scale", String(this.#uiScale));
    this.#boardHost.update(this.#boardModel(view));
    this.#syncModalIsolation(main);
    const focusAction = this.#pendingFocusAction;
    this.#pendingFocusAction = null;
    if (focusAction !== null)
      queueMicrotask(() => {
        if (this.#destroyed) return;
        main
          .querySelector<HTMLButtonElement>(`[data-action="${focusAction}"]`)
          ?.focus();
      });
    else if (techFocusAction !== null && this.#screen === "TECH")
      queueMicrotask(() => {
        if (this.#destroyed) return;
        main
          .querySelector<HTMLButtonElement>(
            `[data-v7-region="overlay-tech"] [data-action="${techFocusAction}"]`,
          )
          ?.focus();
      });
  }

  #boardModel(view: PlayerViewV7): Parameters<BoardHostV7["update"]>[0] {
    const activeId = view.turnOrder[view.activeSeatIndex];
    const selectedUnitId =
      this.#selection?.kind === "UNIT" ? this.#selection.unitId : null;
    const kaboomUnitId = this.#kaboomArmedUnitId ?? this.#kaboomHoverUnitId;
    return {
      matchInstanceId: this.#matchInstance,
      view,
      offeredCommands: this.#snapshot.offeredCommands,
      interactive:
        this.#screen === "MATCH" &&
        activeId === view.humanPlayerId &&
        !this.#snapshot.transitioning &&
        !this.#presentationActive &&
        this.#achievementNotices.length === 0 &&
        view.pendingChoices.length === 0,
      motion: this.#motion,
      animationSpeed: this.#animationSpeed,
      presentationPaused: this.#screen === "SETTINGS",
      highContrast: this.#highContrast,
      artSet: this.#artSet,
      saturation: this.#boardSaturation,
      // The new visual direction is the CHIBI set's default look; the
      // classic look and the LEGACY set carry no direction at all.
      ...liveBoardLookV7(this.#artSet, this.#classicLook),
      interaction: {
        selection: this.#selection,
        selectedUnitId,
        selectedAchievement: null,
        // Revision 17: the hovered, focused or armed Kaboom! of the selected
        // unit previews its blast on the board.
        ...(kaboomUnitId !== null && kaboomUnitId === selectedUnitId
          ? { kaboomPreviewUnitId: kaboomUnitId }
          : {}),
        // Bead pulp_wars-621: the hovered or focused area support button
        // of the selected unit makes its recipients' marks prominent.
        ...(this.#areaSupportHover !== null &&
        this.#areaSupportHover.unitId === selectedUnitId
          ? { areaSupportFocus: this.#areaSupportHover }
          : {}),
        // Revision 19: the nest tiles of the Egg being laid.
        ...(this.#layEggPick !== null &&
        this.#selection?.kind === "CITY" &&
        this.#selection.cityId === this.#layEggPick.cityId
          ? { layEgg: this.#layEggPick }
          : {}),
        // The Martian revision: the ability the selected unit is aiming.
        ...(this.#martianPick !== null &&
        this.#martianPick.unitId === selectedUnitId
          ? { martianPick: this.#martianPick }
          : {}),
        // The Ice Folk revision: the Bolas or Cold Snap being aimed.
        ...(this.#iceFolkPick !== null &&
        this.#iceFolkPick.unitId === selectedUnitId
          ? { iceFolkPick: this.#iceFolkPick }
          : {}),
        // The Dwarf revision: the Tunnel, Bomb Run or Assemble being aimed.
        ...(this.#dwarfPick !== null &&
        this.#dwarfPick.unitId === selectedUnitId
          ? { dwarfPick: this.#dwarfPick }
          : {}),
        // The Candy revision: the armed Rush, or the Re-bake or Sugar Toss
        // being aimed.
        ...(this.#candyPick !== null &&
        this.#candyPick.unitId === selectedUnitId
          ? { candyPick: this.#candyPick }
          : {}),
        // The naval branch interface: the Board being aimed.
        ...(this.#navalPick !== null &&
        this.#navalPick.unitId === selectedUnitId
          ? { navalPick: this.#navalPick }
          : {}),
      },
    };
  }

  #dock(view: PlayerViewV7, selection: BoardSelectionV7): HTMLElement | null {
    const dock = el(this.#document, "section", "v7-selection-dock");
    dock.dataset.selectionKind = selection.kind.toLowerCase();
    dock.dataset.selectionKey = selectionKey(selection);
    dock.dataset.hasActions = "false";
    dock.setAttribute("aria-label", "Selected map object");
    const close = iconButton(this.#document, "close", "Close", "close-dock");
    close.classList.add("close-button");
    close.onclick = () => {
      this.#selection = null;
      this.#layEggPick = null;
      this.#martianPick = null;
      this.#iceFolkPick = null;
      this.#dwarfPick = null;
      this.#candyPick = null;
      this.#navalPick = null;
      this.#render();
      this.#queueBoardFocus();
    };
    if (selection.kind === "UNIT") {
      const unit = view.units.find(
        (candidate) => candidate.id === selection.unitId,
      );
      if (unit === undefined) return null;
      const roleRule = unitRoleRuleV7(view, unit);
      // Revision 19: an Egg is named after the unit inside ("Raptor Egg").
      const egg = unit.form === "EGG";
      const eggTurns = egg ? eggTurnsRemainingV7(view, unit.id) : null;
      // The Martian revision: a machine afloat is drawn as itself; the Mind
      // Control revision: a controlled unit keeps its own name and sprite.
      const machine = martianMachineV7(view, unit);
      const roleLabel = egg ? `${roleRule.label} Egg` : roleRule.label;
      const undeadUnit = unitIsUndeadV7(view, unit);
      // Revision 17: every unit resolves through its owner's faction; the
      // Mind Control revision: through its kind (`unitFactionV7`).
      const unitFaction = presentedUnitFactionV7(view, unit);
      const unitBadge: FactionBadgeV7 = factionBadgeV7(unitFaction);
      // Map curiosities: the neutral Giant Spider shows its portrait (a
      // code-drawn spider in LEGACY and the classic look) and no badge.
      const monster = isMonsterUnitV7(unit);
      const unitSubject: ArtSubjectV7 = monster
        ? "PORTRAIT:MONSTER_GIANT_SPIDER"
        : unitArtSubjectV7({
            ...unit,
            faction: unitFaction,
            machine,
          });
      const transportArt = unit.form === "EMBARKED" && !machine;
      const unitColour = this.#playerColour(view, unit.ownerId);
      const dockArt = this.#chibiArt(
        unitSubject,
        CHIBI_DOM_BOXES_V7.dock,
        unitColour,
      );
      // The Egg has no legacy raster: LEGACY (and CHIBI without its sprite)
      // shows a code-drawn Egg in the owner's colour, and never a badge.
      const eggFigure =
        egg && dockArt === null
          ? eggFigureV7(this.#document, unitColour)
          : monster && dockArt === null
            ? spiderFigureV7(this.#document)
            : undefined;
      dock.append(
        identity(
          this.#document,
          transportArt
            ? "unit-shared-embarked-transport"
            : RULESET7_UNIT_ART_IDS[unit.role],
          unit.form === "EMBARKED"
            ? `${roleLabel} (${machine ? "afloat" : "at sea"})`
            : roleLabel,
          true,
          dockArt?.factionArt === true || egg ? null : unitBadge,
          dockArt?.element ?? eggFigure,
          eggFigure === undefined ? "chibi" : "code",
        ),
      );
      // The Mind Control revision (section 9): a controlled unit's badge
      // names its controller and original owner, so no owner line.
      const control = mindControlledInfoV7(view, unit);
      if (unit.ownerId !== view.viewer.id && control === null) {
        const owner = view.players.find((player) => player.id === unit.ownerId);
        if (owner !== undefined)
          dock
            .querySelector(".v7-identity")
            ?.append(
              text(
                this.#document,
                "span",
                playerName(owner.seat),
                "v7-identity-owner",
              ),
            );
      }
      const identityColumn = dock.querySelector<HTMLElement>(".v7-identity");
      // Map curiosities (section 12.1): the Spider belongs to nobody.
      const monsterLines = monster ? monsterInfoLinesV7(view, unit.id) : [];
      if (monster) {
        const neutral = text(
          this.#document,
          "span",
          NEUTRAL_LABEL_V7,
          "v7-chip v7-neutral-chip",
        );
        neutral.dataset.unitStatus = "neutral";
        identityColumn?.append(neutral);
        const provoked = monsterLines.find((line) => line.id === "provoked");
        if (provoked !== undefined) {
          const cue = text(
            this.#document,
            "span",
            provoked.name,
            "v7-chip v7-neutral-chip",
          );
          cue.dataset.unitStatus = "provoked";
          cue.title = provoked.description;
          cue.setAttribute(
            "aria-label",
            `${provoked.name}. ${provoked.description}`,
          );
          identityColumn?.append(cue);
        }
      }
      if (unitBadge !== null) {
        const faction = text(
          this.#document,
          "span",
          factionNameV7(unitBadge),
          "v7-chip v7-faction-chip",
        );
        faction.dataset.faction = unitBadge.toLowerCase();
        identityColumn?.append(faction);
      }
      if (!egg)
        identityColumn?.append(
          text(
            this.#document,
            "span",
            title(roleRule.tacticalRole),
            "v7-tactical-role",
          ),
        );
      const unitHelp = button(this.#document, "", "unit-help", "v7-unit-help");
      unitHelp.append(text(this.#document, "span", "?", "v7-unit-help-glyph"));
      unitHelp.setAttribute("aria-label", `About ${roleLabel}`);
      unitHelp.title = `About ${roleLabel}`;
      unitHelp.onclick = () => {
        this.#selectedUnitHelpId = unit.id;
        this.#pendingFocusAction = null;
        this.#render();
      };
      identityColumn?.append(unitHelp);
      const unitDetails = el(this.#document, "div", "v7-unit-help-details");
      if (egg && eggTurns !== null)
        unitDetails.append(
          text(
            this.#document,
            "p",
            eggInfoTextV7(roleRule.label, eggTurns),
            "v7-egg-info",
          ),
        );
      if (unit.form === "EMBARKED" && machine)
        unitDetails.append(
          text(
            this.#document,
            "p",
            "Afloat: crossing water as a transport. It cannot attack or use abilities until it lands on a highlighted shore tile.",
            "v7-transport-passenger",
          ),
          text(this.#document, "p", AT_SEA_MOVE_TEXT_V7, "v7-transport-move"),
        );
      else if (unit.form === "EMBARKED")
        unitDetails.append(
          text(
            this.#document,
            "p",
            unitRoleRuleV7(view, unit).abilities.includes("CAPTURE")
              ? "Carrying troops. Pick a highlighted shore tile to land."
              : "Carrying troops that can't capture. Pick a highlighted shore tile to land.",
            "v7-transport-passenger",
          ),
          text(this.#document, "p", AT_SEA_MOVE_TEXT_V7, "v7-transport-move"),
        );
      if (unit.role === "KNIGHT" && unit.activation.overrunActive) {
        const state = el(this.#document, "section", "v7-tactical-state");
        state.dataset.tacticalState = "overrun";
        state.append(
          text(
            this.#document,
            "strong",
            // Revision 17: Overrun is labelled Ram for Scrap Buggies;
            // revision 19: Rampage for a T-Rex.
            unitFaction === "GOBLIN"
              ? "Ram: attack again"
              : unitFaction === "DINOSAUR"
                ? "Rampage: attack again"
                : "Overrun: attack again",
          ),
        );
        unitDetails.append(state);
      }
      if (unit.activation.escapeAvailable) {
        const state = el(this.#document, "section", "v7-tactical-state");
        state.dataset.tacticalState = "escape";
        state.append(text(this.#document, "strong", "Escape: may move again"));
        unitDetails.append(state);
      }
      if (restlessOutsideTerritoryV7(view, unit)) {
        const state = el(this.#document, "section", "v7-tactical-state");
        state.dataset.tacticalState = "restless";
        state.append(
          text(this.#document, "strong", "Restless: no recovery here"),
          text(this.#document, "span", RESTLESS_EXPLANATION_V7),
        );
        unitDetails.append(state);
        const cue = text(this.#document, "span", "Restless", "v7-chip");
        cue.dataset.unitStatus = "restless";
        cue.setAttribute("aria-label", RESTLESS_EXPLANATION_V7);
        cue.title = RESTLESS_EXPLANATION_V7;
        identityColumn?.append(cue);
      }
      // Section 10: an idle wounded own unit recovers by itself at End Turn.
      const idleRecovery =
        this.#snapshot.offeredCommands.length === 0
          ? undefined
          : queryIdleRecoveryV7(view).find((entry) => entry.unitId === unit.id);
      if (idleRecovery !== undefined) {
        const explanation = idleRecoveryExplanationV7(idleRecovery.amount);
        const cue = text(
          this.#document,
          "span",
          idleRecoveryChipV7(idleRecovery.amount),
          "v7-chip v7-idle-recovery-chip",
        );
        cue.dataset.unitStatus = "idle-recovery";
        cue.setAttribute("aria-label", explanation);
        cue.title = explanation;
        identityColumn?.append(cue);
        const state = el(this.#document, "section", "v7-tactical-state");
        state.dataset.tacticalState = "idle-recovery";
        state.append(text(this.#document, "strong", explanation));
        unitDetails.append(state);
      }
      if (view.graves.some((grave) => same(grave, unit.at))) {
        const grave = text(this.#document, "span", "On a Grave", "v7-chip");
        grave.dataset.unitStatus = "grave";
        identityColumn?.append(grave);
      }
      // Revision 14: public Plague and Bitten statuses, with a one-sentence
      // explanation in the chip's accessible name and in the ? details.
      for (const affliction of unitAfflictionsV7(view, unit.id)) {
        const cue = el(this.#document, "span", "v7-chip v7-affliction-chip");
        cue.dataset.unitStatus = affliction.id.toLowerCase();
        cue.setAttribute("role", "img");
        cue.setAttribute(
          "aria-label",
          `${affliction.chip}. ${affliction.explanation}`,
        );
        cue.title = affliction.explanation;
        cue.append(
          uiIconV7(
            this.#document,
            affliction.id === "PLAGUE" ? "plague" : "bite",
          ),
          text(this.#document, "span", affliction.chip),
        );
        identityColumn?.append(cue);
        const state = el(this.#document, "section", "v7-tactical-state");
        state.dataset.tacticalState = affliction.id.toLowerCase();
        state.append(
          text(this.#document, "strong", affliction.chip),
          text(this.#document, "span", affliction.explanation),
        );
        unitDetails.append(state);
      }
      const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
      // Revision 19: the Egg's countdown, capacity slots, and the growth
      // stage with the kills to the next one, from the public stats.
      const dinosaur = stats?.dinosaur;
      if (dinosaur !== undefined) {
        if (egg && eggTurns !== null) {
          const countdown = text(
            this.#document,
            "span",
            eggCountdownTextV7(eggTurns),
            "v7-chip v7-dinosaur-chip",
          );
          countdown.dataset.unitStatus = "egg-countdown";
          identityColumn?.append(countdown);
        }
        if (egg || dinosaur.capacitySlots > 1) {
          const slots = text(
            this.#document,
            "span",
            slotsTextV7(dinosaur.capacitySlots),
            "v7-chip v7-dinosaur-chip",
          );
          slots.dataset.unitStatus = "slots";
          slots.title = `Takes ${slotsTextV7(dinosaur.capacitySlots)} in its city`;
          identityColumn?.append(slots);
        }
        if (dinosaur.growthStage !== null) {
          const growth = text(
            this.#document,
            "span",
            growthChipTextV7(dinosaur.growthStage, dinosaur.killsToNextStage),
            "v7-chip v7-dinosaur-chip",
          );
          growth.dataset.unitStatus = "growth";
          growth.dataset.growthStage = String(dinosaur.growthStage);
          growth.title = growthTooltipV7();
          identityColumn?.append(growth);
        }
      }
      // The Martian revision (section 13.1): the Shield, Cooling, and a
      // Brain's controlled units and cooldown, from `stats.martian`.
      const martian = stats?.martian;
      if (martian !== undefined) {
        const chip = (
          label: string,
          status: string,
          title: string,
        ): HTMLElement => {
          const cue = text(
            this.#document,
            "span",
            label,
            "v7-chip v7-martian-chip",
          );
          cue.dataset.unitStatus = status;
          cue.title = title;
          cue.setAttribute("aria-label", title);
          identityColumn?.append(cue);
          return cue;
        };
        if (martian.shieldMaximum > 0) {
          const shield = chip(
            shieldTextV7(martian),
            "shield",
            `${shieldTextV7(martian)}. Takes damage before HP.`,
          );
          if (martian.shield > martian.shieldMaximum)
            shield.dataset.forceField = "true";
        }
        // The ray's power now (section 13.1): Cooling, or "Full power" /
        // "Half power: moved".
        const ray = rayPowerTextV7(martian);
        if (martian.cooling)
          chip(COOLING_LABEL_V7, "cooling", COOLING_TOOLTIP_V7);
        else if (ray !== null)
          chip(
            ray,
            "ray-power",
            martian.rayPower === "FULL"
              ? "Full power: its next shot fires at full Attack and leaves it Cooling"
              : "Half power: it moved this turn",
          );
        if (martian.mindControl !== null) {
          const blocked = mindControlUnavailableTextV7(martian.mindControl);
          const controls = chip(
            brainControlTextV7(martian.mindControl),
            "controlled",
            blocked ?? `${MIND_CONTROL_LABEL_V7} is ready`,
          );
          // The Mind Control revision (section 9): the portrait of each
          // unit this Brain controls, in its chip.
          for (const entry of view.mindControlled) {
            if (entry.brainUnitId !== unit.id) continue;
            const held = view.units.find(
              (candidate) => candidate.id === entry.unitId,
            );
            if (held === undefined) continue;
            controls.prepend(this.#controlledPortrait(view, held));
          }
          if (martian.mindControl.cooldown !== null && blocked !== null)
            chip(blocked, "mind-control-cooldown", blocked);
        }
        if (martian.capacitySlots > 1)
          chip(
            slotsTextV7(martian.capacitySlots),
            "slots",
            `Takes ${slotsTextV7(martian.capacitySlots)} in its city`,
          );
      }
      // `pulp_wars-1wy.5`: the per-turn mobility chips, from the public
      // lists: "Beamed" on a unit a carrier set down this turn (of any
      // kind) and "Beam used" on a Mothership whose free pull is spent.
      for (const turnChip of martianTurnChipsV7(view, unit.id)) {
        const cue = text(
          this.#document,
          "span",
          turnChip.label,
          "v7-chip v7-martian-chip",
        );
        cue.dataset.unitStatus = turnChip.id;
        cue.title = turnChip.tooltip;
        cue.setAttribute("aria-label", turnChip.tooltip);
        identityColumn?.append(cue);
      }
      // The Mind Control revision (section 9): a controlled unit of any kind
      // shows the brain badge "Controlled" and, as names in their faction
      // colours, its controller and (after a return arrow) its original
      // owner; the sentences are its tooltip and accessible name.
      if (control !== null)
        identityColumn?.append(this.#controlBadge(view, control));
      // The naval branch interface: a submerged Submarine, its torpedo,
      // and a ship that can be boarded now, from the public unit stats.
      if (stats !== undefined && unit.form === "NAVAL") {
        const navalChip = (
          label: string,
          status: string,
          title: string,
          icon: UiIconIdV7,
        ): void => {
          const cue = el(this.#document, "span", "v7-chip v7-naval-chip");
          cue.append(
            uiIconV7(this.#document, icon),
            text(this.#document, "span", label),
          );
          cue.dataset.unitStatus = status;
          cue.title = title;
          cue.setAttribute("aria-label", title);
          identityColumn?.append(cue);
        };
        if (stats.submerged)
          navalChip(
            SUBMERGED_LABEL_V7,
            "submerged",
            SUBMERGED_TOOLTIP_V7,
            "periscope",
          );
        if (stats.boardableAt !== null && unit.hp <= stats.boardableAt)
          navalChip(
            BOARDABLE_LABEL_V7,
            "boardable",
            boardableTooltipV7(stats.boardableAt),
            "grapple",
          );
      }
      // The Ice Folk revision (section 13.1): the Chill of a unit of any
      // owner (Frozen, Frosted or Thawing), and an Ice Folk unit's Blizzard
      // or Snow, Rockfall reach and Boulder throw, from `stats.chill` and
      // `stats.iceFolk`.
      if (matchHasIceFolkSeatV7(view)) {
        const iceChip = (
          label: string,
          status: string,
          title: string,
        ): HTMLElement => {
          const cue = text(
            this.#document,
            "span",
            label,
            "v7-chip v7-ice-folk-chip",
          );
          cue.dataset.unitStatus = status;
          cue.title = title;
          cue.setAttribute("aria-label", title);
          identityColumn?.append(cue);
          return cue;
        };
        const chill = chillChipV7(view, unit);
        if (chill !== null)
          iceChip(chill.label, "chill", chill.status).dataset.chill =
            chill.state.toLowerCase();
        const mechanics = stats?.iceFolk;
        if (mechanics !== undefined && unit.form === "LAND") {
          if (mechanics.inBlizzard)
            iceChip(BLIZZARD_LABEL_V7, "blizzard", BLIZZARD_TOOLTIP_V7);
          else if (mechanics.onSnow)
            iceChip(
              SNOW_LABEL_V7,
              "snow",
              mechanics.snowCover
                ? snowChipTooltipV7(mechanics.glides)
                : "On Snow, but no Snow cover here",
            );
          if (mechanics.rockfall)
            iceChip(
              "Rockfall",
              "rockfall",
              "On a Mountain: it can attack two tiles away",
            );
          if (mechanics.planted !== null)
            iceChip(
              boulderThrowTextV7(mechanics.planted),
              "planted",
              mechanics.planted
                ? "It has not moved this turn: its throw has the Planted bonus"
                : "It moved this turn: no Planted bonus",
            );
        }
        if (frozenAfterMoveV7(view, unit)) {
          const state = el(this.#document, "section", "v7-tactical-state");
          state.dataset.tacticalState = "frozen";
          state.append(text(this.#document, "strong", FROZEN_MOVED_V7));
          unitDetails.append(state);
        }
      }
      // The Candy revision (section 15.2): Rushed (by its perk, a Gummy
      // Bear's Sugar Frenzy with its continuations as pips), Home Sweet
      // Home, Crashed and Splatted on a unit of any owner, each an icon and
      // a name with its one sentence as the tooltip.
      if (matchHasCandySeatV7(view))
        for (const chip of candyChipsV7(view, unit)) {
          const cue = el(this.#document, "span", "v7-chip v7-candy-chip");
          const glyph = this.#chibiArt(
            chip.icon,
            CHIBI_DOM_BOXES_V7.leaderboard,
          )?.element;
          if (glyph !== undefined) {
            glyph.classList.add("v7-candy-chip-icon");
            cue.append(glyph);
          }
          cue.append(text(this.#document, "span", chip.label));
          if (chip.pips !== undefined) {
            const pips = el(this.#document, "span", "v7-candy-pips");
            pips.dataset.pipsLeft = String(chip.pips.left);
            pips.dataset.pipsOf = String(chip.pips.of);
            for (let index = 0; index < chip.pips.of; index += 1) {
              const pip = el(this.#document, "span", "v7-candy-pip");
              pip.dataset.filled = String(index < chip.pips.left);
              pips.append(pip);
            }
            cue.append(pips);
          }
          cue.dataset.unitStatus = chip.id;
          cue.title = chip.status;
          cue.setAttribute("aria-label", chip.status);
          identityColumn?.append(cue);
        }
      // The Dwarf revision (section 16.1): Dig In, the clockwork status, the
      // Gunner's shots, Plated, the rider's surfacing brake and "bombed this
      // turn", from `stats.dwarf` and the per-turn flags.
      if (matchHasDwarfSeatV7(view)) {
        const dwarfChip = (
          label: string,
          status: string,
          title: string,
          icon: ArtSubjectV7 | null = null,
        ): HTMLElement => {
          const cue = el(this.#document, "span", "v7-chip v7-dwarf-chip");
          const glyph =
            icon === null
              ? null
              : this.#chibiArt(icon, CHIBI_DOM_BOXES_V7.action)?.element;
          if (glyph !== null && glyph !== undefined) {
            glyph.classList.add("v7-dwarf-chip-icon");
            cue.append(glyph);
          } else if (status === "clockwork")
            cue.append(uiIconV7(this.#document, "gear"));
          cue.append(text(this.#document, "span", label));
          cue.dataset.unitStatus = status;
          cue.title = title;
          cue.setAttribute("aria-label", title);
          identityColumn?.append(cue);
          return cue;
        };
        const mechanics = stats?.dwarf;
        if (stats?.bombedThisTurn === true)
          dwarfChip(
            BOMBED_MARK_V7,
            "bombed",
            `${BOMBED_MARK_V7}: no Gyrocopter can bomb it again this turn`,
          );
        const dig = digInChipV7(view, unit, stats);
        if (dig !== null)
          dwarfChip(
            dig.label,
            dig.dugIn ? "dug-in" : "not-dug-in",
            dig.text,
            dig.dugIn ? "ICON:STATUS:DUG_IN" : null,
          );
        if (mechanics?.construct === true && unit.form === "LAND")
          dwarfChip(
            CLOCKWORK_LABEL_V7,
            "clockwork",
            CLOCKWORK_INFO_V7,
            "ICON:STATUS:CLOCKWORK",
          );
        const shots = gunnerShotsTextV7(view, unit, mechanics);
        if (shots !== null) dwarfChip(shots, "shots", shots);
        if (
          mechanics !== undefined &&
          mechanics.plated !== null &&
          unit.form === "LAND"
        )
          dwarfChip(
            `Plated ${mechanics.plated}`,
            "plated",
            `Plated: no single hit takes more than ${mechanics.plated} HP`,
          );
        if (
          stats?.surfacedThisTurn === true &&
          unitRoleRuleV7(view, unit).abilities.includes("RIDES_TUNNEL")
        ) {
          dwarfChip("Just surfaced", "surfaced", RIDER_SURFACED_V7);
          const state = el(this.#document, "section", "v7-tactical-state");
          state.dataset.tacticalState = "surfaced";
          state.append(text(this.#document, "strong", RIDER_SURFACED_V7));
          unitDetails.append(state);
        }
      }
      if (stats !== undefined) {
        if (stats.statuses.length > 0) {
          const cues = el(this.#document, "div", "v7-unit-status-cues");
          const statuses = el(this.#document, "div", "v7-unit-statuses");
          for (const status of stats.statuses) {
            const short = status.startsWith("Tended")
              ? "Tended"
              : (status.split(":", 1)[0] ?? status);
            const statusId = short.toLowerCase().replaceAll(" ", "-");
            const cue = text(this.#document, "span", short, "v7-chip");
            cue.dataset.unitStatus = statusId;
            cue.setAttribute("aria-label", `${short} status`);
            cues.append(cue);
            const chip = text(this.#document, "span", status, "v7-chip");
            chip.dataset.unitStatus = statusId;
            statuses.append(chip);
          }
          identityColumn?.append(cues);
          unitDetails.append(statuses);
        }
        const rows = el(this.#document, "dl", "v7-unit-stats");
        for (const stat of stats.stats) {
          // An Egg cannot move or fight: only its HP and Defense matter.
          if (egg && stat.id !== "HP" && stat.id !== "DEFENSE") continue;
          // The Giant Spider explores nothing: it has no Sight.
          if (monster && stat.id === "SIGHT") continue;
          const exact = stat.visibility !== "BASE_ONLY";
          const value = el(this.#document, "dd", "v7-stat-value");
          value.append(
            text(
              this.#document,
              "span",
              stat.id === "HP"
                ? `${unit.hp}/${unit.maxHp}`
                : // The Martian revision: "Shield 2 / 4" (current / maximum,
                  // the Force Field's raise included).
                  stat.id === "SHIELD"
                  ? `${stat.current ?? 0}/${formatValue(stat.total)}`
                  : stat.id === "RANGE" &&
                      stats.minimumRange !== stats.maximumRange
                    ? `${stats.minimumRange}–${stats.maximumRange}`
                    : stat.id === "RANGE" &&
                        undeadUnit &&
                        unit.form === "LAND" &&
                        stats.maximumRange === 0
                      ? "—"
                      : formatValue(stat.base.value),
            ),
          );
          for (const [index, modifier] of (exact
            ? stat.modifiers
            : []
          ).entries()) {
            const modifierId = `${unit.id}-${stat.id}-${index}`;
            const term = button(
              this.#document,
              statModifierTextV7(stat.base.value, modifier),
              `stat-${stat.id.toLowerCase()}-${index}`,
              "v7-stat-modifier",
            );
            term.dataset.modifierSource = modifier.source.toLowerCase();
            term.setAttribute(
              "aria-label",
              `${modifier.sourceLabel}: ${modifier.description}`,
            );
            term.dataset.tooltip = modifier.sourceLabel;
            term.setAttribute(
              "aria-expanded",
              String(this.#selectedModifier === modifierId),
            );
            term.onclick = () => {
              this.#selectedModifier =
                this.#selectedModifier === modifierId ? null : modifierId;
              this.#pendingFocusAction = `stat-${stat.id.toLowerCase()}-${index}`;
              this.#render();
            };
            value.append(term);
          }
          if (!exact)
            value.append(text(this.#document, "span", "+?", "v7-stat-unknown"));
          const term = el(this.#document, "dt", "v7-stat-term");
          term.title = stat.label;
          term.append(
            uiIconV7(this.#document, STAT_ICONS[stat.id] ?? "info"),
            text(this.#document, "span", stat.label, "v7-sr-only"),
          );
          const row = el(this.#document, "div", "v7-stat");
          row.dataset.stat = stat.id.toLowerCase();
          row.title = stat.label;
          row.append(term, value);
          rows.append(row);
        }
        dock.append(rows);
        const abilities = el(this.#document, "div", "v7-abilities");
        for (const ability of stats.abilities) {
          const description =
            ability === "TEND_WOUNDED" && matchHasUndeadV7(view)
              ? TEND_CURES_DESCRIPTION
              : roleAbilityDescriptionV7(
                  ability,
                  stats.minimumRange,
                  stats.maximumRange,
                  unitFaction,
                  cureCaptainPhraseV7(view),
                  unit.role,
                );
          if (description === null) continue;
          const entry = el(this.#document, "p", "v7-unit-ability");
          // Revision 20: the Charge! line carries the former Stampede icon.
          if (ability === "LINEBREAKER") {
            entry.dataset.ability = "charge";
            entry.append(
              this.#chibiArt("ICON:ACTION:STAMPEDE", CHIBI_DOM_BOXES_V7.action)
                ?.element ??
                uiIconV7(
                  this.#document,
                  "stampede",
                  "v7-ui-icon v7-command-icon",
                ),
            );
          }
          // The naval branch art (bead pulp_wars-5ti.6): the Bow Ram and
          // Torpedo lines carry their icons in the same slot, when the art
          // set has them (LEGACY keeps the plain line).
          if (ability === "RAM" || ability === "TORPEDO") {
            const icon = this.#chibiArt(
              `ICON:ACTION:${ability}`,
              CHIBI_DOM_BOXES_V7.action,
            )?.element;
            if (icon !== undefined) {
              entry.dataset.ability = ability.toLowerCase();
              entry.append(icon);
            }
          }
          entry.append(
            text(
              this.#document,
              "strong",
              roleAbilityNameV7(ability, unitFaction),
            ),
            text(this.#document, "span", description),
          );
          abilities.append(entry);
        }
        // Revision 17: Kaboom and death-blast damage, bombs, regeneration,
        // Gang Up and the Field Defense restriction from `stats.goblin`.
        if (stats.goblin !== undefined && unit.form !== "EMBARKED") {
          const mechanics = unitRoleMechanicsV7(view, unit);
          for (const line of goblinUnitInfoLinesV7(
            unit.role,
            stats.goblin,
            mechanics.splash && mechanics.splashTargets === "ALL",
          )) {
            const entry = el(this.#document, "p", "v7-unit-ability");
            entry.dataset.goblinInfo = line.id;
            entry.append(
              text(this.#document, "strong", line.name),
              text(this.#document, "span", line.description),
            );
            abilities.append(entry);
          }
        }
        // Revision 19: growth, a two-slot body and the Field Defense
        // restriction from `stats.dinosaur`.
        if (stats.dinosaur !== undefined)
          for (const line of dinosaurUnitInfoLinesV7(
            unit.role,
            stats.dinosaur,
          )) {
            const entry = el(this.#document, "p", "v7-unit-ability");
            entry.dataset.dinosaurInfo = line.id;
            entry.append(
              text(this.#document, "strong", line.name),
              text(this.#document, "span", line.description),
            );
            abilities.append(entry);
          }
        // The Martian revision: the Shield, the ray's power now,
        // a Brain's control, a two-slot body and a machine afloat.
        if (stats.martian !== undefined)
          for (const line of martianUnitInfoLinesV7(unit, stats.martian)) {
            const entry = el(this.#document, "p", "v7-unit-ability");
            entry.dataset.martianInfo = line.id;
            entry.append(
              text(this.#document, "strong", line.name),
              text(this.#document, "span", line.description),
            );
            abilities.append(entry);
          }
        // The Mind Control revision (section 9): who controls it and what
        // happens when the Brain is lost.
        const controlInfo = mindControlledInfoV7(view, unit);
        if (controlInfo !== null) {
          const entry = el(this.#document, "p", "v7-unit-ability");
          entry.dataset.martianInfo = "controlled";
          entry.append(
            text(this.#document, "strong", MIND_CONTROLLED_LABEL_V7),
            text(
              this.#document,
              "span",
              `${controlInfo.byLine}. ${controlInfo.fateLine}. It cannot be disbanded or create units.`,
            ),
          );
          abilities.append(entry);
        }
        // The Ice Folk revision: the Chill (any owner), the Shatter
        // threshold, Snow or the Blizzard, Rockfall and the Boulder throw.
        if (matchHasIceFolkSeatV7(view))
          for (const line of iceFolkUnitInfoLinesV7(view, unit, stats)) {
            const entry = el(this.#document, "p", "v7-unit-ability");
            entry.dataset.iceFolkInfo = line.id;
            entry.append(
              text(this.#document, "strong", line.name),
              text(this.#document, "span", line.description),
            );
            abilities.append(entry);
          }
        // The Candy revision: Rushed, Crashed and Splatted (any owner), and
        // what a Candy unit's Crumbs cost to Re-bake.
        if (matchHasCandySeatV7(view))
          for (const line of candyUnitInfoLinesV7(view, unit)) {
            const entry = el(this.#document, "p", "v7-unit-ability");
            entry.dataset.candyInfo = line.id;
            entry.append(
              text(this.#document, "strong", line.name),
              text(this.#document, "span", line.description),
            );
            abilities.append(entry);
          }
        // The Dwarf revision: Dig In, clockwork, the Gunner's shots,
        // Plated, the rider's brake, the bomb and the eruption.
        if (matchHasDwarfSeatV7(view))
          for (const line of dwarfUnitInfoLinesV7(view, unit, stats)) {
            const entry = el(this.#document, "p", "v7-unit-ability");
            entry.dataset.dwarfInfo = line.id;
            entry.append(
              text(this.#document, "strong", line.name),
              text(this.#document, "span", line.description),
            );
            abilities.append(entry);
          }
        if (
          undeadUnit &&
          unit.role === "CATAPULT" &&
          unitRoleMechanicsV7(view, unit).splash
        ) {
          const entry = el(this.#document, "p", "v7-unit-ability");
          entry.append(
            text(this.#document, "strong", "Splash"),
            text(
              this.#document,
              "span",
              "Shots also hit enemies next to the target for half damage.",
            ),
          );
          abilities.append(entry);
        }
        // Map curiosities: the Spider's one sentence, its regeneration, its
        // bounty and whom it will attack.
        for (const line of monsterLines) {
          const entry = el(this.#document, "p", "v7-unit-ability");
          entry.dataset.curiosityInfo = line.id;
          entry.append(
            text(this.#document, "strong", line.name),
            text(this.#document, "span", line.description),
          );
          abilities.append(entry);
        }
        if (abilities.childElementCount > 0) unitDetails.append(abilities);
      }
      // An Egg is exhausted at all times; it is not dimmed as "done".
      if (unit.activation.handled && unit.ownerId === view.viewer.id && !egg)
        dock.dataset.handled = "true";
      const legend = this.#landingLegend(view, unit.id);
      if (legend !== null) dock.append(legend);
      const launchLegend = this.#launchLegend(view, unit.id);
      if (launchLegend !== null) dock.append(launchLegend);
      const glideLegend = this.#glideLegend(view, unit.id);
      if (glideLegend !== null) dock.append(glideLegend);
      // Revision 19: what an Egg is, in one sentence, right in its dock.
      if (egg && eggTurns !== null) {
        const info = text(
          this.#document,
          "p",
          eggInfoTextV7(roleRule.label, eggTurns),
          "v7-egg-info",
        );
        info.dataset.v7Egg = "info";
        dock.append(info);
      }
      const actions = this.#commandButtons(
        (command) =>
          "unitId" in command &&
          command.unitId === unit.id &&
          !NON_BUTTON_COMMANDS.has(command.kind),
      );
      // Bead pulp_wars-9im: one Hatch button, whatever the number of Eggs.
      const hatch = this.#hatchButton(unit.id);
      if (hatch !== null) actions.prepend(hatch);
      // Revision 19: why an adjacent Egg cannot be hatched yet, and the
      // Field Defense restriction. aria-disabled keeps each explanation
      // reachable by keyboard.
      const dinosaurBlocked: {
        readonly action: string;
        readonly label: string;
        readonly reason: string;
        readonly explanation: string;
        readonly icon: "hatch" | null;
      }[] = [];
      if (hatchBlockedEggsV7(view, unit.id).length > 0)
        dinosaurBlocked.push({
          action: "hatch-unavailable",
          label: HATCH_LABEL_V7,
          reason: "hatch-new-egg",
          explanation: HATCH_NEW_EGG_V7,
          icon: "hatch",
        });
      if (dinosaurFieldDefenseBlockedV7(view, unit.id))
        dinosaurBlocked.push({
          action: "dinosaur-field-defense",
          label: "Fortify",
          reason: "dinosaur-field-defense",
          explanation: DINOSAUR_FIELD_DEFENSE_EXPLANATION_V7,
          icon: null,
        });
      // The Martian revision (section 13.2): the Field Defense restriction.
      if (martianFieldDefenseBlockedV7(view, unit.id))
        dinosaurBlocked.push({
          action: "martian-field-defense",
          label: "Fortify",
          reason: "martian-field-defense",
          explanation: MARTIAN_FIELD_DEFENSE_EXPLANATION_V7,
          icon: null,
        });
      // The Ice Folk revision (section 13.2): the Field Defense restriction.
      if (iceFolkFieldDefenseBlockedV7(view, unit.id))
        dinosaurBlocked.push({
          action: "ice-folk-field-defense",
          label: "Fortify",
          reason: "ice-folk-field-defense",
          explanation: ICE_FOLK_FIELD_DEFENSE_EXPLANATION_V7,
          icon: null,
        });
      // The Dwarf revision (section 16.2): Dwarves dig in instead.
      if (dwarfFieldDefenseBlockedV7(view, unit.id))
        dinosaurBlocked.push({
          action: "dwarf-field-defense",
          label: "Fortify",
          reason: "dwarf-field-defense",
          explanation: DWARF_FIELD_DEFENSE_EXPLANATION_V7,
          icon: null,
        });
      // The Candy revision (section 15.2): Candy has Home Sweet Home.
      if (candyFieldDefenseBlockedV7(view, unit.id))
        dinosaurBlocked.push({
          action: "candy-field-defense",
          label: "Fortify",
          reason: "candy-field-defense",
          explanation: CANDY_FIELD_DEFENSE_EXPLANATION_V7,
          icon: null,
        });
      for (const entry of dinosaurBlocked) {
        const blocked = button(
          this.#document,
          "",
          entry.action,
          "v7-context-action",
        );
        blocked.append(
          entry.icon === null
            ? createTacticalSymbolV7(
                this.#document,
                "ui-action-field-defense",
                this.#tacticalTheme(),
              )
            : (this.#chibiArt("ICON:ACTION:HATCH", CHIBI_DOM_BOXES_V7.action)
                ?.element ??
                uiIconV7(
                  this.#document,
                  entry.icon,
                  "v7-ui-icon v7-command-icon",
                )),
          text(this.#document, "span", entry.label, "v7-action-label"),
        );
        blocked.setAttribute("aria-disabled", "true");
        blocked.dataset.disabledReason = entry.reason;
        blocked.title = entry.explanation;
        blocked.setAttribute(
          "aria-label",
          `${entry.label} unavailable. ${entry.explanation}`,
        );
        // A tap (no hover on touch) shows the reason as a toast.
        blocked.onclick = () => {
          this.#notice = `${entry.explanation}.`;
          this.#showToast(`${entry.explanation}.`);
          this.#pendingFocusAction = entry.action;
          this.#render();
        };
        actions.append(blocked);
      }
      // The Martian revision: Beam Down, Mind Control and Tractor Beam
      // aim on the board; each has one button, or a disabled one with the
      // reason, ahead of the other actions.
      // The Ice Folk revision: Bolas and Cold Snap likewise, and a Frozen
      // unit that moved names why it cannot act.
      // The Dwarf revision: Tunnel, Bomb Run and Assemble likewise.
      for (const button of [
        ...this.#martianActionButtons(view, unit.id),
        ...this.#iceFolkActionButtons(view, unit.id),
        ...this.#dwarfActionButtons(view, unit.id),
        // The Candy revision: Sugar Rush, Re-bake and Sugar Toss likewise.
        ...this.#candyActionButtons(view, unit.id),
        // The naval branch interface: Board likewise.
        ...this.#navalActionButtons(view, unit.id),
      ].reverse())
        actions.prepend(button);
      if (goblinFieldDefenseBlockedV7(view, unit.id)) {
        // Revision 17 (section 5.3): the Goblin never builds Field Defense;
        // aria-disabled keeps the explanation reachable by keyboard.
        const fortify = button(
          this.#document,
          "",
          "goblin-field-defense",
          "v7-context-action",
        );
        fortify.append(
          createTacticalSymbolV7(
            this.#document,
            "ui-action-field-defense",
            this.#tacticalTheme(),
          ),
          text(this.#document, "span", "Fortify", "v7-action-label"),
        );
        fortify.setAttribute("aria-disabled", "true");
        fortify.dataset.disabledReason = "goblin-field-defense";
        fortify.title = GOBLIN_FIELD_DEFENSE_EXPLANATION_V7;
        fortify.setAttribute(
          "aria-label",
          `Fortify unavailable. ${GOBLIN_FIELD_DEFENSE_EXPLANATION_V7}`,
        );
        actions.append(fortify);
      }
      // The Dwarf revision (section 16.1): clockwork never recovers.
      if (clockworkRecoverBlockedV7(view, unit)) {
        const recover = button(
          this.#document,
          "",
          "clockwork-recover",
          "v7-context-action",
        );
        recover.append(
          this.#chibiArt("ICON:ACTION:RECOVER", CHIBI_DOM_BOXES_V7.action)
            ?.element ?? art(this.#document, "ui-action-recover", ""),
          text(this.#document, "span", "Recover", "v7-action-label"),
        );
        // aria-disabled keeps the explanation reachable by keyboard.
        recover.setAttribute("aria-disabled", "true");
        recover.dataset.disabledReason = "clockwork";
        recover.title = CLOCKWORK_RECOVER_V7;
        recover.setAttribute(
          "aria-label",
          `Recover unavailable. ${CLOCKWORK_RECOVER_V7}`,
        );
        recover.onclick = () => {
          this.#notice = `${CLOCKWORK_RECOVER_V7}.`;
          this.#showToast(`${CLOCKWORK_RECOVER_V7}.`);
          this.#pendingFocusAction = "clockwork-recover";
          this.#render();
        };
        actions.append(recover);
      }
      if (restlessRecoverBlockedV7(view, unit)) {
        const recover = button(
          this.#document,
          "",
          "restless-recover",
          "v7-context-action",
        );
        recover.append(
          this.#chibiArt("ICON:ACTION:RECOVER", CHIBI_DOM_BOXES_V7.action)
            ?.element ?? art(this.#document, "ui-action-recover", ""),
          text(this.#document, "span", "Recover", "v7-action-label"),
        );
        // aria-disabled keeps the explanation reachable by keyboard.
        recover.setAttribute("aria-disabled", "true");
        recover.dataset.disabledReason = "restless";
        recover.title = RESTLESS_EXPLANATION_V7;
        recover.setAttribute(
          "aria-label",
          `Recover unavailable. ${RESTLESS_EXPLANATION_V7}`,
        );
        actions.append(recover);
      }
      const disbandBlocked = disbandBlockedByAfflictionV7(view, unit.id);
      if (disbandBlocked !== null) {
        const explanation = DISBAND_BLOCKED_EXPLANATION_V7[disbandBlocked];
        const disband = button(
          this.#document,
          "",
          "affliction-disband",
          "v7-context-action",
        );
        disband.append(
          this.#chibiArt("ICON:ACTION:DISBAND", CHIBI_DOM_BOXES_V7.action)
            ?.element ?? art(this.#document, "ui-action-disband", ""),
          text(this.#document, "span", "Disband", "v7-action-label"),
        );
        // aria-disabled keeps the explanation reachable by keyboard.
        disband.setAttribute("aria-disabled", "true");
        disband.dataset.disabledReason = disbandBlocked.toLowerCase();
        disband.title = explanation;
        disband.setAttribute(
          "aria-label",
          `Disband unavailable. ${explanation}`,
        );
        actions.append(disband);
      }
      // The Martian revision: while an ability is aimed, the dock shows its
      // compact prompt instead of the actions, so the board stays in view.
      const martianPanel =
        this.#martianPickPanel(view, unit.id) ??
        this.#iceFolkPickPanel(view, unit.id) ??
        this.#dwarfPickPanel(view, unit.id) ??
        this.#candyPickPanel(unit.id) ??
        this.#navalPickPanel(unit.id);
      if (martianPanel !== null) {
        dock.dataset.hasActions = "true";
        dock.append(martianPanel);
      } else if (actions.querySelector("button") !== null) {
        dock.dataset.hasActions = "true";
        dock.append(actions);
      }
      const kaboomPanel = this.#kaboomPanel(view, unit.id);
      if (kaboomPanel !== null) dock.append(kaboomPanel);
      if (this.#selectedUnitHelpId === unit.id) {
        const modal = el(this.#document, "section", "v7-unit-help-dialog");
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", `${roleLabel} unit information`);
        modal.dataset.v7Region = "unit-help";
        const closeHelp = iconButton(
          this.#document,
          "close",
          "Close",
          "close-unit-help",
        );
        closeHelp.classList.add("close-button");
        closeHelp.onclick = () => this.#closeUnitHelp();
        const header = el(this.#document, "div", "v7-dialog-header");
        const helpArt = this.#chibiArt(
          unitSubject,
          CHIBI_DOM_BOXES_V7.card,
          unitColour,
        );
        header.append(
          factionBadgeArt(
            this.#document,
            helpArt?.element ??
              (egg
                ? eggFigureV7(this.#document, unitColour)
                : monster
                  ? spiderFigureV7(this.#document)
                  : art(
                      this.#document,
                      transportArt
                        ? "unit-shared-embarked-transport"
                        : RULESET7_UNIT_ART_IDS[unit.role],
                      "",
                    )),
            helpArt?.factionArt === true || egg ? null : unitBadge,
          ),
          text(this.#document, "h2", roleLabel),
        );
        const statCopy = dock.querySelector(".v7-unit-stats")?.cloneNode(true);
        modal.append(closeHelp, header);
        if (statCopy instanceof HTMLElement) {
          for (const node of statCopy.querySelectorAll("button"))
            node.replaceWith(text(this.#document, "span", node.textContent));
          modal.append(statCopy);
        }
        modal.append(unitDetails);
        this.#unitHelpModal = modal;
      }
    } else if (selection.kind === "CITY") {
      const city = view.cities.find(
        (candidate) => candidate.id === selection.cityId,
      );
      if (city === undefined) return null;
      const owned = city.ownerId === view.viewer.id;
      const cityTier = Math.max(1, Math.min(3, city.level)) as 1 | 2 | 3;
      dock.append(
        identity(
          this.#document,
          `building-city-${cityTier}`,
          city.isCapital ? "Capital" : "City",
          true,
          null,
          this.#chibiArt(
            cityArtSubjectV7({
              artLevel: cityTier,
              faction: view.players.find((player) => player.id === city.ownerId)
                ?.faction,
            }),
            CHIBI_DOM_BOXES_V7.dock,
            this.#playerColour(view, city.ownerId),
          )?.element,
        ),
      );
      const owner = view.players.find((player) => player.id === city.ownerId);
      if (!owned && owner !== undefined)
        dock
          .querySelector(".v7-identity")
          ?.append(
            text(
              this.#document,
              "span",
              playerName(owner.seat),
              "v7-identity-owner",
            ),
          );
      const details = el(this.#document, "dl", "v7-city-stats");
      const besieged = view.units.some(
        (unit) =>
          hostile(view, city.ownerId, unit.ownerId) && same(unit.at, city.at),
      );
      const level = el(this.#document, "div", "v7-city-stat");
      level.dataset.stat = "level";
      level.append(
        text(this.#document, "dt", "Level"),
        text(this.#document, "dd", String(city.level)),
      );
      const growth = el(this.#document, "div", "v7-city-stat");
      growth.dataset.stat = "population";
      growth.title = "Population until the next level";
      const growthValue = el(this.#document, "dd", "v7-population-value");
      growthValue.append(
        economyIcon(this.#document, "population"),
        populationMeter(this.#document, city.population, city.level + 1),
        text(
          this.#document,
          "span",
          `${city.population}/${city.level + 1}`,
          "v7-population-count",
        ),
      );
      growth.append(text(this.#document, "dt", "Population"), growthValue);
      details.append(level, growth);
      if (owned) {
        // Revision 19 (section 5.1): used capacity is the slot sum of the
        // units and Eggs homed here; it equals the unit count for every
        // faction whose roles all use one slot.
        const assigned = view.units
          .filter(
            (unit) =>
              unit.ownerId === view.viewer.id && unit.homeCityId === city.id,
          )
          .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0);
        const capacity = cityUnitCapacityForV7(
          city.level,
          view.viewer.researchedTechs,
          view.viewer.faction,
        );
        // The Martian revision: a Martian viewer also counts slots (the
        // Mothership and the Colossus take two; a controlled unit none).
        // The Ice Folk revision: an Ice Folk viewer counts slots too (the
        // spec's production rows name them; every Ice Folk unit takes one).
        const eggLaying = view.viewer.faction === "DINOSAUR";
        const iceFolkSlots = view.viewer.faction === "ICE_FOLK";
        // The Dwarf revision: a Dwarf viewer counts slots too (an
        // Engineer's Assemble uses one of the home city's).
        const dwarfSlots = view.viewer.faction === "DWARF";
        const slotCapacity =
          eggLaying ||
          view.viewer.faction === "MARTIAN" ||
          iceFolkSlots ||
          dwarfSlots;
        const units = el(this.#document, "div", "v7-city-stat");
        units.dataset.stat = "units";
        units.title = eggLaying
          ? slotCapacityTooltipV7()
          : iceFolkSlots
            ? "Unit slots used in this city; every Ice Folk unit takes 1"
            : dwarfSlots
              ? DWARF_SLOT_TOOLTIP_V7
              : slotCapacity
                ? martianSlotCapacityTooltipV7()
                : "Units supported by this city";
        const unitsValue = el(this.#document, "dd", "v7-city-units");
        unitsValue.append(
          uiIconV7(this.#document, "units"),
          slotCapacity
            ? `${assigned}/${capacity} slots`
            : `${assigned}/${capacity}`,
        );
        if (slotCapacity) {
          units.dataset.capacity = "slots";
          unitsValue.setAttribute(
            "aria-label",
            cityCapacityTextV7(assigned, capacity),
          );
          if (assigned > capacity) unitsValue.classList.add("is-over-capacity");
        }
        // Revision 17 Warrens: a Goblin city holds one extra unit.
        const warrens = factionRulesV7(view.viewer.faction).cityCapacityBonus;
        if (warrens > 0) {
          const bonus = text(
            this.#document,
            "span",
            `+${warrens} Warrens`,
            "v7-chip v7-warrens-chip",
          );
          bonus.dataset.capacity = "warrens";
          bonus.title =
            "Goblin Warrens: every Goblin city holds one extra unit";
          unitsValue.append(bonus);
          units.title = `Units supported by this city (includes +${warrens} Warrens)`;
        }
        units.append(
          text(this.#document, "dt", slotCapacity ? "Slots" : "Units"),
          unitsValue,
        );
        const income = el(this.#document, "div", "v7-city-stat");
        income.dataset.stat = "income";
        income.title = "Coins per turn";
        const incomeValue = el(this.#document, "dd", "v7-city-income");
        incomeValue.append(
          economyIcon(this.#document, "coin"),
          `+${cityIncomeForViewerV7(view, city.id) ?? 0}`,
        );
        income.append(text(this.#document, "dt", "Income"), incomeValue);
        const cityAction = el(this.#document, "div", "v7-city-stat");
        cityAction.dataset.stat = "city-action";
        cityAction.title = eggLaying
          ? "One shared city action covers land training, laying an Egg, naval training, or Land Grant and resets at Start Turn"
          : "One shared city action covers land training, naval training, or Land Grant and resets at Start Turn";
        cityAction.append(
          text(this.#document, "dt", "City action"),
          text(
            this.#document,
            "dd",
            city.cityActionAvailable === true
              ? "Ready"
              : "Spent · resets next turn",
          ),
        );
        details.append(units, income, cityAction);
        for (const [kind, active] of [
          ["land", view.naval.landTradeCityIds.includes(city.id)],
          ["sea", view.naval.seaTradeCityIds.includes(city.id)],
        ] as const)
          if (active) {
            const trade = el(this.#document, "div", "v7-city-stat");
            trade.dataset.stat = `${kind}-trade`;
            trade.title = `${title(kind)} trade income`;
            const value = el(this.#document, "dd", "v7-city-income");
            value.append(economyIcon(this.#document, "coin"), "+1");
            trade.append(
              text(this.#document, "dt", `${title(kind)} trade`),
              value,
            );
            details.append(trade);
          }
        // The naval branch interface (section 5.4): what Harbours adds
        // to this city's population through its active docks.
        const harbourDocks =
          viewerHarbourPopulationV7(view) *
          view.naval.ownedPorts.filter(
            (port) => port.cityId === city.id && port.status === "ACTIVE",
          ).length;
        if (harbourDocks > 0) {
          const harbours = el(this.#document, "div", "v7-city-stat");
          harbours.dataset.stat = "harbours";
          harbours.title = `${HARBOURS_LABEL_V7}: population from this city's active Ports and Shipyards (included)`;
          const value = el(this.#document, "dd", "v7-city-income");
          value.append(
            economyIcon(this.#document, "population"),
            `+${harbourDocks}`,
          );
          harbours.append(text(this.#document, "dt", HARBOURS_LABEL_V7), value);
          details.append(harbours);
        }
        if (
          view.improvementValues.some(
            (value) =>
              value.improvement === "FORGE" &&
              value.level > 0 &&
              tileCity(view, value.at) === city.id,
          )
        ) {
          const discount = text(
            this.#document,
            "p",
            eggLaying ? "Land units and Eggs −1" : "Land units −1",
            "v7-chip",
          );
          discount.dataset.discount = "forge";
          discount.title = eggLaying
            ? "Active Forge discounts land-unit training and Eggs by 1 Coin"
            : "Active Forge discounts land-unit training by 1 Coin";
          details.append(discount);
        }
      }
      if (besieged) {
        const siege = el(this.#document, "div", "v7-city-stat is-warning");
        siege.dataset.stat = "siege";
        siege.append(
          text(this.#document, "dt", "Status"),
          text(this.#document, "dd", "Besieged"),
        );
        details.append(siege);
      }
      dock.append(details);
      if (owned) {
        const picking =
          this.#layEggPick !== null && this.#layEggPick.cityId === city.id
            ? this.#layEggPickPanel(view, this.#layEggPick)
            : null;
        if (picking !== null) {
          // Revision 19: while a nest tile is picked, the dock shows the
          // prompt alone, so the board stays in view on a phone.
          dock.dataset.hasActions = "true";
          dock.append(picking);
        } else {
          const actions = this.#commandButtons(
            (command) =>
              (command.kind === "TRAIN" || command.kind === "LAND_GRANT") &&
              command.cityId === city.id,
          );
          // Revision 19: the Lay Egg cards stand right after the train
          // cards of the Caveman and the Shaman.
          const eggCards = this.#layEggCards(view, city.id);
          const lastTrain = [...actions.children]
            .filter((child) => child.classList.contains("v7-train-card"))
            .at(-1);
          const before =
            lastTrain === undefined
              ? actions.firstChild
              : lastTrain.nextSibling;
          for (const card of eggCards) actions.insertBefore(card, before);
          if (actions.childElementCount > 0) {
            dock.dataset.hasActions = "true";
            dock.append(actions);
          }
        }
      }
    } else {
      const tile = view.board.tiles.find((candidate) =>
        same(candidate.at, selection.at),
      );
      if (tile === undefined) return null;
      if (!tile.explored) dock.append(text(this.#document, "h2", "Unexplored"));
      else {
        const asset =
          tile.improvement === null
            ? tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE"
              ? resourceMapArtIdV7(tile.resource, tile.at)
              : RULESET7_TERRAIN_ART_IDS[tile.terrain]
            : RULESET7_IMPROVEMENT_ART_IDS[tile.improvement];
        // Faction building looks (epic pulp_wars-xdh): the improvement is
        // named and drawn as the faction that owns its territory has it.
        const tileFaction = territoryFactionV7(view, tile.territoryOwnerId);
        const factionBuilding =
          tile.improvement === null
            ? null
            : factionBuildingV7(tile.improvement, tileFaction);
        const name =
          factionBuilding?.name ??
          title(
            tile.improvement ??
              (tile.resource !== "UNKNOWN_RESOURCE" ? tile.resource : null) ??
              (tile.road ? "ROAD" : tile.terrain),
          );
        const tileSubject: ArtSubjectV7 =
          tile.improvement !== null
            ? factionImprovementSubjectV7(tile.improvement, tileFaction)
            : tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE"
              ? `RESOURCE:${tile.resource}`
              : tile.terrain === "RIFT"
                ? `TERRAIN:RIFT_${riftPieceV7(tile.at, (at) => {
                    const near = view.board.tiles.find((candidate) =>
                      same(candidate.at, at),
                    );
                    return near === undefined
                      ? false
                      : near.explored
                        ? near.terrain === "RIFT"
                        : null;
                  })}`
                : // The Undead territory ground (bead pulp_wars-xdh.2).
                  territoryTerrainSubjectV7(
                    `TERRAIN:${tile.terrain}`,
                    territoryGroundV7(tileFaction),
                  );
        const summary = el(this.#document, "div", "v7-selection-summary");
        summary.append(
          identity(
            this.#document,
            asset,
            name,
            true,
            null,
            this.#chibiArt(
              tileSubject,
              CHIBI_DOM_BOXES_V7.dock,
              tile.improvement === null
                ? undefined
                : this.#playerColour(view, tile.territoryOwnerId),
              tile.at,
            )?.element,
          ),
        );
        const details = el(this.#document, "div", "v7-selection-details");
        // One flavour line; it ends "Counts as a Farm." so the generic
        // building of every rules text stays learnable.
        if (factionBuilding !== null) {
          const flavour = text(
            this.#document,
            "p",
            factionBuilding.flavour,
            "v7-building-flavour",
          );
          flavour.dataset.factionBuilding = `${tileFaction ?? ""}:${tile.improvement ?? ""}`;
          details.append(flavour);
        }
        if (tile.road && name !== "Road")
          details.append(text(this.#document, "p", "Road", "v7-chip"));
        // The Rift (bead pulp_wars-9s0.5): who may stand on it.
        if (tile.terrain === "RIFT") {
          const chip = text(this.#document, "p", RIFT_LABEL_V7, "v7-chip");
          chip.dataset.rift = "true";
          chip.title = RIFT_TOOLTIP_V7;
          chip.setAttribute("aria-label", RIFT_TOOLTIP_V7);
          details.append(chip);
        }
        // The Ice Folk revision (section 13.2): what Snow and a Blizzard do
        // for the viewer's faction.
        // The frozen sea (naval branch section 8.3, `pulp_wars-5ti.3`): a
        // plain chip for an ice tile until the naval UI bead.
        const iceHere = view.ice.find(
          (entry) => entry.at.x === tile.at.x && entry.at.y === tile.at.y,
        );
        const iceTooltip =
          iceHere === undefined
            ? ""
            : `Ice: land units stand here and ships cannot enter. ${
                iceHere.permanent
                  ? "It does not melt in its owner's territory"
                  : `It melts in ${String(iceHere.turnsLeft)} of its owner's turns unless a land unit stands on it`
              }`;
        for (const [shown, label, tooltip, kind] of [
          [iceHere !== undefined, "Ice", iceTooltip, "ice"],
          [tile.snow === true, SNOW_LABEL_V7, snowTooltipV7(view), "snow"],
          [
            tile.blizzard === true,
            BLIZZARD_LABEL_V7,
            BLIZZARD_TOOLTIP_V7,
            "blizzard",
          ],
        ] as const) {
          if (!shown) continue;
          const chip = text(
            this.#document,
            "p",
            label,
            "v7-chip v7-ice-folk-chip",
          );
          chip.dataset.winter = kind;
          chip.title = tooltip;
          chip.setAttribute("aria-label", tooltip);
          details.append(chip);
        }
        // Map curiosities (section 12.1): the tile's curiosity, named, with
        // its one sentence and its legend icon.
        const curiosity = curiosityOverlayOnTileV7(view, tile.at);
        if (curiosity !== null) {
          const info = el(this.#document, "section", "v7-curiosity-info");
          info.dataset.curiosity = curiosity.toLowerCase();
          info.append(
            this.#curiosityIcon(curiosity),
            text(this.#document, "strong", CURIOSITY_LABELS_V7[curiosity]),
            text(this.#document, "p", CURIOSITY_RULES_V7[curiosity]),
          );
          details.append(info);
        }
        if (view.graves.some((grave) => same(grave, tile.at))) {
          const grave = text(this.#document, "p", "Grave", "v7-chip");
          grave.dataset.grave = "true";
          grave.title = "A Necromancer can raise it; a Ghoul can devour it.";
          details.append(grave);
        }
        // The Candy revision (section 15.2): the tile's Crumbs, whose they
        // are by their unit, their turns left, and their Peppermint bite.
        const crumbsLines = crumbsTileLinesV7(view, tile.at);
        if (crumbsLines.length > 0) {
          const crumbs = el(this.#document, "p", "v7-chip v7-candy-chip");
          crumbs.dataset.crumbs = "true";
          const pile = this.#chibiArt(
            "CRUMBS",
            CHIBI_DOM_BOXES_V7.leaderboard,
          )?.element;
          if (pile !== undefined) {
            pile.classList.add("v7-candy-chip-icon");
            crumbs.append(pile);
          }
          crumbs.append(text(this.#document, "span", crumbsLines[0] ?? ""));
          crumbs.title = crumbsLines.join(". ");
          crumbs.setAttribute("aria-label", crumbsLines.join(". "));
          details.append(crumbs);
        }
        // The Dwarf revision (section 16.1): a mound is selectable for
        // information only: its unit, HP, when it surfaces, and its
        // eruption. It has no actions and is never in the orders cycle.
        const mound = moundAtV7(view, tile.at);
        if (mound !== undefined) {
          const lines = moundInfoLinesV7(view, mound);
          const info = el(this.#document, "section", "v7-dwarf-mound");
          info.dataset.dwarfMound =
            mound.moleUnitId === null ? "mole" : "rider";
          const heading = el(this.#document, "p", "v7-dwarf-mound-name");
          const moundArt = this.#chibiArt(
            mound.moleUnitId === null
              ? "UNIT:DWARF:MOUND"
              : "UNIT:DWARF:MOUND_RIDER",
            CHIBI_DOM_BOXES_V7.action,
          )?.element;
          if (moundArt !== undefined) heading.append(moundArt);
          heading.append(
            text(this.#document, "strong", lines.name),
            text(
              this.#document,
              "span",
              `${mound.unit.hp}/${mound.unit.maxHp} HP`,
              "v7-dwarf-mound-hp",
            ),
          );
          info.append(
            heading,
            text(
              this.#document,
              "p",
              `${lines.burrowed}.`,
              "v7-dwarf-burrowed",
            ),
          );
          if (lines.eruption !== null)
            info.append(
              text(
                this.#document,
                "p",
                `${lines.eruption}.`,
                "v7-dwarf-eruption",
              ),
            );
          if (lines.rider !== null)
            info.append(
              text(this.#document, "p", `${lines.rider}.`, "v7-dwarf-rider"),
            );
          info.setAttribute(
            "aria-label",
            [
              lines.name,
              lines.burrowed,
              lines.eruption ?? "",
              lines.rider ?? "",
            ]
              .filter(Boolean)
              .join(". "),
          );
          details.append(info);
        }
        if (
          tile.improvement !== null &&
          tile.resource !== null &&
          tile.resource !== "UNKNOWN_RESOURCE"
        ) {
          const resource = text(
            this.#document,
            "p",
            title(tile.resource),
            "v7-chip",
          );
          resource.dataset.underlyingResource = tile.resource.toLowerCase();
          details.append(resource);
        }
        const value = view.improvementValues.find((entry) =>
          same(entry.at, tile.at),
        );
        if (value !== undefined) {
          const chip = el(
            this.#document,
            "p",
            value.level === 0 ? "v7-chip is-idle" : "v7-chip",
          );
          chip.title =
            value.measure === "COIN_INCOME" ? "Coins per turn" : "Population";
          chip.append(
            economyIcon(
              this.#document,
              value.measure === "COIN_INCOME" ? "coin" : "population",
            ),
            `+${value.level}`,
          );
          chip.setAttribute(
            "aria-label",
            `${value.measure === "COIN_INCOME" ? "Income" : "Population"} +${value.level}${value.level === 0 ? ", idle" : ""}`,
          );
          details.append(chip);
        }
        if (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") {
          const port = view.naval.ownedPorts.find((candidate) =>
            same(candidate.at, tile.at),
          );
          if (port !== undefined) {
            details.append(
              text(
                this.#document,
                "p",
                port.status === "ACTIVE" ? "Active" : "Blockaded",
                `v7-chip v7-port-state state-${port.status.toLowerCase()}`,
              ),
            );
            // The naval branch interface (section 5.4): an own Port's
            // population (a Shipyard's is its value chip above), and the
            // share of an active dock that Harbours adds.
            const harbours = viewerHarbourPopulationV7(view);
            if (tile.improvement === "PORT") {
              const amount =
                port.status === "ACTIVE"
                  ? dockPopulationV7("PORT", harbours)
                  : 0;
              const chip = el(
                this.#document,
                "p",
                amount === 0 ? "v7-chip is-idle" : "v7-chip",
              );
              chip.dataset.dockPopulation = String(amount);
              chip.title = "Population";
              chip.append(
                economyIcon(this.#document, "population"),
                `+${amount}`,
              );
              chip.setAttribute(
                "aria-label",
                `Population +${amount}${amount === 0 ? ", idle" : ""}`,
              );
              details.append(chip);
            }
            if (harbours > 0 && port.status === "ACTIVE") {
              const chip = el(this.#document, "p", "v7-chip v7-harbours-chip");
              chip.dataset.harbours = String(harbours);
              chip.title = `${HARBOURS_LABEL_V7}: +${harbours} population (included)`;
              chip.setAttribute("aria-label", chip.title);
              chip.append(
                text(this.#document, "span", HARBOURS_LABEL_V7),
                economyIcon(this.#document, "population"),
                `+${harbours}`,
              );
              details.append(chip);
            }
            if (view.naval.seaTradeCityIds.includes(port.cityId)) {
              const trade = el(this.#document, "p", "v7-chip");
              trade.title = "Sea trade";
              trade.append(economyIcon(this.#document, "coin"), "+1 trade");
              details.append(trade);
            }
          }
          if (tile.improvement === "SHIPYARD" && port?.status === "ACTIVE") {
            const discount = text(this.#document, "p", "Ships −2", "v7-chip");
            discount.dataset.discount = "shipyard";
            discount.title =
              "This Shipyard discounts naval-unit training here by 2 Coins";
            details.append(discount);
          }
          const portCity =
            port === undefined
              ? undefined
              : view.cities.find((city) => city.id === port.cityId);
          if (
            portCity?.ownerId === view.viewer.id &&
            portCity.cityActionAvailable === false
          ) {
            const spent = text(
              this.#document,
              "p",
              "City action spent · resets next turn",
              "v7-chip is-warning",
            );
            spent.dataset.disabledReason = "city-action-spent";
            spent.title =
              "Land training, naval training, and Land Grant share one city action";
            details.append(spent);
          }
        }
        const monumentSource = monumentSourceForViewerV7(view, tile.at);
        if (monumentSource !== null) {
          const source = el(this.#document, "p", "v7-monument-source v7-chip");
          source.append(
            createTacticalSymbolV7(
              this.#document,
              "ui-status-achievement-source-current-owner",
              this.#highContrast ? "HIGH_CONTRAST" : "DARK",
            ),
            text(
              this.#document,
              "span",
              `${achievementNameV7(monumentSource)} monument`,
            ),
          );
          details.append(source);
        }
        if (details.childElementCount > 0) summary.append(details);
        dock.append(summary);
        this.#appendCommandArea(
          dock,
          (command) => "at" in command && same(command.at, tile.at),
          tileResearchPromptsV7(view, tile.at),
        );
      }
    }
    dock.append(close);
    return dock;
  }

  #commandButtons(predicate: (command: CommandV7) => boolean): HTMLElement {
    const actions = el(this.#document, "div", "v7-context-actions");
    for (const command of this.#snapshot.offeredCommands.filter(
      (candidate) =>
        predicate(candidate) && !NON_BUTTON_COMMANDS.has(candidate.kind),
    )) {
      // Revision 19: Disband on an own Egg is "Abandon Egg".
      const abandonedEgg =
        command.kind === "DISBAND"
          ? this.#snapshot.view?.units.find(
              (unit) => unit.id === command.unitId && unit.form === "EGG",
            )
          : undefined;
      // The Candy revision (section 15.1): a Confectioner's Tend Wounded
      // is Frosting, by the unit's kind.
      const candyLabel = candyCommandLabelV7(this.#snapshot.view, command);
      const label =
        candyLabel ??
        (abandonedEgg === undefined
          ? commandLabel(command, this.#viewerFaction())
          : ABANDON_EGG_LABEL_V7);
      const action = button(
        this.#document,
        "",
        command.kind === "BUILD_MONUMENT"
          ? `command-build_monument-${command.achievement.toLowerCase()}`
          : `command-${command.kind.toLowerCase()}`,
        command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL"
          ? "v7-train-action"
          : "v7-context-action",
      );
      action.append(text(this.#document, "span", label, "v7-action-label"));
      action.title = label;
      // Bead pulp_wars-621: an area support's one button helps every
      // marked unit; hovering or focusing it makes their marks prominent.
      if (command.kind === "TEND_WOUNDED" || command.kind === "RALLY")
        this.#linkAreaSupportButton(action, command.unitId, command.kind);
      // Faction building looks (epic pulp_wars-xdh): the tooltip says what
      // the faction's building counts as ("Counts as a Farm.").
      const factionBuilding = factionBuildCommandV7(
        command.kind,
        this.#viewerFaction(),
      );
      if (factionBuilding !== null) {
        action.title = `${label} · ${factionBuilding.flavour}`;
        action.dataset.factionBuilding = "true";
      }
      // The Dwarf revision (section 16.1): a Dwarf Tend Wounded is Repair.
      if (
        command.kind === "TEND_WOUNDED" &&
        this.#viewerFaction() === "DWARF"
      ) {
        action.title = REPAIR_TOOLTIP_V7;
        action.setAttribute("aria-description", `${REPAIR_TOOLTIP_V7}.`);
        action.dataset.dwarfRepair = "true";
        action.append(
          text(this.#document, "span", REPAIR_CHIP_V7, "v7-dwarf-repair-chip"),
        );
      }
      // The Candy revision (section 15.2): the Frosting tooltip.
      if (command.kind === "TEND_WOUNDED" && candyLabel !== null) {
        action.title = FROSTING_TOOLTIP_V7;
        action.setAttribute("aria-description", `${FROSTING_TOOLTIP_V7}.`);
        action.dataset.candyFrosting = "true";
      }
      if (command.kind === "CULTIVATE_FOREST") {
        action.title =
          "Clear for farming · Removes Forest and creates Fertile Ground";
        action.setAttribute(
          "aria-description",
          "Removes Forest and creates Fertile Ground.",
        );
      }
      const artId = commandArtIdV7(command);
      const commandArt = this.#chibiArt(
        commandSubjectV7(command, this.#viewerFaction()),
        CHIBI_DOM_BOXES_V7.action,
        this.#viewerColour(),
      );
      const trainBadge: FactionBadgeV7 =
        command.kind === "TRAIN" ? factionBadgeV7(this.#viewerFaction()) : null;
      if (commandArt !== null)
        action.prepend(
          factionBadgeArt(
            this.#document,
            commandArt.element,
            commandArt.factionArt ? null : trainBadge,
          ),
        );
      else if (artId !== null)
        action.prepend(
          factionBadgeArt(
            this.#document,
            art(this.#document, artId, ""),
            trainBadge,
          ),
        );
      const factionIcon = FACTION_COMMAND_ICONS[command.kind];
      if (factionIcon !== undefined && commandArt === null)
        action.prepend(
          uiIconV7(this.#document, factionIcon, "v7-ui-icon v7-command-icon"),
        );
      if (command.kind === "BUILD_FIELD_DEFENSE")
        action.prepend(
          createTacticalSymbolV7(
            this.#document,
            "ui-action-field-defense",
            this.#tacticalTheme(),
          ),
        );
      if (command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL") {
        const view = this.#snapshot.view;
        const rule = effectiveRoleRuleV7(command.role, this.#viewerFaction());
        const cost =
          view === null
            ? (rule.cost ?? 0)
            : trainingCostForViewV7(view, command);
        action.setAttribute(
          "aria-label",
          `Train ${rule.label} for ${cost} Coins`,
        );
        action.append(economyChips(this.#document, { cost }));
        // Revision 19: a Dinosaur viewer counts capacity in slots, so every
        // production row names its slots (trained units always use one);
        // the Martian revision: so does a Martian viewer (a Mothership
        // takes two); the Ice Folk revision: and an Ice Folk one (spec 13.1).
        if (
          view !== null &&
          (this.#viewerFaction() === "DINOSAUR" ||
            this.#viewerFaction() === "MARTIAN" ||
            this.#viewerFaction() === "ICE_FOLK" ||
            this.#viewerFaction() === "DWARF")
        ) {
          const slots = seatRoleMechanicsV7(
            view,
            view.viewer.id,
            command.role,
          ).capacitySlots;
          const facts = el(this.#document, "span", "v7-egg-facts");
          const fact = text(
            this.#document,
            "span",
            slotsTextV7(slots),
            "v7-egg-fact",
          );
          fact.dataset.eggFact = "slots";
          fact.dataset.slots = String(slots);
          facts.append(fact);
          action.append(facts);
        }
      } else if (command.kind === "BUILD_MONUMENT") {
        action.setAttribute(
          "aria-label",
          `${commandLabel(command, this.#viewerFaction())} · free · population +3`,
        );
        action.append(economyChips(this.#document, { population: 3 }));
      } else if (command.kind === "BUILD_FIELD_DEFENSE") {
        const view = this.#snapshot.view;
        const unit = view?.units.find((item) => item.id === command.unitId);
        const tile = view?.board.tiles.find(
          (item) => unit !== undefined && same(item.at, unit.at),
        );
        const resultingLevel =
          tile?.explored === true ? (tile.fortificationLevel ?? 0) + 1 : 1;
        action.setAttribute(
          "aria-label",
          `Build Field Defense for 3 Coins · fortification level ${resultingLevel}`,
        );
        action.append(economyChips(this.#document, { cost: 3 }));
      } else if (command.kind === "LAND_GRANT") {
        action.setAttribute("aria-label", "Land grant for 6 Coins");
        action.append(economyChips(this.#document, { cost: 6 }));
      } else if (
        command.kind === "TEND_WOUNDED" &&
        this.#snapshot.view !== null &&
        matchHasUndeadV7(this.#snapshot.view)
      ) {
        // Revision 14: the exact heals and cures (Undead matches only, so a
        // Human-only Tend button is unchanged).
        const view = this.#snapshot.view;
        const preview = previewTendWoundedV7(view, command.unitId);
        if (preview !== null) {
          const summary = tendPreviewPresentationV7(view, preview);
          action.setAttribute(
            "aria-label",
            `${commandLabel(command, this.#viewerFaction())} · ${summary.description}`,
          );
          action.title = summary.description;
          if (summary.chip !== "")
            action.append(
              text(
                this.#document,
                "span",
                summary.chip,
                "v7-undead-preview-chip",
              ),
            );
        }
      } else if (command.kind === "KABOOM") {
        // Revision 17: the blast preview is shown on hover or focus and while
        // armed; activating the button arms it and asks for confirmation.
        this.#decorateKaboomButton(action, command.unitId);
      } else if (command.kind === "PROMOTE") {
        // Revision 20: a Promotion adds maximum HP and fully heals.
        action.title = PROMOTE_TOOLTIP_V7;
        action.setAttribute("aria-label", PROMOTE_TOOLTIP_V7);
      } else if (abandonedEgg !== undefined) {
        const refund = eggRefundV7(abandonedEgg.role, this.#viewerFaction());
        action.title = abandonEggTooltipV7(refund);
        action.setAttribute(
          "aria-label",
          `${ABANDON_EGG_LABEL_V7}. ${abandonEggTooltipV7(refund)}`,
        );
        const chip = el(this.#document, "span", "v7-command-economy");
        const gain = el(this.#document, "span", "v7-economy-chip is-gain");
        gain.append(`+${refund}`, economyIcon(this.#document, "coin"));
        chip.append(gain);
        action.append(chip);
      } else if (
        command.kind === "WAIL" ||
        command.kind === "RAISE_DEAD" ||
        command.kind === "DEVOUR"
      ) {
        const view = this.#snapshot.view;
        const summary =
          view === null
            ? null
            : undeadCommandPreview(view, command.kind, command.unitId);
        if (summary !== null) {
          action.setAttribute(
            "aria-label",
            `${commandLabel(command, this.#viewerFaction())} · ${summary.description}`,
          );
          action.title = summary.description;
          action.append(
            text(
              this.#document,
              "span",
              summary.chip,
              "v7-undead-preview-chip",
            ),
          );
        }
      } else {
        const view = this.#snapshot.view;
        const preview = view === null ? null : previewEconomicV7(view, command);
        if (preview?.ok) {
          action.setAttribute(
            "aria-label",
            `${commandLabel(command, this.#viewerFaction())} · ${economicPreviewLabelV7(preview.preview)}`,
          );
          action.append(
            economyChips(this.#document, {
              cost: preview.preview.cost,
              population: preview.preview.populationDeltaByCity.reduce(
                (total, change) => total + change.delta,
                0,
              ),
              income: preview.preview.coinIncomeDeltaByCity.reduce(
                (total, change) => total + change.delta,
                0,
              ),
            }),
          );
          // The naval branch interface (section 5.4): the preview's
          // population of a dock already includes the viewer's Harbours.
          const harbours =
            view !== null &&
            (command.kind === "BUILD_PORT" || command.kind === "BUILD_SHIPYARD")
              ? viewerHarbourPopulationV7(view)
              : 0;
          if (harbours > 0) {
            action.dataset.harbours = String(harbours);
            action.title = `${HARBOURS_LABEL_V7}: +${harbours} population (included)`;
            action.setAttribute(
              "aria-label",
              `${action.getAttribute("aria-label") ?? ""} · ${HARBOURS_LABEL_V7} +${harbours} included`,
            );
          }
        }
      }
      action.disabled = this.#localBusy();
      action.onclick =
        command.kind === "KABOOM"
          ? () => this.#toggleKaboom(command.unitId)
          : () => void this.#dispatch(command);
      if (command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL") {
        const card = el(this.#document, "div", "v7-train-card");
        const help = button(
          this.#document,
          "",
          `train-help-${command.role.toLowerCase()}`,
          "v7-train-help",
        );
        help.append(text(this.#document, "span", "?", "v7-train-help-glyph"));
        const label = effectiveRoleRuleV7(
          command.role,
          this.#viewerFaction(),
        ).label;
        help.setAttribute("aria-label", `About ${label}`);
        help.disabled = this.#localBusy();
        help.onclick = () => {
          this.#selectedRecruitHelp = command.role;
          this.#render();
        };
        card.append(action, help);
        actions.append(card);
      } else actions.append(action);
    }
    return actions;
  }

  #appendCommandArea(
    dock: HTMLElement,
    predicate: (command: CommandV7) => boolean,
    researchPrompts: readonly TileResearchPromptV7[] = [],
  ): void {
    const actions = this.#commandButtons(predicate);
    for (const prompt of researchPrompts)
      actions.append(this.#researchPromptButton(prompt));
    if (actions.querySelector("button") !== null) {
      dock.dataset.hasActions = "true";
      dock.append(actions);
      return;
    }
  }

  /**
   * A research prompt of the tile dock (bead pulp_wars-gl1): the icon and
   * name of the technology the tile's resource needs. It opens the
   * technology screen on that technology, or on its first missing
   * prerequisite.
   */
  #researchPromptButton(prompt: TileResearchPromptV7): HTMLButtonElement {
    const faction = this.#viewerFaction();
    const name = technologyNameV7(prompt.tech, faction);
    const action = button(
      this.#document,
      "",
      `research-prompt-${prompt.tech.toLowerCase()}`,
      "v7-context-action v7-research-prompt",
    );
    const image =
      this.#chibiArt(
        technologySubjectV7(prompt.tech, faction),
        CHIBI_DOM_BOXES_V7.action,
        this.#viewerColour(),
      )?.element ?? art(this.#document, RULESET7_TECH_ART_IDS[prompt.tech], "");
    action.append(
      image,
      text(this.#document, "span", `Research ${name}`, "v7-research-label"),
    );
    action.dataset.tech = prompt.tech;
    action.dataset.selectTech = prompt.select;
    action.dataset.unlocks = prompt.command.toLowerCase();
    const unlocked = commandLabel(
      { kind: prompt.command } as CommandV7,
      faction,
    );
    action.title = `Research ${name} · ${unlocked}`;
    action.setAttribute("aria-label", `Research ${name} to unlock ${unlocked}`);
    action.disabled = this.#localBusy();
    action.onclick = () => this.#openResearchPrompt(prompt);
    return action;
  }

  /**
   * Opens the technology screen for a research prompt: its technology (or
   * the first missing prerequisite) is selected and the Research control,
   * when it is offered, has the focus. Closing returns to the same tile.
   */
  #openResearchPrompt(prompt: TileResearchPromptV7): void {
    const view = this.#snapshot.view;
    if (view === null || view.pendingChoices.length > 0) return;
    this.#modalReturnAction = `research-prompt-${prompt.tech.toLowerCase()}`;
    this.#techGoal = prompt.tech;
    this.#selectedTech = prompt.select;
    this.#screen = "TECH";
    this.#render();
    const selected = prompt.select.toLowerCase();
    queueMicrotask(() => {
      if (this.#destroyed) return;
      const card = this.#root.querySelector<HTMLElement>(
        `[data-action="tech-${selected}"]`,
      );
      card?.scrollIntoView?.({ block: "center", inline: "center" });
      (
        this.#root.querySelector<HTMLElement>(
          `[data-action="research-${selected}"]`,
        ) ??
        card ??
        this.#root.querySelector<HTMLElement>('[data-action="close-overlay"]')
      )?.focus();
    });
  }

  async #handleMapCommand(target: MapCommandTargetV7): Promise<void> {
    const view = this.#snapshot.view;
    if (view === null) return;
    const command = target.command;
    // The Martian revision: choosing a Beam Down passenger moves on to its
    // tiles; nothing is dispatched yet.
    if (
      target.family === "BEAM_DOWN_PASSENGER" &&
      command.kind === "BEAM_DOWN"
    ) {
      this.#martianPick = {
        kind: "BEAM_DOWN",
        unitId: command.unitId,
        passengerUnitId: command.passengerUnitId,
      };
      this.#notice = `${BEAM_DOWN_PICK_TILE_V7}.`;
      this.#render();
      this.#queueBoardFocus();
      return;
    }
    // The Dwarf revision (passenger first, bead pulp_wars-78i.9): a
    // Hammerer's badge seats or unseats it, a dot moves the seated
    // Hammerer's landing, and a destination is chosen first and dug when
    // chosen again; choosing a bomb target moves on to its landing tiles.
    const tunnelPick =
      this.#dwarfPick?.kind === "TUNNEL" ? this.#dwarfPick : null;
    if (
      tunnelPick !== null &&
      command.kind === "TUNNEL" &&
      (target.family === "TUNNEL_PASSENGER" ||
        target.family === "TUNNEL_RIDER" ||
        target.family === "TUNNEL_DESTINATION")
    ) {
      if (target.family === "TUNNEL_PASSENGER") {
        const id = command.rider?.unitId ?? null;
        this.#dwarfPick = {
          ...tunnelPick,
          riderUnitId: tunnelPick.riderUnitId === id ? null : id,
          riderTo: null,
        };
      } else if (target.family === "TUNNEL_RIDER")
        this.#dwarfPick = { ...tunnelPick, riderTo: command.rider?.to ?? null };
      else if (tunnelPick.to !== null && same(tunnelPick.to, command.to)) {
        void this.#dispatch(command);
        return;
      } else {
        this.#dwarfPick = { ...tunnelPick, to: command.to, riderTo: null };
        this.#notice = `${target.semanticLabel ?? TUNNEL_LABEL_V7}. ${TUNNEL_CONFIRM_HINT_V7}.`;
      }
      this.#render();
      this.#queueBoardFocus();
      return;
    }
    if (target.family === "BOMB_TARGET" && command.kind === "BOMB_RUN") {
      this.#dwarfPick = {
        kind: "BOMB_RUN",
        unitId: command.unitId,
        targetUnitId: command.targetUnitId,
      };
      this.#notice = `${BOMB_RUN_PICK_LANDING_V7}.`;
      this.#render();
      this.#queueBoardFocus();
      return;
    }
    // The Candy revision (section 15.1): a target of the armed Sugar Rush
    // sends `SUGAR_RUSH` and then the Move to that tile or the Attack, each
    // only while it is offered.
    if (target.sugarRush !== undefined) {
      const unitId =
        command.kind === "SUGAR_RUSH" || command.kind === "ATTACK"
          ? command.unitId
          : null;
      if (unitId === null) return;
      const rushed = await this.#dispatch({ kind: "SUGAR_RUSH", unitId });
      if (!rushed || this.#destroyed) return;
      const next = this.#snapshot.offeredCommands.find((offered) =>
        command.kind === "ATTACK"
          ? offered.kind === "ATTACK" &&
            offered.unitId === unitId &&
            offered.targetUnitId === command.targetUnitId
          : offered.kind === "MOVE" &&
            offered.unitId === unitId &&
            same(offered.path.at(-1) ?? { x: -1, y: -1 }, target.at),
      );
      if (next !== undefined) await this.#dispatch(next);
      return;
    }
    const moved = await this.#dispatch(command);
    // Revision 16 two-step landing: land only when the one-cell Move reached
    // its water cell and the landing is still offered there.
    const followUp = target.followUp;
    if (!moved || followUp === undefined || command.kind !== "MOVE") return;
    const via = command.path.at(-1);
    const after = this.#snapshot;
    const unit = after.view?.units.find(
      (candidate) => candidate.id === followUp.unitId,
    );
    if (
      this.#destroyed ||
      via === undefined ||
      unit === undefined ||
      unit.form !== "EMBARKED" ||
      !same(unit.at, via) ||
      !after.offeredCommands.some(
        (offered) =>
          offered.kind === "DISEMBARK" &&
          offered.unitId === followUp.unitId &&
          same(offered.at, followUp.at),
      )
    )
      return;
    await this.#dispatch(followUp);
  }

  /** Revision 16 legend for the landing preview's two marker styles. */
  #landingLegend(view: PlayerViewV7, unitId: UnitId): HTMLElement | null {
    const preview = queryLandingPreviewV7(
      view,
      unitId,
      this.#snapshot.offeredCommands,
    );
    if (
      preview === null ||
      (preview.direct.length === 0 && preview.afterMove.length === 0)
    )
      return null;
    const legend = el(this.#document, "ul", "v7-landing-legend");
    legend.setAttribute("aria-label", "Landing markers");
    for (const [marker, label] of [
      ["now", LANDING_NOW_LABEL_V7],
      ["after-move", LANDING_AFTER_MOVE_LABEL_V7],
    ] as const) {
      const item = el(this.#document, "li", "v7-landing-legend-item");
      item.dataset.landingMarker = marker;
      const swatch = el(this.#document, "span", "v7-landing-legend-swatch");
      swatch.setAttribute("aria-hidden", "true");
      item.append(swatch, text(this.#document, "span", label));
      legend.append(item);
    }
    return legend;
  }

  /**
   * The Martian revision: the legend of a machine's Launch tiles (a Move
   * that ends on water self-launches it), shown while it has any.
   */
  #launchLegend(view: PlayerViewV7, unitId: UnitId): HTMLElement | null {
    const launch = this.#snapshot.offeredCommands
      .map((command) =>
        command.kind === "MOVE" && command.unitId === unitId
          ? martianMoveLabelV7(view, command)
          : null,
      )
      .find((label): label is string => label !== null);
    if (launch === undefined) return null;
    const legend = el(this.#document, "ul", "v7-landing-legend");
    legend.setAttribute("aria-label", "Launch markers");
    const item = el(this.#document, "li", "v7-landing-legend-item");
    item.dataset.landingMarker = "launch";
    const swatch = el(this.#document, "span", "v7-landing-legend-swatch");
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, text(this.#document, "span", launch));
    legend.append(item);
    return legend;
  }

  /**
   * `pulp_wars-1wy.5`: the legend of an Ice Folk unit's Glide tiles (the
   * tiles its half-cost steps from Snow onto Snow reach beyond its Move),
   * shown while it has any.
   */
  #glideLegend(view: PlayerViewV7, unitId: UnitId): HTMLElement | null {
    if (
      !matchHasIceFolkSeatV7(view) ||
      !this.#snapshot.offeredCommands.some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === unitId &&
          moveIsGlideV7(view, command),
      )
    )
      return null;
    const legend = el(this.#document, "ul", "v7-landing-legend");
    legend.setAttribute("aria-label", "Glide markers");
    const item = el(this.#document, "li", "v7-landing-legend-item");
    item.dataset.landingMarker = "glide";
    const swatch = el(this.#document, "span", "v7-landing-legend-swatch");
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, text(this.#document, "span", GLIDE_MOVE_LABEL_V7));
    legend.append(item);
    return legend;
  }

  #tacticalTheme(): TacticalSymbolTheme {
    return this.#highContrast ? "HIGH_CONTRAST" : "DARK";
  }

  /** Tech, Help/menu screens, unit info and recruit help close on demand. */
  #popupDismissable(popup: HTMLElement): boolean {
    const region = popup.dataset.v7Region ?? "";
    return (
      region.startsWith("overlay-") ||
      region === "unit-help" ||
      region === "recruit-help"
    );
  }

  /**
   * The dim layer behind a popup. A click on it closes a dismissable popup
   * (as Escape and the close button do); behind the mandatory reward,
   * results and error dialogs it only blocks the click.
   */
  #scrim(popup: HTMLElement): HTMLElement {
    const scrim = el(this.#document, "div", "v7-scrim");
    scrim.dataset.v7Region = "scrim";
    const dismissable = this.#popupDismissable(popup);
    scrim.dataset.dismissable = String(dismissable);
    scrim.setAttribute("aria-hidden", "true");
    scrim.onclick = (event) => {
      event.stopPropagation();
      if (dismissable) this.#dismissPopup();
    };
    return scrim;
  }

  #overlay(view: PlayerViewV7): HTMLElement {
    const overlay = el(this.#document, "section", "v7-overlay");
    overlay.dataset.screen = this.#screen.toLowerCase();
    overlay.dataset.v7Region = `overlay-${this.#screen.toLowerCase()}`;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const close = iconButton(this.#document, "close", "Close", "close-overlay");
    close.classList.add("close-button");
    close.onclick = () => {
      this.#closeOverlay();
    };
    if (this.#screen === "TECH") overlay.append(this.#technology(view));
    else if (this.#screen === "LEADERBOARD")
      overlay.append(this.#leaderboard(view));
    else if (this.#screen === "ACHIEVEMENTS")
      overlay.append(this.#achievements(view));
    else if (this.#screen === "SETTINGS") overlay.append(this.#settings());
    else overlay.append(this.#help());
    overlay.prepend(close);
    return overlay;
  }

  #help(): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen v7-help");
    const tips = this.#document.createElement("ul");
    tips.className = "v7-help-tips";
    const view = this.#snapshot.view;
    const undeadViewer = view?.viewer.faction === "UNDEAD";
    for (const tip of [
      // Bead pulp_wars-9im: every target is picked on the map; the legend
      // under these tips shows the four marks.
      "Select a unit, then pick a highlighted target on the map.",
      OWN_UNIT_PASS_THROUGH_TEXT_V7,
      ROAD_MOVEMENT_TEXT_V7,
      // Revision 19: a Dinosaur city also lays Eggs.
      view?.viewer.faction === "DINOSAUR"
        ? "Select your city to train units and lay Eggs."
        : "Select your city to train units.",
      "Select a tile in your land to harvest or build.",
      "Spend coins on technology to unlock more. Your first technology is free.",
      "Fruit is visible from the start; Gathering reveals Fertile Ground.",
      ...(view !== null && undeadViewer
        ? undeadHelpTipsV7(view)
        : [
            // Revision 17: Goblin Wolf Riders have no Escape; revision 19:
            // neither have Dinosaur Raptors, nor Martian Saucers, nor Ice
            // Folk Sleds.
            ...(view?.viewer.faction === "GOBLIN" ||
            view?.viewer.faction === "DINOSAUR" ||
            view?.viewer.faction === "MARTIAN" ||
            view?.viewer.faction === "ICE_FOLK" ||
            view?.viewer.faction === "DWARF"
              ? []
              : ["A Raider that survives an attack may move again (Escape)."]),
            ...(view !== null && matchHasUndeadV7(view)
              ? [
                  "Units that fall in battle on land leave Graves. Undead raise or devour them, and Zombie kills rise as Zombies.",
                  // pulp_wars-0ao.16: only a Captain's Tend cures; Goblins
                  // (no Tend Wounded) have no cure.
                  ...(factionCanCureAfflictionsV7(view.viewer.faction)
                    ? [
                        "Lich shots plague your units for 3 turns: −2 HP each turn, spreading to neighbours on the first. Killing the Lich or a Captain's Tend ends it sooner.",
                        "Zombie bites make your units rise as enemy Zombies when they die; a Captain's Tend cures bites.",
                      ]
                    : [
                        `Lich shots plague your units for 3 turns: −2 HP each turn, spreading to neighbours on the first. ${factionNameV7(view.viewer.faction)}s can't cure it; only killing the Lich ends it sooner.`,
                        `Zombie bites make your units rise as enemy Zombies when they die; ${factionNameV7(view.viewer.faction)}s can't cure bites.`,
                      ]),
                  "Your units can't strike back at a Vampire's attack.",
                ]
              : []),
          ]),
      // Revision 20: a Promotion fully heals (every faction).
      PROMOTION_HELP_TIP_V7,
      // Revision 21: what achievements are for.
      ACHIEVEMENT_HELP_TIP_V7,
      "Capture every enemy city to win.",
      // Map scale (bead pulp_wars-ykw.5): the player limit.
      PLAYER_LIMIT_HELP_TIP_V7(),
      "Move a land unit onto your port to put it to sea.",
      // Faction building looks (epic pulp_wars-xdh), in a match with a
      // faction that has one.
      ...(view !== null && matchHasFactionBuildingsV7(view)
        ? [FACTION_BUILDINGS_HELP_V7]
        : []),
      // The Rift (bead pulp_wars-9s0.5), once the viewer has seen one.
      ...(view !== null &&
      view.board.tiles.some((tile) => tile.explored && tile.terrain === "RIFT")
        ? [RIFT_HELP_TIP_V7]
        : []),
      ...(view !== null && view.setup.mapType !== "DRY_LAND"
        ? [
            AT_SEA_MOVE_TEXT_V7,
            "Shallow Water: water that shares an edge with land. Water touching land only at a corner is Deep Water.",
          ]
        : []),
    ])
      tips.append(text(this.#document, "li", tip));
    const keys = el(this.#document, "dl", "v7-help-keys");
    for (const [key, action] of [
      ["Arrows", "Move cursor"],
      ["Enter", "Select"],
      ["Tab", "Next target"],
      ["Esc", "Deselect"],
      ["E", "End turn"],
      ["T", "Technology"],
      ["G", "Leaderboard"],
      ["+ / −", "Zoom"],
    ] as const) {
      const row = el(this.#document, "div", "v7-help-key");
      row.append(
        text(this.#document, "dt", key),
        text(this.#document, "dd", action),
      );
      keys.append(row);
    }
    const legend = targetLegendV7(this.#document);
    legend.title = TARGET_HIGHLIGHT_HELP_TIP_V7;
    section.append(text(this.#document, "h2", "How to play"), tips, legend);
    // Revision 17 (section 11.3): one sentence per Goblin rule, for every
    // viewer of a match with a Goblin seat.
    if (view !== null && matchHasGoblinV7(view)) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin";
      for (const [name, sentence] of GOBLIN_HELP_RULES_V7) {
        const item = el(this.#document, "li", "v7-help-rule");
        item.append(text(this.#document, "strong", `${name}:`), ` ${sentence}`);
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "Goblins"), rules);
    }
    // Revision 19 (section 12.3): one sentence per Dinosaur rule, for every
    // viewer of a match with a Dinosaur seat.
    if (view !== null && matchHasDinosaurV7(view)) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin v7-help-dinosaur";
      for (const [name, sentence] of DINOSAUR_HELP_RULES_V7) {
        const item = el(this.#document, "li", "v7-help-rule");
        item.append(text(this.#document, "strong", `${name}:`), ` ${sentence}`);
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "Dinosaurs"), rules);
    }
    // The Martian revision (section 13.3): one sentence per Martian rule,
    // for every viewer of a match with a Martian seat.
    if (view !== null && matchHasMartianV7(view)) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin v7-help-martian";
      for (const [name, sentence] of MARTIAN_HELP_RULES_V7) {
        const item = el(this.#document, "li", "v7-help-rule");
        item.append(text(this.#document, "strong", `${name}:`), ` ${sentence}`);
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "Martians"), rules);
    }
    // The Ice Folk revision (section 13.3): one sentence per Ice Folk rule,
    // for every viewer of a match with an Ice Folk seat.
    if (view !== null && matchHasIceFolkSeatV7(view)) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin v7-help-ice-folk";
      for (const [name, sentence] of ICE_FOLK_HELP_RULES_V7) {
        const item = el(this.#document, "li", "v7-help-rule");
        item.append(text(this.#document, "strong", `${name}:`), ` ${sentence}`);
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "Ice Folk"), rules);
    }
    // The Dwarf revision (section 16.3): one sentence per Dwarf rule, for
    // every viewer of a match with a Dwarf seat.
    if (view !== null && matchHasDwarfSeatV7(view)) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin v7-help-dwarf";
      for (const [name, sentence] of DWARF_HELP_RULES_V7) {
        const item = el(this.#document, "li", "v7-help-rule");
        item.append(text(this.#document, "strong", `${name}:`), ` ${sentence}`);
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "Dwarves"), rules);
    }
    // The Candy revision (section 15.3): one sentence per Candy rule, for
    // every viewer of a match with a Candy seat.
    if (view !== null && matchHasCandySeatV7(view)) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin v7-help-candy";
      for (const [name, sentence] of CANDY_HELP_RULES_V7) {
        const item = el(this.#document, "li", "v7-help-rule");
        item.append(text(this.#document, "strong", `${name}:`), ` ${sentence}`);
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "Candy"), rules);
    }
    // The naval branch interface (section 14.2): one sentence per naval
    // rule, in a match whose Naval branch can be researched.
    if (
      view !== null &&
      view.setup.mapType !== "DRY_LAND" &&
      !forbiddenTechnologiesV7(view.setup).has("SEAMANSHIP")
    ) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin v7-help-naval";
      for (const [name, sentence] of NAVAL_HELP_RULES_V7) {
        const item = el(this.#document, "li", "v7-help-rule");
        item.append(text(this.#document, "strong", `${name}:`), ` ${sentence}`);
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "At sea"), rules);
    }
    // Map curiosities (section 12.1): the four sentences, the bounty and
    // the setup option, each with its legend icon, in a match that was
    // launched with the option on.
    if (view !== null && matchOffersCuriositiesV7(view)) {
      const rules = this.#document.createElement("ul");
      rules.className = "v7-help-tips v7-help-goblin v7-help-curiosities";
      for (const rule of curiosityHelpRulesV7()) {
        const item = el(this.#document, "li", "v7-help-rule");
        const body = el(this.#document, "span", "v7-help-rule-text");
        body.append(
          text(this.#document, "strong", `${rule.name}:`),
          ` ${rule.rule}`,
        );
        item.append(
          rule.icon === null
            ? el(this.#document, "span", "v7-curiosity-icon")
            : this.#curiosityIcon(rule.icon),
          body,
        );
        rules.append(item);
      }
      section.append(text(this.#document, "h3", "Curiosities"), rules);
    }
    section.append(text(this.#document, "h3", "Keyboard"), keys);
    return section;
  }

  #technology(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-tech-screen");
    const header = el(this.#document, "div", "v7-screen-header");
    const coins = el(this.#document, "p", "v7-coins v7-tech-coins");
    coins.append(
      economyIcon(this.#document, "coin"),
      text(this.#document, "span", String(view.viewer.coins)),
    );
    coins.setAttribute("aria-label", `${view.viewer.coins} Coins`);
    header.append(text(this.#document, "h2", "Technology"), coins);
    section.append(header);
    const tree = queryTechnologyTreeV7(view);
    const layout = technologyTreeLayoutV7(tree.nodes);
    const branches = el(this.#document, "nav", "v7-tech-branch-selector");
    branches.setAttribute("aria-label", "Technology branches");
    const branchSelect = this.#document.createElement("select");
    branchSelect.className = "v7-tech-branch-select";
    branchSelect.dataset.action = "tech-branch-select";
    branchSelect.setAttribute("aria-label", "Jump to technology branch");
    const graph = el(this.#document, "div", "v7-tech-graph");
    graph.style.setProperty(
      "--v7-tech-total-leaves",
      String(layout.reduce((total, branch) => total + branch.leafCount, 0)),
    );
    for (const branch of layout) {
      const column = el(this.#document, "section", "v7-tech-branch");
      column.style.setProperty(
        "--v7-tech-branch-span",
        String(branch.leafCount),
      );
      const laneId = `${branch.node.branch}:${branch.node.id}`;
      const branchId = `v7-tech-branch-${branch.node.branch.toLowerCase()}-${branch.node.id.toLowerCase()}`;
      column.id = branchId;
      column.dataset.techBranch = branch.node.branch;
      column.dataset.techLane = laneId;
      column.tabIndex = -1;
      const branchName =
        TECH_BRANCH_LABELS[branch.node.branch] ?? title(branch.node.branch);
      const heading = text(this.#document, "h3", branchName);
      heading.id = `${branchId}-heading`;
      column.setAttribute("aria-labelledby", heading.id);
      column.append(heading);
      appendTechNode(
        this.#document,
        column,
        branch,
        (node) => {
          this.#selectedTech = node.id;
          this.#pendingFocusAction = `research-${node.id.toLowerCase()}`;
          this.#render();
          queueMicrotask(() => {
            const detail =
              this.#root.querySelector<HTMLElement>(".v7-tech-detail");
            if (detail === null) return;
            detail.scrollIntoView?.({ block: "nearest" });
            if (this.#document.activeElement?.closest(".v7-tech-detail"))
              return;
            detail
              .querySelector<HTMLElement>(
                '[data-action^="research-"], [data-action="close-tech-detail"]',
              )
              ?.focus();
          });
        },
        this.#selectedTech,
        (tech) => this.#technologyChibiArt(tech)?.element ?? null,
        this.#viewerFaction(),
        (tech) => this.#technologyUnavailableText(tech),
        this.#techGoal,
      );
      const option = this.#document.createElement("option");
      option.value = laneId;
      option.textContent = branchName;
      branchSelect.append(option);
      graph.append(column);
    }
    branchSelect.onchange = () => {
      const column = graph.querySelector<HTMLElement>(
        `[data-tech-lane="${branchSelect.value}"]`,
      );
      column?.scrollIntoView?.({ block: "start" });
    };
    branches.append(branchSelect);
    section.append(branches, graph);
    const selected = tree.nodes.find((node) => node.id === this.#selectedTech);
    if (selected !== undefined) section.append(this.#techDetail(selected));
    return section;
  }

  #techDetail(node: PublicTechnologyNodeV7): HTMLElement {
    const faction = this.#viewerFaction();
    const name = technologyNameV7(node.id, faction);
    const detail = el(this.#document, "aside", "v7-tech-detail");
    detail.dataset.techState = node.state.toLowerCase();
    detail.setAttribute("aria-label", `${name} details`);
    const close = iconButton(
      this.#document,
      "close",
      "Close",
      "close-tech-detail",
    );
    close.classList.add("close-button");
    close.onclick = () => {
      const id = node.id;
      this.#selectedTech = null;
      this.#pendingFocusAction = `tech-${id.toLowerCase()}`;
      this.#render();
    };
    const status =
      node.state === "OWNED"
        ? text(this.#document, "p", "Researched", "v7-tech-status is-owned")
        : node.state === "DISABLED"
          ? text(
              this.#document,
              "p",
              this.#technologyUnavailableText(node.id),
              "v7-tech-status is-locked",
            )
          : node.missingPrerequisites.length > 0
            ? text(
                this.#document,
                "p",
                `Requires ${node.missingPrerequisites.map((tech) => technologyNameV7(tech, faction)).join(", ")}`,
                "v7-tech-status is-locked",
              )
            : node.affordable
              ? null
              : text(
                  this.#document,
                  "p",
                  `Need ${node.cost} Coins`,
                  "v7-tech-status is-short",
                );
    detail.append(
      close,
      identity(
        this.#document,
        RULESET7_TECH_ART_IDS[node.id],
        name,
        false,
        null,
        this.#technologyChibiArt(node.id)?.element,
      ),
    );
    if (status !== null) detail.append(status);
    if (node.state === "AVAILABLE" && node.cost === 0)
      detail.append(
        text(
          this.#document,
          "p",
          "Free: your first technology costs nothing",
          "v7-tech-status is-free",
        ),
      );
    const unlocks = this.#document.createElement("ul");
    unlocks.className = "v7-tech-unlocks";
    for (const group of technologyEffectGroupsV7(
      node.effects,
      this.#viewerFaction(),
    ))
      for (const item of group.items) {
        const entry = text(this.#document, "li", item);
        entry.dataset.effectGroup = group.id;
        unlocks.append(entry);
      }
    for (const note of navalTechnologyNotesV7(node.id, faction))
      unlocks.append(text(this.#document, "li", note));
    const achievement = techAchievementV7(node.id);
    if (achievement !== null) {
      const entry = el(this.#document, "li", "v7-tech-achievement-note");
      entry.append(
        uiIconV7(this.#document, "trophy"),
        `${achievementNameV7(achievement)} achievement`,
      );
      unlocks.append(entry);
    }
    if (unlocks.childElementCount > 0) detail.append(unlocks);
    const command = this.#snapshot.offeredCommands.find(
      (candidate) =>
        candidate.kind === "RESEARCH" && candidate.tech === node.id,
    );
    if (command !== undefined) {
      const research = button(
        this.#document,
        "",
        `research-${node.id.toLowerCase()}`,
        "primary-action v7-research-action",
      );
      research.append(
        text(this.#document, "span", "Research"),
        economyChips(this.#document, { cost: node.cost }),
      );
      research.setAttribute(
        "aria-label",
        node.cost === 0
          ? `Research ${name} for free`
          : `Research ${name} for ${node.cost} Coins`,
      );
      research.onclick = () => {
        this.#pendingFocusAction = `tech-${node.id.toLowerCase()}`;
        void this.#dispatch(command);
      };
      research.disabled = this.#localBusy();
      detail.append(research);
    }
    return detail;
  }

  #recruitHelp(role: UnitRoleIdV7): HTMLElement {
    const faction = this.#viewerFaction();
    const view = this.#snapshot.view;
    const presentation = recruitmentRolePresentationV7(
      role,
      faction,
      view === null ? undefined : cureCaptainPhraseV7(view),
    );
    const rule = effectiveRoleRuleV7(role, faction);
    const modal = el(this.#document, "section", "v7-recruit-help");
    modal.dataset.v7Region = "recruit-help";
    modal.dataset.recruitRole = role;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", `${presentation.label} information`);
    const close = iconButton(
      this.#document,
      "close",
      "Close",
      "close-recruit-help",
    );
    close.classList.add("close-button");
    close.onclick = () => this.#closeRecruitHelp();
    const header = el(this.#document, "div", "v7-dialog-header");
    const recruitArt = this.#chibiArt(
      portraitSubjectV7(role, faction),
      CHIBI_DOM_BOXES_V7.card,
      this.#viewerColour(),
    );
    header.append(
      factionBadgeArt(
        this.#document,
        recruitArt?.element ??
          art(this.#document, RULESET7_UNIT_ART_IDS[role], ""),
        recruitArt?.factionArt === true ? null : factionBadgeV7(faction),
      ),
      text(this.#document, "h2", presentation.label),
      economyChips(this.#document, { cost: rule.cost ?? 0 }),
    );
    modal.append(close, header);
    modal.append(
      text(this.#document, "p", title(rule.tacticalRole), "v7-tactical-role"),
    );
    const stats = el(this.#document, "dl", "v7-recruit-stats v7-unit-stats");
    for (const stat of presentation.stats) {
      const row = el(this.#document, "div", "v7-stat");
      row.title = stat.label;
      const term = el(this.#document, "dt", "v7-stat-term");
      term.append(
        uiIconV7(
          this.#document,
          STAT_ICONS[stat.label.toUpperCase()] ?? "info",
        ),
        text(this.#document, "span", stat.label, "v7-sr-only"),
      );
      row.append(term, text(this.#document, "dd", stat.value));
      stats.append(row);
    }
    modal.append(stats);
    const notes = [...presentation.abilities, ...presentation.restrictions];
    if (notes.length > 0) {
      const list = this.#document.createElement("ul");
      list.className = "v7-recruit-help-notes";
      for (const note of notes) list.append(text(this.#document, "li", note));
      modal.append(list);
    }
    return modal;
  }

  #leaderboard(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen");
    section.append(
      text(this.#document, "h2", "Leaderboard"),
      text(
        this.#document,
        "p",
        "Capture every enemy city to win.",
        "v7-screen-lede",
      ),
    );
    const list = this.#document.createElement("ol");
    list.className = "v7-leaderboard";
    list.dataset.players = String(view.leaderboard.length);
    const playingId =
      this.#snapshot.phase === "COMPLETE"
        ? null
        : view.turnOrder[view.activeSeatIndex];
    for (const entry of view.leaderboard) {
      const row = el(this.#document, "li", "v7-leaderboard-row");
      // The player whose turn it is carries a mark (map scale 8.5).
      if (entry.playerId === playingId) {
        row.dataset.active = "true";
        row.setAttribute("aria-current", "true");
      }
      // The row's edge and swatch are in the faction colour (bead
      // pulp_wars-b5f.4), the owner colour everywhere else too.
      row.dataset.faction = entry.faction.toLowerCase();
      row.style.setProperty("--player", factionColourV7(entry.faction));
      row.dataset.status = entry.status.toLowerCase();
      if (entry.isViewer) row.dataset.viewer = "true";
      const name = el(this.#document, "span", "v7-leaderboard-name");
      name.append(
        el(this.#document, "span", "v7-player-swatch"),
        entry.isViewer
          ? `${playerName(entry.seat)} (you)`
          : playerName(entry.seat),
      );
      if (matchHasFactionsV7(view)) {
        const faction = text(
          this.#document,
          "span",
          factionNameV7(entry.faction),
          "v7-chip v7-faction-chip",
        );
        faction.dataset.faction = entry.faction.toLowerCase();
        name.append(faction);
      }
      const cities = el(this.#document, "span", "v7-leaderboard-stat");
      cities.title = "Cities";
      cities.append(
        this.#chibiArt(
          cityArtSubjectV7({ artLevel: 1, faction: entry.faction }),
          CHIBI_DOM_BOXES_V7.leaderboard,
          factionColourV7(entry.faction),
        )?.element ?? art(this.#document, "building-city-1", ""),
        String(entry.cityCount),
        text(this.#document, "span", " cities", "v7-sr-only"),
      );
      const units = el(this.#document, "span", "v7-leaderboard-stat");
      units.title = "Units";
      units.append(
        uiIconV7(this.#document, "units"),
        String(entry.livingUnitCount),
        text(this.#document, "span", " units", "v7-sr-only"),
      );
      row.append(name, cities, units);
      if (entry.status === "ELIMINATED")
        row.append(text(this.#document, "span", "Out", "v7-chip is-idle"));
      list.append(row);
    }
    section.append(list);
    return section;
  }

  #achievements(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen");
    section.append(text(this.#document, "h2", "Achievements"));
    section.append(
      text(
        this.#document,
        "p",
        "Each achievement earns a free Monument: +3 population, one per city.",
        "v7-screen-lede",
      ),
    );
    for (const achievement of listedAchievementIdsV7(view.setup.mapType)) {
      const entitlement = view.viewer.achievementEntitlements.find(
        (entry) => entry.achievement === achievement,
      );
      const progress = view.achievementProgress.find(
        (entry) => entry.achievement === achievement,
      );
      const card = el(this.#document, "section", "v7-achievement");
      card.dataset.achievement = achievement;
      const { current, required } =
        progress === undefined
          ? { current: 0, required: 1 }
          : achievementProgressCountsV7(progress);
      // Revision 21: an achievement without an enabling technology is
      // available from the start.
      const tech = ACHIEVEMENT_REQUIRED_TECH_V7[achievement];
      const researched =
        tech === null || view.viewer.researchedTechs.includes(tech);
      const state = entitlement?.spent
        ? "spent"
        : entitlement?.unlocked
          ? "complete"
          : researched
            ? "available"
            : "locked";
      card.dataset.state = state;
      const theme = this.#highContrast
        ? ("HIGH_CONTRAST" as const)
        : ("DARK" as const);
      const symbols = el(this.#document, "div", "v7-achievement-symbols");
      symbols.append(
        createTacticalSymbolV7(
          this.#document,
          entitlement?.spent
            ? "ui-status-achievement-entitlement-spent"
            : entitlement?.unlocked
              ? "ui-status-achievement-entitlement-unlocked"
              : "ui-status-achievement-entitlement-locked",
          theme,
        ),
      );
      const meter = el(this.#document, "div", "v7-achievement-meter");
      const fill = el(this.#document, "span", "v7-achievement-fill");
      fill.style.width = `${Math.min(100, Math.round((current / Math.max(1, required)) * 100))}%`;
      meter.append(fill);
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", String(required));
      meter.setAttribute("aria-valuenow", String(Math.min(current, required)));
      card.append(
        symbols,
        text(this.#document, "h3", achievementNameV7(achievement)),
        text(
          this.#document,
          "p",
          ACHIEVEMENT_GOALS_V7[achievement],
          "v7-achievement-goal",
        ),
        meter,
        text(
          this.#document,
          "p",
          state === "spent"
            ? "Monument built"
            : state === "complete"
              ? "Done! Build your monument."
              : state === "available"
                ? `${current} / ${required}`
                : `Needs ${title(tech ?? "")}`,
          "v7-achievement-status",
        ),
      );
      section.append(card);
    }
    return section;
  }

  #settings(): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen v7-settings");
    section.append(text(this.#document, "h2", "Settings"));
    const display = el(this.#document, "div", "v7-settings-grid");
    const motion = select(
      this.#document,
      "Motion",
      "v7-motion",
      ["FULL", "REDUCED"],
      this.#motion,
      { FULL: "Full", REDUCED: "Reduced" },
    );
    motion.querySelector("select")?.addEventListener("change", (event) => {
      this.#motion =
        (event.currentTarget as HTMLSelectElement).value === "REDUCED"
          ? "REDUCED"
          : "FULL";
      this.#persistSettings();
      this.#render();
    });
    const speed = select(
      this.#document,
      "Animation speed",
      "v7-animation-speed",
      ["NORMAL", "FAST"],
      this.#animationSpeed,
      { NORMAL: "Normal", FAST: "Fast" },
    );
    speed.querySelector("select")?.addEventListener("change", (event) => {
      this.#animationSpeed =
        (event.currentTarget as HTMLSelectElement).value === "FAST"
          ? "FAST"
          : "NORMAL";
      if (this.#animationSpeed === "FAST") this.#cancelPresentations();
      this.#persistSettings();
      this.#render();
    });
    const scale = select(
      this.#document,
      "UI size",
      "v7-ui-scale",
      ["1", "1.25", "1.5", "2"],
      String(this.#uiScale),
      { "1": "100%", "1.25": "125%", "1.5": "150%", "2": "200%" },
    );
    scale.querySelector("select")?.addEventListener("change", (event) => {
      const value = Number((event.currentTarget as HTMLSelectElement).value);
      this.#uiScale =
        value === 1.25 || value === 1.5 || value === 2 ? value : 1;
      this.#persistSettings();
      this.#render();
    });
    const contrast = button(
      this.#document,
      this.#highContrast ? "High contrast: on" : "High contrast: off",
      "high-contrast",
      "v7-toggle",
    );
    contrast.setAttribute("aria-pressed", String(this.#highContrast));
    contrast.onclick = () => {
      this.#highContrast = !this.#highContrast;
      this.#persistSettings();
      this.#render();
    };
    display.append(motion, speed, scale, contrast);
    const game = el(this.#document, "div", "button-row");
    const restart = button(this.#document, "Restart game", "restart");
    restart.onclick = () => void this.#restart();
    const remove = button(
      this.#document,
      "Delete save",
      "delete-save",
      "destructive",
    );
    remove.onclick = () => void this.#deleteSave();
    game.append(restart, remove);
    const setup = this.#snapshot.view?.setup;
    const seed = el(this.#document, "p", "v7-map-seed");
    seed.dataset.v7MapSeed = setup === undefined ? "" : String(setup.seed);
    seed.append(
      "Map seed: ",
      text(
        this.#document,
        "strong",
        setup === undefined ? "–" : String(setup.seed),
        "v7-copyable",
      ),
    );
    seed.title = "Choose “Use seed” in a new game to replay this map.";
    // A campaign mission shows its name and objective in place of the
    // seed (CAMPAIGN.md section 5, item 4).
    const mission =
      setup?.mission === undefined ? null : campaignMissionV7(setup.mission.id);
    const matchInfo: HTMLElement[] = [seed];
    if (mission !== null) {
      const label = el(this.#document, "p", "v7-mission-label");
      label.dataset.v7Mission = mission.entry.missionId;
      label.append(
        "Mission: ",
        text(this.#document, "strong", mission.entry.name),
      );
      const objective = el(this.#document, "p", "v7-mission-objective");
      objective.append(
        "Objective: ",
        text(this.#document, "span", mission.entry.objective),
      );
      matchInfo.splice(0, 1, label, objective);
    }
    const developer = this.#document.createElement("details");
    developer.className = "v7-developer-tools";
    // Stays open across the re-render another setting triggers.
    developer.open = this.#developerToolsOpen;
    developer.addEventListener("toggle", () => {
      this.#developerToolsOpen = developer.open;
    });
    const safe = button(this.#document, "Export game log", "export-safe-log");
    safe.onclick = () => this.#exportSafeLog();
    const debug = button(
      this.#document,
      "Export debug bundle (reveals hidden map and units)",
      "export-debug-with-spoilers",
      "destructive",
    );
    debug.setAttribute(
      "aria-label",
      "Export debug bundle (includes hidden map and units; spoilers)",
    );
    debug.onclick = () => this.#exportDebug();
    const developerActions = el(this.#document, "div", "button-row");
    developerActions.append(safe, debug);
    developer.append(
      text(this.#document, "summary", "Developer tools"),
      this.#saturationControls(),
      this.#classicLookControl(),
      developerActions,
    );
    section.append(display, game, ...matchInfo, developer);
    return section;
  }

  /**
   * Developer experiment (bead pulp_wars-x6c): two sliders that fade the
   * board's building and city sprites. Dragging updates the board, the
   * readout and local storage in place; the dialog is not re-rendered, so
   * the slider keeps its pointer and keyboard focus.
   */
  #saturationControls(): HTMLElement {
    const group = el(this.#document, "fieldset", "v7-saturation-tools");
    group.append(text(this.#document, "legend", "Board saturation"));
    const sliders: { readonly sync: () => void }[] = [];
    const slider = (
      key: keyof BoardSaturationV7,
      labelText: string,
      id: string,
    ): HTMLElement => {
      const row = el(this.#document, "div", "v7-saturation-row");
      const label = this.#document.createElement("label");
      label.htmlFor = id;
      label.textContent = labelText;
      const input = this.#document.createElement("input");
      input.type = "range";
      input.id = id;
      input.min = "0";
      input.max = "100";
      input.step = String(SATURATION_STEP_V7);
      const readout = this.#document.createElement("output");
      readout.id = `${id}-value`;
      readout.htmlFor.add(id);
      readout.className = "v7-saturation-value";
      const sync = (): void => {
        const percent = this.#boardSaturation[key];
        input.value = String(percent);
        // Screen readers announce the percentage, not a bare number.
        input.setAttribute("aria-valuetext", `${percent}%`);
        readout.textContent = `${percent}%`;
      };
      sync();
      sliders.push({ sync });
      input.addEventListener("input", () => {
        this.#setBoardSaturation({
          ...this.#boardSaturation,
          [key]: clampSaturationPercentV7(Number(input.value)),
        });
        sync();
      });
      row.append(label, input, readout);
      return row;
    };
    const reset = button(
      this.#document,
      "Reset saturation",
      "reset-board-saturation",
    );
    reset.onclick = () => {
      this.#setBoardSaturation(DEFAULT_BOARD_SATURATION_V7);
      for (const entry of sliders) entry.sync();
    };
    group.append(
      slider("building", "Building saturation", "v7-building-saturation"),
      slider("city", "City saturation", "v7-city-saturation"),
      reset,
    );
    return group;
  }

  /**
   * Developer option (bead pulp_wars-3tq.6): one checkbox that returns the
   * board and the interface art to the previous look, for comparison (chibi
   * art set only; the new visual direction is the default). It updates the
   * board and local storage in place, like the sliders.
   */
  #classicLookControl(): HTMLElement {
    const group = el(this.#document, "fieldset", "v7-saturation-tools");
    group.append(text(this.#document, "legend", "Board look"));
    const label = this.#document.createElement("label");
    label.className = "v7-classic-look-toggle";
    const input = this.#document.createElement("input");
    input.type = "checkbox";
    input.id = "v7-classic-look";
    input.checked = this.#classicLook;
    input.addEventListener("change", () => {
      this.#classicLook = input.checked;
      if (!storeBoardClassicLookV7(this.#settingsStorage, input.checked))
        this.#error = "Settings could not be saved.";
      this.#refreshBoard();
      // The docks and cards switch their portraits with the board.
      this.#queueChibiRender();
    });
    label.append(
      input,
      this.#document.createTextNode(" Classic look (previous art)"),
    );
    group.append(label);
    return group;
  }

  #refreshBoard(): void {
    const view = this.#snapshot.view;
    if (view !== null && view !== undefined)
      this.#boardHost.update(this.#boardModel(view));
  }

  #setBoardSaturation(saturation: BoardSaturationV7): void {
    this.#boardSaturation = saturation;
    if (!storeBoardSaturationV7(this.#settingsStorage, saturation))
      this.#error = "Settings could not be saved.";
    const view = this.#snapshot.view;
    if (view !== null && view !== undefined)
      this.#boardHost.update(this.#boardModel(view));
  }

  #reward(view: PlayerViewV7): HTMLElement {
    const choice = view.pendingChoices[0];
    const modal = el(this.#document, "section", "v7-mandatory-choice");
    modal.dataset.mandatoryChoice = "true";
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");
    if (choice === undefined) return modal;
    const city = view.cities.find((entry) => entry.id === choice.cityId);
    modal.append(
      text(this.#document, "h2", `Level ${choice.reachedLevel}!`),
      text(
        this.#document,
        "p",
        `${city?.isCapital ? "Your capital" : "A city"} grew. Pick a reward.`,
        "v7-screen-lede",
      ),
    );
    for (const reward of choice.candidates) {
      const command = this.#snapshot.offeredCommands.find(
        (candidate) =>
          candidate.kind === "CHOOSE_CITY_REWARD" &&
          candidate.cityId === choice.cityId &&
          candidate.reachedLevel === choice.reachedLevel &&
          candidate.reward === reward,
      );
      if (command === undefined) continue;
      const [name, detail] = rewardLabel(reward, view.viewer.faction);
      const action = button(
        this.#document,
        "",
        `reward-${reward.toLowerCase()}`,
        "v7-reward-action",
      );
      const rewardArt = this.#chibiArt(
        rewardSubjectV7(reward, view.viewer.faction),
        CHIBI_DOM_BOXES_V7.reward,
        this.#playerColour(view, view.viewer.id),
      );
      action.append(
        factionBadgeArt(
          this.#document,
          rewardArt?.element ?? art(this.#document, rewardArtIdV7(reward), ""),
          (reward === "MILITIA" || reward === "JUGGERNAUT") &&
            rewardArt?.factionArt !== true
            ? factionBadgeV7(view.viewer.faction)
            : null,
        ),
        text(this.#document, "strong", name),
        text(this.#document, "span", detail, "v7-reward-detail"),
      );
      action.setAttribute("aria-label", `${name}: ${detail}`);
      action.disabled = this.#localBusy();
      action.onclick = () => void this.#dispatch(command);
      modal.append(action);
    }
    const hint = text(
      this.#document,
      "p",
      "Choose a reward to continue.",
      "v7-mandatory-hint",
    );
    hint.dataset.v7MandatoryHint = "true";
    modal.append(hint);
    modal.dataset.v7Region = "mandatory-reward";
    return modal;
  }

  #achievementNotice(): HTMLElement {
    const achievement = this.#achievementNotices[0];
    const modal = el(this.#document, "section", "v7-achievement-notice");
    modal.dataset.v7Region = "achievement-notice";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute(
      "aria-label",
      `${achievement === undefined ? "Achievement" : achievementNameV7(achievement)} achievement complete`,
    );
    if (achievement === undefined) return modal;
    const badge = el(this.#document, "div", "v7-achievement-badge");
    badge.append(uiIconV7(this.#document, "trophy"));
    modal.append(
      badge,
      text(
        this.#document,
        "h2",
        `${achievementNameV7(achievement)} achievement complete`,
      ),
      text(
        this.#document,
        "p",
        "You can now build a monument on one of your tiles.",
        "v7-screen-lede",
      ),
    );
    const close = button(
      this.#document,
      "Continue",
      "dismiss-achievement",
      "primary-action",
    );
    close.onclick = () => this.#dismissAchievementNotice();
    modal.append(close);
    return modal;
  }

  #dismissAchievementNotice(): void {
    this.#achievementNotices.shift();
    this.#render();
    if (
      this.#achievementNotices.length > 0 ||
      this.#snapshot.view?.pendingChoices.length
    )
      return;
    const action = this.#achievementReturnAction;
    this.#achievementReturnAction = null;
    queueMicrotask(() => {
      if (this.#destroyed) return;
      const target =
        action === null
          ? null
          : this.#root.querySelector<HTMLElement>(`[data-action="${action}"]`);
      if (target !== null) target.focus();
      else this.#queueBoardFocus();
    });
  }

  #results(view: PlayerViewV7): HTMLElement {
    const mission =
      view.setup.mission === undefined
        ? null
        : campaignMissionV7(view.setup.mission.id);
    if (mission !== null) return this.#missionResults(view, mission.entry);
    const result = el(this.#document, "section", "v7-results");
    result.dataset.v7Region = "results";
    result.dataset.outcome =
      view.outcome?.kind === "VICTORY" ? "victory" : "defeat";
    result.setAttribute("role", "dialog");
    result.setAttribute("aria-modal", "true");
    result.append(
      text(
        this.#document,
        "h2",
        view.outcome?.kind === "VICTORY" ? "Victory" : "Defeat",
      ),
      text(
        this.#document,
        "p",
        `Turn ${view.round} · ${MAP_TYPE_LABELS[view.setup.mapType] ?? title(view.setup.mapType)} ${view.setup.width} × ${view.setup.height}`,
        "v7-screen-lede",
      ),
      this.#resultSeats(view),
    );
    const actions = el(this.#document, "div", "button-row");
    const restart = button(
      this.#document,
      "Play again",
      "restart",
      "primary-action",
    );
    restart.onclick = () => void this.#restart();
    actions.append(restart);
    result.append(actions, this.#ruleset6Link());
    return result;
  }

  /**
   * The end-of-game list (map scale section 10.3): every player once, in
   * leaderboard order, as an emblem with the faction's name, the winner's
   * trophy, "Out" for players who lost every city, and the city count. It
   * scrolls inside the dialog when eight players do not fit a phone.
   */
  #resultSeats(view: PlayerViewV7): HTMLElement {
    const list = this.#document.createElement("ol");
    list.className = "v7-result-seats";
    list.dataset.players = String(view.leaderboard.length);
    list.setAttribute("aria-label", "Players");
    // A defeat ends the match with the other players still in it: nobody
    // has won, so only a victory shows a trophy.
    const winnerId =
      view.outcome === null || view.outcome.kind === "DEFEAT"
        ? null
        : view.outcome.winnerId;
    for (const entry of view.leaderboard) {
      const row = el(this.#document, "li", "v7-result-seat");
      row.dataset.seat = String(entry.seat);
      row.dataset.status = entry.status.toLowerCase();
      row.style.setProperty("--player", factionColourV7(entry.faction));
      if (entry.isViewer) row.dataset.viewer = "true";
      const name = text(
        this.#document,
        "span",
        `${entry.isViewer ? "You" : playerName(entry.seat)} · ${factionNameV7(entry.faction)}`,
        "v7-result-seat-name",
      );
      const cities = el(this.#document, "span", "v7-leaderboard-stat");
      cities.title = "Cities";
      cities.append(
        this.#chibiArt(
          cityArtSubjectV7({ artLevel: 1, faction: entry.faction }),
          CHIBI_DOM_BOXES_V7.leaderboard,
          factionColourV7(entry.faction),
        )?.element ?? art(this.#document, "building-city-1", ""),
        String(entry.cityCount),
        text(this.#document, "span", " cities", "v7-sr-only"),
      );
      row.append(this.#factionEmblem(entry.faction, "small"), name);
      if (entry.playerId === winnerId) {
        row.dataset.winner = "true";
        const won = el(this.#document, "span", "v7-result-winner");
        won.title = "Winner";
        won.append(
          uiIconV7(this.#document, "trophy"),
          text(this.#document, "span", "Winner", "v7-sr-only"),
        );
        row.append(won);
      }
      if (entry.status === "ELIMINATED")
        row.append(text(this.#document, "span", "Out", "v7-chip is-idle"));
      row.append(cities);
      list.append(row);
    }
    return list;
  }

  /**
   * The mission Victory and Defeat dialogs (CAMPAIGN.md section 5, items 5
   * and 6). The win was recorded by the controller before this renders.
   */
  #missionResults(
    view: PlayerViewV7,
    entry: NonNullable<ReturnType<typeof campaignMissionV7>>["entry"],
  ): HTMLElement {
    const victory = view.outcome?.kind === "VICTORY";
    const result = el(
      this.#document,
      "section",
      "v7-results v7-mission-results",
    );
    result.dataset.v7Region = "results";
    result.dataset.outcome = victory ? "victory" : "defeat";
    result.dataset.missionId = entry.missionId;
    result.setAttribute("role", "dialog");
    result.setAttribute("aria-modal", "true");
    const heading = text(
      this.#document,
      "h2",
      victory ? "Mission complete" : "Mission failed",
    );
    heading.id = "v7-mission-result-title";
    result.setAttribute("aria-labelledby", heading.id);
    result.append(
      text(
        this.#document,
        "p",
        `Mission ${entry.number}`,
        "v7-briefing-kicker",
      ),
      heading,
    );
    const actions = el(this.#document, "div", "button-row");
    if (victory) {
      result.append(
        text(this.#document, "p", entry.closing, "v7-campaign-story"),
      );
      const lastWin = this.#campaignProgress().lastWin;
      if (lastWin?.missionId === entry.missionId)
        for (const faction of lastWin.unlocked) {
          const notice = el(this.#document, "div", "v7-unlock-notice");
          notice.dataset.v7Region = "unlock-notice";
          notice.dataset.faction = faction;
          notice.setAttribute("role", "status");
          notice.append(
            this.#factionEmblem(faction),
            text(
              this.#document,
              "p",
              `New faction: ${FACTION_LABELS[faction] ?? title(faction)}`,
            ),
          );
          result.append(notice);
        }
      const next = campaignNextMissionV7(entry.missionId);
      if (next === null) {
        const found = campaignMissionV7(entry.missionId);
        if (found !== null)
          result.append(
            text(this.#document, "p", found.chapter.outro, "v7-campaign-outro"),
          );
      } else {
        const proceed = button(
          this.#document,
          "Next mission",
          "campaign-next",
          "primary-action",
        );
        proceed.onclick = () => void this.#leaveFinishedMission(next.missionId);
        actions.append(proceed);
      }
    } else {
      const retry = button(
        this.#document,
        "Retry",
        "mission-retry",
        "primary-action",
      );
      retry.onclick = () => void this.#restart();
      actions.append(retry);
    }
    const campaign = button(this.#document, "Campaign", "campaign-menu");
    campaign.onclick = () => void this.#leaveFinishedMission(null);
    actions.append(campaign);
    result.append(actions);
    return result;
  }

  /**
   * Leaves a finished mission for the campaign screen, on the next
   * mission's briefing or the list. The finished match is cleared from the
   * autosave slot: its win is already recorded, and a mission is always
   * started again from the campaign.
   */
  async #leaveFinishedMission(nextMissionId: string | null): Promise<void> {
    this.#cancelPresentations();
    // Set before the controller empties the slot, so its snapshot already
    // renders the campaign screen.
    this.#frontMode = "CAMPAIGN";
    this.#replacing = false;
    this.#confirmCampaignReset = false;
    this.#briefingMissionId = nextMissionId;
    this.#briefingFaction = null;
    this.#selection = null;
    this.#screen = "MATCH";
    this.#achievementNotices = [];
    this.#notice = "";
    const deleted = await this.#controller.deleteStoredSave();
    if (this.#destroyed) return;
    if (!deleted) {
      this.#error = "The finished mission couldn't be closed.";
      this.#render();
      return;
    }
    this.#frontFocus =
      nextMissionId === null
        ? '[data-action="mode-campaign"]'
        : "#v7-briefing-title";
    this.#render();
  }

  #errorPanel(): HTMLElement {
    const panel = el(this.#document, "section", "v7-results");
    panel.dataset.v7Region = "error";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.append(
      text(this.#document, "h2", "Game paused"),
      text(
        this.#document,
        "p",
        "Something went wrong. Your game is saved.",
        "v7-screen-lede",
      ),
    );
    const diagnostic = this.#snapshot.diagnostic;
    if (diagnostic !== null && diagnostic !== undefined) {
      const details = this.#document.createElement("details");
      details.className = "v7-recovery-details";
      details.append(
        text(this.#document, "summary", "Details"),
        text(this.#document, "p", diagnostic),
      );
      panel.append(details);
    }
    return panel;
  }

  #open(screen: ScreenV7, returnAction: string | null = null): void {
    if (this.#snapshot.view?.pendingChoices.length) return;
    this.#modalReturnAction = returnAction;
    if (screen === "TECH") this.#selectedTech = null;
    this.#techGoal = null;
    this.#screen = screen;
    this.#render();
    queueMicrotask(() => {
      if (this.#destroyed) return;
      this.#root
        .querySelector<HTMLButtonElement>('[data-action="close-overlay"]')
        ?.focus();
    });
  }
  #readDraft(form: HTMLElement): void {
    const requestedMap = MAP_TYPES.includes(
      value(form, "v7-map-type") as MapTypeV7,
    )
      ? (value(form, "v7-map-type") as MapTypeV7)
      : "CONTINENTS";
    // While the Showcase was selected the Size select only held the forced
    // 16 x 16, so the player's own size is kept from the draft.
    const requestedSize =
      this.#draft.mapType === "SHOWCASE"
        ? this.#draft.boardSize
        : Number(value(form, "v7-board-size"));
    const own = BOARD_SIZES.find((size) => size === requestedSize) ?? 11;
    // A map type that cannot take the players gives way to another, and a
    // size that is not legal for the map type and the players to the
    // nearest legal one (map scale section 6.3). The Showcase keeps the
    // player's own size for the next map.
    const resolved = resolveSetupChoiceV7({
      mapType: requestedMap,
      opponents: clampOpponentCountV7(Number(value(form, "v7-ai-count"))),
      boardSize: requestedMap === "SHOWCASE" ? SHOWCASE_BOARD_SIZE : own,
    });
    const boardSize =
      resolved.mapType === "SHOWCASE"
        ? own
        : requestedMap === "SHOWCASE"
          ? resolveSetupChoiceV7({ ...resolved, boardSize: own }).boardSize
          : resolved.boardSize;
    const sizeMoved = resolved.mapType !== "SHOWCASE" && boardSize !== own;
    this.#setupMoved = { size: sizeMoved, map: resolved.mapMoved };
    this.#setupNote = [
      ...(resolved.mapMoved
        ? [
            `Map changed to ${MAP_TYPE_LABELS[resolved.mapType] ?? resolved.mapType}.`,
          ]
        : []),
      ...(sizeMoved
        ? [`Size changed to ${BOARD_SIZE_LABELS[String(boardSize)]}.`]
        : []),
    ].join(" ");
    this.#draft = {
      seedMode: this.#draft.seedMode,
      aiCount: resolved.opponents,
      aiMode:
        value(form, "v7-ai-mode") === "COOPERATIVE" ? "COOPERATIVE" : "RIVAL",
      boardSize,
      seedText: value(form, "v7-seed"),
      mapType: resolved.mapType,
      curiosities:
        form.querySelector<HTMLInputElement>("#v7-curiosities")?.checked ??
        this.#draft.curiosities,
      // Seats keep their choice in seat order; a seat whose faction an
      // earlier seat now plays takes the first untaken faction, so the
      // seats always play different factions (RULESET_7_UNIQUE_FACTIONS.md).
      factions: distinctFactionsV7(
        maxSeatCountV7(),
        this.#draft.factions.map((prior, seat) => {
          const field = form.querySelector<HTMLSelectElement>(
            `#v7-faction-${seat}`,
          );
          if (field === null) return prior;
          return FACTIONS.includes(field.value as FactionIdV7)
            ? (field.value as FactionIdV7)
            : "ORIGINAL";
        }),
      ),
    };
  }
  async #launch(setup: MatchSetupV7, replace: boolean): Promise<void> {
    this.#cancelPresentations();
    this.#achievementNotices = [];
    this.#error = "";
    const result = await this.#controller.launch(setup, {
      replaceStoredMatch: replace,
    });
    if (this.#destroyed) return;
    if (!result.ok) {
      this.#error = result.diagnostic;
      this.#render();
      return;
    }
    this.#matchInstance += 1;
    this.#replacing = false;
    this.#briefingMissionId = null;
    this.#selection = null;
    this.#notice = "Game started.";
    this.#render();
    await this.#progressAi();
    if (
      this.#screen === "MATCH" &&
      this.#snapshot.view?.pendingChoices.length === 0
    )
      this.#queueBoardFocus();
  }
  async #resumeMatch(): Promise<void> {
    this.#achievementNotices = [];
    const resumed = await this.#controller.resume();
    if (this.#destroyed) return;
    if (!resumed) this.#error = "The saved game couldn't be loaded.";
    else {
      this.#matchInstance += 1;
      this.#notice = "Game resumed.";
    }
    this.#render();
    await this.#progressAi();
  }
  async #returnToMenu(): Promise<void> {
    this.#error = "";
    const returned = await this.#controller.returnToMenu();
    if (this.#destroyed) return;
    if (!returned) {
      this.#error =
        this.#controller.snapshot().saveWarning ??
        "Couldn't save the game. Try again.";
      this.#render();
      await this.#progressAi();
      return;
    }
    this.#cancelPresentations();
    this.#achievementNotices = [];
    this.#selection = null;
    this.#screen = "MATCH";
    this.#compactMenuOpen = false;
    this.#notice = "Game saved.";
    this.#render();
  }
  /** Resolves true when the command was accepted and its presentation ran. */
  async #dispatch(command: CommandV7): Promise<boolean> {
    if (this.#localBusy()) return false;
    this.#kaboomArmedUnitId = null;
    this.#kaboomHoverUnitId = null;
    this.#areaSupportHover = null;
    this.#layEggPick = null;
    this.#martianPick = null;
    this.#iceFolkPick = null;
    this.#dwarfPick = null;
    this.#candyPick = null;
    this.#navalPick = null;
    let restoreAction =
      command.kind === "RESEARCH" ? `tech-${command.tech.toLowerCase()}` : null;
    this.#presentationActive = true;
    this.#humanDispatchPending = true;
    let result: Awaited<ReturnType<Ruleset7ControllerPortV7["dispatch"]>>;
    try {
      result = await this.#controller.dispatch(command);
    } finally {
      this.#humanDispatchPending = false;
    }
    if (this.#destroyed) return false;
    if (!result.accepted) {
      this.#presentationActive = false;
      this.#error = `Can't do that right now (${result.error?.code ?? result.reason}).`;
      this.#render();
      return false;
    }
    this.#error = "";
    const notice = boundaryNoticeV7(
      result.playerEvents.events,
      result.beforeView,
      result.afterView,
    );
    if (notice.toast && notice.text !== null) this.#showToast(notice.text);
    this.#notice =
      notice.text ??
      `${commandLabel(command, result.afterView.viewer.faction)}.`;
    if (command.kind === "RESEARCH") {
      this.#selectedTech = null;
      // Research prompts (bead pulp_wars-gl1): after a prerequisite, the
      // next technology on the way to the prompted one is selected.
      const goal = this.#techGoal;
      const nodes =
        goal === null ? [] : queryTechnologyTreeV7(result.afterView).nodes;
      const next = goal === null ? null : researchPathStepV7(nodes, goal);
      if (next === null) this.#techGoal = null;
      else {
        this.#selectedTech = next;
        restoreAction = nodes.some(
          (node) => node.id === next && node.affordable,
        )
          ? `research-${next.toLowerCase()}`
          : `tech-${next.toLowerCase()}`;
      }
    }
    this.#pendingFocusAction = restoreAction;
    this.#humanDispatchSettling = true;
    const visibleMovement =
      command.kind === "MOVE" &&
      result.playerEvents.events.some((event) => event.kind === "UNIT_MOVED");
    if (visibleMovement && this.#matchRoot?.isConnected) {
      // Install the accepted public view before the slide. Rebuilding the HUD
      // here delays its first frame on a large board.
      this.#boardHost.update(this.#boardModel(result.afterView));
      const dock =
        this.#matchRoot.querySelector<HTMLElement>(".v7-selection-dock");
      if (dock !== null) {
        // The placeholder cannot scroll; keep the dock's scroll for the
        // settled render.
        dock.dataset.scrollTop ??= String(dock.scrollTop);
        dock.replaceChildren(
          text(this.#document, "p", "Movement", "v7-movement-status"),
        );
        dock.setAttribute("aria-busy", "true");
      }
    } else this.#render();
    this.#drainPresentationQueue();
    await this.#presentationTail;
    if (this.#destroyed) {
      this.#humanDispatchSettling = false;
      return false;
    }
    this.#presentationActive = false;
    this.#pendingFocusAction = restoreAction;
    this.#render();
    this.#humanDispatchSettling = false;
    await this.#progressAi();
    if (this.#destroyed) return false;
    if (
      restoreAction === null &&
      this.#screen === "MATCH" &&
      this.#snapshot.view?.pendingChoices.length === 0
    )
      this.#queueBoardFocus();
    return true;
  }
  async #progressAi(): Promise<void> {
    if (this.#destroyed) return;
    const view = this.#controller.snapshot().view;
    if (
      view === null ||
      view.outcome !== null ||
      view.turnOrder[view.activeSeatIndex] === view.humanPlayerId
    )
      return;
    const result = await this.#controller.progressAiTurns();
    if (this.#destroyed) return;
    if (!result.ok && !result.cancelled) this.#error = result.diagnostic;
    else if (result.ok) this.#notice = "Your turn.";
    this.#render();
  }
  async #restart(): Promise<void> {
    this.#cancelPresentations();
    const result = await this.#controller.restart();
    if (this.#destroyed) return;
    if (!result.ok) this.#error = result.diagnostic;
    else {
      this.#matchInstance += 1;
      this.#selection = null;
      this.#screen = "MATCH";
      this.#notice = "Game restarted.";
    }
    this.#render();
    await this.#progressAi();
  }
  async #deleteSave(): Promise<void> {
    this.#cancelPresentations();
    const deleted = await this.#controller.deleteStoredSave();
    if (this.#destroyed) return;
    if (deleted) {
      this.#selection = null;
      this.#screen = "MATCH";
      this.#notice = "Save deleted.";
    } else this.#error = "The save couldn't be deleted.";
    this.#render();
  }
  #exportSafeLog(): void {
    const result = this.#controller.exportSafeLog();
    if (result === null) return;
    this.#downloadSafeLog(result.source, result.filename);
    this.#notice = "Game log downloaded.";
    this.#render();
  }
  #exportDebug(): void {
    const result = this.#controller.exportDebugBundle({
      acknowledgeHiddenInformation: true,
    });
    if (!result.ok) return;
    this.#downloadDebugBundle(result.source, result.filename);
    this.#notice = "Debug bundle downloaded (contains spoilers).";
    this.#render();
  }
  #patchAiProgress(): void {
    const progress = this.#root.querySelector<HTMLElement>(
      "[data-v7-ai-progress]",
    );
    if (progress !== null) this.#fillAiStatus(progress);
    const fast = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="fast-forward"]',
    );
    if (fast !== null && this.#snapshot.ai.fastForward)
      fast.classList.add("is-active");
  }
  #aiStatusText(): string {
    const view = this.#snapshot.view;
    const active =
      view === null
        ? undefined
        : view.players.find(
            (player) => player.id === view.turnOrder[view.activeSeatIndex],
          );
    return view === null
      ? `${playerName(active?.seat ?? 0)} is playing…`
      : `${playerTitle(view, active?.seat ?? 0)} is playing…`;
  }
  /**
   * The AI-turn status: "Player 5 (Dwarf) is playing…", and with several
   * opponents still in the game its place among them, "(3 of 7)" (map
   * scale section 8.1). The place is its own element so that a phone,
   * where the turn-order strip already shows it, can leave it out.
   */
  #fillAiStatus(status: HTMLElement): void {
    const view = this.#snapshot.view;
    const place = view === null ? null : aiTurnPlaceV7(view);
    const label = this.#aiStatusText();
    if (place === null) {
      if (status.textContent !== label) status.textContent = label;
      return;
    }
    status.replaceChildren(
      label,
      text(
        this.#document,
        "span",
        ` (${place.index} of ${place.total})`,
        "v7-turn-place",
      ),
    );
  }

  /**
   * The turn-order strip (map scale section 8.5), in matches with three or
   * more players: one small faction emblem per player in turn order, the
   * player whose turn it is ringed, players who are out crossed out. A
   * phone shows only the current player's emblem and "3/8". It is a list,
   * not a control: nothing in it takes focus.
   */
  #turnStrip(view: PlayerViewV7): HTMLElement | null {
    if (view.turnOrder.length < 3) return null;
    const strip = el(this.#document, "div", "v7-turn-strip");
    strip.dataset.v7TurnStrip = "true";
    strip.dataset.players = String(view.turnOrder.length);
    const list = this.#document.createElement("ol");
    list.className = "v7-turn-strip-list";
    list.setAttribute("aria-label", "Turn order");
    const over = this.#snapshot.phase === "COMPLETE";
    view.turnOrder.forEach((id, index) => {
      const player = view.players.find((candidate) => candidate.id === id);
      if (player === undefined) return;
      const chip = el(this.#document, "li", "v7-turn-chip");
      const active = !over && index === view.activeSeatIndex;
      const out = player.status === "ELIMINATED";
      chip.dataset.seat = String(player.seat);
      chip.dataset.status = player.status.toLowerCase();
      chip.dataset.active = String(active);
      if (id === view.viewer.id) chip.dataset.viewer = "true";
      if (active) chip.setAttribute("aria-current", "true");
      chip.style.setProperty("--player", factionColourV7(player.faction));
      const name = `${
        id === view.viewer.id ? "You" : playerName(player.seat)
      }, ${factionNameV7(player.faction)}${
        out ? ", out" : active ? ", playing now" : ""
      }`;
      chip.title = name;
      chip.append(
        this.#factionEmblem(player.faction, "tiny"),
        text(this.#document, "span", name, "v7-sr-only"),
      );
      list.append(chip);
    });
    const count = text(
      this.#document,
      "span",
      `${view.activeSeatIndex + 1}/${view.turnOrder.length}`,
      "v7-turn-strip-count",
    );
    count.setAttribute("aria-hidden", "true");
    strip.append(list, count);
    return strip;
  }

  #queueBoundary(boundary: Ruleset7AcceptedBoundary): void {
    if (this.#destroyed) return;
    if (this.#achievementNotices.length === 0)
      this.#achievementReturnAction =
        this.#document.activeElement instanceof HTMLElement
          ? (this.#document.activeElement.dataset.action ?? null)
          : null;
    for (const event of boundary.playerEvents.events)
      if (
        event.kind === "ACHIEVEMENT_UNLOCKED" &&
        event.playerId === boundary.afterView.viewer.id
      )
        this.#achievementNotices.push(event.achievement);
    const notice = boundaryNoticeV7(
      boundary.playerEvents.events,
      boundary.beforeView,
      boundary.afterView,
    );
    if (notice.text !== null) {
      this.#notice = notice.text;
      if (notice.toast) this.#showToast(notice.text);
    }
    if (this.#snapshot.ai.fastForward) {
      this.#presentationQueue = [];
      return;
    }
    this.#presentationActive = true;
    this.#presentationQueue.push({
      matchInstance: this.#matchInstance,
      boundary,
    });
    if (this.#presentationQueue.length > 12) {
      const latest = this.#presentationQueue.at(-1);
      this.#cancelPresentations();
      if (latest !== undefined) {
        this.#presentationQueue = [latest];
        this.#presentationActive = true;
      }
    }
    if (this.#humanDispatchPending) return;
    this.#render();
    this.#drainPresentationQueue();
  }
  #drainPresentationQueue(): void {
    this.#presentationTail = this.#presentationTail.then(async () => {
      while (!this.#destroyed && this.#presentationQueue.length > 0) {
        if (this.#snapshot.ai.fastForward) {
          this.#presentationQueue = [];
          break;
        }
        const next = this.#presentationQueue.shift();
        if (next === undefined) break;
        if (next.matchInstance !== this.#matchInstance) continue;
        await this.#boardHost.presentBoundary?.(
          next.boundary.beforeView,
          next.boundary.afterView,
          next.boundary.playerEvents,
        );
      }
      if (this.#presentationQueue.length === 0) {
        this.#presentationActive = false;
        if (!this.#humanDispatchSettling) this.#render();
      }
    });
  }
  #cancelPresentations(): void {
    this.#presentationQueue = [];
    this.#presentationActive = false;
    this.#boardHost.finishPresentations?.();
  }
  #persistSettings(): void {
    try {
      this.#settingsStorage?.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          format: "pulp-wars-settings",
          version: 1,
          settings: {
            uiScale: this.#uiScale,
            motion: this.#motion,
            animationSpeed: this.#animationSpeed,
            highContrast: this.#highContrast,
          },
        }),
      );
    } catch {
      this.#error = "Settings could not be saved.";
    }
  }
  #trapModalFocus(event: KeyboardEvent, modal: HTMLElement): void {
    const controls = [
      ...modal.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && this.#document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.#document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  #closeOverlay(): void {
    const returnAction = this.#modalReturnAction;
    const prompted = returnAction?.startsWith("research-prompt-") === true;
    this.#modalReturnAction = null;
    this.#techGoal = null;
    this.#screen = "MATCH";
    this.#render();
    queueMicrotask(() => {
      if (this.#destroyed) return;
      if (returnAction === null) {
        this.#boardHost.focus();
        return;
      }
      const target = this.#root.querySelector<HTMLButtonElement>(
        `[data-action="${returnAction}"]`,
      );
      if (target !== null) target.focus();
      else if (prompted) {
        // The research prompt is gone once its technology is known: the
        // tile's first action takes the focus instead.
        const action = this.#root.querySelector<HTMLButtonElement>(
          ".v7-selection-dock .v7-context-actions button:not(:disabled)",
        );
        if (action === null) this.#boardHost.focus();
        else action.focus();
      }
    });
  }

  #closeRecruitHelp(): void {
    const role = this.#selectedRecruitHelp;
    this.#selectedRecruitHelp = null;
    this.#pendingFocusAction =
      role === null ? null : `train-help-${role.toLowerCase()}`;
    this.#render();
  }

  #closeUnitHelp(): void {
    this.#selectedUnitHelpId = null;
    this.#pendingFocusAction = "unit-help";
    this.#render();
  }

  #syncModalIsolation(main: HTMLElement): void {
    const modal = main.querySelector<HTMLElement>('[aria-modal="true"]');
    for (const child of [...main.children]) {
      const element = child as HTMLElement;
      // The scrim stays clickable (never inert) but hidden from assistive
      // technology; it holds nothing focusable.
      if (element.dataset.v7Region === "scrim") continue;
      element.inert = modal !== null && element !== modal;
      if (element.inert) element.setAttribute("aria-hidden", "true");
      else element.removeAttribute("aria-hidden");
    }
    if (modal !== null && !modal.contains(this.#document.activeElement))
      queueMicrotask(() => {
        if (this.#destroyed) return;
        modal
          .querySelector<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
          )
          ?.focus();
      });
  }

  #queueBoardFocus(): void {
    queueMicrotask(() => {
      if (
        !this.#destroyed &&
        this.#screen === "MATCH" &&
        this.#root.querySelector('[aria-modal="true"]') === null
      )
        this.#boardHost.focus();
    });
  }

  #showToast(message: string): void {
    this.#toastSequence += 1;
    const id = this.#toastSequence;
    this.#toast = { id, text: message, kind: "info" };
    this.#document.defaultView?.setTimeout(() => {
      if (this.#destroyed || this.#toast?.id !== id) return;
      this.#toast = null;
      this.#root
        .querySelector<HTMLElement>(`[data-toast-id="${id}"]`)
        ?.remove();
    }, 3200);
  }

  /**
   * Revision 17: the Kaboom! button carries its tooltip, a summary chip and
   * the full preview in its accessible name; hover and focus preview the
   * blast on the board without re-rendering the dock.
   */
  #decorateKaboomButton(action: HTMLButtonElement, unitId: UnitId): void {
    const view = this.#snapshot.view;
    if (view === null) return;
    const preview = previewKaboomV7(view, unitId);
    const unit = view.units.find((candidate) => candidate.id === unitId);
    const damage =
      unit === undefined ? null : unitRoleMechanicsV7(view, unit).kaboomDamage;
    const tooltip = damage === null ? null : kaboomTooltipV7(damage);
    const summary =
      preview === null ? null : kaboomPreviewTextV7(view, preview);
    action.title =
      tooltip ?? commandLabel({ kind: "KABOOM", unitId }, "GOBLIN");
    action.setAttribute(
      "aria-label",
      [
        "Kaboom!",
        ...(tooltip === null ? [] : [tooltip]),
        ...(summary === null ? [] : [summary.description]),
      ].join(" · "),
    );
    action.setAttribute(
      "aria-pressed",
      String(this.#kaboomArmedUnitId === unitId),
    );
    action.dataset.kaboom =
      this.#kaboomArmedUnitId === unitId ? "armed" : "ready";
    if (summary !== null) {
      action.append(
        text(
          this.#document,
          "span",
          summary.chip,
          "v7-undead-preview-chip v7-kaboom-chip",
        ),
      );
      if (summary.friendlyChip !== null) {
        const warning = text(
          this.#document,
          "span",
          summary.friendlyChip,
          "v7-undead-preview-chip v7-kaboom-chip",
        );
        warning.dataset.friendlyFire = "true";
        action.append(warning);
      }
    }
    const show = (): void => {
      if (this.#kaboomHoverUnitId === unitId) return;
      this.#kaboomHoverUnitId = unitId;
      this.#syncBoard();
    };
    const hide = (): void => {
      if (this.#kaboomHoverUnitId !== unitId) return;
      this.#kaboomHoverUnitId = null;
      this.#syncBoard();
    };
    action.addEventListener("pointerenter", show);
    action.addEventListener("focus", show);
    action.addEventListener("pointerleave", hide);
    action.addEventListener("blur", hide);
  }

  /**
   * Bead pulp_wars-621 (docs/ui/BOARD_TARGETING.md section 2.1): hover and
   * focus of an area support's button make its recipients' marks prominent
   * on the board, without re-rendering the dock. The button is still the
   * only way to use the ability: the marked units are not targets.
   */
  #linkAreaSupportButton(
    action: HTMLButtonElement,
    unitId: UnitId,
    kind: AreaSupportFocusV7["kind"],
  ): void {
    action.dataset.areaSupport = "true";
    const shown = (): boolean =>
      this.#areaSupportHover?.unitId === unitId &&
      this.#areaSupportHover.kind === kind;
    const show = (): void => {
      if (shown()) return;
      this.#areaSupportHover = { unitId, kind };
      this.#syncBoard();
    };
    const hide = (): void => {
      if (!shown()) return;
      this.#areaSupportHover = null;
      this.#syncBoard();
    };
    action.addEventListener("pointerenter", show);
    action.addEventListener("focus", show);
    action.addEventListener("pointerleave", hide);
    action.addEventListener("blur", hide);
  }

  /** Arms or disarms the selected unit's Kaboom!. */
  #toggleKaboom(unitId: UnitId): void {
    if (this.#localBusy()) return;
    const arming = this.#kaboomArmedUnitId !== unitId;
    this.#kaboomArmedUnitId = arming ? unitId : null;
    this.#kaboomHoverUnitId = null;
    this.#pendingFocusAction = arming ? "confirm-kaboom" : "command-kaboom";
    this.#render();
  }

  /**
   * The armed Kaboom! confirmation: the preview summary, chain lines, the
   * friendly-fire, Bitten and fog warnings, Plunder, Field Defense lost, and
   * Confirm and Cancel. Null unless this unit's Kaboom! is armed and offered.
   */
  #kaboomPanel(view: PlayerViewV7, unitId: UnitId): HTMLElement | null {
    if (this.#kaboomArmedUnitId !== unitId) return null;
    const command = this.#snapshot.offeredCommands.find(
      (candidate) => candidate.kind === "KABOOM" && candidate.unitId === unitId,
    );
    const preview =
      command === undefined ? null : previewKaboomV7(view, unitId);
    if (command === undefined || preview === null) {
      this.#kaboomArmedUnitId = null;
      return null;
    }
    const summary: KaboomPreviewTextV7 = kaboomPreviewTextV7(view, preview);
    const panel = el(this.#document, "section", "v7-kaboom-preview");
    panel.dataset.v7Kaboom = "armed";
    panel.setAttribute("aria-label", "Kaboom! preview");
    panel.append(
      text(this.#document, "p", summary.summary, "v7-kaboom-summary"),
    );
    const lines = this.#document.createElement("ul");
    lines.className = "v7-kaboom-lines";
    const line = (
      content: string | null,
      id: string,
      warning = false,
    ): void => {
      if (content === null) return;
      const item = text(
        this.#document,
        "li",
        content,
        warning ? "v7-kaboom-line is-warning" : "v7-kaboom-line",
      );
      item.dataset.kaboomLine = id;
      lines.append(item);
    };
    line(summary.friendlyFire, "friendly-fire", true);
    line(summary.bitten, "bitten", true);
    for (const chain of summary.chain) line(chain, "chain");
    line(summary.plunder, "plunder");
    line(summary.fieldDefense, "field-defense");
    line(summary.fog, "fog", true);
    if (lines.childElementCount > 0) panel.append(lines);
    const buttons = el(this.#document, "div", "button-row v7-kaboom-actions");
    const confirm = button(
      this.#document,
      "Confirm Kaboom!",
      "confirm-kaboom",
      "destructive v7-kaboom-confirm",
    );
    confirm.setAttribute(
      "aria-label",
      `Confirm Kaboom!: this unit dies. ${summary.description}`,
    );
    confirm.disabled = this.#localBusy();
    confirm.onclick = () => void this.#dispatch(command);
    const cancel = button(
      this.#document,
      "Cancel",
      "cancel-kaboom",
      "v7-kaboom-cancel",
    );
    cancel.onclick = () => this.#toggleKaboom(unitId);
    buttons.append(confirm, cancel);
    panel.append(buttons);
    return panel;
  }

  /**
   * Revision 19: the Lay Egg cards of an own Dinosaur city, one per
   * researched egg-laid role (role portrait with an egg cue, cost, hatch
   * time and slots). A card that cannot be used says why. Without any
   * researched egg role a single hint names the first technology.
   */
  #layEggCards(view: PlayerViewV7, cityId: number): readonly HTMLElement[] {
    const faction = view.viewer.faction;
    if (faction !== "DINOSAUR" || this.#snapshot.offeredCommands.length === 0)
      return [];
    const city = view.cities.find((candidate) => candidate.id === cityId);
    if (city === undefined) return [];
    const cards: HTMLElement[] = [];
    let locked: { readonly label: string; readonly tech: string } | null = null;
    for (const role of eggLaidRolesV7(UNIT_ROLE_IDS_V7, faction)) {
      const rule = effectiveRoleRuleV7(role, faction);
      if (
        rule.technology !== null &&
        !view.viewer.researchedTechs.includes(rule.technology)
      ) {
        locked ??= {
          label: rule.label,
          tech: technologyNameV7(rule.technology, faction),
        };
        continue;
      }
      const preview = previewLayEggV7(view, city.id, role);
      if (preview === null) continue;
      const offered = this.#snapshot.offeredCommands.some(
        (command) =>
          command.kind === "LAY_EGG" &&
          command.cityId === city.id &&
          command.role === role,
      );
      const reason =
        layEggUnavailableTextV7(preview, faction) ??
        (offered ? null : "Not available right now");
      const card = el(this.#document, "div", "v7-train-card v7-lay-egg-card");
      card.dataset.layEggRole = role;
      const action = button(
        this.#document,
        "",
        `lay-egg-${role.toLowerCase()}`,
        "v7-train-action v7-lay-egg-action",
      );
      const portrait = this.#chibiArt(
        portraitSubjectV7(role, faction),
        CHIBI_DOM_BOXES_V7.action,
        this.#viewerColour(),
      );
      // The role portrait (never the Lay Egg icon), with a small egg cue.
      const frame = el(this.#document, "span", "v7-egg-art");
      frame.append(
        factionBadgeArt(
          this.#document,
          portrait?.element ??
            art(this.#document, RULESET7_UNIT_ART_IDS[role], ""),
          portrait?.factionArt === true ? null : "DINOSAUR",
        ),
        uiIconV7(this.#document, "egg", "v7-egg-cue"),
      );
      const facts = el(this.#document, "span", "v7-egg-facts");
      const hatch = text(
        this.#document,
        "span",
        turnsTextV7(preview.turnsToHatch),
        "v7-egg-fact",
      );
      hatch.dataset.eggFact = "hatch";
      hatch.title = `Hatches in ${turnsTextV7(preview.turnsToHatch)}`;
      const slots = text(
        this.#document,
        "span",
        slotsTextV7(preview.slots),
        "v7-egg-fact",
      );
      slots.dataset.eggFact = "slots";
      slots.dataset.slots = String(preview.slots);
      slots.title = `Uses ${slotsTextV7(preview.slots)} of the city's ${preview.capacity} (${preview.usedSlots} used)`;
      facts.append(hatch, slots);
      action.append(
        frame,
        text(this.#document, "span", `${rule.label} Egg`, "v7-action-label"),
        economyChips(this.#document, { cost: preview.cost }),
        facts,
      );
      const row = layEggRowTextV7(rule.label, preview);
      action.title = reason === null ? row : `${row}. ${reason}`;
      action.setAttribute(
        "aria-label",
        reason === null ? `Lay ${row}` : `Lay ${row}. Unavailable: ${reason}`,
      );
      const picking =
        this.#layEggPick?.cityId === city.id && this.#layEggPick.role === role;
      action.setAttribute("aria-pressed", String(picking));
      if (reason === null) {
        action.disabled = this.#localBusy();
        action.onclick = () => this.#startLayEggPick(city.id, role);
      } else {
        // aria-disabled keeps the reason reachable by keyboard and touch.
        action.setAttribute("aria-disabled", "true");
        action.dataset.disabledReason = (
          preview.unavailableReason ?? "NOT_OFFERED"
        ).toLowerCase();
        const why = text(this.#document, "span", reason, "v7-egg-reason");
        action.append(why);
      }
      const help = button(
        this.#document,
        "",
        `train-help-${role.toLowerCase()}`,
        "v7-train-help",
      );
      help.append(text(this.#document, "span", "?", "v7-train-help-glyph"));
      help.setAttribute("aria-label", `About ${rule.label}`);
      help.disabled = this.#localBusy();
      help.onclick = () => {
        this.#selectedRecruitHelp = role;
        this.#render();
      };
      card.append(action, help);
      cards.push(card);
    }
    if (cards.length === 0 && locked !== null) {
      const hint = text(
        this.#document,
        "p",
        `Research ${locked.tech} to lay ${locked.label} Eggs here.`,
        "v7-lay-egg-locked",
      );
      hint.dataset.v7LayEgg = "locked";
      return [hint];
    }
    return cards;
  }

  /** Enters nest-tile picking for one role of one own city. */
  #startLayEggPick(cityId: CityId, role: UnitRoleIdV7): void {
    if (this.#localBusy()) return;
    this.#layEggPick = { cityId, role };
    this.#notice = `${LAY_EGG_PROMPT_V7}.`;
    this.#pendingFocusAction = null;
    this.#render();
    // The board takes the keyboard, so the arrow keys and Enter pick a tile.
    this.#queueBoardFocus();
  }

  /** Leaves nest-tile picking and returns focus to the role's card. */
  #cancelLayEggPick(): void {
    const pick = this.#layEggPick;
    this.#layEggPick = null;
    this.#pendingFocusAction =
      pick === null ? null : `lay-egg-${pick.role.toLowerCase()}`;
    this.#render();
  }

  /**
   * Revision 19: the nest-tile prompt shown while an Egg's tile is picked:
   * the hint line, the Egg being laid, and Cancel. Null (and the pick ends)
   * when no tile is offered any more.
   */
  #layEggPickPanel(
    view: PlayerViewV7,
    pick: { readonly cityId: CityId; readonly role: UnitRoleIdV7 },
  ): HTMLElement | null {
    const tiles = this.#snapshot.offeredCommands.flatMap((command) =>
      command.kind === "LAY_EGG" &&
      command.cityId === pick.cityId &&
      command.role === pick.role
        ? [command.at]
        : [],
    );
    const preview = previewLayEggV7(view, pick.cityId, pick.role);
    if (tiles.length === 0 || preview === null) {
      this.#layEggPick = null;
      return null;
    }
    const label = effectiveRoleRuleV7(pick.role, view.viewer.faction).label;
    const panel = el(
      this.#document,
      "section",
      "v7-kaboom-preview v7-lay-egg-pick",
    );
    panel.dataset.v7LayEgg = "picking";
    panel.dataset.layEggRole = pick.role;
    // The legal nest tiles in (y, x) order, for assistive tooling and tests.
    panel.dataset.nestTiles = tiles.map((at) => `${at.x},${at.y}`).join(" ");
    // Bead pulp_wars-b5f.8: the ability's icon and name, the Egg's one
    // line, and Cancel; the nest tiles are chosen on the board.
    panel.setAttribute(
      "aria-label",
      `${LAY_EGG_LABEL_V7}: ${LAY_EGG_PROMPT_V7}`,
    );
    panel.append(
      this.#pickHead(
        "ICON:ACTION:LAY_EGG",
        "egg",
        LAY_EGG_LABEL_V7,
        LAY_EGG_PROMPT_V7,
      ),
      text(
        this.#document,
        "p",
        layEggRowTextV7(label, preview),
        "v7-martian-detail v7-lay-egg-detail",
      ),
    );
    const buttons = el(this.#document, "div", "button-row v7-kaboom-actions");
    const cancel = button(
      this.#document,
      "Cancel",
      "cancel-lay-egg",
      "v7-kaboom-cancel",
    );
    cancel.onclick = () => this.#cancelLayEggPick();
    buttons.append(cancel);
    panel.append(buttons);
    return panel;
  }

  /**
   * Revision 19, bead pulp_wars-9im: the one Hatch button of a Shaman next
   * to an own Egg it may hatch. The Eggs are highlighted on the board and
   * picked there; with a single Egg the button hatches it and names the
   * unit that appears at once, with several it sends the keyboard to the
   * board, where Tab steps through them.
   */
  #hatchButton(unitId: UnitId): HTMLButtonElement | null {
    const hatches = this.#snapshot.offeredCommands.filter(
      (command): command is Extract<CommandV7, { kind: "HATCH" }> =>
        command.kind === "HATCH" && command.unitId === unitId,
    );
    const command = hatches[0];
    if (command === undefined) return null;
    const action = button(
      this.#document,
      "",
      "command-hatch",
      "v7-context-action",
    );
    action.append(
      this.#chibiArt(
        commandSubjectV7(command, this.#viewerFaction()),
        CHIBI_DOM_BOXES_V7.action,
        this.#viewerColour(),
      )?.element ??
        uiIconV7(this.#document, "hatch", "v7-ui-icon v7-command-icon"),
      text(this.#document, "span", HATCH_LABEL_V7, "v7-action-label"),
    );
    action.title = HATCH_TOOLTIP_V7;
    action.dataset.hatchTargets = String(hatches.length);
    action.disabled = this.#localBusy();
    const view = this.#snapshot.view;
    if (hatches.length > 1) {
      action.setAttribute(
        "aria-label",
        `${HATCH_LABEL_V7}. ${HATCH_PICK_V7}. ${HATCH_TOOLTIP_V7}`,
      );
      action.onclick = () => {
        this.#notice = `${HATCH_PICK_V7}.`;
        this.#pendingFocusAction = null;
        this.#render();
        this.#queueBoardFocus();
      };
      return action;
    }
    action.onclick = () => void this.#dispatch(command);
    const preview =
      view === null
        ? null
        : previewHatchV7(view, command.unitId, command.eggUnitId);
    if (view === null || preview === null) return action;
    const label = effectiveRoleRuleV7(preview.role, view.viewer.faction).label;
    action.dataset.hatchRole = preview.role;
    action.setAttribute(
      "aria-label",
      `${HATCH_LABEL_V7} ${label} Egg: a ${label} with ${preview.hp} HP appears now, ${turnsTextV7(preview.turnsSaved)} early. The new unit cannot act this turn.`,
    );
    action.append(
      text(
        this.#document,
        "span",
        `${label} · now`,
        "v7-undead-preview-chip v7-hatch-chip",
      ),
    );
    return action;
  }

  /**
   * The Mind Control revision (section 9): the dock badge of a
   * mind-controlled unit, a brain in the Martian faction colour with
   * "Controlled", then the controller's name, a return arrow and the
   * original owner's name, each on a swatch of its faction colour (the
   * arrow and the original owner drop out when that owner is eliminated:
   * the unit is lost with the Brain). No sentence is shown; the tooltip
   * and the accessible name hold them.
   */
  #controlBadge(
    view: PlayerViewV7,
    control: MindControlledInfoV7,
  ): HTMLElement {
    const badge = el(this.#document, "span", "v7-chip v7-control-chip");
    badge.dataset.unitStatus = "mind-controlled";
    const sentence = `${control.byLine}. ${control.fateLine}. ${MIND_CONTROLLED_NO_SLOT_V7}.`;
    badge.title = sentence;
    badge.setAttribute("role", "img");
    badge.setAttribute(
      "aria-label",
      `${MIND_CONTROLLED_LABEL_V7}. ${sentence}`,
    );
    const owner = (
      playerId: number,
      name: string,
      role: "controller" | "original",
    ): HTMLElement => {
      const node = el(this.#document, "span", "v7-control-owner");
      node.dataset.controlOwner = role;
      const colour = this.#playerColour(view, playerId);
      if (colour !== undefined) node.style.setProperty("--player", colour);
      node.append(el(this.#document, "span", "v7-player-swatch"), name);
      return node;
    };
    badge.append(
      uiIconV7(this.#document, "brain", "v7-ui-icon v7-control-chip-icon"),
      text(
        this.#document,
        "span",
        MIND_CONTROLLED_LABEL_V7,
        "v7-control-label",
      ),
      owner(control.controllerId, control.controllerName, "controller"),
    );
    if (control.returns) {
      const arrow = text(this.#document, "span", "↩", "v7-control-arrow");
      arrow.setAttribute("aria-hidden", "true");
      badge.append(
        arrow,
        owner(control.originalOwnerId, control.originalOwnerName, "original"),
      );
    }
    return badge;
  }

  /**
   * The Mind Control revision (section 9): the small portrait of a unit a
   * Brain controls, in the Brain's "Controls 1 / 1" chip (its kind's
   * portrait, or the brain glyph without art).
   */
  #controlledPortrait(
    view: PlayerViewV7,
    unit: PlayerViewV7["units"][number],
  ): HTMLElement {
    const frame = el(this.#document, "span", "v7-control-portrait");
    frame.dataset.controlledUnit = String(unit.id);
    const name = martianUnitNameV7(view, unit);
    frame.title = `${name}, ${unit.hp} of ${unit.maxHp} HP`;
    frame.setAttribute("role", "img");
    frame.setAttribute("aria-label", frame.title);
    frame.append(
      this.#chibiArt(
        portraitSubjectV7(unit.role, presentedUnitFactionV7(view, unit)),
        CHIBI_DOM_BOXES_V7.passenger,
        this.#playerColour(view, unit.ownerId),
      )?.element ??
        uiIconV7(this.#document, "brain", "v7-ui-icon v7-control-chip-icon"),
    );
    return frame;
  }

  /** Redraws the board (for example a Kaboom! preview) without the DOM. */
  /**
   * The Martian revision (section 13.1): one button per Martian ability
   * of an own unit (Beam Down, Mind Control, Tractor Beam). With a legal
   * target it aims the ability on the board (pressed while aiming); without
   * one it is disabled and names the reason (moved, no passenger, no free
   * tile; recovering, control limit; nothing in reach).
   */
  #martianActionButtons(
    view: PlayerViewV7,
    unitId: UnitId,
  ): readonly HTMLButtonElement[] {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    if (
      unit === undefined ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      unitFactionV7(view, unit) !== "MARTIAN" ||
      this.#snapshot.offeredCommands.length === 0
    )
      return [];
    const abilities = unitRoleRuleV7(view, unit).abilities as readonly string[];
    const acted =
      unit.activation.attacked ||
      unit.activation.specialActed ||
      unit.activation.recovered ||
      unit.activation.captured ||
      unit.activation.handled;
    const buttons: HTMLButtonElement[] = [];
    // `pulp_wars-1wy.5`: the unit's own Tractor Beam: the Saucer's pull, or
    // the Mothership's heavy one, free once a turn.
    const heavy = tractorBeamRuleV7(view, unit)?.free === true;
    const entries: readonly {
      readonly kind: "BEAM_DOWN" | "MIND_CONTROL" | "TRACTOR_BEAM";
      readonly label: string;
      readonly tooltip: string;
      readonly icon: "beam-down" | "mind-control" | "tractor-beam";
      readonly blocked: () => string | null;
    }[] = [
      {
        kind: "BEAM_DOWN",
        label: BEAM_DOWN_LABEL_V7,
        tooltip: BEAM_DOWN_TOOLTIP_V7,
        icon: "beam-down",
        blocked: () => beamDownUnavailableTextV7(view, unit.id, false),
      },
      {
        kind: "MIND_CONTROL",
        label: MIND_CONTROL_LABEL_V7,
        tooltip: MIND_CONTROL_TOOLTIP_V7,
        icon: "mind-control",
        blocked: () =>
          acted
            ? null
            : (mindControlUnavailableTextV7(
                martianStatsV7(view, unit.id)?.mindControl ?? null,
              ) ?? MIND_CONTROL_NO_TARGET_V7),
      },
      {
        kind: "TRACTOR_BEAM",
        label: TRACTOR_BEAM_LABEL_V7,
        tooltip: tractorBeamTooltipV7(heavy),
        icon: "tractor-beam",
        // `pulp_wars-1wy.5`: a used or Frozen puller names its reason.
        blocked: () => tractorBeamUnavailableTextV7(view, unit.id, false),
      },
    ];
    for (const entry of entries) {
      if (!abilities.includes(entry.kind)) continue;
      const offered = this.#snapshot.offeredCommands.some(
        (command) => command.kind === entry.kind && command.unitId === unit.id,
      );
      const reason = offered ? null : entry.blocked();
      if (!offered && reason === null) continue;
      const action = button(
        this.#document,
        "",
        `martian-${entry.kind.toLowerCase().replaceAll("_", "-")}`,
        "v7-context-action",
      );
      action.append(
        this.#chibiArt(`ICON:ACTION:${entry.kind}`, CHIBI_DOM_BOXES_V7.action)
          ?.element ??
          uiIconV7(this.#document, entry.icon, "v7-ui-icon v7-command-icon"),
        text(this.#document, "span", entry.label, "v7-action-label"),
      );
      action.dataset.martianAbility = entry.kind.toLowerCase();
      if (entry.kind === "TRACTOR_BEAM" && heavy) {
        // The Mothership's pull costs no action: a small "Free" tag.
        action.dataset.free = "true";
        action.append(
          text(this.#document, "span", TRACTOR_FREE_TAG_V7, "v7-action-tag"),
        );
      }
      if (reason === null) {
        const aiming = this.#martianPick?.kind === entry.kind;
        action.title = entry.tooltip;
        action.setAttribute("aria-label", `${entry.label}. ${entry.tooltip}`);
        action.setAttribute("aria-pressed", String(aiming));
        action.disabled = this.#localBusy();
        action.onclick = () =>
          aiming
            ? this.#cancelMartianPick(false)
            : this.#startMartianPick(entry.kind, unit.id);
      } else {
        // aria-disabled keeps the reason reachable by keyboard and touch.
        action.setAttribute("aria-disabled", "true");
        action.dataset.disabledReason = reason;
        action.title = reason;
        action.setAttribute(
          "aria-label",
          `${entry.label} unavailable. ${reason}`,
        );
        action.onclick = () => {
          this.#notice = `${reason}.`;
          this.#showToast(`${reason}.`);
          // A Mind Control without a legal target still shows on the board
          // why the enemies in reach cannot be taken.
          if (
            entry.kind === "MIND_CONTROL" &&
            mindControlUnavailableTextV7(
              martianStatsV7(view, unit.id)?.mindControl ?? null,
            ) === null
          )
            this.#martianPick = { kind: "MIND_CONTROL", unitId: unit.id };
          this.#pendingFocusAction = action.dataset.action ?? null;
          this.#render();
        };
      }
      buttons.push(action);
    }
    return buttons;
  }

  /** Starts aiming a Martian ability of the selected unit on the board. */
  #startMartianPick(
    kind: "BEAM_DOWN" | "MIND_CONTROL" | "TRACTOR_BEAM",
    unitId: UnitId,
  ): void {
    if (this.#localBusy()) return;
    this.#martianPick =
      kind === "BEAM_DOWN"
        ? { kind, unitId, passengerUnitId: null }
        : { kind, unitId };
    this.#notice = `${
      kind === "BEAM_DOWN"
        ? BEAM_DOWN_PICK_PASSENGER_V7
        : kind === "MIND_CONTROL"
          ? MIND_CONTROL_PICK_V7
          : TRACTOR_BEAM_PICK_V7
    }.`;
    this.#pendingFocusAction = null;
    this.#render();
    // The board takes the keyboard, so the arrow keys and Enter pick.
    this.#queueBoardFocus();
  }

  /**
   * Leaves the aiming (a Beam Down tile steps back to its passenger first
   * when `stepBack`), and returns focus to the ability's button.
   */
  #cancelMartianPick(stepBack: boolean): void {
    const pick = this.#martianPick;
    if (
      stepBack &&
      pick?.kind === "BEAM_DOWN" &&
      pick.passengerUnitId !== null
    ) {
      this.#martianPick = { ...pick, passengerUnitId: null };
      this.#notice = `${BEAM_DOWN_PICK_PASSENGER_V7}.`;
      this.#render();
      return;
    }
    this.#martianPick = null;
    this.#pendingFocusAction =
      pick === null
        ? null
        : `martian-${pick.kind.toLowerCase().replaceAll("_", "-")}`;
    this.#render();
  }

  /**
   * The Martian aiming panel in the dock (bead pulp_wars-9im): the
   * ability's icon and name with its "?", Back and Cancel. Every passenger,
   * target and tile is highlighted and picked on the board, which carries
   * each preview and the reasons of Mind Control targets that cannot be
   * taken; the dock lists none of them. Null (and the aiming ends) when
   * nothing is offered any more.
   */
  #martianPickPanel(view: PlayerViewV7, unitId: UnitId): HTMLElement | null {
    const pick = this.#martianPick;
    if (pick === null || pick.unitId !== unitId) return null;
    const commands = this.#snapshot.offeredCommands.filter(
      (command) => command.kind === pick.kind && command.unitId === unitId,
    );
    const unitById = (id: number) =>
      view.units.find((candidate) => candidate.id === id);
    const nameOf = (id: number): string => {
      const target = unitById(id);
      return target === undefined ? "unit" : martianUnitNameV7(view, target);
    };
    const panel = el(
      this.#document,
      "section",
      "v7-kaboom-preview v7-martian-pick v7-board-pick",
    );
    panel.dataset.v7MartianPick = pick.kind.toLowerCase();
    panel.dataset.boardTargets = String(
      new Set(
        commands.map((command) =>
          command.kind === "BEAM_DOWN"
            ? pick.kind === "BEAM_DOWN" && pick.passengerUnitId !== null
              ? `${command.to.x},${command.to.y}`
              : String(command.passengerUnitId)
            : "targetUnitId" in command
              ? String(command.targetUnitId)
              : "",
        ),
      ).size,
    );
    const prompt =
      pick.kind === "BEAM_DOWN"
        ? pick.passengerUnitId === null
          ? BEAM_DOWN_PICK_PASSENGER_V7
          : // The tiles are chosen on the board only (bead pulp_wars-b5f.8:
            // no text names a tile).
            `${BEAM_DOWN_PICK_TILE_V7} for the ${nameOf(pick.passengerUnitId)}`
        : pick.kind === "MIND_CONTROL"
          ? MIND_CONTROL_PICK_V7
          : TRACTOR_BEAM_PICK_V7;
    if (commands.length === 0 && pick.kind !== "MIND_CONTROL") {
      this.#martianPick = null;
      return null;
    }
    // Bead pulp_wars-b5f.8: the ability's icon and name; the instruction
    // and caveat are in the "?" and the panel's accessible name.
    // `pulp_wars-1wy.5`: a beamed unit counts as moved: it can still
    // attack, but not move.
    const info =
      pick.kind === "BEAM_DOWN" ? `${prompt}. ${BEAMED_HINT_V7}` : prompt;
    panel.setAttribute("aria-label", prompt);
    panel.append(
      this.#pickHead(
        `ICON:ACTION:${pick.kind}`,
        pick.kind === "BEAM_DOWN"
          ? "beam-down"
          : pick.kind === "MIND_CONTROL"
            ? "mind-control"
            : "tractor-beam",
        pick.kind === "BEAM_DOWN"
          ? BEAM_DOWN_LABEL_V7
          : pick.kind === "MIND_CONTROL"
            ? MIND_CONTROL_LABEL_V7
            : TRACTOR_BEAM_LABEL_V7,
        info,
      ),
    );
    if (pick.kind === "BEAM_DOWN") {
      // `pulp_wars-1wy.5`: the caveat as two icon chips, not a sentence:
      // the attack icon ("Can attack") and the move icon struck through
      // ("No move"); together they are one image named by the sentence.
      const hint = el(this.#document, "div", "v7-beam-hint");
      hint.setAttribute("role", "img");
      hint.setAttribute("aria-label", BEAMED_HINT_V7);
      hint.title = BEAMED_HINT_V7;
      for (const [icon, label, allowed] of [
        ["attack", BEAMED_CAN_ATTACK_V7, true],
        ["move", BEAMED_NO_MOVE_V7, false],
      ] as const) {
        const chip = el(this.#document, "span", "v7-chip v7-beam-hint-chip");
        chip.dataset.beamHint = allowed ? "attack" : "no-move";
        chip.setAttribute("aria-hidden", "true");
        chip.append(
          uiIconV7(this.#document, icon, "v7-ui-icon"),
          text(this.#document, "span", label),
        );
        hint.append(chip);
      }
      panel.append(hint);
    }
    const buttons = el(this.#document, "div", "button-row v7-kaboom-actions");
    if (pick.kind === "BEAM_DOWN" && pick.passengerUnitId !== null) {
      const back = button(
        this.#document,
        "Back",
        "martian-pick-back",
        "v7-kaboom-cancel",
      );
      back.onclick = () => this.#cancelMartianPick(true);
      buttons.append(back);
    }
    const cancel = button(
      this.#document,
      "Cancel",
      "martian-pick-cancel",
      "v7-kaboom-cancel",
    );
    cancel.onclick = () => this.#cancelMartianPick(false);
    buttons.append(cancel);
    panel.append(buttons);
    return panel;
  }

  /**
   * The Ice Folk revision (section 13.1): the Bolas button of an own Sled
   * and the Cold Snap button of an own Witch. With a legal target it aims
   * the ability on the board (pressed while aiming); without one it is
   * disabled and names the reason ("No enemy within 2 tiles", "Frozen: it
   * moved"). A Frozen unit of any other role that moved gets one disabled
   * button with the reason it cannot act.
   */
  #iceFolkActionButtons(
    view: PlayerViewV7,
    unitId: UnitId,
  ): readonly HTMLButtonElement[] {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    if (
      unit === undefined ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      !matchHasIceFolkSeatV7(view) ||
      this.#snapshot.offeredCommands.length === 0
    )
      return [];
    const abilities = unitRoleRuleV7(view, unit).abilities as readonly string[];
    const buttons: HTMLButtonElement[] = [];
    const entries: readonly {
      readonly kind: "THROW_BOLAS" | "COLD_SNAP";
      readonly ability: string;
      readonly label: string;
      readonly tooltip: string;
      readonly icon: "bolas" | "snowflake";
    }[] = [
      {
        kind: "THROW_BOLAS",
        ability: "BOLAS",
        label: BOLAS_LABEL_V7,
        tooltip: BOLAS_TOOLTIP_V7,
        icon: "bolas",
      },
      {
        kind: "COLD_SNAP",
        ability: "COLD_SNAP",
        label: COLD_SNAP_LABEL_V7,
        tooltip: COLD_SNAP_TOOLTIP_V7,
        icon: "snowflake",
      },
    ];
    for (const entry of entries) {
      if (!abilities.includes(entry.ability)) continue;
      const offered = this.#snapshot.offeredCommands.some(
        (command) => command.kind === entry.kind && command.unitId === unit.id,
      );
      const reason = iceFolkAbilityUnavailableTextV7(
        view,
        unit,
        entry.kind,
        offered,
      );
      if (!offered && reason === null) continue;
      const action = button(
        this.#document,
        "",
        `ice-folk-${entry.kind === "THROW_BOLAS" ? "bolas" : "cold-snap"}`,
        "v7-context-action",
      );
      action.append(
        this.#chibiArt(`ICON:ACTION:${entry.kind}`, CHIBI_DOM_BOXES_V7.action)
          ?.element ??
          uiIconV7(this.#document, entry.icon, "v7-ui-icon v7-command-icon"),
        text(this.#document, "span", entry.label, "v7-action-label"),
      );
      action.dataset.iceFolkAbility = entry.kind.toLowerCase();
      if (reason === null) {
        const aiming = this.#iceFolkPick?.kind === entry.kind;
        action.title = entry.tooltip;
        action.setAttribute("aria-label", `${entry.label}. ${entry.tooltip}`);
        action.setAttribute("aria-pressed", String(aiming));
        action.disabled = this.#localBusy();
        action.onclick = () =>
          aiming
            ? this.#cancelIceFolkPick()
            : this.#startIceFolkPick(entry.kind, unit.id);
      } else {
        // aria-disabled keeps the reason reachable by keyboard and touch.
        action.setAttribute("aria-disabled", "true");
        action.dataset.disabledReason = reason;
        action.title = reason;
        action.setAttribute(
          "aria-label",
          `${entry.label} unavailable. ${reason}`,
        );
        action.onclick = () => {
          this.#notice = `${reason}.`;
          this.#showToast(`${reason}.`);
          this.#pendingFocusAction = action.dataset.action ?? null;
          this.#render();
        };
      }
      buttons.push(action);
    }
    // Section 13.1 "sluggish actions": a Frozen unit that moved cannot act.
    // `pulp_wars-1wy.5`: a Frozen Martian carrier or puller that moved
    // names "Frozen: it moved" on its own Beam Down and Tractor Beam
    // buttons, so it gets no second "Act" button.
    const martianNamesIt =
      beamDownUnavailableTextV7(view, unit.id, false) ===
        MARTIAN_FROZEN_MOVED_V7 ||
      tractorBeamUnavailableTextV7(view, unit.id, false) ===
        MARTIAN_FROZEN_MOVED_V7;
    if (
      buttons.length === 0 &&
      !martianNamesIt &&
      frozenAfterMoveV7(view, unit) &&
      !unit.activation.handled
    ) {
      const frozen = button(
        this.#document,
        "",
        "ice-folk-frozen",
        "v7-context-action",
      );
      frozen.append(
        this.#chibiArt("ICON:STATUS:FROZEN", CHIBI_DOM_BOXES_V7.action)
          ?.element ??
          uiIconV7(this.#document, "snowflake", "v7-ui-icon v7-command-icon"),
        text(this.#document, "span", "Act", "v7-action-label"),
      );
      frozen.setAttribute("aria-disabled", "true");
      frozen.dataset.disabledReason = "frozen";
      frozen.title = FROZEN_MOVED_V7;
      frozen.setAttribute("aria-label", `Act unavailable. ${FROZEN_MOVED_V7}`);
      frozen.onclick = () => {
        this.#notice = `${FROZEN_MOVED_V7}.`;
        this.#showToast(`${FROZEN_MOVED_V7}.`);
        this.#pendingFocusAction = "ice-folk-frozen";
        this.#render();
      };
      buttons.push(frozen);
    }
    return buttons;
  }

  /** Starts aiming a Bolas or a Cold Snap of the selected unit. */
  #startIceFolkPick(kind: "THROW_BOLAS" | "COLD_SNAP", unitId: UnitId): void {
    if (this.#localBusy()) return;
    this.#iceFolkPick = { kind, unitId };
    this.#notice =
      kind === "THROW_BOLAS"
        ? `${BOLAS_PICK_V7}.`
        : `${COLD_SNAP_LABEL_V7}: confirm to chill every highlighted unit.`;
    this.#pendingFocusAction = null;
    this.#render();
    // The board takes the keyboard, so the arrow keys and Enter pick.
    this.#queueBoardFocus();
  }

  /** Leaves the aiming, and returns focus to the ability's button. */
  #cancelIceFolkPick(): void {
    const pick = this.#iceFolkPick;
    this.#iceFolkPick = null;
    this.#pendingFocusAction =
      pick === null
        ? null
        : `ice-folk-${pick.kind === "THROW_BOLAS" ? "bolas" : "cold-snap"}`;
    this.#render();
  }

  /**
   * The Ice Folk aiming panel in the dock: the prompt, the Bolas targets
   * (each with its Frozen or Frosted hint and the units that could then
   * shatter it) or the Cold Snap targets and its one confirm, and Cancel.
   * Null (and the aiming ends) when nothing is offered any more.
   */
  #iceFolkPickPanel(view: PlayerViewV7, unitId: UnitId): HTMLElement | null {
    const pick = this.#iceFolkPick;
    if (pick === null || pick.unitId !== unitId) return null;
    const commands = this.#snapshot.offeredCommands.filter(
      (command) => command.kind === pick.kind && command.unitId === unitId,
    );
    if (commands.length === 0) {
      this.#iceFolkPick = null;
      return null;
    }
    const unitById = (id: number) =>
      view.units.find((candidate) => candidate.id === id);
    const nameOf = (id: number): string => {
      const target = unitById(id);
      return target === undefined
        ? "unit"
        : `${possessiveName(view, target.ownerId)} ${unitRoleRuleV7(view, target).label}`;
    };
    const panel = el(
      this.#document,
      "section",
      "v7-kaboom-preview v7-martian-pick v7-ice-folk-pick v7-board-pick",
    );
    panel.dataset.v7IceFolkPick =
      pick.kind === "THROW_BOLAS" ? "bolas" : "cold_snap";
    const lines = el(this.#document, "div", "v7-martian-choices");
    let prompt: string;
    if (pick.kind === "THROW_BOLAS") {
      // Bead pulp_wars-9im: the Bolas targets are highlighted and picked on
      // the board, each with its Frozen or Frosted hint; the dock lists
      // none.
      prompt = BOLAS_PICK_V7;
      panel.dataset.boardTargets = String(commands.length);
    } else {
      const command = commands[0];
      const preview =
        command === undefined ? null : previewColdSnapV7(view, unitId);
      if (command === undefined || preview === null) {
        this.#iceFolkPick = null;
        return null;
      }
      prompt = coldSnapSummaryV7(preview);
      panel.dataset.boardTargets = String(preview.targets.length);
      // Each target is labelled Frozen or Frosted on the board; the cast
      // button names them for assistive technology.
      const targets = preview.targets
        .map(
          (target) =>
            `${nameOf(target.unitId)}: ${target.becomesSluggish ? "Will be Frozen" : "Will be Frosted"}`,
        )
        .join(". ");
      const cast = button(
        this.#document,
        COLD_SNAP_CAST_V7,
        "cold-snap-cast",
        "v7-martian-choice-button",
      );
      cast.setAttribute(
        "aria-label",
        `${COLD_SNAP_CAST_V7}. ${prompt}.${targets === "" ? "" : ` ${targets}.`}`,
      );
      cast.title = COLD_SNAP_TOOLTIP_V7;
      cast.disabled = this.#localBusy();
      cast.onclick = () => void this.#dispatch(command);
      lines.append(cast);
    }
    // Bead pulp_wars-b5f.8: the ability's icon and name; the instruction
    // (or the Cold Snap summary) is in the "?" and the accessible name.
    panel.setAttribute("aria-label", prompt);
    panel.append(
      this.#pickHead(
        `ICON:ACTION:${pick.kind}`,
        pick.kind === "THROW_BOLAS" ? "bolas" : "snowflake",
        pick.kind === "THROW_BOLAS" ? BOLAS_LABEL_V7 : COLD_SNAP_LABEL_V7,
        prompt,
      ),
    );
    if (lines.childElementCount > 0) panel.append(lines);
    const buttons = el(this.#document, "div", "button-row v7-kaboom-actions");
    const cancel = button(
      this.#document,
      "Cancel",
      "ice-folk-pick-cancel",
      "v7-kaboom-cancel",
    );
    cancel.onclick = () => this.#cancelIceFolkPick();
    buttons.append(cancel);
    panel.append(buttons);
    return panel;
  }

  /**
   * The naval branch interface (bead pulp_wars-5ti.7; BOARD_TARGETING.md
   * section 3.4): the one Board button of an own ship. A ship it may
   * capture is also a ship it may attack, so the button arms Board (pressed
   * while aiming) and the prizes are picked on the board. Without an
   * offered Board, a ship next to an enemy afloat shows the button
   * disabled with the engine's reason; every other ship shows none.
   */
  #navalActionButtons(
    view: PlayerViewV7,
    unitId: UnitId,
  ): readonly HTMLButtonElement[] {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    if (
      unit === undefined ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "NAVAL" ||
      this.#snapshot.offeredCommands.length === 0
    )
      return [];
    const offered = this.#snapshot.offeredCommands.some(
      (command) => command.kind === "BOARD" && command.unitId === unit.id,
    );
    const reason = boardUnavailableTextV7(view, unit, offered);
    if (!offered && reason === null) return [];
    const action = button(
      this.#document,
      "",
      "naval-board",
      "v7-context-action",
    );
    action.append(
      this.#chibiArt("ICON:ACTION:BOARD", CHIBI_DOM_BOXES_V7.action)?.element ??
        uiIconV7(this.#document, "grapple", "v7-ui-icon v7-command-icon"),
      text(this.#document, "span", BOARD_LABEL_V7, "v7-action-label"),
    );
    action.dataset.navalAbility = "board";
    if (reason === null) {
      const aiming = this.#navalPick !== null;
      action.title = BOARD_TOOLTIP_V7;
      action.setAttribute(
        "aria-label",
        `${BOARD_LABEL_V7}. ${BOARD_TOOLTIP_V7}`,
      );
      action.setAttribute("aria-pressed", String(aiming));
      action.disabled = this.#localBusy();
      action.onclick = () =>
        aiming ? this.#cancelNavalPick() : this.#startNavalPick(unit.id);
    } else {
      // aria-disabled keeps the reason reachable by keyboard and touch.
      action.setAttribute("aria-disabled", "true");
      action.dataset.disabledReason = reason;
      action.title = reason;
      action.setAttribute(
        "aria-label",
        `${BOARD_LABEL_V7} unavailable. ${reason}`,
      );
      action.onclick = () => {
        this.#notice = `${reason}.`;
        this.#showToast(`${reason}.`);
        this.#pendingFocusAction = "naval-board";
        this.#render();
      };
    }
    return [action];
  }

  /** Starts aiming the selected ship's Board. */
  #startNavalPick(unitId: UnitId): void {
    if (this.#localBusy()) return;
    this.#navalPick = { kind: "BOARD", unitId };
    this.#notice = `${BOARD_PICK_V7}.`;
    this.#pendingFocusAction = null;
    this.#render();
    // The board takes the keyboard, so Tab and Enter pick.
    this.#queueBoardFocus();
  }

  /** Leaves the aiming, and returns focus to the Board button. */
  #cancelNavalPick(): void {
    const pick = this.#navalPick;
    this.#navalPick = null;
    this.#pendingFocusAction = pick === null ? null : "naval-board";
    this.#render();
  }

  /**
   * The Board aiming panel in the dock: the action's icon and name, its
   * "?" and Cancel. The prizes are highlighted and picked on the board,
   * each with its HP after the capture; the dock lists none. Null (and the
   * aiming ends) when nothing is offered any more.
   */
  #navalPickPanel(unitId: UnitId): HTMLElement | null {
    const pick = this.#navalPick;
    if (pick === null || pick.unitId !== unitId) return null;
    const commands = this.#snapshot.offeredCommands.filter(
      (command) => command.kind === "BOARD" && command.unitId === unitId,
    );
    if (commands.length === 0) {
      this.#navalPick = null;
      return null;
    }
    const panel = el(
      this.#document,
      "section",
      "v7-kaboom-preview v7-martian-pick v7-naval-pick v7-board-pick",
    );
    panel.dataset.v7NavalPick = "board";
    panel.dataset.boardTargets = String(commands.length);
    panel.setAttribute("aria-label", BOARD_PICK_V7);
    panel.append(
      this.#pickHead(
        "ICON:ACTION:BOARD",
        "grapple",
        BOARD_LABEL_V7,
        `${BOARD_PICK_V7}. ${BOARD_TOOLTIP_V7}`,
      ),
    );
    const buttons = el(this.#document, "div", "button-row v7-kaboom-actions");
    const cancel = button(
      this.#document,
      "Cancel",
      "naval-pick-cancel",
      "v7-kaboom-cancel",
    );
    cancel.onclick = () => this.#cancelNavalPick();
    buttons.append(cancel);
    panel.append(buttons);
    return panel;
  }

  /**
   * The Candy revision (section 15.1): the Sugar Rush button of an own
   * Candy land unit, the Re-bake button of an own Confectioner and the
   * Sugar Toss button of an own Gunner. With a legal choice it arms the
   * Rush or aims the ability on the board (pressed while armed); without
   * one it is disabled and names the reason ("Crashed", "Already moved",
   * "No Crumbs next to it", "Not enough Coins", ...).
   */
  #candyActionButtons(
    view: PlayerViewV7,
    unitId: UnitId,
  ): readonly HTMLButtonElement[] {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    if (
      unit === undefined ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      unitFactionV7(view, unit) !== "CANDY" ||
      this.#snapshot.offeredCommands.length === 0
    )
      return [];
    const abilities = unitRoleRuleV7(view, unit).abilities as readonly string[];
    const entries: readonly {
      readonly kind: CandyPickV7["kind"];
      readonly label: string;
      readonly tooltip: string;
      readonly icon: UiIconIdV7;
    }[] = [
      {
        kind: "SUGAR_RUSH",
        label: SUGAR_RUSH_LABEL_V7,
        tooltip: SUGAR_RUSH_TOOLTIP_V7,
        icon: "move",
      },
      {
        kind: "REBAKE",
        label: REBAKE_LABEL_V7,
        tooltip: REBAKE_TOOLTIP_V7,
        icon: "units",
      },
      {
        kind: "SUGAR_TOSS",
        label: SUGAR_TOSS_LABEL_V7,
        tooltip: SUGAR_TOSS_TOOLTIP_V7,
        icon: "hp",
      },
    ];
    const buttons: HTMLButtonElement[] = [];
    for (const entry of entries) {
      if (!abilities.includes(entry.kind)) continue;
      const offered = this.#snapshot.offeredCommands.some(
        (command) => command.kind === entry.kind && command.unitId === unit.id,
      );
      const reason =
        entry.kind === "SUGAR_RUSH"
          ? sugarRushUnavailableTextV7(view, unit, offered)
          : entry.kind === "REBAKE"
            ? rebakeUnavailableTextV7(view, unit, offered, (cityId) =>
                dwarfCityNameV7(view, cityId),
              )
            : sugarTossUnavailableTextV7(view, unit, offered);
      if (!offered && reason === null) continue;
      const slug = entry.kind.toLowerCase().replaceAll("_", "-");
      const action = button(
        this.#document,
        "",
        `candy-${slug}`,
        "v7-context-action",
      );
      action.append(
        this.#chibiArt(`ICON:ACTION:${entry.kind}`, CHIBI_DOM_BOXES_V7.action)
          ?.element ??
          uiIconV7(this.#document, entry.icon, "v7-ui-icon v7-command-icon"),
        text(this.#document, "span", entry.label, "v7-action-label"),
      );
      action.dataset.candyAbility = slug;
      if (reason === null) {
        const aiming = this.#candyPick?.kind === entry.kind;
        action.title = entry.tooltip;
        action.setAttribute("aria-label", `${entry.label}. ${entry.tooltip}`);
        action.setAttribute("aria-pressed", String(aiming));
        action.disabled = this.#localBusy();
        action.onclick = () =>
          aiming
            ? this.#cancelCandyPick()
            : this.#startCandyPick(entry.kind, unit.id);
      } else {
        // aria-disabled keeps the reason reachable by keyboard and touch.
        action.setAttribute("aria-disabled", "true");
        action.dataset.disabledReason = reason;
        action.title = reason;
        action.setAttribute(
          "aria-label",
          `${entry.label} unavailable. ${reason}`,
        );
        action.onclick = () => {
          this.#notice = `${reason}.`;
          this.#showToast(`${reason}.`);
          this.#pendingFocusAction = action.dataset.action ?? null;
          this.#render();
        };
      }
      buttons.push(action);
    }
    return buttons;
  }

  /** Arms the Sugar Rush, or aims a Re-bake or a Sugar Toss. */
  #startCandyPick(kind: CandyPickV7["kind"], unitId: UnitId): void {
    if (this.#localBusy()) return;
    this.#candyPick = { kind, unitId };
    this.#notice = `${
      kind === "SUGAR_RUSH"
        ? SUGAR_RUSH_TOOLTIP_V7
        : kind === "REBAKE"
          ? REBAKE_TOOLTIP_V7
          : SUGAR_TOSS_TOOLTIP_V7
    }.`;
    this.#pendingFocusAction = null;
    this.#render();
    // The board takes the keyboard, so the arrow keys and Enter pick.
    this.#queueBoardFocus();
  }

  /** Disarms or leaves the aiming (nothing is sent); focus returns. */
  #cancelCandyPick(): void {
    const pick = this.#candyPick;
    this.#candyPick = null;
    this.#pendingFocusAction =
      pick === null
        ? null
        : `candy-${pick.kind.toLowerCase().replaceAll("_", "-")}`;
    this.#render();
  }

  /**
   * The Candy aiming panel in the dock (section 15.1, under the
   * no-coordinates rule; bead pulp_wars-9im): the ability's icon and name
   * with its "?", and Back. The Crumbs a Re-bake would bake back and the
   * units a Sugar Toss would heal are highlighted and picked on the board,
   * each with its numbers; the dock lists none. Null (and the aiming ends)
   * when nothing is offered any more.
   */
  #candyPickPanel(unitId: UnitId): HTMLElement | null {
    const pick = this.#candyPick;
    if (pick === null || pick.unitId !== unitId) return null;
    const commands = this.#snapshot.offeredCommands.filter(
      (command) => command.kind === pick.kind && command.unitId === unitId,
    );
    if (commands.length === 0) {
      this.#candyPick = null;
      return null;
    }
    const panel = el(
      this.#document,
      "section",
      "v7-kaboom-preview v7-martian-pick v7-candy-pick v7-board-pick",
    );
    panel.dataset.v7CandyPick = pick.kind.toLowerCase();
    const title =
      pick.kind === "SUGAR_RUSH"
        ? SUGAR_RUSH_LABEL_V7
        : pick.kind === "REBAKE"
          ? REBAKE_LABEL_V7
          : SUGAR_TOSS_LABEL_V7;
    const info =
      pick.kind === "SUGAR_RUSH"
        ? SUGAR_RUSH_TOOLTIP_V7
        : pick.kind === "REBAKE"
          ? REBAKE_TOOLTIP_V7
          : SUGAR_TOSS_TOOLTIP_V7;
    if (pick.kind !== "SUGAR_RUSH")
      panel.dataset.boardTargets = String(commands.length);
    panel.setAttribute("aria-label", info);
    panel.append(
      this.#pickHead(
        pick.kind === "SUGAR_RUSH"
          ? "ICON:ACTION:SUGAR_RUSH"
          : pick.kind === "REBAKE"
            ? "ICON:ACTION:REBAKE"
            : "ICON:ACTION:SUGAR_TOSS",
        pick.kind === "SUGAR_RUSH"
          ? "move"
          : pick.kind === "REBAKE"
            ? "units"
            : "hp",
        title,
        info,
      ),
    );
    const buttons = el(this.#document, "div", "button-row v7-kaboom-actions");
    const back = button(
      this.#document,
      "Back",
      "candy-pick-cancel",
      "v7-kaboom-cancel",
    );
    back.onclick = () => this.#cancelCandyPick();
    buttons.append(back);
    panel.append(buttons);
    return panel;
  }

  /**
   * The Dwarf revision (section 16.1): the Tunnel button of an own Steam
   * Mole, the Bomb Run button of an own Gyrocopter and the Assemble button
   * of an own Engineer. With a legal choice it aims the ability on the
   * board (pressed while aiming); without one it is disabled and names the
   * reason ("It surfaced this turn", "No enemy within 2 tiles", "Needs
   * Marksmanship", ...).
   */
  #dwarfActionButtons(
    view: PlayerViewV7,
    unitId: UnitId,
  ): readonly HTMLButtonElement[] {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    if (
      unit === undefined ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      unitFactionV7(view, unit) !== "DWARF" ||
      this.#snapshot.offeredCommands.length === 0
    )
      return [];
    const abilities = unitRoleRuleV7(view, unit).abilities as readonly string[];
    const city = dwarfCityNameV7(view, unit.homeCityId);
    const assemble = previewAssembleV7(view, unit.id);
    const entries: readonly {
      readonly kind: "TUNNEL" | "BOMB_RUN" | "ASSEMBLE";
      readonly label: string;
      readonly tooltip: string;
      readonly icon: "drill" | "bomb-run" | "key";
    }[] = [
      {
        kind: "TUNNEL",
        label: TUNNEL_LABEL_V7,
        tooltip: tunnelTooltipV7(viewerEruptionDamageV7(view)),
        icon: "drill",
      },
      {
        kind: "BOMB_RUN",
        label: BOMB_RUN_LABEL_V7,
        tooltip: bombRunTooltipV7(viewerBombDamageV7(view)),
        icon: "bomb-run",
      },
      {
        kind: "ASSEMBLE",
        label: ASSEMBLE_LABEL_V7,
        tooltip: assembleTooltipV7(
          assemble?.cost ?? effectiveRoleRuleV7("MARKSMAN", "DWARF").cost ?? 0,
          city,
        ),
        icon: "key",
      },
    ];
    const buttons: HTMLButtonElement[] = [];
    for (const entry of entries) {
      if (!abilities.includes(entry.kind)) continue;
      const offered = this.#snapshot.offeredCommands.some(
        (command) => command.kind === entry.kind && command.unitId === unit.id,
      );
      const reason = dwarfAbilityUnavailableTextV7(
        view,
        unit,
        entry.kind,
        offered,
        entry.kind === "ASSEMBLE"
          ? {
              reason: queryAssembleUnavailableReasonV7(view, unit.id),
              city: city.charAt(0).toUpperCase() + city.slice(1),
            }
          : undefined,
      );
      if (!offered && reason === null) continue;
      const slug = entry.kind.toLowerCase().replaceAll("_", "-");
      const action = button(
        this.#document,
        "",
        `dwarf-${slug}`,
        "v7-context-action",
      );
      action.append(
        this.#chibiArt(`ICON:ACTION:${entry.kind}`, CHIBI_DOM_BOXES_V7.action)
          ?.element ??
          uiIconV7(this.#document, entry.icon, "v7-ui-icon v7-command-icon"),
        text(this.#document, "span", entry.label, "v7-action-label"),
      );
      action.dataset.dwarfAbility = slug;
      if (reason === null) {
        const aiming = this.#dwarfPick?.kind === entry.kind;
        action.title = entry.tooltip;
        action.setAttribute("aria-label", `${entry.label}. ${entry.tooltip}`);
        action.setAttribute("aria-pressed", String(aiming));
        action.disabled = this.#localBusy();
        action.onclick = () =>
          aiming
            ? this.#cancelDwarfPick(false)
            : this.#startDwarfPick(entry.kind, unit.id);
      } else {
        // aria-disabled keeps the reason reachable by keyboard and touch.
        action.setAttribute("aria-disabled", "true");
        action.dataset.disabledReason = reason;
        action.title = reason;
        action.setAttribute(
          "aria-label",
          `${entry.label} unavailable. ${reason}`,
        );
        action.onclick = () => {
          this.#notice = `${reason}.`;
          this.#showToast(`${reason}.`);
          this.#pendingFocusAction = action.dataset.action ?? null;
          this.#render();
        };
      }
      buttons.push(action);
    }
    return buttons;
  }

  /** Starts aiming a Tunnel, Bomb Run or Assemble of the selected unit. */
  #startDwarfPick(
    kind: "TUNNEL" | "BOMB_RUN" | "ASSEMBLE",
    unitId: UnitId,
  ): void {
    if (this.#localBusy()) return;
    this.#dwarfPick =
      kind === "TUNNEL"
        ? {
            kind,
            unitId,
            to: null,
            // The best Hammerer that can ride is seated at once.
            riderUnitId:
              this.#snapshot.view === null
                ? null
                : (tunnelRidersV7(
                    this.#snapshot.view,
                    this.#snapshot.offeredCommands,
                    unitId,
                  )[0]?.unitId ?? null),
            riderTo: null,
          }
        : kind === "BOMB_RUN"
          ? { kind, unitId, targetUnitId: null }
          : { kind, unitId };
    this.#notice = `${
      kind === "TUNNEL"
        ? TUNNEL_PICK_V7
        : kind === "BOMB_RUN"
          ? BOMB_RUN_PICK_TARGET_V7
          : ASSEMBLE_PICK_V7
    }.`;
    this.#pendingFocusAction = null;
    this.#render();
    // The board takes the keyboard, so the arrow keys and Enter pick.
    this.#queueBoardFocus();
  }

  /**
   * Steps back out of the aiming: from a chosen Tunnel destination to the
   * destinations (the passenger stays seated), from the landings to the
   * targets (`stepBack`), or leaves it and returns focus to the ability's
   * button.
   */
  #cancelDwarfPick(stepBack: boolean): void {
    const pick = this.#dwarfPick;
    if (stepBack && pick?.kind === "TUNNEL" && pick.to !== null) {
      this.#dwarfPick = { ...pick, to: null, riderTo: null };
      this.#notice = `${TUNNEL_PICK_V7}.`;
      this.#render();
      return;
    }
    if (stepBack && pick?.kind === "BOMB_RUN" && pick.targetUnitId !== null) {
      this.#dwarfPick = { ...pick, targetUnitId: null };
      this.#notice = `${BOMB_RUN_PICK_TARGET_V7}.`;
      this.#render();
      return;
    }
    this.#dwarfPick = null;
    this.#pendingFocusAction =
      pick === null
        ? null
        : `dwarf-${pick.kind.toLowerCase().replaceAll("_", "-")}`;
    this.#render();
  }

  /**
   * Bead pulp_wars-b5f.8 (no coordinates, minimal text): the head of an
   * ability's aiming panel, its icon and name and a small "?" whose
   * tooltip (and toast, for touch) holds the instruction and any caveat.
   * The panel never says where; the board does.
   */
  #pickHead(
    subject: ArtSubjectV7 | null,
    icon: UiIconIdV7,
    title: string,
    info: string,
  ): HTMLElement {
    const head = el(this.#document, "div", "v7-pick-head");
    const heading = el(this.#document, "p", "v7-kaboom-summary v7-pick-title");
    heading.append(
      this.#chibiArt(subject, CHIBI_DOM_BOXES_V7.passenger)?.element ??
        uiIconV7(this.#document, icon, "v7-ui-icon v7-command-icon"),
      text(this.#document, "span", title, "v7-pick-title-text"),
    );
    const help = button(this.#document, "", "pick-info", "v7-pick-info");
    help.append(text(this.#document, "span", "?", "v7-unit-help-glyph"));
    help.title = info;
    help.setAttribute("aria-label", `About ${title}: ${info}`);
    help.onclick = () => {
      this.#notice = `${info}.`;
      this.#showToast(`${info}.`);
      this.#pendingFocusAction = "pick-info";
      this.#render();
    };
    head.append(heading, help);
    return head;
  }

  /**
   * The Dwarf aiming panel in the dock (trimmed by bead pulp_wars-b5f.8):
   * the ability's icon and name with its "?" info, for a Tunnel who rides
   * (a portrait) and the "Alone" toggle, and the actions (Tunnel, Back,
   * Cancel). Bead pulp_wars-9im: every Hammerer, bomb target and tile is
   * highlighted and picked on the board, which carries the forecast; the
   * dock lists no targets and no text names a tile. Null (and the aiming
   * ends) when nothing is offered any more.
   */
  #dwarfPickPanel(view: PlayerViewV7, unitId: UnitId): HTMLElement | null {
    const pick = this.#dwarfPick;
    if (pick === null || pick.unitId !== unitId) return null;
    const commands = this.#snapshot.offeredCommands.filter(
      (command) => command.kind === pick.kind && command.unitId === unitId,
    );
    if (commands.length === 0) {
      this.#dwarfPick = null;
      return null;
    }
    const unitById = (id: number) =>
      view.units.find((candidate) => candidate.id === id);
    const nameOf = (id: number): string => {
      const target = unitById(id);
      return target === undefined ? "unit" : unitRoleRuleV7(view, target).label;
    };
    const panel = el(
      this.#document,
      "section",
      "v7-kaboom-preview v7-martian-pick v7-dwarf-pick v7-board-pick",
    );
    panel.dataset.v7DwarfPick = pick.kind.toLowerCase();
    panel.dataset.boardTargets = String(
      new Set(
        commands.map((command) =>
          command.kind === "BOMB_RUN" && pick.kind === "BOMB_RUN"
            ? pick.targetUnitId === null
              ? String(command.targetUnitId)
              : `${command.to.x},${command.to.y}`
            : "to" in command
              ? `${command.to.x},${command.to.y}`
              : "",
        ),
      ).size,
    );
    let prompt: string;
    let info: string;
    let detail: string | null = null;
    let back = false;
    // The Tunnel's passenger control and its confirmation.
    let passengers: HTMLElement | null = null;
    let confirm: HTMLButtonElement | null = null;
    if (pick.kind === "TUNNEL") {
      // Passenger first (bead pulp_wars-78i.9). Bead pulp_wars-9im: the
      // Hammerers that can ride wear their badge on the board and are
      // seated there; the dock shows who rides (a portrait, not a button)
      // and one "Alone" toggle. The destination is chosen on the board,
      // then confirmed here.
      const offered = this.#snapshot.offeredCommands;
      const riders = tunnelRidersV7(view, offered, unitId);
      if (riders.length > 0) {
        passengers = el(this.#document, "div", "v7-dwarf-passengers");
        passengers.setAttribute("role", "group");
        passengers.setAttribute("aria-label", TUNNEL_PASSENGER_V7);
        passengers.dataset.riders = String(riders.length);
        const seated = riders.find(
          (rider) => rider.unitId === pick.riderUnitId,
        );
        if (seated !== undefined) {
          const unit = unitById(seated.unitId);
          const riding = el(
            this.#document,
            "span",
            "v7-dwarf-passenger v7-dwarf-riding",
          );
          riding.dataset.tunnelRider = String(seated.unitId);
          const name = passengerAccessibleNameV7(
            seated.label,
            seated.hp,
            seated.maxHp,
            true,
          );
          riding.setAttribute("role", "img");
          riding.setAttribute("aria-label", name);
          riding.title = name;
          riding.append(
            (unit === undefined
              ? null
              : this.#chibiArt(
                  // Mind Control revision: the rider's kind.
                  portraitSubjectV7(
                    unit.role,
                    presentedUnitFactionV7(view, unit),
                  ),
                  CHIBI_DOM_BOXES_V7.passenger,
                  this.#viewerColour(),
                )
            )?.element ??
              uiIconV7(this.#document, "drill", "v7-ui-icon v7-command-icon"),
            text(
              this.#document,
              "span",
              `${seated.hp}/${seated.maxHp}`,
              "v7-dwarf-passenger-hp",
            ),
          );
          passengers.append(riding);
        }
        const alone = pick.riderUnitId === null;
        const none = button(
          this.#document,
          TUNNEL_NO_PASSENGER_V7,
          "tunnel-passenger-none",
          "v7-dwarf-passenger",
        );
        none.setAttribute("aria-pressed", String(alone));
        none.setAttribute("aria-label", noPassengerAccessibleNameV7(alone));
        none.title = TUNNEL_ALONE_V7;
        none.disabled = this.#localBusy();
        // Pressed again, the best Hammerer that can ride is seated again.
        none.onclick = () => {
          this.#dwarfPick = {
            ...pick,
            riderUnitId: alone ? (riders[0]?.unitId ?? null) : null,
            riderTo: null,
          };
          this.#pendingFocusAction = "tunnel-passenger-none";
          this.#render();
        };
        passengers.append(none);
      }
      panel.dataset.destinations = String(
        tunnelDestinationsV7(offered, unitId).length,
      );
      if (pick.to === null) {
        prompt = TUNNEL_PICK_V7;
        info = TUNNEL_PICK_INFO_V7;
      } else {
        const to = pick.to;
        back = true;
        info = TUNNEL_CONFIRM_INFO_V7;
        const outcome = tunnelOutcomeV7(view, offered, pick, to);
        const alone = tunnelCommandsV7(offered, unitId).find(
          (command) => command.rider === null && same(command.to, to),
        );
        const preview =
          alone === undefined ? null : previewTunnelV7(view, alone);
        const name =
          preview === null
            ? TUNNEL_LABEL_V7
            : tunnelDestinationNameV7(
                view,
                preview,
                pick.riderUnitId !== null && outcome?.staysBehind === true,
              );
        prompt = `${TUNNEL_LABEL_V7}: ${name}`;
        if (outcome !== null) {
          confirm = button(
            this.#document,
            TUNNEL_LABEL_V7,
            "tunnel-confirm",
            "primary-action v7-dwarf-confirm",
          );
          confirm.setAttribute("aria-label", `${TUNNEL_LABEL_V7}. ${name}`);
          confirm.disabled = this.#localBusy();
          const command = outcome.command;
          confirm.onclick = () => void this.#dispatch(command);
        }
      }
    } else if (pick.kind === "BOMB_RUN") {
      // Bead pulp_wars-9im: the bomb targets are highlighted and picked on
      // the board, each with its damage; the dock lists none.
      if (pick.targetUnitId === null) {
        prompt = BOMB_RUN_PICK_TARGET_V7;
        info = BOMB_RUN_PICK_TARGET_V7;
      } else {
        back = true;
        prompt = `${BOMB_RUN_PICK_LANDING_V7} after bombing the ${nameOf(pick.targetUnitId)}`;
        info = BOMB_RUN_PICK_LANDING_V7;
      }
    } else {
      const preview = previewAssembleV7(view, unitId);
      prompt =
        preview === null
          ? ASSEMBLE_PICK_V7
          : `${ASSEMBLE_PICK_V7}. ${assembleSummaryV7(preview, dwarfCityNameV7(view, preview.cityId))}`;
      info = `${ASSEMBLE_PICK_V7}. The ${dwarfLabelV7("MARKSMAN")} arrives exhausted`;
      detail = preview === null ? null : assembleCostLineV7(preview);
    }
    const kindTitle =
      pick.kind === "TUNNEL"
        ? TUNNEL_LABEL_V7
        : pick.kind === "BOMB_RUN"
          ? BOMB_RUN_LABEL_V7
          : ASSEMBLE_LABEL_V7;
    panel.setAttribute("aria-label", prompt);
    panel.append(
      this.#pickHead(
        `ICON:ACTION:${pick.kind}`,
        pick.kind === "TUNNEL"
          ? "drill"
          : pick.kind === "BOMB_RUN"
            ? "bomb-run"
            : "key",
        kindTitle,
        info,
      ),
    );
    if (passengers !== null) panel.append(passengers);
    if (detail !== null)
      panel.append(text(this.#document, "p", detail, "v7-martian-detail"));
    const buttons = el(this.#document, "div", "button-row v7-kaboom-actions");
    if (confirm !== null) buttons.append(confirm);
    if (back) {
      const backButton = button(
        this.#document,
        "Back",
        "dwarf-pick-back",
        "v7-kaboom-cancel",
      );
      backButton.onclick = () => this.#cancelDwarfPick(true);
      buttons.append(backButton);
    }
    const cancel = button(
      this.#document,
      "Cancel",
      "dwarf-pick-cancel",
      "v7-kaboom-cancel",
    );
    cancel.onclick = () => this.#cancelDwarfPick(false);
    buttons.append(cancel);
    panel.append(buttons);
    return panel;
  }

  #syncBoard(): void {
    const view = this.#snapshot.view;
    if (view === null || this.#matchRoot === null || this.#destroyed) return;
    this.#boardHost.update(this.#boardModel(view));
  }

  /** The viewer's faction; labels always use the viewer's own registration. */
  #viewerFaction(): FactionIdV7 {
    const view = this.#snapshot.view;
    if (view === null) throw new RangeError("No Ruleset 7 view");
    return view.viewer.faction;
  }

  /** Why a `DISABLED` technology cannot be researched in this match. */
  #technologyUnavailableText(tech: TechnologyIdV7): string {
    const view = this.#snapshot.view;
    return technologyUnavailableTextV7(
      view === null ? null : forbiddenTechnologiesV7(view.setup).get(tech),
    );
  }

  #localBusy(): boolean {
    return (
      this.#presentationActive ||
      this.#snapshot.transitioning ||
      this.#snapshot.ai.active
    );
  }
}

function selectionKey(selection: BoardSelectionV7): string {
  switch (selection.kind) {
    case "UNIT":
      return `unit:${selection.unitId}`;
    case "CITY":
      return `city:${selection.cityId}`;
    case "TILE":
      return `tile:${selection.at.x},${selection.at.y}`;
  }
}

function dockScrollPosition(
  main: HTMLElement,
): { readonly key: string; readonly top: number } | null {
  const dock = main.querySelector<HTMLElement>(".v7-selection-dock");
  const key = dock?.dataset.selectionKey;
  if (dock === null || key === undefined) return null;
  const saved = Number(dock.dataset.scrollTop);
  return { key, top: Number.isFinite(saved) ? saved : dock.scrollTop };
}

function reconcileMatchChildren(
  parent: HTMLElement,
  board: HTMLElement,
  desired: readonly HTMLElement[],
): void {
  let cursor: ChildNode | null = board.nextSibling;
  const retained = new Set<ChildNode>();
  const desiredKeys = new Set(desired.map(stableElementKey));
  for (const next of desired) {
    const key = stableElementKey(next);
    const current = [...parent.children].find(
      (candidate): candidate is HTMLElement =>
        candidate instanceof HTMLElement &&
        candidate !== board &&
        !retained.has(candidate) &&
        stableElementKey(candidate) === key,
    );
    const preservesStaticControls =
      key === "region:hud" ||
      key === "region:zoom" ||
      key === "region:toast" ||
      key === "region:overlay-settings" ||
      key === "action:fast-forward";
    const resolved =
      current === undefined || !preservesStaticControls
        ? next
        : reconcileElement(current, next);
    retained.add(resolved);
    while (
      cursor !== null &&
      cursor !== resolved &&
      cursor !== board &&
      !retained.has(cursor) &&
      (!(cursor instanceof HTMLElement) ||
        !desiredKeys.has(stableElementKey(cursor)))
    ) {
      const obsolete = cursor;
      cursor = cursor.nextSibling;
      obsolete.remove();
    }
    if (resolved !== cursor) parent.insertBefore(resolved, cursor);
    cursor = resolved.nextSibling;
  }
  for (const child of [...parent.children]) {
    if (child !== board && !retained.has(child as HTMLElement)) child.remove();
  }
}

function reconcileElement(
  current: HTMLElement,
  desired: HTMLElement,
): HTMLElement {
  if (current.tagName !== desired.tagName) return desired;
  for (const attribute of [...current.attributes]) {
    if (!desired.hasAttribute(attribute.name))
      current.removeAttribute(attribute.name);
  }
  for (const attribute of [...desired.attributes])
    current.setAttribute(attribute.name, attribute.value);
  current.onclick = desired.onclick;
  current.onchange = desired.onchange;
  current.oninput = desired.oninput;
  current.onkeydown = desired.onkeydown;
  if (
    current instanceof HTMLButtonElement &&
    desired instanceof HTMLButtonElement
  )
    current.disabled = desired.disabled;
  if (
    current instanceof HTMLInputElement &&
    desired instanceof HTMLInputElement
  ) {
    current.disabled = desired.disabled;
    current.checked = desired.checked;
    current.value = desired.value;
  }
  if (
    current instanceof HTMLSelectElement &&
    desired instanceof HTMLSelectElement
  ) {
    current.disabled = desired.disabled;
    current.value = desired.value;
  }
  reconcileElementChildren(current, desired);
  return current;
}

function reconcileElementChildren(
  current: HTMLElement,
  desired: HTMLElement,
): void {
  let cursor = current.firstChild;
  const retained = new Set<ChildNode>();
  for (const desiredChild of [...desired.childNodes]) {
    let resolved: ChildNode;
    if (desiredChild.nodeType === Node.TEXT_NODE) {
      const candidate =
        cursor?.nodeType === Node.TEXT_NODE && !retained.has(cursor)
          ? cursor
          : undefined;
      resolved = candidate ?? desiredChild;
      if (resolved.textContent !== desiredChild.textContent)
        resolved.textContent = desiredChild.textContent;
    } else if (desiredChild instanceof HTMLElement) {
      const key = stableElementKey(desiredChild);
      const candidate = [...current.children].find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          !retained.has(child) &&
          stableElementKey(child) === key,
      );
      resolved =
        candidate === undefined
          ? desiredChild
          : reconcileElement(candidate, desiredChild);
    } else resolved = desiredChild;
    retained.add(resolved);
    if (resolved !== cursor) current.insertBefore(resolved, cursor);
    cursor = resolved.nextSibling;
  }
  for (const child of [...current.childNodes])
    if (!retained.has(child)) child.remove();
}

/**
 * The technology tree's text for a forbidden (`DISABLED`) technology
 * (docs/product/CAMPAIGN.md section 2.3): a mission's own list, or the Dry
 * Land Naval branch.
 */
function technologyUnavailableTextV7(
  reason: "DRY_LAND" | "MISSION" | null | undefined,
): string {
  return reason === "MISSION"
    ? "Unavailable in this mission"
    : "Unavailable on Dry Land maps";
}

function stableElementKey(element: Element): string {
  const action = element.getAttribute("data-action");
  if (action !== null) return `action:${action}`;
  const region = element.getAttribute("data-v7-region");
  if (region !== null) return `region:${region}`;
  if (element.id) return `id:${element.id}`;
  return `${element.tagName}:${element.className}`;
}

function appendTechNode(
  documentRoot: Document,
  parent: HTMLElement,
  layout: ReturnType<typeof technologyTreeLayoutV7>[number],
  choose: (node: PublicTechnologyNodeV7) => void,
  selected: TechnologyIdV7 | null,
  /** CHIBI art for a technology card, or null to keep the legacy art. */
  chibiArt: (tech: TechnologyIdV7) => HTMLElement | null = () => null,
  /** The viewer's faction, which names the technologies (Plunder). */
  faction: FactionIdV7 = "ORIGINAL",
  /** Why a `DISABLED` technology is unavailable (Dry Land or a mission). */
  unavailable: (tech: TechnologyIdV7) => string = () =>
    technologyUnavailableTextV7("DRY_LAND"),
  /** The technology a research prompt asked for (bead pulp_wars-gl1). */
  goal: TechnologyIdV7 | null = null,
): void {
  const name = technologyNameV7(layout.node.id, faction);
  const node = el(documentRoot, "div", "v7-tech-node");
  const card = button(
    documentRoot,
    "",
    `tech-${layout.node.id.toLowerCase()}`,
    `v7-tech-card state-${layout.node.state.toLowerCase()}`,
  );
  card.dataset.selected = String(layout.node.id === selected);
  if (layout.node.id === goal && layout.node.state !== "OWNED")
    card.dataset.goal = "true";
  const artFrame = el(documentRoot, "span", "v7-tech-art");
  const assetId = RULESET7_TECH_ART_IDS[layout.node.id];
  const chibiImage = chibiArt(layout.node.id);
  if (chibiImage !== null) artFrame.dataset.artSet = "chibi";
  const image = chibiImage ?? art(documentRoot, assetId, "");
  const artworkLayout =
    chibiImage === null ? technologyArtworkLayoutV7(assetId) : null;
  if (artworkLayout !== null) {
    artFrame.dataset.frameMode = "visible-alpha";
    image.style.left = `${artworkLayout.image.left}px`;
    image.style.top = `${artworkLayout.image.top}px`;
    image.style.width = `${artworkLayout.image.width}px`;
    image.style.height = `${artworkLayout.image.height}px`;
  }
  artFrame.append(image);
  card.append(artFrame, text(documentRoot, "span", name, "v7-tech-name"));
  const achievement = techAchievementV7(layout.node.id);
  if (achievement !== null) {
    const badge = el(documentRoot, "span", "v7-tech-achievement");
    badge.title = `${achievementNameV7(achievement)} achievement`;
    badge.append(uiIconV7(documentRoot, "trophy"));
    card.append(badge);
  }
  if (layout.node.state !== "OWNED") {
    const cost = el(documentRoot, "span", "v7-tech-cost");
    const free = layout.node.cost === 0;
    if (free) cost.dataset.free = "true";
    cost.append(
      free ? "Free" : String(layout.node.cost),
      economyIcon(documentRoot, "coin"),
    );
    card.append(cost);
    card.setAttribute(
      "aria-label",
      `${name}, ${free ? "free" : `${layout.node.cost} Coins`}${layout.node.state === "BLOCKED" ? ", locked" : ""}`,
    );
    if (layout.node.state === "DISABLED") {
      card.setAttribute("aria-disabled", "true");
      const reason = unavailable(layout.node.id);
      card.setAttribute(
        "aria-label",
        `${name}, ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`,
      );
    }
  } else {
    card.append(text(documentRoot, "span", "✓", "v7-tech-check"));
    card.setAttribute("aria-label", `${name}, researched`);
  }
  card.onclick = () => choose(layout.node);
  node.append(card);
  if (layout.children.length > 0) {
    const children = el(documentRoot, "div", "v7-tech-children");
    children.style.setProperty("--v7-tech-leaves", String(layout.leafCount));
    if (layout.children.length === 1) children.classList.add("is-unary");
    for (const child of layout.children) {
      const edge = el(documentRoot, "div", "v7-tech-edge");
      edge.style.gridColumn = `span ${child.leafCount}`;
      edge.dataset.parentTech = layout.node.id;
      edge.dataset.childTech = child.node.id;
      appendTechNode(
        documentRoot,
        edge,
        child,
        choose,
        selected,
        chibiArt,
        faction,
        unavailable,
        goal,
      );
      children.append(edge);
    }
    node.append(children);
  }
  parent.append(node);
}
function identity(
  documentRoot: Document,
  assetId: string,
  label: string,
  normalizePaintedSize = false,
  /** Undead or Goblin placeholder badge over Human art; null for none. */
  badge: FactionBadgeV7 = null,
  /** CHIBI art already sized for its box; replaces the legacy asset. */
  chibiImage?: HTMLElement | SVGElement,
  /** "code" for a code-drawn figure (the LEGACY Egg) in the legacy frame. */
  artSet: "chibi" | "code" = "chibi",
): HTMLElement {
  const identity = el(documentRoot, "div", "v7-identity");
  const viewport = el(documentRoot, "span", "v7-identity-art");
  if (chibiImage !== undefined) viewport.dataset.artSet = artSet;
  const image = chibiImage ?? art(documentRoot, assetId, "");
  const layout =
    chibiImage === undefined &&
    (normalizePaintedSize ||
      assetId === "terrain-square-original-fruit" ||
      assetId === "terrain-square-original-animal" ||
      assetId === RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP ||
      assetId === RULESET7_RESOURCE_ART_IDS.FERTILE_GROUND)
      ? selectionIdentityArtworkLayoutV7(assetId)
      : null;
  if (layout !== null) {
    viewport.dataset.frameMode = "visible-alpha";
    image.style.left = `${layout.left}px`;
    image.style.top = `${layout.top}px`;
    image.style.width = `${layout.width}px`;
    image.style.height = `${layout.height}px`;
  }
  viewport.append(image);
  if (badge !== null) {
    viewport.dataset.faction = badge.toLowerCase();
    viewport.append(factionBadgeIcon(documentRoot, badge));
  }
  identity.append(viewport, text(documentRoot, "h2", label));
  return identity;
}
/**
 * Revision 19: the code-drawn Egg of the LEGACY interface (the dock and the
 * unit dialog): a speckled cream egg with a painted band in its owner's
 * colour, in a small dark nest. It matches the board's code-drawn Egg.
 */
function eggFigureV7(
  documentRoot: Document,
  ownerColor: string | undefined,
): SVGSVGElement {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = documentRoot.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 64 74");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "v7-art-frame v7-egg-figure");
  svg.dataset.assetId = "unit-dinosaur-egg-code";
  const shape = (
    tag: "ellipse" | "path" | "circle" | "rect",
    attributes: Readonly<Record<string, string>>,
  ): void => {
    const node = documentRoot.createElementNS(namespace, tag);
    for (const [name, value] of Object.entries(attributes))
      node.setAttribute(name, value);
    svg.append(node);
  };
  const ink = "#1d1a17";
  shape("ellipse", {
    cx: "32",
    cy: "62",
    rx: "27",
    ry: "9",
    fill: "#33363d",
    stroke: ink,
    "stroke-width": "2",
  });
  shape("path", {
    d: "M7 65 23 59M41 59 57 65M16 59 48 65",
    fill: "none",
    stroke: "#efe6c8",
    "stroke-width": "2.4",
    "stroke-linecap": "round",
  });
  shape("ellipse", { cx: "32", cy: "36", rx: "18", ry: "24", fill: "#efe6c8" });
  // The painted owner band: the part of a strip inside the shell.
  shape("path", {
    d: "M14.1 35h35.8a18 24 0 0 1-.7 10H14.8a18 24 0 0 1-.7-10Z",
    fill: ownerColor ?? "#5b616c",
  });
  for (const [cx, cy, r] of [
    ["25", "24", "2.2"],
    ["38", "21", "1.8"],
    ["41", "30", "1.5"],
    ["29", "52", "2"],
    ["40", "51", "1.6"],
  ] as const)
    shape("circle", { cx, cy, r, fill: "#5b616c" });
  shape("ellipse", {
    cx: "32",
    cy: "36",
    rx: "18",
    ry: "24",
    fill: "none",
    stroke: ink,
    "stroke-width": "2.4",
  });
  return svg;
}

function art(
  documentRoot: Document,
  assetId: string,
  alt: string,
): HTMLImageElement {
  const image = documentRoot.createElement("img");
  image.className = "v7-art-frame";
  image.src = ACCEPTED_ART_URLS[assetId] ?? "";
  image.alt = alt;
  image.dataset.assetId = assetId;
  return image;
}
/** The size a launch uses; the draft keeps the player's own choice. */
function effectiveBoardSize(draft: DraftV7): DraftV7["boardSize"] {
  return draft.mapType === "SHOWCASE" ? SHOWCASE_BOARD_SIZE : draft.boardSize;
}
function mapTypeDescriptionV7(mapType: MapTypeV7): string {
  if (mapType === "DRY_LAND") return "All land, no sea.";
  if (mapType === "PANGEA") return "One big continent ringed by sea.";
  if (mapType === "CONTINENTS") return "Two or three large landmasses.";
  if (mapType === "ARCHIPELAGO") return "Everyone starts on their own island.";
  if (mapType === "SHOWCASE")
    return "A fixed demo map: three developed cities, every unit, all technology, map revealed.";
  return "Mostly land, broken up by lakes.";
}
function setupFrom(draft: DraftV7): MatchSetupV7 | null {
  if (!/^\d+$/.test(draft.seedText)) return null;
  const seed = Number(draft.seedText);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
    return null;
  return {
    rulesetId: "pulp-wars-poc-7r44",
    seed,
    width: effectiveBoardSize(draft),
    height: effectiveBoardSize(draft),
    aiCount: draft.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: draft.aiMode,
    // The engine's seat colour is not shown anywhere: every owner colour
    // is the faction's (bead pulp_wars-b5f.4), so the setup offers no
    // choice and sends the first seat colour.
    humanColor: "CORAL",
    factions: Array.from(
      { length: draft.aiCount + 1 },
      (_, seat): FactionIdV7 => draft.factions[seat] ?? "ORIGINAL",
    ),
    mapType: draft.mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    // The Showcase never has curiosities and launches with `false`.
    curiosities: draft.mapType !== "SHOWCASE" && draft.curiosities,
  };
}
export function cityIncomeForViewerV7(
  view: PlayerViewV7,
  cityId: number,
): number | null {
  const city = view.cities.find((entry) => entry.id === cityId);
  if (city === undefined || city.ownerId !== view.viewer.id) return null;
  const besieged = view.units.some(
    (unit) =>
      hostile(view, city.ownerId, unit.ownerId) && same(unit.at, city.at),
  );
  if (besieged) return 0;
  const market =
    view.improvementValues.find(
      (value) =>
        value.improvement === "MARKET" && tileCity(view, value.at) === city.id,
    )?.level ?? 0;
  const before = Math.max(
    1,
    cityLevelIncomeV7(city.level) +
      (city.isCapital ? 1 : 0) +
      Number(view.naval.landTradeCityIds.includes(city.id)) +
      Number(view.naval.seaTradeCityIds.includes(city.id)) +
      market +
      Math.min(0, city.population),
  );
  return before;
}
function trainingCostForViewV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "TRAIN" | "TRAIN_NAVAL" }>,
): number {
  const base = effectiveRoleRuleV7(command.role, view.viewer.faction).cost ?? 0;
  if (command.kind === "TRAIN_NAVAL") {
    const tile = view.board.tiles.find((candidate) =>
      same(candidate.at, command.at),
    );
    const shipyardActive = view.naval.ownedPorts.some(
      (port) => same(port.at, command.at) && port.status === "ACTIVE",
    );
    return Math.max(
      1,
      base -
        (tile?.explored === true &&
        tile.improvement === "SHIPYARD" &&
        shipyardActive
          ? 2
          : 0),
    );
  }
  const forge = view.improvementValues.some((value) => {
    if (value.improvement !== "FORGE" || value.level <= 0) return false;
    const tile = view.board.tiles.find((candidate) =>
      same(candidate.at, value.at),
    );
    return tile?.explored === true && tile.territoryCityId === command.cityId;
  });
  return Math.max(1, base - (forge ? 1 : 0));
}
function incomeDescription(view: PlayerViewV7): string {
  const cities = view.cities.filter((city) => city.ownerId === view.viewer.id);
  // Revision 17: Goblins never earn land trade; their Commerce is Plunder.
  const commerce =
    view.viewer.faction === "GOBLIN"
      ? "Plunder earns Coins for kills"
      : "Commerce earns trade";
  return `Next income ${cities.reduce((sum, city) => sum + (cityIncomeForViewerV7(view, city.id) ?? 0), 0)} from ${cities.length} cities, including capital, land trade, sea trade, Market, population deficit, and siege effects. Connected cities grow with Roads; ${commerce}. City income: Level (max ${CITY_LEVEL_INCOME_CAP_V7}) + capital + trade + Markets.`;
}
function tileCity(view: PlayerViewV7, at: CoordV7): number | null {
  const tile = view.board.tiles.find((entry) => same(entry.at, at));
  return tile?.explored === true ? tile.territoryCityId : null;
}
function effectDescription(
  effect: PublicTechnologyNodeV7["effects"][number],
  faction: FactionIdV7,
): string {
  const label = (roleId: UnitRoleIdV7): string =>
    effectiveRoleRuleV7(roleId, faction).label;
  switch (effect.kind) {
    case "COMMAND":
      return effect.command === "CULTIVATE_FOREST"
        ? "Clear for farming: removes Forest and creates Fertile Ground"
        : // The naval branch (`pulp_wars-5ti.2`; the help sentence of
          // RULESET_7_NAVAL_BRANCH.md section 14.2).
          effect.command === "BOARD"
          ? BOARD_UNLOCK_V7
          : title(effect.command);
    case "RAM":
      return NAVAL_RAM_UNLOCK_V7;
    case "HARBOURS":
      return harboursUnlockTextV7(effect.population);
    // The naval branch engine, the frozen sea (`pulp_wars-5ti.3`): the plain
    // sentences of RULESET_7_NAVAL_BRANCH.md section 8.2, until the naval
    // interface (`pulp_wars-5ti.7`).
    case "FREEZE":
      return effect.depth === "DEEP"
        ? "Freeze: the deep sea freezes too"
        : "Freeze: a unit turns the water next to it to ice, two tiles out in a straight line (the Ice Witch: every tile around her); your units slide across ice";
    case "ICEBOUND":
      return "Icebound: freeze a ship in place; it cannot sail, shoot, or strike back, and the ice crushes it for 3 each turn";
    case "BLACK_ICE":
      return "Black Ice: whoever stands on your ice at the start of your turn is frosted";
    case "GLACIER":
      return `Glacier: your ice lasts ${effect.iceTurns} turns and your units on it have Snow cover`;
    case "UNIT_ROLE":
      return label(effect.role);
    case "RESOURCE_REVEAL":
      return `Reveals ${effect.resources.map(title).join(" and ")}`;
    case "ECONOMIC_FORMULA":
      return economicFormulaV7(effect.improvement, effect.formula);
    case "CONNECTED_FARM_VISUALS":
      return "Neighboring farms join into one field";
    case "FOREST_MOVEMENT_FREEDOM":
      return `${effect.roles.map(label).join(" and ")} move freely through forest`;
    case "MOUNTAIN_MOVEMENT":
      return "Units can climb mountains";
    case "HIGH_GROUND_VISION":
      return "+1 sight on mountains";
    case "ROLE_SIGHT":
      return `${label(effect.role)} sight ${effect.radius}`;
    case "ROAD_MOVEMENT":
      return ROAD_MOVEMENT_TEXT_V7;
    case "OWNED_CITY_CAPACITY_BONUS":
      return `Cities support +${effect.capacity} unit`;
    case "ADJACENT_START_TURN_HEALING":
      return `Windmills heal adjacent units for ${effect.amount} HP at Start Turn`;
    case "ARMS_INDUSTRY_DISCOUNT":
      // Revision 19: the Dinosaur Arms Industry also discounts Eggs.
      return faction === "DINOSAUR"
        ? `Forge discount: ${effect.coins} Coin off trained land units and Eggs`
        : `Forge training discount: ${effect.coins} Coin`;
    case "LAND_TRADE_INCOME":
      return `Road-linked cities: +${effect.coins} Coin`;
    case "LAND_ROAD_POPULATION":
      return `Road-linked cities: +${effect.amount} live population`;
    case "MARKET_INCOME_MULTIPLIER":
      return `Markets earn ${effect.multiplier}× income`;
    case "SEA_TRADE_INCOME":
      return `Sea-linked cities: +${effect.coins} Coin`;
    case "CAPTAIN_SUPPORT":
      // Revision 19: the Dinosaur Rally is War Drums.
      return faction === "DINOSAUR"
        ? "Shamans beat War Drums or Tend nearby troops, and Hatch Eggs"
        : "Captains Rally or Tend nearby troops";
    case "NECROMANCER_SUPPORT":
      return "Necromancers Frenzy nearby troops or Raise Dead";
    case "WAAAGH_SUPPORT":
      return "Orc Warbosses WAAAGH! troops within 2 tiles";
    case "PLUNDER":
      return `+${effect.coins} Coin for each enemy unit your units or blasts kill`;
    case "NESTING":
      // Revision 20: Nesting also adds a unit slot to every city.
      return nestingUnlockTextV7();
    case "WALLBREAKER":
      return WALLBREAKER_UNLOCK_TEXT_V7;
    // The Martian revision (section 4).
    case "BRAIN_SUPPORT":
      return BRAIN_SUPPORT_UNLOCK_TEXT_V7;
    case "FORCE_FIELDS":
      return FORCE_FIELDS_UNLOCK_TEXT_V7;
    case "DISINTEGRATOR":
      return DISINTEGRATOR_UNLOCK_TEXT_V7;
    // The Ice Folk revision (section 4).
    case "WITCH_SUPPORT":
      return WITCH_SUPPORT_UNLOCK_TEXT_V7;
    case "DEEP_WINTER":
      return DEEP_WINTER_UNLOCK_TEXT_V7;
    case "BRITTLE":
      return BRITTLE_UNLOCK_TEXT_V7;
    // The Dwarf revision (section 4).
    case "ENGINEER_SUPPORT":
      return ENGINEER_SUPPORT_UNLOCK_TEXT_V7;
    case "ASSEMBLE":
      return ASSEMBLE_UNLOCK_TEXT_V7;
    case "DIVE":
      return DIVE_UNLOCK_TEXT_V7;
    case "DIG_IN":
      return DIG_IN_UNLOCK_TEXT_V7;
    case "BLASTING_CHARGES":
      return BLASTING_CHARGES_UNLOCK_TEXT_V7;
    // The Candy revision (docs/product/RULESET_7_CANDY.md section 4).
    case "CONFECTIONER_SUPPORT":
      return CONFECTIONER_SUPPORT_UNLOCK_TEXT_V7;
    case "HOME_SWEET_HOME":
      return HOME_SWEET_HOME_UNLOCK_TEXT_V7;
    case "PEPPERMINT_SURPRISE":
      return PEPPERMINT_SURPRISE_UNLOCK_TEXT_V7;
    case "OVERRUN":
      // Revision 17: the Goblin Overrun is Ram; revision 19: the Dinosaur
      // Overrun is Rampage.
      return faction === "GOBLIN"
        ? "Ram: Scrap Buggies advance after a kill and may attack again"
        : faction === "DINOSAUR"
          ? "Rampage: T-Rexes advance after a kill and may attack again"
          : "Knights advance after a kill and may attack again";
    case "CHARGE_BONUS":
      return `${faction === "DINOSAUR" ? "Pounce: " : faction === "MARTIAN" ? `${STRAFE_LABEL_V7}: ` : ""}${label("RAIDER")}s gain +${effect.attack} Attack after moving ${effect.minimumMove}+ cells`;
    case "MELEE_FIELD_DEMOLITION":
      return "Surviving melee attacks destroy Field Defense";
    case "NAVAL_TRAINING_DISCOUNT":
      return `Shipyards discount naval training by ${effect.coins} Coins`;
    case "FIRST_HOSTILE_CAPTURE_SPOILS":
      return `+${effect.coins} Coins for each city you capture`;
  }
}

function navalTechnologyNotesV7(
  technology: PublicTechnologyNodeV7["id"],
  faction: FactionIdV7,
): readonly string[] {
  // "Board" now names the capture of a ship (Seamanship), so putting a
  // unit to sea is "embark".
  if (technology === "SHORECRAFT") return [SHORECRAFT_EMBARK_NOTE_V7];
  if (technology === "NAVIGATION")
    return ["Ships can sail deep water", "Active Ports link sea trade"];
  if (technology === "NAVAL_ENGINEERING")
    return ["Battleship: long-range splash damage"];
  // The naval branch (`pulp_wars-5ti.2`; RULESET_7_NAVAL_BRANCH.md 14.2).
  if (technology === "SUBMERSIBLES") return [SUBMARINE_UNLOCK_NOTE_V7];
  if (technology === "EXPLOSIVES")
    return ["Drill identifies resource-free mountains safe to Blast"];
  if (technology === "ROADS")
    return [
      "Your city centers count as Road tiles",
      "Connected owned cities and the original capital each gain population",
    ];
  // Revision 17: Goblin Commerce (Plunder) earns no trade.
  if (technology === "COMMERCE")
    return faction === "GOBLIN" ? [] : ["Connected cities earn trade"];
  return [];
}

export interface TechnologyEffectGroupV7 {
  readonly id:
    | "UNITS"
    | "ACTIONS"
    | "BUILDINGS"
    | "VISIBILITY"
    | "MOVEMENT_SIGHT"
    | "PASSIVE_EFFECTS";
  readonly label: string;
  readonly items: readonly string[];
}

/** Keeps technology prose grouped directly by the structured unlock union. */
export function technologyEffectGroupsV7(
  effects: PublicTechnologyNodeV7["effects"],
  faction: FactionIdV7,
): readonly TechnologyEffectGroupV7[] {
  const order: readonly TechnologyEffectGroupV7["id"][] = [
    "UNITS",
    "ACTIONS",
    "BUILDINGS",
    "VISIBILITY",
    "MOVEMENT_SIGHT",
    "PASSIVE_EFFECTS",
  ];
  const labels: Readonly<Record<TechnologyEffectGroupV7["id"], string>> = {
    UNITS: "Units",
    ACTIONS: "Actions",
    BUILDINGS: "Buildings",
    VISIBILITY: "Visibility",
    MOVEMENT_SIGHT: "Movement & sight",
    PASSIVE_EFFECTS: "Passive effects",
  };
  const grouped = new Map<TechnologyEffectGroupV7["id"], string[]>();
  for (const effect of effects) {
    const id = technologyEffectGroupIdV7(effect);
    const descriptions =
      effect.kind === "UNIT_ROLE"
        ? technologyRoleDescriptionsV7(effect.role, faction)
        : [effectDescription(effect, faction)];
    grouped.set(id, [...(grouped.get(id) ?? []), ...descriptions]);
  }
  return order.flatMap((id) => {
    const items = grouped.get(id);
    return items === undefined ? [] : [{ id, label: labels[id], items }];
  });
}

function technologyRoleDescriptionsV7(
  roleId: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  const label = effectiveRoleRuleV7(roleId, faction).label;
  // The Martian revision (section 4): "Tripod (heat ray, Pierce)".
  if (faction === "MARTIAN") return [martianRoleUnlockTextV7(roleId)];
  // The Ice Folk revision (section 4): "Ice Witch (Blizzard, Cold Snap)".
  if (faction === "ICE_FOLK") return [iceFolkRoleUnlockTextV7(roleId)];
  // The Dwarf revision (section 4): "Steam Cannon (Knockback)".
  if (faction === "DWARF") return [dwarfRoleUnlockTextV7(roleId)];
  // The Candy revision (section 4): "Confectioner (Frosting, Re-bake)".
  if (faction === "CANDY") return [candyRoleUnlockTextV7(roleId)];
  // Revision 19 (section 4): a Dinosaur egg-laid role is laid, not trained:
  // "Raptor Egg", "Triceratops Egg (Charge!)" (revision 20).
  if (isEggLaidRoleV7(roleId, faction))
    return [
      `${label} Egg${
        effectiveRoleRuleV7(roleId, faction).abilities.includes("LINEBREAKER")
          ? ` (${CHARGE_LABEL_V7})`
          : ""
      }`,
    ];
  return [`Train ${label}`];
}

function technologyEffectGroupIdV7(
  effect: PublicTechnologyNodeV7["effects"][number],
): TechnologyEffectGroupV7["id"] {
  switch (effect.kind) {
    case "UNIT_ROLE":
      return "UNITS";
    // The frozen sea: Freeze is an action of the units.
    case "FREEZE":
      return "ACTIONS";
    case "COMMAND":
      return effect.command.startsWith("BUILD_") &&
        effect.command !== "BUILD_ROAD"
        ? "BUILDINGS"
        : "ACTIONS";
    case "ECONOMIC_FORMULA":
    case "CONNECTED_FARM_VISUALS":
      return "BUILDINGS";
    case "RESOURCE_REVEAL":
      return "VISIBILITY";
    case "FOREST_MOVEMENT_FREEDOM":
    case "MOUNTAIN_MOVEMENT":
    case "HIGH_GROUND_VISION":
    case "ROLE_SIGHT":
    case "ROAD_MOVEMENT":
      return "MOVEMENT_SIGHT";
    case "OWNED_CITY_CAPACITY_BONUS":
    case "ADJACENT_START_TURN_HEALING":
    case "ARMS_INDUSTRY_DISCOUNT":
    case "LAND_TRADE_INCOME":
    case "LAND_ROAD_POPULATION":
    case "MARKET_INCOME_MULTIPLIER":
    case "SEA_TRADE_INCOME":
    case "CAPTAIN_SUPPORT":
    case "NECROMANCER_SUPPORT":
    case "WAAAGH_SUPPORT":
    case "PLUNDER":
    case "NESTING":
    case "WALLBREAKER":
    case "BRAIN_SUPPORT":
    case "FORCE_FIELDS":
    case "DISINTEGRATOR":
    case "WITCH_SUPPORT":
    case "DEEP_WINTER":
    case "BRITTLE":
    case "ENGINEER_SUPPORT":
    case "ASSEMBLE":
    case "DIVE":
    case "DIG_IN":
    case "BLASTING_CHARGES":
    case "CONFECTIONER_SUPPORT":
    case "HOME_SWEET_HOME":
    case "PEPPERMINT_SURPRISE":
    case "RAM":
    case "HARBOURS":
    case "ICEBOUND":
    case "BLACK_ICE":
    case "GLACIER":
    case "OVERRUN":
    case "CHARGE_BONUS":
    case "MELEE_FIELD_DEMOLITION":
    case "NAVAL_TRAINING_DISCOUNT":
    case "FIRST_HOSTILE_CAPTURE_SPOILS":
      return "PASSIVE_EFFECTS";
  }
}

export function monumentSourceForViewerV7(
  view: PlayerViewV7,
  at: CoordV7,
): AchievementIdV7 | null {
  const contribution = view.populationContributions.find(
    (candidate) =>
      candidate.source.kind === "MONUMENT" && same(candidate.source.at, at),
  );
  return contribution?.source.kind === "MONUMENT" &&
    contribution.source.visibility === "FULL"
    ? contribution.source.achievement
    : null;
}
function hostile(view: PlayerViewV7, left: number, right: number): boolean {
  if (left === right) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    left === view.humanPlayerId ||
    right === view.humanPlayerId
  );
}
export function specialBoundaryNoticeV7(
  events: Ruleset7AcceptedBoundary["playerEvents"]["events"],
  viewerId: number,
): string | null {
  const healing = events.filter(
    (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
  );
  if (healing.length > 0)
    return (
      healing
        // No text names a tile or a unit ID (bead pulp_wars-b5f.8).
        .map((event) => {
          const total = event.results.reduce(
            (sum, result) => sum + result.amount,
            0,
          );
          const units = event.results.length;
          return `Windmill healed ${units} ${units === 1 ? "unit" : "units"} +${total} HP`;
        })
        .join(" · ")
    );
  const treasury = events.find(
    (event) =>
      event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED" &&
      event.playerId === viewerId,
  );
  if (treasury?.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED")
    return `Treasury: +${treasury.coins} Coins`;
  const achievement = events.find(
    (event) =>
      event.kind === "ACHIEVEMENT_UNLOCKED" && event.playerId === viewerId,
  );
  return achievement?.kind === "ACHIEVEMENT_UNLOCKED"
    ? `${achievementNameV7(achievement.achievement)} achievement unlocked`
    : null;
}
/**
 * The special notice plus any revision-13 Undead notice. Human-only matches
 * never produce an Undead notice, so their text and toasts are unchanged.
 */
function boundaryNoticeV7(
  events: Ruleset7AcceptedBoundary["playerEvents"]["events"],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string | null; readonly toast: boolean } {
  const special = specialBoundaryNoticeV7(events, after.viewer.id);
  const undead = undeadBoundaryNoticeV7(events, before, after);
  // Revision 17: explosions, Plunder, Troll regeneration and WAAAGH!
  const goblin = goblinBoundaryNoticeV7(events, before, after);
  // Revision 19: Eggs laid, hatched and lost, and growth.
  const dinosaur = dinosaurBoundaryNoticeV7(events, before, after);
  // The Martian revision: recharges, Beam Down, Mind Control, collapses,
  // pulls.
  const martian = martianBoundaryNoticeV7(events, before, after);
  // The Ice Folk revision: Bolas, Cold Snap, Cold Aura, Shatter, Trample.
  const iceFolk = iceFolkBoundaryNoticeV7(events, before, after);
  // The Dwarf revision: a tunnel, an eruption, a bomb, an Assemble, a
  // Repair, a Knockback, Undermined Field Defense.
  const dwarf = dwarfBoundaryNoticeV7(events, before, after);
  // The Candy revision: a Rush, the Crash, a Re-bake, Crumbs eaten or gone
  // stale, a Sugar Toss, a Splat, a Bounce.
  const candy = candyBoundaryNoticeV7(events, before, after);
  // Map curiosities: a Fountain heal, a Shrine claim, a salvaged Wreck, the
  // Spider's death and bounty, and the neutral turn.
  const curiosity = curiosityBoundaryNoticeV7(events, before, after);
  // The naval branch interface: a ship boarded.
  const naval = navalBoundaryNoticeV7(events, before, after);
  const parts = [
    curiosity?.text ?? null,
    naval?.text ?? null,
    undead?.text ?? null,
    goblin?.text ?? null,
    dinosaur?.text ?? null,
    martian?.text ?? null,
    iceFolk?.text ?? null,
    dwarf?.text ?? null,
    candy?.text ?? null,
    special,
  ].filter((part): part is string => part !== null);
  if (
    undead === null &&
    goblin === null &&
    dinosaur === null &&
    martian === null &&
    iceFolk === null &&
    dwarf === null &&
    candy === null &&
    curiosity === null &&
    naval === null
  )
    return { text: special, toast: special !== null };
  return {
    text: parts.join(" · "),
    toast:
      special !== null ||
      undead?.toast === true ||
      goblin?.toast === true ||
      dinosaur?.toast === true ||
      martian?.toast === true ||
      iceFolk?.toast === true ||
      dwarf?.toast === true ||
      candy?.toast === true ||
      curiosity?.toast === true ||
      naval?.toast === true,
  };
}
function techAchievementV7(tech: TechnologyIdV7): AchievementIdV7 | null {
  if (tech === "SCOUTING") return "EXPLORER";
  if (tech === "ENGINEERING") return "ENGINEER";
  if (tech === "DRILL") return "MUSTER";
  return null;
}
function rewardLabel(
  reward: string,
  faction: FactionIdV7,
): readonly [string, string] {
  if (faction === "UNDEAD" && reward === "MILITIA")
    return ["Militia", "A free Skeleton"];
  if (faction === "UNDEAD" && reward === "JUGGERNAUT")
    return ["Abomination", "A giant unit"];
  // Revision 17: Goblin Militia is two Goblins; the giant is a Troll.
  if (faction === "GOBLIN" && reward === "MILITIA")
    return ["Militia", "Two free Goblins"];
  if (faction === "GOBLIN" && reward === "JUGGERNAUT")
    return ["Troll", "A giant unit"];
  // Revision 19: Dinosaur Militia is the registry's Cavemen; the giant is a
  // Brontosaurus, named with its unit slots.
  const dinosaur =
    faction === "DINOSAUR" ? dinosaurRewardLabelV7(reward) : null;
  if (dinosaur !== null) return dinosaur;
  // The Martian revision: Militia is a Grunt; the giant is a Colossus.
  const martian = faction === "MARTIAN" ? martianRewardLabelV7(reward) : null;
  if (martian !== null) return martian;
  // The Ice Folk revision: Militia is a Yeti; the giant is a Frost Giant.
  const iceFolk = faction === "ICE_FOLK" ? iceFolkRewardLabelV7(reward) : null;
  if (iceFolk !== null) return iceFolk;
  // The Dwarf revision: Militia is a Hammerer; the giant is a Brass Titan.
  const dwarf = faction === "DWARF" ? dwarfRewardLabelV7(reward) : null;
  if (dwarf !== null) return dwarf;
  if (reward === "SURVEY") return ["Survey", "Reveal the area"];
  if (reward === "STOCKPILE") return ["Stockpile", "+4 Coins"];
  if (reward === "WALLS") return ["Walls", "Stronger city defense"];
  if (reward === "MILITIA") return ["Militia", "A free Fighter"];
  if (reward === "BOOM") return ["Boom", "+3 population"];
  if (reward === "TREASURY_8") return ["Treasury", "+8 Coins"];
  if (reward === "JUGGERNAUT") return ["Juggernaut", "A giant unit"];
  if (reward === "TREASURY") return ["Treasury", "+12 Coins"];
  return [title(reward), ""];
}

const TECH_BRANCH_LABELS: Readonly<Record<string, string>> = {
  SETTLEMENT: "Settlement",
  WILDS: "Wilds",
  MOBILITY: "Mobility",
  INDUSTRY: "Industry",
  NAVAL: "Naval",
};
const COMMAND_LABELS: Partial<Record<CommandV7["kind"], string>> = {
  HARVEST_FRUIT: "Harvest",
  HUNT_GAME: "Hunt",
  HARVEST_FISH: "Fish",
  GATHER_PEARLS: "Pearls",
  BUILD_FARM: "Farm",
  BUILD_LUMBER_CAMP: "Lumber camp",
  BUILD_MINE: "Mine",
  BUILD_WINDMILL: "Windmill",
  BUILD_SAWMILL: "Sawmill",
  BUILD_FORGE: "Forge",
  BUILD_WORKSHOP: "Workshop",
  BUILD_MARKET: "Market",
  BUILD_PORT: "Port",
  BUILD_SHIPYARD: "Shipyard",
  CLEAR_FOREST: "Clear forest",
  REPLANT_FOREST: "Plant forest",
  CULTIVATE_FOREST: "Clear for farming",
  BLAST_MOUNTAIN: "Blast",
  BUILD_ROAD: "Road",
  REDEVELOP: "Redevelop",
  LAND_GRANT: "Land grant",
  BUILD_FIELD_DEFENSE: "Fortify",
};
/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 15.2): the
 * label of a Candy command button, or null for any other command: the
 * Tend Wounded of a unit of the Candy kind is "Frosting" (Sugar Rush,
 * Re-bake and Sugar Toss are aimed from their own buttons).
 */
function candyCommandLabelV7(
  view: PlayerViewV7 | null,
  command: CommandV7,
): string | null {
  if (view === null || command.kind !== "TEND_WOUNDED") return null;
  const unit = view.units.find((entry) => entry.id === command.unitId);
  return unit === undefined
    ? null
    : candyCommandNameV7(command.kind, presentedUnitFactionV7(view, unit));
}
function commandLabel(command: CommandV7, faction: FactionIdV7): string {
  if (command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL")
    return effectiveRoleRuleV7(command.role, faction).label;
  const undead = undeadCommandLabelV7(command.kind, faction);
  if (undead !== null) return undead;
  const goblin = goblinCommandLabelV7(command.kind, faction);
  if (goblin !== null) return goblin;
  const dinosaur = dinosaurCommandLabelV7(command.kind, faction);
  if (dinosaur !== null) return dinosaur;
  const martian = martianCommandLabelV7(command.kind, faction);
  if (martian !== null) return martian;
  const iceFolk = iceFolkCommandLabelV7(command.kind);
  if (iceFolk !== null) return iceFolk;
  const dwarf = dwarfCommandLabelV7(command.kind, faction);
  if (dwarf !== null) return dwarf;
  const candy = candyCommandNameV7(command.kind, faction);
  if (candy !== null) return candy;
  if (command.kind === "BUILD_MONUMENT") return "Monument";
  // Faction building looks (epic pulp_wars-xdh): an Undead "Graveyard".
  const building = factionBuildCommandV7(command.kind, faction);
  if (building !== null) return building.name;
  return COMMAND_LABELS[command.kind] ?? title(command.kind);
}
function economicPreviewLabelV7(preview: EconomicPreviewV7): string {
  const population = preview.populationDeltaByCity.reduce(
    (total, change) => total + change.delta,
    0,
  );
  const income = preview.coinIncomeDeltaByCity.reduce(
    (total, change) => total + change.delta,
    0,
  );
  const changedPopulationCities = preview.populationDeltaByCity.filter(
    (change) => change.delta !== 0,
  ).length;
  const details = [
    `${preview.cost} Coins`,
    population === 0
      ? null
      : `population ${population > 0 ? "+" : ""}${population}${changedPopulationCities > 1 ? ` across ${changedPopulationCities} cities` : ""}`,
    income === 0 ? null : `income ${income > 0 ? "+" : ""}${income}`,
  ].filter((detail): detail is string => detail !== null);
  return details.join(" · ");
}
function formatValue(value: {
  numerator: number;
  denominator: number;
}): string {
  return value.denominator === 1
    ? String(value.numerator)
    : String(value.numerator / value.denominator);
}
/**
 * The text of one stat modifier in the dock. `pulp_wars-1wy.5`: Snow cover
 * multiplies Defense (x 1.25), so its term is the share it adds, "+25%",
 * never the product's fraction (a Yeti's "+0.375"); every other term is its
 * value, at most two decimals.
 */
export function statModifierTextV7(
  base: { readonly numerator: number; readonly denominator: number },
  modifier: {
    readonly source: string;
    readonly value: {
      readonly numerator: number;
      readonly denominator: number;
    };
  },
): string {
  const value = modifier.value.numerator / modifier.value.denominator;
  if (modifier.source === "SNOW" && base.numerator > 0)
    return `+${Math.round((value * 100 * base.denominator) / base.numerator)}%`;
  return `+${String(Math.round(value * 100) / 100)}`;
}
function same(a: CoordV7, b: CoordV7): boolean {
  return a.x === b.x && a.y === b.y;
}
function title(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function value(root: HTMLElement, id: string): string {
  return (
    root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ??
    ""
  );
}
function el(
  documentRoot: Document,
  tag: string,
  className: string,
): HTMLElement {
  const node = documentRoot.createElement(tag);
  node.className = className;
  return node;
}
function text(
  documentRoot: Document,
  tag: string,
  valueText: string,
  className = "",
): HTMLElement {
  const node = el(documentRoot, tag, className);
  appendEconomyText(documentRoot, node, valueText);
  return node;
}

/**
 * CHIBI economy icons per document: the mounted CHIBI view registers a
 * provider, so the many text helpers that inline a coin or population icon
 * need no art-set parameter. Without a provider (LEGACY) nothing changes.
 */
const CHIBI_ECONOMY_ICONS = new WeakMap<
  Document,
  (
    kind: "coin" | "population",
  ) => { readonly url: string; readonly assetId: string } | null
>();

function economyIcon(
  documentRoot: Document,
  kind: "coin" | "population",
): HTMLImageElement {
  const icon = documentRoot.createElement("img");
  icon.className = "v7-economy-icon";
  const chibi = CHIBI_ECONOMY_ICONS.get(documentRoot)?.(kind);
  if (chibi !== null && chibi !== undefined) {
    icon.src = chibi.url;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.dataset.artSet = "chibi";
    icon.dataset.chibiAssetId = chibi.assetId;
    return icon;
  }
  icon.src =
    ACCEPTED_ART_URLS[
      kind === "coin" ? "ui-hud-gold-coin-v7" : "ui-hud-population"
    ] ?? "";
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  icon.dataset.assetId =
    kind === "coin" ? "ui-hud-gold-coin-v7" : "ui-hud-population";
  return icon;
}

function appendEconomyText(
  documentRoot: Document,
  node: HTMLElement,
  valueText: string,
): void {
  if (!/\d/.test(valueText) || !/(coin|population|income)/i.test(valueText)) {
    node.textContent = valueText;
    return;
  }
  const amounts =
    /([+-]?\d+)\s+(Coins?|(?:permanent |live )?population)\b|\b(Population|population|Income|income)(\s+)([+-]?\d+)\b/g;
  let cursor = 0;
  for (const match of valueText.matchAll(amounts)) {
    const index = match.index ?? 0;
    node.append(valueText.slice(cursor, index));
    const amount = match[1];
    if (amount !== undefined) {
      const unit = match[2] ?? "";
      const token = el(documentRoot, "span", "v7-economy-value");
      token.append(
        amount,
        " ",
        economyIcon(
          documentRoot,
          unit.endsWith("population") ? "population" : "coin",
        ),
      );
      token.append(
        text(
          documentRoot,
          "span",
          unit,
          unit.endsWith("population") ? "" : "v7-sr-only",
        ),
      );
      node.append(token);
    } else {
      node.append(
        match[3] ?? "",
        match[4] ?? "",
        economyIcon(
          documentRoot,
          /income/i.test(match[3] ?? "") ? "coin" : "population",
        ),
        match[5] ?? "",
      );
    }
    cursor = index + match[0].length;
  }
  node.append(valueText.slice(cursor));
}
function button(
  documentRoot: Document,
  label: string,
  action: string,
  className = "",
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  appendEconomyText(documentRoot, node, label);
  node.dataset.action = action;
  node.className = className;
  return node;
}
function live(
  documentRoot: Document,
  id: string,
  content: string,
  priority: "polite" | "assertive",
): HTMLElement {
  const node = text(documentRoot, "p", content, "v7-live");
  node.id = id;
  node.setAttribute("aria-live", priority);
  return node;
}
function select(
  documentRoot: Document,
  labelText: string,
  id: string,
  values: readonly string[],
  selected: string,
  labels: Readonly<Record<string, string>> = {},
): HTMLLabelElement {
  const label = documentRoot.createElement("label");
  label.textContent = labelText;
  const field = documentRoot.createElement("select");
  field.id = id;
  replaceOptions(documentRoot, field, values, selected, labels);
  label.append(field);
  return label;
}
function replaceOptions(
  documentRoot: Document,
  field: HTMLSelectElement,
  values: readonly string[],
  selected: string,
  labels: Readonly<Record<string, string>> = {},
): void {
  field.replaceChildren(
    ...values.map((entry) => {
      const option = documentRoot.createElement("option");
      option.value = entry;
      option.textContent = labels[entry] ?? entry;
      option.selected = entry === selected;
      return option;
    }),
  );
}
function input(
  documentRoot: Document,
  labelText: string,
  id: string,
  initial: string,
): HTMLLabelElement {
  const label = documentRoot.createElement("label");
  label.textContent = labelText;
  const field = documentRoot.createElement("input");
  field.id = id;
  field.inputMode = "numeric";
  field.value = initial;
  label.append(field);
  return label;
}

function iconButton(
  documentRoot: Document,
  icon: UiIconIdV7,
  label: string,
  action: string,
  showLabel = false,
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  node.dataset.action = action;
  node.className = showLabel ? "v7-icon-button has-label" : "v7-icon-button";
  node.append(uiIconV7(documentRoot, icon));
  if (showLabel) node.append(text(documentRoot, "span", label));
  else node.setAttribute("aria-label", label);
  node.title = label;
  return node;
}

/** "Your" for the viewer, otherwise "Player N's". */
function possessiveName(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `${playerName(player.seat)}'s`;
}

function playerName(seat: number): string {
  return `Player ${seat + 1}`;
}

const STAT_ICONS: Readonly<Record<string, UiIconIdV7>> = {
  HP: "hp",
  SHIELD: "shield",
  ATTACK: "attack",
  DEFENSE: "defense",
  MOVE: "move",
  RANGE: "range",
  SIGHT: "sight",
};

function economyChips(
  documentRoot: Document,
  values: {
    readonly cost?: number;
    readonly population?: number;
    readonly income?: number;
  },
): HTMLElement {
  const chips = el(documentRoot, "span", "v7-command-economy");
  const chip = (
    kind: "coin" | "population",
    value: string,
    className: string,
  ): void => {
    const node = el(documentRoot, "span", `v7-economy-chip ${className}`);
    node.append(value, economyIcon(documentRoot, kind));
    chips.append(node);
  };
  if (values.cost !== undefined)
    chip("coin", values.cost === 0 ? "Free" : String(values.cost), "is-cost");
  if (values.population !== undefined && values.population !== 0)
    chip(
      "population",
      `${values.population > 0 ? "+" : ""}${values.population}`,
      values.population > 0 ? "is-gain" : "is-loss",
    );
  if (values.income !== undefined && values.income !== 0)
    chip(
      "coin",
      `${values.income > 0 ? "+" : ""}${values.income}/t`,
      values.income > 0 ? "is-gain" : "is-loss",
    );
  return chips;
}

function populationMeter(
  documentRoot: Document,
  population: number,
  slots: number,
): HTMLElement {
  const meter = el(documentRoot, "span", "v7-population-meter");
  meter.setAttribute("aria-hidden", "true");
  for (let index = 0; index < Math.max(1, slots); index += 1) {
    const pip = el(documentRoot, "span", "v7-population-pip");
    if (population > 0 && index < population) pip.dataset.state = "filled";
    else if (population < 0 && index < -population)
      pip.dataset.state = "deficit";
    meter.append(pip);
  }
  return meter;
}

/**
 * True in a match with an Undead or Goblin seat, where the leaderboard and
 * turn status name each player's faction.
 */
function matchHasFactionsV7(view: PlayerViewV7): boolean {
  return (
    matchHasUndeadV7(view) ||
    matchHasGoblinV7(view) ||
    matchHasDinosaurV7(view) ||
    matchHasMartianV7(view) ||
    matchHasIceFolkSeatV7(view) ||
    matchHasDwarfSeatV7(view)
  );
}

/**
 * Leaderboard, banner and turn names; faction appears only in matches with
 * an Undead or Goblin seat.
 */
function playerTitle(view: PlayerViewV7, seat: number): string {
  const player = view.players.find((candidate) => candidate.seat === seat);
  return matchHasFactionsV7(view) && player !== undefined
    ? `${playerName(seat)} (${factionNameV7(player.faction)})`
    : playerName(seat);
}

/**
 * Undead viewer Help. pulp_wars-0ao.16: the Plague and bite tips name a
 * Captain's cure only when a seat can Tend (Human); with a Goblin seat too it
 * is a Human Captain, and with no Human seat nobody can cure them.
 */
function undeadHelpTipsV7(view: PlayerViewV7): readonly string[] {
  const captain = cureCaptainPhraseV7(view);
  const curable = captain !== null;
  return [
    "Units that fall in battle on land leave Graves.",
    "A Necromancer raises Skeletons from adjacent Graves; a Ghoul devours the Grave it stands on to heal.",
    "A Banshee can't attack; it Wails at every visible living enemy within 2 tiles.",
    "Zombie kills rise as your Zombies, Vampires heal from damage they deal, and Lich shots splash.",
    "Restless: your units recover only inside your territory.",
    `A Lich's shots plague living units for 3 turns: −2 HP each turn, spreading to neighbours on the first. ${
      curable
        ? `It ends sooner if the Lich dies or ${captain} tends them.`
        : "It ends sooner only if the Lich dies."
    }`,
    `Zombies bite living land units; a bitten unit that dies rises as the biter's Zombie${
      curable ? ` unless ${captain} tends it first.` : "."
    }`,
    "Enemies can't strike back at a Vampire's attack.",
  ];
}

/** Revision 14 Tend Wounded text, shown in Undead matches only. */
const TEND_CURES_DESCRIPTION =
  "Heals nearby wounded troops by 2 and cures their Plague and bites.";

const FACTION_COMMAND_ICONS: Partial<Record<CommandV7["kind"], UiIconIdV7>> = {
  RAISE_DEAD: "grave",
  DEVOUR: "devour",
  WAIL: "wail",
  // Revision 17: a round bomb with a lit fuse (GOBLIN.md Kaboom icon).
  KABOOM: "bomb",
  // Revision 19: LEGACY glyphs (CHIBI draws the PixelLab action icons).
  HATCH: "hatch",
  // The Martian revision: LEGACY glyphs of the three Martian abilities.
  BEAM_DOWN: "beam-down",
  MIND_CONTROL: "mind-control",
  TRACTOR_BEAM: "tractor-beam",
  // The Ice Folk revision: LEGACY glyphs of Bolas and Cold Snap.
  THROW_BOLAS: "bolas",
  COLD_SNAP: "snowflake",
  // The Dwarf revision: LEGACY glyphs of Tunnel, Bomb Run and Assemble.
  TUNNEL: "drill",
  BOMB_RUN: "bomb-run",
  ASSEMBLE: "key",
};

function undeadCommandPreview(
  view: PlayerViewV7,
  kind: "WAIL" | "RAISE_DEAD" | "DEVOUR",
  unitId: UnitId,
): { readonly chip: string; readonly description: string } | null {
  if (kind === "WAIL") {
    const preview = previewWailV7(view, unitId);
    if (preview === null) return null;
    const kills = preview.targets.filter((target) => target.dies).length;
    return {
      chip: `${preview.targets.length} hit${kills > 0 ? ` · ${kills} ✕` : ""}`,
      description: wailPreviewDescriptionV7(view, preview),
    };
  }
  if (kind === "RAISE_DEAD") {
    const preview = previewRaiseDeadV7(view, unitId);
    return preview === null
      ? null
      : {
          chip: `+${preview.graves.length}`,
          description: raiseDeadPreviewDescriptionV7(preview),
        };
  }
  const preview = previewDevourV7(view, unitId);
  return preview === null
    ? null
    : {
        chip: `+${preview.amount} HP`,
        description: devourPreviewDescriptionV7(preview),
      };
}

/**
 * Wraps Human placeholder art with the Undead (spec 10.2) or Goblin (revision
 * 17 section 11.4) faction badge; null keeps the art unwrapped.
 */
function factionBadgeArt<Image extends HTMLElement | SVGElement>(
  documentRoot: Document,
  image: Image,
  badge: FactionBadgeV7,
): Image | HTMLElement {
  if (badge === null) return image;
  const frame = el(documentRoot, "span", "v7-undead-art");
  frame.dataset.faction = badge.toLowerCase();
  frame.append(image, factionBadgeIcon(documentRoot, badge));
  return frame;
}

/**
 * The Undead skull, Goblin head, Dinosaur footprint, Martian saucer, Ice
 * Folk peak or Dwarf cog badge.
 */
function factionBadgeIcon(
  documentRoot: Document,
  badge: "UNDEAD" | "GOBLIN" | "DINOSAUR" | "MARTIAN" | "ICE_FOLK" | "DWARF",
): SVGSVGElement {
  if (badge === "UNDEAD")
    return uiIconV7(documentRoot, "skull", "v7-undead-badge");
  if (badge === "DWARF")
    return uiIconV7(documentRoot, "gear", "v7-undead-badge v7-dwarf-badge");
  if (badge === "ICE_FOLK")
    return uiIconV7(
      documentRoot,
      "ice-peak",
      "v7-undead-badge v7-ice-folk-badge",
    );
  if (badge === "MARTIAN")
    return uiIconV7(
      documentRoot,
      "martian",
      "v7-undead-badge v7-martian-badge",
    );
  if (badge === "DINOSAUR")
    return uiIconV7(
      documentRoot,
      "dinosaur",
      "v7-undead-badge v7-dinosaur-badge",
    );
  return uiIconV7(documentRoot, "goblin", "v7-undead-badge v7-goblin-badge");
}
