import { afterEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  DEFAULT_CURIOSITY_POLICY_OPTIONS_V7,
  MONSTER_STEP_AWAY_PRIORITY_V7,
  NEUTRAL_BOUNTY_FOR_POLICY_V7,
  SEA_SERPENT_BOUNTY_FOR_POLICY_V7,
  SEA_SERPENT_REGENERATION_FOR_POLICY_V7,
  curiosityFactsV7,
  setCuriosityPolicyOptionsV7,
} from "../../src/ai/v7-curiosities";
import { navalFleetFactsV7 } from "../../src/ai/v7-naval";
import {
  SEA_SERPENT_BOUNTY_V7,
  SEA_SERPENT_REGENERATION_V7,
  previewMonsterV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type PlayerViewV7,
} from "../../src/engine/index";
import { round2UnitAtV7 } from "../fixtures/v7-round2-arena";
import {
  SERPENT_HOME_V7,
  at,
  serpentArenaV7,
  serpentOfV7,
} from "../fixtures/v7-serpent-arena";

// Map curiosities round 3, bead B, the Normal AI (`pulp_wars-737.21`,
// docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 11): the Sea
// Serpent is avoided unless strong, on the lake of `serpentArenaV7` (the
// viewer is seat 0, player 1). No match is played.

afterEach(() => {
  setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
});

const P1 = 1 as PlayerId;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const key = (at: CoordV7) => `${at.x},${at.y}`;
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
const viewOf = (state: GameStateV7): PlayerViewV7 => viewForV7(state, P1);

/** The scored candidates of the viewer's unit on `from`, best first. */
function unitCandidates(
  state: GameStateV7,
  from: CoordV7,
  kind?: CommandV7["kind"],
) {
  const id = round2UnitAtV7(state, from).id;
  return chooseNormalCommandV7(viewOf(state)).candidates.filter(
    (candidate) =>
      "unitId" in candidate.command &&
      candidate.command.unitId === id &&
      (kind === undefined || candidate.command.kind === kind),
  );
}
/** The ends of the Moves the engine offers the unit on `from`. */
function offeredEnds(state: GameStateV7, from: CoordV7): readonly CoordV7[] {
  const id = round2UnitAtV7(state, from).id;
  return queryPlayerCommandsV7(viewOf(state))
    .filter((command) => command.kind === "MOVE" && command.unitId === id)
    .map((command) => endOf(command))
    .filter((end): end is CoordV7 => end !== undefined);
}
const candidateEnds = (state: GameStateV7, from: CoordV7) =>
  unitCandidates(state, from, "MOVE")
    .map((candidate) => endOf(candidate.command))
    .filter((end): end is CoordV7 => end !== undefined);
const ship = (
  role: "PATROL_BOAT" | "BATTLESHIP" | "SUBMARINE",
  tile: CoordV7,
  hp?: number,
) => ({
  seat: 0,
  role,
  at: tile,
  form: "NAVAL" as const,
  ...(hp === undefined ? {} : { hp }),
});
const attacksOnSerpent = (state: GameStateV7) => {
  const serpent = serpentOfV7(state).id;
  return chooseNormalCommandV7(viewOf(state)).candidates.filter(
    (candidate) =>
      candidate.command.kind === "ATTACK" &&
      candidate.command.targetUnitId === serpent,
  );
};

describe("the published numbers and the facts", () => {
  it("pins the policy's copies to the engine", () => {
    expect(SEA_SERPENT_REGENERATION_FOR_POLICY_V7).toBe(
      SEA_SERPENT_REGENERATION_V7,
    );
    expect(SEA_SERPENT_BOUNTY_FOR_POLICY_V7).toBe(SEA_SERPENT_BOUNTY_V7);
    expect(NEUTRAL_BOUNTY_FOR_POLICY_V7.SEA_SERPENT).toBe(
      SEA_SERPENT_BOUNTY_V7,
    );
  });

  it("reads the Serpent like a lone monster, its reach closed to embarked units", () => {
    const state = serpentArenaV7({ pieces: [ship("PATROL_BOAT", at(1, 5))] });
    const facts = curiosityFactsV7(viewOf(state));
    const serpent = facts?.monsters[0];
    expect(serpent?.breed).toBe("SEA_SERPENT");
    expect(serpent?.regeneration).toBe(4);
    expect(serpent?.bounty).toBe(15);
    const preview = previewMonsterV7(viewOf(state), serpentOfV7(state).id);
    expect([...(serpent?.avoidKeys ?? [])].sort()).toEqual(
      (preview?.provokeTiles ?? []).map((tile) => `${tile.y},${tile.x}`).sort(),
    );
    expect(serpent?.embarkedAvoidKeys.size).toBe(
      preview?.reachTiles.length ?? -1,
    );
  });

  it("is no seat's fleet: the naval plan does not count it as a hostile Battleship", () => {
    const state = serpentArenaV7({ pieces: [ship("PATROL_BOAT", at(1, 5))] });
    const view = viewOf(state);
    expect(
      navalFleetFactsV7(view, (ownerId) => ownerId !== view.viewer.id)
        .hostileBattleships,
    ).toEqual([]);
  });
});

describe("routine Moves", () => {
  it("never ends a ship's routine Move next to it", () => {
    const from = at(8, 7);
    const state = serpentArenaV7({ pieces: [ship("PATROL_BOAT", from)] });
    expect(
      offeredEnds(state, from).some(
        (end) => chebyshev(end, SERPENT_HOME_V7) === 1,
      ),
    ).toBe(true);
    const ends = candidateEnds(state, from);
    expect(ends.length).toBeGreaterThan(0);
    expect(ends.every((end) => chebyshev(end, SERPENT_HOME_V7) > 1)).toBe(true);
  });

  it("steps a ship with no attack on a seat's unit away from it", () => {
    const from = at(6, 10);
    const state = serpentArenaV7({ pieces: [ship("PATROL_BOAT", from)] });
    const best = unitCandidates(state, from)[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(MONSTER_STEP_AWAY_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end !== undefined && chebyshev(end, SERPENT_HOME_V7) > 1).toBe(true);
  });

  it("never ends an embarked unit's routine Move in its reach", () => {
    const from = at(1, 5);
    const state = serpentArenaV7({
      pieces: [{ seat: 0, role: "FIGHTER", at: from, form: "EMBARKED" }],
    });
    const reach = new Set(
      (
        previewMonsterV7(viewOf(state), serpentOfV7(state).id)?.reachTiles ?? []
      ).map(key),
    );
    expect(offeredEnds(state, from).some((end) => reach.has(key(end)))).toBe(
      true,
    );
    expect(
      candidateEnds(state, from).every((end) => !reach.has(key(end))),
    ).toBe(true);
    // A ship may sail there (only the tiles next to it are closed).
    const boat = serpentArenaV7({ pieces: [ship("PATROL_BOAT", from)] });
    expect(
      candidateEnds(boat, from).some(
        (end) => reach.has(key(end)) && chebyshev(end, SERPENT_HOME_V7) > 1,
      ),
    ).toBe(true);
  });
});

describe("attacks: kill plans and the ranged chip", () => {
  it("does not chip a healthy Serpent from inside its reach", () => {
    const state = serpentArenaV7({
      pieces: [ship("BATTLESHIP", at(6, 10))],
    });
    expect(
      queryPlayerCommandsV7(viewOf(state)).some(
        (command) =>
          command.kind === "ATTACK" &&
          command.targetUnitId === serpentOfV7(state).id,
      ),
    ).toBe(true);
    expect(attacksOnSerpent(state)).toEqual([]);
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(attacksOnSerpent(state).length).toBeGreaterThan(0);
  });

  it("shells it from outside its reach when the hit beats its regeneration", () => {
    const state = serpentArenaV7({
      serpentAt: at(8, 9),
      terrain: [
        { at: at(10, 9), terrain: "SHALLOW_WATER" },
        { at: at(11, 9), terrain: "SHALLOW_WATER" },
      ],
      pieces: [ship("BATTLESHIP", at(11, 9))],
    });
    const preview = queryCombatPreviewV7(
      viewOf(state),
      round2UnitAtV7(state, at(11, 9)).id,
      serpentOfV7(state).id,
    );
    expect(preview?.monsterRetaliates).toBe(false);
    expect(preview?.damageToDefender).toBeGreaterThan(4);
    expect(attacksOnSerpent(state)).toHaveLength(1);
    expect(unitCandidates(state, at(11, 9))[0]?.command.kind).toBe("ATTACK");
  });

  it("kills a weakened Serpent with the ships beside it (the hunt plan of every navy)", () => {
    const state = serpentArenaV7({
      serpentHp: 6,
      pieces: [ship("BATTLESHIP", at(6, 10)), ship("PATROL_BOAT", at(4, 8))],
    });
    const attacks = attacksOnSerpent(state);
    expect(attacks.length).toBeGreaterThan(0);
    const top = chooseNormalCommandV7(viewOf(state)).candidates[0];
    expect(top?.command.kind).toBe("ATTACK");
  });
});

describe("gating", () => {
  it("has no facts without a curiosity or a neutral unit, and the same decision either way", () => {
    const state = serpentArenaV7({
      home: null,
      pieces: [ship("PATROL_BOAT", at(8, 7))],
    });
    expect(curiosityFactsV7(viewOf(state))).toBeNull();
    const on = chooseNormalCommandV7(viewOf(state)).command;
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(chooseNormalCommandV7(viewOf(state)).command).toEqual(on);
  });
});
