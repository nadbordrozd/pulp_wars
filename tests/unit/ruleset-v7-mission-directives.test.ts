import { describe, expect, it } from "vitest";
import {
  inspectNormalNavalPlanV7,
  inspectNormalTacticalFactsV7,
  type NormalAiDecisionV7,
  type ScoredAiCandidateV7,
} from "../../src/ai/v7";
import {
  activeMissionDirectiveV7,
  commandRelocationsV7,
  directivePlanForViewV7,
  guardGarrisonV7,
  leashReadyCommandsV7,
  validateMissionDirectivesV7,
  zoneContainsV7,
} from "../../src/ai/v7-directives";
import {
  MISSION_REGISTRY_V7,
  applyCommandV7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  queryAiReadyCommandsV7,
  randomState,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type PlayerId,
  type PlayerViewV7,
  type RectV7,
} from "../../src/engine/index";
import { proxyVariedDecisionV7, runAiMatchV7 } from "../../src/headless/v7";

// Mission directives (`pulp_wars-68k.3`, docs/product/CAMPAIGN.md sections
// 2.5, 7.1, 7.2, and 8.2): directive resolution and `untilRound`, the plan
// hook (RUSH, HOLD, GUARD, the RETURN job), the leash, the garrison choice,
// the naval plan gated on a forbidden Shorecraft, headless behaviour on the
// hidden fixtures TEST_RUSH, TEST_HOLD, and TEST_GUARD, and the headless
// proxy variation.

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

function setupOf(id: string): MatchSetupV7 {
  const setup = missionMatchSetupV7(mission(id));
  if (setup === null) throw new Error(`no ${id} setup`);
  return setup;
}

function playable(id: string): GameStateV7 {
  const created = createPlayableGameV7(setupOf(id));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

/** The fixture after seat 0 ends its first turn: the AI seat to act. */
function aiTurn(id: string, change?: (state: GameStateV7) => GameStateV7) {
  const first = playable(id);
  const human = first.players[0];
  if (human === undefined) throw new Error("no seat 0");
  const ended = applyCommandV7(first, human.id, { kind: "END_TURN" });
  if (!ended.accepted) throw new Error("END_TURN refused");
  const state = change === undefined ? ended.state : change(ended.state);
  const ai = state.players[1];
  if (ai === undefined) throw new Error("no seat 1");
  return { state, view: viewForV7(state, ai.id), aiId: ai.id };
}

/** Seat 1 has explored the whole board. */
function exploredAll(state: GameStateV7): GameStateV7 {
  const all: CoordV7[] = [];
  for (let y = 0; y < state.board.height; y += 1)
    for (let x = 0; x < state.board.width; x += 1) all.push({ x, y });
  return {
    ...state,
    players: state.players.map((player, seat) =>
      seat === 1 ? { ...player, explored: all } : player,
    ),
  };
}

/** The same view as an ordinary Dry Land match (no mission, no directive). */
function asSkirmish(view: PlayerViewV7): PlayerViewV7 {
  const setup = { ...view.setup, mapType: "DRY_LAND" } as {
    -readonly [K in keyof MatchSetupV7]: MatchSetupV7[K];
  };
  delete setup.mission;
  return { ...view, setup };
}

function zoneOf(id: string): readonly RectV7[] {
  const directive = mission(id).seats[1]?.directive;
  if (directive === undefined || !("zone" in directive))
    throw new Error(`${id} has no zone`);
  return directive.zone;
}

function jobs(view: PlayerViewV7) {
  return inspectNormalTacticalFactsV7(view).campaign;
}

function ownLand(view: PlayerViewV7) {
  return view.units.filter(
    (unit) => unit.ownerId === view.viewer.id && unit.form === "LAND",
  );
}

/** Replays a headless match and visits every accepted command. */
function replay(
  id: string,
  log: ReturnType<typeof runAiMatchV7>["commandLog"],
  visit: (state: GameStateV7, actor: PlayerId, command: CommandV7) => void,
): GameStateV7 {
  let state = playable(id);
  for (const record of log) {
    visit(state, record.playerId, record.command);
    const applied = applyCommandV7(state, record.playerId, record.command);
    if (!applied.accepted) throw new Error("replay refused");
    state = applied.state;
  }
  return state;
}

describe("directive resolution", () => {
  it("registers the three hidden fixtures with valid directives", () => {
    expect(mission("TEST_RUSH")).toMatchObject({ hidden: true, revision: 1 });
    expect(mission("TEST_HOLD")).toMatchObject({ hidden: true, revision: 1 });
    expect(mission("TEST_GUARD")).toMatchObject({ hidden: true, revision: 1 });
    for (const item of MISSION_REGISTRY_V7)
      expect(() => validateMissionDirectivesV7(item)).not.toThrow();
  });

  it("refuses malformed directives", () => {
    const base = mission("TEST_GUARD");
    const withDirective = (
      seat: number,
      directive: NonNullable<MissionDefinitionV7["seats"][number]["directive"]>,
    ): MissionDefinitionV7 => ({
      ...base,
      seats: base.seats.map((item, index) =>
        index === seat ? { ...item, directive } : item,
      ),
    });
    expect(() =>
      validateMissionDirectivesV7(withDirective(0, { kind: "RUSH" })),
    ).toThrow(/human seat/);
    expect(() =>
      validateMissionDirectivesV7(
        withDirective(1, { kind: "RUSH", untilRound: 1 }),
      ),
    ).toThrow(/untilRound/);
    expect(() =>
      validateMissionDirectivesV7(withDirective(1, { kind: "HOLD", zone: [] })),
    ).toThrow(/empty/);
    expect(() =>
      validateMissionDirectivesV7(
        withDirective(1, {
          kind: "HOLD",
          zone: [{ x0: 0, y0: 0, x1: 11, y1: 4 }],
        }),
      ),
    ).toThrow(/off the board/);
    expect(() =>
      validateMissionDirectivesV7(
        withDirective(1, {
          kind: "GUARD",
          zone: [{ x0: 4, y0: 4, x1: 6, y1: 6 }],
          garrison: 0,
        }),
      ),
    ).toThrow(/garrison/);
  });

  it("is NORMAL outside missions, for seat 0, and without a directive", () => {
    const { state, view } = aiTurn("TEST_HOLD");
    expect(activeMissionDirectiveV7(view)?.kind).toBe("HOLD");
    expect(activeMissionDirectiveV7(asSkirmish(view))).toBeNull();
    expect(directivePlanForViewV7(asSkirmish(view))).toBeNull();
    const human = state.players[0];
    if (human === undefined) throw new Error("no seat 0");
    expect(activeMissionDirectiveV7(viewForV7(state, human.id))).toBeNull();
    // TEST_GROUNDS has no directive: its AI seat plays NORMAL.
    const grounds = missionMatchSetupV7(mission("TEST_GROUNDS"));
    if (grounds === null) throw new Error("no TEST_GROUNDS setup");
    const created = createPlayableGameV7(grounds);
    if (!created.ok) throw new Error(created.error.code);
    const undead = created.state.players[1];
    if (undead === undefined) throw new Error("no seat 1");
    const groundsView = viewForV7(created.state, undead.id);
    expect(directivePlanForViewV7(groundsView)).toBeNull();
    // With NORMAL the leash is the identity: the very same array.
    const ready = queryAiReadyCommandsV7(groundsView);
    expect(leashReadyCommandsV7(groundsView, null, ready)).toBe(ready);
  });

  it("switches to NORMAL exactly at untilRound", () => {
    const { view } = aiTurn("TEST_HOLD");
    expect(activeMissionDirectiveV7({ ...view, round: 7 })?.kind).toBe("HOLD");
    expect(activeMissionDirectiveV7({ ...view, round: 8 })).toBeNull();
    expect(directivePlanForViewV7({ ...view, round: 8 })).toBeNull();
    expect(directivePlanForViewV7({ ...view, round: 30 })).toBeNull();
  });
});

describe("the plan hook", () => {
  it("RUSH: every free unit attacks at once, no village or scout job", () => {
    const { view } = aiTurn("TEST_RUSH", exploredAll);
    const rush = jobs(view);
    const normal = jobs(asSkirmish(view));
    // NORMAL sends capturers to the two villages and waits for a wave.
    expect(normal.assignments.some((item) => item.job === "VILLAGE")).toBe(
      true,
    );
    expect(rush.atWar).toBe(true);
    expect(rush.assignments).toHaveLength(ownLand(view).length);
    for (const item of rush.assignments)
      expect(item).toMatchObject({ job: "ATTACK", at: { x: 2, y: 8 } });
    expect(rush.targets).toEqual([
      expect.objectContaining({ needed: 1, push: true }),
    ]);
  });

  it("RUSH plays NORMAL while no hostile city is known", () => {
    // Forget the human capital: seat 1 knows only its own corner.
    const { view } = aiTurn("TEST_RUSH", (state) => ({
      ...state,
      players: state.players.map((player, seat) =>
        seat === 1
          ? {
              ...player,
              explored: player.explored.filter((at) => at.y <= 5),
            }
          : player,
      ),
    }));
    expect(jobs(view).atWar).toBe(false);
    expect(jobs(view)).toEqual(jobs(asSkirmish(view)));
  });

  it("HOLD: every job target lies in the zone; a unit outside returns", () => {
    const zone = zoneOf("TEST_HOLD");
    const { view } = aiTurn("TEST_HOLD", exploredAll);
    const normal = jobs(asSkirmish(view));
    expect(
      normal.assignments.some((item) => !zoneContainsV7(zone, item.at)),
    ).toBe(true);
    const hold = jobs(view);
    expect(hold.assignments.length).toBeGreaterThan(0);
    for (const item of hold.assignments)
      expect(zoneContainsV7(zone, item.at)).toBe(true);
    expect(hold.assignments.some((item) => item.job === "ATTACK")).toBe(false);
    const outside = ownLand(view).filter(
      (unit) => !zoneContainsV7(zone, unit.at),
    );
    expect(outside).toHaveLength(1);
    expect(
      hold.assignments.find((item) => item.unitId === outside[0]?.id),
    ).toMatchObject({ job: "RETURN", at: { x: 8, y: 4 } });
  });

  it("GUARD: the garrison returns or stays, the rest plays NORMAL", () => {
    const zone = zoneOf("TEST_GUARD");
    const { view } = aiTurn("TEST_GUARD", exploredAll);
    const garrison = guardGarrisonV7(view, zone, 2);
    const units = ownLand(view);
    const inside = units.filter((unit) => zoneContainsV7(zone, unit.at));
    expect(inside).toHaveLength(1);
    expect(garrison[0]).toBe(inside[0]?.id);
    // The next is the unit at (7, 3), one step from the zone.
    expect(units.find((unit) => unit.id === garrison[1])?.at).toEqual({
      x: 7,
      y: 3,
    });
    const guard = jobs(view);
    const jobOf = (id: number) =>
      guard.assignments.find((item) => item.unitId === id);
    // The unit inside stands on the gate city's center: it keeps that
    // objective (no job) like any center garrison; it would otherwise stay.
    expect(jobOf(garrison[0] as number)).toBeUndefined();
    expect(jobOf(garrison[1] as number)).toMatchObject({
      job: "RETURN",
      at: { x: 6, y: 4 },
    });
    for (const item of guard.assignments)
      if (!garrison.includes(item.unitId)) expect(item.job).not.toBe("RETURN");
    expect(guard.assignments.some((item) => item.job === "ATTACK")).toBe(true);
  });

  it("chooses the garrison: inside first, then by route steps, then by ID", () => {
    const zone = zoneOf("TEST_GUARD");
    const ids = (state: GameStateV7) =>
      state.units
        .filter((unit) => unit.ownerId === state.players[1]?.id)
        .map((unit) => unit.id)
        .sort((left, right) => left - right);
    const place = (spots: readonly CoordV7[]) =>
      aiTurn("TEST_GUARD", (state) => {
        const own = ids(state);
        return exploredAll({
          ...state,
          units: state.units.map((unit) => {
            const index = own.indexOf(unit.id);
            const at = spots[index];
            return at === undefined ? unit : { ...unit, at };
          }),
        });
      });
    // Unit order by ID: a, b, c, d. Nobody inside: b and c are one step
    // away (the ID breaks the tie), a and d farther.
    const apart = place([
      { x: 8, y: 1 },
      { x: 7, y: 3 },
      { x: 3, y: 7 },
      { x: 9, y: 8 },
    ]);
    const own = ids(apart.state);
    expect(guardGarrisonV7(apart.view, zone, 2)).toEqual([own[1], own[2]]);
    // d steps inside: it comes first, then b.
    const inside = place([
      { x: 8, y: 1 },
      { x: 7, y: 3 },
      { x: 3, y: 7 },
      { x: 6, y: 6 },
    ]);
    expect(guardGarrisonV7(inside.view, zone, 2)).toEqual([own[3], own[1]]);
    // Fewer units than the garrison: all of them.
    expect(guardGarrisonV7(inside.view, zone, 9)).toHaveLength(4);
  });
});

describe("the leash", () => {
  it("lists the units a command relocates", () => {
    const at = { x: 1, y: 1 };
    const u = unitId(5);
    const v = unitId(6);
    expect(
      commandRelocationsV7({ kind: "MOVE", unitId: u, path: [at] }),
    ).toEqual([{ unitId: u, to: at }]);
    expect(commandRelocationsV7({ kind: "DISEMBARK", unitId: u, at })).toEqual([
      { unitId: u, to: at },
    ]);
    expect(
      commandRelocationsV7({
        kind: "TUNNEL",
        unitId: u,
        to: at,
        rider: { unitId: v, to: { x: 2, y: 1 } },
      }),
    ).toEqual([
      { unitId: u, to: at },
      { unitId: v, to: { x: 2, y: 1 } },
    ]);
    expect(
      commandRelocationsV7({
        kind: "BEAM_DOWN",
        unitId: u,
        passengerUnitId: v,
        to: at,
      }),
    ).toEqual([{ unitId: v, to: at }]);
    expect(
      commandRelocationsV7({
        kind: "BOMB_RUN",
        unitId: u,
        targetUnitId: v,
        to: at,
      }),
    ).toEqual([{ unitId: u, to: at }]);
    for (const command of [
      { kind: "ATTACK", unitId: u, targetUnitId: v },
      { kind: "END_TURN" },
      { kind: "RESEARCH", tech: "SCOUTING" },
      { kind: "CAPTURE", unitId: u },
    ] as const satisfies readonly CommandV7[])
      expect(commandRelocationsV7(command)).toEqual([]);
  });

  it("removes only relocations out of the zone; never END_TURN or a city command", () => {
    const zone = zoneOf("TEST_HOLD");
    const { view } = aiTurn("TEST_HOLD", exploredAll);
    const plan = directivePlanForViewV7(view);
    if (plan === null) throw new Error("no HOLD plan");
    const ready = queryAiReadyCommandsV7(view);
    const kept = leashReadyCommandsV7(view, plan, ready);
    expect(kept.length).toBeLessThan(ready.length);
    expect(kept.some((item) => item.command.kind === "END_TURN")).toBe(true);
    const unitsById = new Map(view.units.map((unit) => [unit.id, unit]));
    for (const item of ready) {
      const relocations = commandRelocationsV7(item.command);
      const leashedMoves = relocations.filter((move) =>
        plan.leashed.has(move.unitId),
      );
      if (!kept.includes(item)) {
        // Removed: a leashed unit's relocation that ends outside the zone.
        expect(leashedMoves.length).toBeGreaterThan(0);
        expect(
          leashedMoves.some((move) => !zoneContainsV7(zone, move.to)),
        ).toBe(true);
        continue;
      }
      for (const move of leashedMoves) {
        const unit = unitsById.get(move.unitId);
        if (unit !== undefined && zoneContainsV7(zone, unit.at))
          expect(zoneContainsV7(zone, move.to)).toBe(true);
      }
    }
    // The unit outside keeps only the steps toward the zone.
    const outside = ownLand(view).find(
      (unit) => !zoneContainsV7(zone, unit.at),
    );
    const steps = kept.flatMap((item) =>
      item.command.kind === "MOVE" && item.command.unitId === outside?.id
        ? [item.command.path.at(-1)]
        : [],
    );
    expect(steps.length).toBeGreaterThan(0);
    for (const to of steps) expect(to?.y).toBe(5);
  });

  it("leaves a fully boxed-in seat its End Turn and city commands", () => {
    // Every own unit stands outside a one-tile zone it cannot reach.
    const { view } = aiTurn("TEST_HOLD", exploredAll);
    const plan = directivePlanForViewV7(view);
    if (plan === null || plan.campaign.kind === "RUSH")
      throw new Error("no HOLD plan");
    const ready = queryAiReadyCommandsV7(view);
    const boxed = leashReadyCommandsV7(
      view,
      {
        ...plan,
        campaign: { ...plan.campaign, inZone: () => false },
        directive: { kind: "HOLD", zone: [{ x0: 0, y0: 0, x1: 0, y1: 0 }] },
      },
      ready,
    );
    expect(boxed.some((item) => item.command.kind === "END_TURN")).toBe(true);
    for (const item of ready)
      if (commandRelocationsV7(item.command).length === 0)
        expect(boxed).toContain(item);
  });
});

describe("the naval plan", () => {
  it("is inactive while Shorecraft is forbidden, even on a board with water", () => {
    // TEST_GROUNDS has water and forbids the Naval branch.
    const grounds = missionMatchSetupV7(mission("TEST_GROUNDS"));
    if (grounds === null) throw new Error("no TEST_GROUNDS setup");
    const created = createPlayableGameV7(grounds);
    if (!created.ok) throw new Error(created.error.code);
    const [human, undead] = created.state.players;
    if (human === undefined || undead === undefined) throw new Error("seats");
    const ended = applyCommandV7(created.state, human.id, { kind: "END_TURN" });
    if (!ended.accepted) throw new Error("END_TURN refused");
    const view = viewForV7(ended.state, undead.id);
    expect(inspectNormalNavalPlanV7(view)).toMatchObject({
      active: false,
      reserveCoins: 0,
    });
    // The same position on a map type without the rule plans a crossing
    // and saves for Shorecraft.
    const open = asSkirmish(view);
    const crossing = inspectNormalNavalPlanV7({
      ...open,
      setup: { ...open.setup, mapType: "CONTINENTS" },
    });
    expect(crossing.active).toBe(true);
    expect(crossing.reserveCoins).toBeGreaterThan(0);
  });
});

describe("directives in headless play", () => {
  it(
    "RUSH attacks at once and never takes a village job",
    { timeout: 120_000 },
    () => {
      const result = runAiMatchV7(setupOf("TEST_RUSH"), { maxRounds: 10 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      let firstAttack: number | null = null;
      const aiJobs: string[] = [];
      replay("TEST_RUSH", result.commandLog, (state, actor, command) => {
        if (actor !== state.players[1]?.id) return;
        if (command.kind === "ATTACK") firstAttack ??= state.round;
        if (state.round >= 2 && state.round <= 4)
          for (const item of jobs(viewForV7(state, actor)).assignments)
            aiJobs.push(item.job);
      });
      expect(firstAttack).not.toBeNull();
      expect(firstAttack).toBeLessThanOrEqual(4);
      expect(aiJobs.length).toBeGreaterThan(0);
      expect(new Set(aiJobs)).toEqual(new Set(["ATTACK"]));
    },
  );

  it(
    "HOLD never leaves its zone before untilRound, then plays NORMAL",
    { timeout: 120_000 },
    () => {
      const zone = zoneOf("TEST_HOLD");
      const result = runAiMatchV7(setupOf("TEST_HOLD"), { maxRounds: 12 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      let leftAfter: number | null = null;
      let decisions = 0;
      let normalDecisions = 0;
      replay("TEST_HOLD", result.commandLog, (state, actor, command) => {
        if (actor !== state.players[1]?.id) return;
        const view = viewForV7(state, actor);
        if (state.round < 8) {
          decisions += 1;
          // The policy only ever picks a leashed command.
          const plan = directivePlanForViewV7(view);
          const ready = leashReadyCommandsV7(
            view,
            plan,
            queryAiReadyCommandsV7(view),
          );
          expect(ready.some((item) => item.command.kind === "END_TURN")).toBe(
            true,
          );
          expect(
            ready.some(
              (item) =>
                JSON.stringify(item.command) === JSON.stringify(command),
            ),
          ).toBe(true);
          // A unit inside the zone never ends a relocation outside it.
          for (const move of commandRelocationsV7(command)) {
            const unit = view.units.find((item) => item.id === move.unitId);
            if (unit !== undefined && zoneContainsV7(zone, unit.at))
              expect(zoneContainsV7(zone, move.to)).toBe(true);
          }
        } else {
          // From `untilRound` on the seat has no directive plan: its policy
          // is exactly the policy without directives.
          normalDecisions += 1;
          expect(directivePlanForViewV7(view)).toBeNull();
          if (
            command.kind === "END_TURN" &&
            ownLand(view).some((unit) => !zoneContainsV7(zone, unit.at))
          )
            leftAfter ??= state.round;
        }
      });
      expect(decisions).toBeGreaterThan(10);
      expect(normalDecisions).toBeGreaterThan(10);
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): in this match the Human seat now
      // wins the fight inside the zone by round 13 (the retaliation of the
      // Undead defenders no longer uses their cover), so the Undead units
      // never get out; before, they left the zone in round 8 or later. A
      // unit that does leave still leaves only from round 8.
      if (leftAfter !== null) expect(leftAfter).toBeGreaterThanOrEqual(8);
    },
  );

  it(
    "GUARD keeps its garrison in the zone at every End Turn",
    { timeout: 120_000 },
    () => {
      const zone = zoneOf("TEST_GUARD");
      const result = runAiMatchV7(setupOf("TEST_GUARD"), { maxRounds: 13 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      let checks = 0;
      let roamed = false;
      replay("TEST_GUARD", result.commandLog, (state, actor, command) => {
        if (actor !== state.players[1]?.id || command.kind !== "END_TURN")
          return;
        const land = ownLand(viewForV7(state, actor));
        const inside = land.filter((unit) => zoneContainsV7(zone, unit.at));
        expect(inside.length).toBeGreaterThanOrEqual(Math.min(2, land.length));
        if (land.length > inside.length) roamed = true;
        checks += 1;
      });
      expect(checks).toBeGreaterThan(5);
      // The rest of the army does not stay home.
      expect(roamed).toBe(true);
    },
  );
});

describe("proxy variation", () => {
  const candidate = (
    command: CommandV7,
    priority: number,
  ): ScoredAiCandidateV7 => ({
    command,
    score: {
      priority,
      strategicValue: 0,
      immediateValue: 0,
      futureValue: 0,
      safetyValue: 0,
      objectiveValue: 0,
      deterministicTieBreak: [0, 0, 0, 0, 0],
    },
    tuple: [priority],
  });
  const decision = (
    candidates: readonly ScoredAiCandidateV7[],
  ): NormalAiDecisionV7 => ({
    difficulty: "NORMAL",
    candidates,
    command: candidates[0]?.command ?? null,
    prngDraws: 0,
  });
  const move = (x: number): CommandV7 => ({
    kind: "MOVE",
    unitId: unitId(2),
    path: [{ x, y: 0 }],
  });

  it("substitutes the second or third best of the band, never END_TURN", () => {
    const band = decision([
      candidate(move(1), 700),
      candidate({ kind: "END_TURN" }, 700),
      candidate(move(2), 700),
      candidate(move(3), 700),
      candidate(move(4), 600),
    ]);
    const picked = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const varied = proxyVariedDecisionV7(band, randomState(seed), 1);
      expect(varied.decision.command).toEqual(
        varied.decision.candidates[0]?.command,
      );
      expect(varied.decision.candidates).toHaveLength(5);
      picked.add(JSON.stringify(varied.decision.command));
    }
    expect(picked).toEqual(
      new Set([JSON.stringify(move(2)), JSON.stringify(move(3))]),
    );
    // Rate 0 never substitutes; an END_TURN best is never replaced; a best
    // alone in its band stays.
    expect(proxyVariedDecisionV7(band, randomState(1), 0).decision).toBe(band);
    const ending = decision([
      candidate({ kind: "END_TURN" }, 0),
      candidate(move(1), 0),
    ]);
    expect(proxyVariedDecisionV7(ending, randomState(1), 1).decision).toBe(
      ending,
    );
    const alone = decision([candidate(move(1), 900), candidate(move(2), 700)]);
    expect(proxyVariedDecisionV7(alone, randomState(1), 1).decision).toBe(
      alone,
    );
  });

  it(
    "is deterministic per seed, leaves the match PRNG alone, and plays legal commands",
    { timeout: 180_000 },
    () => {
      const setup = setupOf("TEST_RUSH");
      const plain = runAiMatchV7(setup, { maxRounds: 6 });
      const zero = runAiMatchV7(setup, {
        maxRounds: 6,
        proxyVariation: { seed: 3, rate: 0 },
      });
      expect(zero.metrics.commandHash).toBe(plain.metrics.commandHash);
      const hashes = new Set<string>();
      for (const seed of [1, 2, 3]) {
        const first = runAiMatchV7(setup, {
          maxRounds: 6,
          proxyVariation: { seed, rate: 0.5 },
        });
        const again = runAiMatchV7(setup, {
          maxRounds: 6,
          proxyVariation: { seed, rate: 0.5 },
        });
        expect(first.errors).toEqual([]);
        expect(first.stalls).toEqual([]);
        expect(again.metrics.commandHash).toBe(first.metrics.commandHash);
        hashes.add(first.metrics.commandHash);
        // The match PRNG is untouched by the proxy stream.
        expect(first.metrics.postGenerationPrngHash).toBe(
          plain.metrics.postGenerationPrngHash,
        );
      }
      hashes.add(plain.metrics.commandHash);
      expect(hashes.size).toBeGreaterThan(1);
      expect(() =>
        runAiMatchV7(setup, {
          maxRounds: 1,
          proxyVariation: { seed: 1, rate: 1.5 },
        }),
      ).toThrow(RangeError);
    },
  );
});
