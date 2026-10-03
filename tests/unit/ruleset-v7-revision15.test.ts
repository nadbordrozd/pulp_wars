import { describe, expect, it } from "vitest";
import {
  plaguedNeighboursV7,
  publicAfflictionsV7,
  publicTendValueV7,
} from "../../src/ai/v7-undead";
import {
  BITTEN_RISING_HP_V7,
  INFECT_RISING_HP_V7,
  PLAGUE_DURATION_TURNS_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parsePlayerEventEnvelopeV7,
  projectEventsV7,
  queryCombatPreviewV7,
  unitId,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { collectAcceptedTelemetryV7 } from "../../src/headless/v7";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";

// Revision 15 (`pulp_wars-vkq.20`): Plague lasts three of its owner's Start
// Turns and spreads only on the first; Zombies have 18 HP.
//
// Board: the seed-2 DRY_LAND revision-13 11 x 11 board the Undead tests use
// (capitals (8, 8) and (2, 8); rows 0-4 west of x 6 are open neutral land).

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 revision-15 identity", () => {
  it("keeps rejecting r14 after the r28 identity and cleans the r14 through r27 save keys", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r28");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r28.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-14)).toEqual([
      "pulpWars.save.v7r14.current",
      "pulpWars.save.v7r15.current",
      "pulpWars.save.v7r16.current",
      "pulpWars.save.v7r17.current",
      "pulpWars.save.v7r18.current",
      "pulpWars.save.v7r19.current",
      "pulpWars.save.v7r20.current",
      "pulpWars.save.v7r21.current",
      "pulpWars.save.v7r22.current",
      "pulpWars.save.v7r23.current",
      "pulpWars.save.v7r24.current",
      "pulpWars.save.v7r25.current",
      "pulpWars.save.v7r26.current",
      "pulpWars.save.v7r27.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
    const setup = setupWith(["ORIGINAL", "UNDEAD"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r14" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: "pulp-wars-poc-7r14",
        setup: oldSetup,
      }),
    ).toBeNull();
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-30T10:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r14",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r14" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("ruleset-7 revision-15 Zombie fragility", () => {
  it("gives the Zombie 18 HP while Infect and Bitten risings keep 10 HP", () => {
    expect(effectiveRoleRuleV7("GUARD", "UNDEAD")).toMatchObject({
      label: "Zombie",
      maxHp: 18,
      attack2: 4,
      defense2: 4,
      cost: 3,
    });
    // Revision 20 section 6.3: the Human Guard has 17 HP (was 15).
    expect(effectiveRoleRuleV7("GUARD", "ORIGINAL").maxHp).toBe(17);
    expect([INFECT_RISING_HP_V7, BITTEN_RISING_HP_V7]).toEqual([10, 10]);
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
      ],
    );
    const risingId = unitId(state.nextEntityId);
    const result = attack(state, { x: 2, y: 3 }, { x: 3, y: 3 });
    expect(unitById(result.state, risingId)).toMatchObject({
      role: "GUARD",
      hp: 10,
      maxHp: 18,
    });
    expect(unitAt(state, { x: 2, y: 3 }).maxHp).toBe(18);
  });
});

describe("ruleset-7 revision-15 Plague duration", () => {
  it("damages on three owner turns, spreads only on the first, then expires", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 2 } },
      ],
      { plagued: [{ at: { x: 3, y: 2 }, source: { x: 0, y: 0 } }] },
    );
    const lich = unitAt(state, { x: 0, y: 0 });
    const guard = unitAt(state, { x: 3, y: 2 });
    const fighter = unitAt(state, { x: 4, y: 2 });
    const human = seatPlayer(state, 1);
    const entry = (id: UnitStateV7["id"], turnsRemaining: number) => ({
      unitId: id,
      sourceUnitId: lich.id,
      turnsRemaining,
    });

    // Turn 1: damage, spread to the healthy neighbour, 3 -> 2.
    const first = endTurnUntil(state, human);
    expect(startTurnPlague(first.events)).toEqual([
      "PLAGUE_DAMAGED",
      "PLAGUE_SPREAD",
    ]);
    expect(first.state.plagued).toEqual([
      entry(guard.id, 2),
      entry(fighter.id, 3),
    ]);
    expect(viewForV7(first.state, human).plagued).toEqual([
      entry(guard.id, 2),
      entry(fighter.id, 3),
    ]);

    // Turn 2: both take damage; only the fighter is on its first turn and
    // its only neighbour is already plagued, so nothing spreads.
    const second = endTurnUntil(first.state, human);
    expect(startTurnPlague(second.events)).toEqual(["PLAGUE_DAMAGED"]);
    expect(second.state.plagued).toEqual([
      entry(guard.id, 1),
      entry(fighter.id, 2),
    ]);

    // Turn 3: the guard's third damage; its Plague expires.
    const third = endTurnUntil(second.state, human);
    expect(startTurnPlague(third.events)).toEqual([
      "PLAGUE_DAMAGED",
      "PLAGUE_EXPIRED",
    ]);
    expect(
      third.events.find((event) => event.kind === "PLAGUE_EXPIRED"),
    ).toEqual({ kind: "PLAGUE_EXPIRED", playerId: human, unitIds: [guard.id] });
    expect(third.state.plagued).toEqual([entry(fighter.id, 1)]);

    // Turn 4: the fighter expires too; its healthy neighbour stays healthy.
    const fourth = endTurnUntil(third.state, human);
    expect(startTurnPlague(fourth.events)).toEqual([
      "PLAGUE_DAMAGED",
      "PLAGUE_EXPIRED",
    ]);
    expect(fourth.state.plagued).toEqual([]);
    // Each infection dealt exactly three times 2 damage (6 in all).
    const plagueDamage = (id: UnitStateV7["id"]) =>
      [first, second, third, fourth]
        .flatMap((step) => step.events)
        .flatMap((event) =>
          event.kind === "PLAGUE_DAMAGED" ? event.results : [],
        )
        .filter((result) => result.unitId === id)
        .map((result) => result.damage);
    expect(plagueDamage(guard.id)).toEqual([2, 2, 2]);
    expect(plagueDamage(fighter.id)).toEqual([2, 2, 2]);

    // Turn 5: no Plague at all.
    const fifth = endTurnUntil(fourth.state, human);
    expect(startTurnPlague(fifth.events)).toEqual([]);

    // An expired unit can be plagued again, with a fresh three turns.
    const undead = seatPlayer(state, 0);
    const lichTurn = endTurnUntil(fifth.state, undead);
    const again = attack(lichTurn.state, lich.at, guard.at);
    expect(combatPreview(again.events).plagued).toContain(guard.id);
    expect(again.state.plagued).toContainEqual(entry(guard.id, 3));
  });

  it("never resets a unit that is already plagued, and a Lich death still clears", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 4 } },
        { seat: 1, role: "JUGGERNAUT", at: { x: 3, y: 2 } },
      ],
      {
        plagued: [
          { at: { x: 3, y: 2 }, source: { x: 0, y: 0 }, turnsRemaining: 1 },
        ],
      },
    );
    const firstLich = unitAt(state, { x: 0, y: 0 });
    const juggernaut = unitAt(state, { x: 3, y: 2 });
    for (const from of [firstLich.at, { x: 0, y: 4 }]) {
      const result = attack(state, from, juggernaut.at);
      expect(combatPreview(result.events).plagued).toEqual([]);
      expect(result.state.plagued).toEqual([
        {
          unitId: juggernaut.id,
          sourceUnitId: firstLich.id,
          turnsRemaining: 1,
        },
      ]);
    }
    // Revision 14 clearing is unchanged: the source Lich's death cures.
    const doomed = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === firstLich.id ? { ...unit, hp: 1 } : unit,
      ),
    });
    const human = seatPlayer(state, 1);
    const humanTurn = endTurnUntil(doomed, human);
    // The juggernaut's last Plague turn resolved at this Start Turn.
    expect(humanTurn.state.plagued).toEqual([]);
    expect(
      humanTurn.events.find((event) => event.kind === "PLAGUE_EXPIRED"),
    ).toEqual({
      kind: "PLAGUE_EXPIRED",
      playerId: human,
      unitIds: [juggernaut.id],
    });
  });

  it("lists only survivors as expired and lets the last turn kill", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 }, hp: 2 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
      {
        plagued: [
          { at: { x: 3, y: 1 }, source: { x: 0, y: 0 }, turnsRemaining: 1 },
          { at: { x: 3, y: 3 }, source: { x: 0, y: 0 }, turnsRemaining: 1 },
        ],
      },
    );
    const dying = unitAt(state, { x: 3, y: 1 });
    const survivor = unitAt(state, { x: 3, y: 3 });
    const human = seatPlayer(state, 1);
    const ended = endTurnUntil(state, human);
    const kinds = ended.events.map((event) => event.kind);
    const start = kinds.lastIndexOf("TURN_STARTED");
    expect(kinds.slice(start, start + 5)).toEqual([
      "TURN_STARTED",
      "PLAGUE_DAMAGED",
      "UNIT_DIED",
      "GRAVE_CREATED",
      "PLAGUE_EXPIRED",
    ]);
    expect(ended.events[start + 1]).toMatchObject({
      results: [
        { unitId: dying.id, damage: 2, dies: true },
        { unitId: survivor.id, damage: 2, dies: false },
      ],
    });
    expect(ended.events[start + 4]).toEqual({
      kind: "PLAGUE_EXPIRED",
      playerId: human,
      unitIds: [survivor.id],
    });
    expect(ended.state.plagued).toEqual([]);
  });

  it("validates, hashes, and projects the remaining turns and expiry", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
      {
        plagued: [
          { at: { x: 4, y: 3 }, source: { x: 0, y: 0 }, turnsRemaining: 2 },
        ],
      },
    );
    const lich = unitAt(state, { x: 0, y: 0 });
    const fighter = unitAt(state, { x: 4, y: 3 });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const withTurns = (turnsRemaining: unknown) => ({
      ...state,
      plagued: [{ unitId: fighter.id, sourceUnitId: lich.id, turnsRemaining }],
    });
    expect(canonicalHash(withTurns(1))).not.toBe(canonicalHash(state));
    expect(parseGameStateV7(withTurns(3))).not.toBeNull();
    for (const invalid of [0, 4, 1.5, -1, "2", null])
      expect(parseGameStateV7(withTurns(invalid))).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        plagued: [{ unitId: fighter.id, sourceUnitId: lich.id }],
      }),
    ).toBeNull();

    const human = seatPlayer(state, 1);
    const expiring = checkedV7(withTurns(1) as GameStateV7);
    expect(
      parseEventV7({
        kind: "PLAGUE_EXPIRED",
        playerId: human,
        unitIds: [fighter.id],
      }).ok,
    ).toBe(true);
    for (const unitIds of [[], [fighter.id, fighter.id]])
      expect(
        parseEventV7({ kind: "PLAGUE_EXPIRED", playerId: human, unitIds }).ok,
      ).toBe(false);
    const ended = endTurnUntil(expiring, human);
    const own = projectEventsV7(expiring, ended.state, human, ended.events);
    expect(own.events).toContainEqual({
      kind: "PLAGUE_EXPIRED",
      playerId: human,
      unitIds: [fighter.id],
    });
    expect(parsePlayerEventEnvelopeV7(own).ok).toBe(true);
    // A viewer that explored nothing near the fighter learns nothing.
    const blind = checkedV7({
      ...expiring,
      players: expiring.players.map((player) =>
        player.seat === 0 ? { ...player, explored: [{ x: 0, y: 0 }] } : player,
      ),
    });
    const blindEnd = endTurnUntil(blind, human);
    const projected = projectEventsV7(
      blind,
      blindEnd.state,
      blind.humanPlayerId,
      blindEnd.events,
    );
    expect(
      projected.events.some((event) => event.kind === "PLAGUE_EXPIRED"),
    ).toBe(false);
    expect(parsePlayerEventEnvelopeV7(projected).ok).toBe(true);
  });

  it("previews exactly the fresh Plague a Lich applies", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 1 } },
      ],
      {
        plagued: [
          { at: { x: 4, y: 1 }, source: { x: 1, y: 1 }, turnsRemaining: 2 },
        ],
      },
    );
    const lich = unitAt(state, { x: 1, y: 1 });
    const guard = unitAt(state, { x: 3, y: 1 });
    const fighter = unitAt(state, { x: 4, y: 1 });
    const result = attack(state, lich.at, guard.at);
    const preview = combatPreview(result.events);
    expect(preview.plagued).toEqual([guard.id]);
    expect(
      queryCombatPreviewV7(state, state.humanPlayerId, lich.id, guard.id),
    ).toEqual(preview);
    expect(result.state.plagued).toEqual([
      { unitId: guard.id, sourceUnitId: lich.id, turnsRemaining: 3 },
      { unitId: fighter.id, sourceUnitId: lich.id, turnsRemaining: 2 },
    ]);
  });
});

describe("ruleset-7 revision-15 telemetry and Normal AI", () => {
  it("counts expiries and how many turns each infection lasted", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 2 } },
      ],
      { plagued: [{ at: { x: 3, y: 2 }, source: { x: 0, y: 0 } }] },
    );
    const transitions = [];
    let current = state;
    for (let step = 0; step < 6; step += 1) {
      const actor = required(current.turnOrder[current.activeSeatIndex]);
      const command: CommandV7 = { kind: "END_TURN" };
      const applied = apply(current, actor, command);
      transitions.push({
        before: current,
        after: applied.state,
        actorId: actor,
        command,
        events: applied.events,
      });
      current = applied.state;
    }
    const metrics = collectAcceptedTelemetryV7(state, [], transitions);
    expect(current.plagued).toEqual([]);
    expect(metrics.undead).toMatchObject({
      plagueDamageEntries: 3,
      plagueDamage: 6,
      plagueExpired: 1,
      plagueTurnsAtEnd: [0, 0, 0, 1],
      plaguedRemaining: 0,
    });
  });

  it("avoids only spreading Plague and values a cure by its remaining turns", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
        { seat: 1, role: "CAPTAIN", at: { x: 4, y: 2 } },
      ],
      {
        plagued: [
          { at: { x: 3, y: 1 }, source: { x: 0, y: 0 }, turnsRemaining: 3 },
          { at: { x: 3, y: 3 }, source: { x: 0, y: 0 }, turnsRemaining: 1 },
        ],
      },
    );
    const human = seatPlayer(state, 1);
    const view = viewForV7(state, human);
    const afflictions = publicAfflictionsV7(view);
    const fresh = unitAt(state, { x: 3, y: 1 });
    const fading = unitAt(state, { x: 3, y: 3 });
    const captain = unitAt(state, { x: 4, y: 2 });
    expect([...afflictions.plagued].sort()).toEqual(
      [fresh.id, fading.id].sort(),
    );
    expect([...afflictions.spreading]).toEqual([fresh.id]);
    // (2, 2) touches both plagued fighters, but only the fresh one spreads.
    expect(
      plaguedNeighboursV7(view, afflictions, { x: 2, y: 2 }, 0 as never),
    ).toBe(1);
    expect(
      plaguedNeighboursV7(view, afflictions, { x: 2, y: 4 }, 0 as never),
    ).toBe(0);
    // A last-turn victim is not worth hunting the Lich for.
    expect(
      afflictions.plaguedBySource.get(unitAt(state, { x: 0, y: 0 }).id),
    ).toEqual([fresh.id]);
    const captainView = required(
      view.units.find((unit) => unit.id === captain.id),
    );
    expect(publicTendValueV7(view, afflictions, captainView)).toEqual({
      heal: 0,
      plagueCures: 2,
      plagueTurns: 4,
      bittenCures: 0,
    });
  });
});

function startTurnPlague(events: readonly DomainEventV7[]): string[] {
  const start = events.map((event) => event.kind).lastIndexOf("TURN_STARTED");
  return events
    .slice(start)
    .map((event) => event.kind)
    .filter((kind) => kind.startsWith("PLAGUE_"));
}

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

interface ArenaOptions {
  readonly plagued?: readonly {
    at: CoordV7;
    source: CoordV7;
    turnsRemaining?: number;
  }[];
}

function setupWith(factions: readonly FactionIdV7[]): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 2,
    width: 11,
    height: 11,
    aiCount: (factions.length - 1) as 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

/**
 * The seed-2 revision-13 board with every technology, the given pieces as the
 * only units on cleared Grass, and the given Plague entries; seat 0 moves.
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const player = (seat: number) =>
    required(base.players.find((candidate) => candidate.seat === seat));
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const idAt = (at: CoordV7) =>
    required(units.find((unit) => same(unit.at, at))).id;
  const cleared = pieces.map((piece) => piece.at);
  const every: CoordV7[] = [];
  for (let y = 0; y < base.board.height; y += 1)
    for (let x = 0; x < base.board.width; x += 1) every.push({ x, y });
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(player(0).id),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 10_000,
      explored: every,
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: [],
    plagued: (options.plagued ?? [])
      .map((entry) => ({
        unitId: idAt(entry.at),
        sourceUnitId: idAt(entry.source),
        turnsRemaining: entry.turnsRemaining ?? PLAGUE_DURATION_TURNS_V7,
      }))
      .sort((left, right) => left.unitId - right.unitId),
    bitten: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        cleared.some((at) => same(at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

/** Ends turns until `playerId`'s turn has started; returns every event. */
function endTurnUntil(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  let current = state;
  const events: DomainEventV7[] = [];
  for (let step = 0; step < state.turnOrder.length; step += 1) {
    const actor = required(current.turnOrder[current.activeSeatIndex]);
    const result = apply(current, actor, { kind: "END_TURN" });
    current = result.state;
    events.push(...result.events);
    if (current.turnOrder[current.activeSeatIndex] === playerId)
      return { state: current, events };
  }
  throw new Error("turn never reached");
}

function apply(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result;
}

function attack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const attacker = unitAt(state, from);
  return apply(state, attacker.ownerId, {
    kind: "ATTACK",
    unitId: attacker.id,
    targetUnitId: unitAt(state, to).id,
  });
}

function combatPreview(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events[0];
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function unitById(state: GameStateV7, id: UnitStateV7["id"]): UnitStateV7 {
  return required(state.units.find((unit) => unit.id === id));
}

function seatPlayer(state: GameStateV7, seat: number): PlayerId {
  return required(state.players.find((player) => player.seat === seat)).id;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture value missing");
  return value;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
