import { afterEach, describe, expect, it } from "vitest";
import {
  BOMB_FINISH_PRIORITY_V7,
  DEFAULT_DWARF_POLICY_OPTIONS_V7,
  DEFENCE_TUNNEL_PRIORITY_V7,
  DWARF_EARLY_RESEARCH_PRIORITY_V7,
  DWARF_FIRST_OF_ROLE_BIAS_V7,
  ERUPTION_ESCAPE_PRIORITY_V7,
  GUNNER_CHIP_OFFSET_V7,
  KNOCKBACK_CENTER_VALUE_V7,
  MACHINE_REPAIR_PRIORITY_V7,
  THREATENED_SUPPORT_COST_V7,
  dwarfArmyCountsV7,
  dwarfFactsV7,
  dwarfMatchForPolicyV7,
  dwarfPolicyOptionsV7,
  dwarfProductionAdjustmentV7,
  dwarfResearchV7,
  planTunnelsV7,
  setDwarfPolicyOptionsV7,
  type DwarfPolicyToolsV7,
} from "../../src/ai/v7-dwarf";
import type { CampaignAssignmentV7 } from "../../src/ai/v7-campaign";
import {
  TECHNOLOGY_IDS_V7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import {
  candidatesV7,
  publicUnitAtV7,
  scoreV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { dwarfFieldV7, withBurrowedV7 } from "../fixtures/v7-dwarf";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";
import { type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { fieldV7 } from "../fixtures/v7-revision20";

// The Steampunk Dwarf Normal AI (`pulp_wars-78i.4`,
// docs/product/RULESET_7_DWARVES.md sections 15 and 18). The field: an
// 11 x 11 board, seat 0 (the viewer) capital (8, 8) with territory x 7-9,
// y 7-9; seat 1 capital (2, 8) with territory x 1-3, y 7-9; villages
// (5, 5), (8, 5), (5, 8); every other land tile Grass; every tile
// explored; every technology and 100 Coins unless stated.

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

/** Seat 0 Dwarf (the viewer) against seat 1 Human. */
const asDwarf = (pieces: readonly IcePieceV7[]): GameStateV7 =>
  dwarfFieldV7(pieces);
/** Seat 0 Human (the viewer) against seat 1 Dwarf. */
const againstDwarf = (pieces: readonly IcePieceV7[]): GameStateV7 =>
  dwarfFieldV7(pieces, { factions: ["ORIGINAL", "DWARF"] });

const at = (x: number, y: number): CoordV7 => ({ x, y });
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;

afterEach(() => {
  setDwarfPolicyOptionsV7(DEFAULT_DWARF_POLICY_OPTIONS_V7);
});

/** The Dwarf planning tools on the viewer's view, with a fixed job. */
function toolsFor(
  state: GameStateV7,
  assignment: (unitId: number) => CampaignAssignmentV7 | undefined = () =>
    undefined,
): DwarfPolicyToolsV7 {
  const view = viewerViewV7(state);
  const isHostile = (owner: number): boolean => owner !== view.viewer.id;
  return {
    view,
    facts: dwarfFactsV7(view, isHostile),
    commands: queryPlayerCommandsV7(view),
    options: dwarfPolicyOptionsV7(),
    isHostile,
    unit: (unitId) => view.units.find((unit) => unit.id === unitId),
    targetValue: (unit) => unit.hp,
    danger: () => 0,
    assignment: (unitId) => assignment(unitId),
    holdsMove: () => false,
    bestOwnHit: () => 0,
    previewBomb: () => null,
  };
}

describe("Dwarf Normal AI: the gate and the switch", () => {
  it("is off in a match without a Dwarf seat", () => {
    const human = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DINOSAUR"] },
    );
    expect(dwarfMatchForPolicyV7(viewerViewV7(human))).toBe(false);
    expect(
      dwarfMatchForPolicyV7(
        viewerViewV7(asDwarf([own("FIGHTER", 5, 3), foe("FIGHTER", 1, 1)])),
      ),
    ).toBe(true);
  });

  it("ships with the Dwarf rules on and the expansion tunnel off", () => {
    expect(DEFAULT_DWARF_POLICY_OPTIONS_V7.dwarfPlay).toBe(true);
    expect(DEFAULT_DWARF_POLICY_OPTIONS_V7.againstDwarves).toBe(true);
    expect(DEFAULT_DWARF_POLICY_OPTIONS_V7.expansionTunnel).toBe(false);
    expect(dwarfPolicyOptionsV7()).toEqual(DEFAULT_DWARF_POLICY_OPTIONS_V7);
  });

  it("plays no Dwarf command with the Dwarf rules switched off", () => {
    const state = asDwarf([
      own("RAIDER", 5, 3),
      foe("CATAPULT", 5, 1, { hp: 4 }),
    ]);
    expect(unitCandidatesV7(state, at(5, 3), "BOMB_RUN")).toHaveLength(1);
    setDwarfPolicyOptionsV7({ dwarfPlay: false, againstDwarves: false });
    expect(unitCandidatesV7(state, at(5, 3), "BOMB_RUN")).toHaveLength(0);
  });
});

describe("Dwarf Normal AI: the Mole", () => {
  it("walks to a near invader instead of tunnelling", () => {
    // The Human Fighter is 2 from the capital (an invader) and 2 from the
    // Mole: walk and hit.
    const state = asDwarf([own("GUARD", 7, 5), foe("FIGHTER", 6, 7)]);
    expect(
      queryPlayerCommandsV7(viewerViewV7(state)).some(
        (command) => command.kind === "TUNNEL",
      ),
    ).toBe(true);
    expect(unitCandidatesV7(state, at(7, 5), "TUNNEL")).toEqual([]);
    expect(
      planTunnelsV7(toolsFor(state)).get(unitIdAtV7(state, at(7, 5))),
    ).toBeNull();
  });

  it("tunnels with a rider next to an enemy Catapult 4 tiles away", () => {
    const state = asDwarf([
      own("GUARD", 9, 5),
      own("FIGHTER", 10, 5),
      foe("CATAPULT", 6, 9),
    ]);
    const mole = unitCandidatesV7(state, at(9, 5));
    const tunnel = mole.find(
      (candidate) => candidate.command.kind === "TUNNEL",
    );
    expect(tunnel?.score.priority).toBe(DEFENCE_TUNNEL_PRIORITY_V7);
    expect(mole[0]?.command.kind).toBe("TUNNEL");
    const command = tunnel?.command;
    if (command?.kind !== "TUNNEL") throw new Error("no tunnel");
    expect(chebyshev(command.to, at(6, 9))).toBe(1);
    expect(command.rider).not.toBeNull();
    expect(command.rider?.unitId).toBe(unitIdAtV7(state, at(10, 5)));
    // Only one of the many offered tunnels is a candidate.
    expect(unitCandidatesV7(state, at(9, 5), "TUNNEL")).toHaveLength(1);
  });

  it("does not tunnel off a center it garrisons alone", () => {
    const attack: CampaignAssignmentV7 = {
      job: "ATTACK",
      at: at(2, 8),
      field: { get: (where: CoordV7) => chebyshev(where, at(2, 8)) },
      targetCityId: null,
    } as unknown as CampaignAssignmentV7;
    const alone = asDwarf([own("GUARD", 8, 8), foe("CATAPULT", 4, 5)]);
    const moleId = unitIdAtV7(alone, at(8, 8));
    expect(planTunnelsV7(toolsFor(alone, () => attack)).get(moleId)).toBeNull();
    // With a second unit next to the center it may go.
    const escorted = asDwarf([
      own("GUARD", 8, 8),
      own("FIGHTER", 8, 7),
      foe("CATAPULT", 4, 5),
    ]);
    const planned = planTunnelsV7(toolsFor(escorted, () => attack)).get(
      unitIdAtV7(escorted, at(8, 8)),
    );
    expect(planned?.command.kind).toBe("TUNNEL");
  });

  it("tunnels on an Expansion job only behind the switch", () => {
    const village: CampaignAssignmentV7 = {
      job: "VILLAGE",
      at: at(5, 5),
      field: { get: (where: CoordV7) => chebyshev(where, at(5, 5)) },
      targetCityId: null,
    } as unknown as CampaignAssignmentV7;
    const state = asDwarf([
      own("GUARD", 10, 0),
      own("FIGHTER", 10, 1),
      foe("FIGHTER", 1, 1),
    ]);
    const moleId = unitIdAtV7(state, at(10, 0));
    expect(
      planTunnelsV7(toolsFor(state, () => village)).get(moleId),
    ).toBeNull();
    setDwarfPolicyOptionsV7({ expansionTunnel: true });
    const planned = planTunnelsV7(toolsFor(state, () => village)).get(moleId);
    const command = planned?.command;
    if (command?.kind !== "TUNNEL") throw new Error("no tunnel");
    expect(command.rider).not.toBeNull();
    expect(chebyshev(command.rider?.to ?? command.to, at(5, 5))).toBeLessThan(
      5,
    );
  });
});

describe("Dwarf Normal AI: the Gyrocopter", () => {
  it("bombs the wounded Catapult and lands on the safe side", () => {
    const state = asDwarf([
      own("RAIDER", 5, 3),
      foe("CATAPULT", 5, 1, { hp: 4 }),
      foe("FIGHTER", 3, 0),
    ]);
    const best = unitCandidatesV7(state, at(5, 3))[0];
    expect(best?.command).toEqual({
      kind: "BOMB_RUN",
      unitId: unitIdAtV7(state, at(5, 3)),
      targetUnitId: unitIdAtV7(state, at(5, 1)),
      to: at(6, 0),
    });
    expect(best?.score.priority).toBe(BOMB_FINISH_PRIORITY_V7);
  });

  it("does not land between two Fighters", () => {
    const state = asDwarf([
      own("RAIDER", 5, 4),
      foe("MARKSMAN", 5, 2),
      foe("FIGHTER", 3, 1),
      foe("FIGHTER", 7, 1),
    ]);
    expect(
      queryPlayerCommandsV7(viewerViewV7(state)).some(
        (command) => command.kind === "BOMB_RUN",
      ),
    ).toBe(true);
    expect(unitCandidatesV7(state, at(5, 4), "BOMB_RUN")).toEqual([]);
  });
});

describe("Dwarf Normal AI: the Gunner and the Engineer", () => {
  it("fires twice instead of moving", () => {
    const state = asDwarf([own("MARKSMAN", 5, 3), foe("FIGHTER", 5, 1)]);
    const gunner = unitCandidatesV7(state, at(5, 3));
    expect(gunner.filter((c) => c.command.kind === "MOVE")).toEqual([]);
    expect(gunner[0]?.command.kind).toBe("ATTACK");
    expect(gunner[0]?.score.priority).toBe(900 + GUNNER_CHIP_OFFSET_V7);
  });

  it("Assembles at the front, away from hostile melee units", () => {
    const state = asDwarf([own("CAPTAIN", 5, 4), foe("FIGHTER", 5, 1)]);
    const engineer = unitCandidatesV7(state, at(5, 4), "ASSEMBLE");
    expect(engineer).toHaveLength(1);
    const command = engineer[0]?.command;
    if (command?.kind !== "ASSEMBLE") throw new Error("no Assemble");
    expect(chebyshev(command.to, at(5, 1))).toBeGreaterThan(1);
  });

  it("Repairs a construct first", () => {
    const state = asDwarf([
      own("CAPTAIN", 9, 2),
      own("MARKSMAN", 9, 1, { hp: 5 }),
      foe("FIGHTER", 1, 1),
    ]);
    const repair = unitCandidatesV7(state, at(9, 2), "TEND_WOUNDED")[0];
    expect(repair?.score.priority).toBeGreaterThanOrEqual(
      MACHINE_REPAIR_PRIORITY_V7,
    );
    // 4 HP on a construct, counted double, at 8 a point.
    expect(repair?.score.immediateValue).toBe(4 * 2 * 8);
  });
});

describe("Dwarf Normal AI: the Steam Cannon", () => {
  it("values a Knockback that empties a hostile center", () => {
    const state = asDwarf([own("CATAPULT", 4, 6), foe("FIGHTER", 2, 8)]);
    const view = viewerViewV7(state);
    const cannon = unitIdAtV7(state, at(4, 6));
    const target = unitIdAtV7(state, at(2, 8));
    expect(queryCombatPreviewV7(view, cannon, target)?.push).toBe("WILL_PUSH");
    const command: CommandV7 = {
      kind: "ATTACK",
      unitId: cannon,
      targetUnitId: target,
    };
    const shipped = scoreV7(state, command).strategicValue;
    setDwarfPolicyOptionsV7({ dwarfPlay: false });
    expect(
      shipped - scoreV7(state, command).strategicValue,
    ).toBeGreaterThanOrEqual(KNOCKBACK_CENTER_VALUE_V7);
  });
});

describe("Dwarf Normal AI: Dig In", () => {
  it("a dug-in Hammerer holds when an enemy approaches", () => {
    const state = asDwarf([own("FIGHTER", 8, 7), foe("FIGHTER", 8, 4)]);
    expect(unitCandidatesV7(state, at(8, 7), "MOVE")).toEqual([]);
    const calm = asDwarf([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)]);
    expect(unitCandidatesV7(calm, at(8, 7), "MOVE").length).toBeGreaterThan(0);
  });
});

describe("Against the Dwarves", () => {
  it("moves a 2-HP unit off a mound's ring", () => {
    const state = withBurrowedV7(
      againstDwarf([own("FIGHTER", 5, 4, { hp: 2 }), foe("GUARD", 5, 3)]),
      [{ at: at(5, 3) }],
    );
    const best = unitCandidatesV7(state, at(5, 4))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(ERUPTION_ESCAPE_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end).toBeDefined();
    if (end !== undefined) expect(chebyshev(end, at(5, 3))).toBeGreaterThan(1);
    // No routine Move of a 2-HP unit ends in the ring.
    for (const candidate of unitCandidatesV7(state, at(5, 4), "MOVE")) {
      const to = endOf(candidate.command);
      if (to !== undefined) expect(chebyshev(to, at(5, 3))).not.toBe(1);
    }
  });

  it("kills the Engineer first", () => {
    const state = againstDwarf([
      own("FIGHTER", 5, 3),
      foe("CAPTAIN", 4, 2, { hp: 3 }),
      foe("GUARD", 6, 2, { hp: 3 }),
      foe("MARKSMAN", 3, 1),
    ]);
    const attacks = candidatesV7(state).filter(
      (candidate) =>
        candidate.command.kind === "ATTACK" &&
        candidate.command.unitId === unitIdAtV7(state, at(5, 3)),
    );
    const first = attacks[0]?.command;
    expect(first?.kind === "ATTACK" && first.targetUnitId).toBe(
      unitIdAtV7(state, at(4, 2)),
    );
  });

  it("counts a visible Gyrocopter's bomb in a unit's danger", () => {
    const state = againstDwarf([own("FIGHTER", 5, 5), foe("RAIDER", 5, 3)]);
    const view = viewerViewV7(state);
    const facts = dwarfFactsV7(view, (owner) => owner !== view.viewer.id);
    expect(facts.hostileGyrocopters.map((unit) => unit.id)).toEqual([
      publicUnitAtV7(state, at(5, 3)).id,
    ]);
  });
});

describe("Dwarf Normal AI: production and research", () => {
  it("biases the first Mole, Gunner, Engineer, Cannon, and Tank", () => {
    const view = viewerViewV7(
      asDwarf([
        own("FIGHTER", 8, 7),
        own("FIGHTER", 7, 7),
        foe("FIGHTER", 1, 1),
      ]),
    );
    const counts = dwarfArmyCountsV7(view);
    for (const role of ["MARKSMAN", "CATAPULT", "KNIGHT"] as const)
      expect(
        dwarfProductionAdjustmentV7(view, role, counts, false, true, true),
      ).toBe(DWARF_FIRST_OF_ROLE_BIAS_V7);
    expect(
      dwarfProductionAdjustmentV7(view, "RAIDER", counts, true, true, true),
    ).toBe(-THREATENED_SUPPORT_COST_V7);
    expect(
      dwarfProductionAdjustmentV7(view, "CAPTAIN", counts, true, true, true),
    ).toBe(-THREATENED_SUPPORT_COST_V7);
    // Gated: 0 for any other faction.
    const human = viewerViewV7(
      againstDwarf([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)]),
    );
    expect(
      dwarfProductionAdjustmentV7(
        human,
        "GUARD",
        dwarfArmyCountsV7(human),
        false,
        true,
        true,
      ),
    ).toBe(0);
  });

  it("researches Drill first, then Dig In under threat", () => {
    const fresh = dwarfFieldV7([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)], {
      techs: { 0: [], 1: TECHNOLOGY_IDS_V7 },
    });
    const view = viewerViewV7(fresh);
    const facts = {
      ownedCities: 1,
      counts: dwarfArmyCountsV7(view),
      cityThreatened: false,
      wallsOrShields: false,
    };
    expect(dwarfResearchV7(view, facts)).toMatchObject({
      tech: "DRILL",
      priority: DWARF_EARLY_RESEARCH_PRIORITY_V7,
    });
    const drilled = viewerViewV7(
      dwarfFieldV7([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)], {
        techs: { 0: ["DRILL"], 1: TECHNOLOGY_IDS_V7 },
      }),
    );
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Steam Mole is
    // at Dig In, so that is the second step of the early plan, threatened
    // or not (it was researched only under threat, at the ordinary
    // priority, when the Mole came with the root).
    for (const cityThreatened of [false, true])
      expect(
        dwarfResearchV7(drilled, { ...facts, cityThreatened }),
        String(cityThreatened),
      ).toMatchObject({
        tech: "FORTIFICATION",
        priority: DWARF_EARLY_RESEARCH_PRIORITY_V7,
      });
  });
});

describe("Dwarf Normal AI: headless", () => {
  it("finishes short matches against every faction in both seat orders", () => {
    const others = [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
    ] as const;
    let dwarfCommands = 0;
    for (const [index, other] of others.entries())
      for (const factions of [
        ["DWARF", other],
        [other, "DWARF"],
      ] as const) {
        const match = runAiMatchV7(goblinSetupV7(factions, index + 11), {
          maxRounds: 18,
        });
        const label = factions.join("-");
        expect(match.errors, label).toEqual([]);
        expect(match.stalls, label).toEqual([]);
        expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
        for (const record of match.commandLog)
          if (
            record.command.kind === "TUNNEL" ||
            record.command.kind === "BOMB_RUN" ||
            record.command.kind === "ASSEMBLE"
          )
            dwarfCommands += 1;
      }
    // The Dwarf policy plays the new commands (the generic one never did).
    expect(dwarfCommands).toBeGreaterThan(0);
  }, 900_000);

  it("is deterministic and bounded in a Dwarf match", () => {
    const setup = goblinSetupV7(["DWARF", "ORIGINAL"], 3);
    const first = runAiMatchV7(setup, { maxRounds: 25 });
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
    expect(runAiMatchV7(setup, { maxRounds: 25 }).stateHash).toBe(
      first.stateHash,
    );
  }, 300_000);
});
