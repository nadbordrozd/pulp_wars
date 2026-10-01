import { configDefaults, defineConfig } from "vitest/config";

const GITHUB_PAGES_BASE = "/pulp_wars/";

export default defineConfig(({ command }) => ({
  // Keep localhost at `/`, while production output targets the GitHub Pages
  // project site at https://nadbordrozd.github.io/pulp_wars/.
  base: command === "build" ? GITHUB_PAGES_BASE : "/",
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
    include: ["tests/**/*.test.ts"],
    // Heavy AI/map tests flake against the 5 s default when the machine is
    // under load; explicit per-test timeouts still take precedence.
    testTimeout: 60000,
    hookTimeout: 60000,
    // `.claude/**` holds agent git worktrees (other checkouts of this repo).
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
}));
