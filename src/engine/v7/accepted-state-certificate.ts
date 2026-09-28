import type { GameStateV7 } from "./types";

const acceptedStateCertificatesV7 = new WeakSet<object>();

export function hasAcceptedStateCertificateV7(state: GameStateV7): boolean {
  return acceptedStateCertificatesV7.has(state);
}

export function registerAcceptedStateCertificateV7(state: GameStateV7): void {
  // This module is intentionally absent from engine/index.ts. The reducer is
  // the only registrar, after strict checked() validation and deepFreeze().
  acceptedStateCertificatesV7.add(state);
}
