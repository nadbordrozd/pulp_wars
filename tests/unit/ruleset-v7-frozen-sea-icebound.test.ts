import { describe, expect, it } from "vitest";
import {
  estimateCombatV7,
  previewBoardV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  queryUnitStatsV7,
  unitIsIceboundV7,
  unitIsSubmergedV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  frozenStateV7,
  patchFrozenUnitV7,
  type FrozenIceV7,
  type FrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  movedActivationV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md section 8.9): an afloat unit on an
// ice tile is icebound: it cannot Move, Attack, Board, or retaliate, and no
// ram, Push, or pull moves it. Here the ships belong to two seafaring seats
// and the ice to a third, Ice Folk seat, so both sides of every rule can act.

const scene = (
  units: readonly FrozenUnitV7[],
  ice: readonly CoordV7[],
  factions: readonly [FactionIdV7, FactionIdV7] = ["ORIGINAL", "UNDEAD"],
): GameStateV7 =>
  frozenArenaV7({
    factions,
    units,
    ice: ice.map((at): FrozenIceV7 => ({ at, seat: 2, turnsLeft: 5 })),
    third: { faction: "ICE_FOLK", explored: true },
  });
const commandsOf = (state: GameStateV7, unitId: number, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id)).filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );
const kindsOf = (state: GameStateV7, unitId: number, seat: 0 | 1 = 0) => [
  ...new Set(commandsOf(state, unitId, seat).map((command) => command.kind)),
];

describe("an icebound ship is frozen solid (section 8.9)", () => {
  const BATTLESHIP: CoordV7 = { x: 2, y: 5 };
  const BOAT: CoordV7 = { x: 6, y: 5 };
  const PREY: CoordV7 = { x: 7, y: 5 };
  const build = (ice: readonly CoordV7[]) => {
    const base = scene(
      [
        { seat: 0, role: "BATTLESHIP", at: BATTLESHIP },
        { seat: 0, role: "PATROL_BOAT", at: BOAT },
        { seat: 1, role: "PATROL_BOAT", at: PREY },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
      ],
      ice,
    );
    return patchFrozenUnitV7(base, navalUnitAtV7(base, PREY).id, { hp: 1 });
  };

  it("cannot Move, Attack, or Board; it may still Wait", () => {
    const state = build([BATTLESHIP, BOAT]);
    const battleship = navalUnitAtV7(state, BATTLESHIP);
    const boat = navalUnitAtV7(state, BOAT);
    const prey = navalUnitAtV7(state, PREY);
    const fighter = navalUnitAtV7(state, { x: 2, y: 8 });
    expect(unitIsIceboundV7(state, battleship)).toBe(true);
    expect(unitIsIceboundV7(state, boat)).toBe(true);
    expect(unitIsIceboundV7(state, prey)).toBe(false);
    expect(kindsOf(state, battleship.id)).toEqual(["WAIT"]);
    expect(kindsOf(state, boat.id)).toEqual(["WAIT"]);
    expect(
      rejectV7(state, 0, {
        kind: "ATTACK",
        unitId: battleship.id,
        targetUnitId: fighter.id,
      }),
    ).toEqual({ code: "ATTACK_NOT_LEGAL", params: { reason: "ICEBOUND" } });
    expect(estimateCombatV7(state, battleship.id, fighter.id)).toBeNull();
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(queryCombatPreviewV7(view, battleship.id, fighter.id)).toBeNull();
    expect(
      rejectV7(state, 0, {
        kind: "BOARD",
        unitId: boat.id,
        targetUnitId: prey.id,
      }),
    ).toEqual({ code: "BOARD_NOT_LEGAL", params: { reason: "ICEBOUND" } });
    expect(previewBoardV7(view, boat.id, prey.id)).toBeNull();
    // The public stats say so, and it threatens nothing.
    const opponent = viewForV7(state, seatV7(state, 1).id);
    expect(queryUnitStatsV7(opponent, battleship.id)?.icebound).toBe(true);
    expect(queryUnitStatsV7(opponent, prey.id)?.icebound).toBe(false);
    expect(queryThreatenedTilesV7(opponent, battleship.id)).toEqual([]);
    acceptV7(state, 0, { kind: "WAIT", unitId: battleship.id });
  });

  it("the same ships free of ice act as usual", () => {
    const state = build([]);
    const battleship = navalUnitAtV7(state, BATTLESHIP);
    const boat = navalUnitAtV7(state, BOAT);
    expect(kindsOf(state, battleship.id)).toEqual(
      expect.arrayContaining(["MOVE", "ATTACK"]),
    );
    expect(kindsOf(state, boat.id)).toEqual(
      expect.arrayContaining(["MOVE", "ATTACK", "BOARD"]),
    );
    expect(
      queryThreatenedTilesV7(
        viewForV7(state, seatV7(state, 1).id),
        battleship.id,
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe("an icebound defender (section 8.9)", () => {
  const RAMMER: CoordV7 = { x: 5, y: 5 };
  const TARGET: CoordV7 = { x: 6, y: 5 };
  const build = (ice: readonly CoordV7[]) => {
    const base = scene(
      [
        { seat: 0, role: "PATROL_BOAT", at: RAMMER },
        { seat: 1, role: "PATROL_BOAT", at: TARGET },
        { seat: 0, role: "JUGGERNAUT", at: { x: 2, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 2, y: 3 } },
      ],
      ice,
    );
    const rammer = navalUnitAtV7(base, RAMMER);
    // The Patrol Boat has moved: a Ram on a free target.
    return patchFrozenUnitV7(base, rammer.id, {
      activation: movedActivationV7(rammer),
    });
  };
  const attack = (
    state: GameStateV7,
    from: CoordV7,
    to: CoordV7,
  ): CommandV7 => ({
    kind: "ATTACK",
    unitId: navalUnitAtV7(state, from).id,
    targetUnitId: navalUnitAtV7(state, to).id,
  });

  it("never retaliates, is never rammed, and is never shoved", () => {
    const frozen = build([TARGET]);
    const rammer = navalUnitAtV7(frozen, RAMMER);
    const target = navalUnitAtV7(frozen, TARGET);
    const view = viewForV7(frozen, seatV7(frozen, 0).id);
    const preview = queryCombatPreviewV7(view, rammer.id, target.id);
    expect(preview).toMatchObject({
      icebound: true,
      retaliation: false,
      noRetaliationReason: "ICEBOUND",
      damageToAttacker: 0,
      ram: false,
      push: "BLOCKED",
      iceCover: false,
    });
    const result = acceptV7(frozen, 0, attack(frozen, RAMMER, TARGET));
    const resolved = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    // The public preview equals the resolution.
    for (const field of [
      "icebound",
      "retaliation",
      "noRetaliationReason",
      "damageToDefender",
      "damageToAttacker",
      "ram",
      "push",
      "attack2",
      "defense2",
    ] as const)
      expect(resolved.preview[field], field).toEqual(preview?.[field]);
    expect(navalUnitV7(result.state, rammer.id).hp).toBe(rammer.hp);
    expect(navalUnitV7(result.state, target.id).at).toEqual(TARGET);
    // The same exchange on open water is a Ram with a reply and a shove.
    const open = build([]);
    expect(
      queryCombatPreviewV7(
        viewForV7(open, seatV7(open, 0).id),
        rammer.id,
        target.id,
      ),
    ).toMatchObject({
      icebound: false,
      retaliation: true,
      noRetaliationReason: null,
      ram: true,
      push: "WILL_PUSH",
    });
  });

  it("is not pushed by a Juggernaut on the shore", () => {
    const frozen = build([{ x: 2, y: 3 }]);
    const giant = navalUnitAtV7(frozen, { x: 2, y: 2 });
    const ship = navalUnitAtV7(frozen, { x: 2, y: 3 });
    const preview = queryCombatPreviewV7(
      viewForV7(frozen, seatV7(frozen, 0).id),
      giant.id,
      ship.id,
    );
    expect(preview).toMatchObject({
      icebound: true,
      retaliation: false,
      push: "BLOCKED",
      advances: false,
    });
    const result = acceptV7(
      frozen,
      0,
      attack(frozen, { x: 2, y: 2 }, { x: 2, y: 3 }),
    );
    expect(navalUnitV7(result.state, ship.id).at).toEqual({ x: 2, y: 3 });
    expect(navalUnitV7(result.state, giant.id).hp).toBe(giant.hp);
    expect(result.events.some((event) => event.kind === "UNIT_PUSHED")).toBe(
      false,
    );
  });

  it("may be boarded, and the prize stays icebound", () => {
    const base = build([TARGET]);
    const target = navalUnitAtV7(base, TARGET);
    const rammer = navalUnitAtV7(base, RAMMER);
    // A fresh boarder next to a crippled, icebound target.
    const state = patchFrozenUnitV7(
      patchFrozenUnitV7(base, target.id, { hp: 2 }),
      rammer.id,
      { activation: target.activation },
    );
    const board: CommandV7 = {
      kind: "BOARD",
      unitId: rammer.id,
      targetUnitId: target.id,
    };
    expect(commandsOf(state, rammer.id)).toContainEqual(board);
    const result = acceptV7(state, 0, board);
    const prize = navalUnitV7(result.state, target.id);
    expect(prize.ownerId).toBe(seatV7(state, 0).id);
    expect(prize.at).toEqual(TARGET);
    expect(unitIsIceboundV7(result.state, prize)).toBe(true);
  });
});

describe("an icebound Submarine and an icebound transport (section 8.9)", () => {
  it("an icebound Submarine is not submerged: it is attacked from 2 or more", () => {
    const SUB: CoordV7 = { x: 5, y: 5 };
    const build = (ice: readonly CoordV7[]) =>
      scene(
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 7, y: 4 } },
          { seat: 1, role: "SUBMARINE", at: SUB },
        ],
        ice,
      );
    const frozen = build([SUB]);
    const sub = navalUnitAtV7(frozen, SUB);
    const battleship = navalUnitAtV7(frozen, { x: 7, y: 4 });
    const shot: CommandV7 = {
      kind: "ATTACK",
      unitId: battleship.id,
      targetUnitId: sub.id,
    };
    expect(unitIsSubmergedV7(frozen, sub)).toBe(false);
    expect(
      queryUnitStatsV7(viewForV7(frozen, seatV7(frozen, 0).id), sub.id),
    ).toMatchObject({ submerged: false, icebound: true });
    expect(commandsOf(frozen, battleship.id)).toContainEqual(shot);
    acceptV7(frozen, 0, shot);
    const open = build([]);
    expect(unitIsSubmergedV7(open, navalUnitAtV7(open, SUB))).toBe(true);
    expect(commandsOf(open, battleship.id)).not.toContainEqual(shot);
    expect(rejectV7(open, 0, shot).code).toBe("TARGET_OUT_OF_RANGE");
  });

  it("the crew of an icebound transport may land, onto land or onto ice", () => {
    const AFLOAT: CoordV7 = { x: 2, y: 7 };
    const base = scene([{ seat: 0, role: "FIGHTER", at: { x: 0, y: 1 } }], []);
    const fighter = navalUnitAtV7(base, { x: 0, y: 1 });
    const state = frozenStateV7(
      patchFrozenUnitV7(base, fighter.id, { at: AFLOAT, form: "EMBARKED" }),
      [
        { at: AFLOAT, seat: 2, turnsLeft: 5 },
        { at: { x: 2, y: 6 }, seat: 2, turnsLeft: 5 },
      ],
    );
    expect(unitIsIceboundV7(state, navalUnitV7(state, fighter.id))).toBe(true);
    const landings = commandsOf(state, fighter.id).flatMap((command) =>
      command.kind === "DISEMBARK" ? [command.at] : [],
    );
    expect(landings).toContainEqual({ x: 2, y: 6 });
    expect(landings).toContainEqual({ x: 2, y: 8 });
    // Open water is no landing.
    expect(landings).not.toContainEqual({ x: 1, y: 6 });
    expect(kindsOf(state, fighter.id)).not.toContain("MOVE");
    const onIce = acceptV7(state, 0, {
      kind: "DISEMBARK",
      unitId: fighter.id,
      at: { x: 2, y: 6 },
    });
    expect(navalUnitV7(onIce.state, fighter.id)).toMatchObject({
      at: { x: 2, y: 6 },
      form: "LAND",
    });
    const ashore = acceptV7(state, 0, {
      kind: "DISEMBARK",
      unitId: fighter.id,
      at: { x: 2, y: 8 },
    });
    expect(navalUnitV7(ashore.state, fighter.id).form).toBe("LAND");
  });

  it("a Tractor Beam never pulls an icebound ship", () => {
    const BOAT: CoordV7 = { x: 2, y: 4 };
    const build = (ice: readonly CoordV7[]) =>
      scene(
        [
          { seat: 0, role: "KNIGHT", at: { x: 2, y: 2 } },
          { seat: 1, role: "PATROL_BOAT", at: BOAT },
        ],
        ice,
        ["MARTIAN", "UNDEAD"],
      );
    const frozen = build([BOAT]);
    const mothership = navalUnitAtV7(frozen, { x: 2, y: 2 });
    const pull: CommandV7 = {
      kind: "TRACTOR_BEAM",
      unitId: mothership.id,
      targetUnitId: navalUnitAtV7(frozen, BOAT).id,
    };
    expect(commandsOf(frozen, mothership.id)).not.toContainEqual(pull);
    expect(rejectV7(frozen, 0, pull)).toEqual({
      code: "TRACTOR_BEAM_NOT_LEGAL",
      params: { reason: "TARGET_IMMUNE" },
    });
    // The same boat on open water is pulled.
    const open = build([]);
    expect(commandsOf(open, mothership.id)).toContainEqual(pull);
    acceptV7(open, 0, pull);
  });
});
