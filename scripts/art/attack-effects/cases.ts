/**
 * The cases of the attack effects review (beads pulp_wars-b5f.5 and
 * pulp_wars-eu3r.4, docs/art/ATTACK_EFFECTS.md): each cue's shooter, and
 * the Battleship's broadside once per faction. Kept apart from scene.ts,
 * which runs in the browser, so the Node review script can list them.
 */
import {
  FACTION_IDS_V7,
  type FactionIdV7,
  type UnitRoleIdV7,
} from "../../../src/engine/index";
import {
  ATTACK_EFFECT_IDS_V7,
  type AttackEffectIdV7,
} from "../../../src/render/canvas/attack-effects-v7";

export interface AttackEffectsShooterV7 {
  readonly faction: FactionIdV7;
  readonly role: UnitRoleIdV7;
  readonly range: number;
  readonly label: string;
}

/** The shooter of each cue: faction, role and range to its target. */
export const ATTACK_EFFECTS_SCENE_SHOOTERS_V7: Readonly<
  Record<Exclude<AttackEffectIdV7, "BROADSIDE">, AttackEffectsShooterV7>
> = {
  NECRO_BOLT: { faction: "UNDEAD", role: "CATAPULT", range: 2, label: "Lich" },
  FIREWORK_ROCKET: {
    faction: "GOBLIN",
    role: "CATAPULT",
    range: 3,
    label: "Rocket Cart",
  },
  GATLING_BURST: {
    faction: "DWARF",
    role: "MARKSMAN",
    range: 2,
    label: "Clockwork Gunner",
  },
  CANNON_BLAST: {
    faction: "DWARF",
    role: "CATAPULT",
    range: 3,
    label: "Steam Cannon",
  },
  ICE_BOULDER: {
    faction: "ICE_FOLK",
    role: "CATAPULT",
    range: 2,
    label: "Boulder Yeti",
  },
  HARPOON: {
    faction: "ICE_FOLK",
    role: "MARKSMAN",
    range: 2,
    label: "Snow Hunter",
  },
  // The Candy revision (bead pulp_wars-jdb.6).
  PIE_THROW: {
    faction: "CANDY",
    role: "CATAPULT",
    range: 3,
    label: "Pie Launcher",
  },
  GUMBALL_SHOT: {
    faction: "CANDY",
    role: "MARKSMAN",
    range: 2,
    label: "Gumball Gunner",
  },
};

/**
 * One reviewed case: a cue and its shooter. Every cue but the broadside is
 * one case named after the cue; the broadside is one case per faction.
 */
export interface AttackEffectsCaseV7 {
  readonly id: string;
  readonly effect: AttackEffectIdV7;
  readonly shooter: AttackEffectsShooterV7;
  /** BROADSIDE: the Battleship sails, and two more units take the splash. */
  readonly naval: boolean;
}

export const ATTACK_EFFECTS_CASES_V7: readonly AttackEffectsCaseV7[] =
  ATTACK_EFFECT_IDS_V7.flatMap((effect): AttackEffectsCaseV7[] =>
    effect === "BROADSIDE"
      ? FACTION_IDS_V7.map((faction) => ({
          id: `BROADSIDE-${faction}`,
          effect,
          shooter: {
            faction,
            role: "BATTLESHIP",
            range: 2,
            label: `${faction} Battleship`,
          },
          naval: true,
        }))
      : [
          {
            id: effect,
            effect,
            shooter: ATTACK_EFFECTS_SCENE_SHOOTERS_V7[effect],
            naval: false,
          },
        ],
  );

export function attackEffectsCaseV7(id: string): AttackEffectsCaseV7 {
  const found = ATTACK_EFFECTS_CASES_V7.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`no attack effects case ${id}`);
  return found;
}
