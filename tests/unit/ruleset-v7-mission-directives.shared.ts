// Helpers shared by ruleset-v7-mission-directives.test.ts and its
// whole-game simulations in ruleset-v7-mission-directives.sim.test.ts
// (`pulp_wars-bwry`).

import { inspectNormalTacticalFactsV7 } from "../../src/ai/v7";
import {
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type PlayerViewV7,
  type RectV7,
} from "../../src/engine/index";

export function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

export function setupOf(id: string): MatchSetupV7 {
  const setup = missionMatchSetupV7(mission(id));
  if (setup === null) throw new Error(`no ${id} setup`);
  return setup;
}

export function playable(id: string): GameStateV7 {
  const created = createPlayableGameV7(setupOf(id));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

export function zoneOf(id: string): readonly RectV7[] {
  const directive = mission(id).seats[1]?.directive;
  if (directive === undefined || !("zone" in directive))
    throw new Error(`${id} has no zone`);
  return directive.zone;
}

export function jobs(view: PlayerViewV7) {
  return inspectNormalTacticalFactsV7(view).campaign;
}

export function ownLand(view: PlayerViewV7) {
  return view.units.filter(
    (unit) => unit.ownerId === view.viewer.id && unit.form === "LAND",
  );
}
