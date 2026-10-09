import { describe, expect, it } from "vitest";
import {
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  calculateCombatPreviewV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  parseReplayJsonV7,
  previewWailV7,
  projectEventsV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  roleMechanicsV7,
  runReplayV7,
  unitId,
  viewForV7,
  wailTargetsV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type TerrainIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { chooseNormalTurnCommandV7 } from "../../src/ai/v7";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { checkedV7, mirrorOptionV7 } from "../fixtures/v7-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";

// Seed-2 DRY_LAND boards (factions never change the board):
// - two seats (11x11): human capital (8, 8), enemy capital (2, 8) with
//   territory x 1-3, y 7-9; villages (5, 5), (8, 5), and (5, 8); rows 0-4
//   west of x 6 hold no settlement.
// - three seats (14x14): capitals (2, 2), (11, 11), and (11, 2); villages
//   (8, 2), (8, 5), (11, 5), and (5, 8).
const ENEMY_CAPITAL_TERRITORY = { x: 3, y: 7 } as const;
const VILLAGE = { x: 5, y: 5 } as const;

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

describe("ruleset-7 revision-13 Wail: targets and damage", () => {
  it("hits every visible hostile living unit within Chebyshev 2, afloat or not", () => {
    const banshee = { x: 6, y: 6 };
    const hiddenAt = { x: 8, y: 8 };
    const state = arena(
      ["UNDEAD", "ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "MARKSMAN", at: banshee },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 9, y: 6 } },
        { seat: 2, role: "FIGHTER", at: { x: 4, y: 6 } },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 8 }, form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 4 }, form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: hiddenAt },
      ],
      {
        water: [
          { x: 4, y: 8 },
          { x: 4, y: 4 },
        ],
        explored: { 0: allExceptTiles([hiddenAt], 14) },
      },
    );
    const expected = [
      { x: 4, y: 4 },
      { x: 7, y: 7 },
      { x: 8, y: 6 },
      { x: 4, y: 8 },
    ]
      .map((at) => unitAt(state, at))
      .sort(
        (left, right) =>
          left.at.y - right.at.y ||
          left.at.x - right.at.x ||
          left.id - right.id,
      );
    const bansheeUnit = unitAt(state, banshee);
    expect(
      wailTargetsV7(state, bansheeUnit).map((target) => target.unitId),
    ).toEqual(expected.map((unit) => unit.id));
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual({
      kind: "WAIL",
      unitId: bansheeUnit.id,
    });
    const preview = previewWailV7(state, state.humanPlayerId, bansheeUnit.id);
    expect(preview?.targets.map((target) => target.unitId)).toEqual(
      expected.map((unit) => unit.id),
    );
    const result = apply(state, state.humanPlayerId, {
      kind: "WAIL",
      unitId: bansheeUnit.id,
    });
    const wail = result.events[0];
    expect(wail?.kind).toBe("WAIL_RESOLVED");
    if (wail?.kind !== "WAIL_RESOLVED") return;
    expect(wail.results.map((entry) => entry.unitId)).toEqual(
      expected.map((unit) => unit.id),
    );
    // Undead, own, out-of-range, and hidden units are untouched.
    for (const at of [{ x: 9, y: 6 }, { x: 4, y: 6 }, { x: 6, y: 5 }, hiddenAt])
      expect(unitAt(result.state, at).hp).toBe(unitAt(state, at).hp);
  });

  it("never targets allied units", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD", "ORIGINAL"],
      [
        { seat: 1, role: "MARKSMAN", at: { x: 6, y: 6 } },
        { seat: 2, role: "FIGHTER", at: { x: 7, y: 6 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 6 } },
      ],
      { aiMode: "COOPERATIVE", activeSeat: 1 },
    );
    const banshee = unitAt(state, { x: 6, y: 6 });
    expect(
      wailTargetsV7(state, banshee).map((target) => target.unitId),
    ).toEqual([unitAt(state, { x: 5, y: 6 }).id]);
  });

  it("applies the ordinary damage formula at Attack 1 against each target's defense", () => {
    const banshee = { x: 2, y: 5 };
    const pieces: Piece[] = [
      { seat: 0, role: "MARKSMAN", at: banshee },
      // Grass, full HP: Defense 2.
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 4 } },
      // Forest cover: Defense 2 x 1.5.
      { seat: 1, role: "FIGHTER", at: { x: 3, y: 4 } },
      // Embarked: Defense 1.
      { seat: 1, role: "FIGHTER", at: { x: 0, y: 5 }, form: "EMBARKED" },
      // Field Defense in its owner's territory: Defense 2 + 1.
      { seat: 1, role: "FIGHTER", at: ENEMY_CAPITAL_TERRITORY },
      // Wounded.
      { seat: 1, role: "GUARD", at: { x: 4, y: 6 }, hp: 5 },
    ];
    const options: ArenaOptions = {
      water: [{ x: 0, y: 5 }],
      terrain: [{ at: { x: 3, y: 4 }, terrain: "FOREST" }],
      fieldDefense: [ENEMY_CAPITAL_TERRITORY],
    };
    const state = arena(["UNDEAD", "ORIGINAL"], pieces, options);
    const targets = wailTargetsV7(state, unitAt(state, banshee));
    const byAt = (at: CoordV7) =>
      required(targets.find((target) => same(target.at, at)));
    expect(byAt({ x: 1, y: 4 })).toMatchObject({
      defense2: 4,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
      fortificationLevel: 0,
      damage: 2,
      dies: false,
      shieldDamage: 0,
    });
    expect(byAt({ x: 3, y: 4 })).toMatchObject({
      defense2: 4,
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
      damage: 1,
    });
    expect(byAt({ x: 0, y: 5 })).toMatchObject({
      defense2: 2,
      defenseBonusNumerator: 1,
      damage: 2,
    });
    expect(byAt(ENEMY_CAPITAL_TERRITORY)).toMatchObject({
      defense2: 8,
      fortificationLevel: 2,
      damage: 1,
    });
    // The exact formula agrees with an ordinary attack at attack2 = 2 by a
    // full-HP Necromancer standing where the full-HP Banshee stands, and at
    // half HP likewise.
    for (const hp of [8, 4]) {
      const wailState = checkedV7({
        ...state,
        units: state.units.map((unit) =>
          same(unit.at, banshee) ? { ...unit, hp } : unit,
        ),
      });
      const necromancerState = checkedV7({
        ...wailState,
        units: wailState.units.map((unit) =>
          same(unit.at, banshee)
            ? { ...unit, role: "CAPTAIN" as const, hp: hp + hp / 4, maxHp: 10 }
            : unit,
        ),
      });
      const necromancer = unitAt(necromancerState, banshee);
      for (const target of wailTargetsV7(wailState, unitAt(wailState, banshee)))
        expect(target.damage).toBe(
          calculateCombatPreviewV7(
            necromancerState,
            necromancer.id,
            target.unitId,
          ).damageToDefender,
        );
    }
  });

  it("lists and accepts a zero-damage target", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 }, hp: 1 },
        { seat: 1, role: "JUGGERNAUT", at: { x: 3, y: 3 } },
      ],
    );
    const banshee = unitAt(state, { x: 2, y: 2 });
    const juggernaut = unitAt(state, { x: 3, y: 3 });
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual({
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(previewWailV7(state, state.humanPlayerId, banshee.id)).toEqual({
      unitId: banshee.id,
      at: banshee.at,
      attack2: 2,
      targets: [
        {
          unitId: juggernaut.id,
          at: juggernaut.at,
          defense2: 8,
          defenseBonusNumerator: 1,
          defenseBonusDenominator: 1,
          fortificationLevel: 0,
          damage: 0,
          dies: false,
          shieldDamage: 0,
          hiddenBlizzardPossible: false,
          leavesGrave: false,
          bittenRises: false,
        },
      ],
    });
    const result = apply(state, state.humanPlayerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(result.events[0]).toEqual({
      kind: "WAIL_RESOLVED",
      playerId: state.humanPlayerId,
      unitId: banshee.id,
      at: banshee.at,
      results: [
        {
          unitId: juggernaut.id,
          at: juggernaut.at,
          damage: 0,
          dies: false,
          shieldDamage: 0,
        },
      ],
    });
    expect(unitAt(result.state, { x: 3, y: 3 }).hp).toBe(juggernaut.hp);
    expect(unitAt(result.state, { x: 2, y: 2 }).activation).toMatchObject({
      specialActed: true,
      handled: true,
      attacked: false,
    });
  });
});

describe("ruleset-7 revision-13 Wail: resolution", () => {
  function resolutionArena() {
    return arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 }, kills: 2 },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
        { seat: 1, role: "MARKSMAN", at: { x: 4, y: 2 } },
      ],
      {
        graves: [{ x: 1, y: 1 }],
        fieldDefense: [
          { x: 1, y: 3 },
          { x: 3, y: 3 },
        ],
      },
    );
  }

  it("resolves simultaneously with no retaliation, advance, or Field Defense destruction", () => {
    const state = resolutionArena();
    const banshee = unitAt(state, { x: 2, y: 2 });
    const dead = [
      { x: 1, y: 1 },
      { x: 3, y: 2 },
      { x: 1, y: 3 },
    ].map((at) => unitAt(state, at));
    const result = apply(state, state.humanPlayerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(result.events.slice(0, 6)).toEqual([
      expect.objectContaining({ kind: "WAIL_RESOLVED" }),
      { kind: "UNIT_DIED", unitId: dead[0]?.id, cause: "WAIL" },
      { kind: "UNIT_DIED", unitId: dead[1]?.id, cause: "WAIL" },
      { kind: "GRAVE_CREATED", at: { x: 3, y: 2 } },
      { kind: "UNIT_DIED", unitId: dead[2]?.id, cause: "WAIL" },
      { kind: "GRAVE_CREATED", at: { x: 1, y: 3 } },
    ]);
    const kinds = result.events.map((event) => event.kind);
    for (const kind of [
      "COMBAT_RESOLVED",
      "FIELD_DEFENSE_DESTROYED",
      "UNIT_MOVED",
      "UNIT_PUSHED",
    ] as const)
      expect(kinds).not.toContain(kind);
    const wail = result.events[0];
    if (wail?.kind !== "WAIL_RESOLVED") throw new Error("WAIL_RESOLVED");
    expect(wail.results.map((entry) => [entry.at, entry.dies])).toEqual([
      [{ x: 1, y: 1 }, true],
      [{ x: 3, y: 2 }, true],
      [{ x: 4, y: 2 }, false],
      [{ x: 1, y: 3 }, true],
      [{ x: 3, y: 3 }, false],
    ]);
    for (const entry of wail.results.filter((item) => !item.dies))
      expect(unitAt(result.state, entry.at).hp).toBe(
        unitAt(state, entry.at).hp - entry.damage,
      );
    // The Banshee stays put at full HP and gains every kill.
    const after = unitAt(result.state, { x: 2, y: 2 });
    expect(after).toMatchObject({
      id: banshee.id,
      hp: banshee.hp,
      kills: 5,
      activation: {
        ...READY,
        specialActed: true,
        handled: true,
      },
    });
    expect(result.state.graves).toEqual([
      { x: 1, y: 1 },
      { x: 3, y: 2 },
      { x: 1, y: 3 },
    ]);
    for (const at of [
      { x: 1, y: 3 },
      { x: 3, y: 3 },
    ])
      expect(tileOf(result.state, at).fieldDefense).toBe(true);
    expect(parseGameStateV7(result.state)).toEqual(result.state);
    const offered = queryPlayerCommandsV7(result.state, state.humanPlayerId);
    expect(offered).toContainEqual({ kind: "PROMOTE", unitId: banshee.id });
    expect(offered).not.toContainEqual({ kind: "WAIL", unitId: banshee.id });
    expect(
      applyCommandV7(result.state, state.humanPlayerId, {
        kind: "WAIL",
        unitId: banshee.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
    });
  });

  it("previews exactly the resolution, including Graves", () => {
    const hiddenAt = { x: 6, y: 6 };
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 4, y: 4 } },
        { seat: 1, role: "FIGHTER", at: VILLAGE, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 }, hp: 1 },
        { seat: 1, role: "GUARD", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: hiddenAt, hp: 1 },
      ],
      { explored: { 0: allExceptTiles([hiddenAt]) } },
    );
    const banshee = unitAt(state, { x: 4, y: 4 });
    const preview = required(
      previewWailV7(viewForV7(state, state.humanPlayerId), banshee.id) ??
        undefined,
    );
    expect(preview).toEqual(
      previewWailV7(state, state.humanPlayerId, banshee.id),
    );
    const result = apply(state, state.humanPlayerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    const wail = result.events[0];
    if (wail?.kind !== "WAIL_RESOLVED") throw new Error("WAIL_RESOLVED");
    expect(
      preview.targets.map(({ unitId, at, damage, dies }) => ({
        unitId,
        at,
        damage,
        dies,
        shieldDamage: 0,
      })),
    ).toEqual(wail.results);
    expect(
      preview.targets
        .filter((target) => target.leavesGrave)
        .map((target) => target.at),
    ).toEqual(
      result.events.flatMap((event) =>
        event.kind === "GRAVE_CREATED" ? [event.at] : [],
      ),
    );
    expect(preview.targets.map((target) => target.leavesGrave)).toEqual([
      true,
      false,
      false,
    ]);
    // The hidden unit is neither previewed nor harmed.
    expect(preview.targets.some((target) => same(target.at, hiddenAt))).toBe(
      false,
    );
    expect(unitAt(result.state, hiddenAt).hp).toBe(1);
  });

  it("never reveals a hidden unit: no offer, no preview, and NO_TARGET", () => {
    const hiddenAt = { x: 4, y: 2 };
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: hiddenAt, hp: 1 },
      ],
      { explored: { 0: allExceptTiles([hiddenAt]) } },
    );
    const banshee = unitAt(state, { x: 2, y: 2 });
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.units.some((unit) => same(unit.at, hiddenAt))).toBe(false);
    expect(queryPlayerCommandsV7(view)).not.toContainEqual({
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(previewWailV7(view, banshee.id)).toBeNull();
    expect(wailTargetsV7(state, banshee)).toEqual([]);
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "WAIL",
        unitId: banshee.id,
      }),
    ).toMatchObject({
      accepted: false,
      state,
      events: [],
      error: { code: "WAIL_NOT_LEGAL", params: { reason: "NO_TARGET" } },
    });
  });

  it("may Wail after a Move but not twice, and rejects illegal Wails atomically", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 4 } },
        { seat: 0, role: "FIGHTER", at: { x: 0, y: 0 } },
        { seat: 0, role: "MARKSMAN", at: { x: 5, y: 0 }, form: "EMBARKED" },
        { seat: 1, role: "MARKSMAN", at: { x: 5, y: 2 } },
      ],
      { water: [{ x: 5, y: 0 }] },
    );
    const banshee = unitAt(state, { x: 2, y: 1 });
    const offered = queryPlayerCommandsV7(state, state.humanPlayerId);
    expect(offered).not.toContainEqual({ kind: "WAIL", unitId: banshee.id });
    const move = required(
      offered.find(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" &&
          command.unitId === banshee.id &&
          same(command.path.at(-1) ?? { x: -1, y: -1 }, { x: 2, y: 2 }),
      ),
    );
    const moved = apply(state, state.humanPlayerId, move).state;
    expect(queryPlayerCommandsV7(moved, state.humanPlayerId)).toContainEqual({
      kind: "WAIL",
      unitId: banshee.id,
    });
    const wailed = apply(moved, state.humanPlayerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(wailed.events[0]).toMatchObject({
      kind: "WAIL_RESOLVED",
      at: { x: 2, y: 2 },
    });

    const skeleton = unitAt(state, { x: 0, y: 0 });
    const embarked = unitAt(state, { x: 5, y: 0 });
    const enemyMarksman = unitAt(state, { x: 5, y: 2 });
    const spent = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === banshee.id
          ? { ...unit, activation: { ...READY, recovered: true } }
          : unit,
      ),
    });
    const cases: readonly [GameStateV7, PlayerId, UnitStateV7["id"], string][] =
      [
        [state, state.humanPlayerId, enemyMarksman.id, "UNIT_NOT_OWNED"],
        [state, state.humanPlayerId, unitId(999), "UNIT_NOT_FOUND"],
        [state, state.humanPlayerId, skeleton.id, "UNIT_ROLE_INVALID"],
        [state, state.humanPlayerId, embarked.id, "UNIT_ROLE_INVALID"],
        [spent, state.humanPlayerId, banshee.id, "UNIT_ALREADY_ACTED"],
        [state, state.humanPlayerId, banshee.id, "WAIL_NOT_LEGAL"],
        [
          state,
          otherPlayer(state, state.humanPlayerId),
          enemyMarksman.id,
          "NOT_ACTIVE_PLAYER",
        ],
      ];
    for (const [input, actor, id, code] of cases) {
      const before = JSON.stringify(input);
      const result = applyCommandV7(input, actor, { kind: "WAIL", unitId: id });
      expect(result).toMatchObject({
        accepted: false,
        state: input,
        events: [],
        error: { code },
      });
      expect(JSON.stringify(result.state)).toBe(before);
    }
  });

  it("gives no Human unit a Wail and leaves Human splash unchanged", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 0 } },
      ],
    );
    const marksman = unitAt(state, { x: 2, y: 2 });
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).map(
        (command) => command.kind,
      ),
    ).not.toContain("WAIL");
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "WAIL",
        unitId: marksman.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ROLE_INVALID", params: { role: "MARKSMAN" } },
    });
    const catapult = unitAt(state, { x: 1, y: 0 });
    expect(
      queryCombatPreviewV7(
        state,
        state.humanPlayerId,
        catapult.id,
        unitAt(state, { x: 3, y: 0 }).id,
      )?.splash,
    ).toEqual([]);
    // Splash stays an engine mechanic: Human role abilities are unchanged.
    expect(roleMechanicsV7("CATAPULT", "ORIGINAL").splash).toBe(false);
    expect(roleMechanicsV7("BATTLESHIP", "ORIGINAL").splash).toBe(true);
    expect(roleMechanicsV7("CATAPULT", "UNDEAD").splash).toBe(true);
    expect(roleMechanicsV7("BATTLESHIP", "UNDEAD").splash).toBe(true);
    expect(effectiveRoleRuleV7("BATTLESHIP", "ORIGINAL").abilities).toEqual([
      "ATTACK",
    ]);
    // Any unit can capture (`pulp_wars-ke95`).
    expect(effectiveRoleRuleV7("CATAPULT", "ORIGINAL").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
    ]);
    expect(publicUnitStatsV7(state, catapult).abilities).toEqual([
      "ATTACK",
      "CAPTURE",
    ]);
  });

  it("threatens Chebyshev 1-2 around every tile a Banshee can reach", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 1, role: "MARKSMAN", at: { x: 2, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 1 } },
      ],
    );
    const banshee = unitAt(state, { x: 2, y: 2 });
    const threatened = queryThreatenedTilesV7(
      state,
      banshee.id,
      state.humanPlayerId,
    );
    expect(threatened).toContainEqual({ x: 2, y: 2 });
    expect(threatened).toContainEqual({ x: 5, y: 2 });
    expect(threatened).toContainEqual({ x: 0, y: 5 });
    expect(threatened).not.toContainEqual({ x: 6, y: 2 });
    expect(threatened).not.toContainEqual({ x: 2, y: 6 });
  });
});

describe("ruleset-7 revision-13 Wail: events, projection, and persistence", () => {
  it("orders the Wail command and event and parses them strictly", () => {
    expect(COMMAND_KIND_ORDER_V7.indexOf("WAIL")).toBeGreaterThan(
      COMMAND_KIND_ORDER_V7.indexOf("TEND_WOUNDED"),
    );
    expect(COMMAND_KIND_ORDER_V7.indexOf("WAIL")).toBeLessThan(
      COMMAND_KIND_ORDER_V7.indexOf("RECOVER"),
    );
    // The Dwarf revision (`pulp_wars-78i.3`) inserts UNIT_BOMBED
    // immediately after COMBAT_RESOLVED, before WAIL_RESOLVED. Was 86
    // (COMBAT_RESOLVED + 2): Dwarf crowd control (`pulp_wars-w49.33`, 7r60)
    // inserted WHIRL_RESOLVED and BARRICADE_ATTACKED after UNIT_BOMBED, so
    // WAIL_RESOLVED is at 88 (COMBAT_RESOLVED + 4). Map curiosities round 2
    // (`pulp_wars-737.14`) insert GATE_DISPLACED, GATE_TRAVERSED, and
    // GATE_BLOCKED after UNIT_MOVED, and Ice Folk Freeze (`pulp_wars-w49.37`)
    // MAMMOTH_STAMPEDED after GIANT_BROKE_OFF, both before COMBAT_RESOLVED:
    // 92 (was 88).
    expect(DOMAIN_EVENT_KIND_ORDER_V7.indexOf("WAIL_RESOLVED")).toBe(92);
    expect(DOMAIN_EVENT_KIND_ORDER_V7.indexOf("WAIL_RESOLVED")).toBe(
      DOMAIN_EVENT_KIND_ORDER_V7.indexOf("COMBAT_RESOLVED") + 4,
    );
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.slice(
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_BOMBED") + 1,
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("WAIL_RESOLVED"),
      ),
    ).toEqual(["WHIRL_RESOLVED", "BARRICADE_ATTACKED"]);
    expect(DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_BOMBED")).toBe(
      DOMAIN_EVENT_KIND_ORDER_V7.indexOf("COMBAT_RESOLVED") + 1,
    );
    expect(parseCommandV7({ kind: "WAIL", unitId: 3 })).toEqual({
      ok: true,
      value: { kind: "WAIL", unitId: 3 },
    });
    for (const invalid of [
      { kind: "WAIL" },
      { kind: "WAIL", unitId: 0 },
      { kind: "WAIL", unitId: 3, targetUnitId: 4 },
    ])
      expect(parseCommandV7(invalid).ok).toBe(false);

    const valid = {
      kind: "WAIL_RESOLVED",
      playerId: 1,
      unitId: 3,
      at: { x: 2, y: 2 },
      results: [
        {
          unitId: 5,
          at: { x: 1, y: 1 },
          damage: 0,
          dies: false,
          shieldDamage: 0,
        },
        {
          unitId: 4,
          at: { x: 3, y: 1 },
          damage: 2,
          dies: true,
          shieldDamage: 0,
        },
        {
          unitId: 6,
          at: { x: 3, y: 1 },
          damage: 1,
          dies: false,
          shieldDamage: 0,
        },
      ],
    };
    expect(parseEventV7(valid)).toEqual({ ok: true, value: valid });
    expect(parseEventV7({ ...valid, results: [] }).ok).toBe(true);
    expect(
      parseEventV7({ kind: "UNIT_DIED", unitId: 4, cause: "WAIL" }).ok,
    ).toBe(true);
    for (const invalid of [
      { ...valid, extra: true },
      { ...valid, at: { x: 1.5, y: 2 } },
      { ...valid, results: [...valid.results].reverse() },
      {
        ...valid,
        results: [
          {
            unitId: 5,
            at: { x: 1, y: 1 },
            damage: 0,
            dies: true,
            shieldDamage: 0,
          },
        ],
      },
      {
        ...valid,
        results: [
          {
            unitId: 5,
            at: { x: 1, y: 1 },
            damage: -1,
            dies: false,
            shieldDamage: 0,
          },
        ],
      },
      { kind: "UNIT_DIED", unitId: 4, cause: "SCREAM" },
    ])
      expect(parseEventV7(invalid).ok).toBe(false);
  });

  it("projects Wail fog-safely, as splash damage to a viewer who cannot see the Banshee", () => {
    const bansheeAt = { x: 6, y: 6 };
    const humanTargetAt = { x: 7, y: 6 };
    const survivorAt = { x: 5, y: 7 };
    const victimAt = { x: 6, y: 8 };
    const state = arena(
      ["UNDEAD", "ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: bansheeAt },
        { seat: 1, role: "FIGHTER", at: humanTargetAt, hp: 1 },
        { seat: 2, role: "FIGHTER", at: survivorAt },
        { seat: 2, role: "FIGHTER", at: victimAt, hp: 1 },
      ],
      {
        explored: {
          1: allExceptTiles([victimAt], 14),
          2: allExceptTiles([bansheeAt, humanTargetAt], 14),
        },
      },
    );
    const banshee = unitAt(state, bansheeAt);
    const [seat1, seat2] = [seatPlayer(state, 1), seatPlayer(state, 2)];
    const humanTarget = unitAt(state, humanTargetAt);
    const survivor = unitAt(state, survivorAt);
    const victim = unitAt(state, victimAt);
    const result = apply(state, state.humanPlayerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    const wail = result.events[0];
    if (wail?.kind !== "WAIL_RESOLVED") throw new Error("WAIL_RESOLVED");
    const entry = (id: UnitStateV7["id"]) =>
      required(wail.results.find((item) => item.unitId === id));
    expect(wail.results).toHaveLength(3);

    const actor = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    expect(actor.events.slice(0, 5)).toEqual(result.events.slice(0, 5));

    // Seat 1 sees the Banshee but never explored the victim's tile.
    const first = projectEventsV7(state, result.state, seat1, result.events);
    expect(first.events).toEqual([
      {
        ...wail,
        results: [entry(humanTarget.id), entry(survivor.id)],
      },
      { kind: "UNIT_DIED", unitId: humanTarget.id, cause: "WAIL" },
      { kind: "GRAVE_CREATED", at: humanTargetAt },
    ]);
    // Seat 2 cannot see the Banshee: only its own entries as splash damage,
    // then its own death and Grave.
    const second = projectEventsV7(state, result.state, seat2, result.events);
    expect(second.events).toEqual([
      {
        kind: "COMBAT_SPLASH_DAMAGE",
        splash: [entry(survivor.id), entry(victim.id)],
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "WAIL" },
      { kind: "GRAVE_CREATED", at: victimAt },
    ]);
    for (const projected of [actor, first, second])
      expect(parsePlayerEventEnvelopeV7(projected)).toEqual({
        ok: true,
        value: projected,
      });
  });

  it("round-trips Wails and Lich splash through replay, checkpoints, and save", () => {
    // pulp_wars-9s0.1: with the campaign plan the seed-16 match has no Wail
    // within 60 rounds; seed 4 had two. pulp_wars-0hi.3: with the Human core
    // roles at +2 HP the seed-4 match ends in round 21 with no Wail; seed 8
    // has two (of seeds 0-23, so do 9, 11, 15, 17, and 23).
    // pulp_wars-if6: with 3 starting Coins the seed-8 match ends in round 22
    // with no Wail; seed 2 had two (of seeds 0-23, so did 1, 3, 4, 5, 13, 17,
    // 20, 22, and 23). On the many-seats boards (`pulp_wars-ykw.3`) the
    // seed-2 match has no Wail; seed 5 has two. With tuning 1
    // (`pulp_wars-w49.3`, 7r46) the seed-5 match has none; seed 12 had two.
    // With tuning 3 seed 12 has one; seed 3 has two.
    // With the Martian pass's correction (`pulp_wars-w49.14`: the Human
    // seat's economy-first opening, its Guards, and its Knights) seed 3 has
    // no Wail; seed 0 has two (of seeds 0-12, so do 2, 5, 6, 8, 9, 10, and
    // 12). With the Industry reshuffle (`pulp_wars-w49.21`, 7r56) the
    // seed-0 match is over in round 13 with no Wail; seed 5 has two by
    // round 15 (of seeds 0-15, so do 6, 7, 8, 9, 10, 14, and 15).
    const setup = setupWith(["UNDEAD", "ORIGINAL"], 5);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    let commandsThisTurn = 0;
    let turnPlayer = activePlayer(state);
    let wails = 0;
    // This scripted driver trains Banshees, walks them toward visible
    // enemies, and Wails deterministically; Normal AI Wails are counted too
    // (pulp_wars-vkq.9).
    while (wails < 2 && state.outcome === null && state.round <= 60) {
      const actor = activePlayer(state);
      if (actor !== turnPlayer) {
        turnPlayer = actor;
        commandsThisTurn = 0;
      }
      const view = viewForV7(state, actor);
      const command =
        scriptedBansheeCommand(view) ??
        chooseNormalTurnCommandV7(view, commandsThisTurn);
      if (command === null) throw new Error("stall");
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      if (command.kind === "WAIL") wails += 1;
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      commandsThisTurn += 1;
    }
    expect(wails).toBe(2);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    const replayed = runReplayV7(parsedReplay.replay);
    expect(replayed.stateHash).toBe(canonicalHash(state));
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(canonicalHash(state));
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  }, 600_000);

  it("round-trips Lich splash from ordinary Normal AI play", () => {
    // Seed 15 fields a Lich that splashes within 45 rounds of Normal play
    // with the revision-16 economy numbers (seed 16 did on revision-16 maps
    // before them, seed 11 on revision-14/15 maps, seed 3 on revision-13
    // maps).
    // With 3 starting Coins (`pulp_wars-if6`) seed 15 trains no Lich; seed 2
    // fielded four, and they splashed. On the many-seats boards
    // (`pulp_wars-ykw.3`) seed 5 fields two, which splash seven times. With
    // tuning 1 (`pulp_wars-w49.3`, 7r46) seed 5 fields none; seed 12 fields
    // four, which splash 14 times. With tuning 3 seed 12 fields none; seed
    // 3 fields three, which splash 19 times. With tuning 5
    // (`pulp_wars-w49.4`: the Normal AI's army play) the Liches of seed 3
    // never splash; those of seed 9 do, ten times. With tuning 6
    // (`pulp_wars-w49.6`: the Undead research the Lich sixth) seed 9
    // fields none in time; the three of seed 3 splash. With tuning 8
    // (`pulp_wars-w49.11`) seed 3 fields none; the five of seed 15 splash
    // (of seeds 0-15, the Liches of seeds 0, 2, 5, 6, 8, 14, and 15 do).
    // With the Martian pass's correction (`pulp_wars-w49.14`: the Human
    // seat of the Normal AI) the Liches of seed 15 never splash; those of
    // seed 0 do (of seeds 0-14, so do 2, 6, 8, 9, and 14). With the ninth
    // unit (`pulp_wars-w49.17`, 7r55: the Wight's technologies in the
    // Undead order) the Lich of seed 0 never splashes; that of seed 8
    // does, eight times (of seeds 0-19, so do 3, 6, 10, 14, 15, and 18).
    // With the Industry reshuffle (`pulp_wars-w49.21`, 7r56) seed 8
    // trains no Lich; the two of seed 9 splash (of seeds 0-19, splashes
    // also show on 6, 14, 15, 17, and 18).
    // With step two of the Human pass (`pulp_wars-w49.22`: what a Human
    // seat of the Normal AI trains) the Liches of seed 9 never splash;
    // those of seed 6 do, twelve times (of seeds 0-19, splashes also show
    // on 10, 15, and 18).
    const match = runAiMatchV7(setupWith(["UNDEAD", "ORIGINAL"], 6), {
      maxRounds: 45,
    });
    expect(match.errors).toEqual([]);
    const created = createPlayableGameV7(match.state.setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(match.state.setup);
    let lichSplashes = 0;
    for (const record of match.commandLog) {
      const command = record.command;
      const actor =
        command.kind === "ATTACK"
          ? state.units.find((unit) => unit.id === command.unitId)
          : undefined;
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      if (
        actor?.role === "CATAPULT" &&
        state.players.find((player) => player.id === actor.ownerId)?.faction ===
          "UNDEAD" &&
        result.events.some(
          (event) =>
            event.kind === "COMBAT_RESOLVED" && event.preview.splash.length > 0,
        )
      )
        lichSplashes += 1;
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(lichSplashes).toBeGreaterThan(0);
    expect(canonicalHash(state)).toBe(match.stateHash);
    const parsed = parseReplayJsonV7(JSON.stringify(replay));
    if (parsed.kind !== "VALID") throw new Error(parsed.kind);
    expect(runReplayV7(parsed.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  }, 600_000);
});

describe("ruleset-7 revision-13 Lich splash", () => {
  it("splashes hostile units around the primary target and destroys its Field Defense", () => {
    const primaryAt = { x: 4, y: 1 };
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 1 } },
        { seat: 1, role: "GUARD", at: primaryAt },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 }, hp: 1 },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
      {
        fieldDefense: [primaryAt, { x: 5, y: 1 }],
      },
    );
    const lich = unitAt(state, { x: 2, y: 1 });
    const primary = unitAt(state, primaryAt);
    const splashed = unitAt(state, { x: 5, y: 1 });
    const victim = unitAt(state, { x: 3, y: 2 });
    const preview = required(
      queryCombatPreviewV7(state, state.humanPlayerId, lich.id, primary.id) ??
        undefined,
    );
    const splashDamage = Math.max(1, Math.ceil(preview.damageToDefender / 2));
    expect(preview.splash).toEqual([
      {
        unitId: splashed.id,
        at: splashed.at,
        damage: splashDamage,
        dies: false,
        shieldDamage: 0,
      },
      {
        unitId: victim.id,
        at: victim.at,
        damage: 1,
        dies: true,
        shieldDamage: 0,
      },
    ]);
    expect(preview.advances).toBe(false);
    const result = apply(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: lich.id,
      targetUnitId: primary.id,
    });
    expect(result.events.slice(0, 4)).toEqual([
      { kind: "COMBAT_RESOLVED", preview },
      { kind: "FIELD_DEFENSE_DESTROYED", at: primaryAt, reason: "CATAPULT" },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "SPLASH" },
      { kind: "GRAVE_CREATED", at: victim.at },
    ]);
    expect(tileOf(result.state, primaryAt).fieldDefense).toBe(false);
    expect(tileOf(result.state, { x: 5, y: 1 }).fieldDefense).toBe(true);
    expect(unitAt(result.state, { x: 5, y: 1 }).hp).toBe(
      splashed.hp - splashDamage,
    );
    // Own and out-of-reach units are unaffected; the splash kill counts.
    expect(unitAt(result.state, { x: 4, y: 2 }).hp).toBe(10);
    expect(unitAt(result.state, { x: 5, y: 3 }).hp).toBe(12);
    expect(unitAt(result.state, { x: 2, y: 1 }).kills).toBe(1);
    expect(unitAt(result.state, primaryAt).id).toBe(primary.id);
  });

  it("splashes Undead units of a hostile seat", () => {
    const state = arena(
      ["UNDEAD", "UNDEAD"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 4, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 2 } },
      ],
    );
    const lich = unitAt(state, { x: 2, y: 1 });
    const skeleton = unitAt(state, { x: 5, y: 2 });
    const preview = queryCombatPreviewV7(
      state,
      state.humanPlayerId,
      lich.id,
      unitAt(state, { x: 4, y: 1 }).id,
    );
    expect(preview?.splash.map((entry) => entry.unitId)).toEqual([skeleton.id]);
  });

  it("never splashes when the Lich retaliates", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 1 } },
        { seat: 1, role: "MARKSMAN", at: { x: 2, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
      { activeSeat: 1 },
    );
    const lich = unitAt(state, { x: 2, y: 1 });
    const marksman = unitAt(state, { x: 2, y: 3 });
    const result = apply(state, marksman.ownerId, {
      kind: "ATTACK",
      unitId: marksman.id,
      targetUnitId: lich.id,
    });
    const combat = result.events[0];
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("COMBAT_RESOLVED");
    expect(combat.preview.retaliation).toBe(true);
    expect(combat.preview.damageToAttacker).toBeGreaterThan(0);
    expect(combat.preview.splash).toEqual([]);
    for (const at of [
      { x: 2, y: 4 },
      { x: 3, y: 3 },
    ])
      expect(unitAt(result.state, at).hp).toBe(12);
  });

  it("resolves hidden splash victims canonically and projects them fog-safely", () => {
    const lichAt = { x: 6, y: 4 };
    const targetAt = { x: 6, y: 6 };
    const hiddenAt = { x: 7, y: 7 };
    const state = arena(
      ["UNDEAD", "ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: lichAt },
        { seat: 1, role: "FIGHTER", at: targetAt },
        { seat: 2, role: "FIGHTER", at: hiddenAt, hp: 1 },
      ],
      {
        explored: {
          0: allExceptTiles([hiddenAt], 14),
          2: allExceptTiles([lichAt, targetAt], 14),
        },
      },
    );
    const lich = unitAt(state, lichAt);
    const target = unitAt(state, targetAt);
    const hidden = unitAt(state, hiddenAt);
    const publicPreview = required(
      queryCombatPreviewV7(state, state.humanPlayerId, lich.id, target.id) ??
        undefined,
    );
    expect(publicPreview.splash).toEqual([]);
    const result = apply(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: lich.id,
      targetUnitId: target.id,
    });
    const combat = result.events[0];
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("COMBAT_RESOLVED");
    const hiddenEntry = {
      unitId: hidden.id,
      at: hiddenAt,
      damage: 1,
      dies: true,
      shieldDamage: 0,
    };
    expect(combat.preview.splash).toEqual([hiddenEntry]);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: hidden.id,
      cause: "SPLASH",
    });
    expect(result.state.graves).toEqual([hiddenAt]);
    expect(result.state.units.some((unit) => unit.id === hidden.id)).toBe(
      false,
    );

    const actor = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    expect(actor.events[0]).toEqual({
      kind: "COMBAT_RESOLVED",
      preview: { ...combat.preview, splash: [] },
    });
    expect(
      actor.events.some(
        (event) =>
          (event.kind === "UNIT_DIED" && event.unitId === hidden.id) ||
          event.kind === "GRAVE_CREATED",
      ),
    ).toBe(false);
    const owner = projectEventsV7(
      state,
      result.state,
      seatPlayer(state, 2),
      result.events,
    );
    expect(owner.events).toEqual([
      { kind: "COMBAT_SPLASH_DAMAGE", splash: [hiddenEntry] },
      { kind: "UNIT_DIED", unitId: hidden.id, cause: "SPLASH" },
      { kind: "GRAVE_CREATED", at: hiddenAt },
    ]);
    for (const projected of [actor, owner])
      expect(parsePlayerEventEnvelopeV7(projected)).toEqual({
        ok: true,
        value: projected,
      });
  });
});

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly kills?: number;
  readonly form?: UnitStateV7["form"];
}

interface ArenaOptions {
  /** Tiles turned into Shallow Water. */
  readonly water?: readonly CoordV7[];
  /** Terrain overrides applied after clearing piece tiles. */
  readonly terrain?: readonly {
    readonly at: CoordV7;
    readonly terrain: TerrainIdV7;
  }[];
  readonly fieldDefense?: readonly CoordV7[];
  readonly graves?: readonly CoordV7[];
  /** Explored tiles per seat; every tile when omitted. */
  readonly explored?: Readonly<Record<number, readonly CoordV7[]>>;
  readonly activeSeat?: number;
  readonly aiMode?: MatchSetupV7["aiMode"];
}

function setupWith(
  factions: readonly FactionIdV7[],
  seed = 2,
  aiMode: MatchSetupV7["aiMode"] = "RIVAL",
): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * A seed-2 board with every technology, the given pieces as the only units,
 * and every non-settlement piece tile cleared to Grass (or Shallow Water).
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(
    setupWith(factions, 2, options.aiMode),
  );
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const size = base.board.width;
  const water = options.water ?? [];
  const player = (seat: number) =>
    required(base.players.find((candidate) => candidate.seat === seat));
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: piece.form ?? "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: piece.kills ?? 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const cleared = [...pieces.map((piece) => piece.at), ...water];
  const activeId = player(options.activeSeat ?? 0).id;
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(activeId),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 10_000,
      explored: sortedCoords(
        options.explored?.[candidate.seat] ?? allExceptTiles([], size),
      ),
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: options.graves ?? [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        if (water.some((at) => same(at, tile.at)))
          return {
            ...tile,
            biome: null,
            terrain: "SHALLOW_WATER" as const,
            resource: null,
            improvement: null,
            road: false,
            fieldDefense: false,
            site: null,
          };
        const override = options.terrain?.find((item) =>
          same(item.at, tile.at),
        );
        const fieldDefense =
          options.fieldDefense?.some((at) => same(at, tile.at)) ?? false;
        if (!cleared.some((at) => same(at, tile.at)) || tile.site !== null)
          return fieldDefense ? { ...tile, fieldDefense } : tile;
        return {
          ...tile,
          biome: tile.biome ?? "PLAINS",
          terrain: override?.terrain ?? ("GRASS" as const),
          resource: null,
          improvement: null,
          road: false,
          fieldDefense,
        };
      }),
    },
  });
}

/**
 * A deterministic public-view driver for the Undead seat: Wail when offered,
 * otherwise step a Banshee closer to the nearest visible hostile unit, or
 * train a Banshee; `null` defers to Normal AI.
 */
function scriptedBansheeCommand(
  view: ReturnType<typeof viewForV7>,
): CommandV7 | null {
  if (view.viewer.faction !== "UNDEAD") return null;
  const offered = queryPlayerCommandsV7(view);
  const wail = offered.find((command) => command.kind === "WAIL");
  if (wail !== undefined) return wail;
  const hostiles = view.units.filter((unit) => unit.ownerId !== view.viewer.id);
  const distanceToHostiles = (at: CoordV7) =>
    Math.min(
      Number.MAX_SAFE_INTEGER,
      ...hostiles.map((unit) => chebyshev(unit.at, at)),
    );
  let best: Extract<CommandV7, { kind: "MOVE" }> | null = null;
  for (const command of offered) {
    if (command.kind !== "MOVE") continue;
    const unit = view.units.find(
      (candidate) => candidate.id === command.unitId,
    );
    const end = command.path.at(-1);
    if (unit?.role !== "MARKSMAN" || end === undefined) continue;
    if (
      distanceToHostiles(end) < distanceToHostiles(unit.at) &&
      (best === null ||
        distanceToHostiles(end) <
          distanceToHostiles(best.path.at(-1) ?? unit.at))
    )
      best = command;
  }
  if (best !== null) return best;
  return (
    offered.find(
      (command) => command.kind === "TRAIN" && command.role === "MARKSMAN",
    ) ?? null
  );
}

function activePlayer(state: GameStateV7): PlayerId {
  return required(state.turnOrder[state.activeSeatIndex]);
}

function apply(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result;
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function tileOf(state: GameStateV7, at: CoordV7) {
  return required(state.board.tiles.find((tile) => same(tile.at, at)));
}

function seatPlayer(state: GameStateV7, seat: number): PlayerId {
  return required(state.players.find((player) => player.seat === seat)).id;
}

function otherPlayer(state: GameStateV7, id: PlayerId): PlayerId {
  return required(state.players.find((player) => player.id !== id)).id;
}

function allExceptTiles(excluded: readonly CoordV7[], size = 11): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1)
      if (!excluded.some((at) => at.x === x && at.y === y))
        result.push({ x, y });
  return result;
}

function sortedCoords(coords: readonly CoordV7[]): CoordV7[] {
  const unique = new Map(coords.map((at) => [`${at.x},${at.y}`, at]));
  return [...unique.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture value missing");
  return value;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
