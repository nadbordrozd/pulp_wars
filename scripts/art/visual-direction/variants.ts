/**
 * Named rendering variants of the visual-direction test bench (bead
 * pulp_wars-3tq.1). Each is today's rendering with some levers changed;
 * `today` passes no direction at all, so it is the shipping board.
 */
import {
  BASELINE_DIRECTION_V7,
  HUMAN_GARMENT_COLOUR_V7,
  HUMAN_ROOF_COLOUR_V7,
  RECOMMENDED_DIRECTION_V7,
  type BoardVisualDirectionV7,
} from "../../../src/render/canvas/visual-direction-v7";

export interface VisualDirectionVariantV7 {
  readonly id: string;
  readonly label: string;
  /** Omitted: the shipping rendering. */
  readonly direction?: BoardVisualDirectionV7;
}

type Patch = {
  readonly [Key in keyof BoardVisualDirectionV7]?: Partial<
    BoardVisualDirectionV7[Key]
  >;
};

function patched(
  base: BoardVisualDirectionV7,
  patch: Patch,
): BoardVisualDirectionV7 {
  return {
    building: { ...base.building, ...patch.building },
    city: { ...base.city, ...patch.city },
    terrain: { ...base.terrain, ...patch.terrain },
    unit: { ...base.unit, ...patch.unit },
    chrome: { ...base.chrome, ...patch.chrome },
  };
}

const B = BASELINE_DIRECTION_V7;
const R = RECOMMENDED_DIRECTION_V7;
const NEUTRAL_STONE = "#9c968a";
const SLATE = "#74808c";

const variant = (
  id: string,
  label: string,
  direction: BoardVisualDirectionV7,
): VisualDirectionVariantV7 => ({ id, label, direction });

export const VISUAL_DIRECTION_VARIANTS_V7: readonly VisualDirectionVariantV7[] =
  [
    { id: "today", label: "Today (shipping)" },
    // ------------------------------------------------ one factor at a time
    variant(
      "f-building-owner-off",
      "Factor: no player colour on buildings and cities (stone grey)",
      patched(B, {
        building: { owner: NEUTRAL_STONE },
        city: { owner: NEUTRAL_STONE },
      }),
    ),
    variant(
      "f-unit-owner-accent",
      "Factor: unit garment cream, player colour on crest or hood only",
      patched(B, { unit: { owner: HUMAN_GARMENT_COLOUR_V7, accent: true } }),
    ),
    variant(
      "f-unit-owner-none",
      "Factor: unit garment cream, no player colour on the sprite",
      patched(B, { unit: { owner: HUMAN_GARMENT_COLOUR_V7 } }),
    ),
    variant(
      "f-building-saturation",
      "Factor: building and city saturation 50%",
      patched(B, { building: { saturation: 50 }, city: { saturation: 50 } }),
    ),
    variant(
      "f-building-lightness",
      "Factor: buildings and cities lighter, lower contrast",
      patched(B, {
        building: { contrast: 70, lightness: 12 },
        city: { contrast: 70, lightness: 12 },
      }),
    ),
    variant(
      "f-building-outline",
      "Factor: buildings and cities with a soft coloured outline",
      patched(B, { building: { outline: 80 }, city: { outline: 80 } }),
    ),
    variant(
      "f-building-scale",
      "Factor: buildings at 80% size",
      patched(B, { building: { scale: 80 } }),
    ),
    variant(
      "f-chrome",
      "Factor: reduced chrome (HP only when damaged, no badge, calm roads, thin borders)",
      patched(B, {
        chrome: {
          hp: "DAMAGED",
          badge: "NONE",
          roads: "CALM",
          borders: "SOLID",
        },
      }),
    ),
    variant(
      "f-terrain",
      "Factor: calmer terrain texture (contrast 60%, soft outlines)",
      patched(B, {
        terrain: { contrast: 60, outline: 70, saturation: 85 },
      }),
    ),
    variant(
      "f-unit-base",
      "Factor: base disc under each unit",
      patched(B, { unit: { base: "DISC" } }),
    ),
    variant(
      "f-unit-halo",
      "Factor: light rim around each unit",
      patched(B, { unit: { halo: true } }),
    ),
    // ----------------------------------------------------------- candidates
    variant(
      "c1-sliders",
      "C1 Sliders only: buildings and cities at 50% saturation",
      patched(B, { building: { saturation: 50 }, city: { saturation: 50 } }),
    ),
    variant(
      "c2-neutral-buildings",
      "C2 Receded faction-colour buildings, units and chrome as today",
      patched(B, { building: R.building, city: { ...R.city, banner: false } }),
    ),
    variant(
      "c3-badges",
      "C3 Receded buildings, cream units, player on a shape badge only",
      patched(R, {
        unit: { accent: false, samples: false, base: "NONE" },
        chrome: { badge: "SHAPE", ready: "GLOW", hpPlacement: "SIDE" },
      }),
    ),
    variant(
      "c4-ring",
      "C4 Receded buildings, accent units, base ring",
      patched(R, { unit: { samples: false, base: "RING" } }),
    ),
    variant(
      "c5-disc",
      "C5 Receded buildings, accent units (code-side), base disc",
      patched(R, { unit: { samples: false } }),
    ),
    variant(
      "c6-disc-full-garment",
      "C6 Receded buildings, full player garments, base disc",
      patched(R, { unit: { owner: "PLAYER", accent: false, samples: false } }),
    ),
    variant(
      "c7-slate-roofs",
      "C7 As recommended, slate roofs instead of muted brick",
      patched(R, { building: { owner: SLATE }, city: { owner: SLATE } }),
    ),
    variant(
      "c8-round-bases",
      "C8 As recommended, every base round (colour alone tells players apart)",
      patched(R, { unit: { baseShape: "ROUND" } }),
    ),
    variant("recommended", "Recommended direction", R),
  ];

export const HUMAN_COLOURS_V7 = {
  roof: HUMAN_ROOF_COLOUR_V7,
  garment: HUMAN_GARMENT_COLOUR_V7,
} as const;
