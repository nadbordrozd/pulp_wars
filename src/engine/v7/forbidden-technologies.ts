import { ORIGINAL_BASELINE_V5_TREE } from "../rules/ruleset-v7";
import { missionDefinitionV7 } from "./missions/index";
import type { MatchSetupV7, TechnologyIdV7 } from "./types";

/** Why no seat may research a technology in a match. */
export type ForbiddenTechnologyReasonV7 = "DRY_LAND" | "MISSION";

const NONE_V7: ReadonlyMap<TechnologyIdV7, ForbiddenTechnologyReasonV7> =
  new Map();
const DRY_LAND_V7: ReadonlyMap<TechnologyIdV7, ForbiddenTechnologyReasonV7> =
  new Map(
    ORIGINAL_BASELINE_V5_TREE.nodes
      .filter((node) => node.branch === "NAVAL")
      .map((node) => [node.id, "DRY_LAND"] as const),
  );
const MISSION_CACHE_V7 = new Map<
  string,
  ReadonlyMap<TechnologyIdV7, ForbiddenTechnologyReasonV7>
>();

/**
 * Technologies no seat may research in this match, with the reason
 * (docs/product/CAMPAIGN.md section 2.3): the single source the reducer
 * (`RESEARCH` is refused with `TECH_REQUIRED { tech, reason }`), the public
 * technology tree (`DISABLED`), and the research offers read. On `DRY_LAND`
 * the three Naval technologies are forbidden (`DRY_LAND`, the
 * revision-6 rule, unchanged); on `MISSION` the registered mission's
 * `forbiddenTechnologies` (`MISSION`); otherwise none. Every faction tree
 * shares the Human tree's branches, so the Naval branch is read from it.
 */
export function forbiddenTechnologiesV7(
  setup: Pick<MatchSetupV7, "mapType" | "mission">,
): ReadonlyMap<TechnologyIdV7, ForbiddenTechnologyReasonV7> {
  if (setup.mapType === "DRY_LAND") return DRY_LAND_V7;
  if (setup.mapType !== "MISSION" || setup.mission === undefined)
    return NONE_V7;
  const key = `${setup.mission.id}@${String(setup.mission.revision)}`;
  const cached = MISSION_CACHE_V7.get(key);
  if (cached !== undefined) return cached;
  const mission = missionDefinitionV7(setup.mission);
  const result: ReadonlyMap<TechnologyIdV7, ForbiddenTechnologyReasonV7> =
    mission === null
      ? NONE_V7
      : new Map(
          mission.forbiddenTechnologies.map(
            (tech) => [tech, "MISSION"] as const,
          ),
        );
  MISSION_CACHE_V7.set(key, result);
  return result;
}
