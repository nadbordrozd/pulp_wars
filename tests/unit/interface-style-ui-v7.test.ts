import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  INTERFACE_FONT_FACES_V7,
  loadInterfaceFontsV7,
} from "../../src/app/interface-fonts-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "../../src/render/canvas/board-label-font-v7";

/**
 * The Ruleset 7 interface style (bead pulp_wars-2yc.35, docs/ui/STYLE.md):
 * one token block, no colour outside it, and every text pairing of the
 * tokens at WCAG AA (4.5:1) or better.
 */
const css = readFileSync("src/styles/v7.css", "utf8");
const main = readFileSync("src/main.ts", "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing ${selector}`);
  return css.slice(start, css.indexOf("\n}", start));
}

function tokens(source: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of source.matchAll(/^\s*(--pw-[a-z0-9-]+):\s*([^;]+);/gm))
    found.set(match[1] ?? "", (match[2] ?? "").replace(/\s+/g, " ").trim());
  return found;
}

const base = tokens(block(".v7-app-shell"));
const highContrast = new Map([
  ...base,
  ...tokens(block('.v7-app-shell[data-contrast="high"]')),
]);

function hex(set: Map<string, string>, name: string): string {
  let value = set.get(name);
  for (let hop = 0; hop < 4 && value?.startsWith("var("); hop += 1)
    value = set.get(value.slice(4, -1));
  if (value === undefined) throw new Error(`Missing token ${name}`);
  if (/^#[0-9a-f]{3}$/i.test(value))
    value = `#${[...value.slice(1)].map((digit) => digit + digit).join("")}`;
  if (!/^#[0-9a-f]{6}$/i.test(value))
    throw new Error(`${name} is not a plain colour: ${value}`);
  return value;
}

function channels(colour: string): [number, number, number] {
  return [1, 3, 5].map((at) => parseInt(colour.slice(at, at + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(colour: readonly number[]): number {
  const [red, green, blue] = colour.map((channel) => {
    const share = channel / 255;
    return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(
  foreground: readonly number[],
  background: readonly number[],
): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const SURFACES = [
  "--pw-surface",
  "--pw-surface-2",
  "--pw-surface-raised",
  "--pw-dock",
] as const;
const HUES = [
  "red",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
  "brown",
  // The Cultists' hue (bead pulp_wars-mch9.17, docs/art/factions/CULT.md).
  "emerald",
] as const;

describe("Ruleset 7 interface style tokens", () => {
  it("keeps every colour in the token blocks", () => {
    const outside = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter(
        (line) =>
          /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(line) &&
          !/^\s*--pw-[a-z0-9-]+:/.test(line),
      );
    expect(outside).toEqual([]);
  });

  it("reads no legacy colour name and no fixed radius, size or weight", () => {
    const rules = css.slice(css.indexOf(":where(.v7-app-shell)"));
    expect(
      rules.match(
        /var\(--(paper|ink|muted|gold|panel|teal|v7-(glass|edge|shadow|radius|gain|loss))\b/g,
      ),
    ).toBeNull();
    expect(rules.match(/border-radius: [\d.]+(px|rem);/g)).toBeNull();
    expect(rules.match(/font-size: [\d.]+rem;/g)).toBeNull();
    expect(rules.match(/font-weight: (?!400;)\d+;/g)).toBeNull();
    expect(css).not.toMatch(/blur\(|backdrop-filter/);
  });

  it.each([
    ["standard", base],
    ["high contrast", highContrast],
  ] as const)("holds body and secondary text at AA: %s", (_name, set) => {
    for (const surface of SURFACES) {
      const paper = channels(hex(set, surface));
      for (const ink of ["--pw-text", "--pw-text-2", "--pw-gain", "--pw-loss"])
        expect(
          contrast(channels(hex(set, ink)), paper),
          `${ink} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrast(
        channels(hex(set, "--pw-accent-text")),
        channels(hex(set, "--pw-accent")),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        channels(hex(set, "--pw-text")),
        channels(hex(set, "--pw-yellow")),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        channels(hex(set, "--pw-text-inverse")),
        channels(hex(set, "--pw-ink")),
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("holds every hue ink at AA on its fill and on the plates", () => {
    for (const hue of HUES) {
      const ink = channels(hex(base, `--pw-${hue}`));
      for (const surface of [...SURFACES, `--pw-${hue}-fill`])
        expect(
          contrast(ink, channels(hex(base, surface))),
          `${hue} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps a dimmed control's text at AA", () => {
    const dim = Number(base.get("--pw-dim"));
    const ink = channels(hex(base, "--pw-ink"));
    for (const surface of SURFACES) {
      const paper = channels(hex(base, surface));
      const mixed = ink.map((channel, at) =>
        Math.round(channel * dim + (paper[at] ?? 0) * (1 - dim)),
      );
      expect(contrast(mixed, paper), surface).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("sets no type below 12px", () => {
    expect(base.get("--pw-fs-xs")).toBe("0.75rem");
  });
});

describe("Ruleset 7 interface faces", () => {
  it("bundles the two faces, Latin only, and asks no outside host", () => {
    const imports = [...main.matchAll(/import "(@fontsource\/[^"]+)";/g)].map(
      (match) => match[1],
    );
    expect(imports).toEqual([
      "@fontsource/bowlby-one/latin-400.css",
      "@fontsource/public-sans/latin-500.css",
      "@fontsource/public-sans/latin-600.css",
      "@fontsource/public-sans/latin-700.css",
      "@fontsource/public-sans/latin-800.css",
    ]);
    for (const source of [css, main, readFileSync("index.html", "utf8")])
      expect(source).not.toMatch(/https?:\/\/|@import\s+url/);
    expect(base.get("--pw-display")).toMatch(/^"Bowlby One",/);
    expect(base.get("--pw-ui")).toMatch(/^"Public Sans",/);
    expect(BOARD_LABEL_FONT_FAMILY_V7).toMatch(/^"Public Sans", system-ui/);
    expect(block(".v7-app-shell")).toContain(
      "font-variant-numeric: lining-nums tabular-nums;",
    );
  });

  it("starts without the Font Loading API", async () => {
    await expect(loadInterfaceFontsV7({} as Document)).resolves.toBeUndefined();
  });

  it("asks for every face and never waits past its budget", async () => {
    const load = vi.fn((face: string) =>
      face.includes("Bowlby")
        ? new Promise<FontFace[]>(() => undefined)
        : Promise.resolve([]),
    );
    await loadInterfaceFontsV7({ fonts: { load } } as unknown as Document, 5);
    expect(load.mock.calls.map((call) => call[0])).toEqual([
      ...INTERFACE_FONT_FACES_V7,
    ]);
  });

  it("survives a face that fails to load", async () => {
    const load = vi.fn(() => Promise.reject(new Error("offline")));
    await expect(
      loadInterfaceFontsV7({ fonts: { load } } as unknown as Document, 50),
    ).resolves.toBeUndefined();
  });
});
