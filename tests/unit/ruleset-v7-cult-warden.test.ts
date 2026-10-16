import { describe, expect, it } from "vitest";
import {
  IDOL_SHIELD_MINIMUM_RANGE_V7,
  NEUTRAL_OWNER_ID_V7,
  awestruckBearersV7,
  calculateCombatPreviewV7,
  emptyCultStateV7,
  idolStandsV7,
  parseEventV7,
  previewWardenV7,
  publicAwestruckBearersV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { glossaryEntryV7 } from "../../src/render/unit-glossary-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cultFieldV7, withFrogsV7 } from "../fixtures/v7-cult";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { rejectedV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cult redesign E-R3 (`pulp_wars-mch9.33`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 8.1): the Idol Bearer is
 * the warden. Its **Behold!** is a lasting aura with no command and no
 * state: the idol stands while the bearer has no status of the disruption
 * rule; then a shot of two or more tiles on an own unit beside it is
 * halved (rounded up, the Blizzard's precedent), and an enemy beside it may
 * attack only an Idol Bearer it stands beside (Awestruck).
 *
 * Every state is built by hand on the two-seat 11 x 11 field of
 * `cultFieldV7` (seat 0 the Cult, seat 1 Human); no match is played.
 */

const INITIATE = at(5, 4);
const BEARER = at(5, 3);
/** A Human Marksman two tiles south of the Initiate. */
const MARKSMAN = at(5, 6);

const cult = (role: GoblinPieceV7["role"], where: CoordV7): GoblinPieceV7 => ({
  seat: 0,
  role,
  at: where,
});
const human = (role: GoblinPieceV7["role"], where: CoordV7): GoblinPieceV7 => ({
  seat: 1,
  role,
  at: where,
});

/** The Human seat to move. */
const humanTurn = (pieces: readonly GoblinPieceV7[]): GameStateV7 =>
  cultFieldV7(pieces, { activeSeat: 1 });

const attack = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): Extract<CommandV7, { kind: "ATTACK" }> => ({
  kind: "ATTACK",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

const damage = (state: GameStateV7, from: CoordV7, to: CoordV7) =>
  calculateCombatPreviewV7(
    state,
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );

describe("the warden: the idol stands (section 8.1)", () => {
  it("stands with no action and no state, while the bearer has no status", () => {
    const state = humanTurn([cult("GUARD", BEARER), cult("FIGHTER", INITIATE)]);
    // No list, no command: the state has no idols.
    expect(Object.keys(emptyCultStateV7())).not.toContain("idols");
    const bearer = unitAtV7(state, BEARER);
    expect(idolStandsV7(state, bearer)).toBe(true);
    // An Initiate has no idol.
    expect(idolStandsV7(state, unitAtV7(state, INITIATE))).toBe(false);
    // A status puts it down for as long as it lasts: a frog, Frozen (the
    // status lists as a view carries them).
    expect(idolStandsV7(withFrogsV7(state, [BEARER]), bearer)).toBe(false);
    const frozen: GameStateV7 = {
      ...state,
      frozen: [{ unitId: bearer.id, turnsLeft: 2 }],
    };
    expect(idolStandsV7(frozen, bearer)).toBe(false);
    // A hurt bearer's idol still stands.
    const hurt = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === bearer.id ? { ...unit, hp: 3 } : unit,
      ),
    });
    expect(idolStandsV7(hurt, unitAtV7(hurt, BEARER))).toBe(true);
  });

  it("previews what the aura does now, for any viewer", () => {
    const state = humanTurn([
      cult("GUARD", BEARER),
      cult("FIGHTER", INITIATE),
      human("FIGHTER", at(4, 2)),
      human("FIGHTER", at(8, 8)),
    ]);
    const bearer = unitAtV7(state, BEARER).id;
    for (const seat of [0, 1])
      expect(
        previewWardenV7(viewForV7(state, seatIdV7(state, seat)), bearer),
      ).toEqual({
        unitId: bearer,
        stands: true,
        shieldedUnitIds: [unitAtV7(state, INITIATE).id],
        awestruckUnitIds: [unitAtV7(state, at(4, 2)).id],
      });
    const view = viewForV7(withFrogsV7(state, [BEARER]), seatIdV7(state, 1));
    expect(previewWardenV7(view, bearer)).toEqual({
      unitId: bearer,
      stands: false,
      shieldedUnitIds: [],
      awestruckUnitIds: [],
    });
    // Not an Idol Bearer: no preview.
    expect(previewWardenV7(view, unitAtV7(state, INITIATE).id)).toBeNull();
  });
});

describe("the warden: the shield wall (section 8.1)", () => {
  const pieces = [
    cult("GUARD", BEARER),
    cult("FIGHTER", INITIATE),
    human("MARKSMAN", MARKSMAN),
  ];

  it("halves a Marksman's shot on an Initiate beside a standing idol: 3 for 6", () => {
    expect(IDOL_SHIELD_MINIMUM_RANGE_V7).toBe(2);
    const bare = humanTurn([
      cult("FIGHTER", INITIATE),
      human("MARKSMAN", MARKSMAN),
    ]);
    expect(damage(bare, MARKSMAN, INITIATE)).toMatchObject({
      damageToDefender: 6,
      idolHalved: false,
    });
    const state = humanTurn(pieces);
    const preview = damage(state, MARKSMAN, INITIATE);
    expect(preview).toMatchObject({ damageToDefender: 3, idolHalved: true });
    // The public preview says the same, and the attack does it.
    expect(
      queryCombatPreviewV7(
        viewForV7(state, seatIdV7(state, 1)),
        unitAtV7(state, MARKSMAN).id,
        unitAtV7(state, INITIATE).id,
      ),
    ).toMatchObject({ damageToDefender: 3, idolHalved: true });
    const shot = applyOkV7(
      state,
      seatIdV7(state, 1),
      attack(state, MARKSMAN, INITIATE),
    );
    expect(unitAtV7(shot.state, INITIATE).hp).toBe(4);
    for (const event of shot.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
  });

  it("halves once under two idols, and never a melee hit", () => {
    const two = humanTurn([...pieces, cult("GUARD", at(4, 4))]);
    expect(damage(two, MARKSMAN, INITIATE)).toMatchObject({
      damageToDefender: 3,
      idolHalved: true,
    });
    // A Fighter beside the Initiate (and not beside the idol) hits it in
    // full.
    const melee = humanTurn([
      cult("GUARD", BEARER),
      cult("FIGHTER", INITIATE),
      human("FIGHTER", at(5, 5)),
    ]);
    expect(damage(melee, at(5, 5), INITIATE)).toMatchObject({
      idolHalved: false,
    });
  });

  it("does not cover the bearer under its own idol, but another bearer beside it does", () => {
    const alone = humanTurn([
      cult("GUARD", BEARER),
      human("MARKSMAN", at(5, 5)),
    ]);
    expect(damage(alone, at(5, 5), BEARER)).toMatchObject({
      idolHalved: false,
    });
    const pair = humanTurn([
      cult("GUARD", BEARER),
      cult("GUARD", at(6, 3)),
      human("MARKSMAN", at(5, 5)),
    ]);
    expect(damage(pair, at(5, 5), BEARER)).toMatchObject({ idolHalved: true });
  });

  it("halves nothing while the idol is down, and covers no enemy", () => {
    const state = humanTurn(pieces);
    const frogged = withFrogsV7(state, [BEARER]);
    expect(damage(frogged, MARKSMAN, INITIATE)).toMatchObject({
      damageToDefender: 6,
      idolHalved: false,
    });
    // A Cult Hexer two tiles from a Human Fighter beside the idol: the
    // Fighter is no unit of the bearer's seat.
    const enemy = cultFieldV7([
      cult("GUARD", BEARER),
      human("FIGHTER", at(4, 3)),
      cult("MARKSMAN", at(4, 5)),
    ]);
    expect(damage(enemy, at(4, 5), at(4, 3))).toMatchObject({
      idolHalved: false,
    });
  });
});

describe("the warden: Awestruck (section 8.1)", () => {
  it("lets an enemy beside a standing idol attack only the Idol Bearer", () => {
    // A Human Fighter beside both the Idol Bearer and an Initiate.
    const state = humanTurn([
      cult("GUARD", BEARER),
      cult("FIGHTER", at(6, 4)),
      human("FIGHTER", at(5, 4)),
    ]);
    const view = viewForV7(state, seatIdV7(state, 1));
    const fighter = unitAtV7(state, at(5, 4)).id;
    const attacks = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "ATTACK" && command.unitId === fighter,
    );
    expect(attacks).toEqual([attack(state, at(5, 4), BEARER)]);
    expect(rejectedV7(state, attack(state, at(5, 4), at(6, 4)))).toEqual({
      code: "ATTACK_AWESTRUCK",
      params: { unitId: unitAtV7(state, BEARER).id },
    });
    // No public preview of the attack it may not make.
    expect(
      queryCombatPreviewV7(view, fighter, unitAtV7(state, at(6, 4)).id),
    ).toBeNull();
    expect(publicAwestruckBearersV7(view, fighter)).toEqual([
      unitAtV7(state, BEARER).id,
    ]);
    // The attack on the bearer is accepted.
    applyOkV7(state, seatIdV7(state, 1), attack(state, at(5, 4), BEARER));
  });

  it("offers either bearer beside two, and frees a unit two tiles off, a neutral, and a unit beside a fallen idol", () => {
    const two = humanTurn([
      cult("GUARD", BEARER),
      cult("GUARD", at(6, 4)),
      cult("FIGHTER", at(4, 4)),
      human("FIGHTER", at(5, 4)),
    ]);
    const fighter = unitAtV7(two, at(5, 4)).id;
    expect(
      queryPlayerCommandsV7(viewForV7(two, seatIdV7(two, 1)))
        .filter(
          (command) => command.kind === "ATTACK" && command.unitId === fighter,
        )
        .map((command) =>
          command.kind === "ATTACK" ? command.targetUnitId : null,
        )
        .sort((left, right) => (left ?? 0) - (right ?? 0)),
    ).toEqual(
      [unitAtV7(two, BEARER).id, unitAtV7(two, at(6, 4)).id].sort(
        (left, right) => left - right,
      ),
    );
    // A Marksman two tiles from the idol shoots whom it likes.
    const ranged = humanTurn([
      cult("GUARD", BEARER),
      cult("FIGHTER", INITIATE),
      human("MARKSMAN", MARKSMAN),
    ]);
    expect(
      awestruckBearersV7(ranged, ranged.units, unitAtV7(ranged, MARKSMAN)),
    ).toEqual([]);
    applyOkV7(ranged, seatIdV7(ranged, 1), attack(ranged, MARKSMAN, INITIATE));
    // A neutral unit is never bound.
    expect(
      awestruckBearersV7(two, two.units, {
        ownerId: NEUTRAL_OWNER_ID_V7,
        at: at(5, 4),
      }),
    ).toEqual([]);
    // With the idol down every target is free again.
    const fallen = humanTurn([
      cult("GUARD", BEARER),
      cult("FIGHTER", at(6, 4)),
      human("FIGHTER", at(5, 4)),
    ]);
    const frogged = withFrogsV7(fallen, [BEARER]);
    applyOkV7(
      frogged,
      seatIdV7(frogged, 1),
      attack(frogged, at(5, 4), at(6, 4)),
    );
  });

  it("never binds a unit beside an idol of its own seat", () => {
    // A Cult Initiate beside its own Idol Bearer attacks whom it likes.
    const state = cultFieldV7([
      cult("GUARD", BEARER),
      cult("FIGHTER", INITIATE),
      human("FIGHTER", at(6, 5)),
      human("FIGHTER", at(4, 5)),
    ]);
    expect(
      awestruckBearersV7(state, state.units, unitAtV7(state, INITIATE)),
    ).toEqual([]);
    applyOkV7(state, seatIdV7(state, 0), attack(state, INITIATE, at(6, 5)));
  });
});

describe("the warden: words (section 13)", () => {
  it("has plain-words entries for Behold! and Awestruck", () => {
    expect(glossaryEntryV7("BEHOLD").text).toMatch(/half from shots/);
    expect(glossaryEntryV7("AWESTRUCK").text).toMatch(/only an Idol Bearer/);
  });
});
