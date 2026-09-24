import {
  selectionIdentityArtworkLayoutV6,
  type SelectionIdentityArtworkFrameV6,
} from "./selection-identity-v6";

/** Painted bounds measured from accepted PNGs (all nontransparent pixels); verified in tests. */
const PAINTED_BOUNDS: readonly (readonly [
  string,
  number,
  number,
  number,
  number,
  number,
  number,
])[] = [
  ["building-city-1", 384, 384, 24, 51, 360, 337],
  ["building-city-2", 384, 384, 14, 8, 372, 344],
  ["building-city-3", 384, 384, 14, 8, 372, 344],
  ["building-ruleset7-farm-single", 256, 256, 0, 0, 256, 256],
  ["building-ruleset7-lumber-camp", 384, 384, 52, 102, 332, 326],
  ["building-ruleset7-resource-lumber-camp", 384, 384, 56, 54, 328, 326],
  ["building-square-forge", 384, 384, 90, 88, 294, 316],
  ["building-square-grand-works", 384, 384, 80, 80, 304, 316],
  ["building-square-market", 384, 384, 90, 92, 293, 316],
  ["building-square-monument", 384, 384, 117, 72, 266, 316],
  ["building-square-sawmill", 384, 384, 86, 109, 298, 316],
  ["building-square-windmill", 384, 384, 94, 38, 290, 322],
  ["building-square-workshop", 384, 384, 99, 104, 284, 316],
  ["building-ruleset7-port", 384, 384, 52, 104, 332, 298],
  ["terrain-ruleset7-original-forest-1", 256, 384, 0, 128, 256, 384],
  ["terrain-ruleset7-original-grass-1", 256, 256, 0, 0, 256, 256],
  ["terrain-ruleset7-revision3-mined-mountain-1", 256, 384, 0, 121, 256, 384],
  ["terrain-ruleset7-revision3-mountain-1", 256, 384, 0, 121, 256, 384],
  ["terrain-square-fertile-ground", 256, 384, 59, 250, 196, 324],
  ["terrain-ruleset7-resource-fertile-ground", 256, 384, 68, 250, 188, 324],
  ["terrain-ruleset7-original-fruit-pear", 256, 384, 89, 232, 166, 320],
  ["terrain-ruleset7-original-fruit-plum", 256, 384, 78, 232, 177, 320],
  ["terrain-ruleset7-original-game-deer", 256, 384, 74, 196, 182, 324],
  ["terrain-ruleset7-original-game-fox", 256, 384, 68, 256, 188, 324],
  ["terrain-square-ore", 256, 384, 69, 224, 186, 320],
  ["terrain-square-original-animal", 256, 384, 68, 220, 188, 324],
  ["terrain-square-original-fruit", 256, 384, 76, 237, 180, 320],
  ["terrain-ruleset7-water-shallow", 256, 256, 0, 0, 256, 256],
  ["terrain-ruleset7-water-deep", 256, 256, 0, 0, 256, 256],
  ["terrain-ruleset7-resource-fish", 256, 384, 60, 194, 196, 320],
  ["terrain-ruleset7-resource-pearls", 256, 384, 60, 180, 196, 320],
  ["unit-original-breacher", 384, 384, 61, 50, 335, 288],
  ["unit-original-captain", 256, 296, 44, 20, 212, 222],
  ["unit-original-catapult", 384, 384, 122, 85, 361, 309],
  ["unit-original-fighter", 256, 296, 20, 18, 236, 252],
  ["unit-original-guard", 256, 296, 16, 19, 240, 237],
  ["unit-original-heavy", 256, 296, 32, 26, 224, 222],
  ["unit-original-horse-archer", 384, 384, 55, 16, 329, 288],
  ["unit-original-juggernaut", 384, 448, 29, 24, 355, 336],
  ["unit-original-knight", 384, 384, 39, 16, 344, 288],
  ["unit-original-marksman", 256, 296, 45, 25, 206, 252],
  ["unit-original-medic", 256, 296, 40, 24, 216, 222],
  ["unit-original-raider", 256, 296, 40, 19, 217, 252],
  ["unit-original-saboteur", 256, 296, 33, 44, 201, 222],
  ["unit-original-scout", 256, 296, 51, 18, 204, 222],
  ["unit-shared-embarked-transport", 384, 384, 62, 137, 322, 301],
  ["unit-original-patrol-boat", 384, 384, 61, 128, 322, 304],
  ["unit-original-battleship", 384, 384, 30, 91, 354, 298],
  ["building-ruleset7-shipyard", 384, 384, 40, 61, 344, 323],
];

export const SELECTION_IDENTITY_FRAMES_V7: Readonly<
  Record<string, Omit<SelectionIdentityArtworkFrameV6, "mode">>
> = Object.fromEntries(
  PAINTED_BOUNDS.map(([id, width, height, left, top, right, bottom]) => [
    id,
    { source: { width, height }, visibleBounds: { left, top, right, bottom } },
  ]),
);

/** Center the painted silhouette in a common 104px square, preserving its aspect ratio. */
export function selectionIdentityArtworkLayoutV7(assetId: string) {
  const frame = SELECTION_IDENTITY_FRAMES_V7[assetId];
  if (frame === undefined) return null;
  const layout = selectionIdentityArtworkLayoutV6(
    { ...frame, mode: "VISIBLE_ALPHA" },
    { width: 112, height: 112, visibleInset: 4 },
  );
  return { ...layout.image, top: layout.image.top + 9 };
}
