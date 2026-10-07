/**
 * The Undead faction pass (`pulp_wars-w49.13`,
 * docs/product/RULESET_7_TUNING_UNDEAD.md): deterministic unit-level numbers
 * from the engine's exact public combat and Wail previews on constructed
 * positions, small played-out scenarios resolved by the reducer, and the
 * Undead technology and price lists. It plays no match and draws no
 * conclusion; the document does.
 *
 *   npx tsx scripts/undead-tuning-analysis-v7.ts            (everything)
 *   npx tsx scripts/undead-tuning-analysis-v7.ts matrix     (one part:
 *     matrix | wail | reverse | scenarios | technology | prices)
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
  previewWailV7,
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
import { undeadScenariosV7 } from "./undead-tuning-scenarios-v7";

interface KindV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  /** A Ghoul or Raider that moved two tiles (Charge with Raiding). */
  readonly charging?: boolean;
  /**
   * The correction: a Ghoul whose target is Bitten (Carrion, +1 Attack; a
   * Plagued target is the same).
   */
  readonly carrion?: boolean;
}

const LAND_ROLES: readonly UnitRoleIdV7[] = [
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
const kinds = (
  faction: FactionIdV7,
  roles: readonly UnitRoleIdV7[],
): readonly KindV7[] => roles.map((role) => ({ faction, role }));
const UNDEAD = kinds("UNDEAD", LAND_ROLES);
const HUMANS = kinds("ORIGINAL", HUMAN_ROLES);
const GOBLINS = kinds("GOBLIN", LAND_ROLES);
const withCharge = (list: readonly KindV7[]): readonly KindV7[] =>
  list.flatMap((kind) =>
    kind.role === "RAIDER"
      ? kind.faction === "UNDEAD"
        ? [
            kind,
            { ...kind, charging: true },
            { ...kind, carrion: true },
            { ...kind, charging: true, carrion: true },
          ]
        : [kind, { ...kind, charging: true }]
      : [kind],
  );

const rule = (kind: KindV7) => effectiveRoleRuleV7(kind.role, kind.faction);
const name = (kind: KindV7): string =>
  `${rule(kind).label}${
    kind.charging === true && kind.carrion === true
      ? " (Charge, Carrion)"
      : kind.charging === true
        ? " (Charge)"
        : kind.carrion === true
          ? " (Carrion)"
          : ""
  }`;
const half = (value2: number): string => String(value2 / 2);
const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

type TerrainV7 = "OPEN" | "FOREST" | "FIELD_DEFENSE" | "WALLS";
const CONTEXTS: readonly {
  readonly title: string;
  readonly short: string;
  readonly terrain: TerrainV7;
}[] = [
  { title: "Open ground", short: "open", terrain: "OPEN" },
  {
    title:
      "Cover x 1.5 (the defender in Forest with its owner's Forestry; a Mountain gives the same with no technology)",
    short: "Forest",
    terrain: "FOREST",
  },
  {
    title: "Field Defense (+2 Defense), the attacker without Explosives",
    short: "Field Defense",
    terrain: "FIELD_DEFENSE",
  },
  {
    title: "Walled city center (+2 Defense), the attacker without Explosives",
    short: "walled center",
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
  /** Graves on the board before the first step. */
  readonly graves?: readonly CoordV7[];
  /** Technologies seat 0 / seat 1 do not own (Explosives is always out). */
  readonly lacks?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  /**
   * The correction: seat 0 owns Explosives (for an Undead seat Pestilence:
   * its Liches plague).
   */
  readonly pestilence?: boolean;
  /** The correction: the units on these tiles are Bitten by seat 0. */
  readonly bitten?: readonly CoordV7[];
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
      0: without(
        factions[0],
        ...(ground.pestilence === true ? [] : (["EXPLOSIVES"] as const)),
        ...(ground.lacks?.[0] ?? []),
      ),
      1: without(factions[1], "EXPLOSIVES", ...(ground.lacks?.[1] ?? [])),
    },
  });
  const seatOne = base.players.find((player) => player.seat === 1);
  const walls = ground.walls === true;
  const farm = (where: CoordV7): boolean =>
    walls && WALL_FARMS.some((item) => same(item, where));
  // The correction: Bitten marks need a biter of seat 0 on the board (any
  // unit of it serves: the mark names the unit only to own the rising).
  const biter = base.units.find(
    (unit) => unit.ownerId === base.players.find((p) => p.seat === 0)?.id,
  );
  const bitten = (ground.bitten ?? []).flatMap((where) => {
    const unit = base.units.find((candidate) => same(candidate.at, where));
    return unit === undefined || biter === undefined
      ? []
      : [
          {
            unitId: unit.id,
            biterPlayerId: biter.ownerId,
            biterUnitId: biter.id,
          },
        ];
  });
  return {
    ...base,
    bitten,
    nextEntityId: base.nextEntityId + (walls ? WALL_FARMS.length : 0),
    graves: [...(ground.graves ?? [])].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    ),
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

const targetTile = (terrain: TerrainV7): CoordV7 =>
  terrain === "WALLS"
    ? at(2, 8)
    : terrain === "FIELD_DEFENSE"
      ? at(2, 7)
      : at(5, 2);

/**
 * One attack of the matrix: the target on its context tile, the attacker at
 * its full range (a melee unit next to it) on the same row or column, and
 * Frenzy, Rally, or WAAAGH! (the Inspired flag) when `inspired`.
 */
function previewOf(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
  options: {
    readonly inspired?: boolean;
    readonly defenderHp?: number;
    readonly attackerHp?: number;
  } = {},
): CombatPreviewV7 | null {
  const attackerRule = rule(attacker);
  if (!attackerRule.abilities.includes("ATTACK")) return null;
  const distance = Math.max(attackerRule.minimumRange, attackerRule.range);
  const to = targetTile(terrain);
  const from =
    terrain === "WALLS" || terrain === "FIELD_DEFENSE"
      ? at(to.x, to.y - distance)
      : at(to.x + distance, to.y);
  const pieces: GoblinPieceV7[] = [
    {
      seat: 0,
      role: attacker.role,
      at: from,
      ...(options.attackerHp === undefined ? {} : { hp: options.attackerHp }),
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
  ];
  // Carrion: a target that takes no bite (an Undead unit) has no cell.
  if (attacker.carrion === true && defender.faction === "UNDEAD") return null;
  const state = arena([attacker.faction, defender.faction], pieces, {
    ...(terrain === "FOREST" ? { forest: [to] } : {}),
    ...(terrain === "FIELD_DEFENSE" ? { fieldDefense: [to] } : {}),
    ...(attacker.carrion === true ? { bitten: [to] } : {}),
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

/** A Banshee's Wail on one full-HP target two tiles away. */
function wailOf(
  defender: KindV7,
  terrain: TerrainV7,
  bansheeHp?: number,
): number | null {
  const to = targetTile(terrain);
  const from =
    terrain === "WALLS" || terrain === "FIELD_DEFENSE"
      ? at(to.x, to.y - 2)
      : at(to.x + 2, to.y);
  const state = arena(
    ["UNDEAD", defender.faction],
    [
      {
        seat: 0,
        role: "MARKSMAN",
        at: from,
        ...(bansheeHp === undefined ? {} : { hp: bansheeHp }),
      },
      { seat: 1, role: defender.role, at: to },
    ],
    {
      ...(terrain === "FOREST" ? { forest: [to] } : {}),
      ...(terrain === "FIELD_DEFENSE" ? { fieldDefense: [to] } : {}),
      walls: terrain === "WALLS",
    },
  );
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const preview = previewWailV7(
    viewForV7(state, actor),
    unitAt(state, from).id,
  );
  return preview?.targets[0]?.damage ?? null;
}

/** Attacks by fresh full-HP attackers of the kind that kill the defender. */
function attacksToKill(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
): string {
  let hp = rule(defender).maxHp;
  let hits = 0;
  while (hp > 0 && hits < 30) {
    const preview = previewOf(attacker, defender, terrain, { defenderHp: hp });
    if (preview === null || preview.damageToDefender <= 0) break;
    hp -= preview.damageToDefender;
    hits += 1;
  }
  return hp > 0 ? "∞" : String(hits);
}

const dealt = (preview: CombatPreviewV7 | null): string =>
  preview === null
    ? "—"
    : `${preview.damageToDefender}${preview.defenderDies ? "K" : ""}`;

/**
 * A cell: `dealt/taken ×attacks`, then `f` the damage with Frenzy (or Rally,
 * or WAAAGH!); a Vampire's heal as `+n`; `K` marks a kill of the full-HP
 * defender. A Banshee's cell is its Wail from two tiles.
 */
function cell(attacker: KindV7, defender: KindV7, terrain: TerrainV7): string {
  if (rule(attacker).abilities.includes("WAIL")) {
    const damage =
      defender.faction === "UNDEAD" ? null : wailOf(defender, terrain);
    return damage === null ? "—" : `wail ${damage}`;
  }
  const plain = previewOf(attacker, defender, terrain);
  if (plain === null) return "—";
  const frenzied = previewOf(attacker, defender, terrain, { inspired: true });
  const heal = plain.attackerHeal > 0 ? ` +${plain.attackerHeal}` : "";
  // Frenzy and Rally do not reach support and siege units (WAAAGH! does),
  // and no bonus reaches a reward unit's row here.
  const unreached =
    (rule(attacker).tacticalRole === "SUPPORT" ||
      rule(attacker).tacticalRole === "SIEGE") &&
    !roleMechanicsV7("CAPTAIN", attacker.faction).rallyReachesSupportAndSiege;
  return `${dealt(plain)}/${plain.damageToAttacker}${heal} ×${attacksToKill(attacker, defender, terrain)}${unreached || rule(attacker).tacticalRole === "SUPPORT" || frenzied === null || !frenzied.inspiredApplied ? "" : `; f ${dealt(frenzied)}`}`;
}

function table(
  attackers: readonly KindV7[],
  defenders: readonly KindV7[],
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

const LEGEND =
  "Each cell: damage dealt / damage taken in the first attack (both units at full HP; `+n` is what a Vampire heals) and × the number of attacks by fresh full-HP attackers of that kind that kill the defender; then `f` the damage with Frenzy (Rally, WAAAGH!). `K` is a kill of the full-HP defender. Ranged units attack from their full range; a unit marked (Charge) has moved two tiles with Raiding; a Ghoul marked (Carrion) attacks a Bitten unit (a Plagued one is the same). No Lich in these tables plagues (no seat has Explosives). A Banshee's cell is its Wail on that unit from two tiles (it has no attack).";

function matrix(): string[] {
  return [
    LEGEND,
    "",
    "#### Undead attackers on Human units",
    "",
    ...table(withCharge(UNDEAD), HUMANS),
    "#### Undead attackers on Goblin units",
    "",
    ...table(withCharge(UNDEAD), GOBLINS),
    "#### Undead attackers on Undead units",
    "",
    ...table(withCharge(UNDEAD), UNDEAD),
  ];
}

function reverse(): string[] {
  return [
    LEGEND,
    "",
    "#### Human attackers on Undead units",
    "",
    ...table(withCharge(HUMANS), UNDEAD),
    "#### Goblin attackers on Undead units (no Gang Up: the attacker alone)",
    "",
    ...table(withCharge(GOBLINS), UNDEAD),
  ];
}

function wail(): string[] {
  const lines = [
    "A Banshee's Wail on one full-HP unit two tiles away (every hostile living unit within two tiles takes its own number at once; nothing answers). Full-HP Banshee / a Banshee at 4 of 8 HP.",
    "",
    `| Target | ${CONTEXTS.map((context) => context.short).join(" | ")} |`,
    `| --- | ${CONTEXTS.map(() => "---").join(" | ")} |`,
  ];
  for (const target of [...HUMANS, ...GOBLINS])
    lines.push(
      `| ${rule(target).label} (${target.faction === "GOBLIN" ? "Goblin" : "Human"}, ${rule(target).maxHp}hp, Def ${half(rule(target).defense2)}) | ${CONTEXTS.map((context) => `${wailOf(target, context.terrain) ?? "—"} / ${wailOf(target, context.terrain, 4) ?? "—"}`).join(" | ")} |`,
    );
  return lines;
}

// ------------------------------------------------------------ played ---

/** A piece of a played scenario; `tag` names it in the steps. */
type TaggedV7 = GoblinPieceV7 & { readonly tag?: string };

interface StepV7 {
  readonly kind:
    | "ATTACK"
    | "RALLY"
    | "END_TURN"
    | "MOVE"
    | "WAIL"
    | "RAISE_DEAD"
    | "DEVOUR"
    | "KABOOM"
    | "TEND"
    | "NOTE";
  /** The acting unit's tag. */
  readonly unit?: string;
  /** The target's tag (an attack). */
  readonly target?: string;
  /** The path (a Move). */
  readonly path?: readonly CoordV7[];
  readonly text?: string;
}
const attack = (unit: string, target: string): StepV7 => ({
  kind: "ATTACK",
  unit,
  target,
});
const frenzy = (unit: string): StepV7 => ({ kind: "RALLY", unit });
const wailStep = (unit: string): StepV7 => ({ kind: "WAIL", unit });
const raise = (unit: string): StepV7 => ({ kind: "RAISE_DEAD", unit });
const devour = (unit: string): StepV7 => ({ kind: "DEVOUR", unit });
const kaboom = (unit: string): StepV7 => ({ kind: "KABOOM", unit });
const tend = (unit: string): StepV7 => ({ kind: "TEND", unit });
const endTurn: StepV7 = { kind: "END_TURN" };
const note = (text: string): StepV7 => ({ kind: "NOTE", text });
const move = (unit: string, ...path: CoordV7[]): StepV7 => ({
  kind: "MOVE",
  unit,
  path,
});

const SIDE: Readonly<Partial<Record<FactionIdV7, string>>> = {
  UNDEAD: "Undead",
  ORIGINAL: "Humans",
  GOBLIN: "Goblins",
};

/**
 * Plays the steps with the reducer and reports each from its events. A step
 * whose unit or target is gone, or that the engine refuses, says so. A
 * rising is tagged `rise1`, `rise2`, … in the order it appears, so a later
 * step may name it.
 */
function play(
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly TaggedV7[],
  steps: readonly StepV7[],
  ground: GroundV7 = {},
): string[] {
  const lines = [`- **${title}**`];
  let state = arena(factions, pieces, ground);
  const ids = new Map<string, number>();
  for (const piece of pieces)
    if (piece.tag !== undefined) ids.set(piece.tag, unitAt(state, piece.at).id);
  let risings = 0;
  const labelIn = (
    source: GameStateV7,
    unit: Pick<UnitStateV7, "role" | "ownerId">,
  ): string => {
    const owner = source.players.find((player) => player.id === unit.ownerId);
    return effectiveRoleRuleV7(unit.role, owner?.faction ?? "ORIGINAL").label;
  };
  const sideOf = (source: GameStateV7, ownerId: number): string => {
    const owner = source.players.find((player) => player.id === ownerId);
    return SIDE[owner?.faction ?? "ORIGINAL"] ?? "?";
  };
  for (const step of steps) {
    if (step.kind === "NOTE") {
      lines.push(`  - _${step.text ?? ""}_`);
      continue;
    }
    const before = state;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const describe = (id: number): string => {
      const unit =
        before.units.find((item) => item.id === id) ??
        state.units.find((item) => item.id === id);
      if (unit === undefined) return "a unit";
      return `${unit.ownerId === actor ? "own " : ""}${labelIn(before, unit)}`;
    };
    const find = (tag: string | undefined): UnitStateV7 | undefined =>
      state.units.find((item) => item.id === ids.get(tag ?? ""));
    let command: CommandV7;
    let head: string;
    if (step.kind === "END_TURN") {
      command = { kind: "END_TURN" };
      head = `${sideOf(state, actor)} end the turn`;
    } else {
      const unit = find(step.unit);
      if (unit === undefined) {
        lines.push(`  - (${step.unit ?? "the unit"} is gone)`);
        continue;
      }
      const who = `${labelIn(state, unit)} (${unit.hp} HP)`;
      if (step.kind === "ATTACK") {
        const target = find(step.target);
        if (target === undefined) {
          lines.push(`  - ${labelIn(state, unit)}: its target is gone`);
          continue;
        }
        command = { kind: "ATTACK", unitId: unit.id, targetUnitId: target.id };
        head = `${who} attacks ${labelIn(state, target)} (${target.hp} HP)`;
      } else if (step.kind === "MOVE") {
        command = {
          kind: "MOVE",
          unitId: unit.id,
          path: [...(step.path ?? [])],
        };
        head = `${labelIn(state, unit)} moves ${(step.path ?? []).length} tile${(step.path ?? []).length === 1 ? "" : "s"}`;
      } else if (step.kind === "RALLY") {
        command = { kind: "RALLY", unitId: unit.id };
        head = `${labelIn(state, unit)} calls ${sideOf(state, actor) === "Undead" ? "Frenzy" : sideOf(state, actor) === "Goblins" ? "WAAAGH!" : "Rally"}`;
      } else if (step.kind === "WAIL") {
        command = { kind: "WAIL", unitId: unit.id };
        head = `${who} Wails`;
      } else if (step.kind === "RAISE_DEAD") {
        command = { kind: "RAISE_DEAD", unitId: unit.id };
        head = `${labelIn(state, unit)} raises the dead`;
      } else if (step.kind === "DEVOUR") {
        command = { kind: "DEVOUR", unitId: unit.id };
        head = `${who} Devours`;
      } else if (step.kind === "TEND") {
        command = { kind: "TEND_WOUNDED", unitId: unit.id };
        head = `${labelIn(state, unit)} tends the wounded`;
      } else {
        command = { kind: "KABOOM", unitId: unit.id };
        head = `${who} Kabooms`;
      }
    }
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) {
      lines.push(`  - ${head}: refused (${result.error.code})`);
      continue;
    }
    state = result.state;
    const parts: string[] = [];
    const list = (
      entries: readonly {
        readonly unitId: number;
        readonly damage: number;
        readonly dies: boolean;
      }[],
    ): string =>
      entries
        .map(
          (entry) =>
            `${entry.damage} on ${describe(entry.unitId)}${entry.dies ? " (kills)" : ""}`,
        )
        .join(", ");
    for (const event of result.events as readonly DomainEventV7[]) {
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        parts.push(
          `deals ${preview.damageToDefender}${preview.defenderDies ? " (kills)" : ""}, takes ${preview.damageToAttacker}${preview.attackerDies ? " (dies)" : ""}${preview.attackerHeal > 0 ? `, heals ${preview.attackerHeal}` : ""}${preview.inspiredApplied ? ", inspired" : ""}${preview.chargeApplied ? ", Charge" : ""}${preview.gangUp > 0 ? `, Gang Up +${preview.gangUp}` : ""}${preview.defenderBitten ? ", bites" : ""}${preview.attackerBitten ? ", is bitten" : ""}${preview.advances ? ", advances" : ""}${preview.overrunContinues ? ", attacks again" : ""}`,
        );
        if (preview.splash.length > 0)
          parts.push(`splash ${list(preview.splash)}`);
        if (preview.plagued.length > 0)
          parts.push(`plagues ${preview.plagued.length}`);
      } else if (event.kind === "WAIL_RESOLVED")
        parts.push(event.results.length === 0 ? "nobody" : list(event.results));
      else if (event.kind === "EXPLOSION_RESOLVED")
        parts.push(
          `${describe(event.unitId)} explodes for ${event.damage}${event.results.length === 0 ? " on nobody" : `: ${list(event.results)}`}`,
        );
      else if (event.kind === "UNITS_RALLIED")
        parts.push(`${event.unitIds.length} units inspired`);
      else if (
        event.kind === "UNIT_INFECTED" ||
        event.kind === "BITTEN_UNIT_RISEN"
      ) {
        risings += 1;
        ids.set(`rise${risings}`, event.unitId);
        parts.push(
          `${describe(event.victimUnitId)} rises as a Zombie of the ${sideOf(state, event.playerId)}${event.kind === "BITTEN_UNIT_RISEN" ? " (it was Bitten)" : ""}`,
        );
      } else if (event.kind === "DEAD_RAISED") {
        for (const entry of event.results) {
          risings += 1;
          ids.set(`rise${risings}`, entry.unitId);
        }
        parts.push(`${event.results.length} Skeletons rise`);
      } else if (event.kind === "GRAVE_DEVOURED")
        parts.push(`heals ${event.amount} (to ${event.hpAfter})`);
      else if (event.kind === "PLAGUE_DAMAGED")
        parts.push(
          `Plague: ${event.results.map((entry) => `${entry.damage} on ${describe(entry.unitId)}${entry.dies ? " (kills)" : ""}`).join(", ")}`,
        );
      else if (event.kind === "PLAGUE_SPREAD")
        parts.push(`Plague spreads to ${event.results.length}`);
      else if (event.kind === "PLUNDER_AWARDED")
        parts.push(`Plunder +${event.coins}`);
      else if (event.kind === "WOUNDED_TENDED")
        parts.push(`${event.results.length} tended`);
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
      .map((unit) => `${labelIn(state, unit)} ${unit.hp}`)
      .join(", ") || "nothing";
  lines.push(
    `  - Left: ${SIDE[factions[0]] ?? "?"} ${left(0)}; ${SIDE[factions[1]] ?? "?"} ${left(1)}.${state.graves.length > 0 ? ` Graves: ${state.graves.length}.` : ""}`,
  );
  return lines;
}

/** How one side of a `battle` plays (a fixed script, not the AI). */
interface BattleSideV7 {
  /**
   * `ADVANCE`: a unit with no target steps toward the nearest enemy (and
   * attacks if it then may). `HOLD`: it stays. `SHOOT`: its melee units
   * attack only for a kill, its ranged units always, and nobody moves.
   * `KITE`: as `SHOOT`, and a unit with an enemy melee unit beside it first
   * steps one tile away from the nearest enemy when a free tile exists.
   */
  readonly mode: "ADVANCE" | "HOLD" | "SHOOT" | "KITE";
}

/**
 * Plays whole turns with the reducer by a fixed script: in unit-ID order
 * every unit of the side to move attacks the enemy its preview kills (the
 * dearest first), otherwise the one it damages most (the script's `mode`
 * decides whether it attacks at all and whether it moves first). One line a
 * turn: attacks, kills, bites, risings, and what stands at its end.
 */
function battle(
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly TaggedV7[],
  sides: readonly [BattleSideV7, BattleSideV7],
  turns: number,
  ground: GroundV7 = {},
): string[] {
  const lines = [`- **${title}**`];
  let state = arena(factions, pieces, ground);
  const seatOf = (ownerId: number): number =>
    state.players.find((player) => player.id === ownerId)?.seat ?? -1;
  const labelOf = (unit: Pick<UnitStateV7, "role" | "ownerId">): string =>
    effectiveRoleRuleV7(
      unit.role,
      state.players.find((player) => player.id === unit.ownerId)?.faction ??
        "ORIGINAL",
    ).label;
  const cheb = (left: CoordV7, right: CoordV7): number =>
    Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
  const summary = (seat: number): string => {
    const counts = new Map<string, number[]>();
    for (const unit of state.units)
      if (seatOf(unit.ownerId) === seat)
        counts.set(labelOf(unit), [
          ...(counts.get(labelOf(unit)) ?? []),
          unit.hp,
        ]);
    return (
      [...counts.entries()]
        .map(([label, hps]) => `${label} ×${hps.length} (${hps.join(", ")})`)
        .join(", ") || "nothing"
    );
  };
  lines.push(
    `  - Start: ${SIDE[factions[0]] ?? "?"} ${summary(0)}; ${SIDE[factions[1]] ?? "?"} ${summary(1)}.`,
  );
  for (let turn = 0; turn < turns; turn += 1) {
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const seat = seatOf(actor);
    const side = sides[seat] as BattleSideV7;
    let attacks = 0;
    let kills = 0;
    let bites = 0;
    let risen = 0;
    let moves = 0;
    let damage = 0;
    const apply = (command: CommandV7): boolean => {
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) return false;
      state = result.state;
      for (const event of result.events as readonly DomainEventV7[]) {
        if (event.kind === "COMBAT_RESOLVED") {
          attacks += 1;
          damage += event.preview.damageToDefender;
          kills += Number(event.preview.defenderDies);
          bites += Number(event.preview.defenderBitten);
          for (const entry of event.preview.splash) {
            damage += entry.damage;
            kills += Number(entry.dies);
          }
        } else if (event.kind === "WAIL_RESOLVED") {
          attacks += 1;
          for (const entry of event.results) {
            damage += entry.damage;
            kills += Number(entry.dies);
          }
        } else if (
          event.kind === "UNIT_INFECTED" ||
          event.kind === "BITTEN_UNIT_RISEN"
        )
          risen += 1;
        else if (event.kind === "DEAD_RAISED") risen += event.results.length;
        else if (event.kind === "PLAGUE_DAMAGED")
          for (const entry of event.results) {
            damage += entry.damage;
            kills += Number(entry.dies);
          }
      }
      return true;
    };
    const strike = (unitId: number): boolean => {
      const unit = state.units.find((item) => item.id === unitId);
      if (unit === undefined) return false;
      const unitRule = effectiveRoleRuleV7(
        unit.role,
        factions[seat] as FactionIdV7,
      );
      if (unitRule.abilities.includes("WAIL"))
        return apply({ kind: "WAIL", unitId: unit.id });
      if (
        unitRule.abilities.includes("RAISE_DEAD") &&
        apply({ kind: "RAISE_DEAD", unitId: unit.id })
      )
        return true;
      if (
        unitRule.abilities.includes("RALLY") &&
        state.units.some(
          (other) => other.ownerId !== actor && cheb(other.at, unit.at) <= 2,
        ) &&
        apply({ kind: "RALLY", unitId: unit.id })
      )
        return true;
      const view = viewForV7(state, actor);
      let best: { id: number; score: number } | null = null;
      for (const target of state.units) {
        if (target.ownerId === actor) continue;
        const preview = queryCombatPreviewV7(view, unit.id, target.id);
        if (preview === null) continue;
        const ranged = unitRule.range > 1;
        if (
          (side.mode === "SHOOT" || side.mode === "KITE") &&
          !ranged &&
          !preview.defenderDies
        )
          continue;
        if (preview.attackerDies && !preview.defenderDies) continue;
        const price =
          effectiveRoleRuleV7(target.role, factions[1 - seat] as FactionIdV7)
            .cost ?? 8;
        const score =
          (preview.defenderDies ? 1000 + 10 * price : 0) +
          10 * preview.damageToDefender +
          preview.splash.reduce((total, entry) => total + entry.damage, 0) * 5 +
          price -
          preview.damageToAttacker;
        if (best === null || score > best.score)
          best = { id: target.id, score };
      }
      return (
        best !== null &&
        apply({ kind: "ATTACK", unitId: unit.id, targetUnitId: best.id })
      );
    };
    const step = (unitId: number, away: boolean): void => {
      const unit = state.units.find((item) => item.id === unitId);
      if (unit === undefined) return;
      let nearest: UnitStateV7 | null = null;
      for (const other of state.units)
        if (
          other.ownerId !== actor &&
          (nearest === null ||
            cheb(other.at, unit.at) < cheb(nearest.at, unit.at))
        )
          nearest = other;
      if (nearest === null) return;
      const target = nearest.at;
      const unitRule = effectiveRoleRuleV7(
        unit.role,
        factions[seat] as FactionIdV7,
      );
      const wanted = Math.max(1, unitRule.range);
      const free = (to: CoordV7): boolean =>
        to.x >= 0 &&
        to.y >= 0 &&
        to.x < state.board.width &&
        to.y < state.board.height &&
        !state.units.some((other) => same(other.at, to)) &&
        state.board.tiles.find((tile) => same(tile.at, to))?.site == null;
      const path: CoordV7[] = [];
      let current = unit.at;
      for (let moved = 0; moved < (away ? 1 : unitRule.move); moved += 1) {
        if (!away && cheb(current, target) <= wanted) break;
        let next: CoordV7 | null = null;
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            const to = at(current.x + dx, current.y + dy);
            if ((dx === 0 && dy === 0) || !free(to)) continue;
            const base = next ?? current;
            const manhattan = (where: CoordV7): number =>
              Math.abs(where.x - target.x) + Math.abs(where.y - target.y);
            const better = away
              ? cheb(to, target) > cheb(base, target)
              : cheb(to, target) < cheb(base, target) ||
                (next !== null &&
                  cheb(to, target) === cheb(next, target) &&
                  manhattan(to) < manhattan(next));
            if (better) next = to;
          }
        if (next === null) break;
        path.push(next);
        current = next;
      }
      // The longest prefix of the walk the engine accepts (a zone of
      // control may end it earlier).
      for (let length = path.length; length > 0; length -= 1)
        if (
          apply({ kind: "MOVE", unitId: unit.id, path: path.slice(0, length) })
        ) {
          moves += 1;
          break;
        }
    };
    const own = state.units
      .filter((unit) => unit.ownerId === actor)
      .map((unit) => unit.id);
    for (const id of own) {
      const unit = state.units.find((item) => item.id === id);
      if (unit === undefined) continue;
      const beside = state.units.some(
        (other) =>
          other.ownerId !== actor &&
          cheb(other.at, unit.at) === 1 &&
          effectiveRoleRuleV7(other.role, factions[1 - seat] as FactionIdV7)
            .range <= 1,
      );
      if (side.mode === "KITE" && beside) {
        step(id, true);
        strike(id);
        continue;
      }
      if (strike(id)) continue;
      if (side.mode === "ADVANCE") {
        step(id, false);
        strike(id);
      }
    }
    lines.push(
      `  - ${SIDE[factions[seat] as FactionIdV7] ?? "?"}, turn ${Math.floor(turn / 2) + 1}: ${attacks} attacks, ${damage} damage, ${kills} kills${bites > 0 ? `, ${bites} bites` : ""}${risen > 0 ? `, ${risen} risen` : ""}${moves > 0 ? `, ${moves} moves` : ""}. ${SIDE[factions[0]] ?? "?"}: ${summary(0)}. ${SIDE[factions[1]] ?? "?"}: ${summary(1)}.`,
    );
    apply({ kind: "END_TURN" });
    if (
      !state.units.some((unit) => seatOf(unit.ownerId) === 0) ||
      !state.units.some((unit) => seatOf(unit.ownerId) === 1)
    )
      break;
  }
  return lines;
}

export const SCENARIO_HELPERS_V7 = {
  play,
  battle,
  attack,
  frenzy,
  wailStep,
  raise,
  devour,
  kaboom,
  tend,
  endTurn,
  note,
  move,
  at,
};

function technology(): string[] {
  const tree = factionTreeV7("UNDEAD");
  const lines = [
    "| Branch | Technology | Tier | After | Cost with 1 / 4 / 8 cities | Unlocks (as coded) |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const node of tree.nodes) {
    if (node.branch === "NAVAL") continue;
    const unlocks = node.unlocks
      .map((unlock) =>
        unlock.kind === "COMMAND"
          ? unlock.command
          : unlock.kind === "UNIT_ROLE"
            ? `unit ${effectiveRoleRuleV7(unlock.role, "UNDEAD").label}`
            : unlock.kind === "RESOURCE_REVEAL"
              ? `reveals ${unlock.resources.join(", ")}`
              : unlock.kind,
      )
      .join(", ");
    lines.push(
      `| ${node.branch} | ${node.id} | ${node.tier} | ${node.prerequisites.join(", ") || "—"} | ${[1, 4, 8].map((cities) => playerTechnologyResearchCostV7(node.tier, 1, cities)).join(" / ")} | ${unlocks} |`,
    );
  }
  return lines;
}

function prices(): string[] {
  const tree = factionTreeV7("UNDEAD");
  const lines = [
    "| Unit | Technology (tier) | Cost | Hired | HP | Atk / Def | Move | Range | Acts after moving | Abilities | A city of income 3 / 5 / 7 pays for one a turn |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const role of LAND_ROLES) {
    const value = effectiveRoleRuleV7(role, "UNDEAD");
    const tier =
      value.technology === null
        ? "—"
        : `${value.technology} (${String(tree.nodes.find((node) => node.id === value.technology)?.tier ?? "?")})`;
    lines.push(
      `| ${value.label} | ${tier} | ${value.cost ?? "reward"} | ${value.cost === null ? "—" : hireCostV7(value.cost)} | ${value.maxHp} | ${half(value.attack2)} / ${half(value.defense2)} | ${value.move} | ${value.minimumRange === value.range ? value.range : `${value.minimumRange}-${value.range}`} | ${value.mayUsePrimaryActionAfterMove ? "yes" : "no"} | ${value.abilities.filter((ability) => ability !== "ATTACK" && ability !== "CAPTURE").join(", ") || "—"} | ${value.cost === null ? "—" : [3, 5, 7].map((income) => ((value.cost ?? 0) <= income ? "yes" : "no")).join(" / ")} |`,
    );
  }
  lines.push(
    "",
    `Unit slots of an Undead city: ${[1, 2, 3, 4, 5].map((level) => `L${level} ${cityUnitCapacityForV7(level, [], "UNDEAD")}/${cityUnitCapacityForV7(level, ["GATHERING", "ADMINISTRATION", "PLANNING"], "UNDEAD")}`).join(", ")} (without / with Planning), as for the Humans; a rising is not held back by the limit.`,
  );
  return lines;
}

const part = process.argv[2] ?? "all";
const out: string[] = [
  `<!-- ${RULESET_7_ID}, scripts/undead-tuning-analysis-v7.ts ${part} -->`,
  "",
];
if (part === "all" || part === "matrix")
  out.push("### Matchup matrix", "", ...matrix());
if (part === "all" || part === "wail")
  out.push("### The Banshee's Wail", "", ...wail(), "");
if (part === "all" || part === "reverse")
  out.push("### The reverse", "", ...reverse());
if (part === "all" || part === "scenarios")
  out.push("### Scenarios", "", ...undeadScenariosV7(SCENARIO_HELPERS_V7), "");
if (part === "all" || part === "technology")
  out.push("### Undead technologies", "", ...technology(), "");
if (part === "all" || part === "prices")
  out.push("### Undead price list", "", ...prices(), "");
process.stdout.write(`${out.join("\n")}\n`);
