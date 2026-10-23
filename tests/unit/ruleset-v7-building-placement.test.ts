import { describe, expect, it } from "vitest";
import {
  CLEAR_FOREST_COINS_V7,
  FACTION_IDS_V7,
  factionTreeV7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  applyCommandV7,
  previewEconomicV7,
  queryAiReadyCommandsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type SpatialEconomicCommandKindV7,
  type TileStateV7,
} from "../../src/engine/index";
import { scoreCommandV7 } from "../../src/ai/v7";
import {
  BUILD_CLEARS_FOREST_NOTE_V7,
  buildSiteNotesV7,
  buildUsesUpNoteV7,
} from "../../src/render/building-rules-v7";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  replaceTileV7,
} from "../fixtures/v7-builders";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import { acceptV7, seatV7 } from "../fixtures/v7-naval-branch";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { FOREST_BUILDING_UNLOCK_TEXT_V7 } from "../../src/render/technology-unlock-text-v7";

/**
 * Building placement (`pulp_wars-h0xx`, `pulp-wars-poc-7r106`;
 * docs/product/RULESET_7_CURRENT.md section 8.1). The user, 2026-10-23:
 * mountains allow the fewest buildings, Fruit and Fertile Ground never
 * block a building, and a building on a Forest needs the technology that
 * clears a Forest and clears it.
 *
 * Small hand-built states around the human capital: a Farm at north-east,
 * a Lumber Camp at south-east and a Mine at south of the capital feed every
 * general building tried on the east tile `T`.
 */

const SPATIAL_KINDS = Object.keys(
  SPATIAL_ECONOMIC_ACTIONS_V7,
) as SpatialEconomicCommandKindV7[];

interface Fixture {
  readonly state: GameStateV7;
  readonly at: (dx: number, dy: number) => CoordV7;
  readonly target: CoordV7;
}

function tileAt(state: GameStateV7, at: CoordV7): TileStateV7 {
  const tile = state.board.tiles.find(
    (item) => item.at.x === at.x && item.at.y === at.y,
  );
  if (tile === undefined) throw new Error("tile missing");
  return tile;
}

function build(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted)
    throw new Error(`${command.kind} refused: ${result.error.code}`);
  return result.state;
}

/** Every reward the builds offer is taken, so the next build is not held. */
function settled(input: GameStateV7): GameStateV7 {
  let state = input;
  for (;;) {
    const reward = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    ).find((command) => command.kind === "CHOOSE_CITY_REWARD");
    if (reward === undefined) return state;
    state = build(state, reward);
  }
}

/**
 * The capital's ring as bare Grass, a Farm, a Lumber Camp and a Mine built
 * by the reducer, every pre-naval technology and plenty of Coins; `T` (east
 * of the capital) is patched by each test.
 */
function fixture(target: Partial<TileStateV7>): Fixture {
  let state: GameStateV7 = exploredAllV7(allTechsV7(initialV7(101)));
  const city = state.cities.find(
    (item) => item.ownerId === state.humanPlayerId,
  );
  if (city === undefined) throw new Error("city missing");
  const at = (dx: number, dy: number): CoordV7 => ({
    x: city.at.x + dx,
    y: city.at.y + dy,
  });
  for (const [dx, dy] of [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ] as const)
    state = replaceTileV7(state, at(dx, dy), {
      terrain: "GRASS",
      resource: null,
      improvement: null,
      road: false,
      site: null,
    });
  state = replaceTileV7(state, at(1, -1), { resource: "FERTILE_GROUND" });
  state = settled(build(state, { kind: "BUILD_FARM", at: at(1, -1) }));
  state = replaceTileV7(state, at(1, 1), { terrain: "FOREST" });
  state = settled(build(state, { kind: "BUILD_LUMBER_CAMP", at: at(1, 1) }));
  state = replaceTileV7(state, at(0, 1), {
    terrain: "MOUNTAIN",
    resource: "ORE",
  });
  state = settled(build(state, { kind: "BUILD_MINE", at: at(0, 1) }));
  state = replaceTileV7(state, at(1, 0), target);
  expect(tileAt(state, at(1, 0)).territoryCityId).toBe(city.id);
  return { state, at, target: at(1, 0) };
}

function offered(state: GameStateV7, command: CommandV7): boolean {
  const key = JSON.stringify(command);
  return queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)).some(
    (item) => JSON.stringify(item) === key,
  );
}

function withTechs(
  state: GameStateV7,
  edit: (
    techs: GameStateV7["players"][number]["researchedTechs"],
  ) => typeof techs,
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, researchedTechs: edit(player.researchedTechs) }
        : player,
    ),
  });
}

/**
 * Forestry, the technology of Clear Forest, taken away (with Sawmilling,
 * which needs it): the general buildings still researched are these.
 */
function withoutForestry(state: GameStateV7): GameStateV7 {
  return withTechs(state, (techs) =>
    techs.filter((tech) => tech !== "FORESTRY" && tech !== "SAWMILLING"),
  );
}
const WITHOUT_FORESTRY_KINDS: readonly SpatialEconomicCommandKindV7[] =
  SPATIAL_KINDS.filter((kind) => kind !== "BUILD_SAWMILL");

function withMonument(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            achievementEntitlements: player.achievementEntitlements.map(
              (item, index) =>
                index === 0 ? { ...item, unlocked: true, spent: false } : item,
            ),
          }
        : player,
    ),
  });
}

function monumentCommand(state: GameStateV7, at: CoordV7): CommandV7 {
  const player = state.players.find((item) => item.id === state.humanPlayerId);
  const achievement = player?.achievementEntitlements[0]?.achievement;
  if (achievement === undefined) throw new Error("no achievement");
  return { kind: "BUILD_MONUMENT", achievement, at };
}

function coins(state: GameStateV7): number {
  return (
    state.players.find((item) => item.id === state.humanPlayerId)?.coins ?? 0
  );
}

describe("building placement (pulp_wars-h0xx, 7r106)", () => {
  it("builds nothing but the Mine on a Mountain, even with Engineering", () => {
    const { state, target } = fixture({ terrain: "MOUNTAIN", resource: null });
    expect(
      state.players
        .find((item) => item.id === state.humanPlayerId)
        ?.researchedTechs.includes("ENGINEERING"),
    ).toBe(true);
    const monuments = withMonument(state);
    for (const command of [
      ...SPATIAL_KINDS.map((kind) => ({ kind, at: target }) as CommandV7),
      monumentCommand(monuments, target),
    ]) {
      const on = command.kind === "BUILD_MONUMENT" ? monuments : state;
      const result = applyCommandV7(on, on.humanPlayerId, command);
      expect(result.accepted, command.kind).toBe(false);
      if (!result.accepted)
        expect(result.error.code, command.kind).toBe("INVALID_TILE");
      expect(offered(on, command), command.kind).toBe(false);
    }
    // The same tile as Grass takes every one of them.
    const grass = replaceTileV7(monuments, target, { terrain: "GRASS" });
    for (const kind of SPATIAL_KINDS)
      expect(offered(grass, { kind, at: target }), kind).toBe(true);
    expect(offered(grass, monumentCommand(grass, target))).toBe(true);
    // The Mine still stands on its Ore Mountain and keeps the Ore.
    const ore = replaceTileV7(state, target, { resource: "ORE" });
    expect(offered(ore, { kind: "BUILD_MINE", at: target })).toBe(true);
    const mined = build(ore, { kind: "BUILD_MINE", at: target });
    expect(tileAt(mined, target)).toMatchObject({
      terrain: "MOUNTAIN",
      resource: "ORE",
      improvement: "MINE",
    });
  });

  it("lets Fruit and Fertile Ground block no building, which uses them up", () => {
    for (const resource of ["FRUIT", "FERTILE_GROUND"] as const) {
      const { state, target } = fixture({ terrain: "GRASS", resource });
      for (const kind of SPATIAL_KINDS) {
        const command = { kind, at: target } as CommandV7;
        expect(offered(state, command), `${kind} on ${resource}`).toBe(true);
        const preview = previewEconomicV7(
          viewForV7(state, state.humanPlayerId),
          command,
        );
        expect(preview.ok && preview.preview.resourceConsumed).toBe(resource);
        expect(preview.ok && preview.preview.clearsForest).toBe(false);
        const after = build(state, command);
        expect(tileAt(after, target), `${kind} on ${resource}`).toMatchObject({
          terrain: "GRASS",
          resource: null,
          improvement: SPATIAL_ECONOMIC_ACTIONS_V7[kind].improvement,
        });
        // Redevelop brings nothing back: the resource was used up.
        const cleared = applyCommandV7(settled(after), after.humanPlayerId, {
          kind: "REDEVELOP",
          at: target,
        });
        expect(cleared.accepted).toBe(true);
        if (cleared.accepted)
          expect(tileAt(cleared.state, target).resource).toBeNull();
      }
      const monuments = withMonument(state);
      const monument = build(monuments, monumentCommand(monuments, target));
      expect(tileAt(monument, target)).toMatchObject({
        resource: null,
        improvement: "MONUMENT",
      });
      expect(
        buildSiteNotesV7(viewForV7(state, state.humanPlayerId), {
          kind: "BUILD_MARKET",
          at: target,
        }),
      ).toEqual([buildUsesUpNoteV7(resource)]);
    }
  });

  it("keeps the harvest buildings as they were: a Farm keeps its Fertile Ground, a Fruit harvest takes the Fruit", () => {
    const { state, target } = fixture({
      terrain: "GRASS",
      resource: "FERTILE_GROUND",
    });
    const farmed = build(state, { kind: "BUILD_FARM", at: target });
    expect(tileAt(farmed, target)).toMatchObject({
      resource: "FERTILE_GROUND",
      improvement: "FARM",
    });
    const fruit = replaceTileV7(state, target, { resource: "FRUIT" });
    expect(offered(fruit, { kind: "BUILD_FARM", at: target })).toBe(false);
    const harvested = build(fruit, { kind: "HARVEST_FRUIT", at: target });
    expect(tileAt(harvested, target)).toMatchObject({
      resource: null,
      improvement: null,
    });
  });

  it("needs Forestry to build on a Forest, and the build clears it as Clear Forest does", () => {
    const { state, target } = fixture({ terrain: "FOREST", resource: null });
    const noForestry = withoutForestry(state);
    const noForestryMonument = withMonument(noForestry);
    for (const command of [
      ...WITHOUT_FORESTRY_KINDS.map(
        (kind) => ({ kind, at: target }) as CommandV7,
      ),
      monumentCommand(noForestryMonument, target),
    ]) {
      const on =
        command.kind === "BUILD_MONUMENT" ? noForestryMonument : noForestry;
      const result = applyCommandV7(on, on.humanPlayerId, command);
      expect(result.accepted, command.kind).toBe(false);
      if (!result.accepted) {
        expect(result.error.code, command.kind).toBe("TECH_REQUIRED");
        expect(result.error.params).toMatchObject({ tech: "FORESTRY" });
      }
      expect(offered(on, command), command.kind).toBe(false);
    }
    for (const kind of SPATIAL_KINDS) {
      const command = { kind, at: target } as CommandV7;
      expect(offered(state, command), kind).toBe(true);
      const preview = previewEconomicV7(
        viewForV7(state, state.humanPlayerId),
        command,
      );
      expect(preview.ok && preview.preview.clearsForest).toBe(true);
      expect(preview.ok && preview.preview.coinsReceived).toBe(
        CLEAR_FOREST_COINS_V7,
      );
      const result = applyCommandV7(state, state.humanPlayerId, command);
      if (!result.accepted) throw new Error(`${kind} refused`);
      expect(tileAt(result.state, target)).toMatchObject({
        terrain: "GRASS",
        resource: null,
        improvement: SPATIAL_ECONOMIC_ACTIONS_V7[kind].improvement,
      });
      expect(coins(result.state)).toBe(
        coins(state) -
          SPATIAL_ECONOMIC_ACTIONS_V7[kind].cost +
          CLEAR_FOREST_COINS_V7,
      );
      // The clearing is reported as Clear Forest reports it, before the build.
      const kinds = result.events.map((event) => event.kind);
      expect(kinds.indexOf("FOREST_CLEARED")).toBeGreaterThanOrEqual(0);
      expect(kinds.indexOf("FOREST_CLEARED")).toBeLessThan(
        kinds.indexOf("ECONOMIC_BUILDING_BUILT"),
      );
      expect(
        result.events.find((event) => event.kind === "FOREST_CLEARED"),
      ).toMatchObject({ at: target, coinDelta: CLEAR_FOREST_COINS_V7 });
    }
    // A Monument clears it too, and is paid the Coin.
    const monuments = withMonument(state);
    const monument = applyCommandV7(
      monuments,
      monuments.humanPlayerId,
      monumentCommand(monuments, target),
    );
    if (!monument.accepted) throw new Error("Monument refused");
    expect(tileAt(monument.state, target)).toMatchObject({
      terrain: "GRASS",
      improvement: "MONUMENT",
    });
    expect(coins(monument.state)).toBe(
      coins(monuments) + CLEAR_FOREST_COINS_V7,
    );
    expect(monument.events.map((event) => event.kind)).toContain(
      "FOREST_CLEARED",
    );
    // Game in the Forest is used up too.
    const game = replaceTileV7(state, target, { resource: "GAME" });
    const market = build(game, { kind: "BUILD_MARKET", at: target });
    expect(tileAt(market, target)).toMatchObject({
      terrain: "GRASS",
      resource: null,
      improvement: "MARKET",
    });
    expect(
      buildSiteNotesV7(viewForV7(game, game.humanPlayerId), {
        kind: "BUILD_MARKET",
        at: target,
      }),
    ).toEqual([BUILD_CLEARS_FOREST_NOTE_V7, buildUsesUpNoteV7("GAME")]);
  });

  it("keeps the Lumber Camp on its Forest with no clearing; Game no longer blocks it", () => {
    const { state, target } = fixture({ terrain: "FOREST", resource: "GAME" });
    expect(offered(state, { kind: "BUILD_LUMBER_CAMP", at: target })).toBe(
      true,
    );
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "BUILD_LUMBER_CAMP",
      at: target,
    });
    if (!result.accepted) throw new Error("Lumber Camp refused");
    expect(tileAt(result.state, target)).toMatchObject({
      terrain: "FOREST",
      resource: null,
      improvement: "LUMBER_CAMP",
    });
    expect(result.events.map((event) => event.kind)).not.toContain(
      "FOREST_CLEARED",
    );
    expect(
      buildSiteNotesV7(viewForV7(state, state.humanPlayerId), {
        kind: "BUILD_LUMBER_CAMP",
        at: target,
      }),
    ).toEqual([buildUsesUpNoteV7("GAME")]);
  });

  it("gives the Normal AI the same candidates, and it prefers a bare tile to one whose resource a build uses up", () => {
    const aiCandidates = (state: GameStateV7): readonly string[] =>
      queryAiReadyCommandsV7(viewForV7(state, state.humanPlayerId)).map(
        (item) => JSON.stringify(item.command),
      );
    const mountain = fixture({ terrain: "MOUNTAIN", resource: null });
    const forest = fixture({ terrain: "FOREST", resource: null });
    const noForestry = withoutForestry(forest.state);
    for (const kind of SPATIAL_KINDS) {
      const key = (target: CoordV7) => JSON.stringify({ kind, at: target });
      expect(aiCandidates(mountain.state)).not.toContain(key(mountain.target));
      if (WITHOUT_FORESTRY_KINDS.includes(kind))
        expect(aiCandidates(noForestry)).not.toContain(key(forest.target));
      expect(aiCandidates(forest.state)).toContain(key(forest.target));
    }
    const bare = fixture({ terrain: "GRASS", resource: null });
    const fruit = replaceTileV7(bare.state, bare.target, { resource: "FRUIT" });
    const fertile = replaceTileV7(bare.state, bare.target, {
      resource: "FERTILE_GROUND",
    });
    const windmill: CommandV7 = { kind: "BUILD_WINDMILL", at: bare.target };
    expect(aiCandidates(fruit)).toContain(JSON.stringify(windmill));
    const score = (state: GameStateV7) =>
      scoreCommandV7(viewForV7(state, state.humanPlayerId), windmill)
        .immediateValue;
    expect(score(bare.state) - score(fruit)).toBe(5);
    expect(score(bare.state) - score(fertile)).toBe(10);
    // A build that clears a Forest counts Clear Forest's Coin.
    expect(
      scoreCommandV7(viewForV7(forest.state, forest.state.humanPlayerId), {
        kind: "BUILD_WINDMILL",
        at: forest.target,
      }).immediateValue - score(bare.state),
    ).toBe(1);
  });
});

/**
 * The correction pass (`pulp_wars-h0xx`): Fish and Pearls on an Ice Folk
 * seat's own ice follow the land rule. On the authored strait of the frozen
 * sea fixture, seat 0 (the Ice Folk) holds the ice at (4, 3) and (5, 3) of
 * its capital on (5, 2).
 */
describe("building placement on Ice Folk ice (pulp_wars-h0xx, 7r106)", () => {
  const WEST = { x: 4, y: 3 };
  const MIDDLE = { x: 5, y: 3 };
  const scene = (middle: "." | "s" | "p"): GameStateV7 =>
    frozenArenaV7({
      ports: [false, true],
      technologies: [
        ["SHORECRAFT", "GATHERING", "FARMING", "MILLING"],
        ["SHORECRAFT"],
      ],
      units: [],
      ice: [{ at: WEST }, { at: MIDDLE }],
      resources: Array.from({ length: 11 }, (_, y) =>
        y === 3 ? `.....${middle}.....` : "...........",
      ),
    });
  const withHole = (state: GameStateV7): GameStateV7 =>
    acceptV7(state, 0, { kind: "BUILD_FISHING_HOLE", at: WEST }).state;
  const windmill: CommandV7 = { kind: "BUILD_WINDMILL", at: MIDDLE };
  const view = (state: GameStateV7) => viewForV7(state, seatV7(state, 0).id);

  it("lets Fish and Pearls block no building on the ice, which uses them up", () => {
    for (const [mark, resource] of [
      ["s", "FISH"],
      ["p", "PEARLS"],
    ] as const) {
      const state = withHole(scene(mark));
      expect(tileAt(state, MIDDLE).resource).toBe(resource);
      expect(offered(state, windmill), resource).toBe(true);
      const preview = previewEconomicV7(view(state), windmill);
      expect(preview.ok && preview.preview.resourceConsumed).toBe(resource);
      expect(buildSiteNotesV7(view(state), windmill)).toEqual([
        buildUsesUpNoteV7(resource),
      ]);
      const after = acceptV7(state, 0, windmill).state;
      expect(tileAt(after, MIDDLE)).toMatchObject({
        improvement: "WINDMILL",
        resource: null,
      });
      // A Fishing Hole on it uses it up too.
      const hole = acceptV7(scene(mark), 0, {
        kind: "BUILD_FISHING_HOLE",
        at: MIDDLE,
      }).state;
      expect(tileAt(hole, MIDDLE)).toMatchObject({
        improvement: "FISHING_HOLE",
        resource: null,
      });
    }
  });

  it("weighs the Fish and the Pearls a build on the ice gives up", () => {
    const score = (mark: "." | "s" | "p") => {
      const state = withHole(scene(mark));
      return scoreCommandV7(view(state), windmill).immediateValue;
    };
    // A Fish harvest's 1 population; the Pearls' 10 Coins as 2.
    expect(score(".") - score("s")).toBe(5);
    expect(score(".") - score("p")).toBe(10);
  });
});

describe("the technology cards of building placement (pulp_wars-h0xx, 7r106)", () => {
  it("says under every faction's Clear Forest that a building may clear a Forest", () => {
    for (const faction of FACTION_IDS_V7) {
      const node = factionTreeV7(faction).nodes.find(
        (item) => item.id === "FORESTRY",
      );
      if (node === undefined) throw new Error(`${faction}: no Forestry`);
      const lines = technologyEffectGroupsV7(node.unlocks, faction).flatMap(
        (group) => group.items,
      );
      const clear = lines.indexOf(FOREST_BUILDING_UNLOCK_TEXT_V7);
      expect(clear, faction).toBeGreaterThan(0);
      expect(lines[clear - 1], faction).toMatch(/^Clear forest/);
    }
    // No other card speaks of building on a Mountain.
    for (const faction of FACTION_IDS_V7)
      for (const node of factionTreeV7(faction).nodes)
        for (const line of technologyEffectGroupsV7(
          node.unlocks,
          faction,
        ).flatMap((group) => group.items))
          expect(line, `${faction} ${node.id}`).not.toMatch(
            /build[^.]*mountain|mountain[^.]*build/i,
          );
  });
});
