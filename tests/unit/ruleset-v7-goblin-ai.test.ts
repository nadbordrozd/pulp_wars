import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  goblinArenaV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Revision 17 Normal AI Goblin play (`pulp_wars-0ao.6`,
// docs/product/RULESET_7_REVISION_17_GOBLINS.md section 10). Two-seat arena
// (seed-2 Dry Land, 11 x 11): seat 0 capital (8, 8), seat 1 capital (2, 8),
// villages (5, 5), (8, 5), (5, 8); every tile explored, every technology
// researched unless stated.

const at = (x: number, y: number): CoordV7 => ({ x, y });

function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  options: GoblinArenaOptionsV7 = {},
): { readonly state: GameStateV7; readonly view: PlayerViewV7 } {
  const state = goblinArenaV7(factions, pieces, options);
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return { state, view: viewForV7(state, actor) };
}

function unitCandidates(
  decision: NormalAiDecisionV7,
  unitId: UnitId,
): readonly CommandV7[] {
  return decision.candidates
    .map((candidate) => candidate.command)
    .filter((command) => "unitId" in command && command.unitId === unitId);
}

const move = (unitId: UnitId, ...path: CoordV7[]): CommandV7 => ({
  kind: "MOVE",
  unitId,
  path,
});

describe("ruleset-7 revision-17 Normal AI: public boundary", () => {
  it("keeps the Goblin helpers on public-view, query, and preview imports", () => {
    const source = readFileSync("src/ai/v7-goblin.ts", "utf8");
    expect(
      [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]),
    ).toEqual([
      "../engine/model/ids",
      "../engine/rules/ruleset-v7",
      "../engine/v7/query",
      "../engine/v7/types",
      "../engine/v7/view",
    ]);
    expect(source).not.toMatch(/GameStateV7|random|Math\.random|Date\.now/);
  });
});

describe("ruleset-7 revision-17 Normal AI: Kaboom", () => {
  it("takes a Kaboom that kills several wounded enemies over a single kill", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(3, 2), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 4 },
        { seat: 1, role: "MARKSMAN", at: at(4, 3), hp: 4 },
      ],
    );
    const goblin = unitAtV7(state, at(4, 2)).id;
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: goblin };
    const score = scoreCommandV7(view, kaboom);
    expect(score.priority).toBe(1181);
    expect(score.strategicValue).toBeGreaterThan(0);
    const decision = chooseNormalCommandV7(view);
    expect(unitCandidates(decision, goblin)[0]).toEqual(kaboom);
    // Every single-target attack (a kill each) ranks below it.
    for (const command of unitCandidates(decision, goblin).slice(1))
      expect(command.kind).not.toBe("KABOOM");
  });

  it("declines a net-negative Kaboom that mostly hits its own horde", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 0, role: "FIGHTER", at: at(3, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
    );
    const decision = chooseNormalCommandV7(view);
    expect(
      decision.candidates.some(
        (candidate) => candidate.command.kind === "KABOOM",
      ),
    ).toBe(false);
    for (const where of [at(4, 2), at(3, 2), at(5, 2)])
      expect(
        scoreCommandV7(view, {
          kind: "KABOOM",
          unitId: unitAtV7(state, where).id,
        }).priority,
      ).toBe(-1);
  });

  it("declines a lone Kaboom against one healthy enemy", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "GUARD", at: at(4, 3) },
      ],
    );
    expect(
      scoreCommandV7(view, {
        kind: "KABOOM",
        unitId: unitAtV7(state, at(4, 2)).id,
      }).priority,
    ).toBe(-1);
  });

  it("Kabooms a unit visible enemies would kill anyway when it still pays", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2), hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
    );
    const goblin = unitAtV7(state, at(4, 2)).id;
    const score = scoreCommandV7(view, { kind: "KABOOM", unitId: goblin });
    expect(score.priority).toBe(935);
    expect(unitCandidates(chooseNormalCommandV7(view), goblin)[0]).toEqual({
      kind: "KABOOM",
      unitId: goblin,
    });
  });

  it("clears a hostile city center for an adjacent capturer", () => {
    // Seat 1's capital (2, 8) is held by a wounded Fighter; a Goblin next to
    // it Kabooms and a Wolf Rider stands ready to capture.
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(3, 7) },
        { seat: 0, role: "RAIDER", at: at(1, 7) },
        { seat: 1, role: "FIGHTER", at: at(2, 8), hp: 3 },
      ],
    );
    const goblin = unitAtV7(state, at(3, 7)).id;
    expect(
      scoreCommandV7(view, { kind: "KABOOM", unitId: goblin }).priority,
    ).toBe(1347);
  });
});

describe("ruleset-7 revision-17 Normal AI: Bomb Chucker friendly fire", () => {
  it("does not bomb a target next to its own Goblins, and bombs a clear one", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(3, 1) },
        { seat: 0, role: "FIGHTER", at: at(5, 1) },
        { seat: 1, role: "FIGHTER", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 4) },
      ],
    );
    const chucker = unitAtV7(state, at(4, 4)).id;
    const clumped = unitAtV7(state, at(4, 2)).id;
    const clear = unitAtV7(state, at(6, 4)).id;
    const offered = queryPlayerCommandsV7(view);
    const bombClumped: CommandV7 = {
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: clumped,
    };
    expect(offered).toContainEqual(bombClumped);
    const splash = queryCombatPreviewV7(view, chucker, clumped)?.splash ?? [];
    expect(splash.map((entry) => entry.unitId).sort()).toEqual(
      [unitAtV7(state, at(3, 1)).id, unitAtV7(state, at(5, 1)).id].sort(),
    );
    const candidates = unitCandidates(chooseNormalCommandV7(view), chucker);
    expect(candidates).not.toContainEqual(bombClumped);
    expect(candidates).toContainEqual({
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: clear,
    });
    // The friendly splash is a cost in the score, not a gain.
    expect(scoreCommandV7(view, bombClumped).immediateValue).toBeLessThan(
      scoreCommandV7(view, {
        kind: "ATTACK",
        unitId: chucker,
        targetUnitId: clear,
      }).immediateValue,
    );
  });

  it("still bombs when the kill is clearly worth a little friendly splash", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(3, 1) },
        { seat: 1, role: "KNIGHT", at: at(4, 2), hp: 2 },
      ],
    );
    const chucker = unitAtV7(state, at(4, 4)).id;
    const knight = unitAtV7(state, at(4, 2)).id;
    expect(unitCandidates(chooseNormalCommandV7(view), chucker)).toContainEqual(
      { kind: "ATTACK", unitId: chucker, targetUnitId: knight },
    );
  });
});

// `pulp_wars-0ao.13`: the 0ao.7 matrix found 46.4% of bomb-splash deaths
// were the Bomb Chucker's own units. Friendly fire stays a rule; the Normal
// AI throws such bombs only for a kill, prefers clean bombs, and keeps its
// units out of the way.
describe("ruleset-7 revision-17 Normal AI: careful Bomb Chuckers", () => {
  const acted = {
    moved: true,
    movedPathLength: 1,
    attacked: true,
    attacksUsed: 1,
    handled: true,
  };

  it("declines a chip bomb whose splash kills an own unit, whatever it hits", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(3, 1), hp: 1, activation: acted },
        { seat: 1, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
        { seat: 1, role: "FIGHTER", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
    );
    const chucker = unitAtV7(state, at(4, 4)).id;
    const goblin = unitAtV7(state, at(3, 1)).id;
    const guard = unitAtV7(state, at(4, 2)).id;
    const clear = unitAtV7(state, at(5, 2)).id;
    // The Guard survives; the bomb hits four enemies (worth more than twice
    // the 1-HP Goblin, which the trade-factor rule alone accepted) and kills
    // the Goblin.
    const preview = queryCombatPreviewV7(view, chucker, guard);
    expect(preview?.defenderDies).toBe(false);
    expect(preview?.splash).toHaveLength(5);
    expect(preview?.splash).toContainEqual(
      expect.objectContaining({ unitId: goblin, dies: true }),
    );
    const candidates = unitCandidates(chooseNormalCommandV7(view), chucker);
    expect(candidates).not.toContainEqual({
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: guard,
    });
    expect(candidates).not.toContainEqual({
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: unitAtV7(state, at(3, 2)).id,
    });
    // The bomb that splashes only enemies stays.
    expect(candidates).toContainEqual({
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: clear,
    });
  });

  it("bombs a kill that splashes a friend, but kills one only to kill more enemies", () => {
    const bombOf = (
      pieces: readonly GoblinPieceV7[],
      target: CoordV7,
      from: CoordV7 = at(4, 4),
    ) => {
      const { state, view } = arena(
        ["GOBLIN", "ORIGINAL"],
        [{ seat: 0, role: "MARKSMAN", at: from }, ...pieces],
      );
      const chucker = unitAtV7(state, from).id;
      const bomb: CommandV7 = {
        kind: "ATTACK",
        unitId: chucker,
        targetUnitId: unitAtV7(state, target).id,
      };
      return {
        bomb,
        view,
        preview: queryCombatPreviewV7(view, chucker, bomb.targetUnitId),
        taken: unitCandidates(chooseNormalCommandV7(view), chucker).some(
          (command) => JSON.stringify(command) === JSON.stringify(bomb),
        ),
      };
    };
    const knight: GoblinPieceV7 = {
      seat: 1,
      role: "KNIGHT",
      at: at(4, 2),
      hp: 2,
    };
    // The kill chips a full-HP Goblin: taken, below a clean kill (1180).
    const chip = bombOf(
      [{ seat: 0, role: "FIGHTER", at: at(3, 1), activation: acted }, knight],
      at(4, 2),
    );
    expect(chip.preview).toMatchObject({
      defenderDies: true,
      splash: [expect.objectContaining({ dies: false })],
    });
    expect(chip.taken).toBe(true);
    expect(scoreCommandV7(chip.view, chip.bomb).priority).toBe(1177);
    // The kill would also kill a 1-HP Goblin: one for one is declined, even
    // though the Knight is worth more than twice the Goblin.
    const wounded: GoblinPieceV7 = {
      seat: 0,
      role: "FIGHTER",
      at: at(3, 1),
      hp: 1,
      activation: acted,
    };
    const oneForOne = bombOf([wounded, knight], at(4, 2));
    expect(oneForOne.preview).toMatchObject({
      defenderDies: true,
      splash: [expect.objectContaining({ dies: true })],
    });
    expect(oneForOne.taken).toBe(false);
    // The same bomb also killing a second enemy is taken.
    const twoForOne = bombOf(
      [wounded, knight, { seat: 1, role: "FIGHTER", at: at(5, 1), hp: 1 }],
      at(4, 2),
    );
    expect(
      twoForOne.preview?.splash.filter((entry) => entry.dies),
    ).toHaveLength(2);
    expect(twoForOne.taken).toBe(true);
    // Clearing a hostile city center (seat 1's capital) does not excuse
    // killing the friend.
    const center = bombOf(
      [
        { ...wounded, at: at(3, 7) },
        { ...knight, at: at(2, 8) },
      ],
      at(2, 8),
      at(2, 6),
    );
    expect(center.preview?.defenderDies).toBe(true);
    expect(center.taken).toBe(false);
  });

  it("prefers another target whose bomb splashes no own unit", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(3, 1), activation: acted },
        { seat: 1, role: "KNIGHT", at: at(4, 2), hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(6, 4), hp: 1 },
      ],
      { coins: 0 },
    );
    const chucker = unitAtV7(state, at(4, 4)).id;
    const knight = unitAtV7(state, at(4, 2)).id;
    const clear = unitAtV7(state, at(6, 4)).id;
    const fouled: CommandV7 = {
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: knight,
    };
    const clean: CommandV7 = {
      kind: "ATTACK",
      unitId: chucker,
      targetUnitId: clear,
    };
    // Both bombs kill; the Knight is worth more, but its bomb chips the
    // Goblin next to it.
    expect(queryCombatPreviewV7(view, chucker, knight)?.splash).toEqual([
      expect.objectContaining({
        unitId: unitAtV7(state, at(3, 1)).id,
        dies: false,
      }),
    ]);
    expect(scoreCommandV7(view, fouled).strategicValue).toBeGreaterThan(
      scoreCommandV7(view, clean).strategicValue,
    );
    expect(chooseNormalCommandV7(view).command).toEqual(clean);
  });

  it("moves first to bomb a clean target when its only kill splashes a friend", () => {
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(3, 1), activation: acted },
        { seat: 1, role: "KNIGHT", at: at(4, 2), hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(7, 4), hp: 1 },
      ],
      { coins: 0 },
    );
    const chucker = unitAtV7(state, at(4, 4)).id;
    const far = unitAtV7(state, at(7, 4)).id;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("active player missing");
    const first = chooseNormalCommandV7(viewForV7(state, actor));
    expect(first.command).toMatchObject({ kind: "MOVE", unitId: chucker });
    // The Goblin pass, correction (`pulp_wars-w49.12`): the Move is to a
    // throw the army rules accept (1187; 1179 before).
    expect(first.candidates[0]?.score.priority).toBe(1187);
    if (first.command === null) throw new Error("no command chosen");
    const moved = applyCommandV7(state, actor, first.command);
    if (!moved.accepted) throw new Error(moved.error.code);
    expect(
      unitCandidates(
        chooseNormalCommandV7(viewForV7(moved.state, actor)),
        chucker,
      )[0],
    ).toEqual({ kind: "ATTACK", unitId: chucker, targetUnitId: far });
  });

  it("keeps a wounded Goblin from stepping next to its Bomb Chucker's target", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        {
          seat: 0,
          role: "MARKSMAN",
          at: at(4, 5),
          activation: { attacked: true, attacksUsed: 1 },
        },
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(2, 3), hp: 2 },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
    );
    const goblin = unitAtV7(state, at(2, 3)).id;
    const chucker = unitAtV7(state, at(4, 4)).id;
    const guard = unitAtV7(state, at(4, 2)).id;
    // A Gang Up helper step next to the Guard (905 before `0ao.13`) would
    // stand in the bomb's splash, which kills a 2-HP Goblin.
    const splash = Math.ceil(
      (queryCombatPreviewV7(view, chucker, guard)?.damageToDefender ?? 0) / 2,
    );
    expect(splash).toBeGreaterThanOrEqual(2);
    expect(scoreCommandV7(view, move(goblin, at(3, 3))).priority).toBe(-1);
    // Its other advance, out of the splash, is unchanged.
    expect(scoreCommandV7(view, move(goblin, at(3, 4))).priority).toBe(700);
    expect(unitCandidates(chooseNormalCommandV7(view), chucker)).toContainEqual(
      { kind: "ATTACK", unitId: chucker, targetUnitId: guard },
    );
  });
});

describe("ruleset-7 revision-17 Normal AI: Gang Up", () => {
  // `pulp_wars-0ao.7` lowered the Goblin's Attack to 1.5: a Goblin no longer
  // attacks a full-HP Guard even with Gang Up (it chips it with a Kaboom),
  // so the targets are Fighters.
  it("moves a helper next to the target before the attack", () => {
    const { state } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: at(3, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 6 },
      ],
      { coins: 0 },
    );
    const helper = unitAtV7(state, at(3, 1)).id;
    const target = unitAtV7(state, at(5, 2)).id;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("active player missing");
    let current = state;
    const gangUps: number[] = [];
    let helperMovedFirst: boolean | null = null;
    for (let step = 0; step < 40; step += 1) {
      const view = viewForV7(current, actor);
      const command = chooseNormalCommandV7(view).command;
      if (command === null || command.kind === "END_TURN") break;
      if (
        helperMovedFirst === null &&
        command.kind === "MOVE" &&
        command.unitId === helper
      )
        helperMovedFirst = true;
      if (command.kind === "ATTACK" && command.targetUnitId === target) {
        helperMovedFirst ??= false;
        gangUps.push(
          queryCombatPreviewV7(view, command.unitId, target)?.gangUp ?? -1,
        );
      }
      const result = applyCommandV7(current, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      current = result.state;
    }
    expect(helperMovedFirst).toBe(true);
    expect(gangUps.length).toBeGreaterThan(0);
    expect(gangUps[0]).toBeGreaterThanOrEqual(1);
  });

  it("values targets by the Gang Up its attack gets", () => {
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 0, role: "GUARD", at: at(3, 1) },
        { seat: 1, role: "FIGHTER", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ],
    );
    const goblin = unitAtV7(state, at(4, 3)).id;
    const helped = unitAtV7(state, at(3, 2)).id;
    const alone = unitAtV7(state, at(5, 4)).id;
    expect(queryCombatPreviewV7(view, goblin, helped)?.gangUp).toBe(1);
    expect(queryCombatPreviewV7(view, goblin, alone)?.gangUp).toBe(0);
    const candidates = unitCandidates(chooseNormalCommandV7(view), goblin);
    const helpedIndex = candidates.findIndex(
      (command) => command.kind === "ATTACK" && command.targetUnitId === helped,
    );
    const aloneIndex = candidates.findIndex(
      (command) => command.kind === "ATTACK" && command.targetUnitId === alone,
    );
    expect(helpedIndex).toBeGreaterThanOrEqual(0);
    if (aloneIndex >= 0) expect(helpedIndex).toBeLessThan(aloneIndex);
  });

  it("counts Gang Up in the threat a hostile Goblin poses", () => {
    // A Human Fighter stepping next to a Goblin with two Goblin helpers
    // around that tile is judged far more exposed than next to a lone one.
    const lone = arena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(2, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
    );
    const ganged = arena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(2, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "GUARD", at: at(4, 4) },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
    );
    const step = move(unitAtV7(lone.state, at(2, 3)).id, at(3, 3));
    expect(scoreCommandV7(ganged.view, step).safetyValue).toBeLessThan(
      scoreCommandV7(lone.view, step).safetyValue,
    );
  });
});

describe("ruleset-7 revision-17 Normal AI: exploder spacing", () => {
  // Tuning 7 (`pulp_wars-w49.10`): three Swordsmen stand in front of the
  // enemy capital and a Goblin Fighter on each village. Alone against one
  // Fighter the two Goblins commit (a committed unit is not held back by
  // the exploder spacing, and a fast one waits for the slow ones), and the
  // Wolf Rider, the fastest capturer, is sent to a village or to raid the
  // empty capital: then no other Move of it is a candidate.
  const pieces = (enemyAt: CoordV7): GoblinPieceV7[] => [
    { seat: 0, role: "CATAPULT", at: at(2, 3), hp: 2 },
    { seat: 0, role: "RAIDER", at: at(4, 2) },
    { seat: 1, role: "FIGHTER", at: enemyAt },
    { seat: 1, role: "SWORDSMAN", at: at(2, 7) },
    { seat: 1, role: "SWORDSMAN", at: at(1, 7) },
    { seat: 1, role: "SWORDSMAN", at: at(3, 7) },
    { seat: 0, role: "FIGHTER", at: at(5, 5) },
    { seat: 0, role: "FIGHTER", at: at(8, 5) },
    { seat: 0, role: "FIGHTER", at: at(5, 8) },
  ];

  it("keeps units off a Rocket Cart that visible enemies can kill", () => {
    const { state, view } = arena(["GOBLIN", "ORIGINAL"], pieces(at(2, 5)));
    const rider = unitAtV7(state, at(4, 2)).id;
    const next = scoreCommandV7(view, move(rider, at(3, 3)));
    expect(next.priority).toBe(-1);
    expect(next.strategicValue).toBeLessThan(0);
    expect(
      scoreCommandV7(view, move(rider, at(4, 3))).priority,
    ).toBeGreaterThanOrEqual(0);
  });

  it("does not park a killable Rocket Cart inside a Goblin clump", () => {
    const cart = (enemyAt: CoordV7) =>
      arena(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role: "CATAPULT", at: at(4, 2), hp: 3 },
          { seat: 0, role: "FIGHTER", at: at(2, 4) },
          { seat: 0, role: "FIGHTER", at: at(3, 5) },
          { seat: 1, role: "FIGHTER", at: enemyAt },
        ],
      );
    const near = cart(at(4, 5));
    const rocket = unitAtV7(near.state, at(4, 2)).id;
    // (3, 3) is next to the Goblin at (2, 4); (4, 3) is alone. Tuning 5
    // (`pulp_wars-w49.4`): army play walks no siege unit into lethal reach
    // either, so the lone tile is refused as well (it was allowed).
    expect(scoreCommandV7(near.view, move(rocket, at(3, 3))).priority).toBe(-1);
    expect(scoreCommandV7(near.view, move(rocket, at(4, 3))).priority).toBe(-1);
    // Tuning 6 (`pulp_wars-w49.6`): the far enemy stands outside the nine
    // tiles of an assault (at (9, 0) the three units commit against it, and
    // a committed unit makes no Move away from its position).
    const far = cart(at(10, 2));
    // Since the Rocket Cart captures (`pulp_wars-ke95`) its errand lies
    // east, and it makes no Move west into the clump at (3, 3) with either
    // enemy; the far enemy still allows the Move toward the errand, (5, 3),
    // that the near one refuses. (Before, the far enemy allowed (3, 3).)
    expect(scoreCommandV7(near.view, move(rocket, at(5, 3))).priority).toBe(-1);
    expect(
      scoreCommandV7(far.view, move(rocket, at(5, 3))).priority,
    ).toBeGreaterThanOrEqual(0);
  });

  it("lets units pass a Rocket Cart no visible enemy can reach", () => {
    const { state, view } = arena(["GOBLIN", "ORIGINAL"], pieces(at(2, 9)));
    const rider = unitAtV7(state, at(4, 2)).id;
    expect(
      scoreCommandV7(view, move(rider, at(3, 3))).priority,
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("ruleset-7 revision-17 Normal AI: against Goblins", () => {
  const pieces = (hostileRole: "FIGHTER" | "GUARD"): GoblinPieceV7[] => [
    { seat: 0, role: "FIGHTER", at: at(2, 3) },
    { seat: 0, role: "FIGHTER", at: at(4, 5) },
    { seat: 1, role: hostileRole, at: at(5, 3) },
  ];

  it("does not clump inside the reach of a profitable hostile Kaboom", () => {
    const { state, view } = arena(["ORIGINAL", "GOBLIN"], pieces("FIGHTER"));
    const fighter = unitAtV7(state, at(2, 3)).id;
    const clump = scoreCommandV7(view, move(fighter, at(3, 4)));
    // Tuning 6 (`pulp_wars-w49.6`): the two Fighters commit against the one
    // Goblin, so the Move carries the value of its attack; the priority
    // still refuses it.
    expect(clump.priority).toBe(-1);
    expect(
      scoreCommandV7(view, move(fighter, at(2, 4))).priority,
    ).toBeGreaterThanOrEqual(0);
  });

  it("does clump next to a Goblin unit that cannot Kaboom", () => {
    const { state, view } = arena(["ORIGINAL", "GOBLIN"], pieces("GUARD"));
    const fighter = unitAtV7(state, at(2, 3)).id;
    expect(
      scoreCommandV7(view, move(fighter, at(3, 4))).priority,
    ).toBeGreaterThanOrEqual(0);
  });

  it("declines a kill whose death blast would kill its own units", () => {
    const blast = (neighbourHp: number) =>
      arena(
        ["ORIGINAL", "GOBLIN"],
        [
          { seat: 0, role: "FIGHTER", at: at(4, 3) },
          { seat: 0, role: "FIGHTER", at: at(3, 3), hp: neighbourHp },
          { seat: 0, role: "FIGHTER", at: at(5, 3), hp: neighbourHp },
          { seat: 1, role: "MARKSMAN", at: at(4, 2), hp: 1 },
        ],
      );
    // The Bomb Chucker's death blast is 5 (`pulp_wars-w49.35`; 2 since
    // `pulp_wars-0ao.7`, 3 before).
    const weak = blast(2);
    const attacker = unitAtV7(weak.state, at(4, 3)).id;
    const chucker = unitAtV7(weak.state, at(4, 2)).id;
    const kill: CommandV7 = {
      kind: "ATTACK",
      unitId: attacker,
      targetUnitId: chucker,
    };
    expect(queryPlayerCommandsV7(weak.view)).toContainEqual(kill);
    expect(
      chooseNormalCommandV7(weak.view).candidates.some(
        (candidate) =>
          candidate.command.kind === "ATTACK" &&
          candidate.command.targetUnitId === chucker,
      ),
    ).toBe(false);
    // With no own unit in the blast (an Archer shoots from two tiles and
    // does not advance) the kill is taken. Before `pulp_wars-w49.35` a
    // melee kill beside healthy neighbours was taken too; a blast of 5 on
    // the advancing attacker and its neighbours now outweighs a 1-HP Bomb
    // Chucker in the Normal AI's trade (no AI tuning in that bead).
    const clear = arena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4) },
        { seat: 1, role: "MARKSMAN", at: at(4, 2), hp: 1 },
      ],
    );
    const archer = unitAtV7(clear.state, at(4, 4)).id;
    expect(
      unitCandidates(chooseNormalCommandV7(clear.view), archer),
    ).toContainEqual({
      kind: "ATTACK",
      unitId: archer,
      targetUnitId: unitAtV7(clear.state, at(4, 2)).id,
    });
  });

  it("gives an embarked Goblin no landing-then-Kaboom reach (pulp_wars-0ao.15)", () => {
    const { state, view } = arena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(0, 1), form: "EMBARKED" },
      ],
      { water: [at(0, 0), at(0, 1), at(0, 2), at(1, 0)] },
    );
    const embarked = unitAtV7(state, at(0, 1));
    const reach = publicThreatenedTilesForPolicyV7(view, embarked);
    // Landing on (1, 1) or (1, 2) ends its activation, so it cannot blast
    // the cells around a landing cell this turn: like any embarked unit it
    // is modelled by its attack range from where it floats.
    expect(reach).not.toContainEqual(at(2, 2));
    expect(reach).not.toContainEqual(at(4, 2));
    for (const tile of reach)
      expect(Math.max(Math.abs(tile.x - 0), Math.abs(tile.y - 1))).toBe(1);
  });
});

describe("ruleset-7 revision-17 Normal AI: WAAAGH!, Troll, Plunder", () => {
  it("uses WAAAGH! only when two units in its radius can attack", () => {
    const pieces = (enemyAt: CoordV7): GoblinPieceV7[] => [
      { seat: 0, role: "CAPTAIN", at: at(4, 4) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
      { seat: 0, role: "CATAPULT", at: at(6, 4) },
      { seat: 1, role: "FIGHTER", at: enemyAt },
    ];
    const near = arena(["GOBLIN", "ORIGINAL"], pieces(at(4, 2)));
    const warboss = unitAtV7(near.state, at(4, 4)).id;
    expect(
      scoreCommandV7(near.view, { kind: "RALLY", unitId: warboss }).priority,
    ).toBe(1235);
    const far = arena(["GOBLIN", "ORIGINAL"], pieces(at(9, 0)));
    expect(
      scoreCommandV7(far.view, { kind: "RALLY", unitId: warboss }).priority,
    ).toBe(-1);
  });

  it("keeps a wounded Troll fighting where a Juggernaut would recover", () => {
    const troll = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(4, 2), hp: 15 },
        { seat: 1, role: "FIGHTER", at: at(9, 0) },
      ],
    );
    const juggernaut = arena(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(4, 2), hp: 15 },
        { seat: 1, role: "FIGHTER", at: at(9, 0) },
      ],
    );
    const recover = (state: GameStateV7): CommandV7 => ({
      kind: "RECOVER",
      unitId: unitAtV7(state, at(4, 2)).id,
    });
    expect(scoreCommandV7(troll.view, recover(troll.state)).priority).toBe(300);
    expect(
      scoreCommandV7(juggernaut.view, recover(juggernaut.state)).priority,
    ).toBe(930);
  });

  it("researches Plunder when hostile units are in contact", () => {
    const techs = TECHNOLOGY_IDS_V7.filter((tech) => tech !== "COMMERCE");
    const pieces = (enemyAt: CoordV7): GoblinPieceV7[] => [
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: enemyAt },
      { seat: 1, role: "FIGHTER", at: at(enemyAt.x + 1, enemyAt.y) },
    ];
    const research: CommandV7 = { kind: "RESEARCH", tech: "COMMERCE" };
    const contact = arena(["GOBLIN", "ORIGINAL"], pieces(at(4, 2)), {
      techs: { 0: techs },
    });
    expect(queryPlayerCommandsV7(contact.view)).toContainEqual(research);
    expect(scoreCommandV7(contact.view, research).priority).toBe(1070);
    const quiet = arena(["GOBLIN", "ORIGINAL"], pieces(at(0, 0)), {
      techs: { 0: techs },
    });
    expect(scoreCommandV7(quiet.view, research).priority).toBeLessThan(1070);
  });
});

describe("ruleset-7 revision-17 Normal AI: the turn command cap", () => {
  // A 55-Goblin horde facing a Human line: one turn of Moves, attacks,
  // Kabooms, and economy. Under the real cap it closes on its own; under a
  // cap it would exceed, the shared scheduler still ends the turn exactly at
  // the cap (reserving the End Turn slot).
  const horde = (): GameStateV7 => {
    const pieces: GoblinPieceV7[] = [];
    for (let y = 0; y <= 4; y += 1)
      for (let x = 0; x <= 10; x += 1)
        pieces.push({ seat: 0, role: "FIGHTER", at: at(x, y) });
    for (let x = 0; x <= 10; x += 2)
      pieces.push({ seat: 1, role: "FIGHTER", at: at(x, 6) });
    return arena(["GOBLIN", "ORIGINAL"], pieces).state;
  };
  const playTurn = (state: GameStateV7, cap: number) => {
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("active player missing");
    let current = state;
    const kinds: string[] = [];
    for (;;) {
      const view = viewForV7(current, actor);
      const command = chooseNormalTurnCommandV7(view, kinds.length, cap);
      if (command === null) throw new Error("no command");
      const result = applyCommandV7(current, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      current = result.state;
      kinds.push(command.kind);
      if (command.kind === "END_TURN") break;
      if (kinds.length >= cap) throw new Error("turn exceeded its cap");
    }
    expect(current.turnOrder[current.activeSeatIndex]).not.toBe(actor);
    return kinds;
  };

  it("ends a large Goblin horde's turn within 128 accepted commands", () => {
    const kinds = playTurn(
      horde(),
      NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
    );
    expect(kinds.length).toBeGreaterThan(40);
    expect(kinds.length).toBeLessThanOrEqual(
      NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
    );
  }, 600_000);

  it("closes the turn exactly at a cap the horde would exceed", () => {
    const kinds = playTurn(horde(), 40);
    expect(kinds).toHaveLength(40);
    expect(kinds.at(-1)).toBe("END_TURN");
  }, 600_000);
});

// pulp_wars-0ao.7 balance pass: the matrix showed the policy never trained a
// Bomb Chucker, took Kabooms that killed more own Goblins than enemies, and
// left most death blasts among its own units.
describe("ruleset-7 revision-17 Normal AI: balance-pass tuning", () => {
  it("trains a Bomb Chucker, which the HP-led training value never picked", () => {
    // Before the Bomb Chucker bias this city trained a Rocket Cart; across
    // 200 matrix games the policy never trained a Bomb Chucker.
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: at(8, 7) },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 1, role: "FIGHTER", at: at(2, 2) },
      ],
    );
    const capital = state.cities.find(
      (city) => city.ownerId === view.viewer.id,
    );
    expect(
      chooseNormalCommandV7(view)
        .candidates.map((candidate) => candidate.command)
        .filter((command) => command.kind === "TRAIN"),
    ).toEqual([{ kind: "TRAIN", cityId: capital?.id, role: "MARKSMAN" }]);
  });

  it("weighs a Kaboom's friendly losses at the friendly-fire trade factor", () => {
    // Two wounded enemies die, but so do three wounded own Goblins: at face
    // value the Kaboom scored +8 and was taken.
    const { state, view } = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 0, role: "FIGHTER", at: at(3, 2), hp: 3 },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 3 },
        { seat: 0, role: "FIGHTER", at: at(4, 1), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 4 },
      ],
    );
    expect(
      scoreCommandV7(view, {
        kind: "KABOOM",
        unitId: unitAtV7(state, at(4, 2)).id,
      }).priority,
    ).toBe(-1);
    // With one own Goblin in the blast the double kill is still taken.
    const fewer = arena(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 0, role: "FIGHTER", at: at(3, 2), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 4 },
      ],
    );
    expect(
      scoreCommandV7(fewer.view, {
        kind: "KABOOM",
        unitId: unitAtV7(fewer.state, at(4, 2)).id,
      }).priority,
    ).toBe(1181);
  });

  it("keeps units off a Rocket Cart that any visible enemy can damage", () => {
    // A full-HP Rocket Cart a Fighter can reach is not killed this turn, but
    // splash, Wail, Plague, and follow-up attacks finish such carts later.
    // (Tuning 7: with the Swordsmen and the village Fighters, as above.)
    const pieces = (enemy: "FIGHTER" | "GUARD"): GoblinPieceV7[] => [
      { seat: 0, role: "CATAPULT", at: at(2, 3) },
      { seat: 0, role: "RAIDER", at: at(4, 2) },
      { seat: 1, role: enemy, at: at(2, 5) },
      { seat: 1, role: "SWORDSMAN", at: at(2, 7) },
      { seat: 1, role: "SWORDSMAN", at: at(1, 7) },
      { seat: 1, role: "SWORDSMAN", at: at(3, 7) },
      { seat: 0, role: "FIGHTER", at: at(5, 5) },
      { seat: 0, role: "FIGHTER", at: at(8, 5) },
      { seat: 0, role: "FIGHTER", at: at(5, 8) },
    ];
    const exposed = arena(["GOBLIN", "ORIGINAL"], pieces("FIGHTER"));
    const rider = unitAtV7(exposed.state, at(4, 2)).id;
    expect(scoreCommandV7(exposed.view, move(rider, at(3, 3))).priority).toBe(
      -1,
    );
    // A Guard cannot attack after moving, so the cart is not exposed.
    const safe = arena(["GOBLIN", "ORIGINAL"], pieces("GUARD"));
    expect(
      scoreCommandV7(safe.view, move(rider, at(3, 3))).priority,
    ).toBeGreaterThanOrEqual(0);
  });
});
