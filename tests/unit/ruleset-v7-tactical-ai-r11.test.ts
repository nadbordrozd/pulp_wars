import { describe, expect, it } from "vitest";
import {
  NormalPolicyWorkV7,
  chooseNormalCommandV7,
  inspectNormalTacticalFactsV7,
  publicProjectedDamageForPolicyV7,
  publicThreatenedTilesForPolicyV7,
} from "../../src/ai/v7";
import {
  canonicalJson,
  canonicalHash,
  applyCommandV7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  resolveCityGrowthV7,
  roadPopulationForCityV7,
  unitId,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";
import { withPortV7 } from "../fixtures/v7-naval-builders";
import { withRevision12DecisionOrdinalsV7 } from "../fixtures/v7-revision12-command-ordinals";

describe("Ruleset 7 revision-11 bounded tactical AI", () => {
  it.each([1, -1] as const)(
    "distinguishes actual legal threat from proximity under transform %s",
    (direction) => {
      const state = cityThreatState(direction, false);
      const view = viewForV7(state, state.humanPlayerId);
      const city = ownCity(state);
      const hostile = hostileUnits(state);
      const catapult = hostile.find((unit) => unit.role === "CATAPULT");
      const marksman = hostile.find((unit) => unit.role === "MARKSMAN");
      expect(catapult).toBeDefined();
      expect(marksman).toBeDefined();
      expect(
        publicThreatenedTilesForPolicyV7(view, required(catapult)).some((at) =>
          same(at, city.at),
        ),
      ).toBe(false);
      expect(
        publicThreatenedTilesForPolicyV7(view, required(marksman)).some((at) =>
          same(at, city.at),
        ),
      ).toBe(true);
      expect(required(marksman).activation.handled).toBe(true);
      expect(inspectNormalTacticalFactsV7(view).threats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ cityId: city.id, unitId: marksman?.id }),
        ]),
      );
    },
  );

  it("preserves threat lookup results for noncanonical and unknown public tiles", () => {
    const state = cityThreatState(1, false);
    const view = viewForV7(state, state.humanPlayerId);
    const hostile = required(
      view.units.find(
        (unit) => unit.ownerId !== view.viewer.id && unit.role === "MARKSMAN",
      ),
    );
    const canonical = publicThreatenedTilesForPolicyV7(view, hostile);
    const reversed = {
      ...view,
      board: { ...view.board, tiles: view.board.tiles.slice().reverse() },
    };
    expect(publicThreatenedTilesForPolicyV7(reversed, hostile)).toEqual(
      canonical,
    );

    const unknownAt = required(
      view.board.tiles.find(
        (tile) =>
          tile.explored &&
          distance(tile.at, hostile.at) === 1 &&
          !view.units.some((unit) => same(unit.at, tile.at)),
      ),
    ).at;
    const unknown = {
      ...view,
      board: {
        ...view.board,
        tiles: view.board.tiles.map((tile) =>
          same(tile.at, unknownAt)
            ? { at: tile.at, explored: false as const }
            : tile,
        ),
      },
    };
    const reversedUnknown = {
      ...unknown,
      board: {
        ...unknown.board,
        tiles: unknown.board.tiles.slice().reverse(),
      },
    };
    expect(publicThreatenedTilesForPolicyV7(reversedUnknown, hostile)).toEqual(
      publicThreatenedTilesForPolicyV7(unknown, hostile),
    );

    const unrelated = required(
      view.units.find(
        (unit) => unit.ownerId !== view.viewer.id && unit.id !== hostile.id,
      ),
    );
    const absentUnrelatedTile = {
      ...view,
      units: view.units.map((unit) =>
        unit.id === unrelated.id ? { ...unit, at: { x: -1, y: -1 } } : unit,
      ),
    };
    const withoutUnrelated = {
      ...view,
      units: view.units.filter((unit) => unit.id !== unrelated.id),
    };
    expect(
      publicThreatenedTilesForPolicyV7(absentUnrelatedTile, hostile),
    ).toEqual(publicThreatenedTilesForPolicyV7(withoutUnrelated, hostile));

    const missing = {
      ...view,
      board: {
        ...view.board,
        tiles: view.board.tiles.filter((tile) => !same(tile.at, unknownAt)),
      },
    };
    expect(() => publicThreatenedTilesForPolicyV7(missing, hostile)).toThrow(
      `Public tile missing at ${coord(unknownAt)}`,
    );
  });

  it.each([
    ["EMBARKED", "GUARD"],
    ["NAVAL", "PATROL_BOAT"],
  ] as const)(
    "does not let a %s screen project land ZOC into a hostile next-turn route",
    (form, role) => {
      const { screened, nonProjecting, hostile, target } = zocThreatViews(
        form,
        role,
      );
      expect(
        publicThreatenedTilesForPolicyV7(screened, hostile).some((at) =>
          same(at, target),
        ),
      ).toBe(false);
      const transformedHostile = required(
        nonProjecting.units.find((unit) => unit.id === hostile.id),
      );
      expect(
        publicThreatenedTilesForPolicyV7(
          nonProjecting,
          transformedHostile,
        ).some((at) => same(at, target)),
      ).toBe(true);
    },
  );

  it.each([1, -1] as const)(
    "holds the sole effective defender and permits departure with a current legal replacement (%s)",
    (direction) => {
      const held = cityThreatState(direction, false);
      const heldView = viewForV7(held, held.humanPlayerId);
      const defender = ownUnits(held)[0];
      const heldDecision = chooseNormalCommandV7(heldView);
      expect(
        heldDecision.candidates.some(
          ({ command }) =>
            command.kind === "MOVE" && command.unitId === defender?.id,
        ),
      ).toBe(false);

      const replaced = cityThreatState(direction, true);
      const replacedView = viewForV7(replaced, replaced.humanPlayerId);
      const replacedDefender = ownUnits(replaced).find((unit) =>
        same(unit.at, ownCity(replaced).at),
      );
      const defenderMoves = queryPlayerCommandsV7(replacedView).filter(
        (command) =>
          command.kind === "MOVE" && command.unitId === replacedDefender?.id,
      );
      const replacementFacts = inspectNormalTacticalFactsV7(replacedView);
      expect(
        defenderMoves.some((command) =>
          replacementFacts.defenderReplacementActionKeys.includes(
            JSON.stringify(command),
          ),
        ),
      ).toBe(true);
      const selected = chooseNormalCommandV7(replacedView).command;
      expect(selected).toMatchObject({
        kind: "ATTACK",
        unitId: replacedDefender?.id,
      });
      expect(
        selected !== null &&
          replacementFacts.defenderReplacementActionKeys.includes(
            JSON.stringify(selected),
          ),
      ).toBe(true);
    },
  );

  it.each([1, -1] as const)(
    "does not let a favorable kill abandon its own city to a second immediate threat (%s)",
    (direction) => {
      const twoThreats = defenderKillState(direction, true);
      const defender = required(
        ownUnits(twoThreats).find((unit) =>
          same(unit.at, ownCity(twoThreats).at),
        ),
      );
      const view = viewForV7(twoThreats, twoThreats.humanPlayerId);
      const favorable = required(
        queryPlayerCommandsV7(view).find(
          (command) =>
            command.kind === "ATTACK" && command.unitId === defender.id,
        ),
      );
      expect(
        favorable.kind === "ATTACK"
          ? queryCombatPreviewV7(view, favorable.unitId, favorable.targetUnitId)
              ?.defenderDies
          : false,
      ).toBe(true);
      expect(inspectNormalTacticalFactsV7(view).threats).toHaveLength(2);
      expect(
        chooseNormalCommandV7(view).candidates.some(
          ({ command }) => canonicalJson(command) === canonicalJson(favorable),
        ),
      ).toBe(false);

      const oneThreat = defenderKillState(direction, false);
      const oneDefender = required(
        ownUnits(oneThreat).find((unit) =>
          same(unit.at, ownCity(oneThreat).at),
        ),
      );
      const oneView = viewForV7(oneThreat, oneThreat.humanPlayerId);
      const safeKill = required(
        queryPlayerCommandsV7(oneView).find(
          (command) =>
            command.kind === "ATTACK" && command.unitId === oneDefender.id,
        ),
      );
      expect(inspectNormalTacticalFactsV7(oneView).threats).toHaveLength(1);
      expect(
        chooseNormalCommandV7(oneView).candidates.some(
          ({ command }) => canonicalJson(command) === canonicalJson(safeKill),
        ),
      ).toBe(true);
    },
  );

  it.each([1, -1] as const)(
    "rejects full-health bad fortified trades and literal suicide, while retaining a favorable countervariant (%s)",
    (direction) => {
      const bad = combatState(direction, 12, 17, "FIGHTER", "GUARD", true);
      const badView = viewForV7(bad, bad.humanPlayerId);
      const attack = queryPlayerCommandsV7(badView).find(
        (command) => command.kind === "ATTACK",
      );
      expect(attack).toBeDefined();
      const badPreview =
        attack?.kind === "ATTACK"
          ? queryCombatPreviewV7(badView, attack.unitId, attack.targetUnitId)
          : null;
      expect(badPreview?.defenderDies).toBe(false);
      expect(
        chooseNormalCommandV7(badView).candidates.some(
          ({ command }) => canonicalJson(command) === canonicalJson(attack),
        ),
      ).toBe(false);

      const suicide = combatState(direction, 1, 17, "FIGHTER", "GUARD", true);
      const suicideView = viewForV7(suicide, suicide.humanPlayerId);
      const suicideAttack = queryPlayerCommandsV7(suicideView).find(
        (command) => command.kind === "ATTACK",
      );
      expect(
        suicideAttack?.kind === "ATTACK"
          ? queryCombatPreviewV7(
              suicideView,
              suicideAttack.unitId,
              suicideAttack.targetUnitId,
            )?.attackerDies
          : false,
      ).toBe(true);
      expect(
        chooseNormalCommandV7(suicideView).candidates.some(
          ({ command }) =>
            canonicalJson(command) === canonicalJson(suicideAttack),
        ),
      ).toBe(false);

      const favorable = combatState(
        direction,
        12,
        2,
        "FIGHTER",
        "FIGHTER",
        false,
      );
      const favorableView = viewForV7(favorable, favorable.humanPlayerId);
      const favorableAttack = queryPlayerCommandsV7(favorableView).find(
        (command) => command.kind === "ATTACK",
      );
      expect(
        chooseNormalCommandV7(favorableView).candidates.some(
          ({ command }) =>
            canonicalJson(command) === canonicalJson(favorableAttack),
        ),
      ).toBe(true);
    },
  );

  it.each(
    ([1, -1] as const).flatMap((direction) =>
      (["FIGHTER", "RAIDER"] as const).map(
        (role) => [role, direction] as const,
      ),
    ),
  )(
    "rejects a dying %s-chip attack on a healthy valuable target (%s)",
    (role, direction) => {
      // A full-HP Knight (13 HP since tuning 1, 7r46).
      const state = combatState(direction, 1, 13, role, "KNIGHT", false);
      const view = viewForV7(state, state.humanPlayerId);
      const attack = required(
        queryPlayerCommandsV7(view).find(
          (command) => command.kind === "ATTACK",
        ),
      );
      if (attack.kind !== "ATTACK") return;
      expect(
        queryCombatPreviewV7(view, attack.unitId, attack.targetUnitId),
      ).toMatchObject({
        attackerDies: true,
        defenderDies: false,
        damageToDefender: 1,
        damageToAttacker: 1,
      });
      expect(
        chooseNormalCommandV7(view).candidates.some(
          ({ command }) => canonicalJson(command) === canonicalJson(attack),
        ),
      ).toBe(false);
    },
  );

  it.each([1, -1] as const)(
    "selects a projected sacrifice only when it creates a lethal hostile-city follow-up (%s)",
    (direction) => {
      const decisive = captureLineState(direction, true);
      const view = viewForV7(decisive, decisive.humanPlayerId);
      const sacrificial = ownUnits(decisive).find((unit) => unit.hp === 1);
      const selected = chooseNormalCommandV7(view).command;
      expect(selected).toMatchObject({
        kind: "ATTACK",
        unitId: sacrificial?.id,
      });
      if (selected?.kind !== "ATTACK") return;
      const preview = queryCombatPreviewV7(
        view,
        selected.unitId,
        selected.targetUnitId,
      );
      expect(preview).toMatchObject({
        attackerDies: true,
        defenderDies: false,
      });
      const first = applyCommandV7(decisive, decisive.humanPlayerId, selected);
      expect(first.accepted).toBe(true);
      if (!first.accepted) return;
      const followUp = chooseNormalCommandV7(
        viewForV7(first.state, first.state.humanPlayerId),
      ).command;
      expect(followUp).toMatchObject({
        kind: "ATTACK",
        targetUnitId: selected.targetUnitId,
      });
      if (followUp?.kind !== "ATTACK") return;
      const second = applyCommandV7(
        first.state,
        first.state.humanPlayerId,
        followUp,
      );
      expect(second.accepted).toBe(true);
      if (!second.accepted) return;
      expect(
        second.state.units.some((unit) => unit.id === selected.targetUnitId),
      ).toBe(false);
      const targetCity = required(
        second.state.cities.find((city) =>
          same(
            city.at,
            required(
              second.state.units.find((unit) => unit.id === followUp.unitId),
            ).at,
          ),
        ),
      );
      expect(targetCity.ownerId).not.toBe(second.state.humanPlayerId);
      expect(
        queryPlayerCommandsV7(
          viewForV7(second.state, second.state.humanPlayerId),
        ).some((command) => command.kind === "CAPTURE"),
      ).toBe(false);
      const afterOwnEnd = applyCommandV7(
        second.state,
        second.state.humanPlayerId,
        {
          kind: "END_TURN",
        },
      );
      expect(afterOwnEnd.accepted).toBe(true);
      if (!afterOwnEnd.accepted) return;
      const enemy = activePlayer(afterOwnEnd.state);
      const afterEnemyEnd = applyCommandV7(afterOwnEnd.state, enemy, {
        kind: "END_TURN",
      });
      expect(afterEnemyEnd.accepted).toBe(true);
      if (!afterEnemyEnd.accepted) return;
      const capture = queryPlayerCommandsV7(
        viewForV7(afterEnemyEnd.state, afterEnemyEnd.state.humanPlayerId),
      ).find(
        (command) =>
          command.kind === "CAPTURE" && command.unitId === followUp.unitId,
      );
      expect(capture).toBeDefined();
      if (capture === undefined) return;
      expect(
        applyCommandV7(
          afterEnemyEnd.state,
          afterEnemyEnd.state.humanPlayerId,
          capture,
        ).accepted,
      ).toBe(true);

      const counter = captureLineState(direction, false);
      const counterSacrifice = ownUnits(counter).find((unit) => unit.hp === 1);
      expect(
        chooseNormalCommandV7(viewForV7(counter, counter.humanPlayerId))
          .command,
      ).not.toMatchObject({
        kind: "ATTACK",
        unitId: counterSacrifice?.id,
      });
    },
  );

  it.each([1, -1] as const)(
    "selects a projected sacrifice only when it prevents lethal damage to an owned-city defender (%s)",
    (direction) => {
      const decisive = citySaveState(direction, true);
      const view = viewForV7(decisive, decisive.humanPlayerId);
      const defender = ownUnits(decisive).find((unit) =>
        same(unit.at, ownCity(decisive).at),
      );
      const sacrificial = ownUnits(decisive).find((unit) => unit.hp === 1);
      const hostile = hostileUnits(decisive)[0];
      const attack = queryPlayerCommandsV7(view).find(
        (command) =>
          command.kind === "ATTACK" && command.unitId === sacrificial?.id,
      );
      expect(attack).toBeDefined();
      if (
        attack?.kind !== "ATTACK" ||
        defender === undefined ||
        hostile === undefined
      )
        return;
      const preview = queryCombatPreviewV7(
        view,
        attack.unitId,
        attack.targetUnitId,
      );
      expect(preview).toMatchObject({
        attackerDies: true,
        defenderDies: false,
      });
      if (preview === null) return;
      const before = publicProjectedDamageForPolicyV7(
        view,
        hostile,
        defender,
        defender.at,
        { maximumCharge: true },
      );
      const woundedHostile = {
        ...hostile,
        hp: hostile.hp - preview.damageToDefender,
      };
      const projected = {
        ...view,
        units: view.units.map((unit) =>
          unit.id === woundedHostile.id ? woundedHostile : unit,
        ),
      };
      const after = publicProjectedDamageForPolicyV7(
        projected,
        woundedHostile,
        defender,
        defender.at,
        { maximumCharge: true },
      );
      expect(before).toBeGreaterThanOrEqual(defender.hp);
      expect(after).toBeLessThan(defender.hp);
      expect(chooseNormalCommandV7(view).command).toEqual(attack);
      expect(
        applyCommandV7(decisive, decisive.humanPlayerId, attack).accepted,
      ).toBe(true);
      const intervention = applyCommandV7(
        decisive,
        decisive.humanPlayerId,
        attack,
      );
      if (!intervention.accepted) return;
      const intervenedEnd = applyCommandV7(
        intervention.state,
        intervention.state.humanPlayerId,
        { kind: "END_TURN" },
      );
      expect(intervenedEnd.accepted).toBe(true);
      if (!intervenedEnd.accepted) return;
      const enemyAttack = queryPlayerCommandsV7(
        viewForV7(intervenedEnd.state, activePlayer(intervenedEnd.state)),
      ).find(
        (command) =>
          command.kind === "ATTACK" && command.targetUnitId === defender.id,
      );
      expect(enemyAttack).toBeDefined();
      if (enemyAttack === undefined) return;
      const attacked = applyCommandV7(
        intervenedEnd.state,
        activePlayer(intervenedEnd.state),
        enemyAttack,
      );
      expect(attacked.accepted).toBe(true);
      if (!attacked.accepted) return;
      expect(attacked.state.units.some((unit) => unit.id === defender.id)).toBe(
        true,
      );

      const noInterventionEnd = applyCommandV7(
        decisive,
        decisive.humanPlayerId,
        { kind: "END_TURN" },
      );
      expect(noInterventionEnd.accepted).toBe(true);
      if (!noInterventionEnd.accepted) return;
      const noInterventionAttack = queryPlayerCommandsV7(
        viewForV7(
          noInterventionEnd.state,
          activePlayer(noInterventionEnd.state),
        ),
      ).find(
        (command) =>
          command.kind === "ATTACK" && command.targetUnitId === defender.id,
      );
      expect(noInterventionAttack).toBeDefined();
      if (noInterventionAttack === undefined) return;
      const cityLost = applyCommandV7(
        noInterventionEnd.state,
        activePlayer(noInterventionEnd.state),
        noInterventionAttack,
      );
      expect(cityLost.accepted).toBe(true);
      if (!cityLost.accepted) return;
      expect(cityLost.state.units.some((unit) => unit.id === defender.id)).toBe(
        false,
      );

      const counter = citySaveState(direction, false);
      const counterSacrifice = ownUnits(counter).find((unit) => unit.hp === 1);
      expect(
        chooseNormalCommandV7(viewForV7(counter, counter.humanPlayerId))
          .command,
      ).not.toMatchObject({
        kind: "ATTACK",
        unitId: counterSacrifice?.id,
      });
    },
  );

  it.each([1, -1] as const)(
    "selects multi-unit Rally over a weaker attack and keeps distinct public objectives (%s)",
    (direction) => {
      const state = rallyState(direction);
      const view = viewForV7(state, state.humanPlayerId);
      const decision = chooseNormalCommandV7(view);
      const rally = decision.candidates.find(
        ({ command }) => command.kind === "RALLY",
      );
      const attack = decision.candidates.find(
        ({ command }) => command.kind === "ATTACK",
      );
      expect(rally).toBeDefined();
      expect(attack).toBeDefined();
      expect(required(required(rally).tuple[0])).toBeGreaterThan(
        required(required(attack).tuple[0]),
      );
      expect(decision.command?.kind).toBe("RALLY");
      const facts = inspectNormalTacticalFactsV7(view);
      expect(facts.objectiveByUnitId.length).toBe(3);
      expect(
        new Set(facts.objectiveByUnitId.map((item) => coord(item.at))).size,
      ).toBeGreaterThan(1);
    },
  );

  it.each([1, -1] as const)(
    "selects recovery over a low-value wounded attack (%s)",
    (direction) => {
      const state = combatState(direction, 3, 17, "FIGHTER", "GUARD", true);
      const view = viewForV7(state, state.humanPlayerId);
      const decision = chooseNormalCommandV7(view);
      expect(
        decision.candidates.some(({ command }) => command.kind === "RECOVER"),
      ).toBe(true);
      expect(
        decision.candidates.some(({ command }) => command.kind === "ATTACK"),
      ).toBe(false);
    },
  );

  it.each([1, -1] as const)(
    "selects Captain Tend for multiple wounded units over a weaker attack (%s)",
    (direction) => {
      const decisive = tendState(direction, true);
      const actor = decisive.humanPlayerId;
      const selected = chooseNormalCommandV7(
        viewForV7(decisive, actor),
      ).command;
      expect(selected?.kind).toBe("TEND_WOUNDED");
      if (selected === null) return;
      const applied = applyCommandV7(decisive, actor, selected);
      expect(applied.accepted).toBe(true);
      if (!applied.accepted) return;
      const healed = ownUnits(applied.state).filter((unit) =>
        ownUnits(decisive).some(
          (before) => before.id === unit.id && unit.hp > before.hp,
        ),
      );
      expect(healed).toHaveLength(2);

      const counter = tendState(direction, false);
      expect(
        chooseNormalCommandV7(viewForV7(counter, counter.humanPlayerId)).command
          ?.kind,
      ).not.toBe("TEND_WOUNDED");
    },
  );

  it.each([1, -1] as const)(
    "stages a badly wounded unit for owned Windmill healing when it dominates (%s)",
    (direction) => {
      const decisive = windmillState(direction, true);
      const actor = decisive.humanPlayerId;
      const wounded = required(ownUnits(decisive)[0]);
      const selected = chooseNormalCommandV7(
        viewForV7(decisive, actor),
      ).command;
      expect(selected).toMatchObject({ kind: "MOVE", unitId: wounded.id });
      if (selected?.kind !== "MOVE") return;
      const destination = required(selected.path.at(-1));
      const windmill = decisive.board.tiles.find(
        (tile) => tile.improvement === "WINDMILL",
      );
      expect(windmill).toBeDefined();
      expect(distance(destination, required(windmill).at)).toBe(1);
      const applied = applyCommandV7(decisive, actor, selected);
      expect(applied.accepted).toBe(true);

      const counter = windmillState(direction, false);
      expect(
        chooseNormalCommandV7(viewForV7(counter, counter.humanPlayerId)).command
          ?.kind,
      ).toBe("RECOVER");
    },
  );

  it.each([1, -1] as const)(
    "moves a Catapult into legal range only with a current reachable screen (%s)",
    (direction) => {
      const screened = catapultScreenState(direction, true);
      const screenedView = viewForV7(screened, screened.humanPlayerId);
      const catapult = required(
        ownUnits(screened).find((unit) => unit.role === "CATAPULT"),
      );
      const guard = required(
        ownUnits(screened).find((unit) => unit.role === "GUARD"),
      );
      const target = required(hostileUnits(screened)[0]);
      // Tuning 6 (`pulp_wars-w49.6`): where a free village lies beside the
      // Guard, it steps onto it first (priority 1170 while the seat has
      // fewer than three cities); the Catapult's Move is the next command.
      const selected = required(
        chooseNormalCommandV7(screenedView).candidates.find(
          ({ command, score }) =>
            !(
              command.kind === "MOVE" &&
              command.unitId === guard.id &&
              score.priority === 1170
            ),
        ),
      ).command;
      expect(selected).toMatchObject({ kind: "MOVE", unitId: catapult.id });
      if (selected?.kind !== "MOVE") return;
      const destination = required(selected.path.at(-1));
      expect(distance(destination, target.at)).toBeGreaterThanOrEqual(2);
      expect(distance(destination, target.at)).toBeLessThanOrEqual(3);
      const guardCanScreen = queryPlayerCommandsV7(screenedView).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === guard.id &&
          distance(required(command.path.at(-1)), destination) === 1,
      );
      expect(guardCanScreen || distance(guard.at, destination) === 1).toBe(
        true,
      );
      expect(
        applyCommandV7(screened, screened.humanPlayerId, selected).accepted,
      ).toBe(true);

      for (const form of ["EMBARKED", "NAVAL"] as const) {
        const nonLandScreen = {
          ...screenedView,
          units: screenedView.units.map((unit) =>
            unit.id === guard.id ? { ...unit, form } : unit,
          ),
        };
        expect(
          chooseNormalCommandV7(nonLandScreen).candidates.filter(
            ({ command }) =>
              command.kind === "MOVE" &&
              command.unitId === catapult.id &&
              distance(required(command.path.at(-1)), target.at) <= 3,
          ),
        ).toEqual([]);
      }

      const blocked = catapultScreenState(direction, false);
      const blockedCatapult = required(
        ownUnits(blocked).find((unit) => unit.role === "CATAPULT"),
      );
      const blockedTarget = required(hostileUnits(blocked)[0]);
      expect(
        chooseNormalCommandV7(
          viewForV7(blocked, blocked.humanPlayerId),
        ).candidates.filter(
          ({ command }) =>
            command.kind === "MOVE" &&
            command.unitId === blockedCatapult.id &&
            distance(required(command.path.at(-1)), blockedTarget.at) <= 3,
        ),
      ).toEqual([]);
    },
  );

  it.each([1, -1] as const)(
    "uses a Raider flank into an empty hostile-city capture opening (%s)",
    (direction) => {
      const open = captureOpeningState(direction, true);
      const raider = required(
        ownUnits(open).find((unit) => unit.role === "RAIDER"),
      );
      const target = required(
        open.cities.find((city) => city.ownerId !== open.humanPlayerId),
      );
      const selected = chooseNormalCommandV7(
        viewForV7(open, open.humanPlayerId),
      ).command;
      expect(selected).toMatchObject({ kind: "MOVE", unitId: raider.id });
      if (selected?.kind !== "MOVE") return;
      expect(same(required(selected.path.at(-1)), target.at)).toBe(true);
      const applied = applyCommandV7(open, open.humanPlayerId, selected);
      expect(applied.accepted).toBe(true);
      if (!applied.accepted) return;
      expect(
        queryPlayerCommandsV7(
          viewForV7(applied.state, applied.state.humanPlayerId),
        ).some((command) => command.kind === "CAPTURE"),
      ).toBe(false);

      const occupied = captureOpeningState(direction, false);
      const occupiedTarget = required(
        occupied.cities.find((city) => city.ownerId !== occupied.humanPlayerId),
      );
      expect(
        queryPlayerCommandsV7(viewForV7(occupied, occupied.humanPlayerId)).some(
          (command) =>
            command.kind === "MOVE" &&
            same(required(command.path.at(-1)), occupiedTarget.at),
        ),
      ).toBe(false);
    },
  );

  it("prevents worsened Guard displacement", () => {
    const state = cityThreatState(1, false);
    const view = viewForV7(state, state.humanPlayerId);
    const city = ownCity(state);
    const decision = chooseNormalCommandV7(view);
    expect(
      decision.candidates.some(
        ({ command }) =>
          command.kind === "TRAIN" &&
          command.cityId === city.id &&
          command.role === "FIGHTER",
      ),
    ).toBe(false);
  });

  it.each([11_001, 9_100])(
    "chooses one accepted best shared city action from real land/naval/grant competition (%s)",
    (seed) => {
      const state = sharedCityActionState(seed);
      const actor = state.humanPlayerId;
      const city = ownCity(state);
      const view = viewForV7(state, actor);
      const offered = queryPlayerCommandsV7(view).filter(
        (command) =>
          "cityId" in command &&
          command.cityId === city.id &&
          ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
      );
      expect(new Set(offered.map((command) => command.kind))).toEqual(
        new Set(["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"]),
      );
      const candidates = chooseNormalCommandV7(view).candidates.filter(
        ({ command }) =>
          "cityId" in command &&
          command.cityId === city.id &&
          ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
      );
      expect(candidates).toHaveLength(1);
      const accepted = applyCommandV7(
        state,
        actor,
        required(candidates[0]).command,
      );
      expect(accepted.accepted).toBe(true);
      if (!accepted.accepted) return;
      expect(
        queryPlayerCommandsV7(viewForV7(accepted.state, actor)).filter(
          (command) =>
            "cityId" in command &&
            command.cityId === city.id &&
            ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
        ),
      ).toEqual([]);
    },
  );

  it("uses marginal fleet need for the shared city action", () => {
    const firstEscort = navalCompositionView(0, true);
    const firstCity = required(
      firstEscort.cities.find((city) => city.ownerId === firstEscort.viewer.id),
    );
    expect(
      chooseNormalCommandV7(firstEscort).candidates.find(
        ({ command }) =>
          "cityId" in command &&
          command.cityId === firstCity.id &&
          ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
      )?.command,
    ).toMatchObject({ kind: "TRAIN_NAVAL", role: "PATROL_BOAT" });

    const bombardment = navalCompositionView(2, true);
    const bombardmentCity = required(
      bombardment.cities.find((city) => city.ownerId === bombardment.viewer.id),
    );
    expect(
      chooseNormalCommandV7(bombardment).candidates.find(
        ({ command }) =>
          "cityId" in command &&
          command.cityId === bombardmentCity.id &&
          ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
      )?.command,
    ).toMatchObject({ kind: "TRAIN_NAVAL", role: "BATTLESHIP" });

    const sufficientEscorts = navalCompositionView(2, false);
    const sufficientCity = required(
      sufficientEscorts.cities.find(
        (city) => city.ownerId === sufficientEscorts.viewer.id,
      ),
    );
    const selected = chooseNormalCommandV7(sufficientEscorts).candidates.find(
      ({ command }) =>
        "cityId" in command &&
        command.cityId === sufficientCity.id &&
        ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
    )?.command;
    expect(selected).toBeDefined();
    expect(selected).not.toMatchObject({
      kind: "TRAIN_NAVAL",
      role: "PATROL_BOAT",
    });

    const threatenedCenter = navalCompositionView(0, true, true);
    const threatenedCity = required(
      threatenedCenter.cities.find(
        (city) => city.ownerId === threatenedCenter.viewer.id,
      ),
    );
    expect(
      chooseNormalCommandV7(threatenedCenter).candidates.find(
        ({ command }) =>
          "cityId" in command &&
          command.cityId === threatenedCity.id &&
          ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
      )?.command,
    ).toMatchObject({ kind: "TRAIN", role: "GUARD" });
  });

  it("retains the canonical dock tie-break when equal naval offers share a city", () => {
    const view = multiDockSharedCityView();
    const city = required(
      view.cities.find((candidate) => candidate.ownerId === view.viewer.id),
    );
    const offered = queryPlayerCommandsV7(view).filter(
      (
        command,
      ): command is Extract<
        ReturnType<typeof queryPlayerCommandsV7>[number],
        { kind: "TRAIN_NAVAL" }
      > => command.kind === "TRAIN_NAVAL" && command.cityId === city.id,
    );
    expect(new Set(offered.map((command) => coord(command.at))).size).toBe(2);
    const selected = chooseNormalCommandV7(view).candidates.find(
      ({ command }) =>
        command.kind === "TRAIN_NAVAL" && command.cityId === city.id,
    )?.command;
    expect(selected?.kind).toBe("TRAIN_NAVAL");
    if (selected?.kind !== "TRAIN_NAVAL") return;
    const sameRole = offered
      .filter((command) => command.role === selected.role)
      .sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
    expect(sameRole).toHaveLength(2);
    expect(selected.at).toEqual(sameRole[0]?.at);
  });

  it.each([810, 811])(
    "builds and completes one canonical at-most-eight-missing Road corridor while rejecting scattered Roads (%s)",
    (seed) => {
      const fixture = roadScenario(seed);
      const beforeView = viewForV7(
        fixture.beforeCapture,
        fixture.beforeCapture.humanPlayerId,
      );
      const beforeCommands = queryPlayerCommandsV7(beforeView);
      const beforeWork = new NormalPolicyWorkV7(structuredClone(beforeView));
      let beforeDecision = beforeWork.advanceWork(1);
      while (beforeDecision === null)
        beforeDecision = beforeWork.advanceWork(1);
      if (seed === 810) {
        // Revision 17 inserts KABOOM after WAIL, shifting the later command-kind
        // ordinals once more, and revision 19 inserts STAMPEDE and HATCH after
        // KABOOM and LAY_EGG after TRAIN_NAVAL, shifting them again. Revision
        // 20 removes STAMPEDE, moving every kind after KABOOM back by one
        // (was 704210…2a87). pulp_wars-9s0.1 (was bc6d10…4ffd): the command
        // is the same Capture and one candidate's score differs, Train
        // Guard at priority 1205 (was 1080): an enemy city is known and
        // fewer than two thirds of the unit slots are filled. The Martian
        // revision (`pulp_wars-t6s.2`) inserts BEAM_DOWN, MIND_CONTROL, and
        // TRACTOR_BEAM after HATCH, moving every later kind forward by
        // three (was ae8b91…e5c5); the revision-12-ordinal value below is
        // unchanged. pulp_wars-0hi.3 (was e42f37…e43d): the command is the
        // same Capture and the same one candidate's score differs, Train
        // Guard with strategic value 17 (was 15): the Guard's maximum HP
        // (revision 20 section 6.3). The Ice Folk revision
        // (`pulp_wars-7g3.3`) inserts THROW_BOLAS and COLD_SNAP after
        // TRACTOR_BEAM, moving every later kind forward by two (was
        // 45d48c…e816); the revision-12-ordinal value below is unchanged.
        // The Dwarf revision (`pulp_wars-78i.3`) inserts TUNNEL, BOMB_RUN,
        // and ASSEMBLE after COLD_SNAP, moving every later kind forward by
        // three (was 618190…e242); the revision-12-ordinal value below is
        // unchanged.
        expect(canonicalHash(beforeDecision)).toBe(
          // The Candy revision (`pulp_wars-jdb.3`) inserts SUGAR_RUSH,
          // REBAKE, and SUGAR_TOSS after ASSEMBLE, moving every later kind
          // forward by three (was 96afa0…4064); the revision-12-ordinal
          // value below is unchanged.
          // The naval branch (`pulp_wars-5ti.2`) inserts BOARD after ATTACK,
          // moving every later kind forward by one (was b34c5a…3ef8).
          // The frozen sea (`pulp_wars-5ti.3`) inserts FREEZE after
          // COLD_SNAP, moving every later kind forward by one (was
          // 32a2e1…15c0).
          // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL, moving every later command kind forward by one
          // (was b495e0…5c8e).
          // Tuning 5 (`pulp_wars-w49.4`): the Normal AI's army play scores
          // the candidates of a Human match (was 7f52e5…83ff).
          // Tuning 6 (`pulp_wars-w49.6`): the command is the same Capture
          // and one candidate's score differs, Train with the price term
          // of a class the army lacks in its strategic value (was
          // ced531…34f8).
          "641b21351bc4291259373c90c132734187c2489346608aeb4312d48eb6593060",
        );
        // Revision 13 shifts the command-kind ordinals in AI tie-break
        // tuples (spec section 8); this is the value with revision-12
        // ordinals (pulp_wars-9s0.1: was 294bac…41a7, for the same Train
        // priority; pulp_wars-0hi.3: was ee3a7f…1ed8, for the same Guard
        // HP).
        expect(
          canonicalHash(withRevision12DecisionOrdinalsV7(beforeDecision)),
        ).toBe(
          // Tuning 6: the same Train score (was a02a3a…52a0).
          "c32ecdf332f268b8d4b1d5144e3560dc2feb07b9882f88ef20fb64575bdfa279",
        );
      }
      expect(inspectNormalTacticalFactsV7(beforeView).roadCorridor).toBeNull();
      expect(beforeWork.diagnostic().plannedCandidateCount).toBe(
        beforeWork.diagnostic().actualCandidateCount -
          beforeCommands.filter((command) => command.kind === "BUILD_ROAD")
            .length -
          preservedRedevelopmentCount(beforeView, beforeCommands),
      );
      expect(
        beforeCommands.filter((command) => command.kind === "BUILD_ROAD")
          .length,
      ).toBeGreaterThan(1);
      expect(
        beforeDecision.candidates.some(
          ({ command }) => command.kind === "BUILD_ROAD",
        ),
      ).toBe(false);

      const capturedView = viewForV7(
        fixture.captured,
        fixture.captured.humanPlayerId,
      );
      const capturedCommands = queryPlayerCommandsV7(capturedView);
      const capturedWork = new NormalPolicyWorkV7(
        structuredClone(capturedView),
      );
      let capturedDecision = capturedWork.advanceWork(1);
      while (capturedDecision === null)
        capturedDecision = capturedWork.advanceWork(1);
      expect(inspectNormalTacticalFactsV7(capturedView).roadCorridor).not.toBe(
        null,
      );
      const capturedRoads = capturedCommands.filter(
        (command) => command.kind === "BUILD_ROAD",
      ).length;
      expect(capturedWork.diagnostic().plannedCandidateCount).toBe(
        capturedWork.diagnostic().actualCandidateCount -
          (capturedRoads - 1) -
          preservedRedevelopmentCount(capturedView, capturedCommands),
      );
      if (seed === 810) {
        // Revision 17 inserts KABOOM after WAIL, shifting the later command-kind
        // ordinals once more, and revision 19 inserts STAMPEDE and HATCH after
        // KABOOM and LAY_EGG after TRAIN_NAVAL, shifting them again. Revision
        // 20 removes STAMPEDE, moving every kind after KABOOM back by one
        // (was ece5c4…27cf). pulp_wars-9s0.1 (was 23912d…23bf): the command
        // is the same Build Monument and one candidate's score differs,
        // Train Guard at priority 1205 (was 1080), as before the capture.
        // The Martian revision (`pulp_wars-t6s.2`) inserts BEAM_DOWN,
        // MIND_CONTROL, and TRACTOR_BEAM after HATCH, moving every later
        // command-kind ordinal forward by three (was 548fac…c17a).
        // pulp_wars-0hi.3 (was caaa28…c38a): the same command, and the
        // same candidate's strategic value is 17 (was 15), the Guard's HP.
        // The Ice Folk revision (`pulp_wars-7g3.3`) inserts THROW_BOLAS and
        // COLD_SNAP after TRACTOR_BEAM, moving every later command-kind
        // ordinal forward by two (was 2d3708…8e6e). The Dwarf revision
        // (`pulp_wars-78i.3`) inserts TUNNEL, BOMB_RUN, and ASSEMBLE after
        // COLD_SNAP, moving every later command-kind ordinal forward by
        // three (was 6f8cb1…6174).
        expect(canonicalHash(capturedDecision)).toBe(
          // The Candy revision (`pulp_wars-jdb.3`) inserts SUGAR_RUSH,
          // REBAKE, and SUGAR_TOSS after ASSEMBLE, moving every later
          // command-kind ordinal forward by three (was 9651ad…0520).
          // The naval branch (`pulp_wars-5ti.2`) inserts BOARD after ATTACK,
          // moving every later kind forward by one (was 02ba06…c4a5).
          // The frozen sea (`pulp_wars-5ti.3`) inserts FREEZE after
          // COLD_SNAP, moving every later command-kind ordinal forward by
          // one (was d9e8ed…968a).
          // Tuning 1 (`pulp_wars-w49.3`, 7r46): the candidate scores read the new
          // numbers (was 7e8bcc…dce8).
          // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL, moving
          // every later command kind forward by one (was 813c7f…07f9).
          // Tuning 6 (`pulp_wars-w49.6`): the command is unchanged; the
          // candidates are scored by the assault, growth, and research rules
          // of a Human seat (was a58d37…99ed).
          // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
          // 35a604…8208).
          "a60ea156f7e7bbe201778c7f85c7ee7cb735338a5315a99f0c01c771385c58e2",
        );
        // With revision-12 ordinals (pulp_wars-9s0.1: was c56f00…73c1;
        // pulp_wars-0hi.3: was 091615…054b).
        expect(
          canonicalHash(withRevision12DecisionOrdinalsV7(capturedDecision)),
        ).toBe(
          // Tuning 6 (`pulp_wars-w49.6`): the command is unchanged; the
          // candidates are scored by the assault, growth, and research rules
          // of a Human seat (was 1c61f7…7d78).
          // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
          // 828b45…5195).
          "8f89df6b79674f6f91395488b6bdb8e63d0f2f7eea145301cbdb0d86dd8b2a1f",
        );
      }

      let state = fixture.captured;
      let priorMissing = 9;
      let roads = 0;
      for (; roads < 8; roads += 1) {
        const view = viewForV7(state, state.humanPlayerId);
        const facts = inspectNormalTacticalFactsV7(view);
        if (facts.roadCorridor === null) break;
        expect(facts.roadCorridor.populationBenefit).toBe(2);
        expect(facts.roadCorridor.commerceIncomeBenefit).toBe(
          Number(view.viewer.researchedTechs.includes("COMMERCE")),
        );
        expect(facts.roadCorridor.movementShortening).toBeGreaterThanOrEqual(0);
        expect(facts.roadCorridor.missingRoadKeys.length).toBeLessThan(
          priorMissing,
        );
        priorMissing = facts.roadCorridor.missingRoadKeys.length;
        const roadCandidates = chooseNormalCommandV7(view).candidates.filter(
          ({ command }) => command.kind === "BUILD_ROAD",
        );
        expect(roadCandidates).toHaveLength(1);
        expect(roadCandidates[0]?.command.kind).toBe("BUILD_ROAD");
        const applied = applyCommandV7(
          state,
          state.humanPlayerId,
          required(roadCandidates[0]).command,
        );
        expect(applied.accepted).toBe(true);
        if (!applied.accepted) return;
        state = applied.state;
        while (state.pendingChoices.length > 0) {
          const reward = queryPlayerCommandsV7(
            viewForV7(state, state.humanPlayerId),
          )[0];
          if (reward === undefined) throw new Error("Reward command missing");
          const resolved = applyCommandV7(state, state.humanPlayerId, reward);
          if (!resolved.accepted) throw new Error(resolved.error.code);
          state = resolved.state;
        }
      }
      expect(roads).toBeGreaterThan(0);
      expect(roads).toBeLessThanOrEqual(8);
      expect(
        roadPopulationForCityV7(state, fixture.originalCapital),
      ).toBeGreaterThan(0);
    },
  );

  it("has budget-one, cold/sliced/interleaved/equal-view ordered tuple parity and a finite ceiling", () => {
    const state = cityThreatState(1, true);
    const view = viewForV7(state, state.humanPlayerId);
    const cold = chooseNormalCommandV7(view);
    const left = new NormalPolicyWorkV7(structuredClone(view), () => 0);
    const right = new NormalPolicyWorkV7(structuredClone(view), () => 0);
    let first = left.advanceWork(1);
    let second = right.advanceWork(1);
    while (first === null || second === null) {
      if (first === null) first = left.advanceWork(1);
      if (second === null) second = right.advanceWork(3);
    }
    expect(canonicalJson(first)).toBe(canonicalJson(cold));
    expect(canonicalJson(second)).toBe(canonicalJson(cold));
    expect(left.diagnostic().workUnits).toBeLessThanOrEqual(
      left.diagnostic().bounds.declaredMaximumWorkUnits,
    );
    expect(left.diagnostic().bounds.maximumMissingRoads).toBe(8);
    const diagnostic = left.diagnostic();
    expect(diagnostic.pathWork.navalPathExpansions).toBeLessThanOrEqual(
      diagnostic.bounds.navalPathExpansionCeiling,
    );
    expect(diagnostic.pathWork.threatPathExpansions).toBeLessThanOrEqual(
      diagnostic.bounds.threatPathExpansionCeiling,
    );
    expect(diagnostic.pathWork.replacementPathValidations).toBeLessThanOrEqual(
      diagnostic.bounds.replacementPathValidationCeiling,
    );
    expect(diagnostic.pathWork.roadPathExpansions).toBeLessThanOrEqual(
      diagnostic.bounds.roadPathExpansionCeiling,
    );
    expect(diagnostic.redevelopmentPossibilityOperations).toBeLessThanOrEqual(
      diagnostic.bounds.redevelopmentPossibilityOperationCeiling,
    );
    expect(diagnostic.candidatePreparationOperations).toBeLessThanOrEqual(
      diagnostic.bounds.candidatePreparationOperationCeiling,
    );
    expect(diagnostic.sharedCityContextOperations).toBeLessThanOrEqual(
      diagnostic.bounds.sharedCityContextOperationCeiling,
    );
    expect(diagnostic.policyLookupPreparationOperations).toBeGreaterThan(0);
    expect(diagnostic.policyLookupPreparationOperations).toBeLessThanOrEqual(
      diagnostic.bounds.policyLookupPreparationOperationCeiling,
    );
    expect(diagnostic.workUnitsByPhase.POLICY_LOOKUP_CONTEXT ?? 0).toBe(
      diagnostic.policyLookupPreparationOperations,
    );
    expect(diagnostic.workUnitsByPhase.SHARED_CITY_CONTEXT ?? 0).toBe(
      diagnostic.sharedCityContextOperations,
    );
    expect(diagnostic.threatLookupPreparationOperations).toBeLessThanOrEqual(
      diagnostic.bounds.threatLookupPreparationOperationCeiling,
    );
    expect(diagnostic.workUnitsByPhase.THREAT_LOOKUP_CONTEXT ?? 0).toBe(
      diagnostic.threatLookupPreparationOperations,
    );
    expect(
      diagnostic.workUnitsByPhase.REDEVELOPMENT_CONTEXT ?? 0,
    ).toBeLessThanOrEqual(diagnostic.redevelopmentPossibilityOperations + 1);
    expect(
      (diagnostic.workUnitsByPhase.REDEVELOPMENT_CANDIDATES ?? 0) +
        (diagnostic.workUnitsByPhase.REDEVELOPMENT_RESULTS ?? 0) +
        (diagnostic.workUnitsByPhase.PLANNING_CANDIDATES ?? 0),
    ).toBe(diagnostic.candidatePreparationOperations);
  });
});

function preservedRedevelopmentCount(
  view: ReturnType<typeof viewForV7>,
  commands: readonly ReturnType<typeof queryPlayerCommandsV7>[number][],
): number {
  const preserved = new Set([
    "WINDMILL",
    "SAWMILL",
    "FORGE",
    "WORKSHOP",
    "MARKET",
    "MONUMENT",
    "PORT",
    "SHIPYARD",
  ]);
  return commands.filter((command) => {
    if (command.kind !== "REDEVELOP") return false;
    const tile = view.board.tiles.find((candidate) =>
      same(candidate.at, command.at),
    );
    return tile?.explored === true && preserved.has(tile.improvement ?? "");
  }).length;
}

function cityThreatState(direction: 1 | -1, replacement: boolean): GameStateV7 {
  const source = prepared(510 + direction + Number(replacement) * 10);
  const city = ownCity(source);
  const own = ownUnits(source)[0];
  const hostile = hostileUnits(source)[0];
  if (own === undefined || hostile === undefined)
    throw new Error("Threat fixture units missing");
  const actualDirection =
    city.at.x + direction * 2 >= 0 &&
    city.at.x + direction * 2 < source.board.width
      ? direction
      : (-direction as 1 | -1);
  const catapultAt = offset(city.at, actualDirection, 1);
  const marksmanAt = offset(city.at, actualDirection, 2);
  const replacementAt = offset(city.at, -actualDirection as 1 | -1, 1);
  const nextId = unitId(source.nextEntityId);
  const enemy = source.players.find((player) => player.id === hostile.ownerId);
  const ownPlayer = source.players.find(
    (player) => player.id === source.humanPlayerId,
  );
  if (enemy === undefined || ownPlayer === undefined)
    throw new Error("Threat fixture players missing");
  const ready = own.activation;
  const units: UnitStateV7[] = [
    roleUnit(own, "GUARD", city.at, 17, { ...ready }),
    roleUnit(
      hostile,
      replacement ? "FIGHTER" : "CATAPULT",
      catapultAt,
      replacement ? 1 : 10,
      {
        ...hostile.activation,
        handled: true,
      },
    ),
    {
      ...roleUnit(hostile, "MARKSMAN", marksmanAt, 12, {
        ...hostile.activation,
        handled: true,
      }),
      id: nextId,
    },
  ];
  if (replacement)
    units.push({
      ...roleUnit(own, "GUARD", replacementAt, 17, { ...ready }),
      id: unitId(source.nextEntityId + 1),
    });
  return checkedV7({
    ...source,
    nextEntityId: source.nextEntityId + 1 + Number(replacement),
    units,
    treasureChests: [
      ...source.treasureChests.filter(
        (chest) =>
          ![city.at, catapultAt, marksmanAt, replacementAt].some((at) =>
            same(at, chest),
          ),
      ),
    ],
    board: grassAt(source, [city.at, catapultAt, marksmanAt, replacementAt]),
  });
}

function zocThreatViews(
  form: "EMBARKED" | "NAVAL",
  role: "GUARD" | "PATROL_BOAT",
): {
  readonly screened: ReturnType<typeof viewForV7>;
  readonly nonProjecting: ReturnType<typeof viewForV7>;
  readonly hostile: ReturnType<typeof viewForV7>["units"][number];
  readonly target: CoordV7;
} {
  const source = prepared(form === "EMBARKED" ? 533 : 535);
  const own = required(ownUnits(source)[0]);
  const enemy = required(hostileUnits(source)[0]);
  const hostileAt = { x: 2, y: 5 };
  const projectorAt = { x: 3, y: 4 };
  const target = { x: 5, y: 5 };
  const state = checkedV7({
    ...source,
    units: [
      roleUnit(own, "GUARD", projectorAt, 17, own.activation),
      // A Knight: a Human Raider ignores zones of control (tuning 4).
      roleUnit(enemy, "KNIGHT", hostileAt, 13, enemy.activation),
    ],
    treasureChests: [],
    board: grassAt(source, [hostileAt, projectorAt, target]),
  });
  const base = viewForV7(state, state.humanPlayerId);
  const screened = {
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.explored
          ? {
              ...tile,
              biome:
                tile.at.y === 5 || same(tile.at, projectorAt)
                  ? ("PLAINS" as const)
                  : ("HIGHLANDS" as const),
              terrain:
                tile.at.y === 5 || same(tile.at, projectorAt)
                  ? ("GRASS" as const)
                  : ("MOUNTAIN" as const),
              resource: null,
            }
          : tile,
      ),
    },
  };
  const nonProjecting = {
    ...screened,
    board: {
      ...screened.board,
      tiles: screened.board.tiles.map((tile) =>
        tile.explored && same(tile.at, projectorAt)
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              improvement: "PORT" as const,
            }
          : tile,
      ),
    },
    units: screened.units.map((unit) =>
      unit.ownerId === screened.viewer.id ? { ...unit, form, role } : unit,
    ),
  };
  return {
    screened,
    nonProjecting,
    hostile: required(
      screened.units.find((unit) => unit.ownerId !== screened.viewer.id),
    ),
    target,
  };
}

function defenderKillState(
  direction: 1 | -1,
  secondThreat: boolean,
): GameStateV7 {
  const state = cityThreatState(direction, true);
  const city = ownCity(state);
  const center = required(
    ownUnits(state).find((unit) => same(unit.at, city.at)),
  );
  return checkedV7({
    ...state,
    units: state.units.filter(
      (unit) =>
        unit.id === center.id ||
        (unit.ownerId !== state.humanPlayerId &&
          (secondThreat || unit.role !== "MARKSMAN")),
    ),
  });
}

function combatState(
  direction: 1 | -1,
  ownHp: number,
  hostileHp: number,
  ownRole: UnitRoleIdV7,
  hostileRole: UnitRoleIdV7,
  fortified: boolean,
): GameStateV7 {
  const source = prepared(620 + direction + ownHp + hostileHp);
  const own = ownUnits(source)[0];
  const hostile = hostileUnits(source)[0];
  if (own === undefined || hostile === undefined)
    throw new Error("Combat fixture units missing");
  const ownAt = { x: 5, y: 5 };
  const hostileAt = { x: 5 + direction, y: 5 };
  const board = grassAt(source, [ownAt, hostileAt]);
  return checkedV7({
    ...source,
    units: [
      roleUnit(own, ownRole, ownAt, ownHp, own.activation),
      roleUnit(hostile, hostileRole, hostileAt, hostileHp, hostile.activation),
    ],
    treasureChests: source.treasureChests.filter(
      (chest) => ![ownAt, hostileAt].some((at) => same(at, chest)),
    ),
    board: {
      ...board,
      tiles: board.tiles.map((tile) =>
        same(tile.at, hostileAt) ? { ...tile, fieldDefense: fortified } : tile,
      ),
    },
  });
}

function rallyState(direction: 1 | -1): GameStateV7 {
  const source = prepared(700 + direction);
  const own = required(ownUnits(source)[0]);
  const hostile = required(hostileUnits(source)[0]);
  const center = { x: 5, y: 5 };
  const friendlyA = { x: 5 - direction, y: 5 };
  const friendlyB = { x: 5, y: 4 };
  const hostileAt = { x: 5 + direction, y: 5 };
  return checkedV7({
    ...source,
    nextEntityId: source.nextEntityId + 2,
    treasureChests: source.treasureChests.filter(
      (chest) =>
        ![center, friendlyA, friendlyB, hostileAt].some((at) =>
          same(at, chest),
        ),
    ),
    board: grassAt(source, [center, friendlyA, friendlyB, hostileAt]),
    units: [
      roleUnit(own, "CAPTAIN", center, 10, own.activation),
      {
        ...roleUnit(own, "FIGHTER", friendlyA, 12, own.activation),
        id: unitId(source.nextEntityId),
      },
      {
        ...roleUnit(own, "GUARD", friendlyB, 17, own.activation),
        id: unitId(source.nextEntityId + 1),
      },
      roleUnit(hostile, "FIGHTER", hostileAt, 2, hostile.activation),
    ].sort((left, right) => left.id - right.id),
  });
}

function captureLineState(
  direction: 1 | -1,
  withFollowUp: boolean,
): GameStateV7 {
  const source = prepared(760 + direction);
  const own = required(ownUnits(source)[0]);
  const hostile = required(hostileUnits(source)[0]);
  const targetCity = required(
    source.cities.find((city) => city.ownerId === hostile.ownerId),
  );
  const actualDirection =
    targetCity.at.x + direction >= 0 &&
    targetCity.at.x + direction < source.board.width
      ? direction
      : (-direction as 1 | -1);
  const sacrificialAt = offset(targetCity.at, actualDirection, 1);
  const followUpAt = {
    x: sacrificialAt.x,
    y:
      sacrificialAt.y + 1 < source.board.height
        ? sacrificialAt.y + 1
        : sacrificialAt.y - 1,
  };
  const reserveAt = required(
    source.board.tiles.find(
      (tile) =>
        tile.biome !== null &&
        tile.site === null &&
        distance(tile.at, targetCity.at) >= 4 &&
        ![sacrificialAt, followUpAt].some((at) => same(at, tile.at)),
    ),
  ).at;
  const cleared = grassAt(source, [
    targetCity.at,
    sacrificialAt,
    followUpAt,
    reserveAt,
  ]);
  return checkedV7({
    ...source,
    nextEntityId: source.nextEntityId + Number(withFollowUp) + 1,
    treasureChests: source.treasureChests.filter(
      (chest) =>
        ![targetCity.at, sacrificialAt, followUpAt, reserveAt].some((at) =>
          same(at, chest),
        ),
    ),
    board: cleared,
    units: [
      roleUnit(own, "FIGHTER", sacrificialAt, 1, own.activation),
      ...(withFollowUp
        ? [
            {
              ...roleUnit(own, "FIGHTER", followUpAt, 12, own.activation),
              id: unitId(source.nextEntityId),
            },
          ]
        : []),
      roleUnit(hostile, "FIGHTER", targetCity.at, 7, hostile.activation),
      {
        ...roleUnit(hostile, "GUARD", reserveAt, 17, {
          ...hostile.activation,
          handled: true,
        }),
        id: unitId(source.nextEntityId + Number(withFollowUp)),
      },
    ].sort((left, right) => left.id - right.id),
  });
}

function citySaveState(
  direction: 1 | -1,
  lethalWithoutIntervention: boolean,
): GameStateV7 {
  const source = prepared(785 + direction + Number(lethalWithoutIntervention));
  const own = required(ownUnits(source)[0]);
  const hostile = required(hostileUnits(source)[0]);
  const city = ownCity(source);
  const actualDirection =
    city.at.x + direction >= 1 && city.at.x + direction < source.board.width - 1
      ? direction
      : (-direction as 1 | -1);
  const hostileAt = offset(city.at, actualDirection, 1);
  const sacrificeAt = {
    x: city.at.x,
    y: city.at.y + 1 < source.board.height ? city.at.y + 1 : city.at.y - 1,
  };
  return checkedV7({
    ...source,
    nextEntityId: source.nextEntityId + 1,
    players: source.players.map((player) =>
      player.id === source.humanPlayerId
        ? {
            ...player,
            coins: 0,
            // Without Fieldcraft: its Forest march (tuning 4) would give
            // the wounded Knight a way out through the Forest next to it.
            researchedTechs: player.researchedTechs.filter(
              (tech) => tech !== "FIELDCRAFT",
            ),
          }
        : { ...player, explored: source.board.tiles.map((tile) => tile.at) },
    ),
    treasureChests: source.treasureChests.filter(
      (chest) =>
        ![city.at, hostileAt, sacrificeAt].some((at) => same(at, chest)),
    ),
    board: grassAt(source, [city.at, hostileAt, sacrificeAt]),
    units: [
      roleUnit(own, "GUARD", city.at, lethalWithoutIntervention ? 5 : 9, {
        ...own.activation,
        handled: true,
        specialActed: true,
      }),
      {
        ...roleUnit(own, "KNIGHT", sacrificeAt, 1, own.activation),
        id: unitId(source.nextEntityId),
      },
      roleUnit(hostile, "FIGHTER", hostileAt, 6, {
        ...hostile.activation,
        handled: true,
      }),
    ].sort((left, right) => left.id - right.id),
  });
}

function tendState(direction: 1 | -1, wounded: boolean): GameStateV7 {
  const source = prepared(795 + direction + Number(wounded));
  const own = required(ownUnits(source)[0]);
  const hostile = required(hostileUnits(source)[0]);
  const city = ownCity(source);
  const captainAt = {
    x: city.at.x,
    y:
      city.at.y + direction >= 0 && city.at.y + direction < source.board.height
        ? city.at.y + direction
        : city.at.y - direction,
  };
  const wingAt = {
    x: city.at.x + 1 < source.board.width ? city.at.x + 1 : city.at.x - 1,
    y: captainAt.y,
  };
  const hostileAt = {
    x: city.at.x - 1 >= 0 ? city.at.x - 1 : city.at.x + 1,
    y: captainAt.y,
  };
  return checkedV7({
    ...source,
    nextEntityId: source.nextEntityId + 2,
    treasureChests: [],
    board: grassAt(source, [city.at, captainAt, wingAt, hostileAt]),
    units: [
      roleUnit(own, "CAPTAIN", captainAt, 10, own.activation),
      {
        ...roleUnit(own, "GUARD", city.at, wounded ? 7 : 17, own.activation),
        id: unitId(source.nextEntityId),
      },
      {
        ...roleUnit(own, "FIGHTER", wingAt, wounded ? 4 : 12, own.activation),
        id: unitId(source.nextEntityId + 1),
      },
      roleUnit(hostile, "FIGHTER", hostileAt, 12, {
        ...hostile.activation,
        handled: true,
      }),
    ].sort((left, right) => left.id - right.id),
  });
}

function windmillState(
  direction: 1 | -1,
  windmillPresent: boolean,
): GameStateV7 {
  let fixture:
    | {
        source: GameStateV7;
        farmResult: GameStateV7;
        windmill: ReturnType<typeof queryPlayerCommandsV7>[number];
      }
    | undefined;
  for (
    let seed = 805 + direction;
    seed < 850 && fixture === undefined;
    seed += 2
  ) {
    const source = prepared(seed);
    const actor = source.humanPlayerId;
    for (const farm of queryPlayerCommandsV7(viewForV7(source, actor)).filter(
      (command) => command.kind === "BUILD_FARM",
    )) {
      const applied = applyCommandV7(source, actor, farm);
      if (!applied.accepted) continue;
      let advanced = applied.state;
      while (advanced.pendingChoices.length > 0) {
        const choice = queryPlayerCommandsV7(viewForV7(advanced, actor))[0];
        if (choice === undefined) break;
        const resolved = applyCommandV7(advanced, actor, choice);
        if (!resolved.accepted) break;
        advanced = resolved.state;
      }
      const windmill = queryPlayerCommandsV7(viewForV7(advanced, actor)).find(
        (command) => command.kind === "BUILD_WINDMILL",
      );
      if (windmill?.kind === "BUILD_WINDMILL") {
        fixture = { source, farmResult: advanced, windmill };
        break;
      }
    }
  }
  if (fixture === undefined) throw new Error("Legal Windmill fixture missing");
  const { source, farmResult, windmill } = fixture;
  if (windmill.kind !== "BUILD_WINDMILL")
    throw new Error("Windmill command changed");
  const actor = source.humanPlayerId;
  const built = applyCommandV7(farmResult, actor, windmill);
  if (!built.accepted) throw new Error(built.error.code);
  const base = windmillPresent ? built.state : farmResult;
  const windmillAt = windmill.at;
  const actorAt = required(
    base.board.tiles.find(
      (tile) =>
        distance(tile.at, windmillAt) === 2 &&
        tile.biome !== null &&
        tile.terrain === "GRASS" &&
        tile.site === null &&
        tile.improvement === null,
    ),
  ).at;
  const own = required(ownUnits(base)[0]);
  return checkedV7({
    ...base,
    players: base.players.map((player) =>
      player.id === base.humanPlayerId
        ? {
            ...player,
            coins: 0,
            achievementEntitlements: player.achievementEntitlements.map(
              (entitlement) => ({
                ...entitlement,
                spent: entitlement.unlocked || entitlement.spent,
              }),
            ),
          }
        : player,
    ),
    treasureChests: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.biome === null
          ? tile
          : {
              ...tile,
              terrain:
                tile.terrain === "MOUNTAIN" ? tile.terrain : ("GRASS" as const),
              // Revision 12: a Farm keeps its Fertile Ground underneath.
              resource: tile.improvement === null ? null : tile.resource,
              site: same(tile.at, actorAt) ? null : tile.site,
            },
      ),
    },
    units: [roleUnit(own, "FIGHTER", actorAt, 2, own.activation)],
  });
}

function catapultScreenState(
  direction: 1 | -1,
  reachableScreen: boolean,
): GameStateV7 {
  const source = quietEconomyState(prepared(825 + direction));
  const own = required(ownUnits(source)[0]);
  const hostile = required(hostileUnits(source)[0]);
  const targetCity = required(
    source.cities.find((city) => city.ownerId === hostile.ownerId),
  );
  const actualDirection =
    targetCity.at.x + direction * 4 >= 0 &&
    targetCity.at.x + direction * 4 < source.board.width
      ? direction
      : (-direction as 1 | -1);
  const catapultAt = offset(targetCity.at, actualDirection, 4);
  const guardAt = {
    x: catapultAt.x,
    y:
      catapultAt.y + 1 < source.board.height
        ? catapultAt.y + 1
        : catapultAt.y - 1,
  };
  return checkedV7({
    ...source,
    nextEntityId: source.nextEntityId + 1,
    board: grassAt(source, [targetCity.at, catapultAt, guardAt]),
    units: [
      roleUnit(own, "CATAPULT", catapultAt, 10, own.activation),
      ...(reachableScreen
        ? [
            {
              ...roleUnit(own, "GUARD", guardAt, 17, own.activation),
              id: unitId(source.nextEntityId),
            },
          ]
        : []),
      roleUnit(hostile, "GUARD", targetCity.at, 17, {
        ...hostile.activation,
        handled: true,
      }),
    ].sort((left, right) => left.id - right.id),
  });
}

function captureOpeningState(direction: 1 | -1, opening: boolean): GameStateV7 {
  const source = quietEconomyState(prepared(835 + direction));
  const own = required(ownUnits(source)[0]);
  const hostile = required(hostileUnits(source)[0]);
  const targetCity = required(
    source.cities.find((city) => city.ownerId === hostile.ownerId),
  );
  const actualDirection =
    targetCity.at.x + direction >= 0 &&
    targetCity.at.x + direction < source.board.width
      ? direction
      : (-direction as 1 | -1);
  const raiderAt = offset(targetCity.at, actualDirection, 1);
  const reserveAt = required(
    source.board.tiles.find(
      (tile) =>
        tile.biome !== null &&
        tile.site === null &&
        distance(tile.at, targetCity.at) >= 4 &&
        !same(tile.at, raiderAt),
    ),
  ).at;
  return checkedV7({
    ...source,
    nextEntityId: source.nextEntityId + 1,
    board: grassAt(source, [targetCity.at, raiderAt, reserveAt]),
    units: [
      roleUnit(own, "RAIDER", raiderAt, 12, own.activation),
      {
        ...roleUnit(hostile, "GUARD", reserveAt, 17, {
          ...hostile.activation,
          handled: true,
        }),
        id: unitId(source.nextEntityId),
      },
      ...(opening
        ? []
        : [
            roleUnit(hostile, "GUARD", targetCity.at, 17, {
              ...hostile.activation,
              handled: true,
            }),
          ]),
    ].sort((left, right) => left.id - right.id),
  });
}

function quietEconomyState(source: GameStateV7): GameStateV7 {
  return checkedV7({
    ...source,
    players: source.players.map((player) =>
      player.id === source.humanPlayerId
        ? {
            ...player,
            coins: 0,
            achievementEntitlements: player.achievementEntitlements.map(
              (entitlement) => ({
                ...entitlement,
                spent: entitlement.unlocked || entitlement.spent,
              }),
            ),
          }
        : player,
    ),
    treasureChests: [],
    board: {
      ...source.board,
      tiles: source.board.tiles.map((tile) =>
        tile.biome === null
          ? tile
          : {
              ...tile,
              terrain:
                tile.terrain === "MOUNTAIN" ? tile.terrain : ("GRASS" as const),
              resource: null,
            },
      ),
    },
  });
}

function sharedCityActionState(seed: number): GameStateV7 {
  const fixture = withPortV7(seed);
  const actor = fixture.state.humanPlayerId;
  const city = ownCity(fixture.state);
  const starter = required(
    fixture.state.units.find((unit) => unit.ownerId === actor),
  );
  const empty = required(
    fixture.state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !same(tile.at, city.at) &&
        !same(tile.at, fixture.portAt) &&
        !fixture.state.units.some((unit) => same(unit.at, tile.at)),
    ),
  );
  const preparedState = allTechsV7(richV7(fixture.state, 1_000));
  const growthTiles = preparedState.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !same(tile.at, fixture.portAt),
    )
    .slice(0, 3);
  if (growthTiles.length !== 3) throw new Error("Growth tiles missing");
  const economicPopulation = city.economicPopulation + 6;
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation,
    economicPopulation,
  ).city;
  return checkedV7({
    ...preparedState,
    nextEntityId: preparedState.nextEntityId + 3,
    cities: preparedState.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...grown,
            economicPopulation,
            rewards: [
              { reachedLevel: 2, reward: "SURVEY" as const },
              { reachedLevel: 3, reward: "MILITIA" as const },
            ],
          }
        : candidate,
    ),
    board: {
      ...preparedState.board,
      tiles: preparedState.board.tiles.map((tile) =>
        growthTiles.some((growth) => same(growth.at, tile.at))
          ? {
              ...tile,
              improvement: "FARM" as const,
              resource: "FERTILE_GROUND" as const,
            }
          : tile,
      ),
    },
    populationContributions: [
      ...preparedState.populationContributions,
      ...growthTiles.map((tile, index) => ({
        id: preparedState.nextEntityId + index,
        cityId: city.id,
        category: "LIVE" as const,
        amount: 2,
        source: {
          kind: "IMPROVEMENT" as const,
          improvement: "FARM" as const,
          at: tile.at,
        },
      })),
    ],
    units: preparedState.units.map((unit) =>
      unit.id === starter.id ? { ...unit, at: empty.at } : unit,
    ),
  });
}

function multiDockSharedCityView(): ReturnType<typeof viewForV7> {
  const view = structuredClone(navalCompositionView(0, true));
  const city = required(
    view.cities.find((candidate) => candidate.ownerId === view.viewer.id),
  );
  const occupied = new Set(view.units.map((unit) => coord(unit.at)));
  const existing = new Set(view.naval.ownedPorts.map((port) => coord(port.at)));
  const second = required(
    view.board.tiles.find(
      (tile) =>
        tile.explored &&
        !occupied.has(coord(tile.at)) &&
        !existing.has(coord(tile.at)) &&
        !same(tile.at, city.at),
    ),
  );
  if (!second.explored) throw new Error("Explored second dock tile missing");
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        same(tile.at, second.at)
          ? {
              ...second,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: "PORT" as const,
              road: false,
              site: null,
              territoryCityId: city.id,
              territoryOwnerId: view.viewer.id,
            }
          : tile,
      ),
    },
    naval: {
      ...view.naval,
      ownedPorts: [
        ...view.naval.ownedPorts,
        { at: second.at, cityId: city.id, status: "ACTIVE" as const },
      ],
    },
  };
}

function navalCompositionView(
  escortCount: number,
  defended: boolean,
  threatenedCenter = false,
) {
  const state = sharedCityActionState(11_001);
  const city = ownCity(state);
  const base = viewForV7(state, state.humanPlayerId);
  const own = required(
    state.units.find((unit) => unit.ownerId === state.humanPlayerId),
  );
  const hostile = required(
    state.units.find((unit) => unit.ownerId !== state.humanPlayerId),
  );
  const hostileCity = required(
    state.cities.find((candidate) => candidate.ownerId !== state.humanPlayerId),
  );
  const occupied = new Set(state.units.map((unit) => coord(unit.at)));
  const portKeys = new Set(base.naval.ownedPorts.map((port) => coord(port.at)));
  const candidates = state.board.tiles.filter(
    (tile) =>
      tile.site === null &&
      tile.improvement === null &&
      !tile.road &&
      !occupied.has(coord(tile.at)) &&
      !portKeys.has(coord(tile.at)) &&
      !same(tile.at, city.at),
  );
  const centerThreatAt = threatenedCenter
    ? candidates.find((tile) => distance(tile.at, city.at) === 1)?.at
    : undefined;
  if (threatenedCenter && centerThreatAt === undefined)
    throw new Error("Threatening water missing");
  const water = [
    ...(centerThreatAt === undefined ? [] : [centerThreatAt]),
    ...candidates
      .filter(
        (tile) =>
          centerThreatAt === undefined || !same(tile.at, centerThreatAt),
      )
      .map((tile) => tile.at),
  ].slice(0, escortCount + 1);
  if (water.length < escortCount + 1)
    throw new Error("Naval composition water missing");
  const makeNaval = (
    index: number,
    ownerId: typeof own.ownerId,
    role: "PATROL_BOAT" | "BATTLESHIP",
  ) => ({
    ...own,
    id: unitId(9_000 + index),
    ownerId,
    homeCityId: null,
    role,
    form: "NAVAL" as const,
    at: required(water[index]),
    hp: effectiveRoleRuleV7(role, "ORIGINAL").maxHp,
    maxHp: effectiveRoleRuleV7(role, "ORIGINAL").maxHp,
    captureEligible: false,
  });
  const defender = {
    ...hostile,
    role: "FIGHTER" as const,
    form: "LAND" as const,
    at: hostileCity.at,
    hp: 12,
    maxHp: 12,
  };
  const waterKeys = new Set(water.map(coord));
  const navalState = checkedV7({
    ...state,
    nextEntityId: Math.max(state.nextEntityId, 9_100),
    setup: { ...state.setup, mapType: "CONTINENTS" as const },
    treasureChests: state.treasureChests.filter(
      (at) => !waterKeys.has(coord(at)),
    ),
    populationContributions: state.populationContributions.filter(
      (entry) =>
        entry.source.kind !== "IMPROVEMENT" ||
        !waterKeys.has(coord(entry.source.at)),
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        waterKeys.has(coord(tile.at))
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
              site: null,
              territoryCityId: null,
            }
          : tile,
      ),
    },
    units: [
      ...state.units.filter((unit) => unit.id !== hostile.id),
      ...(defended ? [defender] : []),
      makeNaval(0, hostile.ownerId, "BATTLESHIP"),
      ...Array.from({ length: escortCount }, (_, index) =>
        makeNaval(index + 1, own.ownerId, "PATROL_BOAT"),
      ),
    ].sort((left, right) => left.id - right.id),
  });
  return viewForV7(navalState, navalState.humanPlayerId);
}

function roadScenario(seed: number): {
  beforeCapture: GameStateV7;
  captured: GameStateV7;
  originalCapital: GameStateV7["cities"][number];
} {
  const source = prepared(seed);
  const actor = source.humanPlayerId;
  const capital = ownCity(source);
  const unit = required(ownUnits(source)[0]);
  const village = required(
    source.board.tiles
      .filter(
        (tile) =>
          tile.site === "VILLAGE" &&
          tile.biome !== null &&
          distance(tile.at, capital.at) <= 8,
      )
      .sort(
        (left, right) =>
          distance(left.at, capital.at) - distance(right.at, capital.at),
      )[0],
  );
  const cleared: GameStateV7 = {
    ...source,
    board: {
      ...source.board,
      tiles: source.board.tiles.map((tile) =>
        tile.biome !== null
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
    treasureChests: source.treasureChests.filter(
      (chest) => !same(chest, village.at),
    ),
    units: source.units.map((candidate) =>
      candidate.id === unit.id
        ? {
            ...candidate,
            at: village.at,
            captureEligible: true,
            activation: {
              ...candidate.activation,
              moved: false,
              attacked: false,
              captured: false,
              handled: false,
            },
          }
        : candidate,
    ),
  };
  const beforeCapture = checkedV7(cleared);
  const capture = applyCommandV7(beforeCapture, actor, {
    kind: "CAPTURE",
    unitId: unit.id,
  });
  if (!capture.accepted) throw new Error(capture.error.code);
  return { beforeCapture, captured: capture.state, originalCapital: capital };
}

function prepared(seed: number): GameStateV7 {
  return exploredAllV7(allTechsV7(richV7(initialV7(seed))));
}

function grassAt(state: GameStateV7, positions: readonly CoordV7[]) {
  return {
    ...state.board,
    tiles: state.board.tiles.map((tile) =>
      positions.some((at) => same(at, tile.at))
        ? {
            ...tile,
            biome: "PLAINS" as const,
            terrain: "GRASS" as const,
            resource: null,
            improvement: null,
            road: false,
            fieldDefense: false,
            site: state.cities.some((city) => same(city.at, tile.at))
              ? tile.site
              : null,
          }
        : tile,
    ),
  };
}

function roleUnit(
  source: UnitStateV7,
  role: UnitRoleIdV7,
  at: CoordV7,
  hp: number,
  activation: UnitStateV7["activation"],
): UnitStateV7 {
  return {
    ...source,
    role,
    at,
    hp,
    maxHp: effectiveRoleRuleV7(role, "ORIGINAL").maxHp,
    activation,
  };
}

function ownCity(state: GameStateV7) {
  const city = state.cities.find(
    (item) => item.ownerId === state.humanPlayerId,
  );
  if (city === undefined) throw new Error("Owned city missing");
  return city;
}

const ownUnits = (state: GameStateV7) =>
  state.units.filter((unit) => unit.ownerId === state.humanPlayerId);
const hostileUnits = (state: GameStateV7) =>
  state.units.filter((unit) => unit.ownerId !== state.humanPlayerId);
const offset = (at: CoordV7, direction: 1 | -1, amount: number): CoordV7 => ({
  x: at.x + direction * amount,
  y: at.y,
});
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const coord = (at: CoordV7) => `${at.y},${at.x}`;
const distance = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const activePlayer = (state: GameStateV7) =>
  required(state.turnOrder[state.activeSeatIndex]);
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Required fixture value missing");
  return value;
}
