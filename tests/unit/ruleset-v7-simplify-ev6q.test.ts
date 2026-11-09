import { describe, expect, it } from "vitest";
import { publicThreatenedTilesForPolicyV7 } from "../../src/ai/v7";
import {
  MIND_CONTROL_RANGE_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TUNNEL_MIN_RANGE_V7,
  TUNNEL_RANGE_V7,
  applyCommandV7,
  controlledByBrainV7,
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { boardMapTargetsV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  TILE_ABILITIES_V7,
  tileActionPlanForSelectionV7,
  type TileActionPlanV7,
} from "../../src/render/canvas/tile-actions-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import { glossaryEntryV7 } from "../../src/render/unit-glossary-v7";
import { unitCandidatesV7 } from "../fixtures/v7-dinosaur-ai";
import { dwarfFieldV7, tunnelV7 } from "../fixtures/v7-dwarf";
import {
  DWARF_MOLE_ROAD_V7,
  dwarfMoleRoadFixtureV7,
} from "../fixtures/v7-dwarf-ui";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7 } from "../fixtures/v7-ice-folk";
import {
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
} from "../fixtures/v7-martian";
import { activeIdV7, at } from "../fixtures/v7-revision20";

// `pulp_wars-ev6q` (7r129): one tile, one meaning, by rule. The Martian
// Brain has no attack (Mind Control is its attack) and holds any number of
// units; the Steam Mole walks one tile (Roads give it nothing) and tunnels
// 2 or 3; the Ice Witch's Frost Bolt flies exactly 2 tiles. The fields are
// the two-seat 11 x 11 Martian field: seat 0's capital (8, 8), seat 1's
// (2, 8), villages (5, 5), (8, 5), (5, 8); every other land tile is Grass.

const reach = (from: CoordV7, to: CoordV7): number =>
  Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));

const key = (where: CoordV7): string => `${where.x},${where.y}`;

const NEIGHBOURS = (of: CoordV7): readonly CoordV7[] =>
  [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1]
      .filter((dx) => dx !== 0 || dy !== 0)
      .map((dx) => at(of.x + dx, of.y + dy)),
  );

const activeView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, activeIdV7(state));

/** The selected unit's tile plan and its unarmed board targets. */
function boardOf(
  state: GameStateV7,
  where: CoordV7,
): {
  readonly plan: TileActionPlanV7 | null;
  readonly targets: ReturnType<typeof boardMapTargetsV7>;
} {
  const view = activeView(state);
  const commands = queryPlayerCommandsV7(view);
  const unitId = unitAtV7(state, where).id;
  return {
    plan: tileActionPlanForSelectionV7(view, commands, unitId),
    targets: boardMapTargetsV7(view, commands, {
      selection: { kind: "UNIT", unitId },
      selectedUnitId: unitId,
      selectedAchievement: null,
    }),
  };
}

/** Every tile the selection marks, with the actions each one means. */
function meanings(
  state: GameStateV7,
  where: CoordV7,
): ReadonlyMap<string, readonly string[]> {
  const { plan, targets } = boardOf(state, where);
  const result = new Map<string, string[]>();
  for (const tile of plan?.tiles ?? []) {
    expect(tile.chooser, key(tile.at)).toBe(false);
    result.set(
      key(tile.at),
      tile.actions.map((action) => action.id),
    );
  }
  for (const target of targets)
    if (!result.has(key(target.at)))
      result.set(key(target.at), [target.family]);
  return result;
}

describe("the identity (pulp_wars-ev6q)", () => {
  it("was 7r129 after 7r128, whose save key is obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r138");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r138.current");
    expect(PRIOR_RULESET_7_IDS.at(-10)).toBe("pulp-wars-poc-7r128");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-10)).toBe(
      "pulpWars.save.v7r128.current",
    );
  });
});

describe("the Martian Brain: Mind Control is its attack (pulp_wars-ev6q)", () => {
  const BRAIN = at(5, 3);
  const brainField = (more: Parameters<typeof martianFieldV7>[0] = []) =>
    martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: BRAIN },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      { seat: 1, role: "KNIGHT", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ...more,
    ]);

  it("has no attack: Attack 0, Range 0, no ATTACK ability, Defense and HP unchanged", () => {
    const rule = effectiveRoleRuleV7("CAPTAIN", "MARTIAN");
    expect(rule.abilities).toEqual(["CAPTURE", "RALLY", "MIND_CONTROL"]);
    expect([rule.attack2, rule.range, rule.minimumRange]).toEqual([0, 0, 0]);
    expect([rule.maxHp, rule.defense2, rule.move]).toEqual([8, 2, 1]);
    expect(MIND_CONTROL_RANGE_V7).toBe(1);
    // The unit card's convention for a unit with no attack (the Stargazer).
    expect(
      recruitmentRolePresentationV7("CAPTAIN", "MARTIAN").restrictions,
    ).toContain("Can't attack or strike back.");
  });

  it("is offered no Attack and is rejected when it tries one", () => {
    const state = brainField();
    const brain = unitAtV7(state, BRAIN);
    expect(
      offeredV7(state, "ATTACK").filter(
        (command) => "unitId" in command && command.unitId === brain.id,
      ),
    ).toEqual([]);
    expect(
      rejectedV7(state, {
        kind: "ATTACK",
        unitId: brain.id,
        targetUnitId: unitAtV7(state, at(6, 3)).id,
      }),
    ).toEqual({ code: "ATTACK_NOT_LEGAL", params: { reason: "NO_ATTACK" } });
    // Mind Control is offered on both neighbours and nowhere else.
    expect(
      offeredV7(state, "MIND_CONTROL").map((command) =>
        command.kind === "MIND_CONTROL" ? command.targetUnitId : null,
      ),
    ).toEqual(
      [at(6, 3), at(4, 4)]
        .map((where) => unitAtV7(state, where).id)
        .sort((left, right) => left - right),
    );
  });

  it("never strikes back: an attack on it gets no retaliation", () => {
    // A Human Fighter attacks a Martian Brain at full HP.
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "MARTIAN"] },
    );
    const fighter = unitAtV7(state, at(4, 3));
    const result = applyCommandV7(state, activeIdV7(state), {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: unitAtV7(state, BRAIN).id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    const resolved = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(resolved.preview.defenderDies).toBe(false);
    expect(resolved.preview.retaliation).toBe(false);
    expect(resolved.preview.damageToAttacker).toBe(0);
    expect(unitAtV7(result.state, at(4, 3)).hp).toBe(fighter.hp);
  });

  it("holds more than three units: with four it still takes a fifth", () => {
    const state = brainField([
      { seat: 1, role: "FIGHTER", at: at(4, 2), controlledBy: BRAIN },
      { seat: 1, role: "FIGHTER", at: at(5, 2), controlledBy: BRAIN },
      { seat: 1, role: "GUARD", at: at(6, 2), controlledBy: BRAIN },
      { seat: 1, role: "MARKSMAN", at: at(4, 3), controlledBy: BRAIN },
    ]);
    const brainId = unitAtV7(state, BRAIN).id;
    expect(controlledByBrainV7(state.mindControlled, brainId)).toHaveLength(4);
    const take: CommandV7 = {
      kind: "MIND_CONTROL",
      unitId: brainId,
      targetUnitId: unitAtV7(state, at(6, 3)).id,
    };
    const run = playV7(state, take);
    expect(controlledByBrainV7(run.state.mindControlled, brainId)).toHaveLength(
      5,
    );
  });

  it("marks each neighbouring enemy with Mind Control alone: no Attack, no chooser", () => {
    const state = brainField();
    const marked = meanings(state, BRAIN);
    expect(marked.get("6,3")).toEqual(["MIND_CONTROL"]);
    expect(marked.get("4,4")).toEqual(["MIND_CONTROL"]);
    for (const [where, ids] of marked) {
      expect(ids, where).not.toContain("ATTACK");
      expect(ids, where).toHaveLength(1);
    }
  });

  it("the Normal AI never attacks with it and takes the neighbour", () => {
    const state = brainField();
    const candidates = unitCandidatesV7(state, BRAIN);
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.filter((candidate) => candidate.command.kind === "ATTACK"),
    ).toEqual([]);
    expect(candidates[0]?.command.kind).toBe("MIND_CONTROL");
  });
});

describe("the Steam Mole: walk 1, tunnel 2 or 3 (pulp_wars-ev6q)", () => {
  const MOLE = at(5, 3);
  const moleField = () =>
    dwarfFieldV7([
      { seat: 0, role: "GUARD", at: MOLE },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);

  it("tunnels 2 or 3 tiles and has Roads give it nothing", () => {
    expect([TUNNEL_MIN_RANGE_V7, TUNNEL_RANGE_V7]).toEqual([2, 3]);
    expect(roleMechanicsV7("GUARD", "DWARF")).toMatchObject({
      tunnelRange: 3,
      ignoresRoads: true,
    });
    // No other role of any faction ignores Roads.
    expect(roleMechanicsV7("FIGHTER", "DWARF").ignoresRoads).toBe(false);
    expect(roleMechanicsV7("GUARD", "ORIGINAL").ignoresRoads).toBe(false);
  });

  it("rejects a Tunnel to the tile next door as DESTINATION and never offers one", () => {
    const state = moleField();
    for (const to of NEIGHBOURS(MOLE))
      expect(rejectedV7(state, tunnelV7(state, MOLE, to)), key(to)).toEqual({
        code: "TUNNEL_NOT_LEGAL",
        params: { reason: "DESTINATION" },
      });
    const offered = offeredV7(state, "TUNNEL");
    expect(offered.length).toBeGreaterThan(0);
    for (const command of offered) {
      if (command.kind !== "TUNNEL") throw new Error(command.kind);
      expect(reach(MOLE, command.to)).toBeGreaterThanOrEqual(2);
      expect(reach(MOLE, command.to)).toBeLessThanOrEqual(3);
    }
  });

  it("offers and digs Tunnels 2 and 3 tiles away", () => {
    const state = moleField();
    const offered = offeredV7(state, "TUNNEL");
    for (const to of [at(7, 3), at(5, 1), at(3, 1), at(8, 3), at(2, 6)])
      expect(offered, key(to)).toContainEqual(tunnelV7(state, MOLE, to));
    const run = playV7(state, tunnelV7(state, MOLE, at(7, 3)));
    expect(run.events[0]).toMatchObject({
      kind: "UNIT_TUNNELLED",
      from: MOLE,
      to: at(7, 3),
    });
  });

  it("walks one tile on a Road, where a Hammerer walks two; the threat estimates agree", () => {
    const state = dwarfMoleRoadFixtureV7();
    const A = DWARF_MOLE_ROAD_V7;
    const moveEnds = (from: CoordV7): readonly CoordV7[] =>
      offeredV7(state, "MOVE").flatMap((command) =>
        command.kind === "MOVE" && command.unitId === unitAtV7(state, from).id
          ? [command.path.at(-1) as CoordV7]
          : [],
      );
    // The Road works for the Hammerer: it reaches two tiles along it.
    expect(
      moveEnds(A.hammerer).some((end) => reach(A.hammerer, end) === 2),
    ).toBe(true);
    // The Mole on the same Road never goes beyond the tile next door.
    const ends = moveEnds(A.mole);
    expect(ends.length).toBeGreaterThan(0);
    for (const end of ends) expect(reach(A.mole, end), key(end)).toBe(1);
    // A two-step Move along the Road is rejected.
    const along: CommandV7 = {
      kind: "MOVE",
      unitId: unitAtV7(state, A.mole).id,
      path: [at(6, 2), at(7, 2)],
    };
    expect(rejectedV7(state, along).code).toBe("MOVEMENT_ILLEGAL");
    // The engine's threat envelope and the Normal AI's agree: Move 1 and
    // an adjacent attack, so nothing beyond 2 tiles (3 along the Road
    // before 7r129).
    const view = viewForV7(state, activeIdV7(state));
    const mole = view.units.find(
      (unit) => unit.id === unitAtV7(state, A.mole).id,
    );
    if (mole === undefined) throw new Error("no Mole");
    const engine = queryThreatenedTilesV7(view, mole.id);
    const policy = publicThreatenedTilesForPolicyV7(view, mole);
    expect(engine.length).toBeGreaterThan(0);
    for (const tile of [...engine, ...policy])
      expect(reach(A.mole, tile), key(tile)).toBeLessThanOrEqual(2);
    expect(new Set(policy.map(key))).toEqual(new Set(engine.map(key)));
  });

  it("gives every tile of the selected Mole one meaning: Move or Attack next to it, Tunnel 2 or 3 away", () => {
    const state = dwarfMoleRoadFixtureV7();
    const A = DWARF_MOLE_ROAD_V7;
    const tunnel = TILE_ABILITIES_V7.find((ability) => ability.id === "TUNNEL");
    expect(tunnel?.replacesMove).toBe(true);
    const marked = meanings(state, A.mole);
    expect(marked.get(key(A.fighter))).toEqual(["ATTACK"]);
    expect(marked.get("7,2")).toEqual(["TUNNEL"]);
    for (const [where, ids] of marked) {
      const [x, y] = where.split(",").map(Number) as [number, number];
      const distance = reach(A.mole, at(x, y));
      expect(ids, where).toHaveLength(1);
      if (distance === 1) expect(["MOVE", "ATTACK"], where).toContain(ids[0]);
      else expect(ids, where).toEqual(["TUNNEL"]);
    }
  });

  it("the Normal AI tunnels 2 or 3 tiles and walks 1", () => {
    // The Dwarf AI's defence tunnel (tests/unit/ruleset-v7-dwarf-ai.test.ts):
    // a Mole with a Hammerer beside it and an enemy Catapult in reach.
    const from = at(9, 5);
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "GUARD", at: from },
        { seat: 0, role: "FIGHTER", at: at(10, 5) },
        { seat: 1, role: "CATAPULT", at: at(6, 6) },
      ],
      { factions: ["DWARF", "CANDY"] },
    );
    const candidates = unitCandidatesV7(state, from);
    const tunnels = candidates.filter(
      (candidate) => candidate.command.kind === "TUNNEL",
    );
    expect(tunnels.length).toBeGreaterThan(0);
    for (const { command } of tunnels) {
      if (command.kind !== "TUNNEL") throw new Error(command.kind);
      expect(reach(from, command.to)).toBeGreaterThanOrEqual(2);
      expect(reach(from, command.to)).toBeLessThanOrEqual(3);
    }
    for (const { command } of candidates)
      if (command.kind === "MOVE")
        expect(reach(from, command.path.at(-1) as CoordV7)).toBe(1);
  });
});

describe("the Ice Witch (pulp_wars-ev6q; her Frost Bolt went with pulp_wars-xv0t)", () => {
  const WITCH = at(5, 3);
  const witchField = () =>
    iceFieldV7([
      { seat: 0, role: "CAPTAIN", at: WITCH },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      { seat: 1, role: "MARKSMAN", at: at(3, 1) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);

  it("marks a neighbouring enemy as Attack alone and nothing 2 away; her Cold Snap freezes the neighbour", () => {
    const state = witchField();
    const marked = meanings(state, WITCH);
    expect(marked.get("6,3")).toEqual(["ATTACK"]);
    expect(marked.has("3,1")).toBe(false);
    for (const [where, ids] of marked) expect(ids, where).toHaveLength(1);
    expect(offeredV7(state, "COLD_SNAP")).toEqual([
      { kind: "COLD_SNAP", unitId: unitAtV7(state, WITCH).id },
    ]);
    const run = playV7(state, {
      kind: "COLD_SNAP",
      unitId: unitAtV7(state, WITCH).id,
    });
    expect(run.events[0]).toMatchObject({
      kind: "UNITS_FROZEN",
      source: "COLD_SNAP",
      results: [{ unitId: unitAtV7(state, at(6, 3)).id, turnsLeft: 1 }],
    });
  });
});

describe("the texts (pulp_wars-ev6q)", () => {
  it("drop the Brain's limit and give the Mole's reach", () => {
    expect(glossaryEntryV7("MIND_CONTROL").text).toMatch(/as many as it likes/);
    expect(glossaryEntryV7("MIND_CONTROL").text).not.toMatch(/three/);
    expect(glossaryEntryV7("TUNNEL").text).toMatch(/two or three tiles away/);
    expect(glossaryEntryV7("NO_ROADS").text).toMatch(/Roads do not speed it/);
    expect(
      recruitmentRolePresentationV7("GUARD", "DWARF").restrictions,
    ).toContain("Roads do not speed it up.");
  });
});
