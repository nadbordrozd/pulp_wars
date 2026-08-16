import type { Command } from "../commands/types";
import type { MatchSetup } from "../model/types";

export interface ReplayCheckpoint {
  readonly index: number;
  readonly stateHash: string;
}

export interface ReplayFile {
  readonly format: "pulp-wars-replay";
  readonly version: 4;
  readonly setup: MatchSetup;
  readonly commands: readonly Command[];
  readonly checkpoints: readonly ReplayCheckpoint[];
}
