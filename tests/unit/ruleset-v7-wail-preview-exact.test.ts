import { describe, expect, it } from "vitest";
import {
  isSnowV7,
  previewWailV7,
  publicUnitIsDugInV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { HIDDEN_BLIZZARD_PREVIEW_V7 } from "../../src/render/ice-folk-presentation-v7";
import {
  wailPreviewDescriptionV7,
  wailTargetLabelV7,
} from "../../src/render/undead-presentation-v7";
import { dwarfFieldV7 } from "../fixtures/v7-dwarf";
import { applyOkV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7 } from "../fixtures/v7-ice-folk";
import { activeIdV7, at, unexploreV7 } from "../fixtures/v7-revision20";

// `pulp_wars-7g3.9`: the public Wail preview computes each target with the
// reducer's own `wailTargetV7`, fed with what the viewer knows (Snow cover
// of an Ice Folk target, Dig In of a Dwarf target), so every offered Wail
// previews its resolution exactly; only a hidden Ice Witch's Blizzard can
// differ, and it is flagged (`hiddenBlizzardPossible`), as in the combat
// preview (docs/product/RULESET_7_CURRENT.md sections 17.9 and 21).

/** The offered Wail's preview and its resolution, by target position. */
function offeredAndActual(state: GameStateV7, bansheeAt: CoordV7) {
  const actor = activeIdV7(state);
  const banshee = unitAtV7(state, bansheeAt);
  const view = viewForV7(state, actor);
  expect(queryPlayerCommandsV7(view)).toContainEqual({
    kind: "WAIL",
    unitId: banshee.id,
  });
  const preview = previewWailV7(view, banshee.id);
  if (preview === null) throw new Error("no Wail preview");
  const result = applyOkV7(state, actor, { kind: "WAIL", unitId: banshee.id });
  const wail = result.events[0];
  if (wail?.kind !== "WAIL_RESOLVED") throw new Error("WAIL_RESOLVED");
  const key = (where: CoordV7) => `${where.x},${where.y}`;
  return {
    view,
    preview,
    offered: Object.fromEntries(
      preview.targets.map((target) => [
        key(target.at),
        {
          damage: target.damage,
          dies: target.dies,
          shieldDamage: target.shieldDamage,
          flagged: target.hiddenBlizzardPossible,
        },
      ]),
    ),
    actual: Object.fromEntries(
      wail.results.map((entry) => [
        key(entry.at),
        {
          damage: entry.damage,
          dies: entry.dies,
          shieldDamage: entry.shieldDamage,
          flagged: false,
        },
      ]),
    ),
  };
}

describe("the public Wail preview equals the Wail (pulp_wars-7g3.9)", () => {
  it("counts an Ice Folk target's Snow cover: 1 on a Yeti on Snow, 2 in the open", () => {
    // Undead seat 1's Banshee; Ice Folk seat 0's Yetis on its territory
    // Snow (7, 7) and on open Grass (6, 5).
    const state = iceFieldV7(
      [
        { seat: 1, role: "MARKSMAN", at: at(6, 6) },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "FIGHTER", at: at(6, 5) },
      ],
      { factions: ["ICE_FOLK", "UNDEAD"], activeSeat: 1, techs: { 0: [] } },
    );
    expect(isSnowV7(state, at(7, 7))).toBe(true);
    expect(isSnowV7(state, at(6, 5))).toBe(false);
    const { offered, actual } = offeredAndActual(state, at(6, 6));
    expect(offered).toEqual(actual);
    expect(offered["7,7"]?.damage).toBe(1);
    expect(offered["6,5"]?.damage).toBe(2);
  });

  it("counts a Dwarf target's Dig In: 1 on a dug-in Hammerer, 2 in the open", () => {
    // Dwarf seat 0's Hammerers: one beside its capital (8, 8), dug in, one
    // away from every Dwarf city.
    const state = dwarfFieldV7(
      [
        { seat: 1, role: "MARKSMAN", at: at(6, 6) },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "FIGHTER", at: at(5, 6) },
      ],
      { factions: ["DWARF", "UNDEAD"], activeSeat: 1 },
    );
    const { view, offered, actual, preview } = offeredAndActual(
      state,
      at(6, 6),
    );
    expect(publicUnitIsDugInV7(view, unitAtV7(state, at(7, 7)).id)).toBe(true);
    expect(publicUnitIsDugInV7(view, unitAtV7(state, at(5, 6)).id)).toBe(false);
    expect(offered).toEqual(actual);
    expect(offered["7,7"]?.damage).toBe(1);
    expect(offered["5,6"]?.damage).toBe(2);
    expect(
      preview.targets.find((target) => target.at.x === 7)?.fortificationLevel,
    ).toBe(1);
  });

  it("is exact for an ordinary target", () => {
    const state = iceFieldV7(
      [
        { seat: 1, role: "MARKSMAN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "GUARD", at: at(6, 2), hp: 1 },
      ],
      { factions: ["ORIGINAL", "UNDEAD"], activeSeat: 1, techs: { 0: [] } },
    );
    const { offered, actual } = offeredAndActual(state, at(5, 3));
    expect(offered).toEqual(actual);
    expect(Object.keys(offered).sort()).toEqual(["4,4", "6,2"]);
    expect(offered["6,2"]?.dies).toBe(true);
  });

  it("flags a target a hidden Witch's Blizzard may cover, and only that one", () => {
    // Ice Folk seat 0's Witch on (5, 2) makes (4..6, 1..3) Snow; seat 1
    // has not explored her tile, so its view shows no Snow there. Seat 1
    // has not explored (8, 6) either, beside the Yeti on territory Snow.
    const visible = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 1, role: "MARKSMAN", at: at(6, 5) },
      ],
      { factions: ["ICE_FOLK", "UNDEAD"], activeSeat: 1, techs: { 0: [] } },
    );
    const hidden = unexploreV7(visible, 1, [at(5, 2), at(8, 6)]);
    expect(isSnowV7(hidden, at(6, 3))).toBe(true);

    // With the Witch in sight, the Snow is known: exact, no flag.
    const seen = offeredAndActual(visible, at(6, 5));
    expect(seen.offered).toEqual(seen.actual);

    const { view, preview, offered, actual } = offeredAndActual(
      hidden,
      at(6, 5),
    );
    // The Yeti at (6, 3) beside the hidden Witch: the preview reads open
    // ground (2) and is flagged; the Wail deals 1 (Snow cover).
    expect(offered["6,3"]).toEqual({
      ...actual["6,3"],
      damage: 2,
      flagged: true,
    });
    expect(actual["6,3"]?.damage).toBe(1);
    // A Yeti with every neighbour explored is exact and unflagged, and so
    // is one on known Snow beside an unexplored tile (a Blizzard cannot
    // change its cover).
    expect(offered["4,4"]).toEqual(actual["4,4"]);
    expect(offered["7,7"]).toEqual(actual["7,7"]);
    // The UI shows the combat preview's caveat for it.
    const flagged = preview.targets.find((target) => target.at.x === 6);
    if (flagged === undefined) throw new Error("no flagged target");
    expect(wailTargetLabelV7(flagged)).toBe("−2?");
    expect(wailPreviewDescriptionV7(view, preview)).toContain(
      HIDDEN_BLIZZARD_PREVIEW_V7,
    );
    const exact = previewWailV7(
      viewForV7(visible, activeIdV7(visible)),
      unitAtV7(visible, at(6, 5)).id,
    );
    if (exact === null) throw new Error("no Wail preview");
    expect(
      wailPreviewDescriptionV7(viewForV7(visible, activeIdV7(visible)), exact),
    ).not.toContain(HIDDEN_BLIZZARD_PREVIEW_V7);
  });
});
