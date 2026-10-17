import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  publicDangerForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  NAVAL_COUNTER_TRAINING_PRIORITY_V7,
  NAVAL_FLEET_RESEARCH_PRIORITY_V7,
  NAVAL_TORPEDO_PRIORITIES_V7,
  drownedCrewRisingTenthsV7,
  navalBattleshipStationValueV7,
  navalBranchResearchV7,
  navalCounterRoleV7,
  navalFleetFactsV7,
  navalRamApproachV7,
  type NavalToolsV7,
} from "../../src/ai/v7-naval";
import {
  DROWNED_CREW_TORPEDO_PRIORITY_V7,
  NAVAL_PLAGUE_RESEARCH_PRIORITY_V7,
  navalPlagueTechnologyV7,
} from "../../src/ai/v7-naval-undead";
import {
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  NAVAL_TECHS_V7,
  acceptV7,
  movedActivationV7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Themed naval branches, the Undead Drowned Fleet's Normal AI
// (`pulp_wars-5ti.17`, docs/product/RULESET_7_NAVAL_FACTIONS.md section
// 4.6): the value of the Ghost Ship a kill raises (torpedo, ram approach,
// Battleship station), the Plague Galleon's station and its Pestilence,
// the training and research that put the Drowned Fleet to sea, and the
// other seats' respect for the Drowned Crews, each on a small hand-built
// strait (rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water). Seat 0
// decides.

const WITHOUT_SEAMANSHIP: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly moved?: boolean;
}

function strait(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly PieceV7[],
  technologies: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ] = [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
): GameStateV7 {
  let state = navalArenaV7({
    factions,
    technologies,
    units: pieces.map((piece) => ({
      seat: piece.seat,
      role: piece.role,
      at: piece.at,
    })),
  });
  for (const piece of pieces) {
    const unit = navalUnitAtV7(state, piece.at);
    const patch: Partial<UnitStateV7> = {
      ...(piece.hp === undefined ? {} : { hp: piece.hp }),
      ...(piece.moved === true ? { activation: movedActivationV7(unit) } : {}),
    };
    if (Object.keys(patch).length > 0)
      state = patchNavalUnitV7(state, unit.id, patch);
  }
  return state;
}

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, seatV7(state, 0).id);
const attack = (unitId: number, targetUnitId: number): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitId as UnitId,
  targetUnitId: targetUnitId as UnitId,
});

/** The tools the policy lends the naval rules, rebuilt from its exports. */
function toolsOf(view: PlayerViewV7): NavalToolsV7 {
  const commands = queryPlayerCommandsV7(view);
  return {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    danger: (inView, unit, at) => publicDangerForPolicyV7(inView, unit, at),
    reaches: (hostile, at) =>
      publicThreatenedTilesForPolicyV7(view, hostile).some(
        (tile) => tile.x === at.x && tile.y === at.y,
      ),
    project: projectPublicUnitForPolicyV7,
    moveDestinations: (unitId) =>
      commands.flatMap((command) => {
        const end = command.kind === "MOVE" ? command.path.at(-1) : undefined;
        return command.kind === "MOVE" &&
          command.unitId === unitId &&
          end !== undefined
          ? [end]
          : [];
      }),
    commands,
  };
}

function viewUnit(view: PlayerViewV7, id: number) {
  const unit = view.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("unit not visible");
  return unit;
}

/** The best candidate of one unit, in the policy's order. */
function bestOf(view: PlayerViewV7, unitId: number): CommandV7 {
  const best = chooseNormalCommandV7(view).candidates.find(
    (item) => "unitId" in item.command && item.command.unitId === unitId,
  );
  if (best === undefined) throw new Error("the unit has no candidate");
  return best.command;
}

describe("the rising's value (section 4.6)", () => {
  // A Sunken Galley on Deep Water between a hostile Patrol Boat (on the
  // Shallow Water before the far coast) and a hostile Battleship.
  const GALLEY: CoordV7 = { x: 1, y: 6 };
  const BOAT: CoordV7 = { x: 1, y: 7 };
  const BATTLESHIP: CoordV7 = { x: 1, y: 5 };
  const scene = (undead: readonly TechnologyIdV7[] = NAVAL_TECHS_V7) =>
    strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: GALLEY },
        { seat: 1, role: "PATROL_BOAT", at: BOAT },
        { seat: 1, role: "BATTLESHIP", at: BATTLESHIP },
      ],
      [undead, NAVAL_TECHS_V7],
    );

  it("a Sunken Galley that can sink a Patrol Boat or chip a Battleship sinks the boat", () => {
    const state = scene();
    const view = viewOf(state);
    const galley = navalUnitAtV7(state, GALLEY);
    const boat = navalUnitAtV7(state, BOAT);
    const battleship = navalUnitAtV7(state, BATTLESHIP);
    const sink = queryCombatPreviewV7(view, galley.id, boat.id);
    const chip = queryCombatPreviewV7(view, galley.id, battleship.id);
    expect(sink).toMatchObject({ defenderDies: true, defenderInfected: true });
    expect(chip).toMatchObject({ damageToDefender: 10, defenderDies: false });
    if (sink === null) throw new Error("no torpedo");
    // The risen ship splits the Battleship's fire with the Galley: safe,
    // half the Ghost Ship's 5 Coins (5 + 2.5 over the chip's 6.4).
    expect(
      drownedCrewRisingTenthsV7(
        view,
        toolsOf(view),
        viewUnit(view, galley.id),
        sink,
      ),
    ).toBe(25);
    expect(scoreCommandV7(view, attack(galley.id, boat.id)).priority).toBe(
      DROWNED_CREW_TORPEDO_PRIORITY_V7,
    );
    expect(bestOf(view, galley.id)).toEqual(attack(galley.id, boat.id));
  });

  it("the same Galley without Drowned Crews torpedoes the Battleship", () => {
    // (The arena places units whatever their technology: the Galley stays.)
    const state = scene(WITHOUT_SEAMANSHIP);
    const view = viewOf(state);
    const galley = navalUnitAtV7(state, GALLEY);
    const boat = navalUnitAtV7(state, BOAT);
    const battleship = navalUnitAtV7(state, BATTLESHIP);
    expect(queryCombatPreviewV7(view, galley.id, boat.id)).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    expect(
      scoreCommandV7(view, attack(galley.id, battleship.id)).priority,
    ).toBe(NAVAL_TORPEDO_PRIORITIES_V7.BATTLESHIP);
    expect(bestOf(view, galley.id)).toEqual(attack(galley.id, battleship.id));
  });

  it("chips the Battleship when another own Submarine follows on it", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: GALLEY },
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: BOAT },
        { seat: 1, role: "BATTLESHIP", at: BATTLESHIP },
      ],
    );
    const view = viewOf(state);
    const galley = navalUnitAtV7(state, GALLEY);
    const boat = navalUnitAtV7(state, BOAT);
    expect(scoreCommandV7(view, attack(galley.id, boat.id)).priority).toBe(
      NAVAL_TORPEDO_PRIORITIES_V7.PATROL_BOAT,
    );
  });

  it("counts the risen Ghost Ship in the ram approach", () => {
    // A Ghost Ship two tiles from a hostile Patrol Boat at 2 HP: the Ram
    // after the approach sinks it and raises a Ghost Ship.
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 7 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 7 }, hp: 2 },
      ],
    );
    const plainState = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 7 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 7 }, hp: 2 },
      ],
      [["SHORECRAFT", "NAVIGATION"], NAVAL_TECHS_V7],
    );
    const approach = (inState: GameStateV7) => {
      const view = viewOf(inState);
      const ghost = viewUnit(view, navalUnitAtV7(inState, { x: 2, y: 7 }).id);
      return navalRamApproachV7(view, toolsOf(view), ghost, { x: 4, y: 7 }, 2);
    };
    const rising = approach(state);
    expect(rising?.preview).toMatchObject({
      ram: true,
      defenderDies: true,
      defenderInfected: true,
    });
    // Without Seamanship there is no Ram and no rising.
    expect(approach(plainState)).toBeNull();
    // The value is the exchange (the boat's 5 Coins) plus the risen ship.
    expect(rising?.value).toBeGreaterThan(50);
  });

  it("a risen 5-HP Ghost Ship is an ordinary own Patrol Boat of the fleet", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: GALLEY },
        { seat: 1, role: "PATROL_BOAT", at: BOAT },
      ],
    );
    const galley = navalUnitAtV7(state, GALLEY);
    const boat = navalUnitAtV7(state, BOAT);
    const after = viewOf(acceptV7(state, 0, attack(galley.id, boat.id)).state);
    const facts = navalFleetFactsV7(
      after,
      (ownerId) => ownerId !== after.viewer.id,
    );
    expect(facts.ownPatrolBoats.map((unit) => [unit.at, unit.hp])).toEqual([
      [BOAT, 5],
    ]);
  });
});

describe("the Plague Galleon (section 4.6)", () => {
  it("with Pestilence picks the station whose cluster holds more unplagued units", () => {
    // Two clusters of three Human Fighters on the far coast, the same
    // shape; the western one is plagued already.
    const base = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 5, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 0, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 9, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 10, y: 8 } },
      ],
      [
        [...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION", "EXPLOSIVES"],
        NAVAL_TECHS_V7,
      ],
    );
    const west = [0, 1, 2].map((x) => navalUnitAtV7(base, { x, y: 8 }).id);
    const galleon = navalUnitAtV7(base, { x: 5, y: 4 });
    const state = parseGameStateV7({
      ...base,
      plagued: [...west]
        .sort((a, b) => a - b)
        .map((unitId) => ({
          unitId: unitId as UnitId,
          sourceUnitId: galleon.id,
          turnsRemaining: 3,
        })),
    });
    if (state === null) throw new Error("the plagued state is invalid");
    const view = viewOf(state);
    const tools = toolsOf(view);
    const facts = navalFleetFactsV7(view, (owner) => owner !== view.viewer.id);
    const actor = viewUnit(view, galleon.id);
    const westStation = navalBattleshipStationValueV7(
      view,
      tools,
      facts,
      actor,
      {
        x: 2,
        y: 6,
      },
    );
    const eastStation = navalBattleshipStationValueV7(
      view,
      tools,
      facts,
      actor,
      {
        x: 8,
        y: 6,
      },
    );
    expect(eastStation).toBeGreaterThan(westStation);
    const move = bestOf(view, galleon.id);
    expect(move.kind).toBe("MOVE");
    const end = move.kind === "MOVE" ? move.path.at(-1) : undefined;
    expect(end?.x ?? 0).toBeGreaterThan(5);
    // Without Pestilence the two stations are worth the same.
    const plain = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 5, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 0, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 9, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 8 } },
        { seat: 1, role: "FIGHTER", at: { x: 10, y: 8 } },
      ],
    );
    const plainView = viewOf(plain);
    const plainTools = toolsOf(plainView);
    const plainFacts = navalFleetFactsV7(
      plainView,
      (owner) => owner !== plainView.viewer.id,
    );
    const plainActor = viewUnit(
      plainView,
      navalUnitAtV7(plain, { x: 5, y: 4 }).id,
    );
    expect(
      navalBattleshipStationValueV7(
        plainView,
        plainTools,
        plainFacts,
        plainActor,
        {
          x: 2,
          y: 6,
        },
      ),
    ).toBe(
      navalBattleshipStationValueV7(
        plainView,
        plainTools,
        plainFacts,
        plainActor,
        {
          x: 8,
          y: 6,
        },
      ),
    );
  });

  it("researches Pestilence first for a seat that owns a Galleon and no Lich", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "BATTLESHIP", at: { x: 5, y: 4 } }],
      [[...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION"], NAVAL_TECHS_V7],
    );
    const view = viewOf(state);
    expect(navalPlagueTechnologyV7(view)).toBe("EXPLOSIVES");
    const research: CommandV7 = { kind: "RESEARCH", tech: "EXPLOSIVES" };
    expect(queryPlayerCommandsV7(view)).toContainEqual(research);
    expect(scoreCommandV7(view, research).priority).toBe(
      NAVAL_PLAGUE_RESEARCH_PRIORITY_V7,
    );
    const chosen = chooseNormalCommandV7(view).candidates.find(
      (item) => item.command.kind === "RESEARCH",
    )?.command;
    expect(chosen).toEqual(research);
    // Its chain's first step without Fortification.
    const early = strait(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "BATTLESHIP", at: { x: 5, y: 4 } }],
      [[...NAVAL_TECHS_V7, "DRILL"], NAVAL_TECHS_V7],
    );
    expect(
      scoreCommandV7(viewOf(early), { kind: "RESEARCH", tech: "FORTIFICATION" })
        .priority,
    ).toBe(NAVAL_PLAGUE_RESEARCH_PRIORITY_V7);
    // Without a Galleon, or with Pestilence, nothing is asked.
    const none = strait(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 4 } }],
      [[...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION"], NAVAL_TECHS_V7],
    );
    expect(navalPlagueTechnologyV7(viewOf(none))).toBeNull();
    const done = strait(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "BATTLESHIP", at: { x: 5, y: 4 } }],
      [
        [...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION", "EXPLOSIVES"],
        NAVAL_TECHS_V7,
      ],
    );
    expect(navalPlagueTechnologyV7(viewOf(done))).toBeNull();
  });
});

describe("no Board, and the other seats respect the Drowned Crews", () => {
  it("no BOARD is offered to or chosen by an Undead ship", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 7 }, hp: 6 },
      ],
    );
    const view = viewOf(state);
    expect(
      queryPlayerCommandsV7(view).some((command) => command.kind === "BOARD"),
    ).toBe(false);
    expect(
      chooseNormalCommandV7(view).candidates.some(
        (item) => item.command.kind === "BOARD",
      ),
    ).toBe(false);
  });

  it("a Human boat that would sink to a Ghost Ship's reply counts the enemy's rising and does not attack", () => {
    const scene = (rival: FactionIdV7) =>
      strait(
        ["ORIGINAL", rival],
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 }, hp: 1 },
          { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 } },
        ],
      );
    const facts = (state: GameStateV7) => {
      const view = viewOf(state);
      const boat = navalUnitAtV7(state, { x: 3, y: 6 });
      const ship = navalUnitAtV7(state, { x: 3, y: 7 });
      return {
        view,
        command: attack(boat.id, ship.id),
        preview: queryCombatPreviewV7(view, boat.id, ship.id),
        strategic: scoreCommandV7(view, attack(boat.id, ship.id))
          .strategicValue,
      };
    };
    // The Undead research is private: the rising is assumed.
    const undead = facts(scene("UNDEAD"));
    expect(undead.preview).toMatchObject({
      attackerDies: true,
      attackerInfected: true,
    });
    const dinosaur = facts(scene("DINOSAUR"));
    expect(dinosaur.preview?.attackerInfected).toBe(false);
    // The same exchange, less the enemy's Ghost Ship.
    expect(undead.strategic).toBe(dinosaur.strategic - 25);
    // And it feeds the enemy a ship: never a candidate.
    expect(
      chooseNormalCommandV7(undead.view).candidates.map((item) => item.command),
    ).not.toContainEqual(undead.command);
  });
});

describe("the Drowned Fleet goes to sea (training and research)", () => {
  const cityId = (state: GameStateV7) => {
    const city = state.cities.find(
      (entry) => entry.ownerId === seatV7(state, 0).id,
    );
    if (city === undefined) throw new Error("no city");
    return city.id;
  };
  const facts = (view: PlayerViewV7) =>
    navalFleetFactsV7(view, (ownerId) => ownerId !== view.viewer.id);

  it("trains a Sunken Galley against a hostile Battleship in sight", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const train: CommandV7 = {
      kind: "TRAIN_NAVAL",
      cityId: cityId(state),
      at: NAVAL_ARENA_PORTS_V7[0],
      role: "SUBMARINE",
    };
    expect(navalCounterRoleV7(facts(view), () => true)).toBe("SUBMARINE");
    expect(scoreCommandV7(view, train).priority).toBe(
      NAVAL_COUNTER_TRAINING_PRIORITY_V7,
    );
    expect(
      chooseNormalCommandV7(view).candidates.map((item) => item.command),
    ).toContainEqual(train);
  });

  it("trains a Ghost Ship against a hostile Submarine in sight", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "SUBMARINE", at: { x: 8, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const trained = chooseNormalCommandV7(view).candidates.find(
      (item) => item.command.kind === "TRAIN_NAVAL",
    )?.command;
    expect(trained).toMatchObject({ role: "PATROL_BOAT" });
  });

  it("researches Drowned Crews for a fleet of two Ghost Ships, by the Seamanship rule", () => {
    const state = strait(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
      ],
      [["SHORECRAFT", "NAVIGATION"], NAVAL_TECHS_V7],
    );
    const view = viewOf(state);
    expect(navalBranchResearchV7(view, facts(view), () => true)).toMatchObject({
      tech: "SEAMANSHIP",
    });
    expect(
      scoreCommandV7(view, { kind: "RESEARCH", tech: "SEAMANSHIP" }).priority,
    ).toBe(NAVAL_FLEET_RESEARCH_PRIORITY_V7);
  });
});
