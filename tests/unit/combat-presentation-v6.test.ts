import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createPlayableGameV6,
  unitId,
  viewForV6,
  wallId,
  type DomainEventV6,
  type FactionIdV6,
  type PlayerViewV6,
  type UnitRoleId,
} from "../../src/engine/index";
import {
  COMBAT_PRESENTATION_TIMING_V6,
  combatAnimationFrameV6,
  combatPresentationsFromEventsV6,
} from "../../src/render/canvas/combat-presentation-v6";

describe("ruleset-6 combat presentation", () => {
  it("projects an accepted adjacent attack into lunge and both damage reactions", () => {
    const view = combatView();
    const event = combatEvent(view, { damageToAttacker: 3 });
    const [presentation] = combatPresentationsFromEventsV6(
      view,
      [event],
      7,
      "FULL",
    );
    expect(presentation).toMatchObject({
      key: `7:0:${view.units[0]?.id}`,
      commandIndex: 7,
      actorController: "HUMAN",
      durationMs: COMBAT_PRESENTATION_TIMING_V6.fullMs,
      damaged: [{ id: view.units[1]?.id }, { id: view.units[0]?.id }],
    });
    if (presentation === undefined) throw new Error("Missing presentation");
    expect(combatAnimationFrameV6(presentation, 0)).toEqual({
      attackerTravel: 0,
      projectileTravel: 0,
      projectileOpacity: 0,
      shake: 0,
      damagedOpacity: 1,
    });
    expect(
      combatAnimationFrameV6(
        presentation,
        COMBAT_PRESENTATION_TIMING_V6.contactMs,
      ).attackerTravel,
    ).toBeCloseTo(0.28);
    const impact = combatAnimationFrameV6(
      presentation,
      COMBAT_PRESENTATION_TIMING_V6.contactMs + 20,
    );
    expect(impact.attackerTravel).toBeGreaterThan(0);
    expect(Math.abs(impact.shake)).toBeGreaterThan(0);
  });

  it("uses one stationary, noncontinuous reduced-motion reaction", () => {
    const view = combatView();
    const [presentation] = combatPresentationsFromEventsV6(
      view,
      [combatEvent(view)],
      8,
      "REDUCED",
    );
    if (presentation === undefined) throw new Error("Missing presentation");
    expect(presentation.durationMs).toBe(
      COMBAT_PRESENTATION_TIMING_V6.reducedMs,
    );
    expect(combatAnimationFrameV6(presentation, 0)).toEqual(
      combatAnimationFrameV6(presentation, 99),
    );
    expect(combatAnimationFrameV6(presentation, 0)).toEqual({
      attackerTravel: 0,
      projectileTravel: 0,
      projectileOpacity: 0,
      shake: 0,
      damagedOpacity: 0.58,
    });
  });

  it("does not animate rejected/no-event or nonadjacent range-one attacks", () => {
    const view = combatView();
    expect(combatPresentationsFromEventsV6(view, [], 9, "FULL")).toEqual([]);
    const nonadjacent: PlayerViewV6 = {
      ...view,
      units: view.units.map((unit, index) =>
        index === 1 ? { ...unit, at: { x: 6, y: 4 } } : unit,
      ),
    };
    expect(
      combatPresentationsFromEventsV6(
        nonadjacent,
        [combatEvent(nonadjacent)],
        9,
        "FULL",
      ),
    ).toEqual([]);
  });

  it.each([
    {
      faction: "ORIGINAL",
      targetAt: { x: 5, y: 4 },
      distance: "adjacent",
    },
    {
      faction: "ORIGINAL",
      targetAt: { x: 6, y: 4 },
      distance: "nonadjacent",
    },
    {
      faction: "CANDY",
      targetAt: { x: 5, y: 4 },
      distance: "adjacent",
    },
    {
      faction: "CANDY",
      targetAt: { x: 6, y: 4 },
      distance: "nonadjacent",
    },
  ] as const)(
    "uses the faction projectile for $faction MARKSMAN when $distance",
    ({ faction, targetAt }) => {
      const view = combatView({ attackerFaction: faction, targetAt });
      expect(view.units[0]?.role).toBe("MARKSMAN");
      const [presentation] = combatPresentationsFromEventsV6(
        view,
        [combatEvent(view)],
        10,
        "FULL",
      );
      expect(presentation).toMatchObject({
        kind: "RANGED",
        projectile: faction === "CANDY" ? "GUMBALL" : "ARROW",
        attacker: { role: "MARKSMAN", faction },
        targetAt,
      });
      if (presentation === undefined) throw new Error("Missing projectile");
      const flight = combatAnimationFrameV6(
        presentation,
        COMBAT_PRESENTATION_TIMING_V6.projectileMs / 2,
      );
      expect(flight.attackerTravel).toBe(0);
      expect(flight.projectileTravel).toBeGreaterThan(0);
      expect(flight.projectileTravel).toBeLessThan(1);
      expect(flight.projectileOpacity).toBe(1);
      const impact = combatAnimationFrameV6(
        presentation,
        COMBAT_PRESENTATION_TIMING_V6.projectileMs + 20,
      );
      expect(impact.projectileOpacity).toBe(0);
      expect(Math.abs(impact.shake)).toBeGreaterThan(0);
    },
  );

  it("keeps a lethal ranged Wall snapshot through projectile and damage phases", () => {
    const base = combatView({
      attackerFaction: "CANDY",
      targetAt: { x: 6, y: 4 },
    });
    const defender = base.units[1];
    const enemy = base.players.find(
      (player) => player.id !== base.units[0]?.ownerId,
    );
    if (defender === undefined || enemy === undefined)
      throw new Error("Missing Wall fixture");
    const wall = {
      id: wallId(60_001),
      ownerId: enemy.id,
      at: defender.at,
      hp: 4,
    };
    const view: PlayerViewV6 = {
      ...base,
      units: base.units.slice(0, 1),
      chocolateWalls: [wall],
    };
    const event: DomainEventV6 = {
      kind: "COMBAT_RESOLVED",
      preview: {
        ...combatEvent(base).preview,
        target: { kind: "CHOCOLATE_WALL", wallId: wall.id },
        damageToDefender: 4,
        defenderDies: true,
        noRetaliationReason: "STRUCTURE",
      },
    };
    const first = combatPresentationsFromEventsV6(view, [event], 12, "FULL");
    const second = combatPresentationsFromEventsV6(view, [event], 12, "FULL");
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      kind: "RANGED",
      projectile: "GUMBALL",
      target: null,
      targetWall: { id: wall.id, at: wall.at, hp: 4 },
      targetAt: wall.at,
      wallDamaged: true,
      advances: false,
    });
  });

  it("uses one stationary endpoint cue for reduced-motion ranged combat", () => {
    const view = combatView({
      attackerFaction: "ORIGINAL",
      targetAt: { x: 6, y: 4 },
    });
    const [presentation] = combatPresentationsFromEventsV6(
      view,
      [combatEvent(view)],
      13,
      "REDUCED",
    );
    if (presentation === undefined) throw new Error("Missing projectile");
    expect(combatAnimationFrameV6(presentation, 0)).toEqual(
      combatAnimationFrameV6(presentation, 99),
    );
    expect(combatAnimationFrameV6(presentation, 0)).toMatchObject({
      attackerTravel: 0,
      projectileTravel: 1,
      projectileOpacity: 1,
      shake: 0,
      damagedOpacity: 0.58,
    });
  });

  it.each([
    ["ORIGINAL", "FIGHTER"],
    ["CANDY", "GUARD"],
  ] as const)(
    "keeps adjacent range-one %s %s eligible for melee feedback",
    (faction, role) => {
      const view = combatView({ attackerFaction: faction, attackerRole: role });
      expect(
        combatPresentationsFromEventsV6(view, [combatEvent(view)], 11, "FULL"),
      ).toMatchObject([{ kind: "MELEE", projectile: null }]);
    },
  );

  it("checks in reproducible inspected desktop and mobile evidence", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/integration/reviews/ruleset6-melee-feedback/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly renderer: string;
      readonly viewports: readonly {
        readonly id: string;
        readonly dpr: number;
      }[];
      readonly phases: readonly {
        readonly id: string;
        readonly motion: string;
      }[];
      readonly visualReview: { readonly status: string };
      readonly artifacts: readonly {
        readonly path: string;
        readonly bytes: number;
        readonly sha256: string;
      }[];
    };
    expect(evidence.renderer).toBe("buildBoardDrawListV6");
    expect(evidence.viewports).toEqual([
      expect.objectContaining({ id: "desktop", dpr: 1 }),
      expect.objectContaining({ id: "mobile", dpr: 2 }),
    ]);
    expect(evidence.phases.map((phase) => phase.id)).toEqual([
      "contact",
      "impact",
      "reduced",
    ]);
    expect(evidence.visualReview.status).toBe("ACCEPTED");
    expect(evidence.artifacts).toHaveLength(6);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(data.byteLength, artifact.path).toBe(artifact.bytes);
      expect(
        createHash("sha256").update(data).digest("hex"),
        artifact.path,
      ).toBe(artifact.sha256);
    }
  });

  it("checks in inspected ranged desktop and mobile DPR evidence", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/integration/reviews/ruleset6-ranged-feedback/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly renderer: string;
      readonly viewports: readonly {
        readonly id: string;
        readonly dpr: number;
      }[];
      readonly phases: readonly {
        readonly id: string;
        readonly fixture: string;
        readonly motion: string;
      }[];
      readonly visualReview: { readonly status: string };
      readonly artifacts: readonly {
        readonly path: string;
        readonly bytes: number;
        readonly sha256: string;
      }[];
    };
    expect(evidence.renderer).toBe("buildBoardDrawListV6");
    expect(evidence.viewports).toEqual([
      expect.objectContaining({ id: "desktop", dpr: 1 }),
      expect.objectContaining({ id: "mobile", dpr: 2 }),
    ]);
    expect(evidence.phases).toMatchObject([
      { id: "original-adjacent-flight", fixture: "ORIGINAL_ADJACENT" },
      { id: "original-distance2-flight", fixture: "ORIGINAL_DISTANCE2" },
      { id: "candy-wall-flight", fixture: "CANDY_WALL" },
      { id: "candy-wall-impact", fixture: "CANDY_WALL" },
      { id: "reduced-endpoint", motion: "REDUCED" },
    ]);
    expect(evidence.visualReview.status).toBe("ACCEPTED");
    expect(evidence.artifacts).toHaveLength(10);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(data.byteLength, artifact.path).toBe(artifact.bytes);
      expect(
        createHash("sha256").update(data).digest("hex"),
        artifact.path,
      ).toBe(artifact.sha256);
    }
  });
});

function combatView(
  options: {
    readonly attackerFaction?: FactionIdV6;
    readonly attackerRole?: UnitRoleId;
    readonly targetAt?: Readonly<{ x: number; y: number }>;
  } = {},
): PlayerViewV6 {
  const created = createPlayableGameV6({
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 42,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "CANDY"],
  });
  if (!created.ok) throw new Error(created.error.code);
  const base = viewForV6(created.state, created.state.humanPlayerId);
  const own = created.state.units.find(
    (unit) => unit.ownerId === created.state.humanPlayerId,
  );
  const enemy = created.state.units.find(
    (unit) => unit.ownerId !== created.state.humanPlayerId,
  );
  if (own === undefined || enemy === undefined)
    throw new Error("Missing combatants");
  const attackerFaction = options.attackerFaction ?? "ORIGINAL";
  const defenderFaction = attackerFaction === "ORIGINAL" ? "CANDY" : "ORIGINAL";
  return {
    ...base,
    players: base.players.map((player) =>
      player.id === own.ownerId
        ? { ...player, faction: attackerFaction }
        : player.id === enemy.ownerId
          ? { ...player, faction: defenderFaction }
          : player,
    ),
    units: [
      {
        ...own,
        role:
          options.attackerRole ??
          (options.attackerFaction === undefined ? own.role : "MARKSMAN"),
        at: { x: 4, y: 4 },
      },
      {
        ...enemy,
        id: unitId(enemy.id + 10_000),
        at: options.targetAt ?? { x: 5, y: 4 },
      },
    ],
  };
}

function combatEvent(
  view: PlayerViewV6,
  overrides: { readonly damageToAttacker?: number } = {},
): Extract<DomainEventV6, { readonly kind: "COMBAT_RESOLVED" }> {
  const attacker = view.units[0];
  const defender = view.units[1];
  if (attacker === undefined || defender === undefined)
    throw new Error("Missing combatants");
  return {
    kind: "COMBAT_RESOLVED",
    preview: {
      attackerId: attacker.id,
      target: { kind: "UNIT", unitId: defender.id },
      attack2: 4,
      chargeApplied: false,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
      breachApplied: false,
      push: "BLOCKED",
      damageToDefender: 5,
      damageToAttacker: overrides.damageToAttacker ?? 0,
      defenderDies: false,
      attackerDies: false,
      advances: false,
      noRetaliationReason: null,
    },
  };
}
