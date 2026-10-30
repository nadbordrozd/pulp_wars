import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalTacticalFactsV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  BARRICADE_BREACH_PRIORITY_V7,
  BARRICADE_CHOKE_PRIORITY_V7,
  BARRICADE_CROSSING_COST_V7,
} from "../../src/ai/v7-barricades";
import { endgamePlanForPolicyV7 } from "../../src/ai/v7-endgame";
import {
  BARRICADE_HP_V7,
  queryAiReadyCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { dwarfFieldV7 } from "../fixtures/v7-dwarf";
import type { GoblinPieceV7 } from "../fixtures/v7-goblin-arena";
import {
  activeIdV7,
  mountainV7,
  patchTileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// Barricades in skirmish (`pulp_wars-ovqq`, docs/architecture/NORMAL_AI.md
// "Barricades in the way"). The user: "figure something out for AI to treat
// barricades sensibly in skirmish games". A skirmish seat's units follow
// the campaign plan's routes (`pulp_wars-54fb` gave those the Barricade
// rule); this bead gives the same rule to the scouts' exploration routes
// and the endgame siege's routes, and lets a Dwarf Engineer narrow a
// threatened city's choke. Hand-built skirmish states, one decision each;
// no match is played.
//
// The board: the revision-20 field (11 x 11, open Grass), seat 0 a Human
// AI seat with its capital on (8, 8), seat 1 the Dwarves with theirs on
// (2, 8); the neutral villages are removed.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

interface Skirmish {
  readonly pieces: readonly GoblinPieceV7[];
  /** Tiles turned into Mountains (seat 0 has no Engineering). */
  readonly mountains?: readonly CoordV7[];
  /** Barricades of the Dwarf seat. */
  readonly barricades?: readonly CoordV7[];
  /** Tiles seat 0 has not explored. */
  readonly fog?: readonly CoordV7[];
  readonly activeSeat?: number;
  /** The Dwarf seat's Coins (default 0). */
  readonly dwarfCoins?: number;
}

function skirmish(options: Skirmish): GameStateV7 {
  let state = dwarfFieldV7(options.pieces, {
    factions: ["ORIGINAL", "DWARF"],
    techs: { 0: [] },
    coins: 0,
    ...(options.activeSeat === undefined
      ? {}
      : { activeSeat: options.activeSeat }),
  });
  for (const where of options.mountains ?? []) state = mountainV7(state, where);
  for (const where of [at(5, 5), at(8, 5), at(5, 8)])
    state = patchTileV7(state, where, { site: null });
  if (options.fog !== undefined) state = unexploreV7(state, 0, options.fog);
  const dwarf = state.players.find((player) => player.seat === 1);
  if (dwarf === undefined) throw new Error("no Dwarf seat");
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === dwarf.id
        ? { ...player, coins: options.dwarfCoins ?? 0 }
        : player,
    ),
    barricades: (options.barricades ?? []).map((where) => ({
      at: where,
      ownerId: dwarf.id,
      hp: BARRICADE_HP_V7,
    })),
  });
}

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, activeIdV7(state));
}

/**
 * The view with the endgame's public counts (the viewer five cities and
 * nine units to the Dwarves' one city and none), so the endgame siege is
 * on against the Dwarf capital.
 */
function endgameView(view: PlayerViewV7): PlayerViewV7 {
  return {
    ...view,
    leaderboard: view.leaderboard.map((entry) =>
      entry.isViewer
        ? { ...entry, cityCount: 5, livingUnitCount: 9 }
        : { ...entry, cityCount: 1, livingUnitCount: 0 },
    ),
  };
}

/** The scored candidates of the unit on `where`, best first. */
function candidatesOf(view: PlayerViewV7, where: CoordV7) {
  const unit = view.units.find((candidate) => same(candidate.at, where));
  if (unit === undefined) throw new Error(`no unit on ${where.x},${where.y}`);
  return chooseNormalCommandV7(view).candidates.filter(
    (candidate) =>
      "unitId" in candidate.command && candidate.command.unitId === unit.id,
  );
}

function fnv(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** The whole decision: the command and every scored candidate. */
function fingerprint(decision: NormalAiDecisionV7): string {
  return fnv(
    JSON.stringify({
      command: decision.command,
      candidates: decision.candidates.map((candidate) => [
        candidate.command,
        candidate.score,
      ]),
    }),
  );
}

// The Dwarf capital (2, 8) walled by Mountains but for its east side: its
// land approaches are (3, 7) and (3, 8).
const RING = [at(1, 7), at(2, 7), at(1, 8), at(1, 9), at(2, 9), at(3, 9)];
const DWARF_CAPITAL = at(2, 8);
const FIGHTERS: readonly GoblinPieceV7[] = [
  { seat: 0, role: "FIGHTER", at: at(4, 7) },
  { seat: 0, role: "FIGHTER", at: at(5, 7) },
  { seat: 0, role: "FIGHTER", at: at(6, 7) },
];
// The west of the board (x 0 to 3) is unexplored, and a Mountain wall on
// x = 4 leaves two ways into it, (4, 5) and (4, 6).
const WEST: CoordV7[] = [];
for (let y = 0; y < 11; y += 1)
  for (let x = 0; x <= 3; x += 1) WEST.push(at(x, y));
const WALL = [0, 1, 2, 3, 4, 7, 8, 9, 10].map((y) => at(4, y));

describe("Barricades in skirmish: the campaign routes", () => {
  it("a city sealed by Barricades gets broken into", () => {
    const view = viewOf(
      skirmish({
        pieces: FIGHTERS,
        mountains: RING,
        barricades: [at(3, 7), at(3, 8)],
      }),
    );
    for (const entry of inspectNormalTacticalFactsV7(view).campaign.assignments)
      expect(entry).toMatchObject({ job: "ATTACK", at: DWARF_CAPITAL });
    const best = candidatesOf(view, at(4, 7))[0];
    expect(best?.command.kind).toBe("ATTACK_BARRICADE");
    expect(best?.score.priority).toBe(BARRICADE_BREACH_PRIORITY_V7);
  });

  it("an open approach is taken instead of breaking the Barricade", () => {
    const view = viewOf(
      skirmish({ pieces: FIGHTERS, mountains: RING, barricades: [at(3, 7)] }),
    );
    const own = candidatesOf(view, at(4, 7));
    expect(own.some((item) => item.command.kind === "ATTACK_BARRICADE")).toBe(
      false,
    );
    expect(own[0]?.command).toMatchObject({ kind: "MOVE", path: [at(3, 8)] });
  });

  it("a Barricade off every route changes no decision", () => {
    const plain = chooseNormalCommandV7(
      viewOf(skirmish({ pieces: FIGHTERS, mountains: RING })),
    );
    const off = chooseNormalCommandV7(
      viewOf(
        skirmish({ pieces: FIGHTERS, mountains: RING, barricades: [at(9, 1)] }),
      ),
    );
    expect(off.command).toEqual(plain.command);
    expect(off.candidates.map((item) => item.command)).toEqual(
      plain.candidates.map((item) => item.command),
    );
  });
});

describe("Barricades in skirmish: exploration", () => {
  const explorer = (barricades: readonly CoordV7[]) =>
    viewOf(
      skirmish({
        pieces: [{ seat: 0, role: "FIGHTER", at: at(5, 5) }],
        mountains: WALL,
        fog: WEST,
        barricades,
      }),
    );

  it("a scout goes round a Barricade on the frontier instead of breaking it", () => {
    // Before pulp_wars-ovqq the scout's goal was the Barricade itself (the
    // first frontier tile in index order) and it hit it, with the open
    // frontier tile (4, 6) beside it.
    const view = explorer([at(4, 5)]);
    const [job] = inspectNormalTacticalFactsV7(view).campaign.assignments;
    expect(job).toMatchObject({ job: "EXPLORE", at: at(4, 6) });
    const own = candidatesOf(view, at(5, 5));
    expect(own.some((item) => item.command.kind === "ATTACK_BARRICADE")).toBe(
      false,
    );
    expect(own[0]?.command).toMatchObject({ kind: "MOVE", path: [at(4, 6)] });
  });

  it("a scout breaks through when the Barricade is the only way on", () => {
    // Both ways into the west are barricaded: the only frontier is behind
    // a Barricade, and the scout breaks the one in front of it.
    const view = explorer([at(4, 5), at(4, 6)]);
    const [job] = inspectNormalTacticalFactsV7(view).campaign.assignments;
    expect(job?.job).toBe("EXPLORE");
    const best = candidatesOf(view, at(5, 5))[0];
    expect(best?.command.kind).toBe("ATTACK_BARRICADE");
    expect(best?.score.priority).toBe(BARRICADE_BREACH_PRIORITY_V7);
  });
});

describe("Barricades in skirmish: the endgame siege", () => {
  // The Dwarf capital's land approaches are (3, 8) on the east and (2, 9)
  // on the south, which the Mountains leave open only from row 10.
  const SIEGE = [at(1, 7), at(2, 7), at(3, 7), at(1, 8), at(1, 9), at(3, 9)];
  /** The endgame route steps (Move-1 field) on the board. */
  const route = (
    mountains: readonly CoordV7[],
    barricades: readonly CoordV7[],
  ) => {
    const view = endgameView(
      viewOf(
        skirmish({
          pieces: [{ seat: 0, role: "FIGHTER", at: at(6, 6) }],
          mountains,
          barricades,
        }),
      ),
    );
    const plan = endgamePlanForPolicyV7(
      view,
      (owner) => owner !== view.viewer.id,
    );
    expect(plan?.targets.map((city) => city.at)).toEqual([DWARF_CAPITAL]);
    return (where: CoordV7) =>
      plan?.routeDistanceByKey.get(`${where.y},${where.x}`);
  };

  it("routes round a hostile Barricade when the way round is cheap", () => {
    // Open: (4, 7) is two steps from the capital through (3, 8).
    expect(route(SIEGE, [])(at(4, 7))).toBe(2);
    // Barricaded: the way round by row 10 is five steps, three more, and
    // cheaper than the crossing (before pulp_wars-ovqq the field ran
    // through the Barricade's tile as open ground).
    const round = route(SIEGE, [at(3, 8)]);
    expect(round(at(4, 7))).toBe(5);
    expect(round(at(3, 8))).toBe(BARRICADE_CROSSING_COST_V7);
    // With the south closed by a Mountain too, the route crosses it.
    const sealed = route([...SIEGE, at(2, 9)], [at(3, 8)]);
    expect(sealed(at(4, 7))).toBe(BARRICADE_CROSSING_COST_V7 + 1);
  });

  it("a capturer whose endgame route runs through the Barricade breaks it", () => {
    // Units are walls on the endgame route of a Move-1 unit: with own
    // Fighters on (4, 9) and (4, 10) the way round is closed to the Fighter
    // on (4, 8), and its endgame route runs through the Barricade, though
    // its campaign route (units are no walls there) goes round.
    const view = endgameView(
      viewOf(
        skirmish({
          pieces: [
            { seat: 0, role: "FIGHTER", at: at(4, 8) },
            { seat: 0, role: "FIGHTER", at: at(4, 9) },
            { seat: 0, role: "FIGHTER", at: at(4, 10) },
          ],
          mountains: SIEGE,
          barricades: [at(3, 8)],
        }),
      ),
    );
    const fighter = view.units.find((unit) => same(unit.at, at(4, 8)));
    const job = inspectNormalTacticalFactsV7(view).campaign.assignments.find(
      (entry) => entry.unitId === fighter?.id,
    );
    expect(job).toMatchObject({ job: "ATTACK", at: DWARF_CAPITAL });
    const best = candidatesOf(view, at(4, 8))[0];
    expect(best?.command).toMatchObject({
      kind: "ATTACK_BARRICADE",
      at: at(3, 8),
    });
    expect(best?.score.priority).toBe(BARRICADE_BREACH_PRIORITY_V7);
  });

  it("a capturer at a sealed city breaks in", () => {
    const view = endgameView(
      viewOf(
        skirmish({
          pieces: FIGHTERS,
          mountains: RING,
          barricades: [at(3, 7), at(3, 8)],
        }),
      ),
    );
    const best = candidatesOf(view, at(4, 7))[0];
    expect(best?.command.kind).toBe("ATTACK_BARRICADE");
  });
});

describe("Barricades in skirmish: a Dwarf Engineer narrows a choke", () => {
  const dwarfView = (
    attacker: CoordV7 | null,
    options: { readonly mountains?: readonly CoordV7[] } & Pick<
      Skirmish,
      "barricades"
    > = {},
  ) =>
    viewOf(
      skirmish({
        pieces: [
          { seat: 1, role: "CAPTAIN", at: DWARF_CAPITAL },
          ...(attacker === null
            ? []
            : [{ seat: 0, role: "FIGHTER" as const, at: attacker }]),
        ],
        mountains: options.mountains ?? RING,
        barricades: options.barricades ?? [],
        activeSeat: 1,
        dwarfCoins: 10,
      }),
    );
  const builds = (view: PlayerViewV7) =>
    candidatesOf(view, DWARF_CAPITAL).filter(
      (item) => item.command.kind === "BUILD_BARRICADE",
    );

  it("closes the approach nearest a threat to a city with two", () => {
    const view = dwarfView(at(5, 5));
    // Both approaches are offered; the one the Fighter comes by scores.
    expect(
      queryAiReadyCommandsV7(view).filter(
        (item) => item.command.kind === "BUILD_BARRICADE",
      ).length,
    ).toBeGreaterThanOrEqual(2);
    const [best] = builds(view);
    expect(best?.command).toMatchObject({ to: at(3, 7) });
    expect(best?.score.priority).toBe(BARRICADE_CHOKE_PRIORITY_V7);
  });

  it("never closes the last approach, and builds nothing without a threat or a choke", () => {
    // One approach left open: no Barricade.
    expect(builds(dwarfView(at(5, 5), { barricades: [at(3, 8)] }))).toEqual([]);
    // No hostile unit within three tiles of the city.
    expect(builds(dwarfView(at(8, 2)))).toEqual([]);
    // Open ground all round (eight approaches): no choke.
    expect(builds(dwarfView(at(5, 5), { mountains: [] }))).toEqual([]);
  });
});

describe("Barricades in skirmish: no Barricade, no change", () => {
  // The fingerprints of these decisions were taken before pulp_wars-ovqq
  // (commit 85269490); with no Barricade on the board every search is the
  // plain breadth-first search it was.
  const cases: Record<string, readonly [() => PlayerViewV7, string]> = {
    "the walled city": [
      () => viewOf(skirmish({ pieces: FIGHTERS, mountains: RING })),
      "758cd317",
    ],
    "the fog": [
      () =>
        viewOf(
          skirmish({
            pieces: [
              { seat: 0, role: "FIGHTER", at: at(5, 5) },
              { seat: 0, role: "RAIDER", at: at(7, 5) },
              { seat: 0, role: "FIGHTER", at: at(8, 7) },
            ],
            fog: WEST,
          }),
        ),
      "6e190739",
    ],
    "the endgame": [
      () =>
        endgameView(viewOf(skirmish({ pieces: FIGHTERS, mountains: RING }))),
      "f03f54c9",
    ],
    "the gap in the wall": [
      () =>
        viewOf(
          skirmish({
            pieces: [{ seat: 0, role: "FIGHTER", at: at(5, 5) }],
            mountains: WALL,
            fog: WEST,
          }),
        ),
      "c737b285",
    ],
    "the Dwarf seat": [
      () =>
        viewOf(
          skirmish({
            pieces: [
              { seat: 1, role: "CAPTAIN", at: at(3, 7) },
              { seat: 1, role: "FIGHTER", at: at(2, 8) },
              { seat: 0, role: "FIGHTER", at: at(5, 7) },
              { seat: 0, role: "FIGHTER", at: at(5, 8) },
            ],
            activeSeat: 1,
          }),
        ),
      "cfd7a51e",
    ],
  };
  for (const [name, [make, expected]] of Object.entries(cases))
    it(`decides ${name} exactly as before`, () => {
      expect(fingerprint(chooseNormalCommandV7(make()))).toBe(expected);
    });
});
