import { describe, expect, it } from "vitest";
import {
  SNOW_COVER_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  estimateCombatV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryUnitStatsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleAbilityV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  reachableMovementPathsV7,
  reachablePlayerMovementPathsV7,
  validateMovementPathV7,
} from "../../src/engine/v7/movement";
import {
  frozenArenaV7,
  patchFrozenUnitV7,
  type FrozenIceV7,
  type FrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.3, 8.10, 8.11, and 10):
// ice is ground for a land-form unit of every faction (a landing, a Push, a
// Knockback, a Charge!, a pull, an advance, a Beam Down, a bombing-run
// landing), a death on ice is a water death, Glacier shelters, and the Sea
// Dog of an Ice Folk seat counts its units on ice.

const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
const NO_GLACIER: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
];
/** The role of `faction` with `ability`. */
const roleWith = (
  faction: FactionIdV7,
  ability: UnitRoleAbilityV7,
): UnitRoleIdV7 => {
  const role = UNIT_ROLE_IDS_V7.find((candidate) =>
    effectiveRoleRuleV7(candidate, faction).abilities.includes(ability),
  );
  if (role === undefined) throw new Error(`${faction} has no ${ability}`);
  return role;
};
/** Seat 0 is `faction`; seat 1 is Ice Folk and owns the ice. */
const scene = (
  faction: FactionIdV7,
  units: readonly FrozenUnitV7[],
  ice: readonly CoordV7[],
  technologies: readonly TechnologyIdV7[] = ALL,
): GameStateV7 =>
  frozenArenaV7({
    factions: [faction, "ICE_FOLK"],
    technologies: [ALL, technologies],
    units,
    ice: ice.map((at): FrozenIceV7 => ({ at, seat: 1, turnsLeft: 3 })),
  });
const commandsOf = (state: GameStateV7, at: CoordV7) => {
  const unitId = navalUnitAtV7(state, at).id;
  return queryPlayerCommandsV7(viewForV7(state, seatV7(state, 0).id)).filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );
};
const attack = (state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 => ({
  kind: "ATTACK",
  unitId: navalUnitAtV7(state, from).id,
  targetUnitId: navalUnitAtV7(state, to).id,
});
const SHORE: CoordV7 = { x: 2, y: 2 };
const ICE1: CoordV7 = { x: 2, y: 3 };
const ICE2: CoordV7 = { x: 2, y: 4 };

describe("a land-form unit is placed on ice like on land (section 8.3)", () => {
  it("a Push moves a unit onto ice, and not onto open water", () => {
    const build = (ice: readonly CoordV7[]) =>
      scene(
        "ORIGINAL",
        [
          { seat: 0, role: "JUGGERNAUT", at: { x: 2, y: 1 } },
          // The Juggernaut's Push preview needs the tile behind the target
          // in the detection of an own unit (its historical rule).
          { seat: 0, role: "FIGHTER", at: { x: 3, y: 2 } },
          { seat: 1, role: "GUARD", at: SHORE },
        ],
        ice,
      );
    const frozen = build([ICE1]);
    const giant = navalUnitAtV7(frozen, { x: 2, y: 1 });
    const mammoth = navalUnitAtV7(frozen, SHORE);
    const view = viewForV7(frozen, seatV7(frozen, 0).id);
    expect(queryCombatPreviewV7(view, giant.id, mammoth.id)?.push).toBe(
      "WILL_PUSH",
    );
    const result = acceptV7(frozen, 0, attack(frozen, { x: 2, y: 1 }, SHORE));
    expect(result.events).toContainEqual({
      kind: "UNIT_PUSHED",
      sourceUnitId: giant.id,
      targetUnitId: mammoth.id,
      from: SHORE,
      to: ICE1,
    });
    expect(navalUnitV7(result.state, mammoth.id)).toMatchObject({
      at: ICE1,
      form: "LAND",
    });
    expect(parseGameStateV7(result.state)).not.toBeNull();
    const open = build([]);
    expect(
      queryCombatPreviewV7(
        viewForV7(open, seatV7(open, 0).id),
        giant.id,
        mammoth.id,
      )?.push,
    ).toBe("BLOCKED");
  });

  it("a Knockback moves a unit onto ice", () => {
    const cannon = roleWith("DWARF", "KNOCKBACK");
    const state = scene(
      "DWARF",
      [
        { seat: 0, role: cannon, at: { x: 2, y: 0 } },
        { seat: 1, role: "GUARD", at: SHORE },
      ],
      [ICE1],
    );
    const mammoth = navalUnitAtV7(state, SHORE);
    const shot = attack(state, { x: 2, y: 0 }, SHORE);
    expect(commandsOf(state, { x: 2, y: 0 })).toContainEqual(shot);
    const preview = queryCombatPreviewV7(
      viewForV7(state, seatV7(state, 0).id),
      navalUnitAtV7(state, { x: 2, y: 0 }).id,
      mammoth.id,
    );
    expect(preview?.push).toBe("WILL_PUSH");
    const result = acceptV7(state, 0, shot);
    expect(navalUnitV7(result.state, mammoth.id)).toMatchObject({
      at: ICE1,
      form: "LAND",
    });
  });

  it("a Charge! pushes its target along the ice and follows it onto ice", () => {
    const triceratops = roleWith("DINOSAUR", "LINEBREAKER");
    const state = scene(
      "DINOSAUR",
      [
        { seat: 0, role: triceratops, at: SHORE },
        { seat: 1, role: "GUARD", at: ICE1 },
      ],
      [ICE1, ICE2],
    );
    const charger = navalUnitAtV7(state, SHORE);
    const mammoth = navalUnitAtV7(state, ICE1);
    const result = acceptV7(state, 0, attack(state, SHORE, ICE1));
    expect(result.events).toContainEqual({
      kind: "UNIT_PUSHED",
      sourceUnitId: charger.id,
      targetUnitId: mammoth.id,
      from: ICE1,
      to: ICE2,
    });
    expect(navalUnitV7(result.state, mammoth.id).at).toEqual(ICE2);
    expect(navalUnitV7(result.state, charger.id)).toMatchObject({
      at: ICE1,
      form: "LAND",
    });
  });

  it("an attacker advances onto the ice its target died on", () => {
    const base = scene(
      "ORIGINAL",
      [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 1, role: "FIGHTER", at: ICE1 },
      ],
      [ICE1],
    );
    const state = patchFrozenUnitV7(base, navalUnitAtV7(base, ICE1).id, {
      hp: 1,
    });
    const attacker = navalUnitAtV7(state, SHORE);
    const victim = navalUnitAtV7(state, ICE1);
    expect(
      queryCombatPreviewV7(
        viewForV7(state, seatV7(state, 0).id),
        attacker.id,
        victim.id,
      ),
    ).toMatchObject({ defenderDies: true, advances: true });
    const result = acceptV7(state, 0, attack(state, SHORE, ICE1));
    expect(navalUnitV7(result.state, attacker.id)).toMatchObject({
      at: ICE1,
      form: "LAND",
    });
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });

  it("a death on ice is a water death: no rising and no Grave", () => {
    // A Zombie (Infect) kills a Yeti on ice.
    const zombie = roleWith("UNDEAD", "INFECT");
    const build = (target: CoordV7, from: CoordV7, ice: readonly CoordV7[]) => {
      const base = scene(
        "UNDEAD",
        [
          { seat: 0, role: zombie, at: from },
          { seat: 1, role: "FIGHTER", at: target },
        ],
        ice,
      );
      return patchFrozenUnitV7(base, navalUnitAtV7(base, target).id, { hp: 1 });
    };
    const frozen = build(ICE1, SHORE, [ICE1]);
    const attacker = navalUnitAtV7(frozen, SHORE);
    const victim = navalUnitAtV7(frozen, ICE1);
    const view = viewForV7(frozen, seatV7(frozen, 0).id);
    expect(queryCombatPreviewV7(view, attacker.id, victim.id)).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    const result = acceptV7(frozen, 0, attack(frozen, SHORE, ICE1));
    const kinds = result.events.map((event) => event.kind);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: victim.id,
      cause: "ATTACK",
    });
    expect(kinds).not.toContain("UNIT_INFECTED");
    expect(kinds).not.toContain("GRAVE_CREATED");
    expect(result.state.graves).toEqual([]);
    expect(navalUnitV7(result.state, attacker.id).at).toEqual(SHORE);
    expect(parseGameStateV7(result.state)).not.toBeNull();
    // On land the same kill is an Infect rising.
    const land = build({ x: 2, y: 1 }, SHORE, []);
    expect(
      estimateCombatV7(
        land,
        navalUnitAtV7(land, SHORE).id,
        navalUnitAtV7(land, { x: 2, y: 1 }).id,
      )?.defenderInfected,
    ).toBe(true);
  });

  it("a Tractor Beam pulls a land unit along the ice", () => {
    // The Mothership stands on the ice (a flyer does not self-launch there).
    const state = scene(
      "MARTIAN",
      [
        { seat: 0, role: "KNIGHT", at: ICE1 },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
      ],
      [ICE1, ICE2, { x: 2, y: 5 }, { x: 2, y: 6 }],
    );
    const yeti = navalUnitAtV7(state, { x: 2, y: 6 });
    const pull = commandsOf(state, ICE1).find(
      (command) =>
        command.kind === "TRACTOR_BEAM" && command.targetUnitId === yeti.id,
    );
    if (pull === undefined) throw new Error("the pull is not offered");
    const result = acceptV7(state, 0, pull);
    expect(navalUnitV7(result.state, yeti.id)).toMatchObject({
      at: ICE2,
      form: "LAND",
    });
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });

  it("a Beam Down sets a passenger down on ice", () => {
    const state = scene(
      "MARTIAN",
      [
        { seat: 0, role: "RAIDER", at: SHORE },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } },
      ],
      [ICE1],
    );
    const grunt = navalUnitAtV7(state, { x: 3, y: 1 });
    const drop = commandsOf(state, SHORE).find(
      (command) =>
        command.kind === "BEAM_DOWN" &&
        command.passengerUnitId === grunt.id &&
        command.to.x === ICE1.x &&
        command.to.y === ICE1.y,
    );
    if (drop === undefined) throw new Error("the Beam Down is not offered");
    const result = acceptV7(state, 0, drop);
    expect(navalUnitV7(result.state, grunt.id)).toMatchObject({
      at: ICE1,
      form: "LAND",
    });
    // Open water next to the Saucer is never a destination.
    expect(
      commandsOf(state, SHORE).some(
        (command) =>
          command.kind === "BEAM_DOWN" &&
          command.to.x === 1 &&
          command.to.y === 3,
      ),
    ).toBe(false);
  });

  it("a Gyrocopter lands a bombing run on ice and stands there", () => {
    const state = scene(
      "DWARF",
      [
        { seat: 0, role: "RAIDER", at: { x: 2, y: 1 } },
        { seat: 1, role: "GUARD", at: SHORE },
      ],
      [ICE1],
    );
    const gyro = navalUnitAtV7(state, { x: 2, y: 1 });
    const run = commandsOf(state, { x: 2, y: 1 }).find(
      (command) =>
        command.kind === "BOMB_RUN" &&
        command.to.x === ICE1.x &&
        command.to.y === ICE1.y,
    );
    if (run === undefined) throw new Error("the bombing run is not offered");
    const result = acceptV7(state, 0, run);
    expect(navalUnitV7(result.state, gyro.id)).toMatchObject({
      at: ICE1,
      form: "LAND",
    });
    expect(result.events.some((event) => event.kind === "UNIT_EMBARKED")).toBe(
      false,
    );
  });

  it("no Port is built on ice", () => {
    const build = (ice: readonly CoordV7[]) =>
      frozenArenaV7({
        ports: [false, true],
        units: [],
        ice: ice.map((at) => ({ at })),
      });
    const port: CommandV7 = { kind: "BUILD_PORT", at: { x: 5, y: 3 } };
    const open = build([]);
    expect(
      queryPlayerCommandsV7(viewForV7(open, seatV7(open, 0).id)),
    ).toContainEqual(port);
    const frozen = build([{ x: 5, y: 3 }]);
    expect(
      queryPlayerCommandsV7(viewForV7(frozen, seatV7(frozen, 0).id)),
    ).not.toContainEqual(port);
    expect(rejectV7(frozen, 0, port)).toEqual({
      code: "INVALID_TILE",
      params: { action: "BUILD_PORT" },
    });
  });
});

describe("Glacier (section 8.10)", () => {
  it("gives an Ice Folk unit on ice the Snow cover, exactly in the public preview", () => {
    const build = (technologies: readonly TechnologyIdV7[], target: CoordV7) =>
      scene(
        "ORIGINAL",
        [
          { seat: 0, role: "MARKSMAN", at: { x: 2, y: 1 } },
          { seat: 1, role: "FIGHTER", at: target },
        ],
        [ICE1],
        technologies,
      );
    const sheltered = build(ALL, ICE1);
    const archer = navalUnitAtV7(sheltered, { x: 2, y: 1 });
    const yeti = navalUnitAtV7(sheltered, ICE1);
    const view = viewForV7(sheltered, seatV7(sheltered, 0).id);
    // The opponent reads it from the unit's public stats.
    expect(queryUnitStatsV7(view, yeti.id)?.iceFolk).toMatchObject({
      onIce: true,
      slides: true,
      iceCover: true,
      onSnow: false,
    });
    const preview = queryCombatPreviewV7(view, archer.id, yeti.id);
    expect(preview).toMatchObject({
      iceCover: true,
      snowCover: false,
      defenseBonusNumerator: SNOW_COVER_V7.numerator,
      defenseBonusDenominator: SNOW_COVER_V7.denominator,
    });
    const result = acceptV7(
      sheltered,
      0,
      attack(sheltered, { x: 2, y: 1 }, ICE1),
    );
    const resolved = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(resolved.preview.iceCover).toBe(true);
    expect(resolved.preview.damageToDefender).toBe(preview?.damageToDefender);
    // Without Glacier there is no cover on ice.
    const bare = build(NO_GLACIER, ICE1);
    const bareView = viewForV7(bare, seatV7(bare, 0).id);
    const bareYeti = navalUnitAtV7(bare, ICE1);
    const bareArcher = navalUnitAtV7(bare, { x: 2, y: 1 });
    expect(queryUnitStatsV7(bareView, bareYeti.id)?.iceFolk).toMatchObject({
      onIce: true,
      iceCover: false,
    });
    const without = queryCombatPreviewV7(bareView, bareArcher.id, bareYeti.id);
    expect(without).toMatchObject({
      iceCover: false,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
    });
    expect(without?.damageToDefender).toBeGreaterThanOrEqual(
      preview?.damageToDefender ?? 0,
    );
  });

  it("gives an Ice Folk land unit +1 Move for a Move whose path includes ice (Ice Folk Freeze, `pulp_wars-w49.37`)", () => {
    // Seat 0 is the Ice Folk: a Yeti (Move 1) on (1, 1); (1, 2) is land
    // outside its territory, (1, 3) is its ice, and (1, 4) open Deep Water,
    // so it stops there. The land step and the ice step cost a point each.
    const build = (technologies: readonly TechnologyIdV7[]) =>
      frozenArenaV7({
        technologies: [technologies, ALL],
        units: [
          { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
          { seat: 1, role: "FIGHTER", at: { x: 9, y: 9 } },
        ],
        ice: [{ at: { x: 1, y: 3 } }],
      });
    const move = (state: GameStateV7, path: readonly CoordV7[]): CommandV7 => ({
      kind: "MOVE",
      unitId: navalUnitAtV7(state, { x: 1, y: 1 }).id,
      path: [...path],
    });
    const ontoIce = [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ];
    const endsOnIce = (state: GameStateV7): boolean =>
      commandsOf(state, { x: 1, y: 1 }).some(
        (command) =>
          command.kind === "MOVE" &&
          command.path.length === 2 &&
          command.path[1]?.x === 1 &&
          command.path[1]?.y === 3,
      );
    const glacier = build(ALL);
    expect(endsOnIce(glacier)).toBe(true);
    const moved = acceptV7(glacier, 0, move(glacier, ontoIce));
    expect(navalUnitAtV7(moved.state, { x: 1, y: 3 }).role).toBe("FIGHTER");
    // A path on land only keeps the ordinary budget.
    expect(
      rejectV7(
        glacier,
        0,
        move(glacier, [
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ]),
      ),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "BUDGET_EXCEEDED" },
    });
    // Without Glacier the ice path is over the budget too.
    const bare = build(NO_GLACIER);
    expect(endsOnIce(bare)).toBe(false);
    expect(rejectV7(bare, 0, move(bare, ontoIce))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "BUDGET_EXCEEDED" },
    });
  });

  it("offers the cheapest legal path to every tile: no detour over ice, no Move back to the start (`pulp_wars-mm8p`)", () => {
    // Seat 0 is the Ice Folk: a Sabretooth (Move 3, 6 half-points; 8 with
    // Glacier on a path over ice) on (1, 1) with its ice on (0, 3) to
    // (3, 3). Every land step and every ice step costs a point.
    const START: CoordV7 = { x: 1, y: 1 };
    const ICE_ROW: readonly CoordV7[] = [0, 1, 2, 3].map((x) => ({ x, y: 3 }));
    const build = (technologies: readonly TechnologyIdV7[]) =>
      frozenArenaV7({
        technologies: [technologies, ALL],
        units: [
          { seat: 0, role: "KNIGHT", at: START },
          { seat: 1, role: "FIGHTER", at: { x: 9, y: 9 } },
        ],
        ice: ICE_ROW.map((at) => ({ at })),
      });
    const keyOf = (at: CoordV7): string => `${String(at.x)},${String(at.y)}`;
    const onIce = (at: CoordV7): boolean =>
      ICE_ROW.some((ice) => ice.x === at.x && ice.y === at.y);
    // The cheapest legal Move to every tile, by brute force over every path
    // of up to 4 steps (4 points: the Glacier budget) through the
    // canonical validation.
    const cheapest = (state: GameStateV7): Map<string, number> => {
      const unit = navalUnitAtV7(state, START);
      const costs = new Map<string, number>();
      const visit = (path: readonly CoordV7[]): void => {
        const current = path.at(-1) ?? START;
        if (path.length === 4) return;
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            const next = { x: current.x + dx, y: current.y + dy };
            if (
              (dx === 0 && dy === 0) ||
              next.x < 0 ||
              next.y < 0 ||
              next.x >= state.board.width ||
              next.y >= state.board.height
            )
              continue;
            const candidate = [...path, next];
            const result = validateMovementPathV7(state, unit, candidate);
            if (
              result.legal &&
              result.traversedPath.length === candidate.length &&
              keyOf(next) !== keyOf(START)
            ) {
              const prior = costs.get(keyOf(next));
              if (prior === undefined || prior > result.spentPoints2)
                costs.set(keyOf(next), result.spentPoints2);
            }
            visit(candidate);
          }
      };
      visit([]);
      return costs;
    };
    const offered = (state: GameStateV7) => {
      const unit = navalUnitAtV7(state, START);
      const view = viewForV7(state, seatV7(state, 0).id);
      const publicUnit = view.units.find((other) => other.id === unit.id);
      if (publicUnit === undefined) throw new Error("no public unit");
      const canonical = reachableMovementPathsV7(state, unit);
      const visible = reachablePlayerMovementPathsV7(view, publicUnit);
      // The canonical search and the public query agree.
      expect(visible).toEqual(canonical);
      const moves = commandsOf(state, START).flatMap((command) =>
        command.kind === "MOVE" ? [command.path] : [],
      );
      expect(new Set(moves.map((path) => JSON.stringify(path)))).toEqual(
        new Set(visible.map((entry) => JSON.stringify(entry.path))),
      );
      for (const entry of visible) {
        // Every offered path is a legal Move of the cost it reports.
        const result = validateMovementPathV7(state, unit, entry.path);
        expect(result.legal && result.spentPoints2).toBe(entry.spentPoints2);
        acceptV7(state, 0, {
          kind: "MOVE",
          unitId: unit.id,
          path: [...entry.path],
        });
      }
      return visible;
    };
    const glacier = build(ALL);
    const paths = offered(glacier);
    // The reported detour: a tile two away is reached directly, for 2
    // points, not over the ice and back for 4.
    expect(
      paths.find((entry) => keyOf(entry.destination) === "3,1"),
    ).toMatchObject({ spentPoints2: 4 });
    expect(
      paths.find((entry) => keyOf(entry.destination) === "3,1")?.path,
    ).toHaveLength(2);
    // The start tile is never a destination.
    expect(paths.some((entry) => keyOf(entry.destination) === "1,1")).toBe(
      false,
    );
    // Every offered path is the cheapest legal one, and every tile with a
    // legal Move is offered.
    const costs = cheapest(glacier);
    expect(
      new Map(
        paths.map((entry) => [keyOf(entry.destination), entry.spentPoints2]),
      ),
    ).toEqual(costs);
    // Glacier adds reach only over ice: a path without ice keeps the 6
    // half-points, and some tile needs the ice path's 8.
    for (const entry of paths)
      if (!entry.path.some(onIce))
        expect(entry.spentPoints2).toBeLessThanOrEqual(6);
    const beyond = paths.filter((entry) => entry.spentPoints2 === 8);
    expect(beyond.length).toBeGreaterThan(0);
    for (const entry of beyond) expect(entry.path.some(onIce)).toBe(true);
    // Without Glacier those tiles are out of reach, and the rest is
    // unchanged.
    const bare = build(NO_GLACIER);
    const barePaths = offered(bare);
    expect(
      new Map(
        barePaths.map((entry) => [
          keyOf(entry.destination),
          entry.spentPoints2,
        ]),
      ),
    ).toEqual(
      new Map(
        paths
          .filter((entry) => entry.spentPoints2 <= 6)
          .map((entry) => [keyOf(entry.destination), entry.spentPoints2]),
      ),
    );
    expect(barePaths.map((entry) => entry.path)).toEqual(
      paths
        .filter((entry) => entry.spentPoints2 <= 6)
        .map((entry) => entry.path),
    );
  });
});

describe("no ships, Sea Dog (section 8.11)", () => {
  it("never offers or accepts a ship for an Ice Folk seat, whatever it researched", () => {
    const state = frozenArenaV7({ units: [] });
    const player = seatV7(state, 0);
    const commands = queryPlayerCommandsV7(viewForV7(state, player.id));
    expect(commands.some((command) => command.kind === "TRAIN_NAVAL")).toBe(
      false,
    );
    const capital = state.cities.find((city) => city.ownerId === player.id);
    if (capital === undefined) throw new Error("no capital");
    for (const role of ["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"] as const)
      expect(
        rejectV7(state, 0, {
          kind: "TRAIN_NAVAL",
          cityId: capital.id,
          at: { x: 4, y: 3 },
          role,
        }),
      ).toEqual({ code: "UNIT_ROLE_INVALID", params: { role } });
    // The Human seat with the same technologies trains them.
    const human = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [],
    });
    expect(
      queryPlayerCommandsV7(viewForV7(human, seatV7(human, 0).id))
        .filter((command) => command.kind === "TRAIN_NAVAL")
        .map((command) => (command.kind === "TRAIN_NAVAL" ? command.role : "")),
    ).toEqual(["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"]);
  });

  it("the Sea Dog of an Ice Folk seat counts its land units standing on ice", () => {
    const progress = (state: GameStateV7, seat: 0 | 1) =>
      viewForV7(state, seatV7(state, seat).id).achievementProgress.find(
        (entry) => entry.achievement === "SEA_DOG",
      );
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: ICE1 },
        { seat: 0, role: "FIGHTER", at: ICE2 },
        // The economy rejig (`pulp_wars-w49.16`, 7r54): 5 units (3).
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 4 } },
        { seat: 0, role: "RAIDER", at: SHORE },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 5 } },
      ],
      ice: [{ at: { x: 3, y: 3 } }],
    });
    expect(progress(state, 0)).toEqual({
      achievement: "SEA_DOG",
      current: 4,
      required: 5,
    });
    // The Human seat still counts its ships.
    expect(progress(state, 1)).toMatchObject({ current: 1, required: 5 });
    // A fifth unit steps onto the ice: the achievement unlocks.
    const sled = navalUnitAtV7(state, SHORE);
    const result = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: sled.id,
      path: [{ x: 3, y: 3 }],
    });
    expect(progress(result.state, 0)).toMatchObject({ current: 5 });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "ACHIEVEMENT_UNLOCKED",
        achievement: "SEA_DOG",
      }),
    );
  });
});
