import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
} from "../../src/engine/index";
import {
  DEFAULT_GALLERY_FILTERS_V7,
  GALLERY_BUILDING_ROWS_V7,
  GALLERY_FACTIONS_V7,
  GALLERY_UNIT_ROWS_V7,
  galleryBuildingDetailsV7,
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
        expect(cell.kind).toBe("UNIT");
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

  it("reuses the recruit texts for a unit's details", () => {
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
      technology: { id: "SAWMILLING", name: "Sawmilling" },
    });
    expect(details.stats.slice(0, recruit.stats.length)).toEqual(recruit.stats);
    expect(details.stats.at(-1)).toEqual({ label: "Slots", value: "1" });
    expect(details.notes).toEqual(recruit.restrictions);
    expect(
      details.abilities.map(
        (ability) => `${ability.name}: ${ability.description}`,
      ),
    ).toEqual(recruit.abilities);
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
    for (const row of GALLERY_BUILDING_ROWS_V7.slice(3))
      expect(galleryBuildingPerFactionV7(row)).toBe(false);
    expect(galleryBuildingSubjectV7("MINE", "DWARF")).toBe(
      "TERRAIN:MINED_MOUNTAIN",
    );
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
    expect(kinds("ICE_FOLK", "CAPTAIN", "COLD_SNAP")).toContain(
      "UNITS_CHILLED",
    );
    expect(kinds("UNDEAD", "MARKSMAN", "WAIL")).toContain("WAIL_RESOLVED");
    expect(galleryDemoCuesV7("UNDEAD", "MARKSMAN")).toEqual(["WAIL"]);
    expect(galleryDemoCuesV7("DWARF", "RAIDER")).toEqual(["BOMB_RUN"]);
    expect(buildGalleryDemoSceneV7("ORIGINAL", "FIGHTER", "KABOOM")).toBeNull();
  });
});
