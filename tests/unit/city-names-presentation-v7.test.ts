import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  applyCommandV7,
  createPlayableGameV7,
  viewForV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerEventV7,
} from "../../src/engine/index";
import {
  CITY_NAME_LISTS_V7,
  CITY_NAME_PATTERN_V7,
  CITY_NAMES_PER_FACTION_V7,
} from "../../src/render/city-name-lists-v7";
import {
  assignCityNamesV7,
  cityAccessibleNameV7,
  cityBoundaryNoticeV7,
  cityGazetteerV7,
  cityNameEntryV7,
  cityNameSitesV7,
  cityNameV7,
  shuffledCityNamesV7,
} from "../../src/render/city-names-presentation-v7";
import {
  CITY_NAME_HIDDEN_CELL_PX_V7,
  CITY_NAME_MAX_FONT_PX_V7,
  CITY_NAME_MIN_FONT_PX_V7,
  cityNameLabelLayoutV7,
  drawCityNameLabelV7,
} from "../../src/render/canvas/city-name-label-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";

const ALL_FACTIONS: readonly FactionIdV7[] = FACTION_IDS_V7;

function setup(
  seed: number,
  factions: readonly FactionIdV7[] = ALL_FACTIONS,
  size: MatchSetupV7["width"] = 25,
  mapType: MatchSetupV7["mapType"] = "CONTINENTS",
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: true,
  };
}

function match(matchSetup: MatchSetupV7): GameStateV7 {
  const created = createPlayableGameV7(matchSetup);
  if (!created.ok) throw new Error("match fixture failed to generate");
  return created.state;
}

/** Edit distance, to hold "no two names one letter apart". */
function distance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0] as number;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j] as number;
      row[j] = Math.min(
        above + 1,
        (row[j - 1] as number) + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[right.length] as number;
}

const key = (at: { readonly x: number; readonly y: number }): string =>
  `${at.x},${at.y}`;

describe("city name lists", () => {
  it("has a list for every faction in the game", () => {
    expect(Object.keys(CITY_NAME_LISTS_V7).sort()).toEqual(
      [...FACTION_IDS_V7].sort(),
    );
  });

  it.each(FACTION_IDS_V7)("%s: thirty short one-word names", (faction) => {
    const names = CITY_NAME_LISTS_V7[faction];
    expect(names).toHaveLength(CITY_NAMES_PER_FACTION_V7);
    expect(CITY_NAMES_PER_FACTION_V7).toBe(30);
    for (const name of names) {
      expect(name, name).toMatch(CITY_NAME_PATTERN_V7);
      expect(name.length, name).toBeGreaterThanOrEqual(4);
      expect(name.length, name).toBeLessThanOrEqual(10);
    }
  });

  it.each(FACTION_IDS_V7)(
    "%s: no two names are one letter apart",
    (faction) => {
      const names = CITY_NAME_LISTS_V7[faction].map((name) =>
        name.toLowerCase(),
      );
      const close: string[] = [];
      for (let i = 0; i < names.length; i += 1)
        for (let j = i + 1; j < names.length; j += 1)
          if (distance(names[i] as string, names[j] as string) < 2)
            close.push(`${names[i]}/${names[j]}`);
      expect(close).toEqual([]);
    },
  );

  it("never repeats a name across the whole set", () => {
    const all = FACTION_IDS_V7.flatMap((faction) =>
      CITY_NAME_LISTS_V7[faction].map((name) => name.toLowerCase()),
    );
    expect(all).toHaveLength(FACTION_IDS_V7.length * 30);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("city name assignment", () => {
  it("shuffles each list by the seed, the same way every time", () => {
    const first = shuffledCityNamesV7(7, "GOBLIN");
    expect(shuffledCityNamesV7(7, "GOBLIN")).toEqual(first);
    expect([...first].sort()).toEqual([...CITY_NAME_LISTS_V7.GOBLIN].sort());
    expect(first).not.toEqual(CITY_NAME_LISTS_V7.GOBLIN);
    expect(shuffledCityNamesV7(8, "GOBLIN")).not.toEqual(first);
  });

  it("gives thirty sites of a faction thirty different names", () => {
    const sites = Array.from({ length: 30 }, (_, index) => ({
      at: { x: index % 6, y: Math.floor(index / 6) },
      faction: "DWARF" as const,
    }));
    const names = [...assignCityNamesV7(3, sites).values()].map(
      (entry) => entry.name,
    );
    expect(new Set(names).size).toBe(30);
    expect([...names].sort()).toEqual([...CITY_NAME_LISTS_V7.DWARF].sort());
  });

  it("past the end of a list reuses names with a numeral, never failing", () => {
    const sites = Array.from({ length: 65 }, (_, index) => ({
      at: { x: index % 10, y: Math.floor(index / 10) },
      faction: "CANDY" as const,
    }));
    const dealt = assignCityNamesV7(11, sites);
    const order = shuffledCityNamesV7(11, "CANDY");
    const names = sites.map((site) => dealt.get(key(site.at))?.name);
    expect(names[0]).toBe(order[0]);
    expect(names[29]).toBe(order[29]);
    expect(names[30]).toBe(`${order[0]} II`);
    expect(names[59]).toBe(`${order[29]} II`);
    expect(names[60]).toBe(`${order[0]} III`);
    expect(new Set(names).size).toBe(65);
  });

  it("names every site of a match once, from its home faction's list", () => {
    for (const seed of [1, 2, 3]) {
      const state = match(setup(seed));
      const sites = cityNameSitesV7(state.setup);
      const gazetteer = cityGazetteerV7(state.setup);
      const settlementTiles = state.board.tiles.filter(
        (tile) => tile.site !== null,
      );
      expect(sites).toHaveLength(settlementTiles.length);
      expect(gazetteer.size).toBe(settlementTiles.length);
      const names = [...gazetteer.values()].map((entry) => entry.name);
      expect(new Set(names).size).toBe(names.length);
      for (const entry of gazetteer.values())
        expect(CITY_NAME_LISTS_V7[entry.faction]).toContain(entry.name);
      // A capital is named in its owner's voice.
      for (const player of state.players) {
        const capital = state.cities.find(
          (city) => city.id === player.originalCapitalCityId,
        );
        expect(capital).toBeDefined();
        if (capital === undefined) continue;
        expect(gazetteer.get(key(capital.at))?.faction).toBe(player.faction);
      }
      // A village is named for the nearest starting capital.
      for (const tile of settlementTiles) {
        if (tile.site !== "VILLAGE") continue;
        const steps = state.cities
          .filter((city) => city.isCapital)
          .map((city) => ({
            faction: state.players.find((p) => p.id === city.ownerId)?.faction,
            steps: Math.max(
              Math.abs(city.at.x - tile.at.x),
              Math.abs(city.at.y - tile.at.y),
            ),
          }));
        const least = Math.min(...steps.map((entry) => entry.steps));
        expect(
          steps
            .filter((entry) => entry.steps === least)
            .map((entry) => entry.faction),
        ).toContain(gazetteer.get(key(tile.at))?.faction);
      }
    }
  });

  it("shows every viewer the same names, and the same after a reload", () => {
    const state = match(setup(5, ["ORIGINAL", "GOBLIN", "UNDEAD"], 16));
    const everything = {
      ...state,
      players: state.players.map((player) => ({
        ...player,
        explored: state.board.tiles.map((tile) => tile.at),
      })),
    };
    const views = state.players.map((player) =>
      viewForV7(everything, player.id),
    );
    const first = views[0];
    if (first === undefined) throw new Error("no viewer");
    expect(first.cities.length).toBe(3);
    for (const view of views)
      expect(view.cities.map((city) => cityNameV7(view, city))).toEqual(
        first.cities.map((city) => cityNameV7(first, city)),
      );
    // A reload: the same view after a round trip through text.
    const reloaded = JSON.parse(JSON.stringify(first)) as typeof first;
    expect(reloaded.cities.map((city) => cityNameV7(reloaded, city))).toEqual(
      first.cities.map((city) => cityNameV7(first, city)),
    );
    // Another seed is another deal.
    const other = match(setup(6, ["ORIGINAL", "GOBLIN", "UNDEAD"], 16));
    expect([...cityGazetteerV7(other.setup).values()]).not.toEqual([
      ...cityGazetteerV7(state.setup).values(),
    ]);
  });

  it("a founded village takes its site's name and keeps it when captured", () => {
    const base = match(setup(9, ["ORIGINAL", "GOBLIN"], 16, "PANGEA"));
    const human = base.humanPlayerId;
    const enemy = base.players.find((player) => player.id !== human);
    const village = base.board.tiles.find((tile) => tile.site === "VILLAGE");
    const unit = base.units.find((candidate) => candidate.ownerId === human);
    if (enemy === undefined || village === undefined || unit === undefined)
      throw new Error("capture fixture is missing a piece");
    const expected = cityGazetteerV7(base.setup).get(key(village.at));
    expect(expected).toBeDefined();
    const staged: GameStateV7 = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human),
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              at: village.at,
              captureEligible: true,
              activation: {
                ...candidate.activation,
                moved: false,
                attacked: false,
              },
            }
          : candidate,
      ),
    };
    const applied = applyCommandV7(staged, human, {
      kind: "CAPTURE",
      unitId: unit.id,
    });
    if (!applied.accepted) throw new Error("the village was not captured");
    const founded = applied.state.cities.find(
      (city) => city.at.x === village.at.x && city.at.y === village.at.y,
    );
    if (founded === undefined) throw new Error("no city was founded");
    const mine = viewForV7(applied.state, human);
    expect(cityNameV7(mine, founded)).toBe(expected?.name);
    // The same city in enemy hands, seen by both players.
    const fallen: GameStateV7 = {
      ...applied.state,
      cities: applied.state.cities.map((city) =>
        city.id === founded.id ? { ...city, ownerId: enemy.id } : city,
      ),
    };
    for (const viewer of [human, enemy.id]) {
      const view = viewForV7(fallen, viewer);
      const seen = view.cities.find((city) => city.id === founded.id);
      if (seen === undefined) continue;
      expect(cityNameV7(view, seen)).toBe(expected?.name);
    }
    expect(cityNameEntryV7(viewForV7(fallen, enemy.id), founded).faction).toBe(
      expected?.faction,
    );
  });

  it("names a city of a hand-made view from the seed and its tile alone", () => {
    const view = {
      setup: { ...setup(4, ["MARTIAN", "ICE_FOLK"], 11), width: 12 as never },
      players: [
        { faction: "MARTIAN" as const, originalCapitalCityId: 1 },
        { faction: "ICE_FOLK" as const, originalCapitalCityId: 2 },
      ],
    } as unknown as Parameters<typeof cityNameV7>[0];
    expect(cityGazetteerV7(view.setup).size).toBe(0);
    const capital = cityNameEntryV7(view, {
      id: 2,
      at: { x: 3, y: 4 },
    } as never);
    expect(capital.faction).toBe("ICE_FOLK");
    expect(CITY_NAME_LISTS_V7.ICE_FOLK).toContain(capital.name);
    const other = cityNameEntryV7(view, { id: 9, at: { x: 6, y: 1 } } as never);
    expect(["MARTIAN", "ICE_FOLK"]).toContain(other.faction);
    expect(CITY_NAME_LISTS_V7[other.faction]).toContain(other.name);
    expect(
      cityNameEntryV7(view, { id: 9, at: { x: 6, y: 1 } } as never),
    ).toEqual(other);
  });
});

describe("city names in player-facing text", () => {
  const state = match(setup(5, ["ORIGINAL", "GOBLIN", "UNDEAD"], 16));
  const everything: GameStateV7 = {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      explored: state.board.tiles.map((tile) => tile.at),
    })),
  };
  const view = viewForV7(everything, everything.humanPlayerId);
  const own = view.cities.find((city) => city.ownerId === view.viewer.id);
  const theirs = view.cities.find((city) => city.ownerId !== view.viewer.id);
  if (own === undefined || theirs === undefined)
    throw new Error("the text fixture has no cities");
  const ID_OR_TILE = /\bc\d+\b|\bcity \d|\d+\s*,\s*\d+|@/i;

  it("the notices name the city and never its id or tile", () => {
    const events = [
      {
        kind: "CITY_CAPTURED",
        cityId: theirs.id,
        from: null,
        to: view.viewer.id,
      },
      {
        kind: "CITY_CAPTURED",
        cityId: theirs.id,
        from: theirs.ownerId,
        to: view.viewer.id,
      },
      {
        kind: "CITY_CAPTURED",
        cityId: own.id,
        from: view.viewer.id,
        to: theirs.ownerId,
      },
      { kind: "CITY_LEVELED_UP", cityId: own.id, level: 3 },
      // A city out of sight adds nothing.
      { kind: "CITY_CAPTURED", cityId: 9999, from: null, to: theirs.ownerId },
    ] as unknown as readonly PlayerEventV7[];
    const notice = cityBoundaryNoticeV7(events, view, view);
    const theirName = cityNameV7(view, theirs);
    const ownName = cityNameV7(view, own);
    const rival = view.players.find((player) => player.id === theirs.ownerId);
    expect(notice?.toast).toBe(true);
    expect(notice?.text).toBe(
      [
        `${theirName} founded`,
        `${theirName} captured`,
        `${ownName} lost to Player ${(rival?.seat ?? 0) + 1}`,
        `${ownName} grew to level 3`,
      ].join(" · "),
    );
    expect(notice?.text).not.toMatch(ID_OR_TILE);
    expect(cityBoundaryNoticeV7([], view, view)).toBeNull();
    // Another player's capture in sight is told, without a toast.
    const watched = cityBoundaryNoticeV7(
      [
        {
          kind: "CITY_CAPTURED",
          cityId: theirs.id,
          from: null,
          to: theirs.ownerId,
        },
      ] as unknown as readonly PlayerEventV7[],
      view,
      view,
    );
    expect(watched).toEqual({
      text: `Player ${(rival?.seat ?? 0) + 1} founded ${theirName}`,
      toast: false,
    });
  });

  it("the board plan carries the name and a spoken label without an id", () => {
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const cities = plan.entries.filter((entry) => entry.kind === "CITY");
    expect(cities).toHaveLength(view.cities.length);
    for (const entry of cities) {
      const city = view.cities.find(
        (candidate) => `city:${candidate.id}` === entry.key,
      );
      if (city === undefined) throw new Error("plan city is not in the view");
      expect(entry.cityName).toBe(cityNameV7(view, city));
      expect(entry.label).toBe(cityAccessibleNameV7(view, city));
      expect(entry.label).toMatch(/^(Capital|City) [A-Z][a-z]+$/);
      expect(entry.label).not.toMatch(ID_OR_TILE);
    }
  });
});

describe("the city name plate", () => {
  const ZOOM = 80 / 128;

  it("is placed from the city's draw position and moves with it", () => {
    const still = cityNameLabelLayoutV7({ x: 200, y: 300 }, ZOOM);
    const hopped = cityNameLabelLayoutV7({ x: 207, y: 288 }, ZOOM);
    expect(hopped.centerX - still.centerX).toBe(7);
    expect(hopped.top - still.top).toBe(-12);
    // Under the city's cell: the plate starts below the cell's lower edge.
    expect(still.top).toBeGreaterThan(300 + 40);
    expect(still.top).toBeLessThan(300 + 40 + 4);
    expect(still.visible).toBe(true);
    expect(still.alpha).toBe(1);
  });

  it("keeps a legible size and fades out when the board is tiny", () => {
    const sizes = [0.75, 1, 1.5, 2].map(
      (step) => cityNameLabelLayoutV7({ x: 0, y: 0 }, step * ZOOM).fontPx,
    );
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(CITY_NAME_MIN_FONT_PX_V7);
      expect(size).toBeLessThanOrEqual(CITY_NAME_MAX_FONT_PX_V7);
    }
    expect(sizes[0]).toBe(CITY_NAME_MIN_FONT_PX_V7);
    expect(sizes[3]).toBe(CITY_NAME_MAX_FONT_PX_V7);
    const tiny = cityNameLabelLayoutV7(
      { x: 0, y: 0 },
      CITY_NAME_HIDDEN_CELL_PX_V7 / 128,
    );
    expect(tiny.visible).toBe(false);
    const fading = cityNameLabelLayoutV7({ x: 0, y: 0 }, 46 / 128);
    expect(fading.alpha).toBeGreaterThan(0);
    expect(fading.alpha).toBeLessThan(1);
  });

  it("draws the name on a plate edged in the owner's colour", () => {
    const calls: string[] = [];
    const strokes: string[] = [];
    const context = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      beginPath: () => undefined,
      moveTo: () => undefined,
      arcTo: () => undefined,
      closePath: () => undefined,
      fill: () => calls.push("fill"),
      stroke() {
        strokes.push(String(this.strokeStyle));
      },
      measureText: (text: string) => ({ width: text.length * 7 }),
      fillText: (text: string) => calls.push(`text:${text}`),
      globalAlpha: 1,
      font: "",
      textAlign: "",
      textBaseline: "",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
    };
    const drawn = drawCityNameLabelV7(
      context as unknown as CanvasRenderingContext2D,
      { x: 200, y: 300 },
      ZOOM,
      "Aldmere",
      { ownerColor: "#e2574c" },
    );
    expect(calls).toEqual(["save", "fill", "text:Aldmere", "restore"]);
    expect(strokes).toEqual(["#e2574c"]);
    expect(context.font).toMatch(/^800 [\d.]+px system-ui$/);
    if (drawn === null) throw new Error("nothing was drawn");
    // Centred under the city, no wider than the cell and a little.
    expect(drawn.left + drawn.width / 2).toBeCloseTo(200);
    expect(drawn.width).toBeLessThanOrEqual(80 * 1.3);
    expect(drawn.top).toBeGreaterThan(340);
    // Too small a board draws nothing.
    expect(
      drawCityNameLabelV7(
        context as unknown as CanvasRenderingContext2D,
        { x: 0, y: 0 },
        30 / 128,
        "Aldmere",
      ),
    ).toBeNull();
  });
});
