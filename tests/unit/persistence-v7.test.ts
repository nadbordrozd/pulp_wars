import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  appendReplayCommandV7,
  applyCommandV7,
  cachedAcceptedReplayStateHashV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseReplayFileV7,
  queryPlayerCommandsV7,
  runReplayV7,
  isAcceptedStateCertificateV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type ReplayFileV7,
} from "../../src/engine/index";
import {
  createSaveEnvelopeV7,
  parseSaveV7,
  type SaveInputV7,
} from "../../src/persistence/index";

const setup: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 42,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL"],
  mapGenerationRevision: "SPATIAL_ECONOMY",
};

describe("ruleset-7 save and replay foundation", () => {
  it("uses an independent v7 save key and round-trips a canonical initial save", () => {
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r3.current");
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(save.stateHash).toBe(canonicalHash(created.state));
    const active = created.state.turnOrder[created.state.activeSeatIndex];
    expect(created.state.commandIndex).toBe(0);
    expect(
      created.state.players.find((player) => player.id === active)?.coins,
    ).toBe(7);
    expect(
      created.state.players
        .filter((player) => player.id !== active)
        .map((player) => player.coins),
    ).toEqual([5]);
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: 0,
      state: created.state,
      stateHash: save.stateHash,
    });
  });

  it("round-trips a command-bearing v7 save through reducer replay", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");
    const applied = applyCommandV7(created.state, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    if (!applied.accepted) throw new Error(applied.error.code);
    const replay = appendReplayCommandV7(
      createReplayV7(setup),
      { kind: "RESEARCH", tech: "HUNTING" },
      applied.state,
    );
    const save = createSaveEnvelopeV7(
      { state: applied.state, replay },
      "2026-09-06T12:30:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(runReplayV7(replay).state).toEqual(applied.state);
  });

  it("preserves exactly one remaining Horse Archer shot through save and replay", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const humanId = state.humanPlayerId;
    const enemy = required(
      state.units.find((unit) => unit.ownerId !== humanId),
      "enemy unit missing",
    );
    const accept = (command: CommandV7) => {
      const actor = required(
        state.turnOrder[state.activeSeatIndex],
        "active actor missing",
      );
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      return result;
    };
    const fundHuman = (minimum: number) => {
      for (let guard = 0; guard < 100; guard += 1) {
        const actor = state.turnOrder[state.activeSeatIndex];
        const coins = state.players.find(
          (player) => player.id === humanId,
        )?.coins;
        if (actor === humanId && coins !== undefined && coins >= minimum)
          return;
        accept({ kind: "END_TURN" });
      }
      throw new Error("Horse Archer funding guard exhausted");
    };
    fundHuman(5);
    accept({ kind: "RESEARCH", tech: "SCOUTING" });
    fundHuman(7);
    accept({ kind: "RESEARCH", tech: "RAIDING" });
    fundHuman(9);
    accept({ kind: "RESEARCH", tech: "MOUNTED_ARCHERY" });
    fundHuman(9);
    const city = required(
      state.cities.find((candidate) => candidate.ownerId === humanId),
      "human city missing",
    );
    const cityOccupant = state.units.find(
      (unit) => unit.at.x === city.at.x && unit.at.y === city.at.y,
    );
    const spotterId = required(cityOccupant?.id, "human spotter missing");
    if (cityOccupant !== undefined) {
      const clearCity = required(
        queryPlayerCommandsV7(viewForV7(state, humanId)).find(
          (command) =>
            command.kind === "MOVE" && command.unitId === cityOccupant.id,
        ),
        "city-clearing move missing",
      );
      accept(clearCity);
    }
    const trained = accept({
      kind: "TRAIN",
      cityId: city.id,
      role: "HORSE_ARCHER",
    });
    const horseArcherId = required(
      trained.events.find((event) => event.kind === "UNIT_TRAINED")?.unitId,
      "trained Horse Archer missing",
    );
    accept({ kind: "END_TURN" });
    while (state.turnOrder[state.activeSeatIndex] !== humanId)
      accept({ kind: "END_TURN" });

    let fired = false;
    for (let guard = 0; guard < 20; guard += 1) {
      const horseArcher = required(
        state.units.find((unit) => unit.id === horseArcherId),
        "Horse Archer disappeared",
      );
      const attack = queryPlayerCommandsV7(viewForV7(state, humanId)).find(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === horseArcherId &&
          command.targetUnitId === enemy.id,
      );
      if (attack?.kind === "ATTACK") {
        accept(attack);
        fired = true;
        break;
      }
      if (chebyshev(horseArcher.at, enemy.at) > 2) {
        const move = queryPlayerCommandsV7(viewForV7(state, humanId))
          .filter(
            (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
              command.kind === "MOVE" && command.unitId === horseArcherId,
          )
          .sort(
            (left, right) =>
              Math.abs(chebyshev(moveEndpoint(left), enemy.at) - 2) -
                Math.abs(chebyshev(moveEndpoint(right), enemy.at) - 2) ||
              left.path.length - right.path.length,
          )[0];
        if (move === undefined) throw new Error("Horse Archer route stalled");
        accept(move);
      }
      const movedAttack = queryPlayerCommandsV7(viewForV7(state, humanId)).find(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === horseArcherId &&
          command.targetUnitId === enemy.id,
      );
      if (movedAttack?.kind === "ATTACK") {
        accept(movedAttack);
        fired = true;
        break;
      }
      const spotterMove = queryPlayerCommandsV7(viewForV7(state, humanId))
        .filter(
          (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
            command.kind === "MOVE" && command.unitId === spotterId,
        )
        .sort(
          (left, right) =>
            chebyshev(moveEndpoint(left), enemy.at) -
              chebyshev(moveEndpoint(right), enemy.at) ||
            left.path.length - right.path.length,
        )[0];
      if (spotterMove !== undefined) accept(spotterMove);
      const spottedAttack = queryPlayerCommandsV7(
        viewForV7(state, humanId),
      ).find(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === horseArcherId &&
          command.targetUnitId === enemy.id,
      );
      if (spottedAttack?.kind === "ATTACK") {
        accept(spottedAttack);
        fired = true;
        break;
      }
      accept({ kind: "END_TURN" });
      while (state.turnOrder[state.activeSeatIndex] !== humanId)
        accept({ kind: "END_TURN" });
    }

    if (!fired) {
      const horse = state.units.find((unit) => unit.id === horseArcherId);
      throw new Error(
        `Horse Archer never fired: ${JSON.stringify({ horse: horse?.at, enemy: enemy.at, distance: horse === undefined ? null : chebyshev(horse.at, enemy.at) })}`,
      );
    }

    const afterFirst = required(
      state.units.find((unit) => unit.id === horseArcherId),
      "Horse Archer missing after first shot",
    );
    expect(afterFirst.activation).toMatchObject({
      attacked: true,
      attacksUsed: 1,
      handled: false,
    });
    const firstSave = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-06T12:45:00.000Z",
    );
    const parsedFirst = parseSaveV7(JSON.stringify(firstSave));
    expect(parsedFirst).toEqual({ kind: "VALID", save: firstSave });
    if (parsedFirst.kind !== "VALID") throw new Error("first save invalid");
    expect(
      parsedFirst.save.state.units.find((unit) => unit.id === horseArcherId)
        ?.activation.attacksUsed,
    ).toBe(1);
    expect(runReplayV7(replay).state).toEqual(state);

    const second = required(
      queryPlayerCommandsV7(viewForV7(state, humanId)).find(
        (command) =>
          command.kind === "ATTACK" && command.unitId === horseArcherId,
      ),
      "second Horse Archer shot missing",
    );
    accept(second);
    expect(
      state.units.find((unit) => unit.id === horseArcherId)?.activation,
    ).toMatchObject({ attacksUsed: 2, handled: true });
    expect(
      queryPlayerCommandsV7(viewForV7(state, humanId)).some(
        (command) =>
          command.kind === "ATTACK" && command.unitId === horseArcherId,
      ),
    ).toBe(false);
    const secondSave = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-06T12:46:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(secondSave))).toEqual({
      kind: "VALID",
      save: secondSave,
    });
    expect(runReplayV7(replay).state).toEqual(state);
  }, 15_000);

  it("reuses only exact immutable accepted-boundary identities without changing save bytes", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(isAcceptedStateCertificateV7(created.state)).toBe(false);
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");
    const command = { kind: "RESEARCH", tech: "HUNTING" } as const;
    const applied = applyCommandV7(created.state, actor, command);
    if (!applied.accepted) throw new Error(applied.error.code);
    const replay = appendReplayCommandV7(
      createReplayV7(setup),
      command,
      applied.state,
    );
    const expectedHash = canonicalHash(applied.state);

    expect(isAcceptedStateCertificateV7(applied.state)).toBe(true);
    expect(Object.isFrozen(applied.state)).toBe(true);
    expect(Object.isFrozen(applied.state.board.tiles)).toBe(true);
    expect(Object.isFrozen(applied.state.board.tiles[0])).toBe(true);
    expect(Object.isFrozen(replay)).toBe(true);
    expect(Object.isFrozen(replay.commands)).toBe(true);
    expect(Object.isFrozen(replay.commands[0])).toBe(true);
    expect(Object.isFrozen(replay.checkpoints)).toBe(true);
    expect(Object.isFrozen(replay.checkpoints[0])).toBe(true);
    expect(cachedAcceptedReplayStateHashV7(replay, applied.state)).toBe(
      expectedHash,
    );

    const clonedState = structuredClone(applied.state);
    const clonedReplay = structuredClone(replay);
    const shallowFrozenState = Object.freeze(structuredClone(applied.state));
    const shallowFrozenReplay = Object.freeze(structuredClone(replay));
    expect(isAcceptedStateCertificateV7(clonedState)).toBe(false);
    expect(isAcceptedStateCertificateV7(shallowFrozenState)).toBe(false);
    expect(cachedAcceptedReplayStateHashV7(clonedReplay, applied.state)).toBe(
      null,
    );
    expect(
      cachedAcceptedReplayStateHashV7(shallowFrozenReplay, applied.state),
    ).toBe(null);
    expect(cachedAcceptedReplayStateHashV7(replay, clonedState)).toBe(null);
    expect(cachedAcceptedReplayStateHashV7(replay, shallowFrozenState)).toBe(
      null,
    );

    const savedAt = "2026-09-06T12:30:00.000Z";
    const cachedSave = createSaveEnvelopeV7(
      { state: applied.state, replay },
      savedAt,
    );
    let certifiedStateReads = 0;
    let certifiedReplayReads = 0;
    const certifiedThenMalformed: SaveInputV7 = {
      get state() {
        certifiedStateReads += 1;
        return certifiedStateReads === 1
          ? applied.state
          : ({ schemaVersion: 7 } as GameStateV7);
      },
      get replay() {
        certifiedReplayReads += 1;
        return certifiedReplayReads === 1
          ? replay
          : ({ format: "pulp-wars-replay" } as ReplayFileV7);
      },
    };
    expect(
      JSON.stringify(createSaveEnvelopeV7(certifiedThenMalformed, savedAt)),
    ).toBe(JSON.stringify(cachedSave));
    expect(certifiedStateReads).toBe(1);
    expect(certifiedReplayReads).toBe(1);

    const fullyValidatedSave = createSaveEnvelopeV7(
      { state: clonedState, replay: clonedReplay },
      savedAt,
    );
    expect(JSON.stringify(cachedSave)).toBe(JSON.stringify(fullyValidatedSave));
    expect(
      JSON.stringify(
        createSaveEnvelopeV7(
          { state: shallowFrozenState, replay: clonedReplay },
          savedAt,
        ),
      ),
    ).toBe(JSON.stringify(cachedSave));

    let untrustedStateReads = 0;
    let untrustedReplayReads = 0;
    const malformedThenCertified: SaveInputV7 = {
      get state() {
        untrustedStateReads += 1;
        return untrustedStateReads === 1
          ? ({ schemaVersion: 7 } as GameStateV7)
          : applied.state;
      },
      get replay() {
        untrustedReplayReads += 1;
        return untrustedReplayReads === 1
          ? ({ format: "pulp-wars-replay" } as ReplayFileV7)
          : replay;
      },
    };
    expect(() => createSaveEnvelopeV7(malformedThenCertified, savedAt)).toThrow(
      "Invalid ruleset-7 save input",
    );
    expect(untrustedStateReads).toBe(1);
    expect(untrustedReplayReads).toBe(1);

    const malformedCommandReplay = structuredClone(replay) as unknown as {
      commands: Array<{ kind: string }>;
    };
    const firstCommand = malformedCommandReplay.commands[0];
    if (firstCommand === undefined) throw new Error("first command missing");
    firstCommand.kind = "UNTRUSTED_COMMAND";
    expect(() =>
      createSaveEnvelopeV7(
        {
          state: applied.state,
          replay: malformedCommandReplay as unknown as ReplayFileV7,
        },
        savedAt,
      ),
    ).toThrow("Invalid ruleset-7 save input");

    const malformedCheckpointReplay = structuredClone(replay) as unknown as {
      checkpoints: Array<{ index: number }>;
    };
    const firstCheckpoint = malformedCheckpointReplay.checkpoints[0];
    if (firstCheckpoint === undefined)
      throw new Error("first checkpoint missing");
    firstCheckpoint.index = 99;
    expect(() =>
      createSaveEnvelopeV7(
        {
          state: applied.state,
          replay: malformedCheckpointReplay as unknown as ReplayFileV7,
        },
        savedAt,
      ),
    ).toThrow("Invalid ruleset-7 save input");

    const malformedSetupReplay = structuredClone(replay) as unknown as {
      setup: { rulesetId: string };
    };
    malformedSetupReplay.setup.rulesetId = "pulp-wars-poc-7";
    expect(() =>
      createSaveEnvelopeV7(
        {
          state: applied.state,
          replay: malformedSetupReplay as unknown as ReplayFileV7,
        },
        savedAt,
      ),
    ).toThrow("Invalid ruleset-7 save input");

    const nextApplied = applyCommandV7(applied.state, actor, {
      kind: "END_TURN",
    });
    if (!nextApplied.accepted) throw new Error(nextApplied.error.code);
    const nextReplay = appendReplayCommandV7(
      replay,
      { kind: "END_TURN" },
      nextApplied.state,
    );
    expect(cachedAcceptedReplayStateHashV7(replay, nextApplied.state)).toBe(
      null,
    );
    expect(cachedAcceptedReplayStateHashV7(nextReplay, applied.state)).toBe(
      null,
    );
    expect(cachedAcceptedReplayStateHashV7(nextReplay, nextApplied.state)).toBe(
      canonicalHash(nextApplied.state),
    );

    const mutatedState = structuredClone(applied.state) as unknown as {
      players: Array<{ coins: number }>;
    };
    const firstPlayer = mutatedState.players[0];
    if (firstPlayer === undefined) throw new Error("first player missing");
    firstPlayer.coins = -1;
    expect(() =>
      createSaveEnvelopeV7(
        {
          state: mutatedState as unknown as GameStateV7,
          replay,
        },
        savedAt,
      ),
    ).toThrow("Invalid ruleset-7 save input");
  });

  // This integration-style case rebuilds five replay checkpoints, so its
  // timeout is intentionally local rather than changing the global budget.
  it("naturally saves and replays every Blackout and recovery phase", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const humanId = state.humanPlayerId;
    const seatCount = state.turnOrder.length;
    const targetCity = state.cities.find((city) => city.ownerId !== humanId);
    if (targetCity === undefined) throw new Error("target city missing");
    const accept = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active actor missing");
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      return result.events;
    };
    const checkpoint = (phase: "PENDING" | "ACTIVE" | "RECOVERY" | null) => {
      expect(
        state.cities.find((city) => city.id === targetCity.id)?.blackout
          ?.phase ?? null,
      ).toBe(phase);
      const save = createSaveEnvelopeV7(
        { state, replay },
        `2026-09-07T20:00:0${phase === null ? 4 : phase.length % 4}.000Z`,
      );
      const parsed = parseSaveV7(JSON.stringify(save));
      expect(parsed).toEqual({
        kind: "VALID",
        save,
      });
      if (phase === "PENDING") {
        if (parsed.kind !== "VALID") throw new Error(parsed.diagnostic);
        const beforeVisibility = required(
          viewForV7(state, targetCity.ownerId).units.find(
            (unit) => unit.id === trainedId,
          )?.visibility,
          "live exposure visibility missing",
        );
        expect(beforeVisibility.exposures).toEqual([
          expect.objectContaining({
            reason: "BLACKOUT",
            boundary: expect.objectContaining({
              kind: "ANCHOR_NEXT_ACCEPTED_END_TURN",
              anchorPlayerId: targetCity.ownerId,
            }),
          }),
        ]);
        expect(
          viewForV7(parsed.save.state, targetCity.ownerId).units.find(
            (unit) => unit.id === trainedId,
          )?.visibility,
        ).toEqual(beforeVisibility);
      }
      expect(runReplayV7(replay)).toMatchObject({
        acceptedCommands: replay.commands.length,
        state,
        stateHash: canonicalHash(state),
      });
    };

    let trainedId: number | null = null;
    let starterMoved = false;
    const researchOrder = ["HUNTING", "MARKSMANSHIP", "FIELDCRAFT"] as const;
    for (let guard = 0; guard < 100 && trainedId === null; guard += 1) {
      const actor = required(
        state.turnOrder[state.activeSeatIndex],
        "active actor missing",
      );
      if (actor === humanId) {
        const commands = queryPlayerCommandsV7(viewForV7(state, actor));
        if (!starterMoved) {
          const starter = required(
            state.units.find((unit) => unit.ownerId === actor),
            "starter unit missing",
          );
          const move = commands.find(
            (command) =>
              command.kind === "MOVE" && command.unitId === starter.id,
          );
          if (move?.kind === "MOVE") {
            accept(move);
            starterMoved = true;
          }
        }
        const player = required(
          state.players.find((candidate) => candidate.id === actor),
          "active player missing",
        );
        const nextTech = researchOrder.find(
          (technology) => !player.researchedTechs.includes(technology),
        );
        if (nextTech !== undefined) {
          const research = queryPlayerCommandsV7(viewForV7(state, actor)).find(
            (command) =>
              command.kind === "RESEARCH" && command.tech === nextTech,
          );
          if (research?.kind === "RESEARCH") accept(research);
        } else {
          const train = queryPlayerCommandsV7(viewForV7(state, actor)).find(
            (command) =>
              command.kind === "TRAIN" && command.role === "SABOTEUR",
          );
          if (train?.kind === "TRAIN") {
            const events = accept(train);
            trainedId =
              events.find((event) => event.kind === "UNIT_TRAINED")?.unitId ??
              null;
          }
        }
      }
      if (trainedId === null) accept({ kind: "END_TURN" });
    }
    if (trainedId === null)
      throw new Error("Saboteur training guard exhausted");
    accept({ kind: "END_TURN" });

    let planted = false;
    for (let guard = 0; guard < 160 && !planted; guard += 1) {
      const actor = required(
        state.turnOrder[state.activeSeatIndex],
        "active actor missing",
      );
      const saboteur = state.units.find((unit) => unit.id === trainedId);
      if (saboteur === undefined) throw new Error("Saboteur disappeared");
      if (actor === humanId) {
        if (chebyshev(saboteur.at, targetCity.at) !== 1) {
          const move = queryPlayerCommandsV7(viewForV7(state, humanId))
            .filter(
              (
                command,
              ): command is Extract<
                CommandV7,
                { readonly path: readonly CoordV7[] }
              > => command.kind === "MOVE" && command.unitId === saboteur.id,
            )
            .sort(
              (left, right) =>
                chebyshev(moveEndpoint(left), targetCity.at) -
                  chebyshev(moveEndpoint(right), targetCity.at) ||
                left.path.length - right.path.length,
            )[0];
          if (move === undefined) throw new Error("Saboteur route stalled");
          accept(move);
        }
        const current = required(
          state.units.find((unit) => unit.id === trainedId),
          "trained Saboteur missing",
        );
        if (chebyshev(current.at, targetCity.at) === 1) {
          const result = applyCommandV7(state, humanId, {
            kind: "BLACKOUT_CITY",
            unitId: current.id,
            cityId: targetCity.id,
          });
          if (result.accepted) {
            state = result.state;
            replay = appendReplayCommandV7(
              replay,
              {
                kind: "BLACKOUT_CITY",
                unitId: current.id,
                cityId: targetCity.id,
              },
              state,
            );
            planted = true;
            break;
          }
          if (result.error.code !== "SABOTEUR_DETECTED")
            throw new Error(`BLACKOUT_CITY: ${result.error.code}`);
        }
      } else {
        const enemy = state.units.find((unit) => unit.ownerId === actor);
        if (enemy !== undefined) {
          const moves = queryPlayerCommandsV7(viewForV7(state, actor))
            .filter(
              (
                command,
              ): command is Extract<
                CommandV7,
                { readonly path: readonly CoordV7[] }
              > => command.kind === "MOVE" && command.unitId === enemy.id,
            )
            .sort(
              (left, right) =>
                chebyshev(moveEndpoint(right), targetCity.at) -
                  chebyshev(moveEndpoint(left), targetCity.at) ||
                chebyshev(moveEndpoint(right), saboteur.at) -
                  chebyshev(moveEndpoint(left), saboteur.at),
            );
          const move = moves[0];
          if (move !== undefined) accept(move);
        }
      }
      accept({ kind: "END_TURN" });
    }
    if (!planted) throw new Error("Blackout planting guard exhausted");
    checkpoint("PENDING");

    const blackoutPhase = () =>
      state.cities.find((city) => city.id === targetCity.id)?.blackout?.phase ??
      null;
    for (
      let guard = 0;
      guard < seatCount && blackoutPhase() !== "ACTIVE";
      guard += 1
    )
      accept({ kind: "END_TURN" });
    if (blackoutPhase() !== "ACTIVE")
      throw new Error("Blackout activation seat window exhausted");
    checkpoint("ACTIVE");
    accept({ kind: "END_TURN" });
    checkpoint("RECOVERY");
    const recoveryTurnStarted = () => {
      const blackout = state.cities.find(
        (city) => city.id === targetCity.id,
      )?.blackout;
      return blackout?.phase === "RECOVERY" && blackout.unaffectedTurnStarted;
    };
    for (let guard = 0; guard < seatCount && !recoveryTurnStarted(); guard += 1)
      accept({ kind: "END_TURN" });
    if (!recoveryTurnStarted())
      throw new Error("Blackout recovery seat window exhausted");
    checkpoint("RECOVERY");
    accept({ kind: "END_TURN" });
    checkpoint(null);
  }, 15_000);

  it("naturally replays Muster unlock and its command-bearing Monument placement", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay: ReplayFileV7 = createReplayV7(setup);
    const humanId = state.humanPlayerId;
    const city = required(
      state.cities.find((candidate) => candidate.ownerId === humanId),
      "human city missing",
    );
    const apply = (command: CommandV7) => {
      const actor = required(
        state.turnOrder[state.activeSeatIndex],
        "active actor missing",
      );
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      return result.events;
    };
    const fundHuman = (coins: number) => {
      for (let guard = 0; guard < 100; guard += 1) {
        const active = state.turnOrder[state.activeSeatIndex];
        const human = state.players.find((player) => player.id === humanId);
        if (active === humanId && human !== undefined && human.coins >= coins)
          return;
        apply({ kind: "END_TURN" });
      }
      throw new Error("funding guard exhausted");
    };
    fundHuman(5);
    apply({ kind: "RESEARCH", tech: "SCOUTING" });
    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "RAIDING" });
    fundHuman(5);
    apply({ kind: "RESEARCH", tech: "DRILL" });
    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "FORTIFICATION" });
    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "FARMING" });
    const farmAt = required(
      state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.terrain === "GRASS" &&
          tile.resource === "FERTILE_GROUND" &&
          tile.improvement === null &&
          tile.site === null,
      )?.at,
      "natural farm missing",
    );
    fundHuman(5);
    apply({ kind: "BUILD_FARM", at: farmAt });
    apply({
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });

    const openTiles = () =>
      state.board.tiles.filter(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.terrain !== "MOUNTAIN" &&
          tile.resource === null &&
          tile.improvement === null &&
          !state.treasureChests.some(
            (chest) => chest.x === tile.at.x && chest.y === tile.at.y,
          ) &&
          !state.units.some(
            (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
          ),
      );

    const roles = ["SCOUT", "RAIDER", "GUARD"] as const;
    for (const role of roles) {
      fundHuman(role === "GUARD" ? 3 : 4);
      const occupant = required(
        state.units.find(
          (unit) =>
            unit.ownerId === humanId &&
            unit.at.x === city.at.x &&
            unit.at.y === city.at.y,
        ),
        "city occupant missing",
      );
      const destination = openTiles().find(
        (tile) => chebyshev(tile.at, city.at) === 1,
      )?.at;
      if (destination === undefined) throw new Error("movement tile missing");
      apply({ kind: "MOVE", unitId: occupant.id, path: [destination] });
      const events = apply({ kind: "TRAIN", cityId: city.id, role });
      if (role === "GUARD")
        expect(events).toContainEqual({
          kind: "ACHIEVEMENT_UNLOCKED",
          playerId: humanId,
          achievement: "MUSTER",
        });
    }

    const monumentAt = openTiles()[0]?.at;
    if (monumentAt === undefined) throw new Error("Monument tile missing");
    const monumentEvents = apply({
      kind: "BUILD_MONUMENT",
      achievement: "MUSTER",
      at: monumentAt,
    });
    expect(monumentEvents[0]).toMatchObject({
      kind: "MONUMENT_BUILT",
      achievement: "MUSTER",
      populationAdded: 3,
    });
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-07T17:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: replay.commands.length,
      state,
      stateHash: canonicalHash(state),
    });
  });

  it("replays natural Windmill dependency loss, marker restoration, and full-cost repair", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const humanId = state.humanPlayerId;
    const city = state.cities.find(
      (candidate) => candidate.ownerId === humanId,
    );
    if (city === undefined) throw new Error("human city missing");
    const farmTile = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.terrain === "GRASS" &&
        tile.resource === "FERTILE_GROUND" &&
        tile.improvement === null &&
        tile.site === null,
    );
    if (farmTile === undefined) throw new Error("natural farm missing");
    const windmillTile = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.resource === null &&
        tile.improvement === null &&
        tile.site === null &&
        Math.max(
          Math.abs(tile.at.x - farmTile.at.x),
          Math.abs(tile.at.y - farmTile.at.y),
        ) === 1,
    );
    if (windmillTile === undefined)
      throw new Error("natural mill site missing");

    const apply = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active actor missing");
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}:${result.error.code}`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      return result.events;
    };
    const fundHuman = (minimum: number) => {
      for (let guard = 0; guard < 100; guard += 1) {
        const active = state.turnOrder[state.activeSeatIndex];
        const coins = state.players.find(
          (player) => player.id === humanId,
        )?.coins;
        if (active === humanId && coins !== undefined && coins >= minimum)
          return;
        apply({ kind: "END_TURN" });
      }
      throw new Error("funding guard exhausted");
    };

    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "FARMING" });
    fundHuman(5);
    apply({ kind: "BUILD_FARM", at: farmTile.at });
    apply({
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    fundHuman(9);
    apply({ kind: "RESEARCH", tech: "MILLING" });
    fundHuman(5);
    apply({ kind: "BUILD_WINDMILL", at: windmillTile.at });
    fundHuman(5);
    apply({ kind: "RESEARCH", tech: "DRILL" });
    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "ENGINEERING" });
    fundHuman(9);
    apply({ kind: "RESEARCH", tech: "GRAND_WORKS" });
    const removedEvents = apply({ kind: "REDEVELOP", at: farmTile.at });
    expect(removedEvents).toContainEqual(
      expect.objectContaining({
        kind: "ECONOMIC_BUILDING_REMOVED",
        resourceRestored: "FERTILE_GROUND",
      }),
    );
    const damaged = state.cities.find((candidate) => candidate.id === city.id);
    expect(damaged).toMatchObject({
      level: 2,
      economicPopulation: 0,
      population: -2,
    });
    fundHuman(5);
    const repairingPlayer = state.players.find(
      (player) => player.id === humanId,
    );
    if (repairingPlayer === undefined) throw new Error("human player missing");
    const coinsBeforeRepair = repairingPlayer.coins;
    const repairedEvents = apply({ kind: "BUILD_FARM", at: farmTile.at });
    expect(state.players.find((player) => player.id === humanId)?.coins).toBe(
      coinsBeforeRepair - 5,
    );
    expect(
      state.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({
      level: 2,
      economicPopulation: 3,
      population: 1,
      rewards: [{ reachedLevel: 2, reward: "STOCKPILE" }],
    });
    expect(
      repairedEvents.some(
        (event) =>
          event.kind === "CITY_LEVELED_UP" || event.kind.includes("REWARD"),
      ),
    ).toBe(false);

    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-06T13:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: replay.commands.length,
      state,
      stateHash: canonicalHash(state),
    });
  });

  it("classifies every v1-v6 artifact as incompatible without migration", () => {
    for (const version of [1, 2, 3, 4, 5, 6]) {
      const replay = { format: "pulp-wars-replay", version, opaque: "keep" };
      expect(parseReplayFileV7(replay)).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
      const source = JSON.stringify({
        format: "pulp-wars-save",
        version,
        opaque: "keep",
      });
      expect(parseSaveV7(source)).toMatchObject({ kind: "INCOMPATIBLE" });
      expect(source).toBe(
        JSON.stringify({ format: "pulp-wars-save", version, opaque: "keep" }),
      );
    }
  });

  it("preserves the r1 development identity as incompatible and never executes it", () => {
    const developmentSetup = {
      ...setup,
      rulesetId: "pulp-wars-poc-7",
    };
    const developmentReplay = {
      format: "pulp-wars-replay",
      version: 7,
      setup: developmentSetup,
      commands: [{ kind: "UNKNOWN_DEVELOPMENT_COMMAND" }],
      checkpoints: [],
    };
    expect(parseReplayFileV7(developmentReplay)).toEqual({
      kind: "INCOMPATIBLE_REPLAY",
    });
    expect(() => runReplayV7(developmentReplay)).toThrowError(
      "INCOMPATIBLE_REPLAY",
    );

    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const current = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-06T12:00:00.000Z",
    );
    const developmentState = {
      ...current.state,
      rulesetId: "pulp-wars-poc-7",
      setup: developmentSetup,
      players: current.state.players.map((player) => ({
        ...player,
        factionTreeId: "ORIGINAL_BASELINE_V2",
      })),
    };
    const developmentSave = {
      ...current,
      rulesetId: "pulp-wars-poc-7",
      setup: developmentSetup,
      state: developmentState,
      randomState: developmentState.random,
      stateHash: canonicalHash(developmentState),
    };
    const source = JSON.stringify(developmentSave);
    expect(parseSaveV7(source)).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(source).toBe(JSON.stringify(developmentSave));
  });

  it("rejects mixed and unknown r1/r2 identities without fallback", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );

    expect(
      parseReplayFileV7({
        ...replay,
        setup: { ...setup, rulesetId: "pulp-wars-poc-unknown" },
      }),
    ).toEqual({ kind: "INVALID_REPLAY" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          setup: { ...setup, rulesetId: "pulp-wars-poc-7" },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          state: {
            ...save.state,
            players: save.state.players.map((player, index) =>
              index === 0
                ? { ...player, factionTreeId: "ORIGINAL_BASELINE_V2" }
                : player,
            ),
          },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
    expect(
      parseSaveV7(
        JSON.stringify({ ...save, rulesetId: "pulp-wars-poc-unknown" }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });

  it("rejects unknown fields, malformed checkpoints, hash drift, and rejected command execution", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    expect(parseReplayFileV7({ ...replay, unknown: true })).toEqual({
      kind: "INVALID_REPLAY",
    });
    expect(
      parseReplayFileV7({
        ...replay,
        checkpoints: [{ index: 1, stateHash: "0".repeat(64) }],
      }),
    ).toEqual({ kind: "INVALID_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );
    expect(
      parseSaveV7(JSON.stringify({ ...save, stateHash: "0".repeat(64) })),
    ).toMatchObject({ kind: "CORRUPT" });
    const withCommand = {
      ...replay,
      commands: [
        { kind: "MOVE", unitId: created.state.units[0]?.id, path: [] },
      ],
    } as const;
    expect(() => runReplayV7(withCommand)).toThrowError("COMMAND_REJECTED");
    try {
      runReplayV7(withCommand);
    } catch (error) {
      expect((error as { code: string }).code).toBe("COMMAND_REJECTED");
    }
  });

  it("does not copy the v6 missing-treasure normalization", () => {
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-06T12:00:00.000Z",
    );
    const state = Object.fromEntries(
      Object.entries(save.state).filter(([key]) => key !== "treasureChests"),
    );
    expect(
      parseSaveV7(
        JSON.stringify({ ...save, state, stateHash: canonicalHash(state) }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
  });
});

const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function moveEndpoint(
  command: Extract<CommandV7, { readonly path: readonly CoordV7[] }>,
): CoordV7 {
  return required(command.path.at(-1), "move endpoint missing");
}
