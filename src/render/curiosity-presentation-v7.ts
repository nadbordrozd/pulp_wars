import {
  BIGFOOT_ALERT_RADIUS_V7,
  BIGFOOT_BOUNTY_V7,
  CAMP_RADIUS_V7,
  FOUNTAIN_HEAL_V7,
  MONSTER_BOUNTY_V7,
  MONSTER_REGENERATION_V7,
  NEUTRAL_BOUNTIES_V7,
  NEUTRAL_MONSTER_ROLE_RULE_V7,
  NEUTRAL_ROLE_RULES_V7,
  WELL_COINS_V7,
  WELL_TOSS_COST_V7,
  WELL_VISION_RADIUS_V7,
  WRECK_COINS_V7,
  guardCampKindV7,
  isNeutralOwnerV7,
  neutralBreedOfV7,
  previewGateV7,
  previewMonsterV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type CuriosityKindV7,
  type FactionIdV7,
  type GatePreviewV7,
  type MonsterPreviewV7,
  type NeutralBreedV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicCombatPreviewV7,
  type PublicUnitV7,
  type UnitRoleIdV7,
  type UnitId,
} from "../engine/index";
import {
  unitArtSubjectV7,
  type ArtSubjectV7,
  type CuriosityOverlayIdV7,
  type CuriosityRound2OverlayIdV7,
} from "../assets/chibi-art-v7";
import { portraitSubjectV7 } from "../assets/chibi-ui-art-v7";

/**
 * Map curiosities UI (bead pulp_wars-737.6,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 12.1; round 2, bead
 * pulp_wars-737.16, section 34.1): every player-facing word about the
 * Giant Spider, its lair, the Fountain of Youth, the Shrine, the Sunken
 * Wreck, the Downed Saucer and the Graveyard with their guards, the
 * Dimensional Gates, Bigfoot and the Wishing Well, and the public facts the
 * board and the dock read. No text names a tile by its coordinates (bead
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

/**
 * Every tile overlay of both rounds: the round-1 lair web and three tile
 * markers, and the round-2 camp centres, the gate and the Well. A
 * curiosity kind of the view is its own overlay id.
 */
export type CuriosityTileIdV7 =
  CuriosityOverlayIdV7 | CuriosityRound2OverlayIdV7;

export const CURIOSITY_LABELS_V7: Readonly<Record<CuriosityTileIdV7, string>> =
  {
    WEB: LAIR_LABEL_V7,
    FOUNTAIN: "Fountain of Youth",
    SHRINE: "Shrine",
    WRECK: "Sunken Wreck",
    DOWNED_SAUCER: "Downed Saucer",
    GRAVEYARD: "Graveyard",
    GATE: "Dimensional Gate",
    WISHING_WELL: "Wishing Well",
  };

export const BIGFOOT_LABEL_V7 = NEUTRAL_ROLE_RULES_V7.BIGFOOT.label;

/** The one sentence of each curiosity (sections 1 and 23; the Help text). */
export const CURIOSITY_RULES_V7: Readonly<Record<CuriosityTileIdV7, string>> = {
  WEB: `The ${SPIDER_LABEL_V7} wanders near its lair and, after every round, attacks the weakest unit that stood next to it or hurt it.`,
  FOUNTAIN: `A unit that starts its owner's turn here heals ${FOUNTAIN_HEAL_V7} HP.`,
  SHRINE:
    "The first unit that could be Promoted and ends a Move here is Promoted at once.",
  WRECK: `The first unit afloat that ends a Move here salvages ${WRECK_COINS_V7} Coins.`,
  DOWNED_SAUCER: `Stranded Martians guard a crashed saucer and, after every round, attack the weakest unit that came within ${CAMP_RADIUS_V7} of the saucer, stood next to them, or hurt them.`,
  GRAVEYARD:
    "Two Zombies shamble around a graveyard and, after every round, attack the weakest unit they can reach.",
  GATE: "A unit that steps onto a gate comes out of the other one, shoving aside any unit standing there.",
  WISHING_WELL:
    "Once per match, each player may have a unit standing on the Well toss a Coin into it for a small surprise.",
};

/** Bigfoot's one sentence (section 23). */
export const BIGFOOT_RULE_V7 = `A shy ${BIGFOOT_LABEL_V7} roams its forest, never fights, flees from any unit that comes within ${BIGFOOT_ALERT_RADIUS_V7}, and pays ${BIGFOOT_BOUNTY_V7} Coins to whoever brings it down.`;

export const SPIDER_BOUNTY_RULE_V7 = `Killing the ${SPIDER_LABEL_V7} pays ${MONSTER_BOUNTY_V7} Coins.`;
export const CURIOSITIES_OPTION_RULE_V7 =
  "Rare. Switch them off with Curiosities when you set up a game.";
/** The setup checkbox's hint (section 3). */
export const CURIOSITIES_SETUP_HINT_V7 =
  "Rare sights on the map: monsters, camps, gates, a well, and more.";

export const NEUTRAL_TURN_BANNER_V7 = "The wilds stir";
export const PROVOKED_LABEL_V7 = "Provoked";

/** The legend icons: every tile overlay, the bounty and Bigfoot. */
export type CuriosityIconIdV7 = CuriosityTileIdV7 | "BOUNTY" | "BIGFOOT";

export const curiosityIconSubjectV7 = (id: CuriosityIconIdV7): ArtSubjectV7 =>
  `ICON:CURIOSITY:${id}`;

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/**
 * Whether a visible unit is a neutral unit (the Giant Spider, a camp guard
 * or Bigfoot): it belongs to nobody and every reader presents it through
 * this module first.
 */
export function isMonsterUnitV7(unit: Pick<PublicUnitV7, "ownerId">): boolean {
  return isNeutralOwnerV7(unit.ownerId);
}

/** The breed of a visible neutral unit (its `monsters` entry). */
export function neutralBreedOfUnitV7(
  view: Pick<PlayerViewV7, "monsters">,
  unit: {
    readonly id: number;
    readonly role: UnitRoleIdV7;
    readonly maxHp?: number;
  },
): NeutralBreedV7 {
  return neutralBreedOfV7(view, unit);
}

/** A neutral unit's name: "Giant Spider", "Grunt", "Zombie", "Bigfoot". */
export function neutralUnitLabelV7(breed: NeutralBreedV7): string {
  return breed === "GIANT_SPIDER"
    ? SPIDER_LABEL_V7
    : NEUTRAL_ROLE_RULES_V7[breed].label;
}

/**
 * The faction whose sprite a camp guard wears (section 34.2: the Martian
 * Grunt, Ray Gunner and Shield Projector, the Undead Zombie), or null for
 * the Spider and Bigfoot, which have sprites of their own.
 */
export function neutralArtFactionV7(breed: NeutralBreedV7): FactionIdV7 | null {
  const camp = guardCampKindV7(breed);
  return camp === "DOWNED_SAUCER"
    ? "MARTIAN"
    : camp === "GRAVEYARD"
      ? "UNDEAD"
      : null;
}

/**
 * The art of a neutral unit: its board sprite and its portrait. The Spider
 * and Bigfoot have their own; a guard wears its faction's sprite with no
 * owner colour (never a faction badge: it names no player).
 */
export function neutralArtSubjectsV7(
  breed: NeutralBreedV7,
  role: UnitRoleIdV7,
): { readonly unit: ArtSubjectV7; readonly portrait: ArtSubjectV7 } {
  if (breed === "GIANT_SPIDER")
    return {
      unit: "UNIT:MONSTER_GIANT_SPIDER",
      portrait: "PORTRAIT:MONSTER_GIANT_SPIDER",
    };
  if (breed === "BIGFOOT")
    return {
      unit: "UNIT:NEUTRAL_BIGFOOT",
      portrait: "PORTRAIT:NEUTRAL_BIGFOOT",
    };
  const faction = neutralArtFactionV7(breed) ?? "MARTIAN";
  return {
    unit: unitArtSubjectV7({ role, form: "LAND", faction }),
    portrait: portraitSubjectV7(role, faction),
  };
}

/** Every curiosity kind is drawn (round 2, bead pulp_wars-737.16). */
export type DrawnCuriosityKindV7 = CuriosityKindV7;

/** The explored curiosity on a tile, if any. */
export function curiosityOnTileV7(
  view: Pick<PlayerViewV7, "curiosities">,
  at: CoordV7,
): DrawnCuriosityKindV7 | null {
  return (
    view.curiosities.find((curiosity) => same(curiosity.at, at))?.kind ?? null
  );
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
): CuriosityTileIdV7 | null {
  return (
    curiosityOnTileV7(view, at) ??
    (visibleLairsV7(view).some((home) => same(home, at)) ? "WEB" : null)
  );
}

const PREVIEW_CACHE = new WeakMap<PlayerViewV7, readonly MonsterPreviewV7[]>();

/** The public preview of every visible neutral unit (cached per view). */
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
 * Whether a neutral unit attacks: every breed but Bigfoot, which never
 * fights (its "provoke" tiles only make it flee).
 */
export function hostileBreedV7(breed: NeutralBreedV7): boolean {
  return breed !== "BIGFOOT";
}

/** Section 12.1: the warning of a Move that ends next to the Spider. */
export const PROVOKE_MOVE_WARNING_V7 = `Ends next to the ${SPIDER_LABEL_V7}: it will attack after this round.`;
/** Section 34.1: the same warning for a Downed Saucer's guards. */
export const SAUCER_PROVOKE_WARNING_V7 = `Ends too close to the ${CURIOSITY_LABELS_V7.DOWNED_SAUCER}: its guards will attack after this round.`;
/** Section 34.1: the same warning for a Graveyard's Zombies. */
export const GRAVEYARD_PROVOKE_WARNING_V7 =
  "Ends in the Zombies' reach: they will attack after this round.";

/** The hostile neutral previews whose provoke tiles hold `end`. */
function provokedAt(
  view: PlayerViewV7,
  end: CoordV7,
): readonly MonsterPreviewV7[] {
  return monsterPreviewsV7(view).filter(
    (preview) =>
      hostileBreedV7(preview.breed) &&
      preview.provokeTiles.some((at) => same(at, end)),
  );
}

/**
 * Whether a Move of the viewer's unit ends on the provoke tiles of a
 * visible hostile neutral unit (next to the Spider, too close to a saucer
 * camp, in the Zombies' reach): the unit will be attacked after this round
 * unless something weaker is in reach. Bigfoot never attacks.
 */
export function moveProvokesMonsterV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { readonly kind: "MOVE" }>,
): boolean {
  const end = command.path.at(-1);
  if (end === undefined || view.monsters.length === 0) return false;
  return provokedAt(view, end).length > 0;
}

/** The sentence of a provoking Move (the Spider's first, as in round 1). */
export function provokeMoveWarningV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { readonly kind: "MOVE" }>,
): string | null {
  const end = command.path.at(-1);
  if (end === undefined || view.monsters.length === 0) return null;
  const breeds = new Set(provokedAt(view, end).map((preview) => preview.breed));
  if (breeds.has("GIANT_SPIDER")) return PROVOKE_MOVE_WARNING_V7;
  if (breeds.has("ZOMBIE")) return GRAVEYARD_PROVOKE_WARNING_V7;
  return breeds.size > 0 ? SAUCER_PROVOKE_WARNING_V7 : null;
}

/** Section 12.1: `monsterRetaliates` in the combat preview. */
export const MONSTER_RETALIATES_V7 = "The spider will strike back next round";
/** `monsterRetaliates` false: the attacker stays out of its reach. */
export const MONSTER_OUT_OF_REACH_V7 = "Out of the spider's reach";
export const BIGFOOT_NEVER_FIGHTS_V7 = "Bigfoot never fights back";

/**
 * The combat preview's note on an attack on a visible neutral unit: whether
 * it (or, for a camp, any guard of the camp) strikes back next round. Null
 * when the attack kills either side or the target is not neutral.
 */
export function monsterRetaliationNoteV7(
  view: PlayerViewV7,
  preview: Pick<
    PublicCombatPreviewV7,
    "monsterRetaliates" | "defenderDies" | "attackerDies" | "targetUnitId"
  >,
): string | null {
  if (preview.monsterRetaliates === undefined) return null;
  const target = view.units.find((unit) => unit.id === preview.targetUnitId);
  const breed =
    target === undefined ? "GIANT_SPIDER" : neutralBreedOfUnitV7(view, target);
  if (breed === "BIGFOOT")
    return preview.defenderDies ? null : BIGFOOT_NEVER_FIGHTS_V7;
  if (
    !preview.monsterRetaliates &&
    (preview.defenderDies || preview.attackerDies)
  )
    return null;
  if (breed === "GIANT_SPIDER")
    return preview.monsterRetaliates
      ? MONSTER_RETALIATES_V7
      : MONSTER_OUT_OF_REACH_V7;
  const who = breed === "ZOMBIE" ? "Zombies" : "guards";
  return preview.monsterRetaliates
    ? `The ${who} will strike back next round`
    : `Out of the ${who}' reach`;
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
  readonly id:
    "neutral" | "regeneration" | "bounty" | "provoked" | "calm" | "alert";
  readonly name: string;
  readonly description: string;
}

/** The one sentence a neutral unit's dock gives for its breed. */
export function neutralRuleV7(breed: NeutralBreedV7): string {
  const camp = guardCampKindV7(breed);
  return breed === "BIGFOOT"
    ? BIGFOOT_RULE_V7
    : camp === null
      ? CURIOSITY_RULES_V7.WEB
      : CURIOSITY_RULES_V7[camp];
}

export const ALERT_LABEL_V7 = "Alert";

/**
 * Section 12.1 "Panels" (round 2, section 34.1): a neutral unit's lines in
 * its dock: its one sentence, the Spider's regeneration, its bounty, and
 * whom it will attack (Bigfoot: whether a unit is close enough to make it
 * flee).
 */
export function monsterInfoLinesV7(
  view: PlayerViewV7,
  unitId: number,
): readonly CuriosityInfoLineV7[] {
  const preview = monsterPreviewsV7(view).find(
    (candidate) => candidate.unitId === unitId,
  );
  if (preview === undefined) return [];
  const breed = preview.breed;
  const bounty: CuriosityInfoLineV7 = {
    id: "bounty",
    name: "Bounty",
    description: `${NEUTRAL_BOUNTIES_V7[breed]} Coins for the kill.`,
  };
  const neutral: CuriosityInfoLineV7 = {
    id: "neutral",
    name: NEUTRAL_LABEL_V7,
    description: neutralRuleV7(breed),
  };
  if (breed === "BIGFOOT")
    return [
      neutral,
      bounty,
      preview.provokers.length > 0
        ? {
            id: "alert",
            name: ALERT_LABEL_V7,
            description: "A unit is too close: it will flee after this round.",
          }
        : {
            id: "calm",
            name: "Calm",
            description: "Nothing it can see is close enough to scare it.",
          },
    ];
  const target =
    preview.likelyTarget === null
      ? undefined
      : view.units.find((unit) => unit.id === preview.likelyTarget);
  const provoked = visibleProvokers(preview).length > 0;
  return [
    neutral,
    ...(breed === "GIANT_SPIDER"
      ? [
          {
            id: "regeneration" as const,
            name: "Regenerates",
            description: `+${MONSTER_REGENERATION_V7} HP after every round.`,
          },
        ]
      : []),
    breed === "GIANT_SPIDER"
      ? {
          id: "bounty",
          name: "Bounty",
          description: `${MONSTER_BOUNTY_V7} Coins for the kill.`,
        }
      : bounty,
    target === undefined
      ? provoked
        ? {
            id: "provoked",
            name: PROVOKED_LABEL_V7,
            description: "Its provokers are out of its reach.",
          }
        : {
            id: "calm",
            name: "Calm",
            description:
              breed === "ZOMBIE"
                ? "No unit it can see is in its reach."
                : "Nothing it can see has provoked it.",
          }
      : {
          id: "provoked",
          name: PROVOKED_LABEL_V7,
          description: `Will attack ${ownedUnitName(view, target)} after this round${preview.exact ? "" : ", unless something weaker hides nearby"}.`,
        },
  ];
}

/**
 * Whether a visible hostile neutral unit has a visible provoker (its board
 * marker). Bigfoot is never provoked: a unit near it makes it flee.
 */
export function monsterProvokedV7(view: PlayerViewV7, unitId: number): boolean {
  const preview = monsterPreviewsV7(view).find(
    (candidate) => candidate.unitId === unitId,
  );
  return (
    preview !== undefined &&
    hostileBreedV7(preview.breed) &&
    visibleProvokers(preview).length > 0
  );
}

/**
 * The provokers a dock and the provoked marker name. A Graveyard's
 * Zombies attack anyone on sight (section 25.4), so every visible unit is
 * a provoker of theirs; they are shown provoked only while one is in their
 * reach (their likely target).
 */
function visibleProvokers(preview: MonsterPreviewV7): readonly UnitId[] {
  if (preview.breed !== "ZOMBIE") return preview.provokers;
  return preview.likelyTarget === null ? [] : [preview.likelyTarget];
}

// ------------------------------------------------------------ Round 2 ---

/**
 * A camp as the viewer knows it: its centre, its kind, and the visible
 * previews of its guards (section 25).
 */
export interface CampViewV7 {
  readonly kind: "DOWNED_SAUCER" | "GRAVEYARD";
  readonly centre: CoordV7;
  readonly guards: readonly MonsterPreviewV7[];
}

/** The camp whose centre is `centre`, with its visible guards, if any. */
export function campAtV7(
  view: PlayerViewV7,
  centre: CoordV7,
): CampViewV7 | null {
  const marker = view.curiosities.find(
    (curiosity) =>
      (curiosity.kind === "DOWNED_SAUCER" || curiosity.kind === "GRAVEYARD") &&
      same(curiosity.at, centre),
  );
  if (
    marker === undefined ||
    (marker.kind !== "DOWNED_SAUCER" && marker.kind !== "GRAVEYARD")
  )
    return null;
  return {
    kind: marker.kind,
    centre: marker.at,
    guards: monsterPreviewsV7(view).filter(
      (preview) =>
        guardCampKindV7(preview.breed) === marker.kind &&
        same(preview.home, centre),
    ),
  };
}

/** The partner of the gate on `at`, if the viewer knows a gate there. */
export function gatePartnerV7(
  view: Pick<PlayerViewV7, "curiosities">,
  at: CoordV7,
): CoordV7 | null {
  const gate = view.curiosities.find(
    (curiosity) => curiosity.kind === "GATE" && same(curiosity.at, at),
  );
  return gate?.kind === "GATE" ? gate.partner : null;
}

export const GATE_EXIT_LABEL_V7 = "Exit";
export const GATE_SHOVED_LABEL_V7 = "Shoved";
export const GATE_BLOCKED_LABEL_V7 = "Blocked";
/** A selected gate's partner on the board. */
export const GATE_PARTNER_LABEL_V7 = "Other gate";

/**
 * Section 34.1 "Move preview": a Move of the viewer's unit that ends on a
 * gate: the gate preview (its exit, the occupant shoved aside and where to,
 * or blocked), its short label and its sentence. Null when the Move does
 * not end on a gate.
 */
export function gateMovePreviewV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { readonly kind: "MOVE" }>,
): {
  readonly preview: GatePreviewV7;
  readonly label: string;
  readonly sentence: string;
} | null {
  const end = command.path.at(-1);
  if (end === undefined || gatePartnerV7(view, end) === null) return null;
  const preview = previewGateV7(view, command.unitId as UnitId, end);
  if (preview === null) return null;
  const occupant =
    preview.displaces === null
      ? undefined
      : view.units.find((unit) => unit.id === preview.displaces);
  const occupantName =
    occupant === undefined ? "the unit there" : ownedUnitName(view, occupant);
  if (preview.blocked)
    return {
      preview,
      label: `Gate ${GATE_BLOCKED_LABEL_V7.toLowerCase()}`,
      sentence: `Gate blocked: ${occupantName} on the other gate has nowhere to go, so this unit stays on this gate${preview.exact ? "" : ", unless that unit can climb Mountains"}.`,
    };
  return {
    preview,
    label: occupant === undefined ? "Gate" : "Gate · shoves",
    sentence:
      occupant === undefined
        ? "Steps through the gate and comes out of the other one."
        : `Steps through the gate and comes out of the other one, shoving ${occupantName} aside.`,
  };
}

/** Section 34.1 "Well": the command's label and its tooltip. */
export const TOSS_COIN_LABEL_V7 = "Toss a Coin";
export const TOSS_COIN_TOOLTIP_V7 = `Toss ${WELL_TOSS_COST_V7} Coin into the ${CURIOSITY_LABELS_V7.WISHING_WELL}: a splash, ${WELL_COINS_V7} Coins, a full heal, or the land around it revealed. Once per match`;

/** The Well's line for the viewer in its tile dock. */
export function wellStatusLineV7(
  view: PlayerViewV7,
  at: CoordV7,
): string | null {
  const well = view.curiosities.find(
    (curiosity) => curiosity.kind === "WISHING_WELL" && same(curiosity.at, at),
  );
  if (well?.kind !== "WISHING_WELL") return null;
  return well.tossedBy.includes(view.viewer.id)
    ? "You have tossed your Coin."
    : `Stand a unit on it to toss ${WELL_TOSS_COST_V7} Coin.`;
}

/** What a toss brought, as its toast says it. */
export function wellOutcomeTextV7(
  view: PlayerViewV7,
  event: Extract<PlayerEventV7, { readonly kind: "COIN_TOSSED" }>,
  unit: PublicUnitV7 | undefined,
): string {
  const label = CURIOSITY_LABELS_V7.WISHING_WELL;
  if (event.playerId !== view.viewer.id) {
    const owner = view.players.find((player) => player.id === event.playerId);
    return `${owner === undefined ? "An enemy" : `Player ${owner.seat + 1}`} tossed a Coin into the ${label}`;
  }
  switch (event.outcome) {
    case "SPLASH":
      return `${label}: just a splash`;
    case "COINS":
      return `${label}: +${event.coinsGained} Coins`;
    case "HEAL":
      return `${label}: ${unit === undefined ? "your unit" : ownedUnitName(view, unit)} is fully healed`;
    case "VISION":
      return `${label}: the land within ${WELL_VISION_RADIUS_V7} is revealed`;
  }
}

/**
 * Section 12.1 Help (round 2, section 34.1): the sentences of every
 * curiosity, the bounty, and the setup option, each with its legend icon.
 * The in-game Help stays short (bead pulp_wars-2yc.39); these lines are
 * the curiosities' own reference (the tile dock and the Gallery say each).
 */
export function curiosityHelpRulesV7(): readonly {
  readonly icon: CuriosityIconIdV7 | null;
  readonly name: string;
  readonly rule: string;
}[] {
  return [
    { icon: "WEB", name: SPIDER_LABEL_V7, rule: CURIOSITY_RULES_V7.WEB },
    ...(
      [
        "FOUNTAIN",
        "SHRINE",
        "WRECK",
        "DOWNED_SAUCER",
        "GRAVEYARD",
        "GATE",
      ] as const
    ).map((id) => ({
      icon: id,
      name: CURIOSITY_LABELS_V7[id],
      rule: CURIOSITY_RULES_V7[id],
    })),
    { icon: "BIGFOOT", name: BIGFOOT_LABEL_V7, rule: BIGFOOT_RULE_V7 },
    {
      icon: "WISHING_WELL",
      name: CURIOSITY_LABELS_V7.WISHING_WELL,
      rule: CURIOSITY_RULES_V7.WISHING_WELL,
    },
    { icon: "BOUNTY", name: "Bounty", rule: SPIDER_BOUNTY_RULE_V7 },
    { icon: null, name: "Setup", rule: CURIOSITIES_OPTION_RULE_V7 },
  ];
}

/**
 * Section 12.1 log lines of one projected boundary (round 2, section
 * 34.1): a Fountain heal, a Shrine claim, a salvaged Wreck, a gate
 * traversal, displacement or block, a coin toss, a neutral unit's death
 * and its bounty, and the neutral turn ("The wilds stir" when the viewer
 * saw a neutral unit move or attack; nothing when nothing visible
 * happened). A match without curiosities never emits these events, so its
 * notices are unchanged.
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
  const breeds = new Map(
    [...before.monsters, ...after.monsters].map(
      (entry) => [entry.unitId as number, entry.breed] as const,
    ),
  );
  const neutralName = (id: number): string =>
    neutralUnitLabelV7(breeds.get(id) ?? "GIANT_SPIDER");
  const parts: string[] = [];
  let toast = false;
  let neutralTurn = false;
  let stirred = false;
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
    } else if (event.kind === "GATE_TRAVERSED") {
      const unit = unitById(event.unitId);
      parts.push(
        `${unit === undefined ? "A unit" : capitalized(ownedUnitName(after, unit))} stepped through the gate`,
      );
    } else if (event.kind === "GATE_DISPLACED") {
      const unit = unitById(event.unitId);
      if (unit?.ownerId === viewerId) toast = true;
      parts.push(
        `Gate: ${unit === undefined ? "a unit" : ownedUnitName(after, unit)} was shoved aside`,
      );
    } else if (event.kind === "GATE_BLOCKED") {
      const unit = unitById(event.unitId);
      if (event.playerId === viewerId) toast = true;
      parts.push(
        `Gate blocked: ${unit === undefined ? "a unit" : ownedUnitName(after, unit)} stays put`,
      );
    } else if (event.kind === "COIN_TOSSED") {
      if (event.playerId === viewerId) toast = true;
      parts.push(wellOutcomeTextV7(after, event, unitById(event.unitId)));
    } else if (event.kind === "UNIT_DIED" && breeds.has(event.unitId)) {
      toast = true;
      const bounty = events.find(
        (candidate) =>
          candidate.kind === "MONSTER_BOUNTY_AWARDED" &&
          candidate.playerId === viewerId &&
          candidate.unitId === event.unitId,
      );
      parts.push(
        bounty?.kind === "MONSTER_BOUNTY_AWARDED"
          ? `${neutralName(event.unitId)} slain: +${bounty.coins} Coins bounty`
          : `${neutralName(event.unitId)} slain`,
      );
    } else if (
      neutralTurn &&
      event.kind === "UNIT_MOVED" &&
      breeds.has(event.unitId)
    )
      stirred = true;
    else if (
      neutralTurn &&
      event.kind === "COMBAT_RESOLVED" &&
      breeds.has(event.preview.attackerId)
    ) {
      stirred = true;
      const target = unitById(event.preview.targetUnitId);
      if (target === undefined) continue;
      if (target.ownerId === viewerId) toast = true;
      parts.push(
        `${neutralName(event.preview.attackerId)} attacked ${ownedUnitName(after, target)}${event.preview.defenderDies ? ", killing it" : ""}`,
      );
    }
  }
  if (stirred) parts.unshift(NEUTRAL_TURN_BANNER_V7);
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}

const capitalized = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);
