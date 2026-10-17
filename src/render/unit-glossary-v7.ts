import {
  effectiveRoleRuleV7,
  factionRulesV7,
  isNavalRoleV7,
  RAM_BONUS2_V7,
  roleMechanicsV7,
  summonedUnitRoleRuleV7,
  technologyCapabilitiesV7,
  type FactionIdV7,
  type PlayerViewV7,
  type SummonedRoleIdV7,
  type UnitRoleAbilityV7,
  type UnitRoleIdV7,
} from "../engine/index";
import {
  ICE_COVER_LABEL_V7,
  ICE_COVER_TOOLTIP_V7,
} from "./frozen-sea-presentation-v7";

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
  // Bead pulp_wars-2yc.63: one entry per mechanic. Capture is no line (every
  // land unit captures); the Raider bonus is Charge in every faction (it
  // was Pounce and Strafe), the Inspire support is Rally (Frenzy, War
  // Drums), the kill chain is Overrun (Ram, Rampage), and the zone-of-control
  // trait is Slips past (Ethereal, Prowl).
  CHARGE: [
    "Charge",
    "Its first attack after a long move hits harder. Unlocked by a technology.",
  ],
  ESCAPE: ["Escape", "After attacking it may move once more, if it survived."],
  RALLY: [
    "Rally",
    "Friendly units next to it hit harder on their next attack this turn.",
  ],
  // The same Inspire as Rally, every second turn only.
  PSYCHIC_COMMAND: [
    "Psychic Command",
    "Friendly units next to it hit harder on their next attack this turn. It can do this only every second turn.",
  ],
  // `pulp_wars-w49.36`: the Orc Warboss's Berserk replaced WAAAGH!.
  BERSERK: [
    "Berserk",
    "Your units within 2 tiles that have not moved yet go one tile farther this turn, and enemies next to their path do not stop them.",
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
    "Heals the wounded friendly units next to it, machines most of all, and cures their ailments. It also mends your Barricades.",
  ],
  OVERRUN: [
    "Overrun",
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
  // The Cultists (`pulp_wars-mch9.4`, docs/product/RULESET_7_CULTISTS.md
  // sections 5 and 8.2): what pays Favour.
  SACRIFICE: [
    "Sacrifice",
    "Offers one of your own units next to it to the Ancient Ones. The unit is gone for good, and you gain Favour for it.",
  ],
  SEIZE: [
    "Seize",
    "Offers a badly hurt enemy next to it, while another of your robed cultists stands beside that enemy. It pays double Favour.",
  ],
  // The channel (`pulp_wars-mch9.5`, sections 6 and 8).
  // The Cult redesign (`pulp_wars-mch9.36`, section 7): the Imp alone.
  SUMMON: [
    "Summon",
    "Calls a daemon next to it for Favour and channels it this turn: an Imp alone, or a Horror or a Gibbering Mass with a robed cultist beside it.",
  ],
  // The Imp (the Cult redesign, `pulp_wars-mch9.36`, section 7.3).
  BROOD: [
    "Brood",
    "One strand to an Imp also holds up to two of your Imps standing beside it at the start of your turn.",
  ],
  SWARM: [
    "Swarm",
    "An enemy beside two or more of your Imps cannot strike back when one of them attacks it.",
  ],
  NEVER_CAPTURES: [
    "Never captures",
    "It cannot take a village or a city. Standing on an enemy city, it still lays siege.",
  ],
  // The Gibbering Mass (the Cult redesign, `pulp_wars-mch9.37`, section
  // 7.4).
  DOORSTEP: [
    "Doorstep",
    "On or beside your city, or beside your Idol Bearer while its idol is raised, it needs no strand to stay yours.",
  ],
  DRAG: [
    "Drag",
    "An enemy that starts its move beside it can move only one tile.",
  ],
  HOLDS_GROUND: [
    "Holds its ground",
    "It never steps forward after a kill, and nothing pushes, pulls or swaps it.",
  ],
  // The Favour economy of the Cult redesign (`pulp_wars-mch9.32`,
  // docs/product/RULESET_7_CULT_REDESIGN.md sections 6 and 7.6).
  TRICKLE: [
    "Trickle",
    "At the start of your turn, a Summoner whose strand still holds a daemon pays you 1 Favour.",
  ],
  FAVOUR_CAP: [
    "Favour cap",
    "Favour stops at a limit, shown beside it. Anything you would gain above the limit is lost, so spend it.",
  ],
  HUNGER: [
    "Hunger",
    "At the start of your turn it eats 2 of your Favour. If you cannot pay, it breaks loose.",
  ],
  CHANNEL: [
    "Channel",
    "Holds a strand to one of your daemons nearby until your next turn. If it is hurt, moved, hexed or taken, the strand snaps.",
  ],
  // The warden's lasting aura (the Cult redesign, `pulp_wars-mch9.33`).
  BEHOLD: [
    "Behold!",
    "Its idol is always raised: your units beside it take half from shots. Any status on the Idol Bearer puts the idol down.",
  ],
  AWESTRUCK: [
    "Awestruck",
    "An enemy that stands beside a raised idol can attack only an Idol Bearer beside it.",
  ],
  ANCHOR: [
    "Anchor",
    "Grips a channelling cultist beside it, once a turn, so that its strand counts as three. Hit the cultist and all three go.",
  ],
  BOO: [
    "Boo!",
    "Instead of attacking, makes every living unit next to it jump one tile away, friend or foe. It hurts nobody.",
  ],
  DAEMON: [
    "Daemon",
    "Summoned, never trained: it stays yours only while enough cultists channel it each turn. It never heals and fills no city slot.",
  ],
  // Unbound (`pulp_wars-mch9.6`, sections 6.4, 6.5, and 8.3).
  DAEMONS_FEED: [
    "Daemons feed",
    "Every enemy it kills while it is yours pays you Favour. Killing another daemon pays nothing.",
  ],
  UNBOUND: [
    "Unbound",
    "Its channel failed, so it belongs to nobody. Now and after every round it attacks a cultist close by first, then anyone else near it, friend or foe.",
  ],
  FURIOUS: [
    "Furious",
    "It broke loose this turn. Nobody can channel it until this turn ends.",
  ],
  BIND_AGAIN: [
    "Bind again",
    "Channel it with enough robed cultists in one turn and it is yours again. It cannot be bound in the turn it broke loose.",
  ],
  // Rituals and the Herald (`pulp_wars-mch9.7`, sections 7, 4.2, and 8.6).
  STARFALL: [
    "Star-fall",
    "If it has not moved, it calls a star alone onto a tile nearby. Next turn it hurts everything there and around it.",
  ],
  // The Cult redesign (`pulp_wars-mch9.34`, section 8.2).
  JOIN_CHANT: [
    "Join the chant",
    "Next to a Stargazer whose star is coming, it chants instead of acting, and the star hits harder. Hurt or moved, it stops.",
  ],
  RAVAGE: [
    "Ravage",
    "Attacks twice each turn, at one target or two, even after moving. After a kill it steps onto the victim's tile.",
  ],
  UNSTOPPABLE: [
    "Unstoppable",
    "Its blows ignore Walls, Field Defense and Dig In. Nothing freezes, hexes or shoves it: only damage hurts it.",
  ],
  PROCLAIM: [
    "Proclaim",
    "Instead of one attack, it cows an enemy city nearby: the city earns nothing and trains nothing until its owner's turn ends.",
  ],
  // Hexes and tricks (`pulp_wars-mch9.8`, sections 8.7, 9, and 8.2).
  PAMPHLETS: [
    "Pamphlets",
    "Captures a neutral village in the same turn it walks onto it. Every other unit has to wait a turn.",
  ],
  SWITCHEROO: [
    "Switcheroo",
    "Swaps places with a unit up to four tiles away, friend or foe, but never on a city or village. It cannot swap two turns running.",
  ],
  RIBBIT: [
    "Ribbit",
    "Turns an enemy within 2 tiles into a frog until its next turn ends. The Hexer cannot do it two turns running.",
  ],
  TENTACLE: [
    "Tentacle",
    "Calls up a Tentacle on a free tile within 3 tiles. It belongs to nobody and slaps whoever is weakest beside it.",
  ],
  GRAB: [
    "Grab",
    "The unit it slapped last cannot leave its side. It is free when the Tentacle dies, sinks or slaps someone else.",
  ],
  WILD_TENTACLE: [
    "Wild Tentacle",
    "Rooted, and nobody's. After every round it slaps the weakest unit beside it, friend or foe, and after 3 rounds it sinks.",
  ],
  STATUS_FROG: [
    "Frog",
    "A frog for now, with a badge of what it was: it hops one tile, cannot attack, strike back or capture, and is easy to hurt. A healer cures it.",
  ],
  STATUS_GRABBED: [
    "Grabbed",
    "A Tentacle holds it. It can move only to tiles next to that Tentacle.",
  ],
  STATUS_HEX_SPENT: [
    "Spent",
    "It used its trick. It cannot use it again on its next turn.",
  ],
  // The chip of a ritual's leader and chanters (`pulp_wars-mch9.19`).
  STATUS_CHANTING: [
    "Chanting",
    "It takes part in a ritual that completes when its owner's next turn starts. Hurt, move or hex it and it leaves the circle.",
  ],

  // ------------------------------------------------------------------ ships
  // Bead pulp_wars-2yc.63: every ship is built at a Port, so the line says
  // only what sets a ship apart.
  SHIP: ["Heals at Ports", "It heals only next to your own Ports."],
  BOW_RAM: [
    "Bow Ram",
    "After moving it hits ships harder and shoves them back. Unlocked by a technology.",
  ],
  // Themed naval branches (section 5.3 D1, `pulp_wars-5ti.18`): the
  // Dinosaur Dugout's Ram.
  HORNED_PROW: [
    "Horned Prow",
    "After moving it hits ships harder and shoves them back, and harder still after a longer run. Unlocked by a technology.",
  ],
  SUBMERGED: [
    "Submerged",
    "Under water: it can only be attacked from the next tile.",
  ],
  TORPEDO: [
    "Torpedo",
    "Attacks only ships and transports, and they cannot hit back.",
  ],
  // Themed naval branches (docs/product/RULESET_7_NAVAL_FACTIONS.md
  // sections 2 and 3, `pulp_wars-5ti.16`): the Goblin Scrap Dreadnought
  // (the Fire Raft's Kaboom is the Goblins' Kaboom!), and the sea beasts of
  // later factions.
  SINKS_EXPLODING: [
    "Explodes when it sinks",
    "When it sinks it blows up and hurts every unit next to it, yours too. A boarded ship does not.",
  ],
  SEA_BEAST: ["Sea beast", "A living beast: it cannot be boarded."],
  // Themed naval branches (section 4.3 U1, `pulp_wars-5ti.17`): the
  // Undead ships (the Plague Galleon's Plague is the Lich's Plague line).
  DROWNED_CREW: [
    "Drowned Crew",
    "A ship your ships sink rises as your Ghost Ship. Unlocked by a technology.",
  ],
  // Themed naval branches (section 6.3 M2, `pulp_wars-5ti.19`): the
  // Martian foot units' shore launch (the Martian ships' Shield is the
  // Martians' Shield line).
  HOVER_PODS: [
    "Hover Pods",
    "It can hover off any beach onto shallow water as a transport, with no Port. Unlocked by a technology.",
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
  // The Mammoth's Trample is the same (bead pulp_wars-2yc.63).
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
  UNANSWERED: ["Unanswered", "A unit it attacks cannot hit back."],
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
    "Enemies its Wail hurts cannot hit back for the rest of your turn.",
  ],
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
  // Bead pulp_wars-2yc.63: the Triceratops's run-up (`LINEBREAKER`) is
  // Gore, so that Charge names the Raider bonus alone.
  CHARGE_BANG: [
    "Gore",
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
    "While its Shield holds, an enemy that hits it from the next tile is hurt in return.",
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
  COLD_BLOOD: ["Cold Blood", "Hits a Frozen unit harder."],
  BLIZZARD: [
    "Blizzard",
    "Snow follows her: your units next to her take less damage from ranged attacks.",
  ],
  COLD_SNAP: ["Cold Snap", "Freezes every enemy next to her."],
  // Ice Folk Freeze (`pulp_wars-w49.37`): the Witch's Frost Bolt and the
  // Mammoth's Stampede. Bead pulp_wars-2yc.63: the Sled's Bolas is the same
  // freeze, so it is a Frost Bolt too.
  FROST_BOLT: [
    "Frost Bolt",
    "Freezes one enemy within 2 tiles. It does no damage.",
  ],
  STAMPEDE: [
    "Stampede",
    "If it has not moved, it charges up to three tiles in a straight line, hitting each enemy in its way for 3 and shoving it aside. Nobody strikes back.",
  ],
  BOULDERS: [
    "Boulders",
    "Its throw ignores Walls and Field Defense, and hits harder when it has not moved.",
  ],
  COLD_AURA: [
    "Cold Aura",
    "Freezes every enemy next to it when it ends its own move.",
  ],
  SWEEP: [
    "Sweep",
    "Its attack also hurts the enemies on both sides of the target.",
  ],
  FROSTBITE: [
    "Frostbite",
    "An enemy that hits it from the next tile and survives is Frozen.",
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
  // Push from afar, but never on a giant or a two-slot unit.
  KNOCKBACK: [
    "Knockback",
    "Shoves a target that survives its shot one tile back, unless it is a giant or a big unit.",
  ],
  PLATED: ["Plated", "Thick plating: one hit never takes much of its health."],
  MACHINE: ["Machine", "An Engineer's Repair heals it more than other units."],
  // Dwarf crowd control (`pulp_wars-w49.33`).
  WHIRL: ["Whirl", "Hurts every enemy next to it at once. Nobody hits back."],
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
    "An enemy that hits it from the next tile has its next attack 1 weaker.",
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
  // The Troll's Regenerate, at the end of every round instead.
  SPIDER_REGENERATES: ["Regenerate", "Heals itself after every round."],
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
  // Ice Folk Freeze (`pulp_wars-w49.38`): Frozen is the one Ice Folk
  // status of a unit.
  STATUS_FROZEN: [
    "Frozen",
    "It cannot move or act or strike back until it thaws at the end of its owner's turn (the chip counts them). Ice Folk can shatter a weak Frozen unit.",
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
  STATUS_SPLATTED: [
    "Splatted",
    "Hit by a pie: it cannot hit back for the rest of this turn.",
  ],
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
  STATUS_RUN_UP: ["Gore", "It moved this turn, so its attack hits harder."],
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
    "A Banshee's wail terrified it: it cannot hit back for the rest of this turn.",
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
  // The Cultists' channel (`pulp_wars-mch9.18`): the chips of a channeller,
  // a gripping Thing, an Idol Bearer and a daemon.
  STATUS_CANDLELIT: [
    "Candlelit",
    "It channels a daemon, and everyone who has explored its tile sees it. Hurt, move or hex it and its strand snaps.",
  ],
  STATUS_GRIPPED: [
    "Gripped",
    "A Thing in the Cellar grips it, so its strand counts as three. Hit it and all three go.",
  ],
  STATUS_GRIPPING: [
    "Grips",
    "It grips the channelling cultist beside it. Move, freeze or hex the Thing and the grip fails.",
  ],
  // The warden's standing idol (Behold!, a lasting aura since
  // `pulp_wars-mch9.33`; the key was STATUS_IDOL_RAISED, after the retired
  // IDOL_RAISED event).
  STATUS_IDOL_STANDING: [
    "Idol raised",
    "Its units beside it take half from shots, and enemies beside it can attack only the Idol Bearer.",
  ],
  // The warden's shield wall (the Cult redesign, `pulp_wars-mch9.43`).
  STATUS_SHIELDED: [
    "Shielded",
    "An Idol Bearer of its side stands beside it with the idol raised, so shots from two or more tiles away do half damage.",
  ],
  STATUS_CONTROL: [
    "Strands",
    "The strands that hold it, against the number it needs. With too few at the start of its owner's turn it is Unbound.",
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
 * says (a unit that shoots from afar has the Ranged or Long shot trait),
 * and `CAPTURE` is what every land unit can do (`pulp_wars-ke95`), so a
 * line for it would tell a player nothing (bead pulp_wars-2yc.63).
 */
export const ABILITIES_WITHOUT_ENTRY_V7: readonly UnitRoleAbilityV7[] = [
  "ATTACK",
  "CAPTURE",
];

/**
 * The entry of a role ability as a faction's role has it, by its mechanic
 * (bead pulp_wars-2yc.63: one entry per mechanic, whatever the faction; a
 * Brain's Rally cools, so it is Psychic Command; a Warboss's is Berserk; a
 * Mothership's Tractor Beam is the heavy one), or null for an ability with
 * no line of its own.
 */
export function abilityGlossaryIdV7(
  ability: UnitRoleAbilityV7,
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): GlossaryIdV7 | null {
  if (ABILITIES_WITHOUT_ENTRY_V7.includes(ability)) return null;
  const mechanics = roleMechanicsV7(role, faction);
  switch (ability) {
    case "RALLY":
      return mechanics.rallyEffect === "BERSERK"
        ? "BERSERK"
        : mechanics.rallyCools
          ? "PSYCHIC_COMMAND"
          : "RALLY";
    case "TEND_WOUNDED":
      return faction === "DWARF"
        ? "REPAIR"
        : mechanics.tendGrowingHeal !== null
          ? "TEND_DINOSAUR"
          : "TEND";
    // Zones of control do not stop it: the Raider's trait by another name.
    case "ETHEREAL":
    case "PROWL":
      return "SLIPS_PAST";
    // The Mammoth's attack knocks down Field Defense like a Catapult's.
    case "TRAMPLE":
      return "WRECKER";
    // The Sled's freeze is the Witch's Frost Bolt.
    case "BOLAS":
      return "FROST_BOLT";
    // Themed naval branches (`pulp_wars-5ti.18`): a Ram with a run-up
    // bonus is the Dinosaur Horned Prow.
    case "RAM":
      return mechanics.ramRunUpBonus2 > RAM_BONUS2_V7
        ? "HORNED_PROW"
        : "BOW_RAM";
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
    // Themed naval branches (`pulp_wars-5ti.16`): the Scrap Dreadnought.
    if (mechanics.deathBlastDamage !== null) traits.push("SINKS_EXPLODING");
    // Themed naval branches (`pulp_wars-5ti.19`): the Martian hulls.
    if (mechanics.shield > 0) traits.push("SHIELD");
    return traits;
  }
  // A Banshee's Ethereal and a Sabretooth's Prowl list it already.
  if (mechanics.ignoresZocStops) traits.push("SLIPS_PAST");
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
  // The Cult redesign (`pulp_wars-mch9.32`): the Summoner's trickle, and
  // the cap on the Favour it earns and spends.
  if (rule.abilities.includes("SUMMON")) traits.push("TRICKLE", "FAVOUR_CAP");
  // The warden (`pulp_wars-mch9.33`): what its aura does to enemies.
  if (rule.abilities.includes("BEHOLD")) traits.push("AWESTRUCK");
  // Themed naval branches (`pulp_wars-5ti.19`): a foot unit of a tree with
  // Hover Pods hovers off any beach.
  if (
    mechanics.movementMode === "GROUND" &&
    technologyCapabilitiesV7(["SHORECRAFT", "SEAMANSHIP"], faction).hoverPods
  )
    traits.push("HOVER_PODS");
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

/**
 * The Cultists (`pulp_wars-mch9.5`): everything a summoned unit can do, in
 * plain words: what it is, then its abilities in its own order. (A unit
 * names its summoned role in `summoned`; its `role` says nothing.)
 */
export function summonedGlossaryV7(
  summoned: SummonedRoleIdV7,
): readonly GlossaryEntryV7[] {
  const ids: GlossaryIdV7[] = ["DAEMON", "DAEMONS_FEED"];
  for (const ability of summonedUnitRoleRuleV7(summoned).abilities)
    if (
      !ABILITIES_WITHOUT_ENTRY_V7.includes(ability) &&
      ability in ENTRIES &&
      !ids.includes(ability as GlossaryIdV7)
    )
      ids.push(ability as GlossaryIdV7);
  // The Cult redesign (`pulp_wars-mch9.32`): the Herald's upkeep.
  if (summoned === "HERALD") ids.push("HUNGER");
  // The Imp (`pulp_wars-mch9.36`): it never captures.
  if (summoned === "IMP") ids.push("NEVER_CAPTURES");
  // The Gibbering Mass (`pulp_wars-mch9.37`): it holds its ground and
  // never captures.
  if (summoned === "MASS") ids.push("HOLDS_GROUND", "NEVER_CAPTURES");
  // What happens when its channel fails.
  ids.push("UNBOUND");
  return ids.map(glossaryEntryV7);
}

/** A Tentacle's lines (`pulp_wars-mch9.8`, section 9.3). */
export const TENTACLE_GLOSSARY_IDS_V7: readonly GlossaryIdV7[] = [
  "WILD_TENTACLE",
  "GRAB",
];

/** The Giant Spider's lines. */
export const SPIDER_GLOSSARY_IDS_V7: readonly GlossaryIdV7[] = [
  "SPIDER",
  "SPIDER_REGENERATES",
  "SPIDER_BOUNTY",
];

/**
 * The chips of the unit dock, by `data-unit-status`. Bead pulp_wars-2yc.63:
 * a unit card shows facts about the unit only, so the chips of its tile
 * (On a Grave, Snow, Blizzard, On ice, Ice cover, Rockfall) are gone; the
 * tile dock shows those facts.
 */
const STATUS_IDS: Readonly<Record<string, GlossaryIdV7>> = {
  neutral: "STATUS_NEUTRAL",
  provoked: "STATUS_PROVOKED",
  restless: "STATUS_RESTLESS",
  done: "STATUS_DONE",
  "idle-recovery": "STATUS_RESTING",
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
  frozen: "STATUS_FROZEN",
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
  // (`unitStatusLineChipV7` names each by its mechanic: a Frenzied unit
  // is Inspired, a Scrap Buggy's Ram is Overrun.)
  inspired: "STATUS_INSPIRED",
  berserk: "STATUS_BERSERK",
  gore: "STATUS_RUN_UP",
  tended: "STATUS_TENDED",
  overrun: "STATUS_ATTACK_AGAIN",
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
  // The Cultists' channel (`pulp_wars-mch9.18`).
  candlelit: "STATUS_CANDLELIT",
  gripped: "STATUS_GRIPPED",
  gripping: "STATUS_GRIPPING",
  idol: "STATUS_IDOL_STANDING",
  // The warden's shield wall and Awestruck (`pulp_wars-mch9.43`).
  shielded: "STATUS_SHIELDED",
  awestruck: "AWESTRUCK",
  // A unit a Gibbering Mass drags (the Cult redesign, `pulp_wars-mch9.44`).
  dragged: "DRAG",
  control: "STATUS_CONTROL",
  // An Unbound daemon's own lines (`pulp_wars-mch9.6`).
  unbound: "UNBOUND",
  furious: "FURIOUS",
  // A bound Herald's Hunger (the Cult redesign, `pulp_wars-mch9.42`).
  hunger: "HUNGER",
  // Hexes and tricks (`pulp_wars-mch9.8`; the chips are bead
  // `pulp_wars-mch9.19`).
  frog: "STATUS_FROG",
  grabbed: "STATUS_GRABBED",
  "hex-spent": "STATUS_HEX_SPENT",
  // A chanter, and a Herald's attacks left (`pulp_wars-mch9.19`).
  chanting: "STATUS_CHANTING",
  attacks: "RAVAGE",
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
  const id = STATUS_IDS[status.toLowerCase()] ?? null;
  return id === null ? null : glossaryEntryV7(id);
}

/** A chip of an engine status line: its words and its `data-unit-status`. */
export interface UnitStatusLineChipV7 {
  readonly label: string;
  readonly id: string;
}

/** The engine's words for the one Inspire of the Rally family. */
const INSPIRED_LINES: readonly string[] = [
  "Inspired",
  "Frenzied",
  "War Drums",
  "Psychic Command",
];

/**
 * The chip of one engine status line (`PublicUnitStatsV7.statuses`): the
 * words before its colon, named by the mechanic's one name (bead
 * pulp_wars-2yc.63): every Inspire of a Rally-family support is "Inspired",
 * every kill chain "Overrun", and the Triceratops's run-up "Gore +2
 * Attack". The engine's own lines are unchanged.
 */
export function unitStatusLineChipV7(status: string): UnitStatusLineChipV7 {
  if (status.startsWith("Charge!"))
    return { label: status.replace(/^Charge!/, "Gore"), id: "gore" };
  const head = status.startsWith("Tended")
    ? "Tended"
    : status.startsWith("Escape: may fly")
      ? "Bat Escape"
      : (status.split(":", 1)[0] ?? status);
  const label = INSPIRED_LINES.includes(head)
    ? "Inspired"
    : head === "Ram" || head === "Rampage"
      ? "Overrun"
      : head;
  return { label, id: label.toLowerCase().replaceAll(" ", "-") };
}

/** A stat modifier's name and sentence as a unit card shows them. */
export interface PresentedModifierV7 {
  readonly sourceLabel: string;
  readonly description: string;
}

/**
 * A stat modifier of the public unit stats under the mechanic's one name
 * (bead pulp_wars-2yc.63): Pounce and Strafe are Charge, Frenzied and War
 * Drums are Inspired by a Rally, and the Triceratops's Charge! is Gore. The
 * engine's own terms are unchanged.
 */
export function presentedModifierV7(modifier: {
  readonly source: string;
  readonly sourceLabel: string;
  readonly description: string;
}): PresentedModifierV7 {
  switch (modifier.source) {
    case "CHARGE":
      return {
        sourceLabel: "Charge",
        description: modifier.description.replace(
          /^(?:Pounce|Strafe)/,
          "Charge",
        ),
      };
    case "INSPIRED":
      return {
        sourceLabel: "Inspired",
        description: modifier.description
          .replace("Necromancer Frenzy adds", "Necromancer Rally adds")
          .replace("Shaman War Drums add", "Shaman Rally adds"),
      };
    case "RUN_UP":
      return {
        sourceLabel: "Gore",
        description: modifier.description.replaceAll("Charge!", "Gore"),
      };
    default:
      return {
        sourceLabel: modifier.sourceLabel,
        description: modifier.description,
      };
  }
}

/**
 * The stat modifiers that belong to the tile a unit stands on, not to the
 * unit (bead pulp_wars-2yc.63): terrain cover, Snow and ice cover, a city's
 * Walls, Field Defense, and a Mountain's high ground. The unit card leaves
 * them out; the tile (or city) dock shows them for the unit standing there.
 */
export const GROUND_MODIFIER_SOURCES_V7: readonly string[] = Object.freeze([
  "CITY_WALLS",
  "CITY_FORTIFICATION",
  "FIELD_DEFENSE",
  "MOUNTAIN",
  "FOREST",
  "SNOW",
  "HIGH_GROUND",
]);

/** The tile dock's name of each ground source. */
const GROUND_LABELS: Readonly<Record<string, string>> = {
  CITY_WALLS: "City Walls",
  CITY_FORTIFICATION: "Fortified",
  FIELD_DEFENSE: "Field Defense",
  MOUNTAIN: "Cover",
  FOREST: "Cover",
  SNOW: "Snow cover",
  HIGH_GROUND: "High ground",
};

/**
 * The text of one stat modifier: Snow cover multiplies Defense (x 1.25),
 * so its term is the share it adds, "+25%" (`pulp_wars-1wy.5`); every other
 * term is its value, at most two decimals.
 */
export function modifierValueTextV7(
  base: { readonly numerator: number; readonly denominator: number },
  modifier: {
    readonly source: string;
    readonly value: {
      readonly numerator: number;
      readonly denominator: number;
    };
  },
): string {
  const value = modifier.value.numerator / modifier.value.denominator;
  if (modifier.source === "SNOW" && base.numerator > 0)
    return `+${Math.round((value * 100 * base.denominator) / base.numerator)}%`;
  return `+${String(Math.round(value * 100) / 100)}`;
}

/** One fact of a tile about the unit standing on it. */
export interface GroundBonusChipV7 {
  /** `data-ground-bonus`: the modifier source, or `rockfall`. */
  readonly id: string;
  /** "Cover +1 Defense", "Snow cover +25% Defense", "Rockfall". */
  readonly label: string;
  /** One sentence for the tooltip and the accessible name. */
  readonly text: string;
}

/**
 * What the tile at `at` gives the unit standing on it (bead
 * pulp_wars-2yc.63): one chip per ground modifier of its public stats
 * (cover, Snow or Glacier's ice cover, Walls, Field Defense, high ground),
 * and Rockfall for an Ice Folk unit on a Mountain. The unit card leaves
 * these out; the tile dock (and a city's) shows them. Empty for an empty
 * tile, or for a unit whose position the viewer may not read.
 */
export function groundBonusChipsV7(
  view: Pick<PlayerViewV7, "units" | "unitStats">,
  at: { readonly x: number; readonly y: number },
  skip: readonly string[] = [],
): readonly GroundBonusChipV7[] {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) return [];
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  if (stats === undefined) return [];
  const chips: GroundBonusChipV7[] = [];
  for (const stat of stats.stats) {
    if (stat.visibility === "BASE_ONLY") continue;
    for (const modifier of stat.modifiers) {
      if (
        !GROUND_MODIFIER_SOURCES_V7.includes(modifier.source) ||
        skip.includes(modifier.source)
      )
        continue;
      // The frozen sea (section 8.10): Glacier's cover on ice is the Snow
      // cover's amount, named for what it is.
      const iceCover =
        modifier.source === "SNOW" && stats.iceFolk?.iceCover === true;
      const name = iceCover
        ? ICE_COVER_LABEL_V7
        : (GROUND_LABELS[modifier.source] ?? modifier.sourceLabel);
      chips.push({
        id: modifier.source.toLowerCase(),
        label: `${name} ${modifierValueTextV7(stat.base.value, modifier)} ${stat.label}`,
        text: iceCover ? `${ICE_COVER_TOOLTIP_V7}.` : modifier.description,
      });
    }
  }
  if (stats.iceFolk?.rockfall === true && !skip.includes("ROCKFALL"))
    chips.push({
      id: "rockfall",
      label: "Rockfall",
      text: "From this Mountain the Ice Folk unit here can attack two tiles away.",
    });
  return chips;
}
