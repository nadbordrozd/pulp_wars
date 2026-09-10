/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  queryPublicSelectionV7,
  reachablePlayerMovementPathsV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
} from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

const EDGES_AND_CORNERS: readonly CoordV7[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 0, y: 10 },
  { x: 10, y: 10 },
  { x: 5, y: 0 },
  { x: 10, y: 5 },
  { x: 5, y: 10 },
  { x: 0, y: 5 },
];

describe("ruleset-7 public movement bounds", () => {
  it("keeps every Move path on-board and acceptable at every edge and corner", () => {
    for (const origin of EDGES_AND_CORNERS) {
      const state = movementState(origin);
      const view = viewForV7(state, state.humanPlayerId);
      const unit = view.units.find(
        (candidate) => candidate.ownerId === view.viewer.id,
      )!;
      const reachable = reachablePlayerMovementPathsV7(view, unit);
      const commands = queryPlayerCommandsV7(view).filter(
        (command): command is Extract<CommandV7, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === unit.id,
      );

      expect(commands.map((command) => command.path)).toEqual(
        reachable.map((path) => path.path),
      );
      expect(reachable.length).toBeGreaterThan(0);
      expect(
        reachable.every((path) =>
          path.path.every((at) => onBoard(view.board, at)),
        ),
      ).toBe(true);
      expect(reachable.map((path) => path.destination)).toEqual(
        [...reachable]
          .sort((left, right) => compare(left.destination, right.destination))
          .map((path) => path.destination),
      );
      for (const command of commands)
        expect(
          applyCommandV7(state, state.humanPlayerId, command).accepted,
          `MOVE from ${origin.x},${origin.y}: ${JSON.stringify(command.path)}`,
        ).toBe(true);
    }
  });

  it("rejects public paths whose off-board or fractional coordinates alias rows", () => {
    const aliases = [
      { origin: { x: 10, y: 5 }, step: { x: 11, y: 5 } },
      { origin: { x: 0, y: 5 }, step: { x: -1, y: 5 } },
      { origin: { x: 10, y: 0 }, step: { x: 11, y: -1 } },
      { origin: { x: 0, y: 10 }, step: { x: -1, y: 11 } },
      { origin: { x: 10, y: 5 }, step: { x: 9, y: 56 / 11 } },
    ] as const;
    for (const { origin, step } of aliases) {
      {
        const state = movementState(origin);
        const view = viewForV7(state, state.humanPlayerId);
        const unit = view.units.find(
          (candidate) => candidate.ownerId === view.viewer.id,
        )!;
        expect(validatePlayerMovementPathV7(view, unit, [step])).toEqual({
          legal: false,
          reason: "OUT_OF_BOUNDS",
        });
        expect(() => queryPublicSelectionV7(view, step)).toThrow(
          "Tile missing",
        );
      }
    }
  });

  it("does not admit non-finite coordinates through public Coord APIs", () => {
    const state = movementState({ x: 10, y: 5 });
    const view = viewForV7(state, state.humanPlayerId);
    const unit = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    )!;
    for (const step of [
      { x: Number.NaN, y: 5 },
      { x: Number.POSITIVE_INFINITY, y: 5 },
      { x: 9, y: Number.NEGATIVE_INFINITY },
    ]) {
      expect(validatePlayerMovementPathV7(view, unit, [step])).toMatchObject({
        legal: false,
      });
      expect(() => queryPublicSelectionV7(view, step)).toThrow("Tile missing");
    }
  });

  it("keeps edge commands equal across hidden Saboteur positions", () => {
    const base = movementState({ x: 10, y: 5 });
    const human = base.players.find(
      (player) => player.id === base.humanPlayerId,
    )!;
    const mover = base.units.find((unit) => unit.ownerId === human.id)!;
    const hiddenCoords = base.board.tiles
      .map((tile) => tile.at)
      .filter(
        (at) =>
          chebyshev(at, mover.at) > 2 &&
          base.cities
            .filter((city) => city.ownerId === human.id)
            .every((city) => chebyshev(at, city.at) > 1),
      )
      .slice(0, 2);
    expect(hiddenCoords).toHaveLength(2);
    const states = hiddenCoords.map((at) =>
      checkedV7({
        ...base,
        units: base.units.map((unit) =>
          unit.ownerId === human.id
            ? unit
            : {
                ...unit,
                role: "SABOTEUR" as const,
                at,
                hp: 10,
                maxHp: 10,
                blackoutEligibleRound: 1,
              },
        ),
      }),
    );
    const views = states.map((state) => viewForV7(state, human.id));
    expect(JSON.stringify(views[0])).toBe(JSON.stringify(views[1]));
    expect(JSON.stringify(queryPlayerCommandsV7(views[0]!))).toBe(
      JSON.stringify(queryPlayerCommandsV7(views[1]!)),
    );
    expect(
      queryPlayerCommandsV7(views[0]!).every(
        (command) =>
          !("path" in command) ||
          command.path.every((at) => onBoard(views[0]!.board, at)),
      ),
    ).toBe(true);
  });
});

function movementState(origin: CoordV7): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7(27)));
  const human = base.humanPlayerId;
  const enemy = base.players.find((player) => player.id !== human)!.id;
  const role = "SCOUT" as const;
  const maxHp = effectiveRoleRuleV7(role).maxHp;
  return checkedV7({
    ...base,
    treasureChests: [],
    units: base.units.map((unit) =>
      unit.ownerId === human
        ? {
            ...unit,
            role,
            at: origin,
            hp: maxHp,
            maxHp,
            activation: READY,
            blackoutEligibleRound: null,
          }
        : {
            ...unit,
            ownerId: enemy,
            role: "FIGHTER" as const,
            at: { x: 5, y: 5 },
            hp: 10,
            maxHp: 10,
            activation: READY,
            blackoutEligibleRound: null,
          },
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => ({
        ...tile,
        terrain: "GRASS" as const,
        resource: null,
        improvement: null,
        road: false,
      })),
    },
  });
}

function onBoard(
  board: Pick<GameStateV7["board"], "width" | "height">,
  at: CoordV7,
): boolean {
  return (
    Number.isSafeInteger(at.x) &&
    Number.isSafeInteger(at.y) &&
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < board.width &&
    at.y < board.height
  );
}

const compare = (left: CoordV7, right: CoordV7) =>
  left.y - right.y || left.x - right.x;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
