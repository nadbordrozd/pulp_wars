/**
 * Chibi production batch manifests, class recipes and layered prompts
 * (bead pulp_wars-67q.2). Pure: callers pass the fragment texts in, so tests
 * can check layering and validation without touching the file system.
 *
 * Final prompt = style + camera + faction + class (+ owner) + subject
 * (+ recipe addendum), in that order; negative prompts combine the same way.
 * See docs/art/CHIBI_PIPELINE.md.
 */
import {
  CHIBI_CLASS_GEOMETRY_V7,
  chibiAnchorV7,
  chibiAssetProblemsV7,
  chibiOverflowV7,
  type ArtSubjectV7,
  type ChibiAssetClassV7,
  type ChibiPointV7,
} from "../../../src/assets/chibi-art-v7";
import { WAIVABLE_MASK_QA_CODES } from "./owner-mask";
import type { CropRowsSpec } from "./raster";

export interface Size {
  readonly width: number;
  readonly height: number;
}

export type ChibiRecipeClass =
  | "unit"
  | "ship"
  | "settlement"
  | "building"
  /**
   * An unowned field of crops (the Farm, bead pulp_wars-6gd.5): a BUILDING
   * asset with no house, no faction layer and no owner colour.
   */
  | "crop-field"
  | "resource"
  | "terrain"
  | "tall-terrain"
  /** Batch 5: owned head-and-shoulders unit portraits for the interface. */
  | "portrait"
  /** Batch 5: unowned interface icons (technologies, commands, rewards, HUD). */
  | "icon"
  /** Revision 14 board status markers (Plague, Bitten), 16 x 16 (vkq.14). */
  | "status"
  /** Undead ability effect sprites for the effects canvas (vkq.14). */
  | "effect"
  /**
   * The calmer building style of the new visual direction (bead
   * pulp_wars-3tq.5): a smaller, simpler improvement with a toned outline
   * and no owner colour, in the shared neutral materials.
   */
  | "calm-building"
  /** A city or the Village in the same calm style, with no owner colour. */
  | "calm-settlement"
  /** The Farm as a seamless full-cell pattern of crop rows with gaps. */
  | "crop-rows";

export type ChibiEndpoint =
  "create-image-pixen" | "create-image-pixflux" | "edit-image-pixen";

/** How the accepted candidate becomes the DPR 1 master. */
export type ChibiDerivation =
  /** The candidate is the master, pixel for pixel (units, settlements, buildings, resources). */
  | "as-is"
  /** A pure crop of the window whose wrap-around seams differ least (terrain). */
  | "seamless-crop"
  /** The transparent body is drawn over an accepted ground tile in the bottom cell (tall terrain). */
  | "ground-composite"
  /**
   * Every opaque pixel of the candidate mapped to the nearest colour of the
   * asset's checked-in palette (status markers and effects, bead
   * pulp_wars-vkq.14): Pixen draws the right shape, the palette keeps red,
   * cyan, green and purple (the player colours) out.
   */
  | "palette-map"
  /**
   * The art is centred and seated a few pixels above the canvas bottom, then
   * the bottom-centred master window is cut (calm buildings and cities, bead
   * pulp_wars-3tq.5): whole pixels only. The request may be larger than the
   * master, never smaller.
   */
  | "seated"
  /**
   * Pieces of one crop row of the candidate stamped at a period that divides
   * the tile, on evenly pitched rows, then calmed (the Farm).
   */
  | "crop-rows";

export type ChibiCamera =
  "three-quarter" | "top-down" | "portrait" | "icon" | "flat" | "crop-pattern";

/** Style fragments other than the default `style.txt` (`style-<name>.txt`). */
export type ChibiStyleName = "calm" | "crop";

/** Transparent rows kept under a seated piece unless the asset says otherwise. */
export const SEATED_BOTTOM_MARGIN = 3;

export interface ChibiClassRecipe {
  readonly camera: ChibiCamera;
  /** Layer 1 is `style-<name>.txt` instead of the chibi `style.txt`. */
  readonly style?: ChibiStyleName;
  /** Terrain is faction-neutral: factions never restyle the ground. */
  readonly factionLayer: boolean;
  readonly assetClasses: readonly ChibiAssetClassV7[];
  /** Endpoints allowed for the first (text-to-image) generation. */
  readonly generators: readonly ChibiEndpoint[];
  /** Whether a follow-up edit-image-pixen ground-removal pass is allowed. */
  readonly editPass: boolean;
  readonly noBackground: boolean;
  readonly derivation: ChibiDerivation;
  /** Endpoint options applied before recipe overrides. */
  readonly options: Readonly<
    Partial<Record<ChibiEndpoint, Readonly<Record<string, string>>>>
  >;
}

const PIECE_OPTIONS = {
  outline: "single color black outline",
  detail: "low detail",
  view: "low top-down",
  direction: "south-east",
} as const;

/** Flat-shaded pieces through Pixflux (bead pulp_wars-3tq.3). */
const FLAT_PIECE_OPTIONS = {
  outline: "selective outline",
  shading: "flat shading",
  detail: "low detail",
  view: "low top-down",
  direction: "south-east",
} as const;

/** Status markers and effects (vkq.14): flat, front-on, black outline. */
const EFFECT_OPTIONS = {
  "create-image-pixflux": {
    outline: "single color black outline",
    shading: "flat shading",
    detail: "low detail",
    view: "side",
  },
  "create-image-pixen": {
    outline: "single color black outline",
    detail: "low detail",
    view: "side",
  },
} as const;

/**
 * The class recipes proven in docs/art/TILE80_STYLE_TEST_2026-09.md: units
 * and pieces through create-image-pixen (the only endpoint that honours the
 * south-east three-quarter view); cities and buildings generated large with
 * an optional edit-image-pixen "remove all ground" pass; terrain as a larger
 * field with a deterministic seamless crop, flat shading allowed.
 */
export const CHIBI_CLASS_RECIPES: Readonly<
  Record<ChibiRecipeClass, ChibiClassRecipe>
> = {
  unit: {
    camera: "three-quarter",
    factionLayer: true,
    assetClasses: ["STANDARD_UNIT", "LARGE_UNIT", "GIANT_UNIT"],
    generators: ["create-image-pixen"],
    // A reviewed edit may enlarge the owner area or fix a detail (a red
    // mouth) while keeping the accepted design.
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: { "create-image-pixen": PIECE_OPTIONS },
  },
  // Naval units and the embarked transport (batch 4): the unit sizes and
  // Pixen options, but a boat class text instead of the figure's "standing
  // ready pose, both feet visible", and no water drawn under the hull.
  ship: {
    camera: "three-quarter",
    factionLayer: true,
    assetClasses: ["LARGE_UNIT", "GIANT_UNIT"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: { "create-image-pixen": PIECE_OPTIONS },
  },
  settlement: {
    camera: "three-quarter",
    factionLayer: true,
    assetClasses: ["SETTLEMENT"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: { "create-image-pixen": PIECE_OPTIONS },
  },
  // Pixflux is allowed for buildings since the Human demo of the
  // visual-direction study (bead pulp_wars-3tq.3): it is the only endpoint
  // with a shading option, so a flat-shaded building style could be tried.
  // Its samples ignored the subject and drew ground plates; every accepted
  // building still comes from Pixen, which honours the camera.
  building: {
    camera: "three-quarter",
    factionLayer: true,
    assetClasses: ["BUILDING"],
    generators: ["create-image-pixen", "create-image-pixflux"],
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: {
      "create-image-pixen": PIECE_OPTIONS,
      "create-image-pixflux": FLAT_PIECE_OPTIONS,
    },
  },
  // Bead pulp_wars-6gd.5: the Farm is a field of grain with no building.
  // The building class text ("one single building") and the faction layer
  // ("woven cloth, light steel, plaster") drew a farmer and a barn on a soil
  // slab in every sample, so a field has its own class text and, like
  // resources, no faction layer: grain is the same for every faction.
  "crop-field": {
    camera: "three-quarter",
    factionLayer: false,
    assetClasses: ["BUILDING"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: { "create-image-pixen": PIECE_OPTIONS },
  },
  resource: {
    camera: "three-quarter",
    // Resources are neutral map features, like terrain.
    factionLayer: false,
    assetClasses: ["RESOURCE"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: { "create-image-pixen": PIECE_OPTIONS },
  },
  terrain: {
    camera: "top-down",
    factionLayer: false,
    assetClasses: ["TERRAIN"],
    generators: ["create-image-pixen", "create-image-pixflux"],
    editPass: false,
    noBackground: false,
    derivation: "seamless-crop",
    options: {
      "create-image-pixflux": {
        shading: "flat shading",
        detail: "low detail",
        view: "high top-down",
      },
      "create-image-pixen": { detail: "low detail", view: "high top-down" },
    },
  },
  "tall-terrain": {
    camera: "three-quarter",
    factionLayer: false,
    assetClasses: ["TALL_TERRAIN"],
    generators: ["create-image-pixen"],
    // Pixen draws trees and rocks on an isometric slab like cities; the
    // same ground-removal edit runs before the ground composite.
    editPass: true,
    noBackground: true,
    derivation: "ground-composite",
    options: { "create-image-pixen": PIECE_OPTIONS },
  },
  // Batch 5 interface art: generated at the 48 x 48 display size of an
  // action tile, shown 1:1 there and at 1.5x in 72 px cards and dialogs.
  portrait: {
    camera: "portrait",
    factionLayer: true,
    assetClasses: ["PORTRAIT"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: {
      "create-image-pixen": {
        outline: "single color black outline",
        detail: "low detail",
        view: "side",
        direction: "south-east",
      },
    },
  },
  icon: {
    camera: "icon",
    factionLayer: true,
    // Ships and the Catapult use the icon camera for their whole-object
    // portraits (a machine has no head and shoulders). The Dinosaur Egg
    // (UNIT:DINOSAUR:EGG, bead pulp_wars-c87.7) is an owned item sprite on
    // the board: the unit class would give it a face and feet.
    assetClasses: ["ICON", "PORTRAIT", "STANDARD_UNIT"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "as-is",
    options: {
      "create-image-pixen": {
        outline: "single color black outline",
        detail: "low detail",
        view: "low top-down",
      },
    },
  },
  // Bead pulp_wars-vkq.14: board overlays that belong to no faction's
  // materials (the faction layer's bone, cloth and iron would turn a cloud
  // into a prop), so their palette lives in the class and subject texts.
  // Pixen draws them; its 16 x 16 output is noise, so markers are 32 x 32.
  // Pixflux (with a forced palette) stays allowed only for the recorded
  // attempts: it ignored these subjects, which come last in a long layered
  // description. The flat camera shows one shape floating alone on
  // transparency, with no floor (the three-quarter icon camera drew a
  // burst on an isometric plate).
  status: {
    camera: "flat",
    factionLayer: false,
    assetClasses: ["STATUS"],
    generators: ["create-image-pixen", "create-image-pixflux"],
    editPass: true,
    noBackground: true,
    derivation: "palette-map",
    options: EFFECT_OPTIONS,
  },
  // Effects use the icon camera (batch 5's floating item sprites): the flat
  // camera and "burst" wording drew campfires and explosions on tiles.
  effect: {
    camera: "icon",
    factionLayer: false,
    assetClasses: ["EFFECT"],
    generators: ["create-image-pixen", "create-image-pixflux"],
    editPass: true,
    noBackground: true,
    derivation: "palette-map",
    options: EFFECT_OPTIONS,
  },
  // The new visual direction (bead pulp_wars-3tq.5, proven in the Human demo
  // of pulp_wars-3tq.3): buildings recede behind the units. They use the
  // calm style layer and a thin outline in a darker tone of each colour
  // (Pixen's "selective outline"), are generated at about 70% of the tile
  // and carry no owner colour. Improvements are one neutral set shared by
  // every faction, so the class text names the materials and the faction
  // layer is skipped (a faction's cloth and heraldry would put flags on a
  // sawmill); cities name their materials in the subject line.
  "calm-building": {
    camera: "three-quarter",
    style: "calm",
    factionLayer: false,
    assetClasses: ["BUILDING"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "seated",
    options: {
      "create-image-pixen": { ...PIECE_OPTIONS, outline: "selective outline" },
    },
  },
  "calm-settlement": {
    camera: "three-quarter",
    style: "calm",
    factionLayer: false,
    assetClasses: ["SETTLEMENT"],
    generators: ["create-image-pixen"],
    editPass: true,
    noBackground: true,
    derivation: "seated",
    options: {
      "create-image-pixen": { ...PIECE_OPTIONS, outline: "selective outline" },
    },
  },
  // The Farm of the new direction: rows of plump crops, each on its own
  // strip of tilled soil, with transparent gaps between the rows. An edit
  // thins the soil; the crop-rows derivation then makes the pattern tile.
  // The wheat recipe (bead pulp_wars-9s0.3) asks for the low view. Pixflux
  // is allowed since bead pulp_wars-9s0.6: its vegetable beds are taller
  // (three to a tile) and are one of the three green Farm variants.
  "crop-rows": {
    camera: "crop-pattern",
    style: "crop",
    factionLayer: false,
    assetClasses: ["BUILDING"],
    generators: ["create-image-pixen", "create-image-pixflux"],
    editPass: true,
    noBackground: true,
    derivation: "crop-rows",
    options: {
      "create-image-pixen": {
        outline: "selective outline",
        detail: "low detail",
        view: "high top-down",
      },
      "create-image-pixflux": {
        outline: "selective outline",
        shading: "flat shading",
        detail: "low detail",
        view: "high top-down",
      },
    },
  },
};

/** PixelLab enums from https://api.pixellab.ai/v2/openapi.json. */
const OPTION_VALUES: Readonly<Record<string, readonly string[]>> = {
  outline: [
    "single color black outline",
    "single color outline",
    "selective outline",
    "lineless",
  ],
  detail: ["low detail", "medium detail", "highly detailed"],
  view: ["side", "low top-down", "high top-down"],
  direction: [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ],
  shading: [
    "flat shading",
    "basic shading",
    "medium shading",
    "detailed shading",
    "highly detailed shading",
  ],
};

const ENDPOINT_OPTIONS: Readonly<Record<ChibiEndpoint, readonly string[]>> = {
  "create-image-pixen": ["outline", "detail", "view", "direction"],
  "create-image-pixflux": ["outline", "shading", "detail", "view", "direction"],
  "edit-image-pixen": [],
};

export interface MaskOverrideSpec {
  /** Repository-relative PNG, same size as the master; alpha >= 128 = owner. */
  readonly path: string;
  /**
   * pixelSha256 of the master this override was corrected against (see
   * pipeline.ts); a regenerated master voids the override.
   */
  readonly masterPixelSha256: string;
  readonly reason: string;
  /** QA codes waived after review; only WAIVABLE_MASK_QA_CODES are allowed. */
  readonly waive?: readonly string[];
}

export interface ChibiAssetSpec {
  /** Runtime asset id, registered in src/assets/chibi-art-manifest.ts. */
  readonly id: string;
  readonly subject: ArtSubjectV7;
  readonly assetClass: ChibiAssetClassV7;
  readonly recipeClass: ChibiRecipeClass;
  /** DPR 1 master size in CSS px at zoom 1. */
  readonly canvas: Size;
  /** Omit to use the class placement (chibiAnchorV7). */
  readonly anchor?: ChibiPointV7;
  /** Defaults to true for UNIT and CITY subjects, false otherwise. */
  readonly ownerColour?: boolean;
  /** Appended to the subject layer for this asset (for example a variant). */
  readonly subjectAddendum?: string;
  /**
   * The subject text to use instead of the subject's own, for a variant that
   * depicts something else (a boar as a variant of `RESOURCE:GAME`): a key
   * `<subject>/<VARIANT>` in the subjects file.
   */
  readonly subjectKey?: string;
  /** ground-composite only: accepted TERRAIN asset drawn in the bottom cell. */
  readonly groundAsset?: string;
  /**
   * seamless-crop only: the part of the field the seamless window is searched
   * in, so terrain variants can be distinct windows of one field and share
   * its exact colours and features.
   */
  readonly cropRegion?: CropRegion;
  /**
   * seamless-crop only: the recipe of another variant of the same subject
   * whose field this variant is cropped from (with its own cropRegion).
   */
  readonly fieldRecipe?: string;
  readonly maskOverride?: MaskOverrideSpec;
  /** seated only: transparent rows kept under the art (default 3). */
  readonly bottomMargin?: number;
  /** crop-rows only: how the candidate's crop row becomes the tile. */
  readonly cropRows?: CropRowsSpec;
  /**
   * palette-map only: the checked-in palette PNG (under
   * scripts/art/chibi/palettes/) every opaque master pixel is mapped to.
   */
  readonly palette?: ColorImageSpec;
}

export interface CropRegion {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface DryRunFixture {
  /** Repository-relative raw candidate sheet standing in for the provider. */
  readonly path: string;
  readonly sha256: string;
  /** Candidates in the sheet (grid of ceil(sqrt(n)) columns); default 1. */
  readonly candidateCount?: number;
  /** Where the fixture came from, for the evidence index. */
  readonly provenance: string;
}

export interface DryRunReview {
  readonly verdict: "ACCEPT" | "REJECT";
  readonly candidate: number | null;
  readonly notes: string;
  /** Asset outcome the dry run must reproduce, which proves the QA gates. */
  readonly expect?: "ACCEPTED" | "MASK_REJECTED";
}

export interface ColorImageSpec {
  /** Repository-relative PNG under scripts/art/chibi/palettes/. */
  readonly path: string;
  readonly sha256: string;
}

export interface ChibiRecipe {
  readonly id: string;
  readonly asset: string;
  readonly endpoint: ChibiEndpoint;
  readonly seed: number;
  readonly requestSize: Size;
  /** Merged over the class options; null removes a class option. */
  readonly options?: Readonly<Record<string, string | null>>;
  readonly promptAddendum?: string;
  readonly negativeAddendum?: string;
  /**
   * edit-image-pixen: the candidate of an earlier recipe to edit. `batch`
   * names an earlier production batch whose recorded candidate is edited
   * (for example a batch-3 Mine derived from a batch-1 Mountain); without it
   * the source is an earlier recipe of the same asset in this batch.
   */
  readonly source?: {
    readonly batch?: string;
    readonly recipe: string;
    readonly candidate: number;
  };
  /** edit-image-pixen: defaults to fragments/edit-remove-ground.txt. */
  readonly editInstruction?: string;
  /**
   * create-image-pixflux only: a checked-in forced-palette PNG sent as
   * `color_image`, so every variant of a terrain shares the same colours.
   */
  readonly colorImage?: ColorImageSpec;
  readonly notes?: string;
  /** Dry-run manifests only. */
  readonly fixture?: DryRunFixture;
  readonly dryRunReview?: DryRunReview;
}

export interface ChibiBatchManifest {
  readonly schemaVersion: 1;
  /** "0" is the fixture dry run; "1".."5" are the migration batches. */
  readonly batch: string;
  readonly title: string;
  readonly bead: string;
  /** Faction id: docs/art/factions/<faction>.md and subjects/<faction>.json. */
  readonly faction: string;
  /** Dry runs use fixtures and never call PixelLab. */
  readonly dryRun: boolean;
  /**
   * The new visual direction (bead pulp_wars-3tq.5): the batch's units,
   * cities and portraits wear fixed faction colours and have no owner area,
   * so they are declared `ownerColour: false`, get no owner layer and no
   * mask, and register with `fixedColours: true`. Without this flag such
   * subjects must carry the owner colour.
   */
  readonly fixedFactionColours?: boolean;
  readonly assets: readonly ChibiAssetSpec[];
  readonly recipes: readonly ChibiRecipe[];
}

/** Checked-in fragment texts keyed by their repository-relative source. */
export interface FragmentLibrary {
  readonly style: Fragment;
  /** Alternate style layers by name (`style-<name>.txt`). */
  readonly styles?: Readonly<Partial<Record<ChibiStyleName, Fragment>>>;
  readonly camera: Readonly<Record<ChibiCamera, Fragment>>;
  readonly owner: Fragment;
  readonly classes: Readonly<Record<ChibiRecipeClass, Fragment>>;
  readonly editRemoveGround: Fragment;
  readonly factions: Readonly<Record<string, Fragment>>;
  /** Subject texts by faction id (plus SHARED) and subject. */
  readonly subjects: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Where a faction's subject texts come from when it is not
   * scripts/art/chibi/subjects/<faction>.json (exploration runs).
   */
  readonly subjectSources?: Readonly<Record<string, string>>;
}

export interface Fragment {
  readonly source: string;
  readonly text: string;
  readonly negativeSource?: string;
  readonly negative?: string;
}

export type PromptLayerName =
  "style" | "camera" | "faction" | "class" | "owner" | "subject" | "recipe";

export interface PromptLayerRecord {
  readonly layer: PromptLayerName;
  readonly source: string;
  readonly text: string;
  readonly negative?: string;
}

export interface LayeredPrompt {
  readonly layers: readonly PromptLayerRecord[];
  readonly prompt: string;
  readonly negativePrompt: string;
  /**
   * PixelLab image endpoints have no negative field on Pixen, so exclusions
   * are appended exactly as the production client and the studies do.
   */
  readonly description: string;
}

function clean(text: string): string {
  return text.replaceAll(/\s+/g, " ").trim();
}

export function assetOwned(asset: ChibiAssetSpec): boolean {
  return (
    asset.ownerColour ??
    (asset.subject.startsWith("UNIT:") ||
      asset.subject.startsWith("CITY:") ||
      asset.subject.startsWith("PORTRAIT:"))
  );
}

export function subjectText(
  fragments: FragmentLibrary,
  faction: string,
  subject: string,
): { readonly source: string; readonly text: string } | null {
  const own = fragments.subjects[faction]?.[subject];
  if (own !== undefined)
    return {
      source:
        fragments.subjectSources?.[faction] ??
        `scripts/art/chibi/subjects/${faction}.json`,
      text: own,
    };
  const shared = fragments.subjects.SHARED?.[subject];
  return shared === undefined
    ? null
    : { source: "scripts/art/chibi/subjects/SHARED.json", text: shared };
}

/** Layers 1-5 (+ recipe addendum) in the fixed order of docs/art/factions/README.md. */
export function layeredPrompt(
  fragments: FragmentLibrary,
  manifest: Pick<ChibiBatchManifest, "faction">,
  asset: ChibiAssetSpec,
  recipe: Pick<ChibiRecipe, "promptAddendum" | "negativeAddendum">,
): LayeredPrompt {
  const classRecipe = CHIBI_CLASS_RECIPES[asset.recipeClass];
  const layers: PromptLayerRecord[] = [];
  const push = (layer: PromptLayerName, fragment: Fragment): void => {
    layers.push({
      layer,
      source:
        fragment.negativeSource === undefined
          ? fragment.source
          : `${fragment.source} + ${fragment.negativeSource}`,
      text: clean(fragment.text),
      ...(fragment.negative === undefined || clean(fragment.negative) === ""
        ? {}
        : { negative: clean(fragment.negative) }),
    });
  };
  const style =
    classRecipe.style === undefined
      ? fragments.style
      : fragments.styles?.[classRecipe.style];
  if (style === undefined)
    throw new Error(`Unknown style fragment ${classRecipe.style}`);
  push("style", style);
  push("camera", fragments.camera[classRecipe.camera]);
  if (classRecipe.factionLayer) {
    const faction = fragments.factions[manifest.faction];
    if (faction === undefined)
      throw new Error(`Unknown faction fragment ${manifest.faction}`);
    push("faction", faction);
  }
  push("class", fragments.classes[asset.recipeClass]);
  if (assetOwned(asset)) push("owner", fragments.owner);
  const subjectKey = asset.subjectKey ?? asset.subject;
  const subject = subjectText(fragments, manifest.faction, subjectKey);
  if (subject === null)
    throw new Error(
      `${asset.id}: no subject text for ${subjectKey} (faction ${manifest.faction})`,
    );
  push("subject", {
    source: subject.source,
    text: [subject.text, asset.subjectAddendum ?? ""].join(" "),
  });
  if (
    recipe.promptAddendum !== undefined ||
    recipe.negativeAddendum !== undefined
  )
    push("recipe", {
      source: "batch manifest recipe",
      text: recipe.promptAddendum ?? "",
      ...(recipe.negativeAddendum === undefined
        ? {}
        : { negative: recipe.negativeAddendum }),
    });
  const prompt = layers
    .map((layer) => layer.text)
    .filter(Boolean)
    .join(" ");
  // Layers may repeat an exclusion (plate words); keep its first occurrence.
  const negativeTerms: string[] = [];
  for (const layer of layers)
    for (const term of (layer.negative ?? "").split(/[,;]/)) {
      const trimmed = term.trim();
      if (trimmed !== "" && !negativeTerms.includes(trimmed))
        negativeTerms.push(trimmed);
    }
  const negativePrompt = negativeTerms.join(", ");
  return {
    layers,
    prompt,
    negativePrompt,
    description:
      negativePrompt === ""
        ? prompt
        : `${prompt} Must not include: ${negativePrompt}.`,
  };
}

export interface ChibiRequestSnapshot {
  readonly endpoint: ChibiEndpoint;
  readonly model: ChibiEndpoint;
  readonly batch: string;
  readonly asset: string;
  readonly subject: ArtSubjectV7;
  readonly faction: string;
  readonly recipeClass: ChibiRecipeClass;
  /** Layer sources and texts; the texts make the request self-describing. */
  readonly layers: readonly PromptLayerRecord[];
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly description: string;
  readonly requestSize: Size;
  readonly seed: number;
  readonly noBackground: boolean;
  readonly options: Readonly<Record<string, string>>;
  readonly editInstruction?: string;
  /** Forced palette (Pixflux `color_image`), recorded by path and hash. */
  readonly colorImage?: ColorImageSpec;
  readonly source?: {
    readonly recipe: string;
    readonly candidate: number;
    /** Filled when the source bytes are resolved for submission. */
    readonly sha256?: string;
  };
}

export function findAsset(
  manifest: ChibiBatchManifest,
  id: string,
): ChibiAssetSpec {
  const asset = manifest.assets.find((candidate) => candidate.id === id);
  if (asset === undefined) throw new Error(`Unknown chibi asset ${id}`);
  return asset;
}

export function findRecipe(
  manifest: ChibiBatchManifest,
  id: string,
): ChibiRecipe {
  const recipe = manifest.recipes.find((candidate) => candidate.id === id);
  if (recipe === undefined) throw new Error(`Unknown chibi recipe ${id}`);
  return recipe;
}

/** The exact, credential-free request recorded in receipts and records. */
export function requestSnapshot(
  fragments: FragmentLibrary,
  manifest: ChibiBatchManifest,
  recipe: ChibiRecipe,
): ChibiRequestSnapshot {
  const asset = findAsset(manifest, recipe.asset);
  const classRecipe = CHIBI_CLASS_RECIPES[asset.recipeClass];
  const options = Object.fromEntries(
    Object.entries({
      ...classRecipe.options[recipe.endpoint],
      ...recipe.options,
    }).filter((entry): entry is [string, string] => entry[1] !== null),
  );
  const common = {
    endpoint: recipe.endpoint,
    model: recipe.endpoint,
    batch: manifest.batch,
    asset: asset.id,
    subject: asset.subject,
    faction: manifest.faction,
    recipeClass: asset.recipeClass,
    requestSize: recipe.requestSize,
    seed: recipe.seed,
    noBackground: classRecipe.noBackground,
    options,
  };
  if (recipe.endpoint === "edit-image-pixen") {
    const instruction = clean(
      recipe.editInstruction ?? fragments.editRemoveGround.text,
    );
    return {
      ...common,
      layers: [
        {
          layer: "recipe",
          source:
            recipe.editInstruction === undefined
              ? fragments.editRemoveGround.source
              : "batch manifest recipe",
          text: instruction,
        },
      ],
      prompt: instruction,
      negativePrompt: "",
      description: instruction,
      editInstruction: instruction,
      ...(recipe.source === undefined ? {} : { source: recipe.source }),
    };
  }
  const layered = layeredPrompt(fragments, manifest, asset, recipe);
  return {
    ...common,
    ...layered,
    ...(recipe.colorImage === undefined
      ? {}
      : { colorImage: recipe.colorImage }),
  };
}

/**
 * Prompt layers whose source or text differ between the request recorded at
 * generation time and the one the live fragments build now. Fragments are
 * live: they apply to recipes not yet generated. A recorded request is the
 * historical copy and is never rebuilt or resubmitted, so a later fragment
 * edit (for example owner.txt, bead pulp_wars-bi3) shows up here as drift,
 * not as a validation failure.
 */
export function promptLayerChanges(
  recorded: Pick<ChibiRequestSnapshot, "layers">,
  live: Pick<ChibiRequestSnapshot, "layers">,
): PromptLayerName[] {
  const names = [
    ...new Set([
      ...recorded.layers.map((layer) => layer.layer),
      ...live.layers.map((layer) => layer.layer),
    ]),
  ];
  return names.filter((name) => {
    const before = recorded.layers.find((layer) => layer.layer === name);
    const after = live.layers.find((layer) => layer.layer === name);
    return (
      before?.source !== after?.source ||
      before?.text !== after?.text ||
      before?.negative !== after?.negative
    );
  });
}

/**
 * The PixelLab JSON body; `sourceImage` is the resolved edit source and
 * `colorImage` the resolved forced-palette PNG.
 */
export function requestBody(
  request: ChibiRequestSnapshot,
  sourceImage?: Buffer,
  colorImage?: Buffer,
): Record<string, unknown> {
  if (request.endpoint === "edit-image-pixen") {
    if (sourceImage === undefined || request.editInstruction === undefined)
      throw new Error("edit-image-pixen needs a source image and instruction");
    return {
      image: {
        base64: `data:image/png;base64,${sourceImage.toString("base64")}`,
      },
      description: request.editInstruction,
      width: request.requestSize.width,
      height: request.requestSize.height,
      seed: request.seed,
      no_background: request.noBackground,
    };
  }
  if (request.colorImage !== undefined && colorImage === undefined)
    throw new Error("a forced palette needs its colour image bytes");
  return {
    description: request.description,
    image_size: request.requestSize,
    no_background: request.noBackground,
    seed: request.seed,
    ...request.options,
    ...(request.colorImage === undefined || colorImage === undefined
      ? {}
      : {
          color_image: {
            type: "base64",
            base64: colorImage.toString("base64"),
            format: "png",
          },
        }),
  };
}

const SUBJECT_PATTERN =
  /^(TERRAIN|RESOURCE|IMPROVEMENT|UNIT|PORTRAIT):[A-Z_]+$|^(UNIT|PORTRAIT):(UNDEAD|GOBLIN|DINOSAUR):[A-Z_]+$|^ICON:(TECH|ACTION|REWARD|HUD):(UNDEAD:|GOBLIN:|DINOSAUR:)?[A-Z_]+$|^CITY:((UNDEAD|GOBLIN|DINOSAUR):)?[123]$|^SITE:VILLAGE$|^TREASURE$|^GRAVE$|^STATUS:(PLAGUED|BITTEN)$|^EFFECT:[A-Z_]+$/;
const ID_PATTERN = /^chibi-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RECIPE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA_PATTERN = /^[a-f0-9]{64}$/;
export const BATCH_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sizeProblems(
  label: string,
  endpoint: ChibiEndpoint,
  size: Size,
): string[] {
  const problems: string[] = [];
  const { width, height } = size;
  if (!Number.isInteger(width) || !Number.isInteger(height))
    return [`${label}: request size must be integers`];
  if (endpoint === "create-image-pixen") {
    if (width % 4 !== 0 || height % 4 !== 0)
      problems.push(`${label}: Pixen sizes must be multiples of 4`);
    if (width < 16 || height < 16 || width > 768 || height > 768)
      problems.push(`${label}: Pixen sides must be 16..768`);
    if (width * height > 512 * 512)
      problems.push(`${label}: Pixen area must be at most 512x512`);
    if ((width < 32 || height < 32) && width !== height)
      problems.push(`${label}: Pixen sides below 32 must be square`);
  } else if (endpoint === "create-image-pixflux") {
    if (width < 16 || height < 16 || width > 400 || height > 400)
      problems.push(`${label}: Pixflux sides must be 16..400`);
    // PixelLab answers HTTP 422 below this area (vkq.14, a 16 x 16 marker).
    if (width * height < 32 * 32)
      problems.push(`${label}: Pixflux area must be at least 32x32`);
  } else if (width < 1 || height < 1)
    problems.push(`${label}: edit size must be positive`);
  return problems;
}

/** Every structural problem of a batch manifest; empty means valid. */
export function batchManifestProblems(
  manifest: ChibiBatchManifest,
  fragments: FragmentLibrary,
  fileBatch?: string,
): string[] {
  const problems: string[] = [];
  const at = `batch ${manifest.batch}`;
  if (manifest.schemaVersion !== 1)
    problems.push(`${at}: schemaVersion must be 1`);
  if (!BATCH_ID_PATTERN.test(manifest.batch))
    problems.push(`${at}: batch id must be lowercase letters, digits, dashes`);
  if (fileBatch !== undefined && fileBatch !== manifest.batch)
    problems.push(`${at}: file is named for batch ${fileBatch}`);
  if (!manifest.title) problems.push(`${at}: title is required`);
  if (!/^pulp_wars-[a-z0-9.]+$/.test(manifest.bead))
    problems.push(`${at}: bead must be a Beads id`);
  if (fragments.factions[manifest.faction] === undefined)
    problems.push(`${at}: faction ${manifest.faction} has no fragment`);
  const assetIds = new Set<string>();
  for (const asset of manifest.assets) {
    const label = `${at} asset ${asset.id}`;
    if (!ID_PATTERN.test(asset.id))
      problems.push(`${label}: id must look like chibi-<name>`);
    if (assetIds.has(asset.id)) problems.push(`${label}: duplicate asset id`);
    assetIds.add(asset.id);
    if (!SUBJECT_PATTERN.test(asset.subject))
      problems.push(`${label}: unknown subject ${asset.subject}`);
    const classRecipe = CHIBI_CLASS_RECIPES[asset.recipeClass];
    if (classRecipe === undefined) {
      problems.push(`${label}: unknown recipe class ${asset.recipeClass}`);
      continue;
    }
    if (CHIBI_CLASS_GEOMETRY_V7[asset.assetClass] === undefined) {
      problems.push(`${label}: unknown asset class ${asset.assetClass}`);
      continue;
    }
    if (!classRecipe.assetClasses.includes(asset.assetClass))
      problems.push(
        `${label}: recipe class ${asset.recipeClass} cannot make ${asset.assetClass}`,
      );
    const owned = assetOwned(asset);
    if (
      owned &&
      !asset.subject.startsWith("UNIT:") &&
      !asset.subject.startsWith("CITY:") &&
      !asset.subject.startsWith("IMPROVEMENT:") &&
      !asset.subject.startsWith("PORTRAIT:")
    )
      problems.push(
        `${label}: only units, cities, improvements and portraits are owned`,
      );
    const ownedSubject =
      asset.subject.startsWith("UNIT:") ||
      asset.subject.startsWith("CITY:") ||
      asset.subject.startsWith("PORTRAIT:");
    const fixedColours = !owned && ownedSubject;
    if (fixedColours && manifest.fixedFactionColours !== true)
      problems.push(
        `${label}: units and cities must carry owner colour, as must portraits`,
      );
    if (
      manifest.fixedFactionColours === true &&
      owned &&
      ownedSubject &&
      asset.ownerColour !== true
    )
      problems.push(
        `${label}: a fixed-colour batch must say ownerColour true or false for units, cities and portraits`,
      );
    // The runtime contract for the entry this asset will register as.
    for (const problem of chibiAssetProblemsV7({
      id: asset.id,
      subject: asset.subject,
      assetClass: asset.assetClass,
      width: asset.canvas.width,
      height: asset.canvas.height,
      url: "contract-check",
      ...(asset.anchor === undefined ? {} : { anchor: asset.anchor }),
      ...(owned ? { ownerMaskUrl: "contract-check" } : {}),
      ...(fixedColours ? { fixedColours: true as const } : {}),
    }))
      problems.push(`${at}: ${problem}`);
    if (asset.bottomMargin !== undefined) {
      if (classRecipe.derivation !== "seated")
        problems.push(`${label}: bottomMargin is only for seated classes`);
      if (!Number.isInteger(asset.bottomMargin) || asset.bottomMargin < 0)
        problems.push(`${label}: bottomMargin must be a non-negative integer`);
    }
    if (classRecipe.derivation === "crop-rows") {
      const rows = asset.cropRows;
      if (rows === undefined)
        problems.push(`${label}: a crop-rows asset needs cropRows`);
      else {
        if (
          !Number.isInteger(rows.period) ||
          rows.period <= 0 ||
          asset.canvas.width % rows.period !== 0
        )
          problems.push(`${label}: the crop period must divide the tile width`);
        // The rows need not divide the tile height: three beds stand at a
        // pitch of 80 / 3 px, rounded to whole pixels by the derivation.
        if (
          !Number.isInteger(rows.rows) ||
          rows.rows <= 0 ||
          rows.rows > asset.canvas.height
        )
          problems.push(`${label}: the crop rows must fit the tile height`);
        if (
          rows.trimBottom !== undefined &&
          (!Number.isInteger(rows.trimBottom) || rows.trimBottom < 0)
        )
          problems.push(`${label}: trimBottom must be a non-negative integer`);
        if (
          rows.phase !== undefined &&
          (!Number.isFinite(rows.phase) || rows.phase < 0 || rows.phase >= 1)
        )
          problems.push(`${label}: phase must be at least 0 and below 1`);
        if (rows.stamps.length === 0)
          problems.push(`${label}: cropRows needs at least one stamp`);
        for (const stamp of rows.stamps)
          if (
            ![stamp.left, stamp.width, stamp.at].every(Number.isInteger) ||
            stamp.left < 0 ||
            stamp.width <= 0 ||
            stamp.at < 0 ||
            stamp.at + stamp.width > rows.period
          )
            problems.push(`${label}: a crop stamp must fit inside the period`);
          else if (
            (stamp.band !== undefined &&
              (!Number.isInteger(stamp.band) || stamp.band < 0)) ||
            stamp.rows?.some(
              (row) => !Number.isInteger(row) || row < 0 || row >= rows.rows,
            ) === true
          )
            problems.push(
              `${label}: a crop stamp's band and rows must be row numbers`,
            );
        if (
          rows.rowOffsets !== undefined &&
          (rows.rowOffsets.length !== rows.rows ||
            !rows.rowOffsets.every(Number.isInteger))
        )
          problems.push(
            `${label}: rowOffsets needs one whole number for each crop row`,
          );
        for (const value of [rows.saturation, rows.strawMix])
          if (!(value >= 0 && value <= 1))
            problems.push(`${label}: saturation and strawMix must be 0..1`);
      }
    } else if (asset.cropRows !== undefined)
      problems.push(`${label}: cropRows is only for the crop-rows class`);
    if (
      asset.subjectKey !== undefined &&
      !new RegExp(`^${asset.subject}/[A-Z_]+$`).test(asset.subjectKey)
    )
      problems.push(
        `${label}: subjectKey must look like ${asset.subject}/<VARIANT>`,
      );
    const subjectKey = asset.subjectKey ?? asset.subject;
    if (subjectText(fragments, manifest.faction, subjectKey) === null)
      problems.push(`${label}: no subject text for ${subjectKey}`);
    if (classRecipe.derivation === "palette-map") {
      const palette = asset.palette;
      if (palette === undefined)
        problems.push(`${label}: a palette-map asset needs a palette`);
      else if (
        !palette.path.startsWith("scripts/art/chibi/palettes/") ||
        !palette.path.endsWith(".png") ||
        !SHA_PATTERN.test(palette.sha256)
      )
        problems.push(
          `${label}: palettes are PNGs in scripts/art/chibi/palettes/ with a sha256`,
        );
    } else if (asset.palette !== undefined)
      problems.push(`${label}: palette is only for palette-map classes`);
    if (classRecipe.derivation === "ground-composite") {
      if (asset.groundAsset === undefined)
        problems.push(`${label}: tall terrain needs a groundAsset`);
    } else if (asset.groundAsset !== undefined)
      problems.push(`${label}: groundAsset is only for tall terrain`);
    if (asset.cropRegion !== undefined) {
      const region = asset.cropRegion;
      if (classRecipe.derivation !== "seamless-crop")
        problems.push(`${label}: cropRegion is only for terrain crops`);
      if (
        [region.left, region.top, region.width, region.height].some(
          (value) => !Number.isInteger(value) || value < 0,
        )
      )
        problems.push(`${label}: cropRegion must be non-negative integers`);
      if (
        region.width < asset.canvas.width ||
        region.height < asset.canvas.height
      )
        problems.push(`${label}: cropRegion is smaller than the tile`);
      for (const recipe of manifest.recipes)
        if (
          (recipe.asset === asset.id || recipe.id === asset.fieldRecipe) &&
          (region.left + region.width > recipe.requestSize.width ||
            region.top + region.height > recipe.requestSize.height)
        )
          problems.push(
            `${label}: cropRegion falls outside recipe ${recipe.id}'s field`,
          );
    }
    if (asset.maskOverride !== undefined) {
      const override = asset.maskOverride;
      if (!owned) problems.push(`${label}: mask override on an unowned asset`);
      if (!override.path.endsWith(".png"))
        problems.push(`${label}: mask override must be a PNG`);
      if (!SHA_PATTERN.test(override.masterPixelSha256))
        problems.push(`${label}: mask override needs the master pixel sha256`);
      if (clean(override.reason).length < 20)
        problems.push(`${label}: mask override needs a written reason`);
      for (const code of override.waive ?? [])
        if (!(WAIVABLE_MASK_QA_CODES as readonly string[]).includes(code))
          problems.push(`${label}: QA code ${code} cannot be waived`);
    }
  }
  const recipeIds: string[] = [];
  for (const recipe of manifest.recipes) {
    const label = `${at} recipe ${recipe.id}`;
    if (!RECIPE_PATTERN.test(recipe.id))
      problems.push(`${label}: recipe id must be lowercase with dashes`);
    if (recipeIds.includes(recipe.id))
      problems.push(`${label}: duplicate recipe id`);
    const asset = manifest.assets.find((entry) => entry.id === recipe.asset);
    if (asset === undefined) {
      problems.push(`${label}: unknown asset ${recipe.asset}`);
      recipeIds.push(recipe.id);
      continue;
    }
    const classRecipe = CHIBI_CLASS_RECIPES[asset.recipeClass];
    if (classRecipe === undefined) {
      recipeIds.push(recipe.id);
      continue;
    }
    if (!Number.isInteger(recipe.seed) || recipe.seed < 0)
      problems.push(`${label}: seed must be a non-negative integer`);
    problems.push(...sizeProblems(label, recipe.endpoint, recipe.requestSize));
    if (recipe.endpoint === "edit-image-pixen") {
      if (!classRecipe.editPass)
        problems.push(`${label}: ${asset.recipeClass} has no edit pass`);
      const source = recipe.source;
      if (source === undefined)
        problems.push(`${label}: an edit needs a source recipe`);
      else if (source.batch !== undefined && source.batch !== manifest.batch) {
        // A cross-batch source is resolved and size-checked at generation
        // time from that batch's records.
        if (manifest.dryRun)
          problems.push(`${label}: dry runs cannot edit another batch`);
        // A numbered batch, or a named one (`goblin`, bead pulp_wars-3tq.8:
        // the direction edits of a faction start from its accepted sprites).
        // Batch 0 is the fixture dry run and is never a source.
        if (!BATCH_ID_PATTERN.test(source.batch) || /^0+$/.test(source.batch))
          problems.push(`${label}: source batch must be a production batch`);
        if (Number(source.batch) >= Number(manifest.batch))
          problems.push(`${label}: source batch must be an earlier batch`);
        if (!Number.isInteger(source.candidate) || source.candidate < 0)
          problems.push(`${label}: edit source candidate must be >= 0`);
      } else {
        const sourceRecipe = manifest.recipes.find(
          (entry) => entry.id === source.recipe,
        );
        if (!recipeIds.includes(source.recipe) || sourceRecipe === undefined)
          problems.push(`${label}: edit source must be an earlier recipe`);
        else if (sourceRecipe.asset !== recipe.asset)
          problems.push(`${label}: edit source belongs to another asset`);
        else if (
          sourceRecipe.requestSize.width !== recipe.requestSize.width ||
          sourceRecipe.requestSize.height !== recipe.requestSize.height
        )
          problems.push(`${label}: edit size must match its source`);
        if (!Number.isInteger(source.candidate) || source.candidate < 0)
          problems.push(`${label}: edit source candidate must be >= 0`);
      }
      const instruction = clean(
        recipe.editInstruction ?? fragments.editRemoveGround.text,
      );
      if (instruction.length === 0 || instruction.length > 500)
        problems.push(`${label}: edit instruction must be 1..500 characters`);
    } else {
      if (!classRecipe.generators.includes(recipe.endpoint))
        problems.push(
          `${label}: ${asset.recipeClass} does not generate with ${recipe.endpoint}`,
        );
      if (recipe.source !== undefined || recipe.editInstruction !== undefined)
        problems.push(`${label}: only edits take a source or instruction`);
    }
    if (recipe.colorImage !== undefined) {
      if (recipe.endpoint !== "create-image-pixflux")
        problems.push(`${label}: only Pixflux takes a forced palette`);
      if (
        !recipe.colorImage.path.startsWith("scripts/art/chibi/palettes/") ||
        !recipe.colorImage.path.endsWith(".png")
      )
        problems.push(
          `${label}: forced palettes are PNGs in scripts/art/chibi/palettes/`,
        );
      if (!SHA_PATTERN.test(recipe.colorImage.sha256))
        problems.push(`${label}: forced palette needs a sha256`);
    }
    const allowed = ENDPOINT_OPTIONS[recipe.endpoint];
    for (const [key, value] of Object.entries(recipe.options ?? {})) {
      if (!allowed.includes(key))
        problems.push(`${label}: ${recipe.endpoint} has no option ${key}`);
      else if (value !== null && !OPTION_VALUES[key]?.includes(value))
        problems.push(`${label}: option ${key} cannot be "${value}"`);
    }
    const { width, height } = recipe.requestSize;
    if (classRecipe.derivation === "seamless-crop") {
      if (width < asset.canvas.width * 2 || height < asset.canvas.height * 2)
        problems.push(
          `${label}: terrain fields must be at least twice the tile in each direction`,
        );
    } else if (classRecipe.derivation === "seated") {
      // A pure bottom-centred crop: the request may be larger, never smaller.
      if (width < asset.canvas.width || height < asset.canvas.height)
        problems.push(
          `${label}: a seated request ${width}x${height} must be at least the ${asset.canvas.width}x${asset.canvas.height} master (never upscale)`,
        );
    } else if (width !== asset.canvas.width || height !== asset.canvas.height)
      problems.push(
        `${label}: generate at the display size: request ${width}x${height} must equal the ${asset.canvas.width}x${asset.canvas.height} master (never downscale)`,
      );
    if (manifest.dryRun) {
      if (recipe.fixture === undefined)
        problems.push(`${label}: dry-run recipes need a fixture`);
      else if (!SHA_PATTERN.test(recipe.fixture.sha256))
        problems.push(`${label}: fixture needs a sha256`);
      if (recipe.dryRunReview === undefined)
        problems.push(`${label}: dry-run recipes need a scripted review`);
    } else if (
      recipe.fixture !== undefined ||
      recipe.dryRunReview !== undefined
    )
      problems.push(`${label}: production recipes cannot use fixtures`);
    recipeIds.push(recipe.id);
  }
  for (const asset of manifest.assets) {
    if (asset.fieldRecipe !== undefined) {
      const label = `${at} asset ${asset.id}`;
      const field = manifest.recipes.find(
        (recipe) => recipe.id === asset.fieldRecipe,
      );
      const owner = manifest.assets.find((entry) => entry.id === field?.asset);
      if (field === undefined || owner === undefined)
        problems.push(`${label}: unknown field recipe ${asset.fieldRecipe}`);
      else if (
        owner.subject !== asset.subject ||
        CHIBI_CLASS_RECIPES[asset.recipeClass]?.derivation !== "seamless-crop"
      )
        problems.push(
          `${label}: a field recipe must be a terrain variant of the same subject`,
        );
      if (asset.cropRegion === undefined)
        problems.push(`${label}: a shared field needs its own cropRegion`);
      continue;
    }
    if (!manifest.recipes.some((recipe) => recipe.asset === asset.id))
      problems.push(`${at} asset ${asset.id}: no recipe generates it`);
  }
  return problems;
}

/** Runtime placement recorded with every accepted asset. */
export function assetPlacement(asset: ChibiAssetSpec): {
  readonly anchor: ChibiPointV7;
  readonly overflow: ReturnType<typeof chibiOverflowV7>;
} {
  const entry = {
    id: asset.id,
    subject: asset.subject,
    assetClass: asset.assetClass,
    width: asset.canvas.width,
    height: asset.canvas.height,
    url: "",
    ...(asset.anchor === undefined ? {} : { anchor: asset.anchor }),
  };
  return { anchor: chibiAnchorV7(entry), overflow: chibiOverflowV7(entry) };
}
