import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  type NormalAiDecisionV7,
  type ScoredAiCandidateV7,
} from "../../src/ai/v7";
import {
  CHOKEPOINT_ASSAULT_BANK_V7,
  CHOKEPOINT_COMMIT_PRIORITY_V7,
  CHOKEPOINT_FIRE_PRIORITY_V7,
  CHOKEPOINT_LANE_PRIORITY_V7,
  CHOKEPOINT_ROTATE_PRIORITY_V7,
  chokepointAssaultV7,
  chokepointPlaceAllowedV7,
  chokepointPlanForPolicyV7,
  chokepointShouldVacateV7,
  chokepointUnitClassV7,
  setChokepointPolicyOptionsV7,
  type ChokepointPlanV7,
} from "../../src/ai/v7-chokepoint";
import {
  applyCommandV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  missionByIdV7,
  missionMatchSetupV7,
  unitId,
  viewForV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { factionTreeIdV7 } from "../../src/engine/rules/ruleset-v7";
import { browserSetupV7, checkedV7 } from "../fixtures/v7-builders";

// `TEST_NECK` (src/engine/v7/missions/test-neck.ts): the Human shore (x 0–3)
// and the Undead shore (x 6–10) are joined only by the neck (4, 5), (5, 5).
// The apron is (3, 4), (3, 5), (3, 6), the lane's tail (3, 5); the mouth is
// (6, 4), (6, 5), (6, 6), fortified and in the Undead capital's territory.
const ENTRANCE = { x: 4, y: 5 } as const;
const FAR = { x: 5, y: 5 } as const;
const TAIL = { x: 3, y: 5 } as const;
const APRON_NORTH = { x: 3, y: 4 } as const;
const MOUTH = { x: 6, y: 5 } as const;
const MOUTH_NORTH = { x: 6, y: 4 } as const;

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

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

const same = (left: CoordV7 | undefined, right: CoordV7): boolean =>
  left !== undefined && left.x === right.x && left.y === right.y;

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

/**
 * The `TEST_NECK` board with every tile explored by both seats, seat 0
 * active with `coins` Coins, and the given pieces as the only units.
 */
function neck(
  pieces: readonly Piece[],
  coins = 0,
  faction: FactionIdV7 = "ORIGINAL",
): GameStateV7 {
  const mission = required(missionByIdV7("TEST_NECK"));
  const created = createPlayableGameV7(
    required(missionMatchSetupV7(mission, "ORIGINAL")),
  );
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const seat = (index: number) =>
    required(base.players.find((player) => player.seat === index));
  let nextEntityId = base.nextEntityId;
  const units = pieces.map((piece): UnitStateV7 => {
    const owner = seat(piece.seat);
    const rule = effectiveRoleRuleV7(
      piece.role,
      piece.seat === 0 ? faction : owner.faction,
    );
    const id = unitId(nextEntityId);
    nextEntityId += 1;
    return {
      id,
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
  const every: CoordV7[] = [];
  for (let y = 0; y < base.board.height; y += 1)
    for (let x = 0; x < base.board.width; x += 1) every.push({ x, y });
  const state: GameStateV7 = {
    ...base,
    nextEntityId,
    setup: {
      ...base.setup,
      factions: [faction, ...base.setup.factions.slice(1)],
    },
    activeSeatIndex: base.turnOrder.indexOf(seat(0).id),
    players: base.players.map((player) => ({
      ...player,
      coins: player.seat === 0 ? coins : 0,
      ...(player.seat === 0
        ? { faction, factionTreeId: factionTreeIdV7(faction) }
        : {}),
      explored: every,
    })),
    cities: base.cities.map((city) => ({
      ...city,
      cityActionAvailable: false,
    })),
    units,
  };
  // A mission fixes its seats' factions, so the parser refuses the swapped
  // seat; the view and the policy read the state as it is.
  return faction === "ORIGINAL" ? checkedV7(state) : state;
}

function viewFor(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, required(state.turnOrder[state.activeSeatIndex]));
}

function planFor(view: PlayerViewV7): ChokepointPlanV7 | null {
  return chokepointPlanForPolicyV7(view, {
    isHostile: (owner) => owner !== view.viewer.id,
    isAllied: () => false,
  });
}

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(state.units.find((unit) => same(unit.at, at)));
}

function moveOf(
  decision: NormalAiDecisionV7,
  unit: UnitStateV7,
  to: CoordV7,
): ScoredAiCandidateV7 | undefined {
  return decision.candidates.find(
    (candidate) =>
      candidate.command.kind === "MOVE" &&
      candidate.command.unitId === unit.id &&
      same(candidate.command.path.at(-1), to) &&
      candidate.score.priority >= 0,
  );
}

function attacksOf(
  decision: NormalAiDecisionV7,
  unit: UnitStateV7,
): readonly ScoredAiCandidateV7[] {
  return decision.candidates.filter(
    (candidate) =>
      candidate.command.kind === "ATTACK" &&
      candidate.command.unitId === unit.id &&
      candidate.score.priority >= 0,
  );
}

const GATE: readonly Piece[] = [
  { seat: 1, role: "GUARD", at: MOUTH },
  { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
];

describe("ruleset-7 Normal AI siege of a single-file front (pulp_wars-68k.6)", () => {
  describe("detection", () => {
    it("finds the neck, its head, the holders, and the lane's tail", () => {
      const view = viewFor(
        neck([{ seat: 0, role: "GUARD", at: { x: 2, y: 5 } }, ...GATE]),
      );
      const plan = required(planFor(view));
      expect(plan.target.at).toEqual({ x: 8, y: 5 });
      expect(plan.corridor).toEqual([ENTRANCE, FAR]);
      expect(plan.headIndex).toBe(1);
      expect(plan.holders.map((unit) => unit.at)).toEqual([MOUTH]);
      expect(plan.garrison).toHaveLength(2);
      expect(plan.open).toBe(false);
      expect(plan.laneApron).toEqual(TAIL);
      expect(plan.indexOf(ENTRANCE)).toBe(0);
      expect(plan.indexOf(TAIL)).toBeUndefined();
      expect(plan.homeSide(TAIL)).toBe(true);
      expect(plan.homeSide(APRON_NORTH)).toBe(true);
      expect(plan.homeSide(ENTRANCE)).toBe(false);
      expect(plan.homeSide(MOUTH)).toBe(false);
    });

    it("puts the head behind a hostile unit on the corridor", () => {
      const view = viewFor(
        neck([
          { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
          { seat: 1, role: "GUARD", at: FAR },
          { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
        ]),
      );
      const plan = required(planFor(view));
      expect(plan.headIndex).toBe(0);
      expect(plan.holders.map((unit) => unit.at)).toEqual([FAR]);
      const entered = viewFor(
        neck([
          { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
          { seat: 1, role: "GUARD", at: ENTRANCE },
          { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
        ]),
      );
      expect(required(planFor(entered)).headIndex).toBe(-1);
    });

    it("needs a garrison unit in its own territory: a skirmish on the neck is no front", () => {
      expect(
        planFor(
          viewFor(
            neck([
              { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
              { seat: 1, role: "GUARD", at: FAR },
            ]),
          ),
        ),
      ).toBeNull();
    });

    it("reads an empty mouth with a garrison behind it as open, and no front without hostile units near", () => {
      const open = required(
        planFor(
          viewFor(
            neck([
              { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
              { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
            ]),
          ),
        ),
      );
      expect(open.open).toBe(true);
      expect(open.holders).toEqual([]);
      expect(open.garrison.map((unit) => unit.at)).toEqual([{ x: 8, y: 5 }]);
      expect(
        planFor(
          viewFor(
            neck([
              { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
              { seat: 1, role: "FIGHTER", at: { x: 9, y: 2 } },
            ]),
          ),
        ),
      ).toBeNull();
    });

    it("finds the isthmus of Bone Neck", () => {
      const mission = required(missionByIdV7("FRONTIER_4"));
      const created = createPlayableGameV7(
        required(missionMatchSetupV7(mission, "ORIGINAL")),
      );
      if (!created.ok) throw new Error(created.error.code);
      const every: CoordV7[] = [];
      for (let y = 0; y < created.state.board.height; y += 1)
        for (let x = 0; x < created.state.board.width; x += 1)
          every.push({ x, y });
      const explored = checkedV7({
        ...created.state,
        players: created.state.players.map((player) => ({
          ...player,
          explored: every,
        })),
      });
      const human = required(planFor(viewFor(explored)));
      expect(human.corridor).toEqual([
        { x: 7, y: 8 },
        { x: 8, y: 8 },
        { x: 9, y: 8 },
      ]);
      expect(human.target.at).toEqual({ x: 11, y: 8 });
      expect(human.holders.map((unit) => unit.at)).toEqual([
        { x: 10, y: 7 },
        { x: 10, y: 8 },
        { x: 10, y: 9 },
      ]);
    });

    it("has no front on an open board, with the switch off, or for a switched-off seat", () => {
      const created = createPlayableGameV7(browserSetupV7(71));
      if (!created.ok) throw new Error(created.error.code);
      const every: CoordV7[] = [];
      for (let y = 0; y < created.state.board.height; y += 1)
        for (let x = 0; x < created.state.board.width; x += 1)
          every.push({ x, y });
      const explored = checkedV7({
        ...created.state,
        players: created.state.players.map((player) => ({
          ...player,
          explored: every,
        })),
      });
      expect(planFor(viewFor(explored))).toBeNull();

      const view = viewFor(
        neck([{ seat: 0, role: "GUARD", at: { x: 2, y: 5 } }, ...GATE]),
      );
      expect(planFor(view)).not.toBeNull();
      const previous = setChokepointPolicyOptionsV7({ siege: false });
      try {
        expect(planFor(view)).toBeNull();
        setChokepointPolicyOptionsV7({ siege: true, offSeats: [0] });
        expect(planFor(view)).toBeNull();
        setChokepointPolicyOptionsV7({ siege: true, offSeats: [1] });
        expect(planFor(view)).not.toBeNull();
      } finally {
        setChokepointPolicyOptionsV7(previous);
      }
    });
  });

  describe("the lane", () => {
    it("keeps a siege unit out of the corridor until a melee unit screens it", () => {
      const alone = neck([
        { seat: 0, role: "CATAPULT", at: APRON_NORTH },
        { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
        ...GATE,
      ]);
      const view = viewFor(alone);
      const plan = required(planFor(view));
      const catapult = unitAt(alone, APRON_NORTH);
      expect(chokepointUnitClassV7(view, catapult)).toBe("RANGED");
      expect(chokepointPlaceAllowedV7(view, plan, catapult, ENTRANCE)).toBe(
        false,
      );
      expect(moveOf(chooseNormalCommandV7(view), catapult, ENTRANCE)).toBe(
        undefined,
      );

      const screened = neck([
        { seat: 0, role: "CATAPULT", at: APRON_NORTH },
        { seat: 0, role: "GUARD", at: FAR },
        ...GATE,
      ]);
      const screenedView = viewFor(screened);
      const screenedPlan = required(planFor(screenedView));
      const behind = unitAt(screened, APRON_NORTH);
      expect(
        chokepointPlaceAllowedV7(screenedView, screenedPlan, behind, ENTRANCE),
      ).toBe(true);
      // From the apron it already reaches the mouth: it fires.
      const decision = chooseNormalCommandV7(screenedView);
      expect(attacksOf(decision, behind)[0]?.score.priority).toBe(
        CHOKEPOINT_FIRE_PRIORITY_V7,
      );
      expect(decision.command).toEqual(attacksOf(decision, behind)[0]?.command);
    });

    it("walks a siege unit to a firing tile off the corridor", () => {
      const state = neck([
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 3 } },
        { seat: 0, role: "GUARD", at: FAR },
        ...GATE,
      ]);
      const view = viewFor(state);
      const catapult = unitAt(state, { x: 1, y: 3 });
      const decision = chooseNormalCommandV7(view);
      const walks = decision.candidates.filter(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          candidate.command.unitId === catapult.id &&
          candidate.score.priority === CHOKEPOINT_LANE_PRIORITY_V7,
      );
      // Toward the tiles three from the mouth (x 3), never the lane's tail.
      expect(walks.length).toBeGreaterThan(0);
      for (const walk of walks)
        expect(
          walk.command.kind === "MOVE" && walk.command.path.at(-1)?.x,
        ).toBe(2);
      expect(decision.command).toEqual(walks[0]?.command);
    });

    it("keeps siege and support units off the lane's tail, and moves one off it", () => {
      const state = neck([
        { seat: 0, role: "CATAPULT", at: TAIL },
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 4 } },
        { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
        ...GATE,
      ]);
      const view = viewFor(state);
      const plan = required(planFor(view));
      const catapult = unitAt(state, TAIL);
      const captain = unitAt(state, { x: 2, y: 4 });
      const guard = unitAt(state, { x: 2, y: 5 });
      expect(chokepointPlaceAllowedV7(view, plan, catapult, TAIL)).toBe(false);
      expect(chokepointPlaceAllowedV7(view, plan, captain, TAIL)).toBe(false);
      expect(chokepointPlaceAllowedV7(view, plan, captain, ENTRANCE)).toBe(
        false,
      );
      expect(chokepointPlaceAllowedV7(view, plan, guard, TAIL)).toBe(true);
      // The parked Catapult fires while it has a shot (the mouth is three
      // tiles away), and never enters the corridor.
      const decision = chooseNormalCommandV7(view);
      expect(moveOf(decision, catapult, ENTRANCE)).toBe(undefined);
      expect(decision.command).toEqual(
        attacksOf(decision, catapult)[0]?.command,
      );
      // With nothing to fire at, it leaves the tail to the column.
      const idle = neck([
        { seat: 0, role: "CATAPULT", at: TAIL },
        { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
      ]);
      const parked = unitAt(idle, TAIL);
      const leaving = chooseNormalCommandV7(viewFor(idle)).candidates.filter(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          candidate.command.unitId === parked.id &&
          candidate.score.priority === CHOKEPOINT_LANE_PRIORITY_V7,
      );
      expect(leaving.length).toBeGreaterThan(0);
      for (const move of leaving)
        expect(
          move.command.kind === "MOVE" &&
            same(move.command.path.at(-1), ENTRANCE),
        ).toBe(false);
    });

    it("leaves the lane behind the head and the apron beside its tail to the siege units", () => {
      const pieces: Piece[] = [
        { seat: 0, role: "GUARD", at: FAR },
        { seat: 0, role: "GUARD", at: TAIL },
        ...GATE,
      ];
      // No siege unit: the second Guard follows the head.
      const free = neck(pieces);
      const freeView = viewFor(free);
      expect(
        chokepointPlaceAllowedV7(
          freeView,
          required(planFor(freeView)),
          unitAt(free, TAIL),
          ENTRANCE,
        ),
      ).toBe(true);
      // A Catapult is staged: one melee unit holds the head, and the lane
      // behind it and the apron's other tiles are the Catapult's.
      const siege = neck([
        ...pieces,
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 4 } },
      ]);
      const view = viewFor(siege);
      const plan = required(planFor(view));
      const second = unitAt(siege, TAIL);
      expect(chokepointPlaceAllowedV7(view, plan, second, ENTRANCE)).toBe(
        false,
      );
      expect(chokepointPlaceAllowedV7(view, plan, second, APRON_NORTH)).toBe(
        false,
      );
      expect(chokepointPlaceAllowedV7(view, plan, second, TAIL)).toBe(true);
      const decision = chooseNormalCommandV7(view);
      expect(moveOf(decision, second, ENTRANCE)).toBe(undefined);
      expect(moveOf(decision, second, APRON_NORTH)).toBe(undefined);
      // The Catapult walks to a firing tile, never onto the tail.
      const catapult = unitAt(siege, { x: 2, y: 4 });
      expect(
        decision.candidates.some(
          (candidate) =>
            candidate.command.kind === "MOVE" &&
            candidate.command.unitId === catapult.id &&
            candidate.score.priority === CHOKEPOINT_LANE_PRIORITY_V7,
        ),
      ).toBe(true);
      expect(moveOf(decision, catapult, TAIL)).toBe(undefined);
    });

    it("besieges with a Candy seat as with any other", () => {
      // The Candy revision (the eighth faction): the front, the unit
      // classes, and the lane read the seat's own roster.
      const state = neck(
        [
          { seat: 0, role: "GUARD", at: TAIL },
          { seat: 0, role: "CATAPULT", at: APRON_NORTH },
          ...GATE,
        ],
        0,
        "CANDY",
      );
      const view = viewFor(state);
      expect(view.viewer.faction).toBe("CANDY");
      const plan = required(planFor(view));
      expect(plan.corridor).toEqual([ENTRANCE, FAR]);
      expect(plan.holders.map((unit) => unit.at)).toEqual([MOUTH]);
      const guard = unitAt(state, TAIL);
      const siege = unitAt(state, APRON_NORTH);
      expect(["HEAD", "MELEE"]).toContain(chokepointUnitClassV7(view, guard));
      expect(chokepointPlaceAllowedV7(view, plan, guard, ENTRANCE)).toBe(true);
      const decision = chooseNormalCommandV7(view);
      expect(decision.command).not.toBeNull();
      // Whatever the Candy siege role is, it never corks the entrance alone.
      if (chokepointUnitClassV7(view, siege) !== "HEAD")
        expect(
          chokepointUnitClassV7(view, siege) === "MELEE" ||
            !chokepointPlaceAllowedV7(view, plan, siege, ENTRANCE),
        ).toBe(true);
    });

    it("sends a fit melee unit to the head, the strongest first", () => {
      const state = neck([
        { seat: 0, role: "GUARD", at: TAIL },
        { seat: 0, role: "FIGHTER", at: APRON_NORTH },
        ...GATE,
      ]);
      const decision = chooseNormalCommandV7(viewFor(state));
      const guard = moveOf(decision, unitAt(state, TAIL), ENTRANCE);
      const fighter = moveOf(decision, unitAt(state, APRON_NORTH), ENTRANCE);
      expect(guard?.score.priority).toBe(CHOKEPOINT_LANE_PRIORITY_V7);
      expect(fighter?.score.priority).toBe(CHOKEPOINT_LANE_PRIORITY_V7);
      expect(guard?.score.strategicValue).toBeGreaterThan(
        fighter?.score.strategicValue ?? Number.POSITIVE_INFINITY,
      );
      expect(decision.command).toEqual(guard?.command);
    });
  });

  describe("rotation", () => {
    it("takes a wounded head out when the tile behind it is free", () => {
      const state = neck([
        { seat: 0, role: "GUARD", at: FAR, hp: 5 },
        { seat: 0, role: "GUARD", at: TAIL },
        ...GATE,
      ]);
      const view = viewFor(state);
      const plan = required(planFor(view));
      const head = unitAt(state, FAR);
      expect(chokepointShouldVacateV7(view, plan, head)).toBe(true);
      const decision = chooseNormalCommandV7(view);
      expect(moveOf(decision, head, ENTRANCE)?.score.priority).toBe(
        CHOKEPOINT_ROTATE_PRIORITY_V7,
      );
      expect(decision.command).toEqual(
        moveOf(decision, head, ENTRANCE)?.command,
      );
      // Its relief does not step into its way out.
      const relief = unitAt(state, TAIL);
      expect(chokepointPlaceAllowedV7(view, plan, relief, ENTRANCE)).toBe(
        false,
      );
      expect(moveOf(decision, relief, ENTRANCE)).toBe(undefined);
      // A wounded unit is not sent in.
      const waiting = neck([
        { seat: 0, role: "GUARD", at: TAIL, hp: 5 },
        ...GATE,
      ]);
      const waitingView = viewFor(waiting);
      expect(
        chokepointPlaceAllowedV7(
          waitingView,
          required(planFor(waitingView)),
          unitAt(waiting, TAIL),
          ENTRANCE,
        ),
      ).toBe(false);
      expect(
        moveOf(
          chooseNormalCommandV7(waitingView),
          unitAt(waiting, TAIL),
          ENTRANCE,
        ),
      ).toBe(undefined);
    });

    it("keeps a fit head and a head screening a fit unit ahead in place", () => {
      const state = neck([
        { seat: 0, role: "GUARD", at: FAR },
        { seat: 0, role: "GUARD", at: ENTRANCE, hp: 5 },
        ...GATE,
      ]);
      const view = viewFor(state);
      const plan = required(planFor(view));
      expect(chokepointShouldVacateV7(view, plan, unitAt(state, FAR))).toBe(
        false,
      );
      // The wounded unit behind a fit head is screened: it stays.
      expect(
        chokepointShouldVacateV7(view, plan, unitAt(state, ENTRANCE)),
      ).toBe(false);
    });

    it("lets a siege unit fire behind a wounded screen, and moves it out when its screen is gone and a line unit waits", () => {
      const screened = neck([
        { seat: 0, role: "GUARD", at: FAR, hp: 5 },
        { seat: 0, role: "CATAPULT", at: ENTRANCE },
        { seat: 0, role: "GUARD", at: TAIL },
        ...GATE,
      ]);
      const view = viewFor(screened);
      const plan = required(planFor(view));
      expect(
        chokepointShouldVacateV7(view, plan, unitAt(screened, ENTRANCE)),
      ).toBe(false);
      // The wounded head cannot leave through the Catapult: it holds, and
      // the Catapult fires.
      const decision = chooseNormalCommandV7(view);
      expect(moveOf(decision, unitAt(screened, FAR), ENTRANCE)).toBe(undefined);
      expect(
        attacksOf(decision, unitAt(screened, ENTRANCE))[0]?.score.priority,
      ).toBe(CHOKEPOINT_FIRE_PRIORITY_V7);

      const exposed = neck([
        { seat: 0, role: "CATAPULT", at: ENTRANCE },
        { seat: 0, role: "GUARD", at: TAIL },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
      ]);
      const exposedView = viewFor(exposed);
      const exposedPlan = required(planFor(exposedView));
      const catapult = unitAt(exposed, ENTRANCE);
      expect(chokepointShouldVacateV7(exposedView, exposedPlan, catapult)).toBe(
        true,
      );
      const leaving = chooseNormalCommandV7(exposedView);
      expect(moveOf(leaving, catapult, APRON_NORTH)?.score.priority).toBe(
        CHOKEPOINT_LANE_PRIORITY_V7,
      );
    });
  });

  describe("fire and commitment", () => {
    it("aims every shot at one holder", () => {
      const state = neck([
        { seat: 0, role: "GUARD", at: FAR },
        { seat: 0, role: "CATAPULT", at: ENTRANCE },
        { seat: 0, role: "CATAPULT", at: APRON_NORTH },
        { seat: 1, role: "GUARD", at: MOUTH },
        { seat: 1, role: "GUARD", at: MOUTH_NORTH, hp: 12 },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
      ]);
      const decision = chooseNormalCommandV7(viewFor(state));
      const weaker = unitAt(state, MOUTH_NORTH);
      for (const at of [ENTRANCE, APRON_NORTH]) {
        const shots = attacksOf(decision, unitAt(state, at));
        expect(shots).toHaveLength(1);
        expect(
          shots[0]?.command.kind === "ATTACK" && shots[0].command.targetUnitId,
        ).toBe(weaker.id);
        expect(shots[0]?.score.priority).toBeGreaterThanOrEqual(
          CHOKEPOINT_FIRE_PRIORITY_V7,
        );
      }
      expect(decision.command?.kind).toBe("ATTACK");
    });

    it("commits the head against a wounded holder only", () => {
      const healthy = neck([
        { seat: 0, role: "GUARD", at: FAR },
        { seat: 0, role: "GUARD", at: TAIL },
        ...GATE,
      ]);
      expect(
        attacksOf(
          chooseNormalCommandV7(viewFor(healthy)),
          unitAt(healthy, FAR),
        ),
      ).toEqual([]);

      const wounded = neck([
        { seat: 0, role: "GUARD", at: FAR },
        { seat: 0, role: "GUARD", at: TAIL },
        { seat: 1, role: "GUARD", at: MOUTH, hp: 8 },
        { seat: 1, role: "FIGHTER", at: { x: 8, y: 5 } },
      ]);
      const decision = chooseNormalCommandV7(viewFor(wounded));
      const committed = attacksOf(decision, unitAt(wounded, FAR));
      expect(committed).toHaveLength(1);
      expect(committed[0]?.score.priority).toBe(CHOKEPOINT_COMMIT_PRIORITY_V7);
      expect(decision.command).toEqual(committed[0]?.command);
    });

    it("reads the attrition clock from the treasury", () => {
      const pieces: Piece[] = [
        { seat: 0, role: "GUARD", at: { x: 2, y: 5 } },
        ...GATE,
      ];
      expect(chokepointAssaultV7(viewFor(neck(pieces)))).toBe(false);
      expect(
        chokepointAssaultV7(
          viewFor(neck(pieces, CHOKEPOINT_ASSAULT_BANK_V7 - 1)),
        ),
      ).toBe(false);
      expect(
        chokepointAssaultV7(viewFor(neck(pieces, CHOKEPOINT_ASSAULT_BANK_V7))),
      ).toBe(true);
    });
  });

  // Tuning 6, correction pass (`pulp_wars-w49.6`): a seat with numbers
  // attacks the gate every turn; it does not wait for the attrition clock.
  describe("numbers at the gate", () => {
    /** The active seat plays its turn; returns the attacks it made. */
    const turn = (
      start: GameStateV7,
    ): { readonly state: GameStateV7; readonly attacks: number } => {
      const actor = required(start.turnOrder[start.activeSeatIndex]);
      let state = start;
      let attacks = 0;
      for (let accepted = 0; accepted < 128; accepted += 1) {
        const view = viewForV7(state, actor);
        const command = required(
          chooseNormalTurnCommandV7(
            view,
            accepted,
            128,
            chooseNormalCommandV7(view),
          ),
        );
        if (command.kind === "ATTACK") attacks += 1;
        const applied = applyCommandV7(state, actor, command);
        if (!applied.accepted) throw new Error(applied.error.code);
        state = applied.state;
        if (command.kind === "END_TURN") break;
      }
      return { state, attacks };
    };
    const endTurn = (state: GameStateV7): GameStateV7 => {
      const applied = applyCommandV7(
        state,
        required(state.turnOrder[state.activeSeatIndex]),
        { kind: "END_TURN" },
      );
      if (!applied.accepted) throw new Error(applied.error.code);
      return applied.state;
    };
    const column: readonly Piece[] = [
      { seat: 0, role: "SWORDSMAN", at: FAR },
      { seat: 0, role: "SWORDSMAN", at: ENTRANCE },
      { seat: 0, role: "SWORDSMAN", at: TAIL },
      { seat: 0, role: "SWORDSMAN", at: APRON_NORTH },
      { seat: 0, role: "SWORDSMAN", at: { x: 2, y: 5 } },
    ];

    it("five Swordsmen attack one healthy Guard in the gate every turn until it falls", () => {
      // No Coins: the attrition clock never strikes.
      let state = neck([...column, ...GATE]);
      expect(chokepointAssaultV7(viewFor(state))).toBe(false);
      expect(planFor(viewFor(state))).not.toBeNull();
      const guard = unitAt(state, MOUTH).id;
      const log: string[] = [];
      for (let round = 1; round <= 8; round += 1) {
        const played = turn(state);
        state = played.state;
        const left = state.units.find((unit) => unit.id === guard);
        log.push(
          `${String(round)}:${String(played.attacks)}:${String(left?.hp ?? 0)}`,
        );
        if (left === undefined) break;
        // The Guard's owner does nothing (the Guard recovers by the rules).
        state = endTurn(state);
      }
      // round:attacks:the Guard's HP. The first attack is the one the siege
      // without numbers does not make: the holder is healthy and the clock
      // has not struck.
      expect(log).toEqual(["1:1:8", "2:1:0"]);
    });

    it("with Explosives blasts a Mountain beside the gate before the column attacks", () => {
      const base = neck(
        [
          { seat: 0, role: "SWORDSMAN", at: FAR },
          { seat: 0, role: "SWORDSMAN", at: TAIL },
          { seat: 0, role: "SWORDSMAN", at: APRON_NORTH },
          { seat: 0, role: "SWORDSMAN", at: { x: 2, y: 5 } },
          { seat: 0, role: "SWORDSMAN", at: { x: 2, y: 4 } },
          ...GATE,
        ],
        // The Coins of a Blast (3) and not of a technology (5 with one
        // city since the economy rejig, `pulp_wars-w49.16`; with 6 Coins
        // the seat now buys Hunting first).
        4,
      );
      const rock = { x: 5, y: 4 };
      const state: GameStateV7 = {
        ...base,
        players: base.players.map((player) =>
          player.seat === 0
            ? {
                ...player,
                researchedTechs: [
                  ...new Set([
                    ...player.researchedTechs,
                    "DRILL",
                    "FORTIFICATION",
                    "EXPLOSIVES",
                  ] as const),
                ],
              }
            : player,
        ),
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) =>
            same(tile.at, rock)
              ? {
                  ...tile,
                  biome: "HIGHLANDS" as const,
                  terrain: "MOUNTAIN" as const,
                  resource: null,
                }
              : tile,
          ),
        },
      };
      const decision = chooseNormalCommandV7(viewFor(state));
      expect(decision.command).toEqual({ kind: "BLAST_MOUNTAIN", at: rock });
      expect(decision.candidates[0]?.score.priority).toBe(
        CHOKEPOINT_FIRE_PRIORITY_V7 + 2,
      );
    });

    it("two Guards do not: without numbers the old siege waits", () => {
      const state = neck([
        { seat: 0, role: "GUARD", at: FAR },
        { seat: 0, role: "GUARD", at: TAIL },
        ...GATE,
      ]);
      expect(
        attacksOf(chooseNormalCommandV7(viewFor(state)), unitAt(state, FAR)),
      ).toEqual([]);
    });
  });

  describe("matches", () => {
    it("decides an open board exactly as without the siege", () => {
      const setup = browserSetupV7(71);
      const on = runAiMatchV7(setup, { maxRounds: 12 });
      const previous = setChokepointPolicyOptionsV7({ siege: false });
      let off;
      try {
        off = runAiMatchV7(setup, { maxRounds: 12 });
      } finally {
        setChokepointPolicyOptionsV7(previous);
      }
      expect(on.metrics.commandHash).toBe(off.metrics.commandHash);
      expect(on.stateHash).toBe(off.stateHash);
    });

    it("plays the neck without a policy error or a stall", () => {
      const mission = required(missionByIdV7("TEST_NECK"));
      const result = runAiMatchV7(
        required(missionMatchSetupV7(mission, "ORIGINAL")),
        { maxRounds: 25 },
      );
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
    });
  });
});
