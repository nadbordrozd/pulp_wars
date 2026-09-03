import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  RULESET6_HUD_ART_IDS,
  RULESET6_TECH_ART_IDS,
  commandArtIdV6,
  rewardArtIdV6,
  technologyArtIdV6,
} from "../../src/assets/ruleset6-ui-art";
import {
  COMMAND_KIND_ORDER_V6,
  FACTION_IDS_V6,
  REWARD_IDS_V6,
  TECHNOLOGY_IDS,
  cityId,
  unitId,
  type CommandKindV6,
  type CommandV6,
  type FactionIdV6,
} from "../../src/engine/index";
import sourceManifest from "../../scripts/art/pixellab-manifest.json";
import generatedManifest from "../../scripts/art/pixellab-generated.json";

const NEW_SOURCE_IDS = [
  "ui-hud-coin",
  "ui-action-redevelop",
  "ui-tech-fieldcraft",
  "ui-hud-population",
  "ui-hud-negative-population",
  "ui-hud-capacity",
  "ui-action-clear-forest",
  "ui-action-replant-forest",
  "ui-reward-expand",
  "ui-action-heal",
  "ui-action-recover",
  "ui-action-wait",
  "ui-action-promote",
  "ui-action-end-turn",
  "ui-tech-maneuver",
  "ui-tech-fortification",
  "ui-tech-recovery",
] as const;

describe("Ruleset 6 technology, economy, and action art contract", () => {
  it("publishes an accepted explicit key for every faction technology node", () => {
    const aliases = new Map(
      sourceManifest.aliases.map((alias) => [alias.id, alias.source]),
    );
    const keys: string[] = [];
    for (const faction of FACTION_IDS_V6) {
      expect(Object.keys(RULESET6_TECH_ART_IDS[faction])).toEqual(
        TECHNOLOGY_IDS,
      );
      for (const technology of TECHNOLOGY_IDS) {
        const inventoryKey = `ui-tech-${faction.toLowerCase()}-${technology
          .toLowerCase()
          .replaceAll("_", "-")}`;
        keys.push(inventoryKey);
        expect(aliases.has(inventoryKey), inventoryKey).toBe(true);
        const artId = technologyArtIdV6(faction, technology);
        expect(ACCEPTED_ART_URLS[artId], `${faction}/${technology}`).toMatch(
          /^\/assets\/pixellab\//,
        );
      }
    }
    expect(keys).toHaveLength(50);
    expect(new Set(keys)).toHaveLength(50);
  });

  it("uses faction-specific role art and shared concrete/abstract concepts", () => {
    const roleNodes = [
      "MARKSMANSHIP",
      "SCOUTING",
      "RAIDING",
      "DRILL",
      "EXPLOSIVES",
      "MEDICINE",
    ] as const;
    for (const technology of roleNodes) {
      const original = technologyArtIdV6("ORIGINAL", technology);
      const candy = technologyArtIdV6("CANDY", technology);
      expect(original).toContain("original");
      expect(candy).toContain("candy");
      expect(ACCEPTED_ART_URLS[original]).not.toBe(ACCEPTED_ART_URLS[candy]);
    }
    for (const technology of [
      "FIELDCRAFT",
      "MANEUVER",
      "FORTIFICATION",
      "RECOVERY",
    ] as const)
      expect(ACCEPTED_ART_URLS[technologyArtIdV6("ORIGINAL", technology)]).toBe(
        ACCEPTED_ART_URLS[technologyArtIdV6("CANDY", technology)],
      );
    expect(technologyArtIdV6("ORIGINAL", "ROADS")).toBe(
      "terrain-square-road-mask-0101",
    );
    expect(technologyArtIdV6("CANDY", "ROADS")).toBe(
      "terrain-square-road-mask-0101",
    );
    expect(ACCEPTED_ART_URLS["terrain-square-road-mask-0101"]).toMatch(
      /terrain-square\/road-masks\/road-mask-0101\.png$/,
    );
  });

  it("maps every contextual action and reward to accepted art while keeping map targeting native", () => {
    for (const faction of FACTION_IDS_V6) {
      for (const kind of COMMAND_KIND_ORDER_V6) {
        const artId = commandArtIdV6(commandForKind(kind), faction);
        if (kind === "MOVE" || kind === "ATTACK") {
          expect(artId, kind).toBeNull();
        } else {
          expect(artId, kind).not.toBeNull();
          expect(ACCEPTED_ART_URLS[artId ?? ""], `${faction}/${kind}`).toMatch(
            /^\/assets\/pixellab\//,
          );
        }
      }
      for (const reward of REWARD_IDS_V6)
        expect(ACCEPTED_ART_URLS[rewardArtIdV6(faction, reward)]).toMatch(
          /^\/assets\/pixellab\//,
        );
    }
    expect(ACCEPTED_ART_URLS[RULESET6_HUD_ART_IDS.COIN]).toContain(
      "hud-coin.png",
    );
    expect(ACCEPTED_ART_URLS[RULESET6_HUD_ART_IDS.INCOME]).toBe(
      ACCEPTED_ART_URLS[RULESET6_HUD_ART_IDS.COIN],
    );
    expect(RULESET6_HUD_ART_IDS.ROAD).toBe("ui-hud-road");
    expect(ACCEPTED_ART_URLS[RULESET6_HUD_ART_IDS.ROAD]).toMatch(
      /road-mask-0101\.png$/,
    );
    expect(
      commandArtIdV6({ kind: "BUILD_ROAD", at: { x: 1, y: 2 } }, "ORIGINAL"),
    ).toBe("terrain-square-road-mask-0101");
    expect(
      commandArtIdV6(
        { kind: "TRAIN", cityId: cityId(3), role: "FIGHTER" },
        "ORIGINAL",
      ),
    ).toBe("unit-original-fighter");
    expect(
      commandArtIdV6(
        { kind: "TRAIN", cityId: cityId(3), role: "FIGHTER" },
        "CANDY",
      ),
    ).toBe("unit-candy-fighter");
  });

  it("pins accepted dimensions, output hashes, and quarantined rejection history", () => {
    const recipes = new Map(
      sourceManifest.recipes.map((recipe) => [recipe.id, recipe]),
    );
    for (const id of NEW_SOURCE_IDS) {
      const recipe = recipes.get(id);
      const record = generatedManifest.records[id];
      expect(recipe, id).toBeDefined();
      expect(record?.status, id).toBe("ACCEPTED");
      expect([recipe?.outputSize.width, recipe?.outputSize.height]).toEqual([
        record?.width,
        record?.height,
      ]);
      const output = readFileSync(
        path.join(process.cwd(), recipe?.output ?? ""),
      );
      expect(createHash("sha256").update(output).digest("hex"), id).toBe(
        record?.outputSha256,
      );
      expect(Object.values(record?.reviewChecks ?? {}).every(Boolean), id).toBe(
        true,
      );
    }
    expect(
      generatedManifest.records["ui-hud-coin"]?.rejectedAttempts,
    ).toHaveLength(1);
    expect(
      generatedManifest.records["ui-hud-negative-population"]?.rejectedAttempts,
    ).toHaveLength(1);
    expect(
      generatedManifest.records["ui-action-heal"]?.rejectedAttempts,
    ).toHaveLength(1);
  });

  it("keeps every deterministic review artifact hash in checked-in evidence", () => {
    const reviewRoot = path.join(
      process.cwd(),
      "art/pixellab/reviews/ruleset6-tech-economy-ui",
    );
    const evidence = JSON.parse(
      readFileSync(path.join(reviewRoot, "review-evidence.json"), "utf8"),
    ) as {
      readonly inventory: {
        readonly explicitTechnologyKeys: number;
        readonly reusedTechnologyKeys: number;
        readonly generatedAbstractTechnologyKeys: number;
      };
      readonly artifacts: Readonly<Record<string, string>>;
    };
    expect(evidence.inventory).toMatchObject({
      explicitTechnologyKeys: 50,
      reusedTechnologyKeys: 42,
      generatedAbstractTechnologyKeys: 8,
    });
    expect(Object.keys(evidence.artifacts)).toHaveLength(8);
    for (const [file, expectedHash] of Object.entries(evidence.artifacts)) {
      const bytes = readFileSync(path.join(reviewRoot, file));
      expect(createHash("sha256").update(bytes).digest("hex"), file).toBe(
        expectedHash,
      );
    }
  });
});

function commandForKind(
  kind: CommandKindV6,
  faction: FactionIdV6 = "ORIGINAL",
): CommandV6 {
  const at = { x: 1, y: 2 } as const;
  const actor = unitId(1);
  switch (kind) {
    case "MOVE":
      return { kind, unitId: actor, path: [at] };
    case "ATTACK":
      return {
        kind,
        unitId: actor,
        target: { kind: "UNIT", unitId: unitId(2) },
      };
    case "KAMIKAZE_ROLL":
      return { kind, unitId: actor, direction: "NORTH" };
    case "HEAL_ADJACENT":
      return { kind, unitId: actor, targetUnitId: unitId(2) };
    case "RECOVER":
    case "CAPTURE":
    case "PROMOTE":
    case "WAIT":
    case "CANDIFY":
      return { kind, unitId: actor };
    case "BUILD_CHOCOLATE_WALL":
      return { kind, unitId: actor, at };
    case "RESEARCH":
      return { kind, tech: "MARKSMANSHIP" };
    case "TRAIN":
      return {
        kind,
        cityId: cityId(3),
        role: faction === "CANDY" ? "SCOUT" : "FIGHTER",
      };
    case "CHOOSE_CANDIFY_CITY":
      return { kind, unitId: actor, cityId: cityId(3) };
    case "CHOOSE_CITY_REWARD":
      return { kind, cityId: cityId(3), reachedLevel: 2, reward: "STOCKPILE" };
    case "END_TURN":
      return { kind };
    default:
      return { kind, at };
  }
}
