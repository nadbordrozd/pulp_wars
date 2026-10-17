import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  publicDangerForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  navalFleetFactsV7,
  navalTransportMoveRejectedV7,
  type NavalToolsV7,
} from "../../src/ai/v7-naval";
import {
  HOVER_PODS_OVERSEAS_UNITS_V7,
  hoverLaunchMoveV7,
  hoverLaunchTilesV7,
  hoverPodsResearchDueV7,
} from "../../src/ai/v7-naval-martian";
import {
  parseGameStateV7,
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
  NAVAL_TECHS_V7,
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Themed naval branches, the Martian Hover Fleet's Normal AI
// (`pulp_wars-5ti.19`, docs/product/RULESET_7_NAVAL_FACTIONS.md section
// 6.6): hover launches from the beach as starts of the naval plan, the
// research of Hover Pods, and the Shields at sea, each on a small
// hand-built strait (rows 0 to 2 and 8 to 10 land, rows 3 and 7 Shallow
// Water, rows 4 to 6 Deep Water; seat 0's capital on (5, 2), seat 1's on
// (5, 8)). Seat 0 decides; seat 1's capital is the overseas target.

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** An embarked land unit (a transport) on this water tile. */
  readonly embarkedAt?: CoordV7;
  /** The tiles its Move entered this turn (it moved and may still act). */
  readonly ran?: number;
}

function strait(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly PieceV7[],
  technologies: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ] = [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
  ports: readonly [boolean, boolean] = [true, true],
): GameStateV7 {
  let state = navalArenaV7({
    factions,
    technologies,
    ports,
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
      ...(piece.ran === undefined
        ? {}
        : {
            activation: {
              ...unit.activation,
              moved: true,
              movedPathLength: piece.ran,
            },
          }),
    };
    if (Object.keys(patch).length > 0)
      state = patchNavalUnitV7(state, unit.id, patch);
  }
  return state;
}

const WITHOUT_HOVER_PODS: readonly TechnologyIdV7[] = NAVAL_TECHS_V7.filter(
  (tech) => tech !== "SEAMANSHIP" && tech !== "SUBMERSIBLES",
);
const BEACH: CoordV7 = { x: 2, y: 2 };

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, seatV7(state, 0).id);
const same = (left: CoordV7 | undefined, right: CoordV7): boolean =>
  left !== undefined && left.x === right.x && left.y === right.y;
const onWater = (command: CommandV7): boolean =>
  command.kind === "MOVE" &&
  [3, 4, 5, 6, 7].includes(command.path.at(-1)?.y ?? -1);

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

/** The best candidate of one unit, in the policy's order (null: none). */
function candidateOf(view: PlayerViewV7, unitId: number): CommandV7 | null {
  return (
    chooseNormalCommandV7(view).candidates.find(
      (item) => "unitId" in item.command && item.command.unitId === unitId,
    )?.command ?? null
  );
}

/** The best candidate of one unit, in the policy's order. */
function bestOf(view: PlayerViewV7, unitId: number): CommandV7 {
  const best = candidateOf(view, unitId);
  if (best === null) throw new Error("the unit has no candidate");
  return best;
}

/** A Martian Grunt on the beach of seat 0, bound for seat 1's capital. */
function beach(
  technologies: readonly TechnologyIdV7[] = NAVAL_TECHS_V7,
  ports: readonly [boolean, boolean] = [false, true],
  extra: readonly PieceV7[] = [],
): GameStateV7 {
  return strait(
    ["MARTIAN", "ORIGINAL"],
    [{ seat: 0, role: "FIGHTER", at: BEACH }, ...extra],
    [technologies, NAVAL_TECHS_V7],
    ports,
  );
}

describe("hover launches in the naval plan (section 6.6)", () => {
  it("a Grunt on a coast with Hover Pods, an overseas target, and no Port launches from the beach", () => {
    const state = beach();
    const view = viewOf(state);
    const grunt = navalUnitAtV7(state, BEACH);
    // Every free Shallow Water tile beside the home land is a launch tile.
    const launches = hoverLaunchTilesV7(view, (at) => at.y <= 2);
    expect(launches).toContainEqual({ x: 2, y: 3 });
    expect(launches.every((at) => at.y === 3)).toBe(true);
    const best = bestOf(view, grunt.id);
    expect(best.kind).toBe("MOVE");
    if (best.kind !== "MOVE") return;
    expect(best.path).toHaveLength(1);
    expect(best.path[0]?.y).toBe(3);
    expect(
      hoverLaunchMoveV7(
        view,
        viewUnit(view, grunt.id),
        best.path[0] as CoordV7,
      ),
    ).toBe(true);
    // The launch is played: the Grunt is a transport on the water.
    const after = acceptV7(state, 0, best).state;
    expect(after.units.find((unit) => unit.id === grunt.id)?.form).toBe(
      "EMBARKED",
    );
  });

  it("the same seat without Hover Pods walks to its Port", () => {
    const state = beach(WITHOUT_HOVER_PODS, [true, true]);
    const view = viewOf(state);
    const grunt = navalUnitAtV7(state, BEACH);
    const best = bestOf(view, grunt.id);
    expect(best.kind).toBe("MOVE");
    expect(onWater(best)).toBe(false);
    if (best.kind !== "MOVE") return;
    // One step nearer the Port on (4, 3).
    const to = best.path.at(-1) as CoordV7;
    expect(Math.max(Math.abs(to.x - 4), Math.abs(to.y - 3))).toBe(1);
  });

  it("no launch into an unescorted hostile Battleship's reach; with a Skimmer beside the tile it launches", () => {
    const BATTLESHIP: PieceV7 = {
      seat: 1,
      role: "BATTLESHIP",
      at: { x: 2, y: 5 },
    };
    // A Skimmer far off: the seat has a warship, but none escorts the beach.
    const lonely = beach(
      NAVAL_TECHS_V7,
      [false, true],
      [BATTLESHIP, { seat: 0, role: "PATROL_BOAT", at: { x: 10, y: 3 } }],
    );
    const view = viewOf(lonely);
    const grunt = viewUnit(view, navalUnitAtV7(lonely, BEACH).id);
    const tools = toolsOf(view);
    const facts = navalFleetFactsV7(view, tools.isHostile);
    for (const x of [1, 2, 3])
      expect(
        navalTransportMoveRejectedV7(view, tools, facts, grunt, { x, y: 3 }),
      ).toBe(true);
    // It stays ashore (no candidate, or a Move on land).
    const held = candidateOf(view, grunt.id);
    expect(held === null || !onWater(held)).toBe(true);
    // A Skimmer beside the launch tile escorts it.
    const escorted = beach(
      NAVAL_TECHS_V7,
      [false, true],
      [BATTLESHIP, { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 } }],
    );
    const escortedView = viewOf(escorted);
    const escortedTools = toolsOf(escortedView);
    expect(
      navalTransportMoveRejectedV7(
        escortedView,
        escortedTools,
        navalFleetFactsV7(escortedView, escortedTools.isHostile),
        viewUnit(escortedView, navalUnitAtV7(escorted, BEACH).id),
        { x: 2, y: 3 },
      ),
    ).toBe(false);
    const escortedLaunch = bestOf(
      escortedView,
      navalUnitAtV7(escorted, BEACH).id,
    );
    expect(onWater(escortedLaunch)).toBe(true);
    if (escortedLaunch.kind === "MOVE")
      expect(
        Math.max(
          Math.abs((escortedLaunch.path.at(-1)?.x ?? 0) - 3),
          Math.abs((escortedLaunch.path.at(-1)?.y ?? 0) - 4),
        ),
      ).toBeLessThanOrEqual(1);
  });
});

describe("the research of Hover Pods (section 6.6)", () => {
  const research: CommandV7 = { kind: "RESEARCH", tech: "SEAMANSHIP" };
  const sailing: readonly TechnologyIdV7[] = ["SHORECRAFT", "NAVIGATION"];

  it("is researched with two foot units bound overseas, with no warship", () => {
    const state = beach(
      sailing,
      [true, true],
      [{ seat: 0, role: "FIGHTER", at: { x: 8, y: 2 } }],
    );
    const view = viewOf(state);
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "RESEARCH" && command.tech === "SEAMANSHIP",
      ),
    ).toBe(true);
    expect(scoreCommandV7(view, research).priority).toBe(1280);
    const best = chooseNormalCommandV7(view).candidates.find(
      (item) => item.command.kind === "RESEARCH",
    );
    expect(best?.command).toEqual(research);
  });

  it("is not asked for by the naval plan for one foot unit, nor by a seat whose tree has no Hover Pods", () => {
    // The capital's own Grunt stands on its center (a capture unit too):
    // with the beach Grunt that is two; take the beach Grunt away.
    const single = strait(
      ["MARTIAN", "ORIGINAL"],
      [],
      [sailing, NAVAL_TECHS_V7],
    );
    expect(scoreCommandV7(viewOf(single), research).priority).toBeLessThan(
      1280,
    );
    const offered = (): boolean => true;
    expect(
      hoverPodsResearchDueV7(
        viewOf(single),
        true,
        HOVER_PODS_OVERSEAS_UNITS_V7,
        offered,
      ),
    ).toBe(true);
    expect(
      hoverPodsResearchDueV7(
        viewOf(single),
        true,
        HOVER_PODS_OVERSEAS_UNITS_V7 - 1,
        offered,
      ),
    ).toBe(false);
    expect(
      hoverPodsResearchDueV7(
        viewOf(single),
        false,
        HOVER_PODS_OVERSEAS_UNITS_V7,
        offered,
      ),
    ).toBe(false);
    const human = strait(
      ["ORIGINAL", "MARTIAN"],
      [],
      [sailing, NAVAL_TECHS_V7],
    );
    expect(
      hoverPodsResearchDueV7(
        viewOf(human),
        true,
        HOVER_PODS_OVERSEAS_UNITS_V7,
        offered,
      ),
    ).toBe(false);
  });
});

describe("Shields at sea (section 6.6)", () => {
  it("a Skimmer rams a Patrol Boat it would not ram without its Shield", () => {
    // A Skimmer at 4 HP beside a Human Patrol Boat: its Ram deals 6 and the
    // boat's reply (3) falls on the Shield first (2), so it keeps 3 HP;
    // without the Shield the reply (4) sinks it.
    const pieces: readonly PieceV7[] = [
      { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, hp: 4, ran: 1 },
      { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
    ];
    const shielded = strait(["MARTIAN", "ORIGINAL"], pieces);
    const skimmer = navalUnitAtV7(shielded, { x: 3, y: 5 });
    const boat = navalUnitAtV7(shielded, { x: 4, y: 5 });
    const ram: CommandV7 = {
      kind: "ATTACK",
      unitId: skimmer.id as UnitId,
      targetUnitId: boat.id as UnitId,
    };
    expect(
      queryCombatPreviewV7(viewOf(shielded), skimmer.id, boat.id),
    ).toMatchObject({
      ram: true,
      damageToDefender: 6,
      attackerShieldDamage: 2,
      damageToAttacker: 3,
      attackerDies: false,
    });
    expect(bestOf(viewOf(shielded), skimmer.id)).toEqual(ram);
    const bare = parseGameStateV7({
      ...shielded,
      shields: shielded.shields.filter((entry) => entry.unitId !== skimmer.id),
    });
    if (bare === null) throw new Error("invalid state");
    expect(
      queryCombatPreviewV7(viewOf(bare), skimmer.id, boat.id),
    ).toMatchObject({ damageToAttacker: 4, attackerDies: true });
    expect(candidateOf(viewOf(bare), skimmer.id)).not.toEqual(ram);
  });

  it("counts a ship's Shield in the threat estimate: a full Skimmer is not in lethal reach of a hostile Ram", () => {
    const state = strait(
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 5 } },
      ],
    );
    const skimmer = navalUnitAtV7(state, { x: 3, y: 5 });
    const view = viewOf(state);
    const shielded = publicDangerForPolicyV7(
      view,
      viewUnit(view, skimmer.id),
      skimmer.at,
    );
    const bare = parseGameStateV7({
      ...state,
      shields: state.shields.filter((entry) => entry.unitId !== skimmer.id),
    });
    if (bare === null) throw new Error("invalid state");
    const bareView = viewOf(bare);
    const unshielded = publicDangerForPolicyV7(
      bareView,
      viewUnit(bareView, skimmer.id),
      skimmer.at,
    );
    expect(unshielded).toBeGreaterThanOrEqual(skimmer.hp);
    expect(shielded).toBe(unshielded - 2);
    expect(shielded).toBeLessThan(skimmer.hp);
  });
});

describe("the Hover Fleet goes to sea in its three roles (training and the coast)", () => {
  const cityId = (state: GameStateV7) => {
    const city = state.cities.find(
      (entry) => entry.ownerId === seatV7(state, 0).id,
    );
    if (city === undefined) throw new Error("no city");
    return city.id;
  };

  it("trains a Bathysphere against a hostile Battleship in sight", () => {
    const state = strait(
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const train: CommandV7 = {
      kind: "TRAIN_NAVAL",
      cityId: cityId(state),
      at: { x: 4, y: 3 },
      role: "SUBMARINE",
    };
    expect(
      chooseNormalCommandV7(view).candidates.map((item) => item.command),
    ).toContainEqual(train);
  });

  it("trains a Skimmer against a hostile Submarine in sight", () => {
    const state = strait(
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "SUBMARINE", at: { x: 8, y: 5 } },
      ],
    );
    const trained = chooseNormalCommandV7(viewOf(state)).candidates.find(
      (item) => item.command.kind === "TRAIN_NAVAL",
    )?.command;
    expect(trained).toMatchObject({ role: "PATROL_BOAT" });
  });

  it("a Hover Cruiser shells the enemy coast from the sea", () => {
    const state = strait(
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
      ],
    );
    const cruiser = navalUnitAtV7(state, { x: 2, y: 6 });
    const best = bestOf(viewOf(state), cruiser.id);
    expect(best.kind).toBe("ATTACK");
    if (best.kind !== "ATTACK") return;
    // A unit ashore (the Fighter on the beach or the one on the capital).
    const target = state.units.find((unit) => unit.id === best.targetUnitId);
    expect(target).toMatchObject({
      ownerId: seatV7(state, 1).id,
      form: "LAND",
    });
  });
});

describe("the other seats against the Hover Fleet (section 6.6)", () => {
  it("a Human Patrol Boat rams a hover-launched Grunt off the beach and sinks it through its Shield", () => {
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 }, ran: 1 },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 2, y: 9 },
          embarkedAt: { x: 2, y: 3 },
        },
      ],
    );
    const boat = navalUnitAtV7(state, { x: 3, y: 4 });
    const grunt = navalUnitAtV7(state, { x: 2, y: 3 });
    const best = bestOf(viewOf(state), boat.id);
    expect(best).toEqual({
      kind: "ATTACK",
      unitId: boat.id,
      targetUnitId: grunt.id,
    });
    expect(
      queryCombatPreviewV7(viewOf(state), boat.id, grunt.id),
    ).toMatchObject({ defenderShieldDamage: 2, defenderDies: true });
  });

  it("reads a hostile Martian foot unit's shore launch as a move, never as an attack origin", () => {
    // Seat 1 is Martian, its Hover Pods private: the Human view assumes them.
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [{ seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } }],
      [NAVAL_TECHS_V7, WITHOUT_HOVER_PODS],
    );
    const view = viewOf(state);
    const grunt = viewUnit(view, navalUnitAtV7(state, { x: 2, y: 8 }).id);
    const threatened = publicThreatenedTilesForPolicyV7(view, grunt);
    // Range 2 from the beach row reaches row 6, never row 5.
    expect(threatened.some((at) => same(at, { x: 2, y: 6 }))).toBe(true);
    expect(threatened.some((at) => at.y <= 5)).toBe(false);
  });
});
