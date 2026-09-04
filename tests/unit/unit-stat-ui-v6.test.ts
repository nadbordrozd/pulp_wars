import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ruleset-6 unit stat dock presentation", () => {
  it("uses compact text rather than stat pills and exposes pointer/focus tooltips", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    const statRule = css.match(/\.v6-unit-stat\s*\{(?<body>[^}]*)\}/s)?.groups
      ?.body;
    expect(statRule).toBeDefined();
    expect(statRule).not.toMatch(/border\s*:/);
    expect(statRule).not.toMatch(/background\s*:/);
    expect(statRule).not.toMatch(/border-radius\s*:/);
    expect(css).toMatch(
      /\.v6-unit-stat-tooltip\s*\{[^}]*display:\s*none[^}]*width:\s*min\(17rem,\s*calc\(100vw - 2rem\)\)/s,
    );
    expect(css).toMatch(
      /\.v6-unit-stat-modifier-wrap:is\(:hover,\s*:focus-within\)\s+\.v6-unit-stat-tooltip\s*\{[^}]*display:\s*block/s,
    );
    expect(css).toMatch(
      /\.v6-unit-stat-modifier:focus-visible\s*\{[^}]*outline:\s*2px solid/s,
    );
  });

  it("keeps focused tooltips within the mobile visual viewport", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(
      /@media \(max-width: 599px\)[\s\S]*\.v6-unit-stat-tooltip\s*\{[^}]*position:\s*fixed[^}]*safe-area-inset-right[^}]*safe-area-inset-bottom[^}]*safe-area-inset-left[^}]*width:\s*auto[^}]*transform:\s*none/s,
    );
  });
});
