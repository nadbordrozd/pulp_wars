import { canonicalHash, canonicalJson } from "../replay/canonical";
import {
  ACHIEVEMENT_IDS_V7,
  BIOME_IDS_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  REWARD_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  TERRAIN_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type BoardStateV7,
  type AchievementEntitlementV7,
  type AchievementIdV7,
  type CityBlackoutV7,
  type CityRewardRecordV7,
  type CityStateV7,
  type CoordV7,
  type GameStateV7,
  type ImprovementIdV7,
  type MatchOutcomeV7,
  type PendingChoiceV7,
  type PlayerStateV7,
  type PopulationContributionSourceV7,
  type PopulationContributionV7,
  type RandomStateV7,
  type ResourceIdV7,
  type RewardIdV7,
  type SaboteurExposureV7,
  type TechnologyIdV7,
  type TileStateV7,
  type UnitActivationV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { parseMatchSetupV7 } from "./setup";
import { spatialContributionAtV7 } from "./spatial-economy";
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
  "board",
  "cities",
  "commandIndex",
  "humanPlayerId",
  "nextEntityId",
  "outcome",
  "pendingChoices",
  "players",
  "populationContributions",
  "random",
  "round",
  "rulesetId",
  "saboteurExposures",
  "schemaVersion",
  "setup",
  "treasureChests",
  "turnOrder",
  "units",
] as const;

const PREREQUISITE: Readonly<Partial<Record<TechnologyIdV7, TechnologyIdV7>>> =
  {
    FARMING: "GATHERING",
    MILLING: "FARMING",
    MEDICINE: "GATHERING",
    RECOVERY: "MEDICINE",
    FORESTRY: "HUNTING",
    SAWMILLING: "FORESTRY",
    MARKSMANSHIP: "HUNTING",
    FIELDCRAFT: "MARKSMANSHIP",
    ROADS: "SCOUTING",
    COMMERCE: "ROADS",
    RAIDING: "SCOUTING",
    MOUNTED_ARCHERY: "RAIDING",
    FORTIFICATION: "DRILL",
    EXPLOSIVES: "FORTIFICATION",
    ENGINEERING: "DRILL",
    METALLURGY: "ENGINEERING",
    GRAND_WORKS: "ENGINEERING",
  };

const BASE_HP: Readonly<Record<UnitRoleIdV7, number>> = {
  FIGHTER: 10,
  SCOUT: 10,
  MARKSMAN: 10,
  GUARD: 15,
  RAIDER: 10,
  MEDIC: 10,
  CATAPULT: 10,
  SABOTEUR: 10,
  HEAVY: 20,
  HORSE_ARCHER: 10,
  BREACHER: 10,
  JUGGERNAUT: 40,
};

const CAPTURE_ROLES = new Set<UnitRoleIdV7>([
  "FIGHTER",
  "SCOUT",
  "MARKSMAN",
  "GUARD",
  "RAIDER",
  "HEAVY",
  "JUGGERNAUT",
]);

export function parseGameStateV7(input: unknown): GameStateV7 | null {
  if (
    !hasExactKeysV7(input, STATE_KEYS) ||
    input.schemaVersion !== 7 ||
    input.rulesetId !== RULESET_7_ID
  )
    return null;
  const setup = parseMatchSetupV7(input.setup);
  const random = parseRandom(input.random);
  const humanPlayerId = parsePlayerIdV7(input.humanPlayerId);
  const board = setup === null ? null : parseBoard(input.board, setup.width);
  const players =
    setup === null ? null : parsePlayers(input.players, setup.factions.length);
  const cities = parseCities(input.cities);
  const contributions = parseContributions(input.populationContributions);
  const units = parseUnits(input.units);
  const exposures = parseExposures(input.saboteurExposures);
  const treasureChests = parseSortedCoords(input.treasureChests);
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
    exposures === null ||
    treasureChests === null ||
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
  if (
    canonicalJson(setup) !== canonicalJson(input.setup) ||
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
      exposures,
      treasureChests,
      choices,
      outcome,
      humanPlayerId,
      nextEntityId: input.nextEntityId,
      round: input.round,
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
    saboteurExposures: exposures,
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
      "resource",
      "road",
      "site",
      "terrain",
      "territoryCityId",
    ]) ||
    !BIOME_IDS_V7.includes(input.biome as TileStateV7["biome"]) ||
    !TERRAIN_IDS_V7.includes(input.terrain as TileStateV7["terrain"]) ||
    (input.resource !== null &&
      !RESOURCE_IDS_V7.includes(input.resource as ResourceIdV7)) ||
    (input.improvement !== null &&
      !IMPROVEMENT_IDS_V7.includes(input.improvement as ImprovementIdV7)) ||
    typeof input.road !== "boolean" ||
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
    (resource !== null && improvement !== null) ||
    !resourceMatchesTerrain(resource, terrain) ||
    !basicImprovementMatchesTerrain(improvement, terrain) ||
    (input.site !== null &&
      (terrain !== "GRASS" ||
        resource !== null ||
        improvement !== null ||
        input.road))
  )
    return null;
  return {
    at,
    biome: input.biome as TileStateV7["biome"],
    terrain,
    resource,
    improvement,
    road: input.road,
    site: input.site as TileStateV7["site"],
    territoryCityId: territory,
  };
}

function parsePlayers(
  input: unknown,
  count: number,
): readonly PlayerStateV7[] | null {
  if (!isDenseArrayV7(input) || input.length !== count) return null;
  const players: PlayerStateV7[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const player = parsePlayer(input[index]);
    if (
      player === null ||
      player.seat !== index ||
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
      "researchedTechs",
      "seat",
      "spoilsClaimedCityIds",
      "status",
    ]) ||
    !isNonNegativeSafeIntegerV7(input.seat) ||
    (input.controller !== "HUMAN" && input.controller !== "AI") ||
    !isColor(input.color) ||
    input.faction !== "ORIGINAL" ||
    input.factionTreeId !== "ORIGINAL_BASELINE_V4" ||
    (input.status !== "ACTIVE" && input.status !== "ELIMINATED") ||
    !isNonNegativeSafeIntegerV7(input.coins)
  )
    return null;
  const id = parsePlayerIdV7(input.id);
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
    researched === null ||
    researched[0] !== "GATHERING" ||
    explored === null ||
    spoils === null ||
    achievementEntitlements === null ||
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
    faction: "ORIGINAL",
    factionTreeId: "ORIGINAL_BASELINE_V4",
    status: input.status,
    coins: input.coins,
    researchedTechs: researched,
    explored,
    spoilsClaimedCityIds: spoils,
    achievementEntitlements,
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
  if (
    !hasExactKeysV7(input, [
      "at",
      "blackout",
      "economicPopulation",
      "expanded",
      "id",
      "isCapital",
      "level",
      "ownerId",
      "permanentPopulation",
      "population",
      "rewards",
    ]) ||
    !isPositiveSafeIntegerV7(input.level) ||
    !isNonNegativeSafeIntegerV7(input.permanentPopulation) ||
    !isNonNegativeSafeIntegerV7(input.economicPopulation) ||
    !isSafeIntegerV7(input.population) ||
    typeof input.isCapital !== "boolean" ||
    typeof input.expanded !== "boolean"
  )
    return null;
  const id = parseCityIdV7(input.id);
  const owner = parsePlayerIdV7(input.ownerId);
  const at = parseCoordV7(input.at);
  const rewards = parseRewards(input.rewards);
  const blackout = parseBlackout(input.blackout);
  const spent = growthSpent(input.level);
  if (
    id === null ||
    owner === null ||
    at === null ||
    rewards === null ||
    blackout === undefined ||
    spent === null ||
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
    rewards,
    blackout,
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

function parseBlackout(input: unknown): CityBlackoutV7 | null | undefined {
  if (input === null) return null;
  if (
    hasExactKeysV7(input, [
      "phase",
      "plantedRound",
      "sourceOwnerId",
      "sourceUnitId",
    ]) &&
    input.phase === "PENDING"
  ) {
    const unit = parseUnitIdV7(input.sourceUnitId);
    const owner = parsePlayerIdV7(input.sourceOwnerId);
    return unit !== null &&
      owner !== null &&
      isPositiveSafeIntegerV7(input.plantedRound)
      ? {
          phase: "PENDING",
          sourceUnitId: unit,
          sourceOwnerId: owner,
          plantedRound: input.plantedRound,
        }
      : undefined;
  }
  if (
    hasExactKeysV7(input, ["phase", "sourceOwnerId", "suppressedCoins"]) &&
    input.phase === "ACTIVE"
  ) {
    const owner = parsePlayerIdV7(input.sourceOwnerId);
    return owner !== null &&
      isNonNegativeSafeIntegerV7(input.suppressedCoins) &&
      input.suppressedCoins <= 3
      ? {
          phase: "ACTIVE",
          sourceOwnerId: owner,
          suppressedCoins: input.suppressedCoins,
        }
      : undefined;
  }
  if (
    hasExactKeysV7(input, [
      "phase",
      "recoveryOwnerId",
      "unaffectedTurnStarted",
    ]) &&
    input.phase === "RECOVERY"
  ) {
    const owner = parsePlayerIdV7(input.recoveryOwnerId);
    return owner !== null && typeof input.unaffectedTurnStarted === "boolean"
      ? {
          phase: "RECOVERY",
          recoveryOwnerId: owner,
          unaffectedTurnStarted: input.unaffectedTurnStarted,
        }
      : undefined;
  }
  return undefined;
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
        candidate.amount !== (source.kind === "CITY_REWARD" ? 3 : 1)) ||
      (source.kind === "MONUMENT" && candidate.amount !== 3) ||
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
    (input.action === "HARVEST_FRUIT" || input.action === "HUNT_GAME")
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

function parseUnits(input: unknown): readonly UnitStateV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: UnitStateV7[] = [];
  for (const candidate of input) {
    const unit = parseUnit(candidate);
    if (unit === null || (values.at(-1)?.id ?? 0) >= unit.id) return null;
    values.push(unit);
  }
  return values;
}

function parseUnit(input: unknown): UnitStateV7 | null {
  if (
    !hasExactKeysV7(input, [
      "activation",
      "at",
      "blackoutEligibleRound",
      "captureEligible",
      "homeCityId",
      "hp",
      "id",
      "kills",
      "maxHp",
      "ownerId",
      "role",
      "veteran",
    ]) ||
    !UNIT_ROLE_IDS_V7.includes(input.role as UnitRoleIdV7) ||
    !isPositiveSafeIntegerV7(input.hp) ||
    !isPositiveSafeIntegerV7(input.maxHp) ||
    input.hp > input.maxHp ||
    !isNonNegativeSafeIntegerV7(input.kills) ||
    typeof input.veteran !== "boolean" ||
    typeof input.captureEligible !== "boolean"
  )
    return null;
  const id = parseUnitIdV7(input.id);
  const owner = parsePlayerIdV7(input.ownerId);
  const home =
    input.homeCityId === null ? null : parseCityIdV7(input.homeCityId);
  const at = parseCoordV7(input.at);
  const activation = parseActivation(input.activation);
  const role = input.role as UnitRoleIdV7;
  if (
    id === null ||
    owner === null ||
    (input.homeCityId !== null && home === null) ||
    at === null ||
    activation === null ||
    input.maxHp !== BASE_HP[role] + (input.veteran ? 5 : 0) ||
    (input.veteran && input.kills < 3) ||
    (input.captureEligible && !CAPTURE_ROLES.has(role)) ||
    (role === "SABOTEUR"
      ? !isPositiveSafeIntegerV7(input.blackoutEligibleRound)
      : input.blackoutEligibleRound !== null) ||
    (role !== "HORSE_ARCHER" && activation.attacksUsed > 1) ||
    activation.attacked !== activation.attacksUsed > 0
  )
    return null;
  return {
    id,
    ownerId: owner,
    homeCityId: home,
    role,
    at,
    hp: input.hp,
    maxHp: input.maxHp,
    kills: input.kills,
    veteran: input.veteran,
    captureEligible: input.captureEligible,
    activation,
    blackoutEligibleRound: input.blackoutEligibleRound as number | null,
  };
}

function parseActivation(input: unknown): UnitActivationV7 | null {
  if (
    !hasExactKeysV7(input, [
      "attacked",
      "attacksUsed",
      "captured",
      "handled",
      "healed",
      "moved",
      "movedPathLength",
      "recovered",
      "specialActed",
    ]) ||
    !isNonNegativeSafeIntegerV7(input.movedPathLength) ||
    (input.attacksUsed !== 0 &&
      input.attacksUsed !== 1 &&
      input.attacksUsed !== 2) ||
    ![
      input.attacked,
      input.captured,
      input.handled,
      input.healed,
      input.moved,
      input.recovered,
      input.specialActed,
    ].every((value) => typeof value === "boolean") ||
    (!input.moved && input.movedPathLength !== 0)
  )
    return null;
  return {
    moved: input.moved as boolean,
    movedPathLength: input.movedPathLength,
    attacked: input.attacked as boolean,
    attacksUsed: input.attacksUsed,
    healed: input.healed as boolean,
    recovered: input.recovered as boolean,
    captured: input.captured as boolean,
    handled: input.handled as boolean,
    specialActed: input.specialActed as boolean,
  };
}

function parseExposures(input: unknown): readonly SaboteurExposureV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const values: SaboteurExposureV7[] = [];
  let previousKey: readonly [number, number] | null = null;
  for (const candidate of input) {
    if (
      !hasExactKeysV7(candidate, [
        "anchorPlayerId",
        "clearsAtAnchorNextEndTurn",
        "reason",
        "unitId",
      ]) ||
      candidate.clearsAtAnchorNextEndTurn !== true ||
      (candidate.reason !== "ATTACK" &&
        candidate.reason !== "PILLAGE" &&
        candidate.reason !== "BLACKOUT")
    )
      return null;
    const unit = parseUnitIdV7(candidate.unitId);
    const anchor = parsePlayerIdV7(candidate.anchorPlayerId);
    if (unit === null || anchor === null) return null;
    const currentKey = [unit, anchor] as const;
    if (
      previousKey !== null &&
      (currentKey[0] < previousKey[0] ||
        (currentKey[0] === previousKey[0] && currentKey[1] <= previousKey[1]))
    )
      return null;
    values.push({
      unitId: unit,
      anchorPlayerId: anchor,
      reason: candidate.reason,
      clearsAtAnchorNextEndTurn: true,
    });
    previousKey = currentKey;
  }
  return values;
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
      rewards.length !== 2 ||
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
  exposures: readonly SaboteurExposureV7[];
  treasureChests: readonly CoordV7[];
  choices: readonly PendingChoiceV7[];
  outcome: MatchOutcomeV7 | null;
  humanPlayerId: PlayerStateV7["id"];
  nextEntityId: number;
  round: number;
}

function validateCrossReferences(value: CrossInput): boolean {
  const {
    board,
    players,
    cities,
    contributions,
    units,
    exposures,
    treasureChests,
    choices,
    outcome,
  } = value;
  const playerById = new Map(players.map((player) => [player.id, player]));
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const entityIds = [
    ...cities.map((item) => item.id),
    ...contributions.map((item) => item.id),
    ...units.map((item) => item.id),
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
    units.some(
      (unit) =>
        !playerById.has(unit.ownerId) ||
        (unit.homeCityId !== null &&
          cityById.get(unit.homeCityId)?.ownerId !== unit.ownerId),
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
          units.some((unit) => unit.ownerId === player.id)),
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
      city.expanded !==
        city.rewards.some((reward) => reward.reward === "EXPAND")
    )
      return false;
    if (
      city.blackout?.phase === "RECOVERY" &&
      city.blackout.recoveryOwnerId !== city.ownerId
    )
      return false;
    if (city.blackout?.phase === "PENDING") {
      if (
        !playerById.has(city.blackout.sourceOwnerId) ||
        city.blackout.plantedRound > value.round ||
        city.blackout.sourceUnitId >= value.nextEntityId
      )
        return false;
      const source = unitById.get(city.blackout.sourceUnitId);
      if (source !== undefined && source.role !== "SABOTEUR") return false;
    } else if (
      city.blackout?.phase === "ACTIVE" &&
      !playerById.has(city.blackout.sourceOwnerId)
    )
      return false;
  }
  for (const player of players) {
    if (
      player.status === "ACTIVE" &&
      !cities.some((city) => city.ownerId === player.id)
    )
      return false;
  }
  const firstUnrewarded = [...cities]
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
      (firstUnrewarded.level >= 5 &&
        !hasRewardPlacement(board, players, units, firstUnrewarded.city))
    )
      return false;
  }
  if (!populationLedgerValid(board, players, cities, contributions))
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
  const exposureKeys = new Set<string>();
  for (const exposure of exposures) {
    const unit = unitById.get(exposure.unitId);
    const anchor = playerById.get(exposure.anchorPlayerId);
    const exposureKey = `${exposure.unitId}:${exposure.anchorPlayerId}`;
    if (
      unit?.role !== "SABOTEUR" ||
      anchor?.status !== "ACTIVE" ||
      exposureKeys.has(exposureKey)
    )
      return false;
    exposureKeys.add(exposureKey);
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
      tile.terrain === "MOUNTAIN" ||
      tile.site !== null ||
      tile.resource !== null ||
      tile.improvement !== null ||
      units.some((unit) => sameCoordV7(unit.at, chest))
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
  }
  return true;
}

function populationLedgerValid(
  board: BoardStateV7,
  players: readonly PlayerStateV7[],
  cities: readonly CityStateV7[],
  contributions: readonly PopulationContributionV7[],
): boolean {
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
            contribution.amount !== liveValue(board, cities, tile)
          : tile.improvement !== "MONUMENT" || contribution.amount !== 3)
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
    const liveTotal = entries
      .filter((entry) => entry.category === "LIVE")
      .reduce((sum, entry) => sum + entry.amount, 0);
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
      ["FARM", "LUMBER_CAMP", "MINE"].includes(tile.improvement)
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
    : spatialContributionAtV7({ board, cities }, tile.at, tile.improvement)
        .population;
}

function hasRewardPlacement(
  board: BoardStateV7,
  players: readonly PlayerStateV7[],
  units: readonly UnitStateV7[],
  city: CityStateV7,
): boolean {
  const engineered = players
    .find((player) => player.id === city.ownerId)
    ?.researchedTechs.includes("ENGINEERING");
  return board.tiles.some(
    (tile) =>
      tile.territoryCityId === city.id &&
      (tile.terrain !== "MOUNTAIN" || engineered) &&
      !units.some((unit) => unit.hp > 0 && sameCoordV7(unit.at, tile.at)),
  );
}

function rewardMatchesLevel(reward: RewardIdV7, level: number): boolean {
  return level === 2
    ? reward === "SURVEY" || reward === "STOCKPILE"
    : level === 3
      ? reward === "WALLS" || reward === "MILITIA"
      : level === 4
        ? reward === "EXPAND" || reward === "BOOM"
        : level >= 5 && (reward === "JUGGERNAUT" || reward === "TREASURY");
}

function candidateRewardsMatchLevel(
  rewards: readonly RewardIdV7[],
  level: number,
): boolean {
  const expected =
    level === 2
      ? ["SURVEY", "STOCKPILE"]
      : level === 3
        ? ["WALLS", "MILITIA"]
        : level === 4
          ? ["EXPAND", "BOOM"]
          : level >= 5
            ? ["JUGGERNAUT", "TREASURY"]
            : [];
  return rewards[0] === expected[0] && rewards[1] === expected[1];
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
  return (
    input === "CORAL" ||
    input === "TEAL" ||
    input === "GOLD" ||
    input === "VIOLET"
  );
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
        : terrain === "MOUNTAIN")
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
        : true;
}
