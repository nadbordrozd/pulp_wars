/* global console, URL */
/**
 * Candy look proposal (bead pulp_wars-jdb.10): value and colour shares of
 * the eight-unit roster today and in each direction (the accepted samples,
 * with today's sprite where a direction keeps it). Outline ink (L* < 8) is
 * left out of the shares, as the Goblin redesign study did.
 *
 *   node art/explorations/candy-look-2026-10/tools/measure.mjs
 *
 * Prints a Markdown table and writes measure.json. No PixelLab call.
 */
import { existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("package.json"));
const sharp = require("sharp");

const RUN = "art/explorations/candy-look-2026-10";
const UNITS = "public/assets/chibi/units/chibi-direction-candy-";
const TODAY = {
  trooper: "gumdrop",
  donut: "donut-racer",
  gunner: "gumball-gunner",
  marshmallow: "marshmallow",
  confectioner: "confectioner",
  pie: "pie-launcher",
  bear: "gummy-bear",
  golem: "rock-candy-golem",
};

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
function lightness(r, g, b) {
  const y =
    0.2126729 * toLinear(r) + 0.7151522 * toLinear(g) + 0.072175 * toLinear(b);
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}
function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}

async function measure(files) {
  const total = {
    n: 0,
    sum: 0,
    dark: 0,
    lit: 0,
    pink: 0,
    white: 0,
    opaque: 0,
    ink: 0,
  };
  for (const file of files) {
    const { data } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      total.opaque += 1;
      const l = lightness(data[i], data[i + 1], data[i + 2]);
      if (l < 8) {
        total.ink += 1;
        continue;
      }
      total.n += 1;
      total.sum += l;
      if (l < 35) total.dark += 1;
      if (l >= 55) total.lit += 1;
      const [h, s, v] = hsv(data[i], data[i + 1], data[i + 2]);
      if (h >= 300 && h <= 358 && s >= 0.12 && v >= 0.5) total.pink += 1;
      if (s < 0.12 && v >= 0.85) total.white += 1;
    }
  }
  const share = (count) => Math.round((count / total.n) * 100);
  return {
    meanLightness: Math.round((total.sum / total.n) * 10) / 10,
    darkPercent: share(total.dark),
    litPercent: share(total.lit),
    pinkPercent: share(total.pink),
    whitePercent: share(total.white),
  };
}

const rosters = {
  today: Object.values(TODAY).map((name) => `${UNITS}${name}.png`),
};
for (const direction of ["chocolatier", "allsorts"])
  rosters[direction] = Object.entries(TODAY).map(([slot, name]) => {
    const sample = `${RUN}/${direction}/assets/units/chibi-look-${direction}-${slot}.png`;
    return existsSync(sample) ? sample : `${UNITS}${name}.png`;
  });
const result = {};
const lines = [
  "| Roster (8 units) | Mean L\\* | Dark (L\\* < 35) | Lit (L\\* >= 55) | Pink | White |",
  "| --- | --: | --: | --: | --: | --: |",
];
for (const [name, files] of Object.entries(rosters)) {
  const m = await measure(files);
  result[name] = { ...m, files };
  lines.push(
    `| ${name} | ${m.meanLightness} | ${m.darkPercent}% | ${m.litPercent}% | ${m.pinkPercent}% | ${m.whitePercent}% |`,
  );
}
console.log(lines.join("\n"));
writeFileSync(
  new URL("../measure.json", import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
