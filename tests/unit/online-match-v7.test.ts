import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJson } from "../../src/engine/replay/canonical";
import {
  OFFERED_FACTION_IDS_V7,
  RULESET_7_ID,
} from "../../src/engine/v7/types";
import {
  buildOnlineSetupV7,
  defaultOnlineOptionsV7,
  onlineDriverUidsV7,
  onlineOptionsJsonV7,
  parseOnlineMatchV7,
  parseOnlineOptionsV7,
  parseOnlineSetupV7,
  resolveOnlineFactionsV7,
} from "../../src/online/match";
import {
  appendMoveRecordV7,
  createMatchRecordV7,
  joinMatchRecordV7,
  patchLobbyRecordV7,
  startMatchRecordV7,
} from "../../src/online/match-rules";
import {
  ROOM_CODE_ALPHABET_V7,
  generateRoomCodeV7,
  joinCodeFromSearchV7,
  normalizeRoomCodeV7,
  shareLinkV7,
} from "../../src/online/room-code";
import type { OnlineMatchRecordV7 } from "../../src/online/types";
import { onlineOptionsFixtureV7, sequenceRandomV7 } from "./online-v7.shared";

const NOW = "2026-10-29T12:00:00.000Z";
const HASH = "a".repeat(64);

function lobby(): OnlineMatchRecordV7 {
  const created = createMatchRecordV7(
    "host-uid",
    "ABCDE",
    {
      rulesetId: RULESET_7_ID,
      hostName: "Ada",
      hostPick: "ORIGINAL",
      optionsJson: onlineOptionsJsonV7(onlineOptionsFixtureV7()),
    },
    NOW,
  );
  if (!created.ok) throw new Error(created.error.code);
  return created.value;
}

describe("room codes and share links", () => {
  it("draws five letters without I and O", () => {
    expect(ROOM_CODE_ALPHABET_V7).not.toMatch(/[IO01]/);
    expect(ROOM_CODE_ALPHABET_V7).toHaveLength(24);
    expect(generateRoomCodeV7(sequenceRandomV7([0]))).toBe("AAAAA");
    expect(generateRoomCodeV7(sequenceRandomV7([0.9999]))).toBe("ZZZZZ");
    const code = generateRoomCodeV7(Math.random);
    expect(code).toMatch(/^[A-HJ-NP-Z]{5}$/);
  });

  it("normalizes typed codes and pasted links", () => {
    expect(normalizeRoomCodeV7(" abc-de ")).toBe("ABCDE");
    expect(normalizeRoomCodeV7("ABCD")).toBeNull();
    expect(normalizeRoomCodeV7("ABCDI")).toBeNull();
    expect(
      normalizeRoomCodeV7(
        "https://nadbordrozd.github.io/pulp_wars/?join=xyzab",
      ),
    ).toBe("XYZAB");
    const link = shareLinkV7(
      "https://nadbordrozd.github.io/pulp_wars/?debug=1#top",
      "QWERT",
    );
    expect(link).toBe("https://nadbordrozd.github.io/pulp_wars/?join=QWERT");
    expect(joinCodeFromSearchV7("?join=qwert")).toBe("QWERT");
    expect(joinCodeFromSearchV7("?other=1")).toBeNull();
  });
});

describe("faction picks", () => {
  it("is deterministic in the seed and keeps chosen factions", () => {
    const first = resolveOnlineFactionsV7(42, ["RANDOM", "GOBLIN"], 3);
    const again = resolveOnlineFactionsV7(42, ["RANDOM", "GOBLIN"], 3);
    expect(first).toEqual(again);
    if (!first.ok) throw new Error(first.code);
    expect(first.factions).toHaveLength(5);
    expect(first.factions[1]).toBe("GOBLIN");
    expect(new Set(first.factions).size).toBe(5);
    expect(
      first.factions.every((faction) =>
        OFFERED_FACTION_IDS_V7.includes(faction),
      ),
    ).toBe(true);
    // Other seeds draw other factions (some of 20 seeds differ).
    const draws = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        JSON.stringify(resolveOnlineFactionsV7(seed, ["RANDOM", "RANDOM"], 2)),
      ),
    );
    expect(draws.size).toBeGreaterThan(5);
  });

  it("never lets a random seat take a chosen faction", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const result = resolveOnlineFactionsV7(seed, ["RANDOM", "CULT"], 6);
      if (!result.ok) throw new Error(result.code);
      expect(result.factions.indexOf("CULT")).toBe(1);
      expect(new Set(result.factions).size).toBe(8);
    }
  });

  it("refuses the same faction twice and too few factions", () => {
    expect(resolveOnlineFactionsV7(1, ["DWARF", "DWARF"], 0)).toEqual({
      ok: false,
      code: "DUPLICATE_PICK",
    });
    expect(
      resolveOnlineFactionsV7(1, ["RANDOM", "RANDOM"], 1, [
        "ORIGINAL",
        "UNDEAD",
      ]),
    ).toEqual({ ok: false, code: "NOT_ENOUGH_FACTIONS" });
    expect(resolveOnlineFactionsV7(1, ["ELVES" as never, "RANDOM"], 0)).toEqual(
      { ok: false, code: "INVALID_PICK" },
    );
  });
});

describe("online options and setup", () => {
  it("defaults to the skirmish defaults", () => {
    const options = defaultOnlineOptionsV7(5);
    expect(options).toMatchObject({
      mapType: "CONTINENTS",
      aiSeats: 0,
      aiMode: "RIVAL",
      difficulty: "NORMAL",
      gameMode: "DOMINATION",
      curiosities: true,
    });
    expect(parseOnlineOptionsV7(onlineOptionsJsonV7(options))).toEqual(options);
    expect(parseOnlineOptionsV7("{}")).toBeNull();
    expect(
      parseOnlineOptionsV7(onlineOptionsJsonV7({ ...options, aiSeats: 8 })),
    ).toBeNull();
  });

  it("builds a valid two-human setup that round-trips through JSON", () => {
    const built = buildOnlineSetupV7(
      onlineOptionsFixtureV7(9, 2, { difficulty: "HARDER", width: 14 }),
      "RANDOM",
      "RANDOM",
    );
    if (!built.ok) throw new Error(built.code);
    expect(built.setup.humanSeats).toEqual([0, 1]);
    expect(built.setup.aiCount).toBe(3);
    expect(built.setup.factions).toHaveLength(4);
    expect(built.setup.aiDifficulty).toBe("HARDER");
    expect(built.setup.aiHeadStart).toBeDefined();
    expect(parseOnlineSetupV7(canonicalJson(built.setup))).toEqual(built.setup);
    // A solo setup is not an online one.
    expect(
      parseOnlineSetupV7(canonicalJson({ ...built.setup, humanSeats: [0, 2] })),
    ).toBeNull();
    // Two humans alone are Normal, whatever the AI difficulty says.
    const duel = buildOnlineSetupV7(
      onlineOptionsFixtureV7(9, 0, { difficulty: "BRUTAL" }),
      "ORIGINAL",
      "UNDEAD",
    );
    expect(duel.ok && duel.setup.aiDifficulty).toBe("NORMAL");
    expect(duel.ok && duel.setup.aiHeadStart).toBeUndefined();
    expect(
      buildOnlineSetupV7(onlineOptionsFixtureV7(), "UNDEAD", "UNDEAD"),
    ).toEqual({ ok: false, code: "DUPLICATE_PICK" });
  });

  it("names the host as the driver of every seat but the guest's", () => {
    expect(onlineDriverUidsV7({ aiCount: 3 }, "h", "g")).toEqual([
      "h",
      "g",
      "h",
      "h",
    ]);
  });

  it("parses a record into seats, options and the setup", () => {
    const record = lobby();
    const match = parseOnlineMatchV7(record);
    expect(match.compatible).toBe(true);
    expect(match.seats[0]).toEqual({
      seat: 0,
      uid: "host-uid",
      name: "Ada",
      pick: "ORIGINAL",
      ready: true,
    });
    expect(match.seats[1].uid).toBe("");
    expect(match.options).toEqual(onlineOptionsFixtureV7());
    expect(match.setup).toBeNull();
    const old = parseOnlineMatchV7({
      ...record,
      rulesetId: "pulp-wars-poc-7r119",
    });
    expect(old.compatible).toBe(false);
    expect(old.options).toBeNull();
  });
});

describe("the match rules (mirror of firebase/firestore.rules)", () => {
  it("creates only well-formed lobbies", () => {
    expect(lobby()).toMatchObject({
      status: "LOBBY",
      guestUid: "",
      moveCount: 0,
      driverUids: [],
    });
    expect(
      createMatchRecordV7(
        "u",
        "ABCDI",
        {
          rulesetId: RULESET_7_ID,
          hostName: "Ada",
          hostPick: "RANDOM",
          optionsJson: "{}",
        },
        NOW,
      ).ok,
    ).toBe(false);
    expect(
      createMatchRecordV7(
        "u",
        "ABCDE",
        {
          rulesetId: RULESET_7_ID,
          hostName: "",
          hostPick: "RANDOM",
          optionsJson: "{}",
        },
        NOW,
      ).ok,
    ).toBe(false);
  });

  it("lets a guest take the free seat once, never the host", () => {
    const record = lobby();
    const input = { name: "Bo", pick: "RANDOM", ready: true };
    const joined = joinMatchRecordV7("guest-uid", record, input, NOW);
    if (!joined.ok) throw new Error(joined.error.code);
    expect(joined.value.guestUid).toBe("guest-uid");
    const second = joinMatchRecordV7("third", joined.value, input, NOW);
    expect(!second.ok && second.error.code).toBe("SEAT_TAKEN");
    const host = joinMatchRecordV7("host-uid", record, input, NOW);
    expect(!host.ok && host.error.code).toBe("FORBIDDEN");
  });

  it("lets each side edit only its own seat", () => {
    const joined = joinMatchRecordV7(
      "guest-uid",
      lobby(),
      { name: "Bo", pick: "RANDOM", ready: false },
      NOW,
    );
    if (!joined.ok) throw new Error(joined.error.code);
    expect(
      patchLobbyRecordV7("guest-uid", joined.value, { guestReady: true }, NOW)
        .ok,
    ).toBe(true);
    expect(
      patchLobbyRecordV7("guest-uid", joined.value, { hostPick: "CULT" }, NOW)
        .ok,
    ).toBe(false);
    expect(
      patchLobbyRecordV7("host-uid", joined.value, { guestPick: "CULT" }, NOW)
        .ok,
    ).toBe(false);
    expect(
      patchLobbyRecordV7("stranger", joined.value, { guestReady: true }, NOW)
        .ok,
    ).toBe(false);
    const left = patchLobbyRecordV7(
      "guest-uid",
      joined.value,
      { leaveSeat: true },
      NOW,
    );
    expect(left.ok && left.value.guestUid).toBe("");
  });

  it("starts only for the host with a seated guest and sane drivers", () => {
    const record = lobby();
    const input = {
      setupJson: "{}",
      driverUids: ["host-uid", "guest-uid", "host-uid"],
      turnSeat: 2,
    };
    expect(startMatchRecordV7("host-uid", record, input, NOW).ok).toBe(false);
    const joined = joinMatchRecordV7(
      "guest-uid",
      record,
      { name: "Bo", pick: "RANDOM", ready: true },
      NOW,
    );
    if (!joined.ok) throw new Error(joined.error.code);
    expect(startMatchRecordV7("guest-uid", joined.value, input, NOW).ok).toBe(
      false,
    );
    expect(
      startMatchRecordV7(
        "host-uid",
        joined.value,
        { ...input, driverUids: ["host-uid", "someone", "host-uid"] },
        NOW,
      ).ok,
    ).toBe(false);
    const started = startMatchRecordV7("host-uid", joined.value, input, NOW);
    expect(started.ok && started.value.status).toBe("ACTIVE");
  });

  it("appends only the next index, by the driver of the seat to move", () => {
    const active: OnlineMatchRecordV7 = {
      ...lobby(),
      status: "ACTIVE",
      guestUid: "guest-uid",
      guestName: "Bo",
      setupJson: "{}",
      driverUids: ["host-uid", "guest-uid", "host-uid"],
      moveCount: 4,
      turnSeat: 2,
    };
    const move = {
      index: 4,
      seat: 2,
      commandJson: '{"kind":"END_TURN"}',
      stateHash: HASH,
      nextTurnSeat: 0,
      finished: false,
    };
    const ok = appendMoveRecordV7("host-uid", active, move, false, NOW);
    expect(ok.ok && ok.value.match).toMatchObject({
      moveCount: 5,
      turnSeat: 0,
    });
    const code = (result: ReturnType<typeof appendMoveRecordV7>) =>
      result.ok ? "OK" : result.error.code;
    expect(
      code(appendMoveRecordV7("guest-uid", active, move, false, NOW)),
    ).toBe("FORBIDDEN");
    expect(
      code(
        appendMoveRecordV7(
          "host-uid",
          active,
          { ...move, index: 3 },
          false,
          NOW,
        ),
      ),
    ).toBe("INDEX_TAKEN");
    expect(code(appendMoveRecordV7("host-uid", active, move, true, NOW))).toBe(
      "INDEX_TAKEN",
    );
    expect(
      code(
        appendMoveRecordV7(
          "host-uid",
          active,
          { ...move, seat: 0 },
          false,
          NOW,
        ),
      ),
    ).toBe("FORBIDDEN");
    expect(
      code(
        appendMoveRecordV7(
          "host-uid",
          active,
          { ...move, stateHash: "nope" },
          false,
          NOW,
        ),
      ),
    ).toBe("INVALID");
    const finished = appendMoveRecordV7(
      "host-uid",
      active,
      { ...move, finished: true },
      false,
      NOW,
    );
    expect(finished.ok && finished.value.match.status).toBe("FINISHED");
  });
});

describe("firebase/firestore.rules for matches", () => {
  const rules = readFileSync("firebase/firestore.rules", "utf8");
  const block = rules.slice(rules.indexOf("match /matches/{code} {"));

  it("guards matches and moves: signed in, no listing, no deletes", () => {
    expect(block).toContain("allow get: if signedIn();");
    expect(block.match(/allow list: if false;/g)).toHaveLength(2);
    expect(block).toContain("allow delete: if false;");
    expect(block).toContain("allow update, delete: if false;");
    expect(rules).toContain("match /moves/{index} {");
    expect(rules).toContain("request.auth != null");
  });

  it("holds the client's patterns and limits", () => {
    expect(rules).toContain("code.matches('^[A-HJ-NP-Z]{5}$')");
    expect(rules).toContain("isJson(data.optionsJson, 2000)");
    expect(rules).toContain("isJson(after.setupJson, 8000)");
    expect(rules).toContain("isJson(data.commandJson, 4000)");
    expect(rules).toContain("after.driverUids.size() <= 9");
    // A move moves the count on in the same commit.
    expect(rules).toContain("after.moveCount == game.moveCount + 1");
    expect(rules).toContain(
      "existsAfter(/databases/$(database)/documents/matches/$(code)/moves/$(string(before.moveCount)))",
    );
    // Every field the client writes on create is one the rules expect.
    for (const field of [
      "code",
      "rulesetId",
      "status",
      "hostUid",
      "hostName",
      "hostPick",
      "guestUid",
      "guestName",
      "guestPick",
      "guestReady",
      "optionsJson",
      "setupJson",
      "driverUids",
      "moveCount",
      "turnSeat",
      "createdAt",
      "updatedAt",
    ])
      expect(rules).toContain(`'${field}'`);
  });
});
