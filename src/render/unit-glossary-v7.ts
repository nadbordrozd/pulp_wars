import {
  effectiveRoleRuleV7,
  factionRulesV7,
  isNavalRoleV7,
  roleMechanicsV7,
  type FactionIdV7,
  type UnitRoleAbilityV7,
  type UnitRoleIdV7,
} from "../engine/index";

/**
 * The unit glossary (bead pulp_wars-2yc.39): one name and one or two plain
 * sentences for every ability, trait and status a unit can have, and for
 * the handful of terms a unit card shows. The unit "?" dialog, the recruit
 * "?" dialog and the Gallery's unit detail read these texts, so a rule is
 * worded once.
 *
 * An entry says what the thing does and when it matters, never how much: no
 * formula, and a number only where it is the whole point (a range, "once").
 * `tests/unit/unit-glossary-ui-v7.test.ts` holds every entry to that and
 * fails when a registered unit has an ability or trait without an entry.
 */
export interface GlossaryEntryV7 {
  readonly id: GlossaryIdV7;
  readonly name: string;
  readonly text: string;
}

/** The most characters an entry's text may have. */
export const GLOSSARY_TEXT_LIMIT_V7 = 160;

const ENTRIES = {
  // ------------------------------------------------- terms on a unit card
  TERM_HP: [
    "Health",
    "How much damage it can take. A wounded unit also fights worse.",
  ],
  TERM_ATTACK: ["Attack", "How hard it hits when it attacks."],
  TERM_DEFENSE: [
    "Defense",
    "How well it stands up to a hit, and how hard it hits back.",
  ],
  TERM_MOVE: [
    "Movement",
    "How many tiles it can move in a turn. Forests, mountains and enemies next to its path stop it.",
  ],
  TERM_RANGE: [
    "Range",
    "How far away it can attack. A range of 1 is the next tile.",
  ],
  TERM_SIGHT: ["Sight", "How far it sees into the fog."],
  TERM_COVER: [
    "Cover",
    "A unit on a mountain is harder to hurt. Forests give cover too, once researched.",
  ],
  TERM_FORTIFIED: [
    "Fortified",
    "City Walls and Field Defense make your unit standing there harder to hurt.",
  ],
  TERM_HITTING_BACK: [
    "Hitting back",
    "A unit that survives an attack hits back, if the attacker is within its own range.",
  ],
  TERM_VETERAN: [
    "Veteran",
    "After 3 kills a unit can be promoted: more health, and it heals fully.",
  ],
  TERM_SLOTS: [
    "Slots",
    "A city supports a limited number of units. Bigger cities support more.",
  ],

  // ------------------------------------------------------ shared abilities
  CAPTURE: [
    "Capture",
    "Takes a village or an enemy city when it starts your turn standing on its centre.",
  ],
  CHARGE: [
    "Charge",
    "Its first attack after a long move hits harder. Unlocked by a technology.",
  ],
  POUNCE: [
    "Pounce",
    "Its first attack after a long move hits harder. Unlocked by a technology.",
  ],
  STRAFE: [
    "Strafe",
    "Its first attack after a long move hits harder. Unlocked by a technology.",
  ],
  ESCAPE: ["Escape", "After attacking it may move once more, if it survived."],
  RALLY: [
    "Rally",
    "Friendly units next to it hit harder on their next attack this turn.",
  ],
  FRENZY: [
    "Frenzy",
    "Friendly units next to it hit harder on their next attack this turn.",
  ],
  // `pulp_wars-w49.36`: the Orc Warboss's Berserk replaced WAAAGH!.
  BERSERK: [
    "Berserk",
    "Your units within 2 tiles that have not moved yet go one tile farther this turn, and enemies next to their path do not stop them.",
  ],
  WAR_DRUMS: [
    "War Drums",
    "Friendly units next to it hit harder on their next attack this turn.",
  ],
  PSYCHIC_COMMAND: [
    "Psychic Command",
    "Friendly units next to it hit harder on their next attack. It can do this every second turn.",
  ],
  TEND: [
    "Tend",
    "Heals the wounded friendly units next to it and cures their ailments.",
  ],
  TEND_DINOSAUR: [
    "Tend",
    "Heals the wounded friendly units next to it, dinosaurs most of all, and cures their ailments.",
  ],
  REPAIR: [
    "Repair",
    "Heals the friendly units next to it, machines most of all, and cures their ailments. It also mends your Barricades.",
  ],
  OVERRUN: [
    "Overrun",
    "After a kill it takes the tile and may attack again, for as long as it keeps killing.",
  ],
  RAM_BUGGY: [
    "Ram",
    "After a kill it takes the tile and may attack again, for as long as it keeps killing.",
  ],
  RAMPAGE: [
    "Rampage",
    "After a kill it takes the tile and may attack again, for as long as it keeps killing.",
  ],
  PUSH: ["Push", "Shoves a target that survives its attack one tile back."],
  // The giants' signatures (`pulp_wars-w49.30`, worded by `pulp_wars-w49.32`):
  // one per faction giant (docs/product/RULESET_7_GIANTS.md section 6).
  CRUSH: [
    "Crushing Shove",
    "A target it hits but cannot push back is crushed for extra damage instead, and an enemy standing behind it is hurt too.",
  ],
  SWALLOW: [
    "Swallow",
    "Swallows a weakened enemy next to it whole. Each of your turns it digests some, healing itself, then spits it out as your Zombie.",
  ],
  TOSS: [
    "Goblin Toss",
    "Throws a Goblin next to it two or three tiles, over anything in between. The Goblin can still attack or Kaboom after it lands.",
  ],
  STOMP: [
    "Thunder Stomp",
    "If it has not moved, it hurts every enemy on the ground around it at once and smashes their Field Defense. Nobody hits back.",
  ],
  OVERSTRIDE: [
    "Overstride",
    "Strides over units and through enemy zones of control, trampling every enemy it steps over on the way.",
  ],
  GLACIAL_SMASH: [
    "Glacial Smash",
    "Its hit shatters a Frozen enemy that it leaves badly hurt, and the flying shards freeze the enemies around it. It never advances.",
  ],
  SIEGE_HAMMER: [
    "Siege Hammer",
    "Its blows ignore Walls and Field Defense, smash the Field Defense, and tear a city's Walls down for good.",
  ],
  BREAK_OFF: [
    "Break Off",
    "Spends some of its health to make two Gingerbread Men beside it. Each fights as a Toffee Trooper at full health.",
  ],

  // ------------------------------------------------------------------ ships
  SHIP: ["Ship", "Built at a Port. It heals only next to your own Ports."],
  BOW_RAM: [
    "Bow Ram",
    "After moving it hits ships harder and shoves them back. Unlocked by a technology.",
  ],
  SUBMERGED: [
    "Submerged",
    "Under water: it can only be attacked from the next tile.",
  ],
  TORPEDO: [
    "Torpedo",
    "Attacks only ships and transports, and they cannot hit back.",
  ],
  AT_SEA: [
    "At sea",
    "A transport carries a land unit across water. The unit cannot fight until it lands on a shore.",
  ],

  // ------------------------------------------------------- generic traits
  RANGED: [
    "Ranged",
    "Attacks from a distance. A target that cannot reach it cannot hit back.",
  ],
  LONG_SHOT: [
    "Long shot",
    "Shoots over a distance only: it cannot hit a unit on the next tile.",
  ],
  SLOW_TO_STRIKE: ["Slow to strike", "Cannot attack on a turn it has moved."],
  SLIPS_PAST: [
    "Slips past",
    "Enemies next to its path do not stop its movement.",
  ],
  OPEN_TO_RANGED: [
    "Open to ranged",
    "Defends worse against attacks from a distance.",
  ],
  SPLASH: ["Splash", "Its shots also hurt the enemies next to the target."],
  WRECKER: [
    "Wrecker",
    "Its attack knocks down the Field Defense under the target.",
  ],

  // ----------------------------------------------------------------- Undead
  RESTLESS: ["Restless", "Heals only inside your own borders."],
  BONES: ["Bones", "Defends better against attacks from a distance."],
  CARRION: ["Carrion", "Hits a Bitten or Plagued unit harder."],
  DEVOUR: [
    "Devour",
    "Eats the Grave under it to heal fully. That ends its turn.",
  ],
  WAIL: [
    "Wail",
    "Hurts every living enemy within 2 tiles at once. It has no ordinary attack.",
  ],
  INFECT: ["Infect", "A land unit it kills rises again as your Zombie."],
  BITE: [
    "Bite",
    "Units it wounds are Bitten: when they die, they rise as your Zombies.",
  ],
  RAISE_DEAD: [
    "Raise Dead",
    "Raises a Skeleton from every free Grave within 2 tiles.",
  ],
  PLAGUE: [
    "Plague",
    "Units it hits catch the Plague: they lose health every turn and can pass it on. Unlocked by a technology.",
  ],
  LIFESTEAL: ["Lifesteal", "Heals itself by the damage it deals."],
  UNANSWERED: ["Unanswered", "Units it attacks cannot hit back."],
  // The Vampire and Banshee rework (`pulp_wars-ty6i`).
  FEAST: [
    "Feast",
    "When its attack kills, it heals fully and may attack once more this turn.",
  ],
  BAT_ESCAPE: [
    "Bat Escape",
    "After attacking it may fly up to 2 tiles, over units and past enemies, to an empty land tile.",
  ],
  TERROR: [
    "Terror",
    "Enemies its Wail hurts cannot hit back until the end of your turn.",
  ],
  ETHEREAL: ["Ethereal", "Enemies next to its path do not stop it."],
  RISE_AGAIN: [
    "Rise Again",
    "Once, after it falls, it climbs back out of its Grave on your next turn, unless a unit stands on the Grave.",
  ],

  // ---------------------------------------------------------------- Goblins
  KABOOM: [
    "Kaboom!",
    "Blows itself up, hurting every unit next to it, yours too.",
  ],
  EXPLODES: [
    "Explodes on death",
    "However it dies, it blows up and hurts every unit next to it, yours too.",
  ],
  GANG_UP: [
    "Gang Up",
    "Hits harder for each of your other units next to its target.",
  ],
  BOMBS: [
    "Bombs",
    "Its bomb also hurts every unit next to the target, yours too.",
  ],
  BLAST_PROOF: ["Blast-proof", "Explosions and bomb splash do not hurt it."],
  CRASH: ["Crash", "It can Kaboom even after it has attacked."],
  REGENERATE: [
    "Regenerate",
    "Heals itself at the start of every turn, wherever it stands.",
  ],
  HEAVYWEIGHT: [
    "Heavyweight",
    "Counts as two units when your others Gang Up on a target next to it.",
  ],

  // -------------------------------------------------------------- Dinosaurs
  EGG_LAID: [
    "Egg-laid",
    "Laid as an Egg on a tile next to its city. It hatches a few turns later.",
  ],
  EGG: [
    "Egg",
    "Cannot move or fight, and is easy to smash. It hatches into the unit inside when its countdown ends.",
  ],
  BIG_BODY: ["Big body", "Takes two unit slots in its city."],
  GROW: [
    "Grows",
    "Gets bigger and tougher as it kills, for good. Each growth heals it fully.",
  ],
  PACK_HUNT: [
    "Pack Hunt",
    "Hits harder against a unit that stands next to one of your dinosaurs.",
  ],
  ACID: ["Acid", "Its spit ignores cover, Walls and Field Defense."],
  ARMOURED: ["Armoured", "Takes a little less damage from every hit."],
  HATCH: [
    "Hatch",
    "Hatches an Egg next to it at once, instead of waiting out its turns.",
  ],
  CHARGE_BANG: [
    "Charge!",
    "Hits harder after moving. Ignores Walls and Field Defense, and shoves the target back.",
  ],
  THAGOMIZER: [
    "Thagomizer",
    "A unit it hits is Cracked: easier to hurt for the rest of your turn.",
  ],

  // --------------------------------------------------------------- Martians
  SHIELD: [
    "Shield",
    "Soaks up damage before its health does, and refills at the start of your turn.",
  ],
  FLY: ["Flies", "Flies over any terrain and any unit."],
  STRIDE: [
    "Strides",
    "Walks through forest, mountain and shallow water without stopping. It never gets cover.",
  ],
  HEAT_RAY: [
    "Heat ray",
    "Strongest when it has not moved. A full-power shot leaves it Cooling: weaker until the end of its next turn.",
  ],
  PIERCE: [
    "Pierce",
    "Its ray also hits the unit right behind the target, friend or foe.",
  ],
  FORCE_FIELD: [
    "Force Field",
    "Friendly units next to it get a stronger Shield. Unlocked by a technology.",
  ],
  BEAM_DOWN: [
    "Beam Down",
    "Brings one of your units from a city, or from nearby, to its side. That unit can still attack.",
  ],
  TRACTOR_BEAM: [
    "Tractor Beam",
    "Pulls a unit 2 tiles away one tile closer, as its action for the turn. City Walls hold a unit on its own city.",
  ],
  TRACTOR_BEAM_HEAVY: [
    "Tractor Beam",
    "Pulls a distant unit closer once a turn, even off City Walls. It can still move and attack afterwards.",
  ],
  MIND_CONTROL: [
    "Mind Control",
    "Takes over a badly wounded enemy nearby. It fights for you until this unit is lost.",
  ],
  SHOCK_FIELD: [
    "Shock Field",
    "While its Shield holds, an enemy that attacks it from the next tile is hurt in return.",
  ],

  // --------------------------------------------------------------- Ice Folk
  GLIDE: ["Glide", "Moves faster from snow to snow."],
  MOUNTAIN_BORN: [
    "Mountain-born",
    "Crosses mountains freely, with no technology needed.",
  ],
  ROCKFALL: ["Rockfall", "From a mountain it can attack 2 tiles away."],
  FREEZE: [
    "Freeze",
    "Turns the water next to it to ice, which your units slide across. Unlocked by a technology.",
  ],
  BOLAS: ["Bolas", "Freezes an enemy within 2 tiles. It does no damage."],
  COLD_BLOOD: ["Cold Blood", "Hits a Frozen unit harder."],
  BLIZZARD: [
    "Blizzard",
    "Snow follows her: your units next to her take less damage from ranged attacks.",
  ],
  COLD_SNAP: ["Cold Snap", "Freezes every enemy next to her."],
  // Ice Folk Freeze (`pulp_wars-w49.37`): the Witch's Frost Bolt and the
  // Mammoth's Stampede.
  FROST_BOLT: [
    "Frost Bolt",
    "Freezes one enemy within 2 tiles instead of a Cold Snap. It does no damage.",
  ],
  STAMPEDE: [
    "Stampede",
    "If it has not moved, it charges up to three tiles in a straight line, hitting each enemy in its way for 3 and shoving it aside. Nobody strikes back.",
  ],
  BOULDERS: [
    "Boulders",
    "Its throw ignores Walls and Field Defense, and hits harder when it has not moved.",
  ],
  PROWL: ["Prowl", "Enemies next to its path do not stop it."],
  COLD_AURA: [
    "Cold Aura",
    "Freezes every enemy next to it when it ends its own move.",
  ],
  SWEEP: [
    "Sweep",
    "Its attack also hurts the enemies on both sides of the target.",
  ],
  TRAMPLE: [
    "Trample",
    "Its attack flattens the Field Defense under the target.",
  ],
  FROSTBITE: [
    "Frostbite",
    "An enemy that attacks it from the next tile and survives is Frozen.",
  ],

  // ----------------------------------------------------------------- Dwarves
  RIDES_TUNNEL: [
    "Rides the tunnel",
    "Can travel underground with a Steam Mole next to it and come up beside it.",
  ],
  DIG_IN: [
    "Dig In",
    "Standing still on or next to your city, it defends as if fortified. Unlocked by a technology.",
  ],
  BOMB_RUN: [
    "Bomb Run",
    "Flies over an enemy within 2 tiles, bombs it and lands on its far side, beside it or a tile beyond. Nothing hits back.",
  ],
  CLOCKWORK: [
    "Clockwork",
    "Hits at full strength even when damaged. It never heals by itself: only an Engineer repairs it.",
  ],
  TWIN_SHOT: [
    "Twin shot",
    "Shoots twice on a turn it has not moved. After shooting it cannot move.",
  ],
  TUNNEL: [
    "Tunnel",
    "Digs under anything, up to 3 tiles away, and surfaces at the start of your next turn.",
  ],
  ERUPTION: [
    "Eruption",
    "When it surfaces it hurts every enemy next to it and wrecks the Field Defense around it.",
  ],
  ASSEMBLE: [
    "Assemble",
    "Builds a Clockwork Gunner on a free tile next to it, for Coins. Unlocked by a technology.",
  ],
  KNOCKBACK: [
    "Knockback",
    "Its shot knocks a surviving target one tile straight back.",
  ],
  PLATED: ["Plated", "Thick plating: one hit never takes much of its health."],
  MACHINE: ["Machine", "An Engineer's Repair heals it more than other units."],
  // Dwarf crowd control (`pulp_wars-w49.33`).
  WHIRL: ["Whirl", "Hits every enemy next to it at once. Nobody hits back."],
  BARRICADE: [
    "Barricade",
    "Builds a Barricade on a free tile next to it, for Coins. It blocks every unit until attacks break it.",
  ],

  // ------------------------------------------------------------------ Candy
  SUGAR_RUSH: [
    "Sugar Rush",
    "Before it moves: it goes farther and hits harder this turn, then Crashes and cannot act next turn.",
  ],
  SUGAR_TOSS: ["Sugar Toss", "Heals one of your units within 2 tiles."],
  // The Candy redesign (`pulp_wars-jdb.12`,
  // docs/product/RULESET_7_CANDY_REDESIGN.md section 7).
  STICKY: [
    "Sticky Toffee",
    "A unit it hits, or strikes back at, can move only one tile until the end of its next turn.",
  ],
  GLAZE_TRAIL: [
    "Glaze Trail",
    "The tiles it rolls off are glazed for the rest of the turn; your units move onto them at half cost.",
  ],
  RICOCHET: [
    "Ricochet",
    "A shot from two tiles bounces on to the weakest enemy next to the target for half the damage.",
  ],
  HOP: [
    "Bunny Hop",
    "Its move may hop over one tile, whatever stands there, but never over water.",
  ],
  THUMP: [
    "Thump",
    "Every attack it makes also hurts each other enemy around it a little.",
  ],
  TOOTHACHE: [
    "Toothache",
    "An enemy that bites it from the next tile has its next attack 1 weaker.",
  ],
  TOP_UP: [
    "Top-Up",
    "One of your units next to it stops being Crashed, heals a little, and is cured.",
  ],
  BOUNCY: [
    "Bouncy",
    "An enemy that hits it from the next tile and survives is bounced one tile back.",
  ],
  REBAKE: [
    "Re-bake",
    "Scoops Crumbs within 2 tiles and bakes the fallen unit back next to itself, cheaply and at half health.",
  ],
  SPLAT: ["Splat", "A unit it hits cannot hit back for the rest of your turn."],
  CRUMBS: [
    "Crumbs",
    "When it falls it leaves Crumbs. A Confectioner can bake it back from them.",
  ],
  ROCK_HARD: [
    "Rock Hard",
    "Nothing moves it: no push, pull, knockback or bounce.",
  ],

  // ---------------------------------------------------------------- neutral
  SPIDER: [
    "Neutral",
    "Belongs to nobody. It wanders near its lair and attacks the weakest unit that came next to it or hurt it.",
  ],
  SPIDER_REGENERATES: ["Regenerates", "Heals itself after every round."],
  SPIDER_BOUNTY: ["Bounty", "Killing it pays Coins."],

  // --------------------------------------------------------------- statuses
  STATUS_NEUTRAL: ["Neutral", "Belongs to no player."],
  STATUS_PROVOKED: [
    "Provoked",
    "A unit came next to it or hurt it. It attacks after this round.",
  ],
  STATUS_RESTLESS: [
    "Restless",
    "It is outside your borders, so it will not heal here.",
  ],
  STATUS_DONE: [
    "Done this turn",
    "It has nothing left to do this turn. It can act again on your next turn.",
  ],
  STATUS_RESTING: [
    "Resting",
    "It has not moved or acted, so it heals at the end of your turn.",
  ],
  STATUS_ON_GRAVE: [
    "On a Grave",
    "A unit fell here. The Undead can raise or devour the Grave.",
  ],
  STATUS_PLAGUED: [
    "Plagued",
    "Loses health every turn and can pass the Plague to its neighbours. A healer's Tend cures it.",
  ],
  STATUS_BITTEN: [
    "Bitten",
    "If it dies it rises as an enemy Zombie. A healer's Tend cures it.",
  ],
  STATUS_HATCHING: ["Hatching", "The turns left until this Egg hatches."],
  STATUS_GROWTH: [
    "Growth",
    "A dinosaur grows as it kills: first Big, then Alpha.",
  ],
  STATUS_COOLING: [
    "Cooling",
    "Its heat ray fires at half power until the end of its next turn.",
  ],
  STATUS_RAY_POWER: [
    "Ray power",
    "Full power when it has not moved this turn; half power after moving.",
  ],
  STATUS_CONTROLLING: [
    "Controlling",
    "This Brain holds an enemy unit. The unit goes home when the Brain is lost.",
  ],
  STATUS_RECHARGING: [
    "Recharging",
    "It must wait a few turns before it can take another unit.",
  ],
  STATUS_CONTROLLED: [
    "Controlled",
    "A Brain controls it. It returns to its owner when that Brain is lost.",
  ],
  STATUS_BEAMED: [
    "Beamed",
    "Set down by a beam this turn: it can attack but not move.",
  ],
  STATUS_BEAM_USED: ["Beam used", "Its free pull is spent for this turn."],
  STATUS_AFLOAT: [
    "Afloat",
    "A machine crossing water. It cannot fight until it reaches a shore.",
  ],
  STATUS_BOARDABLE: [
    "Boardable",
    "Badly damaged: an enemy ship next to it can capture it.",
  ],
  STATUS_ICEBOUND: [
    "Icebound",
    "Locked in ice: it cannot sail, shoot or hit back, and the ice crushes it every turn.",
  ],
  STATUS_ICE_CRUSH: [
    "Ice crush",
    "The ice hurts it at the start of the Ice Folk turn.",
  ],
  STATUS_ICE_COVER: [
    "Ice cover",
    "Harder to hurt while it stands on its own ice.",
  ],
  STATUS_ON_ICE: [
    "On ice",
    "Ice Folk slide across ice. Every other unit stops when it steps onto it.",
  ],
  // Ice Folk Freeze (`pulp_wars-w49.38`): Frozen is the one Ice Folk
  // status of a unit.
  STATUS_FROZEN: [
    "Frozen",
    "It cannot move or act or strike back until it thaws at the end of its owner's turn (the chip counts them). Ice Folk can shatter a weak Frozen unit.",
  ],
  STATUS_SNOW: [
    "Snow",
    "Ice Folk cross snow fast and are harder to hurt on it. Other units stop on entering it.",
  ],
  STATUS_BLIZZARD: [
    "Blizzard",
    "In an Ice Witch's Blizzard: Ice Folk units here take less damage from ranged attacks.",
  ],
  STATUS_PLANTED: [
    "Planted",
    "A Boulder Yeti that has not moved this turn throws harder.",
  ],
  STATUS_RUSHED: [
    "Rushed",
    "On a Sugar Rush: it goes farther and hits harder this turn, and Crashes next turn.",
  ],
  STATUS_HOME_SWEET_HOME: [
    "Home Sweet Home",
    "On or next to its own city: it will not Crash after this Rush.",
  ],
  STATUS_CRASHED: [
    "Crashed",
    "Worn out after a Sugar Rush: it can move, but not attack or use abilities.",
  ],
  STATUS_SPLATTED: ["Splatted", "Hit by a pie: it cannot hit back this turn."],
  // The Candy redesign (`pulp_wars-jdb.14`): what a Toffee Trooper and a
  // Jawbreaker leave on the units that fight them.
  STATUS_STUCK: [
    "Stuck",
    "Gummed up with toffee: it can move only one tile until the end of its next turn.",
  ],
  STATUS_TOOTHACHE: [
    "Toothache",
    "It bit a Jawbreaker: its next attack is 1 weaker.",
  ],
  STATUS_BOMBED: [
    "Bombed",
    "Bombed this turn already: it cannot be bombed again.",
  ],
  STATUS_DUG_IN: [
    "Dug in",
    "It defends as if fortified while it stays put by its city.",
  ],
  STATUS_NOT_DUG_IN: [
    "Not dug in",
    "It moved, or it is away from its city: no Dig In for now.",
  ],
  STATUS_SHOTS: ["Shots", "How many times it can still shoot this turn."],
  STATUS_SURFACED: [
    "Just surfaced",
    "It came up from a tunnel: it cannot step into a city or village this turn.",
  ],
  STATUS_INSPIRED: ["Inspired", "Its next attack this turn hits harder."],
  STATUS_BERSERK: [
    "Berserk",
    "It goes one tile farther this turn, and enemies next to its path do not stop it.",
  ],
  STATUS_RUN_UP: ["Charge!", "It moved this turn, so its attack hits harder."],
  STATUS_TENDED: ["Tended", "A healer has already tended it this turn."],
  STATUS_ATTACK_AGAIN: ["Attack again", "It just killed: it may attack again."],
  STATUS_ESCAPE: ["Escape", "It may move once more this turn."],
  STATUS_BAT_ESCAPE: [
    "Bat Escape",
    "It may fly off this turn, over units and past enemies.",
  ],
  // The Vampire and Banshee rework (`pulp_wars-ty6i`).
  STATUS_FEAST: [
    "Feast",
    "It just killed and healed: it may attack once more.",
  ],
  STATUS_TERROR: [
    "Terror",
    "A Banshee's wail terrified it: it cannot hit back until the end of this turn.",
  ],
  STATUS_CRACKED: ["Cracked", "Easier to hurt for the rest of this turn."],
  STATUS_RISEN: [
    "Risen",
    "It has climbed out of its Grave once. It will not rise again.",
  ],
  // The giants' signatures (`pulp_wars-w49.32`).
  STATUS_SWALLOWED: [
    "Swallowed",
    "It holds an enemy inside and digests it a little each of your turns. If it dies first, the enemy is freed.",
  ],
  STATUS_GINGERBREAD_MAN: [
    "Gingerbread Man",
    "Broken off a Gingerbread Giant. It is a Toffee Trooper in every way.",
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>;

export type GlossaryIdV7 = keyof typeof ENTRIES;

/** Every glossary ID, in the order of the table. */
export const GLOSSARY_IDS_V7 = Object.freeze(
  Object.keys(ENTRIES) as GlossaryIdV7[],
);

export function glossaryEntryV7(id: GlossaryIdV7): GlossaryEntryV7 {
  const [name, text] = ENTRIES[id];
  return { id, name, text };
}

/** The whole glossary. */
export const UNIT_GLOSSARY_V7: readonly GlossaryEntryV7[] = Object.freeze(
  GLOSSARY_IDS_V7.map(glossaryEntryV7),
);

/** The terms a unit card shows, for every unit. */
export const GLOSSARY_TERM_IDS_V7: readonly GlossaryIdV7[] = [
  "TERM_HP",
  "TERM_ATTACK",
  "TERM_DEFENSE",
  "TERM_MOVE",
  "TERM_RANGE",
  "TERM_SIGHT",
  "TERM_COVER",
  "TERM_FORTIFIED",
  "TERM_HITTING_BACK",
  "TERM_VETERAN",
  "TERM_SLOTS",
];

/** The glossary term of a stat row (`HP`, `ATTACK`, ...), or null. */
export function statGlossaryIdV7(stat: string): GlossaryIdV7 | null {
  switch (stat.toUpperCase()) {
    case "HP":
      return "TERM_HP";
    case "ATTACK":
      return "TERM_ATTACK";
    case "DEFENSE":
      return "TERM_DEFENSE";
    case "MOVE":
      return "TERM_MOVE";
    case "RANGE":
      return "TERM_RANGE";
    case "SIGHT":
      return "TERM_SIGHT";
    case "SHIELD":
      return "SHIELD";
    case "SLOTS":
      return "TERM_SLOTS";
    default:
      return null;
  }
}

/**
 * Abilities with no line of their own: `ATTACK` is what the Attack stat
 * says (a unit that shoots from afar has the Ranged or Long shot trait).
 */
export const ABILITIES_WITHOUT_ENTRY_V7: readonly UnitRoleAbilityV7[] = [
  "ATTACK",
];

/**
 * The entry of a role ability as a faction's role has it (Rally is Frenzy
 * for the Undead; a Mothership's Tractor Beam is the heavy one), or null
 * for an ability with no line of its own.
 */
export function abilityGlossaryIdV7(
  ability: UnitRoleAbilityV7,
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): GlossaryIdV7 | null {
  const mechanics = roleMechanicsV7(role, faction);
  switch (ability) {
    case "ATTACK":
      return null;
    case "CHARGE":
      return faction === "DINOSAUR"
        ? "POUNCE"
        : faction === "MARTIAN"
          ? "STRAFE"
          : "CHARGE";
    case "RALLY":
      return faction === "UNDEAD"
        ? "FRENZY"
        : faction === "GOBLIN"
          ? "BERSERK"
          : faction === "DINOSAUR"
            ? "WAR_DRUMS"
            : faction === "MARTIAN"
              ? "PSYCHIC_COMMAND"
              : "RALLY";
    case "TEND_WOUNDED":
      return faction === "DWARF"
        ? "REPAIR"
        : mechanics.tendGrowingHeal !== null
          ? "TEND_DINOSAUR"
          : "TEND";
    case "OVERRUN":
      return faction === "GOBLIN"
        ? "RAM_BUGGY"
        : faction === "DINOSAUR"
          ? "RAMPAGE"
          : "OVERRUN";
    case "RAM":
      return "BOW_RAM";
    case "LINEBREAKER":
      return "CHARGE_BANG";
    case "TRACTOR_BEAM":
      return mechanics.heavyTractorBeam ? "TRACTOR_BEAM_HEAVY" : "TRACTOR_BEAM";
    case "BOUNCE":
      return "BOUNCY";
    // The Vampire and Banshee rework (`pulp_wars-ty6i`): the Vampire's
    // Escape flies.
    case "ESCAPE":
      return mechanics.batEscapeTiles > 0 ? "BAT_ESCAPE" : "ESCAPE";
    default:
      return ability in ENTRIES ? (ability as GlossaryIdV7) : null;
  }
}

/**
 * The traits of a faction's role that are no listed ability: what the role
 * rule and the role mechanics say about it (it shoots from afar, its
 * Shield, the Egg it hatches from, ...).
 */
export function roleTraitGlossaryIdsV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly GlossaryIdV7[] {
  const rule = effectiveRoleRuleV7(role, faction);
  const mechanics = roleMechanicsV7(role, faction);
  const rules = factionRulesV7(faction);
  const ship = isNavalRoleV7(role);
  const attacks = rule.abilities.includes("ATTACK");
  const traits: GlossaryIdV7[] = [];
  if (ship) traits.push("SHIP");
  if (attacks && rule.minimumRange > 1) traits.push("LONG_SHOT");
  else if (attacks && rule.range > 1) traits.push("RANGED");
  if (attacks && !rule.mayUsePrimaryActionAfterMove)
    traits.push("SLOW_TO_STRIKE");
  if (ship) {
    if (mechanics.splash) traits.push("SPLASH");
    return traits;
  }
  if (
    mechanics.ignoresZocStops &&
    !rule.abilities.includes("PROWL") &&
    !rule.abilities.includes("ETHEREAL")
  )
    traits.push("SLIPS_PAST");
  if (mechanics.rangedDefense2 !== null)
    traits.push(
      mechanics.rangedDefense2 < rule.defense2 ? "OPEN_TO_RANGED" : "BONES",
    );
  if (mechanics.splash)
    traits.push(mechanics.splashTargets === "ALL" ? "BOMBS" : "SPLASH");
  if (
    mechanics.demolishesFieldDefense &&
    !rule.abilities.includes("LINEBREAKER")
  )
    traits.push("WRECKER");
  if (mechanics.carrionBonus2 > 0) traits.push("CARRION");
  if (mechanics.riseAgainHp !== null) traits.push("RISE_AGAIN");
  if (rules.restless) traits.push("RESTLESS");
  if (mechanics.deathBlastDamage !== null) traits.push("EXPLODES");
  if (mechanics.kaboomAfterAttack) traits.push("CRASH");
  if (mechanics.blastProof) traits.push("BLAST_PROOF");
  if (rules.gangUpMaximum > 0 && attacks && mechanics.gangUpLimit > 0)
    traits.push("GANG_UP");
  if (mechanics.gangUpWeight > 1) traits.push("HEAVYWEIGHT");
  if (mechanics.packHuntBonus2 > 0) traits.push("PACK_HUNT");
  if (mechanics.cracksArmour) traits.push("THAGOMIZER");
  if (mechanics.hatchTurns !== null) traits.push("EGG_LAID");
  if (mechanics.shield > 0) traits.push("SHIELD");
  if (mechanics.shockFieldDamage > 0) traits.push("SHOCK_FIELD");
  if (mechanics.glides) traits.push("GLIDE");
  if (mechanics.frostbite) traits.push("FROSTBITE");
  if (mechanics.repairsAsMachine && !mechanics.construct)
    traits.push("MACHINE");
  if (mechanics.leavesCrumbs) traits.push("CRUMBS");
  if (mechanics.immovable) traits.push("ROCK_HARD");
  if (mechanics.capacitySlots > 1) traits.push("BIG_BODY");
  return traits;
}

/**
 * Everything a faction's role can do, in plain words: its abilities in the
 * role's own order, then its traits.
 */
export function roleGlossaryV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly GlossaryEntryV7[] {
  const rule = effectiveRoleRuleV7(role, faction);
  const ids: GlossaryIdV7[] = [];
  for (const ability of rule.abilities) {
    const id = abilityGlossaryIdV7(ability, role, faction);
    if (id !== null && !ids.includes(id)) ids.push(id);
  }
  for (const id of roleTraitGlossaryIdsV7(role, faction))
    if (!ids.includes(id)) ids.push(id);
  return ids.map(glossaryEntryV7);
}

/** The Giant Spider's lines. */
export const SPIDER_GLOSSARY_IDS_V7: readonly GlossaryIdV7[] = [
  "SPIDER",
  "SPIDER_REGENERATES",
  "SPIDER_BOUNTY",
];

const STATUS_IDS: Readonly<Record<string, GlossaryIdV7>> = {
  neutral: "STATUS_NEUTRAL",
  provoked: "STATUS_PROVOKED",
  restless: "STATUS_RESTLESS",
  done: "STATUS_DONE",
  "idle-recovery": "STATUS_RESTING",
  grave: "STATUS_ON_GRAVE",
  plague: "STATUS_PLAGUED",
  bitten: "STATUS_BITTEN",
  "egg-countdown": "STATUS_HATCHING",
  slots: "TERM_SLOTS",
  growth: "STATUS_GROWTH",
  shield: "SHIELD",
  cooling: "STATUS_COOLING",
  "ray-power": "STATUS_RAY_POWER",
  controlled: "STATUS_CONTROLLING",
  "mind-control-cooldown": "STATUS_RECHARGING",
  "mind-controlled": "STATUS_CONTROLLED",
  beamed: "STATUS_BEAMED",
  "tractor-used": "STATUS_BEAM_USED",
  afloat: "STATUS_AFLOAT",
  submerged: "SUBMERGED",
  boardable: "STATUS_BOARDABLE",
  icebound: "STATUS_ICEBOUND",
  "ice-crush": "STATUS_ICE_CRUSH",
  "ice-cover": "STATUS_ICE_COVER",
  "on-ice": "STATUS_ON_ICE",
  frozen: "STATUS_FROZEN",
  snow: "STATUS_SNOW",
  blizzard: "STATUS_BLIZZARD",
  rockfall: "ROCKFALL",
  planted: "STATUS_PLANTED",
  rushed: "STATUS_RUSHED",
  "home-sweet-home": "STATUS_HOME_SWEET_HOME",
  crashed: "STATUS_CRASHED",
  splatted: "STATUS_SPLATTED",
  stuck: "STATUS_STUCK",
  toothache: "STATUS_TOOTHACHE",
  bombed: "STATUS_BOMBED",
  "dug-in": "STATUS_DUG_IN",
  "not-dug-in": "STATUS_NOT_DUG_IN",
  clockwork: "CLOCKWORK",
  shots: "STATUS_SHOTS",
  plated: "PLATED",
  surfaced: "STATUS_SURFACED",
  // The engine's own status lines (`PublicUnitStatsV7.statuses`), by the
  // words before their colon.
  inspired: "STATUS_INSPIRED",
  frenzied: "STATUS_INSPIRED",
  berserk: "STATUS_BERSERK",
  "war-drums": "STATUS_INSPIRED",
  "psychic-command": "STATUS_INSPIRED",
  tended: "STATUS_TENDED",
  overrun: "STATUS_ATTACK_AGAIN",
  ram: "STATUS_ATTACK_AGAIN",
  rampage: "STATUS_ATTACK_AGAIN",
  escape: "STATUS_ESCAPE",
  "bat-escape": "STATUS_BAT_ESCAPE",
  feast: "STATUS_FEAST",
  terror: "STATUS_TERROR",
  cracked: "STATUS_CRACKED",
  risen: "STATUS_RISEN",
  // The giants' signatures (`pulp_wars-w49.32`): an Abomination's held
  // victim, and a Gingerbread Man.
  swallowed: "STATUS_SWALLOWED",
  "gingerbread-man": "STATUS_GINGERBREAD_MAN",
};

/** Every status ID the unit dock can put on a chip (`data-unit-status`). */
export const UNIT_STATUS_IDS_V7: readonly string[] = Object.freeze(
  Object.keys(STATUS_IDS),
);

/**
 * The entry that explains a status chip of the unit dock, by the chip's
 * `data-unit-status`, or null for a chip the glossary does not know.
 */
export function statusGlossaryV7(status: string): GlossaryEntryV7 | null {
  const key = status.toLowerCase();
  const id =
    STATUS_IDS[key] ?? (key.startsWith("charge!") ? "STATUS_RUN_UP" : null);
  return id === null ? null : glossaryEntryV7(id);
}
