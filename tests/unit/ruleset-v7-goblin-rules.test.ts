import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  landTradeCityIdsV7,
  parseEventV7,
  playerIncomeV7,
  previewEconomicV7,
  projectEventsV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Revision 17 (`pulp_wars-0ao.2`) Goblin faction rules: Gang Up, the Bomb
// Chucker's minimum range, Plunder, Commerce without land trade, WAAAGH!,
// Troll regeneration, and the Field Defense restriction
// (docs/product/RULESET_7_REVISION_17_GOBLINS.md sections 3-5, 7, and 13).

const TARGET = { x: 5, y: 2 };
const ATTACKER = { x: 4, y: 2 };
// The Goblin's base attack2 (3 since the `pulp_wars-0ao.7` tuning; was 4).
const GOBLIN_ATTACK2 = 3;
const HELPER_CELLS = [
  { x: 6, y: 2 },
  { x: 5, y: 1 },
  { x: 5, y: 3 },
] as const;

describe("ruleset-7 Goblin Gang Up", () => {
  it("adds +1 Attack per other own unit next to the target, up to +2", () => {
    for (const [helpers, gangUp] of [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 2],
    ] as const) {
      const state = goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role: "FIGHTER", at: ATTACKER },
          { seat: 1, role: "GUARD", at: TARGET },
          ...HELPER_CELLS.slice(0, helpers).map((at): GoblinPieceV7 => ({
            seat: 0,
            role: "GUARD",
            at,
          })),
        ],
      );
      const preview = resolvedAttack(state, ATTACKER, TARGET);
      expect([preview.gangUp, preview.attack2]).toEqual([
        gangUp,
        GOBLIN_ATTACK2 + 2 * gangUp,
      ]);
      expect(publicPreview(state, ATTACKER, TARGET)).toEqual(preview);
    }
  });

  it("counts embarked and naval helpers but never allies, the attacker, or the target", () => {
    const water = [
      { x: 6, y: 1 },
      { x: 4, y: 1 },
    ];
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: ATTACKER },
        { seat: 1, role: "GUARD", at: TARGET },
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 1 }, form: "EMBARKED" },
        { seat: 0, role: "PATROL_BOAT", at: { x: 4, y: 1 }, form: "NAVAL" },
      ],
      { water },
    );
    expect(resolvedAttack(state, ATTACKER, TARGET)).toMatchObject({
      gangUp: 2,
      attack2: GOBLIN_ATTACK2 + 4,
    });

    // Cooperative AIs are allied: seat 2's unit next to the target is no
    // helper; seat 1's own unit is.
    const at = (x: number, y: number) => ({ x, y });
    const allied = goblinArenaV7(
      ["ORIGINAL", "GOBLIN", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: at(5, 6) },
        { seat: 0, role: "GUARD", at: at(6, 6) },
        { seat: 2, role: "GUARD", at: at(7, 6) },
        { seat: 2, role: "GUARD", at: at(6, 5) },
        { seat: 1, role: "GUARD", at: at(6, 7) },
      ],
      { aiMode: "COOPERATIVE", activeSeat: 1 },
    );
    expect(resolvedAttack(allied, at(5, 6), at(6, 6))).toMatchObject({
      gangUp: 1,
      attack2: GOBLIN_ATTACK2 + 2,
    });
  });

  it("never applies to retaliation, non-Goblin attackers, or Goblin boats", () => {
    const pieces = (helpers: boolean): GoblinPieceV7[] => [
      { seat: 1, role: "FIGHTER", at: ATTACKER },
      { seat: 0, role: "GUARD", at: TARGET },
      ...(helpers
        ? HELPER_CELLS.map((at): GoblinPieceV7 => ({
            seat: 0,
            role: "FIGHTER",
            at,
          }))
        : []),
      { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 } },
      { seat: 1, role: "FIGHTER", at: { x: 4, y: 1 } },
    ];
    // A Human attacks a surrounded Orc Brute: the Brute's retaliation is not
    // boosted, and the Human attacker has no Gang Up despite its helpers.
    const surrounded = resolvedAttack(
      goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces(true), { activeSeat: 1 }),
      ATTACKER,
      TARGET,
    );
    const alone = resolvedAttack(
      goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces(false), { activeSeat: 1 }),
      ATTACKER,
      TARGET,
    );
    expect(surrounded.retaliation).toBe(true);
    expect([surrounded.gangUp, surrounded.attack2]).toEqual([0, 4]);
    expect(surrounded.damageToAttacker).toBe(alone.damageToAttacker);
    expect(surrounded.damageToDefender).toBe(alone.damageToDefender);

    // A Goblin Battleship is a Human Battleship: no Gang Up.
    const naval = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: ATTACKER, form: "NAVAL" },
        { seat: 1, role: "GUARD", at: TARGET },
        ...HELPER_CELLS.map((at): GoblinPieceV7 => ({
          seat: 0,
          role: "GUARD",
          at,
        })),
      ],
      { water: [ATTACKER] },
    );
    expect(resolvedAttack(naval, ATTACKER, TARGET)).toMatchObject({
      gangUp: 0,
      attack2: 12,
    });
  });

  it("applies to ranged attacks and stacks with Charge and WAAAGH!", () => {
    const ranged = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 2 } },
        { seat: 1, role: "GUARD", at: TARGET },
        ...HELPER_CELLS.slice(0, 2).map((at): GoblinPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at,
        })),
      ],
    );
    const rocket = resolvedAttack(ranged, { x: 2, y: 2 }, TARGET);
    expect([rocket.gangUp, rocket.attack2, rocket.retaliation]).toEqual([
      2,
      11,
      false,
    ]);

    const charged = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        {
          seat: 0,
          role: "RAIDER",
          at: ATTACKER,
          activation: { moved: true, movedPathLength: 2, inspired: true },
        },
        { seat: 1, role: "GUARD", at: TARGET },
        ...HELPER_CELLS.slice(0, 2).map((at): GoblinPieceV7 => ({
          seat: 0,
          role: "FIGHTER",
          at,
        })),
      ],
    );
    const publicCharged = publicPreview(charged, ATTACKER, TARGET);
    const wolf = resolvedAttack(charged, ATTACKER, TARGET);
    expect([
      wolf.chargeApplied,
      wolf.inspiredApplied,
      wolf.gangUp,
      wolf.attack2,
    ]).toEqual([true, true, 2, 4 + 2 + 2 + 4]);
    expect(publicCharged).toEqual(wolf);
  });
});

describe("ruleset-7 Goblin Bomb Chucker range", () => {
  const chucker = { x: 4, y: 2 };
  it("cannot target an adjacent unit and attacks at distance 2", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: chucker },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 4, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 4 } },
      ],
    );
    const adjacent = unitAtV7(state, { x: 5, y: 2 });
    const command: CommandV7 = {
      kind: "ATTACK",
      unitId: unitAtV7(state, chucker).id,
      targetUnitId: adjacent.id,
    };
    expect(applyCommandV7(state, state.humanPlayerId, command)).toMatchObject({
      accepted: false,
      error: { code: "TARGET_OUT_OF_RANGE" },
    });
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId),
    ).not.toContainEqual(command);
    // The bomb splash (friendly fire included) is covered by
    // ruleset-v7-goblin-explosions.test.ts.
    const bomb = resolvedAttack(state, chucker, { x: 4, y: 4 });
    expect([bomb.minimumRange, bomb.maximumRange]).toEqual([2, 2]);
    expect(bomb.splash.map((entry) => entry.at)).toEqual([{ x: 5, y: 4 }]);
  });

  it("retaliates only against an attacker exactly 2 cells away", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: chucker },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 2 } },
        { seat: 1, role: "MARKSMAN", at: { x: 6, y: 2 } },
      ],
      { activeSeat: 1 },
    );
    expect(resolvedAttack(state, { x: 5, y: 2 }, chucker)).toMatchObject({
      retaliation: false,
      noRetaliationReason: "OUT_OF_RANGE",
    });
    const moved = checkedV7({
      ...state,
      units: state.units.filter(
        (unit) => unit.id !== unitAtV7(state, { x: 5, y: 2 }).id,
      ),
    });
    expect(resolvedAttack(moved, { x: 6, y: 2 }, chucker)).toMatchObject({
      retaliation: true,
    });
  });
});

describe("ruleset-7 Goblin Plunder", () => {
  const withoutCommerce = TECHNOLOGY_IDS_V7.filter(
    (tech) => tech !== "COMMERCE",
  );

  it("pays 1 Coin per hostile kill by attack with Goblin Commerce only", () => {
    const pieces: GoblinPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: ATTACKER },
      { seat: 1, role: "FIGHTER", at: TARGET, hp: 1 },
    ];
    const state = goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces);
    const result = attackResult(state, ATTACKER, TARGET);
    const goblinId = state.humanPlayerId;
    expect(plunderEvents(result.events)).toEqual([
      { kind: "PLUNDER_AWARDED", playerId: goblinId, kills: 1, coins: 1 },
    ]);
    expect(coinsOf(result.state, goblinId) - coinsOf(state, goblinId)).toBe(1);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
    // Event order: deaths and the advance, then Plunder, then reveals.
    const kinds = result.events.map((event) => event.kind);
    expect(kinds.indexOf("UNIT_DIED")).toBeLessThan(
      kinds.indexOf("PLUNDER_AWARDED"),
    );
    expect(kinds.indexOf("UNIT_MOVED")).toBeLessThan(
      kinds.indexOf("PLUNDER_AWARDED"),
    );
    if (kinds.includes("TILES_REVEALED"))
      expect(kinds.indexOf("PLUNDER_AWARDED")).toBeLessThan(
        kinds.indexOf("TILES_REVEALED"),
      );

    const noCommerce = goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces, {
      techs: { 0: withoutCommerce },
    });
    const plain = attackResult(noCommerce, ATTACKER, TARGET);
    expect(plunderEvents(plain.events)).toEqual([]);
    expect(coinsOf(plain.state, goblinId)).toBe(coinsOf(noCommerce, goblinId));

    // Human Commerce is land trade: a Human kill earns nothing.
    const human = goblinArenaV7(["ORIGINAL", "GOBLIN"], pieces);
    const humanKill = attackResult(human, ATTACKER, TARGET);
    expect(plunderEvents(humanKill.events)).toEqual([]);
    expect(coinsOf(humanKill.state, human.humanPlayerId)).toBe(
      coinsOf(human, human.humanPlayerId),
    );
  });

  it("credits a retaliation kill to the defender's owner during the enemy turn", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 1, role: "FIGHTER", at: ATTACKER, hp: 1 },
        { seat: 0, role: "GUARD", at: TARGET },
      ],
      { activeSeat: 1 },
    );
    const goblinId = seatIdV7(state, 0);
    const result = attackResult(state, ATTACKER, TARGET);
    expect(result.events[0]).toMatchObject({
      kind: "COMBAT_RESOLVED",
      preview: { attackerDies: true, retaliation: true },
    });
    expect(plunderEvents(result.events)).toEqual([
      { kind: "PLUNDER_AWARDED", playerId: goblinId, kills: 1, coins: 1 },
    ]);
    expect(coinsOf(result.state, goblinId) - coinsOf(state, goblinId)).toBe(1);
  });

  it("counts hostile Battleship splash kills", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 2 }, form: "NAVAL" },
        { seat: 1, role: "GUARD", at: { x: 4, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 2 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 3 }, hp: 1 },
      ],
      { water: [{ x: 2, y: 2 }] },
    );
    const result = attackResult(state, { x: 2, y: 2 }, { x: 4, y: 2 });
    const preview = combatPreview(result.events);
    const kills =
      Number(preview.defenderDies) +
      preview.splash.filter((entry) => entry.dies).length;
    expect(preview.splash.filter((entry) => entry.dies)).toHaveLength(2);
    expect(plunderEvents(result.events)).toEqual([
      {
        kind: "PLUNDER_AWARDED",
        playerId: state.humanPlayerId,
        kills,
        coins: kills,
      },
    ]);
  });

  it("never pays for Plague deaths", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 6, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 7 }, hp: 1 },
        { seat: 2, role: "CATAPULT", at: { x: 7, y: 10 } },
      ],
    );
    const victim = unitAtV7(base, { x: 7, y: 7 });
    const state = checkedV7({
      ...base,
      plagued: [
        {
          unitId: victim.id,
          sourceUnitId: unitAtV7(base, { x: 7, y: 10 }).id,
          turnsRemaining: 3,
        },
      ],
    });
    const goblinId = state.humanPlayerId;
    const result = endTurnUntilV7(state, victim.ownerId);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_DIED",
        unitId: victim.id,
        cause: "PLAGUE",
      }),
    );
    expect(plunderEvents(result.events)).toEqual([]);
    expect(coinsOf(result.state, goblinId)).toBe(coinsOf(state, goblinId));
  });

  it("projects PLUNDER_AWARDED to its player only", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: ATTACKER },
        { seat: 1, role: "FIGHTER", at: TARGET, hp: 1 },
      ],
    );
    const result = attackResult(state, ATTACKER, TARGET);
    const projected = (viewer: PlayerId) =>
      projectEventsV7(state, result.state, viewer, result.events).events.filter(
        (event) => event.kind === "PLUNDER_AWARDED",
      );
    expect(projected(seatIdV7(state, 0))).toHaveLength(1);
    expect(projected(seatIdV7(state, 1))).toEqual([]);
  });
});

describe("ruleset-7 Goblin Commerce without land trade", () => {
  it("earns no Goblin land trade while Human Commerce keeps it (canonical and public)", () => {
    const results = (["ORIGINAL", "GOBLIN"] as const).map((faction) => {
      const other: FactionIdV7 = faction === "GOBLIN" ? "ORIGINAL" : "GOBLIN";
      const base = goblinArenaV7(
        [faction, other],
        [
          {
            seat: 0,
            role: "FIGHTER",
            at: { x: 8, y: 5 },
            captureEligible: true,
          },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        ],
      );
      const owner = base.humanPlayerId;
      let state = applyOkV7(base, owner, {
        kind: "CAPTURE",
        unitId: unitAtV7(base, { x: 8, y: 5 }).id,
      }).state;
      state = applyOkV7(state, owner, {
        kind: "BUILD_ROAD",
        at: { x: 8, y: 6 },
      }).state;
      const preview = previewEconomicV7(viewForV7(state, owner), {
        kind: "BUILD_ROAD",
        at: { x: 8, y: 7 },
      });
      if (!preview.ok) throw new Error("road preview missing");
      state = applyOkV7(state, owner, {
        kind: "BUILD_ROAD",
        at: { x: 8, y: 7 },
      }).state;
      const village = state.cities.find(
        (city) => city.at.x === 8 && city.at.y === 5,
      );
      if (village === undefined) throw new Error("captured city missing");
      return {
        faction,
        previewCoins: preview.preview.coinIncomeDeltaByCity,
        landTrade: [...landTradeCityIdsV7(state, owner)],
        view: viewForV7(state, owner).naval.landTradeCityIds,
        income: playerIncomeV7(state, owner).cities.find(
          (entry) => entry.cityId === village.id,
        )?.coins,
        cityId: village.id,
      };
    });
    const [human, goblin] = results;
    if (human === undefined || goblin === undefined) throw new Error("missing");
    expect(human.landTrade).toEqual([human.cityId]);
    expect(human.view).toEqual([human.cityId]);
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): land trade pays 2 Coins.
    expect(human.previewCoins).toEqual([{ cityId: human.cityId, delta: 2 }]);
    expect(goblin.landTrade).toEqual([]);
    expect(goblin.view).toEqual([]);
    expect(goblin.previewCoins).toEqual([]);
    expect((human.income ?? 0) - (goblin.income ?? 0)).toBe(2);
  });
});

describe("ruleset-7 Goblin WAAAGH!", () => {
  const warboss = { x: 5, y: 3 };
  it("inspires every other own land unit with ATTACK within 2, including support and siege roles", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: warboss },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 5 } },
        { seat: 0, role: "CATAPULT", at: { x: 7, y: 3 } },
        { seat: 0, role: "CAPTAIN", at: { x: 3, y: 4 } },
        { seat: 0, role: "JUGGERNAUT", at: { x: 4, y: 2 } },
        {
          seat: 0,
          role: "FIGHTER",
          at: { x: 6, y: 4 },
          activation: { inspired: true },
        },
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 1 }, form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 2 } },
      ],
      { water: [{ x: 5, y: 1 }] },
    );
    const boss = unitAtV7(state, warboss);
    const command: CommandV7 = { kind: "RALLY", unitId: boss.id };
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual(
      command,
    );
    const result = applyOkV7(state, state.humanPlayerId, command);
    const expected = [
      { x: 4, y: 2 },
      { x: 7, y: 3 },
      { x: 3, y: 4 },
      { x: 5, y: 5 },
    ]
      .map((at) => unitAtV7(state, at).id)
      .sort((left, right) => left - right);
    expect(result.events).toEqual([
      { kind: "UNITS_RALLIED", captainId: boss.id, unitIds: expected },
    ]);
    const stats = publicUnitStatsV7(
      result.state,
      unitAtV7(result.state, { x: 5, y: 5 }),
    );
    expect(stats.statuses).toContain("WAAAGH!: +1 Attack on the next attack");
    expect(stats.goblin).toEqual({
      // The Goblin's Kaboom is 5 since `pulp_wars-0ao.7` (was 4).
      kaboomDamage: 5,
      deathBlastDamage: null,
      rallyRadius: 0,
      regeneration: 0,
      buildsFieldDefense: false,
    });
    expect(publicUnitStatsV7(state, boss).goblin?.rallyRadius).toBe(2);
  });

  it("rejects WAAAGH! without a target and never offers or accepts Tend Wounded", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: warboss },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 4 }, hp: 2 },
        {
          seat: 0,
          role: "FIGHTER",
          at: { x: 6, y: 4 },
          activation: { inspired: true },
        },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const boss = unitAtV7(state, warboss);
    const offered = queryPlayerCommandsV7(state, state.humanPlayerId);
    expect(offered).not.toContainEqual({
      kind: "TEND_WOUNDED",
      unitId: boss.id,
    });
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "TEND_WOUNDED",
        unitId: boss.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ROLE_INVALID", params: { role: "CAPTAIN" } },
    });
    const lonely = checkedV7({
      ...state,
      units: state.units.filter(
        (unit) =>
          unit.ownerId !== state.humanPlayerId ||
          unit.id === boss.id ||
          unit.activation.inspired ||
          unit.at.y === 6,
      ),
    });
    expect(
      queryPlayerCommandsV7(lonely, lonely.humanPlayerId),
    ).not.toContainEqual({ kind: "RALLY", unitId: boss.id });
    expect(
      applyCommandV7(lonely, lonely.humanPlayerId, {
        kind: "RALLY",
        unitId: boss.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "HEAL_TARGET_NOT_FOUND" },
    });
  });

  it("keeps the Human Captain's Rally at radius 1 without support and siege roles", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "CAPTAIN", at: warboss },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 5 } },
        { seat: 0, role: "CATAPULT", at: { x: 6, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const captain = unitAtV7(state, warboss);
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "RALLY",
      unitId: captain.id,
    });
    expect(result.events).toEqual([
      {
        kind: "UNITS_RALLIED",
        captainId: captain.id,
        unitIds: [unitAtV7(state, { x: 4, y: 4 }).id],
      },
    ]);
  });
});

describe("ruleset-7 Troll regeneration", () => {
  it("heals every Troll 4 HP (capped) at its owner's Start Turn on any tile and in any form", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        // Hostile territory next to the Human capital.
        { seat: 0, role: "JUGGERNAUT", at: { x: 3, y: 7 }, hp: 30 },
        { seat: 0, role: "JUGGERNAUT", at: { x: 5, y: 2 }, hp: 38 },
        { seat: 0, role: "JUGGERNAUT", at: { x: 6, y: 2 } },
        {
          seat: 0,
          role: "JUGGERNAUT",
          at: { x: 1, y: 4 },
          form: "EMBARKED",
          hp: 12,
        },
        // A Human Juggernaut and a wounded Goblin do not regenerate.
        { seat: 1, role: "JUGGERNAUT", at: { x: 1, y: 1 }, hp: 20 },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 }, hp: 2 },
      ],
      { water: [{ x: 1, y: 4 }], activeSeat: 1 },
    );
    const goblinId = seatIdV7(state, 0);
    const result = endTurnUntilV7(state, goblinId);
    const trolls = [
      { x: 3, y: 7 },
      { x: 5, y: 2 },
      { x: 1, y: 4 },
    ].map((at) => unitAtV7(state, at));
    const regenerated = result.events.filter(
      (event) => event.kind === "UNITS_REGENERATED",
    );
    expect(regenerated).toEqual([
      {
        kind: "UNITS_REGENERATED",
        playerId: goblinId,
        results: trolls
          .map((troll) => ({
            unitId: troll.id,
            amount: Math.min(4, troll.maxHp - troll.hp),
            hpAfter: Math.min(troll.maxHp, troll.hp + 4),
          }))
          .sort((left, right) => left.unitId - right.unitId),
      },
    ]);
    for (const event of regenerated) expect(parseEventV7(event).ok).toBe(true);
    const kinds = result.events.map((event) => event.kind);
    expect(kinds.indexOf("TURN_STARTED")).toBeLessThan(
      kinds.indexOf("UNITS_REGENERATED"),
    );
    expect(kinds.indexOf("UNITS_REGENERATED")).toBeLessThan(
      kinds.lastIndexOf("INCOME_AWARDED"),
    );
    // The Human player's own Start Turn has no regeneration.
    const human = endTurnUntilV7(result.state, seatIdV7(state, 1));
    expect(
      human.events.filter((event) => event.kind === "UNITS_REGENERATED"),
    ).toEqual([]);
  });

  it("runs after Windmill healing and before income", () => {
    let state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
        { seat: 0, role: "FIGHTER", at: { x: 9, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const goblinId = state.humanPlayerId;
    state = checkedV7({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === 7 && tile.at.y === 9
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
              }
            : tile.at.x === 8 && tile.at.y === 9
              ? {
                  ...tile,
                  biome: "PLAINS" as const,
                  terrain: "GRASS" as const,
                  resource: null,
                }
              : tile,
        ),
      },
    });
    state = applyOkV7(state, goblinId, {
      kind: "BUILD_FARM",
      at: { x: 7, y: 9 },
    }).state;
    state = settleRewards(state, goblinId);
    state = applyOkV7(state, goblinId, {
      kind: "BUILD_WINDMILL",
      at: { x: 8, y: 9 },
    }).state;
    const trollAt = { x: 9, y: 9 };
    state = checkedV7({
      ...state,
      units: [
        ...state.units,
        {
          ...unitAtV7(state, { x: 7, y: 7 }),
          id: state.nextEntityId as GameStateV7["units"][number]["id"],
          role: "JUGGERNAUT",
          at: trollAt,
          hp: 20,
          maxHp: 40,
        },
      ],
      nextEntityId: state.nextEntityId + 1,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === trollAt.x && tile.at.y === trollAt.y
            ? { ...tile, terrain: "GRASS" as const, resource: null }
            : tile,
        ),
      },
    });
    const troll = unitAtV7(state, trollAt);
    const result = endTurnUntilV7(state, goblinId);
    const own = result.events.slice(
      result.events.findIndex(
        (event) => event.kind === "TURN_STARTED" && event.playerId === goblinId,
      ),
    );
    const kinds = own.map((event) => event.kind);
    expect(kinds.indexOf("WINDMILL_HEALING_RESOLVED")).toBeGreaterThan(0);
    expect(kinds.indexOf("WINDMILL_HEALING_RESOLVED")).toBeLessThan(
      kinds.indexOf("UNITS_REGENERATED"),
    );
    expect(kinds.indexOf("UNITS_REGENERATED")).toBeLessThan(
      kinds.indexOf("INCOME_AWARDED"),
    );
    // End Turn idle recovery (20 -> 24), then Windmill (+6 -> 30), then
    // regeneration (+4 -> 34).
    const windmill = own.find(
      (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
    );
    expect(windmill).toMatchObject({
      results: [{ unitId: troll.id, amount: 6, hpAfter: 30 }],
    });
    expect(own.find((event) => event.kind === "UNITS_REGENERATED")).toEqual({
      kind: "UNITS_REGENERATED",
      playerId: goblinId,
      results: [{ unitId: troll.id, amount: 4, hpAfter: 34 }],
    });
    expect(unitAtV7(result.state, trollAt).hp).toBe(34);
  });

  it("projects regeneration to the owner and to viewers who see the Troll", () => {
    const arena = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: { x: 3, y: 5 }, hp: 30 },
        { seat: 0, role: "JUGGERNAUT", at: { x: 9, y: 2 }, hp: 30 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 6 } },
      ],
      { activeSeat: 1 },
    );
    const goblinId = seatIdV7(arena, 0);
    const humanId = seatIdV7(arena, 1);
    // The Human has not explored the second Troll's tile.
    const state = checkedV7({
      ...arena,
      players: arena.players.map((player) =>
        player.id === humanId
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => at.x !== 9 || at.y !== 2,
              ),
            }
          : player,
      ),
    });
    const result = applyOkV7(state, humanId, { kind: "END_TURN" });
    const projected = (viewer: PlayerId) =>
      projectEventsV7(state, result.state, viewer, result.events).events.find(
        (event) => event.kind === "UNITS_REGENERATED",
      );
    expect(projected(goblinId)).toMatchObject({
      results: [expect.anything(), expect.anything()],
    });
    expect(projected(humanId)).toEqual({
      kind: "UNITS_REGENERATED",
      playerId: goblinId,
      results: [
        {
          unitId: unitAtV7(state, { x: 3, y: 5 }).id,
          amount: 4,
          hpAfter: 34,
        },
      ],
    });
  });
});

describe("ruleset-7 Goblin Field Defense restriction", () => {
  it("rejects and never offers Field Defense for the Goblin; the Orc Brute builds it", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
        { seat: 0, role: "GUARD", at: { x: 9, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const goblin = unitAtV7(state, { x: 7, y: 7 });
    const brute = unitAtV7(state, { x: 9, y: 7 });
    const offered = queryPlayerCommandsV7(state, state.humanPlayerId);
    expect(offered).not.toContainEqual({
      kind: "BUILD_FIELD_DEFENSE",
      unitId: goblin.id,
    });
    expect(offered).toContainEqual({
      kind: "BUILD_FIELD_DEFENSE",
      unitId: brute.id,
    });
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "BUILD_FIELD_DEFENSE",
        unitId: goblin.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: {
        code: "INVALID_TILE",
        params: { action: "BUILD_FIELD_DEFENSE" },
      },
    });
    applyOkV7(state, state.humanPlayerId, {
      kind: "BUILD_FIELD_DEFENSE",
      unitId: brute.id,
    });
  });

  it("keeps Field Defense for Human Fighters and Undead Skeletons", () => {
    for (const faction of ["ORIGINAL", "UNDEAD"] as const) {
      const state = goblinArenaV7(
        [faction, "GOBLIN"],
        [
          { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        ],
      );
      applyOkV7(state, state.humanPlayerId, {
        kind: "BUILD_FIELD_DEFENSE",
        unitId: unitAtV7(state, { x: 7, y: 7 }).id,
      });
    }
  });
});

/** Chooses the first candidate of every pending city reward of `actor`. */
function settleRewards(state: GameStateV7, actor: PlayerId): GameStateV7 {
  let current = state;
  for (let guard = 0; guard < 8; guard += 1) {
    const head = current.pendingChoices[0];
    if (head === undefined) return current;
    const reward = head.candidates[0];
    if (reward === undefined) throw new Error("no reward candidate");
    current = applyOkV7(current, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: head.cityId,
      reachedLevel: head.reachedLevel,
      reward,
    }).state;
  }
  throw new Error("rewards never settled");
}

function attackResult(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const attacker = unitAtV7(state, from);
  return applyOkV7(state, attacker.ownerId, {
    kind: "ATTACK",
    unitId: attacker.id,
    targetUnitId: unitAtV7(state, to).id,
  });
}

function resolvedAttack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): CombatPreviewV7 {
  return combatPreview(attackResult(state, from, to).events);
}

function publicPreview(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): CombatPreviewV7 | null {
  const attacker = unitAtV7(state, from);
  return queryCombatPreviewV7(
    state,
    attacker.ownerId,
    attacker.id,
    unitAtV7(state, to).id,
  );
}

function combatPreview(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events[0];
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

function plunderEvents(events: readonly DomainEventV7[]) {
  return events.filter((event) => event.kind === "PLUNDER_AWARDED");
}

function coinsOf(state: GameStateV7, playerId: PlayerId): number {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new Error("player missing");
  return player.coins;
}
