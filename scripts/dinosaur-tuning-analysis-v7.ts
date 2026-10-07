/**
 * The Dinosaur faction pass (`pulp_wars-w49.15`,
 * docs/product/RULESET_7_TUNING_DINOSAUR.md): deterministic unit-level
 * numbers from the engine's exact public combat preview on constructed
 * positions, small played-out scenarios resolved by the reducer, and the
 * Dinosaur technology and price lists. It plays no match and draws no
 * conclusion; the document does.
 *
 *   npx tsx scripts/dinosaur-tuning-analysis-v7.ts            (everything)
 *   npx tsx scripts/dinosaur-tuning-analysis-v7.ts matrix     (one part:
 *     matrix | reverse | eggs | fortification | scenarios | technology |
 *     prices)
 *
 * Output is Markdown on stdout.
 */
import {
  EGG_HP_V7,
  GROWTH_HP_V7,
  RULESET_7_ID,
  applyCommandV7,
  cityUnitCapacityForV7,
  effectiveRoleRuleV7,
  eggActivationV7,
  factionTreeV7,
  hireCostV7,
  playerTechnologyResearchCostV7,
  queryCombatPreviewV7,
  roleMechanicsV7,
  unitId,
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
import { dinosaurScenariosV7 } from "./dinosaur-tuning-scenarios-v7";
import {
  SCENARIO_HELPERS_V7,
  arena as baseArena,
  unitAt,
  type GroundV7,
  type MartianPieceV7,
} from "./martian-tuning-analysis-v7";

/** Kills that put a dinosaur at growth stage 0, Big, and Alpha. */
const STAGE_KILLS = [0, 1, 3] as const;
export type StageV7 = 0 | 1 | 2;
const STAGE_NAME = ["", "Big", "Alpha"] as const;

/** A piece of the arena: a dinosaur's growth stage may be set. */
export type DinosaurPieceV7 = MartianPieceV7 & {
  /** Growth stage of a dinosaur (0, 1 Big, 2 Alpha): kills 0, 1, 3. */
  readonly stage?: StageV7;
  /** Kills, when the exact count matters (overrides `stage`). */
  readonly kills?: number;
};

/** An Egg of seat `seat` on a nest tile of its capital. */
export interface EggV7 {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly tag?: string;
  /** Laid with Nesting: 10 HP. */
  readonly nesting?: boolean;
  readonly turnsRemaining?: number;
  readonly laidThisTurn?: boolean;
}

export type DinosaurGroundV7 = GroundV7 & {
  readonly eggs?: readonly EggV7[];
  /** Coins of both seats (default 100). */
  readonly coins?: number;
};

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const at = (x: number, y: number): CoordV7 => ({ x, y });

/**
 * The Martian pass's two-seat arena (seat 0 capital (8, 8), seat 1 capital
 * (2, 8) with territory x 1-3, y 7-9, open Grass elsewhere, neither seat
 * with Explosives unless `explosives` says so) with dinosaurs at the given
 * growth stage and the given Eggs.
 */
export function arena(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly DinosaurPieceV7[],
  ground: DinosaurGroundV7 = {},
): GameStateV7 {
  // A grown unit's HP may exceed its role's maximum, which the base arena
  // checks; it is set below.
  const base = baseArena(
    factions,
    pieces.map((piece) => {
      if ((piece.kills ?? STAGE_KILLS[piece.stage ?? 0]) === 0) return piece;
      const rest: Record<string, unknown> = { ...piece };
      delete rest.hp;
      return rest as typeof piece;
    }),
    ground,
  );
  const factionOf = (ownerId: number): FactionIdV7 =>
    base.players.find((player) => player.id === ownerId)?.faction ?? "ORIGINAL";
  const units = base.units.map((unit): UnitStateV7 => {
    const piece = pieces.find((item) => same(item.at, unit.at));
    const kills = piece?.kills ?? STAGE_KILLS[piece?.stage ?? 0];
    if (kills === 0) return unit;
    const rule = effectiveRoleRuleV7(unit.role, factionOf(unit.ownerId));
    if (!rule.abilities.includes("GROW")) return { ...unit, kills };
    const stage = kills >= 3 ? 2 : kills >= 1 ? 1 : 0;
    const maxHp = rule.maxHp + GROWTH_HP_V7 * stage;
    return { ...unit, kills, maxHp, hp: piece?.hp ?? maxHp };
  });
  const eggs = (ground.eggs ?? []).map((egg, index) => {
    const owner = base.players.find((player) => player.seat === egg.seat);
    const city = base.cities.find((item) => item.ownerId === owner?.id);
    if (owner === undefined || city === undefined) throw new Error("no city");
    const maxHp = EGG_HP_V7 + (egg.nesting === true ? 4 : 0);
    const unit: UnitStateV7 = {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId: city.id,
      role: egg.role,
      form: "EGG",
      at: egg.at,
      hp: maxHp,
      maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: eggActivationV7(),
    };
    return {
      unit,
      entry: {
        unitId: unit.id,
        turnsRemaining:
          egg.turnsRemaining ??
          roleMechanicsV7(egg.role, owner.faction).hatchTurns ??
          1,
        laidThisTurn: egg.laidThisTurn ?? false,
      },
    };
  });
  return {
    ...base,
    nextEntityId: base.nextEntityId + eggs.length,
    units: [...units, ...eggs.map((egg) => egg.unit)],
    eggs: [...base.eggs, ...eggs.map((egg) => egg.entry)].sort(
      (left, right) => left.unitId - right.unitId,
    ),
    players:
      ground.coins === undefined
        ? base.players
        : base.players.map((player) => ({
            ...player,
            coins: ground.coins as number,
          })),
  };
}

export { unitAt };

interface KindV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  readonly stage?: StageV7;
  /** Moved two tiles: Pounce or Charge with Raiding, the Charge! run-up. */
  readonly moved?: boolean;
  /**
   * The attacker's seat owns Wallbreaker (the Dinosaur Explosives): the
   * second tile of a Triceratops's run-up counts.
   */
  readonly wallbreaker?: boolean;
  /** A Caveman whose target stands next to an own Raptor (Pack Hunt). */
  readonly pack?: boolean;
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
const DINOSAURS = kinds("DINOSAUR", LAND_ROLES);
const HUMANS = kinds("ORIGINAL", HUMAN_ROLES);
const GOBLINS = kinds("GOBLIN", LAND_ROLES);
const UNDEAD = kinds("UNDEAD", LAND_ROLES);
const MARTIANS = kinds("MARTIAN", LAND_ROLES);

const rule = (kind: KindV7) => effectiveRoleRuleV7(kind.role, kind.faction);
const grows = (kind: KindV7): boolean => rule(kind).abilities.includes("GROW");
const maxHpOf = (kind: KindV7): number =>
  rule(kind).maxHp + (grows(kind) ? GROWTH_HP_V7 * (kind.stage ?? 0) : 0);
const movedBonus = (kind: KindV7): boolean =>
  kind.role === "RAIDER" ||
  roleMechanicsV7(kind.role, kind.faction).runUpBonus2 > 0;

/**
 * Attacker rows. A dinosaur's damage is the same at stage 0 and Big (growth
 * adds HP; only Alpha adds Attack), so its rows are stage 0 and Alpha; a
 * fast unit and a Triceratops also have the row after a two-tile Move.
 */
const variants = (list: readonly KindV7[]): readonly KindV7[] =>
  list.flatMap((kind) => {
    const rows: KindV7[] = [kind];
    const charges = roleMechanicsV7(kind.role, kind.faction).runUpBonus2 > 0;
    if (roleMechanicsV7(kind.role, kind.faction).packHuntBonus2 > 0)
      rows.push({ ...kind, pack: true });
    if (movedBonus(kind)) rows.push({ ...kind, moved: true });
    if (charges) rows.push({ ...kind, moved: true, wallbreaker: true });
    if (grows(kind)) {
      rows.push({
        ...kind,
        stage: 2,
        ...(movedBonus(kind) ? { moved: true } : {}),
      });
      if (charges)
        rows.push({ ...kind, stage: 2, moved: true, wallbreaker: true });
    }
    return rows;
  });
const name = (kind: KindV7): string => {
  const stage = STAGE_NAME[kind.stage ?? 0];
  const moved =
    kind.moved !== true
      ? ""
      : kind.role === "RAIDER"
        ? kind.faction === "DINOSAUR"
          ? " (Pounce)"
          : kind.faction === "MARTIAN"
            ? " (Strafe)"
            : " (Charge)"
        : kind.wallbreaker === true
          ? " (run-up 2, Wallbreaker)"
          : " (run-up 1)";
  return `${stage === "" ? "" : `${stage} `}${rule(kind).label}${moved}${kind.pack === true ? " (Pack Hunt)" : ""}`;
};
const half = (value2: number): string => String(value2 / 2);

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
    title:
      "Field Defense (+2 Defense), the attacker without Breach or Wallbreaker (a Dinosaur defender builds none: its cells equal open ground)",
    terrain: "FIELD_DEFENSE",
  },
  {
    title:
      "Walled city center (+2 Defense), the attacker without Breach or Wallbreaker",
    terrain: "WALLS",
  },
];

const targetTile = (terrain: TerrainV7): CoordV7 =>
  terrain === "WALLS"
    ? at(2, 8)
    : terrain === "FIELD_DEFENSE"
      ? at(2, 7)
      : at(5, 2);

interface PreviewOptionsV7 {
  readonly inspired?: boolean;
  readonly defenderHp?: number;
  /** The attacker's seat owns Explosives (Breach; Wallbreaker). */
  readonly explosives?: boolean;
  /** The defender's seat lacks Forestry (no Forest cover). */
  readonly noForestry?: boolean;
}

/**
 * One attack of the matrix: the target on its context tile, the attacker at
 * its full range (a melee unit next to it) on the same row or column, and
 * War Drums, Rally, Frenzy, WAAAGH!, or Psychic Command (the Inspired flag)
 * when `inspired`.
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
  const pieces: DinosaurPieceV7[] = [
    {
      seat: 0,
      role: attacker.role,
      at: from,
      ...(attacker.stage === undefined ? {} : { stage: attacker.stage }),
      activation: {
        ...(attacker.moved === true ? { moved: true, movedPathLength: 2 } : {}),
        ...(options.inspired === true ? { inspired: true } : {}),
      },
    },
    {
      seat: 1,
      role: defender.role,
      at: to,
      ...(defender.stage === undefined ? {} : { stage: defender.stage }),
      ...(options.defenderHp === undefined ? {} : { hp: options.defenderHp }),
    },
    // Pack Hunt: an own Raptor next to the target, out of the way.
    ...(attacker.pack === true
      ? [
          {
            seat: 0,
            role: "RAIDER" as const,
            at:
              terrain === "WALLS" || terrain === "FIELD_DEFENSE"
                ? at(to.x - 1, to.y - 1)
                : at(to.x, to.y + 1),
          },
        ]
      : []),
  ];
  const state = arena([attacker.faction, defender.faction], pieces, {
    ...(terrain === "FOREST" ? { forest: [to] } : {}),
    ...(terrain === "FIELD_DEFENSE" ? { fieldDefense: [to] } : {}),
    walls: terrain === "WALLS",
    ...(options.explosives === true || attacker.wallbreaker === true
      ? { explosives: [true, false] }
      : {}),
    ...(options.noForestry === true
      ? { lacks: [[], ["FORESTRY"] as TechnologyIdV7[]] }
      : {}),
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
): string {
  let hp = maxHpOf(defender);
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

/** `dealt/taken ×attacks`, then `d` the damage when Inspired. */
function cell(attacker: KindV7, defender: KindV7, terrain: TerrainV7): string {
  const plain = previewOf(attacker, defender, terrain);
  if (plain === null) return "—";
  const inspired = previewOf(attacker, defender, terrain, { inspired: true });
  // War Drums never reaches a siege or a support unit (the Triceratops,
  // the Shaman).
  const unreached =
    rule(attacker).tacticalRole === "SUPPORT" ||
    rule(attacker).tacticalRole === "SIEGE";
  return `${dealt(plain)}/${plain.damageToAttacker} ×${attacksToKill(attacker, defender, terrain)}${unreached || inspired === null || !inspired.inspiredApplied ? "" : `; d ${dealt(inspired)}`}`;
}

/**
 * A cell of an attack on a dinosaur: the hit / what the attacker takes
 * back, then the attacks that kill it at stage 0 · Big · Alpha (a role that
 * does not grow has one count).
 */
function reverseCell(
  attacker: KindV7,
  defender: KindV7,
  terrain: TerrainV7,
): string {
  const plain = previewOf(attacker, defender, terrain);
  if (plain === null) return "—";
  const counts = grows(defender)
    ? ([0, 1, 2] as const)
        .map((stage) =>
          attacksToKill(attacker, { ...defender, stage }, terrain),
        )
        .join(" · ")
    : attacksToKill(attacker, defender, terrain);
  return `${dealt(plain)}/${plain.damageToAttacker} ×${counts}`;
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
        `| ${name(attacker)} (${value.cost ?? "—"}c, ${maxHpOf(attacker)}, ${half(value.attack2 + (attacker.stage === 2 ? 2 : 0))}/${half(value.defense2)}) | ${defenders.map((defender) => cellOf(attacker, defender, context.terrain)).join(" | ")} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

const ALL: readonly TerrainV7[] = ["OPEN", "FOREST", "FIELD_DEFENSE", "WALLS"];
const LEGEND =
  "Each cell: HP damage dealt / damage taken back in the first attack (both units at full HP) and × the number of attacks by fresh full-HP attackers of that kind that kill the defender; then `d` the damage with War Drums (+1 Attack; the Triceratops and the Shaman are never Inspired). `K` is a kill of the full-HP defender. A Spitter attacks from two tiles, the others from the next tile. A dinosaur deals the same at stage 0 and Big (growth adds 4 HP a stage and heals; only Alpha adds +1 Attack), so its rows are stage 0 and Alpha. (Pounce) is a Raptor that moved two tiles, with Raiding. (run-up 1) is a Triceratops that moved, without Wallbreaker (+1 Attack); (run-up 2, Wallbreaker) one that moved two tiles and whose owner has Wallbreaker (+2 Attack; the same seat's Breach is moot for it, a Charge! ignores fortification anyway). (Pack Hunt) is a Caveman whose target stands next to one of its owner's dinosaurs (+1 Attack). A Spitter's Acid and a Triceratops's Charge! ignore fortification; the Acid ignores cover too.";
const REVERSE_LEGEND =
  "Each cell: the hit on the full-HP dinosaur at stage 0 / the damage the attacker takes back (the same at every stage), then the number of attacks by fresh full-HP attackers of that kind that kill it at stage 0 · Big (+4 HP) · Alpha (+8 HP); one count for the Caveman and the Shaman, which do not grow. `K` is a kill of the stage-0 unit in one attack. Ranged units attack from their full range; a unit marked (Charge), (Strafe), or (full power) has its bonus. No Goblin attacker has Gang Up here (the attacker alone), no Lich plagues, and a Martian ray is at full power.";

function matrix(): string[] {
  const attackers = variants(DINOSAURS);
  return [
    LEGEND,
    "",
    "#### Dinosaur attackers on Human units",
    "",
    ...table(attackers, HUMANS, ALL, cell),
    "#### Dinosaur attackers on Goblin units",
    "",
    ...table(attackers, GOBLINS, ALL, cell),
    "#### Dinosaur attackers on Undead units",
    "",
    ...table(attackers, UNDEAD, ALL, cell),
    "#### Dinosaur attackers on Martian units (HP damage through the Shield)",
    "",
    ...table(attackers, MARTIANS, ["OPEN", "WALLS"], cell),
    "#### Dinosaur attackers on Dinosaur units",
    "",
    ...table(attackers, DINOSAURS, ["OPEN", "FOREST", "WALLS"], reverseCell),
  ];
}

function reverse(): string[] {
  const grounds: readonly TerrainV7[] = ["OPEN", "FOREST", "WALLS"];
  const others = (list: readonly KindV7[]): readonly KindV7[] =>
    list.flatMap((kind) =>
      kind.role === "RAIDER" ? [kind, { ...kind, moved: true }] : [kind],
    );
  return [
    REVERSE_LEGEND,
    "",
    "#### Human attackers on Dinosaur units",
    "",
    ...table(others(HUMANS), DINOSAURS, grounds, reverseCell),
    "#### Goblin attackers on Dinosaur units (no Gang Up: the attacker alone)",
    "",
    ...table(others(GOBLINS), DINOSAURS, grounds, reverseCell),
    "#### Undead attackers on Dinosaur units",
    "",
    ...table(
      others(UNDEAD).filter((kind) => !rule(kind).abilities.includes("WAIL")),
      DINOSAURS,
      grounds,
      reverseCell,
    ),
    "#### Martian attackers on Dinosaur units (rays at full power)",
    "",
    ...table(others(MARTIANS), DINOSAURS, grounds, reverseCell),
  ];
}

/** Every roster's attackers on an Egg (6 HP, 10 with Nesting; Defense 1). */
function eggs(): string[] {
  const lines = [
    "An Egg has Defense 1 whatever its tile and never strikes back. Each cell: the damage of one attack on a 6-HP Egg / on a 10-HP Egg laid with Nesting; `K` is a kill.",
    "",
    "| Attacker | Egg 6 HP | Egg 10 HP (Nesting) |",
    "| --- | --- | --- |",
  ];
  const one = (attacker: KindV7, nesting: boolean): string => {
    const attackerRule = rule(attacker);
    if (!attackerRule.abilities.includes("ATTACK")) return "—";
    const distance = Math.max(attackerRule.minimumRange, attackerRule.range);
    const to = at(2, 7);
    const from = at(2, 7 - distance);
    const state = arena(
      [attacker.faction, "DINOSAUR"],
      [
        {
          seat: 0,
          role: attacker.role,
          at: from,
          activation:
            attacker.moved === true ? { moved: true, movedPathLength: 2 } : {},
        },
      ],
      { eggs: [{ seat: 1, role: "KNIGHT", at: to, nesting }] },
    );
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    return dealt(
      queryCombatPreviewV7(
        viewForV7(state, actor),
        unitAt(state, from).id,
        unitAt(state, to).id,
      ),
    );
  };
  const rosters: readonly (readonly [string, readonly KindV7[]])[] = [
    ["Human", HUMANS],
    ["Goblin", GOBLINS],
    ["Undead", UNDEAD],
    ["Martian", MARTIANS],
  ];
  for (const [title, roster] of rosters)
    for (const kind of roster) {
      const first = one(kind, false);
      if (first === "—") continue;
      lines.push(
        `| ${title} ${rule(kind).label} | ${first} | ${one(kind, true)} |`,
      );
    }
  return lines;
}

/** Dinosaur attacks on fortified units, with and without Wallbreaker. */
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
    "A full-HP target on a Field Defense or a walled city center; the damage of one attack without / with Wallbreaker (the Dinosaur Explosives: Breach removes Walls and Field Defense from every attack made from the next tile, and the second tile of a Triceratops's run-up counts). A Spitter's Acid and a Triceratops's Charge! ignore both without it.",
    "",
    `| Attacker | Ground | ${targets.map((kind) => `${rule(kind).label} ${rule(kind).maxHp}hp`).join(" | ")} |`,
    `| --- | --- | ${targets.map(() => "---").join(" | ")} |`,
  ];
  for (const attacker of variants(DINOSAURS).filter(
    (kind) =>
      kind.role !== "CAPTAIN" && kind.stage !== 2 && kind.wallbreaker !== true,
  ))
    for (const terrain of ["FIELD_DEFENSE", "WALLS"] as const)
      lines.push(
        `| ${name(attacker)} | ${terrain === "WALLS" ? "walled center" : "Field Defense"} | ${targets.map((target) => `${dealt(previewOf(attacker, target, terrain))} / ${dealt(previewOf(attacker, target, terrain, { explosives: true }))}`).join(" | ")} |`,
      );
  return lines;
}

// ------------------------------------------------------------ played ---

export interface StepV7 {
  readonly kind:
    | "ATTACK"
    | "MOVE"
    | "END_TURN"
    | "RALLY"
    | "TEND"
    | "KABOOM"
    | "WAIL"
    | "LAY"
    | "HATCH"
    | "HIRE"
    | "TRACTOR_BEAM"
    | "MIND_CONTROL"
    | "NOTE";
  /** The acting unit's tag. */
  readonly unit?: string;
  /** The target's tag. */
  readonly target?: string;
  /** The path of a Move, or the one tile of a Lay or a Hire. */
  readonly path?: readonly CoordV7[];
  /** The role inside a laid Egg, or the hired role. */
  readonly role?: UnitRoleIdV7;
  /** The tag the laid Egg or the hired unit gets. */
  readonly tag?: string;
  readonly text?: string;
}
const attack = (unit: string, target: string): StepV7 => ({
  kind: "ATTACK",
  unit,
  target,
});
const move = (unit: string, ...path: CoordV7[]): StepV7 => ({
  kind: "MOVE",
  unit,
  path,
});
const endTurn: StepV7 = { kind: "END_TURN" };
const note = (text: string): StepV7 => ({ kind: "NOTE", text });
const rally = (unit: string): StepV7 => ({ kind: "RALLY", unit });
const tend = (unit: string): StepV7 => ({ kind: "TEND", unit });
const kaboom = (unit: string): StepV7 => ({ kind: "KABOOM", unit });
const wail = (unit: string): StepV7 => ({ kind: "WAIL", unit });
const lay = (role: UnitRoleIdV7, to: CoordV7, tag: string): StepV7 => ({
  kind: "LAY",
  role,
  path: [to],
  tag,
});
const hire = (role: UnitRoleIdV7, to: CoordV7, tag: string): StepV7 => ({
  kind: "HIRE",
  role,
  path: [to],
  tag,
});
const hatch = (unit: string, target: string): StepV7 => ({
  kind: "HATCH",
  unit,
  target,
});
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

const SIDE: Readonly<Partial<Record<FactionIdV7, string>>> = {
  DINOSAUR: "Dinosaurs",
  MARTIAN: "Martians",
  UNDEAD: "Undead",
  ORIGINAL: "Humans",
  GOBLIN: "Goblins",
};

/**
 * Plays the steps with the reducer and reports each from its events. A step
 * whose unit or target is gone, or that the engine refuses, says so. A
 * rising is tagged `rise1`, `rise2`, … in the order it appears. A dinosaur
 * reads "Big" or "Alpha" before its name, an Egg "{unit} Egg"; health reads
 * HP/maximum.
 */
function play(
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly DinosaurPieceV7[],
  steps: readonly StepV7[],
  ground: DinosaurGroundV7 = {},
): string[] {
  const lines = [`- **${title}**`];
  let state = arena(factions, pieces, ground);
  const ids = new Map<string, number>();
  for (const piece of pieces)
    if (piece.tag !== undefined) ids.set(piece.tag, unitAt(state, piece.at).id);
  for (const egg of ground.eggs ?? [])
    if (egg.tag !== undefined) ids.set(egg.tag, unitAt(state, egg.at).id);
  const kindOf = new Map<number, FactionIdV7>();
  const seatFaction = (source: GameStateV7, ownerId: number): FactionIdV7 =>
    source.players.find((player) => player.id === ownerId)?.faction ??
    "ORIGINAL";
  for (const unit of state.units)
    kindOf.set(unit.id, seatFaction(state, unit.ownerId));
  let risings = 0;
  const label = (
    unit: Pick<UnitStateV7, "id" | "role" | "form" | "kills" | "ownerId">,
  ): string => {
    const faction = kindOf.get(unit.id) ?? seatFaction(state, unit.ownerId);
    const value = effectiveRoleRuleV7(unit.role, faction);
    if (unit.form === "EGG") return `${value.label} Egg`;
    const stage = value.abilities.includes("GROW")
      ? STAGE_NAME[unit.kills >= 3 ? 2 : unit.kills >= 1 ? 1 : 0]
      : "";
    return `${stage === "" ? "" : `${stage} `}${value.label}`;
  };
  const sideOf = (source: GameStateV7, ownerId: number): string =>
    SIDE[seatFaction(source, ownerId)] ?? "?";
  const health = (unit: UnitStateV7): string => `${unit.hp}/${unit.maxHp}`;
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
    } else if (step.kind === "LAY" || step.kind === "HIRE") {
      const city = state.cities.find((item) => item.ownerId === actor);
      if (city === undefined) throw new Error("no city");
      const role = step.role as UnitRoleIdV7;
      const to = (step.path ?? [])[0] as CoordV7;
      const name = effectiveRoleRuleV7(role, seatFaction(state, actor)).label;
      command =
        step.kind === "LAY"
          ? { kind: "LAY_EGG", cityId: city.id, role, at: to }
          : { kind: "HIRE", cityId: city.id, role, at: to };
      head =
        step.kind === "LAY"
          ? `${sideOf(state, actor)} lay a ${name} Egg`
          : `${sideOf(state, actor)} hire a ${name} at the Market`;
    } else {
      const unit = find(step.unit);
      if (unit === undefined) {
        lines.push(`  - (${step.unit ?? "the unit"} is gone)`);
        continue;
      }
      const who = `${label(unit)} (${health(unit)})`;
      const target = find(step.target);
      const needsTarget =
        step.kind === "ATTACK" ||
        step.kind === "HATCH" ||
        step.kind === "TRACTOR_BEAM" ||
        step.kind === "MIND_CONTROL";
      if (needsTarget && target === undefined) {
        lines.push(`  - ${label(unit)}: its target is gone`);
        continue;
      }
      const targetText =
        target === undefined ? "" : `${label(target)} (${health(target)})`;
      if (step.kind === "ATTACK") {
        command = {
          kind: "ATTACK",
          unitId: unit.id,
          targetUnitId: (target as UnitStateV7).id,
        };
        head = `${who} attacks ${targetText}`;
      } else if (step.kind === "HATCH") {
        command = {
          kind: "HATCH",
          unitId: unit.id,
          eggUnitId: (target as UnitStateV7).id,
        };
        head = `${label(unit)} hatches the ${label(target as UnitStateV7)}`;
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
      } else if (step.kind === "MOVE") {
        const length = (step.path ?? []).length;
        command = {
          kind: "MOVE",
          unitId: unit.id,
          path: [...(step.path ?? [])],
        };
        head = `${label(unit)} moves ${length} tile${length === 1 ? "" : "s"}`;
      } else if (step.kind === "RALLY") {
        command = { kind: "RALLY", unitId: unit.id };
        const kind = kindOf.get(unit.id);
        head = `${label(unit)} calls ${kind === "DINOSAUR" ? "War Drums" : kind === "MARTIAN" ? "Psychic Command" : kind === "UNDEAD" ? "Frenzy" : kind === "GOBLIN" ? "WAAAGH!" : "Rally"}`;
      } else if (step.kind === "TEND") {
        command = { kind: "TEND_WOUNDED", unitId: unit.id };
        head = `${label(unit)} tends the wounded`;
      } else if (step.kind === "WAIL") {
        command = { kind: "WAIL", unitId: unit.id };
        head = `${who} Wails`;
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
    for (const unit of state.units)
      if (!kindOf.has(unit.id))
        kindOf.set(unit.id, seatFaction(state, unit.ownerId));
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
          `deals ${preview.damageToDefender}${preview.defenderDies ? " (kills)" : ""}, takes ${preview.damageToAttacker}${preview.attackerDies ? " (dies)" : ""}${preview.attackerHeal > 0 ? `, heals ${preview.attackerHeal}` : ""}${preview.inspiredApplied ? ", inspired" : ""}${preview.chargeApplied ? ", Pounce or Charge" : ""}${preview.runUp > 0 ? `, run-up +${preview.runUp}` : ""}${preview.acid ? ", Acid" : ""}${preview.gangUp > 0 ? `, Gang Up +${preview.gangUp}` : ""}${preview.fortificationIgnored > 0 ? ", ignores the fortification" : ""}${preview.defenderArmoured || preview.attackerArmoured ? ", Armoured" : ""}${preview.defenderBitten ? ", bites" : ""}${preview.attackerBitten ? ", is bitten" : ""}${preview.advances ? ", advances" : ""}${preview.overrunContinues ? ", attacks again" : ""}`,
        );
        if (preview.splash.length > 0)
          parts.push(`also hits ${list(preview.splash)}`);
        if (preview.plagued.length > 0)
          parts.push(`plagues ${preview.plagued.length}`);
      } else if (event.kind === "UNIT_GREW") {
        const grown = state.units.find((item) => item.id === event.unitId);
        parts.push(
          `${grown === undefined ? "it" : `the ${effectiveRoleRuleV7(grown.role, "DINOSAUR").label}`} grows to ${STAGE_NAME[event.stage]}: ${event.hp}/${event.maxHp}`,
        );
      } else if (event.kind === "UNIT_PUSHED")
        parts.push(`${describe(event.targetUnitId)} is pushed back`);
      else if (event.kind === "FIELD_DEFENSE_DESTROYED")
        parts.push("the Field Defense is destroyed");
      else if (event.kind === "EGG_LAID") {
        if (step.tag !== undefined) ids.set(step.tag, event.unitId);
        parts.push(
          `${event.cost} Coins, ${event.hp} HP, hatches in ${event.turnsRemaining} turn${event.turnsRemaining === 1 ? "" : "s"}`,
        );
      } else if (event.kind === "UNIT_TRAINED") {
        if (step.tag !== undefined) ids.set(step.tag, event.unitId);
        parts.push(`${event.cost} Coins`);
      } else if (event.kind === "EGG_HATCHED")
        parts.push(
          `the ${effectiveRoleRuleV7(event.role, "DINOSAUR").label} Egg hatches${event.cause === "SHAMAN" ? " (it cannot act this turn)" : ""}`,
        );
      else if (event.kind === "UNIT_DIED" && event.cause === "CITY_CAPTURED")
        parts.push(`${describe(event.unitId)} is destroyed with the city`);
      else if (event.kind === "WAIL_RESOLVED")
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
      .map((unit) => `${label(unit)} ${health(unit)}`)
      .join(", ") || "nothing";
  const coins = (seat: number): string =>
    ground.coins === undefined
      ? ""
      : ` (${String(state.players.find((player) => player.seat === seat)?.coins ?? 0)} Coins)`;
  lines.push(
    `  - Left: ${SIDE[factions[0]] ?? "?"} ${left(0)}${coins(0)}; ${SIDE[factions[1]] ?? "?"} ${left(1)}${coins(1)}.`,
  );
  return lines;
}

/** `battle` of the Martian pass on this pass's arena (stages and Eggs). */
const battle = (
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly DinosaurPieceV7[],
  sides: Parameters<typeof SCENARIO_HELPERS_V7.battle>[3],
  turns: number,
  ground: DinosaurGroundV7 = {},
): string[] =>
  SCENARIO_HELPERS_V7.battle(
    title,
    factions,
    pieces,
    sides,
    turns,
    ground,
    (builtFactions, builtPieces, builtGround) =>
      arena(
        builtFactions,
        builtPieces as readonly DinosaurPieceV7[],
        builtGround as DinosaurGroundV7,
      ),
  );

export const DINOSAUR_SCENARIO_HELPERS_V7 = {
  play,
  battle,
  attack,
  move,
  endTurn,
  note,
  rally,
  tend,
  kaboom,
  wail,
  lay,
  hire,
  hatch,
  pull,
  control,
  at,
};
export type DinosaurScenarioHelpersV7 = typeof DINOSAUR_SCENARIO_HELPERS_V7;

function technology(): string[] {
  const tree = factionTreeV7("DINOSAUR");
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
            ? `unit ${effectiveRoleRuleV7(unlock.role, "DINOSAUR").label}`
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
  const tree = factionTreeV7("DINOSAUR");
  const lines = [
    "| Unit | Technology (tier) | Cost | Hired | Slots | Hatch turns (Nesting takes none off) | HP at stage 0 / Big / Alpha | Atk / Def | Move | Range | Acts after moving | Abilities | A city of income 3 / 5 / 7 pays for one a turn |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const role of LAND_ROLES) {
    const value = effectiveRoleRuleV7(role, "DINOSAUR");
    const mechanics = roleMechanicsV7(role, "DINOSAUR");
    const tier =
      value.technology === null
        ? "—"
        : `${value.technology} (${String(tree.nodes.find((node) => node.id === value.technology)?.tier ?? "?")})`;
    const growing = value.abilities.includes("GROW");
    lines.push(
      `| ${value.label} | ${tier} | ${value.cost ?? "reward"} | ${value.cost === null ? "—" : hireCostV7(value.cost)} | ${mechanics.capacitySlots} | ${mechanics.hatchTurns === null ? "trained" : String(mechanics.hatchTurns)} | ${growing ? `${value.maxHp} / ${value.maxHp + GROWTH_HP_V7} / ${value.maxHp + 2 * GROWTH_HP_V7}` : String(value.maxHp)} | ${half(value.attack2)} / ${half(value.defense2)} | ${value.move} | ${value.minimumRange === value.range ? value.range : `${value.minimumRange}-${value.range}`} | ${value.mayUsePrimaryActionAfterMove ? "yes" : "no"} | ${value.abilities.filter((ability) => ability !== "ATTACK" && ability !== "CAPTURE").join(", ") || "—"} | ${value.cost === null ? "—" : [3, 5, 7].map((income) => ((value.cost ?? 0) <= income ? "yes" : "no")).join(" / ")} |`,
    );
  }
  const techs = (...ids: TechnologyIdV7[]): readonly TechnologyIdV7[] => ids;
  lines.push(
    "",
    `Unit slots of a Dinosaur city: ${[1, 2, 3, 4, 5].map((level) => `L${level} ${cityUnitCapacityForV7(level, [], "DINOSAUR")}/${cityUnitCapacityForV7(level, techs("DRILL", "FORTIFICATION"), "DINOSAUR")}/${cityUnitCapacityForV7(level, techs("DRILL", "FORTIFICATION", "GATHERING", "ADMINISTRATION", "PLANNING"), "DINOSAUR")}`).join(", ")} (plain / with Nesting / with Nesting and Planning).`,
  );
  return lines;
}

if (process.argv[1]?.endsWith("dinosaur-tuning-analysis-v7.ts") === true) {
  const part = process.argv[2] ?? "all";
  const out: string[] = [
    `<!-- ${RULESET_7_ID}, scripts/dinosaur-tuning-analysis-v7.ts ${part} -->`,
    "",
  ];
  if (part === "all" || part === "matrix")
    out.push("### Matchup matrix", "", ...matrix());
  if (part === "all" || part === "reverse")
    out.push("### The reverse", "", ...reverse());
  if (part === "all" || part === "eggs")
    out.push("### Attacks on an Egg", "", ...eggs(), "");
  if (part === "all" || part === "fortification")
    out.push("### Dinosaurs against fortification", "", ...fortification(), "");
  if (part === "all" || part === "scenarios")
    out.push(
      "### Scenarios",
      "",
      ...dinosaurScenariosV7(DINOSAUR_SCENARIO_HELPERS_V7),
      "",
    );
  if (part === "all" || part === "technology")
    out.push("### Dinosaur technologies", "", ...technology(), "");
  if (part === "all" || part === "prices")
    out.push("### Dinosaur price list", "", ...prices(), "");
  process.stdout.write(`${out.join("\n")}\n`);
}
