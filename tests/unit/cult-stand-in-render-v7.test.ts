import { describe, expect, it } from "vitest";
import {
  assetGroupOfSubjectV7,
  assetInventoryForFactionsV7,
  assetInventoryV7,
} from "../../src/assets/asset-inventory-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  FACTION_IMPROVEMENT_LOOKS_V7,
  FACTION_STAND_IN_LETTERS_V7,
  buildChibiArtRegistryV7,
  chibiFallbackSubjectV7,
  cityArtSubjectV7,
  factionStandInLetterV7,
  monumentArtSubjectV7,
  navalArtSubjectV7,
  territoryGroundV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
} from "../../src/assets/chibi-art-v7";
import {
  commandSubjectV7,
  factionImprovementSubjectV7,
  portraitSubjectV7,
  rewardSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import {
  chibiDirectionArtAssetsV7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import {
  ACHIEVEMENT_IDS_V7,
  FACTION_IDS_V7,
  IMPROVEMENT_IDS_V7,
  NAVAL_ROLE_IDS_V7,
  OFFERED_FACTION_IDS_V7,
  TECHNOLOGY_IDS_V7,
  TERRAIN_IDS_V7,
  UNIT_ROLE_IDS_V7,
  cityId,
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  BROADSIDE_SHELLS_V7,
  attackEffectForV7,
} from "../../src/render/canvas/attack-effects-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  FACTION_COLOURS_V7,
  factionColourShadesV7,
} from "../../src/render/canvas/faction-colours-v7";
import { factionForestIdV7 } from "../../src/render/canvas/faction-forests-v7";
import { factionGrassIdV7 } from "../../src/render/canvas/faction-grass-v7";
import { victoryTerrainSkinV7 } from "../../src/render/canvas/victory-wave-v7";
import {
  CITY_NAMES_PER_FACTION_V7,
  CITY_NAME_LISTS_V7,
  CITY_NAME_PATTERN_V7,
} from "../../src/render/city-name-lists-v7";
import { factionBuildingV7 } from "../../src/render/faction-buildings-v7";
import {
  GALLERY_FACTIONS_V7,
  GALLERY_UNIT_ROWS_V7,
  galleryUnitCellV7,
} from "../../src/render/gallery-presentation-v7";
import { giantRewardLabelV7 } from "../../src/render/giant-presentation-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import {
  NO_ATTACK_TEXT_V7,
  recruitmentRolePresentationV7,
} from "../../src/render/role-presentation-v7";
import {
  SETUP_FACTIONS_V7,
  setupMaxSeatCountV7,
  setupOpponentCountsV7,
} from "../../src/render/setup-options-v7";
import { titleSceneV7 } from "../../src/render/title-scene-v7";
import { tribePluralV7 } from "../../src/render/tribe-stars-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { at, fieldV7 } from "../fixtures/v7-revision20";

/**
 * The Cultists are registered before their art (`pulp_wars-mch9.3`; the art
 * beads are `pulp_wars-mch9.14` to `.16`). Until then every Cult subject
 * stands in with the shared Human art of the same role or level, in the
 * Cult's colour, a Cult unit on the board wears a lettered stand-in badge,
 * and no player-facing faction list (setup, Gallery, title scene) offers the
 * faction. Nothing here crashes for want of a Cult raster, sound, or theme.
 */

const LAND_ROLES = UNIT_ROLE_IDS_V7.filter(
  (role) => !(NAVAL_ROLE_IDS_V7 as readonly string[]).includes(role),
);

/** Follows a subject's fallbacks to the first one with a registered raster. */
function standIn(
  registry: ChibiArtRegistryV7,
  subject: ArtSubjectV7,
): { readonly subject: ArtSubjectV7; readonly steps: number } | null {
  let current: ArtSubjectV7 | null = subject;
  for (let steps = 0; current !== null && steps < 4; steps += 1) {
    if (registry.variants(current).length > 0)
      return { subject: current, steps };
    current = chibiFallbackSubjectV7(current);
  }
  return null;
}

type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 6 })
            : key === "createLinearGradient"
              ? () => ({ addColorStop: () => undefined })
              : key in target
                ? Reflect.get(target, key)
                : (...args: unknown[]) => {
                    log.push([String(key), ...args]);
                  },
      set: (target, key, value) => {
        log.push(["set", String(key), value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

function draw(
  plan: BoardRenderPlanV7,
  options: Partial<Parameters<typeof drawBoardV7>[0]> = {},
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1600, height: 1600 },
    devicePixelRatio: 1,
    camera: { offsetX: 100, offsetY: 100, zoom: 1 },
    plan,
    images: { resolve: () => null },
    ...options,
  });
  return log;
}

/** How many times the board wrote `letter` (the stand-in badge's text). */
const letters = (log: readonly LogEntry[], letter: string): number =>
  log.filter((call) => call[0] === "fillText" && call[1] === letter).length;

function cultBoard(): {
  readonly state: GameStateV7;
  readonly view: PlayerViewV7;
  readonly plan: BoardRenderPlanV7;
} {
  // Seat 0 (the viewer) is the Cult: an Initiate, a Hexer, a Thing in the
  // Cellar and a Patrol Boat; seat 1 is Human, with a Fighter in sight.
  const state = fieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "MARKSMAN", at: at(6, 2) },
      { seat: 0, role: "JUGGERNAUT", at: at(7, 2) },
      { seat: 0, role: "PATROL_BOAT", at: at(5, 0), form: "NAVAL" },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
    ],
    { factions: ["CULT", "ORIGINAL"], water: [at(5, 0)] },
  );
  const view = viewForV7(state, state.humanPlayerId);
  const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: null,
    selectedUnitId: null,
    selectedAchievement: null,
  });
  return { state, view, plan };
}

function unitEntry(
  scene: ReturnType<typeof cultBoard>,
  where: CoordV7,
): BoardRenderPlanEntryV7 {
  const unit = scene.view.units.find(
    (candidate) => candidate.at.x === where.x && candidate.at.y === where.y,
  );
  const entry = scene.plan.entries.find(
    (candidate) => candidate.key === `unit:${unit?.id}`,
  );
  if (entry === undefined) throw new Error("unit entry missing");
  return entry;
}

describe("Cult art subjects stand in with the shared art", () => {
  it("names a Cult subject for every unit, portrait, city and ship", () => {
    for (const role of LAND_ROLES) {
      expect(unitArtSubjectV7({ role, form: "LAND", faction: "CULT" })).toBe(
        `UNIT:CULT:${role}`,
      );
      expect(portraitSubjectV7(role, "CULT")).toBe(`PORTRAIT:CULT:${role}`);
      expect(chibiFallbackSubjectV7(`UNIT:CULT:${role}` as ArtSubjectV7)).toBe(
        `UNIT:${role}`,
      );
      expect(
        chibiFallbackSubjectV7(`PORTRAIT:CULT:${role}` as ArtSubjectV7),
      ).toBe(`PORTRAIT:${role}`);
    }
    for (const role of NAVAL_ROLE_IDS_V7) {
      expect(unitArtSubjectV7({ role, form: "NAVAL", faction: "CULT" })).toBe(
        `UNIT:CULT:${role}`,
      );
      expect(portraitSubjectV7(role, "CULT")).toBe(`PORTRAIT:CULT:${role}`);
    }
    expect(
      unitArtSubjectV7({ role: "FIGHTER", form: "EMBARKED", faction: "CULT" }),
    ).toBe("UNIT:CULT:EMBARKED_TRANSPORT");
    expect(
      unitArtSubjectV7({
        role: "SUBMARINE",
        form: "NAVAL",
        faction: "CULT",
        submerged: true,
      }),
    ).toBe("UNIT:CULT:SUBMARINE_SUBMERGED");
    for (const artLevel of [1, 2, 3] as const) {
      expect(cityArtSubjectV7({ artLevel, faction: "CULT" })).toBe(
        `CITY:CULT:${artLevel}`,
      );
      expect(chibiFallbackSubjectV7(`CITY:CULT:${artLevel}`)).toBe(
        `CITY:${artLevel}`,
      );
    }
  });

  it("draws the shared buildings, ground, forest and Monuments' fallbacks", () => {
    expect(FACTION_IMPROVEMENT_LOOKS_V7.CULT).toBeUndefined();
    for (const improvement of IMPROVEMENT_IDS_V7) {
      expect(factionImprovementSubjectV7(improvement, "CULT")).toBe(
        factionImprovementSubjectV7(improvement, "ORIGINAL"),
      );
      expect(factionBuildingV7(improvement, "CULT")).toBeNull();
    }
    expect(territoryGroundV7("CULT")).toBeNull();
    expect(factionGrassIdV7("CULT")).toBeNull();
    expect(factionForestIdV7("CULT")).toBeNull();
    // So a Cult win's victory wave leaves every tile in the default skin.
    for (const terrain of TERRAIN_IDS_V7)
      expect(victoryTerrainSkinV7(terrain, "CULT"), terrain).toEqual(
        victoryTerrainSkinV7(terrain, "ORIGINAL"),
      );
    for (const achievement of ACHIEVEMENT_IDS_V7) {
      const subject = monumentArtSubjectV7(achievement, "CULT");
      expect(subject).toBe(`IMPROVEMENT:MONUMENT:CULT:${achievement}`);
      expect(chibiFallbackSubjectV7(subject)).toBe("IMPROVEMENT:MONUMENT");
    }
    expect(chibiFallbackSubjectV7(monumentArtSubjectV7(null, "CULT"))).toBe(
      "IMPROVEMENT:MONUMENT",
    );
  });

  it("resolves every Cult subject to a registered raster in both looks, through its fallback", () => {
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    const live = chibiDirectionArtRegistryV7();
    const subjects: ArtSubjectV7[] = [
      ...LAND_ROLES.flatMap((role): ArtSubjectV7[] => [
        unitArtSubjectV7({ role, form: "LAND", faction: "CULT" }),
        portraitSubjectV7(role, "CULT"),
      ]),
      ...NAVAL_ROLE_IDS_V7.flatMap((role): ArtSubjectV7[] => [
        unitArtSubjectV7({ role, form: "NAVAL", faction: "CULT" }),
        portraitSubjectV7(role, "CULT"),
      ]),
      navalArtSubjectV7("CULT", "UNIT", "EMBARKED_TRANSPORT"),
      navalArtSubjectV7("CULT", "UNIT", "SUBMARINE_SUBMERGED"),
      ...([1, 2, 3] as const).map((artLevel) =>
        cityArtSubjectV7({ artLevel, faction: "CULT" }),
      ),
      ...IMPROVEMENT_IDS_V7.map((improvement) =>
        factionImprovementSubjectV7(improvement, "CULT"),
      ),
      ...ACHIEVEMENT_IDS_V7.map((achievement) =>
        monumentArtSubjectV7(achievement, "CULT"),
      ),
      monumentArtSubjectV7(null, "CULT"),
    ];
    for (const subject of subjects) {
      // The live look draws its own registry first and the classic registry
      // for every other subject, so a stand-in in either is a drawn sprite.
      const found = standIn(live, subject) ?? standIn(classic, subject);
      expect(found, subject).not.toBeNull();
      // The stand-in is never the Cult's own subject: it has no raster.
      expect(found?.steps, subject).toBeGreaterThan(
        subject.includes(":CULT:") ? 0 : -1,
      );
    }
  });

  it("has no raster of its own yet: the Cult's art is the art beads'", () => {
    const registered = [
      ...CHIBI_ART_ASSETS_V7,
      ...chibiDirectionArtAssetsV7(),
    ].filter((asset) => assetGroupOfSubjectV7(asset.subject) === "CULT");
    expect(registered).toEqual([]);
    expect(assetGroupOfSubjectV7("UNIT:CULT:FIGHTER")).toBe("CULT");
    // A match with a Cult seat preloads the shared art and nothing else,
    // and the whole-look inventory names no Cult file.
    for (const look of ["LIVE", "CLASSIC", "LEGACY"] as const) {
      expect(assetInventoryForFactionsV7(look, ["CULT", "ORIGINAL"])).toEqual(
        assetInventoryForFactionsV7(look, ["ORIGINAL"]),
      );
      expect(
        assetInventoryV7(look).filter((entry) => entry.group === "CULT"),
      ).toEqual([]);
    }
  });

  it("gives the Cult a stand-in letter, and no other faction one", () => {
    expect(FACTION_STAND_IN_LETTERS_V7).toEqual({ CULT: "C" });
    expect(factionStandInLetterV7("CULT")).toBe("C");
    for (const faction of OFFERED_FACTION_IDS_V7)
      expect(factionStandInLetterV7(faction), faction).toBeNull();
    expect(factionStandInLetterV7(null)).toBeNull();
    expect(factionStandInLetterV7(undefined)).toBeNull();
  });
});

describe("a Cult match on the board", () => {
  it("plans Cult units under their own names, subjects and colour", () => {
    const scene = cultBoard();
    expect(unitEntry(scene, at(5, 2))).toMatchObject({
      faction: "CULT",
      label: "Initiate",
      artSubject: "UNIT:CULT:FIGHTER",
      ownerColor: FACTION_COLOURS_V7.CULT,
    });
    expect(unitEntry(scene, at(6, 2))).toMatchObject({
      faction: "CULT",
      label: "Hexer",
      artSubject: "UNIT:CULT:MARKSMAN",
    });
    expect(unitEntry(scene, at(7, 2))).toMatchObject({
      label: "Thing in the Cellar",
      artSubject: "UNIT:CULT:JUGGERNAUT",
    });
    expect(unitEntry(scene, at(5, 0)).artSubject).toBe("UNIT:CULT:PATROL_BOAT");
    // The Human across the line is untouched.
    const human = unitEntry(scene, at(5, 3));
    expect(human.faction).toBeUndefined();
    expect(human.artSubject).toBe("UNIT:FIGHTER");
    // The Cult's capital asks for the Cult city and gets the shared one.
    const capital = scene.plan.entries.find(
      (entry) =>
        entry.kind === "CITY" && entry.ownerId === scene.view.viewer.id,
    );
    expect(capital?.artSubject).toBe("CITY:CULT:1");
    expect(factionColourShadesV7("CULT").base).toBe("#00ff78");
  });

  it("draws every Cult unit with the stand-in letter in LEGACY, and no other unit", () => {
    const scene = cultBoard();
    const cultUnits = scene.view.units.filter(
      (unit) => unit.ownerId === scene.view.viewer.id,
    );
    expect(cultUnits).toHaveLength(4);
    const log = draw(scene.plan);
    expect(letters(log, "C")).toBe(cultUnits.length);
  });

  it("draws the letter over the shared sprite in CHIBI, and drops it once the Cult's own raster is registered", () => {
    const scene = cultBoard();
    const asset = (id: string, subject: ArtSubjectV7): ChibiArtAssetV7 => ({
      id,
      subject,
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: `/${id}.png`,
    });
    const art = (assets: readonly ChibiArtAssetV7[]): ChibiBoardArtV7 => ({
      resolve: (request): ChibiResolutionV7 => {
        const found = assets.find(
          (candidate) => candidate.subject === request.subject,
        );
        return found === undefined
          ? { kind: "MISSING" }
          : {
              kind: "READY",
              asset: found,
              image: { id: found.id } as unknown as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: found.id,
            };
      },
    });
    const shared = [
      asset("human-fighter", "UNIT:FIGHTER"),
      asset("human-marksman", "UNIT:MARKSMAN"),
      asset("human-juggernaut", "UNIT:JUGGERNAUT"),
      asset("human-boat", "UNIT:PATROL_BOAT"),
    ];
    const drawn = (assets: readonly ChibiArtAssetV7[]) => {
      const log = draw(scene.plan, { artSet: "CHIBI", chibiArt: art(assets) });
      return {
        letters: letters(log, "C"),
        sprites: log
          .filter((call) => call[0] === "drawImage")
          .map((call) => (call[1] as { id?: string } | undefined)?.id),
      };
    };
    // Stand-in art: the shared sprites, each Cult unit lettered.
    const standing = drawn(shared);
    expect(standing.letters).toBe(4);
    expect(standing.sprites).toEqual(
      expect.arrayContaining([
        "human-fighter",
        "human-marksman",
        "human-juggernaut",
        "human-boat",
      ]),
    );
    // The Initiate's own raster arrives: it is drawn, without the letter;
    // the three units still standing in keep theirs.
    const arrived = drawn([
      ...shared,
      asset("cult-initiate", "UNIT:CULT:FIGHTER"),
    ]);
    expect(arrived.sprites).toContain("cult-initiate");
    expect(arrived.letters).toBe(3);
  });
});

describe("the Cult in the interface's words and lists", () => {
  it("is offered by no player-facing faction list", () => {
    expect(SETUP_FACTIONS_V7).toEqual(OFFERED_FACTION_IDS_V7);
    expect(SETUP_FACTIONS_V7).not.toContain("CULT");
    expect(setupMaxSeatCountV7()).toBe(8);
    expect(setupOpponentCountsV7()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(GALLERY_FACTIONS_V7).toEqual(OFFERED_FACTION_IDS_V7);
    const scene = titleSceneV7({ width: 2400, height: 420 });
    expect(scene.flagships).not.toContain("CULT");
    expect(scene.fighters).not.toContain("CULT");
    expect(
      scene.items.some(
        (item) => "subject" in item && String(item.subject).includes(":CULT:"),
      ),
    ).toBe(false);
  });

  it("builds a Gallery cell, a recruit card and a glossary for every Cult unit all the same", () => {
    for (const row of GALLERY_UNIT_ROWS_V7) {
      const cell = galleryUnitCellV7(row, "CULT");
      if (row === "EGG") {
        expect(cell.kind).toBe("EMPTY");
        continue;
      }
      if (cell.kind !== "UNIT") throw new Error(`${row}: empty`);
      expect(cell.subject, row).toContain(":CULT:");
      if (row !== "TRANSPORT")
        expect(cell.name, row).toBe(effectiveRoleRuleV7(row, "CULT").label);
    }
    for (const role of UNIT_ROLE_IDS_V7) {
      const card = recruitmentRolePresentationV7(role, "CULT");
      expect(card.label, role).toBe(effectiveRoleRuleV7(role, "CULT").label);
      // Every entry of the unit's glossary has plain words.
      for (const entry of roleGlossaryV7(role, "CULT")) {
        expect(entry.name.length, `${role} ${entry.id}`).toBeGreaterThan(0);
        expect(entry.text, `${role} ${entry.id}`).toMatch(/\.$/);
      }
    }
  });

  it("says what the Idol Bearer and the Stargazer cannot do, and nothing of another faction", () => {
    const restrictions = (role: (typeof UNIT_ROLE_IDS_V7)[number]) =>
      recruitmentRolePresentationV7(role, "CULT").restrictions;
    expect(restrictions("GUARD")).toEqual(["Can't attack after moving."]);
    // No attack of its own: Attack 0, no range, and no Wrecker trait.
    const stargazer = recruitmentRolePresentationV7("CATAPULT", "CULT");
    expect(stargazer.restrictions).toEqual([NO_ATTACK_TEXT_V7]);
    expect(stargazer.stats).toContainEqual({ label: "Attack", value: "0" });
    expect(stargazer.stats).toContainEqual({ label: "Range", value: "—" });
    expect(roleGlossaryV7("CATAPULT", "CULT").map((entry) => entry.id)).toEqual(
      ["CAPTURE"],
    );
    for (const role of [
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "CAPTAIN",
      "KNIGHT",
      "SWORDSMAN",
      "JUGGERNAUT",
    ] as const)
      expect(restrictions(role), role).toEqual([]);
    expect(roleGlossaryV7("GUARD", "CULT").map((entry) => entry.id)).toEqual([
      "CAPTURE",
      "SLOW_TO_STRIKE",
    ]);
    expect(roleGlossaryV7("RAIDER", "CULT").map((entry) => entry.id)).toEqual([
      "CAPTURE",
      "CHARGE",
    ]);
    expect(roleGlossaryV7("MARKSMAN", "CULT").map((entry) => entry.id)).toEqual(
      ["CAPTURE", "RANGED"],
    );
  });

  it("names its technologies, rewards, cities and people", () => {
    for (const tech of TECHNOLOGY_IDS_V7) {
      expect(technologyNameV7(tech, "CULT").length, tech).toBeGreaterThan(0);
      // The card's art is a subject that some raster stands in for.
      const subject = technologySubjectV7(tech, "CULT");
      expect(
        standIn(buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry, subject),
        `${tech} ${subject}`,
      ).not.toBeNull();
    }
    expect(technologyNameV7("EXPLOSIVES", "CULT")).toBe("The Stars Are Right");
    expect(
      commandSubjectV7(
        { kind: "TRAIN", cityId: cityId(1), role: "CAPTAIN" },
        "CULT",
      ),
    ).toBe("PORTRAIT:CULT:CAPTAIN");
    expect(rewardSubjectV7("MILITIA", "CULT")).toBe("PORTRAIT:CULT:FIGHTER");
    expect(rewardSubjectV7("JUGGERNAUT", "CULT")).toBe(
      "PORTRAIT:CULT:JUGGERNAUT",
    );
    // The Thing has no signature to name until Anchor's bead.
    expect(giantRewardLabelV7("CULT")).toEqual([
      "Thing in the Cellar",
      "A free Thing in the Cellar, once",
    ]);
    expect(tribePluralV7("CULT")).toBe("Cultists");
    expect(CITY_NAME_LISTS_V7.CULT).toHaveLength(CITY_NAMES_PER_FACTION_V7);
    for (const name of CITY_NAME_LISTS_V7.CULT)
      expect(name).toMatch(CITY_NAME_PATTERN_V7);
    // Every faction has a colour, the Cult's is its own.
    expect(
      FACTION_IDS_V7.filter(
        (faction) => FACTION_COLOURS_V7[faction] === FACTION_COLOURS_V7.CULT,
      ),
    ).toEqual(["CULT"]);
  });

  it("fires the Human cannonball from its Battleship and gives its Hexer and Stargazer no cue of another faction", () => {
    expect(BROADSIDE_SHELLS_V7.CULT).toBe("CANNONBALL");
    expect(attackEffectForV7("CULT", "BATTLESHIP")).toBe("BROADSIDE");
    expect(attackEffectForV7("CULT", "MARKSMAN")).toBeNull();
    expect(attackEffectForV7("CULT", "CATAPULT")).toBeNull();
  });
});
