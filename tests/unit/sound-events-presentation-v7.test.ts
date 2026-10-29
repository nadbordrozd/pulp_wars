import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  NEUTRAL_OWNER_ID_V7,
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CityId,
  type FactionIdV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerEventV7,
  type PlayerId,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  MOVE_SOUND_REPEAT_TILES_V7,
  OTHER_PLAYER_MOVE_GAIN_V7,
  SOUND_IDS_V1,
  hurtSoundOfUnitV7,
  moveSoundOfUnitV7,
  soundCuesForBoundaryV7,
  soundCuesForStepV7,
  type SoundCueV1,
} from "../../src/audio/index";
import {
  ATTACK_EFFECT_DURATIONS_V7,
  ATTACK_EFFECT_HIT_V7,
  ATTACK_EFFECT_IDS_V7,
} from "../../src/render/canvas/attack-effects-v7";
import {
  CULT_EFFECT_DURATIONS_V7,
  type CultFeedbackEffectV7,
} from "../../src/render/canvas/cult-effects-v7";
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

/** Each faction's hurt sound (bead pulp_wars-2yc.52). */
const HURT_BY_FACTION: Readonly<Record<FactionIdV7, string>> = {
  ORIGINAL: "unit.hurt.human",
  UNDEAD: "unit.hurt.undead",
  GOBLIN: "unit.hurt.goblin",
  DINOSAUR: "unit.hurt.dinosaur",
  MARTIAN: "unit.hurt.martian",
  ICE_FOLK: "unit.hurt.icefolk",
  DWARF: "unit.hurt.dwarf",
  CANDY: "unit.hurt.candy",
  CULT: "unit.hurt.cultist",
};

describe("hurt sounds by the damaged unit's kind", () => {
  const state = exploredAllV7(initialV7(1518));
  const view = viewForV7(state, state.humanPlayerId);
  const unit = view.units[0];
  const other = view.players.find((player) => player.id !== unit?.ownerId);
  if (unit === undefined || other === undefined)
    throw new Error("hurt fixture missing");
  const owned = (faction: FactionIdV7): PlayerViewV7 => ({
    ...view,
    players: view.players.map((player) =>
      player.id === unit.ownerId ? { ...player, faction } : player,
    ),
  });
  const withUnit = (
    change: Partial<PlayerViewV7["units"][number]>,
  ): PlayerViewV7 => ({
    ...view,
    units: view.units.map((candidate) =>
      candidate.id === unit.id ? { ...candidate, ...change } : candidate,
    ),
  });

  it("gives every faction its own hurt sound, all in the manifest", () => {
    for (const faction of FACTION_IDS_V7) {
      const id = hurtSoundOfUnitV7([owned(faction)], { unitId: unit.id });
      expect(id, faction).toBe(HURT_BY_FACTION[faction]);
      expect(SOUND_IDS_V1 as readonly string[], id).toContain(id);
      // Found by its tile as well (a Peppermint burst names a tile).
      expect(hurtSoundOfUnitV7([owned(faction)], { at: unit.at })).toBe(id);
    }
    expect(new Set(Object.values(HURT_BY_FACTION)).size).toBe(
      FACTION_IDS_V7.length,
    );
  });

  it("voices daemons, giants and the Giant Spider apart", () => {
    expect(
      hurtSoundOfUnitV7([withUnit({ summoned: "HORROR" })], {
        unitId: unit.id,
      }),
    ).toBe("unit.hurt.daemon");
    expect(
      hurtSoundOfUnitV7([withUnit({ summoned: "TENTACLE" })], {
        unitId: unit.id,
      }),
    ).toBe("unit.hurt.daemon");
    expect(
      hurtSoundOfUnitV7([withUnit({ role: "JUGGERNAUT" })], {
        unitId: unit.id,
      }),
    ).toBe("unit.hurt.giant");
    expect(
      hurtSoundOfUnitV7(
        [withUnit({ ownerId: NEUTRAL_OWNER_ID_V7, role: "JUGGERNAUT" })],
        { unitId: unit.id },
      ),
    ).toBe("unit.hurt.monster");
  });

  it("hears a mind-controlled unit in its original kind's voice", () => {
    const controlled: PlayerViewV7 = {
      ...owned("MARTIAN"),
      players: owned("MARTIAN").players.map((player) =>
        player.id === other.id ? { ...player, faction: "DWARF" } : player,
      ),
      mindControlled: [
        { unitId: unit.id, brainUnitId: null, originalOwnerId: other.id },
      ],
    };
    expect(hurtSoundOfUnitV7([controlled], { unitId: unit.id })).toBe(
      "unit.hurt.dwarf",
    );
  });

  it("falls back to the plain hurt sound for a unit no view holds", () => {
    expect(hurtSoundOfUnitV7([view], { unitId: 987_654 })).toBe("unit.hurt");
    expect(hurtSoundOfUnitV7([view], { at: { x: -5, y: -5 } })).toBe(
      "unit.hurt",
    );
    expect(hurtSoundOfUnitV7([], { unitId: unit.id })).toBe("unit.hurt");
  });
});

describe("move sounds by the moving unit (bead pulp_wars-2yc.57)", () => {
  const state = exploredAllV7(initialV7(1518));
  const view = viewForV7(state, state.humanPlayerId);
  const unit = view.units.find((candidate) => candidate.form === "LAND");
  if (unit === undefined) throw new Error("move fixture missing");
  /** The view with the unit changed, its owner of `faction`. */
  const as = (
    change: Partial<PlayerViewV7["units"][number]>,
    faction: FactionIdV7 = "ORIGINAL",
  ): PlayerViewV7 => ({
    ...view,
    players: view.players.map((player) =>
      player.id === unit.ownerId ? { ...player, faction } : player,
    ),
    units: view.units.map((candidate) =>
      candidate.id === unit.id ? { ...candidate, ...change } : candidate,
    ),
  });
  const envelope: PlayerEventEnvelopeV7 = {
    format: "pulp-wars-player-events",
    version: 7,
    viewerId: view.viewer.id,
    commandIndex: view.commandIndex,
    events: [],
  };
  const move = (
    before: PlayerViewV7,
    after: PlayerViewV7,
    tiles: number,
    extra: Partial<Extract<CorePresentationStepV7, { kind: "MOVE" }>> = {},
  ): readonly SoundCueV1[] =>
    soundCuesForStepV7({
      step: {
        kind: "MOVE",
        unitId: unit.id,
        path: Array.from({ length: tiles + 1 }, (_, x) => ({ x, y: 1 })),
        durationMs: 240 * tiles,
        ...extra,
      },
      before,
      after,
      envelope,
      durationScale: 1,
    });

  it("walks on land and rows afloat, both sounds in the manifest", () => {
    expect(moveSoundOfUnitV7([as({})], unit.id)).toBe("unit.step");
    expect(
      moveSoundOfUnitV7([as({ form: "NAVAL", role: "PATROL_BOAT" })], unit.id),
    ).toBe("unit.step.naval");
    expect(
      moveSoundOfUnitV7([as({ form: "NAVAL", role: "BATTLESHIP" })], unit.id),
    ).toBe("unit.step.naval");
    // An embarked land unit is afloat.
    expect(moveSoundOfUnitV7([as({ form: "EMBARKED" })], unit.id)).toBe(
      "unit.step.naval",
    );
    for (const id of ["unit.step", "unit.step.naval"])
      expect(SOUND_IDS_V1 as readonly string[]).toContain(id);
  });

  it("keeps flyers silent and walks mounted units and giants", () => {
    // The Saucer and the Gyrocopter fly.
    expect(
      moveSoundOfUnitV7([as({ role: "RAIDER" }, "MARTIAN")], unit.id),
    ).toBe(null);
    expect(moveSoundOfUnitV7([as({ role: "RAIDER" }, "DWARF")], unit.id)).toBe(
      null,
    );
    // An embarked flyer is an ordinary embarked unit.
    expect(
      moveSoundOfUnitV7(
        [as({ role: "RAIDER", form: "EMBARKED" }, "MARTIAN")],
        unit.id,
      ),
    ).toBe("unit.step.naval");
    // The Human rider and every giant walk, the Giant Spider too.
    expect(moveSoundOfUnitV7([as({ role: "RAIDER" })], unit.id)).toBe(
      "unit.step",
    );
    expect(moveSoundOfUnitV7([as({ role: "KNIGHT" })], unit.id)).toBe(
      "unit.step",
    );
    for (const faction of FACTION_IDS_V7)
      expect(
        moveSoundOfUnitV7([as({ role: "JUGGERNAUT" }, faction)], unit.id),
        faction,
      ).toBe("unit.step");
    expect(
      moveSoundOfUnitV7(
        [as({ ownerId: NEUTRAL_OWNER_ID_V7, role: "JUGGERNAUT" })],
        unit.id,
      ),
    ).toBe("unit.step");
  });

  it("reads the unit where the move ends, and walks a unit no view holds", () => {
    // Embarking: on land before, afloat after.
    expect(moveSoundOfUnitV7([as({ form: "EMBARKED" }), as({})], unit.id)).toBe(
      "unit.step.naval",
    );
    // Landing: afloat before, on land after.
    expect(moveSoundOfUnitV7([as({}), as({ form: "EMBARKED" })], unit.id)).toBe(
      "unit.step",
    );
    // Gone after the move: as it was before.
    const gone: PlayerViewV7 = {
      ...view,
      units: view.units.filter((candidate) => candidate.id !== unit.id),
    };
    expect(
      moveSoundOfUnitV7(
        [gone, as({ form: "NAVAL", role: "SUBMARINE" })],
        unit.id,
      ),
    ).toBe("unit.step.naval");
    expect(moveSoundOfUnitV7([view], 987_654)).toBe("unit.step");
    expect(moveSoundOfUnitV7([], unit.id)).toBe("unit.step");
  });

  it("sounds once a short move and twice a long one, from its middle", () => {
    const land = as({});
    const ship = as({ form: "NAVAL", role: "PATROL_BOAT" });
    expect(move(land, land, 1)).toEqual([{ id: "unit.step", delayMs: 0 }]);
    expect(move(land, land, MOVE_SOUND_REPEAT_TILES_V7 - 1)).toEqual([
      { id: "unit.step", delayMs: 0 },
    ]);
    const tiles = MOVE_SOUND_REPEAT_TILES_V7;
    expect(move(ship, ship, tiles)).toEqual([
      { id: "unit.step.naval", delayMs: 0 },
      { id: "unit.step.naval", delayMs: (240 * tiles) / 2 },
    ]);
    // Another player's move, followed by the camera: the same, quieter.
    expect(move(ship, ship, tiles, { followCamera: true })).toEqual([
      { id: "unit.step.naval", delayMs: 0, gain: OTHER_PLAYER_MOVE_GAIN_V7 },
      {
        id: "unit.step.naval",
        delayMs: (240 * tiles) / 2,
        gain: OTHER_PLAYER_MOVE_GAIN_V7,
      },
    ]);
    expect(OTHER_PLAYER_MOVE_GAIN_V7).toBeLessThan(1);
    expect(OTHER_PLAYER_MOVE_GAIN_V7).toBeGreaterThan(0.4);
  });

  it("is silent for a flyer, a push, and a move seen on one tile only", () => {
    const flyer = as({ role: "RAIDER" }, "MARTIAN");
    expect(move(flyer, flyer, 2)).toEqual([]);
    expect(move(as({}), as({}), 1, { pushSlide: true })).toEqual([]);
    // The plan cuts an enemy's move where it enters the unexplored: a
    // stretch of a single tile (the camera framing it) makes no sound.
    expect(move(as({}), as({}), 0, { followCamera: true })).toEqual([]);
  });

  it("steps the viewer's own accepted move, timed with the walk", () => {
    const own = queryPlayerCommandsV7(view).find(
      (command): command is Extract<typeof command, { kind: "MOVE" }> =>
        command.kind === "MOVE",
    );
    if (own === undefined) throw new Error("no legal move");
    const moved = applyCommandV7(state, state.humanPlayerId, own);
    if (!moved.accepted) throw new Error("move rejected");
    const seen = boundary(
      state,
      moved.state,
      moved.events,
      state.humanPlayerId,
    );
    const step = seen.steps.find((candidate) => candidate.kind === "MOVE");
    expect(step).toBeDefined();
    expect(ids(seen.cues)).toContain(
      moveSoundOfUnitV7([seen.after, seen.before], own.unitId),
    );
    expect(seen.cues[0]?.delayMs).toBe(0);
  });
});

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

  it("voices a surviving target's hurt after the hit, by its kind, and not a killed one's", () => {
    // Bead pulp_wars-2yc.52.
    const { state, next, events } = duel("FIGHTER", 17);
    const seen = boundary(state, next, events, state.humanPlayerId);
    const target = state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId,
    );
    const faction = state.players.find(
      (player) => player.id === target?.ownerId,
    )?.faction;
    if (target === undefined || faction === undefined)
      throw new Error("target missing");
    const hurt = hurtSoundOfUnitV7([seen.before], { unitId: target.id });
    expect(hurt).toBe(HURT_BY_FACTION[faction]);
    expect(seen.cues.slice(0, 3)).toEqual([
      { id: "attack.melee", delayMs: 0 },
      { id: "impact.hit", delayMs: 230 * 0.56 },
      { id: hurt, delayMs: 230 * 0.56 + 40 },
    ]);
    // A kill is heard as a death, without the hurt.
    const killed = duel("FIGHTER", 1);
    const kill = boundary(
      killed.state,
      killed.next,
      killed.events,
      killed.state.humanPlayerId,
    );
    expect(ids(kill.cues).filter((id) => id.startsWith("unit.hurt"))).toEqual(
      [],
    );
    // A ranged shot too.
    const shot = duel("MARKSMAN", 17);
    expect(
      boundary(shot.state, shot.next, shot.events, shot.state.humanPlayerId)
        .cues[2],
    ).toEqual({ id: hurt, delayMs: 280 + 40 });
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

  it("steps every player's moves, another's quieter, pushes silent", () => {
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
    // Bead pulp_wars-2yc.57: another player's move is heard too, quieter.
    expect(
      cue({
        kind: "MOVE",
        unitId: 1,
        path,
        durationMs: 90,
        followCamera: true,
      }),
    ).toEqual([
      { id: "unit.step", delayMs: 0, gain: OTHER_PLAYER_MOVE_GAIN_V7 },
    ]);
    expect(
      cue({ kind: "MOVE", unitId: 1, path, durationMs: 120, pushSlide: true }),
    ).toEqual([]);
    const damaged = view.units[0]?.id ?? 1;
    expect(
      cue({
        kind: "DAMAGE",
        unitId: damaged,
        at: origin,
        damage: 3,
        lethal: true,
        durationMs: 100,
      }),
    ).toEqual([
      // The damaged unit's own hurt sound (bead pulp_wars-2yc.52).
      { id: hurtSoundOfUnitV7([view], { unitId: damaged }), delayMs: 0 },
      { id: "unit.death", delayMs: 60 },
    ]);
    expect(hurtSoundOfUnitV7([view], { unitId: damaged })).not.toBe(
      "unit.hurt",
    );
    expect(
      cue({
        kind: "DAMAGE",
        unitId: 987_654,
        at: origin,
        damage: 3,
        lethal: false,
        durationMs: 100,
      }),
    ).toEqual([{ id: "unit.hurt", delayMs: 0 }]);
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

  it("gives the Cultists' signature cues their own sounds", () => {
    // Bead pulp_wars-mch9.24: the `cult.*` ids replace the stand-ins of
    // U2 and U3 for the signature events; the rest keep the game's sounds.
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
    const cues = (effect: CultFeedbackEffectV7): readonly SoundCueV1[] =>
      soundCuesForStepV7({
        step: {
          kind: "CULT",
          effect,
          cells: [{ x: 1, y: 1 }],
          durationMs: CULT_EFFECT_DURATIONS_V7[effect],
        },
        before: view,
        after: view,
        envelope,
        durationScale: 1,
      });
    const expected: Readonly<Record<CultFeedbackEffectV7, readonly string[]>> =
      {
        SUMMON: ["cult.summon"],
        STRAND_FORMED: [],
        STRAND_SNAP: ["cult.snap"],
        BOO: ["special.boing"],
        UNBOUND: ["cult.unbound"],
        RITUAL_BEGUN: ["support.dark"],
        RITUAL_FIZZLE: ["special.puff"],
        STARFALL: ["cult.starfall", "impact.explosion"],
        HERALD: ["cult.herald"],
        CONSUMED: ["special.puff"],
        PROCLAIM: ["cult.proclaim"],
        RIBBIT: ["cult.ribbit"],
        SWITCHEROO: ["special.sparkle"],
        TENTACLE: ["cult.tentacle"],
        GRAB: ["special.boing"],
        PAMPHLETS: ["cult.pamphlets"],
      };
    for (const effect of Object.keys(expected) as CultFeedbackEffectV7[]) {
      expect(ids(cues(effect)), effect).toEqual(expected[effect]);
      for (const cue of cues(effect)) {
        expect(SOUND_IDS_V1, cue.id).toContain(cue.id);
        expect(cue.delayMs).toBeGreaterThanOrEqual(0);
        expect(cue.delayMs).toBeLessThan(CULT_EFFECT_DURATIONS_V7[effect]);
      }
    }
    expect(Object.keys(expected).sort()).toEqual(
      Object.keys(CULT_EFFECT_DURATIONS_V7).sort(),
    );
    // The star's burst lands inside its flight; the croak waits for the frog.
    expect(cues("STARFALL")[1]?.delayMs).toBeCloseTo(
      CULT_EFFECT_DURATIONS_V7.STARFALL * 0.42,
    );
    expect(cues("RIBBIT")[0]?.delayMs).toBeGreaterThan(0);
    // No signature event is left on the sound it borrowed.
    const signature = (
      [
        "SUMMON",
        "STRAND_SNAP",
        "UNBOUND",
        "STARFALL",
        "HERALD",
        "PROCLAIM",
        "RIBBIT",
        "TENTACLE",
        "PAMPHLETS",
      ] as const
    ).map((effect) => cues(effect)[0]?.id);
    for (const id of signature) expect(id).toMatch(/^cult\./);
    expect(new Set(signature).size).toBe(signature.length);
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

  it("plays the user's rocket recording in two halves, its impact on the hit", () => {
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
    const cues = (
      attackEffect: (typeof ATTACK_EFFECT_IDS_V7)[number],
    ): readonly SoundCueV1[] =>
      soundCuesForStepV7({
        step: {
          kind: "CATAPULT",
          unitId: 1,
          from: { x: 1, y: 1 },
          to: { x: 3, y: 1 },
          durationMs: 280,
          attackEffect,
        },
        before: view,
        after: view,
        envelope,
        durationScale: 1,
      });
    const hitMs =
      ATTACK_EFFECT_DURATIONS_V7.FIREWORK_ROCKET *
      ATTACK_EFFECT_HIT_V7.FIREWORK_ROCKET;
    // The launch half at once, the impact half on the hit; no explosion
    // over it.
    expect(cues("FIREWORK_ROCKET")).toEqual([
      { id: "attack.rocket", delayMs: 0 },
      { id: "impact.rocket", delayMs: hitMs },
    ]);
    // The two halves are 275 ms apart in the recording: the hit is there.
    expect(hitMs).toBeGreaterThan(260);
    expect(hitMs).toBeLessThan(300);
    // The other weapons keep their sounds; only the rocket plays its own.
    expect(ids(cues("BROADSIDE"))).toEqual([
      "attack.cannon",
      "impact.explosion",
    ]);
    for (const effect of ATTACK_EFFECT_IDS_V7) {
      if (effect === "FIREWORK_ROCKET") continue;
      expect(ids(cues(effect)), effect).not.toContain("attack.rocket");
      expect(ids(cues(effect)), effect).not.toContain("impact.rocket");
    }
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

  it("keeps a Monument silent, the viewer's own too (the user, 2026-10-14)", () => {
    expect(
      sounds([
        {
          kind: "MONUMENT_BUILT",
          visibility: "FULL",
          playerId: viewer,
          cityId: city.id,
          achievement: "EXPLORER",
          at: city.at,
          populationAdded: 3,
        },
      ]),
    ).toEqual({ start: [], end: [], essential: [] });
  });

  it("sounds a Sacrifice for the viewer and both sides of a Seize", () => {
    // Bead pulp_wars-mch9.24.
    const at = { x: 2, y: 2 };
    const sacrificed = (playerId: PlayerId): PlayerEventV7 => ({
      kind: "UNIT_SACRIFICED",
      playerId,
      unitId: unit.id,
      victimUnitId: (unit.id + 1) as UnitId,
      role: "FIGHTER",
      at,
      favour: 2,
    });
    const seized = (playerId: PlayerId, victimOwnerId: PlayerId) =>
      ({
        kind: "UNIT_SEIZED",
        playerId,
        unitId: unit.id,
        holderUnitId: (unit.id + 2) as UnitId,
        victimUnitId: (unit.id + 1) as UnitId,
        victimOwnerId,
        role: "FIGHTER",
        at,
        favour: 4,
      }) satisfies PlayerEventV7;
    expect(sounds([sacrificed(viewer)])).toEqual({
      start: [{ id: "cult.sacrifice", delayMs: 0 }],
      end: [],
      essential: [],
    });
    expect(ids(sounds([seized(viewer, other)]).start)).toEqual([
      "cult.sacrifice",
    ]);
    expect(ids(sounds([seized(other, viewer)]).start)).toEqual([
      "cult.sacrifice",
    ]);
    // Another Cult's rites, seen by a bystander, are silent.
    expect(sounds([sacrificed(other)]).start).toEqual([]);
    const third = (Math.max(viewer, other) + 1) as PlayerId;
    expect(sounds([seized(other, third)]).start).toEqual([]);
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

  it("plays the victory tune online only to the winner (pulp_wars-eqc6.3)", () => {
    const online: PlayerViewV7 = {
      ...view,
      setup: { ...view.setup, humanSeats: [0, 1] },
    };
    const ended = (winnerId: PlayerId) =>
      soundCuesForBoundaryV7(
        online,
        {
          format: "pulp-wars-player-events",
          version: 7,
          viewerId: viewer,
          commandIndex: view.commandIndex,
          events: [
            { kind: "MATCH_ENDED", outcome: { kind: "VICTORY", winnerId } },
          ],
        },
        online,
      ).essential;
    expect(ended(viewer)).toEqual([{ id: "match.victory", delayMs: 0 }]);
    expect(ended(other)).toEqual([{ id: "match.defeat", delayMs: 0 }]);
  });
});
