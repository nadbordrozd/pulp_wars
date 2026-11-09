import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  previewColdSnapV7,
  previewColdWakeV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  tileAtV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  UNIT_GLOSSARY_V7,
  glossaryEntryV7,
} from "../../src/render/unit-glossary-v7";
import {
  frozenArenaV7,
  iceEntryV7,
  type FrozenArenaOptionsV7,
} from "../fixtures/v7-frozen-sea";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The one Freeze effect (`pulp_wars-xv0t`, ruleset 7r133,
// docs/product/ICE_FOLK_REDESIGN_2026-11.md section 6, Bead 1). On the
// authored strait of `v7-naval-branch.ts`: rows 0 to 2 and 8 to 10 land,
// rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water; seat 0 (the Ice Folk)
// has its capital on (5, 2) with a 3 x 3 territory and a Port on (4, 3),
// seat 1 (the Humans) its capital on (5, 8) and a Port on (6, 7). Seat 0
// moves first. Every case is a hand-built state; no match is played.

const ALL: readonly TechnologyIdV7[] = NAVAL_TECHS_V7;
/** The strait with a Rift on (2, 1) (the mission legend's `x`). */
const RIFT_TERRAIN: readonly string[] = [
  "...........",
  "..x........",
  "...........",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~.~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "...........",
  "...........",
  "...........",
];

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const keys = (tiles: readonly CoordV7[]): string[] => tiles.map(key).sort();
const arena = (options: FrozenArenaOptionsV7): GameStateV7 =>
  frozenArenaV7({
    factions: ["ICE_FOLK", "ORIGINAL"],
    technologies: [ALL, ALL],
    ...options,
  });
const viewOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  viewForV7(state, seatV7(state, seat).id);
const commandsOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewOf(state, seat));
const frozenUnits = (state: GameStateV7): number[] =>
  state.frozen.map((entry) => entry.unitId);
const eventOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }> | undefined =>
  events.find(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );
const terrainAt = (state: GameStateV7, at: CoordV7): string | undefined =>
  tileAtV7(state.board, at)?.terrain;

describe("the Ice Witch's Cold Snap: the one Freeze rule (section 3.1)", () => {
  // The Witch on (3, 2): her ring is (2..4, 1..3). (2, 1) is a Rift, (3, 1)
  // and (2, 2) open neutral land, (4, 1) and (4, 2) her capital's land,
  // (2, 3) open Shallow Water, (3, 3) a Human boat, (4, 3) her own Port.
  const WITCH: CoordV7 = { x: 3, y: 2 };
  const build = () =>
    arena({
      terrain: RIFT_TERRAIN,
      units: [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 3 } },
      ],
    });

  it("ices the water, snows the open neutral land and Freezes the enemies, in one action", () => {
    const state = build();
    const witch = navalUnitAtV7(state, WITCH);
    const fighter = navalUnitAtV7(state, { x: 2, y: 2 });
    const boat = navalUnitAtV7(state, { x: 3, y: 3 });
    const preview = previewColdSnapV7(viewOf(state), witch.id);
    const result = acceptV7(state, 0, { kind: "COLD_SNAP", unitId: witch.id });
    const after = result.state;
    // Water to ice (with Rime); a boat's water stays water, the boat Frozen.
    expect(iceEntryV7(after, { x: 2, y: 3 })?.ownerId).toBe(
      seatV7(after, 0).id,
    );
    expect(iceEntryV7(after, { x: 3, y: 3 })).toBeUndefined();
    // Open neutral land to stored Snow; the Fighter on it Frozen too.
    expect(keys(after.snow)).toEqual(
      keys([
        { x: 3, y: 1 },
        { x: 2, y: 2 },
      ]),
    );
    expect(frozenUnits(after)).toEqual(
      [fighter.id, boat.id].sort((left, right) => left - right),
    );
    expect(after.frozen.every((entry) => entry.turnsLeft === 1)).toBe(true);
    // Territory land, the Rift and the dock are unchanged.
    expect(after.snow.some((at) => at.x === 4 || key(at) === "2,1")).toBe(
      false,
    );
    expect(iceEntryV7(after, { x: 4, y: 3 })).toBeUndefined();
    expect(terrainAt(after, { x: 2, y: 1 })).toBe("RIFT");
    // The events: one UNITS_FROZEN, then one TILES_FROZEN.
    expect(result.events.map((event) => event.kind)).toEqual([
      "UNITS_FROZEN",
      "TILES_FROZEN",
    ]);
    expect(eventOf(result.events, "UNITS_FROZEN")).toMatchObject({
      source: "COLD_SNAP",
      sourceUnitId: witch.id,
    });
    const tiles = eventOf(result.events, "TILES_FROZEN");
    expect(tiles?.tiles).toEqual([{ x: 2, y: 3 }]);
    expect(tiles?.snow).toEqual([
      { x: 3, y: 1 },
      { x: 2, y: 2 },
    ]);
    // The preview is the result.
    expect(preview).toEqual({
      unitId: witch.id,
      targets: frozenUnits(after).map((unitId) => ({ unitId })),
      tiles: tiles?.tiles,
      snow: tiles?.snow,
    });
    // The Witch used her action.
    expect(navalUnitV7(after, witch.id).activation.specialActed).toBe(true);
  });

  it("is offered only when it changes something, and is refused as NO_TARGET otherwise", () => {
    const state = build();
    const witch = navalUnitAtV7(state, WITCH);
    const once = acceptV7(state, 0, {
      kind: "COLD_SNAP",
      unitId: witch.id,
    }).state;
    // Everything around her is frozen now; give her a fresh action.
    const fresh = parseGameStateV7({
      ...once,
      units: once.units.map((unit) =>
        unit.id === witch.id
          ? {
              ...unit,
              activation: { ...unit.activation, specialActed: false },
            }
          : unit,
      ),
    }) as GameStateV7;
    expect(
      commandsOf(fresh).some((command) => command.kind === "COLD_SNAP"),
    ).toBe(false);
    expect(rejectV7(fresh, 0, { kind: "COLD_SNAP", unitId: witch.id })).toEqual(
      { code: "COLD_SNAP_NOT_LEGAL", params: { reason: "NO_TARGET" } },
    );
  });

  it("still Freezes enemies and lays Snow without Rime, but makes no ice", () => {
    const state = arena({
      technologies: [["SCOUTING"], ALL],
      terrain: RIFT_TERRAIN,
      units: [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 3 } },
      ],
    });
    const witch = navalUnitAtV7(state, WITCH);
    const after = acceptV7(state, 0, {
      kind: "COLD_SNAP",
      unitId: witch.id,
    }).state;
    expect(after.ice).toEqual([]);
    expect(keys(after.snow)).toEqual(
      keys([
        { x: 3, y: 1 },
        { x: 2, y: 2 },
      ]),
    );
    expect(frozenUnits(after)).toEqual([
      navalUnitAtV7(state, { x: 3, y: 3 }).id,
    ]);
  });
});

describe("the Frost Giant's Cold Wake (section 3.3)", () => {
  // The user's design change (2026-11-08): "we can have the special giant
  // unit freeze everything around it whenever it moves"; the Walrus keeps
  // its Frostbite and has no Cold Wake. The Giant walks on its ice from
  // (8, 6) to (7, 6): its ring is (6..8, 5..7). (6, 7) is the Human Port
  // with a Human boat on it, (7, 7) and (8, 7) open Shallow Water, the rest
  // open Deep Water (Pack Ice) but its own ice on (8, 6).
  const build = () =>
    arena({
      units: [
        { seat: 0, role: "JUGGERNAUT", at: { x: 8, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 7 } },
      ],
      ice: [{ at: { x: 8, y: 6 } }, { at: { x: 7, y: 6 } }],
    });

  it("freezes every tile around the tile it moves to: ice, and the ship on a dock Frozen on its water", () => {
    const state = build();
    const giant = navalUnitAtV7(state, { x: 8, y: 6 });
    const boat = navalUnitAtV7(state, { x: 6, y: 7 });
    const to: CoordV7 = { x: 7, y: 6 };
    const preview = previewColdWakeV7(viewOf(state), giant.id, to);
    const result = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: giant.id,
      path: [to],
    });
    const after = result.state;
    const made = [
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 6, y: 6 },
      { x: 7, y: 7 },
      { x: 8, y: 7 },
    ];
    for (const at of made)
      expect(iceEntryV7(after, at)?.ownerId).toBe(seatV7(after, 0).id);
    // The dock never freezes; the ship on it is Frozen on its water.
    expect(iceEntryV7(after, { x: 6, y: 7 })).toBeUndefined();
    expect(tileAtV7(after.board, { x: 6, y: 7 })?.improvement).toBe("PORT");
    expect(after.frozen).toEqual([{ unitId: boat.id, turnsLeft: 1 }]);
    expect(eventOf(result.events, "UNITS_FROZEN")).toMatchObject({
      source: "COLD_WAKE",
      sourceUnitId: giant.id,
    });
    const tiles = eventOf(result.events, "TILES_FROZEN");
    expect(keys(tiles?.tiles ?? [])).toEqual(keys(made));
    // The Move's preview is the result (nothing new was revealed).
    expect(preview).toEqual({
      unitId: giant.id,
      at: to,
      targets: [boat.id],
      tiles: tiles?.tiles,
      snow: [],
    });
  });

  it("lays Snow on open neutral land and leaves territory land as it is", () => {
    const state = arena({
      units: [
        { seat: 0, role: "JUGGERNAUT", at: { x: 8, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 0 } },
      ],
    });
    const giant = navalUnitAtV7(state, { x: 8, y: 1 });
    const fighter = navalUnitAtV7(state, { x: 8, y: 0 });
    // To (7, 1): the ring (6..8, 0..2); (6, 1) and (6, 2) are its capital's.
    const after = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: giant.id,
      path: [{ x: 7, y: 1 }],
    }).state;
    expect(keys(after.snow)).toEqual(
      keys([
        { x: 6, y: 0 },
        { x: 7, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 1 },
        { x: 7, y: 2 },
        { x: 8, y: 2 },
      ]),
    );
    expect(frozenUnits(after)).toEqual([fighter.id]);
  });

  it("is the Frost Giant's alone (its Cold Aura's place): a Walrus's or a Yeti's Move freezes nothing", () => {
    const wakers = UNIT_ROLE_IDS_V7.filter((role) =>
      effectiveRoleRuleV7(role, "ICE_FOLK").abilities.includes("COLD_WAKE"),
    );
    expect(wakers).toEqual(["JUGGERNAUT"]);
    for (const role of ["GUARD", "FIGHTER"] as const) {
      const state = arena({
        units: [
          { seat: 0, role, at: { x: 8, y: 1 } },
          { seat: 1, role: "FIGHTER", at: { x: 8, y: 0 } },
        ],
      });
      const mover = navalUnitAtV7(state, { x: 8, y: 1 });
      expect(previewColdWakeV7(viewOf(state), mover.id, { x: 7, y: 1 })).toBe(
        null,
      );
      const result = acceptV7(state, 0, {
        kind: "MOVE",
        unitId: mover.id,
        path: [{ x: 7, y: 1 }],
      });
      expect(result.state.snow, role).toEqual([]);
      expect(result.state.frozen, role).toEqual([]);
    }
  });
});

describe("Snow, ice and the thaw (section 3.2)", () => {
  it("melts stored Snow when a Land Grant makes its tile territory", () => {
    const state = arena({
      levelThree: [true, false],
      // A Land Grant needs Planning.
      technologies: [[...ALL, "GATHERING", "ADMINISTRATION", "PLANNING"], ALL],
      units: [{ seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } }],
    });
    const witch = navalUnitAtV7(state, { x: 2, y: 2 });
    const snowed = acceptV7(state, 0, {
      kind: "COLD_SNAP",
      unitId: witch.id,
    }).state;
    expect(keys(snowed.snow)).toEqual(
      keys([
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 1, y: 2 },
        { x: 3, y: 2 },
      ]),
    );
    const capital = snowed.cities.find(
      (city) => city.ownerId === seatV7(snowed, 0).id,
    );
    const granted = acceptV7(snowed, 0, {
      kind: "LAND_GRANT",
      cityId: capital?.id as GameStateV7["cities"][number]["id"],
    }).state;
    // The grant's 5 x 5 takes (3, 1) and (3, 2): their Snow melts (they
    // are Snow still, as the Ice Folk's own territory).
    expect(keys(granted.snow)).toEqual(
      keys([
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ]),
    );
    expect(parseGameStateV7({ ...snowed, snow: [{ x: 5, y: 1 }] })).toBe(null);
  });

  it("Freezes for one turn: Frozen through the owner's next turn, thawed after it", () => {
    const state = arena({
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 3, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 2 } },
      ],
    });
    const witch = navalUnitAtV7(state, { x: 3, y: 2 });
    const fighter = navalUnitAtV7(state, { x: 2, y: 2 });
    const cast = acceptV7(state, 0, { kind: "COLD_SNAP", unitId: witch.id });
    expect(cast.state.frozen).toEqual([{ unitId: fighter.id, turnsLeft: 1 }]);
    const theirs = acceptV7(cast.state, 0, { kind: "END_TURN" }).state;
    expect(theirs.frozen).toEqual([{ unitId: fighter.id, turnsLeft: 1 }]);
    expect(
      rejectV7(theirs, 1, {
        kind: "MOVE",
        unitId: fighter.id,
        path: [{ x: 1, y: 2 }],
      }),
    ).toEqual({ code: "UNIT_FROZEN", params: { unitId: fighter.id } });
    const thawed = acceptV7(theirs, 1, { kind: "END_TURN" }).state;
    expect(thawed.frozen).toEqual([]);
  });
});

describe("the retired freezes", () => {
  it("never offers or accepts FREEZE, FROST_BOLT or THROW_BOLAS", () => {
    const state = arena({
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 0, role: "RAIDER", at: { x: 8, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 0 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
      ],
    });
    const kinds = new Set(commandsOf(state).map((command) => command.kind));
    for (const kind of ["FREEZE", "FROST_BOLT", "THROW_BOLAS"])
      expect(kinds.has(kind as CommandV7["kind"])).toBe(false);
    const witch = navalUnitAtV7(state, { x: 2, y: 2 });
    const sled = navalUnitAtV7(state, { x: 8, y: 2 });
    const target = navalUnitAtV7(state, { x: 8, y: 0 });
    for (const command of [
      { kind: "FREEZE", unitId: witch.id, at: { x: 2, y: 3 } },
      { kind: "FROST_BOLT", unitId: witch.id, targetUnitId: target.id },
      { kind: "THROW_BOLAS", unitId: sled.id, targetUnitId: target.id },
    ])
      expect(rejectV7(state, 0, command as unknown as CommandV7).code).toBe(
        "INVALID_COMMAND",
      );
    // No role of the Ice Folk keeps a retired ability.
    for (const role of UNIT_ROLE_IDS_V7)
      for (const ability of ["FREEZE", "FROST_BOLT", "BOLAS", "COLD_AURA"])
        expect(
          (
            effectiveRoleRuleV7(role, "ICE_FOLK").abilities as readonly string[]
          ).includes(ability),
        ).toBe(false);
  });

  it("keeps the Walrus's Frostbite: a unit that strikes it from the next tile and survives loses its next turn", () => {
    // The user's design change (2026-11-08): "walrus freezing units that
    // hit it is fine". Frozen during its own turn, the attacker's entry has
    // two of its End Turns left, so it stays Frozen through the Ice Folk
    // turn and its own next turn (the one-turn rule: it thaws at the end of
    // its owner's next turn).
    const state = arena({
      units: [
        { seat: 0, role: "GUARD", at: { x: 8, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 0 } },
      ],
    });
    expect(effectiveRoleRuleV7("GUARD", "ICE_FOLK").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
    ]);
    const walrus = navalUnitAtV7(state, { x: 8, y: 1 });
    const fighter = navalUnitAtV7(state, { x: 8, y: 0 });
    const theirs = acceptV7(state, 0, { kind: "END_TURN" }).state;
    const preview = queryCombatPreviewV7(
      viewOf(theirs, 1),
      fighter.id,
      walrus.id,
    );
    expect(preview?.frostbiteApplied).toBe(true);
    const result = acceptV7(theirs, 1, {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: walrus.id,
    });
    expect(eventOf(result.events, "UNITS_FROZEN")).toMatchObject({
      source: "FROSTBITE",
      sourceUnitId: walrus.id,
      results: [{ unitId: fighter.id, turnsLeft: 2 }],
    });
    const iceTurn = acceptV7(result.state, 1, { kind: "END_TURN" }).state;
    expect(iceTurn.frozen).toEqual([{ unitId: fighter.id, turnsLeft: 1 }]);
    const ownTurn = acceptV7(iceTurn, 0, { kind: "END_TURN" }).state;
    expect(
      rejectV7(ownTurn, 1, {
        kind: "MOVE",
        unitId: fighter.id,
        path: [{ x: 9, y: 0 }],
      }),
    ).toEqual({ code: "UNIT_FROZEN", params: { unitId: fighter.id } });
    expect(acceptV7(ownTurn, 1, { kind: "END_TURN" }).state.frozen).toEqual([]);
  });

  it("gives the Sled 12 HP and the Raider's Escape after an attack", () => {
    expect(effectiveRoleRuleV7("RAIDER", "ICE_FOLK")).toMatchObject({
      maxHp: 12,
      abilities: ["ATTACK", "CAPTURE", "CHARGE", "ESCAPE"],
    });
    const state = arena({
      units: [
        { seat: 0, role: "RAIDER", at: { x: 8, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 0 } },
      ],
    });
    const sled = navalUnitAtV7(state, { x: 8, y: 1 });
    const fighter = navalUnitAtV7(state, { x: 8, y: 0 });
    expect(
      queryCombatPreviewV7(viewOf(state), sled.id, fighter.id)?.escapeAvailable,
    ).toBe(true);
    const struck = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: sled.id,
      targetUnitId: fighter.id,
    }).state;
    const moves = commandsOf(struck).filter(
      (command) => command.kind === "MOVE" && command.unitId === sled.id,
    );
    expect(moves.length).toBeGreaterThan(0);
    const escaped = applyCommandV7(
      struck,
      seatV7(struck, 0).id,
      moves[0] as CommandV7,
    );
    expect(escaped.accepted).toBe(true);
  });
});

describe("the Normal AI builds a crossing with Cold Snaps", () => {
  it("sends the Ice Witch to the head, where her Cold Snap freezes the first crossing tile", () => {
    // The plan's crossing is the column on x = 3 from the head (3, 2) to
    // the Human shore; the Witch (the near builder) waits beside the head.
    // A Walrus is no builder any more (no Cold Wake).
    const state = arena({
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 0, role: "GUARD", at: { x: 1, y: 2 } },
      ],
    });
    const witch = navalUnitAtV7(state, { x: 2, y: 2 });
    let current = state;
    const played: CommandV7[] = [];
    // The Witch's best candidate each time (the seat's other business, its
    // research and rewards, is left out).
    for (let step = 0; step < 3; step += 1) {
      const chosen = chooseNormalCommandV7(viewOf(current)).candidates.find(
        (item) =>
          item.score.priority >= 0 &&
          "unitId" in item.command &&
          item.command.unitId === witch.id,
      )?.command;
      if (chosen === undefined) break;
      played.push(chosen);
      current = acceptV7(current, 0, chosen).state;
      if (iceEntryV7(current, { x: 3, y: 3 }) !== undefined) break;
    }
    expect(
      iceEntryV7(current, { x: 3, y: 3 })?.ownerId,
      JSON.stringify(played),
    ).toBe(seatV7(current, 0).id);
    expect(navalUnitV7(current, witch.id).activation.specialActed).toBe(true);
  });
});

describe("the glossary", () => {
  it("says the doc's lines and carries at most one number in every entry", () => {
    expect(glossaryEntryV7("FREEZE").text).toBe(
      "Freezing a tile turns water to ice and open land to Snow; an enemy on it is Frozen for a turn.",
    );
    expect(glossaryEntryV7("COLD_WAKE").text).toBe(
      "After each Move, it freezes every tile around it.",
    );
    expect(glossaryEntryV7("COLD_SNAP").text).toBe(
      "Freezes every tile around the Witch.",
    );
    expect(glossaryEntryV7("FROST_BREATH").text).toBe(
      "Its attack leaves the target Frozen.",
    );
    expect(glossaryEntryV7("BLIZZARD").text).toBe(
      "Ranged hits on your units next to her are halved.",
    );
    const ids = UNIT_GLOSSARY_V7.map((entry) => entry.id as string);
    for (const retired of ["FROST_BOLT", "COLD_AURA"])
      expect(ids).not.toContain(retired);
    // The Walrus keeps its Frostbite (the user's design change).
    expect(ids).toContain("FROSTBITE");
    for (const entry of UNIT_GLOSSARY_V7)
      expect((entry.text.match(/\d+/g) ?? []).length).toBeLessThanOrEqual(1);
  });
});

describe("the identity (pulp_wars-xv0t)", () => {
  it("was 7r133 after 7r132, whose save key is obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r135");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r135.current");
    expect(PRIOR_RULESET_7_IDS.at(-3)).toBe("pulp-wars-poc-7r132");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-3)).toBe(
      "pulpWars.save.v7r132.current",
    );
  });
});
