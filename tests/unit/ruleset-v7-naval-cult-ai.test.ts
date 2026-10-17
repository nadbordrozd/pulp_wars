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
  NAVAL_FAVOUR_TENTHS_V7,
  NAVAL_TORPEDO_PRIORITIES_V7,
  deepOfferingTenthsV7,
  navalBattleshipStationValueV7,
  navalFleetFactsV7,
  navalRamApproachV7,
  type NavalToolsV7,
} from "../../src/ai/v7-naval";
import {
  DEEP_OFFERING_TORPEDO_PRIORITY_V7,
  NAVAL_KRAKEN_HOLD_BOAT_VALUE_V7,
  NAVAL_KRAKEN_HOLD_PRIORITY_V7,
  NAVAL_KRAKEN_HOLD_TRANSPORT_VALUE_V7,
  navalKrakenDraggedV7,
  navalKrakenHoldValueV7,
  navalKrakenTransportMoveRejectedV7,
} from "../../src/ai/v7-naval-cult";
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
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  CULT_WITHOUT_OFFERINGS_V7,
  cultStraitV7,
  type CultPieceV7,
} from "../fixtures/v7-naval-cult";

// Themed naval branches, the Deep Ones' Normal AI (`pulp_wars-5ti.22`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 9.6): the Favour of a
// kill afloat in the attack choice, the torpedo targets, the ram approach,
// and the Galleon's station; the Kraken's hold on a transport or a Patrol
// Boat; the training that puts a Kraken to sea; and the other seats'
// respect for its Drag, each on a small hand-built strait (rows 3 and 7
// Shallow Water, rows 4 to 6 Deep Water). Seat 0 decides.

function strait(
  pieces: readonly CultPieceV7[],
  options: {
    readonly factions?: readonly [FactionIdV7, FactionIdV7];
    readonly cultTechs?: readonly TechnologyIdV7[];
    readonly favour?: number;
  } = {},
): GameStateV7 {
  const factions = options.factions ?? ["CULT", "ORIGINAL"];
  const cultTechs = options.cultTechs ?? NAVAL_TECHS_V7;
  return cultStraitV7({
    factions,
    pieces,
    technologies: [
      factions[0] === "CULT" ? cultTechs : NAVAL_TECHS_V7,
      factions[1] === "CULT" ? cultTechs : NAVAL_TECHS_V7,
    ],
    favour: options.favour ?? 2,
  });
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

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

describe("Offerings in the attack choice (section 9.6)", () => {
  it("a Black Gondola that can sink a transport or chip a Battleship sinks the transport, for the kill and its Favour", () => {
    const GONDOLA: CoordV7 = { x: 3, y: 5 };
    const TRANSPORT: CoordV7 = { x: 3, y: 6 };
    const BATTLESHIP: CoordV7 = { x: 4, y: 5 };
    const state = strait([
      { seat: 0, role: "PATROL_BOAT", at: GONDOLA, ran: 1 },
      {
        seat: 1,
        role: "KNIGHT",
        at: { x: 3, y: 8 },
        embarkedAt: TRANSPORT,
        hp: 4,
      },
      { seat: 1, role: "BATTLESHIP", at: BATTLESHIP },
    ]);
    const view = viewOf(state);
    const gondola = navalUnitAtV7(state, GONDOLA);
    const transport = navalUnitAtV7(state, TRANSPORT);
    const battleship = navalUnitAtV7(state, BATTLESHIP);
    const sink = queryCombatPreviewV7(view, gondola.id, transport.id);
    expect(sink).toMatchObject({ defenderDies: true });
    expect(queryCombatPreviewV7(view, gondola.id, battleship.id)).toMatchObject(
      { defenderDies: false },
    );
    if (sink === null) throw new Error("no attack");
    // The Knight's value is 9: 4 Favour, 4 Coins.
    expect(deepOfferingTenthsV7(view, viewUnit(view, gondola.id), sink)).toBe(
      4 * NAVAL_FAVOUR_TENTHS_V7,
    );
    const withFavour = scoreCommandV7(view, attack(gondola.id, transport.id));
    expect(withFavour.priority).toBeGreaterThan(
      scoreCommandV7(view, attack(gondola.id, battleship.id)).priority,
    );
    expect(bestOf(view, gondola.id)).toEqual(attack(gondola.id, transport.id));
    // Without Offerings to the Deep the same kill is worth less.
    const plain = strait(
      [
        { seat: 0, role: "PATROL_BOAT", at: GONDOLA, ran: 1 },
        {
          seat: 1,
          role: "KNIGHT",
          at: { x: 3, y: 8 },
          embarkedAt: TRANSPORT,
          hp: 4,
        },
        { seat: 1, role: "BATTLESHIP", at: BATTLESHIP },
      ],
      { cultTechs: CULT_WITHOUT_OFFERINGS_V7 },
    );
    const plainView = viewOf(plain);
    const plainGondola = navalUnitAtV7(plain, GONDOLA).id;
    const plainTransport = navalUnitAtV7(plain, TRANSPORT).id;
    const plainSink = queryCombatPreviewV7(
      plainView,
      plainGondola,
      plainTransport,
    );
    if (plainSink === null) throw new Error("no attack");
    expect(
      deepOfferingTenthsV7(
        plainView,
        viewUnit(plainView, plainGondola),
        plainSink,
      ),
    ).toBe(0);
    expect(withFavour.strategicValue).toBeGreaterThan(
      scoreCommandV7(plainView, attack(plainGondola, plainTransport))
        .strategicValue,
    );
  });

  describe("Favour is counted in a torpedo choice", () => {
    // A Kraken between a hostile Patrol Boat and a hostile Battleship.
    const KRAKEN: CoordV7 = { x: 1, y: 6 };
    const BOAT: CoordV7 = { x: 1, y: 7 };
    const BATTLESHIP: CoordV7 = { x: 1, y: 5 };
    const scene = (
      options: {
        readonly cultTechs?: readonly TechnologyIdV7[];
        readonly favour?: number;
      } = {},
    ) =>
      strait(
        [
          { seat: 0, role: "SUBMARINE", at: KRAKEN },
          { seat: 1, role: "PATROL_BOAT", at: BOAT },
          { seat: 1, role: "BATTLESHIP", at: BATTLESHIP },
        ],
        options,
      );

    it("a Kraken sinks the Patrol Boat (5 Coins and 2 Favour) over a chip on the Battleship (6.4)", () => {
      const state = scene();
      const view = viewOf(state);
      const kraken = navalUnitAtV7(state, KRAKEN);
      const boat = navalUnitAtV7(state, BOAT);
      const sink = queryCombatPreviewV7(view, kraken.id, boat.id);
      if (sink === null) throw new Error("no torpedo");
      expect(sink).toMatchObject({ torpedo: true, defenderDies: true });
      expect(deepOfferingTenthsV7(view, viewUnit(view, kraken.id), sink)).toBe(
        20,
      );
      expect(scoreCommandV7(view, attack(kraken.id, boat.id)).priority).toBe(
        DEEP_OFFERING_TORPEDO_PRIORITY_V7,
      );
      expect(bestOf(view, kraken.id)).toEqual(attack(kraken.id, boat.id));
    });

    it("without Offerings to the Deep it torpedoes the Battleship", () => {
      const state = scene({ cultTechs: CULT_WITHOUT_OFFERINGS_V7 });
      const view = viewOf(state);
      const kraken = navalUnitAtV7(state, KRAKEN);
      const battleship = navalUnitAtV7(state, BATTLESHIP);
      expect(
        scoreCommandV7(view, attack(kraken.id, battleship.id)).priority,
      ).toBe(NAVAL_TORPEDO_PRIORITIES_V7.BATTLESHIP);
      expect(bestOf(view, kraken.id)).toEqual(attack(kraken.id, battleship.id));
    });

    it("at the cap of 30 the Favour is worth nothing, so it torpedoes the Battleship", () => {
      const state = scene({ favour: 30 });
      const view = viewOf(state);
      const kraken = navalUnitAtV7(state, KRAKEN);
      const boat = navalUnitAtV7(state, BOAT);
      const battleship = navalUnitAtV7(state, BATTLESHIP);
      const sink = queryCombatPreviewV7(view, kraken.id, boat.id);
      if (sink === null) throw new Error("no torpedo");
      expect(deepOfferingTenthsV7(view, viewUnit(view, kraken.id), sink)).toBe(
        0,
      );
      expect(bestOf(view, kraken.id)).toEqual(attack(kraken.id, battleship.id));
    });
  });

  it("counts the Favour in the ram approach", () => {
    // A Gondola two tiles from a hostile Patrol Boat at 2 HP: the Ram after
    // the approach sinks it for 2 Favour.
    const pieces: readonly CultPieceV7[] = [
      { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 }, hp: 2 },
    ];
    const approach = (state: GameStateV7) => {
      const view = viewOf(state);
      const gondola = viewUnit(view, navalUnitAtV7(state, { x: 2, y: 4 }).id);
      return navalRamApproachV7(
        view,
        toolsOf(view),
        gondola,
        { x: 4, y: 4 },
        2,
      );
    };
    const offering = approach(strait(pieces));
    const plain = approach(strait(pieces, { favour: 30 }));
    expect(offering?.preview).toMatchObject({ ram: true, defenderDies: true });
    expect(plain?.preview).toMatchObject({ ram: true, defenderDies: true });
    expect((offering?.value ?? 0) - (plain?.value ?? 0)).toBe(
      2 * NAVAL_FAVOUR_TENTHS_V7,
    );
  });

  it("counts the Favour of a kill afloat in the Galleon's station", () => {
    // The Galleon of the Eye may sail to (5, 5), three tiles from a 3-HP
    // hostile Patrol Boat on (8, 5): its shot from there sinks it.
    const pieces: readonly CultPieceV7[] = [
      { seat: 0, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 5 }, hp: 3 },
    ];
    const station = (state: GameStateV7) => {
      const view = viewOf(state);
      const tools = toolsOf(view);
      const facts = navalFleetFactsV7(
        view,
        (owner) => owner !== view.viewer.id,
      );
      const galleon = viewUnit(view, navalUnitAtV7(state, { x: 4, y: 5 }).id);
      return navalBattleshipStationValueV7(view, tools, facts, galleon, {
        x: 5,
        y: 5,
      });
    };
    const withOffering = station(strait(pieces));
    const without = station(
      strait(pieces, { cultTechs: CULT_WITHOUT_OFFERINGS_V7 }),
    );
    expect(without).toBeGreaterThan(0);
    // 2 Favour = 20 tenths, a fifth of it on the station's scale.
    expect(withOffering - without).toBe(4);
  });
});

describe("the Kraken holds (section 9.6)", () => {
  const KRAKEN: CoordV7 = { x: 2, y: 5 };
  const TRANSPORT: CoordV7 = { x: 5, y: 5 };
  const HOLD: CoordV7 = { x: 4, y: 5 };

  it("a Kraken ends its Move beside a hostile transport when it is safe there", () => {
    const state = strait([
      { seat: 0, role: "SUBMARINE", at: KRAKEN },
      {
        seat: 1,
        role: "FIGHTER",
        at: { x: 5, y: 9 },
        embarkedAt: TRANSPORT,
      },
    ]);
    const view = viewOf(state);
    const tools = toolsOf(view);
    const facts = navalFleetFactsV7(view, (owner) => owner !== view.viewer.id);
    const kraken = navalUnitAtV7(state, KRAKEN);
    const actor = viewUnit(view, kraken.id);
    expect(navalKrakenHoldValueV7(view, tools, facts, actor, HOLD)).toBe(
      NAVAL_KRAKEN_HOLD_TRANSPORT_VALUE_V7,
    );
    // A tile beside nothing holds nothing.
    expect(
      navalKrakenHoldValueV7(view, tools, facts, actor, { x: 3, y: 4 }),
    ).toBe(0);
    const hold: CommandV7 = {
      kind: "MOVE",
      unitId: kraken.id,
      path: [{ x: 3, y: 5 }, HOLD],
    };
    expect(scoreCommandV7(view, hold).priority).toBeGreaterThanOrEqual(
      NAVAL_KRAKEN_HOLD_PRIORITY_V7,
    );
    const best = bestOf(view, kraken.id);
    expect(best.kind).toBe("MOVE");
    if (best.kind !== "MOVE") throw new Error("no Move");
    const end = best.path.at(-1);
    if (end === undefined) throw new Error("no end");
    expect(chebyshev(end, TRANSPORT)).toBe(1);
  });

  it("values a hostile Patrol Boat it would hold, and never a tile beside a hostile Battleship", () => {
    const boat = strait([
      { seat: 0, role: "SUBMARINE", at: KRAKEN },
      { seat: 1, role: "PATROL_BOAT", at: TRANSPORT, hp: 3 },
    ]);
    const view = viewOf(boat);
    expect(
      navalKrakenHoldValueV7(
        view,
        toolsOf(view),
        navalFleetFactsV7(view, (owner) => owner !== view.viewer.id),
        viewUnit(view, navalUnitAtV7(boat, KRAKEN).id),
        HOLD,
      ),
    ).toBe(NAVAL_KRAKEN_HOLD_BOAT_VALUE_V7);
    const guarded = strait([
      { seat: 0, role: "SUBMARINE", at: KRAKEN },
      { seat: 1, role: "FIGHTER", at: { x: 5, y: 9 }, embarkedAt: TRANSPORT },
      { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 4 } },
    ]);
    const guardedView = viewOf(guarded);
    expect(
      navalKrakenHoldValueV7(
        guardedView,
        toolsOf(guardedView),
        navalFleetFactsV7(
          guardedView,
          (owner) => owner !== guardedView.viewer.id,
        ),
        viewUnit(guardedView, navalUnitAtV7(guarded, KRAKEN).id),
        HOLD,
      ),
    ).toBe(0);
  });

  it("does not hold where the visible enemy sinks it", () => {
    // Two full hostile Patrol Boats ram a Kraken on the hold tile: 8 and 8.
    const state = strait([
      { seat: 0, role: "SUBMARINE", at: KRAKEN },
      { seat: 1, role: "FIGHTER", at: { x: 5, y: 9 }, embarkedAt: TRANSPORT },
      { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 4 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 6 } },
    ]);
    const view = viewOf(state);
    expect(
      navalKrakenHoldValueV7(
        view,
        toolsOf(view),
        navalFleetFactsV7(view, (owner) => owner !== view.viewer.id),
        viewUnit(view, navalUnitAtV7(state, KRAKEN).id),
        HOLD,
      ),
    ).toBe(0);
  });
});

describe("training the Deep Ones (section 9.6)", () => {
  it("trains a Kraken against a visible hostile Battleship", () => {
    const state = strait([{ seat: 1, role: "BATTLESHIP", at: { x: 5, y: 4 } }]);
    const view = viewOf(state);
    const train = queryPlayerCommandsV7(view).find(
      (command) =>
        command.kind === "TRAIN_NAVAL" && command.role === "SUBMARINE",
    );
    if (train === undefined) throw new Error("no Kraken on offer");
    expect(scoreCommandV7(view, train).priority).toBe(
      NAVAL_COUNTER_TRAINING_PRIORITY_V7,
    );
  });
});

describe("against a Kraken (section 9.6)", () => {
  it("gives a hostile unit afloat beside a Kraken a threat reach of one tile", () => {
    // From the Cult's side: a Human Patrol Boat beside the own Kraken.
    const BOAT: CoordV7 = { x: 5, y: 5 };
    const held = strait([
      { seat: 0, role: "SUBMARINE", at: { x: 4, y: 5 } },
      { seat: 1, role: "PATROL_BOAT", at: BOAT },
    ]);
    const free = strait([
      { seat: 0, role: "SUBMARINE", at: { x: 1, y: 5 } },
      { seat: 1, role: "PATROL_BOAT", at: BOAT },
    ]);
    const reach = (state: GameStateV7) => {
      const view = viewOf(state);
      const boat = viewUnit(view, navalUnitAtV7(state, BOAT).id);
      expect(navalKrakenDraggedV7(view, boat)).toBe(state === held);
      return Math.max(
        ...publicThreatenedTilesForPolicyV7(view, boat).map((at) =>
          chebyshev(at, BOAT),
        ),
      );
    };
    // Move 1 and range 1 when Dragged; Move 2 and range 1 when free.
    expect(reach(held)).toBe(2);
    expect(reach(free)).toBe(3);
  });

  it("a Human transport plans around a Kraken's Drag: it ends no Move beside one unless it lands from there", () => {
    // Seat 0 is the Human seat; the Kraken is the Cult's.
    const KRAKEN: CoordV7 = { x: 6, y: 6 };
    const TRANSPORT: CoordV7 = { x: 3, y: 6 };
    const state = strait(
      [
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 1 }, embarkedAt: TRANSPORT },
        { seat: 1, role: "SUBMARINE", at: KRAKEN },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    );
    const view = viewOf(state);
    const tools = toolsOf(view);
    const transport = viewUnit(view, navalUnitAtV7(state, TRANSPORT).id);
    // Beside the Kraken on Deep Water with no land beside: refused.
    expect(
      navalKrakenTransportMoveRejectedV7(
        view,
        tools,
        transport,
        { x: 5, y: 5 },
        false,
      ),
    ).toBe(true);
    // Beside the Kraken on the Shallow Water before the coast: it lands
    // from there next turn.
    expect(
      navalKrakenTransportMoveRejectedV7(
        view,
        tools,
        transport,
        { x: 5, y: 7 },
        false,
      ),
    ).toBe(false);
    // Clear of the Kraken: no rule.
    expect(
      navalKrakenTransportMoveRejectedV7(
        view,
        tools,
        transport,
        { x: 4, y: 5 },
        false,
      ),
    ).toBe(false);
    const moves = chooseNormalCommandV7(view).candidates.filter(
      (item) =>
        item.command.kind === "MOVE" && item.command.unitId === transport.id,
    );
    for (const item of moves) {
      if (item.command.kind !== "MOVE") continue;
      const end = item.command.path.at(-1);
      expect(end).toBeDefined();
      if (end === undefined) continue;
      expect(
        chebyshev(end, KRAKEN) !== 1 || end.y === 7,
        `${String(end.x)},${String(end.y)}`,
      ).toBe(true);
    }
  });

  it("a transport already beside a Kraken may sail on", () => {
    const state = strait(
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: { x: 3, y: 1 },
          embarkedAt: { x: 5, y: 5 },
        },
        { seat: 1, role: "SUBMARINE", at: { x: 6, y: 5 } },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    );
    const view = viewOf(state);
    const transport = viewUnit(view, navalUnitAtV7(state, { x: 5, y: 5 }).id);
    expect(
      navalKrakenTransportMoveRejectedV7(
        view,
        toolsOf(view),
        transport,
        { x: 5, y: 4 },
        false,
      ),
    ).toBe(false);
  });

  it("a Human ship never boards a Kraken: no BOARD is offered at a weak one", () => {
    const state = strait(
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 }, hp: 2 },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    );
    const view = viewOf(state);
    expect(
      chooseNormalCommandV7(view).candidates.some(
        (item) => item.command.kind === "BOARD",
      ),
    ).toBe(false);
    expect(
      queryPlayerCommandsV7(view).some((command) => command.kind === "BOARD"),
    ).toBe(false);
  });

  it("a Cult seat's turn after its Kraken holds a transport: the transport's offered Moves are one tile", () => {
    const state = strait([
      { seat: 0, role: "SUBMARINE", at: { x: 4, y: 5 } },
      {
        seat: 1,
        role: "FIGHTER",
        at: { x: 5, y: 9 },
        embarkedAt: { x: 5, y: 5 },
      },
    ]);
    const enemyTurn = acceptV7(state, 0, { kind: "END_TURN" }).state;
    const transport = navalUnitAtV7(enemyTurn, { x: 5, y: 5 });
    const moves = queryPlayerCommandsV7(
      viewForV7(enemyTurn, seatV7(enemyTurn, 1).id),
    ).filter(
      (command) => command.kind === "MOVE" && command.unitId === transport.id,
    );
    expect(moves.length).toBeGreaterThan(0);
    for (const command of moves)
      if (command.kind === "MOVE") expect(command.path).toHaveLength(1);
  });
});
