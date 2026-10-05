import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CityId,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerEventV7,
  type PlayerId,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  SOUND_IDS_V1,
  soundCuesForBoundaryV7,
  soundCuesForStepV7,
  type SoundCueV1,
} from "../../src/audio/index";
import { ATTACK_EFFECT_IDS_V7 } from "../../src/render/canvas/attack-effects-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * From projected events to sounds (bead pulp_wars-2yc.10,
 * docs/ui/SOUND.md): the mapping reads the same steps and events the
 * visuals read, so a sound sits on its animation and an event the viewer
 * cannot see makes none.
 */

interface BoundaryV7 {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly envelope: PlayerEventEnvelopeV7;
  readonly steps: readonly CorePresentationStepV7[];
  readonly cues: readonly SoundCueV1[];
}

/** One accepted command as `viewerId` saw it. */
function boundary(
  state: GameStateV7,
  next: GameStateV7,
  events: Parameters<typeof projectEventsV7>[3],
  viewerId: PlayerId,
): BoundaryV7 {
  const before = viewForV7(state, viewerId);
  const after = viewForV7(next, viewerId);
  const envelope = projectEventsV7(state, next, viewerId, events);
  const steps = corePresentationPlanV7(before, envelope, after);
  return {
    before,
    after,
    envelope,
    steps,
    cues: steps.flatMap((step) =>
      soundCuesForStepV7({ step, before, after, envelope, durationScale: 1 }),
    ),
  };
}

/** A human unit of `role` at (4,4) attacks an enemy Guard beside it. */
function duel(
  role: UnitRoleIdV7,
  targetHp: number,
  aiCount: 1 | 2 = 1,
): {
  readonly state: GameStateV7;
  readonly next: GameStateV7;
  readonly events: Parameters<typeof projectEventsV7>[3];
} {
  let state = exploredAllV7(initialV7(1518, aiCount));
  const attacker = state.units.find(
    (unit) => unit.ownerId === state.humanPlayerId,
  );
  const target = state.units.find(
    (unit) => unit.ownerId !== state.humanPlayerId,
  );
  if (attacker === undefined || target === undefined)
    throw new Error("units missing");
  state = checkedV7({
    ...state,
    units: [
      {
        ...attacker,
        role,
        hp: role === "CATAPULT" ? 10 : 12,
        maxHp: role === "CATAPULT" ? 10 : 12,
        at: { x: 4, y: 4 },
      },
      {
        ...target,
        role: "GUARD" as const,
        hp: targetHp,
        maxHp: 17,
        // A Catapult cannot fire at the tile beside it.
        at: { x: role === "CATAPULT" ? 6 : 5, y: 4 },
      },
    ],
  });
  const attacked = applyCommandV7(state, state.humanPlayerId, {
    kind: "ATTACK",
    unitId: attacker.id,
    targetUnitId: target.id,
  });
  if (!attacked.accepted) throw new Error("attack rejected");
  return { state, next: attacked.state, events: attacked.events };
}

function ids(cues: readonly SoundCueV1[]): string[] {
  return cues.map((cue) => cue.id);
}

describe("sounds of presentation steps", () => {
  it("times a melee swing, its hit and a death with the lunge", () => {
    const { state, next, events } = duel("FIGHTER", 1);
    const seen = boundary(state, next, events, state.humanPlayerId);
    expect(seen.steps.map((step) => step.kind)).toContain("MELEE");
    expect(seen.envelope.events.map((event) => event.kind)).toContain(
      "UNIT_DIED",
    );
    expect(seen.cues.slice(0, 3)).toEqual([
      { id: "attack.melee", delayMs: 0 },
      // The lunge reaches its target at 56% of its 230 ms.
      { id: "impact.hit", delayMs: 230 * 0.56 },
      { id: "unit.death", delayMs: 230 * 0.56 + 60 },
    ]);
  });

  it("gives a surviving target a hit and no death", () => {
    const { state, next, events } = duel("FIGHTER", 17);
    const seen = boundary(state, next, events, state.humanPlayerId);
    expect(ids(seen.cues)).toContain("impact.hit");
    expect(ids(seen.cues)).not.toContain("unit.death");
  });

  it("sounds an arrow and a siege shot by the attacker's role", () => {
    const marksman = duel("MARKSMAN", 17);
    expect(
      boundary(
        marksman.state,
        marksman.next,
        marksman.events,
        marksman.state.humanPlayerId,
      ).cues.slice(0, 2),
    ).toEqual([
      { id: "attack.ranged", delayMs: 0 },
      { id: "impact.hit", delayMs: 280 },
    ]);
    const catapult = duel("CATAPULT", 17);
    expect(
      boundary(
        catapult.state,
        catapult.next,
        catapult.events,
        catapult.state.humanPlayerId,
      ).cues.slice(0, 2),
    ).toEqual([
      { id: "attack.siege", delayMs: 0 },
      { id: "impact.heavy", delayMs: 280 },
    ]);
  });

  it("makes no sound for a fight the viewer cannot see", () => {
    const { state, next, events } = duel("FIGHTER", 1, 2);
    const bystander = state.players.find(
      (player) =>
        player.id !== state.humanPlayerId &&
        !state.units.some((unit) => unit.ownerId === player.id),
    );
    if (bystander === undefined) throw new Error("bystander missing");
    const unseen = boundary(state, next, events, bystander.id);
    // The fight is in the bystander's fog...
    for (const at of [
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ])
      expect(
        unseen.before.board.tiles.find(
          (tile) => tile.at.x === at.x && tile.at.y === at.y,
        )?.explored,
      ).toBe(false);
    // ...so nothing was projected, nothing is animated and nothing sounds.
    expect(
      unseen.envelope.events.filter(
        (event) =>
          event.kind === "COMBAT_RESOLVED" || event.kind === "UNIT_DIED",
      ),
    ).toEqual([]);
    expect(unseen.steps).toEqual([]);
    expect(unseen.cues).toEqual([]);
    expect(
      soundCuesForBoundaryV7(unseen.before, unseen.envelope, unseen.after),
    ).toEqual({ start: [], end: [], essential: [] });
    // The fighter's own player hears it.
    const seen = boundary(state, next, events, state.humanPlayerId);
    expect(ids(seen.cues)).toEqual(
      expect.arrayContaining(["attack.melee", "impact.hit", "unit.death"]),
    );
  });

  it("keeps other players' moves silent and steps the viewer's own", () => {
    const view = viewForV7(
      exploredAllV7(initialV7(1518)),
      exploredAllV7(initialV7(1518)).humanPlayerId,
    );
    const envelope: PlayerEventEnvelopeV7 = {
      format: "pulp-wars-player-events",
      version: 7,
      viewerId: view.viewer.id,
      commandIndex: view.commandIndex,
      events: [],
    };
    const cue = (step: CorePresentationStepV7): readonly SoundCueV1[] =>
      soundCuesForStepV7({
        step,
        before: view,
        after: view,
        envelope,
        durationScale: 1,
      });
    const origin = { x: 1, y: 1 };
    const path = [origin, { x: 2, y: 1 }];
    expect(cue({ kind: "MOVE", unitId: 1, path, durationMs: 90 })).toEqual([
      { id: "unit.step", delayMs: 0 },
    ]);
    expect(
      cue({
        kind: "MOVE",
        unitId: 1,
        path,
        durationMs: 90,
        followCamera: true,
      }),
    ).toEqual([]);
    expect(
      cue({ kind: "MOVE", unitId: 1, path, durationMs: 120, pushSlide: true }),
    ).toEqual([]);
    expect(
      cue({
        kind: "DAMAGE",
        unitId: 1,
        at: origin,
        damage: 3,
        lethal: true,
        durationMs: 100,
      }),
    ).toEqual([
      { id: "unit.hurt", delayMs: 0 },
      { id: "unit.death", delayMs: 60 },
    ]);
    expect(cue({ kind: "VISIBILITY_CROSSFADE", durationMs: 180 })).toEqual([]);
    expect(cue({ kind: "BUILD", at: origin, durationMs: 180 })).toEqual([
      { id: "economy.build", delayMs: 0, gain: 0.6 },
    ]);
  });

  it("has a sound for every special cue, all from the manifest", () => {
    const view = viewForV7(
      exploredAllV7(initialV7(1518)),
      exploredAllV7(initialV7(1518)).humanPlayerId,
    );
    const envelope: PlayerEventEnvelopeV7 = {
      format: "pulp-wars-player-events",
      version: 7,
      viewerId: view.viewer.id,
      commandIndex: view.commandIndex,
      events: [],
    };
    const at = { x: 1, y: 1 };
    const steps: CorePresentationStepV7[] = [
      ...ATTACK_EFFECT_IDS_V7.map((attackEffect): CorePresentationStepV7 => ({
        kind: "RANGED",
        unitId: 1,
        from: at,
        to: at,
        durationMs: 280,
        attackEffect,
      })),
      ...(
        [
          "HEAT_RAY",
          "SHIELD_FLARE",
          "BEAM_DOWN",
          "TRACTOR_BEAM",
          "MIND_CONTROL",
          "CONTROL_RELEASE",
        ] as const
      ).map((effect): CorePresentationStepV7 => ({
        kind: "MARTIAN",
        effect,
        cells: [at],
        durationMs: 360,
      })),
      ...(
        [
          "SHATTER",
          "COLD_SNAP",
          "BOLAS",
          "COLD_AURA",
          "SWEEP",
          "ICE_FREEZE",
          "ICE_MELT",
          "ICE_CRUSH",
          "PRIZE_FLAG",
        ] as const
      ).map((effect): CorePresentationStepV7 => ({
        kind: "ICE_FOLK",
        effect,
        cells: [at],
        durationMs: 400,
      })),
      ...(
        [
          "TUNNEL",
          "ERUPTION",
          "BOMB",
          "ASSEMBLE",
          "REPAIR",
          "KNOCKBACK",
        ] as const
      ).map((effect): CorePresentationStepV7 => ({
        kind: "DWARF",
        effect,
        cells: [at],
        durationMs: 400,
      })),
      ...(
        [
          "RUSH",
          "CRASH",
          "WAKE",
          "REBAKE",
          "SUGAR_TOSS",
          "SPLAT",
          "BOUNCE",
          "PEPPERMINT",
          "CRUMBS_EATEN",
        ] as const
      ).map((effect): CorePresentationStepV7 => ({
        kind: "CANDY",
        effect,
        cells: [at],
        durationMs: 400,
      })),
      ...(
        [
          "CHARGE_HIT",
          "ACID_HIT",
          "EGG_LAID",
          "HATCH",
          "HATCH_CALL",
          "EGG_DESTROYED",
          "GROW",
        ] as const
      ).map((effect): CorePresentationStepV7 => ({
        kind: "DINOSAUR",
        effect,
        cells: [at],
        unitIds: [],
        durationMs: 300,
      })),
      ...(
        [
          "RALLY",
          "TEND",
          "RAISE",
          "DEVOUR",
          "WAIL",
          "INFECT",
          "GRAVE",
          "PLAGUE",
          "CURE",
          "BITTEN",
          "SPLASH",
          "LIFESTEAL",
          "REGENERATE",
          "RECOVER",
          "FOUNTAIN",
          "BLESSING",
          "SALVAGE",
          "BOUNTY",
        ] as const
      ).map((effect): CorePresentationStepV7 => ({
        kind: "SUPPORT",
        effect,
        actor: { unitId: 1, at },
        recipients: [],
        durationMs: 320,
      })),
      { kind: "EXPLOSION", wave: 1, blasts: [], durationMs: 520 },
      {
        kind: "WINDMILL_HEALING",
        sources: [at],
        recipients: [],
        sourceDurationMs: 180,
        recipientDurationMs: 260,
      },
    ];
    const used = new Set<string>();
    for (const step of steps) {
      const cues = soundCuesForStepV7({
        step,
        before: view,
        after: view,
        envelope,
        durationScale: 1,
      });
      expect(cues.length, JSON.stringify(step)).toBeGreaterThan(0);
      for (const cue of cues) {
        expect(SOUND_IDS_V1, cue.id).toContain(cue.id);
        expect(cue.delayMs).toBeGreaterThanOrEqual(0);
        expect(cue.delayMs).toBeLessThanOrEqual(700);
        used.add(cue.id);
      }
    }
    // The families the bead names each have a variant.
    for (const id of [
      "attack.ray",
      "attack.cannon",
      "attack.gatling",
      "impact.explosion",
      "impact.ice",
      "impact.splat",
      "impact.shield",
      "support.heal",
      "support.dark",
      "special.freeze",
    ])
      expect(used).toContain(id);
  });

  it("holds a shattering target's hit for its Shatter", () => {
    const view = viewForV7(
      exploredAllV7(initialV7(1518)),
      exploredAllV7(initialV7(1518)).humanPlayerId,
    );
    const cues = soundCuesForStepV7({
      step: {
        kind: "MELEE",
        unitId: 1,
        from: { x: 1, y: 1 },
        to: { x: 2, y: 1 },
        durationMs: 230,
        holdTarget: true,
      },
      before: view,
      after: view,
      envelope: {
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: view.viewer.id,
        commandIndex: view.commandIndex,
        events: [],
      },
      durationScale: 1,
    });
    expect(cues).toEqual([{ id: "attack.melee", delayMs: 0 }]);
  });
});

describe("sounds of a boundary", () => {
  const state = exploredAllV7(initialV7(1518));
  const view = viewForV7(state, state.humanPlayerId);
  const viewer = view.viewer.id;
  const other = view.players.find((player) => player.id !== viewer)?.id;
  const city = view.cities.find((candidate) => candidate.ownerId === viewer);
  const unit = view.units.find((candidate) => candidate.ownerId === viewer);
  if (city === undefined || unit === undefined || other === undefined)
    throw new Error("boundary fixture missing");
  const sounds = (
    events: readonly PlayerEventV7[],
  ): ReturnType<typeof soundCuesForBoundaryV7> =>
    soundCuesForBoundaryV7(
      view,
      {
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: viewer,
        commandIndex: view.commandIndex,
        events,
      },
      view,
    );

  it("plays the viewer's End Turn at once and the turn start after", () => {
    const ended = applyCommandV7(state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error("end turn rejected");
    const seen = boundary(state, ended.state, ended.events, viewer);
    const cues = soundCuesForBoundaryV7(seen.before, seen.envelope, seen.after);
    expect(ids(cues.start)).toEqual(["turn.end"]);
    expect(ids(cues.end)).not.toContain("turn.start");
    expect(
      sounds([{ kind: "TURN_STARTED", playerId: viewer, coins: 5 }]),
    ).toEqual({
      start: [],
      end: [{ id: "turn.start", delayMs: 0 }],
      essential: [{ id: "turn.start", delayMs: 0 }],
    });
    // Another player's turn changing is silent.
    expect(
      sounds([
        { kind: "TURN_ENDED", playerId: other },
        { kind: "TURN_STARTED", playerId: other, coins: 5 },
      ]),
    ).toEqual({ start: [], end: [], essential: [] });
  });

  it("maps the viewer's economy, cities and achievements", () => {
    expect(
      ids(
        sounds([
          {
            kind: "TECH_RESEARCHED",
            playerId: viewer,
            tech: "GATHERING",
            cost: 5,
          },
        ]).start,
      ),
    ).toEqual(["research.complete"]);
    expect(
      ids(
        sounds([
          {
            kind: "UNIT_TRAINED",
            playerId: viewer,
            cityId: city.id,
            unitId: 999 as UnitId,
            role: "FIGHTER",
            cost: 2,
            at: city.at,
          },
        ]).start,
      ),
    ).toEqual(["unit.train"]);
    expect(
      ids(
        sounds([
          { kind: "CITY_CAPTURED", cityId: city.id, from: other, to: viewer },
        ]).end,
      ),
    ).toEqual(["city.capture"]);
    expect(
      ids(
        sounds([
          { kind: "CITY_CAPTURED", cityId: city.id, from: null, to: viewer },
        ]).end,
      ),
    ).toEqual(["village.capture"]);
    expect(
      ids(
        sounds([
          { kind: "CITY_CAPTURED", cityId: city.id, from: viewer, to: other },
        ]).end,
      ),
    ).toEqual(["city.lost"]);
    expect(
      ids(sounds([{ kind: "CITY_LEVELED_UP", cityId: city.id, level: 2 }]).end),
    ).toEqual(["city.levelup"]);
    expect(
      ids(sounds([{ kind: "UNIT_PROMOTED", unitId: unit.id, maxHp: 15 }]).end),
    ).toEqual(["unit.levelup"]);
    expect(
      ids(
        sounds([
          {
            kind: "ACHIEVEMENT_UNLOCKED",
            playerId: viewer,
            achievement: "EXPLORER",
          },
        ]).end,
      ),
    ).toEqual(["achievement.unlocked"]);
    // Several sounds of one phase are a beat apart; repeats are one sound.
    expect(
      sounds([
        { kind: "SPOILS_AWARDED", playerId: viewer, cityId: city.id, coins: 2 },
        { kind: "PLUNDER_AWARDED", playerId: viewer, kills: 1, coins: 2 },
        { kind: "CITY_LEVELED_UP", cityId: city.id, level: 2 },
      ]).end,
    ).toEqual([
      { id: "economy.coin", delayMs: 0 },
      { id: "city.levelup", delayMs: 140 },
    ]);
  });

  it("stays silent for other players' economy and unknown cities", () => {
    expect(
      sounds([
        {
          kind: "TECH_RESEARCHED",
          playerId: other,
          tech: "GATHERING",
          cost: 5,
        },
        {
          kind: "CITY_CAPTURED",
          cityId: (city.id + 500) as CityId,
          from: null,
          to: other,
        },
        {
          kind: "CITY_LEVELED_UP",
          cityId: (city.id + 500) as CityId,
          level: 2,
        },
        { kind: "UNIT_PROMOTED", unitId: 98_765 as UnitId, maxHp: 15 },
        {
          kind: "ACHIEVEMENT_UNLOCKED",
          playerId: other,
          achievement: "EXPLORER",
        },
        { kind: "SPOILS_AWARDED", playerId: other, cityId: city.id, coins: 2 },
      ]),
    ).toEqual({ start: [], end: [], essential: [] });
  });

  it("ends the match with one tune, also when animations are skipped", () => {
    expect(
      sounds([
        { kind: "CITY_CAPTURED", cityId: city.id, from: other, to: viewer },
        { kind: "MATCH_ENDED", outcome: { kind: "VICTORY", winnerId: viewer } },
      ]),
    ).toEqual({
      start: [],
      end: [{ id: "match.victory", delayMs: 0 }],
      essential: [{ id: "match.victory", delayMs: 0 }],
    });
    expect(
      sounds([
        {
          kind: "MATCH_ENDED",
          outcome: {
            kind: "DEFEAT",
            humanId: viewer,
            defeatedByPlayerId: other,
          },
        },
      ]).essential,
    ).toEqual([{ id: "match.defeat", delayMs: 0 }]);
  });
});
