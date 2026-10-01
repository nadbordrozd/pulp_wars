import type {
  CommandV7,
  FactionIdV7,
  ImprovementIdV7,
  ResourceIdV7,
  TechnologyIdV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../engine/index";

/**
 * Ruleset 7 art sets. LEGACY is the default production art; CHIBI is the
 * opt-in migration target described in docs/art/CHIBI_ART_DIRECTION.md.
 */
export type ArtSetV7 = "LEGACY" | "CHIBI";

/**
 * Art-set-neutral name of what a map entry depicts. Batch beads register
 * CHIBI rasters against these subjects; a subject without a registered
 * raster falls back to its legacy asset drawn at the chibi geometry.
 */
export type ArtSubjectV7 =
  | `TERRAIN:${TerrainIdV7 | "MINED_MOUNTAIN"}`
  | `RESOURCE:${ResourceIdV7}`
  | `IMPROVEMENT:${ImprovementIdV7}`
  | `UNIT:${UnitRoleIdV7 | "EMBARKED_TRANSPORT"}`
  | `UNIT:UNDEAD:${UndeadArtRoleV7}`
  /** Revision 17: the Goblin units (bead pulp_wars-0ao.8, GOBLIN.md). */
  | `UNIT:GOBLIN:${GoblinArtRoleV7}`
  | `CITY:${1 | 2 | 3}`
  | "SITE:VILLAGE"
  | "TREASURE"
  /** Revision 13: the unowned Grave marker left by a fallen land unit. */
  | "GRAVE"
  | UiArtSubjectV7
  | ChibiEffectSubjectV7;

/**
 * Board overlays of revision 14 and the Undead abilities (bead
 * pulp_wars-vkq.14), CHIBI only; LEGACY keeps its code-drawn cues.
 * `STATUS:*` are the Plague and Bitten unit markers (drawn in the
 * AFFLICTION_MARKER_FRAME_V7 slots; the Plague marker is also the Plague
 * puff effect at 1:1); `EFFECT:*` are single sprites the effects canvas
 * animates with code-driven position, scale and alpha: WAIL (Banshee
 * shriek), SPLASH (Lich frost burst), RAISE (bone hands of Raise Dead),
 * WISP (the Lifesteal drain and the Infect and Bitten risings) and CURE
 * (Plague or a bite cured).
 */
export type ChibiEffectIdV7 = "WAIL" | "SPLASH" | "RAISE" | "WISP" | "CURE";

export type ChibiEffectSubjectV7 =
  "STATUS:PLAGUED" | "STATUS:BITTEN" | `EFFECT:${ChibiEffectIdV7}`;

/**
 * Interface (DOM) subjects, batch 5 (bead pulp_wars-67q.11). The board never
 * asks for them; the DOM art hook (src/render/dom/chibi-dom-art-v7.ts) does.
 * `PORTRAIT:<ROLE>` is a head-and-shoulders unit portrait (train buttons,
 * rewards, technology cards); `PORTRAIT:UNDEAD:<ROLE>` is the Undead one and
 * `PORTRAIT:GOBLIN:<ROLE>` the Goblin one (bead pulp_wars-0ao.8).
 * `ICON:*` are unowned icons: dedicated technology icons, command and action
 * icons (`ICON:ACTION:UNDEAD:RALLY` is the Undead Frenzy and
 * `ICON:ACTION:GOBLIN:RALLY` the Goblin WAAAGH!, bead pulp_wars-0ao.14), city
 * rewards and the HUD economy icons.
 */
export type UiArtSubjectV7 =
  | `PORTRAIT:${UnitRoleIdV7}`
  | `PORTRAIT:UNDEAD:${UndeadArtRoleV7}`
  | `PORTRAIT:GOBLIN:${GoblinArtRoleV7}`
  | `ICON:TECH:${TechnologyIdV7}`
  | `ICON:ACTION:${CommandV7["kind"]}`
  | "ICON:ACTION:UNDEAD:RALLY"
  | "ICON:ACTION:GOBLIN:RALLY"
  | `ICON:REWARD:${"SURVEY" | "WALLS" | "EXPAND"}`
  | `ICON:HUD:${"COIN" | "POPULATION"}`;

/**
 * Roles with their own Undead art (docs/art/factions/UNDEAD.md). Patrol
 * Boat and Battleship reuse the Human ship art, so they have no Undead
 * subject.
 */
export type UndeadArtRoleV7 = Exclude<
  UnitRoleIdV7,
  "PATROL_BOAT" | "BATTLESHIP"
>;

/**
 * Roles with their own Goblin art (docs/art/factions/GOBLIN.md): the same
 * land roles as the Undead; Goblin ships reuse the Human ship art.
 */
export type GoblinArtRoleV7 = UndeadArtRoleV7;

const SHARED_ART_ROLES_V7: readonly UnitRoleIdV7[] = [
  "PATROL_BOAT",
  "BATTLESHIP",
];

/**
 * The art subject of a unit on the map: the embarked transport, the
 * owner faction's own art for the role, or the shared (Human) art.
 */
export function unitArtSubjectV7(unit: {
  readonly role: UnitRoleIdV7;
  readonly form: "LAND" | "EMBARKED" | "NAVAL";
  readonly faction: FactionIdV7;
}): ArtSubjectV7 {
  if (unit.form === "EMBARKED") return "UNIT:EMBARKED_TRANSPORT";
  if (SHARED_ART_ROLES_V7.includes(unit.role)) return `UNIT:${unit.role}`;
  if (unit.faction === "UNDEAD")
    return `UNIT:UNDEAD:${unit.role as UndeadArtRoleV7}`;
  if (unit.faction === "GOBLIN")
    return `UNIT:GOBLIN:${unit.role as GoblinArtRoleV7}`;
  return `UNIT:${unit.role}`;
}

/**
 * The subject whose art stands in while a faction subject has no usable
 * raster: `UNIT:UNDEAD:<ROLE>` falls back to the Human `UNIT:<ROLE>` (drawn
 * with the Undead badge), and likewise `PORTRAIT:UNDEAD:<ROLE>` and
 * `ICON:ACTION:UNDEAD:RALLY`; `UNIT:GOBLIN:<ROLE>` and `PORTRAIT:GOBLIN:<ROLE>`
 * fall back to the Human art with the Goblin badge, and
 * `ICON:ACTION:GOBLIN:RALLY` (WAAAGH!) to the Human Rally horn. Every other subject has
 * no fallback.
 */
export function chibiFallbackSubjectV7(
  subject: ArtSubjectV7,
): ArtSubjectV7 | null {
  for (const faction of [":UNDEAD:", ":GOBLIN:"])
    if (subject.includes(faction))
      return subject.replace(faction, ":") as ArtSubjectV7;
  return null;
}

export type ChibiAssetClassV7 =
  | "TERRAIN"
  | "TALL_TERRAIN"
  | "STANDARD_UNIT"
  | "LARGE_UNIT"
  | "GIANT_UNIT"
  | "SETTLEMENT"
  | "BUILDING"
  | "RESOURCE"
  /** Interface portrait (DOM only), owned: 48 x 48, centred. */
  | "PORTRAIT"
  /** Interface icon (DOM only), unowned: up to 48 x 48, centred. */
  | "ICON"
  /**
   * Board status marker (Plague, Bitten), unowned, centred. The one class
   * not drawn at 1 master px per CSS px: a 32 x 32 master (Pixflux's
   * smallest canvas; Pixen's 16 x 16 output was noise) is drawn into the
   * 16 CSS px marker frame, which is 1:1 on DPR 2 screens.
   */
  | "STATUS"
  /** Board ability effect sprite, unowned: up to 48 x 48, centred. */
  | "EFFECT";

export interface ChibiPointV7 {
  readonly x: number;
  readonly y: number;
}

/**
 * One checked-in chibi raster. All sizes are DPR-1 master pixels, which are
 * CSS pixels at zoom 1 (one 80 x 80 tile).
 */
export interface ChibiArtAssetV7 {
  readonly id: string;
  readonly subject: ArtSubjectV7;
  readonly assetClass: ChibiAssetClassV7;
  readonly width: number;
  readonly height: number;
  /** Public URL of the DPR-1 master PNG. */
  readonly url: string;
  /**
   * Master pixel placed on the owning cell centre. Omit it to use the class
   * placement: bottom-centred units, settlements, buildings and tall terrain
   * (anchor = width / 2, height - 40), centred terrain and resources.
   */
  readonly anchor?: ChibiPointV7;
  /** Optional pre-built integer nearest-neighbour upscales of the master. */
  readonly densityUrls?: Readonly<Partial<Record<2 | 3, string>>>;
  /**
   * Checked-in owner mask PNG with the master's exact dimensions. A pixel
   * with alpha >= 128 marks an owner-colour pixel; everything else is kept.
   */
  readonly ownerMaskUrl?: string;
  /**
   * TALL_TERRAIN only: the two layers the master was composited from (the
   * pipeline's ground composite), so a Road can pass between them. The body
   * has the master's size and anchor and is transparent where the master
   * shows ground; the ground is the 80 x 80 tile under the owning cell.
   * Master = body over ground, pixel for pixel (checked by art:validate).
   */
  readonly layers?: ChibiTallTerrainLayersV7;
}

export interface ChibiTallTerrainLayersV7 {
  /** Public URL of the transparent body PNG (master size). */
  readonly bodyUrl: string;
  /** Public URL of the accepted 80 x 80 ground tile under the body. */
  readonly groundUrl: string;
}

export interface ChibiClassGeometryV7 {
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly placement: "CELL" | "CENTRE" | "BOTTOM_CENTRE";
  /** Largest allowed overflow beyond either side of the 80 px cell. */
  readonly maxSideOverflow: number;
  /** Largest allowed overflow above the 80 px cell. */
  readonly maxUpOverflow: number;
}

export const CHIBI_TILE_CSS_PX = 80;

/** Normative canvas and overflow table from CHIBI_ART_DIRECTION.md section 3. */
export const CHIBI_CLASS_GEOMETRY_V7 = {
  TERRAIN: {
    maxWidth: 80,
    maxHeight: 80,
    placement: "CELL",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  TALL_TERRAIN: {
    maxWidth: 80,
    maxHeight: 104,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 24,
  },
  STANDARD_UNIT: {
    maxWidth: 56,
    maxHeight: 80,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  LARGE_UNIT: {
    maxWidth: 72,
    maxHeight: 88,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 4,
    maxUpOverflow: 8,
  },
  GIANT_UNIT: {
    maxWidth: 88,
    maxHeight: 104,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 4,
    maxUpOverflow: 24,
  },
  SETTLEMENT: {
    maxWidth: 96,
    maxHeight: 104,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 8,
    maxUpOverflow: 24,
  },
  BUILDING: {
    maxWidth: 80,
    maxHeight: 88,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 8,
  },
  RESOURCE: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  PORTRAIT: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  ICON: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  STATUS: {
    maxWidth: 32,
    maxHeight: 32,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  EFFECT: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
} as const satisfies Readonly<Record<ChibiAssetClassV7, ChibiClassGeometryV7>>;

export interface ChibiOverflowV7 {
  readonly left: number;
  readonly right: number;
  readonly up: number;
  readonly down: number;
}

export function chibiAnchorV7(asset: ChibiArtAssetV7): ChibiPointV7 {
  if (asset.anchor !== undefined) return asset.anchor;
  const half = CHIBI_TILE_CSS_PX / 2;
  return CHIBI_CLASS_GEOMETRY_V7[asset.assetClass].placement === "BOTTOM_CENTRE"
    ? { x: asset.width / 2, y: asset.height - half }
    : { x: asset.width / 2, y: asset.height / 2 };
}

/** Overflow of the master canvas beyond its 80 x 80 owning cell, in CSS px at zoom 1. */
export function chibiOverflowV7(asset: ChibiArtAssetV7): ChibiOverflowV7 {
  const anchor = chibiAnchorV7(asset);
  const half = CHIBI_TILE_CSS_PX / 2;
  return {
    left: Math.max(0, anchor.x - half),
    right: Math.max(0, asset.width - anchor.x - half),
    up: Math.max(0, anchor.y - half),
    down: Math.max(0, asset.height - anchor.y - half),
  };
}

const OWNED_SUBJECT_PREFIXES = ["UNIT:", "CITY:", "PORTRAIT:"] as const;

function allowedClasses(subject: ArtSubjectV7): readonly ChibiAssetClassV7[] {
  if (
    subject === "TERRAIN:FOREST" ||
    subject === "TERRAIN:MOUNTAIN" ||
    subject === "TERRAIN:MINED_MOUNTAIN"
  )
    return ["TERRAIN", "TALL_TERRAIN"];
  if (subject.startsWith("TERRAIN:")) return ["TERRAIN"];
  if (subject.startsWith("RESOURCE:")) return ["RESOURCE"];
  if (subject.startsWith("IMPROVEMENT:")) return ["BUILDING"];
  if (subject.startsWith("UNIT:"))
    return ["STANDARD_UNIT", "LARGE_UNIT", "GIANT_UNIT"];
  if (subject.startsWith("CITY:") || subject === "SITE:VILLAGE")
    return ["SETTLEMENT"];
  if (subject.startsWith("PORTRAIT:")) return ["PORTRAIT"];
  if (subject.startsWith("ICON:")) return ["ICON"];
  if (subject.startsWith("STATUS:")) return ["STATUS"];
  if (subject.startsWith("EFFECT:")) return ["EFFECT"];
  return ["RESOURCE", "BUILDING"];
}

/** Returns every contract violation of one manifest entry; empty means valid. */
export function chibiAssetProblemsV7(asset: ChibiArtAssetV7): string[] {
  const problems: string[] = [];
  const limits = CHIBI_CLASS_GEOMETRY_V7[asset.assetClass];
  const label = `${asset.id} (${asset.subject}, ${asset.assetClass})`;
  if (!allowedClasses(asset.subject).includes(asset.assetClass))
    problems.push(`${label}: class does not fit the subject`);
  if (
    !Number.isInteger(asset.width) ||
    !Number.isInteger(asset.height) ||
    asset.width <= 0 ||
    asset.height <= 0
  )
    problems.push(`${label}: master size must be positive integers`);
  if (asset.width > limits.maxWidth || asset.height > limits.maxHeight)
    problems.push(
      `${label}: ${asset.width} x ${asset.height} exceeds ${limits.maxWidth} x ${limits.maxHeight}`,
    );
  if (
    limits.placement === "CELL" &&
    (asset.width !== CHIBI_TILE_CSS_PX || asset.height !== CHIBI_TILE_CSS_PX)
  )
    problems.push(`${label}: terrain tiles must be exactly 80 x 80`);
  if (asset.assetClass === "TALL_TERRAIN" && asset.width !== CHIBI_TILE_CSS_PX)
    problems.push(`${label}: tall terrain must be exactly 80 px wide`);
  const overflow = chibiOverflowV7(asset);
  if (Math.max(overflow.left, overflow.right) > limits.maxSideOverflow)
    problems.push(
      `${label}: side overflow ${Math.max(overflow.left, overflow.right)} exceeds ${limits.maxSideOverflow}`,
    );
  if (overflow.up > limits.maxUpOverflow)
    problems.push(
      `${label}: upward overflow ${overflow.up} exceeds ${limits.maxUpOverflow}`,
    );
  if (overflow.down > 0)
    problems.push(`${label}: nothing may overflow below its cell`);
  if (
    OWNED_SUBJECT_PREFIXES.some((prefix) => asset.subject.startsWith(prefix)) &&
    asset.ownerMaskUrl === undefined
  )
    problems.push(`${label}: owned subjects need a checked-in owner mask`);
  if (asset.layers !== undefined && asset.assetClass !== "TALL_TERRAIN")
    problems.push(`${label}: only tall terrain has ground and body layers`);
  return problems;
}

export interface ChibiArtRegistryV7 {
  /** Accepted variants of one subject in manifest order; empty means fall back. */
  variants(subject: ArtSubjectV7): readonly ChibiArtAssetV7[];
}

export function buildChibiArtRegistryV7(assets: readonly ChibiArtAssetV7[]): {
  readonly registry: ChibiArtRegistryV7;
  readonly problems: readonly string[];
} {
  const problems: string[] = [];
  const ids = new Set<string>();
  const bySubject = new Map<ArtSubjectV7, ChibiArtAssetV7[]>();
  for (const asset of assets) {
    const assetProblems = chibiAssetProblemsV7(asset);
    if (ids.has(asset.id))
      assetProblems.push(`${asset.id}: duplicate asset id`);
    ids.add(asset.id);
    if (assetProblems.length > 0) {
      problems.push(...assetProblems);
      continue;
    }
    bySubject.set(asset.subject, [
      ...(bySubject.get(asset.subject) ?? []),
      asset,
    ]);
  }
  return {
    registry: { variants: (subject) => bySubject.get(subject) ?? [] },
    problems,
  };
}

/** Deterministic cosmetic variant, the same coordinate hash legacy terrain uses. */
export function chibiVariantV7(
  variants: readonly ChibiArtAssetV7[],
  at: ChibiPointV7,
): ChibiArtAssetV7 | null {
  if (variants.length === 0) return null;
  const index =
    (((Math.floor(at.x) * 31 + Math.floor(at.y) * 17) % variants.length) +
      variants.length) %
    variants.length;
  return variants[index] ?? null;
}
