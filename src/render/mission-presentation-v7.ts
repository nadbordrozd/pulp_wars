import { campaignMissionV7, campaignTagNameV7 } from "../campaign/progress-v7";
import {
  missionByIdV7,
  type CoordV7,
  type MissionBonusGoalV7,
  type MissionDefinitionV7,
  type PlayerViewV7,
} from "../engine/index";
import type { UiIconIdV7 } from "./dom/ui-icons-v7";

/**
 * How a mission's objective is shown (`pulp_wars-v642.1`,
 * docs/product/CAMPAIGN.md section 10.6): the tracker of the top bar, the
 * marks over the board, the star goals of the briefing and the debrief, and
 * the one line that says why a mission ended. Pure functions of the player
 * view (`PlayerViewV7.mission`) and the campaign's own text; no DOM.
 *
 * Nothing here ever names a tile: a place is "the Warrens", a distance is a
 * count of steps, and where a thing is, the board's mark shows.
 */

/** Sentence case for the start of a line: "the gate" reads "The gate". */
function capital(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function plural(count: number, one: string): string {
  return `${String(count)} ${one}${count === 1 ? "" : "s"}`;
}

const OBJECTIVE_ICONS_V7: Readonly<
  Record<NonNullable<PlayerViewV7["mission"]>["kind"], UiIconIdV7>
> = {
  DOMINATION: "attack",
  ESCORT: "move",
  SURVIVE: "defense",
  CAPTURE: "flag",
  KILL: "skull",
};

/** The icon of an objective kind, on the tracker and the briefing. */
export function missionObjectiveIconV7(
  kind: NonNullable<PlayerViewV7["mission"]>["kind"],
): UiIconIdV7 {
  return OBJECTIVE_ICONS_V7[kind];
}

/** A generic Objective line, for a mission the campaign has no text for. */
function fallbackObjectiveV7(mission: MissionDefinitionV7): string {
  const objective = mission.objective;
  const name = (tag: string): string => campaignTagNameV7(mission.id, tag);
  const by =
    objective.kind !== "SURVIVE" && objective.byRound !== undefined
      ? ` by turn ${String(objective.byRound)}`
      : "";
  switch (objective.kind) {
    case "DOMINATION":
      return `Capture every enemy city${by}.`;
    case "ESCORT":
      return `Bring ${name(objective.unit)} to ${name(objective.to)}${by}.`;
    case "SURVIVE":
      return `Hold out for ${plural(objective.rounds, "turn")}.`;
    case "CAPTURE":
      return `Capture ${objective.places.map(name).join(" and ")}${by}.`;
    case "KILL":
      return `Kill ${objective.units.map(name).join(" and ")}${by}.`;
  }
}

/** The Objective line of a mission: the campaign's, or a generic one. */
export function missionObjectiveLineV7(missionId: string): string {
  const entry = campaignMissionV7(missionId)?.entry;
  if (entry !== undefined) return entry.objective;
  const mission = missionByIdV7(missionId);
  return mission === null ? "" : fallbackObjectiveV7(mission);
}

/** One secondary goal in words: what a star is for. */
export function missionStarGoalTextV7(
  missionId: string,
  goal: MissionBonusGoalV7,
): string {
  switch (goal.kind) {
    case "WITHIN_ROUNDS":
      return `Win by turn ${String(goal.rounds)}`;
    case "KEEP_CITIES":
      return "Lose no city";
    case "UNIT_ALIVE":
      return `Keep ${campaignTagNameV7(missionId, goal.unit)} alive`;
    case "HOLD_PLACE":
      return `Hold ${campaignTagNameV7(missionId, goal.place)}`;
  }
}

export interface MissionStarGoalV7 {
  readonly text: string;
  /** Whether the goal holds now (in the debrief: whether it was met). */
  readonly met: boolean;
}

/**
 * The stars of a mission, first the win itself and then each secondary
 * goal. Before a match (no view) every goal reads as still to do.
 */
export function missionStarGoalsV7(
  missionId: string,
  view: Pick<PlayerViewV7, "mission" | "outcome" | "humanPlayerId"> | null,
): readonly MissionStarGoalV7[] {
  const mission = missionByIdV7(missionId);
  if (mission === null) return [];
  const won =
    view?.outcome?.kind === "VICTORY" &&
    view.outcome.winnerId === view.humanPlayerId;
  const bonus = mission.objective.bonus ?? [];
  return [
    { text: "Win the mission", met: won },
    ...bonus.map((goal, index) => ({
      text: missionStarGoalTextV7(missionId, goal),
      met:
        view?.mission?.missionId === missionId
          ? (view.mission.bonus[index]?.met ?? false) &&
            (view.outcome === null || won)
          : false,
    })),
  ];
}

export interface MissionTrackerV7 {
  readonly missionId: string;
  readonly icon: UiIconIdV7;
  /** The Objective line. */
  readonly line: string;
  /** What is left, in a few characters: "5 turns", "3 steps", "1 of 2". */
  readonly counter: string | null;
  /** True in the last two rounds of a deadline. */
  readonly urgent: boolean;
  /** The whole of it in one sentence, for a screen reader and the tooltip. */
  readonly description: string;
}

/**
 * The objective tracker of the top bar: an icon, the Objective line, and
 * one counter. The clock comes first (a deadline or the rounds to hold
 * out), then an escort's steps to go, then how many of several places or
 * targets are done. Null outside a mission.
 */
export function missionTrackerV7(
  view: Pick<PlayerViewV7, "mission">,
): MissionTrackerV7 | null {
  const status = view.mission;
  if (status === undefined) return null;
  const line = missionObjectiveLineV7(status.missionId);
  let counter: string | null = null;
  let said = "";
  if (status.clock !== null) {
    counter = plural(status.clock.roundsLeft, "turn");
    said = `${counter} left.`;
  } else if (status.escortDistance !== null) {
    counter = plural(status.escortDistance, "step");
    said = `${counter} to go.`;
  }
  const captures = status.places.filter((place) => place.role === "CAPTURE");
  const kills = status.units.filter((unit) => unit.role === "KILL");
  const parts = captures.length + kills.length;
  if (parts > 1) {
    const done =
      captures.filter((place) => place.held).length +
      kills.filter((unit) => !unit.alive).length;
    const progress = `${String(done)} of ${String(parts)}`;
    said = `${said} ${progress} done.`.trim();
    counter ??= progress;
  }
  if (
    status.clock !== null &&
    status.escortDistance !== null &&
    status.kind === "ESCORT"
  )
    said = `${said} ${plural(status.escortDistance, "step")} to go.`;
  return {
    missionId: status.missionId,
    icon: missionObjectiveIconV7(status.kind),
    line,
    counter,
    urgent: status.clock?.kind === "DEADLINE" && status.clock.roundsLeft <= 2,
    description: `Objective: ${line}${said === "" ? "" : ` ${said}`}`,
  };
}

/**
 * A mark over the board: where to go or what to take (`GOAL`), what must
 * not fall (`DEFEND`), who must live (`ESCORT`), and who must die
 * (`TARGET`). A unit is marked only while the viewer sees it.
 */
export interface MissionMarkerV7 {
  readonly kind: "GOAL" | "DEFEND" | "ESCORT" | "TARGET";
  readonly at: CoordV7;
  readonly on: "TILE" | "UNIT";
  /** What it is called, for review tooling and tests. */
  readonly label: string;
}

export function missionMarkersV7(
  view: Pick<PlayerViewV7, "mission" | "units" | "outcome">,
): readonly MissionMarkerV7[] {
  const status = view.mission;
  if (status === undefined || view.outcome !== null) return [];
  const markers: MissionMarkerV7[] = [];
  for (const place of status.places)
    markers.push({
      kind:
        place.role === "PROTECT" || (place.role !== "DESTINATION" && place.held)
          ? "DEFEND"
          : "GOAL",
      at: place.at,
      on: "TILE",
      label: campaignTagNameV7(status.missionId, place.tag),
    });
  for (const named of status.units) {
    if (!named.alive) continue;
    const seen = view.units.find((unit) => unit.id === named.unitId);
    if (seen === undefined) continue;
    markers.push({
      kind: named.role === "KILL" ? "TARGET" : "ESCORT",
      at: seen.at,
      on: "UNIT",
      label: campaignTagNameV7(status.missionId, named.tag),
    });
  }
  return markers;
}

/**
 * Why the mission ended, in one short line for the Victory and Defeat
 * dialogs; null when the match is open or is no mission.
 */
export function missionOutcomeLineV7(
  view: Pick<PlayerViewV7, "mission" | "outcome" | "humanPlayerId" | "round">,
): string | null {
  const status = view.mission;
  const outcome = view.outcome;
  if (status === undefined || outcome === null) return null;
  if (outcome.kind === "HEADLESS_VICTORY") return null;
  const mission = missionByIdV7(status.missionId);
  const objective = mission?.objective;
  const name = (tag: string | undefined): string =>
    tag === undefined ? "it" : campaignTagNameV7(status.missionId, tag);
  const lostUnit = status.units.find(
    (unit) => unit.role === "PROTECT" && !unit.alive,
  );
  const lostPlace = status.places.find(
    (place) => place.role === "PROTECT" && !place.held,
  );
  const fallback =
    outcome.kind === "VICTORY"
      ? "Every enemy is beaten."
      : "Your last city fell.";
  if (outcome.cause === undefined) return fallback;
  switch (outcome.cause) {
    case "ENEMIES_ELIMINATED":
      return fallback;
    case "ESCORT_ARRIVED":
      return `${capital(name(objective?.kind === "ESCORT" ? objective.unit : undefined))} made it.`;
    case "SURVIVED":
      return "You held out.";
    case "PLACES_CAPTURED":
      return `${capital(
        objective?.kind === "CAPTURE"
          ? objective.places.map(name).join(" and ")
          : "the objective",
      )} ${objective?.kind === "CAPTURE" && objective.places.length > 1 ? "are" : "is"} yours.`;
    case "TARGETS_KILLED":
      return `${capital(
        objective?.kind === "KILL"
          ? objective.units.map(name).join(" and ")
          : "the target",
      )} ${objective?.kind === "KILL" && objective.units.length > 1 ? "are" : "is"} dead.`;
    case "ESCORT_LOST":
      return `${capital(name(objective?.kind === "ESCORT" ? objective.unit : undefined))} was killed.`;
    case "UNIT_LOST":
      return `${capital(name(lostUnit?.tag))} was killed.`;
    case "PLACE_LOST":
      return `${capital(name(lostPlace?.tag))} fell.`;
    case "OUT_OF_TIME":
      return "Out of time.";
  }
}
