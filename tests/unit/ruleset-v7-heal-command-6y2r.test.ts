// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  COMMAND_KIND_ORDER_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  queryIdleRecoveryV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { dockCommandsV7 } from "../../src/render/blocked-actions-v7";
import { nothingUsefulLeftV7 } from "../../src/render/end-turn-glow-v7";
import {
  HEAL_LABEL_V7,
  healInWaitSlotV7,
  healTooltipV7,
} from "../../src/render/recovery-presentation-v7";
import { textPlayCommandIdV7 } from "../../scripts/play-text-v7";
import { withHorrorV7, cultFieldV7 } from "../fixtures/v7-cult";
import { requiredButton, rig, waitUntil } from "../fixtures/v7-dom-rig";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { fieldV7 } from "../fixtures/v7-revision20";

/**
 * The Heal button (`pulp_wars-6y2r`, ruleset 7r143; the user, 2026-11-19:
 * "I want to have the healing button back. instead of the waiting button.
 * when you click it, the unit uses up the move and heals itself
 * immediately. ... do keep the 'wait' button for units that are unable to
 * heal like the undead"). `HEAL` is legal exactly when End Turn idle
 * recovery would heal the unit now; it heals that amount at once and ends
 * the unit's turn. The dock shows Heal in Wait's slot.
 *
 * The revision-20 field: seat 0's territory is x 7 to 9, y 7 to 9 (capital
 * (8, 8)); (5, 2) is open Grass outside every territory.
 */

const HOME: CoordV7 = { x: 7, y: 7 };
const HOME_2: CoordV7 = { x: 9, y: 7 };
const AWAY: CoordV7 = { x: 5, y: 2 };
const FULL: CoordV7 = { x: 7, y: 9 };

/** A Human seat 0 with a wounded Fighter at home and one away. */
function humanField(): GameStateV7 {
  return fieldV7(
    [
      { seat: 0, role: "FIGHTER", at: HOME, hp: 3 },
      { seat: 0, role: "FIGHTER", at: AWAY, hp: 3 },
      { seat: 0, role: "FIGHTER", at: FULL },
    ],
    { factions: ["ORIGINAL", "UNDEAD"] },
  );
}

function offered(state: GameStateV7): readonly CommandV7[] {
  return queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId));
}

function offeredFor(
  state: GameStateV7,
  unitId: UnitId,
  kind: CommandV7["kind"],
): boolean {
  return offered(state).some(
    (command) =>
      command.kind === kind && "unitId" in command && command.unitId === unitId,
  );
}

function play(state: GameStateV7, command: CommandV7) {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  return result;
}

function refusal(state: GameStateV7, unitId: UnitId) {
  const result = applyCommandV7(state, state.humanPlayerId, {
    kind: "HEAL",
    unitId,
  });
  expect(result.accepted).toBe(false);
  return result.accepted ? null : result.error;
}

/** The `UNIT_RECOVERED` events of the human's own End Turn. */
function endTurnRecoveries(state: GameStateV7) {
  const result = play(state, { kind: "END_TURN" });
  const ended = result.events.findIndex((event) => event.kind === "TURN_ENDED");
  return {
    state: result.state,
    recovered: result.events
      .slice(0, ended)
      .flatMap((event) =>
        event.kind === "UNIT_RECOVERED"
          ? [{ unitId: event.unitId, amount: event.amount }]
          : [],
      ),
  };
}

describe("the identity (pulp_wars-6y2r)", () => {
  it("is 7r143 after 7r142, whose save key is obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r143");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r143.current");
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe("pulp-wars-poc-7r142");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r142.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("appends HEAL last, so no earlier command kind moves", () => {
    expect(COMMAND_KIND_ORDER_V7.at(-2)).toBe("SNOW_BALM");
    expect(COMMAND_KIND_ORDER_V7.at(-1)).toBe("HEAL");
    expect(COMMAND_KIND_ORDER_V7).not.toContain("RECOVER");
  });
});

describe("HEAL heals the idle-recovery amount now", () => {
  it("heals exactly what End Turn idle recovery would, at home and away", () => {
    const state = humanField();
    const home = unitAtV7(state, HOME);
    const away = unitAtV7(state, AWAY);
    const idle = queryIdleRecoveryV7(state, state.humanPlayerId);
    // A Human unit heals 4 in its own land and 2 elsewhere.
    expect(idle).toEqual([
      { unitId: home.id, amount: 4 },
      { unitId: away.id, amount: 2 },
    ]);
    // End Turn heals both by those amounts...
    expect(endTurnRecoveries(state).recovered).toEqual(idle);
    // ...and a Heal heals each by the same amount now.
    for (const unit of [home, away]) {
      const amount = idle.find((entry) => entry.unitId === unit.id)?.amount;
      const result = play(state, { kind: "HEAL", unitId: unit.id });
      expect(result.events).toEqual([
        { kind: "UNIT_RECOVERED", unitId: unit.id, amount, automatic: false },
      ]);
      expect(
        result.state.units.find((candidate) => candidate.id === unit.id)?.hp,
      ).toBe(unit.hp + (amount ?? 0));
    }
  });

  it("caps the heal at the missing HP", () => {
    const state = fieldV7([{ seat: 0, role: "FIGHTER", at: HOME, hp: 11 }], {
      factions: ["ORIGINAL", "UNDEAD"],
    });
    const unit = unitAtV7(state, HOME);
    const result = play(state, { kind: "HEAL", unitId: unit.id });
    expect(result.events).toEqual([
      { kind: "UNIT_RECOVERED", unitId: unit.id, amount: 1, automatic: false },
    ]);
  });
});

describe("HEAL spends the unit's turn", () => {
  it("leaves the unit no Move, attack or second Heal, and it counts as acted", () => {
    const state = humanField();
    const unit = unitAtV7(state, HOME);
    expect(offeredFor(state, unit.id, "MOVE")).toBe(true);
    const healed = play(state, { kind: "HEAL", unitId: unit.id }).state;
    const after = unitAtV7(healed, HOME);
    expect(after.activation).toMatchObject({
      recovered: true,
      handled: true,
      moved: false,
    });
    for (const kind of ["MOVE", "HEAL", "WAIT"] as const)
      expect(offeredFor(healed, unit.id, kind), kind).toBe(false);
    expect(
      applyCommandV7(healed, healed.humanPlayerId, {
        kind: "MOVE",
        unitId: unit.id,
        path: [{ x: 7, y: 6 }],
      }).accepted,
    ).toBe(false);
    expect(refusal(healed, unit.id)).toEqual({
      code: "HEAL_NOT_LEGAL",
      params: { reason: "NOT_ELIGIBLE" },
    });
  });

  it("is never healed again by End Turn idle recovery", () => {
    const state = humanField();
    const home = unitAtV7(state, HOME);
    const away = unitAtV7(state, AWAY);
    const healed = play(state, { kind: "HEAL", unitId: home.id }).state;
    const hpAfterHeal = unitAtV7(healed, HOME).hp;
    // The healed unit is no longer in the End Turn preview; the idle one is.
    expect(queryIdleRecoveryV7(healed, healed.humanPlayerId)).toEqual([
      { unitId: away.id, amount: 2 },
    ]);
    const ended = endTurnRecoveries(healed);
    expect(ended.recovered).toEqual([{ unitId: away.id, amount: 2 }]);
    expect(
      ended.state.units.find((candidate) => candidate.id === home.id)?.hp,
    ).toBe(hpAfterHeal);
  });
});

describe("HEAL is refused for a unit that cannot heal", () => {
  it("refuses a unit at full HP", () => {
    const state = humanField();
    const full = unitAtV7(state, FULL);
    expect(offeredFor(state, full.id, "HEAL")).toBe(false);
    expect(offeredFor(state, full.id, "WAIT")).toBe(true);
    expect(refusal(state, full.id)).toEqual({
      code: "HEAL_NOT_LEGAL",
      params: { reason: "NOT_ELIGIBLE" },
    });
  });

  it("refuses a unit that has moved", () => {
    const state = humanField();
    const unit = unitAtV7(state, AWAY);
    const moved = play(state, {
      kind: "MOVE",
      unitId: unit.id,
      path: [{ x: 5, y: 3 }],
    }).state;
    expect(offeredFor(moved, unit.id, "HEAL")).toBe(false);
    expect(refusal(moved, unit.id)).toEqual({
      code: "HEAL_NOT_LEGAL",
      params: { reason: "NOT_ELIGIBLE" },
    });
  });

  it("refuses an Undead unit outside its land (Restless), and heals it at home", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: AWAY, hp: 3 },
        { seat: 0, role: "FIGHTER", at: HOME, hp: 3 },
      ],
      { factions: ["UNDEAD", "ORIGINAL"] },
    );
    const away = unitAtV7(state, AWAY);
    const home = unitAtV7(state, HOME);
    expect(offeredFor(state, away.id, "HEAL")).toBe(false);
    expect(offeredFor(state, away.id, "WAIT")).toBe(true);
    expect(refusal(state, away.id)).toEqual({
      code: "HEAL_NOT_LEGAL",
      params: { reason: "NOT_ELIGIBLE" },
    });
    expect(offeredFor(state, home.id, "HEAL")).toBe(true);
  });

  it("refuses a daemon, which never heals", () => {
    const state = withHorrorV7(cultFieldV7([]), 0, HOME_2, { hp: 3 });
    const horror = unitAtV7(state, HOME_2);
    expect(horror.summoned).toBe("HORROR");
    expect(offeredFor(state, horror.id, "HEAL")).toBe(false);
    expect(offeredFor(state, horror.id, "WAIT")).toBe(true);
    expect(refusal(state, horror.id)).toEqual({
      code: "HEAL_NOT_LEGAL",
      params: { reason: "NOT_ELIGIBLE" },
    });
  });

  it("refuses a unit that already waited", () => {
    const state = humanField();
    const unit = unitAtV7(state, HOME);
    const waited = play(state, { kind: "WAIT", unitId: unit.id }).state;
    expect(offeredFor(waited, unit.id, "HEAL")).toBe(false);
    expect(refusal(waited, unit.id)).toEqual({
      code: "HEAL_NOT_LEGAL",
      params: { reason: "HANDLED" },
    });
  });
});

describe("the Normal AI Heals where it held a wounded unit with a Wait", () => {
  it("offers HEAL, scored as the recovery Wait was, and never a Wait", () => {
    const state = fieldV7([{ seat: 0, role: "FIGHTER", at: HOME, hp: 3 }], {
      factions: ["ORIGINAL", "UNDEAD"],
    });
    const unit = unitAtV7(state, HOME);
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 0)),
    );
    const heal = decision.candidates.find(
      (entry) =>
        entry.command.kind === "HEAL" && entry.command.unitId === unit.id,
    );
    // Below half HP: the retired Recover's 930.
    expect(heal?.score.priority).toBe(930);
    expect(
      decision.candidates.some((entry) => entry.command.kind === "WAIT"),
    ).toBe(false);
  });
});

describe("the text harness and End Turn's glow", () => {
  it("names HEAL u<id>.heal", () => {
    expect(textPlayCommandIdV7({ kind: "HEAL", unitId: 12 as UnitId })).toBe(
      "u12.heal",
    );
  });

  it("does not count a Heal as left to do (End Turn heals the same)", () => {
    const state = fieldV7([{ seat: 0, role: "FIGHTER", at: HOME, hp: 3 }], {
      factions: ["ORIGINAL", "UNDEAD"],
    });
    const unit = unitAtV7(state, HOME);
    const commands = offered(state).filter(
      (command) =>
        command.kind === "END_TURN" ||
        command.kind === "HEAL" ||
        command.kind === "WAIT",
    );
    expect(
      commands.some(
        (command) => command.kind === "HEAL" && command.unitId === unit.id,
      ),
    ).toBe(true);
    expect(nothingUsefulLeftV7(commands)).toBe(true);
  });
});

describe("the dock shows Heal in Wait's slot", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.localStorage.clear();
  });

  it("replaces a healer's Wait in place and keeps every other Wait", () => {
    const state = humanField();
    const home = unitAtV7(state, HOME);
    const full = unitAtV7(state, FULL);
    const view = viewForV7(state, state.humanPlayerId);
    const entries = healInWaitSlotV7(
      dockCommandsV7(view, queryPlayerCommandsV7(view)),
    );
    const kinds = (unitId: UnitId) =>
      entries
        .filter(
          (entry) =>
            "unitId" in entry.command && entry.command.unitId === unitId,
        )
        .map((entry) => entry.command.kind)
        .filter((kind) => kind !== "MOVE");
    expect(kinds(home.id)).toContain("HEAL");
    expect(kinds(home.id)).not.toContain("WAIT");
    expect(kinds(full.id)).toContain("WAIT");
    expect(kinds(full.id)).not.toContain("HEAL");
    // In Wait's place: the Heal stands where the Wait stood.
    const plain = dockCommandsV7(view, queryPlayerCommandsV7(view)).map(
      (entry) => entry.command,
    );
    const waitAt = plain.findIndex(
      (command) => command.kind === "WAIT" && command.unitId === home.id,
    );
    const healAt = entries.findIndex(
      (entry) =>
        entry.command.kind === "HEAL" && entry.command.unitId === home.id,
    );
    const before = (list: readonly CommandV7[], index: number) =>
      list.slice(0, index).filter((command) => command.kind !== "HEAL");
    expect(
      before(
        entries.map((entry) => entry.command),
        healAt,
      ),
    ).toEqual(before(plain, waitAt));
  });

  it("draws a Heal button for a wounded unit and a Wait button for a healthy one", async () => {
    const scene = rig(humanField());
    const select = (at: CoordV7) =>
      scene.host.callbacks?.onSelection({
        kind: "UNIT",
        unitId: scene.unitAt(at).id,
      });
    select(HOME);
    const heal = requiredButton("command-heal");
    expect(heal.textContent).toBe(HEAL_LABEL_V7);
    expect(heal.title).toBe(`${HEAL_LABEL_V7} · ${healTooltipV7(4)}`);
    expect(heal.getAttribute("aria-description")).toBe(healTooltipV7(4));
    expect(document.querySelector('[data-action="command-wait"]')).toBeNull();
    select(FULL);
    expect(document.querySelector('[data-action="command-heal"]')).toBeNull();
    requiredButton("command-wait");
    // A tap heals the unit now.
    select(HOME);
    requiredButton("command-heal").click();
    await waitUntil(() => scene.controller.accepted.length > 0);
    expect(scene.controller.accepted).toEqual([
      { kind: "HEAL", unitId: scene.unitAt(HOME).id },
    ]);
    // Its turn is spent: neither Heal nor Wait is offered any more.
    select(HOME);
    await waitUntil(
      () => document.querySelector('[data-action="command-heal"]') === null,
    );
    expect(document.querySelector('[data-action="command-wait"]')).toBeNull();
  });
});
