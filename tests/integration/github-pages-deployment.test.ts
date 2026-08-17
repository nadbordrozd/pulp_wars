import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "vite";

const PROJECT_ROOT = process.cwd();
const PAGES_BASE = "/pulp_wars/";
let outputRoot = "";

beforeAll(async () => {
  outputRoot = await mkdtemp(path.join(tmpdir(), "pulp-wars-pages-"));
  await build({
    root: PROJECT_ROOT,
    configFile: path.join(PROJECT_ROOT, "vite.config.ts"),
    logLevel: "silent",
    build: {
      outDir: outputRoot,
      emptyOutDir: true,
    },
  });
});

afterAll(async () => {
  if (outputRoot !== "") await rm(outputRoot, { recursive: true, force: true });
});

describe("GitHub Pages deployment", () => {
  it("builds HTML and runtime art URLs beneath the project-site base", async () => {
    const html = await readFile(path.join(outputRoot, "index.html"), "utf8");
    const projectUrls = Array.from(
      html.matchAll(/(?:src|href)="([^"]+)"/g),
      (match) => match[1],
    ).filter((url): url is string => url !== undefined && url.startsWith("/"));

    expect(projectUrls.length).toBeGreaterThan(0);
    expect(projectUrls.every((url) => url.startsWith(PAGES_BASE))).toBe(true);
    expect(html).not.toContain("/src/main.ts");

    const moduleUrl = projectUrls.find((url) => url.endsWith(".js"));
    expect(moduleUrl).toBeDefined();
    const modulePath = path.join(
      outputRoot,
      moduleUrl?.slice(PAGES_BASE.length) ?? "",
    );
    const moduleSource = await readFile(modulePath, "utf8");

    expect(moduleSource).toContain(PAGES_BASE);
    expect(moduleSource).toContain("assets/pixellab/units/warrior.png");
    expect(moduleSource).not.toMatch(/["'`]\/assets\/pixellab\//);
    await expect(
      readFile(path.join(outputRoot, "assets/pixellab/units/warrior.png")),
    ).resolves.not.toHaveLength(0);
  });

  it("publishes only the Vite dist artifact after validation", async () => {
    const workflow = await readFile(
      path.join(PROJECT_ROOT, ".github/workflows/deploy-pages.yml"),
      "utf8",
    );

    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("run: npm run check");
    expect(workflow).toMatch(/actions\/upload-pages-artifact@v\d+/);
    expect(workflow).toContain("path: ./dist");
    expect(workflow).toMatch(/actions\/deploy-pages@v\d+/);
  });
});
