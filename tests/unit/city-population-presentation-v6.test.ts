import { describe, expect, it } from "vitest";
import { cityId } from "../../src/engine/index";
import { cityPopulationPresentationV6 } from "../../src/render/city-population-presentation-v6";

describe("ruleset-6 city population layer presentation", () => {
  it("shows exactly the current level threshold and fills only incremental progress", () => {
    const presentation = cityPopulationPresentationV6({
      id: cityId(12),
      level: 3,
      population: 2,
    });

    expect(presentation).toMatchObject({
      maxLevel: false,
      level: 3,
      nextLevel: 4,
      required: 4,
      accumulated: 2,
      remaining: 2,
      deficit: 0,
    });
    expect(presentation.squares).toEqual([
      "FILLED",
      "FILLED",
      "EMPTY",
      "EMPTY",
    ]);
    expect(presentation.accessibleText).toBe(
      "City 12 population progress: 2 of 4 population accumulated since reaching level 3; 2 population are needed to reach level 4.",
    );
  });

  it("uses leading red states for loss and keeps an exact larger deficit in text", () => {
    const withinLayer = cityPopulationPresentationV6({
      id: cityId(8),
      level: 3,
      population: -2,
    });
    expect(withinLayer.squares).toEqual([
      "DEFICIT",
      "DEFICIT",
      "EMPTY",
      "EMPTY",
    ]);

    const beyondLayer = cityPopulationPresentationV6({
      id: cityId(8),
      level: 3,
      population: -7,
    });
    expect(beyondLayer.squares).toEqual([
      "DEFICIT",
      "DEFICIT",
      "DEFICIT",
      "DEFICIT",
    ]);
    expect(beyondLayer.deficit).toBe(7);
    expect(beyondLayer.accessibleText).toContain(
      "7 population below the level 3 baseline; replace 7 population",
    );
  });

  it("resets to the new layer after advancement and defines uncapped growth", () => {
    const before = cityPopulationPresentationV6({
      id: cityId(4),
      level: 2,
      population: 2,
    });
    const after = cityPopulationPresentationV6({
      id: cityId(4),
      level: 3,
      population: 0,
    });
    const metropolis = cityPopulationPresentationV6({
      id: cityId(4),
      level: 12,
      population: 5,
    });

    expect(before.squares).toHaveLength(3);
    expect(before.squares.filter((state) => state === "FILLED")).toHaveLength(
      2,
    );
    expect(after.squares).toHaveLength(4);
    expect(after.squares.every((state) => state === "EMPTY")).toBe(true);
    expect(metropolis).toMatchObject({ maxLevel: false, required: 13 });
    expect(metropolis.squares).toHaveLength(13);
  });
});
