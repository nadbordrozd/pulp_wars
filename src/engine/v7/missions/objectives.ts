import type { PlayerId, UnitId } from "../../model/ids";
import { arePlayersAlliedV7 } from "../economy";
import type {
  CoordV7,
  GameStateV7,
  MatchOutcomeV7,
  MatchSetupV7,
  MissionOutcomeCauseV7,
} from "../types";
import { allOwnedUnitsV7 } from "../units";
import { buildMissionStateV7 } from "./build";
import { missionDefinitionV7, missionMatchSetupV7 } from "./index";
import type {
  MissionBonusGoalV7,
  MissionDefinitionV7,
  MissionObjectiveV7,
} from "./types";

/**
 * Mission objectives (`pulp_wars-v642.1`, `pulp-wars-poc-7r82`;
 * docs/product/CAMPAIGN.md section 10.1, RULESET_7_CURRENT.md section 2.6).
 *
 * A mission's objective is data on its definition; nothing about it is
 * stored in the state except the outcome it decides. After every accepted
 * command of a match that is still open, the reducer asks
 * {@link missionOutcomeV7} for the outcome, which reads only the state
 * before the command, the state after it, and the definition, so a replay
 * reproduces it.
 *
 * The order within one command: **a win is judged before a loss**, and the
 * clock (`byRound`, `SURVIVE`) only when the command ended a round.
 *
 * 1. Win: no active seat hostile to the human is left; or the objective's
 *    own condition holds (`ESCORT`, `CAPTURE`, `KILL`); or, for `SURVIVE`,
 *    the command ended round `rounds` or a later one.
 * 2. Loss: the escorted unit is dead; a protected unit is dead; a protected
 *    place has changed hands; or the command ended round `byRound` or a
 *    later one.
 *
 * The human's elimination is the ordinary defeat and is decided by the
 * capture itself, before this is asked.
 */

/** A mission whose outcome is more than the ordinary elimination rule. */
export function missionHasGoalsV7(mission: MissionDefinitionV7): boolean {
  const objective = mission.objective;
  return (
    objective.kind !== "DOMINATION" ||
    objective.byRound !== undefined ||
    (objective.protect ?? []).length > 0 ||
    (objective.bonus ?? []).length > 0 ||
    mission.teams !== undefined
  );
}

/** The registered mission of a state's setup, or null. */
export function missionOfSetupV7(
  setup: Pick<MatchSetupV7, "mapType" | "mission">,
): MissionDefinitionV7 | null {
  return setup.mapType === "MISSION" && setup.mission !== undefined
    ? missionDefinitionV7(setup.mission)
    : null;
}

const TAG_CACHE_V7 = new WeakMap<
  MissionDefinitionV7,
  Map<string, ReadonlyMap<string, UnitId>>
>();

/**
 * The unit ID of every tagged unit of a mission, for the faction seat 0
 * plays. The builder numbers units deterministically, so the IDs are read
 * off the built initial state (built once per mission and faction).
 */
export function missionTaggedUnitsV7(
  mission: MissionDefinitionV7,
  setup: Pick<MatchSetupV7, "factions">,
): ReadonlyMap<string, UnitId> {
  const faction = setup.factions[0] ?? "ORIGINAL";
  let byFaction = TAG_CACHE_V7.get(mission);
  if (byFaction === undefined) {
    byFaction = new Map();
    TAG_CACHE_V7.set(mission, byFaction);
  }
  const cached = byFaction.get(faction);
  if (cached !== undefined) return cached;
  const tags = new Map<string, UnitId>();
  if (mission.seats.some((seat) => seat.units.some((unit) => unit.tag))) {
    const built = missionMatchSetupV7(mission, faction);
    if (built === null)
      throw new RangeError(`Mission ${mission.id}: no setup for ${faction}`);
    const initial = buildMissionStateV7(mission, built);
    mission.seats.forEach((seat, seatIndex) => {
      const owner = initial.players[seatIndex]?.id;
      for (const written of seat.units) {
        if (written.tag === undefined) continue;
        const unit = initial.units.find(
          (candidate) =>
            candidate.ownerId === owner &&
            candidate.at.x === written.at.x &&
            candidate.at.y === written.at.y,
        );
        if (unit === undefined)
          throw new RangeError(
            `Mission ${mission.id}: the tagged unit ${written.tag} was not built`,
          );
        tags.set(written.tag, unit.id);
      }
    });
  }
  byFaction.set(faction, tags);
  return tags;
}

/** The tile of a landmark; a definition names only landmarks it has. */
export function missionLandmarkV7(
  mission: MissionDefinitionV7,
  tag: string,
): CoordV7 {
  const landmark = (mission.landmarks ?? []).find((item) => item.tag === tag);
  if (landmark === undefined)
    throw new RangeError(`Mission ${mission.id}: no landmark ${tag}`);
  return landmark.at;
}

type OutcomeStateV7 = Pick<
  GameStateV7,
  | "setup"
  | "humanPlayerId"
  | "players"
  | "cities"
  | "units"
  | "giants"
  | "burrowed"
  | "round"
  | "turnOrder"
>;

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/**
 * A unit lives while it is on the board, burrowed under it, or held by an
 * Abomination.
 */
function unitLives(state: OutcomeStateV7, id: UnitId | undefined): boolean {
  return (
    id !== undefined &&
    (allOwnedUnitsV7(state).some((unit) => unit.id === id && unit.hp > 0) ||
      state.giants.swallowed.some((entry) => entry.unit.id === id))
  );
}

function friendly(state: OutcomeStateV7, owner: PlayerId): boolean {
  return (
    owner === state.humanPlayerId ||
    arePlayersAlliedV7(state, owner, state.humanPlayerId)
  );
}

function cityOwnerAt(state: OutcomeStateV7, at: CoordV7): PlayerId | null {
  return (
    state.cities.find((city) => city.at.x === at.x && city.at.y === at.y)
      ?.ownerId ?? null
  );
}

/** The human or an ally owns the city on the landmark. */
function placeHeld(
  state: OutcomeStateV7,
  mission: MissionDefinitionV7,
  tag: string,
): boolean {
  const owner = cityOwnerAt(state, missionLandmarkV7(mission, tag));
  return owner !== null && friendly(state, owner);
}

/**
 * A protected place still stands: the seat that started with the city owns
 * it; a landmark nobody started with is not owned by a hostile seat.
 */
function placeSafe(
  state: OutcomeStateV7,
  mission: MissionDefinitionV7,
  tag: string,
): boolean {
  const at = missionLandmarkV7(mission, tag);
  const owner = cityOwnerAt(state, at);
  const seat = mission.seats.findIndex((candidate) =>
    candidate.cities.some((city) => city.at.x === at.x && city.at.y === at.y),
  );
  if (seat === -1) return owner === null || friendly(state, owner);
  return owner === state.players[seat]?.id;
}

function enemiesLeft(state: OutcomeStateV7): boolean {
  return state.players.some(
    (player) => player.status === "ACTIVE" && !friendly(state, player.id),
  );
}

function objectiveWon(
  state: OutcomeStateV7,
  mission: MissionDefinitionV7,
  tags: ReadonlyMap<string, UnitId>,
  roundEnded: number | null,
): MissionOutcomeCauseV7 | null {
  const objective = mission.objective;
  if (!enemiesLeft(state)) return "ENEMIES_ELIMINATED";
  switch (objective.kind) {
    case "DOMINATION":
      return null;
    case "ESCORT": {
      const id = tags.get(objective.unit);
      const unit = state.units.find(
        (candidate) =>
          candidate.id === id &&
          candidate.hp > 0 &&
          candidate.ownerId === state.humanPlayerId,
      );
      return unit !== undefined &&
        chebyshev(unit.at, missionLandmarkV7(mission, objective.to)) <=
          objective.within
        ? "ESCORT_ARRIVED"
        : null;
    }
    case "SURVIVE":
      return roundEnded !== null && roundEnded >= objective.rounds
        ? "SURVIVED"
        : null;
    case "CAPTURE":
      return objective.places.every((tag) => placeHeld(state, mission, tag))
        ? "PLACES_CAPTURED"
        : null;
    case "KILL":
      return objective.units.every((tag) => !unitLives(state, tags.get(tag)))
        ? "TARGETS_KILLED"
        : null;
  }
}

function objectiveLost(
  state: OutcomeStateV7,
  mission: MissionDefinitionV7,
  tags: ReadonlyMap<string, UnitId>,
  roundEnded: number | null,
): MissionOutcomeCauseV7 | null {
  const objective = mission.objective;
  if (
    objective.kind === "ESCORT" &&
    !unitLives(state, tags.get(objective.unit))
  )
    return "ESCORT_LOST";
  for (const item of objective.protect ?? [])
    if ("unit" in item) {
      if (!unitLives(state, tags.get(item.unit))) return "UNIT_LOST";
    } else if (!placeSafe(state, mission, item.place)) return "PLACE_LOST";
  if (
    objective.kind !== "SURVIVE" &&
    objective.byRound !== undefined &&
    roundEnded !== null &&
    roundEnded >= objective.byRound
  )
    return "OUT_OF_TIME";
  return null;
}

/**
 * The outcome the mission's objective decides after an accepted command, or
 * null (no mission, a mission without goals, a match already decided, or
 * nothing decided yet). `actor` is the seat whose command it was: it is
 * named as the human's defeater when it is hostile to the human, otherwise
 * the first active hostile seat in turn order is.
 */
export function missionOutcomeV7(
  before: Pick<GameStateV7, "round">,
  after: OutcomeStateV7 & Pick<GameStateV7, "outcome">,
  actor: PlayerId,
): MatchOutcomeV7 | null {
  if (after.outcome !== null) return null;
  const mission = missionOfSetupV7(after.setup);
  if (mission === null || !missionHasGoalsV7(mission)) return null;
  const tags = missionTaggedUnitsV7(mission, after.setup);
  const roundEnded = after.round > before.round ? before.round : null;
  const won = objectiveWon(after, mission, tags, roundEnded);
  if (won !== null)
    return { kind: "VICTORY", winnerId: after.humanPlayerId, cause: won };
  const lost = objectiveLost(after, mission, tags, roundEnded);
  if (lost === null) return null;
  const hostile = (id: PlayerId): boolean =>
    after.players.some(
      (player) => player.id === id && player.status === "ACTIVE",
    ) && !friendly(after, id);
  const by = hostile(actor)
    ? actor
    : (after.turnOrder.find(hostile) ??
      after.players.find((player) => player.id !== after.humanPlayerId)?.id);
  if (by === undefined) return null;
  return {
    kind: "DEFEAT",
    humanId: after.humanPlayerId,
    defeatedByPlayerId: by,
    cause: lost,
  };
}

/** A named tile of the objective, as the interface marks it. */
export interface PublicMissionPlaceV7 {
  readonly tag: string;
  readonly at: CoordV7;
  /** What the objective wants there. */
  readonly role: "DESTINATION" | "CAPTURE" | "PROTECT" | "BONUS";
  /** `CAPTURE`, `BONUS`: held by the human's side; `PROTECT`: still safe. */
  readonly held: boolean;
}

/** A named unit of the objective. Its tile is the view's, when visible. */
export interface PublicMissionUnitV7 {
  readonly tag: string;
  readonly unitId: UnitId;
  readonly role: "ESCORT" | "KILL" | "PROTECT" | "BONUS";
  readonly alive: boolean;
}

/**
 * The public state of a mission's objective (`PlayerViewV7.mission`): the
 * same for every viewer, like the round and the score. A named unit is
 * public by its ID and whether it lives; where it stands is known only
 * through the viewer's own `units`.
 */
export interface PublicMissionStatusV7 {
  readonly missionId: string;
  readonly kind: MissionObjectiveV7["kind"];
  /**
   * The clock: `SURVIVE` counts down to the win, `DEADLINE` (`byRound`) to
   * the loss. `roundsLeft` counts the current round: 1 in the last round.
   */
  readonly clock: {
    readonly kind: "SURVIVE" | "DEADLINE";
    readonly lastRound: number;
    readonly roundsLeft: number;
  } | null;
  /** `ESCORT`: steps from the escorted unit to where it must stand. */
  readonly escortDistance: number | null;
  readonly places: readonly PublicMissionPlaceV7[];
  readonly units: readonly PublicMissionUnitV7[];
  /** Each secondary goal and whether it holds now. */
  readonly bonus: readonly {
    readonly goal: MissionBonusGoalV7;
    readonly met: boolean;
  }[];
  /** At the human's victory: 1 plus the secondary goals met; else null. */
  readonly stars: number | null;
}

function bonusMet(
  state: OutcomeStateV7,
  mission: MissionDefinitionV7,
  tags: ReadonlyMap<string, UnitId>,
  goal: MissionBonusGoalV7,
): boolean {
  switch (goal.kind) {
    case "WITHIN_ROUNDS":
      return state.round <= goal.rounds;
    case "KEEP_CITIES":
      return (mission.seats[0]?.cities ?? []).every(
        (city) => cityOwnerAt(state, city.at) === state.humanPlayerId,
      );
    case "UNIT_ALIVE":
      return unitLives(state, tags.get(goal.unit));
    case "HOLD_PLACE":
      return placeHeld(state, mission, goal.place);
  }
}

/**
 * The public objective state of a mission match, or null for any other
 * match. A plain `DOMINATION` mission has a status too (no clock, no named
 * tile or unit), so the interface reads every mission the same way.
 */
export function missionStatusV7(
  state: OutcomeStateV7 & Pick<GameStateV7, "outcome">,
): PublicMissionStatusV7 | null {
  const mission = missionOfSetupV7(state.setup);
  if (mission === null) return null;
  const objective = mission.objective;
  const tags = missionTaggedUnitsV7(mission, state.setup);
  const places: PublicMissionPlaceV7[] = [];
  const units: PublicMissionUnitV7[] = [];
  const place = (tag: string, role: PublicMissionPlaceV7["role"]): void => {
    places.push({
      tag,
      at: missionLandmarkV7(mission, tag),
      role,
      held:
        role === "PROTECT"
          ? placeSafe(state, mission, tag)
          : role === "DESTINATION"
            ? false
            : placeHeld(state, mission, tag),
    });
  };
  const unit = (tag: string, role: PublicMissionUnitV7["role"]): void => {
    const unitId = tags.get(tag);
    if (unitId === undefined || units.some((item) => item.tag === tag)) return;
    units.push({ tag, unitId, role, alive: unitLives(state, unitId) });
  };
  let escortDistance: number | null = null;
  if (objective.kind === "ESCORT") {
    unit(objective.unit, "ESCORT");
    place(objective.to, "DESTINATION");
    const id = tags.get(objective.unit);
    const escorted = state.units.find(
      (candidate) => candidate.id === id && candidate.hp > 0,
    );
    if (escorted !== undefined)
      escortDistance = Math.max(
        0,
        chebyshev(escorted.at, missionLandmarkV7(mission, objective.to)) -
          objective.within,
      );
  }
  if (objective.kind === "CAPTURE")
    for (const tag of objective.places) place(tag, "CAPTURE");
  if (objective.kind === "KILL")
    for (const tag of objective.units) unit(tag, "KILL");
  for (const item of objective.protect ?? [])
    if ("unit" in item) unit(item.unit, "PROTECT");
    else place(item.place, "PROTECT");
  for (const goal of objective.bonus ?? []) {
    if (goal.kind === "UNIT_ALIVE") unit(goal.unit, "BONUS");
    if (
      goal.kind === "HOLD_PLACE" &&
      !places.some((item) => item.tag === goal.place)
    )
      place(goal.place, "BONUS");
  }
  const lastRound =
    objective.kind === "SURVIVE" ? objective.rounds : objective.byRound;
  const bonus = (objective.bonus ?? []).map((goal) => ({
    goal,
    met: bonusMet(state, mission, tags, goal),
  }));
  return {
    missionId: mission.id,
    kind: objective.kind,
    clock:
      lastRound === undefined
        ? null
        : {
            kind: objective.kind === "SURVIVE" ? "SURVIVE" : "DEADLINE",
            lastRound,
            roundsLeft: Math.max(0, lastRound - state.round + 1),
          },
    escortDistance,
    places,
    units,
    bonus,
    stars:
      state.outcome?.kind === "VICTORY" &&
      state.outcome.winnerId === state.humanPlayerId
        ? 1 + bonus.filter((item) => item.met).length
        : null,
  };
}
