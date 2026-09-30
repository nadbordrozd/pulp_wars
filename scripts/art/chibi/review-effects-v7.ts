/**
 * Synthetic in-game scene for the Undead effects batch review (bead
 * pulp_wars-vkq.14).
 *
 * Loaded in the browser through the Vite dev server by
 * scripts/art/chibi-batch-review.ts: it takes the live Ruleset 7 player view,
 * rewrites a 9 x 5 patch around the viewer's capital and draws it with the
 * real CanvasBoardHostV7 and ?art=chibi, full screen over the running game.
 * Nothing here is part of the game build.
 *
 * The top two rows hold Human units of all four player colours with the
 * Plague and Bitten markers (one, the other, or both; on grass and forest),
 * so the markers are checked against every owner colour. The bottom rows
 * hold an Undead (Violet) Banshee, Lich, Vampire, Necromancer and Zombie
 * among Human targets. Scene A pins Wail, Lich splash, Plague and Lifesteal
 * mid-animation on the effects canvas (CanvasBoardHostV7.pinSupportFeedback);
 * scene B pins Raise Dead, Infect and Bitten risings and the cure sparkle.
 */
import type {
  CoordV7,
  PlayerColorV7,
  PlayerViewV7,
  TerrainIdV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import type { SupportFeedbackV7 } from "../../../src/render/canvas/support-presentation-v7";

type Seat = "CORAL" | "TEAL" | "GOLD" | "VIOLET" | "UNDEAD";

interface Cell {
  readonly terrain: TerrainIdV7;
  readonly unit?: UnitRoleIdV7;
  readonly owner?: Seat;
  readonly plagued?: true;
  readonly bitten?: true;
  readonly grave?: true;
}

const G = "GRASS";
const F = "FOREST";

/** Rows top to bottom; the capital (the viewer's, Coral) is column 4, row 2. */
const LAYOUT: readonly (readonly Cell[])[] = [
  [
    { terrain: G },
    { terrain: G, unit: "FIGHTER", owner: "CORAL", plagued: true },
    { terrain: G },
    { terrain: G, unit: "FIGHTER", owner: "TEAL", bitten: true },
    { terrain: G },
    {
      terrain: G,
      unit: "FIGHTER",
      owner: "GOLD",
      plagued: true,
      bitten: true,
    },
    { terrain: G },
    { terrain: F, unit: "FIGHTER", owner: "VIOLET", plagued: true },
    { terrain: G },
  ],
  [
    { terrain: F, unit: "GUARD", owner: "CORAL", bitten: true },
    { terrain: G },
    { terrain: G, unit: "MARKSMAN", owner: "TEAL", plagued: true },
    { terrain: G },
    { terrain: G, unit: "KNIGHT", owner: "GOLD", bitten: true },
    { terrain: G },
    {
      terrain: G,
      unit: "CAPTAIN",
      owner: "VIOLET",
      plagued: true,
      bitten: true,
    },
    { terrain: G },
    { terrain: G, unit: "GUARD", owner: "TEAL", plagued: true },
  ],
  [
    { terrain: G, unit: "FIGHTER", owner: "TEAL" },
    { terrain: G, grave: true },
    { terrain: G, unit: "GUARD", owner: "GOLD" },
    { terrain: G },
    { terrain: G },
    { terrain: G, unit: "FIGHTER", owner: "CORAL" },
    { terrain: G, unit: "MARKSMAN", owner: "GOLD", plagued: true },
    { terrain: G },
    { terrain: G, unit: "GUARD", owner: "CORAL" },
  ],
  [
    { terrain: G, grave: true },
    { terrain: G, unit: "MARKSMAN", owner: "UNDEAD" },
    { terrain: G, unit: "CAPTAIN", owner: "UNDEAD" },
    { terrain: G, grave: true },
    { terrain: G, unit: "KNIGHT", owner: "UNDEAD" },
    { terrain: G, unit: "FIGHTER", owner: "TEAL" },
    { terrain: G, unit: "GUARD", owner: "UNDEAD" },
    { terrain: G, unit: "FIGHTER", owner: "GOLD" },
    { terrain: G, unit: "CATAPULT", owner: "UNDEAD" },
  ],
  [
    { terrain: G, unit: "GUARD", owner: "CORAL" },
    { terrain: G },
    { terrain: F, unit: "FIGHTER", owner: "VIOLET" },
    { terrain: G },
    { terrain: G, unit: "MARKSMAN", owner: "CORAL" },
    { terrain: G },
    { terrain: G, unit: "GUARD", owner: "UNDEAD" },
    { terrain: G },
    { terrain: G },
  ],
];

const CAPITAL = { x: 4, y: 2 } as const;
const COLORS: Readonly<Record<Exclude<Seat, "UNDEAD">, PlayerColorV7>> = {
  CORAL: "CORAL",
  TEAL: "TEAL",
  GOLD: "GOLD",
  VIOLET: "VIOLET",
};

export type ChibiEffectsReviewSceneV7 = "A" | "B";

/** The live view with the effects patch written around the capital. */
export function chibiEffectsReviewViewV7(live: PlayerViewV7): {
  readonly view: PlayerViewV7;
  readonly origin: CoordV7;
} {
  const viewerId = live.viewer.id;
  const capital =
    live.cities.find((city) => city.ownerId === viewerId && city.isCapital) ??
    live.cities[0];
  if (capital === undefined) throw new Error("the live view has no city");
  const rows = LAYOUT.length;
  const columns = LAYOUT[0]?.length ?? 0;
  const origin = {
    x: Math.max(
      0,
      Math.min(live.board.width - columns, capital.at.x - CAPITAL.x),
    ),
    y: Math.max(
      0,
      Math.min(live.board.height - rows, capital.at.y - CAPITAL.y),
    ),
  };
  const template = live.players.find((player) => player.id === viewerId);
  const unitTemplate = live.units.find((unit) => unit.ownerId === viewerId);
  if (template === undefined || unitTemplate === undefined)
    throw new Error("the live view has no viewer unit");
  // Coral is the viewer; the other seats are synthetic, Undead is Violet.
  const maxId = Math.max(...live.players.map((player) => player.id));
  const seats: readonly Seat[] = ["CORAL", "TEAL", "GOLD", "VIOLET", "UNDEAD"];
  const players = seats.map((seat, index) => ({
    ...template,
    id: (seat === "CORAL" ? viewerId : maxId + index) as typeof template.id,
    seat: index,
    color: seat === "UNDEAD" ? ("VIOLET" as const) : COLORS[seat],
    faction: seat === "UNDEAD" ? ("UNDEAD" as const) : ("ORIGINAL" as const),
  }));
  const playerOf = (seat: Seat) => players[seats.indexOf(seat)]?.id ?? viewerId;
  const inPatch = (at: CoordV7): Cell | undefined =>
    LAYOUT[at.y - origin.y]?.[at.x - origin.x];
  const capitalAt = { x: origin.x + CAPITAL.x, y: origin.y + CAPITAL.y };
  // Only the patch is explored, so the host frames it on mount.
  const tiles: PlayerViewV7["board"]["tiles"] = live.board.tiles.map((tile) => {
    const cell = inPatch(tile.at);
    if (cell === undefined) return { at: tile.at, explored: false as const };
    return {
      at: tile.at,
      explored: true as const,
      biome: null,
      terrain: cell.terrain,
      resource: null,
      improvement: null,
      road: false,
      fieldDefense: false,
      fortificationLevel: null,
      site:
        tile.at.x === capitalAt.x && tile.at.y === capitalAt.y
          ? ("CAPITAL" as const)
          : null,
      territoryCityId: null,
      territoryOwnerId: null,
    };
  });
  const units = LAYOUT.flatMap((row, y) =>
    row.flatMap((cell, x) =>
      cell.unit === undefined
        ? []
        : [
            {
              ...unitTemplate,
              id: (9000 + y * columns + x) as typeof unitTemplate.id,
              ownerId: playerOf(cell.owner ?? "CORAL"),
              role: cell.unit,
              form: "LAND" as const,
              hp: Math.ceil(unitTemplate.maxHp * 0.7),
              at: { x: origin.x + x, y: origin.y + y },
            },
          ],
    ),
  );
  const unitAt = (x: number, y: number) =>
    units.find(
      (unit) => unit.at.x === origin.x + x && unit.at.y === origin.y + y,
    );
  const flagged = (flag: "plagued" | "bitten") =>
    LAYOUT.flatMap((row, y) =>
      row.flatMap((cell, x) => {
        const unit = cell[flag] === true ? unitAt(x, y) : undefined;
        return unit === undefined ? [] : [unit.id];
      }),
    );
  return {
    origin,
    view: {
      ...live,
      players,
      board: { ...live.board, tiles, territoryBorders: [] },
      cities: [{ ...capital, at: capitalAt }],
      units,
      treasureChests: [],
      graves: LAYOUT.flatMap((row, y) =>
        row.flatMap((cell, x) =>
          cell.grave === true ? [{ x: origin.x + x, y: origin.y + y }] : [],
        ),
      ),
      plagued: flagged("plagued").map((unitId) => ({
        unitId,
        sourceUnitId: unitAt(8, 3)?.id ?? null,
      })),
      bitten: flagged("bitten").map((unitId) => ({
        unitId,
        biterPlayerId: playerOf("UNDEAD"),
      })),
    },
  };
}

/** The effect cues pinned mid-animation for one scene. */
export function chibiEffectsReviewFeedbackV7(
  origin: CoordV7,
  scene: ChibiEffectsReviewSceneV7,
  progress = 0.45,
): readonly SupportFeedbackV7[] {
  const at = (x: number, y: number): CoordV7 => ({
    x: origin.x + x,
    y: origin.y + y,
  });
  const id = (x: number, y: number) => 9000 + y * 9 + x;
  const cue = (
    effect: SupportFeedbackV7["effect"],
    actor: CoordV7,
    recipients: readonly CoordV7[],
  ): SupportFeedbackV7 => ({
    effect,
    actor: { unitId: id(actor.x, actor.y), at: at(actor.x, actor.y) },
    recipients: recipients.map((cell) => ({
      unitId: id(cell.x, cell.y),
      at: at(cell.x, cell.y),
    })),
    progress,
  });
  return scene === "A"
    ? [
        // The Banshee shrieks at the two Humans beside her.
        cue("WAIL", { x: 1, y: 3 }, [
          { x: 0, y: 2 },
          { x: 0, y: 4 },
        ]),
        // The Lich's frost burst on a Fighter and a splashed Guard.
        cue("SPLASH", { x: 7, y: 3 }, [{ x: 6, y: 2 }]),
        // Start-turn Plague on two plagued units.
        cue("PLAGUE", { x: 1, y: 0 }, [{ x: 2, y: 1 }]),
        // The Vampire drains the Fighter beside it.
        cue("LIFESTEAL", { x: 4, y: 3 }, [{ x: 5, y: 3 }]),
      ]
    : [
        // The Necromancer raises the Graves beside it.
        cue("RAISE", { x: 2, y: 3 }, [
          { x: 1, y: 2 },
          { x: 3, y: 3 },
        ]),
        // Two fallen Humans rise as Zombies: one bitten, one infected.
        cue("BITTEN", { x: 6, y: 4 }, []),
        cue("INFECT", { x: 6, y: 3 }, []),
        // Tend cures a plagued and a bitten unit.
        cue("CURE", { x: 4, y: 1 }, [{ x: 5, y: 0 }]),
      ];
}

/**
 * Mounts a full-screen CHIBI board host over the page with the effects
 * patch and the scene's cues pinned mid-animation.
 */
export function showChibiEffectsReviewV7(
  live: PlayerViewV7,
  scene: ChibiEffectsReviewSceneV7,
): {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
  readonly pin: () => void;
} {
  const { view, origin } = chibiEffectsReviewViewV7(live);
  const container = document.createElement("div");
  container.dataset.chibiReviewScene = "true";
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "#173632",
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, {
    onSelection: () => undefined,
    onCommand: () => undefined,
  });
  host.update({
    matchInstanceId: `chibi-effects-review-${scene}`,
    view,
    offeredCommands: [],
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    interactive: false,
    motion: "FULL",
    animationSpeed: "NORMAL",
    presentationPaused: true,
    highContrast: false,
    artSet: "CHIBI",
  });
  const pin = (): void =>
    host.pinSupportFeedback(chibiEffectsReviewFeedbackV7(origin, scene));
  pin();
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas, pin };
}
