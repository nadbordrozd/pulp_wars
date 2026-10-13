import { describe, expect, it } from "vitest";
import {
  RULESET7_TACTICAL_UI_SYMBOL_BY_ID,
  RULESET7_TACTICAL_UI_SYMBOLS,
  RULESET7_TACTICAL_UI_THEME_TREATMENTS,
} from "../../src/assets/ruleset7-tactical-ui-symbols";
import {
  assertRuleset7TacticalUiOrder,
  RULESET7_TACTICAL_UI_ACTION_IDS,
} from "../../scripts/art/ruleset7-tactical-ui-order";

const EXPECTED_SYMBOL_IDS = [
  "ui-action-field-defense",
  "ui-status-port-active",
  "ui-status-port-blockaded",
  "ui-status-inspired",
  "ui-status-concealed",
  "ui-status-detected",
  "ui-status-exposed",
  "ui-status-spoils",
  "ui-status-blackout-cooldown",
  "ui-status-blackout-pending",
  "ui-status-blackout-active",
  "ui-status-blackout-recovery",
  "ui-status-achievement-progress",
  "ui-status-achievement-entitlement-locked",
  "ui-status-achievement-entitlement-unlocked",
  "ui-status-achievement-entitlement-spent",
  "ui-status-achievement-source-current-owner",
] as const;

describe("Ruleset 7 tactical action and status assets", () => {
  it("guards the exact initial pair and permits only a rejected member retry", () => {
    expect(() =>
      assertRuleset7TacticalUiOrder(
        RULESET7_TACTICAL_UI_ACTION_IDS.map((id) => ({ id })),
        { records: {} },
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7TacticalUiOrder([{ id: "ui-action-defection" }], {
        records: {},
      }),
    ).toThrow("exactly Defection and Blackout");
    expect(() =>
      assertRuleset7TacticalUiOrder(
        [
          { id: "ui-action-defection" },
          { id: "ui-action-blackout" },
          { id: "ui-action-pillage" },
        ],
        { records: {} },
      ),
    ).toThrow("unrelated generation families");
    const recorded = {
      records: {
        "ui-action-defection": { status: "REJECTED" },
        "ui-action-blackout": { status: "ACCEPTED" },
      },
    };
    expect(() =>
      assertRuleset7TacticalUiOrder([{ id: "ui-action-defection" }], recorded),
    ).not.toThrow();
    expect(() =>
      assertRuleset7TacticalUiOrder([{ id: "ui-action-blackout" }], recorded),
    ).toThrow("Do not regenerate accepted");
  });

  it("registers every required code-native role with unique static metadata", () => {
    expect(RULESET7_TACTICAL_UI_SYMBOLS.map(({ id }) => id)).toEqual(
      EXPECTED_SYMBOL_IDS,
    );
    expect(Object.keys(RULESET7_TACTICAL_UI_SYMBOL_BY_ID)).toEqual(
      EXPECTED_SYMBOL_IDS,
    );
    expect(new Set(EXPECTED_SYMBOL_IDS).size).toBe(EXPECTED_SYMBOL_IDS.length);
    for (const symbol of RULESET7_TACTICAL_UI_SYMBOLS) {
      expect(symbol.semanticLabel.length, symbol.id).toBeGreaterThan(8);
      expect(symbol.projectedSource.length, symbol.id).toBeGreaterThan(15);
      expect(symbol.reducedMotion, symbol.id).toBe("STATIC");
      expect(symbol.themeTreatmentId, symbol.id).toBe(
        "RULESET7_TACTICAL_STATIC_V1",
      );
      expect(symbol.primitives.length, symbol.id).toBeGreaterThan(0);
      for (const primitive of symbol.primitives) {
        expect(primitive.kind, symbol.id).toMatch(
          /^(line|circle|rect|polygon)$/,
        );
      }
    }
    expect(Object.keys(RULESET7_TACTICAL_UI_THEME_TREATMENTS)).toEqual([
      "LIGHT",
      "DARK",
      "HIGH_CONTRAST",
    ]);
    for (const treatment of Object.values(
      RULESET7_TACTICAL_UI_THEME_TREATMENTS,
    )) {
      expect(treatment.minimumGraphicalContrast).toBe(3);
      expect(treatment.boundary).toMatch(/^#[a-f0-9]{6}$/i);
      expect(Object.keys(treatment.tones)).toEqual([
        "ink",
        "paper",
        "slate",
        "bronze",
        "coral",
      ]);
    }
    expect(RULESET7_TACTICAL_UI_THEME_TREATMENTS.LIGHT.lineTonePolicy).toBe(
      "SEMANTIC_TONE",
    );
    expect(RULESET7_TACTICAL_UI_THEME_TREATMENTS.DARK.lineTonePolicy).toBe(
      "BOUNDARY_TONE",
    );
    expect(
      RULESET7_TACTICAL_UI_THEME_TREATMENTS.HIGH_CONTRAST.lineTonePolicy,
    ).toBe("BOUNDARY_TONE");
  });

  it("pins exact viewer-safe visibility boundaries without hidden inference", () => {
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-port-active"],
    ).toMatchObject({
      semanticLabel: "Owned active Port",
      semanticRole: "economy",
      visibility: "OWNER_ONLY",
      projectedSource: "PlayerViewV7 naval ownedPorts status ACTIVE",
    });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-port-blockaded"],
    ).toMatchObject({
      semanticLabel: "Owned blockaded Port",
      semanticRole: "economy",
      visibility: "OWNER_ONLY",
      projectedSource: "PlayerViewV7 naval ownedPorts status BLOCKADED",
    });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-inspired"],
    ).toMatchObject({
      semanticLabel: "Inspired by Captain Rally for the next attack",
      semanticRole: "combat",
      visibility: "PUBLIC_STATUS",
    });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-inspired"].projectedSource,
    ).toContain("PublicUnitStatsV7 ATTACK modifier source INSPIRED");
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-concealed"],
    ).toMatchObject({
      semanticLabel: "Concealment ability",
      visibility: "OWNER_ONLY",
    });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-concealed"].projectedSource,
    ).toContain("no claim");
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-detected"],
    ).toMatchObject({
      visibility: "DETECTED_VIEWER_ONLY",
    });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-detected"].projectedSource,
    ).toContain("visibility detection DETECTED");
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-detected"].projectedSource,
    ).toContain("no detector identity");
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-exposed"].projectedSource,
    ).toContain("ANCHOR_NEXT_ACCEPTED_END_TURN");
    expect(Object.keys(RULESET7_TACTICAL_UI_SYMBOL_BY_ID)).not.toEqual(
      expect.arrayContaining([
        "ui-action-pursue",
        "ui-action-end-pursuit",
        "ui-status-defection-waiting",
        "ui-status-defection-armed",
        "ui-status-defection-reservation",
        "ui-status-capacity-reservation",
      ]),
    );
    for (const id of [
      "ui-status-blackout-pending",
      "ui-status-blackout-active",
      "ui-status-blackout-recovery",
    ] as const)
      expect(RULESET7_TACTICAL_UI_SYMBOL_BY_ID[id]).toMatchObject({
        visibility: "BLACKOUT_FULL_OR_CITY_ONLY",
      });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID[
        "ui-status-achievement-source-current-owner"
      ],
    ).toMatchObject({ visibility: "OWNER_ONLY" });
  });
});
