import {
  isNavalRoleV7,
  missionByIdV7,
  queryAlliedV7,
  type CoordV7,
  type FactionIdV7,
  type MissionDefinitionV7,
  type MissionReinforcementV7,
  type PlayerEventV7,
  type PlayerViewV7,
} from "../engine/index";
import { cityNameV7 } from "./city-names-presentation-v7";
import { tribePluralV7 } from "./tribe-stars-presentation-v7";

/**
 * How a mission's reinforcement wave is announced (`pulp_wars-hmyk.18`,
 * docs/product/CAMPAIGN.md section 10.3, docs/product/SAGA.md section 4,
 * E4): the banner that says who arrived and roughly where, with the wave's
 * story line, and the scouts' heads-up a turn before an announced wave.
 * Pure functions of the player views, the projected events and the
 * mission definition; no DOM.
 *
 * Nothing here names a tile: a place is a city's name ("near Gumdrop") or
 * a part of the map ("in the north-east"), and the camera shows the rest.
 */

/** Whose wave it is, from the viewer's side. */
export type WaveSideV7 = "OWN" | "ALLY" | "ENEMY";

export interface WaveBannerV7 {
  /** An arrival, or the scouts' heads-up before one. */
  readonly kind: "ARRIVAL" | "HEADS_UP";
  readonly side: WaveSideV7;
  readonly playerId: number;
  readonly faction: FactionIdV7;
  /** The kicker: "Enemy reinforcements!", "Enemies approaching!". */
  readonly title: string;
  /** Who and where: "Three Goblin raiders arrive in the north." */
  readonly text: string;
  /** The wave's story line (E4); null for a heads-up. */
  readonly line: string | null;
  /** The tiles the wave arrived on (empty for a heads-up). */
  readonly cells: readonly CoordV7[];
}

/** The viewer's own seat, an ally (a team mate), or an enemy. */
export function waveSideV7(
  view: Pick<PlayerViewV7, "setup" | "humanPlayerId" | "viewer">,
  playerId: number,
): WaveSideV7 {
  if (playerId === view.viewer.id) return "OWN";
  return queryAlliedV7(view, view.viewer.id, playerId) ? "ALLY" : "ENEMY";
}

/** The kicker of a heads-up, by side. */
const HEADS_UP_TITLES_V7: Readonly<Record<WaveSideV7, string>> = {
  OWN: "Help is on the way!",
  ALLY: "Allies approaching!",
  ENEMY: "Enemies approaching!",
};

const TITLES_V7: Readonly<Record<WaveSideV7, string>> = {
  OWN: "Your reinforcements!",
  ALLY: "Allied reinforcements!",
  ENEMY: "Enemy reinforcements!",
};

/** What one unit of a faction's wave is called, and many of them. */
const WAVE_NOUNS_V7: Readonly<
  Record<FactionIdV7, { readonly one: string; readonly many: string }>
> = {
  ORIGINAL: { one: "Human soldier", many: "Human soldiers" },
  UNDEAD: { one: "Undead warrior", many: "Undead warriors" },
  GOBLIN: { one: "Goblin raider", many: "Goblin raiders" },
  DINOSAUR: { one: "Dinosaur", many: "Dinosaurs" },
  MARTIAN: { one: "Martian trooper", many: "Martian troopers" },
  ICE_FOLK: { one: "Ice Folk warrior", many: "Ice Folk warriors" },
  DWARF: { one: "Dwarf soldier", many: "Dwarf soldiers" },
  CANDY: { one: "Candy soldier", many: "Candy soldiers" },
  CULT: { one: "Cultist", many: "Cultists" },
};

/**
 * The generic story line of a wave that has none of its own (E4): one per
 * faction for an enemy wave, one for a friendly one (the viewer's own or
 * an ally's). Every wave of every mission shows one of these unless its
 * definition writes a `line`.
 */
export const DEFAULT_WAVE_LINES_V7: Readonly<
  Record<FactionIdV7, { readonly enemy: string; readonly friend: string }>
> = {
  ORIGINAL: {
    enemy: "Bugles on the road: a fresh column marches in, bayonets fixed.",
    friend: "The relief column is here, bayonets fixed and boots muddy.",
  },
  UNDEAD: {
    enemy: "The earth heaves, and more of the dead climb out of it.",
    friend: "The dead are here. They apologise for the delay.",
  },
  GOBLIN: {
    enemy: "A war horn, a cackle, and more Goblins come looking for loot.",
    friend: "More Goblins! Somebody told them there was loot.",
  },
  DINOSAUR: {
    enemy: "The ground shakes. Something big is hungry.",
    friend: "A roar from the ferns: the pack has come.",
  },
  MARTIAN: {
    enemy: "A hum in the sky: another landing party beams down.",
    friend: "Greetings, Earthlings. Reinforcements have materialised.",
  },
  ICE_FOLK: {
    enemy: "A cold wind blows, and the Ice Folk come down with it.",
    friend: "Out of the snow, the war band answers the horn.",
  },
  DWARF: {
    enemy: "Boots on stone: a Dwarf company tramps up from below.",
    friend: "The Hold sends its regards, and a company of Dwarves.",
  },
  CANDY: {
    enemy: "A sticky drum roll: Candy troops march in, smiling.",
    friend: "Fresh from the oven: Candy reinforcements!",
  },
  CULT: {
    enemy: "Robed figures file in, humming, their daggers already wet.",
    friend: "The Lodge sends more of the faithful. Mind the daggers.",
  },
};

/** The story line a wave shows: its own, or its faction's and side's. */
export function waveLineV7(
  faction: FactionIdV7,
  side: WaveSideV7,
  wave: Pick<MissionReinforcementV7, "line"> | null = null,
): string {
  if (wave?.line !== undefined) return wave.line;
  const lines = DEFAULT_WAVE_LINES_V7[faction];
  return side === "ENEMY" ? lines.enemy : lines.friend;
}

const COUNT_WORDS_V7 = [
  "",
  "",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

/** "A Goblin raider", "An Ice Folk warrior", "Three Goblin raiders". */
function waveSubjectV7(faction: FactionIdV7, count: number): string {
  const noun = WAVE_NOUNS_V7[faction];
  if (count === 1)
    return `${/^[AEIOU]/.test(noun.one) ? "An" : "A"} ${noun.one}`;
  return `${COUNT_WORDS_V7[count] ?? String(count)} ${noun.many}`;
}

/** The part of the board a tile is in, in words. */
export function boardRegionV7(
  board: Pick<PlayerViewV7["board"], "width" | "height">,
  at: CoordV7,
): string {
  const third = (value: number, size: number): 0 | 1 | 2 => {
    const share = (value + 0.5) / size;
    return share < 1 / 3 ? 0 : share > 2 / 3 ? 2 : 1;
  };
  const row = third(at.y, board.height);
  const column = third(at.x, board.width);
  const ns = row === 0 ? "north" : row === 2 ? "south" : "";
  const ew = column === 0 ? "west" : column === 2 ? "east" : "";
  if (ns === "" && ew === "") return "the middle of the map";
  return `the ${ns !== "" && ew !== "" ? `${ns}-${ew}` : ns + ew}`;
}

/** The middle of a set of tiles, rounded to a tile. */
function centreOf(cells: readonly CoordV7[]): CoordV7 {
  const x = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
  const y = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
  return { x: Math.round(x), y: Math.round(y) };
}

/** How far a city may be from a wave and still name where it came. */
const NEAR_CITY_STEPS_V7 = 3;

/**
 * Where a wave came, in words: "near Gumdrop" when a city the viewer can
 * see is within three steps of its middle (the nearest; ties by the
 * city's ID), otherwise the part of the map ("in the north-east").
 */
export function waveWhereV7(
  view: Pick<PlayerViewV7, "setup" | "players" | "cities" | "board">,
  cells: readonly CoordV7[],
): string {
  const centre = centreOf(cells);
  let best: { readonly steps: number; readonly name: string } | null = null;
  for (const city of [...view.cities].sort((a, b) => a.id - b.id)) {
    const steps = Math.max(
      Math.abs(city.at.x - centre.x),
      Math.abs(city.at.y - centre.y),
    );
    if (steps > NEAR_CITY_STEPS_V7) continue;
    if (best !== null && best.steps <= steps) continue;
    best = { steps, name: cityNameV7(view, city) };
  }
  if (best !== null) return `near ${best.name}`;
  return `in ${boardRegionV7(view.board, centre)}`;
}

/** Whether a land tile touches water on one of its four sides. */
function coastal(view: Pick<PlayerViewV7, "board">, at: CoordV7): boolean {
  const tileAt = (x: number, y: number) =>
    view.board.tiles.find((tile) => tile.at.x === x && tile.at.y === y);
  const water = (x: number, y: number): boolean => {
    const tile = tileAt(x, y);
    return (
      tile !== undefined &&
      tile.explored &&
      (tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER")
    );
  };
  const own = tileAt(at.x, at.y);
  if (own === undefined || !own.explored) return false;
  if (own.terrain === "SHALLOW_WATER" || own.terrain === "DEEP_WATER")
    return false;
  return (
    water(at.x + 1, at.y) ||
    water(at.x - 1, at.y) ||
    water(at.x, at.y + 1) ||
    water(at.x, at.y - 1)
  );
}

/**
 * The banner's sentence: who and where. Ships "sail up"; a wave on the
 * shore "lands on the coast"; any other "arrives".
 */
export function waveSentenceV7(
  view: Pick<PlayerViewV7, "setup" | "players" | "cities" | "board">,
  faction: FactionIdV7,
  units: readonly { readonly role: string; readonly at: CoordV7 }[],
): string {
  const count = units.length;
  const one = count === 1;
  const cells = units.map((unit) => unit.at);
  const where = waveWhereV7(view, cells);
  const verb = units.every((unit) => isNavalRoleV7(unit.role))
    ? one
      ? "sails up"
      : "sail up"
    : cells.every((cell) => coastal(view, cell))
      ? `${one ? "lands" : "land"} on the coast`
      : one
        ? "arrives"
        : "arrive";
  return `${waveSubjectV7(faction, count)} ${verb} ${where}.`;
}

/** The mission a view plays, or null for a match that is no mission. */
export function missionOfViewV7(
  view: Pick<PlayerViewV7, "mission">,
): MissionDefinitionV7 | null {
  const id = view.mission?.missionId;
  return id === undefined ? null : missionByIdV7(id);
}

type ArrivalEventV7 = Extract<PlayerEventV7, { kind: "REINFORCEMENT_ARRIVED" }>;

/**
 * The banner of the wave that arrived in one boundary, or null when none
 * did (or the fog hid all of it: an arrival the viewer does not see is not
 * projected). A boundary begins one seat's turn, so its arrivals are one
 * seat's; should two seats' arrive, the first one's is shown. Its count
 * and its place are the units the viewer saw arrive.
 */
export function waveArrivalBannerV7(
  after: PlayerViewV7,
  events: readonly PlayerEventV7[],
  mission: MissionDefinitionV7 | null = missionOfViewV7(after),
): WaveBannerV7 | null {
  const arrivals = events.filter(
    (event): event is ArrivalEventV7 => event.kind === "REINFORCEMENT_ARRIVED",
  );
  const first = arrivals[0];
  if (first === undefined) return null;
  const units = arrivals.filter((event) => event.playerId === first.playerId);
  const player = after.players.find((entry) => entry.id === first.playerId);
  if (player === undefined) return null;
  const side = waveSideV7(after, player.id);
  const wave =
    (mission?.reinforcements ?? []).find(
      (entry) =>
        entry.seat === player.seat &&
        entry.round === after.round &&
        entry.line !== undefined,
    ) ?? null;
  return {
    kind: "ARRIVAL",
    side,
    playerId: player.id,
    faction: player.faction,
    title: TITLES_V7[side],
    text: waveSentenceV7(after, player.faction, units),
    line: waveLineV7(player.faction, side, wave),
    cells: units.map((unit) => unit.at),
  };
}

/** Who the scouts saw: "Goblins", "allied Undead", "your reinforcements". */
function scoutedV7(side: WaveSideV7, faction: FactionIdV7): string {
  if (side === "OWN") return "your reinforcements";
  const tribe = tribePluralV7(faction);
  return side === "ALLY" ? `allied ${tribe}` : tribe;
}

/**
 * The round of the viewer's last turn before `wave` arrives: the wave's
 * round when the viewer plays before its seat in the round, else the
 * round before. A wave of the viewer's own seat arrives at the start of
 * the viewer's turn, so its heads-up is the turn before.
 */
export function waveHeadsUpRoundV7(
  view: Pick<PlayerViewV7, "turnOrder" | "players" | "viewer">,
  wave: Pick<MissionReinforcementV7, "seat" | "round">,
): number | null {
  const player = view.players.find((entry) => entry.seat === wave.seat);
  if (player === undefined) return null;
  const waveAt = view.turnOrder.indexOf(player.id);
  const viewerAt = view.turnOrder.indexOf(view.viewer.id);
  if (waveAt < 0 || viewerAt < 0) return null;
  return viewerAt < waveAt ? wave.round : wave.round - 1;
}

/**
 * The scouts' heads-up of the viewer's turn that `view` begins: one banner
 * for every wave its mission marks `announce` that arrives before the
 * viewer's next turn, of a seat still in the match; empty for every other
 * turn and for a match that is no mission. A wave whose heads-up would
 * fall on the first round gets none: the briefing and the hints speak
 * then.
 */
export function waveHeadsUpBannersV7(
  view: PlayerViewV7,
  mission: MissionDefinitionV7 | null = missionOfViewV7(view),
): readonly WaveBannerV7[] {
  if (mission === null || view.outcome !== null) return [];
  if (view.turnOrder[view.activeSeatIndex] !== view.viewer.id) return [];
  const banners: WaveBannerV7[] = [];
  for (const wave of mission.reinforcements ?? []) {
    if (wave.announce === undefined) continue;
    if (waveHeadsUpRoundV7(view, wave) !== view.round) continue;
    const player = view.players.find((entry) => entry.seat === wave.seat);
    if (player === undefined || player.status !== "ACTIVE") continue;
    const side = waveSideV7(view, player.id);
    const region = boardRegionV7(
      view.board,
      centreOf(wave.units.map((unit) => unit.at)),
    );
    const from = region === "the middle of the map" ? "" : ` from ${region}`;
    banners.push({
      kind: "HEADS_UP",
      side,
      playerId: player.id,
      faction: player.faction,
      title: HEADS_UP_TITLES_V7[side],
      text:
        wave.announce === true
          ? `Scouts report ${scoutedV7(side, player.faction)} approaching${from}.`
          : wave.announce,
      line: null,
      cells: [],
    });
  }
  return banners;
}

/**
 * Whether a boundary began the viewer's turn: the view after it is the
 * viewer's turn and the view before it was another seat's (or an earlier
 * round's). The heads-up is shown then.
 */
export function boundaryBeginsViewerTurnV7(
  before: Pick<PlayerViewV7, "turnOrder" | "activeSeatIndex" | "round">,
  after: Pick<
    PlayerViewV7,
    "turnOrder" | "activeSeatIndex" | "round" | "viewer" | "outcome"
  >,
): boolean {
  if (after.outcome !== null) return false;
  if (after.turnOrder[after.activeSeatIndex] !== after.viewer.id) return false;
  return (
    before.round !== after.round ||
    before.turnOrder[before.activeSeatIndex] !== after.viewer.id
  );
}
