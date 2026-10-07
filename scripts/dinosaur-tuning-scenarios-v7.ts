import type {
  DinosaurPieceV7,
  DinosaurScenarioHelpersV7,
} from "./dinosaur-tuning-analysis-v7";

/**
 * The played scenarios of the Dinosaur pass (`pulp_wars-w49.15`,
 * docs/product/RULESET_7_TUNING_DINOSAUR.md section 2): the mechanics a
 * matchup matrix cannot show. `play` resolves listed commands; `battle`
 * plays whole turns by a fixed script (stated in each title). Every tile is
 * open Grass unless the scenario says otherwise. Health reads HP/maximum; a
 * dinosaur reads "Big" or "Alpha" before its name. Neither side owns
 * Explosives (no Breach, no Wallbreaker) unless the title says so.
 */
export function dinosaurScenariosV7(h: DinosaurScenarioHelpersV7): string[] {
  const { play, battle, attack, move, endTurn, note, at } = h;
  const { rally, tend, kaboom, lay, hatch, pull, control } = h;
  const row = (
    seat: number,
    role: DinosaurPieceV7["role"],
    y: number,
    xs: readonly number[],
    extra: Partial<DinosaurPieceV7> = {},
  ): DinosaurPieceV7[] =>
    xs.map((x) => ({ seat, role, at: at(x, y), ...extra }));
  const lines: string[] = [];

  // ---------------------------------------------------- the Knight ---
  // A Knight rides into a line of five; `middle` is the unit in the middle.
  const knightChain = (
    title: string,
    middle: DinosaurPieceV7["role"],
    stage: 0 | 1,
    answer: readonly ReturnType<typeof attack>[],
  ): string[] =>
    play(
      title,
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(2, 3), tag: "c1" },
        { seat: 0, role: "RAIDER", at: at(3, 3), tag: "r", stage },
        { seat: 0, role: middle, at: at(4, 3), tag: "mid" },
        { seat: 0, role: "MARKSMAN", at: at(5, 3), tag: "s", stage },
        { seat: 0, role: "FIGHTER", at: at(6, 3), tag: "c2" },
        { seat: 1, role: "KNIGHT", at: at(1, 0), tag: "k" },
      ],
      [
        move("k", at(1, 1), at(1, 2)),
        attack("k", "c1"),
        attack("k", "r"),
        attack("k", "mid"),
        attack("k", "s"),
        attack("k", "c2"),
        endTurn,
        ...(answer.length === 0 ? [] : [note("The Dinosaurs answer")]),
        ...answer,
      ],
      { activeSeat: 1 },
    );
  lines.push(
    "#### A Knight rides into a line of five",
    "",
    ...knightChain(
      "A young line: Caveman, Raptor, Caveman, Spitter, Caveman",
      "FIGHTER",
      0,
      [],
    ),
    ...knightChain(
      "The same line with an Ankylosaurus in the middle",
      "GUARD",
      0,
      [attack("mid", "k"), attack("s", "k")],
    ),
    ...knightChain(
      "The same line grown: a Big Raptor, an Ankylosaurus, a Big Spitter",
      "GUARD",
      1,
      [attack("r", "k"), move("c2", at(5, 2)), move("s", at(4, 2))],
    ),
    "",
  );

  // ------------------------------------------------------ the nest ---
  // The Dinosaur capital is seat 1's, at (2, 8); its nest tiles are the
  // eight tiles around it.
  const nest = (
    title: string,
    garrison: DinosaurPieceV7["role"] | null,
    nesting: boolean,
  ): string[] =>
    play(
      title,
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "KNIGHT", at: at(4, 4), tag: "k" },
        ...(garrison === null
          ? []
          : [
              {
                seat: 1,
                role: garrison,
                at: at(2, 8),
                tag: "g",
              } as DinosaurPieceV7,
            ]),
      ],
      [
        move("k", at(4, 5), at(4, 6)),
        attack("k", "e1"),
        attack("k", "e2"),
        attack("k", "e3"),
        attack("k", "g"),
      ],
      {
        eggs: [
          { seat: 1, role: "CATAPULT", at: at(3, 7), tag: "e1", nesting },
          { seat: 1, role: "KNIGHT", at: at(2, 7), tag: "e2", nesting },
          { seat: 1, role: "GUARD", at: at(1, 7), tag: "e3", nesting },
        ],
      },
    );
  lines.push(
    "#### A Knight at a nest",
    "",
    ...nest(
      "Three Eggs (Triceratops, T-Rex, Ankylosaurus: 27 Coins) north of a capital with a Caveman on it",
      "FIGHTER",
      false,
    ),
    ...nest(
      "The same Eggs laid with Nesting (10 HP), an Ankylosaurus on the capital",
      "GUARD",
      true,
    ),
    "",
    "#### An Egg laid and hatched under pressure",
    "",
    ...play(
      "A Triceratops Egg laid without Nesting (6 HP, two turns) with a Human Raider five tiles from the nest; nothing guards it",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8), tag: "c" },
        { seat: 1, role: "RAIDER", at: at(8, 3), tag: "raider" },
      ],
      [
        lay("CATAPULT", at(8, 7), "egg"),
        endTurn,
        move("raider", at(8, 4), at(8, 5)),
        endTurn,
        note("The Egg needs one more turn"),
        endTurn,
        move("raider", at(8, 6)),
        attack("raider", "egg"),
      ],
      { coins: 20, lacks: [["FORTIFICATION"], []] },
    ),
    ...play(
      "The same Egg laid with Nesting (10 HP, still two turns since the correction): the Raider's hit leaves it at 4 and it hatches",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8), tag: "c" },
        { seat: 1, role: "RAIDER", at: at(8, 3), tag: "raider" },
      ],
      [
        lay("CATAPULT", at(8, 7), "egg"),
        endTurn,
        move("raider", at(8, 4), at(8, 5)),
        endTurn,
        note("The Egg needs one more turn"),
        endTurn,
        move("raider", at(8, 6)),
        attack("raider", "egg"),
        endTurn,
        note("The Triceratops has hatched beside the Raider"),
        attack("egg", "raider"),
      ],
      { coins: 20 },
    ),
    ...play(
      "An Ankylosaurus Egg (two turns) without Nesting and a Shaman beside the nest: hatched in the Dinosaurs' second turn, before the Raider arrives",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(7, 7), tag: "shaman" },
        { seat: 1, role: "RAIDER", at: at(8, 3), tag: "raider" },
      ],
      [
        lay("GUARD", at(8, 7), "egg"),
        endTurn,
        move("raider", at(8, 4), at(8, 5)),
        endTurn,
        hatch("shaman", "egg"),
        endTurn,
        move("raider", at(8, 6)),
        attack("raider", "egg"),
      ],
      { coins: 20, lacks: [["FORTIFICATION"], []] },
    ),
    ...play(
      "A T-Rex Egg (14 Coins, four turns with or without Nesting; here 6 HP) and a Shaman: laid in turn 1, hatched in turn 2, the T-Rex acts in turn 3",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(7, 8), tag: "shaman" },
        { seat: 1, role: "FIGHTER", at: at(8, 4), tag: "f" },
      ],
      [
        lay("KNIGHT", at(8, 7), "egg"),
        hatch("shaman", "egg"),
        endTurn,
        move("f", at(8, 5)),
        endTurn,
        move("shaman", at(7, 7)),
        hatch("shaman", "egg"),
        attack("egg", "f"),
        endTurn,
        move("f", at(8, 6)),
        attack("f", "egg"),
        endTurn,
        attack("egg", "f"),
      ],
      { coins: 20, lacks: [["FORTIFICATION"], []] },
    ),
    "",
  );

  // ---------------------------------------------------- growth ---
  lines.push(
    "#### Growing in the middle of a fight",
    "",
    ...play(
      "A T-Rex at 10 of 28 HP beside a full-HP Fighter: wounded, it kills nothing",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(2, 3), tag: "t", hp: 10 },
        { seat: 1, role: "FIGHTER", at: at(3, 3), tag: "f" },
      ],
      [attack("t", "f")],
    ),
    ...play(
      "The same T-Rex beside a Fighter at 5 HP, then a Marksman, a Raider, and a Guard in a row: the first kill heals it",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "KNIGHT", at: at(2, 3), tag: "t", hp: 10 },
        { seat: 1, role: "FIGHTER", at: at(3, 3), tag: "f", hp: 5 },
        { seat: 1, role: "MARKSMAN", at: at(4, 3), tag: "m" },
        { seat: 1, role: "RAIDER", at: at(5, 3), tag: "r" },
        { seat: 1, role: "GUARD", at: at(6, 3), tag: "g" },
      ],
      [
        attack("t", "f"),
        attack("t", "m"),
        attack("t", "r"),
        attack("t", "g"),
        endTurn,
        note("The Guard strikes back at the Alpha T-Rex"),
        attack("g", "t"),
      ],
    ),
    ...play(
      "A Triceratops charges a Fighter (one tile of run-up), grows, and takes the answer of two Swordsmen",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(2, 3), tag: "t" },
        { seat: 1, role: "FIGHTER", at: at(4, 3), tag: "f" },
        { seat: 1, role: "SWORDSMAN", at: at(5, 2), tag: "s1" },
        { seat: 1, role: "SWORDSMAN", at: at(5, 4), tag: "s2" },
      ],
      [
        move("t", at(3, 3)),
        attack("t", "f"),
        endTurn,
        attack("s1", "t"),
        attack("s2", "t"),
      ],
    ),
    "",
  );

  // ----------------------------------------- Charge! and Wallbreaker ---
  const adv = [{ mode: "ADVANCE" }, { mode: "ADVANCE" }] as const;
  const charge = (title: string, wallbreaker: boolean): string[] =>
    battle(
      title,
      ["DINOSAUR", "ORIGINAL"],
      [
        ...row(0, "CATAPULT", 5, [3, 5, 7]),
        ...row(1, "SWORDSMAN", 2, [3, 4, 5, 6, 7]),
      ],
      adv,
      8,
      wallbreaker ? { explosives: [true, false] } : {},
    );
  lines.push(
    "#### The Triceratops before and after Wallbreaker",
    "",
    "Both sides walk at each other and attack what they reach, the dearest kill first. The Dinosaurs move first from three tiles, so every Triceratops charges after two tiles.",
    "",
    ...charge(
      "3 Triceratops (24 Coins) against 5 Swordsmen (25), without Wallbreaker (run-up +1)",
      false,
    ),
    ...charge(
      "The same with Wallbreaker (run-up +2): the rule before this pass",
      true,
    ),
    ...battle(
      "Triceratops, Ankylosaurus, 2 Spitters, Raptor (25 Coins) against the 5 Swordsmen, without Wallbreaker",
      ["DINOSAUR", "ORIGINAL"],
      [
        ...row(0, "CATAPULT", 5, [5]),
        ...row(0, "GUARD", 5, [4]),
        ...row(0, "MARKSMAN", 6, [3, 6]),
        ...row(0, "RAIDER", 5, [7]),
        ...row(1, "SWORDSMAN", 2, [3, 4, 5, 6, 7]),
      ],
      adv,
      8,
    ),
    ...battle(
      "12 Cavemen (24 Coins) against the 5 Swordsmen: no dinosaur, no Pack Hunt",
      ["DINOSAUR", "ORIGINAL"],
      [
        ...row(0, "FIGHTER", 5, [2, 3, 4, 5, 6, 7]),
        ...row(0, "FIGHTER", 6, [2, 3, 4, 5, 6, 7]),
        ...row(1, "SWORDSMAN", 2, [3, 4, 5, 6, 7]),
      ],
      adv,
      8,
    ),
    ...battle(
      "3 Triceratops (24 Coins) against 2 Swordsmen, 2 Marksmen, and a Catapult (26), without Wallbreaker; the Humans four tiles away move second and so strike first",
      ["DINOSAUR", "ORIGINAL"],
      [
        ...row(0, "CATAPULT", 6, [3, 5, 7]),
        ...row(1, "SWORDSMAN", 2, [4, 6]),
        ...row(1, "MARKSMAN", 1, [3, 7]),
        ...row(1, "CATAPULT", 1, [5]),
      ],
      adv,
      8,
    ),
    ...battle(
      "T-Rex, Triceratops, Caveman (24 Coins) against 3 Fighters, 2 Marksmen, a Guard, and a Catapult (25): a line the T-Rex can Rampage through",
      ["DINOSAUR", "ORIGINAL"],
      [
        ...row(0, "KNIGHT", 5, [5]),
        ...row(0, "CATAPULT", 5, [3]),
        ...row(0, "FIGHTER", 5, [7]),
        ...row(1, "FIGHTER", 2, [3, 5, 7]),
        ...row(1, "GUARD", 2, [4]),
        ...row(1, "MARKSMAN", 1, [4, 6]),
        ...row(1, "CATAPULT", 1, [5]),
      ],
      adv,
      8,
    ),
    "",
    "#### Pack Hunt",
    "",
    ...play(
      "A Triceratops charges a Swordsman after one tile; a Caveman beside it finishes the Swordsman",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: at(2, 3), tag: "t" },
        { seat: 0, role: "FIGHTER", at: at(3, 4), tag: "c" },
        { seat: 1, role: "SWORDSMAN", at: at(4, 3), tag: "s" },
      ],
      [
        move("t", at(3, 3)),
        attack("t", "s"),
        move("c", at(4, 4)),
        attack("c", "s"),
      ],
    ),
    ...play(
      "A Spitter spits at a Swordsman from two tiles; the Caveman on its far side has Pack Hunt against the hunted unit (the correction)",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 3), tag: "sp" },
        { seat: 0, role: "FIGHTER", at: at(5, 3), tag: "c" },
        { seat: 1, role: "SWORDSMAN", at: at(4, 3), tag: "s" },
      ],
      [attack("sp", "s"), attack("c", "s")],
    ),
    ...play(
      "The same Caveman on a Swordsman with no dinosaur near: no bonus",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(3, 3), tag: "c" },
        { seat: 1, role: "SWORDSMAN", at: at(4, 3), tag: "s" },
      ],
      [attack("c", "s")],
    ),
    ...play(
      "War Drums and Pack Hunt: two Cavemen beside a Raptor kill a Fighter between them (a Triceratops and a Shaman take no War Drums)",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(2, 3), tag: "sh" },
        { seat: 0, role: "FIGHTER", at: at(3, 2), tag: "c1" },
        { seat: 0, role: "FIGHTER", at: at(3, 4), tag: "c2" },
        { seat: 0, role: "RAIDER", at: at(4, 2), tag: "r" },
        { seat: 1, role: "FIGHTER", at: at(4, 3), tag: "f" },
      ],
      [rally("sh"), attack("c1", "f"), attack("c2", "f")],
    ),
    "",
    "#### Tend Wounded",
    "",
    ...play(
      "A Shaman tends a Triceratops at 8 HP and a Caveman at 4 HP beside it: 4 to the dinosaur, 2 to the Caveman (the correction)",
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: at(3, 3), tag: "sh" },
        { seat: 0, role: "CATAPULT", at: at(4, 3), hp: 8, tag: "t" },
        { seat: 0, role: "FIGHTER", at: at(3, 4), hp: 4, tag: "c" },
        { seat: 1, role: "FIGHTER", at: at(9, 9), tag: "f" },
      ],
      [tend("sh")],
    ),
    "",
  );

  // ----------------------------------------------------- the Undead ---
  lines.push(
    "#### Zombies and large dinosaurs",
    "",
    ...play(
      "A T-Rex attacks a Zombie in a row of three; the Zombies answer; a Shaman tends",
      ["DINOSAUR", "UNDEAD"],
      [
        { seat: 0, role: "KNIGHT", at: at(2, 3), tag: "t" },
        { seat: 0, role: "CAPTAIN", at: at(1, 3), tag: "sh" },
        { seat: 1, role: "GUARD", at: at(3, 3), tag: "z1" },
        { seat: 1, role: "GUARD", at: at(3, 2), tag: "z2" },
        { seat: 1, role: "GUARD", at: at(3, 4), tag: "z3" },
      ],
      [
        attack("t", "z1"),
        endTurn,
        attack("z1", "t"),
        attack("z2", "t"),
        attack("z3", "t"),
        endTurn,
        tend("sh"),
        attack("t", "z1"),
        attack("t", "z2"),
      ],
    ),
    ...play(
      "A Bitten Triceratops at 6 HP is killed by a Skeleton: it rises as a Zombie, which fills one slot, not two",
      ["UNDEAD", "DINOSAUR"],
      [
        { seat: 0, role: "GUARD", at: at(3, 4), tag: "z" },
        { seat: 0, role: "FIGHTER", at: at(3, 2), tag: "sk" },
        { seat: 1, role: "CATAPULT", at: at(4, 3), tag: "t", hp: 6 },
      ],
      [attack("sk", "t")],
      { bitten: [at(4, 3)] },
    ),
    ...battle(
      "3 Triceratops (24 Coins) against 8 Zombies (24), without Wallbreaker; the Dinosaurs move first",
      ["DINOSAUR", "UNDEAD"],
      [
        ...row(0, "CATAPULT", 5, [3, 5, 7]),
        ...row(1, "GUARD", 2, [2, 3, 4, 5, 6, 7, 8]),
        ...row(1, "GUARD", 1, [5]),
      ],
      adv,
      8,
    ),
    "",
  );

  // --------------------------------------------------- the Martians ---
  lines.push(
    "#### Martian pulls and Mind Control",
    "",
    ...play(
      "A Brain tries a T-Rex at 5 HP, a Triceratops at 5 HP, and an Ankylosaurus at 6 HP; a Saucer tries to pull a T-Rex and pulls a Raptor",
      ["MARTIAN", "DINOSAUR"],
      [
        { seat: 0, role: "CAPTAIN", at: at(3, 3), tag: "brain" },
        { seat: 0, role: "RAIDER", at: at(3, 6), tag: "saucer" },
        { seat: 1, role: "KNIGHT", at: at(5, 2), tag: "trex", hp: 5 },
        { seat: 1, role: "CATAPULT", at: at(5, 3), tag: "tric", hp: 5 },
        { seat: 1, role: "GUARD", at: at(5, 4), tag: "anky", hp: 6 },
        { seat: 1, role: "KNIGHT", at: at(5, 6), tag: "trex2" },
        { seat: 1, role: "RAIDER", at: at(5, 7), tag: "raptor" },
      ],
      [
        control("brain", "trex"),
        control("brain", "tric"),
        control("brain", "anky"),
        pull("saucer", "trex2"),
        move("saucer", at(3, 7)),
        pull("saucer", "raptor"),
      ],
    ),
    ...battle(
      "3 Triceratops (24 Coins) against 5 Grunts and a Shield Projector with Force Fields (19), without Wallbreaker; the Dinosaurs move first from four tiles, the Martians shoot and step back",
      ["DINOSAUR", "MARTIAN"],
      [
        ...row(0, "CATAPULT", 6, [3, 5, 7]),
        ...row(1, "FIGHTER", 2, [3, 4, 6, 7]),
        ...row(1, "FIGHTER", 1, [5]),
        ...row(1, "GUARD", 2, [5]),
      ],
      [{ mode: "ADVANCE" }, { mode: "KITE" }],
      8,
    ),
    "",
  );

  // ---------------------------------------------------- the Goblins ---
  lines.push(
    "#### Goblin bombs and rockets on a nest",
    "",
    ...play(
      "A Bomb Chucker bombs the middle Egg of three (no Gang Up on a bomb); a Rocket Cart shoots the T-Rex Egg; a Goblin Kabooms beside two Eggs",
      ["GOBLIN", "DINOSAUR"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 5), tag: "bomb" },
        { seat: 0, role: "CATAPULT", at: at(1, 4), tag: "cart" },
        { seat: 0, role: "FIGHTER", at: at(3, 6), tag: "gob" },
        { seat: 1, role: "GUARD", at: at(2, 8), tag: "anky" },
      ],
      [attack("bomb", "e2"), attack("cart", "e3"), kaboom("gob")],
      {
        eggs: [
          { seat: 1, role: "CATAPULT", at: at(3, 7), tag: "e1" },
          { seat: 1, role: "GUARD", at: at(2, 7), tag: "e2" },
          { seat: 1, role: "KNIGHT", at: at(1, 7), tag: "e3" },
        ],
      },
    ),
    ...battle(
      "2 Triceratops and an Ankylosaurus (21 Coins) against 3 Orc Brutes, 3 Bomb Chuckers, and a Rocket Cart (25), without Wallbreaker; the Dinosaurs move first",
      ["DINOSAUR", "GOBLIN"],
      [
        ...row(0, "CATAPULT", 5, [3, 7]),
        ...row(0, "GUARD", 5, [5]),
        ...row(1, "GUARD", 2, [3, 5, 7]),
        ...row(1, "MARKSMAN", 1, [3, 5, 7]),
        ...row(1, "CATAPULT", 0, [5]),
      ],
      adv,
      8,
    ),
    "",
  );

  // ------------------------------------------------- the Catapult ---
  lines.push(
    "#### A Catapult at a nesting city",
    "",
    ...play(
      "A Catapult three tiles from a Triceratops Egg, a Guard in front of it; the Dinosaurs have a Raptor (Pounce) and a Spitter",
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "CATAPULT", at: at(6, 7), tag: "cat" },
        { seat: 0, role: "GUARD", at: at(5, 7), tag: "g" },
        { seat: 1, role: "GUARD", at: at(2, 8), tag: "anky" },
        { seat: 1, role: "RAIDER", at: at(3, 9), tag: "raptor" },
        { seat: 1, role: "MARKSMAN", at: at(3, 8), tag: "spit" },
      ],
      [
        attack("cat", "e1"),
        endTurn,
        note("The Dinosaurs answer: the Raptor goes round the Guard"),
        move("raptor", at(4, 9), at(5, 8)),
        attack("raptor", "cat"),
        move("spit", at(4, 8)),
        attack("spit", "g"),
      ],
      { eggs: [{ seat: 1, role: "CATAPULT", at: at(3, 7), tag: "e1" }] },
    ),
    "",
  );
  return lines;
}
