import {
  FACTION_DISPLAY_NAMES_V7,
  PLAGUE_DURATION_TURNS_V7,
  factionRulesV7,
  factionTreeV7,
  gravesEnabledV7,
  isNeutralOwnerV7,
  playerFactionV7,
  unitFactionV7,
  queryPlayerCommandsV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CoordV7,
  type DevourPreviewV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type RaiseDeadPreviewV7,
  type TendWoundedPreviewV7,
  type WailPreviewV7,
} from "../engine/index";
import { HIDDEN_BLIZZARD_PREVIEW_V7 } from "./ice-folk-presentation-v7";

/**
 * Presentation helpers for revision 13 Undead (spec section 10). Every helper
 * reads only public views, public previews, and projected player events. A
 * match without an Undead seat never reaches a code path that changes its
 * revision-12 presentation.
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when the match setup includes an Undead seat. */
export function matchHasUndeadV7(view: Pick<PlayerViewV7, "setup">): boolean {
  return gravesEnabledV7(view.setup);
}

export function factionNameV7(faction: FactionIdV7): string {
  return FACTION_DISPLAY_NAMES_V7[faction];
}

/**
 * True when `faction` registers a role with Tend Wounded, the only cure for
 * Plague and Bitten (a Human Captain). Windmills and Troll regeneration heal
 * HP but cure nothing, so Goblins have no cure (revision 17 section 5.4).
 */
export function factionCanCureAfflictionsV7(faction: FactionIdV7): boolean {
  return Object.values(factionTreeV7(faction).roleRules).some((rule) =>
    rule.abilities.includes("TEND_WOUNDED"),
  );
}

/**
 * pulp_wars-0ao.18: how match-aware text names the one cure for Plague and
 * Bitten. "a Captain" in Human/Undead matches, "a Human Captain" when a Goblin
 * seat is also present, and null when no seat can Tend (so no cure exists).
 */
export function cureCaptainPhraseV7(
  view: Pick<PlayerViewV7, "players">,
): string | null {
  if (
    !view.players.some((player) => factionCanCureAfflictionsV7(player.faction))
  )
    return null;
  return view.players.some((player) => player.faction === "GOBLIN")
    ? "a Human Captain"
    : "a Captain";
}

/** A unit's name under its owner's faction registration. */
export function unitLabelV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  return unitRoleRuleV7(view, unit).label;
}

/** Whether a visible unit is of the Undead kind (`unitFactionV7`). */
export function unitIsUndeadV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "UNDEAD";
}

/**
 * Restless (section 5.3): an own land-form unit of a Restless faction that
 * stands outside its owner's territory cannot recover there.
 */
export function restlessOutsideTerritoryV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  if (unit.ownerId !== view.viewer.id || unit.form !== "LAND") return false;
  // The Mind Control revision: Restless is a body rule of the unit's kind.
  if (!factionRulesV7(unitFactionV7(view, unit)).restless) return false;
  const tile = view.board.tiles.find(
    (candidate) => candidate.at.x === unit.at.x && candidate.at.y === unit.at.y,
  );
  return tile?.explored !== true || tile.territoryOwnerId !== unit.ownerId;
}

/** The Recover action a Restless unit would otherwise have been offered. */
export function restlessRecoverBlockedV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  const activation = unit.activation;
  return (
    restlessOutsideTerritoryV7(view, unit) &&
    unit.hp < unit.maxHp &&
    !activation.handled &&
    !activation.moved &&
    !activation.attacked &&
    !activation.recovered &&
    !activation.captured &&
    !activation.specialActed
  );
}

export const RESTLESS_EXPLANATION_V7 =
  "Restless: Undead recover only inside your territory.";

/** Short Undead ability names; RALLY reads as Frenzy for Undead support. */
export function undeadAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "UNDEAD") return null;
  switch (ability) {
    case "RALLY":
      return "Frenzy";
    case "RAISE_DEAD":
      return "Raise Dead";
    case "DEVOUR":
      return "Devour";
    case "WAIL":
      return "Wail";
    case "INFECT":
      return "Infect";
    case "LIFESTEAL":
      return "Lifesteal";
    case "PLAGUE":
      return "Plague";
    case "BITE":
      return "Bite";
    case "UNANSWERED":
      return "Unanswered";
    default:
      return null;
  }
}

export function undeadAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
  // pulp_wars-0ao.18: `cureCaptainPhraseV7` of the match; null when no seat
  // can cure, so the Plague sentence names no cure.
  cureCaptain: string | null = "a Captain",
): string | null {
  if (faction !== "UNDEAD") return null;
  switch (ability) {
    case "RALLY":
      return "Frenzies adjacent friendly land troops except Necromancers, Liches and Banshees: +1 Attack on their next attack.";
    case "RAISE_DEAD":
      return "Raises a 5 HP Skeleton from every free Grave next to it.";
    case "DEVOUR":
      return "Eats the Grave under it to heal fully. Ends its turn.";
    case "WAIL":
      return "Damages every visible living enemy within 2 tiles. It can't attack.";
    case "INFECT":
      return "A land unit it kills rises as your Zombie.";
    case "LIFESTEAL":
      return "Heals by the damage it deals when it survives the fight.";
    case "PLAGUE":
      return `Living units its attacks hit are plagued for 3 turns: −2 HP each turn, spreading to neighbours on the first. It ends sooner if this Lich dies${
        cureCaptain === null ? "." : ` or ${cureCaptain} tends them.`
      }`;
    case "BITE":
      return "Living land units it damages are bitten and rise as your Zombies when they die.";
    case "UNANSWERED":
      return "Units it attacks never strike back.";
    default:
      return null;
  }
}

/** Undead command labels; Human commands keep their revision-12 labels. */
export function undeadCommandLabelV7(
  kind: string,
  faction: FactionIdV7,
): string | null {
  if (kind === "RAISE_DEAD") return "Raise Dead";
  if (kind === "DEVOUR") return "Devour";
  if (kind === "WAIL") return "Wail";
  if (kind === "RALLY" && faction === "UNDEAD") return "Frenzy";
  return null;
}

/**
 * Short canvas note for the Lifesteal and Infect outcomes of an attack
 * preview. It is null for every Human-only exchange (heal 0, not infected).
 */
export function combatPreviewNoteV7(preview: CombatPreviewV7): string | null {
  const parts: string[] = [];
  if (preview.noRetaliationReason === "UNANSWERED")
    parts.push("No retaliation");
  if (preview.attackerHeal > 0) parts.push(`Heal +${preview.attackerHeal}`);
  if (preview.defenderHeal > 0)
    parts.push(`Foe heals +${preview.defenderHeal}`);
  if (preview.defenderInfected) parts.push("Rises as Zombie");
  if (preview.defenderBittenRises) parts.push("Rises as Zombie (bitten)");
  if (preview.attackerInfected) parts.push("You rise as enemy Zombie");
  if (preview.attackerBittenRises)
    parts.push("You rise as enemy Zombie (bitten)");
  const plague = plagueNote(preview);
  if (plague !== null) parts.push(plague);
  if (preview.defenderBitten) parts.push("Bites");
  if (preview.attackerBitten) parts.push("You get bitten");
  return parts.length === 0 ? null : parts.join(" · ");
}

/** Revision 14: "Plagues target", or the count when splash targets join. */
function plagueNote(preview: CombatPreviewV7): string | null {
  const count = preview.plagued.length;
  if (count === 0) return null;
  return count === 1 && preview.plagued[0] === preview.targetUnitId
    ? "Plagues target"
    : `Plagues ${count} ${count === 1 ? "target" : "targets"}`;
}

/**
 * Screen-reader sentence for the same Lifesteal, Infect, Plague, Bitten and
 * unanswered-attack outcomes. `view` names the plagued units.
 */
export function combatPreviewSemanticNoteV7(
  preview: CombatPreviewV7,
  view?: PlayerViewV7,
): string | null {
  const parts: string[] = [];
  if (preview.noRetaliationReason === "UNANSWERED")
    parts.push("The defender can't strike back at a Vampire.");
  if (preview.attackerHeal > 0)
    parts.push(`Lifesteal heals the attacker by ${preview.attackerHeal} HP.`);
  if (preview.defenderHeal > 0)
    parts.push(`Lifesteal heals the defender by ${preview.defenderHeal} HP.`);
  if (preview.defenderInfected)
    parts.push("The defender dies and rises as a Zombie.");
  if (preview.defenderBittenRises)
    parts.push("The bitten defender dies and rises as a Zombie.");
  if (preview.attackerInfected)
    parts.push("The attacker dies and rises as an enemy Zombie.");
  if (preview.attackerBittenRises)
    parts.push("The bitten attacker dies and rises as an enemy Zombie.");
  if (preview.plagued.length > 0) {
    const names = preview.plagued.map((id) => {
      const unit = view?.units.find((candidate) => candidate.id === id);
      const label =
        view === undefined || unit === undefined
          ? "unit"
          : unitLabelV7(view, unit);
      return id === preview.targetUnitId ? `the target ${label}` : label;
    });
    parts.push(`Plagues ${names.join(", ")}.`);
  }
  if (preview.defenderBitten)
    parts.push("The defender is bitten and would rise as a Zombie on death.");
  if (preview.attackerBitten)
    parts.push("The attacker is bitten and would rise as a Zombie on death.");
  return parts.length === 0 ? null : parts.join(" ");
}

/**
 * Revision 14 afflictions of one visible unit, from the public `plagued` and
 * `bitten` lists: a short chip and a one-sentence explanation. A Plague
 * source is named only when the view shows that Lich.
 */
export type AfflictionIdV7 = "PLAGUE" | "BITTEN";

export interface UnitAfflictionV7 {
  readonly id: AfflictionIdV7;
  /** "Bitten", or revision 15 "Plague · N turns" (turns still to come). */
  readonly chip: string;
  readonly explanation: string;
}

export function unitAfflictionsV7(
  view: PlayerViewV7,
  unitId: number,
): readonly UnitAfflictionV7[] {
  const result: UnitAfflictionV7[] = [];
  // pulp_wars-0ao.16: name the Captain's cure only when the afflicted unit's
  // owner has one; Goblin units (no Tend Wounded) cannot be cured.
  const owner = view.units.find((unit) => unit.id === unitId)?.ownerId;
  // The neutral Giant Spider has no owner faction (and is never afflicted).
  const ownerFaction =
    owner === undefined || isNeutralOwnerV7(owner)
      ? undefined
      : playerFactionV7(view, owner);
  const uncurable =
    ownerFaction !== undefined && !factionCanCureAfflictionsV7(ownerFaction)
      ? `${factionNameV7(ownerFaction)}s`
      : null;
  const plague = view.plagued.find((entry) => entry.unitId === unitId);
  if (plague !== undefined) {
    const source =
      plague.sourceUnitId === null
        ? undefined
        : view.units.find((unit) => unit.id === plague.sourceUnitId);
    const lich =
      source === undefined
        ? "a hidden Lich"
        : `${possessive(view, source.ownerId)} ${unitLabelV7(view, source)}`;
    // Revision 15: Plague lasts `turnsRemaining` more of the unit's owner's
    // turns and spreads only at the first of the three.
    const turns = plague.turnsRemaining;
    const damage =
      turns === 1
        ? "−2 HP at the start of its next turn, then it ends"
        : `−2 HP at the start of each of its next ${turns} turns, then it ends`;
    const spread =
      turns >= PLAGUE_DURATION_TURNS_V7
        ? "; at the first it spreads to adjacent living units"
        : "";
    result.push({
      id: "PLAGUE",
      chip: `Plague · ${turns} ${turns === 1 ? "turn" : "turns"}`,
      explanation: `Plague from ${lich}: ${damage}${spread}. ${
        uncurable === null
          ? "It ends sooner if that Lich dies or a Captain tends it."
          : `It ends sooner only if that Lich dies; ${uncurable} can't cure it.`
      }`,
    });
  }
  const bite = view.bitten.find((entry) => entry.unitId === unitId);
  if (bite !== undefined) {
    const biter = possessive(view, bite.biterPlayerId);
    result.push({
      id: "BITTEN",
      chip: "Bitten",
      explanation: `Bitten by ${biter} Zombie: if it dies it rises as ${biter} Zombie${
        uncurable === null
          ? ", unless a Captain tends it first."
          : `; ${uncurable} can't cure bites.`
      }`,
    });
  }
  return result;
}

/** "your" for the viewer, otherwise "Player N's". */
function possessive(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `Player ${player.seat + 1}'s`;
}

/** Lower-case cursor cue, e.g. "plagued, bitten"; empty without statuses. */
export function afflictionCursorCueV7(
  view: PlayerViewV7,
  unitId: number,
): string {
  return unitAfflictionsV7(view, unitId)
    .map((affliction) => (affliction.id === "PLAGUE" ? "plagued" : "bitten"))
    .join(", ");
}

const DISBAND_BLOCK_CACHE = new WeakMap<
  PlayerViewV7,
  Map<number, "PLAGUED" | "BITTEN" | null>
>();

/**
 * Revision 14 (sections 3.6 and 4.5): the reason an own plagued or bitten
 * unit is not offered Disband, exactly when the same view without its
 * afflictions would offer it. `PLAGUED` wins when both apply.
 */
export function disbandBlockedByAfflictionV7(
  view: PlayerViewV7,
  unitId: number,
): "PLAGUED" | "BITTEN" | null {
  const plagued = view.plagued.some((entry) => entry.unitId === unitId);
  const bitten = view.bitten.some((entry) => entry.unitId === unitId);
  if (!plagued && !bitten) return null;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined || unit.ownerId !== view.viewer.id) return null;
  let byUnit = DISBAND_BLOCK_CACHE.get(view);
  if (byUnit === undefined) {
    byUnit = new Map();
    DISBAND_BLOCK_CACHE.set(view, byUnit);
  }
  const cached = byUnit.get(unitId);
  if (cached !== undefined) return cached;
  const unafflicted: PlayerViewV7 = {
    ...view,
    plagued: view.plagued.filter((entry) => entry.unitId !== unitId),
    bitten: view.bitten.filter((entry) => entry.unitId !== unitId),
  };
  const offered = queryPlayerCommandsV7(unafflicted).some(
    (command) => command.kind === "DISBAND" && command.unitId === unitId,
  );
  const reason = !offered ? null : plagued ? "PLAGUED" : "BITTEN";
  byUnit.set(unitId, reason);
  return reason;
}

export const DISBAND_BLOCKED_EXPLANATION_V7: Readonly<
  Record<"PLAGUED" | "BITTEN", string>
> = {
  PLAGUED: "Plagued units can't Disband.",
  BITTEN: "Bitten units can't Disband.",
};

/** Accessible Tend Wounded summary with heals and revision-14 cures. */
export function tendPreviewPresentationV7(
  view: PlayerViewV7,
  preview: TendWoundedPreviewV7,
): { readonly chip: string; readonly description: string } {
  const cures = preview.results.filter(
    (result) => result.curedPlague || result.curedBitten,
  ).length;
  const healed = preview.results.reduce(
    (sum, result) => sum + result.amount,
    0,
  );
  const list = preview.results
    .map((result) => {
      const unit = view.units.find(
        (candidate) => candidate.id === result.unitId,
      );
      const label = unit === undefined ? "Unit" : unitLabelV7(view, unit);
      const effects = [
        ...(result.amount > 0 ? [`+${result.amount} HP`] : []),
        ...(result.curedPlague ? ["cures Plague"] : []),
        ...(result.curedBitten ? ["cures bite"] : []),
      ];
      return `${label}: ${effects.join(", ")}`;
    })
    .join("; ");
  return {
    chip: [
      ...(healed > 0 ? [`+${healed} HP`] : []),
      ...(cures > 0 ? [`${cures} cure${cures === 1 ? "" : "s"}`] : []),
    ].join(" · "),
    description: `Tends ${preview.results.length} ${preview.results.length === 1 ? "unit" : "units"}: ${list}`,
  };
}

/**
 * Canvas label of one Tend target: `+2 HP`, `Cure`, or `+2 · Cure`. A cured
 * Chill is a cure too (bead pulp_wars-621), so a Chilled unit at full HP
 * reads "Cure", never "+0 HP".
 */
export function tendTargetLabelV7(
  result: TendWoundedPreviewV7["results"][number],
): string {
  const cure = result.curedPlague || result.curedBitten || result.curedChill;
  if (result.amount > 0 && cure) return `+${result.amount} · Cure`;
  return cure ? "Cure" : `+${result.amount} HP`;
}

export interface WailTargetPresentationV7 {
  readonly unitId: number;
  readonly at: CoordV7;
  readonly label: string;
  readonly damage: number;
  readonly dies: boolean;
  readonly leavesGrave: boolean;
  /** Revision 14: the death rises as the biter's Zombie. */
  readonly bittenRises: boolean;
  /**
   * The Ice Folk revision (section 10.10): a hidden Witch's Blizzard may
   * lower this damage, as the combat preview's caveat.
   */
  readonly hiddenBlizzardPossible: boolean;
}

/**
 * The board label of one Wail target: the damage ("?" when a hidden
 * Blizzard may change it) and "Rises" for a bitten death.
 */
export function wailTargetLabelV7(target: {
  readonly damage: number;
  readonly bittenRises: boolean;
  readonly hiddenBlizzardPossible: boolean;
}): string {
  return `−${target.damage}${target.hiddenBlizzardPossible ? "?" : ""}${target.bittenRises ? " · Rises" : ""}`;
}

export function wailTargetsPresentationV7(
  view: PlayerViewV7,
  preview: WailPreviewV7,
): readonly WailTargetPresentationV7[] {
  return preview.targets.map((target) => {
    const unit = view.units.find((candidate) => candidate.id === target.unitId);
    return {
      unitId: target.unitId,
      at: target.at,
      label: unit === undefined ? "Unit" : unitLabelV7(view, unit),
      damage: target.damage,
      dies: target.dies,
      leavesGrave: target.leavesGrave,
      bittenRises: target.bittenRises,
      hiddenBlizzardPossible: target.hiddenBlizzardPossible,
    };
  });
}

/**
 * Accessible Wail summary: target count, then per-target damage and deaths,
 * and the combat preview's hidden-Blizzard caveat when any target has it.
 */
export function wailPreviewDescriptionV7(
  view: PlayerViewV7,
  preview: WailPreviewV7,
): string {
  const targets = wailTargetsPresentationV7(view, preview);
  const kills = targets.filter((target) => target.dies).length;
  const list = targets
    .map(
      (target) =>
        `${target.label} −${target.damage}${target.hiddenBlizzardPossible ? "?" : ""}${target.bittenRises ? " (dies, rises as a Zombie)" : target.dies ? " (dies)" : ""}`,
    )
    .join(", ");
  const caveat = targets.some((target) => target.hiddenBlizzardPossible)
    ? `. ${HIDDEN_BLIZZARD_PREVIEW_V7}`
    : "";
  return `Hits ${targets.length} ${targets.length === 1 ? "enemy" : "enemies"} within 2 tiles${kills > 0 ? `, ${kills} ${kills === 1 ? "dies" : "die"}` : ""}: ${list}${caveat}`;
}

export function raiseDeadPreviewDescriptionV7(
  preview: RaiseDeadPreviewV7,
): string {
  const count = preview.graves.length;
  return `${count} ${count === 1 ? "Skeleton rises" : "Skeletons rise"} from adjacent Graves at 5 HP`;
}

export function devourPreviewDescriptionV7(preview: DevourPreviewV7): string {
  return `Eats the Grave: heal +${preview.amount} to ${preview.hpAfter} HP`;
}

/**
 * Notification text for revision-13 and revision-14 events in one projected
 * boundary. The Grave-only case is logged but not toasted, so ordinary
 * Undead-match kills stay quiet; Plague damage and spread toast only when
 * they reach the viewer's units. Human-only matches never emit these events
 * (and their Tend results never cure), so their notices are unchanged.
 */
export function undeadBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  const viewerId = after.viewer.id;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    after.units.find((unit) => unit.id === id) ??
    before.units.find((unit) => unit.id === id);
  const owned = (playerId: number, label: string): string => {
    if (playerId === viewerId) return label;
    const player = after.players.find((candidate) => candidate.id === playerId);
    return player === undefined
      ? label
      : `Player ${player.seat + 1}'s ${label}`;
  };
  const labelOf = (id: number, fallback: string): string => {
    const unit = unitById(id);
    return unit === undefined ? fallback : unitLabelV7(after, unit);
  };
  const parts: string[] = [];
  let toast = false;
  let graves = 0;
  let plagueDeaths = 0;
  for (const event of events) {
    if (event.kind === "DEAD_RAISED") {
      toast = true;
      const count = event.results.length;
      parts.push(
        `${owned(event.playerId, labelOf(event.unitId, "Necromancer"))} raised ${count} ${count === 1 ? "Skeleton" : "Skeletons"}`,
      );
    } else if (event.kind === "GRAVE_DEVOURED") {
      toast = true;
      parts.push(
        `${owned(event.playerId, labelOf(event.unitId, "Ghoul"))} devoured a Grave: +${event.amount} HP`,
      );
    } else if (event.kind === "WAIL_RESOLVED") {
      toast = true;
      const kills = event.results.filter((result) => result.dies).length;
      parts.push(
        `${owned(event.playerId, labelOf(event.unitId, "Banshee"))} wailed: ${event.results.length} hit${kills > 0 ? `, ${kills} fell` : ""}`,
      );
    } else if (event.kind === "UNIT_INFECTED") {
      toast = true;
      const victim = unitById(event.victimUnitId);
      const victimLabel =
        victim === undefined ? "unit" : unitLabelV7(after, victim);
      parts.push(`A fallen ${victimLabel} rose as a Zombie`);
    } else if (event.kind === "GRAVE_CREATED") graves += 1;
    else if (event.kind === "PLAGUE_DAMAGED") {
      // Revision 14 Start Turn Plague damage of one player's units.
      const own = event.playerId === viewerId;
      if (own) toast = true;
      const count = event.results.length;
      parts.push(
        `Plague hit ${count} of ${possessive(after, event.playerId)} ${count === 1 ? "unit" : "units"}`,
      );
    } else if (event.kind === "UNIT_DIED" && event.cause === "PLAGUE")
      plagueDeaths += 1;
    else if (event.kind === "PLAGUE_SPREAD") {
      const count = event.results.length;
      if (
        event.results.some(
          (result) => unitById(result.unitId)?.ownerId === viewerId,
        )
      )
        toast = true;
      parts.push(`Plague spread to ${count} ${count === 1 ? "unit" : "units"}`);
    } else if (event.kind === "PLAGUE_CLEARED") {
      toast = true;
      const count = event.unitIds.length;
      parts.push(
        `Plague lifted from ${count} ${count === 1 ? "unit" : "units"}`,
      );
    } else if (event.kind === "PLAGUE_EXPIRED") {
      // Revision 15: three turns of Plague ran out.
      if (event.playerId === viewerId) toast = true;
      const count = event.unitIds.length;
      parts.push(
        `Plague wore off ${count} of ${possessive(after, event.playerId)} ${count === 1 ? "unit" : "units"}`,
      );
    } else if (event.kind === "BITTEN_UNIT_RISEN") {
      toast = true;
      const victim = unitById(event.victimUnitId);
      const victimLabel =
        victim === undefined ? "unit" : unitLabelV7(after, victim);
      parts.push(
        `A bitten ${victimLabel} rose as ${possessive(after, event.playerId)} Zombie`,
      );
    } else if (event.kind === "WOUNDED_TENDED") {
      const plague = event.results.filter((result) => result.curedPlague);
      const bites = event.results.filter((result) => result.curedBitten);
      if (plague.length + bites.length > 0) {
        toast = true;
        const cures = [
          ...(plague.length > 0 ? [`Plague on ${plague.length}`] : []),
          ...(bites.length > 0
            ? [`${bites.length === 1 ? "a bite" : `${bites.length} bites`}`]
            : []),
        ];
        parts.push(`Tend cured ${cures.join(" and ")}`);
      }
    }
  }
  if (plagueDeaths > 0)
    parts.push(
      `${plagueDeaths} ${plagueDeaths === 1 ? "unit" : "units"} fell to Plague`,
    );
  if (graves > 0)
    parts.push(`${graves} ${graves === 1 ? "Grave" : "Graves"} left`);
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
