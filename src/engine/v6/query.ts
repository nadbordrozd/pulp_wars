import type { CityId } from "../model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V6,
  effectiveRoleRuleV6,
  type BasicEconomicCommandKindV6,
} from "../rules/ruleset-v6";
import { compareCommandsV6, type CommandV6 } from "./commands";
import { arePlayersAlliedV6, resolveCityGrowthV6 } from "./economy";
import type { CityStateV6, CoordV6, EconomicImprovementId } from "./types";
import type { PlayerTileViewV6, PlayerViewV6 } from "./view";

export interface CityValueDeltaV6 {
  readonly cityId: CityId;
  readonly delta: number;
}

export interface EconomicPreviewV6 {
  readonly at: CoordV6;
  readonly cost: number;
  readonly ownerCityId: CityId;
  readonly populationDeltaByCity: readonly CityValueDeltaV6[];
  readonly coinIncomeDeltaByCity: readonly CityValueDeltaV6[];
  readonly resultingContribution: number;
  readonly levelsReached: readonly number[];
  readonly distinctTypes: readonly EconomicImprovementId[];
  readonly contributingTiles: readonly CoordV6[];
  readonly oppositePairAxes: readonly string[];
  readonly capitalRoadConnected: false;
  readonly buildingLimitReached: false;
  readonly complete: true;
}

export type EconomicPreviewResultV6 =
  | { readonly ok: true; readonly preview: EconomicPreviewV6 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

const BASIC_KINDS = Object.keys(
  BASIC_ECONOMIC_ACTIONS_V6,
) as BasicEconomicCommandKindV6[];

/** Pure observation-safe enumeration for the implemented v6 economy slice. */
export function queryPlayerCommandsV6(
  view: PlayerViewV6,
): readonly CommandV6[] {
  const activeId = view.turnOrder[view.activeSeatIndex];
  if (
    view.outcome !== null ||
    view.viewer.status !== "ACTIVE" ||
    activeId !== view.viewer.id ||
    view.pendingChoices.length > 0
  ) {
    return [];
  }
  const commands: CommandV6[] = [];
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    for (const kind of BASIC_KINDS) {
      if (publicBasicActionIsLegal(view, tile, kind)) {
        commands.push({ kind, at: tile.at });
      }
    }
  }
  for (const unit of view.units) {
    if (publicCaptureIsLegal(view, unit.id)) {
      commands.push({ kind: "CAPTURE", unitId: unit.id });
    }
  }
  commands.push({ kind: "END_TURN" });
  return commands.sort(compareCommandsV6);
}

export function previewEconomicV6(
  view: PlayerViewV6,
  command: CommandV6,
): EconomicPreviewResultV6 {
  if (
    !("at" in command) ||
    !BASIC_KINDS.includes(command.kind as BasicEconomicCommandKindV6)
  ) {
    return { ok: false, error: "NOT_OFFERED" };
  }
  const offered = queryPlayerCommandsV6(view).some(
    (candidate) =>
      candidate.kind === command.kind &&
      "at" in candidate &&
      sameCoord(candidate.at, command.at),
  );
  if (!offered) return { ok: false, error: "NOT_OFFERED" };
  const tile = view.board.tiles[command.at.y * view.board.width + command.at.x];
  if (tile === undefined || !tile.explored || tile.territoryCityId === null) {
    return { ok: false, error: "NOT_OFFERED" };
  }
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined) return { ok: false, error: "NOT_OFFERED" };
  const kind = command.kind as BasicEconomicCommandKindV6;
  const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
  const permanent =
    city.permanentPopulation +
    (rule.populationCategory === "PERMANENT" ? rule.population : 0);
  const economic =
    city.economicPopulation +
    (rule.populationCategory === "LIVE" ? rule.population : 0);
  let growth;
  try {
    growth = resolveCityGrowthV6(city, permanent, economic);
  } catch {
    return { ok: false, error: "NOT_OFFERED" };
  }
  return {
    ok: true,
    preview: {
      at: command.at,
      cost: rule.cost,
      ownerCityId: city.id,
      populationDeltaByCity: [{ cityId: city.id, delta: rule.population }],
      coinIncomeDeltaByCity: [
        {
          cityId: city.id,
          delta: publicBaseIncome(growth.city) - publicBaseIncome(city),
        },
      ],
      resultingContribution: rule.population,
      levelsReached: growth.reachedLevels,
      distinctTypes: rule.improvement === null ? [] : [rule.improvement],
      contributingTiles: [command.at],
      oppositePairAxes: [],
      capitalRoadConnected: false,
      buildingLimitReached: false,
      complete: true,
    },
  };
}

function publicBasicActionIsLegal(
  view: PlayerViewV6,
  tile: Extract<PlayerTileViewV6, { readonly explored: true }>,
  kind: BasicEconomicCommandKindV6,
): boolean {
  const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
  if (
    !view.viewer.researchedTechs.includes(rule.technology) ||
    view.viewer.coins < rule.cost ||
    tile.territoryOwnerId !== view.viewer.id ||
    tile.territoryCityId === null ||
    tile.site !== null ||
    tile.terrain !== rule.terrain ||
    tile.resource !== rule.resource ||
    tile.improvement !== null
  ) {
    return false;
  }
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  return (
    city !== undefined &&
    !cityIsPubliclyBesieged(view, city) &&
    !view.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  );
}

function publicCaptureIsLegal(view: PlayerViewV6, unitId: number): boolean {
  const unit = view.units.find(
    (candidate) =>
      candidate.id === unitId && candidate.ownerId === view.viewer.id,
  );
  if (unit === undefined || unit.hp <= 0) return false;
  const rule = effectiveRoleRuleV6(view.viewer.faction, unit.role);
  if (
    !rule.abilities.includes("CAPTURE") ||
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed ||
    view.units.some(
      (candidate) =>
        candidate.id !== unit.id && sameCoord(candidate.at, unit.at),
    )
  ) {
    return false;
  }
  const city = view.cities.find((candidate) =>
    sameCoord(candidate.at, unit.at),
  );
  if (city !== undefined) {
    return (
      city.ownerId !== view.viewer.id &&
      !arePlayersAlliedV6(view, view.viewer.id, city.ownerId)
    );
  }
  const tile = view.board.tiles[unit.at.y * view.board.width + unit.at.x];
  return tile?.explored === true && tile.site === "VILLAGE";
}

function cityIsPubliclyBesieged(
  view: PlayerViewV6,
  city: CityStateV6,
): boolean {
  return view.units.some(
    (unit) =>
      unit.hp > 0 &&
      sameCoord(unit.at, city.at) &&
      unit.ownerId !== city.ownerId &&
      !arePlayersAlliedV6(view, unit.ownerId, city.ownerId),
  );
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function publicBaseIncome(city: CityStateV6): number {
  return Math.max(
    0,
    city.level + (city.isCapital ? 1 : 0) + Math.min(0, city.population),
  );
}
