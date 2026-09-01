import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DOM UI architecture and responsive contract", () => {
  it("keeps gameplay legality in the filtered engine query boundary", () => {
    const source = readFileSync("src/render/dom/app-view.ts", "utf8");
    expect(source).toContain("queryPlayerCommands");
    expect(source).not.toMatch(
      /import\s*\{[^}]*\b(commandEligibility|legalCommands|applyCommand|createGame)\b[^}]*\}\s*from\s*["'][^"']*engine/s,
    );
  });

  it("keeps city selection in the non-modal bottom dock", () => {
    const source = readFileSync("src/render/dom/app-view.ts", "utf8");
    const types = readFileSync("src/app/types.ts", "utf8");
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(source).toContain("city-action-dock");
    expect(source).not.toContain("modal-city");
    expect(source).not.toContain("city-sheet");
    expect(types).not.toMatch(/name:\s*"CITY"/);
    expect(css).not.toContain(".modal-city");
    expect(css).not.toContain(".city-sheet");
  });

  it("keeps tile selection in its own non-modal dock and out of city actions", () => {
    const source = readFileSync("src/render/dom/app-view.ts", "utf8");
    const types = readFileSync("src/app/types.ts", "utf8");
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(source).toContain("tile-action-dock");
    expect(source).toContain("selectedTileDock");
    expect(source).not.toContain("tilePanel");
    expect(source).not.toContain("city-resource-action");
    expect(types).not.toMatch(/name:\s*"TILE"/);
    expect(css).not.toContain(".modal-tile");
    expect(css).not.toContain(".city-resource-action");
  });

  it("keeps the Canvas board PlayerView-only and legality behind the public query", () => {
    const source = readFileSync("src/render/canvas/board-host.ts", "utf8");
    expect(source).toContain("PlayerView");
    expect(source).toContain("queryPlayerCommands");
    expect(source).not.toMatch(/\bGameState\b/);
    expect(source).not.toMatch(
      /\b(applyCommand|legalCommands|createGame)\s*\(/,
    );
    expect(source).not.toMatch(
      /from ["'][^"']*engine\/(commands|movement|combat)/,
    );
  });

  it("pulses only the unit raster and contains no detached readiness or reward-letter marker", () => {
    const renderer = readFileSync(
      "src/render/canvas/board-renderer.ts",
      "utf8",
    );
    const plan = readFileSync("src/render/canvas/render-plan.ts", "utf8");
    const readiness = readFileSync(
      "src/render/canvas/readiness-presentation.ts",
      "utf8",
    );
    expect(renderer).toContain("readinessSpriteOpacity");
    expect(renderer).toMatch(
      /context\.globalAlpha\s*=\s*readinessSpriteOpacity/,
    );
    expect(readiness).toContain("READINESS_PULSE_DURATION_MS = 1_600");
    expect(readiness).toContain("READINESS_PULSE_MIN_OPACITY = 0.62");
    expect(plan).not.toContain("READINESS_HALO");
    expect(renderer).not.toContain("drawReadinessHalo");
    expect(renderer).not.toContain('fillText(unit.ready ? "✓"');
    expect(renderer).not.toContain("markerX");
    expect(renderer).not.toContain("reward.charAt(0)");
    expect(renderer).not.toMatch(/badge\([^)]*["']W["']/);
    expect(renderer).not.toMatch(/badge\([^)]*["']R["']/);
  });

  it("defines desktop, compact, mobile, safe-area, reduced-motion, and target-size rules", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(/html,\s*body,\s*#app\s*\{[^}]*min-width:\s*0/s);
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain("@media (max-width: 599px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain('[data-motion="reduced"]');
  });

  it("contains the full faction hero only in the large preview while seat badges may crop", () => {
    const source = readFileSync("src/render/dom/app-view.ts", "utf8");
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(source).toMatch(
      /className\.includes\("faction-preview"\)[\s\S]*FACTION_HERO_URLS\[faction\]/,
    );
    expect(css).toMatch(
      /\.faction-portrait \.faction-hero-art\s*\{[^}]*object-fit:\s*cover/s,
    );
    expect(css).toMatch(
      /\.faction-preview-portrait \.faction-hero-art\s*\{[^}]*object-fit:\s*contain[^}]*object-position:\s*center center/s,
    );
    expect(css).toMatch(
      /\.faction-portrait\[data-loaded="true"\] \.faction-hero-art\s*\{[^}]*opacity:\s*1/s,
    );
  });

  it("fixes the Canvas to the match viewport and overlays bounded selection docks", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(
      /\.match-shell\s*\{[^}]*position:\s*relative[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s,
    );
    expect(css).toMatch(
      /\.board-stage\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s,
    );
    expect(css).toMatch(/\.match-actions\s*\{[^}]*bottom:\s*0/s);
    expect(css).toMatch(
      /\.unit-action-dock,\s*\.city-action-dock,\s*\.tile-action-dock\s*\{[^}]*max-block-size:\s*45dvh[^}]*overflow:\s*visible/s,
    );
    expect(css).toMatch(/@media \(max-width: 320px\)[\s\S]*overflow-y:\s*auto/);
  });

  it("keeps the ruleset-6 context dock over the map across desktop and mobile", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(
      /\.v6-match-shell\s*\{[^}]*position:\s*relative[^}]*grid-template-areas:\s*"hud"\s*"map"[^}]*height:\s*100dvh/s,
    );
    expect(css).toMatch(
      /\.v6-action-dock\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*env\(safe-area-inset-bottom\)[^}]*left:\s*0[^}]*max-height:\s*45dvh[^}]*overflow:\s*visible/s,
    );
    expect(css).toMatch(/\.v6-command-button\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(
      /@media \(max-width: 360px\)[\s\S]*\.v6-action-dock\s*\{[^}]*overflow-y:\s*auto/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]*\.v6-hud-actions\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s,
    );
  });

  it("lays out the ruleset-6 technology screen as five wide columns and one compact axis", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(
      /\.v6-tech-screen\s*\{[^}]*height:\s*100dvh[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/s,
    );
    expect(css).toMatch(
      /\.v6-tech-tree\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 700px\)[\s\S]*\.v6-tech-branch-navigation\s*\{[^}]*position:\s*sticky[\s\S]*\.v6-tech-tree\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
    expect(css).toMatch(
      /@media \(max-width: 700px\)[\s\S]*\.v6-tech-detail-backdrop\s*\{[^}]*place-items:\s*end stretch/s,
    );
  });

  it("keeps mandatory ruleset-6 choices blocking, reachable, and single-axis on mobile", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(
      /\.v6-mandatory-backdrop\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*safe-area-inset-top[^}]*safe-area-inset-bottom/s,
    );
    expect(css).toMatch(
      /\.v6-mandatory-dialog\s*\{[^}]*max-height:\s*calc\(100dvh - 1\.5rem\)[^}]*overflow-y:\s*auto/s,
    );
    expect(css).toMatch(/\.v6-mandatory-option\s*\{[^}]*min-height:\s*64px/s);
    expect(css).toMatch(
      /@media \(max-width:\s*560px\)[\s\S]*\.v6-mandatory-backdrop\s*\{[^}]*place-items:\s*end stretch[\s\S]*\.v6-mandatory-options\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
  });

  it("makes front-route grid tracks and intrinsic controls shrink within narrow viewports", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(
      /\.screen\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s,
    );
    expect(css).toMatch(/\.screen > \*[^}]*min-width:\s*0/s);
    expect(css).toMatch(/fieldset\s*\{[^}]*min-inline-size:\s*0/s);
    expect(css).toMatch(
      /\.hub-actions,\s*\.setup-form\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 599px\)[\s\S]*\.result-summary\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/,
    );
    expect(css).toMatch(/button\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });

  it("keeps the compact technology tree and detail sheet bounded on mobile", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(/\.modal-tech\s*\{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(
      /\.tech-tree\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 599px\)[\s\S]*\.tech-content\s*\{[^}]*height:\s*100%[^}]*max-height:\s*none/s,
    );
    expect(css).not.toMatch(
      /@media \(max-width: 599px\)[\s\S]*\.tech-tree[^}]*grid-template-columns:\s*1fr/,
    );
    expect(css).toMatch(
      /\.tech-detail\s*\{[^}]*grid-template-columns:[^}]*minmax\(0,\s*1\.8fr\)/s,
    );
  });
});
