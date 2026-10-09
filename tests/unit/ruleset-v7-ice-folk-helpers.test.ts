import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  canEnterTerrainV7,
  effectiveRoleRuleV7,
  primaryActionBlockedAfterMoveV7,
  roleMechanicsV7,
  terrainStopsMoveV7,
  unitIsMountainBornV7,
  unitIsFrozenV7,
  unitMayActAfterMoveV7,
  unitMayEnterMountainV7,
  type FactionIdV7,
  type PlayerId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { kindReaderScopeTextV7 } from "../fixtures/v7-kind-readers";

/**
 * The two engine-wide helpers of the Ice Folk revision
 * (docs/product/RULESET_7_ICE_FOLK.md sections 5.3 and 7.1), landed first
 * and behaviour-neutral: "may this unit act after moving" and "may this unit
 * enter a Mountain / is it stopped there". The audits below pin that no
 * direct check bypasses them.
 */

const OWNER = 1 as PlayerId;
const rosterOf = (faction: FactionIdV7) => ({
  players: [{ id: OWNER, faction }],
  mindControlled: [],
});
const unitOf = (role: UnitRoleIdV7, moved = false) => ({
  id: 7,
  ownerId: OWNER,
  role,
  form: "LAND" as const,
  activation: { moved },
});

describe("unitMayActAfterMoveV7 (section 21.3)", () => {
  it("equals the role flag for every role of every faction without a Frozen entry", () => {
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7) {
        const roster = rosterOf(faction);
        const flag = effectiveRoleRuleV7(
          role,
          faction,
        ).mayUsePrimaryActionAfterMove;
        expect(unitIsFrozenV7(roster, unitOf(role)), role).toBe(false);
        expect(unitMayActAfterMoveV7(roster, unitOf(role)), role).toBe(flag);
        expect(
          unitMayActAfterMoveV7({ ...roster, frozen: [] }, unitOf(role)),
        ).toBe(flag);
        expect(
          primaryActionBlockedAfterMoveV7(roster, unitOf(role, true)),
        ).toBe(!flag);
        expect(primaryActionBlockedAfterMoveV7(roster, unitOf(role))).toBe(
          false,
        );
      }
  });

  it("a Frozen entry (Ice Folk Freeze, `pulp_wars-w49.37`) forbids acting after a Move; another unit's entry does not", () => {
    for (const faction of FACTION_IDS_V7) {
      const frozen = {
        ...rosterOf(faction),
        frozen: [{ unitId: 7 }],
      };
      for (const role of UNIT_ROLE_IDS_V7) {
        const flag = effectiveRoleRuleV7(
          role,
          faction,
        ).mayUsePrimaryActionAfterMove;
        expect(unitIsFrozenV7(frozen, unitOf(role))).toBe(true);
        expect(unitMayActAfterMoveV7(frozen, unitOf(role))).toBe(false);
        expect(
          primaryActionBlockedAfterMoveV7(frozen, unitOf(role, true)),
        ).toBe(true);
        expect(unitIsFrozenV7(frozen, { ...unitOf(role), id: 8 })).toBe(false);
        expect(unitMayActAfterMoveV7(frozen, { ...unitOf(role), id: 8 })).toBe(
          flag,
        );
      }
    }
  });
});

describe("Mountain entry and the terrain stop (section 7.1)", () => {
  it("canEnterTerrainV7: a Mountain-born land unit enters a Mountain without Engineering", () => {
    const mountain = (
      movementMode: "GROUND" | "STRIDE" | "FLY",
      engineering: boolean,
      mountainBorn: boolean,
      afloat = false,
    ) =>
      canEnterTerrainV7({
        terrain: "MOUNTAIN",
        movementMode,
        afloat,
        engineering,
        navigation: false,
        mountainBorn,
        ice: false,
      });
    expect(mountain("GROUND", false, false)).toBe(false);
    expect(mountain("GROUND", true, false)).toBe(true);
    expect(mountain("GROUND", false, true)).toBe(true);
    expect(mountain("STRIDE", false, false)).toBe(true);
    expect(mountain("FLY", false, false)).toBe(true);
    // Never afloat.
    expect(mountain("GROUND", true, true, true)).toBe(false);
    // Mountain-born changes no other terrain.
    for (const terrain of [
      "GRASS",
      "FOREST",
      "SHALLOW_WATER",
      "DEEP_WATER",
    ] as const)
      for (const afloat of [false, true])
        expect(
          canEnterTerrainV7({
            terrain,
            movementMode: "GROUND",
            afloat,
            engineering: false,
            navigation: true,
            mountainBorn: true,
            ice: false,
          }),
        ).toBe(
          canEnterTerrainV7({
            terrain,
            movementMode: "GROUND",
            afloat,
            engineering: false,
            navigation: true,
            mountainBorn: false,
            ice: false,
          }),
        );
  });

  it("terrainStopsMoveV7: Mountain and Forest stop a ground unit unless waived", () => {
    const stops = (
      terrain: "GRASS" | "FOREST" | "MOUNTAIN",
      input: Partial<Parameters<typeof terrainStopsMoveV7>[0]> = {},
    ) =>
      terrainStopsMoveV7({
        terrain,
        movementMode: "GROUND",
        mountainBorn: false,
        ignoresForest: false,
        roadEdge: false,
        ice: false,
        iceFolk: false,
        ...input,
      });
    expect(stops("GRASS")).toBe(false);
    expect(stops("FOREST")).toBe(true);
    expect(stops("MOUNTAIN")).toBe(true);
    expect(stops("MOUNTAIN", { mountainBorn: true })).toBe(false);
    expect(stops("FOREST", { mountainBorn: true })).toBe(true);
    expect(stops("FOREST", { ignoresForest: true })).toBe(false);
    expect(stops("MOUNTAIN", { ignoresForest: true })).toBe(true);
    expect(stops("MOUNTAIN", { roadEdge: true })).toBe(false);
    expect(stops("FOREST", { roadEdge: true })).toBe(false);
    for (const movementMode of ["STRIDE", "FLY"] as const) {
      expect(stops("MOUNTAIN", { movementMode })).toBe(false);
      expect(stops("FOREST", { movementMode })).toBe(false);
    }
  });

  it("matches Engineering or a machine for every role of every non-Ice Folk faction", () => {
    for (const faction of FACTION_IDS_V7) {
      if ((faction as string) === "ICE_FOLK") continue;
      for (const role of UNIT_ROLE_IDS_V7) {
        const roster = rosterOf(faction);
        const machine =
          roleMechanicsV7(role, faction).movementMode !== "GROUND";
        expect(roleMechanicsV7(role, faction).mountainBorn).toBe(false);
        expect(unitIsMountainBornV7(roster, unitOf(role))).toBe(false);
        for (const engineering of [false, true])
          expect(
            unitMayEnterMountainV7(roster, unitOf(role), engineering),
            `${faction} ${role}`,
          ).toBe(engineering || machine);
      }
    }
  });
});

/** Every TypeScript source file under `dir`. */
function sourcesUnder(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourcesUnder(path);
    return path.endsWith(".ts") ? [path] : [];
  });
}

/** Runtime Ruleset 7 sources (Ruleset 5 and 6 are frozen and excluded). */
const RUNTIME_V7_SOURCES = [
  ...sourcesUnder("src/engine/v7"),
  ...sourcesUnder("src/ai"),
  ...sourcesUnder("src/render"),
  ...sourcesUnder("src/app"),
  ...sourcesUnder("src/headless"),
  "src/engine/rules/ruleset-v7.ts",
].filter(
  (path) => !/(?:^|\/)[^/]*v6[^/]*$/.test(path) && !path.endsWith("v5.ts"),
);

describe("source audits", () => {
  // Section 5.3: every read of `mayUsePrimaryActionAfterMove` for a concrete
  // unit goes through `unitMayActAfterMoveV7`. The only other reads are
  // role-level tables, which describe a role, not a unit: the recruitment
  // table of the DOM ("Can't attack after moving.") and the unit glossary's
  // "Slow to strike" trait (bead pulp_wars-2yc.39: `roleTraitGlossaryIdsV7`
  // takes a role and a faction and no unit; a Frozen unit is explained by
  // its Frozen status line, not by a trait).
  it("reads the role flag only in the helper and in the role-level tables", () => {
    const reads: Record<string, number> = {};
    for (const path of RUNTIME_V7_SOURCES) {
      const count =
        readFileSync(path, "utf8").match(/\.mayUsePrimaryActionAfterMove\b/g)
          ?.length ?? 0;
      if (count > 0) reads[path] = count;
    }
    expect(reads).toEqual({
      "src/engine/rules/ruleset-v7.ts": 1,
      "src/render/role-presentation-v7.ts": 1,
      "src/render/unit-glossary-v7.ts": 1,
    });
    // The glossary's one read is in its role-level trait list.
    expect(
      kindReaderScopeTextV7(
        process.cwd(),
        "src/render/unit-glossary-v7.ts",
        "roleTraitGlossaryIdsV7",
      ),
    ).toMatch(/\.mayUsePrimaryActionAfterMove\b/);
  });

  // Section 7.1: no unit-entry rule tests Engineering against a Mountain
  // directly; they use `canEnterTerrainV7` (its call sites are pinned in
  // ruleset-v7-martian-movement.test.ts) or `unitMayEnterMountainV7`. The
  // remaining Engineering-and-Mountain tests are not about a unit entering a
  // tile: economy (Mine, Monument, Road, and placement enumerations in the
  // reducer and the public query), the Normal AI's seat-level route maps
  // (campaign, endgame, road corridor, naval plan land), its Sight
  // estimate (+1 Sight on a Mountain), and a headless telemetry counter.
  it("every remaining Engineering test next to a Mountain test is economic or seat-level", () => {
    const found: Record<string, number> = {};
    for (const path of RUNTIME_V7_SOURCES) {
      const lines = readFileSync(path, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!line.includes('"ENGINEERING"') && !/\bengineering\)/.test(line))
          return;
        const window = lines
          .slice(Math.max(0, index - 3), index + 4)
          .join("\n");
        if (window.includes('"MOUNTAIN"')) found[path] = (found[path] ?? 0) + 1;
      });
    }
    expect(found).toEqual({
      // Endgame land reachability (seat-level, "units are not walls").
      "src/ai/v7-endgame.ts": 1,
      // Campaign route map (seat-level).
      "src/ai/v7-campaign.ts": 1,
      // `pulp_wars-68k.6`: the chokepoint plan's land (the campaign map).
      "src/ai/v7-chokepoint.ts": 1,
      // Road corridor, naval-plan land components, Sight gain.
      "src/ai/v7.ts": 3,
      // BUILD_MINE's technology.
      "src/engine/rules/ruleset-v7.ts": 1,
      // Monument, placement enumerations, and public tile-command legality.
      "src/engine/v7/query.ts": 7,
      // Spatial buildings, Monument, and infrastructure.
      "src/engine/v7/reducer.ts": 5,
      // Headless telemetry: Mountain-born Moves made without Engineering.
      "src/headless/ice-folk-telemetry-v7.ts": 1,
    });
  });
});
