// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  PERMANENT_DISABLED_REASON_KEYS_V7,
  disabledReasonPermanenceV7,
  hidePermanentlyDisabledActionsV7,
} from "../../src/render/disabled-reasons-v7";
import { CANDY_FIELD_DEFENSE_EXPLANATION_V7 } from "../../src/render/candy-presentation-v7";
import { DINOSAUR_FIELD_DEFENSE_EXPLANATION_V7 } from "../../src/render/dinosaur-presentation-v7";
import {
  ASSEMBLE_NEEDS_TECH_V7,
  ASSEMBLE_NO_HOME_V7,
  BOMB_FROZEN_V7,
  CLOCKWORK_RECOVER_V7,
} from "../../src/render/dwarf-presentation-v7";
import {
  CRACK_ICE_BUILT_V7,
  CRACK_ICE_OCCUPIED_V7,
  FREEZE_ALREADY_ACTED_V7,
  FREEZE_NEEDS_PACK_ICE_V7,
  FREEZE_NEEDS_RIME_V7,
  FREEZE_NO_TARGET_V7,
  ICEBOUND_BLOCKED_V7,
} from "../../src/render/frozen-sea-presentation-v7";
import { GOBLIN_FIELD_DEFENSE_EXPLANATION_V7 } from "../../src/render/goblin-presentation-v7";
import { ICE_FOLK_FIELD_DEFENSE_EXPLANATION_V7 } from "../../src/render/ice-folk-presentation-v7";
import {
  MARTIAN_ACTED_V7,
  MARTIAN_FIELD_DEFENSE_EXPLANATION_V7,
  MARTIAN_FROZEN_MOVED_V7,
  TRACTOR_USED_V7,
} from "../../src/render/martian-presentation-v7";
import {
  BOARD_NEEDS_NAVIGATION_V7,
  BOARD_SEA_BEAST_V7,
} from "../../src/render/naval-presentation-v7";
import {
  SACRIFICE_AFFLICTED_V7,
  SEIZE_IMMUNE_V7,
  SUMMONER_ALREADY_ACTED_V7,
} from "../../src/render/cult-presentation-v7";
import { RESTLESS_EXPLANATION_V7 } from "../../src/render/undead-presentation-v7";

/**
 * Bead pulp_wars-2yc.108: a disabled dock action is shown only when its
 * reason can change. The classifier names the reasons that never change
 * (a faction or unit kind that can never take the action).
 */
describe("disabled action reasons", () => {
  it("classifies every faction-wide or kind-wide refusal as permanent", () => {
    for (const key of PERMANENT_DISABLED_REASON_KEYS_V7)
      expect(disabledReasonPermanenceV7(key), key).toBe("PERMANENT");
    for (const words of [
      MARTIAN_FIELD_DEFENSE_EXPLANATION_V7,
      GOBLIN_FIELD_DEFENSE_EXPLANATION_V7,
      DINOSAUR_FIELD_DEFENSE_EXPLANATION_V7,
      ICE_FOLK_FIELD_DEFENSE_EXPLANATION_V7,
      CANDY_FIELD_DEFENSE_EXPLANATION_V7,
      CLOCKWORK_RECOVER_V7,
      // A new reason worded the same way is caught too.
      "Martians cannot board ships",
      "Undead never heal",
    ])
      expect(disabledReasonPermanenceV7(words), words).toBe("PERMANENT");
    expect(disabledReasonPermanenceV7("Goblin-Field-Defense")).toBe(
      "PERMANENT",
    );
  });

  it("keeps every temporary or situational reason", () => {
    for (const reason of [
      // Keys of the dock's own disabled buttons.
      "hatch-new-egg",
      "restless",
      "plagued",
      "bitten",
      "frozen",
      "icebound",
      "coins",
      "slots",
      "center-occupied",
      "land-grant-coins",
      "outside-borders",
      "enemy-on-tile",
      "city-action-spent",
      "insufficient_coins",
      // Reasons in words: no target, already acted, Frozen, Coins, a
      // technology the player can research, a target's own state.
      MARTIAN_FROZEN_MOVED_V7,
      MARTIAN_ACTED_V7,
      TRACTOR_USED_V7,
      FREEZE_NEEDS_RIME_V7,
      FREEZE_NEEDS_PACK_ICE_V7,
      FREEZE_ALREADY_ACTED_V7,
      FREEZE_NO_TARGET_V7,
      CRACK_ICE_OCCUPIED_V7,
      CRACK_ICE_BUILT_V7,
      ICEBOUND_BLOCKED_V7,
      ASSEMBLE_NEEDS_TECH_V7,
      ASSEMBLE_NO_HOME_V7,
      BOMB_FROZEN_V7,
      BOARD_NEEDS_NAVIGATION_V7,
      BOARD_SEA_BEAST_V7,
      SACRIFICE_AFFLICTED_V7,
      SEIZE_IMMUNE_V7,
      SUMMONER_ALREADY_ACTED_V7,
      RESTLESS_EXPLANATION_V7,
      "Recovering: 2 turns",
      "Need 3 more Coins",
    ])
      expect(disabledReasonPermanenceV7(reason), reason).toBe("SITUATIONAL");
  });

  it("drops only the permanently disabled actions from a row", () => {
    const row = document.createElement("div");
    const make = (action: string, reason: string | null): HTMLElement => {
      const button = document.createElement("button");
      button.dataset.action = action;
      if (reason !== null) {
        button.setAttribute("aria-disabled", "true");
        button.dataset.disabledReason = reason;
      }
      row.append(button);
      return button;
    };
    make("command-move", null);
    make("martian-field-defense", "martian-field-defense");
    make("martian-tractor-beam", TRACTOR_USED_V7);
    make("clockwork-recover", "clockwork");
    make("hatch-unavailable", "hatch-new-egg");
    // An enabled button keeps its place whatever its data says.
    const enabled = make("other", null);
    enabled.dataset.disabledReason = "clockwork";
    expect(hidePermanentlyDisabledActionsV7(row)).toBe(2);
    expect(
      [...row.querySelectorAll<HTMLElement>("button")].map(
        (button) => button.dataset.action,
      ),
    ).toEqual([
      "command-move",
      "martian-tractor-beam",
      "hatch-unavailable",
      "other",
    ]);
  });
});
