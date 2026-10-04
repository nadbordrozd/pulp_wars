/**
 * The three palette directions of the Goblin redesign study (bead
 * pulp_wars-wrn.1, docs/art/factions/GOBLIN_REDESIGN.md). Pure data: each
 * direction names a five-step ramp per material, dark to light, and the
 * share of a material's pixels that each step receives when the recolour
 * mockup (recolour.ts) re-ranks a sprite's own shading onto it. The shares
 * are the direction's value-structure rule made concrete: at least half of
 * every material sits on the lit step or lighter, and the shadow step holds
 * at most about an eighth of it.
 *
 * The recolours are mockups on the OLD shapes. The redesign also changes
 * the shapes; the PixelLab recipes in art/explorations/goblin-redesign-2026-10
 * carry the new silhouettes.
 */

/** The material a pixel of a Goblin sprite is classified as. */
export type GoblinMaterialV7 =
  "skin" | "leather" | "wood" | "metal" | "rust" | "light" | "accent";

/** Which skin ramp a sprite's green pixels take. */
export type GoblinSkinKindV7 = "goblin" | "orc" | "troll";

export interface GoblinRampV7 {
  /** Five colours, darkest first. */
  readonly colours: readonly [string, string, string, string, string];
  /** The share of the material's pixels on each step; sums to 1. */
  readonly shares: readonly [number, number, number, number, number];
}

export type GoblinDirectionIdV7 = "lime" | "rag" | "teal";

export interface GoblinDirectionV7 {
  readonly id: GoblinDirectionIdV7;
  readonly letter: "A" | "B" | "C";
  readonly name: string;
  readonly summary: string;
  /** The silhouette outline (outer edge only); every channel at most 14. */
  readonly ink: string;
  readonly skins: Readonly<Record<GoblinSkinKindV7, GoblinRampV7>>;
  readonly ramps: Readonly<
    Record<Exclude<GoblinMaterialV7, "skin">, GoblinRampV7>
  >;
  /** The lit colour of each role, for the palette strip and the doc. */
  readonly swatches: readonly { readonly role: string; readonly hex: string }[];
}

/** The value structure every direction shares (step shares, dark first). */
export const SHARES_FIGURE = [0.1, 0.22, 0.38, 0.22, 0.08] as const;
export const SHARES_GEAR = [0.12, 0.25, 0.35, 0.2, 0.08] as const;
export const SHARES_SMALL = [0.08, 0.2, 0.42, 0.22, 0.08] as const;

const ramp = (
  colours: GoblinRampV7["colours"],
  shares: GoblinRampV7["shares"] = SHARES_GEAR,
): GoblinRampV7 => ({ colours, shares });

/** Cream teeth, eyes, bandages and the cones: kept light in every look. */
const CREAM = ramp(
  ["#9c8a66", "#c9b78f", "#ece0c0", "#f8f1dc", "#fffbf0"],
  SHARES_SMALL,
);

/** The faction colour, hazard yellow `#fdd20f`, on the lit step. */
const HAZARD = ramp(
  ["#8c5a00", "#c98d00", "#fdd20f", "#ffe24d", "#fff1a0"],
  SHARES_SMALL,
);

export const GOBLIN_DIRECTIONS_V7: readonly GoblinDirectionV7[] = [
  {
    id: "lime",
    letter: "A",
    name: "Lime, sand and hazard paint",
    summary:
      "Bright lime goblins, mid-green orcs and a sage troll with a pale belly; pale sand-buff leather, weathered grey-tan planks, light tin scrap, and hazard-yellow paint (the faction colour) daubed on helmets, shields, plates and everything that explodes.",
    ink: "#0e0b06",
    skins: {
      goblin: ramp(
        ["#2c4f12", "#5a9424", "#86c232", "#acdc55", "#d4f08a"],
        SHARES_FIGURE,
      ),
      orc: ramp(
        ["#16330f", "#326426", "#4a8a3a", "#6faa55", "#9fcb80"],
        SHARES_FIGURE,
      ),
      troll: ramp(
        ["#21391b", "#4c6c3c", "#739a59", "#9dbf80", "#cde0b4"],
        SHARES_FIGURE,
      ),
    },
    ramps: {
      leather: ramp(["#4a3218", "#9a7a46", "#d0b073", "#e6cc95", "#f6e6bf"]),
      wood: ramp(["#2f2a20", "#645a46", "#958a6c", "#b8ad8c", "#d8cfb0"]),
      metal: ramp(["#2e3539", "#68737a", "#9aa5a8", "#c4cccc", "#eef2ee"]),
      rust: HAZARD,
      light: CREAM,
      accent: HAZARD,
    },
    swatches: [
      { role: "Goblin skin", hex: "#86c232" },
      { role: "Orc skin", hex: "#4a8a3a" },
      { role: "Troll skin", hex: "#739a59" },
      { role: "Sand leather", hex: "#d0b073" },
      { role: "Grey-tan planks", hex: "#958a6c" },
      { role: "Tin scrap", hex: "#9aa5a8" },
      { role: "Hazard paint shade", hex: "#c98d00" },
      { role: "Hazard yellow", hex: "#fdd20f" },
    ],
  },
  {
    id: "rag",
    letter: "B",
    name: "Rust-red rags and canvas",
    summary:
      "Yellow-green skin, rust-red cloth and straps, patched light canvas instead of planks, a little dark iron; hazard yellow on what explodes.",
    ink: "#0e0806",
    skins: {
      goblin: ramp(
        ["#55601a", "#7f8f22", "#a8bb34", "#cbd85a", "#e8f08f"],
        SHARES_FIGURE,
      ),
      orc: ramp(
        ["#3a4a16", "#556b22", "#6e8e30", "#95b052", "#c2d488"],
        SHARES_FIGURE,
      ),
      troll: ramp(
        ["#3a5232", "#587450", "#7a9670", "#a2bb96", "#cfdfc4"],
        SHARES_FIGURE,
      ),
    },
    ramps: {
      leather: ramp(["#5e1c10", "#8c2c18", "#b8452a", "#d9683e", "#f0956a"]),
      wood: ramp(["#8a7a58", "#b5a27a", "#d8c79e", "#ece0bf", "#fbf4e0"]),
      metal: ramp(["#2e3236", "#4a5056", "#6a7177", "#8f979c", "#bcc3c6"]),
      rust: ramp(["#5a2412", "#83381c", "#a8522b", "#c87443", "#e09a68"]),
      light: CREAM,
      accent: HAZARD,
    },
    swatches: [
      { role: "Goblin skin", hex: "#a8bb34" },
      { role: "Orc skin", hex: "#6e8e30" },
      { role: "Troll skin", hex: "#7a9670" },
      { role: "Rust-red cloth", hex: "#b8452a" },
      { role: "Canvas", hex: "#d8c79e" },
      { role: "Iron", hex: "#6a7177" },
      { role: "Rust", hex: "#a8522b" },
      { role: "Hazard yellow", hex: "#fdd20f" },
    ],
  },
  {
    id: "teal",
    letter: "C",
    name: "Teal, bone and copper",
    summary:
      "Teal-green skin, bleached bone-white hide and pale driftwood, copper scrap; hazard yellow on what explodes.",
    ink: "#060e0c",
    skins: {
      goblin: ramp(
        ["#1f5a48", "#2f8064", "#45a682", "#72c9a2", "#a8e6c8"],
        SHARES_FIGURE,
      ),
      orc: ramp(
        ["#24504a", "#33736a", "#4b958a", "#77b7a8", "#a9d8cc"],
        SHARES_FIGURE,
      ),
      troll: ramp(
        ["#2c4c40", "#406c5a", "#5a8c74", "#84b099", "#b6d6c4"],
        SHARES_FIGURE,
      ),
    },
    ramps: {
      leather: ramp(["#7c6e58", "#a8987a", "#cfc1a0", "#e9dfc6", "#fbf7ea"]),
      wood: ramp(["#6a5a44", "#8f7d60", "#b5a280", "#d6c7a6", "#efe5cc"]),
      metal: ramp(["#5a2a12", "#8a4420", "#b8632f", "#d98a4a", "#f2b27a"]),
      rust: ramp(["#4a2410", "#73391a", "#9a5428", "#c0763c", "#de9e64"]),
      light: CREAM,
      accent: HAZARD,
    },
    swatches: [
      { role: "Goblin skin", hex: "#45a682" },
      { role: "Orc skin", hex: "#4b958a" },
      { role: "Troll skin", hex: "#5a8c74" },
      { role: "Bone hide", hex: "#cfc1a0" },
      { role: "Driftwood", hex: "#b5a280" },
      { role: "Copper", hex: "#b8632f" },
      { role: "Dark copper", hex: "#9a5428" },
      { role: "Hazard yellow", hex: "#fdd20f" },
    ],
  },
];

export function goblinDirectionV7(id: GoblinDirectionIdV7): GoblinDirectionV7 {
  const direction = GOBLIN_DIRECTIONS_V7.find(
    (candidate) => candidate.id === id,
  );
  if (direction === undefined) throw new Error(`Unknown direction ${id}`);
  return direction;
}

/**
 * A sprite of the roster the study diagnosed, and how the mockup reads its
 * colours. `file` is the live master, which bead pulp_wars-wrn.2 replaced
 * with the redesigned art; `before` names the superseded recipe whose
 * recorded candidate is the dark sprite the study measured (read it with
 * `loadGoblinBeforeV7` in before.ts: no copy of the old masters is kept).
 */
export interface GoblinSpriteV7 {
  readonly role: string;
  readonly name: string;
  readonly file: string;
  readonly before: { readonly batch: string; readonly recipe: string };
  readonly skin: GoblinSkinKindV7;
  readonly kind: "unit" | "portrait" | "city" | "ship";
  /** Very dark browns are planks ("wood") or leather shadows. */
  readonly darkBrown: "wood" | "leather";
  /** Red-brown is rust paint ("rust") or leather. */
  readonly rust: "rust" | "leather";
}

const UNITS = [
  ["FIGHTER", "Goblin", "goblin", "goblin", "leather", "leather"],
  ["RAIDER", "Wolf Rider", "wolf-rider", "goblin", "leather", "leather"],
  ["MARKSMAN", "Bomb Chucker", "bomb-chucker", "goblin", "leather", "rust"],
  ["GUARD", "Orc Brute", "orc-brute", "orc", "wood", "leather"],
  ["CAPTAIN", "Orc Warboss", "orc-warboss", "orc", "leather", "leather"],
  ["CATAPULT", "Rocket Cart", "rocket-cart", "goblin", "wood", "rust"],
  ["KNIGHT", "Scrap Buggy", "scrap-buggy", "goblin", "leather", "rust"],
  ["JUGGERNAUT", "Troll", "troll", "troll", "leather", "leather"],
] as const;

/** The accepted recipes of batch `direction-goblin` before the redesign. */
const BEFORE_UNIT_RECIPES: Readonly<Record<string, string>> = {
  goblin: "goblin-brown-edit-c",
  "wolf-rider": "wolf-rider-skin-edit-b",
  "bomb-chucker": "bomb-chucker-brown-edit-b",
  "orc-brute": "orc-brute-skin-edit-d",
  "orc-warboss": "orc-warboss-skin-edit-c",
  "rocket-cart": "fireworks-cart-crew-edit-d",
  "scrap-buggy": "scrap-buggy-hub-edit-a",
  troll: "troll-scrap-edit-b",
};

const BEFORE_PORTRAIT_RECIPES: Readonly<Record<string, string>> = {
  goblin: "portrait-goblin-skin-edit-a",
  "wolf-rider": "portrait-wolf-rider-skin-edit-a",
  "bomb-chucker": "portrait-bomb-chucker-skin-edit-b",
  "orc-brute": "portrait-orc-brute-skin-edit-a",
  "orc-warboss": "portrait-orc-warboss-skin-edit-b",
  "rocket-cart": "portrait-rocket-cart-scrap-edit-b",
  "scrap-buggy": "portrait-scrap-buggy-skin-edit-b",
  troll: "portrait-troll-smock-edit-a",
};

const BEFORE_CITY_RECIPES = [
  "goblin-city-1-scrap-edit-b",
  "goblin-city-2-scrap-edit-a",
  "goblin-city-3-scrap-edit-a",
] as const;

/** The production roster, with the skin ramp each sprite takes. */
export const GOBLIN_ROSTER_V7: readonly GoblinSpriteV7[] = UNITS.map(
  ([role, name, file, skin, darkBrown, rust]) => ({
    role,
    name,
    file: `public/assets/chibi/units/chibi-direction-goblin-${file}.png`,
    before: {
      batch: "direction-goblin",
      recipe: BEFORE_UNIT_RECIPES[file] ?? "",
    },
    skin,
    kind: "unit" as const,
    darkBrown,
    rust,
  }),
);

export const GOBLIN_PORTRAITS_V7: readonly GoblinSpriteV7[] = UNITS.map(
  ([role, name, file, skin, darkBrown, rust]) => ({
    role,
    name,
    file: `public/assets/chibi/portraits/chibi-direction-portrait-goblin-${file}.png`,
    before: {
      batch: "direction-goblin",
      recipe: BEFORE_PORTRAIT_RECIPES[file] ?? "",
    },
    skin,
    kind: "portrait" as const,
    darkBrown,
    rust,
  }),
);

export const GOBLIN_CITIES_V7: readonly GoblinSpriteV7[] = [1, 2, 3].map(
  (level) => ({
    role: `CITY_${level}`,
    name: `City ${level}`,
    file: `public/assets/chibi/settlements/chibi-direction-goblin-city-${level}.png`,
    before: {
      batch: "direction-goblin",
      recipe: BEFORE_CITY_RECIPES[level - 1] ?? "",
    },
    skin: "goblin" as const,
    kind: "city" as const,
    darkBrown: "wood" as const,
    rust: "rust" as const,
  }),
);

export const GOBLIN_SHIPS_V7: readonly GoblinSpriteV7[] = (
  [
    ["PATROL_BOAT", "Patrol Boat", "patrol-boat", "patrol-boat-crew-edit-a"],
    ["BATTLESHIP", "Battleship", "battleship", "battleship-crew-edit-a"],
    ["EMBARKED_TRANSPORT", "Transport", "transport", "transport-plank-edit-a"],
  ] as const
).map(([role, name, file, recipe]) => ({
  role,
  name,
  file: `public/assets/chibi/units/chibi-naval-goblin-${file}.png`,
  before: { batch: "naval-goblin", recipe: `goblin-${recipe}` },
  skin: "goblin" as const,
  kind: "ship" as const,
  darkBrown: "wood" as const,
  rust: "rust" as const,
}));

/**
 * The other factions' signature colours, as recorded in their docs
 * (FACTION_COLOURS.md, VISUAL_DIRECTION_2026-10.md, DWARF.md): a Goblin
 * direction should not wear one of them as a large area.
 */
export const SIGNATURE_COLOURS_V7: readonly {
  readonly name: string;
  readonly hex: string;
}[] = [
  { name: "Human crimson cloth", hex: "#a8202c" },
  { name: "Human faction crimson", hex: "#d01c3a" },
  { name: "Human gold", hex: "#f1b21b" },
  { name: "Undead violet", hex: "#a221ee" },
  { name: "Undead bone", hex: "#e6e0c8" },
  { name: "Dinosaur red-orange", hex: "#fe7500" },
  { name: "Dinosaur blue hide", hex: "#205794" },
  { name: "Dinosaur tawny fur", hex: "#a2804b" },
  { name: "Dinosaur shaman fur", hex: "#c2924b" },
  { name: "Martian magenta", hex: "#e83aae" },
  { name: "Ice Folk blue", hex: "#10b8ff" },
  { name: "Dwarf copper", hex: "#c27c3a" },
  { name: "Dwarf ginger beard", hex: "#c8642a" },
  { name: "Dwarf signal green", hex: "#2db885" },
];

/** The reference rosters, in the Goblin roster's role order. */
export const REFERENCE_ROSTERS_V7: Readonly<
  Record<
    string,
    { readonly faction: string; readonly files: readonly string[] }
  >
> = {
  human: {
    faction: "ORIGINAL",
    files: [
      "fighter",
      "raider",
      "marksman",
      "guard",
      "captain",
      "catapult",
      "knight",
      "juggernaut",
    ],
  },
  undead: {
    faction: "UNDEAD",
    files: [
      "undead-skeleton",
      "undead-ghoul",
      "undead-banshee",
      "undead-zombie",
      "undead-necromancer",
      "undead-lich",
      "undead-vampire",
      "undead-abomination",
    ],
  },
  dinosaur: {
    faction: "DINOSAUR",
    files: [
      "dinosaur-caveman",
      "dinosaur-raptor",
      "dinosaur-spitter",
      "dinosaur-ankylosaurus",
      "dinosaur-shaman",
      "dinosaur-triceratops",
      "dinosaur-t-rex",
      "dinosaur-brontosaurus",
    ],
  },
  martian: {
    faction: "MARTIAN",
    files: [
      "martian-grunt",
      "martian-saucer",
      "martian-ray-gunner",
      "martian-shield-projector",
      "martian-brain",
      "martian-tripod",
      "martian-colossus",
      "martian-mothership",
    ],
  },
  iceFolk: {
    faction: "ICE_FOLK",
    files: [
      "ice-folk-snow-hunter",
      "ice-folk-sabretooth",
      "ice-folk-ice-witch",
      "ice-folk-yeti",
      "ice-folk-boulder-yeti",
      "ice-folk-sled",
      "ice-folk-mammoth",
      "ice-folk-frost-giant",
    ],
  },
  dwarf: {
    faction: "DWARF",
    files: [
      "dwarf-hammerer",
      "dwarf-gyrocopter",
      "dwarf-clockwork-gunner",
      "dwarf-steam-mole",
      "dwarf-engineer",
      "dwarf-steam-cannon",
      "dwarf-steam-tank",
      "dwarf-brass-titan",
    ],
  },
};

export const referenceFile = (file: string): string =>
  `public/assets/chibi/units/chibi-direction-${file}.png`;
