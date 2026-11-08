import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryCombatPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { iceFolkBoundaryNoticeV7 } from "../../src/render/ice-folk-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  frozenOfUnitV7,
  iceFieldV7,
  type IcePieceV7,
} from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  acceptV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import { activeIdV7, at } from "../fixtures/v7-revision20";

// `pulp_wars-s55m.8`. In the I3 hand play (revision 6) a Dwarf Hammerer
// that a Walrus had Frostbitten (`turnsLeft` 2) was not Frozen on the next
// Ice Folk turn and could strike back, while a Knight Frostbitten the same
// way in I4 stayed Frozen. The replay of the session shows the cause: on
// the same Dwarf turn an Engineer beside the Hammerer used Repair, which
// thaws a Frozen unit by rule (RULESET_7_CURRENT.md sections 10 and 21.2).
// The thaw was correct; the defect was that the Ice Folk seat was never
// shown it (the `WOUNDED_TENDED` was projected to other seats only for a
// cured Plague, bite, or frog), so the Frozen mark simply vanished. These
// cases pin the Frozen timing for every source, form, and faction the
// report named, the specified Repair thaw, and its projection. Hand-built
// states only.

const endTurn = (state: GameStateV7): GameStateV7 =>
  applyOkV7(state, activeIdV7(state), { kind: "END_TURN" }).state;

const attack = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): Extract<CommandV7, { kind: "ATTACK" }> => ({
  kind: "ATTACK",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

const preview = (state: GameStateV7, from: CoordV7, to: CoordV7) => {
  const result = queryCombatPreviewV7(
    viewForV7(state, activeIdV7(state)),
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
  if (result === null) throw new Error("no preview");
  return result;
};

/** The distinct kinds offered to the active seat for the unit on `where`. */
const kindsFor = (state: GameStateV7, where: CoordV7): string[] => {
  const unit = unitAtV7(state, where);
  return [
    ...new Set(
      offeredV7(state)
        .filter((command) => "unitId" in command && command.unitId === unit.id)
        .map((command) => command.kind),
    ),
  ].sort();
};

// The Walrus (seat 0, Ice Folk) on (5, 3); the attacker (seat 1) on (4, 3);
// the Ice Witch on (3, 3), whose blow is too weak to shatter it.
const WALRUS = at(5, 3);
const ATTACKER = at(4, 3);
const WITCH = at(3, 3);
const TENDER = at(4, 2);

const ATTACKERS: readonly (readonly [string, FactionIdV7, UnitRoleIdV7])[] = [
  ["a Dwarf Hammerer", "DWARF", "FIGHTER"],
  ["a Human Knight", "ORIGINAL", "KNIGHT"],
  ["a Human Fighter", "ORIGINAL", "FIGHTER"],
];

const frostbiteScene = (
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  more: readonly IcePieceV7[] = [],
): GameStateV7 =>
  iceFieldV7(
    [
      { seat: 0, role: "GUARD", at: WALRUS },
      { seat: 1, role, at: ATTACKER },
      { seat: 0, role: "CAPTAIN", at: WITCH },
      ...more,
    ],
    { factions: ["ICE_FOLK", faction], activeSeat: 1 },
  );

describe("Frostbite: Frozen through the Ice Folk turn and the attacker's next turn (sections 21.2 and 21.17)", () => {
  it.each(ATTACKERS)(
    "%s: turnsLeft 2, no strike back on the Ice Folk turn, held through its own next turn, thawed at its End Turn",
    (_, faction, role) => {
      let state = frostbiteScene(faction, role);
      const attacker = unitAtV7(state, ATTACKER);
      expect(preview(state, ATTACKER, WALRUS)).toMatchObject({
        frostbiteApplied: true,
        attackerDies: false,
      });
      state = playV7(state, attack(state, ATTACKER, WALRUS)).state;
      expect(frozenOfUnitV7(state, attacker)?.turnsLeft).toBe(2);
      // The attacker's own End Turn counts once.
      state = endTurn(state);
      expect(frozenOfUnitV7(state, attacker)?.turnsLeft).toBe(1);
      // The Ice Folk turn: it does not strike back.
      expect(preview(state, WITCH, ATTACKER)).toMatchObject({
        retaliation: false,
        noRetaliationReason: "FROZEN",
        damageToAttacker: 0,
      });
      const witch = unitAtV7(state, WITCH);
      const struck = playV7(state, attack(state, WITCH, ATTACKER));
      expect(unitAtV7(struck.state, WITCH).hp).toBe(witch.hp);
      state = endTurn(struck.state);
      // Its own next turn: Frozen, nothing on the board offered.
      expect(frozenOfUnitV7(state, attacker)?.turnsLeft).toBe(1);
      expect(kindsFor(state, ATTACKER)).toEqual(["DISBAND", "WAIT"]);
      expect(rejectedV7(state, attack(state, ATTACKER, WALRUS))).toEqual({
        code: "UNIT_FROZEN",
        params: { unitId: attacker.id },
      });
      // It thaws at that End Turn, and strikes back on the next Ice Folk
      // turn.
      state = endTurn(state);
      expect(frozenOfUnitV7(state, attacker)).toBeUndefined();
      expect(preview(state, WITCH, ATTACKER).retaliation).toBe(true);
    },
  );
});

describe("the I3 replay: a Tend or an Engineer's Repair thaws the Frostbitten attacker (sections 10 and 21.2)", () => {
  it.each([
    ["an Engineer's Repair beside a Dwarf Hammerer", "DWARF", "FIGHTER"],
    ["a Captain's Tend beside a Human Knight", "ORIGINAL", "KNIGHT"],
  ] as const)(
    "%s thaws it on its own turn, so it strikes back on the Ice Folk turn; the Ice Folk seat is shown the thaw",
    (_, faction, role) => {
      let state = frostbiteScene(faction, role, [
        { seat: 1, role: "CAPTAIN", at: TENDER },
      ]);
      const attacker = unitAtV7(state, ATTACKER);
      const tender = unitAtV7(state, TENDER);
      state = playV7(state, attack(state, ATTACKER, WALRUS)).state;
      expect(frozenOfUnitV7(state, attacker)?.turnsLeft).toBe(2);
      const before = state;
      const tended = playV7(state, {
        kind: "TEND_WOUNDED",
        unitId: tender.id,
      });
      const event = tended.events.find(
        (candidate) => candidate.kind === "WOUNDED_TENDED",
      );
      expect(event).toMatchObject({
        kind: "WOUNDED_TENDED",
        captainId: tender.id,
        results: [{ unitId: attacker.id, curedFrozen: true }],
      });
      state = tended.state;
      expect(frozenOfUnitV7(state, attacker)).toBeUndefined();
      // The fix: the freezing seat, which sees both, receives the thaw.
      const iceFolk = seatIdV7(state, 0);
      const projected = projectEventsV7(
        before,
        state,
        iceFolk,
        tended.events,
      ).events;
      expect(projected).toContainEqual(event);
      const notice = iceFolkBoundaryNoticeV7(
        projected,
        viewForV7(before, iceFolk),
        viewForV7(state, iceFolk),
      );
      expect(notice?.toast).toBe(true);
      expect(notice?.text).toMatch(/thawed a /);
      // The specified consequence: thawed, it strikes back.
      state = endTurn(state);
      expect(frozenOfUnitV7(state, attacker)).toBeUndefined();
      expect(preview(state, WITCH, ATTACKER)).toMatchObject({
        retaliation: true,
        noRetaliationReason: null,
      });
    },
  );

  it("a Tend that only heals still reaches its owner alone", () => {
    // A wounded Hammerer that is not Frozen beside its Engineer.
    const state = iceFieldV7(
      [
        { seat: 0, role: "GUARD", at: WALRUS },
        { seat: 1, role: "FIGHTER", at: ATTACKER, hp: 6 },
        { seat: 1, role: "CAPTAIN", at: TENDER },
      ],
      { factions: ["ICE_FOLK", "DWARF"], activeSeat: 1 },
    );
    const before = state;
    const tended = playV7(state, {
      kind: "TEND_WOUNDED",
      unitId: unitAtV7(state, TENDER).id,
    });
    expect(tended.events[0]).toMatchObject({
      kind: "WOUNDED_TENDED",
      results: [{ curedFrozen: false }],
    });
    expect(
      projectEventsV7(before, tended.state, seatIdV7(state, 0), tended.events)
        .events.map((event) => event.kind)
        .includes("WOUNDED_TENDED"),
    ).toBe(false);
  });
});

describe("Bolas, Frost Breath, and a water Freeze: landed, embarked, and on a Port (section 21.2)", () => {
  // Seat 0, the Ice Folk, is active: a Sled on (3, 3) (2 tiles from both
  // Hammerers: the Bolas flies exactly 2 since `pulp_wars-3u8d`, 7r131), a
  // Frost Wyrm on (4, 4), the Ice Witch on (6, 4); seat 1's Dwarves: a
  // Hammerer landed on (5, 3) and one embarked on the Shallow Water of (5, 2).
  const LANDED = at(5, 3);
  const AFLOAT = at(5, 2);
  const SLED = at(3, 3);
  const WYRM = at(4, 4);
  const WITCH_EAST = at(6, 4);
  const scene = () =>
    iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: SLED },
        { seat: 0, role: "KNIGHT", at: WYRM },
        { seat: 0, role: "CAPTAIN", at: WITCH_EAST },
        { seat: 1, role: "FIGHTER", at: LANDED },
        { seat: 1, role: "FIGHTER", at: AFLOAT, form: "EMBARKED" },
      ],
      { factions: ["ICE_FOLK", "DWARF"], water: [AFLOAT, at(6, 2)] },
    );
  const bolas = (state: GameStateV7, to: CoordV7): CommandV7 => ({
    kind: "THROW_BOLAS",
    unitId: unitAtV7(state, SLED).id,
    targetUnitId: unitAtV7(state, to).id,
  });

  it.each([
    ["a Bolas", "BOLAS"],
    ["Frost Breath", "FROST_BREATH"],
  ] as const)(
    "%s Freezes a landed Hammerer for 1: no strike back now, held through the Dwarf turn, thawed at its End Turn",
    (_, source) => {
      let state = scene();
      const hammerer = unitAtV7(state, LANDED);
      const frozen = playV7(
        state,
        source === "BOLAS" ? bolas(state, LANDED) : attack(state, WYRM, LANDED),
      );
      expect(frozen.events).toContainEqual(
        expect.objectContaining({
          kind: "UNITS_FROZEN",
          source,
          results: [{ unitId: hammerer.id, turnsLeft: 1 }],
        }),
      );
      // Healed by hand to full HP, so the Witch's probe neither kills nor
      // shatters it (Frost Breath leaves it at 4).
      state = checkedV7({
        ...frozen.state,
        units: frozen.state.units.map((unit) =>
          unit.id === hammerer.id ? { ...unit, hp: hammerer.hp } : unit,
        ),
      });
      expect(preview(state, WITCH_EAST, LANDED)).toMatchObject({
        retaliation: false,
        noRetaliationReason: "FROZEN",
        damageToAttacker: 0,
      });
      state = endTurn(state);
      expect(frozenOfUnitV7(state, hammerer)?.turnsLeft).toBe(1);
      expect(kindsFor(state, LANDED)).toEqual(["DISBAND", "WAIT"]);
      state = endTurn(state);
      expect(frozenOfUnitV7(state, hammerer)).toBeUndefined();
      expect(preview(state, WITCH_EAST, LANDED).retaliation).toBe(true);
    },
  );

  it("an embarked Hammerer stays Frozen afloat: it can neither move nor land, and thaws still embarked", () => {
    let state = scene();
    const afloat = unitAtV7(state, AFLOAT);
    state = playV7(state, bolas(state, AFLOAT)).state;
    expect(frozenOfUnitV7(state, afloat)?.turnsLeft).toBe(1);
    state = endTurn(state);
    expect(frozenOfUnitV7(state, afloat)?.turnsLeft).toBe(1);
    expect(kindsFor(state, AFLOAT)).toEqual(["WAIT"]);
    for (const command of [
      { kind: "MOVE", unitId: afloat.id, path: [at(6, 2)] },
      { kind: "DISEMBARK", unitId: afloat.id, at: at(6, 3) },
    ] as const)
      expect(
        rejectedV7(state, command as unknown as CommandV7).code,
        command.kind,
      ).toBe("UNIT_FROZEN");
    state = endTurn(state);
    expect(frozenOfUnitV7(state, afloat)).toBeUndefined();
    expect(unitAtV7(state, AFLOAT).form).toBe("EMBARKED");
  });

  it("a Frozen landed Hammerer cannot embark onto the water beside it", () => {
    let state = scene();
    const hammerer = unitAtV7(state, LANDED);
    state = endTurn(playV7(state, bolas(state, LANDED)).state);
    expect(
      rejectedV7(state, {
        kind: "MOVE",
        unitId: hammerer.id,
        path: [at(6, 2)],
      }).code,
    ).toBe("UNIT_FROZEN");
  });

  it("a water Freeze on the Dwarf Port Freezes the Hammerer embarked there for 1, and it thaws on the Port", () => {
    // The naval arena: seat 1's Port on (6, 7); the Walrus on its own ice
    // on (6, 6).
    const PORT = { x: 6, y: 7 };
    const base = frozenArenaV7({
      factions: ["ICE_FOLK", "DWARF"],
      technologies: [["SHORECRAFT"], ["SHORECRAFT"]],
      units: [
        { seat: 0, role: "GUARD", at: { x: 6, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 8 } },
      ],
      ice: [{ at: { x: 6, y: 6 } }],
    });
    const hammerer = navalUnitAtV7(base, { x: 6, y: 8 });
    let state = patchNavalUnitV7(base, hammerer.id, {
      at: PORT,
      form: "EMBARKED",
    });
    const freeze = acceptV7(state, 0, {
      kind: "FREEZE",
      unitId: navalUnitAtV7(state, { x: 6, y: 6 }).id,
      at: PORT,
    });
    expect(freeze.state.frozen).toEqual([
      { unitId: hammerer.id, turnsLeft: 1 },
    ]);
    state = acceptV7(freeze.state, 0, { kind: "END_TURN" }).state;
    expect(
      rejectV7(state, 1, {
        kind: "MOVE",
        unitId: hammerer.id,
        path: [{ x: 6, y: 8 }],
      }).code,
    ).toBe("UNIT_FROZEN");
    state = acceptV7(state, 1, { kind: "END_TURN" }).state;
    expect(state.frozen).toEqual([]);
    expect(navalUnitAtV7(state, PORT)).toMatchObject({
      id: hammerer.id,
      form: "EMBARKED",
    });
    expect(
      applyCommandV7(state, seatV7(state, 0).id, { kind: "END_TURN" }).accepted,
    ).toBe(true);
  });
});
