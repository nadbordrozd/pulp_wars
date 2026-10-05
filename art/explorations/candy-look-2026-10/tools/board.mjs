/* global Buffer */
/**
 * Candy look proposal (bead pulp_wars-jdb.10): composes one direction board
 * per direction from the accepted samples of its exploration run and the
 * game's own masters. No PixelLab call, nothing registered.
 *
 *   node art/explorations/candy-look-2026-10/tools/board.mjs
 *
 * Writes boards/<direction>-board.png (the samples at x3 on the Candy mint
 * faction grass, default Grass and Snow beside a Human and a Goblin unit,
 * with today's sprites above them, the palette, the identity colour beside
 * the other seven factions' colours and the emblem) and
 * boards/<direction>-board-1x.png (the same mock board at board scale).
 */
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(path.resolve("package.json"));
const sharp = require("sharp");

const RUN = "art/explorations/candy-look-2026-10";
const UNITS = "public/assets/chibi/units/chibi-direction-";
const PORTRAITS = "public/assets/chibi/portraits/chibi-direction-portrait-";
const TERRAIN = "public/assets/chibi/terrain";

const FACTIONS = [
  ["Human", "#d01c3a"],
  ["Undead", "#a221ee"],
  ["Goblin", "#fdd20f"],
  ["Dinosaur", "#fe7500"],
  ["Martian", "#e83aae"],
  ["Ice Folk", "#10b8ff"],
  ["Dwarf", "#2db885"],
];
const TODAY_IDENTITY = "#ffb8d8";

function sample(direction, slot) {
  const id = `chibi-look-${direction}-${slot}`;
  for (const folder of ["units", "settlements", "portraits"]) {
    const file = `${RUN}/${direction}/assets/${folder}/${id}.png`;
    if (existsSync(file)) return file;
  }
  throw new Error(`${id}: no accepted sample`);
}

const TODAY = {
  trooper: `${UNITS}candy-gumdrop.png`,
  marshmallow: `${UNITS}candy-marshmallow.png`,
  gunner: `${UNITS}candy-gumball-gunner.png`,
  donut: `${UNITS}candy-donut-racer.png`,
  confectioner: `${UNITS}candy-confectioner.png`,
  bear: `${UNITS}candy-gummy-bear.png`,
  golem: `${UNITS}candy-rock-candy-golem.png`,
  city: "public/assets/chibi/settlements/chibi-direction-candy-city-2.png",
  ship: "public/assets/chibi/units/chibi-naval-candy-battleship.png",
  portrait: `${PORTRAITS}candy-gumdrop.png`,
};

const DIRECTIONS = {
  chocolatier: {
    title: "Direction A: Chocolatier",
    line: "Dark and milk chocolate is the dark anchor on every piece (a dip, a shield, a glaze, a hull); caramel gold and cream carry the light; pink is a cherry.",
    palette: [
      ["dark chocolate", "#4a2412"],
      ["milk chocolate", "#7a4526"],
      ["caramel gold", "#e0a040"],
      ["vanilla cream", "#fff1d0"],
      ["biscuit", "#c8783a"],
      ["mint accent", "#7fe0b0"],
      ["cherry pink", "#f79cc4"],
    ],
    identity: [
      ["proposed: cream", "#fff1d0"],
      ["or keep: pink", "#ffb8d8"],
    ],
    slots: {
      trooper: "sample",
      marshmallow: "sample",
      gunner: "sample",
      donut: "sample",
      confectioner: "today",
      bear: "today",
      golem: "sample",
      city: "sample",
      ship: "sample",
    },
    notes: {
      trooper: "dipped",
      marshmallow: "choc shield",
      gunner: "choc base",
      donut: "choc glaze",
      confectioner: "kept",
      bear: "kept",
      golem: "chocolate",
      city: "choc cake",
      ship: "choc galleon",
    },
  },
  allsorts: {
    title: "Direction B: Liquorice Allsorts",
    line: "Glossy black liquorice is the dark anchor (a layer, a wheel, a band, a hull); sugar white and thick stripes of candy pink and lemon carry the light.",
    palette: [
      ["liquorice black", "#23192b"],
      ["liquorice shine", "#5a4c6e"],
      ["sugar white", "#ffffff"],
      ["candy pink", "#ff8fc0"],
      ["lemon", "#ffe04a"],
      ["orange", "#ff9a3c"],
      ["toffee (kept)", "#e0a040"],
    ],
    identity: [
      ["proposed: keep pink", "#ffb8d8"],
      ["rejected: bubblegum", "#ff7fbf"],
    ],
    slots: {
      trooper: "sample",
      marshmallow: "sample",
      gunner: "sample",
      donut: "today",
      confectioner: "today",
      bear: "today",
      golem: "sample",
      city: "sample",
      ship: "sample",
    },
    notes: {
      trooper: "allsort",
      marshmallow: "liquorice wheel",
      gunner: "liquorice base",
      donut: "kept",
      confectioner: "kept",
      bear: "kept",
      golem: "liquorice",
      city: "allsort town",
      ship: "liquorice galleon",
    },
  },
};

const CELL = 96;
const ROW = 112;
const COLUMNS = [
  ["human", "Human Fighter"],
  ["goblin", "Goblin"],
  ["trooper", "Toffee Trooper"],
  ["marshmallow", "Marshmallow"],
  ["gunner", "Gumball Gunner"],
  ["donut", "Donut Racer"],
  ["confectioner", "Confectioner"],
  ["bear", "Gummy Bear"],
  ["golem", "Golem"],
  ["city", "City 2"],
  ["ship", "Battleship"],
];
const RIVALS = {
  human: `${UNITS}fighter.png`,
  goblin: `${UNITS}goblin-goblin.png`,
};

async function tileOf(file, wash) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (wash !== undefined)
    for (let i = 0; i < data.length; i += 4)
      for (let c = 0; c < 3; c += 1)
        data[i + c] = Math.round(data[i + c] * 0.58 + wash[c] * 0.42);
  return sharp(data, { raw: info }).png().toBuffer();
}

async function ground(tile, columns) {
  const layers = [];
  for (let x = 0; x < columns * CELL; x += 80)
    for (let y = 0; y < ROW; y += 80)
      layers.push({
        input: await sharp(tile)
          .extract({
            left: 0,
            top: 0,
            width: Math.min(80, columns * CELL - x),
            height: Math.min(80, ROW - y),
          })
          .toBuffer(),
        left: x,
        top: y,
      });
  return sharp({
    create: {
      width: columns * CELL,
      height: ROW,
      channels: 4,
      background: "#000000",
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

/** A territory border as the board draws it: a colour line in a dark casing. */
function borderSvg(x, y, width, height, colour) {
  return `<rect x="${x + 3}" y="${y + 3}" width="${width - 6}" height="${height - 6}" fill="none" stroke="#1d2a28" stroke-opacity="0.55" stroke-width="6.5"/><rect x="${x + 3}" y="${y + 3}" width="${width - 6}" height="${height - 6}" fill="none" stroke="${colour}" stroke-width="3.5"/>`;
}

async function mock(direction, spec) {
  const grass = await tileOf(`${TERRAIN}/chibi-grass-1.png`);
  const mint = await tileOf(`${TERRAIN}/faction-grass/chibi-candy-grass-1.png`);
  const snow = await tileOf(`${TERRAIN}/chibi-grass-1.png`, [245, 248, 252]);
  const water = await tileOf(`${TERRAIN}/chibi-shallow-water-1.png`);
  const rows = [
    ["Today, on the Candy mint grass", mint, "today", TODAY_IDENTITY],
    ["Proposed, on the Candy mint grass", mint, "look", spec.identity[0][1]],
    ["Proposed, on default Grass", grass, "look", spec.identity[0][1]],
    ["Proposed, on Snow", snow, "look", spec.identity[0][1]],
  ];
  const width = COLUMNS.length * CELL;
  const layers = [];
  let svg = "";
  for (const [r, [, tile, kind, identity]] of rows.entries()) {
    const top = r * ROW;
    layers.push({ input: await ground(tile, COLUMNS.length), left: 0, top });
    // The ship stands on Shallow Water.
    layers.push({
      input: await sharp(await ground(water, 1)).toBuffer(),
      left: (COLUMNS.length - 1) * CELL,
      top,
    });
    for (const [c, [slot]] of COLUMNS.entries()) {
      const file =
        RIVALS[slot] ??
        (kind === "today" || spec.slots[slot] === "today"
          ? TODAY[slot]
          : sample(direction, slot));
      const meta = await sharp(file).metadata();
      layers.push({
        input: file,
        left: c * CELL + Math.floor((CELL - meta.width) / 2),
        top: top + ROW - 4 - meta.height,
      });
    }
    // The Candy territory: the city's cell and the unit cells beside it.
    svg += borderSvg(2 * CELL, top, 8 * CELL, ROW, identity);
  }
  const board = await sharp({
    create: {
      width,
      height: rows.length * ROW,
      channels: 4,
      background: "#000000",
    },
  })
    .composite([
      ...layers,
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${rows.length * ROW}">${svg}</svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();
  return { board, rows, width, height: rows.length * ROW };
}

const text = (x, y, size, content, weight = "normal", fill = "#f2efe6") =>
  `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${content}</text>`;

async function emblem(file, colour, size) {
  const portrait = await sharp(file)
    .resize(48 * 2, 48 * 2, { kernel: "nearest" })
    .png()
    .toBuffer();
  const ring = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="#2a3138" stroke="${colour}" stroke-width="6"/></svg>`,
  );
  return sharp(ring)
    .composite([
      { input: portrait, left: (size - 96) / 2, top: (size - 96) / 2 },
    ])
    .png()
    .toBuffer();
}

mkdirSync(`${RUN}/boards`, { recursive: true });
for (const [direction, spec] of Object.entries(DIRECTIONS)) {
  const { board, rows, width } = await mock(direction, spec);
  await sharp(board).toFile(`${RUN}/boards/${direction}-board-1x.png`);
  const SCALE = 3;
  const HEAD = 310;
  const LABEL = 30;
  const W = width * SCALE + 40;
  const boardTop = HEAD + 40;
  const H =
    boardTop + rows.length * (ROW * SCALE + LABEL) + ROW * rows.length + 90;
  const layers = [];
  let svg = "";
  svg += text(20, 44, 34, spec.title, "bold");
  svg += text(20, 76, 18, spec.line);
  // Palette strip.
  svg += text(20, 112, 15, "PALETTE", "bold", "#b9c0c8");
  for (const [i, [name, hex]] of spec.palette.entries()) {
    const x = 20 + i * 150;
    svg += `<rect x="${x}" y="122" width="140" height="54" fill="${hex}" stroke="#000" stroke-width="2"/>`;
    svg += text(x, 192, 13, name) + text(x, 207, 13, hex);
  }
  // Identity colour beside the other seven.
  svg += text(
    20,
    232,
    15,
    "FACTION IDENTITY COLOUR (territory border, swatch) BESIDE THE OTHER SEVEN FACTIONS",
    "bold",
    "#b9c0c8",
  );
  const strip = [...spec.identity, ...FACTIONS];
  for (const [i, [name, hex]] of strip.entries()) {
    const x = 20 + i * 150;
    const own = i < spec.identity.length;
    svg += `<rect x="${x}" y="238" width="140" height="${own ? 40 : 30}" fill="${hex}" stroke="${own ? "#ffffff" : "#000"}" stroke-width="2"/>`;
    svg +=
      text(x, own ? 294 : 284, 13, name) + text(x, own ? 309 : 299, 13, hex);
  }
  // Emblems: today's and the proposed line-unit portrait in the identity ring.
  const emblemSize = 132;
  layers.push({
    input: await emblem(TODAY.portrait, TODAY_IDENTITY, emblemSize),
    left: W - 2 * emblemSize - 60,
    top: 86,
  });
  layers.push({
    input: await emblem(
      sample(direction, "portrait"),
      spec.identity[0][1],
      emblemSize,
    ),
    left: W - emblemSize - 30,
    top: 86,
  });
  svg += text(
    W - 2 * emblemSize - 60,
    76,
    15,
    "EMBLEM TODAY",
    "bold",
    "#b9c0c8",
  );
  svg += text(W - emblemSize - 30, 76, 15, "PROPOSED", "bold", "#b9c0c8");
  // The mock board at x3, row by row with its label.
  for (const [r, [label]] of rows.entries()) {
    const top = boardTop + r * (ROW * SCALE + LABEL);
    layers.push({
      input: await sharp(board)
        .extract({ left: 0, top: r * ROW, width, height: ROW })
        .resize(width * SCALE, ROW * SCALE, { kernel: "nearest" })
        .png()
        .toBuffer(),
      left: 20,
      top: top + LABEL,
    });
    svg += text(20, top + 21, 18, label, "bold");
    for (const [c, [slot, name]] of COLUMNS.entries()) {
      const note =
        r === 0 || RIVALS[slot] !== undefined ? "" : ` (${spec.notes[slot]})`;
      svg += text(
        20 + c * CELL * SCALE + 6,
        top + LABEL + 18,
        13,
        `${name}${note}`,
        "normal",
        "#10161c",
      );
    }
  }
  const nativeTop = boardTop + rows.length * (ROW * SCALE + LABEL) + 34;
  svg += text(
    20,
    nativeTop - 8,
    18,
    "The same board at board scale (1x)",
    "bold",
  );
  layers.push({ input: board, left: 20, top: nativeTop });
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
    .toFile(`${RUN}/boards/${direction}-board.png`);
  process.stdout.write(`${RUN}/boards/${direction}-board.png\n`);
}
