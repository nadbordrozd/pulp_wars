import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BOARD_SUMMONED_ROLE_IDS_V7,
  FACTION_IDS_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  factionRulesV7,
  isNavalRoleV7,
  roleMechanicsV7,
  type FactionIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  galleryUnitCellV7,
  galleryUnitDetailsV7,
  GALLERY_UNIT_ROWS_V7,
} from "../../src/render/gallery-presentation-v7";
import { roleAbilityNameV7 } from "../../src/render/role-presentation-v7";
import {
  ABILITIES_WITHOUT_ENTRY_V7,
  GLOSSARY_IDS_V7,
  GLOSSARY_TERM_IDS_V7,
  GLOSSARY_TEXT_LIMIT_V7,
  SPIDER_GLOSSARY_IDS_V7,
  UNIT_GLOSSARY_V7,
  UNIT_STATUS_IDS_V7,
  abilityGlossaryIdV7,
  glossaryEntryV7,
  presentedModifierV7,
  roleGlossaryV7,
  roleTraitGlossaryIdsV7,
  statGlossaryIdV7,
  statusGlossaryV7,
  summonedGlossaryV7,
  unitStatusLineChipV7,
  type GlossaryIdV7,
} from "../../src/render/unit-glossary-v7";

/**
 * The unit glossary (bead pulp_wars-2yc.39): every ability, trait and
 * status a registered unit can have is explained, in one or two short
 * plain sentences with no formula.
 */
const roles = (): readonly (readonly [UnitRoleIdV7, FactionIdV7])[] =>
  FACTION_IDS_V7.flatMap((faction) =>
    UNIT_ROLE_IDS_V7.map((role) => [role, faction] as const),
  );

/** Text that reads like a rule table instead of a sentence. */
const FORMULA =
  /[×*=%<>]|\+\s*\d|[-−]\s*\d|\d\s*\/\s*\d|\bper\b|\bHP\b|\d+\s*(?:x|X)\s*\d+|\(.*\d.*\)/;

describe("Ruleset 7 unit glossary", () => {
  it("gives every entry a name and a short plain text", () => {
    expect(UNIT_GLOSSARY_V7.length).toBeGreaterThan(100);
    for (const entry of UNIT_GLOSSARY_V7) {
      expect(entry.name.length, entry.id).toBeGreaterThan(0);
      expect(entry.name.length, entry.id).toBeLessThanOrEqual(24);
      expect(entry.text.length, entry.id).toBeGreaterThan(0);
      expect(entry.text.length, entry.id).toBeLessThanOrEqual(
        GLOSSARY_TEXT_LIMIT_V7,
      );
      expect(entry.text, entry.id).toMatch(/[.!]$/);
      // One or two sentences.
      expect(
        entry.text.split(/[.!?](?:\s|$)/).filter((part) => part !== "").length,
        entry.id,
      ).toBeLessThanOrEqual(2);
    }
  });

  it("uses no formula and at most one number per entry", () => {
    for (const entry of UNIT_GLOSSARY_V7) {
      expect(entry.text, entry.id).not.toMatch(FORMULA);
      expect(
        (entry.text.match(/\d+/g) ?? []).length,
        entry.id,
      ).toBeLessThanOrEqual(1);
      // A number, where there is one, is small: a range or a count.
      for (const number of entry.text.match(/\d+/g) ?? [])
        expect(Number(number), entry.id).toBeLessThanOrEqual(3);
      // No tile coordinates.
      expect(entry.text, entry.id).not.toMatch(/\(\s*\d+\s*,\s*\d+\s*\)/);
    }
  });

  it("explains every ability of every unit in the registry", () => {
    const withoutEntry = new Set<string>(ABILITIES_WITHOUT_ENTRY_V7);
    for (const [role, faction] of roles()) {
      const rule = effectiveRoleRuleV7(role, faction);
      for (const ability of rule.abilities) {
        const id = abilityGlossaryIdV7(ability, role, faction);
        if (withoutEntry.has(ability)) {
          expect(id, `${faction} ${role} ${ability}`).toBeNull();
          continue;
        }
        expect(id, `${faction} ${role} ${ability}`).not.toBeNull();
        if (id === null) continue;
        // The entry carries the name the game already gives the ability.
        expect(glossaryEntryV7(id).name, `${faction} ${role} ${ability}`).toBe(
          roleAbilityNameV7(ability, faction),
        );
        expect(
          roleGlossaryV7(role, faction).map((entry) => entry.id),
          `${faction} ${role}`,
        ).toContain(id);
      }
    }
  });

  it("explains every trait the role mechanics give a unit", () => {
    // Each mechanic a player can meet, and the entry that must explain it.
    const expectations: readonly (readonly [
      string,
      (role: UnitRoleIdV7, faction: FactionIdV7) => boolean,
      GlossaryIdV7,
    ])[] = [
      ["a ship", (role) => isNavalRoleV7(role), "SHIP"],
      [
        "ignores zones of control",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).ignoresZocStops,
        "SLIPS_PAST",
      ],
      [
        "splash on enemies",
        (role, faction) => {
          const mechanics = roleMechanicsV7(role, faction);
          return mechanics.splash && mechanics.splashTargets === "HOSTILE";
        },
        "SPLASH",
      ],
      [
        "a bomb that hits everybody",
        (role, faction) => {
          const mechanics = roleMechanicsV7(role, faction);
          return (
            !isNavalRoleV7(role) &&
            mechanics.splash &&
            mechanics.splashTargets === "ALL"
          );
        },
        "BOMBS",
      ],
      [
        "restless",
        (role, faction) =>
          !isNavalRoleV7(role) && factionRulesV7(faction).restless,
        "RESTLESS",
      ],
      [
        "a death blast",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).deathBlastDamage !== null,
        "EXPLODES",
      ],
      [
        "blast-proof",
        (role, faction) =>
          !isNavalRoleV7(role) && roleMechanicsV7(role, faction).blastProof,
        "BLAST_PROOF",
      ],
      [
        "Kaboom after attacking",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).kaboomAfterAttack,
        "CRASH",
      ],
      [
        "heavyweight",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).gangUpWeight > 1,
        "HEAVYWEIGHT",
      ],
      [
        "carrion",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).carrionBonus2 > 0,
        "CARRION",
      ],
      [
        "rise again",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).riseAgainHp !== null,
        "RISE_AGAIN",
      ],
      [
        "pack hunt",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).packHuntBonus2 > 0,
        "PACK_HUNT",
      ],
      [
        "egg-laid",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).hatchTurns !== null,
        "EGG_LAID",
      ],
      [
        "two slots",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).capacitySlots > 1,
        "BIG_BODY",
      ],
      [
        "cracks armour",
        (role, faction) =>
          !isNavalRoleV7(role) && roleMechanicsV7(role, faction).cracksArmour,
        "THAGOMIZER",
      ],
      [
        "a Shield",
        (role, faction) =>
          !isNavalRoleV7(role) && roleMechanicsV7(role, faction).shield > 0,
        "SHIELD",
      ],
      [
        "a shock field",
        (role, faction) =>
          !isNavalRoleV7(role) &&
          roleMechanicsV7(role, faction).shockFieldDamage > 0,
        "SHOCK_FIELD",
      ],
      [
        "glides",
        (role, faction) =>
          !isNavalRoleV7(role) && roleMechanicsV7(role, faction).glides,
        "GLIDE",
      ],
      [
        "frostbite",
        (role, faction) =>
          !isNavalRoleV7(role) && roleMechanicsV7(role, faction).frostbite,
        "FROSTBITE",
      ],
      [
        "leaves Crumbs",
        (role, faction) =>
          !isNavalRoleV7(role) && roleMechanicsV7(role, faction).leavesCrumbs,
        "CRUMBS",
      ],
      [
        "immovable",
        (role, faction) =>
          !isNavalRoleV7(role) && roleMechanicsV7(role, faction).immovable,
        "ROCK_HARD",
      ],
      [
        "cannot attack after moving",
        (role, faction) => {
          const rule = effectiveRoleRuleV7(role, faction);
          return (
            rule.abilities.includes("ATTACK") &&
            !rule.mayUsePrimaryActionAfterMove
          );
        },
        "SLOW_TO_STRIKE",
      ],
      [
        "shoots over a distance only",
        (role, faction) => {
          const rule = effectiveRoleRuleV7(role, faction);
          return rule.abilities.includes("ATTACK") && rule.minimumRange > 1;
        },
        "LONG_SHOT",
      ],
      [
        "ranged",
        (role, faction) => {
          const rule = effectiveRoleRuleV7(role, faction);
          return (
            rule.abilities.includes("ATTACK") &&
            rule.minimumRange <= 1 &&
            rule.range > 1
          );
        },
        "RANGED",
      ],
    ];
    const met = new Set<string>();
    for (const [role, faction] of roles()) {
      const traits = roleTraitGlossaryIdsV7(role, faction);
      for (const [name, has, id] of expectations) {
        if (!has(role, faction)) continue;
        met.add(name);
        expect(traits, `${faction} ${role}: ${name}`).toContain(id);
      }
    }
    // Every expectation is about a unit that exists.
    expect([...met].sort()).toEqual(expectations.map(([name]) => name).sort());
  });

  it("lists a role's lines once each, abilities before traits", () => {
    for (const [role, faction] of roles()) {
      const ids = roleGlossaryV7(role, faction).map((entry) => entry.id);
      expect(new Set(ids).size, `${faction} ${role}`).toBe(ids.length);
    }
    expect(
      roleGlossaryV7("CAPTAIN", "ORIGINAL").map((entry) => entry.id),
    ).toEqual(["RALLY", "TEND"]);
    expect(
      roleGlossaryV7("MARKSMAN", "GOBLIN").map((entry) => entry.id),
    ).toEqual(["KABOOM", "LONG_SHOT", "BOMBS", "EXPLODES"]);
    expect(
      roleGlossaryV7("CAPTAIN", "UNDEAD").map((entry) => entry.name),
    ).toEqual(["Rally", "Raise Dead", "Restless"]);
    expect(
      roleGlossaryV7("GUARD", "MARTIAN").map((entry) => entry.name),
    ).toEqual(["Force Field", "Slow to strike", "Shield", "Hover Pods"]);
    expect(
      roleGlossaryV7("KNIGHT", "DWARF").map((entry) => entry.name),
    ).toEqual(["Clockwork", "Whirl"]);
    // A Mothership's Tractor Beam is the free heavy one.
    expect(
      roleGlossaryV7("KNIGHT", "MARTIAN").map((entry) => entry.id),
    ).toContain("TRACTOR_BEAM_HEAVY");
    expect(
      roleGlossaryV7("RAIDER", "MARTIAN").map((entry) => entry.id),
    ).toContain("TRACTOR_BEAM");
  });

  it("lists no line for what every land unit can do (pulp_wars-2yc.63)", () => {
    // Every land unit captures (`pulp_wars-ke95`) and attacks with its
    // Attack stat, so neither is a line of any unit, summoned ones too.
    expect(ABILITIES_WITHOUT_ENTRY_V7).toEqual(["ATTACK", "CAPTURE"]);
    expect(GLOSSARY_IDS_V7).not.toContain("CAPTURE");
    for (const [role, faction] of roles()) {
      const lines = roleGlossaryV7(role, faction);
      const names = lines.map((entry) => entry.name);
      expect(names, `${faction} ${role}`).not.toContain("Capture");
      expect(names, `${faction} ${role}`).not.toContain("Can't capture");
      // (An Initiate's Pamphlets capture sooner than anyone: that is what
      // sets it apart, so it keeps its line.)
      expect(
        lines.some(
          (entry) => entry.id !== "PAMPHLETS" && /\bcaptur/i.test(entry.text),
        ),
        `${faction} ${role}`,
      ).toBe(false);
    }
    for (const summoned of BOARD_SUMMONED_ROLE_IDS_V7)
      expect(
        summonedGlossaryV7(summoned).map((entry) => entry.name),
        summoned,
      ).not.toContain("Capture");
    // Nothing says a flyer stays off villages any more.
    expect(glossaryEntryV7("FLY").text).not.toMatch(/village|city|captur/i);
  });

  it("names one mechanic once, whatever the faction (pulp_wars-2yc.63)", () => {
    // No two entries of the abilities and traits share a sentence: the
    // same mechanic has one entry (statuses and terms aside, which say
    // what a chip means now).
    const abilityEntries = UNIT_GLOSSARY_V7.filter(
      (entry) =>
        !entry.id.startsWith("STATUS_") && !entry.id.startsWith("TERM_"),
    );
    const byText = new Map<string, string>();
    for (const entry of abilityEntries) {
      expect(byText.get(entry.text), entry.id).toBeUndefined();
      byText.set(entry.text, entry.id);
    }
    // The merged names: one entry for each mechanic in every faction.
    const idOf = (
      role: UnitRoleIdV7,
      faction: FactionIdV7,
      ability: Parameters<typeof abilityGlossaryIdV7>[0],
    ) => abilityGlossaryIdV7(ability, role, faction);
    for (const faction of FACTION_IDS_V7) {
      const raider = effectiveRoleRuleV7("RAIDER", faction);
      if (raider.abilities.includes("CHARGE"))
        expect(idOf("RAIDER", faction, "CHARGE"), faction).toBe("CHARGE");
      const knight = effectiveRoleRuleV7("KNIGHT", faction);
      if (knight.abilities.includes("OVERRUN"))
        expect(idOf("KNIGHT", faction, "OVERRUN"), faction).toBe("OVERRUN");
    }
    for (const faction of ["ORIGINAL", "UNDEAD", "DINOSAUR"] as const)
      expect(idOf("CAPTAIN", faction, "RALLY"), faction).toBe("RALLY");
    // Similar but not the same: a Brain's Rally cools, a Warboss's moves.
    expect(idOf("CAPTAIN", "MARTIAN", "RALLY")).toBe("PSYCHIC_COMMAND");
    expect(idOf("CAPTAIN", "GOBLIN", "RALLY")).toBe("BERSERK");
    expect(idOf("MARKSMAN", "UNDEAD", "ETHEREAL")).toBe("SLIPS_PAST");
    expect(idOf("KNIGHT", "ICE_FOLK", "PROWL")).toBe("SLIPS_PAST");
    expect(idOf("SWORDSMAN", "ICE_FOLK", "TRAMPLE")).toBe("WRECKER");
    expect(idOf("RAIDER", "ICE_FOLK", "BOLAS")).toBe("FROST_BOLT");
    expect(idOf("CAPTAIN", "ICE_FOLK", "FROST_BOLT")).toBe("FROST_BOLT");
    // The old names are gone from every unit's lines.
    const retired = [
      "Pounce",
      "Strafe",
      "Frenzy",
      "War Drums",
      "Ram",
      "Rampage",
      "Ethereal",
      "Prowl",
      "Trample",
      "Bolas",
      "Charge!",
      "Capture",
    ];
    for (const [role, faction] of roles())
      for (const entry of roleGlossaryV7(role, faction))
        expect(retired, `${faction} ${role}`).not.toContain(entry.name);
    // One name never stands for two different mechanics of the abilities:
    // the Triceratops's run-up is Gore, so Charge is the Raider bonus only.
    expect(glossaryEntryV7("CHARGE_BANG").name).toBe("Gore");
    const names = new Map<string, string>();
    for (const entry of abilityEntries) {
      const other = names.get(entry.name);
      // Tend is one name for three healers that differ only in whom they
      // heal most; a Tractor Beam is light or heavy.
      if (other !== undefined)
        expect(
          [
            ["TEND", "TEND_DINOSAUR"],
            ["TRACTOR_BEAM", "TRACTOR_BEAM_HEAVY"],
            // The Troll heals at its turn's start, the Spider after rounds.
            ["REGENERATE", "SPIDER_REGENERATES"],
          ].some(([a, b]) => other === a && entry.id === b),
          `${other} and ${entry.id} are both "${entry.name}"`,
        ).toBe(true);
      names.set(entry.name, entry.id);
    }
  });

  it("explains the terms of a unit card and the Giant Spider", () => {
    for (const stat of ["HP", "Attack", "Defense", "Move", "Range", "Sight"])
      expect(statGlossaryIdV7(stat), stat).not.toBeNull();
    expect(statGlossaryIdV7("Shield")).toBe("SHIELD");
    expect(statGlossaryIdV7("Coins")).toBeNull();
    const terms = GLOSSARY_TERM_IDS_V7.map(
      (id) => glossaryEntryV7(id).name,
    ).join(" ");
    for (const word of [
      "Attack",
      "Defense",
      "Movement",
      "Range",
      "Sight",
      "Cover",
      "Fortified",
      "Veteran",
    ])
      expect(terms).toContain(word);
    expect(
      SPIDER_GLOSSARY_IDS_V7.map((id) => glossaryEntryV7(id).name),
    ).toEqual(["Neutral", "Regenerate", "Bounty"]);
  });

  it("explains every status chip the unit dock can show", () => {
    // Every literal status of the dock, read from its source.
    const source = readFileSync("src/render/dom/app-view-v7.ts", "utf8");
    const literal = [
      ...source.matchAll(/dataset\.unitStatus = "([a-z-]+)"/g),
    ].map((match) => match[1] ?? "");
    expect(literal.length).toBeGreaterThanOrEqual(8);
    const known = new Set(UNIT_STATUS_IDS_V7);
    for (const status of literal) expect(known.has(status), status).toBe(true);
    // The statuses the dock's chip helpers are called with: each is in the
    // source as written here, and each has its entry.
    for (const status of [
      "shield",
      "cooling",
      "ray-power",
      "controlled",
      "mind-control-cooldown",
      "slots",
      "submerged",
      "boardable",
      "icebound",
      "ice-crush",
      "frozen",
      "planted",
      "bombed",
      "dug-in",
      "not-dug-in",
      "clockwork",
      "shots",
      "plated",
      "surfaced",
    ]) {
      expect(source, status).toContain(`"${status}"`);
      expect(known.has(status), status).toBe(true);
    }
    // The chips whose IDs come from data: afflictions, Candy, the Martian
    // per-turn chips, Frozen, and the engine's status lines.
    for (const status of [
      "plague",
      "bitten",
      "rushed",
      "home-sweet-home",
      "crashed",
      "splatted",
      // The Candy redesign (`pulp_wars-jdb.14`).
      "stuck",
      "toothache",
      "beamed",
      "tractor-used",
      "frozen",
      "inspired",
      // `pulp_wars-w49.36`: the Orc Warboss's Berserk (WAAAGH! before).
      "berserk",
      "gore",
      "tended",
      "overrun",
      // The Candy redesign (`pulp_wars-jdb.12`) removed Sugar Frenzy.
      "escape",
      "bat-escape",
      "feast",
      "terror",
      "cracked",
      "risen",
    ])
      expect(statusGlossaryV7(status), status).not.toBeNull();
    expect(statusGlossaryV7("no-such-status")).toBeNull();
    // Bead pulp_wars-2yc.63: the tile's facts are no chip of a unit.
    for (const status of [
      "grave",
      "snow",
      "blizzard",
      "on-ice",
      "ice-cover",
      "rockfall",
    ]) {
      expect(statusGlossaryV7(status), status).toBeNull();
      expect(source, status).not.toContain(`unitStatus = "${status}"`);
    }
    expect(statusGlossaryV7("frozen")?.name).toBe("Frozen");
    // Ice Folk Freeze (`pulp_wars-w49.38`): the Chill states are gone.
    for (const status of [
      "chill",
      "chill-frozen",
      "chill-frosted",
      "chill-thawing",
    ])
      expect(statusGlossaryV7(status), status).toBeNull();
    expect(statusGlossaryV7("shield")?.id).toBe("SHIELD");
  });

  it("names each engine status line by its mechanic (pulp_wars-2yc.63)", () => {
    const chip = (line: string) => unitStatusLineChipV7(line);
    for (const line of [
      "Inspired: +1 next Attack",
      "Frenzied: +1 next Attack",
      "War Drums: +1 Attack on the next attack",
      "Psychic Command: +1 Attack on the next attack",
    ])
      expect(chip(line), line).toEqual({ label: "Inspired", id: "inspired" });
    for (const line of [
      "Overrun: attack again",
      "Ram: attack again",
      "Rampage: attack again",
    ])
      expect(chip(line), line).toEqual({ label: "Overrun", id: "overrun" });
    expect(chip("Charge! +2 Attack")).toEqual({
      label: "Gore +2 Attack",
      id: "gore",
    });
    expect(chip("Tended this turn")).toEqual({ label: "Tended", id: "tended" });
    expect(chip("Escape: may fly up to 2 tiles")).toEqual({
      label: "Bat Escape",
      id: "bat-escape",
    });
    expect(chip("Escape: may move again")).toEqual({
      label: "Escape",
      id: "escape",
    });
    for (const line of [
      "Inspired: +1 next Attack",
      "Ram: attack again",
      "Charge! +1 Attack",
      "Escape: may fly up to 2 tiles",
    ])
      expect(statusGlossaryV7(chip(line).id), line).not.toBeNull();
    // The stat terms: Pounce and Strafe are Charge, Frenzied and War Drums
    // are Inspired by a Rally, Charge! is Gore.
    const term = (source: string, sourceLabel: string, description: string) =>
      presentedModifierV7({ source, sourceLabel, description });
    expect(
      term("CHARGE", "Pounce", "Pounce adds 1 Attack after a move."),
    ).toEqual({
      sourceLabel: "Charge",
      description: "Charge adds 1 Attack after a move.",
    });
    expect(
      term(
        "INSPIRED",
        "Frenzied",
        "Necromancer Frenzy adds 1 Attack to the next attack this turn.",
      ),
    ).toEqual({
      sourceLabel: "Inspired",
      description:
        "Necromancer Rally adds 1 Attack to the next attack this turn.",
    });
    expect(term("RUN_UP", "Charge!", "Charge! adds 1 Attack.")).toEqual({
      sourceLabel: "Gore",
      description: "Gore adds 1 Attack.",
    });
    expect(term("PROMOTION", "Promotion", "Adds HP.")).toEqual({
      sourceLabel: "Promotion",
      description: "Adds HP.",
    });
  });

  it("is what the Gallery's unit detail shows", () => {
    for (const faction of FACTION_IDS_V7)
      for (const row of GALLERY_UNIT_ROWS_V7) {
        const cell = galleryUnitCellV7(row, faction);
        if (cell.kind !== "UNIT") continue;
        const details = galleryUnitDetailsV7(cell);
        expect(details.notes, `${faction} ${row}`).toEqual([]);
        if (cell.role === null) {
          expect(details.abilities.map((ability) => ability.id)).toEqual([
            row === "EGG" ? "EGG" : "AT_SEA",
          ]);
          continue;
        }
        expect(details.abilities, `${faction} ${row}`).toEqual(
          roleGlossaryV7(cell.role, faction).map((entry) => ({
            id: entry.id,
            name: entry.name,
            description: entry.text,
          })),
        );
      }
  });
});
