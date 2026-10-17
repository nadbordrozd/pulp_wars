import { describe, expect, it } from "vitest";
import {
  DEEP_OFFERING_DIVISOR_V7,
  FAVOUR_CAP_V7,
  NAVAL_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  favourOfV7,
  previewDeepOfferingsV7,
  publicDraggingKrakenV7,
  publicDraggingKrakensV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  battleshipUnlockNoteV7,
  deepOfferingCombatNotesV7,
  deepOfferingRuleV7,
  deepOfferingsUnlockTextV7,
  krakenDragRuleV7,
  navalCombatLinesV7,
  navalRamUnlockTextV7,
  submarineUnlockNoteV7,
} from "../../src/render/naval-presentation-v7";
import {
  glossaryEntryV7,
  roleGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import { unitDraggedV7 } from "../../src/render/cult-channel-presentation-v7";
import { seaBeastAttacksV7 } from "../../src/audio/sound-events-v7";
import { SOUND_IDS_V1 } from "../../src/audio/sound-manifest";
import { SOUND_DEFAULT_CLIPS_V1 } from "../../src/audio/sound-choices";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  CULT_NAVAL_TECHS_V7,
  CULT_WITHOUT_OFFERINGS_V7,
  cultStraitV7,
  type CultPieceV7,
} from "../fixtures/v7-naval-cult";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";

// Themed naval branches, the Deep Ones (`pulp_wars-5ti.22`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 9): the Black Gondola,
// the Galleon of the Eye, and the Kraken (10 Coins, a sea beast whose Drag
// holds units afloat beside it to one tile), and Offerings to the Deep
// (what the Cult's ships sink pays half its value in Favour, capped at 30).
// Every state is the shared authored strait: rows 3 and 7 Shallow Water,
// rows 4 to 6 Deep Water.

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  viewForV7(state, seatV7(state, seat).id);
const json = (value: unknown): string => JSON.stringify(value);
const offered = (state: GameStateV7, command: CommandV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewOf(state, seat)).some(
    (candidate) => json(candidate) === json(command),
  );
const attack = (unitId: number, targetUnitId: number): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitId as UnitId,
  targetUnitId: targetUnitId as UnitId,
});
const move = (unitId: number, path: readonly CoordV7[]): CommandV7 => ({
  kind: "MOVE",
  unitId: unitId as UnitId,
  path: [...path],
});
const board = (unitId: number, targetUnitId: number): CommandV7 => ({
  kind: "BOARD",
  unitId: unitId as UnitId,
  targetUnitId: targetUnitId as UnitId,
});
const combatOf = (events: readonly DomainEventV7[]): CombatPreviewV7 => {
  const resolved = events.find((event) => event.kind === "COMBAT_RESOLVED");
  if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return resolved.preview;
};
const offerings = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) =>
    event.kind === "FAVOUR_GAINED" && event.source === "DEEP_OFFERING"
      ? [event]
      : [],
  );

/** The strait with the pieces: a Cult seat and a rival, both at sea. */
function sea(
  pieces: readonly CultPieceV7[],
  options: {
    readonly factions?: readonly [FactionIdV7, FactionIdV7];
    readonly cultTechs?: readonly (typeof NAVAL_TECHS_V7)[number][];
    readonly favour?: number;
  } = {},
): GameStateV7 {
  const factions = options.factions ?? ["CULT", "ORIGINAL"];
  const cultTechs = options.cultTechs ?? CULT_NAVAL_TECHS_V7;
  return cultStraitV7({
    factions,
    pieces,
    technologies: [
      factions[0] === "CULT" ? cultTechs : NAVAL_TECHS_V7,
      factions[1] === "CULT" ? cultTechs : NAVAL_TECHS_V7,
    ],
    ...(options.favour === undefined ? {} : { favour: options.favour }),
  });
}

/**
 * The attack of the unit on `from` at the unit on `to`: its public preview
 * just before, and the resolved exchange with its events.
 */
function exchange(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  seat: 0 | 1 = 0,
): {
  readonly preview: CombatPreviewV7 | null;
  readonly state: GameStateV7;
  readonly combat: CombatPreviewV7;
  readonly events: readonly DomainEventV7[];
} {
  const attacker = navalUnitAtV7(state, from);
  const target = navalUnitAtV7(state, to);
  const preview = queryCombatPreviewV7(
    viewOf(state, seat),
    attacker.id,
    target.id,
  );
  const result = acceptV7(state, seat, attack(attacker.id, target.id));
  return {
    preview,
    state: result.state,
    combat: combatOf(result.events),
    events: result.events,
  };
}

const cultFavour = (state: GameStateV7, seat: 0 | 1 = 0): number =>
  favourOfV7(state, seatV7(state, seat).id);

describe("the Deep Ones' registry (sections 9.1 and 9.2)", () => {
  it("registers every row of the unit table", () => {
    const row = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "CULT");
      const mechanics = roleMechanicsV7(role, "CULT");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        rule.sightRadius,
        `${String(rule.minimumRange)}-${String(rule.range)}`,
        rule.abilities,
        mechanics.seaBeast,
        mechanics.dragsAfloat,
        mechanics.robed,
      ];
    };
    expect(row("PATROL_BOAT")).toEqual([
      "Black Gondola",
      5,
      10,
      2,
      2,
      2,
      2,
      "1-1",
      ["ATTACK", "RAM", "DEEP_OFFERING"],
      false,
      false,
      false,
    ]);
    expect(row("BATTLESHIP")).toEqual([
      "Galleon of the Eye",
      16,
      25,
      5,
      3,
      2,
      3,
      "1-3",
      ["ATTACK", "DEEP_OFFERING"],
      false,
      false,
      false,
    ]);
    expect(row("SUBMARINE")).toEqual([
      "Kraken",
      10,
      12,
      4,
      2,
      2,
      2,
      "1-1",
      ["ATTACK", "SUBMERGED", "TORPEDO", "DRAG", "SEA_BEAST", "DEEP_OFFERING"],
      true,
      true,
      false,
    ]);
    expect(roleMechanicsV7("BATTLESHIP", "CULT").splash).toBe(true);
    expect(DEEP_OFFERING_DIVISOR_V7).toBe(2);
    // No other faction's ship Drags or makes Offerings; the Plesiosaur is
    // the other sea beast.
    for (const faction of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "DWARF",
      "CANDY",
    ] as const)
      for (const role of NAVAL_ROLE_IDS_V7) {
        expect(roleMechanicsV7(role, faction).dragsAfloat).toBe(false);
        expect(effectiveRoleRuleV7(role, faction).abilities).not.toContain(
          "DEEP_OFFERING",
        );
      }
  });

  it("names the five technologies and makes Seamanship the Ram and Offerings to the Deep", () => {
    expect(
      (
        [
          "SHORECRAFT",
          "NAVIGATION",
          "NAVAL_ENGINEERING",
          "SEAMANSHIP",
          "SUBMERSIBLES",
        ] as const
      ).map((tech) => technologyDisplayNameV7(tech, "CULT")),
    ).toEqual([
      "Black Gondolas",
      "Navigation",
      "Galleons of the Eye",
      "Offerings to the Deep",
      "The Kraken",
    ]);
    const seamanship = factionTreeV7("CULT").nodes.find(
      (node) => node.id === "SEAMANSHIP",
    );
    expect(seamanship?.unlocks).toEqual([
      { kind: "RAM" },
      { kind: "DEEP_OFFERINGS" },
    ]);
    const caps = technologyCapabilitiesV7(NAVAL_TECHS_V7, "CULT");
    expect([caps.ram, caps.boarding, caps.deepOfferings]).toEqual([
      true,
      false,
      true,
    ]);
    expect(
      technologyCapabilitiesV7(CULT_WITHOUT_OFFERINGS_V7, "CULT").deepOfferings,
    ).toBe(false);
    for (const faction of ["ORIGINAL", "UNDEAD", "CANDY"] as const)
      expect(
        technologyCapabilitiesV7(NAVAL_TECHS_V7, faction).deepOfferings,
      ).toBe(false);
  });

  it("trains the Kraken for 10 Coins, 8 at a Shipyard, at a dock", () => {
    const state = sea([]);
    const train = queryPlayerCommandsV7(viewOf(state)).find(
      (command) =>
        command.kind === "TRAIN_NAVAL" && command.role === "SUBMARINE",
    );
    expect(train).toBeDefined();
    if (train === undefined) throw new Error("no Kraken on offer");
    const coins = seatV7(state, 0).coins;
    const after = acceptV7(state, 0, train).state;
    expect(seatV7(after, 0).coins).toBe(coins - 10);
    const kraken = after.units.find(
      (unit) => unit.role === "SUBMARINE" && unit.form === "NAVAL",
    );
    expect(kraken).toMatchObject({ hp: 12, maxHp: 12 });
  });
});

describe("the worked examples (section 9.4)", () => {
  it("a Kraken torpedoes a Battleship: 10; 0, as the Submarine", () => {
    const state = sea([
      { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
    ]);
    const result = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(result.preview).toMatchObject({
      damageToDefender: 10,
      damageToAttacker: 0,
      torpedo: true,
    });
    expect(result.combat).toMatchObject({
      damageToDefender: 10,
      damageToAttacker: 0,
    });
    expect(offerings(result.events)).toEqual([]);
  });

  it("a Galleon of the Eye sinks a transport carrying a Knight: 4 Favour", () => {
    const state = sea(
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        {
          seat: 1,
          role: "KNIGHT",
          at: { x: 3, y: 8 },
          embarkedAt: { x: 3, y: 6 },
          hp: 6,
        },
      ],
      { favour: 2 },
    );
    const result = exchange(state, { x: 3, y: 5 }, { x: 3, y: 6 });
    expect(result.combat.defenderDies).toBe(true);
    const preview = result.preview;
    if (preview === null) throw new Error("no preview");
    // The Knight's value is 9: half is 4.
    expect(previewDeepOfferingsV7(viewOf(state), preview)).toEqual([
      {
        playerId: seatV7(state, 0).id,
        killer: "ATTACKER",
        favour: 4,
        forfeited: 0,
      },
    ]);
    expect(offerings(result.events)).toEqual([
      {
        kind: "FAVOUR_GAINED",
        playerId: seatV7(state, 0).id,
        source: "DEEP_OFFERING",
        amount: 4,
        forfeited: 0,
        favour: 6,
      },
    ]);
    expect(cultFavour(result.state)).toBe(6);
  });

  it("two Krakens sink a Battleship over two turns: 8 Favour; the Battleship could move only one tile between them", () => {
    // The Krakens lie west of the Battleship, so its first step east leaves
    // their zones of control: only the Drag holds it to one tile.
    const state = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
      { favour: 0 },
    );
    const first = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    const second = exchange(first.state, { x: 3, y: 4 }, { x: 4, y: 5 });
    expect([
      first.combat.damageToDefender,
      second.combat.damageToDefender,
    ]).toEqual([10, 12]);
    expect(offerings([...first.events, ...second.events])).toEqual([]);
    // The Battleship's turn: beside the Krakens it sails one tile only.
    const battleship = navalUnitAtV7(second.state, { x: 4, y: 5 });
    const enemyTurn = acceptV7(second.state, 0, { kind: "END_TURN" }).state;
    const far = move(battleship.id, [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
    ]);
    expect(rejectV7(enemyTurn, 1, far)).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: expect.objectContaining({ reason: "DRAGGED" }),
    });
    expect(offered(enemyTurn, far, 1)).toBe(false);
    const near = move(battleship.id, [{ x: 5, y: 5 }]);
    expect(offered(enemyTurn, near, 1)).toBe(true);
    const sailed = acceptV7(enemyTurn, 1, near).state;
    const back = acceptV7(sailed, 1, { kind: "END_TURN" }).state;
    // The next turn: a Kraken closes one tile and sinks it: 8 Favour.
    const kraken = navalUnitAtV7(back, { x: 3, y: 5 });
    const closed = acceptV7(back, 0, move(kraken.id, [{ x: 4, y: 5 }])).state;
    const sunk = exchange(closed, { x: 4, y: 5 }, { x: 5, y: 5 });
    expect(sunk.combat.defenderDies).toBe(true);
    expect(offerings(sunk.events).map((event) => event.amount)).toEqual([8]);
  });

  it("a Battleship next to a Kraken shoots it: 16, sunk (Drag does not stop a shot)", () => {
    const state = sea(
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 } },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    );
    const result = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(result.preview).toMatchObject({
      damageToDefender: 12,
      defenderDies: true,
    });
    expect(result.combat.defenderDies).toBe(true);
  });

  it("a transport next to a Kraken sails one tile, or lands at once if land is beside it", () => {
    const state = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 4, y: 6 } },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 3, y: 8 },
          embarkedAt: { x: 3, y: 7 },
        },
      ],
      { favour: 2 },
    );
    const enemyTurn = acceptV7(state, 0, { kind: "END_TURN" }).state;
    const transport = navalUnitAtV7(enemyTurn, { x: 3, y: 7 });
    const two = move(transport.id, [
      { x: 2, y: 7 },
      { x: 1, y: 7 },
    ]);
    expect(rejectV7(enemyTurn, 1, two)).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: expect.objectContaining({ reason: "DRAGGED" }),
    });
    expect(offered(enemyTurn, two, 1)).toBe(false);
    expect(offered(enemyTurn, move(transport.id, [{ x: 2, y: 7 }]), 1)).toBe(
      true,
    );
    // A landing is no Move: it is never dragged.
    const land: CommandV7 = {
      kind: "DISEMBARK",
      unitId: transport.id,
      at: { x: 3, y: 8 },
    };
    expect(offered(enemyTurn, land, 1)).toBe(true);
    expect(acceptV7(enemyTurn, 1, land).state.units).toContainEqual(
      expect.objectContaining({ id: transport.id, form: "LAND" }),
    );
  });
});

describe("K1: Offerings to the Deep (section 9.3)", () => {
  it("pays half a sunk ship's value for an attack kill, and the preview says so", () => {
    const state = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
      { favour: 2 },
    );
    const view = viewOf(state);
    const kraken = navalUnitAtV7(state, { x: 3, y: 5 });
    const boat = navalUnitAtV7(state, { x: 4, y: 5 });
    const preview = queryCombatPreviewV7(view, kraken.id, boat.id);
    if (preview === null) throw new Error("no preview");
    expect(deepOfferingCombatNotesV7(view, preview)).toEqual([
      "Offering +2 Favour",
    ]);
    expect(navalCombatLinesV7(view, preview).notes).toContain(
      "Offering +2 Favour",
    );
    const result = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(result.combat.defenderDies).toBe(true);
    expect(offerings(result.events)).toEqual([
      expect.objectContaining({ amount: 2, forfeited: 0, favour: 4 }),
    ]);
  });

  it("pays for a retaliation kill by a Cult ship", () => {
    // A Human Patrol Boat rams a Black Gondola and sinks to its reply.
    const state = sea(
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 }, hp: 2, ran: 1 },
      ],
      { favour: 2 },
    );
    const enemy = navalUnitAtV7(state, { x: 3, y: 5 });
    const gondola = navalUnitAtV7(state, { x: 4, y: 5 });
    const enemyTurn = acceptV7(state, 0, { kind: "END_TURN" }).state;
    const preview = queryCombatPreviewV7(
      viewOf(enemyTurn, 1),
      enemy.id,
      gondola.id,
    );
    if (preview === null) throw new Error("no preview");
    expect(preview.attackerDies).toBe(true);
    // The Human seat is told the Cult ship may feed on it (private research
    // assumed).
    expect(deepOfferingCombatNotesV7(viewOf(enemyTurn, 1), preview)).toEqual([
      "Enemy Offering +2 Favour",
    ]);
    const result = acceptV7(enemyTurn, 1, attack(enemy.id, gondola.id));
    expect(combatOf(result.events).attackerDies).toBe(true);
    expect(offerings(result.events)).toEqual([
      expect.objectContaining({
        playerId: seatV7(state, 0).id,
        amount: 2,
      }),
    ]);
  });

  it("is capped at 30 with the excess forfeited, and the preview says the loss", () => {
    const state = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 } },
      ],
      { favour: 29 },
    );
    const view = viewOf(state);
    const kraken = navalUnitAtV7(state, { x: 3, y: 5 });
    const submarine = navalUnitAtV7(state, { x: 4, y: 5 });
    const preview = queryCombatPreviewV7(view, kraken.id, submarine.id);
    if (preview === null) throw new Error("no preview");
    expect(deepOfferingCombatNotesV7(view, preview)).toEqual([
      "Offering +4 Favour (3 lost)",
    ]);
    const result = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(offerings(result.events)).toEqual([
      expect.objectContaining({
        amount: 4,
        forfeited: 3,
        favour: FAVOUR_CAP_V7,
      }),
    ]);
    expect(cultFavour(result.state)).toBe(30);
  });

  it("pays nothing for a splash victim, a land kill, a kill without the technology, or another seat's kill", () => {
    // The Galleon's shot sinks one boat and its splash another: only the
    // target pays.
    const splash = sea(
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 6 }, hp: 3 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 6 }, hp: 1 },
      ],
      { favour: 0 },
    );
    const shot = exchange(splash, { x: 3, y: 4 }, { x: 3, y: 6 });
    expect(shot.combat.defenderDies).toBe(true);
    expect(shot.combat.splash.some((entry) => entry.dies)).toBe(true);
    expect(offerings(shot.events).map((event) => event.amount)).toEqual([2]);
    // A land kill pays nothing (the Galleon shells a Fighter on the shore).
    const shore = sea(
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 8 }, hp: 2 },
      ],
      { favour: 0 },
    );
    const shelled = exchange(shore, { x: 3, y: 7 }, { x: 3, y: 8 });
    expect(shelled.combat.defenderDies).toBe(true);
    expect(offerings(shelled.events)).toEqual([]);
    // Without Offerings to the Deep nothing is paid, and nothing is shown.
    const untaught = sea(
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 }, hp: 2 },
      ],
      { cultTechs: CULT_WITHOUT_OFFERINGS_V7, favour: 0 },
    );
    const plain = exchange(untaught, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(plain.combat.defenderDies).toBe(true);
    expect(offerings(plain.events)).toEqual([]);
    if (plain.preview === null) throw new Error("no preview");
    expect(deepOfferingCombatNotesV7(viewOf(untaught), plain.preview)).toEqual(
      [],
    );
    // A Human ship's kill of a Cult ship pays nobody.
    const human = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
      { factions: ["ORIGINAL", "CULT"], favour: 0 },
    );
    const sunk = exchange(human, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(sunk.combat.defenderDies).toBe(true);
    expect(sunk.events.some((event) => event.kind === "FAVOUR_GAINED")).toBe(
      false,
    );
  });

  it("pays nothing for the units a blast kills, only for the ship the attack sinks", () => {
    // A Galleon of the Eye sinks a Scrap Dreadnought whose death blast
    // takes a Fire Raft beside it: only the Dreadnought feeds the deep.
    const state = sea(
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp: 2 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 6 }, hp: 1 },
      ],
      { factions: ["CULT", "GOBLIN"], favour: 0 },
    );
    const raft = navalUnitAtV7(state, { x: 5, y: 6 });
    const result = exchange(state, { x: 2, y: 4 }, { x: 4, y: 5 });
    expect(result.combat.defenderDies).toBe(true);
    expect(
      result.state.units.find((unit) => unit.id === raft.id)?.hp ?? 0,
    ).toBe(0);
    const dreadnought = effectiveRoleRuleV7("BATTLESHIP", "GOBLIN").cost ?? 0;
    expect(offerings(result.events).map((event) => event.amount)).toEqual([
      Math.floor(dreadnought / 2),
    ]);
  });
});

describe("K2: the Kraken's Drag afloat (section 9.3)", () => {
  /** A Cult Kraken on (4, 5) and the Human pieces, on the Human turn. */
  function humanTurn(pieces: readonly CultPieceV7[]): GameStateV7 {
    const state = sea(
      [{ seat: 0, role: "SUBMARINE", at: { x: 4, y: 5 } }, ...pieces],
      { favour: 2 },
    );
    return acceptV7(state, 0, { kind: "END_TURN" }).state;
  }

  it("holds a hostile ship beside it to one tile, in both validations and the query", () => {
    const state = humanTurn([
      { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
    ]);
    const boat = navalUnitAtV7(state, { x: 3, y: 6 });
    const path = [
      { x: 2, y: 6 },
      { x: 1, y: 6 },
    ];
    expect(validateMovementPathV7(state, boat, path)).toMatchObject({
      legal: false,
      reason: "DRAGGED",
    });
    const view = viewOf(state, 1);
    const publicBoat = view.units.find((unit) => unit.id === boat.id);
    if (publicBoat === undefined) throw new Error("no boat");
    expect(validatePlayerMovementPathV7(view, publicBoat, path)).toMatchObject({
      legal: false,
      reason: "DRAGGED",
    });
    const moves = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "MOVE" && command.unitId === boat.id,
    );
    expect(moves.length).toBeGreaterThan(0);
    for (const command of moves)
      if (command.kind === "MOVE") expect(command.path).toHaveLength(1);
    expect(publicDraggingKrakenV7(view, boat.id)).toBe(
      navalUnitAtV7(state, { x: 4, y: 5 }).id,
    );
    expect(unitDraggedV7(view, boat.id)).toBe(true);
  });

  it("drags no land unit on the shore, no own or allied ship, and a ship once it is clear", () => {
    const state = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 4, y: 7 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 6 } },
      ],
      { favour: 2 },
    );
    const gondola = navalUnitAtV7(state, { x: 5, y: 6 });
    // The Cult's own Gondola beside its Kraken sails two tiles.
    expect(
      offered(
        state,
        move(gondola.id, [
          { x: 6, y: 5 },
          { x: 7, y: 4 },
        ]),
      ),
    ).toBe(true);
    // A Human Raider on the shore beside the Kraken walks two tiles.
    const krakenShore = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 4, y: 7 } },
        { seat: 1, role: "RAIDER", at: { x: 3, y: 8 } },
      ],
      { favour: 2 },
    );
    const raiderTurn = acceptV7(krakenShore, 0, { kind: "END_TURN" }).state;
    const raider = navalUnitAtV7(raiderTurn, { x: 3, y: 8 });
    expect(
      validateMovementPathV7(raiderTurn, raider, [
        { x: 2, y: 8 },
        { x: 1, y: 8 },
      ]).legal,
    ).toBe(true);
  });

  it("does not drag from an icebound Kraken", () => {
    const KRAKEN: CoordV7 = { x: 4, y: 5 };
    const BOAT: CoordV7 = { x: 3, y: 5 };
    const frozen = frozenArenaV7({
      factions: ["CULT", "ORIGINAL"],
      units: [
        { seat: 0, role: "SUBMARINE", at: KRAKEN },
        { seat: 1, role: "PATROL_BOAT", at: BOAT },
      ],
      ice: [{ at: KRAKEN, seat: 2, turnsLeft: 5 }],
      third: { faction: "ICE_FOLK", explored: true },
    });
    const boat = navalUnitAtV7(frozen, BOAT);
    expect(
      validateMovementPathV7(frozen, boat, [
        { x: 2, y: 5 },
        { x: 1, y: 5 },
      ]).legal,
    ).toBe(true);
    expect(publicDraggingKrakensV7(viewOf(frozen, 1))).toEqual([]);
  });

  it("does not stop a Ram's shove of a unit beside it", () => {
    // The Cult's own Gondola rams a Human boat beside the Kraken: the
    // shove is no Move.
    const state = sea(
      [
        { seat: 0, role: "SUBMARINE", at: { x: 4, y: 4 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 }, ran: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
      ],
      { favour: 2 },
    );
    const boat = navalUnitAtV7(state, { x: 3, y: 5 });
    const result = exchange(state, { x: 2, y: 5 }, { x: 3, y: 5 });
    expect(result.combat).toMatchObject({ ram: true, push: "WILL_PUSH" });
    expect(navalUnitV7(result.state, boat.id).at).toEqual({ x: 4, y: 5 });
  });
});

describe("no Board for the Cult, and none on a Kraken (sections 2 and 9.3)", () => {
  it("offers no BOARD to a Cult ship", () => {
    const state = sea([
      { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 7 }, hp: 2 },
    ]);
    const gondola = navalUnitAtV7(state, { x: 3, y: 6 });
    const boat = navalUnitAtV7(state, { x: 3, y: 7 });
    expect(
      queryPlayerCommandsV7(viewOf(state)).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    expect(rejectV7(state, 0, board(gondola.id, boat.id)).code).not.toBe("");
  });

  it("refuses a Human ship's Board of a weak Kraken as TARGET_IMMUNE and never offers it", () => {
    const state = sea(
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 }, hp: 3 },
      ],
      { factions: ["ORIGINAL", "CULT"] },
    );
    const boarder = navalUnitAtV7(state, { x: 3, y: 5 });
    const beast = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(
      queryPlayerCommandsV7(viewOf(state)).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    expect(rejectV7(state, 0, board(boarder.id, beast.id))).toEqual({
      code: "BOARD_NOT_LEGAL",
      params: expect.objectContaining({ reason: "TARGET_IMMUNE" }),
    });
  });
});

describe("the Kraken's sound (section 9.7)", () => {
  it("lashes with its own sound: a Kraken's torpedo plays the ElevenLabs lash, a Submarine's the swing", () => {
    const state = sea([
      { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
      { seat: 1, role: "SUBMARINE", at: { x: 5, y: 5 } },
    ]);
    const view = viewOf(state);
    const kraken = navalUnitAtV7(state, { x: 3, y: 5 });
    const submarine = navalUnitAtV7(state, { x: 5, y: 5 });
    expect(seaBeastAttacksV7([view], kraken.id)).toBe("attack.kraken");
    expect(seaBeastAttacksV7([view], submarine.id)).toBeNull();
    expect(SOUND_IDS_V1).toContain("attack.kraken");
    expect(
      SOUND_DEFAULT_CLIPS_V1.find((clip) => clip.id === "attack.kraken")?.file,
    ).toBe("attack-kraken-105.m4a");
  });
});

describe("the Deep Ones' words (sections 9.3 and 12)", () => {
  it("names the Cult ships on the cards and says the two Cult sentences", () => {
    expect(navalRamUnlockTextV7("CULT")).toBe(
      "Bow Ram: Black Gondolas that moved hit ships with +1 Attack and shove them back",
    );
    expect(deepOfferingRuleV7()).toBe(
      "What your ships sink feeds the Ancient Ones: half its value in Favour.",
    );
    expect(deepOfferingsUnlockTextV7()).toBe(
      "Offerings to the Deep: What your ships sink feeds the Ancient Ones: half its value in Favour",
    );
    expect(krakenDragRuleV7()).toBe(
      "Enemies afloat beside the Kraken can move only one tile.",
    );
    expect(battleshipUnlockNoteV7("CULT")).toBe(
      "Galleon of the Eye: long-range splash damage",
    );
    expect(submarineUnlockNoteV7("CULT")).toBe(
      "Kraken: hit only from the next tile; torpedo with no strike-back; Drag; never boarded",
    );
    expect(glossaryEntryV7("DEEP_OFFERING")).toMatchObject({
      name: "Offering to the Deep",
    });
    expect(glossaryEntryV7("DRAG_AFLOAT")).toMatchObject({ name: "Drag" });
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(
        roleGlossaryV7(role, "CULT").map((entry) => entry.id),
        role,
      ).toContain("DEEP_OFFERING");
    expect(
      roleGlossaryV7("SUBMARINE", "CULT").map((entry) => entry.id),
    ).toEqual(
      expect.arrayContaining([
        "SUBMERGED",
        "TORPEDO",
        "DRAG_AFLOAT",
        "SEA_BEAST",
      ]),
    );
    // The Mass keeps its land Drag line.
    expect(
      roleGlossaryV7("SUBMARINE", "CULT").map((entry) => entry.id),
    ).not.toContain("DRAG");
  });
});
