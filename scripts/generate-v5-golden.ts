import { writeFileSync } from "node:fs";
import {
  DEMO_MATCH_SETUP,
  appendReplayCommand,
  applyCommand,
  createGame,
  createReplay,
  runReplay,
  type Command,
} from "../src/engine/index";

const commands: readonly Command[] = [
  { kind: "HUNT_ANIMAL", at: { x: 16, y: 2 } },
  { kind: "BUILD_LUMBER_MILL", at: { x: 16, y: 2 } },
  { kind: "END_TURN" },
];
const created = createGame(DEMO_MATCH_SETUP);
if (!created.ok) throw new Error(created.error.code);
let state = created.state;
let replay = createReplay(DEMO_MATCH_SETUP);
for (const command of commands) {
  const applied = applyCommand(state, command);
  if (!applied.ok) throw new Error(`${command.kind}:${applied.error.code}`);
  state = applied.state;
  replay = appendReplayCommand(replay, command, state);
}
const result = runReplay(replay);
writeFileSync(
  "tests/fixtures/golden-replay.json",
  `${JSON.stringify(
    {
      name: "demo-forest-economy-three-commands-v5",
      replay,
      expected: {
        acceptedCommands: result.acceptedCommands,
        stateHash: result.stateHash,
        events: result.events,
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);
