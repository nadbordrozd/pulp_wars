import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NormalPolicyWorkV7,
  chooseNormalCommandV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import { normalOpeningScoresV7 } from "../../src/ai/v7-opening";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";

// Seed-2 DRY_LAND two-seat board (11 x 11; factions never change the board):
// seat 0 capital (8, 8) with territory x 7-9, y 7-9; seat 1 capital (2, 8)
// with territory x 1-3, y 7-9; rows 0-4 west of x 6 are open neutral land.
const SEAT_0_TERRITORY = { x: 7, y: 7 } as const;

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 revision-13 Normal AI: public boundary", () => {
  it("keeps the Undead helpers on public-view, query, and preview imports", () => {
    const source = readFileSync("src/ai/v7-undead.ts", "utf8");
    expect(
      [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]),
    ).toEqual([
      "../engine/model/ids",
      "../engine/rules/ruleset-v7",
      "../engine/v7/query",
      // Revision 15: only the public Plague duration constant.
      "../engine/v7/afflictions",
      "../engine/v7/types",
      "../engine/v7/view",
      "../engine/v7/wail",
    ]);
    expect(source).not.toMatch(
      /GameStateV7|applyCommandV7|estimateCombatV7|wailTargetsV7\(|random|Date\.now|performance/,
    );
  });
});

describe("ruleset-7 revision-13 Normal AI playing Undead", () => {
  it("raises every adjacent Grave, and never raises occupied Graves", () => {
    const graves = [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ];
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } }],
      { graves },
    );
    const necromancer = unitAt(state, { x: 2, y: 2 });
    const decision = decide(state);
    expect(decision.command).toEqual({
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
    expect(decision.candidates[0]?.score.priority).toBe(1237);
    expect(decision.candidates[0]?.score.strategicValue).toBe(28);

    const blocked = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 }, hp: 10 },
      ],
      { graves },
    );
    const view = viewForV7(blocked, blocked.humanPlayerId);
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => command.kind === "RAISE_DEAD",
      ),
    ).toBe(false);
  });

  it("moves a Necromancer beside a Grave cluster before raising it", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: { x: 1, y: 2 } }],
      {
        graves: [
          { x: 3, y: 1 },
          { x: 3, y: 3 },
        ],
      },
    );
    const necromancer = unitAt(state, { x: 1, y: 2 });
    const decision = decide(state);
    expect(decision.command?.kind).toBe("MOVE");
    if (decision.command?.kind !== "MOVE") return;
    expect(decision.command.unitId).toBe(necromancer.id);
    expect(decision.command.path.at(-1)).toEqual({ x: 2, y: 2 });
    expect(decision.candidates[0]?.score.priority).toBe(1238);
    const moved = apply(state, decision.command);
    expect(decide(moved).command).toEqual({
      kind: "RAISE_DEAD",
      unitId: necromancer.id,
    });
  });

  it("never walks a Necromancer into lethal visible danger", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 1, y: 2 } },
        { seat: 1, role: "KNIGHT", at: { x: 4, y: 2 } },
        { seat: 1, role: "KNIGHT", at: { x: 4, y: 3 } },
      ],
      {
        graves: [
          { x: 3, y: 1 },
          { x: 3, y: 3 },
        ],
      },
    );
    const necromancer = unitAt(state, { x: 1, y: 2 });
    const view = viewForV7(state, state.humanPlayerId);
    const approach = required(
      queryPlayerCommandsV7(view).find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === necromancer.id &&
          same(required(command.path.at(-1)), { x: 2, y: 2 }),
      ),
    );
    expect(scoreCommandV7(view, approach).priority).toBe(-1);
    expect(chooseNormalCommandV7(view).command).not.toEqual(approach);
  });

  it("Devours to heal a wounded Ghoul and to deny a hostile Necromancer", () => {
    const grave = { x: 2, y: 2 };
    const wounded = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "RAIDER", at: grave, hp: 4 }],
      { graves: [grave] },
    );
    const ghoul = unitAt(wounded, grave);
    const healed = decide(wounded);
    expect(healed.command).toEqual({ kind: "DEVOUR", unitId: ghoul.id });
    expect(healed.candidates[0]?.score.immediateValue).toBe(48);

    const full = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "RAIDER", at: grave }],
      { graves: [grave] },
    );
    expect(queryPlayerCommandsV7(viewFor(full))).toContainEqual({
      kind: "DEVOUR",
      unitId: ghoul.id,
    });
    expect(
      decide(full).candidates.some(({ command }) => command.kind === "DEVOUR"),
    ).toBe(false);

    const denial = arena(
      ["UNDEAD", "UNDEAD"],
      [
        { seat: 0, role: "RAIDER", at: grave },
        { seat: 1, role: "CAPTAIN", at: { x: 4, y: 3 } },
      ],
      { graves: [grave] },
    );
    const denied = decide(denial);
    expect(denied.candidates).toContainEqual(
      expect.objectContaining({
        command: { kind: "DEVOUR", unitId: unitAt(denial, grave).id },
        score: expect.objectContaining({ priority: 1176 }),
      }),
    );
  });

  it("Wails where it hits living units, moves to a better Wail, and never Wails Undead", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 2 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 4 } },
      ],
    );
    const banshee = unitAt(state, { x: 2, y: 2 });
    const decision = decide(state);
    expect(decision.command).toEqual({ kind: "WAIL", unitId: banshee.id });
    expect(decision.candidates[0]?.score.priority).toBe(1250);

    const far = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 1, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 4, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 4, y: 3 } },
      ],
    );
    const positioned = decide(far);
    expect(positioned.command?.kind).toBe("MOVE");
    if (positioned.command?.kind !== "MOVE") return;
    const to = required(positioned.command.path.at(-1));
    expect(chebyshev(to, { x: 4, y: 2 })).toBeLessThanOrEqual(2);
    expect(chebyshev(to, { x: 4, y: 3 })).toBeLessThanOrEqual(2);
    expect(decide(apply(far, positioned.command)).command).toEqual({
      kind: "WAIL",
      unitId: unitAt(far, { x: 1, y: 2 }).id,
    });

    const undeadOnly = arena(
      ["UNDEAD", "UNDEAD"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 2 }, hp: 1 },
      ],
    );
    expect(
      queryPlayerCommandsV7(viewFor(undeadOnly)).some(
        (command) => command.kind === "WAIL",
      ),
    ).toBe(false);
  });

  it("aims the Lich where its visible splash lands", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 2 } },
        { seat: 0, role: "GUARD", at: { x: 2, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 5 } },
      ],
    );
    const lich = unitAt(state, { x: 2, y: 2 });
    const clustered = unitAt(state, { x: 2, y: 4 });
    const view = viewFor(state);
    const splash = required(queryCombatPreviewV7(view, lich.id, clustered.id));
    expect(splash.splash.length).toBe(2);
    const lichAttacks = chooseNormalCommandV7(view).candidates.filter(
      ({ command }) => command.kind === "ATTACK" && command.unitId === lich.id,
    );
    expect(lichAttacks[0]?.command).toEqual({
      kind: "ATTACK",
      unitId: lich.id,
      targetUnitId: clustered.id,
    });
  });

  it("values Vampire Lifesteal and Zombie Infect risings", () => {
    const vampireState = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: { x: 2, y: 2 }, hp: 7 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
    );
    const vampire = unitAt(vampireState, { x: 2, y: 2 });
    const target = unitAt(vampireState, { x: 3, y: 2 });
    const view = viewFor(vampireState);
    const preview = required(queryCombatPreviewV7(view, vampire.id, target.id));
    expect(preview.attackerHeal).toBeGreaterThan(0);
    const score = scoreCommandV7(view, {
      kind: "ATTACK",
      unitId: vampire.id,
      targetUnitId: target.id,
    });
    expect(score.immediateValue).toBe(
      20 * Number(preview.defenderDies) -
        16 * Number(preview.attackerDies) +
        10 * preview.damageToDefender -
        8 * preview.damageToAttacker +
        8 * preview.attackerHeal,
    );

    const zombieState = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 }, hp: 2 },
      ],
    );
    const zombie = unitAt(zombieState, { x: 2, y: 2 });
    const victim = unitAt(zombieState, { x: 3, y: 2 });
    const zombieView = viewFor(zombieState);
    expect(
      queryCombatPreviewV7(zombieView, zombie.id, victim.id)?.defenderInfected,
    ).toBe(true);
    const infect = chooseNormalCommandV7(zombieView);
    expect(infect.command).toEqual({
      kind: "ATTACK",
      unitId: zombie.id,
      targetUnitId: victim.id,
    });
    // Target value (Fighter 2 x 4 + 2 HP) plus the 10-HP Zombie rising.
    expect(infect.candidates[0]?.score.strategicValue).toBe(10 + 22);
  });

  it("uses Frenzy only when adjacent attackers can reach a visible enemy", () => {
    const pieces: Piece[] = [
      { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
      { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
      { seat: 0, role: "FIGHTER", at: { x: 3, y: 2 } },
    ];
    const engaged = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        ...pieces,
        { seat: 1, role: "GUARD", at: { x: 4, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 0, y: 3 } },
      ],
    );
    const necromancer = unitAt(engaged, { x: 2, y: 2 });
    const frenzy = decide(engaged);
    expect(frenzy.command).toEqual({ kind: "RALLY", unitId: necromancer.id });
    expect(frenzy.candidates[0]?.score.priority).toBe(1235);

    const idle = arena(
      ["UNDEAD", "ORIGINAL"],
      [...pieces, { seat: 1, role: "GUARD", at: { x: 5, y: 9 } }],
    );
    expect(queryPlayerCommandsV7(viewFor(idle))).toContainEqual({
      kind: "RALLY",
      unitId: necromancer.id,
    });
    expect(
      decide(idle).candidates.some(({ command }) => command.kind === "RALLY"),
    ).toBe(false);
  });

  it("retreats a Restless wounded unit into own territory to recover", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "FIGHTER", at: { x: 6, y: 6 }, hp: 3 }],
      { coins: 0 },
    );
    const skeleton = unitAt(state, { x: 6, y: 6 });
    const view = viewFor(state);
    expect(queryPlayerCommandsV7(view)).not.toContainEqual({
      kind: "RECOVER",
      unitId: skeleton.id,
    });
    const decision = chooseNormalCommandV7(view);
    const best = required(
      decision.candidates.find(
        ({ command }) => "unitId" in command && command.unitId === skeleton.id,
      ),
    );
    expect(best.command.kind).toBe("MOVE");
    if (best.command.kind !== "MOVE") return;
    expect(best.command.path.at(-1)).toEqual(SEAT_0_TERRITORY);
    expect(best.score.priority).toBe(935);
  });
});

describe("ruleset-7 revision-13 Normal AI facing Undead", () => {
  it("refuses a melee attack whose retaliation infects the attacker, and shoots the Zombie instead", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 }, hp: 2 },
        { seat: 0, role: "MARKSMAN", at: { x: 1, y: 4 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 3 } },
      ],
    );
    const fighter = unitAt(state, { x: 2, y: 2 });
    const marksman = unitAt(state, { x: 1, y: 4 });
    const zombie = unitAt(state, { x: 3, y: 3 });
    const view = viewFor(state);
    const melee = required(queryCombatPreviewV7(view, fighter.id, zombie.id));
    expect(melee.attackerInfected).toBe(true);
    const decision = chooseNormalCommandV7(view);
    expect(
      decision.candidates.some(
        ({ command }) =>
          command.kind === "ATTACK" && command.unitId === fighter.id,
      ),
    ).toBe(false);
    const ranged = required(
      decision.candidates.find(
        ({ command }) =>
          command.kind === "ATTACK" && command.unitId === marksman.id,
      ),
    );
    expect(ranged.command).toEqual({
      kind: "ATTACK",
      unitId: marksman.id,
      targetUnitId: zombie.id,
    });
  });

  it("prioritizes a Necromancer, more so beside Graves it could raise", () => {
    const pieces: Piece[] = [
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
      { seat: 1, role: "CAPTAIN", at: { x: 3, y: 2 } },
    ];
    const plain = arena(["ORIGINAL", "UNDEAD"], pieces);
    const graves = arena(["ORIGINAL", "UNDEAD"], pieces, {
      graves: [
        { x: 4, y: 1 },
        { x: 4, y: 3 },
      ],
    });
    const command: CommandV7 = {
      kind: "ATTACK",
      unitId: unitAt(plain, { x: 2, y: 2 }).id,
      targetUnitId: unitAt(plain, { x: 3, y: 2 }).id,
    };
    const rule = effectiveRoleRuleV7("CAPTAIN", "UNDEAD");
    const base = (rule.cost ?? 0) * 4 + rule.maxHp;
    // Retained target value plus the Necromancer bonus (+4 per raisable Grave).
    expect(scoreCommandV7(viewFor(plain), command).strategicValue).toBe(
      base + 12,
    );
    expect(scoreCommandV7(viewFor(graves), command).strategicValue).toBe(
      base + 12 + 8,
    );
  });

  it("counts a hostile Banshee's Wail radius as threat only for living viewers", () => {
    const human = arena(
      ["ORIGINAL", "UNDEAD"],
      [{ seat: 1, role: "MARKSMAN", at: { x: 2, y: 2 } }],
    );
    const banshee = unitAt(human, { x: 2, y: 2 });
    const tiles = publicThreatenedTilesForPolicyV7(viewFor(human), banshee);
    expect(tiles).toContainEqual({ x: 4, y: 2 });
    expect(tiles).toContainEqual({ x: 4, y: 4 });
    expect(tiles).not.toContainEqual({ x: 6, y: 2 });

    const undead = arena(
      ["UNDEAD", "UNDEAD"],
      [{ seat: 1, role: "MARKSMAN", at: { x: 2, y: 2 } }],
    );
    expect(
      publicThreatenedTilesForPolicyV7(
        viewFor(undead),
        unitAt(undead, { x: 2, y: 2 }),
      ),
    ).toEqual([]);
  });
});

describe("ruleset-7 revision-13 Normal AI opening research", () => {
  it.each([1, 2, 3, 4, 5])(
    "keeps the revision-12 opener for Undead seats (seed %i)",
    (seed) => {
      const opener = (factions: readonly FactionIdV7[]) => {
        const created = createPlayableGameV7(setupWith(factions, seed));
        if (!created.ok) throw new Error(created.error.code);
        // Seat 0 is the rebound seat; make it active for the decision.
        const seat0 = required(
          created.state.players.find((player) => player.seat === 0),
        ).id;
        const state = checkedV7({
          ...created.state,
          activeSeatIndex: created.state.turnOrder.indexOf(seat0),
        });
        const view = viewForV7(state, seat0);
        return {
          scores: normalOpeningScoresV7(view),
          command: chooseNormalCommandV7(view).command,
        };
      };
      const undead = opener(["UNDEAD", "ORIGINAL"]);
      expect(undead.scores.length).toBeGreaterThan(0);
      expect(undead).toEqual(opener(["ORIGINAL", "ORIGINAL"]));
    },
  );
});

describe("ruleset-7 revision-13 Normal AI determinism and headless play", () => {
  it("decides identically cold, synchronously, and with budget one on an Undead view", () => {
    const match = runAiMatchV7(setupWith(["UNDEAD", "ORIGINAL"], 3), {
      maxRounds: 18,
    });
    expect(match.errors).toEqual([]);
    const view = viewForV7(
      match.state,
      required(match.state.turnOrder[match.state.activeSeatIndex]),
    );
    const synchronous = chooseNormalCommandV7(structuredClone(view));
    const work = new NormalPolicyWorkV7(structuredClone(view), () => 0);
    let stepped = work.advanceWork(1);
    while (stepped === null) stepped = work.advanceWork(1);
    const diagnostic = work.diagnostic();
    expect(canonicalHash(stepped)).toBe(canonicalHash(synchronous));
    expect(canonicalHash(chooseNormalCommandV7(structuredClone(view)))).toBe(
      canonicalHash(synchronous),
    );
    expect(stepped.prngDraws).toBe(0);
    expect(diagnostic.workUnits).toBeLessThanOrEqual(
      diagnostic.bounds.declaredMaximumWorkUnits,
    );
  }, 60_000);

  it("finishes Undead-vs-Human and Undead-vs-Undead matches using the whole kit", () => {
    const cases: readonly {
      readonly factions: readonly FactionIdV7[];
      readonly seed: number;
      readonly mapType: MatchSetupV7["mapType"];
    }[] = [
      { factions: ["UNDEAD", "ORIGINAL"], seed: 2, mapType: "CONTINENTS" },
      { factions: ["UNDEAD", "ORIGINAL"], seed: 3, mapType: "DRY_LAND" },
      { factions: ["ORIGINAL", "UNDEAD"], seed: 4, mapType: "DRY_LAND" },
      { factions: ["UNDEAD", "UNDEAD"], seed: 3, mapType: "DRY_LAND" },
      { factions: ["UNDEAD", "UNDEAD"], seed: 4, mapType: "ARCHIPELAGO" },
      // Revision 14 AI (vkq.18): the earlier cases no longer reach a Devour.
      { factions: ["ORIGINAL", "UNDEAD"], seed: 7, mapType: "PANGEA" },
    ];
    const used: Record<string, number> = {
      RAISE_DEAD: 0,
      DEVOUR: 0,
      WAIL: 0,
      RALLY: 0,
    };
    for (const { factions, seed, mapType } of cases) {
      const setup = { ...setupWith(factions, seed), mapType };
      const match = runAiMatchV7(setup, { maxRounds: 120 });
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(match.termination).toBe("OUTCOME");
      expect(match.metrics.observation.hiddenInformationViolations).toBe(0);
      const undead = new Set(
        match.state.players
          .filter((player) => player.faction === "UNDEAD")
          .map((player) => player.id),
      );
      for (const record of match.commandLog)
        if (undead.has(record.playerId) && record.command.kind in used)
          used[record.command.kind] = (used[record.command.kind] ?? 0) + 1;
    }
    expect(used.RAISE_DEAD).toBeGreaterThan(0);
    expect(used.DEVOUR).toBeGreaterThan(0);
    expect(used.WAIL).toBeGreaterThan(0);
    expect(used.RALLY).toBeGreaterThan(0);
  }, 180_000);
});

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

interface ArenaOptions {
  readonly graves?: readonly CoordV7[];
  readonly coins?: number;
}

function setupWith(factions: readonly FactionIdV7[], seed = 2): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

/**
 * A seed-2 board with every technology, the given pieces as the only units,
 * seat 0 active with every tile explored, and each piece or Grave tile that
 * is not a settlement cleared to plain Grass.
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const size = base.board.width;
  const player = (seat: number) =>
    required(base.players.find((candidate) => candidate.seat === seat));
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const graves = options.graves ?? [];
  const cleared = [...pieces.map((piece) => piece.at), ...graves];
  const every: CoordV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) every.push({ x, y });
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(player(0).id),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: options.coins ?? 0,
      explored: every,
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: [...graves].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        cleared.some((at) => same(at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
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
}

function viewFor(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, required(state.turnOrder[state.activeSeatIndex]));
}

function decide(state: GameStateV7): NormalAiDecisionV7 {
  return chooseNormalCommandV7(viewFor(state));
}

function apply(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(
    state,
    required(state.turnOrder[state.activeSeatIndex]),
    command,
  );
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result.state;
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("fixture value missing");
  return value;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
