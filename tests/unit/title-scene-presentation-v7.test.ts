import { describe, expect, it } from "vitest";
import { assetInventoryV7 } from "../../src/assets/asset-inventory-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { chibiDirectionArtAssetsV7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_FOREST_ART_SET_V7 } from "../../src/assets/chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../../src/assets/chibi-mountain-ranges-manifest";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import {
  COAST_E,
  COAST_N,
  COAST_S,
  COAST_W,
  coastLayerPixelsV7,
} from "../../src/render/canvas/coast-sand-v7";
import { resolveChibiWithFallbackV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { factionColourV7 } from "../../src/render/canvas/faction-colours-v7";
import { createGalleryArtV7 } from "../../src/render/canvas/gallery-sprite-v7";
import {
  titleSceneHorizonCssV7,
  titleSceneScaleV7,
} from "../../src/render/dom/title-scene-view-v7";
import {
  CITY_CLEARING_V7,
  titleSceneAssetUrlsV7,
  titleSceneHorizonV7,
  titleSceneRasterUrlsV7,
  titleSceneSubjectsV7,
  titleSceneV7,
} from "../../src/render/title-scene-v7";

/** The title scene's layout (bead pulp_wars-2yc.4). */
describe("title scene", () => {
  const units = (scene: ReturnType<typeof titleSceneV7>) =>
    scene.items.filter(
      (item) => item.kind === "SUBJECT" && item.unit?.afloat === false,
    );

  it("shows every faction's flagship and Fighter on a wide canvas", () => {
    const scene = titleSceneV7({ width: 900, height: 420 });
    expect([...scene.flagships].sort()).toEqual([...FACTION_IDS_V7].sort());
    expect([...scene.fighters].sort()).toEqual([...FACTION_IDS_V7].sort());
    const subjects = scene.items.flatMap((item) =>
      item.kind === "SUBJECT" ? [item.subject] : [],
    );
    expect(subjects).toContain("UNIT:JUGGERNAUT");
    expect(subjects).toContain("UNIT:UNDEAD:JUGGERNAUT");
    expect(subjects).toContain("UNIT:CANDY:FIGHTER");
    expect(subjects).toContain("CITY:3");
    expect(subjects).toContain("TERRAIN:DEEP_WATER");
    expect(subjects.some((subject) => subject.includes("BATTLESHIP"))).toBe(
      true,
    );
    expect(units(scene)).toHaveLength(16);
  });

  it("re-flows for a phone: fewer units and one column of sea, nothing off the canvas", () => {
    const wide = titleSceneV7({ width: 900, height: 420 });
    const phone = titleSceneV7({ width: 390, height: 300 });
    expect(phone.flagships.length).toBeLessThan(wide.flagships.length);
    expect(phone.flagships.length).toBeGreaterThanOrEqual(2);
    expect(phone.fighters.length).toBeGreaterThanOrEqual(3);
    // Several factions even at the smallest size.
    expect(
      new Set([...phone.flagships, ...phone.fighters]).size,
    ).toBeGreaterThanOrEqual(5);
    const subjects = (scene: typeof phone) =>
      scene.items.flatMap((item) =>
        item.kind === "SUBJECT" ? [item.subject] : [],
      );
    expect(subjects(phone)).not.toContain("TERRAIN:DEEP_WATER");
    expect(subjects(phone)).toContain("TERRAIN:SHALLOW_WATER");
    for (const scene of [
      wide,
      phone,
      titleSceneV7({ width: 640, height: 425 }),
      titleSceneV7({ width: 392, height: 450 }),
      titleSceneV7({ width: 200, height: 130 }),
    ]) {
      for (const item of units(scene))
        if (item.kind === "SUBJECT") {
          expect(item.cx).toBeGreaterThanOrEqual(20);
          expect(item.cx).toBeLessThanOrEqual(scene.width - 20);
          expect(item.cy).toBeLessThan(scene.height);
        }
      // Ground (and its shoreline) comes first, so everything stands on it.
      const firstPiece = scene.items.findIndex(
        (item) => item.kind === "RASTER",
      );
      expect(
        scene.items
          .slice(0, firstPiece)
          .every(
            (item) =>
              item.kind === "COAST" ||
              (item.kind === "SUBJECT" && item.subject.startsWith("TERRAIN:")),
          ),
      ).toBe(true);
      expect(
        scene.items.slice(firstPiece).every((item) => item.kind !== "COAST"),
      ).toBe(true);
      expect(scene.clouds.length).toBeGreaterThanOrEqual(2);
    }
  });

  /** Sizes the scene is drawn at: desktop, tablet and phone, with a menu. */
  const sizes = [
    { width: 480, height: 333, clearLeft: 163 },
    { width: 640, height: 400, clearLeft: 205 },
    { width: 640, height: 360 },
    { width: 640, height: 360, clearLeft: 220 },
    { width: 900, height: 420 },
    { width: 256, height: 341 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
    { width: 844, height: 390, clearLeft: 360 },
    { width: 512, height: 300, clearLeft: 310 },
  ];

  it("stands the city on open ground, the woods right up to it on both sides", () => {
    for (const size of sizes) {
      const scene = titleSceneV7(size);
      const city = scene.items.find(
        (item) => item.kind === "SUBJECT" && item.subject === "CITY:3",
      );
      if (city?.kind !== "SUBJECT") throw new Error("no city");
      const woods = scene.items.flatMap((item) =>
        item.kind === "RASTER" && item.url.includes("forest") ? [item] : [],
      );
      // No forest piece overlaps the city's cell and walls.
      for (const piece of woods)
        expect(
          piece.x + piece.width <= city.cx - CITY_CLEARING_V7 ||
            piece.x >= city.cx + CITY_CLEARING_V7,
          `${JSON.stringify(size)} ${piece.x}`,
        ).toBe(true);
      expect(CITY_CLEARING_V7).toBeGreaterThanOrEqual(52);
      // The woods come right up to the clearing on the west, and on the
      // east wherever a piece fits before the shore.
      expect(
        woods.some(
          (piece) => piece.x + piece.width === city.cx - CITY_CLEARING_V7,
        ),
        JSON.stringify(size),
      ).toBe(true);
      const shore = Math.min(
        ...scene.items.flatMap((item) =>
          item.kind === "SUBJECT" && item.subject.endsWith("_WATER")
            ? [item.cx - 40]
            : [],
        ),
      );
      if (shore - (city.cx + CITY_CLEARING_V7) >= 59)
        expect(
          woods.some((piece) => piece.x === city.cx + CITY_CLEARING_V7),
          JSON.stringify(size),
        ).toBe(true);
      // ...and fill the land up to the shore, but for a strip too narrow
      // for even a clump of trees.
      const eastEnd = Math.max(
        city.cx + CITY_CLEARING_V7,
        ...woods
          .filter((piece) => piece.x > city.cx)
          .map((piece) => piece.x + piece.width - 6),
      );
      const narrowest = Math.min(
        ...CHIBI_FOREST_ART_SET_V7.clumps.map((clump) => clump.width),
      );
      expect(shore - eastEnd, JSON.stringify(size)).toBeLessThan(narrowest + 6);
      // Grass round the city: no Farm or other building beside it.
      expect(
        scene.items.some(
          (item) =>
            item.kind === "SUBJECT" && item.subject.startsWith("IMPROVEMENT:"),
        ),
      ).toBe(false);
      // The city is drawn before the ranks stand in front.
      const firstUnit = scene.items.findIndex(
        (item) => item.kind === "SUBJECT" && item.unit !== undefined,
      );
      expect(scene.items.indexOf(city)).toBeLessThan(firstUnit);
    }
    // The woods band still spans the land of a wide scene.
    const wide = titleSceneV7({ width: 900, height: 420 });
    const covered = wide.items
      .flatMap((item) =>
        item.kind === "RASTER" && item.url.includes("forest")
          ? [item.width - 6]
          : [],
      )
      .reduce((sum, width) => sum + width, 0);
    expect(covered).toBeGreaterThanOrEqual(900 - 160 - 120 - 80);
  });

  it("draws the board's shoreline round the bay: sand on the land, surf on the water", () => {
    for (const size of sizes) {
      const scene = titleSceneV7(size);
      const ground = scene.items.flatMap((item) =>
        item.kind === "SUBJECT" && item.subject.startsWith("TERRAIN:")
          ? [item]
          : [],
      );
      const shore = Math.min(
        ...ground.flatMap((item) =>
          item.subject === "TERRAIN:GRASS" ? [] : [item.cx - 40],
        ),
      );
      const top = Math.min(
        ...ground.flatMap((item) =>
          item.subject === "TERRAIN:GRASS" ? [] : [item.cy - 40],
        ),
      );
      // The sea's columns are whole: the shore is a whole column (or two)
      // from the east edge, so the ship rides clear of it.
      expect([80, 160]).toContain(scene.width - shore);
      const ship = scene.items.find(
        (item) => item.kind === "SUBJECT" && item.unit?.afloat === true,
      );
      if (ship?.kind !== "SUBJECT") throw new Error("no ship");
      expect(ship.cx - 30).toBeGreaterThanOrEqual(shore + 6);
      expect(ship.cx + 40).toBeLessThanOrEqual(scene.width);
      const coast = scene.items.flatMap((item) =>
        item.kind === "COAST" ? [item] : [],
      );
      // Land west of the shore has sand on its east side; the first sea
      // column has the waterline on its west side; land over the bay has
      // sand at its foot and the bay's top row its waterline above.
      const at = (x: number, y: number) =>
        coast.find((item) => item.x === x && item.y === y);
      const below = (item: (typeof coast)[number]) => item.y + 80 > top;
      expect(
        coast.some(
          (item) =>
            item.layer === "SAND" &&
            item.x === shore - 80 &&
            (item.neighbours & COAST_E) !== 0 &&
            below(item),
        ),
      ).toBe(true);
      expect(
        coast.some(
          (item) =>
            item.layer === "SURF" &&
            item.x === shore &&
            (item.neighbours & COAST_W) !== 0,
        ),
      ).toBe(true);
      const surfTop = at(shore, top);
      expect(surfTop?.layer).toBe("SURF");
      expect((surfTop?.neighbours ?? 0) & COAST_N).toBe(COAST_N);
      expect(
        coast.some(
          (item) =>
            item.layer === "SAND" &&
            item.x === shore &&
            item.y < top &&
            (item.neighbours & COAST_S) !== 0,
        ),
      ).toBe(true);
      // Only cells at the coast carry a layer, and each is a real one.
      for (const item of coast) {
        expect(item.x).toBeGreaterThanOrEqual(shore - 80);
        expect(item.y).toBeGreaterThanOrEqual(top - 80);
        expect(item.rows).toBeGreaterThanOrEqual(24);
        expect(item.rows).toBeLessThanOrEqual(80);
        expect(
          coastLayerPixelsV7(item.layer, item.neighbours, item.phase).some(
            (value) => value > 0,
          ),
        ).toBe(true);
      }
      // No tree stands in the water: the woods end at the shore.
      for (const item of scene.items)
        if (item.kind === "RASTER" && item.url.includes("forest"))
          expect(item.x + item.width).toBeLessThanOrEqual(shore);
    }
  });

  it("is the same picture every time (no randomness)", () => {
    expect(titleSceneV7({ width: 512, height: 300 })).toEqual(
      titleSceneV7({ width: 512, height: 300 }),
    );
  });

  it("draws at a whole number of screen pixels per art pixel", () => {
    // The scene fills the screen behind the main menu (pulp_wars-2yc.18).
    expect(titleSceneScaleV7(390, 844)).toBe(1);
    expect(titleSceneScaleV7(844, 390)).toBe(1);
    expect(titleSceneScaleV7(768, 1024)).toBe(3);
    expect(titleSceneScaleV7(1024, 768)).toBe(2);
    expect(titleSceneScaleV7(1280, 720)).toBe(2);
    expect(titleSceneScaleV7(1920, 1080)).toBe(3);
    expect(titleSceneScaleV7(2560, 1440)).toBe(4);
    expect(titleSceneScaleV7(3840, 2160)).toBe(4);
  });

  it("keeps the ranks and the city clear of the menu at the west edge", () => {
    const plain = titleSceneV7({ width: 640, height: 360 });
    const cleared = titleSceneV7({ width: 640, height: 360, clearLeft: 220 });
    const west = (scene: typeof plain): number =>
      Math.min(
        ...scene.items.flatMap((item) =>
          item.kind === "SUBJECT" &&
          (item.unit !== undefined || item.subject === "CITY:3")
            ? [item.cx]
            : [],
        ),
      );
    expect(west(plain)).toBeLessThan(60);
    // A unit is drawn about its centre: half a sprite stays east of the menu.
    expect(west(cleared)).toBeGreaterThanOrEqual(220 + 30);
    // Fewer stand on the land that is left, and all of them on land: the
    // sea gives up its second column to the ranks.
    expect(cleared.fighters.length).toBeLessThan(plain.fighters.length);
    expect(cleared.flagships.length).toBeGreaterThanOrEqual(2);
    const coast = (scene: typeof plain): number =>
      Math.min(
        ...scene.items.flatMap((item) =>
          item.kind === "SUBJECT" && item.subject === "TERRAIN:SHALLOW_WATER"
            ? [item.cx - 40]
            : [],
        ),
      );
    expect(coast(plain)).toBe(640 - 160);
    expect(coast(cleared)).toBe(640 - 80);
    for (const item of cleared.items)
      if (item.kind === "SUBJECT" && item.unit?.afloat === false)
        expect(item.cx).toBeLessThanOrEqual(coast(cleared) - 20);
    // A tight strip still holds a flagship, two Fighters and the city.
    const tight = titleSceneV7({ width: 512, height: 300, clearLeft: 310 });
    expect(tight.flagships.length).toBe(1);
    expect(tight.fighters.length).toBe(2);
    expect(west(tight)).toBeGreaterThanOrEqual(310 + 30);
    for (const item of tight.items)
      if (item.kind === "SUBJECT") expect(Number.isFinite(item.cx)).toBe(true);
    // The ground and the horizon still span the whole picture.
    const ground = (scene: typeof plain): number =>
      scene.items.filter(
        (item) =>
          item.kind === "SUBJECT" && item.subject.startsWith("TERRAIN:"),
      ).length;
    expect(ground(cleared)).toBe(ground(plain));
    // A menu that would leave the ranks no room is ignored (a phone).
    expect(titleSceneV7({ width: 390, height: 844, clearLeft: 300 })).toEqual(
      titleSceneV7({ width: 390, height: 844 }),
    );
  });

  it("uses only art the preloader loads, read from the manifests", () => {
    const preloaded = new Set(
      assetInventoryV7("LIVE").map((entry) => entry.url),
    );
    for (const url of titleSceneRasterUrlsV7())
      expect(preloaded.has(url), url).toBe(true);
    const registered = new Set(
      [...CHIBI_ART_ASSETS_V7, ...chibiDirectionArtAssetsV7()].map(
        (asset) => asset.subject,
      ),
    );
    for (const subject of titleSceneSubjectsV7())
      expect(registered.has(subject), subject).toBe(true);
    // Every piece a scene draws comes from the forest and massif sets.
    const pieces = new Set(
      [
        ...CHIBI_MOUNTAIN_ART_SET_V7.pieces,
        ...CHIBI_FOREST_ART_SET_V7.pieces,
        ...CHIBI_FOREST_ART_SET_V7.clumps,
      ].map((piece) => piece.url),
    );
    const scene = titleSceneV7({ width: 900, height: 420 });
    const drawn = scene.items.flatMap((item) =>
      item.kind === "RASTER" ? [item.url] : [],
    );
    expect(drawn.length).toBeGreaterThan(6);
    for (const url of drawn) expect(pieces.has(url), url).toBe(true);
    for (const item of scene.items)
      if (item.kind === "SUBJECT")
        expect(titleSceneSubjectsV7()).toContain(item.subject);
  });

  /**
   * The loading screen (bead pulp_wars-502h) shows the scene once the start
   * has preloaded `titleSceneAssetUrlsV7()`: every file the scene's art
   * chain asks for must be in that list, or the scene would be drawn with a
   * piece missing and fetched a second time.
   */
  it("lists every file its art chain asks for, a small part of the look", () => {
    const listed = new Set(titleSceneAssetUrlsV7());
    const inventory = new Set(assetInventoryV7("LIVE").map(({ url }) => url));
    for (const url of listed) expect(inventory.has(url), url).toBe(true);
    expect(listed.size).toBeGreaterThan(40);
    expect(listed.size).toBeLessThan(inventory.size / 5);
    for (const url of titleSceneRasterUrlsV7())
      expect(listed.has(url), url).toBe(true);

    const asked = new Set<string>();
    const art = createGalleryArtV7(
      {
        loadImage(url, settle) {
          asked.add(url);
          settle(true);
          return { url } as unknown as CanvasImageSource;
        },
        readPixels: (_image, width, height) =>
          new Uint8ClampedArray(width * height * 4).fill(255),
        createSurface: (pixels, width, height) =>
          ({ pixels, width, height }) as unknown as CanvasImageSource,
      },
      () => undefined,
    );
    for (const [width, height] of [
      [1440, 1000],
      [390, 844],
      [844, 390],
      [1920, 1080],
    ] as const) {
      const scale = titleSceneScaleV7(width, height);
      for (const dpr of [1, 2, 3]) {
        const scene = titleSceneV7({
          width: width / scale,
          height: height / scale,
        });
        // Twice: a raster that settles may lead to a further file.
        for (let pass = 0; pass < 2; pass += 1)
          for (const item of scene.items) {
            if (item.kind === "RASTER") asked.add(item.url);
            if (item.kind !== "SUBJECT") continue;
            const { resolution } = resolveChibiWithFallbackV7(art, {
              subject: item.subject,
              at: item.at,
              ownerColor:
                item.faction === undefined
                  ? undefined
                  : factionColourV7(item.faction),
              deviceScale: scale * dpr,
            });
            expect(resolution.kind, item.subject).toBe("READY");
          }
      }
    }
    expect(asked.size).toBeGreaterThan(20);
    for (const url of asked) expect(listed.has(url), url).toBe(true);
  });

  it("puts the horizon at the top of its farthest row of ground", () => {
    for (const height of [130, 300, 333, 422, 844]) {
      const scene = titleSceneV7({ width: 600, height });
      const ground = scene.items.find(
        (item) => item.kind === "SUBJECT" && item.subject === "TERRAIN:GRASS",
      );
      if (ground?.kind !== "SUBJECT") throw new Error("no ground");
      expect(titleSceneHorizonV7(height)).toBe(ground.cy - 40);
      // Nothing of the ground is drawn above it.
      for (const item of scene.items)
        if (item.kind === "SUBJECT" && item.subject.startsWith("TERRAIN:"))
          expect(item.cy - 40).toBeGreaterThanOrEqual(
            titleSceneHorizonV7(height),
          );
    }
    // In CSS px, at the scale the view draws.
    expect(titleSceneHorizonCssV7(1440, 1000)).toBe(
      titleSceneHorizonV7(1000 / 3) * 3,
    );
    expect(titleSceneScaleV7(1440, 1000)).toBe(3);
  });
});
