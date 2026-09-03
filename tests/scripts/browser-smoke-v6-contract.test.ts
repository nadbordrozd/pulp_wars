import { describe, expect, it } from "vitest";
import {
  RULESET6_SMOKE_EVIDENCE_SUBJECTS,
  RULESET6_SMOKE_TECH_IDS,
  RULESET6_SMOKE_VIEWPORTS,
  browserSmokeReleaseEvidenceV6,
  coordinateActivationIsVisibleV6,
  coordinateActivationPanStepV6,
  contextActionLayoutIssuesV6,
  flowContractIssuesV6,
  layoutContractIssuesV6,
  technologyIconLayoutIssuesV6,
  type BrowserSmokeFlowEvidenceV6,
  type BrowserSmokeLayoutV6,
} from "../../scripts/browser-smoke-v6-contract";

describe("ruleset-6 browser smoke contract", () => {
  it("brings arbitrary offscreen square coordinates into the pointer-safe Canvas through bounded pan steps", () => {
    const canvas = { width: 390, height: 420 } as const;
    expect(
      coordinateActivationPanStepV6({ x: 195, y: 210 }, canvas),
    ).toBeNull();

    // More than the full CSS span of a 25 x 25 board at minimum zoom.
    let point = { x: 2_100, y: 2_100 };
    let steps = 0;
    while (!coordinateActivationIsVisibleV6(point, canvas)) {
      const step = coordinateActivationPanStepV6(point, canvas);
      if (step === null) throw new Error("Missing offscreen pan step");
      expect(step.start).toEqual({ x: 195, y: 210 });
      expect(step.end.x).toBeGreaterThanOrEqual(24);
      expect(step.end.x).toBeLessThanOrEqual(canvas.width - 24);
      expect(step.end.y).toBeGreaterThanOrEqual(24);
      expect(step.end.y).toBeLessThanOrEqual(canvas.height - 24);
      point = { x: point.x + step.delta.x, y: point.y + step.delta.y };
      steps += 1;
      expect(steps).toBeLessThan(32);
    }
    expect(steps).toBeGreaterThan(1);
    expect(point.x).toBeGreaterThanOrEqual(24);
    expect(point.y).toBeGreaterThanOrEqual(24);
    expect(point.x).toBeLessThanOrEqual(canvas.width - 24);
    expect(point.y).toBeLessThanOrEqual(canvas.height - 24);
  });

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

  it("normalizes only per-run screenshot encoding fields for release evidence", () => {
    const flow = validFlow();
    const evidence = { browser: "Chrome/test", flows: [flow] };
    const changedIntegrity = {
      ...evidence,
      flows: [
        {
          ...flow,
          screenshots: flow.screenshots.map((artifact) => ({
            ...artifact,
            bytes: artifact.bytes + 41,
            sha256: "b".repeat(64),
          })),
        },
      ],
    };
    expect(browserSmokeReleaseEvidenceV6(changedIntegrity)).toEqual(
      browserSmokeReleaseEvidenceV6(evidence),
    );
    expect(
      browserSmokeReleaseEvidenceV6({
        ...evidence,
        flows: [{ ...flow, seed: flow.seed + 1 }],
      }),
    ).not.toEqual(browserSmokeReleaseEvidenceV6(evidence));
    expect(
      browserSmokeReleaseEvidenceV6({
        ...evidence,
        flows: [
          {
            ...flow,
            screenshots: flow.screenshots.map((artifact, index) =>
              index === 0
                ? { ...artifact, width: artifact.width + 1 }
                : artifact,
            ),
          },
        ],
      }),
    ).not.toEqual(browserSmokeReleaseEvidenceV6(evidence));
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

  it("accepts bounded contextual controls and rejects stretching or lost touch targets", () => {
    expect(
      contextActionLayoutIssuesV6(
        contextActionLayout(1440, 1000, 1),
        RULESET6_SMOKE_VIEWPORTS.desktop,
      ),
    ).toEqual([]);
    expect(
      contextActionLayoutIssuesV6(
        contextActionLayout(390, 844, 2),
        RULESET6_SMOKE_VIEWPORTS.mobile,
      ),
    ).toEqual([]);

    const broken = contextActionLayout(390, 844, 2);
    const brokenButton = broken.buttons[0];
    if (brokenButton === undefined) throw new Error("Missing button fixture");
    expect(
      contextActionLayoutIssuesV6(
        {
          ...broken,
          artContract: { width: 64, height: 64 },
          scrollWidth: broken.clientWidth + 20,
          buttons: [
            {
              ...brokenButton,
              kind: "TRAIN",
              rect: { ...brokenButton.rect, width: 374, height: 40 },
              symbolRect: { ...brokenButton.symbolRect, width: 60, height: 64 },
              labelFontSize: 8,
            },
          ],
        },
        RULESET6_SMOKE_VIEWPORTS.mobile,
      ),
    ).toEqual(
      expect.arrayContaining([
        "context action list has horizontal overflow",
        "context action art does not use the 112 x 130 viewport",
        "TRAIN does not use the shared bounded width",
        "TRAIN is shorter than the 44px activation target",
        "TRAIN artwork does not use the shared viewport",
        "TRAIN label is not legible",
      ]),
    );
  });

  it("requires the shared loaded and contained map-size viewport for all 25 technology icons", () => {
    const valid = technologyIconLayout();
    expect(technologyIconLayoutIssuesV6(valid)).toEqual([]);
    const first = valid.icons[0];
    if (first === undefined) throw new Error("Missing technology icon fixture");
    expect(
      technologyIconLayoutIssuesV6({
        artContract: { width: 64, height: 64 },
        icons: valid.icons.map((icon, index) =>
          index === 0
            ? {
                ...first,
                symbolRect: { ...first.symbolRect, width: 64, height: 64 },
                imageRect: { ...first.symbolRect, width: 60, height: 64 },
                imageObjectFit: "cover",
                rasterLoaded: false,
              }
            : icon,
        ),
      }),
    ).toEqual(
      expect.arrayContaining([
        "technology art does not use the 112 x 130 viewport",
        "GATHERING technology raster is not loaded and contained",
      ]),
    );
    expect(
      technologyIconLayoutIssuesV6({
        ...valid,
        icons: valid.icons.slice(1),
      }),
    ).toContain(
      "technology icon layout does not cover the frozen 25-node order",
    );
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
    expect(
      flowContractIssuesV6({
        ...flow,
        coordinateActivations: flow.coordinateActivations.map((activation) => ({
          ...activation,
          before: activation.after,
        })),
      }),
    ).toContain("coordinate activation camera evidence is inconsistent");
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
    coordinateActivations: [
      {
        at: { x: 2, y: 9 },
        canvas: { width: 390, height: 420 },
        before: { x: 195, y: 840 },
        after: { x: 195, y: 210 },
        panSteps: 2,
      },
    ],
    acceptance: {
      animalVisibility: {
        visibleGameCount: 1,
        hiddenGameRedacted: true,
        huntingOwned: false,
        huntGameOffered: false,
      },
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
        identity: {
          unitDesktop: selectionIdentity("UNIT", "Fighter"),
          unitMobile: selectionIdentity("UNIT", "Fighter"),
          cityDesktop: selectionIdentity("CITY", "Original Capital"),
          cityMobile: selectionIdentity("CITY", "Original Capital"),
          tileDesktop: selectionIdentity("TILE", "Fruit"),
          tileMobile: selectionIdentity("TILE", "Fruit"),
        },
        buttonLayout: {
          unitDesktop: contextActionLayout(1440, 1000, 1),
          unitMobile: contextActionLayout(390, 844, 2),
          cityDesktop: contextActionLayout(1440, 1000, 1),
          cityMobile: contextActionLayout(390, 844, 2),
          tileDesktop: contextActionLayout(1440, 1000, 1),
          tileMobile: contextActionLayout(390, 844, 2),
        },
      },
      technology: {
        mainResearchButtonCount: 0,
        mainContextCommandCount: 0,
        branchCount: 5,
        cardCount: 25,
        topologyFaithful: true,
        compactCardContent: true,
        iconDominant: true,
        iconLayout: technologyIconLayout(),
        threeStatesAccessible: true,
        highContrastDistinct: true,
        desktopUnclipped: true,
        mobileScrollableWithoutHorizontalOverflow: true,
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

function technologyIconLayout() {
  return {
    artContract: { width: 112, height: 130 },
    icons: RULESET6_SMOKE_TECH_IDS.map((tech, index) => ({
      tech,
      symbolKind: "accepted-raster",
      assetId: `ui-tech-original-${tech.toLowerCase().replaceAll("_", "-")}`,
      symbolRect: {
        x: 8 + (index % 5) * 128,
        y: 100 + Math.floor(index / 5) * 180,
        width: 112,
        height: 130,
      },
      imageRect: {
        x: 8 + (index % 5) * 128,
        y: 100 + Math.floor(index / 5) * 180,
        width: 112,
        height: 130,
      },
      imageObjectFit: "contain",
      rasterLoaded: true,
    })),
  } as const;
}

function selectionIdentity(kind: "UNIT" | "CITY" | "TILE", title: string) {
  return {
    kind,
    title,
    detail: kind === "UNIT" ? "10/10 HP" : "",
    ariaLabel: `${title} selected.`,
    assetId: `fixture-${kind.toLowerCase()}`,
    symbolKind: "accepted-raster",
    rect: { x: 8, y: 700, width: 180, height: 130 },
    artRect: { x: 8, y: 700, width: 112, height: 130 },
  } as const;
}

function contextActionLayout(width: number, height: number, dpr: number) {
  const listWidth = width - 16;
  return {
    viewport: { width, height, dpr },
    list: { x: 8, y: height - 190, width: listWidth, height: 174 },
    clientWidth: listWidth,
    scrollWidth: listWidth,
    flexWrap: "wrap",
    contractWidth: 176,
    artContract: { width: 112, height: 130 },
    buttons: [
      {
        kind: "WAIT",
        rect: { x: 8, y: height - 190, width: 176, height: 174 },
        symbolKind: "accepted-raster",
        assetId: "ui-action-wait",
        symbolRect: { x: 40, y: height - 180, width: 112, height: 130 },
        imageObjectFit: "contain",
        rasterLoaded: true,
        labelRect: { x: 16, y: height - 44, width: 160, height: 20 },
        labelFontSize: 12.64,
      },
    ],
  } as const;
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
