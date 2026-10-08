// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAssetProblemsV7,
  chibiFallbackSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_TECH_ART_SUBJECTS_V7,
  commandSubjectV7,
  portraitSubjectV7,
  rewardSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import {
  RULESET7_TECH_ART_IDS,
  commandArtIdV7,
} from "../../src/assets/ruleset7-ui-art";
import {
  TECHNOLOGY_IDS_V7,
  type CommandV7,
  type RewardIdV7,
} from "../../src/engine/index";
import { CHIBI_UNOWNED_OWNER_COLOUR_V7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  CHIBI_DOM_BOXES_V7,
  chibiDomImageV7,
  chibiDomScaleV7,
  createChibiDomArtV7,
  paintedBoundsV7,
  type ChibiDomEnvironmentV7,
} from "../../src/render/dom/chibi-dom-art-v7";

/**
 * Rasters settle at once. Every master reads back as a 2 x 3 opaque block
 * at (5, 4); a mask reads back fully opaque. "broken" URLs fail to load.
 * Encoded surfaces report the size and the owner colour of their pixels.
 */
function environment(): ChibiDomEnvironmentV7 & { readonly encoded: string[] } {
  const encoded: string[] = [];
  return {
    encoded,
    loadImage(url, settle) {
      settle(!url.includes("broken"));
      return { url } as unknown as CanvasImageSource;
    },
    readPixels(image, width, height) {
      const source = image as unknown as {
        url?: string;
        pixels?: Uint8ClampedArray;
      };
      if (source.pixels !== undefined) return source.pixels;
      const pixels = new Uint8ClampedArray(width * height * 4);
      if (source.url?.endsWith(".mask.png")) pixels.fill(255);
      else
        for (let y = 4; y < 7; y += 1)
          for (let x = 5; x < 7; x += 1)
            pixels.set([216, 38, 44, 255], (y * width + x) * 4);
      return pixels;
    },
    createSurface: (pixels, width, height) =>
      ({ pixels, width, height }) as unknown as CanvasImageSource,
    encode(surface) {
      const { pixels, width, height } = surface as unknown as {
        pixels: Uint8ClampedArray;
        width: number;
        height: number;
      };
      const url = `data:test/${width}x${height}/${pixels[0]},${pixels[1]},${pixels[2]}`;
      encoded.push(url);
      return url;
    },
  };
}

function asset(
  id: string,
  subject: ArtSubjectV7,
  extra: Partial<ChibiArtAssetV7> = {},
): ChibiArtAssetV7 {
  const owned = subject.startsWith("PORTRAIT:") || subject.startsWith("UNIT:");
  return {
    id,
    subject,
    assetClass: subject.startsWith("PORTRAIT:")
      ? "PORTRAIT"
      : subject.startsWith("ICON:")
        ? "ICON"
        : "STANDARD_UNIT",
    width: subject.startsWith("UNIT:") ? 56 : 48,
    height: subject.startsWith("UNIT:") ? 80 : 48,
    url: `/${id}.png`,
    ...(owned ? { ownerMaskUrl: `/${id}.mask.png` } : {}),
    ...extra,
  };
}

function domArt(assets: readonly ChibiArtAssetV7[]) {
  const built = buildChibiArtRegistryV7(assets);
  expect(built.problems).toEqual([]);
  const env = environment();
  return {
    env,
    art: createChibiDomArtV7({
      environment: env,
      onChange: () => undefined,
      registry: built.registry,
    }),
  };
}

describe("CHIBI interface subjects", () => {
  it("maps every technology to chibi art of the same kind the legacy card uses", () => {
    expect(Object.keys(CHIBI_TECH_ART_SUBJECTS_V7).sort()).toEqual(
      [...TECHNOLOGY_IDS_V7].sort(),
    );
    // Legacy map sprites become chibi map subjects.
    expect(RULESET7_TECH_ART_IDS.GATHERING).toMatch(/fruit/);
    expect(CHIBI_TECH_ART_SUBJECTS_V7.GATHERING).toBe("RESOURCE:FRUIT");
    expect(CHIBI_TECH_ART_SUBJECTS_V7.CHIVALRY).toBe("UNIT:KNIGHT");
    expect(CHIBI_TECH_ART_SUBJECTS_V7.NAVAL_ENGINEERING).toBe(
      "UNIT:BATTLESHIP",
    );
    // Legacy portraits, actions and rewards become chibi ones.
    expect(CHIBI_TECH_ART_SUBJECTS_V7.ADMINISTRATION).toBe("PORTRAIT:CAPTAIN");
    expect(CHIBI_TECH_ART_SUBJECTS_V7.RAIDING).toBe("ICON:ACTION:PILLAGE");
    expect(CHIBI_TECH_ART_SUBJECTS_V7.PLANNING).toBe("ICON:REWARD:EXPAND");
    expect(CHIBI_TECH_ART_SUBJECTS_V7.NAVIGATION).toBe("ICON:TECH:NAVIGATION");
    for (const subject of Object.values(CHIBI_TECH_ART_SUBJECTS_V7))
      expect(subject).not.toMatch(/UNDEAD/);
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the root's card is
    // the Workshop for every faction (the defender, at Fortification now,
    // is on no card); Chivalry is a card that follows the faction.
    expect(technologySubjectV7("DRILL", "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:WORKSHOP",
    );
    expect(technologySubjectV7("DRILL", "ORIGINAL")).toBe(
      "IMPROVEMENT:WORKSHOP",
    );
    expect(technologySubjectV7("CHIVALRY", "UNDEAD")).toBe(
      "UNIT:UNDEAD:KNIGHT",
    );
    expect(technologySubjectV7("SCOUTING", "UNDEAD")).toBe(
      "PORTRAIT:UNDEAD:RAIDER",
    );
    // Since bead pulp_wars-w5j.3 every faction has its own Battleship.
    expect(technologySubjectV7("NAVAL_ENGINEERING", "UNDEAD")).toBe(
      "UNIT:UNDEAD:BATTLESHIP",
    );
    expect(technologySubjectV7("NAVAL_ENGINEERING", "ORIGINAL")).toBe(
      "UNIT:BATTLESHIP",
    );
    expect(technologySubjectV7("DRILL", "ORIGINAL")).toBe(
      "IMPROVEMENT:WORKSHOP",
    );
    expect(technologySubjectV7("CHIVALRY", "ORIGINAL")).toBe("UNIT:KNIGHT");
    expect(technologySubjectV7("ENGINEERING", "ORIGINAL")).toBe(
      "TERRAIN:MINED_MOUNTAIN",
    );
  });

  it("gives every command with legacy art a chibi subject and keeps Undead art faction-aware", () => {
    const commands: CommandV7[] = [
      { kind: "RALLY", unitId: 1 as never },
      { kind: "TEND_WOUNDED", unitId: 1 as never },
      { kind: "RAISE_DEAD", unitId: 1 as never },
      { kind: "DEVOUR", unitId: 1 as never },
      { kind: "WAIL", unitId: 1 as never },
      { kind: "RECOVER", unitId: 1 as never },
      { kind: "PILLAGE", unitId: 1 as never },
      { kind: "CAPTURE", unitId: 1 as never },
      { kind: "BUILD_MINE", at: { x: 0, y: 0 } },
      { kind: "BUILD_FARM", at: { x: 0, y: 0 } },
      { kind: "BUILD_ROAD", at: { x: 0, y: 0 } },
      { kind: "HARVEST_FISH", at: { x: 0, y: 0 } },
      { kind: "LAND_GRANT", cityId: 1 as never },
      { kind: "TRAIN", cityId: 1 as never, role: "GUARD" },
      {
        kind: "TRAIN_NAVAL",
        cityId: 1 as never,
        at: { x: 0, y: 0 },
        role: "BATTLESHIP",
      },
      { kind: "RESEARCH", tech: "FORESTRY" },
    ];
    expect(
      commands.map((command) => commandSubjectV7(command, "ORIGINAL")),
    ).toEqual([
      "ICON:ACTION:RALLY",
      "ICON:ACTION:TEND_WOUNDED",
      "ICON:ACTION:RAISE_DEAD",
      "ICON:ACTION:DEVOUR",
      "ICON:ACTION:WAIL",
      "ICON:ACTION:RECOVER",
      "ICON:ACTION:PILLAGE",
      "SITE:VILLAGE",
      "TERRAIN:MINED_MOUNTAIN",
      "IMPROVEMENT:FARM",
      "ICON:ACTION:BUILD_ROAD",
      "RESOURCE:FISH",
      "ICON:REWARD:EXPAND",
      "PORTRAIT:GUARD",
      "PORTRAIT:BATTLESHIP",
      "IMPROVEMENT:LUMBER_CAMP",
    ]);
    expect(commandSubjectV7(commands[0] as CommandV7, "UNDEAD")).toBe(
      "ICON:ACTION:UNDEAD:RALLY",
    );
    // Revision 17 (pulp_wars-0ao.14): WAAAGH! and Kaboom! have their own icons.
    expect(commandSubjectV7(commands[0] as CommandV7, "GOBLIN")).toBe(
      "ICON:ACTION:GOBLIN:RALLY",
    );
    expect(
      commandSubjectV7({ kind: "KABOOM", unitId: 1 as never }, "GOBLIN"),
    ).toBe("ICON:ACTION:KABOOM");
    // Revision 19 (pulp_wars-c87.7): War Drums, Lay Egg, Hatch and Stampede.
    expect(commandSubjectV7(commands[0] as CommandV7, "DINOSAUR")).toBe(
      "ICON:ACTION:DINOSAUR:RALLY",
    );
    expect(
      commandSubjectV7(
        {
          kind: "LAY_EGG",
          cityId: 1 as never,
          role: "RAIDER",
          at: { x: 0, y: 0 },
        },
        "DINOSAUR",
      ),
    ).toBe("ICON:ACTION:LAY_EGG");
    expect(
      commandSubjectV7(
        { kind: "HATCH", unitId: 1 as never, eggUnitId: 2 as never },
        "DINOSAUR",
      ),
    ).toBe("ICON:ACTION:HATCH");
    expect(commandSubjectV7(commands[13] as CommandV7, "DINOSAUR")).toBe(
      "PORTRAIT:DINOSAUR:GUARD",
    );
    // (The root's card is the Workshop since the Industry reshuffle.)
    expect(technologySubjectV7("DRILL", "DINOSAUR")).toBe(
      "IMPROVEMENT:DINOSAUR:WORKSHOP",
    );
    expect(technologySubjectV7("CHIVALRY", "DINOSAUR")).toBe(
      "UNIT:DINOSAUR:KNIGHT",
    );
    expect(technologySubjectV7("SCOUTING", "DINOSAUR")).toBe(
      "PORTRAIT:DINOSAUR:RAIDER",
    );
    expect(commandSubjectV7(commands[13] as CommandV7, "UNDEAD")).toBe(
      "PORTRAIT:UNDEAD:GUARD",
    );
    // Since bead pulp_wars-w5j.3 the faction's own ship portrait.
    expect(commandSubjectV7(commands[14] as CommandV7, "UNDEAD")).toBe(
      "PORTRAIT:UNDEAD:BATTLESHIP",
    );
    expect(
      commandSubjectV7(
        {
          kind: "DISEMBARK",
          unitId: 1 as never,
          at: { x: 0, y: 0 },
        } as CommandV7,
        "GOBLIN",
      ),
    ).toBe("UNIT:GOBLIN:EMBARKED_TRANSPORT");
    expect(
      commandSubjectV7(
        {
          kind: "DISEMBARK",
          unitId: 1 as never,
          at: { x: 0, y: 0 },
        } as CommandV7,
        "ORIGINAL",
      ),
    ).toBe("UNIT:EMBARKED_TRANSPORT");
    for (const kind of ["MOVE", "BUILD_FIELD_DEFENSE"] as const)
      expect(
        commandSubjectV7(
          kind === "MOVE"
            ? { kind, unitId: 1 as never, path: [] }
            : { kind, unitId: 1 as never },
          "ORIGINAL",
        ),
      ).toBeNull();
    for (const command of commands)
      if (commandArtIdV7(command) !== null)
        expect(commandSubjectV7(command, "ORIGINAL")).not.toBeNull();
  });

  it("maps rewards and portraits, and falls back from Undead portraits and Frenzy to the Human art", () => {
    const rewards: RewardIdV7[] = [
      "SURVEY",
      "WALLS",
      "STOCKPILE",
      "TREASURY",
      "TREASURY_6",
      "BOOM",
      "MILITIA",
      "JUGGERNAUT",
    ];
    expect(rewards.map((reward) => rewardSubjectV7(reward, "UNDEAD"))).toEqual([
      "ICON:REWARD:SURVEY",
      "ICON:REWARD:WALLS",
      "ICON:HUD:COIN",
      "ICON:HUD:COIN",
      "ICON:HUD:COIN",
      "ICON:HUD:POPULATION",
      "PORTRAIT:UNDEAD:FIGHTER",
      "PORTRAIT:UNDEAD:JUGGERNAUT",
    ]);
    // Since bead pulp_wars-w5j.3 every faction's ship has its own portrait.
    expect(portraitSubjectV7("PATROL_BOAT", "UNDEAD")).toBe(
      "PORTRAIT:UNDEAD:PATROL_BOAT",
    );
    expect(portraitSubjectV7("PATROL_BOAT", "ORIGINAL")).toBe(
      "PORTRAIT:PATROL_BOAT",
    );
    expect(portraitSubjectV7("KNIGHT", "UNDEAD")).toBe(
      "PORTRAIT:UNDEAD:KNIGHT",
    );
    expect(chibiFallbackSubjectV7("PORTRAIT:UNDEAD:KNIGHT")).toBe(
      "PORTRAIT:KNIGHT",
    );
    expect(chibiFallbackSubjectV7("ICON:ACTION:UNDEAD:RALLY")).toBe(
      "ICON:ACTION:RALLY",
    );
    expect(chibiFallbackSubjectV7("ICON:ACTION:GOBLIN:RALLY")).toBe(
      "ICON:ACTION:RALLY",
    );
    expect(chibiFallbackSubjectV7("ICON:ACTION:RALLY")).toBeNull();
  });

  it("validates portrait and icon entries and keeps the checked-in manifest valid", () => {
    expect(
      chibiAssetProblemsV7(asset("chibi-test-portrait", "PORTRAIT:FIGHTER")),
    ).toEqual([]);
    const { ownerMaskUrl: _mask, ...unmasked } = asset(
      "chibi-test-portrait",
      "PORTRAIT:FIGHTER",
    );
    expect(_mask).toBeDefined();
    expect(chibiAssetProblemsV7(unmasked).join("\n")).toMatch(/owner mask/);
    expect(
      chibiAssetProblemsV7(
        asset("chibi-test-icon", "ICON:ACTION:WAIT", { width: 64 }),
      ).join("\n"),
    ).toMatch(/exceeds 48 x 48/);
    expect(
      chibiAssetProblemsV7(
        asset("chibi-test-icon", "ICON:ACTION:WAIT", {
          assetClass: "RESOURCE",
        }),
      ).join("\n"),
    ).toMatch(/class does not fit/);
    expect(buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).problems).toEqual([]);
  });
});

describe("CHIBI DOM art hook", () => {
  it("picks whole or half steps that fit the box and fits oversized art smoothly", () => {
    expect(
      chibiDomScaleV7({ width: 44, height: 46 }, CHIBI_DOM_BOXES_V7.action),
    ).toBe(1);
    expect(
      chibiDomScaleV7({ width: 44, height: 46 }, CHIBI_DOM_BOXES_V7.card),
    ).toBe(1.5);
    expect(
      chibiDomScaleV7({ width: 30, height: 30 }, CHIBI_DOM_BOXES_V7.reward),
    ).toBe(2.5);
    expect(
      chibiDomScaleV7({ width: 50, height: 72 }, CHIBI_DOM_BOXES_V7.dock),
    ).toBe(1);
    expect(
      chibiDomScaleV7({ width: 84, height: 100 }, CHIBI_DOM_BOXES_V7.dock),
    ).toBeCloseTo(0.82, 2);
    expect(paintedBoundsV7(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });

  it("trims and recolours owned art, uses the neutral stone without an owner, and caches", () => {
    const { art, env } = domArt([asset("chibi-p", "PORTRAIT:FIGHTER")]);
    const teal = art.resolve({
      subject: "PORTRAIT:FIGHTER",
      ownerColor: "#28b7a4",
    });
    expect(teal).toMatchObject({
      kind: "READY",
      width: 2,
      height: 3,
      factionArt: false,
    });
    // The key red became the owner colour through the mask.
    expect(teal.kind === "READY" ? teal.url : "").toBe(
      "data:test/2x3/40,183,164",
    );
    const neutral = art.resolve({ subject: "PORTRAIT:FIGHTER" });
    expect(neutral.kind === "READY" ? neutral.url : "").toBe(
      `data:test/2x3/${[1, 3, 5]
        .map((index) =>
          Number.parseInt(
            CHIBI_UNOWNED_OWNER_COLOUR_V7.slice(index, index + 2),
            16,
          ),
        )
        .join(",")}`,
    );
    art.resolve({ subject: "PORTRAIT:FIGHTER", ownerColor: "#28b7a4" });
    expect(env.encoded).toHaveLength(2);
    expect(art.resolve({ subject: "ICON:ACTION:WAIT" })).toEqual({
      kind: "MISSING",
    });
  });

  it("draws an Undead subject's own art and otherwise the Human stand-in without faction art", () => {
    const { art } = domArt([
      asset("chibi-p-fighter", "PORTRAIT:FIGHTER"),
      asset("chibi-p-guard", "PORTRAIT:GUARD"),
      asset("chibi-p-undead-guard", "PORTRAIT:UNDEAD:GUARD"),
      asset("chibi-i-broken", "ICON:ACTION:WAIT", { url: "/broken.png" }),
    ]);
    expect(
      art.resolve({ subject: "PORTRAIT:UNDEAD:GUARD", ownerColor: "#28b7a4" }),
    ).toMatchObject({ kind: "READY", factionArt: true });
    const standIn = art.resolve({
      subject: "PORTRAIT:UNDEAD:FIGHTER",
      ownerColor: "#28b7a4",
    });
    expect(standIn).toMatchObject({ kind: "READY", factionArt: false });
    expect(standIn.kind === "READY" ? standIn.asset.id : "").toBe(
      "chibi-p-fighter",
    );
    // A failed load keeps the legacy art.
    expect(art.resolve({ subject: "ICON:ACTION:WAIT" })).toEqual({
      kind: "MISSING",
    });
  });

  it("sizes the image in rem at the chosen scale and holds the box while loading", () => {
    const { art } = domArt([asset("chibi-i-wait", "ICON:ACTION:WAIT")]);
    const ready = art.resolve({ subject: "ICON:ACTION:WAIT" });
    if (ready.kind !== "READY") throw new Error("expected READY");
    const image = chibiDomImageV7(
      document,
      ready,
      CHIBI_DOM_BOXES_V7.card,
      "ICON:ACTION:WAIT",
    );
    expect(image.className).toBe("v7-art-frame v7-chibi-art");
    expect(image.dataset.chibiScale).toBe("4");
    expect(image.style.width).toBe("0.5rem");
    expect(image.style.height).toBe("0.75rem");
    expect(image.dataset.chibiAssetId).toBe("chibi-i-wait");
    const loading = chibiDomImageV7(
      document,
      { kind: "LOADING", factionArt: false },
      CHIBI_DOM_BOXES_V7.action,
      "ICON:ACTION:WAIT",
    );
    expect(loading.getAttribute("src")).toBeNull();
    expect(loading.dataset.chibiState).toBe("loading");
    expect(loading.style.width).toBe("3rem");
  });
});
