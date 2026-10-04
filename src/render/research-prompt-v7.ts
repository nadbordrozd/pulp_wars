import {
  BASIC_ECONOMIC_ACTIONS_V7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type PublicTechnologyNodeV7,
  type TechnologyIdV7,
} from "../engine/index";

/**
 * Research prompts of the tile dock (bead `pulp_wars-gl1`): a tile whose
 * resource the viewer cannot use only for lack of a technology offers a
 * button that opens the technology screen on that technology.
 *
 * No rule is restated here. The engine's public command query answers "what
 * could I do on this tile if I knew every technology I may research" on a
 * what-if copy of the viewer's own `PlayerView`, and the public technology
 * tree of the viewer's faction says which technology unlocks each of those
 * commands and which prerequisites are missing.
 */

/** The harvest and extraction commands a research prompt is offered for. */
export const RESEARCH_PROMPT_COMMANDS_V7: ReadonlySet<CommandV7["kind"]> =
  new Set<CommandV7["kind"]>([
    ...(Object.keys(BASIC_ECONOMIC_ACTIONS_V7) as CommandV7["kind"][]),
    "GATHER_PEARLS",
  ]);

export interface TileResearchPromptV7 {
  /** The technology that unlocks the tile's action. */
  readonly tech: TechnologyIdV7;
  /** The action it unlocks on the tile. */
  readonly command: CommandV7["kind"];
  /**
   * The technology to select on the technology screen: `tech` itself, or
   * the first missing prerequisite on the way to it.
   */
  readonly select: TechnologyIdV7;
}

/**
 * The technology to research next on the way to `goal`: `goal` when its
 * prerequisites are known, otherwise its first missing prerequisite (and so
 * on up the tree). Null when `goal` is researched, or when it or a
 * prerequisite on the way cannot be researched in this match.
 */
export function researchPathStepV7(
  nodes: readonly PublicTechnologyNodeV7[],
  goal: TechnologyIdV7,
): TechnologyIdV7 | null {
  let step = nodes.find((node) => node.id === goal);
  for (let depth = 0; depth <= nodes.length; depth += 1) {
    if (step === undefined) return null;
    if (step.state === "AVAILABLE") return step.id;
    if (step.state !== "BLOCKED") return null;
    const missing = step.missingPrerequisites[0];
    step = nodes.find((node) => node.id === missing);
  }
  return null;
}

const WHAT_IF_COMMANDS = new WeakMap<PlayerViewV7, readonly CommandV7[]>();

/**
 * The commands the engine would offer the viewer with every technology it
 * may still research and no shortage of Coins. Empty outside the viewer's
 * turn, as the real offer is.
 */
function whatIfCommandsV7(
  view: PlayerViewV7,
  nodes: readonly PublicTechnologyNodeV7[],
): readonly CommandV7[] {
  const cached = WHAT_IF_COMMANDS.get(view);
  if (cached !== undefined) return cached;
  const owned = new Set(view.viewer.researchedTechs);
  const whatIf: PlayerViewV7 = {
    ...view,
    viewer: {
      ...view.viewer,
      coins: Number.MAX_SAFE_INTEGER,
      researchedTechs: nodes
        .filter((node) => owned.has(node.id) || node.state !== "DISABLED")
        .map((node) => node.id),
    },
  };
  const commands = queryPlayerCommandsV7(whatIf);
  WHAT_IF_COMMANDS.set(view, commands);
  return commands;
}

/**
 * The research prompts of one tile, in the engine's command order: one per
 * missing technology that would let the viewer harvest or extract the
 * tile's resource. Empty for a tile the viewer could not use anyway (fog,
 * foreign or neutral land, a besieged city), for a technology that is
 * known, and for one that cannot be researched in this match.
 */
export function tileResearchPromptsV7(
  view: PlayerViewV7,
  at: CoordV7,
): readonly TileResearchPromptV7[] {
  if (!view.cities.some((city) => city.ownerId === view.viewer.id)) return [];
  const nodes = queryTechnologyTreeV7(view).nodes;
  const prompts: TileResearchPromptV7[] = [];
  for (const command of whatIfCommandsV7(view, nodes)) {
    if (
      !RESEARCH_PROMPT_COMMANDS_V7.has(command.kind) ||
      !("at" in command) ||
      command.at.x !== at.x ||
      command.at.y !== at.y
    )
      continue;
    const node = nodes.find((candidate) =>
      candidate.effects.some(
        (effect) =>
          effect.kind === "COMMAND" && effect.command === command.kind,
      ),
    );
    if (node === undefined || prompts.some((prompt) => prompt.tech === node.id))
      continue;
    const select = researchPathStepV7(nodes, node.id);
    if (select === null) continue;
    prompts.push({ tech: node.id, command: command.kind, select });
  }
  return prompts;
}
