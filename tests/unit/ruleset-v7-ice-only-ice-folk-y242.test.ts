import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  UNIT_ROLE_IDS_V7,
  canEnterTerrainV7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  unitCracksIceV7,
  unitWalksOnIceV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleAbilityV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { validateMovementPathV7 } from "../../src/engine/v7/movement";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { publicStandTilesForPolicyV7 } from "../../src/ai/v7";
import { tileActionPlanForSelectionV7 } from "../../src/render/canvas/tile-actions-v7";
import {
  frozenArenaV7,
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

// Only the Ice Folk walk on ice (`pulp_wars-y242`, ruleset 7r132; finding 4
// of docs/product/SIMPLIFICATION_REVIEW_2026-11.md): a ground unit of every
// other kind never enters an ice tile (the slip let it walk on and stop
// there), so a free ice tile beside it means only Crack Ice, with no
// chooser. A walker or flyer of any kind crosses ice like land and never
// cracks it; a unit of the Ice Folk kind walks on it, mind-controlled too.
// On the authored strait of `v7-naval-branch.ts` (rows 0 to 2 land, row 3
// Shallow Water, rows 4 to 6 Deep Water); seat 1 is the Ice Folk and owns
// the ice unless a test says otherwise.

const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
const SHORE: CoordV7 = { x: 2, y: 2 };
const ICE1: CoordV7 = { x: 2, y: 3 };
const ICE2: CoordV7 = { x: 2, y: 4 };

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const roleWith = (
  faction: FactionIdV7,
  ability: UnitRoleAbilityV7,
): UnitRoleIdV7 => {
  const role = UNIT_ROLE_IDS_V7.find((candidate) =>
    effectiveRoleRuleV7(candidate, faction).abilities.includes(ability),
  );
  if (role === undefined) throw new Error(`${faction} has no ${ability}`);
  return role;
};
/** Seat 0 is `faction`; seat 1 is the Ice Folk and owns the ice. */
const scene = (
  faction: FactionIdV7,
  units: readonly FrozenUnitV7[],
  ice: readonly CoordV7[] = [ICE1, ICE2],
  technologies: readonly TechnologyIdV7[] = ALL,
): GameStateV7 =>
  frozenArenaV7({
    factions: [faction, "ICE_FOLK"],
    technologies: [technologies, ALL],
    units,
    ice: ice.map((at): FrozenIceV7 => ({ at, seat: 1 })),
  });
const commandsOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id));
const ofUnit = (
  commands: readonly CommandV7[],
  unitId: number,
): readonly CommandV7[] =>
  commands.filter(
    (command) => "unitId" in command && command.unitId === unitId,
  );
const moveEnds = (commands: readonly CommandV7[]): readonly CoordV7[] =>
  commands.flatMap((command) =>
    command.kind === "MOVE" ? [command.path.at(-1) as CoordV7] : [],
  );
const crackTiles = (commands: readonly CommandV7[]): readonly CoordV7[] =>
  commands.flatMap((command) =>
    command.kind === "CRACK_ICE" ? [command.at] : [],
  );

describe("a ground unit of another kind never enters ice", () => {
  it("is refused a Move onto ice or through it, and is offered none", () => {
    const state = scene("ORIGINAL", [{ seat: 0, role: "FIGHTER", at: SHORE }]);
    const fighter = navalUnitAtV7(state, SHORE);
    expect(
      rejectV7(state, 0, { kind: "MOVE", unitId: fighter.id, path: [ICE1] }),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ICE_FORBIDDEN" },
    });
    expect(validateMovementPathV7(state, fighter, [ICE1])).toEqual({
      legal: false,
      reason: "ICE_FORBIDDEN",
    });
    const ends = moveEnds(ofUnit(commandsOf(state), fighter.id));
    expect(ends.length).toBeGreaterThan(0);
    expect(ends.some((at) => same(at, ICE1) || same(at, ICE2))).toBe(false);
  });

  it("is still offered Crack Ice on that tile, which is the tile's one meaning (no chooser)", () => {
    const state = scene("ORIGINAL", [{ seat: 0, role: "FIGHTER", at: SHORE }]);
    const fighter = navalUnitAtV7(state, SHORE);
    const commands = commandsOf(state);
    expect(crackTiles(ofUnit(commands, fighter.id))).toEqual([ICE1]);
    const plan = tileActionPlanForSelectionV7(
      viewForV7(state, seatV7(state, 0).id),
      commands,
      fighter.id,
    );
    const tile = plan?.tiles.find((entry) => same(entry.at, ICE1));
    expect(tile?.actions.map((action) => action.id)).toEqual(["CRACK_ICE"]);
    expect(tile?.chooser).toBe(false);
    // No tile of the plan offers a Move and a Crack together.
    for (const entry of plan?.tiles ?? []) {
      const ids = entry.actions.map((action) => action.id);
      expect(ids.includes("MOVE") && ids.includes("CRACK_ICE")).toBe(false);
    }
    // The Crack is accepted (Glacier's thick ice takes its first crack).
    const cracked = acceptV7(state, 0, {
      kind: "CRACK_ICE",
      unitId: fighter.id,
      at: ICE1,
    });
    expect(cracked.events).toContainEqual(
      expect.objectContaining({ kind: "ICE_CRACKED", at: ICE1 }),
    );
  });

  it("is never pushed or knocked onto ice: it reads as the water it is", () => {
    const cannon = roleWith("DWARF", "KNOCKBACK");
    const state = frozenArenaV7({
      factions: ["DWARF", "ORIGINAL"],
      technologies: [ALL, ALL],
      third: { faction: "ICE_FOLK" },
      units: [
        { seat: 0, role: cannon, at: { x: 2, y: 0 } },
        { seat: 1, role: "GUARD", at: SHORE },
      ],
      ice: [{ at: ICE1, seat: 2 }],
    });
    const shooter = navalUnitAtV7(state, { x: 2, y: 0 });
    const guard = navalUnitAtV7(state, SHORE);
    expect(
      queryCombatPreviewV7(
        viewForV7(state, seatV7(state, 0).id),
        shooter.id,
        guard.id,
      )?.push,
    ).toBe("BLOCKED");
    const result = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: shooter.id,
      targetUnitId: guard.id,
    });
    expect(result.events.some((event) => event.kind === "UNIT_PUSHED")).toBe(
      false,
    );
    expect(navalUnitV7(result.state, guard.id).at).toEqual(SHORE);
  });

  it("standing on ice already (a hand-built state), it may step off, never onto more ice", () => {
    const state = scene("ORIGINAL", [{ seat: 0, role: "FIGHTER", at: ICE1 }]);
    const fighter = navalUnitAtV7(state, ICE1);
    const ends = moveEnds(ofUnit(commandsOf(state), fighter.id));
    expect(ends).toContainEqual(SHORE);
    expect(ends).not.toContainEqual(ICE2);
    const stepped = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: fighter.id,
      path: [SHORE],
    });
    expect(navalUnitV7(stepped.state, fighter.id).at).toEqual(SHORE);
  });
});

describe("who walks on ice", () => {
  it("an Ice Folk unit walks onto ice as before, and never cracks", () => {
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [ALL, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
      ice: [ICE1, ICE2].map((at): FrozenIceV7 => ({ at, seat: 0 })),
    });
    const yeti = navalUnitAtV7(state, SHORE);
    const commands = ofUnit(commandsOf(state), yeti.id);
    expect(moveEnds(commands)).toContainEqual(ICE1);
    expect(crackTiles(commands)).toEqual([]);
    const moved = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: yeti.id,
      path: [ICE1],
    });
    expect(navalUnitV7(moved.state, yeti.id).at).toEqual(ICE1);
  });

  it("a mind-controlled Ice Folk unit still walks on ice for its controller (a kind rule)", () => {
    const brain = roleWith("MARTIAN", "MIND_CONTROL");
    const base = frozenArenaV7({
      factions: ["MARTIAN", "ICE_FOLK"],
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: brain, at: { x: 1, y: 1 } },
        { seat: 1, role: "FIGHTER", at: SHORE },
      ],
      ice: [ICE1, ICE2].map((at): FrozenIceV7 => ({ at, seat: 1 })),
    });
    const yeti = navalUnitAtV7(base, SHORE);
    const martian = seatV7(base, 0).id;
    const parsed = parseGameStateV7({
      ...base,
      units: base.units.map((unit) =>
        unit.id === yeti.id
          ? {
              ...unit,
              ownerId: martian,
              homeCityId: null,
              captureEligible: false,
            }
          : unit,
      ),
      mindControlled: [
        {
          unitId: yeti.id,
          brainUnitId: navalUnitAtV7(base, { x: 1, y: 1 }).id,
          originalOwnerId: yeti.ownerId,
        },
      ],
    });
    if (parsed === null) throw new Error("the state is invalid");
    const controlled = navalUnitAtV7(parsed, SHORE);
    expect(unitWalksOnIceV7(parsed, controlled)).toBe(true);
    expect(unitCracksIceV7(parsed, controlled)).toBe(false);
    const commands = ofUnit(commandsOf(parsed), controlled.id);
    expect(moveEnds(commands)).toContainEqual(ICE1);
    expect(crackTiles(commands)).toEqual([]);
    const moved = acceptV7(parsed, 0, {
      kind: "MOVE",
      unitId: controlled.id,
      path: [ICE1],
    });
    expect(navalUnitV7(moved.state, controlled.id).at).toEqual(ICE1);
  });

  it("a walker or flyer crosses ice like land and never cracks it, so its ice tile is a plain Move", () => {
    for (const [faction, role] of [
      ["MARTIAN", "CATAPULT"],
      ["MARTIAN", "RAIDER"],
      ["DWARF", "RAIDER"],
    ] as const) {
      const state = scene(faction, [{ seat: 0, role, at: SHORE }]);
      const unit = navalUnitAtV7(state, SHORE);
      expect(unitWalksOnIceV7(state, unit), role).toBe(true);
      expect(unitCracksIceV7(state, unit), role).toBe(false);
      const commands = commandsOf(state);
      const own = ofUnit(commands, unit.id);
      expect(moveEnds(own), `${faction} ${role}`).toContainEqual(ICE1);
      expect(crackTiles(own), `${faction} ${role}`).toEqual([]);
      const plan = tileActionPlanForSelectionV7(
        viewForV7(state, seatV7(state, 0).id),
        commands,
        unit.id,
      );
      expect(
        plan?.tiles.find((entry) => same(entry.at, ICE1))?.chooser ?? false,
      ).toBe(false);
    }
  });

  it("the shared terrain rule: ice is ground for the Ice Folk kind and for walkers and flyers only", () => {
    const enter = (
      movementMode: "GROUND" | "STRIDE" | "FLY",
      iceFolk: boolean,
      afloat = false,
    ) =>
      canEnterTerrainV7({
        terrain: "SHALLOW_WATER",
        movementMode,
        afloat,
        engineering: true,
        navigation: true,
        mountainBorn: false,
        ice: true,
        iceFolk,
      });
    expect(enter("GROUND", false)).toBe(false);
    expect(enter("GROUND", true)).toBe(true);
    expect(enter("STRIDE", false)).toBe(true);
    expect(enter("FLY", false)).toBe(true);
    for (const mode of ["GROUND", "STRIDE", "FLY"] as const)
      for (const iceFolk of [false, true])
        expect(enter(mode, iceFolk, true)).toBe(false);
  });
});

describe("the Steam Mole and the Normal AI", () => {
  it("no tunnel ends on ice, nor its rider's tile", () => {
    const mole = roleWith("DWARF", "TUNNEL");
    const state = scene(
      "DWARF",
      [{ seat: 0, role: mole, at: { x: 2, y: 1 } }],
      [ICE1, ICE2, { x: 3, y: 3 }, { x: 3, y: 4 }],
    );
    const unit = navalUnitAtV7(state, { x: 2, y: 1 });
    const tunnels = ofUnit(commandsOf(state), unit.id).filter(
      (command): command is Extract<CommandV7, { kind: "TUNNEL" }> =>
        command.kind === "TUNNEL",
    );
    expect(tunnels.length).toBeGreaterThan(0);
    const iceTiles = state.ice.map((entry) => entry.at);
    for (const command of tunnels) {
      expect(iceTiles.some((at) => same(at, command.to))).toBe(false);
      if (command.rider !== null)
        expect(
          iceTiles.some((at) => same(at, command.rider?.to as CoordV7)),
        ).toBe(false);
    }
    expect(
      rejectV7(state, 0, {
        kind: "TUNNEL",
        unitId: unit.id,
        to: ICE2,
        rider: null,
      }).code,
    ).not.toBe("OK");
  });

  it("the AI's reach estimate keeps a ground unit of another kind off the ice, and a walker on it", () => {
    const state = scene("MARTIAN", [
      { seat: 0, role: "FIGHTER", at: SHORE },
      { seat: 0, role: "CATAPULT", at: { x: 3, y: 2 } },
    ]);
    // The Ice Folk seat estimates the Martian units' reach.
    const view = viewForV7(state, seatV7(state, 1).id);
    const publicOf = (at: CoordV7) => {
      const unit = view.units.find((candidate) => same(candidate.at, at));
      if (unit === undefined) throw new Error("unit not visible");
      return unit;
    };
    const grunt = publicStandTilesForPolicyV7(view, publicOf(SHORE));
    expect(grunt.length).toBeGreaterThan(0);
    expect(grunt.some((at) => same(at, ICE1) || same(at, ICE2))).toBe(false);
    const tripod = publicStandTilesForPolicyV7(view, publicOf({ x: 3, y: 2 }));
    expect(tripod.some((at) => same(at, ICE1))).toBe(true);
  });
});

describe("the identity (pulp_wars-y242)", () => {
  it("was 7r132 after 7r131, whose save key is obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r136");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r136.current");
    expect(PRIOR_RULESET_7_IDS.at(-5)).toBe("pulp-wars-poc-7r131");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-5)).toBe(
      "pulpWars.save.v7r131.current",
    );
  });
});
