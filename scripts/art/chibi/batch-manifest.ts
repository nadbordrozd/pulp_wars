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

export interface Size {
  readonly width: number;
  readonly height: number;
}

export type ChibiRecipeClass =
  "unit" | "settlement" | "building" | "resource" | "terrain" | "tall-terrain";

export type ChibiEndpoint =
  "create-image-pixen" | "create-image-pixflux" | "edit-image-pixen";

/** How the accepted candidate becomes the DPR 1 master. */
export type ChibiDerivation =
  /** The candidate is the master, pixel for pixel (units, settlements, buildings, resources). */
  | "as-is"
  /** A pure crop of the window whose wrap-around seams differ least (terrain). */
  | "seamless-crop"
  /** The transparent body is drawn over an accepted ground tile in the bottom cell (tall terrain). */
  | "ground-composite";

export type ChibiCamera = "three-quarter" | "top-down";

export interface ChibiClassRecipe {
  readonly camera: ChibiCamera;
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
    editPass: false,
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
  building: {
    camera: "three-quarter",
    factionLayer: true,
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
    generators: ["create-image-pixflux", "create-image-pixen"],
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
    editPass: false,
    noBackground: true,
    derivation: "ground-composite",
    options: { "create-image-pixen": PIECE_OPTIONS },
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
  /** ground-composite only: accepted TERRAIN asset drawn in the bottom cell. */
  readonly groundAsset?: string;
  readonly maskOverride?: MaskOverrideSpec;
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
  /** edit-image-pixen: the candidate of an earlier recipe to edit. */
  readonly source?: { readonly recipe: string; readonly candidate: number };
  /** edit-image-pixen: defaults to fragments/edit-remove-ground.txt. */
  readonly editInstruction?: string;
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
  readonly assets: readonly ChibiAssetSpec[];
  readonly recipes: readonly ChibiRecipe[];
}

/** Checked-in fragment texts keyed by their repository-relative source. */
export interface FragmentLibrary {
  readonly style: Fragment;
  readonly camera: Readonly<Record<ChibiCamera, Fragment>>;
  readonly owner: Fragment;
  readonly classes: Readonly<Record<ChibiRecipeClass, Fragment>>;
  readonly editRemoveGround: Fragment;
  readonly factions: Readonly<Record<string, Fragment>>;
  /** Subject texts by faction id (plus SHARED) and subject. */
  readonly subjects: Readonly<Record<string, Readonly<Record<string, string>>>>;
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
    (asset.subject.startsWith("UNIT:") || asset.subject.startsWith("CITY:"))
  );
}

export function subjectText(
  fragments: FragmentLibrary,
  faction: string,
  subject: string,
): { readonly source: string; readonly text: string } | null {
  const own = fragments.subjects[faction]?.[subject];
  if (own !== undefined)
    return { source: `scripts/art/chibi/subjects/${faction}.json`, text: own };
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
  push("style", fragments.style);
  push("camera", fragments.camera[classRecipe.camera]);
  if (classRecipe.factionLayer) {
    const faction = fragments.factions[manifest.faction];
    if (faction === undefined)
      throw new Error(`Unknown faction fragment ${manifest.faction}`);
    push("faction", faction);
  }
  push("class", fragments.classes[asset.recipeClass]);
  if (assetOwned(asset)) push("owner", fragments.owner);
  const subject = subjectText(fragments, manifest.faction, asset.subject);
  if (subject === null)
    throw new Error(
      `${asset.id}: no subject text for ${asset.subject} (faction ${manifest.faction})`,
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
  return { ...common, ...layered };
}

/** The PixelLab JSON body; `sourceImage` is the resolved edit source. */
export function requestBody(
  request: ChibiRequestSnapshot,
  sourceImage?: Buffer,
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
  return {
    description: request.description,
    image_size: request.requestSize,
    no_background: request.noBackground,
    seed: request.seed,
    ...request.options,
  };
}

const SUBJECT_PATTERN =
  /^(TERRAIN|RESOURCE|IMPROVEMENT|UNIT):[A-Z_]+$|^CITY:[123]$|^SITE:VILLAGE$|^TREASURE$/;
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
      !asset.subject.startsWith("IMPROVEMENT:")
    )
      problems.push(`${label}: only units, cities and improvements are owned`);
    if (
      !owned &&
      (asset.subject.startsWith("UNIT:") || asset.subject.startsWith("CITY:"))
    )
      problems.push(`${label}: units and cities must carry owner colour`);
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
    }))
      problems.push(`${at}: ${problem}`);
    if (subjectText(fragments, manifest.faction, asset.subject) === null)
      problems.push(`${label}: no subject text for ${asset.subject}`);
    if (classRecipe.derivation === "ground-composite") {
      if (asset.groundAsset === undefined)
        problems.push(`${label}: tall terrain needs a groundAsset`);
    } else if (asset.groundAsset !== undefined)
      problems.push(`${label}: groundAsset is only for tall terrain`);
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
      else {
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
  for (const asset of manifest.assets)
    if (!manifest.recipes.some((recipe) => recipe.asset === asset.id))
      problems.push(`${at} asset ${asset.id}: no recipe generates it`);
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
