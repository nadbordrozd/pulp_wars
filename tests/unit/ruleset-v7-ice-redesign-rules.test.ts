import { describe, expect, it } from "vitest";
import {
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewCrackIceV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  queryUnitStatsV7,
  unitIsIceboundV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleAbilityV7,
  type UnitRoleIdV7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
} from "../../src/engine/index";
import {
  reachablePlayerMovementPathsV7,
  validateMovementPathV7,
} from "../../src/engine/v7/movement";
import {
  frozenArenaV7,
  iceEntryV7,
  lineV7,
  patchFrozenUnitV7,
  type FrozenIceV7,
  type FrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The frozen sea redesign (`pulp_wars-5ti.25`,
// docs/product/RULESET_7_ICE_REDESIGN.md sections 2.3, 2.7, and 2.8): Black
// Ice freezes on entry, the Sled's Runners, and the ice on a capture and an
// elimination. On the authored strait (rows 0 to 2 and 8 to 10 land, rows 3
// and 7 Shallow Water, rows 4 to 6 Deep Water).

const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
const SHORE: CoordV7 = { x: 2, y: 2 };
const ICE1: CoordV7 = { x: 2, y: 3 };
const ICE2: CoordV7 = { x: 2, y: 4 };

const roleWith = (
  faction: FactionIdV7,
  ability: UnitRoleAbilityV7,
): UnitRoleIdV7 => {
  const role = UNIT_ROLE_IDS_V7.find((candidate) =>
    effectiveRoleRuleV7(candidate, faction).abilities.includes(ability),
  );
  if (role === undefined) throw new Error(`${faction} has no ${ability}`);
  return role;
};
/** Seat 0 is `faction`; seat 1 the Ice Folk (with `iceTechs`) own the ice. */
const scene = (
  faction: FactionIdV7,
  units: readonly FrozenUnitV7[],
  ice: readonly (CoordV7 | FrozenIceV7)[],
  iceTechs: readonly TechnologyIdV7[] = ALL,
): GameStateV7 =>
  frozenArenaV7({
    factions: [faction, "ICE_FOLK"],
    technologies: [ALL, iceTechs],
    units,
    ice: ice.map((entry): FrozenIceV7 =>
      "at" in entry ? entry : { at: entry, seat: 1 },
    ),
  });
const blackIceFreezes = (
  events: readonly DomainEventV7[],
): readonly DomainEventV7[] =>
  events.filter(
    (event) => event.kind === "UNITS_FROZEN" && event.source === "BLACK_ICE",
  );

describe("Black Ice freezes on entry, once (section 2.8)", () => {
  it("a hostile unit that ends its Move on the seat's ice is Frozen at once, through its next turn", () => {
    const state = scene(
      "ORIGINAL",
      [{ seat: 0, role: "FIGHTER", at: SHORE }],
      [ICE1],
    );
    const fighter = navalUnitAtV7(state, SHORE);
    const result = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: fighter.id,
      path: [ICE1],
    });
    const frozen = {
      kind: "UNITS_FROZEN",
      playerId: seatV7(state, 1).id,
      sourceUnitId: null,
      source: "BLACK_ICE",
      // Frozen during its owner's own turn: through its next turn.
      results: [{ unitId: fighter.id, turnsLeft: 2 }],
    };
    expect(blackIceFreezes(result.events)).toEqual([frozen]);
    // Right after the Move's events.
    expect(result.events.at(-1)).toEqual(frozen);
    expect(result.state.frozen).toEqual([{ unitId: fighter.id, turnsLeft: 2 }]);
    // Both seats learn of it.
    for (const seat of [0, 1] as const) {
      const envelope = projectEventsV7(
        state,
        result.state,
        seatV7(state, seat).id,
        result.events,
      );
      expect(envelope.events).toContainEqual(frozen);
      expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
    }
  });

  it("needs Black Ice, the seat's own ice, and a step from off that ice", () => {
    const move = (state: GameStateV7, from: CoordV7, to: CoordV7) =>
      acceptV7(state, 0, {
        kind: "MOVE",
        unitId: navalUnitAtV7(state, from).id,
        path: [to],
      }).events;
    // Without Black Ice.
    const without = scene(
      "ORIGINAL",
      [{ seat: 0, role: "FIGHTER", at: SHORE }],
      [ICE1],
      ["SHORECRAFT"],
    );
    expect(blackIceFreezes(move(without, SHORE, ICE1))).toEqual([]);
    // Onto the mover's own ice.
    const own = scene(
      "ORIGINAL",
      [{ seat: 0, role: "FIGHTER", at: SHORE }],
      [{ at: ICE1, seat: 0 }],
    );
    expect(blackIceFreezes(move(own, SHORE, ICE1))).toEqual([]);
    // Along the seat's ice: a unit already on it walks on, unfrozen.
    const along = scene(
      "ORIGINAL",
      [{ seat: 0, role: "FIGHTER", at: ICE1 }],
      [ICE1, ICE2],
    );
    expect(blackIceFreezes(move(along, ICE1, ICE2))).toEqual([]);
    // From another seat's ice onto the Ice Folk ice: frozen.
    const across = scene(
      "ORIGINAL",
      [{ seat: 0, role: "FIGHTER", at: ICE1 }],
      [{ at: ICE1, seat: 0 }, ICE2],
    );
    expect(blackIceFreezes(move(across, ICE1, ICE2))).toHaveLength(1);
  });

  it("a landing and a Beam Down onto the ice freeze; a Start Turn, a push and an advance never do", () => {
    // A landing from a transport.
    const base = scene(
      "ORIGINAL",
      [{ seat: 0, role: "FIGHTER", at: { x: 0, y: 1 } }],
      [{ x: 2, y: 5 }],
    );
    const crew = navalUnitAtV7(base, { x: 0, y: 1 });
    const afloat = patchFrozenUnitV7(base, crew.id, {
      at: { x: 1, y: 5 },
      form: "EMBARKED",
    });
    const landed = acceptV7(afloat, 0, {
      kind: "DISEMBARK",
      unitId: crew.id,
      at: { x: 2, y: 5 },
    });
    expect(blackIceFreezes(landed.events)).toEqual([
      expect.objectContaining({
        results: [{ unitId: crew.id, turnsLeft: 2 }],
      }),
    ]);
    // A Beam Down.
    const martian = scene(
      "MARTIAN",
      [
        { seat: 0, role: "RAIDER", at: SHORE },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } },
      ],
      [ICE1],
    );
    const grunt = navalUnitAtV7(martian, { x: 3, y: 1 });
    const drop = queryPlayerCommandsV7(
      viewForV7(martian, seatV7(martian, 0).id),
    ).find(
      (command) =>
        command.kind === "BEAM_DOWN" &&
        command.passengerUnitId === grunt.id &&
        command.to.x === ICE1.x &&
        command.to.y === ICE1.y,
    );
    if (drop === undefined) throw new Error("the Beam Down is not offered");
    expect(blackIceFreezes(acceptV7(martian, 0, drop).events)).toEqual([
      expect.objectContaining({
        results: [{ unitId: grunt.id, turnsLeft: 2 }],
      }),
    ]);
    // A Charge! that pushes along the ice and follows onto it freezes
    // nobody: it is no Move of the unit.
    const triceratops = roleWith("DINOSAUR", "LINEBREAKER");
    const charge = scene(
      "DINOSAUR",
      [
        { seat: 0, role: triceratops, at: SHORE },
        { seat: 1, role: "GUARD", at: ICE1 },
      ],
      [ICE1, ICE2],
    );
    const charged = acceptV7(charge, 0, {
      kind: "ATTACK",
      unitId: navalUnitAtV7(charge, SHORE).id,
      targetUnitId: navalUnitAtV7(charge, ICE1).id,
    });
    expect(charged.events.some((event) => event.kind === "UNIT_PUSHED")).toBe(
      true,
    );
    expect(blackIceFreezes(charged.events)).toEqual([]);
    // A unit standing on the ice at the Ice Folk Start Turn is not frozen.
    const standing = scene(
      "ORIGINAL",
      [{ seat: 0, role: "FIGHTER", at: ICE1 }],
      [ICE1],
    );
    const started = acceptV7(
      acceptV7(standing, 0, { kind: "END_TURN" }).state,
      1,
      { kind: "END_TURN" },
    );
    expect(started.state.frozen).toEqual([]);
  });
});

describe("Runners: the Sled's slide is not stopped by zones of control (section 2.7)", () => {
  // A bridge down column 2 from the north shore to the south shore, with a
  // Human Fighter on the ice to its west whose zone of control covers
  // (2, 3) to (2, 5).
  const BRIDGE = lineV7(SHORE, 0, 1, 5);
  const bridge = (
    role: UnitRoleIdV7,
    extra: readonly FrozenUnitV7[] = [],
  ): GameStateV7 =>
    frozenArenaV7({
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role, at: SHORE },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 4 } },
        ...extra,
      ],
      ice: [...BRIDGE.map((at) => ({ at })), { at: { x: 1, y: 4 } }],
    });
  const validate = (state: GameStateV7, path: readonly CoordV7[]) =>
    validateMovementPathV7(state, navalUnitAtV7(state, SHORE), path);

  it("a Sled slides through the zone to the end of the ice; a Yeti stops in it", () => {
    const sled = bridge("RAIDER");
    const through = validate(sled, BRIDGE);
    expect(through).toMatchObject({ legal: true, destination: { x: 2, y: 7 } });
    // The slide is forced: it cannot stop in the zone.
    expect(validate(sled, [ICE1])).toMatchObject({
      legal: false,
      reason: "SLIDE_FORCED",
    });
    // The public paths agree, and so does the threat a viewer sees.
    const sledUnit = navalUnitAtV7(sled, SHORE);
    const view = viewForV7(sled, seatV7(sled, 0).id);
    const unit = view.units.find((candidate) => candidate.id === sledUnit.id);
    if (unit === undefined) throw new Error("no Sled");
    expect(
      reachablePlayerMovementPathsV7(view, unit).some(
        (path) => path.path.at(-1)?.x === 2 && path.path.at(-1)?.y === 7,
      ),
    ).toBe(true);
    acceptV7(sled, 0, { kind: "MOVE", unitId: sledUnit.id, path: BRIDGE });
    expect(
      queryThreatenedTilesV7(sled, sledUnit.id, seatV7(sled, 1).id),
    ).toContainEqual({ x: 2, y: 8 });
    expect(
      queryUnitStatsV7(viewForV7(sled, seatV7(sled, 0).id), sledUnit.id)
        ?.iceFolk?.runners,
    ).toBe(true);
    // A Yeti's slide stops in the zone.
    const yeti = bridge("FIGHTER");
    expect(validate(yeti, [ICE1])).toMatchObject({
      legal: true,
      destination: ICE1,
      stopped: true,
    });
    expect(validate(yeti, BRIDGE).legal).toBe(false);
    expect(
      queryUnitStatsV7(
        viewForV7(yeti, seatV7(yeti, 0).id),
        navalUnitAtV7(yeti, SHORE).id,
      )?.iceFolk?.runners,
    ).toBe(false);
  });

  it("a Sled still stops at a unit, and where its slide ends in the zone the Move ends", () => {
    const blocked = bridge("RAIDER", [
      { seat: 0, role: "GUARD", at: { x: 2, y: 6 } },
    ]);
    // The slide stops before the Musk Ox, on (2, 5), in the zone: the Move
    // ends there.
    expect(validate(blocked, BRIDGE.slice(0, 3))).toMatchObject({
      legal: true,
      destination: { x: 2, y: 5 },
      stopped: true,
    });
    expect(validate(blocked, BRIDGE.slice(0, 4)).legal).toBe(false);
  });
});

describe("ice on a capture and an elimination (section 2.3)", () => {
  it("the former owner's ice in the captured city's territory passes to the captor; an eliminated seat's icebound ships float free and its other ice stays, one Crack from breaking", () => {
    const base = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [ALL, ALL],
      // A bystander keeps the match going after the elimination.
      third: { faction: "GOBLIN" },
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 9 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 5 } },
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
      ],
      ice: [
        // In the Ice Folk capital's territory, its Ice Harbour included.
        { at: { x: 4, y: 7 }, seat: 1, cracked: true },
        { at: { x: 6, y: 7 }, seat: 1 },
        // Elsewhere: a cracked tile, and the ice a Human ship is locked in.
        { at: ICE1, seat: 1, cracked: true },
        { at: { x: 8, y: 5 }, seat: 1 },
      ],
    });
    const capital = { x: 5, y: 8 };
    const yeti = navalUnitAtV7(base, capital);
    const captor = navalUnitAtV7(base, { x: 4, y: 9 });
    const boat = navalUnitAtV7(base, { x: 8, y: 5 });
    expect(unitIsIceboundV7(base, boat)).toBe(true);
    const parsed = parseGameStateV7({
      ...base,
      units: base.units
        .filter((unit) => unit.id !== yeti.id)
        .map((unit) =>
          unit.id === captor.id
            ? { ...unit, at: capital, captureEligible: true }
            : unit,
        ),
    });
    if (parsed === null) throw new Error("the capture scene is invalid");
    const result = acceptV7(parsed, 0, { kind: "CAPTURE", unitId: captor.id });
    const human = seatV7(base, 0).id;
    const iceFolk = seatV7(base, 1).id;
    expect(result.events).toContainEqual({
      kind: "PLAYER_ELIMINATED",
      playerId: iceFolk,
    });
    expect(result.events).toContainEqual({
      kind: "ICE_MELTED",
      tiles: [{ x: 8, y: 5 }],
      freed: [boat.id],
    });
    expect(result.state.ice).toEqual([
      // The eliminated seat has no thick ice: its crack is gone.
      { at: ICE1, ownerId: iceFolk, cracked: false },
      { at: { x: 4, y: 7 }, ownerId: human, cracked: false },
      { at: { x: 6, y: 7 }, ownerId: human, cracked: false },
    ]);
    expect(
      unitIsIceboundV7(result.state, navalUnitV7(result.state, boat.id)),
    ).toBe(false);
    // One Crack breaks the eliminated seat's ice.
    const next = result.state;
    const fighter = navalUnitAtV7(next, SHORE);
    expect(
      previewCrackIceV7(viewForV7(next, human), fighter.id, ICE1),
    ).toMatchObject({ broken: true });
    const crack: CommandV7 = {
      kind: "CRACK_ICE",
      unitId: fighter.id,
      at: ICE1,
    };
    expect(iceEntryV7(acceptV7(next, 0, crack).state, ICE1)).toBeUndefined();
  });
});
