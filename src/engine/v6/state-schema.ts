import { playerId, wallId } from "../model/ids";
import { canonicalHash, canonicalJson } from "../replay/canonical";
import {
  factionTechnologyTreeV6,
  getFactionTechnologyTreeV6,
} from "../rules/ruleset-v6";
import {
  hasExactKeysV6,
  isDenseArrayV6,
  isNonNegativeSafeIntegerV6,
  isPositiveSafeIntegerV6,
  parseCityIdV6,
  parseCoordV6,
  parseUnitIdV6,
} from "./commands";
import { parseMatchSetupV6 } from "./setup";
import { growthSpentV6 } from "./economy";
import { livePopulationAtV6 } from "./spatial-economy";
import {
  ECONOMIC_IMPROVEMENT_IDS,
  GAME_STATE_SCHEMA_VERSION_6,
  RESOURCE_IDS,
  REWARD_IDS_V6,
  RULESET_6_ID,
  TECHNOLOGY_IDS,
  TERRAIN_IDS_V6,
  UNIT_ROLE_IDS,
  type BoardStateV6,
  type ChocolateWallStateV6,
  type CityRewardRecordV6,
  type CityStateV6,
  type CoordV6,
  type EconomicImprovementId,
  type FactionIdV6,
  type GameStateV6,
  type MatchOutcomeV6,
  type PendingChoiceV6,
  type PopulationContributionV6,
  type PlayerStateV6,
  type RandomStateV6,
  type RewardIdV6,
  type TechnologyId,
  type TileStateV6,
  type UnitActivationV6,
  type UnitRoleId,
  type UnitStateV6,
} from "./types";

const STATE_KEYS_V6 = [
  "activeSeatIndex",
  "board",
  "chocolateWalls",
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
  "schemaVersion",
  "setup",
  "turnOrder",
  "units",
] as const;

/** Parses and reconstructs the exact canonical ruleset-6 state shape. */
export function parseGameStateV6(input: unknown): GameStateV6 | null {
  if (!hasExactKeysV6(input, STATE_KEYS_V6)) return null;
  if (
    input.schemaVersion !== GAME_STATE_SCHEMA_VERSION_6 ||
    input.rulesetId !== RULESET_6_ID
  ) {
    return null;
  }
  const setup = parseMatchSetupV6(input.setup);
  const random = parseRandom(input.random);
  const humanPlayerId = parsePlayerId(input.humanPlayerId);
  const board = setup === null ? null : parseBoard(input.board, setup.width);
  const players =
    setup === null ? null : parsePlayers(input.players, setup.factions);
  const cities = parseCities(input.cities);
  const populationContributions = parsePopulationContributions(
    input.populationContributions,
  );
  const units = parseUnits(input.units);
  const walls = parseWalls(input.chocolateWalls);
  const pendingChoices = parsePendingChoices(input.pendingChoices);
  const outcome = parseOutcome(input.outcome);
  const turnOrder = parsePlayerIdArray(input.turnOrder);
  if (
    setup === null ||
    random === null ||
    humanPlayerId === null ||
    board === null ||
    players === null ||
    cities === null ||
    populationContributions === null ||
    units === null ||
    walls === null ||
    pendingChoices === null ||
    outcome === undefined ||
    turnOrder === null ||
    !isPositiveSafeIntegerV6(input.nextEntityId) ||
    !isNonNegativeSafeIntegerV6(input.commandIndex) ||
    !isPositiveSafeIntegerV6(input.round) ||
    !isNonNegativeSafeIntegerV6(input.activeSeatIndex)
  ) {
    return null;
  }
  if (
    canonicalJson(setup) !== canonicalJson(input.setup) ||
    players.length !== setup.aiCount + 1 ||
    turnOrder.length !== players.length ||
    input.activeSeatIndex >= turnOrder.length ||
    players[0]?.controller !== "HUMAN" ||
    players[0].id !== humanPlayerId ||
    players[0].color !== setup.humanColor ||
    players.slice(1).some((player) => player.controller !== "AI") ||
    players.filter((player) => player.controller === "HUMAN").length !== 1 ||
    players.find((player) => player.controller === "HUMAN")?.id !==
      humanPlayerId ||
    !sameNumericSet(
      turnOrder,
      players.map((player) => player.id),
    ) ||
    !crossReferencesAreValid(
      board,
      players,
      cities,
      populationContributions,
      units,
      walls,
      pendingChoices,
      outcome,
    ) ||
    input.nextEntityId <=
      greatestEntityId(cities, populationContributions, units, walls)
  ) {
    return null;
  }
  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION_6,
    rulesetId: RULESET_6_ID,
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
    populationContributions,
    units,
    chocolateWalls: walls,
    pendingChoices,
    outcome,
  };
}

export function canonicalGameStateJsonV6(input: unknown): string {
  const state = parseGameStateV6(input);
  if (state === null) throw new TypeError("Invalid ruleset-6 game state");
  return canonicalJson(state);
}

export function canonicalGameStateHashV6(input: unknown): string {
  const state = parseGameStateV6(input);
  if (state === null) throw new TypeError("Invalid ruleset-6 game state");
  return canonicalHash(state);
}

function parseRandom(input: unknown): RandomStateV6 | null {
  return hasExactKeysV6(input, ["algorithm", "version", "state"]) &&
    input.algorithm === "MULBERRY32" &&
    input.version === 1 &&
    isUint32(input.state)
    ? { algorithm: "MULBERRY32", version: 1, state: input.state }
    : null;
}

function parseBoard(
  input: unknown,
  size: BoardStateV6["width"],
): BoardStateV6 | null {
  if (
    !hasExactKeysV6(input, ["width", "height", "tiles"]) ||
    input.width !== size ||
    input.height !== size ||
    !isDenseArrayV6(input.tiles) ||
    input.tiles.length !== size * size
  ) {
    return null;
  }
  const tiles: TileStateV6[] = [];
  for (let index = 0; index < input.tiles.length; index += 1) {
    const tile = parseTile(input.tiles[index]);
    const expected = { x: index % size, y: Math.floor(index / size) };
    if (tile === null || !sameCoord(tile.at, expected)) return null;
    tiles.push(tile);
  }
  return { width: size, height: size, tiles };
}

function parseTile(input: unknown): TileStateV6 | null {
  if (
    !hasExactKeysV6(input, [
      "at",
      "improvement",
      "resource",
      "road",
      "site",
      "terrain",
      "territoryCityId",
    ]) ||
    !TERRAIN_IDS_V6.includes(input.terrain as TileStateV6["terrain"]) ||
    (input.resource !== null &&
      !RESOURCE_IDS.includes(
        input.resource as TileStateV6["resource"] & string,
      )) ||
    (input.improvement !== null &&
      !ECONOMIC_IMPROVEMENT_IDS.includes(
        input.improvement as TileStateV6["improvement"] & string,
      )) ||
    typeof input.road !== "boolean" ||
    (input.site !== null &&
      input.site !== "CAPITAL" &&
      input.site !== "VILLAGE" &&
      input.site !== "CITY")
  ) {
    return null;
  }
  const at = parseCoordV6(input.at);
  const territoryCityId =
    input.territoryCityId === null
      ? null
      : parseCityIdV6(input.territoryCityId);
  if (
    at === null ||
    (input.territoryCityId !== null && territoryCityId === null)
  )
    return null;
  const terrain = input.terrain as TileStateV6["terrain"];
  const resource = input.resource as TileStateV6["resource"];
  const improvement = input.improvement as TileStateV6["improvement"];
  if (
    (resource !== null && improvement !== null) ||
    !resourceMatchesTerrain(resource, terrain) ||
    !basicImprovementMatchesTerrain(improvement, terrain) ||
    (input.site !== null &&
      (terrain !== "GRASS" ||
        resource !== null ||
        improvement !== null ||
        input.road))
  ) {
    return null;
  }
  return {
    at,
    terrain,
    resource,
    improvement,
    road: input.road,
    site: input.site as TileStateV6["site"],
    territoryCityId,
  };
}

function parsePlayers(
  input: unknown,
  factions: readonly FactionIdV6[],
): readonly PlayerStateV6[] | null {
  if (!isDenseArrayV6(input) || input.length !== factions.length) return null;
  const players: PlayerStateV6[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const player = parsePlayer(input[index]);
    if (
      player === null ||
      player.seat !== index ||
      player.faction !== factions[index] ||
      player.factionTreeId !== factionTechnologyTreeV6(player.faction).id
    ) {
      return null;
    }
    players.push(player);
  }
  return idsStrictlyAscending(players) ? players : null;
}

function parsePlayer(input: unknown): PlayerStateV6 | null {
  if (
    !hasExactKeysV6(input, [
      "coins",
      "color",
      "controller",
      "explored",
      "faction",
      "factionTreeId",
      "id",
      "researchedTechs",
      "seat",
      "status",
    ]) ||
    !isNonNegativeSafeIntegerV6(input.seat) ||
    (input.controller !== "HUMAN" && input.controller !== "AI") ||
    !isPlayerColor(input.color) ||
    (input.faction !== "ORIGINAL" && input.faction !== "CANDY") ||
    (input.factionTreeId !== "ORIGINAL_BASELINE" &&
      input.factionTreeId !== "CANDY_BASELINE_V1") ||
    (input.status !== "ACTIVE" && input.status !== "ELIMINATED") ||
    !isNonNegativeSafeIntegerV6(input.coins)
  ) {
    return null;
  }
  const id = parsePlayerId(input.id);
  const researchedTechs = parseOrderedStringArray(
    input.researchedTechs,
    TECHNOLOGY_IDS,
  );
  const explored = parseSortedCoords(input.explored);
  const tree = getFactionTechnologyTreeV6(input.factionTreeId as string);
  if (
    id === null ||
    researchedTechs === null ||
    explored === null ||
    tree === undefined ||
    researchedTechs[0] !== "GATHERING"
  ) {
    return null;
  }
  const prerequisiteMissing = researchedTechs.some((technology) => {
    const node = tree.nodes.find((candidate) => candidate.id === technology);
    return (
      node === undefined ||
      node.prerequisites.some(
        (prerequisite) => !researchedTechs.includes(prerequisite),
      )
    );
  });
  if (prerequisiteMissing) return null;
  return {
    id,
    seat: input.seat,
    controller: input.controller,
    color: input.color,
    faction: input.faction,
    factionTreeId: input.factionTreeId,
    status: input.status,
    coins: input.coins,
    researchedTechs: researchedTechs as readonly TechnologyId[],
    explored,
  };
}

function parseCities(input: unknown): readonly CityStateV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const cities: CityStateV6[] = [];
  for (const candidate of input) {
    const city = parseCity(candidate);
    if (city === null) return null;
    cities.push(city);
  }
  return idsStrictlyAscending(cities) ? cities : null;
}

function parseCity(input: unknown): CityStateV6 | null {
  if (
    !hasExactKeysV6(input, [
      "at",
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
    !isPositiveSafeIntegerV6(input.level) ||
    !isNonNegativeSafeIntegerV6(input.permanentPopulation) ||
    !isNonNegativeSafeIntegerV6(input.economicPopulation) ||
    !isSafeInteger(input.population) ||
    typeof input.isCapital !== "boolean" ||
    typeof input.expanded !== "boolean"
  ) {
    return null;
  }
  const id = parseCityIdV6(input.id);
  const ownerId = parsePlayerId(input.ownerId);
  const at = parseCoordV6(input.at);
  const rewards = parseCityRewards(input.rewards);
  let growthSpent: number;
  try {
    growthSpent = growthSpentV6(input.level);
  } catch {
    return null;
  }
  if (
    id === null ||
    ownerId === null ||
    at === null ||
    rewards === null ||
    input.population !==
      input.permanentPopulation + input.economicPopulation - growthSpent ||
    input.population >= input.level + 1
  ) {
    return null;
  }
  return {
    id,
    ownerId,
    at,
    level: input.level,
    permanentPopulation: input.permanentPopulation,
    economicPopulation: input.economicPopulation,
    population: input.population,
    isCapital: input.isCapital,
    expanded: input.expanded,
    rewards,
  };
}

function parseCityRewards(
  input: unknown,
): readonly CityRewardRecordV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const rewards: CityRewardRecordV6[] = [];
  let previousLevel = 1;
  for (const candidate of input) {
    if (
      !hasExactKeysV6(candidate, ["reachedLevel", "reward"]) ||
      !isPositiveSafeIntegerV6(candidate.reachedLevel) ||
      candidate.reachedLevel <= previousLevel ||
      !REWARD_IDS_V6.includes(candidate.reward as RewardIdV6) ||
      !rewardMatchesLevel(
        candidate.reward as RewardIdV6,
        candidate.reachedLevel,
      )
    ) {
      return null;
    }
    rewards.push({
      reachedLevel: candidate.reachedLevel,
      reward: candidate.reward as RewardIdV6,
    });
    previousLevel = candidate.reachedLevel;
  }
  return rewards;
}

function parsePopulationContributions(
  input: unknown,
): readonly PopulationContributionV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const contributions: PopulationContributionV6[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV6(candidate, [
        "amount",
        "category",
        "cityId",
        "id",
        "source",
      ]) ||
      !isPositiveSafeIntegerV6(candidate.id) ||
      !isNonNegativeSafeIntegerV6(candidate.amount) ||
      (candidate.category !== "PERMANENT" && candidate.category !== "LIVE")
    ) {
      return null;
    }
    const city = parseCityIdV6(candidate.cityId);
    const source = parsePopulationContributionSource(candidate.source);
    if (
      city === null ||
      source === null ||
      (candidate.category === "PERMANENT") !==
        (source.kind !== "IMPROVEMENT") ||
      (candidate.category === "PERMANENT" &&
        candidate.amount !== (source.kind === "CITY_REWARD" ? 3 : 1))
    ) {
      return null;
    }
    contributions.push({
      id: candidate.id,
      cityId: city,
      category: candidate.category,
      amount: candidate.amount,
      source,
    });
  }
  return idsStrictlyAscending(contributions) ? contributions : null;
}

function parsePopulationContributionSource(
  input: unknown,
): PopulationContributionV6["source"] | null {
  if (
    hasExactKeysV6(input, ["action", "at", "kind"]) &&
    input.kind === "RESOURCE_ACTION" &&
    (input.action === "HARVEST_FRUIT" || input.action === "HUNT_GAME")
  ) {
    const at = parseCoordV6(input.at);
    return at === null
      ? null
      : { kind: "RESOURCE_ACTION", action: input.action, at };
  }
  if (
    hasExactKeysV6(input, ["at", "improvement", "kind"]) &&
    input.kind === "IMPROVEMENT" &&
    ECONOMIC_IMPROVEMENT_IDS.includes(
      input.improvement as EconomicImprovementId,
    )
  ) {
    const at = parseCoordV6(input.at);
    return at === null
      ? null
      : {
          kind: "IMPROVEMENT",
          improvement: input.improvement as EconomicImprovementId,
          at,
        };
  }
  if (
    hasExactKeysV6(input, ["at", "kind", "reachedLevel", "reward"]) &&
    input.kind === "CITY_REWARD" &&
    input.reward === "BOOM" &&
    input.reachedLevel === 4
  ) {
    const at = parseCoordV6(input.at);
    return at === null
      ? null
      : { kind: "CITY_REWARD", reward: "BOOM", reachedLevel: 4, at };
  }
  return null;
}

function parseUnits(input: unknown): readonly UnitStateV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const units: UnitStateV6[] = [];
  for (const candidate of input) {
    const unit = parseUnit(candidate);
    if (unit === null) return null;
    units.push(unit);
  }
  return idsStrictlyAscending(units) ? units : null;
}

function parseUnit(input: unknown): UnitStateV6 | null {
  if (
    !hasExactKeysV6(input, [
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
      "veteran",
    ]) ||
    !UNIT_ROLE_IDS.includes(input.role as UnitRoleId) ||
    !isPositiveSafeIntegerV6(input.hp) ||
    !isPositiveSafeIntegerV6(input.maxHp) ||
    input.hp > input.maxHp ||
    !isNonNegativeSafeIntegerV6(input.kills) ||
    typeof input.veteran !== "boolean" ||
    typeof input.captureEligible !== "boolean"
  ) {
    return null;
  }
  const id = parseUnitIdV6(input.id);
  const ownerId = parsePlayerId(input.ownerId);
  const homeCityId =
    input.homeCityId === null ? null : parseCityIdV6(input.homeCityId);
  const at = parseCoordV6(input.at);
  const activation = parseActivation(input.activation);
  if (
    id === null ||
    ownerId === null ||
    (input.homeCityId !== null && homeCityId === null) ||
    at === null ||
    activation === null
  ) {
    return null;
  }
  return {
    id,
    ownerId,
    homeCityId,
    role: input.role as UnitRoleId,
    at,
    hp: input.hp,
    maxHp: input.maxHp,
    kills: input.kills,
    veteran: input.veteran,
    captureEligible: input.captureEligible,
    activation,
  };
}

function parseActivation(input: unknown): UnitActivationV6 | null {
  if (
    !hasExactKeysV6(input, [
      "attacked",
      "captured",
      "handled",
      "healed",
      "moved",
      "movedPathLength",
      "recovered",
      "specialActed",
    ]) ||
    !isNonNegativeSafeIntegerV6(input.movedPathLength) ||
    ![
      input.attacked,
      input.captured,
      input.handled,
      input.healed,
      input.moved,
      input.recovered,
      input.specialActed,
    ].every((value) => typeof value === "boolean")
  ) {
    return null;
  }
  return {
    moved: input.moved as boolean,
    movedPathLength: input.movedPathLength,
    attacked: input.attacked as boolean,
    healed: input.healed as boolean,
    recovered: input.recovered as boolean,
    captured: input.captured as boolean,
    handled: input.handled as boolean,
    specialActed: input.specialActed as boolean,
  };
}

function parseWalls(input: unknown): readonly ChocolateWallStateV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const walls: ChocolateWallStateV6[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV6(candidate, ["at", "hp", "id", "ownerId"]) ||
      !isPositiveSafeIntegerV6(candidate.hp)
    ) {
      return null;
    }
    const id = parseWallId(candidate.id);
    const ownerId = parsePlayerId(candidate.ownerId);
    const at = parseCoordV6(candidate.at);
    if (id === null || ownerId === null || at === null) return null;
    walls.push({ id, ownerId, at, hp: candidate.hp });
  }
  return idsStrictlyAscending(walls) ? walls : null;
}

function parsePendingChoices(
  input: unknown,
): readonly PendingChoiceV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const choices: PendingChoiceV6[] = [];
  for (const candidate of input) {
    if (
      !hasExactKeysV6(candidate, [
        "kind",
        ...(isRecordKind(candidate, "CITY_REWARD")
          ? ["cityId", "reachedLevel", "candidates"]
          : isRecordKind(candidate, "CANDIFY_CITY")
            ? ["unitId", "candidateCityIds"]
            : []),
      ])
    ) {
      return null;
    }
    if (candidate.kind === "CITY_REWARD") {
      const city = parseCityIdV6(candidate.cityId);
      const candidates = parseOrderedStringArray(
        candidate.candidates,
        REWARD_IDS_V6,
      );
      if (
        city === null ||
        !isPositiveSafeIntegerV6(candidate.reachedLevel) ||
        candidates === null ||
        candidates.length !== 2 ||
        !candidateRewardsMatchLevel(
          candidates as readonly RewardIdV6[],
          candidate.reachedLevel,
        )
      ) {
        return null;
      }
      choices.push({
        kind: "CITY_REWARD",
        cityId: city,
        reachedLevel: candidate.reachedLevel,
        candidates: candidates as readonly RewardIdV6[],
      });
    } else {
      const unit = parseUnitIdV6(candidate.unitId);
      const candidateCityIds = parseAscendingIdArray(
        candidate.candidateCityIds,
        parseCityIdV6,
      );
      if (
        unit === null ||
        candidateCityIds === null ||
        candidateCityIds.length === 0
      )
        return null;
      choices.push({ kind: "CANDIFY_CITY", unitId: unit, candidateCityIds });
    }
  }
  return choices;
}

function parseOutcome(input: unknown): MatchOutcomeV6 | null | undefined {
  if (input === null) return null;
  if (
    !hasExactKeysV6(input, [
      "kind",
      ...(isRecordKind(input, "VICTORY") ||
      isRecordKind(input, "HEADLESS_VICTORY")
        ? ["winnerId"]
        : isRecordKind(input, "DEFEAT")
          ? ["humanId", "defeatedByPlayerId"]
          : []),
    ])
  ) {
    return undefined;
  }
  if (input.kind === "VICTORY" || input.kind === "HEADLESS_VICTORY") {
    const winnerId = parsePlayerId(input.winnerId);
    return winnerId === null ? undefined : { kind: input.kind, winnerId };
  }
  const humanId = parsePlayerId(input.humanId);
  const defeatedByPlayerId = parsePlayerId(input.defeatedByPlayerId);
  return humanId === null || defeatedByPlayerId === null
    ? undefined
    : { kind: "DEFEAT", humanId, defeatedByPlayerId };
}

function parsePlayerIdArray(
  input: unknown,
): readonly ReturnType<typeof playerId>[] | null {
  return parseAscendingIdArray(input, parsePlayerId, false);
}

function parseAscendingIdArray<T extends number>(
  input: unknown,
  parser: (value: unknown) => T | null,
  requireAscending = true,
): readonly T[] | null {
  if (!isDenseArrayV6(input)) return null;
  const values: T[] = [];
  for (const candidate of input) {
    const value = parser(candidate);
    if (
      value === null ||
      (requireAscending &&
        values.at(-1) !== undefined &&
        value <= (values.at(-1) as T))
    ) {
      return null;
    }
    values.push(value);
  }
  return values;
}

function parseSortedCoords(input: unknown): readonly CoordV6[] | null {
  if (!isDenseArrayV6(input)) return null;
  const coordinates: CoordV6[] = [];
  for (const candidate of input) {
    const at = parseCoordV6(candidate);
    const previous = coordinates.at(-1);
    if (
      at === null ||
      (previous !== undefined && compareCoords(previous, at) >= 0)
    )
      return null;
    coordinates.push(at);
  }
  return coordinates;
}

function parseOrderedStringArray<T extends string>(
  input: unknown,
  order: readonly T[],
): readonly T[] | null {
  if (!isDenseArrayV6(input)) return null;
  const values: T[] = [];
  let previousOrdinal = -1;
  for (const candidate of input) {
    const ordinal = order.indexOf(candidate as T);
    if (ordinal <= previousOrdinal) return null;
    values.push(candidate as T);
    previousOrdinal = ordinal;
  }
  return values;
}

function crossReferencesAreValid(
  board: BoardStateV6,
  players: readonly PlayerStateV6[],
  cities: readonly CityStateV6[],
  contributions: readonly PopulationContributionV6[],
  units: readonly UnitStateV6[],
  walls: readonly ChocolateWallStateV6[],
  pendingChoices: readonly PendingChoiceV6[],
  outcome: MatchOutcomeV6 | null,
): boolean {
  const playerIds = new Set(players.map((player) => player.id));
  const cityIds = new Set(cities.map((city) => city.id));
  const unitIds = new Set(units.map((unit) => unit.id));
  const entityIds = [
    ...cities.map((city) => city.id),
    ...contributions.map((contribution) => contribution.id),
    ...units.map((unit) => unit.id),
    ...walls.map((wall) => wall.id),
  ];
  if (
    new Set(entityIds).size !== entityIds.length ||
    cities.some((city) => !playerIds.has(city.ownerId)) ||
    contributions.some((contribution) => !cityIds.has(contribution.cityId)) ||
    units.some(
      (unit) =>
        !playerIds.has(unit.ownerId) ||
        (unit.homeCityId !== null && !cityIds.has(unit.homeCityId)),
    ) ||
    walls.some((wall) => !playerIds.has(wall.ownerId)) ||
    board.tiles.some(
      (tile) =>
        tile.territoryCityId !== null && !cityIds.has(tile.territoryCityId),
    ) ||
    !allCoordinatesOnBoard(
      board,
      players,
      cities,
      contributions,
      units,
      walls,
    ) ||
    !occupancyIsValid(units, walls) ||
    !populationLedgerIsValid(board, cities, contributions) ||
    pendingChoices.some((choice) =>
      choice.kind === "CITY_REWARD"
        ? !cityIds.has(choice.cityId)
        : !unitIds.has(choice.unitId),
    )
  ) {
    return false;
  }
  if (outcome === null) return true;
  return outcome.kind === "DEFEAT"
    ? playerIds.has(outcome.humanId) &&
        playerIds.has(outcome.defeatedByPlayerId)
    : playerIds.has(outcome.winnerId);
}

function occupancyIsValid(
  units: readonly UnitStateV6[],
  walls: readonly ChocolateWallStateV6[],
): boolean {
  const occupied = new Set<string>();
  for (const entity of [...units, ...walls]) {
    const key = `${entity.at.y},${entity.at.x}`;
    if (occupied.has(key)) return false;
    occupied.add(key);
  }
  return true;
}

function allCoordinatesOnBoard(
  board: BoardStateV6,
  players: readonly PlayerStateV6[],
  cities: readonly CityStateV6[],
  contributions: readonly PopulationContributionV6[],
  units: readonly UnitStateV6[],
  walls: readonly ChocolateWallStateV6[],
): boolean {
  const coordinates = [
    ...players.flatMap((player) => player.explored),
    ...cities.map((city) => city.at),
    ...contributions.map((contribution) => contribution.source.at),
    ...units.map((unit) => unit.at),
    ...walls.map((wall) => wall.at),
  ];
  return coordinates.every(
    (at) => at.x >= 0 && at.y >= 0 && at.x < board.width && at.y < board.height,
  );
}

function populationLedgerIsValid(
  board: BoardStateV6,
  cities: readonly CityStateV6[],
  contributions: readonly PopulationContributionV6[],
): boolean {
  for (const city of cities) {
    const attributed = contributions.filter(
      (contribution) => contribution.cityId === city.id,
    );
    const permanent = attributed
      .filter((contribution) => contribution.category === "PERMANENT")
      .reduce((total, contribution) => total + contribution.amount, 0);
    const live = attributed
      .filter((contribution) => contribution.category === "LIVE")
      .reduce((total, contribution) => total + contribution.amount, 0);
    if (
      !Number.isSafeInteger(permanent) ||
      !Number.isSafeInteger(live) ||
      permanent !== city.permanentPopulation ||
      live !== city.economicPopulation
    ) {
      return false;
    }
  }
  const liveCoordinates = new Set<string>();
  const permanentCoordinates = new Set<string>();
  for (const contribution of contributions) {
    if (contribution.category === "PERMANENT") {
      const key = `${contribution.source.at.y},${contribution.source.at.x}`;
      if (permanentCoordinates.has(key)) return false;
      permanentCoordinates.add(key);
      continue;
    }
    const source = contribution.source;
    if (source.kind !== "IMPROVEMENT") return false;
    const key = `${source.at.y},${source.at.x}`;
    if (liveCoordinates.has(key)) return false;
    liveCoordinates.add(key);
    const tile = board.tiles[source.at.y * board.width + source.at.x];
    if (
      tile === undefined ||
      !sameCoord(tile.at, source.at) ||
      tile.improvement !== source.improvement ||
      tile.territoryCityId !== contribution.cityId ||
      contribution.amount !==
        livePopulationAtV6({ board, cities }, source.at, source.improvement)
    ) {
      return false;
    }
  }
  return (
    board.tiles.every((tile) => {
      if (tile.improvement === null) return true;
      return liveCoordinates.has(`${tile.at.y},${tile.at.x}`);
    }) && advancedBuildingLimitsAreValid(board)
  );
}

function advancedBuildingLimitsAreValid(board: BoardStateV6): boolean {
  const counts = new Set<string>();
  for (const tile of board.tiles) {
    if (
      tile.territoryCityId === null ||
      tile.improvement === null ||
      tile.improvement === "FARM" ||
      tile.improvement === "LUMBER_CAMP" ||
      tile.improvement === "MINE" ||
      tile.improvement === "QUARRY"
    ) {
      continue;
    }
    const key = `${tile.territoryCityId}:${tile.improvement}`;
    if (counts.has(key)) return false;
    counts.add(key);
  }
  return true;
}

function greatestEntityId(
  cities: readonly CityStateV6[],
  contributions: readonly PopulationContributionV6[],
  units: readonly UnitStateV6[],
  walls: readonly ChocolateWallStateV6[],
): number {
  return Math.max(
    0,
    ...cities.map((value) => value.id),
    ...contributions.map((value) => value.id),
    ...units.map((value) => value.id),
    ...walls.map((value) => value.id),
  );
}

function rewardMatchesLevel(reward: RewardIdV6, level: number): boolean {
  if (level === 2) return reward === "SURVEY" || reward === "STOCKPILE";
  if (level === 3) return reward === "WALLS" || reward === "MILITIA";
  if (level === 4) return reward === "EXPAND" || reward === "BOOM";
  return level >= 5 && (reward === "JUGGERNAUT" || reward === "TREASURY");
}

function candidateRewardsMatchLevel(
  rewards: readonly RewardIdV6[],
  level: number,
): boolean {
  const expected =
    level === 2
      ? (["SURVEY", "STOCKPILE"] as const)
      : level === 3
        ? (["WALLS", "MILITIA"] as const)
        : level === 4
          ? (["EXPAND", "BOOM"] as const)
          : level >= 5
            ? (["JUGGERNAUT", "TREASURY"] as const)
            : null;
  return (
    expected !== null &&
    rewards[0] === expected[0] &&
    rewards[1] === expected[1]
  );
}

function resourceMatchesTerrain(
  resource: TileStateV6["resource"],
  terrain: TileStateV6["terrain"],
): boolean {
  if (resource === null) return true;
  if (resource === "FRUIT" || resource === "FERTILE_GROUND") {
    return terrain === "GRASS";
  }
  if (resource === "GAME") return terrain === "FOREST";
  return terrain === "MOUNTAIN";
}

function basicImprovementMatchesTerrain(
  improvement: TileStateV6["improvement"],
  terrain: TileStateV6["terrain"],
): boolean {
  if (improvement === "FARM") return terrain === "GRASS";
  if (improvement === "LUMBER_CAMP") return terrain === "FOREST";
  if (improvement === "MINE" || improvement === "QUARRY") {
    return terrain === "MOUNTAIN";
  }
  return true;
}

function parsePlayerId(input: unknown): ReturnType<typeof playerId> | null {
  if (typeof input !== "number") return null;
  try {
    return playerId(input);
  } catch {
    return null;
  }
}

function parseWallId(input: unknown): ReturnType<typeof wallId> | null {
  if (typeof input !== "number") return null;
  try {
    return wallId(input);
  } catch {
    return null;
  }
}

function idsStrictlyAscending(
  values: readonly { readonly id: number }[],
): boolean {
  return values.every(
    (value, index) => index === 0 || value.id > (values[index - 1]?.id ?? 0),
  );
}

function sameNumericSet(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((value) => right.includes(value))
  );
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function compareCoords(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}

function isRecordKind(
  input: unknown,
  kind: string,
): input is Record<string, unknown> {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    (input as Record<string, unknown>).kind === kind
  );
}

function isPlayerColor(input: unknown): input is PlayerStateV6["color"] {
  return (
    input === "CORAL" ||
    input === "TEAL" ||
    input === "GOLD" ||
    input === "VIOLET"
  );
}

function isSafeInteger(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input);
}

function isUint32(input: unknown): input is number {
  return isNonNegativeSafeIntegerV6(input) && input <= 0xffff_ffff;
}
