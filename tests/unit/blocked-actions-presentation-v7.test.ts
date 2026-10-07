import { describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  coinRichViewV7,
  dockCommandsV7,
  needCoinsTextV7,
  slotBlockedCommandsV7,
  slotsBlockedTextV7,
  unaffordableCommandsV7,
} from "../../src/render/blocked-actions-v7";
import {
  BLOCKED_ACTIONS_UI_V7,
  blockedActionsMatchV7,
} from "../fixtures/v7-blocked-actions";
import { researchPromptFixtureV7 } from "../fixtures/v7-research-prompt";

/**
 * Blocked actions of the dock (bead pulp_wars-2yc.36): what the viewer
 * could do but for Coins, and what its cities could train but for a free
 * slot, derived from the engine's public command query alone.
 */
const AT = BLOCKED_ACTIONS_UI_V7;
const view = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);
const on = (commands: readonly CommandV7[], at: CoordV7): string[] =>
  commands
    .filter(
      (command) =>
        "at" in command && command.at.x === at.x && command.at.y === at.y,
    )
    .map((command) => command.kind);
const trained = (commands: readonly CommandV7[]): string[] =>
  commands.flatMap((command) =>
    command.kind === "TRAIN" ? [command.role] : [],
  );

describe("Ruleset 7 blocked dock actions", () => {
  it("lists a harvest that only lacks Coins, and nothing the viewer can pay", () => {
    const poor = view(
      blockedActionsMatchV7({ researched: ["GATHERING"], coins: 1 }),
    );
    expect(on(queryPlayerCommandsV7(poor), AT.fruit)).toEqual([]);
    expect(on(unaffordableCommandsV7(poor), AT.fruit)).toEqual([
      "HARVEST_FRUIT",
    ]);
    const paid = view(
      blockedActionsMatchV7({ researched: ["GATHERING"], coins: 2 }),
    );
    expect(on(queryPlayerCommandsV7(paid), AT.fruit)).toEqual([
      "HARVEST_FRUIT",
    ]);
    expect(on(unaffordableCommandsV7(paid), AT.fruit)).toEqual([]);
  });

  it("covers every paid tile action and leaves the free one offered", () => {
    const poor = view(blockedActionsMatchV7({ coins: 1 }));
    const dear = unaffordableCommandsV7(poor);
    // (A Road, 2 Coins, is one of them on every tile here.)
    expect(on(dear, AT.game)).toEqual(["HUNT_GAME", "BUILD_ROAD"]);
    expect(on(dear, AT.fertile)).toEqual(["BUILD_FARM", "BUILD_ROAD"]);
    expect(on(dear, AT.forest)).toEqual([
      "BUILD_LUMBER_CAMP",
      "CULTIVATE_FOREST",
      "BUILD_ROAD",
    ]);
    expect(on(dear, AT.grass)).toContain("REPLANT_FOREST");
    expect(on(queryPlayerCommandsV7(poor), AT.forest)).toContain(
      "CLEAR_FOREST",
    );
    // Research is priced on the technology screen, never here.
    expect(dear.some((command) => command.kind === "RESEARCH")).toBe(false);
  });

  it("never lists a missing technology, another player's land or a hidden tile", () => {
    // No technology at all: nothing on the Fruit is one Coin away.
    const untaught = view(blockedActionsMatchV7({ researched: [], coins: 0 }));
    expect(on(unaffordableCommandsV7(untaught), AT.fruit)).toEqual([]);
    const poor = view(blockedActionsMatchV7({ coins: 0 }));
    const dear = unaffordableCommandsV7(poor);
    expect(on(dear, AT.enemyFruit)).toEqual([]);
    expect(on(dear, AT.neutralFruit)).not.toContain("HARVEST_FRUIT");
    // A fogged Fruit, and Ore that is not revealed, stay unknown.
    const data = researchPromptFixtureV7({
      researched: ["GATHERING", "DRILL", "ENGINEERING"],
      coins: 0,
    });
    expect(on(unaffordableCommandsV7(data.view), data.fruit)).toEqual([
      "HARVEST_FRUIT",
    ]);
    expect(on(unaffordableCommandsV7(data.view), data.ore)).toContain(
      "BUILD_MINE",
    );
    expect(on(unaffordableCommandsV7(data.view), data.unexploredFruit)).toEqual(
      [],
    );
    const hidden: PlayerViewV7 = {
      ...data.view,
      board: {
        ...data.view.board,
        tiles: data.view.board.tiles.map((tile) =>
          tile.explored && tile.at.x === data.ore.x && tile.at.y === data.ore.y
            ? { ...tile, resource: "UNKNOWN_RESOURCE" as const }
            : tile,
        ),
      },
    };
    expect(on(unaffordableCommandsV7(hidden), data.ore)).not.toContain(
      "BUILD_MINE",
    );
  });

  it("lists the units a city could train but for Coins, unlocked ones only", () => {
    const some = view(blockedActionsMatchV7({ coins: 3 }));
    expect(trained(queryPlayerCommandsV7(some))).toEqual(["FIGHTER", "GUARD"]);
    expect(trained(unaffordableCommandsV7(some))).toEqual([
      "RAIDER",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ]);
    // Without a technology only the starting unit is trainable at all.
    const untaught = view(blockedActionsMatchV7({ researched: [], coins: 0 }));
    expect(trained(unaffordableCommandsV7(untaught))).toEqual(["FIGHTER"]);
  });

  it("lists the units a full city could train, whatever the Coins", () => {
    const full = view(blockedActionsMatchV7({ garrison: 3 }));
    expect(trained(queryPlayerCommandsV7(full))).toEqual([]);
    expect(trained(unaffordableCommandsV7(full))).toEqual([]);
    expect(trained(slotBlockedCommandsV7(full))).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
    ]);
    const broke = view(blockedActionsMatchV7({ garrison: 3, coins: 0 }));
    expect(trained(slotBlockedCommandsV7(broke))).toHaveLength(8);
    const roomy = view(blockedActionsMatchV7({ garrison: 2 }));
    expect(trained(slotBlockedCommandsV7(roomy))).toEqual([]);
  });

  it("orders the dock as the engine does and keeps offered commands open", () => {
    const some = view(blockedActionsMatchV7({ coins: 3 }));
    const offered = queryPlayerCommandsV7(some);
    const dock = dockCommandsV7(some, offered);
    expect(
      dock.filter((entry) => entry.blocked === null).map((e) => e.command),
    ).toEqual(offered);
    expect(
      dock.flatMap((entry) =>
        entry.command.kind === "TRAIN"
          ? [`${entry.command.role}:${entry.blocked ?? "open"}`]
          : [],
      ),
    ).toEqual([
      "FIGHTER:open",
      "RAIDER:COINS",
      "MARKSMAN:COINS",
      "GUARD:open",
      "CAPTAIN:COINS",
      "CATAPULT:COINS",
      "KNIGHT:COINS",
      "SWORDSMAN:COINS",
    ]);
    // Nothing is blocked while no command is offered (not the viewer's
    // turn, or the match is busy).
    expect(dockCommandsV7(some, [])).toEqual([]);
    expect(dockCommandsV7(null, offered)).toHaveLength(offered.length);
    const waiting: PlayerViewV7 = {
      ...some,
      activeSeatIndex: (some.activeSeatIndex + 1) % some.turnOrder.length,
    };
    expect(unaffordableCommandsV7(waiting)).toEqual([]);
    expect(slotBlockedCommandsV7(waiting)).toEqual([]);
  });

  it("leaves the engine's own offer, which the AI and the text harness read, as it was", () => {
    const state = blockedActionsMatchV7({ coins: 3 });
    const before = queryPlayerCommandsV7(view(state));
    const live = view(state);
    unaffordableCommandsV7(live);
    slotBlockedCommandsV7(live);
    expect(queryPlayerCommandsV7(live)).toEqual(before);
    expect(live.viewer.coins).toBe(3);
    expect(coinRichViewV7(live)).not.toBe(live);
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toEqual(before);
  });

  it("words the two reasons briefly", () => {
    expect(needCoinsTextV7(1)).toBe("Need 1 more Coin");
    expect(needCoinsTextV7(2)).toBe("Need 2 more Coins");
    expect(slotsBlockedTextV7(1)).toBe("City full");
    expect(slotsBlockedTextV7(2)).toBe("Needs 2 free slots");
  });
});
