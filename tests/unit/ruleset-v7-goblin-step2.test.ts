import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
} from "../../src/ai/v7";
import {
  ARMY_RESEARCH_ROLES_V7,
  armyGarrisonYieldsToRangedV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  gangUpAttackerV7,
  gangUpHelperWeightV7,
  gangUpWithHelpersV7,
} from "../../src/ai/v7-goblin";
import {
  RULESET_7_ID,
  factionTreeV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  applyOkV7,
  goblinArenaV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Step two of the Goblin pass (`pulp_wars-w49.23`,
// docs/product/RULESET_7_TUNING_GOBLIN.md section 14): six hand-played
// games on `pulp-wars-poc-7r56`. No rule and no number changed. What
// changed is the Normal AI of a Goblin seat that plays the army rules: its
// combined kills count Gang Up and its helpers come up before the first
// blow; a Goblin goes into contact with company; the Orc Brute's technology
// is researched once Knights or Raiders are in sight; the Ogre is third in
// the research order; and a threatened city trains a Bomb Chucker where the
// army is short of them. Two-seat arena (seed-2 Dry Land, 11 x 11): seat 0
// capital (8, 8), seat 1 capital (2, 8); every tile explored.

const at = (x: number, y: number): CoordV7 => ({ x, y });

function arena(
  pieces: readonly GoblinPieceV7[],
  options: GoblinArenaOptionsV7 = {},
): { readonly state: GameStateV7; readonly view: PlayerViewV7 } {
  const state = goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces, options);
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return { state, view: viewForV7(state, actor) };
}

interface PlayedV7 {
  readonly command: CommandV7;
  /** The Gang Up and the damage of an attack, from the public preview. */
  readonly gangUp: number | null;
  readonly dealt: number | null;
  readonly kills: boolean;
}

/** The active seat plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly played: readonly PlayedV7[];
  readonly state: GameStateV7;
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const played: PlayedV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { played, state };
    const preview =
      command.kind === "ATTACK"
        ? queryCombatPreviewV7(view, command.unitId, command.targetUnitId)
        : null;
    played.push({
      command,
      gangUp: preview?.gangUp ?? null,
      dealt: preview?.damageToDefender ?? null,
      kills: preview?.defenderDies ?? false,
    });
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

const attacksOf = (played: readonly PlayedV7[]): readonly PlayedV7[] =>
  played.filter((entry) => entry.command.kind === "ATTACK");

/** Whether the policy has a Move of `unitId` that ends beside `target`. */
function movesBeside(
  view: PlayerViewV7,
  unitId: number,
  target: CoordV7,
): boolean {
  return chooseNormalCommandV7(view).candidates.some(
    (candidate) =>
      candidate.score.priority >= 0 &&
      candidate.command.kind === "MOVE" &&
      candidate.command.unitId === unitId &&
      candidate.command.path.length > 0 &&
      Math.max(
        Math.abs((candidate.command.path.at(-1)?.x ?? -9) - target.x),
        Math.abs((candidate.command.path.at(-1)?.y ?? -9) - target.y),
      ) === 1,
  );
}

function recorded(name: string): GameStateV7 {
  const state = parseGameStateV7(
    JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8")),
  );
  if (state === null) throw new Error(`${name}: not a current state`);
  return state;
}

/** Every land technology but the named ones. */
function without(...missing: readonly TechnologyIdV7[]): TechnologyIdV7[] {
  return factionTreeV7("GOBLIN")
    .nodes.filter(
      (node) => node.branch !== "NAVAL" && !missing.includes(node.id),
    )
    .map((node) => node.id);
}

describe("step two of the Goblin pass: no rule changed", () => {
  it("kept the identity (7r56 then; 7r57 since step two of the Undead pass)", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r65");
  });
});

describe("step two of the Goblin pass: the mob", () => {
  it("counts a helper as the engine does: an Ogre 2, a Bomb Chucker's bomb none", () => {
    const { state, view } = arena([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 0, role: "SWORDSMAN", at: at(4, 3) },
      { seat: 0, role: "MARKSMAN", at: at(7, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const unit = (x: number, y: number) => {
      const id = unitAtV7(state, at(x, y)).id;
      const found = view.units.find((entry) => entry.id === id);
      if (found === undefined) throw new Error("unit not in view");
      return found;
    };
    expect(gangUpAttackerV7(view, unit(4, 2))).toBe(true);
    expect(gangUpAttackerV7(view, unit(7, 2))).toBe(false);
    expect(gangUpAttackerV7(view, unit(5, 2))).toBe(false);
    expect(gangUpHelperWeightV7(view, unit(4, 2))).toBe(1);
    expect(gangUpHelperWeightV7(view, unit(4, 3))).toBe(2);
    expect(gangUpWithHelpersV7(view, unit(4, 2), 0)).toBe(0);
    expect(gangUpWithHelpersV7(view, unit(4, 2), 1)).toBe(1);
    expect(gangUpWithHelpersV7(view, unit(4, 2), 3)).toBe(2);
    expect(gangUpWithHelpersV7(view, unit(7, 2), 2)).toBe(0);
    // The engine agrees: the Goblin beside the Fighter with the Ogre there.
    expect(
      queryCombatPreviewV7(view, unit(4, 2).id, unit(5, 2).id)?.gangUp,
    ).toBe(2);
  });

  it("brings the second Goblin beside the target before the first one strikes", () => {
    // A full Fighter in the open; one Goblin beside it and one two tiles
    // away. Alone each deals 3 and takes 5. Together, each with the other
    // beside the target, they deal 6 and 6 and the Fighter is dead. Before
    // this pass the first Goblin struck alone and the second walked up
    // afterwards.
    const { state } = arena([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 0, role: "FIGHTER", at: at(7, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const fighter = unitAtV7(state, at(5, 2)).id;
    const helper = unitAtV7(state, at(7, 2)).id;
    const turn = policyTurn(state);
    // The helper's Move comes before the first attack.
    const moved = turn.played.findIndex(
      (entry) =>
        entry.command.kind === "MOVE" && entry.command.unitId === helper,
    );
    const struck = turn.played.findIndex(
      (entry) => entry.command.kind === "ATTACK",
    );
    expect(moved).toBeGreaterThanOrEqual(0);
    expect(struck).toBeGreaterThan(moved);
    const attacks = attacksOf(turn.played);
    expect(attacks).toHaveLength(2);
    expect(attacks.map((entry) => entry.gangUp)).toEqual([1, 1]);
    expect(attacks.map((entry) => entry.dealt)).toEqual([6, 6]);
    expect(attacks[1]?.kills).toBe(true);
    expect(turn.state.units.some((unit) => unit.id === fighter)).toBe(false);
  });

  it("brings the Ogre beside a Champion: the Goblin strikes at +2, the Ogre kills", () => {
    // A full Champion (15 HP); a Goblin beside it and an Ogre two tiles
    // away. Alone the Goblin deals 3 and dies. With the Ogre beside the
    // target (Heavyweight: it counts as two helpers) the Goblin deals 9
    // and lives, and the Ogre, with the Goblin as its helper, kills.
    const { state } = arena(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 2) },
        { seat: 0, role: "SWORDSMAN", at: at(7, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2) },
      ],
      { coins: 0 },
    );
    const champion = unitAtV7(state, at(5, 2)).id;
    const ogre = unitAtV7(state, at(7, 2)).id;
    const turn = policyTurn(state);
    const moved = turn.played.findIndex(
      (entry) => entry.command.kind === "MOVE" && entry.command.unitId === ogre,
    );
    const struck = turn.played.findIndex(
      (entry) => entry.command.kind === "ATTACK",
    );
    expect(moved).toBeGreaterThanOrEqual(0);
    expect(struck).toBeGreaterThan(moved);
    const attacks = attacksOf(turn.played);
    expect(attacks.map((entry) => entry.gangUp)).toEqual([2, 1]);
    expect(attacks.map((entry) => entry.dealt)).toEqual([9, 6]);
    expect(turn.state.units.some((unit) => unit.id === champion)).toBe(false);
  });

  it("retakes its center in the recorded position (seed 4, round 8)", () => {
    // tests/fixtures/ruleset-v7-goblin-mob-kill.json: the Goblin seat's
    // turn in round 8 of a diagnostic match (Humans against Goblins, Dry
    // Land 14 x 14, seed 4). A full Fighter stands on the center of the
    // seat's third city with one Goblin beside it and two more two tiles
    // away. In the match the Goblin beside it attacked another Fighter for
    // 3 and the city was captured in the next turn.
    const state = recorded("ruleset-v7-goblin-mob-kill");
    expect(state.round).toBe(8);
    const actor = state.turnOrder[state.activeSeatIndex];
    const center = state.cities.find(
      (city) => city.at.x === 8 && city.at.y === 9,
    );
    expect(center?.ownerId).toBe(actor);
    const holder = unitAtV7(state, at(8, 9));
    expect(holder.ownerId).not.toBe(actor);
    expect(holder.hp).toBe(12);
    const turn = policyTurn(state);
    const onHolder = attacksOf(turn.played).filter(
      (entry) =>
        entry.command.kind === "ATTACK" &&
        entry.command.targetUnitId === holder.id,
    );
    expect(onHolder.map((entry) => entry.gangUp)).toEqual([1, 1]);
    expect(onHolder.map((entry) => entry.dealt)).toEqual([6, 6]);
    expect(turn.state.units.some((unit) => unit.id === holder.id)).toBe(false);
    // A Goblin stands on the center again.
    expect(unitAtV7(turn.state, at(8, 9)).ownerId).toBe(actor);
  });
});

describe("step two of the Goblin pass: into contact with company", () => {
  it("does not walk one Goblin up to a Fighter", () => {
    // Two tiles from a full Fighter with nobody else near: the Fighter
    // kills it wherever it stands beside it.
    const alone = arena([
      { seat: 0, role: "FIGHTER", at: at(7, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    expect(
      movesBeside(alone.view, unitAtV7(alone.state, at(7, 2)).id, at(5, 2)),
    ).toBe(false);
    // With a second Goblin that can come beside the same Fighter it goes.
    const pair = arena([
      { seat: 0, role: "FIGHTER", at: at(7, 2) },
      { seat: 0, role: "FIGHTER", at: at(7, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    expect(
      movesBeside(pair.view, unitAtV7(pair.state, at(7, 2)).id, at(5, 2)),
    ).toBe(true);
  });

  it("lets a Wolf Rider that lives through it ride up alone, and any unit kill", () => {
    // A Wolf Rider has 10 HP: one Fighter does not kill it.
    const rider = arena([
      { seat: 0, role: "RAIDER", at: at(8, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    expect(
      movesBeside(rider.view, unitAtV7(rider.state, at(8, 2)).id, at(5, 2)),
    ).toBe(true);
    // A Goblin alone beside a Fighter it kills from there.
    const kill = arena([
      { seat: 0, role: "FIGHTER", at: at(7, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 2 },
    ]);
    expect(
      movesBeside(kill.view, unitAtV7(kill.state, at(7, 2)).id, at(5, 2)),
    ).toBe(true);
  });

  it("leaves a seat of another faction as it was", () => {
    const { state, view } = arena(
      [
        { seat: 1, role: "FIGHTER", at: at(7, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
      ],
      { activeSeat: 1 },
    );
    // The Human Fighter walks up to the Goblin alone.
    expect(movesBeside(view, unitAtV7(state, at(7, 2)).id, at(5, 2))).toBe(
      true,
    );
  });
});

describe("step two of the Goblin pass: research", () => {
  it("researches Bomb Chucker, Wolf Rider, Ogre, Orc Brute, Rocket Cart, Warboss, Scrap Buggy", () => {
    expect(ARMY_RESEARCH_ROLES_V7.GOBLIN).toEqual([
      "MARKSMAN",
      "RAIDER",
      "SWORDSMAN",
      "GUARD",
      "CATAPULT",
      "CAPTAIN",
      "KNIGHT",
    ]);
  });

  // A seat with Hunting, Bomb Chuckers, and Gathering: Scouting (the Wolf
  // Rider) is the next technology of its order.
  const owned: readonly TechnologyIdV7[] = [
    "GATHERING",
    "HUNTING",
    "MARKSMANSHIP",
  ];
  const seat = (hostile: readonly GoblinPieceV7[]) =>
    arena(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 6) },
        { seat: 0, role: "MARKSMAN", at: at(8, 6) },
        ...hostile,
      ],
      { techs: { 0: owned }, coins: 30 },
    );

  it("keeps its order with one Raider in sight", () => {
    const { view } = seat([{ seat: 1, role: "RAIDER", at: at(5, 2) }]);
    expect(inspectNormalArmyV7(view).research?.tech).toBe("SCOUTING");
  });

  it("goes for the Orc Brute with two Raiders in sight", () => {
    const { view } = seat([
      { seat: 1, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "RAIDER", at: at(4, 2) },
    ]);
    // The root of Industry is the first step to Fortification.
    expect(inspectNormalArmyV7(view).research?.tech).toBe("DRILL");
  });

  it("buys it before anything else with a Knight in sight", () => {
    const { view } = seat([{ seat: 1, role: "KNIGHT", at: at(5, 2) }]);
    expect(inspectNormalArmyV7(view).research?.tech).toBe("DRILL");
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toEqual({ kind: "RESEARCH", tech: "DRILL" });
    // With the root owned the next step is Fortification itself.
    const rooted = arena(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 6) },
        { seat: 0, role: "MARKSMAN", at: at(8, 6) },
        { seat: 1, role: "KNIGHT", at: at(5, 2) },
      ],
      { techs: { 0: [...owned, "DRILL"] }, coins: 30 },
    );
    expect(chooseNormalCommandV7(rooted.view).command).toEqual({
      kind: "RESEARCH",
      tech: "FORTIFICATION",
    });
  });

  it("does not ask for it twice, nor before the Bomb Chucker", () => {
    const fortified = arena(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 6) },
        { seat: 1, role: "KNIGHT", at: at(5, 2) },
      ],
      {
        techs: {
          0: without("SCOUTING", "ROADS", "COMMERCE", "RAIDING", "CHIVALRY"),
        },
        coins: 30,
      },
    );
    expect(inspectNormalArmyV7(fortified.view).research?.tech).toBe("SCOUTING");
    const early = arena(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 6) },
        { seat: 1, role: "KNIGHT", at: at(5, 2) },
      ],
      { techs: { 0: ["GATHERING", "HUNTING"] }, coins: 30 },
    );
    expect(inspectNormalArmyV7(early.view).research?.tech).toBe("MARKSMANSHIP");
  });
});

describe("step two of the Goblin pass: Bomb Chuckers in a threatened city", () => {
  const counts = (ranged: number): ArmyCountsV7 => ({
    total: 6 + ranged,
    byClass: {
      LINE: 6,
      DEFENDER: 0,
      RANGED: ranged,
      SIEGE: 0,
      BREAKTHROUGH: 0,
      SKIRMISHER: 0,
      SUPPORT: 0,
    },
    hostileFragile: 0,
  });

  it("lets the garrison rule of a Goblin seat yield to a Bomb Chucker", () => {
    // Six Goblins and no Bomb Chucker: a fifth of the army is their share.
    expect(armyGarrisonYieldsToRangedV7("GOBLIN", counts(0), true)).toBe(true);
    expect(armyGarrisonYieldsToRangedV7("GOBLIN", counts(1), true)).toBe(true);
    // With its share it trains the body again.
    expect(armyGarrisonYieldsToRangedV7("GOBLIN", counts(2), true)).toBe(false);
    // Not without a Bomb Chucker on offer, and not for a Martian seat. (An
    // Undead seat's yields since step two of the Undead pass,
    // `pulp_wars-w49.24`.)
    expect(armyGarrisonYieldsToRangedV7("GOBLIN", counts(0), false)).toBe(
      false,
    );
    expect(armyGarrisonYieldsToRangedV7("MARTIAN", counts(0), true)).toBe(
      false,
    );
  });
});
