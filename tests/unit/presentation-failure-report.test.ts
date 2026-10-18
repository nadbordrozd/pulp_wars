import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRESENTATION_FAILURE_MEMORY_V7,
  notePresentationActivityV7,
  notePresentationStepV7,
  presentationFailureCountV7,
  recentPresentationFailuresV7,
  reportPresentationFailureV7,
  resetPresentationFailureMemoryV7,
  subscribePresentationFailuresV7,
} from "../../src/render/presentation-guard-v7";
import {
  failureReportBuildV7,
  formatFailureReportV7,
} from "../../src/render/failure-report-v7";
import { Ruleset7BrowserController } from "../../src/app/index";
import { RULESET_7_ID } from "../../src/engine/index";

/**
 * Bead pulp_wars-2yc.96: the presentation guard remembers the last few
 * failures it survived (error, trimmed stack, where, the step playing and
 * the last commands and events) for the player's error report.
 */

beforeEach(() => {
  resetPresentationFailureMemoryV7();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the presentation guard's failure memory", () => {
  it("remembers a failure with its step, its breadcrumbs and a trimmed stack", () => {
    notePresentationActivityV7("command MOVE");
    notePresentationActivityV7("HUMAN events UNIT_MOVED");
    notePresentationStepV7("ATTACK");
    const heard: string[] = [];
    const stop = subscribePresentationFailuresV7((failure) =>
      heard.push(failure.where),
    );
    const error = new TypeError("cannot read x");
    error.stack = [
      "TypeError: cannot read x",
      ...Array.from(
        { length: 30 },
        (_, line) => `    at frame${line} (a.js:1:${line})`,
      ),
    ].join("\n");
    const before = presentationFailureCountV7();
    reportPresentationFailureV7("a playback frame", error);
    stop();
    reportPresentationFailureV7("a playback frame", new Error("later"));
    expect(presentationFailureCountV7()).toBe(before + 2);
    expect(heard).toEqual(["a playback frame"]);
    const [failure] = recentPresentationFailuresV7();
    expect(failure).toMatchObject({
      where: "a playback frame",
      step: "ATTACK",
      name: "TypeError",
      message: "cannot read x",
      recent: ["command MOVE", "HUMAN events UNIT_MOVED"],
      count: 1,
    });
    // The message line is not repeated; twelve frames are kept.
    expect(failure?.stack?.split("\n")).toHaveLength(12);
    expect(failure?.stack?.startsWith("at frame0")).toBe(true);
    expect(failure?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("counts a failure repeated every frame once and keeps only the last five", () => {
    for (let frame = 0; frame < 60; frame += 1)
      reportPresentationFailureV7("the board's frame", new Error("broken"));
    expect(recentPresentationFailuresV7()).toHaveLength(1);
    expect(recentPresentationFailuresV7()[0]?.count).toBe(60);
    for (let index = 0; index < 8; index += 1)
      reportPresentationFailureV7(`site ${index}`, `not an error ${index}`);
    const kept = recentPresentationFailuresV7();
    expect(kept).toHaveLength(PRESENTATION_FAILURE_MEMORY_V7);
    expect(kept.map((failure) => failure.where)).toEqual([
      "site 3",
      "site 4",
      "site 5",
      "site 6",
      "site 7",
    ]);
    expect(kept[4]).toMatchObject({
      name: "string",
      message: "not an error 7",
      stack: null,
    });
  });

  it("never lets a listener's throw escape the report", () => {
    const stop = subscribePresentationFailuresV7(() => {
      throw new Error("listener broke");
    });
    expect(() =>
      reportPresentationFailureV7("a render", new Error("x")),
    ).not.toThrow();
    stop();
  });
});

describe("the error report", () => {
  it("names the build, ruleset, screen, browser and each failure, newest first", () => {
    const report = formatFailureReportV7(
      [
        {
          at: "2026-10-18T10:00:00.000Z",
          where: "a render",
          step: null,
          name: "Error",
          message: "first",
          stack: null,
          recent: [],
          count: 1,
        },
        {
          at: "2026-10-18T10:01:00.000Z",
          where: "a boundary's playback",
          step: "ATTACK",
          name: "TypeError",
          message: "second",
          stack: "at draw (app.js:1:2)",
          recent: ["command ATTACK", "HUMAN events UNIT_ATTACKED"],
          count: 3,
        },
      ],
      {
        rulesetId: RULESET_7_ID,
        build: "0.1.0 app-view-v7-Ab12.js",
        viewport: { width: 390, height: 844 },
        devicePixelRatio: 3,
        userAgent: "TestPhone/1.0",
        now: "2026-10-18T10:02:00.000Z",
      },
      4,
    );
    expect(report.split("\n")).toEqual([
      "Pulp Wars error report",
      "Time: 2026-10-18T10:02:00.000Z",
      "Build: 0.1.0 app-view-v7-Ab12.js",
      `Ruleset: ${RULESET_7_ID}`,
      "Screen: 390x844 @3x",
      "Browser: TestPhone/1.0",
      "Failures this session: 4",
      "",
      "#1 2026-10-18T10:01:00.000Z in a boundary's playback (x3)",
      "Step: ATTACK",
      "TypeError: second",
      "  at draw (app.js:1:2)",
      "Recent: command ATTACK > HUMAN events UNIT_ATTACKED",
      "",
      "#2 2026-10-18T10:00:00.000Z in a render",
      "Error: first",
    ]);
  });

  it("names the build by the package version and the bundle's file", () => {
    expect(
      failureReportBuildV7(
        "0.1.0",
        "https://example.test/pulp_wars/assets/v7-preload-boot-Cx9.js?v=1",
      ),
    ).toBe("0.1.0 v7-preload-boot-Cx9.js");
    expect(failureReportBuildV7("0.1.0", "")).toBe("0.1.0");
  });
});

describe("the exports carry the failures", () => {
  const failure = {
    at: "2026-10-18T10:01:00.000Z",
    where: "a boundary's playback",
    step: "ATTACK",
    name: "TypeError",
    message: "second",
    stack: null,
    recent: ["command ATTACK"],
    count: 1,
  } as const;

  it("puts them in the debug bundle, and none when none were given", async () => {
    const controller = new Ruleset7BrowserController({
      diagnosticNow: () => "2026-10-18T10:02:00.000Z",
    });
    const launched = await controller.launch({
      rulesetId: RULESET_7_ID,
      seed: 44,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    });
    if (!launched.ok) throw new Error(launched.diagnostic);
    const debug = controller.exportDebugBundle({
      acknowledgeHiddenInformation: true,
      presentationFailures: [failure],
    });
    if (!debug.ok) throw new Error(debug.reason);
    expect(debug.bundle.payload.presentationFailures).toEqual([failure]);
    const plain = controller.exportDebugBundle({
      acknowledgeHiddenInformation: true,
    });
    if (!plain.ok) throw new Error(plain.reason);
    expect(plain.bundle.payload.presentationFailures).toEqual([]);
    const safe = controller.exportSafeLog({ presentationFailures: [failure] });
    expect(JSON.parse(safe?.source ?? "{}")).toMatchObject({
      diagnostics: { presentationFailures: [failure] },
    });
    controller.destroy();
  });

  it("tells the host what a snapshot subscriber threw, and still swallows it", async () => {
    const heard: string[] = [];
    const controller = new Ruleset7BrowserController({
      onSubscriberFailure: (where) => heard.push(where),
    });
    let calls = 0;
    controller.subscribe(() => {
      // The first call comes from `subscribe` itself.
      calls += 1;
      if (calls > 1) throw new Error("render failed");
    });
    const launched = await controller.launch({
      rulesetId: RULESET_7_ID,
      seed: 44,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    });
    expect(launched.ok).toBe(true);
    expect(heard.length).toBeGreaterThan(0);
    expect(heard[0]).toBe("a game update subscriber");
    controller.destroy();
  });
});
