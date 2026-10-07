/**
 * The Human tuning analysis (`pulp_wars-w49.3`,
 * docs/product/RULESET_7_TUNING_HUMAN.md): deterministic unit-level numbers
 * from the engine's exact public combat preview on constructed positions,
 * and the Human technology and economy price lists. It plays no match and
 * draws no conclusion; the document does.
 *
 *   npx tsx scripts/human-tuning-analysis-v7.ts            (everything)
 *   npx tsx scripts/human-tuning-analysis-v7.ts matrix     (one part:
 *     matrix | scenarios | technology | economy | round4 | round5 | round6)
 *
 * Output is Markdown on stdout.
 */
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  BLAST_MOUNTAIN_COST_V7,
  BLAST_MOUNTAIN_DAMAGE_V7,
  CITY_REWARD_COINS_V7,
  MONUMENT_POPULATION_V7,
  REWARD_UNIT_LEVEL_V7,
  RULESET_7_ID,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  TECHNOLOGY_IDS_V7,
  cityUnitCapacityForV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  hireCostV7,
  landGrantCostV7,
  queryCombatPreviewV7,
  technologyResearchCostV7,
  viewForV7,
  type CombatPreviewV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
  BARRACKS_CAPACITY_V7,
  playerTechnologyResearchCostV7,
} from "../src/engine/index";
import { goblinArenaV7 } from "../tests/fixtures/v7-goblin-arena";

interface KindV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  /** A Raider that moved two tiles (Charge with Raiding). */
  readonly charging?: boolean;
  /** A ranged unit attacking from distance 1 instead of its full range. */
  readonly adjacent?: boolean;
}

const HUMAN: readonly KindV7[] = [
  { faction: "ORIGINAL", role: "FIGHTER" },
  { faction: "ORIGINAL", role: "GUARD" },
  { faction: "ORIGINAL", role: "RAIDER" },
  { faction: "ORIGINAL", role: "MARKSMAN" },
  { faction: "ORIGINAL", role: "CAPTAIN" },
  { faction: "ORIGINAL", role: "CATAPULT" },
  { faction: "ORIGINAL", role: "KNIGHT" },
  { faction: "ORIGINAL", role: "JUGGERNAUT" },
  // Tuning 5 (`pulp_wars-w49.4`): the heavy line unit, last so that the
  // older columns keep their order.
  { faction: "ORIGINAL", role: "SWORDSMAN" },
];
/**
 * A cheap swarm unit, a Guard-type, a fragile ranged unit, and a heavy;
 * tuning 5 adds the Undead line and defender (the Skeleton and the Zombie),
 * the other pairing the round plays.
 */
const REFERENCE: readonly KindV7[] = [
  { faction: "GOBLIN", role: "FIGHTER" },
  { faction: "GOBLIN", role: "GUARD" },
  { faction: "CANDY", role: "MARKSMAN" },
  { faction: "DINOSAUR", role: "KNIGHT" },
  { faction: "UNDEAD", role: "FIGHTER" },
  { faction: "UNDEAD", role: "GUARD" },
];
const ATTACKERS: readonly KindV7[] = [
  ...HUMAN.slice(0, 3),
  { faction: "ORIGINAL", role: "RAIDER", charging: true },
  HUMAN[3] as KindV7,
  { faction: "ORIGINAL", role: "MARKSMAN", adjacent: true },
  ...HUMAN.slice(4),
  ...REFERENCE,
];
const DEFENDERS: readonly KindV7[] = [...HUMAN, ...REFERENCE];

const rule = (kind: KindV7) => effectiveRoleRuleV7(kind.role, kind.faction);
const name = (kind: KindV7): string =>
  `${rule(kind).label}${kind.charging === true ? " (Charge)" : ""}${kind.adjacent === true ? " (adjacent)" : ""}`;
const half = (value2: number): string => String(value2 / 2);

type TerrainV7 = "OPEN" | "FOREST" | "MOUNTAIN" | "FIELD_DEFENSE" | "WALLS";

interface ContextV7 {
  readonly title: string;
  readonly terrain: TerrainV7;
  /** The defender's owner has Forestry. */
  readonly forestry: boolean;
  /** The attacker's owner has Explosives (Breach). */
  readonly explosives: boolean;
}

const CONTEXTS: readonly ContextV7[] = [
  {
    title: "Open ground",
    terrain: "OPEN",
    forestry: true,
    explosives: false,
  },
  {
    title:
      "Cover x 1.5: the defender in Forest with its owner's Forestry (a Mountain gives the same numbers with no technology)",
    terrain: "FOREST",
    forestry: true,
    explosives: false,
  },
  {
    title: "Field Defense (+2 Defense), the attacker without Explosives",
    terrain: "FIELD_DEFENSE",
    forestry: true,
    explosives: false,
  },
  {
    title: "Walled city center (+2 Defense), the attacker without Explosives",
    terrain: "WALLS",
    forestry: true,
    explosives: false,
  },
  {
    title:
      "Walled city center, the attacker with Explosives (Breach: a melee attack ignores the Walls)",
    terrain: "WALLS",
    forestry: true,
    explosives: true,
  },
];

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

/**
 * The two-seat arena (seat 0 capital (8, 8), seat 1 capital (2, 8) with
 * territory x 1-3, y 7-9) with every other land tile open Grass.
 */
function position(
  attacker: KindV7,
  defender: KindV7,
  context: ContextV7,
  defenderHp: number | null,
): {
  readonly state: GameStateV7;
  readonly from: CoordV7;
  readonly to: CoordV7;
} {
  const to: CoordV7 =
    context.terrain === "WALLS"
      ? { x: 2, y: 8 }
      : context.terrain === "FIELD_DEFENSE"
        ? { x: 2, y: 7 }
        : { x: 5, y: 4 };
  const attackerRule = rule(attacker);
  const distance =
    attacker.adjacent === true
      ? 1
      : Math.max(attackerRule.minimumRange, attackerRule.range);
  const from: CoordV7 = { x: to.x, y: to.y - distance };
  const arena = goblinArenaV7(
    [attacker.faction, defender.faction],
    [
      {
        seat: 0,
        role: attacker.role,
        at: from,
        ...(attacker.charging === true
          ? { activation: { moved: true, movedPathLength: 2 } }
          : {}),
      },
      {
        seat: 1,
        role: defender.role,
        at: to,
        ...(defenderHp === null ? {} : { hp: defenderHp }),
      },
    ],
    {
      techs: {
        0: context.explosives
          ? without(attacker.faction)
          : without(attacker.faction, "EXPLOSIVES"),
        1: context.forestry
          ? without(defender.faction)
          : without(defender.faction, "FORESTRY"),
      },
    },
  );
  const seatOne = arena.players.find((player) => player.seat === 1);
  const state: GameStateV7 = {
    ...arena,
    cities: arena.cities.map((city) =>
      context.terrain === "WALLS" && city.ownerId === seatOne?.id
        ? {
            ...city,
            rewards: [
              ...city.rewards.filter((record) => record.reachedLevel !== 3),
              { reachedLevel: 3, reward: "WALLS" as const },
            ],
          }
        : city,
    ),
    board: {
      ...arena.board,
      tiles: arena.board.tiles.map((tile) => {
        const flat =
          tile.site === null
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile;
        if (tile.at.x !== to.x || tile.at.y !== to.y) return flat;
        return context.terrain === "FOREST"
          ? { ...flat, terrain: "FOREST" as const, biome: "WOODLAND" as const }
          : context.terrain === "MOUNTAIN"
            ? {
                ...flat,
                terrain: "MOUNTAIN" as const,
                biome: "HIGHLANDS" as const,
              }
            : context.terrain === "FIELD_DEFENSE"
              ? { ...flat, fieldDefense: true }
              : flat;
      }),
    },
  };
  return { state, from, to };
}

const unitAt = (state: GameStateV7, at: CoordV7): UnitStateV7 => {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
};

function previewOf(
  attacker: KindV7,
  defender: KindV7,
  context: ContextV7,
  defenderHp: number | null,
): CombatPreviewV7 | null {
  const { state, from, to } = position(attacker, defender, context, defenderHp);
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  return queryCombatPreviewV7(
    viewForV7(state, actor),
    unitAt(state, from).id,
    unitAt(state, to).id,
  );
}

/**
 * One cell: damage dealt / damage taken by a full-HP attacker against a
 * full-HP defender, then the number of such attacks (each by a fresh
 * full-HP attacker) that kills the defender.
 */
function cell(attacker: KindV7, defender: KindV7, context: ContextV7): string {
  if (!rule(attacker).abilities.includes("ATTACK")) return "—";
  const first = previewOf(attacker, defender, context, null);
  if (first === null) return "—";
  let hp = rule(defender).maxHp;
  let hits = 0;
  while (hp > 0 && hits < 30) {
    const preview = previewOf(attacker, defender, context, hp);
    if (preview === null || preview.damageToDefender <= 0) break;
    hp -= preview.damageToDefender;
    hits += 1;
  }
  return `${first.damageToDefender}/${first.damageToAttacker} ×${hp > 0 ? "∞" : hits}`;
}

function matrix(): string[] {
  const lines: string[] = [
    "Each cell: damage dealt / damage taken in the first attack (both units at full HP), then × the number of attacks by fresh full-HP attackers of that kind that kill the defender. Ranged units attack from their full range unless marked (adjacent); a Raider marked (Charge) has moved two tiles with Raiding.",
    "",
  ];
  const header = `| Attacker (cost, HP, Atk/Def) | ${DEFENDERS.map((kind) => `${name(kind)} ${rule(kind).cost ?? "—"}c ${rule(kind).maxHp}hp`).join(" | ")} |`;
  for (const context of CONTEXTS) {
    lines.push(`**${context.title}**`, "", header);
    lines.push(`| --- | ${DEFENDERS.map(() => "---").join(" | ")} |`);
    for (const attacker of ATTACKERS) {
      const value = rule(attacker);
      lines.push(
        `| ${name(attacker)} (${value.cost ?? "—"}c, ${value.maxHp}, ${half(value.attack2)}/${half(value.defense2)}) | ${DEFENDERS.map((defender) => cell(attacker, defender, context)).join(" | ")} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

interface PieceV7 {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  at: CoordV7;
  hp?: number;
}

/**
 * The listed attacks in order on one position, each from the exact public
 * preview of the position as it then stands (damage, deaths, and advances
 * of the earlier attacks applied; every attacker still has its attack).
 */
function sequence(
  title: string,
  factions: readonly [FactionIdV7, FactionIdV7],
  start: readonly PieceV7[],
  attacks: readonly (readonly [CoordV7, CoordV7])[],
  walls = false,
  /** Tuning 5: Forest and Field Defense tiles (seat 1 has Forestry). */
  ground: {
    readonly forest?: readonly CoordV7[];
    readonly fieldDefense?: readonly CoordV7[];
  } = {},
): string[] {
  const lines = [`- **${title}**`];
  const pieces = start.map((piece) => ({ ...piece }));
  const same = (left: CoordV7, right: CoordV7): boolean =>
    left.x === right.x && left.y === right.y;
  for (const [from, to] of attacks) {
    const attacker = pieces.find((piece) => same(piece.at, from));
    const target = pieces.find((piece) => same(piece.at, to));
    if (attacker === undefined || target === undefined) {
      lines.push("  - (the attacker or the target is gone)");
      break;
    }
    const base = goblinArenaV7(factions, pieces, {
      techs: {
        0: without(factions[0], "EXPLOSIVES"),
        1: without(factions[1]),
      },
    });
    const seatOne = base.players.find((player) => player.seat === 1);
    const state: GameStateV7 = {
      ...base,
      cities: base.cities.map((city) =>
        walls && city.ownerId === seatOne?.id
          ? {
              ...city,
              rewards: [{ reachedLevel: 3, reward: "WALLS" as const }],
            }
          : city,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) => {
          const on = (list: readonly CoordV7[] | undefined): boolean =>
            list?.some((at) => same(at, tile.at)) === true;
          const flat =
            tile.site === null
              ? {
                  ...tile,
                  biome: "PLAINS" as const,
                  terrain: "GRASS" as const,
                  resource: null,
                  improvement: null,
                  road: false,
                  fieldDefense: false,
                }
              : tile;
          return on(ground.forest)
            ? {
                ...flat,
                terrain: "FOREST" as const,
                biome: "WOODLAND" as const,
              }
            : on(ground.fieldDefense)
              ? { ...flat, fieldDefense: true }
              : flat;
        }),
      },
    };
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const preview = queryCombatPreviewV7(
      viewForV7(state, actor),
      unitAt(state, from).id,
      unitAt(state, to).id,
    );
    if (preview === null) {
      lines.push("  - (the attack is not offered)");
      break;
    }
    const label = (piece: PieceV7): string =>
      effectiveRoleRuleV7(piece.role, factions[piece.seat] ?? "ORIGINAL").label;
    const hpOf = (piece: PieceV7): number =>
      piece.hp ??
      effectiveRoleRuleV7(piece.role, factions[piece.seat] ?? "ORIGINAL").maxHp;
    lines.push(
      `  - ${label(attacker)} (${hpOf(attacker)} HP) attacks ${label(target)} (${hpOf(target)} HP): deals ${preview.damageToDefender}${preview.defenderDies ? ", kills" : ""}, takes ${preview.damageToAttacker}${preview.attackerDies ? ", dies" : ""}${preview.gangUp > 0 ? `, Gang Up +${preview.gangUp}` : ""}${preview.advances ? ", advances" : ""}`,
    );
    target.hp = hpOf(target) - preview.damageToDefender;
    attacker.hp = hpOf(attacker) - preview.damageToAttacker;
    if (preview.defenderDies) pieces.splice(pieces.indexOf(target), 1);
    if (preview.attackerDies) pieces.splice(pieces.indexOf(attacker), 1);
    else if (preview.advances) attacker.at = to;
  }
  return lines;
}

function scenarios(): string[] {
  const at = (x: number, y: number): CoordV7 => ({ x, y });
  const lines: string[] = [];
  lines.push(
    ...sequence(
      "A Knight rides down a backline in the open (Marksman, Catapult, Captain, Raider in a row)",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 1) },
        { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        { seat: 1, role: "CATAPULT", at: at(5, 3) },
        { seat: 1, role: "CAPTAIN", at: at(5, 4) },
        { seat: 1, role: "RAIDER", at: at(5, 5) },
      ],
      [
        [at(5, 1), at(5, 2)],
        [at(5, 2), at(5, 3)],
        [at(5, 3), at(5, 4)],
        [at(5, 4), at(5, 5)],
      ],
    ),
    ...sequence(
      "A Knight meets Fighters in the open, then a Guard",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 1) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: at(5, 4) },
      ],
      [
        [at(5, 1), at(5, 2)],
        [at(5, 2), at(5, 3)],
        [at(5, 3), at(5, 4)],
      ],
    ),
    ...sequence(
      "Three Catapults fire at a Guard on a walled center (one enemy turn)",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(2, 6) },
        { seat: 0, role: "CATAPULT", at: at(1, 6) },
        { seat: 0, role: "CATAPULT", at: at(3, 6) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
      ],
      [
        [at(2, 6), at(2, 8)],
        [at(1, 6), at(2, 8)],
        [at(3, 6), at(2, 8)],
      ],
      true,
    ),
    ...sequence(
      "Three Goblins with Gang Up attack a Human Guard on a walled center (one Goblin turn; note for the Goblin pass)",
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(1, 7) },
        { seat: 0, role: "FIGHTER", at: at(2, 7) },
        { seat: 0, role: "FIGHTER", at: at(3, 7) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
      ],
      [
        [at(1, 7), at(2, 8)],
        [at(2, 7), at(2, 8)],
        [at(3, 7), at(2, 8)],
      ],
      true,
    ),
    ...sequence(
      "Three Human Fighters attack a Human Guard on a walled center (the same without Gang Up)",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(1, 7) },
        { seat: 0, role: "FIGHTER", at: at(2, 7) },
        { seat: 0, role: "FIGHTER", at: at(3, 7) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
      ],
      [
        [at(1, 7), at(2, 8)],
        [at(2, 7), at(2, 8)],
        [at(3, 7), at(2, 8)],
      ],
      true,
    ),
    ...sequence(
      "Two Marksmen shoot a Fighter in the open from range 2, then a Fighter finishes it",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 2) },
        { seat: 0, role: "MARKSMAN", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ],
      [
        [at(4, 2), at(5, 4)],
        [at(6, 2), at(5, 4)],
        [at(5, 3), at(5, 4)],
      ],
    ),
  );
  lines.push(
    "",
    `- **Blast Mountain** (${BLAST_MOUNTAIN_COST_V7} Coins): ${BLAST_MOUNTAIN_DAMAGE_V7} damage to every unit on the Mountain and on the eight tiles around it. Against full-HP units: ${HUMAN.map((kind) => `${rule(kind).label} ${rule(kind).maxHp}→${rule(kind).maxHp - BLAST_MOUNTAIN_DAMAGE_V7}`).join(", ")}; the unit on the tile also loses the Mountain's cover.`,
  );
  return lines;
}

function technology(): string[] {
  const tree = factionTreeV7("ORIGINAL");
  const lines = [
    "| Branch | Technology | Tier | After | Cost with 1 / 3 / 5 / 8 / 12 cities | Unlocks (as coded) |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const node of tree.nodes) {
    if (node.branch === "NAVAL") continue;
    const unlocks = node.unlocks
      .map((unlock) =>
        unlock.kind === "COMMAND"
          ? unlock.command
          : unlock.kind === "UNIT_ROLE"
            ? `unit ${effectiveRoleRuleV7(unlock.role, "ORIGINAL").label}`
            : unlock.kind === "RESOURCE_REVEAL"
              ? `reveals ${unlock.resources.join(", ")}`
              : unlock.kind,
      )
      .join(", ");
    lines.push(
      `| ${node.branch} | ${node.id} | ${node.tier} | ${node.prerequisites.join(", ") || "—"} | ${[1, 3, 5, 8, 12].map((cities) => technologyResearchCostV7(node.tier, cities)).join(" / ")} | ${unlocks} |`,
    );
  }
  lines.push(
    "",
    "The first technology of a match is free. A technology costs its tier's base (5 / 7 / 9) plus 1 / 2 / 3 Coins (tier 1 / 2 / 3) for each city the player owns beyond the first (the economy rejig, 7r54); the technologies owned do not matter. (Tunings 4 to 8 and the faction passes: the base plus 1 Coin for each technology owned beyond the first, 2 Coins in tunings 4 and 5.)",
  );
  return lines;
}

function economy(): string[] {
  const lines = [
    "| Source | Technology | Cost | Population | Coins per population |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const action of Object.values(BASIC_ECONOMIC_ACTIONS_V7))
    if (action.technology !== "SHORECRAFT")
      lines.push(
        `| ${action.command} | ${action.technology} | ${action.cost} | +${action.population} ${action.populationCategory.toLowerCase()} | ${(action.cost / action.population).toFixed(1)} |`,
      );
  for (const action of Object.values(SPATIAL_ECONOMIC_ACTIONS_V7))
    lines.push(
      `| ${action.command} | ${action.technology} | ${action.cost} | by adjacent contributors (a Market pays Coins instead) | — |`,
    );
  lines.push(
    `| BLAST_MOUNTAIN | EXPLOSIVES | ${BLAST_MOUNTAIN_COST_V7} | +1 permanent (own territory) | ${BLAST_MOUNTAIN_COST_V7.toFixed(1)} |`,
    `| Monument | an achievement | 0 | +${MONUMENT_POPULATION_V7} live, one per city | 0 |`,
    `| Road link | ROADS | 2 per Road tile | +1 live to each linked city and +1 to the capital per linked city | — |`,
    "",
    "A city of level L needs L + 1 population to reach level L + 1, so levels 2, 3, 4, 5, 6 cost 2, 3, 4, 5, 6 more population (20 in all for level 6).",
    "",
    `Level rewards (tuning 4): level 2 Scouts (the survey and a free Raider) or Stockpile (${CITY_REWARD_COINS_V7.STOCKPILE} Coins); level 3 Walls or Militia (one Fighter); level 4 Boom, Treasury (${CITY_REWARD_COINS_V7.TREASURY_6} Coins) or Barracks; level 5 Barracks or Treasury (${CITY_REWARD_COINS_V7.TREASURY} Coins); level ${REWARD_UNIT_LEVEL_V7}+ the same and, once per city, the Juggernaut (the economy rejig, 7r54; tuning 4 to 7r53: the first capital only, once, from level 5).`,
    "",
    `Unit capacity of a city (Human): level + 1, +1 with Planning: ${[1, 2, 3, 4, 5].map((level) => `L${level} ${cityUnitCapacityForV7(level, [], "ORIGINAL")}/${cityUnitCapacityForV7(level, ["GATHERING", "ADMINISTRATION", "PLANNING"], "ORIGINAL")}`).join(", ")} (without / with Planning). One training per city per turn; with Commerce each Market hires one more at 1.5× (a Fighter ${hireCostV7(2)}, Guard ${hireCostV7(3)}, Raider ${hireCostV7(4)}, Marksman ${hireCostV7(4)}, Captain ${hireCostV7(5)}, Catapult ${hireCostV7(8)}, Knight ${hireCostV7(9)} Coins), and the Market's city may hold 1 unit above its capacity.`,
    "",
    `Land Grant (Planning, a level-3 city, once): ${[1, 3, 5, 8].map((tiles) => `${tiles} tiles ${landGrantCostV7(tiles)}`).join(", ")} Coins.`,
  );
  return lines;
}

// ------------------------------------------------------------- round 4 ---

/**
 * The research price of tunings 6 to 8 and the faction passes (to 7r53):
 * the tier's base plus 1 Coin for each technology owned beyond the first.
 * The round tables below record that history; the engine's price is per
 * city since the economy rejig (`pulp_wars-w49.16`, 7r54).
 */
function tuning6ResearchCost(tier: 1 | 2 | 3, owned: number): number {
  if (tier === 1 && owned === 0) return 0;
  return 5 + 2 * (tier - 1) + Math.max(0, owned - 1);
}

/** The research price before tuning 4: by the cities owned. */
function oldResearchCost(tier: 1 | 2 | 3, cities: number, owned: number) {
  if (tier === 1 && owned === 0) return 0;
  const { base, step } = (
    {
      1: { base: 5, step: 1 },
      2: { base: 7, step: 2 },
      3: { base: 9, step: 2 },
    } as const
  )[tier];
  return base + step * (cities - 1);
}

/**
 * A research order with the number of cities the player holds at each
 * purchase (the old price needs it; the new one does not).
 */
function researchCurve(
  title: string,
  order: readonly (readonly [TechnologyIdV7, number])[],
): string[] {
  const tree = factionTreeV7("ORIGINAL");
  const lines = [
    `**${title}**`,
    "",
    "| #   | Technology | Tier | Cities then | Before | Now | Total before | Total now |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  let before = 0;
  let now = 0;
  order.forEach(([tech, cities], owned) => {
    const node = tree.nodes.find((candidate) => candidate.id === tech);
    if (node === undefined) throw new Error(tech);
    const old = oldResearchCost(node.tier, cities, owned);
    const price = tuning6ResearchCost(node.tier, owned);
    before += old;
    now += price;
    lines.push(
      `| ${owned + 1} | ${tech} | ${node.tier} | ${cities} | ${old} | ${price} | ${before} | ${now} |`,
    );
  });
  lines.push("");
  return lines;
}

function round4(): string[] {
  const lines: string[] = ["#### Research cost curves", ""];
  lines.push(
    ...researchCurve("Catapult rush (one city, then two)", [
      ["HUNTING", 1],
      ["FORESTRY", 1],
      ["SAWMILLING", 2],
      ["DRILL", 2],
      ["MARKSMANSHIP", 3],
    ]),
    ...researchCurve("Knights (two cities by the third purchase)", [
      ["SCOUTING", 1],
      ["RAIDING", 1],
      ["CHIVALRY", 2],
      ["DRILL", 3],
      ["GATHERING", 3],
    ]),
    ...researchCurve(
      "A whole land tree in the order of playtest r3-2 (cities as that game had them)",
      [
        ["DRILL", 1],
        ["FORTIFICATION", 1],
        ["EXPLOSIVES", 2],
        ["GATHERING", 2],
        ["FARMING", 3],
        ["HUNTING", 4],
        ["MARKSMANSHIP", 5],
        ["FORESTRY", 5],
        ["SAWMILLING", 6],
        ["ADMINISTRATION", 6],
        ["PLANNING", 6],
        ["ENGINEERING", 6],
        ["SCOUTING", 6],
        ["ROADS", 6],
        ["COMMERCE", 6],
        ["MILLING", 6],
        ["RAIDING", 6],
        ["CHIVALRY", 6],
        ["FIELDCRAFT", 6],
        ["METALLURGY", 6],
      ],
    ),
    ...researchCurve("The same order held at one city (a small empire)", [
      ["DRILL", 1],
      ["FORTIFICATION", 1],
      ["EXPLOSIVES", 1],
      ["GATHERING", 1],
      ["FARMING", 1],
      ["HUNTING", 1],
      ["MARKSMANSHIP", 1],
      ["FORESTRY", 1],
      ["SAWMILLING", 1],
      ["ADMINISTRATION", 1],
    ]),
  );
  lines.push("#### Commerce", "");
  lines.push(
    "| Linked cities | Land trade before (+2) | Now (+1) | Commerce bought as the 6th technology (19 Coins): turns to pay back, before / now |",
    "| --- | --- | --- | --- |",
  );
  for (const cities of [2, 3, 4, 5, 6])
    lines.push(
      `| ${cities} | +${2 * cities} | +${cities} | ${(19 / (2 * cities)).toFixed(1)} / ${(19 / cities).toFixed(1)} |`,
    );
  lines.push(
    "",
    "Roads (the 5th technology, 15 Coins) comes first and pays for itself in population; counting it too, Commerce at four linked cities pays back in (15 + 19) / 4 = 8.5 turns, and the Road tiles (2 Coins each) are on top.",
    "",
    "#### The reward ladder against the population that buys the level",
    "",
    "| Level | Population it took | Choices | Coins of the Coin choice |",
    "| --- | --- | --- | --- |",
    `| 2 | 2 | Scouts (survey + Raider, worth 4 Coins) or Stockpile | ${CITY_REWARD_COINS_V7.STOCKPILE} |`,
    "| 3 | 3 | Walls or Militia (one Fighter, worth 2 Coins) | — |",
    `| 4 | 4 | Boom (+3 population), Treasury or Barracks (+${BARRACKS_CAPACITY_V7} unit) | ${CITY_REWARD_COINS_V7.TREASURY_6} |`,
    `| 5 | 5 | Barracks or Treasury | ${CITY_REWARD_COINS_V7.TREASURY} |`,
    `| ${REWARD_UNIT_LEVEL_V7}+ | 6, 7, … | Barracks or Treasury; every city once: the Juggernaut (7r54; the first capital only, from level 5, in round 4) | ${CITY_REWARD_COINS_V7.TREASURY} |`,
    "",
    `A population point costs 2 to 3 Coins (the price list above), so level 5 costs 10 to 15 Coins of population and returns at most ${CITY_REWARD_COINS_V7.TREASURY}.`,
    "",
    "#### Sinks at 100 Coins and 40 income (LAB_LATE)",
    "",
    `- Hire: one unit a turn per Market at 1.5× (a Knight ${hireCostV7(9)}, a Catapult ${hireCostV7(8)}), one above the city's limit.`,
    `- Research: the 17th to 20th technologies cost ${[16, 17, 18, 19].map((owned) => tuning6ResearchCost(3, owned)).join(", ")} Coins.`,
    "",
  );
  return lines;
}

/**
 * Tuning 5 (`pulp_wars-w49.4`): the Guard against ranged attackers, the
 * Swordsman, and what a city earns against what a unit costs.
 */
function round5(): string[] {
  const at = (x: number, y: number): CoordV7 => ({ x, y });
  const lines: string[] = [
    "#### A Guard, two Marksmen, then a Fighter",
    "",
    "Seat 1 holds the Guard (it has Forestry); every attacker is at full HP. The Field Defense and Walls tiles are in the Guard's own territory.",
    "",
  ];
  // Seat 1's territory is x 1-3, y 7-9 with its center at (2, 8).
  const softened = (
    title: string,
    guardAt: CoordV7,
    walls: boolean,
    ground: Parameters<typeof sequence>[5],
    shooter: UnitRoleIdV7,
    finisher: UnitRoleIdV7 | null,
  ): string[] => {
    const first = at(guardAt.x - 1, guardAt.y - 2);
    const second = at(guardAt.x + 1, guardAt.y - 2);
    const range = shooter === "CATAPULT" ? 3 : 2;
    const shooters = [
      at(first.x, guardAt.y - range),
      at(second.x, guardAt.y - range),
    ] as const;
    const melee = at(guardAt.x, guardAt.y - 1);
    return sequence(
      title,
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: shooter, at: shooters[0] },
        { seat: 0, role: shooter, at: shooters[1] },
        ...(finisher === null
          ? []
          : [{ seat: 0, role: finisher, at: melee } as PieceV7]),
        { seat: 1, role: "GUARD", at: guardAt },
      ],
      [
        [shooters[0], guardAt],
        [shooters[1], guardAt],
        ...(finisher === null ? [] : [[melee, guardAt] as const]),
      ],
      walls,
      ground,
    );
  };
  const grounds: readonly {
    readonly name: string;
    readonly guardAt: CoordV7;
    readonly walls: boolean;
    readonly ground: Parameters<typeof sequence>[5];
  }[] = [
    { name: "in the open", guardAt: at(5, 5), walls: false, ground: {} },
    {
      name: "in Forest with Forestry",
      guardAt: at(5, 5),
      walls: false,
      ground: { forest: [at(5, 5)] },
    },
    {
      name: "on a Field Defense",
      guardAt: at(2, 7),
      walls: false,
      ground: { fieldDefense: [at(2, 7)] },
    },
    { name: "on a walled center", guardAt: at(2, 8), walls: true, ground: {} },
    {
      name: "on a walled center with a Field Defense",
      guardAt: at(2, 8),
      walls: true,
      ground: { fieldDefense: [at(2, 8)] },
    },
  ];
  for (const ground of grounds)
    lines.push(
      ...softened(
        `Two Marksmen, then a Fighter, on a Guard ${ground.name}`,
        ground.guardAt,
        ground.walls,
        ground.ground,
        "MARKSMAN",
        "FIGHTER",
      ),
    );
  lines.push("", "#### A Guard and two Catapults", "");
  for (const ground of grounds)
    lines.push(
      ...softened(
        `Two Catapults on a Guard ${ground.name}`,
        ground.guardAt,
        ground.walls,
        ground.ground,
        "CATAPULT",
        null,
      ),
    );
  lines.push("", "#### The Swordsman", "");
  lines.push(
    ...sequence(
      "A Swordsman attacks a Guard in the open on two turns (the Guard does not answer between them)",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 4) },
        { seat: 1, role: "GUARD", at: at(5, 5) },
      ],
      [
        [at(5, 4), at(5, 5)],
        [at(5, 4), at(5, 5)],
      ],
    ),
    ...sequence(
      "A Knight attacks a Swordsman in the open, then a second Knight",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(5, 4) },
        { seat: 0, role: "KNIGHT", at: at(4, 4) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 5) },
      ],
      [
        [at(5, 4), at(5, 5)],
        [at(4, 4), at(5, 5)],
      ],
    ),
    ...sequence(
      "Two Catapults fire at a Swordsman in the open",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(4, 2) },
        { seat: 0, role: "CATAPULT", at: at(6, 2) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 5) },
      ],
      [
        [at(4, 2), at(5, 5)],
        [at(6, 2), at(5, 5)],
      ],
    ),
    ...sequence(
      "Three Fighters attack a Swordsman in the open (6 Coins against 5)",
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 5) },
      ],
      [
        [at(4, 4), at(5, 5)],
        [at(5, 4), at(5, 5)],
        [at(6, 4), at(5, 5)],
      ],
    ),
  );
  lines.push("", "#### What a city earns against what a unit costs", "");
  lines.push(
    "A city pays min(level, 4), +1 for a founded capital, +1 with a Road link to another own city (Commerce; +1 by sea), plus its Market (up to 3). So a level-3 city earns 3 to 7 Coins and a level-4 or higher city 4 to 8 (9 for a capital with every bonus).",
    "",
    "| City | Income |",
    "| --- | --- |",
    "| level 3, no Market, no trade | 3 |",
    "| level 3, land trade | 4 |",
    "| level 3, Market 2, land trade | 6 |",
    "| level 4 or higher, no Market, no trade | 4 |",
    "| level 4 or higher, land trade | 5 |",
    "| level 4 or higher, Market 2, land trade | 7 |",
    "| level 4 or higher, Market 3, land trade | 8 |",
    "",
  );
  for (const faction of ["ORIGINAL", "GOBLIN", "UNDEAD"] as const) {
    const tree = factionTreeV7(faction);
    const roles = (
      [
        "FIGHTER",
        "GUARD",
        "RAIDER",
        "MARKSMAN",
        "CAPTAIN",
        "SWORDSMAN",
        "CATAPULT",
        "KNIGHT",
      ] as const
    ).filter(
      (role) =>
        role === "FIGHTER" ||
        tree.nodes.some((node) => node.unlockedRoles.includes(role)),
    );
    lines.push(
      `**${faction === "ORIGINAL" ? "Human" : faction === "GOBLIN" ? "Goblin" : "Undead"} units**`,
      "",
      "| Unit | Role | Technology (tier) | Cost | HP | Atk / Def | Cities of income 3 / 5 / 7 that pay for one a turn |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const role of roles) {
      const value = effectiveRoleRuleV7(role, faction);
      const cost = value.cost ?? 0;
      const tier =
        value.technology === null
          ? "—"
          : `${value.technology} (${String(tree.nodes.find((node) => node.id === value.technology)?.tier ?? "?")})`;
      lines.push(
        `| ${value.label} | ${role} | ${tier} | ${cost} | ${value.maxHp} | ${half(value.attack2)} / ${half(value.defense2)} | ${[3, 5, 7].map((income) => (cost <= income ? "yes" : "no")).join(" / ")} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

/**
 * Tuning 6 (`pulp_wars-w49.6`): the research price at 1 Coin a technology
 * owned (2 before), and what the Normal AI's research order costs for each
 * of the three army factions.
 */
function round6(): string[] {
  const before = (tier: 1 | 2 | 3, owned: number): number =>
    owned === 0 && tier === 1 ? 0 : 5 + 2 * (tier - 1) + 2 * (owned - 1);
  const lines: string[] = [
    "#### The price of the n-th technology",
    "",
    "| It is the player's | Tier 1: round 5 / round 6 | Tier 2 | Tier 3 |",
    "| --- | --- | --- | --- |",
  ];
  for (const nth of [2, 3, 4, 5, 6, 8, 10, 12, 16, 20])
    lines.push(
      `| ${nth}${nth === 2 ? "nd" : nth === 3 ? "rd" : "th"} | ${([1, 2, 3] as const).map((tier) => `${before(tier, nth - 1)} / ${tuning6ResearchCost(tier, nth - 1)}`).join(" | ")} |`,
    );
  const land = factionTreeV7("ORIGINAL").nodes.filter(
    (node) => node.branch !== "NAVAL",
  );
  const ordered = [...land].sort((left, right) => left.tier - right.tier);
  const whole = (price: (tier: 1 | 2 | 3, owned: number) => number): number =>
    ordered.reduce((total, node, owned) => total + price(node.tier, owned), 0);
  lines.push(
    "",
    `The whole land tree of ${land.length} technologies in tier order: ${whole(before)} Coins in round 5, ${whole(tuning6ResearchCost)} in round 6.`,
    "",
    "#### The Normal AI's research order from a Gathering opener",
    "",
    "Each faction's signature units first (`ARMY_RESEARCH_ROLES_V7`). The unit named is what the technology unlocks for that faction. With three cities Roads (by Scouting) comes after the first two units and Commerce after the last; the tables are for a seat with fewer.",
    "",
  );
  const orders: Readonly<
    Record<"ORIGINAL" | "UNDEAD" | "GOBLIN", readonly TechnologyIdV7[]>
  > = {
    ORIGINAL: [
      "HUNTING",
      "MARKSMANSHIP",
      "DRILL",
      "FORESTRY",
      "SAWMILLING",
      "SCOUTING",
      "RAIDING",
      "CHIVALRY",
      "ENGINEERING",
      "ADMINISTRATION",
    ],
    UNDEAD: [
      "DRILL",
      "HUNTING",
      "MARKSMANSHIP",
      "ADMINISTRATION",
      "FORESTRY",
      "SAWMILLING",
      "SCOUTING",
      "RAIDING",
      "CHIVALRY",
    ],
    GOBLIN: [
      "HUNTING",
      "MARKSMANSHIP",
      "SCOUTING",
      "FORESTRY",
      "SAWMILLING",
      "RAIDING",
      "CHIVALRY",
      "DRILL",
      "ADMINISTRATION",
    ],
  };
  for (const faction of ["ORIGINAL", "UNDEAD", "GOBLIN"] as const) {
    const tree = factionTreeV7(faction);
    lines.push(
      `**${faction === "ORIGINAL" ? "Humans" : faction === "UNDEAD" ? "Undead" : "Goblins"}**`,
      "",
      "| #   | Technology | Tier | Unit | Round 5 price | Round 6 price | Total, round 6 |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    );
    let totalNow = 0;
    orders[faction].forEach((tech, index) => {
      const node = tree.nodes.find((candidate) => candidate.id === tech);
      if (node === undefined) throw new Error(tech);
      const owned = index + 1;
      totalNow += tuning6ResearchCost(node.tier, owned);
      const unit = node.unlocks.flatMap((unlock) =>
        unlock.kind === "UNIT_ROLE"
          ? [effectiveRoleRuleV7(unlock.role, faction).label]
          : [],
      );
      lines.push(
        `| ${owned + 1} | ${tech} | ${node.tier} | ${unit.length === 0 ? "—" : unit.join(", ")} | ${before(node.tier, owned)} | ${tuning6ResearchCost(node.tier, owned)} | ${totalNow} |`,
      );
    });
    lines.push("");
  }
  return lines;
}

/**
 * The economy rejig (`pulp_wars-w49.16`, 7r54;
 * docs/product/RULESET_7_ECONOMY_REJIG.md): the research price by cities
 * against the price by technologies owned that it replaces.
 */
function rejig(): string[] {
  const cityCounts = [1, 3, 5, 8, 12] as const;
  const lines: string[] = [
    "#### Research price (tier 1 / tier 2 / tier 3)",
    "",
    "| Cities | 7r54 | 7r53 with 3 / 8 / 14 technologies owned |",
    "| --- | --- | --- |",
  ];
  for (const cities of cityCounts)
    lines.push(
      `| ${cities} | ${([1, 2, 3] as const).map((tier) => playerTechnologyResearchCostV7(tier, 1, cities)).join(" / ")} | ${[3, 8, 14].map((owned) => ([1, 2, 3] as const).map((tier) => tuning6ResearchCost(tier, owned)).join(" / ")).join("; ")} |`,
    );
  const land = factionTreeV7("ORIGINAL").nodes.filter(
    (node) => node.branch !== "NAVAL",
  );
  const ordered = [...land].sort((left, right) => left.tier - right.tier);
  lines.push(
    "",
    `#### The whole land tree (${land.length} technologies, tier order, the first free)`,
    "",
    "| Player | 7r53 | 7r54 |",
    "| --- | --- | --- |",
  );
  const before = ordered.reduce(
    (total, node, owned) => total + tuning6ResearchCost(node.tier, owned),
    0,
  );
  for (const cities of cityCounts)
    lines.push(
      `| ${cities} ${cities === 1 ? "city" : "cities"} throughout | ${before} | ${ordered.reduce((total, node, owned) => total + playerTechnologyResearchCostV7(node.tier, owned, cities), 0)} |`,
    );
  lines.push(
    "",
    `A Monument gives +${MONUMENT_POPULATION_V7} population (2 in 7r53). Every city offers the Juggernaut once from level ${REWARD_UNIT_LEVEL_V7} (the first capital only, from level 5, in 7r53).`,
  );
  return lines;
}

const part = process.argv[2] ?? "all";
const out: string[] = [
  `<!-- ${RULESET_7_ID}, scripts/human-tuning-analysis-v7.ts ${part} -->`,
  "",
];
if (part === "all" || part === "matrix")
  out.push("### Matchup matrix", "", ...matrix());
if (part === "all" || part === "scenarios")
  out.push("### Scenarios", "", ...scenarios(), "");
if (part === "all" || part === "technology")
  out.push("### Human technologies", "", ...technology(), "");
if (part === "all" || part === "economy")
  out.push("### Economy price list", "", ...economy(), "");
if (part === "all" || part === "round4")
  out.push("### Round 4", "", ...round4(), "");
if (part === "all" || part === "round5")
  out.push("### Round 5", "", ...round5(), "");
if (part === "all" || part === "round6")
  out.push("### Round 6", "", ...round6(), "");
if (part === "all" || part === "rejig")
  out.push("### The economy rejig", "", ...rejig(), "");
process.stdout.write(`${out.join("\n")}\n`);
