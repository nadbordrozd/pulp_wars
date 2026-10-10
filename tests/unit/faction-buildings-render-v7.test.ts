import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  IMPROVEMENT_IDS_V7,
  viewForV7,
  type FactionIdV7,
  type ImprovementIdV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  FACTION_IMPROVEMENT_LOOKS_V7,
  chibiFallbackSubjectV7,
  territoryGroundV7,
  territoryTerrainSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  commandSubjectV7,
  factionImprovementSubjectV7,
  improvementSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiRasterEnvironmentV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { createChibiArtResolverV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import {
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
  terrainPivotV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  FACTION_BUILDINGS_HELP_V7,
  countsAsTextV7,
  factionBuildCommandV7,
  factionBuildingV7,
  factionBuildingsV7,
  matchHasFactionBuildingsV7,
} from "../../src/render/faction-buildings-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Faction building looks (epic pulp_wars-xdh, bead pulp_wars-xdh.2,
 * docs/art/FACTION_BUILDINGS.md): a few improvements are drawn and named in
 * the look of the faction that owns the territory they stand in, and Undead
 * territory has its own ground. Purely visual.
 */

const INTERACTION = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

type Tile = PlayerViewV7["board"]["tiles"][number];

/**
 * A two-seat view whose viewer plays `viewer` and whose opponent plays
 * `opponent`, with a Farm, a Windmill, a Sawmill and a Forge on four land
 * tiles owned by `owner` ("VIEWER" or "OPPONENT").
 */
function fixtureView(
  viewer: FactionIdV7,
  opponent: FactionIdV7,
  owner: "VIEWER" | "OPPONENT",
): { readonly view: PlayerViewV7; readonly built: readonly Tile[] } {
  const state = exploredAllV7(initialV7(1516));
  const live = viewForV7(state, state.humanPlayerId);
  const other = live.players.find((player) => player.id !== live.viewer.id);
  if (other === undefined) throw new Error("no opponent");
  const ownerId = owner === "VIEWER" ? live.viewer.id : other.id;
  const improvements: ImprovementIdV7[] = [
    "FARM",
    "WINDMILL",
    "SAWMILL",
    "FORGE",
  ];
  const cityCells = new Set(
    live.cities.map((city) => `${city.at.x},${city.at.y}`),
  );
  const built: Tile[] = [];
  const tiles = live.board.tiles.map((tile): Tile => {
    if (
      built.length === improvements.length ||
      !tile.explored ||
      tile.terrain !== "GRASS" ||
      tile.improvement !== null ||
      tile.site !== null ||
      cityCells.has(`${tile.at.x},${tile.at.y}`)
    )
      return tile;
    const next: Tile = {
      ...tile,
      resource: null,
      improvement: improvements[built.length] ?? "FARM",
      territoryOwnerId: ownerId,
    };
    built.push(next);
    return next;
  });
  return {
    built,
    view: {
      ...live,
      viewer: { ...live.viewer, faction: viewer },
      players: live.players.map((player) => ({
        ...player,
        faction: player.id === live.viewer.id ? viewer : opponent,
      })),
      board: { ...live.board, tiles },
    },
  };
}

const plan = (view: PlayerViewV7): BoardRenderPlanV7 =>
  buildBoardRenderPlanV7(view, [], INTERACTION);

const improvementEntries = (
  view: PlayerViewV7,
): readonly BoardRenderPlanEntryV7[] =>
  plan(view).entries.filter((entry) => entry.kind === "IMPROVEMENT");

const lookOf = (entries: readonly BoardRenderPlanEntryV7[]) =>
  entries.map((entry) => [entry.artSubject, entry.label]);

/**
 * Bead pulp_wars-2yc.38: the buildings every faction but the Humans draws in
 * its own look and under the shared name (the Dinosaur Sawmill is the one
 * that was named before); bead pulp_wars-eu3r.1 added the Market.
 */
const SIX = [
  "LUMBER_CAMP",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "PORT",
  "SHIPYARD",
  "MARKET",
] as const;

describe("faction building subjects and names", () => {
  it("returns a faction subject only for the buildings the faction draws itself", () => {
    expect(FACTION_IMPROVEMENT_LOOKS_V7).toEqual({
      UNDEAD: ["FARM", "WINDMILL", ...SIX],
      GOBLIN: SIX,
      DINOSAUR: ["WINDMILL", ...SIX],
      MARTIAN: ["FARM", "WINDMILL", ...SIX],
      ICE_FOLK: ["FARM", ...SIX],
      DWARF: ["FARM", "WINDMILL", ...SIX],
      CANDY: SIX,
    });
    // Bead pulp_wars-2yc.38: the Lumber Camp and the Sawmill are every
    // faction's own but the Humans', who keep the shared pair. The
    // Cultists (`pulp_wars-mch9.3`) are registered without building art
    // and draw the shared set too until their art bead.
    for (const faction of FACTION_IDS_V7)
      for (const improvement of SIX)
        expect(factionImprovementSubjectV7(improvement, faction)).toBe(
          faction === "ORIGINAL" || faction === "CULT"
            ? `IMPROVEMENT:${improvement}`
            : `IMPROVEMENT:${faction}:${improvement}`,
        );
    for (const faction of FACTION_IDS_V7)
      for (const improvement of IMPROVEMENT_IDS_V7) {
        const own =
          FACTION_IMPROVEMENT_LOOKS_V7[faction]?.includes(improvement) ?? false;
        const subject = factionImprovementSubjectV7(improvement, faction);
        expect(subject).toBe(
          own
            ? `IMPROVEMENT:${faction}:${improvement}`
            : improvementSubjectV7(improvement),
        );
        // A faction subject without a raster stands in with the shared one.
        if (own)
          expect(chibiFallbackSubjectV7(subject)).toBe(
            `IMPROVEMENT:${improvement}`,
          );
      }
    // Unowned land and the Humans and Goblins keep the shared set.
    expect(factionImprovementSubjectV7("FARM", null)).toBe("IMPROVEMENT:FARM");
    expect(factionImprovementSubjectV7("FARM", "GOBLIN")).toBe(
      "IMPROVEMENT:FARM",
    );
    expect(factionImprovementSubjectV7("MINE", "UNDEAD")).toBe(
      "TERRAIN:MINED_MOUNTAIN",
    );
  });

  it("names exactly the renamed buildings, with a flavour line that says what each counts as", () => {
    const named = factionBuildingsV7();
    // Every look is named but the Lumber Camps and the Sawmills of bead
    // pulp_wars-2yc.38, which keep their names (the Dinosaur Chopping
    // Block was named before).
    expect(
      named.map((entry) => `${entry.faction}:${entry.improvement}`).sort(),
    ).toEqual(
      Object.entries(FACTION_IMPROVEMENT_LOOKS_V7)
        .flatMap(([faction, improvements]) =>
          improvements.map((improvement) => `${faction}:${improvement}`),
        )
        .filter(
          (key) =>
            key === "DINOSAUR:SAWMILL" ||
            !/:(?:LUMBER_CAMP|SAWMILL|FORGE|WORKSHOP|PORT|SHIPYARD|MARKET)$/.test(
              key,
            ),
        )
        .sort(),
    );
    for (const faction of FACTION_IDS_V7) {
      for (const kept of [
        "LUMBER_CAMP",
        "FORGE",
        "WORKSHOP",
        "PORT",
        "SHIPYARD",
        "MARKET",
      ] as const)
        expect(factionBuildingV7(kept, faction)).toBeNull();
      if (faction !== "DINOSAUR")
        expect(factionBuildingV7("SAWMILL", faction)).toBeNull();
    }
    expect(
      Object.fromEntries(
        named.map((entry) => [
          `${entry.faction}:${entry.improvement}`,
          entry.building.name,
        ]),
      ),
    ).toEqual({
      "UNDEAD:FARM": "Graveyard",
      "UNDEAD:WINDMILL": "Bone Mill",
      "DINOSAUR:WINDMILL": "Grinding Stone",
      "DINOSAUR:SAWMILL": "Chopping Block",
      "MARTIAN:FARM": "Hydroponic Farm",
      "MARTIAN:WINDMILL": "Solar Array",
      "ICE_FOLK:FARM": "Frost Garden",
      "DWARF:FARM": "Mushroom Farm",
      "DWARF:WINDMILL": "Steam Pump",
    });
    for (const entry of named) {
      expect(
        entry.building.flavour.endsWith(countsAsTextV7(entry.improvement)),
      ).toBe(true);
      // No coordinates and no numbers: the rules keep theirs elsewhere.
      expect(entry.building.flavour).not.toMatch(/\d/);
      expect(entry.building.flavour.length).toBeLessThan(80);
    }
    expect(factionBuildingV7("FARM", "UNDEAD")?.flavour).toBe(
      "Quiet plots, tended for later. Counts as a Farm.",
    );
    expect(countsAsTextV7("WINDMILL")).toBe("Counts as a Windmill.");
    expect(factionBuildingV7("FARM", "GOBLIN")).toBeNull();
    expect(factionBuildingV7("FARM", null)).toBeNull();
    expect(factionBuildingV7("FORGE", "UNDEAD")).toBeNull();
    expect(FACTION_BUILDINGS_HELP_V7).not.toMatch(/\d/);
  });

  it("gives the viewer's build buttons and technology cards its faction's building", () => {
    const at = { x: 1, y: 1 };
    expect(commandSubjectV7({ kind: "BUILD_FARM", at }, "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:FARM",
    );
    expect(commandSubjectV7({ kind: "BUILD_WINDMILL", at }, "MARTIAN")).toBe(
      "IMPROVEMENT:MARTIAN:WINDMILL",
    );
    expect(commandSubjectV7({ kind: "BUILD_SAWMILL", at }, "DINOSAUR")).toBe(
      "IMPROVEMENT:DINOSAUR:SAWMILL",
    );
    expect(commandSubjectV7({ kind: "BUILD_FARM", at }, "ORIGINAL")).toBe(
      "IMPROVEMENT:FARM",
    );
    expect(commandSubjectV7({ kind: "BUILD_FARM", at }, "GOBLIN")).toBe(
      "IMPROVEMENT:FARM",
    );
    expect(commandSubjectV7({ kind: "BUILD_FORGE", at }, "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:FORGE",
    );
    expect(commandSubjectV7({ kind: "BUILD_PORT", at }, "ICE_FOLK")).toBe(
      "IMPROVEMENT:ICE_FOLK:PORT",
    );
    expect(commandSubjectV7({ kind: "BUILD_FORGE", at }, "ORIGINAL")).toBe(
      "IMPROVEMENT:FORGE",
    );
    // The Market follows the viewer's faction too (pulp_wars-eu3r.1).
    expect(commandSubjectV7({ kind: "BUILD_MARKET", at }, "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:MARKET",
    );
    expect(commandSubjectV7({ kind: "BUILD_MARKET", at }, "ORIGINAL")).toBe(
      "IMPROVEMENT:MARKET",
    );
    expect(factionBuildCommandV7("BUILD_FARM", "UNDEAD")?.name).toBe(
      "Graveyard",
    );
    expect(factionBuildCommandV7("BUILD_WINDMILL", "DWARF")?.name).toBe(
      "Steam Pump",
    );
    expect(factionBuildCommandV7("BUILD_FARM", "ORIGINAL")).toBeNull();
    expect(factionBuildCommandV7("BUILD_ROAD", "UNDEAD")).toBeNull();
    expect(factionBuildCommandV7("HARVEST_FRUIT", "UNDEAD")).toBeNull();
    expect(technologySubjectV7("FARMING", "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:FARM",
    );
    expect(technologySubjectV7("MILLING", "DWARF")).toBe(
      "IMPROVEMENT:DWARF:WINDMILL",
    );
    expect(technologySubjectV7("SAWMILLING", "DINOSAUR")).toBe(
      "IMPROVEMENT:DINOSAUR:SAWMILL",
    );
    expect(technologySubjectV7("MILLING", "ICE_FOLK")).toBe(
      "IMPROVEMENT:WINDMILL",
    );
    expect(technologySubjectV7("FARMING", "ORIGINAL")).toBe("IMPROVEMENT:FARM");
    // Commerce shows the viewer's own Market (pulp_wars-eu3r.1).
    expect(technologySubjectV7("COMMERCE", "UNDEAD")).toBe(
      "IMPROVEMENT:UNDEAD:MARKET",
    );
    expect(technologySubjectV7("COMMERCE", "ORIGINAL")).toBe(
      "IMPROVEMENT:MARKET",
    );
  });
});

describe("the board plan follows the territory owner", () => {
  it("draws and names an improvement as the faction that owns its territory", () => {
    const own = fixtureView("UNDEAD", "ORIGINAL", "VIEWER");
    expect(
      own.built.map((tile) => (tile.explored ? tile.improvement : null)),
    ).toEqual(["FARM", "WINDMILL", "SAWMILL", "FORGE"]);
    expect(lookOf(improvementEntries(own.view))).toEqual([
      ["IMPROVEMENT:UNDEAD:FARM", "Graveyard"],
      ["IMPROVEMENT:UNDEAD:WINDMILL", "Bone Mill"],
      // Its own look, the shared name (pulp_wars-2yc.38).
      ["IMPROVEMENT:UNDEAD:SAWMILL", "Sawmill"],
      ["IMPROVEMENT:UNDEAD:FORGE", "Forge"],
    ]);
    // LEGACY draws by assetId, which no faction changes.
    const human = fixtureView("ORIGINAL", "GOBLIN", "VIEWER");
    expect(improvementEntries(own.view).map((entry) => entry.assetId)).toEqual(
      improvementEntries(human.view).map((entry) => entry.assetId),
    );
  });

  it("flips the look when the territory changes hands, whoever is looking", () => {
    // The same four buildings, in the Human opponent's territory.
    const lost = fixtureView("UNDEAD", "ORIGINAL", "OPPONENT");
    expect(lookOf(improvementEntries(lost.view))).toEqual([
      ["IMPROVEMENT:FARM", "Farm"],
      ["IMPROVEMENT:WINDMILL", "Windmill"],
      ["IMPROVEMENT:SAWMILL", "Sawmill"],
      ["IMPROVEMENT:FORGE", "Forge"],
    ]);
    // A Human viewer sees the Dinosaur opponent's buildings as Dinosaur.
    const theirs = fixtureView("ORIGINAL", "DINOSAUR", "OPPONENT");
    expect(lookOf(improvementEntries(theirs.view))).toEqual([
      ["IMPROVEMENT:FARM", "Farm"],
      ["IMPROVEMENT:DINOSAUR:WINDMILL", "Grinding Stone"],
      ["IMPROVEMENT:DINOSAUR:SAWMILL", "Chopping Block"],
      ["IMPROVEMENT:DINOSAUR:FORGE", "Forge"],
    ]);
    // Taken by the Human viewer, they are the shared buildings again.
    const taken = fixtureView("ORIGINAL", "DINOSAUR", "VIEWER");
    expect(lookOf(improvementEntries(taken.view))).toEqual(
      lookOf(improvementEntries(lost.view)),
    );
    // Only the entries of the cells that changed owner differ.
    const before = plan(theirs.view).entries;
    const after = plan(taken.view).entries;
    const changedCells = new Set(
      theirs.built.map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    const afterByKey = new Map(after.map((entry) => [entry.key, entry]));
    for (const entry of before) {
      if (entry.kind !== "IMPROVEMENT" && entry.kind !== "TERRAIN") continue;
      if (changedCells.has(`${entry.at.x},${entry.at.y}`)) continue;
      expect(afterByKey.get(entry.key)).toEqual(entry);
    }
  });

  it("covers every faction's own buildings", () => {
    const expected: Readonly<Record<string, readonly string[]>> = {
      MARTIAN: ["Hydroponic Farm", "Solar Array", "Sawmill", "Forge"],
      ICE_FOLK: ["Frost Garden", "Windmill", "Sawmill", "Forge"],
      DWARF: ["Mushroom Farm", "Steam Pump", "Sawmill", "Forge"],
      GOBLIN: ["Farm", "Windmill", "Sawmill", "Forge"],
    };
    for (const [faction, names] of Object.entries(expected))
      expect(
        improvementEntries(
          fixtureView(faction as FactionIdV7, "ORIGINAL", "VIEWER").view,
        ).map((entry) => entry.label),
      ).toEqual(names);
  });

  it("builds identical plans when no faction of the match has a look of its own", () => {
    const human = fixtureView("ORIGINAL", "GOBLIN", "VIEWER");
    const entries = plan(human.view).entries;
    for (const entry of entries) {
      expect(entry.territoryGround).toBeUndefined();
      expect(Object.keys(entry)).not.toContain("territoryGround");
      if (entry.kind === "IMPROVEMENT")
        expect(entry.artSubject).toMatch(/^IMPROVEMENT:[A-Z_]+$/);
    }
    // A faction look changes the art subject and nothing else: a Forge in
    // Undead territory is the entry a Human Forge has, under its subject.
    const forge = (view: PlayerViewV7) =>
      improvementEntries(view).find((entry) => entry.label === "Forge");
    const { ownerColor: _a, ...undeadForge } =
      forge(fixtureView("UNDEAD", "ORIGINAL", "VIEWER").view) ?? {};
    const { ownerColor: _b, ...humanForge } = forge(human.view) ?? {};
    void _a;
    void _b;
    expect(humanForge).toMatchObject({ artSubject: "IMPROVEMENT:FORGE" });
    expect(undeadForge).toEqual({
      ...humanForge,
      artSubject: "IMPROVEMENT:UNDEAD:FORGE",
    });
    // And a match of factions without looks plans exactly what it planned
    // before the faction looks: no entry names a faction building.
    expect(JSON.stringify(entries)).not.toMatch(
      /IMPROVEMENT:[A-Z_]+:|TERRAIN:UNDEAD|territoryGround/,
    );
    expect(matchHasFactionBuildingsV7(human.view)).toBe(false);
    expect(
      matchHasFactionBuildingsV7(
        fixtureView("ORIGINAL", "UNDEAD", "VIEWER").view,
      ),
    ).toBe(true);
  });
});

describe("the Undead territory ground", () => {
  it("is the ground of Undead territory only", () => {
    expect(territoryGroundV7("UNDEAD")).toBe("UNDEAD");
    for (const faction of FACTION_IDS_V7)
      if (faction !== "UNDEAD") expect(territoryGroundV7(faction)).toBeNull();
    expect(territoryGroundV7(null)).toBeNull();
    expect(territoryTerrainSubjectV7("TERRAIN:GRASS", "UNDEAD")).toBe(
      "TERRAIN:UNDEAD:GRASS",
    );
    expect(territoryTerrainSubjectV7("TERRAIN:FOREST", "UNDEAD")).toBe(
      "TERRAIN:UNDEAD:FOREST",
    );
    for (const subject of [
      "TERRAIN:MOUNTAIN",
      "TERRAIN:MINED_MOUNTAIN",
      "TERRAIN:SHALLOW_WATER",
      "TERRAIN:DEEP_WATER",
    ] as const)
      expect(territoryTerrainSubjectV7(subject, "UNDEAD")).toBe(subject);
    expect(territoryTerrainSubjectV7("TERRAIN:GRASS", null)).toBe(
      "TERRAIN:GRASS",
    );
    expect(chibiFallbackSubjectV7("TERRAIN:UNDEAD:GRASS")).toBe(
      "TERRAIN:GRASS",
    );
    expect(chibiFallbackSubjectV7("TERRAIN:UNDEAD:FOREST")).toBe(
      "TERRAIN:FOREST",
    );
    // Toned around the Grass pivot, like every Grass tile.
    expect(terrainPivotV7("TERRAIN:UNDEAD:GRASS")).toEqual(
      terrainPivotV7("TERRAIN:GRASS"),
    );
    expect(terrainPivotV7("TERRAIN:UNDEAD:FOREST")).toEqual(
      terrainPivotV7("TERRAIN:FOREST"),
    );
  });

  it("marks the Grass, Forest and Mountain cells inside Undead territory, and no other cell", () => {
    const { view } = fixtureView("ORIGINAL", "UNDEAD", "VIEWER");
    const undeadId = view.players.find(
      (player) => player.faction === "UNDEAD",
    )?.id;
    const tileAt = new Map(
      view.board.tiles.map((tile) => [`${tile.at.x},${tile.at.y}`, tile]),
    );
    const terrain = plan(view).entries.filter(
      (entry) => entry.kind === "TERRAIN",
    );
    let inside = 0;
    for (const entry of terrain) {
      const tile = tileAt.get(`${entry.at.x},${entry.at.y}`);
      if (tile === undefined || !tile.explored) throw new Error("no tile");
      const expected =
        tile.territoryOwnerId === undeadId &&
        (tile.terrain === "GRASS" ||
          tile.terrain === "FOREST" ||
          tile.terrain === "MOUNTAIN");
      expect(entry.territoryGround).toBe(expected ? "UNDEAD" : undefined);
      // The terrain subject itself is unchanged: the fringe, Roads under
      // trees and Snow read it as before.
      expect(entry.artSubject).toMatch(/^TERRAIN:[A-Z_]+$/);
      if (expected) inside += 1;
    }
    expect(inside).toBeGreaterThan(0);
    // No Undead seat, no such ground anywhere.
    const none = fixtureView("ORIGINAL", "MARTIAN", "VIEWER").view;
    expect(
      plan(none).entries.some((entry) => entry.territoryGround !== undefined),
    ).toBe(false);
  });

  const asset = (
    id: string,
    subject: ArtSubjectV7,
    tall = false,
  ): ChibiArtAssetV7 => ({
    id,
    subject,
    assetClass: tall ? "TALL_TERRAIN" : "TERRAIN",
    width: 80,
    height: tall ? 104 : 80,
    url: `/fixture/${id}.png`,
    ...(tall
      ? {
          layers: {
            bodyUrl: `/fixture/${id}.body.png`,
            groundUrl: "/fixture/rock.png",
          },
        }
      : {}),
  });

  /** A resolver over `assets` that records what the board asked for. */
  function spyArt(assets: readonly ChibiArtAssetV7[]): {
    readonly art: ChibiBoardArtV7;
    readonly asked: string[];
  } {
    const asked: string[] = [];
    return {
      asked,
      art: {
        resolve(request): ChibiResolutionV7 {
          asked.push(`${request.subject}@${request.at.x},${request.at.y}`);
          const found = assets.find((item) => item.subject === request.subject);
          if (found === undefined) return { kind: "MISSING" };
          return {
            kind: "READY",
            asset: found,
            image: { chibi: found.id } as unknown as CanvasImageSource,
            density: 1,
            smoothing: false,
            cacheKey: `chibi:${found.id}`,
            ...(found.layers === undefined
              ? {}
              : {
                  layers: {
                    ground: {
                      ground: found.id,
                    } as unknown as CanvasImageSource,
                    body: { body: found.id } as unknown as CanvasImageSource,
                  },
                }),
          };
        },
        resolveFringedGround: () =>
          ({ fringed: true }) as unknown as CanvasImageSource,
      },
    };
  }

  /** A 2D context that accepts every call and records drawImage sources. */
  function recordingContext(): {
    readonly context: CanvasRenderingContext2D;
    readonly drawn: unknown[];
  } {
    const drawn: unknown[] = [];
    const target: Record<string, unknown> = {};
    const context = new Proxy(target, {
      get(store, property: string) {
        if (property in store) return store[property];
        if (property === "drawImage")
          return (image: unknown) => {
            drawn.push(image);
          };
        return () => undefined;
      },
      set(store, property: string, value) {
        store[property] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    return { context, drawn };
  }

  const cell = (
    x: number,
    y: number,
    subject: ArtSubjectV7,
    undead: boolean,
  ): BoardRenderPlanEntryV7 => ({
    key: `terrain:${x},${y}`,
    kind: "TERRAIN",
    layer: 1,
    at: { x, y },
    assetId: `terrain-fixture-${subject.slice("TERRAIN:".length).toLowerCase()}`,
    artSubject: subject,
    ...(undead ? { territoryGround: "UNDEAD" as const } : {}),
  });

  function draw(
    entries: readonly BoardRenderPlanEntryV7[],
    art: ChibiBoardArtV7,
  ): unknown[] {
    const { context, drawn } = recordingContext();
    drawBoardV7({
      context,
      viewport: { width: 800, height: 600 },
      devicePixelRatio: 1,
      camera: { offsetX: 40, offsetY: 64, zoom: chibiCameraZoom(1) },
      plan: { version: 7, entries, targets: [] },
      images: {
        resolve: (assetId: string) =>
          ({ legacy: assetId }) as unknown as CanvasImageSource,
      },
      artSet: "CHIBI",
      chibiArt: art,
    });
    return drawn;
  }

  const ASSETS = [
    asset("grass", "TERRAIN:GRASS"),
    asset("gloam", "TERRAIN:UNDEAD:GRASS"),
    asset("forest", "TERRAIN:FOREST", true),
    asset("gloam-forest", "TERRAIN:UNDEAD:FOREST", true),
    asset("mountain", "TERRAIN:MOUNTAIN", true),
  ];
  // Undead territory on the left column, unowned land on the right.
  const BOARD = [
    cell(0, 0, "TERRAIN:GRASS", true),
    cell(1, 0, "TERRAIN:GRASS", false),
    cell(0, 1, "TERRAIN:FOREST", true),
    cell(1, 1, "TERRAIN:FOREST", false),
    cell(0, 2, "TERRAIN:MOUNTAIN", true),
    cell(1, 2, "TERRAIN:GRASS", false),
    cell(2, 2, "TERRAIN:MOUNTAIN", false),
    cell(3, 2, "TERRAIN:GRASS", false),
  ];

  it("draws the gloam ground inside Undead territory and the shared ground outside", () => {
    const { art, asked } = spyArt(ASSETS);
    const drawn = draw(BOARD, art);
    const gloam = asked.filter((request) =>
      request.startsWith("TERRAIN:UNDEAD"),
    );
    expect([...new Set(gloam)].sort()).toEqual([
      "TERRAIN:UNDEAD:FOREST@0,1",
      "TERRAIN:UNDEAD:GRASS@0,0",
      // The Grass under the Undead Mountain's fringe.
      "TERRAIN:UNDEAD:GRASS@0,2",
    ]);
    // Outside: the shared Grass, also under the other Mountain's fringe.
    expect(asked).toContain("TERRAIN:GRASS@1,0");
    expect(asked).toContain("TERRAIN:FOREST@1,1");
    expect(asked).toContain("TERRAIN:GRASS@2,2");
    expect(asked).not.toContain("TERRAIN:GRASS@0,0");
    expect(asked).not.toContain("TERRAIN:GRASS@0,2");
    expect(asked).not.toContain("TERRAIN:UNDEAD:GRASS@2,2");
    expect(drawn).toContainEqual({ chibi: "gloam" });
    expect(drawn).toContainEqual({ chibi: "gloam-forest" });
    expect(drawn).toContainEqual({ chibi: "grass" });
    expect(drawn).toContainEqual({ chibi: "forest" });
  });

  it("falls back to the shared ground when the gloam raster is missing (the classic look)", () => {
    const { art } = spyArt(
      ASSETS.filter((item) => !item.subject.startsWith("TERRAIN:UNDEAD")),
    );
    const drawn = draw(BOARD, art);
    expect(drawn).not.toContainEqual({ chibi: "gloam" });
    expect(
      drawn.filter((image) => (image as { chibi?: string }).chibi === "grass")
        .length,
    ).toBeGreaterThanOrEqual(3);
    expect(drawn).toContainEqual({ chibi: "forest" });
  });

  it("is registered in the direction art, which the live look resolves and tones", () => {
    expect(
      LIVE_DIRECTION_ART_REGISTRY_V7.variants("TERRAIN:UNDEAD:GRASS").map(
        (item) => item.id,
      ),
    ).toEqual([
      "chibi-undead-grass-1",
      "chibi-undead-grass-2",
      "chibi-undead-grass-3",
    ]);
    const forests = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
      "TERRAIN:UNDEAD:FOREST",
    );
    expect(forests.map((item) => item.id)).toEqual([
      "chibi-undead-forest-1",
      "chibi-undead-forest-2",
    ]);
    for (const [index, forest] of forests.entries()) {
      expect(forest.layers?.groundUrl).toContain("chibi-undead-grass-1.png");
      expect(forest.layers?.bodyUrl).toContain(
        `chibi-forest-${index + 1}.body.png`,
      );
    }
    // The directed resolver takes the ground from the direction registry;
    // the base registry (the classic look) does not have it.
    const environment: ChibiRasterEnvironmentV7 = {
      loadImage(url, settle) {
        settle(true);
        return { url, width: 80, height: 80 } as unknown as CanvasImageSource;
      },
      readPixels: (_image, width, height) =>
        new Uint8ClampedArray(width * height * 4).fill(120),
      createSurface: (_pixels, width, height) =>
        ({ toned: true, width, height }) as unknown as CanvasImageSource,
    };
    const base = createChibiArtResolverV7({
      environment,
      redraw: () => undefined,
    });
    const request = {
      subject: "TERRAIN:UNDEAD:GRASS" as const,
      at: { x: 1, y: 0 },
      deviceScale: 1,
    };
    expect(base.resolve(request)).toEqual({ kind: "MISSING" });
    const directed = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment,
      samples: createChibiArtResolverV7({
        environment,
        redraw: () => undefined,
        registry: LIVE_DIRECTION_ART_REGISTRY_V7,
      }),
    });
    const resolved = directed.resolve(request);
    expect(resolved.kind).toBe("READY");
    if (resolved.kind !== "READY") return;
    // (31 * 1 + 17 * 0) % 3 = 1: the cell keeps its Grass variant's index.
    expect(resolved.asset.id).toBe("chibi-undead-grass-2");
    expect(resolved.cacheKey).toContain("|tone:");
    // Shared terrain still comes from the base registry.
    const shared = directed.resolve({ ...request, subject: "TERRAIN:GRASS" });
    expect(shared.kind === "READY" && shared.asset.id).toBe("chibi-grass-2");
    // A faction building is drawn as authored, from the direction registry.
    const graveyard = directed.resolve({
      ...request,
      subject: "IMPROVEMENT:UNDEAD:FARM",
    });
    expect(graveyard.kind === "READY" && graveyard.asset.id).toBe(
      "chibi-undead-graveyard",
    );
    expect(
      base.resolve({ ...request, subject: "IMPROVEMENT:UNDEAD:FARM" }),
    ).toEqual({ kind: "MISSING" });
  });
});
