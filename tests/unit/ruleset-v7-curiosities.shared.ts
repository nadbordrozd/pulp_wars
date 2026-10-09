// Helpers shared by ruleset-v7-curiosities.test.ts and its
// whole-game simulations in ruleset-v7-curiosities.sim.test.ts
// (`pulp_wars-bwry`).

import { canonicalHash, type GameStateV7 } from "../../src/engine/index";
import { curiosityGeneratedSetupV7 } from "../fixtures/v7-curiosity-generation";

export const generatedSetup = curiosityGeneratedSetupV7;

/** The 7r34 initial state, apart from the identity and the new keys. */
export function normalizedInitialState(state: GameStateV7): string {
  // The Monster (`pulp_wars-737.3`) adds the `monsters` list, empty here.
  // The Martian balance round (`pulp_wars-1wy.3`) adds the per-turn lists
  // `beamedThisTurn` and `tractorUsedThisTurn`, empty in every initial
  // state.
  const {
    curiosities: _curiosities,
    monsters: _monsters,
    beamedThisTurn: _beamed,
    tractorUsedThisTurn: _tractor,
    // The Candy revision (`pulp_wars-jdb.3`) adds four lists, empty in
    // every initial state.
    sugarRush: _rush,
    crumbs: _crumbs,
    splattedThisTurn: _splatted,
    tossedThisTurn: _tossed,
    // The Candy redesign (`pulp_wars-jdb.12`, 7r68) adds three more lists,
    // empty in every initial state (was hashed with them in, so the pin
    // failed).
    stuck: _stuck,
    toothache: _toothache,
    glazedThisTurn: _glazed,
    // The Dinosaur pass, correction (`pulp_wars-w49.15`) adds the
    // `huntedThisTurn` list, empty in every initial state.
    huntedThisTurn: _hunted,
    // Goblin explosions and Berserk (`pulp_wars-w49.35`) adds the
    // `berserkThisTurn` list, empty in every initial state.
    berserkThisTurn: _berserk,
    // The frozen sea (`pulp_wars-5ti.3`) adds the `ice` list, empty in every
    // generated initial state.
    ice: _ice,
    // The ninth unit (`pulp_wars-w49.17`, 7r55) adds the `ninthUnit`
    // record, empty in every initial state.
    ninthUnit: _ninthUnit,
    // Dwarf crowd control (`pulp_wars-w49.33`) adds the `barricades` list,
    // empty in every initial state.
    barricades: _barricades,
    // The giants' signatures (`pulp_wars-w49.30`) add the `giants` record,
    // empty in every initial state.
    giants: _giants,
    // Score and modes (`pulp_wars-kaw6.2`) adds the `scoreLedger` (the
    // initial ledger in an initial state, checked by the callers).
    scoreLedger: _scoreLedger,
    // Ice Folk Freeze (`pulp_wars-w49.37`) renamed the `chilled` list
    // `frozen`; the pins hash it under the name they were taken with.
    frozen,
    rulesetId: _rulesetId,
    setup,
    ...rest
  } = state;
  void _scoreLedger;
  if (
    _ninthUnit.wightGraves.length +
      _ninthUnit.risenWights.length +
      _ninthUnit.crackedThisTurn.length !==
    0
  )
    throw new Error("a ninth-unit fact in an initial state");
  if (_barricades.length !== 0)
    throw new Error("a Barricade in an initial state");
  if (
    _rush.length +
      _crumbs.length +
      _splatted.length +
      _tossed.length +
      _stuck.length +
      _toothache.length +
      _glazed.length !==
    0
  )
    throw new Error("a Candy fact in an initial state");
  if (_hunted.length !== 0)
    throw new Error("a hunted unit in an initial state");
  if (_berserk.length !== 0)
    throw new Error("a Berserk unit in an initial state");
  if (_giants.swallowed.length !== 0)
    throw new Error("a held victim in an initial state");
  if (_monsters.length !== 0) throw new Error("a Monster with the option off");
  if (_ice.length !== 0) throw new Error("ice in an initial state");
  if (_beamed.length !== 0 || _tractor.length !== 0)
    throw new Error("a per-turn Martian fact in an initial state");
  const {
    curiosities: _option,
    rulesetId: _setupRulesetId,
    ...setupRest
  } = setup;
  void _curiosities;
  void _rulesetId;
  void _option;
  void _setupRulesetId;
  // The early economy tweak (`pulp_wars-if6`, 7r41) starts every seat with 3
  // Coins; the pins were taken with 5, so each player gets the 2 back.
  // The village density (`pulp_wars-ykw.2`, 7r40) renamed the map revision a
  // setup names; the pins hash the name they were taken with.
  return canonicalHash({
    ...rest,
    chilled: frozen,
    players: rest.players.map((player) => ({
      ...player,
      coins: player.coins + 2,
    })),
    setup: { ...setupRest, mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2" },
  });
}
