/**
 * Tile actions (bead pulp_wars-2yc.60; docs/ui/BOARD_TARGETING.md section
 * 1.1): with a unit selected and nothing armed, every tile where one of its
 * targeted commands is offered carries a small icon for that action, so the
 * player can act from the board without first pressing the ability's
 * button. A tile with several actions (a Move and a Tentacle, an Attack and
 * a Ribbit) opens a small chooser on the tile. The dock's buttons stay as
 * they are: arming one still narrows the board to that ability.
 *
 * This module plans which actions stand on which tile. It reads no rule:
 * every action is an offered command of the engine's public query, and an
 * aimed ability's tiles are exactly the targets its armed board pick shows
 * (`boardMapTargetsV7` with the ability's first pick), so a tap on its icon
 * arms the ability and picks that tile, as the dock button and a board tap
 * would. It names no tile and no coordinate to the player.
 */
import type {
  CommandV7,
  CoordV7,
  PlayerViewV7,
  UnitId,
} from "../../engine/index";
import type { UiIconIdV7 } from "../dom/ui-icons-v7";
import {
  boardMapTargetsV7,
  type BoardRenderInteractionV7,
  type MapCommandTargetV7,
} from "./board-renderer-v7";
import {
  targetHighlightStyleV7,
  type TargetHighlightStyleV7,
} from "./target-highlight-v7";
import { summonHelpersV7 } from "./cult-channel-board-plan-v7";
import { tossPassengersV7 } from "./giant-board-plan-v7";
import { tunnelRidersV7 } from "../dwarf-tunnel-v7";
import { freezesRingV7 } from "../frozen-sea-presentation-v7";
import {
  BEAM_DOWN_LABEL_V7,
  MIND_CONTROL_LABEL_V7,
  TRACTOR_BEAM_LABEL_V7,
} from "../martian-presentation-v7";
import {
  BOLAS_LABEL_V7,
  FROST_BOLT_LABEL_V7,
  STAMPEDE_LABEL_V7,
} from "../ice-folk-presentation-v7";
import { FREEZE_LABEL_V7 } from "../frozen-sea-presentation-v7";
import {
  ASSEMBLE_LABEL_V7,
  BARRICADE_LABEL_V7,
  BOMB_RUN_LABEL_V7,
  TUNNEL_LABEL_V7,
} from "../dwarf-presentation-v7";
import {
  REBAKE_LABEL_V7,
  SUGAR_RUSH_LABEL_V7,
  SUGAR_TOSS_LABEL_V7,
  TOP_UP_LABEL_V7,
} from "../candy-presentation-v7";
import {
  BREAK_OFF_LABEL_V7,
  SWALLOW_LABEL_V7,
  TOSS_LABEL_V7,
} from "../giant-presentation-v7";
import { BOARD_LABEL_V7 } from "../naval-presentation-v7";
import { SACRIFICE_LABEL_V7, SEIZE_LABEL_V7 } from "../cult-presentation-v7";
import {
  ANCHOR_BUTTON_LABEL_V7,
  CHANNEL_LABEL_V7,
  SUMMON_BUTTON_LABEL_V7,
} from "../cult-channel-presentation-v7";
import {
  GREAT_SUMMONING_LABEL_V7,
  PROCLAIM_LABEL_V7,
  RIBBIT_LABEL_V7,
  STARFALL_LABEL_V7,
  SWITCHEROO_LABEL_V7,
  TENTACLE_LABEL_V7,
  JOIN_CHANT_LABEL_V7,
} from "../cult-ritual-presentation-v7";

type FamilyV7 = MapCommandTargetV7["family"];

/**
 * How the interface offers each command kind (the audit of the rule): a
 * target the selected unit shows unarmed (`BOARD`), an ability whose tile
 * is picked on the board once its button arms it (`AIMED`, which now also
 * shows its icon on each tile), an action of the unit on itself, its own
 * tile or a fixed area (`BAR_ONLY`: Fortify, Disband, Promote, a Kaboom!,
 * a Cold Snap, a Whirl, a Stomp ...), and a command of a city, a tile or
 * the player (`NOT_A_UNIT`). A new command kind fails the type check here
 * until it is classed.
 */
export const TILE_ACTION_COMMAND_CLASSES_V7: Readonly<
  Record<CommandV7["kind"], "BOARD" | "AIMED" | "BAR_ONLY" | "NOT_A_UNIT">
> = {
  MOVE: "BOARD",
  ATTACK: "BOARD",
  ATTACK_BARRICADE: "BOARD",
  DISEMBARK: "BOARD",
  HATCH: "BOARD",
  SUGAR_TOSS: "BOARD",
  TOP_UP: "BOARD",
  BOARD: "AIMED",
  BEAM_DOWN: "AIMED",
  MIND_CONTROL: "AIMED",
  TRACTOR_BEAM: "AIMED",
  THROW_BOLAS: "AIMED",
  FROST_BOLT: "AIMED",
  STAMPEDE: "AIMED",
  // A line role's Freeze is aimed; the Ice Witch's ring is not (bar only).
  FREEZE: "AIMED",
  TUNNEL: "AIMED",
  BOMB_RUN: "AIMED",
  ASSEMBLE: "AIMED",
  BUILD_BARRICADE: "AIMED",
  SUGAR_RUSH: "AIMED",
  REBAKE: "AIMED",
  SWALLOW: "AIMED",
  TOSS: "AIMED",
  BREAK_OFF: "AIMED",
  SACRIFICE: "AIMED",
  SEIZE: "AIMED",
  SUMMON: "AIMED",
  CHANNEL: "AIMED",
  ANCHOR: "AIMED",
  BEGIN_RITUAL: "AIMED",
  PROCLAIM: "AIMED",
  RIBBIT: "AIMED",
  SWITCHEROO: "AIMED",
  TENTACLE: "AIMED",
  JOIN_CHANT: "AIMED",
  RALLY: "BAR_ONLY",
  TEND_WOUNDED: "BAR_ONLY",
  RAISE_DEAD: "BAR_ONLY",
  DEVOUR: "BAR_ONLY",
  RECOVER: "BAR_ONLY",
  CAPTURE: "BAR_ONLY",
  PROMOTE: "BAR_ONLY",
  PILLAGE: "BAR_ONLY",
  DISBAND: "BAR_ONLY",
  WAIT: "BAR_ONLY",
  BUILD_FIELD_DEFENSE: "BAR_ONLY",
  WAIL: "BAR_ONLY",
  TOSS_COIN: "BAR_ONLY",
  KABOOM: "BAR_ONLY",
  COLD_SNAP: "BAR_ONLY",
  WHIRL: "BAR_ONLY",
  STOMP: "BAR_ONLY",
  BEHOLD: "BAR_ONLY",
  BOO: "BAR_ONLY",
  END_TURN: "NOT_A_UNIT",
  OFFERING: "NOT_A_UNIT",
  LAY_EGG: "NOT_A_UNIT",
  LAND_GRANT: "NOT_A_UNIT",
  RESEARCH: "NOT_A_UNIT",
  BUILD_MONUMENT: "NOT_A_UNIT",
  TRAIN: "NOT_A_UNIT",
  TRAIN_NAVAL: "NOT_A_UNIT",
  HIRE: "NOT_A_UNIT",
  CHOOSE_CITY_REWARD: "NOT_A_UNIT",
  HARVEST_FRUIT: "NOT_A_UNIT",
  HUNT_GAME: "NOT_A_UNIT",
  HARVEST_FISH: "NOT_A_UNIT",
  GATHER_PEARLS: "NOT_A_UNIT",
  BUILD_FARM: "NOT_A_UNIT",
  BUILD_LUMBER_CAMP: "NOT_A_UNIT",
  BUILD_MINE: "NOT_A_UNIT",
  BUILD_WINDMILL: "NOT_A_UNIT",
  BUILD_SAWMILL: "NOT_A_UNIT",
  BUILD_FORGE: "NOT_A_UNIT",
  BUILD_WORKSHOP: "NOT_A_UNIT",
  BUILD_MARKET: "NOT_A_UNIT",
  BUILD_PORT: "NOT_A_UNIT",
  BUILD_SHIPYARD: "NOT_A_UNIT",
  CLEAR_FOREST: "NOT_A_UNIT",
  REPLANT_FOREST: "NOT_A_UNIT",
  CULTIVATE_FOREST: "NOT_A_UNIT",
  BLAST_MOUNTAIN: "NOT_A_UNIT",
  BUILD_ROAD: "NOT_A_UNIT",
  REDEVELOP: "NOT_A_UNIT",
};

/** What a tile action is called and drawn with. */
export interface TileActionLookV7 {
  /** The action's short name, as its dock button says it. */
  readonly label: string;
  /** Its glyph (the dock's own icon of the action). */
  readonly icon: UiIconIdV7;
}

/**
 * A targeted ability of a unit that the dock arms. `offered` says which
 * offered commands make it available, `pick` is the first pick its button
 * arms (the same as the dock's start of that aiming), and `families` the
 * target families of that pick that are the ability's tiles (a Tunnel's
 * Hammerer toggles are not).
 */
export interface TileAbilityV7 extends TileActionLookV7 {
  readonly id: string;
  /** The `data-action` of the ability's dock button. */
  readonly dockAction: string;
  readonly families: readonly FamilyV7[];
  readonly offered: (command: CommandV7, unitId: UnitId) => boolean;
  readonly pick: (
    unitId: UnitId,
    view: PlayerViewV7,
    commands: readonly CommandV7[],
  ) => Partial<BoardRenderInteractionV7>;
  /** False where the unit has the command but does not aim it. */
  readonly applies?: (view: PlayerViewV7, unitId: UnitId) => boolean;
  /**
   * Only tiles the unit could not reach or hit unarmed (a Sugar Rush
   * modifies a Move or an Attack the tile already offers).
   */
  readonly onlyBeyondBoard?: true;
  /**
   * A tap on its badge on another own unit does it at once, with no
   * chooser offering Select (a help that cannot be mistaken, as a Hatch:
   * the Cult redesign's join-the-chant icon on the Stargazer).
   */
  readonly oneTap?: true;
}

const kind =
  (...kinds: readonly CommandV7["kind"][]) =>
  (command: CommandV7, unitId: UnitId): boolean =>
    kinds.includes(command.kind) &&
    "unitId" in command &&
    command.unitId === unitId;

const ritual =
  (name: "STARFALL" | "GREAT_SUMMONING") =>
  (command: CommandV7, unitId: UnitId): boolean =>
    command.kind === "BEGIN_RITUAL" &&
    command.ritual === name &&
    command.unitId === unitId;

/**
 * Every aimed ability, in the order its icons and chooser rows are listed
 * after the unit's Move and Attack. The labels and icons are the dock's.
 */
export const TILE_ABILITIES_V7: readonly TileAbilityV7[] = [
  // The Martian revision.
  {
    id: "MIND_CONTROL",
    label: MIND_CONTROL_LABEL_V7,
    icon: "mind-control",
    dockAction: "martian-mind-control",
    families: ["MIND_CONTROL"],
    offered: kind("MIND_CONTROL"),
    pick: (unitId) => ({ martianPick: { kind: "MIND_CONTROL", unitId } }),
  },
  {
    id: "TRACTOR_BEAM",
    label: TRACTOR_BEAM_LABEL_V7,
    icon: "tractor-beam",
    dockAction: "martian-tractor-beam",
    families: ["TRACTOR_BEAM"],
    offered: kind("TRACTOR_BEAM"),
    pick: (unitId) => ({ martianPick: { kind: "TRACTOR_BEAM", unitId } }),
  },
  {
    id: "BEAM_DOWN",
    label: BEAM_DOWN_LABEL_V7,
    icon: "beam-down",
    dockAction: "martian-beam-down",
    families: ["BEAM_DOWN_PASSENGER", "BEAM_DOWN"],
    offered: kind("BEAM_DOWN"),
    pick: (unitId) => ({
      martianPick: { kind: "BEAM_DOWN", unitId, passengerUnitId: null },
    }),
  },
  // The Ice Folk.
  {
    id: "THROW_BOLAS",
    label: BOLAS_LABEL_V7,
    icon: "bolas",
    dockAction: "ice-folk-bolas",
    families: ["THROW_BOLAS"],
    offered: kind("THROW_BOLAS"),
    pick: (unitId) => ({ iceFolkPick: { kind: "THROW_BOLAS", unitId } }),
  },
  {
    id: "FROST_BOLT",
    label: FROST_BOLT_LABEL_V7,
    icon: "snowflake",
    dockAction: "ice-folk-frost-bolt",
    families: ["FROST_BOLT"],
    offered: kind("FROST_BOLT"),
    pick: (unitId) => ({ iceFolkPick: { kind: "FROST_BOLT", unitId } }),
  },
  {
    id: "STAMPEDE",
    label: STAMPEDE_LABEL_V7,
    icon: "stampede",
    dockAction: "ice-folk-stampede",
    families: ["STAMPEDE"],
    offered: kind("STAMPEDE"),
    pick: (unitId) => ({
      iceFolkPick: { kind: "STAMPEDE", unitId, chosen: null },
    }),
  },
  {
    id: "FREEZE",
    label: FREEZE_LABEL_V7,
    icon: "snowflake",
    dockAction: "freeze",
    families: ["FREEZE"],
    offered: kind("FREEZE"),
    pick: (unitId) => ({ freezePick: { kind: "FREEZE", unitId } }),
    // The Ice Witch's Freeze is her whole ring: cast by its button.
    applies: (view, unitId) => {
      const unit = view.units.find((candidate) => candidate.id === unitId);
      return unit !== undefined && !freezesRingV7(view, unit);
    },
  },
  // The Dwarves.
  {
    id: "TUNNEL",
    label: TUNNEL_LABEL_V7,
    icon: "drill",
    dockAction: "dwarf-tunnel",
    families: ["TUNNEL", "TUNNEL_DESTINATION"],
    offered: kind("TUNNEL"),
    pick: (unitId, view, commands) => ({
      dwarfPick: {
        kind: "TUNNEL",
        unitId,
        to: null,
        // The best Hammerer that can ride is seated at once, as the
        // dock's Tunnel does.
        riderUnitId: tunnelRidersV7(view, commands, unitId)[0]?.unitId ?? null,
        riderTo: null,
      },
    }),
  },
  {
    id: "BOMB_RUN",
    label: BOMB_RUN_LABEL_V7,
    icon: "bomb-run",
    dockAction: "dwarf-bomb-run",
    families: ["BOMB_TARGET"],
    offered: kind("BOMB_RUN"),
    pick: (unitId) => ({
      dwarfPick: { kind: "BOMB_RUN", unitId, targetUnitId: null },
    }),
  },
  {
    id: "ASSEMBLE",
    label: ASSEMBLE_LABEL_V7,
    icon: "key",
    dockAction: "dwarf-assemble",
    families: ["ASSEMBLE"],
    offered: kind("ASSEMBLE"),
    pick: (unitId) => ({ dwarfPick: { kind: "ASSEMBLE", unitId } }),
  },
  {
    id: "BUILD_BARRICADE",
    label: BARRICADE_LABEL_V7,
    icon: "barricade",
    dockAction: "dwarf-build-barricade",
    families: ["BARRICADE"],
    offered: kind("BUILD_BARRICADE"),
    pick: (unitId) => ({ dwarfPick: { kind: "BUILD_BARRICADE", unitId } }),
  },
  // The Candy faction.
  {
    id: "SUGAR_RUSH",
    label: SUGAR_RUSH_LABEL_V7,
    icon: "move",
    dockAction: "candy-sugar-rush",
    families: ["SUGAR_RUSH", "ATTACK"],
    offered: kind("SUGAR_RUSH"),
    pick: (unitId) => ({ candyPick: { kind: "SUGAR_RUSH", unitId } }),
    onlyBeyondBoard: true,
  },
  {
    id: "REBAKE",
    label: REBAKE_LABEL_V7,
    icon: "units",
    dockAction: "candy-rebake",
    families: ["REBAKE_CRUMBS", "REBAKE"],
    offered: kind("REBAKE"),
    pick: (unitId) => ({ candyPick: { kind: "REBAKE", unitId, from: null } }),
  },
  // The giants' signatures.
  {
    id: "SWALLOW",
    label: SWALLOW_LABEL_V7,
    icon: "devour",
    dockAction: "giant-swallow",
    families: ["SWALLOW"],
    offered: kind("SWALLOW"),
    pick: (unitId) => ({ giantPick: { kind: "SWALLOW", unitId } }),
  },
  {
    id: "TOSS",
    label: TOSS_LABEL_V7,
    icon: "goblin",
    dockAction: "giant-toss",
    families: ["TOSS_PASSENGER", "TOSS"],
    offered: kind("TOSS"),
    pick: (unitId, _view, commands) => {
      const passengers = tossPassengersV7(commands, unitId);
      return {
        giantPick: {
          kind: "TOSS",
          unitId,
          passengerUnitId:
            passengers.length === 1 ? (passengers[0] ?? null) : null,
        },
      };
    },
  },
  {
    id: "BREAK_OFF",
    label: BREAK_OFF_LABEL_V7,
    icon: "units",
    dockAction: "giant-break-off",
    families: ["BREAK_OFF_FIRST", "BREAK_OFF"],
    offered: kind("BREAK_OFF"),
    pick: (unitId) => ({
      giantPick: { kind: "BREAK_OFF", unitId, first: null },
    }),
  },
  // The naval branch.
  {
    id: "BOARD",
    label: BOARD_LABEL_V7,
    icon: "grapple",
    dockAction: "naval-board",
    families: ["BOARD"],
    offered: kind("BOARD"),
    pick: (unitId) => ({ navalPick: { kind: "BOARD", unitId } }),
  },
  // The Cultists: offerings, the channel, rites, hexes and tricks.
  {
    id: "SACRIFICE",
    label: SACRIFICE_LABEL_V7,
    icon: "candle",
    dockAction: "cult-sacrifice",
    families: ["SACRIFICE"],
    offered: kind("SACRIFICE"),
    pick: (unitId) => ({ cultPick: { kind: "SACRIFICE", unitId } }),
  },
  {
    id: "SEIZE",
    label: SEIZE_LABEL_V7,
    icon: "grapple",
    dockAction: "cult-seize",
    families: ["SEIZE"],
    offered: kind("SEIZE"),
    pick: (unitId) => ({ cultPick: { kind: "SEIZE", unitId } }),
  },
  {
    id: "SUMMON",
    label: SUMMON_BUTTON_LABEL_V7,
    icon: "summon",
    dockAction: "cult-summon",
    families: ["SUMMON_HELPER", "SUMMON"],
    offered: kind("SUMMON"),
    pick: (unitId, _view, commands) => {
      const helpers = summonHelpersV7(commands, unitId);
      return {
        cultPick: {
          kind: "SUMMON",
          unitId,
          helperUnitId: helpers.length === 1 ? (helpers[0] ?? null) : null,
        },
      };
    },
  },
  {
    id: "CHANNEL",
    label: CHANNEL_LABEL_V7,
    icon: "chain",
    dockAction: "cult-channel",
    families: ["CHANNEL"],
    offered: kind("CHANNEL"),
    pick: (unitId) => ({ cultPick: { kind: "CHANNEL", unitId } }),
  },
  {
    id: "ANCHOR",
    label: ANCHOR_BUTTON_LABEL_V7,
    icon: "tentacle",
    dockAction: "cult-anchor",
    families: ["ANCHOR"],
    offered: kind("ANCHOR"),
    pick: (unitId) => ({ cultPick: { kind: "ANCHOR", unitId } }),
  },
  {
    id: "STARFALL",
    label: STARFALL_LABEL_V7,
    icon: "comet",
    dockAction: "cult-starfall",
    families: ["STARFALL"],
    offered: ritual("STARFALL"),
    pick: (unitId) => ({
      cultPick: { kind: "STARFALL", unitId, chosen: null },
    }),
  },
  {
    id: "GREAT_SUMMONING",
    label: GREAT_SUMMONING_LABEL_V7,
    icon: "eye",
    dockAction: "cult-great-summoning",
    families: ["GREAT_SUMMONING"],
    offered: ritual("GREAT_SUMMONING"),
    pick: (unitId) => ({
      cultPick: { kind: "GREAT_SUMMONING", unitId, chosen: null },
    }),
  },
  {
    id: "PROCLAIM",
    label: PROCLAIM_LABEL_V7,
    icon: "megaphone",
    dockAction: "cult-proclaim",
    families: ["PROCLAIM"],
    offered: kind("PROCLAIM"),
    pick: (unitId) => ({ cultPick: { kind: "PROCLAIM", unitId } }),
  },
  {
    id: "RIBBIT",
    label: RIBBIT_LABEL_V7,
    icon: "frog",
    dockAction: "cult-ribbit",
    families: ["RIBBIT"],
    offered: kind("RIBBIT"),
    pick: (unitId) => ({ cultPick: { kind: "RIBBIT", unitId } }),
  },
  {
    id: "SWITCHEROO",
    label: SWITCHEROO_LABEL_V7,
    icon: "swap",
    dockAction: "cult-switcheroo",
    families: ["SWITCHEROO"],
    offered: kind("SWITCHEROO"),
    pick: (unitId) => ({ cultPick: { kind: "SWITCHEROO", unitId } }),
  },
  {
    id: "TENTACLE",
    label: TENTACLE_LABEL_V7,
    icon: "tentacle",
    dockAction: "cult-tentacle",
    families: ["TENTACLE"],
    offered: kind("TENTACLE"),
    pick: (unitId) => ({ cultPick: { kind: "TENTACLE", unitId } }),
  },
  // The Cult redesign (`pulp_wars-mch9.34`, RULESET_7_CULT_REDESIGN.md
  // sections 8.2 and 13): a cultist beside a Stargazer whose Star-fall is
  // pending carries the join badge (a candle, "+3") on that Stargazer, and
  // a tap joins (`oneTap`: no chooser with Select for it alone). The
  // badge's glyph is the dock's candle; the raster `ICON:ACTION:JOIN_CHANT`
  // is the dock button's.
  {
    id: "JOIN_CHANT",
    label: JOIN_CHANT_LABEL_V7,
    icon: "candle",
    dockAction: "cult-join-chant",
    families: ["JOIN_CHANT"],
    offered: kind("JOIN_CHANT"),
    pick: (unitId) => ({ cultPick: { kind: "JOIN_CHANT", unitId } }),
    oneTap: true,
  },
];

/**
 * The unarmed targets' looks, by family: the Move, the landings, the
 * Attack, and the own units a Shaman hatches or a Candy unit helps.
 */
export const TILE_BOARD_ACTIONS_V7: Readonly<
  Partial<Record<FamilyV7, TileActionLookV7 & { readonly id: string }>>
> = {
  MOVE: { id: "MOVE", label: "Move", icon: "move" },
  DISEMBARK: { id: "LAND", label: "Land", icon: "move" },
  LANDING_AFTER_MOVE: { id: "LAND", label: "Land", icon: "move" },
  ATTACK: { id: "ATTACK", label: "Attack", icon: "attack" },
  HATCH: { id: "HATCH", label: "Hatch", icon: "hatch" },
  SUGAR_TOSS: { id: "SUGAR_TOSS", label: SUGAR_TOSS_LABEL_V7, icon: "hp" },
  TOP_UP: { id: "TOP_UP", label: TOP_UP_LABEL_V7, icon: "hp" },
};

/** The actions a tile alone would not badge: a lone Move, Land or Attack. */
const PLAIN_ACTIONS_V7: ReadonlySet<string> = new Set([
  "MOVE",
  "LAND",
  "ATTACK",
]);

/** One action on one tile. */
export interface TileActionV7 extends TileActionLookV7 {
  /** `MOVE`, `ATTACK`, ... or the aimed ability's ID. */
  readonly id: string;
  /** The mark style its target wears when picked (the badge's rim). */
  readonly style: TargetHighlightStyleV7;
  /**
   * An unarmed action: the board target a tap sends today. Absent for an
   * aimed ability, which a tap arms and then picks this tile for.
   */
  readonly target?: MapCommandTargetV7;
  /** An aimed ability: its ID in TILE_ABILITIES_V7 (or a test's own). */
  readonly ability?: string;
  /** The ability's `oneTap`: no chooser on an own unit for it alone. */
  readonly oneTap?: true;
  /** The sentence the target's mark carries, for the cursor. */
  readonly semanticLabel?: string;
}

export interface TileActionTileV7 {
  readonly at: CoordV7;
  /** Move and Attack first, then the abilities in their table order. */
  readonly actions: readonly TileActionV7[];
  /**
   * A unit of the player's own (other than the selected one) stands here:
   * the chooser also offers to select it, since a tap on an own unit
   * otherwise selects it.
   */
  readonly ownUnit: boolean;
  /**
   * A unit or a city stands here: the badges keep to the tile's edge so
   * it stays visible; on an empty tile they stand in its middle.
   */
  readonly occupied: boolean;
  /**
   * A tap opens the chooser (more than one action, or an aimed ability's
   * badge on another own unit unless it is `oneTap`).
   */
  readonly chooser: boolean;
}

export interface TileActionPlanV7 {
  readonly unitId: number;
  /** The badged tiles, in reading order. */
  readonly tiles: readonly TileActionTileV7[];
  /** Many badged tiles: each badge is drawn smaller. */
  readonly compact: boolean;
}

/**
 * How many tiles may carry their badges at full size; past this the badges
 * shrink (TILE_ACTION_BADGE_V7) so a Stargazer's dozens of star tiles or a
 * Caller's Tentacle tiles do not bury the board.
 */
export const TILE_ACTION_FULL_SIZE_TILES_V7 = 8;

/** One ability with the targets its armed pick would show. */
export interface TileAbilityTargetsV7 {
  readonly ability: Pick<TileAbilityV7, "id" | "label" | "icon"> &
    Partial<Pick<TileAbilityV7, "onlyBeyondBoard" | "oneTap">>;
  readonly targets: readonly MapCommandTargetV7[];
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/**
 * The pure planner: the selected unit's unarmed board targets and each
 * offered aimed ability's targets, into the actions of each tile. A tile
 * is listed when it has any action other than one plain Move, Land or
 * Attack (those keep their mark alone and their one-tap pick). The
 * selected unit's own tile is never listed: a tap there goes on selecting.
 */
export function planTileActionsV7(input: {
  readonly unitId: number;
  readonly selectedAt: CoordV7;
  readonly boardTargets: readonly MapCommandTargetV7[];
  readonly abilities: readonly TileAbilityTargetsV7[];
  readonly ownUnitAt: (at: CoordV7) => boolean;
  /** Any unit or city on the tile (an own unit counts without it). */
  readonly occupiedAt?: (at: CoordV7) => boolean;
}): TileActionPlanV7 {
  const tiles = new Map<string, { at: CoordV7; actions: TileActionV7[] }>();
  const add = (at: CoordV7, action: TileActionV7): void => {
    if (at.x === input.selectedAt.x && at.y === input.selectedAt.y) return;
    const entry = tiles.get(key(at)) ?? { at, actions: [] };
    if (entry.actions.some((existing) => existing.id === action.id)) return;
    entry.actions.push(action);
    tiles.set(key(at), entry);
  };
  const boardKeys = new Set<string>();
  for (const target of input.boardTargets) {
    const look = TILE_BOARD_ACTIONS_V7[target.family];
    if (look === undefined) continue;
    boardKeys.add(key(target.at));
    add(target.at, {
      id: look.id,
      label: look.label,
      icon: look.icon,
      style: targetHighlightStyleV7(target.family, target.highlight),
      target,
      ...(target.semanticLabel === undefined
        ? {}
        : { semanticLabel: target.semanticLabel }),
    });
  }
  for (const { ability, targets } of input.abilities)
    for (const target of targets) {
      if (ability.onlyBeyondBoard === true && boardKeys.has(key(target.at)))
        continue;
      add(target.at, {
        id: ability.id,
        label: ability.label,
        icon: ability.icon,
        style: targetHighlightStyleV7(target.family, target.highlight),
        ability: ability.id,
        ...(ability.oneTap === true ? { oneTap: true as const } : {}),
        ...(target.semanticLabel === undefined
          ? {}
          : { semanticLabel: target.semanticLabel }),
      });
    }
  const listed: TileActionTileV7[] = [];
  for (const { at, actions } of tiles.values()) {
    const only = actions.length === 1 ? actions[0] : undefined;
    if (only !== undefined && PLAIN_ACTIONS_V7.has(only.id)) continue;
    const ownUnit = input.ownUnitAt(at);
    listed.push({
      at,
      actions,
      ownUnit,
      occupied: ownUnit || (input.occupiedAt?.(at) ?? false),
      chooser:
        actions.length > 1 ||
        (ownUnit &&
          actions.some(
            (action) => action.ability !== undefined && action.oneTap !== true,
          )),
    });
  }
  listed.sort(
    (left, right) => left.at.y - right.at.y || left.at.x - right.at.x,
  );
  return {
    unitId: input.unitId,
    tiles: listed,
    compact: listed.length > TILE_ACTION_FULL_SIZE_TILES_V7,
  };
}

/**
 * The tile actions of the viewer's selected unit, with nothing armed:
 * its unarmed targets and, for each aimed ability with an offered command,
 * the tiles its armed pick would show. Null for a unit that is not the
 * viewer's or has no badged tile.
 */
export function tileActionPlanForSelectionV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  unitId: number,
): TileActionPlanV7 | null {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined || unit.ownerId !== view.viewer.id) return null;
  const base: BoardRenderInteractionV7 = {
    selection: { kind: "UNIT", unitId: unit.id },
    selectedUnitId: unit.id,
    selectedAchievement: null,
  };
  const abilities: TileAbilityTargetsV7[] = [];
  for (const ability of TILE_ABILITIES_V7) {
    if (!commands.some((command) => ability.offered(command, unit.id)))
      continue;
    if (ability.applies !== undefined && !ability.applies(view, unit.id))
      continue;
    const targets = boardMapTargetsV7(view, commands, {
      ...base,
      ...ability.pick(unit.id, view, commands),
    }).filter((target) => ability.families.includes(target.family));
    if (targets.length > 0) abilities.push({ ability, targets });
  }
  const plan = planTileActionsV7({
    unitId: unit.id,
    selectedAt: unit.at,
    boardTargets: boardMapTargetsV7(view, commands, base),
    abilities,
    ownUnitAt: (at) =>
      view.units.some(
        (candidate) =>
          candidate.id !== unit.id &&
          candidate.ownerId === view.viewer.id &&
          candidate.at.x === at.x &&
          candidate.at.y === at.y,
      ),
    occupiedAt: (at) =>
      view.units.some(
        (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
      ) || view.cities.some((city) => city.at.x === at.x && city.at.y === at.y),
  });
  return plan.tiles.length === 0 ? null : plan;
}

/** The ability of a tile action's ID (undefined for a board action). */
export function tileAbilityV7(id: string): TileAbilityV7 | undefined {
  return TILE_ABILITIES_V7.find((ability) => ability.id === id);
}

/** The tile of a plan at `at`, if it is listed. */
export function tileActionsAtV7(
  plan: TileActionPlanV7 | null | undefined,
  at: CoordV7,
): TileActionTileV7 | undefined {
  return plan?.tiles.find((tile) => tile.at.x === at.x && tile.at.y === at.y);
}
