import { describe, expect, it } from "vitest";
import {
  ARMY_BOMB_FIRE_PRIORITY_V7,
  ARMY_RICH_INCOME_V7,
  ARMY_STORM_PRIORITY_V7,
  ARMY_STORM_UNITS_V7,
  ARMY_WAR_RESEARCH_ROUNDS_V7,
  ARMY_WAR_RESEARCH_SPARE_TURNS_V7,
  ARMY_BATTERY_PRIORITY_V7,
  ARMY_LATE_RESEARCH_V7,
} from "../../src/ai/v7-army";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
  inspectNormalTacticalFactsV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  CAMPAIGN_FRONT_NEED_RATIO_V7,
  CAMPAIGN_FRONT_SIZE_RADIUS_V7,
} from "../../src/ai/v7-campaign";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { LAB_BREAKTHROUGH_CAPITAL_V7 } from "../../src/engine/v7/missions/lab-breakthrough";
import {
  breakthroughLabV7,
  breakthroughPolicyTurnV7,
  breakthroughRetreatTurnV7,
} from "../fixtures/v7-breakthrough-lab";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  READY_V7,
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  at,
  fieldDefenseV7,
  fieldV7,
  forestV7,
  mountainV7,
  patchTileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

/**
 * Tuning 8 (`pulp_wars-w49.11`, identity unchanged at `pulp-wars-poc-7r69`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 15, the Normal AI of a
 * Human, Undead, or Goblin seat). Round 7 was played by hand four times
 * (`r7a` to `r7d`); every position below is one of those games, or the
 * smallest position that shows the same decision:
 *
 * 1. it captures what it reaches (a unit on an enemy center stays, the
 *    others cover it, and a center the shots empty is entered in the same
 *    turn);
 * 2. it researches while at war (on a clock), buys no economy technology
 *    in an assault, and a rich seat buys its dear units;
 * 3. it sends a group sized to the defenders at a held city and no lone
 *    unit, and its shooters go for the enemy's siege units;
 * 4. a Goblin seat explores and expands, throws its bombs before its own
 *    units close in, blows up in a cluster, calls WAAAGH! only before
 *    attacks, and pulls a spent fast unit back;
 * 5. a small seat grows its capital, counterattacks at home, and attacks
 *    with a unit that is lost anyway.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8),
 * seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8). Three-seat field
 * (14 x 14): capitals (2, 2), (11, 11), (11, 2). Every tile is explored by
 * every seat.
 */

const HUMANS = ["ORIGINAL", "ORIGINAL"] as const;
const GOBLINS = ["GOBLIN", "ORIGINAL"] as const;
const UNDEAD = ["UNDEAD", "ORIGINAL"] as const;
/** A closed set of technologies with no free Monument (no Scouting). */
const BASIC: readonly TechnologyIdV7[] = [
  "GATHERING",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "DRILL",
  "ENGINEERING",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Champion's technology
  // (the seats of this file field Swordsmen, the Champions of today).
  "METALLURGY",
];

/** Technologies in the order a state lists them. */
const techs = (...ids: readonly TechnologyIdV7[]): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => ids.includes(tech));

const field = (
  pieces: readonly GoblinPieceV7[],
  options: {
    readonly factions?: readonly FactionIdV7[];
    readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
    readonly coins?: number;
    readonly activeSeat?: number;
  } = {},
): GameStateV7 =>
  fieldV7(pieces, {
    factions: options.factions ?? HUMANS,
    techs: options.techs ?? { 0: BASIC },
    coins: options.coins ?? 0,
    ...(options.activeSeat === undefined
      ? {}
      : { activeSeat: options.activeSeat }),
  });

/** The field without its villages. */
function bare(state: GameStateV7): GameStateV7 {
  let next = state;
  for (const tile of state.board.tiles)
    if (tile.site === "VILLAGE")
      next = patchTileV7(next, tile.at, { site: null });
  return next;
}

interface PolicyTurnV7 {
  readonly commands: readonly CommandV7[];
  /** The state before the End Turn. */
  readonly state: GameStateV7;
  /** The state before each command. */
  readonly before: readonly GameStateV7[];
}

/** Seat `seat` plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7, seat = 0): PolicyTurnV7 {
  const actor = seatIdV7(start, seat);
  const commands: CommandV7[] = [];
  const before: GameStateV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    commands.push(command);
    before.push(state);
    if (command.kind === "END_TURN") return { commands, state, before };
    state = applyOkV7(state, actor, command).state;
    if (state.outcome !== null) return { commands, state, before };
  }
  throw new Error("the turn did not end");
}

/** Ends the turn of the active seat. */
const endTurn = (state: GameStateV7): GameStateV7 => {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no actor");
  return applyOkV7(state, actor, { kind: "END_TURN" }).state;
};

/** Every other seat ends its turn: seat `seat` is to move again. */
function nextRound(state: GameStateV7, seat = 0): GameStateV7 {
  return endTurnUntilV7(state, seatIdV7(state, seat)).state;
}

const kindsOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.map((command) => command.kind);

const attacksOf = (
  commands: readonly CommandV7[],
): readonly Extract<CommandV7, { kind: "ATTACK" }>[] =>
  commands.flatMap((command) => (command.kind === "ATTACK" ? [command] : []));

const movesOf = (
  commands: readonly CommandV7[],
): readonly Extract<CommandV7, { kind: "MOVE" }>[] =>
  commands.flatMap((command) => (command.kind === "MOVE" ? [command] : []));

const distance = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

const whereIs = (state: GameStateV7, id: UnitId): CoordV7 | null =>
  state.units.find((item) => item.id === id)?.at ?? null;

const cityAt = (state: GameStateV7, where: CoordV7) => {
  const city = state.cities.find((item) => same(item.at, where));
  if (city === undefined) throw new Error(`no city at ${where.x},${where.y}`);
  return city;
};

/** The priority the policy gives `command` in `state` (seat `seat`). */
const priorityOf = (state: GameStateV7, command: CommandV7, seat = 0): number =>
  scoreCommandV7(viewForV7(state, seatIdV7(state, seat)), command).priority;

const armyOf = (state: GameStateV7, seat = 0) =>
  inspectNormalArmyV7(viewForV7(state, seatIdV7(state, seat)));

const jobsOf = (state: GameStateV7, seat = 0) =>
  inspectNormalTacticalFactsV7(viewForV7(state, seatIdV7(state, seat))).campaign
    .assignments;

/** Seat `seat`'s units lose their home: they fill no unit slot. */
function homeless(state: GameStateV7, seat = 0): GameStateV7 {
  const own = seatIdV7(state, seat);
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.ownerId === own ? { ...unit, homeCityId: null } : unit,
    ),
  });
}

/** The state with `round` as its round and the Coins of seat `seat`. */
function withRound(
  state: GameStateV7,
  round: number,
  coins?: number,
  seat = 0,
): GameStateV7 {
  return checkedV7({
    ...state,
    round,
    players: state.players.map((player) =>
      player.seat === seat && coins !== undefined
        ? { ...player, coins }
        : player,
    ),
  });
}

// ---------------------------------------------------------------------------
// A scene: a local position of a hand-played game, rebuilt on a field. The
// cities are villages a unit of their owner captures during the setup (so
// that territory, levels, and Walls are the engine's own), the units and
// the terrain around them are placed as they stood, and the seat that is to
// move starts its turn.
// ---------------------------------------------------------------------------

interface SceneCityV7 {
  readonly seat: number;
  readonly at: CoordV7;
  /**
   * Five harvests take the city to level 3 with Walls (its owner needs
   * Gathering, and Hunting for a Forest).
   */
  readonly walls?: boolean;
}

interface SceneV7 {
  readonly factions: readonly FactionIdV7[];
  /** The seat that is to move. */
  readonly active: number;
  readonly cities: readonly SceneCityV7[];
  readonly units: readonly GoblinPieceV7[];
  readonly forests?: readonly CoordV7[];
  readonly mountains?: readonly CoordV7[];
  readonly techs: Readonly<Record<number, readonly TechnologyIdV7[]>>;
  readonly coins?: number;
}

function scene(options: SceneV7): GameStateV7 {
  // A capturer on every city tile (its garrison when the scene has one).
  const stand = options.cities
    .filter((city) => !options.units.some((unit) => same(unit.at, city.at)))
    .map((city): GoblinPieceV7 => ({
      seat: city.seat,
      role: "FIGHTER",
      at: city.at,
    }));
  let state = bare(
    fieldV7(
      [...options.units, ...stand].map((piece) => ({
        ...piece,
        captureEligible: options.cities.some((city) => same(city.at, piece.at)),
      })),
      { factions: options.factions, coins: 100, techs: options.techs },
    ),
  );
  for (const city of options.cities)
    state = patchTileV7(state, city.at, { site: "VILLAGE" });
  for (const where of options.forests ?? []) state = forestV7(state, where);
  for (const where of options.mountains ?? []) state = mountainV7(state, where);
  // Each seat captures its cities in its own turn.
  for (let seat = 0; seat < options.factions.length; seat += 1) {
    const mine = options.cities.filter((city) => city.seat === seat);
    if (mine.length === 0) continue;
    const owner = seatIdV7(state, seat);
    if (state.turnOrder[state.activeSeatIndex] !== owner)
      state = endTurnUntilV7(state, owner).state;
    for (const city of mine) {
      state = applyOkV7(state, owner, {
        kind: "CAPTURE",
        unitId: unitAtV7(state, city.at).id,
      }).state;
      if (city.walls !== true) continue;
      const founded = cityAt(state, city.at);
      // Fruit on its Grass and Game in its Forests, also under its own
      // units (never under another seat's).
      const tiles = state.board.tiles
        .filter(
          (tile) =>
            tile.territoryCityId === founded.id &&
            (tile.terrain === "GRASS" || tile.terrain === "FOREST") &&
            !same(tile.at, city.at) &&
            !state.units.some(
              (unit) => same(unit.at, tile.at) && unit.ownerId !== owner,
            ),
        )
        .slice(0, 5);
      if (tiles.length < 5) throw new Error("no room for five harvests");
      for (const tile of tiles) {
        const fruit = tile.terrain === "GRASS";
        state = patchTileV7(state, tile.at, {
          resource: fruit ? "FRUIT" : "GAME",
        });
        state = applyOkV7(state, owner, {
          kind: fruit ? "HARVEST_FRUIT" : "HUNT_GAME",
          at: tile.at,
        }).state;
        for (const choice of state.pendingChoices)
          if (choice.kind === "CITY_REWARD")
            state = applyOkV7(state, owner, {
              kind: "CHOOSE_CITY_REWARD",
              cityId: choice.cityId,
              reachedLevel: choice.reachedLevel,
              reward: choice.reachedLevel === 3 ? "WALLS" : "STOCKPILE",
            }).state;
      }
    }
  }
  const mover = seatIdV7(state, options.active);
  if (state.turnOrder[state.activeSeatIndex] !== mover)
    state = endTurnUntilV7(state, mover).state;
  // The units as they stood (HP and activation), the stand-ins gone, and
  // the seats' own technologies and Coins.
  return checkedV7({
    ...state,
    players: state.players.map((player) => ({
      ...player,
      coins: options.coins ?? 0,
    })),
    units: state.units.flatMap((unit): UnitStateV7[] => {
      const piece = options.units.find((item) => same(item.at, unit.at));
      if (piece === undefined) return [];
      return [
        {
          ...unit,
          hp:
            piece.hp ??
            effectiveRoleRuleV7(
              unit.role,
              options.factions[piece.seat] ?? "ORIGINAL",
            ).maxHp,
          captureEligible: false,
          activation: { ...READY_V7, ...piece.activation },
        },
      ];
    }),
  });
}

describe("tuning 8 identity", () => {
  it("is still 7r49: no rule, command, state, or event shape changed", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r69");
  });
});

describe("1. it captures what it reaches", () => {
  /**
   * `r7c`, round 13 (20 x 20, seed 21), moved by (-5, +2) onto the
   * three-seat field. The player's level-1 border city at (7, 6) is held
   * by one Fighter at 5 HP; the AI's city (10, 9) is three tiles away. Its
   * Raider at (10, 8) charges the Fighter, kills it, and stands on the
   * center. In the game it then rode off with its Escape, with no unit of
   * the player within three tiles. (The Bomb Chucker of a fourth seat, four
   * tiles from the city, is left out.)
   */
  const round13 = (): GameStateV7 =>
    scene({
      factions: ["ORIGINAL", "ORIGINAL", "UNDEAD"],
      active: 0,
      cities: [
        { seat: 1, at: at(2, 8) },
        { seat: 0, at: at(5, 11) },
      ],
      units: [
        { seat: 1, role: "FIGHTER", at: at(2, 8), hp: 5 },
        { seat: 0, role: "RAIDER", at: at(2, 9), hp: 1 },
        { seat: 0, role: "RAIDER", at: at(5, 10) },
        { seat: 0, role: "GUARD", at: at(5, 11) },
        { seat: 0, role: "FIGHTER", at: at(5, 12) },
        { seat: 0, role: "FIGHTER", at: at(6, 12) },
        { seat: 0, role: "MARKSMAN", at: at(4, 13) },
        { seat: 2, role: "GUARD", at: at(3, 5), hp: 8 },
        { seat: 2, role: "GUARD", at: at(7, 5), hp: 10 },
        // The garrisons of the three capitals, far from the scene.
        { seat: 0, role: "GUARD", at: at(2, 2) },
        { seat: 1, role: "GUARD", at: at(11, 11) },
        { seat: 2, role: "GUARD", at: at(11, 2) },
      ],
      mountains: [at(1, 8), at(4, 8), at(3, 10)],
      forests: [
        at(0, 9),
        at(1, 9),
        at(2, 9),
        at(0, 10),
        at(1, 10),
        at(2, 10),
        at(4, 10),
      ],
      techs: {
        0: [
          "GATHERING",
          "HUNTING",
          "MARKSMANSHIP",
          "SCOUTING",
          "ROADS",
          "DRILL",
          "FORTIFICATION",
        ],
        1: ["GATHERING", "DRILL", "ENGINEERING", "FORTIFICATION"],
        2: ["GATHERING", "FARMING", "DRILL", "ENGINEERING", "FORTIFICATION"],
      },
    });

  it("r7c round 13: the Raider that takes the center stays on it and captures", () => {
    const start = round13();
    const raider = unitAtV7(start, at(5, 10)).id;
    const turn = policyTurn(start);
    // It kills the garrison and advances onto the center ...
    expect(
      attacksOf(turn.commands).some((command) => command.unitId === raider),
    ).toBe(true);
    expect(whereIs(turn.state, raider)).toEqual(at(2, 8));
    // ... and makes no Move afterwards (round 7: the Escape).
    const attacked = turn.commands.findIndex(
      (command) => command.kind === "ATTACK" && command.unitId === raider,
    );
    expect(
      turn.commands
        .slice(attacked + 1)
        .some(
          (command) => command.kind === "MOVE" && command.unitId === raider,
        ),
    ).toBe(false);
    // Next turn it captures the city.
    const next = policyTurn(nextRound(turn.state));
    expect(next.commands[0]).toEqual({ kind: "CAPTURE", unitId: raider });
    expect(cityAt(next.state, at(2, 8)).ownerId).toBe(seatIdV7(start, 0));
  });

  /**
   * `r7c`, round 24, moved by (-4, +2): the same city, now level 3 with
   * Walls, a Swordsman at 8 HP on its center, four more units of the
   * player beside it and his Catapults behind; the AI (seat 1 here) has
   * its three cities south and east of it, the Undead seat one in the
   * south-west. The AI's Marksman at (9, 7) and its Raider at (8, 7) kill
   * the Swordsman; in the game the Raider then left the walled center with
   * its Escape and nothing followed it. (Three AI units at the east edge
   * of the scene and the Lich's veterancy are left out.)
   */
  const round24 = (battery = true): GameStateV7 =>
    scene({
      factions: ["ORIGINAL", "ORIGINAL", "UNDEAD"],
      active: 1,
      cities: [
        { seat: 0, at: at(3, 8), walls: true },
        { seat: 1, at: at(6, 11) },
        { seat: 1, at: at(3, 11) },
        { seat: 1, at: at(6, 8) },
        { seat: 2, at: at(0, 11) },
      ],
      units: [
        // The player: the garrison, the four units beside the city, and
        // the battery behind it.
        { seat: 0, role: "SWORDSMAN", at: at(3, 8), hp: 8 },
        { seat: 0, role: "SWORDSMAN", at: at(3, 7), hp: 9 },
        { seat: 0, role: "SWORDSMAN", at: at(3, 9) },
        { seat: 0, role: "FIGHTER", at: at(2, 7) },
        { seat: 0, role: "FIGHTER", at: at(4, 6), hp: 7 },
        { seat: 0, role: "SWORDSMAN", at: at(1, 5) },
        ...(battery
          ? [{ seat: 0, role: "CATAPULT" as const, at: at(2, 5) }]
          : []),
        { seat: 0, role: "MARKSMAN", at: at(3, 5) },
        ...(battery
          ? [{ seat: 0, role: "CATAPULT" as const, at: at(4, 5) }]
          : []),
        { seat: 0, role: "GUARD", at: at(5, 5) },
        { seat: 0, role: "MARKSMAN", at: at(0, 6) },
        // The AI.
        { seat: 1, role: "FIGHTER", at: at(5, 7) },
        { seat: 1, role: "FIGHTER", at: at(6, 8) },
        { seat: 1, role: "RAIDER", at: at(4, 9), hp: 7 },
        { seat: 1, role: "MARKSMAN", at: at(5, 9) },
        { seat: 1, role: "RAIDER", at: at(6, 9) },
        { seat: 1, role: "MARKSMAN", at: at(7, 9) },
        { seat: 1, role: "FIGHTER", at: at(5, 10) },
        { seat: 1, role: "FIGHTER", at: at(6, 10) },
        { seat: 1, role: "GUARD", at: at(3, 11) },
        { seat: 1, role: "FIGHTER", at: at(4, 11), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(6, 11) },
        { seat: 1, role: "GUARD", at: at(4, 12), hp: 15 },
        { seat: 1, role: "FIGHTER", at: at(5, 12) },
        { seat: 1, role: "FIGHTER", at: at(6, 12) },
        { seat: 1, role: "MARKSMAN", at: at(7, 12) },
        { seat: 1, role: "GUARD", at: at(3, 13), hp: 1 },
        { seat: 1, role: "GUARD", at: at(4, 13), hp: 3 },
        { seat: 1, role: "MARKSMAN", at: at(7, 13), hp: 8 },
        // The Undead seat.
        { seat: 2, role: "FIGHTER", at: at(0, 11) },
        { seat: 2, role: "FIGHTER", at: at(2, 11), hp: 4 },
        { seat: 2, role: "CATAPULT", at: at(0, 12) },
        { seat: 2, role: "GUARD", at: at(2, 12), hp: 10 },
        { seat: 2, role: "GUARD", at: at(3, 12), hp: 10 },
        { seat: 2, role: "GUARD", at: at(1, 13) },
        // The garrisons of the three capitals, far from the scene.
        { seat: 0, role: "GUARD", at: at(2, 2) },
        { seat: 1, role: "GUARD", at: at(11, 11) },
        { seat: 2, role: "GUARD", at: at(11, 2) },
      ],
      mountains: [at(0, 5), at(6, 5), at(0, 6), at(2, 8), at(5, 8), at(4, 10)],
      forests: [
        at(5, 5),
        at(7, 5),
        at(6, 6),
        at(1, 7),
        at(5, 7),
        at(1, 9),
        at(2, 9),
        at(3, 9),
        at(0, 12),
        at(5, 12),
      ],
      techs: {
        0: [
          "GATHERING",
          "HUNTING",
          "FORESTRY",
          "SAWMILLING",
          "MARKSMANSHIP",
          "SCOUTING",
          "RAIDING",
          "CHIVALRY",
          "DRILL",
          "ENGINEERING",
          "FORTIFICATION",
        ],
        1: [
          "GATHERING",
          "FARMING",
          "HUNTING",
          "FORESTRY",
          "MARKSMANSHIP",
          "SCOUTING",
          "ROADS",
          "DRILL",
          "FORTIFICATION",
        ],
        2: [
          "HUNTING",
          "FORESTRY",
          "SAWMILLING",
          "DRILL",
          "ENGINEERING",
          "FORTIFICATION",
        ],
      },
    });

  it("r7c round 24, under the player's two Catapults: the Raider does not ride onto the center to be shot there; the Marksman still fires", () => {
    // Correction pass: in `r8a` six units in a row stepped onto a center
    // inside the range of two to four Catapults and died before they could
    // capture. Here the Raider (7 HP) would kill the garrison, advance,
    // and stand under two Catapults and four units.
    const start = round24();
    const raider = unitAtV7(start, at(4, 9)).id;
    const marksman = unitAtV7(start, at(5, 9)).id;
    const garrison = unitAtV7(start, at(3, 8)).id;
    const turn = policyTurn(start, 1);
    expect(
      attacksOf(turn.commands)
        .filter((command) => command.targetUnitId === garrison)
        .map((command) => command.unitId),
    ).toEqual([marksman]);
    expect(whereIs(turn.state, raider)).not.toEqual(at(3, 8));
    expect(
      turn.state.units.some(
        (unit) =>
          unit.ownerId === seatIdV7(start, 1) && same(unit.at, at(3, 8)),
      ),
    ).toBe(false);
  });

  it("r7c round 24 without the battery: the Raider stays on the walled center, a unit comes up beside it, and it captures", () => {
    const start = round24(false);
    const city = cityAt(start, at(3, 8));
    expect(city.level).toBe(3);
    expect(city.rewards.map((entry) => entry.reward)).toContain("WALLS");
    const raider = unitAtV7(start, at(4, 9)).id;
    const marksman = unitAtV7(start, at(5, 9)).id;
    const garrison = unitAtV7(start, at(3, 8)).id;
    const turn = policyTurn(start, 1);
    // The shot first, then the charge: the Swordsman dies ...
    const onGarrison = attacksOf(turn.commands).filter(
      (command) => command.targetUnitId === garrison,
    );
    expect(onGarrison.map((command) => command.unitId)).toEqual([
      marksman,
      raider,
    ]);
    // ... and the Raider stands on the center at the end of the turn.
    expect(whereIs(turn.state, raider)).toEqual(at(3, 8));
    const charged = turn.commands.findIndex(
      (command) => command.kind === "ATTACK" && command.unitId === raider,
    );
    expect(
      turn.commands
        .slice(charged + 1)
        .some((command) => "unitId" in command && command.unitId === raider),
    ).toBe(false);
    // Another unit of the AI has come next to the center.
    const own = seatIdV7(start, 1);
    const beside = (state: GameStateV7): number =>
      state.units.filter(
        (unit) =>
          unit.ownerId === own &&
          unit.id !== raider &&
          distance(unit.at, at(3, 8)) === 1,
      ).length;
    expect(beside(turn.state)).toBeGreaterThan(beside(start));
    // (The player's seat passes here: with four units beside the center
    // a player kills the Raider. The rule is that it does not leave.)
    const next = policyTurn(nextRound(turn.state, 1), 1);
    expect(next.commands).toContainEqual({ kind: "CAPTURE", unitId: raider });
    expect(cityAt(next.state, at(3, 8)).ownerId).toBe(own);
  });

  /**
   * `r7a`, the AI's turn of round 9 on `LAB_BREAKTHROUGH`: the line is
   * gone, the player has six Catapults two and three tiles behind his
   * capital and retrains a cheap garrison on its center every turn. The
   * AI's Catapults kill that garrison every turn; in the game the center
   * then stood empty at the end of rounds 8, 9, 10, and 11 with AI units
   * one and two tiles away, and the capital was not taken in twelve rounds.
   * The board is the lab's after the player's three Lumber Camps of round
   * 1 (the capital at level 5); the units stand as they stood.
   */
  const standoff = (): GameStateV7 => {
    let state = breakthroughLabV7("LAB_BREAKTHROUGH");
    const player = state.humanPlayerId;
    for (const where of [at(6, 5), at(6, 7), at(6, 8)]) {
      state = applyOkV7(state, player, {
        kind: "BUILD_LUMBER_CAMP",
        at: where,
      }).state;
      for (const choice of state.pendingChoices)
        if (choice.kind === "CITY_REWARD")
          state = applyOkV7(state, player, {
            kind: "CHOOSE_CITY_REWARD",
            cityId: choice.cityId,
            reachedLevel: choice.reachedLevel,
            reward: "JUGGERNAUT",
          }).state;
    }
    state = endTurn(state);
    const ai = state.players.find((entry) => entry.id !== player);
    if (ai === undefined) throw new Error("no AI seat");
    const mine: readonly (readonly [UnitRoleIdV7, number, number, number?])[] =
      [
        ["SWORDSMAN", 1, 2],
        ["CATAPULT", 2, 3],
        ["SWORDSMAN", 3, 3],
        ["CATAPULT", 2, 4],
        ["CATAPULT", 3, 4],
        ["CATAPULT", 3, 6, 6],
        ["FIGHTER", 4, 7],
        ["CATAPULT", 3, 11],
        ["CATAPULT", 2, 12],
        ["SWORDSMAN", 3, 12],
        ["SWORDSMAN", 2, 13],
      ];
    const theirs: readonly (readonly [
      UnitRoleIdV7,
      number,
      number,
      number?,
    ])[] = [
      ["FIGHTER", 9, 3],
      ["MARKSMAN", 6, 4],
      ["CATAPULT", 7, 4],
      ["MARKSMAN", 8, 4],
      ["FIGHTER", 9, 4],
      ["MARKSMAN", 6, 5],
      ["GUARD", 7, 5],
      ["KNIGHT", 8, 5],
      ["SWORDSMAN", 7, 6, 7],
      ["CATAPULT", 8, 6],
      ["CATAPULT", 7, 7],
      ["MARKSMAN", 6, 8],
      ["GUARD", 7, 9],
      ["KNIGHT", 14, 5],
      ["KNIGHT", 14, 11],
    ];
    const units = [
      ...mine.map((entry) => ({ entry, owner: player, faction: "ORIGINAL" })),
      ...theirs.map((entry) => ({
        entry,
        owner: ai.id,
        faction: ai.faction,
      })),
    ].map(({ entry, owner, faction }, index): UnitStateV7 => {
      const [role, x, y, hp] = entry;
      const rule = effectiveRoleRuleV7(role, faction as FactionIdV7);
      return {
        id: (state.nextEntityId + index) as UnitId,
        ownerId: owner,
        homeCityId: null,
        role,
        form: "LAND",
        at: at(x, y),
        hp: hp ?? rule.maxHp,
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: READY_V7,
      };
    });
    return checkedV7({
      ...state,
      round: 9,
      nextEntityId: state.nextEntityId + units.length,
      units,
      players: state.players.map((entry) => ({
        ...entry,
        coins: entry.id === player ? 7 : 28,
      })),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.fieldDefense ? { ...tile, fieldDefense: false } : tile,
        ),
      },
    });
  };

  it("r7a round 9: the Catapults empty the capital's center, a unit steps in, and the capital falls", () => {
    let state = standoff();
    const player = state.humanPlayerId;
    const capital = LAB_BREAKTHROUGH_CAPITAL_V7;
    expect(unitAtV7(state, capital).role).toBe("FIGHTER");
    let fell: number | null = null;
    let steppedIn = false;
    const emptyAfter: number[] = [];
    for (let turn = 0; turn < 6 && fell === null; turn += 1) {
      const round = state.round;
      const before = state;
      const ai = breakthroughPolicyTurnV7(state);
      state = ai.state;
      // A unit of the AI ends this turn on the center: after the shots
      // (or a kill hand to hand) it went in.
      const onCenter = state.units.find((unit) => same(unit.at, capital));
      if (
        onCenter !== undefined &&
        onCenter.ownerId !== player &&
        !before.units.some(
          (unit) => unit.id === onCenter.id && same(unit.at, capital),
        )
      )
        steppedIn = true;
      if (onCenter === undefined) emptyAfter.push(round);
      if (cityAt(state, capital).ownerId !== player) fell = round;
      if (fell === null && state.outcome === null)
        state = breakthroughRetreatTurnV7(state, true);
    }
    expect(steppedIn).toBe(true);
    // (Round 7 by hand: not taken by round 12, the center empty at the end
    // of rounds 9, 10, and 11. Round 7 against this script: taken in round
    // 12, empty after rounds 9 and 10. Round 8 as first written: a unit in
    // after the shots in round 10, the capital in round 11.) Correction
    // pass: nothing steps onto the center while the six Catapults kill it
    // there; the units go for the Catapults first, and the capital falls a
    // round later against this script (round 12), with the battery gone.
    expect(emptyAfter).toEqual([9, 10]);
    expect(fell).toBe(12);
  });

  /**
   * The same decision in one turn: the enemy capital (2, 8) with a Fighter
   * on its center, a Catapult and a Marksman of the AI in range,
   * a Fighter beside the center, and an enemy Catapult beside that Fighter.
   */
  const emptied = (): GameStateV7 =>
    bare(
      field([
        { seat: 0, role: "CATAPULT", at: at(5, 8) },
        { seat: 0, role: "MARKSMAN", at: at(4, 9) },
        { seat: 0, role: "FIGHTER", at: at(3, 7) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
        { seat: 1, role: "CATAPULT", at: at(3, 6) },
      ]),
    );

  it("fires at the garrison first, then steps onto the emptied center, and captures", () => {
    const start = emptied();
    const stormer = unitAtV7(start, at(3, 7)).id;
    const garrison = unitAtV7(start, at(2, 8)).id;
    const turn = policyTurn(start);
    const shots = attacksOf(turn.commands).filter(
      (command) => command.targetUnitId === garrison,
    );
    expect(shots.map((command) => command.unitId)).toEqual([
      unitAtV7(start, at(5, 8)).id,
      unitAtV7(start, at(4, 9)).id,
    ]);
    // The Fighter beside the center kept its Move for it: no attack on
    // the Catapult next to it, and it goes in after the last shot.
    expect(
      attacksOf(turn.commands).some((command) => command.unitId === stormer),
    ).toBe(false);
    const stepped = turn.commands.findIndex(
      (command) => command.kind === "MOVE" && command.unitId === stormer,
    );
    const lastShot = turn.commands.findIndex((command) => command === shots[1]);
    expect(stepped).toBeGreaterThan(lastShot);
    expect(whereIs(turn.state, stormer)).toEqual(at(2, 8));
    const next = policyTurn(nextRound(turn.state));
    expect(next.commands[0]).toEqual({ kind: "CAPTURE", unitId: stormer });
    expect(cityAt(next.state, at(2, 8)).ownerId).toBe(seatIdV7(start, 0));
  });

  it("walks its nearest capturers at an empty enemy center, more of them under the enemy's shooters", () => {
    expect(ARMY_STORM_UNITS_V7).toBe(2);
    // An empty enemy center four tiles from five Fighters; `shooters`
    // enemy Catapults stand within four tiles of it (far from the
    // Fighters' way).
    const position = (shooters: number): GameStateV7 =>
      bare(
        field([
          { seat: 0, role: "FIGHTER", at: at(6, 6) },
          { seat: 0, role: "FIGHTER", at: at(6, 7) },
          { seat: 0, role: "FIGHTER", at: at(6, 8) },
          { seat: 0, role: "FIGHTER", at: at(6, 9) },
          { seat: 0, role: "FIGHTER", at: at(6, 10) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          ...[at(0, 5), at(0, 10), at(1, 5), at(1, 10)]
            .slice(0, shooters)
            .map((where): GoblinPieceV7 => ({
              seat: 1,
              role: "CATAPULT",
              at: where,
            })),
        ]),
      );
    const stormers = (state: GameStateV7): number => {
      const turn = policyTurn(state);
      return turn.commands.filter((command, index) => {
        const before = turn.before[index];
        return (
          command.kind === "MOVE" &&
          before !== undefined &&
          priorityOf(before, command) === ARMY_STORM_PRIORITY_V7
        );
      }).length;
    };
    expect(stormers(position(1))).toBe(3);
    // Correction pass: four Catapults that cover the center kill whatever
    // steps onto it, so the Fighters go for the Catapults first.
    expect(stormers(position(4))).toBe(0);
    const battery = policyTurn(position(4));
    expect(
      battery.commands.filter((command, index) => {
        const before = battery.before[index];
        return (
          command.kind === "MOVE" &&
          before !== undefined &&
          priorityOf(before, command) === ARMY_BATTERY_PRIORITY_V7
        );
      }).length,
    ).toBeGreaterThanOrEqual(3);
    // And one of them stands on the center four turns later.
    let state = position(1);
    for (let turn = 0; turn < 4; turn += 1)
      state = nextRound(policyTurn(state).state);
    expect(state.units.find((unit) => same(unit.at, at(2, 8)))?.ownerId).toBe(
      seatIdV7(state, 0),
    );
  });
  it("of two units beside an empty enemy center the sturdier one steps onto it", () => {
    // The Undead match of section 15.6: a Skeleton (10 HP) stepped onto a
    // center three turns running with a Zombie (17 HP, Defense 3) beside
    // it, and each Skeleton was killed before it could capture.
    const start = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(3, 7) },
          { seat: 0, role: "GUARD", at: at(3, 8) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "MARKSMAN", at: at(0, 10) },
        ],
        { factions: UNDEAD },
      ),
    );
    const zombie = unitAtV7(start, at(3, 8)).id;
    const turn = policyTurn(start);
    const step = movesOf(turn.commands).find((command) =>
      same(command.path.at(-1) ?? at(-1, -1), at(2, 8)),
    );
    expect(step?.unitId).toBe(zombie);
    expect(whereIs(turn.state, zombie)).toEqual(at(2, 8));
  });
});

describe("2. research while at war", () => {
  const researchOf = (commands: readonly CommandV7[]): readonly string[] =>
    commands.flatMap((command) =>
      command.kind === "RESEARCH" ? [command.tech] : [],
    );
  const coinsOf = (state: GameStateV7, seat = 0): number =>
    state.players.find((player) => player.seat === seat)?.coins ?? 0;

  /**
   * An Undead seat with Gathering and Drill (the hand-played `r7d`: three
   * technologies in twenty-one rounds, never Hunting), and since the
   * Industry reshuffle (`pulp_wars-w49.21`, 7r56) Fortification, where the
   * Zombie it fields is now: its capital can
   * train, two of its units stand in the field, and a Human Fighter is
   * three tiles from them. (Step two of the Undead pass, `pulp_wars-w49.24`:
   * and a third unit beside the capital, so that the seat fields its
   * cities and two more and is not short of units; a seat that is trains
   * first, `tests/unit/ruleset-v7-undead-step2.test.ts`.)
   */
  const undeadAtWar = (round: number, coins: number): GameStateV7 =>
    withRound(
      homeless(
        bare(
          field(
            [
              { seat: 0, role: "FIGHTER", at: at(6, 7) },
              { seat: 0, role: "GUARD", at: at(6, 8) },
              { seat: 0, role: "FIGHTER", at: at(9, 9) },
              { seat: 1, role: "FIGHTER", at: at(3, 7) },
              { seat: 1, role: "FIGHTER", at: at(2, 8) },
            ],
            {
              factions: UNDEAD,
              techs: { 0: techs("GATHERING", "DRILL", "FORTIFICATION") },
            },
          ),
        ),
      ),
      round,
      coins,
    );

  /** What seat 0 earns a turn, and the price of its next technology. */
  const economy = (
    state: GameStateV7,
  ): {
    readonly income: number;
    readonly cost: number;
    readonly tech: string;
  } => {
    const target = armyOf(state).research;
    if (target === null) throw new Error("no research target");
    return {
      income: coinsOf(nextRound(endTurn(state))) - coinsOf(state),
      cost: target.cost,
      tech: target.tech,
    };
  };
  /** The rounds one technology stands for on the clock of seat 0. */
  const clock = (state: GameStateV7): number => {
    const { income, cost } = economy(state);
    return Math.max(
      ARMY_WAR_RESEARCH_ROUNDS_V7,
      Math.ceil(cost / income) + ARMY_WAR_RESEARCH_SPARE_TURNS_V7,
    );
  };

  it("buys the next technology of its order on the clock, before its units, and still trains", () => {
    expect(ARMY_WAR_RESEARCH_ROUNDS_V7).toBe(3);
    expect(ARMY_WAR_RESEARCH_SPARE_TURNS_V7).toBe(1);
    // Toward the Banshee (Marksmanship) the first step is Hunting. Two
    // technologies owned as the clock counts them (the root of Industry
    // does not count since 7r56, when the Zombie went on to
    // Fortification): the next is due in the round that is twice the
    // clock (three rounds a technology, or the turns this seat's income
    // needs to pay the price and one more).
    const { cost, tech } = economy(undeadAtWar(1, 0));
    expect(tech).toBe("HUNTING");
    const due = 2 * clock(undeadAtWar(1, 0));
    // The Coins for Hunting and a Skeleton.
    const turn = policyTurn(undeadAtWar(due, cost + 2));
    expect(kindsOf(turn.commands).slice(0, 2)).toEqual(["RESEARCH", "TRAIN"]);
    expect(researchOf(turn.commands)).toEqual(["HUNTING"]);
    expect(coinsOf(turn.state)).toBe(0);
    // One round earlier the clock has not struck: the unit comes first (a
    // Zombie), and what is left does not reach the technology.
    const early = policyTurn(undeadAtWar(due - 1, cost + 2));
    expect(kindsOf(early.commands)[0]).toBe("TRAIN");
    expect(researchOf(early.commands)).toEqual([]);
  });

  it("keeps the Coins for a due technology it cannot pay yet, and buys it next turn", () => {
    const { cost, income } = economy(undeadAtWar(1, 0));
    const due = 2 * clock(undeadAtWar(1, 0));
    expect(cost).toBeGreaterThan(income);
    // One Coin short: round 7 spent everything on units, every turn, and
    // never had the price. Now it ends its turn at most one turn of income
    // short of it, and buys it in its next turn.
    const short = policyTurn(undeadAtWar(due, cost - 1));
    expect(researchOf(short.commands)).toEqual([]);
    expect(coinsOf(short.state)).toBeGreaterThanOrEqual(cost - income);
    const second = policyTurn(nextRound(short.state));
    expect(second.commands[0]).toEqual({ kind: "RESEARCH", tech: "HUNTING" });
  });

  it("with an enemy at its gates trains before anything and keeps no Coins back", () => {
    const pressed = withRound(
      homeless(
        bare(
          field(
            [
              { seat: 0, role: "FIGHTER", at: at(7, 7) },
              { seat: 0, role: "GUARD", at: at(9, 9) },
              { seat: 1, role: "FIGHTER", at: at(6, 6) },
              { seat: 1, role: "FIGHTER", at: at(2, 8) },
            ],
            {
              factions: UNDEAD,
              techs: { 0: techs("GATHERING", "DRILL", "FORTIFICATION") },
            },
          ),
        ),
      ),
      6,
      4,
    );
    const turn = policyTurn(pressed);
    expect(kindsOf(turn.commands)).toContain("TRAIN");
    expect(coinsOf(turn.state)).toBeLessThan(2);
  });

  /**
   * An attacker whose army is engaged: every unit technology of its order
   * 40 Coins and its army in front of the enemy. The lab attackers of round
   * 7 bought Roads, Commerce, Fieldcraft, and Fortification in the middle
   * of their assault. `slots`: its capital has a free unit slot (and the
   * seat still lacks the Knight's technologies); otherwise it owns every
   * unit technology of its order and stands at its unit limit.
   */
  const engaged = (slots: boolean): GameStateV7 => {
    const state = withRound(
      bare(
        field(
          [
            { seat: 0, role: "SWORDSMAN", at: at(5, 7) },
            { seat: 0, role: "SWORDSMAN", at: at(5, 8) },
            { seat: 0, role: "MARKSMAN", at: at(6, 8) },
            { seat: 0, role: "FIGHTER", at: at(6, 9) },
            { seat: 1, role: "GUARD", at: at(3, 8) },
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          {
            techs: {
              // (The Industry reshuffle, 7r56: and Fortification, the
              // Guard's technology.)
              0: slots
                ? techs(...BASIC, "ADMINISTRATION", "FORTIFICATION")
                : techs(
                    ...BASIC,
                    "FORTIFICATION",
                    "SCOUTING",
                    "RAIDING",
                    "CHIVALRY",
                    "ADMINISTRATION",
                  ),
            },
          },
        ),
      ),
      12,
      40,
    );
    return slots ? homeless(state) : state;
  };

  it("buys units, and no economy technology, while its army is engaged", () => {
    // With a free unit slot (and the Knight's technologies still to
    // come, not yet due): the unit first, and what is left goes toward
    // the Knight, not into Roads or Farming.
    const turn = policyTurn(engaged(true));
    expect(kindsOf(turn.commands)).toContain("TRAIN");
    expect(kindsOf(turn.commands).indexOf("TRAIN")).toBeLessThan(
      kindsOf(turn.commands).indexOf("RESEARCH"),
    );
    // (The economy rejig, `pulp_wars-w49.16`: with its one city a
    // technology costs its tier's base, 5 / 7 / 9, whatever it owns, so
    // the 38 Coins left after the unit buy the Knight's three technologies
    // and Fieldcraft; they bought Scouting and Raiding at 13 and 16.)
    expect(researchOf(turn.commands)).toEqual([
      "SCOUTING",
      "RAIDING",
      "CHIVALRY",
      "FIELDCRAFT",
    ]);
    // A seat with every unit of its order unlocked goes on to the
    // technologies an army uses (correction pass: a rich Human seat bought
    // nothing for nine rounds), never to Roads or Commerce.
    const full = engaged(false);
    expect(armyOf(full).research?.tech).toBe("FIELDCRAFT");
    const spent = policyTurn(full);
    expect(kindsOf(spent.commands)).not.toContain("TRAIN");
    expect(researchOf(spent.commands).length).toBeGreaterThan(0);
    // (The ninth unit, 7r55: Metallurgy, one of the four, is the
    // Champion's technology and already owned, so the first three bought
    // are the other three; the Coins left after them are spent as in
    // peace.)
    const late = ARMY_LATE_RESEARCH_V7.filter(
      (tech) => !BASIC.includes(tech) && tech !== "FORTIFICATION",
    );
    expect(researchOf(spent.commands).slice(0, late.length)).toEqual(late);
  });

  /**
   * The rich seat (`r7c`: 45 Fighters on +40 income, and neither
   * Engineering nor Chivalry in 28 rounds): `count` Fighters against
   * three enemy units, the technologies up to Sawmilling, round 13.
   */
  const rich = (count: number, coins: number): GameStateV7 => {
    const fighters: GoblinPieceV7[] = [];
    for (let y = 5; y <= 10; y += 1)
      for (let x = 5; x <= 7; x += 1)
        if (fighters.length < count && !(x === 5 && y === 5))
          fighters.push({ seat: 0, role: "FIGHTER", at: at(x, y) });
    return withRound(
      homeless(
        bare(
          field(
            [
              ...fighters,
              { seat: 1, role: "FIGHTER", at: at(2, 7) },
              { seat: 1, role: "FIGHTER", at: at(2, 8) },
              { seat: 1, role: "FIGHTER", at: at(2, 9) },
            ],
            {
              techs: {
                0: techs(
                  "GATHERING",
                  "HUNTING",
                  "MARKSMANSHIP",
                  "DRILL",
                  "FORTIFICATION",
                  "FORESTRY",
                  "SAWMILLING",
                ),
              },
            },
          ),
        ),
      ),
      13,
      coins,
    );
  };
  const trainedOf = (commands: readonly CommandV7[]): readonly string[] =>
    commands.flatMap((command) =>
      command.kind === "TRAIN" ? [command.role] : [],
    );

  it("a rich seat researches toward its strong units first and trains the dear ones, not more Fighters", () => {
    expect(ARMY_RICH_INCOME_V7).toBe(15);
    // Fourteen units against three: rich. Six technologies in round 13
    // (seven with the root of Industry, which the clock does not count
    // since 7r56, when the Guard went on to Fortification):
    // due on the clock of a rich seat (two rounds a technology), not on
    // the ordinary one (three or more). The Goblin pass, correction
    // (`pulp_wars-w49.12`): the Swordsman is third in the Human order, so
    // the first step is Engineering (it was Scouting, toward the Knight).
    const cost = armyOf(rich(14, 0)).research?.cost ?? 0;
    expect(armyOf(rich(14, 0)).research?.tech).toBe("ENGINEERING");
    const turn = policyTurn(rich(14, 40));
    expect(turn.commands[0]).toEqual({ kind: "RESEARCH", tech: "ENGINEERING" });
    // (Scouting unlocks the Explorer Monument, whose free Raider stands on
    // the center for the rest of this turn: the city cannot train, and
    // the Coins go on to the next technology.) Next turn it trains a
    // unit of a class it has none of, not a Fighter: a Marksman (with
    // Chivalry bought in the first turn it was a Knight; the Knight's
    // technologies now come after the Swordsman's, and the city, an enemy
    // near it, gets no Catapult).
    // The economy rejig (`pulp_wars-w49.16`): with one city the 40 Coins
    // also buy Raiding and Chivalry (7 and 9; they were 12 and 15 as the
    // eighth and ninth technologies).
    // (The ninth unit, 7r55: Metallurgy, the Champion's technology,
    // follows Engineering, and the Coins end at Raiding.)
    expect(researchOf(turn.commands)).toEqual([
      "ENGINEERING",
      "METALLURGY",
      "SCOUTING",
      "RAIDING",
    ]);
    const second = policyTurn(withRound(nextRound(turn.state), 14, 20));
    // (With Chivalry bought in the first turn, a Knight; a Marksman while
    // the 40 Coins stop short of Chivalry, as they do again since the
    // ninth unit, 7r55: Metallurgy is bought before the Knight's chain.)
    expect(trainedOf(second.commands)).toEqual(["MARKSMAN"]);
    // Six units against three, the same Coins: the Catapult first, and
    // the technology only with what is left.
    const ordinary = policyTurn(rich(6, cost + 7));
    expect(ordinary.commands[0]).toMatchObject({
      kind: "TRAIN",
      role: "CATAPULT",
    });
    expect(researchOf(ordinary.commands)).toEqual([]);
  });

  /**
   * Correction pass. `r8e`, round 10: a Goblin seat with three cities and
   * the Bomb Chucker, the player's units two tiles from one of its
   * centers; by hand it bought nothing from round 10 to round 22 and ended
   * every turn on 0 to 7 Coins. `r8d`, round 7: an Undead seat with two
   * cities, Gathering, Drill, and Hunting, the player's units at its
   * border; it bought Engineering in round 10 and then nothing for
   * fourteen rounds, the Banshee one technology away. In both the Coins
   * kept for the due technology were dropped with an enemy within three
   * tiles of a center, so every Coin went to units.
   */
  const stalled = (
    factions: readonly FactionIdV7[],
    owned: readonly TechnologyIdV7[],
    round: number,
    coins: number,
  ): GameStateV7 =>
    withRound(
      homeless(
        scene({
          factions,
          active: 0,
          cities: [
            { seat: 0, at: at(8, 5) },
            { seat: 0, at: at(5, 8) },
          ],
          units: [
            { seat: 0, role: "FIGHTER", at: at(8, 8) },
            { seat: 0, role: "FIGHTER", at: at(8, 5) },
            { seat: 0, role: "FIGHTER", at: at(5, 8) },
            { seat: 0, role: "FIGHTER", at: at(6, 9) },
            { seat: 1, role: "SWORDSMAN", at: at(3, 7) },
            { seat: 1, role: "SWORDSMAN", at: at(3, 8) },
            { seat: 1, role: "MARKSMAN", at: at(2, 7) },
            { seat: 1, role: "GUARD", at: at(2, 8) },
          ],
          techs: { 0: owned, 1: BASIC },
        }),
      ),
      round,
      coins,
    );
  /** Seat 0 plays `turns` turns; the other seat ends its turns. */
  const played = (
    start: GameStateV7,
    turns: number,
  ): { readonly research: string[]; readonly trained: number } => {
    const research: string[] = [];
    let trained = 0;
    let state = start;
    for (let turn = 0; turn < turns && state.outcome === null; turn += 1) {
      const result = policyTurn(state);
      research.push(...researchOf(result.commands));
      trained += kindsOf(result.commands).filter(
        (kind) => kind === "TRAIN",
      ).length;
      if (result.state.outcome !== null) break;
      state = nextRound(result.state);
    }
    return { research, trained };
  };

  it("r8e round 10: a Goblin seat with the enemy two tiles from a center buys its next unit technology within three turns, and still trains", () => {
    const start = stalled(
      GOBLINS,
      techs("GATHERING", "FARMING", "HUNTING", "MARKSMANSHIP"),
      12,
      3,
    );
    expect(armyOf(start).threatDistance).toBeLessThanOrEqual(3);
    // The Wolf Rider's technology is the next of the Goblin order.
    expect(armyOf(start).research).toMatchObject({
      tech: "SCOUTING",
      unlocks: "RAIDER",
    });
    const { research, trained } = played(start, 3);
    expect(research).toContain("SCOUTING");
    expect(trained).toBeGreaterThan(0);
  });

  // The economy rejig (`pulp_wars-w49.16`, 7r54): with its three cities
  // Marksmanship costs 11 (9 as its fourth technology before), and the
  // seat earns 4 a turn: four turns, three before.
  // Step two of the Undead pass (`pulp_wars-w49.24`): five turns. The seat
  // has four units on its cities and is short of units (its cities and two
  // more), so it trains first and keeps no Coins until its research clock
  // is a whole technology behind (`ARMY_UNDEAD_WAR_RESEARCH_GRACE_V7`).
  it("r8d round 7: an Undead seat with the enemy at its border buys Marksmanship within five turns, before Engineering, and still trains", () => {
    const start = stalled(
      UNDEAD,
      techs("GATHERING", "DRILL", "FORTIFICATION", "HUNTING"),
      12,
      5,
    );
    expect(armyOf(start).research).toMatchObject({
      tech: "MARKSMANSHIP",
      unlocks: "MARKSMAN",
    });
    expect(armyOf(start).research?.cost).toBe(11);
    const { research, trained } = played(start, 5);
    expect(research[0]).toBe("MARKSMANSHIP");
    expect(trained).toBeGreaterThan(0);
  });
});
// APPEND-MARKER

describe("3. real numbers at a held city", () => {
  /**
   * The border city of `r7c` again, seen from the AI's side in rounds 12
   * to 20: a city three tiles from its own, held by three Swordsmen and a
   * Marksman, with a wounded Fighter beside it. `extra` more units of the
   * AI stand with the three it has there.
   */
  const border = (extra: readonly GoblinPieceV7[]): GameStateV7 =>
    scene({
      factions: HUMANS,
      active: 0,
      cities: [{ seat: 1, at: at(5, 5) }],
      units: [
        { seat: 1, role: "SWORDSMAN", at: at(5, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(4, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 4) },
        { seat: 1, role: "MARKSMAN", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(6, 5), hp: 3 },
        { seat: 1, role: "GUARD", at: at(2, 8) },
        { seat: 0, role: "RAIDER", at: at(8, 6) },
        { seat: 0, role: "FIGHTER", at: at(8, 7) },
        { seat: 0, role: "FIGHTER", at: at(9, 7) },
        { seat: 0, role: "GUARD", at: at(8, 8) },
        ...extra,
      ],
      forests: [at(4, 5), at(5, 4)],
      techs: {
        0: techs(...BASIC, "SCOUTING", "RAIDING"),
        1: techs(...BASIC),
      },
    });
  const own = (state: GameStateV7): readonly UnitStateV7[] =>
    state.units.filter((unit) => unit.ownerId === seatIdV7(state, 0));
  const enemies = (state: GameStateV7): readonly UnitStateV7[] =>
    state.units.filter((unit) => unit.ownerId !== seatIdV7(state, 0));
  /** The own units within two tiles of an enemy unit near the city. */
  const forward = (state: GameStateV7): number =>
    own(state).filter((unit) =>
      enemies(state).some(
        (enemy) =>
          distance(enemy.at, at(5, 5)) <= 3 && distance(enemy.at, unit.at) <= 2,
      ),
    ).length;

  it("sends no lone unit at a held city: without the numbers nobody rides in, even for a kill", () => {
    const start = border([]);
    // Three units against five (the Raider has a kill on the wounded
    // Fighter beside the city, and its Escape).
    const position = armyOf(start).positions.find(
      (entry) => entry.ownIds.length > 0,
    );
    expect(position?.mode).toBe("NONE");
    const turn = policyTurn(start);
    expect(attacksOf(turn.commands)).toEqual([]);
    // Nobody went nearer (two units started two tiles from the Fighter).
    expect(forward(turn.state)).toBeLessThanOrEqual(forward(start));
    expect(
      own(turn.state).some((unit) =>
        enemies(turn.state).some((enemy) => distance(enemy.at, unit.at) <= 1),
      ),
    ).toBe(false);
  });

  it("with the numbers the same units go in together, in one turn", () => {
    const start = border([
      { seat: 0, role: "SWORDSMAN", at: at(7, 6) },
      { seat: 0, role: "SWORDSMAN", at: at(7, 7) },
      { seat: 0, role: "SWORDSMAN", at: at(7, 5) },
      { seat: 0, role: "MARKSMAN", at: at(8, 5) },
      { seat: 0, role: "MARKSMAN", at: at(9, 6) },
      { seat: 0, role: "CATAPULT", at: at(8, 4) },
      { seat: 0, role: "FIGHTER", at: at(9, 5) },
      { seat: 0, role: "FIGHTER", at: at(7, 8) },
    ]);
    const position = armyOf(start).positions.find(
      (entry) => entry.ownIds.length > 0,
    );
    expect(position?.mode).toBe("COMMIT");
    const turn = policyTurn(start);
    expect(attacksOf(turn.commands).length).toBeGreaterThanOrEqual(3);
    expect(forward(turn.state)).toBeGreaterThanOrEqual(5);
  });
});

describe("3. the size of a front, its shooters, and its rally point", () => {
  /**
   * Three seats (14 x 14): the AI's capital (2, 2) with `count` units at
   * home, a third of them Marksmen and Catapults; seat 1's border city
   * (5, 8) held by one Skeleton (the nearest city: the main front); seat
   * 2's capital (11, 2) held by a Swordsman on its center, a Swordsman in
   * the Forest beside it, and a Catapult four tiles behind.
   */
  const fronts = (count: number): GameStateV7 => {
    const own: GoblinPieceV7[] = [];
    for (let ring = 0; ring <= 3; ring += 1)
      for (let y = 0; y <= 5; y += 1)
        for (let x = 0; x <= 5; x += 1)
          if (own.length < count && distance(at(x, y), at(2, 2)) === ring)
            own.push({
              seat: 0,
              role:
                own.length % 6 === 4
                  ? "MARKSMAN"
                  : own.length % 6 === 5
                    ? "CATAPULT"
                    : "FIGHTER",
              at: at(x, y),
            });
    const start = forestV7(
      fieldV7(
        [
          ...own,
          { seat: 2, role: "SWORDSMAN", at: at(11, 2) },
          { seat: 2, role: "SWORDSMAN", at: at(10, 2) },
          { seat: 2, role: "CATAPULT", at: at(13, 6) },
          { seat: 1, role: "FIGHTER", at: at(11, 11) },
          { seat: 1, role: "FIGHTER", at: at(5, 8), captureEligible: true },
        ],
        {
          factions: ["ORIGINAL", "UNDEAD", "ORIGINAL"],
          techs: {},
          coins: 0,
          activeSeat: 1,
        },
      ),
      at(10, 2),
    );
    const captured = applyOkV7(start, seatIdV7(start, 1), {
      kind: "CAPTURE",
      unitId: unitAtV7(start, at(5, 8)).id,
    }).state;
    return bare(endTurnUntilV7(captured, seatIdV7(captured, 0)).state);
  };

  it("sizes a second front against the holders with their cover and the siege behind them, and sends its shooters with it", () => {
    expect(CAMPAIGN_FRONT_NEED_RATIO_V7).toBe(150);
    expect(CAMPAIGN_FRONT_SIZE_RADIUS_V7).toBe(4);
    const state = fronts(30);
    const onCapital = jobsOf(state).filter(
      (job) => job.job === "ATTACK" && same(job.at, at(11, 2)),
    );
    const role = (id: UnitId): string =>
      state.units.find((unit) => unit.id === id)?.role ?? "";
    // Round 7 sent the six nearest units, whatever they were: twice the
    // raw strength of the two Swordsmen within three tiles. Now the two
    // Swordsmen count with their cover, the Catapult four tiles away
    // counts, and half as much again is ten units or more ...
    expect(onCapital.length).toBeGreaterThan(6);
    const weight: Readonly<Record<string, number>> = {
      FIGHTER: 20,
      MARKSMAN: 28,
      CATAPULT: 42,
    };
    expect(
      onCapital.reduce((sum, job) => sum + (weight[role(job.unitId)] ?? 0), 0),
    ).toBeGreaterThanOrEqual((150 * (43 + 43 + 42)) / 100);
    // ... a third of them Marksmen and Catapults (the city has a siege
    // unit among its holders).
    expect(
      onCapital.filter((job) =>
        ["MARKSMAN", "CATAPULT"].includes(role(job.unitId)),
      ).length,
    ).toBeGreaterThanOrEqual(Math.floor(onCapital.length / 3));
    // The rest marches on the border city.
    expect(
      jobsOf(state).filter(
        (job) => job.job === "ATTACK" && same(job.at, at(5, 8)),
      ).length,
    ).toBeGreaterThanOrEqual(10);
  });

  it("opens no token front: an army that cannot outweigh the holders of the second city stays on the first", () => {
    const targets = new Set(
      jobsOf(fronts(17))
        .filter((job) => job.job === "ATTACK")
        .map((job) => `${job.at.x},${job.at.y}`),
    );
    expect(targets).toEqual(new Set(["5,8"]));
  });

  it("its Catapult fires at the enemy's shooters, not at the garrison in front of them", () => {
    // An enemy capital with a Swordsman on its center and a Marksman
    // beside it; the AI's line stands three tiles away (no unit of it
    // reaches the garrison this turn) with a Catapult that reaches both
    // and kills neither. (Round 7: the garrison, an anchor;
    // only fast and ranged units went for ranged, siege, and support
    // units, and the defender's battery was never shot at by siege.)
    const state = bare(
      field([
        { seat: 0, role: "CATAPULT", at: at(5, 7) },
        { seat: 0, role: "SWORDSMAN", at: at(5, 8) },
        { seat: 0, role: "SWORDSMAN", at: at(5, 9) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 8) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 9) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 8) },
        { seat: 1, role: "MARKSMAN", at: at(2, 6) },
      ]),
    );
    const shooter = unitAtV7(state, at(2, 6)).id;
    const catapult = unitAtV7(state, at(5, 7)).id;
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(queryCombatPreviewV7(view, catapult, shooter)?.defenderDies).toBe(
      false,
    );
    const shot = attacksOf(policyTurn(state).commands).find(
      (command) => command.unitId === catapult,
    );
    expect(shot?.targetUnitId).toBe(shooter);
  });

  it("reinforcements wait outside the enemy's reach until the group is there, and then go in together", () => {
    // The held city of the tests above with three units of the AI in
    // front of it and nine more on their way, three tiles apart.
    const start = scene({
      factions: HUMANS,
      active: 0,
      cities: [{ seat: 1, at: at(5, 5) }],
      units: [
        { seat: 1, role: "SWORDSMAN", at: at(5, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(4, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 4) },
        { seat: 1, role: "MARKSMAN", at: at(4, 4) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
        { seat: 0, role: "FIGHTER", at: at(8, 6) },
        { seat: 0, role: "FIGHTER", at: at(8, 7) },
        { seat: 0, role: "SWORDSMAN", at: at(9, 7) },
        { seat: 0, role: "GUARD", at: at(8, 8) },
        { seat: 0, role: "SWORDSMAN", at: at(10, 8) },
        { seat: 0, role: "SWORDSMAN", at: at(10, 9) },
        { seat: 0, role: "MARKSMAN", at: at(10, 10) },
        { seat: 0, role: "SWORDSMAN", at: at(9, 10) },
        { seat: 0, role: "MARKSMAN", at: at(8, 10) },
        { seat: 0, role: "CATAPULT", at: at(7, 10) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 10) },
        { seat: 0, role: "FIGHTER", at: at(10, 7) },
        { seat: 0, role: "FIGHTER", at: at(10, 6) },
      ],
      forests: [at(4, 5), at(5, 4)],
      techs: { 0: techs(...BASIC), 1: techs(...BASIC) },
    });
    const seat0 = seatIdV7(start, 0);
    const inReach = (state: GameStateV7): number =>
      state.units.filter(
        (unit) =>
          unit.ownerId === seat0 &&
          state.units.some(
            (enemy) =>
              enemy.ownerId !== seat0 &&
              distance(enemy.at, at(5, 5)) <= 2 &&
              distance(enemy.at, unit.at) <= 2,
          ),
      ).length;
    // First turn: the group is strung out. It stages: nobody attacks and
    // nobody enters the enemy's reach (round 7: one unit did).
    expect(
      armyOf(start).positions.find((entry) => entry.ownIds.length > 2)?.mode,
    ).toBe("STAGE");
    const first = policyTurn(start);
    expect(attacksOf(first.commands)).toEqual([]);
    expect(inReach(first.state)).toBe(0);
    // Second turn: massed, it commits, and the whole group closes in in
    // the same turn.
    const second = nextRound(first.state);
    expect(
      armyOf(second).positions.find((entry) => entry.ownIds.length > 2)?.mode,
    ).toBe("COMMIT");
    const closed = policyTurn(second);
    const nearer = second.units.filter((unit) => {
      const after = closed.state.units.find((item) => item.id === unit.id);
      return (
        unit.ownerId === seat0 &&
        after !== undefined &&
        distance(after.at, at(5, 5)) < distance(unit.at, at(5, 5))
      );
    });
    expect(nearer.length).toBeGreaterThanOrEqual(9);
    // Third turn: the attack, by three units or more.
    const struck = policyTurn(nextRound(closed.state));
    expect(
      new Set(attacksOf(struck.commands).map((command) => command.unitId)).size,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("4. a Goblin seat", () => {
  it("before contact every free capturer scouts its own stretch of frontier", () => {
    // Four Goblins at the capital, the map explored three tiles around it
    // and no enemy city known: `r7c`, where a Goblin seat followed its
    // first scout into a pocket of Mountains for ten rounds, never saw the
    // village three tiles south of its capital, and kept two cities for
    // twenty rounds.
    const open = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 0, role: "FIGHTER", at: at(9, 7) },
          { seat: 0, role: "FIGHTER", at: at(7, 9) },
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS, techs: { 0: techs("GATHERING", "HUNTING") } },
      ),
    );
    const hidden = open.board.tiles
      .map((tile) => tile.at)
      .filter((where) => distance(where, at(8, 8)) > 3);
    const state = unexploreV7(open, 0, hidden);
    const scouts = jobsOf(state).filter((job) => job.job === "EXPLORE");
    expect(scouts).toHaveLength(5);
    const stretches = new Set(scouts.map((job) => `${job.at.x},${job.at.y}`));
    // (Round 7: two stretches, the second scout alone on the second.)
    expect(stretches.size).toBeGreaterThanOrEqual(3);
    // And every one of them walks (the explored land ends at the board's
    // east and south edges here, so there are three stretches for five).
    const turn = policyTurn(state);
    expect(
      new Set(movesOf(turn.commands).map((move) => move.unitId)).size,
    ).toBe(5);
    const reached = policyTurn(nextRound(turn.state)).state;
    // Two turns later a unit stands on or beside each stretch.
    for (const job of scouts)
      expect(
        reached.units.some(
          (unit) =>
            unit.ownerId === seatIdV7(state, 0) &&
            distance(unit.at, job.at) <= 1,
        ),
      ).toBe(true);
  });

  /**
   * A Goblin assault: three Swordsmen in a row with a Marksman behind;
   * five Goblins, two Scrap Buggies, and an Orc Brute in front of them,
   * and a Bomb Chucker three tiles from the middle Swordsman.
   */
  const assault = (): GameStateV7 =>
    bare(
      field(
        [
          { seat: 0, role: "MARKSMAN", at: at(6, 6) },
          { seat: 0, role: "FIGHTER", at: at(6, 4) },
          { seat: 0, role: "FIGHTER", at: at(6, 5) },
          { seat: 0, role: "FIGHTER", at: at(6, 7) },
          { seat: 0, role: "FIGHTER", at: at(6, 8) },
          { seat: 0, role: "FIGHTER", at: at(7, 4) },
          { seat: 0, role: "KNIGHT", at: at(7, 5) },
          { seat: 0, role: "KNIGHT", at: at(7, 7) },
          { seat: 0, role: "GUARD", at: at(7, 6) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 5) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 6) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 7) },
          { seat: 1, role: "MARKSMAN", at: at(2, 6) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS },
      ),
    );

  it("throws its bomb first: the Bomb Chucker steps to two tiles and throws before an own unit stands beside the target", () => {
    expect(ARMY_BOMB_FIRE_PRIORITY_V7).toBe(1188);
    const start = assault();
    const chucker = unitAtV7(start, at(6, 6)).id;
    const turn = policyTurn(start);
    const thrown = turn.commands.findIndex(
      (command) => command.kind === "ATTACK" && command.unitId === chucker,
    );
    // It moved and threw (round 7: its Move came after the Goblins', by
    // which time an own unit stood beside every target, and it did not
    // throw).
    expect(thrown).toBeGreaterThan(0);
    expect(turn.commands[0]).toMatchObject({ kind: "MOVE", unitId: chucker });
    const throwState = turn.before[thrown];
    const target = turn.commands[thrown];
    if (throwState === undefined || target?.kind !== "ATTACK")
      throw new Error("no throw");
    expect(priorityOf(throwState, target)).toBe(ARMY_BOMB_FIRE_PRIORITY_V7);
    const victim = throwState.units.find(
      (unit) => unit.id === target.targetUnitId,
    );
    if (victim === undefined) throw new Error("no victim");
    // No own unit stood beside the target when the bomb flew.
    expect(
      throwState.units.some(
        (unit) =>
          unit.ownerId === seatIdV7(start, 0) &&
          distance(unit.at, victim.at) <= 1,
      ),
    ).toBe(false);
    // The others close in behind the bomb and attack in the next turn.
    const next = policyTurn(nextRound(turn.state));
    expect(attacksOf(next.commands).length).toBeGreaterThanOrEqual(3);
  });

  it("blows a Goblin up in a cluster of three before an ordinary kill", () => {
    // A Goblin beside three Swordsmen and a Fighter at 1 HP: its attack
    // kills the Fighter; its Kaboom kills the Fighter and hurts all three
    // Swordsmen, and no own unit stands in the blast.
    const state = bare(
      field(
        [
          { seat: 0, role: "FIGHTER", at: at(4, 6) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 5) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 6) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 7) },
          { seat: 1, role: "FIGHTER", at: at(4, 5), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS },
      ),
    );
    const goblin = unitAtV7(state, at(4, 6)).id;
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(
      queryCombatPreviewV7(view, goblin, unitAtV7(state, at(4, 5)).id)
        ?.defenderDies,
    ).toBe(true);
    expect(policyTurn(state).commands[0]).toEqual({
      kind: "KABOOM",
      unitId: goblin,
    });
  });

  /**
   * A Warboss with four Goblins around it, two tiles from `line`: three
   * Guards on Field Defenses in their own land (an exchange no Goblin
   * takes), or three Fighters at 3 HP.
   */
  const warband = (weak: boolean): GameStateV7 => {
    let state = bare(
      field(
        [
          { seat: 0, role: "CAPTAIN", at: at(6, 8) },
          { seat: 0, role: "FIGHTER", at: at(5, 7) },
          { seat: 0, role: "FIGHTER", at: at(5, 8) },
          { seat: 0, role: "FIGHTER", at: at(5, 9) },
          { seat: 0, role: "FIGHTER", at: at(6, 7) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          ...[7, 8, 9].map((y): GoblinPieceV7 => ({
            seat: 1,
            role: weak ? "FIGHTER" : "GUARD",
            at: at(3, y),
            ...(weak ? { hp: 3 } : {}),
          })),
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS },
      ),
    );
    if (!weak)
      for (const y of [7, 8, 9]) state = fieldDefenseV7(state, at(3, y));
    return state;
  };

  it("calls WAAAGH! only when attacks follow", () => {
    // Against the fortified Guards its Goblins make no attack this turn:
    // no call (round 7: a call on fourteen units, and no attack).
    const held = policyTurn(warband(false));
    expect(attacksOf(held.commands)).toEqual([]);
    expect(kindsOf(held.commands)).not.toContain("RALLY");
    // Against the weak line they attack, and the call comes first.
    const struck = policyTurn(warband(true));
    const call = kindsOf(struck.commands).indexOf("RALLY");
    const firstAttack = kindsOf(struck.commands).indexOf("ATTACK");
    expect(call).toBeGreaterThanOrEqual(0);
    expect(firstAttack).toBeGreaterThan(call);
  });

  it("pulls a spent Scrap Buggy out of the enemy's reach instead of leaving it beside a Marksman", () => {
    // A Scrap Buggy at 4 of 10 HP beside a Marksman it cannot kill, and
    // which shoots it dead next turn. Round 7 left four such Buggies where
    // they stood after their charge. (Beside three enemy units it blows
    // itself up instead: the cluster rule.)
    const state = bare(
      field(
        [
          { seat: 0, role: "KNIGHT", at: at(5, 5), hp: 4 },
          { seat: 0, role: "FIGHTER", at: at(7, 5) },
          { seat: 0, role: "FIGHTER", at: at(7, 6) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "MARKSMAN", at: at(4, 5) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: GOBLINS },
      ),
    );
    const buggy = unitAtV7(state, at(5, 5)).id;
    const marksman = unitAtV7(state, at(4, 5));
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(queryCombatPreviewV7(view, buggy, marksman.id)?.defenderDies).toBe(
      false,
    );
    const turn = policyTurn(state);
    expect(
      attacksOf(turn.commands).some((command) => command.unitId === buggy),
    ).toBe(false);
    expect(kindsOf(turn.commands)).not.toContain("KABOOM");
    const where = whereIs(turn.state, buggy);
    // Out of the Marksman's reach (a step and two tiles).
    expect(where !== null && distance(where, marksman.at) > 3).toBe(true);
  });
});

describe("5. a small seat", () => {
  it("grows its capital too: of two harvests it can pay one of, the capital's", () => {
    // An Undead seat with its capital (8, 8) and a second city (8, 5),
    // both at level 1, Fruit in the land of each, and the Coins for one
    // harvest (`r7d`: the capital at level 2 with 0 of 3 for twelve rounds
    // while the Mines went to the villages).
    const built = scene({
      factions: UNDEAD,
      active: 0,
      cities: [{ seat: 0, at: at(8, 5) }],
      units: [
        { seat: 0, role: "FIGHTER", at: at(8, 5) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      techs: {
        0: techs("GATHERING", "DRILL", "FORTIFICATION"),
        1: techs(...BASIC),
      },
      coins: 2,
    });
    const state = patchTileV7(
      patchTileV7(built, at(7, 4), { resource: "FRUIT" }),
      at(7, 9),
      { resource: "FRUIT" },
    );
    const offered = queryPlayerCommandsV7(
      viewForV7(state, seatIdV7(state, 0)),
    ).filter((command) => command.kind === "HARVEST_FRUIT");
    expect(offered).toHaveLength(2);
    const turn = policyTurn(state);
    expect(
      turn.commands.filter((command) => command.kind === "HARVEST_FRUIT"),
    ).toEqual([{ kind: "HARVEST_FRUIT", at: at(7, 9) }]);
  });

  /**
   * `r7d`, rounds 13 to 16: an Undead seat with eight units at home and
   * three attackers in its land (a Knight, a Marksman, a Fighter). In the
   * game it had 8 to 10 units against 3 or 4 and did not come out.
   */
  const atHome = (): GameStateV7 =>
    bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(8, 8) },
          { seat: 0, role: "GUARD", at: at(7, 7) },
          { seat: 0, role: "GUARD", at: at(7, 9) },
          { seat: 0, role: "FIGHTER", at: at(8, 7) },
          { seat: 0, role: "FIGHTER", at: at(8, 9) },
          { seat: 0, role: "FIGHTER", at: at(9, 8) },
          { seat: 0, role: "FIGHTER", at: at(9, 7) },
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 1, role: "KNIGHT", at: at(5, 8) },
          { seat: 1, role: "MARKSMAN", at: at(4, 8) },
          { seat: 1, role: "FIGHTER", at: at(5, 7) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        {
          factions: UNDEAD,
          techs: { 0: techs("GATHERING", "DRILL", "FORTIFICATION") },
        },
      ),
    );

  it("counterattacks at home when it has the numbers: it is committed, and has struck within two turns", () => {
    const start = atHome();
    expect(
      armyOf(start).positions.find((entry) => entry.ownIds.length > 0)?.mode,
    ).toBe("COMMIT");
    const first = policyTurn(start);
    const second = policyTurn(nextRound(first.state));
    expect(
      attacksOf(first.commands).length + attacksOf(second.commands).length,
    ).toBeGreaterThanOrEqual(2);
    // And the best defender, a Zombie, is still on the center.
    expect(unitAtV7(second.state, at(8, 8)).role).toBe("GUARD");
  });

  it("attacks the enemy beside it with a unit that is lost anyway", () => {
    // A Zombie at 16 HP beside a Guard, five Marksmen in range of it, no
    // other unit of its own within reach: the exchange is poor (it deals
    // less than it takes), and round 7 made no attack at all.
    const state = bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(5, 5), hp: 16 },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "GUARD", at: at(4, 5) },
          { seat: 1, role: "MARKSMAN", at: at(3, 4) },
          { seat: 1, role: "MARKSMAN", at: at(3, 5) },
          { seat: 1, role: "MARKSMAN", at: at(3, 6) },
          { seat: 1, role: "MARKSMAN", at: at(4, 3) },
          { seat: 1, role: "MARKSMAN", at: at(4, 7) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        {
          factions: UNDEAD,
          techs: { 0: techs("GATHERING", "DRILL", "FORTIFICATION") },
        },
      ),
    );
    const zombie = unitAtV7(state, at(5, 5)).id;
    const guard = unitAtV7(state, at(4, 5)).id;
    const preview = queryCombatPreviewV7(
      viewForV7(state, seatIdV7(state, 0)),
      zombie,
      guard,
    );
    expect(preview?.attackerDies).toBe(false);
    expect(preview?.damageToAttacker ?? 0).toBeGreaterThan(
      preview?.damageToDefender ?? 0,
    );
    expect(attacksOf(policyTurn(state).commands)).toEqual([
      { kind: "ATTACK", unitId: zombie, targetUnitId: guard },
    ]);
  });

  /**
   * A threatened capital with a Zombie on its center, a Knight three tiles
   * away, and a free unit slot.
   */
  const threatened = (coins: number): GameStateV7 =>
    homeless(
      bare(
        field(
          [
            { seat: 0, role: "GUARD", at: at(8, 8) },
            { seat: 1, role: "KNIGHT", at: at(5, 8) },
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          {
            factions: UNDEAD,
            techs: { 0: techs("GATHERING", "DRILL", "FORTIFICATION") },
            coins,
          },
        ),
      ),
    );

  it("keeps the best defender on a threatened center: it steps aside only for a garrison as good", () => {
    // With 2 Coins the city could train a Skeleton only: the Zombie stays
    // (round 7: it stepped aside and a Skeleton took the center).
    const poor = policyTurn(threatened(2));
    expect(kindsOf(poor.commands)).not.toContain("TRAIN");
    expect(unitAtV7(poor.state, at(8, 8)).role).toBe("GUARD");
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Zombie's
    // technology is Fortification, so a seat that can train one can build
    // a Field Defense, and with 3 Coins it does that under the Zombie on
    // its threatened center (the older rule of every seat with
    // Fortification) instead of training.
    const fortified = policyTurn(threatened(3));
    expect(kindsOf(fortified.commands)).toEqual([
      "BUILD_FIELD_DEFENSE",
      "END_TURN",
    ]);
    expect(unitAtV7(fortified.state, at(8, 8)).role).toBe("GUARD");
    // A Zombie on a Field Defense is the better garrison and holds the
    // center: it does not step aside for a second Zombie, whatever the
    // Coins. (Until 7r55 a seat with the root alone trained Zombies: with
    // 3 Coins this Zombie stepped aside and a second one took the center.)
    for (const coins of [3, 6]) {
      const held = policyTurn(fieldDefenseV7(threatened(coins), at(8, 8)));
      expect(kindsOf(held.commands), String(coins)).not.toContain("TRAIN");
      expect(unitAtV7(held.state, at(8, 8)).role).toBe("GUARD");
    }
  });
});

describe("the defects of round 7", () => {
  it("a Lich's shot on a Guard on a Field Defense meets Defense 1 and two fortification levels: the rule was right", () => {
    // `r7b`: the line read `atk 3 vs def 3 fort 2` beside a Rocket Cart's
    // `def 1 x3/2` on a Guard in a Forest. The Guard is open to ranged
    // attacks in both (Defense 1, 2 half-points); each fortification level
    // adds 1, a Forest multiplies by 3/2.
    const fortified = fieldDefenseV7(
      bare(
        field(
          [
            { seat: 0, role: "CATAPULT", at: at(6, 8) },
            { seat: 0, role: "FIGHTER", at: at(8, 8) },
            { seat: 1, role: "GUARD", at: at(3, 8) },
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          { factions: UNDEAD },
        ),
      ),
      at(3, 8),
    );
    const view = viewForV7(fortified, seatIdV7(fortified, 0));
    const shot = queryCombatPreviewV7(
      view,
      unitAtV7(fortified, at(6, 8)).id,
      unitAtV7(fortified, at(3, 8)).id,
    );
    expect(shot).toMatchObject({ fortificationLevel: 2, defense2: 2 + 2 * 2 });
    // Hand to hand the same Guard defends with its Defense 3.
    const melee = fieldDefenseV7(
      bare(
        field(
          [
            { seat: 0, role: "FIGHTER", at: at(4, 8) },
            { seat: 0, role: "FIGHTER", at: at(8, 8) },
            { seat: 1, role: "GUARD", at: at(3, 8) },
            { seat: 1, role: "FIGHTER", at: at(2, 8) },
          ],
          { factions: UNDEAD },
        ),
      ),
      at(3, 8),
    );
    expect(
      queryCombatPreviewV7(
        viewForV7(melee, seatIdV7(melee, 0)),
        unitAtV7(melee, at(4, 8)).id,
        unitAtV7(melee, at(3, 8)).id,
      ),
    ).toMatchObject({ fortificationLevel: 2, defense2: 6 + 2 * 2 });
  });
});

// ---------------------------------------------------------------------------
// The correction pass after the hand play of round 8 (`r8a`, `r8c`, `r8d`,
// `r8e`; docs/product/RULESET_7_TUNING_HUMAN.md section 15.11).
// ---------------------------------------------------------------------------

describe("correction: the defender's Catapults are answered", () => {
  /**
   * `r8a`, rounds 9 to 13: the player's capital (2, 8) with a cheap
   * garrison, his Catapults beside each other two and three tiles behind
   * it, and the AI's Catapults killing the garrison every turn. In the
   * game a unit then stepped onto the center inside the range of the
   * battery and was shot, six turns running, and no Knight rode at the
   * Catapults.
   */
  const battery = (knight: CoordV7): GameStateV7 =>
    bare(
      field([
        // The AI: two Catapults that kill the garrison, a Fighter beside
        // the center, a Knight, and its capital's garrison.
        { seat: 0, role: "CATAPULT", at: at(5, 8) },
        { seat: 0, role: "CATAPULT", at: at(5, 9) },
        { seat: 0, role: "FIGHTER", at: at(3, 9) },
        { seat: 0, role: "KNIGHT", at: knight },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        // The player: the garrison and three Catapults in a row.
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
        { seat: 1, role: "CATAPULT", at: at(0, 5) },
        { seat: 1, role: "CATAPULT", at: at(1, 5) },
        { seat: 1, role: "CATAPULT", at: at(2, 5) },
      ]),
    );

  it("r8a: nobody steps onto the emptied center under three Catapults, and the Knight in reach rides down the battery", () => {
    // The Knight is the stormer nearest to the center, one Move from it
    // (round 8 as first written sent it onto the center, to be shot).
    const start = battery(at(4, 6));
    const knight = unitAtV7(start, at(4, 6)).id;
    const guns = [at(0, 5), at(1, 5), at(2, 5)].map(
      (where) => unitAtV7(start, where).id,
    );
    const turn = policyTurn(start);
    // The Knight's attacks are all on Catapults, and it kills more than
    // one (it advances after each kill and attacks again).
    const charges = attacksOf(turn.commands).filter(
      (command) => command.unitId === knight,
    );
    expect(charges.length).toBeGreaterThanOrEqual(2);
    for (const charge of charges) expect(guns).toContain(charge.targetUnitId);
    expect(
      guns.filter((id) => turn.state.units.some((unit) => unit.id === id))
        .length,
    ).toBeLessThanOrEqual(1);
  });

  it("r8a: with the battery out of the Knight's reach the center stays empty this turn and the units move on the Catapults", () => {
    const start = battery(at(8, 6));
    const own = seatIdV7(start, 0);
    const turn = policyTurn(start);
    // The garrison is shot ...
    expect(turn.state.units.some((unit) => same(unit.at, at(2, 8)))).toBe(
      false,
    );
    // ... and the Fighter beside the center goes toward the nearest
    // Catapult instead of onto the center.
    const fighter = unitAtV7(start, at(3, 9)).id;
    const after = whereIs(turn.state, fighter);
    expect(after).not.toBeNull();
    expect(distance(after ?? at(9, 9), at(2, 5))).toBeLessThan(
      distance(at(3, 9), at(2, 5)),
    );
    expect(
      turn.state.units.filter(
        (unit) => unit.ownerId === own && same(unit.at, at(2, 8)),
      ),
    ).toEqual([]);
  });

  it("r8a: its own Catapults move up to where they reach the player's instead of standing out of range", () => {
    // An empty enemy center, two enemy Catapults that cover it, and two
    // own Catapults that reach neither the center's garrison (there is
    // none) nor the battery. (The Martian pass's correction,
    // `pulp_wars-w49.14`: a Human seat takes the villages first for ten
    // rounds; this is round 12.)
    const start: GameStateV7 = {
      ...bare(
        field([
          { seat: 0, role: "CATAPULT", at: at(6, 6) },
          { seat: 0, role: "CATAPULT", at: at(6, 7) },
          { seat: 0, role: "SWORDSMAN", at: at(5, 6) },
          { seat: 0, role: "SWORDSMAN", at: at(5, 7) },
          { seat: 0, role: "SWORDSMAN", at: at(4, 8) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "CATAPULT", at: at(1, 5) },
          { seat: 1, role: "CATAPULT", at: at(2, 5) },
          { seat: 1, role: "FIGHTER", at: at(0, 10) },
        ]),
      ),
      round: 12,
    };
    const guns = [at(6, 6), at(6, 7)].map((where) => unitAtV7(start, where).id);
    const turn = policyTurn(start);
    const nearest = (where: CoordV7): number =>
      Math.min(distance(where, at(1, 5)), distance(where, at(2, 5)));
    for (const [index, id] of guns.entries()) {
      const from = index === 0 ? at(6, 6) : at(6, 7);
      const to = whereIs(turn.state, id);
      expect(to).not.toBeNull();
      expect(nearest(to ?? from)).toBeLessThan(nearest(from));
    }
  });
});

describe("correction: a weak garrison is taken by the group that stands there", () => {
  it("r8c round 23: a border city held by one wounded unit without Walls is retaken at once, though the player's line as a whole outweighs the group", () => {
    // The player took the city (5, 5) the turn before with a Swordsman
    // now at 7 HP; eight more of his units stand in a line behind it, so
    // the position as a whole is nothing the three AI units there can
    // commit against. In the game twelve AI units within four tiles did
    // nothing.
    const start = scene({
      factions: HUMANS,
      active: 0,
      cities: [{ seat: 1, at: at(5, 5) }],
      units: [
        { seat: 1, role: "SWORDSMAN", at: at(5, 5), hp: 7 },
        { seat: 1, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(3, 4) },
        { seat: 1, role: "GUARD", at: at(3, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(2, 5) },
        { seat: 1, role: "SWORDSMAN", at: at(3, 3) },
        { seat: 1, role: "MARKSMAN", at: at(2, 4) },
        { seat: 1, role: "MARKSMAN", at: at(2, 3) },
        { seat: 1, role: "CATAPULT", at: at(1, 4) },
        { seat: 0, role: "RAIDER", at: at(6, 6), hp: 6 },
        { seat: 0, role: "RAIDER", at: at(7, 7) },
        { seat: 0, role: "SWORDSMAN", at: at(8, 6) },
        { seat: 0, role: "GUARD", at: at(8, 8) },
        { seat: 1, role: "GUARD", at: at(2, 8) },
      ],
      techs: { 0: BASIC, 1: BASIC },
    });
    const garrison = unitAtV7(start, at(5, 5)).id;
    expect(
      armyOf(start).positions.find((position) =>
        position.hostileIds.includes(garrison),
      )?.mode,
    ).toBe("NONE");
    const turn = policyTurn(start);
    expect(
      attacksOf(turn.commands).some(
        (command) => command.targetUnitId === garrison,
      ),
    ).toBe(true);
    // The garrison is dead and an AI unit stands on the center.
    expect(turn.state.units.some((unit) => unit.id === garrison)).toBe(false);
    expect(
      turn.state.units.find((unit) => same(unit.at, at(5, 5)))?.ownerId,
    ).toBe(seatIdV7(start, 0));
  });
});

describe("correction: Goblin Bomb Chuckers and the opening", () => {
  /**
   * `r8e`: a Goblin seat on the defensive (the player's units outweigh
   * what it has there, so the position is nothing it commits against).
   * Ten Bomb Chuckers made seven throws in that game.
   */
  const defensive = (chucker: CoordV7): GameStateV7 =>
    bare(
      field(
        [
          { seat: 0, role: "MARKSMAN", at: chucker },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "SWORDSMAN", at: at(5, 6) },
          { seat: 1, role: "SWORDSMAN", at: at(5, 7) },
          { seat: 1, role: "SWORDSMAN", at: at(4, 6) },
          { seat: 1, role: "SWORDSMAN", at: at(4, 7) },
          { seat: 1, role: "KNIGHT", at: at(4, 8) },
          { seat: 1, role: "GUARD", at: at(2, 8) },
        ],
        {
          factions: GOBLINS,
          techs: { 0: techs("GATHERING", "HUNTING", "MARKSMANSHIP") },
        },
      ),
    );

  it("r8e round 16: a Bomb Chucker three tiles from the enemy steps one tile and throws", () => {
    const start = defensive(at(8, 6));
    const chucker = unitAtV7(start, at(8, 6)).id;
    const turn = policyTurn(start);
    expect(
      movesOf(turn.commands).some((command) => command.unitId === chucker),
    ).toBe(true);
    expect(
      attacksOf(turn.commands).some((command) => command.unitId === chucker),
    ).toBe(true);
    // It does not end beside a unit that fights hand to hand.
    const end = whereIs(turn.state, chucker);
    expect(end).not.toBeNull();
    for (const unit of turn.state.units)
      if (unit.ownerId !== seatIdV7(start, 0) && unit.role !== "GUARD")
        expect(distance(unit.at, end ?? at(0, 0))).toBeGreaterThanOrEqual(2);
  });

  it("r8e rounds 12 to 17: no Bomb Chucker is trained onto a center with the player's melee units beside it while a Goblin can be", () => {
    const start = withRound(
      homeless(
        bare(
          field(
            [
              { seat: 0, role: "FIGHTER", at: at(9, 9) },
              { seat: 1, role: "FIGHTER", at: at(7, 7) },
              { seat: 1, role: "FIGHTER", at: at(7, 8) },
              { seat: 1, role: "GUARD", at: at(2, 8) },
            ],
            {
              factions: GOBLINS,
              techs: { 0: techs("GATHERING", "HUNTING", "MARKSMANSHIP") },
            },
          ),
        ),
      ),
      6,
      6,
    );
    const turn = policyTurn(start);
    const trained = turn.commands.flatMap((command) =>
      command.kind === "TRAIN" ? [command.role] : [],
    );
    expect(trained.length).toBeGreaterThan(0);
    expect(trained).not.toContain("MARKSMAN");
  });

  it("r8e: in its opening a seat explores the land around its own cities before it looks for the enemy", () => {
    // The land south and north of the capital (8, 8) is unexplored; an
    // enemy city is known in the west. Two scouts look at home first.
    const hidden: CoordV7[] = [];
    for (let x = 5; x <= 10; x += 1) hidden.push(at(x, 10), at(x, 4));
    // (And a stretch beside the enemy's land, which round 8 as first
    // written explored first.)
    for (let y = 4; y <= 6; y += 1) hidden.push(at(0, y));
    const start = unexploreV7(
      withRound(
        bare(
          fieldV7(
            [
              { seat: 0, role: "FIGHTER", at: at(8, 8) },
              { seat: 0, role: "FIGHTER", at: at(7, 8) },
              { seat: 0, role: "FIGHTER", at: at(7, 9) },
              { seat: 1, role: "GUARD", at: at(2, 8) },
            ],
            { factions: GOBLINS, coins: 0, techs: { 0: techs("GATHERING") } },
          ),
        ),
        4,
      ),
      0,
      hidden,
    );
    const scouts = jobsOf(start).filter((entry) => entry.job === "EXPLORE");
    expect(scouts.length).toBeGreaterThan(0);
    expect(
      scouts.filter((scout) => scout.at.x >= 4).length,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("correction: small fixes", () => {
  it("never disbands a unit that stands next to an enemy unit or city (r8a round 9)", () => {
    // A Guard at 2 HP beside the enemy capital, inside the reach of its
    // garrison and a Catapult: round 8 as first written disbanded it for
    // the refund.
    const start = bare(
      field(
        [
          { seat: 0, role: "GUARD", at: at(3, 8), hp: 2 },
          { seat: 0, role: "SWORDSMAN", at: at(4, 8) },
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          // (Its capital is at its unit limit, as the lab's cities were.)
          { seat: 0, role: "FIGHTER", at: at(9, 8) },
          { seat: 0, role: "FIGHTER", at: at(9, 9) },
          { seat: 0, role: "FIGHTER", at: at(8, 9) },
          { seat: 1, role: "SWORDSMAN", at: at(2, 8) },
          { seat: 1, role: "CATAPULT", at: at(1, 6) },
        ],
        { techs: { 0: techs(...BASIC, "ADMINISTRATION") } },
      ),
    );
    const guard = unitAtV7(start, at(3, 8)).id;
    const view = viewForV7(start, seatIdV7(start, 0));
    expect(queryPlayerCommandsV7(view)).toContainEqual({
      kind: "DISBAND",
      unitId: guard,
    });
    expect(
      chooseNormalCommandV7(view).candidates.map((entry) => entry.command),
    ).not.toContainEqual({ kind: "DISBAND", unitId: guard });
    expect(kindsOf(policyTurn(start).commands)).not.toContain("DISBAND");
  });

  it("the garrison of a walled center hits the unit beside it when the exchange is clearly in its favor (r8d round 21)", () => {
    // An Undead seat's last city: a Zombie on its center, the player's
    // Knight beside it, and the Coins for another Zombie. In the game the
    // Zombie stepped aside and the city trained; the Knight was never hit.
    const start = withRound(
      homeless(
        bare(
          field(
            [
              { seat: 0, role: "GUARD", at: at(8, 8) },
              { seat: 1, role: "KNIGHT", at: at(7, 7) },
              { seat: 1, role: "GUARD", at: at(2, 8) },
            ],
            {
              factions: UNDEAD,
              techs: { 0: techs("GATHERING", "DRILL", "FORTIFICATION") },
            },
          ),
        ),
      ),
      21,
      4,
    );
    const zombie = unitAtV7(start, at(8, 8)).id;
    const knight = unitAtV7(start, at(7, 7)).id;
    const turn = policyTurn(start);
    expect(attacksOf(turn.commands)).toContainEqual({
      kind: "ATTACK",
      unitId: zombie,
      targetUnitId: knight,
    });
  });
});
