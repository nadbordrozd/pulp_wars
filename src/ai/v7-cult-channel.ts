import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  OFFERING_FAVOUR_V7,
  SEIZE_BROKEN_HP_V7,
  SUMMONER_TRICKLE_FAVOUR_V7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import {
  pamphletsApplyV7,
  tentacleSlapTargetV7,
} from "../engine/v7/cult-hexes";
import {
  previewRampageV7,
  previewSacrificeV7,
  previewSeizeV7,
  previewWardenV7,
  queryCombatPreviewV7,
} from "../engine/v7/query";
import { isNeutralOwnerV7, type CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import {
  ARMY_GARRISON_FILL_REACH_V7,
  ARMY_GARRISON_RADIUS_V7,
} from "./v7-army";
import {
  CULT_BROOD_SIZE_V7,
  CULT_CAP_SPEND_FAVOUR_V7,
  CULT_FAVOUR_CAP_V7,
  CULT_HORROR_FAVOUR_V7,
  CULT_HUNGER_FAVOUR_V7,
  CULT_IMP_FAVOUR_V7,
  CULT_MASS_FAVOUR_V7,
  CULT_SUMMONING_FAVOUR_V7,
  cultBackRowV7,
  cultBodiesV7,
  cultBroodLeadsV7,
  cultFavourV7,
  cultRobedV7,
  cultWardenV7,
} from "./v7-cult";
import {
  cultRitualPlanV7,
  cultSavingV7,
  cultSeizureToolsV7,
  type CultMovedUnitV7,
  type CultRitualReasonV7,
} from "./v7-cult-rituals";

/**
 * The Cult seat's own commands (`pulp_wars-mch9.10`, bead A2 of
 * docs/product/RULESET_7_CULTISTS.md sections 15.2 to 15.4; as built in
 * section 15.7): the channel plan, Summon, Sacrifice, Seize, Offering, and
 * Anchor. Revised by the Cult redesign's A-R1 (`pulp_wars-mch9.38`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 12.2): Favour against its
 * cap of 30 and the Herald's Hunger (the prices beyond the Hunger kept, a
 * Herald fed by a Sacrifice, the trickle, or an Offering, or let go), the
 * trickle's channeller (a Summoner with nothing better to do), and the
 * warden's placement in place of the Behold! step. Revised by A-R3
 * (`pulp_wars-mch9.40`, sections 12.2 and 12.3): what to summon (the Imp,
 * the Horror, the Gibbering Mass), Brood planning (one channeller a
 * Brood), Doorstep (no channeller for a Mass at home; an Idol Bearer that
 * holds one stays by it, or steps beside one), Swarm, and the Summoner a
 * Seizure may need kept from the trickle and the spare strands
 * (`tests/unit/ruleset-v7-cult-summons-ai.test.ts`).
 *
 * The Normal AI chooses one command at a time and remembers nothing, so the
 * plan is a function of the public view and the commands the engine offers:
 * every decision it is made again and names the **steps** it wants now (a
 * command of the offered list with a priority above the ordinary play), the
 * units it **holds** (a held unit is given no other command), the hostile
 * units it keeps for a Seizure, and where each own daemon may end a Move.
 * `src/ai/v7.ts` applies it (`cultPlanForV7`, and the Cult block at the end
 * of `scoreCommandWithContext`).
 *
 * A baseline designed from judgement, **not tuned by simulation**: no match
 * was played to set a number in this file, and its tests are hand-built
 * positions (`tests/unit/ruleset-v7-cult-channel-ai.test.ts`). It reads the
 * public view and the public previews only, draws nothing from the PRNG, and
 * does not depend on elapsed time.
 *
 * The order of a Cult turn, by priority:
 *
 * 1. **Seize** (`CULT_SEIZE_PRIORITY_V7`): a Seizure that is offered, then
 *    the Move of a holder or of a Summoner that makes one legal this turn.
 * 2. **A daemon that cannot be held** (`CULT_RELEASE_PRIORITY_V7`): it goes
 *    back to its cultists if a Move brings it within their reach (A-R3: or
 *    an Imp beside a held lead Imp, a Mass onto its Doorstep), else it is
 *    released toward the enemy, and the own units nearest to it step away.
 *    (A-R1: a Herald whose Hunger the seat cannot pay is released too.)
 * 3. **Swarm** (A-R3, `CULT_SWARM_MOVE_PRIORITY_V7` then
 *    `CULT_SWARM_PRIORITY_V7`): the second Imp's Move beside a unit an own
 *    Imp stands beside, then the Imps' unanswered attacks.
 * 4. **The daemons' ordinary play** (`CULT_DAEMON_PRIORITY_V7` added to the
 *    ordinary priority): a daemon moves and attacks before its channellers
 *    are placed, and only onto a tile its channellers can follow to (A-R3:
 *    or its Brood or Doorstep holds it on).
 * 5. **Anchor**, **Channel** (the channellers of the bound daemons, each a
 *    Move and a Channel, and a Summoner's strand for the trickle; A-R3: an
 *    Idol Bearer's step beside a Mass), **Bind again**.
 * 6. **The warden's placement** (`CULT_WARDEN_PRIORITY_V7`, A-R1: in the
 *    place of the Behold! step, which went with the Behold! command,
 *    `pulp_wars-mch9.33`), **Summon**, the **Sacrifice** of a spare Initiate
 *    (or of one that feeds the Herald's Hunger), the **Offering**.
 * 7. Last of all (`CULT_DOOMED_PRIORITY_V7`, below every ordinary command):
 *    the Sacrifice of an own unit the visible enemy kills this round.
 *
 * The rituals and the tricks (`pulp_wars-mch9.11`, bead A3; section 15.8)
 * are the part of the plan in `src/ai/v7-cult-rituals.ts`
 * (`cultRitualPlanV7`), called here once the channel plan has claimed its
 * cultists: the Herald's Move and Proclaim and a Horror's Boo! (above the
 * daemons' ordinary play), the Great Summoning (just above Summon), and
 * Ribbit, Switcheroo, the Tentacle, Star-fall, and its joins (below the
 * Offering, above the ordinary play). A Summoner calls a Tentacle only when
 * it has no Summon, Seizure, or Sacrifice step (A-R1, section 12.3).
 */

/** A cultist channels a daemon within this many tiles (section 6.2). */
export const CULT_CHANNEL_RANGE_V7 = 3;
/**
 * A daemon ends its Move within this many tiles of its wanted channellers
 * (section 15.2 step 2): one more than the range, the step of a cultist.
 */
export const CULT_DAEMON_LEASH_V7 = 4;
/** A Horror is summoned with an enemy unit or center this near. */
export const CULT_SUMMON_FRONT_V7 = 6;
/**
 * An Imp is summoned with an enemy unit or center this near (the Cult
 * redesign's A-R3, `pulp_wars-mch9.40`, section 12.2).
 */
export const CULT_IMP_FRONT_V7 = 8;
/**
 * The classes of a summon (A-R3, section 12.2), the higher first: a
 * Gibbering Mass for a watched city, one beside a standing idol that
 * shields a caster a visible enemy can attack, a Horror at the front; at
 * the cap a Mass for a city, a Horror with no enemy near, and a Mass beside
 * any idol; an Imp.
 */
export const CULT_SUMMON_CLASS_V7 = Object.freeze({
  MASS_CITY: 50,
  MASS_CIRCLE: 45,
  HORROR: 40,
  MASS_CITY_CAP: 30,
  HORROR_CAP: 25,
  MASS_CIRCLE_CAP: 20,
  IMP: 10,
});
/** The value Swarm counts for a target with no price (a summon, a giant). */
export const CULT_SWARM_PRICELESS_V7 = 12;
/** An enemy this near a center forbids an Offering and a last defender's Sacrifice. */
export const CULT_HOME_GUARD_V7 = 3;
/** A spare Initiate is one beyond the wanted channellers and this many. */
export const CULT_SPARE_BODIES_V7 = 2;
/** The own units this near a daemon that cannot be held step away. */
export const CULT_FLEE_RANGE_V7 = 4;

export const CULT_SEIZE_PRIORITY_V7 = 4000;
export const CULT_RELEASE_PRIORITY_V7 = 3990;
export const CULT_FLEE_PRIORITY_V7 = 3980;
/**
 * A-R3 (`pulp_wars-mch9.40`, section 12.3), Swarm: the second Imp's Move
 * beside the target, then an Imp's unanswered attack (above the daemons'
 * ordinary play, below Boo!).
 */
export const CULT_SWARM_MOVE_PRIORITY_V7 = 3945;
export const CULT_SWARM_PRIORITY_V7 = 3940;
/** Added to the ordinary priority of an own bound daemon's command. */
export const CULT_DAEMON_PRIORITY_V7 = 2000;
export const CULT_ANCHOR_PRIORITY_V7 = 1950;
export const CULT_CHANNEL_PRIORITY_V7 = 1940;
export const CULT_BIND_PRIORITY_V7 = 1930;
/**
 * The warden's placement (the Cult redesign's A-R1, `pulp_wars-mch9.38`,
 * section 12.2): an Idol Bearer's Move to the tile beside the most casters
 * a visible enemy can reach, once the channellers have their tiles. (It
 * takes the place of the raised idol's step, `CULT_BEHOLD_PRIORITY_V7`,
 * which went with the Behold! command, `pulp_wars-mch9.33`.)
 */
export const CULT_WARDEN_PRIORITY_V7 = 1920;
/**
 * `pulp_wars-mch9.27` (section 15.10): the step of a cultist off a watched
 * own center for a clearly better garrison beside it (the general garrison
 * swap of `src/ai/v7.ts`), before the Summon, the Sacrifice, and the
 * Offering a Summoner on that center would otherwise make there.
 */
export const CULT_GARRISON_SWAP_PRIORITY_V7 = 1912;
export const CULT_SUMMON_PRIORITY_V7 = 1910;
export const CULT_SACRIFICE_PRIORITY_V7 = 1900;
export const CULT_OFFERING_PRIORITY_V7 = 1890;
/** Above End Turn only: every ordinary command of the turn goes first. */
export const CULT_DOOMED_PRIORITY_V7 = 5;

type MoveV7 = Extract<CommandV7, { kind: "MOVE" }>;

/** What the plan reads beside the view (given by `src/ai/v7.ts`). */
export interface CultToolsV7 {
  readonly view: PlayerViewV7;
  /** The commands the engine offers the seat now. */
  readonly commands: readonly CommandV7[];
  readonly hostile: (ownerId: PlayerId) => boolean;
  /** What the visible enemies deal `unit` on `at` in their next turn. */
  readonly danger: (unit: PublicUnitV7, at: CoordV7) => number;
  /**
   * The same, the visible units of `gone` aside (A-R2, `pulp_wars-mch9.39`:
   * the Herald's victims).
   */
  readonly dangerWithout: (
    unit: PublicUnitV7,
    at: CoordV7,
    gone: readonly UnitId[],
  ) => number;
  /** A visible enemy can attack a unit on `at` in its next turn. */
  readonly threatened: (at: CoordV7) => boolean;
  /** The visible unit `unitId` can attack a unit on `at` in its next turn. */
  readonly reach: (unitId: UnitId, at: CoordV7) => boolean;
  /** The view with each of these units after a Move to its tile. */
  readonly moved: (
    moves: readonly CultMovedUnitV7[],
    /** The visible units taken off the board too (A-R2: a Herald's victim). */
    gone?: readonly UnitId[],
  ) => PlayerViewV7;
  /** The free unit slots of an own city. */
  readonly freeCapacity: (cityId: CityId) => number;
}

export type CultStepReasonV7 =
  | "SEIZE"
  | "SEIZE_HOLDER"
  | "SEIZE_SUMMONER"
  | "RETURN"
  | "RELEASE"
  | "FLEE"
  | "ANCHOR"
  | "CHANNEL"
  | "CHANNEL_MOVE"
  | "BIND"
  | "BIND_MOVE"
  | "SUMMON"
  | "SACRIFICE_SPARE"
  | "SACRIFICE_DOOMED"
  | "SACRIFICE_HUNGER"
  | "OFFERING"
  | "WARDEN"
  | "DOORSTEP"
  | "SWARM"
  | "SWARM_MOVE"
  | CultRitualReasonV7;

export interface CultStepV7 {
  /** One of `CultToolsV7.commands` (the same object). */
  readonly command: CommandV7;
  readonly priority: number;
  /** Orders the steps of one priority (the strategic value of the score). */
  readonly value: number;
  readonly reason: CultStepReasonV7;
}

/** The plan of one own bound daemon. */
export interface CultDaemonPlanV7 {
  readonly unitId: UnitId;
  /** Enough strands for its Control hold, or can still reach it. */
  readonly holdable: boolean;
  /** The strands the seat wants on it: its Control, and one to spare. */
  readonly wanted: number;
  /** Its holding strands now (a gripped channeller counts three). */
  readonly strands: number;
  /** The cultists assigned to it this decision, in order. */
  readonly channellerUnitIds: readonly UnitId[];
}

export interface CultPlanV7 {
  readonly steps: readonly CultStepV7[];
  /** The own units that are given no command but a step. */
  readonly held: ReadonlySet<UnitId>;
  /** The hostile units kept for a Seizure: no ordinary attack on them. */
  readonly seized: ReadonlySet<UnitId>;
  /** The Moves to a Seizure (unit to the key of its tile): exempt Moves. */
  readonly seizureMoves: ReadonlyMap<UnitId, string>;
  /** The own bound daemons, the Herald first, then by unit ID. */
  readonly daemons: readonly CultDaemonPlanV7[];
  /**
   * The own units on a leash: a bound daemon that is held (its channellers
   * must reach it), and a Thing that grips (it stays beside its cultist).
   * Such a unit's advance after a kill is asked of `mayEnd` too.
   */
  readonly leashed: ReadonlySet<UnitId>;
  /**
   * Whether the own unit may end a Move on the tile: a daemon where it can
   * be held (or, when it cannot, on the plan's tile only), a gripping Thing
   * beside its cultist, every other unit anywhere.
   */
  readonly mayEnd: (unitId: UnitId, at: CoordV7) => boolean;
  /**
   * The Cult redesign's A-R3 (`pulp_wars-mch9.40`): whether the own unit may
   * end its advance after a kill on the tile: `mayEnd`, but a kill may
   * break a Brood (an Imp's advance takes it from its lead).
   */
  readonly mayAdvance: (unitId: UnitId, at: CoordV7) => boolean;
  /**
   * The Cult redesign's A-R2 (`pulp_wars-mch9.39`): false for an attack of
   * an own Herald the plan does not make (`CultRitualPlanV7.mayAttack`).
   */
  readonly mayAttack: (unitId: UnitId, targetUnitId: UnitId) => boolean;
}

const EMPTY_PLAN_V7: CultPlanV7 = Object.freeze({
  steps: [],
  held: new Set<UnitId>(),
  seized: new Set<UnitId>(),
  seizureMoves: new Map<UnitId, string>(),
  daemons: [],
  leashed: new Set<UnitId>(),
  mayEnd: () => true,
  mayAdvance: () => true,
  mayAttack: () => true,
});

const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const sameTile = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
export const cultTileKeyV7 = (at: CoordV7): string => `${at.y},${at.x}`;

/** Lexicographic comparison, higher first. */
function better(left: readonly number[], right: readonly number[]): boolean {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

function primaryReady(unit: PublicUnitV7): boolean {
  return (
    !unit.activation.attacked &&
    !unit.activation.recovered &&
    !unit.activation.captured &&
    !unit.activation.specialActed &&
    !unit.activation.overrunActive
  );
}

const hasAbility = (
  view: PlayerViewV7,
  unit: PublicUnitV7,
  ability: string,
): boolean =>
  (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(ability);

/** An Initiate: the robed cultist of the line that costs least. */
export function cultInitiateV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return unit.role === "FIGHTER" && cultRobedV7(view, unit);
}

/**
 * The unit a daemon on `at` goes for if it broke (section 6.4): the nearest
 * unit of a player on land, a tie to the daemon's own seat, then to the
 * fewest Hit Points, then to the lowest unit ID. `except` is the daemon.
 */
export function cultNearestToV7(
  view: PlayerViewV7,
  at: CoordV7,
  except: UnitId | null,
): PublicUnitV7 | null {
  let best: PublicUnitV7 | null = null;
  let bestKey: readonly number[] = [];
  for (const unit of view.units) {
    if (
      unit.id === except ||
      unit.hp <= 0 ||
      isNeutralOwnerV7(unit.ownerId) ||
      unit.form === "NAVAL" ||
      unit.form === "EMBARKED"
    )
      continue;
    const key = [
      -gap(unit.at, at),
      Number(unit.ownerId === view.viewer.id),
      -unit.hp,
      -unit.id,
    ];
    if (best === null || better(key, bestKey)) {
      best = unit;
      bestKey = key;
    }
  }
  return best;
}

interface OptionV7 {
  readonly at: CoordV7;
  /** The Move that takes the unit there, or null when it stands there. */
  readonly move: MoveV7 | null;
}

interface AssignmentV7 {
  readonly unit: PublicUnitV7;
  readonly daemon: PublicUnitV7;
  readonly option: OptionV7;
  readonly bind: boolean;
}

/**
 * The Cult seat's plan for this decision (see the file comment). An empty
 * plan for a view without the Cult's lists.
 */
export function cultPlanV7(tools: CultToolsV7): CultPlanV7 {
  const { view, commands } = tools;
  const cult = view.cult as PlayerViewV7["cult"] | undefined;
  if (cult === undefined) return EMPTY_PLAN_V7;
  const me = view.viewer.id;
  const unitsById = new Map(view.units.map((unit) => [unit.id, unit]));

  // ------------------------------------------------ the offered commands
  const movesByUnit = new Map<UnitId, MoveV7[]>();
  const channelByPair = new Map<string, CommandV7>();
  const seizes: Extract<CommandV7, { kind: "SACRIFICE" | "SEIZE" }>[] = [];
  const sacrifices: Extract<CommandV7, { kind: "SACRIFICE" | "SEIZE" }>[] = [];
  const summons: Extract<CommandV7, { kind: "SUMMON" }>[] = [];
  const anchors: Extract<CommandV7, { kind: "ANCHOR" }>[] = [];
  const offerings: Extract<CommandV7, { kind: "OFFERING" }>[] = [];
  const tentacles: Extract<CommandV7, { kind: "TENTACLE" }>[] = [];
  const attacksByUnit = new Map<
    UnitId,
    Extract<CommandV7, { kind: "ATTACK" }>[]
  >();
  const trainingCities = new Set<CityId>();
  for (const command of commands) {
    if (command.kind === "MOVE") {
      const list = movesByUnit.get(command.unitId);
      if (list === undefined) movesByUnit.set(command.unitId, [command]);
      else list.push(command);
    } else if (command.kind === "CHANNEL")
      channelByPair.set(`${command.unitId}:${command.daemonUnitId}`, command);
    else if (command.kind === "SEIZE") seizes.push(command);
    else if (command.kind === "SACRIFICE") sacrifices.push(command);
    // Every summon (the Cult redesign's A-R3, `pulp_wars-mch9.40`: the
    // Imp, the Horror, and the Gibbering Mass; section 12.2 chooses).
    else if (command.kind === "SUMMON") summons.push(command);
    else if (command.kind === "ATTACK") {
      const list = attacksByUnit.get(command.unitId);
      if (list === undefined) attacksByUnit.set(command.unitId, [command]);
      else list.push(command);
    } else if (command.kind === "ANCHOR") anchors.push(command);
    else if (command.kind === "OFFERING") offerings.push(command);
    else if (command.kind === "TENTACLE") tentacles.push(command);
    else if (command.kind === "TRAIN") trainingCities.add(command.cityId);
  }

  // ------------------------------------------------------ the board facts
  const own = view.units.filter(
    (unit) => unit.ownerId === me && unit.hp > 0 && unit.form === "LAND",
  );
  const enemies = view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      !isNeutralOwnerV7(unit.ownerId) &&
      tools.hostile(unit.ownerId) &&
      unit.form !== "EGG",
  );
  const enemyGap = (at: CoordV7): number =>
    enemies.reduce((best, unit) => Math.min(best, gap(unit.at, at)), 99);
  const landTile = (at: CoordV7): boolean => {
    const tile = view.board.tiles[at.y * view.board.width + at.x];
    return (
      tile !== undefined &&
      sameTile(tile.at, at) &&
      tile.explored &&
      (tile.terrain === "GRASS" ||
        tile.terrain === "FOREST" ||
        tile.terrain === "MOUNTAIN") &&
      !view.curiosities.some((curiosity) => sameTile(curiosity.at, at))
    );
  };
  const strandOf = new Map<UnitId, UnitId | null>();
  for (const strand of cult.strands)
    strandOf.set(strand.cultistUnitId, strand.daemonUnitId);
  const grippedCultists = new Set(cult.grips.map((grip) => grip.cultistUnitId));
  const grippingThings = new Set(cult.grips.map((grip) => grip.thingUnitId));
  const freeThings = own.filter(
    (unit) => hasAbility(view, unit, "ANCHOR") && !grippingThings.has(unit.id),
  );
  const bearers = own.filter((unit) => hasAbility(view, unit, "BEHOLD"));
  const summoners = own.filter((unit) => hasAbility(view, unit, "SUMMON"));
  const ownCenters = view.cities.filter((city) => city.ownerId === me);
  const bodies = cultBodiesV7(view);
  const favour = cultFavourV7(view);
  const stars = view.viewer.researchedTechs.includes("EXPLOSIVES");

  const onOwnCenter = (unit: PublicUnitV7): boolean =>
    ownCenters.some((city) => sameTile(city.at, unit.at));
  /**
   * A city's last defender (never offered up): the unit on an own center
   * with a visible enemy within `CULT_HOME_GUARD_V7`.
   */
  const lastDefender = (unit: PublicUnitV7): boolean =>
    ownCenters.some(
      (city) =>
        sameTile(city.at, unit.at) && enemyGap(city.at) <= CULT_HOME_GUARD_V7,
    );

  const steps: CultStepV7[] = [];
  const held = new Set<UnitId>();

  // ------------------------------------------------- the bound daemons
  const daemonEntries = cult.daemons
    .flatMap((entry) => {
      const unit = unitsById.get(entry.unitId);
      return unit !== undefined && unit.ownerId === me && unit.form === "LAND"
        ? [{ entry, unit }]
        : [];
    })
    .sort(
      (left, right) =>
        Number(right.entry.role === "HERALD") -
          Number(left.entry.role === "HERALD") || left.unit.id - right.unit.id,
    );
  const ownDaemonIds = new Set(daemonEntries.map((item) => item.unit.id));
  /** The own cultists that hold a strand to the daemon now. */
  const holdersOf = (daemonId: UnitId): readonly PublicUnitV7[] =>
    own.filter((unit) => strandOf.get(unit.id) === daemonId);

  /** The robed cultists that can still channel this turn. */
  const free = own.filter(
    (unit) =>
      cultRobedV7(view, unit) && primaryReady(unit) && !strandOf.has(unit.id),
  );

  // ------------------------------------------- Brood and Doorstep (A-R3)
  // The Cult redesign's A-R3 (`pulp_wars-mch9.40`, RULESET_7_CULT_REDESIGN.md
  // section 12.2). Brood: the own Imps that stand together are held through
  // one channelled Imp (a lead), up to two others beside it
  // (`cultBroodLeadsV7`, the lead nearest the cultists first); a lead wants
  // one strand, and one to spare for a Brood of three. Doorstep: a
  // Gibbering Mass on or beside an own city center, or beside an own
  // standing idol, is given no channeller.
  /** The own Idol Bearers whose idols stand (the warden, section 8.1). */
  const standing = bearers.filter(
    (bearer) => previewWardenV7(view, bearer.id)?.stands === true,
  );
  /** A Gibbering Mass on `at` stands on its Doorstep (section 7.4). */
  const doorstepAt = (massId: UnitId, at: CoordV7): boolean =>
    ownCenters.some((city) => gap(city.at, at) <= 1) ||
    standing.some((bearer) => bearer.id !== massId && gap(bearer.at, at) === 1);
  const impItems = daemonEntries.filter((item) => item.entry.role === "IMP");
  const robedTiles = own
    .filter((unit) => cultRobedV7(view, unit))
    .map((unit) => unit.at);
  const leadOf = cultBroodLeadsV7(
    impItems.map((item) => item.unit),
    new Set(
      impItems
        .filter((item) => item.entry.strands >= item.entry.control)
        .map((item) => item.unit.id),
    ),
    (imp) =>
      -robedTiles.reduce(
        (nearest, at) => Math.min(nearest, gap(at, imp.at)),
        99,
      ),
  );
  /** The Imps each lead holds through its Brood. */
  const followersOf = new Map<UnitId, UnitId[]>();
  for (const [impId, lead] of leadOf)
    if (lead !== impId) {
      const list = followersOf.get(lead);
      if (list === undefined) followersOf.set(lead, [impId]);
      else list.push(impId);
    }
  const followerOf = (unitId: UnitId): boolean =>
    (leadOf.get(unitId) ?? unitId) !== unitId;
  const onDoorstep = (
    entry: (typeof daemonEntries)[number]["entry"],
  ): boolean => entry.role === "MASS" && entry.doorstep === true;
  /**
   * The strands a daemon wants beyond its Control: one, but none for a
   * lone Imp or a Brood of two (A-R3: one for a Brood of three).
   */
  const spareOf = (item: (typeof daemonEntries)[number]): number =>
    item.entry.role === "IMP"
      ? Number(
          (followersOf.get(item.unit.id)?.length ?? 0) >= CULT_BROOD_SIZE_V7,
        )
      : 1;
  const isSummoner = (unit: PublicUnitV7): boolean =>
    summoners.some((summoner) => summoner.id === unit.id);
  /** A daemon a Brood or its Doorstep holds needs no strand of its own. */
  const strandFree = (item: (typeof daemonEntries)[number]): boolean =>
    followerOf(item.unit.id) || onDoorstep(item.entry);

  // ------------------------------------------ Favour: the cap and Hunger
  // The Cult redesign's A-R1 (`pulp_wars-mch9.38`, RULESET_7_CULT_REDESIGN.md
  // section 12.2): the prices, the Herald's Hunger the seat keeps, the
  // saving for the Great Summoning, and the cap it spends before.
  const frogs = new Set(cult.frogs);
  /**
   * Every own bound daemon's Control and one to spare (section 15.2; A-R3:
   * by Brood, and nothing for a Mass on its Doorstep).
   */
  const wantedAll = daemonEntries.reduce(
    (sum, item) =>
      strandFree(item) ? sum : sum + item.entry.control + spareOf(item),
    0,
  );
  const controlAll = daemonEntries.reduce(
    (sum, item) => (strandFree(item) ? sum : sum + item.entry.control),
    0,
  );
  /** The own bound Heralds, by unit ID (the order Hunger is paid in). */
  const heraldIds = daemonEntries
    .filter((item) => item.entry.role === "HERALD")
    .map((item) => item.unit.id)
    .sort((left, right) => left - right);
  /** The Favour the next check eats: never spent, and fed when short. */
  const hunger = heraldIds.length * CULT_HUNGER_FAVOUR_V7;
  const saving = cultSavingV7(
    { stars, bodies, wantedAll, favour },
    summoners.length,
  );
  /** At the cap (nearly): the seat summons with no enemy near. */
  const capSpend = favour >= CULT_CAP_SPEND_FAVOUR_V7;
  const hostileCenters = view.cities.filter(
    (city) => !isNeutralOwnerV7(city.ownerId) && tools.hostile(city.ownerId),
  );
  /** The tiles from `at` to the nearest enemy unit or hostile center. */
  const frontOf = (at: CoordV7): number =>
    Math.min(
      enemyGap(at),
      hostileCenters.reduce(
        (nearest, city) => Math.min(nearest, gap(city.at, at)),
        99,
      ),
    );
  /** The own units kept for the Herald's Hunger: no strand for them. */
  const keep = new Set<UnitId>();

  // ----------------------------------------------- what to summon (A-R3)
  // The Cult redesign's A-R3 (`pulp_wars-mch9.40`, section 12.2): one summon
  // a turn per Summoner, chosen by class, then by its tile.
  //
  // 1. A Gibbering Mass beside an own city center that a hostile unit
  //    outside its own land watches (the garrison rule of section 15.10)
  //    when no own Mass stands on or beside it: on the tile nearest the
  //    enemy (Drag holds what comes).
  // 2. A Gibbering Mass beside an own standing idol, with no Mass beside
  //    it, that shields a caster a visible enemy can attack (the circle's
  //    guard). Neither Mass needs a body after its summoning: its Doorstep
  //    holds it.
  // 3. A Horror (the army) with an enemy unit or center within
  //    `CULT_SUMMON_FRONT_V7` and the bodies for its Control and one.
  // 4. At the cap only: a Gibbering Mass beside an own city center no Mass
  //    guards (watched or not), then a Horror with no enemy near (a wall
  //    its Doorstep holds before a fighter with nobody to fight), then a
  //    Mass beside any standing idol with no Mass beside it.
  // 5. An Imp with an enemy unit or center within `CULT_IMP_FRONT_V7`:
  //    beside an own Imp that has fewer than two Imps beside it (its Brood
  //    holds it: no body beyond every daemon's Control), else with a body
  //    for its strand; out of the visible enemy's reach first, then
  //    nearest the enemy.
  // At `CULT_CAP_SPEND_FAVOUR_V7` the fronts are not asked. Every price is
  // beyond the Hunger kept and, while the seat saves, beyond the Great
  // Summoning's. A Summoner a Seizure may need this turn summons nothing.
  const affords = (price: number): boolean =>
    favour - price >= hunger &&
    (!saving || favour - price >= CULT_SUMMONING_FAVOUR_V7 + hunger);
  const ownMasses = daemonEntries
    .filter((item) => item.entry.role === "MASS")
    .map((item) => item.unit);
  const ownImps = impItems.map((item) => item.unit);
  /** A hostile unit outside its own land within the garrison radius. */
  const coming = enemies.filter((unit) => {
    const tile = view.board.tiles[unit.at.y * view.board.width + unit.at.x];
    return (
      unit.form === "LAND" &&
      !(tile?.explored === true && tile.territoryOwnerId === unit.ownerId)
    );
  });
  const watched = (at: CoordV7): boolean =>
    coming.some((unit) => gap(unit.at, at) <= ARMY_GARRISON_RADIUS_V7);
  /** An own standing idol shields a caster a visible enemy can attack. */
  const shieldsCaster = (bearer: PublicUnitV7): boolean =>
    own.some(
      (unit) =>
        unit.id !== bearer.id &&
        gap(unit.at, bearer.at) === 1 &&
        cultRobedV7(view, unit) &&
        !cultWardenV7(view, unit) &&
        tools.threatened(unit.at),
    );
  /** The class and the key of a summon the plan would make, or null. */
  const summonKey = (
    command: (typeof summons)[number],
    freeOnly: boolean,
  ): readonly number[] | null => {
    const summoner = unitsById.get(command.unitId);
    const helper =
      command.helperUnitId === undefined
        ? undefined
        : unitsById.get(command.helperUnitId);
    if (
      summoner === undefined ||
      (command.helperUnitId !== undefined && helper === undefined) ||
      (freeOnly &&
        (held.has(summoner.id) ||
          (helper !== undefined && held.has(helper.id)) ||
          // A Summoner a Seizure may need keeps its action for it.
          seizing.has(summoner.id)))
    )
      return null;
    // Never beside an enemy where the Summoner or its helper would be the
    // summon's nearest unit if it broke.
    if (enemyGap(command.at) <= 1) {
      const nearest = cultNearestToV7(view, command.at, null);
      if (
        nearest === null ||
        nearest.id === summoner.id ||
        nearest.id === helper?.id
      )
        return null;
    }
    const front = frontOf(summoner.at);
    const tie = [
      -(helper === undefined ? 0 : (unitRoleRuleV7(view, helper).cost ?? 0)),
      -(helper?.id ?? 0),
      -command.at.y,
      -command.at.x,
      -summoner.id,
    ];
    if (command.daemon === "MASS") {
      const centers = ownCenters.filter(
        (city) =>
          gap(city.at, command.at) <= 1 &&
          !ownMasses.some((mass) => gap(mass.at, city.at) <= 1),
      );
      if (!affords(CULT_MASS_FAVOUR_V7)) return null;
      if (centers.some((city) => watched(city.at)))
        return [CULT_SUMMON_CLASS_V7.MASS_CITY, -enemyGap(command.at), ...tie];
      if (capSpend && centers.length > 0)
        return [
          CULT_SUMMON_CLASS_V7.MASS_CITY_CAP,
          -enemyGap(command.at),
          ...tie,
        ];
      const idols = standing.filter(
        (bearer) =>
          gap(bearer.at, command.at) === 1 &&
          !ownMasses.some((mass) => gap(mass.at, bearer.at) === 1),
      );
      if (idols.some(shieldsCaster))
        return [
          CULT_SUMMON_CLASS_V7.MASS_CIRCLE,
          -enemyGap(command.at),
          ...tie,
        ];
      if (capSpend && idols.length > 0)
        return [
          CULT_SUMMON_CLASS_V7.MASS_CIRCLE_CAP,
          -enemyGap(command.at),
          ...tie,
        ];
      return null;
    }
    if (command.daemon === "HORROR")
      return affords(CULT_HORROR_FAVOUR_V7) &&
        bodies >= wantedAll + 2 &&
        (capSpend || front <= CULT_SUMMON_FRONT_V7)
        ? [
            front <= CULT_SUMMON_FRONT_V7
              ? CULT_SUMMON_CLASS_V7.HORROR
              : CULT_SUMMON_CLASS_V7.HORROR_CAP,
            -enemyGap(command.at),
            ...tie,
          ]
        : null;
    // The Imp.
    const brood = ownImps.some(
      (imp) =>
        gap(imp.at, command.at) === 1 &&
        ownImps.filter(
          (other) => other.id !== imp.id && gap(other.at, imp.at) === 1,
        ).length < CULT_BROOD_SIZE_V7,
    );
    // A lone Imp wants a body for its strand beyond every daemon's Control
    // and spare; one its Brood will hold only the bodies for every Control
    // while the Summoner's strand holds it this turn.
    return affords(CULT_IMP_FAVOUR_V7) &&
      bodies >= (brood ? controlAll : wantedAll) + 1 &&
      (capSpend || front <= CULT_IMP_FRONT_V7)
      ? [
          CULT_SUMMON_CLASS_V7.IMP,
          Number(brood),
          Number(!tools.threatened(command.at)),
          -enemyGap(command.at),
          ...tie,
        ]
      : null;
  };
  /** A summon the plan would make with this Summoner (held or not). */
  const summonsWith = (unit: PublicUnitV7): boolean =>
    summons.some(
      (command) =>
        command.unitId === unit.id && summonKey(command, false) !== null,
    );

  /** A Tentacle on `at` slaps an enemy, with no own or allied unit by it. */
  const tentacleWorth = (at: CoordV7): boolean => {
    const around = view.units.filter(
      (unit) =>
        unit.hp > 0 &&
        !isNeutralOwnerV7(unit.ownerId) &&
        gap(unit.at, at) === 1,
    );
    if (
      around.length === 0 ||
      around.some((unit) => !tools.hostile(unit.ownerId))
    )
      return false;
    const slapped = tentacleSlapTargetV7(view.units, at);
    return slapped !== null && tools.hostile(slapped.ownerId);
  };
  /**
   * The Summoners a Seizure this turn may need (A-R2's company, section
   * 12.3; read here by A-R3, `pulp_wars-mch9.40`, as the A-R2 notes ask:
   * the trickle's channeller is never one of them while another can).
   */
  const seizing = cultSeizureToolsV7({
    view,
    commands,
    own,
    enemies,
    held,
    movesByUnit,
    landTile,
    onOwnCenter,
  }).seizing;
  /**
   * A Summoner with a better use for its action than a strand (section
   * 12.2, the trickle; 12.3, the Tentacle): a Seizure offered to it or one
   * it may make this turn, a Summon the seat would make with it, or a
   * Tentacle that slaps an enemy.
   */
  const busySummoner = (unit: PublicUnitV7): boolean =>
    seizes.some((command) => command.unitId === unit.id) ||
    seizing.has(unit.id) ||
    summonsWith(unit) ||
    tentacles.some(
      (command) => command.unitId === unit.id && tentacleWorth(command.at),
    );
  /**
   * An Initiate with a village to take this turn (Pamphlets), or a cultist
   * beside a broken enemy a Summoner with its action stands near (a
   * Seizure to hold).
   */
  const occupied = (unit: PublicUnitV7): boolean =>
    (cultInitiateV7(view, unit) &&
      (movesByUnit.get(unit.id) ?? []).some((move) => {
        const end = move.path.at(-1);
        const tile =
          end === undefined
            ? undefined
            : view.board.tiles[end.y * view.board.width + end.x];
        return (
          end !== undefined &&
          tile?.explored === true &&
          pamphletsApplyV7(view, unit, tile.site) &&
          !view.cities.some((city) => sameTile(city.at, end))
        );
      })) ||
    enemies.some(
      (enemy) =>
        enemy.form === "LAND" &&
        gap(enemy.at, unit.at) === 1 &&
        (enemy.hp <= SEIZE_BROKEN_HP_V7 ||
          (frogs.has(enemy.id) && enemy.hp * 2 <= enemy.maxHp)) &&
        summoners.some(
          (summoner) =>
            summoner.id !== unit.id &&
            primaryReady(summoner) &&
            gap(summoner.at, enemy.at) <= 2,
        ),
    );
  /**
   * The order in which free cultists are asked to channel (section 15.7
   * rule 3, revised by A-R1 for the trickle): the plain cultists, then a
   * Summoner with nothing better to do (its strand pays the trickle), then
   * a cultist with a village or a Seizure to hold, then an Idol Bearer (the
   * warden), then a Summoner with a Seizure, a Summon, or a Tentacle.
   */
  const ranks = new Map<UnitId, number>();
  const channelRank = (unit: PublicUnitV7): number => {
    let rank = ranks.get(unit.id);
    if (rank === undefined) {
      rank = bearers.some((bearer) => bearer.id === unit.id)
        ? 3
        : summoners.some((summoner) => summoner.id === unit.id)
          ? busySummoner(unit)
            ? 4
            : 1
          : occupied(unit)
            ? 2
            : 0;
      ranks.set(unit.id, rank);
    }
    return rank;
  };

  /** Where `unit` can channel the daemon from this turn. */
  const optionsFor = (
    unit: PublicUnitV7,
    daemon: PublicUnitV7,
  ): readonly OptionV7[] => {
    const options: OptionV7[] = [];
    if (channelByPair.has(`${unit.id}:${daemon.id}`))
      options.push({ at: unit.at, move: null });
    // The garrison of a center channels from its center or not at all.
    if (onOwnCenter(unit)) return options;
    const seen = new Set<string>();
    for (const move of movesByUnit.get(unit.id) ?? []) {
      const end = move.path.at(-1);
      if (
        end === undefined ||
        gap(end, daemon.at) > CULT_CHANNEL_RANGE_V7 ||
        !landTile(end) ||
        seen.has(cultTileKeyV7(end))
      )
        continue;
      seen.add(cultTileKeyV7(end));
      options.push({ at: end, move });
    }
    return options;
  };

  const assigned = new Map<UnitId, AssignmentV7>();
  const order: AssignmentV7[] = [];
  /** The tiles of the channellers: the strand holders and the assigned. */
  const channellerTiles: CoordV7[] = own
    .filter((unit) => strandOf.has(unit.id))
    .map((unit) => unit.at);

  /**
   * The tile an assigned channeller takes (section 15.2 step 3): next to an
   * own Idol Bearer, then outside every visible enemy's threatened tiles,
   * then not next to another channeller, then the farthest from the enemy;
   * then next to a Thing that grips nobody, then where it stands, then the
   * first in `(y, x)` order. With `grip` (too few cultists for the Control
   * without one) the tiles next to such a Thing come first.
   */
  const bestOption = (
    unit: PublicUnitV7,
    options: readonly OptionV7[],
    grip: boolean,
  ): OptionV7 | undefined => {
    let best: OptionV7 | undefined;
    let bestKey: readonly number[] = [];
    for (const option of options) {
      const key = [
        Number(
          grip && freeThings.some((thing) => gap(thing.at, option.at) === 1),
        ),
        Number(
          bearers.some(
            (bearer) =>
              bearer.id !== unit.id && gap(bearer.at, option.at) === 1,
          ),
        ),
        Number(!tools.threatened(option.at)),
        Number(!channellerTiles.some((tile) => gap(tile, option.at) === 1)),
        enemyGap(option.at),
        Number(freeThings.some((thing) => gap(thing.at, option.at) === 1)),
        Number(option.move === null),
        -option.at.y,
        -option.at.x,
      ];
      if (best === undefined || better(key, bestKey)) {
        best = option;
        bestKey = key;
      }
    }
    return best;
  };

  /**
   * The unassigned cultists that can channel `daemon` this turn, the
   * nearest first; one that has moved already (it came for this) before the
   * others, then in the order of `channelRank` (the Summoner with nothing
   * better to do before a cultist with a village or a Seizure to hold, the
   * Idol Bearer and the busy Summoner last). Never a unit kept for the
   * Herald's Hunger.
   */
  const candidatesFor = (
    daemon: PublicUnitV7,
  ): readonly {
    readonly unit: PublicUnitV7;
    readonly options: readonly OptionV7[];
  }[] =>
    free
      .filter((unit) => !assigned.has(unit.id) && !keep.has(unit.id))
      .map((unit) => ({ unit, options: optionsFor(unit, daemon) }))
      .filter((item) => item.options.length > 0)
      .sort(
        (left, right) =>
          Number(right.unit.activation.moved) -
            Number(left.unit.activation.moved) ||
          channelRank(left.unit) - channelRank(right.unit) ||
          gap(left.unit.at, daemon.at) - gap(right.unit.at, daemon.at) ||
          left.unit.id - right.unit.id,
      );

  const assign = (
    daemon: PublicUnitV7,
    item: {
      readonly unit: PublicUnitV7;
      readonly options: readonly OptionV7[];
    },
    grip: boolean,
    bind: boolean,
  ): void => {
    const gripOptions = grip
      ? item.options.filter((option) =>
          freeThings.some((thing) => gap(thing.at, option.at) === 1),
        )
      : [];
    const option = bestOption(
      item.unit,
      gripOptions.length > 0 ? gripOptions : item.options,
      grip,
    );
    if (option === undefined) return;
    const assignment = { unit: item.unit, daemon, option, bind };
    assigned.set(item.unit.id, assignment);
    order.push(assignment);
    channellerTiles.push(option.at);
    held.add(item.unit.id);
  };

  interface DaemonWorkV7 {
    readonly unit: PublicUnitV7;
    readonly control: number;
    readonly strands: number;
    /** A grip adds two strands: one is offered or one is planned. */
    grip: boolean;
    holdable: boolean;
    /** A Herald whose Hunger the seat cannot pay (A-R1, section 12.2). */
    starving: boolean;
    wanted: number;
    readonly channellers: UnitId[];
    /** The strands it wants beyond its Control (A-R3: by Brood). */
    readonly spare: number;
    /** A-R3: the lead Imp whose Brood holds it, or null. */
    lead: UnitId | null;
    /** A-R3: a Gibbering Mass its Doorstep holds (or an Idol Bearer's step). */
    doorstep: boolean;
  }
  const work: DaemonWorkV7[] = daemonEntries.map((item) => ({
    unit: item.unit,
    control: item.entry.control,
    strands: item.entry.strands,
    grip: false,
    holdable: true,
    starving: false,
    wanted: strandFree(item) ? 0 : item.entry.control,
    channellers: [],
    spare: spareOf(item),
    lead: followerOf(item.unit.id) ? (leadOf.get(item.unit.id) ?? null) : null,
    doorstep: onDoorstep(item.entry),
  }));

  // ---------------------------------------------------- the Offering
  // Section 15.4 and 15.10 rule 3 (paced): a city at its unit limit or with
  // nothing to train, no enemy within 3 of its center, and (A-R1, section
  // 12.2) never when its 6 would pass the cap.
  const offeringOk = (command: (typeof offerings)[number]): boolean => {
    const city = view.cities.find((item) => item.id === command.cityId);
    return (
      city !== undefined &&
      cultOfferingDueV7(view, city.id) &&
      enemyGap(city.at) > CULT_HOME_GUARD_V7 &&
      !(tools.freeCapacity(city.id) > 0 && trainingCities.has(city.id)) &&
      favour + OFFERING_FAVOUR_V7 <= CULT_FAVOUR_CAP_V7
    );
  };

  // ------------------------------------------------ the Herald's Hunger
  // A-R1 (section 12.2): the seat pays 2 Favour for each bound Herald at
  // its next check (after the trickle), and a Herald it cannot pay for
  // breaks loose. Short of it, it feeds the Herald: a free Summoner
  // Sacrifices a spare Initiate beside it (rule (b) of section 15.7,
  // extended: both are kept for it, its step at the Sacrifice's priority),
  // or else channels for the trickle; and an Offering that is due is made.
  // A Herald the seat still cannot pay for (the lowest unit IDs are paid
  // first, as the check pays) is one it cannot hold: released toward the
  // enemy, its cultists step away (section 15.7 rule 5).
  const feedSteps: CultStepV7[] = [];
  /** The free Summoners that channel for the trickle the Hunger needs. */
  const feedChannel = new Set<UnitId>();
  const hungry = favour < hunger;
  if (hungry) {
    // The trickle of the Summoners that hold a strand already.
    let purse =
      favour +
      summoners.filter((unit) => {
        const daemonId = strandOf.get(unit.id);
        return daemonId != null && ownDaemonIds.has(daemonId);
      }).length *
        SUMMONER_TRICKLE_FAVOUR_V7;
    if (purse < hunger && offerings.some(offeringOk))
      purse += OFFERING_FAVOUR_V7;
    // A spare Initiate: one the daemons' Control does not need.
    let spareBodies = bodies - controlAll;
    for (const summoner of [...summoners].sort(
      (left, right) => left.id - right.id,
    )) {
      if (purse >= hunger) break;
      if (
        !primaryReady(summoner) ||
        strandOf.has(summoner.id) ||
        frogs.has(summoner.id)
      )
        continue;
      let best: (typeof sacrifices)[number] | undefined;
      let bestKey: readonly number[] = [];
      if (spareBodies > 0)
        for (const command of sacrifices) {
          if (command.unitId !== summoner.id) continue;
          const victim = unitsById.get(command.victimUnitId);
          if (
            victim === undefined ||
            keep.has(victim.id) ||
            !cultInitiateV7(view, victim) ||
            strandOf.has(victim.id) ||
            lastDefender(victim)
          )
            continue;
          const preview = previewSacrificeV7(view, summoner.id, victim.id);
          if (preview === null) continue;
          const key = [preview.favour, -victim.hp, -victim.id];
          if (best === undefined || better(key, bestKey)) {
            best = command;
            bestKey = key;
          }
        }
      if (best !== undefined) {
        const gain = bestKey[0] ?? 0;
        keep.add(summoner.id);
        keep.add(best.victimUnitId);
        held.add(summoner.id);
        held.add(best.victimUnitId);
        spareBodies -= 1;
        purse += gain;
        feedSteps.push({
          command: best,
          priority: CULT_SACRIFICE_PRIORITY_V7,
          value: gain,
          reason: "SACRIFICE_HUNGER",
        });
      } else if (
        work.some((daemon) => optionsFor(summoner, daemon.unit).length > 0)
      ) {
        feedChannel.add(summoner.id);
        purse += SUMMONER_TRICKLE_FAVOUR_V7;
      }
    }
    for (const heraldId of heraldIds) {
      if (purse >= CULT_HUNGER_FAVOUR_V7) {
        purse -= CULT_HUNGER_FAVOUR_V7;
        continue;
      }
      const daemon = work.find((item) => item.unit.id === heraldId);
      if (daemon !== undefined) {
        daemon.holdable = false;
        daemon.starving = true;
      }
    }
  }

  // A-R3 (`pulp_wars-mch9.40`, section 12.2): an Idol Bearer that holds a
  // forward Gibbering Mass by its Doorstep (no own center beside the Mass,
  // and no strand of its own holds it) is held beside it: it may attack,
  // not leave (`keepers`, read by `mayEnd`; the lowest unit ID among
  // several).
  const keepers = new Map<UnitId, CoordV7>();
  for (const daemon of work) {
    if (
      !daemon.doorstep ||
      daemon.unit.summoned !== "MASS" ||
      daemon.strands >= daemon.control ||
      ownCenters.some((city) => gap(city.at, daemon.unit.at) <= 1)
    )
      continue;
    const keeper = standing
      .filter((bearer) => gap(bearer.at, daemon.unit.at) === 1)
      .sort((left, right) => left.id - right.id)[0];
    if (keeper !== undefined) keepers.set(keeper.id, daemon.unit.at);
  }
  /** A-R3: a Mass held by an Idol Bearer's step: it waits for it. */
  const pinned = new Map<UnitId, CoordV7>();
  const doorstepSteps: CultStepV7[] = [];
  /**
   * A-R3: a free Idol Bearer whose idol stands steps beside a Gibbering
   * Mass that needs a strand, so its Doorstep holds it (no channeller's
   * turn): one that has not moved, holds no strand, is no garrison of an
   * own center, and steps onto a tile the visible enemy does not kill it
   * on, out of reach first, then the shortest step.
   */
  const bearerDoorstep = (mass: PublicUnitV7): boolean => {
    let best: { move: MoveV7; key: readonly number[] } | undefined;
    for (const bearer of standing) {
      if (
        held.has(bearer.id) ||
        keep.has(bearer.id) ||
        keepers.has(bearer.id) ||
        strandOf.has(bearer.id) ||
        bearer.activation.moved ||
        !primaryReady(bearer) ||
        onOwnCenter(bearer)
      )
        continue;
      for (const move of movesByUnit.get(bearer.id) ?? []) {
        const end = move.path.at(-1);
        if (
          end === undefined ||
          gap(end, mass.at) !== 1 ||
          !landTile(end) ||
          tools.danger(bearer, end) >= bearer.hp
        )
          continue;
        const key = [
          Number(!tools.threatened(end)),
          -move.path.length,
          -bearer.id,
          -end.y,
          -end.x,
        ];
        if (best === undefined || better(key, best.key)) best = { move, key };
      }
    }
    const end = best?.move.path.at(-1);
    if (best === undefined || end === undefined) return false;
    held.add(best.move.unitId);
    pinned.set(mass.id, end);
    doorstepSteps.push({
      command: best.move,
      priority: CULT_CHANNEL_PRIORITY_V7,
      value: 1,
      reason: "DOORSTEP",
    });
    return true;
  };

  /**
   * Section 15.2 step 1 for one daemon: its Control from the candidates,
   * or a Thing's grip, or (A-R3) an Idol Bearer's step beside a Mass;
   * false when it cannot be held.
   */
  const holdOne = (daemon: DaemonWorkV7): boolean => {
    // A grip that is offered on one of its channellers counts already.
    const offeredGrip = anchors.some(
      (command) => strandOf.get(command.cultistUnitId) === daemon.unit.id,
    );
    if (offeredGrip) daemon.grip = true;
    const need = daemon.control - daemon.strands - (offeredGrip ? 2 : 0);
    if (need <= 0) return true;
    if (daemon.unit.summoned === "MASS" && bearerDoorstep(daemon.unit)) {
      daemon.doorstep = true;
      daemon.wanted = 0;
      return true;
    }
    const candidates = candidatesFor(daemon.unit);
    if (candidates.length >= need) {
      for (const item of candidates.slice(0, need)) {
        assign(daemon.unit, item, false, false);
        daemon.channellers.push(item.unit.id);
      }
      return true;
    }
    // Too few cultists: one of them beside a Thing counts three.
    const gripped = offeredGrip
      ? undefined
      : candidates.find((item) =>
          item.options.some((option) =>
            freeThings.some((thing) => gap(thing.at, option.at) === 1),
          ),
        );
    if (gripped !== undefined && candidates.length + 2 >= need) {
      daemon.grip = true;
      assign(daemon.unit, gripped, true, false);
      daemon.channellers.push(gripped.unit.id);
      // The Thing waits for it where it stands.
      const tile = assigned.get(gripped.unit.id)?.option.at;
      const thing =
        tile === undefined
          ? undefined
          : freeThings.find((unit) => gap(unit.at, tile) === 1);
      if (thing !== undefined) held.add(thing.id);
      for (const item of candidates) {
        if (item.unit.id === gripped.unit.id) continue;
        assign(daemon.unit, item, false, false);
        daemon.channellers.push(item.unit.id);
      }
      return true;
    }
    return false;
  };

  // Pass 1 (section 15.2 step 1): each daemon its Control, the Herald
  // first, then the others by unit ID. A-R3: an Imp a lead's Brood holds
  // and a Mass on its Doorstep are given none; an Imp whose lead cannot be
  // held then asks for a strand of its own.
  for (const daemon of work) {
    // (A-R1: a starving Herald is let go: no strand for it.)
    if (daemon.starving || daemon.lead !== null || daemon.doorstep) continue;
    if (!holdOne(daemon)) daemon.holdable = false;
  }
  const workById = new Map(work.map((daemon) => [daemon.unit.id, daemon]));
  for (const daemon of work) {
    if (daemon.lead === null) continue;
    if (workById.get(daemon.lead)?.holdable === true) continue;
    daemon.lead = null;
    daemon.wanted = daemon.control;
    if (!holdOne(daemon)) daemon.holdable = false;
  }

  // Pass 2: the strands to spare for each daemon that is held (one; A-R3:
  // one for a Brood of three, none for a smaller Brood), from the cultists
  // that are left ("with too few robed cultists it wants Control").
  for (const daemon of work) {
    if (!daemon.holdable || daemon.lead !== null || daemon.doorstep) continue;
    const holders = holdersOf(daemon.unit.id);
    const total =
      daemon.strands +
      daemon.channellers.length +
      (daemon.grip && !holders.some((unit) => grippedCultists.has(unit.id))
        ? 2
        : 0);
    const gripInvolved =
      daemon.grip || holders.some((unit) => grippedCultists.has(unit.id));
    const count = holders.length + daemon.channellers.length;
    // A gripped channeller counts three, and one hit takes all three: the
    // seat still wants a strand from somebody else.
    const extra = Math.max(
      daemon.control + daemon.spare - total,
      gripInvolved && count < 2 ? 1 : 0,
    );
    if (extra <= 0) {
      daemon.wanted = daemon.control + daemon.spare;
      continue;
    }
    // (A-R3: never a Summoner with a Summon, a Seizure, or a Tentacle to
    // make: a spare strand is no better use of its action.)
    const spare = candidatesFor(daemon.unit)
      .filter((item) => !(isSummoner(item.unit) && busySummoner(item.unit)))
      .slice(0, extra);
    for (const item of spare) {
      assign(daemon.unit, item, false, false);
      daemon.channellers.push(item.unit.id);
    }
    if (spare.length >= extra) daemon.wanted = daemon.control + daemon.spare;
  }

  // Pass 3 (A-R1, section 12.2, the trickle): a Summoner with no Seizure,
  // Summon, or Tentacle to make (`busySummoner`) channels a held daemon
  // anyway, from a tile no visible enemy can attack: its strand pays 1
  // Favour at the check. Not at the cap (the Favour would be lost). A
  // Summoner the Herald's Hunger needs channels whatever else it could do,
  // from any tile it can.
  if (favour < CULT_FAVOUR_CAP_V7)
    for (const summoner of [...summoners].sort(
      (left, right) => left.id - right.id,
    )) {
      const needed = feedChannel.has(summoner.id);
      if (
        assigned.has(summoner.id) ||
        keep.has(summoner.id) ||
        frogs.has(summoner.id) ||
        !free.some((unit) => unit.id === summoner.id) ||
        (!needed && busySummoner(summoner))
      )
        continue;
      const nearest = work
        .filter((daemon) => daemon.holdable)
        .sort(
          (left, right) =>
            gap(left.unit.at, summoner.at) - gap(right.unit.at, summoner.at) ||
            left.unit.id - right.unit.id,
        );
      for (const daemon of nearest) {
        const options = optionsFor(summoner, daemon.unit).filter(
          (option) => needed || !tools.threatened(option.at),
        );
        if (options.length === 0) continue;
        assign(daemon.unit, { unit: summoner, options }, false, false);
        daemon.channellers.push(summoner.id);
        break;
      }
    }

  // Anchor (section 15.4): a Thing always grips a channeller beside it.
  {
    let best: (typeof anchors)[number] | undefined;
    let bestKey: readonly number[] = [];
    for (const command of anchors) {
      const daemonId = strandOf.get(command.cultistUnitId);
      const daemon = work.find((item) => item.unit.id === daemonId);
      const key = [
        daemon?.control ?? 0,
        -command.cultistUnitId,
        -command.unitId,
      ];
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
      }
    }
    if (best !== undefined)
      steps.push({
        command: best,
        priority: CULT_ANCHOR_PRIORITY_V7,
        value: 0,
        reason: "ANCHOR",
      });
  }

  // The first assigned channeller's next command: its Move, or its Channel.
  const stepOf = (assignment: AssignmentV7): CommandV7 | undefined =>
    assignment.option.move ??
    channelByPair.get(`${assignment.unit.id}:${assignment.daemon.id}`);
  let channelPending = false;
  for (const assignment of order) {
    const command = stepOf(assignment);
    if (command === undefined) continue;
    channelPending = true;
    steps.push({
      command,
      priority: CULT_CHANNEL_PRIORITY_V7,
      value: 0,
      reason: command.kind === "MOVE" ? "CHANNEL_MOVE" : "CHANNEL",
    });
    break;
  }

  /**
   * A-R3 (section 12.2), Brood: an Imp on `at` is held through the Brood of
   * an own lead Imp beside it that is held and holds fewer than two others
   * besides it.
   */
  const broodAt = (impId: UnitId, at: CoordV7): boolean =>
    work.some(
      (lead) =>
        lead.unit.id !== impId &&
        lead.unit.summoned === "IMP" &&
        lead.holdable &&
        lead.lead === null &&
        gap(lead.unit.at, at) === 1 &&
        work.filter(
          (follower) =>
            follower.lead === lead.unit.id && follower.unit.id !== impId,
        ).length < CULT_BROOD_SIZE_V7,
    );
  /** A-R3: the daemon on `at` is held there with no strand of its own. */
  const heldThere = (daemon: DaemonWorkV7, at: CoordV7): boolean =>
    daemon.unit.summoned === "IMP"
      ? broodAt(daemon.unit.id, at)
      : daemon.unit.summoned === "MASS" && doorstepAt(daemon.unit.id, at);

  // ------------------------------------- a daemon that cannot be held
  const releaseTiles = new Map<UnitId, string | null>();
  for (const daemon of work) {
    if (daemon.holdable) continue;
    const at = daemon.unit.at;
    const holders = holdersOf(daemon.unit.id);
    const pool = free.filter((unit) => !assigned.has(unit.id));
    const moves = movesByUnit.get(daemon.unit.id) ?? [];
    /** The strands that could hold it on `tile` (step 2's leash). */
    const reachable = (tile: CoordV7): number =>
      (holders.every((unit) => gap(unit.at, tile) <= CULT_CHANNEL_RANGE_V7)
        ? daemon.strands
        : 0) +
      pool.filter(
        (unit) =>
          gap(unit.at, tile) <=
          (unit.activation.moved
            ? CULT_CHANNEL_RANGE_V7
            : CULT_DAEMON_LEASH_V7),
      ).length;
    const ownGap = (tile: CoordV7): number =>
      own.reduce(
        (best, unit) =>
          unit.id === daemon.unit.id
            ? best
            : Math.min(best, gap(unit.at, tile)),
        99,
      );
    let chosen: MoveV7 | undefined;
    let chosenKey: readonly number[] = [];
    let reason: CultStepReasonV7 = "RETURN";
    // Back to its cultists, if a Move brings it within their reach (not a
    // starving Herald: strands do not feed it). A-R3: or beside an own
    // lead Imp whose Brood holds it, or (a Mass) onto its Doorstep.
    for (const move of daemon.starving ? [] : moves) {
      const end = move.path.at(-1);
      if (end === undefined || !landTile(end)) continue;
      const count = Math.max(
        reachable(end),
        heldThere(daemon, end) ? daemon.control : 0,
      );
      if (count < daemon.control) continue;
      const key = [count, -enemyGap(end), -end.y, -end.x];
      if (chosen === undefined || better(key, chosenKey)) {
        chosen = move;
        chosenKey = key;
      }
    }
    if (chosen === undefined) {
      // Released toward the enemy (step 4): the tile that puts the nearest
      // visible enemy nearer to it than any own unit, if it stands on no
      // such tile already; else the tile that is better than its own.
      reason = "RELEASE";
      const here = [ownGap(at) - enemyGap(at), -enemyGap(at)];
      for (const move of moves) {
        const end = move.path.at(-1);
        if (end === undefined || !landTile(end)) continue;
        const key = [
          ownGap(end) - enemyGap(end),
          -enemyGap(end),
          -end.y,
          -end.x,
        ];
        if (!better(key, here)) continue;
        if (chosen === undefined || better(key, chosenKey)) {
          chosen = move;
          chosenKey = key;
        }
      }
    }
    const end = chosen?.path.at(-1);
    releaseTiles.set(
      daemon.unit.id,
      end === undefined ? null : cultTileKeyV7(end),
    );
    if (chosen !== undefined) {
      steps.push({
        command: chosen,
        priority: CULT_RELEASE_PRIORITY_V7,
        value: -daemon.unit.id,
        reason,
      });
      continue;
    }
    // It stays: the own units that would be its nearest step away from it
    // (never a unit on an own center, nor a channeller of another daemon).
    const limit = Math.min(enemyGap(at), CULT_FLEE_RANGE_V7);
    for (const unit of own) {
      if (
        unit.summoned !== undefined ||
        held.has(unit.id) ||
        gap(unit.at, at) > limit ||
        ownCenters.some((city) => sameTile(city.at, unit.at))
      )
        continue;
      let flight: MoveV7 | undefined;
      let flightKey: readonly number[] = [];
      for (const move of movesByUnit.get(unit.id) ?? []) {
        const to = move.path.at(-1);
        if (
          to === undefined ||
          !landTile(to) ||
          gap(to, at) <= gap(unit.at, at)
        )
          continue;
        const key = [gap(to, at), Number(!tools.threatened(to)), -to.y, -to.x];
        if (flight === undefined || better(key, flightKey)) {
          flight = move;
          flightKey = key;
        }
      }
      if (flight === undefined) continue;
      steps.push({
        command: flight,
        priority: CULT_FLEE_PRIORITY_V7,
        value: -unit.id,
        reason: "FLEE",
      });
      break;
    }
  }

  // ------------------------------------------------------- Bind again
  // Section 15.2 step 5: an Unbound daemon that is not Furious, only when
  // the cultists the bound daemons leave can bring its whole Control this
  // turn (it is bound at once then, so it makes no rampage on the way: the
  // binders walk up and channel one after the other, before anything else).
  let bindPending = false;
  for (const monster of view.monsters) {
    if (bindPending) break;
    if (monster.unbound === undefined || monster.unbound.furious) continue;
    const daemon = unitsById.get(monster.unitId);
    if (daemon === undefined || daemon.summoned === undefined) continue;
    const rampage = previewRampageV7(view, daemon.id);
    if (rampage === null || !rampage.unbound || rampage.furious) continue;
    const need = rampage.control - rampage.strands;
    if (need <= 0) continue;
    const candidates = candidatesFor(daemon);
    if (candidates.length < need) continue;
    const binders = candidates.slice(0, need);
    const first = order.length;
    for (const item of binders) assign(daemon, item, false, true);
    for (const assignment of order.slice(first)) {
      const command = stepOf(assignment);
      if (command === undefined) continue;
      bindPending = true;
      steps.push({
        command,
        priority: CULT_BIND_PRIORITY_V7,
        value: 0,
        reason: command.kind === "MOVE" ? "BIND_MOVE" : "BIND",
      });
      break;
    }
  }

  // ------------------------------------------------------------ Seize
  // Section 15.4: always, when legal, before an ordinary attack on that
  // unit; and the Move of a holder or of the Summoner that makes it legal
  // this turn (never a cultist the channel plan has claimed).
  const seized = new Set<UnitId>();
  const seizureMoves = new Map<UnitId, string>();
  {
    let best: (typeof seizes)[number] | undefined;
    let bestKey: readonly number[] = [];
    for (const command of seizes) {
      const preview = previewSeizeV7(
        view,
        command.unitId,
        command.victimUnitId,
      );
      const key = [
        preview?.favour ?? 0,
        -command.victimUnitId,
        -command.unitId,
      ];
      seized.add(command.victimUnitId);
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
      }
    }
    if (best !== undefined)
      steps.push({
        command: best,
        priority: CULT_SEIZE_PRIORITY_V7,
        value: bestKey[0] ?? 0,
        reason: "SEIZE",
      });
    else {
      const seizers = summoners.filter(
        (unit) =>
          hasAbility(view, unit, "SEIZE") &&
          primaryReady(unit) &&
          !held.has(unit.id),
      );
      const holders = own.filter(
        (unit) => cultRobedV7(view, unit) && !held.has(unit.id),
      );
      const beside = (unit: PublicUnitV7, victim: PublicUnitV7): OptionV7[] => {
        const options: OptionV7[] = [];
        if (gap(unit.at, victim.at) === 1)
          options.push({ at: unit.at, move: null });
        else if (!onOwnCenter(unit))
          for (const move of movesByUnit.get(unit.id) ?? []) {
            const end = move.path.at(-1);
            if (end !== undefined && gap(end, victim.at) === 1 && landTile(end))
              options.push({ at: end, move });
          }
        return options;
      };
      let setup:
        | {
            readonly move: MoveV7;
            readonly reason: CultStepReasonV7;
            readonly key: readonly number[];
            readonly victimUnitId: UnitId;
            readonly moves: readonly (readonly [UnitId, string])[];
          }
        | undefined;
      for (const victim of enemies) {
        // Broken, or perhaps a frog at half its Hit Points: the preview on
        // the projected board decides.
        if (
          victim.form !== "LAND" ||
          (victim.hp > 5 && victim.hp * 2 > victim.maxHp)
        )
          continue;
        for (const summoner of seizers) {
          const stand = beside(summoner, victim)[0];
          if (stand === undefined) continue;
          // The holder: one that stands beside the victim, else the first
          // that can step there (not onto the Summoner's tile).
          let holder: { unit: PublicUnitV7; option: OptionV7 } | undefined;
          for (const unit of holders) {
            if (unit.id === summoner.id) continue;
            const option = beside(unit, victim).find(
              (candidate) => !sameTile(candidate.at, stand.at),
            );
            if (option === undefined) continue;
            if (
              holder === undefined ||
              (option.move === null && holder.option.move !== null)
            )
              holder = { unit, option };
          }
          if (holder === undefined) continue;
          // The holder steps first; then the Summoner.
          const move = holder.option.move ?? stand.move;
          if (move === null) continue;
          const projected = tools.moved([
            { unit: summoner, at: stand.at },
            { unit: holder.unit, at: holder.option.at },
          ]);
          const preview = previewSeizeV7(projected, summoner.id, victim.id);
          if (preview === null) continue;
          const key = [preview.favour, -victim.id, -summoner.id];
          if (setup !== undefined && !better(key, setup.key)) continue;
          setup = {
            move,
            reason:
              holder.option.move !== null ? "SEIZE_HOLDER" : "SEIZE_SUMMONER",
            key,
            victimUnitId: victim.id,
            moves: [
              ...(holder.option.move !== null
                ? [[holder.unit.id, cultTileKeyV7(holder.option.at)] as const]
                : []),
              ...(stand.move !== null
                ? [[summoner.id, cultTileKeyV7(stand.at)] as const]
                : []),
            ],
          };
        }
      }
      if (setup !== undefined) {
        seized.add(setup.victimUnitId);
        for (const [unitId, tile] of setup.moves)
          seizureMoves.set(unitId, tile);
        steps.push({
          command: setup.move,
          priority: CULT_SEIZE_PRIORITY_V7,
          value: setup.key[0] ?? 0,
          reason: setup.reason,
        });
      }
    }
  }

  const pending = channelPending || bindPending;

  // ------------------------------------------- where a daemon may end
  /**
   * Its holders and the free cultists near `at` can hold it there. Only a
   * cultist the next plan can give it counts (`candidatesFor`):
   * `pulp_wars-mch9.50` found two that the plan counted here but could not
   * send after the daemon had moved, so a Gibbering Mass could step off its
   * Doorstep and break loose: one kept for the Herald's Hunger, and a
   * center's garrison beyond its Channel reach of the center (a garrison
   * channels from its center or not at all).
   */
  const channelHolds = (
    daemon: DaemonWorkV7,
    at: CoordV7,
    need: number,
  ): boolean => {
    const holders = holdersOf(daemon.unit.id);
    if (holders.some((unit) => gap(unit.at, at) > CULT_CHANNEL_RANGE_V7))
      return false;
    const near = free.filter(
      (unit) =>
        !keep.has(unit.id) &&
        (assigned.get(unit.id)?.daemon.id ?? daemon.unit.id) ===
          daemon.unit.id &&
        gap(unit.at, at) <=
          (unit.activation.moved || onOwnCenter(unit)
            ? CULT_CHANNEL_RANGE_V7
            : CULT_DAEMON_LEASH_V7),
    ).length;
    return daemon.strands + near >= need;
  };
  /**
   * Where an own bound daemon may end a Move (`advance`: its advance after a
   * kill): where its channellers can follow it. The Cult redesign's A-R3
   * (`pulp_wars-mch9.40`, section 12.2): a Gibbering Mass also anywhere on
   * its Doorstep (and one an Idol Bearer steps beside waits for it); an Imp
   * a Brood holds beside a lead whose Brood holds it, or where a cultist can
   * follow it; a lead Imp keeps the Imps of its Brood that have moved beside
   * it; a kill may break a Brood.
   */
  const daemonMayEndAs = (
    daemonUnitId: UnitId,
    at: CoordV7,
    advance: boolean,
  ): boolean => {
    const daemon = workById.get(daemonUnitId);
    if (daemon === undefined) return true;
    if (!daemon.holdable) {
      // Its one Move is the plan's (back to its cultists, or released).
      const release = releaseTiles.get(daemonUnitId);
      return release === undefined || release === cultTileKeyV7(at);
    }
    if (daemon.unit.summoned === "MASS") {
      const pin = pinned.get(daemonUnitId);
      if (pin !== undefined)
        return (
          gap(pin, at) === 1 || ownCenters.some((city) => gap(city.at, at) <= 1)
        );
      return (
        doorstepAt(daemonUnitId, at) ||
        channelHolds(daemon, at, Math.max(daemon.wanted, daemon.control))
      );
    }
    if (daemon.unit.summoned === "IMP") {
      if (daemon.lead !== null)
        return (
          advance ||
          broodAt(daemonUnitId, at) ||
          channelHolds(daemon, at, daemon.control)
        );
      const followers = work.filter(
        (follower) => follower.lead === daemonUnitId,
      );
      if (
        !advance &&
        followers.some(
          (follower) =>
            (follower.unit.activation.moved ||
              follower.unit.activation.attacked) &&
            gap(follower.unit.at, at) !== 1,
        )
      )
        return false;
      if (followers.length === 0 && broodAt(daemonUnitId, at)) return true;
    }
    return channelHolds(daemon, at, daemon.wanted);
  };
  const daemonMayEnd = (daemonUnitId: UnitId, at: CoordV7): boolean =>
    daemonMayEndAs(daemonUnitId, at, false);

  // ------------------------------------------- the warden's placement
  // A-R1 (`pulp_wars-mch9.38`, section 12.2; it replaces the Behold! step):
  // a free Idol Bearer whose idol stands ends its Move on the tile beside
  // the most own casters a visible enemy can attack next turn (the
  // channellers on their tiles, the circle of an own ritual, and the
  // Summoners, Hexers, and Stargazers), counting none another standing idol
  // covers already, and between them and the enemy: the shield wall halves
  // the shots on them and Awestruck binds the enemies beside it to the
  // bearer. It moves only to a tile that covers more than its own, and
  // ends no Move on a tile that covers fewer (but an own center). The
  // garrison rule comes first: a bearer on an own center, or within 2 of an
  // empty own center a hostile unit within 6 watches, is left to it.
  const wardens = new Map<UnitId, (at: CoordV7) => boolean>();
  {
    const ritualUnits = new Set<UnitId>();
    for (const ritual of cult.rituals)
      if (ritual.playerId === me) {
        if (ritual.leaderUnitId !== null) ritualUnits.add(ritual.leaderUnitId);
        for (const unitId of ritual.chanterUnitIds) ritualUnits.add(unitId);
      }
    /** The casters to shield, each on the tile it holds this turn. */
    const wards = own.flatMap((unit) => {
      if (cultWardenV7(view, unit) || !cultRobedV7(view, unit)) return [];
      const at = assigned.get(unit.id)?.option.at ?? unit.at;
      return (assigned.has(unit.id) ||
        strandOf.has(unit.id) ||
        ritualUnits.has(unit.id) ||
        cultBackRowV7(view, unit)) &&
        tools.threatened(at)
        ? [{ id: unit.id, at }]
        : [];
    });
    const watchedCenters = ownCenters.filter(
      (city) =>
        enemyGap(city.at) <= ARMY_GARRISON_RADIUS_V7 &&
        !view.units.some((unit) => unit.hp > 0 && sameTile(unit.at, city.at)),
    );
    let best: { move: MoveV7; key: readonly number[] } | undefined;
    for (const bearer of standing) {
      if (
        held.has(bearer.id) ||
        strandOf.has(bearer.id) ||
        ritualUnits.has(bearer.id) ||
        onOwnCenter(bearer) ||
        watchedCenters.some(
          (city) => gap(city.at, bearer.at) <= ARMY_GARRISON_FILL_REACH_V7,
        )
      )
        continue;
      // The casters no other standing idol covers.
      const open = wards.filter(
        (ward) =>
          !standing.some(
            (other) => other.id !== bearer.id && gap(other.at, ward.at) === 1,
          ),
      );
      const cover = (at: CoordV7): number =>
        open.filter((ward) => ward.id !== bearer.id && gap(ward.at, at) === 1)
          .length;
      const here = cover(bearer.at);
      if (here > 0)
        wardens.set(
          bearer.id,
          (at) =>
            cover(at) >= here ||
            ownCenters.some((city) => sameTile(city.at, at)),
        );
      if (bearer.activation.moved) continue;
      for (const move of movesByUnit.get(bearer.id) ?? []) {
        const end = move.path.at(-1);
        const keeps = keepers.get(bearer.id);
        if (
          end === undefined ||
          !landTile(end) ||
          tools.danger(bearer, end) >= bearer.hp ||
          // A-R3: an Idol Bearer that holds a Mass stays beside it.
          (keeps !== undefined && gap(keeps, end) !== 1)
        )
          continue;
        const count = cover(end);
        if (count <= here) continue;
        const key = [
          count,
          -enemyGap(end),
          -move.path.length,
          -bearer.id,
          -end.y,
          -end.x,
        ];
        if (best === undefined || better(key, best.key)) best = { move, key };
      }
    }
    if (best !== undefined) {
      const chosen = best.move;
      const covered = best.key[0] ?? 0;
      steps.push({
        command: chosen,
        priority: CULT_WARDEN_PRIORITY_V7,
        value: covered,
        reason: "WARDEN",
      });
      const end = chosen.path.at(-1);
      if (end !== undefined)
        wardens.set(
          chosen.unitId,
          (at) =>
            sameTile(at, end) ||
            ownCenters.some((city) => sameTile(city.at, at)),
        );
    }
  }

  // ------------------------------------------- the rituals and tricks
  // Bead A3 (`pulp_wars-mch9.11`, `src/ai/v7-cult-rituals.ts`): from the
  // cultists the channel plan and the Seizure have left.
  const rituals = cultRitualPlanV7({
    view,
    commands,
    hostile: tools.hostile,
    danger: tools.danger,
    dangerWithout: tools.dangerWithout,
    threatened: tools.threatened,
    reach: tools.reach,
    moved: tools.moved,
    own,
    enemies,
    held,
    seized,
    movesByUnit,
    channellers: new Set(strandOf.keys()),
    pending,
    bodies,
    wantedAll,
    favour,
    hunger,
    stars,
    daemons: work.map((daemon) => ({
      unit: daemon.unit,
      herald: daemon.unit.summoned === "HERALD",
      holdable: daemon.holdable,
    })),
    daemonMayEnd,
    landTile,
    onOwnCenter,
    enemyGap,
  });
  steps.push(...rituals.steps);

  // A Thing that grips stays beside its cultist (the strand counts three
  // only while it does: section 8.4).
  const gripTiles = new Map<UnitId, CoordV7>();
  for (const grip of cult.grips) {
    const thing = unitsById.get(grip.thingUnitId);
    const cultist = unitsById.get(grip.cultistUnitId);
    if (thing?.ownerId === me && cultist !== undefined)
      gripTiles.set(thing.id, cultist.at);
  }
  /** Where the own unit may end a Move (`advance`: its advance after a kill). */
  const mayEndAs = (unitId: UnitId, at: CoordV7, advance: boolean): boolean => {
    // Bead A3: no own unit ends a Move under an own ritual's mark.
    if (!rituals.mayEnd(at)) return false;
    const cultist = gripTiles.get(unitId);
    if (cultist !== undefined) return gap(cultist, at) === 1;
    // A-R1: a warden ends no Move where it covers fewer casters.
    const ward = wardens.get(unitId);
    if (ward !== undefined && !ward(at)) return false;
    // A-R3: an Idol Bearer that holds a Mass by its Doorstep stays by it.
    const mass = keepers.get(unitId);
    if (mass !== undefined && gap(mass, at) !== 1) return false;
    return !ownDaemonIds.has(unitId) || daemonMayEndAs(unitId, at, advance);
  };

  // ----------------------------------------------------------- Summon
  // Section 15.3: only what the seat can hold: a robed cultist to spare for
  // every daemon's Control + 1 afterwards, an enemy near enough to send it
  // at, and never beside an enemy where the Summoner or its helper would be
  // its nearest unit if it broke. Bead A3: and not with the Favour the seat
  // keeps for the Great Summoning (`cultSavingV7`). A-R1 (section 12.2):
  // never from the Favour its Herald's Hunger needs, and at
  // `CULT_CAP_SPEND_FAVOUR_V7` or more with no enemy near too (Favour above
  // the cap is lost). A-R3 (`pulp_wars-mch9.40`): the Imp, the Horror, or
  // the Gibbering Mass, by `summonKey` (the class first, then the tile).
  if (!pending) {
    let best: (typeof summons)[number] | undefined;
    let bestKey: readonly number[] = [];
    for (const command of summons) {
      const key = summonKey(command, true);
      if (key === null) continue;
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
      }
    }
    if (best !== undefined)
      steps.push({
        command: best,
        priority: CULT_SUMMON_PRIORITY_V7,
        value: 0,
        reason: "SUMMON",
      });
  }

  // ------------------------------------------------------------ Swarm
  // A-R3 (`pulp_wars-mch9.40`, section 12.3): an Imp attacks a unit with
  // another own Imp already beside it before one with none (the unanswered
  // attack: the defender does not strike back, `SWARMED`), and the second
  // Imp's Move goes beside the target first. Never on a unit kept for a
  // Seizure, and a kill's advance only where the plan lets the Imp end it.
  {
    const holdableImps = work.filter(
      (daemon) =>
        daemon.holdable &&
        daemon.unit.summoned === "IMP" &&
        !held.has(daemon.unit.id),
    );
    let attack: { command: CommandV7; key: readonly number[] } | undefined;
    for (const daemon of holdableImps)
      for (const command of attacksByUnit.get(daemon.unit.id) ?? []) {
        const target = unitsById.get(command.targetUnitId);
        if (target === undefined || seized.has(target.id)) continue;
        const preview = queryCombatPreviewV7(view, daemon.unit.id, target.id);
        if (preview?.noRetaliationReason !== "SWARMED") continue;
        if (
          preview.defenderDies &&
          preview.advances &&
          !mayEndAs(daemon.unit.id, target.at, true)
        )
          continue;
        const key = [
          Number(preview.defenderDies),
          unitRoleRuleV7(view, target).cost ?? CULT_SWARM_PRICELESS_V7,
          preview.damageToDefender,
          -target.id,
          -daemon.unit.id,
        ];
        if (attack === undefined || better(key, attack.key))
          attack = { command, key };
      }
    if (attack !== undefined)
      steps.push({
        command: attack.command,
        priority: CULT_SWARM_PRIORITY_V7,
        value: attack.key[0] ?? 0,
        reason: "SWARM",
      });
    let approach: { command: CommandV7; key: readonly number[] } | undefined;
    const landEnemies = enemies.filter((unit) => unit.form === "LAND");
    for (const daemon of holdableImps) {
      const imp = daemon.unit;
      if (imp.activation.moved || !primaryReady(imp)) continue;
      for (const target of landEnemies) {
        if (
          seized.has(target.id) ||
          gap(imp.at, target.at) === 1 ||
          !ownImps.some(
            (other) => other.id !== imp.id && gap(other.at, target.at) === 1,
          )
        )
          continue;
        for (const move of movesByUnit.get(imp.id) ?? []) {
          const end = move.path.at(-1);
          if (
            end === undefined ||
            gap(end, target.at) !== 1 ||
            !landTile(end) ||
            !mayEndAs(imp.id, end, false)
          )
            continue;
          const key = [
            unitRoleRuleV7(view, target).cost ?? CULT_SWARM_PRICELESS_V7,
            -target.hp,
            -move.path.length,
            -target.id,
            -imp.id,
            -end.y,
            -end.x,
          ];
          if (approach === undefined || better(key, approach.key))
            approach = { command: move, key };
        }
      }
    }
    if (approach !== undefined)
      steps.push({
        command: approach.command,
        priority: CULT_SWARM_MOVE_PRIORITY_V7,
        value: 0,
        reason: "SWARM_MOVE",
      });
  }

  /**
   * Favour is short of the next threshold the seat can spend it at: it has
   * a Summoner, and the bodies to hold one more Horror. A-R1 (section
   * 12.2): the thresholds are the prices beyond the Hunger the seat keeps
   * (a Horror's 4, the Great Summoning's 18 with The Stars Are Right).
   * A-R3 (`pulp_wars-mch9.40`): the bodies to hold one more Imp (its one
   * strand), the cheapest summon the seat makes.
   */
  const short =
    summoners.length > 0 &&
    bodies >= wantedAll + 1 &&
    (favour < CULT_HORROR_FAVOUR_V7 + hunger ||
      (stars && favour < CULT_SUMMONING_FAVOUR_V7 + hunger));

  // -------------------------------------------------------- Sacrifice
  // Section 15.4 (b): an Initiate beyond the wanted channellers and two,
  // when its value brings Favour to a Horror's price or (with The Stars Are
  // Right) the Great Summoning's, beyond the Hunger kept (A-R1).
  if (!pending && short && bodies > wantedAll + CULT_SPARE_BODIES_V7) {
    let best: (typeof sacrifices)[number] | undefined;
    let bestKey: readonly number[] = [];
    for (const command of sacrifices) {
      const summoner = unitsById.get(command.unitId);
      const victim = unitsById.get(command.victimUnitId);
      if (
        summoner === undefined ||
        victim === undefined ||
        held.has(summoner.id) ||
        held.has(victim.id) ||
        // (A-R3: a Summoner a Seizure may need keeps its action for it.)
        seizing.has(summoner.id) ||
        !cultInitiateV7(view, victim) ||
        strandOf.has(victim.id) ||
        lastDefender(victim)
      )
        continue;
      const preview = previewSacrificeV7(view, summoner.id, victim.id);
      if (preview === null) continue;
      const reaches = (threshold: number): boolean =>
        favour < threshold && preview.favourAfter >= threshold;
      // A-R3: the Imp's 2 is a threshold too, but a Summoner with a
      // Tentacle that slaps an enemy calls it instead (the Imp's Favour can
      // wait for the trickle; the Horror's and the Herald's cannot).
      const forImp =
        reaches(CULT_IMP_FAVOUR_V7 + hunger) &&
        !tentacles.some(
          (item) => item.unitId === summoner.id && tentacleWorth(item.at),
        );
      if (
        !forImp &&
        !reaches(CULT_HORROR_FAVOUR_V7 + hunger) &&
        !(stars && reaches(CULT_SUMMONING_FAVOUR_V7 + hunger))
      )
        continue;
      const key = [-victim.hp, -victim.id, -summoner.id];
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
      }
    }
    if (best !== undefined)
      steps.push({
        command: best,
        priority: CULT_SACRIFICE_PRIORITY_V7,
        value: 0,
        reason: "SACRIFICE_SPARE",
      });
  }
  // A-R1 (section 12.2): the Sacrifice that feeds the Herald's Hunger.
  steps.push(...feedSteps);
  // A-R3: an Idol Bearer's step beside a Gibbering Mass (its Doorstep).
  steps.push(...doorstepSteps);

  // Section 15.4 (a): an own unit that the visible enemy kills this round
  // and that cannot retreat, after everything else it can do this turn. Its
  // Summoner keeps its action for it.
  {
    let best: (typeof sacrifices)[number] | undefined;
    let bestKey: readonly number[] = [];
    for (const command of sacrifices) {
      const summoner = unitsById.get(command.unitId);
      const victim = unitsById.get(command.victimUnitId);
      if (
        summoner === undefined ||
        victim === undefined ||
        held.has(summoner.id) ||
        held.has(victim.id) ||
        strandOf.has(victim.id) ||
        lastDefender(victim) ||
        tools.danger(victim, victim.at) < victim.hp
      )
        continue;
      const retreats = (movesByUnit.get(victim.id) ?? []).some((move) => {
        const end = move.path.at(-1);
        return end !== undefined && tools.danger(victim, end) < victim.hp;
      });
      if (retreats) continue;
      const preview = previewSacrificeV7(view, summoner.id, victim.id);
      if (preview === null) continue;
      const key = [preview.favour, -victim.id, -summoner.id];
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
      }
    }
    if (best !== undefined) {
      steps.push({
        command: best,
        priority: CULT_DOOMED_PRIORITY_V7,
        value: bestKey[0] ?? 0,
        reason: "SACRIFICE_DOOMED",
      });
      held.add(best.unitId);
    }
  }

  // The Summoner's Tentacle (A-R1, section 12.3): a Summoner calls one only
  // when it has no Summon, Seizure, or Sacrifice step (each is its action;
  // the doomed unit's Sacrifice is made last of all, so its Summoner keeps
  // its action for it). The rituals named the Tentacle before these steps
  // were known; it is taken back here.
  {
    const busy = new Set<UnitId>();
    for (const step of steps)
      if (
        step.command.kind === "SUMMON" ||
        step.command.kind === "SEIZE" ||
        step.command.kind === "SACRIFICE"
      )
        busy.add(step.command.unitId);
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const step = steps[index];
      if (step?.command.kind === "TENTACLE" && busy.has(step.command.unitId))
        steps.splice(index, 1);
    }
  }

  // --------------------------------------------------------- Offering
  // Section 15.4: a city at its unit limit or with nothing to train, when
  // Favour is short of the next threshold and no enemy is within 3.
  // `pulp_wars-mch9.27` (section 15.10): paced, at most one a round
  // (`cultOfferingDueV7`). A lodge whose three cities started at their unit
  // limit offered in each of them every turn and began the Great Summoning
  // in round 2 from 9 Favour. A-R1 (section 12.2): also to feed the
  // Herald's Hunger, and never past the cap (`offeringOk`).
  if (short || hungry)
    for (const command of offerings) {
      if (!offeringOk(command)) continue;
      steps.push({
        command,
        priority: CULT_OFFERING_PRIORITY_V7,
        value: -command.cityId,
        reason: "OFFERING",
      });
    }

  const leashed = new Set<UnitId>(gripTiles.keys());
  for (const daemon of work) if (daemon.holdable) leashed.add(daemon.unit.id);

  return {
    steps,
    held,
    seized,
    seizureMoves,
    leashed,
    daemons: work.map((daemon) => ({
      unitId: daemon.unit.id,
      holdable: daemon.holdable,
      wanted: daemon.wanted,
      strands: daemon.strands,
      channellerUnitIds: daemon.channellers,
    })),
    mayEnd: (unitId, at) => mayEndAs(unitId, at, false),
    mayAdvance: (unitId, at) => mayEndAs(unitId, at, true),
    mayAttack: rituals.mayAttack,
  };
}

/**
 * An Offering is made once in this many rounds at most, on average: the
 * seat's Offerings so far (its cities' offered population, 2 each) stay
 * below the rounds played divided by this (`pulp_wars-mch9.27`, section
 * 15.10).
 */
export const CULT_OFFERING_PACE_ROUNDS_V7 = 2;

/**
 * Whether the Offering of the own city `cityId` is due this round
 * (`pulp_wars-mch9.27`, RULESET_7_CULTISTS.md section 15.10). The policy
 * remembers nothing between decisions, so the pace is read from the board:
 *
 * - **One a round.** Only the city whose turn it is offers: the seat's
 *   cities by ID, the round modulo their number. The others wait for their
 *   round, so a lodge whose cities all stand at their unit limit offers in
 *   one of them, not in each.
 * - **One every other round.** The seat's Offerings so far (the population
 *   its cities gave up, `offeredPopulation`, 2 an Offering) times
 *   `CULT_OFFERING_PACE_ROUNDS_V7` stay below the round: in round 1 one, in
 *   round 3 the second, and so on, also for a seat that bought Harvest
 *   Rites late (its unused rounds give it no burst: still one a round).
 *
 * From 9 Favour with The Stars Are Right (the case that summoned the Herald
 * in round 2) the Offerings alone reach 20 in round 7.
 */
export function cultOfferingDueV7(view: PlayerViewV7, cityId: CityId): boolean {
  const me = view.viewer.id;
  const cities = view.cities
    .filter((city) => city.ownerId === me)
    .sort((left, right) => left.id - right.id);
  if (cities.length === 0) return false;
  if (cities[view.round % cities.length]?.id !== cityId) return false;
  const offered = cities.reduce(
    (sum, city) => sum + Math.floor((city.offeredPopulation ?? 0) / 2),
    0,
  );
  return offered * CULT_OFFERING_PACE_ROUNDS_V7 < view.round;
}

/** The step of the plan that is `command` (the same command, by content). */
export function cultStepForV7(
  plan: CultPlanV7,
  command: CommandV7,
): CultStepV7 | undefined {
  let text: string | undefined;
  return plan.steps.find((step) => {
    if (step.command === command) return true;
    if (step.command.kind !== command.kind) return false;
    text ??= JSON.stringify(command);
    return JSON.stringify(step.command) === text;
  });
}
