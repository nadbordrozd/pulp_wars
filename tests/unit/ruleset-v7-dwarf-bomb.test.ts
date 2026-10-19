import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  previewBombRunV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  viewForV7,
  type CommandV7,
  type DomainEventV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  bombV7,
  dwarfFieldV7,
  offeredOfV7,
  refusalV7,
} from "../fixtures/v7-dwarf";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { playV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  fieldDefenseV7,
  kindsV7,
  patchTileV7,
  tileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// The Dwarf revision (`pulp_wars-78i.3`): the Gyrocopter and its bombing
// run (docs/product/RULESET_7_DWARVES.md section 6). The field is the one of
// ruleset-v7-dwarf-tunnel.test.ts; every technology (Dive: a bomb deals 7)
// unless a test removes Raiding. The coarse balance (`pulp_wars-78i.7`)
// raised the bomb from 4 to 5 and the Dive bomb from 5 to 6; the
// Gyrocopter pass (`pulp_wars-w49.44`) to 6 and 7, and the run lands back
// home or anywhere the Gyrocopter's Move reaches.

const ENEMY: IcePieceV7 = { seat: 1, role: "FIGHTER", at: at(1, 1) };
const NO_DIVE = TECHNOLOGY_IDS_V7.filter(
  (tech) => tech !== "RAIDING" && tech !== "CHIVALRY",
);

function bombed(
  events: readonly DomainEventV7[],
): Extract<DomainEventV7, { kind: "UNIT_BOMBED" }> {
  const event = events.find((item) => item.kind === "UNIT_BOMBED");
  if (event?.kind !== "UNIT_BOMBED") throw new Error("no bomb");
  return event;
}

/** Plays an offered bomb whose public preview must equal the result. */
function bombRun(
  state: GameStateV7,
  command: Extract<CommandV7, { kind: "BOMB_RUN" }>,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const preview = previewBombRunV7(
    viewForV7(state, activeIdV7(state)),
    command,
  );
  if (preview === null) throw new Error("no bomb preview");
  const result = playV7(state, command);
  const event = bombed(result.events);
  expect({
    damage: preview.damage,
    shieldDamage: preview.shieldDamage,
    kills: preview.kills,
  }).toEqual({
    damage: event.damage,
    shieldDamage: event.shieldDamage,
    kills: event.killed,
  });
  return result;
}

describe("the Bomb Run command (section 6.2)", () => {
  it("bombs a target at range 2 and 1, landing back home or anywhere its Move reaches, unanswered, for the fixed damage", () => {
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ],
      { techs: { 0: NO_DIVE } },
    );
    const gyro = unitAtV7(state, at(5, 2));
    const target = unitAtV7(state, at(5, 4));
    const offered = offeredOfV7(state, at(5, 2), "BOMB_RUN").filter(
      (command) =>
        command.kind === "BOMB_RUN" && command.targetUnitId === target.id,
    );
    // The Gyrocopter pass (`pulp_wars-w49.44`): its own tile and every
    // Move destination, whatever the target (was: within 2 of the target
    // and farther from the start). The village (5, 5) is a landing too
    // since any unit can capture (`pulp_wars-ke95`).
    const moves = offeredOfV7(state, at(5, 2), "MOVE").map((command) =>
      command.kind === "MOVE" ? command.path.at(-1) : null,
    );
    const landings = offered.map((command) =>
      command.kind === "BOMB_RUN" ? command.to : null,
    );
    expect(landings).toEqual(
      [at(5, 2), ...moves].sort(
        (left, right) =>
          (left?.y ?? 0) - (right?.y ?? 0) || (left?.x ?? 0) - (right?.x ?? 0),
      ),
    );
    for (const to of [at(5, 2), at(5, 0), at(2, 2), at(4, 3), at(5, 5)])
      expect(landings, JSON.stringify(to)).toContainEqual(to);
    // The same landings for the other target in reach.
    expect(
      offeredOfV7(state, at(5, 2), "BOMB_RUN").flatMap((command) =>
        command.kind === "BOMB_RUN" &&
        command.targetUnitId === unitAtV7(state, at(6, 3)).id
          ? [command.to]
          : [],
      ),
    ).toEqual(landings);
    const result = bombRun(state, bombV7(state, at(5, 2), at(5, 4), at(4, 5)));
    expect(bombed(result.events)).toEqual({
      kind: "UNIT_BOMBED",
      playerId: activeIdV7(state),
      unitId: gyro.id,
      from: at(5, 2),
      to: at(4, 5),
      targetUnitId: target.id,
      at: at(5, 4),
      damage: 6,
      shieldDamage: 0,
      killed: false,
    });
    expect(unitAtV7(result.state, at(5, 4)).hp).toBe(target.hp - 6);
    expect(unitAtV7(result.state, at(4, 5))).toMatchObject({
      id: gyro.id,
      hp: gyro.hp,
      activation: { moved: true, handled: true },
    });
    expect(result.state.bombedThisTurn).toEqual([target.id]);
    expect(kindsV7(result.events)).not.toContain("COMBAT_RESOLVED");
    // Range 1, landing two tiles from the start.
    const near = unitAtV7(state, at(6, 3));
    const close = bombRun(state, bombV7(state, at(5, 2), at(6, 3), at(7, 4)));
    expect(bombed(close.events)).toMatchObject({
      targetUnitId: near.id,
      damage: 6,
    });
    // Back home: it flies over the target and lands where it started, has
    // used its Move and its action, and the target keeps the damage.
    const home = bombRun(state, bombV7(state, at(5, 2), at(5, 4), at(5, 2)));
    expect(bombed(home.events)).toMatchObject({
      from: at(5, 2),
      to: at(5, 2),
      at: at(5, 4),
      damage: 6,
    });
    expect(unitAtV7(home.state, at(5, 2))).toMatchObject({
      id: gyro.id,
      activation: { moved: true, handled: true, movedPathLength: 0 },
    });
    expect(unitAtV7(home.state, at(5, 4)).hp).toBe(target.hp - 6);
    // And behind its start, 3 tiles away and 5 from the target.
    const behind = bombRun(state, bombV7(state, at(5, 2), at(5, 4), at(2, 0)));
    expect(unitAtV7(behind.state, at(2, 0)).id).toBe(gyro.id);
  });

  it("deals 7 with Dive; Armoured takes 1 off; a Shield absorbs first", () => {
    const dive = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ENEMY,
    ]);
    expect(
      bombed(bombRun(dive, bombV7(dive, at(5, 2), at(5, 3), at(5, 4))).events)
        .damage,
    ).toBe(7);
    const anky = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
        ENEMY,
      ],
      { factions: ["DWARF", "DINOSAUR"] },
    );
    expect(
      bombed(bombRun(anky, bombV7(anky, at(5, 2), at(5, 3), at(5, 4))).events)
        .damage,
    ).toBe(6);
    const grunt = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), shield: 2 },
        ENEMY,
      ],
      { factions: ["DWARF", "MARTIAN"] },
    );
    expect(
      bombed(
        bombRun(grunt, bombV7(grunt, at(5, 2), at(5, 3), at(5, 4))).events,
      ),
    ).toMatchObject({ damage: 5, shieldDamage: 2, killed: false });
  });

  it("ignores Field Defense and destroys none; kills with cause BOMB and credit to the Gyrocopter", () => {
    const state = fieldDefenseV7(
      dwarfFieldV7([
        { seat: 0, role: "RAIDER", at: at(2, 5) },
        { seat: 1, role: "FIGHTER", at: at(2, 7), hp: 5 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      at(2, 7),
    );
    const gyro = unitAtV7(state, at(2, 5));
    const target = unitAtV7(state, at(2, 7));
    const result = bombRun(state, bombV7(state, at(2, 5), at(2, 7), at(1, 8)));
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: target.id,
      cause: "BOMB",
    });
    expect(tileV7(result.state, at(2, 7)).fieldDefense).toBe(true);
    expect(unitAtV7(result.state, at(1, 8))).toMatchObject({
      id: gyro.id,
      kills: 1,
    });
    // A killed unit leaves the bombed list.
    expect(result.state.bombedThisTurn).toEqual([]);
  });

  it("puts a killed exploding target's blast on the Gyrocopter beside it", () => {
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 1, role: "CATAPULT", at: at(5, 3), hp: 3 },
        ENEMY,
      ],
      { factions: ["DWARF", "GOBLIN"] },
    );
    const gyro = unitAtV7(state, at(5, 2));
    const result = bombRun(state, bombV7(state, at(5, 2), at(5, 3), at(5, 4)));
    const blast = result.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    if (blast?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
    expect(blast.results.map((entry) => entry.unitId)).toContain(gyro.id);
  });

  it("self-launches on water and may land on a Rift", () => {
    const wet = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        ENEMY,
      ],
      { water: [at(5, 4)] },
    );
    const launched = bombRun(wet, bombV7(wet, at(5, 2), at(5, 3), at(5, 4)));
    expect(kindsV7(launched.events)).toContain("UNIT_EMBARKED");
    expect(unitAtV7(launched.state, at(5, 4)).form).toBe("EMBARKED");
    let rift = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ENEMY,
    ]);
    for (const where of [at(4, 4), at(5, 4), at(6, 4)])
      rift = patchTileV7(rift, where, { terrain: "RIFT" });
    const landed = bombRun(rift, bombV7(rift, at(5, 2), at(5, 3), at(5, 4)));
    expect(unitAtV7(landed.state, at(5, 4)).form).toBe("LAND");
  });

  it("refuses each legality row with its code and reason", () => {
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 0, role: "RAIDER", at: at(3, 2) },
        { seat: 0, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(8, 2) },
        ENEMY,
      ],
      { factions: ["DWARF", "ICE_FOLK"] },
    );
    const gyro = unitAtV7(state, at(5, 2));
    const target = unitAtV7(state, at(5, 4));
    // Row 2: only a Gyrocopter bombs.
    expect(
      refusalV7(state, bombV7(state, at(4, 1), at(5, 4), at(4, 5))),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "FIGHTER" } });
    // Row 3: it has not moved.
    const moved = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === gyro.id
          ? { ...unit, activation: { ...unit.activation, moved: true } }
          : unit,
      ),
    });
    expect(
      refusalV7(moved, bombV7(moved, at(5, 2), at(5, 4), at(4, 5))).code,
    ).toBe("UNIT_ALREADY_ACTED");
    // Row 4: afloat.
    const afloat = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        ENEMY,
      ],
      { water: [at(5, 2)] },
    );
    expect(
      refusalV7(afloat, bombV7(afloat, at(5, 2), at(5, 4), at(4, 5))),
    ).toEqual({ code: "BOMB_RUN_NOT_LEGAL", params: { reason: "EMBARKED" } });
    // Row 5: Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen Gyrocopter
    // neither moves nor bombs (the old `SLUGGISH` reason is gone).
    const sluggish = checkedV7({
      ...state,
      frozen: [{ unitId: gyro.id, turnsLeft: 1 }],
    });
    expect(
      refusalV7(sluggish, bombV7(sluggish, at(5, 2), at(5, 4), at(4, 5))),
    ).toEqual({ code: "UNIT_FROZEN", params: { unitId: gyro.id } });
    expect(offeredOfV7(sluggish, at(5, 2), "MOVE")).toEqual([]);
    // Rows 6 and 7: a target, hostile.
    expect(
      refusalV7(state, {
        kind: "BOMB_RUN",
        unitId: gyro.id,
        targetUnitId: 999 as never,
        to: at(4, 5),
      }).code,
    ).toBe("TARGET_NOT_FOUND");
    expect(
      refusalV7(state, bombV7(state, at(5, 2), at(4, 1), at(3, 0))).code,
    ).toBe("TARGET_ALLIED");
    // Row 8: range 2.
    expect(
      refusalV7(state, bombV7(state, at(5, 2), at(8, 2), at(9, 2))),
    ).toEqual({
      code: "BOMB_RUN_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    // Row 10: the landing: its own tile or a tile its Move could end on
    // (free, explored), and no chest (the Gyrocopter pass,
    // `pulp_wars-w49.44`: the target no longer limits it).
    const landing = {
      code: "BOMB_RUN_NOT_LEGAL",
      params: { reason: "LANDING" },
    };
    // 4 from the start; an own unit; an enemy unit (3 from the start).
    for (const to of [at(5, 6), at(4, 1), at(8, 2)])
      expect(
        refusalV7(state, bombV7(state, at(5, 2), at(5, 4), to)),
        JSON.stringify(to),
      ).toEqual(landing);
    const hidden = unexploreV7(state, 0, [at(4, 3)]);
    expect(
      refusalV7(hidden, bombV7(hidden, at(5, 2), at(5, 4), at(4, 3))),
    ).toEqual(landing);
    const chest = checkedV7({ ...state, treasureChests: [at(4, 5)] });
    expect(
      refusalV7(chest, bombV7(chest, at(5, 2), at(5, 4), at(4, 5))),
    ).toEqual(landing);
    // Row 9: once per target per turn across all the seat's Gyrocopters.
    const first = bombRun(state, bombV7(state, at(5, 2), at(5, 4), at(4, 5)));
    expect(
      refusalV7(first.state, bombV7(first.state, at(3, 2), at(5, 4), at(6, 5))),
    ).toEqual({
      code: "BOMB_RUN_NOT_LEGAL",
      params: { reason: "ALREADY_BOMBED" },
    });
    // The list is emptied at the End Turn of the active player.
    const ended = applyCommandV7(first.state, activeIdV7(state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(ended.state.bombedThisTurn).toEqual([]);
    void target;
  });

  it("never offers or accepts ATTACK for a Gyrocopter, which still retaliates at range 1", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ENEMY,
    ]);
    const gyro = unitAtV7(state, at(5, 2));
    const fighter = unitAtV7(state, at(5, 3));
    expect(offeredOfV7(state, at(5, 2), "ATTACK")).toEqual([]);
    expect(
      refusalV7(state, {
        kind: "ATTACK",
        unitId: gyro.id,
        targetUnitId: fighter.id,
      }).code,
    ).toBe("UNIT_ROLE_INVALID");
    const enemyTurn = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
    });
    const result = playV7(enemyTurn, {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: gyro.id,
    });
    const combat = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(combat.preview.damageToAttacker).toBeGreaterThan(0);
  });

  it("threatens every tile within 2 of a visible Gyrocopter and gives the landing threat", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(3, 6) },
      ENEMY,
    ]);
    const enemyView = viewForV7(state, seatIdV7(state, 1));
    const gyro = unitAtV7(state, at(5, 2));
    // Every tile within Chebyshev 2 of the Gyrocopter (one bomb, no reply).
    const threatened = queryThreatenedTilesV7(enemyView, gyro.id);
    const ring: { x: number; y: number }[] = [];
    for (let y = 0; y <= 4; y += 1)
      for (let x = 3; x <= 7; x += 1)
        if (x !== 5 || y !== 2) ring.push(at(x, y));
    expect([...threatened].sort((l, r) => l.y - r.y || l.x - r.x)).toEqual(
      ring,
    );
    const preview = previewBombRunV7(
      viewForV7(state, activeIdV7(state)),
      bombV7(state, at(5, 2), at(5, 4), at(4, 5)),
    );
    expect(preview?.landingThreat).toBeGreaterThan(0);
    const offered = queryPlayerCommandsV7(viewForV7(state, activeIdV7(state)));
    for (const command of offered)
      if (command.kind === "BOMB_RUN")
        expect(applyCommandV7(state, activeIdV7(state), command).accepted).toBe(
          true,
        );
  });
});
