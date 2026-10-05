import {
  RULESET_7_ID,
  createPlayableGameV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type TerrainIdV7,
  type UnitStateV7,
} from "../src/engine/index";

/**
 * The busy renderer-stress fixture of
 * `scripts/benchmark-board-presentation-v7.ts` (`pulp_wars-9s0.11`).
 *
 * It starts from a real engine match (seed 20, 25 x 25, Human against
 * Undead), derives a state with every cell explored Grass and 60 ready Human
 * Fighters, checks that state with the strict state parser, and projects the
 * Human view and offered commands through the engine's public projection.
 * The browser never receives a hand-built view, so the fixture follows the
 * public view shape as it changes.
 */
export const BOARD_PRESENTATION_BUSY_SETUP_V7: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 20,
  width: 25,
  height: 25,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "UNDEAD"],
  mapType: "DRY_LAND",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  curiosities: false,
};

export const BOARD_PRESENTATION_BUSY_UNITS_V7 = 60;

export interface BoardPresentationFixtureV7 {
  readonly state: GameStateV7;
  readonly view: PlayerViewV7;
  readonly offeredCommands: readonly CommandV7[];
}

/** Grass everywhere: the busy pointer and idle-animation fixture. */
export const allGrassV7 = (): TerrainIdV7 => "GRASS";

/** The direct-draw fixture: Grass broken by a regular Forest/Mountain mix. */
export function mixedTerrainV7(at: CoordV7): TerrainIdV7 {
  if (at.x % 7 === 2 && at.y % 4 === 1) return "MOUNTAIN";
  if (at.x % 5 === 0 && at.y % 3 === 0) return "FOREST";
  return "GRASS";
}

export function buildBoardPresentationFixtureV7(
  terrainAt: (at: CoordV7) => TerrainIdV7 = allGrassV7,
): BoardPresentationFixtureV7 {
  const created = createPlayableGameV7(BOARD_PRESENTATION_BUSY_SETUP_V7);
  if (!created.ok)
    throw new Error(`Busy fixture setup rejected: ${created.error.code}`);
  const base = created.state;
  const human = base.humanPlayerId;
  if (base.turnOrder[base.activeSeatIndex] !== human)
    throw new Error("Busy fixture: the Human seat is not active");
  const capital = base.cities.find(
    (city) => city.ownerId === human && city.isCapital,
  );
  const template = base.units.find((unit) => unit.ownerId === human);
  if (capital === undefined || template === undefined)
    throw new Error("Busy fixture: no Human capital or starting unit");
  const capitalTile = base.board.tiles.find(
    (tile) => tile.at.x === capital.at.x && tile.at.y === capital.at.y,
  );
  const biome = capitalTile?.biome ?? null;
  const board = {
    ...base.board,
    tiles: base.board.tiles.map((tile) =>
      tile.site === null
        ? {
            ...tile,
            biome,
            terrain: terrainAt(tile.at),
            resource: null,
            improvement: null,
            road: false,
          }
        : tile,
    ),
  };
  // A unit may not stand on a treasure chest or in a foreign city.
  const occupied = new Set(
    [
      ...base.treasureChests,
      ...base.cities
        .filter((city) => city.ownerId !== human)
        .map((city) => city.at),
    ].map((at) => `${at.x},${at.y}`),
  );
  const units: UnitStateV7[] = [];
  for (let n = 0; n < BOARD_PRESENTATION_BUSY_UNITS_V7; n += 1) {
    let at =
      n === 0
        ? capital.at
        : { x: 2 + (n % 10) * 2, y: 2 + Math.floor(n / 10) * 2 };
    while (occupied.has(`${at.x},${at.y}`)) at = { x: at.x, y: at.y + 1 };
    occupied.add(`${at.x},${at.y}`);
    units.push({
      ...template,
      id: unitId(base.nextEntityId + n),
      homeCityId: capital.id,
      at,
    });
  }
  const explored = board.tiles.map((tile) => tile.at);
  const derived = parseGameStateV7(
    JSON.parse(
      JSON.stringify({
        ...base,
        nextEntityId: base.nextEntityId + BOARD_PRESENTATION_BUSY_UNITS_V7,
        board,
        players: base.players.map((player) =>
          player.id === human ? { ...player, explored } : player,
        ),
        units,
      }),
    ),
  );
  if (derived === null)
    throw new Error("Busy fixture: the derived state fails the state parser");
  const view = viewForV7(derived, human);
  return {
    state: derived,
    view,
    offeredCommands: queryPlayerCommandsV7(view),
  };
}

/** Human units with an offered Move: the probe's ready-unit count. */
export function readyUnitCountV7(
  fixture: Pick<BoardPresentationFixtureV7, "view" | "offeredCommands">,
): number {
  const { view, offeredCommands } = fixture;
  return view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      !unit.activation.handled &&
      offeredCommands.some(
        (command) => command.kind === "MOVE" && command.unitId === unit.id,
      ),
  ).length;
}
