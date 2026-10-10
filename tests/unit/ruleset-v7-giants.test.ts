import { describe, expect, it } from "vitest";
import {
  BREAK_OFF_HP_V7,
  CRUSH_DAMAGE_V7,
  DIGEST_DAMAGE_V7,
  FACTION_IDS_V7,
  GIANT_SIGNATURES_V7,
  GLACIAL_SMASH_HP_V7,
  NEUTRAL_MONSTER_ROLE_MECHANICS_V7,
  NEUTRAL_MONSTER_ROLE_RULE_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  STOMP_DAMAGE_V7,
  SWALLOW_MAX_HP_V7,
  TOSS_RANGE_V7,
  TRAMPLE_DAMAGE_V7,
  applyCommandV7,
  assignedUnitCountV7,
  canonicalHash,
  cityUnitCapacityV7,
  cityHasWallsV7,
  effectiveRoleRuleV7,
  giantSignatureV7,
  parseEventV7,
  parseGameStateV7,
  previewBreakOffV7,
  previewStompV7,
  previewSwallowV7,
  previewTossV7,
  previewTrampleV7,
  projectEventsV7,
  prunedGiantsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryUnitStatsV7,
  roleMechanicsV7,
  swallowedOutcomeEventsV7,
  viewForV7,
  type CommandV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  fieldV7,
  kindsV7,
  patchUnitV7,
  tileV7,
  unexploreV7,
  walledV7,
} from "../fixtures/v7-revision20";
import { martianFieldV7 } from "../fixtures/v7-martian";
import { iceFieldV7, viewSnowV7 } from "../fixtures/v7-ice-folk";
import { rewardStateV7 } from "../fixtures/v7-dinosaur-arena";

/**
 * The giants' signatures (`pulp_wars-w49.30`, docs/product/RULESET_7_GIANTS.md
 * sections 6 and 8): every faction's reward giant has one signature
 * ability, Push stays only on the Human Juggernaut, the Colossus has Move
 * 2, and the Frost Giant never advances. The neutral Giant Spider shares
 * the role and has none of it.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8). Every other land tile is open
 * Grass, every tile is explored by both seats, each seat has every land
 * technology and 100 Coins, and seat 0 is active unless a test says
 * otherwise.
 */

/**
 * The Cultists (`pulp_wars-mch9.3`): the Thing in the Cellar is registered
 * without a signature; Anchor arrives with its own bead
 * (`pulp_wars-mch9.5`), so its entry is null until then.
 */
const SIGNATURE_OF: Readonly<Record<FactionIdV7, string | null>> = {
  ORIGINAL: "CRUSH",
  UNDEAD: "SWALLOW",
  GOBLIN: "TOSS",
  DINOSAUR: "STOMP",
  MARTIAN: "OVERSTRIDE",
  ICE_FOLK: "GLACIAL_SMASH",
  DWARF: "SIEGE_HAMMER",
  CANDY: "BREAK_OFF",
  CULT: null,
};

function field(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly GoblinPieceV7[],
  activeSeat = 0,
): GameStateV7 {
  return fieldV7(pieces, { factions, activeSeat });
}

function reject(
  state: GameStateV7,
  command: CommandV7,
): { readonly code: string; readonly params: Record<string, unknown> } {
  const result = applyCommandV7(state, activeIdV7(state), command);
  if (result.accepted) throw new Error(`${command.kind} accepted`);
  expect(
    queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))),
  ).not.toContainEqual(command);
  return result.error;
}

function apply(
  state: GameStateV7,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const actor = activeIdV7(state);
  expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
    command,
  );
  const result = applyOkV7(state, actor, command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  // Save, load, and hash: the state round-trips exactly.
  const loaded = parseGameStateV7(JSON.parse(JSON.stringify(result.state)));
  expect(loaded).toEqual(result.state);
  expect(canonicalHash(loaded)).toBe(canonicalHash(result.state));
  // The command is deterministic.
  const again = applyOkV7(state, actor, command);
  expect(again.events).toEqual(result.events);
  expect(canonicalHash(again.state)).toBe(canonicalHash(result.state));
  // Every projection of the batch parses as a player event envelope.
  for (const player of result.state.players)
    projectEventsV7(state, result.state, player.id, result.events);
  return result;
}

const idAt = (state: GameStateV7, x: number, y: number): UnitStateV7["id"] =>
  unitAtV7(state, at(x, y)).id;

const unitById = (
  state: GameStateV7,
  id: UnitStateV7["id"],
): UnitStateV7 | undefined => state.units.find((unit) => unit.id === id);

describe("the giants' signatures: the identity", () => {
  // The reward ladder rework (`pulp_wars-zypi`) took 7r63 after it, and
  // any unit can capture (`pulp_wars-ke95`) 7r64, and score and modes
  // (`pulp_wars-kaw6.2`) 7r65, and map curiosities round 2
  // (`pulp_wars-737.14`) 7r66, and Ice Folk Freeze (`pulp_wars-w49.37`)
  // 7r67, and the Candy redesign (`pulp_wars-jdb.12`) 7r68, and the
  // Monument skin rule (`pulp_wars-eu3r.3`) 7r69, and the Vampire and
  // Banshee rework (`pulp_wars-ty6i`) 7r70.
  it("was 7r62 after 7r61, whose save keys are obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r76");
    expect(PRIOR_RULESET_7_IDS.slice(-15, -13)).toEqual([
      "pulp-wars-poc-7r61",
      "pulp-wars-poc-7r62",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r76.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-15, -13)).toEqual([
      "pulpWars.save.v7r61.current",
      "pulpWars.save.v7r62.current",
    ]);
  });
});

describe("the giants' signatures: the registry", () => {
  it("gives every faction's giant exactly its one signature", () => {
    for (const faction of FACTION_IDS_V7) {
      const rule = effectiveRoleRuleV7("JUGGERNAUT", faction);
      const signatures = GIANT_SIGNATURES_V7.filter((ability) =>
        rule.abilities.includes(ability),
      );
      const signature = SIGNATURE_OF[faction];
      expect(signatures, faction).toEqual(
        signature === null ? [] : [signature],
      );
      // Push stays only on the Human Juggernaut (G1).
      expect(rule.abilities.includes("PUSH"), faction).toBe(
        faction === "ORIGINAL",
      );
      // No other role of any faction has a signature.
      for (const role of [
        "FIGHTER",
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "CAPTAIN",
        "CATAPULT",
        "KNIGHT",
        "SWORDSMAN",
      ] as const)
        expect(
          GIANT_SIGNATURES_V7.some((ability) =>
            effectiveRoleRuleV7(role, faction).abilities.includes(ability),
          ),
          `${faction} ${role}`,
        ).toBe(false);
    }
  });

  it("sets the numbers of section 6 and the stat changes", () => {
    expect(roleMechanicsV7("JUGGERNAUT", "ORIGINAL").crushDamage).toBe(3);
    expect(roleMechanicsV7("JUGGERNAUT", "UNDEAD").swallowMaxHp).toBe(12);
    expect(DIGEST_DAMAGE_V7).toBe(4);
    expect(roleMechanicsV7("JUGGERNAUT", "GOBLIN").tossRange).toBe(3);
    expect(roleMechanicsV7("JUGGERNAUT", "DINOSAUR").stompDamage).toBe(4);
    expect(roleMechanicsV7("JUGGERNAUT", "MARTIAN").trampleDamage).toBe(3);
    expect(roleMechanicsV7("JUGGERNAUT", "ICE_FOLK").glacialSmashHp).toBe(8);
    expect(roleMechanicsV7("JUGGERNAUT", "DWARF").siegeHammer).toBe(true);
    expect(roleMechanicsV7("JUGGERNAUT", "CANDY").breakOffHp).toBe(10);
    // The Colossus has Move 2; the Frost Giant never advances (as the
    // Abomination); the other giants keep their advance.
    expect(effectiveRoleRuleV7("JUGGERNAUT", "MARTIAN").move).toBe(2);
    expect(roleMechanicsV7("JUGGERNAUT", "ICE_FOLK").advancesAfterKill).toBe(
      false,
    );
    expect(roleMechanicsV7("JUGGERNAUT", "UNDEAD").advancesAfterKill).toBe(
      false,
    );
    for (const faction of [
      "ORIGINAL",
      "GOBLIN",
      "DINOSAUR",
      "DWARF",
      "CANDY",
    ] as const)
      expect(roleMechanicsV7("JUGGERNAUT", faction).advancesAfterKill).toBe(
        true,
      );
  });

  it("switches every new field off for the neutral Giant Spider", () => {
    expect(NEUTRAL_MONSTER_ROLE_RULE_V7.abilities).toEqual(["ATTACK"]);
    expect(NEUTRAL_MONSTER_ROLE_MECHANICS_V7).toMatchObject({
      crushDamage: 0,
      swallowMaxHp: 0,
      tossRange: 0,
      stompDamage: 0,
      trampleDamage: 0,
      glacialSmashHp: 0,
      siegeHammer: false,
      breakOffHp: 0,
    });
    // Every other role of every faction has them off too.
    for (const faction of FACTION_IDS_V7)
      for (const role of ["FIGHTER", "KNIGHT", "SWORDSMAN"] as const)
        expect(roleMechanicsV7(role, faction)).toMatchObject({
          crushDamage: 0,
          swallowMaxHp: 0,
          tossRange: 0,
          stompDamage: 0,
          trampleDamage: 0,
          glacialSmashHp: 0,
          siegeHammer: false,
          breakOffHp: 0,
        });
  });

  it("names the signature on the giant's public stats", () => {
    const state = field(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "JUGGERNAUT", at: at(5, 1) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
      ],
    );
    expect(queryUnitStatsV7(state, idAt(state, 5, 3))?.giant).toEqual({
      signature: "CRUSH",
      amount: CRUSH_DAMAGE_V7,
      swallowed: null,
    });
    expect(queryUnitStatsV7(state, idAt(state, 5, 1))?.giant).toEqual({
      signature: "SWALLOW",
      amount: SWALLOW_MAX_HP_V7,
      swallowed: null,
    });
    expect(queryUnitStatsV7(state, idAt(state, 6, 3))?.giant).toBeUndefined();
    expect(giantSignatureV7(state, unitAtV7(state, at(5, 1)))).toBe("SWALLOW");
  });
});

describe("Crushing Shove (section 6.1)", () => {
  const juggernaut = (
    pieces: readonly GoblinPieceV7[],
    opponent: FactionIdV7 = "UNDEAD",
  ): GameStateV7 =>
    field(
      ["ORIGINAL", opponent],
      [{ seat: 0, role: "JUGGERNAUT", at: at(4, 3) }, ...pieces],
    );

  it("pushes a target with room behind it, and crushes nothing", () => {
    const state = juggernaut([{ seat: 1, role: "GUARD", at: at(5, 3) }]);
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat.push).toBe("WILL_PUSH");
    expect(run.combat.crush).toBe("NONE");
    expect(kindsV7(run.events)).not.toContain("UNIT_CRUSHED");
    expect(run.target?.at).toEqual(at(6, 3));
  });

  it("crushes a blocked target and the hostile unit behind it", () => {
    const state = juggernaut([
      { seat: 1, role: "SWORDSMAN", at: at(5, 3) },
      { seat: 1, role: "MARKSMAN", at: at(6, 3) },
    ]);
    const before = unitAtV7(state, at(5, 3));
    const blocker = unitAtV7(state, at(6, 3));
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat.crush).toBe("WILL_CRUSH");
    expect(run.combat.crushDamage).toBe(CRUSH_DAMAGE_V7);
    expect(run.combat.collisionDamage).toBe(CRUSH_DAMAGE_V7);
    const crushed = run.events.find((event) => event.kind === "UNIT_CRUSHED");
    expect(crushed).toEqual({
      kind: "UNIT_CRUSHED",
      playerId: activeIdV7(state),
      sourceUnitId: idAt(state, 4, 3),
      targetUnitId: before.id,
      damage: 3,
      shieldDamage: 0,
      dies: before.hp - run.combat.damageToDefender <= 3,
      blockerUnitId: blocker.id,
      blockerDamage: 3,
      blockerShieldDamage: 0,
      blockerDies: false,
    });
    // The crush follows the exchange; nothing retaliates for it.
    expect(kindsV7(run.events).indexOf("UNIT_CRUSHED")).toBeGreaterThan(
      kindsV7(run.events).indexOf("COMBAT_RESOLVED"),
    );
    expect(unitById(run.state, blocker.id)?.hp).toBe(blocker.hp - 3);
    expect(run.attacker?.hp).toBe(
      unitAtV7(state, at(4, 3)).hp - run.combat.damageToAttacker,
    );
  });

  it("crushes the target but not an own blocker behind it", () => {
    const state = juggernaut([
      { seat: 1, role: "GUARD", at: at(5, 3) },
      { seat: 0, role: "FIGHTER", at: at(6, 3) },
    ]);
    const own = unitAtV7(state, at(6, 3));
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat.crush).toBe("WILL_CRUSH");
    expect(run.combat.collisionDamage).toBe(0);
    expect(
      run.events.find((event) => event.kind === "UNIT_CRUSHED"),
    ).toMatchObject({ damage: 3, blockerUnitId: null, blockerDamage: 0 });
    expect(unitById(run.state, own.id)?.hp).toBe(own.hp);
    expect(run.target?.hp).toBe(
      unitAtV7(state, at(5, 3)).hp - run.combat.damageToDefender - 3,
    );
  });

  it("crushes against the board edge, water, and a settlement site", () => {
    // The board edge: the target on the last column.
    const edge = field(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(9, 3) },
        { seat: 1, role: "GUARD", at: at(10, 3) },
      ],
    );
    expect(attackV7(edge, at(9, 3), at(10, 3)).combat.crush).toBe("WILL_CRUSH");
    // Water behind the target.
    const lake = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(4, 3) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"], water: [at(6, 3)] },
    );
    const run = attackV7(lake, at(4, 3), at(5, 3));
    expect(run.combat.crush).toBe("WILL_CRUSH");
    expect(kindsV7(run.events)).toContain("UNIT_CRUSHED");
    // A village center behind the target.
    const site = juggernaut([{ seat: 1, role: "GUARD", at: at(5, 4) }]);
    const moved = checkedV7({
      ...site,
      units: site.units.map((unit) =>
        unit.role === "JUGGERNAUT" ? { ...unit, at: at(5, 3) } : unit,
      ),
    });
    expect(attackV7(moved, at(5, 3), at(5, 4)).combat.crush).toBe("WILL_CRUSH");
  });

  it("never crushes a Rock Hard Jawbreaker", () => {
    const state = juggernaut(
      [
        { seat: 1, role: "SWORDSMAN", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ],
      "CANDY",
    );
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat.crush).toBe("NONE");
    expect(kindsV7(run.events)).not.toContain("UNIT_CRUSHED");
  });

  it("kills with the crush and the collision: a Grave and a death blast", () => {
    // The Undead seat has Graves. A Zombie left at 1 to 3 HP by the
    // exchange dies of the crush; the Skeleton behind it of the collision.
    let graves: GameStateV7 | null = null;
    for (let hp = 18; hp >= 4 && graves === null; hp -= 1) {
      const candidate = juggernaut([
        { seat: 1, role: "GUARD", at: at(5, 3), hp },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 3 },
      ]);
      const preview = queryCombatPreviewV7(
        viewForV7(candidate, activeIdV7(candidate)),
        idAt(candidate, 4, 3),
        idAt(candidate, 5, 3),
      );
      if (
        preview !== null &&
        !preview.defenderDies &&
        hp - preview.damageToDefender <= CRUSH_DAMAGE_V7
      )
        graves = candidate;
    }
    if (graves === null) throw new Error("no crushable HP");
    const blocker = unitAtV7(graves, at(6, 3));
    const run = attackV7(graves, at(4, 3), at(5, 3));
    const died = run.events.filter(
      (event) => event.kind === "UNIT_DIED" && event.cause === "CRUSH",
    );
    expect(died).toHaveLength(2);
    expect(run.target).toBeUndefined();
    expect(unitById(run.state, blocker.id)).toBeUndefined();
    expect(run.state.graves).toEqual(
      expect.arrayContaining([at(5, 3), at(6, 3)]),
    );
    // A crush kill is never followed by an advance; kill credit (G5).
    expect(run.attacker?.at).toEqual(at(4, 3));
    expect(run.attacker?.kills).toBe(2);
    // A Goblin Rocket Cart crushed to death explodes.
    const blast = juggernaut(
      [
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "CATAPULT", at: at(6, 3), hp: 2 },
      ],
      "GOBLIN",
    );
    const boom = attackV7(blast, at(4, 3), at(5, 3));
    expect(kindsV7(boom.events)).toContain("EXPLOSION_RESOLVED");
    expect(
      boom.events.some(
        (event) => event.kind === "UNIT_DIED" && event.cause === "CRUSH",
      ),
    ).toBe(true);
  });

  it("takes a Shield first and is reduced by Armoured", () => {
    // A Martian blocker's Shield absorbs the collision.
    const martian = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(4, 3) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ],
      { factions: ["ORIGINAL", "MARTIAN"] },
    );
    const shielded = checkedV7({
      ...martian,
      shields: [{ unitId: idAt(martian, 6, 3), shield: 2 }],
    });
    const run = attackV7(shielded, at(4, 3), at(5, 3));
    expect(
      run.events.find((event) => event.kind === "UNIT_CRUSHED"),
    ).toMatchObject({ blockerDamage: 1, blockerShieldDamage: 2 });
    // An Ankylosaurus (Armoured) takes 2 of the crush.
    const dinosaur = juggernaut(
      [
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ],
      "DINOSAUR",
    );
    const armoured = attackV7(dinosaur, at(4, 3), at(5, 3));
    expect(
      armoured.events.find((event) => event.kind === "UNIT_CRUSHED"),
    ).toMatchObject({ damage: 2 });
  });

  it("hides a blocker the attacker cannot see in the projection", () => {
    const state = unexploreV7(
      juggernaut([
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ]),
      0,
      [at(6, 3)],
    );
    const actor = activeIdV7(state);
    const command: CommandV7 = {
      kind: "ATTACK",
      unitId: idAt(state, 4, 3),
      targetUnitId: idAt(state, 5, 3),
    };
    const preview = queryCombatPreviewV7(
      viewForV7(state, actor),
      command.unitId,
      (command as { targetUnitId: number }).targetUnitId as never,
    );
    expect(preview?.crush).toBe("UNKNOWN_BEHIND_FOG");
    expect(preview?.collisionDamage).toBe(0);
    const result = applyOkV7(state, actor, command);
    expect(
      result.events.find((event) => event.kind === "UNIT_CRUSHED"),
    ).toMatchObject({ blockerDamage: 3 });
    const projected = projectEventsV7(
      state,
      result.state,
      actor,
      result.events,
    );
    const own = projected.events.find((event) => event.kind === "UNIT_CRUSHED");
    expect(own).toMatchObject({
      damage: 3,
      blockerUnitId: null,
      blockerDamage: 0,
    });
    const combat = projected.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    expect(combat).toMatchObject({
      preview: { crush: "UNKNOWN_BEHIND_FOG", collisionDamage: 0 },
    });
  });
});

describe("Swallow (section 6.2)", () => {
  /** The Undead seat 0's Abomination at (5, 3) and Human pieces. */
  const abomination = (
    pieces: readonly GoblinPieceV7[],
    opponent: FactionIdV7 = "ORIGINAL",
  ): GameStateV7 =>
    field(
      ["UNDEAD", opponent],
      [{ seat: 0, role: "JUGGERNAUT", at: at(5, 3) }, ...pieces],
    );
  const swallow = (
    state: GameStateV7,
    target: { x: number; y: number },
  ): CommandV7 => ({
    kind: "SWALLOW",
    unitId: idAt(state, 5, 3),
    targetUnitId: idAt(state, target.x, target.y),
  });
  /** A state in which the Abomination holds the Knight on (6, 3). */
  const held = (
    pieces: readonly GoblinPieceV7[] = [],
    knightHp = 9,
  ): GameStateV7 => {
    const state = abomination([
      { seat: 1, role: "KNIGHT", at: at(6, 3), hp: knightHp },
      ...pieces,
    ]);
    return apply(state, swallow(state, at(6, 3))).state;
  };

  it("takes the target off the board and holds it", () => {
    const state = abomination([
      { seat: 1, role: "KNIGHT", at: at(6, 3), hp: 9 },
    ]);
    const knight = unitAtV7(state, at(6, 3));
    const holder = unitAtV7(state, at(5, 3));
    const view = viewForV7(state, activeIdV7(state));
    expect(previewSwallowV7(view, holder.id, knight.id)).toEqual({
      unitId: holder.id,
      targetUnitId: knight.id,
      targetOwnerId: knight.ownerId,
      role: "KNIGHT",
      hp: 9,
      digestedAfterTurns: 3,
    });
    const run = apply(state, swallow(state, at(6, 3)));
    expect(run.events[0]).toEqual({
      kind: "UNIT_SWALLOWED",
      playerId: holder.ownerId,
      unitId: holder.id,
      victimUnitId: knight.id,
      victimOwnerId: knight.ownerId,
      role: "KNIGHT",
      hp: 9,
    });
    expect(unitById(run.state, knight.id)).toBeUndefined();
    expect(run.state.giants.swallowed).toEqual([
      {
        holderUnitId: holder.id,
        unit: expect.objectContaining({
          id: knight.id,
          hp: 9,
          at: holder.at,
          homeCityId: knight.homeCityId,
          captureEligible: false,
        }),
      },
    ]);
    // It is a primary action; the Abomination did not move; no credit.
    const after = unitById(run.state, holder.id);
    expect(after?.at).toEqual(holder.at);
    expect(after?.kills).toBe(0);
    expect(after?.activation.specialActed).toBe(true);
    // The victim still counts for its home city's unit limit.
    expect(assignedUnitCountV7(run.state, knight.homeCityId as never)).toBe(
      assignedUnitCountV7(state, knight.homeCityId as never),
    );
    // The holder carries it on its public stats; its owner's view knows it.
    expect(queryUnitStatsV7(run.state, holder.id)?.giant?.swallowed).toEqual({
      unitId: knight.id,
      ownerId: knight.ownerId,
      role: "KNIGHT",
      hp: 9,
      maxHp: knight.maxHp,
    });
    const victimView = viewForV7(run.state, knight.ownerId);
    expect(victimView.giants.swallowed).toEqual([
      {
        holderUnitId: holder.id,
        unit: {
          id: knight.id,
          ownerId: knight.ownerId,
          role: "KNIGHT",
          hp: 9,
          maxHp: knight.maxHp,
          homeCityId: knight.homeCityId,
        },
      },
    ]);
    // The victim's owner sees the Swallow.
    expect(
      projectEventsV7(state, run.state, knight.ownerId, run.events).events.map(
        (event) => event.kind,
      ),
    ).toContain("UNIT_SWALLOWED");
  });

  it("drops every per-unit entry of the victim (a Martian's Shield)", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ],
      { factions: ["UNDEAD", "MARTIAN"] },
    );
    const grunt = unitAtV7(state, at(6, 3));
    expect(state.shields.some((entry) => entry.unitId === grunt.id)).toBe(true);
    const run = apply(state, swallow(state, at(6, 3)));
    expect(run.state.giants.swallowed.map((entry) => entry.unit.id)).toEqual([
      grunt.id,
    ]);
    expect(run.state.shields.some((entry) => entry.unitId === grunt.id)).toBe(
      false,
    );
  });

  it("refuses every illegal Swallow in the order of its table", () => {
    // Row 2: a role without SWALLOW.
    const zombie = abomination([
      { seat: 0, role: "GUARD", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(4, 5), hp: 5 },
    ]);
    expect(
      reject(zombie, {
        kind: "SWALLOW",
        unitId: idAt(zombie, 4, 4),
        targetUnitId: idAt(zombie, 4, 5),
      }),
    ).toMatchObject({ code: "UNIT_ROLE_INVALID" });
    // Row 4: after a primary action.
    const acted = patchUnitV7(
      abomination([{ seat: 1, role: "FIGHTER", at: at(6, 3), hp: 5 }]),
      at(5, 3),
      {
        activation: {
          ...unitAtV7(
            abomination([{ seat: 1, role: "FIGHTER", at: at(6, 3), hp: 5 }]),
            at(5, 3),
          ).activation,
          attacked: true,
          attacksUsed: 1,
        },
      },
    );
    expect(reject(acted, swallow(acted, at(6, 3)))).toMatchObject({
      code: "UNIT_ALREADY_ACTED",
    });
    // Row 5: it holds a victim already (a fresh turn, the same holder).
    const full = held([{ seat: 1, role: "FIGHTER", at: at(4, 3), hp: 5 }]);
    const fresh = patchUnitV7(full, at(5, 3), {
      activation: unitAtV7(
        abomination([{ seat: 1, role: "FIGHTER", at: at(6, 3) }]),
        at(5, 3),
      ).activation,
    });
    expect(reject(fresh, swallow(fresh, at(4, 3)))).toMatchObject({
      code: "SWALLOW_NOT_LEGAL",
      params: { reason: "FULL" },
    });
    // Row 6: not adjacent; an own unit.
    const far = abomination([
      { seat: 1, role: "FIGHTER", at: at(7, 3), hp: 5 },
      { seat: 0, role: "FIGHTER", at: at(4, 3), hp: 5 },
    ]);
    expect(reject(far, swallow(far, at(7, 3)))).toMatchObject({
      params: { reason: "TARGET" },
    });
    expect(reject(far, swallow(far, at(4, 3)))).toMatchObject({
      params: { reason: "TARGET" },
    });
    // Row 7: a giant, a two-slot unit, a construct, Rock Hard.
    const giant = abomination([
      { seat: 1, role: "JUGGERNAUT", at: at(6, 3), hp: 5 },
    ]);
    expect(reject(giant, swallow(giant, at(6, 3)))).toMatchObject({
      params: { reason: "IMMUNE" },
    });
    const rex = abomination(
      [{ seat: 1, role: "KNIGHT", at: at(6, 3), hp: 5 }],
      "DINOSAUR",
    );
    expect(reject(rex, swallow(rex, at(6, 3)))).toMatchObject({
      params: { reason: "IMMUNE" },
    });
    const gunner = abomination(
      [{ seat: 1, role: "MARKSMAN", at: at(6, 3), hp: 5 }],
      "DWARF",
    );
    expect(reject(gunner, swallow(gunner, at(6, 3)))).toMatchObject({
      params: { reason: "IMMUNE" },
    });
    const jawbreaker = abomination(
      [{ seat: 1, role: "SWORDSMAN", at: at(6, 3), hp: 5 }],
      "CANDY",
    );
    expect(reject(jawbreaker, swallow(jawbreaker, at(6, 3)))).toMatchObject({
      params: { reason: "IMMUNE" },
    });
    // Row 8: more than 12 HP (a Shield does not count).
    const big = abomination([{ seat: 1, role: "KNIGHT", at: at(6, 3) }]);
    expect(unitAtV7(big, at(6, 3)).hp).toBeGreaterThan(SWALLOW_MAX_HP_V7);
    expect(reject(big, swallow(big, at(6, 3)))).toMatchObject({
      params: { reason: "TOO_BIG" },
    });
  });

  it("empties a city center it swallows from", () => {
    const state = field(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(3, 8) },
        { seat: 1, role: "GUARD", at: at(2, 8), hp: 7 },
      ],
    );
    const run = apply(state, {
      kind: "SWALLOW",
      unitId: idAt(state, 3, 8),
      targetUnitId: idAt(state, 2, 8),
    });
    expect(
      run.state.units.some((unit) => unit.at.x === 2 && unit.at.y === 8),
    ).toBe(false);
  });

  it("digests the victim at its holder's Start Turns and spits out a Zombie", () => {
    let state = patchUnitV7(held(), at(5, 3), { hp: 30 });
    const holder = unitAtV7(state, at(5, 3));
    const victim = state.giants.swallowed[0]?.unit as UnitStateV7;
    const undead = holder.ownerId;
    // Turn 1: 9 to 5, the Abomination heals 4.
    let turn = endTurnUntilV7(state, undead);
    state = turn.state;
    expect(turn.events.find((event) => event.kind === "UNIT_DIGESTED")).toEqual(
      {
        kind: "UNIT_DIGESTED",
        playerId: undead,
        unitId: holder.id,
        victimUnitId: victim.id,
        amount: 4,
        hpAfter: 5,
        healed: 4,
      },
    );
    expect(unitById(state, holder.id)?.hp).toBe(34);
    // Turn 2: 5 to 1.
    turn = endTurnUntilV7(state, undead);
    state = turn.state;
    expect(state.giants.swallowed[0]?.unit.hp).toBe(1);
    // Turn 3: dead inside; a Zombie of the Undead seat rises beside it.
    turn = endTurnUntilV7(state, undead);
    state = turn.state;
    const kinds = kindsV7(turn.events);
    expect(kinds.indexOf("UNIT_DIGESTED")).toBeLessThan(
      kinds.indexOf("UNIT_REGURGITATED"),
    );
    expect(
      turn.events.find(
        (event) => event.kind === "UNIT_DIED" && event.unitId === victim.id,
      ),
    ).toEqual({ kind: "UNIT_DIED", unitId: victim.id, cause: "DIGESTED" });
    const spat = turn.events.find(
      (event) => event.kind === "UNIT_REGURGITATED",
    );
    if (spat?.kind !== "UNIT_REGURGITATED" || spat.zombieUnitId === null)
      throw new Error("no Zombie");
    const zombie = unitById(state, spat.zombieUnitId);
    expect(zombie).toMatchObject({
      ownerId: undead,
      role: "GUARD",
      hp: 12,
      homeCityId: null,
      at: at(4, 2),
    });
    // The first free tile around it in (y, x) order.
    expect(spat.at).toEqual(at(4, 2));
    expect(state.giants.swallowed).toEqual([]);
    // Kill credit to the Abomination; no Grave, no Crumbs.
    expect(unitById(state, holder.id)?.kills).toBe(1);
    expect(kinds).not.toContain("GRAVE_CREATED");
    // The parse of every event of the batch.
    for (const event of turn.events) expect(parseEventV7(event).ok).toBe(true);
  });

  it("spits out no Zombie when every tile around it is taken", () => {
    const ring = [
      at(4, 2),
      at(5, 2),
      at(6, 2),
      at(4, 3),
      at(4, 4),
      at(5, 4),
      at(6, 4),
    ].map((where) => ({ seat: 0, role: "FIGHTER" as const, at: where }));
    let state = held(ring, 4);
    const undead = unitAtV7(state, at(5, 3)).ownerId;
    // The Knight's tile (6, 3) is the only free one; fill it too.
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      units: [
        ...state.units,
        {
          ...unitAtV7(state, at(4, 2)),
          id: state.nextEntityId as never,
          at: at(6, 3),
        },
      ].sort((left, right) => left.id - right.id),
    });
    const turn = endTurnUntilV7(state, undead);
    const spat = turn.events.find(
      (event) => event.kind === "UNIT_REGURGITATED",
    );
    expect(spat).toMatchObject({ zombieUnitId: null, at: null });
  });

  it("releases the victim where its holder dies, and the killer stays", () => {
    // The Human seat's turn: a Knight kills the 2-HP Abomination.
    const holding = patchUnitV7(
      held([{ seat: 1, role: "KNIGHT", at: at(5, 4) }]),
      at(5, 3),
      { hp: 2 },
    );
    const victim = holding.giants.swallowed[0]?.unit as UnitStateV7;
    const human = seatIdV7(holding, 1);
    const turn = endTurnUntilV7(holding, human);
    // The digest ran at the Undead Start Turn before; the Knight attacks.
    const state = turn.state;
    const run = attackV7(state, at(5, 4), at(5, 3));
    expect(run.combat.defenderDies).toBe(true);
    expect(run.combat.advances).toBe(false);
    const kinds = kindsV7(run.events);
    const died = run.events.findIndex(
      (event) =>
        event.kind === "UNIT_DIED" &&
        event.unitId === unitAtV7(state, at(5, 3)).id,
    );
    expect(run.events[died + 1]).toMatchObject({
      kind: "SWALLOWED_UNIT_RELEASED",
      unitId: victim.id,
      at: at(5, 3),
    });
    expect(kinds).toContain("SWALLOWED_UNIT_RELEASED");
    const released = unitById(run.state, victim.id);
    expect(released).toMatchObject({
      at: at(5, 3),
      ownerId: human,
      form: "LAND",
      captureEligible: false,
    });
    expect(released?.activation.handled).toBe(true);
    expect(run.attacker?.at).toEqual(at(5, 4));
    expect(run.state.giants.swallowed).toEqual([]);
  });

  it("releases the victim when its holder's owner is eliminated", () => {
    // The Human seat 1 takes the Undead seat 0's only city.
    let state = held([
      {
        seat: 1,
        role: "FIGHTER",
        at: at(8, 8),
        captureEligible: true,
      },
    ]);
    const victim = state.giants.swallowed[0]?.unit as UnitStateV7;
    state = endTurnUntilV7(state, seatIdV7(state, 1)).state;
    state = patchUnitV7(state, at(8, 8), { captureEligible: true });
    const run = apply(state, { kind: "CAPTURE", unitId: idAt(state, 8, 8) });
    expect(kindsV7(run.events)).toContain("PLAYER_ELIMINATED");
    expect(unitById(run.state, victim.id)).toMatchObject({ at: at(5, 3) });
    expect(kindsV7(run.events)).toContain("SWALLOWED_UNIT_RELEASED");
  });

  it("removes the victim with its owner when its owner is eliminated", () => {
    // The Undead seat takes the Human seat's only city.
    const state = held([
      {
        seat: 0,
        role: "FIGHTER",
        at: at(2, 8),
        captureEligible: true,
      },
    ]);
    const victim = state.giants.swallowed[0]?.unit as UnitStateV7;
    const run = apply(state, { kind: "CAPTURE", unitId: idAt(state, 2, 8) });
    expect(run.state.giants.swallowed).toEqual([]);
    const death = run.events.findIndex(
      (event) => event.kind === "UNIT_DIED" && event.unitId === victim.id,
    );
    expect(run.events[death]).toMatchObject({ cause: "ELIMINATION" });
    expect(death).toBeLessThan(
      kindsV7(run.events).indexOf("PLAYER_ELIMINATED"),
    );
  });

  it("releases a swallowed Brain's controlled unit", () => {
    const base = field(
      ["UNDEAD", "MARTIAN"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "CAPTAIN", at: at(6, 3) },
        { seat: 1, role: "FIGHTER", at: at(7, 3) },
      ],
    );
    // The Martian Brain controls an Undead Skeleton (a body of seat 0).
    const brain = unitAtV7(base, at(6, 3));
    const skeleton = unitAtV7(base, at(7, 3));
    const undead = seatIdV7(base, 0);
    const controlled = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.id === skeleton.id
          ? {
              ...unit,
              role: "FIGHTER" as const,
              hp: 5,
              maxHp: effectiveRoleRuleV7("FIGHTER", "UNDEAD").maxHp,
              homeCityId: null,
            }
          : unit,
      ),
      mindControlled: [
        {
          unitId: skeleton.id,
          brainUnitId: brain.id,
          originalOwnerId: undead,
        },
      ],
    });
    const run = apply(controlled, {
      kind: "SWALLOW",
      unitId: idAt(controlled, 5, 3),
      targetUnitId: brain.id,
    });
    expect(
      run.events.find((event) => event.kind === "UNIT_RELEASED"),
    ).toMatchObject({ unitId: skeleton.id, toPlayerId: undead });
    expect(unitById(run.state, skeleton.id)?.ownerId).toBe(undead);
  });

  it("digests the victim at once when its holder embarks", () => {
    // Embarking needs a Port; the prune and the fold are checked directly
    // on a holder that a Move left afloat on (5, 4).
    const base = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "KNIGHT", at: at(6, 3), hp: 9 },
      ],
      { factions: ["UNDEAD", "ORIGINAL"], water: [at(5, 4)] },
    );
    const holding = apply(base, swallow(base, at(6, 3))).state;
    const victim = holding.giants.swallowed[0]?.unit as UnitStateV7;
    const holder = unitAtV7(holding, at(5, 3));
    const afloat: GameStateV7 = {
      ...holding,
      units: holding.units.map((unit) =>
        unit.id === holder.id
          ? { ...unit, at: at(5, 4), form: "EMBARKED" as const }
          : unit,
      ),
    };
    const pruned = prunedGiantsV7(afloat);
    expect(pruned.giants.swallowed).toEqual([]);
    expect(unitById(pruned, victim.id)).toBeUndefined();
    expect(swallowedOutcomeEventsV7(holding, pruned, []).events).toEqual([
      { kind: "UNIT_DIED", unitId: victim.id, cause: "DIGESTED" },
    ]);
    // A holder still on land keeps it, on its own tile.
    const walked: GameStateV7 = {
      ...holding,
      units: holding.units.map((unit) =>
        unit.id === holder.id ? { ...unit, at: at(4, 3) } : unit,
      ),
    };
    expect(prunedGiantsV7(walked).giants.swallowed[0]?.unit.at).toEqual(
      at(4, 3),
    );
  });

  it("parses held victims and rejects broken entries", () => {
    const state = held();
    const entry = state.giants.swallowed[0];
    if (entry === undefined) throw new Error("nothing held");
    const parse = (patch: Partial<GameStateV7>): GameStateV7 | null =>
      parseGameStateV7(JSON.parse(JSON.stringify({ ...state, ...patch })));
    expect(parse({})).toEqual(state);
    // The holder is not on the board.
    expect(
      parse({
        giants: { swallowed: [{ ...entry, holderUnitId: 999 as never }] },
      }),
    ).toBeNull();
    // Two entries for one holder.
    expect(
      parse({
        giants: {
          swallowed: [
            entry,
            { ...entry, unit: { ...entry.unit, id: 998 as never } },
          ],
        },
      }),
    ).toBeNull();
    // The victim is also on the board.
    expect(
      parse({ units: [...state.units, { ...entry.unit, at: at(9, 1) }] }),
    ).toBeNull();
    // At 0 HP, above its maximum, a giant, or off its holder's tile.
    expect(
      parse({
        giants: { swallowed: [{ ...entry, unit: { ...entry.unit, hp: 0 } }] },
      }),
    ).toBeNull();
    expect(
      parse({
        giants: {
          swallowed: [
            { ...entry, unit: { ...entry.unit, hp: entry.unit.maxHp + 1 } },
          ],
        },
      }),
    ).toBeNull();
    expect(
      parse({
        giants: {
          swallowed: [
            {
              ...entry,
              unit: {
                ...entry.unit,
                role: "JUGGERNAUT",
                maxHp: 40,
                hp: 5,
              },
            },
          ],
        },
      }),
    ).toBeNull();
    expect(
      parse({
        giants: {
          swallowed: [{ ...entry, unit: { ...entry.unit, at: at(0, 0) } }],
        },
      }),
    ).toBeNull();
    // A match without an Undead seat holds nothing.
    const human = field(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ],
    );
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...human,
            units: human.units.filter((unit) => unit.role === "JUGGERNAUT"),
            giants: {
              swallowed: [
                {
                  holderUnitId: idAt(human, 5, 3),
                  unit: {
                    ...unitAtV7(human, at(6, 3)),
                    at: at(5, 3),
                    activation: entry.unit.activation,
                  },
                },
              ],
            },
          }),
        ),
      ),
    ).toBeNull();
  });
});

describe("Goblin Toss (section 6.3)", () => {
  /** The Goblin seat 0's Troll at (5, 3) and its Goblin at (4, 3). */
  const troll = (
    pieces: readonly GoblinPieceV7[] = [],
    opponent: FactionIdV7 = "ORIGINAL",
    goblin: Partial<GoblinPieceV7> = {},
  ): GameStateV7 =>
    field(
      ["GOBLIN", opponent],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 3), ...goblin },
        ...pieces,
      ],
    );
  const toss = (
    state: GameStateV7,
    to: { x: number; y: number },
    passenger = at(4, 3),
  ): CommandV7 => ({
    kind: "TOSS",
    unitId: idAt(state, 5, 3),
    passengerUnitId: idAt(state, passenger.x, passenger.y),
    at: to,
  });

  it("throws the Goblin over units, and it may Kaboom where it lands", () => {
    // A hostile Guard and Fighter stand between the Troll and the landing
    // tile, a Fighter beside it; nothing between the tiles matters.
    const state = troll([
      { seat: 1, role: "GUARD", at: at(6, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 2) },
      { seat: 1, role: "FIGHTER", at: at(8, 3) },
    ]);
    const goblin = unitAtV7(state, at(4, 3));
    const view = viewForV7(state, activeIdV7(state));
    const preview = previewTossV7(view, idAt(state, 5, 3), goblin.id, at(7, 3));
    expect(preview).toEqual({
      unitId: idAt(state, 5, 3),
      passengerUnitId: goblin.id,
      from: at(4, 3),
      to: at(7, 3),
      fieldDefenseDestroyed: false,
      passengerMayAct: true,
    });
    // Distance 1 and distance 4 are never offered; 2 and 3 are.
    const offered = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "TOSS",
    );
    expect(offered.length).toBeGreaterThan(0);
    for (const command of offered)
      if (command.kind === "TOSS") {
        const distance = Math.max(
          Math.abs(command.at.x - 5),
          Math.abs(command.at.y - 3),
        );
        expect(distance).toBeGreaterThanOrEqual(2);
        expect(distance).toBeLessThanOrEqual(TOSS_RANGE_V7);
      }
    const run = apply(state, toss(state, at(7, 3)));
    expect(run.events[0]).toEqual({
      kind: "GOBLIN_TOSSED",
      playerId: activeIdV7(state),
      unitId: idAt(state, 5, 3),
      passengerUnitId: goblin.id,
      from: at(4, 3),
      to: at(7, 3),
    });
    const landed = unitById(run.state, goblin.id);
    expect(landed).toMatchObject({ at: at(7, 3), captureEligible: false });
    expect(landed?.activation).toEqual({ ...goblin.activation, moved: true });
    expect(
      unitById(run.state, idAt(state, 5, 3))?.activation.specialActed,
    ).toBe(true);
    // The Goblin blows itself up next to the hostile Fighter.
    const fighter = unitAtV7(state, at(8, 3));
    const boom = apply(run.state, { kind: "KABOOM", unitId: goblin.id });
    expect(
      boom.events.some(
        (event) =>
          (event.kind === "UNIT_DIED" && event.unitId === fighter.id) ||
          JSON.stringify(event).includes(`"unitId":${fighter.id}`),
      ),
    ).toBe(true);
    // The Troll may do nothing more this turn.
    expect(
      queryPlayerCommandsV7(viewForV7(boom.state, activeIdV7(state))).some(
        (command) =>
          "unitId" in command &&
          command.unitId === idAt(state, 5, 3) &&
          command.kind !== "WAIT",
      ),
    ).toBe(false);
  });

  it("refuses every illegal Toss in the order of its table", () => {
    // Row 2: a Goblin cannot throw.
    const plain = troll([{ seat: 0, role: "FIGHTER", at: at(3, 3) }]);
    expect(
      reject(plain, {
        kind: "TOSS",
        unitId: idAt(plain, 4, 3),
        passengerUnitId: idAt(plain, 3, 3),
        at: at(1, 3),
      }),
    ).toMatchObject({ code: "UNIT_ROLE_INVALID" });
    // Row 4: after a primary action, and after a landing.
    const attacked = patchUnitV7(troll(), at(5, 3), {
      activation: {
        ...unitAtV7(troll(), at(5, 3)).activation,
        attacked: true,
        attacksUsed: 1,
      },
    });
    expect(reject(attacked, toss(attacked, at(7, 3)))).toMatchObject({
      code: "UNIT_ALREADY_ACTED",
    });
    // Row 5: a Rocket Cart, a hostile Goblin, a Goblin not adjacent, and a
    // Goblin that landed this turn.
    const cart = troll([], "ORIGINAL", { role: "CATAPULT" });
    expect(reject(cart, toss(cart, at(7, 3)))).toMatchObject({
      code: "TOSS_NOT_LEGAL",
      params: { reason: "PASSENGER" },
    });
    const hostile = field(
      ["GOBLIN", "GOBLIN"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
    );
    expect(reject(hostile, toss(hostile, at(7, 3)))).toMatchObject({
      params: { reason: "PASSENGER" },
    });
    const far = troll([], "ORIGINAL", { at: at(3, 3) });
    expect(reject(far, toss(far, at(7, 3), at(3, 3)))).toMatchObject({
      params: { reason: "PASSENGER" },
    });
    const landed = troll([], "ORIGINAL", {
      activation: {
        moved: true,
        movedPathLength: 0,
        attacked: true,
        attacksUsed: 1,
        recovered: true,
        captured: true,
        handled: true,
        specialActed: true,
      },
    });
    expect(reject(landed, toss(landed, at(7, 3)))).toMatchObject({
      params: { reason: "PASSENGER" },
    });
    // Row 6: too near, too far, occupied, a chest, water, a settlement
    // site, and an unexplored tile.
    const base = troll([{ seat: 1, role: "FIGHTER", at: at(7, 4) }]);
    for (const to of [at(6, 3), at(9, 3), at(7, 4), at(5, 5)])
      expect(reject(base, toss(base, to)), JSON.stringify(to)).toMatchObject({
        code: "TOSS_NOT_LEGAL",
        params: { reason: "DESTINATION" },
      });
    const chest = checkedV7({ ...base, treasureChests: [at(7, 3)] });
    expect(reject(chest, toss(chest, at(7, 3)))).toMatchObject({
      params: { reason: "DESTINATION" },
    });
    const lake = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
      ],
      { factions: ["GOBLIN", "ORIGINAL"], water: [at(7, 3)] },
    );
    expect(reject(lake, toss(lake, at(7, 3)))).toMatchObject({
      params: { reason: "DESTINATION" },
    });
    const fog = unexploreV7(base, 0, [at(7, 2)]);
    expect(reject(fog, toss(fog, at(7, 2)))).toMatchObject({
      params: { reason: "DESTINATION" },
    });
  });

  it("lets a Goblin that acted be thrown; a Frozen one is not thrown", () => {
    // A Goblin that attacked is thrown, to block; it cannot act after.
    const acted = troll([], "ORIGINAL", {
      activation: { attacked: true, attacksUsed: 1 },
    });
    const goblin = unitAtV7(acted, at(4, 3));
    expect(
      previewTossV7(
        viewForV7(acted, activeIdV7(acted)),
        idAt(acted, 5, 3),
        goblin.id,
        at(7, 3),
      )?.passengerMayAct,
    ).toBe(false);
    const thrown = apply(acted, toss(acted, at(7, 3))).state;
    expect(
      queryPlayerCommandsV7(viewForV7(thrown, activeIdV7(thrown))).some(
        (command) => command.kind === "KABOOM" && command.unitId === goblin.id,
      ),
    ).toBe(false);
    // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen Goblin is not thrown,
    // and a Frozen Troll does not throw (`UNIT_FROZEN`, never offered).
    const base = troll([], "ICE_FOLK");
    const cold = checkedV7({
      ...base,
      frozen: [{ unitId: idAt(base, 4, 3), turnsLeft: 1 }],
    });
    expect(
      queryPlayerCommandsV7(viewForV7(cold, activeIdV7(cold))).some(
        (command) => command.kind === "TOSS",
      ),
    ).toBe(false);
    expect(reject(cold, toss(cold, at(7, 3)))).toMatchObject({
      code: "UNIT_FROZEN",
      params: { unitId: idAt(cold, 4, 3) },
    });
    const slowTroll = checkedV7({
      ...base,
      frozen: [{ unitId: idAt(base, 5, 3), turnsLeft: 1 }],
    });
    expect(reject(slowTroll, toss(slowTroll, at(7, 3)))).toMatchObject({
      code: "UNIT_FROZEN",
      params: { unitId: idAt(slowTroll, 5, 3) },
    });
  });

  it("smashes a hostile Field Defense where it lands and eats no Crumbs", () => {
    // The Troll at (5, 8) is next to the Human territory (x 1-3).
    const base = field(
      ["GOBLIN", "CANDY"],
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
    );
    const moved = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.role === "JUGGERNAUT"
          ? { ...unit, at: at(5, 7) }
          : unit.role === "FIGHTER" && unit.ownerId === seatIdV7(base, 0)
            ? { ...unit, at: at(4, 6) }
            : unit,
      ),
    });
    const defended = fieldDefenseV7(moved, at(3, 7));
    const command: CommandV7 = {
      kind: "TOSS",
      unitId: idAt(defended, 5, 7),
      passengerUnitId: idAt(defended, 4, 6),
      at: at(3, 7),
    };
    expect(
      previewTossV7(
        viewForV7(defended, activeIdV7(defended)),
        command.unitId,
        idAt(defended, 4, 6),
        at(3, 7),
      )?.fieldDefenseDestroyed,
    ).toBe(true);
    const run = apply(defended, command);
    expect(run.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(3, 7),
      reason: "OCCUPATION",
    });
    expect(tileV7(run.state, at(3, 7)).fieldDefense).toBe(false);
    // Candy Crumbs on the landing tile stay; the Goblin takes no bite.
    const crumbs = checkedV7({
      ...moved,
      crumbs: [
        {
          at: at(3, 6),
          role: "FIGHTER",
          ownerId: seatIdV7(moved, 1),
          turnsLeft: 2,
        },
      ],
    });
    const goblin = unitAtV7(crumbs, at(4, 6));
    const landed = apply(crumbs, {
      kind: "TOSS",
      unitId: idAt(crumbs, 5, 7),
      passengerUnitId: goblin.id,
      at: at(3, 6),
    });
    expect(landed.state.crumbs).toEqual(crumbs.crumbs);
    expect(unitById(landed.state, goblin.id)?.hp).toBe(goblin.hp);
  });
});

describe("Thunder Stomp (section 6.4)", () => {
  /** The Dinosaur seat 0's Brontosaurus at (5, 3). */
  const bronto = (
    pieces: readonly GoblinPieceV7[],
    opponent: FactionIdV7 = "ORIGINAL",
    options: Parameters<typeof fieldV7>[1] = {},
  ): GameStateV7 =>
    fieldV7([{ seat: 0, role: "JUGGERNAUT", at: at(5, 3) }, ...pieces], {
      factions: ["DINOSAUR", opponent],
      ...options,
    });
  const stomp = (state: GameStateV7): CommandV7 => ({
    kind: "STOMP",
    unitId: idAt(state, 5, 3),
  });

  it("hits every hostile ground unit around it, and never a flyer or an own unit", () => {
    const state = bronto(
      [
        { seat: 1, role: "FIGHTER", at: at(6, 4) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "RAIDER", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(7, 3) },
      ],
      "DWARF",
    );
    const actor = activeIdV7(state);
    const left = unitAtV7(state, at(4, 3));
    const right = unitAtV7(state, at(6, 4));
    const preview = previewStompV7(viewForV7(state, actor), idAt(state, 5, 3));
    expect(preview).toEqual({
      unitId: idAt(state, 5, 3),
      results: [
        {
          unitId: left.id,
          at: at(4, 3),
          damage: 4,
          dies: false,
          shieldDamage: 0,
        },
        {
          unitId: right.id,
          at: at(6, 4),
          damage: 4,
          dies: false,
          shieldDamage: 0,
        },
      ],
      fieldDefenses: [],
    });
    const run = apply(state, stomp(state));
    expect(run.events[0]).toEqual({
      kind: "THUNDER_STOMP",
      playerId: actor,
      unitId: idAt(state, 5, 3),
      results: preview?.results,
      fieldDefenses: [],
    });
    expect(unitById(run.state, left.id)?.hp).toBe(left.hp - STOMP_DAMAGE_V7);
    // No retaliation; the Brontosaurus used its primary action.
    expect(unitAtV7(run.state, at(5, 3)).hp).toBe(unitAtV7(state, at(5, 3)).hp);
    expect(unitAtV7(run.state, at(5, 3)).activation.specialActed).toBe(true);
    // A Stomp that hits nobody is legal.
    const alone = bronto([{ seat: 1, role: "FIGHTER", at: at(8, 3) }]);
    expect(apply(alone, stomp(alone)).events[0]).toMatchObject({
      kind: "THUNDER_STOMP",
      results: [],
    });
  });

  it("is refused after a Move, a primary action, or for another role", () => {
    const moved = bronto([], "ORIGINAL", {});
    const afterMove = patchUnitV7(moved, at(5, 3), {
      activation: {
        ...unitAtV7(moved, at(5, 3)).activation,
        moved: true,
        movedPathLength: 1,
      },
    });
    expect(reject(afterMove, stomp(afterMove))).toMatchObject({
      code: "STOMP_NOT_LEGAL",
      params: { reason: "MOVED" },
    });
    const attacked = patchUnitV7(moved, at(5, 3), {
      activation: {
        ...unitAtV7(moved, at(5, 3)).activation,
        attacked: true,
        attacksUsed: 1,
      },
    });
    expect(reject(attacked, stomp(attacked))).toMatchObject({
      code: "UNIT_ALREADY_ACTED",
    });
    const other = bronto([{ seat: 0, role: "KNIGHT", at: at(5, 2) }]);
    expect(
      reject(other, { kind: "STOMP", unitId: idAt(other, 5, 2) }),
    ).toMatchObject({ code: "UNIT_ROLE_INVALID" });
  });

  it("hits an Egg and an Armoured unit, and never an embarked unit", () => {
    // The Brontosaurus at (4, 7), next to the Dinosaur seat 1's nest.
    const state = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(4, 7) },
        { seat: 1, role: "GUARD", at: at(5, 7) },
        { seat: 1, role: "FIGHTER", at: at(4, 6), form: "EMBARKED" },
      ],
      {
        factions: ["DINOSAUR", "DINOSAUR"],
        water: [at(4, 6)],
        eggs: [{ seat: 1, role: "RAIDER", at: at(3, 7) }],
      },
    );
    const egg = unitAtV7(state, at(3, 7));
    const ankylosaurus = unitAtV7(state, at(5, 7));
    const run = apply(state, { kind: "STOMP", unitId: idAt(state, 4, 7) });
    const stomped = run.events[0];
    if (stomped?.kind !== "THUNDER_STOMP") throw new Error("no Stomp");
    expect(stomped.results.map((entry) => entry.unitId)).toEqual([
      egg.id,
      ankylosaurus.id,
    ]);
    expect(stomped.results[0]).toMatchObject({ damage: 4 });
    // Armoured takes 1 off.
    expect(stomped.results[1]).toMatchObject({ damage: 3 });
  });

  it("smashes every Field Defense around it", () => {
    const state = fieldDefenseV7(
      fieldDefenseV7(
        checkedV7({
          ...bronto([{ seat: 1, role: "FIGHTER", at: at(3, 7) }]),
          units: bronto([{ seat: 1, role: "FIGHTER", at: at(3, 7) }]).units.map(
            (unit) =>
              unit.role === "JUGGERNAUT" ? { ...unit, at: at(4, 8) } : unit,
          ),
        }),
        at(3, 7),
      ),
      at(3, 9),
    );
    const run = apply(state, { kind: "STOMP", unitId: idAt(state, 4, 8) });
    expect(run.events[0]).toMatchObject({
      kind: "THUNDER_STOMP",
      fieldDefenses: [at(3, 7), at(3, 9)],
    });
    expect(
      run.events.filter((event) => event.kind === "FIELD_DEFENSE_DESTROYED"),
    ).toEqual([
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 7), reason: "STOMP" },
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 9), reason: "STOMP" },
    ]);
    expect(tileV7(run.state, at(3, 9)).fieldDefense).toBe(false);
  });

  it("kills with credit and growth, and a death blast hits the Brontosaurus", () => {
    const state = patchUnitV7(
      bronto([{ seat: 1, role: "FIGHTER", at: at(4, 3), hp: 3 }]),
      at(5, 3),
      { hp: 10 },
    );
    const victim = unitAtV7(state, at(4, 3));
    const run = apply(state, stomp(state));
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: victim.id,
      cause: "STOMP",
    });
    const grew = run.events.find((event) => event.kind === "UNIT_GREW");
    expect(grew).toMatchObject({ unitId: idAt(state, 5, 3), stage: 1 });
    const after = unitAtV7(run.state, at(5, 3));
    expect(after.kills).toBe(1);
    expect(after.hp).toBe(after.maxHp);
    // A Goblin Rocket Cart stomped to death explodes next to it.
    const cart = bronto(
      [{ seat: 1, role: "CATAPULT", at: at(4, 3), hp: 2 }],
      "GOBLIN",
    );
    const blast = apply(cart, stomp(cart));
    const kinds = kindsV7(blast.events);
    expect(kinds).toContain("EXPLOSION_RESOLVED");
    const explosion = blast.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    expect(JSON.stringify(explosion)).toContain(`"unitId":${idAt(cart, 5, 3)}`);
    // A Candy unit stomped to death leaves Crumbs (G5).
    const candy = bronto(
      [{ seat: 1, role: "FIGHTER", at: at(4, 3), hp: 2 }],
      "CANDY",
    );
    expect(apply(candy, stomp(candy)).state.crumbs).toEqual([
      expect.objectContaining({ at: at(4, 3), role: "FIGHTER" }),
    ]);
  });

  it("shows its hidden source only as damage to the observer's units", () => {
    const state = unexploreV7(
      bronto([{ seat: 1, role: "FIGHTER", at: at(4, 3) }]),
      1,
      [at(5, 3)],
    );
    const run = apply(state, stomp(state));
    const human = seatIdV7(state, 1);
    const projected = projectEventsV7(state, run.state, human, run.events);
    expect(kindsV7(projected.events as never)).not.toContain("THUNDER_STOMP");
    expect(projected.events).toContainEqual({
      kind: "COMBAT_SPLASH_DAMAGE",
      splash: [
        {
          unitId: idAt(state, 4, 3),
          at: at(4, 3),
          damage: 4,
          dies: false,
          shieldDamage: 0,
        },
      ],
    });
  });
});

describe("Overstride (section 6.5)", () => {
  /** The Martian seat 0's Colossus at (3, 3). */
  const colossus = (
    pieces: readonly GoblinPieceV7[],
    opponent: FactionIdV7 = "ORIGINAL",
  ): GameStateV7 =>
    martianFieldV7([{ seat: 0, role: "JUGGERNAUT", at: at(3, 3) }, ...pieces], {
      factions: ["MARTIAN", opponent],
    });
  const move = (
    state: GameStateV7,
    path: readonly { x: number; y: number }[],
  ): CommandV7 => ({
    kind: "MOVE",
    unitId: idAt(state, 3, 3),
    path: [...path],
  });

  it("strides over a hostile unit and tramples it once", () => {
    // The offered path to (5, 3) is the first one found: through (4, 2).
    const state = colossus([
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "GUARD", at: at(6, 4) },
    ]);
    const actor = activeIdV7(state);
    const victim = unitAtV7(state, at(4, 2));
    const path = [at(4, 2), at(5, 3)];
    const preview = previewTrampleV7(
      viewForV7(state, actor),
      idAt(state, 3, 3),
      path,
    );
    expect(preview).toEqual([
      {
        unitId: victim.id,
        at: at(4, 2),
        damage: TRAMPLE_DAMAGE_V7,
        dies: false,
        shieldDamage: 0,
      },
    ]);
    // It never ends on an occupied tile.
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).not.toContainEqual(
      move(state, [at(4, 2)]),
    );
    const run = apply(state, move(state, path));
    const kinds = kindsV7(run.events);
    expect(kinds.indexOf("UNIT_MOVED")).toBeLessThan(
      kinds.indexOf("UNITS_TRAMPLED"),
    );
    expect(run.events.find((event) => event.kind === "UNITS_TRAMPLED")).toEqual(
      {
        kind: "UNITS_TRAMPLED",
        playerId: actor,
        unitId: idAt(state, 3, 3),
        results: preview,
      },
    );
    expect(unitById(run.state, victim.id)?.hp).toBe(victim.hp - 3);
    // The hostile zone of control did not end the Move: it is on (5, 3).
    expect(unitAtV7(run.state, at(5, 3)).role).toBe("JUGGERNAUT");
    // The heat ray after it is at half power.
    const ray = queryCombatPreviewV7(
      viewForV7(run.state, actor),
      idAt(state, 3, 3),
      unitAtV7(run.state, at(6, 4)).id,
    );
    expect(ray?.rayPower).toBe("HALF");
  });

  it("passes own units without harm and kills with credit", () => {
    const state = colossus([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 2 },
    ]);
    const own = unitAtV7(state, at(4, 3));
    // (5, 4) is first reached through (4, 3).
    const passOwn = apply(state, move(state, [at(4, 3), at(5, 4)]));
    expect(kindsV7(passOwn.events)).not.toContain("UNITS_TRAMPLED");
    expect(unitById(passOwn.state, own.id)).toEqual(own);
    const kill = apply(state, move(state, [at(4, 2), at(5, 2)]));
    expect(kill.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: idAt(state, 4, 2),
      cause: "TRAMPLE",
    });
    expect(unitAtV7(kill.state, at(5, 2)).kills).toBe(1);
  });

  it("never passes an unexplored tile, and leaves a passed chest and Crumbs", () => {
    const fog = unexploreV7(colossus([]), 0, [at(4, 2), at(4, 3), at(4, 4)]);
    expect(
      queryPlayerCommandsV7(viewForV7(fog, activeIdV7(fog))).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === idAt(fog, 3, 3) &&
          command.path.some((step) => step.x === 5),
      ),
    ).toBe(false);
    const base = colossus(
      [{ seat: 1, role: "FIGHTER", at: at(9, 1) }],
      "CANDY",
    );
    const littered = checkedV7({
      ...base,
      treasureChests: [at(4, 2)],
      crumbs: [
        {
          at: at(4, 3),
          role: "FIGHTER",
          ownerId: seatIdV7(base, 1),
          turnsLeft: 2,
        },
      ],
    });
    const overChest = apply(littered, move(littered, [at(4, 2), at(5, 2)]));
    expect(overChest.state.treasureChests).toEqual([at(4, 2)]);
    const overCrumbs = apply(littered, move(littered, [at(4, 3), at(5, 4)]));
    expect(overCrumbs.state.crumbs).toEqual(littered.crumbs);
    expect(unitAtV7(overCrumbs.state, at(5, 4)).hp).toBe(
      unitAtV7(littered, at(3, 3)).hp,
    );
  });
});

describe("Glacial Smash (section 6.6)", () => {
  /** The Ice Folk seat 0's Frost Giant at (4, 3), a Frozen target at (5, 3). */
  const frost = (
    hp: number,
    role: UnitStateV7["role"] = "GUARD",
    pieces: Parameters<typeof iceFieldV7>[0] = [],
    attacker: UnitStateV7["role"] = "JUGGERNAUT",
    opponent: FactionIdV7 = "ORIGINAL",
  ): GameStateV7 =>
    iceFieldV7(
      [
        { seat: 0, role: attacker, at: at(4, 3) },
        {
          seat: 1,
          role,
          at: at(5, 3),
          hp,
          frozen: { turnsLeft: 1 },
        },
        ...pieces,
      ],
      { factions: ["ICE_FOLK", opponent] },
    );
  /** The highest target HP the Frost Giant's hit smashes. */
  const smashHp = (
    role: UnitStateV7["role"] = "GUARD",
    pieces: Parameters<typeof iceFieldV7>[0] = [],
    opponent: FactionIdV7 = "ORIGINAL",
  ): number => {
    for (let hp = 30; hp >= 6; hp -= 1) {
      let state: GameStateV7;
      try {
        state = frost(hp, role, pieces, "JUGGERNAUT", opponent);
      } catch {
        continue;
      }
      const preview = queryCombatPreviewV7(
        viewForV7(state, activeIdV7(state)),
        idAt(state, 4, 3),
        idAt(state, 5, 3),
      );
      if (preview?.glacialSmash === true) return hp;
    }
    throw new Error("no smash HP");
  };

  it("shatters at up to 8 HP where an ordinary hit needs 3 or 4", () => {
    // An Ankylosaurus (20 HP, Armoured) on open Grass.
    const anky = (hp: number, attacker: UnitStateV7["role"] = "JUGGERNAUT") =>
      frost(hp, "GUARD", [], attacker, "DINOSAUR");
    const hp = smashHp("GUARD", [], "DINOSAUR");
    const run = attackV7(anky(hp), at(4, 3), at(5, 3));
    expect(run.combat).toMatchObject({
      shatters: true,
      glacialSmash: true,
      defenderDies: true,
      damageToDefender: hp,
    });
    expect(run.target).toBeUndefined();
    // It never advances.
    expect(run.attacker?.at).toEqual(at(4, 3));
    expect(run.combat.advances).toBe(false);
    // One HP more leaves 9: no shatter.
    const nine = attackV7(anky(hp + 1), at(4, 3), at(5, 3));
    expect(nine.combat).toMatchObject({ shatters: false, glacialSmash: false });
    expect(nine.target?.hp).toBe(GLACIAL_SMASH_HP_V7 + 1);
    // An Ice Folk Fighter's hit leaving 5 to 8 does not shatter.
    for (let target = 20; target >= 6; target -= 1) {
      const fighter = anky(target, "FIGHTER");
      const ordinary = queryCombatPreviewV7(
        viewForV7(fighter, activeIdV7(fighter)),
        idAt(fighter, 4, 3),
        idAt(fighter, 5, 3),
      );
      if (ordinary === null || ordinary.defenderDies) continue;
      const left = target - ordinary.damageToDefender;
      if (left >= 5 && left <= GLACIAL_SMASH_HP_V7)
        expect(ordinary).toMatchObject({
          shatters: false,
          glacialSmash: false,
        });
    }
  });

  it("never smashes a giant", () => {
    const state = frost(10, "JUGGERNAUT");
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat).toMatchObject({ shatters: false, glacialSmash: false });
  });

  it("freezes the units around a shattered unit with its shards", () => {
    const pieces: Parameters<typeof iceFieldV7>[0] = [
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      {
        seat: 1,
        role: "KNIGHT",
        at: at(6, 4),
        frozen: { turnsLeft: 1 },
      },
      { seat: 1, role: "JUGGERNAUT", at: at(6, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 4) },
    ];
    const hp = smashHp("GUARD", pieces);
    const state = frost(hp, "GUARD", pieces);
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat.shatters).toBe(true);
    const shards = run.events.find(
      (event) => event.kind === "UNITS_FROZEN" && event.source === "SHARDS",
    );
    if (shards?.kind !== "UNITS_FROZEN") throw new Error("no shards");
    expect(shards.sourceUnitId).toBe(idAt(state, 4, 3));
    const byId = new Map(shards.results.map((entry) => [entry.unitId, entry]));
    // Ice Folk Freeze (`pulp_wars-w49.37`): the Fighter and the giant are
    // Frozen; the Knight was Frozen already and is renewed.
    expect(byId.get(idAt(state, 6, 3))).toEqual({
      unitId: idAt(state, 6, 3),
      turnsLeft: 1,
    });
    expect(byId.get(idAt(state, 6, 2))).toMatchObject({ turnsLeft: 1 });
    expect(byId.get(idAt(state, 6, 4))).toMatchObject({ turnsLeft: 1 });
    expect(byId.has(idAt(state, 5, 4))).toBe(false);
    const kinds = kindsV7(run.events);
    expect(kinds.lastIndexOf("UNIT_DIED")).toBeLessThan(
      run.events.indexOf(shards),
    );
  });
});

describe("Siege Hammer (section 6.7)", () => {
  /** The Dwarf seat 1's Titan at (7, 8) next to a walled Human capital. */
  const titan = (
    options: Partial<Parameters<typeof walledV7>[0]> = {},
  ): GameStateV7 =>
    walledV7({
      attackerFaction: "DWARF",
      // The Archer at (8, 10) is outside the capital's territory.
      attackers: [
        { role: "JUGGERNAUT", at: at(7, 8) },
        { role: "MARKSMAN", at: at(8, 10) },
      ],
      fieldDefense: true,
      ...options,
    });

  it("ignores fortification, smashes the Field Defense, and razes the Walls", () => {
    const state = titan();
    const capital = state.cities.find(
      (city) => city.at.x === 8 && city.at.y === 8,
    );
    if (capital === undefined) throw new Error("no capital");
    expect(cityHasWallsV7(capital)).toBe(true);
    expect(
      JSON.stringify(queryUnitStatsV7(state, idAt(state, 8, 8))),
    ).toContain("CITY_WALLS");
    const run = attackV7(state, at(7, 8), at(8, 8));
    expect(run.combat).toMatchObject({
      siegeHammer: true,
      wallsDestroyed: true,
      fortificationLevel: 0,
    });
    expect(run.combat.fortificationIgnored).toBeGreaterThan(0);
    expect(run.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(8, 8),
      reason: "SIEGE_HAMMER",
    });
    expect(run.events).toContainEqual({
      kind: "WALLS_DESTROYED",
      cityId: capital.id,
      byUnitId: idAt(state, 7, 8),
    });
    const razed = run.state.cities.find((city) => city.id === capital.id);
    expect(razed?.wallsRazed).toBe(true);
    expect(razed?.rewards).toEqual(capital.rewards);
    if (razed === undefined) throw new Error("city lost");
    expect(cityHasWallsV7(razed)).toBe(false);
    // Public to both players.
    for (const player of run.state.players)
      expect(
        viewForV7(run.state, player.id).cities.find(
          (city) => city.id === capital.id,
        )?.wallsRazed,
      ).toBe(true);
    // The next attack finds no fortification to ignore.
    if (run.target === undefined) throw new Error("the Guard died");
    {
      const next = attackV7(run.state, at(8, 10), at(8, 8));
      expect(next.combat).toMatchObject({
        fortificationLevel: 0,
        fortificationIgnored: 0,
        siegeHammer: false,
      });
    }
    // The defender's stats lose the City Walls line.
    expect(
      JSON.stringify(queryUnitStatsV7(run.state, run.target.id)),
    ).not.toContain("CITY_WALLS");
  });

  it("smashes the Field Defense and the Walls even when the Titan dies", () => {
    const state = patchUnitV7(titan(), at(7, 8), { hp: 1 });
    const run = attackV7(state, at(7, 8), at(8, 8));
    expect(run.combat.attackerDies).toBe(true);
    expect(kindsV7(run.events)).toEqual(
      expect.arrayContaining(["FIELD_DEFENSE_DESTROYED", "WALLS_DESTROYED"]),
    );
  });

  it("razes nothing off a center, and a Knight hits the Walls as before", () => {
    const state = titan({
      defenders: [{ role: "FIGHTER", at: at(6, 8) }],
      attackers: [
        { role: "JUGGERNAUT", at: at(6, 9) },
        { role: "KNIGHT", at: at(7, 8) },
      ],
    });
    const off = attackV7(state, at(6, 9), at(6, 8));
    expect(off.combat).toMatchObject({
      siegeHammer: true,
      wallsDestroyed: false,
    });
    expect(kindsV7(off.events)).not.toContain("WALLS_DESTROYED");
    const knight = attackV7(state, at(7, 8), at(8, 8));
    expect(knight.combat).toMatchObject({
      siegeHammer: false,
      wallsDestroyed: false,
    });
    expect(
      knight.combat.fortificationLevel + knight.combat.fortificationIgnored,
    ).toBeGreaterThan(0);
  });

  it("keeps razed Walls through a capture", () => {
    const state = titan();
    const razed = attackV7(state, at(7, 8), at(8, 8)).state;
    const capital = razed.cities.find(
      (city) => city.at.x === 8 && city.at.y === 8,
    );
    // The capital empties and the Knight walks in.
    const emptied = checkedV7({
      ...razed,
      units: razed.units
        .filter((unit) => !(unit.at.x === 8 && unit.at.y === 8))
        .map((unit) =>
          unit.role === "MARKSMAN"
            ? { ...unit, at: at(8, 8), captureEligible: true }
            : unit,
        ),
    });
    const captured = apply(emptied, {
      kind: "CAPTURE",
      unitId: idAt(emptied, 8, 8),
    }).state;
    const after = captured.cities.find((city) => city.id === capital?.id);
    expect(after?.ownerId).toBe(seatIdV7(state, 1));
    expect(after?.wallsRazed).toBe(true);
  });

  it("gives an Ice Folk defender its Snow cover back on a razed center", () => {
    const state = titan({ defenderFaction: "ICE_FOLK", fieldDefense: false });
    expect(viewSnowV7(state, at(8, 8))).toBe(true);
    const before = queryCombatPreviewV7(
      viewForV7(state, activeIdV7(state)),
      idAt(state, 8, 10),
      idAt(state, 8, 8),
    );
    expect(before?.snowCover).toBe(false);
    const run = attackV7(state, at(7, 8), at(8, 8));
    if (run.target === undefined) throw new Error("the Yeti died");
    const after = queryCombatPreviewV7(
      viewForV7(run.state, activeIdV7(run.state)),
      idAt(run.state, 8, 10),
      run.target.id,
    );
    expect(after?.snowCover).toBe(true);
  });

  it("parses wallsRazed only on a city with the Walls record", () => {
    const state = titan();
    const razed = attackV7(state, at(7, 8), at(8, 8)).state;
    const loaded = parseGameStateV7(JSON.parse(JSON.stringify(razed)));
    expect(loaded).toEqual(razed);
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...razed,
            cities: razed.cities.map((city) =>
              city.at.x === 2 && city.at.y === 8
                ? { ...city, wallsRazed: true }
                : city,
            ),
          }),
        ),
      ),
    ).toBeNull();
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...razed,
            cities: razed.cities.map((city) =>
              city.at.x === 8 && city.at.y === 8
                ? { ...city, wallsRazed: false }
                : city,
            ),
          }),
        ),
      ),
    ).toBeNull();
  });
});

describe("Break Off (section 6.8, as the user changed it on 2026-10-09)", () => {
  /** The Candy seat 0's Gingerbread Giant at (5, 3), homed to (8, 8). */
  const giant = (
    pieces: readonly GoblinPieceV7[] = [],
    opponent: FactionIdV7 = "ORIGINAL",
  ): GameStateV7 =>
    field(
      ["CANDY", opponent],
      [{ seat: 0, role: "JUGGERNAUT", at: at(5, 3) }, ...pieces],
    );
  const breakOff = (
    state: GameStateV7,
    first: { x: number; y: number },
    second: { x: number; y: number },
  ): CommandV7 => ({
    kind: "BREAK_OFF",
    unitId: idAt(state, 5, 3),
    tiles: [first, second],
  });

  it("spends 10 HP on two Gingerbread Men homed to the Giant's city", () => {
    const state = giant([{ seat: 1, role: "FIGHTER", at: at(6, 3) }]);
    const actor = activeIdV7(state);
    const before = unitAtV7(state, at(5, 3));
    const trooperMax = effectiveRoleRuleV7("FIGHTER", "CANDY").maxHp;
    const preview = previewBreakOffV7(viewForV7(state, actor), before.id);
    expect(preview).toEqual({
      unitId: before.id,
      cityId: before.homeCityId,
      hpAfter: before.hp - BREAK_OFF_HP_V7,
      trooperHp: trooperMax,
      count: 2,
      // The eight tiles but the occupied one, in (y, x) order.
      tiles: [
        at(4, 2),
        at(5, 2),
        at(6, 2),
        at(4, 3),
        at(4, 4),
        at(5, 4),
        at(6, 4),
      ],
    });
    expect(BREAK_OFF_HP_V7).toBe(10);
    // Every pair of the seven tiles is offered, once, in (y, x) order.
    const offered = queryPlayerCommandsV7(viewForV7(state, actor)).filter(
      (command) => command.kind === "BREAK_OFF",
    );
    expect(offered).toHaveLength(21);
    expect(offered[0]).toEqual(breakOff(state, at(4, 2), at(5, 2)));
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).not.toContainEqual(
      breakOff(state, at(5, 2), at(4, 2)),
    );
    const run = apply(state, breakOff(state, at(4, 3), at(5, 4)));
    const event = run.events[0];
    if (event?.kind !== "GIANT_BROKE_OFF") throw new Error("no Break Off");
    expect(event).toEqual({
      kind: "GIANT_BROKE_OFF",
      playerId: actor,
      unitId: before.id,
      newUnitIds: [state.nextEntityId, state.nextEntityId + 1],
      tiles: [at(4, 3), at(5, 4)],
      cityId: before.homeCityId,
      hp: trooperMax,
    });
    for (const [index, id] of event.newUnitIds.entries()) {
      const man = unitById(run.state, id);
      expect(man).toMatchObject({
        ownerId: actor,
        homeCityId: before.homeCityId,
        role: "FIGHTER",
        form: "LAND",
        at: event.tiles[index],
        hp: trooperMax,
        maxHp: trooperMax,
        kills: 0,
        veteran: false,
        captureEligible: false,
        variant: "GINGERBREAD_MAN",
      });
      expect(man?.activation).toMatchObject({
        moved: true,
        attacked: true,
        specialActed: true,
        handled: true,
      });
      // Public: it looks like a Gingerbread Man to everyone who sees it.
      expect(
        viewForV7(run.state, seatIdV7(state, 1)).units.find(
          (unit) => unit.id === id,
        )?.variant,
      ).toBe("GINGERBREAD_MAN");
    }
    const after = unitById(run.state, before.id);
    expect(after?.hp).toBe(before.hp - 10);
    expect(after?.activation.specialActed).toBe(true);
    // Both take a slot of the home city.
    expect(assignedUnitCountV7(run.state, before.homeCityId as never)).toBe(
      assignedUnitCountV7(state, before.homeCityId as never) + 2,
    );
    // Only its owner hears of it.
    expect(
      projectEventsV7(
        state,
        run.state,
        seatIdV7(state, 1),
        run.events,
      ).events.some((projected) => projected.kind === "GIANT_BROKE_OFF"),
    ).toBe(false);
    // A Gingerbread Man is a Toffee Trooper in every rule: a Candy
    // FIGHTER with the Toffee Trooper's stats and commands next turn.
    const next = endTurnUntilV7(run.state, actor).state;
    const man = unitById(next, event.newUnitIds[0]);
    expect(man?.variant).toBe("GINGERBREAD_MAN");
    expect(
      queryPlayerCommandsV7(viewForV7(next, actor)).some(
        (command) =>
          command.kind === "SUGAR_RUSH" && command.unitId === man?.id,
      ),
    ).toBe(true);
  });

  it("refuses every illegal Break Off in the order of its table", () => {
    // Row 2: a Toffee Trooper cannot.
    const other = giant([{ seat: 0, role: "FIGHTER", at: at(5, 2) }]);
    expect(
      reject(other, {
        kind: "BREAK_OFF",
        unitId: idAt(other, 5, 2),
        tiles: [at(4, 1), at(5, 1)],
      }),
    ).toMatchObject({ code: "UNIT_ROLE_INVALID" });
    // Row 3: a Crashed Giant; a Rushed one may.
    const base = giant();
    const crashed = checkedV7({
      ...base,
      sugarRush: [{ unitId: idAt(base, 5, 3), phase: "CRASHED" }],
    });
    expect(
      reject(crashed, breakOff(crashed, at(4, 3), at(4, 4))),
    ).toMatchObject({ code: "UNIT_CRASHED" });
    const rushed = checkedV7({
      ...base,
      sugarRush: [{ unitId: idAt(base, 5, 3), phase: "RUSHED" }],
    });
    expect(
      queryPlayerCommandsV7(viewForV7(rushed, activeIdV7(rushed))),
    ).toContainEqual(breakOff(rushed, at(4, 3), at(4, 4)));
    // Row 4: after a primary action.
    const acted = patchUnitV7(base, at(5, 3), {
      activation: {
        ...unitAtV7(base, at(5, 3)).activation,
        attacked: true,
        attacksUsed: 1,
      },
    });
    expect(reject(acted, breakOff(acted, at(4, 3), at(4, 4)))).toMatchObject({
      code: "UNIT_ALREADY_ACTED",
    });
    // Row 6: 10 HP is too weak; 11 is enough.
    const weak = patchUnitV7(base, at(5, 3), { hp: 10 });
    expect(reject(weak, breakOff(weak, at(4, 3), at(4, 4)))).toMatchObject({
      code: "BREAK_OFF_NOT_LEGAL",
      params: { reason: "TOO_WEAK" },
    });
    const eleven = patchUnitV7(base, at(5, 3), { hp: 11 });
    expect(
      unitAtV7(
        apply(eleven, breakOff(eleven, at(4, 3), at(4, 4))).state,
        at(5, 3),
      ).hp,
    ).toBe(1);
    // Row 7: no home city.
    const homeless = patchUnitV7(base, at(5, 3), { homeCityId: null });
    expect(
      reject(homeless, breakOff(homeless, at(4, 3), at(4, 4))),
    ).toMatchObject({ params: { reason: "NO_HOME" } });
    // Row 8: an occupied tile, a tile too far, water, the same tile twice,
    // and the tiles out of (y, x) order.
    const crowded = giant([{ seat: 1, role: "FIGHTER", at: at(6, 3) }]);
    for (const [first, second] of [
      [at(4, 3), at(6, 3)],
      [at(4, 3), at(7, 3)],
    ] as const)
      expect(reject(crowded, breakOff(crowded, first, second))).toMatchObject({
        params: { reason: "TILE" },
      });
    expect(
      applyCommandV7(
        crowded,
        activeIdV7(crowded),
        breakOff(crowded, at(4, 4), at(4, 3)),
      ),
    ).toMatchObject({ accepted: false });
    expect(
      applyCommandV7(
        crowded,
        activeIdV7(crowded),
        breakOff(crowded, at(4, 3), at(4, 3)),
      ),
    ).toMatchObject({ accepted: false });
    const lake = fieldV7([{ seat: 0, role: "JUGGERNAUT", at: at(5, 3) }], {
      factions: ["CANDY", "ORIGINAL"],
      water: [at(4, 3)],
    });
    expect(reject(lake, breakOff(lake, at(4, 3), at(4, 4)))).toMatchObject({
      params: { reason: "TILE" },
    });
    // Only one free tile around it: no Break Off is offered.
    const ring = [
      at(4, 2),
      at(5, 2),
      at(6, 2),
      at(4, 3),
      at(6, 3),
      at(4, 4),
      at(5, 4),
    ].map((where) => ({ seat: 1, role: "FIGHTER" as const, at: where }));
    const boxed = giant(ring);
    expect(
      queryPlayerCommandsV7(viewForV7(boxed, activeIdV7(boxed))).some(
        (command) => command.kind === "BREAK_OFF",
      ),
    ).toBe(false);
  });

  it("places both even when the home city is full", () => {
    const base = giant();
    const city = base.cities.find(
      (candidate) => candidate.id === unitAtV7(base, at(5, 3)).homeCityId,
    );
    if (city === undefined) throw new Error("no home");
    const free =
      cityUnitCapacityV7(base, city) - assignedUnitCountV7(base, city.id);
    const fillers: GoblinPieceV7[] = [];
    for (let index = 0; index < free; index += 1)
      fillers.push({
        seat: 0,
        role: "FIGHTER",
        at: at(index % 9, 10 - Math.floor(index / 9)),
      });
    const full = giant(fillers);
    const fullCity = full.cities.find((candidate) => candidate.id === city.id);
    if (fullCity === undefined) throw new Error("no home");
    expect(assignedUnitCountV7(full, city.id)).toBe(
      cityUnitCapacityV7(full, fullCity),
    );
    const run = apply(full, breakOff(full, at(4, 3), at(4, 4)));
    expect(assignedUnitCountV7(run.state, city.id)).toBe(
      cityUnitCapacityV7(full, fullCity) + 2,
    );
  });

  it("parses the variant only on a Candy Toffee Trooper", () => {
    const base = giant([
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "GUARD", at: at(5, 1) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const parse = (where: { x: number; y: number }): GameStateV7 | null =>
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...base,
            units: base.units.map((unit) =>
              unit.at.x === where.x && unit.at.y === where.y
                ? { ...unit, variant: "GINGERBREAD_MAN" }
                : unit,
            ),
          }),
        ),
      );
    expect(
      parse(at(5, 2))?.units.find((unit) => unit.at.y === 2)?.variant,
    ).toBe("GINGERBREAD_MAN");
    // A Marshmallow, a Human Fighter, and an unknown variant are refused.
    expect(parse(at(5, 1))).toBeNull();
    expect(parse(at(1, 1))).toBeNull();
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...base,
            units: base.units.map((unit) =>
              unit.at.x === 5 && unit.at.y === 2
                ? { ...unit, variant: "TOFFEE" }
                : unit,
            ),
          }),
        ),
      ),
    ).toBeNull();
  });
});

describe("the new primary actions and death causes (G4, G5)", () => {
  it("refuses a Frozen giant's action and every command while a reward is pending", () => {
    const base = field(
      ["CANDY", "ICE_FOLK"],
      [{ seat: 0, role: "JUGGERNAUT", at: at(5, 3) }],
    );
    expect(
      queryPlayerCommandsV7(viewForV7(base, activeIdV7(base))),
    ).toContainEqual({
      kind: "BREAK_OFF",
      unitId: idAt(base, 5, 3),
      tiles: [at(4, 3), at(4, 4)],
    });
    // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen giant does nothing.
    const frozen = checkedV7({
      ...base,
      frozen: [{ unitId: idAt(base, 5, 3), turnsLeft: 1 }],
    });
    expect(
      reject(frozen, {
        kind: "BREAK_OFF",
        unitId: idAt(base, 5, 3),
        tiles: [at(4, 3), at(4, 4)],
      }),
    ).toMatchObject({ code: "UNIT_FROZEN" });
    // A pending city reward blocks a Stomp.
    const pending = rewardStateV7("JUGGERNAUT", "DINOSAUR", [
      { role: "JUGGERNAUT", at: at(5, 3) },
    ]).state;
    expect(
      reject(pending, { kind: "STOMP", unitId: idAt(pending, 5, 3) }),
    ).toMatchObject({ code: "PENDING_CHOICE" });
  });

  it("parses the new causes and refuses a digest with a Grave", () => {
    for (const cause of [
      "CRUSH",
      "STOMP",
      "TRAMPLE",
      "DIGESTED",
      // Ice Folk Freeze (`pulp_wars-w49.37`): a Mammoth's Stampede.
      "STAMPEDE",
    ] as const)
      expect(
        parseEventV7({ kind: "UNIT_DIED", unitId: 7, cause }).ok,
        cause,
      ).toBe(true);
  });
});
