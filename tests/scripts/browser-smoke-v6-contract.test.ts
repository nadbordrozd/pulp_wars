import { describe, expect, it } from "vitest";
import {
  RULESET6_SMOKE_EVIDENCE_SUBJECTS,
  RULESET6_SMOKE_TECH_IDS,
  RULESET6_SMOKE_VIEWPORTS,
  flowContractIssuesV6,
  layoutContractIssuesV6,
  type BrowserSmokeFlowEvidenceV6,
  type BrowserSmokeLayoutV6,
} from "../../scripts/browser-smoke-v6-contract";

describe("ruleset-6 browser smoke contract", () => {
  it("freezes the complete five-branch technology order", () => {
    expect(RULESET6_SMOKE_TECH_IDS).toHaveLength(25);
    expect(new Set(RULESET6_SMOKE_TECH_IDS)).toHaveLength(25);
    expect(RULESET6_SMOKE_TECH_IDS).toEqual([
      "GATHERING",
      "FARMING",
      "MILLING",
      "CRAFT",
      "GRAND_WORKS",
      "HUNTING",
      "FORESTRY",
      "SAWMILLING",
      "MARKSMANSHIP",
      "FIELDCRAFT",
      "SURVEYING",
      "MINING",
      "METALLURGY",
      "QUARRYING",
      "MASONRY",
      "SCOUTING",
      "ROADS",
      "COMMERCE",
      "RAIDING",
      "MANEUVER",
      "DRILL",
      "FORTIFICATION",
      "EXPLOSIVES",
      "MEDICINE",
      "RECOVERY",
    ]);
  });

  it("accepts real DPR backing and fixed map with responsive overlay regions", () => {
    expect(
      layoutContractIssuesV6(
        layout(1440, 1000, 1, false),
        RULESET6_SMOKE_VIEWPORTS.desktop,
      ),
    ).toEqual([]);
    expect(
      layoutContractIssuesV6(
        layout(390, 844, 2, true),
        RULESET6_SMOKE_VIEWPORTS.mobile,
      ),
    ).toEqual([]);
  });

  it("rejects overflow, false DPR, bad anchoring, incomplete AI, and inexact resume", () => {
    const brokenLayout: BrowserSmokeLayoutV6 = {
      ...layout(390, 844, 2, true),
      documentScrollWidth: 410,
      canvas: {
        ...layout(390, 844, 2, true).canvas,
        backingWidth: 390,
      },
      dock: { x: 0, y: 300, width: 390, height: 300 },
    };
    expect(
      layoutContractIssuesV6(brokenLayout, RULESET6_SMOKE_VIEWPORTS.mobile),
    ).toEqual(
      expect.arrayContaining([
        "document has horizontal overflow",
        "Canvas backing store does not match CSS size and DPR",
        "dock is not bottom anchored",
      ]),
    );

    const flow = validFlow();
    const broken: BrowserSmokeFlowEvidenceV6 = {
      ...flow,
      turnReturn: { ...flow.turnReturn, aiAcceptedCommands: 0 },
      resume: { commandIndex: 4, stateHash: "different" },
      screenshots: flow.screenshots.map((artifact, index) =>
        index === 0 ? { ...artifact, sha256: "not-a-sha" } : artifact,
      ),
    };
    expect(flowContractIssuesV6(broken)).toEqual(
      expect.arrayContaining([
        "AI accepted no commands before returning the turn",
        "reload/resume did not preserve the exact boundary",
        "unit-context-desktop has invalid evidence metadata",
      ]),
    );
  });
});

function validFlow(): BrowserSmokeFlowEvidenceV6 {
  return {
    faction: "ORIGINAL",
    factionTreeId: "ORIGINAL_BASELINE",
    seed: 42,
    launch: {
      phase: "ACTIVE",
      transitioning: false,
      commandIndex: 0,
      stateHash: "launch",
      faction: "ORIGINAL",
      factionTreeId: "ORIGINAL_BASELINE",
      seed: 42,
      activeIsHuman: true,
      offered: [],
    },
    deterministicRestartHash: "launch",
    technologyIds: RULESET6_SMOKE_TECH_IDS,
    exactCommand: {
      encoded: '{"kind":"WAIT","unitId":1}',
      beforeIndex: 0,
      afterIndex: 1,
      afterHash: "wait",
    },
    turnReturn: {
      commandIndex: 7,
      stateHash: "return",
      aiAcceptedCommands: 5,
    },
    resume: { commandIndex: 7, stateHash: "return" },
    acceptance: {
      contextual: {
        selectedExactUnit: true,
        selectedExactCity: true,
        selectedExactTile: true,
        isolatedUnitActions: true,
        isolatedCityActions: true,
        isolatedTileActions: true,
        captureVillageSymbol: true,
        factionCorrectTrainSymbol: true,
        moveButtonCount: 0,
        attackButtonCount: 0,
        exactMoveAccepted: true,
        exactAttackAccepted: true,
      },
      technology: {
        mainResearchButtonCount: 0,
        mainContextCommandCount: 0,
        branchCount: 5,
        cardCount: 25,
        detailIsModal: true,
        exactResearchAccepted: true,
        researchedDetailRetained: true,
        backRestoredMatchFocus: true,
      },
      mandatoryChoice: {
        kind: "CITY_REWARD",
        position: "Choice 1 of 1",
        authoritativeFirst: true,
        blocksOutsideInput: true,
        desktopFits: true,
        mobileFits: true,
        exactChoiceAccepted: true,
      },
      readiness: {
        fullDesktopChangedPixels: 100,
        fullMobileChangedPixels: 200,
        reducedDesktopChangedPixels: 0,
        reducedMobileChangedPixels: 0,
        handledChangedPixels: 0,
      },
    },
    desktop: layout(1440, 1000, 1, false),
    mobile: layout(390, 844, 2, true),
    screenshots: RULESET6_SMOKE_EVIDENCE_SUBJECTS.flatMap((subject) => {
      const viewport = subject.endsWith("-desktop")
        ? RULESET6_SMOKE_VIEWPORTS.desktop
        : RULESET6_SMOKE_VIEWPORTS.mobile;
      return ([1, 2] as const).map((inspectionScale) => ({
        path: `original-${subject}-${inspectionScale}.png`,
        bytes: 1,
        sha256: "a".repeat(64),
        width: viewport.width * viewport.dpr * inspectionScale,
        height: viewport.height * viewport.dpr * inspectionScale,
        viewport: {
          width: viewport.width,
          height: viewport.height,
          dpr: viewport.dpr,
        },
        inspectionScale,
        subject: `ORIGINAL ${subject}`,
      }));
    }),
  };
}

function layout(
  width: number,
  height: number,
  dpr: number,
  mobile: boolean,
): BrowserSmokeLayoutV6 {
  const hudHeight = mobile ? 130 : 70;
  const dockHeight = mobile ? 300 : 260;
  const dock = { x: 0, y: height - dockHeight, width, height: dockHeight };
  const map = { x: 0, y: hudHeight, width, height: height - hudHeight };
  return {
    viewport: { width, height, dpr },
    documentClientWidth: width,
    documentScrollWidth: width,
    shell: { x: 0, y: 0, width, height },
    hud: { x: 0, y: 0, width, height: hudHeight },
    map,
    dock,
    canvas: {
      cssWidth: map.width,
      cssHeight: map.height,
      backingWidth: map.width * dpr,
      backingHeight: map.height * dpr,
      role: "application",
      interactive: "true",
    },
  };
}
