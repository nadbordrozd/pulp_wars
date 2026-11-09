import { describe, expect, it } from "vitest";
import {
  parseGameStateV7,
  previewCrackIceV7,
  queryThreatenedTilesV7,
  queryUnitStatsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  reachablePlayerMovementPathsV7,
  validateMovementPathV7,
} from "../../src/engine/v7/movement";
import {
  frozenArenaV7,
  iceEntryV7,
  lineV7,
  type FrozenIceV7,
  type FrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import { acceptV7, navalUnitAtV7, seatV7 } from "../fixtures/v7-naval-branch";

// The frozen sea redesign (`pulp_wars-5ti.25`,
// docs/product/RULESET_7_ICE_REDESIGN.md sections 2.3, 2.7, and 2.8): no
// freeze on entry (Black Ice went with the naval branch rebuilt,
// `pulp_wars-tzk6`, 7r137), zones of control on the ice, and the ice on a
// capture and an elimination. On the authored strait (rows 0 to 2 and 8 to
// 10 land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water).

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
// Only the Ice Folk walk on ice (`pulp_wars-y242`, 7r132): the hostile unit
// that steps onto the ice is a Martian Tripod (a walker). The naval branch
// rebuilt (`pulp_wars-tzk6`, 7r137,
// docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.4): Black Ice is gone
// (the Ice Folk Seamanship is Harpoons), so nothing freezes a unit that
// steps onto the seat's ice.
describe("no freeze on entry: Black Ice is gone (7r137)", () => {
  it("a hostile walker that ends its Move on the seat's ice is not Frozen, whatever the seat researched", () => {
    const state = scene(
      "MARTIAN",
      [{ seat: 0, role: "CATAPULT", at: SHORE }],
      [ICE1],
    );
    const tripod = navalUnitAtV7(state, SHORE);
    const result = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: tripod.id,
      path: [ICE1],
    });
    expect(
      result.events.filter((event) => event.kind === "UNITS_FROZEN"),
    ).toEqual([]);
    expect(result.state.frozen).toEqual([]);
  });
});

// Ice Folk movement (`pulp_wars-s55m.2`, 7r124): the slide is no longer
// forced. Skating is plain movement (`pulp_wars-ecnj`, 7r135): the Sled's
// Runners, which glided straight on through a zone of control, are gone; a
// zone of control stops it on the ice as anywhere.
describe("zones of control stop a Sled on the ice (section 2.7; its Runners glided through them until 7r135)", () => {
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

  it("a Sled stops on the first tile of the zone, like a Yeti", () => {
    for (const role of ["RAIDER", "FIGHTER"] as const) {
      const state = bridge(role);
      expect(validate(state, [ICE1]), role).toMatchObject({
        legal: true,
        destination: ICE1,
        stopped: true,
      });
      expect(validate(state, BRIDGE), role).toEqual({
        legal: false,
        reason: "ZOC_STOPS_MOVE",
      });
      expect(validate(state, [ICE1, ICE2]), role).toEqual({
        legal: false,
        reason: "ZOC_STOPS_MOVE",
      });
    }
    // The public paths agree, and so does the threat a viewer sees.
    const sled = bridge("RAIDER");
    const sledUnit = navalUnitAtV7(sled, SHORE);
    const view = viewForV7(sled, seatV7(sled, 0).id);
    const unit = view.units.find((candidate) => candidate.id === sledUnit.id);
    if (unit === undefined) throw new Error("no Sled");
    const ends = reachablePlayerMovementPathsV7(view, unit).map(
      (path) => path.destination,
    );
    expect(ends).toContainEqual(ICE1);
    expect(ends).not.toContainEqual(ICE2);
    expect(ends).not.toContainEqual({ x: 2, y: 7 });
    const threat = queryThreatenedTilesV7(
      sled,
      sledUnit.id,
      seatV7(sled, 1).id,
    );
    expect(threat).toContainEqual(ICE2);
    expect(threat).not.toContainEqual({ x: 2, y: 8 });
    expect(queryUnitStatsV7(view, sledUnit.id)?.iceFolk).not.toHaveProperty(
      "runners",
    );
  });

  it("a Sled on the ice past the zone Glides on and passes its own units, never ending on one", () => {
    // The Sled stands on (2, 6), below the zone, with a Walrus on (2, 7).
    const below = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "RAIDER", at: { x: 2, y: 6 } },
        { seat: 0, role: "GUARD", at: { x: 2, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 4 } },
      ],
      ice: [...BRIDGE.map((at) => ({ at })), { at: { x: 1, y: 4 } }],
    });
    const from = { x: 2, y: 6 };
    const sled = navalUnitAtV7(below, from);
    // Never on the Walrus, but past it ashore: half a point onto (2, 7),
    // a full one off the ice.
    expect(validateMovementPathV7(below, sled, [{ x: 2, y: 7 }]).legal).toBe(
      false,
    );
    expect(
      validateMovementPathV7(below, sled, [
        { x: 2, y: 7 },
        { x: 2, y: 8 },
      ]),
    ).toMatchObject({
      legal: true,
      destination: { x: 2, y: 8 },
      spentPoints2: 3,
    });
    // Up the bridge into the zone: (2, 5) ends the Move.
    expect(validateMovementPathV7(below, sled, [{ x: 2, y: 5 }])).toMatchObject(
      { legal: true, stopped: true, spentPoints2: 1 },
    );
    expect(
      validateMovementPathV7(below, sled, [
        { x: 2, y: 5 },
        { x: 2, y: 4 },
      ]),
    ).toEqual({ legal: false, reason: "ZOC_STOPS_MOVE" });
  });
});

describe("ice on a capture and an elimination (section 2.3)", () => {
  // The Ice Folk freeze rework (`pulp_wars-s55m.1`): no ship is ever in
  // the ice, so nothing floats free (no ICE_MELTED).
  it("the former owner's ice in the captured city's territory passes to the captor, its dock stays a plain dock; an eliminated seat's other ice stays, one Crack from breaking", () => {
    const base = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [ALL, ALL],
      // A bystander keeps the match going after the elimination.
      third: { faction: "GOBLIN" },
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 9 } },
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
      ],
      ice: [
        // In the Ice Folk capital's territory (its Port on (6, 7) is open
        // water: no dock is ever iced since 7r133, and the Ice Harbour is
        // gone since 7r137).
        { at: { x: 4, y: 7 }, seat: 1 },
        // Elsewhere.
        { at: ICE1, seat: 1 },
      ],
    });
    const capital = { x: 5, y: 8 };
    const yeti = navalUnitAtV7(base, capital);
    const captor = navalUnitAtV7(base, { x: 4, y: 9 });
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
    expect(result.events.map((event) => event.kind)).not.toContain(
      "UNITS_FROZEN",
    );
    expect(result.state.ice).toEqual([
      { at: ICE1, ownerId: iceFolk },
      { at: { x: 4, y: 7 }, ownerId: human },
    ]);
    // The captured Port stays a plain, open dock.
    const port = result.state.board.tiles.find(
      (tile) => tile.at.x === 6 && tile.at.y === 7,
    );
    expect(port?.improvement).toBe("PORT");
    expect(iceEntryV7(result.state, { x: 6, y: 7 })).toBeUndefined();
    // One Crack breaks the eliminated seat's ice.
    const next = result.state;
    const fighter = navalUnitAtV7(next, SHORE);
    expect(previewCrackIceV7(viewForV7(next, human), fighter.id, ICE1)).toEqual(
      { unitId: fighter.id, at: ICE1 },
    );
    const crack: CommandV7 = {
      kind: "CRACK_ICE",
      unitId: fighter.id,
      at: ICE1,
    };
    expect(iceEntryV7(acceptV7(next, 0, crack).state, ICE1)).toBeUndefined();
  });
});
