import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { upgradeRetainedPublicViewV7 } from "../../scripts/ruleset-v7-late-public-view-contract";
import {
  canonicalHash,
  cityId,
  createPlayableGameV7,
  createPublicPlanningWorkV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  viewForV7,
  type CommandV7,
  type PlayerViewV7,
  type PublicPlanningWorkResultV7,
} from "../../src/engine/index";

const retained = upgradeRetainedPublicViewV7(
  JSON.parse(
    readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
  ) as PlayerViewV7,
);
// The captured revision-11 view predates the revision-13/14 neutral fields.
const captured300: PlayerViewV7 = {
  ...(
    JSON.parse(
      readFileSync(
        "tests/fixtures/ruleset-v7-public-planning-command-300.json",
        "utf8",
      ),
    ) as {
      readonly view: Omit<
        PlayerViewV7,
        | "graves"
        | "plagued"
        | "bitten"
        | "shields"
        | "cooling"
        | "mindControlled"
        | "mindControlCooldowns"
      >;
    }
  ).view,
  graves: [],
  plagued: [],
  bitten: [],
  // The Martian revision's neutral side lists.
  shields: [],
  cooling: [],
  mindControlled: [],
  mindControlCooldowns: [],
};

describe("ruleset-7 exact public query indexing", () => {
  it("bounds repeated public-fact reads on the captured late view", () => {
    const measured = measuredView(captured300);
    const commands = queryPlayerCommandsV7(measured.view);

    expect(canonicalHash(commands)).toBe(
      "68b640b47cff455890b0d253cbbdf1dfe7a23bd38e7665d5d0cd7032a1e31651",
    );
    const reads = measured.reads();
    expect(reads.tileReads).toBeLessThan(6_000);
    expect(reads.unitReads).toBeLessThan(500);
    // The view hash includes the neutral `graves`, `plagued`, and `bitten`
    // fields added to the captured revision-11 view above, and since the
    // Martian revision (`pulp_wars-t6s.2`) the four empty lists `shields`,
    // `cooling`, `thralls`, and `mindControlCooldowns` (was 219eb2…5d03),
    // with `thralls` renamed `mindControlled` by the Mind Control revision
    // (`pulp_wars-b5f.3`; was d8f602…f19a), and the setup's map revision
    // `REGIONAL_BIOMES_NAVAL_V4` since many seats (`pulp_wars-ykw.3`; was
    // 36d712…00db with `V3` since the village density, `pulp_wars-ykw.2`,
    // and 2fe0de…7670 with `V2`, the same view otherwise).
    expect(canonicalHash(measured.view)).toBe(
      "c843631eca60cc41fa9a06d968769b1e254fe9575d6df50ddc415a47051c6692",
    );

    const planned = drain(measured.view, commands, 113);
    expect(planned.operations).toBe(
      66_235 + publicPlanningFactScanOperations(measured.view),
    );
    expect(canonicalHash(planned.result)).toBe(
      "b32cb8941a64df8d59e6b302c253ccaaa5a1459768943025ec1a35f526181f5b",
    );
  });

  it("keeps cold equal-view work exact across interleaved slice budgets", () => {
    const leftView = structuredClone(retained);
    const rightView = structuredClone(retained);
    const left = createPublicPlanningWorkV7(
      leftView,
      queryPlayerCommandsV7(leftView),
    );
    const right = createPublicPlanningWorkV7(
      rightView,
      queryPlayerCommandsV7(rightView),
    );
    let leftOperations = 0;
    let rightOperations = 0;
    let leftResult: PublicPlanningWorkResultV7 | null = null;
    let rightResult: PublicPlanningWorkResultV7 | null = null;
    while (leftResult === null || rightResult === null) {
      if (leftResult === null) {
        const progress = left.advance(1);
        leftOperations += progress.operations;
        leftResult = progress.result;
      }
      if (rightResult === null) {
        const progress = right.advance(37);
        rightOperations += progress.operations;
        rightResult = progress.result;
      }
    }

    // The larger right-hand slices finish the shared-fact scan and cold work
    // first. The still-scanning left work then reuses that completed result.
    expect(leftOperations).toBe(
      publicPlanningFactScanOperations(leftView) +
        queryPlayerCommandsV7(leftView).length,
    );
    expect(rightOperations).toBe(
      4_098 + publicPlanningFactScanOperations(rightView),
    );
    expect(canonicalHash(leftResult)).toBe(
      "f18e578cba84a5fe93980ae6c0fdc9e4a531ec4354dcc44987c170476464bca3",
    );
    expect(rightResult).toEqual(leftResult);
  });

  it("keeps fog, pending-choice, hostile, and allied facts view-local", () => {
    const command = {
      kind: "BUILD_FORGE",
      at: { x: 6, y: 8 },
    } as const satisfies CommandV7;
    const city = required(
      retained.cities.find((candidate) => candidate.id === cityId(3)),
    );
    const visibleUnit = required(
      retained.units.find((unit) => unit.ownerId !== retained.viewer.id),
    );
    const hidden: PlayerViewV7 = {
      ...retained,
      board: {
        ...retained.board,
        tiles: retained.board.tiles.map((tile) =>
          tile.at.x === city.at.x + 2 && tile.at.y === city.at.y + 2
            ? { at: tile.at, explored: false as const }
            : tile,
        ),
      },
    };
    const hostile: PlayerViewV7 = {
      ...retained,
      units: retained.units.map((unit) =>
        unit === visibleUnit ? { ...unit, at: city.at } : unit,
      ),
    };
    const pending: PlayerViewV7 = {
      ...retained,
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: city.id,
          reachedLevel: city.level + 1,
          candidates: ["TREASURY_8"],
        },
      ],
    };
    const allied = alliedCityViews();

    expect(queryPlayerCommandsV7(retained)).toContainEqual(command);
    expect(queryPlayerCommandsV7(hidden)).not.toContainEqual(command);
    expect(queryPlayerCommandsV7(hostile)).not.toContainEqual(command);
    expect(queryPlayerCommandsV7(allied.cooperative)).toContainEqual(
      allied.command,
    );
    expect(queryPlayerCommandsV7(allied.rival)).not.toContainEqual(
      allied.command,
    );
    expect(queryPlayerCommandsV7(pending)).toEqual([
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: city.level + 1,
        reward: "TREASURY_8",
      },
    ]);
    expect(queryPlayerCommandsV7(structuredClone(retained))).toEqual(
      queryPlayerCommandsV7(retained),
    );
  });
});

function measuredView(source: PlayerViewV7): {
  readonly view: PlayerViewV7;
  readonly reads: () => {
    readonly tileReads: number;
    readonly unitReads: number;
  };
} {
  const view = structuredClone(source);
  let tileReads = 0;
  let unitReads = 0;
  const measuredArray = <T>(
    values: readonly T[],
    count: () => void,
  ): readonly T[] =>
    new Proxy(values, {
      get(target, property, receiver) {
        if (typeof property === "string" && /^(0|[1-9]\d*)$/.test(property))
          count();
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
  return {
    view: {
      ...view,
      board: {
        ...view.board,
        tiles: measuredArray(view.board.tiles, () => {
          tileReads += 1;
        }),
      },
      units: measuredArray(view.units, () => {
        unitReads += 1;
      }),
    },
    reads: () => ({ tileReads, unitReads }),
  };
}

function publicPlanningFactScanOperations(view: PlayerViewV7): number {
  return view.board.tiles.length + view.cities.length + view.units.length + 1;
}

function alliedCityViews(): {
  readonly cooperative: PlayerViewV7;
  readonly rival: PlayerViewV7;
  readonly command: CommandV7;
} {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 919,
    width: 16,
    height: 16,
    aiCount: 3,
    aiDifficulty: "NORMAL",
    aiMode: "COOPERATIVE",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
    allowDuplicateFactions: true,
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  const actor = required(
    created.state.players.find(
      (player) => player.id !== created.state.humanPlayerId,
    ),
  );
  const ally = required(
    created.state.players.find(
      (player) =>
        player.id !== actor.id && player.id !== created.state.humanPlayerId,
    ),
  );
  const city = required(
    created.state.cities.find((candidate) => candidate.ownerId === actor.id),
  );
  const actorUnit = required(
    created.state.units.find((unit) => unit.ownerId === actor.id),
  );
  const alliedUnit = required(
    created.state.units.find((unit) => unit.ownerId === ally.id),
  );
  const unparsed = {
    ...created.state,
    activeSeatIndex: created.state.turnOrder.indexOf(actor.id),
    players: created.state.players.map((player) =>
      player.id === actor.id
        ? {
            ...player,
            coins: 100,
            researchedTechs: TECHNOLOGY_IDS_V7,
            explored: created.state.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    units: created.state.units.map((unit) =>
      unit.id === actorUnit.id
        ? { ...unit, at: alliedUnit.at }
        : unit.id === alliedUnit.id
          ? { ...unit, at: city.at }
          : unit,
    ),
  };
  const state = parseGameStateV7(unparsed);
  if (state === null) throw new Error("allied city fixture is invalid");
  const cooperative = viewForV7(state, actor.id);
  const rivalState = parseGameStateV7({
    ...state,
    setup: { ...state.setup, aiMode: "RIVAL" },
  });
  if (rivalState === null) throw new Error("rival city fixture is invalid");
  const rival = viewForV7(rivalState, actor.id);
  const command = required(
    queryPlayerCommandsV7(cooperative).find((candidate) => {
      if (!("at" in candidate) || candidate.kind !== "BUILD_FARM") return false;
      const tile =
        cooperative.board.tiles[
          candidate.at.y * cooperative.board.width + candidate.at.x
        ];
      return tile?.explored === true && tile.territoryCityId === city.id;
    }),
  );
  return { cooperative, rival, command };
}

function drain(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  budget: number,
): {
  readonly operations: number;
  readonly result: PublicPlanningWorkResultV7;
} {
  const work = createPublicPlanningWorkV7(view, commands);
  let operations = 0;
  for (;;) {
    const progress = work.advance(budget);
    operations += progress.operations;
    if (progress.result !== null)
      return { operations, result: progress.result };
  }
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("required fixture value missing");
  return value;
}
