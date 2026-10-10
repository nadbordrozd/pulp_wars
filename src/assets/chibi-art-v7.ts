import type {
  AchievementIdV7,
  CommandV7,
  FactionIdV7,
  ImprovementIdV7,
  NavalRoleIdV7,
  ResourceIdV7,
  SummonedRoleIdV7,
  TechnologyIdV7,
  TerrainIdV7,
  UnitFormV7,
  UnitRoleIdV7,
} from "../engine/index";

/**
 * Ruleset 7 art sets. LEGACY is the default production art; CHIBI is the
 * opt-in migration target described in docs/art/CHIBI_ART_DIRECTION.md.
 */
export type ArtSetV7 = "LEGACY" | "CHIBI";

/**
 * Art-set-neutral name of what a map entry depicts. Batch beads register
 * CHIBI rasters against these subjects; a subject without a registered
 * raster falls back to its legacy asset drawn at the chibi geometry.
 */
export type ArtSubjectV7 =
  | `TERRAIN:${TerrainIdV7 | "MINED_MOUNTAIN"}`
  /**
   * The Rift (bead pulp_wars-9s0.5): the three pieces of a 1 x 3 crack in
   * each orientation, west to east and north to south.
   */
  | `TERRAIN:RIFT_${RiftPieceV7}`
  | `RESOURCE:${ResourceIdV7}`
  | `IMPROVEMENT:${ImprovementIdV7}`
  /**
   * Faction building looks (epic pulp_wars-xdh, FACTION_BUILDINGS.md): an
   * improvement as the faction that owns its territory draws it, and the
   * Undead territory ground. Each falls back to its shared subject
   * (chibiFallbackSubjectV7).
   */
  | FactionImprovementSubjectV7
  | MonumentArtSubjectV7
  | FactionTerrainSubjectV7
  | `UNIT:${UnitRoleIdV7 | "EMBARKED_TRANSPORT" | "SUBMARINE_SUBMERGED"}`
  | `UNIT:UNDEAD:${UndeadArtRoleV7}`
  /** Revision 17: the Goblin units (bead pulp_wars-0ao.8, GOBLIN.md). */
  | `UNIT:GOBLIN:${GoblinArtRoleV7}`
  /**
   * Revision 19: the Dinosaur units and the one Egg sprite shared by every
   * role (bead pulp_wars-c87.7, DINOSAUR.md).
   */
  | `UNIT:DINOSAUR:${DinosaurArtRoleV7 | "EGG"}`
  /**
   * The Martian units (bead pulp_wars-t6s.6, MARTIAN.md), registered in the
   * direction registry since the UI bead (pulp_wars-t6s.4). The Thrall
   * sprite is retired (bead pulp_wars-b5f.3): a mind-controlled unit keeps
   * its own kind's sprite.
   */
  | `UNIT:MARTIAN:${MartianArtRoleV7}`
  | `CITY:${1 | 2 | 3}`
  /**
   * Faction city sets (bead pulp_wars-6gd.6): the Undead necropolis and the
   * Goblin scrap camp, one raster per art level like the Human `CITY:<level>`;
   * the Dinosaur bone-and-hide camp joined them in bead pulp_wars-c87.7.
   */
  | `CITY:${CityArtFactionV7}:${1 | 2 | 3}`
  | "SITE:VILLAGE"
  | "TREASURE"
  /** Revision 13: the unowned Grave marker left by a fallen land unit. */
  | "GRAVE"
  | UiArtSubjectV7
  | ChibiEffectSubjectV7
  | MartianArtSubjectV7
  | IceFolkArtSubjectV7
  | NavalFactionArtSubjectV7
  | DwarfArtSubjectV7
  | CuriosityArtSubjectV7
  | CuriosityRound2ArtSubjectV7
  | CandyArtSubjectV7
  | CultArtSubjectV7
  | CultInterfaceArtSubjectV7
  | NavalBranchArtSubjectV7;

/**
 * Art of the naval branch beyond the ships (bead pulp_wars-5ti.6,
 * docs/product/RULESET_7_NAVAL_BRANCH.md section 14.3). `ICON:ACTION:RAM`
 * and `ICON:ACTION:TORPEDO` are the icons of the Ram and Torpedo abilities
 * (Board is a command, so its icon is `ICON:ACTION:BOARD`; Seamanship and
 * Submersibles are `ICON:TECH:<ID>`). `TERRAIN:ICE_SHALLOW` and
 * `TERRAIN:ICE_DEEP` are the Ice Folk sea ice over each water, and
 * `OVERLAY:ICEBOUND` the pack ice at the foot of a ship frozen in: an
 * 80 x 40 raster on the lower half of the ship's cell, drawn over the
 * hull. The three ice subjects are registered for the Ice Folk engine step
 * (the state `ice` is not in the engine yet); nothing asks for them today.
 */
export type NavalBranchArtSubjectV7 =
  | `ICON:ACTION:${"RAM" | "TORPEDO"}`
  | `TERRAIN:${SeaIceArtIdV7}`
  | "OVERLAY:ICEBOUND";

/** The two looks of sea ice: over Shallow Water and over Deep Water. */
export type SeaIceArtIdV7 = "ICE_SHALLOW" | "ICE_DEEP";

/** The sea ice subject of a water terrain (the tile under the ice). */
export function seaIceArtSubjectV7(
  terrain: "SHALLOW_WATER" | "DEEP_WATER",
): ArtSubjectV7 {
  return terrain === "SHALLOW_WATER"
    ? "TERRAIN:ICE_SHALLOW"
    : "TERRAIN:ICE_DEEP";
}

/**
 * Map curiosity art subjects (bead pulp_wars-737.5,
 * docs/art/classes/curiosities.md): the neutral Giant Spider and its
 * portrait, the four 80 x 80 tile overlays (the lair web under the Monster's
 * home, the Fountain of Youth, the Shrine and the Sunken Wreck), their
 * legend icons with the bounty icon, the effect sprites and the provoked
 * marker. The assets are in chibi-curiosities-art-manifest.ts, registered
 * in the live direction registry by the curiosities UI bead
 * (pulp_wars-737.6).
 */
export type CuriosityArtSubjectV7 =
  | "UNIT:MONSTER_GIANT_SPIDER"
  | "PORTRAIT:MONSTER_GIANT_SPIDER"
  | `CURIOSITY:${CuriosityOverlayIdV7}`
  | `ICON:CURIOSITY:${CuriosityOverlayIdV7 | "BOUNTY"}`
  | `EFFECT:${CuriosityEffectIdV7}`
  | "STATUS:PROVOKED";

/** The tile overlays: the Monster's lair web and the three tile markers. */
export type CuriosityOverlayIdV7 = "WEB" | "FOUNTAIN" | "SHRINE" | "WRECK";

/**
 * Curiosity effect sprites: FOUNTAIN_HEAL (the sparkle over a unit the
 * Fountain heals), SHRINE_BLESSING (the light over a unit that claims a
 * Shrine) and SALVAGE_COINS (the coins of a claimed Wreck).
 */
export type CuriosityEffectIdV7 =
  "FOUNTAIN_HEAL" | "SHRINE_BLESSING" | "SALVAGE_COINS";

/**
 * Round-2 map curiosity art subjects (bead pulp_wars-737.13,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 34.2,
 * docs/art/classes/curiosities.md section 8): the neutral Bigfoot and its
 * portrait, the four 80 x 80 tile overlays (the Downed Saucer, the
 * Graveyard, one look for both Dimensional Gates, the Wishing Well), their
 * legend icons with Bigfoot's footprint, and two effect sprites. The assets
 * are in chibi-curiosities-art-manifest.ts
 * (CHIBI_CURIOSITIES_ROUND2_ART_ASSETS_V7), registered in the live
 * direction registry and drawn since the round-2 UI bead
 * (pulp_wars-737.16). The camp guards have no sprite of their own: they
 * draw the Martian and Undead unit art.
 */
export type CuriosityRound2ArtSubjectV7 =
  | "UNIT:NEUTRAL_BIGFOOT"
  | "PORTRAIT:NEUTRAL_BIGFOOT"
  | `CURIOSITY:${CuriosityRound2OverlayIdV7}`
  | `ICON:CURIOSITY:${CuriosityRound2OverlayIdV7 | "BIGFOOT"}`
  | `EFFECT:${CuriosityRound2EffectIdV7}`;

/** The round-2 tile overlays: two camp centres, a gate, the Well. */
export type CuriosityRound2OverlayIdV7 =
  "DOWNED_SAUCER" | "GRAVEYARD" | "GATE" | "WISHING_WELL";

/**
 * Round-2 effect sprites: GATE_TRAVERSE (the burst at both gates when a unit
 * traverses) and COIN_SPLASH (a Coin tossed into the Wishing Well).
 */
export type CuriosityRound2EffectIdV7 = "GATE_TRAVERSE" | "COIN_SPLASH";

/**
 * The naval sprites a player sees (bead pulp_wars-w5j.2, NAVAL_FACTIONS.md):
 * the two warships, the Submarine of the naval branch (bead pulp_wars-5ti.6)
 * and the embarked transport, which any land unit afloat draws.
 * `SUBMARINE_SUBMERGED` is the Submarine riding low in the water: a map
 * sprite derived from the surfaced one (scripts/art/naval-branch/submerged.ts),
 * which the board draws in place of it (unitArtSubjectV7's `submerged`).
 */
export type NavalArtRoleV7 =
  | "PATROL_BOAT"
  | "BATTLESHIP"
  | "SUBMARINE"
  | "SUBMARINE_SUBMERGED"
  | "EMBARKED_TRANSPORT";

/** Naval sprites of the map only: neither has an interface portrait. */
export type NavalMapOnlyArtRoleV7 =
  "EMBARKED_TRANSPORT" | "SUBMARINE_SUBMERGED";

/** Naval roles with an interface portrait. */
export type NavalPortraitRoleV7 = Exclude<
  NavalArtRoleV7,
  NavalMapOnlyArtRoleV7
>;

/** Every faction but the Humans, whose ships keep the shared subjects. */
export type NavalArtFactionV7 = Exclude<FactionIdV7, "ORIGINAL">;

/**
 * Faction-styled naval art (bead pulp_wars-w5j.2, wired in by
 * pulp_wars-w5j.3): `UNIT:<FACTION>:<ROLE>` and `PORTRAIT:<FACTION>:<ROLE>`
 * for every faction but the Humans, whose ships are `UNIT:<ROLE>` and
 * `PORTRAIT:<ROLE>`. Defined by faction, so a faction added to the engine
 * has its naval subjects at once; one without registered art falls back to
 * the shared ship (chibiFallbackSubjectV7).
 */
export type NavalFactionArtSubjectV7 =
  | `UNIT:${NavalArtFactionV7}:${NavalArtRoleV7}`
  | `PORTRAIT:${NavalArtFactionV7}:${NavalPortraitRoleV7}`;

const NAVAL_ART_ROLES_V7: readonly NavalArtRoleV7[] = [
  "PATROL_BOAT",
  "BATTLESHIP",
  "SUBMARINE",
  "SUBMARINE_SUBMERGED",
  "EMBARKED_TRANSPORT",
];

/**
 * The naval art role a ship role draws: its own. Since the Submarine art
 * of bead pulp_wars-5ti.6 (docs/product/RULESET_7_NAVAL_BRANCH.md section
 * 14.3) a Submarine draws its faction's Submarine sprite and portrait; until
 * then it drew the Patrol Boat's. A faction without a Submarine raster (the
 * Ice Folk, who lose their ships in engine step II) falls back to the
 * shared Submarine like any naval subject (chibiFallbackSubjectV7).
 */
export function navalArtRoleForV7(role: NavalRoleIdV7): NavalPortraitRoleV7 {
  return role;
}

/**
 * The subject of a faction's naval sprite (UNIT) or portrait (PORTRAIT):
 * the shared subject for the Humans, `<KIND>:<FACTION>:<ROLE>` for every
 * other faction.
 */
export function navalArtSubjectV7(
  faction: FactionIdV7,
  kind: "UNIT" | "PORTRAIT",
  role: NavalArtRoleV7,
): ArtSubjectV7 {
  return (
    faction === "ORIGINAL" ? `${kind}:${role}` : `${kind}:${faction}:${role}`
  ) as ArtSubjectV7;
}

/**
 * The naval role a subject depicts, shared or faction-styled
 * (`UNIT:PATROL_BOAT`, `UNIT:GOBLIN:EMBARKED_TRANSPORT`,
 * `PORTRAIT:MARTIAN:BATTLESHIP`), or null for every other subject.
 */
export function navalArtRoleOfSubjectV7(
  subject: ArtSubjectV7 | undefined,
): NavalArtRoleV7 | null {
  if (subject === undefined) return null;
  const parts = subject.split(":");
  if (parts[0] !== "UNIT" && parts[0] !== "PORTRAIT") return null;
  if (parts.length !== 2 && parts.length !== 3) return null;
  const role = parts[parts.length - 1] as NavalArtRoleV7;
  return NAVAL_ART_ROLES_V7.includes(role) ? role : null;
}

/**
 * The shared (classic) ship subject that a faction's naval subject stands
 * in with (`UNIT:GOBLIN:PATROL_BOAT` to `UNIT:PATROL_BOAT`), or null when
 * the subject is not a faction's naval subject.
 */
export function navalSharedSubjectV7(
  subject: ArtSubjectV7 | undefined,
): ArtSubjectV7 | null {
  if (subject === undefined) return null;
  const parts = subject.split(":");
  const role = navalArtRoleOfSubjectV7(subject);
  return role === null || parts.length !== 3
    ? null
    : (`${parts[0] as "UNIT" | "PORTRAIT"}:${role}` as ArtSubjectV7);
}

/**
 * Steampunk Dwarf art subjects (bead pulp_wars-78i.5, DWARF.md): the units,
 * the tunnel mound and the rider's mound (drawn where a burrowed unit
 * would stand), their portraits, the forge-hold City 1-3, the command,
 * ability, status and technology icons (`ICON:ACTION:DWARF:TEND_WOUNDED` is
 * Repair; `ICON:TECH:DWARF:*` are Dig In and Blasting Charges, the Dwarf
 * names of Fortification and Explosives) and the effect sprites,
 * registered in the direction registry since the UI bead (pulp_wars-78i.6).
 * The Dwarf naval subjects need no type here: they are
 * NavalFactionArtSubjectV7 (`UNIT:DWARF:<ROLE>`, `PORTRAIT:DWARF:<ROLE>`,
 * what navalArtSubjectV7 returns).
 */
export type DwarfArtSubjectV7 =
  | `UNIT:DWARF:${DwarfArtRoleV7 | "MOUND" | "MOUND_RIDER"}`
  | `PORTRAIT:DWARF:${DwarfArtRoleV7}`
  | `CITY:DWARF:${1 | 2 | 3}`
  | `ICON:ACTION:${"TUNNEL" | "BOMB_RUN" | "ASSEMBLE" | "KNOCKBACK" | "PLATED"}`
  | "ICON:ACTION:DWARF:TEND_WOUNDED"
  | `ICON:TECH:DWARF:${"FORTIFICATION" | "EXPLOSIVES"}`
  | `ICON:STATUS:${"CLOCKWORK" | "DUG_IN"}`
  | `EFFECT:${DwarfEffectIdV7}`;

/**
 * Dwarf effect sprites: ERUPTION (the ground bursting at a surfacing Mole;
 * smaller copies make the ring over its eight tiles), BOMB_BLAST (a
 * Gyrocopter's bomb landing), STEAM_PUFF (Assemble, Knockback, the tunnel)
 * and REPAIR_SPARKS (the Engineer's Repair).
 */
export type DwarfEffectIdV7 =
  "ERUPTION" | "BOMB_BLAST" | "STEAM_PUFF" | "REPAIR_SPARKS";

/** Roles with their own Dwarf art (docs/art/factions/DWARF.md). */
export type DwarfArtRoleV7 = UndeadArtRoleV7;

/**
 * Candy art subjects (bead pulp_wars-jdb.5, CANDY.md): the eight units,
 * their portraits, the cake-castle City 1-3, the Crumbs marker of a tile,
 * the command, ability, status and technology icons
 * (`ICON:ACTION:CANDY:TEND_WOUNDED` was Frosting, which the Candy redesign
 * replaced with Top-Up, `ICON:ACTION:TOP_UP`, bead pulp_wars-jdb.14, beside
 * the Stuck and Toothache status icons; `ICON:TECH:CANDY:*` are
 * Home Sweet Home and Peppermint Surprise, the Candy names of
 * Fortification and Explosives; `ICON:HUD:CANDY:EMBLEM` is the faction's
 * wrapped sweet) and the effect sprites. The units, portraits
 * and cities are drawn since the engine bead (pulp_wars-jdb.3); the icons,
 * the Crumbs marker and the effects wait for the Candy UI bead
 * (pulp_wars-jdb.6). The Candy naval subjects need no type
 * here: they are NavalFactionArtSubjectV7 (`UNIT:CANDY:<ROLE>`,
 * `PORTRAIT:CANDY:<ROLE>`, what navalArtSubjectV7 returns).
 */
export type CandyArtSubjectV7 =
  | `UNIT:CANDY:${CandyArtRoleV7}`
  | `PORTRAIT:CANDY:${CandyArtRoleV7}`
  | `CITY:CANDY:${1 | 2 | 3}`
  | "CRUMBS"
  | `ICON:ACTION:${"SUGAR_RUSH" | "REBAKE" | "SUGAR_TOSS" | "SPLAT" | "BOUNCE" | "TOP_UP"}`
  | "ICON:ACTION:CANDY:TEND_WOUNDED"
  | `ICON:TECH:CANDY:${"FORTIFICATION" | "EXPLOSIVES"}`
  | `ICON:STATUS:${"RUSHED" | "CRASHED" | "SPLATTED" | "STUCK" | "TOOTHACHE"}`
  | "ICON:HUD:CANDY:EMBLEM"
  | `EFFECT:${CandyEffectIdV7}`;

/**
 * Candy effect sprites: GUMBALL_SHOT (the Gumball Gunner's shot), PIE (the
 * Pie Launcher's pie in flight), SPLAT (the pie landing), SUGAR_TOSS (the
 * tossed sweet), REBAKE_PUFF (the oven puff of a Re-bake), PEPPERMINT_POP
 * (Peppermint Surprise under an enemy that eats Crumbs) and BOUNCE (the
 * spring under a bounced attacker).
 */
export type CandyEffectIdV7 =
  | "GUMBALL_SHOT"
  | "PIE"
  | "SPLAT"
  | "SUGAR_TOSS"
  | "REBAKE_PUFF"
  | "PEPPERMINT_POP"
  | "BOUNCE";

/** Roles with their own Candy art (docs/art/factions/CANDY.md). */
export type CandyArtRoleV7 = UndeadArtRoleV7;

/**
 * Cult art subjects (`pulp_wars-mch9.3`, docs/product/RULESET_7_CULTISTS.md
 * section 14.2): the nine land units, their portraits, and the lodge City
 * 1-3. The Cult naval subjects need no type here: they are
 * NavalFactionArtSubjectV7 (`UNIT:CULT:<ROLE>`, `PORTRAIT:CULT:<ROLE>`).
 *
 * The faction was registered ahead of its art (the art beads are
 * `pulp_wars-mch9.14` to `.16`). Since bead `pulp_wars-mch9.15` the nine
 * land units and the four ships have their own rasters
 * (chibi-direction-cult-art-manifest.ts), and since bead
 * `pulp_wars-mch9.16` the lodge City 1-3, the seven buildings of
 * `FACTION_IMPROVEMENT_LOOKS_V7.CULT` and the Cult Monuments have theirs.
 * The portraits (bead `pulp_wars-mch9.23`) still fall back to the shared
 * Human subject of the same role (chibiFallbackSubjectV7), and a Cult unit
 * whose raster fails to load is drawn as that stand-in with the letter badge
 * of `FACTION_STAND_IN_LETTERS_V7`.
 *
 * The summoned units (`SUMMONED_ROLE_IDS_V7`: they are no unit roles; a
 * unit names its summoned role in `summoned`) have the subjects
 * `UNIT:CULT:<SUMMONED ROLE>`, which `cultSummonedArtSubjectV7` names; the
 * Horror and the Herald have a second, Unbound look
 * (`UNIT:CULT:HORROR_UNBOUND`, `UNIT:CULT:HERALD_UNBOUND`: red eyes, the
 * collar cracked). They have no Human counterpart and no fallback. `FROG` is
 * the marker drawn over a unit turned into a frog by Ribbit, a tile marker
 * like `CRUMBS`.
 *
 * `ICON:HUD:CULT:FAVOUR` is the Favour candle of the HUD, the leaderboard
 * and the Offering's chip (bead `pulp_wars-mch9.17`; docs/art/factions/
 * CULT.md). The interface asks for it and draws its code glyph (the `candle`
 * of ui-icons-v7.ts) until the art bead `pulp_wars-mch9.23` registers the
 * raster. The Sacrifice, Seize and Offering icons need no type here: they
 * are `ICON:ACTION:<KIND>` of their command kinds.
 */
export type CultArtSubjectV7 =
  | `UNIT:CULT:${CultArtRoleV7}`
  | `PORTRAIT:CULT:${CultArtRoleV7}`
  | `CITY:CULT:${1 | 2 | 3}`
  | CultSummonedArtSubjectV7
  | "FROG"
  | "ICON:HUD:CULT:FAVOUR";

/** The sprites of the Cult's summoned units, bound and Unbound. */
export type CultSummonedArtSubjectV7 =
  `UNIT:CULT:${SummonedRoleIdV7}` | `UNIT:CULT:${"HORROR" | "HERALD"}_UNBOUND`;

/**
 * The art subject of a summoned Cult unit (bead pulp_wars-mch9.15): the
 * engine's summoned role ID under `UNIT:CULT:`, and the Unbound look of a
 * Horror or a Herald whose strands are gone. The wild Tentacle has one look.
 * `unitArtSubjectV7` asks here for a unit that carries a summoned role (a
 * Horror since `pulp_wars-mch9.5`); the Unbound look waits for the Unbound
 * rules (`pulp_wars-mch9.6`).
 */
export function cultSummonedArtSubjectV7(
  role: SummonedRoleIdV7,
  unbound = false,
): CultSummonedArtSubjectV7 {
  return unbound && role !== "TENTACLE"
    ? `UNIT:CULT:${role}_UNBOUND`
    : `UNIT:CULT:${role}`;
}

/** The land roles the Cult will have its own art for. */
export type CultArtRoleV7 = UndeadArtRoleV7;

// --- Cult interface art (bead pulp_wars-mch9.23) ---
/**
 * The Cult's interface art (bead `pulp_wars-mch9.23`, batches
 * `interface-cult`, `effects-cult` and `naval-cult`; CULT.md, "Icons" and
 * "Markers and effects"): the portraits of the three summoned units (the
 * nine trained units' are `PORTRAIT:CULT:<ROLE>` above), the technology
 * icons of Warding Circles, The Stars Are Right and Harvest Rites, the
 * command and ability icons, the Favour candle of the HUD (32 x 32, as the
 * coin is) and of cards and dialogs (`FAVOUR_LARGE`, 48 x 48), the faction
 * emblem, the status chips and the effect sprites.
 *
 * The portraits and the three technology icons are asked for today
 * (`portraitSubjectV7`, `technologySubjectV7`), and so are the Favour
 * candle of the HUD and the Sacrifice, Seize and Offering icons (the Favour
 * interface, bead `pulp_wars-mch9.17`). Every other subject is registered
 * ahead of the mechanic it belongs to (the strands, rituals and hexes: the
 * engine beads `pulp_wars-mch9.5` to `.8` and the interface beads after
 * them), so those beads only name the subject.
 */
export type CultInterfaceArtSubjectV7 =
  | `PORTRAIT:CULT:${SummonedRoleIdV7}`
  | `ICON:TECH:CULT:${CultTechIconIdV7}`
  | `ICON:ACTION:${CultActionIconIdV7}`
  | `ICON:HUD:CULT:${"FAVOUR" | "FAVOUR_LARGE" | "EMBLEM"}`
  | `ICON:STATUS:${CultStatusIconIdV7}`
  | `EFFECT:${CultEffectIdV7}`;

/** Warding Circles, The Stars Are Right and Harvest Rites. */
export type CultTechIconIdV7 = "FORTIFICATION" | "EXPLOSIVES" | "FARMING";

/** The Cult's commands, rituals, hexes and unit abilities with an icon. */
export type CultActionIconIdV7 =
  | "SACRIFICE"
  | "SEIZE"
  | "OFFERING"
  | "SUMMON"
  | "CHANNEL"
  | "BEHOLD"
  | "PICK_ME"
  | "ANCHOR"
  | "BOO"
  | "PROCLAIM"
  | "RIBBIT"
  | "SWITCHEROO"
  | "TENTACLE"
  | "STARFALL"
  | "GREAT_SUMMONING"
  | "PAMPHLETS"
  | "MARTYR"
  | "GRAB";

/** The Cult's status chips, each also the board marker of its status. */
export type CultStatusIconIdV7 =
  | "CANDLELIT"
  | "FROG"
  | "UNBOUND"
  | "FURIOUS"
  | "GRABBED"
  | "COWED"
  | "WARDED"
  | "PICK_ME";

/** The Cult's effect sprites (CULT.md, "Markers and effects"). */
export type CultEffectIdV7 =
  | "SACRIFICE_PUFF"
  | "SEIZE"
  | "SUMMON_POP"
  | "STRAND_SNAP"
  | "UNBOUND"
  | "STARFALL_STAR"
  | "STARFALL_BURST"
  | "BOO"
  | "RIBBIT"
  | "SWITCHEROO"
  | "TENTACLE_SLAP"
  | "PROCLAIM"
  | "PAMPHLETS"
  | "FAVOUR"
  | "RITUAL_FIZZLE";

/**
 * The portrait of a summoned Cult unit for the dock and the cards: the
 * Horror and the Tentacle whole, the Herald's eye and crown. An Unbound
 * daemon keeps the portrait of its kind.
 */
export function cultSummonedPortraitSubjectV7(
  role: SummonedRoleIdV7,
): CultInterfaceArtSubjectV7 {
  return `PORTRAIT:CULT:${role}`;
}
// --- end of the Cult interface art ---

/** The Rift pieces (bead pulp_wars-9s0.5, docs/art/classes/terrain-tiles.md). */
export type RiftPieceV7 =
  "H_WEST" | "H_MIDDLE" | "H_EAST" | "V_NORTH" | "V_MIDDLE" | "V_SOUTH";

/**
 * Ice Folk art subjects (bead pulp_wars-7g3.5, ICE_FOLK.md): the units, their
 * portraits, the igloo settlement, the command, ability, technology and
 * status icons (`ICON:TECH:ICE_FOLK:*` are Deep Winter and Brittle, the Ice
 * Folk names of Fortification and Explosives) and the ability effect
 * sprites, registered in the direction registry since the UI bead
 * (pulp_wars-7g3.6).
 */
export type IceFolkArtSubjectV7 =
  | `UNIT:ICE_FOLK:${IceFolkArtRoleV7}`
  | `PORTRAIT:ICE_FOLK:${IceFolkArtRoleV7}`
  | `CITY:ICE_FOLK:${1 | 2 | 3}`
  | `ICON:ACTION:${"THROW_BOLAS" | "COLD_SNAP" | "SWEEP" | "ROCKFALL" | "PROWL" | "SHATTER" | "FREEZE"}`
  | `ICON:TECH:ICE_FOLK:${"FORTIFICATION" | "EXPLOSIVES" | IceFolkNavalTechV7}`
  | `ICON:STATUS:${"CHILLED" | "FROZEN"}`
  | `EFFECT:${IceFolkEffectIdV7}`;

/**
 * The Ice Folk Naval branch (bead pulp_wars-5ti.10): Rime, Pack Ice,
 * Icebound, Black Ice and Glacier each have an icon of their own,
 * `ICON:TECH:ICE_FOLK:<technology>`; `ICON:ACTION:FREEZE` is the Freeze
 * button's.
 */
export type IceFolkNavalTechV7 =
  | "SHORECRAFT"
  | "NAVIGATION"
  | "NAVAL_ENGINEERING"
  | "SEAMANSHIP"
  | "SUBMERSIBLES";

/**
 * Ice Folk effect sprites: SHATTER (the burst of a shattered unit),
 * SHATTER_SHARDS (the loose shards that fly out and melt), COLD_SNAP (the
 * frost ring of a Cold Snap), BOLAS (the thrown bolas) and FROST_HIT (frost
 * forming on a unit that is chilled).
 */
export type IceFolkEffectIdV7 =
  "SHATTER" | "SHATTER_SHARDS" | "COLD_SNAP" | "BOLAS" | "FROST_HIT";

/** Roles with their own Ice Folk art (docs/art/factions/ICE_FOLK.md). */
export type IceFolkArtRoleV7 = UndeadArtRoleV7;

/**
 * Martian interface and effect subjects (bead pulp_wars-t6s.6): the unit
 * portraits, the landed-saucer colony, the command and ability icons
 * (`ICON:ACTION:MARTIAN:RALLY` is Psychic Command), the Shield and Cooling
 * status icons, and the ability effect sprites. They are a list of their
 * own so that no existing subject family changes. (The Thrall's portrait is
 * retired with its sprite, bead pulp_wars-b5f.3.)
 */
export type MartianArtSubjectV7 =
  | `PORTRAIT:MARTIAN:${MartianArtRoleV7}`
  | `CITY:MARTIAN:${1 | 2 | 3}`
  | `ICON:ACTION:${"BEAM_DOWN" | "MIND_CONTROL" | "TRACTOR_BEAM" | "FORCE_FIELD"}`
  | "ICON:ACTION:MARTIAN:RALLY"
  | `ICON:STATUS:${"SHIELD" | "COOLING"}`
  | `EFFECT:${MartianEffectIdV7}`;

/**
 * Martian ability effect sprites: HEAT_RAY (the impact flash of a heat ray),
 * SHIELD_FLARE (a hit absorbed by a Shield), BEAM_DOWN (the arrival column),
 * TRACTOR_BEAM (the pull cone) and MIND_CONTROL (the swirl over the victim).
 */
export type MartianEffectIdV7 =
  "HEAT_RAY" | "SHIELD_FLARE" | "BEAM_DOWN" | "TRACTOR_BEAM" | "MIND_CONTROL";

/**
 * Board overlays of revision 14 and the Undead abilities (bead
 * pulp_wars-vkq.14), CHIBI only; LEGACY keeps its code-drawn cues.
 * `STATUS:*` are the Plague and Bitten unit markers (drawn in the
 * AFFLICTION_MARKER_FRAME_V7 slots; the Plague marker is also the Plague
 * puff effect at 1:1); `EFFECT:*` are single sprites the effects canvas
 * animates with code-driven position, scale and alpha: WAIL (Banshee
 * shriek), SPLASH (Lich frost burst), RAISE (bone hands of Raise Dead),
 * WISP (the Lifesteal drain and the Infect and Bitten risings) and CURE
 * (Plague or a bite cured).
 */
export type ChibiEffectIdV7 = "WAIL" | "SPLASH" | "RAISE" | "WISP" | "CURE";

export type ChibiEffectSubjectV7 =
  "STATUS:PLAGUED" | "STATUS:BITTEN" | `EFFECT:${ChibiEffectIdV7}`;

/**
 * Interface (DOM) subjects, batch 5 (bead pulp_wars-67q.11). The board never
 * asks for them; the DOM art hook (src/render/dom/chibi-dom-art-v7.ts) does.
 * `PORTRAIT:<ROLE>` is a head-and-shoulders unit portrait (train buttons,
 * rewards, technology cards); `PORTRAIT:UNDEAD:<ROLE>` is the Undead one and
 * `PORTRAIT:GOBLIN:<ROLE>` the Goblin one (bead pulp_wars-0ao.8);
 * `PORTRAIT:DINOSAUR:<ROLE>` is the Dinosaur one (bead pulp_wars-c87.7).
 * `ICON:*` are unowned icons: dedicated technology icons, command and action
 * icons (`ICON:ACTION:UNDEAD:RALLY` is the Undead Frenzy,
 * `ICON:ACTION:GOBLIN:RALLY` the Goblin WAAAGH!, bead pulp_wars-0ao.14, and
 * `ICON:ACTION:DINOSAUR:RALLY` the Dinosaur War Drums; Lay Egg and Hatch
 * are `ICON:ACTION:<KIND>` of their command kinds, and `ICON:ACTION:STAMPEDE`
 * is the Triceratops's Charge! ability since revision 20), city rewards
 * and the HUD economy icons.
 */
export type UiArtSubjectV7 =
  | `PORTRAIT:${UnitRoleIdV7}`
  | `PORTRAIT:UNDEAD:${UndeadArtRoleV7}`
  | `PORTRAIT:GOBLIN:${GoblinArtRoleV7}`
  | `PORTRAIT:DINOSAUR:${DinosaurArtRoleV7}`
  | `ICON:TECH:${TechnologyIdV7}`
  | `ICON:ACTION:${CommandV7["kind"]}`
  // Revision 20: the Stampede command is gone; its icon is the Charge!
  // ability's, under its existing subject key.
  | "ICON:ACTION:STAMPEDE"
  | "ICON:ACTION:UNDEAD:RALLY"
  | "ICON:ACTION:GOBLIN:RALLY"
  | "ICON:ACTION:DINOSAUR:RALLY"
  | `ICON:REWARD:${"SURVEY" | "WALLS" | "EXPAND"}`
  | `ICON:HUD:${"COIN" | "POPULATION"}`;

/**
 * Roles with their own Undead land art (docs/art/factions/UNDEAD.md). The
 * Patrol Boat and the Battleship are naval subjects of their own
 * (NavalFactionArtSubjectV7, bead pulp_wars-w5j.3).
 */
export type UndeadArtRoleV7 = Exclude<UnitRoleIdV7, NavalRoleIdV7>;

/**
 * Roles with their own Goblin art (docs/art/factions/GOBLIN.md): the same
 * land roles as the Undead; Goblin ships are naval subjects.
 */
export type GoblinArtRoleV7 = UndeadArtRoleV7;

/**
 * Roles with their own Dinosaur art (docs/art/factions/DINOSAUR.md): the same
 * land roles; Dinosaur ships are naval subjects.
 */
export type DinosaurArtRoleV7 = UndeadArtRoleV7;

/** Roles with their own Martian art (docs/art/factions/MARTIAN.md). */
export type MartianArtRoleV7 = UndeadArtRoleV7;

/**
 * The improvements a faction draws in its own look (epic pulp_wars-xdh,
 * docs/art/FACTION_BUILDINGS.md, section 3). Purely visual: the look follows
 * the owner of the territory the improvement stands in, and every other
 * improvement of every faction is the shared building.
 *
 * The Lumber Camp and the Sawmill (bead pulp_wars-2yc.38; the user,
 * 2026-10-07: "lumber camps should be different per faction - depending on
 * the native forest skin. ditto for sawmills") are every faction's own but
 * the Humans': a camp among the trees of the faction's forest, a mill in its
 * building materials. They keep the names "Lumber camp" and "Sawmill" (the
 * Dinosaur Chopping Block was named before); FACTION_BUILDINGS of
 * src/render/faction-buildings-v7.ts names only the renamed ones. Stage 2 of
 * the bead (the user: "forge, workshop, port and shipyard should be
 * generated per faction") adds those four the same way, names unchanged. The
 * Ice Folk, who have no ships, have a Port and a Shipyard like every seat
 * (docs/product/RULESET_7_CURRENT.md, section 21.16); theirs show no boat.
 * Bead pulp_wars-eu3r.1 adds the Market the same way: two open stalls
 * heaped with goods in the faction's materials, name unchanged.
 */
const FOREST_AND_TRADE_LOOKS: readonly ImprovementIdV7[] = [
  "LUMBER_CAMP",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "PORT",
  "SHIPYARD",
  "MARKET",
];

export const FACTION_IMPROVEMENT_LOOKS_V7: Readonly<
  Partial<Record<FactionIdV7, readonly ImprovementIdV7[]>>
> = {
  UNDEAD: ["FARM", "WINDMILL", ...FOREST_AND_TRADE_LOOKS],
  GOBLIN: FOREST_AND_TRADE_LOOKS,
  DINOSAUR: ["WINDMILL", ...FOREST_AND_TRADE_LOOKS],
  MARTIAN: ["FARM", "WINDMILL", ...FOREST_AND_TRADE_LOOKS],
  ICE_FOLK: ["FARM", ...FOREST_AND_TRADE_LOOKS],
  DWARF: ["FARM", "WINDMILL", ...FOREST_AND_TRADE_LOOKS],
  CANDY: FOREST_AND_TRADE_LOOKS,
  // Bead pulp_wars-mch9.16 (docs/art/factions/CULT.md, Buildings): the
  // lodge keeps the shared Farm, Windmill and Mine.
  CULT: FOREST_AND_TRADE_LOOKS,
};

export type FactionImprovementSubjectV7 =
  `IMPROVEMENT:${Exclude<FactionIdV7, "ORIGINAL">}:${ImprovementIdV7}`;

/** True when the faction draws this improvement in a look of its own. */
export function factionHasImprovementLookV7(
  improvement: ImprovementIdV7,
  faction: FactionIdV7 | null | undefined,
): faction is Exclude<FactionIdV7, "ORIGINAL"> {
  return (
    faction !== null &&
    faction !== undefined &&
    (FACTION_IMPROVEMENT_LOOKS_V7[faction]?.includes(improvement) ?? false)
  );
}

/**
 * A Monument as its achievement draws it (bead pulp_wars-2yc.15, the user:
 * "a separate monument sprite for each achievement"): the Explorer's
 * obelisk with a compass, the Conqueror's arch, the Slayer's sword in the
 * stone. Purely visual. Each falls back to the shared `IMPROVEMENT:MONUMENT`
 * (chibiFallbackSubjectV7), which also draws a Monument whose achievement
 * the viewer may not see: another player's.
 */
export type MonumentArtSubjectV7 =
  `IMPROVEMENT:MONUMENT:${AchievementIdV7}` | FactionMonumentArtSubjectV7;

/**
 * The faction Monuments (bead pulp_wars-eu3r.2, FACTION_BUILDINGS.md,
 * "Faction Monuments"): every achievement's Monument in each non-Human faction's
 * materials (`IMPROVEMENT:MONUMENT:<FACTION>:<ACHIEVEMENT>`; the seven
 * above are the Human ones) and the faction's own obelisk
 * (`IMPROVEMENT:MONUMENT:<FACTION>`) for a viewer who may not see the
 * achievement. The faction is the Monument's builder's, which a capture
 * never changes (the skin rule, bead pulp_wars-eu3r.3); each falls back to
 * the shared Monument.
 */
export type FactionMonumentArtSubjectV7 =
  | `IMPROVEMENT:MONUMENT:${Exclude<FactionIdV7, "ORIGINAL">}:${AchievementIdV7}`
  | `IMPROVEMENT:MONUMENT:${Exclude<FactionIdV7, "ORIGINAL">}`;

/**
 * The subject of a Monument: its achievement's look, or the shared one, in
 * the materials of `faction`, the faction that built it (bead
 * pulp_wars-eu3r.3). A Human Monument, and one whose builder is unknown (a
 * state written before the builder was recorded), takes the achievement's
 * shared look (`IMPROVEMENT:MONUMENT:<ACHIEVEMENT>`, the Human set) or the
 * shared Monument; every other faction its own
 * (`IMPROVEMENT:MONUMENT:<FACTION>:<ACHIEVEMENT>`, or its obelisk
 * `IMPROVEMENT:MONUMENT:<FACTION>` when the achievement is hidden).
 */
export function monumentArtSubjectV7(
  achievement: AchievementIdV7 | null | undefined,
  faction?: FactionIdV7 | null,
): ArtSubjectV7 {
  const hidden = achievement === null || achievement === undefined;
  if (faction !== null && faction !== undefined && faction !== "ORIGINAL")
    return hidden
      ? `IMPROVEMENT:MONUMENT:${faction}`
      : `IMPROVEMENT:MONUMENT:${faction}:${achievement}`;
  return hidden
    ? "IMPROVEMENT:MONUMENT"
    : `IMPROVEMENT:MONUMENT:${achievement}`;
}

/**
 * The ground of a faction's territory (FACTION_BUILDINGS.md, section 4):
 * the Undead "gloam" Grass, a cooler, duller green, under the Grass, the
 * Forest trees and the Mountain fringe inside Undead borders.
 */
export type TerritoryGroundV7 = "UNDEAD";

export type FactionTerrainSubjectV7 =
  `TERRAIN:${TerritoryGroundV7}:${"GRASS" | "FOREST"}`;

/** The territory ground a faction's borders draw, or null for the shared one. */
export function territoryGroundV7(
  faction: FactionIdV7 | null | undefined,
): TerritoryGroundV7 | null {
  return faction === "UNDEAD" ? "UNDEAD" : null;
}

/**
 * A terrain subject as a territory ground draws it: Grass and Forest take
 * the ground's own subject; every other terrain (water, the rocky Mountain,
 * the Rift) is unchanged.
 */
export function territoryTerrainSubjectV7(
  subject: ArtSubjectV7,
  ground: TerritoryGroundV7 | null | undefined,
): ArtSubjectV7 {
  if (ground === null || ground === undefined) return subject;
  if (subject === "TERRAIN:GRASS") return `TERRAIN:${ground}:GRASS`;
  if (subject === "TERRAIN:FOREST") return `TERRAIN:${ground}:FOREST`;
  return subject;
}

/** Factions with their own city art; every other faction uses `CITY:<level>`. */
export type CityArtFactionV7 =
  | "UNDEAD"
  | "GOBLIN"
  | "DINOSAUR"
  | "MARTIAN"
  | "ICE_FOLK"
  | "DWARF"
  | "CANDY"
  // The Cultists (`pulp_wars-mch9.3`): no raster yet; `CITY:CULT:<level>`
  // falls back to the shared city.
  | "CULT";

/**
 * The art subject of a city on the map or in the interface: the owner
 * faction's own city set for the art level, or the shared (Human) set. A
 * faction subject without a usable raster falls back to `CITY:<level>`
 * through chibiFallbackSubjectV7. Neutral villages stay `SITE:VILLAGE`.
 */
export function cityArtSubjectV7(city: {
  readonly artLevel: 1 | 2 | 3;
  readonly faction: FactionIdV7 | null | undefined;
}): ArtSubjectV7 {
  if (
    city.faction === "UNDEAD" ||
    city.faction === "GOBLIN" ||
    city.faction === "DINOSAUR" ||
    city.faction === "MARTIAN" ||
    city.faction === "ICE_FOLK" ||
    city.faction === "DWARF" ||
    city.faction === "CANDY" ||
    city.faction === "CULT"
  )
    return `CITY:${city.faction}:${city.artLevel}`;
  return `CITY:${city.artLevel}`;
}

const SHARED_ART_ROLES_V7: readonly UnitRoleIdV7[] = [
  "PATROL_BOAT",
  "BATTLESHIP",
  "SUBMARINE",
];

/**
 * The art subject of a unit on the map: the owner faction's embarked
 * transport, the owner faction's own art for the role (its ships included,
 * bead pulp_wars-w5j.3), or the shared (Human) art.
 *
 * The Martian revision (bead pulp_wars-t6s.4): a self-launched Martian
 * machine (`machine`: its role walks or flies) afloat is drawn as itself
 * over the water, never as the transport (RULESET_7_MARTIANS.md section
 * 13.1). The Mind Control revision (bead pulp_wars-b5f.3): `faction` is
 * the unit's kind (`unitFactionV7`), so a mind-controlled unit draws its
 * own sprite, and its own faction's transport when embarked; the control
 * halo and brain chip say who controls it.
 *
 * The naval branch (bead pulp_wars-5ti.6): with `submerged`, a Submarine
 * afloat takes its faction's `SUBMARINE_SUBMERGED` sprite, the hull riding
 * low with foam at the waterline. It is for a board that draws the unit on
 * its water tile; the dock, the Gallery and every portrait keep the whole
 * (surfaced) Submarine, and so does a caller that does not ask. The board
 * asks for a Submarine whose public stats say it is submerged.
 */
export function unitArtSubjectV7(unit: {
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly faction: FactionIdV7;
  readonly machine?: boolean;
  readonly submerged?: boolean;
  /**
   * The Cultists (`pulp_wars-mch9.5`): the summoned role of a summoned unit
   * (`PublicUnitV7.summoned`). Such a unit draws its own sprite
   * (`cultSummonedArtSubjectV7`), whatever its mechanical `role` is.
   */
  readonly summoned?: SummonedRoleIdV7 | undefined;
}): ArtSubjectV7 {
  if (unit.summoned !== undefined && unit.form === "LAND")
    return cultSummonedArtSubjectV7(unit.summoned);
  if (
    unit.form === "EMBARKED" &&
    unit.faction === "MARTIAN" &&
    unit.machine === true &&
    !SHARED_ART_ROLES_V7.includes(unit.role)
  )
    return `UNIT:MARTIAN:${unit.role as MartianArtRoleV7}`;
  if (unit.form === "EMBARKED")
    return navalArtSubjectV7(unit.faction, "UNIT", "EMBARKED_TRANSPORT");
  // Revision 19: one Egg sprite for every role inside.
  if (unit.form === "EGG") return "UNIT:DINOSAUR:EGG";
  if (
    unit.role === "SUBMARINE" &&
    unit.form === "NAVAL" &&
    unit.submerged === true
  )
    return navalArtSubjectV7(unit.faction, "UNIT", "SUBMARINE_SUBMERGED");
  if (SHARED_ART_ROLES_V7.includes(unit.role))
    return navalArtSubjectV7(
      unit.faction,
      "UNIT",
      navalArtRoleForV7(unit.role as NavalRoleIdV7),
    );
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the art slot of the role
  // (a moved unit keeps the slot its art was made for).
  const role = unitArtRoleV7(unit.role, unit.faction);
  if (unit.faction === "UNDEAD")
    return `UNIT:UNDEAD:${role as UndeadArtRoleV7}`;
  if (unit.faction === "GOBLIN")
    return `UNIT:GOBLIN:${role as GoblinArtRoleV7}`;
  if (unit.faction === "DINOSAUR")
    return `UNIT:DINOSAUR:${role as DinosaurArtRoleV7}`;
  if (unit.faction === "MARTIAN")
    return `UNIT:MARTIAN:${role as MartianArtRoleV7}`;
  // The Ice Folk (bead pulp_wars-7g3.6): every land role has its own art.
  if (unit.faction === "ICE_FOLK")
    return `UNIT:ICE_FOLK:${role as IceFolkArtRoleV7}`;
  // The Dwarves (bead pulp_wars-78i.6): every land role has its own art.
  if (unit.faction === "DWARF") return `UNIT:DWARF:${role as DwarfArtRoleV7}`;
  // The Candy (art of pulp_wars-jdb.5, wired by pulp_wars-jdb.3): every
  // land role has its own art.
  if (unit.faction === "CANDY") return `UNIT:CANDY:${role as CandyArtRoleV7}`;
  // The Cultists (`pulp_wars-mch9.3`): their own subjects, which fall back
  // to the Human art until the Cult's rasters are registered.
  if (unit.faction === "CULT") return `UNIT:CULT:${role as CultArtRoleV7}`;
  return `UNIT:${role}`;
}

/**
 * The ninth unit (`pulp_wars-w49.17`, `pulp-wars-poc-7r55`): the ART SLOT
 * of a land role under a faction. A unit's sprite and portrait are filed
 * under `UNIT:<FACTION>:<SLOT>` and `PORTRAIT:<FACTION>:<SLOT>`, and the
 * slot is the role ID except for the three units that changed role at
 * 7r55, whose rasters, prompts, and generation records keep the slot they
 * were made for:
 *
 * - the Dinosaur Triceratops (role `SWORDSMAN`) keeps the slot `CATAPULT`;
 * - the Ice Folk Mammoth (role `SWORDSMAN`) keeps the slot `GUARD`;
 * - the Dwarf Steam Tank (role `SWORDSMAN`) keeps the slot `KNIGHT`.
 *
 * The unit that took the vacated role gets the free slot `SWORDSMAN`, so
 * the seven units added at 7r55 (Ogre, Wight, Shock Trooper, Jawbreaker,
 * Stegosaurus, Musk Ox, Whirligig) are all `<FACTION>:SWORDSMAN`: the
 * ninth art slot of every non-Human faction. Naval roles are not land art
 * slots and are returned unchanged.
 */
export function unitArtRoleV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): UnitRoleIdV7 {
  const moved = MOVED_UNIT_ART_SLOTS_V7[faction];
  if (moved === undefined) return role;
  if (role === "SWORDSMAN") return moved;
  if (role === moved) return "SWORDSMAN";
  return role;
}

/** The art slot the moved heavy of a faction keeps (see `unitArtRoleV7`). */
export const MOVED_UNIT_ART_SLOTS_V7: Readonly<
  Partial<Record<FactionIdV7, UnitRoleIdV7>>
> = Object.freeze({
  DINOSAUR: "CATAPULT",
  ICE_FOLK: "GUARD",
  DWARF: "KNIGHT",
});

/**
 * The ninth unit (`pulp_wars-w49.17`): STAND-IN ART. A unit added without
 * art of its own is listed here: until an art bead registers its subject it
 * is drawn with the sprite and portrait of the nearest unit of its own
 * faction, and the board and the Gallery mark it (a small letter badge on
 * the board, the "stand-in" mark in the Gallery). `letter` is the badge.
 *
 * The table is EMPTY since bead `pulp_wars-2yc.34`: the seven units added
 * at 7r55 (Wight, Ogre, Stegosaurus, Shock Trooper, Musk Ox, Whirligig and
 * Jawbreaker) have their own sprite and portrait under
 * `UNIT:<FACTION>:SWORDSMAN` and `PORTRAIT:<FACTION>:SWORDSMAN` in the
 * faction direction manifests, so no unit wears the letter badge.
 */
export const NINTH_UNIT_STAND_INS_V7: Readonly<
  Partial<
    Record<
      Exclude<FactionIdV7, "ORIGINAL">,
      { readonly standIn: UnitRoleIdV7; readonly letter: string }
    >
  >
> = Object.freeze({});

const NINTH_UNIT_STAND_IN_PATTERN_V7 =
  /^(UNIT|PORTRAIT):(UNDEAD|GOBLIN|DINOSAUR|MARTIAN|ICE_FOLK|DWARF|CANDY):SWORDSMAN$/;

/**
 * The stand-in subject of a ninth-unit subject listed in
 * `NINTH_UNIT_STAND_INS_V7` (none today), or null for any other subject.
 */
export function ninthUnitStandInSubjectV7(
  subject: ArtSubjectV7,
): ArtSubjectV7 | null {
  const match = NINTH_UNIT_STAND_IN_PATTERN_V7.exec(subject);
  if (match === null) return null;
  const entry =
    NINTH_UNIT_STAND_INS_V7[match[2] as Exclude<FactionIdV7, "ORIGINAL">];
  return entry === undefined
    ? null
    : (`${match[1] ?? "UNIT"}:${match[2] ?? ""}:${entry.standIn}` as ArtSubjectV7);
}

/**
 * The letter of the stand-in badge of a unit subject drawn with stand-in
 * art, or null for a subject that is no ninth-unit stand-in.
 */
export function ninthUnitStandInLetterV7(
  subject: ArtSubjectV7 | undefined,
): string | null {
  if (subject === undefined) return null;
  const match = NINTH_UNIT_STAND_IN_PATTERN_V7.exec(subject);
  if (match === null) return null;
  return (
    NINTH_UNIT_STAND_INS_V7[match[2] as Exclude<FactionIdV7, "ORIGINAL">]
      ?.letter ?? null
  );
}

/**
 * The Cultists (`pulp_wars-mch9.3`): FACTION STAND-IN ART. A faction
 * registered without art of its own is listed here with a letter. Until an
 * art bead registers a raster for a unit subject of the faction
 * (`UNIT:<FACTION>:<ROLE>`, its ships included), that unit is drawn with the
 * shared Human sprite of its role in the faction's colour
 * (chibiFallbackSubjectV7) and the board marks it with the letter badge the
 * ninth-unit stand-ins wore. A unit whose own raster is registered loses the
 * badge at once; the entry is removed when the faction's art is complete.
 */
export const FACTION_STAND_IN_LETTERS_V7: Readonly<
  Partial<Record<Exclude<FactionIdV7, "ORIGINAL">, string>>
> = Object.freeze({ CULT: "C" });

/**
 * The stand-in letter of a faction without art of its own, or null for a
 * faction that has its art (or none to stand in for: the Humans).
 */
export function factionStandInLetterV7(
  faction: FactionIdV7 | null | undefined,
): string | null {
  if (faction === null || faction === undefined || faction === "ORIGINAL")
    return null;
  return FACTION_STAND_IN_LETTERS_V7[faction] ?? null;
}

const CULT_SUMMONED_SUBJECT_PATTERN_V7 =
  /^UNIT:CULT:(HORROR|HERALD|TENTACLE)(_UNBOUND)?$/;
const CULT_SUMMONED_PORTRAIT_PATTERN_V7 =
  /^PORTRAIT:CULT:(HORROR|HERALD|TENTACLE)$/;

/**
 * The Dwarf revision (bead pulp_wars-78i.6): the subject of a mound, the
 * heap a burrowed unit leaves on its tile (the Mole's, or its rider's with
 * a hammer head beside the drill).
 */
export function moundArtSubjectV7(rider: boolean): ArtSubjectV7 {
  return rider ? "UNIT:DWARF:MOUND_RIDER" : "UNIT:DWARF:MOUND";
}

/**
 * The subject whose art stands in while a faction subject has no usable
 * raster: `UNIT:UNDEAD:<ROLE>` falls back to the Human `UNIT:<ROLE>` (drawn
 * with the Undead badge), and likewise `PORTRAIT:UNDEAD:<ROLE>` and
 * `ICON:ACTION:UNDEAD:RALLY`; `UNIT:GOBLIN:<ROLE>` and `PORTRAIT:GOBLIN:<ROLE>`
 * fall back to the Human art with the Goblin badge, and
 * `ICON:ACTION:GOBLIN:RALLY` (WAAAGH!) to the Human Rally horn. A faction
 * city (`CITY:UNDEAD:<level>`, `CITY:GOBLIN:<level>`, `CITY:DINOSAUR:<level>`)
 * falls back to the Human `CITY:<level>`. Revision 19: `UNIT:DINOSAUR:<ROLE>`
 * and `PORTRAIT:DINOSAUR:<ROLE>` fall back to the Human art with the Dinosaur
 * badge, and `ICON:ACTION:DINOSAUR:RALLY` (War Drums) to the Human Rally
 * horn; the Egg (`UNIT:DINOSAUR:EGG`) has no Human counterpart. The Martian
 * revision (bead pulp_wars-t6s.4): `UNIT:MARTIAN:<ROLE>`,
 * `PORTRAIT:MARTIAN:<ROLE>`, `CITY:MARTIAN:<level>` and
 * `ICON:ACTION:MARTIAN:RALLY` (Psychic Command) fall back like the other
 * factions'. The Ice Folk
 * (bead pulp_wars-7g3.6): `UNIT:ICE_FOLK:<ROLE>`, `PORTRAIT:ICE_FOLK:<ROLE>`
 * and `CITY:ICE_FOLK:<level>` fall back like the other factions'; Deep
 * Winter and Brittle (`ICON:TECH:ICE_FOLK:*`) to the Human Fortification
 * and Explosives art. The Dwarves (bead pulp_wars-78i.6) likewise:
 * `UNIT:DWARF:<ROLE>`, `PORTRAIT:DWARF:<ROLE>`, `CITY:DWARF:<level>` and
 * `ICON:ACTION:DWARF:TEND_WOUNDED` (Repair, to the Human Tend Wounded),
 * Dig In and Blasting Charges (`ICON:TECH:DWARF:*`) to the Human
 * Fortification and Explosives art; the two mounds have no Human
 * counterpart (code-drawn, like the Egg's legacy stand-in), and neither
 * have the Cult's summoned units (`UNIT:CULT:HORROR`, `UNIT:CULT:HERALD`,
 * `UNIT:CULT:TENTACLE` and the two Unbound looks). A faction's
 * naval subject (`UNIT:<FACTION>:<ROLE>`
 * or `PORTRAIT:<FACTION>:<ROLE>` of a ship or the transport, bead
 * pulp_wars-w5j.3) falls back to the shared ship, for any faction. Every
 * other subject (the Martian, Ice Folk and Dwarf ability, status and
 * effect icons included) has no fallback.
 */
export function chibiFallbackSubjectV7(
  subject: ArtSubjectV7,
): ArtSubjectV7 | null {
  // An achievement's Monument (bead pulp_wars-2yc.15) without a raster (the
  // Classic look) is the shared Monument.
  if (subject.startsWith("IMPROVEMENT:MONUMENT:"))
    return "IMPROVEMENT:MONUMENT";
  if (subject === "UNIT:DINOSAUR:EGG") return null;
  if (subject === "UNIT:DWARF:MOUND" || subject === "UNIT:DWARF:MOUND_RIDER")
    return null;
  // The Cult's summoned units (bead pulp_wars-mch9.15) are no unit roles:
  // no Human sprite stands in for a Horror, a Herald or a Tentacle.
  if (CULT_SUMMONED_SUBJECT_PATTERN_V7.test(subject)) return null;
  // The ninth unit (`pulp_wars-w49.17`, 7r55): STAND-IN. A new unit listed
  // in `NINTH_UNIT_STAND_INS_V7` is drawn as the nearest unit of its own
  // faction until its art bead registers its subjects (the board and the
  // Gallery mark it). No unit is listed since bead `pulp_wars-2yc.34`; the
  // seven `<FACTION>:SWORDSMAN` subjects then fall back like every other
  // faction subject (the Human Champion, in a look without their art).
  const standIn = ninthUnitStandInSubjectV7(subject);
  if (standIn !== null) return standIn;
  // A Submarine riding low (bead pulp_wars-5ti.6) without its own raster
  // (the Classic look, a faction with no Submarine art) is drawn surfaced:
  // the shared Submarine in the owner's colour.
  if (navalArtRoleOfSubjectV7(subject) === "SUBMARINE_SUBMERGED")
    return "UNIT:SUBMARINE";
  const naval = navalSharedSubjectV7(subject);
  if (naval !== null) return naval;
  if (
    subject === "ICON:TECH:ICE_FOLK:FORTIFICATION" ||
    subject === "ICON:TECH:DWARF:FORTIFICATION"
  )
    return "ICON:TECH:FORTIFICATION";
  if (
    subject === "ICON:TECH:ICE_FOLK:EXPLOSIVES" ||
    subject === "ICON:TECH:DWARF:EXPLOSIVES" ||
    // The Candy Peppermint Surprise (bead pulp_wars-jdb.6); Home Sweet Home
    // (and the retired Frosting) fall back by the faction rule below.
    subject === "ICON:TECH:CANDY:EXPLOSIVES" ||
    // The Cult's The Stars Are Right (bead pulp_wars-mch9.23); Warding
    // Circles falls back by the faction rule below.
    subject === "ICON:TECH:CULT:EXPLOSIVES"
  )
    return "ICON:ACTION:BLAST_MOUNTAIN";
  // The Cult's Harvest Rites (bead pulp_wars-mch9.23): Farming shows the
  // Farm for every other faction, and for the Cult in a look without its art.
  if (subject === "ICON:TECH:CULT:FARMING") return "IMPROVEMENT:FARM";
  // The portraits of the Cult's summoned units: no Human counterpart.
  if (CULT_SUMMONED_PORTRAIT_PATTERN_V7.test(subject)) return null;
  for (const faction of [
    ":UNDEAD:",
    ":GOBLIN:",
    ":DINOSAUR:",
    ":MARTIAN:",
    ":ICE_FOLK:",
    ":DWARF:",
    ":CANDY:",
    ":CULT:",
  ])
    if (subject.includes(faction))
      return subject.replace(faction, ":") as ArtSubjectV7;
  return null;
}

export type ChibiAssetClassV7 =
  | "TERRAIN"
  | "TALL_TERRAIN"
  | "STANDARD_UNIT"
  | "LARGE_UNIT"
  | "GIANT_UNIT"
  | "SETTLEMENT"
  | "BUILDING"
  | "RESOURCE"
  /** Interface portrait (DOM only), owned: 48 x 48, centred. */
  | "PORTRAIT"
  /** Interface icon (DOM only), unowned: up to 48 x 48, centred. */
  | "ICON"
  /**
   * Board status marker (Plague, Bitten), unowned, centred. The one class
   * not drawn at 1 master px per CSS px: a 32 x 32 master (Pixflux's
   * smallest canvas; Pixen's 16 x 16 output was noise) is drawn into the
   * 16 CSS px marker frame, which is 1:1 on DPR 2 screens.
   */
  | "STATUS"
  /** Board ability effect sprite, unowned: up to 48 x 48, centred. */
  | "EFFECT";

export interface ChibiPointV7 {
  readonly x: number;
  readonly y: number;
}

/**
 * One checked-in chibi raster. All sizes are DPR-1 master pixels, which are
 * CSS pixels at zoom 1 (one 80 x 80 tile).
 */
export interface ChibiArtAssetV7 {
  readonly id: string;
  readonly subject: ArtSubjectV7;
  readonly assetClass: ChibiAssetClassV7;
  readonly width: number;
  readonly height: number;
  /** Public URL of the DPR-1 master PNG. */
  readonly url: string;
  /**
   * Master pixel placed on the owning cell centre. Omit it to use the class
   * placement: bottom-centred units, settlements, buildings and tall terrain
   * (anchor = width / 2, height - 40), centred terrain and resources.
   */
  readonly anchor?: ChibiPointV7;
  /** Optional pre-built integer nearest-neighbour upscales of the master. */
  readonly densityUrls?: Readonly<Partial<Record<2 | 3, string>>>;
  /**
   * Checked-in owner mask PNG with the master's exact dimensions. A pixel
   * with alpha >= 128 marks an owner-colour pixel; everything else is kept.
   */
  readonly ownerMaskUrl?: string;
  /**
   * The new visual direction (bead pulp_wars-3tq.5): a unit, city or
   * portrait drawn in its faction's fixed colours. It has no owner area and
   * no mask, and is never recoloured; the player is shown by the base
   * plate, the pennant and the interface instead.
   */
  readonly fixedColours?: true;
  /**
   * TALL_TERRAIN only: the two layers the master was composited from (the
   * pipeline's ground composite), so a Road can pass between them. The body
   * has the master's size and anchor and is transparent where the master
   * shows ground; the ground is the 80 x 80 tile under the owning cell.
   * Master = body over ground, pixel for pixel (checked by art:validate).
   */
  readonly layers?: ChibiTallTerrainLayersV7;
}

export interface ChibiTallTerrainLayersV7 {
  /** Public URL of the transparent body PNG (master size). */
  readonly bodyUrl: string;
  /** Public URL of the accepted 80 x 80 ground tile under the body. */
  readonly groundUrl: string;
}

export interface ChibiClassGeometryV7 {
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly placement: "CELL" | "CENTRE" | "BOTTOM_CENTRE";
  /** Largest allowed overflow beyond either side of the 80 px cell. */
  readonly maxSideOverflow: number;
  /** Largest allowed overflow above the 80 px cell. */
  readonly maxUpOverflow: number;
}

export const CHIBI_TILE_CSS_PX = 80;

/** Normative canvas and overflow table from CHIBI_ART_DIRECTION.md section 3. */
export const CHIBI_CLASS_GEOMETRY_V7 = {
  TERRAIN: {
    maxWidth: 80,
    maxHeight: 80,
    placement: "CELL",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  TALL_TERRAIN: {
    maxWidth: 80,
    maxHeight: 104,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 24,
  },
  STANDARD_UNIT: {
    maxWidth: 56,
    maxHeight: 80,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  LARGE_UNIT: {
    maxWidth: 72,
    maxHeight: 88,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 4,
    maxUpOverflow: 8,
  },
  GIANT_UNIT: {
    maxWidth: 88,
    maxHeight: 104,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 4,
    maxUpOverflow: 24,
  },
  SETTLEMENT: {
    maxWidth: 96,
    maxHeight: 104,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 8,
    maxUpOverflow: 24,
  },
  BUILDING: {
    maxWidth: 80,
    maxHeight: 88,
    placement: "BOTTOM_CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 8,
  },
  RESOURCE: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  PORTRAIT: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  ICON: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  STATUS: {
    maxWidth: 32,
    maxHeight: 32,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
  EFFECT: {
    maxWidth: 48,
    maxHeight: 48,
    placement: "CENTRE",
    maxSideOverflow: 0,
    maxUpOverflow: 0,
  },
} as const satisfies Readonly<Record<ChibiAssetClassV7, ChibiClassGeometryV7>>;

export interface ChibiOverflowV7 {
  readonly left: number;
  readonly right: number;
  readonly up: number;
  readonly down: number;
}

export function chibiAnchorV7(asset: ChibiArtAssetV7): ChibiPointV7 {
  if (asset.anchor !== undefined) return asset.anchor;
  const half = CHIBI_TILE_CSS_PX / 2;
  return CHIBI_CLASS_GEOMETRY_V7[asset.assetClass].placement === "BOTTOM_CENTRE"
    ? { x: asset.width / 2, y: asset.height - half }
    : { x: asset.width / 2, y: asset.height / 2 };
}

/** Overflow of the master canvas beyond its 80 x 80 owning cell, in CSS px at zoom 1. */
export function chibiOverflowV7(asset: ChibiArtAssetV7): ChibiOverflowV7 {
  const anchor = chibiAnchorV7(asset);
  const half = CHIBI_TILE_CSS_PX / 2;
  return {
    left: Math.max(0, anchor.x - half),
    right: Math.max(0, asset.width - anchor.x - half),
    up: Math.max(0, anchor.y - half),
    down: Math.max(0, asset.height - anchor.y - half),
  };
}

const OWNED_SUBJECT_PREFIXES = ["UNIT:", "CITY:", "PORTRAIT:"] as const;

function allowedClasses(subject: ArtSubjectV7): readonly ChibiAssetClassV7[] {
  if (
    subject === "TERRAIN:FOREST" ||
    subject === "TERRAIN:UNDEAD:FOREST" ||
    subject === "TERRAIN:MOUNTAIN" ||
    subject === "TERRAIN:MINED_MOUNTAIN"
  )
    return ["TERRAIN", "TALL_TERRAIN"];
  if (subject.startsWith("TERRAIN:")) return ["TERRAIN"];
  if (subject.startsWith("RESOURCE:")) return ["RESOURCE"];
  if (subject.startsWith("IMPROVEMENT:")) return ["BUILDING"];
  if (subject.startsWith("UNIT:"))
    return ["STANDARD_UNIT", "LARGE_UNIT", "GIANT_UNIT"];
  if (subject.startsWith("CITY:") || subject === "SITE:VILLAGE")
    return ["SETTLEMENT"];
  if (subject.startsWith("PORTRAIT:")) return ["PORTRAIT"];
  if (subject.startsWith("ICON:")) return ["ICON"];
  if (subject.startsWith("STATUS:")) return ["STATUS"];
  if (subject.startsWith("EFFECT:")) return ["EFFECT"];
  return ["RESOURCE", "BUILDING"];
}

/** Returns every contract violation of one manifest entry; empty means valid. */
export function chibiAssetProblemsV7(asset: ChibiArtAssetV7): string[] {
  const problems: string[] = [];
  const limits = CHIBI_CLASS_GEOMETRY_V7[asset.assetClass];
  const label = `${asset.id} (${asset.subject}, ${asset.assetClass})`;
  if (!allowedClasses(asset.subject).includes(asset.assetClass))
    problems.push(`${label}: class does not fit the subject`);
  if (
    !Number.isInteger(asset.width) ||
    !Number.isInteger(asset.height) ||
    asset.width <= 0 ||
    asset.height <= 0
  )
    problems.push(`${label}: master size must be positive integers`);
  if (asset.width > limits.maxWidth || asset.height > limits.maxHeight)
    problems.push(
      `${label}: ${asset.width} x ${asset.height} exceeds ${limits.maxWidth} x ${limits.maxHeight}`,
    );
  if (
    limits.placement === "CELL" &&
    (asset.width !== CHIBI_TILE_CSS_PX || asset.height !== CHIBI_TILE_CSS_PX)
  )
    problems.push(`${label}: terrain tiles must be exactly 80 x 80`);
  if (asset.assetClass === "TALL_TERRAIN" && asset.width !== CHIBI_TILE_CSS_PX)
    problems.push(`${label}: tall terrain must be exactly 80 px wide`);
  const overflow = chibiOverflowV7(asset);
  if (Math.max(overflow.left, overflow.right) > limits.maxSideOverflow)
    problems.push(
      `${label}: side overflow ${Math.max(overflow.left, overflow.right)} exceeds ${limits.maxSideOverflow}`,
    );
  if (overflow.up > limits.maxUpOverflow)
    problems.push(
      `${label}: upward overflow ${overflow.up} exceeds ${limits.maxUpOverflow}`,
    );
  if (overflow.down > 0)
    problems.push(`${label}: nothing may overflow below its cell`);
  const ownedSubject = OWNED_SUBJECT_PREFIXES.some((prefix) =>
    asset.subject.startsWith(prefix),
  );
  if (
    ownedSubject &&
    asset.ownerMaskUrl === undefined &&
    asset.fixedColours !== true
  )
    problems.push(`${label}: owned subjects need a checked-in owner mask`);
  if (asset.fixedColours === true && asset.ownerMaskUrl !== undefined)
    problems.push(
      `${label}: fixed colours and an owner mask exclude each other`,
    );
  if (asset.fixedColours === true && !ownedSubject)
    problems.push(
      `${label}: only units, cities and portraits declare fixed colours`,
    );
  if (asset.layers !== undefined && asset.assetClass !== "TALL_TERRAIN")
    problems.push(`${label}: only tall terrain has ground and body layers`);
  return problems;
}

export interface ChibiArtRegistryV7 {
  /** Accepted variants of one subject in manifest order; empty means fall back. */
  variants(subject: ArtSubjectV7): readonly ChibiArtAssetV7[];
}

export function buildChibiArtRegistryV7(assets: readonly ChibiArtAssetV7[]): {
  readonly registry: ChibiArtRegistryV7;
  readonly problems: readonly string[];
} {
  const problems: string[] = [];
  const ids = new Set<string>();
  const bySubject = new Map<ArtSubjectV7, ChibiArtAssetV7[]>();
  for (const asset of assets) {
    const assetProblems = chibiAssetProblemsV7(asset);
    if (ids.has(asset.id))
      assetProblems.push(`${asset.id}: duplicate asset id`);
    ids.add(asset.id);
    if (assetProblems.length > 0) {
      problems.push(...assetProblems);
      continue;
    }
    bySubject.set(asset.subject, [
      ...(bySubject.get(asset.subject) ?? []),
      asset,
    ]);
  }
  return {
    registry: { variants: (subject) => bySubject.get(subject) ?? [] },
    problems,
  };
}

/** Deterministic cosmetic variant, the same coordinate hash legacy terrain uses. */
export function chibiVariantV7(
  variants: readonly ChibiArtAssetV7[],
  at: ChibiPointV7,
): ChibiArtAssetV7 | null {
  if (variants.length === 0) return null;
  const index =
    (((Math.floor(at.x) * 31 + Math.floor(at.y) * 17) % variants.length) +
      variants.length) %
    variants.length;
  return variants[index] ?? null;
}
