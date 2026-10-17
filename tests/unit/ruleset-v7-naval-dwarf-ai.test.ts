import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  publicDangerForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  SEA_TUNNEL_LANDING_PRIORITY_V7,
  armouredLosingAttackV7,
  seaTunnelLandingWalkV7,
  seaTunnelStraitV7,
  seaTunnelsResearchDueV7,
} from "../../src/ai/v7-naval-dwarf";
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
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  DWARF_NAVAL_TECHS_V7,
  DWARF_WITHOUT_SEA_TUNNELS_V7,
  SEA_TUNNEL_STRAIT_V7,
  dwarfStraitV7,
  type DwarfPieceV7,
} from "../fixtures/v7-naval-dwarf";

// Themed naval branches, Ironclads and Sea Tunnels: the Normal AI
// (`pulp_wars-5ti.20`, docs/product/RULESET_7_NAVAL_FACTIONS.md section
// 7.6), each on a small hand-built strait. The two-tile strait
// (`SEA_TUNNEL_STRAIT_V7`): a peninsula of seat 0's home land on columns 0
// to 2 down to row 5, Shallow Water on rows 6 and 7 there, the far coast
// from row 8; seat 0's capital on (5, 2) with a Port on (4, 3), seat 1's
// capital (the overseas target) on (5, 8). Seat 0 decides. The exchanges
// use the shared strait of `v7-naval-branch.ts` (Deep Water on rows 4 to 6).

const MOLE: CoordV7 = { x: 1, y: 5 };
const HAMMERER: CoordV7 = { x: 1, y: 4 };

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0): PlayerViewV7 =>
  viewForV7(state, seatV7(state, seat).id);

/** The best candidate of one unit, in the policy's order (null: none). */
function candidateOf(view: PlayerViewV7, unitId: number): CommandV7 | null {
  return (
    chooseNormalCommandV7(view).candidates.find(
      (item) => "unitId" in item.command && item.command.unitId === unitId,
    )?.command ?? null
  );
}

function bestOf(view: PlayerViewV7, unitId: number): CommandV7 {
  const best = candidateOf(view, unitId);
  if (best === null) throw new Error("the unit has no candidate");
  return best;
}

/** A Mole and a Hammerer on the tip of the peninsula, facing the strait. */
function coast(
  technologies: readonly TechnologyIdV7[] = DWARF_NAVAL_TECHS_V7,
  extra: readonly DwarfPieceV7[] = [],
  ports: readonly [boolean, boolean] = [true, true],
): GameStateV7 {
  return dwarfStraitV7({
    terrain: SEA_TUNNEL_STRAIT_V7,
    pieces: [
      { seat: 0, role: "GUARD", at: MOLE },
      { seat: 0, role: "FIGHTER", at: HAMMERER },
      ...extra,
    ],
    technologies: [technologies, NAVAL_TECHS_V7],
    ports,
  });
}

describe("sea tunnels as landings (section 7.6)", () => {
  it("a Mole and a Hammerer facing a two-tile shallow strait tunnel across to the far coast together", () => {
    const state = coast();
    const view = viewOf(state);
    const mole = navalUnitAtV7(state, MOLE);
    const hammerer = navalUnitAtV7(state, HAMMERER);
    const best = bestOf(view, mole.id);
    expect(best.kind).toBe("TUNNEL");
    if (best.kind !== "TUNNEL") return;
    // To the far coast (the target's landmass), with the Hammerer aboard.
    expect(best.to.y).toBeGreaterThanOrEqual(8);
    expect(best.rider?.unitId).toBe(hammerer.id);
    expect(best.rider?.to.y).toBeGreaterThanOrEqual(8);
    expect(scoreCommandV7(view, best).priority).toBe(
      SEA_TUNNEL_LANDING_PRIORITY_V7,
    );
    // The tunnel is the first thing the seat does with either unit.
    const first = chooseNormalCommandV7(view).candidates.find(
      (item) =>
        "unitId" in item.command &&
        (item.command.unitId === mole.id ||
          item.command.unitId === hammerer.id),
    );
    expect(first?.command).toEqual(best);
    const after = acceptV7(state, 0, best).state;
    expect(after.burrowed.map((entry) => entry.unit.id)).toEqual([
      ...[mole.id, hammerer.id].sort((left, right) => left - right),
    ]);
  });

  it("without Sea Tunnels no tunnel across is offered and the pair walks to the Port", () => {
    const state = coast(DWARF_WITHOUT_SEA_TUNNELS_V7);
    const view = viewOf(state);
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => command.kind === "TUNNEL" && command.to.y >= 8,
      ),
    ).toBe(false);
    const hammerer = navalUnitAtV7(state, HAMMERER);
    const best = bestOf(view, hammerer.id);
    expect(best.kind).toBe("MOVE");
    if (best.kind !== "MOVE") return;
    // A step nearer the Port on (4, 3).
    const to = best.path.at(-1) as CoordV7;
    const toPort = (at: CoordV7) =>
      Math.max(Math.abs(at.x - 4), Math.abs(at.y - 3));
    expect(toPort(to)).toBeLessThan(toPort(HAMMERER));
  });

  it("never surfaces beside three hostile melee units away from the target", () => {
    const guarded = coast(DWARF_NAVAL_TECHS_V7, [
      { seat: 1, role: "FIGHTER", at: { x: 0, y: 9 } },
      { seat: 1, role: "FIGHTER", at: { x: 1, y: 9 } },
      { seat: 1, role: "FIGHTER", at: { x: 2, y: 9 } },
    ]);
    const view = viewOf(guarded);
    const mole = navalUnitAtV7(guarded, MOLE);
    const best = candidateOf(view, mole.id);
    if (best?.kind === "TUNNEL") {
      const melee = [0, 1, 2].filter(
        (x) => Math.max(Math.abs(best.to.x - x), Math.abs(best.to.y - 9)) === 1,
      ).length;
      expect(melee).toBeLessThan(3);
    }
  });

  it("reads a landing only onto the target's landmass from another one", () => {
    const plan = {
      active: true,
      target: { x: 5, y: 8 },
      walkDistanceByKey: new Map([
        ["8,1", 4],
        ["8,5", 0],
      ]),
    };
    expect(seaTunnelLandingWalkV7(plan, MOLE, { x: 1, y: 8 })).toBe(4);
    expect(seaTunnelLandingWalkV7(plan, MOLE, { x: 1, y: 2 })).toBeNull();
    expect(
      seaTunnelLandingWalkV7(plan, { x: 1, y: 8 }, { x: 5, y: 8 }),
    ).toBeNull();
    expect(
      seaTunnelLandingWalkV7({ ...plan, active: false }, MOLE, {
        x: 1,
        y: 8,
      }),
    ).toBeNull();
  });
});

describe("the research of Sea Tunnels (section 7.6)", () => {
  const research: CommandV7 = { kind: "RESEARCH", tech: "SEAMANSHIP" };
  const sailing: readonly TechnologyIdV7[] = [
    "SHORECRAFT",
    "NAVIGATION",
    "DRILL",
    "FORTIFICATION",
  ];

  it("is researched when the strait is in tunnel reach and the seat owns a Mole", () => {
    const state = coast(sailing);
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

  it("is not asked for over Deep Water, without a Mole, or by another faction", () => {
    // The shared strait: Deep Water between the coasts, out of tunnel reach.
    const wide = dwarfStraitV7({
      pieces: [{ seat: 0, role: "GUARD", at: { x: 1, y: 2 } }],
      technologies: [sailing, NAVAL_TECHS_V7],
    });
    expect(scoreCommandV7(viewOf(wide), research).priority).toBeLessThan(1280);
    const home = (at: CoordV7) => at.y <= 2;
    const far = (at: CoordV7) => at.y >= 8;
    expect(seaTunnelStraitV7(viewOf(wide), home, far)).toBe(false);
    const narrow = coast(sailing);
    expect(
      seaTunnelStraitV7(
        viewOf(narrow),
        (at) => at.y <= 2 || (at.x <= 2 && at.y <= 5),
        far,
      ),
    ).toBe(true);
    const offered = (): boolean => true;
    // No Mole: the Hammerer alone.
    const moleless = dwarfStraitV7({
      terrain: SEA_TUNNEL_STRAIT_V7,
      pieces: [{ seat: 0, role: "FIGHTER", at: HAMMERER }],
      technologies: [sailing, NAVAL_TECHS_V7],
    });
    expect(seaTunnelsResearchDueV7(viewOf(moleless), true, true, offered)).toBe(
      false,
    );
    expect(seaTunnelsResearchDueV7(viewOf(narrow), true, true, offered)).toBe(
      true,
    );
    expect(seaTunnelsResearchDueV7(viewOf(narrow), false, true, offered)).toBe(
      false,
    );
    const human = dwarfStraitV7({
      factions: ["ORIGINAL", "DWARF"],
      terrain: SEA_TUNNEL_STRAIT_V7,
      pieces: [{ seat: 0, role: "GUARD", at: MOLE }],
      technologies: [sailing, DWARF_NAVAL_TECHS_V7],
    });
    expect(seaTunnelsResearchDueV7(viewOf(human), true, true, offered)).toBe(
      false,
    );
  });
});

describe("Armoured at sea (section 7.6)", () => {
  /** The shared strait (Deep Water on rows 4 to 6). */
  const sea = (
    factions: readonly [FactionIdV7, FactionIdV7],
    pieces: readonly DwarfPieceV7[],
  ): GameStateV7 =>
    dwarfStraitV7({
      factions,
      pieces,
      technologies: [
        factions[0] === "DWARF" ? DWARF_NAVAL_TECHS_V7 : NAVAL_TECHS_V7,
        factions[1] === "DWARF" ? DWARF_NAVAL_TECHS_V7 : NAVAL_TECHS_V7,
      ],
    });

  it("a Patrol Boat does not ram an Ironclad (6 dealt, 7 taken: a losing exchange)", () => {
    const state = sea(
      ["ORIGINAL", "DWARF"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const boat = navalUnitAtV7(state, { x: 3, y: 5 });
    const ironclad = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(
      queryCombatPreviewV7(viewOf(state), boat.id, ironclad.id),
    ).toMatchObject({ ram: true, damageToDefender: 6, damageToAttacker: 7 });
    expect(candidateOf(viewOf(state), boat.id)).not.toEqual({
      kind: "ATTACK",
      unitId: boat.id,
      targetUnitId: ironclad.id,
    });
  });

  it("reads the Armour from the exact preview: at an HP where a Ram sinks a War Raft it leaves the Ironclad afloat (1 less), and refuses only a losing trade", () => {
    const scene = (rival: FactionIdV7, hp: number) => {
      const state = sea(
        ["ORIGINAL", rival],
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp },
        ],
      );
      const boat = navalUnitAtV7(state, { x: 3, y: 5 });
      const target = navalUnitAtV7(state, { x: 4, y: 5 });
      return {
        view: viewOf(state),
        boat,
        target,
        preview: queryCombatPreviewV7(viewOf(state), boat.id, target.id),
      };
    };
    // The first HP at which the Ram sinks a War Raft but not an Ironclad.
    const hp = [5, 6, 7, 8, 9, 10].find(
      (value) =>
        scene("DINOSAUR", value).preview?.defenderDies === true &&
        scene("DWARF", value).preview?.defenderDies === false,
    );
    expect(hp).toBeDefined();
    const raft = scene("DINOSAUR", hp as number);
    const ironclad = scene("DWARF", hp as number);
    expect(ironclad.preview?.damageToDefender).toBe(
      (raft.preview?.damageToDefender ?? 0) - 1,
    );
    expect(bestOf(raft.view, raft.boat.id)).toEqual({
      kind: "ATTACK",
      unitId: raft.boat.id,
      targetUnitId: raft.target.id,
    });
    // The damaged Ironclad's reply is weak, so the Ram is no losing trade
    // and stays a candidate: the refusal is for losing exchanges only.
    const preview = ironclad.preview;
    if (preview === null) throw new Error("no preview");
    expect(preview.damageToDefender).toBeGreaterThanOrEqual(
      preview.damageToAttacker,
    );
    expect(
      armouredLosingAttackV7(
        ironclad.view,
        ironclad.boat,
        ironclad.target,
        preview,
      ),
    ).toBe(false);
  });

  it("counts Armoured in the threat estimate on a Dwarf ship", () => {
    const danger = (rival: FactionIdV7): number => {
      const state = sea(
        [rival, "ORIGINAL"],
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 6, y: 5 } },
        ],
      );
      const view = viewOf(state);
      const own = navalUnitAtV7(state, { x: 3, y: 5 });
      const unit = view.units.find((candidate) => candidate.id === own.id);
      if (unit === undefined) throw new Error("not visible");
      return publicDangerForPolicyV7(view, unit, unit.at);
    };
    const raft = danger("DINOSAUR");
    expect(raft).toBeGreaterThan(1);
    expect(danger("DWARF")).toBe(raft - 1);
  });

  it("trains its Armoured hulls in their roles: a Diving Bell against a Battleship, a Steam Launch against a Submarine", () => {
    const train = (enemy: "BATTLESHIP" | "SUBMARINE") => {
      const state = dwarfStraitV7({
        pieces: [
          { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
          { seat: 1, role: enemy, at: { x: 8, y: 5 } },
        ],
      });
      return chooseNormalCommandV7(viewOf(state)).candidates.find(
        (item) => item.command.kind === "TRAIN_NAVAL",
      )?.command;
    };
    expect(train("BATTLESHIP")).toMatchObject({ role: "SUBMARINE" });
    expect(train("SUBMARINE")).toMatchObject({ role: "PATROL_BOAT" });
  });

  it("an Ironclad shells the enemy coast from the sea", () => {
    const state = dwarfStraitV7({
      pieces: [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
      ],
    });
    const ironclad = navalUnitAtV7(state, { x: 2, y: 6 });
    const best = bestOf(viewOf(state), ironclad.id);
    expect(best.kind).toBe("ATTACK");
    if (best.kind !== "ATTACK") return;
    expect(
      state.units.find((unit) => unit.id === best.targetUnitId),
    ).toMatchObject({ ownerId: seatV7(state, 1).id, form: "LAND" });
  });
});

describe("the other seats against Sea Tunnels (section 7.6)", () => {
  it("a mound a sea tunnel left on the far coast is read like any mound: its eruption is danger next to it", () => {
    const state = coast(DWARF_NAVAL_TECHS_V7, [
      { seat: 1, role: "FIGHTER", at: { x: 3, y: 9 } },
    ]);
    const command = bestOf(viewOf(state), navalUnitAtV7(state, MOLE).id);
    expect(command.kind).toBe("TUNNEL");
    if (command.kind !== "TUNNEL") return;
    const after = acceptV7(state, 0, command).state;
    const human = viewOf(after, 1);
    const fighter = navalUnitAtV7(after, { x: 3, y: 9 });
    const unit = human.units.find((candidate) => candidate.id === fighter.id);
    if (unit === undefined) throw new Error("not visible");
    expect(human.burrowed.map((entry) => entry.unit.at)).toContainEqual(
      command.to,
    );
    const nextToMound = {
      x: command.to.x + 1,
      y: command.to.y + (command.to.y >= 10 ? -1 : 1),
    };
    const far = { x: 8, y: 10 };
    expect(publicDangerForPolicyV7(human, unit, nextToMound)).toBeGreaterThan(
      publicDangerForPolicyV7(human, unit, far),
    );
  });
});
