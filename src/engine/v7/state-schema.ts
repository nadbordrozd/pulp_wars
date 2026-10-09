import { canonicalHash, canonicalJson } from "../replay/canonical";
import type { PlayerId, UnitId } from "../model/ids";
import {
  BARRICADE_CAP_V7,
  BARRICADE_HP_V7,
  FORCE_FIELD_SHIELD_V7,
  GLACIER_ICE_TURNS_V7,
  GINGERBREAD_MAN_VARIANT_V7,
  GROWTH_HP_V7,
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_LIMIT_V7,
  PROMOTION_HP_V7,
  PROMOTION_KILLS_V7,
  NEUTRAL_ROLE_RULES_V7,
  BOOM_POPULATION_V7,
  MONUMENT_POPULATION_V7,
  cityRewardCandidatesV7,
  cityRewardRecordMatchesLevelV7,
  dockPopulationV7,
  effectiveRoleRuleV7,
  eggMaxHpOptionsV7,
  factionTreeIdV7,
  gravesEnabledV7,
  growthStageForKillsV7,
  roleMechanicsV7,
  type RoleMechanicsV7,
} from "../rules/ruleset-v7";
import { ACHIEVEMENT_REQUIRED_TECH_V7 } from "./achievements";
import { isEggActivationV7 } from "./eggs";
import {
  ACHIEVEMENT_IDS_V7,
  BIOME_IDS_V7,
  CURIOSITY_KINDS_V7,
  FACTION_IDS_V7,
  NEUTRAL_BREEDS_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  REWARD_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  TERRAIN_IDS_V7,
  UNIT_ROLE_IDS_V7,
  NEUTRAL_OWNER_ID_V7,
  isNavalRoleV7,
  isNeutralOwnerV7,
  type MonsterStateV7,
  type NeutralBreedV7,
  isAfloatFormV7,
  type BoardStateV7,
  type AchievementEntitlementV7,
  type AchievementIdV7,
  type BarricadeV7,
  type BittenStatusV7,
  type BurrowedEntryV7,
  type ChillStatusV7,
  type CityRewardRecordV7,
  type CityStateV7,
  type CoolingStatusV7,
  type CoordV7,
  type CrumbsV7,
  type CuriosityKindV7,
  type CuriosityV7,
  type SugarRushStatusV7,
  type EggStatusV7,
  type FactionIdV7,
  type GameStateV7,
  type GiantsStateV7,
  type IceTileV7,
  type ImprovementIdV7,
  type MatchOutcomeV7,
  type MatchSetupV7,
  type MindControlCooldownV7,
  type NinthUnitStateV7,
  type PendingChoiceV7,
  type PlagueStatusV7,
  type PlayerStateV7,
  type PopulationContributionSourceV7,
  type PopulationContributionV7,
  type RandomStateV7,
  type ResourceIdV7,
  type RewardIdV7,
  type ScoreLedgerEntryV7,
  type ShieldStatusV7,
  type TechnologyIdV7,
  type MindControlledStatusV7,
  type TileStateV7,
  type UnitActivationV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { PLAYER_COLORS_V7 } from "./types";
import { PLAGUE_DURATION_TURNS_V7 } from "./afflictions";
import {
  BIGFOOT_MINIMUM_WIDTH_V7,
  CURIOSITY_CENTER_DISTANCE_V7,
  GATES_MINIMUM_WIDTH_V7,
  MONSTER_HOME_RADIUS_V7,
  MONSTER_MINIMUM_WIDTH_V7,
  bigfootHabitatV7,
  curiosityTerrainLegalV7,
  curiosityTilesV7,
  guardCampKindV7,
  isGuardBreedV7,
  setupHasCuriositiesV7,
} from "./curiosities";
import { parseMatchSetupV7 } from "./setup";
import { legacyScoreLedgerV7, scoreLedgerShapeValidV7 } from "./score";
import { spatialContributionAtV7 } from "./spatial-economy";
import {
  cooperativeAlliesV7,
  harbourPopulationForV7,
  rewardCandidatesForLevelV7,
  roadPopulationForCityV7,
} from "./economy";
import {
  compareCoordsV7,
  hasExactKeysV7,
  isDenseArrayV7,
  isNonNegativeSafeIntegerV7,
  isPositiveSafeIntegerV7,
  isSafeIntegerV7,
  isUint32V7,
  parseCityIdV7,
  parseCoordV7,
  parseOrderedStringsV7,
  parsePlayerIdV7,
  parseStrictlyAscendingIdsV7,
  parseUnitIdV7,
  sameCoordV7,
} from "./schema";

const STATE_KEYS = [
  "activeSeatIndex",
  "barricades",
  "beamedThisTurn",
  "berserkThisTurn",
  "bitten",
  "board",
  "bombedThisTurn",
  "burrowed",
  "chilled",
  "cities",
  "commandIndex",
  "cooling",
  "crumbs",
  "curiosities",
  "eggs",
  "giants",
  "graves",
  "humanPlayerId",
  "huntedThisTurn",
  "ice",
  "mindControlCooldowns",
  "monsters",
  "nextEntityId",
  "ninthUnit",
  "outcome",
  "pendingChoices",
  "plagued",
  "players",
  "populationContributions",
  "random",
  "round",
  "rulesetId",
  "schemaVersion",
  // Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section 3.3).
  "scoreLedger",
  "setup",
  "shields",
  "splattedThisTurn",
  "sugarRush",
  "surfacedThisTurn",
  "mindControlled",
  "tossedThisTurn",
  "tractorUsedThisTurn",
  "treasureChests",
  "turnOrder",
  "units",
] as const;
/**
 * Score and modes (section 3.3): a state stored before the score has no
 * `scoreLedger`; it loads with the legacy ledger (`legacyScoreLedgerV7`).
 */
const STATE_KEYS_WITHOUT_LEDGER = STATE_KEYS.filter(
  (key) => key !== "scoreLedger",
);

const PREREQUISITE: Readonly<Partial<Record<TechnologyIdV7, TechnologyIdV7>>> =
  {
    FARMING: "GATHERING",
    MILLING: "FARMING",
    ADMINISTRATION: "GATHERING",
    PLANNING: "ADMINISTRATION",
    FORESTRY: "HUNTING",
    SAWMILLING: "FORESTRY",
    MARKSMANSHIP: "HUNTING",
    FIELDCRAFT: "MARKSMANSHIP",
    ROADS: "SCOUTING",
    COMMERCE: "ROADS",
    RAIDING: "SCOUTING",
    CHIVALRY: "RAIDING",
    ENGINEERING: "DRILL",
    METALLURGY: "ENGINEERING",
    FORTIFICATION: "DRILL",
    EXPLOSIVES: "FORTIFICATION",
    NAVIGATION: "SHORECRAFT",
    NAVAL_ENGINEERING: "NAVIGATION",
    // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 2).
    SEAMANSHIP: "SHORECRAFT",
    SUBMERSIBLES: "SEAMANSHIP",
  };

export function parseGameStateV7(input: unknown): GameStateV7 | null {
  const storedLedger =
    typeof input === "object" &&
    input !== null &&
    Object.prototype.hasOwnProperty.call(input, "scoreLedger");
  if (
    !hasExactKeysV7(
      input,
      storedLedger ? STATE_KEYS : STATE_KEYS_WITHOUT_LEDGER,
    ) ||
    input.schemaVersion !== 7 ||
    input.rulesetId !== RULESET_7_ID
  )
    return null;
  const setup = parseMatchSetupV7(input.setup);
  const random = parseRandom(input.random);
  const humanPlayerId = parsePlayerIdV7(input.humanPlayerId);
  const board = setup === null ? null : parseBoard(input.board, setup.width);
  const players =
    setup === null ? null : parsePlayers(input.players, setup.factions);
  const cities = parseCities(input.cities);
  const contributions = parseContributions(input.populationContributions);
  // The Mind Control revision (section 2.1): a unit's role rule resolves
  // through its kind, so the controlled list is read first.
  const mindControlled = parseMindControlled(input.mindControlled);
  // Map curiosities (section 6): a Shrine promotes without the kills.
  const shrinePromotions = setup !== null && setupHasCuriositiesV7(setup);
  // Map curiosities (section 10.2): the Monsters, read before the units so
  // that exactly the listed units may have the neutral owner.
  const monsters = setup === null ? null : parseMonsters(input.monsters, setup);
  const units =
    players === null || mindControlled === null || monsters === null
      ? null
      : parseUnits(
          input.units,
          players,
          mindControlled,
          shrinePromotions,
          new Map(monsters.map((entry) => [entry.unitId, entry.breed])),
        );
  const treasureChests = parseSortedCoords(input.treasureChests);
  const curiosities =
    setup === null || board === null || treasureChests === null
      ? null
      : parseCuriosities(input.curiosities, setup, board, treasureChests);
  // The frozen sea (naval branch section 8.3): the ice tiles.
  const ice = parseIce(input.ice);
  const graves = parseSortedCoords(input.graves);
  const plagued = parsePlagued(input.plagued);
  const bitten = parseBitten(input.bitten);
  const eggs = parseEggs(input.eggs);
  const shields = parseShields(input.shields);
  const cooling = parseCooling(input.cooling);
  const mindControlCooldowns = parseMindControlCooldowns(
    input.mindControlCooldowns,
  );
  const chilled = parseChilled(input.chilled);
  // The Dwarf revision (section 5.2): the burrowed units and the two
  // per-turn lists; the cross references are checked below.
  const burrowed =
    players === null || mindControlled === null
      ? null
      : parseBurrowed(
          input.burrowed,
          players,
          mindControlled,
          shrinePromotions,
        );
  const surfacedThisTurn = parseSortedUnitIds(input.surfacedThisTurn);
  const bombedThisTurn = parseSortedUnitIds(input.bombedThisTurn);
  // The Martian balance revision (`pulp_wars-1wy.3`): the per-turn lists of
  // beamed passengers and used free Tractor Beams.
  const beamedThisTurn = parseSortedUnitIds(input.beamedThisTurn);
  const tractorUsedThisTurn = parseSortedUnitIds(input.tractorUsedThisTurn);
  // The Candy revision (docs/product/RULESET_7_CANDY.md section 13): the
  // four Candy lists; the cross references are checked below.
  const sugarRush = parseSugarRush(input.sugarRush);
  const crumbs = parseCrumbs(input.crumbs);
  const splattedThisTurn = parseSortedUnitIds(input.splattedThisTurn);
  const tossedThisTurn = parseSortedUnitIds(input.tossedThisTurn);
  // The Dinosaur pass, correction: the units hunted this turn (Pack Hunt).
  const huntedThisTurn = parseSortedUnitIds(input.huntedThisTurn);
  // Goblin explosions and Berserk (`pulp_wars-w49.35`): the Berserk units.
  const berserkThisTurn = parseSortedUnitIds(input.berserkThisTurn);
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the stored state of the new
  // units' mechanics; the cross references are checked below.
  const ninthUnit = parseNinthUnit(input.ninthUnit);
  // Dwarf crowd control (`pulp_wars-w49.33`): the Barricades; the cross
  // references are checked below.
  const barricades = parseBarricades(input.barricades);
  // The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.2):
  // the held victims, parsed like units; the cross references below.
  const giants =
    players === null || mindControlled === null
      ? null
      : parseGiants(input.giants, players, mindControlled, shrinePromotions);
  // Score and modes (section 3.3): the score ledger; checked below.
  const storedScoreLedger = storedLedger
    ? parseScoreLedger(input.scoreLedger)
    : undefined;
  const choices = parseChoices(input.pendingChoices);
  const outcome = parseOutcome(input.outcome);
  const turnOrder = parsePlayerIdSequence(input.turnOrder);
  if (
    setup === null ||
    random === null ||
    humanPlayerId === null ||
    board === null ||
    players === null ||
    cities === null ||
    contributions === null ||
    units === null ||
    treasureChests === null ||
    curiosities === null ||
    ice === null ||
    monsters === null ||
    graves === null ||
    plagued === null ||
    bitten === null ||
    eggs === null ||
    shields === null ||
    cooling === null ||
    mindControlled === null ||
    mindControlCooldowns === null ||
    chilled === null ||
    burrowed === null ||
    surfacedThisTurn === null ||
    bombedThisTurn === null ||
    beamedThisTurn === null ||
    tractorUsedThisTurn === null ||
    sugarRush === null ||
    crumbs === null ||
    splattedThisTurn === null ||
    tossedThisTurn === null ||
    huntedThisTurn === null ||
    berserkThisTurn === null ||
    ninthUnit === null ||
    barricades === null ||
    giants === null ||
    storedScoreLedger === null ||
    choices === null ||
    outcome === undefined ||
    turnOrder === null ||
    !isPositiveSafeIntegerV7(input.nextEntityId) ||
    !isNonNegativeSafeIntegerV7(input.commandIndex) ||
    !isPositiveSafeIntegerV7(input.round) ||
    !isNonNegativeSafeIntegerV7(input.activeSeatIndex) ||
    input.activeSeatIndex >= turnOrder.length
  )
    return null;
  const scoreLedger =
    storedScoreLedger ??
    legacyScoreLedgerV7({
      players,
      cities,
      board,
      units,
      burrowed,
      mindControlled,
    });
  if (
    canonicalJson(setup) !== canonicalJson(input.setup) ||
    !scoreLedgerShapeValidV7(scoreLedger, players) ||
    players[0]?.controller !== "HUMAN" ||
    players[0]?.id !== humanPlayerId ||
    players[0]?.color !== setup.humanColor ||
    players.slice(1).some((player) => player.controller !== "AI") ||
    !sameSet(
      turnOrder,
      players.map((player) => player.id),
    ) ||
    !validateCrossReferences({
      board,
      players,
      cities,
      contributions,
      units,
      treasureChests,
      monsters,
      graves,
      plagued,
      bitten,
      eggs,
      shields,
      cooling,
      mindControlled,
      mindControlCooldowns,
      chilled,
      burrowed,
      surfacedThisTurn,
      bombedThisTurn,
      beamedThisTurn,
      tractorUsedThisTurn,
      sugarRush,
      crumbs,
      splattedThisTurn,
      tossedThisTurn,
      huntedThisTurn,
      berserkThisTurn,
      ninthUnit,
      barricades,
      giants,
      curiosities,
      ice,
      choices,
      outcome,
      humanPlayerId,
      activePlayerId: turnOrder[input.activeSeatIndex] as PlayerId,
      nextEntityId: input.nextEntityId,
      round: input.round,
      setup,
    })
  )
    return null;
  return {
    schemaVersion: 7,
    rulesetId: RULESET_7_ID,
    setup,
    random,
    humanPlayerId,
    nextEntityId: input.nextEntityId,
    commandIndex: input.commandIndex,
    round: input.round,
    activeSeatIndex: input.activeSeatIndex,
    turnOrder,
    board,
    players,
    cities,
    populationContributions: contributions,
    units,
    treasureChests,
    curiosities,
    ice,
    monsters,
    graves,
    plagued,
    bitten,
    eggs,
    shields,
    cooling,
    mindControlled,
    mindControlCooldowns,
    chilled,
    burrowed,
    surfacedThisTurn,
    bombedThisTurn,
    beamedThisTurn,
    tractorUsedThisTurn,
    sugarRush,
    crumbs,
    splattedThisTurn,
    tossedThisTurn,
    huntedThisTurn,
    berserkThisTurn,
    ninthUnit,
    barricades,
    giants,
    scoreLedger,
    pendingChoices: choices,
    outcome,
  };
}

export function canonicalGameStateJsonV7(input: unknown): string {
  const state = parseGameStateV7(input);
  if (state === null) throw new TypeError("Invalid ruleset-7 game state");
  return canonicalJson(state);
}

export function canonicalGameStateHashV7(input: unknown): string {
  const state = parseGameStateV7(input);
  if (state === null) throw new TypeError("Invalid ruleset-7 game state");
  return canonicalHash(state);
}

function parseRandom(input: unknown): RandomStateV7 | null {
  return hasExactKeysV7(input, ["algorithm", "version", "state"]) &&
    input.algorithm === "MULBERRY32" &&
    input.version === 1 &&
    isUint32V7(input.state)
    ? { algorithm: "MULBERRY32", version: 1, state: input.state }
    : null;
}

function parseBoard(
  input: unknown,
  size: BoardStateV7["width"],
): BoardStateV7 | null {
  if (
    !hasExactKeysV7(input, ["width", "height", "tiles"]) ||
    input.width !== size ||
    input.height !== size ||
    !isDenseArrayV7(input.tiles) ||
    input.tiles.length !== size * size
  )
    return null;
  const tiles: TileStateV7[] = [];
  for (let index = 0; index < input.tiles.length; index += 1) {
    const tile = parseTile(input.tiles[index]);
    if (
      tile === null ||
      tile.at.x !== index % size ||
      tile.at.y !== Math.floor(index / size)
    )
      return null;
    tiles.push(tile);
  }
  return { width: size, height: size, tiles };
}

function parseTile(input: unknown): TileStateV7 | null {
  if (
    !hasExactKeysV7(input, [
      "at",
      "biome",
      "improvement",
      "fieldDefense",
      "resource",
      "road",
      "site",
      "terrain",
      "territoryCityId",
    ]) ||
    !(
      input.biome === null ||
      BIOME_IDS_V7.includes(input.biome as Exclude<TileStateV7["biome"], null>)
    ) ||
    !TERRAIN_IDS_V7.includes(input.terrain as TileStateV7["terrain"]) ||
    (input.resource !== null &&
      !RESOURCE_IDS_V7.includes(input.resource as ResourceIdV7)) ||
    (input.improvement !== null &&
      !IMPROVEMENT_IDS_V7.includes(input.improvement as ImprovementIdV7)) ||
    typeof input.road !== "boolean" ||
    typeof input.fieldDefense !== "boolean" ||
    (input.site !== null &&
      input.site !== "CAPITAL" &&
      input.site !== "VILLAGE" &&
      input.site !== "CITY")
  )
    return null;
  const at = parseCoordV7(input.at);
  const territory =
    input.territoryCityId === null
      ? null
      : parseCityIdV7(input.territoryCityId);
  if (at === null || (input.territoryCityId !== null && territory === null))
    return null;
  const terrain = input.terrain as TileStateV7["terrain"];
  const resource = input.resource as TileStateV7["resource"];
  const improvement = input.improvement as TileStateV7["improvement"];
  if (
    !resourceUnderImprovementAllowed(resource, improvement) ||
    (terrain === "SHALLOW_WATER" || terrain === "DEEP_WATER") !==
      (input.biome === null) ||
    !resourceMatchesTerrain(resource, terrain) ||
    !basicImprovementMatchesTerrain(improvement, terrain) ||
    (input.biome === null &&
      (input.road ||
        input.fieldDefense ||
        input.site !== null ||
        (improvement !== null &&
          improvement !== "PORT" &&
          improvement !== "SHIPYARD"))) ||
    (input.site !== null &&
      (terrain !== "GRASS" ||
        resource !== null ||
        improvement !== null ||
        input.road)) ||
    // The Rift (RULESET_7_RIFT.md section 3): land with nothing on it.
    (terrain === "RIFT" &&
      (resource !== null ||
        improvement !== null ||
        input.road ||
        input.fieldDefense ||
        input.site !== null))
  )
    return null;
  return {
    at,
    biome: input.biome as TileStateV7["biome"],
    terrain,
    resource,
    improvement,
    road: input.road,
    fieldDefense: input.fieldDefense,
    site: input.site as TileStateV7["site"],
    territoryCityId: territory,
  };
}

function parsePlayers(
  input: unknown,
  factions: readonly FactionIdV7[],
): readonly PlayerStateV7[] | null {
  if (!isDenseArrayV7(input) || input.length !== factions.length) return null;
  const players: PlayerStateV7[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const player = parsePlayer(input[index]);
    if (
      player === null ||
      player.seat !== index ||
      player.faction !== factions[index] ||
      (players.at(-1)?.id ?? 0) >= player.id
    )
      return null;
    players.push(player);
  }
  return players;
}

function parsePlayer(input: unknown): PlayerStateV7 | null {
  if (
    !hasExactKeysV7(input, [
      "coins",
      "color",
      "controller",
      "achievementEntitlements",
      "explored",
      "faction",
      "factionTreeId",
      "id",
      "originalCapitalCityId",
      "researchedTechs",
      "seat",
      "spoilsClaimedCityIds",
      "status",
    ]) ||
    !isNonNegativeSafeIntegerV7(input.seat) ||
    (input.controller !== "HUMAN" && input.controller !== "AI") ||
    !isColor(input.color) ||
    !FACTION_IDS_V7.includes(input.faction as FactionIdV7) ||
    input.factionTreeId !== factionTreeIdV7(input.faction as FactionIdV7) ||
    (input.status !== "ACTIVE" && input.status !== "ELIMINATED") ||
    !isNonNegativeSafeIntegerV7(input.coins)
  )
    return null;
  const id = parsePlayerIdV7(input.id);
  const originalCapitalCityId = parseCityIdV7(input.originalCapitalCityId);
  const researched = parseOrderedStringsV7(
    input.researchedTechs,
    TECHNOLOGY_IDS_V7,
  );
  const explored = parseSortedCoords(input.explored);
  const spoils = parseStrictlyAscendingIdsV7(
    input.spoilsClaimedCityIds,
    parseCityIdV7,
  );
  const achievementEntitlements = parseAchievementEntitlements(
    input.achievementEntitlements,
  );
  if (
    id === null ||
    originalCapitalCityId === null ||
    researched === null ||
    explored === null ||
    spoils === null ||
    achievementEntitlements === null ||
    achievementEntitlements.some((entitlement) => {
      // Revision 21: an achievement without an enabling technology (`null`)
      // may be unlocked whatever is researched.
      const required = ACHIEVEMENT_REQUIRED_TECH_V7[entitlement.achievement];
      return (
        entitlement.unlocked &&
        required !== null &&
        !researched.includes(required)
      );
    }) ||
    researched.some((tech) => {
      const required = PREREQUISITE[tech];
      return required !== undefined && !researched.includes(required);
    })
  )
    return null;
  return {
    id,
    seat: input.seat,
    controller: input.controller,
    color: input.color,
    faction: input.faction as FactionIdV7,
    factionTreeId: factionTreeIdV7(input.faction as FactionIdV7),
    status: input.status,
    coins: input.coins,
    researchedTechs: researched,
    explored,
    spoilsClaimedCityIds: spoils,
    achievementEntitlements,
    originalCapitalCityId,
  };
}

function parseAchievementEntitlements(
  input: unknown,
): readonly AchievementEntitlementV7[] | null {
  if (!isDenseArrayV7(input) || input.length !== ACHIEVEMENT_IDS_V7.length)
    return null;
  const values: AchievementEntitlementV7[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const candidate = input[index];
    if (
      !hasExactKeysV7(candidate, ["achievement", "spent", "unlocked"]) ||
      candidate.achievement !== ACHIEVEMENT_IDS_V7[index] ||
      typeof candidate.unlocked !== "boolean" ||
      typeof candidate.spent !== "boolean" ||
      (candidate.spent && !candidate.unlocked)
    )
      return null;
    values.push({
      achievement: candidate.achievement as AchievementIdV7,
      unlocked: candidate.unlocked,
      spent: candidate.spent,
    });
  }
  return values;
}

function parseCities(input: unknown): readonly CityStateV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const cities: CityStateV7[] = [];
  for (const candidate of input) {
    const city = parseCity(candidate);
    if (city === null || (cities.at(-1)?.id ?? 0) >= city.id) return null;
    cities.push(city);
  }
  return cities;
}

function parseCity(input: unknown): CityStateV7 | null {
  // The giants' signatures (RULESET_7_GIANTS.md section 6.7): `wallsRazed`
  // is present only as `true`, and only in a city that took the Walls.
  const razed =
    typeof input === "object" &&
    input !== null &&
    Object.hasOwn(input, "wallsRazed");
  if (
    !hasExactKeysV7(input, [
      "at",
      "cityActionAvailable",
      "economicPopulation",
      "expanded",
      "landGrantUsed",
      "id",
      "isCapital",
      "level",
      "ownerId",
      "permanentPopulation",
      "population",
      "rewards",
      ...(razed ? ["wallsRazed"] : []),
    ]) ||
    (razed && input.wallsRazed !== true) ||
    !isPositiveSafeIntegerV7(input.level) ||
    !isNonNegativeSafeIntegerV7(input.permanentPopulation) ||
    !isNonNegativeSafeIntegerV7(input.economicPopulation) ||
    !isSafeIntegerV7(input.population) ||
    typeof input.isCapital !== "boolean" ||
    typeof input.expanded !== "boolean" ||
    typeof input.landGrantUsed !== "boolean" ||
    typeof input.cityActionAvailable !== "boolean"
  )
    return null;
  const id = parseCityIdV7(input.id);
  const owner = parsePlayerIdV7(input.ownerId);
  const at = parseCoordV7(input.at);
  const rewards = parseRewards(input.rewards);
  const spent = growthSpent(input.level);
  if (
    id === null ||
    owner === null ||
    at === null ||
    rewards === null ||
    spent === null ||
    (razed && !rewards.some((record) => record.reward === "WALLS")) ||
    input.population !==
      input.permanentPopulation + input.economicPopulation - spent ||
    input.population >= input.level + 1
  )
    return null;
  return {
    id,
    ownerId: owner,
    at,
    level: input.level,
    permanentPopulation: input.permanentPopulation,
    economicPopulation: input.economicPopulation,
    population: input.population,
    isCapital: input.isCapital,
    expanded: input.expanded,
    landGrantUsed: input.landGrantUsed,
    cityActionAvailable: input.cityActionAvailable,
    rewards,
    ...(razed ? { wallsRazed: true as const } : {}),
  };
}

function parseRewards(input: unknown): readonly CityRewardRecordV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: CityRewardRecordV7[] = [];
  let prior = 1;
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, ["reachedLevel", "reward"]) ||
      !isPositiveSafeIntegerV7(candidate.reachedLevel) ||
      candidate.reachedLevel !== prior + 1 ||
      !REWARD_IDS_V7.includes(candidate.reward as RewardIdV7) ||
      !rewardMatchesLevel(
        candidate.reward as RewardIdV7,
        candidate.reachedLevel,
      )
    )
      return null;
    values.push({
      reachedLevel: candidate.reachedLevel,
      reward: candidate.reward as RewardIdV7,
    });
    prior = candidate.reachedLevel;
  }
  return values;
}

function parseContributions(
  input: unknown,
): readonly PopulationContributionV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: PopulationContributionV7[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, [
        "amount",
        "category",
        "cityId",
        "id",
        "source",
      ]) ||
      !isPositiveSafeIntegerV7(candidate.id) ||
      !isNonNegativeSafeIntegerV7(candidate.amount) ||
      (candidate.category !== "PERMANENT" && candidate.category !== "LIVE")
    )
      return null;
    const city = parseCityIdV7(candidate.cityId);
    const source = parseContributionSource(candidate.source);
    if (
      city === null ||
      source === null ||
      (candidate.category === "PERMANENT") !==
        (source.kind === "RESOURCE_ACTION" || source.kind === "CITY_REWARD") ||
      (candidate.category === "PERMANENT" &&
        candidate.amount !==
          (source.kind === "CITY_REWARD" ? BOOM_POPULATION_V7 : 1)) ||
      (source.kind === "MONUMENT" &&
        candidate.amount !== MONUMENT_POPULATION_V7) ||
      (source.kind === "IMPROVEMENT" && source.improvement === "MARKET") ||
      (values.at(-1)?.id ?? 0) >= candidate.id
    )
      return null;
    values.push({
      id: candidate.id,
      cityId: city,
      category: candidate.category,
      amount: candidate.amount,
      source,
    });
  }
  return values;
}

function parseContributionSource(
  input: unknown,
): PopulationContributionSourceV7 | null {
  if (
    hasExactKeysV7(input, ["action", "at", "kind"]) &&
    input.kind === "RESOURCE_ACTION" &&
    (input.action === "HARVEST_FRUIT" ||
      input.action === "HUNT_GAME" ||
      input.action === "HARVEST_FISH" ||
      // Tuning 1 (7r46): the permanent population of a Blast Mountain.
      input.action === "BLAST_MOUNTAIN")
  ) {
    const at = parseCoordV7(input.at);
    return at === null
      ? null
      : { kind: "RESOURCE_ACTION", action: input.action, at };
  }
  if (
    hasExactKeysV7(input, ["achievement", "at", "kind"]) &&
    input.kind === "MONUMENT" &&
    ACHIEVEMENT_IDS_V7.includes(input.achievement as never)
  ) {
    const at = parseCoordV7(input.at);
    return at === null
      ? null
      : {
          kind: "MONUMENT",
          achievement: input.achievement as AchievementIdV7,
          at,
        };
  }
  if (
    hasExactKeysV7(input, ["at", "improvement", "kind"]) &&
    input.kind === "IMPROVEMENT" &&
    IMPROVEMENT_IDS_V7.includes(input.improvement as ImprovementIdV7) &&
    input.improvement !== "MONUMENT"
  ) {
    const at = parseCoordV7(input.at);
    return at === null
      ? null
      : {
          kind: "IMPROVEMENT",
          improvement: input.improvement as ImprovementIdV7,
          at,
        };
  }
  if (
    hasExactKeysV7(input, ["at", "kind", "reachedLevel", "reward"]) &&
    input.kind === "CITY_REWARD" &&
    input.reward === "BOOM" &&
    input.reachedLevel === 4
  ) {
    const at = parseCoordV7(input.at);
    return at === null
      ? null
      : { kind: "CITY_REWARD", reward: "BOOM", reachedLevel: 4, at };
  }
  return null;
}

function parseUnits(
  input: unknown,
  players: readonly PlayerStateV7[],
  mindControlled: readonly MindControlledStatusV7[],
  shrinePromotions: boolean,
  neutralUnitIds: ReadonlyMap<number, NeutralBreedV7>,
): readonly UnitStateV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: UnitStateV7[] = [];
  for (const candidate of input) {
    const unit = parseUnit(
      candidate,
      players,
      mindControlled,
      shrinePromotions,
      neutralUnitIds,
    );
    if (unit === null || (values.at(-1)?.id ?? 0) >= unit.id) return null;
    values.push(unit);
  }
  return values;
}

/**
 * One unit. `shrinePromotions` (map curiosities,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 6): in a match whose
 * board can carry a Shrine, a veteran may have fewer than
 * `PROMOTION_KILLS_V7` kills (the Shrine promotes without them). Tuning 5
 * (`pulp_wars-w49.4`) removed Drill, the other promotion without kills.
 * `neutralUnitIds` (section 10.2): the units listed in `monsters`, exactly
 * the ones that have the neutral owner, with their breeds.
 */
function parseUnit(
  input: unknown,
  players: readonly PlayerStateV7[],
  mindControlled: readonly MindControlledStatusV7[],
  shrinePromotions: boolean,
  neutralUnitIds: ReadonlyMap<number, NeutralBreedV7>,
): UnitStateV7 | null {
  if (
    typeof input === "object" &&
    input !== null &&
    (input as { readonly ownerId?: unknown }).ownerId === NEUTRAL_OWNER_ID_V7
  )
    return parseNeutralUnit(input, neutralUnitIds);
  // The giants' signatures (Break Off, the user's change of 2026-10-09): a
  // Gingerbread Man carries `variant: "GINGERBREAD_MAN"`; no other unit has
  // the key. It is checked below: a land or embarked Candy `FIGHTER`.
  const variant =
    typeof input === "object" &&
    input !== null &&
    Object.hasOwn(input, "variant");
  if (
    !hasExactKeysV7(input, [
      "activation",
      "at",
      "captureEligible",
      "homeCityId",
      "hp",
      "id",
      "kills",
      "maxHp",
      "ownerId",
      "role",
      "form",
      "veteran",
      ...(variant ? ["variant"] : []),
    ]) ||
    (variant && input.variant !== GINGERBREAD_MAN_VARIANT_V7) ||
    !UNIT_ROLE_IDS_V7.includes(input.role as UnitRoleIdV7) ||
    !isPositiveSafeIntegerV7(input.hp) ||
    !isPositiveSafeIntegerV7(input.maxHp) ||
    input.hp > input.maxHp ||
    !isNonNegativeSafeIntegerV7(input.kills) ||
    typeof input.veteran !== "boolean" ||
    typeof input.captureEligible !== "boolean" ||
    (input.form !== "LAND" &&
      input.form !== "EMBARKED" &&
      input.form !== "NAVAL" &&
      input.form !== "EGG")
  )
    return null;
  const id = parseUnitIdV7(input.id);
  const owner = parsePlayerIdV7(input.ownerId);
  const home =
    input.homeCityId === null ? null : parseCityIdV7(input.homeCityId);
  const at = parseCoordV7(input.at);
  const activation = parseActivation(input.activation);
  const role = input.role as UnitRoleIdV7;
  // Revision 13: every role rule resolves through the owner's faction. The
  // Mind Control revision (section 2): through the unit's kind, the faction
  // of its original owner while it is controlled.
  if (players.every((player) => player.id !== owner)) return null;
  const kindOwner =
    mindControlled.find((entry) => entry.unitId === id)?.originalOwnerId ??
    owner;
  const faction = players.find((player) => player.id === kindOwner)?.faction;
  if (faction === undefined) return null;
  const rule = effectiveRoleRuleV7(role, faction);
  // The Candy revision (section 5.4): the Chocolate Bunny's Sugar Frenzy is an
  // Overrun and the Donut Racer's perk an Escape; that the unit is Rushed
  // is checked with the cross references (`candyListsValid`).
  const rushPerk = roleMechanicsV7(role, faction).rushPerk;
  const overrun =
    rule.abilities.includes("OVERRUN") || rushPerk === "SUGAR_FRENZY";
  // Revision 19 section 6.1: an Egg is an egg-laid role of a Dinosaur seat
  // with 6 or 10 maximum HP, no kills, no Promotion, no capture eligibility,
  // and the exhausted activation at all times. Its tile, home city, and
  // countdown are checked with the cross references.
  if (
    variant &&
    (role !== "FIGHTER" ||
      faction !== "CANDY" ||
      (input.form !== "LAND" && input.form !== "EMBARKED"))
  )
    return null;
  if (input.form === "EGG") {
    if (
      id === null ||
      owner === null ||
      home === null ||
      at === null ||
      activation === null ||
      roleMechanicsV7(role, faction).hatchTurns === null ||
      !eggMaxHpOptionsV7(faction).includes(input.maxHp) ||
      input.kills !== 0 ||
      input.veteran ||
      input.captureEligible ||
      !isEggActivationV7(activation)
    )
      return null;
    return {
      id,
      ownerId: owner,
      homeCityId: home,
      role,
      form: "EGG",
      at,
      hp: input.hp,
      maxHp: input.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation,
    };
  }
  if (
    id === null ||
    owner === null ||
    (input.homeCityId !== null && home === null) ||
    at === null ||
    activation === null ||
    // Revision 19 Grow: a growing role is never veteran and its maximum HP
    // follows its kills; every other unit keeps the Promotion rule.
    (rule.abilities.includes("GROW")
      ? input.veteran ||
        input.maxHp !==
          rule.maxHp + GROWTH_HP_V7 * growthStageForKillsV7(input.kills)
      : input.maxHp !== rule.maxHp + (input.veteran ? PROMOTION_HP_V7 : 0)) ||
    (input.veteran && !shrinePromotions && input.kills < PROMOTION_KILLS_V7) ||
    (input.captureEligible && !rule.abilities.includes("CAPTURE")) ||
    // The Dwarf revision section 7.3: an unmoved Clockwork Gunner fires
    // twice.
    (!overrun &&
      activation.attacksUsed > roleMechanicsV7(role, faction).unmovedShots) ||
    (activation.overrunActive &&
      (!overrun || !activation.attacked || activation.handled)) ||
    (activation.escapeAvailable &&
      ((!rule.abilities.includes("ESCAPE") && rushPerk !== "ESCAPE") ||
        input.form !== "LAND" ||
        // Tuning 4: after an attack, or after a Pillage (a special action).
        (!activation.attacked && !activation.specialActed) ||
        activation.handled)) ||
    activation.attacked !== activation.attacksUsed > 0 ||
    isNavalRoleV7(role) !== (input.form === "NAVAL")
  )
    return null;
  return {
    id,
    ownerId: owner,
    homeCityId: home,
    role,
    form: input.form as UnitStateV7["form"],
    at,
    hp: input.hp,
    maxHp: input.maxHp,
    kills: input.kills,
    veteran: input.veteran,
    captureEligible: input.captureEligible,
    activation,
    ...(variant ? { variant: GINGERBREAD_MAN_VARIANT_V7 } : {}),
  };
}

/**
 * Map curiosities (sections 8.1 and 10.2; round 2, section 32.2): a neutral
 * unit listed in `monsters`: its breed's role and maximum HP (the neutral
 * registration), land form, no home city, never veteran or
 * capture-eligible, and at most one attack and no Overrun or Escape in its
 * activation.
 */
function parseNeutralUnit(
  input: unknown,
  neutralUnitIds: ReadonlyMap<number, NeutralBreedV7>,
): UnitStateV7 | null {
  if (
    !hasExactKeysV7(input, [
      "activation",
      "at",
      "captureEligible",
      "homeCityId",
      "hp",
      "id",
      "kills",
      "maxHp",
      "ownerId",
      "role",
      "form",
      "veteran",
    ]) ||
    input.ownerId !== NEUTRAL_OWNER_ID_V7 ||
    input.form !== "LAND" ||
    input.homeCityId !== null ||
    !isPositiveSafeIntegerV7(input.hp) ||
    !isPositiveSafeIntegerV7(input.maxHp) ||
    input.hp > input.maxHp ||
    !isNonNegativeSafeIntegerV7(input.kills) ||
    input.veteran !== false ||
    input.captureEligible !== false
  )
    return null;
  const id = parseUnitIdV7(input.id);
  const at = parseCoordV7(input.at);
  const activation = parseActivation(input.activation);
  const breed = id === null ? undefined : neutralUnitIds.get(id);
  const rule = breed === undefined ? undefined : NEUTRAL_ROLE_RULES_V7[breed];
  if (
    id === null ||
    rule === undefined ||
    input.role !== rule.role ||
    input.maxHp !== rule.maxHp ||
    at === null ||
    activation === null ||
    activation.attacksUsed > 1 ||
    activation.attacked !== activation.attacksUsed > 0 ||
    activation.overrunActive ||
    activation.escapeAvailable
  )
    return null;
  return {
    id,
    ownerId: NEUTRAL_OWNER_ID_V7,
    homeCityId: null,
    role: rule.role,
    form: "LAND",
    at,
    hp: input.hp,
    maxHp: input.maxHp,
    kills: input.kills,
    veteran: false,
    captureEligible: false,
    activation,
  };
}

/**
 * Map curiosities (section 10.2; round 2, section 32.2): the `monsters`
 * list, strictly ascending by `unitId`, each with its breed, its home, and
 * a strictly ascending `provokedBy`. It is empty unless the setup's
 * `curiosities` is true on a generated board of width 16 or more; at most
 * one Giant Spider and one Bigfoot, and no Bigfoot below width 20. The
 * cross references check the units and the camps.
 */
function parseMonsters(
  input: unknown,
  setup: MatchSetupV7,
): readonly MonsterStateV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  if (
    input.length > 0 &&
    (!setupHasCuriositiesV7(setup) || setup.width < MONSTER_MINIMUM_WIDTH_V7)
  )
    return null;
  const values: MonsterStateV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["breed", "home", "provokedBy", "unitId"]))
      return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    const home = parseCoordV7(candidate.home);
    const breed = NEUTRAL_BREEDS_V7.includes(candidate.breed as NeutralBreedV7)
      ? (candidate.breed as NeutralBreedV7)
      : null;
    const provokedBy = parseStrictlyAscendingIdsV7(
      candidate.provokedBy,
      parseUnitIdV7,
    );
    if (
      unitId === null ||
      home === null ||
      breed === null ||
      provokedBy === null ||
      provokedBy.includes(unitId) ||
      (breed === "BIGFOOT" && setup.width < BIGFOOT_MINIMUM_WIDTH_V7) ||
      ((breed === "GIANT_SPIDER" || breed === "BIGFOOT") &&
        values.some((entry) => entry.breed === breed)) ||
      (values.length > 0 && (values.at(-1) as MonsterStateV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, breed, home, provokedBy });
  }
  return values;
}

function parseActivation(input: unknown): UnitActivationV7 | null {
  if (
    !hasExactKeysV7(input, [
      "attacked",
      "attacksUsed",
      "captured",
      "escapeAvailable",
      "handled",
      "inspired",
      "moved",
      "movedPathLength",
      "overrunActive",
      "recovered",
      "specialActed",
      "tendedThisTurn",
    ]) ||
    !isNonNegativeSafeIntegerV7(input.movedPathLength) ||
    !isNonNegativeSafeIntegerV7(input.attacksUsed) ||
    ![
      input.attacked,
      input.captured,
      input.handled,
      input.inspired,
      input.moved,
      input.recovered,
      input.specialActed,
      input.tendedThisTurn,
      input.overrunActive,
      input.escapeAvailable,
    ].every((value) => typeof value === "boolean") ||
    (!input.moved && input.movedPathLength !== 0)
  )
    return null;
  return {
    moved: input.moved as boolean,
    movedPathLength: input.movedPathLength,
    attacked: input.attacked as boolean,
    attacksUsed: input.attacksUsed,
    tendedThisTurn: input.tendedThisTurn as boolean,
    inspired: input.inspired as boolean,
    overrunActive: input.overrunActive as boolean,
    escapeAvailable: input.escapeAvailable as boolean,
    recovered: input.recovered as boolean,
    captured: input.captured as boolean,
    handled: input.handled as boolean,
    specialActed: input.specialActed as boolean,
  };
}

function parseChoices(input: unknown): readonly PendingChoiceV7[] | null {
  if (!isDenseArrayV7(input) || input.length > 1) return null;
  const values: PendingChoiceV7[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, [
        "candidates",
        "cityId",
        "kind",
        "reachedLevel",
      ]) ||
      candidate.kind !== "CITY_REWARD" ||
      !isPositiveSafeIntegerV7(candidate.reachedLevel)
    )
      return null;
    const city = parseCityIdV7(candidate.cityId);
    const rewards = parseOrderedStringsV7(candidate.candidates, REWARD_IDS_V7);
    if (
      city === null ||
      rewards === null ||
      !candidateRewardsMatchLevel(rewards, candidate.reachedLevel)
    )
      return null;
    values.push({
      kind: "CITY_REWARD",
      cityId: city,
      reachedLevel: candidate.reachedLevel,
      candidates: rewards,
    });
  }
  return values;
}

function parseOutcome(input: unknown): MatchOutcomeV7 | null | undefined {
  if (input === null) return null;
  // Score and modes (section 4.2): a Perfection result decided by the score
  // carries `decidedBy: "SCORE"` and the final ranking.
  if (
    typeof input === "object" &&
    Object.prototype.hasOwnProperty.call(input, "decidedBy")
  ) {
    const { decidedBy, ranking, ...rest } = input as {
      readonly decidedBy?: unknown;
      readonly ranking?: unknown;
    };
    const base = parseOutcome(rest);
    const order = parsePlayerIdSequence(ranking);
    if (
      decidedBy !== "SCORE" ||
      order === null ||
      base === null ||
      base === undefined ||
      base.kind === "HEADLESS_VICTORY"
    )
      return undefined;
    return { ...base, decidedBy: "SCORE", ranking: order };
  }
  if (
    hasExactKeysV7(input, ["kind", "winnerId"]) &&
    (input.kind === "VICTORY" || input.kind === "HEADLESS_VICTORY")
  ) {
    const winner = parsePlayerIdV7(input.winnerId);
    return winner === null ? undefined : { kind: input.kind, winnerId: winner };
  }
  if (
    hasExactKeysV7(input, ["defeatedByPlayerId", "humanId", "kind"]) &&
    input.kind === "DEFEAT"
  ) {
    const human = parsePlayerIdV7(input.humanId);
    const by = parsePlayerIdV7(input.defeatedByPlayerId);
    return human === null || by === null
      ? undefined
      : { kind: "DEFEAT", humanId: human, defeatedByPlayerId: by };
  }
  return undefined;
}

/**
 * Revision 14 Plague entries, strictly ascending by unit ID; revision 15 adds
 * `turnsRemaining`, an integer from 1 to 3.
 */
function parsePlagued(input: unknown): readonly PlagueStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: PlagueStatusV7[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, ["sourceUnitId", "turnsRemaining", "unitId"])
    )
      return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    const sourceUnitId = parseUnitIdV7(candidate.sourceUnitId);
    const turnsRemaining = candidate.turnsRemaining;
    if (
      unitId === null ||
      sourceUnitId === null ||
      unitId === sourceUnitId ||
      typeof turnsRemaining !== "number" ||
      !Number.isInteger(turnsRemaining) ||
      turnsRemaining < 1 ||
      turnsRemaining > PLAGUE_DURATION_TURNS_V7 ||
      (values.length > 0 && (values.at(-1) as PlagueStatusV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, sourceUnitId, turnsRemaining });
  }
  return values;
}

/** Revision 14 Bitten entries, strictly ascending by unit ID. */
function parseBitten(input: unknown): readonly BittenStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: BittenStatusV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["biterPlayerId", "biterUnitId", "unitId"]))
      return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    const biterPlayerId = parsePlayerIdV7(candidate.biterPlayerId);
    const biterUnitId = parseUnitIdV7(candidate.biterUnitId);
    if (
      unitId === null ||
      biterPlayerId === null ||
      biterUnitId === null ||
      unitId === biterUnitId ||
      (values.length > 0 && (values.at(-1) as BittenStatusV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, biterPlayerId, biterUnitId });
  }
  return values;
}

/**
 * Revision 19 `eggs` entries: `{ unitId, turnsRemaining, laidThisTurn }`
 * sorted by unit ID, with a countdown of 1 to 4 Start Turns (revision 20:
 * the T-Rex hatches in 4).
 */
function parseEggs(input: unknown): readonly EggStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: EggStatusV7[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, ["laidThisTurn", "turnsRemaining", "unitId"])
    )
      return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    if (
      unitId === null ||
      !isPositiveSafeIntegerV7(candidate.turnsRemaining) ||
      candidate.turnsRemaining > 4 ||
      typeof candidate.laidThisTurn !== "boolean" ||
      (values.length > 0 && (values.at(-1) as EggStatusV7).unitId >= unitId)
    )
      return null;
    values.push({
      unitId,
      turnsRemaining: candidate.turnsRemaining,
      laidThisTurn: candidate.laidThisTurn,
    });
  }
  return values;
}

/**
 * The Martian revision `shields` entries: `{ unitId, shield }` sorted by
 * unit ID with a positive integer Shield; the per-unit maximum is checked
 * with the cross references.
 */
function parseShields(input: unknown): readonly ShieldStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: ShieldStatusV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["shield", "unitId"])) return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    if (
      unitId === null ||
      !isPositiveSafeIntegerV7(candidate.shield) ||
      (values.length > 0 && (values.at(-1) as ShieldStatusV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, shield: candidate.shield });
  }
  return values;
}

/** The Martian revision `cooling` entries, sorted by unit ID. */
function parseCooling(input: unknown): readonly CoolingStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: CoolingStatusV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["firedThisTurn", "unitId"])) return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    if (
      unitId === null ||
      typeof candidate.firedThisTurn !== "boolean" ||
      (values.length > 0 && (values.at(-1) as CoolingStatusV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, firedThisTurn: candidate.firedThisTurn });
  }
  return values;
}

/**
 * The Mind Control revision (section 2.1) `mindControlled` entries, sorted
 * by unit ID without duplicates.
 */
function parseMindControlled(
  input: unknown,
): readonly MindControlledStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: MindControlledStatusV7[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, ["brainUnitId", "originalOwnerId", "unitId"])
    )
      return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    const brainUnitId = parseUnitIdV7(candidate.brainUnitId);
    const originalOwnerId = parsePlayerIdV7(candidate.originalOwnerId);
    if (
      unitId === null ||
      brainUnitId === null ||
      originalOwnerId === null ||
      unitId === brainUnitId ||
      (values.length > 0 &&
        (values.at(-1) as MindControlledStatusV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, brainUnitId, originalOwnerId });
  }
  return values;
}

/**
 * The Martian revision `mindControlCooldowns` entries, sorted by unit ID,
 * with `turnsRemaining` an integer from 0 to the cooldown (2).
 */
function parseMindControlCooldowns(
  input: unknown,
): readonly MindControlCooldownV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: MindControlCooldownV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["turnsRemaining", "unitId"])) return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    if (
      unitId === null ||
      !isNonNegativeSafeIntegerV7(candidate.turnsRemaining) ||
      candidate.turnsRemaining > MIND_CONTROL_COOLDOWN_TURNS_V7 ||
      (values.length > 0 &&
        (values.at(-1) as MindControlCooldownV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, turnsRemaining: candidate.turnsRemaining });
  }
  return values;
}

/**
 * The Ice Folk revision `chilled` entries (section 5.1), sorted by unit ID:
 * `turnsLeft` 0, 1, or 2, and `sluggish` only with `turnsLeft` 2. The unit
 * checks are cross references.
 */
function parseChilled(input: unknown): readonly ChillStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: ChillStatusV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["sluggish", "turnsLeft", "unitId"]))
      return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    const turnsLeft = candidate.turnsLeft;
    if (
      unitId === null ||
      typeof candidate.sluggish !== "boolean" ||
      (turnsLeft !== 0 && turnsLeft !== 1 && turnsLeft !== 2) ||
      (candidate.sluggish && turnsLeft !== 2) ||
      (values.length > 0 && (values.at(-1) as ChillStatusV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, sluggish: candidate.sluggish, turnsLeft });
  }
  return values;
}

/**
 * The Dwarf revision (section 5.2): the burrowed entries, strictly ascending
 * by `unit.id`; each unit parses like a unit on the board under its owner's
 * registration. The cross references are checked separately.
 */
function parseBurrowed(
  input: unknown,
  players: readonly PlayerStateV7[],
  mindControlled: readonly MindControlledStatusV7[],
  shrinePromotions: boolean,
): readonly BurrowedEntryV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: BurrowedEntryV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["moleUnitId", "unit"])) return null;
    const unit = parseUnit(
      candidate.unit,
      players,
      mindControlled,
      shrinePromotions,
      new Map(),
    );
    const moleUnitId =
      candidate.moleUnitId === null
        ? null
        : parseUnitIdV7(candidate.moleUnitId);
    if (
      unit === null ||
      (candidate.moleUnitId !== null && moleUnitId === null) ||
      (values.length > 0 &&
        (values.at(-1) as BurrowedEntryV7).unit.id >= unit.id)
    )
      return null;
    values.push({ unit, moleUnitId });
  }
  return values;
}

/** Strictly ascending unit IDs (the Dwarf revision's per-turn lists). */
/**
 * The Candy revision (section 5.3): the `sugarRush` entries, strictly
 * ascending by `unitId` (so no unit has two).
 */
function parseSugarRush(input: unknown): readonly SugarRushStatusV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: SugarRushStatusV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["phase", "unitId"])) return null;
    const unitId = parseUnitIdV7(candidate.unitId);
    const phase = candidate.phase;
    if (
      unitId === null ||
      (phase !== "RUSHED" && phase !== "CRASHED") ||
      (values.length > 0 &&
        (values.at(-1) as SugarRushStatusV7).unitId >= unitId)
    )
      return null;
    values.push({ unitId, phase });
  }
  return values;
}

/**
 * The Candy revision (section 6.1): the Crumbs, strictly ascending by
 * (y, x) (so no tile holds two), each with a role, an owner, and 1 to 3
 * turns left. The cross references are checked separately.
 */
function parseCrumbs(input: unknown): readonly CrumbsV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: CrumbsV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["at", "ownerId", "role", "turnsLeft"]))
      return null;
    const at = parseCoordV7(candidate.at);
    const ownerId = parsePlayerIdV7(candidate.ownerId);
    const turnsLeft = candidate.turnsLeft;
    if (
      at === null ||
      ownerId === null ||
      !UNIT_ROLE_IDS_V7.includes(candidate.role as UnitRoleIdV7) ||
      (turnsLeft !== 1 && turnsLeft !== 2 && turnsLeft !== 3) ||
      (values.length > 0 &&
        compareCoordsV7((values.at(-1) as CrumbsV7).at, at) >= 0)
    )
      return null;
    values.push({
      at,
      role: candidate.role as UnitRoleIdV7,
      ownerId,
      turnsLeft,
    });
  }
  return values;
}

/**
 * Score and modes (section 3.3): the shape of `scoreLedger`; the order and
 * the cross references are `scoreLedgerShapeValidV7`.
 */
function parseScoreLedger(
  input: unknown,
): readonly ScoreLedgerEntryV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const entries: ScoreLedgerEntryV7[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, [
        "eliminatedAt",
        "eliminatedBy",
        "flawless",
        "hpLost",
        "killValue",
        "lossValue",
        "peakScore",
        "playerId",
        "round30",
      ]) ||
      !isNonNegativeSafeIntegerV7(candidate.killValue) ||
      !isNonNegativeSafeIntegerV7(candidate.lossValue) ||
      !isNonNegativeSafeIntegerV7(candidate.hpLost) ||
      !isNonNegativeSafeIntegerV7(candidate.peakScore) ||
      typeof candidate.flawless !== "boolean" ||
      (candidate.eliminatedAt !== null &&
        !isNonNegativeSafeIntegerV7(candidate.eliminatedAt))
    )
      return null;
    const playerId = parsePlayerIdV7(candidate.playerId);
    const eliminatedBy =
      candidate.eliminatedBy === null
        ? null
        : parsePlayerIdV7(candidate.eliminatedBy);
    if (
      playerId === null ||
      (candidate.eliminatedBy !== null && eliminatedBy === null)
    )
      return null;
    let round30: ScoreLedgerEntryV7["round30"] = null;
    if (candidate.round30 !== null) {
      if (
        !hasExactKeysV7(candidate.round30, ["peakScore", "score"]) ||
        !isNonNegativeSafeIntegerV7(candidate.round30.score) ||
        !isNonNegativeSafeIntegerV7(candidate.round30.peakScore)
      )
        return null;
      round30 = {
        score: candidate.round30.score,
        peakScore: candidate.round30.peakScore,
      };
    }
    entries.push({
      playerId,
      killValue: candidate.killValue,
      lossValue: candidate.lossValue,
      hpLost: candidate.hpLost,
      flawless: candidate.flawless,
      eliminatedBy,
      eliminatedAt: candidate.eliminatedAt as number | null,
      peakScore: candidate.peakScore,
      round30,
    });
  }
  return entries;
}

/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55): the shape of `ninthUnit`: the
 * marked Graves sorted by (y, x) and the two sorted unit-ID lists. (Dwarf
 * crowd control, `pulp_wars-w49.33`: Three Hammers and its struck pairs are
 * gone.)
 */
function parseNinthUnit(input: unknown): NinthUnitStateV7 | null {
  if (
    !hasExactKeysV7(input, ["crackedThisTurn", "risenWights", "wightGraves"]) ||
    !isDenseArrayV7(input.wightGraves)
  )
    return null;
  const risenWights = parseSortedUnitIds(input.risenWights);
  const crackedThisTurn = parseSortedUnitIds(input.crackedThisTurn);
  if (risenWights === null || crackedThisTurn === null) return null;
  const wightGraves: NinthUnitStateV7["wightGraves"][number][] = [];
  for (const candidate of input.wightGraves) {
    if (!hasExactKeysV7(candidate, ["at", "ownerId"])) return null;
    const at = parseCoordV7(candidate.at);
    const ownerId = parsePlayerIdV7(candidate.ownerId);
    const prior = wightGraves.at(-1);
    if (
      at === null ||
      ownerId === null ||
      (prior !== undefined && compareCoordsV7(prior.at, at) >= 0)
    )
      return null;
    wightGraves.push({ at, ownerId });
  }
  return { wightGraves, risenWights, crackedThisTurn };
}

/**
 * Dwarf crowd control (`pulp_wars-w49.33`): the Barricades, strictly
 * ascending by (y, x) (so no tile holds two), each with an owner and 1 to
 * `BARRICADE_HP_V7` HP. The cross references are checked separately.
 */
function parseBarricades(input: unknown): readonly BarricadeV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: BarricadeV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["at", "hp", "ownerId"])) return null;
    const at = parseCoordV7(candidate.at);
    const ownerId = parsePlayerIdV7(candidate.ownerId);
    const hp = candidate.hp;
    const prior = values.at(-1);
    if (
      at === null ||
      ownerId === null ||
      !isPositiveSafeIntegerV7(hp) ||
      hp > BARRICADE_HP_V7 ||
      (prior !== undefined && compareCoordsV7(prior.at, at) >= 0)
    )
      return null;
    values.push({ at, ownerId, hp });
  }
  return values;
}

/**
 * Dwarf crowd control (`pulp_wars-w49.33`): the Barricades exist only in a
 * match with a Dwarf seat; each belongs to a player of the match (it stays
 * when its owner is eliminated) and stands on a land tile that is not a
 * Rift or a settlement site, with no unit, mound, treasure chest, or
 * curiosity; no player has more than `BARRICADE_CAP_V7`.
 */
function barricadesValid(
  value: CrossInput,
  playerById: ReadonlyMap<PlayerStateV7["id"], PlayerStateV7>,
): boolean {
  const { barricades } = value;
  if (barricades.length === 0) return true;
  if (!value.setup.factions.includes("DWARF")) return false;
  const counts = new Map<PlayerStateV7["id"], number>();
  for (const entry of barricades) {
    const tile = tileAt(value.board, entry.at);
    const count = (counts.get(entry.ownerId) ?? 0) + 1;
    counts.set(entry.ownerId, count);
    if (
      tile === undefined ||
      tile.biome === null ||
      tile.terrain === "RIFT" ||
      tile.site !== null ||
      !playerById.has(entry.ownerId) ||
      count > BARRICADE_CAP_V7 ||
      value.units.some((unit) => sameCoordV7(unit.at, entry.at)) ||
      value.burrowed.some((item) => sameCoordV7(item.unit.at, entry.at)) ||
      value.treasureChests.some((chest) => sameCoordV7(chest, entry.at)) ||
      value.curiosities.some((curiosity) => sameCoordV7(curiosity.at, entry.at))
    )
      return false;
  }
  return true;
}

/**
 * The ninth unit: the cross references of `ninthUnit`. A marked Grave lies
 * on a Grave and belongs to an Undead seat that is in the game; a risen
 * Wight is a unit on the board whose role rises again under its kind; a
 * Cracked unit is a unit on the board that is not a neutral Monster.
 */
function ninthUnitValid(
  value: CrossInput,
  playerById: ReadonlyMap<PlayerStateV7["id"], PlayerStateV7>,
  kindOf: (unit: UnitStateV7) => FactionIdV7 | undefined,
): boolean {
  const { wightGraves, risenWights, crackedThisTurn } = value.ninthUnit;
  if (
    wightGraves.length === 0 &&
    risenWights.length === 0 &&
    crackedThisTurn.length === 0
  )
    return true;
  const unitById = new Map(value.units.map((unit) => [unit.id, unit]));
  for (const entry of wightGraves) {
    const owner = playerById.get(entry.ownerId);
    if (
      owner === undefined ||
      owner.status !== "ACTIVE" ||
      roleMechanicsV7("SWORDSMAN", owner.faction).riseAgainHp === null ||
      !value.graves.some((grave) => sameCoordV7(grave, entry.at))
    )
      return false;
  }
  for (const unitId of risenWights) {
    const unit = unitById.get(unitId);
    const kind = unit === undefined ? undefined : kindOf(unit);
    if (
      unit === undefined ||
      unit.hp <= 0 ||
      kind === undefined ||
      roleMechanicsV7(unit.role, kind).riseAgainHp === null
    )
      return false;
  }
  for (const unitId of crackedThisTurn) {
    const unit = unitById.get(unitId);
    if (unit === undefined || unit.hp <= 0 || isNeutralOwnerV7(unit.ownerId))
      return false;
  }
  return true;
}

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.2):
 * the shape of `giants`: the held victims, strictly ascending by holder,
 * each a unit that parses like a unit on the board under its owner's
 * registration. The cross references are checked by `giantsValid`.
 */
function parseGiants(
  input: unknown,
  players: readonly PlayerStateV7[],
  mindControlled: readonly MindControlledStatusV7[],
  shrinePromotions: boolean,
): GiantsStateV7 | null {
  if (!hasExactKeysV7(input, ["swallowed"]) || !isDenseArrayV7(input.swallowed))
    return null;
  const swallowed: GiantsStateV7["swallowed"][number][] = [];
  for (const candidate of input.swallowed) {
    if (!hasExactKeysV7(candidate, ["holderUnitId", "unit"])) return null;
    const holderUnitId = parseUnitIdV7(candidate.holderUnitId);
    const unit = parseUnit(
      candidate.unit,
      players,
      mindControlled,
      shrinePromotions,
      new Map(),
    );
    const prior = swallowed.at(-1);
    if (
      holderUnitId === null ||
      unit === null ||
      unit.id === holderUnitId ||
      (prior !== undefined && prior.holderUnitId >= holderUnitId)
    )
      return null;
    swallowed.push({ holderUnitId, unit });
  }
  return { swallowed };
}

/**
 * The giants' signatures (section 6.2, Saves): the cross references of
 * `giants.swallowed`. Every entry is in a match with an Undead seat; its
 * holder is a living land-form unit on the board whose role, under its
 * kind, has `SWALLOW` (and is not controlled); the victim is in no other
 * list, is owned by an active player other than the holder's, is a
 * one-slot land unit that the Swallow legality admits (not an Egg, not a
 * giant, not a construct, not Rock Hard, not mind-controlled), has 1 to its
 * maximum HP, stands on its holder's tile, has the exhausted activation, is
 * not capture-eligible, and is homed (if at all) to a city of its owner.
 */
function giantsValid(
  value: CrossInput,
  playerById: ReadonlyMap<PlayerStateV7["id"], PlayerStateV7>,
  kindOf: (unit: UnitStateV7) => FactionIdV7 | undefined,
): boolean {
  const { swallowed } = value.giants;
  if (swallowed.length === 0) return true;
  if (!value.setup.factions.includes("UNDEAD")) return false;
  const unitById = new Map(value.units.map((unit) => [unit.id, unit]));
  const cityById = new Map(value.cities.map((city) => [city.id, city]));
  const controlled = new Set(value.mindControlled.map((entry) => entry.unitId));
  for (const entry of swallowed) {
    const holder = unitById.get(entry.holderUnitId);
    const holderKind = holder === undefined ? undefined : kindOf(holder);
    const victim = entry.unit;
    const victimOwner = playerById.get(victim.ownerId);
    // A held victim is never mind-controlled (checked below): its kind is
    // its owner's faction.
    const victimKind = kindOf(victim);
    if (
      holder === undefined ||
      holderKind === undefined ||
      holder.hp <= 0 ||
      holder.form !== "LAND" ||
      !effectiveRoleRuleV7(holder.role, holderKind).abilities.includes(
        "SWALLOW",
      ) ||
      controlled.has(holder.id) ||
      victimOwner === undefined ||
      victimKind === undefined ||
      victimOwner.status !== "ACTIVE" ||
      victim.ownerId === holder.ownerId ||
      victim.form !== "LAND" ||
      victim.role === "JUGGERNAUT" ||
      roleMechanicsV7(victim.role, victimKind).capacitySlots !== 1 ||
      roleMechanicsV7(victim.role, victimKind).construct ||
      roleMechanicsV7(victim.role, victimKind).immovable ||
      controlled.has(victim.id) ||
      unitById.has(victim.id) ||
      value.burrowed.some((burrowed) => burrowed.unit.id === victim.id) ||
      victim.at.x !== holder.at.x ||
      victim.at.y !== holder.at.y ||
      victim.captureEligible ||
      !isExhaustedActivationV7(victim.activation) ||
      (victim.homeCityId !== null &&
        cityById.get(victim.homeCityId)?.ownerId !== victim.ownerId)
    )
      return false;
  }
  return true;
}

/** The exhausted activation (a held victim's, a landed unit's). */
function isExhaustedActivationV7(activation: UnitActivationV7): boolean {
  return (
    activation.moved &&
    activation.movedPathLength === 0 &&
    activation.attacked &&
    activation.attacksUsed === 1 &&
    !activation.tendedThisTurn &&
    !activation.inspired &&
    !activation.overrunActive &&
    !activation.escapeAvailable &&
    activation.recovered &&
    activation.captured &&
    activation.handled &&
    activation.specialActed
  );
}

function parseSortedUnitIds(input: unknown): readonly UnitId[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: UnitId[] = [];
  for (const candidate of input) {
    const id = parseUnitIdV7(candidate);
    if (id === null || (values.length > 0 && (values.at(-1) as UnitId) >= id))
      return null;
    values.push(id);
  }
  return values;
}

function parseSortedCoords(input: unknown): readonly CoordV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: CoordV7[] = [];
  for (const candidate of input) {
    const at = parseCoordV7(candidate);
    if (
      at === null ||
      (values.length > 0 && compareCoordsV7(values.at(-1) as CoordV7, at) >= 0)
    )
      return null;
    values.push(at);
  }
  return values;
}

/**
 * The naval branch, the frozen sea
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.3): the ice list,
 * strictly ascending by (y, x) (so no tile holds two), each entry with a
 * `turnsLeft` from 0 to `GLACIER_ICE_TURNS_V7`. The tiles and owners are
 * checked with the cross references (`iceValid`).
 */
function parseIce(input: unknown): readonly IceTileV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: IceTileV7[] = [];
  for (const candidate of input) {
    if (!hasExactKeysV7(candidate, ["at", "ownerId", "turnsLeft"])) return null;
    const at = parseCoordV7(candidate.at);
    const ownerId = parsePlayerIdV7(candidate.ownerId);
    const turnsLeft = candidate.turnsLeft;
    if (
      at === null ||
      ownerId === null ||
      !isNonNegativeSafeIntegerV7(turnsLeft) ||
      turnsLeft > GLACIER_ICE_TURNS_V7 ||
      (values.length > 0 &&
        compareCoordsV7((values.at(-1) as IceTileV7).at, at) >= 0)
    )
      return null;
    values.push({ at, ownerId, turnsLeft });
  }
  return values;
}

/**
 * The frozen sea (section 8.3) cross references: the list is empty in a
 * match without an Ice Folk seat; every entry lies on a water tile of the
 * board that is not a dock and is owned by a player of the match; no unit of
 * the Ice Folk kind is afloat, and no Ice Folk seat owns a ship.
 */
function iceValid(
  value: CrossInput,
  playerById: ReadonlyMap<PlayerStateV7["id"], PlayerStateV7>,
  kindOf: (unit: UnitStateV7) => FactionIdV7 | undefined,
): boolean {
  if (!value.setup.factions.includes("ICE_FOLK")) return value.ice.length === 0;
  for (const entry of value.ice) {
    const tile = tileAt(value.board, entry.at);
    if (
      tile === undefined ||
      tile.biome !== null ||
      (tile.terrain !== "SHALLOW_WATER" && tile.terrain !== "DEEP_WATER") ||
      tile.improvement === "PORT" ||
      tile.improvement === "SHIPYARD" ||
      !playerById.has(entry.ownerId)
    )
      return false;
  }
  for (const unit of [
    ...value.units,
    ...value.burrowed.map((entry) => entry.unit),
  ]) {
    if (isNeutralOwnerV7(unit.ownerId)) continue;
    if (isAfloatFormV7(unit.form) && kindOf(unit) === "ICE_FOLK") return false;
    if (
      unit.form === "NAVAL" &&
      playerById.get(unit.ownerId)?.faction === "ICE_FOLK"
    )
      return false;
  }
  return true;
}

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 10.2;
 * round 2, section 32.2): the curiosity list, strictly ascending by (y, x)
 * (so no tile holds two). It is empty unless the setup's `curiosities` is
 * true on a generated map; every entry stands on its kind's terrain, on no
 * settlement site, treasure chest, resource, improvement, or Rift, 3 or
 * more from every settlement center (section 4.3 rules 2 and 3), and off
 * the board's edge ring. Round 2: a gate names its partner, and the gates
 * are exactly one pair (or none) on a board of width 20 or more; the Well
 * lists the seats that tossed, strictly ascending; no Downed Saucer with a
 * Martian seat, no Graveyard with an Undead seat, and at most one camp.
 */
function parseCuriosities(
  input: unknown,
  setup: MatchSetupV7,
  board: BoardStateV7,
  treasureChests: readonly CoordV7[],
): readonly CuriosityV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  if (input.length > 0 && !setupHasCuriositiesV7(setup)) return null;
  const centers = board.tiles
    .filter((tile) => tile.site !== null)
    .map((tile) => tile.at);
  const values: CuriosityV7[] = [];
  for (const candidate of input) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !CURIOSITY_KINDS_V7.includes(
        (candidate as { readonly kind?: unknown }).kind as CuriosityKindV7,
      )
    )
      return null;
    const kind = (candidate as { readonly kind: CuriosityKindV7 }).kind;
    if (
      !hasExactKeysV7(
        candidate,
        kind === "GATE"
          ? ["at", "kind", "partner"]
          : kind === "WISHING_WELL"
            ? ["at", "kind", "tossedBy"]
            : ["at", "kind"],
      )
    )
      return null;
    const at = parseCoordV7(candidate.at);
    if (
      at === null ||
      at.x < 1 ||
      at.y < 1 ||
      at.x > board.width - 2 ||
      at.y > board.height - 2 ||
      (values.length > 0 &&
        compareCoordsV7((values.at(-1) as CuriosityV7).at, at) >= 0)
    )
      return null;
    const tile = board.tiles[at.y * board.width + at.x];
    if (
      tile === undefined ||
      tile.site !== null ||
      tile.resource !== null ||
      tile.improvement !== null ||
      tile.terrain === "RIFT" ||
      !curiosityTerrainLegalV7(kind, tile.terrain) ||
      treasureChests.some((chest) => sameCoordV7(chest, at)) ||
      centers.some(
        (center) =>
          Math.max(Math.abs(center.x - at.x), Math.abs(center.y - at.y)) <
          CURIOSITY_CENTER_DISTANCE_V7,
      ) ||
      (kind === "DOWNED_SAUCER" && setup.factions.includes("MARTIAN")) ||
      (kind === "GRAVEYARD" && setup.factions.includes("UNDEAD")) ||
      (kind === "GATE" && setup.width < GATES_MINIMUM_WIDTH_V7)
    )
      return null;
    if (kind === "GATE") {
      const partner = parseCoordV7(candidate.partner);
      if (partner === null || sameCoordV7(partner, at)) return null;
      values.push({ kind, at, partner });
    } else if (kind === "WISHING_WELL") {
      const tossedBy = parseStrictlyAscendingIdsV7(
        candidate.tossedBy,
        parsePlayerIdV7,
      );
      if (tossedBy === null) return null;
      values.push({ kind, at, tossedBy });
    } else values.push({ kind, at });
  }
  const gates = values.filter((value) => value.kind === "GATE");
  if (
    (gates.length !== 0 && gates.length !== 2) ||
    gates.some(
      (gate) =>
        !gates.some(
          (other) =>
            other !== gate &&
            sameCoordV7(other.at, gate.partner) &&
            sameCoordV7(other.partner, gate.at),
        ),
    ) ||
    values.filter(
      (value) => value.kind === "DOWNED_SAUCER" || value.kind === "GRAVEYARD",
    ).length > 1 ||
    values.filter((value) => value.kind === "WISHING_WELL").length > 1
  )
    return null;
  return values;
}

function parsePlayerIdSequence(
  input: unknown,
): readonly NonNullable<ReturnType<typeof parsePlayerIdV7>>[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: NonNullable<ReturnType<typeof parsePlayerIdV7>>[] = [];
  for (const candidate of input) {
    const id = parsePlayerIdV7(candidate);
    if (id === null || values.includes(id)) return null;
    values.push(id);
  }
  return values;
}

interface CrossInput {
  board: BoardStateV7;
  players: readonly PlayerStateV7[];
  cities: readonly CityStateV7[];
  contributions: readonly PopulationContributionV7[];
  units: readonly UnitStateV7[];
  treasureChests: readonly CoordV7[];
  monsters: readonly MonsterStateV7[];
  graves: readonly CoordV7[];
  plagued: readonly PlagueStatusV7[];
  bitten: readonly BittenStatusV7[];
  eggs: readonly EggStatusV7[];
  shields: readonly ShieldStatusV7[];
  cooling: readonly CoolingStatusV7[];
  mindControlled: readonly MindControlledStatusV7[];
  mindControlCooldowns: readonly MindControlCooldownV7[];
  chilled: readonly ChillStatusV7[];
  burrowed: readonly BurrowedEntryV7[];
  surfacedThisTurn: readonly UnitId[];
  bombedThisTurn: readonly UnitId[];
  beamedThisTurn: readonly UnitId[];
  tractorUsedThisTurn: readonly UnitId[];
  sugarRush: readonly SugarRushStatusV7[];
  crumbs: readonly CrumbsV7[];
  splattedThisTurn: readonly UnitId[];
  tossedThisTurn: readonly UnitId[];
  huntedThisTurn: readonly UnitId[];
  berserkThisTurn: readonly UnitId[];
  ninthUnit: NinthUnitStateV7;
  barricades: readonly BarricadeV7[];
  giants: GiantsStateV7;
  curiosities: readonly CuriosityV7[];
  ice: readonly IceTileV7[];
  choices: readonly PendingChoiceV7[];
  outcome: MatchOutcomeV7 | null;
  humanPlayerId: PlayerStateV7["id"];
  activePlayerId: PlayerStateV7["id"];
  nextEntityId: number;
  round: number;
  setup: MatchSetupV7;
}

function validateCrossReferences(value: CrossInput): boolean {
  const {
    board,
    players,
    cities,
    contributions,
    units,
    treasureChests,
    graves,
    plagued,
    bitten,
    eggs,
    shields,
    cooling,
    mindControlled,
    mindControlCooldowns,
    chilled,
    burrowed,
    surfacedThisTurn,
    bombedThisTurn,
    choices,
    outcome,
  } = value;
  const playerById = new Map(players.map((player) => [player.id, player]));
  const cityById = new Map(cities.map((city) => [city.id, city]));
  // The Mind Control revision (section 2): a unit's kind is the faction of
  // its original owner while it is controlled, else its owner's.
  const controlledById = new Map(
    mindControlled.map((entry) => [entry.unitId, entry]),
  );
  const kindOf = (unit: UnitStateV7): FactionIdV7 | undefined =>
    playerById.get(controlledById.get(unit.id)?.originalOwnerId ?? unit.ownerId)
      ?.faction;
  // The Dwarf revision section 5.2: unit IDs are unique across `units` and
  // `burrowed`, and the next entity ID is above all of them (all-units).
  const burrowedUnits = burrowed.map((entry) => entry.unit);
  // The giants' signatures (section 6.2): a held victim keeps its ID.
  const swallowedUnits = value.giants.swallowed.map((entry) => entry.unit);
  const iceKeys = new Set(value.ice.map((entry) => key(entry.at)));
  const entityIds = [
    ...cities.map((item) => item.id),
    ...contributions.map((item) => item.id),
    ...units.map((item) => item.id),
    ...burrowedUnits.map((item) => item.id),
    ...swallowedUnits.map((item) => item.id),
  ];
  if (
    new Set(entityIds).size !== entityIds.length ||
    Math.max(0, ...entityIds) >= value.nextEntityId
  )
    return false;
  if (
    players.some((player) =>
      player.spoilsClaimedCityIds.some((id) => !cityById.has(id)),
    ) ||
    cities.some((city) => !playerById.has(city.ownerId)) ||
    [...units, ...burrowedUnits].some(
      (unit) =>
        (!playerById.has(unit.ownerId) &&
          !(
            isNeutralOwnerV7(unit.ownerId) &&
            units.includes(unit) &&
            value.monsters.some((entry) => entry.unitId === unit.id)
          )) ||
        (unit.homeCityId !== null &&
          cityById.get(unit.homeCityId)?.ownerId !== unit.ownerId),
    ) ||
    !monstersValid(board, units, value.monsters, value.curiosities) ||
    // Round 2 (section 32.2): only seats toss at the Well.
    value.curiosities.some(
      (curiosity) =>
        curiosity.kind === "WISHING_WELL" &&
        curiosity.tossedBy.some((id) => !playerById.has(id)),
    ) ||
    board.tiles.some(
      (tile) =>
        tile.territoryCityId !== null && !cityById.has(tile.territoryCityId),
    )
  )
    return false;
  if (
    new Set(cities.map((city) => key(city.at))).size !== cities.length ||
    new Set(players.map((player) => player.color)).size !== players.length
  )
    return false;
  if (
    players.some(
      (player) =>
        player.status === "ELIMINATED" &&
        (cities.some((city) => city.ownerId === player.id) ||
          units.some((unit) => unit.ownerId === player.id) ||
          burrowedUnits.some((unit) => unit.ownerId === player.id) ||
          swallowedUnits.some((unit) => unit.ownerId === player.id)),
    )
  )
    return false;
  if (
    ![
      ...players.flatMap((player) => player.explored),
      ...cities.map((city) => city.at),
      ...units.map((unit) => unit.at),
      ...contributions.map((item) => item.source.at),
      ...treasureChests,
    ].every((at) => onBoard(board, at))
  )
    return false;
  if (new Set(units.map((unit) => key(unit.at))).size !== units.length)
    return false;
  for (const unit of units) {
    // Map curiosities: a Monster's tile is checked by `monstersValid`.
    if (isNeutralOwnerV7(unit.ownerId)) continue;
    const tile = tileAt(board, unit.at);
    const owner = playerById.get(unit.ownerId);
    const kind = kindOf(unit);
    if (
      tile === undefined ||
      owner === undefined ||
      kind === undefined ||
      // Revision 19: an Egg stands on land like a land-form unit; only naval
      // and embarked units are afloat.
      // The frozen sea (naval branch section 8.3): a land-form unit may
      // stand on an ice tile (water with an ice entry); an Egg never does.
      (isAfloatFormV7(unit.form)
        ? tile.biome !== null
        : tile.biome === null &&
          !(unit.form === "LAND" && iceKeys.has(key(unit.at)))) ||
      (isAfloatFormV7(unit.form) &&
        tile.terrain === "DEEP_WATER" &&
        !owner.researchedTechs.includes("NAVIGATION")) ||
      // The Rift (RULESET_7_RIFT.md section 4): only a land-form flyer.
      (tile.terrain === "RIFT" &&
        (unit.form !== "LAND" ||
          roleMechanicsV7(unit.role, kind).movementMode !== "FLY"))
    )
      return false;
  }
  for (const city of cities) {
    const center = tileAt(board, city.at);
    if (
      center === undefined ||
      center.territoryCityId !== city.id ||
      center.site === null ||
      city.isCapital !== (center.site === "CAPITAL")
    )
      return false;
    if (
      city.rewards.some((reward) => reward.reachedLevel > city.level) ||
      city.expanded
    )
      return false;
  }
  for (const player of players) {
    if (
      player.status === "ACTIVE" &&
      !cities.some((city) => city.ownerId === player.id)
    )
      return false;
    const originalCapital = cityById.get(player.originalCapitalCityId);
    if (
      originalCapital === undefined ||
      !originalCapital.isCapital ||
      player.originalCapitalCityId !== player.seat * 2 + 1
    )
      return false;
  }
  if (
    new Set(players.map((player) => player.originalCapitalCityId)).size !==
    players.length
  )
    return false;
  const firstUnrewarded = [...cities]
    .filter((city) => city.ownerId === value.activePlayerId)
    .sort((left, right) => left.id - right.id)
    .flatMap((city) => {
      for (let level = 2; level <= city.level; level += 1)
        if (!city.rewards.some((reward) => reward.reachedLevel === level))
          return [{ city, level }];
      return [];
    })[0];
  if (firstUnrewarded === undefined) {
    if (choices.length !== 0) return false;
  } else {
    const choice = choices[0];
    if (
      choice === undefined ||
      choice.cityId !== firstUnrewarded.city.id ||
      choice.reachedLevel !== firstUnrewarded.level ||
      choice.candidates.join() !==
        rewardCandidatesForLevelV7(firstUnrewarded.level).join()
    )
      return false;
  }
  if (
    !populationLedgerValid(
      board,
      players,
      cities,
      units,
      contributions,
      value.setup,
      value.humanPlayerId,
    )
  )
    return false;
  for (const achievement of ACHIEVEMENT_IDS_V7) {
    const monuments = contributions.filter(
      (contribution) =>
        contribution.source.kind === "MONUMENT" &&
        contribution.source.achievement === achievement,
    ).length;
    const funded = players.filter(
      (player) =>
        player.achievementEntitlements.find(
          (entitlement) => entitlement.achievement === achievement,
        )?.spent === true,
    ).length;
    if (monuments > funded) return false;
  }
  if (
    choices.some((choice) => {
      const city = cityById.get(choice.cityId);
      return (
        city === undefined ||
        playerById.get(city.ownerId)?.status !== "ACTIVE" ||
        choice.reachedLevel > city.level
      );
    })
  )
    return false;
  for (const chest of treasureChests) {
    const tile = tileAt(board, chest);
    if (
      tile === undefined ||
      tile.biome === null ||
      tile.terrain === "MOUNTAIN" ||
      tile.terrain === "RIFT" ||
      tile.site !== null ||
      tile.resource !== null ||
      tile.improvement !== null ||
      units.some((unit) => sameCoordV7(unit.at, chest))
    )
      return false;
  }
  // Revision 13 Graves exist only in matches with an Undead seat and only on
  // land tiles that are not settlement sites or treasure chests.
  if (graves.length > 0 && !gravesEnabledV7(value.setup)) return false;
  for (const grave of graves) {
    const tile = tileAt(board, grave);
    if (
      tile === undefined ||
      tile.biome === null ||
      tile.terrain === "RIFT" ||
      tile.site !== null ||
      treasureChests.some((chest) => sameCoordV7(chest, grave))
    )
      return false;
  }
  // Revision 14 afflictions exist only in matches with an Undead seat, only
  // on living units on the board, with a living source Lich and an active
  // Undead biter player.
  if (
    (plagued.length > 0 || bitten.length > 0) &&
    !gravesEnabledV7(value.setup)
  )
    return false;
  // The Dwarf revision section 5.2: status entries stay on burrowed units.
  const unitById = new Map(
    [...units, ...burrowedUnits].map((unit) => [unit.id, unit]),
  );
  if (
    !burrowedValid(
      board,
      playerById,
      kindOf,
      units,
      burrowed,
      treasureChests,
      value.setup,
    ) ||
    !turnListsValid(
      kindOf,
      units,
      surfacedThisTurn,
      bombedThisTurn,
      value.activePlayerId,
      value.setup,
    ) ||
    !martianTurnListsValid(
      kindOf,
      units,
      value.beamedThisTurn,
      value.tractorUsedThisTurn,
      value.activePlayerId,
      value.setup,
    ) ||
    !candyListsValid(value, playerById, kindOf) ||
    !ninthUnitValid(value, playerById, kindOf) ||
    !barricadesValid(value, playerById) ||
    !giantsValid(value, playerById, kindOf) ||
    !iceValid(value, playerById, kindOf) ||
    // The Dinosaur pass, correction: `huntedThisTurn` is empty in a match
    // without a Dinosaur seat, and names units on the board that do not
    // belong to the active seat.
    (value.huntedThisTurn.length > 0 &&
      (!value.setup.factions.includes("DINOSAUR") ||
        value.huntedThisTurn.some((unitId) => {
          const unit = units.find((item) => item.id === unitId);
          return (
            unit === undefined ||
            unit.hp <= 0 ||
            unit.ownerId === value.activePlayerId
          );
        }))) ||
    // Goblin explosions and Berserk (`pulp_wars-w49.35`): `berserkThisTurn`
    // is empty in a match without a Goblin seat, and names units on the
    // board that belong to the active seat.
    (value.berserkThisTurn.length > 0 &&
      (!value.setup.factions.includes("GOBLIN") ||
        value.berserkThisTurn.some((unitId) => {
          const unit = units.find((item) => item.id === unitId);
          return (
            unit === undefined ||
            unit.hp <= 0 ||
            unit.ownerId !== value.activePlayerId
          );
        })))
  )
    return false;
  // Revision 19: an Egg takes no status, so it is never plagued or bitten.
  // The Dwarf revision section 2.3: the per-unit living test (a construct is
  // never plagued or bitten).
  // Map curiosities (section 8.6): a Monster takes no status.
  const living = (unit: UnitStateV7 | undefined): boolean =>
    unit !== undefined &&
    unit.hp > 0 &&
    !isNeutralOwnerV7(unit.ownerId) &&
    unit.form !== "EGG" &&
    kindOf(unit) !== "UNDEAD" &&
    !roleMechanicsV7(unit.role, kindOf(unit) ?? "ORIGINAL").construct;
  for (const entry of plagued) {
    const source = unitById.get(entry.sourceUnitId);
    const sourceFaction = source === undefined ? undefined : kindOf(source);
    if (
      !living(unitById.get(entry.unitId)) ||
      source === undefined ||
      source.hp <= 0 ||
      sourceFaction !== "UNDEAD" ||
      !effectiveRoleRuleV7(source.role, sourceFaction).abilities.includes(
        "PLAGUE",
      )
    )
      return false;
  }
  for (const entry of bitten) {
    const biter = playerById.get(entry.biterPlayerId);
    if (
      !living(unitById.get(entry.unitId)) ||
      biter === undefined ||
      biter.status !== "ACTIVE" ||
      biter.faction !== "UNDEAD" ||
      entry.biterUnitId >= value.nextEntityId
    )
      return false;
  }
  // Revision 19 Eggs (section 6.1): one entry per unit of form `EGG` and
  // none otherwise, and only in a match with a Dinosaur seat. Each Egg's
  // countdown is at most its role's hatch time, its home city exists and is
  // its owner's, and it stands on a land tile of that city's territory next
  // to the city center.
  if (
    eggs.length !== units.filter((unit) => unit.form === "EGG").length ||
    (eggs.length > 0 && !value.setup.factions.includes("DINOSAUR"))
  )
    return false;
  for (const entry of eggs) {
    const egg = unitById.get(entry.unitId);
    if (egg === undefined || egg.form !== "EGG") return false;
    const faction = kindOf(egg);
    const home =
      egg.homeCityId === null ? undefined : cityById.get(egg.homeCityId);
    const tile = tileAt(board, egg.at);
    if (
      faction === undefined ||
      entry.turnsRemaining >
        (roleMechanicsV7(egg.role, faction).hatchTurns ?? 0) ||
      home === undefined ||
      home.ownerId !== egg.ownerId ||
      tile === undefined ||
      tile.biome === null ||
      tile.territoryCityId !== home.id ||
      Math.max(
        Math.abs(egg.at.x - home.at.x),
        Math.abs(egg.at.y - home.at.y),
      ) !== 1
    )
      return false;
  }
  // The Martian revision side lists (sections 5.1, 6.2, and 8.2). Every
  // entry needs a role that only the Martian registration has, so all of
  // them are empty in a match without a Martian seat.
  // The Mind Control revision (section 2.1): each controlled unit is a
  // living one-slot land-form or embarked unit, on the board or burrowed,
  // with no home, of a kind role that may be a target, owned by a Martian
  // seat other than its original owner; its Brain is a living unit on the
  // board of the same owner, not itself controlled, whose role under its
  // kind has Mind Control, and no Brain holds more than the limit.
  if (mindControlled.length > 0 && !value.setup.factions.includes("MARTIAN"))
    return false;
  const controlledByBrain = new Map<number, number>();
  for (const entry of mindControlled) {
    const unit = unitById.get(entry.unitId);
    const brain = units.find((candidate) => candidate.id === entry.brainUnitId);
    const kind = unit === undefined ? undefined : kindOf(unit);
    const brainKind = brain === undefined ? undefined : kindOf(brain);
    const controlled = (controlledByBrain.get(entry.brainUnitId) ?? 0) + 1;
    controlledByBrain.set(entry.brainUnitId, controlled);
    if (
      unit === undefined ||
      kind === undefined ||
      unit.hp <= 0 ||
      (unit.form !== "LAND" && unit.form !== "EMBARKED") ||
      unit.homeCityId !== null ||
      entry.originalOwnerId === unit.ownerId ||
      !playerById.has(entry.originalOwnerId) ||
      playerById.get(unit.ownerId)?.faction !== "MARTIAN" ||
      unit.role === "JUGGERNAUT" ||
      roleMechanicsV7(unit.role, kind).capacitySlots !== 1 ||
      roleMechanicsV7(unit.role, kind).construct ||
      brain === undefined ||
      brainKind === undefined ||
      brain.hp <= 0 ||
      brain.ownerId !== unit.ownerId ||
      controlledById.has(brain.id) ||
      !effectiveRoleRuleV7(brain.role, brainKind).abilities.includes(
        "MIND_CONTROL",
      ) ||
      controlled > MIND_CONTROL_LIMIT_V7
    )
      return false;
  }
  for (const entry of shields) {
    const unit = unitById.get(entry.unitId);
    const faction = unit === undefined ? undefined : kindOf(unit);
    if (unit === undefined || unit.hp <= 0 || faction === undefined)
      return false;
    const maximum = roleMechanicsV7(unit.role, faction).shield;
    if (
      maximum === 0 ||
      entry.shield > Math.max(maximum, FORCE_FIELD_SHIELD_V7)
    )
      return false;
  }
  for (const entry of cooling) {
    const unit = unitById.get(entry.unitId);
    const faction = unit === undefined ? undefined : kindOf(unit);
    if (
      unit === undefined ||
      unit.hp <= 0 ||
      faction === undefined ||
      // The Martian pass, correction: a ray unit, or a unit whose Rally
      // cools (the Brain after its Psychic Command).
      (!effectiveRoleRuleV7(unit.role, faction).abilities.includes(
        "HEAT_RAY",
      ) &&
        !roleMechanicsV7(unit.role, faction).rallyCools) ||
      (entry.firedThisTurn && unit.ownerId !== value.activePlayerId)
    )
      return false;
  }
  for (const entry of mindControlCooldowns) {
    const unit = unitById.get(entry.unitId);
    const faction = unit === undefined ? undefined : kindOf(unit);
    if (
      unit === undefined ||
      unit.hp <= 0 ||
      faction === undefined ||
      !effectiveRoleRuleV7(unit.role, faction).abilities.includes(
        "MIND_CONTROL",
      )
    )
      return false;
  }
  // The Ice Folk revision section 5.1: every Chill entry needs a living unit
  // that is neither naval nor an Egg, and only a match with an Ice Folk seat
  // has entries.
  if (chilled.length > 0 && !value.setup.factions.includes("ICE_FOLK"))
    return false;
  for (const entry of chilled) {
    const unit = unitById.get(entry.unitId);
    if (
      unit === undefined ||
      unit.hp <= 0 ||
      isNeutralOwnerV7(unit.ownerId) ||
      unit.form === "NAVAL" ||
      unit.form === "EGG"
    )
      return false;
  }
  if (outcome !== null) {
    if (outcome.kind === "DEFEAT") {
      if (
        outcome.humanId !== value.humanPlayerId ||
        !playerById.has(outcome.defeatedByPlayerId)
      )
        return false;
    } else if (!playerById.has(outcome.winnerId)) return false;
    // Score and modes (section 4.2): the ranking names every player once,
    // the winner (or the human's defeater) first.
    if (outcome.kind !== "HEADLESS_VICTORY" && outcome.ranking !== undefined) {
      const first =
        outcome.kind === "VICTORY"
          ? outcome.winnerId
          : outcome.defeatedByPlayerId;
      if (
        outcome.ranking[0] !== first ||
        (outcome.kind === "VICTORY") !== (first === value.humanPlayerId) ||
        !sameSet(
          outcome.ranking,
          players.map((player) => player.id),
        )
      )
        return false;
    }
  }
  return true;
}

/**
 * Map curiosities (section 10.2; round 2, section 32.2): every `monsters`
 * entry has a unit on the board with the neutral owner, every neutral unit
 * has an entry, and every `provokedBy` ID is a unit on the board that is
 * not neutral. Each neutral unit stands where its breed may (the occupancy
 * and chest tests are the ordinary unit checks): the Spider on a tile of
 * its area (Grass, Forest, or Mountain, 3 or more from every settlement
 * center, not a site); a guard on such a tile of its camp's area, never the
 * centre, with its `home` a camp centre of its kind (a Grunt, Ray Gunner,
 * or Shield Projector: a Downed Saucer; a Zombie: a Graveyard); Bigfoot on
 * its habitat. A camp never shares the board with a Spider.
 */
function monstersValid(
  board: BoardStateV7,
  units: readonly UnitStateV7[],
  monsters: readonly MonsterStateV7[],
  curiosities: readonly CuriosityV7[],
): boolean {
  const neutral = units.filter((unit) => isNeutralOwnerV7(unit.ownerId));
  if (neutral.length !== monsters.length) return false;
  const centers = board.tiles.filter((tile) => tile.site !== null);
  if (
    monsters.some((entry) => entry.breed === "GIANT_SPIDER") &&
    curiosities.some(
      (curiosity) =>
        curiosity.kind === "DOWNED_SAUCER" || curiosity.kind === "GRAVEYARD",
    )
  )
    return false;
  for (const entry of monsters) {
    const unit = neutral.find((candidate) => candidate.id === entry.unitId);
    const tile = unit === undefined ? undefined : tileAt(board, unit.at);
    if (
      unit === undefined ||
      tile === undefined ||
      tileAt(board, entry.home) === undefined ||
      entry.provokedBy.some(
        (id) =>
          !units.some(
            (candidate) =>
              candidate.id === id && !isNeutralOwnerV7(candidate.ownerId),
          ),
      )
    )
      return false;
    if (entry.breed === "BIGFOOT") {
      if (
        !bigfootHabitatV7(
          board,
          entry.home,
          centers.map((center) => center.at),
          curiosityTilesV7({ curiosities, monsters }),
        ).some((at) => at.x === unit.at.x && at.y === unit.at.y)
      )
        return false;
      continue;
    }
    if (
      tile.site !== null ||
      (tile.terrain !== "GRASS" &&
        tile.terrain !== "FOREST" &&
        tile.terrain !== "MOUNTAIN") ||
      Math.max(
        Math.abs(unit.at.x - entry.home.x),
        Math.abs(unit.at.y - entry.home.y),
      ) > MONSTER_HOME_RADIUS_V7 ||
      centers.some(
        (center) =>
          Math.max(
            Math.abs(center.at.x - unit.at.x),
            Math.abs(center.at.y - unit.at.y),
          ) < CURIOSITY_CENTER_DISTANCE_V7,
      )
    )
      return false;
    if (isGuardBreedV7(entry.breed)) {
      const camp = guardCampKindV7(entry.breed);
      if (
        (unit.at.x === entry.home.x && unit.at.y === entry.home.y) ||
        !curiosities.some(
          (curiosity) =>
            curiosity.kind === camp &&
            curiosity.at.x === entry.home.x &&
            curiosity.at.y === entry.home.y,
        )
      )
        return false;
    }
  }
  return true;
}

/**
 * The Dwarf revision (section 5.2) state parsing of the burrowed list: only
 * in a match with a Dwarf seat; every unit of the Dwarf kind (the Mind
 * Control revision: a controlled Mole burrows for its controller); a Mole
 * entry (role
 * with `TUNNEL`, no Mole ID) or a rider entry (role with `RIDES_TUNNEL`, the
 * ID of a burrowed Mole of the same owner on a tile next to its own, one
 * rider per Mole); land form; every mound tile on the board, land, not a
 * Rift, not a settlement site, with no unit and no treasure chest, and not
 * shared by another entry.
 */
function burrowedValid(
  board: BoardStateV7,
  playerById: ReadonlyMap<PlayerStateV7["id"], PlayerStateV7>,
  kindOf: (unit: UnitStateV7) => FactionIdV7 | undefined,
  units: readonly UnitStateV7[],
  burrowed: readonly BurrowedEntryV7[],
  treasureChests: readonly CoordV7[],
  setup: MatchSetupV7,
): boolean {
  if (burrowed.length === 0) return true;
  if (!setup.factions.includes("DWARF")) return false;
  const byId = new Map(burrowed.map((entry) => [entry.unit.id, entry]));
  const tiles = new Set<string>();
  const ridden = new Set<number>();
  for (const entry of burrowed) {
    const unit = entry.unit;
    const owner = playerById.get(unit.ownerId);
    const tile = tileAt(board, unit.at);
    if (
      owner === undefined ||
      kindOf(unit) !== "DWARF" ||
      unit.form !== "LAND" ||
      units.some((other) => other.id === unit.id) ||
      tile === undefined ||
      tile.biome === null ||
      tile.terrain === "RIFT" ||
      tile.site !== null ||
      units.some((other) => sameCoordV7(other.at, unit.at)) ||
      treasureChests.some((chest) => sameCoordV7(chest, unit.at)) ||
      tiles.has(key(unit.at))
    )
      return false;
    tiles.add(key(unit.at));
    const mechanics = roleMechanicsV7(unit.role, "DWARF");
    if (entry.moleUnitId === null) {
      if (mechanics.tunnelRange === 0) return false;
      continue;
    }
    const mole = byId.get(entry.moleUnitId);
    if (
      !mechanics.ridesTunnel ||
      mole === undefined ||
      mole.moleUnitId !== null ||
      mole.unit.ownerId !== unit.ownerId ||
      Math.max(
        Math.abs(mole.unit.at.x - unit.at.x),
        Math.abs(mole.unit.at.y - unit.at.y),
      ) !== 1 ||
      ridden.has(entry.moleUnitId)
    )
      return false;
    ridden.add(entry.moleUnitId);
  }
  return true;
}

/**
 * The Dwarf revision (sections 5.4 and 6.3): `surfacedThisTurn` lists only
 * units on the board of the Dwarf kind owned by the active player;
 * `bombedThisTurn` lists only units on the board, and only in a match with
 * a Dwarf seat. The Mind Control revision (section 5.3): a controlled Mole
 * surfaces, and a controlled Gyrocopter bombs, for its controller, so the
 * active player need not be a Dwarf seat.
 */
function turnListsValid(
  kindOf: (unit: UnitStateV7) => FactionIdV7 | undefined,
  units: readonly UnitStateV7[],
  surfacedThisTurn: readonly UnitId[],
  bombedThisTurn: readonly UnitId[],
  activePlayerId: PlayerStateV7["id"],
  setup: MatchSetupV7,
): boolean {
  if (surfacedThisTurn.length === 0 && bombedThisTurn.length === 0) return true;
  if (!setup.factions.includes("DWARF")) return false;
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  return (
    surfacedThisTurn.every((unitId) => {
      const unit = unitById.get(unitId);
      return (
        unit !== undefined &&
        unit.ownerId === activePlayerId &&
        kindOf(unit) === "DWARF"
      );
    }) && bombedThisTurn.every((unitId) => unitById.has(unitId))
  );
}

/**
 * The Martian balance revision (`pulp_wars-1wy.3`): `beamedThisTurn` lists
 * only units on the board owned by the active player (a controlled unit
 * included); `tractorUsedThisTurn` lists only units on the board owned by
 * the active player whose role, under its kind, has the Heavy Tractor Beam
 * (in land form when it pulled; it may have self-launched since). Both are
 * empty in a match without a Martian seat.
 */
function martianTurnListsValid(
  kindOf: (unit: UnitStateV7) => FactionIdV7 | undefined,
  units: readonly UnitStateV7[],
  beamedThisTurn: readonly UnitId[],
  tractorUsedThisTurn: readonly UnitId[],
  activePlayerId: PlayerStateV7["id"],
  setup: MatchSetupV7,
): boolean {
  if (beamedThisTurn.length === 0 && tractorUsedThisTurn.length === 0)
    return true;
  if (!setup.factions.includes("MARTIAN")) return false;
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const mechanicsOf = (unit: UnitStateV7): RoleMechanicsV7 | undefined => {
    const kind = kindOf(unit);
    return kind === undefined ? undefined : roleMechanicsV7(unit.role, kind);
  };
  return (
    beamedThisTurn.every(
      (unitId) => unitById.get(unitId)?.ownerId === activePlayerId,
    ) &&
    tractorUsedThisTurn.every((unitId) => {
      const unit = unitById.get(unitId);
      // No form test: a Mothership may pull and then end its Move on water
      // (it self-launches) in the same turn.
      return (
        unit !== undefined &&
        unit.ownerId === activePlayerId &&
        mechanicsOf(unit)?.heavyTractorBeam === true
      );
    })
  );
}

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 13): the four
 * Candy lists are empty in a match without a Candy seat. A `sugarRush` entry
 * names a unit on the board of kind `CANDY` in land or embarked form; a
 * `splattedThisTurn` entry a unit on the board that is not a neutral
 * Monster; a `tossedThisTurn` entry a unit on the board in land form; a
 * `crumbs` entry lies on a land tile that is not a settlement site, a Rift,
 * a chest tile, or a curiosity tile, is owned by an active Candy seat, and
 * has a role that leaves Crumbs under the Candy registration.
 */
function candyListsValid(
  value: CrossInput,
  playerById: ReadonlyMap<PlayerStateV7["id"], PlayerStateV7>,
  kindOf: (unit: UnitStateV7) => FactionIdV7 | undefined,
): boolean {
  const { sugarRush, crumbs, splattedThisTurn, tossedThisTurn } = value;
  // Section 5.4: a Rush perk's flag (a Sugar Frenzy continuation, a Donut
  // Racer's Escape) needs a Rushed unit in land form.
  for (const unit of value.units) {
    if (!unit.activation.overrunActive && !unit.activation.escapeAvailable)
      continue;
    const kind = kindOf(unit);
    if (kind === undefined) continue;
    const perk = roleMechanicsV7(unit.role, kind).rushPerk;
    if (
      perk !== null &&
      !sugarRush.some(
        (entry) => entry.unitId === unit.id && entry.phase === "RUSHED",
      )
    )
      return false;
  }
  if (
    sugarRush.length === 0 &&
    crumbs.length === 0 &&
    splattedThisTurn.length === 0 &&
    tossedThisTurn.length === 0
  )
    return true;
  if (!value.setup.factions.includes("CANDY")) return false;
  const unitById = new Map(value.units.map((unit) => [unit.id, unit]));
  for (const entry of sugarRush) {
    const unit = unitById.get(entry.unitId);
    if (
      unit === undefined ||
      unit.hp <= 0 ||
      isNeutralOwnerV7(unit.ownerId) ||
      kindOf(unit) !== "CANDY" ||
      (unit.form !== "LAND" && unit.form !== "EMBARKED")
    )
      return false;
  }
  for (const unitId of splattedThisTurn) {
    const unit = unitById.get(unitId);
    if (unit === undefined || unit.hp <= 0 || isNeutralOwnerV7(unit.ownerId))
      return false;
  }
  for (const unitId of tossedThisTurn) {
    const unit = unitById.get(unitId);
    if (unit === undefined || unit.hp <= 0 || unit.form !== "LAND")
      return false;
  }
  for (const entry of crumbs) {
    const tile = tileAt(value.board, entry.at);
    const owner = playerById.get(entry.ownerId);
    if (
      tile === undefined ||
      tile.biome === null ||
      tile.terrain === "RIFT" ||
      tile.site !== null ||
      value.treasureChests.some((chest) => sameCoordV7(chest, entry.at)) ||
      value.curiosities.some((curiosity) =>
        sameCoordV7(curiosity.at, entry.at),
      ) ||
      owner === undefined ||
      owner.status !== "ACTIVE" ||
      owner.faction !== "CANDY" ||
      !roleMechanicsV7(entry.role, "CANDY").leavesCrumbs
    )
      return false;
  }
  return true;
}

function populationLedgerValid(
  board: BoardStateV7,
  players: readonly PlayerStateV7[],
  cities: readonly CityStateV7[],
  units: readonly UnitStateV7[],
  contributions: readonly PopulationContributionV7[],
  setup: MatchSetupV7,
  humanPlayerId: PlayerStateV7["id"],
): boolean {
  const roadGraph = { board, cities, players, units, setup, humanPlayerId };
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const liveByCoord = new Map<string, PopulationContributionV7>();
  const permanent = new Set<string>();
  for (const contribution of contributions) {
    const city = cityById.get(contribution.cityId);
    if (city === undefined) return false;
    if (contribution.category === "LIVE") {
      if (
        (contribution.source.kind !== "IMPROVEMENT" &&
          contribution.source.kind !== "MONUMENT") ||
        liveByCoord.has(key(contribution.source.at))
      )
        return false;
      const tile = tileAt(board, contribution.source.at);
      if (
        tile?.territoryCityId !== city.id ||
        (contribution.source.kind === "IMPROVEMENT"
          ? tile.improvement !== contribution.source.improvement ||
            (tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
              ? contribution.amount !==
                (units.some(
                  (unit) =>
                    unit.hp > 0 &&
                    isAfloatFormV7(unit.form) &&
                    sameCoordV7(unit.at, tile.at) &&
                    unit.ownerId !== city.ownerId &&
                    !cooperativeAlliesV7(
                      setup.aiMode,
                      humanPlayerId,
                      unit.ownerId,
                      city.ownerId,
                    ),
                )
                  ? 0
                  : // The naval branch section 5.4: Harbours.
                    dockPopulationV7(
                      tile.improvement,
                      harbourPopulationForV7(players, city.ownerId),
                    ))
              : contribution.amount !== liveValue(board, cities, tile))
          : tile.improvement !== "MONUMENT" ||
            contribution.amount !== MONUMENT_POPULATION_V7)
      )
        return false;
      liveByCoord.set(key(tile.at), contribution);
    } else {
      const sourceKey = key(contribution.source.at);
      if (permanent.has(sourceKey)) return false;
      permanent.add(sourceKey);
      if (contribution.source.kind === "CITY_REWARD") {
        if (
          !sameCoordV7(contribution.source.at, city.at) ||
          !city.rewards.some(
            (reward) => reward.reachedLevel === 4 && reward.reward === "BOOM",
          )
        )
          return false;
      } else if (
        tileAt(board, contribution.source.at)?.territoryCityId !== city.id
      )
        return false;
    }
  }
  for (const city of cities) {
    const entries = contributions.filter((entry) => entry.cityId === city.id);
    const permanentTotal = entries
      .filter((entry) => entry.category === "PERMANENT")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const storedLiveTotal = entries
      .filter((entry) => entry.category === "LIVE")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const liveTotal =
      storedLiveTotal + roadPopulationForCityV7(roadGraph, city);
    if (
      !Number.isSafeInteger(permanentTotal) ||
      !Number.isSafeInteger(liveTotal) ||
      permanentTotal !== city.permanentPopulation ||
      liveTotal !== city.economicPopulation
    )
      return false;
  }
  for (const tile of board.tiles) {
    if (
      tile.improvement !== null &&
      tile.improvement !== "MARKET" &&
      !liveByCoord.has(key(tile.at))
    )
      return false;
  }
  const advanced = new Set<string>();
  for (const tile of board.tiles) {
    if (
      tile.territoryCityId === null ||
      tile.improvement === null ||
      ["FARM", "LUMBER_CAMP", "MINE", "PORT"].includes(tile.improvement)
    )
      continue;
    const item = `${tile.territoryCityId}:${tile.improvement}`;
    if (advanced.has(item)) return false;
    advanced.add(item);
  }
  return players.length > 0;
}

function liveValue(
  board: BoardStateV7,
  cities: readonly CityStateV7[],
  tile: TileStateV7,
): number {
  return tile.improvement === null
    ? 0
    : tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
      ? tile.improvement === "SHIPYARD"
        ? 2
        : 1
      : spatialContributionAtV7({ board, cities }, tile.at, tile.improvement)
          .population;
}

// The reward ladder rework (`pulp_wars-zypi`): a record may be a reward
// of the current ladder or of the one before it (it keeps its effect); a
// pending choice lists the current candidates.
function rewardMatchesLevel(reward: RewardIdV7, level: number): boolean {
  return cityRewardRecordMatchesLevelV7(reward, level);
}

function candidateRewardsMatchLevel(
  rewards: readonly RewardIdV7[],
  level: number,
): boolean {
  return cityRewardCandidatesV7(level)?.join() === rewards.join();
}

function growthSpent(level: number): number | null {
  const result = (level * (level + 1)) / 2 - 1;
  return Number.isSafeInteger(result) ? result : null;
}
function tileAt(board: BoardStateV7, at: CoordV7): TileStateV7 | undefined {
  return onBoard(board, at)
    ? board.tiles[at.y * board.width + at.x]
    : undefined;
}
function onBoard(board: BoardStateV7, at: CoordV7): boolean {
  return at.x >= 0 && at.y >= 0 && at.x < board.width && at.y < board.height;
}
function key(at: CoordV7): string {
  return `${at.y},${at.x}`;
}
function sameSet(left: readonly number[], right: readonly number[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}
function isColor(input: unknown): input is PlayerStateV7["color"] {
  return PLAYER_COLORS_V7.includes(input as PlayerStateV7["color"]);
}
/**
 * Revision 12: an improvement never removes the resource beneath it. A Farm
 * always stands on Fertile Ground and a Mine on Ore; a Port or Shipyard may
 * share Fish or Pearls; a Lumber Camp only stands on bare Forest (Game is
 * always visible and blocks it); any other building or Monument may stand on
 * masked Fertile Ground placed before its owner had Gathering.
 */
function resourceUnderImprovementAllowed(
  resource: TileStateV7["resource"],
  improvement: TileStateV7["improvement"],
): boolean {
  switch (improvement) {
    case null:
      return true;
    case "FARM":
      return resource === "FERTILE_GROUND";
    case "MINE":
      return resource === "ORE";
    case "PORT":
    case "SHIPYARD":
      return resource === null || resource === "FISH" || resource === "PEARLS";
    case "LUMBER_CAMP":
      return resource === null;
    default:
      return resource === null || resource === "FERTILE_GROUND";
  }
}
function resourceMatchesTerrain(
  resource: TileStateV7["resource"],
  terrain: TileStateV7["terrain"],
): boolean {
  return (
    resource === null ||
    (resource === "FRUIT" || resource === "FERTILE_GROUND"
      ? terrain === "GRASS"
      : resource === "GAME"
        ? terrain === "FOREST"
        : resource === "ORE"
          ? terrain === "MOUNTAIN"
          : resource === "FISH"
            ? terrain === "SHALLOW_WATER"
            : terrain === "SHALLOW_WATER" || terrain === "DEEP_WATER")
  );
}
function basicImprovementMatchesTerrain(
  improvement: TileStateV7["improvement"],
  terrain: TileStateV7["terrain"],
): boolean {
  return improvement === "FARM"
    ? terrain === "GRASS"
    : improvement === "LUMBER_CAMP"
      ? terrain === "FOREST"
      : improvement === "MINE"
        ? terrain === "MOUNTAIN"
        : improvement === "PORT" || improvement === "SHIPYARD"
          ? terrain === "SHALLOW_WATER"
          : true;
}
