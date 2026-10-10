import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
  FACTION_IDS_V7,
  MONUMENT_POPULATION_V7,
  OFFERED_FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  isNavalRoleV7,
} from "../../src/engine/index";
import {
  DEFAULT_GALLERY_FILTERS_V7,
  GALLERY_BUILDING_ROWS_V7,
  GALLERY_FACTIONS_V7,
  GALLERY_UNIT_ROWS_V7,
  galleryBuildingDetailsV7,
  galleryBuildingGroundV7,
  galleryBuildingNameV7,
  galleryBuildingPerFactionV7,
  galleryBuildingSubjectV7,
  galleryRowLabelV7,
  galleryUnitCellV7,
  galleryUnitDetailsV7,
  parseGalleryFiltersV7,
  serializeGalleryFiltersV7,
  toggleGalleryFilterV7,
} from "../../src/render/gallery-presentation-v7";
import {
  buildGalleryDemoSceneV7,
  galleryDemoCuesV7,
} from "../../src/render/gallery-demo-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import {
  ACHIEVEMENT_GOALS_V7,
  achievementNameV7,
} from "../../src/render/achievement-presentation-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  assetGroupOfSubjectV7,
  assetTiersV7,
  chibiAssetUrlsV7,
  factionAssetUrlsV7,
} from "../../src/assets/asset-inventory-v7";

/** The Gallery's pure model (bead pulp_wars-ic8). */
describe("Gallery presentation", () => {
  it("has one column per registered faction and one row per role", () => {
    expect(GALLERY_FACTIONS_V7).toEqual(OFFERED_FACTION_IDS_V7);
    expect(GALLERY_UNIT_ROWS_V7).toEqual([
      ...UNIT_ROLE_IDS_V7,
      "TRANSPORT",
      "EGG",
    ]);
  });

  it("fills every role cell with the faction's own unit and art", () => {
    for (const faction of OFFERED_FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7) {
        const cell = galleryUnitCellV7(role, faction);
        // The frozen sea: the Ice Folk have no ships (an empty cell).
        // The ninth unit (`pulp_wars-w49.17`, 7r55): every faction has
        // a heavy line unit.
        expect(cell.kind).toBe(
          faction === "ICE_FOLK" && isNavalRoleV7(role) ? "EMPTY" : "UNIT",
        );
        if (cell.kind !== "UNIT") continue;
        expect(cell.name).toBe(effectiveRoleRuleV7(role, faction).label);
        expect(cell.subject.startsWith("UNIT:")).toBe(true);
        if (faction !== "ORIGINAL") expect(cell.subject).toContain(faction);
      }
    expect(galleryUnitCellV7("CATAPULT", "GOBLIN")).toMatchObject({
      name: "Rocket Cart",
      subject: "UNIT:GOBLIN:CATAPULT",
      portrait: "PORTRAIT:GOBLIN:CATAPULT",
    });
    expect(galleryUnitCellV7("TRANSPORT", "DWARF")).toMatchObject({
      kind: "UNIT",
      subject: "UNIT:DWARF:EMBARKED_TRANSPORT",
    });
  });

  it("shows the Egg only for the faction that lays Eggs", () => {
    for (const faction of OFFERED_FACTION_IDS_V7)
      expect(galleryUnitCellV7("EGG", faction).kind).toBe(
        faction === "DINOSAUR" ? "UNIT" : "EMPTY",
      );
  });

  it("reuses the recruit stats and the unit glossary for a unit's details", () => {
    const cell = galleryUnitCellV7("CATAPULT", "UNDEAD");
    if (cell.kind !== "UNIT") throw new Error("missing Lich");
    const details = galleryUnitDetailsV7(cell);
    const recruit = recruitmentRolePresentationV7("CATAPULT", "UNDEAD");
    expect(details).toMatchObject({
      name: "Lich",
      factionName: "Undead",
      roleName: "Catapult",
      tacticalRole: "Siege",
      cost: effectiveRoleRuleV7("CATAPULT", "UNDEAD").cost,
      // (The ninth unit, 7r55: the Undead know the node by its unit.)
      technology: { id: "SAWMILLING", name: "Liches" },
    });
    expect(details.stats.slice(0, recruit.stats.length)).toEqual(recruit.stats);
    expect(details.stats.at(-1)).toEqual({ label: "Slots", value: "1" });
    // Bead pulp_wars-2yc.39: abilities and traits are the unit glossary's
    // plain lines; there is no second list of notes.
    expect(details.notes).toEqual([]);
    expect(details.abilities).toEqual(
      roleGlossaryV7("CATAPULT", "UNDEAD").map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.text,
      })),
    );
    expect(details.abilities.map((ability) => ability.name)).toEqual([
      "Capture",
      "Plague",
      "Long shot",
      "Slow to strike",
      "Splash",
      "Wrecker",
      "Restless",
    ]);
    const juggernaut = galleryUnitCellV7("JUGGERNAUT", "ORIGINAL");
    if (juggernaut.kind !== "UNIT") throw new Error("missing Juggernaut");
    expect(galleryUnitDetailsV7(juggernaut)).toMatchObject({
      cost: null,
      costNote: "City reward",
    });
  });

  it("gives cities one column per faction and shared improvements one cell", () => {
    expect(GALLERY_BUILDING_ROWS_V7.slice(0, 4)).toEqual([
      "CITY_1",
      "CITY_2",
      "CITY_3",
      "VILLAGE",
    ]);
    for (const row of ["CITY_1", "CITY_2", "CITY_3"] as const)
      expect(galleryBuildingPerFactionV7(row)).toBe(true);
    expect(galleryBuildingSubjectV7("CITY_2", "MARTIAN")).toBe(
      "CITY:MARTIAN:2",
    );
    expect(galleryBuildingSubjectV7("CITY_3", "ORIGINAL")).toBe("CITY:3");
    // Faction building looks (bead pulp_wars-xdh.2): the Farm, the Windmill
    // and the Sawmill have a faction's own look, so their rows split; every
    // other improvement stays one shared cell.
    // Bead pulp_wars-2yc.38: the Lumber Camp splits too.
    // Stage 2: the Forge, the Workshop, the Port and the Shipyard too, and
    // the Market (pulp_wars-eu3r.1). The Monuments too (pulp_wars-2yc.44,
    // below); the Mine stays one shared cell.
    const split = [
      "FARM",
      "WINDMILL",
      "SAWMILL",
      "LUMBER_CAMP",
      "FORGE",
      "WORKSHOP",
      "PORT",
      "SHIPYARD",
      "MARKET",
      "MONUMENT",
      ...ACHIEVEMENT_IDS_V7.map((achievement) => `MONUMENT_${achievement}`),
    ];
    for (const row of GALLERY_BUILDING_ROWS_V7.slice(3))
      expect(galleryBuildingPerFactionV7(row), row).toBe(split.includes(row));
    expect(galleryBuildingSubjectV7("MINE", "DWARF")).toBe(
      "TERRAIN:MINED_MOUNTAIN",
    );
    expect(
      GALLERY_FACTIONS_V7.map((faction) =>
        galleryBuildingSubjectV7("FARM", faction),
      ),
    ).toEqual([
      "IMPROVEMENT:FARM",
      "IMPROVEMENT:UNDEAD:FARM",
      "IMPROVEMENT:FARM",
      "IMPROVEMENT:FARM",
      "IMPROVEMENT:MARTIAN:FARM",
      "IMPROVEMENT:ICE_FOLK:FARM",
      "IMPROVEMENT:DWARF:FARM",
      "IMPROVEMENT:FARM",
    ]);
    expect(
      GALLERY_FACTIONS_V7.map((faction) =>
        galleryBuildingNameV7("WINDMILL", faction),
      ),
    ).toEqual([
      "Windmill",
      "Bone Mill",
      "Windmill",
      "Grinding Stone",
      "Solar Array",
      "Windmill",
      "Steam Pump",
      "Windmill",
    ]);
    expect(galleryBuildingNameV7("SAWMILL", "DINOSAUR")).toBe("Chopping Block");
    expect(galleryBuildingNameV7("FORGE", null)).toBe("Forge");
    expect(galleryBuildingNameV7("CITY_2", "UNDEAD")).toBe("City 2");
    // An Undead cell stands on the Undead ground.
    expect(galleryBuildingGroundV7("FARM", "UNDEAD")).toBe(
      "TERRAIN:UNDEAD:GRASS",
    );
    expect(galleryBuildingGroundV7("FARM", "MARTIAN")).toBe("TERRAIN:GRASS");
    expect(galleryBuildingGroundV7("FORGE")).toBe("TERRAIN:GRASS");
    expect(galleryBuildingGroundV7("PORT", "UNDEAD")).toBe(
      "TERRAIN:SHALLOW_WATER",
    );
    expect(galleryBuildingGroundV7("MINE", "UNDEAD")).toBeNull();
  });

  it("names a faction's own building and keeps the generic rules", () => {
    const graveyard = galleryBuildingDetailsV7("FARM", "UNDEAD");
    expect(graveyard).toMatchObject({
      name: "Graveyard",
      factionName: "Undead",
      description:
        "Quiet plots, tended for later. Counts as a Farm. Built on Fertile Ground.",
      cost: 5,
      effects: ["+2 population"],
      technology: { id: "FARMING" },
    });
    // The numbers are the Farm's, whoever owns it.
    const farm = galleryBuildingDetailsV7("FARM", "GOBLIN");
    expect(farm.name).toBe("Farm");
    expect(farm.description).toBe("Built on Fertile Ground.");
    expect([graveyard.cost, graveyard.effects]).toEqual([
      farm.cost,
      farm.effects,
    ]);
    expect(galleryBuildingDetailsV7("WINDMILL", "MARTIAN")).toMatchObject({
      name: "Solar Array",
      effects: [
        "+1 per adjacent farm; heals adjacent owner units for 6 HP at Start Turn",
      ],
    });
  });

  it("describes buildings from the engine's rule tables", () => {
    expect(galleryBuildingDetailsV7("FARM", null)).toMatchObject({
      name: "Farm",
      factionName: null,
      cost: 5,
      effects: ["+2 population"],
      technology: { id: "FARMING" },
    });
    expect(galleryBuildingDetailsV7("WINDMILL", null)).toMatchObject({
      cost: 5,
      effects: [
        "+1 per adjacent farm; heals adjacent owner units for 6 HP at Start Turn",
      ],
      technology: { id: "MILLING" },
    });
    expect(galleryBuildingDetailsV7("CITY_2", "GOBLIN")).toMatchObject({
      name: "City 2",
      factionName: "Goblin",
      cost: null,
      technology: null,
    });
  });

  it("shows every Monument and the obelisk in every faction's skin", () => {
    // Bead pulp_wars-2yc.44 (the user: "all skins for all the monuments
    // for all factions"): the obelisk row, then one row per achievement,
    // named as the game names the achievement.
    const rows = GALLERY_BUILDING_ROWS_V7.filter((row) =>
      row.startsWith("MONUMENT"),
    );
    expect(rows).toEqual([
      "MONUMENT",
      "MONUMENT_EXPLORER",
      "MONUMENT_ENGINEER",
      "MONUMENT_MUSTER",
      "MONUMENT_CONQUEROR",
      "MONUMENT_LAND_BARON",
      "MONUMENT_SEA_DOG",
      "MONUMENT_SLAYER",
    ]);
    expect(rows.map((row) => galleryRowLabelV7(row))).toEqual([
      "Monument",
      ...ACHIEVEMENT_IDS_V7.map(
        (achievement) => `${achievementNameV7(achievement)} Monument`,
      ),
    ]);
    const live = chibiDirectionArtRegistryV7();
    const subjects = new Set<string>();
    for (const row of rows) {
      expect(galleryBuildingPerFactionV7(row), row).toBe(true);
      for (const faction of GALLERY_FACTIONS_V7) {
        const subject = galleryBuildingSubjectV7(row, faction);
        subjects.add(subject);
        // The real sprite: the live look has a raster of its own for it.
        expect(live.variants(subject), subject).toHaveLength(1);
        // On the builder's ground, under the row's name.
        expect(galleryBuildingGroundV7(row, faction)).toBe(
          galleryBuildingGroundV7("FARM", faction),
        );
        expect(galleryBuildingNameV7(row, faction)).toBe(
          galleryRowLabelV7(row),
        );
      }
    }
    // Every faction by every Monument is a sprite of its own.
    expect(subjects.size).toBe(rows.length * GALLERY_FACTIONS_V7.length);
    expect(galleryBuildingSubjectV7("MONUMENT", "ORIGINAL")).toBe(
      "IMPROVEMENT:MONUMENT",
    );
    expect(galleryBuildingSubjectV7("MONUMENT", "DWARF")).toBe(
      "IMPROVEMENT:MONUMENT:DWARF",
    );
    expect(galleryBuildingSubjectV7("MONUMENT_SLAYER", "ORIGINAL")).toBe(
      "IMPROVEMENT:MONUMENT:SLAYER",
    );
    expect(galleryBuildingSubjectV7("MONUMENT_SLAYER", "CANDY")).toBe(
      "IMPROVEMENT:MONUMENT:CANDY:SLAYER",
    );
    // The detail says in a few words which achievement earns it.
    for (const achievement of ACHIEVEMENT_IDS_V7) {
      const details = galleryBuildingDetailsV7(
        `MONUMENT_${achievement}`,
        "MARTIAN",
      );
      expect(details).toMatchObject({
        name: `${achievementNameV7(achievement)} Monument`,
        factionName: "Martian",
        cost: null,
        technology: null,
      });
      expect(details.description).toBe(
        `The Monument of the ${achievementNameV7(achievement)} achievement: ${ACHIEVEMENT_GOALS_V7[achievement]} Each achievement earns a free Monument: +${MONUMENT_POPULATION_V7} population, one per city. It keeps its builder's look when its city is captured.`,
      );
    }
    expect(galleryBuildingDetailsV7("MONUMENT", "UNDEAD")).toMatchObject({
      name: "Monument",
      factionName: "Undead",
      description: `Another player's Monument: its achievement stays hidden. Each achievement earns a free Monument: +${MONUMENT_POPULATION_V7} population, one per city. It keeps its builder's look when its city is captured.`,
    });
    // A faction the Gallery hides has its Monuments ready (the Cult,
    // tests/unit/gallery-unhidden-factions-v7.test.ts).
    expect(DEFAULT_GALLERY_FILTERS_V7.buildingRows).toEqual(
      GALLERY_BUILDING_ROWS_V7,
    );
  });

  it("waits for every Monument sprite it shows", () => {
    // The asset tiers (bead pulp_wars-2yc.42): the Gallery opens when the
    // front tier and every faction's tier are in (app-view-v7.ts,
    // #openGallery). Each Monument cell's files are in the front tier (the
    // Human set, shared art) or in the tier of the cell's own faction.
    const live = chibiDirectionArtRegistryV7();
    const tiers = assetTiersV7("LIVE");
    const front = new Set(tiers.front);
    for (const row of GALLERY_BUILDING_ROWS_V7.filter((candidate) =>
      candidate.startsWith("MONUMENT"),
    ))
      for (const faction of FACTION_IDS_V7) {
        const asset = live.variants(galleryBuildingSubjectV7(row, faction))[0];
        if (asset === undefined) throw new Error(`${row} ${faction}: no art`);
        const waited = new Set([
          ...front,
          ...factionAssetUrlsV7(tiers, [faction]),
        ]);
        for (const url of chibiAssetUrlsV7(asset))
          expect(waited.has(url), `${row} ${faction}: ${url}`).toBe(true);
        if (faction !== "ORIGINAL")
          expect(assetGroupOfSubjectV7(asset.subject)).toBe(faction);
      }
  });

  it("draws a different picture file for every Monument of every faction", () => {
    // Bead pulp_wars-2yc.46 (the user: "the Gallery appears to show only 1
    // type of monument"): for each faction, the obelisk and the seven
    // achievement Monuments are eight rows of the default Gallery, each
    // with its own asset, its own file and its own pixels.
    const live = chibiDirectionArtRegistryV7();
    const rows = DEFAULT_GALLERY_FILTERS_V7.buildingRows.filter((row) =>
      row.startsWith("MONUMENT"),
    );
    expect(rows).toHaveLength(ACHIEVEMENT_IDS_V7.length + 1);
    const everyUrl = new Set<string>();
    const everyPicture = new Set<string>();
    for (const faction of FACTION_IDS_V7) {
      const ids = new Set<string>();
      const urls = new Set<string>();
      const pictures = new Set<string>();
      for (const row of rows) {
        const asset = live.variants(galleryBuildingSubjectV7(row, faction))[0];
        if (asset === undefined) throw new Error(`${row} ${faction}: no art`);
        ids.add(asset.id);
        urls.add(asset.url);
        everyUrl.add(asset.url);
        const digest = createHash("sha256")
          .update(readFileSync(path.join("public", asset.url)))
          .digest("hex");
        pictures.add(digest);
        everyPicture.add(digest);
      }
      expect(ids.size, `${faction} asset ids`).toBe(rows.length);
      expect(urls.size, `${faction} urls`).toBe(rows.length);
      expect(pictures.size, `${faction} pictures`).toBe(rows.length);
    }
    // And no two factions share one: types by factions, hidden Cult too.
    expect(everyUrl.size).toBe(rows.length * FACTION_IDS_V7.length);
    expect(everyPicture.size).toBe(rows.length * FACTION_IDS_V7.length);
    expect(GALLERY_FACTIONS_V7).toEqual(OFFERED_FACTION_IDS_V7);
  });

  it("shows rows and factions added after the filters were stored", () => {
    // Bead pulp_wars-2yc.46, the cause of that report: the stored record
    // used to list what was shown, so a browser that had used the Gallery
    // before the Monuments had rows of their own went on showing the
    // obelisk row alone. A record of that shape now shows everything.
    const before = parseGalleryFiltersV7(
      JSON.stringify({
        tab: "BUILDINGS",
        factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
        unitRows: ["FIGHTER", "RAIDER"],
        buildingRows: ["CITY_1", "FARM", "MONUMENT", "PORT"],
      }),
    );
    expect(before).toEqual({ ...DEFAULT_GALLERY_FILTERS_V7, tab: "BUILDINGS" });
    expect(
      before.buildingRows.filter((row) => row.startsWith("MONUMENT")),
    ).toHaveLength(ACHIEVEMENT_IDS_V7.length + 1);
    // The record names what was switched off; a value it has never heard
    // of (added to the game since) is shown.
    const stored = JSON.parse(
      serializeGalleryFiltersV7({
        ...DEFAULT_GALLERY_FILTERS_V7,
        tab: "BUILDINGS",
        factions: ["UNDEAD"],
        buildingRows: ["MONUMENT"],
      }),
    ) as Record<string, readonly string[]>;
    expect(stored.hiddenBuildingRows).not.toContain("MONUMENT");
    expect(stored.hiddenBuildingRows).toContain("MONUMENT_SLAYER");
    expect(stored).not.toHaveProperty("buildingRows");
    const withoutSlayer = {
      ...stored,
      hiddenBuildingRows: stored.hiddenBuildingRows?.filter(
        (row) => row !== "MONUMENT_SLAYER",
      ),
      hiddenFactions: stored.hiddenFactions?.filter(
        (faction) => faction !== "CANDY",
      ),
    };
    expect(parseGalleryFiltersV7(JSON.stringify(withoutSlayer))).toMatchObject({
      tab: "BUILDINGS",
      factions: ["UNDEAD", "CANDY"],
      buildingRows: ["MONUMENT", "MONUMENT_SLAYER"],
    });
  });

  it("parses, serializes and toggles the remembered filters", () => {
    expect(parseGalleryFiltersV7(null)).toEqual(DEFAULT_GALLERY_FILTERS_V7);
    expect(parseGalleryFiltersV7("{not json")).toEqual(
      DEFAULT_GALLERY_FILTERS_V7,
    );
    const filters = {
      tab: "BUILDINGS" as const,
      factions: ["UNDEAD", "DWARF"] as const,
      unitRows: ["FIGHTER"] as const,
      buildingRows: ["CITY_1", "FARM"] as const,
      terrainRows: ["GRASS", "ICE"] as const,
    };
    expect(parseGalleryFiltersV7(serializeGalleryFiltersV7(filters))).toEqual(
      filters,
    );
    // Unknown values are dropped; the canonical order is kept.
    expect(
      parseGalleryFiltersV7(
        JSON.stringify({
          hiddenFactions: ["DWARF", "ELF", "ORIGINAL"],
          tab: "X",
        }),
      ),
    ).toMatchObject({
      tab: "UNITS",
      factions: GALLERY_FACTIONS_V7.filter(
        (faction) => faction !== "DWARF" && faction !== "ORIGINAL",
      ),
    });
    expect(
      toggleGalleryFilterV7(["DWARF"], "ORIGINAL", GALLERY_FACTIONS_V7),
    ).toEqual(["ORIGINAL", "DWARF"]);
    expect(
      toggleGalleryFilterV7(
        ["ORIGINAL", "DWARF"],
        "DWARF",
        GALLERY_FACTIONS_V7,
      ),
    ).toEqual(["ORIGINAL"]);
  });
});

describe("Gallery animation preview scenes", () => {
  it("plays every role's first cue on the demo board", () => {
    for (const faction of OFFERED_FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7) {
        // A faction without the role has an empty cell (Ice Folk ships).
        if (galleryUnitCellV7(role, faction).kind === "EMPTY") continue;
        const cues = galleryDemoCuesV7(faction, role);
        expect(cues.length, `${faction} ${role}`).toBeGreaterThan(0);
        const scene = buildGalleryDemoSceneV7(
          faction,
          role,
          cues[0] ?? "ATTACK",
        );
        expect(
          scene?.events.events.length,
          `${faction} ${role}`,
        ).toBeGreaterThan(0);
      }
  });

  it("offers the ability cues with their own engine events", () => {
    const kinds = (
      faction: Parameters<typeof buildGalleryDemoSceneV7>[0],
      role: Parameters<typeof buildGalleryDemoSceneV7>[1],
      cue: Parameters<typeof buildGalleryDemoSceneV7>[2],
    ) =>
      buildGalleryDemoSceneV7(faction, role, cue)?.events.events.map(
        (event) => event.kind,
      ) ?? [];
    expect(galleryDemoCuesV7("GOBLIN", "FIGHTER")).toEqual([
      "ATTACK",
      "KABOOM",
    ]);
    expect(kinds("GOBLIN", "FIGHTER", "KABOOM")).toContain(
      "EXPLOSION_RESOLVED",
    );
    expect(kinds("DWARF", "GUARD", "TUNNEL")).toContain("UNIT_TUNNELLED");
    expect(kinds("MARTIAN", "CAPTAIN", "MIND_CONTROL")).toContain(
      "UNIT_MIND_CONTROLLED",
    );
    expect(kinds("MARTIAN", "KNIGHT", "TRACTOR_BEAM")).toContain("UNIT_PULLED");
    expect(kinds("ICE_FOLK", "CAPTAIN", "COLD_SNAP")).toContain("UNITS_FROZEN");
    expect(kinds("UNDEAD", "MARKSMAN", "WAIL")).toContain("WAIL_RESOLVED");
    expect(galleryDemoCuesV7("UNDEAD", "MARKSMAN")).toEqual(["WAIL"]);
    expect(galleryDemoCuesV7("DWARF", "RAIDER")).toEqual(["BOMB_RUN"]);
    expect(buildGalleryDemoSceneV7("ORIGINAL", "FIGHTER", "KABOOM")).toBeNull();
  });
});
