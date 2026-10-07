import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BROWSER_RELEASE_SOURCE_PATHS_V7 } from "../../scripts/ruleset7-browser-release-fingerprint";
import {
  browserTimingModeV7,
  collectBrowserTimingV7,
  enforceBrowserTimingV7,
  validateColdPolicy,
  validatePreview,
  type ColdPolicyEvidenceV7,
  type PreviewEvidenceV7,
} from "../../scripts/browser-smoke-v7-contract";
import {
  RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX,
  RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH,
} from "../../scripts/ruleset-v7-late-public-view-contract";

describe("Ruleset 7 browser smoke script", () => {
  it("drives naval autoembark through a Port MOVE and keeps landing coverage", () => {
    const source = readFileSync("scripts/browser-naval-smoke-v7.ts", "utf8");

    expect(source).not.toContain(
      "const embark = document.querySelector('[data-action=\"command-embark\"]')",
    );
    expect(source).toContain("obsolete standalone Embark action present");
    expect(source).toContain("Port autoembark MOVE missing");
    expect(source).toContain(
      "boardHost.activate(${JSON.stringify(installed.portAt)})",
    );
    expect(source).toContain("trace?.command?.kind !== 'MOVE'");
    expect(source).toContain("trace.eventKinds.includes('UNIT_EMBARKED')");
    expect(source).toContain("landing?.command?.kind !== 'DISEMBARK'");
    expect(source).toContain("landing.eventKinds.includes('UNIT_DISEMBARKED')");
  });

  it("picks a Board on the board, rams, and shows a submerged Submarine", () => {
    // The naval branch interface (bead pulp_wars-5ti.7).
    const source = readFileSync("scripts/browser-naval-smoke-v7.ts", "utf8");
    expect(source).toContain("await captureNavalBranchEvidence(");
    expect(source).toContain("/tests/fixtures/v7-naval-ui.ts");
    expect(source).toContain("Board must have exactly one dock button");
    expect(source).toContain("Board must not be a per-target dock command");
    expect(source).toContain(
      "document.querySelector('[data-v7-naval-pick].v7-board-pick')?.dataset.boardTargets === '2'",
    );
    expect(source).toContain(
      "trace?.command?.kind !== 'BOARD' || !trace.eventKinds.includes('SHIP_BOARDED')",
    );
    expect(source).toContain(
      "trace?.command?.kind !== 'ATTACK' || !trace.eventKinds.includes('UNIT_PUSHED')",
    );
    expect(source).toContain('[data-unit-status="submerged"]');
    // The board pick comes before the Board is accepted.
    expect(source.indexOf("naval-board-pick.png")).toBeLessThan(
      source.indexOf("board pick did not accept BOARD with SHIP_BOARDED"),
    );
  });

  it("plays the frozen sea in the CHIBI look: Freeze, the slide, an icebound ship", () => {
    // The frozen sea (bead pulp_wars-5ti.7, second part).
    const source = readFileSync("scripts/browser-naval-smoke-v7.ts", "utf8");
    expect(source).toContain("await captureFrozenSeaEvidence(");
    expect(source).toContain("/tests/fixtures/v7-frozen-sea-ui.ts");
    // The fixture app is mounted again with the CHIBI art set, and the
    // naval art's ability icons are checked as loaded images.
    expect(source).toContain("artSet: 'CHIBI'");
    expect(source).toContain(
      `document.querySelector('.v7-unit-ability[data-ability="\${ability}"] img')`,
    );
    expect(source).toContain("icon.complete && icon.naturalWidth > 0");
    expect(source).toContain("Freeze must have exactly one dock button");
    expect(source).toContain("Freeze must not be a per-tile dock command");
    expect(source).toContain(
      "document.querySelector('[data-v7-freeze-pick].v7-board-pick')?.dataset.boardTargets === '3'",
    );
    expect(source).toContain(
      "trace?.command?.kind !== 'FREEZE' || !trace.eventKinds.includes('WATER_FROZEN')",
    );
    expect(source).toContain("the Sled did not reach the far shore");
    expect(source).toContain('[data-unit-status="ice-crush"]');
    expect(source).toContain("Ice Folk technology name: ");
    // The aiming is captured before the Freeze is accepted, and the slide
    // after it.
    expect(source.indexOf("frozen-freeze-aim.png")).toBeLessThan(
      source.indexOf("the board pick did not accept FREEZE with WATER_FROZEN"),
    );
    expect(source.indexOf("frozen-witch-ring.png")).toBeLessThan(
      source.indexOf("frozen-slide.png"),
    );
  });

  it("arms transient controls before trusted pointer launch and waits for the native select to close", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    // Default match, its natural outcome, and the default-route Undead and
    // Goblin matches.
    expect(
      source.match(/await launchWithFastForward\(connection\)/g),
    ).toHaveLength(4);
    expect(source).toContain(
      'await typeSelectValue(connection, "#v7-ai-count", "2")',
    );
    expect(source).toContain(
      'await typeSelectValue(connection, "#v7-ai-count", "1")',
    );
    expect(source).toContain(
      'await typeSelectValue(connection, "#v7-board-size", "11")',
    );
    expect(source).toContain("!select.matches(':open')");
    // The Fast Forward launch helper arms the control before its click. (The
    // Showcase probe launches on the human's own turn without the helper.)
    const helper = source.slice(
      source.indexOf("async function launchWithFastForward("),
      source.indexOf("async function touchClick("),
    );
    const armed = helper.indexOf(
      "await evaluate(connection, armFastForwardExpression())",
    );
    expect(armed).toBeGreaterThan(-1);
    expect(armed).toBeLessThan(
      helper.indexOf(
        "await pointerClick(connection, '[data-action=\"launch\"]')",
      ),
    );
    expect(source).toContain('"Input.dispatchMouseEvent"');
    expect(BROWSER_RELEASE_SOURCE_PATHS_V7).toContain(
      "scripts/browser-smoke-v7-controls.ts",
    );
  });
  it("chooses Use seed before every fixed seed and checks the New map default", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const replaceSeed = source.slice(
      source.indexOf("async function replaceSeedInput("),
      source.indexOf("async function pressKey("),
    );
    // The seed field is hidden until "Use seed" is chosen, so the helper
    // chooses it before it clicks the field.
    const chosen = replaceSeed.indexOf("await chooseUseSeed(connection)");
    expect(chosen).toBeGreaterThan(-1);
    expect(chosen).toBeLessThan(
      replaceSeed.indexOf('await pointerClick(connection, "#v7-seed")'),
    );
    const choose = source.slice(
      source.indexOf("async function chooseUseSeed("),
      source.indexOf("async function replaceSeedInput("),
    );
    expect(choose).toContain(
      "await pointerClick(connection, '[data-action=\"seed-mode-seed\"]')",
    );
    expect(choose).toContain("dataset.seedMode === 'seed'");
    expect(choose).toContain("closest('label')?.hidden === false");
    // Every fast-forward launch types a fixed seed first.
    const launches = [
      ...source.matchAll(
        /await replaceSeedInput\(connection, "6"\);\s*await launchWithFastForward\(connection\)/g,
      ),
    ];
    expect(launches).toHaveLength(4);
    // The art probes launch the default and assert it is "New map".
    const probe = source.slice(
      source.indexOf("async function probeChibiArtSet("),
      source.indexOf("async function probeUndeadSetup("),
    );
    expect(probe).toContain("dataset.seedMode === 'new'");
    expect(probe).toContain("closest('label')?.hidden === true");
    // The naval smoke keeps its fixed default seed.
    const naval = readFileSync("scripts/browser-naval-smoke-v7.ts", "utf8");
    const navalSeed = naval.indexOf(
      "click('[data-action=\"seed-mode-seed\"]')",
    );
    expect(navalSeed).toBeGreaterThan(-1);
    expect(navalSeed).toBeLessThan(
      naval.indexOf("click('[data-action=\"launch\"]')"),
    );
  });
  it("probes the CHIBI default, the persisted ?art=legacy opt-out and a reset", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeChibiArtSet("),
      source.indexOf("async function probeUndeadSetup("),
    );

    expect(probe).toContain("await navigateFresh(artUrl(null), freshSetup)");
    expect(probe).toContain('activeWithArt("CHIBI")');
    expect(probe).toContain("80 * Number(beforeStep)");
    expect(probe).toContain("evidence.stored !== null");
    expect(probe).toContain(
      'await navigateFresh(artUrl("legacy"), freshSetup)',
    );
    expect(probe).toContain('legacy.stored !== "LEGACY"');
    expect(probe).toContain('activeWithArt("LEGACY")');
    expect(probe).toContain('artUrl("chibi")');
    expect(
      probe.lastIndexOf("localStorage.removeItem(${JSON.stringify(artKey)})"),
    ).toBeGreaterThan(probe.indexOf('artUrl("chibi")'));
  });
  it("chooses Undead seats in the default-route setup without a development flag", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeUndeadSetup("),
      source.indexOf("async function probeAfflictionFixture("),
    );

    expect(source).not.toContain("undead=1");
    expect(source).not.toContain('searchParams.set("undead"');
    expect(source).toContain("await probeUndeadSetup(connection)");
    expect(probe).toContain(
      "document.querySelector('[data-v7-factions]') !== null",
    );
    // pulp_wars-w5j.1: distinct defaults, the opponent's select disables
    // the human's faction, and picking Undead moves the opponent to Human.
    expect(probe).toContain(`=== '["ORIGINAL","UNDEAD"]'`);
    expect(probe).toContain(
      `document.querySelector('#v7-faction-1 option[value="ORIGINAL"]').disabled`,
    );
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'UNDEAD'",
    );
    expect(probe).toContain('["UNDEAD","ORIGINAL"]');
    expect(probe).not.toContain("flagUrl");
  });
  it("plays a Goblin Kaboom! through the default setup and resumes the save", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeGoblinMatch("),
      source.indexOf("async function driveDefaultMatchToOutcome("),
    );

    expect(source).toContain("await probeGoblinMatch(connection)");
    expect(probe).toContain("JSON.stringify(FACTION_OPTIONS_V7)");
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'GOBLIN'",
    );
    expect(probe).toContain('JSON.stringify(["GOBLIN", "UNDEAD"])');
    expect(probe).toContain('await pressKey(connection, "Enter", "Enter")');
    expect(probe).toContain(
      `await pointerClick(connection, '[data-action="command-kaboom"]')`,
    );
    expect(probe).toContain(
      `document.querySelector('[data-v7-kaboom="armed"]')`,
    );
    expect(probe).toContain(
      `await pointerClick(connection, '[data-action="confirm-kaboom"]')`,
    );
    expect(probe).toContain("includes('Your Goblin blew up')");
    expect(probe).toContain(`'["GOBLIN","UNDEAD"]'`);
    expect(probe.indexOf("confirm-kaboom")).toBeLessThan(
      probe.indexOf(`await touchClick(connection, '[data-action="resume"]')`),
    );
    // No fixture import: the probe also runs against a deployed bundle.
    expect(probe).not.toContain("/tests/fixtures/");
  });
  it("charges after a Move, lays an Egg, sees it hatch and resumes as Dinosaurs", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeDinosaurMatch("),
      source.indexOf("async function probeShowcaseMatch("),
    );

    expect(source).toContain("await probeDinosaurMatch(connection)");
    expect(source).toContain(
      "; Dinosaur ${dinosaur}; Martian ${martian}; Ice Folk ${iceFolk}; Dwarf ${dwarf}; Showcase ${showcase}; Gallery ${gallery}.",
    );
    // Setup: Dinosaur is offered, and chosen with three opponents on the
    // Showcase, the one setup with a turn-1 lane and lay-able Eggs.
    expect(probe).toContain("JSON.stringify(FACTION_OPTIONS_V7)");
    expect(probe).toContain(
      'await typeSelectValue(connection, "#v7-ai-count", "3")',
    );
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'DINOSAUR'",
    );
    expect(probe).toContain(
      'JSON.stringify(["DINOSAUR", "UNDEAD", "GOBLIN", "ORIGINAL"])',
    );
    // The human moves first, so the launch is a plain trusted click.
    expect(probe).not.toContain("launchWithFastForward");
    expect(probe).not.toContain("replaceSeedInput");
    const launch = probe.indexOf(
      `await pointerClick(connection, '[data-action="launch"]')`,
    );
    expect(launch).toBeGreaterThan(-1);
    // Revision 20: the Triceratops moves, shows its Charge! run-up, and
    // attacks from the board with the keyboard; no Stampede control exists.
    const charge = probe.indexOf(
      `document.querySelector('.v7-unit-help-dialog .v7-unit-ability[data-ability="charge"]') !== null`,
    );
    expect(charge).toBeGreaterThan(launch);
    expect(probe).toContain("unit.activation.movedPathLength === 2");
    // The Dinosaur pass (7r53): the card states the run-up with and
    // without Wallbreaker, the ignored fortification, and the push.
    expect(probe).toContain(
      String.raw`Attack after moving this turn \(with Wallbreaker \+[\d.]+ per tile, up to \+[\d.]+\)\. Ignores Walls and Field Defense, destroys Field Defense, and pushes back\.`,
    );
    expect(probe).toContain(
      String.raw`/Charge \+[\d.]+\./.exec(chargePreview)`,
    );
    expect(probe).toContain("view.commandIndex === 2");
    expect(source).not.toMatch(
      /command-stampede|stampeded|v7-stampede-legend'\)/,
    );
    // Lay Egg through the card and a nest tile picked on the board.
    const card = probe.indexOf(
      `await pointerClick(connection, '[data-action="lay-egg-raider"]')`,
    );
    expect(card).toBeGreaterThan(charge);
    expect(probe).toContain(
      `document.querySelector('[data-v7-lay-egg="picking"]')?.dataset.nestTiles !== undefined`,
    );
    expect(probe).toContain("includes('You laid a Raptor Egg')");
    expect(probe).toContain(`egg.form !== "EGG" || egg.role !== "RAIDER"`);
    // End Turn, then the Egg has hatched into a land-form Raptor.
    const endTurn = probe.indexOf(
      `await pointerClick(connection, '[data-action="end-turn"]')`,
    );
    expect(endTurn).toBeGreaterThan(card);
    expect(
      probe.indexOf("await evaluate(connection, armFastForwardExpression())"),
    ).toBeLessThan(endTurn);
    expect(probe).toContain(`hatched.form !== "LAND"`);
    expect(probe).toContain("hatched.eggs !== 0");
    // Save and resume on a fresh load with the Dinosaur seat.
    expect(endTurn).toBeLessThan(
      probe.indexOf(`await touchClick(connection, '[data-action="resume"]')`),
    );
    expect(probe).toContain(`'["DINOSAUR","UNDEAD","GOBLIN","ORIGINAL"]'`);
    expect(probe).toContain(
      "JSON.stringify(resumed) !== JSON.stringify(hatched)",
    );
    for (const name of [
      "dinosaur-setup-desktop.png",
      "dinosaur-nest-picking-desktop.png",
      "dinosaur-hatched-desktop.png",
    ])
      expect(probe).toContain(`await capture(connection, "${name}")`);
    // No fixture import: the probe also runs against a deployed bundle.
    expect(probe).not.toContain("/tests/fixtures/");
  });
  it("fires a ray with its preview, beams a Grunt down and resumes as Martians", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeMartianMatch("),
      source.indexOf("async function probeIceFolkMatch("),
    );

    expect(source).toContain("await probeMartianMatch(connection)");
    // Setup: Martian is offered, and chosen with three opponents on the
    // Showcase, whose first turn has a ray in reach and a Beam Down.
    expect(probe).toContain("JSON.stringify(FACTION_OPTIONS_V7)");
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'MARTIAN'",
    );
    expect(probe).toContain(
      'JSON.stringify(["MARTIAN", "UNDEAD", "GOBLIN", "DINOSAUR"])',
    );
    expect(probe).not.toContain("launchWithFastForward");
    // The ray: "Full power" in the dock, the preview's power and Cooling
    // lines on the cursor, the shooter Cooling after the shot.
    const preview = probe.indexOf(`rayPreview.includes("Full power")`);
    expect(preview).toBeGreaterThan(-1);
    expect(probe).toContain(
      `rayPreview.includes("Leaves it Cooling next turn")`,
    );
    expect(probe).toContain("entry.firedThisTurn");
    // Beam Down: the button in the dock, then the passenger and a tile on
    // the board (bead pulp_wars-b5f.8: the dock names no tile, and the
    // board's targets are named without coordinates; bead pulp_wars-9im:
    // the dock lists no passengers).
    const beam = probe.indexOf(
      `await pointerClick(connection, '[data-action="martian-beam-down"]')`,
    );
    expect(beam).toBeGreaterThan(preview);
    // `pulp_wars-1wy.3`: the Grunt is picked on its own tile (units within
    // two tiles of the Saucer are passengers too): the cursor walks to it.
    const passenger = probe.indexOf(
      "beamPassenger.x - started.saucer.x,",
      beam,
    );
    expect(passenger).toBeGreaterThan(beam);
    expect(probe).not.toContain(`pointerClick(connection, beamPassenger)`);
    expect(probe).toContain(
      `[data-v7-martian-pick="beam_down"] [data-action^="beam-passenger-"]') === null`,
    );
    expect(probe).toContain(`[data-v7-martian-pick="beam_down"].v7-board-pick`);
    expect(probe).not.toContain(
      `await pointerClick(connection, '[data-action^="beam-tile-"]')`,
    );
    expect(probe).toContain(`throw new Error(\`Beam Down dock names a tile:`);
    const tab = probe.indexOf(`await pressKey(connection, "Tab", "Tab")`);
    expect(tab).toBeGreaterThan(passenger);
    expect(probe.indexOf(`.startsWith('Beam the ')`, tab)).toBeGreaterThan(tab);
    expect(probe).toContain("includes('Saucer beamed down a')");
    // Save and resume on a fresh load with the Martian seat.
    expect(beam).toBeLessThan(
      probe.indexOf(`await touchClick(connection, '[data-action="resume"]')`),
    );
    expect(probe).toContain(`'["MARTIAN","UNDEAD","GOBLIN","DINOSAUR"]'`);
    expect(probe).toContain(
      "JSON.stringify(resumed) !== JSON.stringify(beamed)",
    );
    for (const name of [
      "martian-ray-preview-desktop.png",
      "martian-beam-down-desktop.png",
    ])
      expect(probe).toContain(`await capture(connection, "${name}")`);
    // No fixture import: the probe also runs against a deployed bundle.
    expect(probe).not.toContain("/tests/fixtures/");
  });
  it("throws a Bolas with its hint, leaves the target Frozen and resumes as Ice Folk", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeIceFolkMatch("),
      source.indexOf("async function probeDwarfMatch("),
    );

    expect(source).toContain("await probeIceFolkMatch(connection)");
    expect(source).toContain(
      "; Martian ${martian}; Ice Folk ${iceFolk}; Dwarf ${dwarf}; Showcase ${showcase}; Gallery ${gallery}.",
    );
    // The setup's eight faction options, Ice Folk sixth (pulp_wars-7g3.6),
    // Dwarf seventh (pulp_wars-78i.6), and Candy last (pulp_wars-jdb.3).
    const options = source.slice(
      source.indexOf("const FACTION_OPTIONS_V7 = ["),
      source.indexOf("] as const;", source.indexOf("FACTION_OPTIONS_V7")),
    );
    expect(
      [...options.matchAll(/"([^"]+)"/g)].map((match) => match[1]),
    ).toEqual([
      "Human",
      "Undead",
      "Goblin",
      "Dinosaur",
      "Martian",
      "Ice Folk",
      "Dwarf",
      "Candy",
    ]);
    // Setup: Ice Folk is offered, and chosen with three opponents on the
    // Showcase.
    expect(probe).toContain("JSON.stringify(FACTION_OPTIONS_V7)");
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'ICE_FOLK'",
    );
    expect(probe).toContain(
      'JSON.stringify(["ICE_FOLK", "UNDEAD", "GOBLIN", "DINOSAUR"])',
    );
    expect(probe).not.toContain("launchWithFastForward");
    // Snow from the view's flags and in the cursor's description.
    expect(probe).toContain("tile.snow === true");
    expect(probe).toContain(
      'capitalText.includes("Snow: your units move at half cost")',
    );
    // The Sled moves into reach and aims its Bolas from the dock; the
    // target is picked on the board with Tab and Enter (bead
    // pulp_wars-9im: the dock lists no targets).
    const bolas = probe.indexOf(
      `await pointerClick(connection, '[data-action="ice-folk-bolas"]')`,
    );
    expect(bolas).toBeGreaterThan(-1);
    expect(probe).toContain(
      `[data-v7-ice-folk-pick="bolas"] [data-action^="bolas-"]') === null`,
    );
    expect(probe).not.toContain(
      `pointerClick(\n    connection,\n    '[data-v7-ice-folk-pick="bolas"]`,
    );
    const bolasTab = probe.indexOf(
      `await pressKey(connection, "Tab", "Tab")`,
      bolas,
    );
    expect(bolasTab).toBeGreaterThan(bolas);
    expect(probe.indexOf(`.startsWith('Bolas: ')`, bolasTab)).toBeGreaterThan(
      bolasTab,
    );
    expect(probe).toContain("/Will be (Frozen|Frosted)/.test(hint)");
    expect(probe).toContain("includes('Sled chilled a')");
    expect(probe).toContain("!chilled.entry.sluggish");
    // Save and resume on a fresh load with the Ice Folk seat and the Chill.
    expect(bolas).toBeLessThan(
      probe.indexOf(`await touchClick(connection, '[data-action="resume"]')`),
    );
    expect(probe).toContain(`'["ICE_FOLK","UNDEAD","GOBLIN","DINOSAUR"]'`);
    expect(probe).toContain(
      "JSON.stringify(resumed) !== JSON.stringify(chilled)",
    );
    for (const name of [
      "ice-folk-bolas-desktop.png",
      "ice-folk-frozen-desktop.png",
    ])
      expect(probe).toContain(`await capture(connection, "${name}")`);
    // No fixture import: the probe also runs against a deployed bundle.
    expect(probe).not.toContain("/tests/fixtures/");
  });
  it("tunnels a Steam Mole with its eruption forecast and resumes as Dwarves", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeDwarfMatch("),
      source.indexOf("async function probeShowcaseMatch("),
    );

    expect(source).toContain("await probeDwarfMatch(connection)");
    expect(source).toContain(
      "; Dwarf ${dwarf}; Showcase ${showcase}; Gallery ${gallery}.",
    );
    // Setup: Dwarf is offered and chosen by keyboard (the second "D") with
    // three opponents on the Showcase; the seat that played Dinosaur moved
    // to the freed Human.
    expect(probe).toContain("JSON.stringify(FACTION_OPTIONS_V7)");
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'DWARF'",
    );
    expect(probe).toContain(
      'JSON.stringify(["DWARF", "UNDEAD", "GOBLIN", "ORIGINAL"])',
    );
    expect(probe).not.toContain("launchWithFastForward");
    // The Mole aims its Tunnel from the dock; a destination is chosen on
    // the board with Tab (its coordinate-free description carries the
    // forecast) and Enter, and the tunnel leaves a mound there. The dock
    // names no tile and has no destination chips (bead pulp_wars-b5f.8).
    const tunnel = probe.indexOf(
      `await pointerClick(connection, '[data-action="dwarf-tunnel"]')`,
    );
    expect(tunnel).toBeGreaterThan(-1);
    expect(probe).not.toContain(".v7-martian-choice-button");
    expect(probe).toContain("throw new Error(`Tunnel dock names a tile:");
    const tab = probe.indexOf(`await pressKey(connection, "Tab", "Tab")`);
    expect(tab).toBeGreaterThan(tunnel);
    expect(probe).toContain('forecast.startsWith("Surface next to")');
    expect(probe).toContain("/erupts for \\d+/.test(forecast)");
    expect(
      probe.indexOf(`await pressKey(connection, "Enter", "Enter")`, tab),
    ).toBeGreaterThan(tab);
    expect(probe).toContain("includes('Steam Mole tunnelled')");
    expect(probe).toContain("view.burrowed.find(");
    // Save and resume on a fresh load with the Dwarf seat and the mound.
    expect(tunnel).toBeLessThan(
      probe.indexOf(`await touchClick(connection, '[data-action="resume"]')`),
    );
    expect(probe).toContain(`'["DWARF","UNDEAD","GOBLIN","ORIGINAL"]'`);
    expect(probe).toContain(
      "JSON.stringify(resumed) !== JSON.stringify(burrowed)",
    );
    for (const name of [
      "dwarf-tunnel-preview-desktop.png",
      "dwarf-mound-desktop.png",
    ])
      expect(probe).toContain(`await capture(connection, "${name}")`);
    // No fixture import: the probe also runs against a deployed bundle.
    expect(probe).not.toContain("/tests/fixtures/");
  });
  it("launches the Showcase from setup, checks its pieces, ends a turn and resumes", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeShowcaseMatch("),
      source.indexOf("async function probeCampaign("),
    );

    expect(source).toContain("await probeShowcaseMatch(connection)");
    expect(source).toContain("; Showcase ${showcase}; Gallery ${gallery}.");
    expect(probe).toContain('options.at(-1) !== "Showcase"');
    // The setup forces 16 x 16 and hides the seed control.
    expect(probe).toContain(
      "document.querySelector('#v7-map-type')?.value === 'SHOWCASE'",
    );
    expect(probe).toContain("size?.disabled === true && size.value === '16'");
    expect(probe).toContain(
      "document.querySelector('.v7-seed-choice')?.hidden === true",
    );
    // The human moves first at command index 0, so the probe launches with
    // a plain trusted click, not the AI-first Fast Forward launch helper.
    expect(probe).not.toContain("launchWithFastForward");
    expect(probe).not.toContain("replaceSeedInput");
    expect(probe).toContain(
      `await pointerClick(connection, '[data-action="launch"]')`,
    );
    expect(probe).toContain("started.units !== 11");
    expect(probe).toContain("started.roles !== 11");
    expect(probe).toContain("started.cities !== 3");
    expect(probe).toContain("started.technologies !== 25");
    expect(probe).toContain("started.unexplored !== 0");
    expect(probe).toContain(
      'await capture(connection, "showcase-launch-desktop.png")',
    );
    const endTurn = probe.indexOf(
      `await pointerClick(connection, '[data-action="end-turn"]')`,
    );
    expect(endTurn).toBeGreaterThan(probe.indexOf("started.units !== 11"));
    expect(
      probe.indexOf("await evaluate(connection, armFastForwardExpression())"),
    ).toBeLessThan(endTurn);
    expect(probe).toContain("returned.round !== 2");
    expect(endTurn).toBeLessThan(
      probe.indexOf(`await touchClick(connection, '[data-action="resume"]')`),
    );
    expect(probe).toContain("s.view?.setup.mapType === 'SHOWCASE'");
    // No fixture import: the probe also runs against a deployed bundle.
    expect(probe).not.toContain("/tests/fixtures/");
  });
  it("opens the Gallery from the front screen, filters and plays a unit preview", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = readFileSync("scripts/browser-smoke-v7-gallery.ts", "utf8");

    // After the Showcase probe, which leaves a fresh front screen.
    expect(source.indexOf("await probeGalleryV7({")).toBeGreaterThan(
      source.indexOf("await probeShowcaseMatch(connection)"),
    );
    expect(source).toContain("; Gallery ${gallery}.");
    expect(probe).toContain(`pointerClick('[data-action="gallery"]')`);
    // Eight factions since the Candy (pulp_wars-jdb.3): 11 x 8 units and the
    // Egg; the Egg row is empty for the seven factions that lay none.
    expect(probe).toContain(
      "ORIGINAL,UNDEAD,GOBLIN,DINOSAUR,MARTIAN,ICE_FOLK,DWARF,CANDY",
    );
    // Tuning 5 (`pulp_wars-w49.4`): the Swordsman's row adds one unit and
    // seven empty cells (93 and 11 before).
    expect(probe).toContain("table.cells !== 94");
    expect(probe).toContain("table.empty !== 18");
    expect(probe).toContain("filtered.cells.length !== 7");
    expect(probe).toContain(`.v7-gallery-chip[data-value="GOBLIN"]`);
    expect(probe).toContain('storedFilters.unitRows?.join() !== "CATAPULT"');
    expect(probe).toContain(
      `.v7-gallery-cell[data-row="CATAPULT"][data-faction="UNDEAD"]`,
    );
    expect(probe).toContain("dataset.demoState === 'done'");
    expect(probe).toContain("await driver.pressEscape()");
    expect(probe).toContain(`pointerClick('[data-action="gallery-back"]')`);
    for (const name of ["gallery-units.png", "gallery-detail.png"])
      expect(probe).toContain(`await driver.capture("${name}")`);
    expect(probe).not.toContain("/tests/fixtures/");
  });
  it("opens the Gallery's Sounds tab, checks the manifest's cards and plays one", () => {
    const probe = readFileSync("scripts/browser-smoke-v7-gallery.ts", "utf8");

    // Bead pulp_wars-2yc.19: between the Terrain tab and the way back.
    const sounds = probe.indexOf(
      "await probeGallerySoundsV7(driver, table.factions.length)",
    );
    expect(sounds).toBeGreaterThan(
      probe.indexOf(`pointerClick('[data-action="gallery-tab-terrain"]')`),
    );
    expect(sounds).toBeLessThan(
      probe.indexOf(`pointerClick('[data-action="gallery-tab-units"]')`),
    );
    expect(probe).toContain(
      `pointerClick('[data-action="gallery-tab-sounds"]')`,
    );
    // The cards are compared with the manifest, not with a number.
    expect(probe).toContain(
      'import { playableSoundIdsV1 } from "../src/audio/index"',
    );
    expect(probe).toContain("[...playableSoundIdsV1()].sort().join()");
    // Bead pulp_wars-2yc.27: one playable theme row per faction column
    // and the title theme's, under the Music and Sound sliders.
    expect(probe).toContain("listed.themes !== factions + 1");
    expect(probe).toContain("listed.pending !== 0");
    expect(probe).toContain("#v7-music-volume-gallery");
    expect(probe).toContain("#v7-sound-volume-gallery");
    expect(probe).toContain("listed.levels !== 2");
    // A trusted pointer click plays the victory tune: the audio's log, the
    // card's playing state and its stop control.
    expect(probe).toContain('const SOUNDS_PLAYED = "match.victory"');
    expect(probe).toContain(
      'pointerClick(`[data-sound-play="${SOUNDS_PLAYED}"]`)',
    );
    expect(probe).toContain("played.log.includes(`${SOUNDS_PLAYED}:PLAYED`)");
    expect(probe).toContain("played.playing.join() !== SOUNDS_PLAYED");
    expect(probe).toContain('entry.endsWith(":MUTED")');
    expect(probe).toContain(
      '`[data-sound-row="${SOUNDS_PLAYED}"] .v7-gallery-sound-stop`',
    );
    expect(probe).toContain(".remainingMs('${SOUNDS_PLAYED}') === 0");
    expect(probe).toContain('await driver.capture("gallery-sounds.png")');
  });
  it("checks the Music and Sound sliders and that a theme is asked for after the first gesture", () => {
    const probe = readFileSync("scripts/browser-smoke-v7-sound.ts", "utf8");

    // Bead pulp_wars-2yc.27: before the gesture the match knows its theme
    // and has fetched nothing for it.
    const quiet = probe.indexOf(
      'quiet.scene !== "theme.undead" || quiet.requests !== 0',
    );
    expect(quiet).toBeGreaterThan(-1);
    expect(quiet).toBeLessThan(
      probe.indexOf('await driver.openCompactMenuItem("settings")'),
    );
    // Two levels in Settings, each a toggle and a slider.
    expect(probe).toContain(`const TOGGLE = '[data-action="sound-toggle"]'`);
    expect(probe).toContain(
      `const MUSIC_TOGGLE = '[data-action="music-toggle"]'`,
    );
    expect(probe).toContain("document.querySelector('#v7-sound-volume')");
    expect(probe).toContain(
      "document.querySelector('#v7-music-volume')?.type === 'range'",
    );
    // After it, the viewer's faction theme is requested (or there is no
    // sound device at all).
    expect(probe).toContain(
      'const THEME_FILE = "assets/audio/themes/theme-undead.m4a"',
    );
    expect(probe).toContain(
      ".music.requests.some((url) => url.includes('${THEME_FILE}'))",
    );
    expect(probe).toContain("${AUDIO}.unlocked !== true ||");
  });
  it("launches the most players on the smallest Dry Land board and plays one End Turn", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = readFileSync(
      "scripts/browser-smoke-v7-many-seats.ts",
      "utf8",
    );

    // After the Gallery probe (a fresh front screen) and before the
    // campaign probe, to which it returns a fresh front screen.
    const call = source.indexOf("await probeManySeatsV7({");
    expect(call).toBeGreaterThan(source.indexOf("await probeGalleryV7({"));
    expect(call).toBeLessThan(
      source.indexOf("await probeCampaign(connection)"),
    );
    // The count is read from the setup, never written into the probe.
    expect(probe).toContain("#v7-ai-count option");
    expect(probe).toContain("const most = counts.at(-1)");
    expect(probe).toContain("const seats = counts.length + 1");
    // Chosen with the keyboard on focused, closed selects.
    expect(probe).toContain(
      'await driver.typeSelectKeys("#v7-ai-count", most, most)',
    );
    expect(probe).toContain(
      'await driver.typeSelectKeys("#v7-map-type", "D", "DRY_LAND")',
    );
    // Repeated "1" keys cycle through the sizes starting with 1, so the
    // probe counts the presses from the current size to 11 x 11.
    expect(probe).toContain(
      'await driver.typeSelectKeys("#v7-board-size", "1".repeat(presses), "11")',
    );
    // The default flow's own size step leaves a select that already holds
    // the value alone (two players keep 11 x 11 now).
    expect(
      source.slice(
        source.indexOf("async function typeSelectValue("),
        source.indexOf("async function typeSelectKeys("),
      ),
    ).toContain(
      ".value === ${JSON.stringify(value)}`,\n    )\n  )\n    return;",
    );
    const helper = source.slice(
      source.indexOf("async function typeSelectKeys("),
      source.indexOf("async function launchWithFastForward("),
    );
    expect(helper).toContain("!select.matches(':open')");
    expect(helper).toContain('"Input.dispatchKeyEvent"');
    // The setup: the crowded size marked, the Showcase disabled with its
    // reason, one seat cell per player, no horizontal overflow.
    expect(probe).toContain("option.dataset.crowded === 'true'");
    expect(probe).toContain("chip.textContent === 'Crowded'");
    expect(probe).toContain("!setup.showcaseDisabled");
    expect(probe).toContain("setup.seatCells !== seats");
    expect(probe).toContain("setup.factions !== seats");
    expect(probe).toContain("setup.overflow > 0");
    // The match: every player, the strip, the human's turn ringed.
    expect(probe).toContain("started.players !== seats");
    expect(probe).toContain("started.width !== 11");
    expect(probe).toContain('started.mapType !== "DRY_LAND"');
    expect(probe).toContain("started.chips !== seats");
    expect(probe).toContain("!started.activeViewer");
    // One End Turn at normal speed: no Fast Forward, no fixture.
    const endTurn = probe.indexOf(
      `await driver.pointerClick('[data-action="end-turn"]')`,
    );
    expect(endTurn).toBeGreaterThan(
      probe.indexOf(`await driver.pointerClick('[data-action="launch"]')`),
    );
    expect(probe.match(/data-action="end-turn"/g)).toHaveLength(1);
    expect(probe).not.toContain("armFastForwardExpression");
    expect(probe).not.toContain("/tests/fixtures/");
    expect(probe).not.toContain("import ");
    // Every player was active once and the status counted the opponents.
    expect(probe).toContain("round.active !== seats");
    expect(probe).toContain("round.eliminated !== 0");
    expect(probe).toContain("places.length === 0");
    expect(probe).toContain("snapshot().phase === 'ERROR'");
    // Then it leaves: save and quit, the player count, delete.
    expect(
      probe.indexOf('driver.openCompactMenuItem("main-menu")'),
    ).toBeGreaterThan(endTurn);
    expect(probe).toContain("players · Dry land");
    expect(probe).toContain(
      `await driver.pointerClick('[data-action="delete-save"]')`,
    );
    for (const name of [
      "many-seats-setup-desktop.png",
      "many-seats-hud-desktop.png",
    ])
      expect(probe).toContain(`await driver.capture("${name}")`);
    expect(source).toContain(
      "Curiosities ${curiosities}. Many players ${manySeats}; asset preload ${preload}. Evidence:",
    );
  });
  it("drives the title screen: the menu over the scene, its keys, New game, and Main menu after a match", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    // The opening checks the menu's buttons, focus and place over the scene.
    expect(source).toContain(
      'titleScreen.actions.join() !== "new-game,campaign,gallery,front-settings"',
    );
    expect(source).toContain('titleScreen.focused !== "new-game"');
    expect(source).toContain("!titleScreen.overScene");
    expect(source).toContain("titleScreen.overflow > 0");
    // Arrow keys wrap; Enter on New game opens the setup with focus on Menu.
    expect(source).toContain(
      'await pressKey(connection, "ArrowUp", "ArrowUp")',
    );
    expect(source).toContain('wrapped !== "front-settings"');
    expect(source).toContain(
      "${SETUP_OPEN_V7} && document.activeElement?.dataset?.action === 'front-back'",
    );
    // Every probe that drives the setup form opens it with a real click.
    const helper = source.slice(
      source.indexOf("async function openNewGame("),
      source.indexOf("async function launchWithFastForward("),
    );
    expect(helper).toContain(
      `await pointerClick(connection, '[data-action="new-game"]')`,
    );
    expect(source.split("await openNewGame(connection);").length - 1).toBe(10);
    // Save & quit shows Continue, selected, in the menu.
    expect(source).toContain(
      "resume.querySelector('.v7-menu-button-label')?.textContent === 'Continue' && document.activeElement === resume",
    );
    // The natural match's end dialog: Play again and Main menu, which
    // clears the finished match and returns to the title screen.
    const end = source.slice(
      source.indexOf(
        'await capture(connection, "default-v7-outcome-desktop.png")',
      ),
      source.indexOf("const artifacts = {"),
    );
    expect(end).toContain('"restart:Play again,results-menu:Main menu"');
    expect(end).toContain(
      `await pointerClick(connection, '[data-action="results-menu"]')`,
    );
    expect(end).toContain("snapshot?.phase === 'EMPTY'");
    expect(end).toContain(
      "localStorage.getItem('pulpWars.save.v7r54.current') === null",
    );
    expect(end).toContain(
      "document.querySelector('[data-action=\"resume\"]') === null",
    );
    // The many-players probe opens New game from the menu too.
    const manySeats = readFileSync(
      "scripts/browser-smoke-v7-many-seats.ts",
      "utf8",
    );
    expect(manySeats).toContain(
      `await driver.pointerClick('[data-action="new-game"]')`,
    );
  });

  it("probes the campaign: menu button, list, briefing, mission start, a fixture win and the filtered choice", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeCampaign("),
      source.indexOf("async function fileSha256("),
    );
    expect(source).toContain("await probeCampaign(connection)");
    expect(source).toContain("; Campaign ${campaign}; art sets");
    // The campaign key survives the obsolete-key cleanup and Delete save.
    expect(source).toContain("keys.campaign !== SEEDED_CAMPAIGN_PROGRESS_V7");
    expect(probe).toContain(
      `await pointerClick(connection, '[data-action="campaign"]')`,
    );
    expect(probe).toContain('"Mission 1, Goblins at the Gate, open"');
    expect(probe).toContain('"Mission 2, The Warrens, locked"');
    expect(probe).toContain(
      "document.activeElement?.id === 'v7-briefing-title'",
    );
    expect(probe).toContain(
      `await pointerClick(connection, '[data-action="campaign-start"]')`,
    );
    expect(probe).toContain("'Mission: Goblins at the Gate'");
    expect(probe).toContain("'Shorecraft, unavailable in this mission'");
    expect(probe).toContain("^Mission 1 · Goblins at the Gate · Turn");
    // The win uses the fixture only on the development server.
    const fixture = probe.indexOf("/tests/fixtures/v7-campaign-ui.ts");
    expect(fixture).toBeGreaterThan(probe.indexOf("if (!deployed)"));
    expect(probe).toContain(
      "dialog.querySelector('h2')?.textContent === 'Mission complete'",
    );
    expect(probe).toContain(
      `await pointerClick(connection, '[data-action="campaign-next"]')`,
    );
    expect(probe).toContain("dataset.missionId === 'FRONTIER_2'");
    expect(probe).toContain(`'["ORIGINAL","GOBLIN"]'`);
  });
  it("probes the map curiosities on their fixture: a Shrine claim, a neutral turn and a Fountain heal", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = readFileSync(
      "scripts/browser-smoke-v7-curiosities.ts",
      "utf8",
    );

    // Dev server only (the fixture is a test fixture), between the Dwarf
    // probe and the Showcase probe, which loads a fresh front screen.
    const call = source.indexOf("await probeCuriositiesV7({");
    expect(call).toBeGreaterThan(
      source.indexOf("await probeDwarfMatch(connection)"),
    );
    expect(call).toBeLessThan(
      source.indexOf("await probeShowcaseMatch(connection)"),
    );
    expect(source).toContain('? "fixture skipped on the deployed bundle"');
    expect(source).toContain(
      "Curiosities ${curiosities}. Many players ${manySeats}; asset preload ${preload}. Evidence:",
    );
    expect(probe).toContain('module: "/tests/fixtures/v7-curiosities-ui.ts"');
    expect(probe).toContain('fixture: "curiositiesWoundedSpiderFixtureV7"');
    expect(probe).toContain("UNIT:MONSTER_GIANT_SPIDER:provoked");
    expect(probe).toContain(`[data-unit-status="neutral"]`);
    expect(probe).toContain("trace.eventKinds.includes('SHRINE_CLAIMED')");
    expect(probe).toContain(`pointerClick('[data-action="end-turn"]')`);
    for (const kind of [
      "NEUTRAL_TURN_STARTED",
      "COMBAT_RESOLVED",
      "FOUNTAIN_HEALED",
    ])
      expect(probe).toContain(`'${kind}'`);
    expect(probe).toContain("The wilds stir");
    for (const name of [
      "curiosities-spider-dock.png",
      "curiosities-neutral-turn.png",
    ])
      expect(probe).toContain(`await driver.capture("${name}")`);
  });
  it("probes the Candy UI on its fixture: the markers, a Sugar Rush before its Move, and a Re-bake", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = readFileSync("scripts/browser-smoke-v7-candy.ts", "utf8");

    // Dev server only (the fixture is a test fixture), after the map
    // curiosities and before the Showcase probe's fresh front screen.
    const call = source.indexOf("await probeCandyV7({");
    expect(call).toBeGreaterThan(source.indexOf("await probeCuriositiesV7({"));
    expect(call).toBeLessThan(
      source.indexOf("await probeShowcaseMatch(connection)"),
    );
    expect(source).toContain("Gallery ${gallery}. Candy ${candy}. Curiosities");
    expect(probe).toContain('module: "/tests/fixtures/v7-candy-ui.ts"');
    expect(probe).toContain('fixture: "candyUiFixtureV7"');
    expect(probe).toContain('"crashed,frenzy,rushed-home,splatted"');
    expect(probe).toContain(`pointerClick('[data-action="candy-sugar-rush"]')`);
    expect(probe).toContain("kinds[0] === 'SUGAR_RUSH' && kinds[1] === 'MOVE'");
    expect(probe).toContain(`[data-unit-status="rushed"]`);
    expect(probe).toContain(`pointerClick('[data-action="candy-rebake"]')`);
    expect(probe).toContain("trace.eventKinds.includes('UNIT_REBAKED')");
    // Bead pulp_wars-9im: the Gunner's Moves and heals are highlighted
    // together and the heal is picked on the board; the Re-bake's Crumbs
    // are picked on the board; the dock lists no target of either.
    expect(probe).toContain(`healer.styles.join() !== "MOVE,SUPPORT"`);
    expect(probe).toContain(
      "boardHost.activate(${JSON.stringify(at.tossNear)})",
    );
    expect(probe).toContain("trace.eventKinds.includes('SUGAR_TOSSED')");
    expect(probe).toContain(
      "boardHost.activate(${JSON.stringify(at.crumbsBear)})",
    );
    expect(probe).toContain(`[data-action^="rebake-"]') === null`);
    expect(probe).not.toContain(`pointerClick('[data-action="rebake-0"]')`);
    // The dock never names a tile.
    expect(probe).toContain("The Candy dock names a tile");
    for (const name of [
      "candy-sugar-rush-armed.png",
      "candy-gunner-move-and-heal.png",
      "candy-rebake-aimed.png",
    ])
      expect(probe).toContain(`await driver.capture("${name}")`);
  });
  it("probes the research prompt on its fixture: a Fruit, Tech on Gathering, the Harvest on return", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = readFileSync(
      "scripts/browser-smoke-v7-research-prompt.ts",
      "utf8",
    );

    // Dev server only (the fixture is a test fixture), after the Candy
    // probe and before the Showcase probe's fresh front screen.
    const call = source.indexOf("await probeResearchPromptV7({");
    expect(call).toBeGreaterThan(source.indexOf("await probeCandyV7({"));
    expect(call).toBeLessThan(
      source.indexOf("await probeShowcaseMatch(connection)"),
    );
    expect(source).toContain(
      "; research prompt ${researchPrompt}; sound ${sound}; Campaign ${campaign};",
    );
    expect(probe).toContain('module: "/tests/fixtures/v7-research-prompt.ts"');
    expect(probe).toContain('fixture: "researchPromptSmokeFixtureV7"');
    expect(probe).toContain('[data-action="research-prompt-gathering"]');
    expect(probe).toContain("textContent === 'Research Gathering'");
    expect(probe).toContain(
      "document.activeElement?.dataset.action === 'research-gathering'",
    );
    expect(probe).toContain(
      "trace.command.kind === 'RESEARCH' && trace.command.tech === 'GATHERING'",
    );
    expect(probe).toContain("await driver.pressEscape()");
    expect(probe).toContain(
      "document.activeElement?.dataset.action === 'command-harvest_fruit'",
    );
    for (const name of ["research-prompt-dock.png", "research-prompt-tech.png"])
      expect(probe).toContain(`await driver.capture("${name}")`);
  });
  it("waits for a fresh complete document and installed controller after reload", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");

    expect(source.match(/await reloadAndWaitForFreshDocument\(/g)).toHaveLength(
      2,
    );
    expect(
      source.match(/await connection\.send\("Page\.reload"/g),
    ).toHaveLength(1);
    expect(source).toContain("globalThis[${JSON.stringify(marker)}] !== true");
    expect(source).toContain("performance.timeOrigin !==");
    expect(source).toContain("document.readyState === 'complete'");
    expect(source).toContain(
      "globalThis.__PULP_WARS_APP__?.controller !== undefined",
    );
  });

  it("keeps cold-policy validation synchronized with the active late-view fixture", () => {
    const contractSource = readFileSync(
      "scripts/browser-smoke-v7-contract.ts",
      "utf8",
    );
    const smokeSource = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const fixture = JSON.parse(
      readFileSync(RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH, "utf8"),
    ) as { readonly commandIndex?: unknown };

    expect(fixture.commandIndex).toBe(RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX);
    expect(contractSource).toContain(
      "evidence.commandIndex !== RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX",
    );
    expect(contractSource).not.toContain("command-1100");
    expect(smokeSource).toContain(
      "upgradeRetainedPublicViewV7(retainedLandView)",
    );
    expect(smokeSource).toContain(
      "import('/scripts/ruleset-v7-late-public-view-contract.ts')",
    );
  });

  it("defaults evidence to a unique temp directory and remains desktop-only", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");

    expect(source).toContain("await prepareSmokeOutput({");
    expect(source).toContain('name: "v7"');
    expect(source).toContain("const reviewRoot = smokeOutput.directory");
    expect(source).toContain("await smokeOutput.publish()");
    expect(BROWSER_RELEASE_SOURCE_PATHS_V7).toContain(
      "scripts/browser-smoke-output.ts",
    );
    // Two release captures, four Undead setup probe captures, one
    // revision-14 Plague/Bitten fixture capture per art set (in a loop), and
    // three revision-17 Goblin probe captures, four Dinosaur probe captures
    // (revision 20 adds the Charge! attack preview), two Martian probe
    // captures (pulp_wars-t6s.4) and the Mind Control fixture capture
    // (pulp_wars-b5f.3, dev server only), two Ice Folk probe captures
    // (pulp_wars-7g3.6), two Dwarf probe captures (pulp_wars-78i.6), and
    // one revision-18 Showcase capture, and two campaign captures
    // (pulp_wars-68k.5: the list, and the fixture win's Victory dialog).
    expect(source.match(/await capture\(/g)).toHaveLength(24);
    expect(source).toContain("async function probeAfflictionFixture(");
    expect(source).not.toContain("Emulation.setDeviceMetricsOverride");
    expect(source).not.toContain("mobile-ai-return-390-dpr2.png");
    expect(source).toContain("await stopBrowser(browser)");
    expect(source).toContain("await rm(userDataFs");
  });

  it("replaces the seed using the browser edit command on every host", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    expect(
      source.match(/await replaceSeedInput\(connection, "6"\)/g),
    ).toHaveLength(4);
    expect(source).toContain('commands: ["selectAll"]');
    expect(source).toContain("if (actual !== value)");
  });

  it("records timing before strict failure and gates release PASS evidence", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const enforcement = source.indexOf(
      "enforceBrowserTimingV7(timing, timingMode)",
    );
    expect(source.indexOf('path.join(reviewRoot, "timing.json")')).toBeLessThan(
      enforcement,
    );
    expect(enforcement).toBeLessThan(
      source.indexOf('path.join(reviewRoot, "evidence.json")'),
    );
    expect(source).toContain(
      'timingMode === "STRICT" ? "FUNCTIONAL_AND_TIMING" : "FUNCTIONAL"',
    );
  });
});

function preview(maximumSliceMilliseconds = 20): PreviewEvidenceV7 {
  return {
    initial: {
      viewerId: 1,
      activePlayerId: 2,
      humanCoins: 3,
      commandIndex: 0,
      projectedViewerId: 1,
    },
    returned: {
      viewerId: 1,
      activePlayerId: 1,
      humanCoins: 5,
      commandIndex: 3,
      policySlices: 9,
      maximumSliceMilliseconds,
      fastForwardObserved: true,
      hostTicks: 2,
    },
    persisted: { version: 7, rulesetId: "pulp-wars-poc-7r54", commandIndex: 3 },
    ordinaryBoundary: {
      controllerOwnProperties: [],
      snapshotHasStateHash: false,
      snapshotHasReplay: false,
      publicPlayersLeakPrivateState: false,
    },
    exports: {
      safeClassification: "PLAYER_SAFE",
      safeViewerId: 1,
      debugClassification: "OMNISCIENT",
      debugWarning: "INCLUDES_HIDDEN_MAP_AND_UNITS",
    },
  };
}

function cold(maximumCallbackMilliseconds = 10): ColdPolicyEvidenceV7 {
  return {
    commandIndex: RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX,
    callbacks: 8,
    hostTicks: 8,
    maximumCallbackMilliseconds,
    totalMilliseconds: 100,
    decisionKind: "END_TURN",
  };
}

describe("browser smoke timing acceptance", () => {
  it.each([
    [[], "DIAGNOSTIC"],
    [["--deployed"], "DIAGNOSTIC"],
    [["--performance"], "STRICT"],
    [["--archive-evidence"], "STRICT"],
    [["--deployed", "--performance"], "STRICT"],
  ] as const)("selects the timing policy for %j", (args, expected) => {
    expect(browserTimingModeV7(args)).toBe(expected);
  });

  it.each([null, cold(40)])(
    "accepts the unchanged inclusive 40ms budget",
    (policy) => {
      const timing = collectBrowserTimingV7(preview(40), policy);
      expect(timing.status).toBe("PASS");
      expect(timing.budgetMilliseconds).toBe(40);
      expect(() => enforceBrowserTimingV7(timing, "STRICT")).not.toThrow();
    },
  );

  it.each([
    [40.1, 10],
    [20, 40.1],
    [121.8, 79.2],
  ])(
    "records production %s/cold %s overruns and rejects strict acceptance",
    (production, policy) => {
      const timing = collectBrowserTimingV7(preview(production), cold(policy));
      expect(timing.status).toBe("EXCEEDED");
      expect(timing.productionMaximumMilliseconds).toBe(production);
      expect(timing.coldMaximumMilliseconds).toBe(policy);
      expect(() =>
        enforceBrowserTimingV7(timing, browserTimingModeV7([])),
      ).not.toThrow();
      for (const flag of ["--performance", "--archive-evidence"])
        expect(() =>
          enforceBrowserTimingV7(timing, browserTimingModeV7([flag])),
        ).toThrow("performance budget exceeded");
    },
  );

  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "rejects invalid measurement %s in either mode",
    (invalid) => {
      const value = invalid as number;
      const invalidPreview = {
        ...preview(),
        returned: { ...preview().returned, maximumSliceMilliseconds: value },
      };
      expect(() => validatePreview(invalidPreview)).toThrow(
        "Invalid browser timing",
      );
      expect(() => collectBrowserTimingV7(invalidPreview, null)).toThrow(
        "Invalid browser timing",
      );
      expect(() =>
        validateColdPolicy({ ...cold(), maximumCallbackMilliseconds: value }),
      ).toThrow("Invalid browser timing");
      expect(() =>
        collectBrowserTimingV7(preview(), {
          ...cold(),
          maximumCallbackMilliseconds: value,
        }),
      ).toThrow("Invalid browser timing");
      expect(() =>
        collectBrowserTimingV7(preview(), {
          ...cold(),
          totalMilliseconds: value,
        }),
      ).toThrow("Invalid browser timing");
    },
  );

  it("retains functional, public-information, persistence and yielding failures regardless of timings", () => {
    const valid = preview(121.8);
    expect(() => validatePreview(valid)).not.toThrow();
    expect(() => validateColdPolicy(cold(79.2))).not.toThrow();
    for (const returned of [
      { ...valid.returned, activePlayerId: 2 },
      { ...valid.returned, hostTicks: 0 },
      { ...valid.returned, policySlices: 0 },
      { ...valid.returned, fastForwardObserved: false },
    ])
      expect(() => validatePreview({ ...valid, returned })).toThrow(
        "production AI boundary failed",
      );
    expect(() =>
      validatePreview({
        ...valid,
        persisted: { ...valid.persisted, commandIndex: 2 },
      }),
    ).toThrow("persisted boundary failed");
    expect(() =>
      validatePreview({
        ...valid,
        ordinaryBoundary: {
          ...valid.ordinaryBoundary,
          publicPlayersLeakPrivateState: true,
        },
      }),
    ).toThrow("ordinary authority boundary failed");
    expect(() => validateColdPolicy({ ...cold(), hostTicks: 0 })).toThrow(
      "cold late-view responsiveness failed",
    );
    expect(() => validateColdPolicy({ ...cold(), decisionKind: null })).toThrow(
      "cold late-view responsiveness failed",
    );
  });
});
