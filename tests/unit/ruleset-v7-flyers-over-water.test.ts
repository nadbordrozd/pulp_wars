import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  parseEventV7,
  parseGameStateV7,
  publicUnitLaunchesV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { martianMoveLabelV7 } from "../../src/render/canvas/martian-board-plan-v7";
import { LAUNCH_LABEL_V7 } from "../../src/render/martian-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { bombV7, dwarfFieldV7 } from "../fixtures/v7-dwarf";
import { applyOkV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  martianFieldV7,
  playV7,
  rejectedV7,
  type MartianFieldOptionsV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  kindsV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// Flyers over water (`pulp_wars-7pi5`, 7r116). The user, 2026-10-25: "when
// a gyrocopter flies over water, it shouldn't become a boat. the same goes
// for all other flying units. whatever the rules are for IF a flying unit
// can enter/shallow water, keep them. just when it does enter water, it
// should retain its original sprite and properties - unlike all land-based
// units when they embark in a port." Before 7r116 a flyer whose Move (or
// Bomb Run) ended on water self-launched: it became an embarked transport
// (Move 2, Defense 1, no Attack or ability) drawn, for the Gyrocopter, as
// the Dwarf transport boat.

/** Every flyer: the roles whose movement mode is `FLY`, by faction. */
const FLYERS = FACTION_IDS_V7.flatMap((faction) =>
  UNIT_ROLE_IDS_V7.filter(
    (role) => roleMechanicsV7(role, faction).movementMode === "FLY",
  ).map((role) => ({ faction, role })),
);

const field = (
  faction: FactionIdV7,
  pieces: readonly MartianPieceV7[],
  options: MartianFieldOptionsV7 = {},
): GameStateV7 =>
  faction === "DWARF"
    ? dwarfFieldV7(pieces, options)
    : martianFieldV7(pieces, { ...options, factions: [faction, "ORIGINAL"] });

const without = (faction: FactionIdV7, ...techs: TechnologyIdV7[]) => ({
  0: withoutTechsV7(faction, ...techs),
});

const FAR: MartianPieceV7 = { seat: 1, role: "FIGHTER", at: at(9, 1) };

const move = (
  state: GameStateV7,
  from: CoordV7,
  ...path: CoordV7[]
): Extract<CommandV7, { kind: "MOVE" }> => ({
  kind: "MOVE",
  unitId: unitAtV7(state, from).id,
  path,
});

/** Applies an offered Move; its events and state must parse. */
function go(state: GameStateV7, from: CoordV7, ...path: CoordV7[]) {
  const command = move(state, from, ...path);
  const view = viewForV7(state, activeIdV7(state));
  const end = path[path.length - 1] as CoordV7;
  expect(
    queryPlayerCommandsV7(view).some(
      (offered) =>
        offered.kind === "MOVE" &&
        offered.unitId === command.unitId &&
        offered.path.at(-1)?.x === end.x &&
        offered.path.at(-1)?.y === end.y,
    ),
    `a MOVE to ${end.x},${end.y} is offered`,
  ).toBe(true);
  const result = applyOkV7(state, activeIdV7(state), command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return result;
}

const offeredFor = (
  state: GameStateV7,
  where: CoordV7,
  kind: CommandV7["kind"],
): readonly CommandV7[] => {
  const unit = unitAtV7(state, where);
  return queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))).filter(
    (command) =>
      command.kind === kind &&
      "unitId" in command &&
      command.unitId === unit.id,
  );
};

/**
 * The active seat's own Port on Shallow Water (7, 7), next to its capital
 * (8, 8), built by an ordinary `BUILD_PORT`.
 */
function withOwnPortV7(state: GameStateV7): GameStateV7 {
  const actor = activeIdV7(state);
  const rich = checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === actor ? { ...player, coins: 100 } : player,
    ),
  });
  return playV7(rich, { kind: "BUILD_PORT", at: at(7, 7) }).state;
}

describe("the flyers", () => {
  it("are the Saucer, the Mothership, and the Gyrocopter", () => {
    expect(FLYERS).toEqual([
      { faction: "MARTIAN", role: "RAIDER" },
      { faction: "MARTIAN", role: "KNIGHT" },
      { faction: "DWARF", role: "RAIDER" },
    ]);
  });
});

describe("a flyer over water stays in the air as itself (7r116)", () => {
  it("a Move that ends on Shallow Water leaves every flyer in land form, not embarked", () => {
    for (const { faction, role } of FLYERS) {
      const state = field(faction, [{ seat: 0, role, at: at(2, 2) }, FAR], {
        water: [at(3, 2)],
        techs: without(faction, "SHORECRAFT"),
      });
      const run = go(state, at(2, 2), at(3, 2));
      const unit = unitAtV7(run.state, at(3, 2));
      expect(unit, `${faction} ${role}`).toMatchObject({ role, form: "LAND" });
      expect(kindsV7(run.events)).not.toContain("UNIT_EMBARKED");
      // Not the exhausted activation of an embark.
      expect(unit.activation.attacked, role).toBe(false);
    }
  });

  it("on Deep Water too with Navigation; without it, Deep Water stays closed as before", () => {
    for (const { faction, role } of FLYERS) {
      const deep = field(faction, [{ seat: 0, role, at: at(2, 2) }, FAR], {
        deepWater: [at(3, 2)],
      });
      expect(
        unitAtV7(go(deep, at(2, 2), at(3, 2)).state, at(3, 2)).form,
        `${faction} ${role}`,
      ).toBe("LAND");
      const noNavigation = field(
        faction,
        [{ seat: 0, role, at: at(2, 2) }, FAR],
        { deepWater: [at(3, 2)], techs: without(faction, "NAVIGATION") },
      );
      rejectedV7(noNavigation, move(noNavigation, at(2, 2), at(3, 2)));
    }
  });

  it("at its own Port a flyer stays in the air; a foot unit still embarks there", () => {
    for (const { faction, role } of FLYERS) {
      const state = withOwnPortV7(
        field(faction, [{ seat: 0, role, at: at(6, 6) }, FAR], {
          water: [at(7, 7)],
        }),
      );
      const run = go(state, at(6, 6), at(7, 7));
      expect(unitAtV7(run.state, at(7, 7)).form, `${faction} ${role}`).toBe(
        "LAND",
      );
      expect(kindsV7(run.events)).not.toContain("UNIT_EMBARKED");
      const foot = withOwnPortV7(
        field(faction, [{ seat: 0, role: "FIGHTER", at: at(6, 6) }, FAR], {
          water: [at(7, 7)],
        }),
      );
      const boarded = go(foot, at(6, 6), at(7, 7));
      expect(unitAtV7(boarded.state, at(7, 7)).form, faction).toBe("EMBARKED");
      expect(kindsV7(boarded.events)).toContain("UNIT_EMBARKED");
    }
  });

  it("over water a Saucer and a Mothership keep their Attack and abilities", () => {
    for (const role of ["RAIDER", "KNIGHT"] as const) {
      const state = martianFieldV7(
        [
          { seat: 0, role, at: at(2, 2) },
          { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 10 },
          FAR,
        ],
        { water: [at(3, 2)] },
      );
      const flown = go(state, at(2, 2), at(3, 2)).state;
      const unit = unitAtV7(flown, at(3, 2));
      const attacks = offeredFor(flown, at(3, 2), "ATTACK");
      expect(attacks.length, role).toBeGreaterThan(0);
      playV7(flown, attacks[0] as CommandV7);
      // A flyer already standing over water at the start of its turn has its
      // whole Move, its Attack, and its abilities.
      const hovering = martianFieldV7(
        [
          { seat: 0, role, at: at(3, 2) },
          { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 10 },
          { seat: 0, role: "FIGHTER", at: at(2, 3) },
          FAR,
        ],
        { water: [at(3, 2)] },
      );
      const kinds = new Set(
        queryPlayerCommandsV7(viewForV7(hovering, activeIdV7(hovering)))
          .filter(
            (command) =>
              "unitId" in command &&
              command.unitId === unitAtV7(hovering, at(3, 2)).id,
          )
          .map((command) => command.kind),
      );
      expect(kinds.has("ATTACK"), role).toBe(true);
      expect(
        kinds.has(role === "RAIDER" ? "BEAM_DOWN" : "MASS_BEAM_DOWN"),
        [...kinds].join(","),
      ).toBe(true);
      expect(kinds.has("DISEMBARK"), role).toBe(false);
      expect(unit.form).toBe("LAND");
    }
  });

  it("a Gyrocopter over water bombs, flies its full Move, and lands from a bomb on water in the air", () => {
    const hovering = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(3, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        FAR,
      ],
      { water: [at(3, 2), at(3, 3)] },
    );
    expect(unitAtV7(hovering, at(3, 2)).form).toBe("LAND");
    expect(offeredFor(hovering, at(3, 2), "BOMB_RUN").length).toBeGreaterThan(
      0,
    );
    expect(offeredFor(hovering, at(3, 2), "DISEMBARK")).toEqual([]);
    // Move 3 (an embarked unit has Move 2).
    go(hovering, at(3, 2), at(3, 3), at(3, 4), at(3, 5));
    // A Bomb Run that lands on water: it stays in the air.
    const landed = playV7(
      hovering,
      bombV7(hovering, at(3, 2), at(5, 2), at(3, 3)),
    );
    expect(unitAtV7(landed.state, at(3, 3))).toMatchObject({
      role: "RAIDER",
      form: "LAND",
    });
    expect(kindsV7(landed.events)).not.toContain("UNIT_EMBARKED");
  });

  it("is not afloat: a hostile flyer over a dock does not blockade it", () => {
    for (const role of ["RAIDER", "KNIGHT"] as const) {
      // The Port is built first; then the hostile unit stands on it.
      const built = withOwnPortV7(
        martianFieldV7(
          [
            { seat: 0, role: "FIGHTER", at: at(6, 6) },
            { seat: 1, role, at: at(6, 7) },
            FAR,
          ],
          { water: [at(7, 7), at(6, 7)], factions: ["ORIGINAL", "MARTIAN"] },
        ),
      );
      const visitor = unitAtV7(built, at(6, 7));
      const state = checkedV7({
        ...built,
        units: built.units.map((unit) =>
          unit.id === visitor.id ? { ...unit, at: at(7, 7) } : unit,
        ),
      });
      expect(unitAtV7(state, at(7, 7)).form, role).toBe("LAND");
      const port = viewForV7(state, activeIdV7(state)).naval.ownedPorts.find(
        (entry) => entry.at.x === 7 && entry.at.y === 7,
      );
      expect(port?.status, role).toBe("ACTIVE");
    }
  });

  it("killed over water, a flyer leaves no Grave, and its killer does not advance onto the water", () => {
    for (const enemy of ["UNDEAD", "ORIGINAL"] as const) {
      const state = martianFieldV7(
        [
          { seat: 0, role: "RAIDER", at: at(3, 2), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(4, 2) },
          FAR,
        ],
        { water: [at(3, 2)], factions: ["MARTIAN", enemy], activeSeat: 1 },
      );
      const saucer = unitAtV7(state, at(3, 2));
      const attacker = unitAtV7(state, at(4, 2));
      const command: CommandV7 = {
        kind: "ATTACK",
        unitId: attacker.id,
        targetUnitId: saucer.id,
      };
      const preview = queryCombatPreviewV7(
        viewForV7(state, activeIdV7(state)),
        attacker.id,
        saucer.id,
      );
      expect(preview?.defenderDies, enemy).toBe(true);
      expect(preview?.advances, enemy).toBe(false);
      const run = playV7(state, command);
      expect(run.state.units.some((unit) => unit.id === saucer.id)).toBe(false);
      expect(unitAtV7(run.state, at(4, 2)).id, enemy).toBe(attacker.id);
      expect(
        run.state.graves.some((grave) => grave.x === 3 && grave.y === 2),
        enemy,
      ).toBe(false);
      expect(parseGameStateV7(JSON.parse(JSON.stringify(run.state)))).toEqual(
        run.state,
      );
    }
  });

  it("a walker still self-launches on water as before", () => {
    for (const role of ["CATAPULT", "JUGGERNAUT"] as const) {
      const state = martianFieldV7([{ seat: 0, role, at: at(2, 2) }, FAR], {
        water: [at(3, 2)],
      });
      const run = go(state, at(2, 2), at(3, 2));
      expect(unitAtV7(run.state, at(3, 2)).form, role).toBe("EMBARKED");
      expect(kindsV7(run.events)).toContain("UNIT_EMBARKED");
    }
  });
});

describe("the state schema and the public rules", () => {
  it("admit a land-form flyer on open water and still refuse a land-form foot unit there", () => {
    for (const { faction, role } of FLYERS)
      expect(() =>
        field(faction, [{ seat: 0, role, at: at(3, 2) }, FAR], {
          water: [at(3, 2)],
        }),
      ).not.toThrow();
    const base = martianFieldV7(
      [{ seat: 0, role: "FIGHTER", at: at(2, 2) }, FAR],
      { water: [at(3, 2)] },
    );
    const fighter = unitAtV7(base, at(2, 2));
    expect(() =>
      checkedV7({
        ...base,
        units: base.units.map((unit) =>
          unit.id === fighter.id ? { ...unit, at: at(3, 2) } : unit,
        ),
      }),
    ).toThrow();
  });

  it("a flyer never launches, so its water destinations are attack origins; a walker launches", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(2, 2) },
        { seat: 0, role: "KNIGHT", at: at(2, 4) },
        { seat: 0, role: "CATAPULT", at: at(2, 6) },
        FAR,
      ],
      { water: [at(3, 2)] },
    );
    const view = viewForV7(state, activeIdV7(state));
    const launches = (where: CoordV7) =>
      publicUnitLaunchesV7(view, unitAtV7(state, where) as never);
    expect(launches(at(2, 2))).toBe(false);
    expect(launches(at(2, 4))).toBe(false);
    expect(launches(at(2, 6))).toBe(true);
    const gyro = dwarfFieldV7([{ seat: 0, role: "RAIDER", at: at(2, 2) }, FAR]);
    expect(
      publicUnitLaunchesV7(
        viewForV7(gyro, activeIdV7(gyro)),
        unitAtV7(gyro, at(2, 2)) as never,
      ),
    ).toBe(false);
  });
});

describe("the board draws a flyer over water as itself", () => {
  const planEntry = (view: PlayerViewV7, where: CoordV7) => {
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const unit = view.units.find(
      (candidate) => candidate.at.x === where.x && candidate.at.y === where.y,
    );
    const entry = plan.entries.find(
      (candidate) => candidate.key === `unit:${String(unit?.id)}`,
    );
    if (entry === undefined) throw new Error("unit entry missing");
    return entry;
  };

  it("its own sprite and name, never the transport", () => {
    for (const [faction, role, subject, label] of [
      ["DWARF", "RAIDER", "UNIT:DWARF:RAIDER", "Gyrocopter"],
      ["MARTIAN", "RAIDER", "UNIT:MARTIAN:RAIDER", "Saucer"],
      ["MARTIAN", "KNIGHT", "UNIT:MARTIAN:KNIGHT", "Mothership"],
    ] as const) {
      const flown = go(
        field(faction, [{ seat: 0, role, at: at(2, 2) }, FAR], {
          water: [at(3, 2), at(4, 2)],
        }),
        at(2, 2),
        at(3, 2),
      ).state;
      const view = viewForV7(flown, activeIdV7(flown));
      const entry = planEntry(view, at(3, 2));
      expect(entry, faction).toMatchObject({ artSubject: subject, label });
      expect(entry.assetId).not.toBe("unit-shared-embarked-transport");
      expect(entry.martian?.afloat ?? false).toBe(false);
    }
  });

  it("a Move onto water carries no Launch label for a flyer, and keeps it for a walker", () => {
    for (const [role, label] of [
      ["RAIDER", null],
      ["KNIGHT", null],
      ["CATAPULT", LAUNCH_LABEL_V7],
    ] as const) {
      const state = martianFieldV7([{ seat: 0, role, at: at(2, 2) }, FAR], {
        water: [at(3, 2)],
      });
      const view = viewForV7(state, activeIdV7(state));
      expect(
        martianMoveLabelV7(view, move(state, at(2, 2), at(3, 2))),
        role,
      ).toBe(label);
    }
    // A Gyrocopter in a match with a Martian seat: no hover-launch label.
    const mixed = dwarfFieldV7(
      [{ seat: 0, role: "RAIDER", at: at(2, 2) }, FAR],
      { water: [at(3, 2)], factions: ["DWARF", "MARTIAN"] },
    );
    expect(
      martianMoveLabelV7(
        viewForV7(mixed, activeIdV7(mixed)),
        move(mixed, at(2, 2), at(3, 2)),
      ),
    ).toBeNull();
  });
});
