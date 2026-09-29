import {
  FACTION_DISPLAY_NAMES_V7,
  factionRulesV7,
  gravesEnabledV7,
  playerFactionV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CoordV7,
  type DevourPreviewV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type RaiseDeadPreviewV7,
  type WailPreviewV7,
} from "../engine/index";

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

/** A unit's name under its owner's faction registration. */
export function unitLabelV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  return unitRoleRuleV7(view, unit).label;
}

export function unitIsUndeadV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "ownerId">,
): boolean {
  return playerFactionV7(view, unit.ownerId) === "UNDEAD";
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
  if (!factionRulesV7(view.viewer.faction).restless) return false;
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
    default:
      return null;
  }
}

export function undeadAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
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
  if (preview.attackerHeal > 0) parts.push(`Heal +${preview.attackerHeal}`);
  if (preview.defenderHeal > 0)
    parts.push(`Foe heals +${preview.defenderHeal}`);
  if (preview.defenderInfected) parts.push("Rises as Zombie");
  if (preview.attackerInfected) parts.push("You rise as enemy Zombie");
  return parts.length === 0 ? null : parts.join(" · ");
}

/** Screen-reader sentence for the same Lifesteal and Infect outcomes. */
export function combatPreviewSemanticNoteV7(
  preview: CombatPreviewV7,
): string | null {
  const parts: string[] = [];
  if (preview.attackerHeal > 0)
    parts.push(`Lifesteal heals the attacker by ${preview.attackerHeal} HP.`);
  if (preview.defenderHeal > 0)
    parts.push(`Lifesteal heals the defender by ${preview.defenderHeal} HP.`);
  if (preview.defenderInfected)
    parts.push("The defender dies and rises as a Zombie.");
  if (preview.attackerInfected)
    parts.push("The attacker dies and rises as an enemy Zombie.");
  return parts.length === 0 ? null : parts.join(" ");
}

export interface WailTargetPresentationV7 {
  readonly unitId: number;
  readonly at: CoordV7;
  readonly label: string;
  readonly damage: number;
  readonly dies: boolean;
  readonly leavesGrave: boolean;
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
    };
  });
}

/** Accessible Wail summary: target count, then per-target damage and deaths. */
export function wailPreviewDescriptionV7(
  view: PlayerViewV7,
  preview: WailPreviewV7,
): string {
  const targets = wailTargetsPresentationV7(view, preview);
  const kills = targets.filter((target) => target.dies).length;
  const list = targets
    .map(
      (target) =>
        `${target.label} −${target.damage}${target.dies ? " (dies)" : ""}`,
    )
    .join(", ");
  return `Hits ${targets.length} ${targets.length === 1 ? "enemy" : "enemies"} within 2 tiles${kills > 0 ? `, ${kills} ${kills === 1 ? "dies" : "die"}` : ""}: ${list}`;
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
 * Notification text for revision-13 events in one projected boundary. The
 * Grave-only case is logged but not toasted, so ordinary Undead-match kills
 * stay quiet.
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
  }
  if (graves > 0)
    parts.push(`${graves} ${graves === 1 ? "Grave" : "Graves"} left`);
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
