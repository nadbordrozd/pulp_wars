import { defineConfig } from "vitest/config";

export default defineConfig({
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
});
