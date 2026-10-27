import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  TECHNOLOGY_IDS_V7,
  WINDMILL_HEAL_V7,
  roleMechanicsV7,
  startTurnEconomyV7,
  viewForV7,
  windmillHealsUnitV7,
  type CityStateV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { windmillStagingGainV7 } from "../../src/ai/v7";
import { specialBoundaryNoticeV7 } from "../../src/render/dom/app-view-v7";
import {
  goblinArenaV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";

/**
 * Bead pulp_wars-a7eb (the user, 2026-10-27: "the different versions of
 * the windmill should all offer healing to their faction"), `7r118`: every
 * faction's Windmill (the Bone Mill, Grinding Stone, Solar Array, Steam
 * Pump, ...) heals its owner's units next to it at the owner's Start Turn,
 * the Dwarf constructs included; never an Egg or a daemon; a captured one
 * heals its new owner's units. Hand-built states, one Start Turn each.
 */

type HealEvent = Extract<
  DomainEventV7,
  { readonly kind: "WINDMILL_HEALING_RESOLVED" }
>;

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/**
 * A Windmill tile in the territory of `seat`'s city of an arena of
 * `factions`, and up to three free tiles next to it.
 */
function millSite(
  factions: readonly FactionIdV7[],
  seat: number,
): { readonly mill: CoordV7; readonly around: readonly CoordV7[] } {
  const probe = goblinArenaV7(factions, []);
  const owner = seatIdV7(probe, seat);
  const city = probe.cities.find((candidate) => candidate.ownerId === owner);
  if (city === undefined) throw new Error("no city");
  const centers = probe.cities.map((candidate) => candidate.at);
  const free = (at: CoordV7): boolean => {
    const tile = probe.board.tiles.find((candidate) =>
      sameV7(candidate.at, at),
    );
    return (
      tile !== undefined &&
      tile.site === null &&
      !centers.some((center) => sameV7(center, at))
    );
  };
  for (const tile of probe.board.tiles) {
    if (tile.territoryCityId !== city.id || !free(tile.at)) continue;
    const around = probe.board.tiles
      .filter(
        (candidate) =>
          chebyshev(candidate.at, tile.at) === 1 && free(candidate.at),
      )
      .map((candidate) => candidate.at)
      .slice(0, 3);
    if (around.length === 3) return { mill: tile.at, around };
  }
  throw new Error("no Windmill site");
}

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly hp: number;
}

/**
 * The arena with `pieces` on the tiles around a Windmill of `millSeat`'s
 * city (each piece's tile in order), and the Windmill built.
 */
function millArena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  millSeat = 0,
  techs?: Readonly<
    Record<number, readonly (typeof TECHNOLOGY_IDS_V7)[number][]>
  >,
): {
  readonly state: GameStateV7;
  readonly mill: CoordV7;
  readonly at: readonly CoordV7[];
} {
  const { mill, around } = millSite(factions, millSeat);
  const arena = goblinArenaV7(
    factions,
    pieces.map((piece, index) => {
      const at = around[index];
      if (at === undefined) throw new Error("too many pieces");
      return { seat: piece.seat, role: piece.role, at, hp: piece.hp };
    }),
    techs === undefined ? {} : { techs },
  );
  const state: GameStateV7 = {
    ...arena,
    board: {
      ...arena.board,
      tiles: arena.board.tiles.map((tile) =>
        sameV7(tile.at, mill)
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: "WINDMILL" as const,
            }
          : tile,
      ),
    },
  };
  return { state, mill, at: around.slice(0, pieces.length) };
}

function startTurn(
  state: GameStateV7,
  seat: number,
): {
  readonly state: GameStateV7;
  readonly healing: readonly HealEvent[];
} {
  const owner = seatIdV7(state, seat);
  const player = state.players.find((candidate) => candidate.id === owner);
  if (player === undefined) throw new Error("no player");
  const started = startTurnEconomyV7(state, player, false);
  return {
    state: started.state,
    healing: started.events.filter(
      (event): event is HealEvent => event.kind === "WINDMILL_HEALING_RESOLVED",
    ),
  };
}

const other = (faction: FactionIdV7): FactionIdV7 =>
  faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL";

describe("every faction's Windmill heals its own units (pulp_wars-a7eb, 7r118)", () => {
  it("heals a wounded unit of each of the nine factions next to its own Windmill", () => {
    for (const faction of FACTION_IDS_V7) {
      const { state, mill, at } = millArena(
        [faction, other(faction)],
        [{ seat: 0, role: "FIGHTER", hp: 1 }],
      );
      const before = unitAtV7(state, at[0] as CoordV7);
      const { state: after, healing } = startTurn(state, 0);
      const amount = Math.min(WINDMILL_HEAL_V7, before.maxHp - before.hp);
      expect(healing, faction).toEqual([
        expect.objectContaining({
          at: mill,
          results: [{ unitId: before.id, amount, hpAfter: before.hp + amount }],
        }),
      ]);
      expect(unitAtV7(after, at[0] as CoordV7).hp, faction).toBe(1 + amount);
    }
  });

  it("heals the Dwarf constructs next to a Steam Pump (they were skipped before 7r118)", () => {
    const roles = ["MARKSMAN", "KNIGHT", "JUGGERNAUT"] as const;
    for (const role of roles)
      expect(roleMechanicsV7(role, "DWARF").construct, role).toBe(true);
    const { state, at } = millArena(
      ["DWARF", "ORIGINAL"],
      roles.map((role) => ({ seat: 0, role, hp: 3 })),
    );
    const { state: after, healing } = startTurn(state, 0);
    const healed = healing.flatMap((event) => event.results);
    expect(healed).toHaveLength(roles.length);
    for (const coord of at) {
      const unit = unitAtV7(state, coord);
      const amount = Math.min(WINDMILL_HEAL_V7, unit.maxHp - unit.hp);
      expect(healed).toContainEqual({
        unitId: unit.id,
        amount,
        hpAfter: 3 + amount,
      });
      expect(unitAtV7(after, coord).hp).toBe(3 + amount);
    }
  });

  it("heals the units of a captured Windmill's new owner, without its technology, and not the old owner's", () => {
    // A Dwarf Steam Pump in the Dwarf city's land; the city now belongs to
    // the Human seat, which has no Milling.
    const {
      state: built,
      mill,
      at,
    } = millArena(
      ["ORIGINAL", "DWARF"],
      [
        { seat: 0, role: "FIGHTER", hp: 2 },
        { seat: 1, role: "FIGHTER", hp: 2 },
      ],
      1,
      {
        0: TECHNOLOGY_IDS_V7.filter((id) => id !== "MILLING"),
        1: TECHNOLOGY_IDS_V7,
      },
    );
    const human = seatIdV7(built, 0);
    const dwarf = seatIdV7(built, 1);
    const millTile = built.board.tiles.find((tile) => sameV7(tile.at, mill));
    const captured: GameStateV7 = {
      ...built,
      cities: built.cities.map((city): CityStateV7 =>
        city.id === millTile?.territoryCityId
          ? { ...city, ownerId: human }
          : city,
      ),
    };
    expect(
      captured.cities.find((city) => city.id === millTile?.territoryCityId)
        ?.ownerId,
    ).toBe(human);
    const humanUnit = unitAtV7(captured, at[0] as CoordV7);
    const dwarfUnit = unitAtV7(captured, at[1] as CoordV7);
    expect(humanUnit.ownerId).toBe(human);
    expect(dwarfUnit.ownerId).toBe(dwarf);
    const humanTurn = startTurn(captured, 0);
    expect(humanTurn.healing.flatMap((event) => event.results)).toEqual([
      { unitId: humanUnit.id, amount: 6, hpAfter: 8 },
    ]);
    // The Dwarf seat's Start Turn: the mill is no longer its own.
    expect(startTurn(captured, 1).healing).toEqual([]);
  });

  it("never heals an Egg or a daemon, and heals any other wounded unit", () => {
    // The full Egg round is in ruleset-v7-dinosaur-eggs.test.ts ("is not
    // healed, Tended, or Rallied").
    expect(windmillHealsUnitV7({ form: "EGG", hp: 1, maxHp: 6 })).toBe(false);
    expect(
      windmillHealsUnitV7({
        form: "LAND",
        hp: 1,
        maxHp: 18,
        summoned: "HORROR",
      }),
    ).toBe(false);
    for (const form of ["LAND", "NAVAL", "EMBARKED"] as const)
      expect(windmillHealsUnitV7({ form, hp: 1, maxHp: 10 }), form).toBe(true);
    expect(windmillHealsUnitV7({ form: "LAND", hp: 10, maxHp: 10 })).toBe(
      false,
    );
    expect(windmillHealsUnitV7({ form: "LAND", hp: 0, maxHp: 10 })).toBe(false);
  });

  it("lets the Normal AI stage a wounded Dwarf construct next to its Steam Pump, never a daemon", () => {
    const { state, mill, at } = millArena(
      ["DWARF", "ORIGINAL"],
      [{ seat: 0, role: "MARKSMAN", hp: 3 }],
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const gunner = view.units.find((unit) => sameV7(unit.at, at[0] as CoordV7));
    if (gunner === undefined) throw new Error("no Gunner");
    // From three tiles away to a tile next to the Steam Pump.
    const away = { ...gunner, at: { x: mill.x + 3, y: mill.y } };
    const heal = Math.min(WINDMILL_HEAL_V7, gunner.maxHp - gunner.hp);
    expect(windmillStagingGainV7(view, away, at[0] as CoordV7)).toBe(heal * 4);
    expect(
      windmillStagingGainV7(
        view,
        { ...away, summoned: "HORROR" },
        at[0] as CoordV7,
      ),
    ).toBe(0);
  });

  it("names the healer in the Start Turn notice as its owner's faction does", () => {
    const { state, at } = millArena(
      ["DWARF", "ORIGINAL"],
      [{ seat: 0, role: "MARKSMAN", hp: 3 }],
    );
    const { state: after, healing } = startTurn(state, 0);
    const view = viewForV7(after, seatIdV7(after, 0));
    expect(specialBoundaryNoticeV7(healing, view.viewer.id, view)).toBe(
      `Steam Pump healed 1 unit +${unitAtV7(after, at[0] as CoordV7).hp - 3} HP`,
    );
    // Without the players, the shared name.
    expect(specialBoundaryNoticeV7(healing, view.viewer.id)).toMatch(
      /^Windmill healed 1 unit/,
    );
  });
});
