import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  estimateCombatV7,
  isNavalRoleV7,
  parseGameStateV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  NAVAL_TECHS_V7,
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step I (`pulp_wars-5ti.2`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 5.1 to 5.3 and 5.5): the
// Submarine, Submerged (attacked only from an adjacent tile), and Torpedo
// (it attacks only units afloat, which never strike back).

const WITHOUT_SUBMERSIBLES: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
];

function resolved(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events.find((entry) => entry.kind === "COMBAT_RESOLVED");
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

function commandsOf(state: GameStateV7, seat: 0 | 1, unitId: number) {
  return queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id)).filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );
}

function attacks(state: GameStateV7, seat: 0 | 1, unitId: number): number[] {
  return commandsOf(state, seat, unitId).flatMap((command) =>
    command.kind === "ATTACK" ? [command.targetUnitId as number] : [],
  );
}

describe("training a Submarine", () => {
  it("is trained with TRAIN_NAVAL at an active empty dock for 9 Coins by every faction with Submersibles", () => {
    for (const faction of FACTION_IDS_V7) {
      const other: FactionIdV7 = faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL";
      const state = navalArenaV7({ factions: [faction, other], units: [] });
      const actor = seatV7(state, 0);
      const city = state.cities.find((entry) => entry.ownerId === actor.id);
      if (city === undefined) throw new Error("no city");
      const command: CommandV7 = {
        kind: "TRAIN_NAVAL",
        cityId: city.id,
        at: NAVAL_ARENA_PORTS_V7[0],
        role: "SUBMARINE",
      };
      expect(
        queryPlayerCommandsV7(viewForV7(state, actor.id)),
        faction,
      ).toContainEqual(command);
      const result = acceptV7(state, 0, command);
      const trained = navalUnitAtV7(result.state, NAVAL_ARENA_PORTS_V7[0]);
      expect(trained, faction).toMatchObject({
        ownerId: actor.id,
        homeCityId: city.id,
        role: "SUBMARINE",
        form: "NAVAL",
        hp: 12,
        maxHp: 12,
        activation: { handled: true },
      });
      expect(result.events[0]).toEqual({
        kind: "NAVAL_UNIT_TRAINED",
        playerId: actor.id,
        cityId: city.id,
        unitId: trained.id,
        role: "SUBMARINE",
        cost: 9,
        at: NAVAL_ARENA_PORTS_V7[0],
        dock: "PORT",
        discountSource: null,
      });
      expect(seatV7(result.state, 0).coins).toBe(actor.coins - 9);
      expect(parseGameStateV7(result.state)).not.toBeNull();
    }
  });

  it("needs Submersibles, is never a land TRAIN, and costs 7 at a Shipyard", () => {
    const untrained = navalArenaV7({
      technologies: [WITHOUT_SUBMERSIBLES, NAVAL_TECHS_V7],
      units: [],
    });
    const cityOf = (state: GameStateV7) => {
      const city = state.cities.find(
        (entry) => entry.ownerId === seatV7(state, 0).id,
      );
      if (city === undefined) throw new Error("no city");
      return city;
    };
    const train = (state: GameStateV7): CommandV7 => ({
      kind: "TRAIN_NAVAL",
      cityId: cityOf(state).id,
      at: NAVAL_ARENA_PORTS_V7[0],
      role: "SUBMARINE",
    });
    expect(rejectV7(untrained, 0, train(untrained))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "SUBMERSIBLES" },
    });
    expect(
      queryPlayerCommandsV7(
        viewForV7(untrained, seatV7(untrained, 0).id),
      ).filter(
        (command) =>
          command.kind === "TRAIN_NAVAL" && command.role === "SUBMARINE",
      ),
    ).toEqual([]);
    const state = navalArenaV7({ units: [] });
    expect(
      rejectV7(state, 0, {
        kind: "TRAIN",
        cityId: cityOf(state).id,
        role: "SUBMARINE",
      }),
    ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role: "SUBMARINE" } });
    // The Shipyard discount (Naval Engineering) applies as for every boat.
    const shipyard = acceptV7(state, 0, {
      kind: "BUILD_SHIPYARD",
      at: NAVAL_ARENA_PORTS_V7[0],
    });
    const trained = acceptV7(shipyard.state, 0, train(shipyard.state));
    expect(trained.events[0]).toMatchObject({
      kind: "NAVAL_UNIT_TRAINED",
      role: "SUBMARINE",
      cost: 7,
      dock: "SHIPYARD",
      discountSource: "SHIPYARD",
    });
  });

  it("is a boat: Move 2, Deep Water only with Navigation, no capture, promoted to 17 HP, recovers at its dock", () => {
    const state = navalArenaV7({
      technologies: [
        ["SHORECRAFT", "SEAMANSHIP", "SUBMERSIBLES"],
        NAVAL_TECHS_V7,
      ],
      units: [{ seat: 0, role: "SUBMARINE", at: { x: 5, y: 3 } }],
    });
    const submarine = navalUnitAtV7(state, { x: 5, y: 3 });
    const moves = commandsOf(state, 0, submarine.id).flatMap((command) =>
      command.kind === "MOVE" ? [command.path] : [],
    );
    expect(moves.length).toBeGreaterThan(0);
    // Without Navigation it stays on Shallow Water (row 3), two tiles at most.
    for (const path of moves) {
      expect(path.length).toBeLessThanOrEqual(2);
      for (const step of path) expect(step.y).toBe(3);
    }
    const sailor = navalArenaV7({
      units: [{ seat: 0, role: "SUBMARINE", at: { x: 5, y: 3 } }],
    });
    const deep = commandsOf(
      sailor,
      0,
      navalUnitAtV7(sailor, { x: 5, y: 3 }).id,
    ).some(
      (command) =>
        command.kind === "MOVE" && command.path.some((step) => step.y === 5),
    );
    expect(deep).toBe(true);
    const kinds = commandsOf(state, 0, submarine.id).map(
      (command) => command.kind,
    );
    for (const never of [
      "CAPTURE",
      "PILLAGE",
      "DISBAND",
      "BUILD_FIELD_DEFENSE",
    ])
      expect(kinds).not.toContain(never);
    // Ordinary Promotion: +5 maximum HP, fully healed.
    const veteran = patchNavalUnitV7(state, submarine.id, { kills: 3, hp: 5 });
    const promoted = acceptV7(veteran, 0, {
      kind: "PROMOTE",
      unitId: submarine.id,
    });
    expect(navalUnitV7(promoted.state, submarine.id)).toMatchObject({
      maxHp: 17,
      hp: 17,
      veteran: true,
    });
    // Naval recovery: 4 on or next to an own active dock ((5, 3) is next to
    // the Port on (4, 3)).
    const wounded = patchNavalUnitV7(state, submarine.id, { hp: 5 });
    const recovered = acceptV7(wounded, 0, {
      kind: "RECOVER",
      unitId: submarine.id,
    });
    expect(navalUnitV7(recovered.state, submarine.id).hp).toBe(9);
  });

  it("publishes submerged and boardableAt in the unit stats", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
        { seat: 0, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        { seat: 0, role: "RAIDER", at: { x: 2, y: 1 } },
        { seat: 1, role: "SUBMARINE", at: { x: 2, y: 6 } },
      ],
    });
    const raider = navalUnitAtV7(base, { x: 2, y: 1 });
    const state = patchNavalUnitV7(base, raider.id, {
      form: "EMBARKED",
      at: { x: 7, y: 4 },
    });
    // Both seats read the same public facts for every visible unit.
    for (const seat of [0, 1] as const) {
      const view = viewForV7(state, seatV7(state, seat).id);
      const stats = (at: CoordV7) => {
        const unit = view.units.find(
          (entry) => entry.at.x === at.x && entry.at.y === at.y,
        );
        const found = view.unitStats.find((entry) => entry.unitId === unit?.id);
        if (found === undefined) throw new Error("stats missing");
        return [found.submerged, found.boardableAt, found.abilities];
      };
      expect(stats({ x: 2, y: 4 })).toEqual([
        true,
        4,
        ["ATTACK", "SUBMERGED", "TORPEDO"],
      ]);
      expect(stats({ x: 2, y: 6 })).toEqual([
        true,
        4,
        ["ATTACK", "SUBMERGED", "TORPEDO"],
      ]);
      expect(stats({ x: 3, y: 4 })).toEqual([false, 3, ["ATTACK", "RAM"]]);
      expect(stats({ x: 4, y: 5 })).toEqual([false, 8, ["ATTACK"]]);
      // A transport and a land unit are neither submerged nor boardable.
      expect(stats({ x: 7, y: 4 })).toEqual([false, null, []]);
      expect(stats({ x: 5, y: 2 }).slice(0, 2)).toEqual([false, null]);
    }
  });
});

describe("Submerged", () => {
  /** Every land role of every faction that attacks from 2 or more tiles. */
  const rangedLandRoles = FACTION_IDS_V7.flatMap((faction) =>
    UNIT_ROLE_IDS_V7.filter((role) => {
      const rule = effectiveRoleRuleV7(role, faction);
      return (
        !isNavalRoleV7(role) &&
        rule.abilities.includes("ATTACK") &&
        rule.range >= 2
      );
    }).map((role) => [faction, role] as const),
  );

  it("refuses, never offers, and never previews an attack on a Submarine from 2 or more tiles, for every ranged attacker of every faction", () => {
    // At least the Marksman and Catapult roles of all eight factions.
    expect(rangedLandRoles.length).toBeGreaterThanOrEqual(16);
    for (const [faction, role] of rangedLandRoles) {
      const rule = effectiveRoleRuleV7(role, faction);
      const other: FactionIdV7 = faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL";
      for (const targetRole of ["SUBMARINE", "PATROL_BOAT"] as const) {
        // The shooter stands on the shore (2, 2); the ship is `distance`
        // tiles south of it, in open water.
        const distance = Math.max(2, rule.minimumRange);
        const state = navalArenaV7({
          factions: [faction, other],
          units: [
            { seat: 0, role, at: { x: 2, y: 2 } },
            { seat: 1, role: targetRole, at: { x: 2, y: 2 + distance } },
          ],
        });
        const shooter = navalUnitAtV7(state, { x: 2, y: 2 });
        const ship = navalUnitAtV7(state, { x: 2, y: 2 + distance });
        const label = `${faction} ${rule.label} on ${targetRole}`;
        const command: CommandV7 = {
          kind: "ATTACK",
          unitId: shooter.id,
          targetUnitId: ship.id,
        };
        const view = viewForV7(state, seatV7(state, 0).id);
        const threatened = queryThreatenedTilesV7(view, shooter.id).some(
          (at) => at.x === ship.at.x && at.y === ship.at.y,
        );
        if (targetRole === "PATROL_BOAT") {
          // The control: the same shot at a Patrol Boat is legal.
          expect(attacks(state, 0, shooter.id), label).toContain(ship.id);
          expect(
            queryCombatPreviewV7(view, shooter.id, ship.id),
            label,
          ).not.toBeNull();
          expect(threatened, label).toBe(true);
          acceptV7(state, 0, command);
          continue;
        }
        expect(attacks(state, 0, shooter.id), label).toEqual([]);
        expect(rejectV7(state, 0, command), label).toEqual({
          code: "TARGET_OUT_OF_RANGE",
          params: {},
        });
        expect(
          queryCombatPreviewV7(view, shooter.id, ship.id),
          label,
        ).toBeNull();
        expect(estimateCombatV7(state, shooter.id, ship.id), label).toBeNull();
        expect(threatened, label).toBe(false);
      }
    }
  });

  it("lets a Battleship shoot a Submarine only from the adjacent tile", () => {
    for (const distance of [1, 2, 3]) {
      const state = navalArenaV7({
        units: [
          { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 3 } },
          { seat: 1, role: "SUBMARINE", at: { x: 2, y: 3 + distance } },
        ],
      });
      const battleship = navalUnitAtV7(state, { x: 2, y: 3 });
      const submarine = navalUnitAtV7(state, { x: 2, y: 3 + distance });
      const command: CommandV7 = {
        kind: "ATTACK",
        unitId: battleship.id,
        targetUnitId: submarine.id,
      };
      const view = viewForV7(state, seatV7(state, 0).id);
      const threatened = queryThreatenedTilesV7(view, battleship.id).some(
        (at) => at.x === submarine.at.x && at.y === submarine.at.y,
      );
      if (distance === 1) {
        // A fresh Battleship deals 20: sunk.
        const hit = acceptV7(state, 0, command);
        expect(resolved(hit.events)).toMatchObject({
          damageToDefender: 12,
          defenderDies: true,
          torpedo: false,
        });
        expect(threatened).toBe(true);
      } else {
        expect(attacks(state, 0, battleship.id)).toEqual([]);
        expect(rejectV7(state, 0, command).code).toBe("TARGET_OUT_OF_RANGE");
        expect(
          queryCombatPreviewV7(view, battleship.id, submarine.id),
        ).toBeNull();
        // The threat envelope is movement plus reach: the Battleship can
        // sail next to the Submarine, and only from there is it in reach.
        expect(threatened).toBe(true);
      }
    }
  });

  it("is still reached by splash, and by a Dwarf bomb (not an ATTACK)", () => {
    // A Battleship shells a Patrol Boat next to the Submarine.
    const state = navalArenaV7({
      units: [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 2, y: 6 } },
      ],
    });
    const battleship = navalUnitAtV7(state, { x: 2, y: 3 });
    const boat = navalUnitAtV7(state, { x: 2, y: 5 });
    const submarine = navalUnitAtV7(state, { x: 2, y: 6 });
    const view = viewForV7(state, seatV7(state, 0).id);
    const preview = queryCombatPreviewV7(view, battleship.id, boat.id);
    expect(preview?.splash.map((entry) => entry.unitId)).toEqual([
      submarine.id,
    ]);
    const hit = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: battleship.id,
      targetUnitId: boat.id,
    });
    expect(resolved(hit.events).splash).toEqual(preview?.splash);
    expect(navalUnitV7(hit.state, submarine.id).hp).toBeLessThan(12);
    // A Gyrocopter bombs a Submarine two tiles away.
    const dwarves = navalArenaV7({
      factions: ["DWARF", "ORIGINAL"],
      units: [
        { seat: 0, role: "RAIDER", at: { x: 2, y: 2 } },
        { seat: 1, role: "SUBMARINE", at: { x: 2, y: 4 } },
      ],
    });
    const gyrocopter = navalUnitAtV7(dwarves, { x: 2, y: 2 });
    const target = navalUnitAtV7(dwarves, { x: 2, y: 4 });
    const bombs = commandsOf(dwarves, 0, gyrocopter.id).filter(
      (command) =>
        command.kind === "BOMB_RUN" && command.targetUnitId === target.id,
    );
    expect(bombs.length).toBeGreaterThan(0);
    const bombed = acceptV7(dwarves, 0, bombs[0] as CommandV7);
    expect(navalUnitV7(bombed.state, target.id).hp).toBe(7);
  });
});

describe("Torpedo", () => {
  it("targets only units afloat: a land unit is refused with NOT_AFLOAT and never offered or threatened", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 7 } },
        { seat: 1, role: "RAIDER", at: { x: 2, y: 8 } },
        { seat: 1, role: "RAIDER", at: { x: 1, y: 9 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 } },
      ],
    });
    const submarine = navalUnitAtV7(base, { x: 2, y: 7 });
    const onShore = navalUnitAtV7(base, { x: 2, y: 8 });
    const boat = navalUnitAtV7(base, { x: 3, y: 7 });
    const passenger = navalUnitAtV7(base, { x: 1, y: 9 });
    const state = patchNavalUnitV7(base, passenger.id, {
      form: "EMBARKED",
      at: { x: 1, y: 7 },
    });
    expect(
      rejectV7(state, 0, {
        kind: "ATTACK",
        unitId: submarine.id,
        targetUnitId: onShore.id,
      }),
    ).toEqual({ code: "ATTACK_NOT_LEGAL", params: { reason: "NOT_AFLOAT" } });
    // Offered: the boat and the transport, not the unit on the shore.
    expect(attacks(state, 0, submarine.id).sort()).toEqual(
      [boat.id, passenger.id].sort(),
    );
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(queryCombatPreviewV7(view, submarine.id, onShore.id)).toBeNull();
    expect(estimateCombatV7(state, submarine.id, onShore.id)).toBeNull();
    // It threatens water only.
    const threatened = queryThreatenedTilesV7(view, submarine.id);
    expect(threatened.length).toBeGreaterThan(0);
    for (const at of threatened) {
      const tile = state.board.tiles.find(
        (entry) => entry.at.x === at.x && entry.at.y === at.y,
      );
      expect(["SHALLOW_WATER", "DEEP_WATER"]).toContain(tile?.terrain);
    }
    // The other seat reads the same reach for the visible Submarine.
    expect(
      queryThreatenedTilesV7(
        viewForV7(state, seatV7(state, 1).id),
        submarine.id,
      ),
    ).toEqual(threatened);
  });

  it("matches the worked examples and is never answered", () => {
    const duel = (
      targetRole: UnitRoleIdV7,
      targetHp?: number,
    ): {
      readonly preview: CombatPreviewV7;
      readonly state: GameStateV7;
      readonly targetId: number;
    } => {
      const base = navalArenaV7({
        units: [
          { seat: 0, role: "SUBMARINE", at: { x: 2, y: 5 } },
          { seat: 1, role: targetRole, at: { x: 2, y: 6 } },
        ],
      });
      const submarine = navalUnitAtV7(base, { x: 2, y: 5 });
      const target = navalUnitAtV7(base, { x: 2, y: 6 });
      const state =
        targetHp === undefined
          ? base
          : patchNavalUnitV7(base, target.id, { hp: targetHp });
      const view = viewForV7(state, seatV7(state, 0).id);
      const preview = queryCombatPreviewV7(view, submarine.id, target.id);
      const result = acceptV7(state, 0, {
        kind: "ATTACK",
        unitId: submarine.id,
        targetUnitId: target.id,
      });
      // The public preview equals the resolution.
      expect(preview).toEqual(resolved(result.events));
      return {
        preview: resolved(result.events),
        state: result.state,
        targetId: target.id,
      };
    };
    // A Patrol Boat: 12, sunk, no reply.
    expect(duel("PATROL_BOAT").preview).toMatchObject({
      attack2: 8,
      damageToDefender: 10,
      defenderDies: true,
      damageToAttacker: 0,
      retaliation: false,
      noRetaliationReason: "DEFENDER_DIED",
      torpedo: true,
      ram: false,
      advances: false,
    });
    // A Battleship: 9, no reply; a second torpedo on 16 HP: 11.
    const battleship = duel("BATTLESHIP");
    expect(battleship.preview).toMatchObject({
      damageToDefender: 9,
      damageToAttacker: 0,
      retaliation: false,
      noRetaliationReason: "UNANSWERED",
      torpedo: true,
    });
    expect(navalUnitV7(battleship.state, battleship.targetId).hp).toBe(16);
    expect(duel("BATTLESHIP", 16).preview).toMatchObject({
      damageToDefender: 11,
      retaliation: false,
      noRetaliationReason: "UNANSWERED",
    });
    // The mirror: first strike sinks (12 on 12 HP).
    expect(duel("SUBMARINE").preview).toMatchObject({
      damageToDefender: 12,
      defenderDies: true,
      torpedo: true,
    });
  });

  it("deals 14 to a transport, and the Submarine retaliates normally when attacked from an adjacent tile", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 7 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 9 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 } },
      ],
      factions: ["UNDEAD", "ORIGINAL"],
    });
    const submarine = navalUnitAtV7(base, { x: 2, y: 7 });
    const guard = navalUnitAtV7(base, { x: 2, y: 9 });
    const fighter = navalUnitAtV7(base, { x: 3, y: 8 });
    // The Human Guard (17 HP) is at sea next to the Submarine.
    const state = patchNavalUnitV7(base, guard.id, {
      form: "EMBARKED",
      at: { x: 1, y: 7 },
    });
    const hit = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: submarine.id,
      targetUnitId: guard.id,
    });
    expect(resolved(hit.events)).toMatchObject({
      damageToDefender: 14,
      damageToAttacker: 0,
      torpedo: true,
    });
    // A Human Fighter on the shore attacks it: 5 dealt, 5 taken.
    const passed = acceptV7(state, 0, { kind: "END_TURN" });
    const struck = acceptV7(passed.state, 1, {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: submarine.id,
    });
    expect(resolved(struck.events)).toMatchObject({
      damageToDefender: 5,
      damageToAttacker: 5,
      retaliation: true,
      torpedo: false,
    });
  });

  it("sinks a 5-HP Battleship that shoots an adjacent Submarine, by retaliation", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 2, y: 6 } },
      ],
    });
    const battleship = navalUnitAtV7(base, { x: 2, y: 5 });
    const submarine = navalUnitAtV7(base, { x: 2, y: 6 });
    const state = patchNavalUnitV7(base, battleship.id, { hp: 5 });
    const hit = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: battleship.id,
      targetUnitId: submarine.id,
    });
    expect(resolved(hit.events)).toMatchObject({
      damageToDefender: 10,
      damageToAttacker: 5,
      attackerDies: true,
      retaliation: true,
    });
    expect(navalUnitV7(hit.state, submarine.id).hp).toBe(2);
  });
});

describe("the Submarine is public like any unit, and no more", () => {
  it("is in the view of every viewer that has explored its tile, and in no other viewer's view, stats, offers, or events", () => {
    const state = navalArenaV7({
      third: { faction: "GOBLIN" },
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 6 } },
      ],
    });
    const submarine = navalUnitAtV7(state, { x: 2, y: 5 });
    const boat = navalUnitAtV7(state, { x: 2, y: 6 });
    // Seat 1 has explored the board: it sees the Submarine where it is.
    const opponent = viewForV7(state, seatV7(state, 1).id);
    expect(
      opponent.units.find((unit) => unit.id === submarine.id),
    ).toMatchObject({
      at: { x: 2, y: 5 },
      role: "SUBMARINE",
      form: "NAVAL",
      hp: 12,
    });
    // The bystander has explored only its capital's surroundings.
    const bystanderId = seatV7(state, 2).id;
    const bystander = viewForV7(state, bystanderId);
    expect(bystander.units.some((unit) => unit.id === submarine.id)).toBe(
      false,
    );
    expect(
      bystander.unitStats.some((entry) => entry.unitId === submarine.id),
    ).toBe(false);
    expect(JSON.stringify(bystander)).not.toContain('"SUBMARINE"');
    expect(queryThreatenedTilesV7(bystander, submarine.id)).toEqual([]);
    // A torpedo out of the bystander's sight reaches it in no event.
    const hit = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: submarine.id,
      targetUnitId: boat.id,
    });
    expect(resolved(hit.events)).toMatchObject({ torpedo: true });
    const projected = (seat: 0 | 1 | 2) =>
      projectEvents(state, hit.state, seatV7(state, seat).id, hit.events);
    expect(projected(0).map((event) => event.kind)).toContain(
      "COMBAT_RESOLVED",
    );
    expect(projected(1).map((event) => event.kind)).toContain(
      "COMBAT_RESOLVED",
    );
    expect(projected(2)).toEqual([]);
    expect(JSON.stringify(viewForV7(hit.state, bystanderId))).not.toContain(
      '"SUBMARINE"',
    );
  });

  it("does not tell a viewer whether an opponent has Seamanship or Submersibles through its ships' public stats", () => {
    const viewWith = (technologies: readonly TechnologyIdV7[]) => {
      const state = navalArenaV7({
        technologies: [NAVAL_TECHS_V7, technologies],
        ports: [true, false],
        units: [
          { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 6 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 6 } },
        ],
      });
      const moved = patchNavalUnitV7(
        state,
        navalUnitAtV7(state, { x: 2, y: 6 }).id,
        {
          activation: {
            ...navalUnitAtV7(state, { x: 2, y: 6 }).activation,
            moved: true,
            movedPathLength: 1,
          },
        },
      );
      return viewForV7(moved, seatV7(moved, 0).id);
    };
    const without = viewWith(["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"]);
    const withBranch = viewWith(NAVAL_TECHS_V7);
    // Everything seat 0 can read is the same, whatever seat 1 researched.
    expect(withBranch.units).toEqual(without.units);
    expect(withBranch.unitStats).toEqual(without.unitStats);
    expect(queryPlayerCommandsV7(withBranch)).toEqual(
      queryPlayerCommandsV7(without),
    );
    expect(withBranch.cities).toEqual(without.cities);
    expect(withBranch.leaderboard).toEqual(without.leaderboard);
  });
});

function projectEvents(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: Parameters<typeof projectEventsV7>[2],
  events: readonly DomainEventV7[],
) {
  return projectEventsV7(before, after, viewerId, events).events;
}
