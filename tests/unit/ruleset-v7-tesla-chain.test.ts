import { afterEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  DEFAULT_CURIOSITY_POLICY_OPTIONS_V7,
  ZAP_CHAIN_OWN_WEIGHT_V7,
  setCuriosityPolicyOptionsV7,
  zapChainValueV7,
} from "../../src/ai/v7-curiosities";
import {
  TESLA_CHAIN_DAMAGES_V7,
  TESLA_ZAP_DAMAGE_V7,
  previewZapChainOddsV7,
  projectEventsV7,
  previewZapV7,
  randomState,
  teslaHopDamageV7,
  viewForV7,
  zapChainChancesV7,
  zapChainV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { drawSupportFeedbackV7 } from "../../src/render/canvas/support-presentation-v7";
import { curiosityBoundaryNoticeV7 } from "../../src/render/curiosity-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import type { Round2PieceV7 } from "../fixtures/v7-round2-arena";
import {
  P1,
  TOWER_V7,
  applyAcceptedV7,
  at,
  round3ArenaV7,
  round3UnitAtV7,
} from "../fixtures/v7-round3-arena";

// The chain lightning (`pulp_wars-737.22`, 7r105;
// docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 4.2): a zap hits
// its target for 16, then jumps from the last unit hit to a random unhit
// unit next to it, of any owner (the zapper too), for 8, 4, 2, and 1,
// drawn on the match PRNG. Each case is a small hand-built board of the
// round-3 arena (the Tesla Tower on (9, 9); seat 0 is player 1, Original;
// seat 1 Goblins). No match is played.

afterEach(() => {
  setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
});

const own = (
  role: Round2PieceV7["role"],
  x: number,
  y: number,
  extra: Partial<Round2PieceV7> = {},
): Round2PieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: Round2PieceV7["role"],
  x: number,
  y: number,
  extra: Partial<Round2PieceV7> = {},
): Round2PieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });
const tower = (pieces: readonly Round2PieceV7[]): GameStateV7 =>
  round3ArenaV7({ kinds: ["TESLA_TOWER"], pieces });
const zap = (state: GameStateV7, target: CoordV7): CommandV7 => ({
  kind: "ZAP",
  unitId: round3UnitAtV7(state, TOWER_V7).id,
  targetUnitId: round3UnitAtV7(state, target).id,
});
type Zapped = Extract<DomainEventV7, { readonly kind: "TESLA_ZAPPED" }>;
const zaps = (events: readonly DomainEventV7[]): Zapped[] =>
  events.filter((event): event is Zapped => event.kind === "TESLA_ZAPPED");
const unitById = (state: GameStateV7, id: number): UnitStateV7 | undefined =>
  state.units.find((unit) => unit.id === id && unit.hp > 0);
const withRandom = (state: GameStateV7, seed: number): GameStateV7 =>
  checkedV7({ ...state, random: randomState(seed) });

describe("the chain lightning: the rule", () => {
  it("publishes 16, then 8, 4, 2, 1", () => {
    expect(TESLA_ZAP_DAMAGE_V7).toBe(16);
    expect([...TESLA_CHAIN_DAMAGES_V7]).toEqual([8, 4, 2, 1]);
    expect([0, 1, 2, 3, 4, 5].map(teslaHopDamageV7)).toEqual([
      16, 8, 4, 2, 1, 0,
    ]);
  });

  it("jumps along a line in order, 16 · 8 · 4 · 2 · 1, and stops after five hits", () => {
    // Trolls (40) in a row from (11, 9), 2 from the Tower: each has one
    // unhit neighbour, so no draw is made. The sixth is never reached.
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("JUGGERNAUT", 11, 9),
      foe("JUGGERNAUT", 12, 9),
      foe("JUGGERNAUT", 13, 9),
      foe("JUGGERNAUT", 14, 9),
      foe("JUGGERNAUT", 15, 9),
      foe("JUGGERNAUT", 16, 9),
    ]);
    const result = applyAcceptedV7(state, P1, zap(state, at(11, 9)));
    const hits = zaps(result.events);
    expect(hits.map((hit) => [hit.hop, hit.targetAt.x, hit.damage])).toEqual([
      [0, 11, 16],
      [1, 12, 8],
      [2, 13, 4],
      [3, 14, 2],
      [4, 15, 1],
    ]);
    // Each jump comes from the last unit hit; the first from the Tower.
    expect(hits.map((hit) => hit.fromAt.x)).toEqual([9, 11, 12, 13, 14]);
    for (const hit of hits) expect(hit.at).toEqual(TOWER_V7);
    expect(round3UnitAtV7(result.state, at(16, 9)).hp).toBe(40);
    expect(round3UnitAtV7(result.state, at(15, 9)).hp).toBe(39);
    // A single neighbour is taken without a draw.
    expect(result.state.random).toEqual(state.random);
  });

  it("never hits a unit twice, and stops when no unhit unit is next to the last one", () => {
    // A triangle: whichever corner the bolt takes first, it then takes the
    // other, and from there only the (already hit) target is next to it.
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("JUGGERNAUT", 11, 9),
      foe("JUGGERNAUT", 12, 9),
      foe("JUGGERNAUT", 12, 10),
    ]);
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const seeded = withRandom(state, seed);
      const hits = zaps(
        applyAcceptedV7(seeded, P1, zap(seeded, at(11, 9))).events,
      );
      expect(hits).toHaveLength(3);
      expect(new Set(hits.map((hit) => hit.targetUnitId)).size).toBe(3);
      expect(hits.map((hit) => hit.damage)).toEqual([16, 8, 4]);
    }
  });

  it("may hit the zapper itself, and its own side's dead are not kills", () => {
    // The target is next to the Tower and the zapper is its only neighbour.
    const state = tower([
      own("FIGHTER", 9, 9, { hp: 5 }),
      foe("JUGGERNAUT", 10, 10),
    ]);
    const gunner = round3UnitAtV7(state, TOWER_V7);
    const result = applyAcceptedV7(state, P1, zap(state, at(10, 10)));
    const hits = zaps(result.events);
    expect(hits.map((hit) => [hit.hop, hit.targetUnitId])).toEqual([
      [0, round3UnitAtV7(state, at(10, 10)).id],
      [1, gunner.id],
    ]);
    expect(hits[1]).toMatchObject({
      unitId: gunner.id,
      fromAt: at(10, 10),
      targetAt: TOWER_V7,
      damage: 5,
      hpAfter: 0,
    });
    // The zapper died on its own Tower.
    expect(unitById(result.state, gunner.id)).toBeUndefined();
    const died = result.events.filter((event) => event.kind === "UNIT_DIED");
    expect(died).toHaveLength(1);
  });

  it("jumps on from a dead unit, and credits every hostile kill to the zapper", () => {
    // A Goblin (6) dies to the 16, the bolt jumps on to a Goblin (6) next to
    // it, which dies to the 8, then to one with 4 HP (the 4 kills it). An
    // own Fighter (2 HP) at the end of the line dies to the 2: not a kill.
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("FIGHTER", 11, 9),
      foe("FIGHTER", 12, 9),
      foe("FIGHTER", 13, 9, { hp: 4 }),
      own("FIGHTER", 14, 9, { hp: 2 }),
    ]);
    const gunner = round3UnitAtV7(state, TOWER_V7);
    const result = applyAcceptedV7(state, P1, zap(state, at(11, 9)));
    expect(zaps(result.events).map((hit) => hit.hpAfter)).toEqual([0, 0, 0, 0]);
    expect(
      result.events.filter((event) => event.kind === "UNIT_DIED"),
    ).toHaveLength(4);
    expect(unitById(result.state, gunner.id)?.kills).toBe(3);
    expect(
      result.state.units.filter((unit) => unit.hp > 0 && unit.ownerId !== P1),
    ).toEqual([]);
  });

  it("draws on the match PRNG: the same state gives the same chain, the engine's draw", () => {
    // The target (11, 9) has two unhit neighbours, (12, 8) and (12, 10),
    // not next to each other: the first jump is a draw, and the chain ends
    // on the one it takes.
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("JUGGERNAUT", 11, 9),
      foe("JUGGERNAUT", 12, 8),
      foe("JUGGERNAUT", 12, 10),
    ]);
    const taken = new Set<number>();
    for (const seed of [11, 12, 13, 14, 15, 16, 17, 18]) {
      const seeded = withRandom(state, seed);
      const command = zap(seeded, at(11, 9));
      const first = applyAcceptedV7(seeded, P1, command);
      const again = applyAcceptedV7(seeded, P1, command);
      expect(again.events).toEqual(first.events);
      expect(again.state.random).toEqual(first.state.random);
      // The draw advanced the match PRNG.
      expect(first.state.random).not.toEqual(seeded.random);
      // The reducer's chain is `zapChainV7` on the board before the zap.
      const expected = zapChainV7(
        seeded.units.filter((unit) => unit.hp > 0),
        TOWER_V7,
        round3UnitAtV7(seeded, at(11, 9)),
        seeded.random,
      );
      const hits = zaps(first.events);
      expect(hits.map((hit) => hit.targetUnitId)).toEqual(
        expected.hops.map((hop) => hop.unitId),
      );
      expect(first.state.random).toEqual(expected.random);
      expect(hits).toHaveLength(2);
      taken.add(hits[1]?.targetUnitId ?? -1);
    }
    // Both neighbours were taken over the seeds: it is a real draw.
    expect(taken.size).toBe(2);
  });
});

describe("the chain lightning: the preview", () => {
  it("is exact for the first hit and names the jumps without faking their numbers", () => {
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("JUGGERNAUT", 11, 9),
      foe("FIGHTER", 12, 8),
      foe("FIGHTER", 12, 10),
      // 2 from the target, 1 from (12, 10): a later jump can reach it.
      own("FIGHTER", 13, 11),
    ]);
    const view = viewForV7(state, P1);
    const gunner = round3UnitAtV7(state, TOWER_V7);
    const target = round3UnitAtV7(state, at(11, 9));
    const preview = previewZapV7(view, gunner.id);
    const entry = preview?.targets.find(
      (candidate) => candidate.targetUnitId === target.id,
    );
    const result = applyAcceptedV7(state, P1, zap(state, at(11, 9)));
    const first = zaps(result.events)[0];
    expect(entry).toMatchObject({
      damage: first?.damage,
      shieldDamage: first?.shieldDamage,
      hpAfter: first?.hpAfter,
      kills: false,
    });
    expect(entry?.chain.damages).toEqual([8, 4, 2, 1]);
    expect(entry?.chain.next).toEqual(
      [at(12, 8), at(12, 10)].map((tile) => round3UnitAtV7(state, tile).id),
    );
    // The own Fighter on (13, 11) is two jumps away.
    expect(entry?.chain.mayHitOwn).toBe(true);
    // Without it, nothing of player 1's can be reached.
    const safe = checkedV7({
      ...state,
      units: state.units.filter(
        (unit) => !(unit.at.x === 13 && unit.at.y === 11),
      ),
    });
    expect(
      previewZapV7(viewForV7(safe, P1), gunner.id)?.targets.find(
        (candidate) => candidate.targetUnitId === target.id,
      )?.chain.mayHitOwn,
    ).toBe(false);
  });

  it("gives the AI the exact odds of each jump over the visible units", () => {
    // The two-neighbour fork: each neighbour 1/2 on jump 1; from (12, 10)
    // the bolt goes on to (13, 11) (its only unhit neighbour) on jump 2.
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("JUGGERNAUT", 11, 9),
      foe("JUGGERNAUT", 12, 8),
      foe("JUGGERNAUT", 12, 10),
      foe("JUGGERNAUT", 13, 11),
    ]);
    const unit = (x: number, y: number) => round3UnitAtV7(state, at(x, y));
    const chances = zapChainChancesV7(
      state.units.filter((candidate) => candidate.hp > 0),
      unit(11, 9),
    );
    expect(chances.get(unit(12, 8).id)).toEqual([0.5, 0, 0, 0]);
    expect(chances.get(unit(12, 10).id)).toEqual([0.5, 0, 0, 0]);
    expect(chances.get(unit(13, 11).id)).toEqual([0, 0.5, 0, 0]);
    expect(chances.has(unit(11, 9).id)).toBe(false);
    expect(chances.has(unit(9, 9).id)).toBe(false);
    // The public odds carry each jump's hit (Trolls take the whole number).
    const odds = previewZapChainOddsV7(
      viewForV7(state, P1),
      unit(9, 9).id,
      unit(11, 9).id,
    );
    expect(odds.map((entry) => entry.unitId)).toEqual(
      [unit(12, 8), unit(12, 10), unit(13, 11)].map((entry) => entry.id),
    );
    expect(odds[2]?.jumps.map((jump) => [jump.chance, jump.damage])).toEqual([
      [0, 8],
      [0.5, 4],
      [0, 2],
      [0, 1],
    ]);
  });
});

describe("the chain lightning: the Normal AI", () => {
  const candidatesOf = (state: GameStateV7) => {
    const id = round3UnitAtV7(state, TOWER_V7).id;
    return chooseNormalCommandV7(viewForV7(state, P1)).candidates.filter(
      (candidate) =>
        candidate.command.kind === "ZAP" && candidate.command.unitId === id,
    );
  };

  it("values a chain by its expected hits: enemies add, own units cost more", () => {
    const state = tower([own("FIGHTER", 9, 9), foe("JUGGERNAUT", 11, 9)]);
    const view = viewForV7(state, P1);
    const odds = (ownerId: UnitStateV7["ownerId"]) => [
      {
        unitId: round3UnitAtV7(state, at(11, 9)).id,
        ownerId,
        jumps: [
          { chance: 0.5, damage: 8, shieldDamage: 0, kills: false },
          { chance: 0, damage: 4, shieldDamage: 0, kills: false },
          { chance: 0, damage: 2, shieldDamage: 0, kills: false },
          { chance: 0, damage: 1, shieldDamage: 0, kills: false },
        ],
      },
    ];
    const noWorth = () => 0;
    // Half a chance of 8 on an enemy: 40; on an own unit: -60.
    const enemy = round3UnitAtV7(state, at(11, 9)).ownerId;
    expect(zapChainValueV7(view, odds(enemy), noWorth, new Map())).toBe(40);
    expect(zapChainValueV7(view, odds(P1), noWorth, new Map())).toBe(
      -40 * ZAP_CHAIN_OWN_WEIGHT_V7,
    );
  });

  it("prefers the zap whose chain runs through enemies", () => {
    // Two Trolls 2 from the Tower: one with a Goblin next to it, one alone.
    // The chain makes the first worth more.
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("JUGGERNAUT", 11, 9),
      foe("FIGHTER", 12, 9),
      foe("JUGGERNAUT", 9, 7),
    ]);
    const scored = candidatesOf(state);
    const scoreOf = (tile: CoordV7) =>
      scored.find(
        (candidate) =>
          candidate.command.kind === "ZAP" &&
          candidate.command.targetUnitId === round3UnitAtV7(state, tile).id,
      )?.score;
    const crowd = scoreOf(at(11, 9));
    const alone = scoreOf(at(9, 7));
    expect(crowd?.priority).toBe(alone?.priority);
    expect(crowd?.immediateValue ?? 0).toBeGreaterThan(
      alone?.immediateValue ?? 0,
    );
  });

  it("refuses a zap whose chain is expected to cost more than its first hit", () => {
    // A Goblin (6) next to the Tower among wounded own Fighters: the 16
    // kills it, and the jumps will almost surely kill own units.
    const state = tower([
      own("FIGHTER", 9, 9, { hp: 3 }),
      foe("FIGHTER", 10, 10),
      own("FIGHTER", 11, 10, { hp: 3 }),
      own("FIGHTER", 11, 11, { hp: 3 }),
      own("FIGHTER", 10, 11, { hp: 3 }),
    ]);
    // The engine offers the zap; the policy keeps no candidate of it.
    expect(
      previewZapV7(viewForV7(state, P1), round3UnitAtV7(state, TOWER_V7).id)
        ?.targets,
    ).toHaveLength(1);
    expect(
      candidatesOf(state).every((candidate) => candidate.score.priority < 0),
    ).toBe(true);
    // The same Goblin among enemies is zapped as a kill.
    const enemies = tower([
      own("FIGHTER", 9, 9),
      foe("FIGHTER", 10, 10),
      foe("FIGHTER", 11, 11),
    ]);
    expect(candidatesOf(enemies)[0]?.score.priority).toBeGreaterThanOrEqual(
      1180,
    );
  });
});

describe("the chain lightning: the effect", () => {
  it("arcs from the Tower, then from unit to unit, each hit with its damage number", () => {
    const state = tower([
      own("FIGHTER", 9, 9),
      foe("JUGGERNAUT", 11, 9),
      foe("JUGGERNAUT", 12, 9),
      foe("JUGGERNAUT", 13, 9),
    ]);
    const result = applyAcceptedV7(state, P1, zap(state, at(11, 9)));
    const steps = corePresentationPlanV7(
      viewForV7(state, P1),
      projectEventsV7(state, result.state, P1, result.events),
      viewForV7(result.state, P1),
    );
    const cues = steps.filter(
      (step) => step.kind === "SUPPORT" || step.kind === "DAMAGE",
    );
    expect(
      cues.map((step) =>
        step.kind === "SUPPORT"
          ? [step.effect, step.actor.at.x, step.recipients[0]?.at.x]
          : ["DAMAGE", step.at.x, step.damage],
      ),
    ).toEqual([
      ["ZAP", 9, 11],
      ["DAMAGE", 11, 16],
      ["ZAP_JUMP", 11, 12],
      ["DAMAGE", 12, 8],
      ["ZAP_JUMP", 12, 13],
      ["DAMAGE", 13, 4],
    ]);
    // The log names each hit in order.
    const envelope = projectEventsV7(state, result.state, P1, result.events);
    expect(
      curiosityBoundaryNoticeV7(
        envelope.events,
        viewForV7(state, P1),
        viewForV7(result.state, P1),
      )?.text,
    ).toBe(
      "Your Fighter zapped the Goblins' Troll (−16) · The lightning jumped to the Goblins' Troll (−8) · The lightning jumped to the Goblins' Troll (−4)",
    );
  });

  it("strikes each arc out from its source, and shows it whole under reduced motion", () => {
    const draw = (
      effect: "ZAP" | "ZAP_JUMP",
      progress: number,
      reducedMotion: boolean,
    ) => {
      const log: (readonly unknown[])[] = [];
      const context = new Proxy(
        {},
        {
          get: (target, key) =>
            key in target
              ? Reflect.get(target, key)
              : (...args: unknown[]) => {
                  log.push([String(key), ...args]);
                },
          set: () => true,
        },
      ) as CanvasRenderingContext2D;
      drawSupportFeedbackV7(
        context,
        { offsetX: 0, offsetY: 0, zoom: 0.5 },
        {
          effect,
          actor: { unitId: null, at: at(4, 4) },
          recipients: [{ unitId: 9, at: at(5, 5) }],
          progress,
        },
        reducedMotion,
      );
      return log.filter((call) => call[0] === "lineTo").length;
    };
    // Three strokes (the glow, the dark casing, the white core) of 5 segments for a
    // jump, 6 for the Tower's arc, once the arc has reached its target.
    expect(draw("ZAP_JUMP", 0.6, false)).toBe(15);
    expect(draw("ZAP", 0.6, false)).toBe(18);
    // Early in the cue only part of the arc is drawn.
    expect(draw("ZAP_JUMP", 0.1, false)).toBeLessThan(15);
    // Reduced motion holds the whole arc.
    expect(draw("ZAP_JUMP", 0.1, true)).toBe(15);
  });
});
