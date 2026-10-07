import type { FactionIdV7 } from "../engine/index";
import { STOCK_SOUND_CLIPS_V1, stockSoundUrlV1 } from "./stock-sounds";
import { THEME_MUSIC_TRACKS_V1, themeMusicUrlV1 } from "./theme-music";
import type { SynthLayerV1, SynthRecipeV1, SynthWaveV1 } from "./synth";

/**
 * The sound manifest (bead pulp_wars-2yc.10, docs/ui/SOUND.md): every sound
 * the game can play, keyed by what happened ("impact.hit", "city.capture"),
 * never by how it is made. Call sites and the event mapping name these ids
 * only, so a stock recording can replace a synthesised sound by changing
 * its entry's `source` here and nothing else.
 *
 * The sounds that have a recording are listed in `stock-sounds.json` (bead
 * pulp_wars-2yc.20, docs/ui/SOUND.md "Stock recordings"): their source is
 * the clip, and the synthesised sound written here is its fallback.
 */

export const SOUND_IDS_V1 = [
  // Attacks: the swing or the shot leaving.
  "attack.melee",
  "attack.ranged",
  "attack.siege",
  "attack.ray",
  "attack.magic",
  "attack.rocket",
  "attack.gatling",
  "attack.cannon",
  "attack.pop",
  // Where it lands.
  "impact.hit",
  "impact.heavy",
  "impact.explosion",
  "impact.ice",
  "impact.splat",
  "impact.shield",
  "impact.splash",
  // Units.
  "unit.hurt",
  "unit.death",
  "unit.step",
  "unit.train",
  "unit.levelup",
  // Support and faction abilities.
  "support.heal",
  "support.rally",
  "support.dark",
  "support.drain",
  "special.beam",
  "special.mind",
  "special.freeze",
  "special.burrow",
  "special.hatch",
  "special.pop",
  "special.puff",
  "special.sparkle",
  "special.dizzy",
  "special.boing",
  // Cities and the economy.
  "city.capture",
  "village.capture",
  "city.lost",
  "city.levelup",
  "reward.chosen",
  "research.complete",
  "economy.build",
  "economy.harvest",
  "economy.coin",
  "economy.treasure",
  // Turn, match and interface.
  "turn.start",
  "turn.end",
  "achievement.unlocked",
  "achievement.monument",
  "match.victory",
  "match.defeat",
  "ui.select",
  "ui.click",
  "ui.toggle",
  "ui.error",
] as const;

export type SoundIdV1 = (typeof SOUND_IDS_V1)[number];

/**
 * The mixer's groups; each has its own level. Ambience has no sound yet.
 * Music is the themes' group (`SOUND_THEMES_V1`): one theme plays at a
 * time, under the player's Music level; the others are under Sound.
 */
export const SOUND_CATEGORIES_V1 = [
  "combat",
  "economy",
  "ui",
  "ambience",
  "music",
] as const;
export type SoundCategoryV1 = (typeof SOUND_CATEGORIES_V1)[number];

export type SoundSourceV1 =
  | { readonly kind: "SYNTH"; readonly recipe: SynthRecipeV1 }
  | {
      /**
       * A recording. An effect's is fetched at the game's start and decoded
       * after the first gesture; a theme's is fetched when it first plays.
       */
      readonly kind: "FILE";
      readonly url: string;
      /** Played until the file has loaded, and if it cannot be loaded. */
      readonly fallback?: SynthRecipeV1;
      /**
       * The level the recording is played at (1 when absent): 0 to 1 for an
       * effect; a theme's may be a little above 1, to match the others.
       */
      readonly gain?: number;
    };

export interface SoundEntryV1 {
  /** Two or three words for the sound test and the documentation. */
  readonly label: string;
  readonly category: SoundCategoryV1;
  readonly source: SoundSourceV1;
  /** Which sound keeps its voice when too many play: 3 jingle, 1 detail. */
  readonly priority: 1 | 2 | 3;
  /** Random detune per play, in cents either way (0 for tunes). */
  readonly jitterCents: number;
}

/** A theme's id: "theme." and a name of its own. */
export type SoundThemeIdV1 = `theme.${string}`;

/**
 * A piece of theme music (beads pulp_wars-2yc.19 and pulp_wars-2yc.27,
 * docs/ui/SOUND.md "Theme music"): a faction's theme, or a theme of no
 * faction (the title theme). It plays in the "music" category, never
 * detuned, one at a time, and its file is loaded when it is first played.
 * The Gallery's Sounds tab shows one row per faction and one per theme of
 * no faction; a faction without an entry here reads "Coming soon".
 */
export interface SoundThemeEntryV1 {
  readonly id: SoundThemeIdV1;
  /** The faction it belongs to (at most one theme each); null for none. */
  readonly faction: FactionIdV7 | null;
  /** The name of a theme of no faction: "Title". */
  readonly label?: string;
  /** Whether it repeats until it is stopped. */
  readonly loop: boolean;
  /** A recording, or a synth recipe, exactly like an effect's source. */
  readonly source: SoundSourceV1;
  /**
   * For a loop whose recording ends on a dying note: how many seconds
   * before its end the next pass starts, under that note. Absent or 0 when
   * the end joins the start as it is.
   */
  readonly loopOverlapSeconds?: number;
}

/** The theme of the title screen and the menus. */
export const SOUND_TITLE_THEME_ID_V1: SoundThemeIdV1 = "theme.title";

/**
 * The registered themes: every encoded theme of `theme-music.json`. Adding
 * one there (`scripts/audio/encode-themes.ts`) is all it takes for the
 * audio to play it and the Gallery to offer it.
 */
export const SOUND_THEMES_V1: readonly SoundThemeEntryV1[] =
  THEME_MUSIC_TRACKS_V1.map((track) => ({
    id: track.id as SoundThemeIdV1,
    faction: track.faction as FactionIdV7 | null,
    ...(track.faction === null ? { label: "Title" } : {}),
    loop: true,
    source: {
      kind: "FILE" as const,
      url: themeMusicUrlV1(track),
      gain: track.gain,
    },
    loopOverlapSeconds: track.loopOverlapSeconds,
  }));

/** A faction's theme, when it has one. */
export function soundThemeOfFactionV1(
  faction: FactionIdV7,
  themes: readonly SoundThemeEntryV1[] = SOUND_THEMES_V1,
): SoundThemeEntryV1 | null {
  return themes.find((theme) => theme.faction === faction) ?? null;
}

/** Anything the audio can play: an effect or a theme. */
export type SoundKeyV1 = SoundIdV1 | SoundThemeIdV1;

/** Equal-tempered pitch of a MIDI note (69 is A above middle C, 440 Hz). */
export function midiHzV1(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

type NoteV1 = readonly [midi: number, at: number, ms: number];

/** One layer per note of a short tune. */
function tune(
  wave: SynthWaveV1,
  notes: readonly NoteV1[],
  shape: Omit<SynthLayerV1, "wave" | "at" | "ms" | "hz"> = {},
): SynthLayerV1[] {
  return notes.map(([midi, at, ms]) => ({
    wave,
    at,
    ms,
    hz: midiHzV1(midi),
    ...shape,
  }));
}

/** The soft pulse lead of the tunes: a narrow square under a low-pass. */
const LEAD = { duty: 0.25, lowpassHz: 2800, decay: 1.6 } as const;

function synth(
  label: string,
  category: SoundCategoryV1,
  priority: 1 | 2 | 3,
  jitterCents: number,
  peak: number,
  layers: readonly SynthLayerV1[],
): SoundEntryV1 {
  return {
    label,
    category,
    priority,
    jitterCents,
    source: { kind: "SYNTH", recipe: { layers, peak } },
  };
}

/** A soft drum for the start of a tune. */
function drum(at: number, gain = 0.5): SynthLayerV1[] {
  return [
    { wave: "sine", at, ms: 90, hz: 150, hzEnd: 70, gain, decay: 2.5 },
    { wave: "noise", at, ms: 50, lowpassHz: 700, gain: gain * 0.6, decay: 3 },
  ];
}

/** A short high tick (ice cracking, a shell chipping). */
function tick(at: number, gain: number): SynthLayerV1 {
  return {
    wave: "noise",
    at,
    ms: 18,
    lowpassHz: 4200,
    highpassHz: 1500,
    gain,
    attackMs: 1,
    decay: 3,
  };
}

/** A knock on wood (building). */
function knock(at: number, hz: number): SynthLayerV1[] {
  return [
    { wave: "sine", at, ms: 55, hz, hzEnd: hz * 0.62, decay: 3 },
    {
      wave: "noise",
      at,
      ms: 30,
      lowpassHz: 2500,
      highpassHz: 400,
      gain: 0.6,
      attackMs: 1,
      decay: 3,
    },
  ];
}

/** One round of the gatling burst. */
function round(at: number): SynthLayerV1[] {
  return [
    {
      wave: "noise",
      at,
      ms: 45,
      lowpassHz: 3200,
      highpassHz: 500,
      attackMs: 1,
      decay: 3,
    },
    {
      wave: "square",
      at,
      ms: 45,
      hz: 190,
      hzEnd: 110,
      lowpassHz: 1800,
      gain: 0.5,
      decay: 2.5,
    },
  ];
}

/** Every sound as the synthesiser makes it. */
const SYNTH_SOUNDS: Readonly<Record<SoundIdV1, SoundEntryV1>> = {
  "attack.melee": synth("Melee swing", "combat", 2, 60, 0.3, [
    {
      wave: "noise",
      ms: 110,
      lowpassHz: 900,
      lowpassEndHz: 3200,
      highpassHz: 300,
      attackMs: 30,
      decay: 1.5,
    },
    { wave: "triangle", ms: 60, hz: 220, hzEnd: 140, gain: 0.3 },
  ]),
  "attack.ranged": synth("Arrow shot", "combat", 2, 60, 0.28, [
    { wave: "triangle", ms: 70, hz: 520, hzEnd: 300, gain: 0.7, decay: 3 },
    {
      wave: "noise",
      ms: 90,
      lowpassHz: 5000,
      lowpassEndHz: 1500,
      highpassHz: 800,
      gain: 0.5,
      attackMs: 10,
    },
  ]),
  "attack.siege": synth("Siege thump", "combat", 2, 40, 0.4, [
    { wave: "sine", ms: 160, hz: 130, hzEnd: 55 },
    { wave: "noise", ms: 120, lowpassHz: 600, gain: 0.5 },
    {
      wave: "noise",
      at: 40,
      ms: 200,
      lowpassHz: 700,
      lowpassEndHz: 1800,
      gain: 0.3,
      attackMs: 80,
    },
  ]),
  "attack.ray": synth("Energy ray", "combat", 2, 40, 0.28, [
    {
      wave: "saw",
      ms: 220,
      hz: 1400,
      hzEnd: 420,
      lowpassHz: 3800,
      gain: 0.6,
      vibrato: { hz: 28, cents: 40 },
      decay: 1.4,
    },
    { wave: "sine", ms: 220, hz: 700, hzEnd: 210, gain: 0.5, decay: 1.4 },
  ]),
  "attack.magic": synth("Dark bolt", "combat", 2, 40, 0.28, [
    {
      wave: "sine",
      ms: 260,
      hz: 440,
      hzEnd: 660,
      fm: { ratio: 2.01, index: 3, indexEnd: 0.3 },
      decay: 1.5,
    },
    {
      wave: "triangle",
      ms: 200,
      hz: 880,
      hzEnd: 1320,
      gain: 0.25,
      vibrato: { hz: 9, cents: 30 },
    },
  ]),
  "attack.rocket": synth("Rocket launch", "combat", 2, 40, 0.26, [
    {
      wave: "noise",
      ms: 300,
      lowpassHz: 800,
      lowpassEndHz: 4200,
      highpassHz: 400,
      attackMs: 120,
      decay: 1,
    },
    {
      wave: "saw",
      ms: 280,
      hz: 300,
      hzEnd: 900,
      lowpassHz: 2400,
      gain: 0.25,
      attackMs: 60,
    },
  ]),
  "attack.gatling": synth("Gun burst", "combat", 2, 30, 0.32, [
    ...round(0),
    ...round(46),
    ...round(92),
  ]),
  "attack.cannon": synth("Cannon", "combat", 2, 30, 0.45, [
    { wave: "sine", ms: 260, hz: 110, hzEnd: 42, decay: 2.2 },
    {
      wave: "noise",
      ms: 180,
      lowpassHz: 1400,
      lowpassEndHz: 300,
      gain: 0.8,
      attackMs: 2,
    },
  ]),
  "attack.pop": synth("Gumball pop", "combat", 2, 60, 0.26, [
    { wave: "sine", ms: 70, hz: 420, hzEnd: 980 },
    { wave: "triangle", ms: 50, hz: 840, hzEnd: 1500, gain: 0.3 },
  ]),
  "impact.hit": synth("Hit", "combat", 2, 70, 0.4, [
    { wave: "sine", ms: 110, hz: 190, hzEnd: 70, decay: 2.5 },
    {
      wave: "noise",
      ms: 60,
      lowpassHz: 2400,
      highpassHz: 200,
      gain: 0.7,
      attackMs: 1,
      decay: 3,
    },
  ]),
  "impact.heavy": synth("Heavy hit", "combat", 2, 50, 0.46, [
    { wave: "sine", ms: 220, hz: 120, hzEnd: 45 },
    {
      wave: "noise",
      ms: 140,
      lowpassHz: 1500,
      lowpassEndHz: 400,
      gain: 0.8,
      attackMs: 1,
    },
    {
      wave: "square",
      ms: 120,
      hz: 80,
      hzEnd: 50,
      lowpassHz: 600,
      gain: 0.3,
    },
  ]),
  "impact.explosion": synth("Explosion", "combat", 3, 40, 0.5, [
    {
      wave: "noise",
      ms: 420,
      lowpassHz: 2600,
      lowpassEndHz: 180,
      attackMs: 2,
      decay: 1.6,
    },
    { wave: "sine", ms: 380, hz: 90, hzEnd: 36, gain: 0.9, decay: 1.8 },
    { wave: "noise", ms: 200, hz: 900, lowpassHz: 1200, gain: 0.3 },
  ]),
  "impact.ice": synth("Ice crack", "combat", 2, 60, 0.26, [
    tick(0, 1),
    tick(35, 0.8),
    tick(80, 0.6),
    tick(140, 0.45),
    {
      wave: "sine",
      at: 10,
      ms: 160,
      hz: 1250,
      fm: { ratio: 2.7, index: 1, indexEnd: 0.1 },
      gain: 0.5,
      decay: 3,
    },
  ]),
  "impact.splat": synth("Splat", "combat", 2, 60, 0.34, [
    { wave: "sine", ms: 140, hz: 320, hzEnd: 90, decay: 1.8 },
    {
      wave: "noise",
      ms: 150,
      lowpassHz: 1800,
      lowpassEndHz: 500,
      gain: 0.6,
      attackMs: 8,
    },
    { wave: "sine", at: 60, ms: 90, hz: 600, hzEnd: 200, gain: 0.3 },
  ]),
  "impact.shield": synth("Shield", "combat", 2, 40, 0.26, [
    {
      wave: "sine",
      ms: 240,
      hz: 620,
      fm: { ratio: 2.76, index: 2, indexEnd: 0.2 },
      decay: 2.5,
    },
    { wave: "triangle", ms: 180, hz: 1240, gain: 0.2 },
  ]),
  "impact.splash": synth("Splash", "combat", 1, 60, 0.24, [
    {
      wave: "noise",
      ms: 160,
      lowpassHz: 3000,
      lowpassEndHz: 800,
      highpassHz: 500,
      gain: 0.8,
      attackMs: 10,
    },
    { wave: "sine", ms: 120, hz: 500, hzEnd: 250, gain: 0.4 },
  ]),
  "unit.hurt": synth("Damage", "combat", 2, 70, 0.3, [
    {
      wave: "square",
      ms: 120,
      hz: 330,
      hzEnd: 165,
      duty: 0.3,
      lowpassHz: 1800,
    },
    { wave: "noise", ms: 40, lowpassHz: 2000, gain: 0.4, attackMs: 1 },
  ]),
  "unit.death": synth("Death", "combat", 3, 40, 0.34, [
    {
      wave: "triangle",
      ms: 320,
      hz: 392,
      hzEnd: 196,
      vibrato: { hz: 14, cents: 60 },
      decay: 1.3,
    },
    {
      wave: "square",
      at: 120,
      ms: 240,
      hz: 196,
      hzEnd: 82,
      duty: 0.25,
      lowpassHz: 1200,
      gain: 0.4,
    },
    { wave: "noise", at: 140, ms: 200, lowpassHz: 900, gain: 0.25 },
  ]),
  "unit.step": synth("Step", "combat", 1, 90, 0.1, [
    {
      wave: "noise",
      ms: 28,
      lowpassHz: 1100,
      highpassHz: 250,
      attackMs: 1,
      decay: 3,
    },
    { wave: "sine", ms: 30, hz: 150, hzEnd: 110, gain: 0.5 },
  ]),
  "unit.train": synth("Unit trained", "economy", 2, 0, 0.26, [
    ...drum(0, 0.8),
    ...tune(
      "square",
      [
        [72, 70, 70],
        [79, 140, 180],
      ],
      LEAD,
    ),
  ]),
  "unit.levelup": synth("Unit level up", "economy", 3, 0, 0.24, [
    ...tune(
      "square",
      [
        [76, 0, 70],
        [81, 70, 70],
        [85, 140, 200],
      ],
      LEAD,
    ),
    ...tune("triangle", [[69, 140, 200]], { gain: 0.4 }),
  ]),
  "support.heal": synth("Heal", "combat", 2, 0, 0.26, [
    ...tune("triangle", [
      [72, 0, 140],
      [76, 90, 140],
      [79, 180, 220],
    ]),
    ...tune(
      "sine",
      [
        [84, 0, 140],
        [88, 90, 140],
        [91, 180, 220],
      ],
      { gain: 0.15 },
    ),
  ]),
  "support.rally": synth("Rally", "combat", 2, 0, 0.26, [
    ...drum(0),
    ...tune(
      "square",
      [
        [67, 0, 80],
        [72, 80, 80],
        [76, 160, 180],
      ],
      LEAD,
    ),
  ]),
  "support.dark": synth("Dark magic", "combat", 2, 30, 0.3, [
    {
      wave: "saw",
      ms: 360,
      hz: 110,
      hzEnd: 98,
      lowpassHz: 700,
      attackMs: 40,
      vibrato: { hz: 6, cents: 50 },
      decay: 1.4,
    },
    { wave: "sine", ms: 360, hz: 82, hzEnd: 73, gain: 0.6, attackMs: 40 },
    { wave: "triangle", at: 40, ms: 300, hz: 233, hzEnd: 220, gain: 0.3 },
  ]),
  "support.drain": synth("Life drain", "combat", 1, 30, 0.22, [
    {
      wave: "sine",
      ms: 280,
      hz: 300,
      hzEnd: 620,
      attackMs: 60,
      vibrato: { hz: 11, cents: 40 },
      decay: 1.4,
    },
    {
      wave: "triangle",
      ms: 280,
      hz: 600,
      hzEnd: 1240,
      gain: 0.2,
      attackMs: 100,
    },
  ]),
  "special.beam": synth("Beam", "combat", 2, 30, 0.22, [
    {
      wave: "sine",
      ms: 380,
      hz: 380,
      hzEnd: 1100,
      attackMs: 60,
      vibrato: { hz: 18, cents: 35 },
      decay: 1.2,
    },
    {
      wave: "triangle",
      ms: 380,
      hz: 760,
      hzEnd: 1800,
      gain: 0.15,
      attackMs: 60,
    },
  ]),
  "special.mind": synth("Mind control", "combat", 2, 20, 0.22, [
    {
      wave: "sine",
      ms: 460,
      hz: 520,
      attackMs: 60,
      vibrato: { hz: 7, cents: 180 },
      decay: 1.2,
    },
    {
      wave: "sine",
      ms: 460,
      hz: 780,
      gain: 0.4,
      attackMs: 60,
      vibrato: { hz: 9, cents: 180 },
      decay: 1.2,
    },
  ]),
  "special.freeze": synth("Freeze", "combat", 2, 30, 0.2, [
    {
      wave: "noise",
      ms: 380,
      lowpassHz: 5200,
      highpassHz: 1800,
      gain: 0.5,
      attackMs: 150,
      decay: 1.5,
    },
    ...tune(
      "triangle",
      [
        [91, 0, 90],
        [88, 70, 90],
        [84, 140, 160],
      ],
      { gain: 0.5 },
    ),
  ]),
  "special.burrow": synth("Burrow", "combat", 2, 30, 0.34, [
    {
      wave: "noise",
      ms: 340,
      hz: 420,
      lowpassHz: 500,
      attackMs: 60,
      decay: 1.2,
    },
    {
      wave: "sine",
      ms: 340,
      hz: 70,
      hzEnd: 50,
      gain: 0.7,
      attackMs: 30,
      vibrato: { hz: 22, cents: 80 },
    },
  ]),
  "special.hatch": synth("Egg crack", "combat", 2, 50, 0.26, [
    tick(0, 1),
    tick(50, 0.8),
    tick(90, 0.7),
    { wave: "sine", at: 110, ms: 90, hz: 500, hzEnd: 900, gain: 0.6 },
  ]),
  "special.pop": synth("Pop", "combat", 1, 70, 0.24, [
    { wave: "sine", ms: 55, hz: 300, hzEnd: 900 },
    { wave: "noise", ms: 12, lowpassHz: 3000, gain: 0.3, attackMs: 1 },
  ]),
  "special.puff": synth("Steam puff", "combat", 1, 60, 0.2, [
    {
      wave: "noise",
      ms: 180,
      lowpassHz: 2400,
      lowpassEndHz: 700,
      highpassHz: 500,
      attackMs: 20,
      decay: 1.6,
    },
  ]),
  "special.sparkle": synth("Sparkle", "combat", 2, 0, 0.2, [
    ...tune("triangle", [
      [76, 0, 70],
      [79, 55, 70],
      [83, 110, 70],
      [88, 165, 160],
    ]),
  ]),
  "special.dizzy": synth("Dizzy", "combat", 1, 30, 0.22, [
    {
      wave: "sine",
      ms: 380,
      hz: 700,
      hzEnd: 260,
      vibrato: { hz: 9, cents: 220 },
      decay: 1.2,
    },
    { wave: "triangle", ms: 380, hz: 350, hzEnd: 130, gain: 0.3, decay: 1.2 },
  ]),
  "special.boing": synth("Bounce", "combat", 1, 50, 0.26, [
    {
      wave: "triangle",
      ms: 220,
      hz: 160,
      hzEnd: 420,
      vibrato: { hz: 24, cents: 90 },
      decay: 1.5,
    },
  ]),
  "city.capture": synth("City captured", "economy", 3, 0, 0.32, [
    ...drum(0),
    ...drum(330),
    ...tune(
      "square",
      [
        [72, 0, 110],
        [76, 110, 110],
        [79, 220, 110],
        [84, 330, 320],
      ],
      LEAD,
    ),
    ...tune(
      "triangle",
      [
        [48, 0, 250],
        [55, 330, 320],
      ],
      { gain: 0.5 },
    ),
  ]),
  "village.capture": synth("Village captured", "economy", 3, 0, 0.28, [
    ...drum(0),
    ...tune(
      "square",
      [
        [67, 0, 100],
        [72, 100, 100],
        [76, 200, 260],
      ],
      LEAD,
    ),
    ...tune("triangle", [[48, 200, 260]], { gain: 0.5 }),
  ]),
  "city.lost": synth("City lost", "economy", 3, 0, 0.3, [
    ...tune(
      "square",
      [
        [64, 0, 150],
        [60, 150, 150],
        [57, 300, 380],
      ],
      { duty: 0.25, lowpassHz: 1800, decay: 1.4 },
    ),
    ...tune("triangle", [[45, 300, 380]], { gain: 0.5 }),
  ]),
  "city.levelup": synth("City level up", "economy", 3, 0, 0.28, [
    ...tune("triangle", [
      [72, 0, 90],
      [76, 70, 90],
      [79, 140, 90],
      [84, 210, 260],
    ]),
    ...tune(
      "square",
      [
        [60, 0, 200],
        [72, 210, 260],
      ],
      { ...LEAD, gain: 0.35 },
    ),
  ]),
  "reward.chosen": synth("Reward chosen", "economy", 3, 0, 0.24, [
    ...tune("triangle", [
      [79, 0, 90],
      [86, 90, 260],
    ]),
    {
      wave: "sine",
      at: 90,
      ms: 260,
      hz: midiHzV1(86),
      fm: { ratio: 3.5, index: 0.8, indexEnd: 0.05 },
      gain: 0.3,
      decay: 2.5,
    },
  ]),
  "research.complete": synth("Research done", "economy", 3, 0, 0.26, [
    {
      wave: "sine",
      ms: 300,
      hz: midiHzV1(74),
      fm: { ratio: 3.01, index: 1.2, indexEnd: 0.1 },
      decay: 2.2,
    },
    {
      wave: "sine",
      at: 140,
      ms: 420,
      hz: midiHzV1(81),
      fm: { ratio: 3.01, index: 1.2, indexEnd: 0.1 },
      decay: 2.2,
    },
  ]),
  "economy.build": synth("Build", "economy", 2, 40, 0.3, [
    ...knock(0, 240),
    ...knock(130, 280),
  ]),
  "economy.harvest": synth("Harvest", "economy", 2, 40, 0.22, [
    { wave: "triangle", ms: 110, hz: 392, hzEnd: 370, decay: 3 },
    {
      wave: "noise",
      ms: 50,
      lowpassHz: 3500,
      highpassHz: 900,
      gain: 0.3,
      attackMs: 2,
    },
    { wave: "triangle", at: 70, ms: 120, hz: 587, gain: 0.6, decay: 3 },
  ]),
  "economy.coin": synth("Coins", "economy", 2, 20, 0.2, [
    ...tune(
      "square",
      [
        [83, 0, 70],
        [88, 70, 260],
      ],
      { lowpassHz: 4200, decay: 2.5 },
    ),
    ...tune(
      "sine",
      [
        [83, 0, 70],
        [88, 70, 260],
      ],
      { gain: 0.4, decay: 2.5 },
    ),
  ]),
  "economy.treasure": synth("Treasure", "economy", 3, 0, 0.22, [
    ...tune(
      "square",
      [
        [76, 0, 60],
        [83, 60, 60],
        [88, 120, 60],
        [92, 180, 300],
      ],
      { lowpassHz: 4200, decay: 2.2 },
    ),
    ...tune("triangle", [[64, 180, 300]], { gain: 0.5 }),
  ]),
  "turn.start": synth("Your turn", "ui", 3, 0, 0.24, [
    ...tune("triangle", [
      [76, 0, 120],
      [81, 110, 320],
    ]),
    ...tune("sine", [[69, 110, 320]], { gain: 0.3 }),
  ]),
  "turn.end": synth("End turn", "ui", 2, 0, 0.18, [
    ...tune("triangle", [
      [69, 0, 110],
      [64, 100, 260],
    ]),
  ]),
  "achievement.unlocked": synth("Achievement", "ui", 3, 0, 0.32, [
    ...drum(0),
    ...drum(650),
    ...tune(
      "square",
      [
        [67, 0, 100],
        [72, 100, 100],
        [76, 200, 100],
        [79, 300, 100],
        [84, 400, 160],
        [79, 560, 90],
        [84, 650, 500],
      ],
      LEAD,
    ),
    ...tune(
      "triangle",
      [
        [48, 0, 380],
        [55, 400, 240],
        [48, 650, 500],
      ],
      { gain: 0.5 },
    ),
  ]),
  "achievement.monument": synth("Monument", "ui", 3, 0, 0.32, [
    ...drum(0),
    ...drum(900),
    ...tune(
      "triangle",
      [
        [60, 0, 380],
        [64, 0, 380],
        [67, 0, 380],
        [65, 300, 380],
        [69, 300, 380],
        [72, 300, 380],
        [67, 600, 320],
        [71, 600, 320],
        [74, 600, 320],
        [72, 900, 700],
        [76, 900, 700],
        [79, 900, 700],
      ],
      { gain: 0.5, attackMs: 12, decay: 1.4 },
    ),
    ...tune(
      "square",
      [
        [72, 0, 300],
        [77, 300, 300],
        [79, 600, 300],
        [84, 900, 700],
      ],
      { ...LEAD, gain: 0.6 },
    ),
  ]),
  "match.victory": synth("Victory", "ui", 3, 0, 0.36, [
    ...drum(0),
    ...drum(390),
    ...drum(780),
    ...tune(
      "square",
      [
        [72, 0, 130],
        [76, 130, 130],
        [79, 260, 130],
        [84, 390, 260],
        [79, 650, 130],
        [84, 780, 320],
        [88, 1100, 700],
      ],
      LEAD,
    ),
    ...tune(
      "triangle",
      [
        [64, 0, 130],
        [67, 130, 130],
        [72, 260, 130],
        [76, 390, 260],
        [72, 650, 130],
        [76, 780, 320],
        [79, 1100, 700],
      ],
      { gain: 0.5 },
    ),
    ...tune(
      "triangle",
      [
        [48, 0, 380],
        [55, 390, 380],
        [48, 780, 320],
        [48, 1100, 700],
      ],
      { gain: 0.5 },
    ),
  ]),
  "match.defeat": synth("Defeat", "ui", 3, 0, 0.32, [
    ...tune(
      "triangle",
      [
        [69, 0, 300],
        [67, 300, 300],
        [65, 600, 300],
        [64, 900, 800],
      ],
      { attackMs: 12, decay: 1.3, vibrato: { hz: 5, cents: 25 } },
    ),
    ...tune(
      "saw",
      [
        [45, 0, 600],
        [41, 600, 300],
        [40, 900, 800],
      ],
      { lowpassHz: 600, gain: 0.5, attackMs: 20, decay: 1.3 },
    ),
  ]),
  "ui.select": synth("Select", "ui", 1, 20, 0.12, [
    { wave: "triangle", ms: 50, hz: 660, hzEnd: 700, decay: 3 },
  ]),
  "ui.click": synth("Click", "ui", 1, 20, 0.12, [
    { wave: "sine", ms: 35, hz: 420, hzEnd: 300, decay: 3 },
    { wave: "noise", ms: 8, lowpassHz: 3000, gain: 0.3, attackMs: 1 },
  ]),
  "ui.toggle": synth("Toggle", "ui", 2, 0, 0.14, [
    ...tune("triangle", [
      [72, 0, 50],
      [79, 50, 90],
    ]),
  ]),
  "ui.error": synth("Not allowed", "ui", 2, 0, 0.2, [
    ...tune(
      "square",
      [
        [55, 0, 90],
        [51, 100, 160],
      ],
      { lowpassHz: 900, decay: 1.5 },
    ),
  ]),
};

/**
 * The manifest: the synthesised sounds, and for each sound with a clip in
 * `stock-sounds.json` the clip as its source and the synthesised sound as
 * its fallback. A clip whose id is not a sound of the game is left out (a
 * unit test names it).
 */
export const SOUND_MANIFEST_V1: Readonly<Record<SoundIdV1, SoundEntryV1>> =
  (() => {
    const manifest: Record<SoundIdV1, SoundEntryV1> = { ...SYNTH_SOUNDS };
    for (const clip of STOCK_SOUND_CLIPS_V1) {
      const id = SOUND_IDS_V1.find((sound) => sound === clip.id);
      if (id === undefined) continue;
      const entry = SYNTH_SOUNDS[id];
      if (entry.source.kind !== "SYNTH") continue;
      manifest[id] = {
        ...entry,
        source: {
          kind: "FILE",
          url: stockSoundUrlV1(clip),
          fallback: entry.source.recipe,
          gain: clip.gain,
        },
      };
    }
    return manifest;
  })();

/** The synth recipe an entry plays when no recording is available. */
export function soundRecipeV1(id: SoundIdV1): SynthRecipeV1 | null {
  const source = SOUND_MANIFEST_V1[id].source;
  return source.kind === "SYNTH" ? source.recipe : (source.fallback ?? null);
}
