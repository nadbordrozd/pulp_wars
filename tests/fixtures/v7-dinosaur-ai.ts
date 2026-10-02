import {
  chooseNormalCommandV7,
  scoreCommandV7,
  type AiScoreV7,
  type ScoredAiCandidateV7,
} from "../../src/ai/v7";
import {
  TECHNOLOGY_IDS_V7,
  factionTreeV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type PublicUnitV7,
  type TechnologyIdV7,
  type TileStateV7,
  type UnitId,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { withEggsV7, type EggPieceV7 } from "./v7-dinosaur-arena";
import {
  goblinArenaV7,
  sameV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "./v7-goblin-arena";

/**
 * Normal AI fixtures for the revision-19 Dinosaur policy
 * (`pulp_wars-c87.5`). Two-seat field: seat 0 (the viewer) capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8). Every other land tile is open
 * Grass with no resource, improvement, Road, Field Defense, or chest, so
 * every straight line is an open Stampede lane unless a test closes it.
 */
export interface DinosaurFieldOptionsV7 extends GoblinArenaOptionsV7 {
  readonly eggs?: readonly EggPieceV7[];
}

export function dinosaurFieldV7(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  options: DinosaurFieldOptionsV7 = {},
): GameStateV7 {
  const arena = goblinArenaV7(factions, pieces, options);
  const open = checkedV7({
    ...arena,
    treasureChests: [],
    players: arena.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.achievement === "EXPLORER" &&
        player.researchedTechs.includes("SCOUTING")
          ? { ...entry, unlocked: true }
          : entry,
      ),
    })),
    board: {
      ...arena.board,
      tiles: arena.board.tiles.map((tile) =>
        tile.site === null
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
  return options.eggs === undefined ? open : withEggsV7(open, options.eggs);
}

export function patchTileV7(
  state: GameStateV7,
  at: CoordV7,
  patch: Partial<TileStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        sameV7(tile.at, at) ? { ...tile, ...patch } : tile,
      ),
    },
  });
}

export const forestTileV7 = (state: GameStateV7, at: CoordV7): GameStateV7 =>
  patchTileV7(state, at, { terrain: "FOREST", biome: "WOODLAND" });

export const mountainTileV7 = (state: GameStateV7, at: CoordV7): GameStateV7 =>
  patchTileV7(state, at, { terrain: "MOUNTAIN", biome: "HIGHLANDS" });

/** Every Dinosaur technology except `excluded` and what depends on them. */
export function dinosaurTechsWithoutV7(
  ...excluded: TechnologyIdV7[]
): readonly TechnologyIdV7[] {
  const removed = new Set<TechnologyIdV7>(excluded);
  const nodes = factionTreeV7("DINOSAUR").nodes;
  for (let changed = true; changed;) {
    changed = false;
    for (const node of nodes)
      if (
        !removed.has(node.id) &&
        node.prerequisites.some((tech) => removed.has(tech))
      ) {
        removed.add(node.id);
        changed = true;
      }
  }
  return TECHNOLOGY_IDS_V7.filter((tech) => !removed.has(tech));
}

/** The viewer's (seat 0's) public view. */
export const viewerViewV7 = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

export const unitIdAtV7 = (state: GameStateV7, at: CoordV7): UnitId =>
  unitAtV7(state, at).id;

/** The public unit on `at` in the viewer's view. */
export function publicUnitAtV7(state: GameStateV7, at: CoordV7): PublicUnitV7 {
  const unit = viewerViewV7(state).units.find((candidate) =>
    sameV7(candidate.at, at),
  );
  if (unit === undefined) throw new Error(`no visible unit at ${at.x},${at.y}`);
  return unit;
}

/** Every scored candidate of the viewer's decision, best first. */
export const candidatesV7 = (
  state: GameStateV7,
): readonly ScoredAiCandidateV7[] =>
  chooseNormalCommandV7(viewerViewV7(state)).candidates;

/** The candidates whose acting unit stands on `at`. */
export function unitCandidatesV7(
  state: GameStateV7,
  at: CoordV7,
  kind?: CommandV7["kind"],
): readonly ScoredAiCandidateV7[] {
  const id = unitIdAtV7(state, at);
  return candidatesV7(state).filter(
    (candidate) =>
      "unitId" in candidate.command &&
      candidate.command.unitId === id &&
      (kind === undefined || candidate.command.kind === kind),
  );
}

/** The best Move candidate of the unit on `from` that ends on `to`. */
export function moveCandidateV7(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): ScoredAiCandidateV7 | undefined {
  return unitCandidatesV7(state, from, "MOVE").find((candidate) => {
    const end =
      candidate.command.kind === "MOVE"
        ? candidate.command.path.at(-1)
        : undefined;
    return end !== undefined && sameV7(end, to);
  });
}

/** The city-action candidates (training, laying, abandoning an Egg). */
export function productionCandidatesV7(
  state: GameStateV7,
): readonly CommandV7[] {
  return candidatesV7(state)
    .map((candidate) => candidate.command)
    .filter(
      (command) =>
        command.kind === "TRAIN" ||
        command.kind === "LAY_EGG" ||
        command.kind === "DISBAND",
    );
}

export const attackV7 = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): Extract<CommandV7, { kind: "ATTACK" }> => ({
  kind: "ATTACK",
  unitId: unitIdAtV7(state, from),
  targetUnitId: unitIdAtV7(state, to),
});

export const stampedeV7 = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): Extract<CommandV7, { kind: "STAMPEDE" }> => ({
  kind: "STAMPEDE",
  unitId: unitIdAtV7(state, from),
  targetUnitId: unitIdAtV7(state, to),
});

/** The policy score of `command` in the viewer's view. */
export const scoreV7 = (state: GameStateV7, command: CommandV7): AiScoreV7 =>
  scoreCommandV7(viewerViewV7(state), command);

/** Whether `command` is a candidate of the viewer's decision. */
export const isCandidateV7 = (
  state: GameStateV7,
  command: CommandV7,
): boolean =>
  candidatesV7(state).some(
    (candidate) =>
      JSON.stringify(candidate.command) === JSON.stringify(command),
  );
