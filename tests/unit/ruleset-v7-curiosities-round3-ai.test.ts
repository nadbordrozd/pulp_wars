import { afterEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  CLAIM_ERRAND_STEPS_V7,
  CURIOSITY_APPROACH_PRIORITY_V7,
  CURIOSITY_CLAIM_PRIORITY_V7,
  DEFAULT_CURIOSITY_POLICY_OPTIONS_V7,
  EXPEDITION_ERRAND_STEPS_V7,
  MOON_GUN_ARRIVE_PRIORITY_V7,
  MOON_GUN_FIRE_PRIORITY_V7,
  MOON_GUN_TURNS_SAVED_V7,
  TESLA_ARRIVE_PRIORITY_V7,
  TESLA_ERRAND_STEPS_V7,
  TESLA_WATCH_RADIUS_V7,
  TESLA_ZAP_DAMAGE_FOR_POLICY_V7,
  curiosityFactsV7,
  setCuriosityPolicyOptionsV7,
} from "../../src/ai/v7-curiosities";
import {
  TESLA_ZAP_DAMAGE_V7,
  applyCommandV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import type { Round2PieceV7 } from "../fixtures/v7-round2-arena";
import {
  CLAIM_V7,
  EXPEDITION_V7,
  P1,
  P2,
  TOWER_V7,
  at,
  round3ArenaV7,
  round3UnitAtV7,
  type Round3ArenaOptionsV7,
} from "../fixtures/v7-round3-arena";

// Map curiosities round 3, the Normal AI (`pulp_wars-737.20`,
// docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 11): the four land
// errands (the Tesla Tower, the Moon Gun, the Gold Claim, the Lost
// Expedition), each on a small hand-built state of the open 20 x 20 arena
// (the viewer, seat 0, has its capital on (9, 15); seat 1 on (12, 4); the
// viewer's units march on (12, 4)). No match is played.

afterEach(() => {
  setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
});

const own = (
  role: Round2PieceV7["role"],
  x: number,
  y: number,
  extra: Partial<Round2PieceV7> = {},
): Round2PieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: Round2PieceV7["role"],
  x: number,
  y: number,
  extra: Partial<Round2PieceV7> = {},
): Round2PieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

/** The scored candidates of the viewer's unit on `from`, best first. */
function unitCandidates(
  state: GameStateV7,
  from: CoordV7,
  kind?: CommandV7["kind"],
) {
  const id = round3UnitAtV7(state, from).id;
  return chooseNormalCommandV7(viewOf(state)).candidates.filter(
    (candidate) =>
      "unitId" in candidate.command &&
      candidate.command.unitId === id &&
      (kind === undefined || candidate.command.kind === kind),
  );
}

const arena = (options: Round3ArenaOptionsV7) => round3ArenaV7(options);

describe("the published numbers and the facts (section 11)", () => {
  it("pins the policy's copies and the errand bounds", () => {
    expect(TESLA_ZAP_DAMAGE_FOR_POLICY_V7).toBe(TESLA_ZAP_DAMAGE_V7);
    expect(TESLA_ARRIVE_PRIORITY_V7).toBe(952);
    expect(MOON_GUN_ARRIVE_PRIORITY_V7).toBe(728);
    expect(MOON_GUN_FIRE_PRIORITY_V7).toBe(729);
    expect(CURIOSITY_CLAIM_PRIORITY_V7).toBe(1330);
    expect(CURIOSITY_APPROACH_PRIORITY_V7).toBe(725);
    expect(CLAIM_ERRAND_STEPS_V7).toBe(6);
    expect(EXPEDITION_ERRAND_STEPS_V7).toBe(6);
    expect(TESLA_ERRAND_STEPS_V7).toBe(4);
    expect(TESLA_WATCH_RADIUS_V7).toBe(4);
    expect(MOON_GUN_TURNS_SAVED_V7).toBe(3);
  });

  it("knows the Towers, Guns, stakeable Claims, and unfound Expeditions", () => {
    const state = arena({
      kinds: ["TESLA_TOWER", "MOON_GUN", "GOLD_CLAIM", "LOST_EXPEDITION"],
      pieces: [own("FIGHTER", 2, 2)],
    });
    const facts = curiosityFactsV7(viewOf(state));
    expect(facts?.towers).toEqual([TOWER_V7]);
    expect(facts?.guns).toEqual([at(4, 10)]);
    expect(facts?.claims).toEqual([CLAIM_V7]);
    expect(facts?.expeditions).toEqual([EXPEDITION_V7]);
    // An own Claim, a played-out one, and a found Expedition are not
    // errands.
    const done = checkedV7({
      ...state,
      curiosities: state.curiosities.map((curiosity) =>
        curiosity.kind === "GOLD_CLAIM"
          ? { ...curiosity, ownerId: P1 }
          : curiosity.kind === "LOST_EXPEDITION"
            ? { ...curiosity, foundBy: P2 }
            : curiosity,
      ),
    });
    const after = curiosityFactsV7(viewOf(done));
    expect(after?.claims).toEqual([]);
    expect(after?.expeditions).toEqual([]);
    // With curiosity play off the policy reads nothing.
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(curiosityFactsV7(viewOf(state))).toBeNull();
  });

  it("decides as before on a board without round-3 curiosities", () => {
    const plain = arena({
      pieces: [own("FIGHTER", 9, 10), foe("FIGHTER", 11, 6)],
    });
    expect(curiosityFactsV7(viewOf(plain))).toBeNull();
    const decision = chooseNormalCommandV7(viewOf(plain));
    expect(
      decision.candidates.some(
        (candidate) =>
          candidate.command.kind === "ZAP" ||
          candidate.command.kind === "FIRE_MOON_GUN",
      ),
    ).toBe(false);
  });
});

describe("the Tesla Tower (section 11)", () => {
  it("walks the nearest free unit onto the Tower while an enemy is within 4", () => {
    const state = arena({
      kinds: ["TESLA_TOWER"],
      pieces: [own("FIGHTER", 9, 10), foe("FIGHTER", 11, 6)],
    });
    const best = unitCandidates(state, at(9, 10), "MOVE")[0];
    expect(best === undefined ? undefined : endOf(best.command)).toEqual(
      TOWER_V7,
    );
    expect(best?.score.priority).toBe(TESLA_ARRIVE_PRIORITY_V7);
    // Nothing to zap: no errand, no arrival.
    const quiet = arena({
      kinds: ["TESLA_TOWER"],
      pieces: [own("FIGHTER", 9, 10), foe("FIGHTER", 16, 2)],
    });
    expect(
      unitCandidates(quiet, at(9, 10), "MOVE").some(
        (candidate) => candidate.score.priority === TESLA_ARRIVE_PRIORITY_V7,
      ),
    ).toBe(false);
  });

  it("holds the Tower (no routine Move) and zaps an enemy in range", () => {
    const state = arena({
      kinds: ["TESLA_TOWER"],
      pieces: [own("FIGHTER", 9, 9), foe("GUARD", 9, 11)],
    });
    const candidates = unitCandidates(state, TOWER_V7);
    const zap = candidates.find(
      (candidate) => candidate.command.kind === "ZAP",
    );
    expect(zap?.score.priority).toBe(900);
    expect(
      candidates
        .filter((candidate) => candidate.command.kind === "MOVE")
        .every((candidate) => candidate.score.priority > 735),
    ).toBe(true);
    // A kill ranks with a kill.
    const weak = arena({
      kinds: ["TESLA_TOWER"],
      pieces: [own("FIGHTER", 9, 9), foe("FIGHTER", 9, 11, { hp: 3 })],
    });
    const kill = unitCandidates(weak, TOWER_V7, "ZAP")[0];
    expect(kill?.score.priority).toBeGreaterThanOrEqual(1180);
    // The zap is accepted by the engine.
    const result = applyCommandV7(weak, P1, kill?.command as CommandV7);
    expect(result.accepted).toBe(true);
  });
});

describe("the Moon Gun (section 11)", () => {
  // The Gun stands 5 from the viewer's capital; a Fighter beside it marches
  // 12 or more turns on the enemy capital, and fewer through the Gun.
  const GUN = at(4, 16);
  const gunArena = (pieces: readonly Round2PieceV7[]) =>
    arena({
      curiosities: [{ kind: "MOON_GUN", at: GUN, lastFired: null }],
      pieces,
    });

  it("walks onto the Gun when the shot saves 3 turns, and fires toward the goal", () => {
    const state = gunArena([own("FIGHTER", 5, 17)]);
    const best = unitCandidates(state, at(5, 17), "MOVE")[0];
    expect(best === undefined ? undefined : endOf(best.command)).toEqual(GUN);
    expect(best?.score.priority).toBe(MOON_GUN_ARRIVE_PRIORITY_V7);
    const onGun = gunArena([own("FIGHTER", 4, 16)]);
    const shot = unitCandidates(onGun, GUN, "FIRE_MOON_GUN")[0];
    expect(shot?.score.priority).toBe(MOON_GUN_FIRE_PRIORITY_V7);
    // The landing is a legal tile nearest the enemy capital (7 steps from
    // it; the first such in (y, x) order).
    expect(shot?.command.kind === "FIRE_MOON_GUN" && shot.command.at).toEqual(
      at(5, 11),
    );
    // Only that landing is a candidate.
    expect(unitCandidates(onGun, GUN, "FIRE_MOON_GUN")).toHaveLength(1);
  });

  it("does not take the Gun when walking is about as fast", () => {
    // Three steps from the enemy capital: no shot saves 3 turns.
    const state = arena({
      curiosities: [{ kind: "MOON_GUN", at: at(12, 7), lastFired: null }],
      pieces: [own("FIGHTER", 12, 7)],
    });
    expect(unitCandidates(state, at(12, 7), "FIRE_MOON_GUN")).toEqual([]);
  });

  it("never lands where the visible enemies would kill it", () => {
    // Two Knights by the nearest landings would kill the wounded Fighter
    // there; it lands elsewhere or not at all.
    const state = gunArena([
      own("FIGHTER", 4, 16, { hp: 3 }),
      foe("KNIGHT", 6, 10),
      foe("KNIGHT", 4, 10),
    ]);
    const shot = unitCandidates(state, GUN, "FIRE_MOON_GUN")[0];
    expect(
      shot === undefined ||
        (shot.command.kind === "FIRE_MOON_GUN" &&
          !same(shot.command.at, at(5, 11))),
    ).toBe(true);
  });
});

describe("the Gold Claim and the Lost Expedition (section 11)", () => {
  it("stakes a Claim like a chest and walks toward one from farther away", () => {
    const state = arena({
      kinds: ["GOLD_CLAIM"],
      pieces: [own("FIGHTER", 15, 11)],
    });
    const best = unitCandidates(state, at(15, 11), "MOVE")[0];
    expect(best === undefined ? undefined : endOf(best.command)).toEqual(
      CLAIM_V7,
    );
    expect(best?.score.priority).toBe(CURIOSITY_CLAIM_PRIORITY_V7);
    const far = arena({
      kinds: ["GOLD_CLAIM"],
      pieces: [own("FIGHTER", 15, 14)],
    });
    const approach = unitCandidates(far, at(15, 14), "MOVE")[0];
    expect(approach?.score.priority).toBe(CURIOSITY_APPROACH_PRIORITY_V7);
    // Its own Claim is not staked again.
    const owned = checkedV7({
      ...state,
      curiosities: [
        { kind: "GOLD_CLAIM", at: CLAIM_V7, ownerId: P1, left: 12 },
      ],
    });
    expect(
      unitCandidates(owned, at(15, 11), "MOVE").some(
        (candidate) => candidate.score.priority === CURIOSITY_CLAIM_PRIORITY_V7,
      ),
    ).toBe(false);
  });

  it("races for an unfound Expedition, any role", () => {
    const state = arena({
      kinds: ["LOST_EXPEDITION"],
      pieces: [own("CAPTAIN", 4, 5)],
    });
    const best = unitCandidates(state, at(4, 5), "MOVE")[0];
    expect(best === undefined ? undefined : endOf(best.command)).toEqual(
      EXPEDITION_V7,
    );
    expect(best?.score.priority).toBe(CURIOSITY_CLAIM_PRIORITY_V7);
  });

  it("researches with the notes in hand even with no Coins", () => {
    const state = arena({
      kinds: [],
      techs: { 0: ["GATHERING", "HUNTING", "SCOUTING", "DRILL"] },
      coins: 0,
      pieces: [own("FIGHTER", 2, 2)],
    });
    const holding = checkedV7({
      ...state,
      curiosities: [
        { kind: "LOST_EXPEDITION", at: EXPEDITION_V7, foundBy: P1 },
      ],
    });
    const research = chooseNormalCommandV7(viewOf(holding)).candidates.filter(
      (candidate) => candidate.command.kind === "RESEARCH",
    );
    expect(research.length).toBeGreaterThan(0);
    expect(research.some((candidate) => candidate.score.priority >= 0)).toBe(
      true,
    );
    // Without the notes nothing is affordable.
    expect(
      chooseNormalCommandV7(viewOf(state)).candidates.some(
        (candidate) => candidate.command.kind === "RESEARCH",
      ),
    ).toBe(false);
  });
});
