import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAssetProblemsV7,
  chibiFallbackSubjectV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_UNOWNED_OWNER_COLOUR_V7,
  createChibiArtResolverV7,
  resolveChibiWithFallbackV7,
  type ChibiRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";

/**
 * Rasters settle at once and read back as blank pixels; a URL containing
 * "broken" fails to load, one containing "unreadable" fails pixel readback.
 */
const syncEnvironment: ChibiRasterEnvironmentV7 = {
  loadImage(url, settle) {
    settle(!url.includes("broken"));
    return { url } as unknown as CanvasImageSource;
  },
  readPixels: (image, width, height) =>
    (image as unknown as { url: string }).url.includes("unreadable")
      ? null
      : new Uint8ClampedArray(width * height * 4),
  createSurface: () => ({ surface: true }) as unknown as CanvasImageSource,
};

function unit(
  id: string,
  subject: ArtSubjectV7,
  url = `/${id}.png`,
): ChibiArtAssetV7 {
  return {
    id,
    subject,
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url,
    ownerMaskUrl: `/${id}.mask.png`,
  };
}

function resolver(assets: readonly ChibiArtAssetV7[]) {
  const built = buildChibiArtRegistryV7(assets);
  expect(built.problems).toEqual([]);
  return createChibiArtResolverV7({
    environment: syncEnvironment,
    redraw: () => undefined,
    registry: built.registry,
  });
}

/** Units always have an owner, so requests carry an owner colour. */
const request = (subject: ArtSubjectV7) => ({
  subject,
  at: { x: 2, y: 3 },
  ownerColor: RULESET7_PLAYER_COLORS.TEAL,
  deviceScale: 1,
});

describe("Faction-aware chibi subjects", () => {
  it("gives Undead land units their own subject and keeps shared art for ships and transports", () => {
    expect(
      unitArtSubjectV7({ role: "FIGHTER", form: "LAND", faction: "UNDEAD" }),
    ).toBe("UNIT:UNDEAD:FIGHTER");
    expect(
      unitArtSubjectV7({ role: "JUGGERNAUT", form: "LAND", faction: "UNDEAD" }),
    ).toBe("UNIT:UNDEAD:JUGGERNAUT");
    expect(
      unitArtSubjectV7({ role: "FIGHTER", form: "LAND", faction: "ORIGINAL" }),
    ).toBe("UNIT:FIGHTER");
    for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const)
      expect(unitArtSubjectV7({ role, form: "NAVAL", faction: "UNDEAD" })).toBe(
        `UNIT:${role}`,
      );
    expect(
      unitArtSubjectV7({
        role: "FIGHTER",
        form: "EMBARKED",
        faction: "UNDEAD",
      }),
    ).toBe("UNIT:EMBARKED_TRANSPORT");
  });

  it("falls back from an Undead subject to the Human subject of the role only", () => {
    expect(chibiFallbackSubjectV7("UNIT:UNDEAD:MARKSMAN")).toBe(
      "UNIT:MARKSMAN",
    );
    expect(chibiFallbackSubjectV7("UNIT:MARKSMAN")).toBeNull();
    expect(chibiFallbackSubjectV7("GRAVE")).toBeNull();
    expect(chibiFallbackSubjectV7("CITY:1")).toBeNull();
  });

  it("uses the Undead raster when registered and the Human raster otherwise", () => {
    const art = resolver([
      unit("human-fighter", "UNIT:FIGHTER"),
      unit("human-marksman", "UNIT:MARKSMAN"),
      unit("undead-fighter", "UNIT:UNDEAD:FIGHTER"),
      unit("undead-guard", "UNIT:UNDEAD:GUARD", "/broken-guard.png"),
      unit("human-guard", "UNIT:GUARD"),
    ]);
    const own = resolveChibiWithFallbackV7(art, request("UNIT:UNDEAD:FIGHTER"));
    expect(own.factionArt).toBe(true);
    expect(own.resolution.kind === "READY" && own.resolution.asset.id).toBe(
      "undead-fighter",
    );
    // No Undead Banshee raster: the Human Marksman stands in.
    const standIn = resolveChibiWithFallbackV7(
      art,
      request("UNIT:UNDEAD:MARKSMAN"),
    );
    expect(standIn.factionArt).toBe(false);
    expect(
      standIn.resolution.kind === "READY" && standIn.resolution.asset.id,
    ).toBe("human-marksman");
    // A registered Undead raster that fails to load also falls back.
    const broken = resolveChibiWithFallbackV7(
      art,
      request("UNIT:UNDEAD:GUARD"),
    );
    expect(broken.factionArt).toBe(false);
    expect(
      broken.resolution.kind === "READY" && broken.resolution.asset.id,
    ).toBe("human-guard");
    // Neither exists: legacy art (MISSING), still a stand-in.
    const none = resolveChibiWithFallbackV7(art, request("UNIT:UNDEAD:KNIGHT"));
    expect(none).toEqual({
      resolution: { kind: "MISSING" },
      factionArt: false,
    });
    // Shared subjects never fall back.
    expect(
      resolveChibiWithFallbackV7(art, request("UNIT:FIGHTER")).factionArt,
    ).toBe(false);
  });

  it("recolours an owner-less Undead raster to neutral and falls back when its pixels cannot be read", () => {
    const art = resolver([
      unit("undead-fighter", "UNIT:UNDEAD:FIGHTER"),
      unit("human-fighter", "UNIT:FIGHTER"),
      unit("undead-guard", "UNIT:UNDEAD:GUARD", "/unreadable-guard.png"),
      unit("human-guard", "UNIT:GUARD"),
    ]);
    // No owner colour: the masked Undead raster still resolves, recoloured
    // to the neutral stone (batch 4), and counts as Undead art.
    const neutral = resolveChibiWithFallbackV7(art, {
      subject: "UNIT:UNDEAD:FIGHTER",
      at: { x: 2, y: 3 },
      deviceScale: 1,
    });
    expect(neutral.factionArt).toBe(true);
    expect(
      neutral.resolution.kind === "READY" && neutral.resolution.cacheKey,
    ).toBe(`chibi:undead-fighter@1#${CHIBI_UNOWNED_OWNER_COLOUR_V7}`);
    // A recolour that cannot read the Undead raster's pixels is MISSING, so
    // the Human sprite of the role stands in (with the badge).
    const unreadable = resolveChibiWithFallbackV7(
      art,
      request("UNIT:UNDEAD:GUARD"),
    );
    expect(unreadable.factionArt).toBe(false);
    expect(
      unreadable.resolution.kind === "READY" && unreadable.resolution.asset.id,
    ).toBe("human-guard");
  });

  it("treats a still-loading Undead raster as Undead art", () => {
    const pending = createChibiArtResolverV7({
      environment: {
        ...syncEnvironment,
        loadImage: (url) => ({ url }) as unknown as CanvasImageSource,
      },
      redraw: () => undefined,
      registry: buildChibiArtRegistryV7([
        unit("undead-fighter", "UNIT:UNDEAD:FIGHTER"),
        unit("human-fighter", "UNIT:FIGHTER"),
      ]).registry,
    });
    expect(
      resolveChibiWithFallbackV7(pending, request("UNIT:UNDEAD:FIGHTER")),
    ).toEqual({ resolution: { kind: "LOADING" }, factionArt: true });
  });

  it("accepts Undead units and the unowned Grave in the runtime contract", () => {
    expect(chibiAssetProblemsV7(unit("u", "UNIT:UNDEAD:CAPTAIN"))).toEqual([]);
    const unmasked: ChibiArtAssetV7 = {
      id: "u",
      subject: "UNIT:UNDEAD:CAPTAIN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: "/u.png",
    };
    expect(chibiAssetProblemsV7(unmasked).join("\n")).toContain("owner mask");
    expect(
      chibiAssetProblemsV7({
        id: "grave",
        subject: "GRAVE",
        assetClass: "RESOURCE",
        width: 40,
        height: 40,
        url: "/grave.png",
      }),
    ).toEqual([]);
  });

  it("registers every Undead land role and the Grave, and no Undead ship", () => {
    const undead = CHIBI_ART_ASSETS_V7.map((asset) => asset.subject)
      .filter((subject) => subject.startsWith("UNIT:UNDEAD:"))
      .sort();
    expect(undead).toEqual(
      [
        "FIGHTER",
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "CAPTAIN",
        "CATAPULT",
        "KNIGHT",
        "JUGGERNAUT",
      ]
        .map((role) => `UNIT:UNDEAD:${role}`)
        .sort(),
    );
    const subjects = new Set(CHIBI_ART_ASSETS_V7.map((asset) => asset.subject));
    expect(subjects.has("GRAVE")).toBe(true);
    const grave = CHIBI_ART_ASSETS_V7.find(
      (asset) => asset.subject === "GRAVE",
    );
    expect(grave?.assetClass).toBe("RESOURCE");
    expect(grave?.ownerMaskUrl).toBeUndefined();
    for (const asset of CHIBI_ART_ASSETS_V7)
      expect(asset.subject).not.toMatch(
        /^UNIT:UNDEAD:(PATROL_BOAT|BATTLESHIP)$/,
      );
  });
});
