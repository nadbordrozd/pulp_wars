import { allocateCityId, type PlayerId } from "../model/ids";
import type { JsonValue } from "../replay/canonical";
import {
  BASIC_ECONOMIC_ACTIONS_V6,
  SPATIAL_ECONOMIC_ACTIONS_V6,
  effectiveRoleRuleV6,
  type BasicEconomicCommandKindV6,
  type SpatialEconomicCommandKindV6,
} from "../rules/ruleset-v6";
import { deepFreeze } from "../model/freeze";
import { parseCommandV6, type CommandV6 } from "./commands";
import {
  arePlayersAlliedV6,
  arePlayersHostileV6,
  isCityBesiegedV6,
  playerIncomeV6,
  recomputeLiveEconomyV6,
  startTurnV6,
  type CityEconomyRecalculationV6,
} from "./economy";
import type { DomainEventV6 } from "./events";
import { createInitialMapStateV6 } from "./map";
import { parseGameStateV6 } from "./state-schema";
import { spatialContributionAtV6 } from "./spatial-economy";
import type {
  CityStateV6,
  CoordV6,
  GameStateV6,
  MatchSetupV6,
  PlayerStateV6,
  PopulationContributionV6,
  TileStateV6,
  UnitStateV6,
} from "./types";

export type RuleErrorCodeV6 =
  | "INVALID_SETUP"
  | "INVALID_STATE"
  | "INVALID_COMMAND"
  | "COMMAND_NOT_IMPLEMENTED"
  | "MATCH_ENDED"
  | "PLAYER_ELIMINATED"
  | "NOT_ACTIVE_PLAYER"
  | "PENDING_CHOICE"
  | "TILE_NOT_FOUND"
  | "TILE_UNEXPLORED"
  | "TECH_REQUIRED"
  | "INVALID_TILE"
  | "TERRITORY_NOT_OWNED"
  | "CITY_BESIEGED"
  | "CITY_REWARD_PENDING"
  | "CITY_BUILDING_LIMIT"
  | "PLACEMENT_REQUIREMENT_UNMET"
  | "INSUFFICIENT_COINS"
  | "INTEGER_OVERFLOW"
  | "CAPTURE_NOT_ELIGIBLE"
  | "TARGET_ALLIED";

export interface RuleErrorV6 {
  readonly code: RuleErrorCodeV6;
  readonly params: Readonly<Record<string, JsonValue>>;
}

export type ApplyCommandResultV6 =
  | {
      readonly accepted: true;
      readonly state: GameStateV6;
      readonly events: readonly DomainEventV6[];
    }
  | {
      readonly accepted: false;
      readonly state: GameStateV6;
      readonly events: readonly [];
      readonly error: RuleErrorV6;
    };

export type CreatePlayableGameResultV6 =
  | {
      readonly ok: true;
      readonly state: GameStateV6;
      readonly events: readonly DomainEventV6[];
      readonly mapAttempt: number;
    }
  | Extract<ReturnType<typeof createInitialMapStateV6>, { readonly ok: false }>;

const BASIC_COMMANDS = new Set<CommandV6["kind"]>(
  Object.keys(BASIC_ECONOMIC_ACTIONS_V6) as BasicEconomicCommandKindV6[],
);
const SPATIAL_COMMANDS = new Set<CommandV6["kind"]>(
  Object.keys(SPATIAL_ECONOMIC_ACTIONS_V6) as SpatialEconomicCommandKindV6[],
);

/** Creates the mapped state and awards the ordinary first Start Turn income. */
export function createPlayableGameV6(
  setup: MatchSetupV6,
): CreatePlayableGameResultV6 {
  const created = createInitialMapStateV6(setup);
  if (!created.ok) return created;
  const activeId = created.state.turnOrder[created.state.activeSeatIndex];
  const player = created.state.players.find(
    (candidate) => candidate.id === activeId,
  );
  if (player === undefined) {
    return {
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    };
  }
  try {
    const started = startTurnV6(created.state, player);
    return {
      ok: true,
      state: checkedState(started.state),
      events: started.events,
      mapAttempt: created.mapAttempt,
    };
  } catch {
    return {
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    };
  }
}

export function applyCommandV6(
  state: GameStateV6,
  actor: PlayerId,
  commandInput: CommandV6,
): ApplyCommandResultV6 {
  const canonicalState = parseGameStateV6(state);
  if (canonicalState === null) return rejected(state, "INVALID_STATE");
  const parsedCommand = parseCommandV6(commandInput);
  if (!parsedCommand.ok) return rejected(state, "INVALID_COMMAND");
  const command = parsedCommand.value;
  const common = commonError(canonicalState, actor, command);
  if (common !== null) return rejected(state, common.code, common.params);
  if (BASIC_COMMANDS.has(command.kind)) {
    return applyBasicEconomicCommand(
      state,
      canonicalState,
      actor,
      command as Extract<CommandV6, { readonly at: CoordV6 }>,
    );
  }
  if (SPATIAL_COMMANDS.has(command.kind)) {
    return applySpatialEconomicCommand(
      state,
      canonicalState,
      actor,
      command as Extract<CommandV6, { readonly at: CoordV6 }>,
    );
  }
  if (command.kind === "END_TURN") {
    return applyEndTurn(state, canonicalState, actor);
  }
  if (command.kind === "CAPTURE") {
    return applyCapture(state, canonicalState, actor, command.unitId);
  }
  return rejected(state, "COMMAND_NOT_IMPLEMENTED", { kind: command.kind });
}

function applyBasicEconomicCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly at: CoordV6 }>,
): ApplyCommandResultV6 {
  const kind = command.kind as BasicEconomicCommandKindV6;
  const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
  const player = requirePlayer(state, actor);
  const tile = tileAt(state, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at))
    return rejected(original, "TILE_UNEXPLORED");
  if (!player.researchedTechs.includes(rule.technology)) {
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  }
  if (!tileMatchesRule(tile, rule)) {
    return rejected(original, "INVALID_TILE", { action: kind });
  }
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined || city.ownerId !== actor) {
    return rejected(original, "TERRITORY_NOT_OWNED");
  }
  if (isCityBesiegedV6(state, city)) return rejected(original, "CITY_BESIEGED");
  if (
    state.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  ) {
    return rejected(original, "CITY_REWARD_PENDING");
  }
  if (player.coins < rule.cost) {
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  }

  try {
    const contribution: PopulationContributionV6 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: rule.populationCategory,
      amount: rule.population,
      source:
        rule.populationCategory === "PERMANENT"
          ? {
              kind: "RESOURCE_ACTION",
              action: kind as "HARVEST_FRUIT" | "HUNT_GAME",
              at: command.at,
            }
          : {
              kind: "IMPROVEMENT",
              improvement: requireImprovement(rule.improvement),
              at: command.at,
            },
    };
    const nextEntityId = state.nextEntityId + 1;
    const commandIndex = state.commandIndex + 1;
    if (
      !Number.isSafeInteger(nextEntityId) ||
      !Number.isSafeInteger(commandIndex)
    ) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const updatedTile: TileStateV6 = {
      ...tile,
      resource: null,
      improvement: rule.improvement,
    };
    const board = {
      ...state.board,
      tiles: state.board.tiles.map((candidate) =>
        sameCoord(candidate.at, command.at) ? updatedTile : candidate,
      ),
    };
    const players = state.players.map((candidate) =>
      candidate.id === actor
        ? { ...candidate, coins: candidate.coins - rule.cost }
        : candidate,
    );
    const recalculation = recomputeLiveEconomyV6(
      state,
      { board, cities: state.cities },
      [...state.populationContributions, contribution],
    );
    const nextState = checkedState({
      ...state,
      nextEntityId,
      commandIndex,
      board,
      players,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    const fact: DomainEventV6 =
      rule.populationCategory === "PERMANENT"
        ? {
            kind: kind === "HARVEST_FRUIT" ? "FRUIT_HARVESTED" : "GAME_HUNTED",
            playerId: actor,
            cityId: city.id,
            at: command.at,
            cost: 2,
            permanentPopulationAdded: 1,
          }
        : {
            kind: "ECONOMIC_BUILDING_BUILT",
            playerId: actor,
            cityId: city.id,
            at: command.at,
            improvement: requireImprovement(rule.improvement),
            cost: rule.cost,
            populationContribution: rule.population,
            marketIncome: 0,
          };
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        fact,
        ...economyEvents(recalculation.changes),
        ...growthEventsForChanges(recalculation.changes),
      ],
    };
  } catch (error) {
    if (error instanceof RangeError && error.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    throw error;
  }
}

function applySpatialEconomicCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly at: CoordV6 }>,
): ApplyCommandResultV6 {
  const kind = command.kind as SpatialEconomicCommandKindV6;
  const rule = SPATIAL_ECONOMIC_ACTIONS_V6[kind];
  const player = requirePlayer(state, actor);
  const tile = tileAt(state, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at)) {
    return rejected(original, "TILE_UNEXPLORED");
  }
  if (!player.researchedTechs.includes(rule.technology)) {
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  }
  if (
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null
  ) {
    return rejected(original, "INVALID_TILE", { action: kind });
  }
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined || city.ownerId !== actor) {
    return rejected(original, "TERRITORY_NOT_OWNED");
  }
  if (isCityBesiegedV6(state, city)) return rejected(original, "CITY_BESIEGED");
  if (
    state.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  ) {
    return rejected(original, "CITY_REWARD_PENDING");
  }
  if (
    state.board.tiles.some(
      (candidate) =>
        candidate.territoryCityId === city.id &&
        candidate.improvement === rule.improvement,
    )
  ) {
    return rejected(original, "CITY_BUILDING_LIMIT", {
      improvement: rule.improvement,
    });
  }

  const updatedTile: TileStateV6 = {
    ...tile,
    improvement: rule.improvement,
  };
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((candidate) =>
      sameCoord(candidate.at, command.at) ? updatedTile : candidate,
    ),
  };
  const finalGraph = { board, cities: state.cities };
  const evaluation = spatialContributionAtV6(
    finalGraph,
    command.at,
    rule.improvement,
  );
  if (evaluation.placementCount < rule.placementMinimum) {
    return rejected(original, "PLACEMENT_REQUIREMENT_UNMET", {
      improvement: rule.improvement,
      required: rule.placementMinimum,
      count: evaluation.placementCount,
    });
  }
  if (player.coins < rule.cost) {
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  }

  try {
    const nextEntityId = state.nextEntityId + 1;
    const commandIndex = state.commandIndex + 1;
    if (
      !Number.isSafeInteger(nextEntityId) ||
      !Number.isSafeInteger(commandIndex)
    ) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const contribution: PopulationContributionV6 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: evaluation.population,
      source: {
        kind: "IMPROVEMENT",
        improvement: rule.improvement,
        at: command.at,
      },
    };
    const recalculation = recomputeLiveEconomyV6(state, finalGraph, [
      ...state.populationContributions,
      contribution,
    ]);
    const players = state.players.map((candidate) =>
      candidate.id === actor
        ? { ...candidate, coins: candidate.coins - rule.cost }
        : candidate,
    );
    const nextState = checkedState({
      ...state,
      nextEntityId,
      commandIndex,
      board,
      players,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    const ownContribution = recalculation.populationContributions.find(
      (candidate) => candidate.id === contribution.id,
    );
    if (ownContribution === undefined) throw new RangeError("INVALID_STATE");
    const fact: DomainEventV6 = {
      kind: "ECONOMIC_BUILDING_BUILT",
      playerId: actor,
      cityId: city.id,
      at: command.at,
      improvement: rule.improvement,
      cost: rule.cost,
      populationContribution: ownContribution.amount,
      marketIncome: evaluation.marketIncome,
    };
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        fact,
        ...economyEvents(recalculation.changes),
        ...growthEventsForChanges(recalculation.changes),
      ],
    };
  } catch (error) {
    if (error instanceof RangeError && error.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    if (error instanceof RangeError && error.message === "INVALID_STATE") {
      return rejected(original, "INVALID_STATE");
    }
    throw error;
  }
}

function applyEndTurn(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
): ApplyCommandResultV6 {
  const current = requirePlayer(state, actor);
  const preview = playerIncomeV6(state, actor);
  const nextIndex = nextActiveSeatIndex(state);
  if (nextIndex === null) return rejected(original, "INVALID_STATE");
  const nextId = state.turnOrder[nextIndex];
  const nextPlayer = state.players.find((player) => player.id === nextId);
  if (nextPlayer === undefined) return rejected(original, "INVALID_STATE");
  try {
    const advanced: GameStateV6 = {
      ...state,
      activeSeatIndex: nextIndex,
      round: nextIndex <= state.activeSeatIndex ? state.round + 1 : state.round,
    };
    if (!Number.isSafeInteger(advanced.round))
      throw new RangeError("INTEGER_OVERFLOW");
    const started = startTurnV6(advanced, nextPlayer);
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex))
      throw new RangeError("INTEGER_OVERFLOW");
    const nextState = checkedState({ ...started.state, commandIndex });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        {
          kind: "INCOME_PREVIEWED",
          playerId: current.id,
          totalCoins: preview.totalCoins,
          cities: preview.cities,
        },
        { kind: "TURN_ENDED", playerId: current.id },
        ...started.events,
      ],
    };
  } catch (error) {
    if (error instanceof RangeError && error.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    throw error;
  }
}

function applyCapture(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  unitId: UnitStateV6["id"],
): ApplyCommandResultV6 {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined || unit.ownerId !== actor || unit.hp <= 0) {
    return rejected(original, "CAPTURE_NOT_ELIGIBLE", {
      reason: "UNIT_NOT_OWNED",
    });
  }
  const occupiedCity = state.cities.find((city) => sameCoord(city.at, unit.at));
  if (
    occupiedCity !== undefined &&
    arePlayersAlliedV6(state, actor, occupiedCity.ownerId)
  ) {
    return rejected(original, "TARGET_ALLIED");
  }
  const targetTile = tileAt(state, unit.at);
  const hostileCity =
    occupiedCity !== undefined &&
    arePlayersHostileV6(state, actor, occupiedCity.ownerId)
      ? occupiedCity
      : undefined;
  const village = occupiedCity === undefined && targetTile?.site === "VILLAGE";
  const role = effectiveRoleRuleV6(
    requirePlayer(state, actor).faction,
    unit.role,
  );
  if (
    (hostileCity === undefined && !village) ||
    !role.abilities.includes("CAPTURE") ||
    state.units.some(
      (candidate) =>
        candidate.id !== unit.id &&
        candidate.hp > 0 &&
        sameCoord(candidate.at, unit.at),
    ) ||
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  ) {
    return rejected(original, "CAPTURE_NOT_ELIGIBLE", { reason: "NOT_READY" });
  }

  try {
    let nextEntityId = state.nextEntityId;
    let board = state.board;
    let cities: readonly CityStateV6[];
    let capturedCity: CityStateV6;
    let formerOwner: PlayerId | null;
    if (hostileCity === undefined) {
      const allocation = allocateCityId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      capturedCity = {
        id: allocation.id,
        ownerId: actor,
        at: unit.at,
        level: 1,
        permanentPopulation: 0,
        economicPopulation: 0,
        population: 0,
        isCapital: false,
        expanded: false,
        rewards: [],
      };
      formerOwner = null;
      cities = [...state.cities, capturedCity];
      board = {
        ...state.board,
        tiles: state.board.tiles.map((tile) => {
          const inFootprint =
            Math.max(
              Math.abs(tile.at.x - unit.at.x),
              Math.abs(tile.at.y - unit.at.y),
            ) <= 1;
          if (sameCoord(tile.at, unit.at)) {
            return {
              ...tile,
              site: "CITY" as const,
              territoryCityId: capturedCity.id,
            };
          }
          return inFootprint && tile.territoryCityId === null
            ? { ...tile, territoryCityId: capturedCity.id }
            : tile;
        }),
      };
    } else {
      formerOwner = hostileCity.ownerId;
      capturedCity = { ...hostileCity, ownerId: actor };
      cities = state.cities.map((city) =>
        city.id === capturedCity.id ? capturedCity : city,
      );
    }
    let units = state.units.map((candidate) => {
      if (candidate.id === unit.id) {
        return {
          ...candidate,
          homeCityId: capturedCity.id,
          activation: {
            ...candidate.activation,
            captured: true,
            handled: true,
          },
        };
      }
      return formerOwner !== null && candidate.homeCityId === capturedCity.id
        ? { ...candidate, homeCityId: null }
        : candidate;
    });
    let players = state.players;
    let pendingChoices = state.pendingChoices;
    let populationContributions = state.populationContributions;
    const events: DomainEventV6[] = [
      {
        kind: "CITY_CAPTURED",
        cityId: capturedCity.id,
        from: formerOwner,
        to: actor,
      },
    ];
    const reveal = revealRadiusOne(state, actor, capturedCity.at);
    if (reveal.revealed.length > 0) {
      players = players.map((player) =>
        player.id === actor ? { ...player, explored: reveal.explored } : player,
      );
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    }
    const recalculation = recomputeLiveEconomyV6(
      state,
      { board, cities },
      populationContributions,
    );
    cities = recalculation.cities;
    populationContributions = recalculation.populationContributions;
    pendingChoices = [...pendingChoices, ...recalculation.pendingChoices];
    events.push(
      ...economyEvents(recalculation.changes),
      ...growthEventsForChanges(recalculation.changes),
    );
    if (
      formerOwner !== null &&
      !cities.some((city) => city.ownerId === formerOwner)
    ) {
      const removed = units
        .filter((candidate) => candidate.ownerId === formerOwner)
        .sort((left, right) => left.id - right.id);
      units = units.filter((candidate) => candidate.ownerId !== formerOwner);
      players = players.map((player) =>
        player.id === formerOwner
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      );
      pendingChoices = pendingChoices.filter((choice) =>
        choice.kind === "CITY_REWARD"
          ? cities.some((city) => city.id === choice.cityId)
          : units.some((candidate) => candidate.id === choice.unitId),
      );
      events.push(
        ...removed.map((candidate): DomainEventV6 => ({
          kind: "UNIT_DIED",
          unitId: candidate.id,
          cause: "ELIMINATION",
        })),
      );
      events.push({ kind: "PLAYER_ELIMINATED", playerId: formerOwner });
    }
    const activePlayers = players.filter(
      (player) => player.status === "ACTIVE",
    );
    let outcome = state.outcome;
    if (
      players.find((player) => player.id === state.humanPlayerId)?.status ===
      "ELIMINATED"
    ) {
      outcome = {
        kind: "DEFEAT",
        humanId: state.humanPlayerId,
        defeatedByPlayerId: actor,
      };
    } else if (
      activePlayers.length === 1 &&
      activePlayers[0]?.id === state.humanPlayerId
    ) {
      outcome = { kind: "VICTORY", winnerId: state.humanPlayerId };
    }
    if (outcome !== null) events.push({ kind: "MATCH_ENDED", outcome });
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex))
      throw new RangeError("INTEGER_OVERFLOW");
    const nextState = checkedState({
      ...state,
      nextEntityId,
      commandIndex,
      board,
      players,
      cities,
      units,
      populationContributions,
      pendingChoices,
      outcome,
    });
    return { accepted: true, state: deepFreeze(nextState), events };
  } catch (error) {
    if (error instanceof RangeError)
      return rejected(original, "INTEGER_OVERFLOW");
    throw error;
  }
}

function commonError(
  state: GameStateV6,
  actor: PlayerId,
  command: CommandV6,
): RuleErrorV6 | null {
  if (state.outcome !== null) return error("MATCH_ENDED");
  const player = state.players.find((candidate) => candidate.id === actor);
  if (player?.status === "ELIMINATED") return error("PLAYER_ELIMINATED");
  if (
    state.turnOrder[state.activeSeatIndex] !== actor ||
    player === undefined
  ) {
    return error("NOT_ACTIVE_PLAYER");
  }
  if (
    state.pendingChoices.length > 0 &&
    command.kind !== "CHOOSE_CITY_REWARD" &&
    command.kind !== "CHOOSE_CANDIFY_CITY"
  ) {
    return error("PENDING_CHOICE", {
      kind: state.pendingChoices[0]?.kind ?? "UNKNOWN",
    });
  }
  return null;
}

function tileMatchesRule(
  tile: TileStateV6,
  rule: (typeof BASIC_ECONOMIC_ACTIONS_V6)[BasicEconomicCommandKindV6],
): boolean {
  return (
    tile.site === null &&
    tile.terrain === rule.terrain &&
    tile.resource === rule.resource &&
    tile.improvement === null
  );
}

function economyEvents(
  changes: readonly CityEconomyRecalculationV6[],
): readonly DomainEventV6[] {
  return changes.map((change) => ({
    kind: "CITY_ECONOMY_CHANGED",
    cityId: change.cityId,
    economicBefore: change.before.economicPopulation,
    economicAfter: change.after.economicPopulation,
    populationBefore: change.before.population,
    populationAfter: change.after.population,
    marketBefore: change.marketBefore,
    marketAfter: change.marketAfter,
  }));
}

function growthEventsForChanges(
  changes: readonly CityEconomyRecalculationV6[],
): readonly DomainEventV6[] {
  return changes.flatMap((change) =>
    change.reachedLevels.flatMap((level): readonly DomainEventV6[] => {
      const candidates =
        level === 2
          ? (["SURVEY", "STOCKPILE"] as const)
          : level === 3
            ? (["WALLS", "MILITIA"] as const)
            : level === 4
              ? (["EXPAND", "BOOM"] as const)
              : (["JUGGERNAUT", "TREASURY"] as const);
      return [
        { kind: "CITY_LEVELED_UP", cityId: change.cityId, level },
        {
          kind: "CITY_REWARD_QUEUED",
          cityId: change.cityId,
          reachedLevel: level,
          candidates,
        },
      ];
    }),
  );
}

function nextActiveSeatIndex(state: GameStateV6): number | null {
  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const index = (state.activeSeatIndex + offset) % state.turnOrder.length;
    const id = state.turnOrder[index];
    if (
      state.players.some(
        (player) => player.id === id && player.status === "ACTIVE",
      )
    ) {
      return index;
    }
  }
  return null;
}

function revealRadiusOne(
  state: GameStateV6,
  playerId: PlayerId,
  center: CoordV6,
): {
  readonly explored: readonly CoordV6[];
  readonly revealed: readonly CoordV6[];
} {
  const player = requirePlayer(state, playerId);
  const prior = new Set(player.explored.map(coordKey));
  const explored = [...player.explored];
  const revealed: CoordV6[] = [];
  for (
    let y = Math.max(0, center.y - 1);
    y <= Math.min(state.board.height - 1, center.y + 1);
    y += 1
  ) {
    for (
      let x = Math.max(0, center.x - 1);
      x <= Math.min(state.board.width - 1, center.x + 1);
      x += 1
    ) {
      const at = { x, y };
      if (!prior.has(coordKey(at))) {
        explored.push(at);
        revealed.push(at);
      }
    }
  }
  explored.sort(compareCoords);
  revealed.sort(compareCoords);
  return { explored, revealed };
}

function tileAt(state: GameStateV6, at: CoordV6): TileStateV6 | undefined {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= state.board.width ||
    at.y >= state.board.height
  ) {
    return undefined;
  }
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  return tile !== undefined && sameCoord(tile.at, at) ? tile : undefined;
}

function requirePlayer(state: GameStateV6, id: PlayerId): PlayerStateV6 {
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) throw new RangeError("Player disappeared");
  return player;
}

function requireImprovement<T>(value: T | null): T {
  if (value === null) throw new RangeError("Improvement disappeared");
  return value;
}

function isExplored(player: PlayerStateV6, at: CoordV6): boolean {
  return player.explored.some((candidate) => sameCoord(candidate, at));
}

function checkedState(state: GameStateV6): GameStateV6 {
  const parsed = parseGameStateV6(state);
  if (parsed === null) throw new RangeError("INVALID_STATE");
  return parsed;
}

function rejected(
  state: GameStateV6,
  code: RuleErrorCodeV6,
  params: Readonly<Record<string, JsonValue>> = {},
): ApplyCommandResultV6 {
  return { accepted: false, state, events: [], error: { code, params } };
}

function error(
  code: RuleErrorCodeV6,
  params: Readonly<Record<string, JsonValue>> = {},
): RuleErrorV6 {
  return { code, params };
}

function coordKey(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function compareCoords(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
