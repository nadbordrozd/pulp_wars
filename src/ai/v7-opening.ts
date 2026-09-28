import { queryTechnologyTreeV7 } from "../engine/v7/query";
import {
  TECHNOLOGY_IDS_V7,
  type CoordV7,
  type TechnologyIdV7,
} from "../engine/v7/types";
import type { PlayerViewV7 } from "../engine/v7/view";

/**
 * Revision 12 Normal AI opening research.
 *
 * While the viewer has researched nothing, any offered tier-1 technology is
 * free. The Normal AI chooses one from its capital surroundings using only its
 * own public view (never hidden state and never the PRNG):
 *
 * - The survey is every explored tile within Chebyshev distance 2 of the
 *   original capital (this includes the capital's 3 x 3 territory).
 * - GATHERING = 4 per visible Fruit + floor(open Grass / 3). Open Grass has no
 *   visible resource, site, or improvement; masked Fertile Ground looks open.
 * - HUNTING = 4 per visible Game + floor(Forest / 3).
 * - DRILL = 2 per Mountain (Ore is masked before Drill) + 3 per visible
 *   hostile unit within Chebyshev 4 + 2 per visible hostile city within
 *   Chebyshev 5.
 * - SHORECRAFT (only when offered, so never on Dry Land, and only when the
 *   capital's own territory contains Shallow Water, i.e. a Port can be built)
 *   = 4 per visible Fish + floor(Shallow Water / 2).
 * - SCOUTING = max(0, 10 - 2 * (Fruit + Game + counted Fish)); it wins when
 *   local resources are poor.
 *
 * The highest score wins; ties break by frozen technology order.
 */
export const NORMAL_OPENING_SURVEY_RADIUS_V7 = 2;
export const NORMAL_OPENING_THREAT_UNIT_RADIUS_V7 = 4;
export const NORMAL_OPENING_THREAT_CITY_RADIUS_V7 = 5;

export interface NormalOpeningScoreV7 {
  readonly tech: TechnologyIdV7;
  readonly score: number;
}

/** True while the viewer's next tier-1 research is the free opener. */
export function normalOpeningResearchPendingV7(view: PlayerViewV7): boolean {
  return view.viewer.researchedTechs.length === 0;
}

/** Deterministic observation-only scores for every offered tier-1 opener. */
export function normalOpeningScoresV7(
  view: PlayerViewV7,
): readonly NormalOpeningScoreV7[] {
  if (!normalOpeningResearchPendingV7(view)) return [];
  const offered = queryTechnologyTreeV7(view).nodes.filter(
    (node) => node.tier === 1 && node.state === "AVAILABLE" && node.affordable,
  );
  if (offered.length === 0) return [];
  const capital = view.cities.find(
    (city) =>
      city.id === view.viewer.originalCapitalCityId &&
      city.ownerId === view.viewer.id,
  );
  const survey = capital === undefined ? null : surveyCapital(view, capital);
  return offered
    .map((node) => ({
      tech: node.id,
      score: survey === null ? 0 : openingScore(node.id, survey),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        TECHNOLOGY_IDS_V7.indexOf(left.tech) -
          TECHNOLOGY_IDS_V7.indexOf(right.tech),
    );
}

/** The free opening technology the Normal AI researches, if one is offered. */
export function normalOpeningTechnologyV7(
  view: PlayerViewV7,
): TechnologyIdV7 | null {
  return normalOpeningScoresV7(view)[0]?.tech ?? null;
}

interface CapitalSurveyV7 {
  readonly fruit: number;
  readonly openGrass: number;
  readonly game: number;
  readonly forest: number;
  readonly mountain: number;
  readonly fish: number;
  readonly shallowWater: number;
  readonly portSite: boolean;
  readonly hostileUnits: number;
  readonly hostileCities: number;
}

function surveyCapital(
  view: PlayerViewV7,
  capital: { readonly id: number; readonly at: CoordV7 },
): CapitalSurveyV7 {
  let fruit = 0;
  let openGrass = 0;
  let game = 0;
  let forest = 0;
  let mountain = 0;
  let fish = 0;
  let shallowWater = 0;
  let portSite = false;
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    if (tile.terrain === "SHALLOW_WATER" && tile.territoryCityId === capital.id)
      portSite = true;
    if (chebyshev(tile.at, capital.at) > NORMAL_OPENING_SURVEY_RADIUS_V7)
      continue;
    switch (tile.terrain) {
      case "GRASS":
        if (tile.resource === "FRUIT") fruit += 1;
        else if (
          tile.resource === null &&
          tile.site === null &&
          tile.improvement === null
        )
          openGrass += 1;
        break;
      case "FOREST":
        forest += 1;
        if (tile.resource === "GAME") game += 1;
        break;
      case "MOUNTAIN":
        mountain += 1;
        break;
      case "SHALLOW_WATER":
        shallowWater += 1;
        if (tile.resource === "FISH") fish += 1;
        break;
      case "DEEP_WATER":
        break;
    }
  }
  const hostileUnits = view.units.filter(
    (unit) =>
      hostileToViewer(view, unit.ownerId) &&
      chebyshev(unit.at, capital.at) <= NORMAL_OPENING_THREAT_UNIT_RADIUS_V7,
  ).length;
  const hostileCities = view.cities.filter(
    (city) =>
      hostileToViewer(view, city.ownerId) &&
      chebyshev(city.at, capital.at) <= NORMAL_OPENING_THREAT_CITY_RADIUS_V7,
  ).length;
  return {
    fruit,
    openGrass,
    game,
    forest,
    mountain,
    fish,
    shallowWater,
    portSite,
    hostileUnits,
    hostileCities,
  };
}

function openingScore(tech: TechnologyIdV7, survey: CapitalSurveyV7): number {
  const countedFish = survey.portSite ? survey.fish : 0;
  switch (tech) {
    case "GATHERING":
      return 4 * survey.fruit + Math.floor(survey.openGrass / 3);
    case "HUNTING":
      return 4 * survey.game + Math.floor(survey.forest / 3);
    case "DRILL":
      return (
        2 * survey.mountain + 3 * survey.hostileUnits + 2 * survey.hostileCities
      );
    case "SHORECRAFT":
      return survey.portSite
        ? 4 * survey.fish + Math.floor(survey.shallowWater / 2)
        : 0;
    case "SCOUTING":
      return Math.max(0, 10 - 2 * (survey.fruit + survey.game + countedFish));
    default:
      return 0;
  }
}

function hostileToViewer(view: PlayerViewV7, ownerId: number): boolean {
  return (
    ownerId !== view.viewer.id &&
    (view.setup.aiMode === "RIVAL" ||
      ownerId === view.humanPlayerId ||
      view.viewer.id === view.humanPlayerId)
  );
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
