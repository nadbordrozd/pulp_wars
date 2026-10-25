import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  attackV7,
  dinosaurFieldV7,
  productionCandidatesV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import {
  iceFolkAbilityDescriptionV7,
  iceFolkHelpRulesV7,
  iceFolkRoleUnlockTextV7,
} from "../../src/render/ice-folk-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7, type IcePieceV7 } from "../fixtures/v7-ice-folk";

// The tier-3 review A (`pulp_wars-1pwz`, RULESET_7_CURRENT.md "Tier-3
// review (2026-10-25)"): the Goblin, Dinosaur, and Ice Folk Knight,
// Champion, and Catapult classes. Two units changed: the Sabretooth hunts
// the frozen line (Cold Blood and Overrun), and the T-Rex costs 11 (14).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const own = (
  role: IcePieceV7["role"],
  x: number,
  y: number,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: IcePieceV7["role"],
  x: number,
  y: number,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });
const FROZEN = { frozen: { turnsLeft: 1 } } as const;

/** Seat 0 Ice Folk (the viewer, active) against seat 1 Human. */
const asIce = (pieces: readonly IcePieceV7[]): GameStateV7 =>
  iceFieldV7(pieces, { factions: ["ICE_FOLK", "ORIGINAL"] });

const preview = (state: GameStateV7, from: CoordV7, to: CoordV7) =>
  queryCombatPreviewV7(
    viewerViewV7(state),
    unitIdAtV7(state, from),
    unitIdAtV7(state, to),
  );

function play(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(JSON.stringify(result.error));
  return result.state;
}

describe("the tier-3 review A: the Sabretooth hunts the frozen line", () => {
  it("has Overrun and Cold Blood, and keeps its numbers and Prowl", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "ICE_FOLK")).toMatchObject({
      label: "Sabretooth",
      cost: 9,
      maxHp: 14,
      attack2: 6,
      defense2: 2,
      move: 3,
      abilities: [
        "ATTACK",
        "CAPTURE",
        "PROWL",
        "OVERRUN",
        "COLD_BLOOD",
        "FREEZE",
      ],
    });
    expect(roleMechanicsV7("KNIGHT", "ICE_FOLK")).toMatchObject({
      ignoresZocStops: true,
      // The Snow Hunter's +0.5.
      coldBloodBonus2: 1,
      advancesAfterKill: true,
    });
    expect(roleMechanicsV7("MARKSMAN", "ICE_FOLK").coldBloodBonus2).toBe(1);
  });

  it("does not kill a full-HP Fighter in the open, and shatters a frozen one", () => {
    const pieces = [own("KNIGHT", 4, 3), foe("FIGHTER", 5, 3)];
    const open = preview(asIce(pieces), at(4, 3), at(5, 3));
    expect(open).toMatchObject({
      attack2: 6,
      coldBloodApplied: false,
      damageToDefender: 8,
      defenderDies: false,
    });
    const frozen = preview(
      asIce([pieces[0] as IcePieceV7, foe("FIGHTER", 5, 3, FROZEN)]),
      at(4, 3),
      at(5, 3),
    );
    // Attack 3.5 deals 10 of 12: the 2 left are inside the Shatter window,
    // and a Frozen unit does not strike back.
    expect(frozen).toMatchObject({
      attack2: 7,
      coldBloodApplied: true,
      shatters: true,
      defenderDies: true,
      damageToAttacker: 0,
    });
  });

  it("runs through a frozen line: each kill takes the tile and allows another attack", () => {
    // A frozen Fighter, Marksman, and Knight in a row; a Guard behind.
    const state = asIce([
      own("KNIGHT", 3, 3),
      foe("FIGHTER", 4, 3, FROZEN),
      foe("MARKSMAN", 5, 3, FROZEN),
      foe("KNIGHT", 6, 3, FROZEN),
      foe("FIGHTER", 1, 1),
    ]);
    const cat = unitIdAtV7(state, at(3, 3));
    let next = play(state, attackV7(state, at(3, 3), at(4, 3)));
    expect(unitAtV7(next, at(4, 3)).id).toBe(cat);
    expect(unitAtV7(next, at(4, 3)).activation.overrunActive).toBe(true);
    // The Marksman: 12 of 12, a plain kill.
    expect(preview(next, at(4, 3), at(5, 3))).toMatchObject({
      damageToDefender: 12,
      defenderDies: true,
    });
    next = play(next, attackV7(next, at(4, 3), at(5, 3)));
    expect(unitAtV7(next, at(5, 3)).id).toBe(cat);
    // The Knight: 12 of 13 leaves 1, a Shatter.
    expect(preview(next, at(5, 3), at(6, 3))).toMatchObject({
      shatters: true,
      defenderDies: true,
    });
    next = play(next, attackV7(next, at(5, 3), at(6, 3)));
    const sabretooth = unitAtV7(next, at(6, 3));
    expect(sabretooth).toMatchObject({ id: cat, hp: 14, kills: 3 });
    // Nothing hostile beside it any more: the chain ends.
    expect(sabretooth.activation.overrunActive).toBe(false);
  });

  it("stops after a kill of a unit that is not frozen when no enemy stands beside the tile", () => {
    // A 10-HP Catapult dies to Attack 3 unfrozen too: Overrun is the
    // Knight's rule, not a Frozen-only one.
    const state = asIce([
      own("KNIGHT", 3, 3),
      foe("CATAPULT", 4, 3),
      foe("FIGHTER", 5, 4),
      foe("FIGHTER", 1, 1),
    ]);
    const next = play(state, attackV7(state, at(3, 3), at(4, 3)));
    expect(unitAtV7(next, at(4, 3)).activation.overrunActive).toBe(true);
    expect(
      queryPlayerCommandsV7(next, next.humanPlayerId).filter(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === unitAtV7(next, at(4, 3)).id,
      ),
    ).toEqual([attackV7(next, at(4, 3), at(5, 4))]);
  });
});

describe("the tier-3 review A: the Sabretooth's presentation", () => {
  it("names Cold Blood on its unlock and in Help, and Overrun on its card", () => {
    expect(iceFolkRoleUnlockTextV7("KNIGHT")).toBe(
      "Train Sabretooth (Cold Blood, Slips past)",
    );
    const help = new Map(iceFolkHelpRulesV7());
    expect(help.get("Cold Blood")).toBe(
      "a Snow Hunter or Sabretooth has +0.5 Attack against a Frozen unit.",
    );
    expect(iceFolkAbilityDescriptionV7("COLD_BLOOD", "ICE_FOLK")).toBe(
      "+0.5 Attack against a Frozen unit.",
    );
    expect(
      roleGlossaryV7("KNIGHT", "ICE_FOLK").map((entry) => entry.name),
    ).toEqual(expect.arrayContaining(["Overrun", "Cold Blood", "Slips past"]));
  });
});

describe("the tier-3 review A: the Normal AI and the Sabretooth", () => {
  it("bites the frozen unit, not the fresh one beside it, and runs on", () => {
    // Two full-HP Fighters in reach; only one is Frozen. A frozen Marksman
    // stands beside it for the second bite.
    const state = asIce([
      own("KNIGHT", 5, 3),
      foe("FIGHTER", 6, 2),
      foe("FIGHTER", 6, 4, FROZEN),
      foe("MARKSMAN", 7, 5, FROZEN),
      foe("FIGHTER", 1, 1),
    ]);
    const first = unitCandidatesV7(state, at(5, 3), "ATTACK")[0];
    expect(first?.command).toEqual(attackV7(state, at(5, 3), at(6, 4)));
    const next = play(state, first?.command as CommandV7);
    expect(unitAtV7(next, at(6, 4)).activation.overrunActive).toBe(true);
    const second = unitCandidatesV7(next, at(6, 4), "ATTACK")[0];
    expect(second?.command).toEqual(attackV7(next, at(6, 4), at(7, 5)));
    expect(second?.score.immediateValue ?? 0).toBeGreaterThan(0);
  });
});

describe("the tier-3 review A: the T-Rex costs 11", () => {
  it("costs 11 (14 before); its Egg, refund, and hatch time follow", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "DINOSAUR")).toMatchObject({
      label: "T-Rex",
      cost: 11,
      maxHp: 28,
      attack2: 8,
      defense2: 4,
      move: 2,
      abilities: ["ATTACK", "CAPTURE", "OVERRUN", "GROW"],
    });
    expect(roleMechanicsV7("KNIGHT", "DINOSAUR")).toMatchObject({
      capacitySlots: 2,
      hatchTurns: 4,
    });
  });

  it("the Normal AI lays a T-Rex Egg on 12 Coins when its army lacks one", () => {
    // A Dinosaur army (a Triceratops, two of the capital's four slots)
    // against Humans with shooters in sight (two fragile targets: the
    // breakthrough share is a quarter) and no T-Rex. At 14 Coins the Egg was
    // out of reach of these 12.
    const state = dinosaurFieldV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SWORDSMAN", at: at(10, 10) },
        { seat: 1, role: "MARKSMAN", at: at(1, 1) },
        { seat: 1, role: "CATAPULT", at: at(2, 1) },
      ],
      { coins: 12 },
    );
    expect(viewForV7(state, state.humanPlayerId).viewer.coins).toBe(12);
    expect(productionCandidatesV7(state)[0]).toMatchObject({
      kind: "LAY_EGG",
      role: "KNIGHT",
    });
  });
});
