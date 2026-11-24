import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SNOW_BALM_HEAL_V7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  previewFrostBreathV7,
  previewSnowBalmV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  tileAtV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import { FROST_BREATH_FREEZE_VALUE_V7 } from "../../src/ai/v7-ice-folk";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { frozenArenaV7, iceEntryV7 } from "../fixtures/v7-frozen-sea";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The Witch and the Wyrm (`pulp_wars-xt9c`, ruleset 7r140,
// docs/product/RULESET_7_CURRENT.md sections 21.6 and 21.12). The user,
// 2026-11-14: "the ice witch needs some extra action ... maybe her alt
// ability should be healing" and "the ice wyrm is weak sauce ... something
// else for crowd control. e.g. ranged attack that also freezes everything
// in 3x3 square". On the authored strait of `v7-naval-branch.ts`: rows 0 to
// 2 and 8 to 10 land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water;
// seat 0 (the Ice Folk) has its capital on (5, 2) with a 3 x 3 territory
// and a Port on (4, 3), seat 1 (the Humans) its capital on (5, 8). Seat 0
// moves first. Every case is a hand-built state; no match is played.

const ALL: readonly TechnologyIdV7[] = NAVAL_TECHS_V7;
const key = (at: CoordV7): string => `${at.x},${at.y}`;
const keys = (tiles: readonly CoordV7[]): string[] => tiles.map(key).sort();
const viewOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  viewForV7(state, seatV7(state, seat).id);
const commandsOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewOf(state, seat));
const eventOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }> | undefined =>
  events.find(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );
/** `state` with the given HP and Frozen entries, re-validated. */
const patched = (
  state: GameStateV7,
  hp: ReadonlyMap<number, number>,
  frozen: readonly number[] = [],
): GameStateV7 => {
  const parsed = parseGameStateV7({
    ...state,
    units: state.units.map((unit) =>
      hp.has(unit.id) ? { ...unit, hp: hp.get(unit.id) as number } : unit,
    ),
    frozen: [
      ...state.frozen,
      ...frozen.map((unitId) => ({ unitId, turnsLeft: 1 as const })),
    ].sort((left, right) => left.unitId - right.unitId),
  });
  if (parsed === null) throw new Error("the patched state is invalid");
  return parsed;
};

describe("the identity (pulp_wars-xt9c)", () => {
  // Freezes ice docks (`pulp_wars-jjzz`) took 7r141 after it, and the Ice
  // Folk sea beasts (`pulp_wars-lf1r`) 7r142.
  it("was 7r140 after 7r139, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r145");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r145.current");
    expect(PRIOR_RULESET_7_IDS.at(-5)).toBe("pulp-wars-poc-7r140");
    expect(PRIOR_RULESET_7_IDS.at(-6)).toBe("pulp-wars-poc-7r139");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-6)).toBe(
      "pulpWars.save.v7r139.current",
    );
  });
});

describe("the Ice Witch's Snow Balm (section 21.6)", () => {
  // The Witch on (2, 1). Around her: a wounded Yeti on (1, 1), a Frozen
  // Walrus at full HP on (3, 1), a Sled at full HP on (2, 2) (nothing to
  // do), a wounded Snow Hunter on (1, 2) one HP short, and an enemy Fighter
  // on (3, 2) (never healed). A wounded Yeti on (0, 1) is out of reach.
  const WITCH: CoordV7 = { x: 2, y: 1 };
  const build = () => {
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 0, role: "GUARD", at: { x: 3, y: 1 } },
        { seat: 0, role: "RAIDER", at: { x: 2, y: 2 } },
        { seat: 0, role: "MARKSMAN", at: { x: 1, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 0, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
    });
    const at = (x: number, y: number) => navalUnitAtV7(state, { x, y }).id;
    return patched(
      state,
      new Map([
        [at(1, 1), 4],
        [at(1, 2), 7],
        [at(0, 1), 4],
        [at(3, 2), 6],
      ]),
      [at(3, 1)],
    );
  };

  it("heals every wounded own unit around her 3 (capped) and thaws a Frozen one, in one action", () => {
    const state = build();
    const witch = navalUnitAtV7(state, WITCH);
    const yeti = navalUnitAtV7(state, { x: 1, y: 1 });
    const walrus = navalUnitAtV7(state, { x: 3, y: 1 });
    const hunter = navalUnitAtV7(state, { x: 1, y: 2 });
    const far = navalUnitAtV7(state, { x: 0, y: 1 });
    const enemy = navalUnitAtV7(state, { x: 3, y: 2 });
    expect(SNOW_BALM_HEAL_V7).toBe(3);
    const offered = commandsOf(state).filter(
      (command) => "unitId" in command && command.unitId === witch.id,
    );
    expect(offered.map((command) => command.kind)).toEqual(
      expect.arrayContaining(["COLD_SNAP", "SNOW_BALM"]),
    );
    const preview = previewSnowBalmV7(viewOf(state), witch.id);
    const result = acceptV7(state, 0, { kind: "SNOW_BALM", unitId: witch.id });
    const after = result.state;
    expect(navalUnitV7(after, yeti.id).hp).toBe(7);
    // One HP short of its maximum: healed 1, not 3.
    expect(navalUnitV7(after, hunter.id).hp).toBe(hunter.maxHp);
    expect(after.frozen.some((entry) => entry.unitId === walrus.id)).toBe(
      false,
    );
    // Out of reach, and an enemy: untouched.
    expect(navalUnitV7(after, far.id).hp).toBe(4);
    expect(navalUnitV7(after, enemy.id).hp).toBe(6);
    expect(result.events.map((event) => event.kind)).toEqual([
      "WOUNDED_TENDED",
    ]);
    const tended = eventOf(result.events, "WOUNDED_TENDED");
    expect(tended).toEqual({
      kind: "WOUNDED_TENDED",
      captainId: witch.id,
      results: [
        {
          unitId: yeti.id,
          amount: 3,
          hpAfter: 7,
          curedPlague: false,
          curedBitten: false,
          curedFrozen: false,
        },
        {
          unitId: walrus.id,
          amount: 0,
          hpAfter: walrus.maxHp,
          curedPlague: false,
          curedBitten: false,
          curedFrozen: true,
        },
        {
          unitId: hunter.id,
          amount: 1,
          hpAfter: hunter.maxHp,
          curedPlague: false,
          curedBitten: false,
          curedFrozen: false,
        },
      ].sort((left, right) => left.unitId - right.unitId),
    });
    // The preview is the result.
    expect(preview).toEqual({
      unitId: witch.id,
      results: (tended?.results ?? []).map((entry) => ({
        unitId: entry.unitId,
        amount: entry.amount,
        hpAfter: entry.hpAfter,
        curedFrozen: entry.curedFrozen,
      })),
    });
    // Her primary action is used: no Cold Snap after it.
    expect(navalUnitV7(after, witch.id).activation.specialActed).toBe(true);
    expect(
      commandsOf(after).some(
        (command) =>
          (command.kind === "COLD_SNAP" || command.kind === "SNOW_BALM") &&
          command.unitId === witch.id,
      ),
    ).toBe(false);
    expect(
      rejectV7(after, 0, { kind: "COLD_SNAP", unitId: witch.id }).code,
    ).toBe("UNIT_ALREADY_ACTED");
  });

  it("excludes the Snow Balm after a Cold Snap the same turn", () => {
    const state = build();
    const witch = navalUnitAtV7(state, WITCH);
    const after = acceptV7(state, 0, {
      kind: "COLD_SNAP",
      unitId: witch.id,
    }).state;
    expect(
      commandsOf(after).some((command) => command.kind === "SNOW_BALM"),
    ).toBe(false);
    expect(
      rejectV7(after, 0, { kind: "SNOW_BALM", unitId: witch.id }).code,
    ).toBe("UNIT_ALREADY_ACTED");
  });

  it("is not offered, and is refused, when it would heal or thaw nobody", () => {
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
    });
    // The enemy is wounded, the Witch herself is wounded: neither counts.
    const witch = navalUnitAtV7(state, WITCH);
    const enemy = navalUnitAtV7(state, { x: 3, y: 2 });
    const hurt = patched(
      state,
      new Map([
        [witch.id, 4],
        [enemy.id, 3],
      ]),
    );
    expect(
      commandsOf(hurt).some((command) => command.kind === "SNOW_BALM"),
    ).toBe(false);
    expect(previewSnowBalmV7(viewOf(hurt), witch.id)).toBeNull();
    expect(rejectV7(hurt, 0, { kind: "SNOW_BALM", unitId: witch.id })).toEqual({
      code: "HEAL_TARGET_NOT_FOUND",
      params: {},
    });
  });

  it("is the Ice Witch's alone", () => {
    expect(effectiveRoleRuleV7("CAPTAIN", "ICE_FOLK").abilities).toContain(
      "SNOW_BALM",
    );
    for (const faction of ["ORIGINAL", "UNDEAD", "DWARF"] as const)
      expect(
        effectiveRoleRuleV7("CAPTAIN", faction).abilities as readonly string[],
      ).not.toContain("SNOW_BALM");
  });
});

describe("the Frost Wyrm's Frost Breath (section 21.12)", () => {
  // The Wyrm on (1, 2) breathes on a Human Fighter on (3, 2), 2 tiles off.
  // The square (2..4, 1..3): (2, 1), (3, 1) and (2, 2) open neutral land,
  // (4, 1) and (4, 2) seat 0's capital territory, (2, 3) and (3, 3) open
  // Shallow Water (a Human boat on (3, 3)), (4, 3) seat 0's Port. A second
  // Fighter on (2, 1) and an own Yeti on (4, 1).
  const WYRM: CoordV7 = { x: 1, y: 2 };
  const TARGET: CoordV7 = { x: 3, y: 2 };
  const build = () =>
    frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "KNIGHT", at: WYRM },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 1 } },
        { seat: 1, role: "FIGHTER", at: TARGET },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 1 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 3 } },
      ],
    });

  it("has Knight-class numbers and gives way to the Knight on Coins and Attack", () => {
    const wyrm = effectiveRoleRuleV7("KNIGHT", "ICE_FOLK");
    const knight = effectiveRoleRuleV7("KNIGHT", "ORIGINAL");
    expect(wyrm).toMatchObject({
      label: "Frost Wyrm",
      cost: 10,
      maxHp: 16,
      attack2: 7,
      defense2: 2,
      move: 3,
      range: 2,
      minimumRange: 1,
      mayUsePrimaryActionAfterMove: true,
    });
    expect(wyrm.cost as number).toBeGreaterThan(knight.cost as number);
    expect(wyrm.attack2).toBeLessThan(knight.attack2);
  });

  it("attacks 2 tiles away with no strike back and freezes the 3x3 square round the target", () => {
    const state = build();
    const wyrm = navalUnitAtV7(state, WYRM);
    const target = navalUnitAtV7(state, TARGET);
    const second = navalUnitAtV7(state, { x: 2, y: 1 });
    const boat = navalUnitAtV7(state, { x: 3, y: 3 });
    const yeti = navalUnitAtV7(state, { x: 4, y: 1 });
    const command: CommandV7 = {
      kind: "ATTACK",
      unitId: wyrm.id,
      targetUnitId: target.id,
    };
    expect(
      commandsOf(state).some(
        (offered) => JSON.stringify(offered) === JSON.stringify(command),
      ),
    ).toBe(true);
    const combat = queryCombatPreviewV7(viewOf(state), wyrm.id, target.id);
    const breath = previewFrostBreathV7(viewOf(state), wyrm.id, target.id);
    expect(combat?.retaliation).toBe(false);
    expect(combat?.damageToAttacker).toBe(0);
    expect(combat?.defenderDies).toBe(false);
    expect(combat?.frostBreathApplied).toBe(true);
    const result = acceptV7(state, 0, command);
    const after = result.state;
    // The hit, and nothing back.
    expect(navalUnitV7(after, target.id).hp).toBe(
      target.hp - (combat?.damageToDefender ?? 0),
    );
    expect(navalUnitV7(after, wyrm.id).hp).toBe(wyrm.hp);
    // Every hostile unit in the square Frozen for a turn; the own Yeti not.
    expect(after.frozen).toEqual(
      [target.id, second.id, boat.id]
        .sort((left, right) => left - right)
        .map((unitId) => ({ unitId, turnsLeft: 1 })),
    );
    expect(after.frozen.some((entry) => entry.unitId === yeti.id)).toBe(false);
    // Water to ice (Rime), the boat's water stays water; neutral land to
    // Snow; territory land and the Port unchanged.
    expect(iceEntryV7(after, { x: 2, y: 3 })?.ownerId).toBe(
      seatV7(after, 0).id,
    );
    expect(iceEntryV7(after, { x: 3, y: 3 })).toBeUndefined();
    expect(iceEntryV7(after, { x: 4, y: 3 })).toBeUndefined();
    expect(tileAtV7(after.board, { x: 4, y: 3 })?.improvement).toBe("PORT");
    expect(keys(after.snow)).toEqual(
      keys([
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ]),
    );
    // The events: the exchange, then one UNITS_FROZEN, then TILES_FROZEN.
    const kinds = result.events.map((event) => event.kind);
    expect(kinds.indexOf("COMBAT_RESOLVED")).toBeLessThan(
      kinds.indexOf("UNITS_FROZEN"),
    );
    expect(kinds.indexOf("UNITS_FROZEN")).toBeLessThan(
      kinds.indexOf("TILES_FROZEN"),
    );
    expect(eventOf(result.events, "UNITS_FROZEN")).toMatchObject({
      source: "FROST_BREATH",
      sourceUnitId: wyrm.id,
    });
    const tiles = eventOf(result.events, "TILES_FROZEN");
    // The previews are the result.
    expect(eventOf(result.events, "COMBAT_RESOLVED")?.preview).toMatchObject({
      damageToDefender: combat?.damageToDefender,
      damageToAttacker: 0,
      defenderDies: false,
      frostBreathApplied: true,
    });
    expect(breath).toEqual({
      unitId: wyrm.id,
      targetUnitId: target.id,
      at: TARGET,
      targets: after.frozen.map((entry) => entry.unitId),
      tiles: tiles?.tiles,
      snow: tiles?.snow,
    });
  });

  it("still freezes the square when the breath kills its target", () => {
    const state = build();
    const wyrm = navalUnitAtV7(state, WYRM);
    const target = navalUnitAtV7(state, TARGET);
    const weak = patched(state, new Map([[target.id, 1]]));
    const breath = previewFrostBreathV7(viewOf(weak), wyrm.id, target.id);
    const after = acceptV7(weak, 0, {
      kind: "ATTACK",
      unitId: wyrm.id,
      targetUnitId: target.id,
    }).state;
    expect(after.units.some((unit) => unit.id === target.id)).toBe(false);
    expect(after.frozen.map((entry) => entry.unitId)).toEqual(breath?.targets);
    expect(breath?.targets).not.toContain(target.id);
    expect(breath?.targets.length).toBe(2);
  });
});

describe("the Normal AI (pulp_wars-xt9c)", () => {
  it("casts the Snow Balm rather than a Cold Snap that freezes no enemy", () => {
    // The Witch on (2, 1) with a wounded Yeti beside her and no enemy in
    // her ring: her Cold Snap would only lay Snow.
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    });
    const witch = navalUnitAtV7(state, { x: 2, y: 1 });
    const yeti = navalUnitAtV7(state, { x: 1, y: 1 });
    const hurt = patched(state, new Map([[yeti.id, 3]]));
    const offered = commandsOf(hurt).map((command) => command.kind);
    expect(offered).toEqual(expect.arrayContaining(["COLD_SNAP", "SNOW_BALM"]));
    const candidates = chooseNormalCommandV7(viewOf(hurt)).candidates;
    const scoreOf = (kind: string) =>
      candidates.find(
        (item) =>
          item.command.kind === kind &&
          "unitId" in item.command &&
          item.command.unitId === witch.id,
      )?.score.priority ?? -1;
    expect(scoreOf("SNOW_BALM")).toBeGreaterThanOrEqual(0);
    expect(scoreOf("COLD_SNAP")).toBeLessThan(0);
  });

  it("casts the Cold Snap rather than a Balm worth less when it freezes enemies", () => {
    // Two Human Fighters beside the Witch; the Yeti is one HP short.
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
    });
    const witch = navalUnitAtV7(state, { x: 2, y: 1 });
    const yeti = navalUnitAtV7(state, { x: 1, y: 1 });
    const hurt = patched(state, new Map([[yeti.id, yeti.maxHp - 1]]));
    const view = viewOf(hurt);
    expect(
      scoreCommandV7(view, { kind: "COLD_SNAP", unitId: witch.id }).priority,
    ).toBeGreaterThanOrEqual(0);
    expect(
      scoreCommandV7(view, { kind: "SNOW_BALM", unitId: witch.id }).priority,
    ).toBeLessThan(0);
  });

  it("scores a breath that freezes three enemies above a plain hit", () => {
    // The Wyrm on (5, 0) may breathe on a Fighter on (3, 0) with two more
    // Fighters beside it, or on a lone Fighter on (7, 0); both 2 tiles off,
    // at full HP on open neutral land.
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "KNIGHT", at: { x: 5, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 0 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 0 } },
      ],
    });
    const wyrm = navalUnitAtV7(state, { x: 5, y: 0 });
    const grouped = navalUnitAtV7(state, { x: 3, y: 0 });
    const lone = navalUnitAtV7(state, { x: 7, y: 0 });
    const view = viewOf(state);
    expect(
      previewFrostBreathV7(view, wyrm.id, grouped.id)?.targets.length,
    ).toBe(3);
    expect(previewFrostBreathV7(view, wyrm.id, lone.id)?.targets).toEqual([
      lone.id,
    ]);
    const group = scoreCommandV7(view, {
      kind: "ATTACK",
      unitId: wyrm.id,
      targetUnitId: grouped.id,
    });
    const plain = scoreCommandV7(view, {
      kind: "ATTACK",
      unitId: wyrm.id,
      targetUnitId: lone.id,
    });
    expect(group.priority).toBeGreaterThanOrEqual(plain.priority);
    expect(group.strategicValue - plain.strategicValue).toBeGreaterThanOrEqual(
      2 * FROST_BREATH_FREEZE_VALUE_V7,
    );
    const best = chooseNormalCommandV7(view).candidates.find(
      (item) =>
        item.command.kind === "ATTACK" && item.command.unitId === wyrm.id,
    )?.command;
    expect(best).toEqual({
      kind: "ATTACK",
      unitId: wyrm.id,
      targetUnitId: grouped.id,
    });
  });
});
