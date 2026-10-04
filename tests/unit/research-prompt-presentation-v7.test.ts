import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  FACTION_IDS_V7,
  factionTreeV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  type CommandV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  RESEARCH_PROMPT_COMMANDS_V7,
  researchPathStepV7,
  tileResearchPromptsV7,
} from "../../src/render/research-prompt-v7";
import { researchPromptFixtureV7 } from "../fixtures/v7-research-prompt";

/**
 * Research prompts of the tile dock (bead `pulp_wars-gl1`): which
 * technology a tile's resource needs, and which one to select on the
 * technology screen.
 */
describe("Ruleset 7 research prompts", () => {
  it("asks for the technology of each resource the viewer cannot use yet", () => {
    const data = researchPromptFixtureV7();
    expect(tileResearchPromptsV7(data.view, data.fruit)).toEqual([
      { tech: "GATHERING", command: "HARVEST_FRUIT", select: "GATHERING" },
    ]);
    expect(tileResearchPromptsV7(data.view, data.game)).toEqual([
      { tech: "HUNTING", command: "HUNT_GAME", select: "HUNTING" },
    ]);
    // A missing prerequisite is selected first.
    expect(tileResearchPromptsV7(data.view, data.fertile)).toEqual([
      { tech: "FARMING", command: "BUILD_FARM", select: "GATHERING" },
    ]);
    expect(tileResearchPromptsV7(data.view, data.forest)).toEqual([
      { tech: "FORESTRY", command: "BUILD_LUMBER_CAMP", select: "HUNTING" },
    ]);
    expect(tileResearchPromptsV7(data.view, data.ore)).toEqual([
      { tech: "ENGINEERING", command: "BUILD_MINE", select: "DRILL" },
    ]);
    // A tile with nothing to harvest has no prompt (Roads, Markets and the
    // like are not what the tile is for).
    expect(tileResearchPromptsV7(data.view, data.grass)).toEqual([]);
  });

  it("agrees with the ruleset's economic action table for every basic action", () => {
    const data = researchPromptFixtureV7({ mapType: "PANGEA" });
    const prompts = [
      data.fruit,
      data.fertile,
      data.game,
      data.forest,
      data.ore,
      data.fish,
    ].flatMap((at) => tileResearchPromptsV7(data.view, at));
    expect(prompts.map((prompt) => prompt.command).sort()).toEqual(
      Object.keys(BASIC_ECONOMIC_ACTIONS_V7).sort(),
    );
    for (const prompt of prompts)
      expect(prompt.tech).toBe(
        BASIC_ECONOMIC_ACTIONS_V7[
          prompt.command as keyof typeof BASIC_ECONOMIC_ACTIONS_V7
        ].technology,
      );
    expect([...RESEARCH_PROMPT_COMMANDS_V7].sort()).toEqual(
      [...Object.keys(BASIC_ECONOMIC_ACTIONS_V7), "GATHER_PEARLS"].sort(),
    );
  });

  it("selects the technology itself once its prerequisite is known", () => {
    const data = researchPromptFixtureV7({ researched: ["GATHERING"] });
    expect(tileResearchPromptsV7(data.view, data.fruit)).toEqual([]);
    expect(tileResearchPromptsV7(data.view, data.fertile)).toEqual([
      { tech: "FARMING", command: "BUILD_FARM", select: "FARMING" },
    ]);
  });

  it("has no prompt for a known technology, even without the Coins to act", () => {
    const data = researchPromptFixtureV7({
      researched: ["GATHERING"],
      coins: 0,
    });
    expect(
      queryPlayerCommandsV7(data.view).some(
        (command) => command.kind === "HARVEST_FRUIT",
      ),
    ).toBe(false);
    expect(tileResearchPromptsV7(data.view, data.fruit)).toEqual([]);
  });

  it("still prompts a viewer who is short of Coins", () => {
    const data = researchPromptFixtureV7({ coins: 0 });
    expect(tileResearchPromptsV7(data.view, data.fruit)).toEqual([
      { tech: "GATHERING", command: "HARVEST_FRUIT", select: "GATHERING" },
    ]);
  });

  it("has no prompt on enemy, neutral or unexplored tiles", () => {
    const data = researchPromptFixtureV7();
    for (const at of [data.enemyFruit, data.neutralFruit, data.unexploredFruit])
      expect(tileResearchPromptsV7(data.view, at)).toEqual([]);
  });

  it("has no prompt outside the viewer's turn or after the match", () => {
    const data = researchPromptFixtureV7();
    const waiting: PlayerViewV7 = {
      ...data.view,
      activeSeatIndex:
        (data.view.activeSeatIndex + 1) % data.view.turnOrder.length,
    };
    expect(tileResearchPromptsV7(waiting, data.fruit)).toEqual([]);
  });

  it("has no prompt for a technology the match forbids", () => {
    // Dry Land disables the Naval branch.
    const dry = researchPromptFixtureV7();
    expect(dry.view.setup.mapType).toBe("DRY_LAND");
    expect(tileResearchPromptsV7(dry.view, dry.fish)).toEqual([]);
    const wet = researchPromptFixtureV7({ mapType: "PANGEA" });
    expect(tileResearchPromptsV7(wet.view, wet.fish)).toEqual([
      { tech: "SHORECRAFT", command: "HARVEST_FISH", select: "SHORECRAFT" },
    ]);
  });

  it("reads every faction's own tree", () => {
    for (const faction of FACTION_IDS_V7) {
      const data = researchPromptFixtureV7({ viewer: faction });
      const tree = factionTreeV7(faction);
      const unlocking = (kind: CommandV7["kind"]) =>
        tree.nodes.find((node) =>
          node.unlocks.some(
            (unlock) => unlock.kind === "COMMAND" && unlock.command === kind,
          ),
        )?.id;
      const [fruit] = tileResearchPromptsV7(data.view, data.fruit);
      expect(fruit?.tech, faction).toBe(unlocking("HARVEST_FRUIT"));
      const [mine] = tileResearchPromptsV7(data.view, data.ore);
      expect(mine?.tech, faction).toBe(unlocking("BUILD_MINE"));
      expect(mine?.select, faction).toBe(
        researchPathStepV7(
          queryTechnologyTreeV7(data.view).nodes,
          unlocking("BUILD_MINE") ?? "GATHERING",
        ),
      );
    }
  });

  it("walks up to the first missing prerequisite", () => {
    const data = researchPromptFixtureV7({ researched: ["GATHERING"] });
    const nodes = queryTechnologyTreeV7(data.view).nodes;
    expect(researchPathStepV7(nodes, "MILLING")).toBe("FARMING");
    expect(researchPathStepV7(nodes, "FARMING")).toBe("FARMING");
    expect(researchPathStepV7(nodes, "ENGINEERING")).toBe("DRILL");
    // Researched, and forbidden on Dry Land.
    expect(researchPathStepV7(nodes, "GATHERING")).toBeNull();
    expect(researchPathStepV7(nodes, "NAVIGATION")).toBeNull();
  });
});
