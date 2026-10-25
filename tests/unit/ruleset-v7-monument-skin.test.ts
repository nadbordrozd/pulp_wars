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

  it("is published, achievement and builder, to every viewer (pulp_wars-d8xm)", () => {
    const { state, at, captorId, builderId } = capture(build(match("UNDEAD")));
    const published = {
      kind: "MONUMENT",
      achievement: ACHIEVEMENT,
      at,
      builderFaction: "UNDEAD",
    };
    // The captor owns it now; the builder lost it: both see the same.
    expect(viewSource(viewForV7(state, captorId), at)).toEqual(published);
    expect(viewSource(viewForV7(state, builderId), at)).toEqual(published);
  });

  it("draws a captured Undead Monument in the same Undead look for both seats, before and after", () => {
    const built = build(match("UNDEAD"));
    const look = {
      board: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
      dock: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
    };
    expect(subjects(viewForV7(built.state, built.builderId), built.at)).toEqual(
      look,
    );
    expect(subjects(viewForV7(built.state, built.captorId), built.at)).toEqual(
      look,
    );
    const { state, at, captorId, builderId } = capture(built);
    // The Human captor owns Human territory around an Undead Monument.
    expect(subjects(viewForV7(state, captorId), at)).toEqual(look);
    expect(subjects(viewForV7(state, builderId), at)).toEqual(look);
  });

  it("keeps the builder's look while the city's other buildings take the captor's", () => {
    const built = build(match("UNDEAD"));
    const forgeAt = required(
      built.state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === built.cityId &&
          tile.site === null &&
          tile.improvement === null &&
          !same(tile.at, built.at),
      ),
      "a second building tile",
    ).at;
    // A Forge beside the Monument, as the board reads it (only the view
    // decides the look).
    const withForge = (view: PlayerViewV7): PlayerViewV7 => ({
      ...view,
      board: {
        ...view.board,
        tiles: view.board.tiles.map((tile) =>
          tile.explored && same(tile.at, forgeAt)
            ? { ...tile, improvement: "FORGE" }
            : tile,
        ),
      },
    });
    const forgeSubject = (view: PlayerViewV7) =>
      buildBoardRenderPlanV7(view, [], {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      }).entries.find(
        (entry) => entry.kind === "IMPROVEMENT" && same(entry.at, forgeAt),
      )?.artSubject;
    const before = withForge(viewForV7(built.state, built.builderId));
    expect(forgeSubject(before)).toBe("IMPROVEMENT:UNDEAD:FORGE");
    expect(subjects(before, built.at).board).toBe(
      "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
    );
    const { state, at, captorId, builderId } = capture(built);
    for (const viewer of [captorId, builderId]) {
      const after = withForge(viewForV7(state, viewer));
      // The Forge re-skins to the Human captor; the Monument does not.
      expect(forgeSubject(after), String(viewer)).toBe("IMPROVEMENT:FORGE");
      expect(subjects(after, at).board, String(viewer)).toBe(
        "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
      );
    }
  });

  it("keeps a captured Human Monument Human inside Undead borders", () => {
    const { state, at, captorId, builderId } = capture(
      build(match("ORIGINAL")),
    );
    expect(
      state.players.find((player) => player.id === captorId)?.faction,
    ).toBe("UNDEAD");
    for (const viewer of [captorId, builderId])
      expect(subjects(viewForV7(state, viewer), at)).toEqual({
        board: "IMPROVEMENT:MONUMENT:SLAYER",
        dock: "IMPROVEMENT:MONUMENT:SLAYER",
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
      // The captor's territory, the builder's look, for both seats.
      expect(subjects(viewForV7(state, captorId), at), captor).toEqual({
        board: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
        dock: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
      });
      expect(subjects(viewForV7(state, builderId), at).board, captor).toBe(
        "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
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

  it("reads a stored Monument without a builder as its owner's, or a seat that spent it (pulp_wars-d8xm)", () => {
    const strip = (state: GameStateV7) =>
      parseGameStateV7(
        JSON.parse(
          JSON.stringify(state, (key, value: unknown) =>
            key === "builderFaction" ? undefined : value,
          ),
        ),
      );
    // Not captured: the current owner built it.
    const built = build(match("UNDEAD"));
    const own = strip(built.state);
    if (own === null) throw new Error("stored state rejected");
    expect(own).toEqual(built.state);
    // Captured: the Human captor never spent the Slayer, so the seat that
    // did (the Undead) is read as the builder; the state stays valid.
    const captured = capture(built);
    const taken = strip(captured.state);
    if (taken === null) throw new Error("stored captured state rejected");
    expect(monumentSource(taken, captured.at)).toEqual({
      kind: "MONUMENT",
      achievement: ACHIEVEMENT,
      at: captured.at,
      builderFaction: "UNDEAD",
    });
    expect(taken).toEqual(captured.state);
    // The migration is deterministic: the canonical state round-trips.
    expect(parseGameStateV7(JSON.parse(JSON.stringify(taken)))).toEqual(taken);
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
