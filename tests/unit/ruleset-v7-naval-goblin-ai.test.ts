import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  publicDangerForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  NAVAL_COUNTER_TRAINING_PRIORITY_V7,
  NAVAL_FLEET_RESEARCH_PRIORITY_V7,
  NAVAL_TORPEDO_PRIORITIES_V7,
  navalAttackBlastOnAttackerV7,
  navalBranchResearchV7,
  navalCounterRoleV7,
  navalFleetFactsV7,
  navalTorpedoPriorityV7,
  type NavalToolsV7,
} from "../../src/ai/v7-naval";
import {
  FIRE_RAFT_APPROACH_PRIORITY_V7,
  FIRE_RAFT_KABOOM_PRIORITY_V7,
  navalDreadnoughtCrowdRejectedV7,
} from "../../src/ai/v7-naval-goblin";
import {
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  NAVAL_TECHS_V7,
  movedActivationV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Themed naval branches, the Goblin Scrap Fleet's Normal AI
// (`pulp_wars-5ti.16`, docs/product/RULESET_7_NAVAL_FACTIONS.md section
// 3.6): the Fire Raft's Kaboom afloat and its approach, both sides of the
// Scrap Dreadnought's death blast, and the training and research that put
// the Goblin ships to sea, each on a small hand-built strait (rows 3 and 7
// Shallow Water, rows 4 to 6 Deep Water). Seat 0 decides.

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly embarkedAt?: CoordV7;
  readonly moved?: boolean;
}

function strait(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly PieceV7[],
  technologies: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ] = [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
): GameStateV7 {
  let state = navalArenaV7({
    factions,
    technologies,
    units: pieces.map((piece) => ({
      seat: piece.seat,
      role: piece.role,
      at: piece.at,
    })),
  });
  for (const piece of pieces) {
    const unit = navalUnitAtV7(state, piece.at);
    const patch: Partial<UnitStateV7> = {
      ...(piece.hp === undefined ? {} : { hp: piece.hp }),
      ...(piece.embarkedAt === undefined
        ? {}
        : { at: piece.embarkedAt, form: "EMBARKED" as const }),
      ...(piece.moved === true ? { activation: movedActivationV7(unit) } : {}),
    };
    if (Object.keys(patch).length > 0)
      state = patchNavalUnitV7(state, unit.id, patch);
  }
  return state;
}

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, seatV7(state, 0).id);
const kaboom = (unitId: number): CommandV7 => ({
  kind: "KABOOM",
  unitId: unitId as UnitId,
});

/** The tools the policy lends the naval rules, rebuilt from its exports. */
function toolsOf(view: PlayerViewV7): NavalToolsV7 {
  const commands = queryPlayerCommandsV7(view);
  return {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    danger: (inView, unit, at) => publicDangerForPolicyV7(inView, unit, at),
    reaches: (hostile, at) =>
      publicThreatenedTilesForPolicyV7(view, hostile).some(
        (tile) => tile.x === at.x && tile.y === at.y,
      ),
    project: projectPublicUnitForPolicyV7,
    moveDestinations: (unitId) =>
      commands.flatMap((command) => {
        const end = command.kind === "MOVE" ? command.path.at(-1) : undefined;
        return command.kind === "MOVE" &&
          command.unitId === unitId &&
          end !== undefined
          ? [end]
          : [];
      }),
    commands,
  };
}

function viewUnit(view: PlayerViewV7, id: number) {
  const unit = view.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("unit not visible");
  return unit;
}

/** The best candidate of one unit, in the policy's order. */
function bestOf(view: PlayerViewV7, unitId: number): CommandV7 {
  const best = chooseNormalCommandV7(view).candidates.find(
    (item) => "unitId" in item.command && item.command.unitId === unitId,
  );
  if (best === undefined) throw new Error("the unit has no candidate");
  return best.command;
}

const RAFT: CoordV7 = { x: 3, y: 5 };
/** A Human transport: a Fighter afloat on `at` (parked first on land). */
const transport = (at: CoordV7, parked: CoordV7): PieceV7 => ({
  seat: 1,
  role: "FIGHTER",
  at: parked,
  embarkedAt: at,
});

describe("a Fire Raft's Kaboom afloat (section 3.6)", () => {
  it("beside a hostile Battleship and a transport, Kabooms rather than rams", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: RAFT, moved: true },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        transport({ x: 4, y: 4 }, { x: 1, y: 9 }),
      ],
    );
    const view = viewOf(state);
    const raft = navalUnitAtV7(state, RAFT);
    // The Ram is on offer (the raft has moved): the blast is chosen over it.
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => command.kind === "ATTACK" && command.unitId === raft.id,
      ),
    ).toBe(true);
    expect(scoreCommandV7(view, kaboom(raft.id)).priority).toBe(
      FIRE_RAFT_KABOOM_PRIORITY_V7,
    );
    expect(bestOf(view, raft.id)).toEqual(kaboom(raft.id));
    expect(chooseNormalCommandV7(view).command).toEqual(kaboom(raft.id));
  });

  it("without Powder Kegs neither offers nor chooses a Kaboom", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: RAFT, moved: true },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        transport({ x: 4, y: 4 }, { x: 1, y: 9 }),
      ],
      [["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"], NAVAL_TECHS_V7],
    );
    const view = viewOf(state);
    const raft = navalUnitAtV7(state, RAFT);
    expect(queryPlayerCommandsV7(view)).not.toContainEqual(kaboom(raft.id));
    expect(
      chooseNormalCommandV7(view).candidates.some(
        (item) => item.command.kind === "KABOOM",
      ),
    ).toBe(false);
  });

  it("two tiles from a cluster, moves next to it, then Kabooms", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        transport({ x: 4, y: 4 }, { x: 1, y: 9 }),
        transport({ x: 4, y: 6 }, { x: 2, y: 9 }),
      ],
    );
    const view = viewOf(state);
    const raft = navalUnitAtV7(state, { x: 1, y: 5 });
    const first = bestOf(view, raft.id);
    expect(first.kind).toBe("MOVE");
    if (first.kind !== "MOVE") throw new Error("no Move");
    const end = first.path.at(-1);
    expect(end).toEqual({ x: 3, y: 5 });
    expect(scoreCommandV7(view, first).priority).toBe(
      FIRE_RAFT_APPROACH_PRIORITY_V7,
    );
    const after = patchNavalUnitV7(state, raft.id, {
      at: end ?? raft.at,
      activation: movedActivationV7(raft, first.path.length),
    });
    expect(bestOf(viewOf(after), raft.id)).toEqual(kaboom(raft.id));
  });

  it("rams instead when its blast would hit an own Dreadnought and only one Patrol Boat", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: RAFT, moved: true },
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const raft = navalUnitAtV7(state, RAFT);
    const boat = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(queryPlayerCommandsV7(view)).toContainEqual(kaboom(raft.id));
    expect(scoreCommandV7(view, kaboom(raft.id)).priority).toBe(-1);
    expect(bestOf(view, raft.id)).toEqual({
      kind: "ATTACK",
      unitId: raft.id,
      targetUnitId: boat.id,
    });
  });

  it("a doomed raft with one hostile neighbour Kabooms", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: RAFT, hp: 3 },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const raft = navalUnitAtV7(state, RAFT);
    expect(scoreCommandV7(view, kaboom(raft.id)).priority).toBe(
      FIRE_RAFT_KABOOM_PRIORITY_V7,
    );
    expect(bestOf(view, raft.id)).toEqual(kaboom(raft.id));
  });

  it("a raft out of danger does not spend itself on one boat it can ram", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: RAFT, moved: true },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 }, hp: 6 },
      ],
    );
    const view = viewOf(state);
    const raft = navalUnitAtV7(state, RAFT);
    expect(scoreCommandV7(view, kaboom(raft.id)).priority).toBe(-1);
    expect(bestOf(view, raft.id).kind).toBe("ATTACK");
  });
});

describe("the Scrap Dreadnought, from both sides (section 3.6)", () => {
  it("a Human Patrol Boat boards an 8-HP Dreadnought rather than a Submarine finishing it from the next tile", () => {
    const state = strait(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 0, role: "SUBMARINE", at: { x: 5, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp: 8 },
      ],
    );
    const view = viewOf(state);
    const boat = navalUnitAtV7(state, { x: 3, y: 5 });
    const dreadnought = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(chooseNormalCommandV7(view).command).toEqual({
      kind: "BOARD",
      unitId: boat.id,
      targetUnitId: dreadnought.id,
    });
  });

  it("counts the blast of a Dreadnought a torpedo sinks: no free shot for a Submarine the blast would sink", () => {
    const scene = (subHp: number) =>
      strait(
        ["ORIGINAL", "GOBLIN"],
        [
          { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 }, hp: subHp },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp: 9 },
        ],
      );
    const facts = (state: GameStateV7) => {
      const view = viewOf(state);
      const sub = navalUnitAtV7(state, { x: 3, y: 5 });
      const dreadnought = viewUnit(
        view,
        navalUnitAtV7(state, { x: 4, y: 5 }).id,
      );
      const preview = queryCombatPreviewV7(view, sub.id, dreadnought.id);
      if (preview === null) throw new Error("no torpedo");
      const blast = navalAttackBlastOnAttackerV7(
        view,
        sub.id,
        dreadnought.id,
        preview,
      );
      const command: CommandV7 = {
        kind: "ATTACK",
        unitId: sub.id,
        targetUnitId: dreadnought.id,
      };
      return {
        blast,
        torpedo: navalTorpedoPriorityV7(
          dreadnought,
          preview,
          blast >= sub.hp - preview.damageToAttacker,
        ),
        strategic: scoreCommandV7(view, command).strategicValue,
      };
    };
    // A full Submarine survives the blast (7 of 12): the free shot stands.
    const full = facts(scene(12));
    expect(full.blast).toBe(7);
    expect(full.torpedo).toBe(NAVAL_TORPEDO_PRIORITIES_V7.BATTLESHIP);
    // At 5 HP the blast would sink it: no torpedo priority, and the loss
    // of the Submarine is in the attack's value.
    const weak = facts(scene(5));
    expect(weak.blast).toBe(5);
    expect(weak.torpedo).toBeNull();
    expect(weak.strategic).toBeLessThan(full.strategic);
  });

  it("does not crowd an own Dreadnought that a hostile Submarine reaches", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 3 } },
        { seat: 1, role: "SUBMARINE", at: { x: 5, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const tools = toolsOf(view);
    const fleet = navalFleetFactsV7(
      view,
      (ownerId) => ownerId !== view.viewer.id,
    );
    const raft = navalUnitAtV7(state, { x: 3, y: 3 });
    const dreadnought = navalUnitAtV7(state, { x: 3, y: 5 });
    const rejected = (unitId: number, to: CoordV7) =>
      navalDreadnoughtCrowdRejectedV7(
        view,
        tools,
        fleet,
        viewUnit(view, unitId),
        to,
      );
    // The raft does not come beside the hunted Dreadnought ...
    expect(rejected(raft.id, { x: 2, y: 4 })).toBe(true);
    expect(rejected(raft.id, { x: 1, y: 3 })).toBe(false);
    // ... nor the Dreadnought beside the raft where the Submarine reaches.
    expect(rejected(dreadnought.id, { x: 4, y: 4 })).toBe(true);
    expect(rejected(dreadnought.id, { x: 2, y: 6 })).toBe(false);
    // The policy keeps neither Move.
    const ends = (unitId: number) =>
      chooseNormalCommandV7(view).candidates.flatMap((item) => {
        const command = item.command;
        const end = command.kind === "MOVE" ? command.path.at(-1) : undefined;
        return command.kind === "MOVE" &&
          command.unitId === unitId &&
          end !== undefined
          ? [`${String(end.x)},${String(end.y)}`]
          : [];
      });
    expect(ends(raft.id)).not.toContain("2,4");
    expect(ends(dreadnought.id)).not.toContain("4,4");
    // Without a hostile Submarine nothing is refused.
    const calm = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 5 } },
      ],
    );
    const calmView = viewOf(calm);
    expect(
      navalDreadnoughtCrowdRejectedV7(
        calmView,
        toolsOf(calmView),
        navalFleetFactsV7(
          calmView,
          (ownerId) => ownerId !== calmView.viewer.id,
        ),
        viewUnit(calmView, navalUnitAtV7(calm, { x: 1, y: 4 }).id),
        { x: 2, y: 4 },
      ),
    ).toBe(false);
  });
});

describe("the Scrap Fleet goes to sea (training and research)", () => {
  const cityId = (state: GameStateV7) => {
    const city = state.cities.find(
      (entry) => entry.ownerId === seatV7(state, 0).id,
    );
    if (city === undefined) throw new Error("no city");
    return city.id;
  };
  const facts = (view: PlayerViewV7) =>
    navalFleetFactsV7(view, (ownerId) => ownerId !== view.viewer.id);

  it("trains a Diving Barrel against a hostile Battleship in sight", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const train: CommandV7 = {
      kind: "TRAIN_NAVAL",
      cityId: cityId(state),
      at: NAVAL_ARENA_PORTS_V7[0],
      role: "SUBMARINE",
    };
    expect(navalCounterRoleV7(facts(view), () => true)).toBe("SUBMARINE");
    expect(scoreCommandV7(view, train).priority).toBe(
      NAVAL_COUNTER_TRAINING_PRIORITY_V7,
    );
    expect(
      chooseNormalCommandV7(view).candidates.map((item) => item.command),
    ).toContainEqual(train);
  });

  it("trains a Fire Raft against a hostile Submarine in sight", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "SUBMARINE", at: { x: 8, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const trained = chooseNormalCommandV7(view).candidates.find(
      (item) => item.command.kind === "TRAIN_NAVAL",
    )?.command;
    expect(trained).toMatchObject({ role: "PATROL_BOAT" });
  });

  it("researches Powder Kegs for a fleet of two Fire Rafts, by the Seamanship rule", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
      ],
      [["SHORECRAFT", "NAVIGATION"], NAVAL_TECHS_V7],
    );
    const view = viewOf(state);
    expect(navalBranchResearchV7(view, facts(view), () => true)).toMatchObject({
      tech: "SEAMANSHIP",
    });
    expect(
      scoreCommandV7(view, { kind: "RESEARCH", tech: "SEAMANSHIP" }).priority,
    ).toBe(NAVAL_FLEET_RESEARCH_PRIORITY_V7);
  });

  it("keeps a trained Fire Raft's own numbers in the threat estimate (8 HP, sunk by one Battleship shot)", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 6, y: 4 } },
      ],
    );
    expect(
      navalUnitV7(state, navalUnitAtV7(state, { x: 3, y: 4 }).id),
    ).toMatchObject({ hp: 8, maxHp: 8 });
  });
});
