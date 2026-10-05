import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import { endgamePlanForPolicyV7 } from "../../src/ai/v7-endgame";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  cityId,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  unitId,
  viewForV7,
  type CityStateV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { revision15PlayableGameV7 } from "../fixtures/v7-revision13-map";

// Seed-2 DRY_LAND Human-mirror board (11 x 11): seat 0 capital (2, 8), seat
// 1 capital (2, 2); neutral villages at (5, 2), (2, 5), (8, 5), and (8, 8).
const TARGET = { x: 2, y: 2 } as const;

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

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

describe("ruleset-7 Normal AI endgame siege (pulp_wars-1mc)", () => {
  it("starts only after expansion against a public last-cities seat", () => {
    const pieces: Piece[] = [{ seat: 0, role: "FIGHTER", at: { x: 7, y: 8 } }];
    const plan = (villages: readonly CoordV7[]) => {
      const view = viewFor(arena(pieces, villages));
      return endgamePlanForPolicyV7(view, (owner) => owner !== view.viewer.id);
    };
    // Two cities against one: too few own cities.
    expect(plan([{ x: 8, y: 8 }])).toBeNull();
    // Three against one, but explored neutral villages remain.
    expect(plan(OUTSIDE_VILLAGES)).toBeNull();
    const endgame = plan(ENDGAME_VILLAGES);
    expect(endgame?.targets.map((city) => city.at)).toEqual([TARGET]);
    expect(endgame?.routeDistanceByKey.get("2,2")).toBe(0);
    expect(endgame?.routeDistanceByKey.get("2,3")).toBe(1);
  });

  it("vacates a non-capturing squatter for an adjacent capturer", () => {
    const pieces: Piece[] = [
      { seat: 0, role: "CAPTAIN", at: TARGET },
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } },
    ];
    const outside = decide(arena(pieces, OUTSIDE_VILLAGES));
    expect(outside.candidates.some(isVacate)).toBe(false);

    let state = arena(pieces, ENDGAME_VILLAGES);
    const vacate = decide(state);
    expect(vacate.command).toMatchObject({
      kind: "MOVE",
      unitId: unitAt(state, TARGET).id,
    });
    expect(vacate.candidates[0]?.score.priority).toBe(1291);
    state = apply(state, required(vacate.command));
    const step = decide(state);
    expect(step.command).toEqual({
      kind: "MOVE",
      unitId: unitAt(state, { x: 2, y: 3 }).id,
      path: [TARGET],
    });
  });

  it("commits a combined attack that clears the last center for a capturer", () => {
    // A Guard on Field Defense: a lone Fighter's attack is a losing trade.
    // (Before tuning 1, 7r46, the fortified retaliation killed the Fighter;
    // the retaliation now uses the Guard's base Defense.)
    const pieces: Piece[] = [
      { seat: 1, role: "GUARD", at: TARGET },
      { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 1 } },
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } },
      { seat: 0, role: "FIGHTER", at: { x: 1, y: 3 } },
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 3 } },
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } },
    ];
    const fortify = (state: GameStateV7) =>
      checkedV7({
        ...state,
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            same(tile.at, TARGET) ? { ...tile, fieldDefense: true } : tile,
          ),
        },
      });
    const guard = (state: GameStateV7) => unitAt(state, TARGET);
    const lone = queryCombatPreviewV7(
      viewFor(fortify(arena(pieces, ENDGAME_VILLAGES))),
      unitAt(fortify(arena(pieces, ENDGAME_VILLAGES)), { x: 1, y: 1 }).id,
      guard(fortify(arena(pieces, ENDGAME_VILLAGES))).id,
    );
    expect(lone).toMatchObject({ attackerDies: false, defenderDies: false });
    expect(lone?.damageToAttacker ?? 0).toBeGreaterThan(
      lone?.damageToDefender ?? 0,
    );

    // pulp_wars-9s0.1: outside the endgame the same combined attack is
    // committed on any city the campaign's group has gone in on (until then
    // every such attack was rejected as harmful).
    const outside = decide(fortify(arena(pieces, OUTSIDE_VILLAGES)));
    expect(outside.command?.kind).toBe("ATTACK");
    expect([1343, 1344]).toContain(outside.candidates[0]?.score.priority);

    let state = fortify(arena(pieces, ENDGAME_VILLAGES));
    const first = decide(state);
    expect(first.command?.kind).toBe("ATTACK");
    expect([1343, 1344]).toContain(first.candidates[0]?.score.priority);
    const guardId = guard(state).id;
    for (let step = 0; step < 12; step += 1) {
      const decision = decide(state);
      const command = required(decision.command);
      if (command.kind === "END_TURN") break;
      state = apply(state, command);
      if (
        state.units.some(
          (unit) => same(unit.at, TARGET) && unit.ownerId === seatId(state, 0),
        )
      )
        break;
    }
    expect(state.units.some((unit) => unit.id === guardId)).toBe(false);
    expect(unitAt(state, TARGET).ownerId).toBe(seatId(state, 0));
  });

  it("routes a capturer around its own siege line", () => {
    // Catapults wall off the direct approach; the Fighter behind them must
    // step sideways (no Chebyshev progress) to get around.
    const pieces: Piece[] = [
      { seat: 0, role: "CATAPULT", at: { x: 2, y: 4 } },
      { seat: 0, role: "CATAPULT", at: { x: 3, y: 4 } },
      { seat: 0, role: "CATAPULT", at: { x: 4, y: 4 } },
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 5 } },
    ];
    const state = arena(pieces, ENDGAME_VILLAGES);
    const fighter = unitAt(state, { x: 3, y: 5 });
    const decision = decide(state);
    const best = decision.candidates.find(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        candidate.command.unitId === fighter.id,
    );
    expect(best?.score.priority).toBe(1105);
    expect(best?.command).toMatchObject({ path: [{ x: 2, y: 5 }] });
    const outside = decide(arena(pieces, OUTSIDE_VILLAGES)).candidates.find(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        candidate.command.unitId === fighter.id,
    );
    expect(outside?.score.priority).not.toBe(1105);
  });

  it.each([
    // Round-capped (150) at c7b1849 in the revision-15 balance matrix.
    {
      factions: ["ORIGINAL", "ORIGINAL"],
      seed: 7,
      mapType: "ARCHIPELAGO",
      rounds: 60,
    },
    {
      factions: ["ORIGINAL", "ORIGINAL"],
      seed: 0,
      mapType: "PANGEA",
      rounds: 60,
    },
    // Revision 20 (`pulp_wars-0hi.2`): a Promotion fully heals, so this
    // match leaves its revision-19 course at its first Promotion of a
    // wounded unit and now ends by conquest in round 142 (was round 47). It
    // still finishes below the 150-round cap without a stall; eight other
    // Undead mirror seeds on this map stay within five rounds of revision 19.
    // With the revision-21 achievements it ended in round 55, and with the
    // campaign plan (`pulp_wars-9s0.1`) it ends in round 35.
    { factions: ["UNDEAD", "UNDEAD"], seed: 0, mapType: "PANGEA", rounds: 150 },
  ] as const)(
    "finishes a formerly stalled $factions $mapType seed $seed match",
    ({ factions, seed, mapType, rounds }) => {
      const match = runAiMatchV7(
        { ...setupWith(seed), factions: [...factions], mapType },
        { maxRounds: 150, recordCheckpointHashes: false },
      );
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(match.termination).toBe("OUTCOME");
      expect(match.rounds).toBeLessThan(rounds);
    },
    600_000,
  );
});

/** Seat 0 holds every village: five cities against one, expansion over. */
const ENDGAME_VILLAGES: readonly CoordV7[] = [
  { x: 8, y: 8 },
  { x: 8, y: 5 },
  { x: 2, y: 5 },
  { x: 5, y: 2 },
];
/** Three cities against one while two neutral villages remain. */
const OUTSIDE_VILLAGES: readonly CoordV7[] = [
  { x: 8, y: 8 },
  { x: 8, y: 5 },
];

function isVacate(candidate: NormalAiDecisionV7["candidates"][number]) {
  return candidate.score.priority === 1291;
}

function setupWith(seed = 2): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL"],
    allowDuplicateFactions: true,
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * The seed-2 board with every technology and every tile explored, seat 0
 * active, the given pieces as the only units (their tiles cleared to Grass),
 * and seat 0 owning a level-1 city on each listed village.
 */
function arena(
  pieces: readonly Piece[],
  villages: readonly CoordV7[],
): GameStateV7 {
  // pulp_wars-wwc: the revision-15 seed-2 board this siege layout was
  // written for (revision 16 floors capital growth and changes the board).
  const base = revision15PlayableGameV7(setupWith()).state;
  const seat = (index: number) =>
    required(base.players.find((player) => player.seat === index));
  let nextEntityId = base.nextEntityId;
  const founded: CityStateV7[] = villages.map((at) => {
    const id = cityId(nextEntityId);
    nextEntityId += 1;
    return {
      id,
      ownerId: seat(0).id,
      at,
      level: 1,
      permanentPopulation: 0,
      economicPopulation: 0,
      population: 0,
      isCapital: false,
      expanded: false,
      landGrantUsed: false,
      cityActionAvailable: false,
      rewards: [],
    };
  });
  const units = pieces.map((piece): UnitStateV7 => {
    const owner = seat(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    const id = unitId(nextEntityId);
    nextEntityId += 1;
    return {
      id,
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
  const every: CoordV7[] = [];
  for (let y = 0; y < base.board.height; y += 1)
    for (let x = 0; x < base.board.width; x += 1) every.push({ x, y });
  const cleared = pieces.map((piece) => piece.at);
  return checkedV7({
    ...base,
    nextEntityId,
    activeSeatIndex: base.turnOrder.indexOf(seat(0).id),
    players: base.players.map((player) => ({
      ...player,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 0,
      explored: every,
    })),
    cities: [...base.cities, ...founded]
      .map((city) => ({ ...city, cityActionAvailable: false }))
      .sort((left, right) => left.id - right.id),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const city = founded.find((item) => same(item.at, tile.at));
        if (city !== undefined)
          return { ...tile, site: "CITY" as const, territoryCityId: city.id };
        const near = founded.find(
          (item) =>
            Math.max(
              Math.abs(item.at.x - tile.at.x),
              Math.abs(item.at.y - tile.at.y),
            ) <= 1,
        );
        const withTerritory =
          near !== undefined && tile.territoryCityId === null
            ? { ...tile, territoryCityId: near.id }
            : tile;
        return cleared.some((at) => same(at, tile.at)) && tile.site === null
          ? {
              ...withTerritory,
              biome: withTerritory.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : withTerritory;
      }),
    },
  });
}

function seatId(state: GameStateV7, seat: number) {
  return required(state.players.find((player) => player.seat === seat)).id;
}

function viewFor(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, required(state.turnOrder[state.activeSeatIndex]));
}

function decide(state: GameStateV7): NormalAiDecisionV7 {
  return chooseNormalCommandV7(viewFor(state));
}

function apply(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(
    state,
    required(state.turnOrder[state.activeSeatIndex]),
    command,
  );
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result.state;
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("fixture value missing");
  return value;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
