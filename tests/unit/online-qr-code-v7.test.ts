// @vitest-environment jsdom

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  encodeQrCodeV7,
  QR_QUIET_ZONE_V7,
  shareLinkV7,
  type QrCodeV7,
} from "../../src/online/index";
import {
  qrCodeSvgV7,
  qrPixelSizeV7,
} from "../../src/render/dom/qr-code-svg-v7";

/**
 * The lobby's join QR code (`pulp_wars-hyan`): the in-repo encoder (byte
 * mode, level M, versions 1 to 10) and its SVG. A small reader written
 * here from the standard's tables (not the encoder's code) reads the
 * symbol back: format bits, unmasking, the zigzag and the data blocks.
 */

// ISO/IEC 18004 table E.1: alignment pattern centres, versions 1 to 10.
const ALIGNMENT = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];
// Table 9, level M: the data codewords of each block, versions 1 to 10.
const DATA_BLOCKS_M = [
  [16],
  [28],
  [44],
  [32, 32],
  [43, 43],
  [27, 27, 27, 27],
  [31, 31, 31, 31],
  [38, 38, 39, 39],
  [36, 36, 36, 37, 37],
  [43, 43, 43, 43, 44],
];
const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function dark(code: QrCodeV7, x: number, y: number): boolean {
  return code.modules[y]?.[x] ?? false;
}

/** The 15 format bits of the first copy, most significant first. */
function formatBits(code: QrCodeV7): number {
  const cells: [number, number][] = [
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [7, 8],
    [8, 8],
    [8, 7],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
  ];
  // cells[i] (y, x) holds bit i, the least significant first.
  let bits = 0;
  cells.forEach(([y, x], index) => {
    if (dark(code, x, y)) bits |= 1 << index;
  });
  return bits ^ 0x5412;
}

function isFunction(version: number, size: number, x: number, y: number) {
  const nearFinder = (cx: number, cy: number) =>
    Math.abs(x - cx) <= 4 && Math.abs(y - cy) <= 4;
  if (nearFinder(3, 3) || nearFinder(size - 4, 3) || nearFinder(3, size - 4))
    return true;
  if (x === 6 || y === 6) return true;
  if ((y === 8 && (x <= 8 || x >= size - 8)) || (x === 8 && y >= size - 8))
    return true;
  if (x === 8 && y <= 8) return true;
  if (version >= 7) {
    if (x < 6 && y >= size - 11 && y < size - 8) return true;
    if (y < 6 && x >= size - 11 && x < size - 8) return true;
  }
  const centres = ALIGNMENT[version - 1] ?? [];
  const last = centres.length - 1;
  return centres.some((cx, i) =>
    centres.some((cy, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last)) return false;
      if (i === last && j === 0) return false;
      return Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2;
    }),
  );
}

/** Reads a symbol back to its text (no error correction: it is clean). */
function readQr(code: QrCodeV7): string {
  const { size, version } = code;
  const format = formatBits(code);
  expect(format >>> 13).toBe(0); // level M
  const mask = MASKS[(format >>> 10) & 7];
  if (mask === undefined) throw new Error("No mask");
  const bits: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((size - 1 - right) >> 1) % 2 === 0;
    for (let step = 0; step < size; step += 1)
      for (const x of [right, right - 1]) {
        const y = upward ? size - 1 - step : step;
        if (isFunction(version, size, x, y)) continue;
        bits.push(Number(dark(code, x, y) !== mask(x, y)));
      }
  }
  const codewords: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8)
    codewords.push(
      bits.slice(index, index + 8).reduce((byte, bit) => (byte << 1) | bit, 0),
    );
  const blocks = DATA_BLOCKS_M[version - 1] ?? [];
  const parts = blocks.map(() => [] as number[]);
  let next = 0;
  for (let column = 0; column < Math.max(...blocks); column += 1)
    blocks.forEach((length, block) => {
      if (column < length) parts[block]?.push(codewords[next++] ?? 0);
    });
  const data = parts.flat();
  const stream = data.flatMap((byte) =>
    Array.from({ length: 8 }, (_, bit) => (byte >>> (7 - bit)) & 1),
  );
  let at = 0;
  const take = (length: number): number => {
    let value = 0;
    for (let bit = 0; bit < length; bit += 1)
      value = (value << 1) | (stream[at++] ?? 0);
    return value;
  };
  expect(take(4)).toBe(0b0100); // byte mode
  const count = take(version <= 9 ? 8 : 16);
  const bytes = Uint8Array.from({ length: count }, () => take(8));
  return new TextDecoder().decode(bytes);
}

function digest(code: QrCodeV7): string {
  return createHash("sha256")
    .update(
      code.modules
        .map((row) => row.map((value) => (value ? "1" : "0")).join(""))
        .join("\n"),
    )
    .digest("hex")
    .slice(0, 16);
}

describe("join QR code", () => {
  const local = shareLinkV7("http://localhost:6173/?seed=3#x", "ABCDE");
  const pages = shareLinkV7(
    "https://nadbordrozd.github.io/pulp_wars/",
    "XYZQW",
  );

  it("encodes the share link itself", () => {
    expect(local).toBe("http://localhost:6173/?join=ABCDE");
    for (const link of [local, pages]) {
      const code = encodeQrCodeV7(link);
      expect(code.text).toBe(link);
      expect(readQr(code)).toBe(link);
    }
  });

  it("reads back across versions, block layouts and UTF-8", () => {
    const texts = [
      "A",
      "https://example.com/some/longer/path/for/version/five/?join=HJKMN&x=1",
      `https://example.com/${"x".repeat(150)}`,
      `https://example.com/${"x".repeat(170)}`,
      "Zażółć gęślą jaźń",
    ];
    const versions = texts.map((text) => {
      const code = encodeQrCodeV7(text);
      expect(code.size).toBe(code.version * 4 + 17);
      expect(readQr(code)).toBe(text);
      return code.version;
    });
    expect(versions).toEqual([1, 5, 9, 10, 2]);
    expect(() => encodeQrCodeV7("x".repeat(214))).toThrow(/Too long/);
  });

  it("draws the finder, timing and dark modules of the standard", () => {
    const code = encodeQrCodeV7(pages);
    const { size } = code;
    for (const [cx, cy] of [
      [3, 3],
      [size - 4, 3],
      [3, size - 4],
    ] as const)
      for (let dy = -3; dy <= 3; dy += 1)
        for (let dx = -3; dx <= 3; dx += 1)
          expect(dark(code, cx + dx, cy + dy)).toBe(
            Math.max(Math.abs(dx), Math.abs(dy)) !== 2,
          );
    for (let index = 8; index < size - 8; index += 1) {
      expect(dark(code, index, 6)).toBe(index % 2 === 0);
      expect(dark(code, 6, index)).toBe(index % 2 === 0);
    }
    expect(dark(code, 8, size - 8)).toBe(true);
  });

  it("keeps the symbols a phone decoder read (macOS Core Image)", () => {
    // Rendered to PNG and decoded by CIDetector (CIDetectorTypeQRCode) to
    // exactly these links when the encoder was written (pulp_wars-hyan).
    expect([digest(encodeQrCodeV7(local)), encodeQrCodeV7(local).mask]).toEqual(
      ["ec9e6ead7c4b8509", 5],
    );
    expect([digest(encodeQrCodeV7(pages)), encodeQrCodeV7(pages).mask]).toEqual(
      ["714bf041926e9734", 2],
    );
  });

  it("renders a crisp, labelled SVG with the quiet zone", () => {
    const svg = qrCodeSvgV7(document, pages, "QR code of the join link");
    const code = encodeQrCodeV7(pages);
    const side = code.size + 2 * QR_QUIET_ZONE_V7;
    expect(svg.dataset.payload).toBe(pages);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("QR code of the join link");
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${side} ${side}`);
    expect(svg.getAttribute("width")).toBe("164");
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
    const path = svg.querySelector("path")?.getAttribute("d") ?? "";
    const squares = path.match(/M\d+ \d+h1v1h-1z/g) ?? [];
    expect(squares.length).toBe(
      code.modules.flat().filter((value) => value).length,
    );
    // The top-left finder's corner sits just inside the quiet zone.
    expect(path.startsWith(`M${QR_QUIET_ZONE_V7} ${QR_QUIET_ZONE_V7}h1`)).toBe(
      true,
    );
    expect(svg.querySelector("rect")?.getAttribute("fill")).toBe("#ffffff");
  });

  it("sizes the symbol in whole pixels per module, at most 180", () => {
    expect([29, 33, 37, 41, 45, 49].map(qrPixelSizeV7)).toEqual([
      174, 165, 148, 164, 180, 147,
    ]);
  });
});
