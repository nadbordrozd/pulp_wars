import type { NormalAiDecisionV7, ScoredAiCandidateV7 } from "../../src/ai/v7";
import {
  COMMAND_KIND_ORDER_V7,
  type AiReadyCommandV7,
  type CommandKindV7,
} from "../../src/engine/index";

/**
 * Revision 13 inserts the Undead commands after TEND_WOUNDED (spec section
 * 8), so every later command kind's ordinal shifts while their relative
 * order is unchanged. AI tie-break tuples carry `-ordinal` of the command
 * kind, which changes pinned hashes of all-Human decisions only
 * representationally. These helpers restore the revision-12 ordinals so a
 * test can prove the rest of a hashed value is byte-identical. Revision 17
 * likewise inserts KABOOM after WAIL (Goblin spec section 9), and revision 19
 * STAMPEDE and HATCH after KABOOM and LAY_EGG after TRAIN_NAVAL (Dinosaur
 * spec section 10). Revision 20 removes STAMPEDE again (its section 2.7), so
 * every kind after KABOOM moves back by one; kinds are mapped by name, so
 * the revision-12-ordinal proofs are unaffected. The Martian revision
 * inserts BEAM_DOWN, MIND_CONTROL, and TRACTOR_BEAM after HATCH (its section
 * 11), and the Ice Folk revision THROW_BOLAS and COLD_SNAP after
 * TRACTOR_BEAM (its section 11), and the Dwarf revision TUNNEL, BOMB_RUN,
 * and ASSEMBLE after COLD_SNAP (its section 14), and the Candy revision
 * SUGAR_RUSH, REBAKE, and SUGAR_TOSS after ASSEMBLE (its section 13). The
 * naval branch (`pulp_wars-5ti.2`) inserts BOARD right after ATTACK (its
 * section 3.1), so every kind after ATTACK moves forward by one.
 */
const LATER_COMMAND_KINDS: readonly string[] = [
  "BOARD",
  "RAISE_DEAD",
  "DEVOUR",
  "WAIL",
  "KABOOM",
  "HATCH",
  "BEAM_DOWN",
  "MIND_CONTROL",
  "TRACTOR_BEAM",
  "THROW_BOLAS",
  "COLD_SNAP",
  "FREEZE",
  "TUNNEL",
  "BOMB_RUN",
  "ASSEMBLE",
  // Dwarf crowd control (`pulp_wars-w49.33`) inserts WHIRL, BUILD_BARRICADE,
  // and ATTACK_BARRICADE after ASSEMBLE.
  "WHIRL",
  "BUILD_BARRICADE",
  "ATTACK_BARRICADE",
  "SUGAR_RUSH",
  "REBAKE",
  "SUGAR_TOSS",
  // The giants' signatures (`pulp_wars-w49.30`) insert four after RECOVER.
  "SWALLOW",
  "TOSS",
  "STOMP",
  "BREAK_OFF",
  "LAY_EGG",
  // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL.
  "HIRE",
  // Tuning 4 inserted DRILL_UNIT after PROMOTE; tuning 5
  // (`pulp_wars-w49.4`) removed it again, so every kind after PROMOTE is
  // back where it was at tuning 3.
];
const REVISION_12_COMMAND_KIND_ORDER = COMMAND_KIND_ORDER_V7.filter(
  (kind) => !LATER_COMMAND_KINDS.includes(kind),
);

/** The tuple slot holding `-ordinal` of the command kind. */
const KIND_SLOT = 6;

function revision12Ordinal(kind: CommandKindV7, current: number): number {
  if (current !== -COMMAND_KIND_ORDER_V7.indexOf(kind))
    throw new Error(`unexpected ${kind} ordinal ${current}`);
  const index = REVISION_12_COMMAND_KIND_ORDER.indexOf(kind);
  if (index < 0) throw new Error(`${kind} is not a revision-12 command`);
  return -index;
}

function withSlot(
  values: readonly number[],
  slot: number,
  kind: CommandKindV7,
): number[] {
  return values.map((value, index) =>
    index === slot ? revision12Ordinal(kind, value) : value,
  );
}

export function withRevision12AiReadyOrdinalsV7(
  ready: readonly AiReadyCommandV7[],
): readonly AiReadyCommandV7[] {
  return ready.map((entry) => ({
    ...entry,
    tuple: withSlot(
      entry.tuple,
      KIND_SLOT,
      entry.command.kind,
    ) as unknown as AiReadyCommandV7["tuple"],
  }));
}

export function withRevision12CandidateOrdinalsV7(
  candidates: readonly ScoredAiCandidateV7[],
): readonly ScoredAiCandidateV7[] {
  return candidates.map((candidate): ScoredAiCandidateV7 => ({
    ...candidate,
    score: {
      ...candidate.score,
      deterministicTieBreak: withSlot(
        candidate.score.deterministicTieBreak,
        0,
        candidate.command.kind,
      ) as unknown as ScoredAiCandidateV7["score"]["deterministicTieBreak"],
    },
    tuple: withSlot(candidate.tuple, KIND_SLOT, candidate.command.kind),
  }));
}

export function withRevision12DecisionOrdinalsV7(
  decision: NormalAiDecisionV7,
): NormalAiDecisionV7 {
  return {
    ...decision,
    candidates: withRevision12CandidateOrdinalsV7(decision.candidates),
  };
}
