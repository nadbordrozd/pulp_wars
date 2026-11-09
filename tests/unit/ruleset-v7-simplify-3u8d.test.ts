import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  COMMAND_KIND_ORDER_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  parseCommandV7,
  previewBoardV7,
  previewSwallowV7,
  queryAiReadyCommandsV7,
  queryIdleRecoveryV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { boardMapTargetsV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  tileActionPlanForSelectionV7,
  type TileActionPlanV7,
} from "../../src/render/canvas/tile-actions-v7";
import { checkedV7, idleRecoveryOfV7 } from "../fixtures/v7-builders";
import { cultFieldV7 } from "../fixtures/v7-cult";
import { applyOkV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7 } from "../fixtures/v7-ice-folk";
import { martianFieldV7, offeredV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  activeIdV7,
  at,
  fieldV7,
  patchTileV7,
} from "../fixtures/v7-revision20";
import {
  GUN_V7,
  P1,
  rejectionV7,
  round3ArenaV7,
  round3UnitAtV7,
} from "../fixtures/v7-round3-arena";

// `pulp_wars-3u8d` (7r131): one tile, one meaning, by rule
// (docs/product/SIMPLIFICATION_REVIEW_2026-11.md findings 7, 9, 10, 12, 15
// and 17). The Sled's Bolas flies exactly 2 tiles; an Abomination's attack
// on a unit it may swallow swallows it, and a ship's attack on a ship it
// may board boards it (no SWALLOW or BOARD command); the Saucer's Tractor
// Beam pulls hostile units only; RECOVER is gone (idle recovery at End
// Turn, the same predicate and amount); the Moon Gun fires only beyond the
// tiles its unit could walk to; and a Tentacle tile is never also a Move.
// Every state is hand-built; no match is played.

const reach = (from: CoordV7, to: CoordV7): number =>
  Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));

const key = (where: CoordV7): string => `${where.x},${where.y}`;

const activeView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, activeIdV7(state));

/** The tiles the selected unit marks, each with the actions it means. */
function meanings(
  state: GameStateV7,
  where: CoordV7,
): ReadonlyMap<string, readonly string[]> {
  const view = activeView(state);
  const commands = queryPlayerCommandsV7(view);
  const unitId = unitAtV7(state, where).id;
  const plan: TileActionPlanV7 | null = tileActionPlanForSelectionV7(
    view,
    commands,
    unitId,
  );
  const tiles = new Map<string, string[]>();
  for (const tile of plan?.tiles ?? [])
    tiles.set(
      key(tile.at),
      tile.actions.map((action) => action.id),
    );
  for (const target of boardMapTargetsV7(view, commands, {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    selectedAchievement: null,
  }))
    if (!tiles.has(key(target.at))) tiles.set(key(target.at), [target.family]);
  return tiles;
}

/** The selected unit's unarmed board target on `where`. */
function targetAt(state: GameStateV7, unitAt: CoordV7, where: CoordV7) {
  const view = activeView(state);
  const unitId = unitAtV7(state, unitAt).id;
  return boardMapTargetsV7(view, queryPlayerCommandsV7(view), {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    selectedAchievement: null,
  }).find((target) => key(target.at) === key(where));
}

const commandsOf = (state: GameStateV7, where: CoordV7): CommandV7[] => {
  const unitId = unitAtV7(state, where).id;
  return queryPlayerCommandsV7(activeView(state)).filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );
};

const attack = (state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

const kindsOf = (events: readonly { readonly kind: string }[]) =>
  events.map((event) => event.kind);

/** The active seat plays its one turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
} {
  const actor = activeIdV7(start);
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 64; accepted += 1) {
    const view = viewForV7(state, actor);
    const decision = chooseNormalCommandV7(view);
    const command = chooseNormalTurnCommandV7(view, accepted, 64, decision);
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
    expect(
      queryAiReadyCommandsV7(view).some(
        (item) => JSON.stringify(item.command) === JSON.stringify(command),
      ),
      command.kind,
    ).toBe(true);
    commands.push(command);
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

describe("the identity (pulp_wars-3u8d)", () => {
  it("was 7r131 after 7r130, whose save key is obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r137");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r137.current");
    expect(PRIOR_RULESET_7_IDS.at(-7)).toBe("pulp-wars-poc-7r130");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-7)).toBe(
      "pulpWars.save.v7r130.current",
    );
  });

  it("retires the BOARD, RECOVER and SWALLOW commands", () => {
    for (const retired of ["BOARD", "RECOVER", "SWALLOW"]) {
      expect(COMMAND_KIND_ORDER_V7, retired).not.toContain(retired);
      expect(
        parseCommandV7({ kind: retired, unitId: 4, targetUnitId: 9 }).ok,
        retired,
      ).toBe(false);
      expect(parseCommandV7({ kind: retired, unitId: 4 }).ok, retired).toBe(
        false,
      );
    }
  });
});

describe("the Sled (pulp_wars-3u8d; its Bolas went with pulp_wars-xv0t)", () => {
  const SLED = at(4, 3);
  /** An Ice Folk Sled with a Fighter next to it and one 2 tiles away. */
  const sledField = (): GameStateV7 =>
    iceFieldV7([
      { seat: 0, role: "RAIDER", at: SLED },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);

  it("gives each tile one meaning: Attack on the neighbour, nothing 2 tiles away", () => {
    const tiles = meanings(sledField(), SLED);
    expect(tiles.get("5,3")).toEqual(["ATTACK"]);
    expect(tiles.has("6,3")).toBe(false);
  });
});

describe("the Abomination: its attack swallows (pulp_wars-3u8d)", () => {
  const ABOMINATION = at(5, 3);
  /** An Abomination beside a Fighter it may swallow and a full Knight. */
  const giantField = (activeSeat = 0): GameStateV7 =>
    fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: ABOMINATION },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 9 },
        { seat: 1, role: "KNIGHT", at: at(4, 3) },
      ],
      { factions: ["UNDEAD", "ORIGINAL"], activeSeat },
    );

  it("swallows a unit it may swallow, and the preview says so", () => {
    const state = giantField();
    const view = activeView(state);
    const preview = previewSwallowV7(
      view,
      unitAtV7(state, ABOMINATION).id,
      unitAtV7(state, at(6, 3)).id,
    );
    expect(preview).toMatchObject({ hp: 9, digestedAfterTurns: 3 });
    expect(targetAt(state, ABOMINATION, at(6, 3))).toMatchObject({
      family: "ATTACK",
      previewLabel: "Swallow · 3 turns",
      previewNote: "Will be swallowed whole",
    });
    const result = applyOkV7(
      state,
      activeIdV7(state),
      attack(state, ABOMINATION, at(6, 3)),
    );
    expect(kindsOf(result.events)).toContain("UNIT_SWALLOWED");
    expect(kindsOf(result.events)).not.toContain("COMBAT_RESOLVED");
    expect(result.state.giants.swallowed).toHaveLength(1);
  });

  it("attacks a unit it may not swallow as an ordinary exchange", () => {
    const state = giantField();
    expect(
      previewSwallowV7(
        activeView(state),
        unitAtV7(state, ABOMINATION).id,
        unitAtV7(state, at(4, 3)).id,
      ),
    ).toBeNull();
    const result = applyOkV7(
      state,
      activeIdV7(state),
      attack(state, ABOMINATION, at(4, 3)),
    );
    expect(kindsOf(result.events)).toContain("COMBAT_RESOLVED");
    expect(kindsOf(result.events)).not.toContain("UNIT_SWALLOWED");
  });

  it("never swallows by a strike back", () => {
    // The Human seat's Fighter (9 HP, swallowable) attacks the Abomination.
    const state = giantField(1);
    const result = applyOkV7(
      state,
      activeIdV7(state),
      attack(state, at(6, 3), ABOMINATION),
    );
    expect(kindsOf(result.events)).toContain("COMBAT_RESOLVED");
    expect(kindsOf(result.events)).not.toContain("UNIT_SWALLOWED");
    expect(result.state.giants.swallowed).toEqual([]);
  });

  it("is offered no SWALLOW command, and each tile has one meaning", () => {
    const state = giantField();
    expect(
      queryPlayerCommandsV7(activeView(state)).some(
        (command) => (command.kind as string) === "SWALLOW",
      ),
    ).toBe(false);
    const tiles = meanings(state, ABOMINATION);
    expect(tiles.get("6,3")).toEqual(["ATTACK"]);
    expect(tiles.get("4,3")).toEqual(["ATTACK"]);
  });
});

describe("Board: a ship's attack boards (pulp_wars-3u8d)", () => {
  const BOARDER: CoordV7 = { x: 5, y: 4 };
  const PRIZE: CoordV7 = { x: 5, y: 5 };
  const HEALTHY: CoordV7 = { x: 6, y: 4 };
  const boardingField = (): GameStateV7 => {
    const base = navalArenaV7({
      technologies: [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: BOARDER },
        { seat: 1, role: "PATROL_BOAT", at: PRIZE },
        { seat: 1, role: "PATROL_BOAT", at: HEALTHY },
      ],
    });
    return patchNavalUnitV7(base, navalUnitAtV7(base, PRIZE).id, { hp: 3 });
  };
  const shipAttack = (
    state: GameStateV7,
    from: CoordV7,
    to: CoordV7,
  ): CommandV7 => ({
    kind: "ATTACK",
    unitId: navalUnitAtV7(state, from).id,
    targetUnitId: navalUnitAtV7(state, to).id,
  });

  it("boards a ship it may board, and the preview says Board: captures the ship", () => {
    const state = boardingField();
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(
      previewBoardV7(
        view,
        navalUnitAtV7(state, BOARDER).id,
        navalUnitAtV7(state, PRIZE).id,
      ),
    ).toMatchObject({ hpAfter: 4 });
    const commands = queryPlayerCommandsV7(view);
    const unitId = navalUnitAtV7(state, BOARDER).id;
    const target = boardMapTargetsV7(view, commands, {
      selection: { kind: "UNIT", unitId },
      selectedUnitId: unitId,
      selectedAchievement: null,
    }).find((candidate) => key(candidate.at) === key(PRIZE));
    expect(target).toMatchObject({
      family: "ATTACK",
      previewLabel: "Board: captures the ship",
      previewNote: "It becomes yours with 4 HP",
    });
    const result = acceptV7(state, 0, shipAttack(state, BOARDER, PRIZE));
    expect(kindsOf(result.events)).toContain("SHIP_BOARDED");
    expect(kindsOf(result.events)).not.toContain("COMBAT_RESOLVED");
    expect(navalUnitAtV7(result.state, PRIZE).ownerId).toBe(
      seatV7(state, 0).id,
    );
  });

  it("attacks a ship it may not board as an ordinary exchange", () => {
    const state = boardingField();
    const result = acceptV7(state, 0, shipAttack(state, BOARDER, HEALTHY));
    expect(kindsOf(result.events)).toContain("COMBAT_RESOLVED");
    expect(kindsOf(result.events)).not.toContain("SHIP_BOARDED");
  });

  it("never boards by a strike back, and no BOARD command is offered", () => {
    const state = boardingField();
    expect(
      queryPlayerCommandsV7(viewForV7(state, seatV7(state, 0).id)).some(
        (command) => (command.kind as string) === "BOARD",
      ),
    ).toBe(false);
    // The crippled Human boat attacks the boarder on the Human turn.
    const theirs = acceptV7(state, 0, { kind: "END_TURN" }).state;
    const result = acceptV7(theirs, 1, shipAttack(theirs, PRIZE, BOARDER));
    expect(kindsOf(result.events)).toContain("COMBAT_RESOLVED");
    expect(kindsOf(result.events)).not.toContain("SHIP_BOARDED");
  });
});

describe("the Saucer pulls hostile units only (pulp_wars-3u8d)", () => {
  const PULLER = at(4, 3);
  const pullField = (role: "RAIDER" | "KNIGHT"): GameStateV7 =>
    martianFieldV7([
      { seat: 0, role, at: PULLER },
      { seat: 0, role: "FIGHTER", at: at(4, 1) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
  const pulled = (state: GameStateV7) =>
    commandsOf(state, PULLER).flatMap((command) =>
      command.kind === "TRACTOR_BEAM" ? [command.targetUnitId] : [],
    );

  it("offers the Saucer's Tractor Beam on a hostile unit and never on its own", () => {
    const state = pullField("RAIDER");
    expect(pulled(state)).toEqual([unitAtV7(state, at(6, 3)).id]);
    expect(
      rejectedV7(state, {
        kind: "TRACTOR_BEAM",
        unitId: unitAtV7(state, PULLER).id,
        targetUnitId: unitAtV7(state, at(4, 1)).id,
      }),
    ).toEqual({
      code: "TRACTOR_BEAM_NOT_LEGAL",
      params: { reason: "OWN_UNIT" },
    });
  });

  it("leaves the Mothership's Heavy Tractor Beam on own units as it was", () => {
    const state = pullField("KNIGHT");
    expect(pulled(state)).toEqual(
      expect.arrayContaining([
        unitAtV7(state, at(4, 1)).id,
        unitAtV7(state, at(6, 3)).id,
      ]),
    );
  });
});

describe("Recover is gone: idle recovery only (pulp_wars-3u8d)", () => {
  /** A wounded Fighter in its own territory (seat 0's (8, 7)). */
  const woundedField = (): GameStateV7 =>
    fieldV7([{ seat: 0, role: "FIGHTER", at: at(8, 7), hp: 5 }], {
      factions: ["ORIGINAL", "GOBLIN"],
    });

  it("is never offered or accepted", () => {
    const state = woundedField();
    const fighter = unitAtV7(state, at(8, 7)).id;
    expect(
      queryPlayerCommandsV7(activeView(state)).some(
        (command) => (command.kind as string) === "RECOVER",
      ),
    ).toBe(false);
    const result = applyCommandV7(state, activeIdV7(state), {
      kind: "RECOVER",
      unitId: fighter,
    } as unknown as CommandV7);
    expect(result.accepted).toBe(false);
  });

  it("End Turn heals the same amount: 4 in own territory", () => {
    const state = woundedField();
    const fighter = unitAtV7(state, at(8, 7)).id;
    expect(queryIdleRecoveryV7(state, activeIdV7(state))).toEqual([
      { unitId: fighter, amount: 4 },
    ]);
    const ended = applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
    expect(ended.events).toContainEqual({
      kind: "UNIT_RECOVERED",
      unitId: fighter,
      amount: 4,
      automatic: true,
    });
    expect(ended.state.units.find((unit) => unit.id === fighter)?.hp).toBe(9);
    // A Wait changes nothing.
    const waited = applyOkV7(state, activeIdV7(state), {
      kind: "WAIT",
      unitId: fighter,
    }).state;
    expect(idleRecoveryOfV7(waited, fighter)).toEqual(
      idleRecoveryOfV7(state, fighter),
    );
  });
});

describe("the Moon Gun fires only beyond a walk (pulp_wars-3u8d)", () => {
  const gunField = (moved = false): GameStateV7 =>
    round3ArenaV7({
      kinds: ["MOON_GUN"],
      pieces: [
        {
          seat: 0,
          role: "FIGHTER",
          at: GUN_V7,
          ...(moved ? { activation: { moved: true } } : {}),
        },
      ],
    });
  const fire = (state: GameStateV7, to: CoordV7): CommandV7 => ({
    kind: "FIRE_MOON_GUN",
    unitId: round3UnitAtV7(state, GUN_V7).id,
    at: to,
  });
  const offeredOf = (state: GameStateV7, kind: "MOVE" | "FIRE_MOON_GUN") =>
    queryPlayerCommandsV7(viewForV7(state, P1)).flatMap((command) =>
      command.kind === kind &&
      command.unitId === round3UnitAtV7(state, GUN_V7).id
        ? [
            kind === "MOVE" && command.kind === "MOVE"
              ? key(command.path.at(-1) as CoordV7)
              : command.kind === "FIRE_MOON_GUN"
                ? key(command.at)
                : "",
          ]
        : [],
    );

  it("never fires to a tile the unit can walk to, and fires beyond its walk", () => {
    const state = gunField();
    const walks = offeredOf(state, "MOVE");
    const fires = offeredOf(state, "FIRE_MOON_GUN");
    expect(walks.length).toBeGreaterThan(0);
    expect(fires.length).toBeGreaterThan(0);
    for (const tile of walks) expect(fires, tile).not.toContain(tile);
    const [walk] = walks;
    if (walk === undefined) throw new Error("no walk");
    const [x = 0, y = 0] = walk.split(",").map(Number);
    expect(rejectionV7(state, P1, fire(state, at(x, y)))).toEqual({
      code: "MOON_GUN_NOT_LEGAL",
      params: { reason: "WALKABLE" },
    });
    // Two tiles off the Gun is beyond a Fighter's walk.
    const far = at(GUN_V7.x + 2, GUN_V7.y - 2);
    expect(fires).toContain(key(far));
    expect(applyCommandV7(state, P1, fire(state, far)).accepted).toBe(true);
  });

  it("fires to the next tile once the unit has moved (it can walk no more)", () => {
    const state = gunField(true);
    const fires = offeredOf(state, "FIRE_MOON_GUN");
    expect(offeredOf(state, "MOVE")).toEqual([]);
    expect(
      fires.some((tile) => {
        const [x = 0, y = 0] = tile.split(",").map(Number);
        return reach(GUN_V7, at(x, y)) === 1;
      }),
    ).toBe(true);
  });
});

describe("the Summoner's Tentacle replaces a Road Move (pulp_wars-3u8d)", () => {
  const SUMMONER = at(5, 3);
  /** A Summoner on a Road that runs two tiles north. */
  const roadField = (): GameStateV7 => {
    let state = cultFieldV7([{ seat: 0, role: "CAPTAIN", at: SUMMONER }]);
    for (const where of [SUMMONER, at(5, 2), at(5, 1)])
      state = patchTileV7(state, where, { road: true });
    return checkedV7(state);
  };

  it("offers both a Move and a Tentacle 2 tiles up the Road, and the tile means the Tentacle", () => {
    const state = roadField();
    const commands = commandsOf(state, SUMMONER);
    expect(
      commands.some(
        (command) =>
          command.kind === "MOVE" &&
          key(command.path.at(-1) as CoordV7) === "5,1",
      ),
    ).toBe(true);
    expect(
      commands.some(
        (command) => command.kind === "TENTACLE" && key(command.at) === "5,1",
      ),
    ).toBe(true);
    expect(meanings(state, SUMMONER).get("5,1")).toEqual(["TENTACLE"]);
    // The next tile is a Move (no Tentacle rises beside the Summoner).
    expect(meanings(state, SUMMONER).get("5,2")).toEqual(["MOVE"]);
  });
});

describe("the Normal AI follows the new rules (pulp_wars-3u8d)", () => {
  it("the Abomination swallows with its attack", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3), hp: 30 },
        { seat: 1, role: "GUARD", at: at(6, 3), hp: 12 },
      ],
      { factions: ["UNDEAD", "ORIGINAL"] },
    );
    const command = attack(state, at(5, 3), at(6, 3));
    expect(scoreCommandV7(activeView(state), command).priority).toBe(1180);
    const turn = policyTurn(state);
    expect(turn.commands).toContainEqual(command);
    expect(turn.state.giants.swallowed).toHaveLength(1);
  });

  it("a ship boards with its attack", () => {
    const base = navalArenaV7({
      technologies: [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 5 } },
      ],
    });
    const state = patchNavalUnitV7(
      base,
      navalUnitAtV7(base, { x: 5, y: 5 }).id,
      { hp: 8 },
    );
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(chooseNormalCommandV7(view).command).toEqual({
      kind: "ATTACK",
      unitId: navalUnitAtV7(state, { x: 5, y: 4 }).id,
      targetUnitId: navalUnitAtV7(state, { x: 5, y: 5 }).id,
    });
  });

  it("the Saucer never pulls an own unit", () => {
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 1) },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
    ]);
    expect(offeredV7(state, "TRACTOR_BEAM")).toEqual([]);
    expect(
      chooseNormalCommandV7(activeView(state)).candidates.some(
        (candidate) => candidate.command.kind === "TRACTOR_BEAM",
      ),
    ).toBe(false);
  });

  it("holds a badly wounded unit with a Wait, and it recovers at End Turn", () => {
    // A Fighter at 3 of 12 HP in its own territory, with an enemy far off.
    const state = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 7), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(2, 2) },
      ],
      { factions: ["ORIGINAL", "GOBLIN"] },
    );
    const fighter = unitAtV7(state, at(8, 7)).id;
    const wait: CommandV7 = { kind: "WAIT", unitId: fighter };
    expect(scoreCommandV7(activeView(state), wait).priority).toBe(930);
    const turn = policyTurn(state);
    expect(turn.commands).toContainEqual(wait);
    expect(
      turn.commands.filter(
        (command) =>
          "unitId" in command &&
          command.unitId === fighter &&
          command.kind !== "WAIT",
      ),
    ).toEqual([]);
    expect(idleRecoveryOfV7(turn.state, fighter)?.amount).toBe(4);
  });

  it("never fires the Moon Gun to a tile it could walk to", () => {
    const state = round3ArenaV7({
      kinds: ["MOON_GUN"],
      pieces: [{ seat: 0, role: "FIGHTER", at: GUN_V7 }],
    });
    const view = viewForV7(state, P1);
    const walks = new Set(
      queryPlayerCommandsV7(view).flatMap((command) =>
        command.kind === "MOVE" ? [key(command.path.at(-1) as CoordV7)] : [],
      ),
    );
    for (const candidate of chooseNormalCommandV7(view).candidates)
      if (candidate.command.kind === "FIRE_MOON_GUN")
        expect(walks.has(key(candidate.command.at))).toBe(false);
  });
});
