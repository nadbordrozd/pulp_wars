import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_IDS_V7,
  ACHIEVEMENT_REQUIRED_TECH_V7,
  CONQUEROR_CAPTURES_V7,
  FACTION_IDS_V7,
  LAND_BARON_CITIES_V7,
  PRIOR_RULESET_7_IDS,
  REVISION_21_ACHIEVEMENT_IDS_V7,
  RULESET_7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SEA_DOG_SHIPS_V7,
  SLAYER_KILLS_V7,
  applyCommandV7,
  createPlayableGameV7,
  createReplayV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  runReplayV7,
  viewForV7,
  type AchievementIdV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import { collectAcceptedTelemetryV7 } from "../../src/headless/v7";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { withKillsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinSetupV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { at, attackV7, fieldV7 } from "../fixtures/v7-revision20";

// Revision 21 (`pulp_wars-9s0.4`,
// docs/product/RULESET_7_REVISION_21_ACHIEVEMENTS.md): identity, the four new
// achievements (Conqueror, Land Baron, Sea Dog, Slayer), their evaluation,
// events, progress, Monuments, persistence, and headless telemetry.
//
// Three-seat field: capitals seat 0 (2, 2), seat 1 (11, 11), seat 2 (11, 2);
// villages (8, 2), (8, 5), (11, 5), (5, 8). Two-seat field: capitals seat 0
// (8, 8), seat 1 (2, 8); villages (5, 5), (8, 5), (5, 8).

const FACTIONS: readonly FactionIdV7[] = FACTION_IDS_V7;
const VILLAGES_3: readonly CoordV7[] = [
  at(8, 2),
  at(8, 5),
  at(11, 5),
  at(5, 8),
];

class MemoryStorage {
  readonly values: Map<string, string>;
  constructor(entries: readonly (readonly [string, string])[]) {
    this.values = new Map(entries);
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function unlocks(
  events: readonly DomainEventV7[],
): readonly { playerId: number; achievement: AchievementIdV7 }[] {
  return events.flatMap((event) =>
    event.kind === "ACHIEVEMENT_UNLOCKED"
      ? [{ playerId: event.playerId, achievement: event.achievement }]
      : [],
  );
}

function entitlement(
  state: GameStateV7,
  seat: number,
  achievement: AchievementIdV7,
): { readonly unlocked: boolean; readonly spent: boolean } {
  const found = state.players
    .find((player) => player.seat === seat)
    ?.achievementEntitlements.find((item) => item.achievement === achievement);
  if (found === undefined) throw new Error("entitlement missing");
  return { unlocked: found.unlocked, spent: found.spent };
}

function progress(
  state: GameStateV7,
  seat: number,
  achievement: AchievementIdV7,
): unknown {
  return viewForV7(state, seatIdV7(state, seat)).achievementProgress.find(
    (item) => item.achievement === achievement,
  );
}

function capture(
  state: GameStateV7,
  where: CoordV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const unit = unitAtV7(state, where);
  return applyOkV7(state, unit.ownerId, { kind: "CAPTURE", unitId: unit.id });
}

const capturer = (seat: number, where: CoordV7) =>
  ({ seat, role: "FIGHTER", at: where, captureEligible: true }) as const;

// The Martian revision (`pulp_wars-t6s.2`) bumped the identity to 7r22, the
// revision-20 balance bead (`pulp_wars-0hi.3`) to 7r23, and the Ice Folk
// revision (`pulp_wars-7g3.3`) to 7r24; the current identity is pinned in
// ruleset-v7-ice-folk-identity.test.ts. These tests keep the
// revision-21 facts that still hold: 7r21 and 7r20 are prior identities,
// their save keys are obsolete, and the release contract runs this suite.
describe("ruleset-7 revision-21 identity", () => {
  it("keeps 7r20 and 7r21 as prior identities after the later bumps", () => {
    expect(RULESET_7.id).toBe(RULESET_7_ID);
    expect(RULESET_7.version).toBe(7);
    const prior: readonly string[] = PRIOR_RULESET_7_IDS;
    const at = prior.indexOf("pulp-wars-poc-7r20");
    expect(prior.slice(at, at + 3)).toEqual([
      "pulp-wars-poc-7r20",
      "pulp-wars-poc-7r21",
      "pulp-wars-poc-7r22",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    const obsolete: readonly string[] = OBSOLETE_SAVE_STORAGE_KEYS_V7;
    const key = obsolete.indexOf("pulpWars.save.v7r20.current");
    expect(obsolete.slice(key, key + 3)).toEqual([
      "pulpWars.save.v7r20.current",
      "pulpWars.save.v7r21.current",
      "pulpWars.save.v7r22.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("cleans the obsolete keys through v7r21 and preserves everything else", () => {
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r20.current", "r20"],
      ["pulpWars.save.v7r21.current", "r21"],
      [SAVE_STORAGE_KEY_V7, "current"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.artSet.v1", "art"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [
        "pulpWars.save.v7r20.current",
        "pulpWars.save.v7r21.current",
      ],
      removedCount: 2,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
      "pulpWars.artSet.v1",
      "pulpWars.unrelated",
    ]);
  });

  it.each(["pulp-wars-poc-7r20", "pulp-wars-poc-7r21"])(
    "rejects %s setups, states, replays, and saves without migration",
    (oldId) => {
      const setup = goblinSetupV7(["DINOSAUR", "ORIGINAL"]);
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      expect(created.state.rulesetId).toBe(RULESET_7_ID);
      const oldSetup = { ...setup, rulesetId: oldId };
      expect(parseMatchSetupV7(setup)).not.toBeNull();
      expect(parseMatchSetupV7(oldSetup)).toBeNull();
      expect(
        parseGameStateV7({
          ...created.state,
          rulesetId: oldId,
          setup: oldSetup,
        }),
      ).toBeNull();
      const oldReplay = {
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      };
      expect(parseReplayFileV7(oldReplay)).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
      expect(() => runReplayV7(oldReplay)).toThrow(
        expect.objectContaining({ code: "INCOMPATIBLE_REPLAY" }),
      );
      const save = createSaveEnvelopeV7(
        { state: created.state, replay: createReplayV7(setup) },
        "2026-10-02T12:00:00.000Z",
      );
      expect(parseSaveV7(JSON.stringify(save))).toMatchObject({
        kind: "VALID",
      });
      expect(
        parseSaveV7(
          JSON.stringify({
            ...save,
            rulesetId: oldId,
            setup: oldSetup,
            state: { ...save.state, rulesetId: oldId },
          }),
        ),
      ).toMatchObject({ kind: "INCOMPATIBLE" });
    },
  );

  it("keeps the revision-21 suite in the release contract, and the scripts name no prior identity", () => {
    const read = (file: string): string =>
      readFileSync(join(import.meta.dirname, "..", "..", file), "utf8");
    const release = read("scripts/validate-ruleset7-current-release.ts");
    expect(release).toContain(`RULESET_7_ID !== "${RULESET_7_ID}"`);
    expect(release).toContain(SAVE_STORAGE_KEY_V7);
    expect(release).toContain(
      "tests/unit/ruleset-v7-revision21-achievements.test.ts",
    );
    expect(release).toContain("tests/unit/ruleset-v7-martian-faction.test.ts");
    const smoke = read("scripts/browser-smoke-v7.ts");
    expect(smoke).toContain(SAVE_STORAGE_KEY_V7);
    expect(smoke).toContain("'pulpWars.save.v7r20.current', 'old-v7r20-bytes'");
    expect(smoke).toContain("keys.oldV7r20 !== null");
    expect(smoke).toContain("'pulpWars.save.v7r21.current', 'old-v7r21-bytes'");
    expect(smoke).toContain("keys.oldV7r21 !== null");
    expect(read("scripts/browser-smoke-v7-contract.ts")).toContain(
      RULESET_7_ID,
    );
    for (const file of [
      "scripts/browser-smoke-v7.ts",
      "scripts/browser-naval-smoke-v7.ts",
      "scripts/browser-smoke-v7-contract.ts",
      "scripts/browser-dinosaur-review-v7.ts",
      "scripts/validate-ruleset7-current-release.ts",
      "scripts/validate-ruleset7-biome.ts",
      "src/headless/cli.ts",
      "src/headless/v7.ts",
    ]) {
      expect(read(file), file).not.toContain("pulp-wars-poc-7r20");
      expect(read(file), file).not.toContain("pulp-wars-poc-7r21");
    }
  });
});

describe("ruleset-7 revision-21 achievement registry and schema", () => {
  it("appends the four achievements in canonical order with no enabling technology", () => {
    expect([...ACHIEVEMENT_IDS_V7]).toEqual([
      "EXPLORER",
      "ENGINEER",
      "MUSTER",
      "CONQUEROR",
      "LAND_BARON",
      "SEA_DOG",
      "SLAYER",
    ]);
    expect([...REVISION_21_ACHIEVEMENT_IDS_V7]).toEqual(
      ACHIEVEMENT_IDS_V7.slice(3),
    );
    expect(ACHIEVEMENT_REQUIRED_TECH_V7).toEqual({
      EXPLORER: "SCOUTING",
      ENGINEER: "ENGINEERING",
      MUSTER: "DRILL",
      CONQUEROR: null,
      LAND_BARON: null,
      SEA_DOG: null,
      SLAYER: null,
    });
    expect({
      CONQUEROR_CAPTURES_V7,
      LAND_BARON_CITIES_V7,
      SEA_DOG_SHIPS_V7,
      SLAYER_KILLS_V7,
    }).toEqual({
      CONQUEROR_CAPTURES_V7: 1,
      LAND_BARON_CITIES_V7: 5,
      SEA_DOG_SHIPS_V7: 3,
      SLAYER_KILLS_V7: 5,
    });
  });

  it.each(FACTIONS)(
    "starts a %s seat with seven locked entitlements and zero progress",
    (faction) => {
      const created = createPlayableGameV7(
        goblinSetupV7([faction, "ORIGINAL"]),
      );
      if (!created.ok) throw new Error(created.error.code);
      for (const player of created.state.players)
        expect(player.achievementEntitlements).toEqual(
          ACHIEVEMENT_IDS_V7.map((achievement) => ({
            achievement,
            unlocked: false,
            spent: false,
          })),
        );
      const view = viewForV7(created.state, created.state.humanPlayerId);
      expect(view.achievementProgress.slice(3)).toEqual([
        { achievement: "CONQUEROR", current: 0, required: 1 },
        { achievement: "LAND_BARON", current: 1, required: 5 },
        { achievement: "SEA_DOG", current: 0, required: 3 },
        { achievement: "SLAYER", current: 0, required: 5 },
      ]);
    },
  );

  it("rejects the revision-20 three-entry list and accepts a new unlock with no technology", () => {
    const state = fieldV7([], { techs: { 0: [], 1: [] } });
    const withEntitlements = (
      map: (
        items: GameStateV7["players"][number]["achievementEntitlements"],
      ) => unknown,
    ): unknown => ({
      ...state,
      players: state.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              achievementEntitlements: map(player.achievementEntitlements),
            }
          : player,
      ),
    });
    expect(
      parseGameStateV7(withEntitlements((items) => items.slice(0, 3))),
    ).toBeNull();
    expect(
      parseGameStateV7(
        withEntitlements((items) => [
          ...items.slice(0, 3),
          ...items.slice(3).reverse(),
        ]),
      ),
    ).toBeNull();
    for (const achievement of REVISION_21_ACHIEVEMENT_IDS_V7) {
      expect(
        parseGameStateV7(
          withEntitlements((items) =>
            items.map((item) =>
              item.achievement === achievement
                ? { ...item, unlocked: true }
                : item,
            ),
          ),
        ),
      ).not.toBeNull();
      expect(
        parseGameStateV7(
          withEntitlements((items) =>
            items.map((item) =>
              item.achievement === achievement
                ? { ...item, unlocked: false, spent: true }
                : item,
            ),
          ),
        ),
      ).toBeNull();
    }
    // The revision-5 achievements keep their enabling technology.
    expect(
      parseGameStateV7(
        withEntitlements((items) =>
          items.map((item) =>
            item.achievement === "MUSTER" ? { ...item, unlocked: true } : item,
          ),
        ),
      ),
    ).toBeNull();
  });

  it("parses the new ids in commands and events and rejects unknown ones", () => {
    for (const achievement of REVISION_21_ACHIEVEMENT_IDS_V7) {
      expect(
        parseCommandV7({ kind: "BUILD_MONUMENT", achievement, at: at(1, 1) }),
      ).toMatchObject({ ok: true });
      expect(
        parseEventV7({ kind: "ACHIEVEMENT_UNLOCKED", playerId: 1, achievement })
          .ok,
      ).toBe(true);
    }
    expect(
      parseCommandV7({
        kind: "BUILD_MONUMENT",
        achievement: "KINGSLAYER",
        at: at(1, 1),
      }),
    ).toMatchObject({ ok: false });
    expect(
      parseEventV7({
        kind: "ACHIEVEMENT_UNLOCKED",
        playerId: 1,
        achievement: "KINGSLAYER",
      }).ok,
    ).toBe(false);
  });
});

describe("ruleset-7 revision-21 Conqueror", () => {
  it.each(FACTIONS)(
    "unlocks for %s on the first capture of another player's city, once, with no technology",
    (faction) => {
      const state = fieldV7(
        [
          capturer(0, at(8, 2)),
          capturer(0, at(11, 11)),
          capturer(0, at(11, 2)),
        ],
        {
          factions: [faction, "ORIGINAL", "UNDEAD"],
          techs: { 0: [] },
        },
      );
      const human = seatIdV7(state, 0);
      expect(progress(state, 0, "CONQUEROR")).toEqual({
        achievement: "CONQUEROR",
        current: 0,
        required: 1,
      });
      // A neutral village is not another player's city.
      const village = capture(state, at(8, 2));
      expect(village.events[0]).toMatchObject({
        kind: "CITY_CAPTURED",
        from: null,
      });
      expect(unlocks(village.events)).toEqual([]);
      expect(entitlement(village.state, 0, "CONQUEROR").unlocked).toBe(false);
      // Seat 1's only city: Conqueror unlocks before the elimination events.
      const first = capture(village.state, at(11, 11));
      expect(unlocks(first.events)).toEqual([
        { playerId: human, achievement: "CONQUEROR" },
      ]);
      const kinds = first.events.map((event) => event.kind);
      expect(kinds.indexOf("ACHIEVEMENT_UNLOCKED")).toBeGreaterThan(
        kinds.indexOf("CITY_CAPTURED"),
      );
      expect(kinds.indexOf("ACHIEVEMENT_UNLOCKED")).toBeLessThan(
        kinds.indexOf("PLAYER_ELIMINATED"),
      );
      expect(entitlement(first.state, 0, "CONQUEROR")).toEqual({
        unlocked: true,
        spent: false,
      });
      expect(progress(first.state, 0, "CONQUEROR")).toEqual({
        achievement: "CONQUEROR",
        current: 1,
        required: 1,
      });
      expect(parseGameStateV7(JSON.parse(JSON.stringify(first.state)))).toEqual(
        first.state,
      );
      // A second hostile capture (which also wins the match) does not repeat.
      const second = capture(first.state, at(11, 2));
      expect(unlocks(second.events)).toEqual([]);
      expect(second.events.some((event) => event.kind === "MATCH_ENDED")).toBe(
        true,
      );
      expect(entitlement(second.state, 0, "CONQUEROR").unlocked).toBe(true);
    },
  );

  it("unlocks for an AI seat, and only its owner sees the event", () => {
    const state = fieldV7([capturer(1, at(11, 2))], {
      factions: ["ORIGINAL", "GOBLIN", "UNDEAD"],
      activeSeat: 1,
    });
    const ai = seatIdV7(state, 1);
    const result = capture(state, at(11, 2));
    expect(unlocks(result.events)).toEqual([
      { playerId: ai, achievement: "CONQUEROR" },
    ]);
    expect(entitlement(result.state, 1, "CONQUEROR").unlocked).toBe(true);
    expect(entitlement(result.state, 0, "CONQUEROR").unlocked).toBe(false);
    const forHuman = projectEventsV7(
      state,
      result.state,
      seatIdV7(state, 0),
      result.events,
    );
    expect(
      forHuman.events.some((event) => event.kind === "ACHIEVEMENT_UNLOCKED"),
    ).toBe(false);
    const forOwner = projectEventsV7(state, result.state, ai, result.events);
    expect(
      forOwner.events.filter((event) => event.kind === "ACHIEVEMENT_UNLOCKED"),
    ).toEqual([
      { kind: "ACHIEVEMENT_UNLOCKED", playerId: ai, achievement: "CONQUEROR" },
    ]);
    // Opponents see neither the entitlement nor the progress of a seat.
    const humanView = viewForV7(result.state, seatIdV7(state, 0));
    expect(
      humanView.players.every(
        (player) => !("achievementEntitlements" in player),
      ),
    ).toBe(true);
    expect(humanView.achievementProgress[3]).toEqual({
      achievement: "CONQUEROR",
      current: 0,
      required: 1,
    });
  });

  it("funds exactly one Monument, like every other entitlement", () => {
    const state = fieldV7([capturer(0, at(11, 11))], {
      factions: ["ORIGINAL", "ORIGINAL", "UNDEAD"],
    });
    const human = seatIdV7(state, 0);
    expect(
      queryPlayerCommandsV7(state, human).some(
        (command) =>
          command.kind === "BUILD_MONUMENT" &&
          command.achievement === "CONQUEROR",
      ),
    ).toBe(false);
    const captured = capture(state, at(11, 11)).state;
    const offers = queryPlayerCommandsV7(captured, human).filter(
      (command) =>
        command.kind === "BUILD_MONUMENT" &&
        command.achievement === "CONQUEROR",
    );
    expect(offers.length).toBeGreaterThan(0);
    const build = offers[0];
    if (build?.kind !== "BUILD_MONUMENT") throw new Error("offer missing");
    const built = applyOkV7(captured, human, build);
    expect(built.events).toContainEqual(
      expect.objectContaining({
        kind: "MONUMENT_BUILT",
        achievement: "CONQUEROR",
        populationAdded: 3,
      }),
    );
    expect(entitlement(built.state, 0, "CONQUEROR")).toEqual({
      unlocked: true,
      spent: true,
    });
    expect(
      queryPlayerCommandsV7(built.state, human).some(
        (command) =>
          command.kind === "BUILD_MONUMENT" &&
          command.achievement === "CONQUEROR",
      ),
    ).toBe(false);
    // A tile of the seat's other city (one Monument per city).
    const cityAt = (where: CoordV7) =>
      captured.board.tiles.find(
        (tile) => tile.at.x === where.x && tile.at.y === where.y,
      )?.territoryCityId;
    const other = offers.find(
      (command) =>
        command.kind === "BUILD_MONUMENT" &&
        cityAt(command.at) !== cityAt(build.at),
    );
    if (other === undefined) throw new Error("second city tile missing");
    // The Monument's +3 population may raise a city reward choice first.
    let settled = built.state;
    for (;;) {
      const choice = queryPlayerCommandsV7(settled, human).find(
        (command) => command.kind === "CHOOSE_CITY_REWARD",
      );
      if (choice === undefined) break;
      settled = applyOkV7(settled, human, choice).state;
    }
    const again = applyCommandV7(settled, human, other);
    expect(again.accepted).toBe(false);
    if (!again.accepted)
      expect(again.error.code).toBe("ACHIEVEMENT_ENTITLEMENT_SPENT");
    expect(parseGameStateV7(JSON.parse(JSON.stringify(built.state)))).toEqual(
      built.state,
    );
  });
});

describe("ruleset-7 revision-21 Land Baron", () => {
  it.each(FACTIONS)(
    "unlocks for %s at the exact fourth-to-fifth city crossing, once",
    (faction) => {
      let state = fieldV7(
        VILLAGES_3.map((where) => capturer(0, where)),
        {
          factions: [faction, "ORIGINAL", "UNDEAD"],
          techs: { 0: [] },
        },
      );
      const human = seatIdV7(state, 0);
      for (const [index, where] of VILLAGES_3.entries()) {
        expect(progress(state, 0, "LAND_BARON")).toEqual({
          achievement: "LAND_BARON",
          current: index + 1,
          required: 5,
        });
        const result = capture(state, where);
        expect(unlocks(result.events)).toEqual(
          index === 3 ? [{ playerId: human, achievement: "LAND_BARON" }] : [],
        );
        state = result.state;
      }
      expect(entitlement(state, 0, "LAND_BARON").unlocked).toBe(true);
      expect(progress(state, 0, "LAND_BARON")).toMatchObject({ current: 5 });
      const cycle = endTurnUntilV7(state, human);
      expect(unlocks(cycle.events)).toEqual([]);
    },
  );

  it("unlocks Conqueror then Land Baron in canonical order in one capture", () => {
    let state = fieldV7(
      [
        ...VILLAGES_3.slice(0, 3).map((where) => capturer(0, where)),
        capturer(0, at(11, 11)),
      ],
      { factions: ["DINOSAUR", "ORIGINAL", "GOBLIN"] },
    );
    const human = seatIdV7(state, 0);
    for (const where of VILLAGES_3.slice(0, 3))
      state = capture(state, where).state;
    const result = capture(state, at(11, 11));
    expect(unlocks(result.events)).toEqual([
      { playerId: human, achievement: "CONQUEROR" },
      { playerId: human, achievement: "LAND_BARON" },
    ]);
  });

  it("stays unlocked after a city is lost", () => {
    let state = fieldV7(
      [
        ...VILLAGES_3.map((where) => capturer(0, where)),
        { seat: 1, role: "FIGHTER", at: at(7, 5) },
      ],
      { factions: ["ORIGINAL", "ORIGINAL", "UNDEAD"] },
    );
    for (const where of VILLAGES_3) state = capture(state, where).state;
    const lost = checkedV7({
      ...state,
      cities: state.cities.map((city) =>
        city.at.x === 8 && city.at.y === 5
          ? { ...city, ownerId: seatIdV7(state, 1) }
          : city,
      ),
      units: state.units.map((unit) =>
        unit.homeCityId ===
        state.cities.find((city) => city.at.x === 8 && city.at.y === 5)?.id
          ? { ...unit, homeCityId: null }
          : unit,
      ),
    });
    expect(progress(lost, 0, "LAND_BARON")).toMatchObject({ current: 4 });
    expect(entitlement(lost, 0, "LAND_BARON").unlocked).toBe(true);
  });
});

describe("ruleset-7 revision-21 Sea Dog", () => {
  const water = [at(4, 1), at(5, 1), at(6, 1), at(7, 1)];
  const ships = (count: number, embarked: boolean) => [
    ...(
      [
        { seat: 0, role: "PATROL_BOAT", at: at(4, 1), form: "NAVAL" },
        { seat: 0, role: "BATTLESHIP", at: at(5, 1), form: "NAVAL" },
        { seat: 0, role: "PATROL_BOAT", at: at(6, 1), form: "NAVAL" },
      ] as const
    ).slice(0, count),
    ...(embarked
      ? [{ seat: 0, role: "FIGHTER", at: at(7, 1), form: "EMBARKED" } as const]
      : []),
  ];

  it.each(FACTIONS)(
    "unlocks for %s with three naval units at its Start Turn, once",
    (faction) => {
      const state = fieldV7(ships(3, false), {
        factions: [faction, "ORIGINAL"],
        water,
        techs: { 0: [] },
      });
      const human = seatIdV7(state, 0);
      expect(progress(state, 0, "SEA_DOG")).toEqual({
        achievement: "SEA_DOG",
        current: 3,
        required: 3,
      });
      expect(entitlement(state, 0, "SEA_DOG").unlocked).toBe(false);
      const cycle = endTurnUntilV7(state, human);
      expect(unlocks(cycle.events)).toEqual([
        { playerId: human, achievement: "SEA_DOG" },
      ]);
      expect(entitlement(cycle.state, 0, "SEA_DOG").unlocked).toBe(true);
      expect(unlocks(endTurnUntilV7(cycle.state, human).events)).toEqual([]);
    },
  );

  it("does not count an embarked land unit as a ship", () => {
    const state = fieldV7(ships(2, true), { water });
    const human = seatIdV7(state, 0);
    expect(progress(state, 0, "SEA_DOG")).toMatchObject({ current: 2 });
    const cycle = endTurnUntilV7(state, human);
    expect(unlocks(cycle.events)).toEqual([]);
    expect(entitlement(cycle.state, 0, "SEA_DOG").unlocked).toBe(false);
  });
});

describe("ruleset-7 revision-21 Slayer", () => {
  const duel = (faction: FactionIdV7, kills: number, activeSeat = 0) =>
    withKillsV7(
      fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
        ],
        { factions: [faction, "ORIGINAL"], techs: { 0: [] }, activeSeat },
      ),
      at(5, 3),
      kills,
    );

  it.each(FACTIONS)(
    "unlocks for %s in the attack that gives one unit its fifth kill",
    (faction) => {
      const state = duel(faction, 4);
      const human = seatIdV7(state, 0);
      expect(progress(state, 0, "SLAYER")).toEqual({
        achievement: "SLAYER",
        current: 4,
        required: 5,
      });
      const run = attackV7(state, at(5, 3), at(5, 2));
      expect(run.attacker?.kills).toBe(5);
      expect(unlocks(run.events)).toEqual([
        { playerId: human, achievement: "SLAYER" },
      ]);
      expect(entitlement(run.state, 0, "SLAYER").unlocked).toBe(true);
      expect(unlocks(endTurnUntilV7(run.state, human).events)).toEqual([]);
    },
  );

  it("does not unlock at four kills, or for kills spread over two units", () => {
    const four = attackV7(duel("ORIGINAL", 3), at(5, 3), at(5, 2));
    expect(four.attacker?.kills).toBe(4);
    expect(unlocks(four.events)).toEqual([]);
    const spread = withKillsV7(
      withKillsV7(
        fieldV7([
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(6, 3) },
        ]),
        at(5, 3),
        4,
      ),
      at(6, 3),
      4,
    );
    const human = seatIdV7(spread, 0);
    expect(progress(spread, 0, "SLAYER")).toMatchObject({ current: 4 });
    expect(unlocks(endTurnUntilV7(spread, human).events)).toEqual([]);
  });

  it("credits a retaliation kill at the owner's next Start Turn", () => {
    const state = duel("ORIGINAL", 4, 1);
    const human = seatIdV7(state, 0);
    const run = attackV7(state, at(5, 2), at(5, 3));
    expect(run.attacker).toBeUndefined();
    expect(run.target?.kills).toBe(5);
    // Only the acting seat is evaluated in a command.
    expect(unlocks(run.events)).toEqual([]);
    expect(entitlement(run.state, 0, "SLAYER").unlocked).toBe(false);
    const cycle = endTurnUntilV7(run.state, human);
    expect(unlocks(cycle.events)).toEqual([
      { playerId: human, achievement: "SLAYER" },
    ]);
  });
});

describe("ruleset-7 revision-21 persistence and telemetry", () => {
  it("round-trips a fresh save with seven entitlements", () => {
    const setup = goblinSetupV7(["DINOSAUR", "GOBLIN", "UNDEAD", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-10-02T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    expect(loaded.save.state).toEqual(created.state);
    expect(
      loaded.save.state.players.map(
        (player) => player.achievementEntitlements.length,
      ),
    ).toEqual([7, 7, 7, 7]);
  });

  it("reports the new achievements in the headless metrics", () => {
    const state = fieldV7([capturer(0, at(11, 11))], {
      factions: ["ORIGINAL", "ORIGINAL", "UNDEAD"],
    });
    const unit = unitAtV7(state, at(11, 11));
    const command = { kind: "CAPTURE", unitId: unit.id } as const;
    const result = applyOkV7(state, unit.ownerId, command);
    const metrics = collectAcceptedTelemetryV7(
      state,
      [],
      [
        {
          before: state,
          after: result.state,
          actorId: unit.ownerId,
          command,
          events: result.events,
        },
      ],
    );
    expect(Object.keys(metrics.achievements.unlockRound)).toEqual([
      ...ACHIEVEMENT_IDS_V7,
    ]);
    expect(metrics.achievements.unlockRound.CONQUEROR).toBe(result.state.round);
    expect(metrics.achievements.unlockedSeats).toMatchObject({
      CONQUEROR: 1,
      LAND_BARON: 0,
      SEA_DOG: 0,
      SLAYER: 0,
    });
    expect(metrics.achievements.progressMaximum).toMatchObject({
      CONQUEROR: 1,
      LAND_BARON: 2,
      SEA_DOG: 0,
      SLAYER: 0,
    });
  });
});
