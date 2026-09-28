import { describe, expect, it } from "vitest";
import { deepFreeze } from "../../src/engine/model/freeze";
import {
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  isAcceptedStateCertificateV7,
  reducerValidationDiagnosticsV7,
  resetReducerValidationDiagnosticsV7,
  type GameStateV7,
} from "../../src/engine/index";
import { setupV7 } from "../fixtures/v7-builders";

describe("ruleset-7 certified reducer inputs", () => {
  it("skips only the strict input parse for an exact accepted identity", () => {
    const created = createPlayableGameV7(setupV7(81));
    if (!created.ok) throw new Error(created.error.code);
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");

    resetReducerValidationDiagnosticsV7();
    const first = applyCommandV7(created.state, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    expect(first.accepted).toBe(true);
    if (!first.accepted) return;
    expect(reducerValidationDiagnosticsV7()).toEqual({
      strictInputs: 1,
      certifiedInputs: 0,
      checkedOutputs: 1,
    });
    expect(isAcceptedStateCertificateV7(first.state)).toBe(true);

    const unit = first.state.units.find(
      (candidate) => candidate.ownerId === actor,
    );
    if (unit === undefined) throw new Error("active unit missing");
    const second = applyCommandV7(first.state, actor, {
      kind: "WAIT",
      unitId: unit.id,
    });
    expect(second.accepted).toBe(true);
    expect(reducerValidationDiagnosticsV7()).toEqual({
      strictInputs: 1,
      certifiedInputs: 1,
      checkedOutputs: 2,
    });
  });

  it("keeps clones, mutable values, arbitrary freezes, and invalid states strict", () => {
    const created = createPlayableGameV7(setupV7(82));
    if (!created.ok) throw new Error(created.error.code);
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");
    const accepted = applyCommandV7(created.state, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    if (!accepted.accepted) throw new Error(accepted.error.code);
    const unit = accepted.state.units.find(
      (candidate) => candidate.ownerId === actor,
    );
    if (unit === undefined) throw new Error("active unit missing");
    const command = { kind: "WAIT" as const, unitId: unit.id };
    const mutable = structuredClone(accepted.state);
    const shallowFrozen = Object.freeze(structuredClone(accepted.state));
    const deeplyFrozen = deepFreeze(structuredClone(accepted.state));

    resetReducerValidationDiagnosticsV7();
    for (const state of [mutable, shallowFrozen, deeplyFrozen]) {
      expect(isAcceptedStateCertificateV7(state)).toBe(false);
      expect(applyCommandV7(state, actor, command).accepted).toBe(true);
    }
    expect(reducerValidationDiagnosticsV7()).toEqual({
      strictInputs: 3,
      certifiedInputs: 0,
      checkedOutputs: 3,
    });

    const invalid = {
      ...structuredClone(accepted.state),
      rulesetId: "not-ruleset-7",
    } as unknown as GameStateV7;
    const rejected = applyCommandV7(invalid, actor, command);
    expect(rejected).toMatchObject({
      accepted: false,
      state: invalid,
      error: { code: "INVALID_STATE" },
    });
    expect(rejected.state).toBe(invalid);
    expect(reducerValidationDiagnosticsV7()).toEqual({
      strictInputs: 4,
      certifiedInputs: 0,
      checkedOutputs: 3,
    });
  });

  it("preserves rejected state identity and never mutates strict or certified inputs", () => {
    const created = createPlayableGameV7(setupV7(83));
    if (!created.ok) throw new Error(created.error.code);
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");
    const accepted = applyCommandV7(created.state, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    if (!accepted.accepted) throw new Error(accepted.error.code);
    const command = {
      kind: "WAIT" as const,
      unitId: 999_999 as GameStateV7["units"][number]["id"],
    };
    const mutable = structuredClone(accepted.state);
    const certifiedHash = canonicalHash(accepted.state);
    const mutableHash = canonicalHash(mutable);

    resetReducerValidationDiagnosticsV7();
    const certifiedRejection = applyCommandV7(accepted.state, actor, command);
    const strictRejection = applyCommandV7(mutable, actor, command);
    expect(certifiedRejection).toMatchObject({
      accepted: false,
      error: { code: "UNIT_NOT_FOUND" },
    });
    expect(strictRejection).toMatchObject({
      accepted: false,
      error: { code: "UNIT_NOT_FOUND" },
    });
    expect(certifiedRejection.state).toBe(accepted.state);
    expect(strictRejection.state).toBe(mutable);
    expect(canonicalHash(accepted.state)).toBe(certifiedHash);
    expect(canonicalHash(mutable)).toBe(mutableHash);
    expect(reducerValidationDiagnosticsV7()).toEqual({
      strictInputs: 1,
      certifiedInputs: 1,
      checkedOutputs: 0,
    });
  });
});
