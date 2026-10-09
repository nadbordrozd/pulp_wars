import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { SPIDER_CODE_ART_ID_V7 } from "../../src/render/canvas/curiosity-canvas-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  CURIOSITY_LABELS_V7,
  CURIOSITY_RULES_V7,
  MONSTER_RETALIATES_V7,
  NEUTRAL_TURN_BANNER_V7,
  PROVOKE_MOVE_WARNING_V7,
  curiosityBoundaryNoticeV7,
  curiosityHelpRulesV7,
  curiosityOverlayOnTileV7,
  matchHasCuriositiesV7,
  monsterInfoLinesV7,
} from "../../src/render/curiosity-presentation-v7";
import {
  CURIOSITIES_UI_V7,
  curiositiesOffFixtureV7,
  curiositiesUiFixtureV7,
} from "../fixtures/v7-curiosities-ui";

/**
 * Map curiosities UI (bead pulp_wars-737.6,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md sections 12.1 and 13.4): the
 * board plan of every curiosity and of the Giant Spider, the provoke
 * warning, the combat preview's `monsterRetaliates`, the neutral-turn
 * playback and the effects, the dock lines, Help and the log lines; and
 * that a match without curiosities is planned exactly as before.
 */
const AT = CURIOSITIES_UI_V7;
const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const NONE = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

function human(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}
function unitAt(state: GameStateV7, at: { x: number; y: number }) {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("no unit there");
  return unit;
}
function apply(state: GameStateV7, command: CommandV7) {
  const before = human(state);
  const applied = applyCommandV7(state, state.humanPlayerId, command);
  if (!applied.accepted) throw new Error(applied.error.code);
  const after = human(applied.state);
  const envelope = projectEventsV7(
    state,
    applied.state,
    state.humanPlayerId,
    applied.events,
  );
  return { state: applied.state, before, after, envelope };
}
function moveTo(
  state: GameStateV7,
  from: { x: number; y: number },
  to: { x: number; y: number },
): CommandV7 {
  const unit = unitAt(state, from);
  const command = queryPlayerCommandsV7(human(state)).find(
    (candidate) =>
      candidate.kind === "MOVE" &&
      candidate.unitId === unit.id &&
      candidate.path.at(-1)?.x === to.x &&
      candidate.path.at(-1)?.y === to.y,
  );
  if (command === undefined) throw new Error("Move not offered");
  return command;
}

describe("the curiosity board plan", () => {
  const state = curiositiesUiFixtureV7();
  const view = human(state);
  const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), NONE);
  const curiosities = plan.entries.filter(
    (entry) => entry.kind === "CURIOSITY",
  );

  it("draws the web, the Fountain, the Shrine and the Wreck on their tiles, under units", () => {
    expect(
      curiosities.map((entry) => [
        entry.curiosity,
        entry.artSubject,
        entry.at,
        entry.layer,
        entry.label,
      ]),
    ).toEqual([
      ["WRECK", "CURIOSITY:WRECK", AT.wreck, 4, "Sunken Wreck"],
      ["WEB", "CURIOSITY:WEB", AT.lair, 3.5, "Spider's lair"],
      ["FOUNTAIN", "CURIOSITY:FOUNTAIN", AT.fountain, 4, "Fountain of Youth"],
      ["SHRINE", "CURIOSITY:SHRINE", AT.shrine, 4, "Shrine"],
    ]);
    // Entry order is the draw order of a cell: the web before the Spider,
    // the Fountain before the unit on it, the Shrine after its Forest.
    const index = (key: string): number =>
      plan.entries.findIndex((entry) => entry.key === key);
    const spider = unitAt(state, AT.spider);
    expect(index(`curiosity:WEB:${AT.lair.x},${AT.lair.y}`)).toBeLessThan(
      index(`unit:${spider.id}`),
    );
    expect(
      index(`curiosity:FOUNTAIN:${AT.fountain.x},${AT.fountain.y}`),
    ).toBeLessThan(index(`unit:${unitAt(state, AT.bather).id}`));
    expect(index(`terrain:${AT.shrine.x},${AT.shrine.y}`)).toBeLessThan(
      index(`curiosity:SHRINE:${AT.shrine.x},${AT.shrine.y}`),
    );
  });

  it("draws the Spider with its own sprite, its name, no owner colour and its provoked marker", () => {
    const spider = unitAt(state, AT.spider);
    const entry = plan.entries.find((item) => item.key === `unit:${spider.id}`);
    expect(entry).toMatchObject({
      kind: "UNIT",
      artSubject: "UNIT:MONSTER_GIANT_SPIDER",
      assetId: SPIDER_CODE_ART_ID_V7,
      label: "Giant Spider",
      ready: false,
      monster: { provoked: true },
    });
    expect(entry?.ownerColor).toBeUndefined();
    expect(entry?.ownerSeat).toBeUndefined();
    expect(entry?.faction).toBeUndefined();
    // Without a neighbour it is calm.
    const calm = human({
      ...state,
      units: state.units.filter(
        (unit) => unit.id !== unitAt(state, AT.bait).id,
      ),
    });
    expect(
      buildBoardRenderPlanV7(calm, [], NONE).entries.find(
        (item) => item.key === `unit:${spider.id}`,
      )?.monster,
    ).toEqual({ provoked: false });
  });

  it("outlines a selected Spider's area and shades its reach, also from its lair tile", () => {
    const spider = unitAt(state, AT.spider);
    for (const selection of [
      { kind: "UNIT", unitId: spider.id },
      { kind: "TILE", at: AT.lair },
    ] as const) {
      const selected = buildBoardRenderPlanV7(view, [], {
        ...NONE,
        selection,
        selectedUnitId: selection.kind === "UNIT" ? selection.unitId : null,
      });
      const styles = (style: string) =>
        selected.entries
          .filter(
            (entry) =>
              entry.kind === "ABILITY_AREA" && entry.abilityStyle === style,
          )
          .map((entry) => `${entry.at.x},${entry.at.y}`);
      expect(styles("MONSTER_AREA").sort()).toEqual(
        ["7,7", "8,7", "7,8", "9,7", "7,9"].sort(),
      );
      expect(styles("MONSTER_REACH").length).toBeGreaterThan(8);
      expect(styles("MONSTER_REACH")).not.toContain("7,7");
    }
    expect(
      plan.entries.some(
        (entry) =>
          entry.abilityStyle === "MONSTER_AREA" ||
          entry.abilityStyle === "MONSTER_REACH",
      ),
    ).toBe(false);
  });

  it("marks the Moves that end next to the Spider and says the warning", () => {
    const knight = unitAt(state, AT.knight);
    const commands = queryPlayerCommandsV7(view);
    const selected = buildBoardRenderPlanV7(view, commands, {
      ...NONE,
      selection: { kind: "UNIT", unitId: knight.id },
      selectedUnitId: knight.id,
    });
    const moves = selected.targets.filter((target) => target.family === "MOVE");
    const provoking = moves.filter((target) => target.provokes === true);
    expect(provoking.length).toBeGreaterThan(0);
    expect(provoking.length).toBeLessThan(moves.length);
    for (const target of moves) {
      const near =
        Math.max(
          Math.abs(target.at.x - AT.spider.x),
          Math.abs(target.at.y - AT.spider.y),
        ) === 1;
      expect(target.provokes === true, `${target.at.x},${target.at.y}`).toBe(
        near,
      );
      expect(target.semanticLabel).toBe(
        near ? PROVOKE_MOVE_WARNING_V7 : undefined,
      );
    }
  });

  it("says whether the Spider strikes back in the attack preview", () => {
    const bait = unitAt(state, AT.bait);
    const selected = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      ...NONE,
      selection: { kind: "UNIT", unitId: bait.id },
      selectedUnitId: bait.id,
    });
    const attack = selected.targets.find(
      (target) => target.family === "ATTACK",
    );
    expect(attack?.at).toEqual(AT.spider);
    expect(attack?.previewNote).toContain(MONSTER_RETALIATES_V7);
    expect(attack?.semanticLabel).toContain(MONSTER_RETALIATES_V7);
  });

  it("plans a match without curiosities exactly as before", () => {
    const off = curiositiesOffFixtureV7();
    const offView = human(off);
    expect(matchHasCuriositiesV7(offView)).toBe(false);
    const offPlan = buildBoardRenderPlanV7(
      offView,
      queryPlayerCommandsV7(offView),
      NONE,
    );
    expect(offPlan.entries.some((entry) => entry.kind === "CURIOSITY")).toBe(
      false,
    );
    for (const entry of offPlan.entries) {
      expect(entry.monster, entry.key).toBeUndefined();
      expect(entry.curiosity, entry.key).toBeUndefined();
    }
    // The option on, on a board that drew nothing, plans the same entries.
    const drewNothing = human({
      ...off,
      setup: { ...off.setup, curiosities: true },
    });
    expect(
      buildBoardRenderPlanV7(
        drewNothing,
        queryPlayerCommandsV7(drewNothing),
        NONE,
      ),
    ).toEqual(offPlan);
    // And the curiosity entries are the only difference on the same board.
    const withoutCuriosities = plan.entries.filter(
      (entry) =>
        entry.kind !== "CURIOSITY" &&
        entry.monster === undefined &&
        entry.kind !== "TARGET",
    );
    const offKeys = new Set(offPlan.entries.map((entry) => entry.key));
    for (const entry of withoutCuriosities)
      if (entry.kind !== "UNIT" && entry.kind !== "SELECTION")
        expect(offKeys.has(entry.key), entry.key).toBe(true);
  });
});

describe("the curiosity playback", () => {
  it("plays a Shrine claim as a blessing on the Promoted unit", () => {
    const state = curiositiesUiFixtureV7();
    const moved = apply(state, moveTo(state, AT.pilgrim, AT.shrine));
    expect(moved.envelope.events.map((event) => event.kind)).toContain(
      "SHRINE_CLAIMED",
    );
    const steps = corePresentationPlanV7(
      moved.before,
      moved.envelope,
      moved.after,
    );
    expect(steps.map((step) => step.kind)).toEqual(["MOVE", "SUPPORT"]);
    expect(steps[1]).toMatchObject({
      kind: "SUPPORT",
      effect: "BLESSING",
      actor: { at: AT.shrine },
      durationMs: 640,
    });
    expect(
      curiosityBoundaryNoticeV7(
        moved.envelope.events,
        moved.before,
        moved.after,
      ),
    ).toEqual({ text: "Shrine: your Fighter was Promoted", toast: true });
    expect(curiosityOverlayOnTileV7(moved.after, AT.shrine)).toBeNull();
  });

  it("plays a salvaged Wreck as coins with the Coins gained", () => {
    const state = curiositiesUiFixtureV7();
    const moved = apply(state, moveTo(state, AT.boat, AT.wreck));
    const steps = corePresentationPlanV7(
      moved.before,
      moved.envelope,
      moved.after,
    );
    expect(steps.at(-1)).toMatchObject({
      kind: "SUPPORT",
      effect: "SALVAGE",
      actor: { at: AT.wreck, amount: 8 },
    });
    expect(
      curiosityBoundaryNoticeV7(
        moved.envelope.events,
        moved.before,
        moved.after,
      ),
    ).toEqual({ text: "Wreck salvaged: +8 Coins", toast: true });
  });

  it("plays the neutral turn like an enemy turn: the Spider's attack, its regeneration, then the Fountain", () => {
    const state = curiositiesUiFixtureV7({ spiderHp: 20 });
    const spider = unitAt(state, AT.spider);
    const ended = apply(state, { kind: "END_TURN" });
    const kinds = ended.envelope.events.map((event) => event.kind);
    expect(kinds).toContain("NEUTRAL_TURN_STARTED");
    expect(kinds).toContain("FOUNTAIN_HEALED");
    const steps = corePresentationPlanV7(
      ended.before,
      ended.envelope,
      ended.after,
    );
    const frame = steps.findIndex(
      (step) => step.kind === "MOVE" && step.unitId === spider.id,
    );
    const lunge = steps.findIndex(
      (step) => step.kind === "MELEE" && step.unitId === spider.id,
    );
    const regeneration = steps.findIndex(
      (step) => step.kind === "SUPPORT" && step.effect === "REGENERATE",
    );
    const fountain = steps.findIndex(
      (step) => step.kind === "SUPPORT" && step.effect === "FOUNTAIN",
    );
    expect(frame).toBeGreaterThanOrEqual(0);
    expect(steps[frame]).toMatchObject({
      path: [AT.spider],
      followCamera: true,
    });
    expect(lunge).toBeGreaterThan(frame);
    expect(steps[lunge]).toMatchObject({ from: AT.spider, to: AT.bait });
    expect(regeneration).toBeGreaterThan(lunge);
    expect(steps[regeneration]).toMatchObject({
      actor: { unitId: spider.id, at: AT.spider },
    });
    expect(fountain).toBeGreaterThan(regeneration);
    expect(steps[fountain]).toMatchObject({
      actor: { at: AT.fountain, amount: 7 },
    });
    const notice = curiosityBoundaryNoticeV7(
      ended.envelope.events,
      ended.before,
      ended.after,
    );
    expect(notice?.toast).toBe(true);
    expect(notice?.text.startsWith(NEUTRAL_TURN_BANNER_V7)).toBe(true);
    // Another player's Fountain heal is shown on the board, not logged.
    expect(notice?.text).toBe(
      "The wilds stir · Giant Spider attacked your Fighter",
    );
    // The viewer's own heal is logged, without a tile.
    const own = unitAt(state, AT.knight);
    expect(
      curiosityBoundaryNoticeV7(
        [
          {
            kind: "FOUNTAIN_HEALED",
            playerId: state.humanPlayerId,
            unitId: own.id,
            at: AT.fountain,
            amount: 7,
            hpAfter: 10,
          },
        ],
        ended.before,
        ended.after,
      ),
    ).toEqual({ text: "Fountain of Youth: your Knight +7 HP", toast: true });
  });

  it("says nothing of a neutral turn in which nothing visible happened", () => {
    const state = curiositiesUiFixtureV7();
    // No provoker: remove the bait; the Spider may wander or stay.
    const calm = {
      ...state,
      units: state.units.filter(
        (unit) => unit.id !== unitAt(state, AT.bait).id,
      ),
    };
    const ended = apply(calm, { kind: "END_TURN" });
    const moved = ended.envelope.events.some(
      (event) =>
        event.kind === "UNIT_MOVED" &&
        event.unitId === unitAt(state, AT.spider).id,
    );
    const notice = curiosityBoundaryNoticeV7(
      ended.envelope.events,
      ended.before,
      ended.after,
    );
    expect(notice?.text.includes(NEUTRAL_TURN_BANNER_V7) ?? false).toBe(moved);
    // A match without curiosities has no notice and no curiosity step.
    const off = curiositiesOffFixtureV7();
    const offEnded = apply(off, { kind: "END_TURN" });
    expect(
      curiosityBoundaryNoticeV7(
        offEnded.envelope.events,
        offEnded.before,
        offEnded.after,
      ),
    ).toBeNull();
  });
});

describe("the curiosity texts", () => {
  it("gives the Spider's dock its one sentence, regeneration, bounty and target", () => {
    const state = curiositiesUiFixtureV7();
    const lines = monsterInfoLinesV7(human(state), unitAt(state, AT.spider).id);
    expect(lines.map((line) => line.id)).toEqual([
      "neutral",
      "regeneration",
      "bounty",
      "provoked",
    ]);
    expect(lines[0]?.name).toBe("Neutral");
    expect(lines[3]?.description).toBe(
      "Will attack your Fighter after this round.",
    );
    for (const line of lines)
      expect(COORDINATE.test(`${line.name} ${line.description}`)).toBe(false);
  });

  it("has one sentence per curiosity, the bounty and the option in Help", () => {
    const rules = curiosityHelpRulesV7();
    expect(rules.map((rule) => rule.icon)).toEqual([
      "WEB",
      "FOUNTAIN",
      "SHRINE",
      "WRECK",
      // Round 2 (bead pulp_wars-737.16).
      "DOWNED_SAUCER",
      "GRAVEYARD",
      "GATE",
      "BIGFOOT",
      "WISHING_WELL",
      "BOUNTY",
      null,
    ]);
    for (const rule of rules) {
      expect(rule.rule.split(". ").length, rule.name).toBeLessThanOrEqual(2);
      expect(COORDINATE.test(rule.rule)).toBe(false);
    }
    for (const id of [
      "WEB",
      "FOUNTAIN",
      "SHRINE",
      "WRECK",
      "DOWNED_SAUCER",
      "GRAVEYARD",
      "GATE",
      "WISHING_WELL",
    ] as const) {
      expect(CURIOSITY_LABELS_V7[id].length).toBeGreaterThan(0);
      expect(CURIOSITY_RULES_V7[id].endsWith(".")).toBe(true);
    }
  });
});
