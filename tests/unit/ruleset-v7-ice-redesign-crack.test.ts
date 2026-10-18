import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewCrackIceV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  unitIsIceboundV7,
  unitIsSubmergedV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  frozenStateV7,
  iceEntryV7,
  patchFrozenUnitV7,
  type FrozenArenaOptionsV7,
  type FrozenIceV7,
  type FrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The frozen sea redesign (`pulp_wars-5ti.25`,
// docs/product/RULESET_7_ICE_REDESIGN.md section 2.9): Crack Ice. Any unit
// or ship of the eight other factions breaks the ice next to it back into
// water; thick ice (Glacier) takes two Cracks, and a Freeze mends a crack.
// On the authored strait of `v7-naval-branch.ts` (rows 0 to 2 and 8 to 10
// land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water); seat 0 is
// Human, seat 1 the Ice Folk that own the ice.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
const SHORE: CoordV7 = { x: 2, y: 2 };
const ICE: CoordV7 = { x: 2, y: 3 };

const scene = (
  units: readonly FrozenUnitV7[],
  ice: readonly (CoordV7 | FrozenIceV7)[],
  iceTechs: readonly TechnologyIdV7[] = RIME,
  extra: Partial<FrozenArenaOptionsV7> = {},
): GameStateV7 =>
  frozenArenaV7({
    factions: ["ORIGINAL", "ICE_FOLK"],
    technologies: [ALL, iceTechs],
    units,
    ice: ice.map((entry): FrozenIceV7 =>
      "at" in entry ? entry : { at: entry, seat: 1 },
    ),
    ...extra,
  });
const crack = (state: GameStateV7, from: CoordV7, at: CoordV7): CommandV7 => ({
  kind: "CRACK_ICE",
  unitId: navalUnitAtV7(state, from).id,
  at,
});
const offered = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id));
const offeredCracks = (state: GameStateV7, seat: 0 | 1 = 0) =>
  offered(state, seat).filter((command) => command.kind === "CRACK_ICE");
/** The same position on `seat`'s turn. */
function turnOf(state: GameStateV7, seat: 0 | 1): GameStateV7 {
  const parsed = parseGameStateV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatV7(state, seat).id),
  });
  if (parsed === null) throw new Error("the turn state is invalid");
  return parsed;
}

describe("Crack Ice: the result (section 2.9)", () => {
  it("breaks plain ice back into water, as the preview says, and a Freeze makes it again", () => {
    const state = scene([{ seat: 0, role: "FIGHTER", at: SHORE }], [ICE]);
    const fighter = navalUnitAtV7(state, SHORE);
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(offeredCracks(state)).toEqual([crack(state, SHORE, ICE)]);
    expect(previewCrackIceV7(view, fighter.id, ICE)).toEqual({
      unitId: fighter.id,
      at: ICE,
      broken: true,
      freed: [],
    });
    const result = acceptV7(state, 0, crack(state, SHORE, ICE));
    expect(result.events).toEqual([
      {
        kind: "ICE_CRACKED",
        playerId: seatV7(state, 0).id,
        unitId: fighter.id,
        at: ICE,
        broken: true,
        freed: [],
      },
    ]);
    expect(parseEventV7(result.events[0]).ok).toBe(true);
    expect(iceEntryV7(result.state, ICE)).toBeUndefined();
    // A primary action: the Fighter has acted and is handled.
    expect(navalUnitV7(result.state, fighter.id).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    expect(offeredCracks(result.state)).toEqual([]);
    // The Ice Folk learn of it with the Fighter they see.
    const envelope = projectEventsV7(
      state,
      result.state,
      seatV7(state, 1).id,
      result.events,
    );
    expect(envelope.events).toEqual(result.events);
    expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });

  it("cracks thick ice first and breaks it with the second Crack; the owner's Freeze mends a crack", () => {
    const state = scene(
      [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 0, role: "GUARD", at: { x: 1, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
      [ICE],
      ALL,
    );
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(view.ice).toEqual([
      { at: ICE, ownerId: seatV7(state, 1).id, cracked: false, thick: true },
    ]);
    expect(
      previewCrackIceV7(view, navalUnitAtV7(state, SHORE).id, ICE),
    ).toMatchObject({ broken: false, freed: [] });
    const first = acceptV7(state, 0, crack(state, SHORE, ICE));
    expect(first.events[0]).toMatchObject({
      kind: "ICE_CRACKED",
      broken: false,
    });
    expect(iceEntryV7(first.state, ICE)).toEqual({
      at: ICE,
      ownerId: seatV7(state, 1).id,
      cracked: true,
    });
    // Still ice in every way: the next Crack breaks it.
    const guard = { x: 1, y: 2 };
    expect(
      previewCrackIceV7(
        viewForV7(first.state, seatV7(state, 0).id),
        navalUnitAtV7(first.state, guard).id,
        ICE,
      ),
    ).toMatchObject({ broken: true });
    const second = acceptV7(first.state, 0, crack(first.state, guard, ICE));
    expect(second.events[0]).toMatchObject({ broken: true });
    expect(iceEntryV7(second.state, ICE)).toBeUndefined();
    // On the Ice Folk turn a Freeze over the cracked tile mends it.
    const theirs = turnOf(first.state, 1);
    const yeti = navalUnitAtV7(theirs, { x: 3, y: 2 });
    const mend = acceptV7(theirs, 1, {
      kind: "FREEZE",
      unitId: yeti.id,
      at: ICE,
    });
    expect(iceEntryV7(mend.state, ICE)?.cracked).toBe(false);
  });

  it("frees an icebound ship, which may sail and act the same turn; a ship cracks too", () => {
    const BOUND: CoordV7 = { x: 2, y: 4 };
    const FREE: CoordV7 = { x: 2, y: 5 };
    const state = scene(
      [
        { seat: 0, role: "PATROL_BOAT", at: BOUND },
        { seat: 0, role: "PATROL_BOAT", at: FREE },
      ],
      [BOUND],
      ALL,
    );
    const bound = navalUnitAtV7(state, BOUND);
    expect(unitIsIceboundV7(state, bound)).toBe(true);
    // An icebound ship cannot crack its own way out (nor anything else).
    expect(rejectV7(state, 0, crack(state, BOUND, { x: 1, y: 3 }))).toEqual({
      code: "CRACK_ICE_NOT_LEGAL",
      params: { reason: "ICEBOUND" },
    });
    // Thick: the first Crack frees nobody, the second does.
    const first = acceptV7(state, 0, crack(state, FREE, BOUND));
    expect(first.events[0]).toMatchObject({ broken: false, freed: [] });
    const second = acceptV7(
      turnOf(
        acceptV7(acceptV7(first.state, 0, { kind: "END_TURN" }).state, 1, {
          kind: "END_TURN",
        }).state,
        0,
      ),
      0,
      crack(first.state, FREE, BOUND),
    );
    expect(second.events[0]).toMatchObject({
      kind: "ICE_CRACKED",
      broken: true,
      freed: [bound.id],
    });
    expect(
      unitIsIceboundV7(second.state, navalUnitV7(second.state, bound.id)),
    ).toBe(false);
    // The freed ship sails and acts this turn.
    expect(
      offered(second.state).some(
        (command) => command.kind === "MOVE" && command.unitId === bound.id,
      ),
    ).toBe(true);
  });

  it("a submerged Submarine cracks and stays submerged", () => {
    const SUB: CoordV7 = { x: 3, y: 5 };
    const state = scene(
      [{ seat: 0, role: "SUBMARINE", at: SUB }],
      [{ x: 2, y: 5 }],
    );
    const sub = navalUnitAtV7(state, SUB);
    expect(unitIsSubmergedV7(state, sub)).toBe(true);
    const result = acceptV7(state, 0, crack(state, SUB, { x: 2, y: 5 }));
    expect(
      unitIsSubmergedV7(result.state, navalUnitV7(result.state, sub.id)),
    ).toBe(true);
  });
});

describe("Crack Ice: the legality rows in order (section 2.9)", () => {
  it("row 1: the ordinary unit errors", () => {
    const state = scene(
      [{ seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } }],
      [{ x: 2, y: 7 }],
    );
    expect(
      rejectV7(state, 0, {
        kind: "CRACK_ICE",
        unitId: 999_999 as never,
        at: ICE,
      }).code,
    ).toBe("UNIT_NOT_FOUND");
    expect(
      rejectV7(state, 0, crack(state, { x: 2, y: 8 }, { x: 2, y: 7 })).code,
    ).toBe("UNIT_NOT_OWNED");
  });

  it("row 2: never a unit of the Ice Folk kind (nor an Egg)", () => {
    const state = turnOf(
      scene([{ seat: 1, role: "FIGHTER", at: SHORE }], [ICE]),
      1,
    );
    expect(rejectV7(state, 1, crack(state, SHORE, ICE))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    expect(offeredCracks(state, 1)).toEqual([]);
    // An Egg is refused before any Crack row (the common Egg refusal).
    const nest = frozenArenaV7({
      factions: ["DINOSAUR", "ICE_FOLK"],
      // Without Nesting, which would hatch the Egg within the round.
      technologies: [
        TECHNOLOGY_IDS_V7.filter(
          (tech) => tech !== "FORTIFICATION" && tech !== "EXPLOSIVES",
        ),
        RIME,
      ],
      units: [],
      ice: [{ at: { x: 6, y: 3 }, seat: 1 }],
    });
    const lay = offered(nest).find(
      (command) =>
        command.kind === "LAY_EGG" && command.at.x === 6 && command.at.y === 2,
    );
    if (lay === undefined) throw new Error("no nest on (6, 2)");
    const laid = acceptV7(nest, 0, lay);
    const egg = navalUnitAtV7(laid.state, { x: 6, y: 2 });
    expect(egg.form).toBe("EGG");
    expect(
      rejectV7(laid.state, 0, crack(laid.state, { x: 6, y: 2 }, { x: 6, y: 3 }))
        .code,
    ).toBe("UNIT_IS_EGG");
  });

  it("row 3: not Frozen, no primary action used, and a role that may act after moving", () => {
    const base = scene(
      [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 0, role: "CATAPULT", at: { x: 3, y: 2 } },
      ],
      [ICE],
    );
    const fighter = navalUnitAtV7(base, SHORE);
    const frozen = parseGameStateV7({
      ...base,
      frozen: [{ unitId: fighter.id, turnsLeft: 1 }],
    });
    if (frozen === null) throw new Error("invalid");
    expect(rejectV7(frozen, 0, crack(frozen, SHORE, ICE)).code).toBe(
      "UNIT_FROZEN",
    );
    expect(
      offeredCracks(frozen).some((command) =>
        "unitId" in command ? command.unitId === fighter.id : false,
      ),
    ).toBe(false);
    const acted = patchFrozenUnitV7(base, fighter.id, {
      activation: { ...fighter.activation, attacked: true, attacksUsed: 1 },
    });
    expect(rejectV7(acted, 0, crack(acted, SHORE, ICE))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: fighter.id },
    });
    // A Catapult that moved may not act this turn.
    const catapult = navalUnitAtV7(base, { x: 3, y: 2 });
    const moved = patchFrozenUnitV7(base, catapult.id, {
      activation: { ...catapult.activation, moved: true, movedPathLength: 1 },
    });
    expect(rejectV7(moved, 0, crack(moved, { x: 3, y: 2 }, ICE)).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    // A Fighter may act after moving.
    const walked = patchFrozenUnitV7(base, fighter.id, {
      activation: { ...fighter.activation, moved: true, movedPathLength: 1 },
    });
    acceptV7(walked, 0, crack(walked, SHORE, ICE));
  });

  it("row 4: `at` is one of the eight tiles around the unit", () => {
    const state = scene(
      [{ seat: 0, role: "FIGHTER", at: SHORE }],
      [ICE, { x: 2, y: 4 }],
    );
    for (const at of [SHORE, { x: 2, y: 4 }])
      expect(rejectV7(state, 0, crack(state, SHORE, at))).toEqual({
        code: "CRACK_ICE_NOT_LEGAL",
        params: { reason: "OUT_OF_RANGE" },
      });
  });

  it("row 5: explored ice that is not an ally's", () => {
    const state = scene([{ seat: 0, role: "FIGHTER", at: SHORE }], [ICE]);
    // Open water.
    expect(rejectV7(state, 0, crack(state, SHORE, { x: 1, y: 3 }))).toEqual({
      code: "CRACK_ICE_NOT_LEGAL",
      params: { reason: "NO_ICE" },
    });
    // Ice the actor has not explored.
    const unexplored = parseGameStateV7({
      ...state,
      players: state.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !(at.x === ICE.x && at.y === ICE.y),
              ),
            }
          : player,
      ),
    });
    if (unexplored === null) throw new Error("invalid");
    expect(
      rejectV7(unexplored, 0, crack(unexplored, SHORE, ICE)).params,
    ).toEqual({ reason: "NO_ICE" });
    expect(offeredCracks(unexplored)).toEqual([]);
    // The actor's own ice may be cracked (a captured city's).
    const own = scene(
      [{ seat: 0, role: "FIGHTER", at: SHORE }],
      [{ at: ICE, seat: 0 }],
    );
    expect(offeredCracks(own)).toEqual([crack(own, SHORE, ICE)]);
    // An ally's ice may not: in a Cooperative match the two AI seats are
    // allies, and the human is no one's.
    const allied = frozenArenaV7({
      factions: ["ORIGINAL", "UNDEAD"],
      technologies: [ALL, ALL],
      aiMode: "COOPERATIVE",
      third: { faction: "ICE_FOLK", explored: true },
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 8 } },
      ],
      ice: [
        { at: ICE, seat: 2 },
        { at: { x: 1, y: 7 }, seat: 2 },
      ],
    });
    expect(offeredCracks(allied)).toEqual([crack(allied, SHORE, ICE)]);
    const ally = turnOf(allied, 1);
    expect(
      rejectV7(ally, 1, crack(ally, { x: 1, y: 8 }, { x: 1, y: 7 })),
    ).toEqual({
      code: "CRACK_ICE_NOT_LEGAL",
      params: { reason: "NO_ICE" },
    });
    expect(offeredCracks(ally, 1)).toEqual([]);
  });

  it("row 6: no land-form unit on it (an icebound ship may be)", () => {
    const state = scene(
      [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 1, role: "FIGHTER", at: ICE },
      ],
      [ICE],
    );
    expect(rejectV7(state, 0, crack(state, SHORE, ICE))).toEqual({
      code: "CRACK_ICE_NOT_LEGAL",
      params: { reason: "OCCUPIED" },
    });
    expect(offeredCracks(state)).toEqual([]);
  });

  it("row 7: no improvement on it (Pillage instead)", () => {
    // Seat 1's Port on (6, 7) is an Ice Harbour on its ice.
    const state = scene(
      [{ seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 6 } }],
      [{ x: 6, y: 7 }],
    );
    expect(
      rejectV7(state, 0, crack(state, { x: 6, y: 6 }, { x: 6, y: 7 })),
    ).toEqual({
      code: "CRACK_ICE_NOT_LEGAL",
      params: { reason: "BUILT" },
    });
    expect(offeredCracks(state)).toEqual([]);
  });

  it("is offered exactly when it is accepted, and every preview equals its resolution", () => {
    const state = scene(
      [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 0, role: "KNIGHT", at: { x: 4, y: 2 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
      [
        ICE,
        { at: { x: 2, y: 4 }, seat: 1, cracked: true },
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 1, y: 4 },
        { x: 1, y: 5 },
      ],
      ALL,
    );
    const view = viewForV7(state, seatV7(state, 0).id);
    const offers = offeredCracks(state);
    expect(offers.length).toBeGreaterThan(4);
    const key = (command: CommandV7): string =>
      command.kind === "CRACK_ICE"
        ? `${command.unitId}:${command.at.x},${command.at.y}`
        : "";
    const offeredKeys = new Set(offers.map(key));
    for (const unit of state.units.filter(
      (candidate) => candidate.ownerId === seatV7(state, 0).id,
    ))
      for (let y = unit.at.y - 2; y <= unit.at.y + 2; y += 1)
        for (let x = unit.at.x - 2; x <= unit.at.x + 2; x += 1) {
          if (x < 0 || y < 0 || x > 10 || y > 10) continue;
          const command: CommandV7 = {
            kind: "CRACK_ICE",
            unitId: unit.id,
            at: { x, y },
          };
          const preview = previewCrackIceV7(view, unit.id, { x, y });
          if (!offeredKeys.has(key(command))) {
            rejectV7(state, 0, command);
            expect(preview, key(command)).toBeNull();
            continue;
          }
          const result = acceptV7(state, 0, command);
          expect(result.events).toEqual([
            {
              kind: "ICE_CRACKED",
              playerId: seatV7(state, 0).id,
              unitId: unit.id,
              at: { x, y },
              broken: preview?.broken,
              freed: preview?.freed,
            },
          ]);
          expect(iceEntryV7(result.state, { x, y }) === undefined).toBe(
            preview?.broken === true,
          );
        }
  });
});

describe("Crack Ice and the factions (section 2.10)", () => {
  it("every land and naval role of the eight other factions may crack", () => {
    const factions: readonly FactionIdV7[] = [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "DWARF",
      "CANDY",
      "CULT",
    ];
    for (const faction of factions) {
      const state = frozenArenaV7({
        factions: [faction, "ICE_FOLK"],
        technologies: [[], RIME],
        units: [{ seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } }],
        ice: [
          { at: ICE, seat: 1 },
          { at: { x: 6, y: 3 }, seat: 1 },
        ],
      });
      const unitIds = new Set(
        offeredCracks(state).flatMap((command) =>
          command.kind === "CRACK_ICE" ? [command.unitId] : [],
        ),
      );
      // The ship next to the first tile and the capital's first unit next
      // to the second.
      expect(
        unitIds.has(navalUnitAtV7(state, { x: 1, y: 3 }).id),
        faction,
      ).toBe(true);
      expect(
        unitIds.has(navalUnitAtV7(state, { x: 5, y: 2 }).id),
        faction,
      ).toBe(true);
    }
  });

  it("frozenStateV7 keeps a crack only on thick ice", () => {
    const thin = scene([], []);
    expect(() =>
      frozenStateV7(thin, [{ at: ICE, seat: 1, cracked: true }]),
    ).toThrow();
    const thick = scene([], [], ALL);
    expect(
      frozenStateV7(thick, [{ at: ICE, seat: 1, cracked: true }]).ice,
    ).toEqual([{ at: ICE, ownerId: seatV7(thick, 1).id, cracked: true }]);
  });
});
