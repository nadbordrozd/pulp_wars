import { describe, expect, it } from "vitest";
import { publicStandTilesForPolicyV7 } from "../../src/ai/v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  reachableMovementPathsV7,
  roleMechanicsV7,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  GLIDE_RULE_V7,
  ICE_HELP_RULES_V7,
} from "../../src/render/frozen-sea-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import {
  frozenArenaV7,
  lineV7,
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

// Skating is plain movement (`pulp_wars-ecnj`, `pulp-wars-poc-7r135`;
// docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.6, Bead 3; the user,
// 2026-11-08: "the sled can skate the entire length of the map ... I don't
// want extra UI for skating. its just movement."). One Glide rule over Snow
// and ice: a step from a frozen tile onto a frozen tile costs half a point,
// as a step off a Road node; a step from bare land onto ice costs a full
// point; Runners, the Sled's glide through zones of control, the skate
// trail, its arrows and the skate labels are gone. Hand-built states on the
// authored strait of `v7-frozen-sea.ts` (rows 0 to 2 and 8 to 10 land, rows
// 3 to 7 water; seat 0, the Ice Folk, has its capital on (5, 2), whose
// territory, x 4 to 6 and y 1 to 3, is Snow; (2, 2) is bare land).

/** A column of ice down the strait on `x`: rows 3 to 7. */
const bridge = (x: number): readonly FrozenIceV7[] =>
  lineV7({ x, y: 2 }, 0, 1, 5).map((at) => ({ at }));
const sorted = (tiles: readonly CoordV7[]): CoordV7[] =>
  [...tiles].sort((left, right) => left.y - right.y || left.x - right.x);
const key = (at: CoordV7): string => `${at.x},${at.y}`;

const scene = (
  units: readonly FrozenUnitV7[],
  ice: readonly FrozenIceV7[] = bridge(2),
): GameStateV7 => frozenArenaV7({ units, ice });
const spent = (state: GameStateV7, from: CoordV7, path: readonly CoordV7[]) =>
  validateMovementPathV7(state, navalUnitAtV7(state, from), path);
const move = (
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): CommandV7 => ({
  kind: "MOVE",
  unitId: navalUnitAtV7(state, from).id,
  path: [...path],
});
const offeredMoves = (state: GameStateV7, from: CoordV7) => {
  const unitId = navalUnitAtV7(state, from).id;
  return queryPlayerCommandsV7(viewForV7(state, seatV7(state, 0).id)).filter(
    (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
      command.kind === "MOVE" && command.unitId === unitId,
  );
};
const destinations = (state: GameStateV7, from: CoordV7) =>
  sorted(
    offeredMoves(state, from).map((command) => command.path.at(-1) as CoordV7),
  );
const snowAt = (view: PlayerViewV7, at: CoordV7): boolean =>
  view.board.tiles.some(
    (tile) =>
      tile.explored &&
      tile.at.x === at.x &&
      tile.at.y === at.y &&
      tile.snow === true,
  );

describe("the identity (pulp_wars-ecnj)", () => {
  it("is 7r135 after 7r134, whose save key is obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r135");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r135.current");
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe("pulp-wars-poc-7r134");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r134.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("drops Runners and the Sled's glide through zones from the role table", () => {
    for (const role of ["RAIDER", "MARKSMAN"] as const) {
      const mechanics = roleMechanicsV7(role, "ICE_FOLK") as unknown as Record<
        string,
        unknown
      >;
      expect(mechanics.glides, role).toBe(true);
      expect(mechanics, role).not.toHaveProperty("runners");
      expect(mechanics, role).not.toHaveProperty("glidesThroughZoc");
    }
  });
});

describe("one Glide rule over Snow and ice", () => {
  it("a Yeti (Move 1) crosses 2 frozen tiles: ice to ice, and Snow to ice", () => {
    expect(effectiveRoleRuleV7("FIGHTER", "ICE_FOLK").move).toBe(1);
    const from = { x: 2, y: 3 };
    const state = scene([{ seat: 0, role: "FIGHTER", at: from }]);
    const ahead = lineV7(from, 0, 1, 3);
    expect(spent(state, from, ahead.slice(0, 2))).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
    expect(spent(state, from, ahead)).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    expect(destinations(state, from)).toEqual(
      expect.arrayContaining(ahead.slice(0, 2) as CoordV7[]),
    );
    expect(destinations(state, from)).not.toContainEqual(ahead[2]);
    // The reducer walks it there.
    const yeti = navalUnitAtV7(state, from).id;
    const result = acceptV7(state, 0, move(state, from, ahead.slice(0, 2)));
    expect(navalUnitV7(result.state, yeti).at).toEqual(ahead[1]);
    // From its capital's Snow onto the ice is a Glide too: the arena's
    // Yeti stands on the capital (5, 2), Snow; (5, 3) and (5, 4) are ice.
    const capital = { x: 5, y: 2 };
    const snowy = scene(
      [],
      lineV7(capital, 0, 1, 3).map((at) => ({ at })),
    );
    expect(snowAt(viewForV7(snowy, seatV7(snowy, 0).id), capital)).toBe(true);
    expect(spent(snowy, capital, lineV7(capital, 0, 1, 2))).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
  });

  it("a Sled (Move 2) crosses 4 frozen tiles, never the whole sea", () => {
    expect(effectiveRoleRuleV7("RAIDER", "ICE_FOLK").move).toBe(2);
    const from = { x: 2, y: 3 };
    const state = scene([{ seat: 0, role: "RAIDER", at: from }]);
    const column = lineV7(from, 0, 1, 4);
    expect(spent(state, from, column)).toMatchObject({
      legal: true,
      spentPoints2: 4,
      stopped: false,
    });
    // One more step, ashore on (2, 8), is past its Move (Runners took it
    // the whole bridge and ashore for a point and a half before).
    expect(spent(state, from, [...column, { x: 2, y: 8 }])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    expect(destinations(state, from)).toContainEqual({ x: 2, y: 7 });
    expect(destinations(state, from)).not.toContainEqual({ x: 2, y: 8 });
    const sled = navalUnitAtV7(state, from).id;
    const result = acceptV7(state, 0, move(state, from, column));
    expect(navalUnitV7(result.state, sled).at).toEqual({ x: 2, y: 7 });
    expect(navalUnitV7(result.state, sled).activation.movedPathLength).toBe(4);
    // A turn costs the same as a straight step: no direction matters.
    const bent = [
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 2, y: 6 },
      { x: 3, y: 7 },
    ];
    const zigzag = scene(
      [{ seat: 0, role: "RAIDER", at: from }],
      [...bridge(2), { at: { x: 3, y: 5 } }, { at: { x: 3, y: 7 } }],
    );
    expect(spent(zigzag, from, bent)).toMatchObject({
      legal: true,
      spentPoints2: 4,
    });
  });

  it("a step from bare land onto ice costs a full point, and so does a step off it", () => {
    const shore = { x: 2, y: 2 };
    const state = scene([{ seat: 0, role: "RAIDER", at: shore }]);
    expect(snowAt(viewForV7(state, seatV7(state, 0).id), shore)).toBe(false);
    const column = lineV7(shore, 0, 1, 4);
    // Onto the ice: a full point (half before, Skate); then half a point a
    // tile on it.
    expect(spent(state, shore, column.slice(0, 1))).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
    expect(spent(state, shore, column.slice(0, 3))).toMatchObject({
      legal: true,
      spentPoints2: 4,
    });
    expect(spent(state, shore, column)).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    // Off the ice onto bare land: a full point.
    const onIce = { x: 2, y: 3 };
    const back = scene([{ seat: 0, role: "FIGHTER", at: onIce }]);
    expect(spent(back, onIce, [shore])).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
    expect(spent(back, onIce, [shore, { x: 2, y: 1 }])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
  });

  it("Glide and a Road do not add up: a step costs half at least", () => {
    // The arena's Yeti on its capital (5, 2), a usable Road node with Roads:
    // the step off it and the next one inside its Snow cost half a point
    // each, with or without Roads, and a third step is past its Move.
    const capital = { x: 5, y: 2 };
    const path = [
      { x: 4, y: 2 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ];
    for (const technologies of [
      ["SHORECRAFT"],
      ["SHORECRAFT", "SCOUTING", "ROADS"],
    ] as const) {
      const state = frozenArenaV7({
        technologies: [technologies, technologies],
        units: [],
      });
      expect(
        spent(state, capital, path.slice(0, 2)),
        technologies.join(),
      ).toMatchObject({
        legal: true,
        spentPoints2: 2,
      });
      expect(spent(state, capital, path), technologies.join()).toEqual({
        legal: false,
        reason: "BUDGET_EXCEEDED",
      });
    }
  });

  it("the Frost Wyrm flies and does not Glide", () => {
    const wyrm = { x: 2, y: 3 };
    const state = scene([{ seat: 0, role: "KNIGHT", at: wyrm }]);
    expect(spent(state, wyrm, lineV7(wyrm, 0, 1, 3))).toMatchObject({
      legal: true,
      spentPoints2: 6,
    });
    expect(spent(state, wyrm, lineV7(wyrm, 0, 1, 4))).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
  });
});

describe("zones of control on ice", () => {
  // A Human Fighter on the ice on (3, 6) holds (2, 5), (2, 6), and (2, 7).
  const from = { x: 2, y: 3 };
  const withGuard = (role: "RAIDER" | "MARKSMAN" | "FIGHTER") =>
    frozenArenaV7({
      units: [
        { seat: 0, role, at: from },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 6 } },
      ],
      ice: [...bridge(2), { at: { x: 3, y: 6 } }],
    });

  it("a Sled stops on entering a hostile zone of control on the ice", () => {
    const state = withGuard("RAIDER");
    const into = [
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ];
    expect(spent(state, from, into)).toMatchObject({
      legal: true,
      stopped: true,
      spentPoints2: 2,
    });
    expect(
      rejectV7(state, 0, move(state, from, [...into, { x: 2, y: 6 }])),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ZOC_STOPS_MOVE" },
    });
    const offered = destinations(state, from);
    expect(offered).toContainEqual({ x: 2, y: 5 });
    expect(offered).not.toContainEqual({ x: 2, y: 6 });
    expect(offered).not.toContainEqual({ x: 2, y: 7 });
    const sled = navalUnitAtV7(state, from).id;
    expect(
      navalUnitV7(acceptV7(state, 0, move(state, from, into)).state, sled).at,
    ).toEqual({ x: 2, y: 5 });
  });

  it("a zone the Sled had not seen interrupts its Move where it enters it", () => {
    const base = withGuard("RAIDER");
    const hidden: GameStateV7 = {
      ...base,
      players: base.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !(at.x === 3 && at.y === 6),
              ),
            }
          : player,
      ),
    };
    const sled = navalUnitAtV7(hidden, from).id;
    const result = acceptV7(
      hidden,
      0,
      move(hidden, from, lineV7(from, 0, 1, 4)),
    );
    expect(navalUnitV7(result.state, sled).at).toEqual({ x: 2, y: 5 });
    expect(result.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_MOVE_INTERRUPTED" }),
    );
  });
});

describe("the movement query, the reducer and the threat estimate agree", () => {
  const units: readonly FrozenUnitV7[] = [
    { seat: 0, role: "RAIDER", at: { x: 2, y: 3 } },
    { seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } },
    { seat: 0, role: "SWORDSMAN", at: { x: 7, y: 4 } },
    { seat: 1, role: "FIGHTER", at: { x: 8, y: 6 } },
  ];
  const ice: readonly FrozenIceV7[] = [
    ...bridge(2),
    ...lineV7({ x: 5, y: 2 }, 0, 1, 3).map((at) => ({ at })),
    ...lineV7({ x: 4, y: 4 }, 1, 0, 5).map((at) => ({ at })),
    { at: { x: 8, y: 6 } },
  ];

  it("every offered Move is accepted as offered, and the canonical reach is the same", () => {
    const state = frozenArenaV7({ units, ice });
    const owner = seatV7(state, 0).id;
    const view = viewForV7(state, owner);
    const moves = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE",
    );
    expect(moves.length).toBeGreaterThan(20);
    for (const command of moves) {
      const unit = state.units.find(
        (candidate) => candidate.id === command.unitId,
      );
      if (unit === undefined) throw new Error("no unit");
      // No path is longer than the budget allows.
      const budget2 = effectiveRoleRuleV7(unit.role, "ICE_FOLK").move * 2;
      const canonical = validateMovementPathV7(state, unit, command.path);
      expect(canonical).toMatchObject({ legal: true });
      if (canonical.legal)
        expect(canonical.spentPoints2).toBeLessThanOrEqual(budget2);
      const publicUnit = view.units.find((entry) => entry.id === unit.id);
      if (publicUnit === undefined) throw new Error("no public unit");
      const publicCheck = validatePlayerMovementPathV7(
        view,
        publicUnit,
        command.path,
      );
      expect(publicCheck).toMatchObject({ legal: true });
      if (publicCheck.legal && canonical.legal)
        expect(publicCheck.spentPoints2).toBe(canonical.spentPoints2);
      const result = acceptV7(state, 0, command);
      expect(
        result.events.some((event) => event.kind === "UNIT_MOVE_INTERRUPTED"),
      ).toBe(false);
      expect(navalUnitV7(result.state, command.unitId).at).toEqual(
        command.path.at(-1),
      );
    }
    for (const unit of state.units.filter(
      (candidate) => candidate.ownerId === owner,
    ))
      expect(
        sorted(
          reachableMovementPathsV7(state, unit).map((path) => path.destination),
        ),
      ).toEqual(
        sorted(
          moves
            .filter((command) => command.unitId === unit.id)
            .map((command) => command.path.at(-1) as CoordV7),
        ),
      );
  });

  it("the Normal AI's threat estimate stands each unit on exactly the tiles its Moves reach", () => {
    const state = frozenArenaV7({ units, ice });
    const opponent = viewForV7(state, seatV7(state, 1).id);
    const own = state.units.filter(
      (unit) => unit.ownerId === seatV7(state, 0).id,
    );
    // The Sled, the Snow Hunter, the Mammoth and the capital's Yeti.
    expect(own).toHaveLength(4);
    for (const unit of own) {
      const offered = destinations(state, unit.at);
      const visible = opponent.units.find((entry) => entry.id === unit.id);
      if (visible === undefined) throw new Error(`${key(unit.at)} not visible`);
      const stands = publicStandTilesForPolicyV7(opponent, visible);
      expect(sorted(stands).map(key), unit.role).toEqual(
        sorted([unit.at, ...offered]).map(key),
      );
    }
  });
});

describe("no extra interface for a Move on ice", () => {
  it("a Sled's Moves on a frozen sea are plain Move marks: no trail, arrow, or skate label", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "RAIDER", at: { x: 2, y: 3 } }],
      ice: [...bridge(2), ...bridge(3), ...bridge(1)],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const sled = navalUnitAtV7(state, { x: 2, y: 3 }).id;
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "UNIT", unitId: sled },
      selectedUnitId: sled,
      selectedAchievement: null,
    });
    const moves = plan.targets.filter((target) => target.family === "MOVE");
    expect(moves.length).toBeGreaterThan(8);
    for (const target of moves) {
      const fields = target as unknown as Record<string, unknown>;
      for (const gone of ["slide", "skate", "glide"])
        expect(fields, key(target.at)).not.toHaveProperty(gone);
      expect(
        `${target.semanticLabel ?? ""} ${target.previewLabel ?? ""}`,
      ).not.toMatch(/skate|runner|glide|slide/i);
    }
    // Every Move mark on the ice has the same shape as any plain Move.
    const shapes = new Set(
      moves.map((target) => Object.keys(target).sort().join(",")),
    );
    expect(shapes.size).toBe(1);
  });

  it("Help and the glossary have one Glide line and no Skate or Runners", () => {
    expect(GLIDE_RULE_V7).toBe(
      "Between Snow and ice tiles, Ice Folk move at half cost, as on a Road.",
    );
    const names = ICE_HELP_RULES_V7.map(([name]) => name);
    expect(names).toContain("Glide");
    expect(names).not.toContain("Skate");
    expect(names).not.toContain("Runners");
    const entries = roleGlossaryV7("RAIDER", "ICE_FOLK");
    const glossaryNames = entries.map((entry) => entry.name);
    expect(glossaryNames).toContain("Glide");
    for (const gone of ["Skates", "Runners", "Glides past"])
      expect(glossaryNames).not.toContain(gone);
    const glide = entries.find((entry) => entry.name === "Glide");
    // At most one number per entry (here none).
    expect(glide?.text.match(/\d+/g) ?? []).toHaveLength(0);
  });
});
