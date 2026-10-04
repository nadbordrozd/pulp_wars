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
        /await replaceSeedInput\(connection, "0"\);\s*await launchWithFastForward\(connection\)/g,
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
    // Beam Down: the button and the passenger in the dock, then a tile on
    // the board with Tab and Enter (bead pulp_wars-b5f.8: the dock names
    // no tile, and the board's targets are named without coordinates).
    const beam = probe.indexOf(
      `await pointerClick(connection, '[data-action="martian-beam-down"]')`,
    );
    expect(beam).toBeGreaterThan(preview);
    // `pulp_wars-1wy.3`: the Grunt is picked by its own passenger button
    // (units within two tiles of the Saucer are passengers too).
    const passenger = probe.indexOf(
      `await pointerClick(connection, beamPassenger)`,
    );
    expect(passenger).toBeGreaterThan(beam);
    expect(probe).toContain(`'[data-action="beam-passenger-'`);
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
    // The setup's seven faction options, Ice Folk sixth (pulp_wars-7g3.6)
    // and Dwarf last (pulp_wars-78i.6).
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
    // The Sled moves into reach, aims its Bolas and throws it from the dock.
    const bolas = probe.indexOf(
      `await pointerClick(connection, '[data-action="ice-folk-bolas"]')`,
    );
    expect(bolas).toBeGreaterThan(-1);
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
      source.indexOf("async function fileSha256("),
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
    expect(probe).toContain("started.units !== 10");
    expect(probe).toContain("started.roles !== 10");
    expect(probe).toContain("started.cities !== 3");
    expect(probe).toContain("started.technologies !== 23");
    expect(probe).toContain("started.unexplored !== 0");
    expect(probe).toContain(
      'await capture(connection, "showcase-launch-desktop.png")',
    );
    const endTurn = probe.indexOf(
      `await pointerClick(connection, '[data-action="end-turn"]')`,
    );
    expect(endTurn).toBeGreaterThan(probe.indexOf("started.units !== 10"));
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
    expect(probe).toContain("table.cells !== 78");
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
    // one revision-18 Showcase capture.
    expect(source.match(/await capture\(/g)).toHaveLength(22);
    expect(source).toContain("async function probeAfflictionFixture(");
    expect(source).not.toContain("Emulation.setDeviceMetricsOverride");
    expect(source).not.toContain("mobile-ai-return-390-dpr2.png");
    expect(source).toContain("await stopBrowser(browser)");
    expect(source).toContain("await rm(userDataFs");
  });

  it("replaces the seed using the browser edit command on every host", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    expect(
      source.match(/await replaceSeedInput\(connection, "0"\)/g),
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
      humanCoins: 5,
      commandIndex: 0,
      projectedViewerId: 1,
    },
    returned: {
      viewerId: 1,
      activePlayerId: 1,
      humanCoins: 7,
      commandIndex: 3,
      policySlices: 9,
      maximumSliceMilliseconds,
      fastForwardObserved: true,
      hostTicks: 2,
    },
    persisted: { version: 7, rulesetId: "pulp-wars-poc-7r37", commandIndex: 3 },
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
