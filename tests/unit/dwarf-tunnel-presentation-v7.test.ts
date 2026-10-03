import { describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  tunnelAutoLandingV7,
  tunnelDestinationsV7,
  tunnelOutcomeV7,
  tunnelRiderTilesV7,
  tunnelRidersV7,
} from "../../src/render/dwarf-tunnel-v7";
import {
  DWARF_DIG_IN_V7,
  DWARF_UI_V7,
  dwarfDigInFixtureV7,
  dwarfUiFixtureV7,
} from "../fixtures/v7-dwarf-ui";

/**
 * The passenger-first Tunnel's presentation choices (bead pulp_wars-78i.9):
 * which Hammerer is seated first, where it lands by default, and the one
 * TUNNEL command a choice stands for.
 */

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function humanView(state: ReturnType<typeof dwarfUiFixtureV7>): {
  readonly view: PlayerViewV7;
  readonly commands: readonly CommandV7[];
} {
  const view = viewForV7(state, state.humanPlayerId);
  return { view, commands: queryPlayerCommandsV7(view) };
}

const unitAt = (view: PlayerViewV7, at: CoordV7) => {
  const unit = view.units.find((candidate) => same(candidate.at, at));
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
};

/** A bare view for the landing choice: units, villages and the viewer. */
function landingView(
  enemies: readonly CoordV7[],
  villages: readonly CoordV7[] = [],
): PlayerViewV7 {
  return {
    viewer: { id: 0 },
    units: enemies.map((at, index) => ({ id: 100 + index, ownerId: 1, at })),
    board: {
      tiles: villages.map((at) => ({ at, explored: true, site: "VILLAGE" })),
    },
  } as unknown as PlayerViewV7;
}

describe("the Tunnel passenger (bead pulp_wars-78i.9)", () => {
  it("seats the Hammerer with the most HP first, then the lowest ID", () => {
    const { view, commands } = humanView(dwarfDigInFixtureV7());
    const mole = unitAt(view, DWARF_DIG_IN_V7.readyMole);
    const wounded = unitAt(view, DWARF_DIG_IN_V7.readyHammerer);
    const garrisoned = unitAt(view, DWARF_DIG_IN_V7.garrisoned);
    expect(wounded.id).toBeLessThan(garrisoned.id);
    expect(wounded.hp).toBeLessThan(garrisoned.hp);
    const riders = tunnelRidersV7(view, commands, mole.id);
    expect(riders.map((rider) => rider.unitId)).toEqual([
      garrisoned.id,
      wounded.id,
    ]);
    expect(riders[0]).toMatchObject({
      label: "Hammerer",
      hp: garrisoned.hp,
      maxHp: garrisoned.maxHp,
    });
  });

  it("lands the Hammerer next to the nearest visible enemy or village, else ahead of the tunnel, ties in offered order", () => {
    const to = { x: 4, y: 4 };
    const tiles = [
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 3, y: 5 },
      { x: 5, y: 5 },
    ];
    const from = { x: 6, y: 4 };
    // The nearest point of interest wins over a farther one.
    expect(
      tunnelAutoLandingV7(
        landingView([{ x: 4, y: 7 }], [{ x: 1, y: 1 }]),
        from,
        to,
        tiles,
      ),
    ).toEqual({ x: 3, y: 5 });
    expect(
      tunnelAutoLandingV7(landingView([], [{ x: 7, y: 1 }]), from, to, tiles),
    ).toEqual({ x: 5, y: 3 });
    // Nothing in sight: the tile continuing the tunnel (west, from 6, 4 to
    // 4, 4 aims at 3, 4): 3, 3 and 3, 5 tie, the offered order keeps 3, 3.
    expect(tunnelAutoLandingV7(landingView([]), from, to, tiles)).toEqual({
      x: 3,
      y: 3,
    });
    expect(tunnelAutoLandingV7(landingView([]), from, to, [])).toBeNull();
  });

  it("sends the tunnel with the seated Hammerer's chosen or default landing, or alone", () => {
    const { view, commands } = humanView(dwarfUiFixtureV7());
    const mole = unitAt(view, DWARF_UI_V7.mole);
    const rider = unitAt(view, DWARF_UI_V7.rider);
    const to = DWARF_UI_V7.tunnelTo;
    expect(
      tunnelDestinationsV7(commands, mole.id).some((at) => same(at, to)),
    ).toBe(true);
    const tiles = tunnelRiderTilesV7(commands, mole.id, to, rider.id);
    expect(tiles.length).toBeGreaterThan(1);
    const state = {
      unitId: mole.id,
      to: null,
      riderUnitId: rider.id,
      riderTo: null,
    };
    const preview = tunnelOutcomeV7(view, commands, state, to);
    const landing = tunnelAutoLandingV7(view, mole.at, to, tiles);
    expect(preview).toMatchObject({
      landing,
      staysBehind: false,
      command: {
        kind: "TUNNEL",
        unitId: mole.id,
        to,
        rider: { unitId: rider.id, to: landing },
      },
    });
    expect(preview?.otherLandings).toHaveLength(tiles.length - 1);
    // A moved landing counts on the chosen destination only.
    const other = tiles.find((tile) => !same(tile, landing as CoordV7));
    if (other === undefined) throw new Error("one tile");
    const moved = { ...state, to, riderTo: other };
    expect(tunnelOutcomeV7(view, commands, moved, to)?.command).toEqual({
      kind: "TUNNEL",
      unitId: mole.id,
      to,
      rider: { unitId: rider.id, to: other },
    });
    const elsewhere = tunnelDestinationsV7(commands, mole.id).find(
      (at) => !same(at, to),
    );
    if (elsewhere === undefined) throw new Error("one destination");
    expect(tunnelOutcomeV7(view, commands, moved, elsewhere)).toEqual(
      tunnelOutcomeV7(view, commands, state, elsewhere),
    );
    // Nobody seated: the Mole tunnels alone.
    expect(
      tunnelOutcomeV7(view, commands, { ...state, riderUnitId: null }, to),
    ).toEqual({
      command: { kind: "TUNNEL", unitId: mole.id, to, rider: null },
      landing: null,
      otherLandings: [],
      staysBehind: false,
    });
  });

  it("leaves the Hammerer behind where no tile next to the destination is free for it", () => {
    const { view, commands } = humanView(dwarfUiFixtureV7());
    const mole = unitAt(view, DWARF_UI_V7.mole);
    const rider = unitAt(view, DWARF_UI_V7.rider);
    const state = {
      unitId: mole.id,
      to: null,
      riderUnitId: rider.id,
      riderTo: null,
    };
    const lonely = tunnelDestinationsV7(commands, mole.id).find(
      (to) => tunnelRiderTilesV7(commands, mole.id, to, rider.id).length === 0,
    );
    // Every destination of this fixture has a free tile next to it; a
    // command list without the rider's tunnels stands in for a crowded one.
    const to = lonely ?? DWARF_UI_V7.tunnelTo;
    const crowded = commands.filter(
      (command) =>
        command.kind !== "TUNNEL" ||
        command.rider === null ||
        !same(command.to, to),
    );
    expect(tunnelOutcomeV7(view, crowded, state, to)).toEqual({
      command: { kind: "TUNNEL", unitId: mole.id, to, rider: null },
      landing: null,
      otherLandings: [],
      staysBehind: true,
    });
  });
});
