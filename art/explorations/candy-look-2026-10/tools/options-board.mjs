/* global Buffer */
/**
 * Candy Chocolatier look, part 2 (bead pulp_wars-jdb.10): one options board
 * per role, the Knight and the Juggernaut. Each shows today's unit and the
 * three accepted concept samples of the options run at x3 on the Candy mint
 * grass and on default Grass, beside the converted Toffee Trooper and
 * Marshmallow, and the same rows at board scale. No PixelLab call, nothing
 * registered.
 *
 *   node art/explorations/candy-look-2026-10/tools/options-board.mjs
 *
 * Writes boards/knight-options.png and boards/juggernaut-options.png.
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(path.resolve("package.json"));
const sharp = require("sharp");

const RUN = "art/explorations/candy-look-2026-10";
const UNITS = "public/assets/chibi/units/chibi-direction-";
const OPTION = `${RUN}/options/assets/units/chibi-option-`;
const TERRAIN = "public/assets/chibi/terrain";

const ROLES = {
  knight: {
    title: "Knight role: fast heavy striker (Sugar Frenzy chain attacks)",
    cell: 104,
    row: 100,
    options: [
      {
        label: "Today: Gummy Bear",
        file: `${UNITS}candy-gummy-bear.png`,
        note: "Amber jelly. The user: looks out of place.",
      },
      {
        label: "(a) Chocolate Bunny",
        file: `${OPTION}knight-bunny.png`,
        note: "A moulded milk-chocolate rabbit with a gold bow. Hops from kill to kill. New name: Chocolate Bunny.",
      },
      {
        label: "(b) Rocking Horse Lancer",
        file: `${OPTION}knight-rocking-horse.png`,
        note: "A toffee rider with a lance on a gingerbread rocking horse: reads as cavalry. New name: Rocking Horse Lancer.",
      },
      {
        label: "(c) Chocolate-dipped Gummy Bear",
        file: `${OPTION}knight-dipped-bear.png`,
        note: "The live bear with a chocolate cap, shoulder plates and dipped legs. Name kept: Gummy Bear.",
      },
    ],
  },
  juggernaut: {
    title:
      "Juggernaut role: huge, slow, sturdy; pushes, and attackers bounce off it",
    cell: 116,
    row: 114,
    options: [
      {
        label: "Today: Rock Candy Golem",
        file: `${UNITS}candy-rock-candy-golem.png`,
        note: "Mint rock candy. The user: too drippy (the chocolate sample), unclear what it is.",
      },
      {
        label: "(a) Gingerbread Giant",
        file: `${OPTION}juggernaut-gingerbread.png`,
        note: "A giant gingerbread man: icing trim, gumdrop buttons, chocolate gauntlets. New name: Gingerbread Giant.",
      },
      {
        label: "(b) Cake Colossus",
        file: `${OPTION}juggernaut-cake.png`,
        note: "A walking three-tier chocolate cake with a crown of candles. Spongy: suits Bounce. New name: Cake Colossus.",
      },
      {
        label: "(c) Easter Egg Titan",
        file: `${OPTION}juggernaut-egg.png`,
        note: "A white-chocolate egg in torn gold foil with a bow and chocolate limbs. New name: Easter Egg Titan.",
      },
    ],
  },
};
const COMPANIONS = [
  ["Toffee Trooper", `${UNITS}candy-gumdrop.png`],
  ["Marshmallow", `${UNITS}candy-marshmallow.png`],
];

const text = (x, y, size, content, weight = "normal", fill = "#f2efe6") =>
  `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${content}</text>`;

async function strip(tile, files, cell, row) {
  const width = files.length * cell;
  const layers = [];
  for (let x = 0; x < width; x += 80)
    for (let y = 0; y < row; y += 80)
      layers.push({
        input: await sharp(tile)
          .extract({
            left: 0,
            top: 0,
            width: Math.min(80, width - x),
            height: Math.min(80, row - y),
          })
          .toBuffer(),
        left: x,
        top: y,
      });
  for (const [index, file] of files.entries()) {
    const meta = await sharp(file).metadata();
    layers.push({
      input: file,
      left: index * cell + Math.floor((cell - meta.width) / 2),
      top: row - 4 - meta.height,
    });
  }
  return sharp({
    create: { width, height: row, channels: 4, background: "#000000" },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

mkdirSync(`${RUN}/boards`, { recursive: true });
const mint = await sharp(`${TERRAIN}/faction-grass/chibi-candy-grass-1.png`)
  .png()
  .toBuffer();
const grass = await sharp(`${TERRAIN}/chibi-grass-1.png`).png().toBuffer();

for (const [role, spec] of Object.entries(ROLES)) {
  const SCALE = 3;
  const { cell, row } = spec;
  // Each option stands between the two converted units, so fit is judged.
  const group = (option) => [COMPANIONS[0][1], option.file, COMPANIONS[1][1]];
  const groupWidth = 3 * cell;
  const GAP = 24;
  const W = 40 + spec.options.length * (groupWidth * SCALE + GAP);
  const top = 70;
  const blockHeight = row * SCALE;
  const nativeTop = top + 2 * (blockHeight + 30) + 96;
  const H = nativeTop + 2 * (row + 8) + 30;
  const layers = [];
  let svg = text(20, 40, 30, `Candy, Chocolatier look. ${spec.title}`, "bold");
  for (const [index, option] of spec.options.entries()) {
    const x = 20 + index * (groupWidth * SCALE + GAP);
    svg += text(x, top + 18, 20, option.label, "bold");
    for (const [g, [label, tile]] of [
      ["on the Candy mint grass", mint],
      ["on default Grass", grass],
    ].entries()) {
      const y = top + 28 + g * (blockHeight + 30);
      const image = await strip(tile, group(option), cell, row);
      layers.push({
        input: await sharp(image)
          .resize(groupWidth * SCALE, blockHeight, { kernel: "nearest" })
          .png()
          .toBuffer(),
        left: x,
        top: y,
      });
      svg += text(x + 6, y + 16, 13, label, "normal", "#10161c");
      layers.push({
        input: image,
        left: x,
        top: nativeTop + g * (row + 8),
      });
    }
    // The note, wrapped to the group's width.
    const words = option.note.split(" ");
    let line = "";
    let lineIndex = 0;
    const noteTop = top + 28 + 2 * (blockHeight + 30) - 6;
    for (const word of words) {
      if ((line + word).length > 62) {
        svg += text(x, noteTop + lineIndex * 18, 15, line.trim());
        line = "";
        lineIndex += 1;
      }
      line += `${word} `;
    }
    svg += text(x, noteTop + lineIndex * 18, 15, line.trim());
  }
  svg += text(
    20,
    nativeTop - 10,
    16,
    "The same rows at board scale (1x)",
    "bold",
  );
  await sharp({
    create: { width: W, height: H, channels: 4, background: "#20242a" },
  })
    .composite([
      ...layers,
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`,
        ),
      },
    ])
    .png()
    .toFile(`${RUN}/boards/${role}-options.png`);
  process.stdout.write(`${RUN}/boards/${role}-options.png\n`);
}
