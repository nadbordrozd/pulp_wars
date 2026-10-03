/**
 * Review scene of the attack cues (bead pulp_wars-b5f.5,
 * docs/art/ATTACK_EFFECTS.md): one shooter and one target on a small Grass
 * board, drawn by the real CanvasBoardHostV7 in the look asked for (the
 * live look the game passes, the Classic look, or the LEGACY art set), with
 * the shooter's attack cue pinned at a given progress through
 * `pinAttackFeedback`. Loaded in the browser through the Vite dev server by
 * scripts/art/attack-effects-review.ts; a live match supplies the view the
 * scene is built on. Nothing here is part of the game build.
 *
 * The shooter stands at (1, 2), its target (an enemy Human Fighter) at
 * (1 + range, 2): range 2 for the Lich, the Gunner, the Boulder Yeti and the
 * Snow Hunter, range 3 for the Rocket Cart and the Steam Cannon. The board
 * is just wide enough that the camera centres the pair.
 */
import type {
  BoardSizeV7,
  CoordV7,
  FactionIdV7,
  PlayerId,
  PlayerViewV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import type { AttackEffectIdV7 } from "../../../src/render/canvas/attack-effects-v7";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";

export type AttackEffectsLookV7 = "LIVE" | "CLASSIC" | "LEGACY";

/** The shooter of each cue: faction, role and range to its target. */
export const ATTACK_EFFECTS_SCENE_SHOOTERS_V7: Readonly<
  Record<
    AttackEffectIdV7,
    {
      readonly faction: FactionIdV7;
      readonly role: UnitRoleIdV7;
      readonly range: number;
      readonly label: string;
    }
  >
> = {
  NECRO_BOLT: { faction: "UNDEAD", role: "CATAPULT", range: 2, label: "Lich" },
  FIREWORK_ROCKET: {
    faction: "GOBLIN",
    role: "CATAPULT",
    range: 3,
    label: "Rocket Cart",
  },
  GATLING_BURST: {
    faction: "DWARF",
    role: "MARKSMAN",
    range: 2,
    label: "Clockwork Gunner",
  },
  CANNON_BLAST: {
    faction: "DWARF",
    role: "CATAPULT",
    range: 3,
    label: "Steam Cannon",
  },
  ICE_BOULDER: {
    faction: "ICE_FOLK",
    role: "CATAPULT",
    range: 2,
    label: "Boulder Yeti",
  },
  HARPOON: {
    faction: "ICE_FOLK",
    role: "MARKSMAN",
    range: 2,
    label: "Snow Hunter",
  },
};

const ROW = 2;
const HEIGHT = 5;

export function attackEffectsSceneViewV7(
  live: PlayerViewV7,
  effect: AttackEffectIdV7,
): {
  readonly view: PlayerViewV7;
  readonly from: CoordV7;
  readonly to: CoordV7;
} {
  const shooter = ATTACK_EFFECTS_SCENE_SHOOTERS_V7[effect];
  const template = live.units.find((unit) => unit.ownerId === live.viewer.id);
  const viewer = live.players.find((player) => player.id === live.viewer.id);
  if (template === undefined || viewer === undefined)
    throw new Error("the live view has no unit or viewer");
  const enemyId = (Math.max(...live.players.map((player) => player.id)) +
    1) as PlayerId;
  const players = [
    { ...viewer, seat: 0, faction: shooter.faction },
    {
      ...viewer,
      id: enemyId,
      seat: 1,
      faction: "ORIGINAL" as const,
      controller: "AI" as const,
    },
  ];
  const width = 3 + shooter.range;
  const from = { x: 1, y: ROW };
  const to = { x: 1 + shooter.range, y: ROW };
  const tiles: PlayerViewV7["board"]["tiles"][number][] = [];
  for (let y = 0; y < HEIGHT; y += 1)
    for (let x = 0; x < width; x += 1)
      tiles.push({
        at: { x, y },
        explored: true,
        biome: "PLAINS",
        terrain: "GRASS",
        resource: null,
        improvement: null,
        road: false,
        fieldDefense: false,
        fortificationLevel: null,
        site: null,
        territoryCityId: null,
        territoryOwnerId: null,
        snow: false,
        blizzard: false,
      });
  const unit = (
    id: number,
    ownerId: PlayerId,
    role: UnitRoleIdV7,
    at: CoordV7,
  ): PlayerViewV7["units"][number] => ({
    ...template,
    id: id as typeof template.id,
    ownerId,
    role,
    form: "LAND",
    at,
    hp: template.maxHp,
    activation: { ...template.activation, handled: true },
  });
  return {
    from,
    to,
    view: {
      ...live,
      viewer: { ...live.viewer, faction: shooter.faction },
      players,
      board: {
        ...live.board,
        width: width as BoardSizeV7,
        height: HEIGHT as BoardSizeV7,
        tiles,
        territoryBorders: [],
      },
      cities: [],
      units: [
        unit(9200, live.viewer.id, shooter.role, from),
        unit(9201, enemyId, "FIGHTER", to),
      ],
      treasureChests: [],
      graves: [],
      improvementValues: [],
      unitStats: [],
      plagued: [],
      bitten: [],
    },
  };
}

/**
 * Mounts a full-screen board host over the page showing the scene of
 * `effect` in the look asked for; `pin(progress)` then pins the cue.
 */
export function showAttackEffectsSceneV7(
  live: PlayerViewV7,
  options: {
    readonly look: AttackEffectsLookV7;
    readonly effect: AttackEffectIdV7;
  },
): {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
  readonly pin: (progress: number | null) => void;
} {
  document
    .querySelectorAll("[data-attack-effects-scene]")
    .forEach((node) => node.remove());
  const container = document.createElement("div");
  container.dataset.attackEffectsScene = "true";
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
  const artSet = options.look === "LEGACY" ? "LEGACY" : "CHIBI";
  const scene = attackEffectsSceneViewV7(live, options.effect);
  host.update({
    matchInstanceId: `attack-effects-${options.look}-${options.effect}`,
    view: scene.view,
    offeredCommands: [],
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    interactive: false,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: true,
    highContrast: false,
    artSet,
    ...liveBoardLookV7(artSet, options.look === "CLASSIC"),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return {
    host,
    canvas,
    pin: (progress) =>
      host.pinAttackFeedback(
        progress === null
          ? []
          : [
              {
                effect: options.effect,
                from: scene.from,
                to: scene.to,
                progress,
              },
            ],
      ),
  };
}
