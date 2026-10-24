import { describe, expect, it } from "vitest";
import { soundCuesForStepV7 } from "../../src/audio/index";
import {
  applyCommandV7,
  createPlayableGameV7,
  MISSION_REGISTRY_V7,
  MISSION_WAVE_TEXT_MAX_V7,
  missionByIdV7,
  missionMatchSetupV7,
  missionSeatFactionsV7,
  missionWaveTextProblemV7,
  projectEventsV7,
  validateMissionDefinitionV7,
  viewForV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
  type PlayerEventEnvelopeV7,
  type PlayerId,
  type PlayerViewV7,
} from "../../src/engine/index";
import { playbackCameraEventsV7 } from "../../src/render/canvas/playback-camera-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { cityNameV7 } from "../../src/render/city-names-presentation-v7";
import {
  boardRegionV7,
  boundaryBeginsViewerTurnV7,
  DEFAULT_WAVE_LINES_V7,
  waveArrivalBannerV7,
  waveHeadsUpBannersV7,
  waveHeadsUpRoundV7,
  waveLineV7,
  waveSideV7,
} from "../../src/render/reinforcement-presentation-v7";

/**
 * The reinforcement banner (`pulp_wars-hmyk.18`, docs/product/CAMPAIGN.md
 * section 10.3, docs/product/SAGA.md section 4, E4): who arrived and
 * where, the side's stinger, the wave's story line, and the scouts'
 * heads-up. Hand-built boundaries of the hidden fixture `TEST_WAVES`: each
 * seat only ends its turn, nobody plays.
 */

function definition(id: string): MissionDefinitionV7 {
  const mission = missionByIdV7(id);
  if (mission === null) throw new Error(`${id} is not registered`);
  return mission;
}

function start(id = "TEST_WAVES"): GameStateV7 {
  const mission = definition(id);
  const setup = missionMatchSetupV7(
    mission,
    missionSeatFactionsV7(mission.seats[0] as never)[0] as FactionIdV7,
  );
  if (setup === null) throw new Error(`${id}: no setup`);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

interface BoundaryV7 {
  readonly state: GameStateV7;
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly envelope: PlayerEventEnvelopeV7;
}

/** The active seat ends its turn; what the human sees of it. */
function endTurn(state: GameStateV7): BoundaryV7 {
  const actor = state.turnOrder[state.activeSeatIndex] as PlayerId;
  const applied = applyCommandV7(state, actor, { kind: "END_TURN" });
  if (!applied.accepted) throw new Error(applied.error.code);
  return {
    state: applied.state,
    before: viewForV7(state, state.humanPlayerId),
    after: viewForV7(applied.state, applied.state.humanPlayerId),
    envelope: projectEventsV7(
      state,
      applied.state,
      state.humanPlayerId,
      applied.events,
    ),
  };
}

/** Every boundary of `count` End Turns in a row. */
function endTurns(state: GameStateV7, count: number): readonly BoundaryV7[] {
  const boundaries: BoundaryV7[] = [];
  let current = state;
  for (let index = 0; index < count; index += 1) {
    const boundary = endTurn(current);
    boundaries.push(boundary);
    current = boundary.state;
  }
  return boundaries;
}

function waveSteps(boundary: BoundaryV7): CorePresentationStepV7[] {
  return corePresentationPlanV7(
    boundary.before,
    boundary.envelope,
    boundary.after,
  ).filter((step) => step.kind === "REINFORCEMENT");
}

/** Three seats: you (0), the Undead ally (1), the Goblins (2). */
const ROUND_ONE = 3;

describe("the reinforcement banner", () => {
  it("names an allied wave's side, count, place and its own story line", () => {
    const state = start();
    const boundaries = endTurns(state, ROUND_ONE + 1);
    // Round 2: your End Turn starts the Undead's turn, and their wave.
    const boundary = boundaries[ROUND_ONE] as BoundaryV7;
    expect(boundary.after.round).toBe(2);
    const banner = waveArrivalBannerV7(
      boundary.after,
      boundary.envelope.events,
    );
    const ally = boundary.after.players[1];
    const allyCity = boundary.after.cities.find(
      (city) => city.ownerId === ally?.id,
    );
    expect(allyCity).toBeDefined();
    expect(banner).toEqual({
      kind: "ARRIVAL",
      side: "ALLY",
      playerId: ally?.id,
      faction: "UNDEAD",
      title: "Allied reinforcements!",
      text: `Two Undead warriors arrive near ${cityNameV7(boundary.after, allyCity as never)}.`,
      line: "The dead are here. They apologise for the delay.",
      cells: [
        { x: 6, y: 7 },
        { x: 7, y: 6 },
      ],
    });
    // One step, framed by the playback camera, with the heroic stinger.
    const steps = waveSteps(boundary);
    expect(steps).toHaveLength(1);
    const step = steps[0] as Extract<
      CorePresentationStepV7,
      { kind: "REINFORCEMENT" }
    >;
    expect(step).toMatchObject({
      side: "ALLY",
      playerId: ally?.id,
      followCamera: true,
      cells: banner?.cells,
    });
    expect(
      playbackCameraEventsV7(
        corePresentationPlanV7(
          boundary.before,
          boundary.envelope,
          boundary.after,
        ),
        false,
      ).map((event) => event.cells),
    ).toContainEqual(step.cells);
    expect(
      soundCuesForStepV7({
        step,
        before: boundary.before,
        after: boundary.after,
        envelope: boundary.envelope,
        durationScale: 1,
      }),
    ).toEqual([{ id: "match.wave.ally", delayMs: 0 }]);
  });

  it("gives an enemy wave the default line of its faction and the ominous stinger", () => {
    const boundaries = endTurns(start(), ROUND_ONE + 2);
    // Round 2: the Undead end their turn and the Goblins' wave comes.
    const boundary = boundaries[ROUND_ONE + 1] as BoundaryV7;
    const banner = waveArrivalBannerV7(
      boundary.after,
      boundary.envelope.events,
    );
    expect(banner).toMatchObject({
      kind: "ARRIVAL",
      side: "ENEMY",
      faction: "GOBLIN",
      title: "Enemy reinforcements!",
      line: DEFAULT_WAVE_LINES_V7.GOBLIN.enemy,
    });
    expect(banner?.text).toMatch(/^Three Goblin raiders arrive (near|in) /);
    expect(banner?.cells).toHaveLength(3);
    const steps = waveSteps(boundary);
    expect(steps).toHaveLength(1);
    expect(
      soundCuesForStepV7({
        step: steps[0] as CorePresentationStepV7,
        before: boundary.before,
        after: boundary.after,
        envelope: boundary.envelope,
        durationScale: 1,
      }),
    ).toEqual([{ id: "match.wave.enemy", delayMs: 0 }]);
  });

  it("calls the viewer's own wave theirs, in the singular", () => {
    const boundaries = endTurns(start(), 2 * ROUND_ONE);
    // Round 3: the Goblins' End Turn starts your turn, and your Guard.
    const boundary = boundaries.at(-1) as BoundaryV7;
    expect(boundary.after.round).toBe(3);
    const banner = waveArrivalBannerV7(
      boundary.after,
      boundary.envelope.events,
    );
    expect(banner).toMatchObject({
      side: "OWN",
      faction: "ORIGINAL",
      title: "Your reinforcements!",
      line: DEFAULT_WAVE_LINES_V7.ORIGINAL.friend,
    });
    expect(banner?.text).toMatch(/^A Human soldier arrives near /);
    expect(waveSteps(boundary)).toHaveLength(1);
  });

  // `pulp_wars-hmyk.35`: a held wave keeps its banner, stinger and story
  // line for the round it actually arrives in.
  it("shows a held wave's banner, line and stinger when it arrives", () => {
    const initial = start();
    const goblin = initial.players[2];
    const model = initial.units.find((unit) => unit.ownerId === goblin?.id);
    if (model === undefined) throw new Error("no Goblin unit");
    // Goblins beside every tile within 3 of the Undead wave's tiles.
    const blockers = [4, 7, 10].flatMap((x) =>
      [4, 7, 10].map((y) => ({ x, y })),
    );
    const blocked: GameStateV7 = {
      ...initial,
      nextEntityId: initial.nextEntityId + blockers.length,
      units: [
        ...initial.units,
        ...blockers.map((at, index) => ({
          ...model,
          id: (initial.nextEntityId + index) as never,
          homeCityId: null,
          at,
        })),
      ],
    };
    const boundaries = endTurns(blocked, 2 * ROUND_ONE);
    // Round 2: the Undead's Start Turn brings nothing; the wave is held.
    const held = boundaries[ROUND_ONE] as BoundaryV7;
    expect(held.after.round).toBe(2);
    expect(waveArrivalBannerV7(held.after, held.envelope.events)).toBeNull();
    expect(waveSteps(held)).toEqual([]);
    // Round 3, your turn: the Goblins walk off; your End Turn brings it.
    const last = boundaries.at(-1) as BoundaryV7;
    expect(last.after.round).toBe(3);
    const cleared: GameStateV7 = {
      ...last.state,
      units: last.state.units.filter(
        (unit) =>
          !blockers.some((at) => at.x === unit.at.x && at.y === unit.at.y),
      ),
    };
    const arrival = endTurn(cleared);
    expect(arrival.after.round).toBe(3);
    const banner = waveArrivalBannerV7(arrival.after, arrival.envelope.events);
    expect(banner).toMatchObject({
      kind: "ARRIVAL",
      side: "ALLY",
      faction: "UNDEAD",
      title: "Allied reinforcements!",
      line: "The dead are here. They apologise for the delay.",
      cells: [
        { x: 6, y: 7 },
        { x: 7, y: 6 },
      ],
    });
    const steps = waveSteps(arrival);
    expect(steps).toHaveLength(1);
    expect(
      soundCuesForStepV7({
        step: steps[0] as CorePresentationStepV7,
        before: arrival.before,
        after: arrival.after,
        envelope: arrival.envelope,
        durationScale: 1,
      }),
    ).toEqual([{ id: "match.wave.ally", delayMs: 0 }]);
  });

  it("shows no banner and plans no wave step for a boundary without one", () => {
    for (const boundary of endTurns(start(), ROUND_ONE)) {
      expect(
        waveArrivalBannerV7(boundary.after, boundary.envelope.events),
      ).toBeNull();
      expect(waveSteps(boundary)).toEqual([]);
    }
  });

  it("never names a tile", () => {
    for (const boundary of endTurns(start(), 2 * ROUND_ONE)) {
      const banner = waveArrivalBannerV7(
        boundary.after,
        boundary.envelope.events,
      );
      if (banner === null) continue;
      for (const words of [banner.title, banner.text, banner.line ?? ""])
        expect(words).not.toMatch(/\d\s*,\s*\d/);
    }
  });
});

describe("the parts of a banner", () => {
  it("tells the side of a seat from the viewer's", () => {
    const view = viewForV7(start(), start().humanPlayerId);
    const [you, ally, enemy] = view.players;
    expect(waveSideV7(view, you?.id as number)).toBe("OWN");
    expect(waveSideV7(view, ally?.id as number)).toBe("ALLY");
    expect(waveSideV7(view, enemy?.id as number)).toBe("ENEMY");
  });

  it("names nine parts of the board", () => {
    const board = { width: 11, height: 11 } as const;
    expect(boardRegionV7(board, { x: 0, y: 0 })).toBe("the north-west");
    expect(boardRegionV7(board, { x: 5, y: 1 })).toBe("the north");
    expect(boardRegionV7(board, { x: 10, y: 5 })).toBe("the east");
    expect(boardRegionV7(board, { x: 5, y: 5 })).toBe("the middle of the map");
    expect(boardRegionV7(board, { x: 9, y: 9 })).toBe("the south-east");
  });

  it("gives every faction an enemy line and a friendly line", () => {
    for (const lines of Object.values(DEFAULT_WAVE_LINES_V7))
      for (const line of [lines.enemy, lines.friend])
        expect(missionWaveTextProblemV7(line)).toBeNull();
    expect(waveLineV7("CULT", "ENEMY")).toBe(DEFAULT_WAVE_LINES_V7.CULT.enemy);
    expect(waveLineV7("CULT", "ALLY")).toBe(DEFAULT_WAVE_LINES_V7.CULT.friend);
    expect(waveLineV7("CULT", "OWN", { line: "Ours." })).toBe("Ours.");
  });
});

describe("E4: the story line and the heads-up of a wave", () => {
  it("gives every wave of every registered mission a line to show", () => {
    let waves = 0;
    for (const mission of MISSION_REGISTRY_V7)
      for (const wave of mission.reinforcements ?? []) {
        waves += 1;
        const seat = mission.seats[wave.seat];
        const faction = missionSeatFactionsV7(seat as never)[0] as FactionIdV7;
        const line = waveLineV7(
          faction,
          wave.seat === 0 ? "OWN" : "ENEMY",
          wave,
        );
        expect(missionWaveTextProblemV7(line), mission.id).toBeNull();
        if (wave.announce !== undefined && wave.announce !== true)
          expect(missionWaveTextProblemV7(wave.announce)).toBeNull();
      }
    expect(waves).toBeGreaterThan(20);
  });

  it("refuses a line or a heads-up that cannot be shown", () => {
    expect(missionWaveTextProblemV7("The glacier cracks.")).toBeNull();
    expect(missionWaveTextProblemV7("")).toBe("is empty");
    expect(missionWaveTextProblemV7(" Padded.")).toBe("has spaces at its ends");
    expect(
      missionWaveTextProblemV7("x".repeat(MISSION_WAVE_TEXT_MAX_V7 + 1)),
    ).toBe(`is longer than ${String(MISSION_WAVE_TEXT_MAX_V7)} characters`);
    expect(missionWaveTextProblemV7("Two\nlines.")).toBe(
      "is more than one line",
    );
    expect(missionWaveTextProblemV7("They land at 4, 7.")).toBe("names a tile");
    const mission = definition("TEST_WAVES");
    const edited = (
      change: (
        wave: NonNullable<MissionDefinitionV7["reinforcements"]>[number],
      ) => object,
    ): MissionDefinitionV7 => ({
      ...mission,
      reinforcements: (mission.reinforcements ?? []).map((wave, index) =>
        index === 0 ? { ...wave, ...change(wave) } : wave,
      ),
    });
    expect(() => validateMissionDefinitionV7(mission)).not.toThrow();
    expect(() =>
      validateMissionDefinitionV7(edited(() => ({ line: "" }))),
    ).toThrow(/a reinforcement line is empty/);
    expect(() =>
      validateMissionDefinitionV7(edited(() => ({ announce: "x".repeat(91) }))),
    ).toThrow(/a reinforcement heads-up is longer than 90 characters/);
    expect(() =>
      validateMissionDefinitionV7(edited(() => ({ announce: false }))),
    ).toThrow(/a reinforcement heads-up is neither true nor a sentence/);
  });

  it("warns at the start of the player's last turn before an announced wave", () => {
    const state = start();
    const boundaries = endTurns(state, 2 * ROUND_ONE);
    const turnStarts = boundaries.filter((boundary) =>
      boundaryBeginsViewerTurnV7(boundary.before, boundary.after),
    );
    // The Goblins' End Turns of rounds 1 and 2 begin your turns 2 and 3.
    expect(turnStarts.map((boundary) => boundary.after.round)).toEqual([2, 3]);
    const [two, three] = turnStarts;
    expect(waveHeadsUpBannersV7(two?.after as PlayerViewV7)).toEqual([
      {
        kind: "HEADS_UP",
        side: "ENEMY",
        playerId: two?.after.players[2]?.id,
        faction: "GOBLIN",
        title: "Enemies approaching!",
        text: "Scouts report Goblins approaching from the north.",
        line: null,
        cells: [],
      },
    ]);
    expect(waveHeadsUpBannersV7(three?.after as PlayerViewV7)).toEqual([]);
    // Not in round 1, and not in another seat's turn.
    expect(waveHeadsUpBannersV7(viewForV7(state, state.humanPlayerId))).toEqual(
      [],
    );
    expect(waveHeadsUpBannersV7(boundaries[0]?.after as PlayerViewV7)).toEqual(
      [],
    );
  });

  it("puts the heads-up of a wave of the viewer's own seat a round early", () => {
    const view = viewForV7(start(), start().humanPlayerId);
    expect(waveHeadsUpRoundV7(view, { seat: 0, round: 3 })).toBe(2);
    expect(waveHeadsUpRoundV7(view, { seat: 1, round: 3 })).toBe(3);
    expect(waveHeadsUpRoundV7(view, { seat: 2, round: 3 })).toBe(3);
  });

  it("writes a heads-up as the mission gives it, for the viewer's own wave too", () => {
    const mission = definition("TEST_WAVES");
    const announced: MissionDefinitionV7 = {
      ...mission,
      reinforcements: (mission.reinforcements ?? []).map((wave) =>
        wave.seat === 0
          ? { ...wave, announce: "Riders from the coast are a day out." }
          : wave.seat === 1
            ? { ...wave, round: 3, announce: true }
            : wave,
      ),
    };
    const two = endTurns(start(), ROUND_ONE).at(-1) as BoundaryV7;
    expect(
      waveHeadsUpBannersV7(two.after, announced).map((banner) => [
        banner.side,
        banner.text,
      ]),
    ).toEqual([
      ["ENEMY", "Scouts report Goblins approaching from the north."],
      ["OWN", "Riders from the coast are a day out."],
    ]);
    const three = endTurns(start(), 2 * ROUND_ONE).at(-1) as BoundaryV7;
    expect(
      waveHeadsUpBannersV7(three.after, announced).map((banner) => [
        banner.side,
        banner.text,
      ]),
    ).toEqual([
      ["ALLY", "Scouts report allied Undead approaching from the south-east."],
    ]);
  });
});
