export interface UiSettings {
  readonly uiScale: 1 | 1.25 | 1.5 | 2;
  readonly motion: "FULL" | "REDUCED";
  readonly animationSpeed: "NORMAL" | "FAST";
  readonly highContrast: boolean;
}
