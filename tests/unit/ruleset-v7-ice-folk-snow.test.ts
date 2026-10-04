import { describe, expect, it } from "vitest";
import {
  isBlizzardV7,
  isSnowV7,
  queryPlayerCommandsV7,
  validatePlayerMovementPathV7,
  viewForV7,
  wailTargetsV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7, viewSnowV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  forestV7,
  kindsV7,
  moveV7,
  patchTileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// The Ice Folk revision (`pulp_wars-7g3.3`): derived Snow, the Blizzard, and
// Deep Winter (docs/product/RULESET_7_ICE_FOLK.md sections 6.1 to 6.6 and
// 10.7 to 10.10).

const move = (
  state: GameStateV7,
  from: CoordV7,
  ...path: CoordV7[]
): CommandV7 => ({
  kind: "MOVE",
  unitId: unitAtV7(state, from).id,
  path,
});
const moveReason = (state: GameStateV7, from: CoordV7, ...path: CoordV7[]) =>
  rejectedV7(state, move(state, from, ...path)).params.reason;
/**
 * Applies a legal `MOVE` along `path` and checks that the public query
 * offers a Move to the same destination (it offers one path per tile).
 */
const walk = (state: GameStateV7, from: CoordV7, ...path: CoordV7[]) => {
  const result = applyOkV7(
    state,
    activeIdV7(state),
    move(state, from, ...path),
  );
  const to = path.at(-1) as CoordV7;
  const unitId = unitAtV7(state, from).id;
  expect(
    queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))).some(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === unitId &&
        command.path.at(-1)?.x === to.x &&
        command.path.at(-1)?.y === to.y,
    ),
    `MOVE to ${to.x},${to.y} offered`,
  ).toBe(true);
  return result;
};
const snowSet = (state: GameStateV7): readonly string[] =>
  state.board.tiles
    .filter((tile) => isSnowV7(state, tile.at))
    .map((tile) => `${tile.at.x},${tile.at.y}`)
    .sort();
const square = (x0: number, x1: number, y0: number, y1: number) => {
  const result: string[] = [];
  for (let x = x0; x <= x1; x += 1)
    for (let y = y0; y <= y1; y += 1) result.push(`${x},${y}`);
  return result.sort();
};

describe("which tiles are Snow (section 6.1)", () => {
  it("is the Ice Folk territory, the Deep Winter ring, and every Witch's Blizzard; never water", () => {
    const territory = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: [] } },
    );
    expect(snowSet(territory)).toEqual(square(7, 9, 7, 9));
    // Deep Winter: neutral land within 2 of the center (6..10, 6..10), never
    // another player's territory.
    const deep = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: ["DRILL", "FORTIFICATION"] } },
    );
    expect(snowSet(deep)).toEqual(square(6, 10, 6, 10));
    // A Witch: her tile and the eight around it, on any ground, with water
    // excluded from Snow but included in the Blizzard.
    const witch = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: [] }, water: [at(5, 2)] },
    );
    expect(snowSet(witch)).toEqual(
      [...square(7, 9, 7, 9), ...square(3, 5, 2, 4)]
        .filter((key) => key !== "5,2")
        .sort(),
    );
    expect(isBlizzardV7(witch, at(5, 2))).toBe(true);
    expect(isBlizzardV7(witch, at(6, 2))).toBe(false);
    // Another seat's Ice Folk Snow is Snow for everyone; two sources do not
    // add up.
    expect(isSnowV7(witch, at(4, 3))).toBe(true);
  });

  it("follows the Witch's Move, her death, and her embarking, and never stores anything", () => {
    let state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: [] } },
    );
    expect(isSnowV7(state, at(3, 3))).toBe(true);
    state = moveV7(state, at(4, 3), [at(5, 3)]).state;
    expect(isSnowV7(state, at(3, 3))).toBe(false);
    expect(isSnowV7(state, at(6, 3))).toBe(true);
    // No stored Snow: the state's only Ice Folk list is `chilled`.
    expect(
      Object.keys(state).filter((key) => /snow|blizzard/i.test(key)),
    ).toEqual([]);
    // Dead: no Blizzard.
    const dying = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 3), hp: 1 },
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
      ],
      { techs: { 0: [] }, activeSeat: 1 },
    );
    const killed = attackV7(dying, at(5, 3), at(4, 3));
    expect(isSnowV7(killed.state, at(3, 3))).toBe(false);
    // Embarked: no Blizzard.
    const afloat = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 2), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: [] }, water: [at(4, 2)] },
    );
    expect(isSnowV7(afloat, at(4, 3))).toBe(false);
  });

  it("follows the owner: a captured Ice Folk city stops being Snow, a city the Ice Folk capture becomes Snow", () => {
    const state = iceFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(8, 8), captureEligible: true },
        { seat: 0, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1, techs: { 0: [] } },
    );
    expect(isSnowV7(state, at(7, 7))).toBe(true);
    const captured = playV7(state, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(8, 8)).id,
    });
    expect(isSnowV7(captured.state, at(7, 7))).toBe(false);
    const reverse = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true },
        { seat: 1, role: "FIGHTER", at: at(9, 1) },
      ],
      { techs: { 0: [] } },
    );
    expect(isSnowV7(reverse, at(1, 7))).toBe(false);
    const taken = playV7(reverse, {
      kind: "CAPTURE",
      unitId: unitAtV7(reverse, at(2, 8)).id,
    });
    expect(isSnowV7(taken.state, at(1, 7))).toBe(true);
  });
});

describe("Glide (section 6.2, 1)", () => {
  // `pulp_wars-1wy.3`: Glide is a step from Snow onto Snow (it was every
  // step that leaves Snow); ruleset-v7-balance-martian-ice.test.ts has the
  // village run and the Blizzard ball.
  it("a step from Snow onto Snow costs half: a Yeti moves two Snow tiles, a Sled four", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "RAIDER", at: at(7, 9) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: ["DRILL", "FORTIFICATION"] } },
    );
    // (7, 7) -> (8, 7) -> (9, 7): both steps are from Snow onto Snow.
    walk(state, at(7, 7), at(8, 7), at(9, 7));
    expect(moveReason(state, at(7, 7), at(8, 7), at(9, 7), at(10, 7))).toBe(
      "BUDGET_EXCEEDED",
    );
    // With Deep Winter (6-10, 6-10) is Snow: four Snow steps.
    walk(state, at(7, 9), at(8, 10), at(9, 10), at(10, 10), at(10, 9));
    // Without Deep Winter (10, x) is not Snow: the step off the Snow costs
    // a full point, so the fourth step is too much.
    const plain = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "RAIDER", at: at(7, 9) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: ["SCOUTING"] } },
    );
    expect(
      moveReason(plain, at(7, 9), at(8, 9), at(9, 9), at(10, 9), at(10, 10)),
    ).toBe("BUDGET_EXCEEDED");
    walk(plain, at(7, 9), at(8, 9), at(9, 9), at(10, 9));
  });

  it("the Sabretooth never Glides; a Road and Snow do not add up", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(7, 7) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: ["SCOUTING", "RAIDING", "CHIVALRY"] } },
    );
    // Move 3: four Snow steps would cost 8 half-points.
    expect(
      moveReason(state, at(7, 7), at(8, 7), at(9, 7), at(10, 7), at(10, 6)),
    ).toBe("BUDGET_EXCEEDED");
    walk(state, at(7, 7), at(8, 7), at(9, 7), at(10, 7));
  });

  it("a Witch's own Move reads the Snow from before the command", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: [] } },
    );
    // (4, 3) -> (5, 3) -> (5, 4): both tiles are in her Blizzard before the
    // command, so both steps cost half. (6, 3) is not Snow before the
    // command, whatever her Blizzard would cover after it: the step onto it
    // costs a full point (`pulp_wars-1wy.3`), so she leaves her Blizzard's
    // old footprint by one tile a turn.
    walk(state, at(4, 3), at(5, 3), at(5, 4));
    walk(state, at(4, 3), at(5, 3));
    expect(moveReason(state, at(4, 3), at(5, 3), at(6, 3))).toBe(
      "BUDGET_EXCEEDED",
    );
  });
});

describe("Snow cover (section 6.2, 2)", () => {
  it("an unfortified Ice Folk defender on Snow has cover x 1.25: a Fighter deals a Yeti 5, as in the open", () => {
    const snow = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 6) },
        { seat: 1, role: "FIGHTER", at: at(7, 5) },
      ],
      { activeSeat: 1, techs: { 0: ["DRILL", "FORTIFICATION"] } },
    );
    // `pulp_wars-1wy.3`: x 1.25 (`SNOW_COVER_V7`; x 1.5 gave 4 and 4): on
    // the formula's rounding a Yeti takes 5 and deals 3 back, as in the
    // open; the cover shows on the Mammoth and the Witch.
    expect(attackV7(snow, at(7, 5), at(7, 6)).combat).toMatchObject({
      damageToDefender: 5,
      damageToAttacker: 3,
      snowCover: true,
      defenseBonusNumerator: 5,
      defenseBonusDenominator: 4,
    });
    const open = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
      { activeSeat: 1, techs: { 0: [] } },
    );
    expect(attackV7(open, at(4, 3), at(4, 4)).combat).toMatchObject({
      damageToDefender: 5,
      snowCover: false,
    });
  });

  it("is not added to a Forest's cover, needs fortification 0, and Acid ignores it", () => {
    // A Snowy Forest: the Forest's x 1.5, not Snow cover (`pulp_wars-1wy.3`).
    const forest = forestV7(
      iceFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 1, role: "FIGHTER", at: at(6, 6) },
        ],
        { activeSeat: 1 },
      ),
      at(7, 7),
    );
    expect(attackV7(forest, at(6, 6), at(7, 7)).combat).toMatchObject({
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
      snowCover: false,
    });
    // Field Defense in own territory: fortified, no Snow cover.
    const fortified = patchTileV7(
      iceFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 1, role: "FIGHTER", at: at(6, 6) },
        ],
        { activeSeat: 1 },
      ),
      at(7, 7),
      { fieldDefense: true },
    );
    expect(attackV7(fortified, at(6, 6), at(7, 7)).combat).toMatchObject({
      fortificationLevel: 1,
      defenseBonusNumerator: 1,
      snowCover: false,
    });
    // A Spitter's Acid removes it.
    const acid = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 1, role: "MARKSMAN", at: at(6, 6) },
      ],
      { activeSeat: 1, factions: ["ICE_FOLK", "DINOSAUR"] },
    );
    expect(attackV7(acid, at(6, 6), at(7, 7)).combat).toMatchObject({
      acid: true,
      snowCover: false,
      defenseBonusNumerator: 1,
    });
    // Another faction's unit on Snow has no Snow cover.
    const human = iceFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
      ],
      { techs: { 0: [] } },
    );
    expect(attackV7(human, at(6, 6), at(7, 7)).combat.snowCover).toBe(false);
  });

  // `pulp_wars-1wy.3`: at x 1.25 a Yeti takes 2 on Snow too, so the
  // example is the Mammoth (Defense 2).
  it("counts for Wail (not an attack): 1 on a Mammoth on Snow, 2 in the open", () => {
    const state = iceFieldV7(
      [
        { seat: 1, role: "MARKSMAN", at: at(7, 5) },
        { seat: 0, role: "GUARD", at: at(7, 6) },
        { seat: 0, role: "GUARD", at: at(6, 4) },
      ],
      {
        factions: ["ICE_FOLK", "UNDEAD"],
        activeSeat: 1,
        techs: { 0: ["DRILL", "FORTIFICATION"] },
      },
    );
    const banshee = unitAtV7(state, at(7, 5));
    const targets = wailTargetsV7(state, banshee);
    expect(
      targets.map((entry) => [entry.at.x, entry.at.y, entry.damage]),
    ).toEqual([
      [6, 4, 2],
      [7, 6, 1],
    ]);
  });
});

describe("deep snow (section 6.2, 3)", () => {
  it("ends the Move of another faction's ground unit on entering Snow: SNOW_STOPS_MOVE", () => {
    // The Witch on (7, 1): (6..8, 0..2) is Snow.
    for (const [faction, role] of [
      ["ORIGINAL", "KNIGHT"],
      ["ORIGINAL", "RAIDER"],
      ["DINOSAUR", "RAIDER"],
      ["DINOSAUR", "KNIGHT"],
      ["GOBLIN", "RAIDER"],
    ] as const) {
      const state = iceFieldV7(
        [
          { seat: 0, role: "CAPTAIN", at: at(7, 1) },
          { seat: 1, role, at: at(4, 2) },
        ],
        {
          factions: ["ICE_FOLK", faction],
          activeSeat: 1,
          // No Fieldcraft.
          techs: { 1: ["SCOUTING", "RAIDING", "CHIVALRY", "DRILL"] },
        },
      );
      expect(
        moveReason(state, at(4, 2), at(5, 2), at(6, 2), at(6, 3)),
        `${faction} ${role}`,
      ).toBe("SNOW_STOPS_MOVE");
      walk(state, at(4, 2), at(5, 2), at(6, 2));
      // The public query offers no path through the Snow tile.
      expect(
        queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))).some(
          (command) =>
            command.kind === "MOVE" &&
            command.path.length > 2 &&
            command.path[1]?.x === 6 &&
            command.path[1]?.y === 2,
        ),
      ).toBe(false);
    }
  });

  it("is waived by Fieldcraft for Raiders and Marksmen, by a Road edge, and ignored by walkers and flyers", () => {
    // Deep Winter: the neutral ring (6..10, 6..10) of the Ice Folk capital
    // is Snow, away from any unit's zone of control.
    const ring = (
      role: Parameters<typeof iceFieldV7>[0][number]["role"],
      faction: "ORIGINAL" | "MARTIAN" = "ORIGINAL",
      techs: Parameters<typeof iceFieldV7>[1] extends infer O
        ? O extends { techs?: infer T }
          ? T
          : never
        : never = { 0: ["DRILL", "FORTIFICATION"] },
    ) =>
      iceFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(1, 1) },
          { seat: 1, role, at: at(5, 6) },
        ],
        { factions: ["ICE_FOLK", faction], activeSeat: 1, techs },
      );
    // No Fieldcraft: a Human Raider stops on (6, 6).
    const plain = ring("RAIDER", "ORIGINAL", {
      0: ["DRILL", "FORTIFICATION"],
      1: ["SCOUTING"],
    });
    expect(moveReason(plain, at(5, 6), at(6, 6), at(6, 5))).toBe(
      "SNOW_STOPS_MOVE",
    );
    // Fieldcraft frees the Raider.
    walk(ring("RAIDER"), at(5, 6), at(6, 6), at(6, 5));
    // A Road edge (both ends usable Road nodes) waives the stop for a
    // Knight (Fieldcraft does not free a Knight).
    const roads = [at(5, 6), at(6, 6)].reduce(
      (state, where) => patchTileV7(state, where, { road: true }),
      ring("KNIGHT"),
    );
    walk(roads, at(5, 6), at(6, 6), at(6, 5));
    // Without the Road the Knight stops.
    expect(moveReason(ring("KNIGHT"), at(5, 6), at(6, 6), at(6, 5))).toBe(
      "SNOW_STOPS_MOVE",
    );
    // Martian walkers and flyers are never stopped by terrain.
    for (const role of ["RAIDER", "CATAPULT", "KNIGHT"] as const)
      walk(ring(role, "MARTIAN"), at(5, 6), at(6, 6), at(6, 5));
    // An Ice Folk unit is never stopped by Snow.
    const ice = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 6) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: ["SCOUTING", "DRILL", "FORTIFICATION"] } },
    );
    walk(ice, at(5, 6), at(6, 6), at(6, 5));
  });

  it("a hidden Witch's Blizzard interrupts the Move there (reason SNOW)", () => {
    // The Witch on (8, 3): (7..9, 2..4) is her Blizzard. The Human Knight
    // (Move 3, no Fieldcraft) walks (6, 2), (7, 2), (7, 1).
    const visible = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(8, 3) },
        { seat: 1, role: "KNIGHT", at: at(5, 2) },
      ],
      {
        activeSeat: 1,
        techs: { 1: ["SCOUTING", "RAIDING", "CHIVALRY"] },
      },
    );
    const path = [at(6, 2), at(7, 2), at(7, 1)];
    // Seen, the Snow tile ends the Move: the path is illegal.
    expect(moveReason(visible, at(5, 2), ...path)).toBe("SNOW_STOPS_MOVE");
    // Hidden (her tile and the tiles east of (7, x) unexplored), the path
    // is offered and accepted, and interrupted on the Snow tile.
    const hidden = unexploreV7(
      visible,
      1,
      [8, 9, 10].flatMap((x) => [1, 2, 3, 4, 5].map((y) => at(x, y))),
    );
    const view = viewForV7(hidden, activeIdV7(hidden));
    expect(
      view.board.tiles.find((tile) => tile.at.x === 7 && tile.at.y === 2),
    ).toMatchObject({ explored: true, snow: false, blizzard: false });
    const command = move(hidden, at(5, 2), ...path);
    // The public validator accepts the path (it cannot know the Snow).
    expect(
      validatePlayerMovementPathV7(view, unitAtV7(hidden, at(5, 2)), path)
        .legal,
    ).toBe(true);
    const result = applyOkV7(hidden, activeIdV7(hidden), command);
    expect(
      result.events.find((event) => event.kind === "UNIT_MOVE_INTERRUPTED"),
    ).toEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: unitAtV7(hidden, at(5, 2)).id,
      at: at(7, 2),
      reason: "SNOW",
    });
    expect(unitAtV7(result.state, at(7, 2)).role).toBe("KNIGHT");
    // The Witch is revealed by the mover's own sight.
    expect(
      viewForV7(result.state, activeIdV7(result.state)).units.some(
        (unit) => unit.at.x === 8 && unit.at.y === 3,
      ),
    ).toBe(true);
  });

  it("the view's Snow and Blizzard flags show a visible Witch and hide a hidden one", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1, techs: { 0: [] }, water: [at(4, 1)] },
    );
    expect(viewSnowV7(state, at(6, 3))).toBe(true);
    const human = viewForV7(state, seatIdV7(state, 1));
    const flags = (where: CoordV7) => {
      const tile = human.board.tiles.find(
        (candidate) => candidate.at.x === where.x && candidate.at.y === where.y,
      );
      return tile?.explored === true ? [tile.snow, tile.blizzard] : null;
    };
    expect(flags(at(6, 3))).toEqual([true, true]);
    // Water: Blizzard (for drawing), never Snow.
    expect(flags(at(4, 1))).toEqual([false, true]);
    expect(flags(at(7, 3))).toEqual([false, false]);
    // Territory Snow is public.
    expect(flags(at(7, 7))).toEqual([true, false]);
    // A hidden Witch: neither flag on the explored tiles next to her.
    const hidden = unexploreV7(state, 1, [at(5, 2)]);
    const view = viewForV7(hidden, seatIdV7(hidden, 1));
    const tile = view.board.tiles.find(
      (candidate) => candidate.at.x === 6 && candidate.at.y === 3,
    );
    expect(tile).toMatchObject({
      explored: true,
      snow: false,
      blizzard: false,
    });
    // The owner always sees her own Witch.
    expect(
      viewSnowV7(
        checkedV7({
          ...hidden,
          activeSeatIndex: hidden.turnOrder.indexOf(seatIdV7(hidden, 0)),
        }),
        at(6, 3),
      ),
    ).toBe(true);
  });
});

describe("the Blizzard's ranged-damage halving (section 6.3)", () => {
  it("halves a hit from distance 2 or more on a unit of the Witch's seat, rounded up; never from distance 1", () => {
    // A Human Marksman shoots a Yeti beside a Witch on neutral ground.
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 5) },
        { seat: 1, role: "MARKSMAN", at: at(4, 4) },
      ],
      { activeSeat: 1, techs: { 0: [] } },
    );
    const far = attackV7(state, at(5, 5), at(5, 3));
    // 5 at Snow cover x 1.25 (`pulp_wars-1wy.3`; 4 at x 1.5), halved: 3.
    expect(far.combat).toMatchObject({
      blizzardHalved: true,
      snowCover: true,
      damageToDefender: 3,
    });
    const near = attackV7(far.state, at(4, 4), at(5, 3));
    expect(near.combat.blizzardHalved).toBe(false);
  });

  it("is per seat: an enemy Ice Folk unit in her Blizzard has Snow cover but is shot at full damage", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "MARKSMAN", at: at(5, 5) },
      ],
      { factions: ["ICE_FOLK", "ICE_FOLK"], techs: { 0: [], 1: [] } },
    );
    expect(attackV7(state, at(5, 5), at(5, 3)).combat).toMatchObject({
      blizzardHalved: false,
      snowCover: true,
    });
    // Seat 0's own unit in its Witch's Blizzard is halved against seat 1's
    // Ice Folk shooter.
    const mirror = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 5) },
      ],
      {
        factions: ["ICE_FOLK", "ICE_FOLK"],
        activeSeat: 1,
        techs: { 0: [], 1: [] },
      },
    );
    expect(attackV7(mirror, at(5, 5), at(5, 3)).combat.blizzardHalved).toBe(
      true,
    );
  });

  it("does not apply to retaliation or to a Wail; a splash is computed from the halved hit", () => {
    // A Yeti beside its Witch retaliates; a Marksman that shoots it from 1
    // is not halved, and the Yeti's own retaliation is never halved.
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "MARKSMAN", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 5) },
      ],
      { activeSeat: 1, techs: { 0: [] } },
    );
    const run = attackV7(state, at(5, 5), at(5, 3));
    expect(run.combat).toMatchObject({
      blizzardHalved: true,
      retaliation: true,
    });
    // A Battleship's splash from the halved hit (seat 1 Human boat).
    const naval = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "BATTLESHIP", at: at(5, 1), form: "NAVAL" },
      ],
      { activeSeat: 1, techs: { 0: [] }, water: [at(5, 1)] },
    );
    const shot = attackV7(naval, at(5, 1), at(5, 3));
    expect(shot.combat.blizzardHalved).toBe(true);
    const hit = shot.combat.damageToDefender + shot.combat.defenderShieldDamage;
    // The Witch (6, 3) and the Yeti (5, 4) are splashed from the halved hit.
    expect(shot.combat.splash.map((entry) => entry.damage)).toEqual([
      Math.max(1, Math.ceil(hit / 2)),
      Math.max(1, Math.ceil(hit / 2)),
    ]);
    expect(kindsV7(shot.events)).toContain("COMBAT_RESOLVED");
  });
});

describe("Deep Winter (section 6.6)", () => {
  it("Recover and idle recovery heal an Ice Folk land unit 6 in its owner's territory, 2 elsewhere", () => {
    for (const [techs, expected] of [
      [["DRILL", "FORTIFICATION"], 6],
      [["DRILL"], 4],
    ] as const) {
      const state = iceFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7), hp: 2 },
          { seat: 0, role: "FIGHTER", at: at(4, 3), hp: 2 },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { techs: { 0: techs } },
      );
      const home = playV7(state, {
        kind: "RECOVER",
        unitId: unitAtV7(state, at(7, 7)).id,
      });
      expect(unitAtV7(home.state, at(7, 7)).hp).toBe(2 + expected);
      const away = playV7(state, {
        kind: "RECOVER",
        unitId: unitAtV7(state, at(4, 3)).id,
      });
      expect(unitAtV7(away.state, at(4, 3)).hp).toBe(4);
      // Idle recovery at End Turn.
      const ended = applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
      expect(
        ended.events.filter((event) => event.kind === "UNIT_RECOVERED"),
      ).toEqual(
        [
          {
            kind: "UNIT_RECOVERED",
            unitId: unitAtV7(state, at(7, 7)).id,
            amount: expected,
            automatic: true,
          },
          {
            kind: "UNIT_RECOVERED",
            unitId: unitAtV7(state, at(4, 3)).id,
            amount: 2,
            automatic: true,
          },
        ].sort((left, right) => left.unitId - right.unitId),
      );
    }
  });
});

describe("two Ice Folk seats share Snow (root ruling 4)", () => {
  it("an Ice Folk unit Glides on the other seat's Snow, and another faction is stopped by both", () => {
    const state = iceFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ICE_FOLK", "ICE_FOLK"], activeSeat: 1, techs: { 0: [] } },
    );
    walk(state, at(7, 7), at(8, 7), at(9, 7));
    expect(offeredV7(state, "MOVE").length).toBeGreaterThan(0);
  });
});
