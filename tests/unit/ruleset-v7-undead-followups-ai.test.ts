import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  publicProjectedDamageForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
  PLAGUE_DURATION_TURNS_V7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";

// `pulp_wars-vkq.21` Normal AI follow-ups on the seed-2 DRY_LAND two-seat
// revision-13 board (11 x 11; rows 0-4 west of x 6 are open neutral land).
// Seat 0 moves, with every technology; the listed tiles are Shallow Water.

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

describe("vkq.21 Normal AI: Battleship splash in unit safety", () => {
  // A Human Battleship on (0, 1) reaches (3, 1) but not (4, 1); a unit on
  // (4, 1) next to a friendly unit on (3, 1) is splashed when the Battleship
  // shells that friend.
  const pieces = (lichHp: number): readonly Piece[] => [
    { seat: 1, role: "BATTLESHIP", at: { x: 0, y: 1 }, form: "NAVAL" },
    { seat: 0, role: "GUARD", at: { x: 3, y: 1 } },
    { seat: 0, role: "CATAPULT", at: { x: 5, y: 1 }, hp: lichHp },
  ];

  it("counts Battleship splash onto a Lich beside a shelled friend", () => {
    const state = arena(["UNDEAD", "ORIGINAL"], pieces(10), {
      water: [{ x: 0, y: 1 }],
    });
    const view = viewFor(state);
    const lich = unitAt(state, { x: 5, y: 1 });
    const battleship = unitAt(state, { x: 0, y: 1 });
    const move = moveCommand(lich, [{ x: 4, y: 1 }]);
    expect(queryPlayerCommandsV7(view)).toContainEqual(move);
    const damage = publicProjectedDamageForPolicyV7(
      view,
      publicUnit(view, battleship),
      publicUnit(view, lich),
      { x: 4, y: 1 },
    );
    const splash = Math.min(lich.hp, Math.max(1, Math.ceil(damage / 2)));
    expect(splash).toBeGreaterThan(0);
    expect(scoreCommandV7(view, move).safetyValue).toBe(-splash);
  });

  it("keeps a Lich out of lethal Battleship splash", () => {
    const state = arena(["UNDEAD", "ORIGINAL"], pieces(1), {
      water: [{ x: 0, y: 1 }],
    });
    const view = viewFor(state);
    const lich = unitAt(state, { x: 5, y: 1 });
    // Both steps close on the Human capital (2, 8); only (4, 2) is beside
    // the shelled Guard.
    const exposed = moveCommand(lich, [{ x: 4, y: 2 }]);
    expect(queryPlayerCommandsV7(view)).toContainEqual(exposed);
    expect(scoreCommandV7(view, exposed).priority).toBe(-1);
    expect(
      scoreCommandV7(view, moveCommand(lich, [{ x: 5, y: 2 }])).priority,
    ).toBeGreaterThanOrEqual(0);
  });

  it("leaves all-Human safety unchanged (the heuristic is Undead-gated)", () => {
    const state = arena(["ORIGINAL", "ORIGINAL"], pieces(10), {
      water: [{ x: 0, y: 1 }],
    });
    const view = viewFor(state);
    const catapult = unitAt(state, { x: 5, y: 1 });
    expect(
      scoreCommandV7(view, moveCommand(catapult, [{ x: 4, y: 1 }])).safetyValue,
    ).toBe(0);
  });
});

describe("vkq.21 Normal AI: Vampires attack only when they survive", () => {
  // Vampire (3, 2) beside a Human Guard (4, 2); a Human Catapult on (6, 2)
  // covers (3, 2) at range 3.
  const vampireAt = { x: 3, y: 2 };
  const guardAt = { x: 4, y: 2 };
  const catapultAt = { x: 6, y: 2 };

  it("does not chip a defender from inside visible lethal reach", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: vampireAt },
        { seat: 1, role: "GUARD", at: guardAt },
        { seat: 1, role: "CATAPULT", at: catapultAt },
      ],
    );
    const view = viewFor(state);
    const vampire = unitAt(state, vampireAt);
    const guard = unitAt(state, guardAt);
    const attack = attackCommand(vampire, guard);
    expect(queryCombatPreviewV7(view, vampire.id, guard.id)?.defenderDies).toBe(
      false,
    );
    expect(queryPlayerCommandsV7(view)).toContainEqual(attack);
    expect(candidateCommands(view)).not.toContainEqual(attack);
  });

  it("still chips when the Vampire survives the visible reply", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: vampireAt },
        { seat: 1, role: "GUARD", at: guardAt },
      ],
    );
    const attack = attackCommand(
      unitAt(state, vampireAt),
      unitAt(state, guardAt),
    );
    expect(candidateCommands(viewFor(state))).toContainEqual(attack);
  });

  it("still takes a kill inside lethal reach", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: vampireAt },
        { seat: 1, role: "GUARD", at: guardAt, hp: 2 },
        { seat: 1, role: "CATAPULT", at: catapultAt },
      ],
    );
    const view = viewFor(state);
    const vampire = unitAt(state, vampireAt);
    const guard = unitAt(state, guardAt);
    expect(queryCombatPreviewV7(view, vampire.id, guard.id)?.defenderDies).toBe(
      true,
    );
    expect(candidateCommands(view)).toContainEqual(
      attackCommand(vampire, guard),
    );
  });

  it("never walks into lethal reach and leaves it when standing in it", () => {
    // Catapult (5, 1) covers x 2..4 of row 1 (range 2-3), not (1, 1).
    const inside = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 1 } },
        { seat: 1, role: "CATAPULT", at: { x: 5, y: 1 } },
      ],
    );
    const insideView = viewFor(inside);
    const vampire = unitAt(inside, { x: 2, y: 1 });
    expect(
      scoreCommandV7(insideView, moveCommand(vampire, [{ x: 1, y: 1 }]))
        .priority,
    ).toBe(1150);

    const outside = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 1, y: 1 } },
        { seat: 1, role: "CATAPULT", at: { x: 5, y: 1 } },
      ],
    );
    const outsideView = viewFor(outside);
    const safeVampire = unitAt(outside, { x: 1, y: 1 });
    const into = moveCommand(safeVampire, [{ x: 2, y: 1 }]);
    expect(queryPlayerCommandsV7(outsideView)).toContainEqual(into);
    expect(scoreCommandV7(outsideView, into).priority).toBe(-1);
  });
});

describe("vkq.21 Normal AI: living seats hunt a plaguing Lich", () => {
  // Lich (5, 0) plagues a Human Guard at (8, 3); a Human Catapult on (0, 3)
  // is two tiles short of its range band (2-3) on the Lich.
  const lichAt = { x: 5, y: 0 };
  const victimAt = { x: 8, y: 3 };
  const catapultAt = { x: 0, y: 3 };

  it("moves a Catapult toward a firing position on the source Lich", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CATAPULT", at: catapultAt },
        { seat: 0, role: "GUARD", at: victimAt },
        { seat: 1, role: "CATAPULT", at: lichAt },
      ],
      { plagued: [{ at: victimAt, source: lichAt }] },
    );
    const view = viewFor(state);
    const catapult = unitAt(state, catapultAt);
    const approach = moveCommand(catapult, [{ x: 1, y: 3 }]);
    expect(queryPlayerCommandsV7(view)).toContainEqual(approach);
    expect(scoreCommandV7(view, approach).priority).toBe(1095);
    // A step that does not close the gap is not a hunt move.
    expect(
      scoreCommandV7(view, moveCommand(catapult, [{ x: 0, y: 4 }])).priority,
    ).toBeLessThan(1095);
  });

  it("does not hunt without Plague or into visible lethal reach", () => {
    const calm = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CATAPULT", at: catapultAt },
        { seat: 0, role: "GUARD", at: victimAt },
        { seat: 1, role: "CATAPULT", at: lichAt },
      ],
    );
    const catapult = unitAt(calm, catapultAt);
    expect(
      scoreCommandV7(viewFor(calm), moveCommand(catapult, [{ x: 1, y: 3 }]))
        .priority,
    ).toBeLessThan(1095);

    // A Zombie on (2, 2) makes (1, 2) and (1, 3) lethal for a 1-HP Catapult;
    // (1, 4) closes the gap as well and stays out of reach.
    const guarded = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CATAPULT", at: catapultAt, hp: 1 },
        { seat: 0, role: "GUARD", at: victimAt },
        { seat: 1, role: "CATAPULT", at: lichAt },
        { seat: 1, role: "GUARD", at: { x: 2, y: 2 } },
      ],
      { plagued: [{ at: victimAt, source: lichAt }] },
    );
    const view = viewFor(guarded);
    const hunter = unitAt(guarded, catapultAt);
    expect(
      scoreCommandV7(view, moveCommand(hunter, [{ x: 1, y: 3 }])).priority,
    ).toBeLessThan(1095);
    expect(
      scoreCommandV7(view, moveCommand(hunter, [{ x: 1, y: 4 }])).priority,
    ).toBe(1095);
  });
});

describe("vkq.21 Normal AI: Liches and Vampires stay ashore", () => {
  it("boards other units but never a Lich or Vampire (HU Archipelago 14, seed 29)", () => {
    // The pre-vkq.21 policy embarked a Vampire in round 7 of seed 1 on
    // revision-15 maps. pulp_wars-wwc: revision-16 maps and the growth-first
    // opening delay seed 1's first Undead embarkation past round 12; seed 29
    // embarks three Undead units within 12 rounds.
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
      seed: 29,
      width: 14,
      height: 14,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "ARCHIPELAGO",
    };
    const result = runAiMatchV7(setup, {
      maxRounds: 12,
      recordCheckpointHashes: false,
    });
    const undead = required(
      result.state.players.find((player) => player.faction === "UNDEAD"),
    ).id;
    // Revision 18: the starting unit may be among the first to embark, so
    // the role map starts from the initial state.
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const roles = new Map<number, UnitRoleIdV7>(
      created.state.units.map((unit) => [unit.id, unit.role]),
    );
    const embarked: UnitRoleIdV7[] = [];
    for (const record of result.commandLog)
      for (const event of record.events) {
        if (
          event.kind === "UNIT_TRAINED" ||
          event.kind === "UNIT_REWARD_GRANTED"
        )
          roles.set(event.unitId, event.role);
        if (event.kind === "TREASURE_CAPTURED" && event.spawnedUnitId !== null)
          roles.set(event.spawnedUnitId, "KNIGHT");
        if (event.kind === "UNIT_EMBARKED" && record.playerId === undead)
          embarked.push(required(roles.get(event.unitId)));
      }
    expect(result.errors).toEqual([]);
    expect(embarked.length).toBeGreaterThan(0);
    expect(embarked).not.toContain("CATAPULT");
    expect(embarked).not.toContain("KNIGHT");
  });
});

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly form?: UnitStateV7["form"];
}

interface ArenaOptions {
  readonly water?: readonly CoordV7[];
  /** Plagued pieces (by coordinate) and the coordinate of their source. */
  readonly plagued?: readonly { at: CoordV7; source: CoordV7 }[];
}

function setupWith(factions: readonly FactionIdV7[]): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 2,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

/**
 * The seed-2 revision-13 board with every technology, the given pieces as
 * the only units, seat 0 active with every tile explored, each piece tile
 * that is not a settlement cleared to Grass (or Shallow Water), and the given
 * Plague (fresh, three turns left).
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const size = base.board.width;
  const water = options.water ?? [];
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
      form: piece.form ?? "LAND",
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
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) every.push({ x, y });
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(player(0).id),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 0,
      explored: every,
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    plagued: (options.plagued ?? [])
      .map((entry) => ({
        unitId: idAt(entry.at),
        sourceUnitId: idAt(entry.source),
        turnsRemaining: PLAGUE_DURATION_TURNS_V7,
      }))
      .sort((left, right) => left.unitId - right.unitId),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        water.some((at) => same(at, tile.at))
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
              site: null,
            }
          : cleared.some((at) => same(at, tile.at)) && tile.site === null
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

function candidateCommands(view: PlayerViewV7): readonly CommandV7[] {
  return chooseNormalCommandV7(view).candidates.map(({ command }) => command);
}

function attackCommand(attacker: UnitStateV7, target: UnitStateV7): CommandV7 {
  return { kind: "ATTACK", unitId: attacker.id, targetUnitId: target.id };
}

function moveCommand(unit: UnitStateV7, path: readonly CoordV7[]): CommandV7 {
  return { kind: "MOVE", unitId: unit.id, path: [...path] };
}

function viewFor(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, required(state.turnOrder[state.activeSeatIndex]));
}

function publicUnit(view: PlayerViewV7, unit: UnitStateV7) {
  return required(view.units.find((item) => item.id === unit.id));
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
