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
    expect(
      source.match(/await launchWithFastForward\(connection\)/g),
    ).toHaveLength(2);
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
    expect(
      source.indexOf("await evaluate(connection, armFastForwardExpression())"),
    ).toBeLessThan(
      source.indexOf(
        "await pointerClick(connection, '[data-action=\"launch\"]')",
      ),
    );
    expect(source).toContain('"Input.dispatchMouseEvent"');
    expect(BROWSER_RELEASE_SOURCE_PATHS_V7).toContain(
      "scripts/browser-smoke-v7-controls.ts",
    );
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
    expect(source.match(/await capture\(/g)).toHaveLength(2);
    expect(source).not.toContain("Emulation.setDeviceMetricsOverride");
    expect(source).not.toContain("mobile-ai-return-390-dpr2.png");
    expect(source).toContain("await stopBrowser(browser)");
    expect(source).toContain("await rm(userDataFs");
  });

  it("replaces the seed using the browser edit command on every host", () => {
    const source = readFileSync("scripts/browser-smoke-v7.ts", "utf8");
    expect(
      source.match(/await replaceSeedInput\(connection, "0"\)/g),
    ).toHaveLength(2);
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
    persisted: { version: 7, rulesetId: "pulp-wars-poc-7r11", commandIndex: 3 },
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
