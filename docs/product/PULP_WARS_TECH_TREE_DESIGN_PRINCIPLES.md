# Pulp Wars — Technology Tree and Faction Design Principles

**Companion to:** [Pulp Wars — Revised Human Technology Tree](PULP_WARS_TECH_TREE_REVISION.md)

## 1. Product direction

Pulp Wars should support many visually and mechanically different kingdoms: Humans, Candy, Undead, Robots, Cowboys, and others.

The game should therefore avoid putting every interesting mechanic into one faction.

The baseline Human faction should be understandable and relatively grounded. Its identity is:

- settlement development;
- logistics;
- healing;
- organized combined-arms warfare;
- Roads and infrastructure;
- conventional artillery, cavalry, and fortification.

Save overtly magical or exotic mechanics — conversion, resurrection, teleportation, possession, transformation, etc. — for factions where they create stronger identity.

## 2. Simplify units, not the entire progression

A major reason to keep a reasonably deep technology tree is pacing.

The player should not spend the first ten turns using only the starting Fighter. Early technologies should quickly introduce qualitatively different battlefield options.

At the same time, one faction should not require ten overlapping land units.

The Human roster should therefore use a small set of clear tactical roles while technology continues to unlock terrain tools, buildings, support actions, logistics, and late-game unit mechanics.

## 3. Every unit needs a battlefield identity

Each normal unit should answer a simple question:

> What job does this unit do that the others do not?

Use faction-independent tactical roles:

- LINE
- SKIRMISHER
- RANGED
- DEFENDER
- SUPPORT
- SIEGE
- BREAKTHROUGH

The tags are design language and UI metadata, not damage classes.

Avoid generic hidden rules such as:

> BREAKTHROUGH does +50% damage to SIEGE.

Prefer counters that arise from visible mechanics:

- Move;
- range;
- retaliation;
- HP / Defense;
- fortification;
- minimum range;
- advance after kill;
- action sequencing;
- terrain;
- formation.

## 4. A transferable role is not a reskin

Future factions should teach transferable strategic expectations without using identical units.

A player who sees an enemy SUPPORT unit should know roughly:

> This weak-looking piece makes the nearby army better. I may want to kill it.

But the actual mechanic can be completely different.

Examples:

- Human Captain: Rally and Tend Wounded;
- Undead Necromancer: raise a casualty or convert a wounded foe;
- Robot Repair Drone: repair and overclock;
- Candy support: heal / buff through a faction-specific mechanic.

Likewise, a BREAKTHROUGH unit could be a Human Knight, an Undead Wraith, a Robot assault walker, or something else entirely.

## 5. Branches must compete on both economy and warfare

No major land branch should be "the economy branch" or "the military branch".

A peaceful player should eventually want military branches because they unlock productive terrain, infrastructure, capacity, or production efficiency.

An aggressive player should eventually want economic branches because they unlock healing, army support, territorial development, or recurring income.

The target is contextual parity, not identical numerical payoff.

## 6. Tier-3 military unlocks should have a second reason to exist

Late military technologies are much healthier when they also unlock a simple non-military tool.

Examples in the proposed Human tree:

- Sawmilling = Sawmill + Catapult;
- Chivalry = Knight + Forest->Fertile conversion;
- Metallurgy = Forge + cheaper unit production;
- Planning = territory expansion + capacity;
- Naval Engineering = Battleship + Shipyard.

This avoids dead technologies when the player is temporarily not fighting.

## 7. Prefer cross-branch synergies to self-contained branches

The tree should encourage players to collect technologies broadly.

Good synergies make the value of one branch increase after researching another.

Examples:

- Chivalry creates Fertile Ground; Farming exploits it.
- Agriculture / Timber / Metal all increase Market income.
- Metallurgy makes units unlocked by every military branch cheaper.
- Planning gives more capacity to use all the unit types the player has unlocked.
- Catapults safely break prepared defenses; Explosives lets ordinary melee troops demolish them too.

This is preferable to simply putting more power inside each isolated branch.

## 8. Active support actions, not passive auras

Avoid persistent adjacency auras for normal support units.

Passive auras create continuous formation bookkeeping and awkward questions about stacking, movement, retaliation, and UI state.

Prefer explicit actions:

- Captain uses Rally;
- Captain uses Tend Wounded;
- affected units receive a temporary, visible state.

The desired formation is "roughly one support unit per several combat units", but the player should create that value by taking an action rather than merely parking an aura source.

## 9. Area support is allowed and desirable

Single-target healing or buffing is often too low-impact to justify buying a dedicated support unit.

An active action may affect every adjacent friendly unit, provided:

- it does not stack freely;
- the state is easy to display;
- it expires quickly;
- there is a clear per-turn restriction.

This makes support worth protecting without turning it into passive aura micro.

## 10. Fortifications should create problems, not permanent clutter

Field Defense is a good mechanic because it is visible and intuitive:

> This position is prepared and harder to assault.

But it needs equally intuitive destruction.

The intended answers are:

- Catapult bombardment;
- coordinated Captain-assisted assault;
- late Explosives;
- direct occupation when the fortification is abandoned.

The defense should apply to the attack that destroys it. This makes prepared positions meaningful without making them permanent.

Avoid adding a separate HP bar for field fortifications unless playtesting proves the binary model too shallow.

## 11. Humans should be good at sustain

The Human faction can legitimately be unusually strong at healing.

The proposed sources are intentionally conventional:

- supplied cities from Windmills improve recovery;
- Captain can heal adjacent friendly units.

This gives the faction a coherent logistics identity without magic.

Conversion and resurrection are intentionally not part of the Human kit.

## 12. Keep the late combat triangle legible

The intended major late-game relationship is:

**DEFENDER → BREAKTHROUGH → SIEGE → DEFENDER**

Human translation:

**Guard → Knight → Catapult → Guard**

Interpretation:

- Guard is efficient against fast melee attackers and holds prepared positions.
- Catapult attacks those positions from safety and strips Field Defense.
- Knight can break through gaps and chain-kill exposed fragile backline units such as Catapults.
- Knight should not be an efficient way to grind through healthy Guards.

Fighter, Raider, Marksman, and Captain do not need to fit into this triangle. Their jobs are pacing, flexibility, flanking, pressure, and support.

## 13. Avoid unnecessary new resource systems

New resources are allowed, but should exist because they create a clear strategic decision.

Do not add a resource merely because a technology slot feels empty.

Prefer reusing:

- territory;
- terrain;
- city capacity;
- adjacency;
- Roads;
- recurring income;
- healing;
- unit-production cost;
- map conversion.

These systems are already understandable and can create substantial depth.

## 14. Territory is an underused strategic axis

Settlement technology needs reasons to matter beyond raw population.

Territorial development is a strong candidate because territory controls:

- resources;
- building sites;
- Roads;
- coastline;
- defensive depth;
- access to economic adjacency;
- staging space.

The proposed Planning / Land Grant mechanic deliberately gives Settlement a unique strategic axis.

A repeatable Civilization-style Settler is _not_ part of this revision because it changes the expansion economy too radically.

A bounded Founder / Settler may be revisited later as:

- a faction ability;
- an achievement;
- a one-off per player;
- a scenario mechanic.

## 15. Naval can remain structurally asymmetric

The Naval branch does not need five technologies just because land branches do.

For now, Naval is a compact three-step specialist subsystem:

- Shorecraft;
- Navigation;
- Naval Engineering.

Each node should be dense:

- an economic/map capability;
- and a military capability where appropriate.

Do not add filler naval technologies for symmetry.

On Dry Land maps, hide or disable the Naval branch rather than allowing obviously useless purchases.

## 16. Avoid diplomacy complexity for now

Diplomacy can create meaningful late-game depth, but full relationship systems introduce N² state and a large UI / AI burden.

The present redesign should get depth from:

- faction asymmetry;
- spatial economy;
- logistics;
- trade networks;
- fortification;
- support actions;
- terrain transformation;
- military formations.

Diplomacy can be considered later as a separately scoped subsystem.

## 17. Complexity budget

Prefer mechanics that can be explained in one sentence and read directly from the board.

Good examples:

- "A Market pays for different adjacent industries."
- "A Windmill supplies its city, so units recover faster there."
- "A Knight attacks again after a kill."
- "A Catapult destroys the field fortification it bombards."
- "Connected cities produce trade income."
- "Planning lets a developed city claim its wider footprint."

Be suspicious of mechanics that require:

- hidden counters;
- several exception tables;
- inventory screens;
- per-resource stockpiles;
- many temporary relationship states;
- passive overlapping auras;
- complicated production queues.

## 18. Balance target

The target is not that all branches are equally strong on all maps.

The target is:

- no dominant opener across most maps;
- no branch that becomes optional for almost every strategy;
- no tier-3 tech whose only value is an edge-case unit;
- no economic path that is strictly dominated by a neighboring path;
- no unit whose job can be performed almost as well by two cheaper existing units;
- meaningful changes in the nature of combat as the game progresses.

The revised tree should first be tested for **strategic diversity**, then tuned numerically.
