import {
  effectiveRoleRuleV7,
  type FactionIdV7,
  isNavalRoleV7,
  roleMechanicsV7,
  technologyDisplayNameV7,
  type UnitRoleIdV7,
} from "../engine/index";
import {
  RAIDER_SLIPS_TEXT_V7,
  carrionTextV7,
  rangedDefenseTextV7,
} from "./technology-unlock-text-v7";
import {
  undeadAbilityDescriptionV7,
  undeadAbilityNameV7,
} from "./undead-presentation-v7";
import {
  goblinAbilityDescriptionV7,
  goblinAbilityNameV7,
  goblinRecruitNotesV7,
} from "./goblin-presentation-v7";
import {
  dinosaurAbilityDescriptionV7,
  dinosaurAbilityNameV7,
  packHuntTextV7,
  dinosaurRecruitNotesV7,
} from "./dinosaur-presentation-v7";
import {
  martianAbilityDescriptionV7,
  martianAbilityNameV7,
  martianRecruitNotesV7,
} from "./martian-presentation-v7";
import {
  iceFolkAbilityDescriptionV7,
  iceFolkAbilityNameV7,
  iceFolkRecruitNotesV7,
} from "./ice-folk-presentation-v7";
import { FREEZE_RULE_V7 } from "./frozen-sea-presentation-v7";
import { ninthUnitRecruitNotesV7 } from "./ninth-unit-presentation-v7";
import {
  NAVAL_RAM_RULE_V7,
  SUBMERGED_RULE_V7,
  TORPEDO_RULE_V7,
  navalAbilityNameV7,
} from "./naval-presentation-v7";
import {
  dwarfAbilityDescriptionV7,
  dwarfAbilityNameV7,
  dwarfRecruitNotesV7,
} from "./dwarf-presentation-v7";
import {
  candyAbilityDescriptionV7,
  candyAbilityNameV7,
  candyRecruitNotesV7,
} from "./candy-presentation-v7";

/**
 * Role-level unit presentation of Ruleset 7: a faction role's base stats,
 * its ability names with their short descriptions, and its restrictions,
 * with no live-unit state. Recruit help, the selection dock and the
 * Gallery (bead pulp_wars-ic8) read these one texts.
 */

/** Revision 16 (section 5.4) unit and help text for boats and transports. */
export const AT_SEA_MOVE_TEXT_V7 = "At sea: Move 2; landing uses 1 of it.";

export interface RecruitmentRolePresentationV7 {
  readonly label: string;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly abilities: readonly string[];
  readonly restrictions: readonly string[];
}

/** Canonical base-role information only; it deliberately has no live-unit state. */
export function recruitmentRolePresentationV7(
  roleId: UnitRoleIdV7,
  faction: FactionIdV7,
  cureCaptain: string | null = "a Captain",
): RecruitmentRolePresentationV7 {
  const role = effectiveRoleRuleV7(roleId, faction);
  const restrictions: string[] = [];
  const ship = isNavalRoleV7(roleId);
  if (!role.mayUsePrimaryActionAfterMove && role.minimumRange <= 1 && !ship)
    restrictions.push("Can't attack after moving.");
  // Tuning 4 (`pulp_wars-w49.3`): the Human Raider slips past a screen.
  if (
    faction === "ORIGINAL" &&
    roleMechanicsV7(roleId, faction).ignoresZocStops
  )
    restrictions.push(`${RAIDER_SLIPS_TEXT_V7}.`);
  // Tuning 5 (`pulp_wars-w49.4`): the Human Guard is open to ranged attacks.
  // The Undead pass (`pulp_wars-w49.13`, 7r51): the Skeleton has Bones.
  const rangedDefense2 = roleMechanicsV7(roleId, faction).rangedDefense2;
  if (rangedDefense2 !== null && !ship)
    restrictions.push(`${rangedDefenseTextV7(rangedDefense2, role.defense2)}.`);
  // The Undead pass, correction: the Ghoul's Carrion.
  const carrionBonus2 = roleMechanicsV7(roleId, faction).carrionBonus2;
  if (carrionBonus2 > 0) restrictions.push(`${carrionTextV7(carrionBonus2)}.`);
  // The Dinosaur pass (`pulp_wars-w49.15`, 7r53): the Caveman's Pack Hunt.
  const packHuntBonus2 = roleMechanicsV7(roleId, faction).packHuntBonus2;
  if (packHuntBonus2 > 0)
    restrictions.push(`${packHuntTextV7(packHuntBonus2)}.`);
  if (ship) restrictions.push("Built at ports. Heals only near your ports.");
  if (roleId === "BATTLESHIP")
    restrictions.push(
      "Shots splash onto nearby enemies.",
      "Moves or fires each turn, not both.",
    );
  if (faction === "UNDEAD" && roleId === "CATAPULT")
    restrictions.push("Shots splash onto nearby enemies.");
  if (faction === "UNDEAD" && !role.abilities.includes("ATTACK") && !ship)
    restrictions.push("Can't attack. Wails instead.");
  if (faction === "UNDEAD" && !ship)
    restrictions.push("Restless: recovers only in your territory.");
  // Revision 17: Kaboom, death blasts, bombs, regeneration, Gang Up and
  // the Field Defense restriction from the Goblin registration.
  restrictions.push(...goblinRecruitNotesV7(roleId, faction));
  // Revision 19: hatch time, slots and the Field Defense restriction from
  // the Dinosaur registration.
  restrictions.push(...dinosaurRecruitNotesV7(roleId, faction));
  // The Martian revision: the Shield, flying or striding, slots and the
  // Field Defense restriction from the Martian registration.
  restrictions.push(...martianRecruitNotesV7(roleId, faction));
  // The Ice Folk revision: Mountain-born, Glide and the Field Defense
  // restriction from the Ice Folk registration.
  restrictions.push(...iceFolkRecruitNotesV7(roleId, faction));
  // The Dwarf revision: clockwork, flight, machines and the Field Defense
  // restriction from the Dwarf registration.
  restrictions.push(...dwarfRecruitNotesV7(roleId, faction));
  // The Candy revision: the Rush perks, Crumbs and the Field Defense
  // restriction from the Candy registration.
  restrictions.push(...candyRecruitNotesV7(roleId, faction));
  // The ninth unit (`pulp_wars-w49.17`, 7r55): Heavyweight, Rise Again,
  // Shock Field, Rock Hard, Thagomizer, Frostbite, and Whirl.
  restrictions.push(...ninthUnitRecruitNotesV7(roleId, faction));
  return {
    label: role.label,
    stats: [
      { label: "HP", value: String(role.maxHp) },
      { label: "Attack", value: formatHalfUnits(role.attack2) },
      { label: "Defense", value: formatHalfUnits(role.defense2) },
      { label: "Move", value: String(role.move) },
      {
        label: "Range",
        value:
          role.range === 0
            ? "—"
            : role.minimumRange === role.range
              ? String(role.range)
              : `${role.minimumRange}–${role.range}`,
      },
      { label: "Sight", value: String(role.sightRadius) },
    ],
    abilities: role.abilities.flatMap((ability) => {
      const description = roleAbilityDescriptionV7(
        ability,
        role.minimumRange,
        role.range,
        faction,
        cureCaptain,
        roleId,
      );
      return description === null
        ? []
        : [`${roleAbilityNameV7(ability, faction)}: ${description}`];
    }),
    restrictions,
  };
}

function formatHalfUnits(value2: number): string {
  return String(value2 / 2);
}

/** The short description of a role ability, or null when it needs none. */
export function roleAbilityDescriptionV7(
  ability: string,
  minimum: number,
  maximum: number,
  faction: FactionIdV7,
  cureCaptain: string | null,
  /**
   * `pulp_wars-1wy.5`: the role, where the text differs by unit (a Saucer's
   * Tractor Beam and a Mothership's free heavy one).
   */
  role?: UnitRoleIdV7,
): string | null {
  const undead = undeadAbilityDescriptionV7(ability, faction, cureCaptain);
  if (undead !== null) return undead;
  const goblin = goblinAbilityDescriptionV7(ability, faction);
  if (goblin !== null) return goblin;
  const dinosaur = dinosaurAbilityDescriptionV7(ability, faction);
  if (dinosaur !== null) return dinosaur;
  const martian = martianAbilityDescriptionV7(ability, faction, role);
  if (martian !== null) return martian;
  const iceFolk = iceFolkAbilityDescriptionV7(ability, faction);
  if (iceFolk !== null) return iceFolk;
  const dwarf = dwarfAbilityDescriptionV7(ability, faction);
  if (dwarf !== null) return dwarf;
  const candy = candyAbilityDescriptionV7(ability, faction);
  if (candy !== null) return candy;
  switch (ability) {
    case "ATTACK":
      return minimum > 1
        ? `Fires at range ${minimum}–${maximum}. Can't hit adjacent units or move and fire.`
        : null;
    case "CAPTURE":
      return "Can take villages and enemy cities.";
    case "CHARGE":
      return `With ${technologyDisplayNameV7("RAIDING", faction)}, +1 Attack on the first Attack after moving 2+ cells.`;
    case "RALLY":
      return "Inspires adjacent friendly land troops except Captains and Catapults.";
    case "TEND_WOUNDED":
      return "Heals nearby wounded troops by 2.";
    case "OVERRUN":
      return "After a kill, advances and can attack another adjacent enemy.";
    case "ESCAPE":
      return "May move again after attacking: a fresh full Move if it survives, then it is done for the turn.";
    case "PUSH":
      return "Knocks surviving targets back a tile.";
    // The naval branch (`pulp_wars-5ti.2`, `pulp_wars-5ti.7`): the help
    // sentences of docs/product/RULESET_7_NAVAL_BRANCH.md section 14.2,
    // shared by every faction.
    case "RAM":
      return `With ${technologyDisplayNameV7("SEAMANSHIP", faction)}: ${NAVAL_RAM_RULE_V7.replace(/^A Patrol Boat/, "a Patrol Boat")}`;
    // The frozen sea (`pulp_wars-5ti.7`): every Ice Folk land role.
    case "FREEZE":
      return `With Rime: ${FREEZE_RULE_V7.replace(/^A unit/, "it")}`;
    case "SUBMERGED":
      return SUBMERGED_RULE_V7;
    case "TORPEDO":
      return TORPEDO_RULE_V7;
    default:
      return null;
  }
}

/** The name of a role ability under a faction (Frenzy, Berserk, ...). */
export function roleAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string {
  const undead = undeadAbilityNameV7(ability, faction);
  if (undead !== null) return undead;
  const goblin = goblinAbilityNameV7(ability, faction);
  if (goblin !== null) return goblin;
  const dinosaur = dinosaurAbilityNameV7(ability, faction);
  if (dinosaur !== null) return dinosaur;
  const martian = martianAbilityNameV7(ability, faction);
  if (martian !== null) return martian;
  const iceFolk = iceFolkAbilityNameV7(ability, faction);
  if (iceFolk !== null) return iceFolk;
  const dwarf = dwarfAbilityNameV7(ability, faction);
  if (dwarf !== null) return dwarf;
  const candy = candyAbilityNameV7(ability, faction);
  if (candy !== null) return candy;
  if (ability === "TEND_WOUNDED") return "Tend";
  // The giants' signatures (`pulp_wars-w49.30`): the names of
  // docs/product/RULESET_7_GIANTS.md section 6.
  const giant = GIANT_SIGNATURE_NAMES_V7[ability];
  if (giant !== undefined) return giant;
  // The naval branch interface: the boats' ram is "Bow Ram" (the Goblin
  // Scrap Buggy's Overrun is displayed as "Ram").
  const naval = navalAbilityNameV7(ability);
  if (naval !== null) return naval;
  return title(ability);
}

/** The giants' signatures: each signature ability's display name. */
const GIANT_SIGNATURE_NAMES_V7: Readonly<Record<string, string>> =
  Object.freeze({
    CRUSH: "Crushing Shove",
    SWALLOW: "Swallow",
    TOSS: "Goblin Toss",
    STOMP: "Thunder Stomp",
    OVERSTRIDE: "Overstride",
    GLACIAL_SMASH: "Glacial Smash",
    SIEGE_HAMMER: "Siege Hammer",
    BREAK_OFF: "Break Off",
  });

function title(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
