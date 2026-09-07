import { deepFreeze } from "../model/freeze";
import type { PlayerId } from "../model/ids";
import type { PlayerEventEnvelopeV7 } from "./events";
import type { PlayerViewV7 } from "./view";

export const OMNISCIENT_ARTIFACT_KINDS_V7 = Object.freeze([
  "SAVE",
  "REPLAY",
  "STATE_HASH",
  "DEBUG_WITH_SPOILERS",
] as const);
export type OmniscientArtifactKindV7 =
  (typeof OMNISCIENT_ARTIFACT_KINDS_V7)[number];

const ACCESS = Symbol("ruleset-7 omniscient artifact access");
export interface OmniscientArtifactAccessV7 {
  readonly [ACCESS]: true;
  readonly purpose: OmniscientArtifactKindV7;
  readonly warning: "INCLUDES_HIDDEN_MAP_AND_UNITS";
}

/**
 * Explicit authority gate for reproduction/diagnostic artifacts. Live UI and
 * AI APIs accept PlayerViewV7 instead and never need this capability.
 */
export function authorizeOmniscientArtifactV7(input: {
  readonly purpose: OmniscientArtifactKindV7;
  readonly acknowledgeHiddenInformation: true;
}): OmniscientArtifactAccessV7 {
  if (
    input.acknowledgeHiddenInformation !== true ||
    !OMNISCIENT_ARTIFACT_KINDS_V7.includes(input.purpose)
  )
    throw new RangeError("Omniscient artifact access requires acknowledgement");
  return deepFreeze({
    [ACCESS]: true as const,
    purpose: input.purpose,
    warning: "INCLUDES_HIDDEN_MAP_AND_UNITS" as const,
  });
}

export interface OmniscientArtifactV7<T> {
  readonly classification: "OMNISCIENT";
  readonly warning: "INCLUDES_HIDDEN_MAP_AND_UNITS";
  readonly kind: OmniscientArtifactKindV7;
  readonly payload: T;
}

export function packageOmniscientArtifactV7<T>(
  access: OmniscientArtifactAccessV7,
  kind: OmniscientArtifactKindV7,
  payload: T,
): OmniscientArtifactV7<T> {
  if (access[ACCESS] !== true || access.purpose !== kind)
    throw new RangeError("Omniscient artifact capability mismatch");
  return deepFreeze({
    classification: "OMNISCIENT" as const,
    warning: "INCLUDES_HIDDEN_MAP_AND_UNITS" as const,
    kind,
    payload,
  });
}

export interface SafeLiveLogV7 {
  readonly classification: "PLAYER_SAFE";
  readonly viewerId: PlayerId;
  readonly view: PlayerViewV7;
  readonly eventBatches: readonly PlayerEventEnvelopeV7[];
}

export function createSafeLiveLogV7(
  view: PlayerViewV7,
  eventBatches: readonly PlayerEventEnvelopeV7[],
): SafeLiveLogV7 {
  if (
    eventBatches.some(
      (batch) =>
        batch.format !== "pulp-wars-player-events" ||
        batch.version !== 7 ||
        batch.viewerId !== view.viewer.id,
    )
  )
    throw new RangeError(
      "Safe log accepts only this viewer's projected batches",
    );
  return deepFreeze({
    classification: "PLAYER_SAFE" as const,
    viewerId: view.viewer.id,
    view,
    eventBatches,
  });
}
