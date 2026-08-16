import { deepFreeze } from "../model/freeze";
import type { PlayerId } from "../model/ids";
import type {
  GameState,
  PlayerTileView,
  PlayerCityView,
  PlayerUnitView,
  PlayerView,
  PublicPlayerState,
} from "../model/types";
import { isAlliedTerritory, isExplored } from "./exploration";
import {
  cityAssignedCountedUnitCount,
  cityAssignedExemptUnitCount,
} from "../rules/economy";

export function viewFor(state: GameState, viewerId: PlayerId): PlayerView {
  const viewer = state.players.find((player) => player.id === viewerId);
  if (viewer === undefined) {
    throw new RangeError(`Unknown viewer: ${viewerId}`);
  }
  const tiles: PlayerTileView[] = state.board.tiles.map((tile) => {
    if (!isExplored(viewer.explored, tile.at)) {
      if (isAlliedTerritory(state, viewerId, tile.at)) {
        return {
          at: tile.at,
          explored: false,
          diplomaticBlock: "ALLIED_TERRITORY",
        };
      }
      return { at: tile.at, explored: false };
    }
    const territoryKnown =
      tile.territoryCenter === null ||
      isExplored(viewer.explored, tile.territoryCenter);
    const visible: PlayerTileView = {
      explored: true,
      ...tile,
      territoryCenter: territoryKnown ? tile.territoryCenter : null,
      territoryCityId: territoryKnown ? tile.territoryCityId : null,
    };
    return isAlliedTerritory(state, viewerId, tile.at)
      ? { ...visible, diplomaticBlock: "ALLIED_TERRITORY" }
      : visible;
  });
  const players: PublicPlayerState[] = state.players.map((player) => ({
    id: player.id,
    seat: player.seat,
    controller: player.controller,
    color: player.color,
    faction: player.faction,
    status: player.status,
    stars: player.stars,
    researchedTechs: player.researchedTechs,
  }));
  const cities: PlayerCityView[] = state.cities
    .filter((city) => isExplored(viewer.explored, city.at))
    .map((city) =>
      city.ownerId === viewerId
        ? {
            ...city,
            assignedCounted: cityAssignedCountedUnitCount(state, city.id),
            assignedExempt: cityAssignedExemptUnitCount(state, city.id),
          }
        : city,
    );
  const units: PlayerUnitView[] = state.units
    .filter((unit) => isExplored(viewer.explored, unit.at))
    .map((unit) => {
      if (unit.ownerId === viewerId) return unit;
      const { capacityExempt: _privateCapacityExempt, ...publicUnit } = unit;
      void _privateCapacityExempt;
      return publicUnit;
    });
  return deepFreeze({
    schemaVersion: state.schemaVersion,
    rulesetId: state.rulesetId,
    commandIndex: state.commandIndex,
    setup: state.setup,
    humanPlayerId: state.humanPlayerId,
    round: state.round,
    activeSeatIndex: state.activeSeatIndex,
    turnOrder: state.turnOrder,
    viewer,
    players,
    board: { width: state.board.width, height: state.board.height, tiles },
    cities,
    units,
    pendingChoice:
      state.pendingChoice !== null &&
      state.cities.some(
        (city) =>
          city.id === state.pendingChoice?.cityId && city.ownerId === viewerId,
      )
        ? state.pendingChoice
        : null,
    outcome: state.outcome,
  });
}
