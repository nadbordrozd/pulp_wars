import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
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

/** The Gallery's pure model (bead pulp_wars-ic8). */
describe("Gallery presentation", () => {
  it("has one column per registered faction and one row per role", () => {
    expect(GALLERY_FACTIONS_V7).toEqual(FACTION_IDS_V7);
    expect(GALLERY_UNIT_ROWS_V7).toEqual([
      ...UNIT_ROLE_IDS_V7,
      "TRANSPORT",
      "EGG",
    ]);
  });

  it("fills every role cell with the faction's own unit and art", () => {
    for (const faction of FACTION_IDS_V7)
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
    for (const faction of FACTION_IDS_V7)
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
    // the Market (pulp_wars-eu3r.1); the Mine and the Monuments stay one
    // shared cell.
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
        JSON.stringify({ factions: ["DWARF", "ELF", "ORIGINAL"], tab: "X" }),
      ),
    ).toMatchObject({ tab: "UNITS", factions: ["ORIGINAL", "DWARF"] });
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
    for (const faction of FACTION_IDS_V7)
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
