import {
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  arePlayersHostileV7,
  blastAreaV7,
  effectiveRoleRuleV7,
  unitFactionV7,
  roleMechanicsV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CoordV7,
  type ExplosionChainPreviewV7,
  type FactionIdV7,
  type KaboomPreviewV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicGoblinMechanicsV7,
  type TechnologyIdV7,
  isNavalRoleV7,
  type UnitRoleIdV7,
} from "../engine/index";

/**
 * Presentation helpers for revision 17 Goblins (spec section 11). Every
 * helper reads only public views, public previews, and projected player
 * events. A match without a Goblin seat never reaches a code path that
 * changes its revision-16 presentation.
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when a seat of the match plays the Goblin faction. */
export function matchHasGoblinV7(view: Pick<PlayerViewV7, "players">): boolean {
  return view.players.some((player) => player.faction === "GOBLIN");
}

/** Whether a visible unit is of the Goblin kind (`unitFactionV7`). */
export function unitIsGoblinV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "GOBLIN";
}

/** Section 11.2 texts. */
export const KABOOM_LABEL_V7 = "Kaboom!";
export const RAM_LABEL_V7 = "Ram";
export const WAAAGH_LABEL_V7 = "WAAAGH!";
export const FOG_NOTE_V7 = "The blast may reach unexplored tiles";
export const BITTEN_KABOOM_WARNING_V7 =
  "Bitten: this unit will rise as an enemy Zombie";
export const GOBLIN_FIELD_DEFENSE_EXPLANATION_V7 =
  "Goblins cannot build Field Defense; use an Orc Brute";
export const GANG_UP_DESCRIPTION_V7 =
  "+1 Attack per ally next to the target (max +2)";

export function kaboomTooltipV7(damage: number): string {
  return `Blow up: ${damage} damage to every other unit in the 3×3 square, yours too. This unit dies.`;
}

/** Section 11.3: one sentence per rule, shown in Help in Goblin matches. */
export const GOBLIN_HELP_RULES_V7: readonly (readonly [string, string])[] = [
  [
    "Horde",
    "Goblins cost 1 Coin, and every Goblin city holds one extra unit (Warrens).",
  ],
  [
    "Gang Up",
    "a Goblin unit gets +1 Attack for each other unit of yours next to its target, up to +2.",
  ],
  [
    "Kaboom",
    "any goblin-crewed unit can blow itself up, dealing its blast damage to every other unit in the 3×3 square around it, yours included.",
  ],
  [
    "Death blasts",
    "Bomb Chuckers, Rocket Carts, and Scrap Buggies explode when they die, however they die.",
  ],
  ["Chain reactions", "a blast that kills an exploding unit sets it off too."],
  [
    "Bombs",
    "a Bomb Chucker's bomb also hits every unit next to its target, yours included.",
  ],
  [
    "Plunder",
    "with Plunder you get 1 Coin for each enemy unit your units or blasts kill.",
  ],
  [
    "WAAAGH!",
    "the Orc Warboss gives every other unit of yours on land within 2 tiles +1 Attack on its next attack this turn.",
  ],
  ["Trolls", "heal 4 HP at the start of your turn, wherever they are."],
  [
    "Discipline",
    "only Orc Brutes can build Field Defense, and no Goblin unit can heal others.",
  ],
];

/**
 * A technology's name for a viewer of `faction` (section 4): the faction's
 * display-name override (Goblin Commerce is Plunder), otherwise the
 * revision-16 sentence-case name, so other viewers read exactly as before.
 */
export function technologyNameV7(
  tech: TechnologyIdV7,
  faction: FactionIdV7,
): string {
  return (
    TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7[faction][tech] ??
    tech
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

/** Goblin ability names; Human and Undead names are unchanged. */
export function goblinAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "GOBLIN") return null;
  switch (ability) {
    case "RALLY":
      return WAAAGH_LABEL_V7;
    case "OVERRUN":
      return RAM_LABEL_V7;
    case "KABOOM":
      return KABOOM_LABEL_V7;
    case "REGENERATE":
      return "Regenerate";
    default:
      return null;
  }
}

export function goblinAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "GOBLIN") return null;
  switch (ability) {
    case "RALLY":
      return "Every other unit of yours on land within 2 tiles gets +1 Attack on its next attack this turn.";
    case "OVERRUN":
      return "After a kill, rams forward and can attack another adjacent enemy.";
    default:
      return null;
  }
}

/** Goblin command labels: Kaboom!, and WAAAGH! for the Warboss's Rally. */
export function goblinCommandLabelV7(
  kind: string,
  faction: FactionIdV7,
): string | null {
  if (kind === "KABOOM") return KABOOM_LABEL_V7;
  if (kind === "RALLY" && faction === "GOBLIN") return WAAAGH_LABEL_V7;
  return null;
}

/** One line of Goblin unit information (section 11.2 "Unit info"). */
export interface GoblinUnitInfoLineV7 {
  readonly id:
    | "kaboom"
    | "death-blast"
    | "regenerate"
    | "gang-up"
    | "bombs"
    | "waaagh"
    | "no-field-defense";
  readonly name: string;
  readonly description: string;
}

/**
 * Unit info lines from the public Goblin mechanics (`stats.goblin`) of a
 * Goblin role. Boats get no Goblin rule.
 */
export function goblinUnitInfoLinesV7(
  role: UnitRoleIdV7,
  mechanics: PublicGoblinMechanicsV7,
  splashAll: boolean,
): readonly GoblinUnitInfoLineV7[] {
  if (isNavalRoleV7(role)) return [];
  const lines: GoblinUnitInfoLineV7[] = [];
  if (mechanics.kaboomDamage !== null)
    lines.push({
      id: "kaboom",
      name: `Kaboom ${mechanics.kaboomDamage}`,
      description: kaboomTooltipV7(mechanics.kaboomDamage),
    });
  if (mechanics.deathBlastDamage !== null)
    lines.push({
      id: "death-blast",
      name: `Explodes on death (${mechanics.deathBlastDamage})`,
      description: `However it dies, it deals ${mechanics.deathBlastDamage} damage to every other unit in the 3×3 square, yours too.`,
    });
  if (splashAll)
    lines.push({
      id: "bombs",
      name: "Bombs",
      description:
        "Its bomb also hits every unit next to the target, yours included.",
    });
  if (mechanics.regeneration > 0)
    lines.push({
      id: "regenerate",
      name: `Regenerates ${mechanics.regeneration} HP each turn`,
      description: "It heals at the start of your turn, wherever it is.",
    });
  lines.push({
    id: "gang-up",
    name: "Gang Up",
    description: GANG_UP_DESCRIPTION_V7,
  });
  if (role === "FIGHTER" && !mechanics.buildsFieldDefense)
    lines.push({
      id: "no-field-defense",
      name: "No Field Defense",
      description: GOBLIN_FIELD_DEFENSE_EXPLANATION_V7,
    });
  return lines;
}

/** Recruit-help notes of a Goblin role, from its registration. */
export function goblinRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  if (faction !== "GOBLIN") return [];
  const mechanics = roleMechanicsV7(role, faction);
  return goblinUnitInfoLinesV7(
    role,
    {
      kaboomDamage: mechanics.kaboomDamage,
      deathBlastDamage: mechanics.deathBlastDamage,
      rallyRadius: mechanics.rallyRadius,
      regeneration: mechanics.regeneration,
      buildsFieldDefense: mechanics.buildsFieldDefense,
    },
    mechanics.splash && mechanics.splashTargets === "ALL",
  ).map((line) =>
    line.id === "gang-up"
      ? `Gang Up: ${line.description}`
      : `${line.name}: ${line.description}`,
  );
}

const FIELD_DEFENSE_BLOCK_CACHE = new WeakMap<PlayerViewV7, Set<number>>();

/**
 * Section 11.1: an own Goblin (`FIGHTER`) where a Human Fighter would be
 * offered Build Field Defense (Fortification, own territory land tile, not
 * moved, primary action unused, no Field Defense yet, 3 Coins).
 */
export function goblinFieldDefenseBlockedV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (
    unit === undefined ||
    unit.ownerId !== view.viewer.id ||
    view.viewer.faction !== "GOBLIN" ||
    unit.role !== "FIGHTER" ||
    unit.form !== "LAND"
  )
    return false;
  let cached = FIELD_DEFENSE_BLOCK_CACHE.get(view);
  if (cached === undefined) {
    cached = new Set(
      view.units
        .filter((candidate) => {
          const activation = candidate.activation;
          const tile = view.board.tiles.find(
            (item) =>
              item.at.x === candidate.at.x && item.at.y === candidate.at.y,
          );
          return (
            candidate.ownerId === view.viewer.id &&
            candidate.role === "FIGHTER" &&
            candidate.form === "LAND" &&
            !activation.moved &&
            !activation.attacked &&
            !activation.recovered &&
            !activation.captured &&
            !activation.specialActed &&
            view.viewer.researchedTechs.includes("FORTIFICATION") &&
            tile?.explored === true &&
            tile.biome !== null &&
            tile.territoryOwnerId === view.viewer.id &&
            !tile.fieldDefense &&
            view.viewer.coins >= 3
          );
        })
        .map((candidate) => candidate.id),
    );
    FIELD_DEFENSE_BLOCK_CACHE.set(view, cached);
  }
  return cached.has(unitId);
}

/** "your" for the viewer, otherwise "Player N's". */
function possessive(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `Player ${player.seat + 1}'s`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function roleLabel(
  view: PlayerViewV7,
  ownerId: number,
  role: UnitRoleIdV7,
): string {
  const player = view.players.find((candidate) => candidate.id === ownerId);
  return effectiveRoleRuleV7(role, player?.faction ?? "ORIGINAL").label;
}

/** An explosion's unit as the viewer reads it: "your Rocket Cart". */
function explosionUnitName(
  view: PlayerViewV7,
  explosion: ExplosionChainPreviewV7["explosions"][number],
): string {
  return `${possessive(view, explosion.ownerId)} ${roleLabel(view, explosion.ownerId, explosion.role)}`;
}

/**
 * A short explosion unit name for the board's attack warnings, which must
 * fit a phone: "your Rocket Cart", "allied …" or "enemy Bomb Chucker".
 */
function explosionSideName(
  view: PlayerViewV7,
  explosion: ExplosionChainPreviewV7["explosions"][number],
): string {
  const label = roleLabel(view, explosion.ownerId, explosion.role);
  if (explosion.ownerId === view.viewer.id) return `your ${label}`;
  return arePlayersHostileV7(view, view.viewer.id, explosion.ownerId)
    ? `enemy ${label}`
    : `allied ${label}`;
}

function hitKey(result: {
  readonly unitId: number | null;
  readonly at: CoordV7;
}): string {
  return result.unitId === null
    ? `rising:${result.at.x},${result.at.y}`
    : `unit:${result.unitId}`;
}

/** Distinct units a previewed chain hits, split by side. */
function chainHits(chain: ExplosionChainPreviewV7): {
  readonly hostile: number;
  readonly friendly: number;
} {
  const sides = new Map<string, boolean>();
  for (const explosion of chain.explosions)
    for (const result of explosion.results)
      sides.set(hitKey(result), result.friendly);
  const friendly = [...sides.values()].filter(Boolean).length;
  return { hostile: sides.size - friendly, friendly };
}

/** The dock text of a Kaboom preview (sections 11.1 and 11.2). */
export interface KaboomPreviewTextV7 {
  /** "Hits {n} units: {h} enemy, {f} yours. Kills {k}." */
  readonly summary: string;
  readonly chain: readonly string[];
  readonly friendlyFire: string | null;
  readonly plunder: string | null;
  readonly fieldDefense: string | null;
  readonly fog: string | null;
  readonly bitten: string | null;
  /** Short button chip, e.g. "3 hit · 1 ✕". */
  readonly chip: string;
  /** Warning chip when friendly units are hit, e.g. "2 yours hit". */
  readonly friendlyChip: string | null;
  /** Full sentence for the button's accessible name. */
  readonly description: string;
}

export function kaboomPreviewTextV7(
  view: PlayerViewV7,
  preview: KaboomPreviewV7,
): KaboomPreviewTextV7 {
  const hits = chainHits(preview);
  const kills = preview.totals.hostileKills + preview.totals.friendlyKills;
  const total = hits.hostile + hits.friendly;
  const summary = `Hits ${total} ${total === 1 ? "unit" : "units"}: ${hits.hostile} enemy, ${hits.friendly} yours. Kills ${kills}.`;
  const chain = preview.explosions
    .filter((explosion) => explosion.unitId !== preview.unitId)
    .map(
      (explosion) =>
        `Chain reaction: ${explosionUnitName(view, explosion)} explodes (${explosion.damage} damage)`,
    );
  const friendlyFire = preview.friendlyFire
    ? `Friendly fire: ${hits.friendly} of your units hit, ${preview.totals.friendlyKills} killed`
    : null;
  const plunder =
    preview.totals.plunderCoins > 0
      ? `Plunder: +${preview.totals.plunderCoins} Coins`
      : null;
  const fieldDefenseTiles = new Set(
    preview.explosions.flatMap((explosion) =>
      explosion.fieldDefenseDestroyed.map((at) => `${at.x},${at.y}`),
    ),
  ).size;
  const fieldDefense =
    fieldDefenseTiles === 0
      ? null
      : `Destroys Field Defense on ${fieldDefenseTiles} ${fieldDefenseTiles === 1 ? "tile" : "tiles"}`;
  const fog = preview.touchesUnexplored ? FOG_NOTE_V7 : null;
  const bitten = view.bitten.some((entry) => entry.unitId === preview.unitId)
    ? BITTEN_KABOOM_WARNING_V7
    : null;
  const chip = [`${total} hit`, ...(kills > 0 ? [`${kills} ✕`] : [])].join(
    " · ",
  );
  const friendlyChip = hits.friendly > 0 ? `${hits.friendly} yours hit` : null;
  const description = [
    summary,
    ...chain.map((line) => `${line}.`),
    ...(friendlyFire === null ? [] : [`${friendlyFire}.`]),
    ...(plunder === null ? [] : [`${plunder}.`]),
    ...(fieldDefense === null ? [] : [`${fieldDefense}.`]),
    ...(bitten === null ? [] : [`${bitten}.`]),
    ...(fog === null ? [] : [`${fog}.`]),
  ].join(" ");
  return {
    summary,
    chain,
    friendlyFire,
    plunder,
    fieldDefense,
    fog,
    bitten,
    chip,
    friendlyChip,
    description,
  };
}

/** One labelled cell of a board blast preview. */
export interface BlastCellPresentationV7 {
  readonly at: CoordV7;
  readonly label: string;
  readonly lethal: boolean;
  /** An own or allied unit is hit here (friendly fire). */
  readonly friendly: boolean;
}

/** The board blast preview of a previewed chain. */
export interface BlastPreviewPresentationV7 {
  /** Every explored cell of every blast area, deduplicated, in (y, x). */
  readonly area: readonly CoordV7[];
  /** Blast centres with their wave (1 = the first blast). */
  readonly sources: readonly {
    readonly at: CoordV7;
    readonly wave: number;
  }[];
  readonly cells: readonly BlastCellPresentationV7[];
}

/**
 * Board cells of a previewed chain: the union of the blast areas, and one
 * label per hit cell: `−N` (summed over the chain), `Yours`/`Ally` for
 * friendly fire, `Zombie` for a rising (a null unit ID), and `Wave N` on a
 * unit that explodes in a later wave. `kaboomUnitId` labels its cell
 * `Kaboom!`; an attack's own `attackerId` reads `Attacker` (it may have
 * advanced onto the exploding unit's tile).
 */
export function blastPreviewPresentationV7(
  view: PlayerViewV7,
  chain: ExplosionChainPreviewV7,
  kaboomUnitId: number | null,
  attackerId: number | null = null,
): BlastPreviewPresentationV7 {
  const explored = new Set(
    view.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  const areaKeys = new Map<string, CoordV7>();
  for (const explosion of chain.explosions)
    for (const at of blastAreaV7(
      explosion.at,
      view.board.width,
      view.board.height,
    ))
      if (explored.has(`${at.x},${at.y}`)) areaKeys.set(`${at.x},${at.y}`, at);
  const area = [...areaKeys.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  const waveByUnit = new Map<number, number>();
  for (const explosion of chain.explosions)
    waveByUnit.set(explosion.unitId, explosion.wave);
  interface CellParts {
    at: CoordV7;
    kaboom: boolean;
    parts: string[];
    lethal: boolean;
    friendly: boolean;
  }
  const cells = new Map<string, CellParts>();
  const cellAt = (at: CoordV7): CellParts => {
    const key = `${at.x},${at.y}`;
    let cell = cells.get(key);
    if (cell === undefined) {
      cell = { at, kaboom: false, parts: [], lethal: false, friendly: false };
      cells.set(key, cell);
    }
    return cell;
  };
  const hits = new Map<
    string,
    {
      at: CoordV7;
      unitId: number | null;
      ownerId: number;
      damage: number;
      dies: boolean;
      friendly: boolean;
    }
  >();
  for (const explosion of chain.explosions)
    for (const result of explosion.results) {
      const key = hitKey(result);
      const prior = hits.get(key);
      hits.set(key, {
        at: result.at,
        unitId: result.unitId,
        ownerId: result.ownerId,
        damage: (prior?.damage ?? 0) + result.damage,
        dies: (prior?.dies ?? false) || result.dies,
        friendly: result.friendly,
      });
    }
  if (kaboomUnitId !== null) {
    const exploder = view.units.find((unit) => unit.id === kaboomUnitId);
    if (exploder !== undefined) {
      const cell = cellAt(exploder.at);
      cell.kaboom = true;
      cell.lethal = true;
    }
  }
  for (const hit of hits.values()) {
    const cell = cellAt(hit.at);
    const who =
      hit.unitId === null
        ? "Zombie "
        : hit.unitId === attackerId
          ? "Attacker "
          : hit.friendly
            ? hit.ownerId === view.viewer.id
              ? "Yours "
              : "Ally "
            : "";
    const wave = hit.unitId === null ? undefined : waveByUnit.get(hit.unitId);
    cell.parts.push(
      `${who}−${hit.damage}${wave === undefined ? "" : ` · Wave ${wave}`}`,
    );
    cell.lethal ||= hit.dies;
    cell.friendly ||= hit.friendly;
  }
  return {
    area,
    sources: chain.explosions.map((explosion) => ({
      at: explosion.at,
      wave: explosion.wave,
    })),
    cells: [...cells.values()]
      .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x)
      .map((cell) => ({
        at: cell.at,
        label: [...(cell.kaboom ? [KABOOM_LABEL_V7] : []), ...cell.parts].join(
          " · ",
        ),
        lethal: cell.lethal,
        friendly: cell.friendly,
      })),
  };
}

/** Attack-preview lines of a revision-17 attack (section 11.2). */
export interface GoblinAttackPreviewTextV7 {
  /** "Gang Up +N", or null. */
  readonly gangUp: string | null;
  /** Death-blast, chain, bomb-splash and friendly-fire warnings. */
  readonly warnings: readonly string[];
  /**
   * The warnings in a few words ("Chain: 2 blasts · 3 yours hit"), for a
   * crowded board where the full warning stack does not fit
   * (bead pulp_wars-0ao.12); null without warnings.
   */
  readonly summary: string | null;
  /** Screen-reader sentence of the same content, or null. */
  readonly semantic: string | null;
}

export function goblinAttackPreviewTextV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
  chain: ExplosionChainPreviewV7 | null,
): GoblinAttackPreviewTextV7 {
  const gangUp = preview.gangUp > 0 ? `Gang Up +${preview.gangUp}` : null;
  const warnings: string[] = [];
  const summary: string[] = [];
  const attacker = view.units.find((unit) => unit.id === preview.attackerId);
  for (const splash of preview.splash) {
    const unit = view.units.find((candidate) => candidate.id === splash.unitId);
    if (
      unit === undefined ||
      attacker === undefined ||
      arePlayersHostileV7(view, attacker.ownerId, unit.ownerId) ||
      unit.ownerId !== view.viewer.id
    )
      continue;
    warnings.push(
      `Bomb splash hits your ${unitRoleRuleV7(view, unit).label}${splash.dies ? " (dies)" : ""}`,
    );
    summary.push(
      `Bomb ${splash.dies ? "kills" : "hits"} your ${unitRoleRuleV7(view, unit).label}`,
    );
  }
  const explosions = chain?.explosions.length ?? 0;
  if (explosions > 0)
    summary.push(
      explosions === 1 ? "Explodes on death" : `Chain: ${explosions} blasts`,
    );
  for (const explosion of chain?.explosions ?? [])
    warnings.push(
      explosion.wave === 1
        ? `${capitalized(explosionSideName(view, explosion))} explodes on death: ${explosion.damage} damage around it`
        : `Chain reaction: ${explosionSideName(view, explosion)} explodes (${explosion.damage} damage)`,
    );
  if (chain?.friendlyFire === true) {
    const hits = chainHits(chain);
    // Friendly fire when a blast of your own sets it off; otherwise an
    // enemy's death blast hits your units.
    const own = chain.explosions.some(
      (explosion) => explosion.ownerId === view.viewer.id,
    );
    warnings.push(
      own
        ? `Friendly fire: ${hits.friendly} of your units hit, ${chain.totals.friendlyKills} killed`
        : `Blasts hit ${hits.friendly} of your units, ${chain.totals.friendlyKills} killed`,
    );
    const kills = chain.totals.friendlyKills;
    summary.push(
      `${own ? "Friendly fire: " : ""}${hits.friendly} yours hit${kills > 0 ? `, ${kills} killed` : ""}`,
    );
  }
  if (chain !== null && chain.totals.plunderCoins > 0) {
    warnings.push(`Plunder: +${chain.totals.plunderCoins} Coins`);
    summary.push(`Plunder +${chain.totals.plunderCoins}`);
  }
  if (
    chain !== null &&
    chain.explosions.length > 0 &&
    chain.touchesUnexplored
  ) {
    warnings.push(FOG_NOTE_V7);
    summary.push("May reach fog");
  }
  const semantic = [
    ...(gangUp === null
      ? []
      : [
          `Gang Up adds ${preview.gangUp} Attack from your units next to the target.`,
        ]),
    ...warnings.map((line) => `${line}.`),
  ].join(" ");
  return {
    gangUp,
    warnings,
    summary: summary.length === 0 ? null : summary.join(" · "),
    semantic: semantic === "" ? null : semantic,
  };
}

/**
 * Whether an attack's splash entry hits a friendly (own or allied) unit:
 * only a Goblin Bomb Chucker's bomb can.
 */
export function splashEntryFriendlyV7(
  view: PlayerViewV7,
  attackerOwnerId: PublicUnitV7["ownerId"],
  unitId: number,
): boolean {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  return (
    unit !== undefined &&
    !arePlayersHostileV7(view, attackerOwnerId, unit.ownerId)
  );
}

/**
 * Log and toast text for revision-17 events of one projected boundary
 * (section 11.2): explosions, Plunder, Troll regeneration and WAAAGH!.
 * A match without a Goblin seat never emits these events, so its notices
 * are unchanged.
 */
export function goblinBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  if (!matchHasGoblinV7(after)) return null;
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  let toast = false;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    after.units.find((unit) => unit.id === id) ??
    before.units.find((unit) => unit.id === id);
  for (const event of events) {
    if (event.kind === "EXPLOSION_RESOLVED") {
      toast = true;
      const kills = event.results.filter((result) => result.dies).length;
      // Tuning 3 (`pulp_wars-w49.3`): a Blast Mountain names no unit.
      const name = capitalized(
        event.cause === "BLAST"
          ? `${possessive(after, event.playerId)} Mountain blast`
          : `${possessive(after, event.playerId)} ${roleLabel(after, event.playerId, event.role)}`,
      );
      parts.push(
        `${name}${event.cause === "KABOOM" ? " blew up" : event.cause === "DEATH" ? " exploded" : ""}: ${event.results.length} hit, ${kills} killed`,
      );
    } else if (event.kind === "PLUNDER_AWARDED") {
      if (event.playerId !== viewerId) continue;
      toast = true;
      parts.push(`Plunder: +${event.coins} Coins`);
    } else if (event.kind === "UNITS_REGENERATED") {
      if (event.playerId === viewerId) toast = true;
      for (const result of event.results) {
        const unit = unitById(result.unitId);
        const label =
          unit === undefined ? "Troll" : unitRoleRuleV7(after, unit).label;
        parts.push(
          `${capitalized(possessive(after, event.playerId))} ${label} regenerated ${result.amount} HP`,
        );
      }
    } else if (event.kind === "UNITS_RALLIED") {
      const captain = unitById(event.captainId);
      if (captain === undefined || !unitIsGoblinV7(after, captain)) continue;
      toast = true;
      const count = event.unitIds.length;
      parts.push(
        `${capitalized(possessive(after, captain.ownerId))} ${unitRoleRuleV7(after, captain).label}: WAAAGH! +1 Attack for ${count} ${count === 1 ? "unit" : "units"}`,
      );
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
