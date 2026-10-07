/**
 * The Martian faction pass (`pulp_wars-w49.14`,
 * docs/product/RULESET_7_TUNING_MARTIAN.md): deterministic unit-level numbers
 * from the engine's exact public combat preview on constructed positions,
 * small played-out scenarios resolved by the reducer, and the Martian
 * technology and price lists. It plays no match and draws no conclusion; the
 * document does.
 *
 *   npx tsx scripts/martian-tuning-analysis-v7.ts            (everything)
 *   npx tsx scripts/martian-tuning-analysis-v7.ts matrix     (one part:
 *     matrix | reverse | fortification | scenarios | technology | prices)
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
  unitShieldMaximumV7,
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
import { martianScenariosV7 } from "./martian-tuning-scenarios-v7";

interface KindV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  /** A Saucer or Raider that moved two tiles (Strafe or Charge with Raiding). */
  readonly charging?: boolean;
  /** A heat ray at half power (the unit moved, or is Cooling). */
  readonly halfPower?: boolean;
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
const MARTIANS = kinds("MARTIAN", LAND_ROLES);
const HUMANS = kinds("ORIGINAL", HUMAN_ROLES);
const GOBLINS = kinds("GOBLIN", LAND_ROLES);
const UNDEAD = kinds("UNDEAD", LAND_ROLES);

const rule = (kind: KindV7) => effectiveRoleRuleV7(kind.role, kind.faction);
const hasRay = (kind: KindV7): boolean =>
  rule(kind).abilities.includes("HEAT_RAY");
/** Attacker rows: a ray at full and at half power, a fast unit with its Charge. */
const variants = (list: readonly KindV7[]): readonly KindV7[] =>
  list.flatMap((kind) =>
    hasRay(kind)
      ? [kind, { ...kind, halfPower: true }]
      : kind.role === "RAIDER"
        ? [kind, { ...kind, charging: true }]
        : [kind],
  );
const name = (kind: KindV7): string =>
  `${rule(kind).label}${
    kind.halfPower === true
      ? " (half power)"
      : hasRay(kind)
        ? " (full power)"
        : kind.charging === true
          ? kind.faction === "MARTIAN"
            ? " (Strafe)"
            : " (Charge)"
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
    title: "Field Defense (+2 Defense), the attacker without the Disintegrator",
    short: "Field Defense",
    terrain: "FIELD_DEFENSE",
  },
  {
    title:
      "Walled city center (+2 Defense), the attacker without the Disintegrator",
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

/** A piece of the arena: a Martian unit's Shield and Cooling may be set. */
export type MartianPieceV7 = GoblinPieceV7 & {
  readonly tag?: string;
  /** The Shield it starts with (default: its maximum; 0 for no Shield). */
  readonly shield?: number;
  /** It fired at full power on its owner's last turn. */
  readonly cooling?: boolean;
};

export interface GroundV7 {
  readonly forest?: readonly CoordV7[];
  readonly fieldDefense?: readonly CoordV7[];
  /** Seat 1's capital at (2, 8) has City Walls. */
  readonly walls?: boolean;
  /** Technologies seat 0 / seat 1 do not own (Explosives is out by default). */
  readonly lacks?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  /** Seat 0 / seat 1 own Explosives (a Martian seat's Disintegrator). */
  readonly explosives?: readonly [boolean, boolean];
  /**
   * A Martian seat owns Heat Sinks (its Fieldcraft: Ray Gunners do not
   * overheat). Without this no Martian seat of the arena owns it.
   */
  readonly heatSinks?: boolean;
  /** The units on these tiles are Bitten by seat 0. */
  readonly bitten?: readonly CoordV7[];
  /** Tiles the given seat has not explored. */
  readonly unexplored?: {
    readonly seat: number;
    readonly tiles: readonly CoordV7[];
  };
  readonly activeSeat?: number;
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
 * pieces, and the given ground. Neither seat has Explosives unless
 * `explosives` says so (no Breach, no Disintegrator), and a Martian seat
 * has no Heat Sinks unless `heatSinks` says so; it has Force Fields unless
 * `lacks` names Fortification. Every Martian unit
 * starts with its Shield maximum unless the piece says otherwise. With
 * `walls`, seat 1's capital is a level-3 city (three Farms south of it) that
 * took Walls.
 */
export function arena(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly MartianPieceV7[],
  ground: GroundV7 = {},
): GameStateV7 {
  const base = goblinArenaV7(factions, pieces, {
    activeSeat: ground.activeSeat ?? 0,
    techs: {
      0: without(
        factions[0],
        ...(ground.explosives?.[0] === true ? [] : (["EXPLOSIVES"] as const)),
        ...(factions[0] === "MARTIAN" && ground.heatSinks !== true
          ? (["FIELDCRAFT"] as const)
          : []),
        ...(ground.lacks?.[0] ?? []),
      ),
      1: without(
        factions[1],
        ...(ground.explosives?.[1] === true ? [] : (["EXPLOSIVES"] as const)),
        ...(factions[1] === "MARTIAN" && ground.heatSinks !== true
          ? (["FIELDCRAFT"] as const)
          : []),
        ...(ground.lacks?.[1] ?? []),
      ),
    },
  });
  const seatOne = base.players.find((player) => player.seat === 1);
  const walls = ground.walls === true;
  const farm = (where: CoordV7): boolean =>
    walls && WALL_FARMS.some((item) => same(item, where));
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
  const pieceAt = (where: CoordV7): MartianPieceV7 | undefined =>
    pieces.find((piece) => same(piece.at, where));
  const shields = base.units
    .flatMap((unit) => {
      const maximum = unitShieldMaximumV7(base, unit);
      if (maximum === 0) return [];
      const shield = pieceAt(unit.at)?.shield ?? maximum;
      return shield > 0 ? [{ unitId: unit.id, shield }] : [];
    })
    .sort((left, right) => left.unitId - right.unitId);
  const cooling = base.units
    .filter((unit) => pieceAt(unit.at)?.cooling === true)
    .map((unit) => ({ unitId: unit.id, firedThisTurn: false }))
    .sort((left, right) => left.unitId - right.unitId);
  const hidden = ground.unexplored?.tiles ?? [];
  const hiddenSeat = ground.unexplored?.seat ?? -1;
  return {
    ...base,
    bitten,
    shields,
    cooling,
    players: base.players.map((player) =>
      hidden.length === 0 || player.seat !== hiddenSeat
        ? player
        : {
            ...player,
            explored: player.explored.filter(
              (where) => !hidden.some((item) => same(item, where)),
            ),
          },
    ),
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

export const unitAt = (state: GameStateV7, where: CoordV7): UnitStateV7 => {
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

interface PreviewOptionsV7 {
  readonly inspired?: boolean;
  readonly defenderHp?: number;
  /** The defender's Shield (default: its maximum). */
  readonly defenderShield?: number;
  /** The attacker's seat owns Explosives (the Disintegrator, Breach). */
  readonly explosives?: boolean;
}

/**
 * One attack of the matrix: the target on its context tile, the attacker at
 * its full range (a melee unit next to it) on the same row or column, and
 * Psychic Command, Rally, Frenzy, or WAAAGH! (the Inspired flag) when
 * `inspired`.
 */
function previewOf(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
  options: PreviewOptionsV7 = {},
): CombatPreviewV7 | null {
  const attackerRule = rule(attacker);
  if (!attackerRule.abilities.includes("ATTACK")) return null;
  const distance = Math.max(attackerRule.minimumRange, attackerRule.range);
  const to = targetTile(terrain);
  const from =
    terrain === "WALLS" || terrain === "FIELD_DEFENSE"
      ? at(to.x, to.y - distance)
      : at(to.x + distance, to.y);
  const pieces: MartianPieceV7[] = [
    {
      seat: 0,
      role: attacker.role,
      at: from,
      ...(attacker.halfPower === true ? { cooling: true } : {}),
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
      ...(options.defenderShield === undefined
        ? {}
        : { shield: options.defenderShield }),
    },
  ];
  const state = arena([attacker.faction, defender.faction], pieces, {
    ...(terrain === "FOREST" ? { forest: [to] } : {}),
    ...(terrain === "FIELD_DEFENSE" ? { fieldDefense: [to] } : {}),
    walls: terrain === "WALLS",
    ...(options.explosives === true ? { explosives: [true, false] } : {}),
  });
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  return queryCombatPreviewV7(
    viewForV7(state, actor),
    unitAt(state, from).id,
    unitAt(state, to).id,
  );
}

/**
 * Attacks by fresh full-HP attackers of the kind that kill the defender in
 * one turn: the defender's Shield (`shield`, default its maximum) absorbs
 * once and does not recharge between them.
 */
function attacksToKill(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
  shield?: number,
): string {
  let hp = rule(defender).maxHp;
  let left = shield ?? roleMechanicsV7(defender.role, defender.faction).shield;
  let hits = 0;
  while (hp > 0 && hits < 30) {
    const preview = previewOf(attacker, defender, terrain, {
      defenderHp: hp,
      defenderShield: left,
    });
    if (preview === null) break;
    if (preview.damageToDefender + preview.defenderShieldDamage <= 0) break;
    hp -= preview.damageToDefender;
    left -= preview.defenderShieldDamage;
    hits += 1;
  }
  return hp > 0 ? "∞" : String(hits);
}

const whole = (preview: CombatPreviewV7): number =>
  preview.damageToDefender + preview.defenderShieldDamage;
const dealt = (preview: CombatPreviewV7 | null): string =>
  preview === null
    ? "—"
    : `${preview.damageToDefender}${preview.defenderDies ? "K" : ""}`;

/**
 * A cell of a Martian attacker: `dealt/taken ×attacks`, then `p` the damage
 * with Psychic Command. `taken` is the whole retaliation hit, of which the
 * attacker's Shield absorbs the first points.
 */
function cell(attacker: KindV7, defender: KindV7, terrain: TerrainV7): string {
  const plain = previewOf(attacker, defender, terrain);
  if (plain === null) return "—";
  const inspired = previewOf(attacker, defender, terrain, { inspired: true });
  const taken = plain.damageToAttacker + plain.attackerShieldDamage;
  // Psychic Command never reaches a siege or a support unit (the Tripod, the
  // Brain).
  const unreached =
    rule(attacker).tacticalRole === "SUPPORT" ||
    rule(attacker).tacticalRole === "SIEGE";
  return `${dealt(plain)}/${taken} ×${attacksToKill(attacker, defender, terrain)}${unreached || inspired === null || !inspired.inspiredApplied ? "" : `; p ${dealt(inspired)}`}`;
}

/**
 * A cell of an attack on a Martian unit: the whole hit, what it takes back,
 * and the attacks that kill it in one turn with its Shield up / in a Force
 * Field (Shield 4) / with its Shield down.
 */
function reverseCell(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
): string {
  const plain = previewOf(attacker, defender, terrain);
  if (plain === null) return "—";
  const maximum = roleMechanicsV7(defender.role, defender.faction).shield;
  const kills = (shield: number): string =>
    attacksToKill(attacker, defender, terrain, shield);
  const one = (shield: number): string => {
    const preview = previewOf(attacker, defender, terrain, {
      defenderShield: shield,
    });
    return preview !== null && preview.defenderDies ? "K" : "";
  };
  return `${whole(plain)}/${plain.damageToAttacker} ×${kills(maximum)}${one(maximum)} · ${kills(Math.max(maximum, 4))}${one(Math.max(maximum, 4))} · ${kills(0)}${one(0)}`;
}

function table(
  attackers: readonly KindV7[],
  defenders: readonly KindV7[],
  contexts: readonly TerrainV7[],
  cellOf: (attacker: KindV7, defender: KindV7, terrain: TerrainV7) => string,
): string[] {
  const lines: string[] = [];
  const header = `| Attacker (cost, HP, Atk/Def) | ${defenders.map((kind) => `${rule(kind).label} ${rule(kind).cost ?? "—"}c ${rule(kind).maxHp}hp`).join(" | ")} |`;
  for (const context of CONTEXTS) {
    if (!contexts.includes(context.terrain)) continue;
    lines.push(`**${context.title}**`, "", header);
    lines.push(`| --- | ${defenders.map(() => "---").join(" | ")} |`);
    for (const attacker of attackers) {
      const value = rule(attacker);
      lines.push(
        `| ${name(attacker)} (${value.cost ?? "—"}c, ${value.maxHp}, ${half(value.attack2)}/${half(value.defense2)}) | ${defenders.map((defender) => cellOf(attacker, defender, context.terrain)).join(" | ")} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

const ALL: readonly TerrainV7[] = ["OPEN", "FOREST", "FIELD_DEFENSE", "WALLS"];
const LEGEND =
  "Each cell: HP damage dealt / the whole hit taken back in the first attack (both units at full HP) and × the number of attacks by fresh full-HP attackers of that kind that kill the defender; then `p` the damage with Psychic Command (+1 Attack; a Tripod and a Brain are never Inspired). `K` is a kill of the full-HP defender. A Grunt, a Ray Gunner, a Tripod, and a Colossus attack from two tiles, the others from the next tile. A heat ray is at full power when the unit has not moved and is not Cooling, otherwise at half power; a Saucer marked (Strafe) has moved two tiles with Raiding. Of the hit a Martian attacker takes back its Shield absorbs the first 2 points (a Shield Projector and a Colossus 3, a Mothership 4, any unit in a Force Field 4).";
const REVERSE_LEGEND =
  "Each cell: the whole hit on the full-HP Martian unit / the damage the attacker takes back, then the number of attacks by fresh full-HP attackers of that kind that kill it **in one turn** (the Shield absorbs once and recharges at its owner's next turn): with its Shield up · in a Force Field (Shield 4) · with its Shield down. `K` after a count of 1 is a kill in one attack. Ranged units attack from their full range; a unit marked (Charge) has moved two tiles with Raiding. No Goblin attacker has Gang Up here (the attacker alone), and no Lich plagues.";

function matrix(): string[] {
  return [
    LEGEND,
    "",
    "#### Martian attackers on Human units",
    "",
    ...table(variants(MARTIANS), HUMANS, ALL, cell),
    "#### Martian attackers on Goblin units",
    "",
    ...table(variants(MARTIANS), GOBLINS, ALL, cell),
    "#### Martian attackers on Undead units",
    "",
    ...table(variants(MARTIANS), UNDEAD, ALL, cell),
    "#### Martian attackers on Martian units (Shield up)",
    "",
    ...table(variants(MARTIANS), MARTIANS, ["OPEN"], reverseCell),
  ];
}

function reverse(): string[] {
  const grounds: readonly TerrainV7[] = ["OPEN", "FOREST", "WALLS"];
  return [
    REVERSE_LEGEND,
    "",
    "Machines (Saucer, Tripod, Mothership, Colossus) never have cover or fortification: their Forest and walled-center cells equal the open ones.",
    "",
    "#### Human attackers on Martian units",
    "",
    ...table(variants(HUMANS), MARTIANS, grounds, reverseCell),
    "#### Goblin attackers on Martian units (no Gang Up: the attacker alone)",
    "",
    ...table(variants(GOBLINS), MARTIANS, grounds, reverseCell),
    "#### Undead attackers on Martian units",
    "",
    ...table(
      variants(UNDEAD).filter((kind) => !rule(kind).abilities.includes("WAIL")),
      MARTIANS,
      grounds,
      reverseCell,
    ),
  ];
}

/** Rays against fortified units, with and without the Disintegrator. */
function fortification(): string[] {
  const targets: readonly KindV7[] = [
    { faction: "ORIGINAL", role: "FIGHTER" },
    { faction: "ORIGINAL", role: "GUARD" },
    { faction: "ORIGINAL", role: "SWORDSMAN" },
    { faction: "ORIGINAL", role: "MARKSMAN" },
    { faction: "UNDEAD", role: "GUARD" },
    { faction: "GOBLIN", role: "GUARD" },
  ];
  const lines = [
    "A full-HP target on a Field Defense or a walled city center; the damage of one attack from two tiles without / with the Disintegrator (the Martian Explosives: heat rays ignore Walls and Field Defense; the Grunt's pistol is no heat ray, and Breach is for attacks from the next tile).",
    "",
    `| Attacker | Ground | ${targets.map((kind) => `${rule(kind).label} ${rule(kind).maxHp}hp`).join(" | ")} |`,
    `| --- | --- | ${targets.map(() => "---").join(" | ")} |`,
  ];
  const attackers = variants(MARTIANS).filter(
    (kind) => kind.role === "FIGHTER" || hasRay(kind),
  );
  for (const attacker of attackers)
    for (const terrain of ["FIELD_DEFENSE", "WALLS"] as const)
      lines.push(
        `| ${name(attacker)} | ${terrain === "WALLS" ? "walled center" : "Field Defense"} | ${targets.map((target) => `${dealt(previewOf(attacker, target, terrain))} / ${dealt(previewOf(attacker, target, terrain, { explosives: true }))}`).join(" | ")} |`,
      );
  return lines;
}

// ------------------------------------------------------------ played ---

interface StepV7 {
  readonly kind:
    | "ATTACK"
    | "RALLY"
    | "END_TURN"
    | "MOVE"
    | "WAIL"
    | "KABOOM"
    | "TEND"
    | "TRACTOR_BEAM"
    | "MIND_CONTROL"
    | "BEAM_DOWN"
    | "NOTE";
  /** The acting unit's tag. */
  readonly unit?: string;
  /** The target's tag (an attack, a pull, a Mind Control, a passenger). */
  readonly target?: string;
  /** The path (a Move) or the one landing tile (a Beam Down). */
  readonly path?: readonly CoordV7[];
  readonly text?: string;
}
const attack = (unit: string, target: string): StepV7 => ({
  kind: "ATTACK",
  unit,
  target,
});
const rally = (unit: string): StepV7 => ({ kind: "RALLY", unit });
const wailStep = (unit: string): StepV7 => ({ kind: "WAIL", unit });
const kaboom = (unit: string): StepV7 => ({ kind: "KABOOM", unit });
const tend = (unit: string): StepV7 => ({ kind: "TEND", unit });
const pull = (unit: string, target: string): StepV7 => ({
  kind: "TRACTOR_BEAM",
  unit,
  target,
});
const control = (unit: string, target: string): StepV7 => ({
  kind: "MIND_CONTROL",
  unit,
  target,
});
const beam = (unit: string, target: string, to: CoordV7): StepV7 => ({
  kind: "BEAM_DOWN",
  unit,
  target,
  path: [to],
});
const endTurn: StepV7 = { kind: "END_TURN" };
const note = (text: string): StepV7 => ({ kind: "NOTE", text });
const move = (unit: string, ...path: CoordV7[]): StepV7 => ({
  kind: "MOVE",
  unit,
  path,
});

const SIDE: Readonly<Partial<Record<FactionIdV7, string>>> = {
  MARTIAN: "Martians",
  UNDEAD: "Undead",
  ORIGINAL: "Humans",
  GOBLIN: "Goblins",
};

const shieldIn = (state: GameStateV7, id: number): number =>
  state.shields.find((entry) => entry.unitId === id)?.shield ?? 0;

/**
 * Plays the steps with the reducer and reports each from its events. A step
 * whose unit or target is gone, or that the engine refuses, says so. A
 * rising is tagged `rise1`, `rise2`, … in the order it appears.
 */
function play(
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly MartianPieceV7[],
  steps: readonly StepV7[],
  ground: GroundV7 = {},
): string[] {
  const lines = [`- **${title}**`];
  let state = arena(factions, pieces, ground);
  const ids = new Map<string, number>();
  for (const piece of pieces)
    if (piece.tag !== undefined) ids.set(piece.tag, unitAt(state, piece.at).id);
  const kindOf = new Map<number, FactionIdV7>();
  for (const unit of state.units)
    kindOf.set(
      unit.id,
      state.players.find((player) => player.id === unit.ownerId)?.faction ??
        "ORIGINAL",
    );
  let risings = 0;
  const label = (unit: Pick<UnitStateV7, "id" | "role">): string =>
    effectiveRoleRuleV7(unit.role, kindOf.get(unit.id) ?? "ORIGINAL").label;
  const sideOf = (source: GameStateV7, ownerId: number): string => {
    const owner = source.players.find((player) => player.id === ownerId);
    return SIDE[owner?.faction ?? "ORIGINAL"] ?? "?";
  };
  const health = (source: GameStateV7, unit: UnitStateV7): string => {
    const shield = shieldIn(source, unit.id);
    return `${unit.hp}${shield > 0 ? `+${shield}` : ""}`;
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
      return `${unit.ownerId === actor ? "own " : ""}${label(unit)}`;
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
      const who = `${label(unit)} (${health(state, unit)})`;
      const target = find(step.target);
      const needsTarget =
        step.kind === "ATTACK" ||
        step.kind === "TRACTOR_BEAM" ||
        step.kind === "MIND_CONTROL" ||
        step.kind === "BEAM_DOWN";
      if (needsTarget && target === undefined) {
        lines.push(`  - ${label(unit)}: its target is gone`);
        continue;
      }
      const targetText =
        target === undefined
          ? ""
          : `${label(target)} (${health(state, target)})`;
      if (step.kind === "ATTACK") {
        command = {
          kind: "ATTACK",
          unitId: unit.id,
          targetUnitId: (target as UnitStateV7).id,
        };
        head = `${who} attacks ${targetText}`;
      } else if (step.kind === "TRACTOR_BEAM") {
        command = {
          kind: "TRACTOR_BEAM",
          unitId: unit.id,
          targetUnitId: (target as UnitStateV7).id,
        };
        head = `${label(unit)} pulls ${targetText}`;
      } else if (step.kind === "MIND_CONTROL") {
        command = {
          kind: "MIND_CONTROL",
          unitId: unit.id,
          targetUnitId: (target as UnitStateV7).id,
        };
        head = `${label(unit)} takes control of ${targetText}`;
      } else if (step.kind === "BEAM_DOWN") {
        command = {
          kind: "BEAM_DOWN",
          unitId: unit.id,
          passengerUnitId: (target as UnitStateV7).id,
          to: (step.path ?? [])[0] as CoordV7,
        };
        head = `${label(unit)} beams ${label(target as UnitStateV7)} down beside it`;
      } else if (step.kind === "MOVE") {
        command = {
          kind: "MOVE",
          unitId: unit.id,
          path: [...(step.path ?? [])],
        };
        head = `${label(unit)} moves ${(step.path ?? []).length} tile${(step.path ?? []).length === 1 ? "" : "s"}`;
      } else if (step.kind === "RALLY") {
        command = { kind: "RALLY", unitId: unit.id };
        const kind = kindOf.get(unit.id);
        head = `${label(unit)} calls ${kind === "MARTIAN" ? "Psychic Command" : kind === "UNDEAD" ? "Frenzy" : kind === "GOBLIN" ? "WAAAGH!" : "Rally"}`;
      } else if (step.kind === "WAIL") {
        command = { kind: "WAIL", unitId: unit.id };
        head = `${who} Wails`;
      } else if (step.kind === "TEND") {
        command = { kind: "TEND_WOUNDED", unitId: unit.id };
        head = `${label(unit)} tends the wounded`;
      } else {
        command = { kind: "KABOOM", unitId: unit.id };
        head = `${who} Kabooms`;
      }
    }
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) {
      const params = (result.error as { params?: { reason?: string } }).params;
      lines.push(
        `  - ${head}: refused (${result.error.code}${params?.reason === undefined ? "" : ` ${params.reason}`})`,
      );
      continue;
    }
    state = result.state;
    const parts: string[] = [];
    const list = (
      entries: readonly {
        readonly unitId: number;
        readonly damage: number;
        readonly dies: boolean;
        readonly shieldDamage?: number;
      }[],
    ): string =>
      entries
        .map(
          (entry) =>
            `${entry.damage}${(entry.shieldDamage ?? 0) > 0 ? ` (Shield ${entry.shieldDamage})` : ""} on ${describe(entry.unitId)}${entry.dies ? " (kills)" : ""}`,
        )
        .join(", ");
    for (const event of result.events as readonly DomainEventV7[]) {
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        parts.push(
          `${preview.rayPower === "NONE" ? "" : `${preview.rayPower === "FULL" ? "full" : "half"} power, `}deals ${preview.damageToDefender}${preview.defenderShieldDamage > 0 ? ` (Shield ${preview.defenderShieldDamage})` : ""}${preview.defenderDies ? " (kills)" : ""}, takes ${preview.damageToAttacker}${preview.attackerShieldDamage > 0 ? ` (Shield ${preview.attackerShieldDamage})` : ""}${preview.attackerDies ? " (dies)" : ""}${preview.attackerHeal > 0 ? `, heals ${preview.attackerHeal}` : ""}${preview.inspiredApplied ? ", inspired" : ""}${preview.chargeApplied ? ", Charge" : ""}${preview.gangUp > 0 ? `, Gang Up +${preview.gangUp}` : ""}${preview.fortificationIgnored > 0 ? ", ignores the fortification" : ""}${preview.defenderBitten ? ", bites" : ""}${preview.attackerBitten ? ", is bitten" : ""}${preview.advances ? ", advances" : ""}${preview.overrunContinues ? ", attacks again" : ""}`,
        );
        if (preview.splash.length > 0)
          parts.push(`also hits ${list(preview.splash)}`);
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
        kindOf.set(event.unitId, "UNDEAD");
        parts.push(
          `${describe(event.victimUnitId)} rises as a Zombie of the ${sideOf(state, event.playerId)}${event.kind === "BITTEN_UNIT_RISEN" ? " (it was Bitten)" : ""}`,
        );
      } else if (event.kind === "PLAGUE_DAMAGED")
        parts.push(
          `Plague: ${event.results.map((entry) => `${entry.damage} on ${describe(entry.unitId)}${entry.dies ? " (kills)" : ""}`).join(", ")}`,
        );
      else if (event.kind === "PLUNDER_AWARDED")
        parts.push(`Plunder +${event.coins}`);
      else if (event.kind === "WOUNDED_TENDED")
        parts.push(`${event.results.length} tended`);
      else if (event.kind === "UNIT_PULLED")
        parts.push(
          `pulled ${event.path.length} tile${event.path.length === 1 ? "" : "s"}`,
        );
      else if (event.kind === "UNIT_MIND_CONTROLLED")
        parts.push("it is theirs");
      else if (event.kind === "UNIT_RELEASED")
        parts.push(`${describe(event.unitId)} is released to its owner`);
      else if (event.kind === "UNIT_BEAMED") parts.push("set down");
      else if (event.kind === "TILES_REVEALED")
        parts.push(
          `${sideOf(state, event.playerId)} see ${event.tiles.length} new tile${event.tiles.length === 1 ? "" : "s"}`,
        );
      else if (event.kind === "SHIELDS_RECHARGED")
        parts.push(`${event.results.length} Shields recharge`);
      else if (event.kind === "CITY_CAPTURED") parts.push("the city is taken");
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
      .map((unit) => `${label(unit)} ${health(state, unit)}`)
      .join(", ") || "nothing";
  lines.push(
    `  - Left: ${SIDE[factions[0]] ?? "?"} ${left(0)}; ${SIDE[factions[1]] ?? "?"} ${left(1)}.`,
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
 * turn: attacks, kills, bites, risings, and what stands at its end (a
 * Martian unit as HP+Shield).
 */
function battle(
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly MartianPieceV7[],
  sides: readonly [BattleSideV7, BattleSideV7],
  turns: number,
  ground: GroundV7 = {},
): string[] {
  const lines = [`- **${title}**`];
  let state = arena(factions, pieces, ground);
  const seatOf = (ownerId: number): number =>
    state.players.find((player) => player.id === ownerId)?.seat ?? -1;
  const kindOf = new Map<number, FactionIdV7>();
  for (const unit of state.units)
    kindOf.set(unit.id, factions[seatOf(unit.ownerId)] as FactionIdV7);
  const ruleOf = (unit: Pick<UnitStateV7, "id" | "role" | "ownerId">) =>
    effectiveRoleRuleV7(
      unit.role,
      kindOf.get(unit.id) ?? (factions[seatOf(unit.ownerId)] as FactionIdV7),
    );
  const cheb = (left: CoordV7, right: CoordV7): number =>
    Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
  const summary = (seat: number): string => {
    const counts = new Map<string, string[]>();
    for (const unit of state.units)
      if (seatOf(unit.ownerId) === seat) {
        const shield = shieldIn(state, unit.id);
        counts.set(ruleOf(unit).label, [
          ...(counts.get(ruleOf(unit).label) ?? []),
          `${unit.hp}${shield > 0 ? `+${shield}` : ""}`,
        ]);
      }
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
        ) {
          risen += 1;
          kindOf.set(event.unitId, "UNDEAD");
        }
      }
      return true;
    };
    const strike = (unitId: number): boolean => {
      const unit = state.units.find((item) => item.id === unitId);
      if (unit === undefined) return false;
      const unitRule = ruleOf(unit);
      if (unitRule.abilities.includes("WAIL"))
        return apply({ kind: "WAIL", unitId: unit.id });
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
        const price = ruleOf(target).cost ?? 8;
        const score =
          (preview.defenderDies ? 1000 + 10 * price : 0) +
          10 * (preview.damageToDefender + preview.defenderShieldDamage) +
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
      const unitRule = ruleOf(unit);
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
          ruleOf(other).range <= 1,
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
      `  - ${SIDE[factions[seat] as FactionIdV7] ?? "?"}, turn ${Math.floor(turn / 2) + 1}: ${attacks} attacks, ${damage} HP damage, ${kills} kills${bites > 0 ? `, ${bites} bites` : ""}${risen > 0 ? `, ${risen} risen` : ""}${moves > 0 ? `, ${moves} moves` : ""}. ${SIDE[factions[0]] ?? "?"}: ${summary(0)}. ${SIDE[factions[1]] ?? "?"}: ${summary(1)}.`,
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
  rally,
  wailStep,
  kaboom,
  tend,
  pull,
  control,
  beam,
  endTurn,
  note,
  move,
  at,
};
export type ScenarioHelpersV7 = typeof SCENARIO_HELPERS_V7;

function technology(): string[] {
  const tree = factionTreeV7("MARTIAN");
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
            ? `unit ${effectiveRoleRuleV7(unlock.role, "MARTIAN").label}`
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
  const tree = factionTreeV7("MARTIAN");
  const lines = [
    "| Unit | Technology (tier) | Cost | Hired | Slots | HP | Shield | Atk / Def | Move | Range | Acts after moving | Abilities | A city of income 3 / 5 / 7 pays for one a turn |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const role of LAND_ROLES) {
    const value = effectiveRoleRuleV7(role, "MARTIAN");
    const mechanics = roleMechanicsV7(role, "MARTIAN");
    const tier =
      value.technology === null
        ? "—"
        : `${value.technology} (${String(tree.nodes.find((node) => node.id === value.technology)?.tier ?? "?")})`;
    lines.push(
      `| ${value.label} | ${tier} | ${value.cost ?? "reward"} | ${value.cost === null ? "—" : hireCostV7(value.cost)} | ${mechanics.capacitySlots} | ${value.maxHp} | ${mechanics.shield} | ${half(value.attack2)} / ${half(value.defense2)} | ${value.move} | ${value.minimumRange === value.range ? value.range : `${value.minimumRange}-${value.range}`} | ${value.mayUsePrimaryActionAfterMove ? "yes" : "no"} | ${value.abilities.filter((ability) => ability !== "ATTACK" && ability !== "CAPTURE").join(", ") || "—"} | ${value.cost === null ? "—" : [3, 5, 7].map((income) => ((value.cost ?? 0) <= income ? "yes" : "no")).join(" / ")} |`,
    );
  }
  lines.push(
    "",
    `Unit slots of a Martian city: ${[1, 2, 3, 4, 5].map((level) => `L${level} ${cityUnitCapacityForV7(level, [], "MARTIAN")}/${cityUnitCapacityForV7(level, ["GATHERING", "ADMINISTRATION", "PLANNING"], "MARTIAN")}`).join(", ")} (without / with Planning), as for the Humans; a Mothership and a Colossus fill two, a mind-controlled unit none.`,
  );
  return lines;
}

if (process.argv[1]?.endsWith("martian-tuning-analysis-v7.ts") === true) {
  const part = process.argv[2] ?? "all";
  const out: string[] = [
    `<!-- ${RULESET_7_ID}, scripts/martian-tuning-analysis-v7.ts ${part} -->`,
    "",
  ];
  if (part === "all" || part === "matrix")
    out.push("### Matchup matrix", "", ...matrix());
  if (part === "all" || part === "reverse")
    out.push("### The reverse", "", ...reverse());
  if (part === "all" || part === "fortification")
    out.push("### Rays against fortification", "", ...fortification(), "");
  if (part === "all" || part === "scenarios")
    out.push(
      "### Scenarios",
      "",
      ...martianScenariosV7(SCENARIO_HELPERS_V7),
      "",
    );
  if (part === "all" || part === "technology")
    out.push("### Martian technologies", "", ...technology(), "");
  if (part === "all" || part === "prices")
    out.push("### Martian price list", "", ...prices(), "");
  process.stdout.write(`${out.join("\n")}\n`);
}
