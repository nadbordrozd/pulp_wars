import type { CombatPreview } from "../../engine/index";

const NO_RETALIATION_REASON: Readonly<
  Record<NonNullable<CombatPreview["noRetaliationReason"]>, string>
> = {
  DEFENDER_DIED: "defender defeated",
  OUT_OF_RANGE: "defender out of range",
  ATTACKER_UNEXPLORED: "attacker tile unseen by defender",
};

/** Shared visible/semantic wording for the exact public combat calculation. */
export function accessibleCombatPreview(preview: CombatPreview): string {
  const retaliation =
    preview.noRetaliationReason === null
      ? `${preview.damageToAttacker} retaliation damage, attacker ${preview.attackerDies ? "defeated" : "survives"}`
      : `0 retaliation damage, ${NO_RETALIATION_REASON[preview.noRetaliationReason]}, attacker survives`;
  return `${preview.damageToDefender} defender damage, defender ${preview.defenderDies ? "defeated" : "survives"}; ${retaliation}; ${preview.advances ? "attacker advances" : "attacker does not advance"}`;
}

export function visibleCombatPreview(preview: CombatPreview): string {
  const retaliation =
    preview.noRetaliationReason === null
      ? `Retaliation -${preview.damageToAttacker} · attacker ${preview.attackerDies ? "defeated" : "survives"}`
      : `Retaliation 0 (${shortReason(preview.noRetaliationReason)}) · attacker survives`;
  return `Defender -${preview.damageToDefender} · ${preview.defenderDies ? "defeated" : "survives"}\n${retaliation} · ${preview.advances ? "advance" : "no advance"}`;
}

function shortReason(
  reason: NonNullable<CombatPreview["noRetaliationReason"]>,
): string {
  if (reason === "DEFENDER_DIED") return "defeated";
  if (reason === "OUT_OF_RANGE") return "range";
  return "unseen";
}
