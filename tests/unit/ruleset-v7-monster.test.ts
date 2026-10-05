import { describe, expect, it } from "vitest";
import {
  MONSTER_BOUNTY_V7,
  MONSTER_HP_V7,
  NEUTRAL_KIND_V7,
  NEUTRAL_OWNER_ID_V7,
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  arePlayersAlliedV7,
  arePlayersHostileV7,
  calculateCombatPreviewV7,
  canBeChilledV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  mindControlTargetBlockV7,
  monsterStepsV7,
  monsterWanderV7,
  neutralCapabilitiesV7,
  ownerResearchedTechsV7,
  parseEventV7,
  parseGameStateV7,
  parseReplayJsonV7,
  playerFactionV7,
  previewMonsterV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  runReplayV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import {
  applyOkV7,
  endTurnUntilV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  MONSTER_LAIR_V7,
  monsterArenaV7,
  monsterOfV7,
} from "../fixtures/v7-monster-arena";

// Map curiosities, engine II (`pulp_wars-737.3`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 8 to 10 and 13.2): the
// Giant Spider, its neutral owner and registration, the neutral turn,
// provocation, the wander, the immunities, the bounty, the view, the
// previews, and persistence.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const kinds = (events: readonly DomainEventV7[]) =>
  events
    .map((event) => event.kind)
    .filter((kind) => kind !== "ACHIEVEMENT_UNLOCKED");

/** Players 1 to 4 are seats 0 to 3; player 2's END_TURN ends the round. */
const P1 = 1 as PlayerId;
const P2 = 2 as PlayerId;
const P3 = 3 as PlayerId;

/** Ends turns until the round wraps (player 1 is active again). */
function endRound(state: GameStateV7) {
  return endTurnUntilV7(state, P1);
}

/** The events of the END_TURN that wrapped the round. */
function wrapEvents(state: GameStateV7): readonly DomainEventV7[] {
  const result = endRound(state);
  const start = result.events.findIndex(
    (event) => event.kind === "TURN_ENDED" && event.playerId === P2,
  );
  return result.events.slice(start);
}

describe("the neutral owner and registration (sections 8.1, 8.2, 10.5)", () => {
  const state = monsterArenaV7([]);
  const spider = monsterOfV7(state);

  it("resolves the Giant Spider through the neutral registration", () => {
    expect(spider.ownerId).toBe(NEUTRAL_OWNER_ID_V7);
    expect(state.players.some((player) => player.id === spider.ownerId)).toBe(
      false,
    );
    expect(unitFactionV7(state, spider)).toBe(NEUTRAL_KIND_V7);
    const rule = unitRoleRuleV7(state, spider);
    expect(rule).toMatchObject({
      role: "JUGGERNAUT",
      label: "Giant Spider",
      maxHp: 24,
      attack2: 6,
      defense2: 4,
      move: 1,
      range: 1,
      cost: null,
      abilities: ["ATTACK"],
    });
    expect(unitRoleMechanicsV7(state, spider).advancesAfterKill).toBe(false);
    expect(unitCapabilitiesV7(state, spider, [])).toBe(neutralCapabilitiesV7());
    expect(ownerResearchedTechsV7(state, NEUTRAL_OWNER_ID_V7)).toEqual([]);
    // Player-only readers assert.
    expect(() => playerFactionV7(state, NEUTRAL_OWNER_ID_V7)).toThrow();
  });

  it("is hostile to every player and allied to nobody, in both modes", () => {
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const) {
      const arena = monsterArenaV7([], { aiMode });
      for (const player of arena.players) {
        expect(
          arePlayersAlliedV7(arena, player.id, NEUTRAL_OWNER_ID_V7),
          `${aiMode} ${player.id}`,
        ).toBe(false);
        expect(arePlayersAlliedV7(arena, NEUTRAL_OWNER_ID_V7, player.id)).toBe(
          false,
        );
        expect(arePlayersHostileV7(arena, player.id, NEUTRAL_OWNER_ID_V7)).toBe(
          true,
        );
      }
    }
    // The pitfall of section 8.1: two AI seats stay allied.
    const cooperative = monsterArenaV7([], { aiMode: "COOPERATIVE" });
    expect(arePlayersAlliedV7(cooperative, P2, P3)).toBe(true);
  });

  it("refuses every command naming the Monster and never offers one", () => {
    const result = applyCommandV7(state, P1, {
      kind: "MOVE",
      unitId: spider.id,
      path: [at(8, 7)],
    });
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.error.code).toBe("UNIT_NOT_OWNED");
    expect(
      queryPlayerCommandsV7(viewForV7(state, P1)).some(
        (command) => "unitId" in command && command.unitId === spider.id,
      ),
    ).toBe(false);
  });
});

describe("the neutral turn (sections 8.3 to 8.5)", () => {
  it("runs inside the END_TURN that wraps the round, after TURN_ENDED and before the next Start Turn", () => {
    const state = monsterArenaV7([{ seat: 0, role: "FIGHTER", at: at(8, 8) }]);
    const spider = monsterOfV7(state);
    const fighter = unitAtV7(state, at(8, 8));
    // A turn that does not wrap the round has no neutral turn.
    const first = applyOkV7(state, P1, { kind: "END_TURN" });
    expect(kinds(first.events)).not.toContain("NEUTRAL_TURN_STARTED");
    const events = wrapEvents(state);
    const sequence = kinds(events);
    expect(sequence.slice(0, 2)).toEqual([
      "TURN_ENDED",
      "NEUTRAL_TURN_STARTED",
    ]);
    expect(events[1]).toEqual({ kind: "NEUTRAL_TURN_STARTED", round: 1 });
    const ended = sequence.indexOf("NEUTRAL_TURN_ENDED");
    expect(sequence[ended + 1]).toBe("TURN_STARTED");
    const combat = events.find((event) => event.kind === "COMBAT_RESOLVED");
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no attack");
    // Section 8.2: a Fighter next to it takes 8 and deals 4.
    expect(combat.preview.attackerId).toBe(spider.id);
    expect(combat.preview.targetUnitId).toBe(fighter.id);
    expect(combat.preview.damageToDefender).toBe(8);
    expect(combat.preview.damageToAttacker).toBe(4);
    expect(combat.preview.push).toBe("BLOCKED");
    expect(combat.preview.advances).toBe(false);
    // Step 3: it regenerates 4 (back to 24).
    expect(events).toContainEqual({
      kind: "MONSTER_REGENERATED",
      unitId: spider.id,
      amount: 4,
      hpAfter: MONSTER_HP_V7,
    });
    expect(events[ended]).toEqual({ kind: "NEUTRAL_TURN_ENDED", round: 1 });
    for (const event of events) expect(parseEventV7(event).ok).toBe(true);
    const after = endRound(state).state;
    expect(monsterOfV7(after).hp).toBe(MONSTER_HP_V7);
    expect(unitAtV7(after, at(8, 8)).hp).toBe(4);
    // The fighter's kill credit is nobody's; the match PRNG is untouched.
    expect(after.random).toEqual(state.random);
  });

  it("attacks the weakest provoker it can reach, ties broken by the lowest unit ID", () => {
    const weakest = monsterArenaV7([
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
      { seat: 2, role: "FIGHTER", at: at(6, 6), hp: 5 },
      { seat: 3, role: "FIGHTER", at: at(6, 8), hp: 9 },
    ]);
    const target = (state: GameStateV7) => {
      const event = wrapEvents(state).find(
        (item) => item.kind === "COMBAT_RESOLVED",
      );
      return event?.kind === "COMBAT_RESOLVED"
        ? event.preview.targetUnitId
        : null;
    };
    expect(target(weakest)).toBe(unitAtV7(weakest, at(6, 6)).id);
    // Two full-HP Fighters (no recovery before the neutral turn).
    const tied = monsterArenaV7([
      { seat: 0, role: "FIGHTER", at: at(6, 8) },
      { seat: 0, role: "FIGHTER", at: at(6, 6) },
    ]);
    expect(target(tied)).toBe(unitAtV7(tied, at(6, 8)).id);
  });

  it("steps to the first tile next to a provoker out of melee reach, then attacks", () => {
    // Section 8.4 rule 3: a unit that hit it from (9, 8) is next to the
    // step (8, 7) (first in (y, x) order among its steps (8, 7) and (7, 8)).
    const state = monsterArenaV7([{ seat: 0, role: "FIGHTER", at: at(9, 8) }], {
      provokedBy: [0],
    });
    const spider = monsterOfV7(state);
    expect(state.monsters[0]?.provokedBy).toEqual([
      unitAtV7(state, at(9, 8)).id,
    ]);
    const events = wrapEvents(state);
    expect(events).toContainEqual({
      kind: "UNIT_MOVED",
      unitId: spider.id,
      path: [at(8, 7)],
    });
    expect(kinds(events).indexOf("UNIT_MOVED")).toBeLessThan(
      kinds(events).indexOf("COMBAT_RESOLVED"),
    );
    const after = endRound(state).state;
    expect(monsterOfV7(after).at).toEqual(at(8, 7));
    // The list is cleared at the end of its turn.
    expect(after.monsters[0]?.provokedBy).toEqual([]);
  });

  it("wanders by the stateless draw when no provoker is in reach, and stays in its area", () => {
    // A provoker beyond its reach is listed but not a candidate.
    const state = monsterArenaV7(
      [{ seat: 0, role: "FIGHTER", at: at(12, 7) }],
      { provokedBy: [0] },
    );
    const spider = monsterOfV7(state);
    const steps = monsterStepsV7(
      {
        board: state.board,
        units: state.units,
        burrowed: state.burrowed,
        treasureChests: state.treasureChests,
      },
      spider,
      MONSTER_LAIR_V7,
    );
    expect(steps).toEqual([at(8, 7), at(7, 8)]);
    const expected = monsterWanderV7(state.setup.seed, 1, spider.id, steps);
    const events = wrapEvents(state);
    expect(kinds(events)).not.toContain("COMBAT_RESOLVED");
    const after = endRound(state).state;
    expect(monsterOfV7(after).at).toEqual(expected ?? MONSTER_LAIR_V7);
    expect(after.random).toEqual(state.random);
    // Many rounds: it never leaves its area or stands next to a center.
    let current = after;
    for (let round = 0; round < 12; round += 1) {
      current = endRound(current).state;
      const where = monsterOfV7(current).at;
      expect(
        Math.max(
          Math.abs(where.x - MONSTER_LAIR_V7.x),
          Math.abs(where.y - MONSTER_LAIR_V7.y),
        ),
      ).toBeLessThanOrEqual(2);
      for (const tile of current.board.tiles)
        if (tile.site !== null)
          expect(
            Math.max(
              Math.abs(tile.at.x - where.x),
              Math.abs(tile.at.y - where.y),
            ),
          ).toBeGreaterThanOrEqual(3);
    }
    // The same state replays to the same positions.
    expect(canonicalHash(endRound(after).state)).toBe(
      canonicalHash(endRound(after).state),
    );
  });

  it("has no zone of control: units walk past it", () => {
    const state = monsterArenaV7([{ seat: 0, role: "RAIDER", at: at(9, 6) }], {
      grass: [at(8, 6), at(7, 5)],
    });
    const raider = unitAtV7(state, at(9, 6));
    const moved = applyOkV7(state, P1, {
      kind: "MOVE",
      unitId: raider.id,
      path: [at(8, 6), at(7, 5)],
    });
    expect(unitAtV7(moved.state, at(7, 5)).id).toBe(raider.id);
    expect(kinds(moved.events)).not.toContain("UNIT_MOVE_INTERRUPTED");
    // It blocks its own tile.
    const blocked = applyCommandV7(state, P1, {
      kind: "MOVE",
      unitId: raider.id,
      path: [at(8, 6), MONSTER_LAIR_V7],
    });
    expect(blocked.accepted).toBe(false);
  });
});

describe("provocation, damage, death, and the bounty (sections 8.4, 8.6, 8.7)", () => {
  it("lists a unit that hit it from range, which it attacks when in reach", () => {
    const state = monsterArenaV7([
      { seat: 0, role: "MARKSMAN", at: at(9, 7) },
      { seat: 0, role: "CATAPULT", at: at(10, 7) },
    ]);
    const spider = monsterOfV7(state);
    const marksman = unitAtV7(state, at(9, 7));
    const catapult = unitAtV7(state, at(10, 7));
    const shot = applyOkV7(state, P1, {
      kind: "ATTACK",
      unitId: marksman.id,
      targetUnitId: spider.id,
    });
    expect(shot.state.monsters[0]?.provokedBy).toEqual([marksman.id]);
    const both = applyOkV7(shot.state, P1, {
      kind: "ATTACK",
      unitId: catapult.id,
      targetUnitId: spider.id,
    });
    expect(both.state.monsters[0]?.provokedBy).toEqual([
      marksman.id,
      catapult.id,
    ]);
    // The Catapult at 3 is out of its reach; the Marksman is not.
    const events = wrapEvents(both.state);
    const combat = events.find((event) => event.kind === "COMBAT_RESOLVED");
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no attack");
    expect(combat.preview.targetUnitId).toBe(marksman.id);
  });

  it("pays the bounty and Plunder to the credited player and leaves a Grave; it never respawns", () => {
    // Seat 2 (player 3) is Goblin with Commerce (Plunder).
    const state = monsterArenaV7([{ seat: 2, role: "FIGHTER", at: at(8, 8) }], {
      monsterHp: 2,
      activeSeat: 2,
    });
    const spider = monsterOfV7(state);
    const goblin = unitAtV7(state, at(8, 8));
    const coins = state.players.find((player) => player.id === P3)?.coins ?? 0;
    const killed = applyOkV7(state, P3, {
      kind: "ATTACK",
      unitId: goblin.id,
      targetUnitId: spider.id,
    });
    const sequence = kinds(killed.events);
    expect(sequence).toContain("UNIT_DIED");
    expect(sequence).toContain("GRAVE_CREATED");
    expect(sequence.indexOf("MONSTER_BOUNTY_AWARDED")).toBe(
      sequence.indexOf("PLUNDER_AWARDED") + 1,
    );
    expect(killed.events).toContainEqual({
      kind: "MONSTER_BOUNTY_AWARDED",
      playerId: P3,
      unitId: spider.id,
      coins: MONSTER_BOUNTY_V7,
    });
    expect(killed.state.players.find((player) => player.id === P3)?.coins).toBe(
      coins + MONSTER_BOUNTY_V7 + 1,
    );
    expect(killed.state.monsters).toEqual([]);
    expect(killed.state.units.some((unit) => unit.id === spider.id)).toBe(
      false,
    );
    // Ordinary kill credit for the killing unit.
    expect(
      killed.state.units.find((unit) => unit.id === goblin.id)?.kills,
    ).toBe(1);
    // The neutral turn is gone with it.
    expect(kinds(wrapEvents(killed.state))).not.toContain(
      "NEUTRAL_TURN_STARTED",
    );
    // Projection: the bounty is the credited player's alone.
    const own = projectEventsV7(state, killed.state, P3, killed.events);
    const other = projectEventsV7(state, killed.state, P1, killed.events);
    expect(own.events.some((e) => e.kind === "MONSTER_BOUNTY_AWARDED")).toBe(
      true,
    );
    expect(other.events.some((e) => e.kind === "MONSTER_BOUNTY_AWARDED")).toBe(
      false,
    );
  });

  it("credits a retaliation kill in its own turn with the bounty", () => {
    // A Human Guard (17 HP, Defense 3) kills a 3-HP Spider that attacks it.
    const state = monsterArenaV7([{ seat: 0, role: "GUARD", at: at(8, 8) }], {
      monsterHp: 3,
    });
    const events = wrapEvents(state);
    expect(events).toContainEqual({
      kind: "MONSTER_BOUNTY_AWARDED",
      playerId: P1,
      unitId: monsterOfV7(state).id,
      coins: MONSTER_BOUNTY_V7,
    });
    expect(kinds(events)).not.toContain("MONSTER_REGENERATED");
    expect(endRound(state).state.monsters).toEqual([]);
  });

  it("credits its own kills to nobody (no Plunder, a Grave for the victim)", () => {
    const state = monsterArenaV7([
      { seat: 2, role: "FIGHTER", at: at(8, 8), hp: 2 },
    ]);
    const events = wrapEvents(state);
    const sequence = kinds(events);
    expect(sequence).toContain("UNIT_DIED");
    expect(sequence).toContain("GRAVE_CREATED");
    expect(sequence).not.toContain("PLUNDER_AWARDED");
    expect(sequence).not.toContain("MONSTER_BOUNTY_AWARDED");
    expect(monsterOfV7(endRound(state).state).kills).toBe(1);
  });

  it("takes no status and is never moved (section 8.6)", () => {
    // Seat 1 (player 2) is Undead: a Lich at range 2 and a Zombie next to it.
    const state = monsterArenaV7(
      [
        { seat: 1, role: "CATAPULT", at: at(9, 7) },
        { seat: 1, role: "GUARD", at: at(8, 8) },
        { seat: 0, role: "JUGGERNAUT", at: at(6, 7) },
      ],
      { activeSeat: 1, monsterHp: 20 },
    );
    const spider = monsterOfV7(state);
    const lich = unitAtV7(state, at(9, 7));
    const zombie = unitAtV7(state, at(8, 8));
    const plague = calculateCombatPreviewV7(state, lich.id, spider.id);
    expect(plague.plagued).not.toContain(spider.id);
    const plagued = applyOkV7(state, P2, {
      kind: "ATTACK",
      unitId: lich.id,
      targetUnitId: spider.id,
    });
    // Its splash may plague the Juggernaut next to it, never the Spider.
    expect(
      plagued.state.plagued.some((entry) => entry.unitId === spider.id),
    ).toBe(false);
    const bite = calculateCombatPreviewV7(state, zombie.id, spider.id);
    expect(bite.defenderBitten).toBe(false);
    const weak = monsterArenaV7([{ seat: 1, role: "GUARD", at: at(8, 8) }], {
      activeSeat: 1,
      monsterHp: 1,
    });
    const infect = applyOkV7(weak, P2, {
      kind: "ATTACK",
      unitId: unitAtV7(weak, at(8, 8)).id,
      targetUnitId: monsterOfV7(weak).id,
    });
    expect(kinds(infect.events)).not.toContain("UNIT_INFECTED");
    expect(kinds(infect.events)).toContain("MONSTER_BOUNTY_AWARDED");
    // Push (the Juggernaut) is blocked.
    const juggernaut = unitAtV7(state, at(6, 7));
    expect(calculateCombatPreviewV7(state, juggernaut.id, spider.id).push).toBe(
      "BLOCKED",
    );
    // Chill and Mind Control never apply.
    expect(canBeChilledV7(state, P1, spider)).toBe(false);
    expect(
      mindControlTargetBlockV7(state, { at: at(8, 7) }, spider, {
        site: null,
        terrain: "GRASS",
      }),
    ).toBe("TARGET_IMMUNE");
  });
});

describe("the view, previews, and threatened tiles (sections 8.8 and 10.4)", () => {
  const state = monsterArenaV7([
    { seat: 0, role: "MARKSMAN", at: at(9, 7) },
    { seat: 0, role: "CATAPULT", at: at(10, 7) },
    { seat: 0, role: "FIGHTER", at: at(6, 6), hp: 6 },
  ]);
  const spider = monsterOfV7(state);
  const view = viewForV7(state, P1);

  it("lists the visible Monster with its home and visible provokers", () => {
    expect(view.monsters).toEqual([
      { unitId: spider.id, home: MONSTER_LAIR_V7, provokedBy: [] },
    ]);
    expect(view.units.some((unit) => unit.id === spider.id)).toBe(true);
    expect(view.unitStats.some((stats) => stats.unitId === spider.id)).toBe(
      true,
    );
  });

  it("is drawn as an ordinary unit with no owner colour until the curiosities UI step", () => {
    for (const selectedUnitId of [null, spider.id]) {
      const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection:
          selectedUnitId === null
            ? null
            : { kind: "UNIT", unitId: selectedUnitId },
        selectedUnitId,
        selectedAchievement: null,
      });
      const entry = plan.entries.find(
        (item) => item.key === `unit:${spider.id}`,
      );
      expect(entry).toBeDefined();
      expect(
        entry && "ownerColor" in entry ? entry.ownerColor : undefined,
      ).toBe(undefined);
    }
  });

  it("previews its area, provoke tiles, reach, provokers, and likely target", () => {
    const preview = previewMonsterV7(view, spider.id);
    if (preview === null) throw new Error("no preview");
    expect(preview.home).toEqual(MONSTER_LAIR_V7);
    expect(preview.area).toEqual([
      at(7, 7),
      at(8, 7),
      at(9, 7),
      at(7, 8),
      at(7, 9),
    ]);
    expect(preview.provokeTiles).toHaveLength(8);
    expect(
      preview.reachTiles.some((tile) => tile.x === 9 && tile.y === 7),
    ).toBe(true);
    expect(
      preview.reachTiles.some((tile) => tile.x === 10 && tile.y === 7),
    ).toBe(false);
    expect(preview.provokers).toEqual([unitAtV7(state, at(6, 6)).id]);
    expect(preview.likelyTarget).toBe(unitAtV7(state, at(6, 6)).id);
    expect(preview.exact).toBe(true);
    expect(queryThreatenedTilesV7(view, spider.id)).toEqual(
      preview.provokeTiles,
    );
  });

  it("says whether an attack on it brings its retaliation next round", () => {
    const marksman = unitAtV7(state, at(9, 7));
    const catapult = unitAtV7(state, at(10, 7));
    expect(
      queryCombatPreviewV7(view, marksman.id, spider.id)?.monsterRetaliates,
    ).toBe(true);
    expect(
      queryCombatPreviewV7(view, catapult.id, spider.id)?.monsterRetaliates,
    ).toBe(false);
    // The public preview equals the resolution apart from the new field.
    const { monsterRetaliates: _field, ...publicPreview } =
      queryCombatPreviewV7(view, marksman.id, spider.id) ?? {};
    void _field;
    expect(publicPreview).toEqual(
      calculateCombatPreviewV7(state, marksman.id, spider.id),
    );
  });

  it("projects the neutral turn's bounds to every viewer and its combat by the ordinary rule", () => {
    const before = state;
    const ended = endTurnUntilV7(state, P2).state;
    const wrap = applyOkV7(ended, P2, { kind: "END_TURN" });
    for (const player of before.players) {
      const projected = projectEventsV7(
        ended,
        wrap.state,
        player.id,
        wrap.events,
      );
      const projectedKinds = projected.events.map((event) => event.kind);
      expect(projectedKinds).toContain("NEUTRAL_TURN_STARTED");
      expect(projectedKinds).toContain("NEUTRAL_TURN_ENDED");
    }
  });
});

describe("parsing, saves, and replays (sections 10.2 and 8.9)", () => {
  it("rejects malformed Monster states", () => {
    const state = monsterArenaV7([{ seat: 0, role: "FIGHTER", at: at(8, 8) }]);
    const spider = monsterOfV7(state);
    const json = JSON.parse(JSON.stringify(state)) as GameStateV7;
    expect(parseGameStateV7(json)).not.toBeNull();
    const variants: GameStateV7[] = [
      // A neutral unit without an entry, and an entry without a unit.
      { ...json, monsters: [] },
      { ...json, units: json.units.filter((unit) => unit.id !== spider.id) },
      // Off its area, or next to a center.
      {
        ...json,
        units: json.units.map((unit) =>
          unit.id === spider.id ? { ...unit, at: at(11, 7) } : unit,
        ),
      },
      // A provoker that is not on the board.
      {
        ...json,
        monsters: json.monsters.map((entry) => ({
          ...entry,
          provokedBy: [spider.id + 1] as never,
        })),
      },
      // The option off.
      { ...json, setup: { ...json.setup, curiosities: false } },
      // A status on it.
      {
        ...json,
        plagued: [
          {
            unitId: spider.id,
            sourceUnitId: spider.id,
            turnsRemaining: 3,
          },
        ],
      },
    ];
    for (const variant of variants)
      expect(parseGameStateV7(variant)).toBeNull();
  });

  it("round-trips a generated match with a Monster through the replay and the save", () => {
    // 16 x 16 Dry Land seed 11 with three seats draws a Monster (seed 7
    // before the village density, `pulp_wars-ykw.2`).
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 11,
      width: 16,
      height: 16,
      aiCount: 2,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: true,
    };
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.monsters).toHaveLength(1);
    const match = runAiMatchV7(setup, { maxRounds: 12 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    expect(match.metrics.monsters.placed).toBe(1);
    let state = created.state;
    let replay = createReplayV7(setup);
    let neutralTurns = 0;
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events) {
        expect(parseEventV7(event).ok).toBe(true);
        if (event.kind === "NEUTRAL_TURN_STARTED") neutralTurns += 1;
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(neutralTurns).toBeGreaterThanOrEqual(10);
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  }, 600_000);
});
