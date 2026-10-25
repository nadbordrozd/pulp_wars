import { afterEach, describe, expect, it } from "vitest";
import {
  NormalPolicyWorkV7,
  chooseNormalCommandV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  SCALE_MODE_SWITCH_V7,
  SCALE_MODE_UNITS_V7,
  SCALE_WINDOW_UNITS_V7,
  ScaleCommandWorkV7,
  scaleModeV7,
  scaleUnitOrderV7,
} from "../../src/ai/v7-scale";
import {
  createPublicCommandWorkV7,
  createPublicPlanningWorkV7,
  effectiveRoleRuleV7,
  queryOfferedUnitCommandsV7,
  queryPlayerCommandsV7,
  restrictPublicCommandsV7,
  compareCommandsV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * The Normal AI scale mode (`pulp_wars-z6za`, src/ai/v7-scale.ts) on
 * hand-built states: one decision each, no match is played.
 */

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

const SPENT: UnitStateV7["activation"] = {
  ...READY,
  moved: true,
  movedPathLength: 1,
  attacked: true,
  attacksUsed: 1,
};

const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const key = (at: CoordV7): string => `${at.y},${at.x}`;

interface Piece {
  readonly own: boolean;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly activation?: UnitStateV7["activation"];
}

/**
 * The four-seat 16 x 16 rule board, every tile explored, the Human seat to
 * move with `coins` Coins and these pieces as the only units (own pieces for
 * the Human seat, the others for the next seat).
 */
function board(
  pieces: (base: GameStateV7) => readonly Piece[],
  coins = 0,
): GameStateV7 {
  const base = exploredAllV7(initialV7(71, 3));
  const own = base.humanPlayerId;
  const rival = base.turnOrder.find((id) => id !== own);
  if (rival === undefined) throw new Error("no rival");
  let nextEntityId = base.nextEntityId;
  const units = pieces(base).map((piece): UnitStateV7 => {
    const rule = effectiveRoleRuleV7(piece.role, "ORIGINAL");
    const id = unitId(nextEntityId);
    nextEntityId += 1;
    return {
      id,
      ownerId: piece.own ? own : rival,
      homeCityId: null,
      role: piece.role,
      form: "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: piece.activation ?? READY,
    };
  });
  return checkedV7({
    ...base,
    nextEntityId,
    players: base.players.map((player) =>
      player.id === own ? { ...player, coins } : player,
    ),
    units,
  });
}

/** Free Grass tiles (no city), nearest `from` first. */
function grass(state: GameStateV7, from: CoordV7): CoordV7[] {
  // No unit stands on a city center or a treasure chest.
  const taken = new Set([
    ...state.cities.map((city) => key(city.at)),
    ...state.treasureChests.map(key),
  ]);
  return state.board.tiles
    .filter((tile) => tile.terrain === "GRASS" && !taken.has(key(tile.at)))
    .map((tile) => tile.at)
    .sort(
      (left, right) =>
        distance(left, from) - distance(right, from) ||
        left.y - right.y ||
        left.x - right.x,
    );
}

function ownCapital(state: GameStateV7): CoordV7 {
  const city = state.cities.find(
    (item) => item.ownerId === state.humanPlayerId && item.isCapital,
  );
  if (city === undefined) throw new Error("no capital");
  return city.at;
}

function rivalCapital(state: GameStateV7): CoordV7 {
  const rival = state.turnOrder.find((id) => id !== state.humanPlayerId);
  const city = state.cities.find(
    (item) => item.ownerId === rival && item.isCapital,
  );
  if (city === undefined) throw new Error("no rival capital");
  return city.at;
}

/** The decision's best command for a unit (research may come first). */
function bestUnitCommand(decision: NormalAiDecisionV7): CommandV7 | undefined {
  return decision.candidates.find((candidate) => "unitId" in candidate.command)
    ?.command;
}

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

/** `count` spent own Swordsmen on the Grass nearest the own capital. */
function rear(state: GameStateV7, count: number, skip: ReadonlySet<string>) {
  return grass(state, ownCapital(state))
    .filter((at) => !skip.has(key(at)))
    .slice(0, count)
    .map((at): Piece => ({
      own: true,
      role: "SWORDSMAN",
      at,
      activation: SPENT,
    }));
}

afterEach(() => {
  SCALE_MODE_SWITCH_V7.enabled = true;
  SCALE_MODE_SWITCH_V7.windowUnits = SCALE_WINDOW_UNITS_V7;
});

describe("the Normal AI scale mode (pulp_wars-z6za)", () => {
  it("decides in full below the unit threshold and in scale mode above it", () => {
    const at = (state: GameStateV7) => grass(state, ownCapital(state));
    const small = board((base) =>
      at(base)
        .slice(0, SCALE_MODE_UNITS_V7)
        .map((tile) => ({ own: true, role: "SWORDSMAN", at: tile })),
    );
    const large = board((base) =>
      at(base)
        .slice(0, SCALE_MODE_UNITS_V7 + 1)
        .map((tile) => ({ own: true, role: "SWORDSMAN", at: tile })),
    );
    expect(scaleModeV7(viewOf(small))).toBe(false);
    expect(scaleModeV7(viewOf(large))).toBe(true);
    SCALE_MODE_SWITCH_V7.enabled = false;
    expect(scaleModeV7(viewOf(large))).toBe(false);
  });

  it("is the full policy below the threshold: the same candidates", () => {
    const state = board((base) =>
      grass(base, ownCapital(base))
        .slice(0, 12)
        .map((tile) => ({ own: true, role: "SWORDSMAN", at: tile })),
    );
    const on = chooseNormalCommandV7(viewOf(state));
    SCALE_MODE_SWITCH_V7.enabled = false;
    const off = chooseNormalCommandV7(viewOf(state));
    expect(JSON.stringify(on)).toBe(JSON.stringify(off));
  });

  it("orders the own units nearest a hostile unit or city first", () => {
    const state = board((base) => {
      const target = rivalCapital(base);
      const tiles = grass(base, target);
      return [
        { own: true, role: "SWORDSMAN", at: tiles[5] as CoordV7 },
        { own: true, role: "SWORDSMAN", at: tiles[1] as CoordV7 },
        { own: true, role: "SWORDSMAN", at: tiles[20] as CoordV7 },
      ];
    });
    const view = viewOf(state);
    const order = scaleUnitOrderV7(view).map((unit) =>
      distance(unit.at, rivalCapital(state)),
    );
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(order).toHaveLength(3);
  });

  it("offers one window of the units that can act, every unit command once", () => {
    const state = board((base) =>
      grass(base, rivalCapital(base))
        .slice(0, 50)
        .map((tile) => ({ own: true, role: "SWORDSMAN", at: tile })),
    );
    const view = viewOf(state);
    const drain = (window: number) => {
      const work = new ScaleCommandWorkV7(view, window);
      for (;;) {
        const progress = work.advance(1);
        if (progress.done && progress.commands !== null)
          return { work, commands: progress.commands };
      }
    };
    const first = drain(0);
    const actors = (commands: readonly CommandV7[]) =>
      new Set(
        commands.flatMap((command) =>
          "unitId" in command ? [command.unitId] : [],
        ),
      );
    expect(actors(first.commands).size).toBe(SCALE_WINDOW_UNITS_V7);
    expect(first.work.laterWindow).toBe(true);
    // The window's units are the nearest the enemy.
    const nearest = scaleUnitOrderV7(view)
      .slice(0, SCALE_WINDOW_UNITS_V7)
      .map((unit) => unit.id);
    expect([...actors(first.commands)].sort()).toEqual(nearest.sort());
    // Each window's commands are exactly what full enumeration offers them.
    const full = queryPlayerCommandsV7(view);
    const offered = new Set(full.map((command) => JSON.stringify(command)));
    for (const command of first.commands)
      expect(offered.has(JSON.stringify(command))).toBe(true);
    const second = drain(1);
    expect(
      [...actors(second.commands)].some((id) => actors(first.commands).has(id)),
    ).toBe(false);
  });

  it("keeps the unit on an own center with a free slot in every window", () => {
    const state = board((base) => {
      const capital = ownCapital(base);
      return [
        { own: true, role: "SWORDSMAN", at: capital },
        ...grass(base, rivalCapital(base))
          .slice(0, 45)
          .map((tile): Piece => ({ own: true, role: "SWORDSMAN", at: tile })),
      ];
    });
    const view = viewOf(state);
    const onCapital = view.units.find(
      (unit) => distance(unit.at, ownCapital(state)) === 0,
    );
    const work = new ScaleCommandWorkV7(view, 0);
    let commands: readonly CommandV7[] | null = null;
    while (commands === null) commands = work.advance(1000).commands;
    expect(
      commands.some(
        (command) => "unitId" in command && command.unitId === onCapital?.id,
      ),
    ).toBe(true);
  });

  it("a front unit still finds the kill", () => {
    const state = board((base) => {
      // Away from every city: the kill is the only thing the unit can do
      // for the war there (beside a center it would take the center).
      const tiles = grass(base, rivalCapital(base)).filter((tile) =>
        base.cities.every((city) => distance(city.at, tile) >= 3),
      );
      const enemy = tiles.find((tile) =>
        tiles.some((other) => distance(other, tile) === 1),
      );
      const own = tiles.find(
        (tile) => enemy !== undefined && distance(tile, enemy) === 1,
      );
      if (enemy === undefined || own === undefined) throw new Error("tiles");
      const used = new Set([key(enemy), key(own)]);
      return [
        { own: false, role: "SWORDSMAN", at: enemy, hp: 1 },
        { own: true, role: "SWORDSMAN", at: own },
        ...rear(base, 45, used),
      ];
    });
    const view = viewOf(state);
    expect(scaleModeV7(view)).toBe(true);
    const enemy = view.units.find((unit) => unit.ownerId !== view.viewer.id);
    const decision = chooseNormalCommandV7(view);
    const attack = bestUnitCommand(decision);
    expect(attack?.kind).toBe("ATTACK");
    expect(attack?.kind === "ATTACK" && attack.targetUnitId).toBe(enemy?.id);
    SCALE_MODE_SWITCH_V7.enabled = false;
    const full = chooseNormalCommandV7(view);
    expect(decision.command).toEqual(full.command);
    expect(attack).toEqual(bestUnitCommand(full));
  });

  it("a threatened city is still defended as the full policy defends it", () => {
    const state = board((base) => {
      const capital = ownCapital(base);
      const near = grass(base, capital);
      const [threat, defender] = [near[0], near[3]];
      if (threat === undefined || defender === undefined)
        throw new Error("tiles");
      const used = new Set([key(threat), key(defender)]);
      return [
        { own: false, role: "SWORDSMAN", at: threat },
        { own: true, role: "SWORDSMAN", at: defender },
        ...grass(base, rivalCapital(base))
          .filter((at) => !used.has(key(at)) && distance(at, capital) > 4)
          .slice(0, 45)
          .map((at): Piece => ({
            own: true,
            role: "SWORDSMAN",
            at,
            activation: SPENT,
          })),
      ];
    });
    const view = viewOf(state);
    expect(scaleModeV7(view)).toBe(true);
    const scale = chooseNormalCommandV7(view);
    SCALE_MODE_SWITCH_V7.enabled = false;
    const full = chooseNormalCommandV7(view);
    expect(scale.command).toEqual(full.command);
    const defence = bestUnitCommand(scale);
    expect(defence).toEqual(bestUnitCommand(full));
    expect(defence?.kind === "MOVE" || defence?.kind === "ATTACK").toBe(true);
  });

  it("rear units still flow to the front once the front has acted", () => {
    const state = board((base) => {
      const target = rivalCapital(base);
      const front = grass(base, target).slice(0, 44);
      const used = new Set(front.map(key));
      const back = grass(base, ownCapital(base)).filter(
        (at) => !used.has(key(at)),
      )[0];
      if (back === undefined) throw new Error("tiles");
      return [
        ...front.map((at): Piece => ({
          own: true,
          role: "SWORDSMAN",
          at,
          activation: SPENT,
        })),
        { own: true, role: "SWORDSMAN", at: back },
      ];
    });
    const view = viewOf(state);
    expect(scaleModeV7(view)).toBe(true);
    const decision = chooseNormalCommandV7(view);
    const move = bestUnitCommand(decision);
    expect(move?.kind).toBe("MOVE");
    SCALE_MODE_SWITCH_V7.enabled = false;
    const full = chooseNormalCommandV7(view);
    expect(decision.command).toEqual(full.command);
    expect(move).toEqual(bestUnitCommand(full));
  });

  it("passes over idle windows before it ends the turn", () => {
    // Window size one: the first unit's window offers it Wait and Disband
    // only after it has acted, so the decision moves on to a later window.
    SCALE_MODE_SWITCH_V7.windowUnits = 1;
    const state = board((base) => {
      const target = rivalCapital(base);
      const tiles = grass(base, target).slice(0, 45);
      return tiles.map((at, index): Piece => ({
        own: true,
        role: "SWORDSMAN",
        at,
        activation: index === tiles.length - 1 ? READY : SPENT,
      }));
    });
    const view = viewOf(state);
    const decision = chooseNormalCommandV7(view);
    expect(decision.command?.kind).not.toBe("END_TURN");
    const work = new NormalPolicyWorkV7(view, () => 0);
    expect(work.runSlice(Number.MAX_SAFE_INTEGER)?.command).toEqual(
      decision.command,
    );
  });
});

describe("the engine hooks of the scale mode", () => {
  const state = board((base) =>
    grass(base, ownCapital(base))
      .slice(0, 10)
      .map((tile) => ({ own: true, role: "SWORDSMAN", at: tile })),
  );

  it("the unit-less enumeration plus each unit's commands is the full enumeration", () => {
    const view = viewOf(state);
    const work = createPublicCommandWorkV7(view, { withoutUnits: true });
    const base = work.advance(Number.MAX_SAFE_INTEGER).commands ?? [];
    const own = view.units.flatMap((unit) =>
      queryOfferedUnitCommandsV7(view, unit),
    );
    const composed = [...base, ...own].sort(compareCommandsV7);
    expect(JSON.stringify(composed)).toBe(
      JSON.stringify(queryPlayerCommandsV7(viewOf(state))),
    );
  });

  it("a restricted view offers its commands and leaves the view's own", () => {
    const view = viewOf(state);
    const all = queryPlayerCommandsV7(view);
    const some = all.filter((command) => command.kind !== "MOVE");
    const restricted = restrictPublicCommandsV7(view, some);
    expect(queryPlayerCommandsV7(restricted)).toBe(some);
    expect(queryPlayerCommandsV7(view)).toBe(all);
  });

  it("the local plan never stands in for the exact plan", () => {
    const run = (local: boolean) => {
      const view = viewOf(state);
      const work = createPublicPlanningWorkV7(
        view,
        queryPlayerCommandsV7(view),
        { local },
      );
      for (;;) {
        const progress = work.advance(Number.MAX_SAFE_INTEGER);
        if (progress.done && progress.result !== null) return progress.result;
      }
    };
    const exact = JSON.stringify(run(false));
    run(true);
    expect(JSON.stringify(run(false))).toBe(exact);
  });
});
