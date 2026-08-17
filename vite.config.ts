import { defineConfig } from "vitest/config";

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
  },
}));
