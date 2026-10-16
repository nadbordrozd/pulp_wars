import { describe, expect, it } from "vitest";
import { FACTION_IDS_V7, type FactionIdV7 } from "../../src/engine/index";
import {
  playerNameV7,
  playerObjectV7,
  playerPossessiveV7,
  playerSubjectV7,
  tribeLabelV7,
  type PlayerNamingViewV7,
} from "../../src/render/player-names-v7";

/**
 * Players are named by tribe, never "Player N" (bead pulp_wars-2yc.56):
 * "You" for the viewer, the tribe's plural for everyone else, and a place
 * number only when two rival seats share a tribe. Hand-built seat lists, no
 * match.
 */

function seats(
  factions: readonly FactionIdV7[],
  viewerSeat = 0,
): PlayerNamingViewV7 {
  return {
    viewer: { id: viewerSeat + 1 },
    players: factions.map((faction, seat) => ({ id: seat + 1, seat, faction })),
  };
}

describe("player names", () => {
  it("names the viewer You and every rival by its tribe in the plural", () => {
    const view = seats(["ORIGINAL", "MARTIAN", "DWARF", "ICE_FOLK"]);
    expect([1, 2, 3, 4].map((id) => playerNameV7(view, id))).toEqual([
      "You",
      "Martians",
      "Dwarves",
      "Ice Folk",
    ]);
    expect(playerSubjectV7(view, 2)).toBe("The Martians");
    expect(playerSubjectV7(view, 1)).toBe("You");
    expect(playerObjectV7(view, 3)).toBe("the Dwarves");
    expect(playerObjectV7(view, 1)).toBe("you");
  });

  it("makes a plural possessive with an apostrophe, and 's otherwise", () => {
    const view = seats(["CULT", "MARTIAN", "ICE_FOLK", "UNDEAD", "CANDY"]);
    expect([1, 2, 3, 4, 5].map((id) => playerPossessiveV7(view, id))).toEqual([
      "your",
      "the Martians'",
      "the Ice Folk's",
      "the Undead's",
      "the Candy's",
    ]);
  });

  it("names every faction, and never by seat number", () => {
    const view = seats(["ORIGINAL", ...FACTION_IDS_V7]);
    const names = view.players.slice(1).map((p) => playerNameV7(view, p.id));
    expect(names).toHaveLength(FACTION_IDS_V7.length);
    expect(new Set(names).size).toBe(FACTION_IDS_V7.length);
    for (const name of names) {
      expect(name).not.toMatch(/Player|\d/);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("numbers rival seats of one tribe only when two or more share it", () => {
    const view = seats(["ORIGINAL", "GOBLIN", "MARTIAN", "GOBLIN", "GOBLIN"]);
    expect([2, 3, 4, 5].map((id) => playerNameV7(view, id))).toEqual([
      "Goblins (1)",
      "Martians",
      "Goblins (2)",
      "Goblins (3)",
    ]);
    expect(playerSubjectV7(view, 4)).toBe("The Goblins (2)");
    expect(playerPossessiveV7(view, 5)).toBe("the Goblins (3)'s");
  });

  it("does not count the viewer's own seat: a rival of the viewer's tribe stays plain", () => {
    const view = seats(["DWARF", "DWARF", "UNDEAD"]);
    expect(playerNameV7(view, 1)).toBe("You");
    expect(playerNameV7(view, 2)).toBe("Dwarves");
    // The viewer's own tribe label (a label that is not "You").
    expect(tribeLabelV7(view, 1)).toBe("Dwarves");
  });

  it("numbers by seat, whatever the order of the list", () => {
    const view: PlayerNamingViewV7 = {
      viewer: { id: 1 },
      players: [
        { id: 9, seat: 4, faction: "CANDY" },
        { id: 1, seat: 0, faction: "ORIGINAL" },
        { id: 5, seat: 2, faction: "CANDY" },
      ],
    };
    expect(playerNameV7(view, 5)).toBe("Candy (1)");
    expect(playerNameV7(view, 9)).toBe("Candy (2)");
  });

  it("falls back for an unknown player", () => {
    const view = seats(["ORIGINAL", "GOBLIN"]);
    expect(tribeLabelV7(view, 42)).toBeUndefined();
    expect(playerNameV7(view, 42)).toBe("An enemy");
    expect(playerObjectV7(view, 42)).toBe("an enemy");
    expect(playerPossessiveV7(view, 42)).toBe("an enemy's");
    expect(playerNameV7(view, 42, "Unknown")).toBe("Unknown");
  });
});
