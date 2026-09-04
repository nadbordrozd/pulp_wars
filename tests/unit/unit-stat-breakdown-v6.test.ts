import { describe, expect, it } from "vitest";
import {
  UNIT_ROLE_IDS,
  calculateCombatPreviewV6,
  createPlayableGameV6,
  defenseBonusForUnitV6,
  effectiveRoleRuleV6,
  effectiveUnitSightRadiusV6,
  viewForV6,
  type FactionIdV6,
  type GameStateV6,
  type MatchSetupV6,
  type PublicUnitStatBreakdownV6,
} from "../../src/engine/index";

describe("ruleset-6 public unit stat breakdowns", () => {
  it("projects every Original and Candy role from the canonical role binding", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      const state = playable(faction);
      const selected = ownedUnit(state);
      const open = openOwnedTile(state);
      for (const role of UNIT_ROLE_IDS) {
        const rule = effectiveRoleRuleV6(faction, role);
        const contextual = replaceUnit(state, selected.id, {
          role,
          at: open,
          hp: rule.maxHp,
          maxHp: rule.maxHp,
          veteran: false,
        });
        const publicStats = statsFor(contextual, selected.id);
        expect(stat(publicStats, "HP")).toMatchObject({
          current: rule.maxHp,
          base: { value: rational(rule.maxHp), source: "ROLE_BASE" },
          modifiers: [],
          total: rational(rule.maxHp),
        });
        expect(stat(publicStats, "ATTACK")).toMatchObject({
          base: { value: rational(rule.attack2, 2), source: "ROLE_BASE" },
          modifiers: [],
          total: rational(rule.attack2, 2),
        });
        expect(stat(publicStats, "DEFENSE")).toMatchObject({
          base: { value: rational(rule.defense2, 2), source: "ROLE_BASE" },
          modifiers: [],
          total: rational(rule.defense2, 2),
        });
        expect(stat(publicStats, "MOVE").total).toEqual(rational(rule.move));
        expect(stat(publicStats, "RANGE").total).toEqual(rational(rule.range));
        expect(stat(publicStats, "SIGHT").total).toEqual(
          rational(rule.sightRadius),
        );
      }
    }
  });

  it.each(["ORIGINAL", "CANDY"] as const)(
    "attributes HP, defense, and sight modifiers exactly for %s",
    (faction) => {
      const state = playable(faction);
      const selected = ownedUnit(state);
      const city = state.cities.find(
        (candidate) => candidate.ownerId === selected.ownerId,
      );
      if (city === undefined) throw new Error("Missing city");

      const promoted = replaceUnit(state, selected.id, {
        hp: 15,
        maxHp: 15,
        veteran: true,
      });
      expect(stat(statsFor(promoted, selected.id), "HP")).toMatchObject({
        current: 15,
        modifiers: [
          {
            value: rational(5),
            source: "PROMOTION",
            sourceLabel: "Promotion",
          },
        ],
        total: rational(15),
      });

      const cityDefense = stat(statsFor(state, selected.id), "DEFENSE");
      expect(cityDefense.modifiers).toMatchObject([
        { value: rational(1), source: "FRIENDLY_CITY" },
      ]);
      expect(cityDefense.total).toEqual(rational(3));
      expect(defenseBonusForUnitV6(state, selected)).toEqual({
        numerator: 3,
        denominator: 2,
      });

      const forestState = replaceUnit(state, selected.id, {
        at: forestOwnedTile(state),
      });
      expect(stat(statsFor(forestState, selected.id), "DEFENSE")).toMatchObject(
        {
          modifiers: [{ value: rational(1), source: "FOREST" }],
          total: rational(3),
        },
      );

      const fortified = replacePlayer(state, selected.ownerId, (player) => ({
        ...player,
        researchedTechs: player.researchedTechs.includes("FORTIFICATION")
          ? player.researchedTechs
          : [...player.researchedTechs, "FORTIFICATION"],
      }));
      expect(stat(statsFor(fortified, selected.id), "DEFENSE")).toMatchObject({
        modifiers: [{ value: rational(2), source: "FORTIFICATION" }],
        total: rational(4),
      });

      const walled: GameStateV6 = {
        ...fortified,
        cities: fortified.cities.map((candidate) =>
          candidate.id === city.id
            ? {
                ...candidate,
                rewards: [
                  ...candidate.rewards,
                  { reachedLevel: 3, reward: "WALLS" as const },
                ],
              }
            : candidate,
        ),
      };
      expect(stat(statsFor(walled, selected.id), "DEFENSE")).toMatchObject({
        modifiers: [{ value: rational(6), source: "CITY_WALLS" }],
        total: rational(8),
      });

      const mountain = mountainOwnedTile(state);
      const highGround = replacePlayer(
        replaceUnit(state, selected.id, { at: mountain }),
        selected.ownerId,
        (player) => ({
          ...player,
          researchedTechs: player.researchedTechs.includes("SURVEYING")
            ? player.researchedTechs
            : [...player.researchedTechs, "SURVEYING"],
        }),
      );
      const highGroundUnit = requireUnit(highGround, selected.id);
      const projected = statsFor(highGround, selected.id);
      expect(stat(projected, "DEFENSE")).toMatchObject({
        modifiers: [{ value: rational(1), source: "MOUNTAIN" }],
        total: rational(3),
      });
      expect(stat(projected, "SIGHT")).toMatchObject({
        modifiers: [{ value: rational(1), source: "HIGH_GROUND" }],
        total: rational(2),
      });
      expect(effectiveUnitSightRadiusV6(highGround, highGroundUnit)).toBe(2);
    },
  );

  it("uses the same active Charge bonus as canonical combat preview", () => {
    const state = playable("ORIGINAL");
    const attacker = ownedUnit(state);
    const defender = state.units.find(
      (candidate) => candidate.ownerId !== attacker.ownerId,
    );
    if (defender === undefined) throw new Error("Missing defender");
    const attackerAt = openOwnedTile(state);
    const targetAt = adjacentOpenTile(state, attackerAt);
    const charged = replaceUnit(
      replaceUnit(state, attacker.id, {
        role: "RAIDER",
        at: attackerAt,
        activation: {
          ...attacker.activation,
          moved: true,
          movedPathLength: 2,
        },
      }),
      defender.id,
      { at: targetAt },
    );
    const attack = stat(statsFor(charged, attacker.id), "ATTACK");
    const preview = calculateCombatPreviewV6(charged, attacker.id, {
      kind: "UNIT",
      unitId: defender.id,
    });
    expect(attack).toMatchObject({
      base: { value: rational(5, 2) },
      modifiers: [{ value: rational(1), source: "CHARGE" }],
      total: rational(7, 2),
    });
    expect(preview.chargeApplied).toBe(true);
    expect(preview.attack2).toBe(
      (attack.total.numerator * 2) / attack.total.denominator,
    );
  });

  it("omits hidden units and their context from the presentation projection", () => {
    const state = playable("ORIGINAL");
    const viewer = state.humanPlayerId;
    const rival = state.units.find((unit) => unit.ownerId !== viewer);
    if (rival === undefined) throw new Error("Missing rival");
    const hidden = state.board.tiles.find(
      (tile) =>
        !state.players
          .find((player) => player.id === viewer)
          ?.explored.some((at) => same(at, tile.at)) &&
        !state.cities.some((city) => same(city.at, tile.at)),
    );
    if (hidden === undefined) throw new Error("Missing hidden tile");
    const hiddenState = replaceUnit(state, rival.id, { at: hidden.at });
    const changedHiddenState = replaceUnit(hiddenState, rival.id, {
      role: "JUGGERNAUT",
      hp: 45,
      maxHp: 45,
      veteran: true,
      activation: { ...rival.activation, movedPathLength: 9 },
    });
    const first = viewForV6(hiddenState, viewer);
    const second = viewForV6(changedHiddenState, viewer);
    expect(first.units.some((unit) => unit.id === rival.id)).toBe(false);
    expect(first.unitStats).toEqual(second.unitStats);
    expect(first.unitStats.some((entry) => entry.unitId === rival.id)).toBe(
      false,
    );
  });
});

function playable(faction: FactionIdV6): GameStateV6 {
  const setup: MatchSetupV6 = {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 8675309,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, faction === "ORIGINAL" ? "CANDY" : "ORIGINAL"],
  };
  const created = createPlayableGameV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function ownedUnit(state: GameStateV6) {
  const unit = state.units.find((candidate) =>
    state.players.some(
      (player) =>
        player.id === candidate.ownerId && player.controller === "HUMAN",
    ),
  );
  if (unit === undefined) throw new Error("Missing owned unit");
  return unit;
}

function openOwnedTile(state: GameStateV6) {
  const owner = ownedUnit(state).ownerId;
  const tile = state.board.tiles.find(
    (candidate) =>
      candidate.terrain === "GRASS" &&
      candidate.site === null &&
      candidate.territoryCityId === null &&
      !state.units.some((unit) => same(unit.at, candidate.at)) &&
      state.players
        .find((player) => player.id === owner)
        ?.explored.some((at) => same(at, candidate.at)),
  );
  if (tile === undefined) throw new Error("Missing open tile");
  return tile.at;
}

function mountainOwnedTile(state: GameStateV6) {
  const owner = ownedUnit(state).ownerId;
  const tile = state.board.tiles.find(
    (candidate) =>
      candidate.terrain === "MOUNTAIN" &&
      candidate.site === null &&
      candidate.territoryCityId === null &&
      !state.units.some((unit) => same(unit.at, candidate.at)) &&
      state.players
        .find((player) => player.id === owner)
        ?.explored.some((at) => same(at, candidate.at)),
  );
  if (tile === undefined) throw new Error("Missing explored Mountain");
  return tile.at;
}

function forestOwnedTile(state: GameStateV6) {
  const owner = ownedUnit(state).ownerId;
  const tile = state.board.tiles.find(
    (candidate) =>
      candidate.terrain === "FOREST" &&
      candidate.site === null &&
      candidate.territoryCityId === null &&
      !state.units.some((unit) => same(unit.at, candidate.at)) &&
      state.players
        .find((player) => player.id === owner)
        ?.explored.some((at) => same(at, candidate.at)),
  );
  if (tile === undefined) throw new Error("Missing explored Forest");
  return tile.at;
}

function adjacentOpenTile(state: GameStateV6, at: { x: number; y: number }) {
  const tile = state.board.tiles.find(
    (candidate) =>
      Math.max(
        Math.abs(candidate.at.x - at.x),
        Math.abs(candidate.at.y - at.y),
      ) === 1 &&
      candidate.site === null &&
      !state.units.some((unit) => same(unit.at, candidate.at)),
  );
  if (tile === undefined) throw new Error("Missing adjacent tile");
  return tile.at;
}

function replaceUnit(
  state: GameStateV6,
  unitId: number,
  changes: Partial<GameStateV6["units"][number]>,
): GameStateV6 {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId ? { ...unit, ...changes } : unit,
    ),
  };
}

function replacePlayer(
  state: GameStateV6,
  playerId: number,
  replace: (
    player: GameStateV6["players"][number],
  ) => GameStateV6["players"][number],
): GameStateV6 {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? replace(player) : player,
    ),
  };
}

function requireUnit(state: GameStateV6, unitId: number) {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) throw new Error("Missing unit");
  return unit;
}

function statsFor(state: GameStateV6, unitId: number) {
  const view = viewForV6(state, state.humanPlayerId);
  const projection = view.unitStats.find((entry) => entry.unitId === unitId);
  if (projection === undefined) throw new Error("Missing public stats");
  return projection.stats;
}

function stat(
  stats: readonly PublicUnitStatBreakdownV6[],
  id: PublicUnitStatBreakdownV6["id"],
) {
  const result = stats.find((candidate) => candidate.id === id);
  if (result === undefined) throw new Error(`Missing ${id}`);
  return result;
}

function rational(numerator: number, denominator = 1) {
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a === 0 ? 1 : a;
}

function same(left: { x: number; y: number }, right: { x: number; y: number }) {
  return left.x === right.x && left.y === right.y;
}
