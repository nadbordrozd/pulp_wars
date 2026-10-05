import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  canonicalHash,
  effectiveRoleRuleV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import { runTextPlayV7, textPlayCommandIdV7 } from "../../scripts/play-text-v7";

/**
 * The text-mode play harness (`pulp_wars-w49.1`,
 * docs/validation/TEXT_PLAY.md): a scripted short session on the Dry Land
 * 11 x 11 board, Human against the Undead Normal AI.
 */
const root = mkdtempSync(path.join(tmpdir(), "text-play-v7-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const SEED = "5";

function run(...argv: string[]): { exitCode: number; output: string } {
  return runTextPlayV7(argv);
}

function ok(...argv: string[]): string {
  const result = run(...argv);
  expect(result.exitCode, result.output).toBe(0);
  return result.output;
}

function sessionState(session: string): GameStateV7 {
  const raw = JSON.parse(readFileSync(session, "utf8")) as { state: unknown };
  const state = parseGameStateV7(raw.state);
  if (state === null) throw new Error("the session state did not parse");
  return state;
}

function newSession(name: string): string {
  const session = path.join(root, `${name}.json`);
  ok(
    "new",
    "--session",
    session,
    "--map",
    "dry-land",
    "--size",
    "11",
    "--seed",
    SEED,
    "--factions",
    "original,undead",
    "--seat",
    "0",
  );
  return session;
}

/** Rewrites the stored state of a session (a constructed position). */
function patchState(
  session: string,
  change: (state: GameStateV7) => GameStateV7,
): void {
  const raw = JSON.parse(readFileSync(session, "utf8")) as Record<
    string,
    unknown
  >;
  const next = change(sessionState(session));
  expect(parseGameStateV7(JSON.parse(JSON.stringify(next)))).toEqual(next);
  // The harness checks the stored hash; `verify` (a replay from the setup)
  // would not accept a constructed position and is not used on one.
  writeFileSync(
    session,
    JSON.stringify({ ...raw, state: next, stateHash: canonicalHash(next) }),
  );
}

/** The ids `options` prints (an id starts a line, two spaces follow it). */
function offeredIds(session: string): string[] {
  const output = ok("options", "--session", session, "--all");
  return [...output.matchAll(/^\s*([a-z]\S*\.\S+) {2}/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

interface ScriptedV7 {
  readonly transcript: string[];
  readonly ids: string[];
  readonly kinds: Set<string>;
}

/**
 * Plays three rounds, choosing from what is offered: a research, a harvest,
 * a pending reward, a move, an attack when one is reachable, a training.
 */
function playScripted(session: string): ScriptedV7 {
  const transcript: string[] = [];
  const ids: string[] = [];
  const kinds = new Set<string>();
  const act = (pattern: RegExp, kind: string): boolean => {
    const id = offeredIds(session).find((candidate) => pattern.test(candidate));
    if (id === undefined) return false;
    transcript.push(ok("do", "--session", session, id));
    ids.push(id);
    kinds.add(kind);
    return true;
  };
  for (let round = 0; round < 3; round += 1) {
    act(/^r\./, "research");
    act(/^u\d+\.a\./, "attack");
    act(/^u\d+\.m\./, "move");
    act(/^c\d+\.t\./, "train");
    while (act(/^t\..*\.(harvest_fruit|hunt_game)$/, "harvest"))
      act(/^c\d+\.reward\./, "reward");
    transcript.push(ok("end", "--session", session));
    ids.push("end");
  }
  transcript.push(ok("view", "--session", session, "--full"));
  return { transcript, ids, kinds };
}

describe("text-mode play harness", () => {
  it("plays a scripted short session deterministically", () => {
    const first = newSession("first");
    const played = playScripted(first);
    expect([...played.kinds].sort()).toEqual(
      expect.arrayContaining(["harvest", "move", "research", "train"]),
    );
    expect(sessionState(first).round).toBe(4);

    // The same choices in a second session give the same text.
    const second = newSession("second");
    const again = playScripted(second);
    expect(again.ids).toEqual(played.ids);
    expect(again.transcript).toEqual(played.transcript);

    // The recorded ids replayed literally give the same view and state.
    const third = newSession("third");
    for (const id of played.ids)
      if (id === "end") ok("end", "--session", third);
      else ok("do", "--session", third, id);
    expect(canonicalHash(ok("view", "--session", third, "--full"))).toBe(
      canonicalHash(played.transcript[played.transcript.length - 1]),
    );
    expect(canonicalHash(sessionState(third))).toBe(
      canonicalHash(sessionState(first)),
    );
    expect(ok("verify", "--session", first)).toContain("VERIFIED");

    const log = ok("log", "--session", first);
    expect(log).toMatch(/^R1 coins \d+ income \+\d+/m);
    expect(log).toContain("TECH ORDER R1 ");
  });

  it("shows nothing the seat has not explored", () => {
    const session = newSession("fog");
    playScripted(session);
    const state = sessionState(session);
    const viewer = state.players.find(
      (player) => player.id === state.humanPlayerId,
    );
    if (viewer === undefined) throw new Error("the human seat is missing");
    const explored = new Set(viewer.explored.map((at) => `${at.x},${at.y}`));
    const hiddenUnits = state.units.filter(
      (unit) =>
        unit.ownerId !== viewer.id &&
        !explored.has(`${unit.at.x},${unit.at.y}`),
    );
    const hiddenCities = state.cities.filter(
      (city) =>
        city.ownerId !== viewer.id &&
        !explored.has(`${city.at.x},${city.at.y}`),
    );
    expect(hiddenUnits.length).toBeGreaterThan(0);
    expect(hiddenCities.length).toBeGreaterThan(0);
    const shown = [
      ok("view", "--session", session, "--full"),
      ok("options", "--session", session, "--all"),
      ok("tech", "--session", session),
      ok("log", "--session", session),
    ].join("\n");
    for (const unit of hiddenUnits)
      expect(shown).not.toMatch(new RegExp(`\\bu${unit.id}\\b`));
    for (const city of hiddenCities) {
      expect(shown).not.toMatch(new RegExp(`\\bc${city.id}\\b`));
      expect(shown).not.toContain(`@${city.at.x},${city.at.y}`);
    }
    // Every unexplored tile is the same opaque cell.
    const view = ok("view", "--session", session);
    expect(view.match(/\?{7}\|/g)?.length).toBe(
      state.board.tiles.length - explored.size,
    );

    // The debrief is where hidden information lives, and it says so.
    const refused = run(
      "debrief",
      "--session",
      session,
      "--out",
      path.join(root, "debrief.txt"),
    );
    expect(refused.exitCode).toBe(1);
    expect(refused.output).toContain("--reveal-hidden");
    const debrief = ok(
      "debrief",
      "--session",
      session,
      "--out",
      path.join(root, "debrief.txt"),
      "--reveal-hidden",
    );
    expect(debrief).toContain("WARNING");
    const file = readFileSync(path.join(root, "debrief.txt"), "utf8");
    expect(file).toContain("reveals hidden information");
    expect(file).toContain("SEAT S1 Undead (NORMAL AI)");
    expect(file).toContain("replay verified");
  });

  it("keeps command ids stable and tied to the offered commands", () => {
    const session = newSession("ids");
    const state = sessionState(session);
    const offered = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    );
    const ids = offered.map(textPlayCommandIdV7);
    expect(new Set(ids).size).toBe(ids.length);
    expect(offeredIds(session).sort()).toEqual(
      ids.filter((id) => id !== "end").sort(),
    );
    expect(ok("options", "--session", session, "--all")).toBe(
      ok("options", "--session", session, "--all"),
    );
    // An id names its command: the default listing gives move destinations
    // only, and the id built from one is the offered move.
    const move = ids.find((id) => /^u\d+\.m\./.test(id));
    if (move === undefined) throw new Error("no move is offered");
    expect(ok("options", "--session", session)).toContain(
      move.split(".m.")[1] ?? "",
    );
    expect(ok("do", "--session", session, move.toUpperCase())).toContain(
      `OK ${move} -> state #1`,
    );
  });

  it("ends the turn with do --end only when every id was applied", () => {
    const session = newSession("do-end");
    const move = offeredIds(session).find((id) => /^u\d+\.m\./.test(id));
    const research = offeredIds(session).find((id) => id.startsWith("r."));
    if (move === undefined || research === undefined)
      throw new Error("the opening offers a move and a research");
    // A rejected id: the earlier ids stay applied and the turn is not ended.
    const partial = run("do", "--session", session, move, move, "--end");
    expect(partial.exitCode).toBe(1);
    expect(partial.output).toContain(`OK ${move} -> state #1`);
    expect(partial.output).toContain(`REJECTED ${move}`);
    expect(partial.output).toContain("TURN NOT ENDED");
    expect(partial.output).not.toContain("END OF YOUR TURN");
    expect(sessionState(session).round).toBe(1);
    expect(sessionState(session).commandIndex).toBe(1);
    // Every id applied: the turn ends and the AI seat plays.
    const whole = run("do", "--session", session, research, "--end");
    expect(whole.exitCode, whole.output).toBe(0);
    expect(whole.output).toContain(`OK ${research} -> state #2`);
    expect(whole.output).toContain("END OF YOUR TURN (round 1)");
    expect(sessionState(session).round).toBe(2);
    expect(ok("verify", "--session", session)).toContain("VERIFIED");
  });

  it("refuses a plain end right after a do that stopped at a rejected id", () => {
    const session = newSession("end-guard");
    const [move, second] = offeredIds(session).filter((id) =>
      /^u\d+\.m\./.test(id),
    );
    const research = offeredIds(session).find((id) => id.startsWith("r."));
    if (move === undefined || research === undefined)
      throw new Error("the opening offers a move and a research");
    const partial = run("do", "--session", session, move, move, research);
    expect(partial.exitCode).toBe(1);
    expect(partial.output).toContain(`NOT EXECUTED: ${research}`);
    const refused = run("end", "--session", session);
    expect(refused.exitCode).toBe(1);
    expect(refused.output).toContain("turn NOT ended");
    expect(refused.output).toContain(`rejected id ${move}`);
    expect(refused.output).toContain(`did not execute ${research}`);
    expect(refused.output).toContain("end --force");
    expect(sessionState(session).round).toBe(1);
    // Read-only commands do not clear the guard; another do does.
    ok("view", "--session", session);
    ok("options", "--session", session);
    expect(run("end", "--session", session).exitCode).toBe(1);
    ok("do", "--session", session, research);
    expect(ok("end", "--session", session)).toContain(
      "END OF YOUR TURN (round 1)",
    );
    expect(sessionState(session).round).toBe(2);

    // --force ends the turn as it stands.
    const forced = newSession("end-force");
    const forcedMove = offeredIds(forced).find((id) => /^u\d+\.m\./.test(id));
    if (forcedMove === undefined) throw new Error("no move is offered");
    expect(run("do", "--session", forced, "u999.m.0,0").exitCode).toBe(1);
    expect(run("end", "--session", forced).exitCode).toBe(1);
    expect(ok("end", "--session", forced, "--force")).toContain(
      "END OF YOUR TURN (round 1)",
    );
    expect(sessionState(forced).round).toBe(2);
    void second;
  });

  // pulp_wars-w49.3: what two hand playtests of identity 7r46 could not
  // read from the text.
  it("states the tuning-1 unlocks, the Slayer count, and the chest unit", () => {
    const session = newSession("tuning-text");
    const tech = ok("tech", "--session", session);
    expect(tech).toContain(
      "Breach: melee attacks ignore Walls and Field Defense, and destroy Field Defense",
    );
    expect(tech).toContain("its city gains +1 population");
    expect(tech).toContain("Road-linked cities: +2 Coins each turn");
    expect(tech).toContain(
      "Build Field Defense: the builder keeps its move and attack",
    );
    expect(tech).not.toMatch(/unlocks: [^\n]*(^|; )MELEE_FIELD_DEMOLITION/m);
    expect(ok("view", "--session", session, "--full")).toContain(
      "SLAYER 0/5 (most kills by one living unit)",
    );

    // The seat's unit beside the first chest: before round 15 the Human
    // chest unit is a Raider, and the line names it (the event's reward
    // literal stays KNIGHT for every faction and round).
    const chest = sessionState(session).treasureChests[0];
    if (chest === undefined) throw new Error("the map has no chest");
    patchState(session, (state) => ({
      ...state,
      units: state.units.map((unit) =>
        unit.ownerId === state.humanPlayerId
          ? { ...unit, at: { x: chest.x, y: chest.y + 1 } }
          : unit,
      ),
    }));
    const move = offeredIds(session).find((id) =>
      id.endsWith(`.m.${chest.x},${chest.y}`),
    );
    if (move === undefined) throw new Error("the chest is not reachable");
    const output = ok("do", "--session", session, move);
    expect(output).toMatch(
      new RegExp(
        `TREASURE_CAPTURED by u\\d+\\(S0 Fighter\\) at ${chest.x},${chest.y}: granted u\\d+\\(S0 Raider\\) at \\d+,\\d+ home c\\d+`,
      ),
    );
    expect(output).not.toContain("KNIGHT");
    expect(
      sessionState(session).units.filter((unit) => unit.role === "RAIDER"),
    ).toHaveLength(1);
  });

  it("says why an attack or a Field Defense is not offered", () => {
    const withRole = (name: string, role: "GUARD" | "MARKSMAN"): string => {
      const session = newSession(name);
      const maxHp = effectiveRoleRuleV7(role, "ORIGINAL").maxHp;
      patchState(session, (state) => ({
        ...state,
        players: state.players.map((player) =>
          player.id === state.humanPlayerId
            ? {
                ...player,
                researchedTechs: [...TECHNOLOGY_IDS_V7],
              }
            : player,
        ),
        units: state.units.map((unit) =>
          unit.ownerId === state.humanPlayerId
            ? { ...unit, role, hp: maxHp, maxHp }
            : unit,
        ),
      }));
      return session;
    };
    // A Guard that has moved: both are rules, and the text says so.
    const guard = withRole("reason-guard", "GUARD");
    const move = offeredIds(guard).find((id) => /^u\d+\.m\./.test(id));
    if (move === undefined) throw new Error("no move is offered");
    const unit = move.split(".")[0] ?? "";
    expect(offeredIds(guard)).toContain(`${unit}.fortify`);
    expect(ok("options", "--session", guard, "--unit", unit)).not.toContain(
      "no fortify",
    );
    ok("do", "--session", guard, move);
    const moved = ok("options", "--session", guard, "--unit", unit);
    expect(moved).toContain(
      "no attack: a Guard cannot attack after it has moved this turn",
    );
    expect(moved).toContain("no fortify: it has moved this turn");
    // A Marksman never builds one, wherever it stands.
    const marksman = withRole("reason-marksman", "MARKSMAN");
    const text = ok("options", "--session", marksman, "--unit", unit);
    expect(text).toContain(
      "no fortify: a Marksman cannot build Field Defense (only Fighter and Guard can)",
    );
    expect(text).toContain(
      "no attack: no visible hostile unit is in its range",
    );
    expect(offeredIds(marksman)).not.toContain(`${unit}.fortify`);
  });

  it("rejects illegal and stale ids cleanly", () => {
    const session = newSession("reject");
    const before = JSON.parse(readFileSync(session, "utf8")) as Record<
      string,
      unknown
    >;
    const bogus = run("do", "--session", session, "u999.m.0,0");
    expect(bogus.exitCode).toBe(1);
    expect(bogus.output).toContain("REJECTED u999.m.0,0");
    expect(bogus.output).toContain("not an offered command at state #0");
    // Nothing of the match changed; the session only notes the rejection
    // (the guard of `end`, below).
    expect(JSON.parse(readFileSync(session, "utf8"))).toEqual({
      ...before,
      rejectedDo: { id: "u999.m.0,0", notExecuted: [] },
    });

    const move = offeredIds(session).find((id) => /^u\d+\.m\./.test(id));
    const research = offeredIds(session).find((id) => id.startsWith("r."));
    if (move === undefined || research === undefined)
      throw new Error("the opening offers a move and a research");
    // The first id is applied, the stale repeat stops the list.
    const partial = run("do", "--session", session, move, move, research);
    expect(partial.exitCode).toBe(1);
    expect(partial.output).toContain(`OK ${move} -> state #1`);
    expect(partial.output).toContain(`REJECTED ${move}`);
    expect(partial.output).toContain(`NOT EXECUTED: ${research}`);
    expect(sessionState(session).commandIndex).toBe(1);

    const stale = run("do", "--session", session, research, "--at", "0");
    expect(stale.exitCode).toBe(1);
    expect(stale.output).toContain("stale: --at 0");
    expect(run("do", "--session", session, "end").output).toContain(
      "end the turn with the end command",
    );
    expect(sessionState(session).commandIndex).toBe(1);

    // A session of another ruleset identity is refused, not misread.
    const other = path.join(root, "other-ruleset.json");
    const record = JSON.parse(readFileSync(session, "utf8")) as Record<
      string,
      unknown
    >;
    expect(record.rulesetId).toBe(RULESET_7_ID);
    writeFileSync(other, JSON.stringify({ ...record, rulesetId: "older" }));
    const old = run("view", "--session", other);
    expect(old.exitCode).toBe(1);
    expect(old.output).toContain("stale session");

    const missing = run("view", "--session", path.join(root, "none.json"));
    expect(missing.exitCode).toBe(1);
    expect(missing.output).toContain("no session file");
    expect(run("new", "--session", session).output).toContain("already exists");
    expect(
      run("new", "--session", path.join(root, "seat.json"), "--seat", "1")
        .output,
    ).toContain("--seat must be 0");
  });
});
