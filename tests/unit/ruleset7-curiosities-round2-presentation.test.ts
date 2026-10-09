import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  type BoardRenderPlanV7,
  type BoardSelectionV7,
} from "../../src/render/canvas/board-renderer-v7";
import { BIGFOOT_CODE_ART_ID_V7 } from "../../src/render/canvas/curiosity-canvas-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  BIGFOOT_NEVER_FIGHTS_V7,
  CURIOSITY_LABELS_V7,
  GRAVEYARD_PROVOKE_WARNING_V7,
  SAUCER_PROVOKE_WARNING_V7,
  curiosityBoundaryNoticeV7,
  curiosityOverlayOnTileV7,
  monsterInfoLinesV7,
  monsterRetaliationNoteV7,
  wellStatusLineV7,
} from "../../src/render/curiosity-presentation-v7";
import {
  ROUND2_UI_V7,
  round2GateBlockedUiFixtureV7,
  round2GraveyardUiFixtureV7,
  round2SaucerUiFixtureV7,
} from "../fixtures/v7-curiosities-round2-ui";

/**
 * Map curiosities round 2 UI (bead pulp_wars-737.16,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 34.1), on hand-built
 * boards (no turn is played): the overlays of the camp centres, the gates
 * and the Well; the guards and Bigfoot as neutral units; a selected camp's
 * area, reach and perimeter, Bigfoot's habitat and a gate's partner; the
 * provoke warning of a camp; the gate Move preview (exit, shove, blocked);
 * the combat note; the toss, traversal and displacement playback; the dock
 * lines and the log lines.
 */
const AT = ROUND2_UI_V7;
const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const NONE = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;
const key = (at: CoordV7): string => `${at.x},${at.y}`;

function human(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}
function unitAt(state: GameStateV7, at: CoordV7) {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${key(at)}`);
  return unit;
}
function plan(
  state: GameStateV7,
  selection: BoardSelectionV7 | null = null,
): BoardRenderPlanV7 {
  const view = human(state);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    ...NONE,
    selection,
    selectedUnitId: selection?.kind === "UNIT" ? selection.unitId : null,
  });
}
function areas(board: BoardRenderPlanV7, style: string): readonly string[] {
  return board.entries
    .filter(
      (entry) => entry.kind === "ABILITY_AREA" && entry.abilityStyle === style,
    )
    .map((entry) => key(entry.at))
    .sort();
}
function move(state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 {
  const unit = unitAt(state, from);
  const command = queryPlayerCommandsV7(human(state)).find(
    (candidate) =>
      candidate.kind === "MOVE" &&
      candidate.unitId === unit.id &&
      candidate.path.at(-1)?.x === to.x &&
      candidate.path.at(-1)?.y === to.y,
  );
  if (command === undefined) throw new Error("Move not offered");
  return command;
}
function apply(state: GameStateV7, command: CommandV7) {
  const before = human(state);
  const applied = applyCommandV7(state, state.humanPlayerId, command);
  if (!applied.accepted) throw new Error(applied.error.code);
  const after = human(applied.state);
  const envelope = projectEventsV7(
    state,
    applied.state,
    state.humanPlayerId,
    applied.events,
  );
  return { state: applied.state, before, after, envelope };
}

describe("curiosities round two on the board", () => {
  const saucer = round2SaucerUiFixtureV7();

  it("draws the camp centre, both gates and the Well as overlays under units", () => {
    const board = plan(saucer);
    const overlays = board.entries
      .filter((entry) => entry.kind === "CURIOSITY")
      .map((entry) => [entry.artSubject, key(entry.at), entry.layer]);
    expect(overlays).toEqual(
      expect.arrayContaining([
        ["CURIOSITY:DOWNED_SAUCER", key(AT.camp), 4],
        ["CURIOSITY:GATE", key(AT.gateA), 4],
        ["CURIOSITY:GATE", key(AT.gateB), 4],
        ["CURIOSITY:WISHING_WELL", key(AT.well), 4],
      ]),
    );
    expect(overlays).toHaveLength(4);
    const graveyard = plan(round2GraveyardUiFixtureV7()).entries.find(
      (entry) => entry.kind === "CURIOSITY" && entry.curiosity === "GRAVEYARD",
    );
    expect(graveyard?.artSubject).toBe("CURIOSITY:GRAVEYARD");
    for (const [at, kind] of [
      [AT.camp, "DOWNED_SAUCER"],
      [AT.gateA, "GATE"],
      [AT.well, "WISHING_WELL"],
    ] as const)
      expect(curiosityOverlayOnTileV7(human(saucer), at)).toBe(kind);
  });

  it("draws the guards in their faction's art and Bigfoot in its own, with no owner colour", () => {
    const units = plan(saucer).entries.filter(
      (entry) => entry.kind === "UNIT" && entry.monster !== undefined,
    );
    expect(
      units.map((entry) => [
        entry.label,
        entry.artSubject,
        entry.monster?.breed,
        entry.monster?.provoked,
        entry.ownerColor,
        entry.faction,
      ]),
    ).toEqual([
      ["Grunt", "UNIT:MARTIAN:FIGHTER", "GRUNT", true, undefined, undefined],
      [
        "Ray Gunner",
        "UNIT:MARTIAN:MARKSMAN",
        "RAY_GUNNER",
        true,
        undefined,
        undefined,
      ],
      [
        "Shield Projector",
        "UNIT:MARTIAN:GUARD",
        "SHIELD_PROJECTOR",
        true,
        undefined,
        undefined,
      ],
      // Bigfoot is never provoked: a unit near it only makes it flee.
      [
        "Bigfoot",
        "UNIT:NEUTRAL_BIGFOOT",
        "BIGFOOT",
        false,
        undefined,
        undefined,
      ],
    ]);
    expect(units.at(-1)?.assetId).toBe(BIGFOOT_CODE_ART_ID_V7);
    const zombies = plan(round2GraveyardUiFixtureV7()).entries.filter(
      (entry) => entry.kind === "UNIT" && entry.monster?.breed === "ZOMBIE",
    );
    expect(zombies.map((entry) => [entry.label, entry.artSubject])).toEqual([
      ["Zombie", "UNIT:UNDEAD:GUARD"],
      ["Zombie", "UNIT:UNDEAD:GUARD"],
    ]);
    // A Zombie is provoked only while a unit is in its reach.
    expect(zombies.map((entry) => entry.monster?.provoked)).toEqual([
      true,
      false,
    ]);
  });

  it("outlines a selected saucer guard's camp, its perimeter, and shades the camp's reach", () => {
    const grunt = unitAt(saucer, AT.guards[0]);
    const byUnit = plan(saucer, { kind: "UNIT", unitId: grunt.id });
    const byCentre = plan(saucer, { kind: "TILE", at: AT.camp });
    for (const board of [byUnit, byCentre]) {
      const area = areas(board, "MONSTER_AREA");
      const perimeter = areas(board, "CAMP_PERIMETER");
      // The guards' area never holds the centre; the perimeter does.
      expect(area).not.toContain(key(AT.camp));
      expect(perimeter).toContain(key(AT.camp));
      expect(perimeter).toHaveLength(25);
      expect(area.length).toBeGreaterThan(0);
      expect(areas(board, "MONSTER_REACH")).toContain(key(AT.bait));
    }
    expect(areas(byUnit, "MONSTER_AREA")).toEqual(
      areas(byCentre, "MONSTER_AREA"),
    );
  });

  it("outlines the Zombies' wander area and reach, with no perimeter", () => {
    const state = round2GraveyardUiFixtureV7();
    const zombie = unitAt(state, AT.guards[0]);
    const board = plan(state, { kind: "UNIT", unitId: zombie.id });
    expect(areas(board, "CAMP_PERIMETER")).toEqual([]);
    expect(areas(board, "MONSTER_AREA").length).toBeGreaterThan(0);
    expect(areas(board, "MONSTER_REACH")).toContain(key(AT.bait));
  });

  it("outlines Bigfoot's habitat (Forest only) and shades nothing", () => {
    const bigfoot = unitAt(saucer, AT.bigfoot);
    const board = plan(saucer, { kind: "UNIT", unitId: bigfoot.id });
    const habitat = areas(board, "MONSTER_AREA");
    expect(habitat).toContain(key(AT.bigfoot));
    const view = human(saucer);
    for (const at of habitat) {
      const [x, y] = at.split(",").map(Number);
      const tile = view.board.tiles[(y ?? 0) * view.board.width + (x ?? 0)];
      expect(tile?.explored === true ? tile.terrain : null).toBe("FOREST");
    }
    expect(areas(board, "MONSTER_REACH")).toEqual([]);
  });

  it("marks a selected gate's partner", () => {
    const partner = (at: CoordV7) =>
      plan(saucer, { kind: "TILE", at })
        .entries.filter(
          (entry) =>
            entry.kind === "ABILITY_TARGET" &&
            entry.abilityStyle === "GATE_EXIT",
        )
        .map((entry) => [key(entry.at), entry.label]);
    expect(partner(AT.gateA)).toEqual([[key(AT.gateB), "Other gate"]]);
    expect(partner(AT.gateB)).toEqual([[key(AT.gateA), "Other gate"]]);
    expect(partner(AT.camp)).toEqual([]);
  });

  it("outlines the saucer's perimeter in its own colour, the guards' area only round the centre", () => {
    const board = plan(saucer, { kind: "TILE", at: AT.camp });
    const edges = (style: string) =>
      board.entries
        .filter(
          (entry) =>
            entry.kind === "ABILITY_AREA" && entry.abilityStyle === style,
        )
        .flatMap((entry) =>
          (entry.targetEdges ?? []).map((edge) => `${key(entry.at)}:${edge}`),
        )
        .sort();
    // The perimeter's 5 x 5 box: 20 outer edges.
    expect(edges("CAMP_PERIMETER")).toHaveLength(20);
    // The area's own edges are the four round the centre.
    expect(edges("MONSTER_AREA")).toEqual(
      [
        `${AT.camp.x},${AT.camp.y - 1}:SOUTH`,
        `${AT.camp.x},${AT.camp.y + 1}:NORTH`,
        `${AT.camp.x - 1},${AT.camp.y}:EAST`,
        `${AT.camp.x + 1},${AT.camp.y}:WEST`,
      ].sort(),
    );
  });
});

describe("curiosities round two previews", () => {
  it("warns of a Move into a saucer camp, and of one into the Zombies' reach", () => {
    for (const [fixture, warning] of [
      [round2SaucerUiFixtureV7, SAUCER_PROVOKE_WARNING_V7],
      [round2GraveyardUiFixtureV7, GRAVEYARD_PROVOKE_WARNING_V7],
    ] as const) {
      const state = fixture();
      const knight = unitAt(state, AT.knight);
      const board = plan(state, { kind: "UNIT", unitId: knight.id });
      const into = board.targets.find(
        (target) =>
          target.family === "MOVE" && target.at.x === 7 && target.at.y === 9,
      );
      expect(into?.provokes).toBe(true);
      expect(into?.semanticLabel).toBe(warning);
      const away = board.targets.find(
        (target) =>
          target.family === "MOVE" && target.at.x === 11 && target.at.y === 9,
      );
      expect(away?.provokes).toBeUndefined();
    }
  });

  it("never warns of a Move near Bigfoot: it never attacks", () => {
    const state = round2SaucerUiFixtureV7();
    const scout = unitAt(state, AT.scout);
    const board = plan(state, { kind: "UNIT", unitId: scout.id });
    expect(
      board.targets.filter(
        (target) => target.family === "MOVE" && target.provokes === true,
      ),
    ).toEqual([]);
  });

  it("previews a Move onto a gate: its exit and the occupant shoved aside", () => {
    const state = round2SaucerUiFixtureV7();
    const traveller = unitAt(state, AT.traveller);
    const target = plan(state, {
      kind: "UNIT",
      unitId: traveller.id,
    }).targets.find(
      (candidate) =>
        candidate.family === "MOVE" &&
        candidate.at.x === AT.gateA.x &&
        candidate.at.y === AT.gateA.y,
    );
    expect(target?.gate).toEqual({
      exit: AT.gateB,
      displaceTo: AT.shoved,
      displaces: true,
      blocked: false,
    });
    expect(target?.previewLabel).toBe("Gate · shoves");
    expect(target?.semanticLabel).toBe(
      "Steps through the gate and comes out of the other one, shoving Player 2's Goblin aside.",
    );
  });

  it("previews a blocked gate", () => {
    const state = round2GateBlockedUiFixtureV7();
    const traveller = unitAt(state, AT.traveller);
    const target = plan(state, {
      kind: "UNIT",
      unitId: traveller.id,
    }).targets.find(
      (candidate) =>
        candidate.family === "MOVE" &&
        candidate.at.x === AT.gateA.x &&
        candidate.at.y === AT.gateA.y,
    );
    expect(target?.gate).toEqual({
      exit: AT.gateB,
      displaceTo: null,
      displaces: true,
      blocked: true,
    });
    expect(target?.previewLabel).toBe("Gate blocked");
    expect(target?.semanticLabel).toContain("stays on this gate");
  });

  it("says whether the camp strikes back, and that Bigfoot never does", () => {
    const state = round2SaucerUiFixtureV7();
    const view = human(state);
    const bait = unitAt(state, AT.bait);
    const shield = unitAt(state, AT.guards[2]);
    // The engine answers whether the camp strikes back on an attack on a
    // guard; the note says it for the camp's guards.
    expect(
      typeof queryCombatPreviewV7(view, bait.id, shield.id)?.monsterRetaliates,
    ).toBe("boolean");
    const note = (
      targetUnitId: UnitId,
      monsterRetaliates: boolean,
      on: PlayerViewV7 = view,
    ) =>
      monsterRetaliationNoteV7(on, {
        targetUnitId,
        monsterRetaliates,
        defenderDies: false,
        attackerDies: false,
      });
    expect(note(shield.id, true)).toBe(
      "The guards will strike back next round",
    );
    expect(note(shield.id, false)).toBe("Out of the guards' reach");
    const graveyard = round2GraveyardUiFixtureV7();
    const zombie = unitAt(graveyard, AT.guards[0]);
    expect(note(zombie.id, true, human(graveyard))).toBe(
      "The Zombies will strike back next round",
    );
    const bigfoot = unitAt(state, AT.bigfoot);
    expect(note(bigfoot.id, false)).toBe(BIGFOOT_NEVER_FIGHTS_V7);
  });
});

describe("curiosities round two playback and texts", () => {
  it("plays a traversal: the occupant slides aside and both gates burst", () => {
    const state = round2SaucerUiFixtureV7();
    const step = apply(state, move(state, AT.traveller, AT.gateA));
    const steps = corePresentationPlanV7(
      step.before,
      step.envelope,
      step.after,
    );
    const occupant = unitAt(state, AT.occupant);
    expect(
      steps.find(
        (candidate) =>
          candidate.kind === "MOVE" && candidate.unitId === occupant.id,
      ),
    ).toMatchObject({ path: [AT.gateB, AT.shoved], pushSlide: true });
    const burst = steps.find(
      (candidate) =>
        candidate.kind === "SUPPORT" && candidate.effect === "GATE",
    );
    expect(burst).toMatchObject({
      actor: { at: AT.gateA },
      recipients: [{ at: AT.gateB }],
    });
    const notice = curiosityBoundaryNoticeV7(
      step.envelope.events,
      step.before,
      step.after,
    );
    expect(notice?.text).toBe(
      "Gate: Player 2's Goblin was shoved aside · Your Fighter stepped through the gate",
    );
    expect(COORDINATE.test(notice?.text ?? "")).toBe(false);
  });

  it("logs a blocked gate as a toast", () => {
    const state = round2GateBlockedUiFixtureV7();
    const step = apply(state, move(state, AT.traveller, AT.gateA));
    expect(
      curiosityBoundaryNoticeV7(step.envelope.events, step.before, step.after),
    ).toEqual({ text: "Gate blocked: your Fighter stays put", toast: true });
  });

  it("plays and toasts a coin toss", () => {
    const state = round2SaucerUiFixtureV7();
    const pilgrim = unitAt(state, AT.pilgrim);
    const toss = queryPlayerCommandsV7(human(state)).find(
      (command) =>
        command.kind === "TOSS_COIN" && command.unitId === pilgrim.id,
    );
    if (toss === undefined) throw new Error("no toss offered");
    expect(wellStatusLineV7(human(state), AT.well)).toBe(
      "Stand a unit on it to toss 1 Coin.",
    );
    const step = apply(state, toss);
    const event = step.envelope.events.find(
      (candidate) => candidate.kind === "COIN_TOSSED",
    );
    if (event?.kind !== "COIN_TOSSED") throw new Error("no toss event");
    const steps = corePresentationPlanV7(
      step.before,
      step.envelope,
      step.after,
    );
    expect(
      steps.find(
        (candidate) =>
          candidate.kind === "SUPPORT" && candidate.effect === "WELL",
      ),
    ).toMatchObject({ actor: { at: AT.well } });
    const notice = curiosityBoundaryNoticeV7(
      step.envelope.events,
      step.before,
      step.after,
    );
    expect(notice?.toast).toBe(true);
    expect(notice?.text.startsWith(CURIOSITY_LABELS_V7.WISHING_WELL)).toBe(
      true,
    );
    expect(wellStatusLineV7(step.after, AT.well)).toBe(
      "You have tossed your Coin.",
    );
  });

  it("plays the neutral turn's guard attack and logs it by the guard's name", () => {
    // Both seats end their turns by hand (no AI runs); the second END_TURN
    // wraps the round and holds the neutral turn.
    const state = round2GraveyardUiFixtureV7();
    const seats = state.turnOrder;
    let current = state;
    let last: ReturnType<typeof endTurn> | null = null;
    function endTurn(from: GameStateV7, actor: (typeof seats)[number]) {
      const applied = applyCommandV7(from, actor, { kind: "END_TURN" });
      if (!applied.accepted) throw new Error(applied.error.code);
      return {
        state: applied.state,
        before: human(from),
        after: human(applied.state),
        envelope: projectEventsV7(
          from,
          applied.state,
          state.humanPlayerId,
          applied.events,
        ),
      };
    }
    for (const actor of seats) {
      last = endTurn(current, actor);
      current = last.state;
    }
    if (last === null) throw new Error("no turn");
    const kinds = last.envelope.events.map((event) => event.kind);
    expect(kinds).toContain("NEUTRAL_TURN_STARTED");
    const steps = corePresentationPlanV7(
      last.before,
      last.envelope,
      last.after,
    );
    expect(steps.some((step) => step.kind === "MELEE")).toBe(true);
    const notice = curiosityBoundaryNoticeV7(
      last.envelope.events,
      last.before,
      last.after,
    );
    expect(notice?.text.startsWith("The wilds stir")).toBe(true);
    expect(notice?.text).toContain("Zombie attacked your Fighter");
    expect(notice?.toast).toBe(true);
  });

  it("gives a guard and Bigfoot their dock lines", () => {
    const state = round2SaucerUiFixtureV7();
    const view = human(state);
    const grunt = monsterInfoLinesV7(view, unitAt(state, AT.guards[0]).id);
    expect(grunt.map((line) => line.id)).toEqual([
      "neutral",
      "bounty",
      "provoked",
    ]);
    expect(grunt[0]?.description).toContain("crashed saucer");
    expect(grunt[1]?.description).toBe("3 Coins for the kill.");
    expect(grunt[2]?.description).toBe(
      "Will attack your Fighter after this round.",
    );
    const bigfoot = monsterInfoLinesV7(view, unitAt(state, AT.bigfoot).id);
    expect(bigfoot.map((line) => [line.id, line.name])).toEqual([
      ["neutral", "Neutral"],
      ["bounty", "Bounty"],
      ["alert", "Alert"],
    ]);
    expect(bigfoot[1]?.description).toBe("12 Coins for the kill.");
    for (const line of [...grunt, ...bigfoot])
      expect(COORDINATE.test(`${line.name} ${line.description}`)).toBe(false);
  });
});
