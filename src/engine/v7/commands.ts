import type { CityId, UnitId } from "../model/ids";
import {
  ACHIEVEMENT_IDS_V7,
  COMMAND_KIND_ORDER_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  isNavalRoleV7,
  type CommandKindV7,
  type NavalRoleIdV7,
  type AchievementIdV7,
  type CoordV7,
  type RewardIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "./types";
import {
  hasExactKeysV7,
  isDenseArrayV7,
  isPositiveSafeIntegerV7,
  parseCityIdV7,
  parseCoordV7,
  parseUnitIdV7,
} from "./schema";

export type TileCommandKindV7 =
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "HARVEST_FISH"
  | "GATHER_PEARLS"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_WORKSHOP"
  | "BUILD_MARKET"
  | "BUILD_PORT"
  | "BUILD_SHIPYARD"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "CULTIVATE_FOREST"
  | "BLAST_MOUNTAIN"
  | "BUILD_ROAD"
  | "REDEVELOP";

export type CommandV7 =
  | {
      readonly kind: "MOVE";
      readonly unitId: UnitId;
      readonly path: readonly CoordV7[];
    }
  | {
      readonly kind: "ATTACK";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section
       * 4.2): the ship `unitId` captures the adjacent, badly damaged
       * hostile ship `targetUnitId`.
       */
      readonly kind: "BOARD";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      readonly kind: "RALLY" | "TEND_WOUNDED";
      readonly unitId: UnitId;
    }
  | {
      /** Revision 13 Undead Grave actions (Necromancer, Ghoul). */
      readonly kind: "RAISE_DEAD" | "DEVOUR";
      readonly unitId: UnitId;
    }
  | {
      readonly kind:
        | "RECOVER"
        | "CAPTURE"
        | "PROMOTE"
        | "PILLAGE"
        | "DISBAND"
        | "WAIT"
        | "BUILD_FIELD_DEFENSE"
        | "WAIL"
        /** Map curiosities round 2: a unit on the Wishing Well tosses a Coin. */
        | "TOSS_COIN"
        /** Revision 17: a goblin-crewed unit blows itself up. */
        | "KABOOM";
      readonly unitId: UnitId;
    }
  | {
      /** Revision 19: a Shaman hatches the adjacent own Egg `eggUnitId`. */
      readonly kind: "HATCH";
      readonly unitId: UnitId;
      readonly eggUnitId: UnitId;
    }
  | {
      /**
       * The Martian revision (section 8.1): a Saucer that has not moved
       * brings its owner's `passengerUnitId` from a city to the adjacent
       * tile `to`.
       */
      readonly kind: "BEAM_DOWN";
      readonly unitId: UnitId;
      readonly passengerUnitId: UnitId;
      readonly to: CoordV7;
    }
  | {
      /**
       * The Martian revision (section 8.2): a Brain takes control of a
       * wounded hostile unit, which keeps its kind (the Mind Control
       * revision).
       */
      readonly kind: "MIND_CONTROL";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * The Martian revision (section 8.4): a Mothership pulls a unit two
       * tiles away one tile toward itself.
       */
      readonly kind: "TRACTOR_BEAM";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * The Ice Folk revision (section 7.3): a Sled freezes a hostile unit
       * within 2 tiles (Ice Folk Freeze, `pulp_wars-w49.37`).
       */
      readonly kind: "THROW_BOLAS";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * The Ice Folk revision (section 6.4): an Ice Witch freezes every
       * hostile unit next to her (Ice Folk Freeze, `pulp_wars-w49.37`).
       */
      readonly kind: "COLD_SNAP";
      readonly unitId: UnitId;
    }
  | {
      /**
       * The naval branch, the frozen sea
       * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.4): an Ice Folk
       * land unit freezes the water next to it: two tiles out in a straight
       * line from `at` (one of the eight tiles around it), or, for the Ice
       * Witch, every tile around her (`at` is her own tile).
       */
      readonly kind: "FREEZE";
      readonly unitId: UnitId;
      readonly at: CoordV7;
    }
  | {
      /**
       * The Dwarf revision (section 5.1): a Steam Mole tunnels to `to`,
       * optionally taking an adjacent Hammerer (`rider`) to the tile
       * `rider.to` next to `to`.
       */
      readonly kind: "TUNNEL";
      readonly unitId: UnitId;
      readonly to: CoordV7;
      readonly rider: {
        readonly unitId: UnitId;
        readonly to: CoordV7;
      } | null;
    }
  | {
      /**
       * The Dwarf revision (section 6.2): a Gyrocopter bombs a hostile unit
       * within 2 tiles and lands on `to`, beyond it.
       */
      readonly kind: "BOMB_RUN";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly to: CoordV7;
    }
  | {
      /**
       * The Dwarf revision (section 9.2): an Engineer assembles a Clockwork
       * Gunner on the adjacent tile `to`.
       */
      readonly kind: "ASSEMBLE";
      readonly unitId: UnitId;
      readonly to: CoordV7;
    }
  | {
      /**
       * Dwarf crowd control (`pulp_wars-w49.33`): a Whirligig hits every
       * visible hostile unit next to it at once, unanswered.
       */
      readonly kind: "WHIRL";
      readonly unitId: UnitId;
    }
  | {
      /**
       * Dwarf crowd control: an Engineer builds a Barricade on the adjacent
       * tile `to`.
       */
      readonly kind: "BUILD_BARRICADE";
      readonly unitId: UnitId;
      readonly to: CoordV7;
    }
  | {
      /**
       * Dwarf crowd control: a unit attacks the hostile Barricade on `at`.
       */
      readonly kind: "ATTACK_BARRICADE";
      readonly unitId: UnitId;
      readonly at: CoordV7;
    }
  | {
      /**
       * The Candy revision (docs/product/RULESET_7_CANDY.md section 5.1): a
       * Candy land unit that has not moved or acted goes on a Sugar Rush.
       */
      readonly kind: "SUGAR_RUSH";
      readonly unitId: UnitId;
    }
  | {
      /**
       * The Candy revision (section 6.4), as the Candy redesign
       * (docs/product/RULESET_7_CANDY_REDESIGN.md section 8.1) changed it:
       * a Confectioner scoops the own Crumbs on `from` (within 2 tiles,
       * from under any unit) and bakes the unit back onto the free tile `at`
       * next to itself.
       */
      readonly kind: "REBAKE";
      readonly unitId: UnitId;
      readonly from: CoordV7;
      readonly at: CoordV7;
    }
  | {
      /**
       * The Candy revision (section 9): a Gumball Gunner heals an own unit
       * within 2 tiles.
       */
      readonly kind: "SUGAR_TOSS";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * The Candy redesign (section 8.2): a Confectioner tops up an own
       * adjacent unit (ends its Crash, heals 2, and cures it).
       */
      readonly kind: "TOP_UP";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * The giants' signatures (docs/product/RULESET_7_GIANTS.md section
       * 6.2): an Abomination swallows an adjacent hostile unit of 12 HP or
       * less.
       */
      readonly kind: "SWALLOW";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * Section 6.3: a Troll throws the adjacent own Goblin
       * `passengerUnitId` onto `at`, 2 or 3 tiles from it.
       */
      readonly kind: "TOSS";
      readonly unitId: UnitId;
      readonly passengerUnitId: UnitId;
      readonly at: CoordV7;
    }
  | {
      /**
       * Section 6.4: an unmoved Brontosaurus stamps on every hostile ground
       * unit around it.
       */
      readonly kind: "STOMP";
      readonly unitId: UnitId;
    }
  | {
      /**
       * Section 6.8 (as the user changed it on 2026-10-09): a Gingerbread
       * Giant spends 10 HP to make two Gingerbread Men on the two adjacent
       * tiles `tiles`, distinct and in (y, x) order.
       */
      readonly kind: "BREAK_OFF";
      readonly unitId: UnitId;
      readonly tiles: readonly [CoordV7, CoordV7];
    }
  | {
      /**
       * Ice Folk Freeze (`pulp_wars-w49.37`, RULESET_7_CURRENT.md section
       * 21.6): an Ice Witch freezes one hostile unit within 2 tiles (the
       * Frost Bolt; she uses it or Cold Snap, one a turn).
       */
      readonly kind: "FROST_BOLT";
      readonly unitId: UnitId;
      readonly targetUnitId: UnitId;
    }
  | {
      /**
       * Ice Folk Freeze (section 21.18): an unmoved Mammoth charges in a
       * straight line toward `at`, 1 to 3 tiles away, shoving and hurting
       * the hostile units in its way.
       */
      readonly kind: "STAMPEDE";
      readonly unitId: UnitId;
      readonly at: CoordV7;
    }
  | {
      /**
       * The Cultists (docs/product/RULESET_7_CULTISTS.md sections 5.1 and
       * 5.2): a Summoner offers a unit on one of the eight tiles around it
       * to the Ancient Ones. `SACRIFICE`: an own unit, for its value in
       * Favour. `SEIZE`: a broken hostile unit that another robed cultist
       * of the actor holds down, for twice its value.
       */
      readonly kind: "SACRIFICE" | "SEIZE";
      readonly unitId: UnitId;
      readonly victimUnitId: UnitId;
    }
  | {
      /**
       * The Cultists (section 5.3): the own city `cityId` gives up 2
       * population for 3 Favour, as its city action.
       */
      readonly kind: "OFFERING";
      readonly cityId: CityId;
    }
  | {
      /** Revision 19: a Dinosaur city lays an Egg of `role` on `at`. */
      readonly kind: "LAY_EGG";
      readonly cityId: CityId;
      readonly role: UnitRoleIdV7;
      readonly at: CoordV7;
    }
  | { readonly kind: "LAND_GRANT"; readonly cityId: CityId }
  | { readonly kind: "RESEARCH"; readonly tech: TechnologyIdV7 }
  | { readonly kind: TileCommandKindV7; readonly at: CoordV7 }
  | {
      readonly kind: "BUILD_MONUMENT";
      readonly achievement: AchievementIdV7;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "TRAIN";
      readonly cityId: CityId;
      readonly role: UnitRoleIdV7;
    }
  | {
      readonly kind: "TRAIN_NAVAL";
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly role: NavalRoleIdV7;
    }
  | {
      /**
       * Tuning 3 (`pulp_wars-w49.3`): hire a land unit of `role` on the
       * Market tile `at` of the own city `cityId`, for
       * `hireCostV7` of its training price there. It does not use the city
       * action; the Market tile must be empty.
       */
      readonly kind: "HIRE";
      readonly cityId: CityId;
      readonly at: CoordV7;
      readonly role: UnitRoleIdV7;
    }
  | {
      readonly kind: "DISEMBARK";
      readonly unitId: UnitId;
      readonly at: CoordV7;
    }
  | {
      readonly kind: "CHOOSE_CITY_REWARD";
      readonly cityId: CityId;
      readonly reachedLevel: number;
      readonly reward: RewardIdV7;
    }
  | { readonly kind: "END_TURN" };

export interface CommandEnvelopeV7 {
  readonly format: "pulp-wars-command";
  readonly version: 7;
  readonly command: CommandV7;
}

export type CommandParseResultV7 =
  | { readonly ok: true; readonly value: CommandV7 }
  | { readonly ok: false; readonly field: string };

const TILE_KINDS = new Set<CommandKindV7>([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "HARVEST_FISH",
  "GATHER_PEARLS",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_WORKSHOP",
  "BUILD_MARKET",
  "BUILD_PORT",
  "BUILD_SHIPYARD",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "CULTIVATE_FOREST",
  "BLAST_MOUNTAIN",
  "BUILD_ROAD",
  "REDEVELOP",
]);
const UNIT_ONLY_KINDS = new Set<CommandKindV7>([
  "RAISE_DEAD",
  "DEVOUR",
  "RECOVER",
  "CAPTURE",
  "PROMOTE",
  "PILLAGE",
  "DISBAND",
  "WAIT",
  "BUILD_FIELD_DEFENSE",
  "WAIL",
  "KABOOM",
  "TOSS_COIN",
]);

export function parseCommandEnvelopeV7(
  input: unknown,
):
  | { readonly ok: true; readonly value: CommandEnvelopeV7 }
  | { readonly ok: false; readonly field: string } {
  if (
    !hasExactKeysV7(input, ["format", "version", "command"]) ||
    input.format !== "pulp-wars-command" ||
    input.version !== 7
  ) {
    return invalid("envelope");
  }
  const parsed = parseCommandV7(input.command);
  return parsed.ok
    ? {
        ok: true,
        value: {
          format: "pulp-wars-command",
          version: 7,
          command: parsed.value,
        },
      }
    : parsed;
}

export function parseCommandV7(input: unknown): CommandParseResultV7 {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return invalid("command");
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.kind !== "string" ||
    !COMMAND_KIND_ORDER_V7.includes(candidate.kind as CommandKindV7)
  )
    return invalid("command.kind");
  const kind = candidate.kind as CommandKindV7;
  if (kind === "END_TURN")
    return hasExactKeysV7(input, ["kind"])
      ? { ok: true, value: { kind } }
      : invalid(kind);
  if (kind === "RESEARCH") {
    return hasExactKeysV7(input, ["kind", "tech"]) &&
      TECHNOLOGY_IDS_V7.includes(candidate.tech as TechnologyIdV7)
      ? { ok: true, value: { kind, tech: candidate.tech as TechnologyIdV7 } }
      : invalid(kind);
  }
  if (TILE_KINDS.has(kind)) {
    const at = hasExactKeysV7(input, ["kind", "at"])
      ? parseCoordV7(candidate.at)
      : null;
    return at === null
      ? invalid(kind)
      : { ok: true, value: { kind: kind as TileCommandKindV7, at } };
  }
  if (kind === "BUILD_MONUMENT") {
    const at = hasExactKeysV7(input, ["achievement", "at", "kind"])
      ? parseCoordV7(candidate.at)
      : null;
    return at === null ||
      !ACHIEVEMENT_IDS_V7.includes(candidate.achievement as AchievementIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            achievement: candidate.achievement as AchievementIdV7,
            at,
          },
        };
  }
  if (kind === "MOVE") {
    const id = hasExactKeysV7(input, ["kind", "unitId", "path"])
      ? parseUnitIdV7(candidate.unitId)
      : null;
    const path = id === null ? null : parsePath(candidate.path);
    return id === null || path === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: id, path } };
  }
  if (
    kind === "ATTACK" ||
    kind === "BOARD" ||
    kind === "MIND_CONTROL" ||
    kind === "TRACTOR_BEAM" ||
    kind === "THROW_BOLAS" ||
    kind === "FROST_BOLT" ||
    kind === "SUGAR_TOSS" ||
    kind === "TOP_UP" ||
    kind === "SWALLOW"
  ) {
    if (!hasExactKeysV7(input, ["kind", "unitId", "targetUnitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const target = parseUnitIdV7(candidate.targetUnitId);
    return unit === null || target === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, targetUnitId: target } };
  }
  if (kind === "SACRIFICE" || kind === "SEIZE") {
    if (!hasExactKeysV7(input, ["kind", "unitId", "victimUnitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const victim = parseUnitIdV7(candidate.victimUnitId);
    return unit === null || victim === null || unit === victim
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, victimUnitId: victim } };
  }
  if (kind === "BEAM_DOWN") {
    if (!hasExactKeysV7(input, ["kind", "unitId", "passengerUnitId", "to"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const passenger = parseUnitIdV7(candidate.passengerUnitId);
    const to = parseCoordV7(candidate.to);
    return unit === null || passenger === null || to === null
      ? invalid(kind)
      : {
          ok: true,
          value: { kind, unitId: unit, passengerUnitId: passenger, to },
        };
  }
  if (kind === "TOSS") {
    if (!hasExactKeysV7(input, ["at", "kind", "passengerUnitId", "unitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const passenger = parseUnitIdV7(candidate.passengerUnitId);
    const at = parseCoordV7(candidate.at);
    return unit === null || passenger === null || at === null
      ? invalid(kind)
      : {
          ok: true,
          value: { kind, unitId: unit, passengerUnitId: passenger, at },
        };
  }
  if (kind === "TUNNEL") {
    if (!hasExactKeysV7(input, ["kind", "rider", "to", "unitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const to = parseCoordV7(candidate.to);
    if (unit === null || to === null) return invalid(kind);
    if (candidate.rider === null)
      return { ok: true, value: { kind, unitId: unit, to, rider: null } };
    if (!hasExactKeysV7(candidate.rider, ["to", "unitId"]))
      return invalid(kind);
    const riderUnit = parseUnitIdV7(candidate.rider.unitId);
    const riderTo = parseCoordV7(candidate.rider.to);
    return riderUnit === null || riderTo === null
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            unitId: unit,
            to,
            rider: { unitId: riderUnit, to: riderTo },
          },
        };
  }
  if (kind === "BOMB_RUN") {
    if (!hasExactKeysV7(input, ["kind", "targetUnitId", "to", "unitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const target = parseUnitIdV7(candidate.targetUnitId);
    const to = parseCoordV7(candidate.to);
    return unit === null || target === null || to === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, targetUnitId: target, to } };
  }
  if (kind === "FREEZE" || kind === "STAMPEDE") {
    if (!hasExactKeysV7(input, ["at", "kind", "unitId"])) return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const at = parseCoordV7(candidate.at);
    return unit === null || at === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, at } };
  }
  if (kind === "ASSEMBLE" || kind === "BUILD_BARRICADE") {
    if (!hasExactKeysV7(input, ["kind", "to", "unitId"])) return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const to = parseCoordV7(candidate.to);
    return unit === null || to === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, to } };
  }
  if (kind === "HATCH") {
    if (!hasExactKeysV7(input, ["kind", "unitId", "eggUnitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const egg = parseUnitIdV7(candidate.eggUnitId);
    return unit === null || egg === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, eggUnitId: egg } };
  }
  if (kind === "LAY_EGG") {
    const city = hasExactKeysV7(input, ["at", "cityId", "kind", "role"])
      ? parseCityIdV7(candidate.cityId)
      : null;
    const at = city === null ? null : parseCoordV7(candidate.at);
    return city === null ||
      at === null ||
      !UNIT_ROLE_IDS_V7.includes(candidate.role as UnitRoleIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            cityId: city,
            role: candidate.role as UnitRoleIdV7,
            at,
          },
        };
  }
  if (
    kind === "RALLY" ||
    kind === "TEND_WOUNDED" ||
    kind === "COLD_SNAP" ||
    kind === "SUGAR_RUSH" ||
    kind === "WHIRL" ||
    kind === "STOMP"
  ) {
    const unit = hasExactKeysV7(input, ["kind", "unitId"])
      ? parseUnitIdV7(candidate.unitId)
      : null;
    return unit === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit } };
  }
  if (kind === "LAND_GRANT" || kind === "OFFERING") {
    const cityId = hasExactKeysV7(input, ["cityId", "kind"])
      ? parseCityIdV7(candidate.cityId)
      : null;
    return cityId === null
      ? invalid(kind)
      : { ok: true, value: { kind, cityId } };
  }
  if (UNIT_ONLY_KINDS.has(kind)) {
    const unit = hasExactKeysV7(input, ["kind", "unitId"])
      ? parseUnitIdV7(candidate.unitId)
      : null;
    return unit === null
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind: kind as Extract<CommandV7, { unitId: UnitId }>["kind"],
            unitId: unit,
          } as CommandV7,
        };
  }
  if (kind === "TRAIN") {
    const city = hasExactKeysV7(input, ["kind", "cityId", "role"])
      ? parseCityIdV7(candidate.cityId)
      : null;
    return city === null ||
      !UNIT_ROLE_IDS_V7.includes(candidate.role as UnitRoleIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: { kind, cityId: city, role: candidate.role as UnitRoleIdV7 },
        };
  }
  if (kind === "TRAIN_NAVAL") {
    const city = hasExactKeysV7(input, ["at", "cityId", "kind", "role"])
      ? parseCityIdV7(candidate.cityId)
      : null;
    const at = city === null ? null : parseCoordV7(candidate.at);
    return city === null || at === null || !isNavalRoleV7(candidate.role)
      ? invalid(kind)
      : { ok: true, value: { kind, cityId: city, at, role: candidate.role } };
  }
  if (kind === "HIRE") {
    const city = hasExactKeysV7(input, ["at", "cityId", "kind", "role"])
      ? parseCityIdV7(candidate.cityId)
      : null;
    const at = city === null ? null : parseCoordV7(candidate.at);
    return city === null ||
      at === null ||
      !UNIT_ROLE_IDS_V7.includes(candidate.role as UnitRoleIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            cityId: city,
            at,
            role: candidate.role as UnitRoleIdV7,
          },
        };
  }
  if (kind === "BREAK_OFF") {
    const unit = hasExactKeysV7(input, ["kind", "tiles", "unitId"])
      ? parseUnitIdV7(candidate.unitId)
      : null;
    const tiles =
      unit !== null &&
      isDenseArrayV7(candidate.tiles) &&
      candidate.tiles.length === 2
        ? candidate.tiles.map((tile) => parseCoordV7(tile))
        : null;
    const first = tiles?.[0] ?? null;
    const second = tiles?.[1] ?? null;
    return unit === null ||
      first === null ||
      second === null ||
      compareNullableCoords(first, second) >= 0
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, tiles: [first, second] } };
  }
  if (kind === "REBAKE") {
    if (!hasExactKeysV7(input, ["at", "from", "kind", "unitId"]))
      return invalid(kind);
    const unit = parseUnitIdV7(candidate.unitId);
    const from = parseCoordV7(candidate.from);
    const at = parseCoordV7(candidate.at);
    return unit === null || from === null || at === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, from, at } };
  }
  if (kind === "DISEMBARK" || kind === "ATTACK_BARRICADE") {
    const unit = hasExactKeysV7(input, ["at", "kind", "unitId"])
      ? parseUnitIdV7(candidate.unitId)
      : null;
    const at = unit === null ? null : parseCoordV7(candidate.at);
    return unit === null || at === null
      ? invalid(kind)
      : { ok: true, value: { kind, unitId: unit, at } };
  }
  if (kind === "CHOOSE_CITY_REWARD") {
    if (!hasExactKeysV7(input, ["kind", "cityId", "reachedLevel", "reward"]))
      return invalid(kind);
    const city = parseCityIdV7(candidate.cityId);
    return city === null ||
      !isPositiveSafeIntegerV7(candidate.reachedLevel) ||
      !REWARD_IDS_V7.includes(candidate.reward as RewardIdV7)
      ? invalid(kind)
      : {
          ok: true,
          value: {
            kind,
            cityId: city,
            reachedLevel: candidate.reachedLevel,
            reward: candidate.reward as RewardIdV7,
          },
        };
  }
  return invalid("command.kind");
}

export function compareCommandsV7(left: CommandV7, right: CommandV7): number {
  const byKind =
    COMMAND_KIND_ORDER_V7.indexOf(left.kind) -
    COMMAND_KIND_ORDER_V7.indexOf(right.kind);
  if (byKind !== 0) return byKind;
  // Revision 19 section 10: `LAY_EGG` is offered in city-ID, role, then
  // (y, x) order.
  if (left.kind === "LAY_EGG" && right.kind === "LAY_EGG")
    return (
      left.cityId - right.cityId ||
      UNIT_ROLE_IDS_V7.indexOf(left.role) -
        UNIT_ROLE_IDS_V7.indexOf(right.role) ||
      compareNullableCoords(left.at, right.at)
    );
  // The Martian revision section 11: `BEAM_DOWN` is offered in unit-ID,
  // passenger-ID, then (y, x) order.
  if (left.kind === "BEAM_DOWN" && right.kind === "BEAM_DOWN")
    return (
      left.unitId - right.unitId ||
      left.passengerUnitId - right.passengerUnitId ||
      compareNullableCoords(left.to, right.to)
    );
  // The Dwarf revision section 14: `TUNNEL` in unit-ID, destination (y, x),
  // then rider order (the rider-less entry first, then rider ID and tile);
  // `BOMB_RUN` in unit-ID, target-ID, then landing (y, x); `ASSEMBLE` in
  // unit-ID then (y, x) order.
  if (left.kind === "TUNNEL" && right.kind === "TUNNEL")
    return (
      left.unitId - right.unitId ||
      compareNullableCoords(left.to, right.to) ||
      (left.rider === null ? 0 : 1) - (right.rider === null ? 0 : 1) ||
      (left.rider?.unitId ?? 0) - (right.rider?.unitId ?? 0) ||
      compareNullableCoords(left.rider?.to ?? null, right.rider?.to ?? null)
    );
  if (left.kind === "BOMB_RUN" && right.kind === "BOMB_RUN")
    return (
      left.unitId - right.unitId ||
      left.targetUnitId - right.targetUnitId ||
      compareNullableCoords(left.to, right.to)
    );
  // The giants' signatures: `TOSS` in unit-ID, passenger-ID, then landing
  // (y, x) order.
  if (left.kind === "TOSS" && right.kind === "TOSS")
    return (
      left.unitId - right.unitId ||
      left.passengerUnitId - right.passengerUnitId ||
      compareNullableCoords(left.at, right.at)
    );
  // `BREAK_OFF` in unit-ID, then first and second tile (y, x) order.
  if (left.kind === "BREAK_OFF" && right.kind === "BREAK_OFF")
    return (
      left.unitId - right.unitId ||
      compareNullableCoords(left.tiles[0], right.tiles[0]) ||
      compareNullableCoords(left.tiles[1], right.tiles[1])
    );
  // The Candy redesign: `REBAKE` in unit-ID, scooped tile (y, x), then
  // placement (y, x) order.
  if (left.kind === "REBAKE" && right.kind === "REBAKE")
    return (
      left.unitId - right.unitId ||
      compareNullableCoords(left.from, right.from) ||
      compareNullableCoords(left.at, right.at)
    );
  if (left.kind === "ASSEMBLE" && right.kind === "ASSEMBLE")
    return (
      left.unitId - right.unitId || compareNullableCoords(left.to, right.to)
    );
  // Dwarf crowd control (`pulp_wars-w49.33`): `BUILD_BARRICADE` and
  // `ATTACK_BARRICADE` in unit-ID then (y, x) order.
  if (left.kind === "BUILD_BARRICADE" && right.kind === "BUILD_BARRICADE")
    return (
      left.unitId - right.unitId || compareNullableCoords(left.to, right.to)
    );
  if (left.kind === "ATTACK_BARRICADE" && right.kind === "ATTACK_BARRICADE")
    return (
      left.unitId - right.unitId || compareNullableCoords(left.at, right.at)
    );
  const leftAt = targetCoord(left);
  const rightAt = targetCoord(right);
  const byTarget = compareNullableCoords(leftAt, rightAt);
  if (byTarget !== 0) return byTarget;
  const byActor = actorId(left) - actorId(right);
  if (byActor !== 0) return byActor;
  const byContent = referencedOrdinal(left) - referencedOrdinal(right);
  if (byContent !== 0) return byContent;
  if (left.kind === "MOVE" && right.kind === "MOVE")
    return comparePaths(left.path, right.path);
  return 0;
}

function parsePath(input: unknown): readonly CoordV7[] | null {
  if (!isDenseArrayV7(input)) return null;
  const path: CoordV7[] = [];
  for (const candidate of input) {
    const at = parseCoordV7(candidate);
    if (at === null) return null;
    path.push(at);
  }
  return path;
}

function targetCoord(command: CommandV7): CoordV7 | null {
  if ("at" in command) return command.at;
  if (command.kind === "MOVE") return command.path.at(-1) ?? null;
  return null;
}

function compareNullableCoords(
  left: CoordV7 | null,
  right: CoordV7 | null,
): number {
  if (left === null) return right === null ? 0 : -1;
  if (right === null) return 1;
  return left.y - right.y || left.x - right.x;
}

function actorId(command: CommandV7): number {
  if ("unitId" in command) return command.unitId;
  if ("cityId" in command) return command.cityId;
  return 0;
}

function referencedOrdinal(command: CommandV7): number {
  if (command.kind === "RESEARCH")
    return TECHNOLOGY_IDS_V7.indexOf(command.tech);
  if (
    command.kind === "TRAIN" ||
    command.kind === "TRAIN_NAVAL" ||
    command.kind === "HIRE" ||
    command.kind === "LAY_EGG"
  )
    return UNIT_ROLE_IDS_V7.indexOf(command.role);
  if (command.kind === "CHOOSE_CITY_REWARD")
    return REWARD_IDS_V7.indexOf(command.reward);
  if (command.kind === "BUILD_MONUMENT")
    return ACHIEVEMENT_IDS_V7.indexOf(command.achievement);
  if (
    command.kind === "ATTACK" ||
    command.kind === "BOARD" ||
    command.kind === "MIND_CONTROL" ||
    command.kind === "TRACTOR_BEAM" ||
    command.kind === "THROW_BOLAS" ||
    command.kind === "FROST_BOLT" ||
    command.kind === "SUGAR_TOSS" ||
    command.kind === "TOP_UP" ||
    command.kind === "SWALLOW"
  )
    return command.targetUnitId;
  // The Cultists: `SACRIFICE` and `SEIZE` in unit-ID, then victim-ID order.
  if (command.kind === "SACRIFICE" || command.kind === "SEIZE")
    return command.victimUnitId;
  if (command.kind === "HATCH") return command.eggUnitId;
  return 0;
}

function comparePaths(
  left: readonly CoordV7[],
  right: readonly CoordV7[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const compared = compareNullableCoords(
      left[index] ?? null,
      right[index] ?? null,
    );
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
}

function invalid(field: string): {
  readonly ok: false;
  readonly field: string;
} {
  return { ok: false, field };
}
