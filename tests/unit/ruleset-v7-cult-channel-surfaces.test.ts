import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  cultSummonedArtSubjectV7,
  unitArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  BOARD_SUMMONED_ROLE_IDS_V7,
  DISRUPTION_CAUSES_V7,
  FAVOUR_PURPOSES_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  summonedUnitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  DISRUPTION_CAUSE_LABELS_V7,
  FAVOUR_PURPOSE_LABELS_V7,
  cultChannelCommandPresentationV7,
  cultChannelStandInShownV7,
  strandsTextV7,
} from "../../src/render/cult-channel-presentation-v7";
import { cultCommandPresentationV7 } from "../../src/render/cult-presentation-v7";
import { unitDisplayNameV7 } from "../../src/render/dinosaur-presentation-v7";
import { roleAbilityNameV7 } from "../../src/render/role-presentation-v7";
import {
  GLOSSARY_TEXT_LIMIT_V7,
  abilityGlossaryIdV7,
  glossaryEntryV7,
  roleGlossaryV7,
  summonedGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  cultFieldV7,
  withFavourV7,
  withHorrorV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { offeredV7 } from "../fixtures/v7-martian";
import { at, fieldV7 } from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E3 (`pulp_wars-mch9.5`):
 * what the channel shows outside the engine. The Horror's own sprite and
 * name on the board, the dock's stand-in buttons, the glossary, and the
 * older Normal AI, which tolerates the five commands without picking them.
 * Every state is built by hand; no match is played.
 */

const CHANNEL_KINDS = ["SUMMON", "CHANNEL", "BEHOLD", "ANCHOR", "BOO"];

/** The value, which the test requires to be there. */
function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

/**
 * A Cult seat (seat `seat`) with every channel command on offer: a Summoner
 * and an Initiate with 6 Favour; a Horror with a Human Fighter beside it; a
 * second Initiate holding a strand next to the Thing; and an Idol Bearer.
 */
function everything(seat = 0): GameStateV7 {
  const other = seat === 0 ? 1 : 0;
  const base = cultFieldV7(
    [
      { seat, role: "CAPTAIN", at: at(5, 2) },
      { seat, role: "FIGHTER", at: at(6, 2) },
      { seat, role: "GUARD", at: at(4, 6) },
      {
        seat,
        role: "FIGHTER",
        at: at(5, 6),
        activation: { specialActed: true },
      },
      { seat, role: "JUGGERNAUT", at: at(6, 6) },
      { seat, role: "MARKSMAN", at: at(6, 5) },
      { seat: other, role: "FIGHTER", at: at(4, 4) },
      { seat: other, role: "FIGHTER", at: at(1, 1) },
    ],
    {
      factions: seat === 0 ? ["CULT", "ORIGINAL"] : ["ORIGINAL", "CULT"],
      activeSeat: seat,
      coins: 30,
    },
  );
  return withStrandsV7(
    withHorrorV7(withFavourV7(base, seat, 6), seat, at(5, 4)),
    at(5, 4),
    [at(5, 6)],
  );
}

describe("the Cult's channel: the Horror on the board", () => {
  it("draws a summoned Horror with its own sprite and name", () => {
    const state = withHorrorV7(
      cultFieldV7([{ seat: 0, role: "KNIGHT", at: at(4, 4) }]),
      0,
      at(5, 4),
    );
    for (const seat of [0, 1]) {
      const view = viewForV7(state, seatIdV7(state, seat));
      const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      });
      const entry = (where: { x: number; y: number }) => {
        const unit = unitAtV7(state, where);
        const found = plan.entries.find(
          (candidate) => candidate.key === `unit:${unit.id}`,
        );
        if (found?.kind !== "UNIT") throw new Error("no unit entry");
        return found;
      };
      // The Horror, whose mechanical role is the Caller's, is no Caller.
      expect(entry(at(5, 4)).artSubject).toBe("UNIT:CULT:HORROR");
      expect(entry(at(5, 4)).label).toBe("Horror");
      expect(entry(at(4, 4)).artSubject).toBe("UNIT:CULT:KNIGHT");
      expect(entry(at(4, 4)).label).toBe("Caller");
      const horror = view.units.find((unit) => unit.summoned === "HORROR");
      expect(
        horror === undefined ? null : unitDisplayNameV7(view, horror),
      ).toBe("Horror");
    }
  });

  it("asks for the sprite the art pipeline registered, for every summoned unit on the board", () => {
    const live = chibiDirectionArtRegistryV7();
    for (const summoned of BOARD_SUMMONED_ROLE_IDS_V7) {
      const role = summonedUnitRoleRuleV7(summoned).role;
      const subject = unitArtSubjectV7({
        role,
        form: "LAND",
        faction: "CULT",
        summoned,
      });
      expect(subject).toBe(cultSummonedArtSubjectV7(summoned));
      expect(live.variants(subject), subject).toHaveLength(1);
      // Without the field the role's own sprite is asked for, as before.
      expect(unitArtSubjectV7({ role, form: "LAND", faction: "CULT" })).toBe(
        `UNIT:CULT:${role}`,
      );
    }
  });

  it("explains a Horror in plain words, not as the Caller it is not", () => {
    const lines = summonedGlossaryV7("HORROR");
    // (What its kills pay and what Unbound means: `pulp_wars-mch9.6`.)
    expect(lines.map((entry) => entry.id)).toEqual([
      "DAEMON",
      "DAEMONS_FEED",
      "CAPTURE",
      "BOO",
      "STRIDE",
      "UNBOUND",
    ]);
    expect(roleGlossaryV7("KNIGHT", "CULT").map((entry) => entry.id)).toEqual([
      "CAPTURE",
      "CHANNEL",
    ]);
    for (const entry of lines) {
      expect(entry.text.length, entry.id).toBeLessThanOrEqual(
        GLOSSARY_TEXT_LIMIT_V7,
      );
      expect(entry.text, entry.id).not.toMatch(/\d\s*[+×*/]|=/);
    }
  });

  it("has a glossary entry, under the game's own name, for every new ability", () => {
    const expected: readonly (readonly [string, string, string])[] = [
      ["SUMMON", "CAPTAIN", "Summon"],
      ["CHANNEL", "FIGHTER", "Channel"],
      ["BEHOLD", "GUARD", "Behold!"],
      ["ANCHOR", "JUGGERNAUT", "Anchor"],
    ];
    for (const [ability, role, name] of expected) {
      expect(effectiveRoleRuleV7(role as never, "CULT").abilities).toContain(
        ability,
      );
      const id = abilityGlossaryIdV7(ability as never, role as never, "CULT");
      expect(id, ability).toBe(ability);
      expect(glossaryEntryV7(need(id)).name).toBe(name);
      expect(roleAbilityNameV7(ability, "CULT")).toBe(name);
    }
    expect(glossaryEntryV7("BOO").name).toBe("Boo!");
    expect(roleAbilityNameV7("BOO", "CULT")).toBe("Boo!");
    // No role of any faction has an ability without a line.
    for (const role of UNIT_ROLE_IDS_V7)
      for (const ability of effectiveRoleRuleV7(role, "CULT").abilities)
        if (CHANNEL_KINDS.includes(ability))
          expect(abilityGlossaryIdV7(ability, role, "CULT")).not.toBeNull();
  });
});

describe("the Cult's channel: the dock's stand-in buttons", () => {
  it("names every offered channel command in plain words, with what it does", () => {
    const state = everything();
    const view = viewForV7(state, seatIdV7(state, 0));
    const offered = queryPlayerCommandsV7(view);
    const kinds = new Set(
      offered
        .filter((command) => CHANNEL_KINDS.includes(command.kind))
        .map((command) => command.kind),
    );
    expect([...kinds].sort()).toEqual([...CHANNEL_KINDS].sort());
    const shown = offered.filter(
      (command) =>
        CHANNEL_KINDS.includes(command.kind) &&
        cultChannelStandInShownV7(command, offered),
    );
    const buttons = shown.map((command) => {
      const button = cultCommandPresentationV7(view, command);
      if (button === null) throw new Error(`no button for ${command.kind}`);
      expect(cultChannelCommandPresentationV7(view, command)).toEqual(button);
      return [command.kind, button.label, button.chip] as const;
    });
    const count = (kind: string) =>
      buttons.filter((button) => button[0] === kind);
    // One Summon per Summoner (the engine offers one per helper and tile).
    expect(count("SUMMON")).toEqual([["SUMMON", "Summon Horror", "−5 Favour"]]);
    // The Summoner, its Initiate, the Hexer, and the Idol Bearer are in
    // reach of the Horror, which holds one strand already.
    expect(count("CHANNEL")).toEqual(
      Array.from({ length: 4 }, () => ["CHANNEL", "Channel Horror", "2 / 1"]),
    );
    expect(count("BEHOLD")).toEqual([["BEHOLD", "Behold!", "1 cultist"]]);
    expect(count("ANCHOR")).toEqual([["ANCHOR", "Grip Initiate", "3 / 1"]]);
    // The Human Fighter and the cultists' own Hexer stand beside the Horror.
    expect(count("BOO")).toEqual([["BOO", "Boo!", "2 units"]]);
    expect(buttons).toHaveLength(8);
    expect(
      offered.filter((command) => command.kind === "SUMMON").length,
    ).toBeGreaterThan(1);
    for (const command of shown) {
      const button = need(cultCommandPresentationV7(view, command));
      expect(`${button.label} ${button.chip} ${button.tooltip}`).not.toMatch(
        /\d+,\s*\d+|#\d|\bu\d|_|undefined|null|NaN/,
      );
      expect(button.tooltip.length).toBeGreaterThan(20);
    }
    // A command that is not offered has no button.
    expect(
      cultChannelCommandPresentationV7(view, {
        kind: "BOO",
        unitId: unitAtV7(state, at(5, 2)).id,
      }),
    ).toBeNull();
    expect(
      cultChannelCommandPresentationV7(view, { kind: "END_TURN" }),
    ).toBeNull();
  });

  it("has words for every cause and purpose the events carry", () => {
    for (const cause of DISRUPTION_CAUSES_V7)
      expect(DISRUPTION_CAUSE_LABELS_V7[cause].length, cause).toBeGreaterThan(
        3,
      );
    for (const purpose of FAVOUR_PURPOSES_V7)
      expect(FAVOUR_PURPOSE_LABELS_V7[purpose].length, purpose).toBeGreaterThan(
        3,
      );
    expect(strandsTextV7(2, 3)).toBe("2 / 3");
  });
});

describe("the Cult's channel: the older Normal policy tolerates the commands", () => {
  /** Plays the active seat's whole turn with the Normal AI. */
  function turn(start: GameStateV7): readonly CommandV7[] {
    let state = start;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const commands: CommandV7[] = [];
    for (let step = 0; step < 200; step += 1) {
      const view = viewForV7(state, actor);
      const command = chooseNormalCommandV7(view).command;
      if (command === null) throw new Error("the policy chose nothing");
      expect(queryPlayerCommandsV7(view)).toContainEqual(command);
      commands.push(command);
      if (command.kind === "END_TURN") return commands;
      state = applyOkV7(state, actor, command).state;
    }
    throw new Error("the turn did not end");
  }

  it("never picks Summon, Channel, Behold!, Anchor, or Boo!, and ends its turn", () => {
    // A Cult AI seat (seat 1) with all five on offer.
    const state = everything(1);
    const offered = new Set(
      offeredV7(state)
        .map((command) => command.kind)
        .filter((kind) => CHANNEL_KINDS.includes(kind)),
    );
    expect([...offered].sort()).toEqual([...CHANNEL_KINDS].sort());
    const commands = turn(state);
    expect(commands.at(-1)?.kind).toBe("END_TURN");
    for (const command of commands)
      expect(CHANNEL_KINDS).not.toContain(command.kind);
    // Every candidate the policy scored is one it may pick.
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 1)),
    );
    for (const candidate of decision.candidates)
      expect(CHANNEL_KINDS).not.toContain(candidate.command.kind);
  });

  it("plays a turn against a Cult seat with a channelled Horror in sight", () => {
    const state = withStrandsV7(
      withHorrorV7(
        fieldV7(
          [
            { seat: 0, role: "FIGHTER", at: at(5, 6) },
            { seat: 0, role: "GUARD", at: at(6, 6) },
            { seat: 1, role: "KNIGHT", at: at(3, 5) },
            { seat: 1, role: "MARKSMAN", at: at(5, 8) },
          ],
          { factions: ["CULT", "ORIGINAL"], activeSeat: 1, coins: 30 },
        ),
        0,
        at(5, 4),
      ),
      at(5, 4),
      [at(5, 6)],
    );
    expect(turn(state).at(-1)?.kind).toBe("END_TURN");
  });
});
