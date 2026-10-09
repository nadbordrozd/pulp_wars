import { describe, expect, it } from "vitest";
import {
  allOwnedUnitsV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  dwarfFieldV7,
  moundAtTileV7,
  refusalV7,
  withBurrowedV7,
} from "../fixtures/v7-dwarf";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { playV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

// The Dwarf revision (`pulp_wars-78i.3`): a mound is off the board, so no
// ability of another faction finds it (docs/product/RULESET_7_DWARVES.md
// sections 5.3 and 13).

const enemyTurn = (state: GameStateV7): GameStateV7 =>
  checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
  });

/** A burrowed Mole on (5, 3) and the opponent's pieces, on its turn. */
function moundAgainst(
  faction: FactionIdV7,
  pieces: readonly IcePieceV7[],
): { readonly state: GameStateV7; readonly moleId: number } {
  const state = enemyTurn(
    withBurrowedV7(
      dwarfFieldV7(
        [
          { seat: 0, role: "GUARD", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(9, 1) },
          ...pieces,
        ],
        { factions: ["DWARF", faction] },
      ),
      [{ at: at(5, 3) }],
    ),
  );
  return { state, moleId: moundAtTileV7(state, at(5, 3)).unit.id };
}

const unitIdsIn = (events: readonly DomainEventV7[]): string =>
  JSON.stringify(events);

describe("abilities never find a mound (sections 5.3 and 13)", () => {
  it("refuses a targeted ability on a burrowed unit", () => {
    const martian = moundAgainst("MARTIAN", [
      { seat: 1, role: "CAPTAIN", at: at(5, 4) },
      { seat: 1, role: "KNIGHT", at: at(4, 4) },
    ]);
    for (const [kind, from] of [
      ["MIND_CONTROL", at(5, 4)],
      ["TRACTOR_BEAM", at(4, 4)],
    ] as const)
      expect(
        refusalV7(martian.state, {
          kind,
          unitId: unitAtV7(martian.state, from).id,
          targetUnitId: martian.moleId as never,
        }).code,
        kind,
      ).toBe("TARGET_NOT_FOUND");
    const ice = moundAgainst("ICE_FOLK", [
      { seat: 1, role: "RAIDER", at: at(5, 5) },
    ]);
    expect(
      refusalV7(ice.state, {
        kind: "THROW_BOLAS",
        unitId: unitAtV7(ice.state, at(5, 5)).id,
        targetUnitId: ice.moleId as never,
      }).code,
    ).toBe("TARGET_NOT_FOUND");
  });

  it("leaves a mound out of Wail, Cold Snap, and Kaboom", () => {
    const undead = moundAgainst("UNDEAD", [
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "MARKSMAN", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const wail = playV7(undead.state, {
      kind: "WAIL",
      unitId: unitAtV7(undead.state, at(5, 4)).id,
    });
    expect(unitIdsIn(wail.events)).not.toContain(`"unitId":${undead.moleId},`);
    const ice = moundAgainst("ICE_FOLK", [
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "CAPTAIN", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const snap = playV7(ice.state, {
      kind: "COLD_SNAP",
      unitId: unitAtV7(ice.state, at(5, 4)).id,
    });
    expect(snap.state.frozen.map((entry) => entry.unitId)).not.toContain(
      ice.moleId,
    );
    const goblin = moundAgainst("GOBLIN", [
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const kaboom = playV7(goblin.state, {
      kind: "KABOOM",
      unitId: unitAtV7(goblin.state, at(5, 4)).id,
    });
    expect(
      allOwnedUnitsV7(kaboom.state).find((unit) => unit.id === goblin.moleId)
        ?.hp,
    ).toBe(16);
  });
});
