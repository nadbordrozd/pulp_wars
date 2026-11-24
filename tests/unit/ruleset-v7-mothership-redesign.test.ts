import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  BEAM_DOWN_KILL_PRIORITY_V7,
  martianProductionAdjustmentV7,
  martianArmyCountsV7,
} from "../../src/ai/v7-martian";
import {
  FORCE_FIELD_SHIELD_V7,
  MOTHERSHIP_BEAM_RANGE_V7,
  MOTHERSHIP_BEAMS_PER_TURN_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  forceFieldHoldsV7,
  parseCommandV7,
  rechargeShieldsAtEndTurnV7,
  rechargeShieldsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import type { BoardRenderPlanEntryV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  addMartianPickEntriesV7,
  martianPickTargetsV7,
} from "../../src/render/canvas/martian-board-plan-v7";
import {
  buildGalleryDemoSceneV7,
  galleryDemoCuesV7,
} from "../../src/render/gallery-demo-v7";
import {
  BEAM_BADGE_V7,
  BEAM_DOWN_LABEL_V7,
  BEAM_DOWN_TOOLTIP_V7,
  MOTHERSHIP_BEAM_TOOLTIP_V7,
  SHIELD_CANOPY_LABEL_V7,
  martianAbilityDescriptionV7,
  martianAbilityNameV7,
  martianCommandLabelV7,
  martianRoleUnlockTextV7,
} from "../../src/render/martian-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  shieldAtV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  unexploreV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Mothership redesign (`pulp_wars-ewpj`, 7r108; the current rules
// section 20.7.1 and 20.3): the Mothership is the Martian army-mover and
// anchor. Its Beam Down (Mass Beam Down until `pulp_wars-eg3k`, 7r146, made
// it sequential) sets one own unit from within two tiles of it down on an
// explored tile within three, up to three times a turn (the beam counts
// are tested in ruleset-v7-mothership-beams-eg3k.test.ts); its Shield
// Canopy covers the units beside it at every recharge. The field (tests/fixtures/v7-martian.ts): 11 x 11, seat 0
// (Martian) capital (8, 8), seat 1 capital (2, 8), villages (5, 5), (8, 5),
// (5, 8), open Grass elsewhere.

const own = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

const beam = (
  state: GameStateV7,
  mothership: CoordV7,
  passenger: CoordV7,
  to: CoordV7,
): Extract<CommandV7, { kind: "BEAM_DOWN" }> => ({
  kind: "BEAM_DOWN",
  unitId: idAt(state, mothership),
  passengerUnitId: idAt(state, passenger),
  to,
});

/** The Mothership at (2, 2) with three Grunts around it. */
const strikeForce = (extra: readonly MartianPieceV7[] = []): GameStateV7 =>
  martianFieldV7([
    own("KNIGHT", 2, 2),
    own("FIGHTER", 1, 1),
    own("FIGHTER", 2, 1),
    own("FIGHTER", 3, 1),
    ...extra,
  ]);

describe("the Mothership's numbers", () => {
  it("is a tough 9-Coin anchor in the Knight's class, with Beam Down and the Shield Canopy", () => {
    const mothership = effectiveRoleRuleV7("KNIGHT", "MARTIAN");
    const knight = effectiveRoleRuleV7("KNIGHT", "ORIGINAL");
    expect(mothership.cost).toBe(9);
    expect(mothership.cost).toBe(knight.cost);
    expect(mothership.maxHp).toBe(20);
    expect(mothership.attack2).toBe(6);
    expect(mothership.defense2).toBe(6);
    expect(mothership.move).toBe(2);
    expect(mothership.sightRadius).toBe(2);
    expect(mothership.technology).toBe("CHIVALRY");
    expect(mothership.abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "FLY",
      "BEAM_DOWN",
      "TRACTOR_BEAM",
      "SHIELD_CANOPY",
    ]);
    // The Saucer beams too, its own way.
    expect(effectiveRoleRuleV7("RAIDER", "MARTIAN").abilities).toContain(
      "BEAM_DOWN",
    );
    expect(roleMechanicsV7("RAIDER", "MARTIAN").mothershipBeam).toBe(false);
    const mechanics = roleMechanicsV7("KNIGHT", "MARTIAN");
    expect(mechanics.shield).toBe(4);
    expect(mechanics.capacitySlots).toBe(2);
    expect(mechanics.heavyTractorBeam).toBe(true);
    expect(mechanics.shieldCanopy).toBe(true);
    expect(mechanics.mothershipBeam).toBe(true);
    // Tougher than the Knight: more HP behind a Shield, a higher Defense,
    // a lower Attack.
    expect(mothership.maxHp + mechanics.shield).toBeGreaterThan(
      knight.maxHp * 1.5,
    );
    expect(mothership.defense2).toBeGreaterThan(knight.defense2);
    expect(mothership.attack2).toBeLessThan(knight.attack2);
    // No other role of any faction has the canopy.
    expect(roleMechanicsV7("GUARD", "MARTIAN").shieldCanopy).toBe(false);
    expect(roleMechanicsV7("KNIGHT", "ORIGINAL").shieldCanopy).toBe(false);
    expect([MOTHERSHIP_BEAM_RANGE_V7, MOTHERSHIP_BEAMS_PER_TURN_V7]).toEqual([
      3, 3,
    ]);
  });
});

describe("the Mothership's Beam Down", () => {
  it("is offered for every passenger within two and every explored tile in reach", () => {
    const state = strikeForce();
    const commands = expectOfferedAcceptedV7(state, "BEAM_DOWN");
    expect(commands.length).toBeGreaterThan(0);
    const mothership = unitAtV7(state, at(2, 2));
    for (const command of commands) {
      if (command.kind !== "BEAM_DOWN") throw new Error("kind");
      expect(command.unitId).toBe(mothership.id);
      expect(
        Math.max(Math.abs(command.to.x - 2), Math.abs(command.to.y - 2)),
      ).toBeLessThanOrEqual(MOTHERSHIP_BEAM_RANGE_V7);
    }
    expect(commands).toContainEqual(beam(state, at(2, 2), at(1, 1), at(2, 5)));
    // Four tiles away is out of reach.
    expect(
      commands.some(
        (command) =>
          command.kind === "BEAM_DOWN" &&
          command.to.x === 2 &&
          command.to.y === 6,
      ),
    ).toBe(false);
  });

  it("leaves the beamed unit able to attack but not to move, once a turn", () => {
    const state = strikeForce([foe("FIGHTER", 2, 7)]);
    const { state: after, events } = playV7(
      state,
      beam(state, at(2, 2), at(1, 1), at(2, 5)),
    );
    expect(events.filter((event) => event.kind === "UNIT_BEAMED")).toHaveLength(
      1,
    );
    const grunt = unitAtV7(after, at(2, 5));
    const target = unitAtV7(after, at(2, 7));
    const offered = offeredV7(after).filter(
      (command) => "unitId" in command && command.unitId === grunt.id,
    );
    expect(offered).toContainEqual({
      kind: "ATTACK",
      unitId: grunt.id,
      targetUnitId: target.id,
    });
    expect(offered.some((command) => command.kind === "MOVE")).toBe(false);
    expect(after.beamedThisTurn).toEqual([grunt.id]);
    // The Mothership stays where it is and has used its action.
    expect(unitAtV7(after, at(2, 2)).activation.specialActed).toBe(true);
  });

  it("rejects an illegal beam with its reason", () => {
    const state = strikeForce([own("FIGHTER", 2, 6)]);
    // Out of reach: four tiles away.
    expect(
      rejectedV7(state, beam(state, at(2, 2), at(1, 1), at(2, 7))),
    ).toEqual({ code: "INVALID_TILE", params: { action: "BEAM_DOWN" } });
    // A passenger beyond the pick-up range (no pick-up from a city).
    expect(
      rejectedV7(state, beam(state, at(2, 2), at(2, 6), at(2, 4))),
    ).toEqual({
      code: "BEAM_DOWN_NOT_LEGAL",
      params: { reason: "NO_PASSENGER" },
    });
    // An unexplored tile.
    const hidden = unexploreV7(state, 0, [at(4, 4)]);
    expect(
      rejectedV7(hidden, beam(hidden, at(2, 2), at(1, 1), at(4, 4))),
    ).toEqual({ code: "INVALID_TILE", params: { action: "BEAM_DOWN" } });
    // An occupied tile.
    const crowded = strikeForce([foe("FIGHTER", 4, 4)]);
    expect(
      rejectedV7(crowded, beam(crowded, at(2, 2), at(1, 1), at(4, 4))),
    ).toEqual({ code: "INVALID_TILE", params: { action: "BEAM_DOWN" } });
    // A Mothership that has used its action.
    const acted = martianFieldV7([
      own("KNIGHT", 2, 2, { activation: { attacked: true, attacksUsed: 1 } }),
      own("FIGHTER", 1, 1),
    ]);
    expect(
      rejectedV7(acted, beam(acted, at(2, 2), at(1, 1), at(2, 4))),
    ).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: idAt(acted, at(2, 2)) },
    });
  });

  it("no longer parses the retired Mass Beam Down", () => {
    expect(
      parseCommandV7({
        kind: "MASS_BEAM_DOWN",
        unitId: 1,
        passengerUnitIds: [2, 3, 4],
        to: { x: 2, y: 4 },
      }).ok,
    ).toBe(false);
    expect(
      parseCommandV7({
        kind: "BEAM_DOWN",
        unitId: 1,
        passengerUnitId: 2,
        to: { x: 2, y: 4 },
      }).ok,
    ).toBe(true);
  });

  it("may carry a unit that has acted, which is only relocated", () => {
    const state = martianFieldV7([
      own("KNIGHT", 2, 2),
      own("FIGHTER", 2, 3, { activation: { attacked: true, attacksUsed: 1 } }),
    ]);
    const result = applyCommandV7(
      state,
      activeIdV7(state),
      beam(state, at(2, 2), at(2, 3), at(2, 5)),
    );
    expect(result.accepted).toBe(true);
  });
});

describe("the Shield Canopy", () => {
  const noForceFields = {
    techs: { 0: withoutTechsV7("MARTIAN", "FORTIFICATION") },
  };

  it("recharges the units beside a Mothership to 4 at End Turn, without Force Fields", () => {
    const state = martianFieldV7(
      [
        own("KNIGHT", 4, 4),
        own("FIGHTER", 5, 4, { shield: 0 }),
        own("FIGHTER", 7, 4, { shield: 0 }),
      ],
      noForceFields,
    );
    const { state: after, events } = rechargeShieldsAtEndTurnV7(
      state,
      activeIdV7(state),
    );
    expect(shieldAtV7(after, at(5, 4))).toBe(FORCE_FIELD_SHIELD_V7);
    // A unit away from the canopy keeps its spent Shield.
    expect(shieldAtV7(after, at(7, 4))).toBe(0);
    expect(events).toEqual([
      {
        kind: "SHIELDS_RECHARGED",
        playerId: activeIdV7(state),
        results: [{ unitId: idAt(state, at(5, 4)), shield: 4 }],
      },
    ]);
    // The End Turn command runs it.
    const ended = applyCommandV7(state, activeIdV7(state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(shieldAtV7(ended.state, at(5, 4))).toBe(FORCE_FIELD_SHIELD_V7);
    expect(shieldAtV7(ended.state, at(7, 4))).toBe(0);
  });

  it("covers like a Force Field at the Start Turn recharge, and the field holds", () => {
    const state = martianFieldV7(
      [
        own("KNIGHT", 4, 4),
        own("FIGHTER", 4, 5, { shield: 1 }),
        own("SWORDSMAN", 3, 3, { shield: 0 }),
        own("FIGHTER", 1, 1, { shield: 0 }),
      ],
      noForceFields,
    );
    const { state: after } = rechargeShieldsV7(state, activeIdV7(state));
    expect(shieldAtV7(after, at(4, 5))).toBe(4);
    expect(shieldAtV7(after, at(3, 3))).toBe(4);
    expect(shieldAtV7(after, at(1, 1))).toBe(2);
    // The Mothership's own Shield is its maximum, 4: no field of its own.
    expect(shieldAtV7(after, at(4, 4))).toBe(4);
    const grunt = unitAtV7(after, at(4, 5));
    expect(forceFieldHoldsV7(after, grunt, 4)).toBe(true);
    const mothership = unitAtV7(after, at(4, 4));
    expect(forceFieldHoldsV7(after, mothership, 4)).toBe(false);
  });

  it("is shown on the unit's public stats", () => {
    const state = martianFieldV7([own("KNIGHT", 4, 4), own("GUARD", 6, 6)]);
    const view = viewForV7(state, activeIdV7(state));
    const stats = (where: CoordV7) =>
      view.unitStats.find((entry) => entry.unitId === idAt(state, where))
        ?.martian;
    expect(stats(at(4, 4))?.shieldCanopy).toBe(true);
    expect(stats(at(6, 6))?.shieldCanopy).toBe(false);
  });
});

describe("the Normal AI's Mothership", () => {
  it("beams a Grunt down onto a weak enemy out of their walking reach", () => {
    // A wounded Fighter five tiles from the Grunts: none can reach it on
    // foot, but beamed beside it a Grunt shoots it on arrival.
    const state = strikeForce([foe("FIGHTER", 2, 6, { hp: 2 })]);
    const decision = chooseNormalCommandV7(activeViewV7(state));
    const units = new Set(
      [at(2, 2), at(1, 1), at(2, 1), at(3, 1)].map((where) =>
        idAt(state, where),
      ),
    );
    // The best command of the Mothership and its Grunts.
    const best = decision.candidates.find(
      (candidate) =>
        "unitId" in candidate.command && units.has(candidate.command.unitId),
    );
    expect(best?.command.kind).toBe("BEAM_DOWN");
    expect(best?.score.priority).toBe(BEAM_DOWN_KILL_PRIORITY_V7);
    if (best?.command.kind !== "BEAM_DOWN") throw new Error("no beam");
    expect(
      Math.max(
        Math.abs(best.command.to.x - 2),
        Math.abs(best.command.to.y - 6),
      ),
    ).toBeLessThanOrEqual(2);
  });

  it("still buys a Mothership for a six-unit front", () => {
    const state = checkedV7(
      martianFieldV7([
        own("FIGHTER", 1, 1),
        own("FIGHTER", 2, 1),
        own("FIGHTER", 3, 1),
        own("MARKSMAN", 1, 2),
        own("MARKSMAN", 2, 3),
        own("FIGHTER", 3, 3),
      ]),
    );
    const view = activeViewV7(state);
    expect(
      martianProductionAdjustmentV7(
        view,
        "KNIGHT",
        martianArmyCountsV7(view),
        false,
        true,
        false,
      ),
    ).toBeGreaterThan(0);
  });
});

describe("the Mothership's presentation", () => {
  it("names and explains its abilities on the unit card, the glossary, and the technology card", () => {
    expect(martianAbilityNameV7("BEAM_DOWN", "MARTIAN")).toBe(
      BEAM_DOWN_LABEL_V7,
    );
    expect(martianAbilityNameV7("SHIELD_CANOPY", "MARTIAN")).toBe(
      SHIELD_CANOPY_LABEL_V7,
    );
    // `pulp_wars-eg3k` (7r146): the Mothership's Beam Down has its own
    // text; the Saucer's keeps its own.
    expect(martianAbilityDescriptionV7("BEAM_DOWN", "MARTIAN", "KNIGHT")).toBe(
      MOTHERSHIP_BEAM_TOOLTIP_V7,
    );
    expect(martianAbilityDescriptionV7("BEAM_DOWN", "MARTIAN", "RAIDER")).toBe(
      BEAM_DOWN_TOOLTIP_V7,
    );
    expect(MOTHERSHIP_BEAM_TOOLTIP_V7).toContain("up to three times a turn");
    expect(martianRoleUnlockTextV7("KNIGHT")).toBe(
      "Train Mothership (flies, Beam Down, Tractor Beam, Shield Canopy)",
    );
    const glossary = roleGlossaryV7("KNIGHT", "MARTIAN");
    expect(glossary.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["Beam Down", "Shield Canopy"]),
    );
    expect(glossary.map((entry) => entry.name)).not.toContain("Mass Beam Down");
    expect(
      glossary.find((entry) => entry.name === "Beam Down")?.text,
    ).toContain("three times a turn");
    expect(martianCommandLabelV7("BEAM_DOWN", "ORIGINAL")).toBe(
      BEAM_DOWN_LABEL_V7,
    );
  });

  it("aims on the board: a passenger, then a tile in reach", () => {
    const state = strikeForce();
    const view = activeViewV7(state);
    const commands = offeredV7(state);
    const mothership = idAt(state, at(2, 2));
    const pick = {
      kind: "BEAM_DOWN",
      unitId: mothership,
      passengerUnitId: null,
    } as const;
    const targets = martianPickTargetsV7(view, commands, pick);
    expect(
      targets.filter((target) => target.family === "BEAM_DOWN_PASSENGER"),
    ).toHaveLength(3);
    const before: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(before, view, targets, pick);
    expect(
      targets.every((target) => target.previewLabel === BEAM_BADGE_V7),
    ).toBe(true);
    const chosen = { ...pick, passengerUnitId: idAt(state, at(1, 1)) };
    const tiles = martianPickTargetsV7(view, commands, chosen);
    expect(tiles.length).toBe(
      offeredV7(state, "BEAM_DOWN").filter(
        (command) =>
          command.kind === "BEAM_DOWN" &&
          command.passengerUnitId === chosen.passengerUnitId,
      ).length,
    );
    expect(tiles.every((target) => target.family === "BEAM_DOWN")).toBe(true);
  });

  it("plays in the gallery: a beamed Grunt lands and shoots", () => {
    expect(galleryDemoCuesV7("MARTIAN", "KNIGHT")).toContain("BEAM_DOWN");
    const scene = buildGalleryDemoSceneV7("MARTIAN", "KNIGHT", "BEAM_DOWN");
    expect(scene?.command.kind).toBe("BEAM_DOWN");
    expect(
      scene?.events.events.some((event) => event.kind === "UNIT_BEAMED"),
    ).toBe(true);
    expect(scene?.steps).toHaveLength(2);
  });
});
