import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  freezeChangesUnitV7,
  previewColdSnapV7,
  queryPlayerCommandsV7,
  stompEffectRejectionV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  STOMP_NO_TARGET_V7,
  giantCommandUnavailableTextV7,
} from "../../src/render/giant-presentation-v7";
import {
  BOLAS_NO_TARGET_V7,
  COLD_SNAP_NO_TARGET_V7,
  FROST_BOLT_NO_TARGET_V7,
  coldSnapChangedTargetsV7,
  iceFolkAbilityUnavailableTextV7,
} from "../../src/render/ice-folk-presentation-v7";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { frozenAtV7, iceFieldV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  fieldDefenseV7,
  fieldV7,
  patchUnitV7,
} from "../fixtures/v7-revision20";

// No pointless actions (`pulp_wars-zir6`, 7r107; RULESET_7_CURRENT.md
// section 12.4). The user, 2026-10-23: "some actions are pointless -
// casting freezing spell on a unit that is already frozen. you should not
// show the icon in those cases on that unit. there should not be the option
// to do it." An ability cannot be used where it would change nothing: the
// reducer refuses it with a reason, the public query does not offer it (so
// the board marks no such target and the Normal AI never scores it), and an
// area ability is refused only when it would change nobody in its area.

const activeView = (state: GameStateV7) => viewForV7(state, activeIdV7(state));

/** Whether the Normal AI scores `command` (its candidates are the offer). */
const aiScores = (state: GameStateV7, command: CommandV7): boolean =>
  chooseNormalCommandV7(activeView(state)).candidates.some(
    (candidate) =>
      JSON.stringify(candidate.command) === JSON.stringify(command),
  );

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

describe("a freeze of a unit Frozen already (Frost Bolt, the Sled's Bolas)", () => {
  /**
   * An Ice Folk Sled on (4, 3) and Ice Witch on (5, 5) of seat 0; a Human
   * Fighter Frozen on (5, 3) and a free one on (6, 4), both within 2 of
   * either.
   */
  const field = (): GameStateV7 =>
    iceFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "CAPTAIN", at: at(5, 5) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), frozen: { turnsLeft: 1 } },
      { seat: 1, role: "FIGHTER", at: at(6, 4) },
    ]);

  for (const [kind, error, from] of [
    ["THROW_BOLAS", "BOLAS_NOT_LEGAL", at(4, 3)],
    ["FROST_BOLT", "FROST_BOLT_NOT_LEGAL", at(5, 5)],
  ] as const)
    it(`${kind}: refused with ALREADY_FROZEN, never offered, never scored by the AI`, () => {
      const state = field();
      const pointless: CommandV7 = {
        kind,
        unitId: idAt(state, from),
        targetUnitId: idAt(state, at(5, 3)),
      };
      expect(rejectedV7(state, pointless)).toEqual({
        code: error,
        params: { reason: "ALREADY_FROZEN" },
      });
      expect(aiScores(state, pointless)).toBe(false);
      // The unfrozen Fighter stays a target, and is frozen.
      const useful: CommandV7 = {
        kind,
        unitId: idAt(state, from),
        targetUnitId: idAt(state, at(6, 4)),
      };
      expect(offeredV7(state, kind)).toEqual([useful]);
      expect(frozenAtV7(playV7(state, useful).state, at(6, 4))).toEqual({
        unitId: idAt(state, at(6, 4)),
        turnsLeft: 1,
      });
    });

  it("leaves the Sled without a Frost Bolt when every enemy in reach is Frozen, and says why", () => {
    const state = iceFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "CAPTAIN", at: at(5, 5) },
      { seat: 1, role: "FIGHTER", at: at(5, 4), frozen: { turnsLeft: 1 } },
    ]);
    expect(offeredV7(state, "THROW_BOLAS", "FROST_BOLT", "COLD_SNAP")).toEqual(
      [],
    );
    const view = activeView(state);
    const sled = view.units.find((unit) => unit.id === idAt(state, at(4, 3)));
    const witch = view.units.find((unit) => unit.id === idAt(state, at(5, 5)));
    if (sled === undefined || witch === undefined) throw new Error("no unit");
    expect(
      iceFolkAbilityUnavailableTextV7(view, sled, "THROW_BOLAS", false),
    ).toBe(BOLAS_NO_TARGET_V7);
    expect(
      iceFolkAbilityUnavailableTextV7(view, witch, "FROST_BOLT", false),
    ).toBe(FROST_BOLT_NO_TARGET_V7);
    expect(
      iceFolkAbilityUnavailableTextV7(view, witch, "COLD_SNAP", false),
    ).toBe(COLD_SNAP_NO_TARGET_V7);
    expect(BOLAS_NO_TARGET_V7).toBe("No unfrozen enemy within 2 tiles");
  });

  it("is pointless only while the entry is as long as a freeze gives now (a refresh that extends stays legal)", () => {
    const turn = { turnOrder: [1, 2] as never, activeSeatIndex: 0 };
    const own = { id: 7 as never, ownerId: 1 as never };
    const foe = { id: 8 as never, ownerId: 2 as never };
    // Not Frozen: a change.
    expect(freezeChangesUnitV7(turn, [], foe)).toBe(true);
    // Another seat's unit gets 1: an entry of 1 or 2 stays as it is.
    expect(
      freezeChangesUnitV7(turn, [{ unitId: foe.id, turnsLeft: 1 }], foe),
    ).toBe(false);
    expect(
      freezeChangesUnitV7(turn, [{ unitId: foe.id, turnsLeft: 2 }], foe),
    ).toBe(false);
    // A unit of the active seat gets 2 (a Frostbite): an entry of 1 is
    // extended, so that freeze is no pointless one.
    expect(
      freezeChangesUnitV7(turn, [{ unitId: own.id, turnsLeft: 1 }], own),
    ).toBe(true);
    expect(
      freezeChangesUnitV7(turn, [{ unitId: own.id, turnsLeft: 2 }], own),
    ).toBe(false);
  });
});

describe("Cold Snap, an area freeze", () => {
  /** An Ice Witch of seat 0 on (5, 3) and the given Human units next to her. */
  const witchWith = (frozen: readonly [boolean, boolean]): GameStateV7 =>
    iceFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(4, 3),
        ...(frozen[0] ? { frozen: { turnsLeft: 1 } as const } : {}),
      },
      {
        seat: 1,
        role: "GUARD",
        at: at(6, 4),
        ...(frozen[1] ? { frozen: { turnsLeft: 1 } as const } : {}),
      },
    ]);

  it("is legal while it changes one unit in its area; the Frozen one is renewed but not marked", () => {
    const state = witchWith([true, false]);
    const snap: CommandV7 = {
      kind: "COLD_SNAP",
      unitId: idAt(state, at(5, 3)),
    };
    expect(offeredV7(state, "COLD_SNAP")).toEqual([snap]);
    const preview = previewColdSnapV7(activeView(state), snap.unitId);
    if (preview === null) throw new Error("no Cold Snap preview");
    // Both are in the cast; only the unfrozen Guard is a marked target.
    expect(preview.targets.map((target) => target.alreadyFrozen)).toEqual(
      [idAt(state, at(4, 3)), idAt(state, at(6, 4))]
        .sort((left, right) => left - right)
        .map((id) => id === idAt(state, at(4, 3))),
    );
    expect(coldSnapChangedTargetsV7(preview).map((t) => t.unitId)).toEqual([
      idAt(state, at(6, 4)),
    ]);
    const cast = playV7(state, snap);
    expect(frozenAtV7(cast.state, at(4, 3))?.turnsLeft).toBe(1);
    expect(frozenAtV7(cast.state, at(6, 4))?.turnsLeft).toBe(1);
  });

  it("is refused with ALREADY_FROZEN, never offered or scored, when every unit in its area is Frozen", () => {
    const state = witchWith([true, true]);
    const snap: CommandV7 = {
      kind: "COLD_SNAP",
      unitId: idAt(state, at(5, 3)),
    };
    expect(rejectedV7(state, snap)).toEqual({
      code: "COLD_SNAP_NOT_LEGAL",
      params: { reason: "ALREADY_FROZEN" },
    });
    expect(aiScores(state, snap)).toBe(false);
    // Nobody at all is still NO_TARGET.
    const alone = iceFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(8, 3) },
    ]);
    expect(
      rejectedV7(alone, { kind: "COLD_SNAP", unitId: idAt(alone, at(5, 3)) })
        .params,
    ).toEqual({ reason: "NO_TARGET" });
  });
});

describe("Thunder Stomp, an area hit", () => {
  /** The Dinosaur seat 0's unmoved Brontosaurus at (4, 6). */
  const bronto = (pieces: Parameters<typeof fieldV7>[0] = []): GameStateV7 =>
    fieldV7([{ seat: 0, role: "JUGGERNAUT", at: at(4, 6) }, ...pieces], {
      factions: ["DINOSAUR", "ORIGINAL"],
    });
  const stomp = (state: GameStateV7): CommandV7 => ({
    kind: "STOMP",
    unitId: idAt(state, at(4, 6)),
  });

  it("is refused with NO_TARGET, never offered or scored, with nobody to hit and no Field Defense to smash", () => {
    const state = bronto([
      // An own unit and a far enemy change nothing.
      { seat: 0, role: "FIGHTER", at: at(5, 6) },
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
    ]);
    expect(rejectedV7(state, stomp(state))).toEqual({
      code: "STOMP_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
    expect(aiScores(state, stomp(state))).toBe(false);
    const view = activeView(state);
    const unit = view.units.find((item) => item.id === idAt(state, at(4, 6)));
    if (unit === undefined) throw new Error("no Brontosaurus");
    expect(giantCommandUnavailableTextV7(view, unit, "STOMP", false)).toBe(
      STOMP_NO_TARGET_V7,
    );
    expect(stompEffectRejectionV7([], [])).toEqual({
      code: "STOMP_NOT_LEGAL",
      reason: "NO_TARGET",
    });
  });

  it("is legal with one hostile ground unit, or with only a Field Defense, around it", () => {
    const enemy = bronto([{ seat: 1, role: "FIGHTER", at: at(3, 5) }]);
    expect(offeredV7(enemy, "STOMP")).toEqual([stomp(enemy)]);
    playV7(enemy, stomp(enemy));
    // Seat 1's territory reaches (3, 7): a Field Defense there is smashed.
    const defended = fieldDefenseV7(bronto(), at(3, 7));
    expect(offeredV7(defended, "STOMP")).toEqual([stomp(defended)]);
    const run = playV7(defended, stomp(defended));
    expect(run.events[0]).toMatchObject({
      kind: "THUNDER_STOMP",
      results: [],
      fieldDefenses: [at(3, 7)],
    });
  });
});

describe("support that was already pointless-proof (pinned by the audit)", () => {
  it("Tend Wounded: not on a healthy full-HP unit, but on a full-HP Frozen one (it thaws)", () => {
    const healthy = fieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
      ],
      { factions: ["ORIGINAL", "GOBLIN"] },
    );
    const tend: CommandV7 = {
      kind: "TEND_WOUNDED",
      unitId: idAt(healthy, at(5, 3)),
    };
    expect(rejectedV7(healthy, tend).code).toBe("HEAL_TARGET_NOT_FOUND");
    const frozen = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4), frozen: { turnsLeft: 1 } },
      ],
      { factions: ["ORIGINAL", "ICE_FOLK"] },
    );
    const thaw = playV7(frozen, {
      kind: "TEND_WOUNDED",
      unitId: idAt(frozen, at(5, 3)),
    });
    expect(frozenAtV7(thaw.state, at(5, 4))).toBeUndefined();
  });

  it("Rally: not on a unit that is Inspired already", () => {
    const base = fieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
      ],
      { factions: ["ORIGINAL", "GOBLIN"] },
    );
    const rally: CommandV7 = { kind: "RALLY", unitId: idAt(base, at(5, 3)) };
    expect(queryPlayerCommandsV7(activeView(base))).toContainEqual(rally);
    const inspired = patchUnitV7(base, at(5, 4), {
      activation: { ...unitAtV7(base, at(5, 4)).activation, inspired: true },
    });
    expect(rejectedV7(inspired, rally).code).toBe("HEAL_TARGET_NOT_FOUND");
  });
});
