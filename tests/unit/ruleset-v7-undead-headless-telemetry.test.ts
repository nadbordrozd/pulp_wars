import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  unitId,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  collectAcceptedTelemetryV7,
  runAiMatchV7,
  runAiBatchV7,
  type HeadlessMetricsV7,
} from "../../src/headless/v7";
import { checkedV7, mirrorOptionV7 } from "../fixtures/v7-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 revision-13 headless Undead telemetry", () => {
  it("zero-fills the faction and Undead inventories", () => {
    const state = arena(["ORIGINAL", "ORIGINAL"], []);
    const metrics = collectAcceptedTelemetryV7(state, [], []);
    expect(metrics.factionsBySeat).toEqual(["ORIGINAL", "ORIGINAL"]);
    expect(Object.keys(metrics.factionRoles)).toEqual(FACTION_IDS_V7);
    for (const faction of FACTION_IDS_V7)
      for (const inventory of Object.values(metrics.factionRoles[faction]))
        expect(Object.keys(inventory)).toEqual(UNIT_ROLE_IDS_V7);
    expect(Object.keys(metrics.capacity.overcapacityStatesByFaction)).toEqual(
      FACTION_IDS_V7,
    );
    // Revision 15: the Plague duration histogram is a zero-filled list.
    const { plagueTurnsAtEnd, ...counters } = metrics.undead;
    expect(plagueTurnsAtEnd).toEqual([0, 0, 0, 0]);
    expect(Object.values(counters).every((value) => value === 0)).toBe(true);
  });

  it("credits Wail damage and kills to the Banshee role and Undead faction", () => {
    // Seed-2 DRY_LAND 11x11: rows 0-4 west of x 6 hold no settlement.
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 3, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 2 }, hp: 1 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 4 } },
      ],
    );
    const banshee = unitAt(state, { x: 3, y: 2 });
    const metrics = telemetryFor(state, state.humanPlayerId, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    const wail = metrics.transitionEvents.find(
      (event) => event.kind === "WAIL_RESOLVED",
    );
    if (wail?.kind !== "WAIL_RESOLVED") throw new Error("no Wail");
    const damage = wail.results.reduce((sum, entry) => sum + entry.damage, 0);
    expect(wail.results).toHaveLength(2);
    expect(wail.results.filter((entry) => entry.dies)).toHaveLength(1);
    expect(metrics.result.roles.damage.MARKSMAN).toBe(damage);
    expect(metrics.result.roles.kills.MARKSMAN).toBe(1);
    expect(metrics.result.factionRoles.UNDEAD.damage.MARKSMAN).toBe(damage);
    expect(metrics.result.factionRoles.UNDEAD.kills.MARKSMAN).toBe(1);
    expect(metrics.result.factionRoles.ORIGINAL.losses.FIGHTER).toBe(1);
    expect(metrics.result.undead).toMatchObject({
      wailUses: 1,
      wailTargets: 2,
      wailDamage: damage,
      wailKills: 1,
      gravesCreated: 1,
    });
  });

  it("counts Raise Dead risings and their later Disband refund", () => {
    const graves = [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } }],
      { graves },
    );
    const necromancer = unitAt(state, { x: 2, y: 2 });
    const human = state.humanPlayerId;
    const other = otherPlayer(state, human);
    const raised = collect(state, [
      { actor: human, command: { kind: "RAISE_DEAD", unitId: necromancer.id } },
    ]);
    expect(raised.metrics.undead).toMatchObject({
      raiseDeadUses: 1,
      skeletonsRaised: 2,
      maximumSkeletonsPerRaise: 2,
      raisedSkeletonsDisbanded: 0,
    });
    // Risings are exhausted until their owner's next Start Turn.
    const skeleton = unitAt(raised.state, { x: 2, y: 1 });
    const later = collect(state, [
      { actor: human, command: { kind: "RAISE_DEAD", unitId: necromancer.id } },
      { actor: human, command: { kind: "END_TURN" } },
      { actor: other, command: { kind: "END_TURN" } },
      { actor: human, command: { kind: "DISBAND", unitId: skeleton.id } },
    ]);
    expect(later.metrics.undead).toMatchObject({
      skeletonsRaised: 2,
      raisedSkeletonsDisbanded: 1,
      raisedSkeletonDisbandCoins: 1,
      risingsDisbanded: 1,
      risingDisbandCoins: 1,
    });
    expect(later.metrics.economy.disbandCoins).toBe(1);
  });

  it("reconciles role damage with every combat, splash, and Wail event in an AI match", () => {
    // Seed 5 fields Lich splashes within 45 rounds on the many-seats boards
    // (`pulp_wars-ykw.3`; seed 2 before, see the area-attack
    // tests; seed 15 until the 3 starting Coins of `pulp_wars-if6`). Seed 12
    // since tuning 1 (`pulp_wars-w49.3`, 7r46), and seed 3 since tuning 3.
    // Seed 5 since tuning 6 (`pulp_wars-w49.6`: seed 3 trains its one Lich
    // too late to splash; seeds 2, 5, 8, 9, 10, and 14 of 0-15 splash).
    const match = runAiMatchV7(setupWith(["UNDEAD", "ORIGINAL"], 5), {
      maxRounds: 45,
    });
    expect(match.errors).toEqual([]);
    let damage = 0;
    let kills = 0;
    let splash = 0;
    let wail = 0;
    let heal = 0;
    for (const event of match.events) {
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        const splashDamage = preview.splash.reduce(
          (sum, entry) => sum + entry.damage,
          0,
        );
        splash += splashDamage;
        damage +=
          preview.damageToDefender + preview.damageToAttacker + splashDamage;
        kills +=
          Number(preview.defenderDies) +
          Number(preview.attackerDies && preview.damageToAttacker > 0) +
          preview.splash.filter((entry) => entry.dies).length;
        heal += preview.attackerHeal + preview.defenderHeal;
      }
      if (event.kind === "WAIL_RESOLVED") {
        const wailDamage = event.results.reduce(
          (sum, entry) => sum + entry.damage,
          0,
        );
        wail += wailDamage;
        damage += wailDamage;
        kills += event.results.filter((entry) => entry.dies).length;
      }
    }
    const metrics = match.metrics;
    const total = (record: Record<UnitRoleIdV7, number>) =>
      UNIT_ROLE_IDS_V7.reduce((sum, role) => sum + record[role], 0);
    expect(splash).toBeGreaterThan(0);
    expect(total(metrics.roles.damage)).toBe(damage);
    expect(total(metrics.roles.kills)).toBe(kills);
    expect(
      total(metrics.factionRoles.UNDEAD.damage) +
        total(metrics.factionRoles.ORIGINAL.damage),
    ).toBe(damage);
    expect(metrics.undead.splashDamage).toBe(splash);
    expect(metrics.undead.wailDamage).toBe(wail);
    expect(metrics.undead.lifestealHealing).toBe(heal);
    expect(metrics.undead.infections).toBe(metrics.eventsByKind.UNIT_INFECTED);
    expect(metrics.undead.infections).toBe(
      metrics.undead.infectionsOnAttack +
        metrics.undead.infectionsOnRetaliation,
    );
    expect(metrics.undead.gravesCreated).toBe(
      metrics.eventsByKind.GRAVE_CREATED,
    );
    expect(metrics.undead.raiseDeadUses).toBe(metrics.eventsByKind.DEAD_RAISED);
    expect(metrics.undead.devours).toBe(metrics.eventsByKind.GRAVE_DEVOURED);
    expect(metrics.undead.gravesRemaining).toBe(match.state.graves.length);
    expect(
      total(metrics.factionRoles.UNDEAD.trained) +
        total(metrics.factionRoles.ORIGINAL.trained),
    ).toBe(total(metrics.roles.trained));
    expect(metrics.capacity.overcapacityStates).toBe(
      metrics.capacity.overcapacityStatesByFaction.ORIGINAL +
        metrics.capacity.overcapacityStatesByFaction.UNDEAD,
    );
  }, 600_000);

  it("passes seat-ordered factions through the batch runner", async () => {
    const batch = await runAiBatchV7({
      seeds: [0],
      curiosities: false,
      aiCounts: [1],
      mapTypes: ["DRY_LAND"],
      factions: ["UNDEAD", "ORIGINAL"],
      maxCommands: 4,
      maxRounds: 5,
    });
    expect(batch.entries[0]?.factions).toEqual(["UNDEAD", "ORIGINAL"]);
    expect(batch.entries[0]?.metrics.factionsBySeat).toEqual([
      "UNDEAD",
      "ORIGINAL",
    ]);
    await expect(
      runAiBatchV7({
        seeds: [0],
        curiosities: false,
        aiCounts: [1, 2],
        factions: ["UNDEAD", "ORIGINAL"],
        maxCommands: 4,
      }),
    ).rejects.toThrow(/one entry per seat/);
  });
});

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

function telemetryFor(state: GameStateV7, actor: PlayerId, command: CommandV7) {
  const collected = collect(state, [{ actor, command }]);
  return {
    result: collected.metrics,
    state: collected.state,
    transitionEvents: collected.events,
  };
}

/** Apply accepted commands in order and collect their telemetry. */
function collect(
  initial: GameStateV7,
  steps: readonly { readonly actor: PlayerId; readonly command: CommandV7 }[],
): {
  readonly metrics: HeadlessMetricsV7;
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
} {
  let state = initial;
  const events: DomainEventV7[] = [];
  const transitions = steps.map(({ actor, command }) => {
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted)
      throw new Error(`${command.kind} rejected: ${applied.error.code}`);
    const transition = {
      before: state,
      after: applied.state,
      actorId: actor,
      command,
      events: applied.events,
    };
    events.push(...applied.events);
    state = applied.state;
    return transition;
  });
  return {
    metrics: collectAcceptedTelemetryV7(initial, [], transitions),
    state,
    events,
  };
}

function otherPlayer(state: GameStateV7, id: PlayerId): PlayerId {
  const found = state.players.find((player) => player.id !== id);
  if (found === undefined) throw new Error("player missing");
  return found.id;
}

function setupWith(factions: readonly FactionIdV7[], seed = 2): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/** A seed-2 board with every technology and only the given pieces. */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: { readonly graves?: readonly CoordV7[] } = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const player = (seat: number) => {
    const found = base.players.find((candidate) => candidate.seat === seat);
    if (found === undefined) throw new Error("seat missing");
    return found;
  };
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const cleared = [
    ...pieces.map((piece) => piece.at),
    ...(options.graves ?? []),
  ];
  const everything: CoordV7[] = base.board.tiles.map((tile) => tile.at);
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(player(0).id),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 100,
      explored: [...everything].sort(
        (left, right) => left.y - right.y || left.x - right.x,
      ),
    })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: options.graves ?? [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        cleared.some((at) => same(at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  const unit = state.units.find((candidate) => same(candidate.at, at));
  if (unit === undefined) throw new Error("unit missing");
  return unit;
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
