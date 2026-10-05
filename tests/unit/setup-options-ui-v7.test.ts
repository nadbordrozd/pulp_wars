import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BOARD_SIZES_V7,
  FACTION_IDS_V7,
  allowedBoardSizesV7,
  crowdedBoardV7,
  generatedVillageCountV7,
  isGeneratedMapTypeV7,
  seatCountAllowedV7,
  type PlayerId,
  type PublicPlayerV7,
} from "../../src/engine/index";
import {
  CROWDED_LABEL_V7,
  SETUP_MAP_TYPES_V7,
  clampOpponentCountV7,
  resolveSetupChoiceV7,
  setupMapLimitReasonV7,
  setupMapOptionsV7,
  setupOpponentCountsV7,
  setupSizeOptionsV7,
  setupVillageLineV7,
} from "../../src/render/setup-options-v7";
import {
  aiTurnPlaceV7,
  playerCountLabelV7,
} from "../../src/render/turn-order-presentation-v7";

/**
 * The setup screen's option model (bead `pulp_wars-ykw.5`): everything it
 * offers comes from the engine's map-scale queries.
 */

const COUNTS = setupOpponentCountsV7();

describe("setup options for many players", () => {
  it("offers one opponent up to one less than the faction count", () => {
    expect(COUNTS[0]).toBe(1);
    expect(COUNTS.at(-1)).toBe(FACTION_IDS_V7.length - 1);
    expect(COUNTS).toHaveLength(FACTION_IDS_V7.length - 1);
    expect(clampOpponentCountV7(0)).toBe(1);
    expect(clampOpponentCountV7(99)).toBe(FACTION_IDS_V7.length - 1);
    expect(clampOpponentCountV7(Number.NaN)).toBe(1);
    expect(clampOpponentCountV7(4)).toBe(4);
  });

  it("offers exactly the engine's legal sizes, with its crowded mark and village count", () => {
    for (const mapType of SETUP_MAP_TYPES_V7)
      for (const opponents of COUNTS) {
        const seats = opponents + 1;
        const options = setupSizeOptionsV7(mapType, opponents);
        expect(options.map((option) => option.size)).toEqual(
          allowedBoardSizesV7(mapType, seats),
        );
        for (const option of options) {
          expect(seatCountAllowedV7(option.size, mapType, seats)).toBe(true);
          if (isGeneratedMapTypeV7(mapType)) {
            expect(option.crowded).toBe(
              crowdedBoardV7(option.size, mapType, seats),
            );
            expect(option.villages).toBe(
              generatedVillageCountV7(option.size, mapType, seats),
            );
          } else {
            expect(option.crowded).toBe(false);
            expect(option.villages).toBeNull();
          }
        }
      }
  });

  it("marks the smallest Dry Land board crowded for the most players", () => {
    const most = COUNTS.at(-1) ?? 1;
    const options = setupSizeOptionsV7("DRY_LAND", most);
    expect(options[0]?.size).toBe(BOARD_SIZES_V7[0]);
    expect(options[0]?.crowded).toBe(true);
    expect(options.at(-1)?.crowded).toBe(false);
    // Two players are never crowded on a generated map.
    for (const mapType of SETUP_MAP_TYPES_V7)
      expect(
        setupSizeOptionsV7(mapType, 1).some((option) => option.crowded),
      ).toBe(false);
  });

  it("disables a map type that takes the players at no size, with the reason", () => {
    for (const opponents of COUNTS)
      for (const option of setupMapOptionsV7(opponents)) {
        expect(option.enabled).toBe(
          allowedBoardSizesV7(option.mapType, opponents + 1).length > 0,
        );
        // The limit is the engine's: one more opponent is never legal.
        expect(
          allowedBoardSizesV7(option.mapType, option.maxOpponents + 1).length,
        ).toBeGreaterThan(0);
        expect(
          allowedBoardSizesV7(option.mapType, option.maxOpponents + 2),
        ).toEqual([]);
      }
    const showcase = setupMapOptionsV7(COUNTS.at(-1) ?? 1).find(
      (option) => option.mapType === "SHOWCASE",
    );
    expect(showcase?.enabled).toBe(false);
    expect(showcase === undefined ? "" : setupMapLimitReasonV7(showcase)).toBe(
      "up to 3 opponents",
    );
    // Every generated map type takes every opponent count at some size.
    for (const opponents of COUNTS)
      expect(
        setupMapOptionsV7(opponents)
          .filter((option) => option.mapType !== "SHOWCASE")
          .every((option) => option.enabled),
      ).toBe(true);
  });

  it("keeps a legal choice and moves an illegal size to the nearest legal one", () => {
    for (const mapType of SETUP_MAP_TYPES_V7)
      for (const opponents of COUNTS)
        for (const boardSize of BOARD_SIZES_V7) {
          const resolved = resolveSetupChoiceV7({
            mapType,
            opponents,
            boardSize,
          });
          // The result is always legal.
          expect(
            seatCountAllowedV7(
              resolved.boardSize,
              resolved.mapType,
              resolved.opponents + 1,
            ),
          ).toBe(true);
          const legal = seatCountAllowedV7(boardSize, mapType, opponents + 1);
          expect(resolved.sizeMoved || resolved.mapMoved).toBe(!legal);
          if (legal)
            expect(resolved).toMatchObject({ mapType, opponents, boardSize });
          if (!resolved.mapMoved && resolved.sizeMoved) {
            const allowed = allowedBoardSizesV7(mapType, opponents + 1);
            const nearest = Math.min(
              ...allowed.map((size) => Math.abs(size - boardSize)),
            );
            expect(Math.abs(resolved.boardSize - boardSize)).toBe(nearest);
          }
        }
    // The measured limit of the smallest Lakes board: three players move up.
    const lakes = resolveSetupChoiceV7({
      mapType: "LAKES",
      opponents: 2,
      boardSize: 11,
    });
    expect(allowedBoardSizesV7("LAKES", 3)[0]).toBe(lakes.boardSize);
    expect(lakes.sizeMoved).toBe(true);
    expect(lakes.mapMoved).toBe(false);
  });

  it("moves off a map type that cannot take the players at all", () => {
    const resolved = resolveSetupChoiceV7({
      mapType: "SHOWCASE",
      opponents: COUNTS.at(-1) ?? 1,
      boardSize: 16,
    });
    expect(resolved.mapMoved).toBe(true);
    expect(resolved.mapType).toBe("CONTINENTS");
    expect(resolved.sizeMoved).toBe(false);
    expect(resolved.boardSize).toBe(16);
  });

  it("states the villages as the most a board holds", () => {
    expect(setupVillageLineV7({ size: 11, crowded: false, villages: 5 })).toBe(
      "Up to 5 villages",
    );
    expect(setupVillageLineV7({ size: 11, crowded: true, villages: 1 })).toBe(
      "Up to 1 village",
    );
    expect(setupVillageLineV7({ size: 11, crowded: true, villages: 0 })).toBe(
      "No villages",
    );
    expect(
      setupVillageLineV7({ size: 16, crowded: false, villages: null }),
    ).toBeNull();
    expect(CROWDED_LABEL_V7).toBe("Crowded");
  });

  it("repeats no size, seat or village table of the engine", () => {
    const source = readFileSync("src/render/setup-options-v7.ts", "utf8");
    expect(source).not.toMatch(/\b(11|14|16|20|25)\b/);
    expect(source).toContain("allowedBoardSizesV7");
    expect(source).toContain("crowdedBoardV7");
    const view = readFileSync("src/render/dom/app-view-v7.ts", "utf8");
    expect(view).not.toContain("[11, 14, 16, 20, 25]");
    expect(view).not.toContain('["1", "2", "3"]');
    expect(view).not.toContain("function compatibleSizes");
  });
});

describe("turn order with many players", () => {
  const player = (
    id: number,
    controller: "HUMAN" | "AI",
    status: "ACTIVE" | "ELIMINATED" = "ACTIVE",
  ): PublicPlayerV7 =>
    ({ id: id as PlayerId, seat: id, controller, status }) as PublicPlayerV7;
  const players = [
    player(0, "HUMAN"),
    player(1, "AI"),
    player(2, "AI", "ELIMINATED"),
    player(3, "AI"),
    player(4, "AI"),
  ];
  // Turn order 3, 0 (human), 4, 2 (out), 1.
  const turnOrder = [3, 0, 4, 2, 1] as PlayerId[];

  it("counts the waiting from the seat after the human, skipping players who are out", () => {
    const place = (activeSeatIndex: number) =>
      aiTurnPlaceV7({ players, turnOrder, activeSeatIndex });
    expect(place(1)).toBeNull();
    expect(place(2)).toEqual({ index: 1, total: 3 });
    expect(place(4)).toEqual({ index: 2, total: 3 });
    expect(place(0)).toEqual({ index: 3, total: 3 });
  });

  it("counts nothing with a single opponent left", () => {
    const two = [player(0, "HUMAN"), player(1, "AI")];
    expect(
      aiTurnPlaceV7({
        players: two,
        turnOrder: [1, 0] as PlayerId[],
        activeSeatIndex: 0,
      }),
    ).toBeNull();
  });

  it("labels the player count", () => {
    expect(playerCountLabelV7({ players })).toBe("5 players");
  });
});
