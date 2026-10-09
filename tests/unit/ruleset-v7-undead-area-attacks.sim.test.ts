// Whole-game simulations split out of
// ruleset-v7-undead-area-attacks.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseReplayJsonV7,
  queryPlayerCommandsV7,
  runReplayV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { chooseNormalTurnCommandV7 } from "../../src/ai/v7";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { setupWith, required } from "./ruleset-v7-undead-area-attacks.shared";

describe("ruleset-7 revision-13 Wail: events, projection, and persistence", () => {
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

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
