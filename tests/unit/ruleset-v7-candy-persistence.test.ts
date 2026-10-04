import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  UNIT_ROLE_IDS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  parseEventV7,
  parseGameStateV7,
  parseReplayJsonV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  runReplayV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { candyFieldV7 } from "../fixtures/v7-candy";
import {
  applyOkV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// The Candy revision (`pulp_wars-jdb.3`): persistence of the four Candy
// lists, the Showcase with a Candy seat, and the projection of the seven
// Candy events (docs/product/RULESET_7_CANDY.md sections 2.6, 12.14, 13, and
// 18).

const showcase: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 1,
  width: 16,
  height: 16,
  aiCount: 3,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["CANDY", "ORIGINAL", "UNDEAD", "GOBLIN"],
  mapType: "SHOWCASE",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  curiosities: false,
};

function projected(
  before: GameStateV7,
  after: GameStateV7,
  viewer: PlayerId,
  events: readonly DomainEventV7[],
  kind: string,
): readonly unknown[] {
  return projectEventsV7(before, after, viewer, events).events.filter(
    (event) => event.kind === kind,
  );
}

function moveCommand(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): CommandV7 {
  const unit = unitAtV7(state, from);
  const command = offeredV7(state, "MOVE").find(
    (candidate) =>
      candidate.kind === "MOVE" &&
      candidate.unitId === unit.id &&
      sameV7(candidate.path.at(-1) as CoordV7, to),
  );
  if (command === undefined) throw new Error("no Move to the tile");
  return command;
}

describe("Candy Showcase (section 2.6)", () => {
  it("gives a Candy seat the ten Candy units, every technology, and empty Candy lists", () => {
    const created = createPlayableGameV7(showcase);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    const candy = seatIdV7(state, 0);
    const own = state.units.filter((unit) => unit.ownerId === candy);
    expect(own.map((unit) => unit.role).sort()).toEqual(
      [...UNIT_ROLE_IDS_V7].sort(),
    );
    for (const unit of own)
      expect([unit.hp, unit.kills], unit.role).toEqual([
        effectiveRoleRuleV7(unit.role, "CANDY").maxHp,
        0,
      ]);
    expect([
      state.sugarRush,
      state.crumbs,
      state.splattedThisTurn,
      state.tossedThisTurn,
    ]).toEqual([[], [], [], []]);
    const player = state.players.find((entry) => entry.id === candy);
    expect(
      technologyCapabilitiesV7(player?.researchedTechs ?? [], "CANDY"),
    ).toMatchObject({ homeSweetHome: true, crumbsBite: 3 });
    // Every land unit may Rush on the first turn; every offer is accepted.
    const offered = queryPlayerCommandsV7(viewForV7(state, candy));
    const rushes = offered.filter((command) => command.kind === "SUGAR_RUSH");
    expect(rushes).toHaveLength(8);
    for (const command of offered) {
      const result = applyCommandV7(state, candy, command);
      expect(result.accepted, JSON.stringify(command)).toBe(true);
    }
    // The same board as any other faction in the seat.
    const human = createPlayableGameV7({
      ...showcase,
      factions: ["DWARF", "ORIGINAL", "UNDEAD", "GOBLIN"],
    });
    if (!human.ok) throw new Error(human.error.code);
    expect(state.board).toEqual(human.state.board);
    expect(state.units.map((unit) => [unit.id, unit.at, unit.role])).toEqual(
      human.state.units.map((unit) => [unit.id, unit.at, unit.role]),
    );
  });
});

describe("Candy persistence (section 13)", () => {
  it("round-trips non-empty Candy lists through parsing and hashing", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3), rush: "RUSHED" },
        { seat: 0, role: "KNIGHT", at: at(6, 3), rush: "CRASHED" },
        { seat: 0, role: "MARKSMAN", at: at(4, 3), hp: 6, tossed: true },
        { seat: 1, role: "GUARD", at: at(5, 1), splatted: true },
      ],
      {
        crumbs: [
          { at: at(4, 5), role: "CAPTAIN", turnsLeft: 2 },
          { at: at(6, 5), role: "CATAPULT", turnsLeft: 1 },
        ],
      },
    );
    const parsed = parseGameStateV7(JSON.parse(JSON.stringify(state)));
    expect(parsed).toEqual(state);
    expect(canonicalHash(parsed)).toBe(canonicalHash(state));
    for (const key of [
      "sugarRush",
      "crumbs",
      "splattedThisTurn",
      "tossedThisTurn",
    ] as const) {
      expect(state[key].length, key).toBeGreaterThan(0);
      expect(canonicalHash({ ...state, [key]: [] }), key).not.toBe(
        canonicalHash(state),
      );
    }
    // The public view carries the lists of visible units and explored tiles.
    const view = viewForV7(state, seatIdV7(state, 1));
    expect(view.sugarRush).toEqual(state.sugarRush);
    expect(view.splattedThisTurn).toEqual(state.splattedThisTurn);
    expect(view.tossedThisTurn).toEqual(state.tossedThisTurn);
    expect(view.crumbs.map((entry) => entry.at)).toEqual([at(4, 5), at(6, 5)]);
    // A viewer that has not explored a Crumbs tile does not see it, nor the
    // entries of units it does not see.
    const fogged = viewForV7(
      unexploreV7(state, 1, [at(4, 5), at(5, 3)]),
      seatIdV7(state, 1),
    );
    expect(fogged.crumbs.map((entry) => entry.at)).toEqual([at(6, 5)]);
    expect(fogged.sugarRush).toEqual([
      { unitId: unitAtV7(state, at(6, 3)).id, phase: "CRASHED" },
    ]);
  });

  it("round-trips a Showcase match through a Rush, a Crash, and a save, in replay and hashes", () => {
    const created = createPlayableGameV7(showcase);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay = createReplayV7(showcase);
    const candy = seatIdV7(state, 0);
    const kinds = new Set<string>();
    const play = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
        command,
      );
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      for (const event of result.events) {
        expect(parseEventV7(event).ok, event.kind).toBe(true);
        kinds.add(event.kind);
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    };
    const rushes = queryPlayerCommandsV7(viewForV7(state, candy)).filter(
      (command) => command.kind === "SUGAR_RUSH",
    );
    for (const command of rushes) play(command);
    expect(state.sugarRush).toHaveLength(8);
    // Save mid-Rush.
    const midSave = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-04T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(midSave))).toEqual({
      kind: "VALID",
      save: midSave,
    });
    play({ kind: "END_TURN" });
    expect(kinds.has("UNIT_SUGAR_RUSHED")).toBe(true);
    expect(kinds.has("UNITS_CRASHED")).toBe(true);
    // Home Sweet Home spared the units by the Candy centers; the rest Crash.
    expect(state.sugarRush.every((entry) => entry.phase === "CRASHED")).toBe(
      true,
    );
    for (let seat = 1; seat < 4; seat += 1) play({ kind: "END_TURN" });
    expect(state.turnOrder[state.activeSeatIndex]).toBe(candy);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const stateHash = canonicalHash(state);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-04T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    if (state.sugarRush.length > 0) {
      const tampered = JSON.parse(JSON.stringify(save)) as {
        state: Record<string, unknown>;
      };
      tampered.state.sugarRush = [];
      expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
    }
  });
});

describe("Candy event projection (section 12.14)", () => {
  it("projects a Sugar Rush and the Crash to viewers that see the unit", () => {
    const state = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const enemy = seatIdV7(state, 1);
    const command: CommandV7 = {
      kind: "SUGAR_RUSH",
      unitId: unitAtV7(state, at(5, 3)).id,
    };
    for (const [fog, seen] of [
      [[], 1],
      [[at(5, 3)], 0],
    ] as const) {
      const before = unexploreV7(state, 1, fog);
      const rushed = applyOkV7(before, activeIdV7(before), command);
      expect(
        projected(
          before,
          rushed.state,
          enemy,
          rushed.events,
          "UNIT_SUGAR_RUSHED",
        ),
      ).toHaveLength(seen);
      const ended = applyOkV7(rushed.state, activeIdV7(rushed.state), {
        kind: "END_TURN",
      });
      const crashes = projected(
        rushed.state,
        ended.state,
        enemy,
        ended.events,
        "UNITS_CRASHED",
      );
      expect(crashes).toHaveLength(seen);
      if (seen === 1)
        expect(crashes[0]).toMatchObject({
          crashedUnitIds: [command.unitId],
          sparedUnitIds: [],
        });
      // The owner always receives both.
      expect(
        projected(
          rushed.state,
          ended.state,
          activeIdV7(before),
          ended.events,
          "UNITS_CRASHED",
        ),
      ).toHaveLength(1);
    }
  });

  it("projects Crumbs left and stale Crumbs by explored tiles, like Graves", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 1 },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    for (const seat of [0, 1])
      expect(
        projected(
          state,
          run.state,
          seatIdV7(state, seat),
          run.events,
          "CRUMBS_LEFT",
        ),
        String(seat),
      ).toHaveLength(1);
    const stale = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      {
        crumbs: [
          { at: at(5, 2), role: "FIGHTER", turnsLeft: 1 },
          { at: at(5, 3), role: "FIGHTER", turnsLeft: 1 },
        ],
      },
    );
    const enemy = seatIdV7(stale, 1);
    const fogged = unexploreV7(stale, 1, [at(5, 2)]);
    const ended = applyOkV7(fogged, activeIdV7(fogged), { kind: "END_TURN" });
    expect(
      projected(fogged, ended.state, enemy, ended.events, "CRUMBS_STALE"),
    ).toEqual([
      expect.objectContaining({ kind: "CRUMBS_STALE", tiles: [at(5, 3)] }),
    ]);
    const blind = unexploreV7(stale, 1, [at(5, 2), at(5, 3)]);
    const unseen = applyOkV7(blind, activeIdV7(blind), { kind: "END_TURN" });
    expect(
      projected(blind, unseen.state, enemy, unseen.events, "CRUMBS_STALE"),
    ).toEqual([]);
  });

  it("keeps a Re-bake and a Sugar Toss owner-private", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3), hp: 6 },
        { seat: 0, role: "MARKSMAN", at: at(6, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { crumbs: [{ at: at(5, 4), role: "KNIGHT" }] },
    );
    const enemy = seatIdV7(state, 1);
    const owner = activeIdV7(state);
    const baked = playV7(state, {
      kind: "REBAKE",
      unitId: unitAtV7(state, at(5, 3)).id,
      at: at(5, 4),
    });
    expect(
      projected(state, baked.state, enemy, baked.events, "UNIT_REBAKED"),
    ).toEqual([]);
    expect(
      projected(state, baked.state, owner, baked.events, "UNIT_REBAKED"),
    ).toHaveLength(1);
    const tossed = playV7(state, {
      kind: "SUGAR_TOSS",
      unitId: unitAtV7(state, at(6, 3)).id,
      targetUnitId: unitAtV7(state, at(5, 3)).id,
    });
    expect(
      projected(state, tossed.state, enemy, tossed.events, "SUGAR_TOSSED"),
    ).toEqual([]);
    expect(
      projected(state, tossed.state, owner, tossed.events, "SUGAR_TOSSED"),
    ).toHaveLength(1);
  });

  it("projects eaten Crumbs to the Crumbs' owner even when the eater is hidden", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      { activeSeat: 1, crumbs: [{ at: at(5, 3), role: "KNIGHT" }] },
    );
    const candy = seatIdV7(state, 0);
    const eater = unitAtV7(state, at(5, 2));
    const command = moveCommand(state, at(5, 2), at(5, 3));
    const seen = applyOkV7(state, activeIdV7(state), command);
    expect(
      projected(state, seen.state, candy, seen.events, "CRUMBS_EATEN"),
    ).toEqual([
      {
        kind: "CRUMBS_EATEN",
        playerId: candy,
        at: at(5, 3),
        role: "KNIGHT",
        unitId: eater.id,
        damage: 3,
        shieldDamage: 0,
        dies: false,
      },
    ]);
    // The Candy seat has explored neither tile: it sees no eater, and still
    // learns that its Crumbs were eaten.
    const fogged = unexploreV7(state, 0, [at(5, 2), at(5, 3)]);
    const hidden = applyOkV7(fogged, activeIdV7(fogged), command);
    const events = projected(
      fogged,
      hidden.state,
      candy,
      hidden.events,
      "CRUMBS_EATEN",
    );
    expect(events).toEqual([
      {
        kind: "CRUMBS_EATEN",
        playerId: candy,
        at: at(5, 3),
        role: "KNIGHT",
        unitId: null,
        damage: null,
        shieldDamage: null,
        dies: null,
      },
    ]);
    // The eater's owner receives the full event.
    expect(
      projected(
        fogged,
        hidden.state,
        activeIdV7(fogged),
        hidden.events,
        "CRUMBS_EATEN",
      ),
    ).toMatchObject([{ unitId: eater.id, damage: 3 }]);
  });
});
