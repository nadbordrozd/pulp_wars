import { describe, expect, it } from "vitest";
import {
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
  type MapCommandTargetV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  ATTACK_KO_LABEL_V7,
  ATTACKER_LOST_LABEL_V7,
  HP_LOSS_CHUNK_COLORS_V7,
  LETHAL_LABEL_FILL_V7,
  attackDamageLabelV7,
  attackHpLossV7,
  hpLossChunksV7,
  hpLossPulseAlphaV7,
  hpLossSpanSharesV7,
  labelSkullCountV7,
  type HpLossPreviewV7,
} from "../../src/render/canvas/hp-loss-preview-v7";
import { undeadUiArenaV7 } from "../fixtures/v7-undead-ui";

// Bead pulp_wars-2yc.81 (docs/ui/UI_REVIEW_2026_10.md V9): the lethal
// attack preview. "Deal N · KO" with a skull when the hit kills, "Lost"
// when the strike-back kills the attacker, and the chunk each unit would
// lose on its HP bar, all from the engine's exact combat preview.

const preview = (
  extra: Partial<Parameters<typeof attackDamageLabelV7>[0]> = {},
) => ({
  damageToDefender: 3,
  damageToAttacker: 1,
  defenderDies: false,
  attackerDies: false,
  ...extra,
});

describe("the attack label (V9)", () => {
  it("keeps 'Deal N · take M' without a skull when nothing dies", () => {
    expect(attackDamageLabelV7(preview())).toEqual({
      text: "Deal 3 · take 1",
      skullBefore: [],
    });
  });

  it("reads 'Deal N · KO' with a skull when the hit kills", () => {
    expect(
      attackDamageLabelV7(
        preview({
          damageToDefender: 3,
          damageToAttacker: 0,
          defenderDies: true,
        }),
      ),
    ).toEqual({ text: "Deal 3 · KO", skullBefore: [ATTACK_KO_LABEL_V7] });
  });

  it("keeps the 'take' part of a kill that still hurts the attacker", () => {
    expect(
      attackDamageLabelV7(preview({ damageToAttacker: 2, defenderDies: true }))
        .text,
    ).toBe("Deal 3 · KO · take 2");
  });

  it("adds 'Lost' with a skull when the strike-back kills the attacker", () => {
    expect(
      attackDamageLabelV7(
        preview({
          damageToDefender: 1,
          damageToAttacker: 5,
          attackerDies: true,
        }),
      ),
    ).toEqual({
      text: "Deal 1 · take 5 · Lost",
      skullBefore: [ATTACKER_LOST_LABEL_V7],
    });
  });

  it("counts a skull only in front of its own part of a wrapped line", () => {
    expect(labelSkullCountV7("Deal 3 · KO", ["KO"])).toBe(1);
    expect(labelSkullCountV7("Deal 3", ["KO"])).toBe(0);
    expect(labelSkullCountV7("KO · take 2 · Lost", ["KO", "Lost"])).toBe(2);
    expect(labelSkullCountV7("Deal 3 · KO", [])).toBe(0);
  });
});

describe("the HP chunks (V9)", () => {
  const combat = {
    attackerId: 1,
    targetUnitId: 2,
    damageToDefender: 4,
    damageToAttacker: 2,
    defenderDies: false,
    attackerDies: false,
    splash: [
      {
        unitId: 3,
        at: { x: 4, y: 3 },
        damage: 2,
        dies: true,
        shieldDamage: 0,
      },
    ],
  } as unknown as Parameters<typeof attackHpLossV7>[0];

  it("carries the defender's public HP for its label's bar", () => {
    expect(
      attackHpLossV7(combat, { x: 2, y: 3 }, { x: 3, y: 3 }, [], {
        hp: 7,
        maxHp: 10,
      })[0],
    ).toMatchObject({ role: "TARGET", hp: 7, maxHp: 10 });
  });

  it("takes the defender's, the strike-back's and each splash victim's HP from the preview", () => {
    expect(attackHpLossV7(combat, { x: 2, y: 3 }, { x: 3, y: 3 })).toEqual([
      {
        unitId: 2,
        at: { x: 3, y: 3 },
        damage: 4,
        lethal: false,
        role: "TARGET",
      },
      {
        unitId: 1,
        at: { x: 2, y: 3 },
        damage: 2,
        lethal: false,
        role: "ATTACKER",
      },
      { unitId: 3, at: { x: 4, y: 3 }, damage: 2, lethal: true, role: "OTHER" },
    ]);
    // No strike-back, no attacker chunk.
    expect(
      attackHpLossV7(
        { ...combat, damageToAttacker: 0, splash: [] },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ).map((loss) => loss.role),
    ).toEqual(["TARGET"]);
  });

  const target = (
    at: CoordV7,
    hpLoss: readonly HpLossPreviewV7[],
  ): Pick<MapCommandTargetV7, "at" | "hpLoss"> => ({ at, hpLoss });
  const loss = (
    unitId: number,
    damage: number,
    role: HpLossPreviewV7["role"],
    lethal = false,
  ): HpLossPreviewV7 => ({
    unitId,
    at: { x: unitId, y: 0 },
    damage,
    lethal,
    role,
  });

  it("shows every target's own chunk, and the strike-back and splash of the focused (or only) target", () => {
    const targets = [
      target({ x: 3, y: 3 }, [
        loss(2, 4, "TARGET"),
        loss(1, 2, "ATTACKER"),
        loss(5, 1, "OTHER"),
      ]),
      target({ x: 4, y: 4 }, [
        loss(3, 3, "TARGET", true),
        loss(1, 6, "ATTACKER"),
      ]),
    ];
    // No target focused: each target's own chunk only.
    expect([...hpLossChunksV7(targets, { x: 0, y: 0 })]).toEqual([
      ["unit:2", { damage: 4, lethal: false }],
      ["unit:3", { damage: 3, lethal: true }],
    ]);
    // The first focused: its strike-back and its splash victim too.
    expect(new Map(hpLossChunksV7(targets, { x: 3, y: 3 }))).toEqual(
      new Map([
        ["unit:2", { damage: 4, lethal: false }],
        ["unit:3", { damage: 3, lethal: true }],
        ["unit:1", { damage: 2, lethal: false }],
        ["unit:5", { damage: 1, lethal: false }],
      ]),
    );
    // The second focused: its own, larger strike-back.
    expect(hpLossChunksV7(targets, { x: 4, y: 4 }).get("unit:1")).toEqual({
      damage: 6,
      lethal: false,
    });
    // A lone target needs no focus.
    expect(
      hpLossChunksV7([targets[0] ?? target({ x: 0, y: 0 }, [])], null).get(
        "unit:1",
      ),
    ).toEqual({ damage: 2, lethal: false });
    expect(hpLossChunksV7([], null).size).toBe(0);
  });

  it("sizes the chunk from the HP now to the HP left, never past the bar's foot", () => {
    expect(hpLossSpanSharesV7(10, 10, 3)).toEqual({ from: 0.7, to: 1 });
    expect(hpLossSpanSharesV7(6, 10, 2)).toEqual({ from: 0.4, to: 0.6 });
    // A kill takes the whole fill, however large the hit.
    expect(hpLossSpanSharesV7(4, 10, 9)).toEqual({ from: 0, to: 0.4 });
    expect(hpLossSpanSharesV7(4, 10, 0)).toBeNull();
  });

  it("pulses in full motion and holds still under reduced motion", () => {
    const full = [0, 300, 600, 900].map((time) =>
      hpLossPulseAlphaV7(time, false),
    );
    expect(new Set(full).size).toBeGreaterThan(1);
    for (const alpha of full) {
      expect(alpha).toBeGreaterThanOrEqual(0.449);
      expect(alpha).toBeLessThanOrEqual(1);
    }
    for (const time of [0, 300, 600, 900])
      expect(hpLossPulseAlphaV7(time, true)).toBe(1);
  });
});

// ------------------------------------------------------------- the board

interface Fill {
  readonly fill: string;
  readonly alpha: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly fills: Fill[];
  readonly texts: string[];
} {
  const fills: Fill[] = [];
  const texts: string[] = [];
  const stack: Record<string, unknown>[] = [];
  const state: Record<string | symbol, unknown> = {
    font: "10px system-ui",
    fillStyle: "#000",
    globalAlpha: 1,
    textAlign: "center",
  };
  const context = new Proxy(state, {
    get: (target, key) => {
      if (key === "canvas") return undefined;
      if (key === "save")
        return () => stack.push({ ...(target as Record<string, unknown>) });
      if (key === "restore")
        return () => {
          const saved = stack.pop();
          if (saved !== undefined) Object.assign(target, saved);
        };
      if (key === "measureText")
        return (text: string) => ({ width: text.length * 6 });
      if (key === "fillRect")
        return (left: number, top: number, width: number, height: number) =>
          fills.push({
            fill: String(target.fillStyle),
            alpha: Number(target.globalAlpha),
            left,
            top,
            width,
            height,
          });
      if (key === "fillText") return (text: string) => texts.push(text);
      if (key in target) return target[key];
      return () => undefined;
    },
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  return {
    context: context as unknown as CanvasRenderingContext2D,
    fills,
    texts,
  };
}

const DEFENDER_AT = { x: 1, y: 1 };
const ATTACKER_AT = { x: 0, y: 1 };

function boardPlan(target: MapCommandTargetV7): BoardRenderPlanV7 {
  const unit = (
    id: number,
    at: CoordV7,
    hp: number,
  ): BoardRenderPlanEntryV7 => ({
    key: `unit:${id}`,
    layer: 5,
    at,
    kind: "UNIT",
    hp,
    maxHp: 10,
  });
  return {
    version: 7,
    entries: [
      unit(1, ATTACKER_AT, 10),
      unit(2, DEFENDER_AT, 10),
      { key: "target:0", layer: 90, at: target.at, kind: "TARGET", target },
    ],
    targets: [target],
  };
}

function attackTarget(extra: Partial<MapCommandTargetV7>): MapCommandTargetV7 {
  return {
    at: DEFENDER_AT,
    command: {
      kind: "ATTACK",
      unitId: 1,
      targetUnitId: 2,
    } as unknown as CommandV7,
    family: "ATTACK",
    ...extra,
  };
}

function drawPlan(
  plan: BoardRenderPlanV7,
  options: { readonly reducedMotion?: boolean; readonly timeMs?: number } = {},
) {
  const recording = recordingContext();
  drawBoardV7({
    context: recording.context,
    viewport: { width: 600, height: 400 },
    devicePixelRatio: 1,
    camera: { zoom: 1, offsetX: 100, offsetY: 100 },
    plan,
    previewFocus: DEFENDER_AT,
    reducedMotion: options.reducedMotion ?? false,
    hpLossPulseTimeMs: options.timeMs ?? 0,
  });
  return recording;
}

const chunkFills = (fills: readonly Fill[]): Fill[] =>
  fills.filter((fill) => fill.fill === HP_LOSS_CHUNK_COLORS_V7.base);

describe("the board draws the lethal preview (V9)", () => {
  it("draws a lethal label on the loss red with its skull before 'KO'", () => {
    const { fills, texts } = drawPlan(
      boardPlan(
        attackTarget({
          previewLabel: "Deal 3 · KO",
          previewSkullBefore: ["KO"],
        }),
      ),
    );
    expect(fills.some((fill) => fill.fill === LETHAL_LABEL_FILL_V7)).toBe(true);
    // The line is drawn in parts around the skull's pixels.
    expect(texts).toEqual(["Deal 3", " · ", "KO"]);
    const skull = fills.filter((fill) => fill.fill === "#fff8df");
    expect(skull.length).toBeGreaterThan(20);
    const skullLeft = Math.min(...skull.map((fill) => fill.left));
    expect(skullLeft).toBeGreaterThan(100 + 128 - 45);
  });

  it("keeps a survivable label on the plain plate without a skull", () => {
    const { fills, texts } = drawPlan(
      boardPlan(attackTarget({ previewLabel: "Deal 3 · take 1" })),
    );
    expect(fills.some((fill) => fill.fill === LETHAL_LABEL_FILL_V7)).toBe(
      false,
    );
    expect(texts).toEqual(["Deal 3 · take 1"]);
  });

  it("hatches the target's lost HP and the attacker's strike-back on their bars", () => {
    const { fills } = drawPlan(
      boardPlan(
        attackTarget({
          previewLabel: "Deal 3 · take 2",
          hpLoss: [
            {
              unitId: 2,
              at: DEFENDER_AT,
              damage: 3,
              lethal: false,
              role: "TARGET",
            },
            {
              unitId: 1,
              at: ATTACKER_AT,
              damage: 2,
              lethal: false,
              role: "ATTACKER",
            },
          ],
        }),
      ),
    );
    const chunks = chunkFills(fills);
    expect(chunks).toHaveLength(2);
    // The classic flat bar: 48 px of fill from x - 24 under each unit.
    const defenderX = 100 + 128;
    const attackerX = 100;
    const [attacker, defender] = [...chunks].sort((a, b) => a.left - b.left);
    expect(defender?.left).toBeCloseTo(defenderX - 24 + 48 * 0.7);
    expect(defender?.width).toBeCloseTo(48 * 0.3);
    expect(attacker?.left).toBeCloseTo(attackerX - 24 + 48 * 0.8);
    expect(attacker?.width).toBeCloseTo(48 * 0.2);
    // The loss-red stripes are drawn as paths, over the cream.
    for (const chunk of chunks) expect(chunk.alpha).toBe(1);
  });

  it("hatches a lethal hit's whole remaining fill", () => {
    const { fills } = drawPlan(
      boardPlan(
        attackTarget({
          previewLabel: "Deal 12 · KO",
          previewSkullBefore: ["KO"],
          hpLoss: [
            {
              unitId: 2,
              at: DEFENDER_AT,
              damage: 12,
              lethal: true,
              role: "TARGET",
            },
          ],
        }),
      ),
    );
    const [chunk] = chunkFills(fills);
    expect(chunk?.left).toBeCloseTo(100 + 128 - 24);
    expect(chunk?.width).toBeCloseTo(48);
  });

  it("repeats the target's HP bar, with its chunk, at the top of its label", () => {
    const { fills } = drawPlan(
      boardPlan(
        attackTarget({
          previewLabel: "Deal 2 · take 1",
          hpLoss: [
            {
              unitId: 2,
              at: DEFENDER_AT,
              damage: 2,
              lethal: false,
              role: "TARGET",
              hp: 6,
              maxHp: 10,
            },
          ],
        }),
      ),
    );
    // Zoom 1: the 15-character label is 100 px wide under the cell centre
    // (228, 228), its top at y + 39; the bar row (6 px and a 2.5 px gap)
    // makes it taller.
    const label = fills.find((fill) => fill.fill === "#171722dd");
    expect(label).toMatchObject({ left: 178, top: 267, width: 100 });
    expect(label?.height).toBeCloseTo(18 + 6 + 2.5);
    const frameTop = 267 + 2.5;
    const labelFill = fills.find(
      (fill) => fill.fill === "#f1c94b" && fill.top === frameTop + 1,
    );
    // 6 of 10 HP: the yellow fill is 60 percent of the 88 px inner bar.
    expect(labelFill?.left).toBe(184);
    expect(labelFill?.width).toBeCloseTo(88 * 0.6);
    const chunk = chunkFills(fills).find((fill) => fill.top === frameTop + 1);
    // The 2 HP it would lose: from 40 to 60 percent.
    expect(chunk?.left).toBeCloseTo(184 + 88 * 0.4);
    expect(chunk?.width).toBeCloseTo(88 * 0.2);
  });

  it("pulses the chunk in full motion and holds it still under reduced motion", () => {
    const plan = boardPlan(
      attackTarget({
        previewLabel: "Deal 3 · take 0",
        hpLoss: [
          {
            unitId: 2,
            at: DEFENDER_AT,
            damage: 3,
            lethal: false,
            role: "TARGET",
          },
        ],
      }),
    );
    const alphaAt = (timeMs: number, reducedMotion: boolean) =>
      chunkFills(drawPlan(plan, { timeMs, reducedMotion }).fills)[0]?.alpha;
    expect(alphaAt(600, false)).toBeLessThan(0.6);
    expect(alphaAt(0, false)).toBe(1);
    // Reduced motion: the board passes a still clock and the chunk is full.
    expect(alphaAt(600, true)).toBe(1);
  });
});

// ------------------------------------------------- the plan, from the engine

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

function attackTargetsOf(view: PlayerViewV7, selected: CoordV7) {
  const unit = unitAt(view, selected);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: { kind: "UNIT", unitId: unit.id },
    selectedUnitId: unit.id,
    selectedAchievement: null,
  }).targets.filter((target) => target.family === "ATTACK");
}

describe("the board plan carries the exact preview (V9)", () => {
  const ATTACKER = { x: 5, y: 6 };
  const SURVIVOR = { x: 5, y: 7 };
  const DOOMED = { x: 6, y: 7 };

  it("labels a kill 'KO' and gives every attack target its HP chunk", () => {
    const view = viewOf(
      undeadUiArenaV7(
        [
          { seat: 0, role: "FIGHTER", at: ATTACKER },
          { seat: 1, role: "FIGHTER", at: SURVIVOR },
          { seat: 1, role: "FIGHTER", at: DOOMED, hp: 1 },
        ],
        [],
        ["ORIGINAL", "ORIGINAL"],
      ),
    );
    const attacker = unitAt(view, ATTACKER);
    const targets = attackTargetsOf(view, ATTACKER);
    expect(targets.map((target) => target.at)).toEqual(
      expect.arrayContaining([SURVIVOR, DOOMED]),
    );
    for (const target of targets) {
      const defender = unitAt(view, target.at);
      const exact = queryCombatPreviewV7(view, attacker.id, defender.id);
      if (exact === null) throw new Error("preview missing");
      const lethal = exact.defenderDies;
      expect(target.previewLabel).toBe(
        lethal
          ? `Deal ${exact.damageToDefender} · KO`
          : `Deal ${exact.damageToDefender} · take ${exact.damageToAttacker}`,
      );
      expect(target.previewSkullBefore).toEqual(lethal ? ["KO"] : undefined);
      expect(target.hpLoss?.find((loss) => loss.role === "TARGET")).toEqual({
        unitId: defender.id,
        at: defender.at,
        damage: exact.damageToDefender,
        lethal,
        role: "TARGET",
        hp: defender.hp,
        maxHp: defender.maxHp,
      });
      const strikeBack = target.hpLoss?.find(
        (loss) => loss.role === "ATTACKER",
      );
      expect(strikeBack?.damage ?? 0).toBe(exact.damageToAttacker);
      if (lethal)
        expect(target.semanticLabel).toContain("The target is knocked out.");
    }
    const doomed = targets.find(
      (target) => target.at.x === DOOMED.x && target.at.y === DOOMED.y,
    );
    const survivor = targets.find(
      (target) => target.at.x === SURVIVOR.x && target.at.y === SURVIVOR.y,
    );
    // The fixture holds both cases: a kill and a survivor that strikes back.
    expect(doomed?.previewSkullBefore).toEqual(["KO"]);
    expect(survivor?.previewSkullBefore).toBeUndefined();
    expect(
      survivor?.hpLoss?.some(
        (loss) => loss.role === "ATTACKER" && loss.unitId === attacker.id,
      ),
    ).toBe(true);
  });

  it("says 'Lost' with a skull when the strike-back kills the attacker", () => {
    const view = viewOf(
      undeadUiArenaV7(
        [
          { seat: 0, role: "FIGHTER", at: ATTACKER, hp: 1 },
          { seat: 1, role: "FIGHTER", at: SURVIVOR },
        ],
        [],
        ["ORIGINAL", "ORIGINAL"],
      ),
    );
    const attacker = unitAt(view, ATTACKER);
    const [target] = attackTargetsOf(view, ATTACKER);
    const exact = queryCombatPreviewV7(
      view,
      attacker.id,
      unitAt(view, SURVIVOR).id,
    );
    expect(exact?.attackerDies).toBe(true);
    expect(target?.previewLabel).toBe(
      `Deal ${exact?.damageToDefender} · take ${exact?.damageToAttacker} · Lost`,
    );
    expect(target?.previewSkullBefore).toEqual(["Lost"]);
    expect(
      target?.hpLoss?.find((loss) => loss.role === "ATTACKER"),
    ).toMatchObject({ unitId: attacker.id, lethal: true });
    expect(target?.semanticLabel).toContain(
      "The attacker is lost to the strike-back.",
    );
  });
});
