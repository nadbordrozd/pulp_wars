/**
 * The Goblin faction pass (`pulp_wars-w49.12`,
 * docs/product/RULESET_7_TUNING_GOBLIN.md): deterministic unit-level numbers
 * from the engine's exact public combat preview on constructed positions,
 * small played-out scenarios resolved by the reducer, and the Goblin
 * technology and price lists. It plays no match and draws no conclusion; the
 * document does.
 *
 *   npx tsx scripts/goblin-tuning-analysis-v7.ts            (everything)
 *   npx tsx scripts/goblin-tuning-analysis-v7.ts matrix     (one part:
 *     matrix | rocket | reverse | blasts | scenarios | technology | prices)
 *
 * Output is Markdown on stdout.
 */
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  cityUnitCapacityForV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  hireCostV7,
  playerTechnologyResearchCostV7,
  queryCombatPreviewV7,
  resolveCityGrowthV7,
  roleMechanicsV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../src/engine/index";
import {
  goblinArenaV7,
  type GoblinPieceV7,
} from "../tests/fixtures/v7-goblin-arena";

interface KindV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  /** A Wolf Rider or Raider that moved two tiles (Charge with Raiding). */
  readonly charging?: boolean;
}

const GOBLIN_ROLES: readonly UnitRoleIdV7[] = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
];
const HUMAN_ROLES: readonly UnitRoleIdV7[] = [
  "FIGHTER",
  "GUARD",
  "RAIDER",
  "MARKSMAN",
  "CAPTAIN",
  "SWORDSMAN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
];
const GOBLINS: readonly KindV7[] = GOBLIN_ROLES.map((role) => ({
  faction: "GOBLIN",
  role,
}));
const HUMANS: readonly KindV7[] = HUMAN_ROLES.map((role) => ({
  faction: "ORIGINAL",
  role,
}));
const GOBLIN_ATTACKERS: readonly KindV7[] = [
  GOBLINS[0] as KindV7,
  GOBLINS[1] as KindV7,
  { faction: "GOBLIN", role: "RAIDER", charging: true },
  ...GOBLINS.slice(2),
];
const HUMAN_ATTACKERS: readonly KindV7[] = [
  ...HUMANS.slice(0, 3),
  { faction: "ORIGINAL", role: "RAIDER", charging: true },
  ...HUMANS.slice(3),
];

const rule = (kind: KindV7) => effectiveRoleRuleV7(kind.role, kind.faction);
const name = (kind: KindV7): string =>
  `${rule(kind).label}${kind.charging === true ? " (Charge)" : ""}`;
const half = (value2: number): string => String(value2 / 2);
const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

type TerrainV7 = "OPEN" | "FOREST" | "FIELD_DEFENSE" | "WALLS";
const CONTEXTS: readonly {
  readonly title: string;
  readonly terrain: TerrainV7;
}[] = [
  { title: "Open ground", terrain: "OPEN" },
  {
    title:
      "Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)",
    terrain: "FOREST",
  },
  {
    title: "Field Defense (+2 Defense), the attacker without Explosives",
    terrain: "FIELD_DEFENSE",
  },
  {
    title: "Walled city center (+2 Defense), the attacker without Explosives",
    terrain: "WALLS",
  },
];

/** Every land technology of `faction` except the listed ones and what needs them. */
const without = (
  faction: FactionIdV7,
  ...excluded: TechnologyIdV7[]
): readonly TechnologyIdV7[] => {
  const removed = new Set<TechnologyIdV7>(excluded);
  const nodes = factionTreeV7(faction).nodes;
  for (let changed = true; changed;) {
    changed = false;
    for (const node of nodes)
      if (
        !removed.has(node.id) &&
        node.prerequisites.some((id) => removed.has(id))
      ) {
        removed.add(node.id);
        changed = true;
      }
  }
  return TECHNOLOGY_IDS_V7.filter(
    (id) =>
      !removed.has(id) &&
      nodes.some((node) => node.id === id && node.branch !== "NAVAL"),
  );
};

interface GroundV7 {
  readonly forest?: readonly CoordV7[];
  readonly fieldDefense?: readonly CoordV7[];
  /** Seat 1's capital at (2, 8) has City Walls. */
  readonly walls?: boolean;
}

/** The three Farm tiles that grow seat 1's capital to level 3 for Walls. */
const WALL_FARMS: readonly CoordV7[] = [
  { x: 1, y: 9 },
  { x: 2, y: 9 },
  { x: 3, y: 9 },
];

/**
 * The two-seat arena (seat 0 capital (8, 8), seat 1 capital (2, 8) with
 * territory x 1-3, y 7-9) with every other land tile open Grass, the given
 * pieces, and the given ground. Neither seat has Explosives (no Breach).
 * With `walls`, seat 1's capital is a level-3 city (three Farms south of
 * it) that took Walls.
 */
function arena(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly GoblinPieceV7[],
  ground: GroundV7 = {},
  activeSeat = 0,
): GameStateV7 {
  const base = goblinArenaV7(factions, pieces, {
    activeSeat,
    techs: {
      0: without(factions[0], "EXPLOSIVES"),
      1: without(factions[1], "EXPLOSIVES"),
    },
  });
  const seatOne = base.players.find((player) => player.seat === 1);
  const walls = ground.walls === true;
  const farm = (where: CoordV7): boolean =>
    walls && WALL_FARMS.some((item) => same(item, where));
  return {
    ...base,
    nextEntityId: base.nextEntityId + (walls ? WALL_FARMS.length : 0),
    cities: base.cities.map((city) => {
      if (!walls || city.ownerId !== seatOne?.id) return city;
      const economicPopulation =
        city.economicPopulation + 2 * WALL_FARMS.length;
      return {
        ...resolveCityGrowthV7(
          city,
          city.permanentPopulation,
          economicPopulation,
        ).city,
        economicPopulation,
        rewards: [
          { reachedLevel: 2, reward: "SURVEY" as const },
          { reachedLevel: 3, reward: "WALLS" as const },
        ],
      };
    }),
    populationContributions: [
      ...base.populationContributions,
      ...(walls
        ? WALL_FARMS.map((where, index) => ({
            id: base.nextEntityId + index,
            cityId:
              base.cities.find((city) => city.ownerId === seatOne?.id)?.id ??
              (0 as never),
            category: "LIVE" as const,
            amount: 2,
            source: {
              kind: "IMPROVEMENT" as const,
              improvement: "FARM" as const,
              at: where,
            },
          }))
        : []),
    ],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const on = (list: readonly CoordV7[] | undefined): boolean =>
          list?.some((item) => same(item, tile.at)) === true;
        const flat =
          tile.site === null
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: farm(tile.at) ? ("FERTILE_GROUND" as const) : null,
                improvement: farm(tile.at) ? ("FARM" as const) : null,
                road: false,
                fieldDefense: false,
              }
            : tile;
        return on(ground.forest)
          ? { ...flat, terrain: "FOREST" as const, biome: "WOODLAND" as const }
          : on(ground.fieldDefense)
            ? { ...flat, fieldDefense: true }
            : flat;
      }),
    },
  };
}

const unitAt = (state: GameStateV7, where: CoordV7): UnitStateV7 => {
  const unit = state.units.find((candidate) => same(candidate.at, where));
  if (unit === undefined) throw new Error(`no unit at ${where.x},${where.y}`);
  return unit;
};

/**
 * One attack of the matrix: the target on its context tile, the attacker at
 * its full range (a melee unit next to it) on the same row or column,
 * `helpers` Goblins of the attacker's side next to the target, and WAAAGH!
 * (the Inspired flag) when `inspired`.
 */
function previewOf(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
  options: {
    readonly helpers?: number;
    readonly inspired?: boolean;
    readonly defenderHp?: number;
  } = {},
): CombatPreviewV7 | null {
  const attackerRule = rule(attacker);
  if (!attackerRule.abilities.includes("ATTACK")) return null;
  const distance = Math.max(attackerRule.minimumRange, attackerRule.range);
  // The open and Forest target stands at (5, 2), attacked along its row; the
  // Field Defense at (2, 7) and the walled center at (2, 8) are attacked
  // from the north.
  const to =
    terrain === "WALLS"
      ? at(2, 8)
      : terrain === "FIELD_DEFENSE"
        ? at(2, 7)
        : at(5, 2);
  const from =
    terrain === "WALLS" || terrain === "FIELD_DEFENSE"
      ? at(to.x, to.y - distance)
      : at(to.x + distance, to.y);
  const helperTiles =
    terrain === "WALLS"
      ? [at(1, 7), at(3, 7)]
      : terrain === "FIELD_DEFENSE"
        ? [at(1, 6), at(3, 6)]
        : [at(4, 1), at(4, 3)];
  const pieces: GoblinPieceV7[] = [
    {
      seat: 0,
      role: attacker.role,
      at: from,
      activation: {
        ...(attacker.charging === true
          ? { moved: true, movedPathLength: 2 }
          : {}),
        ...(options.inspired === true ? { inspired: true } : {}),
      },
    },
    {
      seat: 1,
      role: defender.role,
      at: to,
      ...(options.defenderHp === undefined ? {} : { hp: options.defenderHp }),
    },
    ...helperTiles
      .slice(0, options.helpers ?? 0)
      .filter((tile) => !same(tile, from))
      .map((tile) => ({ seat: 0, role: "FIGHTER" as const, at: tile })),
  ];
  const state = arena([attacker.faction, defender.faction], pieces, {
    ...(terrain === "FOREST" ? { forest: [to] } : {}),
    ...(terrain === "FIELD_DEFENSE" ? { fieldDefense: [to] } : {}),
    walls: terrain === "WALLS",
  });
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  return queryCombatPreviewV7(
    viewForV7(state, actor),
    unitAt(state, from).id,
    unitAt(state, to).id,
  );
}

/** Attacks by fresh full-HP attackers of the kind that kill the defender. */
function attacksToKill(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
  options: { readonly helpers?: number; readonly inspired?: boolean },
): string {
  let hp = rule(defender).maxHp;
  let hits = 0;
  while (hp > 0 && hits < 30) {
    const preview = previewOf(attacker, defender, terrain, {
      ...options,
      defenderHp: hp,
    });
    if (preview === null || preview.damageToDefender <= 0) break;
    hp -= preview.damageToDefender;
    hits += 1;
  }
  return hp > 0 ? "∞" : String(hits);
}

/**
 * A Goblin attacker's cell: `dealt/taken ×attacks` alone, then the damage
 * with two helpers next to the target (`g`), and with two helpers and
 * WAAAGH! (`gw`); `K` marks a kill of the full-HP defender.
 */
function goblinCell(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
): string {
  const plain = previewOf(attacker, defender, terrain);
  if (plain === null) return "—";
  const dealt = (preview: CombatPreviewV7 | null): string =>
    preview === null
      ? "—"
      : `${preview.damageToDefender}${preview.defenderDies ? "K" : ""}`;
  const ganged = previewOf(attacker, defender, terrain, { helpers: 2 });
  const both = previewOf(attacker, defender, terrain, {
    helpers: 2,
    inspired: true,
  });
  return `${dealt(plain)}/${plain.damageToAttacker} ×${attacksToKill(attacker, defender, terrain, {})}; g${ganged?.gangUp ?? 0} ${dealt(ganged)}; gw ${dealt(both)}`;
}

function plainCell(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
): string {
  const plain = previewOf(attacker, defender, terrain);
  if (plain === null) return "—";
  return `${plain.damageToDefender}${plain.defenderDies ? "K" : ""}/${plain.damageToAttacker} ×${attacksToKill(attacker, defender, terrain, {})}`;
}

function table(
  attackers: readonly KindV7[],
  defenders: readonly KindV7[],
  cell: (attacker: KindV7, defender: KindV7, terrain: TerrainV7) => string,
): string[] {
  const lines: string[] = [];
  const header = `| Attacker (cost, HP, Atk/Def) | ${defenders.map((kind) => `${name(kind)} ${rule(kind).cost ?? "—"}c ${rule(kind).maxHp}hp`).join(" | ")} |`;
  for (const context of CONTEXTS) {
    lines.push(`**${context.title}**`, "", header);
    lines.push(`| --- | ${defenders.map(() => "---").join(" | ")} |`);
    for (const attacker of attackers) {
      const value = rule(attacker);
      lines.push(
        `| ${name(attacker)} (${value.cost ?? "—"}c, ${value.maxHp}, ${half(value.attack2)}/${half(value.defense2)}) | ${defenders.map((defender) => cell(attacker, defender, context.terrain)).join(" | ")} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

function matrix(): string[] {
  return [
    "Each cell: damage dealt / damage taken in the first attack (both units at full HP) and × the number of attacks by fresh full-HP attackers of that kind that kill the defender; then `g` the damage with two own Goblins next to the target (the number after `g` is the Gang Up the engine applied), and `gw` the same with WAAAGH!. `K` is a kill of the full-HP defender. Ranged units attack from their full range; a Wolf Rider marked (Charge) has moved two tiles with Raiding.",
    "",
    "#### Goblin attackers on Human units",
    "",
    ...table(GOBLIN_ATTACKERS, HUMANS, goblinCell),
    "#### Goblin attackers on Goblin units",
    "",
    ...table(GOBLIN_ATTACKERS, GOBLINS, goblinCell),
  ];
}

/**
 * The correction pass: what a Rocket Cart deals a full-HP Guard and
 * Swordsman on each ground with no helper and with one (its Gang Up is at
 * most +1), with and without WAAAGH!.
 */
function rocket(): string[] {
  const cart: KindV7 = { faction: "GOBLIN", role: "CATAPULT" };
  const lines = [
    "A Rocket Cart's shot from three tiles at a full-HP unit: no helper / one own Goblin beside the target (Gang Up +1, the most a rocket gets), each without and with WAAAGH!. `K` is a kill.",
    "",
    "| Target | Ground | alone | alone, WAAAGH! | one helper | one helper, WAAAGH! |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const role of ["GUARD", "SWORDSMAN", "FIGHTER", "KNIGHT"] as const) {
    const target: KindV7 = { faction: "ORIGINAL", role };
    for (const context of CONTEXTS) {
      const dealt = (helpers: number, inspired: boolean): string => {
        const preview = previewOf(cart, target, context.terrain, {
          helpers,
          inspired,
        });
        return preview === null
          ? "—"
          : `${preview.damageToDefender}${preview.defenderDies ? "K" : ""}`;
      };
      lines.push(
        `| ${rule(target).label} ${rule(target).maxHp}hp | ${context.terrain === "OPEN" ? "open" : context.terrain === "FOREST" ? "Forest (Forestry)" : context.terrain === "FIELD_DEFENSE" ? "Field Defense" : "walled center"} | ${dealt(0, false)} | ${dealt(0, true)} | ${dealt(1, false)} | ${dealt(1, true)} |`,
      );
    }
  }
  return lines;
}

function reverse(): string[] {
  return [
    "Each cell: damage dealt / damage taken in the first attack (both at full HP), then × the number of attacks by fresh full-HP attackers that kill the defender. `K` is a kill.",
    "",
    "#### Human attackers on Goblin units",
    "",
    ...table(HUMAN_ATTACKERS, GOBLINS, plainCell),
  ];
}

// ------------------------------------------------------------ played ---

/** A piece of a played scenario; `tag` names it in the steps. */
type TaggedV7 = GoblinPieceV7 & { readonly tag?: string };

interface StepV7 {
  readonly kind: "ATTACK" | "KABOOM" | "RALLY" | "END_TURN" | "MOVE";
  /** The acting unit's tag. */
  readonly unit?: string;
  /** The target's tag (an attack). */
  readonly target?: string;
  /** The destination (a Move of one step). */
  readonly to?: CoordV7;
}
const attack = (unit: string, target: string): StepV7 => ({
  kind: "ATTACK",
  unit,
  target,
});
const kaboom = (unit: string): StepV7 => ({ kind: "KABOOM", unit });
const waaagh = (unit: string): StepV7 => ({ kind: "RALLY", unit });
const move = (unit: string, to: CoordV7): StepV7 => ({
  kind: "MOVE",
  unit,
  to,
});

/**
 * Plays the steps with the reducer and reports each from its events: the
 * hit, the splash, the deaths, and every explosion. A step whose unit or
 * target is gone, or that the engine refuses, says so.
 */
function play(
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly TaggedV7[],
  steps: readonly StepV7[],
  ground: GroundV7 = {},
): string[] {
  const lines = [`- **${title}**`];
  // The arena reads a piece's own fields; the tag is ours.
  let state = arena(factions, pieces, ground);
  const ids = new Map<string, number>();
  for (const piece of pieces)
    if (piece.tag !== undefined) ids.set(piece.tag, unitAt(state, piece.at).id);
  const label = (unit: Pick<UnitStateV7, "role" | "ownerId">): string => {
    const owner = state.players.find((player) => player.id === unit.ownerId);
    return effectiveRoleRuleV7(unit.role, owner?.faction ?? "ORIGINAL").label;
  };
  for (const step of steps) {
    const before = state;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const describe = (id: number): string => {
      const unit = before.units.find((item) => item.id === id);
      if (unit === undefined) return "a rising";
      return `${unit.ownerId === actor ? "own " : ""}${label(unit)}`;
    };
    const find = (tag: string | undefined): UnitStateV7 | undefined =>
      state.units.find((item) => item.id === ids.get(tag ?? ""));
    let command: CommandV7;
    let head: string;
    if (step.kind === "END_TURN") {
      command = { kind: "END_TURN" };
      head = "The turn ends";
    } else {
      const unit = find(step.unit);
      if (unit === undefined) {
        lines.push(`  - (${step.unit ?? "the unit"} is gone)`);
        continue;
      }
      if (step.kind === "ATTACK") {
        const target = find(step.target);
        if (target === undefined) {
          lines.push(`  - ${label(unit)}: its target is gone`);
          continue;
        }
        command = { kind: "ATTACK", unitId: unit.id, targetUnitId: target.id };
        head = `${label(unit)} (${unit.hp} HP) attacks ${label(target)} (${target.hp} HP)`;
      } else if (step.kind === "MOVE") {
        command = { kind: "MOVE", unitId: unit.id, path: [step.to as CoordV7] };
        head = `${label(unit)} moves up`;
      } else if (step.kind === "RALLY") {
        command = { kind: "RALLY", unitId: unit.id };
        head = `${label(unit)} calls WAAAGH!`;
      } else {
        command = { kind: "KABOOM", unitId: unit.id };
        head = `${label(unit)} (${unit.hp} HP) Kabooms`;
      }
    }
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) {
      lines.push(`  - ${head}: refused (${result.error.code})`);
      continue;
    }
    state = result.state;
    const parts: string[] = [];
    for (const event of result.events as readonly DomainEventV7[]) {
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        parts.push(
          `deals ${preview.damageToDefender}${preview.defenderDies ? " (kills)" : ""}, takes ${preview.damageToAttacker}${preview.attackerDies ? " (dies)" : ""}${preview.gangUp > 0 ? `, Gang Up +${preview.gangUp}` : ""}${preview.inspiredApplied ? ", WAAAGH!" : ""}${preview.advances ? ", advances" : ""}${preview.overrunContinues ? ", attacks again" : ""}`,
        );
        if (preview.splash.length > 0)
          parts.push(
            `splash ${preview.splash.map((entry) => `${entry.damage} on ${describe(entry.unitId)}${entry.dies ? " (kills)" : ""}`).join(", ")}`,
          );
      } else if (event.kind === "EXPLOSION_RESOLVED")
        parts.push(
          `${describe(event.unitId)} explodes for ${event.damage}${event.results.length === 0 ? " on nobody" : `: ${event.results.map((entry) => `${entry.damage} on ${describe(entry.unitId)}${entry.dies ? " (kills)" : ""}`).join(", ")}`}`,
        );
      else if (event.kind === "UNITS_RALLIED")
        parts.push(`${event.unitIds.length} units inspired`);
      else if (event.kind === "PLUNDER_AWARDED")
        parts.push(`Plunder +${event.coins}`);
    }
    lines.push(
      `  - ${head}: ${parts.length === 0 ? "done" : parts.join("; ")}`,
    );
  }
  const left = (seat: number): string =>
    state.units
      .filter(
        (unit) =>
          state.players.find((player) => player.id === unit.ownerId)?.seat ===
          seat,
      )
      .map((unit) => `${label(unit)} ${unit.hp}`)
      .join(", ") || "nothing";
  const sideName = (faction: FactionIdV7): string =>
    faction === "GOBLIN" ? "Goblins" : "Humans";
  lines.push(
    `  - Left: ${sideName(factions[0])} ${left(0)}; ${sideName(factions[1])} ${left(1)}.`,
  );
  return lines;
}

function blasts(): string[] {
  const lines: string[] = [];
  const mechanicsOf = (role: UnitRoleIdV7) => roleMechanicsV7(role, "GOBLIN");
  lines.push(
    "| Unit | Kaboom | Death blast |",
    "| --- | --- | --- |",
    ...GOBLIN_ROLES.map(
      (role) =>
        `| ${effectiveRoleRuleV7(role, "GOBLIN").label} | ${mechanicsOf(role).kaboomDamage ?? "—"} | ${mechanicsOf(role).deathBlastDamage ?? "—"} |`,
    ),
    "",
  );
  lines.push(
    ...play(
      "A Goblin Kabooms among three Fighters (1 Coin)",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), tag: "goblin" },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
        { seat: 1, role: "FIGHTER", at: at(6, 1) },
      ],
      [kaboom("goblin")],
    ),
    ...play(
      "A Goblin Kabooms beside an Orc Brute that holds two Fighters",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), tag: "goblin" },
        { seat: 0, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ],
      [kaboom("goblin")],
    ),
    ...play(
      "A Bomb Chucker throws at the middle of Guard, Swordsman, Marksman standing together",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(5, 4), tag: "chucker" },
        { seat: 1, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2), tag: "swordsman" },
        { seat: 1, role: "MARKSMAN", at: at(6, 2) },
      ],
      [attack("chucker", "swordsman")],
    ),
    ...play(
      "The same throw with WAAAGH!, two own Goblins and an Orc Brute next to the target",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 5), tag: "warboss" },
        { seat: 0, role: "MARKSMAN", at: at(5, 4), tag: "chucker" },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(4, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2), tag: "swordsman" },
        { seat: 1, role: "MARKSMAN", at: at(6, 2) },
      ],
      [waaagh("warboss"), attack("chucker", "swordsman")],
    ),
    ...play(
      "A Fighter kills a wounded Bomb Chucker that stands between two more and beside an Orc Brute (the death blasts chain)",
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3), tag: "fighter" },
        { seat: 1, role: "MARKSMAN", at: at(5, 2), hp: 2, tag: "chucker" },
        { seat: 1, role: "MARKSMAN", at: at(4, 2), hp: 2 },
        { seat: 1, role: "MARKSMAN", at: at(6, 2), hp: 2 },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
        { seat: 1, role: "GUARD", at: at(4, 1) },
      ],
      [attack("fighter", "chucker")],
    ),
  );
  return lines;
}

function scenarios(): string[] {
  const lines: string[] = [];
  lines.push(
    ...play(
      "Three Bomb Chuckers and two Goblins against a Guard, a Swordsman and a Marksman in the open, the Goblins already beside the line (one Goblin turn: the bombs, then the Goblins)",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(3, 4), tag: "c1" },
        { seat: 0, role: "MARKSMAN", at: at(5, 4), tag: "c2" },
        { seat: 0, role: "MARKSMAN", at: at(7, 4), tag: "c3" },
        { seat: 0, role: "FIGHTER", at: at(4, 3), tag: "g1" },
        { seat: 0, role: "FIGHTER", at: at(5, 3), tag: "g2" },
        { seat: 1, role: "GUARD", at: at(4, 2), tag: "guard" },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2), tag: "swordsman" },
        { seat: 1, role: "MARKSMAN", at: at(5, 1), tag: "marksman" },
      ],
      [
        attack("c1", "swordsman"),
        attack("c2", "swordsman"),
        attack("c3", "swordsman"),
        attack("g1", "guard"),
        attack("g2", "guard"),
      ],
    ),
    ...play(
      "The same army, bombs first: the Goblins start one tile back and close in after the three throws",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(3, 4), tag: "c1" },
        { seat: 0, role: "MARKSMAN", at: at(5, 4), tag: "c2" },
        { seat: 0, role: "MARKSMAN", at: at(7, 4), tag: "c3" },
        { seat: 0, role: "FIGHTER", at: at(4, 4), tag: "g1" },
        { seat: 0, role: "FIGHTER", at: at(6, 4), tag: "g2" },
        { seat: 1, role: "GUARD", at: at(4, 2), tag: "guard" },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2), tag: "swordsman" },
        { seat: 1, role: "MARKSMAN", at: at(5, 1), tag: "marksman" },
      ],
      [
        attack("c1", "swordsman"),
        attack("c2", "swordsman"),
        attack("c3", "swordsman"),
        move("g1", at(4, 3)),
        move("g2", at(5, 3)),
        attack("g1", "guard"),
        attack("g2", "guard"),
      ],
    ),
    ...play(
      "A Scrap Buggy with WAAAGH! rams a backline: Catapult, then two Marksmen in a row, a Guard beside the last; then it crashes",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 5), tag: "warboss" },
        { seat: 0, role: "KNIGHT", at: at(5, 5), tag: "buggy" },
        { seat: 1, role: "CATAPULT", at: at(5, 4), tag: "catapult" },
        { seat: 1, role: "MARKSMAN", at: at(5, 3), tag: "m1" },
        { seat: 1, role: "MARKSMAN", at: at(5, 2), tag: "m2" },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
      [
        waaagh("warboss"),
        attack("buggy", "catapult"),
        attack("buggy", "m1"),
        attack("buggy", "m2"),
        kaboom("buggy"),
      ],
    ),
    ...play(
      "A Scrap Buggy with WAAAGH! and two Goblins beside its first target: a Swordsman in Forest, then the Marksman and the Catapult behind; then it crashes",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 5), tag: "warboss" },
        { seat: 0, role: "KNIGHT", at: at(5, 4), tag: "buggy" },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 3), tag: "swordsman" },
        { seat: 1, role: "MARKSMAN", at: at(5, 2), tag: "marksman" },
        { seat: 1, role: "CATAPULT", at: at(5, 1), tag: "catapult" },
      ],
      [
        waaagh("warboss"),
        attack("buggy", "swordsman"),
        attack("buggy", "marksman"),
        attack("buggy", "catapult"),
        kaboom("buggy"),
      ],
      { forest: [at(5, 3)] },
    ),
    ...play(
      "A Human Knight rides into three Bomb Chuckers and a Rocket Cart standing together",
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 4), tag: "knight" },
        { seat: 1, role: "MARKSMAN", at: at(5, 3), tag: "c1" },
        { seat: 1, role: "MARKSMAN", at: at(4, 2), tag: "c2" },
        { seat: 1, role: "MARKSMAN", at: at(6, 2), tag: "c3" },
        { seat: 1, role: "CATAPULT", at: at(5, 2), tag: "cart" },
      ],
      [
        attack("knight", "c1"),
        attack("knight", "cart"),
        attack("knight", "c2"),
        attack("knight", "c3"),
      ],
    ),
    ...play(
      "The same Knight when the Bomb Chuckers stand apart behind an Orc Brute",
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 5), tag: "knight" },
        { seat: 1, role: "GUARD", at: at(5, 4), tag: "brute" },
        { seat: 1, role: "MARKSMAN", at: at(3, 3), tag: "c1" },
        { seat: 1, role: "MARKSMAN", at: at(5, 2), tag: "c2" },
        { seat: 1, role: "MARKSMAN", at: at(7, 3), tag: "c3" },
      ],
      [attack("knight", "brute")],
    ),
    ...play(
      "A Rocket Cart with WAAAGH! and two Goblins beside the target fires at a Guard on a walled center",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(3, 5), tag: "warboss" },
        { seat: 0, role: "CATAPULT", at: at(2, 5), tag: "cart" },
        { seat: 0, role: "FIGHTER", at: at(1, 7) },
        { seat: 0, role: "FIGHTER", at: at(3, 7) },
        { seat: 1, role: "GUARD", at: at(2, 8), tag: "guard" },
      ],
      [waaagh("warboss"), attack("cart", "guard")],
      { walls: true },
    ),
    ...play(
      "A bomb, then two Wolf Riders (Charge) and a Goblin on a Guard on a center without Walls",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 6), tag: "chucker" },
        {
          seat: 0,
          role: "RAIDER",
          at: at(1, 7),
          activation: { moved: true, movedPathLength: 2 },
          tag: "w1",
        },
        {
          seat: 0,
          role: "RAIDER",
          at: at(3, 7),
          activation: { moved: true, movedPathLength: 2 },
          tag: "w2",
        },
        { seat: 0, role: "FIGHTER", at: at(2, 7), tag: "goblin" },
        { seat: 1, role: "GUARD", at: at(2, 8), tag: "guard" },
      ],
      [
        attack("chucker", "guard"),
        attack("w1", "guard"),
        attack("w2", "guard"),
        attack("goblin", "guard"),
      ],
    ),
    ...play(
      "Two Goblins against a Human Fighter in the open (2 Coins against 2)",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3), tag: "g1" },
        { seat: 0, role: "FIGHTER", at: at(6, 3), tag: "g2" },
        { seat: 1, role: "FIGHTER", at: at(5, 2), tag: "fighter" },
      ],
      [attack("g1", "fighter"), attack("g2", "fighter")],
    ),
    ...play(
      "Two Swordsmen attack an Orc Brute on a Field Defense",
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "SWORDSMAN", at: at(1, 6), tag: "s1" },
        { seat: 0, role: "SWORDSMAN", at: at(3, 6), tag: "s2" },
        { seat: 1, role: "GUARD", at: at(2, 7), tag: "brute" },
      ],
      [attack("s1", "brute"), attack("s2", "brute")],
      { fieldDefense: [at(2, 7)] },
    ),
  );
  return lines;
}

function technology(): string[] {
  const tree = factionTreeV7("GOBLIN");
  const lines = [
    "| Branch | Technology | Tier | After | Cost as the 2nd / 5th / 9th technology | Unlocks (as coded) |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const node of tree.nodes) {
    if (node.branch === "NAVAL") continue;
    const unlocks = node.unlocks
      .map((unlock) =>
        unlock.kind === "COMMAND"
          ? unlock.command
          : unlock.kind === "UNIT_ROLE"
            ? `unit ${effectiveRoleRuleV7(unlock.role, "GOBLIN").label}`
            : unlock.kind === "RESOURCE_REVEAL"
              ? `reveals ${unlock.resources.join(", ")}`
              : unlock.kind,
      )
      .join(", ");
    lines.push(
      `| ${node.branch} | ${node.id} | ${node.tier} | ${node.prerequisites.join(", ") || "—"} | ${[1, 4, 8].map((owned) => playerTechnologyResearchCostV7(node.tier, owned)).join(" / ")} | ${unlocks} |`,
    );
  }
  return lines;
}

function prices(): string[] {
  const tree = factionTreeV7("GOBLIN");
  const lines = [
    "| Unit | Technology (tier) | Cost | Hired | HP | Atk / Def | Move | Range | Kaboom | Death blast | A city of income 3 / 5 / 7 pays for one a turn |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const role of GOBLIN_ROLES) {
    const value = effectiveRoleRuleV7(role, "GOBLIN");
    const mechanics = roleMechanicsV7(role, "GOBLIN");
    const tier =
      value.technology === null
        ? "—"
        : `${value.technology} (${String(tree.nodes.find((node) => node.id === value.technology)?.tier ?? "?")})`;
    lines.push(
      `| ${value.label} | ${tier} | ${value.cost ?? "reward"} | ${value.cost === null ? "—" : hireCostV7(value.cost)} | ${value.maxHp} | ${half(value.attack2)} / ${half(value.defense2)} | ${value.move} | ${value.minimumRange === value.range ? value.range : `${value.minimumRange}-${value.range}`} | ${mechanics.kaboomDamage ?? "—"} | ${mechanics.deathBlastDamage ?? "—"} | ${value.cost === null ? "—" : [3, 5, 7].map((income) => ((value.cost ?? 0) <= income ? "yes" : "no")).join(" / ")} |`,
    );
  }
  lines.push(
    "",
    `Unit slots of a Goblin city (Warrens +1): ${[1, 2, 3, 4, 5].map((level) => `L${level} ${cityUnitCapacityForV7(level, [], "GOBLIN")}/${cityUnitCapacityForV7(level, ["GATHERING", "ADMINISTRATION", "PLANNING"], "GOBLIN")}`).join(", ")} (without / with Planning); a Human city has one fewer at every level.`,
  );
  return lines;
}

const part = process.argv[2] ?? "all";
const out: string[] = [
  `<!-- ${RULESET_7_ID}, scripts/goblin-tuning-analysis-v7.ts ${part} -->`,
  "",
];
if (part === "all" || part === "matrix")
  out.push("### Matchup matrix", "", ...matrix());
if (part === "all" || part === "rocket")
  out.push("### The Rocket Cart", "", ...rocket(), "");
if (part === "all" || part === "reverse")
  out.push("### The reverse", "", ...reverse());
if (part === "all" || part === "blasts")
  out.push("### Blasts and splash", "", ...blasts(), "");
if (part === "all" || part === "scenarios")
  out.push("### Scenarios", "", ...scenarios(), "");
if (part === "all" || part === "technology")
  out.push("### Goblin technologies", "", ...technology(), "");
if (part === "all" || part === "prices")
  out.push("### Goblin price list", "", ...prices(), "");
process.stdout.write(`${out.join("\n")}\n`);
