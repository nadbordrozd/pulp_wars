import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NormalPolicyWorkV7,
  chooseNormalCommandV7,
  chooseNormalCommandYieldingV7,
  chooseNormalTurnCommandV7,
  normalTurnClosureSlotsV7,
  projectPublicUnitForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  applyCommandV7,
  canonicalHash,
  canonicalJson,
  createInitialMapStateV7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  setupV7,
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

describe("ruleset-7 revision-4 Normal public policy", () => {
  it("keeps authority, reducer, map generation, and PRNG out of policy imports", () => {
    const source = readFileSync("src/ai/v7.ts", "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    expect(imports).toEqual([
      "../engine/model/ids",
      "../engine/rules/ruleset-v7",
      "../engine/v7/commands",
      "../engine/v7/events",
      "../engine/v7/query",
      "../engine/v7/types",
      "../engine/v7/spatial-economy",
      "../engine/v7/view",
    ]);
    expect(source).not.toMatch(
      /\bGameStateV7\b|applyCommandV7|createPlayableGameV7|estimateCombatV7/,
    );
    expect(
      imports.some((value) =>
        /map|random|reducer|state-schema/.test(value ?? ""),
      ),
    ).toBe(false);
  });

  it("classifies public commands deterministically and chooses marginal research", () => {
    const state = initialV7(0);
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    expect(queryPlayerCommandsV7(view)).toContainEqual({ kind: "END_TURN" });
    expect(decision.command).toEqual({ kind: "RESEARCH", tech: "DRILL" });
    expect(decision.candidates[0]?.score.priority).toBe(1060);
    expect(
      decision.candidates.some(({ command }) => command.kind === "WAIT"),
    ).toBe(false);
    expect(decision.prngDraws).toBe(0);
    for (const candidate of decision.candidates) {
      expect(candidate.tuple).toEqual([
        candidate.score.priority,
        candidate.score.strategicValue,
        candidate.score.immediateValue,
        candidate.score.futureValue,
        candidate.score.safetyValue,
        candidate.score.objectiveValue,
        ...candidate.score.deterministicTieBreak,
      ]);
      expect(candidate.tuple).toHaveLength(11);
    }
  });

  it("is byte-identical for equal public views with different concealed authority", () => {
    const first = initialV7(4);
    const hiddenIndex = first.board.tiles.findIndex(
      (tile) =>
        !first.players
          .find((player) => player.id === first.humanPlayerId)
          ?.explored.some((at) => same(at, tile.at)),
    );
    const hidden = first.board.tiles[hiddenIndex];
    if (hidden === undefined) throw new Error("Hidden tile missing");
    const second: GameStateV7 = {
      ...first,
      board: {
        ...first.board,
        tiles: first.board.tiles.map((tile, index) =>
          index === hiddenIndex
            ? {
                ...tile,
                terrain: tile.terrain === "MOUNTAIN" ? "GRASS" : "MOUNTAIN",
                resource: tile.resource === "FRUIT" ? "GAME" : "FRUIT",
              }
            : tile,
        ),
      },
    };
    const left = viewForV7(first, first.humanPlayerId);
    const right = viewForV7(second, second.humanPlayerId);
    expect(left).toEqual(right);
    expect(canonicalJson(chooseNormalCommandV7(left))).toBe(
      canonicalJson(chooseNormalCommandV7(right)),
    );
  });

  it("scores both stationary Horse Archer shots with standalone parity", () => {
    const state = horseArcherLine();
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    const attack = decision.candidates.find(
      (candidate) => candidate.command.kind === "ATTACK",
    );
    if (attack === undefined) throw new Error("Horse Archer attack missing");
    expect(scoreCommandV7(view, attack.command)).toEqual(attack.score);
    if (attack.command.kind !== "ATTACK")
      throw new Error("Horse Archer attack malformed");
    const preview = queryCombatPreviewV7(
      view,
      attack.command.unitId,
      attack.command.targetUnitId,
    );
    expect(preview).not.toBeNull();
    expect(attack.score.immediateValue).toBeGreaterThan(
      10 * (preview?.damageToDefender ?? 0) -
        8 * (preview?.damageToAttacker ?? 0),
    );
  });

  it("values two-shot attacks from a legal post-Move firing coordinate", () => {
    const state = horseArcherMoveLine();
    const view = viewForV7(state, state.humanPlayerId);
    const horseArcher = ownUnit(state, "HORSE_ARCHER");
    const move = required(
      queryPlayerCommandsV7(view).find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === horseArcher.id &&
          same(command.path.at(-1) ?? { x: -1, y: -1 }, { x: 3, y: 5 }),
      ),
      "Horse Archer firing-position Move missing",
    );
    const decision = chooseNormalCommandV7(view);
    const candidate = required(
      decision.candidates.find(
        (entry) => canonicalJson(entry.command) === canonicalJson(move),
      ),
      "Horse Archer Move score missing",
    );
    expect(scoreCommandV7(view, move)).toEqual(candidate.score);
    expect(candidate.score.immediateValue).toBeGreaterThan(0);
    expect(candidate.score.safetyValue).toBeLessThanOrEqual(0);
  });

  it("yields inside a dense Horse Archer search without changing the frozen result", async () => {
    const state = denseHorseArcher();
    const view = viewForV7(state, state.humanPlayerId);
    const sync = chooseNormalCommandV7(view);
    let clock = 0;
    let hostYields = 0;
    const yielded = await chooseNormalCommandYieldingV7(
      view,
      async () => {
        hostYields += 1;
      },
      () => (clock += 9),
    );
    expect(hostYields).toBeGreaterThan(1);
    expect(yielded.command).toEqual(sync.command);
    expect(yielded.candidates).toEqual(sync.candidates);

    clock = 0;
    const work = new NormalPolicyWorkV7(view, () => (clock += 9));
    expect(work.runSlice(8)).toBeNull();
  });

  it("preserves a fortified hostile defender's published stats for the second shot", () => {
    const state = fortifiedHorseArcherTarget();
    const view = viewForV7(state, state.humanPlayerId);
    const horseArcher = ownUnit(state, "HORSE_ARCHER");
    const target = state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId && unit.role === "FIGHTER",
    );
    if (target === undefined) throw new Error("Fortified target missing");
    const command = {
      kind: "ATTACK" as const,
      unitId: horseArcher.id,
      targetUnitId: target.id,
    };
    const first = queryCombatPreviewV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (first === null) throw new Error("First attack preview missing");
    const applied = applyCommandV7(state, state.humanPlayerId, command);
    if (!applied.accepted) throw new Error(applied.error.code);
    const afterFirst = viewForV7(applied.state, state.humanPlayerId);
    const second = queryCombatPreviewV7(
      afterFirst,
      command.unitId,
      command.targetUnitId,
    );
    if (second === null) throw new Error("Second attack preview missing");
    const publishedDefense = view.unitStats
      .find((entry) => entry.unitId === target.id)
      ?.stats.find((stat) => stat.id === "DEFENSE");
    expect(publishedDefense?.total).toEqual({ numerator: 4, denominator: 1 });
    expect(scoreCommandV7(view, command).immediateValue).toBe(
      10 * (first.damageToDefender + second.damageToDefender) -
        8 * (first.damageToAttacker + second.damageToAttacker) +
        20 * Number(first.defenderDies) +
        20 * Number(second.defenderDies) -
        16 * Number(first.attackerDies) -
        16 * Number(second.attackerDies),
    );
  });

  it("prepares the retained late public view incrementally with exact sync parity", () => {
    const source = JSON.parse(
      readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
    ) as PlayerViewV7;
    let clock = 0;
    let clockReads = 0;
    const work = new NormalPolicyWorkV7(structuredClone(source), () => {
      clockReads += 1;
      clock += 9;
      return clock;
    });
    expect(clockReads).toBe(0);

    let sliced = work.runSlice(8);
    expect(sliced).toBeNull();
    let slices = 1;
    while (sliced === null) {
      sliced = work.runSlice(8);
      slices += 1;
    }
    const sync = chooseNormalCommandV7(structuredClone(source));
    expect(slices).toBeGreaterThan(2_000);
    expect(sliced.command).toEqual({
      kind: "ATTACK",
      unitId: 19,
      targetUnitId: 34,
    });
    expect(canonicalHash(sliced)).toBe(
      "546f07462f3f476b869e0c8c73baaa56372ce891a0711f2033beb39969fd7e55",
    );
    expect(canonicalHash(sync)).toBe(canonicalHash(sliced));
    expect(sync).toEqual(sliced);
  }, 15_000);

  it("reprojects public Charge, Forest, and city stats like accepted movement", () => {
    let state = fixtureState([
      ["RAIDER", { x: 3, y: 3 }, true, 10],
      ["FIGHTER", { x: 6, y: 3 }, false, 10],
    ]);
    state = checkedV7({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, { x: 4, y: 3 })
            ? {
                ...tile,
                terrain: "GRASS",
                resource: null,
                improvement: null,
                site: null,
              }
            : same(tile.at, { x: 5, y: 3 })
              ? {
                  ...tile,
                  terrain: "FOREST",
                  resource: null,
                  improvement: null,
                  site: null,
                }
              : tile,
        ),
      },
    });
    const raider = ownUnit(state, "RAIDER");
    const move = {
      kind: "MOVE" as const,
      unitId: raider.id,
      path: [
        { x: 4, y: 3 },
        { x: 5, y: 3 },
      ],
    };
    const before = viewForV7(state, state.humanPlayerId);
    const projected = projectPublicUnitForPolicyV7(before, raider.id, {
      at: { x: 5, y: 3 },
      activation: {
        ...raider.activation,
        moved: true,
        movedPathLength: 2,
        handled: true,
      },
    });
    const applied = applyCommandV7(state, state.humanPlayerId, move);
    if (!applied.accepted) throw new Error(applied.error.code);
    const actual = viewForV7(applied.state, state.humanPlayerId);
    expect(combatTotals(projected, raider.id)).toEqual(
      combatTotals(actual, raider.id),
    );

    const cityState = fixtureState([]);
    const city = cityState.cities.find(
      (item) => item.ownerId === cityState.humanPlayerId,
    );
    if (city === undefined) throw new Error("Owned city missing");
    const adjacent = {
      x: city.at.x === 0 ? city.at.x + 1 : city.at.x - 1,
      y: city.at.y,
    };
    const fighterState = fixtureState([
      ["FIGHTER", adjacent, true, 10],
      ["FIGHTER", { x: 9, y: 9 }, false, 10],
    ]);
    const fighter = ownUnit(fighterState, "FIGHTER");
    const fighterBefore = viewForV7(fighterState, fighterState.humanPlayerId);
    const fighterMove = {
      kind: "MOVE" as const,
      unitId: fighter.id,
      path: [city.at],
    };
    const fighterApplied = applyCommandV7(
      fighterState,
      fighterState.humanPlayerId,
      fighterMove,
    );
    if (!fighterApplied.accepted) throw new Error(fighterApplied.error.code);
    const fighterProjected = projectPublicUnitForPolicyV7(
      fighterBefore,
      fighter.id,
      {
        at: city.at,
        activation: {
          ...fighter.activation,
          moved: true,
          movedPathLength: 1,
          handled: true,
        },
      },
    );
    expect(combatTotals(fighterProjected, fighter.id)).toEqual(
      combatTotals(
        viewForV7(fighterApplied.state, fighterState.humanPlayerId),
        fighter.id,
      ),
    );
  });

  it("prices a visible Raider corridor and recognizes a durable screen", () => {
    const exposed = fixtureState([
      ["RAIDER", { x: 3, y: 5 }, false, 10],
      ["MARKSMAN", { x: 7, y: 5 }, true, 10],
    ]);
    const marksman = ownUnit(exposed, "MARKSMAN");
    const move = {
      kind: "MOVE" as const,
      unitId: marksman.id,
      path: [{ x: 6, y: 5 }],
    };
    const danger = scoreCommandV7(
      viewForV7(exposed, exposed.humanPlayerId),
      move,
    ).safetyValue;
    const screened = fixtureState([
      ["RAIDER", { x: 3, y: 5 }, false, 10],
      ["GUARD", { x: 5, y: 5 }, true, 15],
      ["MARKSMAN", { x: 7, y: 5 }, true, 10],
    ]);
    const screenedMarksman = ownUnit(screened, "MARKSMAN");
    const protectedScore = scoreCommandV7(
      viewForV7(screened, screened.humanPlayerId),
      { ...move, unitId: screenedMarksman.id },
    ).safetyValue;
    expect(danger).toBeLessThan(0);
    expect(protectedScore).toBeGreaterThan(danger);
  });

  it("lets visible Saboteur risk change contextual training selection", () => {
    const base = exploredAllV7(allTechsV7(initialV7(13)));
    const city = base.cities.find(
      (item) => item.ownerId === base.humanPlayerId,
    );
    const enemy = base.players.find((item) => item.id !== base.humanPlayerId);
    if (city === undefined || enemy === undefined)
      throw new Error("Fixture missing");
    const saboteurAt = {
      x: city.at.x + 4 < base.board.width ? city.at.x + 4 : city.at.x - 4,
      y: city.at.y,
    };
    const concealed = fixtureState([["SABOTEUR", saboteurAt, false, 10]]);
    const saboteur = concealed.units.find((unit) => unit.role === "SABOTEUR");
    if (saboteur === undefined) throw new Error("Saboteur missing");
    const state = checkedV7({
      ...concealed,
      saboteurExposures: [
        {
          unitId: saboteur.id,
          anchorPlayerId: concealed.humanPlayerId,
          reason: "ATTACK",
          clearsAtAnchorNextEndTurn: true,
        },
      ],
    });
    const trainedRoles = (candidateState: GameStateV7) =>
      chooseNormalCommandV7(
        viewForV7(candidateState, candidateState.humanPlayerId),
      )
        .candidates.filter(
          (
            candidate,
          ): candidate is typeof candidate & {
            command: Extract<CommandV7, { kind: "TRAIN" }>;
          } => candidate.command.kind === "TRAIN",
        )
        .filter((candidate) => candidate.command.cityId === city.id)
        .map((candidate) => candidate.command.role);
    expect(trainedRoles(state)).toEqual(["SCOUT"]);
    expect(trainedRoles(concealed)).not.toEqual(["SCOUT"]);
  });

  it("sums each injured Catapult preview and public minimum healing", () => {
    const healthy = fixtureState([
      ["CATAPULT", { x: 3, y: 5 }, true, 10],
      ["CATAPULT", { x: 3, y: 6 }, true, 10],
      ["GUARD", { x: 5, y: 5 }, false, 12],
    ]);
    const injured = checkedV7({
      ...healthy,
      units: healthy.units.map((unit) =>
        unit.ownerId === healthy.humanPlayerId && unit.at.y === 6
          ? { ...unit, hp: 1 }
          : unit,
      ),
    });
    const strategic = (state: GameStateV7) => {
      const view = viewForV7(state, state.humanPlayerId);
      const catapult = view.units.find(
        (unit) => unit.ownerId === view.viewer.id && unit.at.y === 5,
      );
      const target = view.units.find((unit) => unit.ownerId !== view.viewer.id);
      if (catapult === undefined || target === undefined)
        throw new Error("Catapult fixture missing");
      const shots = view.units
        .filter((unit) => unit.ownerId === view.viewer.id)
        .map((unit) => queryCombatPreviewV7(view, unit.id, target.id))
        .filter((preview) => preview !== null);
      return {
        damage: shots.reduce(
          (total, preview) => total + preview.damageToDefender,
          0,
        ),
        score: scoreCommandV7(view, {
          kind: "ATTACK",
          unitId: catapult.id,
          targetUnitId: target.id,
        }).strategicValue,
      };
    };
    const healthyValue = strategic(healthy);
    const injuredValue = strategic(injured);
    expect(healthyValue.damage).toBeGreaterThan(injuredValue.damage);
    expect(healthyValue.score).toBeGreaterThan(injuredValue.score);
  });

  it("values Drill Spoils on the first capture of each specific hostile city", () => {
    const base = exploredAllV7(allTechsV7(initialV7(13)));
    const hostile = base.cities.find(
      (city) => city.ownerId !== base.humanPlayerId,
    );
    if (hostile === undefined) throw new Error("Hostile city missing");
    let state = fixtureState([["FIGHTER", hostile.at, true, 10]]);
    const actor = ownUnit(state, "FIGHTER");
    state = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === actor.id ? { ...unit, captureEligible: true } : unit,
      ),
    });
    const fresh = viewForV7(state, state.humanPlayerId);
    const command = { kind: "CAPTURE" as const, unitId: actor.id };
    const anotherCityClaimed = {
      ...fresh,
      viewer: {
        ...fresh.viewer,
        spoilsClaimedCityIds: [
          fresh.cities.find((city) => city.ownerId === fresh.viewer.id)?.id ??
            hostile.id,
        ],
      },
    };
    const thisCityClaimed = {
      ...fresh,
      viewer: { ...fresh.viewer, spoilsClaimedCityIds: [hostile.id] },
    };
    expect(scoreCommandV7(anotherCityClaimed, command).immediateValue).toBe(
      scoreCommandV7(fresh, command).immediateValue,
    );
    expect(scoreCommandV7(fresh, command).immediateValue).toBe(
      scoreCommandV7(thisCityClaimed, command).immediateValue + 2,
    );
  });

  it("distinguishes eliminating one rival from an actual match-ending capture", () => {
    const duelBase = exploredAllV7(allTechsV7(initialV7(13)));
    const duelTarget = duelBase.cities.find(
      (city) => city.ownerId !== duelBase.humanPlayerId,
    );
    if (duelTarget === undefined) throw new Error("Duel target missing");
    let duel = fixtureState([["FIGHTER", duelTarget.at, true, 10]]);
    const duelActor = ownUnit(duel, "FIGHTER");
    duel = checkedV7({
      ...duel,
      units: duel.units.map((unit) =>
        unit.id === duelActor.id ? { ...unit, captureEligible: true } : unit,
      ),
    });
    const duelCommand = { kind: "CAPTURE" as const, unitId: duelActor.id };
    expect(
      scoreCommandV7(viewForV7(duel, duel.humanPlayerId), duelCommand).priority,
    ).toBe(1400);
    const duelApplied = applyCommandV7(duel, duel.humanPlayerId, duelCommand);
    if (!duelApplied.accepted) throw new Error(duelApplied.error.code);
    expect(duelApplied.state.outcome?.kind).toBe("VICTORY");
    expect(
      duelApplied.events.some((event) => event.kind === "MATCH_ENDED"),
    ).toBe(true);

    const created = createInitialMapStateV7(setupV7(13, 2));
    if (!created.ok) throw new Error(created.error.code);
    const humanId = created.state.humanPlayerId;
    const activeSeatIndex = created.state.turnOrder.indexOf(humanId);
    const target = created.state.cities.find(
      (city) => city.ownerId !== humanId,
    );
    const actor = created.state.units.find((unit) => unit.ownerId === humanId);
    if (activeSeatIndex < 0 || target === undefined || actor === undefined)
      throw new Error("Multi-rival capture fixture missing");
    const staged = exploredAllV7(
      allTechsV7(
        checkedV7({
          ...created.state,
          activeSeatIndex,
          units: [
            {
              ...actor,
              at: target.at,
              captureEligible: true,
              activation: READY,
            },
          ],
          treasureChests: created.state.treasureChests.filter(
            (at) => !same(at, target.at),
          ),
        }),
      ),
    );
    const stagedActor = staged.units[0];
    if (stagedActor === undefined) throw new Error("Capture actor missing");
    const view = viewForV7(staged, humanId);
    const command = { kind: "CAPTURE" as const, unitId: stagedActor.id };
    expect(queryPlayerCommandsV7(view)).toContainEqual(command);
    expect(scoreCommandV7(view, command).priority).toBe(1360);
    const applied = applyCommandV7(staged, humanId, command);
    if (!applied.accepted) throw new Error(applied.error.code);
    expect(applied.state.outcome).toBeNull();
    expect(
      applied.events.some(
        (event) =>
          event.kind === "PLAYER_ELIMINATED" &&
          event.playerId === target.ownerId,
      ),
    ).toBe(true);
    expect(applied.events.some((event) => event.kind === "MATCH_ENDED")).toBe(
      false,
    );

    const attackingPlayerId = target.ownerId;
    const humanCity = created.state.cities.find(
      (city) => city.ownerId === humanId,
    );
    const attacker = created.state.units.find(
      (unit) => unit.ownerId === attackingPlayerId,
    );
    const attackerSeatIndex =
      created.state.turnOrder.indexOf(attackingPlayerId);
    if (
      humanCity === undefined ||
      attacker === undefined ||
      attackerSeatIndex < 0
    )
      throw new Error("Human-defeat capture fixture missing");
    const defeatState = allTechsV7(
      checkedV7({
        ...created.state,
        activeSeatIndex: attackerSeatIndex,
        players: created.state.players.map((player) =>
          player.id === attackingPlayerId
            ? {
                ...player,
                explored: created.state.board.tiles.map((tile) => tile.at),
              }
            : player,
        ),
        units: [
          {
            ...attacker,
            at: humanCity.at,
            captureEligible: true,
            activation: READY,
          },
        ],
        treasureChests: created.state.treasureChests.filter(
          (at) => !same(at, humanCity.at),
        ),
      }),
    );
    const defeatActor = defeatState.units[0];
    if (defeatActor === undefined) throw new Error("Defeat actor missing");
    const defeatCommand = {
      kind: "CAPTURE" as const,
      unitId: defeatActor.id,
    };
    const defeatView = viewForV7(defeatState, attackingPlayerId);
    expect(queryPlayerCommandsV7(defeatView)).toContainEqual(defeatCommand);
    expect(scoreCommandV7(defeatView, defeatCommand).priority).toBe(1400);
    const defeated = applyCommandV7(
      defeatState,
      attackingPlayerId,
      defeatCommand,
    );
    if (!defeated.accepted) throw new Error(defeated.error.code);
    expect(defeated.state.outcome?.kind).toBe("DEFEAT");
    expect(defeated.events.some((event) => event.kind === "MATCH_ENDED")).toBe(
      true,
    );
  });

  it("reserves every reward and End without large arrays", () => {
    const base = fixtureState([]);
    const city = base.cities.find(
      (item) => item.ownerId === base.humanPlayerId,
    );
    if (city === undefined) throw new Error("Owned city missing");
    const baseView = viewForV7(base, base.humanPlayerId);
    const high = {
      ...baseView,
      cities: baseView.cities.map((item) =>
        item.id === city.id ? { ...item, level: 1_000_000, rewards: [] } : item,
      ),
    };
    expect(normalTurnClosureSlotsV7(high)).toBe(1_000_000);
  });

  it("finishes early when a candidate would exceed prospective mandatory work", () => {
    const state = initialV7(0);
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toEqual({ kind: "RESEARCH", tech: "DRILL" });
    expect(chooseNormalTurnCommandV7(view, 127, 128, decision)).toEqual({
      kind: "END_TURN",
    });

    const killState = fixtureState([
      ["FIGHTER", { x: 3, y: 5 }, true, 10],
      ["FIGHTER", { x: 4, y: 5 }, false, 1],
    ]);
    const killView = viewForV7(killState, killState.humanPlayerId);
    const ordinaryDecision = chooseNormalCommandV7(killView);
    const attack = ordinaryDecision.candidates.find(
      (candidate) => candidate.command.kind === "ATTACK",
    );
    const end = ordinaryDecision.candidates.find(
      (candidate) => candidate.command.kind === "END_TURN",
    );
    if (attack === undefined || end === undefined)
      throw new Error("Kill budget candidates missing");
    const killDecision = {
      ...ordinaryDecision,
      command: attack.command,
      candidates: [attack, end],
    };
    expect(chooseNormalTurnCommandV7(killView, 127, 128, killDecision)).toEqual(
      {
        kind: "END_TURN",
      },
    );
  });

  it("chooses a safe reward when BOOM would cascade beyond the remaining cap", () => {
    const state = initialV7(0);
    const base = viewForV7(state, state.humanPlayerId);
    const city = base.cities.find((item) => item.ownerId === base.viewer.id);
    if (city === undefined) throw new Error("Owned city missing");
    const view = {
      ...base,
      cities: base.cities.map((item) =>
        item.id === city.id
          ? {
              ...item,
              level: 4,
              permanentPopulation: 13,
              economicPopulation: 0,
              population: 4,
              rewards: [
                { reachedLevel: 2, reward: "SURVEY" as const },
                { reachedLevel: 3, reward: "WALLS" as const },
              ],
            }
          : item,
      ),
      pendingChoices: [
        {
          kind: "CITY_REWARD" as const,
          cityId: city.id,
          reachedLevel: 4,
          candidates: ["EXPAND" as const, "BOOM" as const],
        },
      ],
    };
    const boom = {
      kind: "CHOOSE_CITY_REWARD" as const,
      cityId: city.id,
      reachedLevel: 4,
      reward: "BOOM" as const,
    };
    const decision = {
      difficulty: "NORMAL" as const,
      command: boom,
      candidates: [
        {
          command: boom,
          score: emptyScore(),
          tuple: [1],
        },
      ],
      prngDraws: 0 as const,
    };
    expect(normalTurnClosureSlotsV7(view)).toBe(2);
    expect(chooseNormalTurnCommandV7(view, 126, 128, decision)).toEqual({
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 4,
      reward: "EXPAND",
    });
  });
});

function horseArcherLine(): GameStateV7 {
  return fixtureState([
    ["HORSE_ARCHER", { x: 3, y: 5 }, true, 10],
    ["SCOUT", { x: 4, y: 4 }, true, 10],
    ["SCOUT", { x: 5, y: 5 }, false, 10],
  ]);
}

function horseArcherMoveLine(): GameStateV7 {
  return fixtureState([
    ["HORSE_ARCHER", { x: 1, y: 5 }, true, 10],
    ["SCOUT", { x: 4, y: 5 }, true, 10],
    ["GUARD", { x: 5, y: 4 }, false, 15],
    ["FIGHTER", { x: 5, y: 6 }, false, 10],
  ]);
}

function denseHorseArcher(): GameStateV7 {
  const specs: UnitSpec[] = [
    ["HORSE_ARCHER", { x: 5, y: 5 }, true, 10],
    ["SCOUT", { x: 5, y: 2 }, true, 10],
    ["SCOUT", { x: 8, y: 5 }, true, 10],
    ["SCOUT", { x: 5, y: 8 }, true, 10],
  ];
  for (const at of [
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 6, y: 3 },
    { x: 7, y: 3 },
    { x: 3, y: 4 },
    { x: 7, y: 4 },
    { x: 3, y: 5 },
    { x: 7, y: 6 },
    { x: 4, y: 7 },
    { x: 6, y: 7 },
  ] as const)
    specs.push(["FIGHTER", at, false, 10]);
  return fixtureState(specs);
}

function fortifiedHorseArcherTarget(): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7(13)));
  const city = base.cities.find((item) => item.ownerId !== base.humanPlayerId);
  if (city === undefined) throw new Error("Hostile city missing");
  const horseArcherAt =
    city.at.x >= 2
      ? { x: city.at.x - 2, y: city.at.y }
      : { x: city.at.x + 2, y: city.at.y };
  const scoutAt =
    city.at.y > 0
      ? { x: city.at.x, y: city.at.y - 1 }
      : { x: city.at.x, y: city.at.y + 1 };
  return fixtureState([
    ["HORSE_ARCHER", horseArcherAt, true, 10],
    ["SCOUT", scoutAt, true, 10],
    ["FIGHTER", city.at, false, 10],
  ]);
}

type UnitSpec = readonly [
  role: UnitRoleIdV7,
  at: CoordV7,
  own: boolean,
  hp: number,
];

function fixtureState(specs: readonly UnitSpec[]): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7(13)));
  const enemy = base.players.find((player) => player.id !== base.humanPlayerId);
  if (enemy === undefined) throw new Error("Enemy missing");
  const firstId = base.nextEntityId;
  const units = specs.map(([role, at, own, hp], index) => {
    const rule = effectiveRoleRuleV7(role);
    const ownerId = own ? base.humanPlayerId : enemy.id;
    return {
      id: (firstId + index) as UnitStateV7["id"],
      ownerId,
      homeCityId:
        base.cities.find((city) => city.ownerId === ownerId)?.id ?? null,
      role,
      at,
      hp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
      blackoutEligibleRound: role === "SABOTEUR" ? 1 : null,
    } satisfies UnitStateV7;
  });
  const occupied = new Set(units.map((unit) => key(unit.at)));
  return checkedV7({
    ...base,
    nextEntityId: firstId + units.length,
    treasureChests: base.treasureChests.filter((at) => !occupied.has(key(at))),
    units,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        occupied.has(key(tile.at))
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
            }
          : tile,
      ),
    },
  });
}

function ownUnit(state: GameStateV7, role: UnitRoleIdV7): UnitStateV7 {
  const unit = state.units.find(
    (item) => item.ownerId === state.humanPlayerId && item.role === role,
  );
  if (unit === undefined) throw new Error(`${role} missing`);
  return unit;
}

function emptyScore() {
  return {
    priority: 0,
    strategicValue: 0,
    immediateValue: 0,
    futureValue: 0,
    safetyValue: 0,
    objectiveValue: 0,
    deterministicTieBreak: [0, 0, 0, 0, 0] as const,
  };
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function combatTotals(
  view: ReturnType<typeof viewForV7>,
  unitId: UnitStateV7["id"],
) {
  return view.unitStats
    .find((item) => item.unitId === unitId)
    ?.stats.filter((stat) => stat.id === "ATTACK" || stat.id === "DEFENSE")
    .map((stat) => ({ id: stat.id, total: stat.total }));
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const key = (at: CoordV7) => `${at.y},${at.x}`;
