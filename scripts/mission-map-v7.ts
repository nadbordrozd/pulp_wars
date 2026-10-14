import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  generatedMissionLayersV7,
  missionMapLayersV7,
  type MissionMapLayersV7,
} from "../src/engine/v7/missions/generated-map";
import { missionByIdV7 } from "../src/engine/v7/missions/index";
import type {
  MissionMapSourceV7,
  MissionMapTypeV7,
} from "../src/engine/v7/missions/types";

/**
 * The mission map tool (`pulp_wars-v642.1`, docs/product/CAMPAIGN.md section
 * 10.3). A mission board is the map generator's output for a recorded map
 * type, size, seat count, and seed plus a few recorded edits; this tool is
 * how a mission author looks for a good seed and bakes it.
 *
 *   tsx scripts/mission-map-v7.ts browse --map pangea --size 14 --seats 2 \
 *       --seeds 1-24 --out <dir>
 *     One contact sheet (`<map>-<size>-<seats>-<from>-<to>.png`) of the
 *     generator's boards, each labelled with its seed.
 *
 *   tsx scripts/mission-map-v7.ts bake --map pangea --size 14 --seats 2 \
 *       --seed 7 [--out <dir>]
 *     Prints the layers as the TypeScript of a mission definition (terrain,
 *     resources, biomes, villages, chests, the generator's capitals) and,
 *     with `--out`, writes the board's picture.
 *
 *   tsx scripts/mission-map-v7.ts show --mission FRONTIER_1 --out <dir>
 *     The picture of a registered mission's board with its cities, units,
 *     and landmarks.
 *
 * The pictures are a plain colour key, not the game's art: Grass by biome
 * (Plains light, Woodland green, Highlands olive), Forest dark green with a
 * tree, Mountain grey with a peak, Shallow and Deep Water, the Rift violet;
 * a dot for a resource; V a village, a star with the seat number a capital,
 * C a treasure chest.
 */
type Marker = {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly fill: string;
};

const TILE = 22;
const GAP = 14;
const LABEL = 18;

const arg = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};
const need = (name: string): string => {
  const value = arg(name);
  if (value === undefined) throw new Error(`--${name} is required`);
  return value;
};

function mapType(text: string): MissionMapTypeV7 {
  const value = text.toUpperCase().replace("-", "_");
  if (
    value === "DRY_LAND" ||
    value === "PANGEA" ||
    value === "CONTINENTS" ||
    value === "ARCHIPELAGO" ||
    value === "LAKES"
  )
    return value;
  throw new Error(`Unknown map type ${text}`);
}

function size(text: string): 11 | 14 | 16 | 20 {
  const value = Number(text);
  if (value === 11 || value === 14 || value === 16 || value === 20)
    return value;
  throw new Error("--size is 11, 14, 16, or 20");
}

function isLand(layers: MissionMapLayersV7, x: number, y: number): boolean {
  const char = layers.terrain[y]?.[x];
  return char !== undefined && char !== "~";
}

const RESOURCE_FILL: Readonly<Record<string, string>> = {
  r: "#e2483d",
  e: "#f2d34b",
  g: "#8a5a2b",
  o: "#30343b",
  s: "#f4f7fb",
  p: "#f6b8e2",
};

/** The SVG of one board at `(ox, oy)`, with its markers. */
function boardSvg(
  layers: MissionMapLayersV7,
  ox: number,
  oy: number,
  markers: readonly Marker[],
): string {
  const parts: string[] = [];
  for (let y = 0; y < layers.size; y += 1)
    for (let x = 0; x < layers.size; x += 1) {
      const terrain = layers.terrain[y]?.[x] ?? ".";
      const biome = layers.biomes[y]?.[x] ?? "P";
      const px = ox + x * TILE;
      const py = oy + y * TILE;
      const ground =
        biome === "W" ? "#9ccf7a" : biome === "H" ? "#c2c38a" : "#c8e39a";
      const shallow =
        isLand(layers, x - 1, y) ||
        isLand(layers, x + 1, y) ||
        isLand(layers, x, y - 1) ||
        isLand(layers, x, y + 1);
      const fill =
        terrain === "~"
          ? shallow
            ? "#7fc4e8"
            : "#3f86c4"
          : terrain === "x"
            ? "#5b3a8c"
            : terrain === "^"
              ? "#a9a9a4"
              : terrain === "f"
                ? "#5e9c4e"
                : ground;
      parts.push(
        `<rect x="${px}" y="${py}" width="${TILE}" height="${TILE}" fill="${fill}" stroke="#00000022" stroke-width="0.5"/>`,
      );
      if (terrain === "f")
        parts.push(
          `<path d="M${px + TILE / 2} ${py + 4} L${px + TILE - 5} ${py + TILE - 5} L${px + 5} ${py + TILE - 5} Z" fill="#2f6b33"/>`,
        );
      if (terrain === "^")
        parts.push(
          `<path d="M${px + TILE / 2} ${py + 3} L${px + TILE - 3} ${py + TILE - 4} L${px + 3} ${py + TILE - 4} Z" fill="#6f6f6c"/>`,
        );
      const resource = layers.resources[y]?.[x] ?? ".";
      if (resource !== ".")
        parts.push(
          `<circle cx="${px + TILE - 6}" cy="${py + 6}" r="3.2" fill="${RESOURCE_FILL[resource] ?? "#fff"}" stroke="#000" stroke-width="0.6"/>`,
        );
    }
  for (const marker of markers) {
    const cx = ox + marker.x * TILE + TILE / 2;
    const cy = oy + marker.y * TILE + TILE / 2;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${TILE / 2 - 2}" fill="${marker.fill}" stroke="#111" stroke-width="1.2"/>`,
      `<text x="${cx}" y="${cy + 4}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" text-anchor="middle" fill="#111">${marker.label}</text>`,
    );
  }
  return parts.join("");
}

function generatedMarkers(layers: MissionMapLayersV7): Marker[] {
  return [
    ...layers.villages.map((at) => ({ ...at, label: "V", fill: "#f3e2c0" })),
    ...layers.treasureChests.map((at) => ({
      ...at,
      label: "C",
      fill: "#ffd24a",
    })),
    ...layers.capitals.map((at, seat) => ({
      ...at,
      label: `★${String(seat)}`,
      fill: seat === 0 ? "#ff8f7a" : "#8fd0ff",
    })),
  ];
}

async function writePng(
  file: string,
  width: number,
  height: number,
  body: string,
): Promise<void> {
  mkdirSync(path.dirname(file), { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f7f2e6"/>${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`wrote ${file}`);
}

function tsRows(name: string, rows: readonly string[]): string {
  return `  ${name}: [\n${rows.map((row) => `    "${row}",`).join("\n")}\n  ],`;
}

function tsCoords(
  name: string,
  coords: readonly { x: number; y: number }[],
): string {
  return `  ${name}: [\n${coords
    .map((at) => `    { x: ${String(at.x)}, y: ${String(at.y)} },`)
    .join("\n")}\n  ],`;
}

async function browse(): Promise<void> {
  const type = mapType(need("map"));
  const boardSize = size(need("size"));
  const seats = Number(arg("seats") ?? "2");
  const [fromText, toText] = need("seeds").split("-");
  const from = Number(fromText);
  const to = Number(toText ?? fromText);
  const out = need("out");
  const columns = Number(arg("columns") ?? "6");
  const cell = boardSize * TILE + GAP;
  const parts: string[] = [];
  let index = 0;
  for (let seed = from; seed <= to; seed += 1) {
    let layers: MissionMapLayersV7;
    try {
      layers = generatedMissionLayersV7({
        mapType: type,
        size: boardSize,
        seats,
        seed,
      });
    } catch (error) {
      console.log(`seed ${String(seed)}: ${String(error)}`);
      continue;
    }
    const ox = GAP + (index % columns) * cell;
    const oy = GAP + Math.floor(index / columns) * (cell + LABEL);
    parts.push(
      `<text x="${ox}" y="${oy + 12}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#222">seed ${String(seed)}</text>`,
      boardSvg(layers, ox, oy + LABEL, generatedMarkers(layers)),
    );
    index += 1;
  }
  const rows = Math.ceil(index / columns);
  await writePng(
    path.join(
      out,
      `${type.toLowerCase()}-${String(boardSize)}-${String(seats)}-${String(from)}-${String(to)}.png`,
    ),
    GAP + Math.min(index, columns) * cell,
    GAP + rows * (cell + LABEL),
    parts.join(""),
  );
}

async function bake(): Promise<void> {
  const source: MissionMapSourceV7 = {
    mapType: mapType(need("map")),
    size: size(need("size")),
    seats: Number(arg("seats") ?? "2"),
    seed: Number(need("seed")),
    edits: [],
  };
  const layers = missionMapLayersV7(source);
  console.log(
    [
      `  size: ${String(source.size)},`,
      `  source: {`,
      `    mapType: "${source.mapType}",`,
      `    size: ${String(source.size)},`,
      `    seats: ${String(source.seats)},`,
      `    seed: ${String(source.seed)},`,
      `    edits: [],`,
      `  },`,
      tsRows("terrain", layers.terrain),
      tsRows("resources", layers.resources),
      `  biome: "PLAINS",`,
      tsRows("biomes", layers.biomes),
      tsCoords("villages", layers.villages),
      tsCoords("treasureChests", layers.treasureChests),
      `  // The generator's capitals, by seat: ${layers.capitals
        .map((at) => `(${String(at.x)}, ${String(at.y)})`)
        .join(" ")}`,
    ].join("\n"),
  );
  const out = arg("out");
  if (out !== undefined)
    await writePng(
      path.join(
        out,
        `${source.mapType.toLowerCase()}-${String(source.size)}-${String(source.seats)}-seed-${String(source.seed)}.png`,
      ),
      GAP * 2 + source.size * TILE,
      GAP * 2 + source.size * TILE,
      boardSvg(layers, GAP, GAP, generatedMarkers(layers)),
    );
}

async function show(): Promise<void> {
  const id = need("mission");
  const mission = missionByIdV7(id);
  if (mission === null) throw new Error(`${id} is not registered`);
  const layers: MissionMapLayersV7 = {
    size: mission.size,
    terrain: mission.terrain,
    resources: mission.resources,
    biomes:
      mission.biomes ??
      mission.terrain.map((row) => row.replace(/./g, mission.biome[0] ?? "P")),
    villages: mission.villages,
    treasureChests: mission.treasureChests ?? [],
    capitals: [],
  };
  const seatFill = ["#ff8f7a", "#8fd0ff", "#c6a4ff", "#ffe08a"];
  const markers: Marker[] = [
    ...generatedMarkers(layers),
    ...mission.seats.flatMap((seat, index) => [
      ...seat.cities.map((city, cityIndex) => ({
        ...city.at,
        label: `${cityIndex === 0 ? "★" : "●"}${String(index)}`,
        fill: seatFill[index] ?? "#fff",
      })),
    ]),
    ...(mission.landmarks ?? []).map((landmark) => ({
      ...landmark.at,
      label: "◎",
      fill: "#ffffff",
    })),
  ];
  const unitDots = mission.seats
    .flatMap((seat, index) =>
      seat.units.map(
        (unit) =>
          `<rect x="${GAP + unit.at.x * TILE + 1}" y="${GAP + unit.at.y * TILE + TILE - 7}" width="6" height="6" fill="${seatFill[index] ?? "#fff"}" stroke="#111" stroke-width="0.8"/>`,
      ),
    )
    .join("");
  await writePng(
    path.join(need("out"), `${id.toLowerCase()}.png`),
    GAP * 2 + mission.size * TILE,
    GAP * 2 + mission.size * TILE,
    boardSvg(layers, GAP, GAP, markers) + unitDots,
  );
}

const command = process.argv[2];
const run =
  command === "browse"
    ? browse
    : command === "bake"
      ? bake
      : command === "show"
        ? show
        : null;
if (run === null) {
  console.error("usage: mission-map-v7.ts browse|bake|show (see the file)");
  process.exit(1);
}
await run();
