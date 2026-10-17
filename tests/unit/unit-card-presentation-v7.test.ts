import { describe, expect, it } from "vitest";
import {
  viewForV7,
  type PublicUnitStatBreakdownV7,
  type PublicUnitStatTermV7,
} from "../../src/engine/index";
import {
  cardModifiersV7,
  modifierChipsV7,
  statSumTextV7,
  statusEffectsV7,
  statusModifierSourcesV7,
  statusPopoverV7,
} from "../../src/render/unit-card-presentation-v7";
import { statusGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { UNIT_CARD_UI_V7, unitCardFixtureV7 } from "../fixtures/v7-unit-card";

/**
 * The compact unit card (bead pulp_wars-2yc.86): a status chip that changes
 * the unit's numbers says how on a tap, exactly, from the public stat
 * terms.
 */

function term(
  source: PublicUnitStatTermV7["source"],
  numerator: number,
  denominator = 1,
): PublicUnitStatTermV7 {
  return {
    source,
    sourceLabel: source,
    description: `${source} sentence.`,
    value: { numerator, denominator },
  };
}

function stat(
  id: PublicUnitStatBreakdownV7["id"],
  label: string,
  base: number,
  modifiers: readonly PublicUnitStatTermV7[],
  visibility?: "BASE_ONLY",
): PublicUnitStatBreakdownV7 {
  const total = modifiers.reduce(
    (sum, entry) => sum + entry.value.numerator / entry.value.denominator,
    base,
  );
  return {
    id,
    label,
    current: null,
    base: term("ROLE_BASE", base),
    modifiers,
    total: { numerator: total, denominator: 1 },
    ...(visibility === undefined ? {} : { visibility }),
  };
}

describe("compact unit card: status chip numbers", () => {
  it("writes a stat's sum with its own terms only", () => {
    expect(
      statSumTextV7(stat("ATTACK", "Attack", 3, [term("INSPIRED", 2, 2)])),
    ).toBe("Attack 3 + 1 = 4");
    // A term that takes away, and a half.
    expect(
      statSumTextV7(stat("ATTACK", "Attack", 3, [term("HALF_POWER", -3, 2)])),
    ).toBe("Attack 3 − 1.5 = 1.5");
    // The tile's terms (cover, Walls, Field Defense) are not the unit's.
    const defense = stat("DEFENSE", "Defense", 2, [
      term("FOREST", 1),
      term("CRACKED", -2, 2),
    ]);
    expect(cardModifiersV7(defense).map((entry) => entry.source)).toEqual([
      "CRACKED",
    ]);
    expect(statSumTextV7(defense)).toBe("Defense 2 − 1 = 1");
    // No term, or a stat shown as its base only: no sum.
    expect(statSumTextV7(stat("MOVE", "Move", 1, []))).toBeNull();
    expect(
      statSumTextV7(
        stat("ATTACK", "Attack", 3, [term("INSPIRED", 1)], "BASE_ONLY"),
      ),
    ).toBeNull();
    // The HP term is the maximum's.
    expect(statSumTextV7(stat("HP", "HP", 10, [term("PROMOTION", 5)]))).toBe(
      "Max HP 10 + 5 = 15",
    );
  });

  it("gives each status chip its change and the stat's sum", () => {
    const stats = {
      stats: [
        stat("HP", "HP", 10, [term("PROMOTION", 5)]),
        stat("ATTACK", "Attack", 2, [
          term("CHARGE", 2, 2),
          term("INSPIRED", 1),
        ]),
        stat("MOVE", "Move", 1, [term("SUGAR_RUSH", 1)]),
      ],
    };
    expect(statusEffectsV7(stats, "inspired")).toEqual([
      { stat: "ATTACK", effect: "+1 Attack", sum: "Attack 2 + 1 + 1 = 4" },
    ]);
    // A Rushed unit: +1 Move (and +1 Attack when it has that term).
    expect(statusEffectsV7(stats, "rushed")).toEqual([
      { stat: "MOVE", effect: "+1 Move", sum: "Move 1 + 1 = 2" },
    ]);
    // A chip that changes no stat on the card: no numbers.
    expect(statusEffectsV7(stats, "toothache")).toEqual([]);
    expect(statusEffectsV7(undefined, "inspired")).toEqual([]);
    // Every term no chip stands for gets a chip of its own, once.
    expect(
      modifierChipsV7(stats, ["inspired", "rushed"]).map((chip) => [
        chip.id,
        chip.label,
      ]),
    ).toEqual([
      ["veteran", "Veteran"],
      ["charge", "Charge"],
    ]);
    expect(
      modifierChipsV7(stats, ["inspired", "veteran", "charge", "rushed"]),
    ).toEqual([]);
    for (const chip of modifierChipsV7(stats, []))
      expect(statusGlossaryV7(chip.id), chip.id).not.toBeNull();
    expect(statusModifierSourcesV7("frog")).toEqual([]);
  });

  it("reads the Inspired Veteran Knight's numbers from the engine", () => {
    const state = unitCardFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const knight = view.units.find(
      (unit) =>
        unit.at.x === UNIT_CARD_UI_V7.inspired.x &&
        unit.at.y === UNIT_CARD_UI_V7.inspired.y,
    );
    const stats = view.unitStats.find((entry) => entry.unitId === knight?.id);
    expect(knight?.role).toBe("KNIGHT");
    const attack = stats?.stats.find((entry) => entry.id === "ATTACK");
    const base =
      (attack?.base.value.numerator ?? 0) /
      (attack?.base.value.denominator ?? 1);
    const popover = statusPopoverV7(
      stats,
      "inspired",
      "Inspired",
      statusGlossaryV7("inspired")?.text ?? null,
    );
    expect(popover.effects).toEqual([
      {
        stat: "ATTACK",
        effect: "+1 Attack",
        sum: `Attack ${base} + 1 = ${base + 1}`,
      },
    ]);
    expect(popover.text).toBe("Its next attack this turn hits harder.");
    const maxHp = knight?.maxHp ?? 0;
    expect(statusEffectsV7(stats, "veteran")).toEqual([
      {
        stat: "HP",
        effect: "+5 Max HP",
        sum: `Max HP ${maxHp - 5} + 5 = ${maxHp}`,
      },
    ]);
    // The engine's Inspired line has its chip; Veteran is the card's own.
    expect(stats?.statuses.some((line) => line.startsWith("Inspired"))).toBe(
      true,
    );
    expect(modifierChipsV7(stats, ["inspired"]).map((chip) => chip.id)).toEqual(
      ["veteran"],
    );
  });
});
