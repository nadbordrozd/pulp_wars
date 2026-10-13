import type { UiSettings } from "../app/types";

export * from "./v7";
export * from "./browser-v7";
export * from "./campaign-v7";
export * from "./tribe-stars-v7";

export const SETTINGS_STORAGE_KEY = "pulpWars.settings.v1";
export const MAX_SETTINGS_BYTES = 16_384;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SettingsEnvelopeV1 {
  readonly format: "pulp-wars-settings";
  readonly version: 1;
  readonly settings: UiSettings;
}

export type SettingsLoadResult =
  | { readonly kind: "NONE" }
  | { readonly kind: "VALID"; readonly settings: UiSettings }
  | {
      readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

export type PersistenceWriteResult =
  { readonly ok: true } | { readonly ok: false; readonly diagnostic: string };

export type PersistenceScheduler = (task: () => void) => () => void;

export function parseSettings(source: string): SettingsLoadResult {
  if (byteLength(source) > MAX_SETTINGS_BYTES) {
    return { kind: "CORRUPT", diagnostic: "Settings exceed the size limit." };
  }
  let input: unknown;
  try {
    input = JSON.parse(source) as unknown;
  } catch {
    return { kind: "CORRUPT", diagnostic: "Settings are not valid JSON." };
  }
  if (!isRecord(input)) {
    return { kind: "CORRUPT", diagnostic: "Settings envelope is invalid." };
  }
  if (input.format !== "pulp-wars-settings" || input.version !== 1) {
    return {
      kind: "INCOMPATIBLE",
      diagnostic: "Settings use an unsupported format or version.",
    };
  }
  if (!hasExactKeys(input, ["format", "version", "settings"])) {
    return { kind: "CORRUPT", diagnostic: "Settings fields are invalid." };
  }
  const settings = parseUiSettings(input.settings);
  return settings === null
    ? { kind: "CORRUPT", diagnostic: "Settings schema validation failed." }
    : { kind: "VALID", settings };
}

function parseUiSettings(input: unknown): UiSettings | null {
  if (
    !hasExactKeys(input, [
      "uiScale",
      "motion",
      "animationSpeed",
      "highContrast",
    ]) ||
    (input.uiScale !== 1 &&
      input.uiScale !== 1.25 &&
      input.uiScale !== 1.5 &&
      input.uiScale !== 2) ||
    (input.motion !== "FULL" && input.motion !== "REDUCED") ||
    (input.animationSpeed !== "NORMAL" && input.animationSpeed !== "FAST") ||
    typeof input.highContrast !== "boolean"
  )
    return null;
  return {
    uiScale: input.uiScale,
    motion: input.motion,
    animationSpeed: input.animationSpeed,
    highContrast: input.highContrast,
  };
}

function hasExactKeys(
  input: unknown,
  expected: readonly string[],
): input is Record<string, unknown> {
  if (!isRecord(input)) return false;
  const keys = Object.keys(input).sort();
  const required = [...expected].sort();
  return (
    keys.length === required.length &&
    keys.every((key, index) => key === required[index])
  );
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
