/**
 * The Cult's palette 1 in production (bead pulp_wars-mch9.59): which
 * accepted chibi assets the `cult-royal-aqua` remap (scripts/art/chibi/
 * remap.ts) applies to, and each one's classifier rules. The boxes of the
 * robed cultists are the ones the samples of bead pulp_wars-mch9.58 proved
 * (scripts/art/cult-palette-mch958/recolour.ts); the Monuments, the
 * Herald's Unbound look, the two lodge creatures' portraits and the lodge
 * icons are this bead's.
 *
 * The robed cultists and the lodge's places, ships and creatures take the
 * whole palette (purple cloth, roofs and hulls; aquamarine trim, flames,
 * windows and lanterns). The lodge icons take only the purple (`noGlow`):
 * their green is the faction colour's (the Favour candle, a channel link, a
 * Sacrifice puff), as the territory border, the channel strands and the
 * Favour chip are. The summoned (Horror, Imp, Gibbering Mass, Tentacle,
 * Thing, the frog and their icons and portraits) keep their teal and are
 * not listed.
 */
import type { RemapRules } from "../chibi/remap";

export const CULT_REMAP_PRESET = "cult-royal-aqua";

export interface CultRemapAsset {
  readonly id: string;
  readonly rules: RemapRules;
}

const lodge: RemapRules = { kind: "lodge" };
const lodgeIcon: RemapRules = { kind: "lodge", noGlow: true };

/** The five robed cultists and their busts (mch9.55's and mch9.58's boxes). */
export const ROBED_ASSETS: readonly CultRemapAsset[] = [
  {
    id: "chibi-direction-cult-initiate",
    rules: {
      kind: "robed",
      // The bloody blade, the face, and (this bead) the dagger's gold hilt
      // and the hand round it, whose red shading the crimson rule took.
      protect: [
        { x0: 0, y0: 26, x1: 10, y1: 47 },
        { x0: 25, y0: 29, x1: 38, y1: 44 },
        { x0: 0, y0: 48, x1: 12, y1: 60 },
      ],
    },
  },
  {
    id: "chibi-direction-cult-idol-bearer",
    rules: { kind: "robed", protect: [{ x0: 13, y0: 21, x1: 20, y1: 29 }] },
  },
  {
    id: "chibi-direction-cult-hexer",
    rules: {
      kind: "robed",
      keep: ["#31171b"],
      protect: [{ x0: 27, y0: 35, x1: 37, y1: 40 }],
    },
  },
  {
    id: "chibi-direction-cult-summoner",
    rules: {
      kind: "robed",
      protect: [
        { x0: 26, y0: 21, x1: 30, y1: 27 },
        { x0: 34, y0: 24, x1: 47, y1: 47 },
      ],
      // The rust hood, and (this bead) the wide rust facings of the robe:
      // their unlit tones are cloth and go purple, so only the lit
      // embroidery lines turn mint. The samples sent the whole facing to
      // the trim ramp, a mint panel that outshone every other cultist.
      extend: [
        {
          box: { x0: 0, y0: 0, x1: 55, y1: 79 },
          hue: [6, 40],
          minSaturation: 0.6,
          maxValue: 0.76,
        },
      ],
    },
  },
  {
    id: "chibi-direction-cult-stargazer",
    rules: {
      kind: "robed",
      keep: ["#3e0d10"],
      protect: [{ x0: 24, y0: 35, x1: 27, y1: 39 }],
      props: [{ x0: 36, y0: 0, x1: 71, y1: 87 }],
    },
  },
  {
    id: "chibi-direction-portrait-cult-initiate",
    rules: {
      kind: "robed",
      protect: [
        { x0: 3, y0: 16, x1: 11, y1: 42 },
        { x0: 12, y0: 19, x1: 31, y1: 33 },
      ],
    },
  },
  {
    id: "chibi-direction-portrait-cult-idol-bearer",
    rules: {
      kind: "robed",
      // The face, and the two hands above the cuffs (this bead stops the
      // hand boxes at row 18, so the gold cuffs turn mint as on the map).
      protect: [
        { x0: 14, y0: 19, x1: 33, y1: 34 },
        { x0: 9, y0: 12, x1: 17, y1: 18 },
        { x0: 29, y0: 12, x1: 40, y1: 18 },
      ],
    },
  },
  {
    id: "chibi-direction-portrait-cult-hexer",
    rules: {
      kind: "robed",
      secondaryHue: [268, 335],
      protect: [{ x0: 21, y0: 17, x1: 34, y1: 31 }],
    },
  },
  {
    id: "chibi-direction-portrait-cult-summoner",
    rules: {
      kind: "robed",
      protect: [
        { x0: 18, y0: 20, x1: 36, y1: 33 },
        { x0: 36, y0: 22, x1: 47, y1: 44 },
        { x0: 0, y0: 29, x1: 6, y1: 35 },
      ],
    },
  },
  {
    id: "chibi-direction-portrait-cult-stargazer",
    rules: { kind: "robed", props: [{ x0: 30, y0: 0, x1: 47, y1: 47 }] },
  },
];

/** The cities, buildings, Monuments and obelisk. */
export const PLACE_ASSETS: readonly CultRemapAsset[] = [
  ...[1, 2, 3].map((level) => `chibi-direction-cult-city-${level}`),
  ...[
    "lumber-camp",
    "sawmill",
    "forge",
    "workshop",
    "port",
    "shipyard",
    "market",
    "monument",
    "monument-explorer",
    "monument-engineer",
    "monument-muster",
    "monument-conqueror",
    "monument-land-baron",
    "monument-sea-dog",
    "monument-slayer",
  ].map((id) => `chibi-cult-${id}`),
].map((id) => ({ id, rules: lodge }));

/** The four ships and the three ship portraits. */
export const SHIP_ASSETS: readonly CultRemapAsset[] = [
  ...["patrol-boat", "battleship", "submarine", "transport"].map(
    (id) => `chibi-naval-cult-${id}`,
  ),
  ...["patrol-boat", "battleship", "submarine"].map(
    (id) => `chibi-naval-cult-portrait-${id}`,
  ),
].map((id) => ({ id, rules: lodge }));

/** The lodge's two creatures, the Herald's Unbound look and their busts. */
export const CREATURE_ASSETS: readonly CultRemapAsset[] = [
  {
    id: "chibi-direction-cult-familiar",
    rules: { kind: "lodge", lodgeHue: [190, 268] },
  },
  {
    id: "chibi-direction-portrait-cult-familiar",
    rules: { kind: "lodge", lodgeHue: [190, 268] },
  },
  { id: "chibi-direction-cult-herald", rules: { kind: "lodge", noGlow: true } },
  {
    id: "chibi-direction-cult-herald-unbound",
    rules: { kind: "lodge", noGlow: true },
  },
  {
    id: "chibi-direction-portrait-cult-herald",
    rules: { kind: "lodge", noGlow: true },
  },
];

/** The lodge icons that show indigo: purple only, the green kept. */
export const ICON_ASSETS: readonly CultRemapAsset[] = [
  "action-channel",
  "action-doorstep",
  "action-great-summoning",
  "action-join-chant",
  "action-pamphlets",
  "action-proclaim",
  "action-sacrifice",
  "emblem",
  "hunger",
  "status-cowed",
  "status-unbound",
  "status-warded",
  "tech-harvest-rites",
  "tech-stars-are-right",
]
  .map((id) => `chibi-direction-icon-cult-${id}`)
  .concat(["chibi-naval-cult-icon-tech-seamanship"])
  .map((id) => ({ id, rules: lodgeIcon }));

export const CULT_REMAP_ASSETS: readonly CultRemapAsset[] = [
  ...ROBED_ASSETS,
  ...PLACE_ASSETS,
  ...SHIP_ASSETS,
  ...CREATURE_ASSETS,
  ...ICON_ASSETS,
];

/** The campaign picture's rules (the robed rule over the whole scene). */
export const CAMPAIGN_REMAP_RULES: RemapRules = { kind: "robed" };
