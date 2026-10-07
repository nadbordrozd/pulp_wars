import { describe, expect, it } from "vitest";
import {
  TRACTOR_FREE_PRIORITY_V7,
  setMartianPolicyOptionsV7,
} from "../../src/ai/v7-martian";
import {
  TECHNOLOGY_IDS_V7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  candidatesV7,
  moveCandidateV7,
  unitCandidatesV7,
} from "../fixtures/v7-dinosaur-ai";
import type { GoblinPieceV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7 } from "../fixtures/v7-ice-folk";

// The Normal AI second pass (`pulp_wars-9s0.8`,
// docs/architecture/NORMAL_AI.md, "Second pass"). Two-seat 11 x 11 field:
// seat 0 is the viewer (capital (8, 8)), seat 1 the opponent (capital
// (2, 8)); villages (5, 5), (8, 5), (5, 8); every other land tile is Grass,
// the whole board is explored (so seat 1's capital is a known target).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const own = (
  role: GoblinPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: GoblinPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

interface FieldOptions {
  readonly factions?: readonly FactionIdV7[];
  readonly coins?: number;
  /** Seat 0's researched technologies (default: every technology). */
  readonly techs?: readonly TechnologyIdV7[];
}

function field(
  pieces: readonly GoblinPieceV7[],
  options: FieldOptions = {},
): GameStateV7 {
  const state = iceFieldV7(pieces, {
    factions: options.factions ?? ["ORIGINAL", "ORIGINAL"],
    coins: options.coins ?? 0,
    ...(options.techs === undefined
      ? {}
      : { techs: { 0: options.techs, 1: TECHNOLOGY_IDS_V7 } }),
  });
  // Seat 0's units have no home city, so its capital has room to train.
  const viewer = state.humanPlayerId;
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.ownerId === viewer ? { ...unit, homeCityId: null } : unit,
    ),
  });
}

const trainCandidates = (state: GameStateV7) =>
  candidatesV7(state).filter(
    (candidate) =>
      candidate.command.kind === "TRAIN" ||
      candidate.command.kind === "LAY_EGG",
  );

const ARMY = [own("FIGHTER", 9, 9), own("FIGHTER", 7, 9), own("FIGHTER", 9, 7)];
/**
 * Tuning 5 (`pulp_wars-w49.4`): in a match of Human, Undead, and Goblin
 * seats only, a seat plays the army rules and saves for no unit (it trains
 * every turn). The savings plan is the policy of every other match, so
 * these positions face a seat that plays no army rules: a Dwarf one since
 * the Dinosaur pass (`pulp_wars-w49.15`), which made the Dinosaur seats
 * army seats too.
 */
const SAVERS: readonly FactionIdV7[] = ["ORIGINAL", "DWARF"];

describe("Normal AI second pass: the savings plan", () => {
  it("buys the Chivalry-tier unit first once it can afford one", () => {
    const state = field(ARMY, { coins: 9, factions: SAVERS });
    const training = trainCandidates(state);
    expect(training).toHaveLength(1);
    expect(training[0]?.command).toMatchObject({ role: "KNIGHT" });
    // Before the economy (1200) and the at-war training (1205).
    expect(training[0]?.score.priority).toBe(1206);
  });

  it("holds training and research while the goal is a turn or two away", () => {
    const state = field(ARMY, { coins: 6, factions: SAVERS });
    expect(trainCandidates(state)).toEqual([]);
    expect(
      candidatesV7(state).some(
        (candidate) => candidate.command.kind === "RESEARCH",
      ),
    ).toBe(false);
  });

  it("does not save while the army is small", () => {
    const state = field(ARMY.slice(0, 2), { coins: 6, factions: SAVERS });
    expect(
      trainCandidates(state).some(
        (candidate) => candidate.command.kind === "TRAIN",
      ),
    ).toBe(true);
  });

  it("does not save while an own city is threatened", () => {
    const state = field([...ARMY, foe("FIGHTER", 6, 7)], {
      coins: 6,
      factions: SAVERS,
    });
    expect(trainCandidates(state).length).toBeGreaterThan(0);
  });

  it("saves for Chivalry once its prerequisites are researched", () => {
    const techs = TECHNOLOGY_IDS_V7.filter((tech) => tech !== "CHIVALRY");
    // 60 Coins: as the 25th technology Chivalry costs 55 (tuning 4; 30
    // Coins bought it before).
    const rich = field(ARMY, { coins: 60, techs, factions: SAVERS });
    const research = candidatesV7(rich).find(
      (candidate) =>
        candidate.command.kind === "RESEARCH" &&
        candidate.command.tech === "CHIVALRY",
    );
    expect(research?.score.priority).toBe(1206);
  });
});

describe("Normal AI second pass: Spitters", () => {
  it("lays a Spitter Egg while a Dinosaur seat at war has none", () => {
    // (Against a Dwarf seat: the bias of `pulp_wars-9s0.8`. Against a
    // Human seat a Dinosaur seat plays the army rules and lays by its
    // shares, tests/unit/ruleset-v7-dinosaur-pass.test.ts.)
    const state = field([own("FIGHTER", 9, 9), own("FIGHTER", 7, 9)], {
      factions: ["DINOSAUR", "DWARF"],
      coins: 5,
    });
    const laid = trainCandidates(state).find(
      (candidate) => candidate.command.kind === "LAY_EGG",
    );
    expect(laid?.command).toMatchObject({ role: "MARKSMAN" });
  });
});

describe("Normal AI second pass: the hunt", () => {
  // Seat 1's Ice Witch (12 HP), in sight of the capital, two tiles from
  // three own Fighters that can each step next to her and hit her for 6
  // (`pulp_wars-1wy.3`: Snow cover x 1.25; it was 5 at x 1.5), so two of
  // them kill her.
  const hunters = [
    own("FIGHTER", 4, 6),
    own("FIGHTER", 6, 4),
    own("FIGHTER", 8, 4),
  ];
  const witch = foe("CAPTAIN", 6, 6);

  it("moves in for a kill on a visible Witch", () => {
    const state = field([...hunters, witch], {
      factions: ["ORIGINAL", "ICE_FOLK"],
    });
    const move = moveCandidateV7(state, at(4, 6), at(5, 6));
    expect(move?.score.priority).toBe(1177);
    // Above the routine Moves of the hunters the kill needs (two of the
    // three).
    expect(
      hunters.filter(
        (hunter) =>
          unitCandidatesV7(state, hunter.at, "MOVE")[0]?.score.priority ===
          1177,
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("does not move in when the hunters cannot kill her this turn", () => {
    const state = field([hunters[0] as GoblinPieceV7, witch], {
      factions: ["ORIGINAL", "ICE_FOLK"],
    });
    for (const candidate of unitCandidatesV7(state, at(4, 6), "MOVE"))
      expect(candidate.score.priority).not.toBe(1177);
  });
});

describe("Normal AI second pass: the siege", () => {
  // Seat 1's capital (2, 8) is held by a Fighter; an own Fighter stands
  // next to it ready to step in, and three Knights can reach the center.
  const defender = foe("FIGHTER", 2, 8);
  const capturer = own("FIGHTER", 3, 8);
  const knights = [
    own("KNIGHT", 5, 7),
    own("KNIGHT", 5, 9),
    own("KNIGHT", 5, 8),
  ];

  it("moves the assault into reach of the center's defender", () => {
    // The Martian pass's correction (`pulp_wars-w49.14`): a Human seat
    // takes the villages first for ten rounds; the siege is after them.
    const state = { ...field([defender, capturer, ...knights]), round: 12 };
    const knight = unitCandidatesV7(state, at(5, 7), "MOVE")[0];
    expect(knight?.score.priority).toBe(1177);
    // The capturer next to the center is not one of the hunters.
    for (const candidate of unitCandidatesV7(state, at(3, 8)))
      expect(candidate.score.priority).not.toBe(1178);
  });

  // Tuning 2 (7r47): a Human Knight is a capturer itself, so the seat
  // without one fields Vampires (the Undead Knight role cannot capture).
  it("does not move in without a capturer to take the city", () => {
    const state = field([defender, ...knights], {
      factions: ["UNDEAD", "ORIGINAL"],
    });
    const knight = unitCandidatesV7(state, at(5, 7), "MOVE")[0];
    expect(knight?.score.priority).not.toBe(1177);
  });
});

describe("Normal AI second pass: Ice Folk, Martian abilities", () => {
  it("steps a Mammoth where its Sweep hits a flank before it attacks", () => {
    // Hostile Fighters on (5, 5) and (6, 5); from (4, 4) the Mammoth's
    // Sweep on (5, 5) hits nothing, from (5, 4) it hits (6, 5).
    const state = field(
      [own("SWORDSMAN", 4, 4), foe("FIGHTER", 5, 5), foe("FIGHTER", 6, 5)],
      { factions: ["ICE_FOLK", "ORIGINAL"] },
    );
    const best = unitCandidatesV7(state, at(4, 4))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(905);
  });

  it("pulls a hostile unit where the other own attacks take half of it", () => {
    const state = field(
      [
        // Pulled to (6, 4): the Grunts (4 each) and the Projector (2) take
        // 10 of the Guard's 17 HP; with the Mothership's 5 it would still
        // live, so this is no kill setup. `pulp_wars-1wy.3`: a Grunt has
        // Attack 2 again (4 on the Guard; at Attack 1.5, `pulp_wars-b5f.2`,
        // it took two more Grunts with their ray pistols).
        own("KNIGHT", 6, 3),
        own("FIGHTER", 5, 4),
        own("FIGHTER", 7, 4),
        own("GUARD", 7, 3),
        foe("GUARD", 6, 5),
      ],
      { factions: ["MARTIAN", "ORIGINAL"] },
    );
    // `pulp_wars-1wy.4`: the Mothership's pull is free, so it goes before
    // its own Move and attacks (1184); the policy of `pulp_wars-1wy.3`
    // scored it as the utility pull (1150).
    const pull = unitCandidatesV7(state, at(6, 3), "TRACTOR_BEAM")[0];
    expect(pull?.score.priority).toBe(TRACTOR_FREE_PRIORITY_V7);
    const previous = setMartianPolicyOptionsV7({ mobilityPlay: false });
    try {
      expect(
        unitCandidatesV7(state, at(6, 3), "TRACTOR_BEAM")[0]?.score.priority,
      ).toBe(1150);
    } finally {
      setMartianPolicyOptionsV7(previous);
    }
  });
});
