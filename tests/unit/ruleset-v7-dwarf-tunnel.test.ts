import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  allOwnedUnitsV7,
  applyCommandV7,
  assignedUnitCountV7,
  boardUnitsV7,
  isCityBesiegedV7,
  parseGameStateV7,
  previewTunnelV7,
  queryPlayerCommandsV7,
  tileOccupiedV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  EXHAUSTED_V7,
  dwarfFieldV7,
  moundAtTileV7,
  offeredOfV7,
  refusalV7,
  tunnelV7,
  withBurrowedV7,
} from "../fixtures/v7-dwarf";
import {
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, playV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  fieldDefenseV7,
  kindsV7,
  mountainV7,
  patchTileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// The Dwarf revision (`pulp_wars-78i.3`): the Tunnel command, burrowed
// units and the mound, and surfacing with the eruption
// (docs/product/RULESET_7_DWARVES.md sections 5 and 13). The field: an
// 11 x 11 board, the Dwarf seat 0 capital (8, 8) with territory x 7-9,
// y 7-9; seat 1 capital (2, 8) with territory x 1-3, y 7-9; villages
// (5, 5), (8, 5), (5, 8); every tile explored; every technology.

const ENEMY: IcePieceV7 = { seat: 1, role: "FIGHTER", at: at(1, 1) };
const WITHOUT = (...techs: string[]) =>
  TECHNOLOGY_IDS_V7.filter((tech) => !techs.includes(tech));

function unitById(
  state: GameStateV7,
  unitId: UnitStateV7["id"],
): UnitStateV7 | undefined {
  return allOwnedUnitsV7(state).find((unit) => unit.id === unitId);
}

/** The Dwarf seat's next Start Turn (the enemy ends its turn in between). */
function nextDwarfTurn(state: GameStateV7): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
} {
  const afterOwn = endTurnUntilV7(state, seatIdV7(state, 1));
  const back = endTurnUntilV7(afterOwn.state, seatIdV7(state, 0));
  return { state: back.state, events: back.events };
}

function surfacedEvent(
  events: readonly DomainEventV7[],
): Extract<DomainEventV7, { kind: "UNIT_SURFACED" }> {
  const event = events.find((item) => item.kind === "UNIT_SURFACED");
  if (event?.kind !== "UNIT_SURFACED") throw new Error("no surfacing");
  return event;
}

describe("the Tunnel command (section 5.1)", () => {
  it("burrows the Mole and its rider: records, activation, statuses, event, and the offered forecast", () => {
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(5, 2), hp: 11 },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(4, 2),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 1, role: "CATAPULT", at: at(6, 5) },
        ENEMY,
      ],
      { factions: ["DWARF", "ICE_FOLK"] },
    );
    const mole = unitAtV7(state, at(5, 2));
    const rider = unitAtV7(state, at(4, 2));
    const command = tunnelV7(state, at(5, 2), at(6, 4), {
      from: at(4, 2),
      to: at(7, 4),
    });
    const view = viewForV7(state, activeIdV7(state));
    // The forecast: the eruption on the current board (3: Blasting
    // Charges), flagged as projected.
    expect(previewTunnelV7(view, command)).toEqual({
      unitId: mole.id,
      to: at(6, 4),
      riderUnitId: rider.id,
      riderTo: at(7, 4),
      eruptionDamage: 3,
      projected: true,
      eruptionTargets: [
        {
          unitId: unitAtV7(state, at(6, 5)).id,
          at: at(6, 5),
          damage: 3,
          shieldDamage: 0,
          dies: false,
        },
      ],
      undermines: [],
    });
    const result = playV7(state, command);
    expect(result.events[0]).toEqual({
      kind: "UNIT_TUNNELLED",
      playerId: activeIdV7(state),
      unitId: mole.id,
      from: at(5, 2),
      to: at(6, 4),
      riderUnitId: rider.id,
      riderFrom: at(4, 2),
      riderTo: at(7, 4),
    });
    expect(boardUnitsV7(result.state).map((unit) => unit.id)).not.toContain(
      mole.id,
    );
    expect(result.state.burrowed).toEqual(
      [
        {
          unit: {
            ...mole,
            at: at(6, 4),
            captureEligible: false,
            activation: EXHAUSTED_V7,
          },
          moleUnitId: null,
        },
        {
          unit: {
            ...rider,
            at: at(7, 4),
            captureEligible: false,
            activation: EXHAUSTED_V7,
          },
          moleUnitId: mole.id,
        },
      ].sort((left, right) => left.unit.id - right.unit.id),
    );
    // The rider's Chill entry stays on the burrowed unit; a sluggish
    // Hammerer may ride (the tunnel is a Move).
    expect(result.state.chilled.map((entry) => entry.unitId)).toEqual([
      rider.id,
    ]);
    // Capacity counts burrowed units: they keep their slot and home.
    const capital = cityOfV7(state, 0);
    expect(assignedUnitCountV7(result.state, capital.id)).toBe(
      assignedUnitCountV7(state, capital.id),
    );
    // The mound tiles are occupied; the view lists both mounds.
    for (const where of [at(6, 4), at(7, 4)]) {
      expect(tileOccupiedV7(result.state, where)).toBe(true);
      expect(
        tileOccupiedV7(viewForV7(result.state, seatIdV7(state, 1)), where),
      ).toBe(true);
    }
    expect(
      viewForV7(result.state, seatIdV7(state, 1)).burrowed.map((entry) => [
        entry.unit.id,
        entry.unit.at,
        entry.moleUnitId,
      ]),
    ).toEqual(
      [
        [mole.id, at(6, 4), null],
        [rider.id, at(7, 4), mole.id],
      ].sort((left, right) => (left[0] as number) - (right[0] as number)),
    );
  });

  it("offers one entry per destination and rider tile plus the rider-less one, and every offer is accepted", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "GUARD", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      ENEMY,
    ]);
    const offered = offeredOfV7(state, at(5, 2), "TUNNEL");
    const plain = offered.filter(
      (command) => command.kind === "TUNNEL" && command.rider === null,
    );
    // Every tile within 3 steps but the Mole's own, the village (5, 5),
    // and the tiles of the two units.
    const destinations = new Set(
      plain.map((command) =>
        command.kind === "TUNNEL" ? `${command.to.x},${command.to.y}` : "",
      ),
    );
    expect(destinations.has("8,2")).toBe(true);
    expect(destinations.has("9,2")).toBe(false);
    expect(destinations.has("5,5")).toBe(false);
    expect(destinations.has("4,2")).toBe(false);
    expect(destinations.has("5,2")).toBe(false);
    expect(offered.length).toBeGreaterThan(plain.length);
    for (const command of offered)
      expect(
        applyCommandV7(state, activeIdV7(state), command).accepted,
        JSON.stringify(command),
      ).toBe(true);
  });

  it("refuses each legality row in order with its code and reason", () => {
    const base = (
      extra: readonly IcePieceV7[] = [],
      options: Parameters<typeof dwarfFieldV7>[1] = {},
    ) =>
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 2) },
          { seat: 0, role: "FIGHTER", at: at(4, 2) },
          ...extra,
          ENEMY,
        ],
        options,
      );
    const state = base();
    // Row 1: a burrowed unit has spent its turn underground.
    const burrowed = withBurrowedV7(
      base([{ seat: 0, role: "GUARD", at: at(2, 3) }]),
      [{ at: at(2, 3) }],
    );
    expect(
      refusalV7(burrowed, {
        kind: "TUNNEL",
        unitId: moundAtTileV7(burrowed, at(2, 3)).unit.id,
        to: at(2, 1),
        rider: null,
      }).code,
    ).toBe("UNIT_ALREADY_HANDLED");
    // Row 2: only a Mole tunnels.
    expect(refusalV7(state, tunnelV7(state, at(4, 2), at(4, 4)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    // Row 3: it has not moved or acted.
    const moved = base([], {});
    const movedMole = checkedV7({
      ...moved,
      units: moved.units.map((unit) =>
        unit.role === "GUARD"
          ? { ...unit, activation: { ...unit.activation, moved: true } }
          : unit,
      ),
    });
    expect(
      refusalV7(movedMole, tunnelV7(movedMole, at(5, 2), at(6, 4))).code,
    ).toBe("UNIT_ALREADY_ACTED");
    // Row 4: in land form.
    const afloat = dwarfFieldV7(
      [{ seat: 0, role: "GUARD", at: at(0, 4), form: "EMBARKED" }, ENEMY],
      { water: [at(0, 4)] },
    );
    expect(refusalV7(afloat, tunnelV7(afloat, at(0, 4), at(1, 3)))).toEqual({
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    // Row 5: not on its surfacing turn.
    const surfaced = checkedV7({
      ...state,
      surfacedThisTurn: [unitAtV7(state, at(5, 2)).id],
    });
    expect(refusalV7(surfaced, tunnelV7(surfaced, at(5, 2), at(6, 4)))).toEqual(
      { code: "TUNNEL_NOT_LEGAL", params: { reason: "SURFACED" } },
    );
    // Row 6: the destination.
    const destination = {
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "DESTINATION" },
    };
    expect(refusalV7(state, tunnelV7(state, at(5, 2), at(9, 2)))).toEqual(
      destination,
    );
    expect(refusalV7(state, tunnelV7(state, at(5, 2), at(5, 5)))).toEqual(
      destination,
    );
    const occupied = base([{ seat: 1, role: "FIGHTER", at: at(7, 2) }]);
    expect(refusalV7(occupied, tunnelV7(occupied, at(5, 2), at(7, 2)))).toEqual(
      destination,
    );
    const mounded = withBurrowedV7(
      base([{ seat: 0, role: "GUARD", at: at(7, 3) }]),
      [{ at: at(7, 3) }],
    );
    expect(refusalV7(mounded, tunnelV7(mounded, at(5, 2), at(7, 3)))).toEqual(
      destination,
    );
    const chest = checkedV7({ ...state, treasureChests: [at(7, 1)] });
    expect(refusalV7(chest, tunnelV7(chest, at(5, 2), at(7, 1)))).toEqual(
      destination,
    );
    // Own territory is not "allied" territory (the Beam Down precedent:
    // allied means a cooperative partner's), so a Mole may tunnel home;
    // hostile territory is a legal destination too.
    const home = dwarfFieldV7([
      { seat: 0, role: "GUARD", at: at(6, 5) },
      ENEMY,
    ]);
    playV7(home, tunnelV7(home, at(6, 5), at(7, 7)));
    const raid = dwarfFieldV7([
      { seat: 0, role: "GUARD", at: at(4, 5) },
      ENEMY,
    ]);
    playV7(raid, tunnelV7(raid, at(4, 5), at(3, 7)));
    // Row 7: the rider.
    const riderRefusal = {
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "RIDER" },
    };
    const far = base([{ seat: 0, role: "FIGHTER", at: at(3, 2) }]);
    expect(
      refusalV7(
        far,
        tunnelV7(far, at(5, 2), at(6, 4), { from: at(3, 2), to: at(7, 4) }),
      ),
    ).toEqual(riderRefusal);
    const gunner = base([{ seat: 0, role: "MARKSMAN", at: at(6, 2) }]);
    expect(
      refusalV7(
        gunner,
        tunnelV7(gunner, at(5, 2), at(6, 4), { from: at(6, 2), to: at(7, 4) }),
      ),
    ).toEqual(riderRefusal);
    const tired = dwarfFieldV7([
      { seat: 0, role: "GUARD", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(4, 2), activation: { moved: true } },
      ENEMY,
    ]);
    expect(
      refusalV7(
        tired,
        tunnelV7(tired, at(5, 2), at(6, 4), { from: at(4, 2), to: at(7, 4) }),
      ),
    ).toEqual(riderRefusal);
    const riderSurfaced = checkedV7({
      ...state,
      surfacedThisTurn: [unitAtV7(state, at(4, 2)).id],
    });
    expect(
      refusalV7(
        riderSurfaced,
        tunnelV7(riderSurfaced, at(5, 2), at(6, 4), {
          from: at(4, 2),
          to: at(7, 4),
        }),
      ),
    ).toEqual(riderRefusal);
    // Row 8: the rider's tile.
    const riderTile = {
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "RIDER_DESTINATION" },
    };
    for (const to of [at(8, 4), at(6, 4), at(5, 5)])
      expect(
        refusalV7(
          state,
          tunnelV7(state, at(5, 2), at(6, 4), { from: at(4, 2), to }),
        ),
        JSON.stringify(to),
      ).toEqual(riderTile);
  });

  it("passes under water-free land of any kind but never through water or unexplored tiles", () => {
    const corner = (options: Parameters<typeof dwarfFieldV7>[1] = {}) =>
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(0, 0) },
          { seat: 1, role: "FIGHTER", at: at(3, 4) },
        ],
        options,
      );
    const open = corner();
    playV7(open, tunnelV7(open, at(0, 0), at(2, 0)));
    const ring = [at(1, 0), at(1, 1), at(0, 1)];
    const wet = corner({ water: ring });
    expect(refusalV7(wet, tunnelV7(wet, at(0, 0), at(2, 0))).code).toBe(
      "TUNNEL_NOT_LEGAL",
    );
    const fogged = unexploreV7(open, 0, ring);
    expect(
      refusalV7(fogged, tunnelV7(fogged, at(0, 0), at(2, 0))).params,
    ).toEqual({ reason: "DESTINATION" });
    // Under a ring of Mountains without Engineering: allowed; ending on a
    // Mountain needs Engineering.
    let mountains = dwarfFieldV7(
      [{ seat: 0, role: "GUARD", at: at(5, 2) }, ENEMY],
      { techs: { 0: WITHOUT("ENGINEERING", "METALLURGY") } },
    );
    for (let y = 1; y <= 3; y += 1)
      for (let x = 4; x <= 6; x += 1)
        if (x !== 5 || y !== 2) mountains = mountainV7(mountains, at(x, y));
    mountains = mountainV7(mountains, at(8, 2));
    playV7(mountains, tunnelV7(mountains, at(5, 2), at(7, 2)));
    expect(
      refusalV7(mountains, tunnelV7(mountains, at(5, 2), at(8, 2))).params,
    ).toEqual({ reason: "DESTINATION" });
    const engineers = dwarfFieldV7([
      { seat: 0, role: "GUARD", at: at(5, 2) },
      ENEMY,
    ]);
    const peak = mountainV7(engineers, at(7, 2));
    playV7(peak, tunnelV7(peak, at(5, 2), at(7, 2)));
  });

  it("passes under a Rift but never ends on one", () => {
    let state = dwarfFieldV7([{ seat: 0, role: "GUARD", at: at(5, 2) }, ENEMY]);
    for (const where of [at(6, 1), at(6, 2), at(6, 3)])
      state = patchTileV7(state, where, { terrain: "RIFT" });
    playV7(state, tunnelV7(state, at(5, 2), at(7, 2)));
    expect(
      refusalV7(state, tunnelV7(state, at(5, 2), at(6, 2))).params,
    ).toEqual({ reason: "DESTINATION" });
  });

  it("reveals around each mound and ends the siege the Mole was making", () => {
    const state = unexploreV7(
      dwarfFieldV7([{ seat: 0, role: "GUARD", at: at(2, 8) }, ENEMY]),
      0,
      [at(4, 4), at(5, 4)],
    );
    const city = state.cities.find(
      (candidate) => candidate.at.x === 2 && candidate.at.y === 8,
    );
    if (city === undefined) throw new Error("city missing");
    expect(isCityBesiegedV7(state, city)).toBe(true);
    const result = playV7(state, tunnelV7(state, at(2, 8), at(4, 5)));
    expect(kindsV7(result.events).slice(0, 2)).toEqual([
      "UNIT_TUNNELLED",
      "TILES_REVEALED",
    ]);
    expect(
      result.events.find((event) => event.kind === "TILES_REVEALED"),
    ).toMatchObject({ tiles: [at(4, 4), at(5, 4)] });
    const after = result.state.cities.find(
      (candidate) => candidate.id === city.id,
    );
    if (after === undefined) throw new Error("city missing");
    expect(isCityBesiegedV7(result.state, after)).toBe(false);
  });
});

describe("the mound (section 5.3)", () => {
  const mounded = (
    extra: readonly IcePieceV7[] = [],
    options: Parameters<typeof dwarfFieldV7>[1] = {},
  ) =>
    withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
          { seat: 0, role: "FIGHTER", at: at(9, 1) },
          ...extra,
        ],
        options,
      ),
      [{ at: at(5, 3) }, { at: at(5, 2), moleAt: at(5, 3) }],
    );

  it("refuses every command naming a burrowed unit and never offers one", () => {
    const state = mounded([ENEMY]);
    const mole = moundAtTileV7(state, at(5, 3)).unit;
    const commands: readonly CommandV7[] = [
      { kind: "MOVE", unitId: mole.id, path: [at(5, 4)] },
      { kind: "DISBAND", unitId: mole.id },
      { kind: "RECOVER", unitId: mole.id },
      { kind: "WAIT", unitId: mole.id },
      { kind: "TUNNEL", unitId: mole.id, to: at(6, 5), rider: null },
    ];
    for (const command of commands)
      expect(refusalV7(state, command).code, command.kind).toBe(
        "UNIT_ALREADY_HANDLED",
      );
    expect(
      offeredV7(state).filter(
        (command) => "unitId" in command && command.unitId === mole.id,
      ),
    ).toEqual([]);
  });

  it("cannot be targeted, pushed onto, or ended on; a Move may pass over it", () => {
    const state = mounded(
      [
        { seat: 1, role: "RAIDER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "CATAPULT", at: at(3, 3) },
      ],
      { activeSeat: 1 },
    );
    const mole = moundAtTileV7(state, at(5, 3)).unit;
    for (const unitAt of [at(4, 3), at(3, 3)])
      expect(
        refusalV7(state, {
          kind: "ATTACK",
          unitId: unitAtV7(state, unitAt).id,
          targetUnitId: mole.id,
        }).code,
      ).toBe("TARGET_NOT_FOUND");
    // No Move ends on the mound tile; a Raider passes over it.
    expect(
      refusalV7(state, {
        kind: "MOVE",
        unitId: unitAtV7(state, at(4, 3)).id,
        path: [at(5, 3)],
      }),
    ).toMatchObject({ code: "MOVEMENT_ILLEGAL", params: { reason: "MOUND" } });
    const raider = unitAtV7(state, at(5, 4));
    const passed = playV7(state, {
      kind: "MOVE",
      unitId: raider.id,
      path: [at(5, 3), at(6, 2)],
    });
    expect(unitAtV7(passed.state, at(6, 2)).id).toBe(raider.id);
  });

  it("interrupts a Move that meets a hidden mound (MOUND)", () => {
    const state = unexploreV7(
      mounded([{ seat: 1, role: "RAIDER", at: at(5, 5) }], { activeSeat: 1 }),
      1,
      [at(5, 3)],
    );
    const raider = unitAtV7(state, at(5, 5));
    // The rider's mound on (5, 2) is seen; the Mole's on (5, 3) is not.
    expect(
      viewForV7(state, raider.ownerId).burrowed.map((entry) => entry.unit.at),
    ).toEqual([at(5, 2)]);
    const result = applyCommandV7(state, raider.ownerId, {
      kind: "MOVE",
      unitId: raider.id,
      path: [at(5, 4), at(5, 3)],
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.events.find((event) => event.kind === "UNIT_MOVE_INTERRUPTED"),
    ).toEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: raider.id,
      // The event names the tile where the Move met the mound; the
      // Raider stays on the last tile it entered (the SNOW and ZOC
      // precedent).
      at: at(5, 3),
      reason: "MOUND",
    });
    expect(unitAtV7(result.state, at(5, 4)).id).toBe(raider.id);
    expect(viewForV7(result.state, raider.ownerId).burrowed).toHaveLength(2);
  });

  it("orphans a burrowed unit on a capture of its home and removes it on elimination", () => {
    // Seat 1 captures the Dwarf capital, the seat's only city.
    const state = mounded(
      [{ seat: 1, role: "FIGHTER", at: at(8, 8), captureEligible: true }],
      { activeSeat: 1 },
    );
    const result = playV7(state, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(8, 8)).id,
    });
    expect(result.state.burrowed).toEqual([]);
    const died = result.events.filter(
      (event) => event.kind === "UNIT_DIED" && event.cause === "ELIMINATION",
    );
    // The Fighter on (9, 1) and the two burrowed units.
    expect(died).toHaveLength(3);
  });

  it("parses strictly: each rejection of section 5.2", () => {
    const state = mounded([ENEMY]);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const mole = state.burrowed.find((entry) => entry.moleUnitId === null);
    const rider = state.burrowed.find((entry) => entry.moleUnitId !== null);
    if (mole === undefined || rider === undefined) throw new Error("entries");
    const bad: readonly [string, unknown][] = [
      ["unsorted", { ...state, burrowed: [...state.burrowed].reverse() }],
      ["duplicate", { ...state, burrowed: [mole, mole, rider] }],
      [
        "also on the board",
        {
          ...state,
          units: [...state.units, mole.unit].sort((l, r) => l.id - r.id),
        },
      ],
      [
        "Mole naming a Mole",
        {
          ...state,
          burrowed: state.burrowed.map((entry) =>
            entry === mole ? { ...entry, moleUnitId: rider.unit.id } : entry,
          ),
        },
      ],
      [
        "rider without a Mole",
        {
          ...state,
          burrowed: [rider],
        },
      ],
      [
        "rider not next to its Mole",
        {
          ...state,
          burrowed: state.burrowed.map((entry) =>
            entry === rider
              ? { ...entry, unit: { ...entry.unit, at: at(5, 0) } }
              : entry,
          ),
        },
      ],
      [
        "a role without TUNNEL as a Mole",
        {
          ...state,
          burrowed: state.burrowed.map((entry) =>
            entry === rider ? { ...entry, moleUnitId: null } : entry,
          ),
        },
      ],
      [
        "a mound on a unit",
        {
          ...state,
          burrowed: state.burrowed.map((entry) =>
            entry === mole
              ? { ...entry, unit: { ...entry.unit, at: at(9, 1) } }
              : entry,
          ),
        },
      ],
      [
        "a mound on a village",
        {
          ...state,
          burrowed: state.burrowed.map((entry) =>
            entry === rider
              ? { ...entry, unit: { ...entry.unit, at: at(5, 4) } }
              : entry === mole
                ? { ...entry, unit: { ...entry.unit, at: at(5, 5) } }
                : entry,
          ),
        },
      ],
      ["a mound on a chest", { ...state, treasureChests: [at(5, 3)] }],
      [
        "an embarked record",
        {
          ...state,
          burrowed: state.burrowed.map((entry) =>
            entry === mole
              ? { ...entry, unit: { ...entry.unit, form: "EMBARKED" } }
              : entry,
          ),
        },
      ],
      [
        "surfacedThisTurn naming a burrowed unit",
        { ...state, surfacedThisTurn: [mole.unit.id] },
      ],
      [
        "next entity ID not above the burrowed IDs",
        { ...state, nextEntityId: mole.unit.id },
      ],
    ];
    for (const [label, input] of bad)
      expect(
        parseGameStateV7(JSON.parse(JSON.stringify(input))),
        label,
      ).toBeNull();
    // Any entry in a match without a Dwarf seat.
    const human = dwarfFieldV7(
      [{ seat: 0, role: "GUARD", at: at(5, 3) }, ENEMY],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    const guard = unitAtV7(human, at(5, 3));
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...human,
            units: human.units.filter((unit) => unit.id !== guard.id),
            burrowed: [{ unit: guard, moleUnitId: null }],
          }),
        ),
      ),
    ).toBeNull();
  });

  it("lists a mound in a view only where the viewer has explored the tile", () => {
    const state = unexploreV7(mounded([ENEMY]), 1, [at(5, 2)]);
    const enemyView = viewForV7(state, seatIdV7(state, 1));
    expect(enemyView.burrowed.map((entry) => entry.unit.at)).toEqual([
      at(5, 3),
    ]);
    expect(
      viewForV7(state, seatIdV7(state, 0)).burrowed.map(
        (entry) => entry.unit.at,
      ),
    ).toEqual(expect.arrayContaining([at(5, 2), at(5, 3)]));
  });

  it("keeps the Chill entry of a burrowed unit counting down at its owner's End Turn", () => {
    const state = withBurrowedV7(
      dwarfFieldV7(
        [
          {
            seat: 0,
            role: "GUARD",
            at: at(5, 3),
            chill: { sluggish: false, turnsLeft: 2 },
          },
          ENEMY,
        ],
        { factions: ["DWARF", "ICE_FOLK"] },
      ),
      [{ at: at(5, 3) }],
    );
    const ended = applyCommandV7(state, activeIdV7(state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(ended.state.chilled).toEqual([
      {
        unitId: moundAtTileV7(state, at(5, 3)).unit.id,
        sluggish: false,
        turnsLeft: 1,
      },
    ]);
    expect(ended.state.burrowed).toHaveLength(1);
  });
});

describe("surfacing and the eruption (section 5.4)", () => {
  it("returns the pair at the owner's Start Turn after the Shield recharge and before Plague, with the fresh activation", () => {
    const state = withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
          { seat: 1, role: "FIGHTER", at: at(6, 4) },
          { seat: 1, role: "RAIDER", at: at(4, 4) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { factions: ["DWARF", "MARTIAN"], techs: { 0: WITHOUT("EXPLOSIVES") } },
      ),
      [{ at: at(5, 3) }, { at: at(5, 2), moleAt: at(5, 3) }],
    );
    const mole = moundAtTileV7(state, at(5, 3)).unit;
    const rider = moundAtTileV7(state, at(5, 2)).unit;
    const grunt = unitAtV7(state, at(6, 4));
    const saucer = unitAtV7(state, at(4, 4));
    // Strip the Grunt's Shield: the Martian Start Turn recharges it.
    const stripped = checkedV7({
      ...state,
      shields: state.shields.filter((entry) => entry.unitId !== grunt.id),
    });
    const { state: after, events } = nextDwarfTurn(stripped);
    const kinds = kindsV7(events);
    const surfacedAt = kinds.lastIndexOf("UNIT_SURFACED");
    expect(surfacedAt).toBeGreaterThan(kinds.lastIndexOf("SHIELDS_RECHARGED"));
    const event = surfacedEvent(events);
    // The Martian Start Turn recharged the Grunt's Shield (2) before the
    // Dwarf turn: the eruption of 2 is absorbed. The Saucer flies: never hit.
    expect(event).toEqual({
      kind: "UNIT_SURFACED",
      playerId: seatIdV7(state, 0),
      unitId: mole.id,
      at: at(5, 3),
      riderUnitId: rider.id,
      riderAt: at(5, 2),
      eruptionDamage: 2,
      results: [
        {
          unitId: grunt.id,
          at: at(6, 4),
          damage: 0,
          shieldDamage: 2,
          dies: false,
        },
      ],
    });
    expect(unitById(after, saucer.id)?.hp).toBe(saucer.hp);
    expect(after.burrowed).toEqual([]);
    expect(after.surfacedThisTurn).toEqual(
      [mole.id, rider.id].sort((l, r) => l - r),
    );
    for (const id of [mole.id, rider.id])
      expect(unitById(after, id)).toMatchObject({
        captureEligible: false,
        activation: { moved: false, attacked: false, handled: false },
      });
    // On the surfacing turn: the Mole cannot tunnel; both may move and fight.
    expect(refusalV7(after, tunnelV7(after, at(5, 3), at(7, 3)))).toEqual({
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "SURFACED" },
    });
    expect(offeredOfV7(after, at(5, 3), "ATTACK").length).toBeGreaterThan(0);
    // `surfacedThisTurn` is emptied at the owner's End Turn.
    const ended = applyCommandV7(after, activeIdV7(after), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(ended.state.surfacedThisTurn).toEqual([]);
  });

  it("hits hostile ground units only: foot, walker, Thrall, and Egg take it; flyers, boats, embarked, own, and allied units never", () => {
    const martian = withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(6, 3) },
          { seat: 1, role: "CAPTAIN", at: at(9, 0) },
          { seat: 1, role: "FIGHTER", at: at(4, 2), shield: 0 },
          { seat: 1, role: "CATAPULT", at: at(5, 2), shield: 0 },
          { seat: 1, role: "FIGHTER", at: at(6, 2), thrallOf: at(9, 0) },
          { seat: 1, role: "RAIDER", at: at(4, 4), shield: 0 },
          { seat: 1, role: "FIGHTER", at: at(6, 4), form: "EMBARKED" },
          { seat: 1, role: "PATROL_BOAT", at: at(5, 4), form: "NAVAL" },
        ],
        { factions: ["DWARF", "MARTIAN"], water: [at(5, 4), at(6, 4)] },
      ),
      [{ at: at(5, 3) }],
    );
    const back = nextDwarfTurn(martian);
    const event = surfacedEvent(back.events);
    expect(event.eruptionDamage).toBe(3);
    expect(event.results.map((entry) => entry.at)).toEqual([
      at(4, 2),
      at(5, 2),
      at(6, 2),
    ]);
    // The Martian turn recharged the Shields: each hit is 3, the Shield
    // absorbing first.
    for (const entry of event.results)
      expect(entry.damage + entry.shieldDamage).toBe(3);
    // A Dinosaur Egg and an Ankylosaurus (Armoured: 1 off).
    const dinosaur = withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(3, 6) },
          { seat: 1, role: "GUARD", at: at(4, 6) },
          ENEMY,
        ],
        {
          factions: ["DWARF", "DINOSAUR"],
          eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
        },
      ),
      [{ at: at(3, 6) }],
    );
    const egg = unitAtV7(dinosaur, at(2, 7));
    const anky = unitAtV7(dinosaur, at(4, 6));
    const dino = nextDwarfTurn(dinosaur);
    expect(surfacedEvent(dino.events).results).toEqual([
      {
        unitId: anky.id,
        at: at(4, 6),
        damage: 2,
        shieldDamage: 0,
        dies: false,
      },
      { unitId: egg.id, at: at(2, 7), damage: 3, shieldDamage: 0, dies: false },
    ]);
  });

  it("kills with credit to the Mole, a Grave, a Bitten rising, and undermines Field Defense on the nine tiles whoever owns it", () => {
    let state = withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 2 },
          { seat: 1, role: "MARKSMAN", at: at(6, 3), hp: 3 },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { factions: ["DWARF", "UNDEAD"] },
      ),
      [{ at: at(5, 3) }],
    );
    state = fieldDefenseV7(fieldDefenseV7(state, at(5, 3)), at(6, 4));
    const mole = moundAtTileV7(state, at(5, 3)).unit;
    const skeleton = unitAtV7(state, at(4, 3));
    const banshee = unitAtV7(state, at(6, 3));
    const { state: after, events } = nextDwarfTurn(state);
    const block = events.slice(
      events.findIndex((e) => e.kind === "UNIT_SURFACED"),
    );
    expect(kindsV7(block).slice(0, 5)).toEqual([
      "UNIT_SURFACED",
      "FIELD_DEFENSE_DESTROYED",
      "FIELD_DEFENSE_DESTROYED",
      "UNIT_DIED",
      "GRAVE_CREATED",
    ]);
    expect(block[1]).toEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(5, 3),
      reason: "UNDERMINED",
    });
    expect(block[3]).toEqual({
      kind: "UNIT_DIED",
      unitId: skeleton.id,
      cause: "ERUPTION",
    });
    expect(
      block
        .filter((e) => e.kind === "UNIT_DIED")
        .map((e) => e.kind === "UNIT_DIED" && e.unitId),
    ).toEqual([skeleton.id, banshee.id]);
    expect(unitById(after, mole.id)?.kills).toBe(2);
    expect(after.board.tiles.filter((tile) => tile.fieldDefense)).toEqual([]);
  });

  it("raises a Bitten victim of the eruption as its biter's Zombie", () => {
    // Three seats on 14 x 14: Dwarf capital (2, 2), Human (11, 11),
    // Undead (11, 2).
    const base = withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 5) },
          { seat: 1, role: "FIGHTER", at: at(4, 5), hp: 2 },
          { seat: 2, role: "GUARD", at: at(9, 9) },
        ],
        // The Undead seat ends its turn into the Dwarf Start Turn (no
        // Human End Turn heals the victim first).
        { factions: ["DWARF", "ORIGINAL", "UNDEAD"], activeSeat: 2 },
      ),
      [{ at: at(5, 5) }],
    );
    const victim = unitAtV7(base, at(4, 5));
    const zombie = unitAtV7(base, at(9, 9));
    const state = checkedV7({
      ...base,
      bitten: [
        {
          unitId: victim.id,
          biterPlayerId: zombie.ownerId,
          biterUnitId: zombie.id,
        },
      ],
    });
    const { state: after, events } = endTurnUntilV7(state, seatIdV7(state, 0));
    expect(surfacedEvent(events).results).toEqual([
      {
        unitId: victim.id,
        at: at(4, 5),
        damage: 2,
        shieldDamage: 0,
        dies: true,
      },
    ]);
    expect(
      events.find((event) => event.kind === "BITTEN_UNIT_RISEN"),
    ).toBeDefined();
    expect(
      after.units.filter(
        (unit) =>
          unit.ownerId === zombie.ownerId && unit.at.x === 4 && unit.at.y === 5,
      ),
    ).toHaveLength(1);
  });

  it("chains a killed exploding victim's blast onto the surfaced Mole and rider", () => {
    const state = withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
          { seat: 1, role: "CATAPULT", at: at(4, 2), hp: 1 },
          ENEMY,
        ],
        { factions: ["DWARF", "GOBLIN"] },
      ),
      [{ at: at(5, 3) }, { at: at(5, 2), moleAt: at(5, 3) }],
    );
    const mole = moundAtTileV7(state, at(5, 3)).unit;
    const rider = moundAtTileV7(state, at(5, 2)).unit;
    const { state: after, events } = nextDwarfTurn(state);
    const blast = events.find((event) => event.kind === "EXPLOSION_RESOLVED");
    expect(blast).toBeDefined();
    if (blast?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
    expect(
      blast.results.map((entry) => entry.unitId).sort((l, r) => l - r),
    ).toEqual([mole.id, rider.id].sort((l, r) => l - r));
    expect(unitById(after, mole.id)?.hp).toBeLessThan(mole.hp);
    expect(unitById(after, rider.id)?.hp).toBeLessThan(rider.hp);
  });

  it("surfaces two Moles in unit-ID order and applies Plague to a surfaced Plagued unit", () => {
    let state = withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "GUARD", at: at(2, 3) },
          { seat: 1, role: "CATAPULT", at: at(1, 1) },
        ],
        { factions: ["DWARF", "UNDEAD"] },
      ),
      [{ at: at(5, 3) }, { at: at(2, 3) }],
    );
    const first = moundAtTileV7(state, at(5, 3)).unit;
    const second = moundAtTileV7(state, at(2, 3)).unit;
    const lich = unitAtV7(state, at(1, 1));
    state = checkedV7({
      ...state,
      plagued: [{ unitId: first.id, sourceUnitId: lich.id, turnsRemaining: 2 }],
    });
    const { events } = nextDwarfTurn(state);
    const surfaced = events.filter((event) => event.kind === "UNIT_SURFACED");
    expect(
      surfaced.map((event) => event.kind === "UNIT_SURFACED" && event.unitId),
    ).toEqual([first.id, second.id].sort((l, r) => l - r));
    const kinds = kindsV7(events);
    expect(kinds.indexOf("PLAGUE_DAMAGED")).toBeGreaterThan(
      kinds.lastIndexOf("UNIT_SURFACED"),
    );
    expect(
      events.find((event) => event.kind === "PLAGUE_DAMAGED"),
    ).toBeDefined();
  });

  it("forbids the rider a settlement center it does not own on its surfacing turn, but not the Mole", () => {
    const state = withBurrowedV7(
      dwarfFieldV7([
        { seat: 0, role: "GUARD", at: at(5, 4) },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        ENEMY,
      ]),
      [{ at: at(5, 4) }, { at: at(4, 4), moleAt: at(5, 4) }],
    );
    const { state: after } = nextDwarfTurn(state);
    const rider = unitAtV7(after, at(4, 4));
    expect(
      refusalV7(after, { kind: "MOVE", unitId: rider.id, path: [at(5, 5)] }),
    ).toMatchObject({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "SETTLEMENT_FORBIDDEN" },
    });
    expect(offeredV7(after)).not.toContainEqual({
      kind: "MOVE",
      unitId: rider.id,
      path: [at(5, 5)],
    });
    playV7(after, {
      kind: "MOVE",
      unitId: unitAtV7(after, at(5, 4)).id,
      path: [at(5, 5)],
    });
  });

  it("previews every offered tunnel's eruption equal to the surfacing when nothing moves", () => {
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 5), hp: 3 },
        { seat: 1, role: "MARKSMAN", at: at(7, 4) },
        ENEMY,
      ],
      { techs: { 0: WITHOUT("EXPLOSIVES") } },
    );
    const view = viewForV7(state, activeIdV7(state));
    const tunnels = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "TUNNEL" }> =>
        command.kind === "TUNNEL" && command.rider === null,
    );
    for (const command of tunnels.filter((item) =>
      [at(6, 4), at(7, 3), at(4, 4)].some(
        (where) => where.x === item.to.x && where.y === item.to.y,
      ),
    )) {
      const preview = previewTunnelV7(view, command);
      if (preview === null) throw new Error("no preview");
      const played = playV7(state, command);
      const { events } = nextDwarfTurn(played.state);
      expect(surfacedEvent(events).results, JSON.stringify(command.to)).toEqual(
        preview.eruptionTargets,
      );
    }
  });
});

void (null as unknown as CoordV7);
