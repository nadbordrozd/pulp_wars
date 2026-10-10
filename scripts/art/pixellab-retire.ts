import { createHash } from "node:crypto";

/**
 * Retiring PixelLab recipes (bead pulp_wars-67q.15): the plan and the text
 * surgery behind `pixellab.ts retire`. A retired recipe leaves the source
 * manifest, the generation records, its raster, its candidates and its
 * submission receipts; the manifest keeps one line of it under `retired`
 * (id, output path, the hash of the accepted raster and the reason). Nothing
 * here calls PixelLab or reads a credential.
 */

export interface RetirableRecipe {
  readonly id: string;
  readonly class: string;
  readonly output: string;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly groundReference?: string;
  readonly reframeGroundReference?: string;
  readonly reframeSource?: string;
  readonly historicalStyleReference?: { readonly path: string };
}

export interface RetiredRecipe {
  readonly id: string;
  readonly class: string;
  readonly output: string;
  /** The accepted raster's hash at retirement; absent if none was accepted. */
  readonly outputSha256?: string;
  readonly reason: string;
}

export interface RetirableSource {
  readonly aliases?: readonly {
    readonly id: string;
    readonly source: string;
  }[];
  readonly retired?: readonly RetiredRecipe[];
  readonly recipes: readonly RetirableRecipe[];
}

interface RetirableAttempt {
  readonly candidate?: string;
  readonly jobId?: string;
}

export interface RetirableRecord extends RetirableAttempt {
  readonly status: string;
  readonly outputSha256?: string;
  readonly request?: {
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
  };
  readonly rejectedAttempts?: readonly RetirableAttempt[];
}

export interface RetirableGenerated {
  readonly records: Readonly<Record<string, RetirableRecord | undefined>>;
}

export interface RetirementPlan {
  readonly retired: readonly RetiredRecipe[];
  /** Repository-relative files to delete: rasters, candidates, sources. */
  readonly files: readonly string[];
  /** Provider jobs whose submission receipts are deleted. */
  readonly jobIds: readonly string[];
  /** Recipes that stay and keep a retired recipe as their style reference. */
  readonly frozen: readonly string[];
}

/**
 * Postprocesses that read the style reference's bytes again after the
 * provider answered. A recipe using one cannot outlive its reference.
 */
const REFERENCE_READING_POSTPROCESSES = new Set([
  "sprite-derived-portrait",
  "diamond-mask-reference-edges",
  "reference-rotate-180-diamond",
]);

const SHA256 = /^[a-f0-9]{64}$/;

/**
 * What retiring `ids` removes, or an error naming what still depends on
 * them. A recipe that stays may keep a retired recipe as its style reference
 * only as history: its accepted record must already hold the reference's
 * hash, and its postprocess must not read the reference again.
 */
export function planRetirement(
  source: RetirableSource,
  generated: RetirableGenerated,
  ids: readonly string[],
  reason: string,
): RetirementPlan {
  if (ids.length === 0) throw new Error("Name at least one recipe to retire");
  if (reason.trim().length === 0)
    throw new Error("A retirement needs a reason");
  const leaving = new Set(ids);
  if (leaving.size !== ids.length)
    throw new Error("A recipe is named twice in the retirement");
  const byId = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
  for (const id of ids)
    if (!byId.has(id)) throw new Error(`Unknown recipe ${id}`);
  for (const alias of source.aliases ?? [])
    if (leaving.has(alias.source))
      throw new Error(
        `Alias ${alias.id} still points at ${alias.source}; remove the alias first`,
      );
  const staying = source.recipes.filter((recipe) => !leaving.has(recipe.id));
  const frozen: string[] = [];
  for (const recipe of staying) {
    for (const name of ["groundReference", "reframeGroundReference"] as const) {
      const reference = recipe[name];
      if (reference !== undefined && leaving.has(reference))
        throw new Error(
          `${recipe.id} still composes ${reference} as its ${name}; retire it too`,
        );
    }
    const reference = recipe.styleReference;
    if (reference === undefined || !leaving.has(reference)) continue;
    const problem = frozenStyleReferenceProblem(
      recipe,
      generated.records[recipe.id],
    );
    if (problem !== null) throw new Error(problem);
    frozen.push(recipe.id);
  }
  const stayingText = JSON.stringify({
    recipes: staying,
    records: Object.fromEntries(
      Object.entries(generated.records).filter(([id]) => !leaving.has(id)),
    ),
  });
  const files = new Set<string>();
  const jobIds = new Set<string>();
  const retired: RetiredRecipe[] = [];
  for (const id of ids) {
    const recipe = byId.get(id);
    if (recipe === undefined) throw new Error(`Unknown recipe ${id}`);
    const record = generated.records[id];
    files.add(recipe.output);
    for (const owned of [
      recipe.reframeSource,
      recipe.historicalStyleReference?.path,
    ])
      if (owned !== undefined) files.add(owned);
    for (const attempt of [record, ...(record?.rejectedAttempts ?? [])]) {
      if (attempt?.candidate !== undefined) files.add(attempt.candidate);
      if (attempt?.jobId !== undefined) jobIds.add(attempt.jobId);
    }
    retired.push({
      id,
      class: recipe.class,
      output: recipe.output,
      ...(record?.status === "ACCEPTED" && record.outputSha256 !== undefined
        ? { outputSha256: record.outputSha256 }
        : {}),
      reason,
    });
  }
  return {
    retired,
    // A file a staying recipe or record still names is not this one's to take.
    files: [...files]
      .filter((file) => !stayingText.includes(JSON.stringify(file)))
      .sort(),
    jobIds: [...jobIds]
      .filter((jobId) => !stayingText.includes(JSON.stringify(jobId)))
      .sort(),
    frozen,
  };
}

function frozenStyleReferenceProblem(
  recipe: RetirableRecipe,
  record: RetirableRecord | undefined,
): string | null {
  const reference = recipe.styleReference;
  if (
    recipe.postprocess !== undefined &&
    REFERENCE_READING_POSTPROCESSES.has(recipe.postprocess)
  )
    return `${recipe.id} reads the raster of ${reference} (${recipe.postprocess}); retire it too`;
  const recorded = record?.request?.styleReference;
  if (
    record?.status !== "ACCEPTED" ||
    recorded === undefined ||
    recorded.id !== reference ||
    recorded.sha256 === undefined ||
    !SHA256.test(recorded.sha256)
  )
    return `${recipe.id} has no accepted record holding the hash of its style reference ${reference}`;
  return null;
}

/**
 * Problems with the manifest's `retired` list and with the recipes that
 * still name a retired style reference. Empty when the manifest is sound.
 */
export function retirementProblems(
  source: RetirableSource,
  generated: RetirableGenerated,
): string[] {
  const problems: string[] = [];
  const live = new Set(source.recipes.map((recipe) => recipe.id));
  const liveOutputs = new Set(source.recipes.map((recipe) => recipe.output));
  const aliases = new Set((source.aliases ?? []).map((alias) => alias.id));
  const retired = new Map<string, RetiredRecipe>();
  for (const entry of source.retired ?? []) {
    if (retired.has(entry.id))
      problems.push(`Retired recipe listed twice: ${entry.id}`);
    retired.set(entry.id, entry);
    if (live.has(entry.id) || aliases.has(entry.id))
      problems.push(`Retired recipe id is in use again: ${entry.id}`);
    if (liveOutputs.has(entry.output))
      problems.push(`Retired output is in use again: ${entry.output}`);
    if (!entry.output.startsWith("public/assets/pixellab/"))
      problems.push(`Retired output is outside the art folder: ${entry.id}`);
    if (entry.outputSha256 !== undefined && !SHA256.test(entry.outputSha256))
      problems.push(`Retired recipe has a malformed hash: ${entry.id}`);
    if (entry.reason.trim().length === 0)
      problems.push(`Retired recipe has no reason: ${entry.id}`);
    if (generated.records[entry.id] !== undefined)
      problems.push(`Retired recipe still has a record: ${entry.id}`);
  }
  for (const recipe of source.recipes) {
    for (const name of ["groundReference", "reframeGroundReference"] as const) {
      const reference = recipe[name];
      if (reference !== undefined && retired.has(reference))
        problems.push(`${recipe.id} composes the retired ${reference}`);
    }
    const reference = recipe.styleReference;
    if (reference === undefined || !retired.has(reference)) continue;
    const problem = frozenStyleReferenceProblem(
      recipe,
      generated.records[recipe.id],
    );
    if (problem !== null) problems.push(problem);
  }
  return problems;
}

/** True when the recipe's style reference is retired: it cannot be redrawn. */
export function frozenByRetirement(
  source: RetirableSource,
  recipe: RetirableRecipe,
): boolean {
  return (
    recipe.styleReference !== undefined &&
    (source.retired ?? []).some((entry) => entry.id === recipe.styleReference)
  );
}

/** The file name of a job's submission receipt (see pixellab-recovery.ts). */
export function submissionReceiptName(jobId: string): string {
  return `${createHash("sha256").update(jobId).digest("hex")}.json`;
}

interface ArraySpan {
  /** Index of the opening bracket. */
  readonly open: number;
  /** Index just past the closing bracket. */
  readonly close: number;
  readonly elements: readonly string[];
}

/**
 * The top-level array `key` of a JSON object's text, with each element's
 * exact text. The manifest is edited as text so the recipes that stay keep
 * every byte of their hand-kept layout.
 */
function topLevelArray(text: string, key: string): ArraySpan | null {
  let depth = 0;
  let inString = false;
  let stringStart = -1;
  let lastKey: string | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') {
        inString = false;
        if (depth === 1)
          lastKey = JSON.parse(text.slice(stringStart, index + 1)) as string;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      stringStart = index;
    } else if (char === "[" && depth === 1 && lastKey === key) {
      return readArray(text, index);
    } else if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") depth -= 1;
    else if (char === "," && depth === 1) lastKey = null;
  }
  return null;
}

function readArray(text: string, open: number): ArraySpan {
  const elements: string[] = [];
  let depth = 0;
  let inString = false;
  let start = open + 1;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        const last = text.slice(start, index).trim();
        if (last.length > 0) elements.push(last);
        return { open, close: index + 1, elements };
      }
    } else if (char === "," && depth === 1) {
      elements.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  throw new Error("Unterminated JSON array in the source manifest");
}

function arrayText(elements: readonly string[]): string {
  return elements.length === 0
    ? "[]"
    : `[\n    ${elements.join(",\n    ")}\n  ]`;
}

/**
 * The source manifest's text without the retired recipes and with them
 * appended to `retired`. Every recipe that stays keeps its exact text; the
 * caller formats the result.
 */
export function retireFromManifestText(
  text: string,
  retired: readonly RetiredRecipe[],
): string {
  const leaving = new Set(retired.map((entry) => entry.id));
  const recipes = topLevelArray(text, "recipes");
  if (recipes === null) throw new Error("Source manifest has no recipes");
  const staying = recipes.elements.filter(
    (element) => !leaving.has((JSON.parse(element) as { id: string }).id),
  );
  if (recipes.elements.length - staying.length !== leaving.size)
    throw new Error("A retired recipe is missing from the source manifest");
  const withoutRecipes =
    text.slice(0, recipes.open) +
    arrayText(staying) +
    text.slice(recipes.close);
  const additions = retired.map((entry) =>
    JSON.stringify(entry, null, 2).replaceAll("\n", "\n    "),
  );
  const existing = topLevelArray(withoutRecipes, "retired");
  if (existing !== null)
    return (
      withoutRecipes.slice(0, existing.open) +
      arrayText([...existing.elements, ...additions]) +
      withoutRecipes.slice(existing.close)
    );
  const anchor = topLevelArray(withoutRecipes, "recipes");
  if (anchor === null) throw new Error("Source manifest has no recipes");
  const keyStart = withoutRecipes.lastIndexOf('"recipes"', anchor.open);
  return (
    withoutRecipes.slice(0, keyStart) +
    `"retired": ${arrayText(additions)},\n  ` +
    withoutRecipes.slice(keyStart)
  );
}
