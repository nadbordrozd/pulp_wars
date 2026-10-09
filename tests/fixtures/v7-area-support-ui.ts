import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { dinosaurUiFieldV7 } from "./v7-dinosaur-ui";
import { DWARF_UI_V7, dwarfUiFixtureV7 } from "./v7-dwarf-ui";
import { goblinArenaV7 } from "./v7-goblin-arena";
import { GOBLIN_SHOWCASE_V7, goblinShowcaseFixtureV7 } from "./v7-goblin-ui";
import { MARTIAN_UI_V7, martianUiFixtureV7 } from "./v7-martian-ui";
import {
  AFFLICTION_SHOWCASE_V7,
  UNDEAD_SHOWCASE_V7,
  afflictionHumanFixtureV7,
  undeadShowcaseFixtureV7,
} from "./v7-undead-ui";

/**
 * Bead pulp_wars-621: one scene per faction that has an area support (one
 * button that helps every eligible own unit in reach), for the board marks
 * of docs/ui/BOARD_TARGETING.md section 2.1. The Ice Folk have none, and
 * the Candy none since the Candy redesign (`pulp_wars-jdb.12`) replaced the
 * Confectioner's Frosting with a one-target Top-Up.
 */
export interface AreaSupportSceneV7 {
  readonly name: string;
  readonly state: () => GameStateV7;
  /** The unit with the button. */
  readonly actor: CoordV7;
  readonly kind: "TEND_WOUNDED" | "RALLY";
}

/** A Human-only match: a Captain between two wounded units and a healthy one. */
export const HUMAN_TEND_V7 = {
  captain: { x: 5, y: 5 },
  woundedFighter: { x: 4, y: 5 },
  woundedMarksman: { x: 6, y: 6 },
  healthyGuard: { x: 5, y: 4 },
  /** Wounded, but out of reach. */
  farFighter: { x: 8, y: 5 },
  enemy: { x: 9, y: 9 },
} as const;

export function humanTendFixtureV7(): GameStateV7 {
  const at = HUMAN_TEND_V7;
  return goblinArenaV7(
    ["ORIGINAL", "ORIGINAL"],
    [
      { seat: 0, role: "CAPTAIN", at: at.captain },
      { seat: 0, role: "FIGHTER", at: at.woundedFighter, hp: 5 },
      { seat: 0, role: "MARKSMAN", at: at.woundedMarksman, hp: 6 },
      { seat: 0, role: "GUARD", at: at.healthyGuard },
      { seat: 0, role: "FIGHTER", at: at.farFighter, hp: 5 },
      { seat: 1, role: "FIGHTER", at: at.enemy },
    ],
  );
}

/**
 * A Dinosaur Shaman next to a wounded Caveman and an Egg it may hatch: the
 * Egg is a target to pick, the Caveman only a recipient of Tend Wounded.
 */
export const DINOSAUR_TEND_V7 = {
  shaman: { x: 8, y: 7 },
  woundedCaveman: { x: 8, y: 6 },
  egg: { x: 7, y: 7 },
  enemy: { x: 2, y: 2 },
} as const;

export function dinosaurTendFixtureV7(): GameStateV7 {
  const at = DINOSAUR_TEND_V7;
  return dinosaurUiFieldV7(
    [
      { seat: 0, role: "CAPTAIN", at: at.shaman },
      { seat: 0, role: "FIGHTER", at: at.woundedCaveman, hp: 5 },
      { seat: 1, role: "FIGHTER", at: at.enemy },
    ],
    { eggs: [{ seat: 0, role: "KNIGHT", at: at.egg }] },
  );
}

export const AREA_SUPPORT_SCENES_V7: readonly AreaSupportSceneV7[] = [
  {
    name: "Human Captain: Tend Wounded",
    state: humanTendFixtureV7,
    actor: HUMAN_TEND_V7.captain,
    kind: "TEND_WOUNDED",
  },
  {
    name: "Human Captain against the Undead: cures",
    state: afflictionHumanFixtureV7,
    actor: AFFLICTION_SHOWCASE_V7.human.captain,
    kind: "TEND_WOUNDED",
  },
  {
    name: "Dinosaur Shaman: Tend Wounded",
    state: dinosaurTendFixtureV7,
    actor: DINOSAUR_TEND_V7.shaman,
    kind: "TEND_WOUNDED",
  },
  {
    name: "Dwarf Engineer: Repair",
    state: () => dwarfUiFixtureV7(),
    actor: DWARF_UI_V7.engineer,
    kind: "TEND_WOUNDED",
  },
  {
    name: "Human Captain: Rally",
    state: humanTendFixtureV7,
    actor: HUMAN_TEND_V7.captain,
    kind: "RALLY",
  },
  {
    name: "Undead Necromancer: Frenzy",
    state: undeadShowcaseFixtureV7,
    actor: UNDEAD_SHOWCASE_V7.necromancer,
    kind: "RALLY",
  },
  {
    name: "Goblin Warboss: Berserk",
    state: goblinShowcaseFixtureV7,
    actor: GOBLIN_SHOWCASE_V7.warboss,
    kind: "RALLY",
  },
  {
    name: "Martian Brain: Rally",
    state: () => martianUiFixtureV7(),
    actor: MARTIAN_UI_V7.brain,
    kind: "RALLY",
  },
];
