import { describe, expect, it } from "vitest";
import {
  measureTakeV1,
  momentaryLufsV1,
  takeFailuresV1,
  type TakeMeasurementV1,
} from "../../scripts/audio/elevenlabs-sfx-measure";
import { selectTakesV1 } from "../../scripts/audio/elevenlabs-sfx-select";

/**
 * The measurements that choose among the ElevenLabs takes (bead
 * pulp_wars-2yc.51, docs/audio/ELEVENLABS_SFX.md "How the takes were
 * judged"), on small hand-made sounds: no file, no service, no sound.
 */

const RATE = 44_100;

/** A decaying tone burst at `startSeconds` in `totalSeconds` of silence. */
function burst(
  totalSeconds: number,
  startSeconds: number,
  hz: number,
  decaySeconds: number,
  level = 0.8,
): Float32Array {
  const samples = new Float32Array(Math.round(totalSeconds * RATE));
  const start = Math.round(startSeconds * RATE);
  for (let i = start; i < samples.length; i += 1) {
    const t = (i - start) / RATE;
    samples[i] =
      level * Math.exp(-t / decaySeconds) * Math.sin(2 * Math.PI * hz * t);
  }
  return samples;
}

const CLICK = { kind: "ui" as const, minSeconds: 0.01, maxSeconds: 0.12 };

describe("measuring a take", () => {
  it("trims the silence, finds a hard onset and passes a clean click", () => {
    const m = measureTakeV1(burst(0.5, 0.1, 2400, 0.012), RATE, CLICK);
    expect(m.leadMs).toBeGreaterThanOrEqual(95);
    expect(m.leadMs).toBeLessThanOrEqual(105);
    expect(m.onsetMs).toBeLessThanOrEqual(10);
    expect(m.clipSeconds).toBeLessThanOrEqual(CLICK.maxSeconds + 0.01);
    expect(m.centroidHz).toBeGreaterThan(2000);
    expect(m.centroidHz).toBeLessThan(3000);
    expect(m.clippedRunShare).toBe(0);
    expect(takeFailuresV1(CLICK, m)).toEqual([]);
  });

  it("fails a take that is flat-topped at full scale", () => {
    const samples = burst(0.5, 0.05, 300, 0.2, 3).map((value) =>
      Math.max(-1, Math.min(1, value)),
    );
    const m = measureTakeV1(samples, RATE, {
      kind: "hit",
      maxSeconds: 0.5,
    });
    expect(m.clippedRunShare).toBeGreaterThan(0.001);
    expect(takeFailuresV1({ ...CLICK, kind: "hit" }, m).join()).toMatch(
      /clipped/,
    );
  });

  it("fails a take that runs past its sound's length, or is silent", () => {
    const long = measureTakeV1(burst(1.5, 0, 800, 2), RATE, {
      kind: "effect",
      maxSeconds: 0.3,
    });
    expect(long.energyPastLength).toBeGreaterThan(0.5);
    expect(long.clipSeconds).toBeCloseTo(0.3 + 0.003, 2);
    expect(
      takeFailuresV1(
        { kind: "effect", minSeconds: 0.1, maxSeconds: 0.3 },
        long,
      ).join(),
    ).toMatch(/too long/);
    const quiet = measureTakeV1(burst(0.5, 0, 800, 0.1, 0.01), RATE, CLICK);
    expect(takeFailuresV1(CLICK, quiet).join()).toMatch(/silent/);
  });

  it("measures loudness as BS.1770 does for a full-scale 997 Hz tone", () => {
    const tone = new Float32Array(RATE);
    for (let i = 0; i < tone.length; i += 1)
      tone[i] = Math.sin((2 * Math.PI * 997 * i) / RATE);
    expect(momentaryLufsV1(tone, RATE)).toBeCloseTo(-3.01, 0);
  });
});

describe("choosing among takes", () => {
  const sound = {
    id: "ui.click",
    kind: "ui" as const,
    minSeconds: 0.01,
    maxSeconds: 0.12,
  };
  const clean = measureTakeV1(burst(0.5, 0.1, 2400, 0.012), RATE, sound);
  const longer = measureTakeV1(burst(0.5, 0.1, 3000, 0.03), RATE, sound);

  it("drops a near-duplicate and makes the best-scoring take the default", () => {
    const selection = selectTakesV1(sound, [
      { n: 101, round: 1, take: 1, measured: longer },
      { n: 102, round: 1, take: 2, measured: clean },
      { n: 103, round: 1, take: 3, measured: clean },
    ]);
    expect(selection.kept[0]).toBe(102);
    expect(selection.kept).not.toContain(103);
    expect(
      selection.takes.find((take) => take.n === 103)?.failures.join(),
    ).toMatch(/near-duplicate of #102/);
    expect(selection.offered).toEqual([]);
  });

  it("offers the best shape failures when none passes, never a clipped one", () => {
    const tooLong: TakeMeasurementV1 = { ...clean, energyPastLength: 0.4 };
    const clipped: TakeMeasurementV1 = { ...clean, clippedRunShare: 0.01 };
    const selection = selectTakesV1(sound, [
      { n: 101, round: 1, take: 1, measured: clipped },
      { n: 102, round: 1, take: 2, measured: tooLong },
    ]);
    expect(selection.kept).toEqual([]);
    expect(selection.offered).toEqual([102]);
    expect(selection.confidence).toBe("low");
  });
});
