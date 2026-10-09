import { describe, expect, it } from "vitest";
import {
  GOBLIN_ROLE_MECHANICS_V7,
  applyCommandV7,
  previewAttackExplosionsV7,
  previewKaboomV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  BERSERK_DESCRIPTION_V7,
  BERSERK_REACH_LABEL_V7,
  BERSERK_STATUS_V7,
  GOBLIN_HELP_RULES_V7,
  berserkCursorCueV7,
  berserkNewReachV7,
  berserkPreviewTextV7,
  blastPreviewPresentationV7,
  goblinAbilityDescriptionV7,
  goblinAbilityNameV7,
  goblinCommandLabelV7,
  goblinAttackPreviewTextV7,
  goblinBoundaryNoticeV7,
  goblinFieldDefenseBlockedV7,
  goblinRecruitNotesV7,
  goblinUnitInfoLinesV7,
  kaboomPreviewTextV7,
  kaboomTooltipV7,
  matchHasGoblinV7,
  technologyNameV7,
} from "../../src/render/goblin-presentation-v7";
import {
  cureCaptainPhraseV7,
  factionCanCureAfflictionsV7,
  undeadAbilityDescriptionV7,
  unitAfflictionsV7,
} from "../../src/render/undead-presentation-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/dom/app-view-v7";
import {
  portraitSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  REGENERATION_TEXT_COLOR_V7,
  drawSupportFeedbackV7,
} from "../../src/render/canvas/support-presentation-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { panToFrameArea } from "../../src/render/canvas/geometry";
import {
  GOBLIN_BLAST_PALETTE_V7,
  drawBombProjectileV7,
  drawExplosionFeedbackV7,
} from "../../src/render/canvas/goblin-explosion-v7";
import {
  GOBLIN_ATTACK_CHAIN_V7,
  GOBLIN_BERSERK_V7,
  GOBLIN_SHOWCASE_V7,
  goblinAttackChainFixtureV7,
  goblinBerserkActiveFixtureV7,
  goblinBerserkFixtureV7,
  goblinShowcaseFixtureV7,
} from "../fixtures/v7-goblin-ui";
import { tacticalAttachmentsV7 } from "../../src/render/tactical-presentation-v7";
import {
  BERSERK_PALETTE_V7,
  drawBerserkGlyphV7,
  drawBerserkReachV7,
} from "../../src/render/canvas/goblin-canvas-v7";
import {
  endTurnUntilV7,
  goblinArenaV7,
  seatIdV7,
} from "../fixtures/v7-goblin-arena";

const AT = GOBLIN_SHOWCASE_V7;
// Blast damages come from the Goblin registry, so these expectations follow
// the section 14.1 tuning (`pulp_wars-0ao.7`) instead of pinning numbers.
const KABOOM = blastDamage(GOBLIN_ROLE_MECHANICS_V7.FIGHTER.kaboomDamage);
const CHUCKER_KABOOM = blastDamage(
  GOBLIN_ROLE_MECHANICS_V7.MARKSMAN.kaboomDamage,
);
const CHUCKER_BLAST = blastDamage(
  GOBLIN_ROLE_MECHANICS_V7.MARKSMAN.deathBlastDamage,
);
const CART_BLAST = blastDamage(
  GOBLIN_ROLE_MECHANICS_V7.CATAPULT.deathBlastDamage,
);
// The showcase's 3-HP Rocket Cart and Raider, and the attack chain's 2-HP
// Rocket Cart, take at most their HP.
const SHOWCASE_LOW_HP = 3;
const CHAIN_CART_HP = 2;
// Board labels of the showcase Kaboom chain, in (y, x) order.
const SHOWCASE_BLAST_LABELS = [
  `Yours −${KABOOM}`,
  "Kaboom!",
  `−${KABOOM}`,
  `Yours −${Math.min(KABOOM, SHOWCASE_LOW_HP)} · Wave 2`,
  `−${Math.min(KABOOM, SHOWCASE_LOW_HP)}`,
  `−${CART_BLAST}`,
];
const ATTACK_CHAIN_WARNINGS = [
  `Enemy Bomb Chucker explodes on death: ${CHUCKER_BLAST} damage around it`,
  `Chain reaction: enemy Rocket Cart explodes (${CART_BLAST} damage)`,
  "Blasts hit 3 of your units, 0 killed",
];

function blastDamage(value: number | null): number {
  if (value === null) throw new Error("blast damage missing");
  return value;
}
const NO_INTERACTION = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

describe("Revision 17 Goblin presentation text", () => {
  it("summarises a Kaboom chain with friendly fire, waves and Plunder", () => {
    const view = showcaseView();
    const kaboom = unitAt(view, AT.kaboom);
    const preview = required(previewKaboomV7(view, kaboom.id));
    const text = kaboomPreviewTextV7(view, preview);
    expect(text.summary).toBe("Hits 5 units: 3 enemy, 2 yours. Kills 2.");
    expect(text.chain).toEqual([
      `Chain reaction: your Rocket Cart explodes (${CART_BLAST} damage)`,
    ]);
    expect(text.friendlyFire).toBe(
      "Friendly fire: 2 of your units hit, 1 killed",
    );
    expect(text.plunder).toBe("Plunder: +2 Coins");
    expect(text.fog).toBe(null);
    expect(text.bitten).toBe(null);
    expect(text.fieldDefense).toBe(null);
    expect(text.chip).toBe("5 hit · 2 ✕");
    expect(text.friendlyChip).toBe("2 yours hit");
    expect(kaboomTooltipV7(4)).toBe(
      "Blow up: 4 damage to every other unit in the 3×3 square, yours too. This unit dies.",
    );
  });

  it("labels every hit cell of a chain on the board, own units as Yours", () => {
    const view = showcaseView();
    const kaboom = unitAt(view, AT.kaboom);
    const preview = required(previewKaboomV7(view, kaboom.id));
    const blast = blastPreviewPresentationV7(view, preview, kaboom.id);
    expect(
      blast.cells.map((cell) => [
        cell.at,
        cell.label,
        cell.lethal,
        cell.friendly,
      ]),
    ).toEqual(
      [
        [AT.ownGoblin, false, true],
        [AT.kaboom, true, false],
        [AT.enemyFighter, false, false],
        [AT.rocketCart, true, true],
        [AT.enemyRaider, true, false],
        [AT.enemyMarksman, false, false],
      ].map(([at, lethal, friendly], index) => [
        at,
        SHOWCASE_BLAST_LABELS[index],
        lethal,
        friendly,
      ]),
    );
    expect(blast.sources).toEqual([
      { at: AT.kaboom, wave: 1 },
      { at: AT.rocketCart, wave: 2 },
    ]);
    // Two 3 × 3 areas that share four cells.
    expect(blast.area).toHaveLength(14);
  });

  it("warns about a Bitten Kaboom, lost Field Defense and fog", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 1, y: 1 } },
      ],
    );
    const goblin = state.units[0];
    const zombie = state.units[1];
    if (goblin === undefined || zombie === undefined)
      throw new Error("pieces missing");
    const bitten: GameStateV7 = {
      ...state,
      bitten: [
        {
          unitId: goblin.id,
          biterPlayerId: zombie.ownerId,
          biterUnitId: zombie.id,
        },
      ],
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === 5 && tile.at.y === 3
            ? { ...tile, fieldDefense: true }
            : tile,
        ),
      },
    };
    const view = viewForV7(bitten, bitten.humanPlayerId);
    const preview = required(previewKaboomV7(view, goblin.id));
    const text = kaboomPreviewTextV7(view, preview);
    expect(text.bitten).toBe("Bitten: this unit will rise as an enemy Zombie");
    expect(text.fieldDefense).toBe("Destroys Field Defense on 1 tile");
    // The rising Zombie on the exploder's tile is hit by its own blast.
    expect(
      blastPreviewPresentationV7(view, preview, goblin.id).cells.find(
        (cell) => cell.at.x === 4 && cell.at.y === 3,
      )?.label,
    ).toBe(`Kaboom! · Zombie −${KABOOM}`);
    expect(
      kaboomPreviewTextV7(view, { ...preview, touchesUnexplored: true }).fog,
    ).toBe("The blast may reach unexplored tiles");
  });

  it("shows Gang Up and a friendly bomb splash in the attack preview", () => {
    const view = showcaseView();
    const chucker = unitAt(view, AT.bombChucker);
    const target = unitAt(view, AT.bombTarget);
    const preview = required(queryCombatPreviewV7(view, chucker.id, target.id));
    const chain = previewAttackExplosionsV7(view, chucker.id, target.id);
    // The Goblin pass (7r50): a bomb gets no Gang Up from the Goblin beside
    // its target; the splash on that Goblin is still warned of.
    expect(goblinAttackPreviewTextV7(view, preview, chain)).toEqual({
      gangUp: null,
      warnings: ["Bomb splash hits your Goblin"],
      summary: "Bomb hits your Goblin",
      semantic: "Bomb splash hits your Goblin.",
    });
    // The Rocket Cart's shot at the Fighter beside the Kaboom Goblin has it.
    const cart = unitAt(view, AT.rocketCart);
    const fighter = unitAt(view, AT.enemyFighter);
    const shot = required(queryCombatPreviewV7(view, cart.id, fighter.id));
    const text = goblinAttackPreviewTextV7(
      view,
      shot,
      previewAttackExplosionsV7(view, cart.id, fighter.id),
    );
    expect(text.gangUp).toBe("Gang Up +1");
    expect(text.semantic).toContain(
      "Gang Up adds 1 Attack from your units next to the target.",
    );
  });

  it("warns a Human attacker about an exploding target and its chain", () => {
    const state = goblinAttackChainFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const attacker = unitAt(view, GOBLIN_ATTACK_CHAIN_V7.attacker);
    const target = unitAt(view, GOBLIN_ATTACK_CHAIN_V7.bombChucker);
    const preview = required(
      queryCombatPreviewV7(view, attacker.id, target.id),
    );
    const chain = required(
      previewAttackExplosionsV7(view, attacker.id, target.id),
    );
    const text = goblinAttackPreviewTextV7(view, preview, chain);
    expect(text.warnings).toEqual(ATTACK_CHAIN_WARNINGS);
    // Bead pulp_wars-0ao.12: the crowded-board summary of those lines.
    expect(text.summary).toBe("Chain: 2 blasts · 3 yours hit");
    const cells = blastPreviewPresentationV7(
      view,
      chain,
      null,
      attacker.id,
    ).cells;
    // The attacker advances onto the Bomb Chucker's tile and is hit there.
    expect(
      cells.find((cell) => same(cell.at, GOBLIN_ATTACK_CHAIN_V7.bombChucker))
        ?.label,
    ).toBe(`Attacker −${CHUCKER_BLAST + CART_BLAST}`);
    expect(
      cells.find((cell) => same(cell.at, GOBLIN_ATTACK_CHAIN_V7.rocketCart))
        ?.label,
    ).toBe(`−${Math.min(CHUCKER_BLAST, CHAIN_CART_HP)} · Wave 2`);
  });

  it("lists Goblin unit info from the public Goblin mechanics", () => {
    const view = showcaseView();
    const stats = (at: CoordV7) =>
      required(
        view.unitStats.find((entry) => entry.unitId === unitAt(view, at).id)
          ?.goblin,
      );
    const names = (role: "FIGHTER" | "MARKSMAN" | "JUGGERNAUT", at: CoordV7) =>
      goblinUnitInfoLinesV7(role, stats(at), role === "MARKSMAN").map(
        (line) => line.name,
      );
    expect(names("FIGHTER", AT.kaboom)).toEqual([
      `Kaboom ${KABOOM}`,
      "Gang Up",
      "No Field Defense",
    ]);
    expect(names("MARKSMAN", AT.bombChucker)).toEqual([
      `Kaboom ${CHUCKER_KABOOM}`,
      `Explodes on death (${CHUCKER_BLAST})`,
      "Bombs",
      "No Gang Up",
    ]);
    expect(names("JUGGERNAUT", AT.troll)).toEqual([
      "Regenerates 4 HP each turn",
      "Gang Up",
    ]);
    expect(goblinRecruitNotesV7("FIGHTER", "GOBLIN")).toContain(
      "No Field Defense: Goblins cannot build Field Defense; use an Orc Brute",
    );
    expect(goblinRecruitNotesV7("FIGHTER", "ORIGINAL")).toEqual([]);
    expect(GOBLIN_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Horde",
      "Gang Up",
      "Kaboom",
      "Death blasts",
      "Chain reactions",
      "Bombs",
      // The Goblin pass (7r50).
      "Orc Brutes",
      "Crash",
      "Plunder",
      // `pulp_wars-w49.36`: Berserk replaced WAAAGH!.
      "Berserk",
      "Trolls",
      "Discipline",
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Ogre.
      "Heavyweight",
    ]);
  });

  it("explains the Goblin Field Defense restriction where a Fighter could build it", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 9 } },
        { seat: 0, role: "GUARD", at: { x: 9, y: 9 } },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
    );
    const view = viewForV7(state, state.humanPlayerId);
    const [home, brute, away] = view.units;
    if (home === undefined || brute === undefined || away === undefined)
      throw new Error("pieces missing");
    expect(goblinFieldDefenseBlockedV7(view, home.id)).toBe(true);
    // The Orc Brute is offered the command; a Goblin outside territory is not.
    expect(goblinFieldDefenseBlockedV7(view, brute.id)).toBe(false);
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "BUILD_FIELD_DEFENSE" && command.unitId === brute.id,
      ),
    ).toBe(true);
    expect(goblinFieldDefenseBlockedV7(view, away.id)).toBe(false);
  });

  it("logs explosions, Plunder, regeneration and Berserk", () => {
    const state = goblinShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const kaboom = boundary(state, {
      kind: "KABOOM",
      unitId: unitAt(view, AT.kaboom).id,
    });
    expect(
      goblinBoundaryNoticeV7(kaboom.events.events, kaboom.before, kaboom.after),
    ).toEqual({
      text: "Your Goblin blew up: 4 hit, 2 killed · Your Rocket Cart exploded: 1 hit, 0 killed · Plunder: +2 Coins",
      toast: true,
    });
    const rally = boundary(state, {
      kind: "RALLY",
      unitId: unitAt(view, AT.warboss).id,
    });
    expect(
      goblinBoundaryNoticeV7(rally.events.events, rally.before, rally.after),
    ).toEqual({
      text: "Your Orc Warboss: Berserk for 1 unit (+1 Move, ignore zones of control)",
      toast: true,
    });
    const regenerated = goblinBoundaryNoticeV7(
      [
        {
          kind: "UNITS_REGENERATED",
          playerId: view.viewer.id,
          results: [
            { unitId: unitAt(view, AT.troll).id, amount: 4, hpAfter: 34 },
          ],
        },
      ],
      view,
      view,
    );
    expect(regenerated).toEqual({
      text: "Your Troll regenerated 4 HP",
      toast: true,
    });
  });

  it("names technologies and Goblin art by the viewer's faction", () => {
    expect(technologyNameV7("COMMERCE", "GOBLIN")).toBe("Plunder");
    // The ninth unit (`pulp_wars-w49.17`, 7r55): the shared names
    // (Shipbuilding for Naval Engineering) and a faction's own (Chivalry is
    // the Vampires' and the Scrap Buggies' node); a name with neither is
    // the ID in sentence case.
    for (const faction of ["ORIGINAL", "UNDEAD", "GOBLIN"] as const) {
      expect(technologyNameV7("NAVAL_ENGINEERING", faction)).toBe(
        "Shipbuilding",
      );
      expect(technologyNameV7("NAVIGATION", faction)).toBe("Navigation");
    }
    expect(
      (["ORIGINAL", "UNDEAD", "GOBLIN"] as const).map((faction) =>
        technologyNameV7("CHIVALRY", faction),
      ),
    ).toEqual(["Chivalry", "Vampires", "Scrap Buggies"]);
    expect(technologyNameV7("COMMERCE", "ORIGINAL")).toBe("Commerce");
    expect(technologyNameV7("COMMERCE", "UNDEAD")).toBe("Commerce");
    // Goblin land roles have their own portraits (pulp_wars-0ao.8).
    expect(portraitSubjectV7("FIGHTER", "GOBLIN")).toBe(
      "PORTRAIT:GOBLIN:FIGHTER",
    );
    // And since bead pulp_wars-w5j.3 their ships too.
    expect(portraitSubjectV7("BATTLESHIP", "GOBLIN")).toBe(
      "PORTRAIT:GOBLIN:BATTLESHIP",
    );
    expect(portraitSubjectV7("FIGHTER", "ORIGINAL")).toBe("PORTRAIT:FIGHTER");
    // (The root's card is the Workshop since the Industry reshuffle, 7r56;
    // the Goblins' own Workshop since bead pulp_wars-2yc.38, stage 2.)
    expect(technologySubjectV7("DRILL", "GOBLIN")).toBe(
      "IMPROVEMENT:GOBLIN:WORKSHOP",
    );
    expect(technologySubjectV7("CHIVALRY", "GOBLIN")).toBe(
      "UNIT:GOBLIN:KNIGHT",
    );
    expect(technologySubjectV7("ADMINISTRATION", "GOBLIN")).toBe(
      "PORTRAIT:GOBLIN:CAPTAIN",
    );
    expect(technologySubjectV7("DRILL", "ORIGINAL")).toBe(
      "IMPROVEMENT:WORKSHOP",
    );
  });

  it("stays silent in matches without a Goblin seat", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const view = viewForV7(state, state.humanPlayerId);
    expect(matchHasGoblinV7(view)).toBe(false);
    const rally = boundary(state, {
      kind: "RALLY",
      unitId: unitAt(view, { x: 4, y: 3 }).id,
    });
    expect(
      goblinBoundaryNoticeV7(rally.events.events, rally.before, rally.after),
    ).toBe(null);
  });

  it("names a Captain's cure on afflicted units only when their owner can Tend", () => {
    // pulp_wars-0ao.16: only a Human Captain's Tend Wounded cures Plague and
    // bites; Windmills and Troll regeneration cure nothing.
    expect(factionCanCureAfflictionsV7("ORIGINAL")).toBe(true);
    expect(factionCanCureAfflictionsV7("GOBLIN")).toBe(false);
    expect(factionCanCureAfflictionsV7("UNDEAD")).toBe(false);
    const arena = goblinArenaV7(
      ["GOBLIN", "UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 4 } },
        { seat: 1, role: "CATAPULT", at: { x: 7, y: 4 } },
        { seat: 1, role: "GUARD", at: { x: 6, y: 5 } },
        { seat: 2, role: "FIGHTER", at: { x: 5, y: 6 } },
      ],
    );
    const at = (x: number, y: number) =>
      required(arena.units.find((unit) => unit.at.x === x && unit.at.y === y))
        .id;
    const [goblin, lich, zombie, human] = [
      at(5, 4),
      at(7, 4),
      at(6, 5),
      at(5, 6),
    ];
    const state: GameStateV7 = {
      ...arena,
      plagued: [goblin, human].map((unitId) => ({
        unitId,
        sourceUnitId: lich,
        turnsRemaining: 2,
      })),
      bitten: [goblin, human].map((unitId) => ({
        unitId,
        biterPlayerId: seatIdV7(arena, 1),
        biterUnitId: zombie,
      })),
    };
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(
      unitAfflictionsV7(view, goblin).map((item) => item.explanation),
    ).toEqual([
      "Plague from Player 2's Lich: −2 HP at the start of each of its next 2 turns, then it ends. It ends sooner only if that Lich dies; Goblins can't cure it.",
      "Bitten by Player 2's Zombie: if it dies it rises as Player 2's Zombie; Goblins can't cure bites.",
    ]);
    expect(
      unitAfflictionsV7(view, human).map((item) => item.explanation),
    ).toEqual([
      "Plague from Player 2's Lich: −2 HP at the start of each of its next 2 turns, then it ends. It ends sooner if that Lich dies or a Captain tends it.",
      "Bitten by Player 2's Zombie: if it dies it rises as Player 2's Zombie, unless a Captain tends it first.",
    ]);
  });
});

describe("Lich Plague ability text is match-aware", () => {
  // pulp_wars-0ao.18: the sentence names a Captain's tending only when a seat
  // that can Tend (Human) is in the match.
  const lichText = (factions: Parameters<typeof goblinArenaV7>[0]) => {
    const arena = goblinArenaV7(factions, [
      { seat: 0, role: "FIGHTER", at: { x: 5, y: 4 } },
    ]);
    return undeadAbilityDescriptionV7(
      "PLAGUE",
      "UNDEAD",
      cureCaptainPhraseV7(viewForV7(arena, seatIdV7(arena, 0))),
    );
  };

  it("keeps Human/Undead text byte-identical and names no cure without a Human seat", () => {
    // The Undead pass, correction (`pulp_wars-w49.13`): "With Pestilence".
    const base =
      "With Pestilence: living units its attacks hit are plagued for 3 turns: −2 HP each turn, spreading to neighbours on the first. It ends sooner if this Lich dies";
    expect(lichText(["UNDEAD", "ORIGINAL"])).toBe(
      `${base} or a Captain tends them.`,
    );
    expect(lichText(["UNDEAD", "UNDEAD"])).toBe(`${base}.`);
    expect(lichText(["UNDEAD", "GOBLIN"])).toBe(`${base}.`);
    expect(lichText(["UNDEAD", "ORIGINAL", "GOBLIN"])).toBe(
      `${base} or a Human Captain tends them.`,
    );
    // The recruitment info panel threads the same match phrase through.
    const plague = (cure: string | null) =>
      recruitmentRolePresentationV7("CATAPULT", "UNDEAD", cure).abilities.find(
        (line) => line.startsWith("Plague:"),
      );
    expect(plague(null)).toBe(`Plague: ${base}.`);
    expect(plague("a Captain")).toBe(
      `Plague: ${base} or a Captain tends them.`,
    );
    // Callers that do not know the match keep the pre-0ao.18 sentence.
    expect(undeadAbilityDescriptionV7("PLAGUE", "UNDEAD")).toBe(
      `${base} or a Captain tends them.`,
    );
  });
});

describe("Revision 17 Goblin board previews", () => {
  it("adds the Kaboom blast preview and hides the unit's other targets", () => {
    const view = showcaseView();
    const kaboom = unitAt(view, AT.kaboom);
    const commands = queryPlayerCommandsV7(view);
    const selection = { kind: "UNIT" as const, unitId: kaboom.id };
    const plain = buildBoardRenderPlanV7(view, commands, {
      ...NO_INTERACTION,
      selection,
      selectedUnitId: kaboom.id,
    });
    expect(plain.entries.some((entry) => entry.abilityStyle === "BLAST")).toBe(
      false,
    );
    expect(plain.targets.length).toBeGreaterThan(0);
    const previewed = buildBoardRenderPlanV7(view, commands, {
      ...NO_INTERACTION,
      selection,
      selectedUnitId: kaboom.id,
      kaboomPreviewUnitId: kaboom.id,
    });
    expect(previewed.targets).toEqual([]);
    const targets = previewed.entries.filter(
      (entry): entry is BoardRenderPlanEntryV7 =>
        entry.kind === "ABILITY_TARGET",
    );
    expect(
      targets.map((entry) => [entry.label, entry.abilityStyle, entry.lethal]),
    ).toEqual(
      [
        ["BLAST_FRIENDLY", false],
        ["BLAST", true],
        ["BLAST", false],
        ["BLAST_FRIENDLY", true],
        ["BLAST", true],
        ["BLAST", false],
      ].map(([style, lethal], index) => [
        SHOWCASE_BLAST_LABELS[index],
        style,
        lethal,
      ]),
    );
    expect(
      previewed.entries.filter((entry) => entry.kind === "ABILITY_AREA"),
    ).toHaveLength(14);
  });

  it("marks friendly bomb splash and Gang Up on the attack target", () => {
    const view = showcaseView();
    const chucker = unitAt(view, AT.bombChucker);
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      ...NO_INTERACTION,
      selection: { kind: "UNIT", unitId: chucker.id },
      selectedUnitId: chucker.id,
    });
    const target = required(
      plan.targets.find((candidate) => same(candidate.at, AT.bombTarget)),
    );
    // The Goblin pass (7r50): no Gang Up on a bomb (the note was "Gang Up
    // +1" and the splash 5).
    expect(target.previewNote).toBeUndefined();
    expect(target.previewWarnings).toEqual(["Bomb splash hits your Goblin"]);
    expect(target.splash).toEqual([
      // Half of the 6 a bomb deals a Human Guard from two tiles.
      { at: AT.bombHelper, damage: 3, dies: false, friendly: true },
    ]);
    expect(target.semanticLabel).toContain(
      "Splash affects 1 adjacent unit (1 yours) for 3.",
    );
    // A Rocket Cart's shot still shows it.
    const cart = unitAt(view, AT.rocketCart);
    const cartPlan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      ...NO_INTERACTION,
      selection: { kind: "UNIT", unitId: cart.id },
      selectedUnitId: cart.id,
    });
    expect(
      required(
        cartPlan.targets.find((candidate) =>
          same(candidate.at, AT.enemyFighter),
        ),
      ).previewNote,
    ).toBe("Gang Up +1");
  });

  it("carries the death-blast chain of a Human attack on an exploding unit", () => {
    const state = goblinAttackChainFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const attacker = unitAt(view, GOBLIN_ATTACK_CHAIN_V7.attacker);
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      ...NO_INTERACTION,
      selection: { kind: "UNIT", unitId: attacker.id },
      selectedUnitId: attacker.id,
    });
    const target = required(
      plan.targets.find((candidate) =>
        same(candidate.at, GOBLIN_ATTACK_CHAIN_V7.bombChucker),
      ),
    );
    expect(target.blast?.sources.map((source) => source.wave)).toEqual([1, 2]);
    expect(target.previewWarnings).toEqual(ATTACK_CHAIN_WARNINGS);
    // The lone blast target draws its areas and hit labels.
    const { context, log } = recordingContext();
    drawBoardV7({
      context,
      viewport: { width: 1200, height: 900 },
      devicePixelRatio: 1,
      camera: { offsetX: 100, offsetY: 100, zoom: 0.625 },
      plan,
      images: { resolve: () => null },
    });
    const texts = log
      .filter((call) => call[0] === "fillText")
      .map((call) => call[1]);
    expect(texts).toContain(`Attacker −${CHUCKER_BLAST + CART_BLAST}`);
    expect(texts).toContain(
      `−${Math.min(CHUCKER_BLAST, CHAIN_CART_HP)} · Wave 2`,
    );
  });

  it("keeps Human-only attack previews free of Goblin fields", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
    );
    const view = viewForV7(state, state.humanPlayerId);
    const attacker = unitAt(view, { x: 4, y: 3 });
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      ...NO_INTERACTION,
      selection: { kind: "UNIT", unitId: attacker.id },
      selectedUnitId: attacker.id,
      kaboomPreviewUnitId: attacker.id,
    });
    const target = required(
      plan.targets.find((candidate) => candidate.family === "ATTACK"),
    );
    expect(target.previewWarnings).toBeUndefined();
    expect(target.previewNote).toBeUndefined();
    expect(target.blast).toBeUndefined();
    expect(target.splash).toBeUndefined();
    expect(plan.entries.some((entry) => entry.abilityStyle === "BLAST")).toBe(
      false,
    );
  });
});

describe("Goblin Berserk presentation (pulp_wars-w49.36)", () => {
  const BERSERK = GOBLIN_BERSERK_V7;
  const berserkView = (active: boolean): PlayerViewV7 => {
    const state = active
      ? goblinBerserkActiveFixtureV7()
      : goblinBerserkFixtureV7();
    return viewForV7(state, state.humanPlayerId);
  };

  it("names the Warboss's Rally Berserk everywhere and says what it does", () => {
    expect(goblinCommandLabelV7("RALLY", "GOBLIN")).toBe("Berserk");
    expect(goblinCommandLabelV7("RALLY", "ORIGINAL")).toBe(null);
    expect(goblinAbilityNameV7("RALLY", "GOBLIN")).toBe("Berserk");
    expect(goblinAbilityDescriptionV7("RALLY", "GOBLIN")).toBe(
      BERSERK_DESCRIPTION_V7,
    );
    expect(BERSERK_DESCRIPTION_V7).toBe(
      "Every other unit of yours on land within 2 tiles that has not moved gets +1 Move and ignores enemy zones of control this turn.",
    );
    const help = new Map(GOBLIN_HELP_RULES_V7);
    expect(help.get("Berserk")).toBe(
      "the Orc Warboss sends every other unit of yours on land within 2 tiles that has not moved Berserk: +1 Move this turn, and enemies next to its path do not stop it.",
    );
    // The blast numbers of the Help come from the registration.
    expect(help.get("Death blasts")).toContain(
      "(Bomb Chucker 5, Rocket Cart 7, Scrap Buggy 7)",
    );
    expect(help.get("Kaboom")).toContain(
      "(Goblin 6, Wolf Rider 4, Bomb Chucker 4, Rocket Cart 5, Scrap Buggy 5)",
    );
    expect(
      JSON.stringify([...GOBLIN_HELP_RULES_V7, BERSERK_DESCRIPTION_V7]),
    ).not.toMatch(/WAAAGH/i);
  });

  it("previews the units a Berserk would reach, and none once called", () => {
    const view = berserkView(false);
    const warboss = unitAt(view, BERSERK.warboss);
    expect(berserkPreviewTextV7(view, warboss.id)).toEqual({
      unitIds: [BERSERK.wolfRider, BERSERK.goblin, BERSERK.bombChucker].map(
        (at) => unitAt(view, at).id,
      ),
      chip: "3 units",
      description: "Sends 3 units Berserk: Wolf Rider, Goblin, Bomb Chucker.",
    });
    // A unit whose Rally is no Berserk has no Berserk preview.
    expect(berserkPreviewTextV7(view, unitAt(view, BERSERK.wolfRider).id)).toBe(
      null,
    );
    const active = berserkView(true);
    expect(
      berserkPreviewTextV7(active, unitAt(active, BERSERK.warboss).id)?.chip,
    ).toBe("0 units");
  });

  it("marks the radius and each unit it reaches with +1 Move while the button is hovered", () => {
    const view = berserkView(false);
    const warboss = unitAt(view, BERSERK.warboss);
    const commands = queryPlayerCommandsV7(view);
    const selection = { kind: "UNIT" as const, unitId: warboss.id };
    const quiet = buildBoardRenderPlanV7(view, commands, {
      ...NO_INTERACTION,
      selection,
      selectedUnitId: warboss.id,
    });
    expect(
      quiet.entries.some((entry) =>
        entry.key.startsWith("ability-area:BERSERK"),
      ),
    ).toBe(false);
    const hovered = buildBoardRenderPlanV7(view, commands, {
      ...NO_INTERACTION,
      selection,
      selectedUnitId: warboss.id,
      areaSupportFocus: { unitId: warboss.id, kind: "RALLY" },
    });
    const rings = hovered.entries.filter(
      (entry) =>
        entry.kind === "ABILITY_TARGET" && entry.abilityStyle === "RALLY",
    );
    expect(rings.map((entry) => [entry.at, entry.label])).toEqual([
      // In board order (y, x).
      [BERSERK.goblin, "+1 Move"],
      [BERSERK.wolfRider, "+1 Move"],
      [BERSERK.bombChucker, "+1 Move"],
    ]);
    // The radius: the 5 × 5 square around the Warboss.
    const area = hovered.entries.filter((entry) =>
      entry.key.startsWith("ability-area:BERSERK"),
    );
    expect(area).toHaveLength(25);
    expect(area.every((entry) => entry.abilityStyle === "RALLY")).toBe(true);
  });

  it("marks Berserk units and the Moves only Berserk gives them", () => {
    const view = berserkView(true);
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      ...NO_INTERACTION,
    });
    const marked = plan.entries
      .filter((entry) => entry.kind === "UNIT" && entry.berserk === true)
      .map((entry) => entry.at);
    expect(marked).toEqual([
      BERSERK.goblin,
      BERSERK.wolfRider,
      BERSERK.bombChucker,
    ]);
    const rider = unitAt(view, BERSERK.wolfRider);
    expect(berserkCursorCueV7(view, rider)).toBe(BERSERK_STATUS_V7);
    expect(berserkCursorCueV7(view, unitAt(view, BERSERK.farGoblin))).toBe("");
    const selected = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      ...NO_INTERACTION,
      selection: { kind: "UNIT", unitId: rider.id },
      selectedUnitId: rider.id,
    });
    const moveTo = (at: CoordV7) =>
      required(
        selected.targets.find(
          (target) => target.family === "MOVE" && same(target.at, at),
        ),
      );
    // Through the gap between the two enemies, and the extra third tile.
    expect(moveTo(BERSERK.gap).berserkReach).toBe(true);
    expect(moveTo(BERSERK.gap).semanticLabel).toContain(BERSERK_REACH_LABEL_V7);
    expect(moveTo({ x: 6, y: 2 }).berserkReach).toBe(true);
    expect(moveTo({ x: 0, y: 2 }).berserkReach).toBe(true);
    // A tile it reached anyway is a plain Move.
    expect(moveTo({ x: 4, y: 2 }).berserkReach).toBeUndefined();
    expect(berserkNewReachV7(view, rider.id).has("4,2")).toBe(false);
    // Before the Berserk nothing is marked.
    const calm = berserkView(false);
    const calmPlan = buildBoardRenderPlanV7(calm, queryPlayerCommandsV7(calm), {
      ...NO_INTERACTION,
      selection: { kind: "UNIT", unitId: rider.id },
      selectedUnitId: rider.id,
    });
    expect(calmPlan.entries.some((entry) => entry.berserk === true)).toBe(
      false,
    );
    expect(calmPlan.targets.some((target) => target.berserkReach)).toBe(false);
    expect(
      calmPlan.targets.some(
        (target) => target.family === "MOVE" && same(target.at, BERSERK.gap),
      ),
    ).toBe(false);
  });

  it("draws the Berserk glyph and the reach mark in Berserk orange, white in high contrast", () => {
    const glyph = recordingContext();
    drawBerserkGlyphV7(glyph.context, 100, 100, 1, { chibi: true, slot: 1 });
    expect(glyph.styles).toContain(BERSERK_PALETTE_V7.rim);
    expect(glyph.styles).toContain(BERSERK_PALETTE_V7.chevron);
    expect(glyph.log.filter((call) => call[0] === "arc")).toHaveLength(1);
    const reach = recordingContext();
    drawBerserkReachV7(reach.context, 100, 100, 1);
    expect(reach.styles).toContain(BERSERK_PALETTE_V7.reach);
    const contrast = recordingContext();
    drawBerserkReachV7(contrast.context, 100, 100, 1, true);
    expect(contrast.styles).not.toContain(BERSERK_PALETTE_V7.reach);
    expect(contrast.styles).toContain("#ffffff");
  });

  it("keeps WAAAGH! out of the status labels", () => {
    const view = berserkView(true);
    expect(JSON.stringify(tacticalAttachmentsV7(view))).not.toMatch(/WAAAGH/i);
  });
});

describe("Revision 17 Kaboom! framing geometry", () => {
  it("pans the least distance into the band and never when already inside", () => {
    const camera = { offsetX: 0, offsetY: 0, zoom: 1 };
    const viewport = { width: 400, height: 800 };
    const band = { top: 60, bottom: 500 };
    // Already inside: no pan.
    expect(
      panToFrameArea(
        camera,
        { left: 100, top: 100, right: 200, bottom: 200 },
        viewport,
        band,
      ),
    ).toEqual({ x: 0, y: 0 });
    // Left of the view and under the dock: the least shift on each axis.
    expect(
      panToFrameArea(
        camera,
        { left: -50, top: 400, right: 100, bottom: 600 },
        viewport,
        band,
      ),
    ).toEqual({ x: 58, y: -108 });
    // Too tall for the band: its top edge aligns under the HUD.
    expect(
      panToFrameArea(
        camera,
        { left: 0, top: 0, right: 100, bottom: 900 },
        viewport,
        band,
      ).y,
    ).toBe(68);
  });
});

describe("Revision 17 explosion feedback", () => {
  it("plans one burst per wave in wave order, and the Bomb Chucker's bomb", () => {
    const state = goblinShowcaseFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const kaboom = boundary(state, {
      kind: "KABOOM",
      unitId: unitAt(view, AT.kaboom).id,
    });
    const steps = corePresentationPlanV7(
      kaboom.before,
      kaboom.events,
      kaboom.after,
    ).filter((step) => step.kind === "EXPLOSION");
    expect(
      steps.map((step) =>
        step.kind === "EXPLOSION"
          ? [
              step.wave,
              step.blasts.map((blast) => [blast.kind, blast.at, blast.hits]),
              step.followCamera,
            ]
          : null,
      ),
    ).toEqual([
      [
        1,
        [
          [
            "KABOOM",
            AT.kaboom,
            [AT.ownGoblin, AT.enemyFighter, AT.rocketCart, AT.enemyRaider],
          ],
        ],
        undefined,
      ],
      [2, [["DEATH", AT.rocketCart, [AT.enemyMarksman]]], undefined],
    ]);
    const bomb = boundary(state, {
      kind: "ATTACK",
      unitId: unitAt(view, AT.bombChucker).id,
      targetUnitId: unitAt(view, AT.bombTarget).id,
    });
    const bombSteps = corePresentationPlanV7(
      bomb.before,
      bomb.events,
      bomb.after,
    );
    expect(bombSteps[0]).toMatchObject({
      kind: "CATAPULT",
      projectile: "BOMB",
    });
    expect(bombSteps[1]).toMatchObject({
      kind: "EXPLOSION",
      blasts: [{ kind: "BOMB", at: AT.bombTarget, hits: [AT.bombHelper] }],
    });
  });

  it("draws the bang in the unowned blast palette, frozen under reduced motion", () => {
    const feedback = {
      wave: 1,
      progress: 0.1,
      blasts: [
        {
          at: { x: 2, y: 2 },
          kind: "KABOOM" as const,
          hits: [{ x: 1, y: 1 }],
        },
      ],
    };
    const camera = { offsetX: 0, offsetY: 0, zoom: 1 };
    const full = recordingContext();
    drawExplosionFeedbackV7(full.context, camera, feedback, false);
    const reduced = recordingContext();
    drawExplosionFeedbackV7(reduced.context, camera, feedback, true);
    const midpoint = recordingContext();
    drawExplosionFeedbackV7(
      midpoint.context,
      camera,
      { ...feedback, progress: 0.5 },
      false,
    );
    // Reduced motion draws exactly the midpoint frame.
    expect(reduced.log).toEqual(midpoint.log);
    expect(full.log).not.toEqual(midpoint.log);
    const palette = new Set<string>(Object.values(GOBLIN_BLAST_PALETTE_V7));
    for (const style of [...full.styles, ...midpoint.styles])
      expect(palette.has(style), style).toBe(true);
    // The 3 × 3 area outline at the midpoint spans three cells.
    expect(
      midpoint.log.some(
        (call) =>
          call[0] === "strokeRect" && call[3] === 384 && call[4] === 384,
      ),
    ).toBe(true);
    const bomb = recordingContext();
    drawBombProjectileV7(bomb.context, 10, 10, 1, 0.5);
    expect(bomb.log.some((call) => call[0] === "arc")).toBe(true);
  });
});

describe("Revision 17 Troll regeneration cue (pulp_wars-0ao.12)", () => {
  it("plans a heal cue with the regained HP on each visible Troll", () => {
    const state = goblinShowcaseFixtureV7();
    const human = state.humanPlayerId;
    const turn = endTurnUntilV7(state, human);
    const before = viewForV7(state, human);
    const after = viewForV7(turn.state, human);
    const envelope = projectEventsV7(state, turn.state, human, turn.events);
    const regenerated = envelope.events.find(
      (event) => event.kind === "UNITS_REGENERATED",
    );
    expect(regenerated).toBeDefined();
    const troll = unitAt(before, AT.troll);
    const steps = corePresentationPlanV7(before, envelope, after).filter(
      (step) => step.kind === "SUPPORT" && step.effect === "REGENERATE",
    );
    expect(steps).toEqual([
      {
        kind: "SUPPORT",
        effect: "REGENERATE",
        actor: { unitId: troll.id, at: AT.troll, amount: 4 },
        recipients: [],
        durationMs: 640,
      },
    ]);
    // A boundary without regeneration plays no heal cue.
    const kaboom = boundary(state, {
      kind: "KABOOM",
      unitId: unitAt(before, AT.kaboom).id,
    });
    expect(
      corePresentationPlanV7(kaboom.before, kaboom.events, kaboom.after).some(
        (step) => step.kind === "SUPPORT" && step.effect === "REGENERATE",
      ),
    ).toBe(false);
  });

  it("draws the heal ring and a rising +N, held still under reduced motion", () => {
    const feedback = {
      effect: "REGENERATE" as const,
      actor: { unitId: 7, at: { x: 2, y: 2 }, amount: 4 },
      recipients: [{ unitId: 9, at: { x: 4, y: 2 }, amount: 3 }],
      progress: 0.15,
    };
    const camera = { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(0.75) };
    const full = recordingContext();
    drawSupportFeedbackV7(full.context, camera, feedback, false);
    const reduced = recordingContext();
    drawSupportFeedbackV7(reduced.context, camera, feedback, true);
    const midpoint = recordingContext();
    drawSupportFeedbackV7(
      midpoint.context,
      camera,
      { ...feedback, progress: 0.5 },
      false,
    );
    const floats = (log: readonly (readonly unknown[])[]) =>
      log.filter((call) => call[0] === "fillText");
    // One "+N" per regenerated Troll, outlined for contrast, over a ring.
    expect(floats(full.log).map((call) => call[1])).toEqual(["+4", "+3"]);
    expect(
      full.log
        .filter((call) => call[0] === "strokeText")
        .map((call) => call[1]),
    ).toEqual(["+4", "+3"]);
    expect(full.log.filter((call) => call[0] === "arc")).toHaveLength(2);
    expect(full.styles).toContain(REGENERATION_TEXT_COLOR_V7);
    // The float rises from the Troll's head as the cue plays.
    const [early] = floats(full.log);
    const [middle] = floats(midpoint.log);
    expect(Number(early?.[3])).toBeGreaterThan(Number(middle?.[3]));
    // Reduced motion draws exactly the midpoint frame, with no travel.
    expect(reduced.log).toEqual(midpoint.log);
    expect(full.log).not.toEqual(midpoint.log);
  });
});

function showcaseView(): PlayerViewV7 {
  const state = goblinShowcaseFixtureV7();
  return viewForV7(state, state.humanPlayerId);
}

function boundary(
  state: GameStateV7,
  command: CommandV7,
): {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly events: ReturnType<typeof projectEventsV7>;
} {
  const actor = seatIdV7(state, 0);
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewForV7(state, actor),
    after: viewForV7(result.state, actor),
    events: projectEventsV7(state, result.state, actor, result.events),
  };
}

function unitAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["units"][number] {
  const unit = view.units.find((candidate) => same(candidate.at, at));
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required Goblin presentation value missing");
  return value;
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: (readonly unknown[])[];
  readonly styles: string[];
} {
  const log: (readonly unknown[])[] = [];
  const styles: string[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 7 })
            : key in target
              ? Reflect.get(target, key)
              : (...args: unknown[]) => {
                  log.push([String(key), ...args]);
                },
      set: (target, key, value) => {
        if (
          (key === "fillStyle" || key === "strokeStyle") &&
          typeof value === "string"
        )
          styles.push(value);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log, styles };
}
