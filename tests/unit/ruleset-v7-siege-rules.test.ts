import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7, rewardWithArrivalV7 } from "../../src/ai/v7";
import {
  RULESET_7_ID,
  PRIOR_RULESET_7_IDS,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  isCityBesiegedV7,
  isTileEnemyOccupiedV7,
  parseEventV7,
  parseGameStateV7,
  previewRewardArrivalV7,
  projectEventsV7,
  publicTileEnemyOccupiedV7,
  queryPlayerCommandsV7,
  rewardArrivalV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { withHorrorV7, withStrandsV7 } from "../fixtures/v7-cult";
import { cityOfV7, rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import {
  READY_V7,
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { at, mountainV7, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * Siege rules (`pulp_wars-0pgd`, `pulp-wars-poc-7r80`;
 * docs/product/RULESET_7_CURRENT.md sections 4.6, 4.7, and 8.1), on small
 * hand-built states of the two-seat arena: seat 0's capital is at (8, 8)
 * with the eight tiles around it as its territory.
 *
 * 1. A besieged city builds: a siege blocks no tile command.
 * 2. No tile command but Blast Mountain targets a tile a hostile unit
 *    stands on (`TILE_ENEMY_OCCUPIED`).
 * 3. A level-up reward unit takes the center; the unit standing there steps
 *    aside or, with no tile to step to, dies (`UNIT_DIED` cause
 *    `DISPLACED`).
 */
const CENTER = at(8, 8);
/** The eight tiles around the center, in (y, x) order. */
const RING: readonly CoordV7[] = [
  at(7, 7),
  at(8, 7),
  at(9, 7),
  at(7, 8),
  at(9, 8),
  at(7, 9),
  at(8, 9),
  at(9, 9),
];

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly captureEligible?: boolean;
  readonly activation?: Partial<UnitStateV7["activation"]>;
}

/** Adds homeless units to a checked state. */
function withUnits(state: GameStateV7, pieces: readonly Piece[]): GameStateV7 {
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + pieces.length,
    units: [
      ...state.units,
      ...pieces.map((piece, index): UnitStateV7 => {
        const ownerId = seatIdV7(state, piece.seat);
        const faction = state.players.find(
          (player) => player.id === ownerId,
        )?.faction;
        if (faction === undefined) throw new Error("seat missing");
        const rule = effectiveRoleRuleV7(piece.role, faction);
        return {
          id: unitId(state.nextEntityId + index),
          ownerId,
          homeCityId: null,
          role: piece.role,
          form: "LAND",
          at: piece.at,
          hp: piece.hp ?? rule.maxHp,
          maxHp: rule.maxHp,
          kills: 0,
          veteran: false,
          captureEligible: piece.captureEligible ?? false,
          activation: { ...READY_V7, ...piece.activation },
        };
      }),
    ],
  });
}

const kinds = (events: readonly { readonly kind: string }[]): string[] =>
  events.map((event) => event.kind);

function reject(state: GameStateV7, command: CommandV7): string {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (result.accepted) throw new Error("accepted");
  expect(result.state).toBe(state);
  return result.error.code;
}

const offered = (state: GameStateV7, command: CommandV7): boolean =>
  queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)).some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
  );

describe("siege rules: the identity", () => {
  // The flatter technology bases (`pulp_wars-w49.40`) took 7r81 and the
  // mission objectives (`pulp_wars-v642.1`) 7r82 and the campaign
  // follow-ups (`pulp_wars-v642.5`) 7r83, so 7r80 is a prior
  // identity.
  it("was 7r80 after 7r79, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r103");
    expect(PRIOR_RULESET_7_IDS.slice(-24, -22)).toEqual([
      "pulp-wars-poc-7r79",
      "pulp-wars-poc-7r80",
    ]);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r103.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-24, -22)).toEqual([
      "pulpWars.save.v7r79.current",
      "pulpWars.save.v7r80.current",
    ]);
  });
});

describe("siege rules: a besieged city builds", () => {
  /** Seat 1's Fighter besieges the capital; Fertile Ground and Fruit. */
  const besieged = (extra: readonly Piece[] = []): GameStateV7 => {
    const taken = (where: CoordV7): boolean =>
      extra.some((piece) => piece.at.x === where.x && piece.at.y === where.y);
    // Placeholders clear the three tiles to plain Grass.
    const placeholders = [at(9, 9), at(7, 9), at(7, 7)].filter(
      (where) => !taken(where),
    );
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: CENTER },
        ...placeholders.map((where) => ({
          seat: 0,
          role: "FIGHTER" as const,
          at: where,
        })),
        ...extra,
      ],
    );
    const cleared = checkedV7({
      ...base,
      units: base.units.filter(
        (unit) =>
          !placeholders.some(
            (where) => where.x === unit.at.x && where.y === unit.at.y,
          ),
      ),
    });
    return patchTileV7(
      patchTileV7(cleared, at(9, 9), { resource: "FERTILE_GROUND" }),
      at(7, 9),
      { resource: "FRUIT" },
    );
  };

  it("is besieged, and still cannot train", () => {
    const state = besieged();
    const city = cityOfV7(state, 0);
    expect(isCityBesiegedV7(state, city)).toBe(true);
    const train: CommandV7 = {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    };
    expect(reject(state, train)).toBe("CITY_BESIEGED");
    expect(offered(state, train)).toBe(false);
  });

  it.each([
    ["a building", { kind: "BUILD_FARM", at: at(9, 9) }],
    ["a resource action", { kind: "HARVEST_FRUIT", at: at(7, 9) }],
    ["a Road", { kind: "BUILD_ROAD", at: at(7, 7) }],
  ] as const)("offers and accepts %s in its territory", (_name, command) => {
    const state = besieged();
    expect(offered(state, command)).toBe(true);
    const result = applyOkV7(state, state.humanPlayerId, command);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
    // The siege goes on.
    expect(isCityBesiegedV7(result.state, cityOfV7(result.state, 0))).toBe(
      true,
    );
  });

  it("refuses every tile command on a tile a hostile unit stands on", () => {
    // A second enemy unit on the Fertile Ground, another on the Fruit.
    const state = besieged([
      { seat: 1, role: "FIGHTER", at: at(9, 9) },
      { seat: 1, role: "FIGHTER", at: at(7, 9) },
    ]);
    const patched = state;
    for (const command of [
      { kind: "BUILD_FARM", at: at(9, 9) },
      { kind: "BUILD_ROAD", at: at(9, 9) },
      { kind: "HARVEST_FRUIT", at: at(7, 9) },
    ] as const) {
      expect(reject(patched, command), command.kind).toBe(
        "TILE_ENEMY_OCCUPIED",
      );
      expect(offered(patched, command), command.kind).toBe(false);
    }
    const view = viewForV7(patched, patched.humanPlayerId);
    expect(publicTileEnemyOccupiedV7(view, at(9, 9))).toBe(true);
    expect(publicTileEnemyOccupiedV7(view, at(7, 7))).toBe(false);
    expect(
      isTileEnemyOccupiedV7(patched, patched.humanPlayerId, at(9, 9)),
    ).toBe(true);
    // The besieger's own seat is not blocked by its own unit.
    expect(isTileEnemyOccupiedV7(patched, seatIdV7(patched, 1), at(9, 9))).toBe(
      false,
    );
  });

  it("refuses it in a city that is not besieged, and allows a tile an own unit stands on", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: at(9, 9) },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
      ],
    );
    expect(isCityBesiegedV7(base, cityOfV7(base, 0))).toBe(false);
    expect(reject(base, { kind: "BUILD_ROAD", at: at(9, 9) })).toBe(
      "TILE_ENEMY_OCCUPIED",
    );
    expect(offered(base, { kind: "BUILD_ROAD", at: at(9, 9) })).toBe(false);
    expect(offered(base, { kind: "BUILD_ROAD", at: at(7, 7) })).toBe(true);
    applyOkV7(base, base.humanPlayerId, { kind: "BUILD_ROAD", at: at(7, 7) });
  });

  it("refuses a neutral Road under a hostile unit", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [{ seat: 1, role: "FIGHTER", at: at(6, 6) }],
    );
    expect(
      base.board.tiles.find((tile) => tile.at.x === 6 && tile.at.y === 6)
        ?.territoryCityId,
    ).toBeNull();
    expect(reject(base, { kind: "BUILD_ROAD", at: at(6, 6) })).toBe(
      "TILE_ENEMY_OCCUPIED",
    );
    expect(offered(base, { kind: "BUILD_ROAD", at: at(6, 6) })).toBe(false);
  });

  it("still blasts a Mountain under a hostile unit, besieged or not", () => {
    const state = mountainV7(
      besieged([{ seat: 1, role: "FIGHTER", at: at(9, 7) }]),
      at(9, 7),
    );
    const blast: CommandV7 = { kind: "BLAST_MOUNTAIN", at: at(9, 7) };
    expect(offered(state, blast)).toBe(true);
    const result = applyOkV7(state, state.humanPlayerId, blast);
    expect(kinds(result.events)).toContain("MOUNTAIN_BLASTED");
  });
});

describe("siege rules: a reward unit takes the center", () => {
  const militia = (
    own: readonly { role: UnitRoleIdV7; at: CoordV7 }[],
    opponent: readonly { role: UnitRoleIdV7; at: CoordV7 }[] = [
      { role: "FIGHTER", at: at(1, 1) },
    ],
    faction: Parameters<typeof rewardStateV7>[1] = "ORIGINAL",
    opponentFaction: Parameters<typeof rewardStateV7>[1] = "ORIGINAL",
  ) =>
    rewardStateV7("MILITIA", faction, own, {
      faction: opponentFaction,
      pieces: opponent,
    });

  const granted = (
    events: readonly { readonly kind: string }[],
  ): UnitStateV7["id"] => {
    const event = events.find((item) => item.kind === "UNIT_REWARD_GRANTED") as
      { readonly unitId: UnitStateV7["id"] } | undefined;
    if (event === undefined) throw new Error("no reward unit");
    return event.unitId;
  };

  it("moves the owner's garrison to a tile of its territory, with its HP and activation", () => {
    const fixture = militia([{ role: "GUARD", at: CENTER }]);
    const wounded = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.at.x === 8 && unit.at.y === 8
          ? {
              ...unit,
              hp: 5,
              activation: {
                ...unit.activation,
                moved: true,
                movedPathLength: 1,
              },
            }
          : unit,
      ),
    });
    const own = seatIdV7(wounded, 0);
    const guard = unitAtV7(wounded, CENTER);
    const preview = previewRewardArrivalV7(
      viewForV7(wounded, own),
      fixture.command.cityId,
      "MILITIA",
    );
    expect(preview).toEqual({
      cityId: fixture.command.cityId,
      reward: "MILITIA",
      role: "FIGHTER",
      at: CENTER,
      displacedUnitId: guard.id,
      displaceTo: at(7, 7),
      dies: false,
      exact: true,
    });
    const result = applyOkV7(wounded, own, fixture.command);
    expect(unitAtV7(result.state, at(7, 7))).toEqual({
      ...guard,
      at: at(7, 7),
      captureEligible: false,
    });
    expect(unitAtV7(result.state, CENTER)).toMatchObject({
      id: granted(result.events),
      role: "FIGHTER",
    });
    expect(kinds(result.events)).not.toContain("UNIT_DIED");
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
  });

  it("prefers a tile of the owner's territory for its own unit, and plain (y, x) order for a besieger", () => {
    // Placeholders put the Farm on (9, 9); (7, 7) and (8, 7) are neutral.
    const setup = (occupantSeat: 0 | 1): ReturnType<typeof militia> => {
      const fixture = militia(
        [
          ...RING.slice(0, 7).map((where) => ({
            role: "FIGHTER" as const,
            at: where,
          })),
          ...(occupantSeat === 0
            ? [{ role: "GUARD" as const, at: CENTER }]
            : []),
        ],
        occupantSeat === 1
          ? [{ role: "FIGHTER", at: CENTER }]
          : [{ role: "FIGHTER", at: at(1, 1) }],
      );
      const open = checkedV7({
        ...fixture.state,
        units: fixture.state.units.filter(
          (unit) => unit.at.x === 8 && unit.at.y === 8,
        ),
      });
      return {
        ...fixture,
        state: patchTileV7(
          patchTileV7(open, at(7, 7), { territoryCityId: null }),
          at(8, 7),
          { territoryCityId: null },
        ),
      };
    };
    const own = setup(0);
    const garrison = unitAtV7(own.state, CENTER);
    const kept = applyOkV7(own.state, seatIdV7(own.state, 0), own.command);
    expect(unitAtV7(kept.state, at(9, 7)).id).toBe(garrison.id);
    const enemy = setup(1);
    const besieger = unitAtV7(enemy.state, CENTER);
    const view = viewForV7(enemy.state, seatIdV7(enemy.state, 0));
    expect(
      previewRewardArrivalV7(view, enemy.command.cityId, "MILITIA"),
    ).toMatchObject({
      displacedUnitId: besieger.id,
      displaceTo: at(7, 7),
      dies: false,
    });
    const shoved = applyOkV7(
      enemy.state,
      seatIdV7(enemy.state, 0),
      enemy.command,
    );
    expect(unitAtV7(shoved.state, at(7, 7)).id).toBe(besieger.id);
  });

  it("shoves a besieger off the center: the siege ends and it cannot capture", () => {
    const fixture = militia([], [{ role: "FIGHTER", at: CENTER }]);
    const state = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.at.x === 8 && unit.at.y === 8
          ? { ...unit, captureEligible: true, hp: 7 }
          : unit,
      ),
    });
    const own = seatIdV7(state, 0);
    const foe = seatIdV7(state, 1);
    const besieger = unitAtV7(state, CENTER);
    expect(isCityBesiegedV7(state, cityOfV7(state, 0))).toBe(true);
    const result = applyOkV7(state, own, fixture.command);
    expect(isCityBesiegedV7(result.state, cityOfV7(result.state, 0))).toBe(
      false,
    );
    expect(unitAtV7(result.state, at(7, 7))).toEqual({
      ...besieger,
      at: at(7, 7),
      captureEligible: false,
    });
    const displaced = {
      kind: "UNIT_SPAWN_DISPLACED",
      playerId: own,
      cityId: fixture.command.cityId,
      spawnedUnitId: granted(result.events),
      displacedUnitId: besieger.id,
      from: CENTER,
      to: at(7, 7),
    };
    expect(result.events).toContainEqual(displaced);
    // The besieger's owner sees its unit moved; the board plays a shove.
    const seen = projectEventsV7(state, result.state, foe, result.events);
    expect(seen.events).toContainEqual(displaced);
    expect(corePresentationPlanV7(viewForV7(state, foe), seen)).toContainEqual(
      expect.objectContaining({
        kind: "MOVE",
        unitId: besieger.id,
        path: [CENTER, at(7, 7)],
      }),
    );
    // It cannot capture from the tile it was shoved to.
    const next = checkedV7({
      ...result.state,
      pendingChoices: [],
      activeSeatIndex: result.state.turnOrder.indexOf(foe),
    });
    expect(
      queryPlayerCommandsV7(viewForV7(next, foe)).some(
        (command) => command.kind === "CAPTURE",
      ),
    ).toBe(false);
  });

  it("kills a besieger with no tile to step to: its own cause, no credit, no Loss", () => {
    const fixture = militia([], [{ role: "FIGHTER", at: CENTER }]);
    // Seat 1 holds the whole ring too.
    const state = withUnits(
      fixture.state,
      RING.map((where) => ({ seat: 1, role: "FIGHTER", at: where })),
    );
    const own = seatIdV7(state, 0);
    const foe = seatIdV7(state, 1);
    const besieger = unitAtV7(state, CENTER);
    expect(
      previewRewardArrivalV7(
        viewForV7(state, own),
        fixture.command.cityId,
        "MILITIA",
      ),
    ).toMatchObject({
      at: CENTER,
      displacedUnitId: besieger.id,
      displaceTo: null,
      dies: true,
      exact: true,
    });
    const result = applyOkV7(state, own, fixture.command);
    const spawned = granted(result.events);
    const index = kinds(result.events).indexOf("UNIT_SPAWN_DISPLACED");
    expect(result.events.slice(index, index + 2)).toEqual([
      {
        kind: "UNIT_SPAWN_DISPLACED",
        playerId: own,
        cityId: fixture.command.cityId,
        spawnedUnitId: spawned,
        displacedUnitId: besieger.id,
        from: CENTER,
        to: null,
      },
      { kind: "UNIT_DIED", unitId: besieger.id, cause: "DISPLACED" },
    ]);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
    expect(result.state.units.some((unit) => unit.id === besieger.id)).toBe(
      false,
    );
    expect(unitAtV7(result.state, CENTER)).toMatchObject({
      id: spawned,
      kills: 0,
    });
    for (const kind of ["PLUNDER_AWARDED", "GRAVE_CREATED", "FAVOUR_GAINED"])
      expect(kinds(result.events)).not.toContain(kind);
    const ledger = (source: GameStateV7, playerId: typeof own) => {
      const entry = source.scoreLedger.find(
        (item) => item.playerId === playerId,
      );
      if (entry === undefined) throw new Error("no ledger entry");
      return entry;
    };
    expect(ledger(result.state, own).killValue).toBe(
      ledger(state, own).killValue,
    );
    expect(ledger(result.state, foe).lossValue).toBe(
      ledger(state, foe).lossValue,
    );
    expect(ledger(result.state, foe).hpLost).toBe(ledger(state, foe).hpLost);
    // Its owner lost a unit all the same.
    expect(ledger(result.state, foe).flawless).toBe(false);
    // The besieger's owner is told.
    const seen = projectEventsV7(state, result.state, foe, result.events);
    expect(seen.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: besieger.id,
      cause: "DISPLACED",
    });
  });

  // (A Chosen paid a Martyr's Favour for other deaths until the Cult
  // redesign retired it, `pulp_wars-mch9.31`; an Idol Bearer stands in.)
  it("pays no Favour for a Cult unit that dies this way", () => {
    const fixture = militia(
      [],
      [{ role: "GUARD", at: CENTER }],
      "ORIGINAL",
      "CULT",
    );
    const state = withUnits(
      fixture.state,
      RING.map((where) => ({ seat: 1, role: "FIGHTER", at: where })),
    );
    const chosen = unitAtV7(state, CENTER);
    const result = applyOkV7(state, seatIdV7(state, 0), fixture.command);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: chosen.id,
      cause: "DISPLACED",
    });
    expect(kinds(result.events)).not.toContain("FAVOUR_GAINED");
    expect(result.state.cult).toEqual(state.cult);
  });

  it("breaks the strand of a channeller it shoves off the center", () => {
    const fixture = militia(
      [],
      [{ role: "GUARD", at: CENTER }],
      "ORIGINAL",
      "CULT",
    );
    // The Idol Bearer on the center channels a Horror of its seat.
    const state = withStrandsV7(
      withHorrorV7(fixture.state, 1, at(5, 2)),
      at(5, 2),
      [CENTER],
    );
    const chosen = unitAtV7(state, CENTER);
    const result = applyOkV7(state, seatIdV7(state, 0), fixture.command);
    expect(unitAtV7(result.state, at(7, 7)).id).toBe(chosen.id);
    expect(result.events).toContainEqual(
      expect.objectContaining({ kind: "STRAND_BROKEN", unitId: chosen.id }),
    );
    expect(result.state.cult.strands).toEqual([]);
  });

  it("kills the owner's garrison too when the ring is full", () => {
    const fixture = militia([{ role: "GUARD", at: CENTER }]);
    const state = withUnits(
      fixture.state,
      RING.map((where) => ({ seat: 0, role: "FIGHTER", at: where })),
    );
    const guard = unitAtV7(state, CENTER);
    const result = applyOkV7(state, seatIdV7(state, 0), fixture.command);
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: guard.id,
      cause: "DISPLACED",
    });
    expect(unitAtV7(result.state, CENTER).role).toBe("FIGHTER");
  });

  it("the giant takes the center like any reward unit", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    const own = seatIdV7(fixture.state, 0);
    const guard = unitAtV7(fixture.state, CENTER);
    const preview = previewRewardArrivalV7(
      viewForV7(fixture.state, own),
      fixture.command.cityId,
      "JUGGERNAUT",
    );
    const result = applyOkV7(fixture.state, own, fixture.command);
    expect(unitAtV7(result.state, CENTER).role).toBe("JUGGERNAUT");
    const moved = result.state.units.find((unit) => unit.id === guard.id);
    expect(moved?.at).toEqual(preview?.displaceTo);
    expect(preview).toMatchObject({
      role: "JUGGERNAUT",
      at: CENTER,
      displacedUnitId: guard.id,
      dies: false,
    });
  });

  it("leaves a Jawbreaker on the center (Rock Hard) and puts the reward unit beside it", () => {
    const fixture = militia(
      [{ role: "SWORDSMAN", at: CENTER }],
      undefined,
      "CANDY",
    );
    const own = seatIdV7(fixture.state, 0);
    const jawbreaker = unitAtV7(fixture.state, CENTER);
    expect(
      previewRewardArrivalV7(
        viewForV7(fixture.state, own),
        fixture.command.cityId,
        "MILITIA",
      ),
    ).toMatchObject({
      at: at(7, 7),
      displacedUnitId: null,
      displaceTo: null,
      dies: false,
    });
    const result = applyOkV7(fixture.state, own, fixture.command);
    expect(unitAtV7(result.state, CENTER)).toEqual(jawbreaker);
    expect(unitAtV7(result.state, at(7, 7)).id).toBe(granted(result.events));
    expect(kinds(result.events)).not.toContain("UNIT_SPAWN_DISPLACED");
    // With no tile beside it, the reward unit takes the center and the
    // Jawbreaker dies.
    const crowded = withUnits(
      fixture.state,
      RING.map((where) => ({ seat: 0, role: "FIGHTER", at: where })),
    );
    const lost = applyOkV7(crowded, own, fixture.command);
    expect(lost.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: jawbreaker.id,
      cause: "DISPLACED",
    });
    expect(unitAtV7(lost.state, CENTER).id).toBe(granted(lost.events));
  });

  it("previews nothing for a reward that grants no unit or a city that is not the viewer's", () => {
    const fixture = militia([{ role: "GUARD", at: CENTER }]);
    const view = viewForV7(fixture.state, seatIdV7(fixture.state, 0));
    expect(
      previewRewardArrivalV7(view, fixture.command.cityId, "STOCKPILE"),
    ).toBeNull();
    expect(
      previewRewardArrivalV7(view, cityOfV7(fixture.state, 1).id, "MILITIA"),
    ).toBeNull();
  });

  it("the shared rule: empty center, a step aside, a death, and an occupant that holds", () => {
    const base = {
      center: CENTER,
      around: RING,
      occupantMayStand: (where: CoordV7) => where.x === 9,
      preferred: (where: CoordV7) => where.y === 9,
      spawnedMayStand: (where: CoordV7) => where.y === 8,
      cityTerritory: (where: CoordV7) => where.x === 9,
    };
    expect(rewardArrivalV7({ ...base, occupant: null })).toEqual({
      at: CENTER,
      displacedUnitId: null,
      displaceTo: null,
      dies: false,
    });
    const id = unitId(7);
    expect(
      rewardArrivalV7({ ...base, occupant: { id, immovable: false } }),
    ).toEqual({
      at: CENTER,
      displacedUnitId: id,
      displaceTo: at(9, 9),
      dies: false,
    });
    expect(
      rewardArrivalV7({
        ...base,
        occupant: { id, immovable: false },
        occupantMayStand: () => false,
      }),
    ).toEqual({
      at: CENTER,
      displacedUnitId: id,
      displaceTo: null,
      dies: true,
    });
    expect(
      rewardArrivalV7({ ...base, occupant: { id, immovable: true } }),
    ).toEqual({
      at: at(9, 8),
      displacedUnitId: null,
      displaceTo: null,
      dies: false,
    });
    expect(
      rewardArrivalV7({
        ...base,
        occupant: { id, immovable: true },
        spawnedMayStand: () => false,
      }),
    ).toEqual({
      at: CENTER,
      displacedUnitId: id,
      displaceTo: null,
      dies: true,
    });
  });
});

describe("siege rules: the Normal AI", () => {
  it("does not take a reward unit that would kill its own garrison when another reward is offered", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    const crowded = withUnits(
      fixture.state,
      RING.map((where) => ({ seat: 0, role: "FIGHTER", at: where })),
    );
    const own = seatIdV7(crowded, 0);
    const offer = ["STOCKPILE", "MILITIA"] as const;
    expect(
      rewardWithArrivalV7(
        viewForV7(crowded, own),
        fixture.command.cityId,
        offer,
        "MILITIA",
      ),
    ).toBe("STOCKPILE");
    // With room to step aside the policy's choice stands.
    expect(
      rewardWithArrivalV7(
        viewForV7(fixture.state, own),
        fixture.command.cityId,
        offer,
        "MILITIA",
      ),
    ).toBe("MILITIA");
    // With nothing else on offer it takes the unit.
    expect(
      rewardWithArrivalV7(
        viewForV7(crowded, own),
        fixture.command.cityId,
        ["MILITIA"],
        "MILITIA",
      ),
    ).toBe("MILITIA");
    const decision = chooseNormalCommandV7(viewForV7(crowded, own)).command;
    expect(decision).toMatchObject({
      kind: "CHOOSE_CITY_REWARD",
      reward: "STOCKPILE",
    });
  });

  it("takes the reward unit that shoves a besieger off its center", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    const own = seatIdV7(fixture.state, 0);
    const view = viewForV7(fixture.state, own);
    expect(
      rewardWithArrivalV7(
        view,
        fixture.command.cityId,
        ["STOCKPILE", "MILITIA"],
        "STOCKPILE",
      ),
    ).toBe("MILITIA");
    expect(chooseNormalCommandV7(view).command).toEqual(fixture.command);
  });

  it("chooses a legal command for a besieged seat that can build", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: CENTER },
        { seat: 0, role: "FIGHTER", at: at(6, 6) },
      ],
    );
    const view = viewForV7(base, base.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    expect(commands.some((command) => command.kind === "BUILD_ROAD")).toBe(
      true,
    );
    const decision = chooseNormalCommandV7(view).command;
    expect(
      commands.some(
        (command) => JSON.stringify(command) === JSON.stringify(decision),
      ),
    ).toBe(true);
  });
});
