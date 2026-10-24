import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  BEAM_DOWN_KILL_PRIORITY_V7,
  BEAM_DOWN_PRIORITY_V7,
  martianProductionAdjustmentV7,
  martianArmyCountsV7,
} from "../../src/ai/v7-martian";
import {
  FORCE_FIELD_SHIELD_V7,
  MASS_BEAM_DOWN_CAPACITY_V7,
  MASS_BEAM_DOWN_RANGE_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  forceFieldHoldsV7,
  parseCommandV7,
  previewMassBeamDownV7,
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
  MASS_BEAM_DOWN_LABEL_V7,
  MASS_BEAM_DOWN_TOOLTIP_V7,
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
// anchor. Mass Beam Down sets up to three own units from within two tiles
// of it down around an explored tile within three, each on the nearest
// free tile; its Shield Canopy covers the units beside it at every
// recharge. The field (tests/fixtures/v7-martian.ts): 11 x 11, seat 0
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

const massBeam = (
  state: GameStateV7,
  mothership: CoordV7,
  passengers: readonly CoordV7[],
  to: CoordV7,
): Extract<CommandV7, { kind: "MASS_BEAM_DOWN" }> => ({
  kind: "MASS_BEAM_DOWN",
  unitId: idAt(state, mothership),
  passengerUnitIds: passengers
    .map((where) => idAt(state, where))
    .sort((left, right) => left - right),
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
  it("is a tough 9-Coin anchor in the Knight's class, with Mass Beam Down and the Shield Canopy", () => {
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
      "MASS_BEAM_DOWN",
      "TRACTOR_BEAM",
      "SHIELD_CANOPY",
    ]);
    // The single Beam Down stays the Saucer's.
    expect(effectiveRoleRuleV7("RAIDER", "MARTIAN").abilities).toContain(
      "BEAM_DOWN",
    );
    const mechanics = roleMechanicsV7("KNIGHT", "MARTIAN");
    expect(mechanics.shield).toBe(4);
    expect(mechanics.capacitySlots).toBe(2);
    expect(mechanics.heavyTractorBeam).toBe(true);
    expect(mechanics.shieldCanopy).toBe(true);
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
    expect([MASS_BEAM_DOWN_RANGE_V7, MASS_BEAM_DOWN_CAPACITY_V7]).toEqual([
      3, 3,
    ]);
  });
});

describe("Mass Beam Down", () => {
  it("is offered for every explored tile in reach, with the fresh units nearest the Mothership", () => {
    const state = strikeForce();
    const commands = expectOfferedAcceptedV7(state, "MASS_BEAM_DOWN");
    expect(commands.length).toBeGreaterThan(0);
    const mothership = unitAtV7(state, at(2, 2));
    for (const command of commands) {
      if (command.kind !== "MASS_BEAM_DOWN") throw new Error("kind");
      expect(command.unitId).toBe(mothership.id);
      expect(
        Math.max(Math.abs(command.to.x - 2), Math.abs(command.to.y - 2)),
      ).toBeLessThanOrEqual(MASS_BEAM_DOWN_RANGE_V7);
      expect(command.passengerUnitIds.length).toBeLessThanOrEqual(3);
    }
    // The far tile (2, 5) takes all three Grunts.
    expect(commands).toContainEqual(
      massBeam(state, at(2, 2), [at(1, 1), at(2, 1), at(3, 1)], at(2, 5)),
    );
    // Four tiles away is out of reach.
    expect(
      commands.some(
        (command) =>
          command.kind === "MASS_BEAM_DOWN" &&
          command.to.x === 2 &&
          command.to.y === 6,
      ),
    ).toBe(false);
  });

  it("places the passengers in unit-ID order on the target, then the tiles around it in (y, x) order", () => {
    const state = strikeForce();
    const command = massBeam(
      state,
      at(2, 2),
      [at(1, 1), at(2, 1), at(3, 1)],
      at(2, 5),
    );
    const preview = previewMassBeamDownV7(activeViewV7(state), command);
    expect(preview?.placements.map((placement) => placement.to)).toEqual([
      at(2, 5),
      at(1, 4),
      at(2, 4),
    ]);
    const { state: after, events } = playV7(state, command);
    const ids = command.passengerUnitIds;
    expect(
      ids.map((id) => after.units.find((unit) => unit.id === id)?.at),
    ).toEqual([at(2, 5), at(1, 4), at(2, 4)]);
    expect(events.filter((event) => event.kind === "UNIT_BEAMED")).toHaveLength(
      3,
    );
    expect(after.beamedThisTurn).toEqual([...ids]);
    // The Mothership stays where it is and has used its action.
    const mothership = unitAtV7(after, at(2, 2));
    expect(mothership.activation.specialActed).toBe(true);
    // An occupied target: the landings move to the next free tiles.
    const blocked = strikeForce([foe("FIGHTER", 2, 5)]);
    const around = previewMassBeamDownV7(
      activeViewV7(blocked),
      massBeam(blocked, at(2, 2), [at(1, 1), at(2, 1), at(3, 1)], at(2, 5)),
    );
    expect(around?.placements.map((placement) => placement.to)).toEqual([
      at(1, 4),
      at(2, 4),
      at(3, 4),
    ]);
  });

  it("leaves the beamed units able to attack but not to move", () => {
    const state = strikeForce([foe("FIGHTER", 2, 7)]);
    const { state: after } = playV7(
      state,
      massBeam(state, at(2, 2), [at(1, 1), at(2, 1), at(3, 1)], at(2, 5)),
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
    // Once a turn: no second beam of the Mothership, and the beamed units
    // are no passengers again this turn.
    expect(offeredV7(after, "MASS_BEAM_DOWN")).toEqual([]);
  });

  it("rejects an illegal Mass Beam Down with its reason", () => {
    const state = strikeForce([own("FIGHTER", 2, 6)]);
    // Out of reach: four tiles away.
    expect(
      rejectedV7(state, massBeam(state, at(2, 2), [at(1, 1)], at(2, 7))),
    ).toEqual({
      code: "MASS_BEAM_DOWN_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    // A passenger beyond the pick-up range (no pick-up from a city).
    expect(
      rejectedV7(state, massBeam(state, at(2, 2), [at(2, 6)], at(2, 4))),
    ).toEqual({
      code: "MASS_BEAM_DOWN_NOT_LEGAL",
      params: { reason: "NO_PASSENGER" },
    });
    // An unexplored target.
    const hidden = unexploreV7(state, 0, [at(4, 4)]);
    expect(
      rejectedV7(hidden, massBeam(hidden, at(2, 2), [at(1, 1)], at(4, 4))),
    ).toEqual({
      code: "INVALID_TILE",
      params: { action: "MASS_BEAM_DOWN" },
    });
    // No room: the target and every tile around it are taken.
    const ring = [
      at(4, 4),
      at(3, 3),
      at(4, 3),
      at(5, 3),
      at(3, 4),
      at(5, 4),
      at(3, 5),
      at(4, 5),
      at(5, 5),
    ].filter((where) => !(where.x === 5 && where.y === 5));
    const crowded = strikeForce(
      ring.map((where) => foe("FIGHTER", where.x, where.y)),
    );
    expect(
      rejectedV7(crowded, massBeam(crowded, at(2, 2), [at(1, 1)], at(4, 4))),
    ).toEqual({
      code: "MASS_BEAM_DOWN_NOT_LEGAL",
      params: { reason: "NO_ROOM" },
    });
    // A Mothership that has used its action.
    const acted = martianFieldV7([
      own("KNIGHT", 2, 2, { activation: { attacked: true, attacksUsed: 1 } }),
      own("FIGHTER", 1, 1),
    ]);
    expect(
      rejectedV7(acted, massBeam(acted, at(2, 2), [at(1, 1)], at(2, 4))),
    ).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: idAt(acted, at(2, 2)) },
    });
    // A Saucer has no Mass Beam Down.
    const saucer = martianFieldV7([own("RAIDER", 2, 2), own("FIGHTER", 1, 1)]);
    expect(
      rejectedV7(saucer, massBeam(saucer, at(2, 2), [at(1, 1)], at(2, 4))).code,
    ).toBe("UNIT_ROLE_INVALID");
  });

  it("carries one to three passengers, listed once in ascending order", () => {
    const base = {
      kind: "MASS_BEAM_DOWN",
      unitId: 1,
      to: { x: 2, y: 4 },
    } as const;
    expect(parseCommandV7({ ...base, passengerUnitIds: [2, 3, 4] }).ok).toBe(
      true,
    );
    expect(parseCommandV7({ ...base, passengerUnitIds: [] }).ok).toBe(false);
    expect(parseCommandV7({ ...base, passengerUnitIds: [2, 3, 4, 5] }).ok).toBe(
      false,
    );
    expect(parseCommandV7({ ...base, passengerUnitIds: [3, 2] }).ok).toBe(
      false,
    );
    expect(parseCommandV7({ ...base, passengerUnitIds: [2, 2] }).ok).toBe(
      false,
    );
    expect(parseCommandV7({ ...base, passengerUnitIds: [1] }).ok).toBe(false);
  });

  it("offers at most three fresh units, nearest first, and accepts a chosen set", () => {
    // Four Grunts in reach; the one at (4, 2) is the farthest, and the one
    // at (2, 3) has fired.
    const state = martianFieldV7([
      own("KNIGHT", 2, 2),
      own("FIGHTER", 1, 2),
      own("FIGHTER", 3, 2),
      own("FIGHTER", 2, 1),
      own("FIGHTER", 4, 2),
      own("FIGHTER", 2, 3, { activation: { attacked: true, attacksUsed: 1 } }),
    ]);
    const command = offeredV7(state, "MASS_BEAM_DOWN").find(
      (candidate) =>
        candidate.kind === "MASS_BEAM_DOWN" &&
        candidate.to.x === 2 &&
        candidate.to.y === 5,
    );
    expect(command).toEqual(
      massBeam(state, at(2, 2), [at(1, 2), at(3, 2), at(2, 1)], at(2, 5)),
    );
    // The reducer takes any legal set: the far Grunt and the one that
    // fired (it is only relocated).
    const chosen = massBeam(state, at(2, 2), [at(4, 2), at(2, 3)], at(2, 5));
    const result = applyCommandV7(state, activeIdV7(state), chosen);
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
  it("beams its strike force down onto a weak enemy out of their walking reach", () => {
    // A wounded Fighter five tiles from the Grunts: none can reach it on
    // foot, but beamed around (2, 5) they shoot it on arrival.
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
    expect(best?.command.kind).toBe("MASS_BEAM_DOWN");
    expect(best?.score.priority).toBe(BEAM_DOWN_KILL_PRIORITY_V7);
    if (best?.command.kind !== "MASS_BEAM_DOWN") throw new Error("no beam");
    const preview = previewMassBeamDownV7(activeViewV7(state), best.command);
    expect(
      preview?.placements.some(
        (placement) =>
          Math.max(
            Math.abs(placement.to.x - 2),
            Math.abs(placement.to.y - 6),
          ) <= 2,
      ),
    ).toBe(true);
  });

  it("without a shot, only delivers the army toward its target at the routine tier", () => {
    const state = strikeForce([foe("FIGHTER", 9, 1)]);
    const beams = chooseNormalCommandV7(activeViewV7(state)).candidates.filter(
      (candidate) =>
        candidate.command.kind === "MASS_BEAM_DOWN" &&
        candidate.score.priority > 0,
    );
    for (const beam of beams)
      expect(beam.score.priority).toBe(BEAM_DOWN_PRIORITY_V7);
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
    expect(martianAbilityNameV7("MASS_BEAM_DOWN", "MARTIAN")).toBe(
      MASS_BEAM_DOWN_LABEL_V7,
    );
    expect(martianAbilityNameV7("SHIELD_CANOPY", "MARTIAN")).toBe(
      SHIELD_CANOPY_LABEL_V7,
    );
    expect(martianAbilityDescriptionV7("MASS_BEAM_DOWN", "MARTIAN")).toBe(
      MASS_BEAM_DOWN_TOOLTIP_V7,
    );
    expect(MASS_BEAM_DOWN_TOOLTIP_V7).toContain("up to three of your units");
    expect(martianRoleUnlockTextV7("KNIGHT")).toBe(
      "Train Mothership (flies, Mass Beam Down, Tractor Beam, Shield Canopy)",
    );
    const glossary = roleGlossaryV7("KNIGHT", "MARTIAN").map(
      (entry) => entry.name,
    );
    expect(glossary).toEqual(
      expect.arrayContaining(["Mass Beam Down", "Shield Canopy"]),
    );
    expect(glossary).not.toContain("Beam Down");
    expect(martianCommandLabelV7("MASS_BEAM_DOWN", "ORIGINAL")).toBe(
      MASS_BEAM_DOWN_LABEL_V7,
    );
  });

  it("aims on the board: the tiles in reach, then the chosen tile's landings", () => {
    const state = strikeForce();
    const view = activeViewV7(state);
    const commands = offeredV7(state);
    const mothership = idAt(state, at(2, 2));
    const unchosen = {
      kind: "MASS_BEAM_DOWN",
      unitId: mothership,
      chosen: null,
    } as const;
    const targets = martianPickTargetsV7(view, commands, unchosen);
    expect(targets.length).toBe(offeredV7(state, "MASS_BEAM_DOWN").length);
    expect(targets.every((target) => target.family === "MASS_BEAM_DOWN")).toBe(
      true,
    );
    // Before a tile is chosen no label clutters the tiles; the passengers
    // wear the "Beam" badge.
    expect(targets.some((target) => target.previewLabel !== undefined)).toBe(
      false,
    );
    const before: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(before, view, targets, unchosen);
    expect(
      before.filter((entry) => entry.label === BEAM_BADGE_V7),
    ).toHaveLength(3);
    // Chosen: the tile says how many land, and each landing names its unit.
    const pick = { ...unchosen, chosen: at(2, 5) };
    const chosen = martianPickTargetsV7(view, commands, pick);
    expect(
      chosen.find((target) => target.at.x === 2 && target.at.y === 5)
        ?.previewLabel,
    ).toBe("Beam 3 units");
    const entries: BoardRenderPlanEntryV7[] = [];
    addMartianPickEntriesV7(entries, view, chosen, pick);
    expect(
      entries
        .filter((entry) => entry.key.includes("MASS_BEAM_LANDING"))
        .map((entry) => [entry.at, entry.label]),
    ).toEqual([
      [at(2, 5), "Grunt"],
      [at(1, 4), "Grunt"],
      [at(2, 4), "Grunt"],
    ]);
  });

  it("plays in the gallery: the strike force lands and shoots", () => {
    expect(galleryDemoCuesV7("MARTIAN", "KNIGHT")).toContain("MASS_BEAM_DOWN");
    const scene = buildGalleryDemoSceneV7(
      "MARTIAN",
      "KNIGHT",
      "MASS_BEAM_DOWN",
    );
    expect(scene?.command.kind).toBe("MASS_BEAM_DOWN");
    expect(
      scene?.events.events.some((event) => event.kind === "UNIT_BEAMED"),
    ).toBe(true);
    expect(scene?.steps).toHaveLength(2);
  });
});
