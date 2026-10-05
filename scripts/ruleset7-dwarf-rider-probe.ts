/**
 * The scripted rider probe of the Dwarf balance (`pulp_wars-78i.7`,
 * docs/product/RULESET_7_DWARVES.md section 19.2, root decision 9).
 *
 * The Normal AI tunnels for expansion only through an optional rule that is
 * off, so the balance matrix never sees the rider village race as a human
 * plays it. This probe plays every Dwarf-against-Human seed twice: once with
 * the plain Normal policy on both seats, and once with the Dwarf seat's
 * policy plus one scripted human-style rule for rounds 1 to 15:
 *
 * - research Drill first, and train a Mole at the first chance;
 * - whenever a Mole and an adjacent fresh Hammerer exist (the Tunnel offer
 *   names a rider tile) and a neutral village lies 4 to 8 tiles from the
 *   Hammerer, tunnel with the rider to the offered destination whose rider
 *   tile is nearest that village;
 * - then walk the rider to the village and capture it.
 *
 * It reports, per run: villages captured by riders in rounds 1 to 15 and
 * their rounds, all Dwarf village captures in rounds 1 to 15, Dwarf and
 * Human cities at round 15, the Human seat's Raider village captures and
 * their rounds, and the decided result.
 *
 * Usage:
 *   npx tsx scripts/ruleset7-dwarf-rider-probe.ts [--seeds 10] [--sizes 11,14]
 *     [--max-rounds 150] [--output file.json]
 */
import { writeFileSync } from "node:fs";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
} from "../src/ai/v7";
import type { PlayerId } from "../src/engine/model/ids";
import type { CommandV7 } from "../src/engine/v7/commands";
import { queryPlayerCommandsV7 } from "../src/engine/v7/query";
import { applyCommandV7, createPlayableGameV7 } from "../src/engine/v7/reducer";
import {
  RULESET_7_ID,
  type BoardSizeV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../src/engine/v7/types";
import { viewForV7, type PlayerViewV7 } from "../src/engine/v7/view";

const args = process.argv.slice(2);
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};
const SEEDS = Number(valueAfter("--seeds") ?? 10);
const SIZES = (valueAfter("--sizes") ?? "11,14")
  .split(",")
  .map((value) => Number(value) as BoardSizeV7);
const MAX_ROUNDS = Number(valueAfter("--max-rounds") ?? 150);
const PROBE_LAST_ROUND = 15;
/** Captures are recorded to round 20; the summary splits rounds 1-15. */
const REPORT_LAST_ROUND = 20;

const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const sameAt = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;

interface ProbeRun {
  readonly winner: FactionIdV7 | null;
  readonly rounds: number;
  readonly tunnelsWithRider: number;
  readonly riderCaptureRounds: number[];
  readonly riderTunnelRounds: number[];
  readonly moleTrainedRounds: number[];
  readonly dwarfVillageCaptureRounds: number[];
  readonly humanRaiderCaptureRounds: number[];
  readonly humanVillageCaptureRounds: number[];
  readonly dwarfCitiesRound15: number;
  readonly humanCitiesRound15: number;
  readonly scriptedCommands: number;
}

/** Neutral villages the viewer has explored (a village tile with no city). */
function neutralVillages(view: PlayerViewV7): CoordV7[] {
  return view.board.tiles.flatMap((tile) =>
    tile.explored &&
    tile.site === "VILLAGE" &&
    !view.cities.some((city) => sameAt(city.at, tile.at))
      ? [tile.at]
      : [],
  );
}

/** The scripted rule's state for one Dwarf seat. */
interface Script {
  moleTrained: boolean;
  /** Rider unit ID to its target village. */
  readonly riders: Map<number, CoordV7>;
  commands: number;
}

/** The scripted human-style command, or null to let the policy decide. */
function scriptedCommand(view: PlayerViewV7, script: Script): CommandV7 | null {
  if (view.round > PROBE_LAST_ROUND) return null;
  const offered = queryPlayerCommandsV7(view);
  const me = view.viewer.id;
  if (!view.viewer.researchedTechs.includes("DRILL")) {
    const drill = offered.find(
      (command) => command.kind === "RESEARCH" && command.tech === "DRILL",
    );
    if (drill !== undefined) return drill;
  }
  if (!script.moleTrained) {
    const mole = offered.find(
      (command) => command.kind === "TRAIN" && command.role === "GUARD",
    );
    if (mole !== undefined) {
      script.moleTrained = true;
      return mole;
    }
  }
  const villages = neutralVillages(view);
  const unitAt = new Map(view.units.map((unit) => [unit.id as number, unit]));
  // Walk the riders in and capture.
  for (const [riderId, target] of [...script.riders]) {
    const rider = unitAt.get(riderId);
    if (rider === undefined || rider.ownerId !== me) {
      if (
        rider === undefined &&
        !view.burrowed.some((item) => item.unit.id === riderId)
      )
        script.riders.delete(riderId);
      continue;
    }
    let goal = target;
    if (!villages.some((village) => sameAt(village, goal))) {
      const nearest = [...villages].sort(
        (left, right) => chebyshev(left, rider.at) - chebyshev(right, rider.at),
      )[0];
      if (nearest === undefined || chebyshev(nearest, rider.at) > 8) {
        script.riders.delete(riderId);
        continue;
      }
      goal = nearest;
      script.riders.set(riderId, goal);
    }
    const capture = offered.find(
      (command) =>
        command.kind === "CAPTURE" &&
        command.unitId === rider.id &&
        sameAt(rider.at, goal),
    );
    if (capture !== undefined) return capture;
    const moves = offered.flatMap((command) =>
      command.kind === "MOVE" && command.unitId === rider.id
        ? [{ command, end: command.path.at(-1) ?? rider.at }]
        : [],
    );
    const best = moves.sort(
      (left, right) => chebyshev(left.end, goal) - chebyshev(right.end, goal),
    )[0];
    if (
      best !== undefined &&
      chebyshev(best.end, goal) < chebyshev(rider.at, goal)
    )
      return best.command;
  }
  // Tunnel with a rider towards a village 4 to 8 tiles from the Hammerer.
  let chosen: { command: CommandV7; village: CoordV7; score: number } | null =
    null;
  for (const command of offered) {
    if (command.kind !== "TUNNEL" || command.rider === null) continue;
    const hammerer = unitAt.get(command.rider.unitId);
    if (hammerer === undefined) continue;
    for (const village of villages) {
      const distance = chebyshev(hammerer.at, village);
      if (distance < 4 || distance > 8) continue;
      const score = chebyshev(command.rider.to, village);
      if (chosen === null || score < chosen.score)
        chosen = { command, village, score };
    }
  }
  if (chosen !== null && chosen.command.kind === "TUNNEL") {
    const rider = chosen.command.rider;
    if (rider !== null) script.riders.set(rider.unitId, chosen.village);
    return chosen.command;
  }
  return null;
}

function runProbe(setup: MatchSetupV7, scripted: boolean): ProbeRun {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state: GameStateV7 = created.state;
  const dwarf = state.players.find((player) => player.faction === "DWARF");
  const human = state.players.find((player) => player.faction === "ORIGINAL");
  if (dwarf === undefined || human === undefined)
    throw new Error("The probe needs a Dwarf and a Human seat");
  const script: Script = { moleTrained: false, riders: new Map(), commands: 0 };
  const riders = new Set<number>();
  const result = {
    tunnelsWithRider: 0,
    riderCaptureRounds: [] as number[],
    riderTunnelRounds: [] as number[],
    moleTrainedRounds: [] as number[],
    dwarfVillageCaptureRounds: [] as number[],
    humanRaiderCaptureRounds: [] as number[],
    humanVillageCaptureRounds: [] as number[],
    dwarfCitiesRound15: 0,
    humanCitiesRound15: 0,
  };
  let turnPlayer: PlayerId | null = null;
  let commandsThisTurn = 0;
  let counted15 = false;
  while (state.outcome === null && state.round <= MAX_ROUNDS) {
    if (!counted15 && state.round > PROBE_LAST_ROUND) {
      counted15 = true;
      result.dwarfCitiesRound15 = state.cities.filter(
        (city) => city.ownerId === dwarf.id,
      ).length;
      result.humanCitiesRound15 = state.cities.filter(
        (city) => city.ownerId === human.id,
      ).length;
    }
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("No active player");
    if (actor !== turnPlayer) {
      turnPlayer = actor;
      commandsThisTurn = 0;
    }
    const view = viewForV7(state, actor);
    let command =
      scripted &&
      actor === dwarf.id &&
      commandsThisTurn < NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7 - 8
        ? scriptedCommand(view, script)
        : null;
    if (command !== null) script.commands += 1;
    if (process.env.PROBE_DEBUG !== undefined && command !== null)
      process.stderr.write(
        `r${state.round} ${JSON.stringify(command)} riders ${JSON.stringify([...script.riders])}\n`,
      );
    command ??= chooseNormalTurnCommandV7(
      view,
      commandsThisTurn,
      NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("Policy stalled");
    const before = state;
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted)
      throw new Error(`Rejected ${JSON.stringify(command)}`);
    state = applied.state;
    commandsThisTurn += 1;
    if (command.kind === "TUNNEL" && command.rider !== null) {
      riders.add(command.rider.unitId);
      result.tunnelsWithRider += 1;
      result.riderTunnelRounds.push(before.round);
    }
    if (
      actor === dwarf.id &&
      command.kind === "TRAIN" &&
      command.role === "GUARD"
    )
      result.moleTrainedRounds.push(before.round);
    if (command.kind === "CAPTURE" && before.round <= REPORT_LAST_ROUND) {
      const unit = before.units.find((item) => item.id === command.unitId);
      const village = applied.events.some(
        (event) => event.kind === "CITY_CAPTURED" && event.from === null,
      );
      if (unit !== undefined && village) {
        if (actor === dwarf.id) {
          result.dwarfVillageCaptureRounds.push(before.round);
          if (riders.has(unit.id)) result.riderCaptureRounds.push(before.round);
        } else {
          result.humanVillageCaptureRounds.push(before.round);
          if (unit.role === "RAIDER")
            result.humanRaiderCaptureRounds.push(before.round);
        }
      }
    }
  }
  const outcome = state.outcome;
  const winnerId =
    outcome === null
      ? null
      : outcome.kind === "DEFEAT"
        ? outcome.defeatedByPlayerId
        : outcome.winnerId;
  return {
    ...result,
    winner:
      state.players.find((player) => player.id === winnerId)?.faction ?? null,
    rounds: state.round,
    scriptedCommands: script.commands,
  };
}

const runs: {
  seed: number;
  size: number;
  order: string;
  plain: ProbeRun;
  probe: ProbeRun;
}[] = [];
for (const size of SIZES)
  for (let seed = 0; seed < SEEDS; seed += 1)
    for (const factions of [
      ["DWARF", "ORIGINAL"],
      ["ORIGINAL", "DWARF"],
    ] as const) {
      const setup: MatchSetupV7 = {
        rulesetId: RULESET_7_ID,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3",
        curiosities: false,
        seed,
        width: size,
        height: size,
        aiCount: 1,
        aiDifficulty: "NORMAL",
        aiMode: "RIVAL",
        humanColor: "CORAL",
        factions,
        mapType: "DRY_LAND",
      };
      const plain = runProbe(setup, false);
      const probe = runProbe(setup, true);
      runs.push({
        seed,
        size,
        order: factions[0] === "DWARF" ? "WH" : "HW",
        plain,
        probe,
      });
      process.stderr.write(`${runs.length} `);
    }
process.stderr.write("\n");

const total = (pick: (run: ProbeRun) => number, which: "plain" | "probe") =>
  runs.reduce((sum, item) => sum + pick(item[which]), 0);
const mean = (pick: (run: ProbeRun) => number, which: "plain" | "probe") =>
  Math.round((100 * total(pick, which)) / Math.max(1, runs.length)) / 100;
const firstRounds = (
  pick: (run: ProbeRun) => number[],
  which: "plain" | "probe",
) =>
  runs.flatMap((item) =>
    pick(item[which])
      .filter((round) => round <= PROBE_LAST_ROUND)
      .slice(0, 1),
  );
const by15 = (rounds: readonly number[]) =>
  rounds.filter((round) => round <= PROBE_LAST_ROUND).length;
const median = (values: number[]) =>
  values.length === 0
    ? null
    : ([...values].sort((left, right) => left - right)[
        Math.floor(values.length / 2)
      ] ?? null);
const summary = Object.fromEntries(
  (["plain", "probe"] as const).map((which) => [
    which,
    {
      games: runs.length,
      dwarfWins: runs.filter((item) => item[which].winner === "DWARF").length,
      humanWins: runs.filter((item) => item[which].winner === "ORIGINAL")
        .length,
      tunnelsWithRider: total((run) => run.tunnelsWithRider, which),
      riderCaptures: total((run) => by15(run.riderCaptureRounds), which),
      riderCapturesToRound20: total(
        (run) => run.riderCaptureRounds.length,
        which,
      ),
      gamesWithRiderCapture: runs.filter(
        (item) => by15(item[which].riderCaptureRounds) > 0,
      ).length,
      firstRiderCaptureRoundMedian: median(
        firstRounds((run) => run.riderCaptureRounds, which),
      ),
      firstMoleRoundMedian: median(
        firstRounds((run) => run.moleTrainedRounds, which),
      ),
      firstRiderTunnelRoundMedian: median(
        firstRounds((run) => run.riderTunnelRounds, which),
      ),
      riderTunnelsToRound15: total((run) => by15(run.riderTunnelRounds), which),
      dwarfVillageCaptures: total(
        (run) => by15(run.dwarfVillageCaptureRounds),
        which,
      ),
      firstDwarfCaptureRoundMedian: median(
        firstRounds((run) => run.dwarfVillageCaptureRounds, which),
      ),
      dwarfCitiesRound15: mean((run) => run.dwarfCitiesRound15, which),
      humanCitiesRound15: mean((run) => run.humanCitiesRound15, which),
      humanRaiderCaptures: total(
        (run) => by15(run.humanRaiderCaptureRounds),
        which,
      ),
      firstHumanRaiderCaptureRoundMedian: median(
        firstRounds((run) => run.humanRaiderCaptureRounds, which),
      ),
      humanVillageCaptures: total(
        (run) => by15(run.humanVillageCaptureRounds),
        which,
      ),
      scriptedCommands: total((run) => run.scriptedCommands, which),
    },
  ]),
);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
const output = valueAfter("--output");
if (output !== undefined)
  writeFileSync(output, JSON.stringify({ summary, runs }, null, 2));
