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
  NAVAL_RAM_APPROACH_PRIORITY_V7,
  NAVAL_TORPEDO_PRIORITIES_V7,
  navalCounterRoleV7,
  navalFleetFactsV7,
  navalMovePathLengthV7,
  navalRamApproachV7,
  navalRamHoldsAttackV7,
  navalThreatFactsV7,
  type NavalToolsV7,
} from "../../src/ai/v7-naval";
import {
  PLESIOSAUR_GROWTH_TORPEDO_PRIORITY_V7,
  growthKillTenthsV7,
  plesiosaurGrowthTorpedoPriorityV7,
} from "../../src/ai/v7-naval-dinosaur";
import {
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
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Themed naval branches, the Dinosaur fleet's Normal AI (`pulp_wars-5ti.18`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 5.6): the Dugout's run-up
// (the ram approach and the held plain attack read each offered Move's
// real path length), the Plesiosaur's growth in its torpedo targets, the
// training that puts the fleet to sea, and the other seats' respect for
// the Horned Prow and the sea beast, each on a small hand-built strait
// (rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water). Seat 0 decides.

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly kills?: number;
  readonly maxHp?: number;
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
      ...(piece.kills === undefined ? {} : { kills: piece.kills }),
      ...(piece.maxHp === undefined ? {} : { maxHp: piece.maxHp }),
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
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

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

/** The unit's best commands, played in turn until it attacks or boards (at most three). */
function playUnit(state: GameStateV7, unitId: number): CommandV7[] {
  const played: CommandV7[] = [];
  let current = state;
  for (let step = 0; step < 3; step += 1) {
    const command = bestOf(viewOf(current), unitId);
    played.push(command);
    if (command.kind !== "MOVE") break;
    current = acceptV7(current, 0, command).state;
  }
  return played;
}

/** Plays the unit's best Move, then returns its best command after it. */
function runIn(
  state: GameStateV7,
  unitId: number,
): { readonly moved: CommandV7; readonly next: CommandV7 } {
  const moved = bestOf(viewOf(state), unitId);
  const after = acceptV7(state, 0, moved).state;
  return { moved, next: bestOf(viewOf(after), unitId) };
}

describe("the Horned Prow's run-up (section 5.6)", () => {
  it("a Dugout two tiles from a hostile Patrol Boat with an open run moves two tiles and sinks it", () => {
    // An open run: the first tile of the run, (2, 4), is outside the boat's
    // zone of control, which stops a Move on every tile beside the boat.
    const DUGOUT: CoordV7 = { x: 1, y: 4 };
    const BOAT: CoordV7 = { x: 3, y: 6 };
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: DUGOUT },
        { seat: 1, role: "PATROL_BOAT", at: BOAT },
      ],
    );
    const view = viewOf(state);
    const tools = toolsOf(view);
    const dugout = viewUnit(view, navalUnitAtV7(state, DUGOUT).id);
    const boat = navalUnitAtV7(state, BOAT);
    // A one-tile approach rams for 8; a two-tile run sinks the boat.
    const short = navalRamApproachV7(view, tools, dugout, { x: 2, y: 5 }, 1);
    const long = navalRamApproachV7(view, tools, dugout, { x: 3, y: 5 }, 2);
    expect(short?.preview).toMatchObject({
      damageToDefender: 8,
      defenderDies: false,
    });
    expect(long?.preview).toMatchObject({
      damageToDefender: 10,
      defenderDies: true,
    });
    expect(long?.value ?? 0).toBeGreaterThan(short?.value ?? 0);
    expect(navalMovePathLengthV7(tools, dugout, { x: 3, y: 5 })).toBe(2);
    const { moved, next } = runIn(state, dugout.id);
    expect(moved.kind).toBe("MOVE");
    if (moved.kind !== "MOVE") throw new Error("no move");
    expect(moved.path).toHaveLength(2);
    expect(chebyshev(moved.path.at(-1) ?? DUGOUT, BOAT)).toBe(1);
    expect(scoreCommandV7(view, moved).priority).toBe(
      NAVAL_RAM_APPROACH_PRIORITY_V7,
    );
    expect(next).toEqual(attack(dugout.id, boat.id));
    const after = acceptV7(state, 0, moved).state;
    expect(
      queryCombatPreviewV7(viewOf(after), dugout.id, boat.id),
    ).toMatchObject({ ram: true, defenderDies: true });
    expect(
      acceptV7(after, 0, next).state.units.some((unit) => unit.id === boat.id),
    ).toBe(false);
  });

  it("a Dugout next to a transport holds its plain attack, steps back and runs in two tiles, and sinks it", () => {
    // A transport projects no zone of control, so the board allows a
    // two-tile run that ends beside it (the one-tile Ram leaves the 12-HP
    // Fighter on 2 HP).
    const DUGOUT: CoordV7 = { x: 2, y: 5 };
    const TRANSPORT: CoordV7 = { x: 3, y: 5 };
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: DUGOUT },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 8 } },
      ],
    );
    const fighter = navalUnitAtV7(state, { x: 4, y: 8 });
    const scene = patchNavalUnitV7(state, fighter.id, {
      at: TRANSPORT,
      form: "EMBARKED",
    });
    const view = viewOf(scene);
    const tools = toolsOf(view);
    const dugout = navalUnitAtV7(scene, DUGOUT);
    const plain = attack(dugout.id, fighter.id);
    expect(queryCombatPreviewV7(view, dugout.id, fighter.id)).toMatchObject({
      ram: false,
      defenderDies: false,
    });
    const actor = viewUnit(view, dugout.id);
    expect(
      navalRamApproachV7(view, tools, actor, { x: 2, y: 4 }, 1)?.preview,
    ).toMatchObject({ damageToDefender: 10, defenderDies: false });
    expect(
      navalRamHoldsAttackV7(
        view,
        tools,
        plain as Extract<CommandV7, { kind: "ATTACK" }>,
      ),
    ).toBe(true);
    const { moved, next } = runIn(scene, dugout.id);
    if (moved.kind !== "MOVE") throw new Error("no move");
    expect(moved.path).toHaveLength(2);
    expect(chebyshev(moved.path.at(-1) ?? DUGOUT, TRANSPORT)).toBe(1);
    expect(next).toEqual(plain);
    const after = acceptV7(scene, 0, moved).state;
    const result = acceptV7(after, 0, next);
    expect(result.state.units.some((unit) => unit.id === fighter.id)).toBe(
      false,
    );
  });

  it("a Dugout beside a boat finds no run in: the boat's zone of control stops every two-tile run, so it sidesteps and rams for 8", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const tools = toolsOf(view);
    const dugout = navalUnitAtV7(state, { x: 2, y: 5 });
    const boat = navalUnitAtV7(state, { x: 3, y: 5 });
    // Every offered Move that ends beside the boat is one tile long.
    for (const command of tools.commands)
      if (
        command.kind === "MOVE" &&
        command.unitId === dugout.id &&
        chebyshev(command.path.at(-1) ?? { x: 2, y: 5 }, { x: 3, y: 5 }) === 1
      )
        expect(command.path).toHaveLength(1);
    const { moved, next } = runIn(state, dugout.id);
    if (moved.kind !== "MOVE") throw new Error("no move");
    expect(moved.path).toHaveLength(1);
    expect(next).toEqual(attack(dugout.id, boat.id));
  });

  it("a Human Patrol Boat next to the same boat has no run-up to wait for: a sidestep rams for 8 either way", () => {
    // The Human Ram is +1 after any Move: the boat sidesteps one tile (the
    // shortest offered path to a tile beside the target) and rams.
    const state = strait(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const tools = toolsOf(view);
    const actor = viewUnit(view, navalUnitAtV7(state, { x: 2, y: 5 }).id);
    const one = navalRamApproachV7(view, tools, actor, { x: 3, y: 4 }, 1);
    const two = navalRamApproachV7(view, tools, actor, { x: 4, y: 4 }, 2);
    expect(one?.preview.damageToDefender).toBe(8);
    expect(two?.preview.damageToDefender).toBe(8);
  });

  it("reads each Move's real path length from the offered commands", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [{ seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } }],
    );
    const view = viewOf(state);
    const tools = toolsOf(view);
    const dugout = viewUnit(view, navalUnitAtV7(state, { x: 2, y: 5 }).id);
    for (const command of tools.commands) {
      if (command.kind !== "MOVE" || command.unitId !== dugout.id) continue;
      const end = command.path.at(-1);
      if (end === undefined) continue;
      expect(navalMovePathLengthV7(tools, dugout, end)).toBe(
        command.path.length,
      );
    }
    // A tile with no offered Move falls back to the Chebyshev distance.
    expect(navalMovePathLengthV7(tools, dugout, { x: 9, y: 5 })).toBe(7);
  });
});

describe("the Plesiosaur's growth (section 5.6)", () => {
  // A Plesiosaur on Deep Water between a hostile Patrol Boat (on the
  // Shallow Water before the far coast) and a hostile Battleship.
  const BEAST: CoordV7 = { x: 1, y: 6 };
  const BOAT: CoordV7 = { x: 1, y: 7 };
  const BATTLESHIP: CoordV7 = { x: 1, y: 5 };
  const scene = (
    faction: FactionIdV7,
    growth: Partial<PieceV7> = {},
    extra: readonly PieceV7[] = [],
  ) =>
    strait(
      [faction, faction === "ORIGINAL" ? "DINOSAUR" : "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: BEAST, ...growth },
        { seat: 1, role: "PATROL_BOAT", at: BOAT },
        { seat: 1, role: "BATTLESHIP", at: BATTLESHIP },
        ...extra,
      ],
    );

  it("a Plesiosaur one kill from Big sinks a Patrol Boat rather than chip a Battleship", () => {
    const state = scene("DINOSAUR");
    const view = viewOf(state);
    const beast = navalUnitAtV7(state, BEAST);
    const boat = navalUnitAtV7(state, BOAT);
    const battleship = navalUnitAtV7(state, BATTLESHIP);
    const sink = queryCombatPreviewV7(view, beast.id, boat.id);
    const chip = queryCombatPreviewV7(view, beast.id, battleship.id);
    expect(sink).toMatchObject({ torpedo: true, defenderDies: true });
    expect(chip).toMatchObject({ torpedo: true, damageToDefender: 10 });
    if (sink === null) throw new Error("no torpedo");
    // Big: 4 HP more and a full heal, a third of its 10 Coins (5 + 3.3
    // Coins over the chip's 6.4).
    expect(growthKillTenthsV7(view, viewUnit(view, beast.id))).toBe(33);
    expect(
      plesiosaurGrowthTorpedoPriorityV7(
        view,
        toolsOf(view),
        viewUnit(view, beast.id),
        viewUnit(view, boat.id),
        sink,
      ),
    ).toBe(PLESIOSAUR_GROWTH_TORPEDO_PRIORITY_V7);
    expect(scoreCommandV7(view, attack(beast.id, boat.id)).priority).toBe(
      PLESIOSAUR_GROWTH_TORPEDO_PRIORITY_V7,
    );
    expect(bestOf(view, beast.id)).toEqual(attack(beast.id, boat.id));
  });

  it("a Big Plesiosaur (its next kill grows nothing) and a Human Submarine torpedo the Battleship first", () => {
    const big = scene("DINOSAUR", { kills: 1, maxHp: 16, hp: 16 });
    const bigView = viewOf(big);
    const bigBeast = navalUnitAtV7(big, BEAST);
    expect(growthKillTenthsV7(bigView, viewUnit(bigView, bigBeast.id))).toBe(0);
    expect(bestOf(bigView, bigBeast.id)).toEqual(
      attack(bigBeast.id, navalUnitAtV7(big, BATTLESHIP).id),
    );
    expect(
      scoreCommandV7(
        bigView,
        attack(bigBeast.id, navalUnitAtV7(big, BATTLESHIP).id),
      ).priority,
    ).toBe(NAVAL_TORPEDO_PRIORITIES_V7.BATTLESHIP);
    const human = scene("ORIGINAL");
    const humanView = viewOf(human);
    const submarine = navalUnitAtV7(human, BEAST);
    expect(bestOf(humanView, submarine.id)).toEqual(
      attack(submarine.id, navalUnitAtV7(human, BATTLESHIP).id),
    );
  });

  it("values the Alpha stage too: two kills to one more gives the heal and the Attack", () => {
    const state = scene("DINOSAUR", { kills: 2, maxHp: 16, hp: 10 });
    const view = viewOf(state);
    // 10 missing HP: 6 + 4 restored of 16 (10 Coins: 62 tenths), and the
    // Alpha's +1 Attack of 4 (25 tenths).
    expect(
      growthKillTenthsV7(view, viewUnit(view, navalUnitAtV7(state, BEAST).id)),
    ).toBe(62 + 25);
  });

  it("chips the Battleship when another own Submarine follows on it", () => {
    const state = scene("DINOSAUR", {}, [
      { seat: 0, role: "SUBMARINE", at: { x: 2, y: 5 } },
    ]);
    const view = viewOf(state);
    const beast = navalUnitAtV7(state, BEAST);
    const boat = navalUnitAtV7(state, BOAT);
    const sink = queryCombatPreviewV7(view, beast.id, boat.id);
    if (sink === null) throw new Error("no torpedo");
    expect(
      plesiosaurGrowthTorpedoPriorityV7(
        view,
        toolsOf(view),
        viewUnit(view, beast.id),
        viewUnit(view, boat.id),
        sink,
      ),
    ).toBeNull();
  });
});

describe("the sea beast and the Horned Prow from the other side (section 5.6)", () => {
  it("no BOARD is offered on a Plesiosaur: a Human boat beside a weak one attacks it", () => {
    const state = strait(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "SUBMARINE", at: { x: 3, y: 7 }, hp: 3 },
      ],
    );
    const boat = navalUnitAtV7(state, { x: 3, y: 6 });
    const beast = navalUnitAtV7(state, { x: 3, y: 7 });
    expect(
      queryPlayerCommandsV7(viewOf(state)).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    const played = playUnit(state, boat.id);
    expect(played.some((command) => command.kind === "BOARD")).toBe(false);
    expect(played.at(-1)).toEqual(attack(boat.id, beast.id));
  });

  it("a Dinosaur ship never boards a weak Submarine, and boards a weak Battleship", () => {
    const submarine = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "SUBMARINE", at: { x: 3, y: 7 }, hp: 4 },
      ],
    );
    const dugout = navalUnitAtV7(submarine, { x: 3, y: 6 });
    const sub = navalUnitAtV7(submarine, { x: 3, y: 7 });
    expect(
      queryPlayerCommandsV7(viewOf(submarine)).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    const played = playUnit(submarine, dugout.id);
    expect(played.some((command) => command.kind === "BOARD")).toBe(false);
    expect(played.at(-1)).toEqual(attack(dugout.id, sub.id));
    const capital = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 7 }, hp: 8 },
      ],
    );
    const boarder = navalUnitAtV7(capital, { x: 3, y: 6 });
    const battleship = navalUnitAtV7(capital, { x: 3, y: 7 });
    expect(bestOf(viewOf(capital), boarder.id)).toEqual({
      kind: "BOARD",
      unitId: boarder.id,
      targetUnitId: battleship.id,
    });
  });

  it("the threat estimate assumes a hostile Dugout's two-tile run: a Patrol Boat three tiles away is in lethal reach", () => {
    const scene = (rival: FactionIdV7) =>
      strait(
        ["ORIGINAL", rival],
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 5 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
        ],
      );
    const facts = (rival: FactionIdV7) => {
      const state = scene(rival);
      const view = viewOf(state);
      const own = viewUnit(view, navalUnitAtV7(state, { x: 5, y: 5 }).id);
      const hostile = viewUnit(view, navalUnitAtV7(state, { x: 2, y: 5 }).id);
      return {
        ram: navalThreatFactsV7(view, hostile, own, own.at).ramBonus2,
        danger: publicDangerForPolicyV7(view, own, own.at),
      };
    };
    // The Dinosaur's Horned Prows are private: the run-up is assumed.
    expect(facts("DINOSAUR")).toEqual({ ram: 3, danger: 10 });
    expect(facts("UNDEAD")).toEqual({ ram: 2, danger: 8 });
  });
});

describe("the Dinosaur fleet goes to sea (training)", () => {
  const cityId = (state: GameStateV7) => {
    const city = state.cities.find(
      (entry) => entry.ownerId === seatV7(state, 0).id,
    );
    if (city === undefined) throw new Error("no city");
    return city.id;
  };
  const facts = (view: PlayerViewV7) =>
    navalFleetFactsV7(view, (ownerId) => ownerId !== view.viewer.id);

  it("trains a Plesiosaur against a hostile Battleship in sight", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
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

  it("trains a Dugout against a hostile Submarine in sight", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
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
});
