import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  publicProjectedDamageForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  type ScoredAiCandidateV7,
} from "../../src/ai/v7";
import { ARMY_BREAKTHROUGH_MOVE_PRIORITY_V7 } from "../../src/ai/v7-army";
import { REBAKE_PRIORITY_V7 } from "../../src/ai/v7-candy";
import { CHARGE_PUSH_CENTER_PRIORITY_V7 } from "../../src/ai/v7-dinosaur";
import {
  BREAK_OFF_MINIMUM_HP_V7,
  BREAK_OFF_PRIORITY_V7,
  CRUSH_BACKSTOP_VALUE_V7,
  GIANT_FIELD_DEFENSE_VALUE_V7,
  GLACIAL_FREEZE_VALUE_V7,
  SIEGE_HAMMER_APPROACH_VALUE_V7,
  SIEGE_HAMMER_FIRST_PRIORITY_V7,
  SIEGE_HAMMER_LEVEL_VALUE_V7,
  SIEGE_HAMMER_WALLS_VALUE_V7,
  SWALLOW_ESCAPE_PRIORITY_V7,
  SWALLOW_MINIMUM_HP_V7,
  TOSS_ESCORT_VALUE_V7,
  giantFactsV7,
  tossedGoblinV7,
} from "../../src/ai/v7-giants";
import { KABOOM_KILL_PRIORITY_V7 } from "../../src/ai/v7-goblin";
import { SHATTER_SETUP_PRIORITY_V7 } from "../../src/ai/v7-ice-folk";
import {
  BREAK_OFF_HP_V7,
  CRUSH_DAMAGE_V7,
  GLACIAL_SMASH_HP_V7,
  STOMP_DAMAGE_V7,
  SWALLOW_MAX_HP_V7,
  TRAMPLE_DAMAGE_V7,
  calculateCombatPreviewV7,
  effectiveRoleRuleV7,
  previewBreakOffV7,
  previewKaboomV7,
  previewStompV7,
  previewSwallowV7,
  previewTrampleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  candyFieldV7,
  type CandyFieldOptionsV7,
  type CandyPieceV7,
} from "../fixtures/v7-candy";
import {
  attackV7,
  forestTileV7,
  moveCandidateV7,
  publicUnitAtV7,
  scoreV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { walledCityV7 } from "../fixtures/v7-giants-ui";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { fieldDefenseV7, withoutTechsV7 } from "../fixtures/v7-revision20";

// The giants' signatures, Normal AI (`pulp_wars-w49.31`,
// docs/product/RULESET_7_GIANTS.md section 9): each seat uses its own
// giant's signature on purpose, and every seat reads a hostile giant's. No
// rule changed and no match was played for this bead (the standing rule of
// no simulations): every rule is shown on a small hand-built state, and
// every projection the policy makes is compared with the engine's own
// preview or event.
//
// The field (tests/fixtures/v7-candy.ts, 11 x 11): seat 0 (the viewer)
// capital (8, 8) with territory x 7-9, y 7-9; seat 1 capital (2, 8) with
// territory x 1-3, y 7-9; villages (5, 5), (8, 5), (5, 8); every other land
// tile open Grass; every tile explored; every technology. The scenes have
// no Coins (so the turn is the units') and stand in round 12 (a seat's
// first ten rounds are its opening, in which its units take the villages
// before they fight; the first giant comes at about round 10).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const key = (where: CoordV7): string => `${where.x},${where.y}`;

const own = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<CandyPieceV7> = {},
): CandyPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<CandyPieceV7> = {},
): CandyPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });
/** The faction's giant: every giant is the `JUGGERNAUT` role. */
const GIANT: UnitRoleIdV7 = "JUGGERNAUT";

function field(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly CandyPieceV7[],
  options: CandyFieldOptionsV7 = {},
): GameStateV7 {
  return checkedV7({
    ...candyFieldV7(pieces, { coins: 0, ...options, factions }),
    round: 12,
  });
}

/** Every technology of each seat but Explosives and what needs it. */
const noExplosives = (
  factions: readonly [FactionIdV7, FactionIdV7],
): Readonly<Record<number, readonly TechnologyIdV7[]>> => ({
  0: withoutTechsV7(factions[0], "EXPLOSIVES", "SEAMANSHIP", "SUBMERSIBLES"),
  1: withoutTechsV7(factions[1], "EXPLOSIVES", "SEAMANSHIP", "SUBMERSIBLES"),
});

/** The same position with seat 1 to move (for the engine's own previews). */
function asFoe(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
  });
}

const foeView = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, seatIdV7(state, 1));

/** The active seat plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly events: readonly DomainEventV7[];
  readonly state: GameStateV7;
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const commands: CommandV7[] = [];
  const events: DomainEventV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, events, state };
    commands.push(command);
    const result = applyOkV7(state, actor, command);
    events.push(...result.events);
    state = result.state;
  }
  throw new Error("the turn did not end");
}

/** The commands of the turn that a unit makes, in order. */
const unitCommands = (commands: readonly CommandV7[]): readonly CommandV7[] =>
  commands.filter((command) => "unitId" in command);

/** The best candidate of the unit on `from`, or undefined. */
const best = (
  state: GameStateV7,
  from: CoordV7,
): ScoredAiCandidateV7 | undefined => unitCandidatesV7(state, from)[0];

const apply = (state: GameStateV7, command: CommandV7) =>
  applyOkV7(state, state.humanPlayerId, command);

function eventOf<K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }> {
  const event = events.find((item) => item.kind === kind);
  if (event === undefined) throw new Error(`no ${kind}`);
  return event as Extract<DomainEventV7, { kind: K }>;
}

/** The viewer's public preview of the attack from `from` on `to`. */
function previewOf(state: GameStateV7, from: CoordV7, to: CoordV7) {
  const preview = queryCombatPreviewV7(
    viewerViewV7(state),
    unitIdAtV7(state, from),
    unitIdAtV7(state, to),
  );
  if (preview === null) throw new Error("no preview");
  return preview;
}

describe("the giants' signatures, Normal AI: the gate", () => {
  it("lists the giants that have a signature, and no Giant Spider or other unit", () => {
    const hostile = (state: GameStateV7) => (owner: number) =>
      owner !== state.humanPlayerId;
    const plain = field(
      ["ORIGINAL", "ORIGINAL"],
      [own("FIGHTER", 4, 3), foe("KNIGHT", 6, 3)],
    );
    expect(giantFactsV7(viewerViewV7(plain), hostile(plain))).toBeNull();
    const giants = field(
      ["ORIGINAL", "DINOSAUR"],
      [own(GIANT, 4, 3), foe(GIANT, 6, 3), foe("FIGHTER", 6, 4)],
    );
    const facts = giantFactsV7(viewerViewV7(giants), hostile(giants));
    expect([...(facts?.own ?? [])]).toEqual([
      [unitIdAtV7(giants, at(4, 3)), "CRUSH"],
    ]);
    expect(
      facts?.hostile.map((entry) => [entry.unit.id, entry.signature]),
    ).toEqual([[unitIdAtV7(giants, at(6, 3)), "STOMP"]]);
  });
});

describe("Crushing Shove: the Juggernaut's own seat", () => {
  // A Guard with a Marksman behind it (crushed, and the Marksman hit), and
  // a Guard with open Grass behind it (pushed). The Juggernaut has moved
  // (it strikes from where it stands), and two own Fighters see the tiles
  // behind the Guards (the Push preview knows only a tile an own unit
  // detects; see the test of the tile nobody watches).
  const SCOUTS = [own("FIGHTER", 7, 2), own("FIGHTER", 4, 0)];
  const scene = (extra: readonly CandyPieceV7[] = SCOUTS, hp = 17) =>
    field(
      ["ORIGINAL", "ORIGINAL"],
      [
        own(GIANT, 4, 3, { activation: { moved: true, movedPathLength: 1 } }),
        foe("GUARD", 5, 3, { hp }),
        foe("MARKSMAN", 6, 3),
        foe("GUARD", 4, 2),
        ...extra,
      ],
    );

  it("counts the crush and the collision exactly as the preview and the event have them", () => {
    const state = scene();
    const blocked = previewOf(state, at(4, 3), at(5, 3));
    const free = previewOf(state, at(4, 3), at(4, 2));
    expect(blocked.crush).toBe("WILL_CRUSH");
    expect(blocked.crushDamage).toBe(CRUSH_DAMAGE_V7);
    expect(blocked.collisionDamage).toBe(CRUSH_DAMAGE_V7);
    expect([free.push, free.crush]).toEqual(["WILL_PUSH", "NONE"]);
    const hit = (preview: typeof blocked): number =>
      10 * preview.damageToDefender - 8 * preview.damageToAttacker;
    const blockedScore = scoreV7(state, attackV7(state, at(4, 3), at(5, 3)));
    const freeScore = scoreV7(state, attackV7(state, at(4, 3), at(4, 2)));
    expect(freeScore.immediateValue).toBe(hit(free));
    expect(blockedScore.immediateValue).toBe(
      hit(blocked) + 10 * blocked.crushDamage + 10 * blocked.collisionDamage,
    );
    // The engine does what the policy counted.
    const crushed = eventOf(
      apply(state, attackV7(state, at(4, 3), at(5, 3))).events,
      "UNIT_CRUSHED",
    );
    expect([
      crushed.damage,
      crushed.dies,
      crushed.blockerUnitId,
      crushed.blockerDamage,
      crushed.blockerDies,
    ]).toEqual([
      blocked.crushDamage,
      false,
      unitIdAtV7(state, at(6, 3)),
      blocked.collisionDamage,
      false,
    ]);
  });

  it("strikes the unit with a unit behind it, not the one it would only push", () => {
    const state = scene();
    expect(best(state, at(4, 3))?.command).toEqual(
      attackV7(state, at(4, 3), at(5, 3)),
    );
    expect(unitCommands(policyTurn(state).commands)[0]).toEqual(
      attackV7(state, at(4, 3), at(5, 3)),
    );
  });

  it("reads a tile behind that nobody watches from the units the view lists", () => {
    // Without the scouts the preview does not know either tile behind
    // (`UNKNOWN_BEHIND_FOG`); the view still lists the Marksman, and the
    // preview its collision, so the crush is counted, and the Guard with
    // open Grass behind it is counted as pushed.
    const state = scene([]);
    const blocked = previewOf(state, at(4, 3), at(5, 3));
    const free = previewOf(state, at(4, 3), at(4, 2));
    expect([blocked.crush, blocked.collisionDamage]).toEqual([
      "UNKNOWN_BEHIND_FOG",
      CRUSH_DAMAGE_V7,
    ]);
    expect([free.crush, free.collisionDamage]).toEqual([
      "UNKNOWN_BEHIND_FOG",
      0,
    ]);
    const hit = (preview: typeof blocked): number =>
      10 * preview.damageToDefender - 8 * preview.damageToAttacker;
    expect(
      scoreV7(state, attackV7(state, at(4, 3), at(5, 3))).immediateValue,
    ).toBe(
      hit(blocked) + 10 * blocked.crushDamage + 10 * blocked.collisionDamage,
    );
    expect(
      scoreV7(state, attackV7(state, at(4, 3), at(4, 2))).immediateValue,
    ).toBe(hit(free));
    // And the engine: the first is crushed, the second pushed.
    expect(
      apply(state, attackV7(state, at(4, 3), at(5, 3))).events.map(
        (event) => event.kind,
      ),
    ).toContain("UNIT_CRUSHED");
    const pushed = apply(state, attackV7(state, at(4, 3), at(4, 2)));
    expect(pushed.events.map((event) => event.kind)).not.toContain(
      "UNIT_CRUSHED",
    );
    expect(unitAtV7(pushed.state, at(4, 1)).role).toBe("GUARD");
  });

  it("gives a crush that kills a kill's tier", () => {
    // The Guard's HP at which the blow leaves it alive at the crush or less.
    const hp = [...Array(17).keys()]
      .map((index) => 17 - index)
      .find((candidate) => {
        const preview = previewOf(scene(SCOUTS, candidate), at(4, 3), at(5, 3));
        return (
          !preview.defenderDies &&
          candidate - preview.damageToDefender <= preview.crushDamage
        );
      });
    if (hp === undefined) throw new Error("no such HP");
    const state = scene(SCOUTS, hp);
    const preview = previewOf(state, at(4, 3), at(5, 3));
    expect(preview.defenderDies).toBe(false);
    const score = scoreV7(state, attackV7(state, at(4, 3), at(5, 3)));
    expect(score.priority).toBe(1180);
    expect(score.immediateValue).toBe(
      10 * preview.damageToDefender -
        8 * preview.damageToAttacker +
        10 * preview.crushDamage +
        20 +
        10 * preview.collisionDamage,
    );
    const crushed = eventOf(
      apply(state, attackV7(state, at(4, 3), at(5, 3))).events,
      "UNIT_CRUSHED",
    );
    expect([crushed.damage, crushed.dies]).toEqual([preview.crushDamage, true]);
  });

  it("shoves a garrison off a hostile center for a capturer beside it", () => {
    // Seat 1's capital (2, 8): the Juggernaut strikes from (3, 7), the
    // Guard goes to (1, 9), and the Fighter beside the center steps on.
    const state = field(
      ["ORIGINAL", "ORIGINAL"],
      [own(GIANT, 3, 7), own("FIGHTER", 3, 9), foe("GUARD", 2, 8)],
    );
    const preview = previewOf(state, at(3, 7), at(2, 8));
    expect(preview.defenderDies).toBe(false);
    const score = scoreV7(state, attackV7(state, at(3, 7), at(2, 8)));
    expect(score.priority).toBe(CHARGE_PUSH_CENTER_PRIORITY_V7);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)[0]).toEqual(
      attackV7(state, at(3, 7), at(2, 8)),
    );
    // The center is empty after the blow, and an own unit stands on it at
    // the end of the turn.
    expect(unitAtV7(turn.state, at(2, 8)).ownerId).toBe(state.humanPlayerId);
  });
});

describe("Crushing Shove: against a Juggernaut", () => {
  it("adds the crush to the danger of a unit that would not be pushed, as the Juggernaut's own preview has it", () => {
    // The Juggernaut at (4, 3) strikes a unit on (6, 3) from (5, 3). With
    // an own unit on (7, 3) the Fighter is not pushed; a Fighter on (6, 1)
    // has open Grass behind it wherever the blow comes from.
    const state = field(
      ["ORIGINAL", "ORIGINAL"],
      [
        own("GUARD", 7, 4),
        own("GUARD", 7, 3),
        own("GUARD", 8, 1),
        foe(GIANT, 4, 3),
      ],
    );
    const backed = moveCandidateV7(state, at(7, 4), at(6, 3));
    const open = scoreV7(state, {
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(8, 1)),
      path: [at(7, 1)],
    });
    // (7, 1) is out of the Juggernaut's reach: no danger at all.
    expect(open.safetyValue).toBe(0);
    // On (6, 3) with (7, 3) behind it: the blow and the crush.
    const there = field(
      ["ORIGINAL", "ORIGINAL"],
      [
        own("GUARD", 6, 3),
        own("GUARD", 7, 3),
        own("GUARD", 8, 1),
        foe(GIANT, 5, 3),
      ],
    );
    const blow = calculateCombatPreviewV7(
      asFoe(there),
      unitIdAtV7(there, at(5, 3)),
      unitIdAtV7(there, at(6, 3)),
    );
    expect(blow.crush).toBe("WILL_CRUSH");
    expect(blow.crushDamage).toBe(CRUSH_DAMAGE_V7);
    const score =
      backed?.score ??
      scoreV7(state, {
        kind: "MOVE",
        unitId: unitIdAtV7(state, at(7, 4)),
        path: [at(6, 3)],
      });
    expect(score.safetyValue).toBe(-(blow.damageToDefender + blow.crushDamage));
  });

  it("does not line up behind an own unit in front of a Juggernaut when it has a choice", () => {
    // The Guard on (6, 3) is pushed to (7, 3) now. A unit that steps onto
    // (7, 3) makes it a column: the Guard is crushed and the mover hit.
    const state = field(
      ["ORIGINAL", "ORIGINAL"],
      [
        own("GUARD", 6, 3),
        own("FIGHTER", 8, 3),
        own("FIGHTER", 9, 1),
        foe(GIANT, 4, 3),
        foe("FIGHTER", 3, 3),
      ],
    );
    const column = scoreV7(state, {
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(8, 3)),
      path: [at(7, 3)],
    });
    const apart = scoreV7(state, {
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(8, 3)),
      path: [at(8, 4)],
    });
    expect(column.strategicValue).toBeLessThan(apart.strategicValue);
    const turn = policyTurn(state);
    const mover = unitIdAtV7(state, at(8, 3));
    const ended = turn.state.units.find((unit) => unit.id === mover)?.at;
    // Not on any tile behind the Guard (the blow may come from three
    // tiles: each of them has one tile behind the Guard).
    expect(ended === undefined ? 0 : gap(ended, at(6, 3))).toBeGreaterThan(1);
    // The engine agrees about the column: with a unit on (7, 3) the blow
    // from (5, 3) crushes the Guard and hits the unit behind it.
    const lined = field(
      ["ORIGINAL", "ORIGINAL"],
      [own("GUARD", 6, 3), own("FIGHTER", 7, 3), foe(GIANT, 5, 3)],
    );
    const blow = calculateCombatPreviewV7(
      asFoe(lined),
      unitIdAtV7(lined, at(5, 3)),
      unitIdAtV7(lined, at(6, 3)),
    );
    expect([blow.crush, blow.crushDamage, blow.collisionDamage]).toEqual([
      "WILL_CRUSH",
      CRUSH_DAMAGE_V7,
      CRUSH_DAMAGE_V7,
    ]);
  });

  it("stands behind the garrison of an own center a Juggernaut would shove off it", () => {
    // The capital (8, 8): the Juggernaut on (6, 8) strikes its garrison
    // from (7, 8) and pushes it to (9, 8). A unit on (9, 8) keeps it there.
    const pieces = [
      own("GUARD", 8, 8),
      own("FIGHTER", 9, 7),
      foe("FIGHTER", 5, 8),
    ];
    const withGiant = field(
      ["ORIGINAL", "ORIGINAL"],
      [...pieces, foe(GIANT, 6, 8)],
    );
    const without = field(
      ["ORIGINAL", "ORIGINAL"],
      [...pieces, foe("FIGHTER", 6, 8)],
    );
    const move = (state: GameStateV7): CommandV7 => ({
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(9, 7)),
      path: [at(9, 8)],
    });
    expect(
      scoreV7(withGiant, move(withGiant)).strategicValue -
        scoreV7(without, move(without)).strategicValue,
    ).toBe(CRUSH_BACKSTOP_VALUE_V7);
    // The engine: with the tile behind it free the garrison is pushed off.
    const beside = field(
      ["ORIGINAL", "ORIGINAL"],
      [own("GUARD", 8, 8), own("FIGHTER", 9, 7), foe(GIANT, 7, 8)],
    );
    const shoved = calculateCombatPreviewV7(
      asFoe(beside),
      unitIdAtV7(beside, at(7, 8)),
      unitIdAtV7(beside, at(8, 8)),
    );
    expect(shoved.defenderDies ? "DIES" : shoved.push).toBe("WILL_PUSH");
  });
});

describe("Swallow: the Abomination's own seat", () => {
  // A wounded Abomination (20 of 40 HP): its blow does not kill a Guard at
  // 12 HP, and a Swallow takes it whole.
  const scene = (hp = 20, extra: readonly CandyPieceV7[] = []) =>
    field(
      ["UNDEAD", "ORIGINAL"],
      [own(GIANT, 4, 3, { hp }), foe("GUARD", 5, 3, { hp: 12 }), ...extra],
    );
  const swallow = (state: GameStateV7, x: number, y: number): CommandV7 => ({
    kind: "SWALLOW",
    unitId: unitIdAtV7(state, at(4, 3)),
    targetUnitId: unitIdAtV7(state, at(x, y)),
  });

  it("swallows a unit its attack would not kill, counted as its preview has it", () => {
    const state = scene();
    expect(previewOf(state, at(4, 3), at(5, 3)).defenderDies).toBe(false);
    const preview = previewSwallowV7(
      viewerViewV7(state),
      unitIdAtV7(state, at(4, 3)),
      unitIdAtV7(state, at(5, 3)),
    );
    expect(preview?.hp).toBe(SWALLOW_MAX_HP_V7);
    const score = scoreV7(state, swallow(state, 5, 3));
    expect(score.priority).toBe(1180);
    // The victim's HP as damage, a kill, and the HP the digest heals.
    expect(score.immediateValue).toBe(10 * 12 + 20 + 8 * 12);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)[0]).toEqual(swallow(state, 5, 3));
    const swallowed = eventOf(turn.events, "UNIT_SWALLOWED");
    expect([swallowed.victimUnitId, swallowed.hp]).toEqual([
      preview?.targetUnitId,
      preview?.hp,
    ]);
    expect(turn.state.units.some((unit) => same(unit.at, at(5, 3)))).toBe(
      false,
    );
  });

  it("swallows the dearest unit", () => {
    // A Knight in a Forest: the blow does not kill it there either.
    const state = forestTileV7(
      scene(20, [foe("KNIGHT", 4, 4, { hp: 12 })]),
      at(4, 4),
    );
    expect(previewOf(state, at(4, 3), at(4, 4)).defenderDies).toBe(false);
    const knight = scoreV7(state, swallow(state, 4, 4));
    const guard = scoreV7(state, swallow(state, 5, 3));
    expect(knight.priority).toBeGreaterThanOrEqual(guard.priority);
    expect(knight.strategicValue).toBeGreaterThan(guard.strategicValue);
    expect(unitCommands(policyTurn(state).commands)[0]).toEqual(
      swallow(state, 4, 4),
    );
  });

  it("never swallows below 16 HP of its own", () => {
    const weak = scene(SWALLOW_MINIMUM_HP_V7 - 1);
    expect(
      queryPlayerCommandsV7(viewerViewV7(weak)).some(
        (command) => command.kind === "SWALLOW",
      ),
    ).toBe(true);
    expect(unitCandidatesV7(weak, at(4, 3), "SWALLOW")).toEqual([]);
    expect(
      unitCandidatesV7(scene(SWALLOW_MINIMUM_HP_V7), at(4, 3), "SWALLOW"),
    ).toHaveLength(1);
  });

  it("kills with its attack what its attack kills (the unit rises as a Zombie at once)", () => {
    const state = scene(40, [foe("FIGHTER", 4, 4, { hp: 5 })]);
    expect(previewOf(state, at(4, 3), at(4, 4)).defenderDies).toBe(true);
    expect(
      unitCandidatesV7(state, at(4, 3), "SWALLOW").map(
        (candidate) => candidate.command,
      ),
    ).not.toContainEqual(swallow(state, 4, 4));
  });
});

describe("Swallow: against an Abomination", () => {
  // A wounded Abomination (20 of 40 HP) on (4, 3): its blow does not kill
  // a Guard at 12 HP; a Swallow takes it. (5, 3) is where it strikes a
  // unit on (6, 3) from.
  const scene = (guard: CandyPieceV7, giantAt = at(4, 3)) =>
    field(
      ["ORIGINAL", "UNDEAD"],
      [guard, own("GUARD", 8, 1), foe(GIANT, giantAt.x, giantAt.y, { hp: 20 })],
    );
  const step = (state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 => ({
    kind: "MOVE",
    unitId: unitIdAtV7(state, from),
    path: [to],
  });

  it("counts a unit it would swallow as lost, exactly when the engine offers the Swallow", () => {
    const wounded = scene(own("GUARD", 7, 3, { hp: 12 }));
    const healthy = scene(own("GUARD", 7, 3, { hp: 13 }));
    // The whole unit is the danger of the wounded Guard on (6, 3) ...
    expect(
      scoreV7(wounded, step(wounded, at(7, 3), at(6, 3))).safetyValue,
    ).toBe(-12);
    // ... and one HP more is only the blow.
    const blowOn = (state: GameStateV7): number =>
      calculateCombatPreviewV7(
        asFoe(state),
        unitIdAtV7(state, at(5, 3)),
        unitIdAtV7(state, at(6, 3)),
      ).damageToDefender;
    const besideHealthy = scene(own("GUARD", 6, 3, { hp: 13 }), at(5, 3));
    const besideWounded = scene(own("GUARD", 6, 3, { hp: 12 }), at(5, 3));
    expect(blowOn(besideWounded)).toBeLessThan(12);
    expect(
      scoreV7(healthy, step(healthy, at(7, 3), at(6, 3))).safetyValue,
    ).toBe(-blowOn(besideHealthy));
    // The engine offers the Abomination exactly that Swallow.
    const offered = (state: GameStateV7): boolean =>
      queryPlayerCommandsV7(foeView(asFoe(state))).some(
        (command) =>
          command.kind === "SWALLOW" &&
          command.targetUnitId === unitIdAtV7(state, at(6, 3)),
      );
    expect([offered(besideWounded), offered(besideHealthy)]).toEqual([
      true,
      false,
    ]);
  });

  it("does not walk a unit it would swallow into its reach", () => {
    const wounded = scene(own("GUARD", 7, 3, { hp: 12 }));
    const healthy = scene(own("GUARD", 7, 3, { hp: 13 }));
    // The Move costs half the unit's value (its Coins four times, and its
    // HP), and is not made as a routine Move; one HP more and it is free.
    const half = Math.floor(
      ((effectiveRoleRuleV7("GUARD", "ORIGINAL").cost ?? 0) * 4 + 12) / 2,
    );
    for (const to of [at(6, 2), at(6, 3), at(6, 4)]) {
      const score = scoreV7(wounded, step(wounded, at(7, 3), to));
      expect([score.priority, score.strategicValue]).toEqual([-1, -half]);
      expect(scoreV7(healthy, step(healthy, at(7, 3), to)).strategicValue).toBe(
        0,
      );
    }
    const turn = policyTurn(wounded);
    const guard = unitIdAtV7(wounded, at(7, 3));
    const ended = turn.state.units.find((unit) => unit.id === guard)?.at;
    expect(ended === undefined ? 0 : gap(ended, at(4, 3))).toBeGreaterThan(2);
  });

  it("steps a unit it would swallow out of its reach", () => {
    const state = scene(own("GUARD", 6, 3, { hp: 12 }));
    const out = scoreV7(state, step(state, at(6, 3), at(7, 3)));
    expect(out.priority).toBe(SWALLOW_ESCAPE_PRIORITY_V7);
    const turn = policyTurn(state);
    const guard = unitIdAtV7(state, at(6, 3));
    const ended = turn.state.units.find((unit) => unit.id === guard)?.at;
    expect(ended === undefined ? 0 : gap(ended, at(4, 3))).toBeGreaterThan(2);
  });

  it("fears no Abomination that holds a victim already", () => {
    // Seat 1's Abomination swallows a Fighter of seat 0 first; then it is
    // seat 0's turn.
    const before = asFoe(
      field(
        ["ORIGINAL", "UNDEAD"],
        [
          own("GUARD", 7, 3, { hp: 12 }),
          own("FIGHTER", 3, 3, { hp: 6 }),
          foe(GIANT, 4, 3, { hp: 20 }),
        ],
      ),
    );
    const fed = applyOkV7(before, seatIdV7(before, 1), {
      kind: "SWALLOW",
      unitId: unitIdAtV7(before, at(4, 3)),
      targetUnitId: unitIdAtV7(before, at(3, 3)),
    }).state;
    const state = applyOkV7(fed, seatIdV7(fed, 1), { kind: "END_TURN" }).state;
    expect(viewerViewV7(state).giants.swallowed).toHaveLength(1);
    const blow = publicProjectedDamageForPolicyV7(
      viewerViewV7(state),
      publicUnitAtV7(state, at(4, 3)),
      publicUnitAtV7(state, at(7, 3)),
      at(6, 3),
    );
    expect(blow).toBeLessThan(12);
    expect(scoreV7(state, step(state, at(7, 3), at(6, 3))).safetyValue).toBe(
      -blow,
    );
  });
});

describe("Goblin Toss: the Troll's own seat", () => {
  // The Troll on (4, 3) with a Goblin beside it; a Fighter and a Catapult
  // three tiles away, out of the Goblin's own walk.
  const scene = (extra: readonly CandyPieceV7[] = []) =>
    field(
      ["GOBLIN", "ORIGINAL"],
      [
        own(GIANT, 4, 3),
        own("FIGHTER", 3, 3),
        foe("FIGHTER", 7, 2),
        foe("CATAPULT", 7, 4),
        ...extra,
      ],
    );

  it("throws its Goblin where the Kaboom hits two units, and the Goblin sets it off", () => {
    const state = scene();
    const toss = unitCandidatesV7(state, at(4, 3), "TOSS");
    // One throw of the forty or so the engine offers.
    expect(toss).toHaveLength(1);
    const command = toss[0]?.command;
    if (command?.kind !== "TOSS") throw new Error("no toss");
    expect(command.passengerUnitId).toBe(unitIdAtV7(state, at(3, 3)));
    expect([gap(command.at, at(7, 2)), gap(command.at, at(7, 4))]).toEqual([
      1, 1,
    ]);
    expect(toss[0]?.score.priority).toBe(KABOOM_KILL_PRIORITY_V7);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands).slice(0, 2)).toEqual([
      command,
      { kind: "KABOOM", unitId: command.passengerUnitId },
    ]);
    // The blast the throw was scored by is the one the engine previews
    // for the Goblin once it has landed, and the one that resolves.
    const landed = apply(state, command).state;
    expect(
      tossedGoblinV7(viewerViewV7(landed), publicUnitAtV7(landed, command.at)),
    ).toBe(true);
    const kaboom = scoreV7(landed, {
      kind: "KABOOM",
      unitId: command.passengerUnitId,
    });
    expect(kaboom.priority).toBe(KABOOM_KILL_PRIORITY_V7);
    expect([
      toss[0]?.score.strategicValue,
      toss[0]?.score.immediateValue,
    ]).toEqual([kaboom.strategicValue, kaboom.immediateValue]);
    const preview = previewKaboomV7(
      viewerViewV7(landed),
      command.passengerUnitId,
    );
    expect(preview?.totals.hostileDamage).toBe(12);
    expect(kaboom.immediateValue).toBe(10 * 12);
    const hurt = (role: UnitRoleIdV7): number | undefined =>
      turn.state.units.find(
        (unit) => unit.ownerId !== state.humanPlayerId && unit.role === role,
      )?.hp;
    expect([hurt("FIGHTER"), hurt("CATAPULT")]).toEqual([
      unitAtV7(state, at(7, 2)).hp - 6,
      unitAtV7(state, at(7, 4)).hp - 6,
    ]);
  });

  it("throws no Goblin at one healthy unit, and attacks when no Goblin stands beside it", () => {
    // One Fighter: 6 damage, no kill, less than the 8 a throw needs.
    const lone = field(
      ["GOBLIN", "ORIGINAL"],
      [own(GIANT, 4, 3), own("FIGHTER", 3, 3), foe("FIGHTER", 7, 2)],
    );
    expect(
      queryPlayerCommandsV7(viewerViewV7(lone)).some(
        (command) => command.kind === "TOSS",
      ),
    ).toBe(true);
    expect(unitCandidatesV7(lone, at(4, 3), "TOSS")).toEqual([]);
    // No Goblin in reach: no throw is offered, and the Troll strikes.
    const alone = field(
      ["GOBLIN", "ORIGINAL"],
      [own(GIANT, 4, 3), own("FIGHTER", 1, 1), foe("GUARD", 5, 3)],
    );
    expect(unitCandidatesV7(alone, at(4, 3), "TOSS")).toEqual([]);
    expect(best(alone, at(4, 3))?.command.kind).toBe("ATTACK");
  });

  it("keeps a blow that does not kill for the throw", () => {
    // A Guard beside the Troll: the throw is made, not the blow on it.
    const state = scene([foe("GUARD", 5, 3)]);
    expect(unitCandidatesV7(state, at(4, 3), "ATTACK")).toEqual([]);
    expect(best(state, at(4, 3))?.command.kind).toBe("TOSS");
  });

  it("keeps a Goblin beside a Troll that has an enemy near", () => {
    // The Goblin on (2, 2) may step beside the Troll (3, 2) or not (1, 1).
    const pieces = [own(GIANT, 4, 3), own("FIGHTER", 2, 2)];
    const near = field(["GOBLIN", "ORIGINAL"], [...pieces, foe("GUARD", 8, 3)]);
    const far = field(
      ["GOBLIN", "ORIGINAL"],
      [...pieces, foe("GUARD", 10, 10)],
    );
    const value = (state: GameStateV7, to: CoordV7): number =>
      scoreV7(state, {
        kind: "MOVE",
        unitId: unitIdAtV7(state, at(2, 2)),
        path: [to],
      }).strategicValue;
    expect(value(near, at(3, 2)) - value(near, at(1, 1))).toBe(
      value(far, at(3, 2)) - value(far, at(1, 1)) + TOSS_ESCORT_VALUE_V7,
    );
  });
});

describe("Goblin Toss: against a Troll", () => {
  // Seat 1's Troll on (2, 3) with a Goblin beside it on (3, 3).
  const scene = (troll = true) =>
    field(
      ["ORIGINAL", "GOBLIN"],
      [
        own("GUARD", 6, 4),
        own("FIGHTER", 7, 2),
        foe("FIGHTER", 3, 3),
        ...(troll ? [foe(GIANT, 2, 3)] : [foe("FIGHTER", 2, 3)]),
      ],
    );

  it("reads the tiles around every landing tile as the Goblin's reach, as the engine offers the throws", () => {
    const state = scene();
    const reach = new Set(
      publicThreatenedTilesForPolicyV7(
        viewerViewV7(state),
        publicUnitAtV7(state, at(3, 3)),
      ).map(key),
    );
    const landings = queryPlayerCommandsV7(foeView(asFoe(state))).flatMap(
      (command) => (command.kind === "TOSS" ? [command.at] : []),
    );
    expect(landings.length).toBeGreaterThan(20);
    for (const landing of landings)
      for (let y = landing.y - 1; y <= landing.y + 1; y += 1)
        for (let x = landing.x - 1; x <= landing.x + 1; x += 1)
          if (x >= 0 && y >= 0 && x <= 10 && y <= 10)
            expect(reach.has(key(at(x, y))), `${x},${y}`).toBe(true);
    // Without the Troll the Goblin reaches two tiles (a step and its blast).
    const plain = scene(false);
    const walk = publicThreatenedTilesForPolicyV7(
      viewerViewV7(plain),
      publicUnitAtV7(plain, at(3, 3)),
    );
    expect(Math.max(...walk.map((tile) => gap(tile, at(3, 3))))).toBe(2);
    expect(reach.has(key(at(6, 4)))).toBe(true);
    expect(walk.map(key)).not.toContain(key(at(6, 4)));
  });

  it("does not bunch up where a thrown Goblin lands", () => {
    // (6, 3) is beside the Guard on (6, 4): a Goblin thrown onto (5, 3)
    // or (5, 4) hits both. Without the Troll no Goblin comes that far.
    const move = (state: GameStateV7): CommandV7 => ({
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(7, 2)),
      path: [at(6, 3)],
    });
    const state = scene();
    const plain = scene(false);
    expect(scoreV7(state, move(state)).safetyValue).toBe(-6);
    expect(scoreV7(plain, move(plain)).safetyValue).toBe(0);
    expect(scoreV7(state, move(state)).strategicValue).toBeLessThan(
      scoreV7(plain, move(plain)).strategicValue,
    );
    expect(moveCandidateV7(state, at(7, 2), at(6, 3))).toBeUndefined();
  });
});

describe("Thunder Stomp: the Brontosaurus's own seat", () => {
  const scene = (champion = 15) =>
    field(
      ["DINOSAUR", "ORIGINAL"],
      [
        own(GIANT, 4, 3),
        foe("FIGHTER", 5, 3),
        foe("SWORDSMAN", 4, 4, { hp: champion }),
        foe("KNIGHT", 3, 2),
      ],
    );
  const stomp = (state: GameStateV7): CommandV7 => ({
    kind: "STOMP",
    unitId: unitIdAtV7(state, at(4, 3)),
  });

  it("stomps three units, counted as its preview and its event have them", () => {
    const state = scene();
    const preview = previewStompV7(
      viewerViewV7(state),
      unitIdAtV7(state, at(4, 3)),
    );
    expect(preview?.results.map((result) => result.damage)).toEqual([
      STOMP_DAMAGE_V7,
      STOMP_DAMAGE_V7,
      STOMP_DAMAGE_V7,
    ]);
    const score = scoreV7(state, stomp(state));
    expect(score.immediateValue).toBe(10 * 3 * STOMP_DAMAGE_V7);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)).toEqual([stomp(state)]);
    expect(eventOf(turn.events, "THUNDER_STOMP").results).toEqual(
      preview?.results,
    );
    // It does not attack and does not walk away from a Stomp.
    expect(
      unitCandidatesV7(state, at(4, 3)).map((item) => item.command),
    ).toEqual([stomp(state)]);
  });

  it("attacks instead when the attack kills (and grows it)", () => {
    const state = scene(4);
    expect(previewOf(state, at(4, 3), at(4, 4)).defenderDies).toBe(true);
    expect(unitCandidatesV7(state, at(4, 3), "STOMP")).toEqual([]);
    expect(unitCommands(policyTurn(state).commands)[0]).toEqual(
      attackV7(state, at(4, 3), at(4, 4)),
    );
  });

  it("attacks one unit beside it when the blow is worth more than the one Stomp hit", () => {
    // A Fighter: the blow less its answer is worth more than 4 unanswered.
    const fighter = field(
      ["DINOSAUR", "ORIGINAL"],
      [own(GIANT, 4, 3), foe("FIGHTER", 5, 3)],
    );
    const blow = previewOf(fighter, at(4, 3), at(5, 3));
    expect(
      10 * blow.damageToDefender - 8 * blow.damageToAttacker,
    ).toBeGreaterThan(10 * STOMP_DAMAGE_V7);
    expect(unitCandidatesV7(fighter, at(4, 3), "STOMP")).toEqual([]);
    expect(best(fighter, at(4, 3))?.command).toEqual(
      attackV7(fighter, at(4, 3), at(5, 3)),
    );
    // A Guard: its answer costs more than the blow gains over the Stomp.
    const guard = field(
      ["DINOSAUR", "ORIGINAL"],
      [own(GIANT, 4, 3), foe("GUARD", 5, 3)],
    );
    const hard = previewOf(guard, at(4, 3), at(5, 3));
    expect(10 * hard.damageToDefender - 8 * hard.damageToAttacker).toBeLessThan(
      10 * STOMP_DAMAGE_V7,
    );
    expect(best(guard, at(4, 3))?.command).toEqual(stomp(guard));
  });

  it("stomps for the kills when the Stomp kills two", () => {
    const state = field(
      ["DINOSAUR", "ORIGINAL"],
      [
        own(GIANT, 4, 3),
        foe("FIGHTER", 5, 3, { hp: 4 }),
        foe("FIGHTER", 4, 4, { hp: 3 }),
      ],
    );
    const score = scoreV7(state, stomp(state));
    expect(score.priority).toBe(1180);
    expect(score.immediateValue).toBe(10 * 7 + 20 * 2);
    expect(best(state, at(4, 3))?.command).toEqual(stomp(state));
  });
});

describe("Thunder Stomp: against a Brontosaurus", () => {
  it("charges the Stomp's hit to the second unit that steps beside it", () => {
    // The Guard stands beside the Brontosaurus. A Fighter that steps
    // beside it too makes two for the Stomp; without the Guard it is one,
    // which the Brontosaurus attacks.
    const pieces = [own("FIGHTER", 6, 5), foe(GIANT, 4, 3)];
    const crowded = field(
      ["ORIGINAL", "DINOSAUR"],
      [...pieces, own("GUARD", 5, 3)],
    );
    const alone = field(
      ["ORIGINAL", "DINOSAUR"],
      [...pieces, own("GUARD", 9, 1)],
    );
    const move = (state: GameStateV7): CommandV7 => ({
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(6, 5)),
      path: [at(5, 4)],
    });
    // A Fighter (2 Coins, 12 HP) loses 4 of 12 of its value of 20.
    expect(
      scoreV7(alone, move(alone)).strategicValue -
        scoreV7(crowded, move(crowded)).strategicValue,
    ).toBe(Math.floor((20 * STOMP_DAMAGE_V7) / 12));
    // The engine: with both beside it the Stomp hits both for 4.
    const both = field(
      ["ORIGINAL", "DINOSAUR"],
      [own("FIGHTER", 5, 4), foe(GIANT, 4, 3), own("GUARD", 5, 3)],
    );
    expect(
      previewStompV7(
        foeView(asFoe(both)),
        unitIdAtV7(both, at(4, 3)),
      )?.results.map((result) => result.damage),
    ).toEqual([STOMP_DAMAGE_V7, STOMP_DAMAGE_V7]);
  });

  it("does not step a unit the Stomp would kill beside it", () => {
    const state = field(
      ["ORIGINAL", "DINOSAUR"],
      [
        own("FIGHTER", 6, 5, { hp: STOMP_DAMAGE_V7 }),
        own("GUARD", 5, 3),
        foe(GIANT, 4, 3),
      ],
    );
    expect(
      scoreV7(state, {
        kind: "MOVE",
        unitId: unitIdAtV7(state, at(6, 5)),
        path: [at(5, 4)],
      }).priority,
    ).toBe(-1);
    expect(moveCandidateV7(state, at(6, 5), at(5, 4))).toBeUndefined();
  });
});

describe("Overstride: the Colossus's own seat", () => {
  // The Colossus on (4, 3), a Fighter beside it as a screen, and a
  // Catapult two tiles behind the Fighter.
  const scene = (cooling: boolean, fighter = 12) =>
    field(
      ["MARTIAN", "ORIGINAL"],
      [
        own(GIANT, 4, 3, cooling ? { cooling: "COOLING" } : {}),
        foe("FIGHTER", 5, 3, { hp: fighter }),
        foe("CATAPULT", 7, 3),
      ],
    );
  const strides = (state: GameStateV7) =>
    unitCandidatesV7(state, at(4, 3), "MOVE").filter(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        candidate.command.path.length === 2 &&
        same(candidate.command.path[0] ?? at(0, 0), at(5, 3)),
    );

  it("strides over the screen to the Catapult while it is Cooling, the trample counted as its preview has it", () => {
    const state = scene(true);
    const stride = strides(state)[0];
    if (stride?.command.kind !== "MOVE") throw new Error("no stride");
    const trample = previewTrampleV7(
      viewerViewV7(state),
      stride.command.unitId,
      stride.command.path,
    );
    expect(trample?.map((hit) => [hit.unitId, hit.damage, hit.dies])).toEqual([
      [unitIdAtV7(state, at(5, 3)), TRAMPLE_DAMAGE_V7, false],
    ]);
    expect(stride.score.priority).toBe(ARMY_BREAKTHROUGH_MOVE_PRIORITY_V7);
    expect(stride.score.immediateValue).toBe(10 * TRAMPLE_DAMAGE_V7);
    // It ends beside the Catapult and fires at it.
    const end = stride.command.path[1] ?? at(0, 0);
    expect(gap(end, at(7, 3))).toBe(1);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)[0]).toEqual(
      best(state, at(4, 3))?.command,
    );
    expect(best(state, at(4, 3))?.command.kind).toBe("MOVE");
    expect(eventOf(turn.events, "UNITS_TRAMPLED").results).toEqual(trample);
    expect(unitCommands(turn.commands)[1]).toMatchObject({
      kind: "ATTACK",
      targetUnitId: unitIdAtV7(state, at(7, 3)),
    });
  });

  it("stands and fires its full ray when it is not Cooling", () => {
    const state = scene(false);
    for (const stride of strides(state))
      expect(stride.score.priority).toBeLessThan(
        ARMY_BREAKTHROUGH_MOVE_PRIORITY_V7,
      );
    expect(unitCommands(policyTurn(state).commands)[0]).toMatchObject({
      kind: "ATTACK",
      unitId: unitIdAtV7(state, at(4, 3)),
    });
  });

  it("gives a trample that kills a kill's tier", () => {
    // A Guard out of reach instead of the Catapult: nothing to fire at
    // after the stride, and the Fighter at 3 HP dies under it.
    const state = field(
      ["MARTIAN", "ORIGINAL"],
      [
        own(GIANT, 4, 3, { cooling: "COOLING" }),
        foe("FIGHTER", 5, 3, { hp: TRAMPLE_DAMAGE_V7 }),
        foe("GUARD", 9, 3),
      ],
    );
    const stride = strides(state)[0];
    expect(stride?.score.priority).toBe(1180);
    expect(stride?.score.immediateValue).toBe(10 * TRAMPLE_DAMAGE_V7 + 20);
  });
});

describe("Overstride: against a Colossus", () => {
  it("reads its reach past a screen exactly as the engine does", () => {
    // Seat 1's Colossus on (3, 3); a Fighter on (5, 3) screens a Catapult
    // on (7, 3). The Colossus steps over units and through zones of
    // control: (5, 4) and (6, 3) are tiles it strikes the Catapult from.
    const state = field(
      ["ORIGINAL", "MARTIAN"],
      [own("FIGHTER", 5, 3), own("CATAPULT", 7, 3), foe(GIANT, 3, 3)],
    );
    const policy = publicThreatenedTilesForPolicyV7(
      viewerViewV7(state),
      publicUnitAtV7(state, at(3, 3)),
    )
      .map(key)
      .sort();
    const engine = queryThreatenedTilesV7(
      state,
      unitIdAtV7(state, at(3, 3)),
      state.humanPlayerId,
    )
      .map(key)
      .sort();
    expect(policy).toEqual(engine);
    expect(policy).toContain(key(at(7, 3)));
    // The same position with a unit that walks: the screen holds.
    const walker = field(
      ["ORIGINAL", "ORIGINAL"],
      [own("FIGHTER", 5, 3), own("CATAPULT", 7, 3), foe("KNIGHT", 3, 3)],
    );
    expect(
      publicThreatenedTilesForPolicyV7(
        viewerViewV7(walker),
        publicUnitAtV7(walker, at(3, 3)),
      ).map(key),
    ).not.toContain(key(at(7, 3)));
  });
});

describe("Glacial Smash: the Frost Giant's own seat", () => {
  it("steps beside a unit, freezes it with the Cold Aura, and smashes it", () => {
    // A full Guard (17 HP) two tiles away with a Fighter beside it.
    const state = field(
      ["ICE_FOLK", "ORIGINAL"],
      [own(GIANT, 3, 3), foe("GUARD", 5, 3), foe("FIGHTER", 5, 2)],
    );
    const turn = policyTurn(state);
    const [step, blow] = unitCommands(turn.commands);
    if (step?.kind !== "MOVE") throw new Error("no step");
    const to = step.path.at(-1) ?? at(0, 0);
    expect(gap(to, at(5, 3))).toBe(1);
    expect(scoreV7(state, step).priority).toBe(SHATTER_SETUP_PRIORITY_V7);
    expect(blow).toEqual({
      kind: "ATTACK",
      unitId: step.unitId,
      targetUnitId: unitIdAtV7(state, at(5, 3)),
    });
    // The Cold Aura froze what the policy counted, and the engine's
    // preview of the blow after the step is the Glacial Smash it planned.
    const frozen = turn.events.filter((event) => event.kind === "UNITS_FROZEN");
    expect(frozen[0]).toMatchObject({ source: "COLD_AURA" });
    const moved = apply(state, step).state;
    expect(
      moved.frozen.map((entry) => entry.unitId).sort((a, b) => a - b),
    ).toEqual(
      state.units
        .filter(
          (unit) =>
            unit.ownerId !== state.humanPlayerId && gap(unit.at, to) === 1,
        )
        .map((unit) => unit.id)
        .sort((a, b) => a - b),
    );
    const smash = previewOf(moved, to, at(5, 3));
    expect([
      smash.shatters,
      smash.glacialSmash,
      smash.defenderDies,
      smash.damageToAttacker,
    ]).toEqual([true, true, true, 0]);
    expect(17 - GLACIAL_SMASH_HP_V7).toBeLessThanOrEqual(
      publicProjectedDamageForPolicyV7(
        viewerViewV7(state),
        publicUnitAtV7(state, at(3, 3)),
        publicUnitAtV7(state, at(5, 3)),
        at(5, 3),
      ),
    );
    // The projection of the blow on the Frozen Guard is the kill.
    expect(
      publicProjectedDamageForPolicyV7(
        viewerViewV7(moved),
        publicUnitAtV7(moved, to),
        publicUnitAtV7(moved, at(5, 3)),
        at(5, 3),
      ),
    ).toBe(17);
    expect(turn.state.units.some((unit) => same(unit.at, at(5, 3)))).toBe(
      false,
    );
    // It never advances: it stands where it struck from.
    expect(unitAtV7(turn.state, to).role).toBe(GIANT);
  });

  it("counts the units its shards newly freeze, as the event has them", () => {
    // The Guard is Frozen already; two Fighters stand beside it, out of
    // the Giant's own reach.
    const state = field(
      ["ICE_FOLK", "ORIGINAL"],
      [
        own(GIANT, 4, 3, { activation: { moved: true, movedPathLength: 1 } }),
        foe("GUARD", 5, 3, { frozen: { turnsLeft: 1 } }),
        foe("FIGHTER", 6, 3),
        foe("FIGHTER", 6, 2),
      ],
    );
    const lone = field(
      ["ICE_FOLK", "ORIGINAL"],
      [
        own(GIANT, 4, 3, { activation: { moved: true, movedPathLength: 1 } }),
        foe("GUARD", 5, 3, { frozen: { turnsLeft: 1 } }),
        foe("FIGHTER", 8, 3),
        foe("FIGHTER", 8, 2),
      ],
    );
    const blow = (scene: GameStateV7) => attackV7(scene, at(4, 3), at(5, 3));
    expect(previewOf(state, at(4, 3), at(5, 3)).glacialSmash).toBe(true);
    expect(
      scoreV7(state, blow(state)).strategicValue -
        scoreV7(lone, blow(lone)).strategicValue,
    ).toBe(2 * GLACIAL_FREEZE_VALUE_V7);
    const shards = apply(state, blow(state)).events.find(
      (event) => event.kind === "UNITS_FROZEN" && event.source === "SHARDS",
    );
    expect(
      shards?.kind === "UNITS_FROZEN"
        ? shards.results.map((entry) => entry.unitId)
        : [],
    ).toEqual(
      [unitIdAtV7(state, at(6, 3)), unitIdAtV7(state, at(6, 2))].sort(),
    );
  });
});

describe("Glacial Smash: against a Frost Giant", () => {
  // Seat 1's Frost Giant on (4, 3): (5, 3) is where it strikes a unit on
  // (6, 3) from, after the step that freezes it.
  const scene = (guardAt: CoordV7, giantAt = at(4, 3)) =>
    field(
      ["ORIGINAL", "ICE_FOLK"],
      [
        own("GUARD", guardAt.x, guardAt.y),
        own("FIGHTER", 9, 1),
        foe(GIANT, giantAt.x, giantAt.y),
      ],
    );

  it("counts a unit its smash would kill as lost, as the engine resolves it", () => {
    const state = scene(at(7, 3));
    const move: CommandV7 = {
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(7, 3)),
      path: [at(6, 3)],
    };
    // The Giant's blow alone leaves the Guard at 8 or less, alive ...
    const blow = publicProjectedDamageForPolicyV7(
      viewerViewV7(state),
      publicUnitAtV7(state, at(4, 3)),
      publicUnitAtV7(state, at(7, 3)),
      at(6, 3),
    );
    expect(17 - blow).toBeGreaterThan(0);
    expect(17 - blow).toBeLessThanOrEqual(GLACIAL_SMASH_HP_V7);
    // ... and the danger of the tile is the whole unit.
    const score = scoreV7(state, move);
    expect(score.safetyValue).toBe(-17);
    // The Move costs half the unit's value and is not made.
    expect([score.priority, score.strategicValue]).toEqual([
      -1,
      -Math.floor(
        ((effectiveRoleRuleV7("GUARD", "ORIGINAL").cost ?? 0) * 4 + 17) / 2,
      ),
    ]);
    expect(moveCandidateV7(state, at(7, 3), at(6, 3))).toBeUndefined();
    // The engine: the Giant steps beside the Guard (the Cold Aura freezes
    // it) and its blow shatters it.
    const there = asFoe(scene(at(6, 3)));
    const giant = unitIdAtV7(there, at(4, 3));
    const stepped = applyOkV7(there, seatIdV7(there, 1), {
      kind: "MOVE",
      unitId: giant,
      path: [at(5, 3)],
    }).state;
    const smash = calculateCombatPreviewV7(
      stepped,
      giant,
      unitIdAtV7(stepped, at(6, 3)),
    );
    expect([
      smash.damageToDefender,
      smash.shatters,
      smash.defenderDies,
    ]).toEqual([17, true, true]);
  });

  it("leaves a unit the smash would not kill its Move", () => {
    // Another giant is never shattered.
    const state = field(
      ["ORIGINAL", "ICE_FOLK"],
      [own(GIANT, 7, 3), own("FIGHTER", 9, 1), foe(GIANT, 4, 3)],
    );
    const score = scoreV7(state, {
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(7, 3)),
      path: [at(6, 3)],
    });
    // Its danger there is the blow, and the Move costs it nothing.
    expect(score.safetyValue).toBe(
      -publicProjectedDamageForPolicyV7(
        viewerViewV7(state),
        publicUnitAtV7(state, at(4, 3)),
        publicUnitAtV7(state, at(7, 3)),
        at(6, 3),
      ),
    );
    expect(score.safetyValue).toBeGreaterThan(-40);
    expect(score.strategicValue).toBeGreaterThanOrEqual(0);
  });
});

describe("Siege Hammer: the Brass Titan's own seat", () => {
  // Seat 1's capital (2, 8) with Walls, a Guard on its center, and a
  // Field Defense there. Neither seat has Explosives (with it every melee
  // blow of a seat ignores fortification: Breach).
  const scene = (
    factions: readonly [FactionIdV7, FactionIdV7],
    pieces: readonly CandyPieceV7[],
    walls = true,
  ): GameStateV7 => {
    const state = fieldDefenseV7(
      field(factions, [...pieces, foe("GUARD", 2, 8)], {
        techs: noExplosives(factions),
      }),
      at(2, 8),
    );
    return walls ? walledCityV7(state, at(2, 8)) : state;
  };

  it("strikes the garrison of a walled center first, counted as the preview and the events have it", () => {
    const state = scene(["DWARF", "ORIGINAL"], [own(GIANT, 3, 7)]);
    const preview = previewOf(state, at(3, 7), at(2, 8));
    expect([
      preview.siegeHammer,
      preview.wallsDestroyed,
      preview.defenderDies,
    ]).toEqual([true, true, false]);
    const blow = attackV7(state, at(3, 7), at(2, 8));
    const score = scoreV7(state, blow);
    expect(score.priority).toBe(SIEGE_HAMMER_FIRST_PRIORITY_V7);
    expect(score.immediateValue).toBe(
      10 * preview.damageToDefender - 8 * preview.damageToAttacker,
    );
    // The same blow of a giant without the signature: a Troll's.
    const plain = scene(["GOBLIN", "ORIGINAL"], [own(GIANT, 3, 7)]);
    expect(
      scoreV7(plain, attackV7(plain, at(3, 7), at(2, 8))).priority,
    ).toBeLessThan(SIEGE_HAMMER_FIRST_PRIORITY_V7);
    // Without the Walls it ignores and smashes the Field Defense alone.
    const unwalled = scene(["DWARF", "ORIGINAL"], [own(GIANT, 3, 7)], false);
    const open = previewOf(unwalled, at(3, 7), at(2, 8));
    expect(open.wallsDestroyed).toBe(false);
    expect(open.fortificationIgnored).toBeLessThan(
      preview.fortificationIgnored,
    );
    const openScore = scoreV7(unwalled, attackV7(unwalled, at(3, 7), at(2, 8)));
    expect(openScore.priority).toBe(SIEGE_HAMMER_FIRST_PRIORITY_V7);
    expect(score.strategicValue - openScore.strategicValue).toBe(
      SIEGE_HAMMER_WALLS_VALUE_V7 +
        (preview.fortificationIgnored - open.fortificationIgnored) *
          SIEGE_HAMMER_LEVEL_VALUE_V7,
    );
    expect(GIANT_FIELD_DEFENSE_VALUE_V7).toBeGreaterThan(0);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)[0]).toEqual(blow);
    expect(turn.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["WALLS_DESTROYED", "FIELD_DEFENSE_DESTROYED"]),
    );
  });

  it("projects its blow without the fortification, as the engine previews it", () => {
    const state = scene(["DWARF", "ORIGINAL"], [own(GIANT, 3, 7)]);
    const preview = previewOf(state, at(3, 7), at(2, 8));
    expect(
      publicProjectedDamageForPolicyV7(
        viewerViewV7(state),
        publicUnitAtV7(state, at(3, 7)),
        publicUnitAtV7(state, at(2, 8)),
        at(2, 8),
      ),
    ).toBe(preview.damageToDefender);
    // A Troll's blow on the same Guard meets every level (and its
    // projection is the engine's preview too).
    const plain = scene(["GOBLIN", "ORIGINAL"], [own(GIANT, 3, 7)]);
    const met = previewOf(plain, at(3, 7), at(2, 8));
    expect(met.fortificationLevel).toBe(preview.fortificationIgnored);
    expect(met.damageToDefender).toBeLessThan(preview.damageToDefender);
    expect(
      publicProjectedDamageForPolicyV7(
        viewerViewV7(plain),
        publicUnitAtV7(plain, at(3, 7)),
        publicUnitAtV7(plain, at(2, 8)),
        at(2, 8),
      ),
    ).toBe(met.damageToDefender);
  });

  it("walks toward the nearest hostile city with Walls", () => {
    const move = (state: GameStateV7): CommandV7 => ({
      kind: "MOVE",
      unitId: unitIdAtV7(state, at(6, 4)),
      path: [at(5, 5)],
    });
    const walled = scene(["DWARF", "ORIGINAL"], [own(GIANT, 6, 4)]);
    const open = scene(["DWARF", "ORIGINAL"], [own(GIANT, 6, 4)], false);
    expect(
      scoreV7(walled, move(walled)).strategicValue -
        scoreV7(open, move(open)).strategicValue,
    ).toBe(SIEGE_HAMMER_APPROACH_VALUE_V7);
  });
});

describe("Siege Hammer: against a Brass Titan", () => {
  it("projects a hostile Titan's blow on its own walled garrison as the engine resolves it", () => {
    // Seat 0's capital (8, 8) with Walls and a Field Defense; seat 1's
    // Titan beside it.
    const state = walledCityV7(
      fieldDefenseV7(
        field(
          ["ORIGINAL", "DWARF"],
          [own("GUARD", 8, 8), foe(GIANT, 7, 7), foe("FIGHTER", 7, 6)],
          { techs: noExplosives(["ORIGINAL", "DWARF"]) },
        ),
        at(8, 8),
      ),
      at(8, 8),
    );
    const blow = calculateCombatPreviewV7(
      asFoe(state),
      unitIdAtV7(state, at(7, 7)),
      unitIdAtV7(state, at(8, 8)),
    );
    expect(blow.siegeHammer).toBe(true);
    expect(blow.fortificationIgnored).toBeGreaterThan(1);
    const view = viewerViewV7(state);
    expect(
      publicProjectedDamageForPolicyV7(
        view,
        publicUnitAtV7(state, at(7, 7)),
        publicUnitAtV7(state, at(8, 8)),
        at(8, 8),
      ),
    ).toBe(blow.damageToDefender);
    // A Hammerer in the Titan's place meets the Walls and the Field
    // Defense, in the engine and in the projection alike.
    const other = walledCityV7(
      fieldDefenseV7(
        field(
          ["ORIGINAL", "DWARF"],
          [own("GUARD", 8, 8), foe("FIGHTER", 7, 7)],
          { techs: noExplosives(["ORIGINAL", "DWARF"]) },
        ),
        at(8, 8),
      ),
      at(8, 8),
    );
    const fighter = calculateCombatPreviewV7(
      asFoe(other),
      unitIdAtV7(other, at(7, 7)),
      unitIdAtV7(other, at(8, 8)),
    );
    expect(fighter.fortificationLevel).toBe(blow.fortificationIgnored);
    expect(
      publicProjectedDamageForPolicyV7(
        viewerViewV7(other),
        publicUnitAtV7(other, at(7, 7)),
        publicUnitAtV7(other, at(8, 8)),
        at(8, 8),
      ),
    ).toBe(fighter.damageToDefender);
  });
});

describe("Break Off: the Gingerbread Giant's own seat", () => {
  // The Giant on (5, 3); two Guards three tiles to the east (no blow of
  // its own reaches them, and no Rush kills one).
  const scene = (
    hp = 40,
    foes: readonly CandyPieceV7[] = [foe("GUARD", 8, 3), foe("GUARD", 8, 4)],
    options: CandyFieldOptionsV7 = {},
    extra: readonly CandyPieceV7[] = [],
  ) =>
    field(
      ["CANDY", "ORIGINAL"],
      [own(GIANT, 5, 3, { hp }), ...extra, ...foes],
      options,
    );

  it("breaks two Gingerbread Men off toward the enemy, as its preview and its event have it", () => {
    const state = scene();
    const offered = queryPlayerCommandsV7(viewerViewV7(state)).filter(
      (command) => command.kind === "BREAK_OFF",
    );
    // One of the twenty-eight pairs the engine offers.
    expect(offered).toHaveLength(28);
    const candidates = unitCandidatesV7(state, at(5, 3), "BREAK_OFF");
    expect(candidates).toHaveLength(1);
    const command = candidates[0]?.command;
    if (command?.kind !== "BREAK_OFF") throw new Error("no break off");
    expect(command.tiles.map((tile) => tile.x)).toEqual([6, 6]);
    expect(candidates[0]?.score.priority).toBe(BREAK_OFF_PRIORITY_V7);
    const preview = previewBreakOffV7(viewerViewV7(state), command.unitId);
    expect([preview?.hpAfter, preview?.count, preview?.trooperHp]).toEqual([
      40 - BREAK_OFF_HP_V7,
      2,
      10,
    ]);
    // Two pieces of 10 HP for 10 HP of the Giant.
    expect(candidates[0]?.score.immediateValue).toBe(8 * (2 * 10 - 10));
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)[0]).toEqual(command);
    const broke = eventOf(turn.events, "GIANT_BROKE_OFF");
    expect(broke.tiles).toEqual(command.tiles);
    expect(
      turn.state.units.find((unit) => unit.id === command.unitId)?.hp,
    ).toBe(preview?.hpAfter);
    expect(command.tiles.map((tile) => unitAtV7(turn.state, tile).hp)).toEqual([
      10, 10,
    ]);
  });

  it("does not break off below 26 HP, away from the enemy, or instead of a kill", () => {
    expect(
      unitCandidatesV7(
        scene(BREAK_OFF_MINIMUM_HP_V7 - 1),
        at(5, 3),
        "BREAK_OFF",
      ),
    ).toEqual([]);
    expect(
      unitCandidatesV7(scene(BREAK_OFF_MINIMUM_HP_V7), at(5, 3), "BREAK_OFF"),
    ).toHaveLength(1);
    // No enemy within four tiles.
    expect(
      unitCandidatesV7(scene(40, [foe("GUARD", 10, 3)]), at(5, 3), "BREAK_OFF"),
    ).toEqual([]);
    // A Fighter at 2 HP beside it: the blow kills it.
    const kill = scene(40, [
      foe("FIGHTER", 6, 3, { hp: 2 }),
      foe("GUARD", 8, 4),
    ]);
    expect(unitCandidatesV7(kill, at(5, 3), "BREAK_OFF")).toEqual([]);
    expect(unitCommands(policyTurn(kill).commands)[0]).toEqual(
      attackV7(kill, at(5, 3), at(6, 3)),
    );
  });

  it("keeps a blow that does not kill for the Break Off", () => {
    const state = scene(40, [foe("GUARD", 6, 3), foe("GUARD", 8, 4)]);
    expect(previewOf(state, at(5, 3), at(6, 3)).defenderDies).toBe(false);
    expect(unitCandidatesV7(state, at(5, 3), "ATTACK")).toEqual([]);
    expect(best(state, at(5, 3))?.command.kind).toBe("BREAK_OFF");
  });

  it("comes after a Re-bake (the two pieces put the home city over its limit)", () => {
    expect(BREAK_OFF_PRIORITY_V7).toBeLessThan(REBAKE_PRIORITY_V7);
    // A Confectioner with the Crumbs of a Trooper beside it, and Coins.
    const state = scene(
      40,
      undefined,
      { coins: 100, crumbs: [{ at: at(3, 5), role: "FIGHTER" }] },
      [own("CAPTAIN", 4, 4)],
    );
    const units = unitCommands(policyTurn(state).commands).map(
      (command) => command.kind,
    );
    expect(units).toContain("REBAKE");
    expect(units).toContain("BREAK_OFF");
    expect(units.indexOf("REBAKE")).toBeLessThan(units.indexOf("BREAK_OFF"));
  });
});
