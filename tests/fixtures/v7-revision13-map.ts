import {
  createInitialMapStateWithVillageCountV7,
  createPlayableGameFromMapStateV7,
  type CreateInitialMapStateResultV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";

/**
 * Revision-13 neutral village counts (before revision 14's VL change). With
 * them the revision-14 generator reproduces revision-13 maps byte for byte,
 * so rule tests written against a revision-13 board keep that board.
 */
export function revision13VillageCountV7(setup: MatchSetupV7): number {
  const table =
    setup.width === 25
      ? { 1: 20, 2: 19, 3: 18 }
      : setup.width === 20
        ? { 1: 13, 2: 12, 3: 11 }
        : { 1: 3, 2: 4, 3: 6 };
  return table[setup.aiCount];
}

/**
 * `createInitialMapStateV7` on the revision-13 board of `setup` (same result
 * shape), for fixtures that place units on a known revision-13 layout.
 */
export function createRevision13MapStateV7(
  setup: MatchSetupV7,
): CreateInitialMapStateResultV7 {
  return createInitialMapStateWithVillageCountV7(
    setup,
    revision13VillageCountV7(setup),
  );
}

/** The initial map state of `setup` on its revision-13 board. */
export function revision13MapStateV7(setup: MatchSetupV7): GameStateV7 {
  const created = createRevision13MapStateV7(setup);
  if (!created.ok)
    throw new Error(`revision-13 map failed: ${created.error.code}`);
  return created.state;
}

/** The playable first turn of `setup` on its revision-13 board. */
export function revision13PlayableGameV7(setup: MatchSetupV7): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
} {
  const created = createPlayableGameFromMapStateV7(
    createInitialMapStateWithVillageCountV7(
      setup,
      revision13VillageCountV7(setup),
    ),
  );
  if (!created.ok)
    throw new Error(`revision-13 game failed: ${created.error.code}`);
  return { state: created.state, events: created.events };
}
