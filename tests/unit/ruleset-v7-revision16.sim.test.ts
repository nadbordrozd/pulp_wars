// Whole-game simulations split out of
// ruleset-v7-revision16.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { runAiMatchV7 } from "../../src/headless/v7";
import { MAP_TYPES, setupFor } from "./ruleset-v7-revision16.shared";

// Revision 16a (`pulp_wars-wwc`): identity `pulp-wars-poc-7r16`, orthogonal
// Shallow Water with a 25% Shallow minimum, the capital growth floor and the
// `CAPITAL_GROWTH` invariant, and the Normal AI growth-first opening
// (docs/product/RULESET_7_REVISION_16.md sections 2-4 and 10.1).

describe("ruleset-7 revision-16 Normal AI opening", () => {
  it.each([
    ["ORIGINAL", "ORIGINAL"],
    ["ORIGINAL", "UNDEAD"],
    ["UNDEAD", "ORIGINAL"],
  ] as const)(
    "brings every capital to level 2 by its owner's second turn (%s vs %s, seeds 0-19, 11 and 14)",
    (first, second) => {
      for (const mapType of MAP_TYPES)
        for (const size of [11, 14] as const)
          for (let seed = 0; seed < 20; seed += 1) {
            const setup = setupFor(mapType, size, 1, seed, [first, second]);
            const match = runAiMatchV7(setup, {
              maxRounds: 2,
              recordCheckpointHashes: false,
            });
            expect(match.errors).toEqual([]);
            for (const player of match.state.players) {
              const capital = match.state.cities.find(
                (city) => city.id === player.originalCapitalCityId,
              );
              expect(
                capital !== undefined &&
                  capital.ownerId === player.id &&
                  capital.level >= 2,
                `${mapType}/${size}/${seed} seat ${player.seat}`,
              ).toBe(true);
            }
          }
    },
    600_000,
  );
});
