import { expect } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  canonicalHash,
  factionTreeV7,
  parseEventV7,
  parseGameStateV7,
  previewAttackExplosionsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type TileStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import {
  rewardStateV7,
  withEggsV7,
  type EggPieceV7,
} from "./v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "./v7-goblin-arena";

/**
 * Revision-20 rule fixtures (docs/product/RULESET_7_REVISION_20.md) on top
 * of the revision-17 arena.
 *
 * Two-seat field: seat 0 capital (8, 8) with territory x 7-9, y 7-9; seat 1
 * capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5), (8, 5),
 * (5, 8). `fieldV7` turns every other tile into open Grass with no chest.
 */

export const at = (x: number, y: number): CoordV7 => ({ x, y });

export const kindsV7 = (events: readonly DomainEventV7[]): readonly string[] =>
  events.map((event) => event.kind);

/** Every Dinosaur technology except `excluded` and what depends on them. */
export function withoutTechsV7(
  faction: FactionIdV7,
  ...excluded: TechnologyIdV7[]
): readonly TechnologyIdV7[] {
  const removed = new Set<TechnologyIdV7>(excluded);
  const nodes = factionTreeV7(faction).nodes;
  for (let changed = true; changed;) {
    changed = false;
    for (const node of nodes)
      if (
        !removed.has(node.id) &&
        node.prerequisites.some((tech) => removed.has(tech))
      ) {
        removed.add(node.id);
        changed = true;
      }
  }
  return TECHNOLOGY_IDS_V7.filter((tech) => !removed.has(tech));
}

export interface FieldOptionsV7 extends GoblinArenaOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  readonly eggs?: readonly EggPieceV7[];
}

/** An arena whose land outside every territory and site is open Grass. */
export function fieldV7(
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 {
  const arena = goblinArenaV7(
    options.factions ?? ["DINOSAUR", "ORIGINAL"],
    pieces,
    options,
  );
  const water = options.water ?? [];
  const open = checkedV7({
    ...arena,
    treasureChests: [],
    players: arena.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.achievement === "EXPLORER" &&
        player.researchedTechs.includes("SCOUTING")
          ? { ...entry, unlocked: true }
          : entry,
      ),
    })),
    board: {
      ...arena.board,
      tiles: arena.board.tiles.map((tile) =>
        tile.site === null && !water.some((where) => sameV7(where, tile.at))
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
  return options.eggs === undefined ? open : withEggsV7(open, options.eggs);
}

export function patchTileV7(
  state: GameStateV7,
  where: CoordV7,
  patch: Partial<TileStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        sameV7(tile.at, where) ? { ...tile, ...patch } : tile,
      ),
    },
  });
}

export const forestV7 = (state: GameStateV7, where: CoordV7): GameStateV7 =>
  patchTileV7(state, where, { terrain: "FOREST", biome: "WOODLAND" });
export const mountainV7 = (state: GameStateV7, where: CoordV7): GameStateV7 =>
  patchTileV7(state, where, { terrain: "MOUNTAIN", biome: "HIGHLANDS" });
export const fieldDefenseV7 = (
  state: GameStateV7,
  where: CoordV7,
): GameStateV7 => patchTileV7(state, where, { fieldDefense: true });

export function tileV7(state: GameStateV7, where: CoordV7): TileStateV7 {
  const tile = state.board.tiles.find((candidate) =>
    sameV7(candidate.at, where),
  );
  if (tile === undefined) throw new Error("tile missing");
  return tile;
}

/** Removes `hidden` from the explored tiles of `seat`. */
export function unexploreV7(
  state: GameStateV7,
  seat: number,
  hidden: readonly CoordV7[],
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.seat === seat
        ? {
            ...player,
            explored: player.explored.filter(
              (where) => !hidden.some((tile) => sameV7(tile, where)),
            ),
          }
        : player,
    ),
  });
}

/** Sets fields of the unit on `where` (HP, kills, activation, ...). */
export function patchUnitV7(
  state: GameStateV7,
  where: CoordV7,
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      sameV7(unit.at, where) ? { ...unit, ...patch } : unit,
    ),
  });
}

export function activeIdV7(state: GameStateV7): GameStateV7["humanPlayerId"] {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("no active player");
  return id;
}

export function combatOfV7(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const combat = events.find((event) => event.kind === "COMBAT_RESOLVED");
  if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return combat.preview;
}

export interface AttackRunV7 {
  readonly before: GameStateV7;
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
  readonly combat: CombatPreviewV7;
  /** The public preview the attacker's owner saw before the command. */
  readonly preview: CombatPreviewV7;
  /** The attacker after the command, or undefined when it died. */
  readonly attacker: UnitStateV7 | undefined;
  /** The target after the command, or undefined when it died. */
  readonly target: UnitStateV7 | undefined;
}

/**
 * Resolves an offered `ATTACK` and checks that its public preview equals the
 * resolution (section 7.1), that every event and the state round-trip, and
 * that the command is deterministic. The one fact a viewer cannot know is
 * another player's Engineering or Navigation, for a Push onto a Mountain or
 * Deep Water: then the public Push is `UNKNOWN_BEHIND_FOG` and only the hit
 * is compared.
 */
export function attackV7(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): AttackRunV7 {
  const actor = activeIdV7(state);
  const unit = unitAtV7(state, from);
  const target = unitAtV7(state, to);
  const command: CommandV7 = {
    kind: "ATTACK",
    unitId: unit.id,
    targetUnitId: target.id,
  };
  const view = viewForV7(state, actor);
  expect(queryPlayerCommandsV7(view)).toContainEqual(command);
  const preview = queryCombatPreviewV7(view, unit.id, target.id);
  if (preview === null) throw new Error("no attack preview");
  const chain = previewAttackExplosionsV7(view, unit.id, target.id);
  const result = applyOkV7(state, actor, command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  const combat = combatOfV7(result.events);
  const hiddenTechnology =
    preview.push === "UNKNOWN_BEHIND_FOG" &&
    combat.push !== "UNKNOWN_BEHIND_FOG";
  if (hiddenTechnology) {
    const { push: _push, advances: _advances, ...hit } = preview;
    void _push;
    void _advances;
    expect(combat).toMatchObject(hit);
  } else expect(preview).toEqual(combat);
  if (chain !== null && !chain.touchesUnexplored && !hiddenTechnology)
    expect(
      chain.explosions.map((explosion) => ({
        at: explosion.at,
        wave: explosion.wave,
        damage: explosion.damage,
        results: explosion.results.map((entry) => ({
          at: entry.at,
          damage: entry.damage,
          dies: entry.dies,
        })),
      })),
    ).toEqual(
      result.events.flatMap((event) =>
        event.kind === "EXPLOSION_RESOLVED"
          ? [
              {
                at: event.at,
                wave: event.wave,
                damage: event.damage,
                results: event.results.map((entry) => ({
                  at: entry.at,
                  damage: entry.damage,
                  dies: entry.dies,
                })),
              },
            ]
          : [],
      ),
    );
  const again = applyOkV7(state, actor, command);
  expect(again.events).toEqual(result.events);
  expect(canonicalHash(again.state)).toBe(canonicalHash(result.state));
  return {
    before: state,
    state: result.state,
    events: result.events,
    combat,
    preview,
    attacker: result.state.units.find((candidate) => candidate.id === unit.id),
    target: result.state.units.find((candidate) => candidate.id === target.id),
  };
}

/** Moves the unit on `from` along `path` (tiles entered) and returns the state. */
export function moveV7(
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  return applyOkV7(state, activeIdV7(state), {
    kind: "MOVE",
    unitId: unitAtV7(state, from).id,
    path: [...path],
  });
}

/** A piece that has moved `tiles` tiles this turn and not yet attacked. */
export const movedV7 = (
  tiles: number,
): { readonly moved: true; readonly movedPathLength: number } => ({
  moved: true,
  movedPathLength: tiles,
});

export interface WalledOptionsV7 {
  /** The faction of the attacking seat 1 (default Dinosaur). */
  readonly attackerFaction?: FactionIdV7;
  /** The defender's faction, seat 0 (default Human). */
  readonly defenderFaction?: FactionIdV7;
  /** The role standing on the Walled center (8, 8) (default Guard). */
  readonly defender?: UnitStateV7["role"];
  /** Seat 1's pieces. */
  readonly attackers: readonly {
    readonly role: UnitStateV7["role"];
    readonly at: CoordV7;
  }[];
  /** More seat-0 pieces (homed to the capital). */
  readonly defenders?: readonly {
    readonly role: UnitStateV7["role"];
    readonly at: CoordV7;
  }[];
  /** Field Defense on the center too. */
  readonly fieldDefense?: boolean;
  /** Seat 1's researched technologies (default: every technology). */
  readonly attackerTechs?: readonly TechnologyIdV7[];
}

/**
 * A level-5 Walled capital of seat 0 at (8, 8) with a defender on its
 * center, and seat 1's attackers, on seat 1's turn. Every land tile outside
 * a site that is not a Farm of the grown capital stays as generated.
 */
export function walledV7(options: WalledOptionsV7): GameStateV7 {
  const fixture = rewardStateV7(
    "JUGGERNAUT",
    options.defenderFaction ?? "ORIGINAL",
    [
      { role: options.defender ?? "GUARD", at: at(8, 8) },
      ...(options.defenders ?? []),
    ],
    {
      faction: options.attackerFaction ?? "DINOSAUR",
      pieces: options.attackers,
    },
  );
  const chosen = applyOkV7(fixture.state, fixture.state.humanPlayerId, {
    ...fixture.command,
    reward: "TREASURY",
  }).state;
  let next = endTurnUntilV7(chosen, seatIdV7(chosen, 1)).state;
  if (options.attackerTechs !== undefined)
    next = checkedV7({
      ...next,
      players: next.players.map((player) =>
        player.seat === 1
          ? { ...player, researchedTechs: options.attackerTechs ?? [] }
          : player,
      ),
    });
  return options.fieldDefense === true ? fieldDefenseV7(next, at(8, 8)) : next;
}
