import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  type AiCountV7,
  type BoardSizeV7,
  type FactionIdV7,
  type MatchSetupV7,
  type PlayerColorV7,
} from "./types";
import { hasExactKeysV7, isDenseArrayV7, isUint32V7 } from "./schema";

const SETUP_KEYS_V7 = [
  "aiCount",
  "aiDifficulty",
  "aiMode",
  "factions",
  "height",
  "humanColor",
  "mapType",
  "mapGenerationRevision",
  "rulesetId",
  "seed",
  "width",
] as const;
/** The keys of a headless or test setup that allows mirror matches. */
const MIRROR_SETUP_KEYS_V7 = [
  ...SETUP_KEYS_V7,
  "allowDuplicateFactions",
] as const;

/**
 * Why a Ruleset 7 setup was refused. `DUPLICATE_FACTION`
 * (docs/product/RULESET_7_UNIQUE_FACTIONS.md): two seats chose the same
 * faction; `faction` is the first repeated faction in seat order and `seats`
 * every seat that chose it, ascending. Every other refusal is
 * `INVALID_SETUP`.
 */
export type MatchSetupErrorV7 =
  | {
      readonly code: "INVALID_SETUP";
      readonly params: Readonly<Record<string, never>>;
    }
  | {
      readonly code: "DUPLICATE_FACTION";
      readonly params: Readonly<{
        faction: FactionIdV7;
        seats: readonly number[];
      }>;
    };

export type MatchSetupValidationV7 =
  | { readonly ok: true; readonly setup: MatchSetupV7 }
  | { readonly ok: false; readonly error: MatchSetupErrorV7 };

/**
 * The first faction two or more seats share, in seat order, with every seat
 * that chose it; null when every seat plays a different faction.
 */
export function duplicateFactionV7(
  factions: readonly FactionIdV7[],
): { readonly faction: FactionIdV7; readonly seats: readonly number[] } | null {
  for (let seat = 0; seat < factions.length; seat += 1) {
    const faction = factions[seat];
    if (faction === undefined || factions.indexOf(faction) !== seat) continue;
    const seats = factions.flatMap((other, index) =>
      other === faction ? [index] : [],
    );
    if (seats.length > 1) return { faction, seats };
  }
  return null;
}

/**
 * The unique-factions rule (docs/product/RULESET_7_UNIQUE_FACTIONS.md): a
 * deterministic assignment in which every seat plays a different faction.
 * Seats keep their preferred faction in seat order; a seat whose preference
 * is missing or already taken by an earlier seat gets the first untaken
 * faction in registration order ({@link FACTION_IDS_V7}). With no
 * preferences the seats play Human, Undead, Goblin, and Dinosaur.
 */
export function distinctFactionsV7(
  seatCount: number,
  preferred: readonly (FactionIdV7 | undefined)[] = [],
): readonly FactionIdV7[] {
  if (
    !Number.isSafeInteger(seatCount) ||
    seatCount < 1 ||
    seatCount > FACTION_IDS_V7.length
  )
    throw new RangeError("seatCount must be between 1 and the faction count");
  const assigned: FactionIdV7[] = [];
  for (let seat = 0; seat < seatCount; seat += 1) {
    const wanted = preferred[seat];
    const faction =
      wanted !== undefined && !assigned.includes(wanted)
        ? wanted
        : FACTION_IDS_V7.find((candidate) => !assigned.includes(candidate));
    if (faction === undefined) throw new RangeError("no untaken faction");
    assigned.push(faction);
  }
  return assigned;
}

/**
 * Headless and test support only: the same setup marked to allow two or
 * more seats to play the same faction (mirror matches such as the balance
 * matrix's Human v Human). The browser never builds such a setup and refuses
 * to launch or resume one (docs/architecture/HEADLESS_SIMULATION.md).
 */
export function allowDuplicateFactionsV7(setup: MatchSetupV7): MatchSetupV7 {
  return { ...setup, allowDuplicateFactions: true };
}

/**
 * Validates a Ruleset 7 setup. Besides the shape and the board, seat, and
 * map constraints, every seat must play a different faction
 * (`DUPLICATE_FACTION`) unless the setup carries the headless and test only
 * `allowDuplicateFactions: true`.
 */
export function validateMatchSetupV7(input: unknown): MatchSetupValidationV7 {
  const invalid = {
    ok: false,
    error: { code: "INVALID_SETUP", params: {} },
  } as const;
  const mirror =
    typeof input === "object" &&
    input !== null &&
    Object.prototype.hasOwnProperty.call(input, "allowDuplicateFactions");
  if (!hasExactKeysV7(input, mirror ? MIRROR_SETUP_KEYS_V7 : SETUP_KEYS_V7))
    return invalid;
  if (
    (mirror && input.allowDuplicateFactions !== true) ||
    input.rulesetId !== RULESET_7_ID ||
    input.mapGenerationRevision !== "REGIONAL_BIOMES_NAVAL_V2" ||
    !isMapType(input.mapType) ||
    !isUint32V7(input.seed) ||
    !isBoardSize(input.width) ||
    input.height !== input.width ||
    !isAiCount(input.aiCount) ||
    input.width < minimumWidth(input.aiCount) ||
    // Revision 18 section 5.1: the Showcase board is exactly 16 x 16.
    (input.mapType === "SHOWCASE" && input.width !== 16) ||
    input.aiDifficulty !== "NORMAL" ||
    (input.aiMode !== "RIVAL" && input.aiMode !== "COOPERATIVE") ||
    !isColor(input.humanColor) ||
    !isDenseArrayV7(input.factions) ||
    input.factions.length !== input.aiCount + 1 ||
    !input.factions.every((faction) =>
      FACTION_IDS_V7.includes(faction as FactionIdV7),
    )
  )
    return invalid;
  const factions = [...input.factions] as readonly FactionIdV7[];
  const duplicate = mirror ? null : duplicateFactionV7(factions);
  if (duplicate !== null)
    return {
      ok: false,
      error: {
        code: "DUPLICATE_FACTION",
        params: { faction: duplicate.faction, seats: duplicate.seats },
      },
    };
  return {
    ok: true,
    setup: {
      rulesetId: RULESET_7_ID,
      seed: input.seed,
      width: input.width,
      height: input.width,
      aiCount: input.aiCount,
      aiDifficulty: "NORMAL",
      aiMode: input.aiMode,
      humanColor: input.humanColor,
      factions,
      mapType: input.mapType,
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
      ...(mirror ? { allowDuplicateFactions: true as const } : {}),
    },
  };
}

/** The validated setup, or null for any refusal ({@link validateMatchSetupV7}). */
export function parseMatchSetupV7(input: unknown): MatchSetupV7 | null {
  const result = validateMatchSetupV7(input);
  return result.ok ? result.setup : null;
}

function isMapType(input: unknown): input is MatchSetupV7["mapType"] {
  return (
    input === "DRY_LAND" ||
    input === "PANGEA" ||
    input === "CONTINENTS" ||
    input === "ARCHIPELAGO" ||
    input === "LAKES" ||
    input === "SHOWCASE"
  );
}

function minimumWidth(aiCount: AiCountV7): BoardSizeV7 {
  return aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
}

function isBoardSize(input: unknown): input is BoardSizeV7 {
  return (
    input === 11 || input === 14 || input === 16 || input === 20 || input === 25
  );
}

function isAiCount(input: unknown): input is AiCountV7 {
  return input === 1 || input === 2 || input === 3;
}

function isColor(input: unknown): input is PlayerColorV7 {
  return (
    input === "CORAL" ||
    input === "TEAL" ||
    input === "GOLD" ||
    input === "VIOLET"
  );
}
