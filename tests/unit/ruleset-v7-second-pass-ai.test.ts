import { describe, expect, it } from "vitest";
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

describe("Normal AI second pass: the savings plan", () => {
  it("buys the Chivalry-tier unit first once it can afford one", () => {
    const state = field(ARMY, { coins: 9 });
    const training = trainCandidates(state);
    expect(training).toHaveLength(1);
    expect(training[0]?.command).toMatchObject({ role: "KNIGHT" });
    // Before the economy (1200) and the at-war training (1205).
    expect(training[0]?.score.priority).toBe(1206);
  });

  it("holds training and research while the goal is a turn or two away", () => {
    const state = field(ARMY, { coins: 6 });
    expect(trainCandidates(state)).toEqual([]);
    expect(
      candidatesV7(state).some(
        (candidate) => candidate.command.kind === "RESEARCH",
      ),
    ).toBe(false);
  });

  it("does not save while the army is small", () => {
    const state = field(ARMY.slice(0, 2), { coins: 6 });
    expect(
      trainCandidates(state).some(
        (candidate) => candidate.command.kind === "TRAIN",
      ),
    ).toBe(true);
  });

  it("does not save while an own city is threatened", () => {
    const state = field([...ARMY, foe("FIGHTER", 6, 7)], { coins: 6 });
    expect(trainCandidates(state).length).toBeGreaterThan(0);
  });

  it("saves for Chivalry once its prerequisites are researched", () => {
    const techs = TECHNOLOGY_IDS_V7.filter((tech) => tech !== "CHIVALRY");
    const rich = field(ARMY, { coins: 30, techs });
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
    const state = field([own("FIGHTER", 9, 9), own("FIGHTER", 7, 9)], {
      factions: ["DINOSAUR", "ORIGINAL"],
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
  // three own Fighters that can each step next to her and hit her for 5.
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
    // Above the routine Moves of every hunter.
    for (const hunter of hunters) {
      const best = unitCandidatesV7(state, hunter.at, "MOVE")[0];
      expect(best?.score.priority).toBe(1177);
    }
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
    const state = field([defender, capturer, ...knights]);
    const knight = unitCandidatesV7(state, at(5, 7), "MOVE")[0];
    expect(knight?.score.priority).toBe(1177);
    // The capturer next to the center is not one of the hunters.
    for (const candidate of unitCandidatesV7(state, at(3, 8)))
      expect(candidate.score.priority).not.toBe(1178);
  });

  it("does not move in without a capturer to take the city", () => {
    const state = field([defender, ...knights]);
    const knight = unitCandidatesV7(state, at(5, 7), "MOVE")[0];
    expect(knight?.score.priority).not.toBe(1177);
  });
});

describe("Normal AI second pass: Ice Folk, Martian abilities", () => {
  it("steps a Mammoth where its Sweep hits a flank before it attacks", () => {
    // Hostile Fighters on (5, 5) and (6, 5); from (4, 4) the Mammoth's
    // Sweep on (5, 5) hits nothing, from (5, 4) it hits (6, 5).
    const state = field(
      [own("GUARD", 4, 4), foe("FIGHTER", 5, 5), foe("FIGHTER", 6, 5)],
      { factions: ["ICE_FOLK", "ORIGINAL"] },
    );
    const best = unitCandidatesV7(state, at(4, 4))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(905);
  });

  it("pulls a hostile unit where the other own attacks take half of it", () => {
    const state = field(
      [
        // Pulled to (6, 4): the Grunts (2 each) and the Projector (2) take
        // 10 of the Guard's 17 HP; with the Mothership's 5 it would still
        // live, so this is no kill setup. `pulp_wars-b5f.2`: a Grunt (Attack
        // 1.5, was 2) deals 2, not 4, so two more Grunts join with their ray
        // pistols from two tiles away.
        own("KNIGHT", 6, 3),
        own("FIGHTER", 5, 4),
        own("FIGHTER", 7, 4),
        own("FIGHTER", 4, 4),
        own("FIGHTER", 8, 4),
        own("GUARD", 7, 3),
        foe("GUARD", 6, 5),
      ],
      { factions: ["MARTIAN", "ORIGINAL"] },
    );
    const pull = unitCandidatesV7(state, at(6, 3), "TRACTOR_BEAM")[0];
    expect(pull?.score.priority).toBe(1150);
  });
});
