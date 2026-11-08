import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SWITCHEROO_MIN_RANGE_V7,
  SWITCHEROO_RANGE_V7,
  TENTACLE_MIN_RANGE_V7,
  TENTACLE_RANGE_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { boardMapTargetsV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  TILE_ABILITIES_V7,
  tileActionPlanForSelectionV7,
  type TileActionPlanV7,
} from "../../src/render/canvas/tile-actions-v7";
import {
  CULT_TRICK_KINDS_V7,
  RIBBIT_PREVIEW_V7,
  ribbitCombatNotesV7,
} from "../../src/render/cult-ritual-presentation-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import { glossaryEntryV7 } from "../../src/render/unit-glossary-v7";
import { cultFieldV7, withFrogsV7 } from "../fixtures/v7-cult";
import { applyOkV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { offeredV7, rejectedV7 } from "../fixtures/v7-martian";
import { activeIdV7, at, attackV7 } from "../fixtures/v7-revision20";

// `pulp_wars-n5fa` (7r130): one tile, one meaning for the Cult, by rule
// (docs/product/SIMPLIFICATION_REVIEW_2026-11.md findings 1, 3 and 13). The
// Summoner has no attack (Seize is its attack) and raises a Tentacle 2 or
// 3 tiles away; the Hexer's attack frogs a target it leaves alive (no
// Ribbit command, Attack 1); the Familiar's Switcheroo reaches 2 to 4
// tiles. The field is the two-seat 11 x 11 Cult field of
// tests/fixtures/v7-cult.ts: seat 0 (the Cult, to move) capital (8, 8),
// seat 1 (Human) capital (2, 8), villages (5, 5), (8, 5), (5, 8); every
// other land tile Grass, all of it explored; every technology.

const reach = (from: CoordV7, to: CoordV7): number =>
  Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));

const key = (where: CoordV7): string => `${where.x},${where.y}`;

const fromKey = (text: string): CoordV7 => {
  const [x = 0, y = 0] = text.split(",").map(Number);
  return at(x, y);
};

const activeView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, activeIdV7(state));

/** The selected unit's tile plan and its unarmed board targets. */
function boardOf(
  state: GameStateV7,
  where: CoordV7,
): {
  readonly plan: TileActionPlanV7 | null;
  readonly targets: ReturnType<typeof boardMapTargetsV7>;
} {
  const view = activeView(state);
  const commands = queryPlayerCommandsV7(view);
  const unitId = unitAtV7(state, where).id;
  return {
    plan: tileActionPlanForSelectionV7(view, commands, unitId),
    targets: boardMapTargetsV7(view, commands, {
      selection: { kind: "UNIT", unitId },
      selectedUnitId: unitId,
      selectedAchievement: null,
    }),
  };
}

/**
 * Every tile the selection marks, with the actions each one means; `chosen`
 * lists the tiles that open a chooser (empty when every tile has one
 * meaning).
 */
function meanings(
  state: GameStateV7,
  where: CoordV7,
): {
  readonly tiles: ReadonlyMap<string, readonly string[]>;
  readonly chosen: readonly string[];
} {
  const { plan, targets } = boardOf(state, where);
  const tiles = new Map<string, string[]>();
  const chosen: string[] = [];
  for (const tile of plan?.tiles ?? []) {
    if (tile.chooser) chosen.push(key(tile.at));
    tiles.set(
      key(tile.at),
      tile.actions.map((action) => action.id),
    );
  }
  for (const target of targets)
    if (!tiles.has(key(target.at))) tiles.set(key(target.at), [target.family]);
  return { tiles, chosen };
}

const commandsOf = (state: GameStateV7, where: CoordV7): CommandV7[] => {
  const unitId = unitAtV7(state, where).id;
  return queryPlayerCommandsV7(activeView(state)).filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );
};

/** The active seat plays its one turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
} {
  const actor = activeIdV7(start);
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const decision = chooseNormalCommandV7(view);
    const command = chooseNormalTurnCommandV7(view, accepted, 128, decision);
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
    expect(
      queryAiReadyCommandsV7(view).some(
        (item) => JSON.stringify(item.command) === JSON.stringify(command),
      ),
      command.kind,
    ).toBe(true);
    commands.push(command);
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

describe("the identity (pulp_wars-n5fa)", () => {
  it("was 7r130 after 7r129, whose save key is obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r132");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r132.current");
    expect(PRIOR_RULESET_7_IDS.at(-3)).toBe("pulp-wars-poc-7r129");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-3)).toBe(
      "pulpWars.save.v7r129.current",
    );
  });
});

describe("the Summoner: Seize is its attack (pulp_wars-n5fa)", () => {
  const SUMMONER = at(5, 3);
  /**
   * A Summoner with a broken Human Fighter beside it (held by an Initiate),
   * a healthy Knight beside it, and free tiles all round.
   */
  const summonerField = (): GameStateV7 =>
    cultFieldV7([
      { seat: 0, role: "CAPTAIN", at: SUMMONER },
      { seat: 0, role: "FIGHTER", at: at(7, 4) },
      { seat: 1, role: "FIGHTER", at: at(6, 4), hp: 4 },
      { seat: 1, role: "KNIGHT", at: at(4, 4) },
    ]);

  it("has no attack: Attack 0, Range 0, no ATTACK ability, its body unchanged", () => {
    const rule = effectiveRoleRuleV7("CAPTAIN", "CULT");
    expect(rule.abilities).toEqual([
      "CAPTURE",
      "SACRIFICE",
      "SEIZE",
      "SUMMON",
      "CHANNEL",
      "TENTACLE",
      "JOIN_CHANT",
    ]);
    expect([rule.attack2, rule.range, rule.minimumRange]).toEqual([0, 0, 0]);
    expect([rule.maxHp, rule.defense2, rule.move, rule.cost]).toEqual([
      7, 2, 1, 5,
    ]);
    expect(
      recruitmentRolePresentationV7("CAPTAIN", "CULT").restrictions,
    ).toContain("Can't attack or strike back.");
    expect(glossaryEntryV7("SEIZE").text).toContain("only attack");
  });

  it("is offered no Attack, is rejected when it tries one, and Seizes the broken enemy", () => {
    const state = summonerField();
    const summoner = unitAtV7(state, SUMMONER).id;
    const broken = unitAtV7(state, at(6, 4)).id;
    expect(
      commandsOf(state, SUMMONER).filter(
        (command) => command.kind === "ATTACK",
      ),
    ).toEqual([]);
    expect(
      rejectedV7(state, {
        kind: "ATTACK",
        unitId: summoner,
        targetUnitId: broken,
      }),
    ).toEqual({ code: "ATTACK_NOT_LEGAL", params: { reason: "NO_ATTACK" } });
    expect(commandsOf(state, SUMMONER)).toContainEqual({
      kind: "SEIZE",
      unitId: summoner,
      victimUnitId: broken,
    });
  });

  it("never strikes back: an attack on it gets no retaliation", () => {
    const state = cultFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "CAPTAIN", at: SUMMONER },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    );
    const fighter = unitAtV7(state, at(4, 3));
    const result = applyCommandV7(state, activeIdV7(state), {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: unitAtV7(state, SUMMONER).id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    const resolved = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(resolved.preview).toMatchObject({
      defenderDies: false,
      retaliation: false,
      damageToAttacker: 0,
    });
    expect(unitAtV7(result.state, at(4, 3)).hp).toBe(fighter.hp);
  });

  it("raises a Tentacle 2 or 3 tiles away: never on the tile next to it", () => {
    expect([TENTACLE_MIN_RANGE_V7, TENTACLE_RANGE_V7]).toEqual([2, 3]);
    const state = summonerField();
    const summoner = unitAtV7(state, SUMMONER).id;
    const tentacles = commandsOf(state, SUMMONER).flatMap((command) =>
      command.kind === "TENTACLE" ? [command.at] : [],
    );
    expect(tentacles.length).toBeGreaterThan(0);
    for (const where of tentacles) {
      expect(reach(SUMMONER, where), key(where)).toBeGreaterThanOrEqual(2);
      expect(reach(SUMMONER, where), key(where)).toBeLessThanOrEqual(3);
    }
    expect(tentacles).toContainEqual(at(5, 1));
    expect(tentacles).toContainEqual(at(8, 3));
    expect(
      rejectedV7(state, { kind: "TENTACLE", unitId: summoner, at: at(5, 2) }),
    ).toEqual({ code: "TENTACLE_NOT_LEGAL", params: { reason: "TILE" } });
  });

  it("gives each tile one meaning: Seize on the broken enemy, no Tentacle beside it", () => {
    const { tiles } = meanings(summonerField(), SUMMONER);
    // The broken Fighter means Seize alone (no Attack beside it).
    expect(tiles.get("6,4")).toEqual(["SEIZE"]);
    // The healthy Knight is no target: the Summoner has no attack.
    expect(tiles.has("4,4")).toBe(false);
    // A free neighbouring tile carries no Tentacle (summons are kept).
    for (const [where, ids] of tiles)
      if (reach(SUMMONER, fromKey(where)) === 1)
        expect(ids, where).not.toContain("TENTACLE");
    // A tile 2 away means the Tentacle alone (the Summoner walks 1).
    expect(tiles.get("5,1")).toEqual(["TENTACLE"]);
    expect(tiles.get("3,3")).toEqual(["TENTACLE"]);
  });
});

describe("the Hexer: its attack frogs (pulp_wars-n5fa)", () => {
  const HEXER = at(5, 2);

  it("has Attack 1 at Range 2, and no Ribbit command, button, or badge", () => {
    const rule = effectiveRoleRuleV7("MARKSMAN", "CULT");
    expect([rule.attack2, rule.range, rule.maxHp, rule.cost]).toEqual([
      2, 2, 7, 3,
    ]);
    expect(rule.abilities).toContain("RIBBIT");
    expect(CULT_TRICK_KINDS_V7 as readonly string[]).not.toContain("RIBBIT");
    expect(TILE_ABILITIES_V7.map((ability) => ability.id)).not.toContain(
      "RIBBIT",
    );
    const state = cultFieldV7([
      { seat: 0, role: "MARKSMAN", at: HEXER },
      { seat: 1, role: "KNIGHT", at: at(5, 4) },
    ]);
    expect(offeredV7(state).map((command) => command.kind)).not.toContain(
      "RIBBIT",
    );
    expect(
      rejectedV7(state, {
        kind: "RIBBIT",
        unitId: unitAtV7(state, HEXER).id,
        targetUnitId: unitAtV7(state, at(5, 4)).id,
      } as unknown as CommandV7).code,
    ).toBe("INVALID_COMMAND");
  });

  it("frogs a survivor, and its preview says so", () => {
    const state = cultFieldV7([
      { seat: 0, role: "MARKSMAN", at: HEXER },
      { seat: 1, role: "KNIGHT", at: at(5, 4) },
    ]);
    const shot = attackV7(state, HEXER, at(5, 4));
    expect(shot.preview.ribbitApplied).toBe(true);
    expect(ribbitCombatNotesV7(shot.preview)).toEqual([RIBBIT_PREVIEW_V7]);
    expect(RIBBIT_PREVIEW_V7).toBe("Ribbit: target becomes a frog");
    expect(shot.state.cult.frogs).toEqual([unitAtV7(state, at(5, 4)).id]);
    expect(shot.state.cult.hexCooldowns).toEqual([]);
  });

  it("does not frog a giant: it just takes the damage", () => {
    const state = cultFieldV7([
      { seat: 0, role: "MARKSMAN", at: HEXER },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 4) },
    ]);
    const shot = attackV7(state, HEXER, at(5, 4));
    expect(shot.combat.ribbitApplied).toBe(false);
    expect(ribbitCombatNotesV7(shot.preview)).toEqual([]);
    expect(shot.target?.hp).toBeLessThan(unitAtV7(state, at(5, 4)).hp);
    expect(shot.state.cult.frogs).toEqual([]);
  });

  it("does not frog a unit that is a frog already", () => {
    const state = withFrogsV7(
      cultFieldV7([
        { seat: 0, role: "MARKSMAN", at: HEXER },
        { seat: 1, role: "KNIGHT", at: at(5, 4) },
      ]),
      [at(5, 4)],
    );
    const preview = queryCombatPreviewV7(
      activeView(state),
      unitAtV7(state, HEXER).id,
      unitAtV7(state, at(5, 4)).id,
    );
    expect(preview?.ribbitApplied).toBe(false);
  });

  it("does not frog by a strike back", () => {
    const state = cultFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: HEXER },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    );
    const struck = attackV7(state, at(5, 3), HEXER);
    expect(struck.combat).toMatchObject({
      retaliation: true,
      ribbitApplied: false,
    });
    expect(struck.combat.damageToAttacker).toBeGreaterThan(0);
    expect(struck.state.cult.frogs).toEqual([]);
  });

  it("gives the target one meaning: Attack", () => {
    const state = cultFieldV7([
      { seat: 0, role: "MARKSMAN", at: HEXER },
      { seat: 1, role: "KNIGHT", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(4, 3) },
    ]);
    const { tiles, chosen } = meanings(state, HEXER);
    expect(chosen).toEqual([]);
    expect(tiles.get("5,4")).toEqual(["ATTACK"]);
    expect(tiles.get("4,3")).toEqual(["ATTACK"]);
  });
});

describe("the Familiar: Switcheroo reaches 2 to 4 (pulp_wars-n5fa)", () => {
  const FAMILIAR = at(5, 2);
  const familiarField = (): GameStateV7 =>
    cultFieldV7([
      { seat: 0, role: "RAIDER", at: FAMILIAR },
      // A neighbour enemy, one 2 away, one 4 away, and an own unit beside.
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      { seat: 1, role: "FIGHTER", at: at(3, 4) },
      { seat: 1, role: "FIGHTER", at: at(9, 2) },
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
    ]);
  const swapsOf = (state: GameStateV7) =>
    commandsOf(state, FAMILIAR).flatMap((command) =>
      command.kind === "SWITCHEROO" ? [command.targetUnitId] : [],
    );

  it("is not offered at distance 1, and is at 2 and 4", () => {
    expect([SWITCHEROO_MIN_RANGE_V7, SWITCHEROO_RANGE_V7]).toEqual([2, 4]);
    const state = familiarField();
    const id = (where: CoordV7) => unitAtV7(state, where).id;
    expect(swapsOf(state).sort((left, right) => left - right)).toEqual(
      [id(at(3, 4)), id(at(9, 2))].sort((left, right) => left - right),
    );
    for (const neighbour of [at(6, 3), at(4, 2)])
      expect(
        rejectedV7(state, {
          kind: "SWITCHEROO",
          unitId: id(FAMILIAR),
          targetUnitId: id(neighbour),
        }),
      ).toEqual({
        code: "SWITCHEROO_NOT_LEGAL",
        params: { reason: "RANGE" },
      });
  });

  it("gives each tile one meaning: Attack on the neighbour, Switcheroo farther", () => {
    const { tiles, chosen } = meanings(familiarField(), FAMILIAR);
    expect(tiles.get("6,3")).toEqual(["ATTACK"]);
    expect(tiles.get("3,4")).toEqual(["SWITCHEROO"]);
    expect(tiles.get("9,2")).toEqual(["SWITCHEROO"]);
    // An own neighbour carries no Switcheroo badge (it is Select).
    expect(tiles.get("4,2") ?? []).not.toContain("SWITCHEROO");
    expect(chosen).toEqual([]);
  });
});

describe("the Normal AI follows the new rules (pulp_wars-n5fa)", () => {
  it("the Summoner Seizes a broken enemy and never attacks", () => {
    const state = cultFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(7, 4) },
        { seat: 1, role: "FIGHTER", at: at(6, 4), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    const summoner = unitAtV7(state, at(5, 3)).id;
    const victim = unitAtV7(state, at(6, 4)).id;
    const turn = policyTurn(state);
    expect(turn.commands).toContainEqual({
      kind: "SEIZE",
      unitId: summoner,
      victimUnitId: victim,
    });
    expect(
      turn.commands.filter(
        (command) => command.kind === "ATTACK" && command.unitId === summoner,
      ),
    ).toEqual([]);
    expect(turn.state.units.some((unit) => unit.id === victim)).toBe(false);
  });

  it("the Hexer shoots, and the shot frogs its target", () => {
    const state = cultFieldV7(
      [
        { seat: 0, role: "MARKSMAN", at: at(5, 2) },
        { seat: 1, role: "KNIGHT", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    const hexer = unitAtV7(state, at(5, 2)).id;
    const knight = unitAtV7(state, at(5, 4)).id;
    const preview = queryCombatPreviewV7(activeView(state), hexer, knight);
    expect(preview?.ribbitApplied).toBe(true);
    const turn = policyTurn(state);
    expect(turn.commands.map((command) => command.kind)).not.toContain(
      "RIBBIT",
    );
    expect(turn.commands).toContainEqual({
      kind: "ATTACK",
      unitId: hexer,
      targetUnitId: knight,
    });
    expect(turn.state.cult.frogs).toEqual([knight]);
  });

  it("the Familiar never swaps with a neighbour", () => {
    // A broken enemy right beside the Familiar, with a Summoner and a
    // holder that have moved: a swap would have pulled it before 7r130.
    const state = cultFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(7, 3) },
        { seat: 0, role: "CAPTAIN", at: at(8, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 4) },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { coins: 0 },
    );
    expect(
      commandsOf(state, at(7, 3)).filter(
        (command) => command.kind === "SWITCHEROO",
      ),
    ).toEqual([]);
    const turn = policyTurn(state);
    expect(
      turn.commands.filter((command) => command.kind === "SWITCHEROO"),
    ).toEqual([]);
  });
});
