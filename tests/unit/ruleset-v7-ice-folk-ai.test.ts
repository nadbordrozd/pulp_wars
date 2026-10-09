import { describe, expect, it } from "vitest";
import {
  BOLAS_SHATTER_PRIORITY_V7,
  COLD_SNAP_PRIORITY_V7,
  ICE_OBJECTIVE_SCALE_V7,
  ICE_SIGNATURE_RESEARCH_PRIORITY_V7,
  SHATTER_ESCAPE_PRIORITY_V7,
  SHATTER_SETUP_PRIORITY_V7,
  SNOW_HUNTER_CHIP_OFFSET_V7,
  WITCH_ESCORT_OBJECTIVE_V7,
  WITCH_KILL_PRIORITY_V7,
  WITCH_MOVE_PRIORITY_V7,
  iceFolkArmyCountsV7,
  iceFolkFactsV7,
  iceFolkMatchForPolicyV7,
  iceFolkProductionAdjustmentV7,
  iceFolkResearchV7,
  shatterableNextTurnV7,
} from "../../src/ai/v7-ice-folk";
import { publicThreatenedTilesForPolicyV7 } from "../../src/ai/v7";
import {
  queryCombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  attackV7,
  candidatesV7,
  publicUnitAtV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { iceFieldV7, type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { fieldV7, mountainV7 } from "../fixtures/v7-revision20";

// The Ice Folk Normal AI (`pulp_wars-7g3.4`,
// docs/product/RULESET_7_ICE_FOLK.md section 12). Two-seat 11 x 11 field:
// seat 0 is the viewer (capital (8, 8)), seat 1 the opponent (capital
// (2, 8)); villages (5, 5), (8, 5), (5, 8); every other land tile is Grass.
// Every seat has every technology unless stated (Brittle: threshold 4).

const own = (
  role: IcePieceV7["role"],
  x: number,
  y: number,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 0, role, at: { x, y }, ...extra });
const foe = (
  role: IcePieceV7["role"],
  x: number,
  y: number,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 1, role, at: { x, y }, ...extra });

/** Seat 0 Ice Folk (the viewer) against seat 1 Human. */
const asIce = (
  pieces: readonly IcePieceV7[],
  techs?: Readonly<Record<number, readonly string[]>>,
): GameStateV7 =>
  iceFieldV7(pieces, {
    factions: ["ICE_FOLK", "ORIGINAL"],
    ...(techs === undefined ? {} : { techs: techs as never }),
  });
/** Seat 0 Human (the viewer) against seat 1 Ice Folk. */
const againstIce = (
  pieces: readonly IcePieceV7[],
  techs?: Readonly<Record<number, readonly string[]>>,
): GameStateV7 =>
  iceFieldV7(pieces, {
    factions: ["ORIGINAL", "ICE_FOLK"],
    ...(techs === undefined ? {} : { techs: techs as never }),
  });

const at = (x: number, y: number): CoordV7 => ({ x, y });
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const preview = (state: GameStateV7, from: CoordV7, to: CoordV7) =>
  queryCombatPreviewV7(
    viewerViewV7(state),
    unitIdAtV7(state, from),
    unitIdAtV7(state, to),
  );

describe("Ice Folk Normal AI: the gate", () => {
  it("is off in a match without an Ice Folk seat", () => {
    const human = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DINOSAUR"] },
    );
    expect(iceFolkMatchForPolicyV7(viewerViewV7(human))).toBe(false);
    expect(
      iceFolkMatchForPolicyV7(
        viewerViewV7(asIce([own("FIGHTER", 5, 3), foe("FIGHTER", 1, 1)])),
      ),
    ).toBe(true);
  });
});

describe("Ice Folk Normal AI: the Witch", () => {
  it("casts Cold Snap first, from among her escort", () => {
    // Ice Folk Freeze (`pulp_wars-w49.37`): Cold Snap reaches the units next
    // to her (the Fighter stood 2 away before).
    const state = asIce([
      own("CAPTAIN", 6, 2),
      own("FIGHTER", 5, 2),
      own("FIGHTER", 7, 2),
      foe("FIGHTER", 6, 1),
    ]);
    // (Her Move, rule 2, still ranks first and steps her off the adjacent
    // enemy: an AI follow-up of Ice Folk Freeze; the Cold Snap keeps its
    // tier.)
    const snap = unitCandidatesV7(state, at(6, 2), "COLD_SNAP");
    expect(snap[0]?.command.kind).toBe("COLD_SNAP");
    expect(snap[0]?.score.priority).toBe(COLD_SNAP_PRIORITY_V7);
    // Above every attack of the turn.
    for (const candidate of candidatesV7(state))
      if (candidate.command.kind === "ATTACK")
        expect(candidate.score.priority).toBeLessThan(COLD_SNAP_PRIORITY_V7);
  });

  it("steps to the tile with the most own units around it", () => {
    const state = asIce([
      own("CAPTAIN", 5, 2),
      own("FIGHTER", 3, 3),
      own("FIGHTER", 4, 4),
      foe("FIGHTER", 1, 0),
    ]);
    const best = unitCandidatesV7(state, at(5, 2))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(WITCH_MOVE_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end).toBeDefined();
    if (end === undefined) return;
    expect(chebyshev(end, at(3, 3))).toBeLessThanOrEqual(1);
    expect(chebyshev(end, at(4, 4))).toBeLessThanOrEqual(1);
    // Every other Move of hers is not a candidate.
    expect(unitCandidatesV7(state, at(5, 2), "MOVE")).toHaveLength(1);
  });

  it("units end their Move next to her at equal route progress", () => {
    // The Yeti walks to the village (5, 5); the Witch stands beside it.
    const state = asIce([
      own("CAPTAIN", 4, 4),
      own("FIGHTER", 6, 4),
      foe("FIGHTER", 1, 0),
    ]);
    const escorted = unitCandidatesV7(state, at(6, 4), "MOVE").filter(
      (candidate) => {
        const end = endOf(candidate.command);
        return end !== undefined && chebyshev(end, at(4, 4)) <= 1;
      },
    );
    expect(escorted.length).toBeGreaterThan(0);
    for (const candidate of escorted) {
      expect(Number.isSafeInteger(candidate.score.objectiveValue)).toBe(true);
      expect(
        candidate.score.objectiveValue -
          ICE_OBJECTIVE_SCALE_V7 *
            Math.floor(candidate.score.objectiveValue / ICE_OBJECTIVE_SCALE_V7),
      ).toBeGreaterThanOrEqual(WITCH_ESCORT_OBJECTIVE_V7);
    }
  });
});

describe("Ice Folk Normal AI: Chill, then Shatter", () => {
  it("throws the Bolas on the unit a Yeti then shatters", () => {
    const pieces = [
      own("RAIDER", 6, 2),
      own("FIGHTER", 5, 0),
      foe("FIGHTER", 6, 0, { hp: 7 }),
    ];
    const state = asIce(pieces);
    // Unchilled, the Yeti's hit does not kill; chilled, it shatters.
    expect(preview(state, at(5, 0), at(6, 0))?.defenderDies).toBe(false);
    const chilled = asIce([
      pieces[0] as IcePieceV7,
      pieces[1] as IcePieceV7,
      foe("FIGHTER", 6, 0, { hp: 7, frozen: { turnsLeft: 1 } }),
    ]);
    expect(preview(chilled, at(5, 0), at(6, 0))?.shatters).toBe(true);
    const sled = unitCandidatesV7(state, at(6, 2));
    expect(sled[0]?.command).toEqual({
      kind: "THROW_BOLAS",
      unitId: unitIdAtV7(state, at(6, 2)),
      targetUnitId: unitIdAtV7(state, at(6, 0)),
    });
    expect(sled[0]?.score.priority).toBe(BOLAS_SHATTER_PRIORITY_V7);
  });

  it("does not throw at a unit the Witch's Cold Snap covers this turn", () => {
    // Ice Folk Freeze: the Fighter is next to the Witch (Cold Snap range 1).
    const state = asIce([
      own("RAIDER", 6, 3),
      own("CAPTAIN", 7, 2),
      own("FIGHTER", 5, 0),
      foe("FIGHTER", 6, 1, { hp: 7 }),
    ]);
    expect(
      unitCandidatesV7(state, at(6, 3), "THROW_BOLAS").map(
        (candidate) => candidate.command,
      ),
    ).toEqual([]);
  });

  it("chips a Chilled unit into the window before the blow that shatters it", () => {
    // A Snow Hunter's shot (Cold Blood) leaves the Chilled Fighter at 10 HP
    // at the threshold (3 HP); the adjacent Yeti, whose hit alone leaves 5,
    // then shatters it.
    const state = asIce([
      own("MARKSMAN", 6, 2),
      own("FIGHTER", 5, 0),
      foe("FIGHTER", 6, 0, {
        hp: 10,
        frozen: { turnsLeft: 1 },
      }),
    ]);
    const shot = preview(state, at(6, 2), at(6, 0));
    expect(shot?.defenderDies).toBe(false);
    expect(preview(state, at(5, 0), at(6, 0))?.defenderDies).toBe(false);
    const hunter = unitCandidatesV7(state, at(6, 2), "ATTACK")[0];
    expect(hunter?.command).toEqual(attackV7(state, at(6, 2), at(6, 0)));
    expect(hunter?.score.priority).toBe(SHATTER_SETUP_PRIORITY_V7);
    const yeti = unitCandidatesV7(state, at(5, 0), "ATTACK")[0];
    expect(yeti?.score.priority ?? 0).toBeLessThan(SHATTER_SETUP_PRIORITY_V7);
  });

  it("orders the chips: Snow Hunters before the other units", () => {
    const pieces = [
      own("MARKSMAN", 6, 2),
      own("FIGHTER", 5, 0),
      foe("GUARD", 6, 0),
    ];
    // The older policy (a match with a Candy seat; a Dwarf seat before
    // step two of the Dwarf pass, `pulp_wars-w49.28`): the chip offset.
    const older = iceFieldV7(pieces, { factions: ["ICE_FOLK", "CANDY"] });
    expect(unitCandidatesV7(older, at(6, 2), "ATTACK")[0]?.score.priority).toBe(
      900 + SNOW_HUNTER_CHIP_OFFSET_V7,
    );
    // Both policies (step two of the Ice Folk pass, `pulp_wars-w49.27`: an
    // Ice Folk seat plays the army rules against a Human seat, and the
    // shot from two tiles still comes before the adjacent blow).
    for (const state of [older, asIce(pieces)]) {
      const hunter = unitCandidatesV7(state, at(6, 2), "ATTACK")[0];
      const yeti = unitCandidatesV7(state, at(5, 0), "ATTACK")[0];
      expect(hunter?.command).toEqual(attackV7(state, at(6, 2), at(6, 0)));
      expect(yeti?.score.priority ?? 0).toBeLessThan(
        hunter?.score.priority ?? 0,
      );
    }
  });

  it("swings the Mammoth at the target with two flank units", () => {
    const state = asIce([
      own("SWORDSMAN", 6, 2),
      foe("FIGHTER", 5, 1),
      foe("FIGHTER", 6, 1),
      foe("FIGHTER", 7, 1),
    ]);
    const swing = unitCandidatesV7(state, at(6, 2), "ATTACK")[0];
    expect(swing?.command).toEqual(attackV7(state, at(6, 2), at(6, 1)));
    expect(preview(state, at(6, 2), at(6, 1))?.splash).toHaveLength(2);
  });

  it("throws the Boulder Yeti planted instead of moving", () => {
    const pieces = [own("CATAPULT", 6, 3), foe("FIGHTER", 6, 1)];
    // The older policy (a match with a Candy seat; a Dwarf seat before
    // step two of the Dwarf pass, `pulp_wars-w49.28`) offers it no Move.
    const older = iceFieldV7(pieces, { factions: ["ICE_FOLK", "CANDY"] });
    expect(unitCandidatesV7(older, at(6, 3), "MOVE")).toEqual([]);
    // Both policies throw before anything else (the army rules, step two
    // of the Ice Folk pass, `pulp_wars-w49.27`, rank the planted throw
    // above every Move of the Boulder Yeti).
    for (const state of [older, asIce(pieces)]) {
      const best = unitCandidatesV7(state, at(6, 3))[0];
      expect(best?.command).toEqual(attackV7(state, at(6, 3), at(6, 1)));
      expect(preview(state, at(6, 3), at(6, 1))?.plantedApplied).toBe(true);
    }
  });
});

describe("Ice Folk Normal AI: production and research", () => {
  it("trains bodies, not a Sled or a Witch, in a threatened city", () => {
    const view = viewerViewV7(
      asIce([
        own("FIGHTER", 5, 3),
        own("FIGHTER", 4, 3),
        own("FIGHTER", 3, 3),
        foe("FIGHTER", 1, 1),
      ]),
    );
    const counts = iceFolkArmyCountsV7(view);
    const value = (
      role: "FIGHTER" | "RAIDER" | "CAPTAIN",
      threatened: boolean,
    ) =>
      iceFolkProductionAdjustmentV7(
        view,
        role,
        counts,
        threatened,
        true,
        false,
      );
    expect(value("FIGHTER", true)).toBeGreaterThan(value("FIGHTER", false));
    expect(value("RAIDER", true)).toBeLessThan(0);
    expect(value("CAPTAIN", true)).toBeLessThan(0);
    // At war with three front units, the first Witch is wanted.
    expect(value("CAPTAIN", false)).toBeGreaterThan(0);
  });

  it("researches the Witch and the Snow Hunter with two cities", () => {
    const view = viewerViewV7(
      asIce([own("FIGHTER", 5, 3), foe("FIGHTER", 1, 1)], {
        // (The Industry reshuffle, 7r56: and Deep Winter, the Musk Ox's.)
        0: ["SCOUTING", "RAIDING", "DRILL", "FORTIFICATION"],
      }),
    );
    const plan = iceFolkResearchV7(view, 2, 3, false);
    expect(plan?.priority).toBe(ICE_SIGNATURE_RESEARCH_PRIORITY_V7);
    expect([
      "ADMINISTRATION",
      "MARKSMANSHIP",
      "GATHERING",
      "HUNTING",
    ]).toContain(plan?.tech);
    // One city: not yet.
    expect(iceFolkResearchV7(view, 1, 3, false)).toBeNull();
  });
});

describe("Ice Folk Normal AI: against the Ice Folk", () => {
  it("kills the Witch first", () => {
    const state = againstIce([
      own("KNIGHT", 5, 4),
      own("FIGHTER", 7, 4),
      foe("CAPTAIN", 5, 3, { hp: 2 }),
      foe("FIGHTER", 6, 3, { hp: 2 }),
    ]);
    const best = candidatesV7(state).find(
      (candidate) => candidate.command.kind === "ATTACK",
    );
    expect(best?.score.priority).toBe(WITCH_KILL_PRIORITY_V7);
    expect(
      best?.command.kind === "ATTACK" ? best.command.targetUnitId : null,
    ).toBe(unitIdAtV7(state, at(5, 3)));
  });

  it("pulls a unit at 7 HP that a Sled could freeze out of a Yeti's Shatter reach", () => {
    // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen unit cannot move, so the
    // escape is for a unit that a visible Sled could freeze before the Yeti
    // strikes (the Sled four tiles away: within its freeze reach, out of its
    // attack reach).
    const state = againstIce([
      own("FIGHTER", 5, 4, { hp: 7 }),
      foe("FIGHTER", 5, 2),
      foe("RAIDER", 9, 4),
    ]);
    const best = unitCandidatesV7(state, at(5, 4))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBeGreaterThanOrEqual(
      SHATTER_ESCAPE_PRIORITY_V7,
    );
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end === undefined ? 0 : chebyshev(end, at(5, 2))).toBeGreaterThan(2);
  });

  it("counts a unit as shatterable next turn when a source can freeze it or it stays Frozen", () => {
    const shatterable = (pieces: readonly IcePieceV7[]): boolean => {
      const state = againstIce(pieces);
      const view = viewerViewV7(state);
      const facts = iceFolkFactsV7(
        view,
        (ownerId) => ownerId !== view.viewer.id,
      );
      return shatterableNextTurnV7(
        view,
        facts,
        publicUnitAtV7(state, at(5, 4)),
        at(5, 4),
      );
    };
    const yeti = foe("FIGHTER", 5, 2);
    expect(shatterable([own("FIGHTER", 5, 4), yeti])).toBe(false);
    expect(shatterable([own("FIGHTER", 5, 4), yeti, foe("RAIDER", 9, 4)])).toBe(
      true,
    );
    // A Frozen Sled freezes nothing.
    expect(
      shatterable([
        own("FIGHTER", 5, 4),
        yeti,
        foe("RAIDER", 9, 4, { frozen: { turnsLeft: 1 } }),
      ]),
    ).toBe(false);
    // Frozen during its own turn (Frostbite): still Frozen on the Ice Folk
    // turn; frozen on the Ice Folk turn: thawed by then.
    expect(
      shatterable([own("FIGHTER", 5, 4, { frozen: { turnsLeft: 2 } }), yeti]),
    ).toBe(true);
    expect(
      shatterable([own("FIGHTER", 5, 4, { frozen: { turnsLeft: 1 } }), yeti]),
    ).toBe(false);
  });

  it("offers a Frozen unit no Move and no attack (Ice Folk Freeze, `pulp_wars-w49.37`)", () => {
    const state = againstIce([
      own("RAIDER", 5, 3, { hp: 7, frozen: { turnsLeft: 1 } }),
      foe("FIGHTER", 5, 2),
    ]);
    expect(unitCandidatesV7(state, at(5, 3), "MOVE")).toEqual([]);
    expect(unitCandidatesV7(state, at(5, 3), "ATTACK")).toEqual([]);
  });

  it("counts a Yeti's Glide on its own Snow in its reach", () => {
    const state = againstIce([own("FIGHTER", 8, 2), foe("FIGHTER", 2, 7)]);
    const view = viewerViewV7(state);
    const tiles = publicThreatenedTilesForPolicyV7(
      view,
      publicUnitAtV7(state, at(2, 7)),
    );
    // Two steps off Snow, then range 1: three tiles away.
    expect(tiles.some((tile) => chebyshev(tile, at(2, 7)) === 3)).toBe(true);
  });

  it("does not read Engineering from a Yeti standing on a Mountain", () => {
    const pieces = [
      own("FIGHTER", 9, 1),
      foe("FIGHTER", 4, 3),
      foe("RAIDER", 6, 3),
    ];
    const state = [at(4, 3), at(5, 2), at(5, 3), at(5, 4)].reduce(
      mountainV7,
      againstIce(pieces, { 1: ["SCOUTING"] }),
    );
    const view = viewerViewV7(state);
    const sled = publicThreatenedTilesForPolicyV7(
      view,
      publicUnitAtV7(state, at(6, 3)),
    );
    // Without Engineering the Sled cannot stand on the ridge, so it cannot
    // reach the tile behind it.
    expect(sled.some((tile) => tile.x === 4 && tile.y === 3)).toBe(false);
  });
});
