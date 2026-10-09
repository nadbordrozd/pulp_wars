import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  viewForV7,
  type AchievementIdV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { monumentArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import {
  commandSubjectV7,
  tileImprovementSubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { browserSetupV7, checkedV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-eu3r.3 (the user, 2026-10-08): unlike every other
 * building, a Monument keeps its builder's faction look when another
 * faction captures its city, so each Monument and look appears at most
 * once on the map. Small hand-built states of a Human and Undead match: one
 * seat builds, the other captures the city.
 */

const ACHIEVEMENT: AchievementIdV7 = "SLAYER";

interface Staged {
  readonly state: GameStateV7;
  readonly at: CoordV7;
  readonly builderId: GameStateV7["players"][number]["id"];
  readonly captorId: GameStateV7["players"][number]["id"];
  readonly cityId: GameStateV7["cities"][number]["id"];
}

/**
 * A two-seat match of `factions` (Human and Undead by default) where
 * `builder` has the Slayer to spend.
 */
function match(
  builder: FactionIdV7,
  factions: readonly [FactionIdV7, FactionIdV7] = ["ORIGINAL", "UNDEAD"],
): Staged {
  const created = createPlayableGameV7({
    ...browserSetupV7(72),
    factions: [...factions],
  });
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const builderSeat = required(
    base.players.find((player) => player.faction === builder),
    "builder seat",
  );
  const captor = required(
    base.players.find((player) => player.faction !== builder),
    "captor seat",
  );
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === builderSeat.id),
    "builder city",
  );
  const at = required(
    base.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null &&
        tile.biome !== null &&
        tile.terrain === "GRASS" &&
        !base.treasureChests.some((chest) => same(chest, tile.at)),
    ),
    "empty Grass tile",
  ).at;
  const everywhere = base.board.tiles.map((tile) => tile.at);
  const state = checkedV7({
    ...base,
    activeSeatIndex: base.turnOrder.indexOf(builderSeat.id),
    treasureChests: [],
    players: base.players.map((player) => ({
      ...player,
      explored: everywhere,
      achievementEntitlements: player.achievementEntitlements.map((item) =>
        player.id === builderSeat.id && item.achievement === ACHIEVEMENT
          ? { ...item, unlocked: true }
          : item,
      ),
    })),
  });
  return {
    state,
    at,
    builderId: builderSeat.id,
    captorId: captor.id,
    cityId: city.id,
  };
}

/** The builder's `BUILD_MONUMENT` of the Slayer. */
function build(staged: Staged): Staged {
  const built = applyCommandV7(staged.state, staged.builderId, {
    kind: "BUILD_MONUMENT",
    achievement: ACHIEVEMENT,
    at: staged.at,
  });
  if (!built.accepted) throw new Error(built.error.code);
  // The +3 levels the city up: take the first reward, so the turn can pass.
  let state = built.state;
  for (let guard = 0; state.pendingChoices.length > 0; guard += 1) {
    const choice = required(state.pendingChoices[0], "choice");
    if (guard > 4) throw new Error("reward guard exhausted");
    const chosen = applyCommandV7(state, staged.builderId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: choice.cityId,
      reachedLevel: choice.reachedLevel,
      reward: required(choice.candidates[0], "candidate"),
    });
    if (!chosen.accepted) throw new Error(chosen.error.code);
    state = chosen.state;
  }
  return { ...staged, state };
}

/**
 * The other seat's unit takes the Monument's city; `as` makes it another
 * land unit first (any unit captures, `7r64`).
 */
function capture(
  staged: Staged,
  as?: Pick<UnitStateV7, "role" | "variant">,
): Staged {
  const { state } = staged;
  const city = required(
    state.cities.find((candidate) => candidate.id === staged.cityId),
    "city",
  );
  const attacker = required(
    state.units.find((unit) => unit.ownerId === staged.captorId),
    "captor unit",
  );
  const away = required(
    state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        (tile.terrain === "GRASS" || tile.terrain === "FOREST") &&
        !same(tile.at, staged.at) &&
        !state.units.some((unit) => same(unit.at, tile.at)),
    ),
    "a tile to step aside to",
  ).at;
  const ready = checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(staged.captorId),
    units: state.units.map((unit): UnitStateV7 =>
      unit.id === attacker.id
        ? {
            ...unit,
            ...(as === undefined ? {} : asUnit(state, unit, as)),
            at: city.at,
            captureEligible: true,
            activation: {
              ...unit.activation,
              moved: false,
              movedPathLength: 0,
              attacked: false,
              attacksUsed: 0,
              captured: false,
              handled: false,
            },
          }
        : unit.ownerId !== staged.captorId && same(unit.at, city.at)
          ? { ...unit, at: away }
          : unit,
    ),
  });
  const captured = applyCommandV7(ready, staged.captorId, {
    kind: "CAPTURE",
    unitId: attacker.id,
  });
  if (!captured.accepted) throw new Error(captured.error.code);
  return { ...staged, state: captured.state };
}

/** `unit` remade as another role (and variant) of its owner's faction. */
function asUnit(
  state: GameStateV7,
  unit: UnitStateV7,
  as: Pick<UnitStateV7, "role" | "variant">,
): Pick<UnitStateV7, "role" | "variant" | "hp" | "maxHp"> {
  const faction = required(
    state.players.find((player) => player.id === unit.ownerId),
    "owner",
  ).faction;
  const { maxHp } = effectiveRoleRuleV7(as.role, faction);
  return {
    role: as.role,
    hp: maxHp,
    maxHp,
    ...(as.variant === undefined ? {} : { variant: as.variant }),
  };
}

function monumentSource(state: GameStateV7, at: CoordV7) {
  return state.populationContributions.find(
    (item) => item.source.kind === "MONUMENT" && same(item.source.at, at),
  )?.source;
}

function viewSource(view: PlayerViewV7, at: CoordV7) {
  return view.populationContributions.find(
    (item) => item.source.kind === "MONUMENT" && same(item.source.at, at),
  )?.source;
}

/** What the board draws on `at`, and what the dock asks for. */
function subjects(view: PlayerViewV7, at: CoordV7) {
  const tile = required(
    view.board.tiles.find((candidate) => same(candidate.at, at)),
    "tile",
  );
  const owner = view.players.find(
    (player) => tile.explored && player.id === tile.territoryOwnerId,
  );
  return {
    board: buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.find(
      (entry) => entry.kind === "IMPROVEMENT" && same(entry.at, at),
    )?.artSubject,
    // The territory owner's faction is passed and ignored for a Monument.
    dock: tileImprovementSubjectV7(view, at, "MONUMENT", owner?.faction),
  };
}

describe("a Monument's builder (pulp_wars-eu3r.3)", () => {
  it("is recorded from the builder's faction when BUILD_MONUMENT is applied", () => {
    for (const faction of ["UNDEAD", "ORIGINAL"] as const) {
      const { state, at } = build(match(faction));
      expect(monumentSource(state, at), faction).toEqual({
        kind: "MONUMENT",
        achievement: ACHIEVEMENT,
        at,
        builderFaction: faction,
      });
      // The canonical state round-trips with it.
      expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(
        state,
      );
    }
  });

  it("survives a capture: the captor's city keeps the builder's faction", () => {
    const built = build(match("UNDEAD"));
    const { state, at, cityId, captorId } = capture(built);
    expect(state.cities.find((city) => city.id === cityId)?.ownerId).toBe(
      captorId,
    );
    expect(
      state.players.find((player) => player.id === captorId)?.faction,
    ).toBe("ORIGINAL");
    expect(monumentSource(state, at)).toEqual(monumentSource(built.state, at));
    expect(monumentSource(state, at)).toMatchObject({
      builderFaction: "UNDEAD",
    });
  });

  it("is published to every viewer; the achievement stays the owner's", () => {
    const { state, at, captorId, builderId } = capture(build(match("UNDEAD")));
    // The captor owns it now: FULL, with the achievement.
    expect(viewSource(viewForV7(state, captorId), at)).toEqual({
      kind: "MONUMENT",
      visibility: "FULL",
      achievement: ACHIEVEMENT,
      at,
      builderFaction: "UNDEAD",
    });
    // The builder lost it: the building and its builder only.
    expect(viewSource(viewForV7(state, builderId), at)).toEqual({
      kind: "MONUMENT",
      visibility: "BUILDING_ONLY",
      at,
      builderFaction: "UNDEAD",
    });
  });

  it("draws a captured Undead Monument in the Undead look for both seats", () => {
    const built = build(match("UNDEAD"));
    // Before the capture: the builder sees its achievement, the other seat
    // the Undead obelisk.
    expect(subjects(viewForV7(built.state, built.builderId), built.at)).toEqual(
      {
        board: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
        dock: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
      },
    );
    expect(subjects(viewForV7(built.state, built.captorId), built.at)).toEqual({
      board: "IMPROVEMENT:MONUMENT:UNDEAD",
      dock: "IMPROVEMENT:MONUMENT:UNDEAD",
    });
    const { state, at, captorId, builderId } = capture(built);
    // The Human captor owns Human territory around an Undead Monument.
    expect(subjects(viewForV7(state, captorId), at)).toEqual({
      board: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
      dock: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
    });
    expect(subjects(viewForV7(state, builderId), at)).toEqual({
      board: "IMPROVEMENT:MONUMENT:UNDEAD",
      dock: "IMPROVEMENT:MONUMENT:UNDEAD",
    });
  });

  it("keeps a captured Human Monument Human inside Undead borders", () => {
    const { state, at, captorId, builderId } = capture(
      build(match("ORIGINAL")),
    );
    expect(
      state.players.find((player) => player.id === captorId)?.faction,
    ).toBe("UNDEAD");
    expect(subjects(viewForV7(state, captorId), at)).toEqual({
      board: "IMPROVEMENT:MONUMENT:SLAYER",
      dock: "IMPROVEMENT:MONUMENT:SLAYER",
    });
    expect(subjects(viewForV7(state, builderId), at)).toEqual({
      board: "IMPROVEMENT:MONUMENT",
      dock: "IMPROVEMENT:MONUMENT",
    });
  });

  it("survives a capture by any unit: a Martian Saucer, a Gingerbread Man", () => {
    // Any unit captures (`7r64`): a flyer and a Break Off piece take the
    // city through the same CAPTURE, and the Undead look stays.
    const flown = build(match("UNDEAD", ["MARTIAN", "UNDEAD"]));
    const saucer = capture(flown, { role: "RAIDER" });
    const candy = build(match("UNDEAD", ["CANDY", "UNDEAD"]));
    const gingerbread = capture(candy, {
      role: "FIGHTER",
      variant: "GINGERBREAD_MAN",
    });
    for (const [captor, staged] of [
      ["MARTIAN", saucer],
      ["CANDY", gingerbread],
    ] as const) {
      const { state, at, cityId, captorId, builderId } = staged;
      expect(
        state.cities.find((city) => city.id === cityId)?.ownerId,
        captor,
      ).toBe(captorId);
      expect(monumentSource(state, at), captor).toMatchObject({
        builderFaction: "UNDEAD",
      });
      // The captor's territory, the builder's look.
      expect(subjects(viewForV7(state, captorId), at), captor).toEqual({
        board: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
        dock: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
      });
      expect(subjects(viewForV7(state, builderId), at).board, captor).toBe(
        "IMPROVEMENT:MONUMENT:UNDEAD",
      );
    }
    expect(
      saucer.state.units.find(
        (unit) => unit.ownerId === saucer.captorId && unit.role === "RAIDER",
      ),
    ).toBeDefined();
    expect(
      gingerbread.state.units.find(
        (unit) => unit.variant === "GINGERBREAD_MAN",
      ),
    ).toBeDefined();
  });

  it("falls back to the achievement's shared look in a state without it", () => {
    const { state, at, captorId, builderId } = capture(build(match("UNDEAD")));
    // A state written before the field: the Monument has no builder.
    const legacy = parseGameStateV7(
      JSON.parse(
        JSON.stringify(state, (key, value: unknown) =>
          key === "builderFaction" ? undefined : value,
        ),
      ),
    );
    if (legacy === null) throw new Error("legacy state rejected");
    expect(monumentSource(legacy, at)).toEqual({
      kind: "MONUMENT",
      achievement: ACHIEVEMENT,
      at,
    });
    expect(viewSource(viewForV7(legacy, builderId), at)).toEqual({
      kind: "MONUMENT",
      visibility: "BUILDING_ONLY",
      at,
    });
    expect(subjects(viewForV7(legacy, captorId), at)).toEqual({
      board: "IMPROVEMENT:MONUMENT:SLAYER",
      dock: "IMPROVEMENT:MONUMENT:SLAYER",
    });
    expect(subjects(viewForV7(legacy, builderId), at).board).toBe(
      "IMPROVEMENT:MONUMENT",
    );
  });

  it("rejects a builder that is no faction, or no seat that spent the achievement", () => {
    const { state, at } = build(match("UNDEAD"));
    const withBuilder = (builderFaction: unknown) =>
      parseGameStateV7({
        ...JSON.parse(JSON.stringify(state)),
        populationContributions: state.populationContributions.map((item) =>
          item.source.kind === "MONUMENT" && same(item.source.at, at)
            ? { ...item, source: { ...item.source, builderFaction } }
            : item,
        ),
      });
    expect(withBuilder("UNDEAD")).not.toBeNull();
    for (const faction of ["ELVES", null, "GOBLIN", "ORIGINAL"])
      expect(withBuilder(faction), String(faction)).toBeNull();
  });
});

describe("the Monument art subject (pulp_wars-eu3r.3)", () => {
  it("names the builder's faction look, or the Human one", () => {
    expect(monumentArtSubjectV7("EXPLORER", "DWARF")).toBe(
      "IMPROVEMENT:MONUMENT:DWARF:EXPLORER",
    );
    expect(monumentArtSubjectV7(null, "CANDY")).toBe(
      "IMPROVEMENT:MONUMENT:CANDY",
    );
    expect(monumentArtSubjectV7("EXPLORER", "ORIGINAL")).toBe(
      "IMPROVEMENT:MONUMENT:EXPLORER",
    );
    expect(monumentArtSubjectV7(null, "ORIGINAL")).toBe("IMPROVEMENT:MONUMENT");
    expect(monumentArtSubjectV7("EXPLORER")).toBe(
      "IMPROVEMENT:MONUMENT:EXPLORER",
    );
    expect(monumentArtSubjectV7(undefined, undefined)).toBe(
      "IMPROVEMENT:MONUMENT",
    );
  });

  it("shows the viewer's own faction's Monument on the build button", () => {
    const command = {
      kind: "BUILD_MONUMENT",
      achievement: "MUSTER",
      at: { x: 1, y: 1 },
    } as const;
    expect(commandSubjectV7(command, "GOBLIN")).toBe(
      "IMPROVEMENT:MONUMENT:GOBLIN:MUSTER",
    );
    expect(commandSubjectV7(command, "ORIGINAL")).toBe(
      "IMPROVEMENT:MONUMENT:MUSTER",
    );
  });
});

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
