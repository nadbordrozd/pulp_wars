/**
 * Synthetic in-game scene for the faction city review (bead pulp_wars-6gd.6).
 *
 * Loaded in the browser through the Vite dev server by
 * scripts/art/chibi-faction-cities-review.ts: it takes the live Ruleset 7
 * player view, rewrites a patch around the viewer's capital and draws it with
 * the real CanvasBoardHostV7 and ?art=chibi, full screen over the running
 * game. Nothing here is part of the game build.
 *
 * Layout: one column pair per faction (Human, Undead, Goblin by default) and
 * one row pair per city level (1, 2, 3 from the top). Every city owns its
 * 2 x 2 block, so territory borders run between factions and the edge of
 * the patch. Level 1 holds the faction's standard unit, level 2 is
 * fortified (the City Wall badge) with a ranged unit beside it, and level 3
 * is the capital (crown) holding the faction's large unit at half HP.
 */
import type {
  CoordV7,
  FactionIdV7,
  PlayerViewV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];
type Border = PlayerViewV7["board"]["territoryBorders"][number];
type City = PlayerViewV7["cities"][number];
type Unit = PlayerViewV7["units"][number];

const LEVELS = [1, 2, 3] as const;

function key(at: CoordV7): string {
  return `${at.x},${at.y}`;
}

/** The live view with the city patch written around the viewer's capital. */
export function chibiCitiesReviewViewV7(
  live: PlayerViewV7,
  factions: readonly FactionIdV7[] = ["ORIGINAL", "UNDEAD", "GOBLIN"],
): { readonly view: PlayerViewV7; readonly centre: CoordV7 } {
  const viewerId = live.viewer.id;
  const capital =
    live.cities.find((city) => city.ownerId === viewerId && city.isCapital) ??
    live.cities[0];
  const template = live.units.find((unit) => unit.ownerId === viewerId);
  const rival = live.players.find((player) => player.id !== viewerId);
  const viewer = live.players.find((player) => player.id === viewerId);
  if (
    capital === undefined ||
    template === undefined ||
    rival === undefined ||
    viewer === undefined
  )
    throw new Error("the live view has no capital, unit or rival");
  const columns = factions.length * 2;
  const rows = LEVELS.length * 2;
  const origin = {
    x: Math.max(0, Math.min(live.board.width - columns, capital.at.x - 1)),
    y: Math.max(0, Math.min(live.board.height - rows, capital.at.y - 1)),
  };
  // One owner per faction: the viewer, the first rival, then extra seats in
  // colours no seat uses.
  const usedColors = new Set([viewer.color, rival.color]);
  const freeColors = (["CORAL", "TEAL", "GOLD", "VIOLET"] as const).filter(
    (color) => !usedColors.has(color),
  );
  const firstExtraId = Math.max(...live.players.map((player) => player.id)) + 1;
  const owners = factions.map((faction, index) =>
    index === 0
      ? { ...viewer, faction }
      : index === 1
        ? { ...rival, faction }
        : {
            ...rival,
            id: (firstExtraId + index) as typeof rival.id,
            seat: live.players.length + index,
            color: freeColors[index - 2] ?? rival.color,
            faction,
          },
  );
  const cities: City[] = [];
  const units: Unit[] = [];
  const cityAt = new Map<string, City>();
  const blockCity = new Map<string, City>();
  const unit = (
    owner: (typeof owners)[number],
    role: UnitRoleIdV7,
    at: CoordV7,
    hp: number,
  ): Unit => ({
    ...template,
    id: (9000 + units.length) as typeof template.id,
    ownerId: owner.id,
    role,
    form: "LAND",
    hp,
    at,
  });
  for (const [column, owner] of owners.entries())
    for (const [row, level] of LEVELS.entries()) {
      const at = { x: origin.x + column * 2, y: origin.y + row * 2 + 1 };
      const city: City = {
        ...capital,
        id: (capital.id + 1000 + cities.length) as typeof capital.id,
        ownerId: owner.id,
        at,
        level,
        population: level + 1,
        isCapital: level === 3,
      };
      cities.push(city);
      cityAt.set(key(at), city);
      for (const dx of [0, 1])
        for (const dy of [-1, 0])
          blockCity.set(key({ x: at.x + dx, y: at.y + dy }), city);
      if (level === 1) units.push(unit(owner, "FIGHTER", at, template.maxHp));
      if (level === 2)
        units.push(
          unit(owner, "MARKSMAN", { x: at.x + 1, y: at.y }, template.maxHp),
        );
      if (level === 3)
        units.push(unit(owner, "KNIGHT", at, Math.ceil(template.maxHp / 2)));
    }
  const tiles: Tile[] = live.board.tiles.map((tile) => {
    const city = cityAt.get(key(tile.at));
    const block = blockCity.get(key(tile.at));
    return {
      at: tile.at,
      explored: true,
      biome: null,
      terrain: "GRASS",
      resource: null,
      improvement: null,
      road: false,
      fieldDefense: false,
      fortificationLevel: city?.level === 2 ? 1 : null,
      site: city === undefined ? null : city.isCapital ? "CAPITAL" : "CITY",
      territoryCityId: block?.id ?? null,
      territoryOwnerId: block?.ownerId ?? null,
    };
  });
  // Territory edges as the engine's view emits them: once per edge, where
  // the cities on both sides differ.
  const territoryBorders: Border[] = [];
  for (const tile of tiles)
    for (const { edge, dx, dy } of [
      { edge: "NORTH", dx: 0, dy: -1 },
      { edge: "EAST", dx: 1, dy: 0 },
      { edge: "SOUTH", dx: 0, dy: 1 },
      { edge: "WEST", dx: -1, dy: 0 },
    ] as const) {
      if (
        (edge === "WEST" && tile.at.x > 0) ||
        (edge === "NORTH" && tile.at.y > 0)
      )
        continue;
      const left = blockCity.get(key(tile.at));
      const right = blockCity.get(
        key({ x: tile.at.x + dx, y: tile.at.y + dy }),
      );
      if (left?.id === right?.id) continue;
      const leftOwner = left?.ownerId ?? null;
      const rightOwner = right?.ownerId ?? null;
      territoryBorders.push({
        at: tile.at,
        edge,
        ownerId: leftOwner === rightOwner ? null : (leftOwner ?? rightOwner),
        sharedOwnerIds:
          leftOwner !== null && rightOwner !== null && leftOwner !== rightOwner
            ? [leftOwner, rightOwner]
            : null,
        cityIds: [left, right].flatMap((city) =>
          city === undefined ? [] : [city.id],
        ),
      });
    }
  const ownerIds = new Set(owners.map((owner) => owner.id));
  return {
    view: {
      ...live,
      players: [
        ...live.players.filter((player) => !ownerIds.has(player.id)),
        ...owners,
      ].sort((left, right) => left.id - right.id),
      board: { ...live.board, tiles, territoryBorders },
      cities,
      units,
      treasureChests: [],
      graves: [],
      plagued: [],
      bitten: [],
      improvementValues: [],
    },
    centre: {
      x: origin.x + Math.floor((columns - 1) / 2),
      y: origin.y + Math.floor(rows / 2),
    },
  };
}

/** Mounts a full-screen CHIBI board host over the page showing the patch. */
export function showChibiCitiesReviewV7(
  live: PlayerViewV7,
  factions?: readonly FactionIdV7[],
): {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
  readonly centre: CoordV7;
} {
  document
    .querySelectorAll("[data-chibi-review-scene]")
    .forEach((node) => node.remove());
  const { view, centre } = chibiCitiesReviewViewV7(live, factions);
  const container = document.createElement("div");
  container.dataset.chibiReviewScene = "true";
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "#173632",
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, {
    onSelection: () => undefined,
    onCommand: () => undefined,
  });
  host.update({
    matchInstanceId: "chibi-cities-review-scene",
    view,
    offeredCommands: [],
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    interactive: false,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: true,
    highContrast: false,
    artSet: "CHIBI",
    // The look the game draws by default (bead pulp_wars-3tq.6).
    ...liveBoardLookV7("CHIBI"),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas, centre };
}
