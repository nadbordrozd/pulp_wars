import {
  PROCLAIM_RANGE_V7,
  RIBBIT_RANGE_V7,
  bindingTauntsV7,
  previewBeginRitualV7,
  previewPickMeV7,
  previewProclaimV7,
  previewRibbitV7,
  previewRitualV7,
  previewSwitcherooV7,
  ribbitRejectionV7,
  ritualChantersV7,
  starfallDamageV7,
  tentacleSlapTargetV7,
  unitRoleRuleV7,
  type BeginRitualPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type RitualKindV7,
  type RitualPreviewV7,
  type UnitId,
} from "../../engine/index";
import {
  COWED_LABEL_V7,
  COWED_TOOLTIP_V7,
  CULT_TRICK_PICKS_V7,
  PICK_ME_BOUND_LABEL_V7,
  PROCLAIM_TARGET_LABEL_V7,
  RIBBIT_TARGET_LABEL_V7,
  RITUAL_CONFIRM_HINT_V7,
  SWITCHEROO_TARGET_LABEL_V7,
  TENTACLE_SLAP_LABEL_V7,
  beginRitualTargetNameV7,
  cultTrickCommandsV7,
  proclaimTargetNameV7,
  ribbitTargetNameV7,
  ritualMarkNameV7,
  starfallHitLabelV7,
  starfallTargetNameV7,
  summoningMarkLabelV7,
  switcherooTargetNameV7,
  tentacleTileNameV7,
  tricksOfV7,
} from "../cult-ritual-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";
import {
  CULT_LINK_LABEL_V7,
  outlineEntries,
  type CultUnitMarkersV7,
} from "./cult-channel-board-plan-v7";

/**
 * Rituals, hexes and tricks on the board (bead `pulp_wars-mch9.19`;
 * docs/product/RULESET_7_CULTISTS.md section 14.3, docs/ui/BOARD_TARGETING.md
 * section 3.9).
 *
 * **Always on the board, for every viewer:** the chalk ring of a ritual
 * under its leader and its chanters, the rite's badge, its marked tile with
 * the countdown, a star's nine tiles with what each unit there takes, the
 * unit that decides a Great Summoning, the banner of a Cowed city, the frog
 * on a hexed unit, a Tentacle's turns and the unit it holds, and a taunting
 * Chosen with a tether to each unit it binds. **While the unit is
 * selected:** whom an offered Pick Me! would bind. **While aimed:** the
 * mark of a rite (chosen first, begun when chosen again), the city of a
 * Proclaim, the unit of a Ribbit or a Switcheroo, and the tile of a
 * Tentacle.
 *
 * Everything is read from the public view, the offered commands and the
 * engine's public previews.
 */

/** A ritual, a Proclaim, a hex or a trick being aimed on the board. */
export type CultTrickPickV7 =
  | {
      readonly kind: "STARFALL" | "GREAT_SUMMONING";
      readonly unitId: UnitId;
      /** The mark chosen first; choosing it again begins the ritual. */
      readonly chosen: CoordV7 | null;
    }
  | {
      readonly kind: "PROCLAIM" | "RIBBIT" | "SWITCHEROO" | "TENTACLE";
      readonly unitId: UnitId;
    };

const TRICK_PICK_KINDS: ReadonlySet<string> = new Set([
  "STARFALL",
  "GREAT_SUMMONING",
  "PROCLAIM",
  "RIBBIT",
  "SWITCHEROO",
  "TENTACLE",
]);

/** Whether a Cult pick is one of this module's. */
export function isCultTrickPickV7(pick: {
  readonly kind: string;
}): pick is CultTrickPickV7 {
  return TRICK_PICK_KINDS.has(pick.kind);
}

/** A mark of a ritual or a Cowed city: on the ground, or over the pieces. */
export type CultMarkV7 =
  | {
      /** On the ground: the chalk ring under a ritual's participant. */
      readonly kind: "RITUAL_RING";
      readonly leader: boolean;
    }
  | {
      /** On the ground: the chalk sign on a ritual's marked tile. */
      readonly kind: "RITUAL_MARK";
      readonly ritual: RitualKindV7;
      /** A mark being chosen: the ritual has not begun. */
      readonly preview: boolean;
    }
  | {
      /** Over the pieces: the countdown of a ritual on its marked tile. */
      readonly kind: "COUNTDOWN";
      readonly ritual: RitualKindV7;
      /** The turns of its seat until it completes: always one. */
      readonly turns: 1;
      /** A star's damage as the circle stands, or null for the Herald. */
      readonly damage: number | null;
    }
  /** Over the pieces: the banner and shutters of a Cowed city. */
  | { readonly kind: "COWED" };

/** What a focused (or only) target of an aimed trick also shows. */
export interface CultFocusPreviewV7 {
  /** Switcheroo: each unit drawn faintly on the other's tile. */
  readonly ghosts?: readonly {
    readonly unitId: UnitId;
    readonly at: CoordV7;
  }[];
  /** Switcheroo: the two tiles, joined by a two-headed arrow. */
  readonly swap?: { readonly from: CoordV7; readonly to: CoordV7 };
  /** Tentacle: the unit it slaps at once. */
  readonly marks?: readonly {
    readonly at: CoordV7;
    readonly label: string;
    readonly friendly: boolean;
  }[];
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/**
 * The marks of rituals, hexes and tricks on every visible unit, added to
 * the channel's (`cultUnitMarkersV7`): a ritual's leader and chanters are
 * Candlelit, the leader wears the rite's badge, a frog its frog, a taunting
 * Chosen its bubble, a Tentacle its turns, and the unit a Tentacle slaps
 * next the daemons' eye (bead `pulp_wars-mch9.24`).
 */
export function cultTrickUnitMarkersV7(
  view: PlayerViewV7,
  base: ReadonlyMap<UnitId, CultUnitMarkersV7>,
): ReadonlyMap<UnitId, CultUnitMarkersV7> {
  const tricks = tricksOfV7(view);
  if (
    tricks.rituals.length === 0 &&
    tricks.frogs.length === 0 &&
    tricks.taunts.length === 0 &&
    tricks.tentacles.length === 0
  )
    return base;
  const markers = new Map(base);
  const seen = new Set(view.units.map((unit) => unit.id));
  const mark = (unitId: UnitId, added: CultUnitMarkersV7): void => {
    if (seen.has(unitId))
      markers.set(unitId, { ...markers.get(unitId), ...added });
  };
  for (const ritual of tricks.rituals) {
    if (ritual.leaderUnitId !== null)
      mark(ritual.leaderUnitId, { candle: true, ritual: ritual.kind });
    for (const unitId of ritual.chanterUnitIds) mark(unitId, { candle: true });
  }
  for (const unitId of tricks.frogs) mark(unitId, { frog: true });
  for (const unitId of tricks.taunts) mark(unitId, { taunt: true });
  const unitById = new Map(view.units.map((unit) => [unit.id, unit]));
  for (const entry of tricks.tentacles) {
    mark(entry.unitId, { sinks: entry.turnsLeft });
    // Section 9.3: in every neutral turn it slaps the weakest unit beside
    // it. Whom that is as the board stands wears the eye a loose daemon's
    // target wears: the engine's own slap rule over the units in sight.
    const tentacle = unitById.get(entry.unitId);
    if (tentacle === undefined) continue;
    const next = tentacleSlapTargetV7(view.units, tentacle.at);
    if (next !== null) mark(next.id, { eye: true });
  }
  return markers;
}

/** The nine tiles of a star and what each visible unit there takes. */
function addStarfallForecast(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  star: NonNullable<RitualPreviewV7["starfall"]>,
  prefix: string,
): void {
  outlineEntries(
    entries,
    view,
    star.area,
    "STARFALL",
    `ability-area:STARFALL:${prefix}`,
  );
  for (const hit of star.results)
    entries.push({
      key: `ability-target:STARFALL:${prefix}:${hit.unitId}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: hit.at,
      // The warning stripes of friendly fire on the viewer's own units.
      abilityStyle: hit.ownerId === view.viewer.id ? "BLAST_FRIENDLY" : "BLAST",
      label: starfallHitLabelV7(hit.damage + hit.shieldDamage),
      lethal: hit.dies,
    });
}

/** The unit on a Great Summoning's mark: consumed, or in the way. */
function addSummoningForecast(
  entries: BoardRenderPlanEntryV7[],
  summoning: NonNullable<RitualPreviewV7["summoning"]>,
  prefix: string,
): void {
  const label = summoningMarkLabelV7(summoning);
  if (label !== null)
    entries.push({
      key: `ability-target:SUMMONING:${prefix}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: summoning.at,
      abilityStyle:
        summoning.outcome === "BLOCKED" ? "MARTIAN_BLOCKED" : "BLAST",
      label,
      lethal: summoning.outcome === "CONSUMES",
    });
}

/**
 * The entries every viewer sees whatever is selected: each ritual's rings,
 * mark, countdown and forecast, each Cowed city's banner, each Grab and
 * each taunt's tethers.
 */
export function addCultTrickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
): void {
  const tricks = tricksOfV7(view);
  if (
    tricks.rituals.length === 0 &&
    tricks.cowed.length === 0 &&
    tricks.taunts.length === 0 &&
    tricks.tentacles.length === 0
  )
    return;
  const unitById = new Map(view.units.map((unit) => [unit.id, unit]));
  tricks.rituals.forEach((ritual, index) => {
    const leader =
      ritual.leaderUnitId === null
        ? undefined
        : unitById.get(ritual.leaderUnitId);
    if (leader !== undefined)
      entries.push({
        key: `cult-ritual-ring:${leader.id}`,
        kind: "CULT_MARK",
        layer: 4.4,
        at: leader.at,
        cultMark: { kind: "RITUAL_RING", leader: true },
      });
    for (const unitId of ritual.chanterUnitIds) {
      const chanter = unitById.get(unitId);
      if (chanter !== undefined)
        entries.push({
          key: `cult-ritual-ring:${chanter.id}`,
          kind: "CULT_MARK",
          layer: 4.4,
          at: chanter.at,
          cultMark: { kind: "RITUAL_RING", leader: false },
        });
    }
    if (ritual.at === null) return;
    const forecast = previewRitualV7(view, ritual);
    const id = `${ritual.leaderUnitId ?? `seat${ritual.playerId}-${index}`}`;
    entries.push(
      {
        key: `cult-ritual-mark:${id}`,
        kind: "CULT_MARK",
        layer: 4.4,
        at: ritual.at,
        cultMark: { kind: "RITUAL_MARK", ritual: ritual.kind, preview: false },
      },
      {
        key: `cult-ritual-countdown:${id}`,
        kind: "CULT_MARK",
        layer: 7.6,
        at: ritual.at,
        label: ritualMarkNameV7(view, forecast),
        cultMark: {
          kind: "COUNTDOWN",
          ritual: ritual.kind,
          turns: 1,
          damage: forecast.starfall?.damage ?? null,
        },
      },
    );
    if (forecast.starfall !== null)
      addStarfallForecast(entries, view, forecast.starfall, id);
    if (forecast.summoning !== null)
      addSummoningForecast(entries, forecast.summoning, id);
  });
  for (const cowed of tricks.cowed) {
    const city = view.cities.find((candidate) => candidate.id === cowed.cityId);
    if (city !== undefined)
      entries.push({
        key: `cult-cowed:${city.id}`,
        kind: "CULT_MARK",
        layer: 7.6,
        at: city.at,
        label: `${COWED_LABEL_V7}: ${COWED_TOOLTIP_V7}`,
        cultMark: { kind: "COWED" },
      });
  }
  for (const entry of tricks.tentacles) {
    const tentacle = unitById.get(entry.unitId);
    const held =
      entry.grabbedUnitId === null
        ? undefined
        : unitById.get(entry.grabbedUnitId);
    if (tentacle !== undefined && held !== undefined)
      entries.push({
        key: `cult-grab:${tentacle.id}`,
        kind: "LINK",
        layer: 6,
        at: tentacle.at,
        linkTo: held.at,
        label: CULT_LINK_LABEL_V7,
        cultLink: { kind: "GRAB" },
      });
  }
  if (tricks.taunts.length > 0)
    for (const unit of view.units)
      for (const chosen of bindingTauntsV7(view, view.units, unit))
        entries.push({
          key: `cult-taunt:${unit.id}:${chosen.id}`,
          kind: "LINK",
          layer: 6,
          at: unit.at,
          linkTo: chosen.at,
          label: CULT_LINK_LABEL_V7,
          cultLink: { kind: "TAUNT", preview: false },
        });
}

/**
 * Previews of the selected unit with nothing aimed: the enemies an offered
 * Pick Me! would bind, each labelled and tethered to the Chosen (marked,
 * not picked: the shout has no target).
 */
export function addCultTrickPreviewsV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number,
): void {
  if (
    !commands.some(
      (command) =>
        command.kind === "PICK_ME" && command.unitId === selectedUnitId,
    )
  )
    return;
  const chosen = view.units.find((unit) => unit.id === selectedUnitId);
  if (chosen === undefined) return;
  const preview = previewPickMeV7(view, chosen.id);
  if (preview === null) return;
  for (const unitId of preview.boundUnitIds) {
    const bound = view.units.find((unit) => unit.id === unitId);
    if (bound === undefined) continue;
    entries.push(
      {
        key: `cult-taunt-preview:${bound.id}`,
        kind: "LINK",
        layer: 7.5,
        at: bound.at,
        linkTo: chosen.at,
        label: CULT_LINK_LABEL_V7,
        cultLink: { kind: "TAUNT", preview: true },
      },
      {
        key: `ability-target:PICK_ME:${bound.id}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: bound.at,
        abilityStyle: "TAUNT",
        label: PICK_ME_BOUND_LABEL_V7,
      },
    );
  }
}

/** The forecast of the chosen mark of an aimed rite, or null. */
function chosenPreview(
  view: PlayerViewV7,
  pick: CultTrickPickV7,
): BeginRitualPreviewV7 | null {
  return (pick.kind === "STARFALL" || pick.kind === "GREAT_SUMMONING") &&
    pick.chosen !== null
    ? previewBeginRitualV7(view, pick.unitId, pick.kind, pick.chosen)
    : null;
}

/** The map targets of an aimed trick: offered commands only. */
export function cultTrickPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: CultTrickPickV7,
): MapCommandTargetV7[] {
  const actor = view.units.find((unit) => unit.id === pick.unitId);
  if (actor === undefined) return [];
  const offered = cultTrickCommandsV7(commands, pick.kind, pick.unitId);
  const unitById = (id: UnitId) => view.units.find((unit) => unit.id === id);
  const name = (id: UnitId): string => {
    const unit = unitById(id);
    return unit === undefined ? "unit" : unitRoleRuleV7(view, unit).label;
  };
  const prompt = CULT_TRICK_PICKS_V7[pick.kind];
  switch (pick.kind) {
    case "STARFALL": {
      // One sentence for every tile (a star's damage is the circle's);
      // the chosen tile has its forecast.
      const damage = starfallDamageV7(
        ritualChantersV7(view, view.units, actor).length,
      );
      const chosen = chosenPreview(view, pick);
      return offered.flatMap((command): MapCommandTargetV7[] =>
        command.kind !== "BEGIN_RITUAL"
          ? []
          : [
              {
                at: command.at,
                command,
                family: "STARFALL",
                semanticLabel:
                  chosen !== null && same(chosen.at, command.at)
                    ? `${beginRitualTargetNameV7(chosen)} ${RITUAL_CONFIRM_HINT_V7}.`
                    : `${starfallTargetNameV7(damage)} ${prompt}.`,
              },
            ],
      );
    }
    case "GREAT_SUMMONING": {
      // The tiles of the viewer's own chanters read "Chants" and nothing
      // else while a mark is looked for (bead `pulp_wars-mch9.24`: "+2
      // Favour" on each of them was noise). What the Herald would do to a
      // chanter is said once its tile is the chosen mark.
      const chanting = new Set(
        ritualChantersV7(view, view.units, actor).map((unit) => key(unit.at)),
      );
      return offered.flatMap((command): MapCommandTargetV7[] => {
        if (command.kind !== "BEGIN_RITUAL") return [];
        const preview = previewBeginRitualV7(
          view,
          command.unitId,
          command.ritual,
          command.at,
        );
        if (preview === null || preview.summoning === null) return [];
        const label = summoningMarkLabelV7(preview.summoning);
        const chosen = pick.chosen !== null && same(pick.chosen, command.at);
        const quiet = !chosen && chanting.has(key(command.at));
        return [
          {
            at: command.at,
            command,
            family: "GREAT_SUMMONING",
            ...(label === null || quiet ? {} : { previewLabel: label }),
            semanticLabel: `${beginRitualTargetNameV7(preview)} ${chosen ? RITUAL_CONFIRM_HINT_V7 : prompt}.`,
          },
        ];
      });
    }
    case "PROCLAIM":
      return offered.flatMap((command): MapCommandTargetV7[] => {
        if (command.kind !== "PROCLAIM") return [];
        const preview = previewProclaimV7(view, command.unitId, command.cityId);
        return preview === null
          ? []
          : [
              {
                at: preview.at,
                command,
                family: "PROCLAIM",
                previewLabel: PROCLAIM_TARGET_LABEL_V7,
                semanticLabel: `${proclaimTargetNameV7(preview.attacksLeftAfter)} ${prompt}.`,
              },
            ];
      });
    case "RIBBIT":
      return offered.flatMap((command): MapCommandTargetV7[] => {
        if (command.kind !== "RIBBIT") return [];
        const preview = previewRibbitV7(
          view,
          command.unitId,
          command.targetUnitId,
        );
        return preview === null
          ? []
          : [
              {
                at: preview.at,
                command,
                family: "RIBBIT",
                previewLabel: RIBBIT_TARGET_LABEL_V7,
                semanticLabel: `${ribbitTargetNameV7(name(command.targetUnitId), preview)} ${prompt}.`,
              },
            ];
      });
    case "SWITCHEROO":
      return offered.flatMap((command): MapCommandTargetV7[] => {
        if (command.kind !== "SWITCHEROO") return [];
        const preview = previewSwitcherooV7(
          view,
          command.unitId,
          command.targetUnitId,
        );
        if (preview === null) return [];
        const own = preview.targetOwnerId === view.viewer.id;
        return [
          {
            at: preview.to,
            command,
            family: "SWITCHEROO",
            // An own unit is helped out of harm, an enemy pulled into it.
            highlight: own ? "SUPPORT" : "ATTACK",
            previewLabel: SWITCHEROO_TARGET_LABEL_V7,
            semanticLabel: `${switcherooTargetNameV7(name(command.targetUnitId), own, preview)} ${prompt}.`,
            cultFocus: {
              ghosts: [
                { unitId: command.unitId, at: preview.to },
                { unitId: command.targetUnitId, at: preview.from },
              ],
              swap: { from: preview.from, to: preview.to },
            },
          },
        ];
      });
    case "TENTACLE":
      return offered.flatMap((command): MapCommandTargetV7[] => {
        if (command.kind !== "TENTACLE") return [];
        // The engine's own slap rule over the units the viewer sees (what
        // `previewTentacleV7` reports), without a command query per tile.
        const slapped = tentacleSlapTargetV7(view.units, command.at);
        return [
          {
            at: command.at,
            command,
            family: "TENTACLE",
            semanticLabel: `${tentacleTileNameV7(
              slapped === null
                ? null
                : `${slapped.ownerId === view.viewer.id ? "your" : "the"} ${name(slapped.id)}`,
            )} ${prompt}.`,
            ...(slapped === null
              ? {}
              : {
                  cultFocus: {
                    marks: [
                      {
                        at: slapped.at,
                        label: TENTACLE_SLAP_LABEL_V7,
                        friendly: slapped.ownerId === view.viewer.id,
                      },
                    ],
                  },
                }),
          },
        ];
      });
  }
}

/**
 * Preview entries of an aimed trick that are not targets: the cultists
 * that would chant, the chosen mark with its forecast, an enemy a Ribbit
 * cannot take, and a city that kneels already.
 */
export function addCultTrickPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  targets: readonly MapCommandTargetV7[],
  pick: CultTrickPickV7,
): void {
  const actor = view.units.find((unit) => unit.id === pick.unitId);
  if (actor === undefined) return;
  const grey = (at: CoordV7, id: string, label: string): void => {
    entries.push({
      key: `ability-target:${pick.kind}_BLOCKED:${id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at,
      abilityStyle: "MARTIAN_BLOCKED",
      label,
    });
  };
  if (pick.kind === "STARFALL" || pick.kind === "GREAT_SUMMONING") {
    for (const chanter of ritualChantersV7(view, view.units, actor))
      entries.push({
        key: `ability-target:CHANT:${chanter.id}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: chanter.at,
        abilityStyle: "RALLY",
        areaSupport: "QUIET",
        label: "Chants",
      });
    const chosen = chosenPreview(view, pick);
    if (chosen === null) return;
    entries.push({
      key: `cult-ritual-mark:chosen:${key(chosen.at)}`,
      kind: "CULT_MARK",
      layer: 4.4,
      at: chosen.at,
      cultMark: { kind: "RITUAL_MARK", ritual: pick.kind, preview: true },
    });
    if (chosen.starfall !== null)
      addStarfallForecast(entries, view, chosen.starfall, "chosen");
    // The Herald's tile, in the lodge's green among the other marks.
    else
      outlineEntries(
        entries,
        view,
        [chosen.at],
        "CHANNEL_RANGE",
        "ability-area:SUMMONING:chosen",
      );
    return;
  }
  const taken = new Set(targets.map((target) => key(target.at)));
  if (pick.kind === "RIBBIT") {
    for (const unit of view.units) {
      if (
        unit.ownerId === actor.ownerId ||
        chebyshev(unit.at, actor.at) > RIBBIT_RANGE_V7 ||
        taken.has(key(unit.at))
      )
        continue;
      const rejection = ribbitRejectionV7(view, actor, unit);
      if (rejection?.code !== "RIBBIT_NOT_LEGAL") continue;
      if (rejection.reason === "FROG") grey(unit.at, `${unit.id}`, "A frog");
      else if (rejection.reason === "IMMUNE")
        grey(unit.at, `${unit.id}`, "Cannot be hexed");
    }
    return;
  }
  if (pick.kind === "PROCLAIM") {
    const cowed = new Set(tricksOfV7(view).cowed.map((entry) => entry.cityId));
    for (const city of view.cities)
      if (
        cowed.has(city.id) &&
        city.ownerId !== actor.ownerId &&
        chebyshev(city.at, actor.at) <= PROCLAIM_RANGE_V7 &&
        !taken.has(key(city.at))
      )
        grey(city.at, `${city.id}`, COWED_LABEL_V7);
  }
}
