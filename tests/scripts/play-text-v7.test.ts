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
import {
  TEXT_PLAY_LABS_V7,
  runTextPlayV7,
  textPlayCommandIdV7,
} from "../../scripts/play-text-v7";

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
    expect(tech).toContain(
      "Each city linked by Road to another of your cities: +1 Coin each turn",
    );
    expect(tech).toContain(
      "Build Field Defense: +2 Defense for the unit on it; the builder keeps its move and attack",
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

  // Tuning 2 (`pulp_wars-w49.3`, 7r47).
  it("says whether an attack advances, and how land trade stands", () => {
    const duel = (name: string, role: "FIGHTER" | "MARKSMAN"): string => {
      const session = newSession(name);
      patchState(session, (state) => {
        const mine = state.units.find(
          (unit) => unit.ownerId === state.humanPlayerId,
        );
        if (mine === undefined) throw new Error("no unit");
        return {
          ...state,
          players: state.players.map((player) =>
            player.id === state.humanPlayerId
              ? { ...player, researchedTechs: [...TECHNOLOGY_IDS_V7] }
              : player,
          ),
          // The other seat's unit, at 1 HP, right above the seat's unit.
          units: state.units.map((unit) =>
            unit.id === mine.id
              ? { ...unit, role }
              : { ...unit, hp: 1, at: { x: mine.at.x, y: mine.at.y - 1 } },
          ),
        };
      });
      return session;
    };
    const melee = duel("advance-melee", "FIGHTER");
    const state = sessionState(melee);
    const mine = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    );
    if (mine === undefined) throw new Error("no unit");
    const attack = (session: string): string => {
      const line = ok("options", "--session", session, "--unit", `u${mine.id}`)
        .split("\n")
        .find((row) => row.startsWith(`u${mine.id}.a.`));
      if (line === undefined) throw new Error("no attack is offered");
      return line;
    };
    expect(attack(melee)).toContain("KILLS");
    expect(attack(melee)).toContain(
      `| advances to ${mine.at.x},${mine.at.y - 1}`,
    );
    const ranged = attack(duel("advance-ranged", "MARKSMAN"));
    expect(ranged).toContain("KILLS");
    expect(ranged).toContain("| stays");
    expect(ranged).not.toContain("advances");

    // Commerce researched, no second city: the capital's line says so.
    expect(ok("view", "--session", melee)).toContain(
      "   No land trade: no Road link to another of your cities",
    );
    expect(ok("view", "--session", newSession("no-commerce"))).not.toContain(
      "land trade",
    );
  });

  // Tuning 3 (`pulp_wars-w49.3`).
  it("plays a Human mirror, hires at a Market, and previews a blast", () => {
    // A mirror: Human against the Human Normal AI.
    const mirror = path.join(root, "mirror.json");
    const started = ok(
      "new",
      "--session",
      mirror,
      "--map",
      "dry-land",
      "--size",
      "11",
      "--seed",
      SEED,
      "--factions",
      "original,original",
    );
    expect(started).toContain("S0 Human (you)");
    expect(started).toContain("S1 Human (AI)");
    expect(sessionState(mirror).setup.factions).toEqual([
      "ORIGINAL",
      "ORIGINAL",
    ]);
    ok("end", "--session", mirror);
    expect(sessionState(mirror).round).toBe(2);
    expect(ok("verify", "--session", mirror)).toContain("VERIFIED");

    // Every technology, 30 Coins, a Market and a Mountain in the capital's
    // territory.
    const session = newSession("hire-blast");
    let market = { x: -1, y: -1 };
    let mountain = { x: -1, y: -1 };
    patchState(session, (state) => {
      const capital = state.cities.find(
        (city) => city.ownerId === state.humanPlayerId,
      );
      if (capital === undefined) throw new Error("no capital");
      const free = state.board.tiles.filter(
        (tile) =>
          tile.territoryCityId === capital.id &&
          tile.site === null &&
          tile.biome !== null &&
          tile.improvement === null &&
          !state.units.some(
            (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
          ),
      );
      const [first, second] = free;
      if (first === undefined || second === undefined)
        throw new Error("no two free tiles");
      market = first.at;
      mountain = second.at;
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === state.humanPlayerId
            ? { ...player, coins: 30, researchedTechs: [...TECHNOLOGY_IDS_V7] }
            : player,
        ),
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            tile.at.x === market.x && tile.at.y === market.y
              ? {
                  ...tile,
                  terrain: "GRASS" as const,
                  biome: "PLAINS" as const,
                  resource: null,
                  improvement: "MARKET" as const,
                }
              : tile.at.x === mountain.x && tile.at.y === mountain.y
                ? {
                    ...tile,
                    terrain: "MOUNTAIN" as const,
                    biome: "HIGHLANDS" as const,
                    resource: null,
                  }
                : tile,
          ),
        },
      };
    });
    const capitalId = sessionState(session).cities.find(
      (city) => city.ownerId === sessionState(session).humanPlayerId,
    )?.id;
    const hire = `c${capitalId}.hire.KNIGHT.${market.x},${market.y}`;
    const blast = `t.${mountain.x},${mountain.y}.blast_mountain`;
    const options = ok("options", "--session", session, "--all");
    const row = (id: string): string => {
      const found = options
        .split("\n")
        .find((line) => line.includes(`${id}  `));
      if (found === undefined) throw new Error(`${id} is not offered`);
      return found;
    };
    expect(row(hire)).toContain(
      `hire Knight on the Market at ${market.x},${market.y} for 14c, 1.5x its price (coins 30->16)`,
    );
    expect(row(hire)).toContain("does not use the city action");
    expect(row(blast)).toContain(
      "BLAST 5 damage on and around the tile, to your units too except the one that sets it:",
    );
    const hired = ok("do", "--session", session, hire);
    expect(hired).toContain(`OK ${hire}`);
    // The correction of the Goblin pass: a hire is not printed as TRAINED.
    expect(hired).toContain(
      `(S0 Knight) at the Market of c${capitalId} @${market.x},${market.y} for 14c`,
    );
    expect(hired).toContain("  HIRED u");
    expect(hired).not.toContain("TRAINED");
    const state = sessionState(session);
    expect(
      state.units.find(
        (unit) => unit.at.x === market.x && unit.at.y === market.y,
      ),
    ).toMatchObject({ role: "KNIGHT", ownerId: state.humanPlayerId });
    // The Market is taken for this turn, and the city action is unused.
    expect(offeredIds(session).filter((id) => id.includes(".hire."))).toEqual(
      [],
    );
    expect(ok("view", "--session", session)).toContain("action ready");
    expect(ok("do", "--session", session, blast)).toContain(`OK ${blast}`);
    const tech = ok("tech", "--session", session);
    expect(tech).toContain("Forest cover: your units in Forest defend at ×1.5");
    expect(tech).toContain("Hire: each Market hires one extra unit a turn");
  });

  // Tuning 4 (`pulp_wars-w49.3`): the staged positions and the rules the
  // harness states for them.
  it("starts every lab, offers commands in it, and replays it", () => {
    const listing = ok("lab");
    for (const lab of Object.keys(TEXT_PLAY_LABS_V7))
      expect(listing).toContain(`  ${lab}  `);
    // Tuning 6 (`pulp_wars-w49.6`): the three breakthrough labs, one per
    // attacking faction.
    const attackers: Readonly<Record<string, readonly [string, string]>> = {
      LAB_SIEGE: ["ORIGINAL", "Human"],
      LAB_BACKLINE: ["ORIGINAL", "Human"],
      LAB_LATE: ["ORIGINAL", "Human"],
      LAB_BREAKTHROUGH: ["ORIGINAL", "Human"],
      LAB_BREAKTHROUGH_GOBLIN: ["GOBLIN", "Goblin"],
      LAB_BREAKTHROUGH_UNDEAD: ["UNDEAD", "Undead"],
      // The Goblin pass (`pulp_wars-w49.12`): the player is the Goblins.
      LAB_GOBLIN_MID: ["ORIGINAL", "Human"],
      // The Undead pass (`pulp_wars-w49.13`): the player is the Undead.
      LAB_UNDEAD_MID: ["ORIGINAL", "Human"],
      // The Martian pass (`pulp_wars-w49.14`): the player is the Martians.
      LAB_MARTIAN_MID: ["ORIGINAL", "Human"],
    };
    expect(Object.keys(TEXT_PLAY_LABS_V7)).toEqual(Object.keys(attackers));
    for (const lab of Object.keys(TEXT_PLAY_LABS_V7)) {
      const [faction, name] = attackers[lab] ?? ["", ""];
      const [own, ownName] =
        lab === "LAB_GOBLIN_MID"
          ? ["GOBLIN", "Goblin"]
          : lab === "LAB_UNDEAD_MID"
            ? ["UNDEAD", "Undead"]
            : lab === "LAB_MARTIAN_MID"
              ? ["MARTIAN", "Martian"]
              : ["ORIGINAL", "Human"];
      const session = path.join(root, `${lab}.json`);
      const started = ok("lab", "--session", session, lab);
      expect(started).toContain(`LAB ${lab}:`);
      expect(started).toContain(`S0 ${ownName} (you)`);
      expect(started).toContain(`S1 ${name} (AI)`);
      expect(started).toContain("YOUR TURN");
      const state = sessionState(session);
      expect(state.setup).toMatchObject({
        mapType: "MISSION",
        factions: [own, faction],
        mission: { id: lab },
      });
      if (lab === "LAB_GOBLIN_MID") {
        // The three unit rules of the Goblin pass, on the unit lines.
        expect(started).toContain("| its bombs get no Gang Up");
        expect(started).toContain(
          "| Blast-proof: blasts and bomb splash don't hurt it",
        );
        expect(started).toContain("| Crash: can Kaboom after attacking");
        expect(started).toContain("YOU PLAY THE GOBLINS");
        // The correction of the Goblin pass: the Coins the first turn
        // opens with (the text said 20c), the rocket's Gang Up, and a
        // Kaboom preview that lists the units hit and no others (it
        // printed every unit on the board).
        expect(started).toContain("35c in hand on the first turn");
        expect(started).toContain("YOUR TURN | coins 35 |");
        expect(started).toContain("| its rockets get Gang Up +1 at most");
        const lone = state.units.find(
          (unit) => unit.role === "FIGHTER" && unit.at.x === 1,
        );
        if (lone === undefined) throw new Error("no Goblin at x 1");
        expect(
          ok("options", "--session", session, "--unit", `u${lone.id}`),
        ).toContain(
          `u${lone.id}.kaboom  kaboom | blast 5 at ${lone.at.x},${lone.at.y}: hits nobody | enemy 0 damage, 0 kills; yours 0 damage, 0 kills | this unit dies`,
        );
      }
      if (lab === "LAB_UNDEAD_MID") {
        // The Undead pass: Bones on the Skeleton lines, the Human Guard's
        // rule beside it, the Coins of the first turn, and the Vampire's
        // and the Abomination's abilities on the train and tech lines.
        expect(started).toContain("YOU PLAY THE UNDEAD");
        expect(started).toContain("35c in hand on the first turn");
        expect(started).toContain("YOUR TURN | coins 35 |");
        expect(started).toContain(
          "| Bones: Defense 3 against attacks from 2 or more tiles",
        );
        expect(started).toContain(
          "| Open to ranged: Defense 1 against attacks from 2 or more tiles",
        );
        expect(ok("view", "--session", session, "--full")).toMatch(
          /Vampire .*abilities: ATTACK, LIFESTEAL, UNANSWERED, ESCAPE/,
        );
        expect(ok("tech", "--session", session)).toMatch(
          /unit Vampire \[KNIGHT\] 9c .*abilities LIFESTEAL,UNANSWERED,ESCAPE/,
        );
        expect(ok("help")).toContain("LAB_UNDEAD_MID: the Undead");
        // The correction: Carrion on the Ghoul, the Lich's Plague behind
        // Pestilence, why a Guard strikes back hard, and the Human side as
        // it is at the start.
        expect(started).toContain(
          "| Carrion: +1 Attack against a Bitten or Plagued unit",
        );
        expect(started).toContain("| Plague needs Pestilence");
        expect(started).toContain(
          "| strikes back with its Defense 3, not its Attack",
        );
        expect(started).toContain(
          "2 Knights, 2 Guards and 5 Fighters at the start (and 30c on their first turn, which buys more)",
        );
        expect(ok("tech", "--session", session)).toMatch(/Pestilence/);
      }
      if (lab === "LAB_MARTIAN_MID") {
        // The Martian pass: the Coins of the first turn, the Force Field
        // and Heat Sinks behind their technologies on the unit lines.
        expect(started).toContain("YOU PLAY THE MARTIANS");
        expect(started).toContain("35c in hand on the first turn");
        expect(started).toContain("YOUR TURN | coins 35 |");
        expect(started).toContain("cities 5 | units 15");
        expect(started).toContain(
          "| Force Field needs Force Fields: then your units that start a turn next to it have Shield 4",
        );
        expect(started).toContain(
          "| with Heat Sinks it does not overheat (no Cooling)",
        );
        expect(ok("help")).toContain("LAB_MARTIAN_MID: the Martians");
        // The correction: the field's hold, the Brain's cooldown, Beam
        // Down from any city, where the Colossus comes from, and the
        // Martian units' own map codes.
        expect(started).toContain(
          "and at full HP one attack cannot kill them (1 HP left)",
        );
        expect(started).toContain(
          "| Psychic Command every second turn (the Brain is Cooling in between)",
        );
        expect(started).toContain(
          "| Beam Down: sets one of your units down beside itself, lifted from on or beside ANY of your city centers or from up to 2 tiles away",
        );
        expect(started).toContain(
          "giant unit: a free Colossus is offered once, as a reward of this city (your first capital) at level 5 or higher",
        );
        expect(started).toContain(
          "Martian units: Gr grunt Sa saucer RG ray gunner SP shield projector Br brain Tr tripod Mo mothership Co colossus",
        );
        expect(started).toMatch(/0Mo\|/);
        expect(started).toMatch(/0Tr\|/);
        expect(started).not.toMatch(/0Kn\|/);
        const tech = ok("tech", "--session", session);
        expect(tech).toMatch(/Force Fields/);
        expect(tech).toMatch(/Heat Sinks/);
      }
      const ids = offeredIds(session);
      expect(
        ids.some((id) => /^u\d+\.m\./.test(id)),
        lab,
      ).toBe(true);
      // One turn each way, then the replay from the setup.
      ok("end", "--session", session);
      expect(sessionState(session).round).toBe(2);
      expect(ok("verify", "--session", session)).toContain("VERIFIED");
    }
    const unknown = run("lab", "--session", path.join(root, "x.json"), "NOPE");
    expect(unknown.exitCode).toBe(1);
    expect(unknown.output).toContain("LAB_SIEGE");
  }, 120_000);

  it("groups many offers of one kind and states the tuning-4 rules in LAB_LATE", () => {
    const session = path.join(root, "late-options.json");
    const started = ok("lab", "--session", session, "LAB_LATE");
    // The view: Barracks, land trade +1, and the notes of the unit lines.
    expect(started).toContain("barracks x1: +1 unit slot(s)");
    expect(started).toContain(
      "Land trade +1: linked by Road to another of your cities",
    );
    expect(started).toContain("| cannot move and attack in the same turn");
    expect(started).toContain(
      "| Overrun: after a kill it advances onto the victim's tile and may attack again from there, with no limit",
    );
    expect(started).toContain(
      "| Slips past: enemy zones of control do not stop it",
    );
    const options = ok("options", "--session", session);
    const total = Number(/OFFERED (\d+):/.exec(options)?.[1]);
    expect(total).toBeGreaterThan(500);
    // Hundreds of offers, tens of lines: Roads, Monuments and each Market's
    // hires are one line each.
    expect(options.split("\n").length).toBeLessThan(140);
    expect(options).toMatch(/^t\.x,y\.build_road {2}x\d+ at /m);
    expect(options).toMatch(/^t\.x,y\.monument\.EXPLORER {2}x\d+ at /m);
    expect(options).toMatch(
      /^c\d+\.hire\.ROLE\.\d+,\d+ {2}x8 hire on the Market at .*KNIGHT 14c \| SWORDSMAN 8c/m,
    );
    // Every grouped offer is still an id the harness accepts.
    const road = /^t\.x,y\.build_road {2}x\d+ at (\d+,\d+)/m.exec(options)?.[1];
    expect(offeredIds(session)).toContain(`t.${road}.build_road`);
    // Tuning 5 (`pulp_wars-w49.4`) removed Drill.
    expect(ok("options", "--session", session, "--all")).not.toContain(
      ".drill",
    );
    // Research is priced by the technologies owned.
    const tech = ok("tech", "--session", session);
    expect(tech).toContain(
      "technologies 16 (each one you own makes the next 1c dearer; cities do not matter)",
    );
    // Tier 3 with 16 technologies owned: 9 + 15 (tuning 6; 39 before).
    expect(tech).toContain("T3 PLANNING | AVAILABLE 24c");
    expect(tech).toContain(
      "cmd BUILD_MARKET (6c; a Market pays 2 or 3 Coins every turn: 1, plus 1 for each family of buildings beside it (farms, timber, metal), 3 at most; needs one of your Farms, Lumber Camps, Mines or their mills next to it)",
    );
    expect(tech).toContain(
      "Pillage: destroy an enemy building under your unit for +3 Coins; a Raider may still move away afterwards",
    );
    expect(tech).toContain(
      "Forest march: none of your units stops on entering Forest",
    );
  }, 120_000);

  it("previews a blast outside the territory with its price, and warns on Ore", () => {
    const session = path.join(root, "siege-blast.json");
    ok("lab", "--session", session, "LAB_SIEGE");
    ok("do", "--session", session, "r.EXPLOSIVES", "u2.m.5,5", "--end");
    // (Explosives is the ninth technology: 16 Coins since tuning 6, so the
    // 60 Coins are back after one turn of income.)
    const blast = ok("options", "--session", session, "--tile", "6,5");
    expect(blast).toContain(
      "t.6,5.blast_mountain  blast mountain at 6,5 (mountain neutral) | cost 3c (coins 60->57; not your territory, so no population) | BLAST 5 damage on and around the tile, to your units too except the one that sets it:",
    );
    expect(blast).not.toContain("no exact public preview");
    // Three Guards; the Fighter that sets the charge is not hit (tuning 5).
    expect(blast.match(/ -5/g)).toHaveLength(3);
    expect(blast).toContain("sets the charge and is not hit");
    const done = ok("do", "--session", session, "t.6,5.blast_mountain");
    expect(done).toContain("EXPLOSION_RESOLVED");
    expect(done.match(/damage=5 shieldDamage=0/g)).toHaveLength(3);
    expect(done).toContain("FIELD_DEFENSE_DESTROYED at=7,6 reason=EXPLOSION");
    // An Ore Mountain: the line says what the blast gives up.
    patchState(session, (state) => ({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === 1 && tile.at.y === 9
            ? {
                ...tile,
                terrain: "MOUNTAIN" as const,
                biome: "HIGHLANDS" as const,
                resource: "ORE" as const,
              }
            : tile,
        ),
      },
    }));
    expect(ok("options", "--session", session, "--tile", "1,9")).toContain(
      "WARNING Ore here: blasting it gives up a Mine (+2 population)",
    );
  }, 120_000);

  // Tuning 7 (`pulp_wars-w49.10`): the defects of the round-6 hand play.
  /**
   * The seat's unit as `role`, and the other seat's units replaced by
   * `enemies` on explored Grass exactly two tiles from it.
   */
  const surrounded = (
    name: string,
    role: "FIGHTER" | "RAIDER",
    enemies: readonly ("FIGHTER" | "GUARD")[],
    activation: Partial<GameStateV7["units"][number]["activation"]> = {},
  ): { session: string; mine: number; enemyIds: number[] } => {
    const session = newSession(name);
    let mineId = 0;
    const enemyIds: number[] = [];
    patchState(session, (state) => {
      const mine = state.units.find(
        (unit) => unit.ownerId === state.humanPlayerId,
      );
      const other = state.units.find(
        (unit) => unit.ownerId !== state.humanPlayerId,
      );
      const me = state.players.find(
        (player) => player.id === state.humanPlayerId,
      );
      if (mine === undefined || other === undefined || me === undefined)
        throw new Error("no unit");
      mineId = mine.id;
      const tiles = state.board.tiles
        .filter(
          (tile) =>
            tile.terrain === "GRASS" &&
            tile.site === null &&
            Math.max(
              Math.abs(tile.at.x - mine.at.x),
              Math.abs(tile.at.y - mine.at.y),
            ) === 2 &&
            me.explored.some(
              (where) => where.x === tile.at.x && where.y === tile.at.y,
            ) &&
            !state.units.some(
              (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
            ),
        )
        .slice(0, enemies.length);
      if (tiles.length !== enemies.length) throw new Error("no room");
      const placed = enemies.map((enemyRole, index) => {
        const maxHp = effectiveRoleRuleV7(enemyRole, "UNDEAD").maxHp;
        const id = index === 0 ? other.id : state.nextEntityId + index - 1;
        enemyIds.push(id);
        return {
          ...other,
          id: id as typeof other.id,
          role: enemyRole,
          hp: maxHp,
          maxHp,
          at: (tiles[index] as (typeof tiles)[number]).at,
        };
      });
      const maxHp = effectiveRoleRuleV7(role, "ORIGINAL").maxHp;
      return {
        ...state,
        nextEntityId: (state.nextEntityId +
          enemies.length) as typeof state.nextEntityId,
        players: state.players.map((player) =>
          player.id === state.humanPlayerId
            ? { ...player, researchedTechs: [...TECHNOLOGY_IDS_V7] }
            : player,
        ),
        units: [
          {
            ...mine,
            role,
            hp: maxHp,
            maxHp,
            activation: { ...mine.activation, ...activation },
          },
          ...placed,
        ],
      };
    });
    return { session, mine: mineId, enemyIds };
  };

  it("estimates an enemy's attack by what the unit can do, and adds the worst case of all of them", () => {
    // Two Skeletons and a Zombie, each two tiles from the seat's Fighter.
    // A Skeleton moves and attacks; a Zombie cannot attack after it moved.
    const { session, mine, enemyIds } = surrounded("estimate", "FIGHTER", [
      "FIGHTER",
      "FIGHTER",
      "GUARD",
    ]);
    const own = ok("options", "--session", session, "--unit", `u${mine}`);
    expect(own).toContain(
      "ENEMY ATTACKS ON IT NEXT TURN (estimate from public information; each attacker alone, then all of them)",
    );
    const rows = own
      .split("\n")
      .filter((row) => row.includes("after moving into range"));
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row).toContain("Skeleton");
    const alone = rows.map((row) =>
      Number(/deals about (\d+)/.exec(row)?.[1] ?? "0"),
    );
    // The second hit lands on a weakened unit: more than the sum.
    const combined = /COMBINED worst case: all 2 in turn deal about (\d+)/.exec(
      own,
    );
    expect(Number(combined?.[1] ?? "0")).toBeGreaterThan(
      (alone[0] ?? 0) + (alone[1] ?? 0) - 1,
    );
    expect(own).toMatch(
      /Zombie\) @\d+,\d+: no attack on it next turn \(it cannot attack after it moves; it is 2 tiles away\)/,
    );
    // And from the Zombie's side.
    const zombie = ok(
      "options",
      "--session",
      session,
      "--unit",
      `u${enemyIds[2] ?? 0}`,
    );
    expect(zombie).toContain("WHAT IT WOULD DEAL TO YOUR UNITS NEXT TURN");
    expect(zombie).toContain("it can reach none of your units next turn");
    expect(zombie).not.toContain("after moving into range");
  });

  it("gives the reach of the Escape as the reason of a rejected Escape move", () => {
    // A Raider that has moved and attacked, with its Escape move left.
    const { session, mine } = surrounded("escape", "RAIDER", ["FIGHTER"], {
      moved: true,
      movedPathLength: 1,
      attacked: true,
      attacksUsed: 1,
      escapeAvailable: true,
    });
    const state = sessionState(session);
    const raider = state.units.find((unit) => unit.id === mine);
    if (raider === undefined) throw new Error("no Raider");
    expect(offeredIds(session).some((id) => id.startsWith(`u${mine}.m.`))).toBe(
      true,
    );
    const offered = new Set(offeredIds(session));
    const gap = (where: { x: number; y: number }): number =>
      Math.max(
        Math.abs(where.x - raider.at.x),
        Math.abs(where.y - raider.at.y),
      );
    // An explored, empty land tile the Escape does not reach.
    const far = state.board.tiles.find(
      (tile) =>
        tile.biome !== null &&
        gap(tile.at) >= 2 &&
        !offered.has(`u${mine}.m.${tile.at.x},${tile.at.y}`) &&
        (
          state.players.find((player) => player.id === state.humanPlayerId)
            ?.explored ?? []
        ).some((where) => where.x === tile.at.x && where.y === tile.at.y) &&
        !state.units.some(
          (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
        ),
    );
    if (far === undefined) throw new Error("no far tile");
    const rejected = run(
      "do",
      "--session",
      session,
      `u${mine}.m.${far.at.x},${far.at.y}`,
    );
    expect(rejected.exitCode).toBe(1);
    expect(rejected.output).toContain(
      `the Raider's Escape does not reach it (${gap(far.at)} tiles away): after its attack it may still move to `,
    );
    expect(rejected.output).not.toContain("has already moved");
  });

  it("prints a Disband, and states the labs as they are", () => {
    const { session, mine } = surrounded("disband", "FIGHTER", ["FIGHTER"]);
    const at = sessionState(session).units.find((unit) => unit.id === mine)?.at;
    expect(ok("do", "--session", session, `u${mine}.disband`)).toContain(
      `DISBANDED u${mine}(S0 Fighter) @${at?.x},${at?.y} for +1c`,
    );
    const listing = ok("lab");
    expect(listing).toContain("a walled capital two tiles back");
    expect(listing).toContain("22c in hand, every unit slot full, 12c a turn");
    expect(listing).toContain(
      "13c in its first turn, 15c in its second and 19c a turn from its third",
    );
  });

  // Tuning 8 (`pulp_wars-w49.11`).
  it("breaks a fortified Defense down, explains the Muster and Engineer counts, keeps the glyph legend, and says why no city trains", () => {
    // A Marksman's shot on a Guard on a Field Defense in the Guard's own
    // territory: the Guard is open to ranged attacks (Defense 1) and the
    // Field Defense adds two levels.
    const session = path.join(root, "tuning-8-defense.json");
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
      "original,original",
    );
    patchState(session, (state) => {
      const mine = state.units.find(
        (unit) => unit.ownerId === state.humanPlayerId,
      );
      const other = state.units.find(
        (unit) => unit.ownerId !== state.humanPlayerId,
      );
      if (mine === undefined || other === undefined) throw new Error("no unit");
      const land = (x: number, y: number): boolean =>
        state.board.tiles.some(
          (tile) =>
            tile.at.x === x &&
            tile.at.y === y &&
            (tile.terrain === "GRASS" || tile.terrain === "FOREST") &&
            tile.site === null,
        );
      // The Guard one step from its capital, the Marksman two steps on.
      const step = (
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ] as const
      ).find(
        ([dx, dy]) =>
          land(other.at.x + dx, other.at.y + dy) &&
          land(other.at.x + 3 * dx, other.at.y + 3 * dy),
      );
      if (step === undefined) throw new Error("no open line at the capital");
      const target = { x: other.at.x + step[0], y: other.at.y + step[1] };
      const stand = {
        x: other.at.x + 3 * step[0],
        y: other.at.y + 3 * step[1],
      };
      const guard = effectiveRoleRuleV7("GUARD", "ORIGINAL");
      return {
        ...state,
        players: state.players.map((player) => ({
          ...player,
          researchedTechs: [...TECHNOLOGY_IDS_V7],
          explored: state.board.tiles.map((tile) => tile.at),
        })),
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            tile.at.x === target.x && tile.at.y === target.y
              ? { ...tile, fieldDefense: true }
              : tile,
          ),
        },
        units: state.units.map((unit) =>
          unit.id === mine.id
            ? { ...unit, role: "MARKSMAN" as const, at: stand }
            : {
                ...unit,
                role: "GUARD" as const,
                hp: guard.maxHp,
                maxHp: guard.maxHp,
                at: target,
              },
        ),
      };
    });
    const state = sessionState(session);
    const mine = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    );
    if (mine === undefined) throw new Error("no unit");
    const shot = ok("options", "--session", session, "--unit", `u${mine.id}`)
      .split("\n")
      .find((row) => row.startsWith(`u${mine.id}.a.`));
    expect(shot).toContain("vs def 3 (1 open to ranged + fort 2)");

    // The ordinary view: the legend of the cell and of its marks, and what
    // the two achievements count.
    const plain = newSession("tuning-8-view");
    const view = ok("view", "--session", plain);
    expect(view).toContain("LEGEND cell = terrain feature mark owner unit");
    expect(view).toContain("  feature: C capital  c city  v neutral village");
    expect(view).not.toContain("  terrain: . grass");
    const full = ok("view", "--session", plain, "--full");
    expect(full).toContain("  terrain: . grass");
    expect(full).toMatch(
      /MUSTER \d+\/\d+ \(different unit kinds you can train that you have on the board at once; a reward-only unit does not count\)/,
    );
    expect(full).toMatch(
      /ENGINEER \d+\/\d+ \(highest output of one Windmill, Sawmill, Forge, or Workshop; Mines do not count\)/,
    );

    // The first unit stands on the capital's center: the section says why
    // nothing is offered, and so does a rejected training id.
    const reason = /nothing to train: (c\d+) center occupied/.exec(
      ok("options", "--session", plain),
    );
    if (reason === null) throw new Error("no reason is given");
    const city = reason[1] ?? "";
    const rejected = run("do", "--session", plain, `${city}.t.fighter`);
    expect(rejected.exitCode).toBe(1);
    expect(rejected.output).toContain(
      `nothing is offered for "${city}" now (center occupied)`,
    );
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
    // Tuning 6: a move id gets its reason.
    expect(bogus.output).toContain(
      "is not an offered move at state #0: no visible unit u999",
    );
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
