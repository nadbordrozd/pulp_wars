# Pulp Wars — Revised Human Technology Tree

**Status:** approved design input. The exact implementation authority is
[Ruleset 7 revision 9: Human technology redesign](RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md).

**Baseline:** current Ruleset 7 revision 8 (`pulp-wars-poc-7r8`)

**Proposed next revision:** Ruleset 7 revision 9

**Faction:** current `ORIGINAL` faction, treated in this document as the baseline Human faction

## 1. Summary

This revision keeps the current game as the baseline but simplifies and regularizes the Human technology tree while making each major branch attractive on both the economic and military dimensions.

The proposed land tree has four five-tech branches:

- **Settlement**
- **Wilds**
- **Mobility**
- **Industry**

Naval remains a smaller specialist branch with three technologies:

- **Naval**

The Human faction has seven normal land-unit roles:

- `LINE` — Fighter
- `SKIRMISHER` — Raider
- `RANGED` — Marksman
- `DEFENDER` — Guard
- `SUPPORT` — Captain
- `SIEGE` — Catapult
- `BREAKTHROUGH` — Knight

The reward-only Juggernaut remains outside this normal roster. Naval roles remain Patrol Boat and Battleship.

The intended late-game combat relationship is:

**Guard → Knight → Catapult → Guard**

This is not intended as a hard type-bonus system. The relationship should emerge from stats, positioning, range, fortification, retaliation, and unit abilities.

## 2. Research structure and cost

Keep the existing research-cost formula:

```text
tier 1 = 5 + (C - 1)
tier 2 = 7 + 2 * (C - 1)
tier 3 = 9 + 3 * (C - 1)
```

where `C` is the number of currently owned cities.

`GATHERING` is known at match start.

The land branches use the same shape:

```text
ROOT
├── TIER 2 ─── TIER 3
└── TIER 2 ─── TIER 3
```

Naval is a three-node chain:

```text
SHORECRAFT ─── NAVIGATION ─── NAVAL_ENGINEERING
```

## 3. Complete tree

```text
SETTLEMENT
Gathering (start)
├── Farming ───────── Milling
└── Administration ─ Planning

WILDS
Hunting
├── Forestry ──────── Sawmilling
└── Marksmanship ──── Fieldcraft

MOBILITY
Scouting
├── Roads ─────────── Commerce
└── Raiding ───────── Chivalry

INDUSTRY
Drill
├── Engineering ───── Metallurgy
└── Fortification ─── Explosives

NAVAL
Shorecraft ────────── Navigation ────────── Naval Engineering
```

Game-facing branch names should be exactly the simple nouns above. Do not use combined labels such as "Industry & Warfare" or "Mobility & Trade".

---

# 4. Settlement

Settlement owns food, developed-city income, army support, capacity, and territorial development.

Its military identity is not a special combat unit line. It is the Human faction's unusually strong logistics: healing, coordination, and the ability to support larger armies.

## 4.1 Gathering — tier 1, starts known

Keep the current baseline:

- reveal Fruit and Fertile Ground;
- `HARVEST_FRUIT`;
- Fruit costs 2 Coins and grants +1 permanent population.

## 4.2 Farming — tier 2, requires Gathering

Keep the current basic Farm:

- `BUILD_FARM`;
- requires Fertile Ground;
- cost 5;
- +2 live population;
- Farm belongs to the Agriculture family.

## 4.3 Milling — tier 3, requires Farming

Unlock:

- `BUILD_WINDMILL`;
- Windmill cost 5;
- one per city;
- requires at least one adjacent same-owner Farm;
- +1 live population per adjacent same-owner Farm, cap 8.

Add **Supply**:

> A city is **supplied** while it owns at least one Windmill whose current population output is positive.

A friendly land unit recovering while standing in territory assigned to a supplied city heals +2 additional HP.

Initial intended recovery values:

- ordinary friendly-territory Recover / idle recovery: 4 HP;
- in a supplied city: 6 HP;
- hostile / neutral territory: 2 HP;
- Supply does not stack across multiple Windmills.

This replaces the old `RECOVERY` technology as the Human faction's strong sustain mechanic.

## 4.4 Administration — tier 2, requires Gathering

Unlock:

- Captain (`SUPPORT`);
- Market.

### Captain

Initial balance target:

| Stat    | Value |
| ------- | ----: |
| Cost    |     5 |
| HP      |    10 |
| Attack  |     1 |
| Defense |     1 |
| Move    |     1 |
| Range   |     1 |
| Sight   |     1 |
| Capture |    No |

Captain may Move and then use one support action. A support action is a primary action and is mutually exclusive with attacking or another support action.

Captain has two actions:

### Rally

`RALLY`

All adjacent friendly **land** units except SUPPORT and SIEGE units become `INSPIRED` until the end of the current turn.

`INSPIRED`:

- does not stack;
- is consumed by the unit's next Attack;
- grants +1 Attack for that Attack;
- if that Attack is melee and the target tile has a Field Defense, the Field Defense is destroyed after combat if the attacker survives.

A Knight's `INSPIRED` bonus applies only to the first Attack in a kill chain.

### Tend Wounded

`TEND_WOUNDED`

Heal every adjacent friendly land unit by 2 HP.

Rules:

- Captain does not heal itself;
- a unit may receive `TEND_WOUNDED` healing at most once per owner's turn;
- does not affect embarked or naval forms;
- no stacking through several Captains in one turn.

### Market

Rework the existing Market and move it from Commerce to Administration.

Initial rule:

- cost 6;
- one per city;
- placed on an owned explored empty improvement tile;
- requires at least one adjacent same-owner economic family;
- recurring income:
  - +1 base Coin;
  - +1 per distinct adjacent economic family;
  - cap 4 Coins total.

Families:

- Agriculture: Farm / Windmill
- Timber: Lumber Camp / Sawmill
- Metal: Mine / Forge

Diagonal adjacency counts. Same-owner contributors may belong to another city. A contributor may support more than one Market.

Remove the current Road-specific Market bonus. Market should be understandable from the surrounding economic tiles alone.

## 4.5 Planning — tier 3, requires Administration

Unlock:

- +1 unit capacity in every currently owned and future owned city;
- `LAND_GRANT`.

### Land Grant

Once per city:

- city must be level 3 or higher;
- cost 6 Coins;
- city must be owned, non-besieged, and have no unresolved reward;
- claims every currently neutral tile in that city's centered 5×5 footprint that is not already assigned to another city;
- preserves existing terrain, resources, improvements, Roads, Field Defenses, and water;
- reveals newly claimed cells;
- the enlarged footprint transfers normally on capture;
- may be used only once for a given city ID.

This deliberately reuses the geometry of the current level-4 `EXPAND` reward so the implementation and UI can remain simple: one city action, no individual tile-picking UI.

### Reward interaction

`LAND_GRANT` makes the current level-4 `EXPAND` reward redundant.

Do not ship both mechanics unchanged.

Proposed replacement for the level-4 reward pair:

- `BOOM`: existing +3 permanent population;
- `TREASURY_8`: +8 Coins.

The exact reward identifier can differ, but the product behavior should not offer a second 5×5 expansion mechanic.

---

# 5. Wilds

Wilds owns forests, hunting, ranged pressure, and siege.

It should remain one of the strongest mixed economy/military branches.

## 5.1 Hunting — tier 1

Keep:

- `HUNT_GAME`;
- visible Game may be harvested for 2 Coins;
- +1 permanent population.

## 5.2 Forestry — tier 2, requires Hunting

Keep:

- `BUILD_LUMBER_CAMP`;
- cost 3;
- +1 live population;
- Timber family.

Keep `CLEAR_FOREST`:

- empty eligible Forest -> Grass;
- no cost;
- grants 1 Coin.

## 5.3 Sawmilling — tier 3, requires Forestry

Unlock:

- Sawmill;
- Catapult (`SIEGE`).

Sawmill:

- cost 5;
- one per city;
- requires adjacent same-owner Lumber Camp;
- +1 live population per adjacent same-owner Lumber Camp, cap 8.

Catapult initial baseline may remain close to current r8:

| Stat             | Value |
| ---------------- | ----: |
| Cost             |     8 |
| HP               |    10 |
| Attack           |   3.5 |
| Defense          |   0.5 |
| Move             |     1 |
| Range            |   2–3 |
| Move then attack |    No |
| Capture          |    No |

Catapult gets the Field Defense demolition rule described in section 9.

Catapult is intended to be the safe, systematic answer to entrenched Guards.

## 5.4 Marksmanship — tier 2, requires Hunting

Unlock Marksman (`RANGED`).

Initial baseline may remain close to current r8:

- cost 3;
- HP 10;
- Attack 2;
- Defense 1;
- Move 1;
- Range 1–2;
- may Move then Attack;
- may Capture.

## 5.5 Fieldcraft — tier 3, requires Marksmanship

Unlock:

- `REPLANT_FOREST`;
- Raider and Marksman do not end movement merely because they enter Forest;
- Marksman Sight becomes 2.

Keep this as a terrain-and-mobility capstone rather than adding another unit.

---

# 6. Mobility

Mobility owns fast expansion, Roads, connected-city income, raiding, cavalry, and late conversion of Forest into farmland.

The old Scout and Raider are merged.

## 6.1 Scouting — tier 1

Unlock Raider (`SKIRMISHER`).

Raider is the single Human exploration / fast-capture unit.

Initial target:

| Stat             | Value |
| ---------------- | ----: |
| Cost             |     4 |
| HP               |    10 |
| Attack           |     2 |
| Defense          |     1 |
| Move             |     2 |
| Range            |     1 |
| Sight            |     2 |
| Move then attack |   Yes |
| Capture          |   Yes |

At this stage Raider does **not** yet have Charge or generic Pillage.

Remove Scout as a separate Human unit.

## 6.2 Roads — tier 2, requires Scouting

Keep the current Road concept, simplified where possible:

- cost 2;
- may be built on eligible owned or neutral land;
- Roads form an eight-way infrastructure network rooted at the original capital;
- connected Road movement remains discounted;
- foreign-owned Roads are not usable as the player's own network.

Roads by themselves do not grant recurring income.

## 6.3 Commerce — tier 3, requires Roads

Unlock **land trade income**:

> Each owned non-capital city connected to the player's currently owned original capital through the player's eligible land Road/city-center network produces +1 Coin at Start Turn.

Rules:

- max +1 Commerce income per city;
- capital receives no matching bonus;
- losing the connection removes the income;
- reconnecting restores it;
- this is income, not population.

This replaces the current connected-city live-population rule for the land network.

Naval trade is separately unlocked by Navigation and is described below. A city may receive at most one land-trade Coin and one sea-trade Coin in a turn.

## 6.4 Raiding — tier 2, requires Scouting

Upgrade Raider:

- **Charge:** after an ordinary Move traversing at least two path cells, Raider gets +1 Attack for its next Attack that turn;
- Raider may `PILLAGE` hostile improvements without Explosives;
- Pillage remains terminal and grants 1 Coin.

No new unit is unlocked here.

## 6.5 Chivalry — tier 3, requires Raiding

Unlock:

- Knight (`BREAKTHROUGH`);
- `CULTIVATE_FOREST`.

### Knight

Initial target:

| Stat             | Value |
| ---------------- | ----: |
| Cost             |     9 |
| HP               |    10 |
| Attack           |     3 |
| Defense          |     1 |
| Move             |     3 |
| Range            |     1 |
| Sight            |     1 |
| Move then attack |   Yes |
| Capture          |    No |

Knight has **Overrun**:

- when Knight kills the primary target with a melee Attack, it advances into the target tile if that tile is legal and empty after the kill;
- after advancing, Knight may Attack again;
- this may repeat without a hard numeric attack cap;
- the chain ends when an Attack does not kill, there is no legal advance, or there is no legal adjacent target;
- no additional ordinary Move is granted;
- terrain entry rules continue to matter for the advance destination;
- one `INSPIRED` buff from Captain applies only to the first Attack.

The purpose is to punish exposed fragile backline formations, especially Catapults and support units.

### Cultivate Forest

`CULTIVATE_FOREST`

- requires Chivalry;
- cost 4;
- targets an owned explored Forest tile with no site, resource, or improvement;
- converts the tile to Grass with `FERTILE_GROUND`;
- preserves Road;
- grants no immediate population or Coins.

This gives Chivalry an economic payoff and creates a deliberate cross-branch combo:

**Chivalry -> Fertile Ground -> Farming -> Milling -> Market**

---

# 7. Industry

Industry owns defensive infantry, mountains, metal production, field fortification, military production efficiency, and demolition.

## 7.1 Drill — tier 1

Unlock Guard (`DEFENDER`).

Keep first-capture Spoils:

- first hostile Capture of each city by a player grants 2 Coins;
- neutral villages grant zero;
- no recapture farming.

Guard initial baseline can remain close to current r8:

| Stat             | Value |
| ---------------- | ----: |
| Cost             |     3 |
| HP               |    15 |
| Attack           |   1.5 |
| Defense          |     3 |
| Move             |     1 |
| Range            |     1 |
| Move then attack |    No |
| Capture          |   Yes |

## 7.2 Engineering — tier 2, requires Drill

Merge the current Prospecting and Engineering responsibilities:

- reveal Ore;
- Mountain movement for land units;
- +1 Sight while on Mountain;
- build Mine.

Mine:

- requires Mountain + Ore;
- cost 5;
- +2 live population;
- Metal family.

Do not keep a separate Prospecting technology.

## 7.3 Metallurgy — tier 3, requires Engineering

Unlock Forge and **Arms Industry**.

Forge:

- cost 6;
- one per city;
- requires at least one adjacent same-owner Mine;
- +1 live population per adjacent same-owner Mine, cap 6.

Arms Industry:

> While a city owns an active Forge with positive output, normal land units trained by that city cost 1 Coin less, minimum cost 1.

Does not discount:

- reward units;
- naval units;
- units whose cost is already zero / null.

This gives Metallurgy a military benefit without adding another Human land-unit role.

## 7.4 Fortification — tier 2, requires Drill

Unlock Field Defense construction.

`BUILD_FIELD_DEFENSE`:

- cost 3;
- acting unit must be a Fighter or Guard;
- unit must be in land form on an owned explored land tile;
- tile must not already contain Field Defense;
- may coexist with Road, resource, improvement, or city center;
- Fighter may build after moving if otherwise action-eligible;
- Guard may not build after moving;
- building consumes the unit's primary action.

Field Defense effect:

- binary: present / absent; no HP bar;
- +1 flat Defense to a land-form defender belonging to the current tile owner;
- applied before terrain-cover multiplication;
- may transfer with territory ownership if not destroyed.

Field Defense is destructible. See section 9.

## 7.5 Explosives — tier 3, requires Fortification

Unlock:

- generic Pillage for normal land combat units;
- demolition of Field Defenses through melee combat;
- `BLAST_MOUNTAIN`.

### Generic Pillage

Keep current general Pillage semantics:

- hostile improvement under actor;
- destroys improvement;
- grants 1 Coin;
- terminal;
- Roads are not pillaged.

Raider already has an innate Raiding exception.

### Melee demolition

If the player has Explosives, any surviving friendly land unit that performs a melee Attack against a unit standing on Field Defense destroys that Field Defense after combat.

The defense still protects the defender during that Attack.

This does not stack or deal bonus damage.

### Blast Mountain

`BLAST_MOUNTAIN`

- cost 3;
- owned explored Mountain;
- no city center/site/resource/improvement/Field Defense;
- converts Mountain to Grass;
- preserves Road;
- grants no Coins or population.
- requires Engineering visibility before it is publicly offered, so hidden Ore
  cannot be distinguished or destroyed through command probing;

This gives Explosives a simple peaceful terrain-development use.

---

# 8. Naval

Naval intentionally remains the only three-tech branch.

It is a specialist subsystem and should not be padded to five nodes merely for visual symmetry.

On Dry Land maps the branch should be hidden or visibly unavailable rather than offering useless research.

## 8.1 Shorecraft — tier 1

Unlock:

- Harvest Fish on Shallow Water;
- Port;
- shallow-water embarkation / transport;
- Patrol Boat.

Keep the current general Fish/Port model unless contradicted here:

- Fish: 2 Coins -> +1 permanent population;
- Port: cost 4 -> +1 live population while active;
- land units embark through owned active Ports;
- Patrol Boat remains the light naval screen.

## 8.2 Navigation — tier 2, requires Shorecraft

Unlock:

- Deep Water movement;
- Deep Water transport;
- Pearl collection;
- **sea trade**.

Pearls may keep the current simple rule:

- pay 2;
- receive 4;
- net +2 Coins;
- resource is consumed.

Sea trade:

> Each owned non-capital city with an active Port and a valid sea connection through active owned Ports to at least one other owned city produces +1 Coin at Start Turn.

Rules:

- max +1 sea-trade Coin per city;
- capital receives no separate sea-trade payment;
- blockade can break routes;
- mid-route ship occupation does not erase abstract trade connectivity;
- deep-water route segments require Navigation.

Sea trade and Commerce land trade are separate. A city may earn both if it qualifies for both.

## 8.3 Naval Engineering — tier 3, requires Navigation

Unlock:

- Battleship;
- Shipyard.

### Shipyard

Shipyard is an upgrade to an existing Port, not a separate adjacency puzzle.

Initial rule:

- once per city;
- cost 5;
- upgrades one owned active Port to Shipyard;
- retains Port functionality;
- adds +1 additional live population while active;
- naval units trained at this Shipyard cost 2 Coins less, minimum 1.

A blockaded Shipyard loses its Port/Shipyard live-population contribution and cannot train or recover ships.

Battleship remains the expensive capital ship. Current r8 values may be used as the starting point:

- cost 16;
- HP 25;
- Attack 6;
- Defense 4;
- Move 2;
- Range 1–3;
- Sight 3;
- move or fire, not both.

---

# 9. Fortification destruction

Field Defense must not become permanent board clutter.

It is deliberately binary and can be removed in several intuitive ways.

## 9.1 Catapult bombardment

When a Catapult attacks a land unit standing on Field Defense:

1. resolve the Attack normally, including the +1 Defense from Field Defense;
2. after combat, destroy the Field Defense regardless of whether the defender survives;
3. the Catapult does not need Explosives.

Thus the first attack softens the prepared position; follow-up attacks face an unprepared tile.

## 9.2 Captain-assisted assault

When an `INSPIRED` unit makes a melee Attack against a unit standing on Field Defense:

1. resolve combat normally with Field Defense active;
2. if the attacker survives, destroy the Field Defense after combat.

This is the Human faction's manpower-intensive alternative to artillery.

## 9.3 Explosives

With Explosives, the same post-combat destruction applies to **all** surviving friendly melee attackers, whether or not they are Inspired.

## 9.4 Occupying an empty defense

If a hostile land unit legally moves onto a tile containing Field Defense while no hostile defender occupies the tile, destroy the Field Defense immediately on entry.

An abandoned prepared position therefore cannot survive hostile occupation indefinitely.

## 9.5 City Walls

The existing city `WALLS` reward is not converted into destructible Field Defense in this revision.

Treat city Walls and Field Defense as separate systems for now.

If playtesting shows city Walls remain too static, add a separately reviewed breached-Walls state later rather than silently overloading Field Defense.

---

# 10. Human unit roster after the revision

Normal trainable land roles:

| Role class     | Human unit | Main purpose                               | Unlock         |
| -------------- | ---------- | ------------------------------------------ | -------------- |
| `LINE`         | Fighter    | cheap generalist, screen, capture          | start          |
| `SKIRMISHER`   | Raider     | exploration, flanking, capture, cleanup    | Scouting       |
| `RANGED`       | Marksman   | fragile ranged pressure                    | Marksmanship   |
| `DEFENDER`     | Guard      | hold terrain and punish breakthrough units | Drill          |
| `SUPPORT`      | Captain    | active mass heal / combat coordination     | Administration |
| `SIEGE`        | Catapult   | break static defenses and dense formations | Sawmilling     |
| `BREAKTHROUGH` | Knight     | penetrate and chain-kill fragile backlines | Chivalry       |

Reward-only:

- Juggernaut remains reward-only / `MYTHIC`.

Naval:

- Patrol Boat — `NAVAL_SCREEN`;
- Battleship — `NAVAL_CAPITAL`.

Remove from the Human roster:

- Scout;
- Medic;
- Heavy;
- Horse Archer;
- Breacher.

Raider absorbs Scout's exploration/sight job.

Knight replaces Horse Archer as the late breakthrough unit.

Captain replaces Medic as the Human support unit.

Catapult absorbs the main anti-fortification battlefield job previously split with Breacher.

Heavy's "expensive durable elite" space is deliberately left open for another faction.

---

# 11. Unit role metadata

Add a faction-independent tactical-role field to unit definitions.

Suggested enum:

```ts
type TacticalRole =
  | "LINE"
  | "SKIRMISHER"
  | "RANGED"
  | "DEFENDER"
  | "SUPPORT"
  | "SIEGE"
  | "BREAKTHROUGH"
  | "MYTHIC"
  | "NAVAL_SCREEN"
  | "NAVAL_CAPITAL";
```

This is design / UI metadata, not a hidden combat damage class.

Do **not** implement generic "+X damage against DEFENDER" rules from these tags.

Future factions should be free to implement the same role through very different mechanics.

Examples:

- Undead SUPPORT may raise casualties rather than Rally;
- Robot SUPPORT may repair and overclock;
- Candy DEFENDER may be high-HP rather than high-Defense;
- Cowboy RANGED may trade range for Move-then-fire;
- Undead BREAKTHROUGH may phase rather than ride a horse.

The role tells the player and designer what problem the unit solves. It does not prescribe identical stats or abilities.

---

# 12. Expected branch incentives

The important balance target is not equal arithmetic on every map. It is that every branch has credible reasons for both peaceful and aggressive players to enter it.

| Branch     | Economic / strategic incentives                               | Military incentives                  |
| ---------- | ------------------------------------------------------------- | ------------------------------------ |
| Settlement | Farms, Windmills, Market income, extra territory, +1 capacity | Captain, mass healing, Supply, Rally |
| Wilds      | Game, Camps, Sawmills, forest manipulation                    | Marksman, Catapult                   |
| Mobility   | Roads, connected-city income, Forest->Fertile conversion      | Raider, Charge/Pillage, Knight       |
| Industry   | Mines, Forges, cheaper army production, terrain blasting      | Guard, Field Defense, Explosives     |
| Naval      | Fish, Ports, Pearls, sea trade, Shipyards                     | transport, Patrol Boat, Battleship   |

Important cross-branch synergies:

- Chivalry creates Fertile Ground -> Farming develops it -> Milling supplies it.
- Markets become better as the player develops Agriculture, Timber, and Metal.
- Sawmilling provides Catapults; Explosives makes the rest of the army better at clearing prepared positions.
- Metallurgy lowers unit-production costs, making every military branch more valuable.
- Planning increases capacity and territory, making economic and military investment elsewhere easier to exploit.
- Roads and Navigation make captured or distant cities economically useful.

---

# 13. Ruleset / implementation notes

This is a gameplay-breaking revision and should use a new exact Ruleset 7 identity rather than reinterpret revision-8 saves or replays.

Suggested:

```text
rulesetId: pulp-wars-poc-7r9
game-state schema: 7, if existing strict dispatch remains sufficient
new autosave key: pulpWars.save.v7r9.current
```

Do not migrate earlier r7 saves into this ruleset.

Likely implementation surfaces include, at minimum:

- `src/engine/rules/ruleset-v7.ts`
- v7 technology/type frozen orders
- unit rules and role metadata
- `src/engine/v7/economy.ts`
- `src/engine/v7/spatial-economy.ts`
- v7 reducer / query / command / event schemas
- movement/combat for Knight Overrun
- fortification destruction
- AI research, economy, Captain, Knight, fortification, and naval behavior
- technology-tree UI
- unit UI / tooltips
- Rules / Help
- save/replay exact identity
- headless validation fixtures

Treat numeric values in this document as initial implementation values to be validated by simulation and playtesting. The structural decisions — branch shape, unit-role consolidation, active Captain actions, destructible Field Defense, and mixed economic/military payloads — are the more important part of the revision.
