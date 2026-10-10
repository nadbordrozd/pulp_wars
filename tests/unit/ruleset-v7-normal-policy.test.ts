import { readFileSync } from "node:fs";
import {
  RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION,
  upgradeRetainedPublicViewV7,
} from "../../scripts/ruleset-v7-late-public-view-contract";
import { describe, expect, it } from "vitest";
import {
  NormalPolicyWorkV7,
  chooseNormalCommandV7,
  chooseNormalCommandYieldingV7,
  chooseNormalTurnCommandV7,
  inspectNormalTacticalFactsV7,
  normalTurnClosureSlotsV7,
  projectPublicUnitForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  applyCommandV7,
  canonicalHash,
  canonicalJson,
  cityId,
  createInitialMapStateV7,
  createPublicPlanningWorkV7,
  effectiveRoleRuleV7,
  MARKET_INCOME_CAP_V7,
  previewEconomicV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryPublicPlannedImprovementV7,
  queryPublicRedevelopmentChangesImprovementV7,
  scorePublicSpatialPlanV7,
  unitId,
  viewForV7,
  type CoordV7,
  type CommandV7,
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
  richV7,
  setupV7,
} from "../fixtures/v7-builders";
import {
  withRevision12CandidateOrdinalsV7,
  withRevision12DecisionOrdinalsV7,
} from "../fixtures/v7-revision12-command-ordinals";

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

describe("ruleset-7 revision-4 Normal public policy", () => {
  it("keeps authority, reducer, map generation, and PRNG out of policy imports", () => {
    const source = readFileSync("src/ai/v7.ts", "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    expect(imports).toEqual([
      "../engine/model/ids",
      "../engine/rules/ruleset-v7",
      // The Candy army seat (`pulp_wars-jdb.13`): the Toothache of a
      // projected blow, a Stuck unit's reach, and Sticky Toffee (four pure
      // rule helpers over public lists).
      "../engine/v7/candy-abilities",
      "../engine/v7/commands",
      "../engine/v7/dwarf",
      // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the Cracked
      // Defense of a unit a Stegosaurus has shot (two pure rule helpers).
      "../engine/v7/ninth-unit",
      // Tuning 3: `publicUnitHasTerrainCoverV7` (a pure public-view read).
      "../engine/v7/units",
      "../engine/v7/economy",
      // pulp_wars-68k.3: the match's forbidden technologies (from the setup).
      "../engine/v7/forbidden-technologies",
      "../engine/v7/events",
      "../engine/v7/ice-folk",
      "../engine/v7/movement",
      // The giants' signatures (`pulp_wars-w49.31`): whether a blow is a
      // Siege Hammer's, and the Glacial Smash threshold (two pure rule
      // helpers over the registry).
      "../engine/v7/giants",
      "../engine/v7/query",
      "../engine/v7/types",
      "../engine/v7/spatial-economy",
      "../engine/v7/view",
      // Tuning 5 (`pulp_wars-w49.4`): army play (numbers and composition).
      "./v7-army",
      "./v7-campaign",
      "./v7-endgame",
      // pulp_wars-68k.6: the siege of a single-file front (public view only).
      "./v7-chokepoint",
      "./v7-goblin",
      "./v7-dinosaur",
      "./v7-martian",
      "./v7-ice-folk",
      "./v7-dwarf",
      // pulp_wars-w49.17: the ninth unit's positional values (public view
      // only).
      "./v7-ninth-unit",
      // pulp_wars-5ti.4: the naval branch of the seafaring seats (public
      // view and previews only).
      "./v7-naval",
      // pulp_wars-w49.31: the giants' signatures (public view, previews,
      // and the engine's public legality helpers only).
      "./v7-giants",
      // pulp_wars-jdb.4: the Candy policy (public view and previews only).
      "./v7-candy",
      // pulp_wars-737.4: map curiosities (public view and previews only).
      "./v7-curiosities",
      // pulp_wars-68k.3: mission directives (read from the public setup).
      "./v7-directives",
      "./v7-opening",
      "./v7-undead",
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

  it("classifies public commands deterministically and chooses empty-center training", () => {
    const source = pastFreeOpenerV7(initialV7(0));
    const city = required(
      source.cities.find(
        (candidate) => candidate.ownerId === source.humanPlayerId,
      ),
      "training city missing",
    );
    const resident = required(
      source.units.find((unit) => unit.ownerId === source.humanPlayerId),
      "training resident missing",
    );
    const destination = required(
      source.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          !source.units.some(
            (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
          ),
      ),
      "training destination missing",
    );
    const state = checkedV7({
      ...source,
      units: source.units.map((unit) =>
        unit.id === resident.id ? { ...unit, at: destination.at } : unit,
      ),
    });
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    expect(queryPlayerCommandsV7(view)).toContainEqual({ kind: "END_TURN" });
    expect(
      view.units.some(
        (unit) => unit.at.x === city.at.x && unit.at.y === city.at.y,
      ),
    ).toBe(false);
    expect(decision.command).toEqual({
      kind: "TRAIN",
      cityId: cityId(1),
      role: "FIGHTER",
    });
    // Tuning 6 (`pulp_wars-w49.6`): a Human seat with fewer than three
    // cities trains its first units as if alert (1215; 1080 before).
    expect(decision.candidates[0]?.score.priority).toBe(1215);
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

  it("rejects identical redevelopment rebuilds with cold/incremental parity", () => {
    const cycle = redevelopmentReplacementView("MINE");
    const command = { kind: "REDEVELOP", at: cycle.target } as const;
    expect(scorePublicSpatialPlanV7(cycle.view, command)).toBeGreaterThan(0);
    expect(
      queryPublicRedevelopmentChangesImprovementV7(cycle.view, command),
    ).toBe(false);

    const prepared = redevelopmentReplacementView("MINE").view;
    const commands = queryPlayerCommandsV7(prepared);
    const work = createPublicPlanningWorkV7(prepared, commands);
    let progress = work.advance(1);
    while (!progress.done) progress = work.advance(1);
    expect(
      queryPublicRedevelopmentChangesImprovementV7(prepared, command),
    ).toBe(false);
    expect(
      chooseNormalCommandV7(prepared).candidates.some(
        (candidate) =>
          canonicalJson(candidate.command) === canonicalJson(command),
      ),
    ).toBe(false);

    const speculative = redevelopmentReplacementView("SAWMILL");
    expect(scorePublicSpatialPlanV7(speculative.view, command)).toBeGreaterThan(
      0,
    );
    expect(
      queryPublicRedevelopmentChangesImprovementV7(speculative.view, command),
    ).toBe(true);
    expect(
      chooseNormalCommandV7(speculative.view).candidates.some(
        (candidate) =>
          canonicalJson(candidate.command) === canonicalJson(command),
      ),
    ).toBe(false);
  });

  it("preserves an established Workshop when the planned replacement is unavailable, while retaining a useful basic redevelopment", () => {
    const workshop = redevelopmentWorkshopChurnState();
    const workshopView = viewForV7(
      workshop.state,
      workshop.state.humanPlayerId,
    );
    const demolishWorkshop = {
      kind: "REDEVELOP" as const,
      at: workshop.target,
    };
    expect(queryPlayerCommandsV7(workshopView)).toContainEqual(
      demolishWorkshop,
    );
    expect(
      scorePublicSpatialPlanV7(workshopView, demolishWorkshop),
    ).toBeGreaterThan(0);
    expect(
      queryPublicRedevelopmentChangesImprovementV7(
        workshopView,
        demolishWorkshop,
      ),
    ).toBe(true);

    const cold = chooseNormalCommandV7(workshopView);
    expect(cold.candidates).not.toContainEqual(
      expect.objectContaining({ command: demolishWorkshop }),
    );
    const incremental = new NormalPolicyWorkV7(structuredClone(workshopView));
    let sliced = incremental.advanceWork(1);
    while (sliced === null) sliced = incremental.advanceWork(1);
    expect(sliced).toEqual(cold);

    const removedWorkshop = applyCommandV7(
      workshop.state,
      workshop.state.humanPlayerId,
      demolishWorkshop,
    );
    expect(removedWorkshop.accepted).toBe(true);
    if (!removedWorkshop.accepted) return;
    const fallbackCommands = queryPlayerCommandsV7(
      viewForV7(removedWorkshop.state, removedWorkshop.state.humanPlayerId),
    ).filter(
      (candidate) => "at" in candidate && same(candidate.at, workshop.target),
    );
    expect(fallbackCommands).toContainEqual({
      kind: "BUILD_WORKSHOP",
      at: workshop.target,
    });
    expect(fallbackCommands).not.toContainEqual({
      kind: "BUILD_FORGE",
      at: workshop.target,
    });
    const rebuiltWorkshop = applyCommandV7(
      removedWorkshop.state,
      removedWorkshop.state.humanPlayerId,
      { kind: "BUILD_WORKSHOP", at: workshop.target },
    );
    expect(rebuiltWorkshop.accepted).toBe(true);
    if (!rebuiltWorkshop.accepted) return;
    expect(
      rebuiltWorkshop.state.board.tiles.find((tile) =>
        same(tile.at, workshop.target),
      )?.improvement,
    ).toBe("WORKSHOP");
    expect(
      chooseNormalCommandV7(
        viewForV7(rebuiltWorkshop.state, rebuiltWorkshop.state.humanPlayerId),
      ).candidates.some(
        ({ command: candidate }) =>
          canonicalJson(candidate) === canonicalJson(demolishWorkshop),
      ),
    ).toBe(false);

    const basic = usefulBasicRedevelopmentState();
    const basicView = viewForV7(basic.state, basic.state.humanPlayerId);
    const basicChoice = chooseNormalCommandV7(basicView);
    // Revision 14 (E2) changes the Market values the candidate scores use;
    // with E2 reverted the revision-13 values 580c9ac8… and 7b8d235c… return.
    // Revision 17 inserts KABOOM after WAIL, shifting the later command-kind
    // ordinals once more, and revision 19 inserts STAMPEDE and HATCH after
    // KABOOM and LAY_EGG after TRAIN_NAVAL, shifting them again. Revision 20
    // removes STAMPEDE, moving every kind after KABOOM back by one (was
    // 965473…ff1f). pulp_wars-9s0.1 (was 07dc97…d442): the command is the
    // same Move to (7, 9); two other Moves of that unit, to (7, 7) and
    // (7, 8), are no longer candidates: they were closer to its objective in
    // a straight line but not along the land route the unit now follows.
    // The Martian revision (`pulp_wars-t6s.2`) inserts BEAM_DOWN,
    // MIND_CONTROL, and TRACTOR_BEAM after HATCH, moving every later kind
    // forward by three (was 1a5ed7…d668); the revision-12-ordinal value
    // below is unchanged. The Ice Folk revision (`pulp_wars-7g3.3`) inserts
    // THROW_BOLAS and COLD_SNAP after TRACTOR_BEAM, moving every later kind
    // forward by two (was 4bb1e3…d3fc); the revision-12-ordinal value below
    // is unchanged. The Dwarf revision (`pulp_wars-78i.3`) inserts TUNNEL,
    // BOMB_RUN, and ASSEMBLE after COLD_SNAP, moving every later kind
    // forward by three (was fcdf9a…fdae); the revision-12-ordinal value
    // below is unchanged.
    expect(canonicalHash(basicChoice)).toBe(
      // The Candy revision (`pulp_wars-jdb.3`) inserts SUGAR_RUSH, REBAKE,
      // and SUGAR_TOSS after ASSEMBLE, moving every later kind forward by
      // three (was ffcd2f…677b); the revision-12-ordinal value is unchanged.
      // The naval branch (`pulp_wars-5ti.2`) inserts BOARD after ATTACK,
      // moving every later kind forward by one (was fdc900…1608).
      // The frozen sea (`pulp_wars-5ti.3`) inserts FREEZE after COLD_SNAP,
      // moving every later kind forward by one (was 32d19a…19d3).
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): the candidate scores read the new
      // numbers (was 0a83be…b889).
      // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL, moving every later command kind forward by one
      // (was 65a17d…443f).
      // Tuning 5 (`pulp_wars-w49.4`): the Normal AI's army play scores the
      // candidates of a Human match (was bbf1ab…b503).
      // Tuning 6 (`pulp_wars-w49.6`): the command is unchanged; the
      // candidates are scored by the assault, growth, and research rules of a
      // Human seat (was 59c61a…4603).
      // Tuning 7 (`pulp_wars-w49.10`): the command is unchanged. An enemy
      // unit stands five tiles from the seat's Swordsman, which is a war: the
      // capital can train, so the two Harvest Fruit and the Hunt Game are no
      // candidates; the Swordsman's errand is the chest at (9, 9), away
      // from the enemy, before the village at (5, 8) (was 4d40a9…32be).
      // The Martian pass's correction (`pulp_wars-w49.14`): the command
      // is unchanged. A Human seat at war still buys the growth that leaves
      // the Coins for any unit on offer, so the harvests and the hunt are
      // candidates again (was 62b18a…9811).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 8e542b…840c).
      // Dwarf crowd control (`pulp_wars-w49.33`) inserts WHIRL,
      // BUILD_BARRICADE, and ATTACK_BARRICADE after ASSEMBLE, moving every
      // later kind forward by three (was b8c717…d3e4); the
      // revision-12-ordinal value is unchanged.
      // The giants' signatures (`pulp_wars-w49.30`) insert SWALLOW, TOSS,
      // STOMP, and BREAK_OFF after RECOVER, moving every later command kind
      // forward by four (was 357b85…644c).
      // The reward ladder rework (`pulp_wars-zypi`): the command is the same
      // Move to (7, 9). The fixture settles its level-2 choice with the
      // first candidate, now the Stockpile (Scouts before, with a Raider and
      // the radius-3 reveal), so one more Move of the unit, to (7, 7), is a
      // candidate (was ca16d7…dd7c).
      // Map curiosities round 2 (`pulp_wars-737.14`) insert TOSS_COIN before
      // RECOVER and Ice Folk Freeze (`pulp_wars-w49.37`) inserts FROST_BOLT
      // and STAMPEDE after BREAK_OFF, moving the later command kinds forward
      // (was 7af48c…58bc); the revision-12-ordinal value is unchanged.
      // The Candy redesign (`pulp_wars-jdb.12`) inserts TOP_UP after
      // TOSS_COIN, moving the later command kinds forward by one (was
      // 858e9f…54c2); the revision-12-ordinal value is unchanged.
      // The Cult's Favour (`pulp_wars-mch9.4`) inserts SACRIFICE and SEIZE
      // after STAMPEDE and OFFERING after LAY_EGG, moving the later command
      // kinds forward (was a7f36e…592f); the revision-12-ordinal value is
      // unchanged.
      "8cc9168d367a546816f4bf0085ac2d4894e7e97e0355884b105c755ff142cd81",
    );
    // Revision 13 shifts the command-kind ordinals in AI tie-break tuples
    // (spec section 8); this is the value with revision-12 ordinals
    // (pulp_wars-9s0.1: was 2355bb…3e7a, for the same two Moves).
    expect(canonicalHash(withRevision12DecisionOrdinalsV7(basicChoice))).toBe(
      // Tuning 6 (`pulp_wars-w49.6`): the command is unchanged; the
      // candidates are scored by the assault, growth, and research rules of a
      // Human seat (was b44611…4ff5).
      // Tuning 7 (`pulp_wars-w49.10`): as above (was 8df833…16ad).
      // The Martian pass's correction (`pulp_wars-w49.14`): as above (was
      // 59257e…efd3).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // d8d542…10dc).
      // The reward ladder rework (`pulp_wars-zypi`): as above (was
      // c837b9…941f).
      "9cc18b5fe6358a8a1ce116d235dfe360c7051f8870df0e79b8ea94c76067d451",
    );
    const basicCommands = queryPlayerCommandsV7(basicView);
    const basicWork = new NormalPolicyWorkV7(structuredClone(basicView));
    let basicDecision = basicWork.advanceWork(1);
    while (basicDecision === null) basicDecision = basicWork.advanceWork(1);
    const nextRoad =
      inspectNormalTacticalFactsV7(basicView).roadCorridor
        ?.missingRoadKeys[0] ?? null;
    const excludedRoads = basicCommands.filter(
      (candidate) =>
        candidate.kind === "BUILD_ROAD" &&
        `${candidate.at.y},${candidate.at.x}` !== nextRoad,
    ).length;
    const excludedPreserved = basicCommands.filter((candidate) => {
      if (candidate.kind !== "REDEVELOP") return false;
      const tile = basicView.board.tiles.find(
        (tile) => tile.at.x === candidate.at.x && tile.at.y === candidate.at.y,
      );
      const improvement = tile?.explored === true ? tile.improvement : null;
      return [
        "WINDMILL",
        "SAWMILL",
        "FORGE",
        "WORKSHOP",
        "MARKET",
        "MONUMENT",
        "PORT",
        "SHIPYARD",
      ].includes(improvement ?? "");
    }).length;
    expect(basicWork.diagnostic().plannedCandidateCount).toBe(
      basicCommands.length - excludedRoads - excludedPreserved,
    );
    const demolishCamp = { kind: "REDEVELOP" as const, at: basic.target };
    expect(
      chooseNormalCommandV7(basicView).candidates.some(
        ({ command: candidate }) =>
          canonicalJson(candidate) === canonicalJson(demolishCamp),
      ),
    ).toBe(true);
    const removedCamp = applyCommandV7(
      basic.state,
      basic.state.humanPlayerId,
      demolishCamp,
    );
    expect(removedCamp.accepted).toBe(true);
    if (!removedCamp.accepted) return;
    expect(
      queryPlayerCommandsV7(
        viewForV7(removedCamp.state, removedCamp.state.humanPlayerId),
      ),
    ).toContainEqual({ kind: "BUILD_SAWMILL", at: basic.target });
    const upgraded = applyCommandV7(
      removedCamp.state,
      removedCamp.state.humanPlayerId,
      { kind: "BUILD_SAWMILL", at: basic.target },
    );
    expect(upgraded.accepted).toBe(true);
    if (!upgraded.accepted) return;
    expect(
      upgraded.state.board.tiles.find((tile) => same(tile.at, basic.target))
        ?.improvement,
    ).toBe("SAWMILL");
  });

  it("never loops Redevelop and the same rebuild on one tile within a turn (pulp_wars-9s0.9)", () => {
    // The two-Lumber-Camp fixture researched only up to Forestry and
    // Engineering (which unlocks Redevelop): the public plan, which ignores
    // technology gates, still reserves the first camp for a Market the seat
    // cannot build without Administration.
    const basic = usefulBasicRedevelopmentState();
    const start = withResearchV7(basic.state, [
      "GATHERING",
      "HUNTING",
      "FORESTRY",
      "DRILL",
      "ENGINEERING",
    ]);
    const redevelop = { kind: "REDEVELOP" as const, at: basic.target };
    const rebuild = { kind: "BUILD_LUMBER_CAMP" as const, at: basic.target };
    const startView = viewForV7(start, start.humanPlayerId);
    expect(queryPlayerCommandsV7(startView)).toContainEqual(redevelop);
    expect(scorePublicSpatialPlanV7(startView, redevelop)).toBeGreaterThan(0);
    expect(
      queryPublicRedevelopmentChangesImprovementV7(startView, redevelop),
    ).toBe(true);
    const planned = queryPublicPlannedImprovementV7(
      startView,
      basic.target,
      "AFTER_REDEVELOP",
    );
    expect(planned?.improvement).toBe("MARKET");

    // The cycle the policy used to repeat: after the Redevelop the only
    // legal improvement there is the same Lumber Camp, and the rebuilt board
    // is the starting board (less three Coins), so Redevelop scored again.
    const removed = applyFixtureCommand(start, redevelop);
    const removedKinds = queryPlayerCommandsV7(
      viewForV7(removed, removed.humanPlayerId),
    )
      .filter((command) => "at" in command && same(command.at, basic.target))
      .map((command) => command.kind);
    expect(removedKinds).toContain("BUILD_LUMBER_CAMP");
    expect(removedKinds).not.toContain("BUILD_MARKET");
    const rebuilt = applyFixtureCommand(removed, rebuild);
    expect(canonicalHash(rebuilt.board)).toBe(canonicalHash(start.board));
    expect(
      scorePublicSpatialPlanV7(
        viewForV7(rebuilt, rebuilt.humanPlayerId),
        redevelop,
      ),
    ).toBeGreaterThan(0);

    // Root cause: a Redevelop whose replacement cannot be built now is not a
    // candidate, so the policy never starts that cycle.
    expect(
      chooseNormalCommandV7(startView).candidates.some(
        ({ command }) => canonicalJson(command) === canonicalJson(redevelop),
      ),
    ).toBe(false);

    // A whole Normal turn from the start: no tile is redeveloped and then
    // given back the improvement it lost (before the fix this repeated
    // Redevelop and the Lumber Camp until the 128-command turn cap).
    let state = start;
    const removedAt = new Map<string, string | null>();
    let commands = 0;
    for (;;) {
      const view = viewForV7(state, state.humanPlayerId);
      const command = chooseNormalTurnCommandV7(view, commands);
      expect(command).not.toBeNull();
      if (command === null) break;
      if (command.kind === "REDEVELOP")
        removedAt.set(
          key(command.at),
          state.board.tiles.find((tile) => same(tile.at, command.at))
            ?.improvement ?? null,
        );
      state = applyFixtureCommand(state, command);
      commands += 1;
      if (
        "at" in command &&
        command.kind !== "REDEVELOP" &&
        removedAt.has(key(command.at))
      )
        expect(
          state.board.tiles.find((tile) => same(tile.at, command.at))
            ?.improvement ?? null,
        ).not.toBe(removedAt.get(key(command.at)));
      if (command.kind === "END_TURN") break;
    }
    // The reward ladder rework (`pulp_wars-zypi`): with the 10-Coin
    // Treasury of levels 6 to 8 the seat issues 63 commands and ends its turn
    // with its 64th command (fewer before), none of them a Redevelop; the
    // bound is the turn cap the old cycle ran into.
    expect(commands).toBeLessThan(128);

    // The undo/redo guard: with every technology the Redevelop is taken,
    // and afterwards the planned replacement, never the removed Lumber
    // Camp, is the build on that target.
    const full = applyFixtureCommand(basic.state, redevelop);
    const fullView = viewForV7(full, full.humanPlayerId);
    expect(queryPlayerCommandsV7(fullView)).toContainEqual(rebuild);
    // Tuning 7 (`pulp_wars-w49.10`): an enemy unit five tiles from the
    // seat's Swordsman is a war, and at war with an open unit slot nothing
    // but units is bought (the Market was a candidate there, at 1200).
    // Without that unit the seat is at peace, as it was read before.
    const peaceView = viewForV7(
      {
        ...full,
        units: full.units.filter((unit) => unit.ownerId === full.humanPlayerId),
      },
      full.humanPlayerId,
    );
    expect(
      chooseNormalCommandV7(fullView).candidates.map(({ command }) =>
        canonicalJson(command),
      ),
    ).not.toContain(canonicalJson(rebuild));
    const fullCandidates = chooseNormalCommandV7(peaceView).candidates.map(
      ({ command }) => canonicalJson(command),
    );
    expect(fullCandidates).toContain(
      canonicalJson({ kind: "BUILD_MARKET", at: basic.target }),
    );
    expect(fullCandidates).not.toContain(canonicalJson(rebuild));
  });

  it("plays the recorded Martian-mirror turn without the Redevelop/Lumber Camp loop (pulp_wars-9s0.9)", () => {
    // Before the fix this turn redeveloped (10, 5) and rebuilt its Lumber
    // Camp four times, until the seat's Coins ran out; a Windmill (Milling
    // not researched) was the plan's replacement.
    const fixture = JSON.parse(
      readFileSync("tests/fixtures/ruleset-v7-redevelop-cycle.json", "utf8"),
    ) as {
      readonly playerId: GameStateV7["humanPlayerId"];
      readonly target: CoordV7;
      readonly state: GameStateV7;
    };
    let state = checkedV7(fixture.state);
    const actor = fixture.playerId;
    const turnRound = state.round;
    const redevelopedAt = new Map<string, string | null>();
    const kinds: string[] = [];
    let commands = 0;
    while (
      state.outcome === null &&
      state.round === turnRound &&
      state.turnOrder[state.activeSeatIndex] === actor
    ) {
      const command = chooseNormalTurnCommandV7(
        viewForV7(state, actor),
        commands,
      );
      expect(command).not.toBeNull();
      if (command === null) break;
      const before = state;
      const applied = applyCommandV7(state, actor, command);
      expect(applied.accepted).toBe(true);
      if (!applied.accepted) break;
      state = applied.state;
      commands += 1;
      kinds.push(command.kind);
      if (!("at" in command)) continue;
      const tileKey = key(command.at);
      const improvementAt = (source: GameStateV7) =>
        source.board.tiles.find((tile) => same(tile.at, command.at))
          ?.improvement ?? null;
      if (command.kind === "REDEVELOP")
        redevelopedAt.set(tileKey, improvementAt(before));
      else if (redevelopedAt.has(tileKey))
        expect(improvementAt(state)).not.toBe(redevelopedAt.get(tileKey));
    }
    expect(kinds.at(-1)).toBe("END_TURN");
    expect(redevelopedAt.has(key(fixture.target))).toBe(false);
    expect(commands).toBeLessThan(40);
  });

  it("does not value a processor through a fogged Land Grant ring and keeps equal-view policy parity", () => {
    const state = exploredAllV7(allTechsV7(initialV7(7_711)));
    const base = viewForV7(state, state.humanPlayerId);
    const city = base.cities.find(
      (candidate) => candidate.ownerId !== base.viewer.id,
    );
    const actor = base.units.find((unit) => unit.ownerId === base.viewer.id);
    if (city === undefined || actor === undefined)
      throw new Error("Land Grant Pillage fixture missing");
    const target = { x: city.at.x + 1, y: city.at.y };
    const support = { x: city.at.x + 1, y: city.at.y + 1 };
    const hiddenAt = { x: city.at.x + 2, y: city.at.y + 2 };
    const complete: PlayerViewV7 = {
      ...base,
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, expanded: false, landGrantUsed: true }
          : candidate,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) => {
          if (
            Math.max(
              Math.abs(tile.at.x - city.at.x),
              Math.abs(tile.at.y - city.at.y),
            ) > 2 ||
            !tile.explored
          )
            return tile;
          const common = {
            ...tile,
            biome: "PLAINS" as const,
            terrain: "GRASS" as const,
            resource: null,
            improvement: null,
            road: false,
            site: same(tile.at, city.at) ? tile.site : null,
            territoryCityId: city.id,
            territoryOwnerId: city.ownerId,
          };
          if (same(tile.at, target))
            return { ...common, improvement: "SAWMILL" as const };
          if (same(tile.at, support))
            return {
              ...common,
              terrain: "FOREST" as const,
              improvement: "LUMBER_CAMP" as const,
            };
          return common;
        }),
      },
      units: base.units
        .filter((unit) => !same(unit.at, target) || unit.id === actor.id)
        .map((unit) =>
          unit.id === actor.id
            ? { ...unit, at: target, form: "LAND" as const, activation: READY }
            : unit,
        ),
      improvementValues: [],
      populationContributions: [],
    };
    const hidden: PlayerViewV7 = {
      ...complete,
      board: {
        ...complete.board,
        tiles: complete.board.tiles.map((tile) =>
          same(tile.at, hiddenAt) ? { at: tile.at, explored: false } : tile,
        ),
      },
    };
    const command = { kind: "PILLAGE" as const, unitId: actor.id };
    expect(queryPlayerCommandsV7(hidden)).toContainEqual(command);
    expect(scoreCommandV7(hidden, command).immediateValue).toBe(1);
    expect(scoreCommandV7(complete, command).immediateValue).toBeGreaterThan(1);

    const equalView = JSON.parse(canonicalJson(hidden)) as typeof hidden;
    expect(canonicalHash(equalView)).toBe(canonicalHash(hidden));
    expect(chooseNormalCommandV7(equalView)).toEqual(
      chooseNormalCommandV7(hidden),
    );
  });

  it("caps an unpublished enemy Market's Pillage value at the engine's Market income cap", () => {
    // pulp_wars-box: the engine pays min(3, 1 + adjacent families) for one
    // Market (revision 16); an unpublished Market is valued the same way.
    const state = exploredAllV7(allTechsV7(initialV7(7_711)));
    const base = viewForV7(state, state.humanPlayerId);
    const city = base.cities.find(
      (candidate) => candidate.ownerId !== base.viewer.id,
    );
    const actor = base.units.find((unit) => unit.ownerId === base.viewer.id);
    if (city === undefined || actor === undefined)
      throw new Error("Market Pillage fixture missing");
    const target = { x: city.at.x + 1, y: city.at.y };
    const supports = [
      { at: { x: city.at.x + 2, y: city.at.y }, improvement: "FARM" },
      {
        at: { x: city.at.x + 1, y: city.at.y + 1 },
        improvement: "LUMBER_CAMP",
      },
      { at: { x: city.at.x + 1, y: city.at.y - 1 }, improvement: "MINE" },
    ] as const;
    const marketView = (families: number): PlayerViewV7 => ({
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) => {
          if (
            Math.max(
              Math.abs(tile.at.x - city.at.x),
              Math.abs(tile.at.y - city.at.y),
            ) > 2 ||
            !tile.explored
          )
            return tile;
          const support = supports
            .slice(0, families)
            .find((item) => same(item.at, tile.at));
          return {
            ...tile,
            biome: "PLAINS" as const,
            terrain: "GRASS" as const,
            resource: null,
            improvement: same(tile.at, target)
              ? ("MARKET" as const)
              : (support?.improvement ?? null),
            road: false,
            site: same(tile.at, city.at) ? tile.site : null,
            territoryCityId: city.id,
            territoryOwnerId: city.ownerId,
          };
        }),
      },
      units: base.units
        .filter((unit) => !same(unit.at, target) || unit.id === actor.id)
        .map((unit) =>
          unit.id === actor.id
            ? { ...unit, at: target, form: "LAND" as const, activation: READY }
            : unit,
        ),
      improvementValues: [],
      populationContributions: [],
    });
    const command = { kind: "PILLAGE" as const, unitId: actor.id };
    const scoreWith = (families: number) => {
      const view = marketView(families);
      expect(queryPlayerCommandsV7(view)).toContainEqual(command);
      return scoreCommandV7(view, command).immediateValue;
    };
    // Raw income 1 + families: 2, 3, then 4 capped to MARKET_INCOME_CAP_V7.
    expect(MARKET_INCOME_CAP_V7).toBe(3);
    expect(scoreWith(1)).toBe(1 + 5 * 2);
    expect(scoreWith(2)).toBe(1 + 5 * 3);
    expect(scoreWith(3)).toBe(1 + 5 * MARKET_INCOME_CAP_V7);
  });

  it.each(["PORT", "SHIPYARD"] as const)(
    "preserves an existing %s instead of entering a coastal teardown/rebuild loop",
    (improvement) => {
      const fixture = navalRedevelopmentView(improvement);
      const command = { kind: "REDEVELOP", at: fixture.target } as const;
      expect(queryPlayerCommandsV7(fixture.view)).toContainEqual(command);
      expect(
        chooseNormalCommandV7(fixture.view).candidates.some(
          (candidate) =>
            canonicalJson(candidate.command) === canonicalJson(command),
        ),
      ).toBe(false);
      expect(
        chooseNormalCommandV7(structuredClone(fixture.view)).command,
      ).toEqual(chooseNormalCommandV7(fixture.view).command);
    },
  );

  it("keeps redevelopment replacement parity after another city reserves the sole Monument", () => {
    const coldFixture = multiCityMonumentRedevelopmentView();
    const command = { kind: "REDEVELOP", at: coldFixture.target } as const;
    const cold = queryPublicRedevelopmentChangesImprovementV7(
      coldFixture.view,
      command,
    );
    expect(cold).toBe(true);

    const preparedFixture = multiCityMonumentRedevelopmentView();
    const commands = queryPlayerCommandsV7(preparedFixture.view);
    expect(commands).toContainEqual(command);
    const work = createPublicPlanningWorkV7(preparedFixture.view, commands);
    let progress = work.advance(1);
    while (!progress.done) progress = work.advance(1);
    expect(
      queryPublicRedevelopmentChangesImprovementV7(
        preparedFixture.view,
        command,
      ),
    ).toBe(cold);
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

  it("scores bounded Knight Overrun follow-up with standalone parity", () => {
    const state = knightOverrunLine();
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    const attack = decision.candidates.find(
      (candidate) => candidate.command.kind === "ATTACK",
    );
    if (attack === undefined) throw new Error("Knight Overrun attack missing");
    expect(scoreCommandV7(view, attack.command)).toEqual(attack.score);
    if (attack.command.kind !== "ATTACK")
      throw new Error("Knight Overrun attack malformed");
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

  it("values a legal post-Move Knight Overrun setup", () => {
    // The Martian pass's correction (`pulp_wars-w49.14`): a Human seat
    // takes the villages first for ten rounds; round 12.
    const state = { ...knightOverrunMoveLine(), round: 12 };
    const view = viewForV7(state, state.humanPlayerId);
    const knightOverrun = ownUnit(state, "KNIGHT");
    const move = required(
      queryPlayerCommandsV7(view).find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === knightOverrun.id &&
          same(command.path.at(-1) ?? { x: -1, y: -1 }, { x: 3, y: 5 }),
      ),
      "Knight Overrun firing-position Move missing",
    );
    const decision = chooseNormalCommandV7(view);
    const candidate = required(
      decision.candidates.find(
        (entry) => canonicalJson(entry.command) === canonicalJson(move),
      ),
      "Knight Overrun Move score missing",
    );
    expect(scoreCommandV7(view, move)).toEqual(candidate.score);
    expect(candidate.score.immediateValue).toBeGreaterThan(0);
    expect(candidate.score.safetyValue).toBeLessThanOrEqual(0);
  });

  it("yields inside a dense Knight Overrun search without changing the frozen result", async () => {
    const state = denseKnightOverrun();
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

  it("preserves a fortified hostile defender's stats for the next Overrun attack", () => {
    const state = fortifiedKnightOverrunTarget();
    const view = viewForV7(state, state.humanPlayerId);
    const knightOverrun = ownUnit(state, "KNIGHT");
    const target = state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId && unit.role === "FIGHTER",
    );
    if (target === undefined) throw new Error("Fortified target missing");
    const command = {
      kind: "ATTACK" as const,
      unitId: knightOverrun.id,
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
    const continuation = queryPlayerCommandsV7(afterFirst).find(
      (candidate) =>
        candidate.kind === "ATTACK" && candidate.unitId === command.unitId,
    );
    if (continuation?.kind !== "ATTACK")
      throw new Error("Second attack command missing");
    const second = queryCombatPreviewV7(
      afterFirst,
      continuation.unitId,
      continuation.targetUnitId,
    );
    if (second === null) throw new Error("Second attack preview missing");
    const publishedDefense = view.unitStats
      .find((entry) => entry.unitId === target.id)
      ?.stats.find((stat) => stat.id === "DEFENSE");
    expect(publishedDefense?.total).toEqual({ numerator: 2, denominator: 1 });
    expect(scoreCommandV7(view, command).immediateValue).toBe(
      10 * (first.damageToDefender + second.damageToDefender) -
        8 * (first.damageToAttacker + second.damageToAttacker) +
        20 * Number(first.defenderDies) +
        20 * Number(second.defenderDies) -
        16 * Number(first.attackerDies) -
        16 * Number(second.attackerDies),
    );
  });

  it("uses transformed public stats for a retained hostile identity in projected Knight scoring", () => {
    const state = fixtureState([
      ["KNIGHT", { x: 3, y: 5 }, true, 10],
      ["RAIDER", { x: 4, y: 4 }, true, 10],
      ["FIGHTER", { x: 4, y: 5 }, false, 1],
      ["FIGHTER", { x: 5, y: 5 }, false, 1],
      ["CATAPULT", { x: 7, y: 5 }, false, 10],
    ]);
    const view = viewForV7(state, state.humanPlayerId);
    const knight = ownUnit(state, "KNIGHT");
    const firstTarget = view.units.find(
      (unit) =>
        unit.ownerId !== view.viewer.id && same(unit.at, { x: 4, y: 5 }),
    );
    const retainedHostile = view.units.find(
      (unit) => unit.ownerId !== view.viewer.id && unit.role === "CATAPULT",
    );
    if (firstTarget === undefined || retainedHostile === undefined)
      throw new Error("Projected Knight cache fixture missing");
    const command = {
      kind: "ATTACK" as const,
      unitId: knight.id,
      targetUnitId: firstTarget.id,
    };
    const baseScore = scoreCommandV7(view, command);
    const weakened: PlayerViewV7 = {
      ...view,
      unitStats: view.unitStats.map((entry) =>
        entry.unitId !== retainedHostile.id
          ? entry
          : {
              ...entry,
              stats: entry.stats.map((stat) =>
                stat.id !== "ATTACK"
                  ? stat
                  : {
                      ...stat,
                      total: { numerator: 1, denominator: 2 },
                    },
              ),
            },
      ),
    };
    expect(weakened.units.find((unit) => unit.id === retainedHostile.id)).toBe(
      retainedHostile,
    );
    const weakenedScore = scoreCommandV7(weakened, command);
    expect(weakenedScore.safetyValue).toBeGreaterThan(baseScore.safetyValue);
    expect(weakenedScore.immediateValue).toBe(baseScore.immediateValue);
  });

  it("prepares the retained late public view incrementally with exact sync parity", () => {
    const retained = JSON.parse(
      readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
    ) as PlayerViewV7;
    const source = upgradeRetainedPublicViewV7(retained);
    expect(source.viewer.researchedTechs).toEqual([
      "GATHERING",
      "HUNTING",
      "DRILL",
      "ENGINEERING",
      "METALLURGY",
    ]);
    expect(source.units.every((unit) => unit.form === "LAND")).toBe(true);
    expect(
      source.board.tiles.every((tile) => !tile.explored || tile.biome !== null),
    ).toBe(true);
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
    // The pin is shared with scripts/benchmark-ruleset-v7-normal-policy.ts
    // (`pulp_wars-c87.8`): its own copy had been stale since 521c3da.
    expect(canonicalHash(retained)).toBe(
      RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION.fixtureViewHash,
    );
    expect(sliced.command).toEqual(
      RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION.command,
    );
    expect(sliced.candidates).toHaveLength(
      RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION.candidateCount,
    );
    // pulp_wars-1mc: this view is an endgame (4 cities against 1), so its
    // capturers' approach MOVEs rise from 700 to 1105 (was 5c8816…e1b3); the
    // command and every non-MOVE candidate below keep their pinned values.
    // Revision 17 inserts KABOOM after WAIL, shifting the later command-kind
    // ordinals once more, and revision 19 inserts STAMPEDE and HATCH after
    // KABOOM and LAY_EGG after TRAIN_NAVAL, shifting them again. Revision 20
    // removes STAMPEDE, moving every kind after KABOOM back by one; the
    // Martian revision inserts three kinds after HATCH, and the Ice Folk
    // revision two after TRACTOR_BEAM; the revision-12-ordinal value below
    // is unchanged.
    expect(canonicalHash(sliced)).toBe(
      RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION.policyDecisionHash,
    );
    // Revision 13 shifts the command-kind ordinals in AI tie-break tuples
    // (spec section 8); with revision-12 ordinals the value was 8936ff…1156
    // before the pulp_wars-1mc endgame MOVE priorities above, and
    // 41418b…e607 before the pulp_wars-9s0.1 campaign plan (the pin's
    // comment in scripts/ruleset-v7-late-public-view-contract.ts has the
    // cause), and de28fd…a6e4 before the pulp_wars-0hi.3 Human HP (same
    // comment: two Train Guard candidates and Research Scouting).
    expect(canonicalHash(withRevision12DecisionOrdinalsV7(sliced))).toBe(
      // Tuning 6 (`pulp_wars-w49.6`): the command is unchanged; the
      // candidates are scored by the assault, growth, and research rules of a
      // Human seat (was 016439…56f8).
      // Tuning 7 (`pulp_wars-w49.10`): the command is unchanged; the cause
      // is in the pin's comment (was c6512a…dddd).
      // Tuning 8 (`pulp_wars-w49.11`): the command is Research
      // Marksmanship (it was Train Swordsman); the cause is in the pin's
      // comment (was 0802a4…cb02).
      // The Martian pass's correction (`pulp_wars-w49.14`): the command is
      // unchanged; the cause is in the pin's comment (was e8b765…17d1).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // f0fd0a…63a9).
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the command is
      // unchanged; the cause is in the pin's comment (was ea7230…0f77).
      "908c1bc49a669815701d6463ca7567f4239e1dd7c195ace5bd904590720853ba",
    );
    const revision4Commands = new Set([
      '{"kind":"ATTACK","unitId":19,"targetUnitId":34}',
      '{"kind":"BUILD_FORGE","at":{"x":9,"y":8}}',
      '{"kind":"BUILD_FORGE","at":{"x":7,"y":9}}',
      '{"kind":"BUILD_FORGE","at":{"x":9,"y":9}}',
      '{"kind":"BUILD_FORGE","at":{"x":9,"y":10}}',
      '{"kind":"BUILD_FORGE","at":{"x":6,"y":8}}',
      '{"kind":"HUNT_GAME","at":{"x":1,"y":5}}',
      '{"kind":"HUNT_GAME","at":{"x":2,"y":6}}',
      '{"kind":"TRAIN","cityId":16,"role":"KNIGHT"}',
      '{"kind":"TRAIN","cityId":3,"role":"KNIGHT"}',
      '{"kind":"RESEARCH","tech":"SHORECRAFT"}',
      '{"kind":"RESEARCH","tech":"SCOUTING"}',
      '{"kind":"ATTACK","unitId":19,"targetUnitId":21}',
      '{"kind":"RECOVER","unitId":19}',
      '{"kind":"RECOVER","unitId":20}',
      '{"kind":"END_TURN"}',
    ]);
    const revision4Candidates = sliced.candidates.filter((candidate) =>
      revision4Commands.has(JSON.stringify(candidate.command)),
    );
    // Revision 17 inserts KABOOM after WAIL, shifting the later command-kind
    // ordinals once more, and revision 19 inserts STAMPEDE and HATCH after
    // KABOOM and LAY_EGG after TRAIN_NAVAL, shifting them again. Revision 20
    // removes STAMPEDE, moving every kind after KABOOM back by one (was
    // d30570…bcea); the revision-12-ordinal value below is unchanged.
    // The Martian revision (`pulp_wars-t6s.2`) inserts BEAM_DOWN,
    // MIND_CONTROL, and TRACTOR_BEAM after HATCH, moving every later
    // command-kind ordinal forward by three (was 52d5d2…aa31).
    // pulp_wars-0hi.3 (was fde9b0…bca8, and 73d039…73b3 with revision-12
    // ordinals): Research Scouting is the missing-role plan (priority 1060
    // and value 6, was 1040 and 0) because the Raider has 12 HP (revision 20
    // section 6.3); every other candidate of this subset is unchanged.
    // The Ice Folk revision (`pulp_wars-7g3.3`) inserts THROW_BOLAS and
    // COLD_SNAP after TRACTOR_BEAM, moving every later command-kind ordinal
    // forward by two (was 1fc167…6276). The Dwarf revision
    // (`pulp_wars-78i.3`) inserts TUNNEL, BOMB_RUN, and ASSEMBLE after
    // COLD_SNAP, moving every later command-kind ordinal forward by three
    // (was b1425a…a491).
    expect(canonicalHash(revision4Candidates)).toBe(
      // The Candy revision (`pulp_wars-jdb.3`) inserts SUGAR_RUSH, REBAKE,
      // and SUGAR_TOSS after ASSEMBLE, moving every later command-kind
      // ordinal forward by three (was 7c5499…bf5c).
      // The naval branch (`pulp_wars-5ti.2`) inserts BOARD after ATTACK,
      // moving every later command-kind ordinal forward by one (was
      // ba920b…9a33).
      // The frozen sea (`pulp_wars-5ti.3`) inserts FREEZE after COLD_SNAP,
      // moving every later command-kind ordinal forward by one (was
      // 6b5002…9b1e).
      // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL, moving
      // every later command kind forward by one (was fb95f7…9f14).
      // Tuning 5 (`pulp_wars-w49.4`): the view is a Human match with an
      // enemy in sight, so the Normal AI's army play scores this subset
      // (training at 1215, the hunts of visible units, research held
      // behind units); was d5d6b7…9a57, and b8ab4b…15d7 with revision-12
      // ordinals.
      // The Martian pass's correction (`pulp_wars-w49.14`): the Human seat's
      // new rules score this subset (was abe516…c405).
      // Dwarf crowd control (`pulp_wars-w49.33`) inserts WHIRL,
      // BUILD_BARRICADE, and ATTACK_BARRICADE after ASSEMBLE, moving every
      // later command kind forward by three (was 75d6c4…b1f6).
      // The giants' signatures (`pulp_wars-w49.30`) insert SWALLOW, TOSS,
      // STOMP, and BREAK_OFF after RECOVER, moving every later command kind
      // forward by four (was 2fd041…1f64).
      // Map curiosities round 2 (`pulp_wars-737.14`) insert TOSS_COIN before
      // RECOVER and Ice Folk Freeze (`pulp_wars-w49.37`) inserts FROST_BOLT
      // and STAMPEDE after BREAK_OFF, moving the later command kinds forward
      // (was a15d30…05b7); the revision-12-ordinal value is unchanged.
      // The Candy redesign (`pulp_wars-jdb.12`) inserts TOP_UP after
      // TOSS_COIN, moving the later command kinds forward by one (was
      // 888e38…34b5); the revision-12-ordinal value is unchanged.
      // The Cult's Favour (`pulp_wars-mch9.4`) inserts SACRIFICE and SEIZE
      // after STAMPEDE and OFFERING after LAY_EGG, moving the later command
      // kinds forward (was c50e0f…4f61); the revision-12-ordinal value is
      // unchanged.
      "563e200557834f44deee6fae74c2b4b162d66598e3d0d1dad0f8e4f53b70870f",
    );
    expect(
      canonicalHash(withRevision12CandidateOrdinalsV7(revision4Candidates)),
    ).toBe(
      // The Martian pass's correction (`pulp_wars-w49.14`): the Human seat's
      // new rules score this subset (was afe478…07ac).
      "b8ab4b5022177b7713636746f64e3a309f2451cb3d8dd0dfc582e96e29e215d7",
    );
    expect(canonicalHash(sync)).toBe(canonicalHash(sliced));
    expect(sync).toEqual(sliced);
  }, 15_000);

  it("adapts the retained fixture to exact revision-9 public facts without mutation", () => {
    const retained = JSON.parse(
      readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
    ) as PlayerViewV7;
    const retainedBytes = canonicalJson(retained);
    const source = upgradeRetainedPublicViewV7(retained);

    expect(canonicalJson(retained)).toBe(retainedBytes);
    expect(source.rulesetId).toBe("pulp-wars-poc-7r72");
    expect(source.viewer.factionTreeId).toBe("ORIGINAL_BASELINE_V5");
    expect(
      source.players.every(
        (player) => player.factionTreeId === "ORIGINAL_BASELINE_V5",
      ),
    ).toBe(true);
    expect(source.viewer.researchedTechs).toEqual([
      "GATHERING",
      "HUNTING",
      "DRILL",
      "ENGINEERING",
      "METALLURGY",
    ]);
    expect([...new Set(source.units.map((unit) => unit.role))].sort()).toEqual([
      "FIGHTER",
      "GUARD",
    ]);
    expect(
      source.units.every(
        (unit) =>
          unit.form === "LAND" &&
          canonicalJson(Object.keys(unit.activation).sort()) ===
            canonicalJson(
              [
                "attacked",
                "attacksUsed",
                "captured",
                "handled",
                "inspired",
                "moved",
                "movedPathLength",
                "overrunActive",
                "escapeAvailable",
                "recovered",
                "specialActed",
                "tendedThisTurn",
              ].sort(),
            ),
      ),
    ).toBe(true);
    const expandedCity = source.cities.find((city) => city.id === cityId(3));
    expect(expandedCity).toMatchObject({
      expanded: false,
      landGrantUsed: true,
      rewards: expect.arrayContaining([
        { reachedLevel: 4, reward: "TREASURY_6" },
      ]),
    });
    expect(
      source.cities
        .filter((city) => city.id !== cityId(3))
        .every((city) => !city.expanded && !city.landGrantUsed),
    ).toBe(true);
    expect(source.cities.every((city) => !("blackout" in city))).toBe(true);

    const fortificationAt = (x: number, y: number) => {
      const tile = source.board.tiles.find(
        (candidate) => candidate.at.x === x && candidate.at.y === y,
      );
      return tile?.explored ? tile.fortificationLevel : undefined;
    };
    expect(fortificationAt(8, 8)).toBe(2);
    expect(fortificationAt(8, 5)).toBe(0);
    const retainedCityDefense = source.unitStats
      .find((entry) => entry.unitId === unitId(14))
      ?.stats.find((stat) => stat.id === "DEFENSE");
    expect(retainedCityDefense?.modifiers).toEqual([]);
    expect(retainedCityDefense?.total).toEqual({
      numerator: 2,
      denominator: 1,
    });
    expect(
      source.unitStats
        .flatMap((entry) => entry.stats)
        .flatMap((stat) => stat.modifiers)
        .some((modifier) =>
          ["FRIENDLY_CITY", "CITY_FORTIFICATION"].includes(
            String(modifier.source),
          ),
        ),
    ).toBe(false);
  });

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

  // Tuning 4 (`pulp_wars-w49.3`): a Human Raider ignores zones of control,
  // so a Guard between it and the Marksman is no screen any more (the
  // screened Move scored safer before).
  it("prices a visible Raider corridor, which a screen no longer closes", () => {
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
    expect(protectedScore).toBe(danger);
  });

  it("keeps DISBAND eligibility on direct damage rather than cached next-turn reach", () => {
    const ownAt = { x: 5, y: 5 };
    const reachable = fixtureState([
      ["FIGHTER", ownAt, true, 10],
      ["FIGHTER", { x: 3, y: 5 }, false, 10],
      ["FIGHTER", { x: 7, y: 5 }, false, 10],
      ["FIGHTER", { x: 5, y: 3 }, false, 10],
      ["FIGHTER", { x: 5, y: 7 }, false, 10],
      ["FIGHTER", { x: 3, y: 3 }, false, 10],
    ]);
    const reachableView = viewForV7(reachable, reachable.humanPlayerId);
    const actor = ownUnit(reachable, "FIGHTER");
    const disband = { kind: "DISBAND" as const, unitId: actor.id };
    expect(queryPlayerCommandsV7(reachableView)).toContainEqual(disband);
    expect(
      reachableView.units
        .filter((unit) => unit.ownerId !== reachableView.viewer.id)
        .filter((unit) =>
          publicThreatenedTilesForPolicyV7(reachableView, unit).some((at) =>
            same(at, ownAt),
          ),
        ).length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      chooseNormalCommandV7(reachableView).candidates.some(
        ({ command }) => canonicalJson(command) === canonicalJson(disband),
      ),
    ).toBe(false);

    // Tuning 5 (`pulp_wars-w49.4`): an army seat's unit at half its HP or
    // more fights on, so the surrounded unit here is a wounded one (5 of
    // 12; a 10-HP one was disbanded before).
    const direct = fixtureState([
      ["FIGHTER", ownAt, true, 5],
      ["FIGHTER", { x: 4, y: 4 }, false, 10],
      ["FIGHTER", { x: 4, y: 5 }, false, 10],
      ["FIGHTER", { x: 4, y: 6 }, false, 10],
      ["FIGHTER", { x: 5, y: 4 }, false, 10],
      ["FIGHTER", { x: 5, y: 6 }, false, 10],
    ]);
    const directView = viewForV7(direct, direct.humanPlayerId);
    const directActor = ownUnit(direct, "FIGHTER");
    const directDisband = {
      kind: "DISBAND" as const,
      unitId: directActor.id,
    };
    // Tuning 8, correction pass (`pulp_wars-w49.11`): an army seat never
    // disbands a unit that stands next to an enemy unit (a wounded Guard
    // beside the player's capital was disbanded in the middle of an
    // assault), so the surrounded unit is no candidate either; the Disband
    // is still offered.
    expect(queryPlayerCommandsV7(directView)).toContainEqual(directDisband);
    expect(
      chooseNormalCommandV7(directView).candidates.some(
        ({ command }) =>
          canonicalJson(command) === canonicalJson(directDisband),
      ),
    ).toBe(false);
  });

  it("sums each injured Catapult preview and public minimum healing", () => {
    const healthy = fixtureState([
      ["CATAPULT", { x: 3, y: 5 }, true, 10],
      ["CATAPULT", { x: 3, y: 6 }, true, 10],
      // A Fighter (a Guard before tuning 5, `pulp_wars-w49.4`, which made
      // the Guard so soft to shots that even the injured pair kills it).
      ["FIGHTER", { x: 5, y: 5 }, false, 12],
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
    const state = pastFreeOpenerV7(initialV7(1));
    const base = viewForV7(state, state.humanPlayerId);
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.viewer.id),
      "Owned city missing",
    );
    const view = {
      ...base,
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, permanentPopulation: 1, population: 1 }
          : candidate,
      ),
    };
    const decision = chooseNormalCommandV7(view);
    const harvest = required(
      decision.candidates.find(
        (candidate) => candidate.command.kind === "HARVEST_FRUIT",
      ),
      "Harvest candidate missing",
    );
    const harvestEnd = required(
      decision.candidates.find(
        (candidate) => candidate.command.kind === "END_TURN",
      ),
      "End candidate missing",
    );
    expect(previewEconomicV7(view, harvest.command)).toMatchObject({
      ok: true,
      preview: { levelsReached: [2] },
    });
    expect(
      chooseNormalTurnCommandV7(view, 126, 128, {
        ...decision,
        command: harvest.command,
        candidates: [harvest, harvestEnd],
      }),
    ).toEqual({
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
          candidates: ["TREASURY_6" as const, "BOOM" as const],
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
      reward: "TREASURY_6",
    });
  });
});

function knightOverrunLine(): GameStateV7 {
  return fixtureState([
    ["KNIGHT", { x: 3, y: 5 }, true, 10],
    ["RAIDER", { x: 4, y: 4 }, true, 10],
    ["FIGHTER", { x: 4, y: 5 }, false, 1],
    ["RAIDER", { x: 5, y: 5 }, false, 10],
  ]);
}

function knightOverrunMoveLine(): GameStateV7 {
  return fixtureState([
    ["KNIGHT", { x: 1, y: 5 }, true, 10],
    ["RAIDER", { x: 2, y: 4 }, true, 10],
    ["FIGHTER", { x: 4, y: 5 }, false, 1],
    ["GUARD", { x: 5, y: 4 }, false, 15],
  ]);
}

function denseKnightOverrun(): GameStateV7 {
  const specs: UnitSpec[] = [
    ["KNIGHT", { x: 5, y: 5 }, true, 10],
    ["RAIDER", { x: 5, y: 2 }, true, 10],
    ["RAIDER", { x: 8, y: 5 }, true, 10],
    ["RAIDER", { x: 5, y: 8 }, true, 10],
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

function fortifiedKnightOverrunTarget(): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7(13)));
  const city = base.cities.find((item) => item.ownerId !== base.humanPlayerId);
  if (city === undefined) throw new Error("Hostile city missing");
  const knightOverrunAt =
    city.at.x >= 1
      ? { x: city.at.x - 1, y: city.at.y }
      : { x: city.at.x + 1, y: city.at.y };
  const scoutAt =
    city.at.y > 0
      ? { x: city.at.x, y: city.at.y - 1 }
      : { x: city.at.x, y: city.at.y + 1 };
  return fixtureState([
    ["KNIGHT", knightOverrunAt, true, 10],
    ["RAIDER", scoutAt, false, 10],
    ["FIGHTER", city.at, false, 1],
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
    const rule = effectiveRoleRuleV7(role, "ORIGINAL");
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
      form: "LAND",
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

function redevelopmentReplacementView(current: "MINE" | "SAWMILL"): {
  readonly view: PlayerViewV7;
  readonly target: CoordV7;
} {
  const state = exploredAllV7(initialV7(0));
  const base = viewForV7(state, state.humanPlayerId);
  const city = base.cities.find((item) => item.ownerId === base.viewer.id);
  if (city === undefined) throw new Error("owned city missing");
  const owned = base.board.tiles.filter(
    (tile) =>
      tile.explored && tile.territoryCityId === city.id && tile.site === null,
  );
  const target = owned[0]?.at;
  if (target === undefined) throw new Error("redevelopment target missing");
  return {
    target,
    view: {
      ...base,
      viewer: {
        ...base.viewer,
        coins: 1_000,
        researchedTechs: ["GATHERING", "DRILL", "ENGINEERING"],
      },
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) => {
          if (
            !tile.explored ||
            tile.territoryCityId !== city.id ||
            tile.site !== null
          )
            return tile;
          const selected = same(tile.at, target);
          return {
            ...tile,
            biome:
              selected && current === "SAWMILL"
                ? ("PLAINS" as const)
                : ("HIGHLANDS" as const),
            terrain:
              selected && current === "SAWMILL"
                ? ("GRASS" as const)
                : ("MOUNTAIN" as const),
            resource: null,
            improvement: selected ? current : ("MINE" as const),
          };
        }),
      },
    },
  };
}

function redevelopmentWorkshopChurnState(): {
  readonly state: GameStateV7;
  readonly target: CoordV7;
} {
  let state = richFixture(1);
  for (let index = 0; index < 2; index += 1) {
    const mine = requiredFixtureTileCommand(state, "BUILD_MINE");
    state = settleFixtureChoices(applyFixtureCommand(state, mine));
  }
  const workshop = requiredFixtureTileCommand(state, "BUILD_WORKSHOP");
  state = settleFixtureChoices(applyFixtureCommand(state, workshop));
  state = checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            researchedTechs: player.researchedTechs.filter((technology) =>
              ["GATHERING", "DRILL", "ENGINEERING"].includes(technology),
            ),
            achievementEntitlements: player.achievementEntitlements.map(
              (entitlement) => ({
                ...entitlement,
                unlocked: false,
                spent: false,
              }),
            ),
          }
        : player,
    ),
  });
  return { state, target: workshop.at };
}

function usefulBasicRedevelopmentState(): {
  readonly state: GameStateV7;
  readonly target: CoordV7;
} {
  let state = richFixture(4);
  const first = requiredFixtureTileCommand(state, "BUILD_LUMBER_CAMP");
  state = settleFixtureChoices(applyFixtureCommand(state, first));
  const second = queryPlayerCommandsV7(
    viewForV7(state, state.humanPlayerId),
  ).find(
    (command) =>
      command.kind === "BUILD_LUMBER_CAMP" &&
      Math.max(
        Math.abs(command.at.x - first.at.x),
        Math.abs(command.at.y - first.at.y),
      ) === 1,
  );
  if (second === undefined || !("at" in second))
    throw new Error("Adjacent Lumber Camp missing");
  state = settleFixtureChoices(applyFixtureCommand(state, second));
  return { state, target: first.at };
}

function withResearchV7(
  state: GameStateV7,
  technologies: readonly string[],
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            researchedTechs: player.researchedTechs.filter((technology) =>
              technologies.includes(technology),
            ),
            achievementEntitlements: player.achievementEntitlements.map(
              (entitlement) => ({
                ...entitlement,
                unlocked: false,
                spent: false,
              }),
            ),
          }
        : player,
    ),
  });
}

function richFixture(seed: number): GameStateV7 {
  return richV7(allTechsV7(exploredAllV7(initialV7(seed))), 1_000);
}

function requiredFixtureTileCommand(
  state: GameStateV7,
  kind: "BUILD_MINE" | "BUILD_WORKSHOP" | "BUILD_LUMBER_CAMP",
): Extract<CommandV7, { readonly at: CoordV7 }> {
  const command = queryPlayerCommandsV7(
    viewForV7(state, state.humanPlayerId),
  ).find((candidate) => candidate.kind === kind);
  if (command === undefined || !("at" in command))
    throw new Error(`${kind} fixture command missing`);
  return command;
}

function requiredFixtureChoice(
  state: GameStateV7,
): Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }> {
  return required(
    queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)).find(
      (
        command,
      ): command is Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }> =>
        command.kind === "CHOOSE_CITY_REWARD",
    ),
    "City reward fixture command missing",
  );
}

function applyFixtureCommand(
  state: GameStateV7,
  command: CommandV7,
): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

function settleFixtureChoices(source: GameStateV7): GameStateV7 {
  let state = source;
  while (state.pendingChoices.length > 0) {
    const choice = requiredFixtureChoice(state);
    state = applyFixtureCommand(state, choice);
  }
  return state;
}

function navalRedevelopmentView(improvement: "PORT" | "SHIPYARD"): {
  readonly view: PlayerViewV7;
  readonly target: CoordV7;
} {
  const state = exploredAllV7(allTechsV7(initialV7(17)));
  const base = viewForV7(state, state.humanPlayerId);
  const city = base.cities.find((item) => item.ownerId === base.viewer.id);
  const target = base.board.tiles.find(
    (tile) =>
      tile.explored &&
      tile.territoryCityId === city?.id &&
      tile.site === null &&
      (tile.at.x !== city?.at.x || tile.at.y !== city.at.y),
  )?.at;
  if (city === undefined || target === undefined)
    throw new Error("naval redevelopment target missing");
  return {
    target,
    view: {
      ...base,
      viewer: { ...base.viewer, coins: 1_000 },
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === target.x && tile.at.y === target.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement,
              }
            : tile,
        ),
      },
    },
  };
}

function multiCityMonumentRedevelopmentView(): {
  readonly view: PlayerViewV7;
  readonly target: CoordV7;
} {
  const state = exploredAllV7(initialV7(0));
  const base = viewForV7(state, state.humanPlayerId);
  const ownCity = base.cities.find((city) => city.ownerId === base.viewer.id);
  const otherCity = base.cities.find((city) => city.ownerId !== base.viewer.id);
  if (ownCity === undefined || otherCity === undefined)
    throw new Error("two cities missing");
  const developmentTiles = base.board.tiles.flatMap((tile) =>
    tile.explored && tile.territoryCityId !== null && tile.site === null
      ? [tile]
      : [],
  );
  const firstOpen = developmentTiles.find(
    (tile) => tile.territoryCityId === ownCity.id,
  )?.at;
  const target = developmentTiles.find(
    (tile) => tile.territoryCityId === otherCity.id,
  )?.at;
  if (firstOpen === undefined || target === undefined)
    throw new Error("two-city development tiles missing");
  return {
    target,
    view: {
      ...base,
      viewer: {
        ...base.viewer,
        coins: 1_000,
        researchedTechs: ["GATHERING", "ENGINEERING", "ENGINEERING"],
        achievementEntitlements: base.viewer.achievementEntitlements.map(
          (entitlement) =>
            entitlement.achievement === "ENGINEER"
              ? { ...entitlement, unlocked: true, spent: false }
              : { ...entitlement, unlocked: false, spent: false },
        ),
      },
      leaderboard: base.leaderboard.map((entry) =>
        entry.isViewer ? { ...entry, cityCount: 2 } : entry,
      ),
      cities: base.cities.map((city) => ({
        ...city,
        ownerId: base.viewer.id,
      })),
      units: base.units.map((unit) => ({
        ...unit,
        ownerId: base.viewer.id,
      })),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) => {
          if (!tile.explored || tile.territoryCityId === null) return tile;
          if (tile.site !== null)
            return { ...tile, territoryOwnerId: base.viewer.id };
          const open = same(tile.at, firstOpen);
          const selected = same(tile.at, target);
          return {
            ...tile,
            biome:
              open || selected ? ("PLAINS" as const) : ("HIGHLANDS" as const),
            terrain:
              open || selected ? ("GRASS" as const) : ("MOUNTAIN" as const),
            resource: null,
            improvement: open
              ? null
              : selected
                ? ("MONUMENT" as const)
                : ("MINE" as const),
            road: true,
            territoryOwnerId: base.viewer.id,
          };
        }),
      },
    },
  };
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

/** Revision 12: give the human Gathering so the free opener is already spent. */
function pastFreeOpenerV7(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, researchedTechs: ["GATHERING"] }
        : player,
    ),
  });
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
