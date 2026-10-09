import {
  BREAK_OFF_UNITS_V7,
  DIGEST_DAMAGE_V7,
  GIANT_SIGNATURES_V7,
  TOSS_MINIMUM_RANGE_V7,
  breakOffActorRejectionV7,
  effectiveRoleRuleV7,
  roleMechanicsV7,
  stompRejectionV7,
  swallowRejectionV7,
  tossActorRejectionV7,
  tossPassengerLegalV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type BreakOffPreviewV7,
  type CombatPreviewV7,
  type CombatSplashEntryV7,
  type FactionIdV7,
  type GiantSignatureV7,
  type PlayerViewV7,
  type PublicUnitV7,
  type StompPreviewV7,
  type SwallowPreviewV7,
  type TossPreviewV7,
  type UnitRoleIdV7,
} from "../engine/index";
import { presentedUnitFactionV7 } from "./neutral-presentation-v7";

/**
 * The giants' signatures, presentation (`pulp_wars-w49.32`,
 * docs/product/RULESET_7_GIANTS.md section 10): the words of the eight
 * signatures for the unit card, the recruit and Gallery cards, the unit
 * glossary, the reward dialog, the four commands' buttons and aiming
 * panels, the board's preview labels, and the city panel's Walls. Every
 * number is read from the role mechanics (or a public preview), so no
 * number is written twice.
 */

/** Each signature ability's display name (section 6). */
export const GIANT_SIGNATURE_NAMES_V7: Readonly<
  Record<GiantSignatureV7, string>
> = Object.freeze({
  CRUSH: "Crushing Shove",
  SWALLOW: "Swallow",
  TOSS: "Goblin Toss",
  STOMP: "Thunder Stomp",
  OVERSTRIDE: "Overstride",
  GLACIAL_SMASH: "Glacial Smash",
  SIEGE_HAMMER: "Siege Hammer",
  BREAK_OFF: "Break Off",
});

/** Whether `ability` is one of the eight signature literals. */
export function isGiantSignatureV7(
  ability: string,
): ability is GiantSignatureV7 {
  return (GIANT_SIGNATURES_V7 as readonly string[]).includes(ability);
}

/** The display name of a signature ability, or null for any other. */
export function giantSignatureNameV7(ability: string): string | null {
  return isGiantSignatureV7(ability) ? GIANT_SIGNATURE_NAMES_V7[ability] : null;
}

/** The signature of a faction's reward giant (its `JUGGERNAUT` role). */
export function factionGiantSignatureV7(
  faction: FactionIdV7,
): GiantSignatureV7 | null {
  const abilities = effectiveRoleRuleV7("JUGGERNAUT", faction)
    .abilities as readonly string[];
  return (
    GIANT_SIGNATURES_V7.find((ability) => abilities.includes(ability)) ?? null
  );
}

/** The faction's own name of one of its roles ("Goblin", "Toffee Trooper"). */
const label = (role: UnitRoleIdV7, faction: FactionIdV7): string =>
  effectiveRoleRuleV7(role, faction).label;

const numberWord = (value: number): string =>
  ["no", "one", "two", "three", "four", "five", "six"][value] ?? String(value);

/**
 * The one-sentence rule of a signature under a faction, without its name,
 * starting with a lower-case letter: the unit card's line, the recruit and
 * Gallery ability line, and the Help sentence read it.
 */
export function giantSignatureRuleV7(
  signature: GiantSignatureV7,
  faction: FactionIdV7,
): string {
  const mechanics = roleMechanicsV7("JUGGERNAUT", faction);
  switch (signature) {
    case "CRUSH":
      return `a target it hits but cannot push back is crushed for ${mechanics.crushDamage} more, and an enemy behind it takes ${mechanics.crushDamage}`;
    case "SWALLOW":
      return `swallows an enemy of ${mechanics.swallowMaxHp} HP or less next to it, digests ${DIGEST_DAMAGE_V7} HP of it each turn to heal, and spits it out as a ${label("GUARD", "UNDEAD")}; the victim is freed if it dies first`;
    case "TOSS":
      return `throws a ${label("FIGHTER", "GOBLIN")} next to it ${TOSS_MINIMUM_RANGE_V7} to ${mechanics.tossRange} tiles, over anything in between; it may still attack or Kaboom after landing`;
    case "STOMP":
      return `if it has not moved, deals ${mechanics.stompDamage} to every enemy on the ground around it and smashes the Field Defense there; nobody hits back`;
    case "OVERSTRIDE":
      return `steps over units and through enemy zones of control, dealing ${mechanics.trampleDamage} to each enemy it steps over`;
    case "GLACIAL_SMASH":
      return `its hit shatters a Chilled enemy left at ${mechanics.glacialSmashHp} HP or less, and the shards Chill the enemies around it; it never advances`;
    case "SIEGE_HAMMER":
      return "its blows ignore Walls, Field Defense and Dig In, smash the Field Defense, and tear down a city's Walls for good";
    case "BREAK_OFF":
      return `spends ${mechanics.breakOffHp} HP to make ${numberWord(BREAK_OFF_UNITS_V7)} ${GINGERBREAD_MEN_LABEL_V7} next to it, each a ${label("FIGHTER", "CANDY")} at full health`;
  }
}

/**
 * The short ability description of a signature for the recruit and
 * Gallery cards (`roleAbilityDescriptionV7`), or null for any other
 * ability.
 */
export function giantAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (!isGiantSignatureV7(ability)) return null;
  const rule = giantSignatureRuleV7(ability, faction);
  return `${rule.charAt(0).toUpperCase()}${rule.slice(1)}.`;
}

/**
 * The unit card's one line for a selected giant (section 10: "the unit card
 * states the signature in one line"), from its public stats; null for a
 * unit without a signature.
 */
export function giantCardLineV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "role">,
): { readonly name: string; readonly text: string } | null {
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  const signature = stats?.giant?.signature;
  if (signature === undefined) return null;
  const rule = giantSignatureRuleV7(
    signature,
    presentedUnitFactionV7(view, unit),
  );
  return {
    name: GIANT_SIGNATURE_NAMES_V7[signature],
    text: `${rule.charAt(0).toUpperCase()}${rule.slice(1)}.`,
  };
}

/** The reward dialog's short phrase of each signature (section 10). */
const REWARD_PHRASES_V7: Readonly<Record<GiantSignatureV7, string>> = {
  CRUSH: "crushes what it cannot push",
  SWALLOW: "swallows enemies whole",
  TOSS: "throws Goblins",
  STOMP: "stomps everything around it",
  OVERSTRIDE: "strides over armies",
  GLACIAL_SMASH: "shatters Chilled enemies",
  SIEGE_HAMMER: "tears down city Walls",
  BREAK_OFF: "breaks off Gingerbread Men",
};

/**
 * The reward dialog's giant card: the giant's name and "A free Troll, once:
 * throws Goblins", with its slots when it takes more than one.
 */
export function giantRewardLabelV7(
  faction: FactionIdV7,
): readonly [string, string] {
  const name = label("JUGGERNAUT", faction);
  const signature = factionGiantSignatureV7(faction);
  const slots = roleMechanicsV7("JUGGERNAUT", faction).capacitySlots;
  return [
    name,
    `A free ${name}, once${signature === null ? "" : `: ${REWARD_PHRASES_V7[signature]}`}${slots > 1 ? ` (uses ${slots} unit slots)` : ""}`,
  ];
}

// ------------------------------------------------------------ Break Off ---

/** A Gingerbread Man (`variant: "GINGERBREAD_MAN"`), and two of them. */
export const GINGERBREAD_MAN_LABEL_V7 = "Gingerbread Man";
export const GINGERBREAD_MEN_LABEL_V7 = "Gingerbread Men";

/** The unit card's chip of a Gingerbread Man: what it is in every rule. */
export const GINGERBREAD_MAN_CHIP_V7 = "Toffee Trooper";

/** The unit card's sentence of a Gingerbread Man. */
export const GINGERBREAD_MAN_INFO_V7 =
  "Broken off a Gingerbread Giant: a Toffee Trooper in every way";

// ----------------------------------------------- the four commands' UI ---

export const SWALLOW_LABEL_V7 = GIANT_SIGNATURE_NAMES_V7.SWALLOW;
export const TOSS_LABEL_V7 = GIANT_SIGNATURE_NAMES_V7.TOSS;
export const STOMP_LABEL_V7 = GIANT_SIGNATURE_NAMES_V7.STOMP;
export const BREAK_OFF_LABEL_V7 = GIANT_SIGNATURE_NAMES_V7.BREAK_OFF;
/** The Thunder Stomp's one confirmation in its aiming panel. */
export const STOMP_CAST_V7 = "Stomp";

export const SWALLOW_PICK_V7 = "Choose an enemy to swallow";
export const TOSS_PICK_PASSENGER_V7 = "Choose the Goblin to throw";
export const TOSS_PICK_TILE_V7 = "Choose where the Goblin lands";
export const BREAK_OFF_PICK_FIRST_V7 =
  "Choose a tile for the first Gingerbread Man";
export const BREAK_OFF_PICK_SECOND_V7 =
  "Choose a tile for the second Gingerbread Man";

/** The tooltip of each of the four buttons, from the role mechanics. */
export function giantCommandTooltipV7(
  kind: "SWALLOW" | "TOSS" | "STOMP" | "BREAK_OFF",
  faction: FactionIdV7,
): string {
  const mechanics = roleMechanicsV7("JUGGERNAUT", faction);
  switch (kind) {
    case "SWALLOW":
      return `Swallow an enemy of ${mechanics.swallowMaxHp} HP or less next to it`;
    case "TOSS":
      return `Throw a ${label("FIGHTER", "GOBLIN")} next to it ${TOSS_MINIMUM_RANGE_V7} to ${mechanics.tossRange} tiles away`;
    case "STOMP":
      return `${mechanics.stompDamage} damage to every enemy on the ground around it`;
    case "BREAK_OFF":
      return `Spend ${mechanics.breakOffHp} HP to make ${numberWord(BREAK_OFF_UNITS_V7)} ${GINGERBREAD_MEN_LABEL_V7} next to it`;
  }
}

/**
 * Why the selected giant's button is unavailable, or null when its command
 * is offered, or when there is nothing to say (the unit is done for the
 * turn, or not the viewer's). Read from the engine's shared legality
 * predicates; the final reason (no target or tile) is the one left.
 */
export function giantCommandUnavailableTextV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  kind: "SWALLOW" | "TOSS" | "STOMP" | "BREAK_OFF",
  offered: boolean,
): string | null {
  if (offered || unit.ownerId !== view.viewer.id || unit.activation.handled)
    return null;
  const already = "Already acted this turn";
  switch (kind) {
    case "SWALLOW": {
      const rejection = swallowRejectionV7(
        view,
        view.giants.swallowed,
        unit,
        undefined,
      );
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (rejection.code === "UNIT_ALREADY_ACTED") return already;
      if (rejection.reason === "EMBARKED") return "Not at sea";
      if (rejection.reason === "FULL") return "Its belly is full";
      return `No enemy of ${unitRoleMechanicsV7(view, unit).swallowMaxHp} HP or less next to it`;
    }
    case "TOSS": {
      const rejection = tossActorRejectionV7(view, unit);
      if (rejection?.code === "UNIT_ROLE_INVALID") return null;
      if (rejection?.code === "UNIT_ALREADY_ACTED") return already;
      if (rejection?.code === "TOSS_NOT_LEGAL") return "Not at sea";
      const goblin = label("FIGHTER", "GOBLIN");
      return view.units.some((passenger) =>
        tossPassengerLegalV7(view, unit, passenger),
      )
        ? `No free tile for the ${goblin} to land on`
        : `No ${goblin} next to it`;
    }
    case "STOMP": {
      const rejection = stompRejectionV7(view, unit);
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (rejection.code === "UNIT_ALREADY_ACTED") return already;
      return rejection.reason === "MOVED" ? "It moved this turn" : "Not at sea";
    }
    case "BREAK_OFF": {
      const home = view.cities.find((city) => city.id === unit.homeCityId);
      const rejection = breakOffActorRejectionV7(
        view,
        unit,
        home?.ownerId ?? null,
      );
      if (rejection?.code === "UNIT_ROLE_INVALID") return null;
      if (rejection?.code === "UNIT_CRASHED") return "Crashed";
      if (rejection?.code === "UNIT_ALREADY_ACTED") return already;
      if (rejection?.code === "BREAK_OFF_NOT_LEGAL") {
        if (rejection.reason === "TOO_WEAK")
          return `Needs more than ${unitRoleMechanicsV7(view, unit).breakOffHp} HP`;
        if (rejection.reason === "NO_HOME") return "It has no home city";
        if (rejection.reason === "EMBARKED") return "Not at sea";
      }
      return `Needs ${numberWord(BREAK_OFF_UNITS_V7)} free tiles next to it`;
    }
  }
}

/** "1 turn", "3 turns". */
const turns = (count: number): string =>
  `${count} turn${count === 1 ? "" : "s"}`;

/** The board label of a Swallow target: "Swallow · 3 turns". */
export function swallowTargetLabelV7(preview: SwallowPreviewV7): string {
  return `${SWALLOW_LABEL_V7} · ${turns(preview.digestedAfterTurns)}`;
}

/** The cursor description of a Swallow target. */
export function swallowTargetNameV7(
  view: PlayerViewV7,
  preview: SwallowPreviewV7,
): string {
  const target = view.units.find((unit) => unit.id === preview.targetUnitId);
  const victim =
    target === undefined ? "unit" : unitRoleRuleV7(view, target).label;
  return `${SWALLOW_LABEL_V7} the ${victim} (${preview.hp} HP): digested in ${turns(preview.digestedAfterTurns)}, then it rises as your ${label("GUARD", "UNDEAD")}`;
}

/** The board label of a Goblin to throw. */
export const TOSS_PASSENGER_BADGE_V7 = "Throw";

/** The cursor description of a Toss landing tile. */
export function tossTileNameV7(preview: TossPreviewV7): string {
  const goblin = label("FIGHTER", "GOBLIN");
  return [
    `Throw the ${goblin} here`,
    preview.fieldDefenseDestroyed ? "it smashes the Field Defense" : null,
    preview.passengerMayAct
      ? "it can still attack or Kaboom"
      : "it cannot act after landing",
  ]
    .filter((part): part is string => part !== null)
    .join(": ");
}

/**
 * The board label of a Toss landing tile: none, or "Smashes Field Defense"
 * where the Goblin lands on an enemy Field Defense.
 */
export function tossTileLabelV7(preview: TossPreviewV7): string | null {
  return preview.fieldDefenseDestroyed ? "Smashes Field Defense" : null;
}

/** "−4" for a Stomp hit (the Shield's share included), the label of each unit. */
export function giantHitLabelV7(entry: CombatSplashEntryV7): string {
  return `−${entry.damage + entry.shieldDamage}`;
}

/** The Stomp aiming panel's summary. */
export function stompSummaryV7(preview: StompPreviewV7): string {
  const hits = preview.results.length;
  const kills = preview.results.filter((entry) => entry.dies).length;
  return [
    hits === 0
      ? "No enemy on the ground around it"
      : `Hits ${hits} ${hits === 1 ? "enemy" : "enemies"}${kills > 0 ? `, ${kills} lethal` : ""}`,
    preview.fieldDefenses.length > 0
      ? `smashes ${preview.fieldDefenses.length} Field Defense`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
}

/** The board label of a Break Off tile. */
export const BREAK_OFF_TILE_LABEL_V7 = GINGERBREAD_MAN_LABEL_V7;

/**
 * The Break Off aiming panel's summary: "The Giant goes to 30 HP; two
 * Gingerbread Men with 10 HP each".
 */
export function breakOffSummaryV7(preview: BreakOffPreviewV7): string {
  return `The Giant goes to ${preview.hpAfter} HP; ${numberWord(preview.count)} ${GINGERBREAD_MEN_LABEL_V7} with ${preview.trooperHp} HP each`;
}

// --------------------------------------------- previews and the card ---

/**
 * The giants' lines of an attack preview (section 10): the Crushing Shove
 * and its collision, the Siege Hammer and razed Walls, and the Glacial
 * Smash threshold.
 */
export function giantCombatNotesV7(
  preview: Pick<
    CombatPreviewV7,
    | "crush"
    | "crushDamage"
    | "collisionDamage"
    | "siegeHammer"
    | "wallsDestroyed"
    | "glacialSmash"
  >,
): readonly string[] {
  const notes: string[] = [];
  if (preview.crush === "WILL_CRUSH")
    notes.push(
      preview.collisionDamage > 0
        ? `Crush ${preview.crushDamage} · ${preview.collisionDamage} behind`
        : `Crush ${preview.crushDamage}`,
    );
  else if (preview.crush === "UNKNOWN_BEHIND_FOG")
    // What is behind the target is not known: it is pushed, or crushed.
    notes.push(`Push or crush ${preview.crushDamage}`);
  if (preview.siegeHammer) notes.push("Siege Hammer: no fortification");
  if (preview.wallsDestroyed) notes.push("Tears down the Walls");
  if (preview.glacialSmash) notes.push("Glacial Smash");
  return notes;
}

/** The label of an Overstride Move: "Trample −3" or "Trample −3 · −3". */
export function trampleLabelV7(
  results: readonly CombatSplashEntryV7[],
): string {
  return `Trample ${results.map(giantHitLabelV7).join(" · ")}`;
}

/**
 * The chip of an Abomination's held victim on its card, or null: the label
 * "Knight 9/13" and the tooltip "Swallowed Knight at 9 HP: it loses 4 each
 * turn and is digested in 3 turns; it is freed if the Abomination dies".
 */
export function swallowedVictimLineV7(
  view: PlayerViewV7,
  holderUnitId: number,
): { readonly label: string; readonly text: string } | null {
  const entry = view.giants.swallowed.find(
    (candidate) => candidate.holderUnitId === holderUnitId,
  );
  if (entry === undefined) return null;
  const name = unitRoleRuleV7(view, entry.unit).label;
  const left = Math.ceil(entry.unit.hp / DIGEST_DAMAGE_V7);
  return {
    label: `${name} ${entry.unit.hp}/${entry.unit.maxHp}`,
    text: `Swallowed ${name} at ${entry.unit.hp} HP: it loses ${DIGEST_DAMAGE_V7} each turn and is digested in ${turns(left)}; it is freed if the ${label("JUGGERNAUT", "UNDEAD")} dies`,
  };
}

// ----------------------------------------------------------- city Walls ---

/** The city panel's Walls stat (any viewer: Walls are public). */
export function cityWallsStatV7(city: {
  readonly rewards: readonly { readonly reward: string }[];
  readonly wallsRazed?: true;
}): { readonly value: string; readonly title: string } | null {
  if (!city.rewards.some((record) => record.reward === "WALLS")) return null;
  return city.wallsRazed === true
    ? {
        value: "Razed",
        title: `Torn down by a ${label("JUGGERNAUT", "DWARF")}'s Siege Hammer; Walls are never rebuilt`,
      }
    : { value: "Standing", title: "City Walls protect the unit on the centre" };
}
