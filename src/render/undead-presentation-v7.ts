import {
  FACTION_DISPLAY_NAMES_V7,
  PLAGUE_DURATION_TURNS_V7,
  batEscapeTilesV7,
  cooperativeAlliesV7,
  factionRulesV7,
  factionTreeV7,
  feastReadyV7,
  gravesEnabledV7,
  isIceAtV7,
  isNeutralOwnerV7,
  playerFactionV7,
  reachablePlayerMovementPathsV7,
  unitFactionV7,
  unitFliesV7,
  unitIsIceboundV7,
  unitIsTerrifiedV7,
  queryPlayerCommandsV7,
  unitRoleRuleV7,
  validatePlayerMovementPassagePathV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DevourPreviewV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type RaiseDeadPreviewV7,
  type TendWoundedPreviewV7,
  type WailPreviewV7,
} from "../engine/index";
import { HIDDEN_BLIZZARD_PREVIEW_V7 } from "./ice-folk-presentation-v7";

/**
 * Presentation helpers for revision 13 Undead (spec section 10). Every helper
 * reads only public views, public previews, and projected player events. A
 * match without an Undead seat never reaches a code path that changes its
 * revision-12 presentation.
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when the match setup includes an Undead seat. */
export function matchHasUndeadV7(view: Pick<PlayerViewV7, "setup">): boolean {
  return gravesEnabledV7(view.setup);
}

export function factionNameV7(faction: FactionIdV7): string {
  return FACTION_DISPLAY_NAMES_V7[faction];
}

/**
 * True when `faction` registers a role with Tend Wounded, the only cure for
 * Plague and Bitten (a Human Captain). Windmills and Troll regeneration heal
 * HP but cure nothing, so Goblins have no cure (revision 17 section 5.4).
 */
export function factionCanCureAfflictionsV7(faction: FactionIdV7): boolean {
  return Object.values(factionTreeV7(faction).roleRules).some((rule) =>
    rule.abilities.includes("TEND_WOUNDED"),
  );
}

/**
 * pulp_wars-0ao.18: how match-aware text names the one cure for Plague and
 * Bitten. "a Captain" in Human/Undead matches, "a Human Captain" when a Goblin
 * seat is also present, and null when no seat can Tend (so no cure exists).
 */
export function cureCaptainPhraseV7(
  view: Pick<PlayerViewV7, "players">,
): string | null {
  if (
    !view.players.some((player) => factionCanCureAfflictionsV7(player.faction))
  )
    return null;
  return view.players.some((player) => player.faction === "GOBLIN")
    ? "a Human Captain"
    : "a Captain";
}

/** A unit's name under its owner's faction registration. */
export function unitLabelV7(view: PlayerViewV7, unit: PublicUnitV7): string {
  return unitRoleRuleV7(view, unit).label;
}

/** Whether a visible unit is of the Undead kind (`unitFactionV7`). */
export function unitIsUndeadV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "UNDEAD";
}

/**
 * Restless (section 5.3): an own land-form unit of a Restless faction that
 * stands outside its owner's territory cannot recover there.
 */
export function restlessOutsideTerritoryV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  if (unit.ownerId !== view.viewer.id || unit.form !== "LAND") return false;
  // The Mind Control revision: Restless is a body rule of the unit's kind.
  if (!factionRulesV7(unitFactionV7(view, unit)).restless) return false;
  const tile = view.board.tiles.find(
    (candidate) => candidate.at.x === unit.at.x && candidate.at.y === unit.at.y,
  );
  return tile?.explored !== true || tile.territoryOwnerId !== unit.ownerId;
}

/** The Recover action a Restless unit would otherwise have been offered. */
export function restlessRecoverBlockedV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  const activation = unit.activation;
  return (
    restlessOutsideTerritoryV7(view, unit) &&
    unit.hp < unit.maxHp &&
    !activation.handled &&
    !activation.moved &&
    !activation.attacked &&
    !activation.recovered &&
    !activation.captured &&
    !activation.specialActed
  );
}

export const RESTLESS_EXPLANATION_V7 =
  "Restless: Undead recover only inside your territory.";

/** Short Undead ability names; RALLY reads as Frenzy for Undead support. */
export function undeadAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "UNDEAD") return null;
  switch (ability) {
    case "RALLY":
      return "Frenzy";
    case "RAISE_DEAD":
      return "Raise Dead";
    case "DEVOUR":
      return "Devour";
    case "WAIL":
      return "Wail";
    case "INFECT":
      return "Infect";
    case "LIFESTEAL":
      return "Lifesteal";
    case "PLAGUE":
      return "Plague";
    case "BITE":
      return "Bite";
    case "UNANSWERED":
      return "Unanswered";
    // The Vampire and Banshee rework (`pulp_wars-ty6i`).
    case "ESCAPE":
      return "Bat Escape";
    case "FEAST":
      return "Feast";
    case "TERROR":
      return "Terror";
    case "ETHEREAL":
      return "Ethereal";
    default:
      return null;
  }
}

export function undeadAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
  // pulp_wars-0ao.18: `cureCaptainPhraseV7` of the match; null when no seat
  // can cure, so the Plague sentence names no cure.
  cureCaptain: string | null = "a Captain",
): string | null {
  if (faction !== "UNDEAD") return null;
  switch (ability) {
    case "RALLY":
      return "Frenzies adjacent friendly land troops except Necromancers, Liches and Banshees: +1 Attack on their next attack.";
    case "RAISE_DEAD":
      // The Undead pass, correction: two tiles; a raised unit fills no
      // unit slot.
      return "Raises a 5 HP Skeleton from every free Grave within 2 tiles. They fill no unit slot.";
    case "DEVOUR":
      return "Eats the Grave under it to heal fully. Ends its turn.";
    case "WAIL":
      return "Damages every visible living enemy within 2 tiles. It can't attack.";
    case "INFECT":
      return "A land unit it kills rises as your Zombie. It fills no unit slot.";
    case "LIFESTEAL":
      return "Heals by the damage it deals when it survives the fight.";
    case "PLAGUE":
      // The Undead pass, correction: Plague needs Pestilence.
      return `With Pestilence: living units its attacks hit are plagued for 3 turns: −2 HP each turn, spreading to neighbours on the first. It ends sooner if this Lich dies${
        cureCaptain === null ? "." : ` or ${cureCaptain} tends them.`
      }`;
    case "BITE":
      return "Living land units it damages are bitten and rise as your Zombies when they die.";
    case "UNANSWERED":
      return "Units it attacks never strike back.";
    // The Vampire and Banshee rework (`pulp_wars-ty6i`).
    case "ESCAPE":
      return "After attacking, if it survives, it may fly up to 2 tiles over units and past enemies to an empty land tile; then it is done for the turn.";
    case "FEAST":
      return "When its attack kills, it heals to full HP and may attack once more this turn (two attacks at most).";
    case "TERROR":
      return "Enemies its Wail damages can't strike back until the end of your turn.";
    case "ETHEREAL":
      return "Enemy zones of control don't stop its Move.";
    default:
      return null;
  }
}

/** The Undead pass, correction: the Pestilence unlock (Undead Explosives). */
export const PESTILENCE_UNLOCK_TEXT_V7 = "Liches plague the units they hit";

/** Undead command labels; Human commands keep their revision-12 labels. */
export function undeadCommandLabelV7(
  kind: string,
  faction: FactionIdV7,
): string | null {
  if (kind === "RAISE_DEAD") return "Raise Dead";
  if (kind === "DEVOUR") return "Devour";
  if (kind === "WAIL") return "Wail";
  if (kind === "RALLY" && faction === "UNDEAD") return "Frenzy";
  return null;
}

// ------------------------------------------------------------------------
// The Vampire and Banshee rework, interface (`pulp_wars-iqhp`,
// RULESET_7_CURRENT.md section 17.12). Every helper reads only the public
// view (`terrorThisTurn`, `feastedThisTurn`, the units' activations), the
// public previews and the offered commands, and returns the neutral answer
// in a match without an Undead seat (both lists are then empty).
// ------------------------------------------------------------------------

export const TERROR_LABEL_V7 = "Terror";
/** The status sentence of a terrified unit (the engine's status line). */
export const TERROR_STATUS_V7 = "Terror: will not strike back this turn";
/** The attack preview of a terrified defender that does not retaliate. */
export const TERROR_NO_STRIKE_BACK_V7 = "Won't strike back (Terror)";
/** The board label suffix of a Wail target the Wail would terrify. */
export const WAIL_TERROR_LABEL_V7 = "Terror";
export const FEAST_LABEL_V7 = "Feast";
/** A Feast kill on the first attack: heals fully, one more attack. */
export const FEAST_ATTACK_AGAIN_PREVIEW_V7 = "Feast: full heal, attack again";
/** A Feast kill on the second attack: heals fully, no third attack. */
export const FEAST_PREVIEW_V7 = "Feast: full heal";
/** The cursor and legend name of a Bat Escape landing tile. */
export const BAT_ESCAPE_REACH_LABEL_V7 =
  "Bat Escape: flies up to 2 tiles, over units and past enemies";
/** The cursor and legend name of a tile only Ethereal reaches. */
export const ETHEREAL_REACH_LABEL_V7 =
  "Ethereal reach: passes enemy zones of control";

/** The note of an attack preview that Feasts, or null. */
export function feastPreviewNoteV7(
  preview: Pick<CombatPreviewV7, "feast" | "attacksRemaining">,
): string | null {
  if (!preview.feast) return null;
  return preview.attacksRemaining > 0
    ? FEAST_ATTACK_AGAIN_PREVIEW_V7
    : FEAST_PREVIEW_V7;
}

/**
 * Terror: whether a visible unit shows the Terror marker (it is in the
 * public `terrorThisTurn`: a Banshee's Wail terrified it this turn).
 */
export function unitShowsTerrorV7(
  view: Pick<PlayerViewV7, "terrorThisTurn">,
  unit: Pick<PublicUnitV7, "id">,
): boolean {
  return unitIsTerrifiedV7(view, unit.id);
}

/** The spoken cue of a terrified unit, for the board cursor; "" otherwise. */
export function terrorCursorCueV7(
  view: Pick<PlayerViewV7, "terrorThisTurn">,
  unit: Pick<PublicUnitV7, "id">,
): string {
  return unitShowsTerrorV7(view, unit) ? TERROR_STATUS_V7 : "";
}

/**
 * Feast: the dock prompt of an own Vampire whose kill this turn allows one
 * more attack (`feastReadyV7`), or null. It names the Bat Escape when the
 * Vampire may still fly off instead.
 */
export function feastPromptV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): string | null {
  if (unit.ownerId !== view.viewer.id || !feastReadyV7(view, unit)) return null;
  const escape = batEscapeTilesV7(view, unit) > 0;
  return `Feast! It healed to full HP and may attack once more this turn${
    escape ? ", or fly off with Bat Escape" : ""
  }.`;
}

/** One Bat Escape Move: where it flies from and the units it passes over. */
export interface BatEscapeMoveV7 {
  readonly from: CoordV7;
  readonly to: CoordV7;
  readonly path: readonly CoordV7[];
  /** The tiles of the flight (not its landing) that hold a unit. */
  readonly over: readonly CoordV7[];
}

/**
 * Bat Escape: the flight of an offered Move of a Vampire whose Escape
 * flies (`batEscapeTilesV7`), or null for every other Move.
 */
export function batEscapeMoveV7(
  view: PlayerViewV7,
  command: CommandV7,
): BatEscapeMoveV7 | null {
  if (command.kind !== "MOVE") return null;
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const to = command.path.at(-1);
  if (unit === undefined || to === undefined) return null;
  if (batEscapeTilesV7(view, unit) <= 0) return null;
  const over = command.path
    .slice(0, -1)
    .filter((at) =>
      view.units.some(
        (other) =>
          other.id !== unit.id && other.at.x === at.x && other.at.y === at.y,
      ),
    );
  return { from: unit.at, to, path: command.path, over };
}

/** The cursor description of one Bat Escape tile. */
export function batEscapeTargetSemanticV7(flight: BatEscapeMoveV7): string {
  return flight.over.length === 0
    ? `${BAT_ESCAPE_REACH_LABEL_V7}. Ends its turn.`
    : `${BAT_ESCAPE_REACH_LABEL_V7}. Flies over ${flight.over.length} ${
        flight.over.length === 1 ? "unit" : "units"
      }. Ends its turn.`;
}

const ETHEREAL_REACH_CACHE = new WeakMap<
  PlayerViewV7,
  Map<number, ReadonlySet<string>>
>();

/** Whether a visible unit moves Ethereal (its kind's `ETHEREAL`, land form). */
export function unitIsEtherealV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.form === "LAND" &&
    (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "ETHEREAL",
    )
  );
}

/**
 * The tiles ("y,x") in a hostile zone of control for a land-form `unit`,
 * as the public movement reads them: the eight cells round every visible
 * hostile unit on the board that projects one (not a flyer, an Egg, an
 * embarked or icebound unit, a neutral, an own or allied unit): land and
 * ice round a land unit, water round a ship; an unexplored cell counts.
 */
function hostileZocCellsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): ReadonlySet<string> {
  const cells = new Set<string>();
  for (const other of view.units) {
    if (
      other.hp <= 0 ||
      other.form === "EMBARKED" ||
      other.form === "EGG" ||
      other.ownerId === unit.ownerId ||
      isNeutralOwnerV7(other.ownerId) ||
      unitFliesV7(view, other) ||
      unitIsIceboundV7(view, other) ||
      cooperativeAlliesV7(
        view.setup.aiMode,
        view.humanPlayerId,
        unit.ownerId,
        other.ownerId,
      )
    )
      continue;
    for (let y = other.at.y - 1; y <= other.at.y + 1; y += 1)
      for (let x = other.at.x - 1; x <= other.at.x + 1; x += 1) {
        if (x === other.at.x && y === other.at.y) continue;
        if (x < 0 || y < 0 || x >= view.board.width || y >= view.board.height)
          continue;
        const tile = view.board.tiles[y * view.board.width + x];
        const projects =
          tile === undefined || !tile.explored
            ? true
            : tile.biome !== null || isIceAtV7(view, { x, y })
              ? other.form !== "NAVAL"
              : other.form === "NAVAL";
        if (projects) cells.add(`${y},${x}`);
      }
  }
  return cells;
}

/**
 * Ethereal (`pulp_wars-ty6i`): the Move destinations ("x,y") of an own
 * Ethereal unit that only Ethereal gives it, the tiles it reaches past an
 * enemy zone of control. The public movement query, against the same
 * search with every hostile zone of control ending the Move (the rule of a
 * unit without Ethereal); empty for a unit that is not Ethereal.
 */
export function etherealNewReachV7(
  view: PlayerViewV7,
  unitId: number,
): ReadonlySet<string> {
  let cache = ETHEREAL_REACH_CACHE.get(view);
  if (cache === undefined) {
    cache = new Map();
    ETHEREAL_REACH_CACHE.set(view, cache);
  }
  const cached = cache.get(unitId);
  if (cached !== undefined) return cached;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  let reach: ReadonlySet<string> = new Set();
  if (
    unit !== undefined &&
    unitIsEtherealV7(view, unit) &&
    batEscapeTilesV7(view, unit) === 0
  ) {
    const key = (at: CoordV7): string => `${at.x},${at.y}`;
    const zoc = hostileZocCellsV7(view, unit);
    const inZoc = (at: CoordV7): boolean => zoc.has(`${at.y},${at.x}`);
    // The search of a unit that stops on entering a hostile zone of
    // control: a path never continues from a zone-of-control tile.
    const plain = new Set<string>();
    const best = new Map<string, number>([[key(unit.at), 0]]);
    const queue: CoordV7[][] = [[]];
    while (queue.length > 0) {
      const path = queue.shift();
      if (path === undefined) break;
      const current = path.at(-1) ?? unit.at;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const step = { x: current.x + dx, y: current.y + dy };
          if (
            step.x < 0 ||
            step.y < 0 ||
            step.x >= view.board.width ||
            step.y >= view.board.height
          )
            continue;
          const candidate = [...path, step];
          const validation = validatePlayerMovementPassagePathV7(
            view,
            unit,
            candidate,
          );
          if (
            !validation.legal ||
            validation.traversedPath.length !== candidate.length
          )
            continue;
          const prior = best.get(key(step));
          if (prior !== undefined && prior <= validation.spentPoints2) continue;
          best.set(key(step), validation.spentPoints2);
          plain.add(key(step));
          if (!validation.stopped && !inZoc(step)) queue.push(candidate);
        }
    }
    reach = new Set(
      reachablePlayerMovementPathsV7(view, unit)
        .map((path) => key(path.destination))
        .filter((at) => !plain.has(at)),
    );
  }
  cache.set(unitId, reach);
  return reach;
}

/**
 * Short canvas note for the Lifesteal and Infect outcomes of an attack
 * preview. It is null for every Human-only exchange (heal 0, not infected).
 */
export function combatPreviewNoteV7(preview: CombatPreviewV7): string | null {
  const parts: string[] = [];
  if (preview.noRetaliationReason === "UNANSWERED")
    parts.push("No retaliation");
  // The Vampire and Banshee rework (`pulp_wars-ty6i`): a defender a Wail
  // terrified this turn does not strike back.
  if (preview.noRetaliationReason === "TERROR")
    parts.push(TERROR_NO_STRIKE_BACK_V7);
  if (preview.attackerHeal > 0) parts.push(`Heal +${preview.attackerHeal}`);
  const feast = feastPreviewNoteV7(preview);
  if (feast !== null) parts.push(feast);
  if (preview.defenderHeal > 0)
    parts.push(`Foe heals +${preview.defenderHeal}`);
  if (preview.defenderInfected) parts.push("Rises as Zombie");
  if (preview.defenderBittenRises) parts.push("Rises as Zombie (bitten)");
  if (preview.attackerInfected) parts.push("You rise as enemy Zombie");
  if (preview.attackerBittenRises)
    parts.push("You rise as enemy Zombie (bitten)");
  const plague = plagueNote(preview);
  if (plague !== null) parts.push(plague);
  if (preview.defenderBitten) parts.push("Bites");
  if (preview.attackerBitten) parts.push("You get bitten");
  return parts.length === 0 ? null : parts.join(" · ");
}

/** Revision 14: "Plagues target", or the count when splash targets join. */
function plagueNote(preview: CombatPreviewV7): string | null {
  const count = preview.plagued.length;
  if (count === 0) return null;
  return count === 1 && preview.plagued[0] === preview.targetUnitId
    ? "Plagues target"
    : `Plagues ${count} ${count === 1 ? "target" : "targets"}`;
}

/**
 * Screen-reader sentence for the same Lifesteal, Infect, Plague, Bitten and
 * unanswered-attack outcomes. `view` names the plagued units.
 */
export function combatPreviewSemanticNoteV7(
  preview: CombatPreviewV7,
  view?: PlayerViewV7,
): string | null {
  const parts: string[] = [];
  if (preview.noRetaliationReason === "UNANSWERED")
    parts.push("The defender can't strike back at a Vampire.");
  if (preview.noRetaliationReason === "TERROR")
    parts.push(
      "The defender won't strike back: a Banshee's Wail terrified it this turn.",
    );
  if (preview.feast)
    parts.push(
      `Feast: the kill heals the attacker to full HP${
        preview.attackerHeal > 0 ? ` (+${preview.attackerHeal})` : ""
      }${
        preview.attacksRemaining > 0
          ? " and it may attack once more this turn"
          : ""
      }.`,
    );
  else if (preview.attackerHeal > 0)
    parts.push(`Lifesteal heals the attacker by ${preview.attackerHeal} HP.`);
  if (preview.defenderHeal > 0)
    parts.push(`Lifesteal heals the defender by ${preview.defenderHeal} HP.`);
  if (preview.defenderInfected)
    parts.push("The defender dies and rises as a Zombie.");
  if (preview.defenderBittenRises)
    parts.push("The bitten defender dies and rises as a Zombie.");
  if (preview.attackerInfected)
    parts.push("The attacker dies and rises as an enemy Zombie.");
  if (preview.attackerBittenRises)
    parts.push("The bitten attacker dies and rises as an enemy Zombie.");
  if (preview.plagued.length > 0) {
    const names = preview.plagued.map((id) => {
      const unit = view?.units.find((candidate) => candidate.id === id);
      const label =
        view === undefined || unit === undefined
          ? "unit"
          : unitLabelV7(view, unit);
      return id === preview.targetUnitId ? `the target ${label}` : label;
    });
    parts.push(`Plagues ${names.join(", ")}.`);
  }
  if (preview.defenderBitten)
    parts.push("The defender is bitten and would rise as a Zombie on death.");
  if (preview.attackerBitten)
    parts.push("The attacker is bitten and would rise as a Zombie on death.");
  return parts.length === 0 ? null : parts.join(" ");
}

/**
 * Revision 14 afflictions of one visible unit, from the public `plagued` and
 * `bitten` lists: a short chip and a one-sentence explanation. A Plague
 * source is named only when the view shows that Lich.
 */
export type AfflictionIdV7 = "PLAGUE" | "BITTEN";

export interface UnitAfflictionV7 {
  readonly id: AfflictionIdV7;
  /** "Bitten", or revision 15 "Plague · N turns" (turns still to come). */
  readonly chip: string;
  readonly explanation: string;
}

export function unitAfflictionsV7(
  view: PlayerViewV7,
  unitId: number,
): readonly UnitAfflictionV7[] {
  const result: UnitAfflictionV7[] = [];
  // pulp_wars-0ao.16: name the Captain's cure only when the afflicted unit's
  // owner has one; Goblin units (no Tend Wounded) cannot be cured.
  const owner = view.units.find((unit) => unit.id === unitId)?.ownerId;
  // The neutral Giant Spider has no owner faction (and is never afflicted).
  const ownerFaction =
    owner === undefined || isNeutralOwnerV7(owner)
      ? undefined
      : playerFactionV7(view, owner);
  const uncurable =
    ownerFaction !== undefined && !factionCanCureAfflictionsV7(ownerFaction)
      ? `${factionNameV7(ownerFaction)}s`
      : null;
  const plague = view.plagued.find((entry) => entry.unitId === unitId);
  if (plague !== undefined) {
    const source =
      plague.sourceUnitId === null
        ? undefined
        : view.units.find((unit) => unit.id === plague.sourceUnitId);
    const lich =
      source === undefined
        ? "a hidden Lich"
        : `${possessive(view, source.ownerId)} ${unitLabelV7(view, source)}`;
    // Revision 15: Plague lasts `turnsRemaining` more of the unit's owner's
    // turns and spreads only at the first of the three.
    const turns = plague.turnsRemaining;
    const damage =
      turns === 1
        ? "−2 HP at the start of its next turn, then it ends"
        : `−2 HP at the start of each of its next ${turns} turns, then it ends`;
    const spread =
      turns >= PLAGUE_DURATION_TURNS_V7
        ? "; at the first it spreads to adjacent living units"
        : "";
    result.push({
      id: "PLAGUE",
      chip: `Plague · ${turns} ${turns === 1 ? "turn" : "turns"}`,
      explanation: `Plague from ${lich}: ${damage}${spread}. ${
        uncurable === null
          ? "It ends sooner if that Lich dies or a Captain tends it."
          : `It ends sooner only if that Lich dies; ${uncurable} can't cure it.`
      }`,
    });
  }
  const bite = view.bitten.find((entry) => entry.unitId === unitId);
  if (bite !== undefined) {
    const biter = possessive(view, bite.biterPlayerId);
    result.push({
      id: "BITTEN",
      chip: "Bitten",
      explanation: `Bitten by ${biter} Zombie: if it dies it rises as ${biter} Zombie${
        uncurable === null
          ? ", unless a Captain tends it first."
          : `; ${uncurable} can't cure bites.`
      }`,
    });
  }
  return result;
}

/** "your" for the viewer, otherwise "Player N's". */
function possessive(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `Player ${player.seat + 1}'s`;
}

/** Lower-case cursor cue, e.g. "plagued, bitten"; empty without statuses. */
export function afflictionCursorCueV7(
  view: PlayerViewV7,
  unitId: number,
): string {
  return unitAfflictionsV7(view, unitId)
    .map((affliction) => (affliction.id === "PLAGUE" ? "plagued" : "bitten"))
    .join(", ");
}

const DISBAND_BLOCK_CACHE = new WeakMap<
  PlayerViewV7,
  Map<number, "PLAGUED" | "BITTEN" | null>
>();

/**
 * Revision 14 (sections 3.6 and 4.5): the reason an own plagued or bitten
 * unit is not offered Disband, exactly when the same view without its
 * afflictions would offer it. `PLAGUED` wins when both apply.
 */
export function disbandBlockedByAfflictionV7(
  view: PlayerViewV7,
  unitId: number,
): "PLAGUED" | "BITTEN" | null {
  const plagued = view.plagued.some((entry) => entry.unitId === unitId);
  const bitten = view.bitten.some((entry) => entry.unitId === unitId);
  if (!plagued && !bitten) return null;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined || unit.ownerId !== view.viewer.id) return null;
  let byUnit = DISBAND_BLOCK_CACHE.get(view);
  if (byUnit === undefined) {
    byUnit = new Map();
    DISBAND_BLOCK_CACHE.set(view, byUnit);
  }
  const cached = byUnit.get(unitId);
  if (cached !== undefined) return cached;
  const unafflicted: PlayerViewV7 = {
    ...view,
    plagued: view.plagued.filter((entry) => entry.unitId !== unitId),
    bitten: view.bitten.filter((entry) => entry.unitId !== unitId),
  };
  const offered = queryPlayerCommandsV7(unafflicted).some(
    (command) => command.kind === "DISBAND" && command.unitId === unitId,
  );
  const reason = !offered ? null : plagued ? "PLAGUED" : "BITTEN";
  byUnit.set(unitId, reason);
  return reason;
}

export const DISBAND_BLOCKED_EXPLANATION_V7: Readonly<
  Record<"PLAGUED" | "BITTEN", string>
> = {
  PLAGUED: "Plagued units can't Disband.",
  BITTEN: "Bitten units can't Disband.",
};

/** Accessible Tend Wounded summary with heals and revision-14 cures. */
export function tendPreviewPresentationV7(
  view: PlayerViewV7,
  preview: TendWoundedPreviewV7,
): { readonly chip: string; readonly description: string } {
  const cures = preview.results.filter(
    (result) => result.curedPlague || result.curedBitten,
  ).length;
  const healed = preview.results.reduce(
    (sum, result) => sum + result.amount,
    0,
  );
  const list = preview.results
    .map((result) => {
      const unit = view.units.find(
        (candidate) => candidate.id === result.unitId,
      );
      const label = unit === undefined ? "Unit" : unitLabelV7(view, unit);
      const effects = [
        ...(result.amount > 0 ? [`+${result.amount} HP`] : []),
        ...(result.curedPlague ? ["cures Plague"] : []),
        ...(result.curedBitten ? ["cures bite"] : []),
      ];
      return `${label}: ${effects.join(", ")}`;
    })
    .join("; ");
  return {
    chip: [
      ...(healed > 0 ? [`+${healed} HP`] : []),
      ...(cures > 0 ? [`${cures} cure${cures === 1 ? "" : "s"}`] : []),
    ].join(" · "),
    description: `Tends ${preview.results.length} ${preview.results.length === 1 ? "unit" : "units"}: ${list}`,
  };
}

/**
 * Canvas label of one Tend target: `+2 HP`, `Cure`, or `+2 · Cure`. A cured
 * Frozen is a cure too (bead pulp_wars-621), so a Frozen unit at full HP
 * reads "Cure", never "+0 HP".
 */
export function tendTargetLabelV7(
  result: TendWoundedPreviewV7["results"][number],
): string {
  const cure = result.curedPlague || result.curedBitten || result.curedFrozen;
  if (result.amount > 0 && cure) return `+${result.amount} · Cure`;
  return cure ? "Cure" : `+${result.amount} HP`;
}

export interface WailTargetPresentationV7 {
  readonly unitId: number;
  readonly at: CoordV7;
  readonly label: string;
  readonly damage: number;
  readonly dies: boolean;
  readonly leavesGrave: boolean;
  /** Revision 14: the death rises as the biter's Zombie. */
  readonly bittenRises: boolean;
  /**
   * The Ice Folk revision (section 10.10): a hidden Witch's Blizzard may
   * lower this damage, as the combat preview's caveat.
   */
  readonly hiddenBlizzardPossible: boolean;
  /**
   * The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror. The target
   * survives the damage, so it will not strike back this turn.
   */
  readonly terror: boolean;
}

/**
 * The board label of one Wail target: the damage ("?" when a hidden
 * Blizzard may change it), "Rises" for a bitten death and "Terror" for a
 * survivor the Wail terrifies.
 */
export function wailTargetLabelV7(target: {
  readonly damage: number;
  readonly bittenRises: boolean;
  readonly hiddenBlizzardPossible: boolean;
  readonly terror?: boolean;
}): string {
  return `−${target.damage}${target.hiddenBlizzardPossible ? "?" : ""}${target.bittenRises ? " · Rises" : ""}${target.terror === true ? ` · ${WAIL_TERROR_LABEL_V7}` : ""}`;
}

export function wailTargetsPresentationV7(
  view: PlayerViewV7,
  preview: WailPreviewV7,
): readonly WailTargetPresentationV7[] {
  return preview.targets.map((target) => {
    const unit = view.units.find((candidate) => candidate.id === target.unitId);
    return {
      unitId: target.unitId,
      at: target.at,
      label: unit === undefined ? "Unit" : unitLabelV7(view, unit),
      damage: target.damage,
      dies: target.dies,
      leavesGrave: target.leavesGrave,
      bittenRises: target.bittenRises,
      hiddenBlizzardPossible: target.hiddenBlizzardPossible,
      terror: target.terror,
    };
  });
}

/**
 * Accessible Wail summary: target count, then per-target damage and deaths,
 * and the combat preview's hidden-Blizzard caveat when any target has it.
 */
export function wailPreviewDescriptionV7(
  view: PlayerViewV7,
  preview: WailPreviewV7,
): string {
  const targets = wailTargetsPresentationV7(view, preview);
  const kills = targets.filter((target) => target.dies).length;
  const list = targets
    .map(
      (target) =>
        `${target.label} −${target.damage}${target.hiddenBlizzardPossible ? "?" : ""}${target.bittenRises ? " (dies, rises as a Zombie)" : target.dies ? " (dies)" : target.terror ? " (terrified)" : ""}`,
    )
    .join(", ");
  const terrified = targets.filter((target) => target.terror).length;
  const terror =
    terrified === 0
      ? ""
      : `. Terror: ${terrified === 1 ? "the terrified enemy won't" : `the ${terrified} terrified enemies won't`} strike back this turn`;
  const caveat = targets.some((target) => target.hiddenBlizzardPossible)
    ? `. ${HIDDEN_BLIZZARD_PREVIEW_V7}`
    : "";
  return `Hits ${targets.length} ${targets.length === 1 ? "enemy" : "enemies"} within 2 tiles${kills > 0 ? `, ${kills} ${kills === 1 ? "dies" : "die"}` : ""}: ${list}${terror}${caveat}`;
}

export function raiseDeadPreviewDescriptionV7(
  preview: RaiseDeadPreviewV7,
): string {
  const count = preview.graves.length;
  return `${count} ${count === 1 ? "Skeleton rises" : "Skeletons rise"} from adjacent Graves at 5 HP`;
}

export function devourPreviewDescriptionV7(preview: DevourPreviewV7): string {
  return `Eats the Grave: heal +${preview.amount} to ${preview.hpAfter} HP`;
}

/**
 * Notification text for revision-13 and revision-14 events in one projected
 * boundary. The Grave-only case is logged but not toasted, so ordinary
 * Undead-match kills stay quiet; Plague damage and spread toast only when
 * they reach the viewer's units. Human-only matches never emit these events
 * (and their Tend results never cure), so their notices are unchanged.
 */
export function undeadBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  const viewerId = after.viewer.id;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    after.units.find((unit) => unit.id === id) ??
    before.units.find((unit) => unit.id === id);
  const owned = (playerId: number, label: string): string => {
    if (playerId === viewerId) return label;
    const player = after.players.find((candidate) => candidate.id === playerId);
    return player === undefined
      ? label
      : `Player ${player.seat + 1}'s ${label}`;
  };
  const labelOf = (id: number, fallback: string): string => {
    const unit = unitById(id);
    return unit === undefined ? fallback : unitLabelV7(after, unit);
  };
  const parts: string[] = [];
  let toast = false;
  let graves = 0;
  let plagueDeaths = 0;
  for (const event of events) {
    if (event.kind === "DEAD_RAISED") {
      toast = true;
      const count = event.results.length;
      parts.push(
        `${owned(event.playerId, labelOf(event.unitId, "Necromancer"))} raised ${count} ${count === 1 ? "Skeleton" : "Skeletons"}`,
      );
    } else if (event.kind === "GRAVE_DEVOURED") {
      toast = true;
      parts.push(
        `${owned(event.playerId, labelOf(event.unitId, "Ghoul"))} devoured a Grave: +${event.amount} HP`,
      );
    } else if (event.kind === "WAIL_RESOLVED") {
      toast = true;
      const kills = event.results.filter((result) => result.dies).length;
      // The Vampire and Banshee rework: the survivors it terrified.
      const terrified = event.terrified.length;
      parts.push(
        `${owned(event.playerId, labelOf(event.unitId, "Banshee"))} wailed: ${event.results.length} hit${kills > 0 ? `, ${kills} fell` : ""}${terrified > 0 ? `, ${terrified} terrified (no strike-back this turn)` : ""}`,
      );
    } else if (event.kind === "COMBAT_RESOLVED") {
      // The Vampire and Banshee rework (`pulp_wars-ty6i`): a Feast kill,
      // and a terrified defender that did not strike back.
      const preview = event.preview;
      if (preview.noRetaliationReason === "TERROR") {
        const defender = unitById(preview.targetUnitId);
        parts.push(
          `${defender === undefined ? "The defender" : `The ${unitLabelV7(after, defender)}`} was terrified and didn't strike back`,
        );
      }
      if (preview.feast) {
        const attacker = unitById(preview.attackerId);
        if (attacker?.ownerId === viewerId) toast = true;
        parts.push(
          `${
            attacker === undefined
              ? "A Vampire"
              : owned(attacker.ownerId, unitLabelV7(after, attacker))
          } feasted: healed to full${preview.attacksRemaining > 0 ? " and may attack again" : ""}`,
        );
      }
    } else if (event.kind === "UNIT_INFECTED") {
      toast = true;
      const victim = unitById(event.victimUnitId);
      const victimLabel =
        victim === undefined ? "unit" : unitLabelV7(after, victim);
      parts.push(`A fallen ${victimLabel} rose as a Zombie`);
    } else if (event.kind === "GRAVE_CREATED") graves += 1;
    else if (event.kind === "PLAGUE_DAMAGED") {
      // Revision 14 Start Turn Plague damage of one player's units.
      const own = event.playerId === viewerId;
      if (own) toast = true;
      const count = event.results.length;
      parts.push(
        `Plague hit ${count} of ${possessive(after, event.playerId)} ${count === 1 ? "unit" : "units"}`,
      );
    } else if (event.kind === "UNIT_DIED" && event.cause === "PLAGUE")
      plagueDeaths += 1;
    else if (event.kind === "PLAGUE_SPREAD") {
      const count = event.results.length;
      if (
        event.results.some(
          (result) => unitById(result.unitId)?.ownerId === viewerId,
        )
      )
        toast = true;
      parts.push(`Plague spread to ${count} ${count === 1 ? "unit" : "units"}`);
    } else if (event.kind === "PLAGUE_CLEARED") {
      toast = true;
      const count = event.unitIds.length;
      parts.push(
        `Plague lifted from ${count} ${count === 1 ? "unit" : "units"}`,
      );
    } else if (event.kind === "PLAGUE_EXPIRED") {
      // Revision 15: three turns of Plague ran out.
      if (event.playerId === viewerId) toast = true;
      const count = event.unitIds.length;
      parts.push(
        `Plague wore off ${count} of ${possessive(after, event.playerId)} ${count === 1 ? "unit" : "units"}`,
      );
    } else if (event.kind === "WIGHT_RISEN") {
      // The ninth unit (`pulp_wars-w49.17`, 7r55): Rise Again.
      toast = true;
      parts.push(
        `${owned(event.playerId, labelOf(event.unitId, "Wight"))} climbed out of its Grave`,
      );
    } else if (event.kind === "BITTEN_UNIT_RISEN") {
      toast = true;
      const victim = unitById(event.victimUnitId);
      const victimLabel =
        victim === undefined ? "unit" : unitLabelV7(after, victim);
      parts.push(
        `A bitten ${victimLabel} rose as ${possessive(after, event.playerId)} Zombie`,
      );
    } else if (event.kind === "WOUNDED_TENDED") {
      const plague = event.results.filter((result) => result.curedPlague);
      const bites = event.results.filter((result) => result.curedBitten);
      if (plague.length + bites.length > 0) {
        toast = true;
        const cures = [
          ...(plague.length > 0 ? [`Plague on ${plague.length}`] : []),
          ...(bites.length > 0
            ? [`${bites.length === 1 ? "a bite" : `${bites.length} bites`}`]
            : []),
        ];
        parts.push(`Tend cured ${cures.join(" and ")}`);
      }
    }
  }
  if (plagueDeaths > 0)
    parts.push(
      `${plagueDeaths} ${plagueDeaths === 1 ? "unit" : "units"} fell to Plague`,
    );
  if (graves > 0)
    parts.push(`${graves} ${graves === 1 ? "Grave" : "Graves"} left`);
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
