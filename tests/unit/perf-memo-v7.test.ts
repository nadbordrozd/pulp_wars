import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  playerFactionV7,
  technologyCapabilitiesV7,
  viewForV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  terrainSkeletonOfSetupV7,
  terrainSkeletonOfViewV7,
} from "../../src/render/canvas/terrain-at-fog-v7";

/**
 * Bead pulp_wars-2yc.79 (performance): memos that must give exactly what
 * the computation they skip would give.
 */
const SETUP: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  seed: 79,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "UNDEAD"],
  mapType: "CONTINENTS",
  curiosities: true,
  gameMode: "DOMINATION",
};

function created() {
  const made = createPlayableGameV7(SETUP);
  if (!made.ok) throw new Error("setup rejected");
  return made.state;
}

/** An accepted state: the reducer certifies what it accepts. */
function accepted() {
  const state = created();
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const applied = applyCommandV7(state, actor, { kind: "END_TURN" });
  if (!applied.accepted) throw new Error("End Turn rejected");
  return applied.state;
}

describe("performance memos", () => {
  it("gives the same view object for an accepted state, equal to a fresh one", () => {
    const state = accepted();
    for (const player of state.players) {
      const view = viewForV7(state, player.id);
      expect(viewForV7(state, player.id)).toBe(view);
      expect(Object.isFrozen(view)).toBe(true);
      // A structured clone carries no certificate: computed afresh.
      const fresh = viewForV7(structuredClone(state), player.id);
      expect(fresh).not.toBe(view);
      expect(canonicalHash(fresh)).toBe(canonicalHash(view));
    }
    // A state the reducer did not accept is never remembered.
    const made = created();
    expect(viewForV7(made, made.humanPlayerId)).not.toBe(
      viewForV7(made, made.humanPlayerId),
    );
    expect(() => viewForV7(state, 999 as never)).toThrow(RangeError);
  });

  it("reads one terrain skeleton for equal setups that are different objects", () => {
    const state = created();
    const view = viewForV7(state, state.humanPlayerId);
    const skeleton = terrainSkeletonOfViewV7(view);
    expect(skeleton).not.toBeNull();
    expect(skeleton).toEqual(terrainSkeletonOfSetupV7(SETUP));
    const copy = { ...view, setup: structuredClone(view.setup) };
    expect(copy.setup).not.toBe(view.setup);
    expect(terrainSkeletonOfViewV7(copy)).toBe(skeleton);
    // A different setup makes its own map.
    const other = { ...view, setup: { ...view.setup, seed: 80 } };
    expect(terrainSkeletonOfViewV7(other)).not.toBe(skeleton);
  });
});

describe("technology capabilities memo", () => {
  it("answers a frozen list as its unfrozen copy and its text key would", () => {
    const techs = ["ROADS", "NAVIGATION"] as const;
    const frozen = Object.freeze([...techs]);
    for (const faction of ["ORIGINAL", "CANDY", "DWARF"] as const) {
      const first = technologyCapabilitiesV7(frozen, faction);
      expect(technologyCapabilitiesV7(frozen, faction)).toBe(first);
      expect(technologyCapabilitiesV7([...techs].reverse(), faction)).toEqual(
        first,
      );
    }
    // Two factions on different trees never share an answer.
    expect(technologyCapabilitiesV7(frozen, "CANDY")).toEqual(
      technologyCapabilitiesV7([...techs], "CANDY"),
    );
  });
});

describe("player faction memo", () => {
  type Roster = Parameters<typeof playerFactionV7>[0];
  type Player = Roster["players"][number];
  const p = (id: number, faction: string): Player =>
    ({ id, faction }) as unknown as Player;

  it("reads a frozen list's first player of each id, and throws for a stranger", () => {
    const players = Object.freeze([
      Object.freeze(p(1, "ORIGINAL")),
      Object.freeze(p(2, "UNDEAD")),
      Object.freeze(p(2, "GOBLIN")),
    ]);
    expect(playerFactionV7({ players }, 1 as never)).toBe("ORIGINAL");
    expect(playerFactionV7({ players }, 2 as never)).toBe("UNDEAD");
    expect(() => playerFactionV7({ players }, 3 as never)).toThrow(RangeError);
    expect(() => playerFactionV7({ players }, Number.NaN as never)).toThrow(
      RangeError,
    );
  });

  it("follows a list that is not frozen when it changes in place", () => {
    const player = { id: 1, faction: "ORIGINAL" };
    const players = [player as unknown as Player];
    expect(playerFactionV7({ players }, 1 as never)).toBe("ORIGINAL");
    player.faction = "DWARF";
    expect(playerFactionV7({ players }, 1 as never)).toBe("DWARF");
    players.push(p(4, "CANDY"));
    expect(playerFactionV7({ players }, 4 as never)).toBe("CANDY");
    // A frozen list of players that are not frozen is not remembered.
    const loose = Object.freeze([player as unknown as Player]);
    expect(playerFactionV7({ players: loose }, 1 as never)).toBe("DWARF");
    player.faction = "MARTIAN";
    expect(playerFactionV7({ players: loose }, 1 as never)).toBe("MARTIAN");
  });
});
