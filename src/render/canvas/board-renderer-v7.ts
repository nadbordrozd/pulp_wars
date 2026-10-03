import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_FARM_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
  resourceMapArtIdV7,
  RULESET7_UNIT_ART_IDS,
} from "../../assets/ruleset7-ui-art";
import type {
  CommandV7,
  CoordV7,
  ImprovementIdV7,
  PlayerViewV7,
  UnitRoleIdV7,
} from "../../engine/index";
import {
  playerFactionV7,
  previewAttackExplosionsV7,
  previewHatchV7,
  previewKaboomV7,
  previewDevourV7,
  previewRaiseDeadV7,
  previewTendWoundedV7,
  previewWailV7,
  queryCombatPreviewV7,
  queryLandingPreviewV7,
  unitGrowthStageV7,
  unitRoleRuleV7,
  WAIL_RADIUS_V7,
} from "../../engine/index";
import {
  LAY_EGG_PROMPT_V7,
  dinosaurCombatNoteV7,
  dinosaurCombatSemanticNoteV7,
  hatchBlockedEggsV7,
  matchHasDinosaurV7,
  turnsTextV7,
  unitDisplayNameV7,
} from "../dinosaur-presentation-v7";
import {
  combatPreviewNoteV7,
  combatPreviewSemanticNoteV7,
  matchHasUndeadV7,
  tendTargetLabelV7,
  type AfflictionIdV7,
} from "../undead-presentation-v7";
import {
  abilityAreaStrokeV7,
  drawAbilityAreaCellV7,
  drawAbilityTargetV7,
  undeadPreviewStyleV7,
  afflictionSubjectV7,
  drawAfflictionMarkerV7,
  drawPreviewTextStackV7,
  type PreviewTextBoxV7,
  drawGraveCornerMarkerV7,
  drawUndeadBadgeV7,
  type AbilityPreviewStyleV7,
  type AfflictionSubjectV7,
} from "./undead-canvas-v7";
import {
  drawCodeEggV7,
  drawDinosaurBadgeV7,
  drawEggCountdownV7,
  drawGrowthChevronsV7,
  growthSpriteScaleV7,
} from "./dinosaur-canvas-v7";
import { drawGoblinBadgeV7 } from "./goblin-canvas-v7";
import {
  FLYER_LIFT_LEGACY_V7,
  FLYER_LIFT_MASTER_PX_V7,
  drawCoolingGlyphV7,
  drawFlyerShadowV7,
  drawMartianBadgeV7,
  drawShieldBarV7,
  drawThrallCollarV7,
  drawThrallLinkV7,
  drawWadeRipplesV7,
  type MartianUnitMarkersV7,
} from "./martian-canvas-v7";
import {
  addMartianPickEntriesV7,
  addMartianSelectionEntriesV7,
  martianAttackTargetExtrasV7,
  martianMachineV7,
  martianMoveLabelV7,
  martianPickTargetsV7,
  martianUnitMarkersV7,
  type MartianPickV7,
} from "./martian-board-plan-v7";
import { matchHasMartianV7, unitIsThrallV7 } from "../martian-presentation-v7";
import {
  drawBlizzardCellV7,
  drawBlizzardRingV7,
  drawChillGlyphV7,
  drawFrozenCasingV7,
  drawFrostedRimeV7,
  drawIceFolkBadgeV7,
  drawShatterCracksV7,
  drawShatterWindowV7,
  drawSnowCapsV7,
  drawSnowCellV7,
  type HpBarGeometryV7,
  type IceFolkBoardArtV7,
} from "./ice-folk-canvas-v7";
import {
  addIceFolkPickEntriesV7,
  iceFolkAttackTargetExtrasV7,
  iceFolkPickTargetsV7,
  iceFolkTerrainCellsV7,
  iceFolkUnitMarkersV7,
  selectedWitchV7,
  type IceFolkPickV7,
  type IceFolkSnowCellV7,
  type IceFolkUnitMarkersV7,
} from "./ice-folk-board-plan-v7";
import { shatterBoardCueV7 } from "./ice-folk-effects-v7";
import {
  addDwarfPickEntriesV7,
  dwarfAttackTargetExtrasV7,
  dwarfEngineerSelectedV7,
  dwarfMoundEntriesV7,
  dwarfPickTargetsV7,
  dwarfUnitMarkersV7,
  type DwarfMoundMarkerV7,
  type DwarfPickV7,
  type DwarfUnitMarkersV7,
} from "./dwarf-board-plan-v7";
import {
  drawClockworkGearV7,
  drawCodeMoundV7,
  drawDigInEarthworkV7,
  drawDwarfBadgeV7,
  drawEruptionRingV7,
  drawMoundChipV7,
  type DwarfBoardArtV7,
} from "./dwarf-canvas-v7";
import { matchHasDwarfSeatV7 } from "../dwarf-presentation-v7";
import {
  SHATTERS_PREVIEW_V7,
  matchHasIceFolkSeatV7,
} from "../ice-folk-presentation-v7";
import {
  blastPreviewPresentationV7,
  goblinAttackPreviewTextV7,
  matchHasGoblinV7,
  splashEntryFriendlyV7,
  type BlastPreviewPresentationV7,
} from "../goblin-presentation-v7";
import {
  RULESET6_UNIT_ART_GEOMETRY,
  RULESET7_CAPTAIN_ART_GEOMETRY,
  RULESET7_KNIGHT_ART_GEOMETRY,
  RULESET7_LOGISTICS_ART_GEOMETRY,
  RULESET7_NAVAL_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  SQUARE_ART_GEOMETRY,
  anchoredDestinationRect,
  cityArtLevel,
  type SourceGeometry,
} from "./board-art-geometry";
import { drawUncachedGlowV7, type BoardGlowCacheV7 } from "./glow-cache-v7";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  type CameraState,
  type Size,
  type TileEdge,
} from "./geometry";
import { readinessUnitStyleV7 } from "./readiness-presentation";
import {
  PREVIEW_EDGE_MARGIN_CSS_PX_V7,
  PreviewLabelPlacerV7,
  type PreviewRectV7,
} from "./preview-label-layout-v7";
import { selectionJumpOffsetCssPx } from "./selection-jump-presentation";
import { RULESET7_TACTICAL_UI_SYMBOL_BY_ID } from "../../assets/ruleset7-tactical-ui-symbols";
import { tacticalAttachmentsV7 } from "../tactical-presentation-v7";
import type {
  ArtSetV7,
  ArtSubjectV7,
  ChibiArtAssetV7,
  RiftPieceV7,
} from "../../assets/chibi-art-v7";
import {
  chibiOverflowV7,
  cityArtSubjectV7,
  unitArtSubjectV7,
} from "../../assets/chibi-art-v7";
import {
  resolveChibiWithFallbackV7,
  type ChibiBoardArtV7,
  type ChibiEntryResolutionV7,
  type ChibiResolutionV7,
} from "./chibi-art-resolver-v7";
import {
  clampSaturationPercentV7,
  desaturateHexColourV7,
  type BoardSaturationV7,
  type SpriteSaturationCacheV7,
} from "./sprite-saturation-v7";
import {
  CHIBI_GARRISON_SCALE,
  chibiDestinationRect,
  chibiTerrainPartRect,
  chibiGarrisonDestinationRect,
  chibiMasterScale,
  isWholeScale,
  snapCameraToDevicePixels,
} from "./chibi-geometry-v7";
import { chibiMountainFringeEdgesV7 } from "./chibi-terrain-fringe-v7";
import { drawLegacyRiftV7, riftPieceV7 } from "./rift-presentation-v7";
import { RULESET7_PLAYER_COLORS } from "./owner-recolour-v7";
import {
  CALM_ROAD_STROKES_V7,
  DIRECTED_BASE_HP_BAR_TOP_V7,
  drawDirectedFlagV7,
  drawDirectedPieceChromeV7,
  drawDirectedTerritoryBoundaryV7,
  drawDirectedUnitBaseV7,
  type BoardDirectionRuntimeV7,
} from "./visual-direction-v7";

export type BoardSelectionV7 =
  | { readonly kind: "TILE"; readonly at: CoordV7 }
  | { readonly kind: "UNIT"; readonly unitId: number }
  | { readonly kind: "CITY"; readonly cityId: number };

export interface BoardRenderInteractionV7 {
  readonly selection: BoardSelectionV7 | null;
  readonly selectedUnitId: number | null;
  readonly selectedAchievement: null;
  readonly cursor?: CoordV7 | null;
  /**
   * Revision 17: the own unit whose offered Kaboom is previewed on the board
   * (its Kaboom button is hovered, focused, or armed); null or omitted
   * shows none.
   */
  readonly kaboomPreviewUnitId?: number | null;
  /**
   * Revision 19: the own city and egg-laid role whose nest tile is being
   * picked. Its legal nest tiles become the only map targets; null or
   * omitted picks none.
   */
  readonly layEgg?: {
    readonly cityId: number;
    readonly role: UnitRoleIdV7;
  } | null;
  /**
   * The Martian revision (bead pulp_wars-t6s.4): the Beam Down, Mind
   * Control or Tractor Beam being aimed by the selected unit. Its targets
   * become the only map targets; null or omitted aims none.
   */
  readonly martianPick?: MartianPickV7 | null;
  /**
   * The Ice Folk revision (bead pulp_wars-7g3.6): the Bolas or Cold Snap
   * being aimed by the selected unit. Its targets become the only map
   * targets; null or omitted aims none.
   */
  readonly iceFolkPick?: IceFolkPickV7 | null;
  /**
   * The Dwarf revision (bead pulp_wars-78i.6): the Tunnel, Bomb Run or
   * Assemble being aimed by the selected unit. Its targets become the only
   * map targets; null or omitted aims none.
   */
  readonly dwarfPick?: DwarfPickV7 | null;
}

/** Revision 19: the ID of the legacy code-drawn Egg (no raster exists). */
export const EGG_CODE_ART_ID_V7 = "unit-dinosaur-egg-code";

/**
 * Revision 16 landing preview marker labels (section 8): a direct landing
 * cell, and a cell reached by one water step then landing.
 */
export const LANDING_NOW_LABEL_V7 = "Land now";
export const LANDING_AFTER_MOVE_LABEL_V7 = "Move 1, then land";

export interface MapCommandTargetV7 {
  readonly at: CoordV7;
  readonly command: CommandV7;
  readonly family:
    | "MOVE"
    | "ATTACK"
    | "MONUMENT"
    | "DISEMBARK"
    | "LANDING_AFTER_MOVE"
    /** Revision 19: an adjacent own Egg a Shaman may hatch. */
    | "HATCH"
    /** Revision 19: a legal nest tile of the Egg being laid. */
    | "LAY_EGG"
    /**
     * The Martian revision: a Beam Down passenger (choosing it moves on to
     * the tiles; nothing is dispatched), a Beam Down tile, a Mind Control
     * target and a Tractor Beam target.
     */
    | "BEAM_DOWN_PASSENGER"
    | "BEAM_DOWN"
    | "MIND_CONTROL"
    | "TRACTOR_BEAM"
    /**
     * The Ice Folk revision: a Bolas target, and a Cold Snap target (every
     * one carries the same command, so choosing any of them casts it).
     */
    | "THROW_BOLAS"
    | "COLD_SNAP"
    /**
     * The Dwarf revision: a Tunnel destination (TUNNEL dispatches the
     * Mole alone; TUNNEL_DESTINATION, with a Hammerer next to the Mole,
     * moves on to the rider prompt), a rider tile (TUNNEL_RIDER), a bomb
     * target (BOMB_TARGET moves on to the landing tiles), a landing
     * (BOMB_RUN) and an Assemble tile.
     */
    | "TUNNEL"
    | "TUNNEL_DESTINATION"
    | "TUNNEL_RIDER"
    | "BOMB_TARGET"
    | "BOMB_RUN"
    | "ASSEMBLE";
  /**
   * Revision 16: a two-command landing. `command` is the one-cell Move to
   * the intermediate water cell; the UI sends this `DISEMBARK` only when that
   * Move reaches the cell and the landing is still offered.
   */
  readonly followUp?: Extract<CommandV7, { kind: "DISEMBARK" }>;
  readonly previewLabel?: string;
  readonly semanticLabel?: string;
  /**
   * Revision 13: Lifesteal and Infect outcome line (Undead matches only);
   * revision 17 adds "Gang Up +N" (Goblin matches only).
   */
  readonly previewNote?: string;
  /**
   * The Martian revision: a note that is the same for each of the selected
   * unit's targets (a ray's power and its Cooling), drawn only on the
   * focused target (or the only one), so a row of targets stays calm.
   */
  readonly previewFocusNote?: string;
  /**
   * The Martian revision: a machine's Move that ends on water and
   * self-launches it ("Launch: crosses water as a transport").
   */
  readonly launch?: true;
  /**
   * Revision 17 (Goblin matches only): death-blast, chain, bomb-splash and
   * friendly-fire warnings, one warning box each under the target.
   */
  readonly previewWarnings?: readonly string[];
  /**
   * Revision 17: a short summary of `previewWarnings` (for example "Chain:
   * 2 blasts · 3 yours hit"), drawn instead of them when the full warning
   * stack would overlap another preview label (bead pulp_wars-0ao.12).
   */
  readonly previewWarningSummary?: string;
  /**
   * Revision 17: the death blasts this attack sets off (Goblin matches
   * only), shown on the board while the target is focused.
   */
  readonly blast?: BlastPreviewPresentationV7;
  /**
   * The Martian revision: the tile a Tractor Beam target is pulled to, shown
   * while the target is focused.
   */
  readonly pullTo?: CoordV7;
  /**
   * The Martian revision: the unit a Tripod's ray pierces, shown while the
   * target is focused (friendly fire is marked).
   */
  readonly pierce?: {
    readonly at: CoordV7;
    readonly label: string;
    readonly friendly: boolean;
    readonly lethal: boolean;
    readonly note: string;
  };
  /**
   * The Ice Folk revision: a Mammoth's Sweep flank victims, shown while the
   * target is focused.
   */
  readonly sweep?: readonly {
    readonly at: CoordV7;
    readonly label: string;
    readonly lethal: boolean;
  }[];
  /**
   * The Dwarf revision: a Tunnel destination's eruption forecast (the ring
   * and each visible hostile unit on the ground "if they stay"), shown
   * while the destination is focused.
   */
  readonly eruption?: {
    readonly at: CoordV7;
    readonly targets: readonly {
      readonly at: CoordV7;
      readonly label: string;
      readonly lethal: boolean;
    }[];
    readonly undermines: readonly CoordV7[];
  };
  /**
   * The Dwarf revision: where a Steam Cannon's shot knocks its target back
   * (or that the push is blocked), shown while the target is focused.
   */
  readonly knockback?: { readonly to: CoordV7; readonly blocked: boolean };
  /** Revision 13: public splash entries of this attack (Undead matches only). */
  readonly splash?: readonly {
    readonly at: CoordV7;
    readonly damage: number;
    readonly dies: boolean;
    /** Revision 14: this Lich attack newly plagues the splashed unit. */
    readonly plagued?: boolean;
    /** Revision 17: a Bomb Chucker's bomb hits an own or allied unit. */
    readonly friendly?: boolean;
  }[];
}

export interface BoardRenderPlanEntryV7 {
  readonly key: string;
  readonly layer: number;
  readonly at: CoordV7;
  readonly kind:
    | "FOG"
    | "TERRAIN"
    | "ROAD"
    | "ROAD_JOIN"
    | "RESOURCE"
    | "IMPROVEMENT"
    | "FIELD_DEFENSE"
    | "SITE"
    | "TREASURE"
    | "CITY"
    | "UNIT"
    | "VALUE"
    | "TARGET"
    | "REACH"
    | "STATUS"
    | "LINK"
    | "TERRITORY_BOUNDARY"
    | "SELECTION"
    | "CURSOR"
    | "GRAVE"
    | "ABILITY_AREA"
    | "ABILITY_TARGET";
  readonly assetId?: string;
  /** Art-set-neutral subject; the CHIBI art set resolves its raster from it. */
  readonly artSubject?: ArtSubjectV7;
  readonly roadNeighbors?: readonly CoordV7[];
  readonly roadJoins?: readonly (readonly [CoordV7, CoordV7])[];
  /** A pair Farm is cropped into one source half per authoritative cell. */
  readonly sourceCrop?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly farmPartner?: CoordV7;
  readonly label?: string;
  readonly ownerId?: number | null;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly value?: number;
  readonly target?: MapCommandTargetV7;
  readonly population?: number;
  readonly ready?: boolean;
  readonly ownerColor?: string;
  readonly counterpartOwnerColor?: string;
  readonly ownerSeat?: number;
  readonly statusId?: string;
  readonly pulse?: boolean;
  readonly linkTo?: CoordV7;
  readonly attachmentSlot?: number;
  readonly edge?: TileEdge;
  readonly targetEdges?: readonly TileEdge[];
  readonly boundaryStyle?: "OWNER" | "CITY";
  /**
   * RESOURCE only: the same cell's improvement art already shows this
   * resource (a Mine's ore cart over Ore, a Farm's wheat over Fertile
   * Ground). The CHIBI art set skips it; LEGACY still draws it.
   */
  readonly coveredByImprovement?: boolean;
  /** CITY only: the owner's capital (marked by a crown in the CHIBI art set). */
  readonly capital?: boolean;
  /**
   * UNIT only: an Undead-, Goblin- or Dinosaur-owned unit. It is drawn
   * with its faction badge unless the CHIBI art set shows its own faction
   * raster.
   */
  readonly faction?:
    "UNDEAD" | "GOBLIN" | "DINOSAUR" | "MARTIAN" | "ICE_FOLK" | "DWARF";
  /**
   * UNIT only, revision 14: the public Plague and Bitten statuses, drawn as
   * small markers in the piece's overlay frame (absent when there are none).
   */
  readonly afflictions?: readonly AfflictionIdV7[];
  /** ABILITY_AREA / ABILITY_TARGET: the previewed ability. */
  readonly abilityStyle?: AbilityPreviewStyleV7;
  /** ABILITY_TARGET: lethal previewed damage. */
  readonly lethal?: boolean;
  /**
   * UNIT only, revision 19: a visible Egg of any owner and its public
   * countdown (owner Start Turns until it hatches).
   */
  readonly egg?: { readonly turnsRemaining: number };
  /** UNIT only, revision 19: a grown Dinosaur unit, Big (1) or Alpha (2). */
  readonly growthStage?: 1 | 2;
  /**
   * UNIT only, the Martian revision: the Shield, Cooling, Thrall, flying
   * and afloat markers of a visible Martian unit.
   */
  readonly martian?: MartianUnitMarkersV7;
  /**
   * TERRAIN only, the Ice Folk revision: the cell is Snow (the view's flag);
   * the overlay is drawn over its ground and under Roads, bodies and units.
   */
  readonly snow?: IceFolkSnowCellV7;
  /** TERRAIN only, the Ice Folk revision: the cell is in a known Blizzard. */
  readonly blizzard?: true;
  /**
   * TERRAIN only, the Rift (bead pulp_wars-9s0.5): the piece of the crack
   * this cell shows. LEGACY draws it in code over the cell's Grass.
   */
  readonly riftPiece?: RiftPieceV7;
  /**
   * UNIT only, the Ice Folk revision: the Chill markers, the HP bar's
   * Shatter window and the Witch of a visible unit (any owner).
   */
  readonly iceFolk?: IceFolkUnitMarkersV7;
  /** UNIT only, the Ice Folk revision: the selected Witch's outline. */
  readonly blizzardRing?: true;
  /**
   * UNIT only, the Dwarf revision: the Dig In earthwork, the clockwork gear
   * and the Gyrocopter's flight of a visible Dwarf unit.
   */
  readonly dwarf?: DwarfUnitMarkersV7;
  /**
   * UNIT only, the Dwarf revision: this entry is a mound (`mound:<id>`), a
   * burrowed Mole or its rider, drawn where the unit would stand.
   */
  readonly dwarfMound?: DwarfMoundMarkerV7;
}

export interface BoardRenderPlanV7 {
  readonly version: 7;
  readonly entries: readonly BoardRenderPlanEntryV7[];
  readonly targets: readonly MapCommandTargetV7[];
}

const PLAYER_COLORS = RULESET7_PLAYER_COLORS;

const TILE_EDGES: readonly TileEdge[] = ["NORTH", "EAST", "SOUTH", "WEST"];

export function buildBoardRenderPlanV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  interaction: BoardRenderInteractionV7,
): BoardRenderPlanV7 {
  const entries: BoardRenderPlanEntryV7[] = [];
  const farmPresentation = farmPresentationV7(view);
  const roadKeys = new Set(
    view.board.tiles
      .filter((tile) => tile.explored && tile.road)
      .map((tile) => coordKey(tile.at)),
  );
  const exploredKeys = new Set(
    view.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => coordKey(tile.at)),
  );
  const cityKeys = new Set(
    view.cities
      .filter((city) => exploredKeys.has(coordKey(city.at)))
      .map((city) => coordKey(city.at)),
  );
  for (const cityKey of cityKeys) roadKeys.add(cityKey);
  // The Ice Folk revision: Snow and the Blizzard from the view's tile flags
  // (a match without an Ice Folk seat has neither).
  const iceFolkMatch = matchHasIceFolkSeatV7(view);
  const winter = iceFolkMatch ? iceFolkTerrainCellsV7(view) : null;
  // The Rift (bead pulp_wars-9s0.5): a piece read from explored cells only.
  const riftAt = (at: CoordV7): boolean | null => {
    if (
      at.x < 0 ||
      at.y < 0 ||
      at.x >= view.board.width ||
      at.y >= view.board.height
    )
      return false;
    const near = view.board.tiles[at.y * view.board.width + at.x];
    return near?.explored === true ? near.terrain === "RIFT" : null;
  };
  for (const tile of view.board.tiles) {
    if (!tile.explored) {
      entries.push({
        key: `fog:${tile.at.x},${tile.at.y}`,
        kind: "FOG",
        layer: 0,
        at: tile.at,
      });
      continue;
    }
    const riftPiece =
      tile.terrain === "RIFT" ? riftPieceV7(tile.at, riftAt) : undefined;
    entries.push({
      key: `terrain:${tile.at.x},${tile.at.y}`,
      kind: "TERRAIN",
      layer: 1,
      at: tile.at,
      assetId:
        tile.terrain === "GRASS" || tile.terrain === "RIFT"
          ? `terrain-ruleset7-original-grass-${variant(tile.at, 3)}`
          : tile.terrain === "FOREST"
            ? suppressesForestCanopyV7(tile.improvement)
              ? "terrain-ruleset7-original-grass-1"
              : `terrain-ruleset7-original-forest-${variant(tile.at, 4)}`
            : tile.terrain === "MOUNTAIN"
              ? `terrain-ruleset7-revision3-${tile.improvement === "MINE" ? "mined-" : ""}mountain-${variant(tile.at, 3)}`
              : tile.terrain === "SHALLOW_WATER"
                ? "terrain-ruleset7-water-shallow"
                : "terrain-ruleset7-water-deep",
      artSubject:
        riftPiece !== undefined
          ? `TERRAIN:RIFT_${riftPiece}`
          : tile.terrain === "FOREST" &&
              suppressesForestCanopyV7(tile.improvement)
            ? "TERRAIN:GRASS"
            : tile.terrain === "MOUNTAIN" && tile.improvement === "MINE"
              ? "TERRAIN:MINED_MOUNTAIN"
              : `TERRAIN:${tile.terrain}`,
      ...(riftPiece === undefined ? {} : { riftPiece }),
      ownerId: tile.territoryOwnerId,
      ...ownerPresentation(view, tile.territoryOwnerId),
      ...(winter === null
        ? {}
        : {
            ...snowOf(winter.snow, tile.at),
            ...(winter.blizzard.has(coordKey(tile.at))
              ? { blizzard: true as const }
              : {}),
          }),
    });
    const joins: (readonly [CoordV7, CoordV7])[] = [];
    for (const dx of [-1, 1])
      for (const dy of [-1, 1]) {
        const horizontal = { x: tile.at.x + dx, y: tile.at.y };
        const vertical = { x: tile.at.x, y: tile.at.y + dy };
        if (
          roadKeys.has(coordKey(horizontal)) &&
          roadKeys.has(coordKey(vertical))
        )
          joins.push([horizontal, vertical]);
      }
    if (joins.length > 0)
      entries.push({
        key: `road-join:${tile.at.x},${tile.at.y}`,
        kind: "ROAD_JOIN",
        layer: tile.improvement === "MINE" ? 0.4 : 1.9,
        at: tile.at,
        roadJoins: joins,
      });
    const cityNode = cityKeys.has(coordKey(tile.at));
    const neighbors =
      tile.road || cityNode ? roadNeighbors(tile.at, roadKeys) : [];
    if (tile.road || (cityNode && neighbors.length > 0))
      entries.push({
        key: `road:${tile.at.x},${tile.at.y}`,
        kind: "ROAD",
        // Mine artwork includes its terrain, so it also covers its Road.
        layer: tile.improvement === "MINE" ? 0.5 : 2,
        at: tile.at,
        roadNeighbors: neighbors,
      });
    if (tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE")
      entries.push({
        key: `resource:${tile.at.x},${tile.at.y}`,
        kind: "RESOURCE",
        layer: tile.improvement === "PORT" ? 4 : 3,
        at: tile.at,
        assetId: resourceMapArtIdV7(tile.resource, tile.at),
        artSubject: `RESOURCE:${tile.resource}`,
        ...((tile.resource === "ORE" && tile.improvement === "MINE") ||
        (tile.resource === "FERTILE_GROUND" && tile.improvement === "FARM")
          ? { coveredByImprovement: true }
          : {}),
      });
    if (tile.improvement !== null && tile.improvement !== "MINE") {
      const farm =
        tile.improvement === "FARM"
          ? farmPresentation.get(coordKey(tile.at))
          : undefined;
      entries.push({
        key: `improvement:${tile.at.x},${tile.at.y}`,
        kind: "IMPROVEMENT",
        layer: tile.improvement === "PORT" ? 3 : 4,
        at: tile.at,
        assetId:
          farm?.assetId ?? RULESET7_IMPROVEMENT_ART_IDS[tile.improvement],
        artSubject: `IMPROVEMENT:${tile.improvement}`,
        ownerId: tile.territoryOwnerId,
        ...ownerPresentation(view, tile.territoryOwnerId),
        ...(farm?.sourceCrop === undefined
          ? {}
          : { sourceCrop: farm.sourceCrop }),
        ...(farm?.partner === undefined ? {} : { farmPartner: farm.partner }),
        label: title(tile.improvement),
      });
    }
    if (tile.site === "VILLAGE")
      entries.push({
        key: `site:${tile.at.x},${tile.at.y}`,
        kind: "SITE",
        layer: 4,
        at: tile.at,
        assetId: "building-village",
        artSubject: "SITE:VILLAGE",
        label: "Village",
      });
    if (
      (tile.fortificationLevel ?? 0) > 0 ||
      (tile.fieldDefense && tile.fortificationLevel === null)
    )
      entries.push({
        key: `field-defense:${tile.at.x},${tile.at.y}`,
        kind: "FIELD_DEFENSE",
        layer: 8,
        at: tile.at,
        ...(tile.fortificationLevel === null
          ? {}
          : { value: tile.fortificationLevel }),
        label: "Field defense",
      });
  }
  // No water-boundary lines are planned (playtest round 3, pulp_wars-6gd.4):
  // coasts and the Shallow/Deep edge read from the terrain art alone.
  for (const city of view.cities)
    entries.push({
      key: `city:${city.id}`,
      kind: "CITY",
      layer: 4,
      at: city.at,
      ownerId: city.ownerId,
      ...ownerPresentation(view, city.ownerId),
      label: `${city.isCapital ? "Capital" : "City"} ${city.id}`,
      ...(city.isCapital ? { capital: true } : {}),
      value: city.level,
      population: city.population,
      assetId: `building-city-${cityArtLevel(city.level)}`,
      // A city wears its owner faction's city set (bead pulp_wars-6gd.6);
      // without that raster the renderer falls back to the Human set.
      artSubject: cityArtSubjectV7({
        artLevel: cityArtLevel(city.level),
        faction: view.players.find((player) => player.id === city.ownerId)
          ?.faction,
      }),
    });
  for (const at of view.treasureChests)
    entries.push({
      key: `treasure:${at.x},${at.y}`,
      kind: "TREASURE",
      layer: 4,
      at,
      assetId: "building-treasure-chest",
      artSubject: "TREASURE",
      label: "Treasure",
    });
  // Revision 13 Graves are a small corner marker (playtest round 3,
  // pulp_wars-6gd.4) drawn above every piece, so a unit standing on the
  // Grave never hides it. On a city tile the marker moves clear of the
  // CHIBI population column (attachment slot 1).
  const cityCells = new Set(view.cities.map((city) => coordKey(city.at)));
  for (const at of view.graves)
    entries.push({
      key: `grave:${at.x},${at.y}`,
      kind: "GRAVE",
      layer: 5.5,
      at,
      artSubject: "GRAVE",
      label: "Grave",
      attachmentSlot: cityCells.has(coordKey(at)) ? 1 : 0,
    });
  const plaguedIds = new Set(view.plagued.map((entry) => entry.unitId));
  const bittenIds = new Set(view.bitten.map((entry) => entry.unitId));
  const eggTurns = new Map(
    view.eggs.map((entry) => [entry.unitId, entry.turnsRemaining] as const),
  );
  const martianMatch = matchHasMartianV7(view);
  const dwarfMatch = matchHasDwarfSeatV7(view);
  const ringWitch = iceFolkMatch
    ? selectedWitchV7(view, interaction.selectedUnitId)
    : undefined;
  for (const unit of view.units) {
    const faction = playerFactionV7(view, unit.ownerId);
    const factionUnit =
      faction === "UNDEAD" ||
      faction === "GOBLIN" ||
      faction === "DINOSAUR" ||
      faction === "MARTIAN" ||
      faction === "ICE_FOLK" ||
      faction === "DWARF";
    // The Dwarf revision: Dig In, clockwork and the Gyrocopter's flight.
    const dwarf = dwarfMatch ? dwarfUnitMarkersV7(view, unit) : undefined;
    // The Ice Folk revision: Chill markers on units of any owner.
    const iceFolk = iceFolkMatch ? iceFolkUnitMarkersV7(view, unit) : undefined;
    // The Martian revision: a Thrall is labelled "Thrall", and a machine
    // afloat is drawn as itself (never as the transport).
    const thrall = martianMatch && unitIsThrallV7(view, unit.id);
    const machine = martianMatch && martianMachineV7(view, unit);
    const martian = martianMatch ? martianUnitMarkersV7(view, unit) : undefined;
    // Revision 19: an Egg is "{Unit} Egg".
    const factionLabel = thrall
      ? "Thrall"
      : factionUnit
        ? unitDisplayNameV7(view, unit)
        : null;
    const afflictions: AfflictionIdV7[] = [];
    if (plaguedIds.has(unit.id)) afflictions.push("PLAGUE");
    if (bittenIds.has(unit.id)) afflictions.push("BITTEN");
    const egg = unit.form === "EGG";
    const growthStage = unitGrowthStageV7(view, unit);
    entries.push({
      key: `unit:${unit.id}`,
      kind: "UNIT",
      layer: 5,
      at: unit.at,
      ownerId: unit.ownerId,
      ...ownerPresentation(view, unit.ownerId),
      hp: unit.hp,
      maxHp: unit.maxHp,
      // The Egg has no legacy raster: LEGACY draws it in code.
      assetId: egg
        ? EGG_CODE_ART_ID_V7
        : unit.form === "EMBARKED" && !machine
          ? "unit-shared-embarked-transport"
          : RULESET7_UNIT_ART_IDS[unit.role],
      // Undead and Goblin land units ask for their own art first
      // (UNIT:<FACTION>:<ROLE>); without it the renderer falls back to the
      // Human sprite plus the faction badge.
      artSubject: unitArtSubjectV7({ ...unit, faction, thrall, machine }),
      label:
        unit.form === "EMBARKED" && machine
          ? `${factionLabel ?? title(unit.role)} afloat`
          : unit.form === "EMBARKED"
            ? `Embarked Transport · ${factionLabel ?? title(unit.role)} passenger`
            : (factionLabel ?? title(unit.role)),
      ready:
        unit.ownerId === view.viewer.id &&
        !unit.activation.handled &&
        commands.some(
          (command) => command.kind === "MOVE" && command.unitId === unit.id,
        ),
      ...(factionUnit ? { faction } : {}),
      ...(afflictions.length > 0 ? { afflictions } : {}),
      ...(egg ? { egg: { turnsRemaining: eggTurns.get(unit.id) ?? 1 } } : {}),
      ...(growthStage === 1 || growthStage === 2 ? { growthStage } : {}),
      ...(martian === undefined ? {} : { martian }),
      ...(iceFolk === undefined ? {} : { iceFolk }),
      ...(ringWitch?.id === unit.id ? { blizzardRing: true as const } : {}),
      ...(dwarf === undefined ? {} : { dwarf }),
    });
  }
  // The Dwarf revision (section 5.3): every visible mound, where its unit
  // would stand, with its HP bar; a selected mound tile outlines its ring.
  if (dwarfMatch)
    entries.push(
      ...dwarfMoundEntriesV7(
        view,
        (ownerId) => ownerPresentation(view, ownerId),
        interaction.selection?.kind === "TILE"
          ? interaction.selection.at
          : null,
      ),
    );
  for (const value of view.improvementValues)
    entries.push({
      key: `value:${value.at.x},${value.at.y}`,
      kind: "VALUE",
      layer: 6,
      at: value.at,
      value: value.level,
      label: value.measure,
    });
  const attachmentSlots = new Map<string, number>();
  for (const attachment of tacticalAttachmentsV7(view)) {
    const coordKey = `${attachment.at.x},${attachment.at.y}`;
    const slot = attachmentSlots.get(coordKey) ?? 0;
    attachmentSlots.set(coordKey, slot + 1);
    entries.push({
      key: attachment.key,
      kind: "STATUS",
      layer: 6,
      at: attachment.at,
      statusId: attachment.symbolId,
      label: attachment.label,
      pulse: attachment.pulse,
      attachmentSlot: slot,
    });
  }
  for (const port of view.naval.ownedPorts) {
    const slot = attachmentSlots.get(coordKey(port.at)) ?? 0;
    attachmentSlots.set(coordKey(port.at), slot + 1);
    entries.push({
      key: `naval-port:${port.at.x},${port.at.y}`,
      kind: "STATUS",
      layer: 6,
      at: port.at,
      statusId:
        port.status === "ACTIVE"
          ? "ui-status-port-active"
          : "ui-status-port-blockaded",
      label: port.status === "ACTIVE" ? "Active Port" : "Blockaded Port",
      attachmentSlot: slot,
    });
  }
  for (const route of view.naval.seaRoutes)
    for (let index = 0; index + 1 < route.path.length; index += 1) {
      const from = route.path[index];
      const to = route.path[index + 1];
      if (from === undefined || to === undefined) continue;
      entries.push({
        key: `sea-route:${route.fromCityId}:${route.toCityId}:${index}`,
        kind: "LINK",
        layer: 6,
        at: from,
        linkTo: to,
        label: "SEA_ROUTE",
      });
    }
  const selectedUnitId =
    interaction.selection?.kind === "UNIT"
      ? interaction.selection.unitId
      : null;
  const selectedNaval =
    selectedUnitId !== null
      ? view.units.find(
          (unit) =>
            unit.id === selectedUnitId &&
            unit.ownerId === view.viewer.id &&
            unit.form === "NAVAL",
        )
      : undefined;
  if (selectedNaval !== undefined) {
    const recoveryKeys = new Set<string>();
    for (const port of view.naval.ownedPorts.filter(
      (candidate) => candidate.status === "ACTIVE",
    ))
      for (const tile of view.board.tiles)
        if (
          tile.explored &&
          tile.biome === null &&
          !(
            tile.territoryOwnerId !== null &&
            tile.territoryOwnerId !== view.viewer.id &&
            view.setup.aiMode === "COOPERATIVE" &&
            tile.territoryOwnerId !== view.humanPlayerId &&
            view.viewer.id !== view.humanPlayerId
          ) &&
          (tile.terrain !== "DEEP_WATER" ||
            view.viewer.researchedTechs.includes("NAVIGATION")) &&
          Math.max(
            Math.abs(tile.at.x - port.at.x),
            Math.abs(tile.at.y - port.at.y),
          ) <= 1 &&
          !recoveryKeys.has(coordKey(tile.at))
        ) {
          recoveryKeys.add(coordKey(tile.at));
          entries.push({
            key: `naval-recovery:${selectedNaval.id}:${tile.at.x},${tile.at.y}`,
            kind: "REACH",
            layer: 6,
            at: tile.at,
            label: view.naval.recoverableNavalUnitIds.includes(selectedNaval.id)
              ? "Recovery available"
              : "Port recovery radius",
          });
        }
  }
  addTerritoryBoundaries(entries, view, interaction.selection);
  if (selectedUnitId !== null) {
    // The Dwarf revision: while an ability is aimed, the selected unit's
    // other previews (an Engineer's Repair targets) step aside.
    if (
      interaction.dwarfPick === undefined ||
      interaction.dwarfPick === null ||
      interaction.dwarfPick.unitId !== selectedUnitId
    )
      addAbilityPreviews(entries, view, commands, selectedUnitId);
    // The Martian revision: the Force Field of a selected Shield Projector
    // and the Thrall-Brain link.
    if (martianMatch)
      addMartianSelectionEntriesV7(entries, view, selectedUnitId);
  }
  if (
    interaction.kaboomPreviewUnitId !== undefined &&
    interaction.kaboomPreviewUnitId !== null
  )
    addKaboomPreview(entries, view, commands, interaction.kaboomPreviewUnitId);
  // Revision 17: while a Kaboom! is previewed its blast is the only
  // preview of that unit, so its Move and Attack targets step aside.
  const kaboomPreview =
    interaction.kaboomPreviewUnitId !== undefined &&
    interaction.kaboomPreviewUnitId !== null &&
    interaction.kaboomPreviewUnitId === interaction.selectedUnitId &&
    commands.some(
      (command) =>
        command.kind === "KABOOM" &&
        command.unitId === interaction.kaboomPreviewUnitId,
    );
  // Revision 19: while a nest tile is picked, the legal nest tiles of that
  // city and role are the only targets.
  const layEgg = interaction.layEgg ?? null;
  // The Martian revision: while an ability is aimed, its targets are the
  // only targets of the selected unit.
  const martianPick =
    interaction.martianPick !== undefined &&
    interaction.martianPick !== null &&
    interaction.martianPick.unitId === interaction.selectedUnitId
      ? interaction.martianPick
      : null;
  // The Ice Folk revision: likewise while a Bolas or Cold Snap is aimed.
  const iceFolkPick =
    interaction.iceFolkPick !== undefined &&
    interaction.iceFolkPick !== null &&
    interaction.iceFolkPick.unitId === interaction.selectedUnitId
      ? interaction.iceFolkPick
      : null;
  // The Dwarf revision: likewise while a Tunnel, Bomb Run or Assemble is
  // aimed.
  const dwarfPick =
    interaction.dwarfPick !== undefined &&
    interaction.dwarfPick !== null &&
    interaction.dwarfPick.unitId === interaction.selectedUnitId
      ? interaction.dwarfPick
      : null;
  const targets = kaboomPreview
    ? []
    : layEgg !== null
      ? layEggTargets(view, commands, layEgg)
      : martianPick !== null
        ? martianPickTargetsV7(view, commands, martianPick)
        : iceFolkPick !== null
          ? iceFolkPickTargetsV7(view, commands, iceFolkPick)
          : dwarfPick !== null
            ? dwarfPickTargetsV7(view, commands, dwarfPick)
            : dedupeMapTargets(
                mapTargets(view, commands, interaction.selectedUnitId),
              );
  if (martianPick !== null)
    addMartianPickEntriesV7(entries, view, targets, martianPick);
  if (iceFolkPick !== null) addIceFolkPickEntriesV7(entries, view, iceFolkPick);
  if (dwarfPick !== null)
    addDwarfPickEntriesV7(entries, view, commands, dwarfPick);
  for (const target of targets) {
    if (target.family === "LAY_EGG")
      entries.push({
        key: `ability-area:NEST:${coordKey(target.at)}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at: target.at,
        abilityStyle: "NEST",
        targetEdges: [],
      });
  }
  const targetEdges = mapTargetEdges(targets);
  for (const target of targets)
    entries.push({
      key: `target:${target.family}:${target.at.x},${target.at.y}`,
      kind: "TARGET",
      layer: 7,
      at: target.at,
      target,
      targetEdges:
        targetEdges.get(`${target.family}:${target.at.x},${target.at.y}`) ?? [],
    });
  const selectedAt = selectionCoord(view, interaction.selection);
  if (selectedAt !== null)
    entries.push({
      key: `selection:${selectedAt.x},${selectedAt.y}`,
      kind: "SELECTION",
      layer: 8,
      at: selectedAt,
    });
  if (interaction.cursor !== undefined && interaction.cursor !== null)
    entries.push({
      key: `cursor:${interaction.cursor.x},${interaction.cursor.y}`,
      kind: "CURSOR",
      layer: 9,
      at: interaction.cursor,
    });
  entries.sort(
    (a, b) =>
      Number(a.kind === "VALUE") - Number(b.kind === "VALUE") ||
      a.at.y - b.at.y ||
      a.at.x - b.at.x ||
      a.layer - b.layer ||
      a.key.localeCompare(b.key),
  );
  return { version: 7, entries, targets };
}

/** The Ice Folk revision: the `snow` member of a terrain entry, if any. */
function snowOf(
  snow: ReadonlyMap<string, IceFolkSnowCellV7>,
  at: CoordV7,
): { readonly snow?: IceFolkSnowCellV7 } {
  const cell = snow.get(coordKey(at));
  return cell === undefined ? {} : { snow: cell };
}

/** Presentation-only replacement of a same-cell Forest canopy with its ground. */
export function suppressesForestCanopyV7(
  improvement: ImprovementIdV7 | null,
): boolean {
  return (
    improvement === "LUMBER_CAMP" ||
    improvement === "WINDMILL" ||
    improvement === "SAWMILL" ||
    improvement === "FORGE"
  );
}

const POPULATION_PIP_COLORS_V7 = {
  filled: "#b8f4d0",
  empty: "#132c2b",
  deficit: "#ff6b68",
  outline: "#f8f2df",
} as const;

type PopulationPipStateV7 = keyof Pick<
  typeof POPULATION_PIP_COLORS_V7,
  "filled" | "empty" | "deficit"
>;

/**
 * CHIBI overlay frame, in world units (128 = one cell, centre at 0,0). A
 * standard chibi unit fills the middle 56 of 80 CSS px, bottom-aligned, so
 * its overlays sit in the free side strips around it: seat badge in the
 * bottom-left corner, a vertical HP bar in the left strip above it,
 * population pips stacked up the right strip, and the capital crown in the
 * top-right corner.
 */
export const CHIBI_OVERLAY_FRAME_V7 = {
  seatBadge: { left: -63, top: 44, size: 18 },
  hpBar: { left: -63, top: -36, width: 9, height: 76 },
  populationColumn: { left: 46, bottom: 62 },
  crown: { left: 42, right: 62, bottom: -44 },
  /** Field Defense badge: the top-left corner, just above the HP bar strip. */
  fieldDefense: { left: -63, top: -64, size: 28 },
} as const;

/** LEGACY road: brown dirt strokes (outline, then fill) in world units. */
const ROAD_STROKES_V7 = [
  ["#69472e", 8],
  ["#a57a4c", 5],
] as const satisfies readonly (readonly [string, number])[];

/**
 * CHIBI road: a beige cobblestone path (the ORIGINAL settlement stone) with
 * the chibi pieces' near-black outline, about 1 px each side at zoom 1.
 */
export const CHIBI_ROAD_STROKES_V7 = [
  ["#2a2426", 12],
  ["#d8c08c", 8],
] as const satisfies readonly (readonly [string, number])[];

/**
 * CHIBI Field Defense: a chunky palisade badge (four sharpened pale birch
 * stakes on a light steel crossbar, thick near-black outline, the ORIGINAL
 * materials) in the cell's top-left corner; a city fortification level is
 * written over it. Drawn on a 28-unit grid scaled to the badge size.
 */
export function drawChibiFieldDefenseV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  level: number,
  highContrast: boolean,
  /** Building saturation in percent (pulp_wars-x6c); 100 is unchanged. */
  saturation = 100,
): void {
  const { fieldDefense } = CHIBI_OVERLAY_FRAME_V7;
  const unit = (fieldDefense.size / 28) * zoom;
  const left = x + fieldDefense.left * zoom;
  const top = y + fieldDefense.top * zoom;
  const px = (value: number): number => left + value * unit;
  const py = (value: number): number => top + value * unit;
  const ink = "#2a2426";
  const birch = desaturateHexColourV7(
    highContrast ? "#ffffff" : "#f1dc8f",
    saturation,
  );
  const birchShade = desaturateHexColourV7(
    highContrast ? "#c8c8c8" : "#c9ad62",
    saturation,
  );
  const steel = desaturateHexColourV7(
    highContrast ? "#ffffff" : "#b9c3cf",
    saturation,
  );
  context.save();
  context.strokeStyle = ink;
  context.lineWidth = 2 * unit;
  context.lineJoin = "miter";
  for (const stake of [2, 8, 14, 20]) {
    context.beginPath();
    context.moveTo(px(stake), py(26));
    context.lineTo(px(stake), py(8));
    context.lineTo(px(stake + 3), py(2));
    context.lineTo(px(stake + 6), py(8));
    context.lineTo(px(stake + 6), py(26));
    context.closePath();
    context.fillStyle = birch;
    context.fill();
    context.fillStyle = birchShade;
    context.fillRect(px(stake + 4), py(9), 2 * unit, 17 * unit);
    context.stroke();
  }
  context.fillStyle = steel;
  context.fillRect(px(0), py(15), 28 * unit, 5 * unit);
  context.strokeRect(px(0), py(15), 28 * unit, 5 * unit);
  if (level > 0) {
    context.font = `800 ${16 * unit}px system-ui`;
    context.textAlign = "center";
    context.lineWidth = 3.5 * unit;
    context.fillStyle = "#ffffff";
    context.strokeText(String(level), px(14), py(21));
    context.fillText(String(level), px(14), py(21));
  }
  context.restore();
}

/**
 * CHIBI capital cue: a gold crown in the cell's top-right corner, drawn with
 * the seat badge's outline. It sits outside a standard unit's 56 px width,
 * so a garrisoned unit never hides it. Sizes are world units (128 = cell).
 */
export function drawCapitalCrownV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
): void {
  const { crown } = CHIBI_OVERLAY_FRAME_V7;
  const left = x + crown.left * zoom;
  const right = x + crown.right * zoom;
  const bottom = y + crown.bottom * zoom;
  const mid = (left + right) / 2;
  context.save();
  context.beginPath();
  context.moveTo(left, bottom);
  context.lineTo(left, bottom - 13 * zoom);
  context.lineTo(left + 5 * zoom, bottom - 7 * zoom);
  context.lineTo(mid, bottom - 16 * zoom);
  context.lineTo(right - 5 * zoom, bottom - 7 * zoom);
  context.lineTo(right, bottom - 13 * zoom);
  context.lineTo(right, bottom);
  context.closePath();
  context.fillStyle = "#f4c542";
  context.strokeStyle = "#171722";
  context.lineWidth = 2 * zoom;
  context.lineJoin = "miter";
  context.fill();
  context.stroke();
  context.fillStyle = "#171722";
  context.fillRect(left, bottom - 4 * zoom, right - left, 1.5 * zoom);
  context.restore();
}

function drawPopulationPipV7(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  size: number,
  state: PopulationPipStateV7,
  zoom: number,
): void {
  context.fillStyle = POPULATION_PIP_COLORS_V7[state];
  context.strokeStyle = POPULATION_PIP_COLORS_V7.outline;
  context.lineWidth = Math.max(1, zoom);
  context.fillRect(left, top, size, size);
  context.strokeRect(left, top, size, size);
}

/** Which saturation slider (bead pulp_wars-x6c) an entry's art follows. */
export type BoardSaturationGroupV7 = "BUILDING" | "CITY";

/**
 * Buildings are improvement art, the Mine drawn as part of its Mined
 * Mountain, and the Field Defense badge. Cities are city sprites and
 * neutral Village sprites. Everything else (units, other terrain,
 * resources, roads, overlays, markers) follows no slider.
 */
export function boardSaturationGroupV7(
  entry: BoardRenderPlanEntryV7,
): BoardSaturationGroupV7 | null {
  if (entry.kind === "CITY") return "CITY";
  if (entry.kind === "SITE")
    return entry.artSubject === "SITE:VILLAGE" ? "CITY" : null;
  if (entry.kind === "IMPROVEMENT" || entry.kind === "FIELD_DEFENSE")
    return "BUILDING";
  if (entry.kind === "TERRAIN")
    return entry.artSubject === "TERRAIN:MINED_MOUNTAIN" ? "BUILDING" : null;
  return null;
}

/** Revision 19: one unit sprite's cue transform for a frame. */
export interface UnitPulseV7 {
  readonly unitId: number;
  /** Sprite scale about the feet (1 = unchanged). */
  readonly scale: number;
  /** Sideways shift in CSS px (an Egg's wobble). */
  readonly offsetXCssPx?: number;
}

export interface BoardImageResolverV7 {
  resolve(assetId: string): CanvasImageSource | null;
  /** Registered square ground used beneath a tall terrain body. */
  resolveTerrainGround?(assetId: string): CanvasImageSource | null;
  /** Cached body-only raster for tall terrain; null while either source loads. */
  resolveRaisedTerrain?(assetId: string): CanvasImageSource | null;
}

export function drawBoardV7(input: {
  readonly context: CanvasRenderingContext2D;
  readonly viewport: Size;
  readonly devicePixelRatio: number;
  readonly camera: CameraState;
  readonly plan: BoardRenderPlanV7;
  readonly images: BoardImageResolverV7;
  readonly glowCache?: BoardGlowCacheV7;
  readonly readinessElapsedMs?: number;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
  readonly selectionJump?: {
    readonly unitId: number;
    readonly elapsedMs: number;
    readonly speed: "NORMAL" | "FAST";
  } | null;
  readonly clear?: boolean;
  readonly sceneAlpha?: number;
  readonly impact?: {
    readonly at: CoordV7;
    readonly shakeCssPx: number;
    readonly flashAlpha: number;
  } | null;
  readonly statusPulse?: {
    readonly at: CoordV7;
    readonly progress: number;
    readonly statusId: string;
  } | null;
  /**
   * Revision 19 cues (growth pulse, Egg bounce and wobble, hatchling
   * growing in): unit sprites scaled about their feet and shifted sideways
   * for this frame. Overlays do not move.
   */
  readonly unitPulses?: readonly UnitPulseV7[];
  /** LEGACY (default) or the opt-in CHIBI art set. */
  readonly artSet?: ArtSetV7;
  /** Required for CHIBI; subjects it cannot resolve draw their legacy asset. */
  readonly chibiArt?: ChibiBoardArtV7;
  /**
   * Revision 13: the cell whose attack target shows its splash area (the
   * keyboard cursor or pointer hover). A lone splash target always shows.
   */
  readonly previewFocus?: CoordV7 | null;
  /**
   * Revision 14 hook: a registered raster for a Plague or Bitten marker. A
   * subject without one (null) keeps the code-drawn marker.
   */
  readonly afflictionArt?: (
    subject: AfflictionSubjectV7,
  ) => CanvasImageSource | null;
  /**
   * The part of the viewport (CSS px) not covered by the HUD and the dock,
   * as the start-camera framing measures it. Preview labels are clamped
   * inside it; omitted, they are clamped inside the whole viewport.
   */
  readonly labelSafeArea?: LabelSafeAreaV7 | null;
  /**
   * Developer experiment (bead pulp_wars-x6c): building and city sprites
   * are drawn from cached desaturated copies. Omitted, or at 100 percent,
   * no copy is requested and the frame is drawn exactly as before.
   */
  readonly saturation?: {
    readonly levels: BoardSaturationV7;
    readonly cache: SpriteSaturationCacheV7;
  };
  /**
   * The visual direction of the CHIBI art set (beads pulp_wars-3tq.1 to .6;
   * the game passes the live direction by default). Omitted, the frame is
   * the classic look, drawn exactly as before the direction existed; the
   * LEGACY art set ignores it.
   */
  readonly direction?: BoardDirectionRuntimeV7;
  /**
   * The Ice Folk revision (bead pulp_wars-7g3.6): the cached Snow tiles,
   * snow caps, rime and casings. Omitted, Snow is a plain wash and the
   * Chill markers are code-drawn stand-ins.
   */
  readonly iceFolkArt?: IceFolkBoardArtV7;
  /** The Blizzard flakes' clock in ms (0, the default, for reduced motion). */
  readonly blizzardTimeMs?: number;
  /** A unit being shattered, `elapsedMs` into the Shatter timeline. */
  readonly iceFolkShatter?: {
    readonly unitId: number;
    readonly elapsedMs: number;
  } | null;
  /**
   * The Dwarf revision (bead pulp_wars-78i.6): the cached Dig In earthwork
   * rasters. Omitted, the earthwork is a plain code-drawn stand-in.
   */
  readonly dwarfArt?: DwarfBoardArtV7;
}): void {
  const { context, viewport, devicePixelRatio } = input;
  const saturationOf = (entry: BoardRenderPlanEntryV7): number => {
    if (input.saturation === undefined) return 100;
    const group = boardSaturationGroupV7(entry);
    return group === null
      ? 100
      : clampSaturationPercentV7(
          group === "CITY"
            ? input.saturation.levels.city
            : input.saturation.levels.building,
        );
  };
  const atSaturation = <Image extends CanvasImageSource | null | undefined>(
    entry: BoardRenderPlanEntryV7,
    image: Image,
  ): Image | CanvasImageSource => {
    if (image === null || image === undefined) return image;
    const percent = saturationOf(entry);
    return percent === 100 || input.saturation === undefined
      ? image
      : input.saturation.cache.resolve(image, percent);
  };
  const chibiArt =
    input.artSet === "CHIBI"
      ? (input.direction?.art ?? input.chibiArt)
      : undefined;
  const direction = chibiArt === undefined ? undefined : input.direction?.spec;
  // CHIBI cells land on whole device pixels; LEGACY keeps its exact camera.
  const camera =
    chibiArt === undefined
      ? input.camera
      : snapCameraToDevicePixels(input.camera, devicePixelRatio);
  const resolveChibiEntry = (
    entry: BoardRenderPlanEntryV7,
  ): ChibiEntryResolutionV7 | null =>
    chibiArt === undefined || entry.artSubject === undefined
      ? null
      : resolveChibiWithFallbackV7(chibiArt, {
          subject: entry.artSubject,
          at: entry.at,
          ownerColor: entry.ownerColor,
          deviceScale: chibiMasterScale(camera) * devicePixelRatio,
        });
  const resolveChibi = (
    entry: BoardRenderPlanEntryV7,
  ): ChibiResolutionV7 | null => resolveChibiEntry(entry)?.resolution ?? null;
  const sceneAlpha = input.sceneAlpha ?? 1;
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  if (input.clear !== false) {
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = "#173632";
    context.fillRect(0, 0, viewport.width, viewport.height);
  }
  context.save();
  context.globalAlpha = sceneAlpha;
  // CHIBI piece overlays (seat badge, HP bar, capital crown, population
  // pips) sit in the cell's edge strips. Large and giant units reach those
  // strips from their own cell (a garrisoned city's pips) and from the row
  // below (a giant's upward overflow), so the overlays are drawn after every
  // piece, in plan order, and no sprite can hide them.
  const deferredChibiOverlays: (() => void)[] = [];
  // Grave corner markers are drawn last in both art sets, over every piece
  // and its overlays.
  const deferredGraveMarkers: (() => void)[] = [];
  // CHIBI draws every road casing before any road fill, so a corner join
  // and its cell's road read as one path instead of crossing outlines.
  // A Road (or a corner join) on tall terrain passes under the tree or rock
  // body: those cells draw their ground tile in the ground pass and the
  // body's owning cell in TALL_BODY, after every Road and before any piece,
  // so neighbouring pieces keep overlapping the cell as before.
  const passes =
    chibiArt === undefined
      ? (["FOG", "GROUND", "ROAD", "FOREGROUND"] as const)
      : ([
          "FOG",
          "GROUND",
          "ROAD_CASING",
          "ROAD",
          "TALL_BODY",
          "FOREGROUND",
        ] as const);
  const roadCells = new Set(
    chibiArt === undefined
      ? []
      : input.plan.entries
          .filter(
            (entry) => entry.kind === "ROAD" || entry.kind === "ROAD_JOIN",
          )
          .map((entry) => coordKey(entry.at)),
  );
  // The Ice Folk revision: a tall terrain body on a Snow cell is drawn after
  // its ground and Snow overlay, like a body over a Road, so the Snow lies
  // on the ground under the trees and peaks and their snow caps go on top.
  const splitCells = new Set(roadCells);
  if (chibiArt !== undefined)
    for (const entry of input.plan.entries)
      if (entry.kind === "TERRAIN" && entry.snow !== undefined)
        splitCells.add(coordKey(entry.at));
  const iceFolkArt = input.iceFolkArt;
  const blizzardTime =
    input.reducedMotion === true ? 0 : (input.blizzardTimeMs ?? 0);
  /** The Snow overlay and the Blizzard of a terrain cell (ground pass). */
  const drawWinterGround = (
    entry: BoardRenderPlanEntryV7,
    x: number,
    y: number,
  ): void => {
    if (entry.snow === undefined && entry.blizzard !== true) return;
    const cell =
      chibiArt === undefined
        ? {
            x: x - (TILE_WIDTH * camera.zoom) / 2,
            y: y - (TILE_HEIGHT * camera.zoom) / 2,
            width: TILE_WIDTH * camera.zoom,
            height: TILE_HEIGHT * camera.zoom,
          }
        : chibiTerrainPartRect(
            { x, y },
            camera,
            SNOW_OVERLAY_ASSET_V7,
            devicePixelRatio,
            "CELL",
          );
    if (entry.snow !== undefined)
      drawSnowCellV7(context, iceFolkArt, cell, entry.snow, sceneAlpha);
    if (entry.blizzard === true)
      drawBlizzardCellV7(context, entry.at, cell, blizzardTime, sceneAlpha);
  };
  // CHIBI settlement centres (cities and villages): a unit standing on one
  // draws smaller in the cell's front-right, so the settlement stays
  // readable. A unit mid-move (fractional cell) never matches.
  const settlementCells = new Set(
    chibiArt === undefined
      ? []
      : input.plan.entries
          .filter(
            (entry) =>
              entry.kind === "CITY" ||
              (entry.kind === "SITE" && entry.artSubject === "SITE:VILLAGE"),
          )
          .map((entry) => coordKey(entry.at)),
  );
  // CHIBI Mountain ground fringe (pulp_wars-6gd.7): terrain subjects by
  // cell, so a Mountain knows which of its edges border other land.
  const terrainSubjects = new Map<string, ArtSubjectV7>();
  if (chibiArt?.resolveFringedGround !== undefined)
    for (const entry of input.plan.entries)
      if (entry.kind === "TERRAIN" && entry.artSubject !== undefined)
        terrainSubjects.set(coordKey(entry.at), entry.artSubject);
  const terrainSubjectAt = (at: {
    readonly x: number;
    readonly y: number;
  }): ArtSubjectV7 | undefined => terrainSubjects.get(coordKey(at));
  for (const pass of passes)
    for (const entry of input.plan.entries) {
      if (
        entry.kind === "LINK" ||
        entry.kind === "TARGET" ||
        entry.kind === "TERRITORY_BOUNDARY" ||
        entry.kind === "REACH" ||
        entry.kind === "SELECTION" ||
        entry.kind === "CURSOR" ||
        entry.kind === "ABILITY_AREA" ||
        entry.kind === "ABILITY_TARGET"
      )
        continue;
      if (
        (pass === "FOG" && entry.kind !== "FOG") ||
        (pass === "GROUND" && entry.kind !== "TERRAIN") ||
        ((pass === "ROAD" || pass === "ROAD_CASING") &&
          entry.kind !== "ROAD" &&
          entry.kind !== "ROAD_JOIN") ||
        (pass === "TALL_BODY" &&
          (entry.kind !== "TERRAIN" || !splitCells.has(coordKey(entry.at)))) ||
        (pass === "FOREGROUND" &&
          (entry.kind === "FOG" ||
            entry.kind === "ROAD" ||
            entry.kind === "ROAD_JOIN" ||
            (entry.kind === "TERRAIN" && !isTallTerrainEntry(entry))))
      )
        continue;
      const impacted =
        input.impact !== null &&
        input.impact !== undefined &&
        (entry.kind === "UNIT" || entry.kind === "CITY") &&
        same(entry.at, input.impact.at);
      const x =
        camera.offsetX +
        entry.at.x * TILE_WIDTH * camera.zoom +
        (impacted ? (input.impact?.shakeCssPx ?? 0) : 0) * camera.zoom;
      const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
      const size = TILE_WIDTH * camera.zoom;
      // The largest accepted sprite and attached glow extend less than three
      // cells from their owning anchor, including jump/impact displacement.
      if (
        x < -3 * size ||
        x > viewport.width + 3 * size ||
        y < -3 * size ||
        y > viewport.height + 3 * size
      )
        continue;
      const left = x - size / 2;
      const top = y - size / 2;
      if (entry.kind === "FOG") {
        context.fillStyle = "#1c2a2e";
        context.fillRect(left, top, size, size);
        context.strokeStyle = "#33464b";
        context.strokeRect(left, top, size, size);
        continue;
      }
      if (entry.kind === "TERRAIN") {
        const chibi = chibiTerrainAtSaturationV7(
          resolveChibi(entry),
          saturationOf(entry),
          input.saturation?.cache,
        );
        // Tall terrain under a Road (or, the Ice Folk revision, on Snow):
        // ground now, the body after Roads.
        const layers =
          chibi?.kind === "READY" && splitCells.has(coordKey(entry.at))
            ? chibi.layers
            : undefined;
        if (pass === "TALL_BODY") {
          if (chibi?.kind === "READY" && layers !== undefined) {
            drawChibiTerrainV7(context, chibi, {
              centre: { x, y },
              camera,
              devicePixelRatio,
              sceneAlpha,
              part: "CELL",
              image: layers.body,
            });
            if (entry.snow !== undefined)
              drawChibiSnowCapsV7(
                context,
                iceFolkArt,
                chibi,
                layers.body,
                { x, y },
                camera,
                devicePixelRatio,
                "CELL",
                sceneAlpha,
              );
          }
          continue;
        }
        if (chibi !== null && chibi.kind !== "MISSING") {
          if (pass === "GROUND") {
            context.fillStyle =
              entry.ownerColor === undefined
                ? "#65965b"
                : `${entry.ownerColor}55`;
            context.fillRect(left, top, size, size);
          }
          // A Mountain bordering other land: Grass, then its rocky ground
          // cut back along those edges, then the body's owning cell (after
          // the Roads when the cell has one). The overflow is unchanged.
          const fringeEdges =
            pass === "GROUND" &&
            chibi.kind === "READY" &&
            chibi.layers !== undefined &&
            terrainSubjects.size > 0
              ? chibiMountainFringeEdgesV7(
                  entry.artSubject,
                  entry.at,
                  terrainSubjectAt,
                )
              : 0;
          const fringedGround =
            fringeEdges === 0 || chibi.kind !== "READY"
              ? null
              : (chibiArt?.resolveFringedGround?.({
                  asset: chibi.asset,
                  at: entry.at,
                  edges: fringeEdges,
                }) ?? null);
          if (
            fringedGround !== null &&
            chibi.kind === "READY" &&
            chibi.layers !== undefined
          ) {
            const part = { centre: { x, y }, camera, devicePixelRatio };
            const grass = chibiArt?.resolve({
              subject: "TERRAIN:GRASS",
              at: entry.at,
              deviceScale: chibiMasterScale(camera) * devicePixelRatio,
            });
            if (grass?.kind === "READY")
              drawChibiTerrainV7(context, grass, {
                ...part,
                sceneAlpha,
                part: "CELL",
              });
            drawChibiTerrainV7(context, chibi, {
              ...part,
              sceneAlpha,
              part: "GROUND",
              image: fringedGround,
            });
            if (layers === undefined)
              drawChibiTerrainV7(context, chibi, {
                ...part,
                sceneAlpha,
                part: "CELL",
                image: chibi.layers.body,
              });
          } else if (chibi.kind === "READY")
            drawChibiTerrainV7(context, chibi, {
              centre: { x, y },
              camera,
              devicePixelRatio,
              sceneAlpha,
              ...(pass !== "GROUND"
                ? { part: "OVERFLOW" }
                : layers === undefined
                  ? { part: "CELL" }
                  : { part: "GROUND", image: layers.ground }),
            });
          // The Ice Folk revision: Snow and the Blizzard over the ground;
          // the snow caps of the body's overflow over the overflow.
          if (pass === "GROUND") drawWinterGround(entry, x, y);
          else if (
            entry.snow !== undefined &&
            chibi.kind === "READY" &&
            chibi.layers !== undefined
          )
            drawChibiSnowCapsV7(
              context,
              iceFolkArt,
              chibi,
              chibi.layers.body,
              { x, y },
              camera,
              devicePixelRatio,
              "OVERFLOW",
              sceneAlpha,
            );
          continue;
        }
        if (pass === "GROUND") {
          context.fillStyle =
            entry.ownerColor === undefined
              ? "#65965b"
              : `${entry.ownerColor}55`;
          context.fillRect(left, top, size, size);
          if (isTallTerrainEntry(entry))
            drawSquareTerrainGround(
              context,
              input.images.resolveTerrainGround?.(entry.assetId ?? "") ?? null,
              { x, y, zoom: camera.zoom, sceneAlpha },
            );
          else
            drawEntryImage(context, input.images.resolve(entry.assetId ?? ""), {
              x,
              y,
              zoom: camera.zoom,
              entry,
              sceneAlpha,
            });
          // The Rift (bead pulp_wars-9s0.5): LEGACY (and a CHIBI piece
          // that is missing) draws the crack in code over the Grass.
          if (entry.riftPiece !== undefined)
            drawLegacyRiftV7(
              context,
              { x, y },
              size,
              entry.riftPiece,
              sceneAlpha,
            );
          // The Ice Folk revision: Snow and the Blizzard over the ground.
          drawWinterGround(entry, x, y);
        } else {
          const raised = atSaturation(
            entry,
            input.images.resolveRaisedTerrain?.(entry.assetId ?? ""),
          );
          if (raised !== null && raised !== undefined) {
            drawEntryImage(context, raised, {
              x,
              y,
              zoom: camera.zoom,
              entry,
              sceneAlpha,
            });
            // The Ice Folk revision: snow caps on the raised body.
            if (entry.snow !== undefined)
              drawSnowCapsV7(
                context,
                iceFolkArt,
                raised,
                anchoredDestinationRect(
                  { x, y },
                  camera.zoom,
                  geometryFor(entry),
                ),
                null,
                sceneAlpha,
              );
          } else
            drawTallTerrainOverflowFallback(
              context,
              atSaturation(entry, input.images.resolve(entry.assetId ?? "")),
              { x, y, zoom: camera.zoom, sceneAlpha },
            );
        }
        continue;
      }
      if (entry.kind === "ROAD" || entry.kind === "ROAD_JOIN") {
        drawRoad(
          context,
          entry,
          x,
          y,
          camera.zoom,
          chibiArt === undefined
            ? ROAD_STROKES_V7
            : (direction?.chrome.roads === "CALM"
                ? CALM_ROAD_STROKES_V7
                : CHIBI_ROAD_STROKES_V7
              ).slice(...(pass === "ROAD_CASING" ? [0, 1] : [1])),
        );
        continue;
      }
      if (entry.kind === "GRAVE") {
        const chibi = chibiArt !== undefined;
        const slot = entry.attachmentSlot ?? 0;
        deferredGraveMarkers.push(() =>
          drawGraveCornerMarkerV7(context, x, y, camera.zoom, {
            chibi,
            besideCity: slot > 0,
            highContrast: input.highContrast ?? false,
          }),
        );
        continue;
      }
      if (entry.kind === "STATUS") {
        const pulse =
          input.statusPulse !== null &&
          input.statusPulse !== undefined &&
          same(entry.at, input.statusPulse.at) &&
          entry.statusId === input.statusPulse.statusId &&
          !(input.reducedMotion ?? false)
            ? 1 + 0.22 * Math.sin(input.statusPulse.progress * Math.PI)
            : 1;
        const symbolSize = 22 * camera.zoom * pulse;
        const slot = entry.attachmentSlot ?? 0;
        const statusX = x + (30 - slot * 24) * camera.zoom;
        const statusY = y - 39 * camera.zoom;
        context.save();
        drawTacticalSymbolOnCanvas(
          context,
          entry.statusId,
          statusX - symbolSize / 2,
          statusY - symbolSize / 2,
          symbolSize,
          input.highContrast ?? false,
        );
        context.restore();
        continue;
      }
      if (
        entry.kind === "RESOURCE" &&
        entry.coveredByImprovement === true &&
        chibiArt !== undefined
      )
        continue;
      if (entry.kind === "FIELD_DEFENSE" && chibiArt !== undefined) {
        // Deferred with the piece overlays so a tall piece in the row below
        // never hides it.
        const highContrast = input.highContrast ?? false;
        const saturation = saturationOf(entry);
        deferredChibiOverlays.push(() =>
          drawChibiFieldDefenseV7(
            context,
            x,
            y,
            camera.zoom,
            entry.value ?? 0,
            highContrast,
            saturation,
          ),
        );
        continue;
      }
      if (entry.kind === "FIELD_DEFENSE") {
        const symbolSize = 22 * camera.zoom;
        drawTacticalSymbolOnCanvas(
          context,
          "ui-action-field-defense",
          x - 53 * camera.zoom,
          y - 54 * camera.zoom,
          symbolSize,
          input.highContrast ?? false,
          saturationOf(entry),
        );
        if ((entry.value ?? 0) > 0) {
          context.fillStyle = input.highContrast ? "#ffffff" : "#fff8df";
          context.strokeStyle = "#172529";
          context.lineWidth = 3 * camera.zoom;
          context.font = `800 ${13 * camera.zoom}px system-ui`;
          context.textAlign = "center";
          context.strokeText(
            String(entry.value),
            x - 30 * camera.zoom,
            y - 37 * camera.zoom,
          );
          context.fillText(
            String(entry.value),
            x - 30 * camera.zoom,
            y - 37 * camera.zoom,
          );
        }
        continue;
      }
      // A unit or city drawn with (or loading) a registered chibi raster uses
      // the chibi overlay frame; legacy fallbacks keep the legacy overlays.
      let chibiPiece = false;
      // Visual direction: the piece's pennant was drawn on its own art.
      let directedFlag = false;
      // An Undead or Goblin unit shown with its own faction raster needs no
      // badge.
      let factionArt = false;
      // Revision 19: this frame's cue on this unit's sprite, if any.
      const unitPulse =
        entry.kind === "UNIT" &&
        input.unitPulses !== undefined &&
        input.unitPulses.length > 0
          ? (input.unitPulses.find(
              (pulse) => pulse.unitId === Number(entry.key.slice(5)),
            ) ?? null)
          : null;
      // The Ice Folk revision: this frame of a Shatter on this unit, if any.
      const shatterCue =
        entry.kind === "UNIT" &&
        input.iceFolkShatter !== undefined &&
        input.iceFolkShatter !== null &&
        input.iceFolkShatter.unitId === Number(entry.key.slice(5))
          ? shatterBoardCueV7(input.iceFolkShatter.elapsedMs)
          : null;
      if (entry.assetId !== undefined) {
        const resolved = resolveChibiEntry(entry);
        const chibi = resolved?.resolution ?? null;
        factionArt = resolved?.factionArt ?? false;
        const chibiReady = chibi?.kind === "READY" ? chibi : null;
        chibiPiece = chibi !== null && chibi.kind !== "MISSING";
        // Buildings and cities take their desaturated copy (pulp_wars-x6c);
        // every other piece, and 100 percent, keeps its own raster.
        const image = atSaturation(
          entry,
          chibi === null || chibi.kind === "MISSING"
            ? input.images.resolve(entry.assetId)
            : chibiReady === null
              ? null
              : chibiReady.image,
        );
        const garrisoned =
          chibiReady !== null &&
          entry.kind === "UNIT" &&
          settlementCells.has(coordKey(entry.at));
        if (image !== null) {
          let rect =
            chibiReady === null
              ? anchoredDestinationRect(
                  { x, y },
                  camera.zoom,
                  geometryFor(entry),
                )
              : garrisoned
                ? chibiGarrisonDestinationRect(
                    { x, y },
                    camera,
                    chibiReady.asset,
                    devicePixelRatio,
                  )
                : chibiDestinationRect(
                    { x, y },
                    camera,
                    chibiReady.asset,
                    devicePixelRatio,
                  );
          let alpha = 1;
          // The Dwarf revision: the Dig In earthwork stays on the ground
          // (it never jumps or lifts with the sprite).
          const groundRect = rect;
          const earthworkScale = chibiMasterScale(camera);
          if (
            direction !== undefined &&
            entry.kind === "UNIT" &&
            chibiReady !== null
          )
            drawDirectedUnitBaseV7(
              context,
              direction,
              entry,
              rect,
              camera.zoom,
            );
          // The Martian revision: a flyer casts a ground shadow (over land
          // or water) and is drawn lifted above it; the ground cue stays put.
          // The Dwarf revision: the Gyrocopter flies the same way.
          if (
            entry.kind === "UNIT" &&
            (entry.martian?.flyer === true || entry.dwarf?.flyer === true)
          ) {
            drawFlyerShadowV7(
              context,
              rect,
              chibiReady?.asset.id ?? entry.assetId,
              chibiReady?.asset.width ?? rect.width / camera.zoom,
            );
            rect = {
              ...rect,
              y:
                rect.y -
                (chibiReady === null
                  ? FLYER_LIFT_LEGACY_V7 * camera.zoom
                  : FLYER_LIFT_MASTER_PX_V7 * chibiMasterScale(camera)),
            };
          }
          // Revision 19: a Big or Alpha chibi sprite is drawn larger about
          // its feet (DINOSAUR.md "Growth display"); a cue may scale it too.
          const spriteScale =
            (chibiReady === null
              ? 1
              : growthSpriteScaleV7(
                  entry.growthStage,
                  chibiReady.asset.width,
                )) * (unitPulse?.scale ?? 1);
          if (entry.kind === "UNIT") {
            // The ready cue is the attached outline alone: in both art sets
            // the sprite stays opaque at its own size, so neither it nor the
            // city under it is hidden. Widths follow the sprite's own scale.
            // A direction may move the cue to the base (BASE) or the ground
            // (GROUND, the live look since bead pulp_wars-w5j.3).
            const readiness =
              entry.ready &&
              (direction === undefined || direction.chrome.ready === "GLOW")
                ? readinessUnitStyleV7(
                    input.readinessElapsedMs ?? 0,
                    input.reducedMotion ?? false,
                    input.highContrast ?? false,
                    chibiReady === null
                      ? camera.zoom
                      : chibiMasterScale(camera) *
                          (garrisoned ? CHIBI_GARRISON_SCALE : 1),
                  )
                : null;
            const scale = (readiness?.scale ?? 1) * spriteScale;
            const jump =
              input.selectionJump?.unitId === Number(entry.key.slice(5))
                ? selectionJumpOffsetCssPx(
                    input.selectionJump.elapsedMs,
                    input.selectionJump.speed,
                    input.reducedMotion ?? false,
                  ) * camera.zoom
                : 0;
            rect = {
              x:
                rect.x -
                (rect.width * (scale - 1)) / 2 +
                (unitPulse?.offsetXCssPx ?? 0),
              y: rect.y - rect.height * (scale - 1) + jump,
              width: rect.width * scale,
              height: rect.height * scale,
            };
            alpha = readiness?.opacity ?? 1;
            // The Ice Folk revision: a unit being shattered shakes by 1 px
            // while the cracks run over its casing.
            if (shatterCue !== null && shatterCue.shakeCssPx !== 0)
              rect = { ...rect, x: rect.x + shatterCue.shakeCssPx };
            if (readiness !== null)
              for (const layer of [readiness.halo, readiness.core]) {
                // Each layer raster is phase-free and cached; only its
                // composite opacity pulses.
                const glow = {
                  color: layer.color,
                  alpha: 1,
                  blur: layer.blurCssPx,
                  outline: {
                    width: layer.widthCssPx,
                    rim: layer.rimCssPx,
                    rimColor: layer.rimColor,
                  },
                };
                context.save();
                context.globalAlpha = layer.alpha * sceneAlpha;
                if (input.glowCache === undefined)
                  drawUncachedGlowV7(context, image, rect, glow);
                else
                  input.glowCache.draw(
                    context,
                    image,
                    chibiReady?.cacheKey ?? entry.assetId,
                    rect,
                    glow,
                  );
                context.restore();
              }
          }
          // The Dwarf revision (section 8): a dug-in unit stands inside a
          // low ring of earth: the bank behind it before the sprite.
          if (entry.kind === "UNIT" && entry.dwarf?.dugIn === true)
            drawDigInEarthworkV7(
              context,
              input.dwarfArt,
              groundRect,
              earthworkScale,
              "back",
            );
          context.save();
          context.globalAlpha = alpha * sceneAlpha;
          if (chibiReady !== null) {
            // A garrisoned unit is smoothed unless its reduced scale still
            // lands on whole raster pixels (zoom 2 on a DPR 2 screen).
            // A grown sprite follows the same rule (never a second raster).
            const drawnScale =
              spriteScale * (garrisoned ? CHIBI_GARRISON_SCALE : 1);
            context.imageSmoothingEnabled =
              drawnScale === 1
                ? chibiReady.smoothing
                : !isWholeScale(
                    (chibiMasterScale(camera) * drawnScale * devicePixelRatio) /
                      chibiReady.density,
                  );
            context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
          } else if (entry.sourceCrop === undefined)
            context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
          else
            context.drawImage(
              image,
              entry.sourceCrop.x,
              entry.sourceCrop.y,
              entry.sourceCrop.width,
              entry.sourceCrop.height,
              rect.x,
              rect.y,
              rect.width,
              rect.height,
            );
          context.restore();
          // The Dwarf revision: the sandbags in front of a dug-in unit.
          if (entry.kind === "UNIT" && entry.dwarf?.dugIn === true)
            drawDigInEarthworkV7(
              context,
              input.dwarfArt,
              groundRect,
              earthworkScale,
              "front",
            );
          // The Ice Folk revision (section 13.1): a Frozen unit is cased in
          // ice to the waist, a Frosted one has a thin rime on its top edges;
          // a unit being shattered is cased to the top, then cracks.
          if (entry.kind === "UNIT") {
            if (shatterCue !== null && shatterCue.casing) {
              drawFrozenCasingV7(context, iceFolkArt, image, rect, 1);
              drawShatterCracksV7(context, rect, shatterCue.cracks);
            } else if (entry.iceFolk?.chill === "FROZEN")
              drawFrozenCasingV7(context, iceFolkArt, image, rect);
            else if (entry.iceFolk?.chill === "FROSTED")
              drawFrostedRimeV7(context, iceFolkArt, image, rect);
          }
          // The Martian revision: a walker afloat wades (ripples at its feet).
          if (
            entry.kind === "UNIT" &&
            entry.martian?.afloat === true &&
            !entry.martian.flyer
          )
            drawWadeRipplesV7(context, rect, camera.zoom);
          if (direction !== undefined && chibiReady !== null)
            directedFlag = drawDirectedFlagV7(
              context,
              direction,
              entry,
              chibiReady.asset.id,
              rect,
              chibiMasterScale(camera),
            );
        }
      }
      const directedGarrison =
        entry.kind === "UNIT" && settlementCells.has(coordKey(entry.at));
      // Revision 19: LEGACY has no Egg raster (and CHIBI may lack one), so
      // the Egg is drawn in code, in its owner's colour.
      if (entry.kind === "UNIT" && entry.egg !== undefined && !chibiPiece)
        drawCodeEggV7(
          context,
          x + (unitPulse?.offsetXCssPx ?? 0),
          y,
          camera.zoom,
          {
            ownerColor: entry.ownerColor,
            highContrast: input.highContrast ?? false,
            scale: unitPulse?.scale ?? 1,
          },
        );
      // The Dwarf revision: LEGACY and the classic look have no mound
      // raster, so the mound is drawn in code.
      if (
        entry.kind === "UNIT" &&
        entry.dwarfMound !== undefined &&
        !chibiPiece
      )
        drawCodeMoundV7(context, x, y, camera.zoom, {
          rider: entry.dwarfMound.rider,
          highContrast: input.highContrast ?? false,
        });
      const drawPieceOverlays = (): void => {
        const directed =
          direction === undefined || !chibiPiece
            ? null
            : drawDirectedPieceChromeV7(
                context,
                direction,
                entry,
                x,
                y,
                camera.zoom,
                directedGarrison,
                directedFlag,
              );
        if (
          (entry.kind === "UNIT" || entry.kind === "CITY") &&
          entry.ownerColor !== undefined &&
          directed?.badge !== true
        ) {
          const badge = chibiPiece
            ? CHIBI_OVERLAY_FRAME_V7.seatBadge
            : { left: -31, top: 13, size: 18 };
          context.fillStyle = entry.ownerColor;
          context.strokeStyle = "#171722";
          context.lineWidth = 2 * camera.zoom;
          context.fillRect(
            x + badge.left * camera.zoom,
            y + badge.top * camera.zoom,
            badge.size * camera.zoom,
            badge.size * camera.zoom,
          );
          context.strokeRect(
            x + badge.left * camera.zoom,
            y + badge.top * camera.zoom,
            badge.size * camera.zoom,
            badge.size * camera.zoom,
          );
          context.fillStyle = "#171722";
          context.font = `${800} ${11 * camera.zoom}px system-ui`;
          context.textAlign = "center";
          context.fillText(
            String((entry.ownerSeat ?? 0) + 1),
            x + (badge.left + badge.size / 2) * camera.zoom,
            y + (badge.top + 14) * camera.zoom,
          );
        }
        if (entry.kind === "UNIT" && entry.faction === "UNDEAD" && !factionArt)
          drawUndeadBadgeV7(context, x, y, camera.zoom, chibiPiece);
        if (entry.kind === "UNIT" && entry.faction === "GOBLIN" && !factionArt)
          drawGoblinBadgeV7(context, x, y, camera.zoom, chibiPiece);
        // The Egg has its own sprite and no Human counterpart, so it never
        // wears the badge (bead pulp_wars-c87.7).
        if (
          entry.kind === "UNIT" &&
          entry.faction === "DINOSAUR" &&
          !factionArt &&
          entry.artSubject !== "UNIT:DINOSAUR:EGG"
        )
          drawDinosaurBadgeV7(context, x, y, camera.zoom, chibiPiece);
        // The Martian revision: the saucer badge over Human stand-in art
        // (LEGACY and the classic look), then the Cooling glyph or the
        // Thrall collar in the status slot right of the sprite.
        if (entry.kind === "UNIT" && entry.faction === "MARTIAN" && !factionArt)
          drawMartianBadgeV7(context, x, y, camera.zoom, chibiPiece);
        // The Ice Folk revision: the snow-capped peak badge over Human stand-in art
        // (LEGACY and the classic look).
        if (
          entry.kind === "UNIT" &&
          entry.faction === "ICE_FOLK" &&
          !factionArt
        )
          drawIceFolkBadgeV7(context, x, y, camera.zoom, chibiPiece);
        // The Dwarf revision: the copper cog badge over Human stand-in art
        // (LEGACY and the classic look); a mound is the Dwarves' own.
        if (
          entry.kind === "UNIT" &&
          entry.faction === "DWARF" &&
          !factionArt &&
          entry.dwarfMound === undefined
        )
          drawDwarfBadgeV7(context, x, y, camera.zoom, chibiPiece);
        // The Dwarf revision (section 5.3): the mound's surfacing chip.
        if (entry.kind === "UNIT" && entry.dwarfMound !== undefined)
          drawMoundChipV7(context, x, y, camera.zoom, {
            chibi: chibiPiece,
            highContrast: input.highContrast ?? false,
          });
        if (entry.kind === "UNIT" && entry.martian !== undefined) {
          if (entry.martian.thrall)
            drawThrallCollarV7(context, x, y, camera.zoom, {
              chibi: chibiPiece,
              highContrast: input.highContrast ?? false,
            });
          else if (entry.martian.cooling)
            drawCoolingGlyphV7(context, x, y, camera.zoom, {
              chibi: chibiPiece,
              highContrast: input.highContrast ?? false,
            });
        }
        if (entry.kind === "UNIT")
          for (const [slot, affliction] of (
            entry.afflictions ?? []
          ).entries()) {
            const subject = afflictionSubjectV7(affliction);
            // CHIBI pieces draw the registered marker raster (bead
            // pulp_wars-vkq.14) unless the hook supplies one; high contrast
            // and a raster still loading keep the code-drawn marker.
            const registered =
              chibiPiece &&
              chibiArt !== undefined &&
              !(input.highContrast ?? false)
                ? chibiArt.resolve({
                    subject,
                    at: entry.at,
                    deviceScale: chibiMasterScale(camera) * devicePixelRatio,
                  })
                : null;
            drawAfflictionMarkerV7(context, subject, x, y, camera.zoom, {
              chibi: chibiPiece,
              slot,
              highContrast: input.highContrast ?? false,
              raster:
                input.afflictionArt?.(subject) ??
                (registered?.kind === "READY" ? registered.image : null),
              devicePixelRatio,
            });
          }
        // The Ice Folk revision: a Frosted unit's frost glyph in the next
        // status slot after its afflictions.
        if (entry.kind === "UNIT" && entry.iceFolk?.chill === "FROSTED") {
          const registered =
            chibiPiece &&
            chibiArt !== undefined &&
            !(input.highContrast ?? false)
              ? chibiArt.resolve({
                  subject: "ICON:STATUS:CHILLED",
                  at: entry.at,
                  deviceScale: chibiMasterScale(camera) * devicePixelRatio,
                })
              : null;
          drawChillGlyphV7(context, x, y, camera.zoom, {
            chibi: chibiPiece,
            slot: entry.afflictions?.length ?? 0,
            raster: registered?.kind === "READY" ? registered.image : null,
            highContrast: input.highContrast ?? false,
            devicePixelRatio,
          });
        }
        if (
          entry.kind === "CITY" &&
          entry.capital === true &&
          chibiPiece &&
          directed?.crown !== true
        )
          drawCapitalCrownV7(context, x, y, camera.zoom);
        if (entry.kind === "CITY") {
          const width = Math.max(1, (entry.value ?? 1) + 1);
          const positive = Math.max(0, Math.min(width, entry.population ?? 0));
          const negative = Math.max(
            0,
            Math.min(width, -(entry.population ?? 0)),
          );
          const pipSize = 7 * camera.zoom;
          const pipStep = 9 * camera.zoom;
          const column = CHIBI_OVERLAY_FRAME_V7.populationColumn;
          for (let index = 0; index < width; index += 1) {
            drawPopulationPipV7(
              context,
              chibiPiece
                ? x + column.left * camera.zoom
                : x - (width * pipStep - 2 * camera.zoom) / 2 + index * pipStep,
              chibiPiece
                ? y + column.bottom * camera.zoom - pipSize - index * pipStep
                : y + 34 * camera.zoom,
              pipSize,
              index < positive
                ? "filled"
                : index < negative
                  ? "deficit"
                  : "empty",
              camera.zoom,
            );
          }
        }
        // Revision 19: growth chevrons (one for Big, two for Alpha) and the
        // Egg's countdown; an Egg shows its HP bar only when damaged.
        if (entry.kind === "UNIT" && entry.growthStage !== undefined)
          drawGrowthChevronsV7(context, x, y, camera.zoom, entry.growthStage, {
            chibi: chibiPiece,
            highContrast: input.highContrast ?? false,
          });
        if (entry.kind === "UNIT" && entry.egg !== undefined)
          drawEggCountdownV7(
            context,
            x,
            y,
            camera.zoom,
            entry.egg.turnsRemaining,
            {
              chibi: chibiPiece,
              ownerColor: entry.ownerColor,
              highContrast: input.highContrast ?? false,
            },
          );
        if (
          entry.kind === "UNIT" &&
          entry.hp !== undefined &&
          entry.maxHp !== undefined &&
          directed?.hp !== true &&
          (entry.egg === undefined || entry.hp < entry.maxHp)
        ) {
          const share = Math.max(0, Math.min(1, entry.hp / entry.maxHp));
          context.fillStyle = "#101718";
          if (chibiPiece) {
            // Vertical bar in the cell's left strip, filling from the bottom.
            const bar = CHIBI_OVERLAY_FRAME_V7.hpBar;
            context.fillRect(
              x + bar.left * camera.zoom,
              y + bar.top * camera.zoom,
              bar.width * camera.zoom,
              bar.height * camera.zoom,
            );
            const inner = (bar.height - 2) * share;
            context.fillStyle = "#65d889";
            context.fillRect(
              x + (bar.left + 1) * camera.zoom,
              y + (bar.top + bar.height - 1 - inner) * camera.zoom,
              (bar.width - 2) * camera.zoom,
              inner * camera.zoom,
            );
          } else {
            context.fillRect(
              x - 25 * camera.zoom,
              y + 25 * camera.zoom,
              50 * camera.zoom,
              7 * camera.zoom,
            );
            context.fillStyle = "#65d889";
            context.fillRect(
              x - 24 * camera.zoom,
              y + 26 * camera.zoom,
              48 * (entry.hp / entry.maxHp) * camera.zoom,
              5 * camera.zoom,
            );
          }
        }
        // The Ice Folk revision (section 13.1): the Shatter window on a
        // Chilled unit's HP bar, in the bar of the look. The live look's
        // base bar shows only when damaged, so a Chilled unit at full HP
        // gets its bar too: the window is the point.
        if (
          entry.kind === "UNIT" &&
          entry.hp !== undefined &&
          entry.maxHp !== undefined &&
          entry.iceFolk !== undefined &&
          entry.iceFolk.shatterWindow !== null
        ) {
          const zoom = camera.zoom;
          let bar: HpBarGeometryV7;
          if (directed?.hp === true && direction !== undefined) {
            if (direction.chrome.hpPlacement === "SIDE") {
              const side = { left: -63, top: -36, width: 9, height: 76 };
              bar = {
                vertical: true,
                inner: {
                  x: x + (side.left + 1) * zoom,
                  y: y + (side.top + 1) * zoom,
                  width: (side.width - 2) * zoom,
                  height: (side.height - 2) * zoom,
                },
              };
            } else {
              const width = (directedGarrison ? 40 : 54) * zoom;
              const height = 8 * zoom;
              const left = x + (directedGarrison ? 20 : 0) * zoom - width / 2;
              const top = y + DIRECTED_BASE_HP_BAR_TOP_V7 * zoom;
              if (direction.chrome.hp !== "ALWAYS" && entry.hp >= entry.maxHp) {
                context.fillStyle = "#101718";
                context.fillRect(left, top, width, height);
                context.fillStyle = "#65d889";
                context.fillRect(
                  left + zoom,
                  top + zoom,
                  width - 2 * zoom,
                  height - 2 * zoom,
                );
              }
              bar = {
                vertical: false,
                inner: {
                  x: left + zoom,
                  y: top + zoom,
                  width: width - 2 * zoom,
                  height: height - 2 * zoom,
                },
              };
            }
          } else if (chibiPiece) {
            const side = CHIBI_OVERLAY_FRAME_V7.hpBar;
            bar = {
              vertical: true,
              inner: {
                x: x + (side.left + 1) * zoom,
                y: y + (side.top + 1) * zoom,
                width: (side.width - 2) * zoom,
                height: (side.height - 2) * zoom,
              },
            };
          } else
            bar = {
              vertical: false,
              inner: {
                x: x - 24 * zoom,
                y: y + 26 * zoom,
                width: 48 * zoom,
                height: 5 * zoom,
              },
            };
          drawShatterWindowV7(
            context,
            bar,
            entry.hp,
            entry.maxHp,
            entry.iceFolk.shatterWindow,
            input.highContrast ?? false,
          );
        }
        // The Martian revision (section 13.1): the segmented Shield bar,
        // with the HP bar of the look: under the LEGACY bar's row, beside the
        // classic CHIBI side bar, or on the live look's base.
        if (
          entry.kind === "UNIT" &&
          entry.martian !== undefined &&
          entry.martian.shieldSegments > 0
        ) {
          const base =
            directed?.hp === true && direction?.chrome.hpPlacement === "BASE";
          drawShieldBarV7(context, x, y, camera.zoom, entry.martian, {
            placement: base ? "BASE" : chibiPiece ? "SIDE" : "LEGACY",
            hpShown:
              direction?.chrome.hp === "ALWAYS" ||
              (entry.hp ?? 0) < (entry.maxHp ?? 0) ||
              // The Ice Folk revision: a Chilled unit always shows its bar.
              (entry.iceFolk?.shatterWindow ?? null) !== null,
            garrisoned: directedGarrison,
            highContrast: input.highContrast ?? false,
          });
        }
        // The Dwarf revision (DWARF.md "Clockwork glyph"): a construct's
        // gear at its HP bar's end, whenever the bar shows.
        if (
          entry.kind === "UNIT" &&
          entry.dwarf?.clockwork === true &&
          entry.hp !== undefined &&
          entry.maxHp !== undefined &&
          (entry.hp < entry.maxHp || direction?.chrome.hp === "ALWAYS")
        ) {
          const zoom = camera.zoom;
          const radius = Math.max(4.5, 6.5 * zoom);
          let gear: { readonly x: number; readonly y: number };
          if (
            directed?.hp === true &&
            direction !== undefined &&
            direction.chrome.hpPlacement === "BASE"
          ) {
            const width = (directedGarrison ? 40 : 54) * zoom;
            const left = x + (directedGarrison ? 20 : 0) * zoom - width / 2;
            gear = {
              x: left + width + radius * 0.9,
              y: y + (DIRECTED_BASE_HP_BAR_TOP_V7 + 4) * zoom,
            };
          } else if (chibiPiece) {
            const bar = CHIBI_OVERLAY_FRAME_V7.hpBar;
            gear = {
              x: x + (bar.left + bar.width / 2) * zoom,
              y: y + bar.top * zoom - radius * 0.9,
            };
          } else gear = { x: x + 25 * zoom + radius * 0.9, y: y + 28.5 * zoom };
          drawClockworkGearV7(
            context,
            gear.x,
            gear.y,
            radius,
            input.highContrast ?? false,
          );
        }
      };
      if (chibiPiece) deferredChibiOverlays.push(drawPieceOverlays);
      else drawPieceOverlays();
      if (entry.kind === "VALUE") {
        const count = Math.max(0, Math.min(24, entry.value ?? 0));
        const population = entry.label === "POPULATION";
        const displayedCount = population ? Math.max(1, count) : count;
        context.fillStyle = entry.label === "CAPACITY" ? "#71cfef" : "#5fc2e8";
        for (let index = 0; index < displayedCount; index += 1) {
          const column = index % 8;
          const row = Math.floor(index / 8);
          const left = x - 34 * camera.zoom + column * 9 * camera.zoom;
          const top = y + (36 + row * 9) * camera.zoom;
          if (population)
            drawPopulationPipV7(
              context,
              left,
              top,
              7 * camera.zoom,
              index < count ? "filled" : "empty",
              camera.zoom,
            );
          else context.fillRect(left, top, 7 * camera.zoom, 7 * camera.zoom);
        }
      }
    }
  for (const drawOverlays of deferredChibiOverlays) drawOverlays();
  for (const drawMarker of deferredGraveMarkers) drawMarker();
  // The Ice Folk revision: the selected (or hovered) Witch's nine tiles.
  for (const entry of input.plan.entries)
    if (
      entry.kind === "UNIT" &&
      entry.iceFolk?.witch === true &&
      (entry.blizzardRing === true ||
        (input.previewFocus !== undefined &&
          input.previewFocus !== null &&
          same(input.previewFocus, entry.at)))
    )
      drawBlizzardRingV7(
        context,
        {
          x: camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom,
          y: camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom,
        },
        TILE_WIDTH * camera.zoom,
        input.highContrast ?? false,
      );
  // The Dwarf revision (section 16.1): the selected (or hovered) Mole
  // mound's eruption ring round its eight tiles.
  for (const entry of input.plan.entries)
    if (
      entry.kind === "UNIT" &&
      entry.dwarfMound !== undefined &&
      !entry.dwarfMound.rider &&
      (entry.dwarfMound.ring ||
        (input.previewFocus !== undefined &&
          input.previewFocus !== null &&
          same(input.previewFocus, entry.at)))
    )
      drawEruptionRingV7(
        context,
        {
          x: camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom,
          y: camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom,
        },
        TILE_WIDTH * camera.zoom,
        input.highContrast ?? false,
      );
  const targetEdgeKeys = new Set(
    input.plan.entries.flatMap((entry) =>
      entry.kind === "TARGET"
        ? (entry.targetEdges ?? TILE_EDGES).map((edge) =>
            edgeKey(entry.at, edge),
          )
        : [],
    ),
  );
  const boundaries = input.plan.entries.filter(
    (entry) => entry.kind === "TERRITORY_BOUNDARY",
  );
  if (boundaries.length > 0) {
    // Keep wider contour strokes off unexplored ground, including their casing.
    context.save();
    context.beginPath();
    for (const entry of input.plan.entries) {
      if (entry.kind !== "TERRAIN") continue;
      const size = TILE_WIDTH * camera.zoom;
      context.rect(
        camera.offsetX + entry.at.x * size - size / 2,
        camera.offsetY + entry.at.y * size - size / 2,
        size,
        size,
      );
    }
    context.clip();
    const roadCells = new Set(
      input.plan.entries
        .filter((entry) => entry.kind === "ROAD")
        .map((entry) => `${entry.at.x},${entry.at.y}`),
    );
    for (const boundary of boundaries) {
      if (
        boundary.edge !== undefined &&
        targetEdgeKeys.has(edgeKey(boundary.at, boundary.edge))
      )
        continue;
      if (direction?.chrome.borders === "SOLID")
        drawDirectedTerritoryBoundaryV7(context, camera, boundary);
      else drawTerritoryBoundary(context, camera, boundary, roadCells);
    }
    context.restore();
  }
  drawAbilityAreasV7(context, camera, input.plan.entries);
  // Selection and action outlines keep visual priority over ownership.
  for (const entry of input.plan.entries) {
    const size = TILE_WIDTH * camera.zoom;
    const left = camera.offsetX + entry.at.x * size - size / 2;
    const top = camera.offsetY + entry.at.y * size - size / 2;
    if (
      entry.kind === "REACH" ||
      entry.kind === "SELECTION" ||
      entry.kind === "CURSOR"
    ) {
      context.save();
      context.lineWidth =
        (entry.kind === "SELECTION" ? 5 : entry.kind === "CURSOR" ? 3 : 2) *
        camera.zoom;
      context.strokeStyle =
        entry.kind === "SELECTION"
          ? "#fff6b0"
          : entry.kind === "CURSOR"
            ? "#ffffff"
            : "#ffd34e";
      context.setLineDash(
        entry.kind === "REACH"
          ? [9 * camera.zoom, 5 * camera.zoom]
          : entry.kind === "CURSOR"
            ? [3 * camera.zoom, 3 * camera.zoom]
            : [],
      );
      context.strokeRect(
        left + 4 * camera.zoom,
        top + 4 * camera.zoom,
        size - 8 * camera.zoom,
        size - 8 * camera.zoom,
      );
      context.restore();
      continue;
    }
  }
  const publicLinks = input.plan.entries.filter(
    (entry) =>
      entry.kind === "LINK" &&
      entry.linkTo !== undefined &&
      entry.label !== "THRALL_LINK",
  );
  if (publicLinks.length > 0) {
    context.save();
    for (const entry of input.plan.entries) {
      const exclusion = tacticalLinkExclusionRect(entry, camera);
      if (exclusion === null) continue;
      context.beginPath();
      context.rect(0, 0, viewport.width, viewport.height);
      context.rect(exclusion.x, exclusion.y, exclusion.width, exclusion.height);
      context.clip("evenodd");
    }
    for (const link of publicLinks) drawPublicLink(context, camera, link);
    context.restore();
  }
  // The Martian revision: the link from a selected Thrall to its Brain, or
  // from a selected Brain to its Thralls, drawn over the pieces.
  for (const entry of input.plan.entries)
    if (
      entry.kind === "LINK" &&
      entry.label === "THRALL_LINK" &&
      entry.linkTo !== undefined
    )
      drawThrallLinkV7(
        context,
        {
          x: camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom,
          y: camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom,
        },
        {
          x: camera.offsetX + entry.linkTo.x * TILE_WIDTH * camera.zoom,
          y: camera.offsetY + entry.linkTo.y * TILE_HEIGHT * camera.zoom,
        },
        camera.zoom,
        input.highContrast ?? false,
      );
  // Preview labels and notes stay inside the visible, unobscured band and
  // off each other; one placer serves every preview box of this frame.
  // Every label is queued and drawn after every outline and area fill, so
  // no later target's outline or splash ring crosses an earlier label.
  const placer = new PreviewLabelPlacerV7(
    previewSafeRectV7(viewport, input.labelSafeArea),
  );
  const labels: (() => void)[] = [];
  const defer = (draw: () => void): void => {
    labels.push(draw);
  };
  // Revision 17: a blast or friendly bomb splash places its labels on their
  // own cells first and paints them last, so an attack's label stack is the
  // one nudged aside, no hit label lands on the wrong unit, and none is
  // hidden. Other matches keep their label order.
  const goblinAreaFirst = input.plan.targets.some(
    (target) =>
      target.blast !== undefined ||
      target.splash?.some((item) => item.friendly === true) === true,
  );
  const paints: (() => void)[] = [];
  const paintLater = goblinAreaFirst
    ? (paint: () => void): void => {
        paints.push(paint);
      }
    : undefined;
  const drawAreaPreviews = (): void => {
    drawSplashPreviewV7(
      context,
      camera,
      input.plan,
      input.previewFocus ?? null,
      placer,
      defer,
      paintLater,
    );
    drawAttackBlastPreviewV7(
      context,
      camera,
      input.plan,
      input.previewFocus ?? null,
      placer,
      defer,
      paintLater,
    );
    drawMartianFocusPreviewV7(
      context,
      camera,
      input.plan,
      input.previewFocus ?? null,
      placer,
      defer,
    );
    drawIceFolkFocusPreviewV7(
      context,
      camera,
      input.plan,
      input.previewFocus ?? null,
      placer,
      defer,
    );
    drawDwarfFocusPreviewV7(
      context,
      camera,
      input.plan,
      input.previewFocus ?? null,
      placer,
      defer,
    );
  };
  if (goblinAreaFirst) drawAreaPreviews();
  // The Martian revision: the shooter's note goes on the focused target,
  // or on the only target that has one.
  const focusNoteTargets = input.plan.targets.filter(
    (target) => target.previewFocusNote !== undefined,
  );
  const focus = input.previewFocus ?? null;
  const focusNoteAt =
    (focus === null
      ? undefined
      : focusNoteTargets.find((target) => same(target.at, focus))?.at) ??
    (focusNoteTargets.length === 1 ? focusNoteTargets[0]?.at : undefined);
  for (const target of input.plan.entries) {
    if (target.kind !== "TARGET") continue;
    drawMapTarget(
      context,
      camera,
      target,
      placer,
      defer,
      focusNoteAt !== undefined && same(focusNoteAt, target.at),
    );
  }
  if (!goblinAreaFirst) drawAreaPreviews();
  for (const entry of input.plan.entries) {
    if (entry.kind !== "ABILITY_TARGET" || entry.abilityStyle === undefined)
      continue;
    drawAbilityTargetV7(
      context,
      camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom,
      camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom,
      camera.zoom,
      undeadPreviewStyleV7(
        entry.abilityStyle,
        direction?.undeadAccent === "VIOLET",
      ),
      entry.label ?? "",
      entry.lethal === true,
      placer,
      defer,
    );
  }
  for (const draw of labels) draw();
  for (const paint of paints) paint();
  const statusPulse = input.statusPulse;
  if (
    statusPulse !== null &&
    statusPulse !== undefined &&
    !input.plan.entries.some(
      (entry) =>
        entry.kind === "STATUS" &&
        entry.statusId === statusPulse.statusId &&
        same(entry.at, statusPulse.at),
    )
  ) {
    const x = camera.offsetX + statusPulse.at.x * TILE_WIDTH * camera.zoom;
    const y = camera.offsetY + statusPulse.at.y * TILE_HEIGHT * camera.zoom;
    const pulse = input.reducedMotion
      ? 1
      : 1 + 0.22 * Math.sin(statusPulse.progress * Math.PI);
    const size = 22 * camera.zoom * pulse;
    drawTacticalSymbolOnCanvas(
      context,
      statusPulse.statusId,
      x + 30 * camera.zoom - size / 2,
      y - 39 * camera.zoom - size / 2,
      size,
      input.highContrast ?? false,
    );
  }
  if (input.impact !== null && input.impact !== undefined) {
    const x =
      camera.offsetX +
      input.impact.at.x * TILE_WIDTH * camera.zoom +
      input.impact.shakeCssPx * camera.zoom;
    const y = camera.offsetY + input.impact.at.y * TILE_HEIGHT * camera.zoom;
    context.save();
    context.globalAlpha = input.impact.flashAlpha * sceneAlpha;
    context.fillStyle = "#fff2a8";
    context.beginPath();
    context.arc(x, y, 34 * camera.zoom, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
}

function addTerritoryBoundaries(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  selection: BoardSelectionV7 | null,
): void {
  const selectedCity =
    selection?.kind === "CITY"
      ? view.cities.find((city) => city.id === selection.cityId)
      : undefined;
  for (const segment of view.board.territoryBorders) {
    const key = edgeKey(segment.at, segment.edge);
    const sharedOwnerIds = segment.sharedOwnerIds;
    if (
      selectedCity !== undefined &&
      segment.cityIds.includes(selectedCity.id)
    ) {
      const counterpartOwnerId = sharedOwnerIds?.find(
        (ownerId) => ownerId !== selectedCity.ownerId,
      );
      const counterpartOwnerColor =
        counterpartOwnerId === undefined
          ? undefined
          : ownerPresentation(view, counterpartOwnerId).ownerColor;
      entries.push({
        key: `territory-city:${selectedCity.id}:${key}`,
        kind: "TERRITORY_BOUNDARY",
        layer: 8,
        at: segment.at,
        edge: segment.edge,
        boundaryStyle: "CITY",
        ownerId: selectedCity.ownerId,
        ...ownerPresentation(view, selectedCity.ownerId),
        ...(counterpartOwnerColor === undefined
          ? {}
          : { counterpartOwnerColor }),
      });
    } else if (segment.ownerId !== null) {
      const [ownerId, counterpartOwnerId] = sharedOwnerIds ?? [
        segment.ownerId,
        undefined,
      ];
      const counterpartOwnerColor =
        counterpartOwnerId === undefined
          ? undefined
          : ownerPresentation(view, counterpartOwnerId).ownerColor;
      entries.push({
        key: `territory-owner:${key}`,
        kind: "TERRITORY_BOUNDARY",
        layer: 7,
        at: segment.at,
        edge: segment.edge,
        boundaryStyle: "OWNER",
        ownerId,
        ...ownerPresentation(view, ownerId),
        ...(counterpartOwnerColor === undefined
          ? {}
          : { counterpartOwnerColor }),
      });
    }
  }
}

function edgeKey(at: CoordV7, edge: TileEdge): string {
  if (edge === "NORTH") return `h:${at.x}:${at.y}`;
  if (edge === "SOUTH") return `h:${at.x}:${at.y + 1}`;
  if (edge === "WEST") return `v:${at.x}:${at.y}`;
  return `v:${at.x + 1}:${at.y}`;
}

function mapTargetEdges(
  targets: readonly MapCommandTargetV7[],
): ReadonlyMap<string, readonly TileEdge[]> {
  const winners = new Map<
    string,
    { readonly target: MapCommandTargetV7; readonly edge: TileEdge }
  >();
  for (const target of targets)
    for (const edge of TILE_EDGES) {
      const key = edgeKey(target.at, edge);
      const winner = winners.get(key);
      if (
        winner === undefined ||
        targetPriority(target.family) > targetPriority(winner.target.family)
      )
        winners.set(key, { target, edge });
    }
  const result = new Map<string, TileEdge[]>();
  for (const { target, edge } of winners.values()) {
    const key = `${target.family}:${target.at.x},${target.at.y}`;
    const edges = result.get(key) ?? [];
    edges.push(edge);
    result.set(key, edges);
  }
  return result;
}

function targetPriority(family: MapCommandTargetV7["family"]): number {
  if (family === "ATTACK") return 6;
  if (
    family === "MIND_CONTROL" ||
    family === "TRACTOR_BEAM" ||
    family === "BEAM_DOWN" ||
    family === "BEAM_DOWN_PASSENGER" ||
    family === "THROW_BOLAS" ||
    family === "COLD_SNAP"
  )
    return 5;
  if (family === "HATCH") return 4;
  // Revision 16: a two-step landing cell keeps its whole dotted outline
  // where it touches a "Land now" or Move target.
  if (family === "LANDING_AFTER_MOVE") return 3;
  if (family === "MONUMENT") return 2;
  return 1;
}

/** The Martian revision: the outline of a machine's Launch tile. */
export const LAUNCH_TARGET_STROKE_V7 = "#c7e7f5";

function targetStroke(
  family: MapCommandTargetV7["family"] | undefined,
): string {
  if (family === "ATTACK") return "#ff655f";
  if (family === "LANDING_AFTER_MOVE") return "#f4c95d";
  // Revision 19: Hatch and nest-tile targets use the unowned cue cream.
  if (family === "HATCH" || family === "LAY_EGG") return "#fff8d0";
  // The Martian revision: the faction's magenta glow (MARTIAN_PALETTE_V7).
  if (
    family === "MIND_CONTROL" ||
    family === "TRACTOR_BEAM" ||
    family === "BEAM_DOWN" ||
    family === "BEAM_DOWN_PASSENGER"
  )
    return "#ff8fd6";
  // The Ice Folk revision: the pale ice of ICE_FOLK_PALETTE_V7.
  if (family === "THROW_BOLAS" || family === "COLD_SNAP") return "#d6f0ff";
  // The Dwarf revision: light earth for the tunnel, lit copper for the
  // bomb, steam white for the Assemble tiles (DWARF_PALETTE_V7).
  if (
    family === "TUNNEL" ||
    family === "TUNNEL_DESTINATION" ||
    family === "TUNNEL_RIDER"
  )
    return "#d8b58a";
  if (family === "BOMB_TARGET" || family === "BOMB_RUN") return "#f2a46a";
  if (family === "ASSEMBLE") return "#f0f1ee";
  return "#64e6cf";
}

/** Dash pattern in CSS pixels; the two-step landing marker is dotted. */
function targetDash(
  family: MapCommandTargetV7["family"] | undefined,
): readonly [number, number] {
  return family === "LANDING_AFTER_MOVE" ? [3, 6] : [9, 5];
}

/** Vertical band (and optional side insets) preview labels must stay in. */
export interface LabelSafeAreaV7 {
  readonly top: number;
  readonly bottom: number;
  readonly left?: number;
  readonly right?: number;
}

/** The clamp rectangle for preview boxes, inset by the edge margin. */
export function previewSafeRectV7(
  viewport: Size,
  area: LabelSafeAreaV7 | null | undefined,
): PreviewRectV7 {
  const margin = PREVIEW_EDGE_MARGIN_CSS_PX_V7;
  const top = Math.max(0, area?.top ?? 0);
  const bottom = Math.min(viewport.height, area?.bottom ?? viewport.height);
  // A degenerate band (a dock taller than the canvas) falls back to the
  // whole viewport, as the start-camera framing does.
  const band =
    bottom - top >= 1 ? { top, bottom } : { top: 0, bottom: viewport.height };
  return {
    left: Math.max(0, area?.left ?? 0) + margin,
    right: Math.min(viewport.width, area?.right ?? viewport.width) - margin,
    top: band.top + margin,
    bottom: band.bottom - margin,
  };
}

function drawMapTarget(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entry: BoardRenderPlanEntryV7,
  placer: PreviewLabelPlacerV7,
  defer: (draw: () => void) => void,
  /** The Martian revision: this target also shows `previewFocusNote`. */
  focused = false,
): void {
  const x = camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
  context.save();
  context.lineWidth = 4 * camera.zoom;
  // The Martian revision: a Launch tile is dotted in the pale glass blue.
  const launch = entry.target?.launch === true;
  context.strokeStyle = launch
    ? LAUNCH_TARGET_STROKE_V7
    : targetStroke(entry.target?.family);
  const [dash, gap] = launch ? [3, 5] : targetDash(entry.target?.family);
  context.setLineDash([dash * camera.zoom, gap * camera.zoom]);
  for (const edge of entry.targetEdges ?? TILE_EDGES)
    strokeTileEdge(context, camera, entry.at, edge);
  context.restore();
  const target = entry.target;
  const labelBox = (text: string): PreviewTextBoxV7 => ({
    text,
    fill: "#171722dd",
    color: "#fff8df",
    lineBox: 1.8,
    baseline: 1.3,
  });
  const warningBox = (text: string): PreviewTextBoxV7 => ({
    text,
    fill: "#4d3500f2",
    color: "#ffe9a8",
    lineBox: 1.6,
    baseline: 1.2,
  });
  const label =
    target?.previewLabel === undefined ? [] : [labelBox(target.previewLabel)];
  const noteText = [
    target?.previewNote,
    focused ? target?.previewFocusNote : undefined,
  ]
    .filter((part): part is string => part !== undefined && part !== "")
    .join(" · ");
  const note =
    noteText === ""
      ? []
      : [
          {
            text: noteText,
            fill: "#2a1633ee",
            color: "#f3dcff",
            lineBox: 1.6,
            baseline: 1.2,
          },
        ];
  const warnings = (target?.previewWarnings ?? []).map(warningBox);
  const summary =
    warnings.length === 0 || target?.previewWarningSummary === undefined
      ? []
      : [warningBox(target.previewWarningSummary)];
  const shortLabel = target?.previewLabel?.split(" · ")[0];
  // Bead pulp_wars-0ao.12: fullest first. A crowded target falls back to
  // the warnings' one-line summary, then to the label and note, the label,
  // and finally the label's first part, so no preview box covers another.
  const variants = dedupeStacks([
    [...label, ...note, ...warnings],
    [...label, ...note, ...summary],
    [...label, ...note],
    label,
    shortLabel === undefined ? [] : [labelBox(shortLabel)],
  ]);
  if (variants.length > 0)
    defer(() => {
      drawPreviewTextStackV7(context, x, y, camera.zoom, variants, placer);
    });
}

/** Drops empty and repeated stacks, keeping the first of each. */
function dedupeStacks(
  stacks: readonly (readonly PreviewTextBoxV7[])[],
): readonly (readonly PreviewTextBoxV7[])[] {
  const seen = new Set<string>();
  return stacks.filter((boxes) => {
    if (boxes.length === 0) return false;
    const key = JSON.stringify(boxes.map((box) => [box.text, box.fill]));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Faint area fills and outer edges of the selected unit's ability preview. */
function drawAbilityAreasV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entries: readonly BoardRenderPlanEntryV7[],
): void {
  const areas = entries.filter(
    (entry) =>
      entry.kind === "ABILITY_AREA" && entry.abilityStyle !== undefined,
  );
  if (areas.length === 0) return;
  context.save();
  for (const entry of areas) {
    const style = entry.abilityStyle ?? "WAIL";
    drawAbilityAreaCellV7(
      context,
      camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom,
      camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom,
      camera.zoom,
      style,
    );
    context.strokeStyle = abilityAreaStrokeV7(style);
    context.lineWidth = 3 * camera.zoom;
    context.setLineDash([6 * camera.zoom, 4 * camera.zoom]);
    for (const edge of entry.targetEdges ?? [])
      strokeTileEdge(context, camera, entry.at, edge);
  }
  context.restore();
}

/**
 * Revision 13 splash preview (Lich and, in Undead matches, Battleship): the
 * ring around the focused attack target and each visible splashed unit's
 * damage, all from the public combat preview.
 */
function drawSplashPreviewV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  plan: BoardRenderPlanV7,
  focus: CoordV7 | null,
  placer: PreviewLabelPlacerV7,
  defer: (draw: () => void) => void,
  paintLater?: (paint: () => void) => void,
): void {
  const splashTargets = plan.targets.filter(
    (target) => target.family === "ATTACK" && target.splash !== undefined,
  );
  const target =
    (focus === null
      ? undefined
      : splashTargets.find((candidate) => same(candidate.at, focus))) ??
    (splashTargets.length === 1 ? splashTargets[0] : undefined);
  if (target?.splash === undefined) return;
  const x = (at: CoordV7): number =>
    camera.offsetX + at.x * TILE_WIDTH * camera.zoom;
  const y = (at: CoordV7): number =>
    camera.offsetY + at.y * TILE_HEIGHT * camera.zoom;
  const explored = new Set(
    plan.entries
      .filter((entry) => entry.kind === "TERRAIN")
      .map((entry) => coordKey(entry.at)),
  );
  context.save();
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const at = { x: target.at.x + dx, y: target.at.y + dy };
      if (explored.has(coordKey(at)))
        drawAbilityAreaCellV7(context, x(at), y(at), camera.zoom, "SPLASH");
    }
  context.restore();
  for (const item of target.splash)
    drawAbilityTargetV7(
      context,
      x(item.at),
      y(item.at),
      camera.zoom,
      item.friendly === true ? "BLAST_FRIENDLY" : "SPLASH",
      `${item.friendly === true ? "Yours " : ""}−${item.damage}${item.plagued === true ? " · Plague" : ""}`,
      item.dies,
      placer,
      defer,
      paintLater,
    );
}

/**
 * The Martian revision: the focused (or only) Tractor Beam target's pull
 * destination, and the focused (or only) attack target's Pierce victim.
 */
function drawMartianFocusPreviewV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  plan: BoardRenderPlanV7,
  focus: CoordV7 | null,
  placer: PreviewLabelPlacerV7,
  defer: (draw: () => void) => void,
): void {
  const pick = <Target extends MapCommandTargetV7>(
    targets: readonly Target[],
  ): Target | undefined =>
    (focus === null
      ? undefined
      : targets.find((candidate) => same(candidate.at, focus))) ??
    (targets.length === 1 ? targets[0] : undefined);
  const x = (at: CoordV7): number =>
    camera.offsetX + at.x * TILE_WIDTH * camera.zoom;
  const y = (at: CoordV7): number =>
    camera.offsetY + at.y * TILE_HEIGHT * camera.zoom;
  const pull = pick(
    plan.targets.filter((target) => target.pullTo !== undefined),
  );
  if (pull?.pullTo !== undefined) {
    const to = pull.pullTo;
    context.save();
    drawAbilityAreaCellV7(context, x(to), y(to), camera.zoom, "PULL");
    context.strokeStyle = abilityAreaStrokeV7("PULL");
    context.lineWidth = 3 * camera.zoom;
    context.setLineDash([6 * camera.zoom, 4 * camera.zoom]);
    for (const edge of TILE_EDGES) strokeTileEdge(context, camera, to, edge);
    // An arrow from the target toward its destination.
    context.setLineDash([]);
    context.lineWidth = 4 * camera.zoom;
    context.lineCap = "round";
    const fromX = x(pull.at);
    const fromY = y(pull.at);
    const toX = x(to);
    const toY = y(to);
    const length = Math.hypot(toX - fromX, toY - fromY) || 1;
    const ux = (toX - fromX) / length;
    const uy = (toY - fromY) / length;
    const tipX = toX - ux * 24 * camera.zoom;
    const tipY = toY - uy * 24 * camera.zoom;
    context.beginPath();
    context.moveTo(
      fromX + ux * 30 * camera.zoom,
      fromY + uy * 30 * camera.zoom,
    );
    context.lineTo(tipX, tipY);
    context.moveTo(tipX, tipY);
    context.lineTo(
      tipX - ux * 14 * camera.zoom - uy * 10 * camera.zoom,
      tipY - uy * 14 * camera.zoom + ux * 10 * camera.zoom,
    );
    context.moveTo(tipX, tipY);
    context.lineTo(
      tipX - ux * 14 * camera.zoom + uy * 10 * camera.zoom,
      tipY - uy * 14 * camera.zoom - ux * 10 * camera.zoom,
    );
    context.stroke();
    context.restore();
  }
  const pierce = pick(
    plan.targets.filter(
      (target) => target.family === "ATTACK" && target.pierce !== undefined,
    ),
  )?.pierce;
  if (pierce !== undefined)
    drawAbilityTargetV7(
      context,
      x(pierce.at),
      y(pierce.at),
      camera.zoom,
      pierce.friendly ? "BLAST_FRIENDLY" : "PIERCE",
      pierce.label,
      pierce.lethal,
      placer,
      defer,
    );
}

/**
 * The Ice Folk revision: the focused (or only) attack target's Sweep flank
 * victims, each with its damage.
 */
function drawIceFolkFocusPreviewV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  plan: BoardRenderPlanV7,
  focus: CoordV7 | null,
  placer: PreviewLabelPlacerV7,
  defer: (draw: () => void) => void,
): void {
  const sweeping = plan.targets.filter(
    (target) => target.family === "ATTACK" && target.sweep !== undefined,
  );
  const target =
    (focus === null
      ? undefined
      : sweeping.find((candidate) => same(candidate.at, focus))) ??
    (sweeping.length === 1 ? sweeping[0] : undefined);
  for (const victim of target?.sweep ?? [])
    drawAbilityTargetV7(
      context,
      camera.offsetX + victim.at.x * TILE_WIDTH * camera.zoom,
      camera.offsetY + victim.at.y * TILE_HEIGHT * camera.zoom,
      camera.zoom,
      "SWEEP",
      victim.label,
      victim.lethal,
      placer,
      defer,
    );
}

/**
 * The Dwarf revision: the focused (or only) attack target's Knockback
 * destination (an arrow to it, or a cross when the push is blocked), and the
 * focused Tunnel destination's eruption forecast (the ring, each visible
 * hostile unit on the ground "if they stay", and the Field Defense it will
 * undermine).
 */
function drawDwarfFocusPreviewV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  plan: BoardRenderPlanV7,
  focus: CoordV7 | null,
  placer: PreviewLabelPlacerV7,
  defer: (draw: () => void) => void,
): void {
  const pick = <Target extends MapCommandTargetV7>(
    targets: readonly Target[],
  ): Target | undefined =>
    (focus === null
      ? undefined
      : targets.find((candidate) => same(candidate.at, focus))) ??
    (targets.length === 1 ? targets[0] : undefined);
  const x = (at: CoordV7): number =>
    camera.offsetX + at.x * TILE_WIDTH * camera.zoom;
  const y = (at: CoordV7): number =>
    camera.offsetY + at.y * TILE_HEIGHT * camera.zoom;
  const knock = pick(
    plan.targets.filter(
      (target) => target.family === "ATTACK" && target.knockback !== undefined,
    ),
  );
  if (knock?.knockback !== undefined) {
    const to = knock.knockback.to;
    const blocked = knock.knockback.blocked;
    context.save();
    context.strokeStyle = abilityAreaStrokeV7(blocked ? "BOMBED" : "TUNNEL");
    context.lineCap = "round";
    if (!blocked) {
      drawAbilityAreaCellV7(context, x(to), y(to), camera.zoom, "TUNNEL");
      context.lineWidth = 3 * camera.zoom;
      context.setLineDash([6 * camera.zoom, 4 * camera.zoom]);
      for (const edge of TILE_EDGES) strokeTileEdge(context, camera, to, edge);
      context.setLineDash([]);
    }
    // A short arrow from the target toward where it is knocked.
    context.lineWidth = 4 * camera.zoom;
    const fromX = x(knock.at);
    const fromY = y(knock.at);
    const length = Math.hypot(x(to) - fromX, y(to) - fromY) || 1;
    const ux = (x(to) - fromX) / length;
    const uy = (y(to) - fromY) / length;
    const reach = blocked ? 52 * camera.zoom : length - 24 * camera.zoom;
    const tipX = fromX + ux * Math.max(30 * camera.zoom, reach);
    const tipY = fromY + uy * Math.max(30 * camera.zoom, reach);
    context.beginPath();
    context.moveTo(
      fromX + ux * 30 * camera.zoom,
      fromY + uy * 30 * camera.zoom,
    );
    context.lineTo(tipX, tipY);
    if (blocked) {
      // A cross at the arrow's end: the push is blocked.
      const s = 8 * camera.zoom;
      context.moveTo(tipX - s, tipY - s);
      context.lineTo(tipX + s, tipY + s);
      context.moveTo(tipX + s, tipY - s);
      context.lineTo(tipX - s, tipY + s);
    } else {
      context.moveTo(tipX, tipY);
      context.lineTo(
        tipX - ux * 14 * camera.zoom - uy * 10 * camera.zoom,
        tipY - uy * 14 * camera.zoom + ux * 10 * camera.zoom,
      );
      context.moveTo(tipX, tipY);
      context.lineTo(
        tipX - ux * 14 * camera.zoom + uy * 10 * camera.zoom,
        tipY - uy * 14 * camera.zoom - ux * 10 * camera.zoom,
      );
    }
    context.stroke();
    context.restore();
  }
  const tunnel = pick(
    plan.targets.filter((target) => target.eruption !== undefined),
  );
  const eruption = tunnel?.eruption;
  if (eruption !== undefined) {
    drawEruptionRingV7(
      context,
      { x: x(eruption.at), y: y(eruption.at) },
      TILE_WIDTH * camera.zoom,
    );
    for (const at of eruption.undermines)
      drawAbilityAreaCellV7(context, x(at), y(at), camera.zoom, "ERUPTION");
    for (const target of eruption.targets)
      drawAbilityTargetV7(
        context,
        x(target.at),
        y(target.at),
        camera.zoom,
        "ERUPTION",
        target.label,
        target.lethal,
        placer,
        defer,
      );
  }
}

/**
 * Revision 17: the death-blast chain of the focused attack target (or of
 * the only attack target with one): blast areas and hit labels.
 */
function drawAttackBlastPreviewV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  plan: BoardRenderPlanV7,
  focus: CoordV7 | null,
  placer: PreviewLabelPlacerV7,
  defer: (draw: () => void) => void,
  paintLater?: (paint: () => void) => void,
): void {
  const blastTargets = plan.targets.filter(
    (target) => target.family === "ATTACK" && target.blast !== undefined,
  );
  const target =
    (focus === null
      ? undefined
      : blastTargets.find((candidate) => same(candidate.at, focus))) ??
    (blastTargets.length === 1 ? blastTargets[0] : undefined);
  const blast = target?.blast;
  if (blast === undefined) return;
  const x = (at: CoordV7): number =>
    camera.offsetX + at.x * TILE_WIDTH * camera.zoom;
  const y = (at: CoordV7): number =>
    camera.offsetY + at.y * TILE_HEIGHT * camera.zoom;
  const area = new Set(blast.area.map(coordKey));
  context.save();
  context.strokeStyle = abilityAreaStrokeV7("BLAST");
  context.lineWidth = 3 * camera.zoom;
  context.setLineDash([6 * camera.zoom, 4 * camera.zoom]);
  for (const at of blast.area) {
    drawAbilityAreaCellV7(context, x(at), y(at), camera.zoom, "BLAST");
    for (const edge of TILE_EDGES)
      if (!area.has(coordKey(neighborAcross(at, edge))))
        strokeTileEdge(context, camera, at, edge);
  }
  context.restore();
  for (const cell of blast.cells)
    drawAbilityTargetV7(
      context,
      x(cell.at),
      y(cell.at),
      camera.zoom,
      cell.friendly ? "BLAST_FRIENDLY" : "BLAST",
      cell.label,
      cell.lethal,
      placer,
      defer,
      paintLater,
    );
}

function strokeTileEdge(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  at: CoordV7,
  edge: TileEdge,
): void {
  const x = camera.offsetX + at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + at.y * TILE_HEIGHT * camera.zoom;
  const half = (TILE_WIDTH * camera.zoom) / 2;
  const endpoints: Readonly<
    Record<TileEdge, readonly [number, number, number, number]>
  > = {
    NORTH: [x - half, y - half, x + half, y - half],
    EAST: [x + half, y - half, x + half, y + half],
    SOUTH: [x + half, y + half, x - half, y + half],
    WEST: [x - half, y + half, x - half, y - half],
  };
  const [fromX, fromY, toX, toY] = endpoints[edge];
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
}

function drawTerritoryBoundary(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entry: BoardRenderPlanEntryV7,
  roadCells: ReadonlySet<string>,
): void {
  if (entry.edge === undefined) return;
  context.save();
  const zoom = camera.zoom;
  const selected = entry.boundaryStyle === "CITY";
  const [dx, dy] =
    entry.edge === "NORTH"
      ? [0, -1]
      : entry.edge === "SOUTH"
        ? [0, 1]
        : entry.edge === "WEST"
          ? [-1, 0]
          : [1, 0];
  if (
    roadCells.has(`${entry.at.x},${entry.at.y}`) &&
    roadCells.has(`${entry.at.x + dx},${entry.at.y + dy}`)
  ) {
    // Two public Road cells leave a small crossing through the contour.
    const x = camera.offsetX + (entry.at.x + dx / 2) * TILE_WIDTH * zoom;
    const y = camera.offsetY + (entry.at.y + dy / 2) * TILE_HEIGHT * zoom;
    const size = TILE_WIDTH * zoom;
    context.beginPath();
    context.rect(x - size, y - size, size * 2, size * 2);
    context.rect(x - 12 * zoom, y - 12 * zoom, 24 * zoom, 24 * zoom);
    context.clip("evenodd");
  }
  context.lineCap = "butt";
  const shared = entry.counterpartOwnerColor !== undefined;
  context.setLineDash(
    selected && !shared
      ? []
      : shared
        ? [12 * zoom, 4 * zoom]
        : [20 * zoom, 12 * zoom],
  );
  // Four periods per square side, with gaps at corners and Road midpoints.
  context.lineDashOffset = selected && !shared ? 0 : -6 * zoom;
  context.strokeStyle = "#243633";
  context.lineWidth = (selected ? 9 : 8) * zoom;
  strokeTileEdge(context, camera, entry.at, entry.edge);
  context.strokeStyle = entry.ownerColor ?? "#fff6b0";
  context.lineWidth = (selected ? 5 : 4) * zoom;
  if (shared) context.setLineDash([12 * zoom, 20 * zoom]);
  strokeTileEdge(context, camera, entry.at, entry.edge);
  if (entry.counterpartOwnerColor !== undefined) {
    context.strokeStyle = entry.counterpartOwnerColor;
    context.lineDashOffset = -22 * zoom;
    strokeTileEdge(context, camera, entry.at, entry.edge);
  }
  context.restore();
}

function drawPublicLink(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entry: BoardRenderPlanEntryV7,
): void {
  if (entry.linkTo === undefined) return;
  const x = camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
  const toX = camera.offsetX + entry.linkTo.x * TILE_WIDTH * camera.zoom;
  const toY = camera.offsetY + entry.linkTo.y * TILE_HEIGHT * camera.zoom;
  context.save();
  context.strokeStyle = entry.label === "ARMED" ? "#ffd34e" : "#71cfef";
  context.lineWidth = 3 * camera.zoom;
  context.setLineDash([7 * camera.zoom, 5 * camera.zoom]);
  context.beginPath();
  context.moveTo(x, y - 22 * camera.zoom);
  context.lineTo(toX, toY - 22 * camera.zoom);
  context.stroke();
  context.restore();
}

function tacticalLinkExclusionRect(
  entry: BoardRenderPlanEntryV7,
  camera: CameraState,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} | null {
  const x = camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
  if (entry.kind === "STATUS") {
    const slot = entry.attachmentSlot ?? 0;
    const size = 26 * camera.zoom;
    return {
      x: x + (30 - slot * 24) * camera.zoom - size / 2,
      y: y - 39 * camera.zoom - size / 2,
      width: size,
      height: size,
    };
  }
  if (entry.kind !== "UNIT" && entry.kind !== "CITY") return null;
  const sprite = anchoredDestinationRect(
    { x, y },
    camera.zoom,
    geometryFor(entry),
  );
  const annotationLeft = x - 34 * camera.zoom;
  const annotationTop = y + 10 * camera.zoom;
  const annotationRight = x + 34 * camera.zoom;
  const annotationBottom = y + 36 * camera.zoom;
  const padding = 3 * camera.zoom;
  const left = Math.min(sprite.x, annotationLeft) - padding;
  const top = Math.min(sprite.y, annotationTop) - padding;
  const right = Math.max(sprite.x + sprite.width, annotationRight) + padding;
  const bottom = Math.max(sprite.y + sprite.height, annotationBottom) + padding;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function createBoardImageResolverV7(
  documentRoot: Document,
  redraw: () => void,
): BoardImageResolverV7 {
  const cache = new Map<string, { image: HTMLImageElement; ready: boolean }>();
  const raisedCache = new Map<
    string,
    {
      readonly source: CanvasImageSource;
      readonly ground: CanvasImageSource;
      readonly image: CanvasImageSource;
    }
  >();
  const resolve = (assetId: string): CanvasImageSource | null => {
    const source = ACCEPTED_ART_URLS[assetId];
    if (source === undefined) return null;
    let record = cache.get(assetId);
    if (record === undefined) {
      const image = documentRoot.createElement("img");
      record = { image, ready: false };
      cache.set(assetId, record);
      image.addEventListener("load", () => {
        const current = cache.get(assetId);
        if (current !== undefined) current.ready = true;
        redraw();
      });
      image.src = source;
    }
    return record.ready ? record.image : null;
  };
  return {
    resolve,
    resolveTerrainGround(assetId) {
      const groundId = tallTerrainGroundArtId(assetId);
      return groundId === null ? null : resolve(groundId);
    },
    resolveRaisedTerrain(assetId) {
      const groundId = tallTerrainGroundArtId(assetId);
      if (groundId === null) return null;
      const source = resolve(assetId);
      const ground = resolve(groundId);
      if (source === null || ground === null) return null;
      const cached = raisedCache.get(assetId);
      if (cached?.source === source && cached.ground === ground)
        return cached.image;
      const image = isolateTallTerrainForegroundV7(
        documentRoot,
        source,
        ground,
      );
      // A missing/tainted 2D context is retryable; never cache that fallback.
      if (image === null) return null;
      raisedCache.set(assetId, { source, ground, image });
      return image;
    },
  };
}

function tallTerrainGroundArtId(assetId: string): string | null {
  if (assetId.startsWith("terrain-ruleset7-original-forest-"))
    return "terrain-ruleset7-original-grass-1";
  if (assetId.includes("mountain")) return "terrain-ruleset7-revision3-gravel";
  return null;
}

/**
 * Reuses the checked-in tall-terrain derivation: pixels that differ from the
 * accepted owning-square ground form the raised body, while enclosed flat
 * body colors are restored after border flood fill. The result is cached by
 * the resolver and never read back per frame.
 */
function isolateTallTerrainForegroundV7(
  documentRoot: Document,
  source: CanvasImageSource,
  ground: CanvasImageSource,
): CanvasImageSource | null {
  const width = 256;
  const height = 384;
  const footprintTop = 128;
  try {
    const output = documentRoot.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d", { willReadFrequently: true });
    const groundCanvas = documentRoot.createElement("canvas");
    groundCanvas.width = width;
    groundCanvas.height = height - footprintTop;
    const groundContext = groundCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (context === null || groundContext === null) return null;
    context.clearRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    groundContext.drawImage(ground, 0, 0, width, height - footprintTop);
    const body = context.getImageData(0, 0, width, height);
    const groundPixels = groundContext.getImageData(
      0,
      0,
      width,
      height - footprintTop,
    ).data;
    const originalAlpha = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const pixel = y * width + x;
        const offset = pixel * 4;
        const sourceAlpha = body.data[offset + 3] ?? 0;
        originalAlpha[pixel] = sourceAlpha;
        if (y < footprintTop) continue;
        const groundOffset = ((y - footprintTop) * width + x) * 4;
        const difference = Math.max(
          Math.abs(
            (body.data[offset] ?? 0) - (groundPixels[groundOffset] ?? 0),
          ),
          Math.abs(
            (body.data[offset + 1] ?? 0) -
              (groundPixels[groundOffset + 1] ?? 0),
          ),
          Math.abs(
            (body.data[offset + 2] ?? 0) -
              (groundPixels[groundOffset + 2] ?? 0),
          ),
        );
        // The accepted composite already contains the exact antialiased edge
        // color. A binary mask restores that pixel verbatim above Roads and
        // exactly reconstructs the source above its registered square ground.
        body.data[offset + 3] = difference === 0 ? 0 : sourceAlpha;
      }
    fillEnclosedTallTerrainBodyV7(body.data, originalAlpha, width, height);
    context.putImageData(body, 0, 0);
    return output;
  } catch {
    return null;
  }
}

function fillEnclosedTallTerrainBodyV7(
  body: Uint8ClampedArray,
  originalAlpha: Uint8Array,
  width: number,
  height: number,
): void {
  const reachable = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (x: number, y: number): void => {
    const pixel = y * width + x;
    if (reachable[pixel] !== 0 || (body[pixel * 4 + 3] ?? 0) !== 0) return;
    reachable[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  while (head < tail) {
    const pixel = queue[head] ?? 0;
    head += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }
  for (let pixel = 0; pixel < width * height; pixel += 1)
    if (reachable[pixel] === 0 && (originalAlpha[pixel] ?? 0) > 0)
      body[pixel * 4 + 3] = originalAlpha[pixel] ?? 0;
}

/**
 * Revision 13 ability previews for the selected own unit, from the exact
 * public previews: the Wail radius with per-target damage, the Graves that
 * Raise Dead raises, and the Devour heal. Nothing is added unless the
 * command is offered, so Human-only matches never reach this output.
 */
function addAbilityPreviews(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number,
): void {
  const unitId = view.units.find((unit) => unit.id === selectedUnitId)?.id;
  if (unitId === undefined) return;
  const offered = (kind: CommandV7["kind"]): boolean =>
    commands.some(
      (command) =>
        command.kind === kind &&
        "unitId" in command &&
        command.unitId === unitId,
    );
  if (offered("WAIL")) {
    const preview = previewWailV7(view, unitId);
    if (preview !== null) {
      const area = new Set<string>();
      for (let dy = -WAIL_RADIUS_V7; dy <= WAIL_RADIUS_V7; dy += 1)
        for (let dx = -WAIL_RADIUS_V7; dx <= WAIL_RADIUS_V7; dx += 1) {
          const at = { x: preview.at.x + dx, y: preview.at.y + dy };
          if (
            at.x < 0 ||
            at.y < 0 ||
            at.x >= view.board.width ||
            at.y >= view.board.height ||
            view.board.tiles[at.y * view.board.width + at.x]?.explored !== true
          )
            continue;
          area.add(coordKey(at));
        }
      for (const key of [...area].sort()) {
        const [x = 0, y = 0] = key.split(",").map(Number);
        const at = { x, y };
        entries.push({
          key: `ability-area:WAIL:${key}`,
          kind: "ABILITY_AREA",
          layer: 7,
          at,
          abilityStyle: "WAIL",
          targetEdges: TILE_EDGES.filter(
            (edge) => !area.has(coordKey(neighborAcross(at, edge))),
          ),
        });
      }
      for (const target of preview.targets)
        entries.push({
          key: `ability-target:WAIL:${target.unitId}`,
          kind: "ABILITY_TARGET",
          layer: 7.5,
          at: target.at,
          abilityStyle: "WAIL",
          label: target.bittenRises
            ? `−${target.damage} · Rises`
            : `−${target.damage}`,
          lethal: target.dies,
        });
    }
  }
  if (offered("RAISE_DEAD")) {
    const preview = previewRaiseDeadV7(view, unitId);
    for (const at of preview?.graves ?? [])
      entries.push({
        key: `ability-target:RAISE:${at.x},${at.y}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at,
        abilityStyle: "RAISE",
        label: "Rise",
      });
  }
  // Revision 14: Tend Wounded heals and cures, shown in Undead matches only
  // (a Human-only match keeps its revision-12 board).
  // The Dwarf revision: an Engineer's Repair shows its targets too (+4 on
  // machines, +2 on the others).
  if (
    offered("TEND_WOUNDED") &&
    (matchHasUndeadV7(view) || dwarfEngineerSelectedV7(view, unitId))
  ) {
    const preview = previewTendWoundedV7(view, unitId);
    for (const result of preview?.results ?? []) {
      const target = view.units.find((unit) => unit.id === result.unitId);
      if (target === undefined) continue;
      entries.push({
        key: `ability-target:TEND:${result.unitId}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: target.at,
        abilityStyle: "TEND",
        label: tendTargetLabelV7(result),
      });
    }
  }
  // Revision 19: adjacent own Eggs laid this turn cannot be hatched yet.
  for (const egg of commands.length === 0
    ? []
    : hatchBlockedEggsV7(view, unitId))
    entries.push({
      key: `ability-target:HATCH_BLOCKED:${egg.id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: egg.at,
      abilityStyle: "HATCH_BLOCKED",
      label: "Next turn",
    });
  if (offered("DEVOUR")) {
    const preview = previewDevourV7(view, unitId);
    if (preview !== null)
      entries.push({
        key: `ability-target:DEVOUR:${preview.at.x},${preview.at.y}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: preview.at,
        abilityStyle: "DEVOUR",
        label: `+${preview.amount} HP`,
      });
  }
}

/**
 * Revision 17 Kaboom preview from the public `previewKaboomV7`: every blast
 * area of the chain, and one label per hit cell (damage, friendly fire,
 * chain waves). Nothing is added unless Kaboom is offered for the unit.
 */
function addKaboomPreview(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  previewUnitId: number,
): void {
  const unitId = view.units.find((unit) => unit.id === previewUnitId)?.id;
  if (
    unitId === undefined ||
    !commands.some(
      (command) => command.kind === "KABOOM" && command.unitId === unitId,
    )
  )
    return;
  const preview = previewKaboomV7(view, unitId);
  if (preview === null) return;
  const blast = blastPreviewPresentationV7(view, preview, unitId);
  const area = new Set(blast.area.map(coordKey));
  for (const at of blast.area)
    entries.push({
      key: `ability-area:BLAST:${coordKey(at)}`,
      kind: "ABILITY_AREA",
      layer: 7,
      at,
      abilityStyle: "BLAST",
      targetEdges: TILE_EDGES.filter(
        (edge) => !area.has(coordKey(neighborAcross(at, edge))),
      ),
    });
  for (const cell of blast.cells)
    entries.push({
      key: `ability-target:BLAST:${coordKey(cell.at)}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: cell.at,
      abilityStyle: cell.friendly ? "BLAST_FRIENDLY" : "BLAST",
      label: cell.label,
      lethal: cell.lethal,
    });
}

function neighborAcross(at: CoordV7, edge: TileEdge): CoordV7 {
  if (edge === "NORTH") return { x: at.x, y: at.y - 1 };
  if (edge === "SOUTH") return { x: at.x, y: at.y + 1 };
  if (edge === "WEST") return { x: at.x - 1, y: at.y };
  return { x: at.x + 1, y: at.y };
}

function mapTargets(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number | null,
): MapCommandTargetV7[] {
  return [
    ...commandMapTargets(view, commands, selectedUnitId),
    ...landingAfterMoveTargets(view, commands, selectedUnitId),
  ];
}

/** Revision 19: the legal nest tiles of the Egg being laid. */
function layEggTargets(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: { readonly cityId: number; readonly role: UnitRoleIdV7 },
): MapCommandTargetV7[] {
  const label = unitRoleRuleV7(view, {
    ownerId: view.viewer.id,
    role: pick.role,
  }).label;
  return commands.flatMap((command): readonly MapCommandTargetV7[] =>
    command.kind === "LAY_EGG" &&
    command.cityId === pick.cityId &&
    command.role === pick.role
      ? [
          {
            at: command.at,
            command,
            family: "LAY_EGG",
            semanticLabel: `Nest tile: lay the ${label} Egg here. ${LAY_EGG_PROMPT_V7}.`,
          },
        ]
      : [],
  );
}

/** Revision 16: cells reached by one water step, then `DISEMBARK`. */
function landingAfterMoveTargets(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number | null,
): MapCommandTargetV7[] {
  const unit = view.units.find((candidate) => candidate.id === selectedUnitId);
  if (unit === undefined) return [];
  const preview = queryLandingPreviewV7(view, unit.id, commands);
  if (preview === null) return [];
  return preview.afterMove.map((landing) => {
    const via = landing.move.path[0] as CoordV7;
    return {
      at: landing.at,
      command: landing.move,
      followUp: landing.disembark,
      family: "LANDING_AFTER_MOVE",
      previewLabel: LANDING_AFTER_MOVE_LABEL_V7,
      semanticLabel: `Landing after one water step: moves to ${via.x}, ${via.y}, then lands here. Landing ends this unit's activation; capture is available after the ordinary wait.`,
    };
  });
}

function commandMapTargets(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number | null,
): MapCommandTargetV7[] {
  const undeadMatch = matchHasUndeadV7(view);
  const goblinMatch = matchHasGoblinV7(view);
  const dinosaurMatch = matchHasDinosaurV7(view);
  const martianMatch = matchHasMartianV7(view);
  const iceFolkMatch = matchHasIceFolkSeatV7(view);
  const dwarfMatch = matchHasDwarfSeatV7(view);
  return commands.flatMap((command): readonly MapCommandTargetV7[] => {
    if (selectedUnitId === null) return [];
    // Revision 19: an adjacent own Egg the selected Shaman may hatch.
    if (command.kind === "HATCH" && command.unitId === selectedUnitId) {
      const preview = previewHatchV7(view, command.unitId, command.eggUnitId);
      if (preview === null) return [];
      const label = unitRoleRuleV7(view, {
        ownerId: view.viewer.id,
        role: preview.role,
      }).label;
      return [
        {
          at: preview.at,
          command,
          family: "HATCH",
          previewLabel: `Hatch ${label}`,
          previewNote: "Cannot act this turn",
          semanticLabel: `Hatch: a ${label} with ${preview.hp} HP appears here now, ${turnsTextV7(preview.turnsSaved)} early. It cannot act this turn.`,
        },
      ];
    }
    if (command.kind === "MOVE" && command.unitId === selectedUnitId) {
      const at = command.path.at(-1);
      // The Martian revision: a machine's Move onto water self-launches.
      const launch = martianMatch ? martianMoveLabelV7(view, command) : null;
      return at === undefined
        ? []
        : [
            {
              at,
              command,
              family: "MOVE",
              // No label box per water tile: a dotted pale outline, named
              // by the dock's legend and the cursor description.
              ...(launch === null
                ? {}
                : {
                    launch: true as const,
                    semanticLabel: `${launch}. Ends this unit's turn afloat.`,
                  }),
            },
          ];
    }
    if (command.kind === "ATTACK" && command.unitId === selectedUnitId) {
      const target = view.units.find(
        (unit) => unit.id === command.targetUnitId,
      );
      if (target === undefined) return [];
      const preview = queryCombatPreviewV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      const undeadNote =
        undeadMatch && preview !== null ? combatPreviewNoteV7(preview) : null;
      const undeadSemanticNote =
        undeadMatch && preview !== null
          ? combatPreviewSemanticNoteV7(preview, view)
          : null;
      // Revision 17 (Goblin matches only): Gang Up, the death blasts the
      // attack sets off, and friendly bomb splash.
      const chain =
        goblinMatch && preview !== null
          ? previewAttackExplosionsV7(
              view,
              command.unitId,
              command.targetUnitId,
            )
          : null;
      const goblin =
        goblinMatch && preview !== null
          ? goblinAttackPreviewTextV7(view, preview, chain)
          : null;
      const attacker = view.units.find((unit) => unit.id === command.unitId);
      const friendlySplash =
        preview === null || attacker === undefined || !goblinMatch
          ? new Set<number>()
          : new Set(
              preview.splash
                .filter((item) =>
                  splashEntryFriendlyV7(view, attacker.ownerId, item.unitId),
                )
                .map((item) => item.unitId),
            );
      // Revision 19 (Dinosaur matches only): Acid and Armoured; revision
      // 20: the Charge! run-up, ignored fortification, Push and follow.
      const dinosaurNote =
        dinosaurMatch && preview !== null
          ? dinosaurCombatNoteV7(preview, view)
          : null;
      // The Martian revision (Martian matches only): the Shield absorbed on
      // either side, ray power and Cooling, the Disintegrator, and Pierce.
      const martian = martianMatch
        ? martianAttackTargetExtrasV7(view, preview)
        : null;
      // The Ice Folk revision (Ice Folk matches only): Shatter, Chilled,
      // Sweep, Trample, Boulders, Rockfall, Planted, Cold Blood, Snow cover,
      // the Blizzard and the hidden-Blizzard caveat.
      const iceFolk = iceFolkMatch
        ? iceFolkAttackTargetExtrasV7(view, preview)
        : null;
      // The Dwarf revision (Dwarf matches only): Dug in, Clockwork,
      // Plated, Blasting Charges, the Gunner's shots and Knockback.
      const dwarf = dwarfMatch
        ? dwarfAttackTargetExtrasV7(view, preview)
        : null;
      const noteParts = [
        undeadNote,
        goblin?.gangUp ?? null,
        dinosaurNote,
        ...(martian?.notes ?? []),
        ...(iceFolk?.notes ?? []),
        ...(dwarf?.notes ?? []),
      ].filter((part): part is string => part !== null);
      const note = noteParts.length === 0 ? null : noteParts.join(" · ");
      const semanticParts = [
        undeadSemanticNote,
        goblin?.semantic ?? null,
        dinosaurMatch && preview !== null
          ? dinosaurCombatSemanticNoteV7(preview, view)
          : null,
      ].filter((part): part is string => part !== null);
      const semanticNote =
        semanticParts.length === 0 ? null : semanticParts.join(" ");
      const allWarnings = [
        ...(goblin?.warnings ?? []),
        ...(martian?.warnings ?? []),
      ];
      const warnings = allWarnings.length === 0 ? null : allWarnings;
      const blast =
        chain !== null && chain.explosions.length > 0
          ? blastPreviewPresentationV7(view, chain, null, command.unitId)
          : null;
      const splashSentence =
        preview === null || preview.splash.length === 0
          ? ""
          : friendlySplash.size > 0
            ? ` Splash affects ${preview.splash.length} adjacent ${preview.splash.length === 1 ? "unit" : "units"} (${friendlySplash.size} yours) for ${preview.splash.map((item) => `${item.damage}${item.dies ? " lethal" : ""}`).join(", ")}.`
            : ` Splash affects ${preview.splash.length} adjacent hostile units for ${preview.splash.map((item) => `${item.damage}${item.dies ? " lethal" : ""}`).join(", ")}.`;
      return [
        {
          at: target.at,
          command,
          family: "ATTACK",
          previewLabel:
            preview === null
              ? "Damage uncertain"
              : // The Ice Folk revision: "Shatters" in place of the damage
                // and retaliation lines; a Sweep's flank hits are "sweep".
                iceFolk?.shatters === true
                ? `${SHATTERS_PREVIEW_V7}${iceFolk.sweep === undefined ? "" : ` · sweep ${iceFolk.sweep.length}`}`
                : iceFolk?.sweep !== undefined
                  ? `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker} · sweep ${iceFolk.sweep.length}`
                  : // The Martian revision: a Tripod's second hit is "pierce".
                    `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker}${martian?.pierce !== undefined ? ` · pierce ${preview.splash[0]?.damage ?? 0}` : preview.splash.length > 0 ? ` · splash ${preview.splash.reduce((sum, item) => sum + item.damage, 0)} to ${preview.splash.length}` : ""}`,
          ...(preview === null
            ? {}
            : {
                semanticLabel: `Attack preview. Defender fortification level ${preview.fortificationLevel}. Primary damage ${preview.damageToDefender}.${martian?.pierce === undefined && iceFolk?.sweep === undefined ? splashSentence : martian?.pierce === undefined ? "" : ` ${martian.pierce.note}.`}${semanticNote === null ? "" : ` ${semanticNote}`}${martian === null || martian.notes.length + martian.shooter.length === 0 ? "" : ` ${[...martian.notes, ...martian.shooter].join(". ")}.`}${iceFolk === null || iceFolk.semantic === null ? "" : ` ${iceFolk.semantic}`}${dwarf === null || dwarf.semantic === null ? "" : ` ${dwarf.semantic}`}`,
              }),
          ...(note === null ? {} : { previewNote: note }),
          // The Dwarf revision: the Gunner's and a construct's shooter
          // lines likewise.
          ...([...(martian?.shooter ?? []), ...(dwarf?.shooter ?? [])]
            .length === 0
            ? {}
            : {
                previewFocusNote: [
                  ...(martian?.shooter ?? []),
                  ...(dwarf?.shooter ?? []),
                ].join(" · "),
              }),
          ...(warnings === null ? {} : { previewWarnings: warnings }),
          ...(warnings === null || goblin === null || goblin.summary === null
            ? {}
            : { previewWarningSummary: goblin.summary }),
          ...(blast === null ? {} : { blast }),
          ...(martian?.pierce === undefined ? {} : { pierce: martian.pierce }),
          ...(iceFolk?.sweep === undefined ? {} : { sweep: iceFolk.sweep }),
          ...(dwarf?.knockback === undefined
            ? {}
            : { knockback: dwarf.knockback }),
          ...((undeadMatch || goblinMatch) &&
          martian?.pierce === undefined &&
          iceFolk?.sweep === undefined &&
          preview !== null &&
          preview.splash.length > 0
            ? {
                splash: preview.splash.map((item) => ({
                  at: item.at,
                  damage: item.damage,
                  dies: item.dies,
                  ...(preview.plagued.includes(item.unitId)
                    ? { plagued: true }
                    : {}),
                  ...(friendlySplash.has(item.unitId)
                    ? { friendly: true }
                    : {}),
                })),
              }
            : {}),
        },
      ];
    }
    if (command.kind === "DISEMBARK" && command.unitId === selectedUnitId)
      return [
        {
          at: command.at,
          command,
          family: "DISEMBARK",
          previewLabel: LANDING_NOW_LABEL_V7,
          semanticLabel:
            "Legal landing tile: land now. Landing ends this unit's activation; capture is available after the ordinary wait.",
        },
      ];
    return [];
  });
}

function dedupeMapTargets(
  targets: readonly MapCommandTargetV7[],
): MapCommandTargetV7[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.family}:${target.at.x},${target.at.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function drawTacticalSymbolOnCanvas(
  context: CanvasRenderingContext2D,
  statusId: string | undefined,
  left: number,
  top: number,
  size: number,
  highContrast: boolean,
  /** Percent; only the Field Defense symbol passes less than 100. */
  saturation = 100,
): void {
  if (
    statusId === undefined ||
    !(statusId in RULESET7_TACTICAL_UI_SYMBOL_BY_ID)
  )
    return;
  const id = statusId as keyof typeof RULESET7_TACTICAL_UI_SYMBOL_BY_ID;
  const definition = RULESET7_TACTICAL_UI_SYMBOL_BY_ID[id];
  const baseTones = highContrast
    ? {
        ink: "#ffffff",
        paper: "#000000",
        slate: "#000000",
        bronze: "#ffffff",
        coral: "#ffffff",
      }
    : {
        ink: "#f8f2df",
        paper: "#6f5a34",
        slate: "#31565e",
        bronze: "#755020",
        coral: "#7b3836",
      };
  const tones =
    saturation === 100
      ? baseTones
      : {
          ink: desaturateHexColourV7(baseTones.ink, saturation),
          paper: desaturateHexColourV7(baseTones.paper, saturation),
          slate: desaturateHexColourV7(baseTones.slate, saturation),
          bronze: desaturateHexColourV7(baseTones.bronze, saturation),
          coral: desaturateHexColourV7(baseTones.coral, saturation),
        };
  const scale = size / 24;
  const point = (value: number): number => value * scale;
  context.save();
  context.translate(left, top);
  for (const primitive of definition.primitives) {
    const stroke = highContrast
      ? "#ffffff"
      : tones[primitive.kind === "line" ? primitive.tone : primitive.stroke];
    context.strokeStyle = stroke;
    context.lineWidth = point(
      primitive.kind === "line" ? primitive.width : 1.5,
    );
    context.lineCap = "round";
    context.lineJoin = "round";
    if (primitive.kind === "line") {
      context.beginPath();
      context.moveTo(point(primitive.x1), point(primitive.y1));
      context.lineTo(point(primitive.x2), point(primitive.y2));
      context.stroke();
    } else if (primitive.kind === "circle") {
      context.fillStyle = tones[primitive.fill];
      context.beginPath();
      context.arc(
        point(primitive.cx),
        point(primitive.cy),
        point(primitive.radius),
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    } else if (primitive.kind === "rect") {
      context.fillStyle = tones[primitive.fill];
      context.beginPath();
      context.roundRect(
        point(primitive.x),
        point(primitive.y),
        point(primitive.width),
        point(primitive.height),
        point(primitive.radius),
      );
      context.fill();
      context.stroke();
    } else {
      const first = primitive.points[0];
      if (first === undefined) continue;
      context.fillStyle = tones[primitive.fill];
      context.beginPath();
      context.moveTo(point(first[0]), point(first[1]));
      for (const [x, y] of primitive.points.slice(1))
        context.lineTo(point(x), point(y));
      context.closePath();
      context.fill();
      context.stroke();
    }
  }
  context.restore();
}

/**
 * A Mined Mountain below 100 percent building saturation: the master, the
 * body layer and their row slices become desaturated copies. The ground
 * tile layer is left alone, so the fringed ground and the ground under a
 * Road keep their colour. At 100 percent the resolution passes through.
 */
function chibiTerrainAtSaturationV7(
  chibi: ChibiResolutionV7 | null,
  percent: number,
  cache: SpriteSaturationCacheV7 | undefined,
): ChibiResolutionV7 | null {
  if (
    chibi === null ||
    chibi.kind !== "READY" ||
    percent === 100 ||
    cache === undefined
  )
    return chibi;
  const copy = (image: CanvasImageSource): CanvasImageSource =>
    cache.resolve(image, percent);
  const { layers, parts } = chibi;
  return {
    ...chibi,
    image: copy(chibi.image),
    ...(layers === undefined
      ? {}
      : { layers: { ground: layers.ground, body: copy(layers.body) } }),
    ...(parts === undefined
      ? {}
      : {
          parts: {
            cell: copy(parts.cell),
            overflow: copy(parts.overflow),
            ...(parts.bodyCell === undefined
              ? {}
              : { bodyCell: copy(parts.bodyCell) }),
          },
        }),
  };
}

function isTallTerrainEntry(entry: BoardRenderPlanEntryV7): boolean {
  return (
    entry.kind === "TERRAIN" &&
    entry.assetId !== undefined &&
    tallTerrainGroundArtId(entry.assetId) !== null
  );
}

function drawEntryImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  input: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly entry: BoardRenderPlanEntryV7;
    readonly sceneAlpha: number;
  },
): void {
  if (image === null) return;
  const rect = anchoredDestinationRect(
    { x: input.x, y: input.y },
    input.zoom,
    geometryFor(input.entry),
  );
  context.save();
  context.globalAlpha = input.sceneAlpha;
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

/**
 * Draws a chibi terrain raster in two row-ordered parts: the owning 80 x 80
 * cell during the ground pass (below Roads) and any upward overflow during
 * the foreground pass, after every entry of the rows behind it. Tall
 * terrain under a Road draws its ground tile (GROUND) into the owning cell
 * instead, and the body's owning cell (CELL of the body `image`) after
 * Roads.
 */
function drawChibiTerrainV7(
  context: CanvasRenderingContext2D,
  chibi: Extract<ChibiResolutionV7, { readonly kind: "READY" }>,
  input: {
    readonly centre: { readonly x: number; readonly y: number };
    readonly camera: CameraState;
    readonly devicePixelRatio: number;
    readonly sceneAlpha: number;
    readonly part: "CELL" | "OVERFLOW" | "GROUND";
    /** A layer drawn in place of the master (density 1). */
    readonly image?: CanvasImageSource;
  },
): void {
  const { asset } = chibi;
  const up = chibiOverflowV7(asset).up;
  const rows = input.part === "OVERFLOW" ? up : asset.height - up;
  if (rows <= 0) return;
  // Every edge lands on a whole device pixel from a shared boundary, so the
  // cell meets its overflow and its neighbours without a gap (pulp_wars-51t).
  const rect = chibiTerrainPartRect(
    input.centre,
    input.camera,
    asset,
    input.devicePixelRatio,
    input.part === "OVERFLOW" ? "OVERFLOW" : "CELL",
  );
  // At a smoothed scale the part is drawn from its own raster, so bilinear
  // filtering never blends in rows across the split.
  const part =
    input.part === "OVERFLOW"
      ? chibi.parts?.overflow
      : input.part === "CELL"
        ? input.image === undefined
          ? chibi.parts?.cell
          : input.image === chibi.layers?.body
            ? chibi.parts?.bodyCell
            : undefined
        : undefined;
  // The ground tile is only the owning cell, so it is read from its top.
  const sourceTop = input.part === "CELL" ? up : 0;
  const density = input.image === undefined ? chibi.density : 1;
  context.save();
  context.globalAlpha = input.sceneAlpha;
  context.imageSmoothingEnabled = chibi.smoothing;
  if (part !== undefined)
    context.drawImage(
      part,
      0,
      0,
      asset.width,
      rows,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
  else
    context.drawImage(
      input.image ?? chibi.image,
      0,
      sourceTop * density,
      asset.width * density,
      rows * density,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
  context.restore();
}

/**
 * The Ice Folk revision: the geometry of the 80 x 80 Snow overlay tile (a
 * centred terrain tile), so it lands on the cell's exact device pixels.
 */
const SNOW_OVERLAY_ASSET_V7: ChibiArtAssetV7 = {
  id: "ice-folk-snow-overlay",
  subject: "TERRAIN:GRASS",
  assetClass: "TERRAIN",
  width: 80,
  height: 80,
  url: "",
};

/**
 * The Ice Folk revision: the snow caps of a tall terrain body (its body
 * layer), drawn over the body's owning cell or its upward overflow, the
 * same parts as drawChibiTerrainV7.
 */
function drawChibiSnowCapsV7(
  context: CanvasRenderingContext2D,
  art: IceFolkBoardArtV7 | undefined,
  chibi: Extract<ChibiResolutionV7, { readonly kind: "READY" }>,
  body: CanvasImageSource,
  centre: { readonly x: number; readonly y: number },
  camera: CameraState,
  devicePixelRatio: number,
  part: "CELL" | "OVERFLOW",
  sceneAlpha: number,
): void {
  const { asset } = chibi;
  const up = chibiOverflowV7(asset).up;
  const rows = part === "OVERFLOW" ? up : asset.height - up;
  if (rows <= 0) return;
  drawSnowCapsV7(
    context,
    art,
    body,
    chibiTerrainPartRect(centre, camera, asset, devicePixelRatio, part),
    { x: 0, y: part === "OVERFLOW" ? 0 : up, width: asset.width, height: rows },
    sceneAlpha,
  );
}

function drawSquareTerrainGround(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  input: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly sceneAlpha: number;
  },
): void {
  if (image === null) return;
  const size = 128 * input.zoom;
  context.save();
  context.globalAlpha = input.sceneAlpha;
  context.drawImage(image, input.x - size / 2, input.y - size / 2, size, size);
  context.restore();
}

/**
 * If browser pixel readback is unavailable, preserve raised overflow without
 * repainting the opaque owning-square floor over Roads. The next successful
 * resolver call retries the complete cached body isolation.
 */
function drawTallTerrainOverflowFallback(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  input: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly sceneAlpha: number;
  },
): void {
  if (image === null) return;
  const width = 256 * 0.5 * input.zoom;
  const overflowHeight = 128 * 0.5 * input.zoom;
  context.save();
  context.globalAlpha = input.sceneAlpha;
  context.drawImage(
    image,
    0,
    0,
    256,
    128,
    input.x - width / 2,
    input.y - 2 * overflowHeight,
    width,
    overflowHeight,
  );
  context.restore();
}

function geometryFor(entry: BoardRenderPlanEntryV7): SourceGeometry {
  if (entry.kind === "TERRAIN")
    return entry.assetId?.includes("grass") || entry.assetId?.includes("water")
      ? SQUARE_ART_GEOMETRY.ground
      : SQUARE_ART_GEOMETRY.tallTerrain;
  if (entry.kind === "RESOURCE")
    return entry.assetId === RULESET7_RESOURCE_ART_IDS.FISH
      ? RULESET7_LOGISTICS_ART_GEOMETRY.fish
      : SQUARE_ART_GEOMETRY.resource;
  if (entry.kind === "ROAD") return SQUARE_ART_GEOMETRY.ground;
  if (entry.kind === "TREASURE") return SQUARE_ART_GEOMETRY.treasure;
  if (entry.kind === "SITE") return SETTLEMENT_ART_GEOMETRY.village;
  if (entry.kind === "CITY")
    return SETTLEMENT_ART_GEOMETRY.cities[cityArtLevel(entry.value ?? 1)];
  if (entry.kind === "UNIT") {
    if (entry.assetId === "unit-shared-embarked-transport")
      return RULESET7_NAVAL_ART_GEOMETRY.transport;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.PATROL_BOAT)
      return RULESET7_NAVAL_ART_GEOMETRY.patrolBoat;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.BATTLESHIP)
      return RULESET7_NAVAL_ART_GEOMETRY.battleship;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.CATAPULT)
      return RULESET6_UNIT_ART_GEOMETRY.siege;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.JUGGERNAUT)
      return RULESET6_UNIT_ART_GEOMETRY.giant;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.KNIGHT)
      return RULESET7_KNIGHT_ART_GEOMETRY;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.CAPTAIN)
      return RULESET7_CAPTAIN_ART_GEOMETRY;
    return RULESET6_UNIT_ART_GEOMETRY.standard;
  }
  if (entry.kind === "IMPROVEMENT") {
    if (
      entry.assetId === RULESET7_FARM_ART_IDS.SINGLE ||
      entry.assetId === RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR ||
      entry.assetId === RULESET7_FARM_ART_IDS.VERTICAL_PAIR
    )
      return SQUARE_ART_GEOMETRY.ground;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP)
      return SQUARE_ART_GEOMETRY.ruleset7LumberCamp;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.SAWMILL)
      return SQUARE_ART_GEOMETRY.sawmill;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.PORT)
      return RULESET7_LOGISTICS_ART_GEOMETRY.port;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.SHIPYARD)
      return SQUARE_ART_GEOMETRY.processor;
    if (
      ["WINDMILL", "FORGE", "WORKSHOP", "MARKET", "MONUMENT"].some(
        (name) =>
          entry.assetId ===
          RULESET7_IMPROVEMENT_ART_IDS[
            name as keyof typeof RULESET7_IMPROVEMENT_ART_IDS
          ],
      )
    )
      return SQUARE_ART_GEOMETRY.processor;
    return SQUARE_ART_GEOMETRY.lowImprovement;
  }
  return SQUARE_ART_GEOMETRY.ground;
}

export interface FarmPresentationV7 {
  readonly assetId: (typeof RULESET7_FARM_ART_IDS)[keyof typeof RULESET7_FARM_ART_IDS];
  readonly sourceCrop?: {
    readonly x: number;
    readonly y: number;
    readonly width: 256;
    readonly height: 256;
  };
  readonly partner?: CoordV7;
}

type RevealedTileV7 = Extract<
  PlayerViewV7["board"]["tiles"][number],
  { readonly explored: true }
>;

/**
 * Farms pair for presentation only. Revealed same-city Farms are scanned in
 * canonical (y,x) order; each takes the first still-free E, S, W, N neighbor.
 * Every pair is drawn as independently cropped cell halves so row depth, fog,
 * picking, selection and authoritative economy remain per tile.
 */
export function farmPresentationV7(
  view: PlayerViewV7,
): ReadonlyMap<string, FarmPresentationV7> {
  const farms = view.board.tiles
    .filter(
      (tile): tile is RevealedTileV7 =>
        tile.explored &&
        tile.improvement === "FARM" &&
        tile.territoryCityId !== null,
    )
    .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  const byCoord = new Map(farms.map((tile) => [coordKey(tile.at), tile]));
  const paired = new Set<string>();
  const result = new Map<string, FarmPresentationV7>();
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
  ] as const;
  for (const tile of farms) {
    const key = coordKey(tile.at);
    if (paired.has(key)) continue;
    const neighbor = directions
      .map(({ dx, dy }) => ({ x: tile.at.x + dx, y: tile.at.y + dy }))
      .map((at) => byCoord.get(coordKey(at)))
      .find(
        (candidate) =>
          candidate !== undefined &&
          candidate.territoryCityId === tile.territoryCityId &&
          !paired.has(coordKey(candidate.at)),
      );
    if (neighbor === undefined) {
      result.set(key, { assetId: RULESET7_FARM_ART_IDS.SINGLE });
      continue;
    }
    const neighborKey = coordKey(neighbor.at);
    paired.add(key);
    paired.add(neighborKey);
    if (tile.at.y === neighbor.at.y) {
      const left = tile.at.x < neighbor.at.x ? tile : neighbor;
      const right = left === tile ? neighbor : tile;
      result.set(coordKey(left.at), {
        assetId: RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR,
        sourceCrop: { x: 0, y: 0, width: 256, height: 256 },
        partner: right.at,
      });
      result.set(coordKey(right.at), {
        assetId: RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR,
        sourceCrop: { x: 256, y: 0, width: 256, height: 256 },
        partner: left.at,
      });
    } else {
      const top = tile.at.y < neighbor.at.y ? tile : neighbor;
      const bottom = top === tile ? neighbor : tile;
      result.set(coordKey(top.at), {
        assetId: RULESET7_FARM_ART_IDS.VERTICAL_PAIR,
        sourceCrop: { x: 0, y: 0, width: 256, height: 256 },
        partner: bottom.at,
      });
      result.set(coordKey(bottom.at), {
        assetId: RULESET7_FARM_ART_IDS.VERTICAL_PAIR,
        sourceCrop: { x: 0, y: 256, width: 256, height: 256 },
        partner: top.at,
      });
    }
  }
  return result;
}

function coordKey(at: CoordV7): string {
  return `${at.x},${at.y}`;
}

function roadNeighbors(
  at: CoordV7,
  roadKeys: ReadonlySet<string>,
): readonly CoordV7[] {
  const neighbors: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const candidate = { x: at.x + dx, y: at.y + dy };
      if (roadKeys.has(coordKey(candidate))) neighbors.push(candidate);
    }
  return neighbors;
}

/** Cell-clipped paths and corner joins keep Roads below each cell's artwork. */
function drawRoad(
  context: CanvasRenderingContext2D,
  entry: BoardRenderPlanEntryV7,
  x: number,
  y: number,
  zoom: number,
  strokes: readonly (readonly [string, number])[],
): void {
  const half = (TILE_WIDTH * zoom) / 2;
  context.save();
  context.beginPath();
  context.rect(x - half, y - half, half * 2, half * 2);
  context.clip();
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const [color, width] of strokes) {
    context.strokeStyle = color;
    context.lineWidth = width * zoom;
    context.beginPath();
    for (const neighbor of entry.roadNeighbors ?? []) {
      context.moveTo(x, y);
      context.lineTo(
        x + (neighbor.x - entry.at.x) * half,
        y + (neighbor.y - entry.at.y) * half,
      );
    }
    for (const [from, to] of entry.roadJoins ?? []) {
      context.moveTo(
        x + (from.x - entry.at.x) * half * 2,
        y + (from.y - entry.at.y) * half * 2,
      );
      context.lineTo(
        x + (to.x - entry.at.x) * half * 2,
        y + (to.y - entry.at.y) * half * 2,
      );
    }
    // An isolated Road remains visible as a short dirt patch.
    if (entry.kind === "ROAD" && (entry.roadNeighbors?.length ?? 0) === 0) {
      context.moveTo(x - 4 * zoom, y);
      context.lineTo(x + 4 * zoom, y);
    }
    context.stroke();
  }
  context.restore();
}

function selectionCoord(
  view: PlayerViewV7,
  selection: BoardSelectionV7 | null,
): CoordV7 | null {
  if (selection === null) return null;
  if (selection.kind === "TILE") return selection.at;
  if (selection.kind === "UNIT")
    return view.units.find((unit) => unit.id === selection.unitId)?.at ?? null;
  return view.cities.find((city) => city.id === selection.cityId)?.at ?? null;
}

function ownerPresentation(
  view: PlayerViewV7,
  ownerId: number | null,
): { readonly ownerColor?: string; readonly ownerSeat?: number } {
  if (ownerId === null) return {};
  const player = view.players.find((candidate) => candidate.id === ownerId);
  return player === undefined
    ? {}
    : {
        ownerColor: PLAYER_COLORS[player.color],
        ownerSeat: player.seat,
      };
}

const title = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
const variant = (at: CoordV7, count: number): number =>
  ((at.x * 31 + at.y * 17) % count) + 1;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
