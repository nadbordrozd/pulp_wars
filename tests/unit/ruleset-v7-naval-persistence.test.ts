import { describe, expect, it } from "vitest";
import {
  appendReplayCommandV7,
  applyCommandV7,
  createPlayableGameV7,
  createReplayV7,
  compareCommandsV7,
  parseCommandV7,
  parseGameStateV7,
  parseMatchSetupV7,
  queryPlayerCommandsV7,
  runReplayV7,
  viewForV7,
  type CommandV7,
  type UnitId,
} from "../../src/engine/index";
import { headlessV7, runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import { setupV7 } from "../fixtures/v7-builders";
import { withPortV7 } from "../fixtures/v7-naval-builders";

describe("ruleset-7 naval persistence schema", () => {
  it("round-trips the r6 map type, Port resource coexistence, and naval unit form", () => {
    const fixture = withPortV7(9501);
    const encoded = JSON.stringify(fixture.state);
    const parsed = parseGameStateV7(JSON.parse(encoded));
    expect(parsed).toEqual(fixture.state);
    expect(parseMatchSetupV7(fixture.state.setup)).toEqual(fixture.state.setup);
    expect(fixture.state.setup).toMatchObject({
      rulesetId: "pulp-wars-poc-7r10",
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    });
  });

  it("strictly parses the current naval command boundaries", () => {
    for (const command of [
      { kind: "HARVEST_FISH", at: { x: 1, y: 2 } },
      { kind: "GATHER_PEARLS", at: { x: 1, y: 2 } },
      { kind: "BUILD_PORT", at: { x: 1, y: 2 } },
      {
        kind: "TRAIN_NAVAL",
        cityId: 1,
        at: { x: 1, y: 2 },
        role: "PATROL_BOAT",
      },
      { kind: "DISEMBARK", unitId: 2, at: { x: 1, y: 2 } },
    ])
      expect(parseCommandV7(command)).toMatchObject({ ok: true });
    expect(
      parseCommandV7({
        kind: "TRAIN_NAVAL",
        cityId: 1,
        at: { x: 1, y: 2 },
        role: "FIGHTER",
      }),
    ).toMatchObject({ ok: false });
  });

  it("orders otherwise identical moves by destination coordinate", () => {
    const unitId = 9 as UnitId;
    const reverse: CommandV7[] = [
      { kind: "MOVE", unitId, path: [{ x: 10, y: 2 }] },
      { kind: "MOVE", unitId, path: [{ x: 2, y: 2 }] },
    ];
    expect(reverse.sort(compareCommandsV7)).toEqual([
      { kind: "MOVE", unitId, path: [{ x: 2, y: 2 }] },
      { kind: "MOVE", unitId, path: [{ x: 10, y: 2 }] },
    ]);
  });

  it("round-trips saves, replays, and the headless API at every naval command boundary", async () => {
    const setup = { ...setupV7(0), mapType: "CONTINENTS" as const };
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const navalKinds = new Set<CommandV7["kind"]>([
      "HARVEST_FISH",
      "BUILD_PORT",
      "TRAIN_NAVAL",
      "DISEMBARK",
    ]);
    const accept = async (command: CommandV7): Promise<void> => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active player missing");
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${JSON.stringify(result.error)}`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      if (!navalKinds.has(command.kind)) return;
      const save = createSaveEnvelopeV7(
        { state, replay },
        "2026-09-23T00:00:00.000Z",
      );
      expect(parseSaveV7(JSON.stringify(save))).toMatchObject({
        kind: "VALID",
      });
      expect(runReplayV7(replay).state).toEqual(state);
      expect((await headlessV7.run(replay)).state).toEqual(state);
    };
    await accept({ kind: "END_TURN" });
    await accept({ kind: "RESEARCH", tech: "SHORECRAFT" });
    const fish = state.board.tiles.find(
      (tile) =>
        tile.resource === "FISH" &&
        state.cities.some(
          (city) =>
            city.ownerId === state.humanPlayerId &&
            city.id === tile.territoryCityId,
        ),
    );
    if (fish === undefined) throw new Error("owned Fish missing");
    await accept({ kind: "HARVEST_FISH", at: fish.at });
    while (
      (state.players.find((player) => player.id === state.humanPlayerId)
        ?.coins ?? 0) < 4 ||
      state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId
    )
      await accept({ kind: "END_TURN" });
    await accept({ kind: "BUILD_PORT", at: fish.at });
    const choice = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    ).find(
      (command) =>
        command.kind === "CHOOSE_CITY_REWARD" && command.reward === "STOCKPILE",
    );
    if (choice !== undefined) await accept(choice);
    while (
      (state.players.find((player) => player.id === state.humanPlayerId)
        ?.coins ?? 0) < 5 ||
      state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId
    )
      await accept({ kind: "END_TURN" });
    const city = state.cities.find(
      (candidate) => candidate.ownerId === state.humanPlayerId,
    );
    if (city === undefined) throw new Error("owned city missing");
    await accept({
      kind: "TRAIN_NAVAL",
      cityId: city.id,
      at: fish.at,
      role: "PATROL_BOAT",
    });
    do await accept({ kind: "END_TURN" });
    while (state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId);
    const commands = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    );
    const ship = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId && unit.form === "NAVAL",
    );
    const passenger = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId && unit.form === "LAND",
    );
    if (ship === undefined || passenger === undefined)
      throw new Error("units missing");
    const sail = commands.find(
      (command) => command.kind === "MOVE" && command.unitId === ship.id,
    );
    if (sail === undefined) throw new Error("ship move missing");
    await accept(sail);
    const embarkMove = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    ).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === passenger.id &&
        command.path.at(-1)?.x === fish.at.x &&
        command.path.at(-1)?.y === fish.at.y,
    );
    if (embarkMove === undefined) throw new Error("embark move missing");
    await accept(embarkMove);
    do await accept({ kind: "END_TURN" });
    while (state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId);
    const land = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    ).find(
      (command) =>
        command.kind === "DISEMBARK" && command.unitId === passenger.id,
    );
    if (land === undefined) throw new Error("landing missing");
    await accept(land);

    const pearlSetup = { ...setupV7(27), mapType: "CONTINENTS" as const };
    const pearlCreated = createPlayableGameV7(pearlSetup);
    if (!pearlCreated.ok) throw new Error(pearlCreated.error.code);
    state = pearlCreated.state;
    replay = createReplayV7(pearlSetup);
    while (state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId)
      await accept({ kind: "END_TURN" });
    await accept({ kind: "RESEARCH", tech: "SHORECRAFT" });
    while (
      (state.players.find((player) => player.id === state.humanPlayerId)
        ?.coins ?? 0) < 7
    ) {
      await accept({ kind: "END_TURN" });
      while (state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId)
        await accept({ kind: "END_TURN" });
    }
    await accept({ kind: "RESEARCH", tech: "NAVIGATION" });
    while (
      (state.players.find((player) => player.id === state.humanPlayerId)
        ?.coins ?? 0) < 2
    ) {
      await accept({ kind: "END_TURN" });
      while (state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId)
        await accept({ kind: "END_TURN" });
    }
    const pearls = state.board.tiles.find(
      (tile) =>
        tile.resource === "PEARLS" &&
        state.cities.some(
          (candidate) =>
            candidate.ownerId === state.humanPlayerId &&
            candidate.id === tile.territoryCityId,
        ),
    );
    if (pearls === undefined) throw new Error("owned Pearls missing");
    navalKinds.add("GATHER_PEARLS");
    await accept({ kind: "GATHER_PEARLS", at: pearls.at });
  });

  it("round-trips a bounded AI naval match through save and replay", () => {
    const setup = { ...setupV7(0), mapType: "ARCHIPELAGO" as const };
    const match = runAiMatchV7(setup, { maxRounds: 10, maxCommands: 300 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active player missing");
      const applied = applyCommandV7(state, actor, record.command);
      if (!applied.accepted) throw new Error(applied.error.code);
      state = applied.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(state.pendingChoices).toEqual([]);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-23T00:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(runReplayV7(replay).state).toEqual(state);
  });

  it("rejects malformed water layers, unit domains, deep access, and Port ledgers", () => {
    const fixture = withPortV7(9502);
    const portIndex = fixture.state.board.tiles.findIndex(
      (tile) =>
        tile.at.x === fixture.portAt.x && tile.at.y === fixture.portAt.y,
    );
    const unitIndex = fixture.state.units.findIndex(
      (unit) => unit.ownerId === fixture.state.humanPlayerId,
    );
    expect(portIndex).toBeGreaterThanOrEqual(0);
    expect(unitIndex).toBeGreaterThanOrEqual(0);
    for (const patch of [
      { road: true },
      { site: "VILLAGE" },
      { improvement: "FARM" },
    ]) {
      const malformed = structuredClone(fixture.state);
      Object.assign(malformed.board.tiles[portIndex] as object, patch);
      expect(parseGameStateV7(malformed)).toBeNull();
    }
    const wrongDomain = structuredClone(fixture.state);
    Object.assign(wrongDomain.units[unitIndex] as object, {
      at: fixture.portAt,
      role: "PATROL_BOAT",
      form: "NAVAL",
    });
    expect(parseGameStateV7(wrongDomain)).not.toBeNull();
    Object.assign(wrongDomain.units[unitIndex] as object, {
      at: wrongDomain.cities.find(
        (city) => city.ownerId === fixture.state.humanPlayerId,
      )?.at,
    });
    expect(parseGameStateV7(wrongDomain)).toBeNull();

    const deepWithoutNavigation = structuredClone(fixture.state);
    Object.assign(deepWithoutNavigation.board.tiles[portIndex] as object, {
      improvement: null,
      terrain: "DEEP_WATER",
    });
    Object.assign(deepWithoutNavigation.units[unitIndex] as object, {
      at: fixture.portAt,
      role: "PATROL_BOAT",
      form: "NAVAL",
    });
    Object.assign(deepWithoutNavigation, {
      players: deepWithoutNavigation.players.map((player) =>
        player.id === fixture.state.humanPlayerId
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) => tech !== "NAVIGATION",
              ),
            }
          : player,
      ),
      populationContributions:
        deepWithoutNavigation.populationContributions.filter(
          (entry) =>
            entry.source.at.x !== fixture.portAt.x ||
            entry.source.at.y !== fixture.portAt.y,
        ),
    });
    const city = deepWithoutNavigation.cities.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    if (city !== undefined)
      Object.assign(city, {
        economicPopulation: city.economicPopulation - 1,
        population: city.population - 1,
      });
    expect(parseGameStateV7(deepWithoutNavigation)).toBeNull();

    const wrongLedger = structuredClone(fixture.state);
    const ledger = wrongLedger.populationContributions.find(
      (entry) =>
        entry.source.kind === "IMPROVEMENT" &&
        entry.source.improvement === "PORT",
    );
    if (ledger === undefined) throw new Error("Port ledger missing");
    Object.assign(ledger, { amount: 0 });
    expect(parseGameStateV7(wrongLedger)).toBeNull();
  });
});
