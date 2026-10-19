import { describe, expect, it } from "vitest";
import {
  MONSTER_REGENERATION_V7,
  NEUTRAL_BOUNTIES_V7,
  NEUTRAL_ROLE_MECHANICS_V7,
  NEUTRAL_ROLE_RULES_V7,
  SEA_SERPENT_AREA_MINIMUM_V7,
  SEA_SERPENT_AREA_RADIUS_V7,
  SEA_SERPENT_ATTACK2_V7,
  SEA_SERPENT_BOUNTY_V7,
  SEA_SERPENT_CAPITAL_DISTANCE_V7,
  SEA_SERPENT_DEFENSE2_V7,
  SEA_SERPENT_HP_V7,
  SEA_SERPENT_MINIMUM_WIDTH_V7,
  SEA_SERPENT_MOVE_V7,
  SEA_SERPENT_OFFERING_VALUE_V7,
  SEA_SERPENT_REGENERATION_V7,
  SEA_SERPENT_SPACING_V7,
  SEA_SERPENT_VILLAGE_DISTANCE_V7,
  applyCommandV7,
  monsterWanderV7,
  neutralBreedOfV7,
  neutralRegenerationV7,
  neutralStepsV7,
  parseGameStateV7,
  previewMonsterV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  seaSerpentReachV7,
  seaSerpentStandableV7,
  unitRoleMechanicsV7,
  viewForV7,
  type CombatPreviewV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type NeutralBoardFactsV7,
  type PlayerId,
  type UnitStateV7,
} from "../../src/engine/index";
import { applyAcceptedV7, rejectionV7 } from "../fixtures/v7-round3-arena";
import { round2UnitAtV7 } from "../fixtures/v7-round2-arena";
import {
  SERPENT_HOME_V7,
  at,
  serpentArenaV7,
  serpentOfV7,
} from "../fixtures/v7-serpent-arena";

// Map curiosities round 3, bead B (`pulp_wars-737.21`,
// docs/product/RULESET_7_CURIOSITIES_ROUND_3.md sections 8, 9, 10, and 13):
// the Sea Serpent on small hand-built seas. No match is played.

const P1 = 1 as PlayerId;
const P2 = 2 as PlayerId;

/** Ends player 1's and player 2's turns (player 2's wraps the round). */
function endRound(state: GameStateV7) {
  const first = applyAcceptedV7(state, P1, { kind: "END_TURN" });
  return applyAcceptedV7(first.state, P2, { kind: "END_TURN" });
}

const combats = (events: readonly DomainEventV7[]): CombatPreviewV7[] =>
  events.flatMap((event) =>
    event.kind === "COMBAT_RESOLVED" ? [event.preview] : [],
  );
const neutralEvents = (events: readonly DomainEventV7[]) => {
  const start = events.findIndex(
    (event) => event.kind === "NEUTRAL_TURN_STARTED",
  );
  const end = events.findIndex((event) => event.kind === "NEUTRAL_TURN_ENDED");
  return events.slice(start, end + 1);
};
const unitAt = round2UnitAtV7;
const alive = (state: GameStateV7, id: number): UnitStateV7 | undefined =>
  state.units.find((unit) => unit.id === id && unit.hp > 0);
const facts = (state: GameStateV7): NeutralBoardFactsV7 => ({ ...state });
const ship = (
  seat: number,
  role: "PATROL_BOAT" | "BATTLESHIP" | "SUBMARINE",
  tile: CoordV7,
  hp?: number,
) => ({
  seat,
  role,
  at: tile,
  form: "NAVAL" as const,
  ...(hp === undefined ? {} : { hp }),
});

describe("the Sea Serpent's registration (section 8.2)", () => {
  it("has its stats, its sea-beast mechanics, and its constants", () => {
    const rule = NEUTRAL_ROLE_RULES_V7.SEA_SERPENT;
    expect(rule).toMatchObject({
      role: "BATTLESHIP",
      label: "Sea Serpent",
      cost: null,
      maxHp: SEA_SERPENT_HP_V7,
      attack2: SEA_SERPENT_ATTACK2_V7,
      defense2: SEA_SERPENT_DEFENSE2_V7,
      move: SEA_SERPENT_MOVE_V7,
      range: 1,
      minimumRange: 1,
      sightRadius: 0,
      technology: null,
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK"],
    });
    expect([
      SEA_SERPENT_HP_V7,
      SEA_SERPENT_ATTACK2_V7,
      SEA_SERPENT_DEFENSE2_V7,
      SEA_SERPENT_MOVE_V7,
      SEA_SERPENT_AREA_RADIUS_V7,
      SEA_SERPENT_REGENERATION_V7,
      SEA_SERPENT_BOUNTY_V7,
      SEA_SERPENT_MINIMUM_WIDTH_V7,
      SEA_SERPENT_CAPITAL_DISTANCE_V7,
      SEA_SERPENT_VILLAGE_DISTANCE_V7,
      SEA_SERPENT_AREA_MINIMUM_V7,
      SEA_SERPENT_SPACING_V7,
      SEA_SERPENT_OFFERING_VALUE_V7,
    ]).toEqual([32, 7, 5, 2, 3, 4, 15, 16, 5, 4, 16, 6, 8]);
    const mechanics = NEUTRAL_ROLE_MECHANICS_V7.SEA_SERPENT;
    expect(mechanics.seaBeast).toBe(true);
    expect(mechanics.splash).toBe(false);
    expect(mechanics.advancesAfterKill).toBe(false);
    expect(NEUTRAL_BOUNTIES_V7.SEA_SERPENT).toBe(15);
    expect(neutralRegenerationV7("SEA_SERPENT")).toBe(4);
    expect(neutralRegenerationV7("GIANT_SPIDER")).toBe(MONSTER_REGENERATION_V7);
    expect(neutralRegenerationV7("BIGFOOT")).toBe(0);
    // A partial roster reads the breed from the role.
    expect(
      neutralBreedOfV7({}, { id: 99 as never, role: "BATTLESHIP", maxHp: 32 }),
    ).toBe("SEA_SERPENT");
    const state = serpentArenaV7();
    const serpent = serpentOfV7(state);
    expect(serpent.form).toBe("NAVAL");
    expect(unitRoleMechanicsV7(state, serpent).seaBeast).toBe(true);
  });

  it("refuses every command naming it and never offers one", () => {
    const state = serpentArenaV7();
    const serpent = serpentOfV7(state);
    expect(
      applyCommandV7(state, P1, { kind: "WAIT", unitId: serpent.id }).accepted,
    ).toBe(false);
    expect(
      queryPlayerCommandsV7(viewForV7(state, P1)).some(
        (command) => "unitId" in command && command.unitId === serpent.id,
      ),
    ).toBe(false);
  });
});

describe("its home, area, and movement (section 8.3)", () => {
  it("stands on open water within 3 of home, 3 or more from every centre, with no unit", () => {
    const state = serpentArenaV7({
      home: at(6, 10),
      pieces: [ship(0, "PATROL_BOAT", at(7, 12))],
      terrain: [{ at: at(8, 13), terrain: "SHALLOW_WATER" }],
      ice: [{ at: at(4, 9), ownerId: P2, cracked: false }],
      factions: ["ORIGINAL", "ICE_FOLK"],
    });
    const home = at(6, 10);
    const standable = (tile: CoordV7) =>
      seaSerpentStandableV7(facts(state), home, tile, serpentOfV7(state).id);
    expect(standable(home)).toBe(true);
    expect(standable(at(3, 7))).toBe(true);
    // Beyond 3 of home, on land, on ice, on a unit, or within 2 of the
    // capital on (9, 15).
    expect(standable(at(2, 6))).toBe(false);
    expect(standable(at(9, 10))).toBe(false);
    expect(standable(at(4, 9))).toBe(false);
    expect(standable(at(7, 12))).toBe(false);
    expect(standable(at(8, 13))).toBe(false);
    expect(standable(at(8, 12))).toBe(true);
    // Never on a dock.
    const docked: NeutralBoardFactsV7 = {
      ...facts(state),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === 3 && tile.at.y === 7
            ? { ...tile, improvement: "PORT" }
            : tile,
        ),
      },
    };
    expect(seaSerpentStandableV7(docked, home, at(3, 7))).toBe(false);
  });

  it("reaches 2 steps and never passes a unit", () => {
    const open = serpentArenaV7();
    const reach = seaSerpentReachV7(facts(open), serpentOfV7(open), {
      home: SERPENT_HOME_V7,
    });
    // Every lake tile within 2 of it (all within 3 of home).
    expect(reach).toHaveLength(25);
    expect(reach[0]).toEqual({ at: SERPENT_HOME_V7, path: [] });
    const walled = serpentArenaV7({
      pieces: [
        ship(1, "BATTLESHIP", at(6, 8)),
        ship(1, "BATTLESHIP", at(6, 9)),
        ship(1, "BATTLESHIP", at(6, 10)),
      ],
    });
    const behind = seaSerpentReachV7(facts(walled), serpentOfV7(walled), {
      home: SERPENT_HOME_V7,
    });
    // The column of ships closes x 6 on rows 8 to 10, so nothing beyond it
    // is 2 steps away; (6, 7) is, round the wall.
    expect(behind.every((tile) => tile.at.x <= 6)).toBe(true);
    expect(
      behind.some(
        (tile) => tile.at.x === 6 && tile.at.y >= 8 && tile.at.y <= 10,
      ),
    ).toBe(false);
    expect(behind.find((tile) => tile.at.x === 6 && tile.at.y === 7)).toEqual({
      at: at(6, 7),
      path: [at(5, 8), at(6, 7)],
    });
  });

  it("wanders one step or stays by the Spider's stateless draw, in its area", () => {
    let state = serpentArenaV7();
    for (let round = 0; round < 6; round += 1) {
      const before = serpentOfV7(state);
      const steps = neutralStepsV7(
        facts(state),
        before,
        state.monsters[0] as never,
      );
      const expected = monsterWanderV7(
        state.setup.seed,
        state.round,
        before.id,
        steps,
      );
      const result = endRound(state);
      const after = serpentOfV7(result.state);
      expect(after.at).toEqual(expected ?? before.at);
      expect(Math.max(...[after.at.x - 5, after.at.y - 9].map(Math.abs))).toBe(
        Math.max(
          Math.abs(after.at.x - SERPENT_HOME_V7.x),
          Math.abs(after.at.y - SERPENT_HOME_V7.y),
        ),
      );
      expect(
        Math.max(
          Math.abs(after.at.x - SERPENT_HOME_V7.x),
          Math.abs(after.at.y - SERPENT_HOME_V7.y),
        ),
      ).toBeLessThanOrEqual(3);
      state = result.state;
    }
  });
});

describe("provocation, the bite, and the wander (section 8.4)", () => {
  it("bites the weakest unit next to it, a Patrol Boat sunk in one bite", () => {
    const state = serpentArenaV7({
      pieces: [
        ship(0, "PATROL_BOAT", at(6, 10)),
        ship(1, "BATTLESHIP", at(4, 8)),
      ],
    });
    const boat = unitAt(state, at(6, 10));
    const result = endRound(state);
    const turn = neutralEvents(result.events);
    expect(turn.some((event) => event.kind === "UNIT_MOVED")).toBe(false);
    const [bite] = combats(turn);
    expect(bite).toMatchObject({
      attackerId: serpentOfV7(state).id,
      targetUnitId: boat.id,
      damageToDefender: 10,
      defenderDies: true,
    });
    expect(alive(result.state, boat.id)).toBeUndefined();
    // Never advances onto the sunk boat's tile.
    expect(serpentOfV7(result.state).at).toEqual(SERPENT_HOME_V7);
  });

  it("trades evenly with a Battleship (8 dealt, 6 taken back)", () => {
    const state = serpentArenaV7({
      pieces: [ship(0, "BATTLESHIP", at(6, 10))],
    });
    const [bite] = combats(neutralEvents(endRound(state).events));
    expect(bite?.damageToDefender).toBe(8);
    expect(bite?.damageToAttacker).toBe(6);
  });

  it("swims by the fewest steps to the first tile next to a provoker, along the first path, in one UNIT_MOVED", () => {
    const state = serpentArenaV7({
      pieces: [ship(0, "PATROL_BOAT", at(8, 9))],
      provokedBy: [0],
    });
    const result = endRound(state);
    const turn = neutralEvents(result.events);
    const moved = turn.filter((event) => event.kind === "UNIT_MOVED");
    expect(moved).toEqual([
      {
        kind: "UNIT_MOVED",
        unitId: serpentOfV7(state).id,
        path: [at(6, 8), at(7, 8)],
      },
    ]);
    expect(combats(turn)[0]?.targetUnitId).toBe(unitAt(state, at(8, 9)).id);
    expect(serpentOfV7(result.state).at).toEqual(at(7, 8));
  });

  it("leaves a provoker beyond its reach alone and wanders", () => {
    // A pond outside the lake: a Battleship there shells it from 3.
    const state = serpentArenaV7({
      serpentAt: at(8, 9),
      terrain: [
        { at: at(10, 9), terrain: "SHALLOW_WATER" },
        { at: at(11, 9), terrain: "SHALLOW_WATER" },
      ],
      pieces: [ship(0, "BATTLESHIP", at(11, 9))],
    });
    const battleship = unitAt(state, at(11, 9));
    const serpent = serpentOfV7(state);
    const view = viewForV7(state, P1);
    const preview = queryCombatPreviewV7(view, battleship.id, serpent.id);
    expect(preview?.damageToDefender).toBe(15);
    expect(preview?.damageToAttacker).toBe(0);
    expect(preview?.monsterRetaliates).toBe(false);
    const shot = applyAcceptedV7(state, P1, {
      kind: "ATTACK",
      unitId: battleship.id,
      targetUnitId: serpent.id,
    });
    expect(shot.state.monsters[0]?.provokedBy).toEqual([battleship.id]);
    const first = applyAcceptedV7(shot.state, P1, { kind: "END_TURN" });
    const second = applyAcceptedV7(first.state, P2, { kind: "END_TURN" });
    expect(combats(neutralEvents(second.events))).toEqual([]);
    expect(alive(second.state, battleship.id)?.hp).toBe(25);
    // Regenerated, and the provocation cleared.
    expect(serpentOfV7(second.state).hp).toBe(32 - 15 + 4);
    expect(second.state.monsters[0]?.provokedBy).toEqual([]);
  });

  it("bites a unit on the shore and is answered by it", () => {
    const state = serpentArenaV7({
      serpentAt: at(8, 9),
      pieces: [{ seat: 0, role: "FIGHTER", at: at(9, 9) }],
    });
    const [bite] = combats(neutralEvents(endRound(state).events));
    // The table of section 8.2: a Fighter on the shore takes 10, deals 3.
    expect(bite?.damageToDefender).toBe(10);
    expect(bite?.damageToAttacker).toBe(3);
  });
});

describe("the neutral turn and regeneration (section 8.5)", () => {
  it("regenerates 4 after the units have acted, up to its maximum", () => {
    const hurt = endRound(serpentArenaV7({ serpentHp: 20 }));
    expect(
      hurt.events.find((event) => event.kind === "MONSTER_REGENERATED"),
    ).toMatchObject({ amount: 4, hpAfter: 24 });
    const nearly = endRound(serpentArenaV7({ serpentHp: 30 }));
    expect(
      nearly.events.find((event) => event.kind === "MONSTER_REGENERATED"),
    ).toMatchObject({ amount: 2, hpAfter: 32 });
  });
});

describe("what affects it (section 8.6)", () => {
  it("takes a Ram's damage but is never shoved", () => {
    const state = serpentArenaV7({
      pieces: [ship(0, "PATROL_BOAT", at(7, 9))],
    });
    const boat = unitAt(state, at(7, 9));
    const serpent = serpentOfV7(state);
    const moved = applyAcceptedV7(state, P1, {
      kind: "MOVE",
      unitId: boat.id,
      path: [at(6, 9)],
    });
    const view = viewForV7(moved.state, P1);
    expect(queryCombatPreviewV7(view, boat.id, serpent.id)?.push).toBe(
      "BLOCKED",
    );
    const rammed = applyAcceptedV7(moved.state, P1, {
      kind: "ATTACK",
      unitId: boat.id,
      targetUnitId: serpent.id,
    });
    const [combat] = combats(rammed.events);
    expect(combat).toMatchObject({
      damageToDefender: 7,
      damageToAttacker: 5,
      push: "BLOCKED",
    });
    expect(serpentOfV7(rammed.state).at).toEqual(SERPENT_HOME_V7);
  });

  it("is never boarded (Humans and Dinosaurs)", () => {
    for (const faction of ["ORIGINAL", "DINOSAUR"] as const) {
      const state = serpentArenaV7({
        factions: [faction, "GOBLIN"],
        serpentHp: 3,
        pieces: [ship(0, "PATROL_BOAT", at(6, 9))],
      });
      const boat = unitAt(state, at(6, 9));
      const serpent = serpentOfV7(state);
      expect(
        rejectionV7(state, P1, {
          kind: "BOARD",
          unitId: boat.id,
          targetUnitId: serpent.id,
        }),
      ).toEqual({
        code: "BOARD_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      });
      expect(
        queryPlayerCommandsV7(viewForV7(state, P1)).some(
          (command) => command.kind === "BOARD",
        ),
      ).toBe(false);
    }
  });

  it("never rises as a Ghost Ship (Undead), killed or killed answering", () => {
    const killed = serpentArenaV7({
      factions: ["UNDEAD", "GOBLIN"],
      serpentHp: 2,
      pieces: [ship(0, "PATROL_BOAT", at(6, 9))],
    });
    const ghost = unitAt(killed, at(6, 9));
    const sunk = applyAcceptedV7(killed, P1, {
      kind: "ATTACK",
      unitId: ghost.id,
      targetUnitId: serpentOfV7(killed).id,
    });
    expect(combats(sunk.events)[0]).toMatchObject({
      defenderDies: true,
      defenderInfected: false,
    });
    expect(sunk.state.units.filter((unit) => unit.hp > 0)).toHaveLength(
      killed.units.length - 1,
    );
    expect(sunk.state.monsters).toEqual([]);
    // Its bite on a Plague Galleon whose answer kills it.
    const answered = serpentArenaV7({
      factions: ["UNDEAD", "GOBLIN"],
      serpentHp: 2,
      pieces: [ship(0, "BATTLESHIP", at(6, 9))],
    });
    const result = endRound(answered);
    const [bite] = combats(neutralEvents(result.events));
    expect(bite).toMatchObject({ attackerDies: true, attackerInfected: false });
    expect(result.state.monsters).toEqual([]);
    expect(
      result.state.units.some(
        (unit) => unit.hp > 0 && unit.at.x === 5 && unit.at.y === 9,
      ),
    ).toBe(false);
    expect(result.state.plagued).toEqual([]);
  });

  it("pays a Cult ship's kill as Offerings of value 8 (4 Favour) and the bounty", () => {
    const state = serpentArenaV7({
      factions: ["CULT", "GOBLIN"],
      serpentHp: 2,
      pieces: [ship(0, "PATROL_BOAT", at(6, 9))],
    });
    const gondola = unitAt(state, at(6, 9));
    const coins = state.players.find((player) => player.id === P1)?.coins;
    const result = applyAcceptedV7(state, P1, {
      kind: "ATTACK",
      unitId: gondola.id,
      targetUnitId: serpentOfV7(state).id,
    });
    expect(
      result.events.find(
        (event) =>
          event.kind === "FAVOUR_GAINED" && event.source === "DEEP_OFFERING",
      ),
    ).toMatchObject({ amount: 4 });
    expect(
      result.events.find((event) => event.kind === "MONSTER_BOUNTY_AWARDED"),
    ).toMatchObject({ coins: 15 });
    expect(result.state.players.find((player) => player.id === P1)?.coins).toBe(
      (coins ?? 0) + 15,
    );
  });

  it("is never dragged by a Kraken (it never makes a Move)", () => {
    const state = serpentArenaV7({
      factions: ["CULT", "GOBLIN"],
      pieces: [ship(0, "SUBMARINE", at(6, 9))],
    });
    const result = endRound(state);
    const turn = neutralEvents(result.events);
    expect(turn.some((event) => event.kind === "UNIT_MOVED")).toBe(false);
    expect(serpentOfV7(result.state).at).toEqual(SERPENT_HOME_V7);
    expect(combats(turn)).toHaveLength(1);
  });

  it("grows a Plesiosaur that kills it (Dinosaurs)", () => {
    const state = serpentArenaV7({
      factions: ["DINOSAUR", "GOBLIN"],
      serpentHp: 2,
      pieces: [ship(0, "SUBMARINE", at(6, 9))],
    });
    const plesiosaur = unitAt(state, at(6, 9));
    const result = applyAcceptedV7(state, P1, {
      kind: "ATTACK",
      unitId: plesiosaur.id,
      targetUnitId: serpentOfV7(state).id,
    });
    expect(alive(result.state, plesiosaur.id)?.kills).toBe(1);
    expect(
      result.events.some(
        (event) => event.kind === "UNIT_GREW" && event.unitId === plesiosaur.id,
      ),
    ).toBe(true);
    expect(alive(result.state, plesiosaur.id)?.maxHp).toBeGreaterThan(
      plesiosaur.maxHp,
    );
  });

  it("lets a Martian Shield absorb its bite and is never pulled or mind-controlled", () => {
    const base = serpentArenaV7({
      factions: ["MARTIAN", "GOBLIN"],
      serpentAt: at(8, 9),
      pieces: [
        ship(0, "BATTLESHIP", at(8, 10)),
        { seat: 0, role: "RAIDER", at: at(9, 8) },
        { seat: 0, role: "CAPTAIN", at: at(9, 10) },
      ],
    });
    const cruiser = unitAt(base, at(8, 10));
    const state = parseGameStateV7({
      ...base,
      shields: [{ unitId: cruiser.id, shield: 3 }],
    }) as GameStateV7;
    expect(state).not.toBeNull();
    const serpent = serpentOfV7(state);
    const saucer = unitAt(state, at(9, 8));
    const brain = unitAt(state, at(9, 10));
    expect(
      rejectionV7(state, P1, {
        kind: "TRACTOR_BEAM",
        unitId: saucer.id,
        targetUnitId: serpent.id,
      }).code,
    ).toBe("TRACTOR_BEAM_NOT_LEGAL");
    expect(
      applyCommandV7(state, P1, {
        kind: "MIND_CONTROL",
        unitId: brain.id,
        targetUnitId: serpent.id,
      }).accepted,
    ).toBe(false);
    const result = endRound(state);
    const bites = combats(neutralEvents(result.events));
    expect(bites.some((bite) => bite.defenderShieldDamage > 0)).toBe(true);
  });

  it("bites a Dwarf Armoured ship at 1 less", () => {
    const plain = serpentArenaV7({
      pieces: [ship(0, "BATTLESHIP", at(6, 9))],
    });
    const armoured = serpentArenaV7({
      factions: ["DWARF", "GOBLIN"],
      pieces: [ship(0, "BATTLESHIP", at(6, 9))],
    });
    const plainBite = combats(neutralEvents(endRound(plain).events))[0];
    const armouredBite = combats(neutralEvents(endRound(armoured).events))[0];
    expect(armouredBite?.damageToDefender).toBe(
      (plainBite?.damageToDefender ?? 0) - 1,
    );
  });

  it("takes a Pie Galleon's hit but no Splat (Candy)", () => {
    const state = serpentArenaV7({
      factions: ["CANDY", "GOBLIN"],
      pieces: [ship(0, "BATTLESHIP", at(7, 9))],
    });
    const galleon = unitAt(state, at(7, 9));
    const result = applyAcceptedV7(state, P1, {
      kind: "ATTACK",
      unitId: galleon.id,
      targetUnitId: serpentOfV7(state).id,
    });
    expect(serpentOfV7(result.state).hp).toBeLessThan(32);
    expect(result.state.splattedThisTurn).not.toContain(serpentOfV7(state).id);
  });

  it("takes a Fire Raft's Kaboom (Goblins)", () => {
    const state = serpentArenaV7({
      factions: ["GOBLIN", "ORIGINAL"],
      pieces: [ship(0, "PATROL_BOAT", at(6, 9))],
    });
    const raft = unitAt(state, at(6, 9));
    const result = applyAcceptedV7(state, P1, {
      kind: "KABOOM",
      unitId: raft.id,
    });
    expect(serpentOfV7(result.state).hp).toBeLessThan(32);
  });
});

describe("the Serpent and the frozen sea (section 8.7)", () => {
  const iceFolk = (options: Parameters<typeof serpentArenaV7>[0] = {}) =>
    serpentArenaV7({ factions: ["ICE_FOLK", "GOBLIN"], ...options });

  it("never has its tile frozen: a Freeze skips it", () => {
    const state = iceFolk({
      serpentAt: at(8, 9),
      pieces: [{ seat: 0, role: "FIGHTER", at: at(9, 9) }],
    });
    const fighter = unitAt(state, at(9, 9));
    const commands = queryPlayerCommandsV7(viewForV7(state, P1)).filter(
      (command) => command.kind === "FREEZE" && command.unitId === fighter.id,
    );
    expect(
      commands.some(
        (command) =>
          command.kind === "FREEZE" && command.at.x === 8 && command.at.y === 9,
      ),
    ).toBe(false);
    expect(commands.length).toBeGreaterThan(0);
    expect(
      rejectionV7(state, P1, {
        kind: "FREEZE",
        unitId: fighter.id,
        at: at(8, 9),
      }),
    ).toEqual({ code: "FREEZE_NOT_LEGAL", params: { reason: "NO_TARGET" } });
    for (const command of commands) {
      const frozen = applyAcceptedV7(state, P1, command);
      expect(
        frozen.state.ice.some((entry) => entry.at.x === 8 && entry.at.y === 9),
      ).toBe(false);
    }
  });

  it("is fenced in by ice and still bites a unit on the ice beside it", () => {
    const ring = [
      at(4, 8),
      at(5, 8),
      at(6, 8),
      at(4, 9),
      at(6, 9),
      at(4, 10),
      at(5, 10),
      at(6, 10),
    ];
    const state = iceFolk({
      ice: ring.map((tile) => ({ at: tile, ownerId: P1, cracked: false })),
      pieces: [{ seat: 0, role: "FIGHTER", at: at(6, 9) }],
    });
    const serpent = serpentOfV7(state);
    expect(
      neutralStepsV7(facts(state), serpent, state.monsters[0] as never),
    ).toEqual([]);
    const result = endRound(state);
    const turn = neutralEvents(result.events);
    expect(turn.some((event) => event.kind === "UNIT_MOVED")).toBe(false);
    expect(combats(turn)[0]?.targetUnitId).toBe(unitAt(state, at(6, 9)).id);
    expect(serpentOfV7(result.state).at).toEqual(SERPENT_HOME_V7);
  });

  it("never returns to a frozen home", () => {
    const state = iceFolk({
      serpentAt: at(4, 9),
      ice: [{ at: SERPENT_HOME_V7, ownerId: P1, cracked: false }],
    });
    expect(
      seaSerpentStandableV7(facts(state), SERPENT_HOME_V7, SERPENT_HOME_V7),
    ).toBe(false);
  });
});

describe("death and bounty (section 8.8)", () => {
  it("pays 15 Coins to its killer's owner, counts the kill, and leaves no Grave", () => {
    const state = serpentArenaV7({
      serpentHp: 3,
      pieces: [ship(0, "BATTLESHIP", at(7, 9))],
    });
    const battleship = unitAt(state, at(7, 9));
    const result = applyAcceptedV7(state, P1, {
      kind: "ATTACK",
      unitId: battleship.id,
      targetUnitId: serpentOfV7(state).id,
    });
    expect(
      result.events.find((event) => event.kind === "MONSTER_BOUNTY_AWARDED"),
    ).toMatchObject({ playerId: P1, coins: SEA_SERPENT_BOUNTY_V7 });
    expect(alive(result.state, battleship.id)?.kills).toBe(1);
    expect(result.state.graves).toEqual(state.graves);
    expect(result.state.monsters).toEqual([]);
  });
});

describe("the public preview (section 10.4)", () => {
  it("previews its area, provoke tiles, reach, provokers, and likely target", () => {
    const state = serpentArenaV7({
      pieces: [
        ship(0, "BATTLESHIP", at(6, 10)),
        ship(0, "PATROL_BOAT", at(4, 8), 6),
      ],
    });
    const serpent = serpentOfV7(state);
    const view = viewForV7(state, P1);
    const preview = previewMonsterV7(view, serpent.id);
    if (preview === null) throw new Error("no preview");
    expect(preview.breed).toBe("SEA_SERPENT");
    expect(preview.home).toEqual(SERPENT_HOME_V7);
    // The lake within 3 of home: x 2 to 8, y 6 to 12.
    expect(preview.area).toHaveLength(49);
    expect(preview.provokeTiles).toHaveLength(8);
    // Every tile next to a tile it can reach in 0 to 2 steps (the two ships
    // are walls), its own tile apart.
    const reachable = seaSerpentReachV7(facts(state), serpent, {
      home: SERPENT_HOME_V7,
    }).map((tile) => tile.at);
    const expected = new Set<string>();
    for (const tile of reachable)
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1)
          if (!(tile.x + dx === 5 && tile.y + dy === 9))
            expected.add(`${tile.x + dx},${tile.y + dy}`);
    expect(
      new Set(preview.reachTiles.map((tile) => `${tile.x},${tile.y}`)),
    ).toEqual(expected);
    expect([...preview.provokers].sort()).toEqual(
      [unitAt(state, at(6, 10)).id, unitAt(state, at(4, 8)).id].sort(),
    );
    expect(preview.likelyTarget).toBe(unitAt(state, at(4, 8)).id);
    expect(preview.exact).toBe(true);
    expect(queryThreatenedTilesV7(view, serpent.id)).toEqual(
      preview.provokeTiles,
    );
    // The canonical bite takes the previewed target.
    const [bite] = combats(neutralEvents(endRound(state).events));
    expect(bite?.targetUnitId).toBe(preview.likelyTarget);
  });

  it("is inexact when an unexplored tile lies within 3 of it", () => {
    const state = serpentArenaV7({
      explored: {
        0: [at(5, 9), at(6, 9), at(9, 15), at(12, 4)],
      },
    });
    const preview = previewMonsterV7(
      viewForV7(state, P1),
      serpentOfV7(state).id,
    );
    expect(preview?.exact).toBe(false);
  });
});

describe("parsing (section 10.2)", () => {
  it("rejects every bad Serpent state", () => {
    const state = serpentArenaV7();
    const serpent = serpentOfV7(state);
    const json = JSON.parse(JSON.stringify(state)) as GameStateV7;
    expect(parseGameStateV7(json)).not.toBeNull();
    const withSerpent = (patch: Partial<UnitStateV7>): GameStateV7 => ({
      ...json,
      units: json.units.map((unit) =>
        unit.id === serpent.id ? { ...unit, ...patch } : unit,
      ),
    });
    const variants: GameStateV7[] = [
      // In land form, with the wrong maximum HP, or another role.
      withSerpent({ form: "LAND" }),
      withSerpent({ maxHp: 30, hp: 30 }),
      withSerpent({ role: "JUGGERNAUT" }),
      // On land, beyond 3 of home, on ice.
      withSerpent({ at: at(9, 9) }),
      withSerpent({ at: at(1, 9) }),
      {
        ...json,
        setup: { ...json.setup, factions: ["ORIGINAL", "ICE_FOLK"] },
        ice: [{ at: SERPENT_HOME_V7, ownerId: P2, cracked: false }],
      },
      // On Dry Land.
      { ...json, setup: { ...json.setup, mapType: "DRY_LAND" } },
      // Two Serpents.
      {
        ...json,
        nextEntityId: json.nextEntityId + 1,
        units: [
          ...json.units,
          { ...serpent, id: json.nextEntityId as never, at: at(4, 9) },
        ],
        monsters: [
          ...json.monsters,
          {
            unitId: json.nextEntityId as never,
            breed: "SEA_SERPENT",
            home: SERPENT_HOME_V7,
            provokedBy: [],
          },
        ],
      },
    ];
    for (const variant of variants)
      expect(
        parseGameStateV7(variant),
        JSON.stringify(variant.setup),
      ).toBeNull();
  });

  it("rejects a Serpent with a Spider or a camp (the one danger)", () => {
    const spider = { neutrals: [{ breed: "GIANT_SPIDER", home: at(15, 9) }] };
    const camp = {
      curiosities: [{ kind: "GRAVEYARD", at: at(15, 9) }],
      neutrals: [
        { breed: "ZOMBIE", home: at(15, 9), at: at(14, 9) },
        { breed: "ZOMBIE", home: at(15, 9), at: at(16, 9) },
      ],
    };
    for (const options of [spider, camp] as const) {
      // Each parses without the Serpent, and not with it.
      expect(() =>
        serpentArenaV7({ ...options, home: null } as never),
      ).not.toThrow();
      expect(() => serpentArenaV7(options as never)).toThrow(
        "Invalid v7 fixture",
      );
    }
  });
});
