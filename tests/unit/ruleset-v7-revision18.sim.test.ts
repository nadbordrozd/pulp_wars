// Whole-game simulations split out of
// ruleset-v7-revision18.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  createPlayableGameV7,
  movementStepCost2V7,
  queryPlayerCommandsV7,
  reachableMovementPathsV7,
  reachablePlayerMovementPathsV7,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { goblinSetupV7, sameV7 } from "../fixtures/v7-goblin-arena";

// Revision 18 (`pulp_wars-6gd.2`): identity `pulp-wars-poc-7r18`, friendly
// pass-through, and the Road half cost by origin
// (docs/product/RULESET_7_REVISION_18.md sections 2-4, 6, 7, and 9.1).

describe("ruleset-7 revision-18 public and engine parity", () => {
  const totals = { passThroughMoves: 0, roadOriginMoves: 0, conservative: 0 };
  it.each([
    // Tuning 6 (`pulp_wars-w49.6`): the Normal AI of these three factions
    // researches toward its army first, so Roads come late and none of the
    // three matches had a step off a Road within 26 rounds; the Human
    // Pangea match is seed 7 (seed 0 before), which has ten (of seeds 0-9
    // the only one).
    { factions: ["ORIGINAL", "ORIGINAL"], mapType: "PANGEA", seed: 7 },
    { factions: ["UNDEAD", "GOBLIN"], mapType: "CONTINENTS", seed: 5 },
    { factions: ["GOBLIN", "ORIGINAL"], mapType: "LAKES", seed: 8 },
  ] as const)(
    "offers exactly the engine's moves in sampled $factions $mapType states",
    ({ factions, mapType, seed }) => {
      const setup: MatchSetupV7 = {
        ...goblinSetupV7([...factions], seed),
        mapType,
      };
      const match = runAiMatchV7(setup, {
        maxRounds: 26,
        recordCheckpointHashes: false,
      });
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      let state = created.state;
      let sampled = 0;
      let conservative = 0;
      let passThroughMoves = 0;
      let roadOriginMoves = 0;
      match.commandLog.forEach((record, index) => {
        if (record.command.kind === "MOVE") {
          const command = record.command;
          const mover = state.units.find((unit) => unit.id === command.unitId);
          if (mover === undefined) throw new Error("mover missing");
          if (
            command.path
              .slice(0, -1)
              .some((step) =>
                state.units.some(
                  (unit) =>
                    unit.ownerId === mover.ownerId && sameV7(unit.at, step),
                ),
              )
          )
            passThroughMoves += 1;
          const owner = state.players.find(
            (player) => player.id === mover.ownerId,
          );
          if (owner === undefined) throw new Error("owner missing");
          // A half-cost step onto a tile that is not a usable Road node.
          const before = state;
          command.path.forEach((step, stepIndex) => {
            const from = command.path[stepIndex - 1] ?? mover.at;
            if (
              movementStepCost2V7(before, owner, from, step) === 1 &&
              movementStepCost2V7(before, owner, step, from) === 2
            )
              roadOriginMoves += 1;
          });
        }
        if (index % 4 === 0) {
          const actor = state.turnOrder[state.activeSeatIndex];
          if (actor === undefined) throw new Error("actor missing");
          const view = viewForV7(state, actor);
          for (const unit of state.units.filter(
            (item) => item.ownerId === actor,
          )) {
            const publicUnit = view.units.find((item) => item.id === unit.id);
            if (publicUnit === undefined) throw new Error("unit missing");
            const authoritative = reachableMovementPathsV7(state, unit);
            const published = reachablePlayerMovementPathsV7(view, publicUnit);
            // A public path into unexplored ground may be interrupted by a
            // fact the owner cannot see; every other one is the engine's.
            const uninterrupted = published.filter((item) => {
              const result = validateMovementPathV7(state, unit, item.path);
              expect(result.legal).toBe(true);
              return (
                result.legal &&
                result.interruption === null &&
                result.traversedPath.length === item.path.length
              );
            });
            const engineByKey = new Map(
              authoritative.map((item) => [
                `${item.destination.y},${item.destination.x}`,
                item,
              ]),
            );
            for (const item of uninterrupted)
              expect(
                engineByKey.get(`${item.destination.y},${item.destination.x}`)
                  ?.spentPoints2,
              ).toBe(item.spentPoints2);
            // The engine reaches further only where the public rule must be
            // conservative: a tile unexplored before the Move, or zone of
            // control the owner cannot rule out (a hostile boat's reach into
            // Deep Water depends on its owner's hidden technology).
            for (const item of authoritative) {
              if (
                uninterrupted.some((other) =>
                  sameV7(other.destination, item.destination),
                )
              )
                continue;
              // The public rule may publish this destination by another path
              // of the same cost that a unit the owner cannot see interrupts
              // (zone of control); the engine's own path is then legal by
              // the public rule too. Seen on the village-density Lakes board
              // of seed 8 (`pulp_wars-ykw.2`): a Scrap Buggy reaches (7, 3)
              // by (6, 4), and the published path by (6, 2) stops there.
              if (
                published.some((other) =>
                  sameV7(other.destination, item.destination),
                )
              ) {
                conservative += 1;
                continue;
              }
              const result = validatePlayerMovementPathV7(
                view,
                publicUnit,
                item.path,
              );
              expect(result.legal).toBe(false);
              expect(["ZOC_STOPS_MOVE", "UNEXPLORED_INTERMEDIATE"]).toContain(
                result.legal ? null : result.reason,
              );
              conservative += 1;
            }
            // No destination holds a unit the owner can see.
            for (const item of published)
              expect(
                view.units.some((other) => sameV7(other.at, item.destination)),
              ).toBe(false);
          }
          for (const command of queryPlayerCommandsV7(view))
            if (command.kind === "MOVE")
              expect(applyCommandV7(state, actor, command).accepted).toBe(true);
          sampled += 1;
        }
        const result = applyCommandV7(state, record.playerId, record.command);
        if (!result.accepted) throw new Error("replay rejected");
        state = result.state;
      });
      expect(sampled).toBeGreaterThan(20);
      totals.passThroughMoves += passThroughMoves;
      totals.roadOriginMoves += roadOriginMoves;
      totals.conservative += conservative;
    },
    600_000,
  );

  it("sees the Normal AI use both rules in those matches", () => {
    // The Normal AI moves only through offered commands, so it passes its
    // own units and takes half-cost steps onto roadless tiles.
    expect(totals.passThroughMoves).toBeGreaterThan(0);
    expect(totals.roadOriginMoves).toBeGreaterThan(0);
  });
});

describe("ruleset-7 revision-18 Normal AI route estimates", () => {
  it.each([
    { factions: ["ORIGINAL", "UNDEAD"], mapType: "PANGEA" },
    { factions: ["GOBLIN", "UNDEAD"], mapType: "ARCHIPELAGO" },
    { factions: ["ORIGINAL", "GOBLIN", "UNDEAD"], mapType: "CONTINENTS" },
  ] as const)(
    "plays a headless Normal $factions $mapType sample without a policy error",
    ({ factions, mapType }) => {
      const setup: MatchSetupV7 = {
        ...goblinSetupV7([...factions], 11),
        mapType,
      };
      const first = runAiMatchV7(setup, {
        maxRounds: 24,
        recordCheckpointHashes: false,
      });
      expect(first.errors).toEqual([]);
      expect(first.stalls).toEqual([]);
      const second = runAiMatchV7(setup, {
        maxRounds: 24,
        recordCheckpointHashes: false,
      });
      expect(second.stateHash).toBe(first.stateHash);
    },
    600_000,
  );
});
