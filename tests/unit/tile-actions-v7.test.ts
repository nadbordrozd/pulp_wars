import { describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import type { MapCommandTargetV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  TILE_ABILITIES_V7,
  TILE_ACTION_COMMAND_CLASSES_V7,
  TILE_ACTION_FULL_SIZE_TILES_V7,
  TILE_BOARD_ACTIONS_V7,
  planTileActionsV7,
  tileActionPlanForSelectionV7,
  tileActionsAtV7,
  type TileActionPlanV7,
} from "../../src/render/canvas/tile-actions-v7";
import { uiIconShapesV7 } from "../../src/render/dom/ui-icons-v7";
import { FROZEN_UI_V7 } from "../fixtures/v7-frozen-sea-ui";
import { CULT_TRICK_UI_V7 } from "../fixtures/v7-cult-ui";
import {
  TILE_ACTIONS_UI_V7 as A,
  tileActionsBrainFixtureV7,
  tileActionsHexerFixtureV7,
  tileActionsJoinChantFixtureV7,
  tileActionsKnightFixtureV7,
  tileActionsStargazerFixtureV7,
  tileActionsYetiFixtureV7,
} from "../fixtures/v7-tile-actions-ui";

const at = (x: number, y: number): CoordV7 => ({ x, y });
const id = (value: number): UnitId => value as UnitId;
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

function planOf(state: GameStateV7, unitAt: CoordV7): TileActionPlanV7 | null {
  const view = viewForV7(state, state.humanPlayerId);
  const unit = view.units.find(
    (candidate) => candidate.at.x === unitAt.x && candidate.at.y === unitAt.y,
  );
  if (unit === undefined) throw new Error("No unit there");
  return tileActionPlanForSelectionV7(
    view,
    queryPlayerCommandsV7(view),
    unit.id,
  );
}

const move = (to: CoordV7): MapCommandTargetV7 => ({
  at: to,
  family: "MOVE",
  command: { kind: "MOVE", unitId: id(1), path: [to] },
});
const attack = (to: CoordV7): MapCommandTargetV7 => ({
  at: to,
  family: "ATTACK",
  command: { kind: "ATTACK", unitId: id(1), targetUnitId: id(9) },
  previewLabel: "Deal 4 · take 2",
});
const ribbit = (to: CoordV7): MapCommandTargetV7 => ({
  at: to,
  family: "RIBBIT",
  command: { kind: "RIBBIT", unitId: id(1), targetUnitId: id(9) },
});
const tentacle = (to: CoordV7): MapCommandTargetV7 => ({
  at: to,
  family: "TENTACLE",
  command: { kind: "TENTACLE", unitId: id(1), at: to },
});
const RIBBIT = { id: "RIBBIT", label: "Ribbit", icon: "frog" } as const;
const TENTACLE = {
  id: "TENTACLE",
  label: "Tentacle",
  icon: "tentacle",
} as const;

describe("tile actions: the audit of every command kind", () => {
  /** A command of `kind` for unit 1, enough for an ability's `offered`. */
  const sample = (kind: CommandV7["kind"]): readonly CommandV7[] =>
    kind === "BEGIN_RITUAL"
      ? [
          { kind, ritual: "STARFALL", unitId: id(1), at: at(0, 0) },
          { kind, ritual: "GREAT_SUMMONING", unitId: id(1), at: at(0, 0) },
        ]
      : kind === "SUMMON"
        ? // The summon chooser (the Cult redesign, `pulp_wars-mch9.44`):
          // each summon is an ability of its own, with its own badge.
          [
            { kind, unitId: id(1), daemon: "IMP", at: at(0, 0) },
            {
              kind,
              unitId: id(1),
              daemon: "HORROR",
              helperUnitId: id(2),
              at: at(0, 0),
            },
            {
              kind,
              unitId: id(1),
              daemon: "MASS",
              helperUnitId: id(2),
              at: at(0, 0),
            },
          ]
        : [{ kind, unitId: id(1) } as unknown as CommandV7];

  it("maps every aimed command kind to an ability with an icon and a dock button", () => {
    const aimed = Object.entries(TILE_ACTION_COMMAND_CLASSES_V7)
      .filter(([, kind]) => kind === "AIMED")
      .map(([kind]) => kind as CommandV7["kind"]);
    expect(aimed.length).toBeGreaterThan(25);
    for (const kind of aimed)
      for (const command of sample(kind))
        expect(
          TILE_ABILITIES_V7.some((ability) => ability.offered(command, id(1))),
          kind,
        ).toBe(true);
    for (const ability of TILE_ABILITIES_V7) {
      expect(uiIconShapesV7(ability.icon).length, ability.id).toBeGreaterThan(
        0,
      );
      expect(ability.label, ability.id).not.toBe("");
      expect(ability.dockAction, ability.id).toMatch(/^[a-z-]+$/);
      expect(ability.families.length, ability.id).toBeGreaterThan(0);
      // An ability's command of another unit is not offered to this one.
      for (const command of sample(
        aimed.find((kind) =>
          sample(kind).some((probe) => ability.offered(probe, id(1))),
        ) ?? "MOVE",
      ))
        expect(ability.offered(command, id(2))).toBe(false);
    }
  });

  it("gives every unarmed target family a look, and the bar-only and other kinds none", () => {
    for (const [kind, use] of Object.entries(TILE_ACTION_COMMAND_CLASSES_V7)) {
      const probes = sample(kind as CommandV7["kind"]);
      const claimed = TILE_ABILITIES_V7.some((ability) =>
        probes.some((command) => ability.offered(command, id(1))),
      );
      expect(claimed, kind).toBe(use === "AIMED");
    }
    for (const family of [
      "MOVE",
      "ATTACK",
      "DISEMBARK",
      "LANDING_AFTER_MOVE",
      "HATCH",
      "SUGAR_TOSS",
      "TOP_UP",
    ] as const) {
      const look = TILE_BOARD_ACTIONS_V7[family];
      expect(look, family).toBeDefined();
      expect(uiIconShapesV7(look?.icon ?? "move").length).toBeGreaterThan(0);
    }
  });
});

describe("tile actions: the planner", () => {
  const base = {
    unitId: 1,
    selectedAt: at(5, 5),
    ownUnitAt: () => false,
  };

  it("leaves a lone Move or Attack to its mark, and lists a tile with an ability", () => {
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [move(at(5, 4)), attack(at(6, 5))],
      abilities: [{ ability: TENTACLE, targets: [tentacle(at(7, 7))] }],
    });
    expect(plan.tiles.map((tile) => tile.at)).toEqual([at(7, 7)]);
    const [only] = plan.tiles;
    expect(only?.actions.map((action) => action.id)).toEqual(["TENTACLE"]);
    expect(only?.chooser).toBe(false);
    expect(only?.actions[0]?.style).toBe("PLACE");
    expect(only?.actions[0]?.ability).toBe("TENTACLE");
  });

  it("puts a Move and an ability on one tile behind a chooser, the Move first", () => {
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [move(at(5, 4))],
      abilities: [{ ability: TENTACLE, targets: [tentacle(at(5, 4))] }],
    });
    const tile = tileActionsAtV7(plan, at(5, 4));
    expect(tile?.actions.map((action) => action.id)).toEqual([
      "MOVE",
      "TENTACLE",
    ]);
    expect(tile?.chooser).toBe(true);
    // The Move keeps the board target a tap would send.
    expect(tile?.actions[0]?.target?.command.kind).toBe("MOVE");
  });

  it("lists an Attack and a hex on the same enemy, each in its style", () => {
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [attack(at(6, 6))],
      abilities: [{ ability: RIBBIT, targets: [ribbit(at(6, 6))] }],
    });
    const tile = tileActionsAtV7(plan, at(6, 6));
    expect(
      tile?.actions.map((action) => [action.id, action.style, action.icon]),
    ).toEqual([
      ["ATTACK", "ATTACK", "attack"],
      ["RIBBIT", "ATTACK", "frog"],
    ]);
    expect(tile?.chooser).toBe(true);
  });

  it("never lists the selected unit's own tile", () => {
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [],
      abilities: [{ ability: TENTACLE, targets: [tentacle(at(5, 5))] }],
    });
    expect(plan.tiles).toEqual([]);
  });

  it("offers Select beside an ability aimed at another own unit", () => {
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [],
      abilities: [{ ability: TENTACLE, targets: [tentacle(at(4, 5))] }],
      ownUnitAt: (where) => where.x === 4 && where.y === 5,
    });
    expect(tileActionsAtV7(plan, at(4, 5))).toMatchObject({
      ownUnit: true,
      chooser: true,
    });
  });

  it("keeps an unarmed help on an own unit one tap, as before", () => {
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [
        {
          at: at(4, 5),
          family: "SUGAR_TOSS",
          command: { kind: "SUGAR_TOSS", unitId: id(1), targetUnitId: id(3) },
        },
      ],
      abilities: [],
      ownUnitAt: () => true,
    });
    expect(tileActionsAtV7(plan, at(4, 5))).toMatchObject({
      ownUnit: true,
      chooser: false,
    });
  });

  it("skips a modifier's tiles the unit already reaches unarmed", () => {
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [move(at(5, 4))],
      abilities: [
        {
          ability: {
            id: "SUGAR_RUSH",
            label: "Sugar Rush",
            icon: "move",
            onlyBeyondBoard: true,
          },
          targets: [move(at(5, 4)), move(at(5, 2))],
        },
      ],
    });
    expect(plan.tiles.map((tile) => tile.at)).toEqual([at(5, 2)]);
  });

  it("shrinks the badges past the full-size limit", () => {
    const targets = (count: number) =>
      Array.from({ length: count }, (_, index) => tentacle(at(index, 0)));
    const plan = (count: number) =>
      planTileActionsV7({
        ...base,
        boardTargets: [],
        abilities: [{ ability: TENTACLE, targets: targets(count) }],
      });
    expect(plan(TILE_ACTION_FULL_SIZE_TILES_V7).compact).toBe(false);
    expect(plan(TILE_ACTION_FULL_SIZE_TILES_V7 + 1).compact).toBe(true);
  });

  /**
   * The Cult redesign's "join the chant" (pulp_wars-mch9.34,
   * RULESET_7_CULT_REDESIGN.md sections 8.2 and 13): `JOIN_CHANT { unitId,
   * leaderUnitId }` of a cultist beside a Stargazer leading a pending
   * Star-fall, and "a tap joins": its row of `TILE_ABILITIES_V7`, marked on
   * the Stargazer's tile, `oneTap` (no chooser with Select). With a second
   * action on the Stargazer's tile the chooser comes back.
   */
  it("puts an ability aimed at an adjacent own unit on that unit (join the chant)", () => {
    const stargazer = at(5, 4);
    const join = required(
      TILE_ABILITIES_V7.find((ability) => ability.id === "JOIN_CHANT"),
    );
    expect(join).toMatchObject({
      label: "Join the chant",
      icon: "candle",
      oneTap: true,
      families: ["JOIN_CHANT"],
    });
    const chant: MapCommandTargetV7 = {
      at: stargazer,
      family: "JOIN_CHANT",
      command: { kind: "JOIN_CHANT", unitId: id(1), leaderUnitId: id(7) },
      previewLabel: "+3",
    };
    const ownUnitAt = (where: CoordV7) =>
      where.x === stargazer.x && where.y === stargazer.y;
    const plan = planTileActionsV7({
      ...base,
      boardTargets: [move(at(4, 4))],
      abilities: [{ ability: join, targets: [chant] }],
      ownUnitAt,
    });
    const tile = tileActionsAtV7(plan, stargazer);
    expect(tile?.actions.map((action) => [action.label, action.icon])).toEqual([
      ["Join the chant", "candle"],
    ]);
    expect(tile?.actions[0]?.style).toBe("SUPPORT");
    expect(tile).toMatchObject({ ownUnit: true, occupied: true });
    // "A tap joins": no chooser for it alone.
    expect(tile?.chooser).toBe(false);
    // Beside another aimed ability on the same Stargazer, the chooser.
    const both = planTileActionsV7({
      ...base,
      boardTargets: [],
      abilities: [
        { ability: join, targets: [chant] },
        { ability: TENTACLE, targets: [tentacle(stargazer)] },
      ],
      ownUnitAt,
    });
    expect(tileActionsAtV7(both, stargazer)?.chooser).toBe(true);
  });
});

describe("tile actions: the factions' scenes", () => {
  it("gives a Human Knight no badge: its Moves and Attacks keep their marks", () => {
    expect(planOf(tileActionsKnightFixtureV7(), A.knight)).toBeNull();
  });

  it("puts an Attack and a Ribbit on the Knight a Cult Hexer may shoot or hex", () => {
    const plan = planOf(tileActionsHexerFixtureV7(), A.hexer);
    const tile = tileActionsAtV7(plan, A.hexed);
    expect(tile?.actions.map((action) => action.id)).toEqual([
      "ATTACK",
      "RIBBIT",
    ]);
    expect(tile?.chooser).toBe(true);
    // The Juggernaut no hex takes carries no Ribbit.
    expect(
      tileActionsAtV7(plan, CULT_TRICK_UI_V7.giant)?.actions.some(
        (action) => action.id === "RIBBIT",
      ) ?? false,
    ).toBe(false);
  });

  // (The Chosen's Pick Me! retired with the Cult redesign,
  // `pulp_wars-mch9.31`; an Idol Bearer stands on its tile.)
  it("gives the Idol Bearer's Behold! (raised round it) no badge", () => {
    const plan = planOf(tileActionsHexerFixtureV7(), CULT_TRICK_UI_V7.bearer);
    for (const tile of plan?.tiles ?? [])
      expect(tile.actions.map((action) => action.id)).not.toContain("BEHOLD");
  });

  it("badges a Yeti's Freeze tiles, with the Attack on the boat it could hit", () => {
    const plan = planOf(tileActionsYetiFixtureV7(), A.yeti);
    expect(
      tileActionsAtV7(plan, A.freezeAt)?.actions.map((action) => action.id),
    ).toEqual(["FREEZE"]);
    expect(
      tileActionsAtV7(plan, FROZEN_UI_V7.prey)?.actions.map(
        (action) => action.id,
      ),
    ).toEqual(["ATTACK", "FREEZE"]);
  });

  it("leaves the Ice Witch's ring to her button", () => {
    expect(planOf(tileActionsYetiFixtureV7(), FROZEN_UI_V7.witch)).toBeNull();
  });

  it("badges the enemy a Martian Brain may take with Mind Control", () => {
    const plan = planOf(tileActionsBrainFixtureV7(), A.brain);
    expect(
      tileActionsAtV7(plan, A.controlTarget)?.actions.map(
        (action) => action.id,
      ),
    ).toEqual(["MIND_CONTROL"]);
  });

  it("shrinks a Stargazer's many star tiles and offers Select on its own Initiate", () => {
    const plan = planOf(tileActionsStargazerFixtureV7(), A.stargazer);
    expect(plan?.compact).toBe(true);
    expect(plan?.tiles.length).toBeGreaterThan(TILE_ACTION_FULL_SIZE_TILES_V7);
    expect(tileActionsAtV7(plan, A.stargazer)).toBeUndefined();
    const initiate = plan?.tiles.find((tile) => tile.ownUnit);
    expect(initiate?.chooser).toBe(true);
    expect(initiate?.actions.map((action) => action.id)).toEqual(["STARFALL"]);
  });

  it("puts the join badge on the casting Stargazer for an Initiate beside it, and only then", () => {
    // The Cult redesign (`pulp_wars-mch9.34`): before the begin, nothing.
    expect(
      tileActionsAtV7(
        planOf(tileActionsStargazerFixtureV7(), A.joiner),
        A.stargazer,
      ),
    ).toBeUndefined();
    const plan = planOf(tileActionsJoinChantFixtureV7(), A.joiner);
    const tile = required(tileActionsAtV7(plan, A.stargazer));
    expect(tile.actions.map((action) => [action.id, action.icon])).toEqual([
      ["JOIN_CHANT", "candle"],
    ]);
    expect(tile.actions[0]?.style).toBe("SUPPORT");
    expect(tile.actions[0]?.semanticLabel).toMatch(
      /^Join this Stargazer's chant: its star hits 9 instead of 6/,
    );
    expect(tile).toMatchObject({ ownUnit: true, chooser: false });
    // The Stargazer itself (it leads the star) carries no join.
    expect(planOf(tileActionsJoinChantFixtureV7(), A.stargazer)).toBeNull();
  });

  it("names no tile in any action", () => {
    for (const [state, unit] of [
      [tileActionsHexerFixtureV7(), A.hexer],
      [tileActionsYetiFixtureV7(), A.yeti],
      [tileActionsBrainFixtureV7(), A.brain],
      [tileActionsStargazerFixtureV7(), A.stargazer],
      [tileActionsJoinChantFixtureV7(), A.joiner],
    ] as const)
      for (const tile of planOf(state, unit)?.tiles ?? [])
        for (const action of tile.actions)
          for (const words of [action.label, action.semanticLabel ?? ""])
            expect(words).not.toMatch(/\d+\s*,\s*\d+|\(\s*\d/);
  });
});
