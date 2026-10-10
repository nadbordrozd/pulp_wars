import { configDefaults, defineConfig } from "vitest/config";
import { assetCachePlugin } from "./scripts/build/asset-cache-plugin.ts";

const GITHUB_PAGES_BASE = "/pulp_wars/";

// Test tiers (`pulp_wars-bwry`). A `*.sim.test.ts` file holds whole-game
// simulations: tests that play AI matches through `src/headless` (runAiMatch,
// runAiBatch, the headless CLI, the mission and lab runners) or drive the
// Normal AI over many turns of a match. They run only when the user asks:
// `PULP_WARS_TEST_TIER=sim` (`npm run test:sim`) collects just them, `all`
// collects every test file, and the default `unit` tier (`npm test`,
// `npm run test:unit`, and `npx vitest run <files>`) leaves them out, even
// when one is named on the command line.
const SIMULATION_TESTS = "tests/**/*.sim.test.ts";
const TEST_TIER = process.env.PULP_WARS_TEST_TIER ?? "unit";
if (!["unit", "sim", "all"].includes(TEST_TIER))
  throw new Error(
    `PULP_WARS_TEST_TIER must be unit, sim, or all (got ${TEST_TIER})`,
  );

export default defineConfig(({ command }) => ({
  // Keep localhost at `/`, while production output targets the GitHub Pages
  // project site at https://nadbordrozd.github.io/pulp_wars/.
  base: command === "build" ? GITHUB_PAGES_BASE : "/",
  // A build also gets its service worker and asset manifest
  // (pulp_wars-2yc.11); the development server and the tests do not.
  plugins: [assetCachePlugin()],
  server: {
    host: "localhost",
    port: 6173,
    strictPort: true,
  },
  preview: {
    host: "localhost",
    port: 6173,
    strictPort: true,
  },
  test: {
    environment: "node",
    include: [TEST_TIER === "sim" ? SIMULATION_TESTS : "tests/**/*.test.ts"],
    // Heavy AI/map tests flake against the 5 s default when the machine is
    // under load; explicit per-test timeouts still take precedence.
    testTimeout: 60000,
    hookTimeout: 60000,
    // `.claude/**` holds agent git worktrees (other checkouts of this repo).
    exclude: [
      ...configDefaults.exclude,
      ".claude/**",
      ...(TEST_TIER === "unit" ? [SIMULATION_TESTS] : []),
    ],
  },
}));
