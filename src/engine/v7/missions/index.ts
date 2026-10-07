import { deepFreeze } from "../../model/freeze";
import {
  RULESET_7_ID,
  type FactionIdV7,
  type MatchSetupV7,
  type MissionRefV7,
  type PlayerColorV7,
} from "../types";
import { FRONTIER_1_V7 } from "./frontier-1";
import { FRONTIER_2_V7 } from "./frontier-2";
import { FRONTIER_3_V7 } from "./frontier-3";
import { FRONTIER_4_V7 } from "./frontier-4";
import {
  LAB_BREAKTHROUGH_GOBLIN_V7,
  LAB_BREAKTHROUGH_UNDEAD_V7,
  LAB_BREAKTHROUGH_V7,
} from "./lab-breakthrough";
import { LAB_GOBLIN_MID_V7 } from "./lab-goblin";
import { LAB_BACKLINE_V7, LAB_LATE_V7, LAB_SIEGE_V7 } from "./lab-human";
import { LAB_UNDEAD_MID_V7 } from "./lab-undead";
import { TEST_GROUNDS_V7 } from "./test-grounds";
import { TEST_GUARD_V7, TEST_HOLD_V7, TEST_RUSH_V7 } from "./test-directives";
import { TEST_NECK_V7 } from "./test-neck";
import type { MissionDefinitionV7, MissionSeatV7 } from "./types";

export type * from "./types";

/**
 * The mission registry (docs/product/CAMPAIGN.md section 2.1): the current
 * revision of every mission, in registration order. A mission ID is never
 * reused; a changed initial state bumps that mission's `revision`, which the
 * pinned initial-state hash test enforces (section 2.4). Adding a mission or
 * bumping a revision does not change the ruleset identity.
 */
export const MISSION_REGISTRY_V7: readonly MissionDefinitionV7[] = deepFreeze([
  TEST_GROUNDS_V7,
  TEST_RUSH_V7,
  TEST_HOLD_V7,
  TEST_GUARD_V7,
  // The siege fixture of the Normal AI (`pulp_wars-68k.6`).
  TEST_NECK_V7,
  // Chapter One, "The Hollow Frontier" (`pulp_wars-68k.4`, section 6).
  FRONTIER_1_V7,
  FRONTIER_2_V7,
  FRONTIER_3_V7,
  FRONTIER_4_V7,
  // The Human tuning labs (`pulp_wars-w49.3`): hidden mirror fixtures of
  // the text harness (docs/validation/TEXT_PLAY.md).
  LAB_SIEGE_V7,
  LAB_BACKLINE_V7,
  LAB_LATE_V7,
  // Tuning 6 (`pulp_wars-w49.6`): numbers against a prepared line, one
  // fixture per attacking faction.
  LAB_BREAKTHROUGH_V7,
  LAB_BREAKTHROUGH_GOBLIN_V7,
  LAB_BREAKTHROUGH_UNDEAD_V7,
  // The Goblin pass (`pulp_wars-w49.12`): the Goblin roster in an even
  // middle game, the hand player as the Goblins.
  LAB_GOBLIN_MID_V7,
  // The Undead pass (`pulp_wars-w49.13`): the Undead roster in the same
  // middle game, the hand player as the Undead.
  LAB_UNDEAD_MID_V7,
]);

/** The registered mission with this ID (any revision), or null. */
export function missionByIdV7(id: string): MissionDefinitionV7 | null {
  return MISSION_REGISTRY_V7.find((mission) => mission.id === id) ?? null;
}

/**
 * The registered mission of a `MISSION` setup's `mission` reference, or null
 * when the ID is unknown or the revision is not the current one
 * (`UNKNOWN_MISSION`).
 */
export function missionDefinitionV7(
  ref: MissionRefV7,
): MissionDefinitionV7 | null {
  const mission = missionByIdV7(ref.id);
  return mission !== null && mission.revision === ref.revision ? mission : null;
}

/** The factions a seat may play: its fixed faction, or its choice list. */
export function missionSeatFactionsV7(
  seat: MissionSeatV7,
): readonly FactionIdV7[] {
  return typeof seat.faction === "string"
    ? [seat.faction]
    : seat.faction.choice;
}

/**
 * The `MISSION` setup of a registered mission's current revision with seat 0
 * playing `humanFaction` (its first choice by default), or null when that
 * faction is not one of seat 0's or the mission's seat count is not 2–4.
 * The mission fixes the size, seats, seed, and AI mode; only the faction
 * choice and the human color are free.
 */
export function missionMatchSetupV7(
  mission: MissionDefinitionV7,
  humanFaction?: FactionIdV7,
  humanColor: PlayerColorV7 = "CORAL",
): MatchSetupV7 | null {
  const [human, ...ai] = mission.seats;
  const aiCount = ai.length;
  if (human === undefined || (aiCount !== 1 && aiCount !== 2 && aiCount !== 3))
    return null;
  const faction = humanFaction ?? missionSeatFactionsV7(human)[0];
  if (faction === undefined || !missionSeatFactionsV7(human).includes(faction))
    return null;
  const factions: FactionIdV7[] = [faction];
  for (const seat of ai) {
    if (typeof seat.faction !== "string") return null;
    factions.push(seat.faction);
  }
  return {
    rulesetId: RULESET_7_ID,
    seed: mission.seed,
    width: mission.size,
    height: mission.size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: mission.aiMode,
    humanColor,
    factions,
    mapType: "MISSION",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    mission: { id: mission.id, revision: mission.revision },
    // RULESET_7_MAP_CURIOSITIES.md section 3: never on an authored board.
    curiosities: false,
  };
}
