import { describe, expect, it } from "vitest";
import { CAMPAIGNS_V7 } from "../../src/campaign/campaigns";
import {
  MISSION_REGISTRY_V7,
  SETTLEMENT_SPACING_V7,
  createInitialMapStateV7,
  missionMatchSetupV7,
  type CoordV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";

// Mission village spacing (`pulp_wars-as6z`): the map generator keeps every
// settlement (capital or village) `SETTLEMENT_SPACING_V7` (3) or more apart
// (Chebyshev), so no two 3 x 3 territories overlap; every mission's
// starting board keeps the same rule, villages against cities and villages
// against villages. The user found villages 2 from a city on the Sea Road
// (DINOSAUR_3, revision 4). Ruins, treasure chests and the other curiosities
// are not villages and are not checked.

/**
 * Engine fixtures, never in a campaign chapter, whose hand-built board has a
 * village 2 from a city that a great many tests rely on; they are exempt.
 */
const EXEMPT = new Set(["TEST_GROUNDS", "TEST_CURIOSITIES"]);

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const text = (at: CoordV7): string => `(${String(at.x)}, ${String(at.y)})`;

/** Every pair of settlements on the mission's starting board too close. */
function spacingViolations(mission: MissionDefinitionV7): string[] {
  const setup = missionMatchSetupV7(mission);
  if (setup === null) throw new Error(`${mission.id} has no setup`);
  const built = createInitialMapStateV7(setup);
  if (!built.ok) throw new Error(`${mission.id}: ${built.error.code}`);
  const tiles = built.state.board.tiles;
  const villages = tiles.filter((t) => t.site === "VILLAGE").map((t) => t.at);
  const cities = tiles
    .filter((t) => t.site === "CITY" || t.site === "CAPITAL")
    .map((t) => t.at);
  const found: string[] = [];
  villages.forEach((village, index) => {
    for (const city of cities)
      if (chebyshev(village, city) < SETTLEMENT_SPACING_V7)
        found.push(`village ${text(village)} near city ${text(city)}`);
    for (const other of villages.slice(index + 1))
      if (chebyshev(village, other) < SETTLEMENT_SPACING_V7)
        found.push(`village ${text(village)} near village ${text(other)}`);
  });
  return found;
}

describe("mission village spacing", () => {
  it("keeps the generator's settlement spacing of 3", () => {
    expect(SETTLEMENT_SPACING_V7).toBe(3);
  });

  it("keeps every village 3 or more from every city and village at the start", () => {
    const violations: Record<string, string[]> = {};
    for (const mission of MISSION_REGISTRY_V7) {
      if (EXEMPT.has(mission.id)) continue;
      const found = spacingViolations(mission);
      if (found.length > 0) violations[mission.id] = found;
    }
    expect(violations).toEqual({});
  });

  it("checks every campaign chapter's missions and exempts none of them", () => {
    const registered = new Set(MISSION_REGISTRY_V7.map((m) => m.id));
    for (const campaign of CAMPAIGNS_V7)
      for (const entry of campaign.chapter?.missions ?? []) {
        expect(registered.has(entry.missionId), entry.missionId).toBe(true);
        expect(EXEMPT.has(entry.missionId), entry.missionId).toBe(false);
      }
  });
});
