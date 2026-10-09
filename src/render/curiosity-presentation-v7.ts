import {
  FOUNTAIN_HEAL_V7,
  MONSTER_BOUNTY_V7,
  MONSTER_REGENERATION_V7,
  NEUTRAL_MONSTER_ROLE_RULE_V7,
  WRECK_COINS_V7,
  isNeutralOwnerV7,
  previewMonsterV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type CuriosityKindV7,
  type MonsterPreviewV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicUnitV7,
} from "../engine/index";
import type {
  CuriosityArtSubjectV7,
  CuriosityOverlayIdV7,
} from "../assets/chibi-art-v7";

/**
 * Map curiosities UI (bead pulp_wars-737.6,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 12.1): every
 * player-facing word about the Giant Spider, its lair, the Fountain of
 * Youth, the Shrine and the Sunken Wreck, and the public facts the board
 * and the dock read. No text names a tile by its coordinates (bead
 * pulp_wars-b5f.8), and every rule is one sentence.
 *
 * A match without a curiosity or a Monster never reaches any of this:
 * `matchHasCuriositiesV7` gates the board plan, the dock, Help and the
 * notices, so such a match is presented exactly as before.
 */

/** Whether the viewer knows of any curiosity or sees a Monster. */
export function matchHasCuriositiesV7(
  view: Pick<PlayerViewV7, "curiosities" | "monsters">,
): boolean {
  return view.curiosities.length > 0 || view.monsters.length > 0;
}

/** Whether the match was launched with the Curiosities option on. */
export function matchOffersCuriositiesV7(
  view: Pick<PlayerViewV7, "setup">,
): boolean {
  return view.setup.curiosities && view.setup.mapType !== "SHOWCASE";
}

export const SPIDER_LABEL_V7 = NEUTRAL_MONSTER_ROLE_RULE_V7.label;
/** The Spider's owner line and chip: it belongs to nobody. */
export const NEUTRAL_LABEL_V7 = "Neutral";
export const LAIR_LABEL_V7 = "Spider's lair";

export const CURIOSITY_LABELS_V7: Readonly<
  Record<CuriosityOverlayIdV7, string>
> = {
  WEB: LAIR_LABEL_V7,
  FOUNTAIN: "Fountain of Youth",
  SHRINE: "Shrine",
  WRECK: "Sunken Wreck",
};

/** The one sentence of each curiosity (section 1; the Help text). */
export const CURIOSITY_RULES_V7: Readonly<
  Record<CuriosityOverlayIdV7, string>
> = {
  WEB: `The ${SPIDER_LABEL_V7} wanders near its lair and, after every round, attacks the weakest unit that stood next to it or hurt it.`,
  FOUNTAIN: `A unit that starts its owner's turn here heals ${FOUNTAIN_HEAL_V7} HP.`,
  SHRINE:
    "The first unit that could be Promoted and ends a Move here is Promoted at once.",
  WRECK: `The first unit afloat that ends a Move here salvages ${WRECK_COINS_V7} Coins.`,
};

export const SPIDER_BOUNTY_RULE_V7 = `Killing the ${SPIDER_LABEL_V7} pays ${MONSTER_BOUNTY_V7} Coins.`;
export const CURIOSITIES_OPTION_RULE_V7 =
  "Rare. Switch them off with Curiosities when you set up a game.";
/** The setup checkbox's hint (section 3). */
export const CURIOSITIES_SETUP_HINT_V7 =
  "Rare sights on the map: a wandering monster, a Fountain of Youth, a Shrine, a Wreck.";

/** Section 12.1: the warning of a Move that ends next to the Spider. */
export const PROVOKE_MOVE_WARNING_V7 = `Ends next to the ${SPIDER_LABEL_V7}: it will attack after this round.`;
/** Section 12.1: `monsterRetaliates` in the combat preview. */
export const MONSTER_RETALIATES_V7 = "The spider will strike back next round";
/** `monsterRetaliates` false: the attacker stays out of its reach. */
export const MONSTER_OUT_OF_REACH_V7 = "Out of the spider's reach";
export const NEUTRAL_TURN_BANNER_V7 = "The wilds stir";
export const PROVOKED_LABEL_V7 = "Provoked";

export const curiosityIconSubjectV7 = (
  id: CuriosityOverlayIdV7 | "BOUNTY",
): CuriosityArtSubjectV7 => `ICON:CURIOSITY:${id}`;

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** Whether a visible unit is the neutral Giant Spider. */
export function isMonsterUnitV7(unit: Pick<PublicUnitV7, "ownerId">): boolean {
  return isNeutralOwnerV7(unit.ownerId);
}

/**
 * The round-1 tile markers this presentation draws. The round-2 kinds
 * (`pulp_wars-737.14`: camp centres, gates, the Well) are in the view but
 * drawn by the round-2 UI bead (`pulp_wars-737.16`); until then they are
 * not drawn.
 */
export type DrawnCuriosityKindV7 = Extract<
  CuriosityKindV7,
  "FOUNTAIN" | "SHRINE" | "WRECK"
>;

/** Whether this presentation draws a curiosity kind (see above). */
export function isDrawnCuriosityKindV7(
  kind: CuriosityKindV7,
): kind is DrawnCuriosityKindV7 {
  return kind === "FOUNTAIN" || kind === "SHRINE" || kind === "WRECK";
}

/** The explored curiosity this presentation draws on a tile, if any. */
export function curiosityOnTileV7(
  view: Pick<PlayerViewV7, "curiosities">,
  at: CoordV7,
): DrawnCuriosityKindV7 | null {
  const kind =
    view.curiosities.find((curiosity) => same(curiosity.at, at))?.kind ?? null;
  return kind !== null && isDrawnCuriosityKindV7(kind) ? kind : null;
}

/**
 * The lairs a viewer may see: the `home` of each visible Monster, on an
 * explored tile. A dead Monster's web goes with it (section 8.7).
 */
export function visibleLairsV7(
  view: Pick<PlayerViewV7, "monsters" | "board">,
): readonly CoordV7[] {
  return view.monsters.flatMap((entry) => {
    // Round 2: only the Spider has a web (a guard's home is its camp centre).
    if (entry.breed !== "GIANT_SPIDER") return [];
    const tile =
      view.board.tiles[entry.home.y * view.board.width + entry.home.x];
    return tile?.explored === true ? [entry.home] : [];
  });
}

/** What a tile shows of the curiosities: an overlay id, or null. */
export function curiosityOverlayOnTileV7(
  view: Pick<PlayerViewV7, "curiosities" | "monsters" | "board">,
  at: CoordV7,
): CuriosityOverlayIdV7 | null {
  return (
    curiosityOnTileV7(view, at) ??
    (visibleLairsV7(view).some((home) => same(home, at)) ? "WEB" : null)
  );
}

const PREVIEW_CACHE = new WeakMap<PlayerViewV7, readonly MonsterPreviewV7[]>();

/** The public preview of every visible Monster (cached per view). */
export function monsterPreviewsV7(
  view: PlayerViewV7,
): readonly MonsterPreviewV7[] {
  if (view.monsters.length === 0) return NO_PREVIEWS;
  const cached = PREVIEW_CACHE.get(view);
  if (cached !== undefined) return cached;
  const previews = view.monsters.flatMap((entry) => {
    const preview = previewMonsterV7(view, entry.unitId);
    return preview === null ? [] : [preview];
  });
  PREVIEW_CACHE.set(view, previews);
  return previews;
}
const NO_PREVIEWS: readonly MonsterPreviewV7[] = Object.freeze([]);

/**
 * Whether a Move of the viewer's unit ends on a visible Monster's provoke
 * tiles (next to it): the unit will be attacked after this round unless
 * something weaker is in reach.
 */
export function moveProvokesMonsterV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { readonly kind: "MOVE" }>,
): boolean {
  const end = command.path.at(-1);
  if (end === undefined || view.monsters.length === 0) return false;
  return monsterPreviewsV7(view).some((preview) =>
    preview.provokeTiles.some((at) => same(at, end)),
  );
}

function unitName(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "role">,
): string {
  return unitRoleRuleV7(view, unit).label;
}

/** "your Fighter", "Player 2's Fighter". */
function ownedUnitName(view: PlayerViewV7, unit: PublicUnitV7): string {
  if (unit.ownerId === view.viewer.id) return `your ${unitName(view, unit)}`;
  const owner = view.players.find((player) => player.id === unit.ownerId);
  return owner === undefined
    ? unitName(view, unit)
    : `Player ${owner.seat + 1}'s ${unitName(view, unit)}`;
}

export interface CuriosityInfoLineV7 {
  readonly id: "neutral" | "regeneration" | "bounty" | "provoked" | "calm";
  readonly name: string;
  readonly description: string;
}

/**
 * Section 12.1 "Panels": the Spider's lines in its dock (its one sentence,
 * its regeneration, its bounty, and whom it will attack).
 */
export function monsterInfoLinesV7(
  view: PlayerViewV7,
  unitId: number,
): readonly CuriosityInfoLineV7[] {
  const preview = monsterPreviewsV7(view).find(
    (candidate) => candidate.unitId === unitId,
  );
  if (preview === undefined) return [];
  const target =
    preview.likelyTarget === null
      ? undefined
      : view.units.find((unit) => unit.id === preview.likelyTarget);
  return [
    {
      id: "neutral",
      name: NEUTRAL_LABEL_V7,
      description: CURIOSITY_RULES_V7.WEB,
    },
    {
      id: "regeneration",
      name: "Regenerates",
      description: `+${MONSTER_REGENERATION_V7} HP after every round.`,
    },
    {
      id: "bounty",
      name: "Bounty",
      description: `${MONSTER_BOUNTY_V7} Coins for the kill.`,
    },
    target === undefined
      ? preview.provokers.length > 0
        ? {
            id: "provoked",
            name: PROVOKED_LABEL_V7,
            description: "Its provokers are out of its reach.",
          }
        : {
            id: "calm",
            name: "Calm",
            description: "Nothing it can see has provoked it.",
          }
      : {
          id: "provoked",
          name: PROVOKED_LABEL_V7,
          description: `Will attack ${ownedUnitName(view, target)} after this round${preview.exact ? "" : ", unless something weaker hides nearby"}.`,
        },
  ];
}

/** Whether a visible Monster has a visible provoker (its board marker). */
export function monsterProvokedV7(view: PlayerViewV7, unitId: number): boolean {
  return (
    (monsterPreviewsV7(view).find((preview) => preview.unitId === unitId)
      ?.provokers.length ?? 0) > 0
  );
}

/**
 * Section 12.1 Help: "Curiosities", the four sentences of section 1, the
 * bounty, and the setup option, each with its legend icon.
 */
export function curiosityHelpRulesV7(): readonly {
  readonly icon: CuriosityOverlayIdV7 | "BOUNTY" | null;
  readonly name: string;
  readonly rule: string;
}[] {
  return [
    { icon: "WEB", name: SPIDER_LABEL_V7, rule: CURIOSITY_RULES_V7.WEB },
    {
      icon: "FOUNTAIN",
      name: CURIOSITY_LABELS_V7.FOUNTAIN,
      rule: CURIOSITY_RULES_V7.FOUNTAIN,
    },
    {
      icon: "SHRINE",
      name: CURIOSITY_LABELS_V7.SHRINE,
      rule: CURIOSITY_RULES_V7.SHRINE,
    },
    {
      icon: "WRECK",
      name: CURIOSITY_LABELS_V7.WRECK,
      rule: CURIOSITY_RULES_V7.WRECK,
    },
    { icon: "BOUNTY", name: "Bounty", rule: SPIDER_BOUNTY_RULE_V7 },
    { icon: null, name: "Setup", rule: CURIOSITIES_OPTION_RULE_V7 },
  ];
}

/**
 * Section 12.1 log lines of one projected boundary: a Fountain heal, a
 * Shrine claim, a salvaged Wreck, the Spider's death and its bounty, and
 * the neutral turn ("The wilds stir" when the viewer saw the Spider move or
 * attack; nothing when nothing visible happened). A match without
 * curiosities never emits these events, so its notices are unchanged.
 */
export function curiosityBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  if (!matchOffersCuriositiesV7(after)) return null;
  const viewerId = after.viewer.id;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    before.units.find((unit) => unit.id === id) ??
    after.units.find((unit) => unit.id === id);
  const monsterIds = new Set(
    [...before.monsters, ...after.monsters].map((entry) => entry.unitId),
  );
  const parts: string[] = [];
  let toast = false;
  let neutralTurn = false;
  let stirred = false;
  const bounty = events.find(
    (event) =>
      event.kind === "MONSTER_BOUNTY_AWARDED" && event.playerId === viewerId,
  );
  for (const event of events) {
    if (event.kind === "NEUTRAL_TURN_STARTED") neutralTurn = true;
    else if (event.kind === "NEUTRAL_TURN_ENDED") neutralTurn = false;
    else if (event.kind === "FOUNTAIN_HEALED") {
      // Another player's heal is seen on the board (the droplets and its
      // "+N"); only the viewer's own is logged, to keep the log short.
      if (event.playerId !== viewerId) continue;
      const unit = unitById(event.unitId);
      toast = true;
      parts.push(
        `${CURIOSITY_LABELS_V7.FOUNTAIN}: ${unit === undefined ? "a unit" : ownedUnitName(after, unit)} +${event.amount} HP`,
      );
    } else if (event.kind === "SHRINE_CLAIMED") {
      const unit = unitById(event.unitId);
      if (event.playerId === viewerId) toast = true;
      parts.push(
        `${CURIOSITY_LABELS_V7.SHRINE}: ${unit === undefined ? "a unit" : ownedUnitName(after, unit)} was Promoted`,
      );
    } else if (event.kind === "WRECK_SALVAGED") {
      if (event.playerId === viewerId) toast = true;
      const owner = after.players.find(
        (player) => player.id === event.playerId,
      );
      parts.push(
        event.playerId === viewerId
          ? `Wreck salvaged: +${event.coins} Coins`
          : `Wreck salvaged by ${owner === undefined ? "an enemy" : `Player ${owner.seat + 1}`}`,
      );
    } else if (event.kind === "UNIT_DIED" && monsterIds.has(event.unitId)) {
      toast = true;
      parts.push(
        bounty?.kind === "MONSTER_BOUNTY_AWARDED"
          ? `${SPIDER_LABEL_V7} slain: +${bounty.coins} Coins bounty`
          : `${SPIDER_LABEL_V7} slain`,
      );
    } else if (
      neutralTurn &&
      event.kind === "UNIT_MOVED" &&
      monsterIds.has(event.unitId)
    )
      stirred = true;
    else if (
      neutralTurn &&
      event.kind === "COMBAT_RESOLVED" &&
      monsterIds.has(event.preview.attackerId)
    ) {
      stirred = true;
      const target = unitById(event.preview.targetUnitId);
      if (target === undefined) continue;
      if (target.ownerId === viewerId) toast = true;
      parts.push(
        `${SPIDER_LABEL_V7} attacked ${ownedUnitName(after, target)}${event.preview.defenderDies ? ", killing it" : ""}`,
      );
    }
  }
  if (stirred) parts.unshift(NEUTRAL_TURN_BANNER_V7);
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
