/* global console, URL */
/**
 * Candy look proposal (bead pulp_wars-jdb.10): measures candidate faction
 * identity colours against the other seven factions' colours and against
 * the grounds a border is drawn on. CIE76 in CIE L*a*b* (D65); colour
 * vision deficiencies simulated with Machado, Oliveira and Fernandes (2009)
 * at severity 1 on linear RGB, as docs/art/FACTION_COLOURS.md does.
 *
 *   node art/explorations/candy-look-2026-10/tools/identity-colours.mjs
 *
 * Prints a Markdown table and writes identity-colours.json beside the
 * proposal. No PixelLab call.
 */
import { writeFileSync } from "node:fs";

const FACTIONS = {
  Human: "#d01c3a",
  Undead: "#a221ee",
  Goblin: "#fdd20f",
  Dinosaur: "#fe7500",
  Martian: "#e83aae",
  "Ice Folk": "#10b8ff",
  Dwarf: "#2db885",
};
/** Mean colours of the tiles under a border (FACTION_COLOURS.md; measured). */
const GROUNDS = {
  Grass: [137, 183, 91],
  "Candy mint grass": [155, 211, 181],
  Snow: [182, 210, 159],
  Shallow: [143, 211, 220],
  Deep: [66, 119, 165],
  Mountain: [162, 170, 182],
};
const CANDIDATES = {
  "today: cotton-candy pink": "#ffb8d8",
  "A1 milk chocolate": "#8a5330",
  "A2 caramel gold": "#d8973f",
  "A3 vanilla cream": "#fff1d0",
  "A4 cocoa rose": "#c9788f",
  "B1 bubblegum pink": "#ff7fbf",
  "B2 allsort turquoise": "#22d3c5",
  "B3 liquorice black": "#2a2030",
  "B4 sherbet lemon": "#fff36b",
  "C1 peach cream": "#ffcfa8",
  "C2 toffee tan": "#c9a070",
  "C3 butterscotch": "#f0c070",
  "C4 mint cream": "#c9f5dc",
  "C5 white chocolate": "#f4e3c1",
};

const rgbOf = (hex) =>
  [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (v) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, c * 255));
};
function lab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / 1.08883;
  const f = (t) =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const MACHADO = {
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
};
function simulate(rgb, kind) {
  const linear = rgb.map(toLinear);
  return MACHADO[kind].map((row) =>
    toSrgb(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]),
  );
}
const distance = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
/** [normal, the lower of the two deficiencies]. */
function pair(a, b) {
  const normal = distance(a, b);
  const worst = Math.min(
    distance(simulate(a, "deuteranopia"), simulate(b, "deuteranopia")),
    distance(simulate(a, "protanopia"), simulate(b, "protanopia")),
  );
  return [Math.round(normal), Math.round(worst)];
}

const result = {};
const lines = [
  `| Candidate | L\\* | ${Object.keys(FACTIONS).join(" | ")} | weakest faction | ${Object.keys(GROUNDS).join(" | ")} |`,
  `| --- | --: | ${Object.keys(FACTIONS)
    .map(() => "--:")
    .join(" | ")} | --- | ${Object.keys(GROUNDS)
    .map(() => "--:")
    .join(" | ")} |`,
];
for (const [name, hex] of Object.entries(CANDIDATES)) {
  const rgb = rgbOf(hex);
  const factions = Object.fromEntries(
    Object.entries(FACTIONS).map(([id, other]) => [
      id,
      pair(rgb, rgbOf(other)),
    ]),
  );
  const grounds = Object.fromEntries(
    Object.entries(GROUNDS).map(([id, other]) => [id, pair(rgb, other)]),
  );
  const weakest = Object.entries(factions).sort((a, b) => a[1][0] - b[1][0])[0];
  const weakestSim = Object.entries(factions).sort(
    (a, b) => a[1][1] - b[1][1],
  )[0];
  result[name] = { hex, lightness: Math.round(lab(rgb)[0]), factions, grounds };
  lines.push(
    `| ${name} \`${hex}\` | ${Math.round(lab(rgb)[0])} | ${Object.values(
      factions,
    )
      .map(([n, w]) => `${n} / ${w}`)
      .join(
        " | ",
      )} | ${weakest[0]} ${weakest[1][0]}; simulated ${weakestSim[0]} ${weakestSim[1][1]} | ${Object.values(
      grounds,
    )
      .map(([n, w]) => `${n} / ${w}`)
      .join(" | ")} |`,
  );
}
console.log(lines.join("\n"));
writeFileSync(
  new URL("../identity-colours.json", import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
