import { describe, expect, it } from "vitest";
import {
  estimateCombatV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CombatPreviewV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  acceptV7,
  movedActivationV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step I (`pulp_wars-5ti.2`,
// docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1): the Ram. A Patrol
// Boat with Seamanship that moved this turn rams a target afloat: +1 Attack
// and a shove of the surviving target one tile directly away.

const EXACT_FIELDS = [
  "attack2",
  "defense2",
  "damageToDefender",
  "damageToAttacker",
  "defenderDies",
  "attackerDies",
  "retaliation",
  "noRetaliationReason",
  "push",
  "ram",
  "torpedo",
  "advances",
] as const satisfies readonly (keyof CombatPreviewV7)[];

function exact(preview: CombatPreviewV7 | null) {
  if (preview === null) return null;
  return Object.fromEntries(EXACT_FIELDS.map((key) => [key, preview[key]]));
}

function resolved(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events.find((entry) => entry.kind === "COMBAT_RESOLVED");
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

/**
 * A duel: seat 0's Patrol Boat on `attacker` (already moved one tile this
 * turn) next to seat 1's unit of `targetRole` on `target`.
 */
function duel(
  attacker: CoordV7,
  target: CoordV7,
  options: {
    readonly moved?: boolean;
    readonly seamanship?: boolean;
    readonly targetRole?: "PATROL_BOAT" | "BATTLESHIP" | "SUBMARINE";
    readonly attackerRole?: "PATROL_BOAT" | "BATTLESHIP" | "SUBMARINE";
    readonly extra?: readonly {
      readonly seat: 0 | 1;
      readonly role: "PATROL_BOAT" | "FIGHTER";
      readonly at: CoordV7;
    }[];
  } = {},
): {
  readonly state: GameStateV7;
  readonly attackerId: number;
  readonly targetId: number;
} {
  const base = navalArenaV7({
    technologies: [
      options.seamanship === false
        ? ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"]
        : [
            "SHORECRAFT",
            "NAVIGATION",
            "NAVAL_ENGINEERING",
            "SEAMANSHIP",
            "SUBMERSIBLES",
          ],
      ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"],
    ],
    units: [
      { seat: 0, role: options.attackerRole ?? "PATROL_BOAT", at: attacker },
      { seat: 1, role: options.targetRole ?? "PATROL_BOAT", at: target },
      ...(options.extra ?? []),
    ],
  });
  const attackerId = navalUnitAtV7(base, attacker).id;
  const targetId = navalUnitAtV7(base, target).id;
  const state =
    options.moved === false
      ? base
      : patchNavalUnitV7(base, attackerId, {
          activation: movedActivationV7(navalUnitV7(base, attackerId)),
        });
  return { state, attackerId, targetId };
}

function attack(fixture: ReturnType<typeof duel>) {
  const view = viewForV7(fixture.state, seatV7(fixture.state, 0).id);
  const preview = queryCombatPreviewV7(
    view,
    fixture.attackerId as never,
    fixture.targetId as never,
  );
  const result = acceptV7(fixture.state, 0, {
    kind: "ATTACK",
    unitId: fixture.attackerId as never,
    targetUnitId: fixture.targetId as never,
  });
  // The public preview is exact: it equals the resolution.
  expect(exact(preview)).toEqual(exact(resolved(result.events)));
  return { preview: resolved(result.events), result };
}

describe("the Ram bonus", () => {
  it("adds +1 Attack and shoves when a Patrol Boat that really moved attacks a boat", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 6 } },
      ],
    });
    const boat = navalUnitAtV7(base, { x: 2, y: 4 });
    const target = navalUnitAtV7(base, { x: 2, y: 6 });
    const moved = acceptV7(base, 0, {
      kind: "MOVE",
      unitId: boat.id,
      path: [{ x: 2, y: 5 }],
    });
    const view = viewForV7(moved.state, seatV7(moved.state, 0).id);
    const preview = queryCombatPreviewV7(view, boat.id, target.id);
    expect(exact(preview)).toEqual({
      attack2: 6,
      defense2: 4,
      damageToDefender: 8,
      damageToAttacker: 4,
      defenderDies: false,
      attackerDies: false,
      retaliation: true,
      noRetaliationReason: null,
      push: "WILL_PUSH",
      ram: true,
      torpedo: false,
      advances: false,
    });
    const hit = acceptV7(moved.state, 0, {
      kind: "ATTACK",
      unitId: boat.id,
      targetUnitId: target.id,
    });
    expect(exact(resolved(hit.events))).toEqual(exact(preview));
    expect(hit.events).toContainEqual({
      kind: "UNIT_PUSHED",
      sourceUnitId: boat.id,
      targetUnitId: target.id,
      from: { x: 2, y: 6 },
      to: { x: 2, y: 7 },
    });
    // The shoved unit keeps its (damaged) HP and its activation; the
    // rammer stays where it is (a ship never advances).
    expect(navalUnitV7(hit.state, target.id)).toMatchObject({
      at: { x: 2, y: 7 },
      hp: 2,
      activation: target.activation,
    });
    expect(navalUnitV7(hit.state, boat.id)).toMatchObject({
      at: { x: 2, y: 5 },
      hp: 6,
    });
    expect(parseGameStateV7(hit.state)).not.toBeNull();
  });

  it("is not a Ram without a Move, without Seamanship, for another ship role, or on a land target", () => {
    // Not moved: the plain duel of current rules (5 dealt, 5 taken).
    const still = attack(
      duel({ x: 2, y: 5 }, { x: 2, y: 6 }, { moved: false }),
    );
    expect(exact(still.preview)).toMatchObject({
      attack2: 4,
      damageToDefender: 5,
      damageToAttacker: 5,
      push: "BLOCKED",
      ram: false,
    });
    expect(
      still.result.events.some((event) => event.kind === "UNIT_PUSHED"),
    ).toBe(false);
    // Moved, but its owner has no Seamanship.
    const untrained = attack(
      duel({ x: 2, y: 5 }, { x: 2, y: 6 }, { seamanship: false }),
    );
    expect(exact(untrained.preview)).toMatchObject({
      attack2: 4,
      damageToDefender: 5,
      push: "BLOCKED",
      ram: false,
    });
    // A Submarine that moved torpedoes; it never rams.
    const submarine = attack(
      duel({ x: 2, y: 5 }, { x: 2, y: 6 }, { attackerRole: "SUBMARINE" }),
    );
    expect(exact(submarine.preview)).toMatchObject({
      attack2: 8,
      push: "BLOCKED",
      ram: false,
      torpedo: true,
    });
    // A land target on the shore is not afloat: no Ram.
    const shore = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
      ],
    });
    const boat = navalUnitAtV7(shore, { x: 2, y: 7 });
    const fighter = navalUnitAtV7(shore, { x: 2, y: 8 });
    const landed = acceptV7(
      patchNavalUnitV7(shore, boat.id, {
        activation: movedActivationV7(boat),
      }),
      0,
      { kind: "ATTACK", unitId: boat.id, targetUnitId: fighter.id },
    );
    expect(exact(resolved(landed.events))).toMatchObject({
      attack2: 4,
      ram: false,
      push: "BLOCKED",
    });
  });

  it("never applies on retaliation: a rammer that is attacked defends as usual", () => {
    // Seat 0's boat has moved; seat 1 attacks it on its own turn.
    const fixture = duel({ x: 2, y: 5 }, { x: 2, y: 6 });
    const ended = acceptV7(fixture.state, 0, { kind: "END_TURN" });
    const hit = acceptV7(ended.state, 1, {
      kind: "ATTACK",
      unitId: fixture.targetId as never,
      targetUnitId: fixture.attackerId as never,
    });
    expect(exact(resolved(hit.events))).toMatchObject({
      attack2: 4,
      damageToDefender: 5,
      damageToAttacker: 5,
      ram: false,
      push: "BLOCKED",
    });
  });

  it("matches the worked examples: a transport takes 10 (6 without the Ram), a Battleship 6 and sinks the boat, a Submarine 8", () => {
    const transportArena = (moved: boolean) => {
      // An Undead Patrol Boat against a Human Fighter (12 HP) at sea.
      const base = navalArenaV7({
        factions: ["UNDEAD", "ORIGINAL"],
        units: [
          { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
          { seat: 1, role: "FIGHTER", at: { x: 2, y: 9 } },
        ],
      });
      const boat = navalUnitAtV7(base, { x: 2, y: 5 });
      const fighter = navalUnitAtV7(base, { x: 2, y: 9 });
      const afloat = patchNavalUnitV7(base, fighter.id, {
        form: "EMBARKED",
        at: { x: 2, y: 6 },
      });
      return {
        state: moved
          ? patchNavalUnitV7(afloat, boat.id, {
              activation: movedActivationV7(boat),
            })
          : afloat,
        attackerId: boat.id as number,
        targetId: fighter.id as number,
      };
    };
    const rammed = attack(transportArena(true));
    // An embarked unit never retaliates (current rules section 13.2).
    expect(exact(rammed.preview)).toMatchObject({
      attack2: 6,
      defense2: 2,
      damageToDefender: 10,
      damageToAttacker: 0,
      retaliation: false,
      push: "WILL_PUSH",
      ram: true,
    });
    expect(rammed.result.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_PUSHED",
        from: { x: 2, y: 6 },
        to: { x: 2, y: 7 },
      }),
    );
    expect(exact(attack(transportArena(false)).preview)).toMatchObject({
      damageToDefender: 6,
      ram: false,
      push: "BLOCKED",
    });
    const battleship = attack(
      duel({ x: 2, y: 5 }, { x: 2, y: 6 }, { targetRole: "BATTLESHIP" }),
    );
    expect(exact(battleship.preview)).toMatchObject({
      damageToDefender: 6,
      damageToAttacker: 10,
      attackerDies: true,
      ram: true,
      push: "WILL_PUSH",
    });
    const submarine = attack(
      duel({ x: 2, y: 5 }, { x: 2, y: 6 }, { targetRole: "SUBMARINE" }),
    );
    expect(exact(submarine.preview)).toMatchObject({
      damageToDefender: 8,
      damageToAttacker: 4,
      ram: true,
      push: "WILL_PUSH",
    });
    // 4 HP left: at its boarding line.
    expect(
      submarine.result.state.units.find((unit) => unit.role === "SUBMARINE"),
    ).toMatchObject({ hp: 4, at: { x: 2, y: 7 } });
  });

  it("estimates a Ram for an attack after a planned Move", () => {
    const fixture = duel({ x: 2, y: 5 }, { x: 2, y: 6 }, { moved: false });
    expect(
      estimateCombatV7(
        fixture.state,
        fixture.attackerId as never,
        fixture.targetId as never,
      ),
    ).toMatchObject({ ram: false, attack2: 4 });
    expect(
      estimateCombatV7(
        fixture.state,
        fixture.attackerId as never,
        fixture.targetId as never,
        1,
      ),
    ).toMatchObject({ ram: true, attack2: 6, damageToDefender: 8 });
  });
});

describe("the ram's shove", () => {
  it("shoves one tile directly away in all eight directions", () => {
    const target = { x: 5, y: 5 };
    for (const dx of [-1, 0, 1])
      for (const dy of [-1, 0, 1]) {
        if (dx === 0 && dy === 0) continue;
        const fixture = duel({ x: 5 - dx, y: 5 - dy }, target);
        const { preview, result } = attack(fixture);
        expect(preview.push, `${dx},${dy}`).toBe("WILL_PUSH");
        expect(navalUnitV7(result.state, fixture.targetId).at).toEqual({
          x: 5 + dx,
          y: 5 + dy,
        });
        // One attack, one shove: exactly one UNIT_PUSHED.
        expect(
          result.events.filter((event) => event.kind === "UNIT_PUSHED"),
        ).toHaveLength(1);
      }
  });

  const blocked = (
    name: string,
    fixture: ReturnType<typeof duel>,
    expectedAt: CoordV7,
  ) => {
    const { preview, result } = attack(fixture);
    expect(preview.ram, name).toBe(true);
    expect(preview.push, name).toBe("BLOCKED");
    expect(
      result.events.some((event) => event.kind === "UNIT_PUSHED"),
      name,
    ).toBe(false);
    expect(navalUnitV7(result.state, fixture.targetId).at, name).toEqual(
      expectedAt,
    );
  };

  it("does not shove off the board, onto land, onto a dock, onto a unit, or from Shallow onto Deep Water", () => {
    blocked("edge", duel({ x: 1, y: 5 }, { x: 0, y: 5 }), { x: 0, y: 5 });
    blocked("land", duel({ x: 2, y: 4 }, { x: 2, y: 3 }), { x: 2, y: 3 });
    // Seat 0's own Port is on (4, 3): docks never take a shoved unit.
    expect(NAVAL_ARENA_PORTS_V7[0]).toEqual({ x: 4, y: 3 });
    blocked("dock", duel({ x: 4, y: 5 }, { x: 4, y: 4 }), { x: 4, y: 4 });
    blocked(
      "unit",
      duel(
        { x: 5, y: 4 },
        { x: 5, y: 5 },
        { extra: [{ seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 6 } }] },
      ),
      { x: 5, y: 5 },
    );
    blocked(
      "own unit",
      duel(
        { x: 5, y: 4 },
        { x: 5, y: 5 },
        { extra: [{ seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 6 } }] },
      ),
      { x: 5, y: 5 },
    );
    // (8, 5) is Shallow (west of the islet); (8, 4) behind it is Deep.
    const shallow = duel({ x: 8, y: 6 }, { x: 8, y: 5 });
    const tile = (at: CoordV7) =>
      shallow.state.board.tiles.find(
        (entry) => entry.at.x === at.x && entry.at.y === at.y,
      )?.terrain;
    expect([tile({ x: 8, y: 5 }), tile({ x: 8, y: 4 })]).toEqual([
      "SHALLOW_WATER",
      "DEEP_WATER",
    ]);
    blocked("deep from shallow", shallow, { x: 8, y: 5 });
  });

  it("shoves from Deep onto Shallow Water and from Deep onto Deep Water whatever the target's owner researched", () => {
    // The target's owner has no Navigation (a ship can still be on Deep
    // Water only by an earlier shove in play; the rule reads the tile).
    const fixture = duel({ x: 5, y: 4 }, { x: 5, y: 5 });
    const { preview, result } = attack(fixture);
    expect(preview.push).toBe("WILL_PUSH");
    expect(navalUnitV7(result.state, fixture.targetId).at).toEqual({
      x: 5,
      y: 6,
    });
  });

  it("does not shove onto a tile the attacker has not explored", () => {
    const fixture = duel({ x: 5, y: 4 }, { x: 5, y: 5 });
    const actor = seatV7(fixture.state, 0).id;
    const hidden: GameStateV7 = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !(at.x === 5 && at.y === 6),
              ),
            }
          : player,
      ),
    };
    expect(parseGameStateV7(hidden)).not.toBeNull();
    blocked("unexplored", { ...fixture, state: hidden }, { x: 5, y: 5 });
  });

  it("does not shove a target the Ram kills", () => {
    const fixture = duel({ x: 5, y: 4 }, { x: 5, y: 5 });
    const wounded = patchNavalUnitV7(fixture.state, fixture.targetId, {
      hp: 6,
    });
    const { preview, result } = attack({ ...fixture, state: wounded });
    expect(preview).toMatchObject({
      ram: true,
      defenderDies: true,
      push: "BLOCKED",
    });
    expect(result.events.some((event) => event.kind === "UNIT_PUSHED")).toBe(
      false,
    );
    expect(
      result.state.units.some((unit) => unit.id === fixture.targetId),
    ).toBe(false);
  });

  it("shoves a blockader off a dock and reports the blockade lifted", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    });
    const mine = navalUnitAtV7(base, { x: 6, y: 4 });
    const blockader = navalUnitAtV7(base, { x: 4, y: 5 });
    const port = NAVAL_ARENA_PORTS_V7[0];
    const city = base.cities.find(
      (entry) => entry.ownerId === seatV7(base, 0).id,
    );
    if (city === undefined) throw new Error("no city");
    // Seat 1 sails onto seat 0's Port.
    const passed = acceptV7(base, 0, { kind: "END_TURN" });
    const sailed = acceptV7(passed.state, 1, {
      kind: "MOVE",
      unitId: blockader.id,
      path: [{ x: 4, y: 4 }, port],
    });
    expect(sailed.events).toContainEqual(
      expect.objectContaining({
        kind: "PORT_BLOCKADE_CHANGED",
        at: port,
        activeBefore: true,
        activeAfter: false,
      }),
    );
    const back = acceptV7(sailed.state, 1, { kind: "END_TURN" });
    const blockadedPopulation = back.state.cities.find(
      (entry) => entry.id === city.id,
    )?.economicPopulation;
    // Seat 0 moves next to it and rams it west, onto open Shallow Water.
    const moved = acceptV7(back.state, 0, {
      kind: "MOVE",
      unitId: mine.id,
      path: [{ x: 5, y: 3 }],
    });
    const rammed = acceptV7(moved.state, 0, {
      kind: "ATTACK",
      unitId: mine.id,
      targetUnitId: blockader.id,
    });
    expect(resolved(rammed.events)).toMatchObject({
      ram: true,
      push: "WILL_PUSH",
    });
    expect(navalUnitV7(rammed.state, blockader.id).at).toEqual({ x: 3, y: 3 });
    expect(rammed.events).toContainEqual({
      kind: "PORT_BLOCKADE_CHANGED",
      playerId: seatV7(base, 0).id,
      cityId: city.id,
      at: port,
      activeBefore: false,
      activeAfter: true,
    });
    // The dock gives its population again.
    expect(
      rammed.state.cities.find((entry) => entry.id === city.id)
        ?.economicPopulation,
    ).toBe((blockadedPopulation ?? 0) + 2);
    expect(parseGameStateV7(rammed.state)).not.toBeNull();
  });

  it("offers the ramming attack like any attack and nothing new to click", () => {
    const fixture = duel({ x: 2, y: 5 }, { x: 2, y: 6 });
    const commands = queryPlayerCommandsV7(
      viewForV7(fixture.state, seatV7(fixture.state, 0).id),
    ).filter(
      (command) => "unitId" in command && command.unitId === fixture.attackerId,
    );
    expect(commands.map((command) => command.kind).sort()).toEqual([
      "ATTACK",
      "WAIT",
    ]);
  });
});
