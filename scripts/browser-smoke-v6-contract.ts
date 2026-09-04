export const RULESET6_SMOKE_TECH_IDS = [
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
] as const;

export const RULESET6_SMOKE_VIEWPORTS = {
  desktop: { width: 1440, height: 1000, dpr: 1, mobile: false },
  mobile: { width: 390, height: 844, dpr: 2, mobile: true },
} as const;

export interface BrowserSmokePointV6 {
  readonly x: number;
  readonly y: number;
}

export interface BrowserSmokeActivationPanStepV6 {
  readonly delta: BrowserSmokePointV6;
  readonly start: BrowserSmokePointV6;
  readonly end: BrowserSmokePointV6;
}

export interface BrowserSmokeCoordinateActivationV6 {
  readonly at: BrowserSmokePointV6;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly before: BrowserSmokePointV6;
  readonly after: BrowserSmokePointV6;
  readonly panSteps: number;
}

export const RULESET6_ACTIVATION_MARGIN = 24;

/**
 * Returns one real pointer-drag step that moves an offscreen projected anchor
 * toward the center while keeping the drag endpoint inside the Canvas. Reapply
 * after the host updates its camera until the coordinate enters the safe area.
 */
export function coordinateActivationPanStepV6(
  point: BrowserSmokePointV6,
  canvas: { readonly width: number; readonly height: number },
  margin = RULESET6_ACTIVATION_MARGIN,
): BrowserSmokeActivationPanStepV6 | null {
  const safeMargin = Math.max(
    0,
    Math.min(margin, canvas.width / 2, canvas.height / 2),
  );
  if (
    point.x >= safeMargin &&
    point.y >= safeMargin &&
    point.x <= canvas.width - safeMargin &&
    point.y <= canvas.height - safeMargin
  ) {
    return null;
  }
  const start = { x: canvas.width / 2, y: canvas.height / 2 };
  const delta = {
    x: clamp(
      start.x - point.x,
      safeMargin - start.x,
      canvas.width - safeMargin - start.x,
    ),
    y: clamp(
      start.y - point.y,
      safeMargin - start.y,
      canvas.height - safeMargin - start.y,
    ),
  };
  return {
    delta,
    start,
    end: { x: start.x + delta.x, y: start.y + delta.y },
  };
}

export function coordinateActivationIsVisibleV6(
  point: BrowserSmokePointV6,
  canvas: { readonly width: number; readonly height: number },
  margin = RULESET6_ACTIVATION_MARGIN,
): boolean {
  return coordinateActivationPanStepV6(point, canvas, margin) === null;
}

export const RULESET6_SMOKE_EVIDENCE_SUBJECTS = [
  "unit-context-desktop",
  "unit-context-mobile",
  "reward-desktop",
  "city-train-mobile",
  "city-train-desktop",
  "tile-context-desktop",
  "tile-context-mobile",
  "technology-overview-desktop",
  "technology-overview-mobile",
  "technology-contrast-mobile",
  "technology-detail-mobile",
  "reduced-motion-desktop",
  "high-contrast-mobile",
] as const;

export const RULESET6_SMOKE_CANDY_EVIDENCE_SUBJECTS = [
  "ability-detail-desktop",
  "ability-detail-mobile",
] as const;

export interface BrowserSmokeRectV6 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BrowserSmokeLayoutV6 {
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
  };
  readonly documentClientWidth: number;
  readonly documentScrollWidth: number;
  readonly shell: BrowserSmokeRectV6;
  readonly hud: BrowserSmokeRectV6;
  readonly map: BrowserSmokeRectV6;
  readonly dock: BrowserSmokeRectV6;
  readonly canvas: {
    readonly cssWidth: number;
    readonly cssHeight: number;
    readonly backingWidth: number;
    readonly backingHeight: number;
    readonly role: string | null;
    readonly interactive: string | null;
  };
}

export interface BrowserSmokeContextActionLayoutV6 {
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
  };
  readonly list: BrowserSmokeRectV6;
  readonly clientWidth: number;
  readonly scrollWidth: number;
  readonly flexWrap: string;
  readonly contractWidth: number;
  readonly artContract: {
    readonly width: number;
    readonly height: number;
  };
  readonly buttons: readonly {
    readonly kind: string;
    readonly rect: BrowserSmokeRectV6;
    readonly symbolKind: string | null;
    readonly assetId: string | null;
    readonly symbolRect: BrowserSmokeRectV6;
    readonly imageObjectFit: string | null;
    readonly rasterLoaded: boolean | null;
    readonly labelRect: BrowserSmokeRectV6;
    readonly labelFontSize: number;
  }[];
}

export interface BrowserSmokeTechnologyIconLayoutV6 {
  readonly artContract: {
    readonly width: number;
    readonly height: number;
  };
  readonly icons: readonly {
    readonly tech: string | null;
    readonly symbolKind: string | null;
    readonly assetId: string | null;
    readonly symbolRect: BrowserSmokeRectV6;
    readonly imageRect: BrowserSmokeRectV6 | null;
    readonly imageObjectFit: string | null;
    readonly rasterLoaded: boolean | null;
  }[];
}

export interface BrowserSmokeSelectionIdentityV6 {
  readonly kind: string | null;
  readonly title: string;
  readonly detail: string;
  readonly ariaLabel: string | null;
  readonly assetId: string | null;
  readonly symbolKind: string | null;
  readonly rect: BrowserSmokeRectV6;
  readonly artRect: BrowserSmokeRectV6;
}

export interface BrowserSmokeBoundaryV6 {
  readonly phase: string;
  readonly transitioning: boolean;
  readonly commandIndex: number;
  readonly stateHash: string | null;
  readonly faction: string | null;
  readonly factionTreeId: string | null;
  readonly seed: number | null;
  readonly activeIsHuman: boolean;
  readonly offered: readonly {
    readonly kind: string;
    readonly encoded: string;
  }[];
}

export interface BrowserSmokeArtifactV6 {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
  };
  readonly inspectionScale: 1 | 2;
  readonly subject: string;
}

/**
 * Browser screenshot bytes are integrity-checked against their manifest on
 * every audit, but Chromium may vary a handful of antialiased edge pixels
 * between otherwise identical headless processes. Keep the checked release
 * fingerprint sensitive to the complete behavior/layout record and artifact
 * identity while excluding only the per-run screenshot encoding fields.
 */
export function browserSmokeReleaseEvidenceV6(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return value;
  const evidence = value as Record<string, unknown>;
  if (!Array.isArray(evidence.flows)) return value;
  return {
    ...evidence,
    flows: evidence.flows.map((flow) => {
      if (flow === null || typeof flow !== "object" || Array.isArray(flow))
        return flow;
      const flowRecord = flow as Record<string, unknown>;
      if (!Array.isArray(flowRecord.screenshots)) return flow;
      return {
        ...flowRecord,
        screenshots: flowRecord.screenshots.map((artifact) => {
          if (
            artifact === null ||
            typeof artifact !== "object" ||
            Array.isArray(artifact)
          )
            return artifact;
          const releaseEvidence = {
            ...(artifact as Record<string, unknown>),
          };
          delete releaseEvidence.bytes;
          delete releaseEvidence.sha256;
          return releaseEvidence;
        }),
      };
    }),
  };
}

export interface BrowserSmokeIntegratedAcceptanceV6 {
  readonly animalVisibility: {
    readonly visibleGameCount: number;
    readonly hiddenGameRedacted: boolean;
    readonly huntingOwned: boolean;
    readonly huntGameOffered: boolean;
  };
  readonly contextual: {
    readonly selectedExactUnit: boolean;
    readonly selectedExactCity: boolean;
    readonly selectedExactTile: boolean;
    readonly isolatedUnitActions: boolean;
    readonly isolatedCityActions: boolean;
    readonly isolatedTileActions: boolean;
    readonly captureVillageSymbol: boolean;
    readonly factionCorrectTrainSymbol: boolean;
    readonly moveButtonCount: number;
    readonly attackButtonCount: number;
    readonly exactMoveAccepted: boolean;
    readonly exactAttackAccepted: boolean;
    readonly identity: {
      readonly unitDesktop: BrowserSmokeSelectionIdentityV6;
      readonly unitMobile: BrowserSmokeSelectionIdentityV6;
      readonly cityDesktop: BrowserSmokeSelectionIdentityV6;
      readonly cityMobile: BrowserSmokeSelectionIdentityV6;
      readonly tileDesktop: BrowserSmokeSelectionIdentityV6;
      readonly tileMobile: BrowserSmokeSelectionIdentityV6;
    };
    readonly buttonLayout: {
      readonly unitDesktop: BrowserSmokeContextActionLayoutV6;
      readonly unitMobile: BrowserSmokeContextActionLayoutV6;
      readonly cityDesktop: BrowserSmokeContextActionLayoutV6;
      readonly cityMobile: BrowserSmokeContextActionLayoutV6;
      readonly tileDesktop: BrowserSmokeContextActionLayoutV6;
      readonly tileMobile: BrowserSmokeContextActionLayoutV6;
    };
    readonly abilityDetail: {
      readonly ability: "CANDIFY";
      readonly desktopOpen: boolean;
      readonly mobileOpen: boolean;
      readonly viewOnly: boolean;
      readonly outsideInputBlocked: boolean;
      readonly desktopFits: boolean;
      readonly mobileFits: boolean;
      readonly closes: boolean;
      readonly restoresTagFocus: boolean;
      readonly restoresDock: boolean;
      readonly exactBoundaryPreserved: boolean;
    } | null;
  };
  readonly technology: {
    readonly mainResearchButtonCount: number;
    readonly mainContextCommandCount: number;
    readonly branchCount: number;
    readonly cardCount: number;
    readonly topologyFaithful: boolean;
    readonly compactCardContent: boolean;
    readonly iconDominant: boolean;
    readonly iconLayout: BrowserSmokeTechnologyIconLayoutV6;
    readonly threeStatesAccessible: boolean;
    readonly highContrastDistinct: boolean;
    readonly desktopUnclipped: boolean;
    readonly mobileScrollableWithoutHorizontalOverflow: boolean;
    readonly detailIsModal: boolean;
    readonly exactResearchAccepted: boolean;
    readonly researchedDetailRetained: boolean;
    readonly backRestoredMatchFocus: boolean;
  };
  readonly mandatoryChoice: {
    readonly kind: "CITY_REWARD";
    readonly position: string;
    readonly authoritativeFirst: boolean;
    readonly blocksOutsideInput: boolean;
    readonly desktopFits: boolean;
    readonly mobileFits: boolean;
    readonly exactChoiceAccepted: boolean;
  };
  readonly readiness: {
    readonly fullDesktopChangedPixels: number;
    readonly fullMobileChangedPixels: number;
    readonly reducedDesktopChangedPixels: number;
    readonly reducedMobileChangedPixels: number;
    readonly handledChangedPixels: number;
  };
}

export interface BrowserSmokeFlowEvidenceV6 {
  readonly faction: "ORIGINAL" | "CANDY";
  readonly factionTreeId: "ORIGINAL_BASELINE" | "CANDY_BASELINE_V1";
  readonly seed: number;
  readonly launch: BrowserSmokeBoundaryV6;
  readonly deterministicRestartHash: string;
  readonly technologyIds: readonly string[];
  readonly exactCommand: {
    readonly encoded: string;
    readonly beforeIndex: number;
    readonly afterIndex: number;
    readonly afterHash: string;
  };
  readonly turnReturn: {
    readonly commandIndex: number;
    readonly stateHash: string;
    readonly aiAcceptedCommands: number;
  };
  readonly resume: {
    readonly commandIndex: number;
    readonly stateHash: string;
  };
  readonly coordinateActivations: readonly BrowserSmokeCoordinateActivationV6[];
  readonly acceptance: BrowserSmokeIntegratedAcceptanceV6;
  readonly desktop: BrowserSmokeLayoutV6;
  readonly mobile: BrowserSmokeLayoutV6;
  readonly screenshots: readonly BrowserSmokeArtifactV6[];
}

export function layoutContractIssuesV6(
  layout: BrowserSmokeLayoutV6,
  expected: (typeof RULESET6_SMOKE_VIEWPORTS)[keyof typeof RULESET6_SMOKE_VIEWPORTS],
): readonly string[] {
  const issues: string[] = [];
  if (
    layout.viewport.width !== expected.width ||
    layout.viewport.height !== expected.height ||
    layout.viewport.dpr !== expected.dpr
  ) {
    issues.push("viewport metrics do not match the requested contract");
  }
  if (layout.documentScrollWidth > layout.documentClientWidth) {
    issues.push("document has horizontal overflow");
  }
  const tolerance = 1;
  if (
    Math.abs(
      layout.canvas.backingWidth - layout.canvas.cssWidth * expected.dpr,
    ) > tolerance ||
    Math.abs(
      layout.canvas.backingHeight - layout.canvas.cssHeight * expected.dpr,
    ) > tolerance
  ) {
    issues.push("Canvas backing store does not match CSS size and DPR");
  }
  if (layout.canvas.role !== "application") {
    issues.push("Canvas is missing its application role");
  }
  if (layout.canvas.interactive !== "true") {
    issues.push("Canvas is not interactive");
  }
  for (const [name, rect] of Object.entries({
    shell: layout.shell,
    hud: layout.hud,
    map: layout.map,
    dock: layout.dock,
  })) {
    if (rect.width <= 0 || rect.height <= 0) {
      issues.push(`${name} has no rendered area`);
    }
    if (
      rect.x < -tolerance ||
      rect.y < -tolerance ||
      rect.x + rect.width > expected.width + tolerance ||
      rect.y + rect.height > expected.height + tolerance
    ) {
      issues.push(`${name} escapes the viewport`);
    }
  }
  if (
    Math.abs(layout.map.x) > tolerance ||
    Math.abs(layout.map.y - (layout.hud.y + layout.hud.height)) > tolerance ||
    Math.abs(layout.map.width - expected.width) > tolerance ||
    Math.abs(layout.map.y + layout.map.height - expected.height) > tolerance
  ) {
    issues.push("Canvas map does not fill the fixed region below the HUD");
  }
  if (Math.abs(layout.hud.y) > tolerance) {
    issues.push("HUD is not pinned to the viewport top");
  }
  if (
    Math.abs(layout.dock.y + layout.dock.height - expected.height) > tolerance
  ) {
    issues.push("dock is not bottom anchored");
  }
  if (intersectionArea(layout.hud, layout.dock) > tolerance) {
    issues.push("HUD and dock overlap each other");
  }
  if (
    Math.abs(layout.dock.x) > tolerance ||
    Math.abs(layout.dock.width - expected.width) > tolerance
  ) {
    issues.push("dock does not span the viewport");
  }
  return issues;
}

export function flowContractIssuesV6(
  flow: BrowserSmokeFlowEvidenceV6,
): readonly string[] {
  const issues: string[] = [];
  const expectedTree =
    flow.faction === "ORIGINAL" ? "ORIGINAL_BASELINE" : "CANDY_BASELINE_V1";
  if (flow.factionTreeId !== expectedTree) issues.push("wrong faction tree");
  if (
    flow.launch.faction !== flow.faction ||
    flow.launch.factionTreeId !== flow.factionTreeId ||
    flow.launch.seed !== flow.seed
  ) {
    issues.push("launch boundary does not match the requested setup");
  }
  if (flow.launch.stateHash !== flow.deterministicRestartHash) {
    issues.push("restart did not reproduce the launch hash");
  }
  if (
    JSON.stringify(flow.technologyIds) !==
    JSON.stringify(RULESET6_SMOKE_TECH_IDS)
  ) {
    issues.push("technology tree is not the frozen 25-node order");
  }
  if (flow.exactCommand.afterIndex !== flow.exactCommand.beforeIndex + 1) {
    issues.push("exact DOM command did not advance one boundary");
  }
  if (flow.turnReturn.aiAcceptedCommands <= 0) {
    issues.push("AI accepted no commands before returning the turn");
  }
  if (
    flow.resume.commandIndex !== flow.turnReturn.commandIndex ||
    flow.resume.stateHash !== flow.turnReturn.stateHash
  ) {
    issues.push("reload/resume did not preserve the exact boundary");
  }
  if (!flow.coordinateActivations.some(({ panSteps }) => panSteps > 0)) {
    issues.push("square-grid smoke exercised no offscreen camera pan");
  }
  for (const activation of flow.coordinateActivations) {
    if (
      !coordinateActivationIsVisibleV6(activation.after, activation.canvas) ||
      (activation.panSteps > 0 &&
        coordinateActivationIsVisibleV6(activation.before, activation.canvas))
    ) {
      issues.push("coordinate activation camera evidence is inconsistent");
      break;
    }
  }
  issues.push(
    ...layoutContractIssuesV6(
      flow.desktop,
      RULESET6_SMOKE_VIEWPORTS.desktop,
    ).map((issue) => `desktop: ${issue}`),
    ...layoutContractIssuesV6(flow.mobile, RULESET6_SMOKE_VIEWPORTS.mobile).map(
      (issue) => `mobile: ${issue}`,
    ),
  );
  const evidenceSubjects = [
    ...RULESET6_SMOKE_EVIDENCE_SUBJECTS,
    ...(flow.faction === "CANDY" ? RULESET6_SMOKE_CANDY_EVIDENCE_SUBJECTS : []),
  ];
  if (flow.screenshots.length !== evidenceSubjects.length * 2) {
    issues.push("flow does not include the bounded native/enlarged review set");
  }
  const screenshotPaths = new Set(flow.screenshots.map(({ path }) => path));
  if (screenshotPaths.size !== flow.screenshots.length) {
    issues.push("evidence paths are not unique");
  }
  for (const subject of evidenceSubjects) {
    const pair = flow.screenshots.filter((artifact) =>
      artifact.path.includes(`-${subject}-`),
    );
    const expectedViewport = subject.endsWith("-desktop")
      ? RULESET6_SMOKE_VIEWPORTS.desktop
      : RULESET6_SMOKE_VIEWPORTS.mobile;
    if (
      pair.length !== 2 ||
      !pair.some(({ inspectionScale }) => inspectionScale === 1) ||
      !pair.some(({ inspectionScale }) => inspectionScale === 2)
    ) {
      issues.push(`${subject} is missing its native/enlarged evidence pair`);
      continue;
    }
    for (const artifact of pair) {
      const { inspectionScale, viewport } = artifact;
      if (
        artifact.bytes <= 0 ||
        !artifact.subject.includes(flow.faction) ||
        !/^[a-f0-9]{64}$/.test(artifact.sha256) ||
        viewport.width !== expectedViewport.width ||
        viewport.height !== expectedViewport.height ||
        viewport.dpr !== expectedViewport.dpr ||
        artifact.width !==
          expectedViewport.width * expectedViewport.dpr * inspectionScale ||
        artifact.height !==
          expectedViewport.height * expectedViewport.dpr * inspectionScale
      ) {
        issues.push(`${subject} has invalid evidence metadata`);
        break;
      }
    }
  }
  const animalVisibility = flow.acceptance.animalVisibility;
  if (
    animalVisibility.visibleGameCount < 1 ||
    !animalVisibility.hiddenGameRedacted ||
    animalVisibility.huntingOwned ||
    animalVisibility.huntGameOffered
  ) {
    issues.push("Animal visibility/Hunting gate acceptance is incomplete");
  }
  const contextual = flow.acceptance.contextual;
  if (
    !contextual.selectedExactUnit ||
    !contextual.selectedExactCity ||
    !contextual.selectedExactTile ||
    !contextual.isolatedUnitActions ||
    !contextual.isolatedCityActions ||
    !contextual.isolatedTileActions ||
    !contextual.captureVillageSymbol ||
    !contextual.factionCorrectTrainSymbol ||
    contextual.moveButtonCount !== 0 ||
    contextual.attackButtonCount !== 0 ||
    !contextual.exactMoveAccepted ||
    !contextual.exactAttackAccepted
  ) {
    issues.push("contextual unit/city/tile acceptance is incomplete");
  }
  const abilityDetail = contextual.abilityDetail;
  if (
    flow.faction === "CANDY"
      ? abilityDetail === null ||
        abilityDetail.ability !== "CANDIFY" ||
        !abilityDetail.desktopOpen ||
        !abilityDetail.mobileOpen ||
        !abilityDetail.viewOnly ||
        !abilityDetail.outsideInputBlocked ||
        !abilityDetail.desktopFits ||
        !abilityDetail.mobileFits ||
        !abilityDetail.closes ||
        !abilityDetail.restoresTagFocus ||
        !abilityDetail.restoresDock ||
        !abilityDetail.exactBoundaryPreserved
      : abilityDetail !== null
  ) {
    issues.push("Candy ability-detail acceptance is incomplete");
  }
  for (const [name, identity, expectedKind] of [
    ["unit desktop", contextual.identity.unitDesktop, "UNIT"],
    ["unit mobile", contextual.identity.unitMobile, "UNIT"],
    ["city desktop", contextual.identity.cityDesktop, "CITY"],
    ["city mobile", contextual.identity.cityMobile, "CITY"],
    ["tile desktop", contextual.identity.tileDesktop, "TILE"],
    ["tile mobile", contextual.identity.tileMobile, "TILE"],
  ] as const) {
    if (
      identity.kind !== expectedKind ||
      identity.title.length === 0 ||
      identity.ariaLabel === null ||
      identity.assetId === null ||
      identity.symbolKind !== "accepted-raster" ||
      /\b\d+,\d+\b/.test(
        `${identity.title} ${identity.detail} ${identity.ariaLabel}`,
      ) ||
      identity.rect.width <= 0 ||
      identity.rect.height <= 0 ||
      Math.abs(identity.artRect.width - 112) > 1 ||
      Math.abs(identity.artRect.height - 130) > 1
    ) {
      issues.push(`${name} selection identity is incomplete`);
    }
  }
  for (const [name, layout, expected] of [
    [
      "unit desktop",
      contextual.buttonLayout.unitDesktop,
      RULESET6_SMOKE_VIEWPORTS.desktop,
    ],
    [
      "unit mobile",
      contextual.buttonLayout.unitMobile,
      RULESET6_SMOKE_VIEWPORTS.mobile,
    ],
    [
      "city desktop",
      contextual.buttonLayout.cityDesktop,
      RULESET6_SMOKE_VIEWPORTS.desktop,
    ],
    [
      "city mobile",
      contextual.buttonLayout.cityMobile,
      RULESET6_SMOKE_VIEWPORTS.mobile,
    ],
    [
      "tile desktop",
      contextual.buttonLayout.tileDesktop,
      RULESET6_SMOKE_VIEWPORTS.desktop,
    ],
    [
      "tile mobile",
      contextual.buttonLayout.tileMobile,
      RULESET6_SMOKE_VIEWPORTS.mobile,
    ],
  ] as const) {
    issues.push(
      ...contextActionLayoutIssuesV6(layout, expected).map(
        (issue) => `${name}: ${issue}`,
      ),
    );
  }
  const technology = flow.acceptance.technology;
  const technologyIconIssues = technologyIconLayoutIssuesV6(
    technology.iconLayout,
  );
  if (
    technology.mainResearchButtonCount !== 0 ||
    technology.mainContextCommandCount !== 0 ||
    technology.branchCount !== 5 ||
    technology.cardCount !== RULESET6_SMOKE_TECH_IDS.length ||
    !technology.topologyFaithful ||
    !technology.compactCardContent ||
    !technology.iconDominant ||
    technologyIconIssues.length > 0 ||
    !technology.threeStatesAccessible ||
    !technology.highContrastDistinct ||
    !technology.desktopUnclipped ||
    !technology.mobileScrollableWithoutHorizontalOverflow ||
    !technology.detailIsModal ||
    !technology.exactResearchAccepted ||
    !technology.researchedDetailRetained ||
    !technology.backRestoredMatchFocus
  ) {
    issues.push("dedicated technology-screen acceptance is incomplete");
  }
  const choice = flow.acceptance.mandatoryChoice;
  if (
    choice.kind !== "CITY_REWARD" ||
    !/^Choice 1 of [1-9][0-9]*$/.test(choice.position) ||
    !choice.authoritativeFirst ||
    !choice.blocksOutsideInput ||
    !choice.desktopFits ||
    !choice.mobileFits ||
    !choice.exactChoiceAccepted
  ) {
    issues.push("mandatory city-reward acceptance is incomplete");
  }
  const readiness = flow.acceptance.readiness;
  if (
    readiness.fullDesktopChangedPixels <= 0 ||
    readiness.fullMobileChangedPixels <= 0 ||
    readiness.reducedDesktopChangedPixels !== 0 ||
    readiness.reducedMobileChangedPixels !== 0 ||
    readiness.handledChangedPixels !== 0
  ) {
    issues.push("readiness motion acceptance is incomplete");
  }
  return issues;
}

export function technologyIconLayoutIssuesV6(
  layout: BrowserSmokeTechnologyIconLayoutV6,
): readonly string[] {
  const issues: string[] = [];
  const tolerance = 1;
  if (
    Math.abs(layout.artContract.width - 112) > tolerance ||
    Math.abs(layout.artContract.height - 130) > tolerance
  ) {
    issues.push("technology art does not use the 112 x 130 viewport");
  }
  const ids = layout.icons.map(({ tech }) => tech);
  if (
    ids.length !== RULESET6_SMOKE_TECH_IDS.length ||
    JSON.stringify(ids) !== JSON.stringify(RULESET6_SMOKE_TECH_IDS)
  ) {
    issues.push(
      "technology icon layout does not cover the frozen 25-node order",
    );
  }
  for (const icon of layout.icons) {
    const label = icon.tech ?? "unknown technology";
    if (
      Math.abs(icon.symbolRect.width - layout.artContract.width) > tolerance ||
      Math.abs(icon.symbolRect.height - layout.artContract.height) > tolerance
    ) {
      issues.push(
        `${label} technology artwork does not use the shared viewport`,
      );
    }
    if (
      icon.symbolKind !== "accepted-raster" ||
      icon.assetId === null ||
      icon.imageRect === null ||
      icon.imageObjectFit !== "contain" ||
      icon.rasterLoaded !== true
    ) {
      issues.push(`${label} technology raster is not loaded and contained`);
      continue;
    }
    if (
      Math.abs(icon.imageRect.width - icon.symbolRect.width) > tolerance ||
      Math.abs(icon.imageRect.height - icon.symbolRect.height) > tolerance
    ) {
      issues.push(`${label} technology raster does not fill its viewport box`);
    }
  }
  return issues;
}

export function contextActionLayoutIssuesV6(
  layout: BrowserSmokeContextActionLayoutV6,
  expected: (typeof RULESET6_SMOKE_VIEWPORTS)[keyof typeof RULESET6_SMOKE_VIEWPORTS],
): readonly string[] {
  const issues: string[] = [];
  const tolerance = 1;
  if (
    layout.viewport.width !== expected.width ||
    layout.viewport.height !== expected.height ||
    layout.viewport.dpr !== expected.dpr
  ) {
    issues.push("viewport metrics do not match the requested contract");
  }
  if (layout.flexWrap !== "wrap") {
    issues.push("context actions do not wrap");
  }
  if (layout.contractWidth <= 44 || layout.contractWidth >= layout.list.width) {
    issues.push("context action width is not bounded below the action list");
  }
  if (
    Math.abs(layout.artContract.width - 112) > tolerance ||
    Math.abs(layout.artContract.height - 130) > tolerance
  ) {
    issues.push("context action art does not use the 112 x 130 viewport");
  }
  if (layout.scrollWidth > layout.clientWidth + tolerance) {
    issues.push("context action list has horizontal overflow");
  }
  if (layout.buttons.length === 0) {
    issues.push("context action list has no buttons");
    return issues;
  }
  const expectedWidth = Math.min(layout.contractWidth, layout.list.width);
  for (const button of layout.buttons) {
    if (Math.abs(button.rect.width - expectedWidth) > tolerance) {
      issues.push(`${button.kind} does not use the shared bounded width`);
    }
    if (button.rect.height < 44 - tolerance) {
      issues.push(`${button.kind} is shorter than the 44px activation target`);
    }
    if (
      Math.abs(button.symbolRect.width - layout.artContract.width) >
        tolerance ||
      Math.abs(button.symbolRect.height - layout.artContract.height) > tolerance
    ) {
      issues.push(`${button.kind} artwork does not use the shared viewport`);
    }
    if (
      button.symbolKind !== "accepted-raster" &&
      button.symbolKind !== "code-native-fallback"
    ) {
      issues.push(`${button.kind} artwork has no accepted presentation mode`);
    }
    if (
      button.symbolKind === "accepted-raster" &&
      (button.assetId === null ||
        button.imageObjectFit !== "contain" ||
        button.rasterLoaded !== true)
    ) {
      issues.push(`${button.kind} raster is not loaded and contained`);
    }
    if (
      button.labelRect.width <= 0 ||
      button.labelRect.height <= 0 ||
      button.labelFontSize < 11
    ) {
      issues.push(`${button.kind} label is not legible`);
    }
    for (const [part, rect] of [
      ["artwork", button.symbolRect],
      ["label", button.labelRect],
    ] as const) {
      if (
        rect.x < button.rect.x - tolerance ||
        rect.x + rect.width > button.rect.x + button.rect.width + tolerance ||
        rect.y < button.rect.y - tolerance ||
        rect.y + rect.height > button.rect.y + button.rect.height + tolerance
      ) {
        issues.push(`${button.kind} ${part} escapes its button`);
      }
    }
    if (
      button.rect.x < layout.list.x - tolerance ||
      button.rect.x + button.rect.width >
        layout.list.x + layout.list.width + tolerance ||
      button.rect.y < layout.list.y - tolerance ||
      button.rect.y + button.rect.height >
        layout.list.y + layout.list.height + tolerance
    ) {
      issues.push(`${button.kind} escapes the context action list`);
    }
  }
  for (const [index, button] of layout.buttons.entries()) {
    for (const other of layout.buttons.slice(index + 1)) {
      if (intersectionArea(button.rect, other.rect) > tolerance) {
        issues.push(`${button.kind} overlaps ${other.kind}`);
      }
    }
  }
  return issues;
}

function intersectionArea(
  left: BrowserSmokeRectV6,
  right: BrowserSmokeRectV6,
): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y),
  );
  return width * height;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
