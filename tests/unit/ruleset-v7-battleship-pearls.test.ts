import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  FACTION_IDS_V7,
  GATHER_PEARLS_GAIN_V7,
  GATHER_PEARLS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewEconomicV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  seatV7,
  type NavalArenaUnitV7,
} from "../fixtures/v7-naval-branch";

// `pulp_wars-5ti.13` (`pulp-wars-poc-7r84`; the user, 2026-10-14): the
// Battleship has Attack 5 and Defense 3 (6 and 4 before) in every roster,
// and Gather Pearls pays 12 Coins for 2, a gain of 10 (4 for 2 before);
// `pulp_wars-5ti.14` makes it free, paying 10 (the same gain).
// Hand-built states on the naval arena of `pulp_wars-5ti.2` (rows 3 and 7
// Shallow Water, rows 4 to 6 Deep Water; seat 0's capital on (5, 2) with a
// Port on (4, 3)).

describe("the identity", () => {
  // `pulp_wars-5ti.14` (free Pearls) was 7r86; 7r84 (`pulp_wars-5ti.13`) and
  // 7r85 (the Cult redesign's roster) came before it. The natural water of
  // `pulp_wars-ykw.8` took 7r87 and the Cult redesign's Star-fall and
  // daemons (`pulp_wars-mch9.34`, `mch9.35`) 7r88 and its Favour economy and
  // warden (`mch9.32`, `mch9.33`) 7r89 and its Imp (`mch9.36`) 7r90 and its
  // Gibbering Mass (`mch9.37`) 7r91, so all of them are retired with their
  // keys.
  it("was 7r86 after 7r85 and 7r84, all their save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r98");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r98.current");
    expect(PRIOR_RULESET_7_IDS.slice(-14, -10)).toEqual([
      "pulp-wars-poc-7r84",
      "pulp-wars-poc-7r85",
      "pulp-wars-poc-7r86",
      "pulp-wars-poc-7r87",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-14, -10)).toEqual([
      "pulpWars.save.v7r84.current",
      "pulpWars.save.v7r85.current",
      "pulpWars.save.v7r86.current",
      "pulpWars.save.v7r87.current",
    ]);
  });
});

describe("the Battleship", () => {
  it("has Attack 5 and Defense 3 in every faction's registration, and nothing else moved", () => {
    for (const faction of FACTION_IDS_V7)
      expect(
        effectiveRoleRuleV7("BATTLESHIP", faction as FactionIdV7),
        faction,
      ).toMatchObject({
        // The Dwarf Ironclad: 18 Coins, Armoured (`pulp_wars-5ti.20`); the
        // Candy Pie Galleon: 17 Coins, Splat (`pulp_wars-5ti.21`).
        cost: faction === "DWARF" ? 18 : faction === "CANDY" ? 17 : 16,
        // The Martian Hover Cruiser: 20 HP behind a Shield of 3
        // (`pulp_wars-5ti.19`).
        maxHp: faction === "MARTIAN" ? 20 : 25,
        attack2: 10,
        defense2: 6,
        move: 2,
        range: 3,
        sightRadius: 3,
        mayUsePrimaryActionAfterMove: false,
      });
  });

  const fight = (
    units: readonly NavalArenaUnitV7[],
    attackerAt: CoordV7,
    targetAt: CoordV7,
  ): CombatPreviewV7 => {
    const state = navalArenaV7({ units });
    const attacker = navalUnitAtV7(state, attackerAt);
    const target = navalUnitAtV7(state, targetAt);
    const preview = queryCombatPreviewV7(
      viewForV7(state, seatV7(state, 0).id),
      attacker.id,
      target.id,
    );
    if (preview === null) throw new Error("no preview");
    const result = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: target.id,
    });
    const event = result.events.find(
      (entry) => entry.kind === "COMBAT_RESOLVED",
    );
    if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    // The public preview is the resolution.
    expect(preview).toEqual(event.preview);
    return event.preview;
  };

  // The worked examples of current rules section 14.3 (full HP, open water).
  it("sinks a Patrol Boat from three tiles (all 10 of its HP)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 5, y: 4 },
      ),
    ).toMatchObject({
      attack2: 10,
      damageToDefender: 10,
      defenderDies: true,
      damageToAttacker: 0,
    });
  });

  it("deals 14 to a Battleship and takes 5 (16 and 7 before)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 4, y: 4 },
      ),
    ).toMatchObject({
      attack2: 10,
      defense2: 6,
      damageToDefender: 14,
      damageToAttacker: 5,
      retaliation: true,
    });
  });

  it("takes 4 from a Patrol Boat's plain attack and answers with 8 (3 and 12 before)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 3, y: 4 },
      ),
    ).toMatchObject({
      ram: false,
      damageToDefender: 4,
      damageToAttacker: 8,
      attackerDies: false,
    });
  });
});

describe("Gather Pearls", () => {
  // Pearls on (6, 3): Shallow Water in seat 0's capital's territory.
  const PEARLS: CoordV7 = { x: 6, y: 3 };
  const pearlArena = (
    coins: number,
    faction: FactionIdV7 = "ORIGINAL",
    technologies: readonly TechnologyIdV7[] = NAVAL_TECHS_V7,
  ): GameStateV7 => {
    const base = navalArenaV7({
      factions: [faction, "UNDEAD"],
      technologies: [technologies, NAVAL_TECHS_V7],
      // The Ice Folk build no Port.
      ports: [faction !== "ICE_FOLK", true],
      units: [],
    });
    const human = seatV7(base, 0).id;
    return {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === PEARLS.x && tile.at.y === PEARLS.y
            ? { ...tile, resource: "PEARLS" as const }
            : tile,
        ),
      },
      players: base.players.map((player) =>
        player.id === human ? { ...player, coins } : player,
      ),
    };
  };
  const gather: CommandV7 = { kind: "GATHER_PEARLS", at: PEARLS };

  // `pulp_wars-5ti.14` (the user, 2026-10-16): free, and it pays 10 (2 for
  // 12 before), the same gain of 10.
  it("costs nothing and pays 10, a gain of 10", () => {
    expect(GATHER_PEARLS_V7).toEqual({ cost: 0, coinsReceived: 10 });
    expect(GATHER_PEARLS_GAIN_V7).toBe(10);
    const state = pearlArena(3);
    const human = seatV7(state, 0).id;
    expect(
      state.board.tiles.find((tile) => tile.at.x === 6 && tile.at.y === 3),
    ).toMatchObject({ terrain: "SHALLOW_WATER", resource: "PEARLS" });
    const view = viewForV7(state, human);
    expect(queryPlayerCommandsV7(view)).toContainEqual(gather);
    const preview = previewEconomicV7(view, gather);
    expect(preview.ok && preview.preview.cost).toBe(0);
    expect(preview.ok && preview.preview.coinsReceived).toBe(10);
    const result = acceptV7(state, 0, gather);
    expect(seatV7(result.state, 0).coins).toBe(13);
    expect(result.events[0]).toEqual({
      kind: "PEARLS_GATHERED",
      playerId: human,
      cityId: expect.any(Number) as number,
      at: PEARLS,
      cost: 0,
      coinsReceived: 10,
      coinDelta: 10,
    });
    expect(
      result.state.board.tiles.find(
        (tile) => tile.at.x === PEARLS.x && tile.at.y === PEARLS.y,
      )?.resource,
    ).toBeNull();
  });

  it("needs no Coins: an empty treasury is offered it and gathers it", () => {
    const state = pearlArena(0);
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(queryPlayerCommandsV7(view)).toContainEqual(gather);
    const preview = previewEconomicV7(view, gather);
    expect(preview).toMatchObject({
      ok: true,
      preview: { cost: 0, coinsReceived: 10 },
    });
    const result = applyCommandV7(state, seatV7(state, 0).id, gather);
    expect(result.accepted).toBe(true);
    expect(seatV7(result.state, 0).coins).toBe(10);
  });

  it("is a harvest the Normal AI takes for its Coins, naval seat or not", () => {
    for (const [faction, techs] of [
      ["ORIGINAL", NAVAL_TECHS_V7],
      // The Ice Folk have no ships: never a naval seat.
      ["ICE_FOLK", ["SHORECRAFT", "NAVIGATION"]],
    ] as const) {
      // `pulp_wars-5ti.14`: with no Coins at all, as it is free.
      for (const coins of [0, 2]) {
        const state = pearlArena(coins, faction, techs);
        const view = viewForV7(state, seatV7(state, 0).id);
        expect(queryPlayerCommandsV7(view), faction).toContainEqual(gather);
        const score = scoreCommandV7(view, gather);
        expect(score.priority, `${faction} ${coins}`).toBeGreaterThanOrEqual(
          1140,
        );
        // The Coins it pays less the Coins it costs (none).
        expect(
          score.immediateValue,
          `${faction} ${coins}`,
        ).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it("is the Normal AI's pick with an empty treasury (one decision)", () => {
    const state = pearlArena(0);
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatV7(state, 0).id),
    );
    expect(decision.command).toEqual(gather);
  });
});
