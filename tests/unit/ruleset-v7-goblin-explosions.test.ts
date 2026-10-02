import { describe, expect, it } from "vitest";
import { publicThreatenedTilesForPolicyV7 } from "../../src/ai/v7";
import {
  appendReplayCommandV7,
  applyCommandV7,
  arePlayersAlliedV7,
  arePlayersHostileV7,
  blastAreaV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  defenseBonusForUnitV7,
  effectiveRoleRuleV7,
  explosionChainMaxExplosionsV7,
  fortificationLevelForUnitV7,
  parseEventV7,
  parsePlayerEventEnvelopeV7,
  previewAttackExplosionsV7,
  previewKaboomV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  recomputeLiveEconomyV7,
  resolveExplosionChainV7,
  runReplayV7,
  technologyCapabilitiesV7,
  viewForV7,
  type BlastUnitV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type ExplosionPreviewV7,
  type ExplosionPreviewTotalsV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerId,
  type TileStateV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  goblinArenaV7,
  goblinSetupV7,
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Revision 17 (`pulp_wars-0ao.3`) explosions: Kaboom, death blasts, chain
// reactions, the Bomb Chucker's friendly-fire bomb, blast Plunder, Undead
// interactions, events and projection, the Kaboom and attack-explosion
// previews, Kaboom threat reach, and the END_TURN naval blockade recompute
// (docs/product/RULESET_7_REVISION_17_GOBLINS.md sections 6, 7.4, 8, 9, 12,
// and the 0ao.3 row of section 13).
//
// `pulp_wars-0ao.7` tuned the Goblin's Kaboom (4 -> 5), the death blasts
// (Bomb Chucker 3 -> 2, Rocket Cart and Scrap Buggy 5 -> 4), and the Goblin
// seat's starting Goblins (two -> one); the scenarios below use victim HP
// that keeps each scenario's outcome (who dies, who survives) under the
// tuned damages.
//
// Two-seat arena: seat 0 capital (8, 8), seat 1 capital (2, 8), villages
// (5, 5), (8, 5), (5, 8). Three-seat arena: capitals (2, 2), (11, 11),
// (11, 2); villages (8, 2), (8, 5), (11, 5), (5, 8).

const at = (x: number, y: number): CoordV7 => ({ x, y });

describe("ruleset-7 Goblin Kaboom legality", () => {
  const pieces: GoblinPieceV7[] = [
    { seat: 0, role: "FIGHTER", at: at(4, 2) },
    { seat: 0, role: "CATAPULT", at: at(1, 1) },
    { seat: 0, role: "GUARD", at: at(8, 2) },
    { seat: 0, role: "CAPTAIN", at: at(9, 2) },
    { seat: 0, role: "JUGGERNAUT", at: at(9, 3) },
    {
      seat: 0,
      role: "FIGHTER",
      at: at(6, 3),
      activation: { attacked: true, attacksUsed: 1 },
    },
    { seat: 0, role: "FIGHTER", at: at(0, 5), form: "EMBARKED" },
    { seat: 0, role: "PATROL_BOAT", at: at(0, 6), form: "NAVAL" },
    { seat: 0, role: "RAIDER", at: at(2, 4) },
    { seat: 0, role: "MARKSMAN", at: at(7, 0) },
    { seat: 0, role: "KNIGHT", at: at(10, 0) },
    { seat: 1, role: "FIGHTER", at: at(3, 6) },
  ];
  const arena = () =>
    goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces, {
      water: [at(0, 5), at(0, 6)],
    });

  it("is offered exactly for unacted goblin-crewed land units, with no target needed", () => {
    const state = arena();
    const offered = queryPlayerCommandsV7(state, state.humanPlayerId).filter(
      (command) => command.kind === "KABOOM",
    );
    expect(offered).toEqual(
      [at(4, 2), at(1, 1), at(2, 4), at(7, 0), at(10, 0)]
        .map((where) => unitAtV7(state, where).id)
        .sort((left, right) => left - right)
        .map((unitId) => ({ kind: "KABOOM", unitId })),
    );
    // A lone Goblin blows up with nobody in its blast area.
    const lone = unitAtV7(state, at(4, 2));
    const result = kaboom(state, at(4, 2));
    expect(result.state.units.some((unit) => unit.id === lone.id)).toBe(false);
    expect(core(result.events)).toEqual([
      { kind: "UNIT_DIED", unitId: lone.id, cause: "KABOOM" },
      {
        kind: "EXPLOSION_RESOLVED",
        playerId: state.humanPlayerId,
        unitId: lone.id,
        role: "FIGHTER",
        at: at(4, 2),
        cause: "KABOOM",
        wave: 1,
        damage: 5,
        results: [],
      },
    ]);
    for (const event of result.events)
      expect(parseEventV7(event)).toEqual({ ok: true, value: event });
    expect(result.state.commandIndex).toBe(state.commandIndex + 1);
  });

  it("is allowed after a Move, including the Rocket Cart that cannot then attack", () => {
    const state = arena();
    const cart = unitAtV7(state, at(1, 1));
    const move = queryPlayerCommandsV7(state, state.humanPlayerId).find(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" && command.unitId === cart.id,
    );
    if (move === undefined) throw new Error("Rocket Cart move missing");
    const moved = applyOkV7(state, state.humanPlayerId, move).state;
    const offered = queryPlayerCommandsV7(moved, moved.humanPlayerId).filter(
      (command) => "unitId" in command && command.unitId === cart.id,
    );
    expect(offered.map((command) => command.kind)).toContain("KABOOM");
    expect(offered.map((command) => command.kind)).not.toContain("ATTACK");
    const result = applyOkV7(moved, moved.humanPlayerId, {
      kind: "KABOOM",
      unitId: cart.id,
    });
    expect(explosionsOf(result.events)).toMatchObject([
      { unitId: cart.id, cause: "KABOOM", damage: 5, wave: 1 },
    ]);
  });

  it("rejects atomically with the existing unit errors and KABOOM_NOT_LEGAL", () => {
    const state = arena();
    const actor = state.humanPlayerId;
    const reject = (unitId: number) => {
      const result = applyCommandV7(state, actor, {
        kind: "KABOOM",
        unitId: unitId as UnitId,
      });
      if (result.accepted) throw new Error("Kaboom accepted");
      expect(result.state).toBe(state);
      expect(result.events).toEqual([]);
      return result.error;
    };
    for (const [where, role] of [
      [at(8, 2), "GUARD"],
      [at(9, 2), "CAPTAIN"],
      [at(9, 3), "JUGGERNAUT"],
      [at(0, 6), "PATROL_BOAT"],
    ] as const)
      expect(reject(unitAtV7(state, where).id)).toEqual({
        code: "UNIT_ROLE_INVALID",
        params: { role },
      });
    const acted = unitAtV7(state, at(6, 3)).id;
    expect(reject(acted)).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: acted },
    });
    expect(reject(unitAtV7(state, at(0, 5)).id)).toEqual({
      code: "KABOOM_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    const enemy = unitAtV7(state, at(3, 6)).id;
    expect(reject(enemy)).toEqual({
      code: "UNIT_NOT_OWNED",
      params: { unitId: enemy },
    });
    expect(reject(9_999)).toEqual({
      code: "UNIT_NOT_FOUND",
      params: { unitId: 9_999 },
    });
  });

  it("rejects every Human and Undead role", () => {
    for (const faction of ["ORIGINAL", "UNDEAD"] as const) {
      const roles: UnitRoleIdV7[] = [
        "FIGHTER",
        "RAIDER",
        "MARKSMAN",
        "CATAPULT",
        "KNIGHT",
      ];
      const state = goblinArenaV7(
        ["GOBLIN", faction],
        roles.map((role, index) => ({ seat: 1, role, at: at(index * 2, 1) })),
        { activeSeat: 1 },
      );
      const actor = seatIdV7(state, 1);
      expect(
        queryPlayerCommandsV7(state, actor).some(
          (command) => command.kind === "KABOOM",
        ),
      ).toBe(false);
      for (const [index, role] of roles.entries())
        expect(
          applyCommandV7(state, actor, {
            kind: "KABOOM",
            unitId: unitAtV7(state, at(index * 2, 1)).id,
          }),
        ).toMatchObject({
          accepted: false,
          error: { code: "UNIT_ROLE_INVALID", params: { role } },
        });
    }
  });

  it("lets a Plagued or Bitten unit Kaboom", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
        { seat: 1, role: "CATAPULT", at: at(1, 6) },
        { seat: 1, role: "GUARD", at: at(3, 6) },
      ],
    );
    const state = checkedV7({
      ...base,
      plagued: [
        {
          unitId: unitAtV7(base, at(4, 2)).id,
          sourceUnitId: unitAtV7(base, at(1, 6)).id,
          turnsRemaining: 3,
        },
      ],
      bitten: [
        {
          unitId: unitAtV7(base, at(8, 2)).id,
          biterPlayerId: seatIdV7(base, 1),
          biterUnitId: unitAtV7(base, at(3, 6)).id,
        },
      ],
    });
    const offered = queryPlayerCommandsV7(state, state.humanPlayerId);
    for (const where of [at(4, 2), at(8, 2)]) {
      expect(offered).toContainEqual({
        kind: "KABOOM",
        unitId: unitAtV7(state, where).id,
      });
      expect(offered).not.toContainEqual({
        kind: "DISBAND",
        unitId: unitAtV7(state, where).id,
      });
      expect(kaboom(state, where).state.units).not.toContainEqual(
        expect.objectContaining({ id: unitAtV7(state, where).id }),
      );
    }
  });
});

describe("ruleset-7 Goblin blast resolution", () => {
  it("hits the 3×3 area clipped to the board, sorted by (y, x, id)", () => {
    expect(blastAreaV7(at(0, 0), 11, 11)).toEqual([
      at(0, 0),
      at(1, 0),
      at(0, 1),
      at(1, 1),
    ]);
    expect(blastAreaV7(at(10, 5), 11, 11)).toEqual([
      at(9, 4),
      at(10, 4),
      at(9, 5),
      at(10, 5),
      at(9, 6),
      at(10, 6),
    ]);
    expect(blastAreaV7(at(4, 4), 11, 11)).toHaveLength(9);
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(0, 0) },
        { seat: 0, role: "FIGHTER", at: at(1, 1) },
        { seat: 1, role: "FIGHTER", at: at(0, 1) },
        { seat: 1, role: "FIGHTER", at: at(1, 0) },
        { seat: 1, role: "FIGHTER", at: at(2, 0) },
        { seat: 1, role: "FIGHTER", at: at(0, 2) },
      ],
    );
    const [explosion] = explosionsOf(kaboom(state, at(0, 0)).events);
    expect(explosion?.results).toEqual(
      [at(1, 0), at(0, 1), at(1, 1)].map((where) => ({
        unitId: unitAtV7(state, where).id,
        at: where,
        damage: 5,
        dies: false,
        shieldDamage: 0,
      })),
    );
  });

  it("deals fixed damage ignoring Defense, cover, fortification, and the embarked Defense", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(2, 7) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
        { seat: 1, role: "GUARD", at: at(3, 7) },
        { seat: 1, role: "FIGHTER", at: at(1, 6), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(3, 8), hp: 3 },
      ],
      { water: [at(1, 6)] },
    );
    const state = withTiles(base, (tile) =>
      sameV7(tile.at, at(2, 8))
        ? { ...tile, fieldDefense: true }
        : sameV7(tile.at, at(3, 7))
          ? { ...tile, terrain: "FOREST" }
          : tile,
    );
    expect(
      fortificationLevelForUnitV7(state, unitAtV7(state, at(2, 8))),
    ).toBeGreaterThan(0);
    expect(defenseBonusForUnitV7(state, unitAtV7(state, at(3, 7)))).toEqual({
      numerator: 3,
      denominator: 2,
    });
    const [explosion] = explosionsOf(kaboom(state, at(2, 7)).events);
    expect(
      explosion?.results.map((entry) => [entry.at, entry.damage, entry.dies]),
    ).toEqual([
      [at(1, 6), 5, false],
      [at(3, 7), 5, false],
      [at(2, 8), 5, false],
      [at(3, 8), 3, true],
    ]);
  });

  it("hits own, allied, hostile, naval, and embarked units but never the exploder", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "GOBLIN", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: at(5, 5) },
        { seat: 1, role: "GUARD", at: at(4, 4) },
        { seat: 2, role: "FIGHTER", at: at(5, 4) },
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 0, role: "GUARD", at: at(4, 5) },
        { seat: 0, role: "PATROL_BOAT", at: at(4, 6), form: "NAVAL" },
        { seat: 2, role: "FIGHTER", at: at(6, 6), form: "EMBARKED" },
      ],
      { aiMode: "COOPERATIVE", activeSeat: 1, water: [at(4, 6), at(6, 6)] },
    );
    const actor = seatIdV7(state, 1);
    const exploder = unitAtV7(state, at(5, 5));
    const preview = previewKaboomV7(state, actor, exploder.id);
    const result = applyOkV7(state, actor, {
      kind: "KABOOM",
      unitId: exploder.id,
    });
    const [explosion] = explosionsOf(result.events);
    const victims = [
      at(4, 4),
      at(5, 4),
      at(6, 4),
      at(4, 5),
      at(4, 6),
      at(6, 6),
    ].map((where) => unitAtV7(state, where));
    expect(explosion?.results.map((entry) => entry.unitId)).toEqual(
      victims.map((unit) => unit.id),
    );
    expect(explosion?.results.every((entry) => entry.damage === 5)).toBe(true);
    expect(explosion?.results.map((entry) => entry.unitId)).not.toContain(
      exploder.id,
    );
    // Friendly is own or allied (seat 2 is a cooperative ally of seat 1).
    expect(
      preview?.explosions[0]?.results.map((entry) => entry.friendly),
    ).toEqual([true, true, false, false, false, true]);
    expect(preview?.totals).toEqual({
      hostileDamage: 15,
      hostileKills: 0,
      friendlyDamage: 15,
      friendlyKills: 0,
      plunderCoins: 0,
    });
    expect(preview?.friendlyFire).toBe(true);
    expect(preview?.touchesUnexplored).toBe(false);
  });

  it("destroys Field Defense on all nine tiles (reason EXPLOSION) and bomb splash destroys none", () => {
    const area = blastAreaV7(at(4, 2), 11, 11);
    const base = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
    );
    const state = withTiles(base, (tile) =>
      area.some((where) => sameV7(where, tile.at)) || sameV7(tile.at, at(6, 2))
        ? { ...tile, fieldDefense: true }
        : tile,
    );
    const result = kaboom(state, at(4, 2));
    const start = result.events.findIndex(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    expect(result.events.slice(start + 1, start + 10)).toEqual(
      area.map((where) => ({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: where,
        reason: "EXPLOSION",
      })),
    );
    for (const where of area)
      expect(tileAt(result.state, where).fieldDefense).toBe(false);
    expect(tileAt(result.state, at(6, 2)).fieldDefense).toBe(true);

    const bombBase = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(1, 2) },
        { seat: 1, role: "GUARD", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
    );
    const ring = blastAreaV7(at(3, 2), 11, 11);
    const bombState = withTiles(bombBase, (tile) =>
      ring.some((where) => sameV7(where, tile.at))
        ? { ...tile, fieldDefense: true }
        : tile,
    );
    const bomb = attack(bombState, at(1, 2), at(3, 2));
    expect(combatOf(bomb.events).splash).toHaveLength(1);
    expect(
      bomb.events.filter((event) => event.kind === "FIELD_DEFENSE_DESTROYED"),
    ).toEqual([]);
    for (const where of ring)
      expect(tileAt(bomb.state, where).fieldDefense).toBe(true);
  });
});

describe("ruleset-7 Goblin death blasts", () => {
  it("explodes a Bomb Chucker killed by an attack, hitting the advancing attacker on its tile", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(5, 2), hp: 1 },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 2 },
      ],
      { activeSeat: 1 },
    );
    const chucker = unitAtV7(state, at(5, 2));
    const fighter = unitAtV7(state, at(4, 2));
    const goblinId = seatIdV7(state, 0);
    const coins = coinsOf(state, goblinId);
    const result = attack(state, at(4, 2), at(5, 2));
    expect(core(result.events).map((event) => event.kind)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_MOVED",
      "EXPLOSION_RESOLVED",
      "UNIT_DIED",
      "PLUNDER_AWARDED",
    ]);
    expect(core(result.events).slice(1)).toEqual([
      { kind: "UNIT_DIED", unitId: chucker.id, cause: "ATTACK" },
      { kind: "UNIT_MOVED", unitId: fighter.id, path: [at(5, 2)] },
      {
        kind: "EXPLOSION_RESOLVED",
        playerId: goblinId,
        unitId: chucker.id,
        role: "MARKSMAN",
        at: at(5, 2),
        cause: "DEATH",
        wave: 1,
        damage: 2,
        results: [
          {
            unitId: fighter.id,
            at: at(5, 2),
            damage: 2,
            dies: true,
            shieldDamage: 0,
          },
          {
            unitId: unitAtV7(state, at(6, 2)).id,
            at: at(6, 2),
            damage: 2,
            dies: false,
            shieldDamage: 0,
          },
        ],
      },
      { kind: "UNIT_DIED", unitId: fighter.id, cause: "EXPLOSION" },
      // Blast Plunder is credited to the exploding unit's owner, although an
      // enemy killed it (and during the enemy's turn).
      { kind: "PLUNDER_AWARDED", playerId: goblinId, kills: 1, coins: 1 },
    ]);
    expect(coinsOf(result.state, goblinId)).toBe(coins + 1);
  });

  it("explodes a Scrap Buggy killed by retaliation", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(4, 2), hp: 1 },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
    );
    const buggy = unitAtV7(state, at(4, 2));
    const result = attack(state, at(4, 2), at(5, 2));
    expect(combatOf(result.events).attackerDies).toBe(true);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: buggy.id,
      cause: "RETALIATION",
    });
    expect(explosionsOf(result.events)).toMatchObject([
      {
        unitId: buggy.id,
        at: at(4, 2),
        cause: "DEATH",
        damage: 4,
        results: [{ unitId: unitAtV7(state, at(5, 2)).id, damage: 4 }],
      },
    ]);
  });

  it("explodes exploding units killed by Battleship, Lich, and Bomb Chucker splash", () => {
    const cases: readonly {
      readonly factions: readonly FactionIdV7[];
      readonly shooter: GoblinPieceV7;
      readonly activeSeat: number;
      readonly water: readonly CoordV7[];
    }[] = [
      {
        factions: ["GOBLIN", "ORIGINAL"],
        shooter: { seat: 1, role: "BATTLESHIP", at: at(1, 2), form: "NAVAL" },
        activeSeat: 1,
        water: [at(1, 2)],
      },
      {
        factions: ["GOBLIN", "UNDEAD"],
        shooter: { seat: 1, role: "CATAPULT", at: at(1, 2) },
        activeSeat: 1,
        water: [],
      },
      {
        factions: ["GOBLIN", "ORIGINAL"],
        shooter: { seat: 0, role: "MARKSMAN", at: at(1, 2) },
        activeSeat: 0,
        water: [],
      },
    ];
    for (const { factions, shooter, activeSeat, water } of cases) {
      const targetSeat = activeSeat === 0 ? 1 : 0;
      const state = goblinArenaV7(
        factions,
        [
          shooter,
          { seat: targetSeat, role: "GUARD", at: at(3, 2) },
          { seat: 0, role: "CATAPULT", at: at(4, 2), hp: 1 },
        ],
        { activeSeat, water },
      );
      const cart = unitAtV7(state, at(4, 2));
      const result = attack(state, at(1, 2), at(3, 2));
      expect(result.events).toContainEqual({
        kind: "UNIT_DIED",
        unitId: cart.id,
        cause: "SPLASH",
      });
      expect(explosionsOf(result.events)).toMatchObject([
        { unitId: cart.id, cause: "DEATH", damage: 4, wave: 1 },
      ]);
    }
  });

  it("explodes a Bomb Chucker killed by Wail", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 1, role: "MARKSMAN", at: at(3, 2) },
        { seat: 0, role: "MARKSMAN", at: at(4, 2), hp: 1 },
      ],
      { activeSeat: 1 },
    );
    const banshee = unitAtV7(state, at(3, 2));
    const chucker = unitAtV7(state, at(4, 2));
    const result = applyOkV7(state, seatIdV7(state, 1), {
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(core(result.events).map((event) => event.kind)).toEqual([
      "WAIL_RESOLVED",
      "UNIT_DIED",
      "GRAVE_CREATED",
      "EXPLOSION_RESOLVED",
    ]);
    expect(explosionsOf(result.events)).toMatchObject([
      {
        unitId: chucker.id,
        cause: "DEATH",
        damage: 2,
        results: [{ unitId: banshee.id, damage: 2, dies: false }],
      },
    ]);
  });

  it("explodes a Kaboom unit exactly once and never on Disband or elimination", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "GOBLIN"],
      [
        { seat: 0, role: "CATAPULT", at: at(4, 2) },
        { seat: 0, role: "MARKSMAN", at: at(8, 2) },
        { seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true },
        { seat: 1, role: "MARKSMAN", at: at(3, 2), hp: 1 },
        { seat: 1, role: "KNIGHT", at: at(5, 4) },
      ],
    );
    const cart = unitAtV7(state, at(4, 2));
    const once = kaboom(state, at(4, 2));
    expect(
      explosionsOf(once.events).filter((event) => event.unitId === cart.id),
    ).toMatchObject([{ cause: "KABOOM", damage: 5 }]);

    const disbanded = applyOkV7(state, state.humanPlayerId, {
      kind: "DISBAND",
      unitId: unitAtV7(state, at(8, 2)).id,
    });
    expect(explosionsOf(disbanded.events)).toEqual([]);

    // Capturing seat 1's only city eliminates it; its exploding units are
    // removed (cause ELIMINATION), not killed.
    const captured = applyOkV7(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(2, 8)).id,
    });
    expect(captured.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, at(3, 2)).id,
      cause: "ELIMINATION",
    });
    expect(explosionsOf(captured.events)).toEqual([]);
  });

  it("never death-blasts a Goblin or Wolf Rider", () => {
    for (const role of ["FIGHTER", "RAIDER"] as const) {
      const state = goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role, at: at(5, 2), hp: 1 },
          { seat: 1, role: "GUARD", at: at(4, 2) },
        ],
        { activeSeat: 1 },
      );
      const result = attack(state, at(4, 2), at(5, 2));
      expect(combatOf(result.events).defenderDies).toBe(true);
      expect(explosionsOf(result.events)).toEqual([]);
    }
  });
});

describe("ruleset-7 Goblin chain reactions", () => {
  it("resolves ten Rocket Carts in a row wave by wave", () => {
    const row = Array.from({ length: 10 }, (_, x) => at(x, 1));
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      row.map((where) => ({ seat: 0, role: "CATAPULT", at: where, hp: 4 })),
    );
    const ids = row.map((where) => unitAtV7(state, where).id);
    const result = kaboom(state, at(0, 1));
    const explosions = explosionsOf(result.events);
    expect(
      explosions.map((event) => [event.unitId, event.cause, event.wave]),
    ).toEqual(
      ids.map((unitId, index) => [
        unitId,
        index === 0 ? "KABOOM" : "DEATH",
        index + 1,
      ]),
    );
    for (const [index, event] of explosions.entries())
      expect(event.results).toEqual(
        index === ids.length - 1
          ? []
          : [
              {
                unitId: ids[index + 1],
                at: row[index + 1],
                damage: 4,
                dies: true,
                shieldDamage: 0,
              },
            ],
      );
    expect(
      result.state.units.filter((unit) => unit.ownerId === state.humanPlayerId),
    ).toEqual([]);
    expect(10).toBeLessThanOrEqual(
      explosionChainMaxExplosionsV7(state.units.length - 1, 1),
    );
  });

  it("resolves a wave one explosion at a time in unit-ID order against current HP", () => {
    // B (lower ID) stands after A in (y, x) order; both die in wave 1.
    const state = goblinArenaV7(
      ["GOBLIN", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(6, 4), hp: 4 },
        { seat: 1, role: "MARKSMAN", at: at(4, 4), hp: 4 },
        { seat: 1, role: "GUARD", at: at(5, 4), hp: 9 },
        { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 2 },
      ],
    );
    const [exploder, chuckerB, chuckerA, brute, goblin] = [
      at(5, 3),
      at(6, 4),
      at(4, 4),
      at(5, 4),
      at(5, 5),
    ].map((where) => unitAtV7(state, where).id);
    const result = kaboom(state, at(5, 3));
    expect(
      explosionsOf(result.events).map((event) => ({
        unitId: event.unitId,
        wave: event.wave,
        results: event.results.map((entry) => [
          entry.unitId,
          entry.damage,
          entry.dies,
        ]),
      })),
    ).toEqual([
      {
        unitId: exploder,
        wave: 1,
        results: [
          [chuckerA, 4, true],
          [brute, 5, false],
          [chuckerB, 4, true],
        ],
      },
      // Wave 2 in ascending unit ID: B first, then A against current HP; the
      // Goblin killed by B is not hit again by A.
      {
        unitId: chuckerB,
        wave: 2,
        results: [
          [brute, 2, false],
          [goblin, 2, true],
        ],
      },
      { unitId: chuckerA, wave: 2, results: [[brute, 2, true]] },
    ]);
    // Deaths follow each explosion's event in its results order.
    expect(
      result.events
        .filter(
          (event) =>
            event.kind === "EXPLOSION_RESOLVED" || event.kind === "UNIT_DIED",
        )
        .map((event) =>
          event.kind === "UNIT_DIED"
            ? `${event.cause}:${event.unitId}`
            : `X:${event.unitId}`,
        ),
    ).toEqual([
      `KABOOM:${exploder}`,
      `X:${exploder}`,
      `EXPLOSION:${chuckerA}`,
      `EXPLOSION:${chuckerB}`,
      `X:${chuckerB}`,
      `EXPLOSION:${goblin}`,
      `X:${chuckerA}`,
      `EXPLOSION:${brute}`,
    ]);
  });

  it("asserts the explosion-count bound and is deterministic", () => {
    const roster = goblinArenaV7(["GOBLIN", "ORIGINAL"], []);
    const owner = roster.humanPlayerId;
    const cart = (id: number, x: number): BlastUnitV7 => ({
      id: id as UnitId,
      ownerId: owner,
      role: "CATAPULT",
      form: "LAND",
      at: at(x, 0),
      hp: 4,
    });
    const input = {
      roster,
      width: 11,
      height: 11,
      units: [cart(2, 1), cart(3, 2), cart(4, 3)],
      initial: [{ unit: cart(1, 0), cause: "KABOOM" as const }],
      fieldDefense: () => false,
      onDeath: () => null,
    };
    const full = resolveExplosionChainV7(input);
    expect(full.explosions).toHaveLength(4);
    expect(resolveExplosionChainV7(input)).toEqual(full);
    expect(explosionChainMaxExplosionsV7(3, 1)).toBe(4);
    expect(() =>
      resolveExplosionChainV7({ ...input, maxExplosions: 3 }),
    ).toThrow(new RangeError("INVALID_STATE"));
  });
});

describe("ruleset-7 Goblin chains and attacks", () => {
  it("evaluates Overrun after the chain, in resolution and the public preview", () => {
    for (const [goblinHp, continues] of [
      [2, false],
      [6, true],
    ] as const) {
      const state = goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 1, role: "KNIGHT", at: at(3, 2) },
          { seat: 0, role: "MARKSMAN", at: at(4, 2), hp: 1 },
          { seat: 0, role: "FIGHTER", at: at(5, 2), hp: goblinHp },
        ],
        { activeSeat: 1 },
      );
      const knight = unitAtV7(state, at(3, 2));
      const expected = publicCombat(state, at(3, 2), at(4, 2));
      const result = attack(state, at(3, 2), at(4, 2));
      const resolved = combatOf(result.events);
      expect(resolved).toMatchObject({
        advances: true,
        overrunAdvance: true,
        overrunContinues: continues,
        attacksRemaining: continues ? 1 : 0,
      });
      expect(expected).toEqual(resolved);
      const after = result.state.units.find((unit) => unit.id === knight.id);
      expect(after).toMatchObject({
        at: at(4, 2),
        hp: knight.hp - 2,
        activation: { overrunActive: continues },
      });
    }
  });

  it("ends Ram when the chain kills the Scrap Buggy, which then explodes", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "GOBLIN"],
      [
        { seat: 0, role: "KNIGHT", at: at(3, 2), hp: 2 },
        { seat: 1, role: "MARKSMAN", at: at(4, 2), hp: 1 },
        { seat: 1, role: "GUARD", at: at(6, 2) },
      ],
    );
    const buggy = unitAtV7(state, at(3, 2));
    const chucker = unitAtV7(state, at(4, 2));
    const expected = publicCombat(state, at(3, 2), at(4, 2));
    const result = attack(state, at(3, 2), at(4, 2));
    expect(combatOf(result.events)).toMatchObject({
      overrunAdvance: true,
      overrunContinues: false,
      attacksRemaining: 0,
    });
    expect(expected).toEqual(combatOf(result.events));
    expect(
      explosionsOf(result.events).map((event) => [
        event.unitId,
        event.wave,
        event.at,
        event.damage,
      ]),
    ).toEqual([
      [chucker.id, 1, at(4, 2), 2],
      [buggy.id, 2, at(4, 2), 4],
    ]);
  });

  it("hits a Zombie and its Infect rising on the Bomb Chucker's tile", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 1, role: "GUARD", at: at(3, 2) },
        { seat: 0, role: "MARKSMAN", at: at(4, 2), hp: 1 },
      ],
      { activeSeat: 1 },
    );
    const zombie = unitAtV7(state, at(3, 2));
    const result = attack(state, at(3, 2), at(4, 2));
    const rising = result.events.find(
      (event) => event.kind === "UNIT_INFECTED",
    );
    if (rising?.kind !== "UNIT_INFECTED") throw new Error("no rising");
    expect(rising.at).toEqual(at(4, 2));
    expect(explosionsOf(result.events)).toMatchObject([
      {
        results: [
          { unitId: zombie.id, at: at(3, 2), damage: 2 },
          { unitId: rising.unitId, at: at(4, 2), damage: 2 },
        ],
      },
    ]);
    expect(
      result.state.units.find((unit) => unit.id === rising.unitId)?.hp,
    ).toBe(8);
  });
});

describe("ruleset-7 Goblin bomb friendly fire and blast Plunder", () => {
  it("splashes own units without promotion credit or Plunder", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 2) },
        { seat: 1, role: "GUARD", at: at(4, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
        { seat: 0, role: "GUARD", at: at(3, 1) },
      ],
    );
    const chucker = unitAtV7(state, at(2, 2));
    const expected = publicCombat(state, at(2, 2), at(4, 2));
    const result = attack(state, at(2, 2), at(4, 2));
    const preview = combatOf(result.events);
    expect(preview).toEqual(expected);
    expect(preview.defenderDies).toBe(false);
    expect(preview.splash.map((entry) => [entry.at, entry.dies])).toEqual([
      [at(3, 1), false],
      [at(5, 2), true],
      [at(4, 3), true],
    ]);
    expect(
      result.state.units.find((unit) => unit.id === chucker.id)?.kills,
    ).toBe(1);
    expect(plunderOf(result.events)).toEqual([
      {
        kind: "PLUNDER_AWARDED",
        playerId: state.humanPlayerId,
        kills: 1,
        coins: 1,
      },
    ]);
  });

  it("splashes allied units without promotion credit or Plunder", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "GOBLIN", "ORIGINAL"],
      [
        { seat: 1, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "GUARD", at: at(6, 4) },
        { seat: 2, role: "FIGHTER", at: at(7, 4), hp: 1 },
        { seat: 0, role: "FIGHTER", at: at(6, 5), hp: 1 },
      ],
      { aiMode: "COOPERATIVE", activeSeat: 1 },
    );
    const chucker = unitAtV7(state, at(4, 4));
    const result = attack(state, at(4, 4), at(6, 4));
    expect(
      combatOf(result.events).splash.map((entry) => [entry.at, entry.dies]),
    ).toEqual([
      [at(7, 4), true],
      [at(6, 5), true],
    ]);
    expect(
      result.state.units.find((unit) => unit.id === chucker.id)?.kills,
    ).toBe(1);
    expect(plunderOf(result.events)).toEqual([
      {
        kind: "PLUNDER_AWARDED",
        playerId: seatIdV7(state, 1),
        kills: 1,
        coins: 1,
      },
    ]);
  });

  it("credits Kaboom kills of hostile units only, and nothing for the Kaboom unit", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "GOBLIN", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: at(5, 5) },
        { seat: 1, role: "FIGHTER", at: at(4, 4), hp: 2 },
        { seat: 2, role: "FIGHTER", at: at(5, 4), hp: 2 },
        { seat: 0, role: "FIGHTER", at: at(6, 4), hp: 2 },
        { seat: 0, role: "FIGHTER", at: at(6, 5), hp: 2 },
      ],
      { aiMode: "COOPERATIVE", activeSeat: 1 },
    );
    const actor = seatIdV7(state, 1);
    const exploder = unitAtV7(state, at(5, 5));
    const preview = previewKaboomV7(state, actor, exploder.id);
    const result = applyOkV7(state, actor, {
      kind: "KABOOM",
      unitId: exploder.id,
    });
    expect(plunderOf(result.events)).toEqual([
      { kind: "PLUNDER_AWARDED", playerId: actor, kills: 2, coins: 2 },
    ]);
    expect(preview?.totals).toEqual({
      hostileDamage: 4,
      hostileKills: 2,
      friendlyDamage: 4,
      friendlyKills: 2,
      plunderCoins: 2,
    });
    const withoutPlunder = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) => tech !== "COMMERCE",
              ),
            }
          : player,
      ),
    });
    expect(
      technologyCapabilitiesV7(
        withoutPlunder.players.find((player) => player.id === actor)
          ?.researchedTechs ?? [],
        "GOBLIN",
      ).plunderCoins,
    ).toBe(0);
    expect(
      previewKaboomV7(withoutPlunder, actor, exploder.id)?.totals.plunderCoins,
    ).toBe(0);
    expect(
      plunderOf(
        applyOkV7(withoutPlunder, actor, {
          kind: "KABOOM",
          unitId: exploder.id,
        }).events,
      ),
    ).toEqual([]);
  });
});

describe("ruleset-7 Goblin explosions and Undead rules", () => {
  it("leaves Graves for KABOOM and EXPLOSION deaths, except on sites, water, or without an Undead seat", () => {
    const pieces: GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(3, 3), hp: 4 },
      { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 4 },
      { seat: 1, role: "FIGHTER", at: at(3, 5), hp: 4, form: "EMBARKED" },
    ];
    const undead = goblinArenaV7(["GOBLIN", "UNDEAD"], pieces, {
      water: [at(3, 5)],
    });
    const result = kaboom(undead, at(4, 4));
    expect(
      result.events.filter(
        (event) => event.kind === "UNIT_DIED" || event.kind === "GRAVE_CREATED",
      ),
    ).toEqual([
      {
        kind: "UNIT_DIED",
        unitId: unitAtV7(undead, at(4, 4)).id,
        cause: "KABOOM",
      },
      { kind: "GRAVE_CREATED", at: at(4, 4) },
      {
        kind: "UNIT_DIED",
        unitId: unitAtV7(undead, at(3, 3)).id,
        cause: "EXPLOSION",
      },
      { kind: "GRAVE_CREATED", at: at(3, 3) },
      {
        kind: "UNIT_DIED",
        unitId: unitAtV7(undead, at(3, 5)).id,
        cause: "EXPLOSION",
      },
      {
        kind: "UNIT_DIED",
        unitId: unitAtV7(undead, at(5, 5)).id,
        cause: "EXPLOSION",
      },
    ]);
    expect(result.state.graves).toEqual([at(3, 3), at(4, 4)]);

    const human = goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces, {
      water: [at(3, 5)],
    });
    const plain = kaboom(human, at(4, 4));
    expect(plain.events.some((event) => event.kind === "GRAVE_CREATED")).toBe(
      false,
    );
    expect(plain.state.graves).toEqual([]);
  });

  it("raises Bitten Kaboom and explosion victims, the Kaboom unit's rising first and hit", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 4 },
        { seat: 1, role: "GUARD", at: at(1, 6) },
      ],
    );
    const biter = unitAtV7(base, at(1, 6));
    const undeadId = seatIdV7(base, 1);
    const state = checkedV7({
      ...base,
      bitten: [at(4, 2), at(5, 2)].map((where) => ({
        unitId: unitAtV7(base, where).id,
        biterPlayerId: undeadId,
        biterUnitId: biter.id,
      })),
    });
    const exploder = unitAtV7(state, at(4, 2));
    const victim = unitAtV7(state, at(5, 2));
    const firstRising = state.nextEntityId as UnitId;
    const preview = previewKaboomV7(state, state.humanPlayerId, exploder.id);
    const result = kaboom(state, at(4, 2));
    expect(
      core(result.events).filter((event) => event.kind !== "TILES_REVEALED"),
    ).toEqual([
      { kind: "UNIT_DIED", unitId: exploder.id, cause: "KABOOM" },
      {
        kind: "BITTEN_UNIT_RISEN",
        playerId: undeadId,
        victimUnitId: exploder.id,
        unitId: firstRising,
        at: at(4, 2),
        homeCityId: biter.homeCityId,
      },
      {
        kind: "EXPLOSION_RESOLVED",
        playerId: state.humanPlayerId,
        unitId: exploder.id,
        role: "FIGHTER",
        at: at(4, 2),
        cause: "KABOOM",
        wave: 1,
        damage: 5,
        results: [
          {
            unitId: firstRising,
            at: at(4, 2),
            damage: 5,
            dies: false,
            shieldDamage: 0,
          },
          {
            unitId: victim.id,
            at: at(5, 2),
            damage: 4,
            dies: true,
            shieldDamage: 0,
          },
        ],
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "EXPLOSION" },
      {
        kind: "BITTEN_UNIT_RISEN",
        playerId: undeadId,
        victimUnitId: victim.id,
        unitId: firstRising + 1,
        at: at(5, 2),
        homeCityId: biter.homeCityId,
      },
    ]);
    // The preview names the not-yet-existing rising with a null unit ID.
    expect(preview?.explosions[0]?.results).toEqual([
      {
        unitId: null,
        ownerId: undeadId,
        at: at(4, 2),
        damage: 5,
        dies: false,
        friendly: false,
        shieldDamage: 0,
      },
      {
        unitId: victim.id,
        ownerId: state.humanPlayerId,
        at: at(5, 2),
        damage: 4,
        dies: true,
        friendly: true,
        shieldDamage: 0,
      },
    ]);
  });

  it("never infects or bites from explosions", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "GUARD", at: at(5, 2), hp: 3 },
        { seat: 0, role: "GUARD", at: at(3, 2) },
      ],
    );
    const result = kaboom(state, at(4, 2));
    expect(
      result.events.some(
        (event) =>
          event.kind === "UNIT_INFECTED" || event.kind === "BITTEN_UNIT_RISEN",
      ),
    ).toBe(false);
    expect(result.state.bitten).toEqual([]);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, at(5, 2)).id,
      cause: "EXPLOSION",
    });
  });

  it("clears Plague when a blast kills its Lich", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "CATAPULT", at: at(5, 2), hp: 4 },
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
      ],
    );
    const plaguedId = unitAtV7(base, at(8, 2)).id;
    const state = checkedV7({
      ...base,
      plagued: [
        {
          unitId: plaguedId,
          sourceUnitId: unitAtV7(base, at(5, 2)).id,
          turnsRemaining: 2,
        },
      ],
    });
    const result = kaboom(state, at(4, 2));
    expect(result.events.at(-1)).toEqual({
      kind: "PLAGUE_CLEARED",
      unitIds: [plaguedId],
    });
    expect(result.state.plagued).toEqual([]);
  });

  it("explodes Plague-killed exploders at Start Turn before healing, regeneration, and income", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 2), hp: 2 },
        { seat: 0, role: "JUGGERNAUT", at: at(3, 2), hp: 30 },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 2 },
        { seat: 1, role: "CATAPULT", at: at(9, 2) },
      ],
      { activeSeat: 1 },
    );
    const chucker = unitAtV7(base, at(4, 2));
    const troll = unitAtV7(base, at(3, 2));
    const skeleton = unitAtV7(base, at(5, 2));
    const state = checkedV7({
      ...base,
      plagued: [
        {
          unitId: chucker.id,
          sourceUnitId: unitAtV7(base, at(9, 2)).id,
          turnsRemaining: 3,
        },
      ],
    });
    const goblinId = seatIdV7(state, 0);
    const before = coinsOf(state, goblinId);
    const result = applyOkV7(state, seatIdV7(state, 1), { kind: "END_TURN" });
    const kinds = result.events.map((event) => event.kind);
    const index = (kind: DomainEventV7["kind"]) => kinds.indexOf(kind);
    expect(index("PLAGUE_DAMAGED")).toBeLessThan(index("EXPLOSION_RESOLVED"));
    expect(index("EXPLOSION_RESOLVED")).toBeLessThan(index("PLUNDER_AWARDED"));
    expect(index("PLUNDER_AWARDED")).toBeLessThan(index("UNITS_REGENERATED"));
    expect(index("UNITS_REGENERATED")).toBeLessThan(index("INCOME_AWARDED"));
    expect(explosionsOf(result.events)).toEqual([
      {
        kind: "EXPLOSION_RESOLVED",
        playerId: goblinId,
        unitId: chucker.id,
        role: "MARKSMAN",
        at: at(4, 2),
        cause: "DEATH",
        wave: 1,
        damage: 2,
        results: [
          {
            unitId: troll.id,
            at: at(3, 2),
            damage: 2,
            dies: false,
            shieldDamage: 0,
          },
          {
            unitId: skeleton.id,
            at: at(5, 2),
            damage: 2,
            dies: true,
            shieldDamage: 0,
          },
        ],
      },
    ]);
    expect(result.events).toContainEqual({
      kind: "UNITS_REGENERATED",
      playerId: goblinId,
      results: [{ unitId: troll.id, amount: 4, hpAfter: 32 }],
    });
    const income = result.events.find(
      (event) => event.kind === "INCOME_AWARDED",
    );
    if (income?.kind !== "INCOME_AWARDED") throw new Error("no income");
    // The Start Turn chain's Plunder counts this turn (read from state).
    expect(coinsOf(result.state, goblinId)).toBe(
      before + 1 + income.totalCoins,
    );
    expect(result.events).toContainEqual({
      kind: "TURN_STARTED",
      playerId: goblinId,
      coins: before + 1 + income.totalCoins,
    });
  });
});

describe("ruleset-7 Goblin explosion events and projection", () => {
  it("orders a Kaboom's events: death, Grave, chain, Plunder, reveals, tail", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
        { seat: 0, role: "CATAPULT", at: at(3, 3), hp: 2 },
      ],
    );
    const state = withTiles(base, (tile) =>
      sameV7(tile.at, at(4, 2)) ? { ...tile, fieldDefense: true } : tile,
    );
    const result = kaboom(state, at(4, 2));
    expect(core(result.events).map((event) => event.kind)).toEqual([
      "UNIT_DIED",
      "GRAVE_CREATED",
      "EXPLOSION_RESOLVED",
      "FIELD_DEFENSE_DESTROYED",
      "UNIT_DIED",
      "GRAVE_CREATED",
      "UNIT_DIED",
      "GRAVE_CREATED",
      "EXPLOSION_RESOLVED",
      "PLUNDER_AWARDED",
    ]);
  });

  it("projects EXPLOSION_RESOLVED like Wail, with hidden-source COMBAT_SPLASH_DAMAGE", () => {
    // Seat 0's Kaboom sets off its own Rocket Cart, whose blast reaches a
    // seat-1 Fighter that seat 0 has not explored.
    const base = goblinArenaV7(
      ["GOBLIN", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(3, 2) },
        { seat: 0, role: "CATAPULT", at: at(4, 2), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
    );
    const goblinId = seatIdV7(base, 0);
    const enemyId = seatIdV7(base, 1);
    const state = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === goblinId
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => where.x <= 4 || where.y >= 6,
              ),
            }
          : {
              ...player,
              explored: player.explored.filter(
                (where) => where.x >= 5 || where.y >= 6,
              ),
            },
      ),
    });
    const cart = unitAtV7(state, at(4, 2));
    const fighter = unitAtV7(state, at(5, 2));
    const preview = previewKaboomV7(
      state,
      goblinId,
      unitAtV7(state, at(3, 2)).id,
    );
    expect(preview?.touchesUnexplored).toBe(true);
    expect(
      preview?.explosions.flatMap((explosion) =>
        explosion.results.map((entry) => entry.unitId),
      ),
    ).not.toContain(fighter.id);
    const result = kaboom(state, at(3, 2));
    const canonical = explosionsOf(result.events);
    expect(canonical[1]?.results).toEqual([
      {
        unitId: fighter.id,
        at: at(5, 2),
        damage: 4,
        dies: false,
        shieldDamage: 0,
      },
    ]);
    const projectedFor = (viewer: PlayerId) => {
      const envelope = projectEventsV7(
        state,
        result.state,
        viewer,
        result.events,
      );
      expect(parsePlayerEventEnvelopeV7(envelope)).toEqual({
        ok: true,
        value: envelope,
      });
      return envelope.events;
    };
    // Seat 0 sees both exploders but not the hidden Fighter's entry.
    expect(
      projectedFor(goblinId).filter(
        (event) => event.kind === "EXPLOSION_RESOLVED",
      ),
    ).toEqual([canonical[0], { ...canonical[1], results: [] }]);
    // Seat 1 sees neither exploder but owns a victim.
    expect(
      projectedFor(enemyId).filter(
        (event) =>
          event.kind === "EXPLOSION_RESOLVED" ||
          event.kind === "COMBAT_SPLASH_DAMAGE",
      ),
    ).toEqual([
      {
        kind: "COMBAT_SPLASH_DAMAGE",
        splash: [
          {
            unitId: fighter.id,
            at: at(5, 2),
            damage: 4,
            dies: false,
            shieldDamage: 0,
          },
        ],
      },
    ]);
    expect(cart.id).toBe(canonical[1]?.unitId);
  });

  it("emits naval blockade events after a Kaboom kills a blockader", () => {
    const fixture = blockadeFixture(["GOBLIN", "ORIGINAL"], {
      blockader: { role: "PATROL_BOAT", hp: 4, form: "NAVAL" },
      extra: [{ seat: 0, role: "FIGHTER", at: at(9, 7) }],
    });
    const result = kaboom(fixture.state, at(9, 7));
    expect(result.events).toContainEqual({
      kind: "PORT_BLOCKADE_CHANGED",
      playerId: fixture.portOwnerId,
      cityId: fixture.cityId,
      at: fixture.portAt,
      activeBefore: false,
      activeAfter: true,
    });
  });

  it("reports a blockade lifted at the next seat's Start Turn in that END_TURN (Plague and a Plague-started chain)", () => {
    // Plague kills the blockader itself.
    const plagueOnly = blockadeFixture(["UNDEAD", "GOBLIN"], {
      blockader: { role: "PATROL_BOAT", hp: 2, form: "NAVAL" },
      plagued: "BLOCKADER",
      extra: [{ seat: 0, role: "CATAPULT", at: at(4, 2) }],
    });
    // Plague kills a Bomb Chucker whose blast kills the (unplagued) blockader.
    const chain = blockadeFixture(["UNDEAD", "GOBLIN"], {
      blockader: { role: "PATROL_BOAT", hp: 2, form: "NAVAL" },
      plagued: "EXTRA",
      extra: [
        { seat: 0, role: "CATAPULT", at: at(4, 2) },
        { seat: 1, role: "MARKSMAN", at: at(9, 7), hp: 2 },
      ],
    });
    for (const fixture of [plagueOnly, chain]) {
      const result = applyOkV7(fixture.state, fixture.portOwnerId, {
        kind: "END_TURN",
      });
      expect(result.events).toContainEqual({
        kind: "PORT_BLOCKADE_CHANGED",
        playerId: fixture.portOwnerId,
        cityId: fixture.cityId,
        at: fixture.portAt,
        activeBefore: false,
        activeAfter: true,
      });
      expect(
        result.state.units.some((unit) => sameV7(unit.at, fixture.portAt)),
      ).toBe(false);
    }
    expect(
      explosionsOf(
        applyOkV7(chain.state, chain.portOwnerId, { kind: "END_TURN" }).events,
      ),
    ).toHaveLength(1);
  });
});

describe("ruleset-7 Goblin explosion previews", () => {
  it("equal resolution over generated arenas with full visibility, including long chains", () => {
    let kabooms = 0;
    let attacks = 0;
    let longest = 0;
    for (let seed = 1; seed <= 90; seed += 1) {
      const state = generatedArenaV7(seed, false);
      const actor = state.turnOrder[state.activeSeatIndex] as PlayerId;
      const view = viewForV7(state, actor);
      for (const command of queryPlayerCommandsV7(view)) {
        if (command.kind === "KABOOM") {
          const preview = previewKaboomV7(view, command.unitId);
          if (preview === null) throw new Error("Kaboom preview missing");
          const result = applyOkV7(state, actor, command);
          expect(preview.touchesUnexplored).toBe(false);
          expectPreviewMatches(state, actor, result.events, preview, true);
          longest = Math.max(longest, preview.explosions.length);
          kabooms += 1;
        } else if (command.kind === "ATTACK") {
          const preview = previewAttackExplosionsV7(
            view,
            command.unitId,
            command.targetUnitId,
          );
          const combat = queryCombatPreviewV7(
            view,
            command.unitId,
            command.targetUnitId,
          );
          if (preview === null || combat === null)
            throw new Error("attack preview missing");
          const result = applyOkV7(state, actor, command);
          const resolved = combatOf(result.events);
          // The public Push state is fog-honest (detection coverage).
          expect(combat).toEqual(
            combat.push === "UNKNOWN_BEHIND_FOG"
              ? { ...resolved, push: "UNKNOWN_BEHIND_FOG" }
              : resolved,
          );
          expect(preview.touchesUnexplored).toBe(false);
          expectPreviewMatches(state, actor, result.events, preview, false);
          longest = Math.max(longest, preview.explosions.length);
          attacks += 1;
        }
      }
    }
    expect(kabooms).toBeGreaterThan(300);
    expect(attacks).toBeGreaterThan(300);
    expect(longest).toBeGreaterThanOrEqual(6);
  }, 600_000);

  it("never lists hidden units, sets touchesUnexplored exactly, and is exact without it", () => {
    let exact = 0;
    let flagged = 0;
    for (let seed = 1; seed <= 90; seed += 1) {
      const state = generatedArenaV7(seed, true);
      const actor = state.turnOrder[state.activeSeatIndex] as PlayerId;
      const view = viewForV7(state, actor);
      const visible = new Set(view.units.map((unit) => unit.id));
      const explored = new Set(
        view.board.tiles
          .filter((tile) => tile.explored)
          .map((tile) => `${tile.at.x},${tile.at.y}`),
      );
      for (const command of queryPlayerCommandsV7(view)) {
        if (command.kind !== "KABOOM" && command.kind !== "ATTACK") continue;
        const preview =
          command.kind === "ATTACK"
            ? previewAttackExplosionsV7(
                view,
                command.unitId,
                command.targetUnitId,
              )
            : previewKaboomV7(view, command.unitId);
        if (preview === null) throw new Error("preview missing");
        for (const explosion of preview.explosions) {
          expect(visible.has(explosion.unitId)).toBe(true);
          for (const entry of explosion.results)
            expect(entry.unitId === null || visible.has(entry.unitId)).toBe(
              true,
            );
        }
        const touches = preview.explosions.some((explosion) =>
          blastAreaV7(explosion.at, state.board.width, state.board.height).some(
            (where) => !explored.has(`${where.x},${where.y}`),
          ),
        );
        if (command.kind === "KABOOM") {
          expect(preview.touchesUnexplored).toBe(touches);
          // The first blast of a Kaboom is always inside explored ground.
          const first = preview.explosions[0];
          if (first === undefined) throw new Error("no first blast");
          expect(
            blastAreaV7(first.at, state.board.width, state.board.height).every(
              (where) => explored.has(`${where.x},${where.y}`),
            ),
          ).toBe(true);
        } else if (touches) expect(preview.touchesUnexplored).toBe(true);
        if (preview.touchesUnexplored) {
          flagged += 1;
          continue;
        }
        const result = applyOkV7(state, actor, command);
        expectPreviewMatches(
          state,
          actor,
          result.events,
          preview,
          command.kind === "KABOOM",
        );
        exact += 1;
      }
    }
    expect(exact).toBeGreaterThan(200);
    expect(flagged).toBeGreaterThan(10);
  }, 600_000);

  it("returns null for commands that are not offered and an empty chain for plain attacks", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 0, role: "GUARD", at: at(6, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
    );
    const actor = state.humanPlayerId;
    const goblin = unitAtV7(state, at(4, 2)).id;
    const enemy = unitAtV7(state, at(5, 2)).id;
    expect(previewKaboomV7(state, actor, unitAtV7(state, at(6, 2)).id)).toBe(
      null,
    );
    expect(previewKaboomV7(state, actor, enemy)).toBe(null);
    expect(previewAttackExplosionsV7(state, actor, enemy, goblin)).toBe(null);
    expect(previewAttackExplosionsV7(state, actor, goblin, enemy)).toEqual({
      attackerId: goblin,
      targetUnitId: enemy,
      explosions: [],
      totals: {
        hostileDamage: 0,
        hostileKills: 0,
        friendlyDamage: 0,
        friendlyKills: 0,
        plunderCoins: 0,
      },
      friendlyFire: false,
      touchesUnexplored: false,
    });
  });
});

describe("ruleset-7 Goblin Kaboom threat reach", () => {
  it("adds every tile within Chebyshev 1 of a reachable tile for goblin-crewed units only", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 1, role: "CATAPULT", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(8, 2) },
        { seat: 0, role: "CATAPULT", at: at(8, 6) },
      ],
    );
    const viewer = state.humanPlayerId;
    const view = viewForV7(state, viewer);
    const cart = unitAtV7(state, at(4, 2));
    const goblin = unitAtV7(state, at(8, 2));
    const has = (tiles: readonly CoordV7[], where: CoordV7) =>
      tiles.some((tile) => sameV7(tile, where));
    // The Rocket Cart cannot attack after moving, but may Kaboom: its own
    // tile and the tiles next to where it can move are threatened.
    const cartTiles = queryThreatenedTilesV7(state, cart.id, viewer);
    expect(has(cartTiles, at(4, 2))).toBe(true);
    expect(has(cartTiles, at(5, 3))).toBe(true);
    const policyCart = publicThreatenedTilesForPolicyV7(
      view,
      requireView(view, cart.id),
    );
    expect(has(policyCart, at(4, 2))).toBe(true);
    expect(has(policyCart, at(5, 3))).toBe(true);
    const goblinTiles = queryThreatenedTilesV7(state, goblin.id, viewer);
    expect(has(goblinTiles, at(8, 2))).toBe(true);
    // A Human Catapult keeps its revision-16 envelope (minimum range 2).
    const humanCart = unitAtV7(state, at(8, 6));
    expect(
      has(
        queryThreatenedTilesV7(state, humanCart.id, seatIdV7(state, 1)),
        at(8, 6),
      ),
    ).toBe(false);
    const enemyView = viewForV7(state, seatIdV7(state, 1));
    expect(
      has(
        publicThreatenedTilesForPolicyV7(
          enemyView,
          requireView(enemyView, humanCart.id),
        ),
        at(8, 6),
      ),
    ).toBe(false);
  });

  it("gives an embarked goblin-crewed unit no landing-then-Kaboom reach (pulp_wars-0ao.15)", () => {
    const water = [at(0, 0), at(0, 1), at(0, 2), at(1, 0)];
    const state = goblinArenaV7(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(0, 1), form: "EMBARKED" },
        { seat: 1, role: "CATAPULT", at: at(0, 2), form: "EMBARKED" },
      ],
      { water },
    );
    const goblin = unitAtV7(state, at(0, 1));
    const cart = unitAtV7(state, at(0, 2));
    // Landing ends the activation (revisions 6 and 16): the landed unit is
    // offered no Kaboom and the engine rejects one atomically.
    const goblinSeat = seatIdV7(state, 1);
    const landed = applyOkV7(
      { ...state, activeSeatIndex: state.turnOrder.indexOf(goblinSeat) },
      goblinSeat,
      { kind: "DISEMBARK", unitId: goblin.id, at: at(1, 1) },
    ).state;
    expect(queryPlayerCommandsV7(landed, goblinSeat)).not.toContainEqual({
      kind: "KABOOM",
      unitId: goblin.id,
    });
    const kaboom = applyCommandV7(landed, goblinSeat, {
      kind: "KABOOM",
      unitId: goblin.id,
    });
    expect(kaboom).toMatchObject({
      accepted: false,
      state: landed,
      events: [],
      error: { code: "UNIT_ALREADY_ACTED", params: { unitId: goblin.id } },
    });
    const viewer = state.humanPlayerId;
    const view = viewForV7(state, viewer);
    const has = (tiles: readonly CoordV7[], where: CoordV7) =>
      tiles.some((tile) => sameV7(tile, where));
    for (const unit of [goblin, cart]) {
      const tiles = queryThreatenedTilesV7(state, unit.id, viewer);
      // Revision 18: the Rocket Cart sails through the Goblin's transport to
      // (0, 0) or (1, 0), so its ordinary range-3 envelope now holds (4, 2);
      // (5, 5) stays out of every envelope.
      expect(has(tiles, at(4, 2))).toBe(unit === cart);
      expect(has(tiles, at(5, 5))).toBe(false);
      // The public query covers the Normal AI's reach model.
      for (const where of publicThreatenedTilesForPolicyV7(
        view,
        requireView(view, unit.id),
      ))
        expect(has(tiles, where)).toBe(true);
    }
    // The Goblin (range 1) keeps only the ordinary embarked envelope (its
    // attack range from the water cells it can reach), not the blast around
    // its landing cells (1, 1), (1, 2), and (2, 1) that 0ao.11 added.
    const goblinTiles = queryThreatenedTilesV7(state, goblin.id, viewer);
    for (const where of [at(2, 2), at(3, 2), at(2, 3), at(3, 1)])
      expect(has(goblinTiles, where)).toBe(false);
  });
});

describe("ruleset-7 Goblin explosion determinism", () => {
  it("replays a Kaboom of a starting Goblin to identical checkpoints", () => {
    const setup = goblinSetupV7(["GOBLIN", "GOBLIN"], 5);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error("create failed");
    const actor = created.state.turnOrder[
      created.state.activeSeatIndex
    ] as PlayerId;
    const goblins = created.state.units.filter(
      (unit) => unit.ownerId === actor,
    );
    expect(goblins).toHaveLength(1);
    const command: CommandV7 = {
      kind: "KABOOM",
      unitId: (goblins[0] as UnitStateV7).id,
    };
    const first = applyOkV7(created.state, actor, command);
    const second = applyOkV7(created.state, actor, command);
    expect(canonicalHash(first)).toBe(canonicalHash(second));
    expect(explosionsOf(first.events)).toHaveLength(1);
    const replay = appendReplayCommandV7(
      createReplayV7(setup),
      command,
      first.state,
    );
    const run = runReplayV7(replay);
    expect(run.stateHash).toBe(canonicalHash(first.state));
    expect(run.state).toEqual(first.state);
  });
});

// ---------------------------------------------------------------------------

/** The events without the achievement tail (arenas explore every tile). */
function core(events: readonly DomainEventV7[]): DomainEventV7[] {
  return events.filter((event) => event.kind !== "ACHIEVEMENT_UNLOCKED");
}

function kaboom(
  state: GameStateV7,
  where: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const unit = unitAtV7(state, where);
  return applyOkV7(state, unit.ownerId, { kind: "KABOOM", unitId: unit.id });
}

function attack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const attacker = unitAtV7(state, from);
  return applyOkV7(state, attacker.ownerId, {
    kind: "ATTACK",
    unitId: attacker.id,
    targetUnitId: unitAtV7(state, to).id,
  });
}

function publicCombat(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): CombatPreviewV7 | null {
  const attacker = unitAtV7(state, from);
  return queryCombatPreviewV7(
    state,
    attacker.ownerId,
    attacker.id,
    unitAtV7(state, to).id,
  );
}

function combatOf(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events.find(
    (candidate) => candidate.kind === "COMBAT_RESOLVED",
  );
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

type ExplosionEventV7 = Extract<DomainEventV7, { kind: "EXPLOSION_RESOLVED" }>;

function explosionsOf(events: readonly DomainEventV7[]): ExplosionEventV7[] {
  return events.filter(
    (event): event is ExplosionEventV7 => event.kind === "EXPLOSION_RESOLVED",
  );
}

function plunderOf(events: readonly DomainEventV7[]) {
  return events.filter((event) => event.kind === "PLUNDER_AWARDED");
}

function coinsOf(state: GameStateV7, playerId: PlayerId): number {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new Error("player missing");
  return player.coins;
}

function tileAt(state: GameStateV7, where: CoordV7): TileStateV7 {
  const tile = state.board.tiles[where.y * state.board.width + where.x];
  if (tile === undefined) throw new Error("tile missing");
  return tile;
}

function withTiles(
  state: GameStateV7,
  update: (tile: TileStateV7) => TileStateV7,
): GameStateV7 {
  return checkedV7({
    ...state,
    board: { ...state.board, tiles: state.board.tiles.map(update) },
  });
}

function requireView(
  view: ReturnType<typeof viewForV7>,
  unitId: UnitId,
): ReturnType<typeof viewForV7>["units"][number] {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) throw new Error("unit not visible");
  return unit;
}

/**
 * A seat-0 Port on water (9, 8) next to the seat-0 capital (8, 8), built by
 * the ordinary command and then blockaded by `blockader` of seat 1.
 */
function blockadeFixture(
  factions: readonly FactionIdV7[],
  options: {
    readonly blockader: {
      readonly role: UnitRoleIdV7;
      readonly hp: number;
      readonly form: UnitStateV7["form"];
    };
    readonly extra: readonly GoblinPieceV7[];
    readonly plagued?: "BLOCKADER" | "EXTRA";
  },
): {
  readonly state: GameStateV7;
  readonly portOwnerId: PlayerId;
  readonly cityId: GameStateV7["cities"][number]["id"];
  readonly portAt: CoordV7;
} {
  const portAt = at(9, 8);
  const base = goblinArenaV7(factions, [...options.extra], {
    water: [portAt, at(10, 8), at(10, 9)],
  });
  const ownerId = seatIdV7(base, 0);
  const built = applyOkV7(base, ownerId, { kind: "BUILD_PORT", at: portAt });
  const blockaderId = built.state.nextEntityId as UnitId;
  const blockader: UnitStateV7 = {
    ...(built.state.units[0] as UnitStateV7),
    id: blockaderId,
    ownerId: seatIdV7(base, 1),
    homeCityId: null,
    at: portAt,
    hp: options.blockader.hp,
    maxHp: 10,
    kills: 0,
    veteran: false,
    captureEligible: false,
    form: options.blockader.form,
    role: options.blockader.role,
  };
  const lich = built.state.units.find(
    (unit) =>
      unit.role === "CATAPULT" &&
      built.state.players.find((player) => player.id === unit.ownerId)
        ?.faction === "UNDEAD",
  );
  const plaguedUnit =
    options.plagued === "BLOCKADER"
      ? blockaderId
      : options.plagued === "EXTRA"
        ? built.state.units.find((unit) => unit.ownerId === blockader.ownerId)
            ?.id
        : undefined;
  const units = [...built.state.units, blockader];
  // A blockade changes the Port's live economy.
  const economy = recomputeLiveEconomyV7(
    built.state,
    { board: built.state.board, cities: built.state.cities, units },
    built.state.populationContributions,
  );
  const state = checkedV7({
    ...built.state,
    nextEntityId: built.state.nextEntityId + 1,
    units,
    cities: economy.cities,
    populationContributions: economy.populationContributions,
    plagued:
      plaguedUnit === undefined || lich === undefined
        ? []
        : [{ unitId: plaguedUnit, sourceUnitId: lich.id, turnsRemaining: 3 }],
  });
  const city = state.cities.find((candidate) => candidate.ownerId === ownerId);
  if (city === undefined) throw new Error("port city missing");
  if (options.plagued !== undefined && state.plagued.length !== 1)
    throw new Error("plague fixture missing");
  return { state, portOwnerId: ownerId, cityId: city.id, portAt };
}

/**
 * A deterministic generated arena for preview properties: a Goblin active
 * seat against a Goblin, Human, or Undead seat, with many low-HP exploding
 * units (so chains run long), Field Defense, water with boats and embarked
 * units, and (against Undead) Bitten units. With `fog`, the active seat has
 * explored only the cells within Chebyshev 1 of its units (plus a random
 * extra patch), which every real game guarantees at least.
 */
function generatedArenaV7(seed: number, fog: boolean): GameStateV7 {
  let random = seed * 2_654_435_761;
  const next = (bound: number): number => {
    random = (Math.imul(random, 1_103_515_245) + 12_345) >>> 0;
    return (random >>> 8) % bound;
  };
  const opponent: FactionIdV7 = (["GOBLIN", "ORIGINAL", "UNDEAD"] as const)[
    seed % 3
  ] as FactionIdV7;
  const occupied = new Set<string>();
  const water: CoordV7[] = [];
  for (let index = 0; index < 3; index += 1) water.push(at(next(11), next(5)));
  const pieces: GoblinPieceV7[] = [];
  const goblinRoles: UnitRoleIdV7[] = [
    "FIGHTER",
    "RAIDER",
    "MARKSMAN",
    "MARKSMAN",
    "CATAPULT",
    "CATAPULT",
    "KNIGHT",
    "KNIGHT",
    "GUARD",
    "JUGGERNAUT",
  ];
  const otherRoles: UnitRoleIdV7[] = [
    "FIGHTER",
    "RAIDER",
    "GUARD",
    "CATAPULT",
    "KNIGHT",
    "MARKSMAN",
  ];
  const count = 10 + next(12);
  for (let index = 0; index < count; index += 1) {
    const where = at(next(11), next(5));
    const key = `${where.x},${where.y}`;
    if (occupied.has(key)) continue;
    occupied.add(key);
    const seat = next(2);
    const faction = seat === 0 ? "GOBLIN" : opponent;
    const onWater = water.some((cell) => sameV7(cell, where));
    const role: UnitRoleIdV7 = onWater
      ? next(2) === 0
        ? "PATROL_BOAT"
        : "FIGHTER"
      : faction === "GOBLIN"
        ? (goblinRoles[next(goblinRoles.length)] as UnitRoleIdV7)
        : (otherRoles[next(otherRoles.length)] as UnitRoleIdV7);
    const maxHp = effectiveRoleRuleV7(role, faction).maxHp;
    pieces.push({
      seat,
      role,
      at: where,
      hp: 1 + next(Math.min(maxHp, 7)),
      form: onWater ? (role === "PATROL_BOAT" ? "NAVAL" : "EMBARKED") : "LAND",
    });
  }
  const base = goblinArenaV7(["GOBLIN", opponent], pieces, {
    water: water.filter(
      (cell, index) =>
        water.findIndex((other) => sameV7(other, cell)) === index,
    ),
  });
  const withDefense = withTiles(base, (tile) =>
    tile.biome !== null && next(4) === 0
      ? { ...tile, fieldDefense: true }
      : tile,
  );
  const goblinId = seatIdV7(withDefense, 0);
  const undeadId = seatIdV7(withDefense, 1);
  const zombie = withDefense.units.find(
    (unit) => unit.ownerId === undeadId && unit.role === "GUARD",
  );
  const bitten =
    opponent === "UNDEAD" && zombie !== undefined
      ? withDefense.units
          .filter(
            (unit) =>
              unit.ownerId === goblinId &&
              unit.form === "LAND" &&
              next(3) === 0,
          )
          .map((unit) => ({
            unitId: unit.id,
            biterPlayerId: undeadId,
            biterUnitId: zombie.id,
          }))
      : [];
  const own = withDefense.units.filter((unit) => unit.ownerId === goblinId);
  const patch = at(next(11), next(5));
  return checkedV7({
    ...withDefense,
    bitten,
    players: withDefense.players.map((player) =>
      player.id === goblinId && fog
        ? {
            ...player,
            explored: player.explored.filter(
              (where) =>
                own.some(
                  (unit) =>
                    Math.max(
                      Math.abs(unit.at.x - where.x),
                      Math.abs(unit.at.y - where.y),
                    ) <= 1,
                ) ||
                Math.max(
                  Math.abs(patch.x - where.x),
                  Math.abs(patch.y - where.y),
                ) <= 2 ||
                where.y >= 6,
            ),
          }
        : player,
    ),
  });
}

/**
 * Compares a chain preview with the canonical chain events of a command:
 * each EXPLOSION_RESOLVED with its FIELD_DEFENSE_DESTROYED events, result
 * owners (risings from their rising events, reported as null), friendliness
 * relative to the actor, and the totals (Plunder from the actor's blasts).
 */
function expectPreviewMatches(
  state: GameStateV7,
  actor: PlayerId,
  events: readonly DomainEventV7[],
  preview: {
    readonly explosions: readonly ExplosionPreviewV7[];
    readonly totals: ExplosionPreviewTotalsV7;
    readonly friendlyFire: boolean;
  },
  kaboom: boolean,
): void {
  const owners = new Map<number, PlayerId>(
    state.units.map((unit) => [unit.id, unit.ownerId] as const),
  );
  for (const event of events)
    if (event.kind === "BITTEN_UNIT_RISEN" || event.kind === "UNIT_INFECTED")
      owners.set(event.unitId, event.playerId);
  const plunder = technologyCapabilitiesV7(
    state.players.find((player) => player.id === actor)?.researchedTechs ?? [],
    "GOBLIN",
  ).plunderCoins;
  const totals = {
    hostileDamage: 0,
    hostileKills: 0,
    friendlyDamage: 0,
    friendlyKills: 0,
    plunderCoins: 0,
  };
  const explosions: ExplosionPreviewV7[] = [];
  for (const [index, event] of events.entries()) {
    if (event.kind !== "EXPLOSION_RESOLVED") continue;
    const fieldDefenseDestroyed: CoordV7[] = [];
    for (const later of events.slice(index + 1)) {
      if (later.kind !== "FIELD_DEFENSE_DESTROYED") break;
      if (later.reason === "EXPLOSION") fieldDefenseDestroyed.push(later.at);
    }
    explosions.push({
      unitId: event.unitId,
      ownerId: event.playerId,
      role: event.role,
      at: event.at,
      cause: event.cause,
      wave: event.wave,
      damage: event.damage,
      fieldDefenseDestroyed,
      results: event.results.map((entry) => {
        const ownerId = owners.get(entry.unitId);
        if (ownerId === undefined) throw new Error("owner missing");
        const friendly =
          ownerId === actor || arePlayersAlliedV7(state, actor, ownerId);
        if (friendly) {
          totals.friendlyDamage += entry.damage;
          if (entry.dies) totals.friendlyKills += 1;
        } else if (arePlayersHostileV7(state, actor, ownerId)) {
          totals.hostileDamage += entry.damage;
          if (entry.dies) {
            totals.hostileKills += 1;
            if (event.playerId === actor) totals.plunderCoins += plunder;
          }
        }
        return {
          unitId: entry.unitId >= state.nextEntityId ? null : entry.unitId,
          ownerId,
          at: entry.at,
          damage: entry.damage,
          dies: entry.dies,
          friendly,
          shieldDamage: entry.shieldDamage,
        };
      }),
    });
  }
  expect(preview.explosions).toEqual(explosions);
  expect(preview.totals).toEqual(totals);
  expect(preview.friendlyFire).toBe(totals.friendlyDamage > 0);
  if (kaboom)
    expect(
      plunderOf(events)
        .filter((event) => event.playerId === actor)
        .reduce((sum, event) => sum + event.coins, 0),
    ).toBe(totals.plunderCoins);
}
