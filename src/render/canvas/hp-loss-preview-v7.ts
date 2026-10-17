/**
 * The lethal attack preview (bead `pulp_wars-2yc.81`, UI review V9): an
 * attack label whose hit kills reads "Deal 3 · KO" with a small skull on
 * the loss red, one whose strike-back kills the attacker adds "Lost" the
 * same way, and the HP bars on the board show the chunk each unit would
 * lose (a hatched segment that pulses gently; still under reduced motion).
 *
 * Every number here is the engine's exact public combat preview
 * (`CombatPreviewV7`): the interface restates no rule.
 */

import type { CombatPreviewV7, CoordV7 } from "../../engine/index";

/** The word of a hit that kills its target, after "Deal N". */
export const ATTACK_KO_LABEL_V7 = "KO";
/** The word of a strike-back that kills the attacker. */
export const ATTACKER_LOST_LABEL_V7 = "Lost";
/** The fill of a lethal preview label (the ability targets' lethal red). */
export const LETHAL_LABEL_FILL_V7 = "#8f1f22ee";

/** One unit's HP an aimed attack would take, from the exact preview. */
export interface HpLossPreviewV7 {
  readonly unitId: number;
  readonly at: CoordV7;
  /** HP damage (never the part a Shield absorbs). */
  readonly damage: number;
  readonly lethal: boolean;
  /**
   * TARGET: the defender (shown on every attack target); ATTACKER: the
   * strike-back on the attacker; OTHER: a splash, Pierce, Sweep or crush
   * victim. ATTACKER and OTHER show on the focused (or only) target.
   */
  readonly role: "TARGET" | "ATTACKER" | "OTHER";
  /**
   * The unit's public HP now and its maximum, when known: the attack
   * label of a target repeats its bar (the label covers the live look's
   * bar on the base).
   */
  readonly hp?: number;
  readonly maxHp?: number;
}

/** The damage part of an attack label, and where its skulls go. */
export interface AttackDamageLabelV7 {
  /** "Deal 3 · take 1", "Deal 3 · KO", "Deal 2 · take 4 · Lost". */
  readonly text: string;
  /** The ` · ` parts of the label a skull is drawn in front of. */
  readonly skullBefore: readonly string[];
}

/**
 * The damage part of an attack label: "Deal N · take M" as before; a kill
 * reads "Deal N · KO" (the "take" part stays only when something still
 * hurts the attacker, a Shock Field), and a strike-back that kills the
 * attacker adds "Lost".
 */
export function attackDamageLabelV7(
  preview: Pick<
    CombatPreviewV7,
    "damageToDefender" | "damageToAttacker" | "defenderDies" | "attackerDies"
  >,
): AttackDamageLabelV7 {
  const parts = [`Deal ${preview.damageToDefender}`];
  const skullBefore: string[] = [];
  if (preview.defenderDies) {
    parts.push(ATTACK_KO_LABEL_V7);
    skullBefore.push(ATTACK_KO_LABEL_V7);
  }
  if (!preview.defenderDies || preview.damageToAttacker > 0)
    parts.push(`take ${preview.damageToAttacker}`);
  if (preview.attackerDies) {
    parts.push(ATTACKER_LOST_LABEL_V7);
    skullBefore.push(ATTACKER_LOST_LABEL_V7);
  }
  return { text: parts.join(" · "), skullBefore };
}

/** The sentence the semantic label adds for a lethal exchange, or "". */
export function attackLethalSemanticV7(
  preview: Pick<CombatPreviewV7, "defenderDies" | "attackerDies">,
): string {
  return [
    preview.defenderDies ? "The target is knocked out." : null,
    preview.attackerDies ? "The attacker is lost to the strike-back." : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" ");
}

/**
 * The HP chunks of one attack preview: the defender's, the attacker's
 * strike-back (when it takes any), each splash, Pierce or Sweep victim's
 * (the preview's `splash`), and a crushed defender's blocker (`extra`).
 */
export function attackHpLossV7(
  preview: Pick<
    CombatPreviewV7,
    | "attackerId"
    | "targetUnitId"
    | "damageToDefender"
    | "damageToAttacker"
    | "defenderDies"
    | "attackerDies"
    | "splash"
  >,
  attackerAt: CoordV7,
  targetAt: CoordV7,
  extra: readonly HpLossPreviewV7[] = [],
  /** The defender's public HP and maximum, for its label's bar. */
  defenderHp?: { readonly hp: number; readonly maxHp: number },
): readonly HpLossPreviewV7[] {
  const losses: HpLossPreviewV7[] = [];
  if (preview.damageToDefender > 0 || preview.defenderDies)
    losses.push({
      unitId: preview.targetUnitId,
      at: targetAt,
      damage: preview.damageToDefender,
      lethal: preview.defenderDies,
      role: "TARGET",
      ...(defenderHp === undefined
        ? {}
        : { hp: defenderHp.hp, maxHp: defenderHp.maxHp }),
    });
  if (preview.damageToAttacker > 0 || preview.attackerDies)
    losses.push({
      unitId: preview.attackerId,
      at: attackerAt,
      damage: preview.damageToAttacker,
      lethal: preview.attackerDies,
      role: "ATTACKER",
    });
  for (const item of preview.splash)
    if (item.damage > 0 || item.dies)
      losses.push({
        unitId: item.unitId,
        at: item.at,
        damage: item.damage,
        lethal: item.dies,
        role: "OTHER",
      });
  losses.push(...extra);
  return losses;
}

/** What a unit's HP bar shows this frame: the HP it would lose. */
export interface HpLossChunkV7 {
  readonly damage: number;
  readonly lethal: boolean;
}

/**
 * The chunk each unit's HP bar shows this frame, keyed by the unit's plan
 * key (`unit:<id>`): every attack target's own loss, and the focused (or
 * only) attack target's strike-back and other victims. A unit two previews
 * hurt keeps the larger chunk.
 */
export function hpLossChunksV7(
  targets: readonly {
    readonly at: CoordV7;
    readonly hpLoss?: readonly HpLossPreviewV7[];
  }[],
  focus: CoordV7 | null,
): ReadonlyMap<string, HpLossChunkV7> {
  const chunks = new Map<string, HpLossChunkV7>();
  const losing = targets.filter(
    (target) => target.hpLoss !== undefined && target.hpLoss.length > 0,
  );
  if (losing.length === 0) return chunks;
  const focused =
    (focus === null
      ? undefined
      : losing.find(
          (target) => target.at.x === focus.x && target.at.y === focus.y,
        )) ?? (losing.length === 1 ? losing[0] : undefined);
  const add = (loss: HpLossPreviewV7): void => {
    const key = `unit:${loss.unitId}`;
    const known = chunks.get(key);
    chunks.set(
      key,
      known === undefined
        ? { damage: loss.damage, lethal: loss.lethal }
        : {
            damage: Math.max(known.damage, loss.damage),
            lethal: known.lethal || loss.lethal,
          },
    );
  };
  for (const target of losing)
    for (const loss of target.hpLoss ?? [])
      if (loss.role === "TARGET") add(loss);
  for (const loss of focused?.hpLoss ?? [])
    if (loss.role !== "TARGET") add(loss);
  return chunks;
}

/** One pulse of the chunk, in ms. */
export const HP_LOSS_PULSE_PERIOD_MS_V7 = 1200;

/**
 * The chunk's strength this frame: a slow pulse between 0.45 and 1 in full
 * motion, and a steady 1 under reduced motion.
 */
export function hpLossPulseAlphaV7(
  timeMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 1;
  const phase =
    (timeMs % HP_LOSS_PULSE_PERIOD_MS_V7) / HP_LOSS_PULSE_PERIOD_MS_V7;
  return 0.725 + 0.275 * Math.cos(phase * Math.PI * 2);
}

interface RectV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where a unit's HP bar is drawn: its frame and its filled area, CSS px. */
export interface HpBarFrameV7 {
  readonly outer: RectV7;
  readonly inner: RectV7;
  /** A vertical bar fills from its foot; a horizontal one from its left. */
  readonly vertical: boolean;
}

/**
 * The HP bar of each look: the live look's bar on the base (`BASE`), the
 * vertical bar in the cell's left strip (`SIDE`, the CHIBI stand-ins and a
 * direction's side bar), and the classic flat bar (`LEGACY`). `x` and `y`
 * are the cell centre.
 */
export function hpBarFrameV7(
  look: "BASE" | "SIDE" | "LEGACY",
  x: number,
  y: number,
  zoom: number,
  garrisoned = false,
): HpBarFrameV7 {
  if (look === "SIDE") {
    const bar = { left: -63, top: -36, width: 9, height: 76 };
    return {
      vertical: true,
      outer: {
        x: x + bar.left * zoom,
        y: y + bar.top * zoom,
        width: bar.width * zoom,
        height: bar.height * zoom,
      },
      inner: {
        x: x + (bar.left + 1) * zoom,
        y: y + (bar.top + 1) * zoom,
        width: (bar.width - 2) * zoom,
        height: (bar.height - 2) * zoom,
      },
    };
  }
  if (look === "BASE") {
    // DIRECTED_BASE_HP_BAR_TOP_V7 (50) of visual-direction-v7.
    const width = (garrisoned ? 40 : 54) * zoom;
    const height = 8 * zoom;
    const left = x + (garrisoned ? 20 : 0) * zoom - width / 2;
    const top = y + 50 * zoom;
    return {
      vertical: false,
      outer: { x: left, y: top, width, height },
      inner: {
        x: left + zoom,
        y: top + zoom,
        width: width - 2 * zoom,
        height: height - 2 * zoom,
      },
    };
  }
  return {
    vertical: false,
    outer: {
      x: x - 25 * zoom,
      y: y + 25 * zoom,
      width: 50 * zoom,
      height: 7 * zoom,
    },
    inner: {
      x: x - 24 * zoom,
      y: y + 26 * zoom,
      width: 48 * zoom,
      height: 5 * zoom,
    },
  };
}

/**
 * The part of the bar's filled area between two shares of the maximum HP
 * (0 = empty, 1 = full), CSS px.
 */
export function hpBarSpanV7(
  bar: Pick<HpBarFrameV7, "inner" | "vertical">,
  from: number,
  to: number,
): RectV7 {
  const { inner } = bar;
  return bar.vertical
    ? {
        x: inner.x,
        y: inner.y + inner.height * (1 - to),
        width: inner.width,
        height: inner.height * (to - from),
      }
    : {
        x: inner.x + inner.width * from,
        y: inner.y,
        width: inner.width * (to - from),
        height: inner.height,
      };
}

/** The shares of the bar the chunk spans: from the HP left to the HP now. */
export function hpLossSpanSharesV7(
  hp: number,
  maxHp: number,
  damage: number,
): { readonly from: number; readonly to: number } | null {
  if (maxHp <= 0 || hp <= 0) return null;
  const lost = Math.max(0, Math.min(hp, damage));
  if (lost <= 0) return null;
  const to = Math.min(1, hp / maxHp);
  const from = Math.max(0, (hp - lost) / maxHp);
  return { from, to };
}

/** The chunk's colours: cream with loss-red stripes. */
export const HP_LOSS_CHUNK_COLORS_V7 = {
  base: "#fff3d6",
  stripe: "#d8312a",
  divider: "#101718",
} as const;

/**
 * The chunk a unit would lose, on its HP bar: the span from the HP left
 * to the HP now, in cream with diagonal loss-red stripes, at `alpha`
 * (the pulse), and a 1 px ink divider where the remaining HP, still
 * solid, ends. A lethal hit hatches the whole fill.
 */
export function drawHpLossChunkV7(
  context: CanvasRenderingContext2D,
  bar: Pick<HpBarFrameV7, "inner" | "vertical">,
  hp: number,
  maxHp: number,
  damage: number,
  options: {
    readonly alpha: number;
    readonly zoom: number;
    readonly highContrast?: boolean;
  },
): void {
  const shares = hpLossSpanSharesV7(hp, maxHp, damage);
  if (shares === null) return;
  const span = hpBarSpanV7(bar, shares.from, shares.to);
  if (span.width <= 0 || span.height <= 0) return;
  const highContrast = options.highContrast ?? false;
  context.save();
  context.beginPath();
  context.rect(span.x, span.y, span.width, span.height);
  context.clip();
  context.globalAlpha = Math.max(0, Math.min(1, options.alpha));
  context.fillStyle = highContrast ? "#ffffff" : HP_LOSS_CHUNK_COLORS_V7.base;
  context.fillRect(span.x, span.y, span.width, span.height);
  // Diagonal stripes, never thinner than 2 CSS px.
  const period = Math.max(4, 7 * options.zoom);
  const stripe = period / 2;
  context.fillStyle = highContrast ? "#000000" : HP_LOSS_CHUNK_COLORS_V7.stripe;
  const reach = span.width + span.height;
  for (let offset = -span.height; offset < reach; offset += period) {
    context.beginPath();
    context.moveTo(span.x + offset, span.y + span.height);
    context.lineTo(span.x + offset + stripe, span.y + span.height);
    context.lineTo(span.x + offset + stripe + span.height, span.y);
    context.lineTo(span.x + offset + span.height, span.y);
    context.closePath();
    context.fill();
  }
  context.restore();
  if (shares.from > 0) {
    context.save();
    context.fillStyle = HP_LOSS_CHUNK_COLORS_V7.divider;
    const { inner } = bar;
    if (bar.vertical)
      context.fillRect(
        inner.x,
        Math.round(inner.y + inner.height * (1 - shares.from)) - 0.5,
        inner.width,
        1,
      );
    else
      context.fillRect(
        Math.round(inner.x + inner.width * shares.from) - 0.5,
        inner.y,
        1,
        inner.height,
      );
    context.restore();
  }
}

/**
 * A full HP bar where the look hides one at full health (the live look's
 * bar shows only when damaged), so the chunk has a bar to sit on.
 */
export function drawFullHpBarV7(
  context: CanvasRenderingContext2D,
  bar: HpBarFrameV7,
): void {
  context.save();
  context.fillStyle = "#101718";
  context.fillRect(bar.outer.x, bar.outer.y, bar.outer.width, bar.outer.height);
  context.fillStyle = "#65d889";
  context.fillRect(bar.inner.x, bar.inner.y, bar.inner.width, bar.inner.height);
  context.restore();
}

/** The HP bar a target's attack label carries, CSS px. */
export interface LabelHpBarV7 {
  readonly hp: number;
  readonly maxHp: number;
  readonly damage: number;
  /** The chunk's pulse (hpLossPulseAlphaV7). */
  readonly alpha: number;
  readonly highContrast?: boolean;
}

/** The height of a label's HP bar row (bar and gap) for a label font. */
export function labelHpBarRowV7(font: number): {
  readonly bar: number;
  readonly gap: number;
} {
  return {
    bar: Math.max(5, Math.round(font * 0.6)),
    gap: Math.max(2, font * 0.25),
  };
}

/**
 * The HP bar on a target's attack label (the label covers the live look's
 * bar on the base): an ink frame, the fill in the bar's own colours (green,
 * yellow at two thirds, red at one third), and the hatched chunk the
 * attack would take.
 */
export function drawLabelHpBarV7(
  context: CanvasRenderingContext2D,
  frame: RectV7,
  bar: LabelHpBarV7,
  zoom: number,
): void {
  if (bar.maxHp <= 0) return;
  const share = Math.max(0, Math.min(1, bar.hp / bar.maxHp));
  const inset = 1;
  const inner = {
    x: frame.x + inset,
    y: frame.y + inset,
    width: frame.width - 2 * inset,
    height: frame.height - 2 * inset,
  };
  context.save();
  context.fillStyle = HP_LOSS_CHUNK_COLORS_V7.divider;
  context.fillRect(frame.x, frame.y, frame.width, frame.height);
  context.fillStyle =
    share <= 0.34 ? "#f0625a" : share <= 0.67 ? "#f1c94b" : "#65d889";
  context.fillRect(inner.x, inner.y, inner.width * share, inner.height);
  context.restore();
  drawHpLossChunkV7(
    context,
    { inner, vertical: false },
    bar.hp,
    bar.maxHp,
    bar.damage,
    {
      alpha: bar.alpha,
      zoom: Math.min(zoom, 0.8),
      ...(bar.highContrast === undefined
        ? {}
        : { highContrast: bar.highContrast }),
    },
  );
}

/**
 * The small skull of a lethal label: a 7 x 7 pixel skull in `color`, its
 * eyes, nose and teeth open to the label's fill. `left` and `top` are its
 * corner; `cell` the size of one of its pixels.
 */
export function drawLabelSkullV7(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  cell: number,
  color: string,
): void {
  context.save();
  context.fillStyle = color;
  for (const [row, line] of SKULL_ROWS_V7.entries())
    for (let column = 0; column < line.length; column += 1)
      if (line[column] === "X")
        context.fillRect(left + column * cell, top + row * cell, cell, cell);
  context.restore();
}

/** The skull's pixels, top row first. */
export const SKULL_ROWS_V7 = [
  ".XXXXX.",
  "XXXXXXX",
  "X..X..X",
  "X..X..X",
  "XXX.XXX",
  ".XXXXX.",
  ".X.X.X.",
] as const;

/** The size of one skull pixel for a label font, CSS px (half-px steps). */
export function labelSkullCellV7(font: number): number {
  return Math.max(1, Math.round(font * 0.13 * 2) / 2);
}

/** The skull's width plus its gap before the word, CSS px. */
export function labelSkullAdvanceV7(font: number): number {
  return labelSkullCellV7(font) * 7 + font * 0.25;
}

const LABEL_SEPARATOR = " · ";

/** Whether a ` · ` part of a label opens with one of the skull words. */
function skullPart(part: string, words: readonly string[]): boolean {
  return words.some((word) => part === word || part.startsWith(`${word} `));
}

/** How many skulls one line of a label carries. */
export function labelSkullCountV7(
  line: string,
  words: readonly string[],
): number {
  if (words.length === 0) return 0;
  return line.split(LABEL_SEPARATOR).filter((part) => skullPart(part, words))
    .length;
}

/**
 * Fills one line of a preview label centred on `centre`, with a skull in
 * front of each part that opens with one of `words`; a line without one is
 * a plain centred `fillText`. The context's font and fill are the label's.
 */
export function fillLabelLineWithSkullsV7(
  context: CanvasRenderingContext2D,
  line: string,
  centre: number,
  baseline: number,
  font: number,
  words: readonly string[],
): void {
  const count = labelSkullCountV7(line, words);
  if (count === 0) {
    context.fillText(line, centre, baseline);
    return;
  }
  const cell = labelSkullCellV7(font);
  const advance = labelSkullAdvanceV7(font);
  const size = cell * SKULL_ROWS_V7.length;
  // Centred on the capitals (about 0.72 of the font tall).
  const top = Math.round((baseline - font * 0.36 - size / 2) * 2) / 2;
  const total = context.measureText(line).width + count * advance;
  const align = context.textAlign;
  const color = context.fillStyle;
  context.textAlign = "left";
  let cursor = centre - total / 2;
  for (const [index, part] of line.split(LABEL_SEPARATOR).entries()) {
    if (index > 0) {
      context.fillText(LABEL_SEPARATOR, cursor, baseline);
      cursor += context.measureText(LABEL_SEPARATOR).width;
    }
    if (skullPart(part, words)) {
      drawLabelSkullV7(
        context,
        Math.round(cursor * 2) / 2,
        top,
        cell,
        typeof color === "string" ? color : "#fff8df",
      );
      cursor += advance;
    }
    context.fillText(part, cursor, baseline);
    cursor += context.measureText(part).width;
  }
  context.textAlign = align;
}
