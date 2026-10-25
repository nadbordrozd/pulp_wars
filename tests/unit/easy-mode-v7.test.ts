import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import { armyAssaultModeV7 } from "../../src/ai/v7-army";
import { activeMissionDirectiveV7 } from "../../src/ai/v7-directives";
import {
  EASY_AI_PERSONALITY_V7,
  NORMAL_AI_PERSONALITY_V7,
  aiPersonalityForViewV7,
  campaignTemperForViewV7,
  easyDecisionDrawV7,
  easyDecisionV7,
} from "../../src/ai/v7-personality";
import { leaderboardRegularGameV7 } from "../../src/app/leaderboard-v7";
import {
  RULESET_7_ID,
  createPlayableGameV7,
  createReplayV7,
  matchDifficultyV7,
  missionByIdV7,
  missionMatchSetupV7,
  validateMatchSetupV7,
  viewForV7,
  queryCombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  CampaignProgressStoreV7,
  createSaveEnvelopeV7,
  parseCampaignProgressV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { at, fieldV7 } from "../fixtures/v7-revision20";

/**
 * Easy mode (`pulp_wars-q6cc`, docs/architecture/NORMAL_AI.md "Easy
 * mode"): the setup value, its persistence, the leaderboard, the campaign
 * record, and the Easy personality of the AI on small hand-built states. No
 * match is played.
 */

const regular = (overrides: Partial<MatchSetupV7> = {}): MatchSetupV7 => ({
  rulesetId: RULESET_7_ID,
  seed: 12,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "UNDEAD"],
  mapType: "CONTINENTS",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  curiosities: true,
  gameMode: "DOMINATION",
  gameKind: "REGULAR",
  ...overrides,
});

const easy = (state: GameStateV7): GameStateV7 =>
  checkedV7({ ...state, setup: { ...state.setup, aiDifficulty: "EASY" } });

/** The view of the AI seat (seat 1), whose turn it is. */
function aiView(state: GameStateV7): PlayerViewV7 {
  const ai = state.players.find((player) => player.seat === 1);
  if (ai === undefined) throw new Error("no seat 1");
  return viewForV7(state, ai.id);
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

describe("Easy mode: the setup and its persistence", () => {
  it("is named without a head start on any map, missions and the Showcase included, and never with one", () => {
    const parsed = validateMatchSetupV7(regular({ aiDifficulty: "EASY" }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.setup.aiDifficulty).toBe("EASY");
    expect(matchDifficultyV7(parsed.setup)).toBe("EASY");
    expect(
      validateMatchSetupV7(
        regular({ aiDifficulty: "EASY", aiHeadStart: { coins: 5 } }),
      ).ok,
    ).toBe(false);
    const mission = required(missionByIdV7("HUMAN_1"));
    const built = required(missionMatchSetupV7(mission));
    const onMission = validateMatchSetupV7({ ...built, aiDifficulty: "EASY" });
    expect(onMission.ok && onMission.setup.aiDifficulty).toBe("EASY");
    // A Normal setup keeps its exact shape (saves made before Easy).
    const normal = validateMatchSetupV7(built);
    expect(normal.ok && normal.setup).toEqual(built);
  });

  it("saves and resumes an Easy match unchanged", () => {
    const setup = regular({ aiDifficulty: "EASY" });
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-10-25T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind === "VALID")
      expect(loaded.save.setup.aiDifficulty).toBe("EASY");
  });

  it("keeps an Easy game off the leaderboard while it stays a regular game", () => {
    expect(leaderboardRegularGameV7(regular())).toBe(true);
    expect(leaderboardRegularGameV7(regular({ aiDifficulty: "EASY" }))).toBe(
      false,
    );
  });

  it("records a mission won only on Easy with the Easy tag, which a Normal win removes", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    };
    const store = new CampaignProgressStoreV7(storage, {
      now: () => "2026-10-25T12:00:00.000Z",
    });
    const completion = () => {
      const loaded = store.load();
      if (loaded.kind !== "VALID") throw new Error(loaded.kind);
      return loaded.progress.campaigns.HUMANS?.completed.HUMAN_1;
    };
    expect(store.recordWin("HUMANS", "HUMAN_1", 12, 1, true).ok).toBe(true);
    expect(completion()).toMatchObject({ stars: 1, easy: true });
    // Another Easy win keeps it; the stars follow the usual rule.
    store.recordWin("HUMANS", "HUMAN_1", 10, 2, true);
    expect(completion()).toMatchObject({
      bestRounds: 10,
      stars: 2,
      easy: true,
    });
    // A Normal win removes the tag, and a later Easy win does not bring it
    // back.
    store.recordWin("HUMANS", "HUMAN_1", 11, 1);
    expect(completion()?.easy).toBeUndefined();
    store.recordWin("HUMANS", "HUMAN_1", 9, 1, true);
    expect(completion()?.easy).toBeUndefined();
    expect(completion()?.bestRounds).toBe(9);
    // Only `easy: true` parses.
    const source = (easyValue: unknown) =>
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 2,
        campaigns: {
          HUMANS: {
            completed: {
              HUMAN_1: {
                firstWonAt: "2026-10-25T12:00:00.000Z",
                bestRounds: 9,
                stars: 1,
                easy: easyValue,
              },
            },
          },
        },
      });
    expect(parseCampaignProgressV7(source(true)).kind).toBe("VALID");
    expect(parseCampaignProgressV7(source(false)).kind).toBe("UNREADABLE");
  });
});

describe("Easy mode: the personality", () => {
  it("is Easy for the AI seats of an Easy setup only, never for the human seat", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { activeSeat: 1, factions: ["ORIGINAL", "UNDEAD"] },
    );
    expect(aiPersonalityForViewV7(aiView(state))).toBe(
      NORMAL_AI_PERSONALITY_V7,
    );
    const easyState = easy(state);
    expect(aiPersonalityForViewV7(aiView(easyState))).toBe(
      EASY_AI_PERSONALITY_V7,
    );
    expect(
      aiPersonalityForViewV7(viewForV7(easyState, easyState.humanPlayerId)),
    ).toBe(NORMAL_AI_PERSONALITY_V7);
    // The campaign plan's numbers: none for Normal; the quiet opening only
    // in a skirmish.
    expect(campaignTemperForViewV7(aiView(state))).toBeNull();
    expect(campaignTemperForViewV7(aiView(easyState))).toEqual({
      quietUntilRound: 10,
      waveSize: 5,
      waveOut: 3,
      rushWave: 3,
      frontNeedRatio: 200,
    });
    const view = aiView(easyState);
    expect(
      campaignTemperForViewV7({
        ...view,
        setup: { ...view.setup, mapType: "MISSION" },
      })?.quietUntilRound,
    ).toBe(0);
  });

  it("waits for a clearly larger force before it commits", () => {
    // 160 near against a position of 100: Normal commits (150%), Easy
    // stages until it has 210.
    const facts = { hostile: 100, near: 160, coming: 160, contact: false };
    expect(armyAssaultModeV7(facts)).toBe("COMMIT");
    expect(armyAssaultModeV7(facts, 100)).toBe("COMMIT");
    expect(armyAssaultModeV7(facts, 140)).toBe("NONE");
    // With more on the way it walks up and waits for them.
    expect(armyAssaultModeV7({ ...facts, near: 120, coming: 220 }, 140)).toBe(
      "STAGE",
    );
    expect(armyAssaultModeV7({ ...facts, near: 210, coming: 210 }, 140)).toBe(
      "COMMIT",
    );
    // Once the battle is joined: 100% for Normal, 140% for Easy.
    const joined = { hostile: 100, near: 120, coming: 120, contact: true };
    expect(armyAssaultModeV7(joined)).toBe("COMMIT");
    expect(armyAssaultModeV7(joined, 140)).toBe("NONE");
  });

  it("declines a kill far from home in the quiet opening that Normal takes", () => {
    // A wounded human Fighter two tiles from an AI Fighter, far from both
    // cities, in round 1.
    // (No Coins and every Monument built, so the kill is the best
    // command.)
    const field = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { activeSeat: 1, factions: ["ORIGINAL", "UNDEAD"], coins: 0 },
    );
    const state = checkedV7({
      ...field,
      players: field.players.map((player) => ({
        ...player,
        achievementEntitlements: player.achievementEntitlements.map((entry) =>
          entry.unlocked ? { ...entry, spent: true } : entry,
        ),
      })),
    });
    const victim = required(state.units.find((unit) => unit.hp === 1));
    const isKill = (command: CommandV7 | null): boolean =>
      command?.kind === "ATTACK" && command.targetUnitId === victim.id;
    const normal = chooseNormalCommandV7(aiView(state));
    expect(normal.difficulty).toBe("NORMAL");
    expect(normal.prngDraws).toBe(0);
    expect(isKill(normal.command)).toBe(true);
    const cautious = chooseNormalCommandV7(aiView(easy(state)));
    expect(cautious.difficulty).toBe("EASY");
    expect(isKill(cautious.command)).toBe(false);
    expect(cautious.candidates.some((item) => isKill(item.command))).toBe(
      false,
    );
    // After the opening it takes the kill.
    const later = easy(checkedV7({ ...state, round: 10 }));
    expect(
      chooseNormalCommandV7(aiView(later)).candidates.some((item) =>
        isKill(item.command),
      ),
    ).toBe(true);
  });

  it("pulls a wounded unit out of an exchange and takes only exchanges that come out ahead, away from home", () => {
    // One AI attack on one human unit, scored as an exchange (950).
    const kept = (
      attacker: { role: UnitRoleIdV7; hp?: number; at?: CoordV7 },
      defender: { role: UnitRoleIdV7; at?: CoordV7 },
      difficulty: "NORMAL" | "EASY" = "EASY",
    ): boolean => {
      const field = fieldV7(
        [
          { seat: 0, role: defender.role, at: defender.at ?? at(5, 2) },
          {
            seat: 1,
            role: attacker.role,
            at: attacker.at ?? at(5, 3),
            ...(attacker.hp === undefined ? {} : { hp: attacker.hp }),
          },
        ],
        { activeSeat: 1, factions: ["UNDEAD", "ORIGINAL"] },
      );
      const state = checkedV7({
        ...field,
        round: 11,
        setup: { ...field.setup, aiDifficulty: difficulty },
      });
      const view = aiView(state);
      const actor = required(
        view.units.find((unit) => unit.ownerId === view.viewer.id),
      );
      const target = required(
        view.units.find((unit) => unit.ownerId !== view.viewer.id),
      );
      const command: CommandV7 = {
        kind: "ATTACK",
        unitId: actor.id,
        targetUnitId: target.id,
      };
      const preview = required(queryCombatPreviewV7(view, actor.id, target.id));
      expect(preview.defenderDies).toBe(false);
      return (
        easyDecisionV7(view, [{ command, score: { priority: 950 } }]).candidates
          .length === 1
      );
    };
    // A Fighter at 3 HP: Normal trades, Easy pulls it out.
    expect(
      kept({ role: "FIGHTER", hp: 3 }, { role: "FIGHTER" }, "NORMAL"),
    ).toBe(true);
    expect(kept({ role: "FIGHTER", hp: 3 }, { role: "FIGHTER" })).toBe(false);
    // A healthy Fighter into a Swordsman takes more than it deals: refused.
    expect(kept({ role: "FIGHTER" }, { role: "SWORDSMAN" }, "NORMAL")).toBe(
      true,
    );
    expect(kept({ role: "FIGHTER" }, { role: "SWORDSMAN" })).toBe(false);
    // A Fighter into a Knight comes out ahead (6 dealt, 2 taken): taken.
    expect(kept({ role: "FIGHTER" }, { role: "KNIGHT" })).toBe(true);
    // Within two tiles of its own city (2, 8) it defends as Normal does.
    expect(
      kept(
        { role: "FIGHTER", hp: 3, at: at(4, 5) },
        { role: "SWORDSMAN", at: at(4, 6) },
      ),
    ).toBe(true);
  });

  it("now and then plays the second-best candidate of the same priority, the same way every time", () => {
    const base = aiView(
      easy(
        fieldV7([{ seat: 1, role: "FIGHTER", at: at(2, 8) }], {
          activeSeat: 1,
          factions: ["ORIGINAL", "UNDEAD"],
        }),
      ),
    );
    const research = (tech: string): CommandV7 =>
      ({ kind: "RESEARCH", tech }) as CommandV7;
    const candidates = [
      { command: research("HUNTING"), score: { priority: 1165 } },
      { command: research("FORESTRY"), score: { priority: 1165 } },
      { command: { kind: "END_TURN" } as CommandV7, score: { priority: 1 } },
    ];
    let swapped = 0;
    for (let index = 0; index < 1000; index += 1) {
      const view = { ...base, commandIndex: index };
      const first = easyDecisionV7(view, candidates);
      // Deterministic: the same decision draws the same.
      expect(easyDecisionV7(view, candidates)).toEqual(first);
      expect(easyDecisionDrawV7(view)).toBe(easyDecisionDrawV7(view));
      expect(first.draws).toBe(1);
      expect(first.candidates).toHaveLength(3);
      if (first.candidates[0] === candidates[1]) swapped += 1;
      else expect(first.candidates[0]).toBe(candidates[0]);
    }
    // About 15%.
    expect(swapped).toBeGreaterThan(110);
    expect(swapped).toBeLessThan(190);
    // Never End Turn in place of work, never across priorities or kinds,
    // and never a Kaboom.
    const kaboom = (unitId: number) =>
      ({ kind: "KABOOM", unitId }) as unknown as CommandV7;
    const kinds = [
      { command: research("HUNTING"), score: { priority: 1165 } },
      { command: kaboom(3), score: { priority: 1165 } },
    ];
    const bombs = [
      { command: kaboom(3), score: { priority: 1188 } },
      { command: kaboom(4), score: { priority: 1188 } },
    ];
    for (let index = 0; index < 200; index += 1) {
      const view = { ...base, commandIndex: index };
      expect(easyDecisionV7(view, kinds).candidates[0]).toBe(kinds[0]);
      expect(easyDecisionV7(view, bombs).candidates[0]).toBe(bombs[0]);
    }
    const lone = [candidates[0], candidates[2]] as typeof candidates;
    for (let index = 0; index < 200; index += 1)
      expect(
        easyDecisionV7({ ...base, commandIndex: index }, lone).candidates[0],
      ).toBe(candidates[0]);
    // Normal is the identity: the very same array, no draw.
    const normalView = {
      ...base,
      setup: { ...base.setup, aiDifficulty: "NORMAL" as const },
    };
    const normal = easyDecisionV7(normalView, candidates);
    expect(normal.candidates).toBe(candidates);
    expect(normal.draws).toBe(0);
  });

  it("starts a mission's RUSH two rounds late and holds a GUARD's others at home meanwhile", () => {
    const mission = required(missionByIdV7("DINOSAUR_4"));
    const setup = required(missionMatchSetupV7(mission));
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const views = created.state.players
      .filter((player) => player.seat > 0)
      .map((player) => viewForV7(created.state, player.id));
    const kinds = (round: number, difficulty: "NORMAL" | "EASY") =>
      views.map((view) => {
        const directive = activeMissionDirectiveV7({
          ...view,
          round,
          setup: { ...view.setup, aiDifficulty: difficulty },
        });
        return directive === null
          ? "NORMAL"
          : directive.kind === "GUARD"
            ? `GUARD${directive.others === undefined ? "" : `+${directive.others.kind}`}`
            : directive.kind;
      });
    expect(kinds(1, "NORMAL")).toEqual(["GUARD+RUSH", "RUSH"]);
    expect(kinds(1, "EASY")).toEqual(["GUARD", "NORMAL"]);
    expect(kinds(2, "EASY")).toEqual(["GUARD", "NORMAL"]);
    expect(kinds(3, "EASY")).toEqual(["GUARD+RUSH", "RUSH"]);
  });
});
