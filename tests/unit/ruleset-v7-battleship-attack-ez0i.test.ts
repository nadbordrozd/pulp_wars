import { describe, expect, it } from "vitest";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  FACTION_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  viewForV7,
  type CombatPreviewV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
  type NavalArenaUnitV7,
} from "../fixtures/v7-naval-branch";

// `pulp_wars-ez0i` (`pulp-wars-poc-7r121`; the user, 2026-11-03: "The
// battleship-type units are overpowered. reduce attack by 1"): every
// faction's Battleship-role ship has Attack 4 (5 before, 6 before
// `pulp_wars-5ti.13`). Patrol Boats, transports and Submarines are
// unchanged, and so is the neutral Sea Serpent (a `BATTLESHIP`-role beast
// with its own numbers). Hand-built states on the naval arena of
// `pulp_wars-5ti.2` (rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water).

describe("the identity", () => {
  // Dwarf oomph (`pulp_wars-o2g8`) took 7r122 after it.
  it("was 7r121 after 7r120, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r138");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r138.current");
    const at = PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r121");
    expect(at).toBeGreaterThan(0);
    expect(PRIOR_RULESET_7_IDS[at - 1]).toBe("pulp-wars-poc-7r120");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(at - 1, at + 1)).toEqual([
      "pulpWars.save.v7r120.current",
      "pulpWars.save.v7r121.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("the Battleship's Attack", () => {
  it("is 4 in every faction's registration; Patrol Boats and Submarines keep theirs", () => {
    for (const faction of FACTION_IDS_V7) {
      const id = faction as FactionIdV7;
      expect(effectiveRoleRuleV7("BATTLESHIP", id).attack2, faction).toBe(8);
      expect(effectiveRoleRuleV7("BATTLESHIP", id).defense2, faction).toBe(6);
      expect(effectiveRoleRuleV7("PATROL_BOAT", id).attack2, faction).toBe(4);
      expect(effectiveRoleRuleV7("SUBMARINE", id).attack2, faction).toBe(8);
    }
  });

  const fight = (
    units: readonly NavalArenaUnitV7[],
    attackerAt: CoordV7,
    targetAt: CoordV7,
    patch?: (state: GameStateV7) => GameStateV7,
  ): CombatPreviewV7 => {
    const built = navalArenaV7({ units });
    const state = patch === undefined ? built : patch(built);
    const attacker = navalUnitAtV7(state, attackerAt);
    const target = navalUnitAtV7(state, targetAt);
    const preview = queryCombatPreviewV7(
      viewForV7(state, seatV7(state, 0).id),
      attacker.id,
      target.id,
    );
    if (preview === null) throw new Error("no preview");
    const result = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: target.id,
    });
    const event = result.events.find(
      (entry) => entry.kind === "COMBAT_RESOLVED",
    );
    if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(preview).toEqual(event.preview);
    return event.preview;
  };

  // The worked examples of current rules section 14.3 (full HP, open water).
  it("still sinks a Patrol Boat from three tiles (12 by the formula, 16 before)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 5, y: 4 },
      ),
    ).toMatchObject({
      attack2: 8,
      damageToDefender: 10,
      defenderDies: true,
      damageToAttacker: 0,
    });
  });

  it("still sinks an adjacent full-HP Submarine (all 12 of its HP)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } },
          { seat: 1, role: "SUBMARINE", at: { x: 3, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 3, y: 4 },
      ),
    ).toMatchObject({
      damageToDefender: 12,
      defenderDies: true,
      damageToAttacker: 0,
    });
  });

  it("deals 10 to a Battleship and takes 6 (14 and 5 before)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 4, y: 4 },
      ),
    ).toMatchObject({
      attack2: 8,
      defense2: 6,
      damageToDefender: 10,
      damageToAttacker: 6,
      retaliation: true,
    });
  });

  it("at 5 HP deals 5 to an adjacent Submarine and sinks in its own attack (8 dealt before)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } },
          { seat: 1, role: "SUBMARINE", at: { x: 3, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 3, y: 4 },
        (state) =>
          patchNavalUnitV7(state, navalUnitAtV7(state, { x: 2, y: 4 }).id, {
            hp: 5,
          }),
      ),
    ).toMatchObject({
      damageToDefender: 5,
      damageToAttacker: 5,
      attackerDies: true,
    });
  });

  it("answers a Patrol Boat's plain attack with 8, as before (its Defense is unchanged)", () => {
    expect(
      fight(
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 4 } },
        ],
        { x: 2, y: 4 },
        { x: 3, y: 4 },
      ),
    ).toMatchObject({
      ram: false,
      damageToDefender: 4,
      damageToAttacker: 8,
    });
  });
});
