import type {
  MartianPieceV7,
  ScenarioHelpersV7,
} from "./martian-tuning-analysis-v7";

/**
 * The played scenarios of the Martian pass (`pulp_wars-w49.14`,
 * docs/product/RULESET_7_TUNING_MARTIAN.md section 2): the mechanics a
 * matchup matrix cannot show. `play` resolves listed commands; `battle`
 * plays whole turns by a fixed script (stated in each title). Every tile is
 * open Grass unless the scenario says otherwise. A Martian unit's health
 * reads HP+Shield.
 */
export function martianScenariosV7(h: ScenarioHelpersV7): string[] {
  const { play, battle, attack, rally, wailStep, kaboom, pull, control } = h;
  const { beam, endTurn, move, note, at } = h;
  const row = (
    seat: number,
    role: MartianPieceV7["role"],
    y: number,
    xs: readonly number[],
    extra: Partial<MartianPieceV7> = {},
  ): MartianPieceV7[] =>
    xs.map((x) => ({ seat, role, at: at(x, y), ...extra }));
  const lines: string[] = [];

  // A firing line of three (Grunt, Ray Gunner, Grunt) under three Marksmen
  // and a Catapult; the Humans move.
  const underFire = (
    title: string,
    shield: number | undefined,
    projector: boolean,
  ): string[] =>
    play(
      title,
      ["MARTIAN", "ORIGINAL"],
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: at(3, 3),
          tag: "g1",
          ...(shield === undefined ? {} : { shield }),
        },
        {
          seat: 0,
          role: "MARKSMAN",
          at: at(4, 3),
          tag: "rg",
          ...(shield === undefined ? {} : { shield }),
        },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 3),
          tag: "g2",
          ...(shield === undefined ? {} : { shield }),
        },
        ...(projector
          ? [{ seat: 0, role: "GUARD" as const, at: at(4, 4), tag: "p" }]
          : []),
        { seat: 1, role: "MARKSMAN", at: at(3, 1), tag: "m1" },
        { seat: 1, role: "MARKSMAN", at: at(4, 1), tag: "m2" },
        { seat: 1, role: "MARKSMAN", at: at(5, 1), tag: "m3" },
        { seat: 1, role: "CATAPULT", at: at(4, 0), tag: "c" },
      ],
      [
        attack("c", "rg"),
        attack("m2", "rg"),
        attack("m1", "g1"),
        attack("m3", "g1"),
      ],
      { activeSeat: 1 },
    );

  // A Knight rides into a line of five; `middle` is the role in the middle.
  const knightChain = (
    title: string,
    shield: number | undefined,
    middle: MartianPieceV7["role"],
  ): string[] =>
    play(
      title,
      ["MARTIAN", "ORIGINAL"],
      [
        ...[2, 3, 5, 6].map((x, index): MartianPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at: at(x, 3),
          tag: `g${index + 1}`,
          ...(shield === undefined ? {} : { shield }),
        })),
        {
          seat: 0,
          role: middle,
          at: at(4, 3),
          tag: "mid",
          ...(shield === undefined || middle === "GUARD" ? {} : { shield }),
        },
        { seat: 1, role: "KNIGHT", at: at(1, 0), tag: "k" },
      ],
      [
        move("k", at(1, 1), at(1, 2)),
        attack("k", "g1"),
        attack("k", "g2"),
        attack("k", "mid"),
        attack("k", "g3"),
        attack("k", "g4"),
        endTurn,
        note("The Martians answer"),
        attack("g3", "k"),
        attack("g4", "k"),
        attack("mid", "k"),
      ],
      { activeSeat: 1 },
    );

  lines.push(
    "#### A Shield Projector and a firing line",
    "",
    ...underFire(
      "A Catapult and three Marksmen fire at a line of Grunt, Ray Gunner, Grunt (Shield 2 each)",
      undefined,
      false,
    ),
    ...underFire(
      "The same line with a Shield Projector behind it (every Shield recharged to 4)",
      4,
      true,
    ),
    ...underFire(
      "The same line with its Shields down (it attacked hand to hand and has no Force Fields)",
      0,
      false,
    ),
    "",
    "#### A Knight rides into a line of five",
    "",
    ...knightChain(
      "Five Grunts in a row, Shield 2: the Knight starts at one end and rides on while a unit stands beside it",
      undefined,
      "FIGHTER",
    ),
    ...knightChain("Five Grunts with their Shields down", 0, "FIGHTER"),
    ...knightChain(
      "Four Grunts in a Force Field (Shield 4, full HP) with the Shield Projector in the middle of the line: the field holds the first attack",
      4,
      "GUARD",
    ),
    ...play(
      "The same fielded line; a Catapult shoots the first Grunt, then the Knight rides: one kill, and the field of the next Grunt holds",
      ["MARTIAN", "ORIGINAL"],
      [
        ...[2, 3, 5, 6].map((x, index): MartianPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at: at(x, 3),
          tag: `g${index + 1}`,
          shield: 4,
        })),
        { seat: 0, role: "GUARD", at: at(4, 3), tag: "p" },
        { seat: 1, role: "CATAPULT", at: at(2, 0), tag: "c" },
        { seat: 1, role: "KNIGHT", at: at(1, 0), tag: "k" },
      ],
      [
        attack("c", "g1"),
        move("k", at(1, 1), at(1, 2)),
        attack("k", "g1"),
        attack("k", "g2"),
        attack("k", "p"),
      ],
      { activeSeat: 1 },
    ),
    ...play(
      "The same fielded line; two Catapults and a Marksman kill the Projector first. The Shields stay at 4 until they recharge, so the Knight waits a turn; then it kills every Grunt it reaches (the Projector's tile is a gap in the row)",
      ["MARTIAN", "ORIGINAL"],
      [
        ...[2, 3, 5, 6].map((x, index): MartianPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at: at(x, 3),
          tag: `g${index + 1}`,
          shield: 4,
        })),
        { seat: 0, role: "GUARD", at: at(4, 3), tag: "p" },
        { seat: 1, role: "CATAPULT", at: at(4, 0), tag: "c1" },
        { seat: 1, role: "CATAPULT", at: at(5, 0), tag: "c2" },
        { seat: 1, role: "MARKSMAN", at: at(4, 1), tag: "m" },
        { seat: 1, role: "KNIGHT", at: at(0, 0), tag: "k" },
      ],
      [
        attack("c1", "p"),
        attack("c2", "p"),
        attack("m", "p"),
        endTurn,
        note(
          "The Martians stand; their Shields recharge to 2 without the Projector",
        ),
        endTurn,
        move("k", at(0, 1), at(1, 2)),
        attack("k", "g1"),
        attack("k", "g2"),
        attack("k", "g3"),
        attack("k", "g4"),
      ],
      { activeSeat: 1 },
    ),
    ...play(
      "Two Knights at one fielded Grunt: the first leaves it at 1 HP, the second kills it and rides on into the next field, which holds",
      ["MARTIAN", "ORIGINAL"],
      [
        ...[2, 3].map((x, index): MartianPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at: at(x, 3),
          tag: `g${index + 1}`,
          shield: 4,
        })),
        { seat: 0, role: "GUARD", at: at(3, 4), tag: "p" },
        { seat: 1, role: "KNIGHT", at: at(1, 0), tag: "k1" },
        { seat: 1, role: "KNIGHT", at: at(2, 0), tag: "k2" },
      ],
      [
        move("k1", at(1, 1), at(1, 2)),
        attack("k1", "g1"),
        move("k2", at(2, 1), at(2, 2)),
        attack("k2", "g1"),
        attack("k2", "g2"),
      ],
      { activeSeat: 1 },
    ),
    ...play(
      "The Martians move first: a Saucer pulls the Knight one tile into the range of two Ray Gunners that have not moved, and a Grunt",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(3, 4), tag: "r1" },
        { seat: 0, role: "MARKSMAN", at: at(5, 4), tag: "r2" },
        { seat: 0, role: "FIGHTER", at: at(4, 5), tag: "g" },
        { seat: 0, role: "RAIDER", at: at(7, 4), tag: "s" },
        { seat: 1, role: "KNIGHT", at: at(4, 1), tag: "k" },
      ],
      [
        attack("r1", "k"),
        move("s", at(6, 3), at(5, 3), at(4, 3)),
        pull("s", "k"),
        attack("r1", "k"),
        attack("r2", "k"),
      ],
    ),
    "",
    "#### Psychic Command every second turn",
    "",
    ...play(
      "A Brain commands two Grunts; they shoot a Swordsman. Next turn the Brain is Cooling and cannot command; the turn after it can",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 5), tag: "b" },
        { seat: 0, role: "FIGHTER", at: at(3, 4), tag: "g1" },
        { seat: 0, role: "FIGHTER", at: at(5, 4), tag: "g2" },
        { seat: 1, role: "SWORDSMAN", at: at(4, 2), tag: "sw" },
        { seat: 1, role: "GUARD", at: at(3, 2), tag: "gd" },
      ],
      [
        rally("b"),
        attack("g1", "sw"),
        attack("g2", "sw"),
        endTurn,
        endTurn,
        rally("b"),
        attack("g1", "gd"),
        endTurn,
        endTurn,
        rally("b"),
        attack("g1", "gd"),
      ],
    ),
    "",
    "#### The Tractor Beam",
    "",
    ...play(
      "A Guard in a Forest three tiles from two Ray Gunners (the Humans own Forestry): a Saucer flies up and pulls it one tile into the open and into range",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(3, 4), tag: "r1" },
        { seat: 0, role: "MARKSMAN", at: at(5, 4), tag: "r2" },
        { seat: 0, role: "RAIDER", at: at(7, 4), tag: "s" },
        { seat: 1, role: "GUARD", at: at(4, 1), tag: "guard" },
      ],
      [
        attack("r1", "guard"),
        move("s", at(6, 3), at(5, 3), at(4, 3)),
        pull("s", "guard"),
        attack("r1", "guard"),
        attack("r2", "guard"),
      ],
      { forest: [at(4, 1)] },
    ),
    ...play(
      "The pulled unit's owner sees from the tile it lands on: the same pull of a Marksman whose owner has not explored the three rows behind the Saucer",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: at(4, 3), tag: "s" },
        { seat: 1, role: "MARKSMAN", at: at(4, 1), tag: "m" },
      ],
      [pull("s", "m")],
      {
        unexplored: {
          seat: 1,
          tiles: [3, 4, 5].flatMap((y) =>
            [0, 1, 2, 3, 4, 5, 6, 7, 8].map((x) => at(x, y)),
          ),
        },
      },
    ),
    ...play(
      "A Swordsman holds a walled city center. A Tripod fires at it; then (another game) a Mothership three tiles away pulls it two tiles off the center, the same Tripod and two Grunts fire, and a Grunt walks onto the empty center",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(2, 5), tag: "ms" },
        { seat: 0, role: "CATAPULT", at: at(4, 6), tag: "t" },
        { seat: 0, role: "FIGHTER", at: at(1, 5), tag: "g1" },
        { seat: 0, role: "FIGHTER", at: at(3, 5), tag: "g2" },
        { seat: 0, role: "FIGHTER", at: at(3, 7), tag: "g3" },
        { seat: 1, role: "SWORDSMAN", at: at(2, 8), tag: "sw" },
      ],
      [
        pull("ms", "sw"),
        attack("t", "sw"),
        attack("g1", "sw"),
        attack("g2", "sw"),
        move("g3", at(2, 8)),
      ],
      { walls: true },
    ),
    ...play(
      "The same Tripod's shot at the Swordsman on its walled center, without the pull",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(2, 6), tag: "t" },
        { seat: 1, role: "SWORDSMAN", at: at(2, 8), tag: "sw" },
      ],
      [attack("t", "sw")],
      { walls: true },
    ),
    ...play(
      "The same shot with the Disintegrator, and a Marksman standing behind the Swordsman (Pierce)",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(2, 6), tag: "t" },
        { seat: 1, role: "SWORDSMAN", at: at(2, 8), tag: "sw" },
        { seat: 1, role: "MARKSMAN", at: at(2, 9), tag: "m" },
      ],
      [attack("t", "sw")],
      { walls: true, explosives: [true, false] },
    ),
    ...play(
      "A Colossus at a Guard on a walled center: without the Disintegrator, two turns",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(2, 6), tag: "c" },
        { seat: 1, role: "GUARD", at: at(2, 8), tag: "g" },
      ],
      [attack("c", "g"), endTurn, endTurn, attack("c", "g")],
      { walls: true },
    ),
    ...play(
      "A Saucer flies three tiles, sets a Grunt from two tiles behind it down in front, and the Grunt shoots (Beam Down)",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: at(2, 3), tag: "s" },
        { seat: 0, role: "FIGHTER", at: at(3, 4), tag: "g" },
        { seat: 1, role: "CATAPULT", at: at(8, 2), tag: "c" },
      ],
      [
        move("s", at(3, 3), at(4, 3), at(5, 3)),
        beam("s", "g", at(6, 2)),
        attack("g", "c"),
      ],
    ),
    "",
    "#### Mind Control",
    "",
    ...play(
      "A Ray Gunner's full ray leaves a Knight at 3 HP and the Brain two tiles away takes it; the Humans shoot the Brain",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4), tag: "r" },
        { seat: 0, role: "CAPTAIN", at: at(5, 4), tag: "b" },
        { seat: 1, role: "KNIGHT", at: at(4, 2), tag: "k" },
        { seat: 1, role: "MARKSMAN", at: at(5, 2), tag: "m1" },
        { seat: 1, role: "MARKSMAN", at: at(6, 2), tag: "m2" },
      ],
      [
        attack("r", "k"),
        control("b", "k"),
        endTurn,
        attack("m1", "b"),
        attack("m2", "b"),
      ],
    ),
    ...play(
      "The same, and the Brain is out of the Marksmen's reach: next turn the Knight rides for the Martians",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(4, 4), tag: "r" },
        { seat: 0, role: "CAPTAIN", at: at(3, 4), tag: "b" },
        { seat: 1, role: "KNIGHT", at: at(4, 2), tag: "k" },
        { seat: 1, role: "MARKSMAN", at: at(6, 1), tag: "m1" },
        { seat: 1, role: "MARKSMAN", at: at(7, 1), tag: "m2" },
      ],
      [
        attack("r", "k"),
        control("b", "k"),
        endTurn,
        endTurn,
        move("k", at(5, 2)),
        attack("k", "m1"),
        attack("k", "m2"),
      ],
    ),
    ...play(
      "A Brain cannot take a healthy unit, or one at 7 HP",
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 4), tag: "b" },
        { seat: 1, role: "KNIGHT", at: at(4, 2), tag: "k" },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2), hp: 7, tag: "sw" },
      ],
      [control("b", "k"), control("b", "sw")],
    ),
    ...play(
      "A Grunt's shot leaves a Lich at 4 HP and the Brain takes it; next turn it fires at its old line (no Plague: the Martians own no Pestilence)",
      ["MARTIAN", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 4), tag: "g" },
        { seat: 0, role: "CAPTAIN", at: at(5, 4), tag: "b" },
        { seat: 1, role: "CATAPULT", at: at(4, 2), tag: "l" },
        { seat: 1, role: "FIGHTER", at: at(3, 0), tag: "s1" },
        { seat: 1, role: "FIGHTER", at: at(4, 0), tag: "s2" },
        { seat: 1, role: "FIGHTER", at: at(5, 0), tag: "s3" },
      ],
      [
        attack("g", "l"),
        control("b", "l"),
        endTurn,
        endTurn,
        attack("l", "s2"),
      ],
    ),
    ...play(
      "A Grunt's shot leaves a Scrap Buggy at 4 HP and the Brain takes it; next turn it drives among the Goblins and Kabooms",
      ["MARTIAN", "GOBLIN"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 4), tag: "g" },
        { seat: 0, role: "CAPTAIN", at: at(5, 4), tag: "b" },
        { seat: 1, role: "KNIGHT", at: at(4, 2), tag: "sb" },
        { seat: 1, role: "FIGHTER", at: at(3, 0), tag: "g1" },
        { seat: 1, role: "MARKSMAN", at: at(4, 0), tag: "bc" },
        { seat: 1, role: "FIGHTER", at: at(5, 0), tag: "g2" },
      ],
      [
        attack("g", "sb"),
        control("b", "sb"),
        endTurn,
        endTurn,
        move("sb", at(4, 1)),
        kaboom("sb"),
      ],
    ),
    "",
    "#### Grunts, Ray Gunners, and the units that walk at them",
    "",
    ...battle(
      "Three Grunts (9 Coins) and four Fighters (8 Coins) four tiles apart: the Fighters advance, the Grunts stand and shoot",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 4, [3, 4, 5]),
        ...row(1, "FIGHTER", 0, [3, 4, 5, 6]),
      ],
      [{ mode: "SHOOT" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1 },
    ),
    ...battle(
      "The same, and a Grunt with a Fighter beside it steps back one tile before it shoots",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 4, [3, 4, 5]),
        ...row(1, "FIGHTER", 0, [3, 4, 5, 6]),
      ],
      [{ mode: "KITE" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1 },
    ),
    ...battle(
      "Four Grunts (12 Coins) and six Fighters (12 Coins): the Fighters advance, the Grunts stand and shoot",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 4, [3, 4, 5, 6]),
        ...row(1, "FIGHTER", 0, [2, 3, 4, 5, 6, 7]),
      ],
      [{ mode: "SHOOT" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1 },
    ),
    ...battle(
      "Three Ray Gunners (12 Coins) in the place of the four Grunts, against the same six Fighters",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "MARKSMAN", 4, [3, 4, 5]),
        ...row(1, "FIGHTER", 0, [2, 3, 4, 5, 6, 7]),
      ],
      [{ mode: "SHOOT" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1 },
    ),
    ...battle(
      "The same three Ray Gunners with Heat Sinks (no Cooling: full power every turn they do not move)",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "MARKSMAN", 4, [3, 4, 5]),
        ...row(1, "FIGHTER", 0, [2, 3, 4, 5, 6, 7]),
      ],
      [{ mode: "SHOOT" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1, heatSinks: true },
    ),
    ...battle(
      "Four Grunts (12 Coins) and three Marksmen (12 Coins) shoot at each other from two tiles; nobody moves",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 3, [3, 4, 5, 6]),
        ...row(1, "MARKSMAN", 1, [3, 4, 5]),
      ],
      [{ mode: "SHOOT" }, { mode: "SHOOT" }],
      12,
    ),
    ...battle(
      "Five Grunts (15 Coins) and three Swordsmen (15 Coins) four tiles apart: the Swordsmen advance, the Grunts step back from a unit beside them and shoot",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 4, [2, 3, 4, 5, 6]),
        ...row(1, "SWORDSMAN", 0, [3, 4, 5]),
      ],
      [{ mode: "KITE" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1 },
    ),
    ...battle(
      "Four Grunts and a Shield Projector behind them with Force Fields (16 Coins, Shield 4) against six Fighters and two Marksmen (20 Coins) that advance",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 4, [3, 4, 5, 6], { shield: 4 }),
        { seat: 0, role: "GUARD", at: at(4, 5) },
        ...row(1, "FIGHTER", 0, [2, 3, 4, 5, 6, 7]),
        ...row(1, "MARKSMAN", 0, [1, 8]),
      ],
      [{ mode: "SHOOT" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1 },
    ),
    ...battle(
      "The same five without Force Fields (the Projector is a body: Shield 2 on the Grunts)",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 4, [3, 4, 5, 6]),
        { seat: 0, role: "GUARD", at: at(4, 5) },
        ...row(1, "FIGHTER", 0, [2, 3, 4, 5, 6, 7]),
        ...row(1, "MARKSMAN", 0, [1, 8]),
      ],
      [{ mode: "SHOOT" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1, lacks: [["FORTIFICATION"], []] },
    ),
    ...battle(
      "The same four Grunts without the Projector (12 Coins) against the same eight",
      ["MARTIAN", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 4, [3, 4, 5, 6]),
        ...row(1, "FIGHTER", 0, [2, 3, 4, 5, 6, 7]),
        ...row(1, "MARKSMAN", 0, [1, 8]),
      ],
      [{ mode: "SHOOT" }, { mode: "ADVANCE" }],
      12,
      { activeSeat: 1 },
    ),
    "",
    "#### The Undead against Grunts",
    "",
    ...battle(
      "Five Zombies walk at five Grunts that stand and shoot (15 Coins each; the Undead move first, four tiles away)",
      ["UNDEAD", "MARTIAN"],
      [
        ...row(0, "GUARD", 5, [2, 3, 4, 5, 6]),
        ...row(1, "FIGHTER", 1, [2, 3, 4, 5, 6]),
      ],
      [{ mode: "ADVANCE" }, { mode: "SHOOT" }],
      14,
    ),
    ...battle(
      "Seven Skeletons (14 Coins) walk at five Grunts (15 Coins) that stand and shoot (Bones: a Grunt's shot from two tiles deals a Skeleton 4)",
      ["UNDEAD", "MARTIAN"],
      [
        ...row(0, "FIGHTER", 5, [1, 2, 3, 4, 5, 6, 7]),
        ...row(1, "FIGHTER", 1, [2, 3, 4, 5, 6]),
      ],
      [{ mode: "ADVANCE" }, { mode: "SHOOT" }],
      14,
    ),
    ...play(
      "A Zombie that stands beside a Grunt bites it through its Shield, and a Skeleton finishes it: it rises",
      ["UNDEAD", "MARTIAN"],
      [
        { seat: 0, role: "GUARD", at: at(4, 3), tag: "z" },
        { seat: 0, role: "FIGHTER", at: at(5, 3), tag: "s" },
        { seat: 1, role: "FIGHTER", at: at(4, 2), tag: "g" },
      ],
      [attack("z", "g"), attack("s", "g")],
    ),
    ...play(
      "The same bite on a Grunt in a Force Field (Shield 4): it loses 1 HP and is Bitten all the same; a Banshee's Wail on three Grunts",
      ["UNDEAD", "MARTIAN"],
      [
        { seat: 0, role: "GUARD", at: at(4, 3), tag: "z" },
        { seat: 0, role: "MARKSMAN", at: at(6, 4), tag: "b" },
        { seat: 1, role: "FIGHTER", at: at(4, 2), shield: 4, tag: "g" },
        { seat: 1, role: "FIGHTER", at: at(5, 2), tag: "g2" },
        { seat: 1, role: "FIGHTER", at: at(6, 2), tag: "g3" },
      ],
      [attack("z", "g"), wailStep("b")],
    ),
    ...play(
      "A Lich (with Pestilence) fires at the middle of three Grunts, Shield 2; then at three in a Force Field",
      ["UNDEAD", "MARTIAN"],
      [
        { seat: 0, role: "CATAPULT", at: at(4, 4), tag: "l" },
        { seat: 0, role: "CATAPULT", at: at(4, 8), tag: "l2" },
        { seat: 1, role: "FIGHTER", at: at(3, 1), tag: "a1" },
        { seat: 1, role: "FIGHTER", at: at(4, 1), tag: "a2" },
        { seat: 1, role: "FIGHTER", at: at(5, 1), tag: "a3" },
        { seat: 1, role: "FIGHTER", at: at(3, 5), shield: 4, tag: "b1" },
        { seat: 1, role: "FIGHTER", at: at(4, 5), shield: 4, tag: "b2" },
        { seat: 1, role: "FIGHTER", at: at(5, 5), shield: 4, tag: "b3" },
      ],
      [attack("l", "a2"), attack("l2", "b2")],
      { explosives: [true, false] },
    ),
    "",
    "#### The Goblins against Shields",
    "",
    ...play(
      "Three Bomb Chuckers throw at the middle of three Grunts, Shield 2",
      ["GOBLIN", "MARTIAN"],
      [
        ...row(0, "MARKSMAN", 3, [3, 4, 5]).map((piece, index) => ({
          ...piece,
          tag: `bc${index + 1}`,
        })),
        { seat: 1, role: "FIGHTER", at: at(3, 1), tag: "g1" },
        { seat: 1, role: "FIGHTER", at: at(4, 1), tag: "g2" },
        { seat: 1, role: "FIGHTER", at: at(5, 1), tag: "g3" },
      ],
      [attack("bc1", "g2"), attack("bc2", "g2"), attack("bc3", "g2")],
    ),
    ...play(
      "The same three bombs on three Grunts in a Force Field (Shield 4)",
      ["GOBLIN", "MARTIAN"],
      [
        ...row(0, "MARKSMAN", 3, [3, 4, 5]).map((piece, index) => ({
          ...piece,
          tag: `bc${index + 1}`,
        })),
        { seat: 1, role: "FIGHTER", at: at(3, 1), shield: 4, tag: "g1" },
        { seat: 1, role: "FIGHTER", at: at(4, 1), shield: 4, tag: "g2" },
        { seat: 1, role: "FIGHTER", at: at(5, 1), shield: 4, tag: "g3" },
        { seat: 1, role: "GUARD", at: at(4, 0), tag: "p" },
      ],
      [attack("bc1", "g2"), attack("bc2", "g2"), attack("bc3", "g2")],
    ),
    ...play(
      "A Rocket Cart with a Goblin beside the target and WAAAGH! fires at a Shield Projector, and a second one at a Grunt in its Force Field; the Goblin Kabooms",
      ["GOBLIN", "MARTIAN"],
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 5), tag: "w" },
        { seat: 0, role: "CATAPULT", at: at(4, 4), tag: "rc1" },
        { seat: 0, role: "CATAPULT", at: at(5, 4), tag: "rc2" },
        { seat: 0, role: "FIGHTER", at: at(4, 2), tag: "gob" },
        { seat: 1, role: "GUARD", at: at(4, 1), tag: "p" },
        { seat: 1, role: "FIGHTER", at: at(5, 1), shield: 4, tag: "g" },
        { seat: 1, role: "FIGHTER", at: at(3, 1), shield: 4, tag: "g2" },
      ],
      [rally("w"), attack("rc1", "p"), attack("rc2", "g"), kaboom("gob")],
    ),
    ...play(
      "Two Goblins (Gang Up) and a charging Wolf Rider on a Grunt, Shield 2",
      ["GOBLIN", "MARTIAN"],
      [
        { seat: 0, role: "FIGHTER", at: at(3, 2), tag: "a" },
        { seat: 0, role: "FIGHTER", at: at(5, 2), tag: "b" },
        { seat: 0, role: "RAIDER", at: at(4, 4), tag: "w" },
        { seat: 1, role: "FIGHTER", at: at(4, 1), tag: "g" },
        { seat: 1, role: "FIGHTER", at: at(4, 0), tag: "g2" },
      ],
      [attack("a", "g"), attack("b", "g"), move("w", at(4, 3), at(4, 2))],
    ),
  );
  return lines;
}
