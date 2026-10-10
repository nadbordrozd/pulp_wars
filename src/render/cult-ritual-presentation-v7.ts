import {
  CULT_SUMMONED_ROLE_RULES_V7,
  FROG_DEFENSE2_V7,
  FROG_MOVE_V7,
  HERALD_FAVOUR_COST_V7,
  PROCLAIM_RANGE_V7,
  RIBBIT_RANGE_V7,
  RITUAL_MINIMUM_CHANTERS_V7,
  SWITCHEROO_RANGE_V7,
  TENTACLE_RANGE_V7,
  attackAllowanceV7,
  attacksLeftV7,
  beginRitualRejectionV7,
  bindingTauntsV7,
  cityIsCowedV7,
  favourOfV7,
  grabbingTentacleAtV7,
  isRobedCultistV7,
  pickMeRejectionV7,
  proclaimRejectionV7,
  ribbitRejectionV7,
  switcherooRejectionV7,
  technologyCapabilitiesV7,
  tentacleRejectionV7,
  unitCapabilitiesV7,
  unitIsFrogV7,
  unitRoleRuleV7,
  unitTauntsV7,
  type BeginRitualPreviewV7,
  type CityId,
  type CommandV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicRitualV7,
  type PublicUnitV7,
  type RibbitPreviewV7,
  type RitualFizzleReasonV7,
  type RitualKindV7,
  type RitualPreviewV7,
  type StarfallForecastV7,
  type SummoningForecastV7,
  type SwitcherooPreviewV7,
  type UnitId,
} from "../engine/index";
import {
  CHANNEL_ALREADY_ACTED_V7,
  CHANNEL_EMBARKED_V7,
  favourCostTextV7,
  strandsTextV7,
} from "./cult-channel-presentation-v7";

/**
 * The Cultists of the Ancient Ones, rituals, hexes and tricks in the
 * interface (bead `pulp_wars-mch9.19`; docs/product/RULESET_7_CULTISTS.md
 * sections 7, 8.2, 8.6, 9, and 14.3; docs/ui/BOARD_TARGETING.md section
 * 3.9): the words of Star-fall, the Great Summoning, Proclaim, Ribbit,
 * Switcheroo, Tentacle, and Pick Me!: the buttons and their reasons, the
 * marks' labels, the cursor's sentences, the unit card's chips, a frog's
 * real numbers, and the notices. This module imports the engine only and
 * names no tile and no ID.
 */

/** The seven actions the dock aims or casts with one button each. */
export const CULT_TRICK_KINDS_V7 = [
  "STARFALL",
  "GREAT_SUMMONING",
  "PROCLAIM",
  "RIBBIT",
  "SWITCHEROO",
  "TENTACLE",
  "PICK_ME",
] as const;
export type CultTrickKindV7 = (typeof CULT_TRICK_KINDS_V7)[number];

export const STARFALL_LABEL_V7 = "Star-fall";
export const GREAT_SUMMONING_LABEL_V7 = "Great Summoning";
export const PROCLAIM_LABEL_V7 = "Proclaim";
export const RIBBIT_LABEL_V7 = "Ribbit";
export const SWITCHEROO_LABEL_V7 = "Switcheroo";
export const TENTACLE_LABEL_V7 = "Tentacle";
export const PICK_ME_LABEL_V7 = "Pick Me!";

export const CULT_TRICK_LABELS_V7: Readonly<Record<CultTrickKindV7, string>> = {
  STARFALL: STARFALL_LABEL_V7,
  GREAT_SUMMONING: GREAT_SUMMONING_LABEL_V7,
  PROCLAIM: PROCLAIM_LABEL_V7,
  RIBBIT: RIBBIT_LABEL_V7,
  SWITCHEROO: SWITCHEROO_LABEL_V7,
  TENTACLE: TENTACLE_LABEL_V7,
  PICK_ME: PICK_ME_LABEL_V7,
};

/** The card texts (sections 7.2, 8.2, 8.6, and 9). */
export const CULT_TRICK_TOOLTIPS_V7: Readonly<Record<CultTrickKindV7, string>> =
  {
    STARFALL:
      "It and the cultists beside it chant. At the start of your next turn a star hits every unit on the marked tile and the eight around it, friend and foe. Each chanter makes it hit harder",
    GREAT_SUMMONING: `It and three or more cultists beside it chant, for ${HERALD_FAVOUR_COST_V7} Favour. At the start of your next turn the Herald stands on the marked tile and they all channel it`,
    PROCLAIM: `KNEEL! An enemy city within ${PROCLAIM_RANGE_V7} tiles hides in its cellars: no income and no city action until its owner's turn ends`,
    RIBBIT: `Turns an enemy within ${RIBBIT_RANGE_V7} tiles into a frog until its next turn ends. A frog hops one tile, is easy to hurt, and cannot attack or strike back`,
    SWITCHEROO: `It and a unit within ${SWITCHEROO_RANGE_V7} tiles swap places, friend or foe. Never on a city or village`,
    TENTACLE: `Up comes a Tentacle within ${TENTACLE_RANGE_V7} tiles. It belongs to nobody, and slaps and grabs whoever is weakest beside it`,
    PICK_ME:
      "I AM THE CHOSEN ONE! Enemies beside it can attack nobody else until your next turn",
  };

/** The instruction of each aimed action. */
export const CULT_TRICK_PICKS_V7: Readonly<
  Record<Exclude<CultTrickKindV7, "PICK_ME">, string>
> = {
  STARFALL: "Choose the tile the star falls on",
  GREAT_SUMMONING: "Choose a tile next to it for the Herald",
  PROCLAIM: "Choose an enemy city",
  RIBBIT: "Choose an enemy to turn into a frog",
  SWITCHEROO: "Choose a unit to swap places with",
  TENTACLE: "Choose a tile for the Tentacle",
};

/** The one confirmation of a chosen mark. */
export const RITUAL_BEGIN_V7 = "Begin";
/** What the cursor adds once a mark is chosen. */
export const RITUAL_CONFIRM_HINT_V7 = "Choose it again to begin";

/** The offered commands of one action of the unit `unitId`. */
export function cultTrickCommandsV7(
  commands: readonly CommandV7[],
  kind: CultTrickKindV7,
  unitId: UnitId,
): readonly CommandV7[] {
  return commands.filter((command) =>
    kind === "STARFALL" || kind === "GREAT_SUMMONING"
      ? command.kind === "BEGIN_RITUAL" &&
        command.ritual === kind &&
        command.unitId === unitId
      : command.kind === kind && command.unitId === unitId,
  );
}

// ------------------------------------------------------- The reasons ---

export const TRICK_FROGGED_V7 = "A frog can only hop";
export const STARFALL_MOVED_V7 = "It must not have moved this turn";
export const STARFALL_NO_CHANTER_V7 =
  "A cultist that has not acted must stand next to it";
export const GREAT_SUMMONING_NO_TILE_V7 = "No tile next to it for the Herald";
export const PROCLAIM_NO_ATTACK_V7 = "No attack left this turn";
export const PROCLAIM_OUT_OF_REACH_V7 = `No enemy city within ${PROCLAIM_RANGE_V7} tiles`;
export const PROCLAIM_COWED_V7 = "The city is Cowed already";
export const HEX_SPENT_V7 = "Spent: ready again next turn";
export const RIBBIT_NO_TARGET_V7 = `No enemy within ${RIBBIT_RANGE_V7} tiles it can hex`;
export const SWITCHEROO_NO_TARGET_V7 = `Nobody within ${SWITCHEROO_RANGE_V7} tiles to swap with`;
export const TENTACLE_EXISTS_V7 = "Its Tentacle is still up";
export const TENTACLE_NO_TILE_V7 = `No free tile within ${TENTACLE_RANGE_V7} tiles`;
export const PICK_ME_TAUNTING_V7 = "It shouted already";

/** "Needs 3 cultists beside it that have not acted". */
export function greatSummoningChantersTextV7(): string {
  return `Needs ${RITUAL_MINIMUM_CHANTERS_V7.GREAT_SUMMONING} cultists beside it that have not acted`;
}

/** "Needs 20 Favour". */
export function ritualNeedsFavourTextV7(cost: number): string {
  return `Needs ${cost} Favour`;
}

function abilitiesOf(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly string[] {
  return unitRoleRuleV7(view, unit).abilities;
}

/**
 * Tile facts that know no tile: the rules that read the actor answer
 * before the one that reads a tile, so only the last reason (`TILE`) comes
 * from them.
 */
const NO_TILE_FACTS = {
  tile: () => undefined,
  occupied: () => true,
  chest: () => false,
  curiosity: () => false,
  ice: () => false,
  allied: () => false,
  obstacle: () => true,
} as unknown as Parameters<typeof beginRitualRejectionV7>[1];

/**
 * Why the viewer's unit has no `kind` to use, or null when it is offered or
 * its button should not be shown at all (not its ability, not the viewer's
 * unit, or a technology it lacks). The reason is the engine's own first
 * failing rule.
 */
export function cultTrickUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  kind: CultTrickKindV7,
  offered: boolean,
): string | null {
  if (offered || unit.ownerId !== view.viewer.id) return null;
  const abilities = abilitiesOf(view, unit);
  const frog = unitIsFrogV7(view, unit);
  switch (kind) {
    case "STARFALL":
    case "GREAT_SUMMONING": {
      // The Summoner's own tile is never a legal mark: every rule of the
      // leader answers first, and `TILE` is what is left.
      const rejection = beginRitualRejectionV7(
        view,
        NO_TILE_FACTS,
        {
          favour: favourOfV7(view, view.viewer.id),
          greatSummoning: technologyCapabilitiesV7(
            view.viewer.researchedTechs,
            view.viewer.faction,
          ).greatSummoning,
        },
        view.units,
        unit,
        kind,
        unit.at,
      );
      if (
        rejection === null ||
        rejection.code === "UNIT_ROLE_INVALID" ||
        rejection.code === "TECH_REQUIRED"
      )
        return null;
      if (frog) return TRICK_FROGGED_V7;
      if (rejection.code === "UNIT_ALREADY_ACTED")
        return CHANNEL_ALREADY_ACTED_V7;
      if (rejection.code === "INSUFFICIENT_FAVOUR")
        return ritualNeedsFavourTextV7(rejection.cost);
      if (rejection.reason === "EMBARKED") return CHANNEL_EMBARKED_V7;
      if (rejection.reason === "MOVED") return STARFALL_MOVED_V7;
      if (rejection.reason === "CHANTERS") {
        if (kind === "STARFALL") return STARFALL_NO_CHANTER_V7;
        // Without a circle beside the Summoner (three robed cultists,
        // whatever they did this turn) there is no button: a Summoner on
        // its own business keeps a short dock.
        const circle = view.units.filter(
          (other) =>
            other.id !== unit.id &&
            other.ownerId === unit.ownerId &&
            Math.max(
              Math.abs(other.at.x - unit.at.x),
              Math.abs(other.at.y - unit.at.y),
            ) === 1 &&
            isRobedCultistV7(view, other) &&
            abilitiesOf(view, other).includes("CHANNEL"),
        ).length;
        return circle >= RITUAL_MINIMUM_CHANTERS_V7.GREAT_SUMMONING
          ? greatSummoningChantersTextV7()
          : null;
      }
      return kind === "GREAT_SUMMONING" ? GREAT_SUMMONING_NO_TILE_V7 : null;
    }
    case "PROCLAIM": {
      if (!abilities.includes("PROCLAIM")) return null;
      const cities = view.cities.filter(
        (city) => city.ownerId !== unit.ownerId,
      );
      const rejections = cities.map((city) =>
        proclaimRejectionV7(view, unit, city),
      );
      const first = proclaimRejectionV7(view, unit, undefined);
      if (first === null || first.code === "UNIT_ROLE_INVALID") return null;
      if (first.code === "UNIT_ALREADY_ACTED") return PROCLAIM_NO_ATTACK_V7;
      const reasons = rejections.flatMap((entry) =>
        entry?.code === "PROCLAIM_NOT_LEGAL" ? [entry.reason] : [],
      );
      // The nearer miss first: a city in reach that kneels already.
      if (reasons.includes("COWED")) return PROCLAIM_COWED_V7;
      return reasons.includes("RANGE") ? PROCLAIM_OUT_OF_REACH_V7 : null;
    }
    case "RIBBIT": {
      const rejection = ribbitRejectionV7(view, unit, undefined);
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (frog) return TRICK_FROGGED_V7;
      if (rejection.code === "UNIT_ALREADY_ACTED")
        return CHANNEL_ALREADY_ACTED_V7;
      if (rejection.reason === "EMBARKED") return CHANNEL_EMBARKED_V7;
      return rejection.reason === "COOLDOWN"
        ? HEX_SPENT_V7
        : RIBBIT_NO_TARGET_V7;
    }
    case "SWITCHEROO": {
      if (!abilities.includes("SWITCHEROO")) return null;
      const researched = view.viewer.researchedTechs;
      const unlocked = unitCapabilitiesV7(view, unit, researched).switcheroo;
      // Without Familiars (the technology) there is no button.
      if (!unlocked) return null;
      const rejection = switcherooRejectionV7(
        view,
        NO_TILE_FACTS,
        unlocked,
        { engineering: false, navigation: false },
        unit,
        undefined,
      );
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (frog) return TRICK_FROGGED_V7;
      if (rejection.code === "UNIT_ALREADY_ACTED")
        return CHANNEL_ALREADY_ACTED_V7;
      if (rejection.reason === "EMBARKED") return CHANNEL_EMBARKED_V7;
      return rejection.reason === "COOLDOWN"
        ? HEX_SPENT_V7
        : SWITCHEROO_NO_TARGET_V7;
    }
    case "TENTACLE": {
      const rejection = tentacleRejectionV7(view, NO_TILE_FACTS, unit, unit.at);
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return null;
      if (frog) return TRICK_FROGGED_V7;
      if (rejection.code === "UNIT_ALREADY_ACTED")
        return CHANNEL_ALREADY_ACTED_V7;
      if (rejection.reason === "EMBARKED") return CHANNEL_EMBARKED_V7;
      return rejection.reason === "EXISTS"
        ? TENTACLE_EXISTS_V7
        : TENTACLE_NO_TILE_V7;
    }
    case "PICK_ME": {
      const rejection = pickMeRejectionV7(view, unit);
      if (rejection === null || rejection.code === "UNIT_ROLE_INVALID")
        return frog && abilities.includes("PICK_ME") ? TRICK_FROGGED_V7 : null;
      if (frog) return TRICK_FROGGED_V7;
      if (rejection.code === "PICK_ME_NOT_LEGAL") return CHANNEL_EMBARKED_V7;
      return unitTauntsV7(view, unit)
        ? PICK_ME_TAUNTING_V7
        : CHANNEL_ALREADY_ACTED_V7;
    }
  }
}

// ------------------------------------------------ Marks and sentences ---

/** "−6": what a star takes from a unit. */
export function starfallHitLabelV7(damage: number): string {
  return `−${damage}`;
}

/** The label on a tile's unit that a Great Summoning's mark decides. */
export function summoningMarkLabelV7(
  forecast: SummoningForecastV7,
): string | null {
  if (forecast.outcome === "BLOCKED") return "Blocks";
  if (forecast.outcome === "CONSUMES") return `+${forecast.favour} Favour`;
  return null;
}

/** "your next turn" or "Player 2's next turn". */
function nextTurnOf(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your next turn";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined
    ? "its owner's next turn"
    : `Player ${player.seat + 1}'s next turn`;
}

/** "6 damage to every unit on these nine tiles". */
function starfallSentence(forecast: StarfallForecastV7): string {
  const hit = forecast.results.length;
  const kills = forecast.results.filter((entry) => entry.dies).length;
  return [
    `${forecast.damage} damage to every unit on the nine tiles`,
    hit === 0
      ? "nobody stands there now"
      : `${hit} ${hit === 1 ? "unit" : "units"} there now${kills > 0 ? `, ${kills} would die` : ""}`,
  ].join(": ");
}

/** What the Great Summoning does on its mark, in one clause. */
function summoningSentence(forecast: SummoningForecastV7): string {
  const strands = `the Herald starts with ${forecast.strands} of the ${forecast.control} strands it needs`;
  if (forecast.outcome === "BLOCKED")
    return "the unit on it blocks the Herald, and the Favour is lost";
  if (forecast.outcome === "CONSUMES")
    return `the unit on it is consumed for ${forecast.favour} Favour, and ${strands}`;
  return strands;
}

/** The cursor's sentence for a mark being chosen (an offered ritual). */
export function beginRitualTargetNameV7(preview: BeginRitualPreviewV7): string {
  if (preview.starfall !== null)
    return `Star-fall here at the start of your next turn: ${starfallSentence(preview.starfall)}.`;
  if (preview.summoning !== null)
    return `The Herald arrives here at the start of your next turn: ${summoningSentence(preview.summoning)}. ${favourCostTextV7(preview.favour)}.`;
  return "";
}

/** The cursor's sentence for a Star-fall mark before any forecast. */
export function starfallTargetNameV7(damage: number): string {
  return `Star-fall here at the start of your next turn: ${damage} damage to every unit on the nine tiles, friend and foe.`;
}

/**
 * The summary of a chosen mark in the dock: "6 damage · 3 units · 1 of
 * yours" for a star, "4 / 3 · consumes +18 Favour" for the Herald.
 */
export function beginRitualSummaryV7(
  view: PlayerViewV7,
  preview: BeginRitualPreviewV7,
): string {
  const chanters = preview.chanterUnitIds.length;
  const chant = `${chanters} ${chanters === 1 ? "chanter" : "chanters"}`;
  if (preview.starfall !== null) {
    const hits = preview.starfall.results;
    const own = hits.filter((entry) => entry.ownerId === view.viewer.id).length;
    return [
      chant,
      `${preview.starfall.damage} damage`,
      `${hits.length} ${hits.length === 1 ? "unit" : "units"}`,
      own > 0 ? `${own} of yours` : null,
    ]
      .filter((part): part is string => part !== null)
      .join(" · ");
  }
  const summoning = preview.summoning;
  if (summoning === null) return chant;
  return [
    chant,
    summoning.outcome === "BLOCKED"
      ? "blocked now"
      : strandsTextV7(summoning.strands, summoning.control),
    summoning.outcome === "CONSUMES"
      ? `consumes +${summoning.favour} Favour`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

/** The cursor's sentence for a ritual under way, for any viewer. */
export function ritualMarkNameV7(
  view: PlayerViewV7,
  preview: RitualPreviewV7,
): string {
  const when = `at the start of ${nextTurnOf(view, preview.ritual.playerId)}`;
  if (preview.starfall !== null)
    return `Star-fall lands here ${when}: ${starfallSentence(preview.starfall)}. Disrupt its circle and nothing happens.`;
  if (preview.summoning !== null)
    return `The Herald arrives here ${when}: ${summoningSentence(preview.summoning)}. A healthy unit on this tile blocks it.`;
  return `A ritual completes ${when}.`;
}

/** "Star-fall" or "the Great Summoning". */
export function ritualNameV7(kind: RitualKindV7): string {
  return kind === "STARFALL" ? STARFALL_LABEL_V7 : "the Great Summoning";
}

/** The label at a city an armed Proclaim may cow. */
export const PROCLAIM_TARGET_LABEL_V7 = "Kneel!";

/** The cursor's sentence for a Proclaim target. */
export function proclaimTargetNameV7(attacksLeftAfter: number): string {
  return `Proclaim at this city: it earns nothing and has no city action until its owner's turn ends. ${attacksLeftAfter === 0 ? "The Herald has no attack left after it" : `The Herald keeps ${attacksLeftAfter} attack`}.`;
}

/** The label at a unit an armed Ribbit may hex. */
export const RIBBIT_TARGET_LABEL_V7 = "Frog";

/** What a hex or a swap also breaks, as a short label, or null. */
export function trickBreaksLabelV7(facts: {
  readonly holdsStrand: boolean;
  readonly inRitual: boolean;
}): string | null {
  if (facts.holdsStrand) return "Strand breaks";
  return facts.inRitual ? "Leaves the circle" : null;
}

/** The cursor's sentence for a Ribbit target. */
export function ribbitTargetNameV7(
  target: string,
  preview: RibbitPreviewV7,
): string {
  const breaks = trickBreaksLabelV7(preview);
  return `Turn this ${target} into a frog until its next turn ends: Defense ${frogDefenseTextV7()}, Move ${FROG_MOVE_V7}, no attack.${breaks === null ? "" : ` ${breaks}.`}`;
}

/** The label at a unit an armed Switcheroo may swap with. */
export const SWITCHEROO_TARGET_LABEL_V7 = "Swap";

/** The cursor's sentence for a Switcheroo target. */
export function switcherooTargetNameV7(
  target: string,
  own: boolean,
  preview: SwitcherooPreviewV7,
): string {
  const breaks = trickBreaksLabelV7({
    holdsStrand: preview.targetHoldsStrand,
    inRitual: preview.targetInRitual,
  });
  return `Swap places with ${own ? "your" : "this"} ${target}.${breaks === null ? "" : ` ${breaks}.`}${preview.targetGrabbed ? " The Tentacle lets go of it." : ""}`;
}

/** The label on the unit an aimed Tentacle would slap at once. */
export const TENTACLE_SLAP_LABEL_V7 = "Slapped";

/** The cursor's sentence for a Tentacle tile. */
export function tentacleTileNameV7(slapped: string | null): string {
  return `Call a Tentacle up here. ${slapped === null ? "Nobody stands beside it now" : `It slaps and grabs ${slapped} at once`}.`;
}

/** The label on an enemy an offered Pick Me! would bind. */
export const PICK_ME_BOUND_LABEL_V7 = "Bound";

// ------------------------------------------------------ A frog's card ---

/** "0.5": a frog's flat Defense. */
export function frogDefenseTextV7(): string {
  return String(FROG_DEFENSE2_V7 / 2);
}

/**
 * Section 9.1: what the card of a frog shows in place of the unit's own
 * numbers: its flat Defense, its one Move, and no Attack. Null for a unit
 * that is no frog.
 */
export function frogCardStatsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): {
  readonly defense: string;
  readonly move: string;
  readonly attack: string;
} | null {
  return unitIsFrogV7(view, unit)
    ? {
        defense: frogDefenseTextV7(),
        move: String(FROG_MOVE_V7),
        attack: "—",
      }
    : null;
}

// ------------------------------------------------------------- Chips ---

/** A status chip of the selected unit's card. */
export interface CultTrickChipV7 {
  readonly id:
    | "chanting"
    | "frog"
    | "grabbed"
    | "taunted"
    | "pick-me"
    | "hex-spent"
    | "attacks";
  readonly label: string;
  /** Its one sentence (the tooltip and the accessible name). */
  readonly status: string;
  /** The raster asked for; the chip shows its word alone without one. */
  readonly icon:
    | `ICON:STATUS:${"CANDLELIT" | "FROG" | "GRABBED" | "PICK_ME"}`
    | `ICON:ACTION:${"RIBBIT" | "SWITCHEROO" | "PICK_ME"}`
    | null;
  /** A harm done to the unit: the chip takes the loss colour. */
  readonly harm?: true;
  /** A Herald's attacks: how many of its pips are lit. */
  readonly pips?: { readonly lit: number; readonly of: number };
}

/** The ritual `unit` takes part in, as its leader or a chanter. */
export function ritualOfUnitV7(
  view: PlayerViewV7,
  unitId: UnitId,
): PublicRitualV7 | null {
  return (
    tricksOfV7(view).rituals.find(
      (ritual) =>
        ritual.leaderUnitId === unitId ||
        ritual.chanterUnitIds.includes(unitId),
    ) ?? null
  );
}

/**
 * The chips of rituals, hexes and tricks on a visible unit's card, any
 * owner's (all of it is public): a chanter, a frog, a unit a Tentacle
 * holds, a unit a Chosen binds, a Chosen that shouted, a spent trick, and
 * the attacks an own Herald has left.
 */
export function cultTrickChipsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CultTrickChipV7[] {
  const chips: CultTrickChipV7[] = [];
  const ritual = ritualOfUnitV7(view, unit.id);
  if (ritual !== null)
    chips.push({
      id: "chanting",
      label: ritual.leaderUnitId === unit.id ? "Leads the chant" : "Chanting",
      status: `It chants for ${ritualNameV7(ritual.kind)}, and everyone who has explored its tile sees it. Hurt, move, or hex it and it leaves the circle`,
      icon: "ICON:STATUS:CANDLELIT",
    });
  if (unitIsFrogV7(view, unit))
    chips.push({
      id: "frog",
      label: "Frog",
      status: `A frog until its owner's next turn ends: Defense ${frogDefenseTextV7()}, Move ${FROG_MOVE_V7}, no attack, no strike back, no capture. A healer cures it`,
      icon: "ICON:STATUS:FROG",
      harm: true,
    });
  if (grabbingTentacleAtV7(view, unit.id) !== null)
    chips.push({
      id: "grabbed",
      label: "Grabbed",
      status:
        "A Tentacle holds it: it can move only to tiles next to that Tentacle",
      icon: "ICON:STATUS:GRABBED",
      harm: true,
    });
  if (bindingTauntsV7(view, view.units, unit).length > 0)
    chips.push({
      id: "taunted",
      label: "Taunted",
      status:
        "A Chosen beside it shouted Pick Me!: it can attack nobody but that Chosen",
      icon: "ICON:STATUS:PICK_ME",
      harm: true,
    });
  if (unitTauntsV7(view, unit))
    chips.push({
      id: "pick-me",
      label: PICK_ME_LABEL_V7,
      status:
        "Enemies beside it can attack nobody else, until its owner's next turn",
      icon: "ICON:ACTION:PICK_ME",
    });
  const cooldown = tricksOfV7(view).hexCooldowns.find(
    (entry) => entry.unitId === unit.id,
  );
  if (cooldown !== undefined)
    chips.push({
      id: "hex-spent",
      label: "Spent",
      status:
        cooldown.turnsRemaining >= 2
          ? "It used its trick: it cannot use it on its owner's next turn"
          : "It used its trick last turn: it is ready again next turn",
      icon: abilitiesOf(view, unit).includes("SWITCHEROO")
        ? "ICON:ACTION:SWITCHEROO"
        : "ICON:ACTION:RIBBIT",
    });
  // Ravage (section 4.2): an own Herald's attacks left of its two.
  if (
    unit.ownerId === view.viewer.id &&
    abilitiesOf(view, unit).includes("RAVAGE")
  ) {
    const of = attackAllowanceV7(view, unit);
    const lit = attacksLeftV7(view, unit);
    chips.push({
      id: "attacks",
      label: "Attacks",
      status: `Ravage: ${lit} of its ${of} attacks left this turn. A Proclaim takes one`,
      icon: null,
      pips: { lit, of },
    });
  }
  return chips;
}

/** The Cowed line of a city's panel, for any viewer that sees the city. */
export const COWED_LABEL_V7 = "Cowed";
export const COWED_TOOLTIP_V7 =
  "A Herald Proclaimed at it: no income and no city action until its owner's turn ends";
/** The banner over a Cowed city on the board. */
export const COWED_BANNER_V7 = "KNEEL!";
/** What a Chosen that shouted says on the board. */
export const PICK_ME_BUBBLE_V7 = "ME!";

/** Whether the city is Cowed in the viewer's view. */
export function cityCowedV7(view: PlayerViewV7, cityId: CityId): boolean {
  return cityIsCowedV7(view, cityId);
}

// ----------------------------------------------------------- Notices ---

const FIZZLE_REASONS_V7: Readonly<Record<RitualFizzleReasonV7, string>> = {
  LEADER: "its leader was disrupted",
  CHANTERS: "too few cultists still chant",
  BLOCKED: "the mark was blocked",
};

function seat(view: PlayerViewV7, playerId: number): string {
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "An enemy" : `Player ${player.seat + 1}`;
}

function unitLabel(view: PlayerViewV7, unitId: UnitId): string | null {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  return unit === undefined ? null : unitRoleRuleV7(view, unit).label;
}

const capital = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The notice of a boundary's ritual, hex and trick events (section 14.3),
 * for what the board alone might not explain: a ritual begun by another
 * seat, a ritual that fizzled, a star that fell, a Herald that arrived, a
 * unit consumed, a city Cowed, a unit of the viewer's hexed, swapped away
 * or grabbed, and a Chosen that binds the viewer's units. It names no tile
 * and no ID.
 */
export function cultTrickNoticePartsV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): readonly string[] {
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  for (const event of events) {
    switch (event.kind) {
      case "RITUAL_BEGUN":
        parts.push(
          event.playerId === viewerId
            ? `${capital(ritualNameV7(event.ritual))} begun: it completes at the start of your next turn`
            : `${seat(after, event.playerId)} begins ${ritualNameV7(event.ritual)}: break its circle before their next turn`,
        );
        break;
      case "RITUAL_FIZZLED":
        parts.push(
          `${event.playerId === viewerId ? "Your" : `${seat(after, event.playerId)}'s`} ${ritualNameV7(event.ritual).replace(/^the /, "")} fizzled: ${FIZZLE_REASONS_V7[event.reason]}`,
        );
        break;
      case "STAR_FELL":
        parts.push(`The star fell: ${event.damage} damage`);
        break;
      case "UNIT_CONSUMED": {
        const name = unitLabel(before, event.victimUnitId) ?? "unit";
        if (event.playerId === viewerId)
          parts.push(`${name} consumed: +${event.favour} Favour`);
        else if (event.victimOwnerId === viewerId)
          parts.push(`The Great Summoning consumed your ${name}`);
        break;
      }
      case "HERALD_ARRIVED":
        parts.push(
          event.playerId === viewerId
            ? `The ${CULT_SUMMONED_ROLE_RULES_V7.HERALD.label} arrives`
            : `${seat(after, event.playerId)}'s ${CULT_SUMMONED_ROLE_RULES_V7.HERALD.label} arrives`,
        );
        break;
      case "CITY_COWED":
        if (event.cityOwnerId === viewerId)
          parts.push(
            "KNEEL! Your city is Cowed: no income and no city action this turn",
          );
        else if (event.playerId === viewerId)
          parts.push("KNEEL! The city is Cowed");
        break;
      case "UNIT_FROGGED": {
        const name = unitLabel(after, event.targetUnitId) ?? "unit";
        if (event.targetOwnerId === viewerId)
          parts.push(`Your ${name} is a frog until your next turn ends`);
        else if (event.playerId === viewerId)
          parts.push(`Ribbit! The ${name} is a frog`);
        break;
      }
      case "UNITS_SWAPPED":
        if (event.targetOwnerId === viewerId && event.playerId !== viewerId)
          parts.push(
            `Switcheroo! Your ${unitLabel(after, event.targetUnitId) ?? "unit"} was swapped away`,
          );
        break;
      case "TENTACLE_ROSE":
        if (event.playerId !== viewerId) parts.push("A Tentacle rises");
        break;
      case "UNIT_GRABBED": {
        const grabbed = after.units.find(
          (candidate) => candidate.id === event.targetUnitId,
        );
        if (grabbed?.ownerId === viewerId)
          parts.push(
            `A Tentacle grabs your ${unitRoleRuleV7(after, grabbed).label}`,
          );
        break;
      }
      case "PICK_ME_SHOUTED": {
        if (event.playerId === viewerId) break;
        const bound = after.units.some(
          (unit) =>
            unit.ownerId === viewerId &&
            bindingTauntsV7(after, after.units, unit).some(
              (chosen) => chosen.id === event.unitId,
            ),
        );
        if (bound)
          parts.push(
            "Pick Me! Your units beside the Chosen can attack only it",
          );
        break;
      }
      default:
        break;
    }
  }
  return parts;
}

// ------------------------------------------------------- The cursor ---

/** The ritual, hex and trick lists of a view; empty in an older view. */
export function tricksOfV7(view: PlayerViewV7): {
  readonly rituals: PlayerViewV7["cult"]["rituals"];
  readonly cowed: PlayerViewV7["cult"]["cowed"];
  readonly frogs: PlayerViewV7["cult"]["frogs"];
  readonly hexCooldowns: PlayerViewV7["cult"]["hexCooldowns"];
  readonly taunts: PlayerViewV7["cult"]["taunts"];
  readonly tentacles: PlayerViewV7["cult"]["tentacles"];
} {
  const cult = (view as { readonly cult?: Partial<PlayerViewV7["cult"]> }).cult;
  return {
    rituals: cult?.rituals ?? [],
    cowed: cult?.cowed ?? [],
    frogs: cult?.frogs ?? [],
    hexCooldowns: cult?.hexCooldowns ?? [],
    taunts: cult?.taunts ?? [],
    tentacles: cult?.tentacles ?? [],
  };
}

/**
 * What the cursor reads of rituals, hexes and tricks on a tile, for any
 * viewer: the mark of a ritual under way and what it will do, a tile in a
 * star's path, a Cowed city, and the hex on the unit that stands there.
 * `forecast` gives a ritual's forecast (the engine's `previewRitualV7`).
 */
export function cultTrickTileLinesV7(
  view: PlayerViewV7,
  at: { readonly x: number; readonly y: number },
  forecast: (ritual: PublicRitualV7) => RitualPreviewV7,
): readonly string[] {
  const tricks = tricksOfV7(view);
  const lines: string[] = [];
  const here = (other: { readonly x: number; readonly y: number }): boolean =>
    other.x === at.x && other.y === at.y;
  for (const ritual of tricks.rituals) {
    if (ritual.at === null) continue;
    if (here(ritual.at)) {
      lines.push(ritualMarkNameV7(view, forecast(ritual)).replace(/\.$/, ""));
      continue;
    }
    if (
      ritual.kind === "STARFALL" &&
      Math.max(Math.abs(ritual.at.x - at.x), Math.abs(ritual.at.y - at.y)) === 1
    ) {
      const star = forecast(ritual).starfall;
      if (star !== null)
        lines.push(
          `In a star's path: ${star.damage} damage at the start of ${nextTurnOf(view, ritual.playerId)}`,
        );
    }
  }
  const city = view.cities.find((candidate) => here(candidate.at));
  if (
    city !== undefined &&
    tricks.cowed.some((entry) => entry.cityId === city.id)
  )
    lines.push(`${COWED_LABEL_V7}: ${COWED_TOOLTIP_V7}`);
  const unit = view.units.find((candidate) => here(candidate.at));
  if (unit !== undefined)
    for (const chip of cultTrickChipsV7(view, unit))
      if (chip.id !== "attacks") lines.push(`${chip.label}: ${chip.status}`);
  return lines;
}
