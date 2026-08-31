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
  const pairs = [
    ["hud", layout.hud, "map", layout.map],
    ["hud", layout.hud, "dock", layout.dock],
    ["map", layout.map, "dock", layout.dock],
  ] as const;
  for (const [leftName, left, rightName, right] of pairs) {
    if (intersectionArea(left, right) > tolerance) {
      issues.push(`${leftName} overlaps ${rightName}`);
    }
  }
  if (expected.mobile) {
    if (
      layout.map.y + tolerance < layout.hud.y + layout.hud.height ||
      layout.dock.y + tolerance < layout.map.y + layout.map.height
    ) {
      issues.push("mobile regions are not stacked HUD, map, then dock");
    }
  } else if (
    layout.dock.x + tolerance < layout.map.x + layout.map.width ||
    Math.abs(layout.dock.y - layout.map.y) > tolerance
  ) {
    issues.push("desktop dock is not beside the map");
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
  issues.push(
    ...layoutContractIssuesV6(
      flow.desktop,
      RULESET6_SMOKE_VIEWPORTS.desktop,
    ).map((issue) => `desktop: ${issue}`),
    ...layoutContractIssuesV6(flow.mobile, RULESET6_SMOKE_VIEWPORTS.mobile).map(
      (issue) => `mobile: ${issue}`,
    ),
  );
  if (flow.screenshots.length !== 2) {
    issues.push("flow does not include desktop and mobile screenshots");
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
