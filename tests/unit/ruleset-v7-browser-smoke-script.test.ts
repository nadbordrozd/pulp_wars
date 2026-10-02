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
    expect(probe).toContain("field.value !== 'ORIGINAL'");
    expect(probe).toContain(
      "document.querySelector('#v7-faction-${seat}')?.value === 'UNDEAD'",
    );
    expect(probe).toContain('["UNDEAD","UNDEAD"]');
    expect(probe).not.toContain("flagUrl");
  });
  it("plays a Goblin Kaboom! through the default setup and resumes the save", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeGoblinMatch("),
      source.indexOf("async function driveDefaultMatchToOutcome("),
    );

    expect(source).toContain("await probeGoblinMatch(connection)");
    expect(probe).toContain(
      'JSON.stringify(["Human", "Undead", "Goblin", "Dinosaur"])',
    );
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'GOBLIN'",
    );
    expect(probe).toContain('JSON.stringify(["GOBLIN", "ORIGINAL"])');
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
    expect(probe).toContain(`'["GOBLIN","ORIGINAL"]'`);
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
    expect(source).toContain("; Dinosaur ${dinosaur}; Showcase ${showcase}.");
    // Setup: Dinosaur is offered, and chosen with three opponents on the
    // Showcase, the one setup with a turn-1 lane and lay-able Eggs.
    expect(probe).toContain(
      'JSON.stringify(["Human", "Undead", "Goblin", "Dinosaur"])',
    );
    expect(probe).toContain(
      'await typeSelectValue(connection, "#v7-ai-count", "3")',
    );
    expect(probe).toContain(
      "document.querySelector('#v7-faction-0')?.value === 'DINOSAUR'",
    );
    expect(probe).toContain(
      'JSON.stringify(["DINOSAUR", "ORIGINAL", "ORIGINAL", "ORIGINAL"])',
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
    expect(probe).toContain(`'["DINOSAUR","ORIGINAL","ORIGINAL","ORIGINAL"]'`);
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
  it("launches the Showcase from setup, checks its pieces, ends a turn and resumes", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    const probe = source.slice(
      source.indexOf("async function probeShowcaseMatch("),
      source.indexOf("async function fileSha256("),
    );

    expect(source).toContain("await probeShowcaseMatch(connection)");
    expect(source).toContain("; Showcase ${showcase}.");
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
    // (revision 20 adds the Charge! attack preview), and one revision-18
    // Showcase capture.
    expect(source.match(/await capture\(/g)).toHaveLength(15);
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
    persisted: { version: 7, rulesetId: "pulp-wars-poc-7r21", commandIndex: 3 },
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
