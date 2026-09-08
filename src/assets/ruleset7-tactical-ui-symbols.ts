export type TacticalSymbolTone = "ink" | "paper" | "slate" | "bronze" | "coral";

export type TacticalSymbolTheme = "LIGHT" | "DARK" | "HIGH_CONTRAST";

export interface TacticalSymbolThemeTreatment {
  readonly surface: string;
  readonly boundary: string;
  readonly tones: Readonly<Record<TacticalSymbolTone, string>>;
  readonly minimumGraphicalContrast: 3;
  readonly lineTonePolicy: "SEMANTIC_TONE" | "BOUNDARY_TONE";
  readonly treatment:
    | "DARK_OUTLINE_ON_LIGHT"
    | "LIGHT_OUTLINE_ON_DARK"
    | "WHITE_BOUNDARY_ON_BLACK";
}

export const RULESET7_TACTICAL_UI_THEME_TREATMENTS = {
  LIGHT: {
    surface: "#eef4e8",
    boundary: "#17333a",
    tones: {
      ink: "#17333a",
      paper: "#f2e4bd",
      slate: "#63818a",
      bronze: "#c98c42",
      coral: "#b8564d",
    },
    minimumGraphicalContrast: 3,
    lineTonePolicy: "SEMANTIC_TONE",
    treatment: "DARK_OUTLINE_ON_LIGHT",
  },
  DARK: {
    surface: "#213d43",
    boundary: "#f8f2df",
    tones: {
      ink: "#f8f2df",
      paper: "#6f5a34",
      slate: "#31565e",
      bronze: "#755020",
      coral: "#7b3836",
    },
    minimumGraphicalContrast: 3,
    lineTonePolicy: "BOUNDARY_TONE",
    treatment: "LIGHT_OUTLINE_ON_DARK",
  },
  HIGH_CONTRAST: {
    surface: "#000000",
    boundary: "#ffffff",
    tones: {
      ink: "#ffffff",
      paper: "#000000",
      slate: "#000000",
      bronze: "#ffffff",
      coral: "#ffffff",
    },
    minimumGraphicalContrast: 3,
    lineTonePolicy: "BOUNDARY_TONE",
    treatment: "WHITE_BOUNDARY_ON_BLACK",
  },
} as const satisfies Readonly<
  Record<TacticalSymbolTheme, TacticalSymbolThemeTreatment>
>;

export type TacticalSymbolPrimitive =
  | {
      readonly kind: "line";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly width: number;
      readonly tone: TacticalSymbolTone;
    }
  | {
      readonly kind: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly radius: number;
      readonly fill: TacticalSymbolTone;
      readonly stroke: TacticalSymbolTone;
    }
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly radius: number;
      readonly fill: TacticalSymbolTone;
      readonly stroke: TacticalSymbolTone;
    }
  | {
      readonly kind: "polygon";
      readonly points: readonly [number, number][];
      readonly fill: TacticalSymbolTone;
      readonly stroke: TacticalSymbolTone;
    };

export type TacticalSymbolVisibility =
  | "PUBLIC_COMMAND"
  | "OWNER_ONLY"
  | "DETECTED_VIEWER_ONLY"
  | "OWNER_OR_EXPOSURE_RECIPIENT"
  | "DEFECTION_FULL_ONLY"
  | "DEFECTION_FULL_OR_ENDPOINT"
  | "BLACKOUT_FULL_OR_CITY_ONLY";

export interface Ruleset7TacticalUiSymbol {
  readonly id: `ui-${"action" | "status"}-${string}`;
  readonly semanticLabel: string;
  readonly semanticRole:
    | "command"
    | "visibility"
    | "defection"
    | "economy"
    | "blackout"
    | "capacity"
    | "achievement";
  readonly visibility: TacticalSymbolVisibility;
  readonly projectedSource: string;
  readonly themeTreatmentId: "RULESET7_TACTICAL_STATIC_V1";
  readonly reducedMotion: "STATIC";
  readonly primitives: readonly TacticalSymbolPrimitive[];
}

const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 2.4,
  tone: TacticalSymbolTone = "ink",
): TacticalSymbolPrimitive => ({ kind: "line", x1, y1, x2, y2, width, tone });
const circle = (
  cx: number,
  cy: number,
  radius: number,
  fill: TacticalSymbolTone = "paper",
): TacticalSymbolPrimitive => ({
  kind: "circle",
  cx,
  cy,
  radius,
  fill,
  stroke: "ink",
});
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 1.5,
  fill: TacticalSymbolTone = "paper",
): TacticalSymbolPrimitive => ({
  kind: "rect",
  x,
  y,
  width,
  height,
  radius,
  fill,
  stroke: "ink",
});
const polygon = (
  points: readonly [number, number][],
  fill: TacticalSymbolTone = "paper",
): TacticalSymbolPrimitive => ({
  kind: "polygon",
  points,
  fill,
  stroke: "ink",
});

/**
 * Static presentation metadata only. Consumers must select entries from an
 * already projected PlayerViewV7; this registry never derives hidden state or
 * grants visibility. The shapes use a 24x24 coordinate system and remain
 * color-redundant and motion-free.
 */
const RULESET7_TACTICAL_UI_SYMBOL_DEFINITIONS = [
  {
    id: "ui-action-pursue",
    semanticLabel: "Pursue path available",
    semanticRole: "command",
    visibility: "PUBLIC_COMMAND",
    projectedSource: "offered PURSUE command and canonical public path",
    reducedMotion: "STATIC",
    primitives: [
      line(4, 17, 16, 5, 3),
      polygon(
        [
          [14, 4],
          [21, 4],
          [20, 11],
        ],
        "bronze",
      ),
      circle(5, 18, 2.5, "slate"),
    ],
  },
  {
    id: "ui-action-end-pursuit",
    semanticLabel: "End Pursuit",
    semanticRole: "command",
    visibility: "PUBLIC_COMMAND",
    projectedSource: "offered END_PURSUIT command",
    reducedMotion: "STATIC",
    primitives: [
      rect(5, 5, 14, 14, 2, "slate"),
      line(8, 8, 16, 16, 2.8),
      line(16, 8, 8, 16, 2.8),
    ],
  },
  {
    id: "ui-status-concealed",
    semanticLabel: "Concealment ability",
    semanticRole: "visibility",
    visibility: "OWNER_ONLY",
    projectedSource:
      "owner's projected Saboteur ability; this symbol makes no claim about another viewer's current detection",
    reducedMotion: "STATIC",
    primitives: [
      polygon(
        [
          [3, 12],
          [7, 8],
          [12, 7],
          [17, 8],
          [21, 12],
          [17, 16],
          [12, 17],
          [7, 16],
        ],
        "slate",
      ),
      line(4, 20, 20, 4, 3, "coral"),
    ],
  },
  {
    id: "ui-status-detected",
    semanticLabel: "Detected while in legal detector range",
    semanticRole: "visibility",
    visibility: "DETECTED_VIEWER_ONLY",
    projectedSource:
      "future aya.31 viewer-safe reveal reason; do not infer detection from mere unit visibility or use city-center detection as Blackout blocking",
    reducedMotion: "STATIC",
    primitives: [
      polygon(
        [
          [3, 12],
          [7, 8],
          [12, 7],
          [17, 8],
          [21, 12],
          [17, 16],
          [12, 17],
          [7, 16],
        ],
        "paper",
      ),
      circle(12, 12, 3, "bronze"),
    ],
  },
  {
    id: "ui-status-exposed",
    semanticLabel: "Exposed until its recorded expiry boundary",
    semanticRole: "visibility",
    visibility: "OWNER_OR_EXPOSURE_RECIPIENT",
    projectedSource:
      "PlayerViewV7 unitStats status EXPOSED; exact safe expiry requires future aya.31 projection data",
    reducedMotion: "STATIC",
    primitives: [
      circle(12, 12, 8, "paper"),
      line(12, 1, 12, 5),
      line(12, 19, 12, 23),
      line(1, 12, 5, 12),
      line(19, 12, 23, 12),
      circle(12, 12, 2.5, "coral"),
    ],
  },
  {
    id: "ui-status-defection-waiting",
    semanticLabel: "Defection waiting for reply",
    semanticRole: "defection",
    visibility: "DEFECTION_FULL_OR_ENDPOINT",
    projectedSource: "projected Defection phase WAITING_FOR_REPLY",
    reducedMotion: "STATIC",
    primitives: [
      circle(12, 12, 9, "slate"),
      polygon(
        [
          [8, 6],
          [16, 6],
          [13, 12],
          [16, 18],
          [8, 18],
          [11, 12],
        ],
        "paper",
      ),
    ],
  },
  {
    id: "ui-status-defection-armed",
    semanticLabel: "Defection armed for the initiator's next Start Turn",
    semanticRole: "defection",
    visibility: "DEFECTION_FULL_OR_ENDPOINT",
    projectedSource: "projected Defection phase ARMED",
    reducedMotion: "STATIC",
    primitives: [
      circle(12, 12, 9, "slate"),
      polygon(
        [
          [10, 13],
          [13, 6],
          [14, 11],
          [18, 11],
          [11, 19],
        ],
        "bronze",
      ),
    ],
  },
  {
    id: "ui-status-defection-reservation",
    semanticLabel: "Defection reserves this home city capacity",
    semanticRole: "defection",
    visibility: "DEFECTION_FULL_ONLY",
    projectedSource:
      "FULL Defection reservedHomeCityId only; endpoint views must not render a city reservation",
    reducedMotion: "STATIC",
    primitives: [
      rect(4, 9, 16, 11, 2, "slate"),
      polygon(
        [
          [3, 10],
          [12, 3],
          [21, 10],
        ],
        "paper",
      ),
      circle(12, 15, 2.5, "bronze"),
    ],
  },
  {
    id: "ui-status-spoils",
    semanticLabel: "First hostile capture Spoils available",
    semanticRole: "economy",
    visibility: "OWNER_ONLY",
    projectedSource: "viewer spoilsClaimedCityIds and offered capture preview",
    reducedMotion: "STATIC",
    primitives: [
      rect(4, 8, 16, 12, 3, "bronze"),
      line(4, 12, 20, 12),
      circle(12, 14, 2.5, "paper"),
    ],
  },
  {
    id: "ui-status-blackout-cooldown",
    semanticLabel: "Blackout cooldown until the eligible round",
    semanticRole: "blackout",
    visibility: "OWNER_ONLY",
    projectedSource: "owned Saboteur blackoutEligibility known round",
    reducedMotion: "STATIC",
    primitives: [
      circle(12, 12, 9, "slate"),
      line(12, 12, 12, 6, 2.5, "paper"),
      line(12, 12, 17, 15, 2.5, "paper"),
    ],
  },
  {
    id: "ui-status-blackout-pending",
    semanticLabel: "Blackout pending until the city's next owner Start Turn",
    semanticRole: "blackout",
    visibility: "BLACKOUT_FULL_OR_CITY_ONLY",
    projectedSource: "projected city Blackout phase PENDING",
    reducedMotion: "STATIC",
    primitives: [
      rect(5, 6, 14, 14, 2, "paper"),
      line(8, 9, 16, 17, 3, "slate"),
      circle(17, 6, 3, "bronze"),
    ],
  },
  {
    id: "ui-status-blackout-active",
    semanticLabel: "Blackout active for this owner turn",
    semanticRole: "blackout",
    visibility: "BLACKOUT_FULL_OR_CITY_ONLY",
    projectedSource: "projected city Blackout phase ACTIVE",
    reducedMotion: "STATIC",
    primitives: [
      rect(5, 6, 14, 14, 2, "slate"),
      line(7, 8, 17, 18, 3, "coral"),
      line(17, 8, 7, 18, 3, "coral"),
    ],
  },
  {
    id: "ui-status-blackout-recovery",
    semanticLabel:
      "Blackout recovery requires one complete unaffected owner turn",
    semanticRole: "blackout",
    visibility: "BLACKOUT_FULL_OR_CITY_ONLY",
    projectedSource: "projected city Blackout phase RECOVERY",
    reducedMotion: "STATIC",
    primitives: [
      rect(5, 6, 14, 14, 2, "paper"),
      polygon(
        [
          [9, 13],
          [12, 17],
          [19, 8],
          [17, 6],
          [12, 12],
          [11, 10],
        ],
        "bronze",
      ),
    ],
  },
  {
    id: "ui-status-capacity-reservation",
    semanticLabel: "City capacity reserved by an earlier Defection mark",
    semanticRole: "capacity",
    visibility: "OWNER_ONLY",
    projectedSource:
      "owner-safe ordered capacity and Defection reservation preview",
    reducedMotion: "STATIC",
    primitives: [
      rect(3, 8, 18, 10, 2, "slate"),
      rect(6, 11, 4, 4, 1, "paper"),
      rect(14, 11, 4, 4, 1, "bronze"),
      line(12, 6, 12, 20, 2.5),
    ],
  },
  {
    id: "ui-status-achievement-progress",
    semanticLabel: "Achievement progress toward its fixed requirement",
    semanticRole: "achievement",
    visibility: "OWNER_ONLY",
    projectedSource: "viewer achievementProgress current and required values",
    reducedMotion: "STATIC",
    primitives: [
      rect(3, 9, 18, 7, 3, "slate"),
      rect(5, 11, 10, 3, 1, "bronze"),
      line(17, 7, 17, 18, 2.5),
    ],
  },
  {
    id: "ui-status-achievement-entitlement-locked",
    semanticLabel: "Achievement entitlement locked",
    semanticRole: "achievement",
    visibility: "OWNER_ONLY",
    projectedSource:
      "viewer achievement entitlement unlocked false and spent false",
    reducedMotion: "STATIC",
    primitives: [
      rect(6, 11, 12, 10, 2, "slate"),
      circle(12, 10, 5, "paper"),
      line(8, 10, 8, 13, 2.5),
    ],
  },
  {
    id: "ui-status-achievement-entitlement-unlocked",
    semanticLabel: "Achievement entitlement unlocked and unspent",
    semanticRole: "achievement",
    visibility: "OWNER_ONLY",
    projectedSource:
      "viewer achievement entitlement unlocked true and spent false",
    reducedMotion: "STATIC",
    primitives: [
      rect(6, 11, 12, 10, 2, "bronze"),
      circle(12, 10, 5, "paper"),
      line(16, 10, 19, 7, 2.5),
    ],
  },
  {
    id: "ui-status-achievement-entitlement-spent",
    semanticLabel: "Achievement entitlement spent",
    semanticRole: "achievement",
    visibility: "OWNER_ONLY",
    projectedSource:
      "viewer achievement entitlement unlocked true and spent true",
    reducedMotion: "STATIC",
    primitives: [
      circle(12, 12, 9, "slate"),
      polygon(
        [
          [7, 12],
          [11, 16],
          [18, 8],
          [16, 6],
          [11, 12],
          [9, 10],
        ],
        "paper",
      ),
    ],
  },
  {
    id: "ui-status-achievement-source-current-owner",
    semanticLabel:
      "Current owner may inspect this Monument's source achievement",
    semanticRole: "achievement",
    visibility: "OWNER_ONLY",
    projectedSource:
      "Monument contribution source visibility FULL for current owner only",
    reducedMotion: "STATIC",
    primitives: [
      polygon(
        [
          [12, 3],
          [15, 9],
          [21, 10],
          [17, 15],
          [18, 21],
          [12, 18],
          [6, 21],
          [7, 15],
          [3, 10],
          [9, 9],
        ],
        "bronze",
      ),
      circle(12, 12, 3, "paper"),
    ],
  },
] as const satisfies readonly Omit<
  Ruleset7TacticalUiSymbol,
  "themeTreatmentId"
>[];

export const RULESET7_TACTICAL_UI_SYMBOLS =
  RULESET7_TACTICAL_UI_SYMBOL_DEFINITIONS.map((symbol) => ({
    ...symbol,
    themeTreatmentId: "RULESET7_TACTICAL_STATIC_V1" as const,
  }));

export type Ruleset7TacticalUiSymbolId =
  (typeof RULESET7_TACTICAL_UI_SYMBOLS)[number]["id"];

export const RULESET7_TACTICAL_UI_SYMBOL_BY_ID: Readonly<
  Record<Ruleset7TacticalUiSymbolId, Ruleset7TacticalUiSymbol>
> = Object.freeze(
  Object.fromEntries(
    RULESET7_TACTICAL_UI_SYMBOLS.map((symbol) => [symbol.id, symbol]),
  ) as unknown as Record<Ruleset7TacticalUiSymbolId, Ruleset7TacticalUiSymbol>,
);
