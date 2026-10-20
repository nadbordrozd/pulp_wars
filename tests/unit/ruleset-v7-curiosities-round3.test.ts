import { describe, expect, it } from "vitest";
import {
  EXPEDITION_COINS_V7,
  GOLD_CLAIM_COINS_V7,
  GOLD_CLAIM_TOTAL_V7,
  MOON_GUN_RANGE_V7,
  PROMOTION_KILLS_V7,
  TESLA_ZAP_DAMAGE_V7,
  TESLA_ZAP_RANGE_V7,
  applyCommandV7,
  parseGameStateV7,
  previewMoonGunV7,
  previewZapV7,
  projectEventsV7,
  prunedCuriositiesV7,
  queryCuriosityMoveEffectV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  resolveGoldClaimPayoutV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type CuriosityV7,
  type GameStateV7,
  type PlayerId,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  CLAIM_V7,
  EXPEDITION_V7,
  GUN_V7,
  P1,
  P2,
  P3,
  TOWER_V7,
  applyAcceptedV7,
  at,
  eventKindsV7,
  rejectionV7,
  round3ArenaV7,
  round3UnitAtV7,
} from "../fixtures/v7-round3-arena";

// Map curiosities round 3, bead A (`pulp_wars-737.20`,
// docs/product/RULESET_7_CURIOSITIES_ROUND_3.md sections 4 to 7, 9, 10,
// and 13): the Tesla Tower's ZAP, the Moon Gun's FIRE_MOON_GUN, the Gold
// Claim's stake and payout, and the Lost Expedition's notes, each on a
// small hand-built board (no match is played).

const zap = (
  state: GameStateV7,
  from: CoordV7,
  target: CoordV7,
): CommandV7 => ({
  kind: "ZAP",
  unitId: round3UnitAtV7(state, from).id,
  targetUnitId: round3UnitAtV7(state, target).id,
});
const fire = (state: GameStateV7, to: CoordV7, from = GUN_V7): CommandV7 => ({
  kind: "FIRE_MOON_GUN",
  unitId: round3UnitAtV7(state, from).id,
  at: to,
});
const offered = (state: GameStateV7, actor: PlayerId, kind: string) =>
  queryPlayerCommandsV7(state, actor).filter(
    (command) => command.kind === kind,
  );
const unitById = (state: GameStateV7, id: number): UnitStateV7 | undefined =>
  state.units.find((unit) => unit.id === id && unit.hp > 0);
const coinsOf = (state: GameStateV7, playerId: PlayerId): number =>
  state.players.find((player) => player.id === playerId)?.coins ?? -1;
const curiosityAt = (
  state: GameStateV7,
  tile: CoordV7,
): CuriosityV7 | undefined =>
  state.curiosities.find(
    (curiosity) => curiosity.at.x === tile.x && curiosity.at.y === tile.y,
  );

/** Ends player 1's and player 2's turns (player 2's wraps the round). */
function endRound(state: GameStateV7) {
  const first = applyAcceptedV7(state, P1, { kind: "END_TURN" });
  return applyAcceptedV7(first.state, P2, { kind: "END_TURN" });
}

describe("the Tesla Tower (section 4)", () => {
  const tower = (options: Parameters<typeof round3ArenaV7>[0] = {}) =>
    round3ArenaV7({ kinds: ["TESLA_TOWER"], ...options });

  it("checks legality in order: on the Tower, a primary action, a target in range", () => {
    const off = tower({
      pieces: [
        { seat: 0, role: "FIGHTER", at: at(9, 10) },
        { seat: 1, role: "FIGHTER", at: at(9, 11) },
      ],
    });
    expect(rejectionV7(off, P1, zap(off, at(9, 10), at(9, 11)))).toEqual({
      code: "ZAP_NOT_LEGAL",
      params: { reason: "NOT_ON_TOWER" },
    });
    const acted = tower({
      pieces: [
        {
          seat: 0,
          role: "FIGHTER",
          at: TOWER_V7,
          activation: { attacked: true, attacksUsed: 1 },
        },
        { seat: 1, role: "FIGHTER", at: at(9, 11) },
      ],
    });
    expect(rejectionV7(acted, P1, zap(acted, TOWER_V7, at(9, 11))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    // A Catapult may not act after its Move.
    const moved = tower({
      pieces: [
        {
          seat: 0,
          role: "CATAPULT",
          at: TOWER_V7,
          activation: { moved: true, movedPathLength: 1 },
        },
        { seat: 1, role: "FIGHTER", at: at(9, 11) },
      ],
    });
    expect(rejectionV7(moved, P1, zap(moved, TOWER_V7, at(9, 11))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    const far = tower({
      pieces: [
        { seat: 0, role: "FIGHTER", at: TOWER_V7 },
        { seat: 1, role: "FIGHTER", at: at(9, 12) },
        { seat: 0, role: "FIGHTER", at: at(10, 10) },
      ],
    });
    expect(rejectionV7(far, P1, zap(far, TOWER_V7, at(9, 12)))).toEqual({
      code: "ZAP_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    // An own unit is never a target.
    expect(rejectionV7(far, P1, zap(far, TOWER_V7, at(10, 10)))).toEqual({
      code: "ZAP_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    const foreign = tower({
      pieces: [
        { seat: 1, role: "FIGHTER", at: TOWER_V7 },
        { seat: 0, role: "FIGHTER", at: at(9, 11) },
      ],
    });
    expect(
      rejectionV7(foreign, P1, zap(foreign, TOWER_V7, at(9, 11))).code,
    ).toBe("UNIT_NOT_OWNED");
    // Offered exactly when legal: every hostile unit within 2, once each.
    const ready = tower({
      pieces: [
        { seat: 0, role: "FIGHTER", at: TOWER_V7 },
        { seat: 1, role: "FIGHTER", at: at(9, 11) },
        { seat: 1, role: "FIGHTER", at: at(11, 7) },
        { seat: 1, role: "FIGHTER", at: at(12, 9) },
      ],
    });
    const zaps = offered(ready, P1, "ZAP");
    expect(zaps).toHaveLength(2);
    for (const command of zaps)
      expect(applyCommandV7(ready, P1, command).accepted).toBe(true);
    for (const state of [off, acted, moved]) expect(offered(state, P1, "ZAP"));
    expect(offered(off, P1, "ZAP")).toEqual([]);
    expect(offered(acted, P1, "ZAP")).toEqual([]);
    expect(offered(moved, P1, "ZAP")).toEqual([]);
    expect(TESLA_ZAP_RANGE_V7).toBe(2);
  });

  it("deals a fixed 16, never answered, and spends the primary action", () => {
    // A Troll (40) 2 away, nothing next to it: the chain stops at once.
    const state = tower({
      pieces: [
        { seat: 0, role: "FIGHTER", at: TOWER_V7, hp: 3 },
        { seat: 1, role: "JUGGERNAUT", at: at(9, 11) },
      ],
    });
    const gunner = round3UnitAtV7(state, TOWER_V7);
    const target = round3UnitAtV7(state, at(9, 11));
    const result = applyAcceptedV7(state, P1, zap(state, TOWER_V7, at(9, 11)));
    expect(
      result.events.filter((event) => event.kind === "TESLA_ZAPPED"),
    ).toEqual([
      {
        kind: "TESLA_ZAPPED",
        playerId: P1,
        unitId: gunner.id,
        at: TOWER_V7,
        hop: 0,
        fromAt: TOWER_V7,
        targetUnitId: target.id,
        targetAt: at(9, 11),
        damage: TESLA_ZAP_DAMAGE_V7,
        shieldDamage: 0,
        hpAfter: target.hp - TESLA_ZAP_DAMAGE_V7,
      },
    ]);
    expect(TESLA_ZAP_DAMAGE_V7).toBe(16);
    // No neighbour, no draw: the match PRNG is untouched.
    expect(result.state.random).toEqual(state.random);
    expect(eventKindsV7(result.events)).not.toContain("COMBAT_RESOLVED");
    expect(unitById(result.state, gunner.id)?.hp).toBe(3);
    expect(unitById(result.state, target.id)?.hp).toBe(target.hp - 16);
    expect(unitById(result.state, gunner.id)?.activation.specialActed).toBe(
      true,
    );
    expect(offered(result.state, P1, "ZAP")).toEqual([]);
    expect(
      offered(result.state, P1, "ATTACK").filter(
        (command) => command.kind === "ATTACK" && command.unitId === gunner.id,
      ),
    ).toEqual([]);
  });

  it("applies the target's Shield, Armoured, Plated, and its Blizzard from 2", () => {
    const hitOf = (
      factions: readonly (
        "ORIGINAL" | "MARTIAN" | "DINOSAUR" | "DWARF" | "ICE_FOLK"
      )[],
      role: UnitStateV7["role"],
      targetAt: CoordV7,
      extra: Parameters<typeof round3ArenaV7>[0] = {},
      shield = 0,
    ) => {
      let state = tower({
        factions,
        ...extra,
        pieces: [
          { seat: 0, role: "FIGHTER", at: TOWER_V7 },
          { seat: 1, role, at: targetAt },
          ...(extra.pieces ?? []),
        ],
      });
      if (shield > 0)
        state = checkedV7({
          ...state,
          shields: [{ unitId: round3UnitAtV7(state, targetAt).id, shield }],
        });
      const preview = previewZapV7(
        viewForV7(state, P1),
        round3UnitAtV7(state, TOWER_V7).id,
      );
      const result = applyAcceptedV7(state, P1, zap(state, TOWER_V7, targetAt));
      const event = result.events[0];
      if (event?.kind !== "TESLA_ZAPPED") throw new Error("no zap");
      // The public preview is exact.
      const entry = preview?.targets.find(
        (candidate) => candidate.targetUnitId === event.targetUnitId,
      );
      expect(preview?.exact).toBe(true);
      expect(entry).toMatchObject({
        targetUnitId: event.targetUnitId,
        damage: event.damage,
        shieldDamage: event.shieldDamage,
        hpAfter: event.hpAfter,
        kills: event.hpAfter === 0,
      });
      return { damage: event.damage, shield: event.shieldDamage };
    };
    // The chain lightning (`pulp_wars-737.22`): the first hit is 16.
    // A Martian Grunt (8, Shield 2) loses its Shield and all 8 HP.
    expect(hitOf(["ORIGINAL", "MARTIAN"], "FIGHTER", at(9, 10), {}, 2)).toEqual(
      { damage: 8, shield: 2 },
    );
    // Armoured (the Ankylosaurus, 20) takes 15.
    expect(hitOf(["ORIGINAL", "DINOSAUR"], "GUARD", at(9, 10))).toEqual({
      damage: 15,
      shield: 0,
    });
    // Plated caps at 4: the Steam Tank (16) takes only 4.
    expect(hitOf(["ORIGINAL", "DWARF"], "SWORDSMAN", at(9, 10))).toEqual({
      damage: 4,
      shield: 0,
    });
    // An Ice Folk unit (9) in its own Witch's Blizzard halves a zap from 2.
    expect(
      hitOf(["ORIGINAL", "ICE_FOLK"], "FIGHTER", at(9, 11), {
        pieces: [{ seat: 1, role: "CAPTAIN", at: at(9, 12) }],
      }),
    ).toEqual({ damage: 8, shield: 0 });
    // From next to the Tower it does not (16, all its 9 HP).
    expect(
      hitOf(["ORIGINAL", "ICE_FOLK"], "FIGHTER", at(9, 10), {
        pieces: [{ seat: 1, role: "CAPTAIN", at: at(9, 11) }],
      }),
    ).toEqual({ damage: 9, shield: 0 });
  });

  it("credits the kill to the zapper: Promotion, Plunder, and growth", () => {
    // A Goblin seat with Plunder: a zap kill pays it.
    const goblin = round3ArenaV7({
      kinds: ["TESLA_TOWER"],
      factions: ["GOBLIN", "ORIGINAL"],
      pieces: [
        {
          seat: 0,
          role: "GUARD",
          at: TOWER_V7,
        },
        { seat: 1, role: "FIGHTER", at: at(9, 11), hp: 4 },
      ],
    });
    const killer = round3UnitAtV7(goblin, TOWER_V7);
    const killed = applyAcceptedV7(
      goblin,
      P1,
      zap(goblin, TOWER_V7, at(9, 11)),
    );
    expect(eventKindsV7(killed.events)).toEqual(
      expect.arrayContaining(["TESLA_ZAPPED", "UNIT_DIED", "PLUNDER_AWARDED"]),
    );
    expect(unitById(killed.state, killer.id)?.kills).toBe(1);
    const died = killed.events.find((event) => event.kind === "UNIT_DIED");
    expect(died?.kind === "UNIT_DIED" && died.cause).toBe("ATTACK");
    // Promotion: the third kill makes the zapper promotable.
    const veteran = checkedV7({
      ...goblin,
      units: goblin.units.map((unit) =>
        unit.id === killer.id
          ? { ...unit, kills: PROMOTION_KILLS_V7 - 1 }
          : unit,
      ),
    });
    const promoted = applyAcceptedV7(
      veteran,
      P1,
      zap(veteran, TOWER_V7, at(9, 11)),
    );
    expect(unitById(promoted.state, killer.id)?.kills).toBe(PROMOTION_KILLS_V7);
    // Growth: a Raptor's first kill grows it.
    const dino = round3ArenaV7({
      kinds: ["TESLA_TOWER"],
      factions: ["DINOSAUR", "ORIGINAL"],
      pieces: [
        { seat: 0, role: "RAIDER", at: TOWER_V7 },
        { seat: 1, role: "FIGHTER", at: at(10, 10), hp: 4 },
      ],
    });
    const raptor = round3UnitAtV7(dino, TOWER_V7);
    const grown = applyAcceptedV7(dino, P1, zap(dino, TOWER_V7, at(10, 10)));
    expect(eventKindsV7(grown.events)).toContain("UNIT_GREW");
    expect(unitById(grown.state, raptor.id)?.maxHp).toBeGreaterThan(
      raptor.maxHp,
    );
  });

  it("reaches a submerged Submarine only from next to the Tower", () => {
    const state = tower({
      pieces: [
        { seat: 0, role: "FIGHTER", at: TOWER_V7 },
        { seat: 1, role: "SUBMARINE", at: at(9, 7), form: "NAVAL" },
        { seat: 1, role: "SUBMARINE", at: at(10, 8), form: "NAVAL" },
      ],
      terrain: [
        { at: at(9, 7), terrain: "SHALLOW_WATER" },
        { at: at(10, 8), terrain: "SHALLOW_WATER" },
      ],
    });
    expect(rejectionV7(state, P1, zap(state, TOWER_V7, at(9, 7)))).toEqual({
      code: "ZAP_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    const near = round3UnitAtV7(state, at(10, 8));
    expect(
      offered(state, P1, "ZAP").map((command) =>
        command.kind === "ZAP" ? command.targetUnitId : null,
      ),
    ).toEqual([near.id]);
    // A ship takes the zap like any unit (all 16, up to its HP).
    const hit = applyAcceptedV7(state, P1, zap(state, TOWER_V7, at(10, 8)));
    expect(hit.events[0]).toMatchObject({
      kind: "TESLA_ZAPPED",
      damage: Math.min(TESLA_ZAP_DAMAGE_V7, near.hp),
    });
  });

  it("hurts a neutral unit: it provokes it, and a kill pays the bounty", () => {
    const state = tower({
      pieces: [{ seat: 0, role: "FIGHTER", at: TOWER_V7 }],
      neutrals: [{ breed: "GIANT_SPIDER", home: at(12, 10), at: at(11, 10) }],
    });
    const spider = round3UnitAtV7(state, at(11, 10));
    const hurt = applyAcceptedV7(state, P1, zap(state, TOWER_V7, at(11, 10)));
    const gunner = round3UnitAtV7(state, TOWER_V7);
    expect(
      hurt.state.monsters.find((entry) => entry.unitId === spider.id)
        ?.provokedBy,
    ).toEqual([gunner.id]);
    const weak = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === spider.id ? { ...unit, hp: 3 } : unit,
      ),
    });
    const slain = applyAcceptedV7(weak, P1, zap(weak, TOWER_V7, at(11, 10)));
    const bounty = slain.events.find(
      (event) => event.kind === "MONSTER_BOUNTY_AWARDED",
    );
    expect(bounty).toEqual({
      kind: "MONSTER_BOUNTY_AWARDED",
      playerId: P1,
      unitId: spider.id,
      coins: 10,
    });
  });

  it("is projected to every viewer that sees the zapper or the target", () => {
    const state = tower({
      factions: ["ORIGINAL", "GOBLIN", "DINOSAUR"],
      pieces: [
        { seat: 0, role: "FIGHTER", at: TOWER_V7 },
        { seat: 1, role: "GUARD", at: at(9, 10) },
      ],
      explored: { 2: [at(0, 0)] },
    });
    const result = applyAcceptedV7(state, P1, zap(state, TOWER_V7, at(9, 10)));
    const kindsFor = (viewer: PlayerId) =>
      projectEventsV7(state, result.state, viewer, result.events).events.map(
        (event) => event.kind,
      );
    expect(kindsFor(P2)).toContain("TESLA_ZAPPED");
    expect(kindsFor(P3)).not.toContain("TESLA_ZAPPED");
  });
});

describe("the Moon Gun (section 5)", () => {
  const gun = (options: Parameters<typeof round3ArenaV7>[0] = {}) =>
    round3ArenaV7({ kinds: ["MOON_GUN"], ...options });

  it("checks legality in order and offers exactly the legal landings", () => {
    const off = gun({ pieces: [{ seat: 0, role: "FIGHTER", at: at(4, 11) }] });
    expect(rejectionV7(off, P1, fire(off, at(6, 8), at(4, 11)))).toEqual({
      code: "MOON_GUN_NOT_LEGAL",
      params: { reason: "NOT_ON_GUN" },
    });
    const acted = gun({
      pieces: [
        {
          seat: 0,
          role: "FIGHTER",
          at: GUN_V7,
          activation: { attacked: true, attacksUsed: 1 },
        },
      ],
    });
    expect(rejectionV7(acted, P1, fire(acted, at(6, 8))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    const ready = gun({ pieces: [{ seat: 0, role: "FIGHTER", at: GUN_V7 }] });
    const reloading = checkedV7({
      ...ready,
      curiosities: ready.curiosities.map((curiosity) =>
        curiosity.kind === "MOON_GUN"
          ? { ...curiosity, lastFired: { round: ready.round, playerId: P1 } }
          : curiosity,
      ),
    });
    expect(rejectionV7(reloading, P1, fire(reloading, at(6, 8)))).toEqual({
      code: "MOON_GUN_NOT_LEGAL",
      params: { reason: "RELOADING" },
    });
    for (const to of [at(4, 10), at(10, 10), at(4, 16)])
      expect(rejectionV7(ready, P1, fire(ready, to))).toEqual({
        code: "MOON_GUN_NOT_LEGAL",
        params: { reason: "OUT_OF_RANGE" },
      });
    const fogged = gun({
      pieces: [{ seat: 0, role: "FIGHTER", at: GUN_V7 }],
      explored: { 0: [GUN_V7, at(5, 10), at(9, 15)] },
    });
    expect(rejectionV7(fogged, P1, fire(fogged, at(6, 8)))).toEqual({
      code: "MOON_GUN_NOT_LEGAL",
      params: { reason: "UNEXPLORED" },
    });
    // Water, a unit, a chest, a settlement centre, a curiosity, and a
    // Mountain without Engineering block a landing.
    const blocked = gun({
      kinds: ["MOON_GUN", "TESLA_TOWER"],
      pieces: [
        { seat: 0, role: "FIGHTER", at: GUN_V7 },
        { seat: 1, role: "FIGHTER", at: at(6, 12) },
      ],
      terrain: [
        { at: at(2, 8), terrain: "SHALLOW_WATER" },
        { at: at(6, 6), terrain: "MOUNTAIN" },
      ],
      techs: { 0: ["SCOUTING"] },
    });
    const withChest = checkedV7({ ...blocked, treasureChests: [at(1, 12)] });
    for (const to of [
      at(2, 8),
      at(6, 12),
      at(1, 12),
      at(9, 15),
      at(9, 9),
      at(6, 6),
    ])
      expect(
        rejectionV7(withChest, P1, fire(withChest, to)),
        `${to.x},${to.y}`,
      ).toEqual({
        code: "MOON_GUN_NOT_LEGAL",
        params: { reason: "BLOCKED" },
      });
    // With Engineering the Mountain is ground.
    const engineers = gun({
      pieces: [{ seat: 0, role: "FIGHTER", at: GUN_V7 }],
      terrain: [{ at: at(6, 6), terrain: "MOUNTAIN" }],
    });
    expect(
      applyCommandV7(engineers, P1, fire(engineers, at(6, 6))).accepted,
    ).toBe(true);
    // Offered exactly when legal, and the preview lists the same tiles.
    const fires = offered(withChest, P1, "FIRE_MOON_GUN");
    const preview = previewMoonGunV7(
      viewForV7(withChest, P1),
      round3UnitAtV7(withChest, GUN_V7).id,
    );
    expect(preview?.loaded).toBe(true);
    expect(preview?.targets).toEqual(
      fires.map((command) =>
        command.kind === "FIRE_MOON_GUN" ? command.at : null,
      ),
    );
    let legal = 0;
    for (let y = GUN_V7.y - 5; y <= GUN_V7.y + 5; y += 1)
      for (let x = GUN_V7.x - 5; x <= GUN_V7.x + 5; x += 1) {
        if (x < 0 || y < 0 || x >= 20 || y >= 20) continue;
        const accepted = applyCommandV7(
          withChest,
          P1,
          fire(withChest, at(x, y)),
        ).accepted;
        if (accepted) legal += 1;
        expect(
          fires.some(
            (command) =>
              command.kind === "FIRE_MOON_GUN" &&
              command.at.x === x &&
              command.at.y === y,
          ),
          `${x},${y}`,
        ).toBe(accepted);
      }
    expect(legal).toBe(fires.length);
    expect(MOON_GUN_RANGE_V7).toBe(5);
    expect(offered(off, P1, "FIRE_MOON_GUN")).toEqual([]);
    expect(offered(acted, P1, "FIRE_MOON_GUN")).toEqual([]);
    expect(offered(reloading, P1, "FIRE_MOON_GUN")).toEqual([]);
    expect(
      previewMoonGunV7(
        viewForV7(reloading, P1),
        round3UnitAtV7(reloading, GUN_V7).id,
      ),
    ).toEqual({
      unitId: round3UnitAtV7(reloading, GUN_V7).id,
      gun: GUN_V7,
      loaded: false,
      targets: [],
    });
  });

  it("places the unit, spends its activation, ignores zones of control, and reveals", () => {
    const state = gun({
      pieces: [
        { seat: 0, role: "KNIGHT", at: GUN_V7 },
        { seat: 1, role: "FIGHTER", at: at(9, 6) },
      ],
      explored: {
        0: [
          ...Array.from({ length: 11 }, (_, dy) =>
            Array.from({ length: 11 }, (__, dx) => at(dx, 5 + dy)),
          ).flat(),
        ],
      },
    });
    const knight = round3UnitAtV7(state, GUN_V7);
    const result = applyAcceptedV7(state, P1, fire(state, at(8, 5)));
    expect(result.events[0]).toEqual({
      kind: "MOON_GUN_FIRED",
      playerId: P1,
      unitId: knight.id,
      from: GUN_V7,
      to: at(8, 5),
    });
    expect(eventKindsV7(result.events)).toContain("TILES_REVEALED");
    expect(eventKindsV7(result.events)).not.toContain("UNIT_MOVED");
    const landed = unitById(result.state, knight.id);
    expect(landed?.at).toEqual(at(8, 5));
    // Next to an enemy, exhausted: no attack, capture, or action.
    expect(
      queryPlayerCommandsV7(result.state, P1).filter(
        (command) => "unitId" in command && command.unitId === knight.id,
      ),
    ).toEqual([]);
    expect(curiosityAt(result.state, GUN_V7)).toEqual({
      kind: "MOON_GUN",
      at: GUN_V7,
      lastFired: { round: state.round, playerId: P1 },
    });
  });

  it("fires once a player-turn: reloading for its firer, loaded for the next player", () => {
    const state = gun({
      pieces: [
        { seat: 0, role: "FIGHTER", at: GUN_V7 },
        { seat: 0, role: "FIGHTER", at: at(4, 11) },
      ],
    });
    const first = applyAcceptedV7(state, P1, fire(state, at(6, 8)));
    // The second fighter steps on and may not fire this turn.
    const stepped = applyAcceptedV7(first.state, P1, {
      kind: "MOVE",
      unitId: round3UnitAtV7(first.state, at(4, 11)).id,
      path: [GUN_V7],
    });
    expect(
      rejectionV7(stepped.state, P1, fire(stepped.state, at(2, 8))),
    ).toEqual({
      code: "MOON_GUN_NOT_LEGAL",
      params: { reason: "RELOADING" },
    });
    // Player 2's own turn of the same round: loaded for it.
    const p2 = gun({
      pieces: [{ seat: 1, role: "FIGHTER", at: GUN_V7 }],
    });
    const marked = checkedV7({
      ...p2,
      curiosities: p2.curiosities.map((curiosity) =>
        curiosity.kind === "MOON_GUN"
          ? { ...curiosity, lastFired: { round: p2.round, playerId: P1 } }
          : curiosity,
      ),
    });
    const handed = applyAcceptedV7(marked, P1, { kind: "END_TURN" });
    expect(
      applyCommandV7(handed.state, P2, {
        kind: "FIRE_MOON_GUN",
        unitId: round3UnitAtV7(handed.state, GUN_V7).id,
        at: at(6, 8),
      }).accepted,
    ).toBe(true);
  });

  it("lands on ice as ground and never sets off Black Ice", () => {
    const state = gun({
      factions: ["ORIGINAL", "ICE_FOLK"],
      pieces: [{ seat: 0, role: "FIGHTER", at: GUN_V7 }],
      terrain: [{ at: at(2, 8), terrain: "SHALLOW_WATER" }],
    });
    const iced = checkedV7({
      ...state,
      ice: [{ at: at(2, 8), ownerId: P2, cracked: false }],
    });
    const result = applyAcceptedV7(iced, P1, fire(iced, at(2, 8)));
    expect(eventKindsV7(result.events)).not.toContain("UNITS_FROZEN");
    expect(result.state.frozen).toEqual([]);
  });

  it("is projected to every viewer that explored the Gun or the landing", () => {
    const state = gun({
      factions: ["ORIGINAL", "GOBLIN", "DINOSAUR"],
      pieces: [{ seat: 0, role: "FIGHTER", at: GUN_V7 }],
      explored: { 2: [at(19, 19)] },
    });
    const result = applyAcceptedV7(state, P1, fire(state, at(6, 8)));
    const kindsFor = (viewer: PlayerId) =>
      projectEventsV7(state, result.state, viewer, result.events).events.map(
        (event) => event.kind,
      );
    expect(kindsFor(P2)).toContain("MOON_GUN_FIRED");
    expect(kindsFor(P3)).not.toContain("MOON_GUN_FIRED");
  });
});

describe("the Gold Claim (section 6)", () => {
  const claim = (options: Parameters<typeof round3ArenaV7>[0] = {}) =>
    round3ArenaV7({ kinds: ["GOLD_CLAIM"], ...options });
  const moveTo = (
    state: GameStateV7,
    actor: PlayerId,
    path: readonly CoordV7[],
  ) =>
    applyAcceptedV7(state, actor, {
      kind: "MOVE",
      unitId: round3UnitAtV7(state, path[0] as CoordV7).id,
      path: path.slice(1),
    });

  it("is staked by a Move that ends on it, after the Move's own event", () => {
    const state = claim({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(15, 11) }],
    });
    const fighter = round3UnitAtV7(state, at(15, 11));
    expect(
      queryCuriosityMoveEffectV7(viewForV7(state, P1), {
        kind: "MOVE",
        unitId: fighter.id,
        path: [CLAIM_V7],
      }),
    ).toBe("STAKE");
    const result = moveTo(state, P1, [at(15, 11), CLAIM_V7]);
    expect(eventKindsV7(result.events).slice(0, 2)).toEqual([
      "UNIT_MOVED",
      "GOLD_CLAIM_STAKED",
    ]);
    expect(result.events[1]).toEqual({
      kind: "GOLD_CLAIM_STAKED",
      playerId: P1,
      unitId: fighter.id,
      at: CLAIM_V7,
      previousOwnerId: null,
    });
    expect(curiosityAt(result.state, CLAIM_V7)).toEqual({
      kind: "GOLD_CLAIM",
      at: CLAIM_V7,
      ownerId: P1,
      left: GOLD_CLAIM_TOTAL_V7,
    });
    // Taken from its owner by another seat's Move.
    const rival = claim({
      pieces: [{ seat: 1, role: "FIGHTER", at: at(15, 9) }],
      curiosities: [],
    });
    const p1Owns = checkedV7({
      ...rival,
      curiosities: [
        { kind: "GOLD_CLAIM", at: CLAIM_V7, ownerId: P1, left: 20 },
      ],
    });
    const handed = applyAcceptedV7(p1Owns, P1, { kind: "END_TURN" });
    const taken = moveTo(handed.state, P2, [at(15, 9), CLAIM_V7]);
    expect(
      taken.events.find((event) => event.kind === "GOLD_CLAIM_STAKED"),
    ).toMatchObject({ playerId: P2, previousOwnerId: P1 });
    expect(curiosityAt(taken.state, CLAIM_V7)).toMatchObject({
      ownerId: P2,
      left: 20,
    });
  });

  it("is never staked by passing over it, by an ally, or when played out", () => {
    const pass = claim({
      pieces: [{ seat: 0, role: "RAIDER", at: at(15, 11) }],
    });
    const passed = moveTo(pass, P1, [at(15, 11), CLAIM_V7, at(15, 9)]);
    expect(eventKindsV7(passed.events)).not.toContain("GOLD_CLAIM_STAKED");
    expect(curiosityAt(passed.state, CLAIM_V7)).toMatchObject({
      ownerId: null,
    });
    // Allies (Cooperative mode: the AI seats) never take each other's Claim.
    const allied = claim({
      factions: ["ORIGINAL", "GOBLIN", "DINOSAUR"],
      aiMode: "COOPERATIVE",
      pieces: [{ seat: 2, role: "FIGHTER", at: at(15, 11) }],
      curiosities: [],
    });
    const owned = checkedV7({
      ...allied,
      curiosities: allied.curiosities.map((curiosity) =>
        curiosity.kind === "GOLD_CLAIM"
          ? { ...curiosity, ownerId: P2 }
          : curiosity,
      ),
      activeSeatIndex: 2,
    });
    const ally = applyAcceptedV7(owned, P3, {
      kind: "MOVE",
      unitId: round3UnitAtV7(owned, at(15, 11)).id,
      path: [CLAIM_V7],
    });
    expect(eventKindsV7(ally.events)).not.toContain("GOLD_CLAIM_STAKED");
    // A played-out Claim is scenery.
    const spent = checkedV7({
      ...pass,
      curiosities: [
        { kind: "GOLD_CLAIM", at: CLAIM_V7, ownerId: null, left: 0 },
      ],
    });
    const visited = moveTo(spent, P1, [at(15, 11), CLAIM_V7]);
    expect(eventKindsV7(visited.events)).not.toContain("GOLD_CLAIM_STAKED");
  });

  it("is never staked by a landing from the sea", () => {
    const state = claim({
      pieces: [
        {
          seat: 0,
          role: "FIGHTER",
          at: at(16, 10),
          form: "EMBARKED",
        },
      ],
      terrain: [{ at: at(16, 10), terrain: "SHALLOW_WATER" }],
    });
    const landed = applyAcceptedV7(state, P1, {
      kind: "DISEMBARK",
      unitId: round3UnitAtV7(state, at(16, 10)).id,
      at: CLAIM_V7,
    });
    expect(eventKindsV7(landed.events)).not.toContain("GOLD_CLAIM_STAKED");
    expect(curiosityAt(landed.state, CLAIM_V7)).toMatchObject({
      ownerId: null,
    });
  });

  it("pays its owner 2 Coins right after the income until it is played out", () => {
    const state = claim({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(2, 2) }],
    });
    const owned = checkedV7({
      ...state,
      curiosities: [{ kind: "GOLD_CLAIM", at: CLAIM_V7, ownerId: P1, left: 3 }],
    });
    const round = endRound(owned);
    const kinds = eventKindsV7(round.events);
    const income = kinds.indexOf("INCOME_AWARDED");
    expect(kinds[income + 1]).toBe("GOLD_CLAIM_PAID");
    const paid = round.events.find((event) => event.kind === "GOLD_CLAIM_PAID");
    expect(paid).toEqual({
      kind: "GOLD_CLAIM_PAID",
      playerId: P1,
      at: CLAIM_V7,
      coins: GOLD_CLAIM_COINS_V7,
      left: 1,
    });
    const awarded = round.events.find(
      (event) => event.kind === "INCOME_AWARDED" && event.playerId === P1,
    );
    if (awarded?.kind !== "INCOME_AWARDED") throw new Error("no income");
    // Owner-only.
    expect(
      projectEventsV7(round.state, round.state, P2, round.events).events.map(
        (event) => event.kind,
      ),
    ).not.toContain("GOLD_CLAIM_PAID");
    // The last Coin plays it out.
    const last = endRound(round.state);
    expect(
      last.events.find((event) => event.kind === "GOLD_CLAIM_PAID"),
    ).toMatchObject({ coins: 1, left: 0 });
    expect(curiosityAt(last.state, CLAIM_V7)).toEqual({
      kind: "GOLD_CLAIM",
      at: CLAIM_V7,
      ownerId: null,
      left: 0,
    });
    const after = endRound(last.state);
    expect(eventKindsV7(after.events)).not.toContain("GOLD_CLAIM_PAID");
    // The payout helper changes nothing without an owned Claim.
    expect(resolveGoldClaimPayoutV7(state, P1)).toEqual({ state, events: [] });
  });

  it("becomes unowned when its owner is eliminated", () => {
    const state = claim();
    const eliminated = {
      ...state,
      players: state.players.map((player) =>
        player.id === P2
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
      curiosities: [
        { kind: "GOLD_CLAIM" as const, at: CLAIM_V7, ownerId: P2, left: 9 },
      ],
    };
    expect(prunedCuriositiesV7(eliminated).curiosities).toEqual([
      { kind: "GOLD_CLAIM", at: CLAIM_V7, ownerId: null, left: 9 },
    ]);
  });
});

describe("the Lost Expedition (section 7)", () => {
  const camp = (options: Parameters<typeof round3ArenaV7>[0] = {}) =>
    round3ArenaV7({ kinds: ["LOST_EXPEDITION"], ...options });
  const find = (state: GameStateV7, actor: PlayerId, from: CoordV7) =>
    applyAcceptedV7(state, actor, {
      kind: "MOVE",
      unitId: round3UnitAtV7(state, from).id,
      path: [EXPEDITION_V7],
    });
  const SOME_TECHS = ["GATHERING", "HUNTING", "SCOUTING", "DRILL"] as const;

  it("gives the first finder its notes; nobody after it finds anything", () => {
    const state = camp({
      pieces: [
        { seat: 0, role: "FIGHTER", at: at(4, 5) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ],
      techs: { 0: SOME_TECHS, 1: SOME_TECHS },
    });
    const found = find(state, P1, at(4, 5));
    expect(eventKindsV7(found.events).slice(0, 2)).toEqual([
      "UNIT_MOVED",
      "EXPEDITION_FOUND",
    ]);
    expect(found.events[1]).toMatchObject({
      kind: "EXPEDITION_FOUND",
      playerId: P1,
      notes: true,
      coins: 0,
    });
    expect(curiosityAt(found.state, EXPEDITION_V7)).toEqual({
      kind: "LOST_EXPEDITION",
      at: EXPEDITION_V7,
      foundBy: P1,
    });
    // Player 2 arrives later: nothing.
    const later = camp({
      pieces: [{ seat: 1, role: "FIGHTER", at: at(5, 4) }],
      techs: { 0: SOME_TECHS, 1: SOME_TECHS },
      curiosities: [],
    });
    const p1Found = checkedV7({
      ...later,
      curiosities: [
        { kind: "LOST_EXPEDITION", at: EXPEDITION_V7, foundBy: P1 },
      ],
    });
    const handed = applyAcceptedV7(p1Found, P1, { kind: "END_TURN" });
    const late = find(handed.state, P2, at(5, 4));
    expect(eventKindsV7(late.events)).not.toContain("EXPEDITION_FOUND");
    expect(curiosityAt(late.state, EXPEDITION_V7)).toMatchObject({
      foundBy: P1,
    });
  });

  it("pays 10 Coins and leaves the board when there is nothing to research", () => {
    const state = camp({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(4, 5) }],
    });
    const coins = coinsOf(state, P1);
    const found = find(state, P1, at(4, 5));
    expect(found.events[1]).toMatchObject({
      kind: "EXPEDITION_FOUND",
      notes: false,
      coins: EXPEDITION_COINS_V7,
    });
    expect(coinsOf(found.state, P1)).toBe(coins + EXPEDITION_COINS_V7);
    expect(curiosityAt(found.state, EXPEDITION_V7)).toBeUndefined();
  });

  it("makes the next priced research free, even with too few Coins, and is then used up", () => {
    const state = camp({
      pieces: [{ seat: 0, role: "FIGHTER", at: at(2, 2) }],
      techs: { 0: SOME_TECHS },
      coins: 0,
      curiosities: [],
    });
    const holding = checkedV7({
      ...state,
      curiosities: [
        { kind: "LOST_EXPEDITION", at: EXPEDITION_V7, foundBy: P1 },
      ],
    });
    // The tree prices every offer at 0 and the query offers it.
    const tree = queryTechnologyTreeV7(holding, P1);
    const farming = tree.nodes.find((node) => node.id === "FARMING");
    expect(farming?.cost).toBe(0);
    expect(farming?.affordable).toBe(true);
    expect(
      queryPlayerCommandsV7(holding, P1).some(
        (command) => command.kind === "RESEARCH" && command.tech === "FARMING",
      ),
    ).toBe(true);
    const researched = applyAcceptedV7(holding, P1, {
      kind: "RESEARCH",
      tech: "FARMING",
    });
    expect(eventKindsV7(researched.events).slice(0, 2)).toEqual([
      "TECH_RESEARCHED",
      "EXPEDITION_NOTES_USED",
    ]);
    expect(researched.events[0]).toMatchObject({ cost: 0 });
    expect(researched.events[1]).toEqual({
      kind: "EXPEDITION_NOTES_USED",
      playerId: P1,
      at: EXPEDITION_V7,
    });
    expect(curiosityAt(researched.state, EXPEDITION_V7)).toBeUndefined();
    // Without notes the next one costs its price again.
    expect(
      rejectionV7(researched.state, P1, {
        kind: "RESEARCH",
        tech: "ADMINISTRATION",
      }).code,
    ).toBe("INSUFFICIENT_COINS");
    // Which technology was researched stays private.
    expect(
      projectEventsV7(
        holding,
        researched.state,
        P2,
        researched.events,
      ).events.map((event) => event.kind),
    ).toEqual(expect.arrayContaining(["EXPEDITION_NOTES_USED"]));
    expect(
      projectEventsV7(
        holding,
        researched.state,
        P2,
        researched.events,
      ).events.map((event) => event.kind),
    ).not.toContain("TECH_RESEARCHED");
  });

  it("keeps the notes through the free first technology", () => {
    const state = camp({ techs: { 0: [] }, coins: 0, curiosities: [] });
    const holding = checkedV7({
      ...state,
      curiosities: [
        { kind: "LOST_EXPEDITION", at: EXPEDITION_V7, foundBy: P1 },
      ],
    });
    const opener = applyAcceptedV7(holding, P1, {
      kind: "RESEARCH",
      tech: "GATHERING",
    });
    expect(eventKindsV7(opener.events)).not.toContain("EXPEDITION_NOTES_USED");
    expect(curiosityAt(opener.state, EXPEDITION_V7)).toMatchObject({
      foundBy: P1,
    });
  });

  it("leaves the board with an eliminated finder", () => {
    const state = camp();
    const eliminated = {
      ...state,
      players: state.players.map((player) =>
        player.id === P2
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
      curiosities: [
        { kind: "LOST_EXPEDITION" as const, at: EXPEDITION_V7, foundBy: P2 },
      ],
    };
    expect(prunedCuriositiesV7(eliminated).curiosities).toEqual([]);
  });
});

describe("round-3 state parsing and saves (sections 10.2 and 13)", () => {
  const base = round3ArenaV7({
    kinds: ["TESLA_TOWER", "MOON_GUN", "GOLD_CLAIM", "LOST_EXPEDITION"],
  });
  const withMarkers = (curiosities: readonly unknown[]) =>
    parseGameStateV7(
      JSON.parse(JSON.stringify({ ...base, curiosities })) as GameStateV7,
    );

  it("round-trips every round-3 marker mid-match", () => {
    const mid = checkedV7({
      ...base,
      curiosities: [
        { kind: "LOST_EXPEDITION", at: EXPEDITION_V7, foundBy: P2 },
        { kind: "TESLA_TOWER", at: TOWER_V7 },
        { kind: "MOON_GUN", at: GUN_V7, lastFired: { round: 1, playerId: P2 } },
        { kind: "GOLD_CLAIM", at: CLAIM_V7, ownerId: P1, left: 14 },
      ],
    });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(mid)))).toEqual(mid);
  });

  it("rejects a wrong terrain, a second of a kind, a stranger, bad Coins, or a future shot", () => {
    const good = base.curiosities;
    expect(withMarkers(good)).not.toBeNull();
    const replace = (kind: string, value: object) =>
      good.map((curiosity) =>
        curiosity.kind === kind ? { ...curiosity, ...value } : curiosity,
      );
    expect(withMarkers(replace("GOLD_CLAIM", { left: 31 }))).toBeNull();
    expect(withMarkers(replace("GOLD_CLAIM", { left: -1 }))).toBeNull();
    expect(
      withMarkers(replace("GOLD_CLAIM", { left: 0, ownerId: P1 })),
    ).toBeNull();
    expect(withMarkers(replace("GOLD_CLAIM", { ownerId: 9 }))).toBeNull();
    expect(withMarkers(replace("LOST_EXPEDITION", { foundBy: 9 }))).toBeNull();
    expect(
      withMarkers(
        replace("MOON_GUN", {
          lastFired: { round: base.round + 1, playerId: P1 },
        }),
      ),
    ).toBeNull();
    expect(
      withMarkers(
        [...good, { kind: "TESLA_TOWER", at: at(15, 15) }].sort(
          (a, b) => a.at.y - b.at.y || a.at.x - b.at.x,
        ),
      ),
    ).toBeNull();
    // The Moon Gun stands on Grass only.
    const forest = checkedV7({
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === GUN_V7.x && tile.at.y === GUN_V7.y
            ? { ...tile, terrain: "FOREST" as const }
            : tile,
        ),
      },
      curiosities: [],
    });
    expect(
      parseGameStateV7({
        ...forest,
        curiosities: [{ kind: "MOON_GUN", at: GUN_V7, lastFired: null }],
      }),
    ).toBeNull();
  });

  it("keeps a board without curiosities exactly as it was", () => {
    const plain = round3ArenaV7();
    expect(plain.curiosities).toEqual([]);
    for (const kind of ["ZAP", "FIRE_MOON_GUN"])
      expect(offered(plain, P1, kind)).toEqual([]);
    expect(resolveGoldClaimPayoutV7(plain, P1).state).toBe(plain);
    expect(prunedCuriositiesV7(plain)).toBe(plain);
  });
});
