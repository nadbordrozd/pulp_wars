# Part Two: The Thing in the Shaft (the saga bible)

**Status:** design, bead `pulp_wars-hmyk.1` (epic `pulp_wars-hmyk`): steps 1
to 3 of the user's plan, that is the world and how the nine faction campaigns
interlock ([section 1](#1-the-world-and-the-saga)), each campaign's narrative
([section 2](#2-the-nine-campaigns)), and the briefing of every one of the 54
missions ([section 3](#3-the-missions)). Step 4, the independent
consistency review, is `pulp_wars-hmyk.2`, recorded in
[section 6](#6-editors-review); the campaign screen is `pulp_wars-hmyk.3`
(built); each campaign
is built and hand-played by its own bead (`pulp_wars-hmyk.4` to
`pulp_wars-hmyk.12`) on the mission framework of
[CAMPAIGN.md section 10](CAMPAIGN.md#10-the-mission-framework), following
the builder's guide of
[section 12](CAMPAIGN.md#12-the-mission-builders-guide). The extensions that
framework needs are listed in [section 4](#4-mission-system-extensions).

**Request (user, 2026-10-19, abridged):** "I want an experience a bit like in
the HoMM series. I want 1 campaign for each faction, perhaps 6 missions per
campaign with increasing difficulty. And I want the campaigns to form a graph
of sorts such that they unlock one another. Initially 2 campaigns are
available so as to not overwhelm the player - humans and the undead. When you
finish both it unlocks 4 more - dino, martian, goblin and dwarf and when you
finish these it unlocks the ice folk, candy and cultists. [...] I want you to
first come up with an overarching story of this world starting with the
human/undead campaigns and culminating in the cultists campaign. These
stories are set in the same world and interlock - again like in HoMM or
warcraft campaigns. But this isn't supposed to be the same story seen from
different pov. These are supposed to be complementing each other."

**Root decisions this document follows.** The ten-mission chapter "The
Hollow Frontier"
([CAMPAIGN.md section 9](CAMPAIGN.md#9-part-one-the-hollow-frontier-ten-missions))
is the saga's **prologue**: its events (Year 0, autumn) are the backstory
every campaign builds on. The saga follows on from it: its outro promised
"Part Two: The Thing in the Shaft", and that is this saga's title. Nothing
here contradicts the prologue's briefings or closing lines;
[section 5](#5-consistency-review) records the author's checks and
[section 6](#6-editors-review) the independent editor's.

**The prologue is no longer playable** (user, 2026-10-21, `pulp_wars-hmyk.22`:
"drop the original campaign we designed. leave just the 9 one per
faction."). Its chapter and its ten missions (`FRONTIER_1` to
`FRONTIER_10`) were removed from the game, and the campaign screen shows the
nine faction campaigns only
([CAMPAIGN.md section 24](CAMPAIGN.md#24-the-prologue-retired-pulp_wars-hmyk22)).
What happened in it stays true: the campaigns' intros and briefings recall it
as history, and this document still cites its missions (F1 to F10) as the
places where a thread began.

## 0. Conventions

- **Mission names.** F1 to F10 are the retired prologue's missions
  (`FRONTIER_1` to `FRONTIER_10`, backstory only); H, U, G, D, DN, M, I, C
  and CU number the missions of the
  Humans, Undead, Goblin, Dwarf, Dinosaur, Martian, Ice Folk, Candy and Cult
  campaigns, 1 to 6.
- **Player-facing text** follows the rules of the chapters
  (`src/campaign/chapter.ts`): the pulp is in the story, the rules are
  plain, and no text names a tile coordinate. The blurbs below are the
  briefing story (three to six sentences); the building bead may trim one to
  the card. A hint is at most 60 characters. "Turn" in player text means a
  round, as in the prologue.
- **Difficulty steps** run 1 to 6 within each campaign, 1 an introduction
  that teaches the faction from scratch and 6 the finale. A player may open
  any campaign cold once it is unlocked, so every step 1 teaches; the tiers
  shift the scale only a little: a tier 1 step 1 is the prologue's "Easy", a
  tier 2 step 1 is between "Easy" and "Easy-medium", a tier 3 step 1 is
  "Easy-medium"; every step 6 is at least the prologue's "Hard", and the
  Cult's step 6 is its "Very hard".
- **Seats.** A mission has two to four seats and every seat is a different
  faction (the builder's rule,
  [CAMPAIGN.md section 2.2](CAMPAIGN.md#22-the-builder)), so a campaign's own
  faction never sits across the table. The saga turns this into story: each
  faction has **renegades** who fight under another banner or for their own
  ends, and they are always told as such:
  - **the Unquiet**: dead raised by the Sleeper's nightmares, not by the
    Ashen Marquis (an Undead seat that is not the Marquis's);
  - **the Redcaps**: goblin mercenaries in red caps, Baron Kessler's until he
    dies, the Grey Lodge's after (a Goblin seat that is not Grubnak's);
  - **the Whitefang clan**: Ice Folk who refused Mother Rime's peace and hire
    out to Kessler (an Ice Folk seat that is not Rime's, until mission I1);
  - **Kessler's menagerie**: dinosaurs poached for the Baron's circus (a
    Dinosaur seat that is not the Old Queen's);
  - **the Grey Lodge**: the Cult that knelt at the end of the prologue and
    went on meeting (every Cult seat before the Cult campaign, and the Cult
    campaign's own);
  - **Kessler's men**: the Baron's garrisons, toll-men, grave-robbers,
    poachers and circus hands (a Human seat that is not Steele's, until the
    Baron is eaten in DN4);
  - **the Crown**: the Lowland court, its officials, its Harvest Wardens and
    its lake navy (a Human seat that is not Steele's either);
  - **the island's tribes**: the beasts and cavemen of the Island That Time
    Forgot, who bite every stranger who lands or sails past (a Dinosaur
    seat in G3, G4, M3 and CU3; the Old Queen leads them only in her own
    campaign).
- **Named characters.** A hero whose star is "X lives" and who falls in a
  mission is carried off the field, not killed: the story goes on as
  written (the prologue's convention for the Thane, the Old Queen and
  Queen Praline). A character the saga kills later is never a unit the
  player can kill earlier: Kessler is never on the field before DN4, and
  the Marquis and the Thane stand at the bell, not on the field, in CU6.
- **Formats** use the prologue's labels: Conquest, Capture (against the
  clock), Escort, Hold out, Hunt, Rescue (hold an ally's city). "Naval" and
  "build-up" describe the board and the situation, not a different
  objective kind. Each mission names its objective in the shape of
  `MissionObjectiveV7` and its two stars as the bonus goals the framework
  has.
- **AI directives** are the framework's: `NORMAL`, `RUSH`, `HOLD`, `GUARD`
  (with `others`), `ASSAULT`, and schedules of them. "Teamed" means the seats
  share a team; "rival" means they fight each other too.

## 1. The world and the saga

### 1.1 The world

A compass of the places the saga uses. Every place named in the prologue
keeps its owner and its side of the map; the new ones are marked _new_.

| Region                    | Where      | Who                                                | Places                                                                                                                                                                                                                                            |
| ------------------------- | ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Lowland Crown         | far south  | the Crown and its court at Kingsport (_new_)       | offstage: writs, debts and Commissioners come from here                                                                                                                                                                                           |
| The Frontier              | centre     | Marshal Steele and the Frontier Rangers            | Fort Hollow, Northwatch, Millford and its observatory, Fort Steele, Camp Concord, Ferry Rest; Hollow Barrow, the Unquiet's barrow-town north of Northwatch; Kingsbridge where the Royal Assizes sit (_new_); Saltmarsh at the river mouth (_new_) |
| Kessler's lands           | west march | Baron Otto Kessler                                 | Kessler Hall (_new_), Kessler's Toll in the pass, Fort Bullion; the King's Road and its toll forts (_new_); Wreckers' Cove on the Lost Sea shore (_new_)                                                                                          |
| The Hollow Hills          | east       | Grubnak the Loud's goblins                         | Grubnak's Hall, the Warrens, Muckgate, Stinkwell, Drum Camp, Wolfden                                                                                                                                                                              |
| The Barrowlands           | north-west | the Ashen Marquis                                  | the Ashen Tower, the Bone Gate on Bone Neck, Cinderfield and its archive, Gravesend on its grey bay, Lantern Hill and Gallows Cross on the Dead Men's Road; the Abbey of Saint Ashes (_new_)                                                      |
| The Hollow Mountain       | north      | Thane Brunhild Ironbraid's dwarves                 | Ironbraid Hold and its Gate, the Hall of the Thanes (_new_), Copperstep, the Iron Peak (_new_), the Deep Gate over the shaft the dwarves call the Bottomless; Anvil Bay and Lamplight Cove under the sea cliffs, on the Lost Sea (_new_)          |
| The summit and its slopes | north      | the Rangers' post, and the towns that knelt        | the ruins of the Lodge of the Unblinking Eye on the summit, Candlewick on the slope, Greyhood in the marsh below; the Ember Lodge on the mountain's shoulder (_new_)                                                                              |
| The White Peaks           | far north  | Mother Rime's Ice Folk                             | Rime Camp, Whitefang, the Glacier Tomb (_new_); Coldharbour on the Lost Sea; the Grey Strait between the peaks and Anvil Bay (_new_)                                                                                                              |
| The Rift Lakes            | north-east | Queen Praline's Sugarcrest, Captain Quaxx's colony | Sugarcrest, Gumdrop, Riftwatch on the edge of the crack; Saucer Field and Red Dust; the goblin squats of Spitewood and Sourmash                                                                                                                   |
| The Lost Sea              | west       | the Old Queen's dinosaurs                          | the Island That Time Forgot: Thunder Nest, Fernmaw, Tarpit, Egg Rock, the Crater and its Glass Ship, Ray Hollow, Port Kessler; Smuggler's Rock (_new_)                                                                                            |

The smaller places only the missions name (Chapel Rock, the Summit Stair,
the Bell's Rest, the River Landing, the Seal-works, Big Top Bay, the Mire's
Edge, the Wick Chapel, Hood Hollow, the Dreaming Palace) are described with
their missions in [section 3](#3-the-missions); every one is new.

### 1.2 The great threat: the Sleeper Under the Mountain

The prologue ends with "something that was called has opened one eye". This
is what it is. The truth comes out in pieces, one campaign at a time (the
campaign that reveals each piece is in brackets); no campaign tells all of
it, and the whole is only visible to a player who has played them all.

1. **It eats worlds.** The Sleeper is a thing from between the stars. It
   calls its prey with the voices of what it has already eaten. It ate Mars
   when Mars was green; the Martians who lived did so in machines and bubble
   helmets, which is why they are frail bodies in tin to this day.
   (Martians, M5 and M6.)
2. **It fell here as a star**, in the age of the great beasts. The world
   burned, then froze, and the cold put it to sleep. It sank into the rock
   that grew around it into the Hollow Mountain. The beasts that lived fled
   to a warm island; the children of that winter became the Ice Folk, and
   their Frost Giants remember putting a hungry star to bed. **It sleeps in
   the cold.** (Dinosaurs, DN6; Ice Folk, I2.)
3. **It dreams.** Its sweet dreams pooled in a country beyond a crack in the
   world: Sugarcrest. Its nightmares leak into this world as the restless
   dead. While it sleeps soundly the dead lie still and Sugarcrest is sweet;
   while it stirs the dead walk and Sugarcrest goes stale. (Candy, C5;
   foreshadowed in the Humans' H1, where the dead rise and "nobody gave the
   order", and in the prologue's "the dead are rising there too".)
4. **Three hundred years ago** Lucien, Marquis of Ashby, a scholar with too
   much money, heard it humming in the rock. He founded the Lodge of the
   Unblinking Eye, wrote its scripture, the Grey Book, cast a bell on the
   summit tuned to the Sleeper's name, and rang it. The nightmare that
   answered killed him and his whole court in one night: they rose as the
   Ashen. In his last hour he wrote the **Lullaby**, a counter-score to put it
   back to sleep, hid it in two halves, and tore the last page out of the
   Grey Book: **"It eats the door first."** The dwarves took the cursed bell
   down into the Deep Gate as salvage and hung it over the Bottomless.
   (Undead, U2 and U6; the page: Cult, CU2 and CU6.)
5. **The prologue (Year 0, autumn).** The stars came right. A new Lodge of
   ordinary men, who had found the Grey Book, sang to the summit, and the
   bell in the Deep Gate rang with nobody pulling the rope. The dead woke;
   the Ice Folk came down; a Martian ship answered the call; the call tore
   the Rift and Sugarcrest fell out of it; Marshal Steele took the Lodge one
   toll short. In the chaos at the Deep Gate, Baron Kessler's hired guns
   stole the bell's clapper (G1), and Thane Ironbraid cut the silent bell
   loose. It fell down the Bottomless and landed on the Sleeper's eyelid
   (D3). The Sleeper opened one eye.
6. **The Long Night.** The stars stay right until midwinter of Year 1, the
   Long Night; after it the window shuts for three hundred years (Martians,
   M5). On the Long Night the Sleeper can climb out if a door is opened for
   it. Whoever holds the top of the shaft that night decides the world's next
   three hundred years.

**The heroes' plan**, which the eight campaigns before the Cult's assemble
without any one of them knowing all of it: on the Long Night, the Pact
(Humans, H6) gathers at the Deep Gate. The dwarves lower Grubnak's recovered
clapper (Goblins, G6) down the Bottomless on a chain to the fallen bell they
found (Dwarves, D3); the Marquis rings the Lullaby on it (Undead, U6) while
the Sugarcrest choir sings it (Candy, C6); Mother Rime's winter makes the
mountain cold enough to sleep in (Ice Folk, I6, from the Dinosaurs' memory,
DN6); the iron Seal goes back over the shaft (Dwarves, D6); and the Martians
have given the hour (Martians, M5 and M6).

**The Cult's counter-plan**, which is the Cult campaign: change one note so
the Lullaby rings as an alarm (CU2); bring the oldest blood in the world to
pay for what comes up first (CU3); swap the Seal's bolts for painted wax
(CU4); thaw the winter (CU5); and take the Deep Gate on the Long Night
(CU6). See [section 2.9](#29-the-cultists-the-long-night) for how it ends.

### 1.3 Timeline

All nine campaigns happen in one year, Year 1, the year after the prologue.
They overlap, the way HoMM campaigns do; the table says when each mission
falls, and the dependencies run only forward in time.

| When                      | Campaigns                                                                   | What happens                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 300 years ago             | (backstory)                                                                 | the Marquis founds the Lodge, rings the bell, dies; writes the Lullaby; the dwarves hang the bell in the Deep Gate                                              |
| Year 0, autumn            | prologue, The Hollow Frontier                                               | the bell rings, everything answers, the Lodge falls one toll short; the clapper is stolen; the bell falls; one eye opens                                        |
| Year 1, end of winter     | Humans H1, Undead U1                                                        | the thaw: the Unquiet rise across the north; Kessler's grave-robbers dig                                                                                        |
| spring                    | Humans H2 to H6, Undead U2 to U6, Cult CU1                                  | Kessler's war on the Frontier and his flight to the island; the Marquis finds the Lullaby and himself; the Grey Lodge's spring meeting (CU1, between H2 and H3) |
| start of summer           | (both openers done)                                                         | **the Pact of Northwatch**: Steele, Grubnak, the Marquis, the Thane; the Marquis's warning goes out to the hills, the mountain, the island and the sky          |
| early summer              | Goblins G1 to G4; Dwarves D1 to D3; Martians M1 to M3                       | the heist on Port Kessler; the descent to the bell; the Martians' core recovered                                                                                |
| midsummer                 | Goblins G5; Dwarves D4; Martians M4; Dinosaurs DN1 to DN3; Cult CU2         | the Martians want the bell and its tongue (seen in D4 and G5); Kessler, ruined, steals the Old Queen's eggs; the wrong note is written                          |
| late summer               | Goblins G6; Dwarves D5, D6; Martians M5, M6; Dinosaurs DN4 to DN6; Cult CU3 | the clapper sold to the Thane; the Seal lowered; the date and the truth about Mars; Kessler eaten; the eggs saved but one, which sails                          |
| autumn                    | Ice Folk I1 to I5; Candy C1 to C6; Cult CU4                                 | the winter comes down early; the Frost Treaty; Sugarcrest learns what it is; the Seal's bolts turn to wax                                                       |
| early winter              | Ice Folk I6, Cult CU5                                                       | Mother Rime becomes the Winter Crown; a star breaks it                                                                                                          |
| midwinter, the Long Night | Cult CU6                                                                    | the climax                                                                                                                                                      |

### 1.4 The cast

Recurring characters and where they cross campaigns. The prologue's cast
keeps its names, roles and unit types (Steele leads Humans, Grubnak Goblins,
the Thane is a tagged Engineer, Doctor Crane a tagged Necromancer, the Old
Queen a tagged T-Rex, Queen Praline a tagged Gingerbread Giant).

| Character                                                  | Faction (unit)                                   | Appears in                                                                                                                                                       | Fate                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Marshal Vera Steele                                        | Humans (Knight)                                  | prologue; Humans (lead); Undead U6, Dwarves D6, Martians M6 (ally); Cult CU6 (enemy)                                                                             | lives; pays the Lodge's tithe in the epilogue                                              |
| Silas Pettigrew, Steele's clerk                            | Humans (Captain); Cult (Initiate, then Summoner) | Humans H1 to H6 (in the background; in H3 the man to escort); Goblins G5, G6 and Candy C3 (the polite man in grey), Martians M6 (named, in passing); Cult (lead) | rises from junior clerk to Hierophant of the Deep Gate                                     |
| Baron Otto Kessler                                         | Humans (Captain)                                 | prologue; Humans (villain); Undead U1, U5; Goblins G1, G4, G5; Dinosaurs DN1 to DN4                                                                              | eaten by the Old Queen (DN4); only his hat is found                                        |
| Brother Mallory, Hierophant of the Grey Lodge              | Cult (Summoner)                                  | Undead U5; Cult CU1 (presides), CU2 (mourned)                                                                                                                    | killed by the Marquis's dead (U5)                                                          |
| Grubnak the Loud                                           | Goblins (Orc Warboss)                            | prologue; Humans H6 (mentioned); Goblins (lead); Cult CU4 (enemy)                                                                                                | Honorary Dwarf (G6); pays the tithe in beer                                                |
| Snikkit and Mogga, Grubnak's crew                          | Goblins (Goblin; Ogre)                           | Goblins                                                                                                                                                          | Snikkit keeps notes on "the polite man in grey" (a thread for a later part)                |
| The Ashen Marquis (Lucien of Ashby)                        | Undead (Vampire)                                 | prologue; Humans H4 (ally); Undead (lead); Candy C6 (arrives); Cult CU2 (his archive), CU6 (his dead the enemy, he at the bell)                                  | learns he founded the Lodge (U6); rings the Lullaby (CU6); finally rests (epilogue)        |
| Doctor Mortimer Crane, his archivist                       | Undead (Necromancer), a living man               | prologue; Undead                                                                                                                                                 | files the torn page that the Cult steals (U6, CU2)                                         |
| Thane Brunhild Ironbraid                                   | Dwarves (Engineer)                               | prologue; Undead U4 (mentioned); Dwarves (lead); Goblins G6, Ice Folk I6 (ally); Cult CU4, CU6 (enemy)                                                           | lives; holds the chain on the Long Night                                                   |
| Master Engineer Tobbin Copperstep                          | Dwarves (Engineer)                               | Dwarves; Cult CU4 (fooled)                                                                                                                                       | lives                                                                                      |
| Mother Rime                                                | Ice Folk (Ice Witch)                             | prologue; Ice Folk (lead); Cult CU5 (target)                                                                                                                     | becomes the Winter Crown (I6); shattered by a star (CU5); "back with the first snow"       |
| Chief Gnash of Whitefang                                   | Ice Folk (Mammoth)                               | Humans H4 (Kessler's hireling); Undead U6 (the Grey Lodge's); Dwarves D2 (beaten); Ice Folk I1 (comes home)                                                      | rejoins Rime                                                                               |
| The Old Queen, and Shaman Oona                             | Dinosaurs (T-Rex; Shaman)                        | prologue; Dinosaurs (lead)                                                                                                                                       | the Queen gets seven of her first eight eggs home; Oona tells the Pact "it sleeps in cold" |
| Major Basil Thornbury, Kessler's hunter                    | Humans (Marksman)                                | Dinosaurs DN2                                                                                                                                                    | stuffed (DN2)                                                                              |
| Captain Quaxx                                              | Martians (Brain)                                 | prologue (unnamed, the captain who saluted); Martians (lead); Dinosaurs DN5 (ally)                                                                               | stays on Earth: "it does not happen twice"                                                 |
| Professor Ambrose Haddock of Millford                      | Humans (a living guest of the Martians)          | Martians                                                                                                                                                         | stays at Red Dust with his telescope                                                       |
| Queen Praline, and Madame Nougat                           | Candy (Gingerbread Giant; Confectioner)          | prologue; Martians M4 (ally); Ice Folk I4 (enemy, then treaty); Candy (lead); Cult CU5 (her soldiers), CU6 (her choir)                                           | sings on the Long Night; pays the tithe in sugar                                           |
| Sister Agatha Vole                                         | Cult (Stargazer)                                 | Cult                                                                                                                                                             | drops the star that breaks the Winter Crown (CU5)                                          |
| Sergeant Hobb of the Rangers                               | Humans (Raider)                                  | Cult CU1                                                                                                                                                         | "lost in the marsh" (CU1)                                                                  |
| The Sleeper (the Guest; the Unblinking Eye) and its Herald | (the Cult's summons)                             | every campaign, felt; the Herald in CU6                                                                                                                          | the Herald sits on the shaft; the Eye blinks                                               |

### 1.5 How the nine campaigns interlock

The campaigns do not retell one story. Each faction has its own goal, its
own enemies and its own ending; what interlocks is **consequences**: a deed
in one campaign is the cause, the tool, or the obstacle of another. The
same event is never played twice from two sides.

| Cause (where)                                                                                                          | Consequence (where)                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Kessler's hired guns steal the clapper at the Deep Gate (prologue, F6)                                                 | it lies in Kessler's island vault (G1); the goblins steal it (G4) and sell it to the Thane (G6); the Pact rings it (CU6)         |
| The hooded ones kneel and are pardoned (prologue, F10)                                                                 | the Grey Lodge meets again (CU1); Pettigrew is Steele's clerk throughout the Humans campaign                                     |
| Kessler hires the Redcaps, the Whitefang clan and the Grey Lodge (H2 to H6)                                            | the Redcaps serve the Grey Lodge after Kessler dies (DN5, M5, I5, CU5); the Whitefang lose the Iron Peak (D2) and come home (I1) |
| Kessler's circus beasts run loose (H3) and fight for him (H6)                                                          | the Old Queen frees the rest (DN4); runaways nest in Sugarcrest's library (C2)                                                   |
| The Marquis's dead relieve Fort Hollow (H4)                                                                            | echoed when the dead relieve the Rangers on the summit (U6)                                                                      |
| Kessler flees to his island (H6)                                                                                       | the goblins rob him blind (G4); ruined, he steals the Old Queen's eggs for the Grey Lodge's gold (DN1); he is eaten (DN4)        |
| Kessler's grave-robbers sell bones to "a buyer in a grey hood" (U1)                                                    | the Grey Lodge's books, in one tidy hand, turn up at Kessler Hall (H6)                                                           |
| The Marquis's dead kill Brother Mallory (U5)                                                                           | the Grey Lodge elects a new Hierophant: Mr. Pettigrew (CU2)                                                                      |
| The Marquis finds the second half of the Lullaby and the torn page (U6)                                                | Crane files the page in the Cinderfield archive; Pettigrew steals it and changes one note (CU2)                                  |
| The Lullaby is made whole (U6)                                                                                         | the Sugarcrest choir sings it through and Praline tastes a sour note (C6); on the Long Night it wakes the Sleeper (CU6)          |
| The Martians decide to ring the bell and call home (M4, off-screen)                                                    | a mothership raids the Hold (D4); saucers hunt the humming crate (G5); the Martians change their minds (M6)                      |
| The Thane finds the bell on the Sleeper's eyelid (D3) and seals the shaft (D6)                                         | the Cult waxes the Seal's bolts (CU4); they melt on the Long Night (CU6)                                                         |
| The Grey Lodge's navy shows itself on the river (D5)                                                                   | its Galleon of the Eye escapes Greyhood with the last egg (DN6); the Cult brings it home (CU3)                                   |
| The Old Queen eats the Overmind and frees the Martians (prologue, F8)                                                  | Quaxx lends saucers to the Queen (DN5)                                                                                           |
| The Old Queen remembers the first star and the cold (DN6)                                                              | the Ice Folk's giants confirm it (I2); Rime brings the winter (I3 to I6); the Cult thaws it (CU5)                                |
| The Martians compute the Long Night (M5) and send the star-chart via the Crown's courier, a clerk named Pettigrew (M6) | the Cult knows the hour (CU3 to CU6)                                                                                             |
| Sugarcrest helps hold Red Dust (M4)                                                                                    | the Martians help hold Sugarcrest (C6); both echo the prologue's F9                                                              |
| The Crown's Commissioner, a mild man in grey, says the choir "will sing on the date regardless" (C3)                   | it does (CU6); the Cult's minutes name him (CU4)                                                                                 |
| Sugarcrest is the Sleeper's sweet dream (C5)                                                                           | explains why the Unquiet besiege it (C6) and why the dead rose "there too" in the prologue (F9)                                  |
| The Frost Treaty between Rime and Praline (I4)                                                                         | Sugarcrest's troops guard the Winter Crown beside the Ice Folk (CU5)                                                             |
| The Pact's first promise: Steele's Rangers march for the dwarves (D6)                                                  | Steele brings every Ranger in the north to the Deep Gate (CU6)                                                                   |

### 1.6 Reveals that land only if you played an earlier campaign

Each reveal is complete on its own (a new player reads a good line); a
player who has met the other side reads a second meaning.

1. **The clerk.** In the Humans campaign Mr. Pettigrew files a folded grey
   hood under Lost Property (H1), keeps copies of everything (H2), is
   escorted to court with the Baron's ledgers (H3), and offers to file the
   Grey Lodge's accounts, written "in the same small, tidy hand" (H6). The
   Cult campaign opens with him taking the minutes.
2. **The founder.** The Undead campaign ends with the Marquis learning he
   founded the Lodge and cast the bell (U6). In the Cult campaign the Grey
   Book is the Lodge's scripture (CU3) and its missing last page, "in the
   Founder's own hand" (CU2), is the key to the ending; it is his book, and
   his page.
3. **The torn page.** "It eats the door first" is filed by Crane (U6),
   pocketed unread by Pettigrew (CU2), and read on the Long Night (CU6). It
   is the turn of the saga's ending.
4. **The sour note.** Praline tastes one sour note in the Lullaby (C6). The
   Cult player wrote it (CU2).
5. **The polite man in grey.** He waits at the quay for Grubnak (G5, G6), is
   the Crown's Commissioner on Sugarcrest's lake (C3), and carries the
   Martians' star-chart to the Pact (M6). It is Pettigrew every time, and
   the Cult's minutes own up to it: "lately Commissioner for
   Confectionery", "the goblin who refused the Hierophant's gold" (CU4),
   "the Martians' star-chart, kindly lent" (CU6).
6. **The voices.** The Martians learn the call that brought them used the
   voices of dead Mars (M5, M6); the Old Queen remembers a star that fell
   and a long cold (DN6); the Ice Folk's giants remember putting a hungry
   star to bed (I2). They are the same creature.
7. **The eighth egg.** The Dinosaurs campaign ends with one egg sailing
   away on a black-sailed galleon (DN6); the Cult campaign brings it home and
   knits it a cosy (CU3).
8. **Candle wax.** The Crown's Commissioner on Sugarcrest's lake "smells
   faintly of candle wax" (C3), and Grubnak swears a bolt of the Seal smelled
   of candles (CU4). A Cult player knows what the bolts are made of.

### 1.7 The unlock graph

```text
                    Prologue: The Hollow Frontier
               (backstory only: retired, pulp_wars-hmyk.22)

          HUMANS: The Marshal's Law     UNDEAD: The Long Sleep
                        \                     /
                         +---- both won -----+
                        /      |       |      \
   DINOSAURS:     MARTIANS:          GOBLINS:       DWARVES:
   The Egg Thief  Signal from Home   The Big Score  The Bottomless
                        \      |       |      /
                         +-- all four won ---+
                        /           |          \
        ICE FOLK:            CULTISTS:          CANDY:
        The Long Winter      The Long Night     Sweet Dreams
                           (the culmination)
```

| Tier                                     | Opens when            | The in-world reason                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: Humans, Undead                        | from the start        | The morning after the Lodge fell, two people refuse to go to sleep: Marshal Steele, who has a frontier to keep, and the Ashen Marquis, who would very much like to and cannot.                                                                                                                                                                                                                                   |
| 2: Dinosaurs, Martians, Goblins, Dwarves | Humans and Undead won | Steele's war ends in the **Pact of Northwatch** (H6) and the Marquis's in the knowledge of what is under the mountain (U6). Grubnak and the Thane carry the Marquis's warning home to the hills and the mountain; Kessler's flight to his island sets the goblins and the dinosaurs moving; and the Martians, who answered the same call the Marquis now fears, go looking for where it came from.               |
| 3: Ice Folk, Cultists, Candy             | all four won          | Now the heroes' plan exists: the clapper is in the Hold (G6), the Seal is set (D6), the cold is known to be the cure (DN6), and the night is known (M6). The Pact calls for the cold, so the Ice Folk come down; Sugarcrest, going stale as the Sleeper stirs toward the Long Night, goes looking for the reason; and the Grey Lodge, which has read every letter of the Pact through its clerk, makes its move. |

**Play order inside a tier is free**, and every campaign stands alone once
it is unlocked: its intro says what the player needs to know, its first
mission teaches the faction, and nothing in it depends on progress elsewhere.
The third tier is meant to be played Ice Folk and Candy first, Cultists last
(the screen should say so: the Cult bead gives its plate the subtitle
"The finale"); a
player who plays the Cult first loses only the second meaning of reveals 4,
5 and 8 and the weight of Mother Rime's sacrifice, which the Candy and Ice
Folk campaigns then give back as dramatic irony.

**On the campaign screen**, as built by `pulp_wars-hmyk.3`
([CAMPAIGN.md section 14](CAMPAIGN.md#14-the-campaign-map-and-the-faction-campaigns-pulp_wars-hmyk3)):
three rows joined by lock knots (the prologue's wide plate on top was
removed with it by `pulp_wars-hmyk.22`):
the two openers, the four of tier 2 (Dinosaurs, Martians, Goblins,
Dwarves) and the three of tier 3 (Ice Folk, Cultists, Candy), with the
Cult in the middle of the last row, where the saga culminates. Each
campaign bead replaces its plate's placeholder title and subtitle with
the title above.

## 2. The nine campaigns

Each section gives the protagonist and voice, the goal, who fights whom in
each mission, the arc, the ending, and the threads it picks up and hands on.
The intro and outro lines are player text, for the campaign's card and its
end.

### 2.1 Humans: The Marshal's Law

- **Protagonist and voice.** Marshal Vera Steele of the Frontier Rangers,
  made Marshal of the Frontier for taking the Lodge. The briefings read like
  her dispatches: short, dry, practical, with one joke per page. Her clerk,
  Mr. Silas Pettigrew, is always in the background with the paperwork.
- **Goal.** Keep the peace on the Frontier in the year after the Lodge
  fell. The ground is shaking, the dead will not stay down, and Baron
  Kessler has bought himself a writ, a title and three armies.
- **Intro.** "The Lodge has fallen and the Crown has made Vera Steele
  Marshal of the Frontier. Her first winter of peace is ending badly: the
  ground shakes, the dead won't stay down, and Baron Kessler has bought
  himself a royal writ."
- **Outro.** "Steele calls the Frontier Pact at Northwatch: Ranger, goblin,
  dwarf and dead man at one table. The Marquis brings a warning: the thing
  under the mountain will wake before the year turns, and somebody must be
  standing at the shaft when it does."

| #   | Mission                   | Enemies                                                                 | Allies                        | Format               |
| --- | ------------------------- | ----------------------------------------------------------------------- | ----------------------------- | -------------------- |
| H1  | Thaw at Northwatch        | Undead (the Unquiet)                                                    | none                          | Conquest             |
| H2  | The Lord Protector's Writ | Goblins (the Redcaps)                                                   | none                          | Capture              |
| H3  | Outlaws of the Greenwood  | Goblins (the Redcaps), Dinosaurs (Kessler's menagerie), rival           | none                          | Escort               |
| H4  | The Siege of Fort Hollow  | Cult (the Grey Lodge), Ice Folk (the Whitefang clan)                    | Undead (the Marquis's relief) | Hold out             |
| H5  | Broadsides at Saltmarsh   | Goblins (the Redcap navy)                                               | none                          | Hunt, naval          |
| H6  | Kessler Hall              | Goblins (the Redcaps), Dinosaurs (the menagerie), Cult (the Grey Lodge) | none                          | Capture, multi-front |

- **Arc.** The dead rise without anyone's order (H1); Kessler returns from
  Kingsport as Lord Protector and seizes the King's Road with goblin
  mercenaries (H2); Steele, outlawed, takes the Baron's own ledgers to court
  through a forest full of Redcaps and runaway circus beasts (H3); Kessler
  buys the Grey Lodge and the Whitefang clan and besieges Fort Hollow, where
  the prologue began, until the Marquis's dead relieve it (H4); Steele builds
  a navy from nothing to break his blockade (H5); and she storms his hall
  (H6).
- **Ending and twist.** Kessler escapes down the river to his island. In
  his strongroom are two ledgers, his payments to the Grey Lodge and
  theirs to him, in one small, tidy hand. Mr. Pettigrew offers to file them.
  Steele calls the Pact.
- **Picks up** from the prologue: Steele, Kessler, Fort Hollow, the kneeling
  hoods, the Marquis's offer of his soldiers.
- **Hands on:** Kessler on his island (Goblins, Dinosaurs); the Pact
  (Dwarves D6, Martians M6, Cult CU6); the Redcaps and the Whitefang
  (Dwarves, Ice Folk, the Cult); the clerk (the Cult).

### 2.2 Undead: The Long Sleep

- **Protagonist and voice.** The Ashen Marquis: courtly, languid,
  melancholy, never in a hurry, with gallows wit. Beside him Doctor
  Mortimer Crane, his archivist and the only living man at his court, who
  is fussy and brave and has the hat to prove it.
- **Goal.** Rest. The Marquis kept his word: his dead marched for the
  living until the bell fell silent (prologue F5). Now he would like to lie
  down. But the dead of the whole north are walking again, his and not his
  (the dead of Hollow Barrow marched for the Lodge in F10, and they were
  never his), and something under the mountain will not let them sleep.
  Crane believes there is a way to put it to sleep, and that the Marquis
  wrote it.
- **Intro.** "The Ashen Marquis kept his word: his dead marched for the
  living until the bell fell silent. Now he would like to lie down. But the
  dead of the whole north are walking again, his and not his, and something
  under the mountain will not let them rest."
- **Outro.** "The Lullaby is whole. On the Long Night it must be rung on
  the bell at the bottom of the Bottomless, the only voice the thing below
  will hear. After that, the Marquis says, he would very much like to
  rest."

| #   | Mission                | Enemies                                              | Allies                      | Format         |
| --- | ---------------------- | ---------------------------------------------------- | --------------------------- | -------------- |
| U1  | Resurrection Men       | Humans (Kessler's Resurrection Company)              | none                        | Conquest       |
| U2  | The Drowned Library    | Goblins (the Bonepicker clan)                        | none                        | Hold out       |
| U3  | The Ship of the Dead   | Martians (the dredgers of Gravesend Bay)             | none                        | Capture, naval |
| U4  | The Hall of the Thanes | Dwarves (the clan's crypt-wardens)                   | none                        | Escort         |
| U5  | Bedtime Reading        | Cult (the Grey Lodge), Humans (Kessler's toll-men)   | none                        | Hunt           |
| U6  | The Founder's Tomb     | Cult (the Grey Lodge), Ice Folk (the Whitefang clan) | Humans (the summit Rangers) | Rescue         |

- **Arc.** Kessler's grave-robbers are digging up the Marquis's own bed,
  on behalf of a buyer in a grey hood (U1). Crane recovers the Marquis's
  three-hundred-year-old diary from a drowned abbey: it describes a bell, a
  thing in the rock, and a Lullaby he wrote (U2). Half the score went down
  with his flagship, and the Martians are dredging right on top of it (U3).
  The other half is in his own grave under the summit, and the shortest road
  runs through the dwarves' crypts, where the dead are not welcome (U4). The
  Grey Lodge steals his diary to learn which pages to burn; the Marquis
  hunts down its Hierophant, Brother Mallory (U5). At last he relieves the
  Rangers on the summit and goes down into his own tomb (U6).
- **Ending and twist.** In the tomb lie the second half of the Lullaby and a
  page torn from the Grey Book: "It eats the door first." The Marquis
  remembers: he founded the Lodge, cast the bell and rang it, and his whole
  court died of it. He gives the page to Crane to file, takes the Lullaby,
  and goes down the mountain to tell Marshal Steele what he is.
- **Picks up** from the prologue: the Marquis's "I did not choose to wake",
  Doctor Crane, the bell, the summit where it was cast.
- **Hands on:** the Lullaby (Candy C6, Cult CU2 and CU6); the torn page
  (Cult); Mallory's death and an empty chair at the Grey Lodge (Cult CU2);
  the warning that opens tier 2.

### 2.3 Goblins: The Big Score

- **Protagonist and voice.** Grubnak the Loud, Warboss of the Hollow Hills
  by treaty, bored stiff by peace. A heist caper: boasts, bad plans that
  work, and a crew. Snikkit, a tiny goblin in spectacles who can read; Mogga
  the Ogre, who carries things; and a great many goblins who are told not to
  touch the powder.
- **Goal.** Rob Baron Kessler, who has run to his island with everybody's
  money. Along the way the crew acquires the one thing in the vault nobody
  wanted, and then everybody wants it.
- **Intro.** "Peace has been very bad for Grubnak the Loud. The Warrens are
  tidy, the wolves are fat, and Marshal Steele keeps sending him thank-you
  letters. Then a rumour comes up the river: Baron Kessler has run to his
  island with a vault full of everybody's money."
- **Outro.** "The bell has its tongue back, the goblins have their score,
  and the Thane owes Grubnak a favour he intends to collect in beer for the
  rest of his life."

| #   | Mission                    | Enemies                                                        | Allies                       | Format      |
| --- | -------------------------- | -------------------------------------------------------------- | ---------------------------- | ----------- |
| G1  | Grubnak Gets Bored         | Humans (Kessler's garrison at Fort Bullion)                    | none                         | Conquest    |
| G2  | Boats for Bones            | Undead (the Unquiet, drowned sailors)                          | none                         | Capture     |
| G3  | Here Be Monsters           | Dinosaurs (the island's coast tribes)                          | none                         | Hunt, naval |
| G4  | The Inside Job             | Humans (Kessler's island garrison), Dinosaurs (raiders), rival | none                         | Capture     |
| G5  | Everybody Wants the Tongue | Humans (Kessler's loyalists), Martians (saucers), rival        | none                         | Hold out    |
| G6  | The Big Getaway            | Cult (the Grey Lodge), Undead (the Unquiet)                    | Dwarves (the Thane's escort) | Escort      |

- **Arc.** The crew takes Kessler's last mainland fort for its paperwork and
  finds a map of the vault, whose inventory lists "one bell-tongue,
  dwarf-made" (G1). They steal boats from the drowned dead (G2), sink the
  sea-beast that eats rafts (G3), take the Baron's circus cannon and fire
  themselves over his walls into the vault (G4), and hold a rock in the sea
  against Kessler's men and Martian saucers that want the humming crate
  (G5). On the mainland a polite man in grey offers twice its weight in
  gold; Grubnak, for reasons he cannot explain, says no and fights his way
  to the dwarves instead (G6).
- **Ending and twist.** The bell-tongue is the clapper of the Deep Bell,
  stolen in the prologue's chaos. The Thane pays in gold, beer and a title:
  Grubnak the Loud, Honorary Dwarf. Snikkit keeps notes on the polite man.
- **Picks up:** Kessler on his island (Humans H6); the stolen clapper
  (prologue F6); the Martians' wish to ring the bell (Martians M4).
- **Hands on:** the clapper in Ironbraid Hold (Cult CU6); Kessler ruined, so
  he sells the Old Queen's eggs (Dinosaurs DN1); Grubnak as an honorary
  dwarf on guard at the Seal (Cult CU4); the polite man (Cult).

### 2.4 Dwarves: The Bottomless

- **Protagonist and voice.** Thane Brunhild Ironbraid: blunt, practical,
  proverb-prone ("measure twice, seal once"), fond of her engineers and of
  very large iron objects. Master Engineer Tobbin Copperstep does the
  sums.
- **Goal.** Put a lid on the Bottomless. The Thane cut the bell loose in
  the prologue; since then the mountain shakes, the old dead climb out of
  the workings, and every dwarf can hear something breathing below.
- **Intro.** "Thane Brunhild Ironbraid cut the Deep Bell loose last autumn,
  and it fell down the Bottomless with a sound like a door slamming. Since
  then the mountain shakes every night, the dead climb out of the old
  workings, and every dwarf in the Hold can hear something breathing
  below."
- **Outro.** "The Seal is down and the bell lies under it, with a tongue
  waiting beside the chain. 'It will hold,' says the Thane, 'until the stars
  pull on it. On the Long Night, nothing holds. On the Long Night, we
  ring.'"

| #   | Mission               | Enemies                                                    | Allies                    | Format        |
| --- | --------------------- | ---------------------------------------------------------- | ------------------------- | ------------- |
| D1  | Tremors               | Undead (the Unquiet: the Grey Shift)                       | none                      | Hold out      |
| D2  | The Iron Peak         | Ice Folk (the Whitefang clan)                              | none                      | Capture       |
| D3  | Down the Bottomless   | Undead (the deep dead), Cult (the Grey Lodge's diggers)    | none                      | Escort        |
| D4  | Saucers over the Hold | Martians (a raiding mothership)                            | none                      | Hunt          |
| D5  | Iron on the Water     | Cult (the Grey Lodge navy), Goblins (Redcap wreckers)      | none                      | Escort, naval |
| D6  | The Great Seal        | Undead (the Unquiet from the shaft), Cult (the Grey Lodge) | Humans (Steele's Rangers) | Capture       |

- **Arc.** Dead miners walk out of the cracks (D1). The Seal needs the best
  iron in the north, and the Whitefang clan sits on it (D2). The Thane goes
  down the Bottomless herself and finds the bell, tongueless, lying on
  something smooth, grey and very large that moves when the lanterns come
  near: an eyelid (D3). Martians come to borrow the bell to call home and
  will not take no for an answer (D4). The great bolts come up the river
  past the Grey Lodge's black gondolas (D5). On the night the lid goes
  down, the dead and the Lodge seize the Deep Gate, and the Pact's first
  promise is kept: Steele's Rangers march to help take it back (D6).
- **Ending.** The Seal is set. The Thane has a tongue for the bell, bought
  from a goblin at a scandalous price, and a plan: on the Long Night, lower
  it on a chain and ring whatever the Marquis tells her to ring.
- **Picks up:** the bell cut loose and the Deep Gate (prologue F6); the
  Whitefang clan (Humans H4); the Pact (Humans H6); the Martians' wish
  (Martians M4).
- **Hands on:** the bell on the eyelid and the Seal (Cult CU4 and CU6); the
  dwarves as Ice Folk allies on the summit road (Ice Folk I6); the Thane at
  the chain (Cult CU6).

### 2.5 Dinosaurs: The Egg Thief

- **Protagonist and voice.** The Old Queen, the young T-Rex of the
  prologue's Brain Wave (the title belongs to her line, the oldest blood on
  the island, not to her years), who outlived the Overmind and would like
  to outlive the Baron. She does not speak; Shaman Oona of Fernmaw speaks
  for her, in short sentences. Cheerful, primal, a toy box of big friendly
  monsters with one very bad mood.
- **Goal.** Get the eggs back. The Old Queen laid her first clutch this
  summer, and the Baron, ruined by the goblins and owing money to men in
  hoods, stole it.
- **Intro.** "On the Island That Time Forgot the Old Queen has outlived the
  Overmind and the Baron's ships. This summer she laid her first clutch.
  Then the Baron, ruined by goblins and owing money to men in hoods, came
  back for it."
- **Outro.** "Seven eggs come home to Thunder Nest. The eighth is gone with
  a black sail. And the Pact has learned from the oldest blood in the world
  the one thing that ever put the hunger to sleep: cold."

| #   | Mission                    | Enemies                                                      | Allies                   | Format        |
| --- | -------------------------- | ------------------------------------------------------------ | ------------------------ | ------------- |
| DN1 | The Empty Nest             | Humans (Kessler's poachers)                                  | none                     | Conquest      |
| DN2 | Big Game                   | Humans (Major Thornbury), Goblins (Redcap trackers)          | none                     | Hunt          |
| DN3 | The Sea Road               | Humans (Kessler's last ships)                                | none                     | Escort, naval |
| DN4 | The Greatest Show on Earth | Humans (Kessler's circus), Goblins (Redcap roustabouts)      | none                     | Hunt          |
| DN5 | Through the Barrowlands    | Undead (the Unquiet), Goblins (the Redcaps, now the Lodge's) | Martians (Captain Quaxx) | Escort        |
| DN6 | Old Blood                  | Cult (the Grey Lodge), Undead (the Unquiet)                  | none                     | Capture       |

- **Arc.** The poachers' camps (DN1); the Baron's great white hunter, who has
  the eggs in a crate (DN2) and an empty crate when he is caught; the eggs
  went to the mainland, so the dinosaurs, who have never needed to, go to
  sea (DN3); the Baron's travelling circus on the mainland, cages and all,
  and the Baron himself in a ringmaster's coat (DN4). His pocket-book says
  the eggs were sold to the Grey Lodge "for the Long Night". The Martians,
  who have not forgotten who ate the Overmind, lend saucers for the march across
  the Barrowlands (DN5), and the Queen storms the Lodge's marsh town of
  Greyhood before the last egg is offered (DN6).
- **Ending and twist.** Seven eggs saved; the eighth sails off on the Galleon
  of the Eye. Oona tells the Pact what the Queen's blood remembers: the star
  that fell, the fire, and the long cold that put the hunger to sleep. The
  dinosaurs are the oldest witnesses of the saga, and their memory gives the
  heroes the cure.
- **Picks up:** the Old Queen and the island (prologue F7, F8); Kessler
  ruined (Goblins G4); Kessler's menagerie (Humans H3, H6).
- **Hands on:** "it sleeps in cold" (Ice Folk); the eighth egg (Cult CU3);
  Kessler's death, which leaves the Redcaps to the Grey Lodge.

### 2.6 Martians: Signal from Home

- **Protagonist and voice.** Captain Quaxx, the officer who saluted with
  three hands at the end of the prologue's Brain Wave, now in command of
  three hundred stranded Martians. The briefings are her captain's log:
  1950s B-movie formal, smug, polite, and slowly less smug.
  Professor Ambrose Haddock of the Millford Observatory, abducted in M2,
  becomes her delighted scientific officer.
- **Goal.** Go home. The Martians answered a call to come here; now they
  want to make one to go back. To decode the call they need a native
  astronomer, the Glass Ship's star-drive core, and the Lodge's orrery.
- **Intro.** "The Overmind is dead and the Glass Ship is broken. Captain
  Quaxx and three hundred Martians are stranded on a wet, green, noisy
  planet. They answered a call to come here. Now they would like to make one
  to go home."
- **Outro.** "The Martians stay. Mars was green once, and the thing that
  made it red is asleep under a mountain on this world. 'Not twice,' says
  Captain Quaxx, and the colony at Red Dust turns its dish to the stars to
  watch for the Long Night."

| #   | Mission                     | Enemies                                       | Allies                      | Format        |
| --- | --------------------------- | --------------------------------------------- | --------------------------- | ------------- |
| M1  | Strangers in a Strange Land | Goblins (scrap-raiders)                       | none                        | Conquest      |
| M2  | Abduction at Millford       | Humans (Millford's militia)                   | none                        | Capture       |
| M3  | The Glass Ship              | Dinosaurs (the island's beasts)               | none                        | Escort, naval |
| M4  | Red Dust                    | Undead (the Unquiet)                          | Candy (Sugarcrest)          | Hold out      |
| M5  | The Orrery at Candlewick    | Cult (the Grey Lodge), Goblins (the Redcaps)  | none                        | Capture       |
| M6  | Starfall over Red Dust      | Cult (three Stargazers), Undead (the Unquiet) | Humans (the Pact's Rangers) | Hunt          |

- **Arc.** Goblins are stripping crashed saucers for hats (M1). The Martians
  abduct a laughed-at professor who has written four papers on last
  autumn's falling stars (M2), carry the star-drive core out of the dinosaurs' crater
  (M3), and point a dish at the mountain; every dead thing in the Rift
  Lakes walks toward it, and Sugarcrest, which the Martians saved in the
  prologue, comes to hold the walls (M4). Quaxx sends a mothership to the
  dwarves for the bell and saucers after its stolen tongue (seen in D4 and
  G5, not here). The key to the call is the Lodge's brass orrery, guarded by
  hooded men and hired Redcaps at Candlewick (M5). The orrery gives the date,
  the Long Night, and plays the call back in a voice every Martian knows:
  the voice of Mars (M5). The Grey Lodge tries to bury Red Dust under falling
  stars (M6).
- **Ending and twist.** Mars was green. The thing under the mountain, or one
  of its kind, ate it, and called the Martians here with their grandmothers'
  voices. Quaxx asks who wants to go home; nobody raises a hand. The
  Martians send the date and the star-chart to the Pact by the Crown's
  courier, a helpful clerk named Pettigrew.
- **Picks up:** the Glass Ship, the dead Overmind and "we were answering"
  (prologue F7, F8); the debt to Sugarcrest (prologue F9).
- **Hands on:** the date of the Long Night (every tier 3 campaign); the
  star-chart in the Cult's hands; the Martians as Sugarcrest's allies (Candy
  C6) and the Old Queen's (Dinosaurs DN5).

### 2.7 Ice Folk: The Long Winter

- **Protagonist and voice.** Mother Rime, the Ice Witch who led her people
  down from the peaks in the prologue. Calm, old, kind, unhurried as a
  glacier; the briefings read like a winter's tale told by a fire, and the
  Ice Folk are a picture book, never a horror.
- **Goal.** Bring the cold. The Pact has learned that the thing under the
  mountain sleeps in the cold, and the mountain is warm to the touch. Rime
  will wake the Frost Giants, walk the winter down from the peaks across the
  frozen sea, and set its heart on the summit before the Long Night, whatever
  the lowlands think of a year without summer.
- **Intro.** "Mother Rime brought her people down from the peaks once
  already, called by a bell. This autumn the glaciers are weeping into the
  valleys and the mountain where the bell fell is warm to the touch. The
  Pact has learned that the thing below sleeps in the cold. So Rime will
  bring the cold."
- **Outro.** "The Winter Crown stands on the Hollow Mountain, and Mother
  Rime stands inside it. The mountain is cold at last, and the thing below
  it sleeps, as long as the Crown is whole."

| #   | Mission               | Enemies                                                                | Allies              | Format       |
| --- | --------------------- | ---------------------------------------------------------------------- | ------------------- | ------------ |
| I1  | The Warm Mountain     | Goblins (the Frostbite Boys)                                           | none                | Conquest     |
| I2  | Waking the Giants     | Undead (the Frozen Abbot's ice-bound dead)                             | none                | Hunt         |
| I3  | The Frozen Strait     | Dwarves (the Anvil Bay iron fleet)                                     | none                | Capture, ice |
| I4  | A Year Without Summer | Humans (the Crown's Harvest Wardens), Candy (Sugarcrest's frost-march) | none                | Hold out     |
| I5  | The Ember Lodge       | Cult (the Grey Lodge), Goblins (the Redcaps)                           | none                | Capture      |
| I6  | The Winter Crown      | Cult (the Grey Lodge), Undead (the Unquiet)                            | Dwarves (the Thane) | Escort       |

- **Arc.** A goblin gang has put a stove in the caves under Rime's glacier,
  and the Whitefang clan comes home to see how it is done (I1). The Frost
  Giants sleep in the Glacier Tomb under a dead abbot's guard; they wake
  remembering a hungry star (I2). The winter crosses the Grey Strait on ice
  the Ice Folk freeze themselves, and the dwarves' ironclads take the floes
  for an invasion (I3). The lowlands fight the snow: the Crown's Harvest
  Wardens and Sugarcrest, whose people crack in a frost; Rime holds the Snow
  Line, then makes the Frost Treaty with Queen Praline (I4). The Grey Lodge
  keeps the mountain warm with a three-hundred-year bonfire, fed by the
  Redcaps (I5). Rime carries the Heart of Winter to the summit (I6).
- **Ending and twist.** Rime sets the Heart in the snow, lays her hands on
  it, and does not take them away. By evening she is ice to the crown.
  "Someone has to stay with it," she said, before she couldn't.
- **Picks up:** the cure (Dinosaurs DN6); the date (Martians M5); the
  Whitefang (Humans, Dwarves); the dwarves' iron fleet (Dwarves D5).
- **Hands on:** the Winter Crown, which the Cult must break (CU5); the Frost
  Treaty, which puts Sugarcrest's troops on the summit beside the Ice Folk
  (CU5).

### 2.8 Candy: Sweet Dreams

- **Protagonist and voice.** Queen Praline of Sugarcrest, who curtsies
  armed to the teeth, and her Royal Confectioner, Madame Nougat, a round
  caramel scientist in goggles. The silliest faction with the saddest
  secret; the briefings are royal proclamations with sprinkles on.
- **Goal.** Find out why Sugarcrest is going stale. Since it fell out of the
  Rift in the prologue the kingdom has been exiled on this side, and this
  autumn its sweets are going sour, its walls are crumbling, and the dead
  are walking out of the Rift. The answer is a recipe, a door, and a dream.
- **Intro.** "Sugarcrest fell out of a hole in the world last autumn and has
  been making the best of it. This autumn the best is going stale: the
  gumdrops are hard, the walls are crumbling, and something sour is seeping
  through the sealed Rift at night."
- **Outro.** "Sugarcrest is a dream, and the dreamer must sleep sweetly. On
  the Long Night the Sugarcrest choir will sing the Marquis's Lullaby at the
  top of the Bottomless, the sweetest voices beside the saddest, and Queen
  Praline will be there, armed."

| #   | Mission               | Enemies                                                  | Allies              | Format      |
| --- | --------------------- | -------------------------------------------------------- | ------------------- | ----------- |
| C1  | Sweet Tooth           | Goblins (the Sweet-tooth gang)                           | none                | Conquest    |
| C2  | The Royal Recipe Book | Dinosaurs (runaways from Kessler's circus)               | none                | Capture     |
| C3  | The Commissioner      | Humans (the Crown's lake squadron)                       | none                | Hunt, naval |
| C4  | Sour Notes            | Cult (the Candlewick brethren)                           | none                | Capture     |
| C5  | The Dream Door        | Undead (the nightmares)                                  | none                | Escort      |
| C6  | Sweet Dreams          | Undead (the nightmares), Goblins (the Sweet-tooth horde) | Martians (Red Dust) | Hold out    |

- **Arc.** Goblins are eating Gumdrop (C1). The oldest recipe in the
  kingdom is in the library at Riftwatch, where runaway circus dinosaurs
  have nested in the stacks (C2). The Crown sends a mild little
  Commissioner in grey with a contract for the Sugarcrest choir's services
  "on a date to be confirmed"; Praline eats the contract and sinks his
  flagship (C3). Hooded zealots kidnap the choir to silence it (C4). The
  recipe is not a recipe: it describes a sleeper and a dream it once had of
  a kingdom made of sugar. Praline walks through a door into the dream and
  sees the eye (C5). The nightmares make one last push at Sugarcrest, the
  last sweet thing they have not soured, and the Marquis arrives with the
  Lullaby (C6).
- **Ending and twist.** Sugarcrest is the Sleeper's sweet dream; the
  Unquiet are its nightmares. The choir sings the Lullaby through once and
  puts every nightmare for a mile to sleep. Only Praline frowns, at one note
  near the end: "It tastes sour." The Marquis assures her it is in his own
  hand.
- **Picks up:** Sugarcrest and the Rift (prologue F9); the circus runaways
  (Humans, Dinosaurs); the Frost Treaty (Ice Folk I4); the Lullaby (Undead
  U6); the Martians' friendship (Martians M4).
- **Hands on:** the choir at the Deep Gate (Cult CU6); the sour note (Cult
  CU2); Sugarcrest's guard on the summit (Cult CU5).

### 2.9 The Cultists: The Long Night

- **Protagonist and voice.** Mr. Silas Pettigrew: nineteen years a junior
  clerk in the Lodge of the Unblinking Eye, six months a junior clerk to
  Marshal Steele, passed over for promotion in both. An ordinary man in a
  good grey robe who knelt when everybody knelt, took the pardon, kept the
  minutes, and read the books nobody else bothered to read. Every briefing
  is the minutes of a meeting ("Item one: ..."), and the dark comedy is that
  he is very, very good at paperwork. As he rises from Initiate to
  Hierophant he starts to look like a Summoner: pale, with one bruised eye.
  The cultists are schmucks in evil robes; the horror is what they call.
- **Goal.** At first, promotion. Then the Long Night: the Grey Book says
  that whoever opens the door for the Guest will sit at its right hand, and
  Mr. Pettigrew would like a seat.
- **Intro.** "Silas Pettigrew was a junior clerk in the Lodge of the
  Unblinking Eye for nineteen years, and a junior clerk to Marshal Steele
  for six months. He knelt when everybody knelt and kept the minutes. On
  the Long Night the stars will be right for the last time in three hundred
  years, and Mr. Pettigrew has decided it is time somebody was promoted."
- **Outro** (the epilogue of the saga): see the closing of CU6 below.

| #   | Mission                     | Enemies                                                               | Allies                   | Format        |
| --- | --------------------------- | --------------------------------------------------------------------- | ------------------------ | ------------- |
| CU1 | Minutes of the Last Meeting | Humans (a Ranger patrol)                                              | none                     | Hunt          |
| CU2 | One Wrong Note              | Undead (the Marquis's archive guard)                                  | none                     | Capture       |
| CU3 | Old Blood                   | Dinosaurs (sea-beasts), Martians (skimmers)                           | none                     | Escort, naval |
| CU4 | The Inspector Calls         | Dwarves (the Seal's wardens), Goblins (Grubnak, Honorary Dwarf)       | none                     | Hold out      |
| CU5 | Thaw                        | Ice Folk (the Winter Crown's guard), Candy (the Frost Treaty)         | Goblins (Redcaps, hired) | Hunt          |
| CU6 | The Long Night              | Dwarves (the Deep Gate), Humans (Steele's army), Undead (the Marquis) | none                     | Capture       |

- **Arc.** One spring evening a Ranger watches the Grey Lodge meet
  from a hedge, and is lost in the marsh (CU1). Brother Mallory is dead
  (Undead U5), the Lodge elects a new Hierophant by a show of one hand, and
  Mr. Pettigrew has a better idea than burning the Marquis's Lullaby:
  borrow it, change one note, and put it back (CU2). A Herald must be paid
  for with old blood, and the oldest blood in the world is a dinosaur egg,
  which comes home across the Lost Sea (CU3). The Crown's new Inspector of
  Works inspects the Great Seal with twelve assistants, and every bolt comes
  out iron and goes back black wax (CU4). A retired schoolmistress drops a
  star on Mother Rime (CU5). And on the Long Night the Lodge marches on the
  Deep Gate, where the whole Pact is ringing a Lullaby with one wrong note
  (CU6). Seen from the other campaigns, the Candlewick brethren keep doing
  the obvious villainous thing against Mr. Pettigrew's instructions
  (attacking the goblins in G6, kidnapping the choir in C4, where his
  irritated letter is found on the chapel desk): ordinary men, in evil
  robes, with ordinary politics.
- **Ending: the turn.** The villain wins, and the win turns. At midnight
  the Marquis rings the Lullaby, note for note, and on the wrong note the
  Hollow Mountain opens its eye. The wax bolts melt. The first thing up the
  Bottomless is the Herald, first through every door, and Mr. Pettigrew is
  holding its strand when he finally reads the page in his pocket, the
  Founder's torn last page: "It eats the door first." The door is the
  Lodge. He looks at the Herald, and at the dark below it, and tells it to
  sit. It sits on the shaft, and the Sleeper cannot climb past its own
  doorman. At dawn the stars turn and the window shuts for three hundred
  years. The world is saved, by its worst people, and it will be paying for
  it: a Herald is always hungry, and the Lodge sends invoices. This is the
  climax of the saga: the culmination of every thread (the clapper,
  the Lullaby, the egg, the Seal, the winter, the Pact), a villain's triumph
  that saves the world it conquers, and a last line that leaves the next
  part open.
- **Picks up:** everything: the kneeling hoods (prologue F10), the clerk
  (Humans), the torn page and Mallory's death (Undead), the clapper (Goblins),
  the Seal (Dwarves), the eighth egg (Dinosaurs), the star-chart (Martians),
  the Winter Crown (Ice Folk), the choir and the sour note (Candy).
- **Hands on:** the epilogue; Snikkit's notes, Rime's "first snow" and the
  Eye's blink are left for a later part.

## 3. The missions

Each entry: the briefing blurb (player text), the seats, the format with the
objective in the framework's terms and the two stars, the difficulty step,
the tactical problem the mission poses, the hint line (one; the building bead
may add up to two more), a sketch of the map (generator type, size, the
features that tell the story; the building bead picks the seed with the seed
browser), any special mechanic, and the closing line of the debrief. An
extension the framework lacks is flagged **(E*n*)** and listed in
[section 4](#4-mission-system-extensions).

### 3.1 Humans: The Marshal's Law

#### H1. Thaw at Northwatch

> Marshal Steele's first spring of peace begins with an earthquake and a
> knock on the barrow doors. The dead of Hollow Barrow are walking again, and
> this time nobody gave the order: the Ashen Marquis swears they are none of
> his. Mr. Pettigrew, your clerk, has already filed the incident report.
> Clear the barrow before the farmers start burying each other.

- **Seats:** you, Humans (Northwatch, a level 2 town, a small army with a
  Knight); enemy, Undead (the Unquiet: Hollow Barrow and a barrow camp, a
  Necromancer, Skeletons; `NORMAL`, then `RUSH` from turn 4).
- **Format:** Conquest (`DOMINATION`). **Stars:** by turn 12; lose no city.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Undead basics. Every death leaves a Grave and
  the Necromancer raises Skeletons from free Graves near it; a quick, tidy
  fight that keeps Graves covered and reaches the Necromancer wins, a slow
  brawl feeds the barrow.
- **Hint:** "Stand on Graves: the dead rise only from free ones."
- **Map:** Dry Land 11, Woodland. Northwatch in the south among farms;
  Hollow Barrow in the north inside a ring of mounds, with pre-placed Graves
  on the fields between.
- **Mechanics:** pre-placed Graves (existing).
- **Closing:** "The barrow is quiet. In the mud a Ranger finds a grey hood,
  neatly folded. Mr. Pettigrew files it under Lost Property."

#### H2. The Lord Protector's Writ

> Baron Kessler is back from Kingsport with a royal writ, a new title and an
> army of goblin mercenaries in red caps. As Lord Protector of the Frontier
> he has disbanded the Rangers, doubled the tolls and seized the three toll
> forts on the King's Road. Steele has read the writ twice and decided it is
> a forgery. Take the forts back before his Redcaps dig in.

- **Seats:** you, Humans (Fort Steele and a village); enemy, Goblins (the
  Redcaps: three walled toll forts on the road, each `GUARD`ed by a small
  garrison, the rest `RUSH` from turn 6).
- **Format:** Capture against the clock (`CAPTURE` the three forts,
  `byRound` 18). **Stars:** by turn 14; lose no city.
- **Difficulty:** 2 of 6.
- **Tactical problem:** three walled forts in a line and an enemy that hits
  hardest in a crowd. Marksmen and a Catapult crack the walls; an army that
  advances in a block gives Gang Up nothing to work with.
- **Hint:** "Redcaps mob a lone unit: advance in a block."
- **Map:** Dry Land 14, Plains. The King's Road runs the length of the
  board through the three forts; low hills on either side, villages off the
  road.
- **Closing:** "The forts are yours, and the Crown has declared you an
  outlaw. Mr. Pettigrew has kept copies of everything. 'The Baron's
  accounts, Marshal. They do not add up.'"

#### H3. Outlaws of the Greenwood

> An outlaw cannot hang a baron, but a judge can. The Royal Assizes sit at
> Kingsbridge in twenty days, and Mr. Pettigrew is carrying the Baron's
> ledgers in a box chained to his wrist. The Redcaps are combing the
> Greenwood for him, and something large that escaped from the Baron's
> travelling circus last winter has been eating Redcaps ever since. Get your
> clerk to court alive.

- **Seats:** you, Humans (an outlaw camp; the tagged Captain `PETTIGREW`);
  enemies, Goblins (the Redcaps, `RUSH`) and Dinosaurs (Kessler's runaway
  menagerie: a Raptor pack and a Triceratops, `HOLD` their wood), **rival**:
  the beasts attack Redcaps as readily as Rangers.
- **Format:** Escort (`ESCORT` `PETTIGREW` to `KINGSBRIDGE`, `within` 1,
  `byRound` 20). **Stars:** by turn 16; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** a frail unit through ambush country. The short road
  runs through the beasts' wood; the long road runs past the Redcap camps.
  The clever route draws the Redcaps into the wood and lets the two enemies
  meet.
- **Hint:** "Lead the Redcaps into the beasts' wood."
- **Map:** Pangea 16, Woodland. Thick forest from the outlaw camp in the
  south-west to Kingsbridge in the north-east; a beast-wood in the middle; a
  long road around it past two Redcap camps.
- **Mechanics:** two rival AI seats (existing: `aiMode` `RIVAL`, no teams).
- **Closing:** "The judge reads the ledgers and signs a warrant for the
  Baron. Kessler answers it as he answers everything: he hires more men, and
  a grey-hooded lodge, it seems, is for hire."

#### H4. The Siege of Fort Hollow

> Kessler has bought the Grey Lodge, the hooded men who knelt to you last
> autumn, and the Whitefang clan, Ice Folk who would sooner fight than
> freeze. Together they are marching on Fort Hollow, where this whole
> business began. Hold the fort for sixteen days. The Ashen Marquis has
> promised a relief column, and the dead, he says, are never late, merely
> slow.

- **Seats:** you, Humans (Fort Hollow, walled, level 3; Mr. Pettigrew
  inside as the tagged Captain `PETTIGREW`); enemies, Cult (the Grey Lodge:
  Summoners, Initiates and Idol Bearers, some starting Favour; `ASSAULT`
  Fort Hollow) and Ice Folk (the Whitefang clan under Chief Gnash: Yetis, a
  Mammoth; `RUSH` from turn 3), teamed; ally, Undead (the Marquis's column:
  a small camp at the board's edge and a wave on turn 9, then `ASSAULT`
  the besiegers).
- **Format:** Hold out (`SURVIVE` 16, `protect` Fort Hollow). **Stars:**
  lose no city; Pettigrew lives.
- **Difficulty:** 4 of 6.
- **Tactical problem:** a first taste of the Cult. Its daemons are strong
  only while robed cultists channel them; shoot the channellers and the
  daemon breaks loose and turns on the nearest cultist. Meanwhile the
  Whitefang freeze whoever stands outside the walls.
- **Hint:** "Shoot the robed men, and their daemon turns on them."
- **Map:** Dry Land 16, Highlands. Fort Hollow on its hill with the Hollow
  Hills behind; the Whitefang come over the northern ridge, the Lodge up the
  western road; the Marquis's column enters from the north-west.
- **Mechanics:** an allied seat with a relief wave (existing); a story line
  when the wave arrives ("The dead are here. They apologise for the delay.")
  **(E4, optional)**.
- **Closing:** "The dead arrive on the ninth day, bowing. The Grey Lodge
  scatters and the Whitefang go home to sulk. But the Baron has closed the
  river mouth with his fleet, and not a sack of grain will reach the
  Frontier this spring."

#### H5. Broadsides at Saltmarsh

> Kessler's blockade sits at the mouth of the river: Redcap fire rafts, a
> scrap-iron dreadnought, and his treasure ship, the Golden Goose, which
> carries the Frontier's stolen taxes and his good cutlery. The Crown keeps
> no navy up here, so Steele is building one. Sink the Golden Goose and the
> blockade loses its paymaster. Mind the old serpent in the deep channel: it
> has bitten both sides for a hundred years and has no politics.

- **Seats:** you, Humans (Saltmarsh, a port town with a Port, and Ferry Rest
  upriver; Shorecraft known); enemy, Goblins (the Redcap navy: Fire Rafts,
  Diving Barrels and two Scrap Dreadnoughts, one tagged `GOLDEN_GOOSE`,
  which keeps to the barrier island's anchorage; the rafts go up the
  river; both need **E7**).
- **Format:** Hunt, naval (`KILL` `GOLDEN_GOOSE`, `byRound` 22). **Stars:**
  by turn 18; lose no city.
- **Difficulty:** 5 of 6.
- **Tactical problem:** build a fleet under fire. A Fire Raft sails up and
  Kabooms, hurting every ship around it, so a tight fleet dies to one raft;
  and the Golden Goose, a Scrap Dreadnought, blows up when it sinks. A
  Submarine torpedoes the Goose without reply, but only after the screen of
  rafts is cleared, and it should not be sitting beside her when she goes.
- **Hint:** "Fire Rafts Kaboom: never bunch your ships."
- **Map:** Continents 16. The Frontier's shore in the south with Saltmarsh
  at the river mouth; a barrier island across it with the Redcap anchorage;
  a deep channel between.
- **Mechanics:** a Sea Serpent in the deep channel **(E1)**; a tagged ship
  as the target **(E6, verify)**; ships that keep their posts **(E7)**.
- **Closing:** "The Golden Goose goes down with a sound like a dropped till.
  Unpaid, the Redcap fleet scatters, and every hired sword on the Frontier
  falls back on the one place still paying: Kessler Hall."

#### H6. Kessler Hall

> Kessler Hall stands on its hill above the Baron's lands, with a lightning
> tower on the lawn, the last of the Redcaps in the yard, his circus beasts
> in the cellars and the Grey Lodge chanting in the chapel. Every road to it
> is a toll road. Take the Hall before midsummer and put the Baron in irons.
> Grubnak has offered help, the Marquis has offered help, and Steele has
> said no to both: this one belongs to the Frontier.

- **Seats:** you, Humans (Fort Steele, Kessler's Toll, and a strong army
  with Knights and Catapults); enemies, Goblins (the Redcaps: the toll forts
  on the three roads, `GUARD` with `others` `RUSH`), Dinosaurs (Kessler's
  war beasts: `HOLD` the Hall's grounds) and Cult (the Grey Lodge: the
  chapel town beside the Hall, `GUARD`), teamed. Kessler is not on the
  field: he is in his wine cellar, packing.
- **Format:** Capture against the clock, multi-front (`CAPTURE`
  `KESSLER_HALL`, `byRound` 26). **Stars:** by turn 22; lose no city.
- **Difficulty:** 6 of 6.
- **Tactical problem:** three armies with three kinds of trouble: Gang Up in
  the forts, Charge! on the lawns, daemons in the chapel. The lightning
  tower on the knoll before the Hall zaps an enemy within two for whoever
  stands on it, the Hall's gate included, so taking the tower first turns
  the Hall's best defence against it.
- **Hint:** "Whoever holds the tower zaps whoever comes near."
- **Map:** Pangea 20, Plains. Kessler Hall on a central hill with the Tesla
  Tower on a knoll three tiles before its gate; three approaches, each through a walled toll fort; a river
  on the west side down which the Baron will escape.
- **Mechanics:** a Tesla Tower **(E1)**; four seats (existing).
- **Closing:** "The Hall falls, but the Baron has gone out through the wine
  cellar and down the river in a rowing boat, bound for his island. In his
  strongroom you find two ledgers, his payments to the Grey Lodge and
  theirs to him, both in the same small, tidy hand. Mr. Pettigrew offers to
  file them."

### 3.2 Undead: The Long Sleep

#### U1. Resurrection Men

> The Ashen Marquis has decided to go back to sleep, and finds his bed has
> been robbed. Kessler's Resurrection Company is digging up the Barrowlands
> by lantern light and selling the bones by the barrel. Doctor Crane, the
> Marquis's archivist and the only living man at his court, has their
> foreman's name: Grimsditch. Run them off the Marquis's land. Politely, if
> possible. It will not be possible.

- **Seats:** you, Undead (the Ashen Tower, a Necromancer, Skeletons and
  Zombies; the tagged Vampire `MARQUIS`); enemy, Humans (Kessler's
  Resurrection Company: two digging camps, `NORMAL`).
- **Format:** Conquest (`DOMINATION`). **Stars:** by turn 12; the Marquis
  lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Undead from the other side: every robber who
  falls leaves a Grave, and a Necromancer standing near Graves raises a
  Skeleton from each. Fight on the barrow fields, not in the robbers' camps.
- **Hint:** "A Necromancer raises a Skeleton from every free Grave."
- **Map:** Dry Land 11, Plains. The Ashen Tower in the north-west; barrow
  fields with pre-placed Graves across the middle; the two camps on hills in
  the south and east.
- **Mechanics:** pre-placed Graves (existing).
- **Closing:** "In Grimsditch's cart is an order for the Marquis's own
  bones, to be delivered to a buyer in a grey hood. The Marquis is
  flattered. Doctor Crane is not."

#### U2. The Drowned Library

> Doctor Crane, who read the bell's score last autumn, believes it has a
> counter-score, and that the Marquis wrote of it in a diary before he was
> ashen. The Abbey of Saint Ashes, where the diary was shelved, has been under a
> lake since a dam broke, and the Bonepicker goblins use its bell tower as a
> lair. Hold the abbey isle for fourteen days while Crane reads with a
> lantern and a pair of tongs. Bonepickers, the Marquis notes, pick bones. He
> would rather they did not pick his.

- **Seats:** you, Undead (the abbey isle, taken at the start, and a camp on
  the shore; the tagged Necromancer `CRANE` in the abbey); enemy, Goblins
  (the Bonepicker clan: two shore camps, `RUSH`, waves from the lakeshore on
  turns 5 and 9).
- **Format:** Hold out (`SURVIVE` 14, `protect` `CRANE` and the abbey).
  **Stars:** lose no city; the Marquis lives.
- **Difficulty:** 2 of 6.
- **Tactical problem:** goblins come in mobs and blow up beside you, and the
  dead heal only inside their own borders. A Banshee's Wail hurts every
  living enemy near it and leaves them unable to strike back for the rest of
  the turn, which is when the dead counter-attack.
- **Hint:** "After a Wail, the Goblins cannot hit back."
- **Map:** Lakes 14. The abbey on an island in the largest lake, reached by
  one causeway and the shallows; goblin camps on two shores; drowned
  villages.
- **Mechanics:** reinforcement waves (existing).
- **Closing:** "Crane finds the diary, water-stained, in the Marquis's own
  hand. It describes a bell, a summit, a thing that hums in the rock, and a
  song he wrote to make it sleep: the Lullaby. The Marquis does not remember
  writing any of it."

#### U3. The Ship of the Dead

> The diary says half the Lullaby went to sea in the Marquis's flagship, the
> Last Rites, and down with her in Gravesend Bay. The Marquis can raise a
> drowned crew as easily as a dry one. Unfortunately the Martians are
> dredging the bay for star-iron with machines that hover, and they have
> built a fort on Chapel Rock, right over the wreck. Take the Rock and raise
> the Last Rites. Every Martian ship you sink comes back up with a crew of
> yours.

- **Seats:** you, Undead (Gravesend, a port, and the Undead naval branch's
  first technologies with Drowned Crews); enemy, Martians (the dredgers: Chapel Rock, an island
  town, and a rig town on the far shore; Skimmers and Hover Cruisers,
  `GUARD` the Rock).
- **Format:** Capture, naval (`CAPTURE` `CHAPEL_ROCK`, `byRound` 22).
  **Stars:** by turn 18; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** Martian Shields soak damage and refill every turn,
  so spreading fire wastes it; focus one ship a turn. The Undead fleet grows
  from the enemy's: with Drowned Crews, what an Undead ship sinks rises as
  a Ghost Ship.
- **Hint:** "Shields refill each turn: sink one ship at a time."
- **Map:** Continents 16. Gravesend on the western landmass at the head of a
  bay; Chapel Rock an island town in the bay's mouth; the Martian rig town
  on the eastern landmass.
- **Closing:** "The Last Rites comes up with her captain at the wheel and
  half a score in a lead box. The other half, says the captain, the Marquis
  took with him to his grave. The Marquis has never seen his grave. He was
  told it was under the summit."

#### U4. The Hall of the Thanes

> The shortest road to the summit runs under the mountain, through the Hall
> of the Thanes, where the Ironbraid dwarves bury their dead and do not care
> to see them walk. The Thane has barred her doors to necromancers since the
> business with the bell. Walk Doctor Crane through the Hall to the summit
> stair, past every hammer in the clan. The Marquis has instructed his
> troops to apologise as they go.

- **Seats:** you, Undead (Lantern Hill, below the mountain; `CRANE`);
  enemy, Dwarves (the crypt-wardens: two halls on the tunnel road and a
  watch-post, `GUARD`; Gyrocopters on patrol).
- **Format:** Escort (`ESCORT` `CRANE` to `SUMMIT_STAIR`, `within` 1,
  `byRound` 22). **Stars:** by turn 18; lose no city.
- **Difficulty:** 4 of 6.
- **Tactical problem:** dwarves standing still by their own cities defend as
  if fortified, and their cannons knock units back down the road. Fighting
  through every hall is slow; the goat path along the peaks is long but only
  lightly watched.
- **Hint:** "Dwarves dig in by their cities: go around them."
- **Map:** Dry Land 16, Highlands. A mountain maze: the tunnel road (Grass
  through Mountain) with two halls on it; a longer path along the peaks; the
  summit stair, a village landmark, in the far north-east.
- **Closing:** "Crane reaches the stair with his hat still on. Behind him the
  Thane writes to Marshal Steele about the dead, in capitals."

#### U5. Bedtime Reading

> The Grey Lodge has worked out who the Marquis was before he was ashen.
> Brother Mallory, its Hierophant, a corn merchant in a very good robe, has
> stolen the Marquis's diary and is reading it aloud to his Summoners to
> learn which pages to burn. Stop his reading for good, before he gets to
> the end. The Marquis would like his diary back. He has begun to suspect
> what is in it.

- **Seats:** you, Undead (Lantern Hill and Gallows Cross); enemies, Cult
  (the Grey Lodge at Greyhood: the tagged Summoner `MALLORY` in a chapel
  ringed by Idol Bearers, `GUARD`) and Humans (Kessler's toll-men, paid to
  hold the causeway fort, `GUARD` with `others` `RUSH`), teamed.
- **Format:** Hunt (`KILL` `MALLORY`, `byRound` 20). **Stars:** by turn 16;
  lose no city.
- **Difficulty:** 5 of 6.
- **Tactical problem:** a target behind a shield wall. A unit beside a
  raised idol may attack only an Idol Bearer, and shots at cultists beside
  it do half; break the Bearers first, then send the Vampire in: its kill
  heals it and lets it strike again.
- **Hint:** "Beside a raised idol you may hit only the Bearer."
- **Map:** Lakes 16. Greyhood on an island of reeds in a marsh, reached by
  one causeway with Kessler's fort on it and by fords; the Marquis's towns
  to the west.
- **Closing:** "Mallory falls mid-sentence and the diary comes home. In the
  Lodge's account books every entry, for years back, is in one small, tidy
  hand."

#### U6. The Founder's Tomb

> The other half of the Lullaby lies in the Marquis's grave, and his grave,
> the diary says, is under the Lodge on the summit, where Steele's Rangers
> have kept watch since the autumn. The Grey Lodge wants its old temple back
> and has hired the Whitefang clan to help it up the slopes. The Rangers
> will not last long against both. Relieve the summit and hold it for
> sixteen days while the Marquis goes down into his own tomb. He says he is
> not nervous. He has said so four times.

- **Seats:** you, Undead (a camp on the lower slope; `MARQUIS`, `CRANE`);
  enemies, Cult (the Grey Lodge, `ASSAULT` the Lodge) and Ice Folk (the
  Whitefang clan, `RUSH` over the snowline), teamed; ally, Humans (the
  summit Rangers: the Lodge, walled, `HOLD` its land).
- **Format:** Rescue (`SURVIVE` 16, `protect` the Lodge). **Stars:** Crane
  lives; lose no city.
- **Difficulty:** 6 of 6.
- **Tactical problem:** defend walls you may not enter: no unit may step
  into an ally's land, so the dead hold the slopes in front of the Rangers.
  Two fronts, two kinds of enemy: daemons from the marsh side, freezing and
  Rockfall from the peaks. Liches outrange both.
- **Hint:** "You cannot enter the Rangers' land: fight in front."
- **Map:** Dry Land 16, Highlands. The summit Lodge in the centre-north on a
  plateau; three slopes; your camp on the southern slope; Greyhood's marsh
  to the east; the Whitefang above the western snowline.
- **Closing:** "In the tomb lie the second half of the Lullaby and a page
  torn from the Grey Book, in the Marquis's hand: 'It eats the door first.'
  He remembers now. He founded the Lodge, cast the bell and rang it, and
  his whole court died of it. He gives the page to Crane to file, takes up
  the Lullaby, and goes down the mountain to tell Marshal Steele what he
  is."

### 3.3 Goblins: The Big Score

#### G1. Grubnak Gets Bored

> The Baron's last soldiers on the mainland are sitting in Fort Bullion with
> nothing to guard but his paperwork. Grubnak has never read paperwork, but
> he can smell a map. Take the fort, find the papers, and give the one with
> a drawing of a vault on it to Snikkit, who can read. Then, says Grubnak,
> we rob a baron.

- **Seats:** you, Goblins (an outpost of the Warrens; the tagged Orc
  Warboss `GRUBNAK` and the tagged Goblin `SNIKKIT`); enemy, Humans (Fort
  Bullion's garrison: the walled fort and a toll village, `GUARD`).
- **Format:** Conquest (`DOMINATION`). **Stars:** by turn 12; Snikkit
  lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Goblin basics: each goblin beside a target makes
  the next goblin's hit harder (an Ogre counts twice), and a Goblin can
  Kaboom. A mob takes a wall that a line cannot.
- **Hint:** "Each Goblin beside a target makes the next hit harder."
- **Map:** Dry Land 11, Plains. The goblin outpost in the east; Fort Bullion
  on the road in the west, walled, with a toll village beside it.
- **Closing:** "Snikkit reads the map aloud: Port Kessler, the vault under
  the harbour, one lock, four guards, and a list of what is inside. Gold,
  gold, silver, the good cutlery, and 'one bell-tongue, dwarf-made, bought
  in the confusion at the Deep Gate'. Nobody knows what a bell-tongue is.
  Grubnak wants it anyway."

#### G2. Boats for Bones

> The island is across the Lost Sea, and goblins have never owned a boat they
> did not set on fire. The only shipyard on this coast is Wreckers' Cove,
> and the Unquiet have taken it over: drowned sailors who walked ashore when
> the bell rang and never walked back. Take the cove before the new moon and
> the boats are yours, powder and all. Mogga the Ogre has volunteered to
> carry the barrels. Nobody else is to touch the powder.

- **Seats:** you, Goblins (a camp on the cliffs; the tagged Ogre `MOGGA`);
  enemy, Undead (the Unquiet: Wreckers' Cove and a wreck camp, Zombies and
  Skeletons, a Necromancer; `GUARD` the cove with `others` raiding).
- **Format:** Capture against the clock (`CAPTURE` `WRECKERS_COVE`,
  `byRound` 18). **Stars:** by turn 15; lose no city.
- **Difficulty:** 2 of 6.
- **Tactical problem:** the dead are slow but rise again; Bomb Chuckers
  splash every unit beside the target, goblins included, so the bombs go in
  ahead of the mob, never into it.
- **Hint:** "Bombs hurt your own: chuck them ahead of the mob."
- **Map:** Pangea 14, Woodland. A cliffed coast; the cove in a bay with its
  slipways; Graves on the beach; the goblin camp on the headland.
- **Closing:** "The boats leak, the powder is damp, and the crew is singing.
  Snikkit has drawn the course across the Lost Sea in crayon."

#### G3. Here Be Monsters

> Halfway across, the Lost Sea gets more lost. The island's sea-beasts do
> not like boats, and the biggest of them, a grey old plesiosaur the natives
> call Snapjaw, has already eaten three fire rafts and a rowing boat. Sink
> Snapjaw and the way to Egg Rock lies open. Fire rafts are very good at
> sinking things, including themselves.

- **Seats:** you, Goblins (a raft-camp on an islet with a Port; Fire Rafts
  and Powder Kegs known); enemy, Dinosaurs (the island's tribes: fishing
  villages, Dugouts, Plesiosaurs; the tagged Plesiosaur `SNAPJAW`, Big,
  with two kills, which keeps to the strait **(E7)**).
- **Format:** Hunt, naval (`KILL` `SNAPJAW`, `byRound` 20). **Stars:** by
  turn 16; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** Snapjaw is one kill from Alpha, and growing heals a
  plesiosaur whole, so a raft fed to it one at a time undoes all the
  damage done; Fire Rafts Kaboom afloat and Diving Barrels torpedo without
  reply. Strike Snapjaw all at once, not one raft at a time.
- **Hint:** "Don't feed Snapjaw: its next kill heals it whole."
- **Map:** Archipelago 16. The goblins' islet in the east; a strait of deep
  water; the dinosaur fishing villages on the islands around; Egg Rock and,
  beyond, the main island in the west.
- **Mechanics:** a tagged sea-beast with kills as the target **(E6,
  verify)**; a sea-beast that keeps to its strait **(E7)**.
- **Closing:** "Snapjaw sinks with a burp. On Egg Rock, Snikkit stands on a
  barrel and looks across the bay at Port Kessler: walls, guns, and on the
  hill above the town a cannon pointed at the moon."

#### G4. The Inside Job

> Port Kessler's vault sits under the harbour behind walls no goblin has
> ever climbed. But on the hill above the town stands the Baron's Moon Gun, a
> circus cannon built to fire a man at the moon, and Snikkit has done the
> sums. Take the Moon Gun, fire the crew over the walls, and have the vault
> before the Baron's garrison and the island's angry natives work out what
> is going on. Bring sacks.

- **Seats:** you, Goblins (Egg Rock, a beachhead; `SNIKKIT`); enemies,
  Humans (Kessler's island garrison: Port Kessler, walled, level 3, `GUARD`
  with a garrison of six; the Baron hides in his counting-house, never on
  the field) and Dinosaurs (the island's tribes: jungle villages,
  `NORMAL`), **rival**: the beasts raid the port too.
- **Format:** Capture (`CAPTURE` `PORT_KESSLER`, `byRound` 20). **Stars:**
  by turn 16; Snikkit lives.
- **Difficulty:** 4 of 6.
- **Tactical problem:** a walled port on a headland with one guarded neck,
  and a gun that skips the neck. A unit on the Moon Gun is fired to any
  empty land tile within five, once a turn, and lands spent until its next
  turn. Drop the sturdiest first, one a turn, onto the headland behind the
  garrison, and time the last drop with the assault up the neck: one goblin
  alone under the walls is a funeral.
- **Hint:** "The Moon Gun fires a unit to any empty tile within 5."
- **Map:** Archipelago 16. Egg Rock in the east; Port Kessler on a headland
  of the main island, joined to it by one narrow neck; the Moon Gun on the
  hill above the neck, four tiles from the walls; jungle villages inland.
- **Mechanics:** a Moon Gun **(E1)**.
- **Closing:** "The vault is full: gold, silver, the good cutlery, and a long
  iron crate marked 'bell-tongue'. The Baron escapes into the jungle with
  his hat and his debts and nothing else. The crate hums."

#### G5. Everybody Wants the Tongue

> The crate hums. Snikkit says it is just iron; Mogga says it is singing.
> Either way, flying saucers have been circling Smuggler's Rock since you
> landed with it, the Baron's last loyal men want their master's money back,
> and the getaway rafts will not be ready for sixteen days. Dig in on the
> Rock and keep the loot.

- **Seats:** you, Goblins (Smuggler's Rock, a small walled island town;
  `MOGGA`); enemies, Humans (Kessler's loyalists: a jungle camp on the main
  island, `RUSH`) and Martians (saucers from Ray Hollow, `ASSAULT` the
  Rock), **rival**: they want the crate, not each other's company.
- **Format:** Hold out (`SURVIVE` 16, `protect` Smuggler's Rock). **Stars:**
  lose no city; Mogga lives.
- **Difficulty:** 5 of 6.
- **Tactical problem:** goblins have no healers, so a long siege wears them
  thin; Trolls regenerate and a Rock is easy to wall. Saucers fly over
  water, and a Brain takes over any goblin left standing beside it.
- **Hint:** "Never stand beside a Brain: it takes your Goblins."
- **Map:** Archipelago 16. Smuggler's Rock off the main island's coast;
  Port Kessler's ruins and the loyalists' camp ashore; the Martian outpost
  of Ray Hollow on an islet.
- **Mechanics:** a goblin wave on turn 12, the crew of the getaway rafts
  come early to help dig in (a player reinforcement, existing), with a
  story line **(E4, optional)**.
- **Closing:** "On the sixteenth night the rafts are ready, and the crew sails
  home with the gold, the crate, and three saucer pilots who surrendered to
  Mogga. On the quay at home a polite man in a grey coat is waiting with an
  offer."

#### G6. The Big Getaway

> The polite man in grey offers twice the crate's weight in gold. Snikkit
> has made inquiries: a bell-tongue is the clapper of a bell, this one
> belongs to the dwarves' Deep Bell, and the polite man's friends wear
> hoods. Grubnak, for reasons he cannot explain, says no. Now the Grey Lodge
> and the Unquiet stand between you and the only buyer you trust: Thane
> Ironbraid, waiting at her gate with an army and a great deal of beer. Get
> the loot-cart there in one piece.

- **Seats:** you, Goblins (the river quay and Grubnak's Hall; the tagged
  Scrap Buggy `GETAWAY` carries the crate); enemies, Cult (the Grey Lodge's
  Candlewick brethren: camps beside the road, `GUARD` with `others`
  `ASSAULT` Grubnak's Hall) and Undead (the Unquiet, `RUSH` from the
  barrows), teamed; ally, Dwarves (the Thane's escort, holding the
  Ironbraid Gate, `HOLD` its land).
- **Format:** Escort (`ESCORT` `GETAWAY` to `IRONBRAID_GATE`, `within` 2:
  no unit may enter an ally's land, so the cart arrives at the edge of the
  Gate's, `byRound` 24). **Stars:** by turn 20; lose no city.
- **Difficulty:** 6 of 6.
- **Tactical problem:** a fast, fragile cart through a gauntlet. A Hexer
  turns the best escort into a frog, a Familiar swaps the cart out of its
  convoy, a daemon blocks the road. Kill the Hexers first, keep the cart
  inside the mob, and bring it in under the dwarves' guns.
- **Hint:** "A Hexer turns your best unit into a frog: kill it first."
- **Map:** Pangea 20, Highlands. From the river quay in the south-east,
  through the Hollow Hills and the barrow country, under Candlewick's
  slope, to the Ironbraid Gate at the foot of the mountain in the
  north-west.
- **Closing:** "Thane Ironbraid pays in gold, in beer, and in a title:
  Grubnak the Loud, Honorary Dwarf. She takes the clapper down into the Deep
  Gate. Grubnak takes the beer. Snikkit, for no reason he can name, starts a
  notebook about the polite man in grey."

### 3.4 Dwarves: The Bottomless

#### D1. Tremors

> The night shift at Copperstep came up early, and dead. Miners lost in a
> cave-in three hundred years ago are walking out of the cracks the tremors
> opened, still carrying their picks. The Thane needs twelve days to shore up
> the lower galleries. Hold Copperstep until the props are in, and remember:
> a dwarf never leaves a dwarf behind, even one who ought to stay put.

- **Seats:** you, Dwarves (Copperstep, walled, level 3; the tagged Engineer
  `TOBBIN`); enemy, Undead (the Unquiet, called the Grey Shift: three mine
  mouths that start as small camps, `RUSH`, and waves on turns 4 and 8).
- **Format:** Hold out (`SURVIVE` 12, `protect` Copperstep). **Stars:** lose
  no city; Tobbin lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Dwarf basics. A Clockwork Gunner that has not
  moved shoots twice, a unit dug in by its own city defends as if fortified,
  and an Engineer repairs machines. Constructs leave no Graves for the dead
  to use.
- **Hint:** "A Clockwork Gunner that doesn't move shoots twice."
- **Map:** Dry Land 11, Highlands. A mountain pocket around Copperstep; three
  mine mouths in the cliffs around it.
- **Mechanics:** reinforcement waves (existing).
- **Closing:** "The props hold. The dead lie down again, and the oldest of
  them, before he does, says one word: 'Deeper.'"

#### D2. The Iron Peak

> The Thane means to put a lid on the Bottomless: a seal of iron a hundred
> feet across. The best iron in the north is in the Iron Peak, and the Iron
> Peak belongs to the Whitefang clan, who have been in a temper since
> Marshal Steele beat them at Fort Hollow. Mother Rime has disowned them.
> Take the Peak's three mine-camps before the clan can wall them in. Their
> Yetis walk over mountains; your Steam Moles go under them.

- **Seats:** you, Dwarves (Copperstep at the valley mouth); enemy, Ice Folk
  (the Whitefang clan under Chief Gnash: three camps on the ore, `GUARD`,
  Snow Hunters on the peaks).
- **Format:** Capture against the clock (`CAPTURE` the three camps,
  `byRound` 20). **Stars:** by turn 16; lose no city.
- **Difficulty:** 2 of 6.
- **Tactical problem:** Ice Folk on their own ground: Yetis cross mountains
  freely, Snow Hunters throw rocks from the peaks, a Musk Ox freezes whoever
  hits it up close. The dwarves' answer is underground: a Steam Mole digs under
  anything and surfaces among them.
- **Hint:** "A Steam Mole digs up to 3 tiles under anything."
- **Map:** Dry Land 14, Highlands. A high valley ringed by peaks; three
  camps on ore; Copperstep at the valley mouth in the south.
- **Closing:** "The Peak is yours and the forges are lit. Chief Gnash of
  Whitefang, beaten this year by the living, the dead and now the dwarves,
  goes off to sulk at Mother Rime's door. Now the Thane must find out how big the lid has to be."

#### D3. Down the Bottomless

> Nobody has been to the bottom of the Bottomless. The Thane is going
> anyway, down the old spiral of galleries with lanterns, a chain, and her
> best engineers. Somewhere below is the Deep Bell, and somewhere below that
> is whatever it woke. The galleries are full of the dead, and someone has
> been down here lately: there are candle stubs, and hooded footprints, all
> going down. Get the Thane to the bell.

- **Seats:** you, Dwarves (the Deep Gate at the top of the shaft; the tagged
  Engineer `THANE`, `TOBBIN`); enemies, Undead (the deep dead, `GUARD` the
  galleries) and Cult (the Grey Lodge's diggers: a camp in a side cave,
  `HOLD` their cave, then `RUSH` from turn 8, striking whatever stands
  between them and the Deep Gate), teamed.
- **Format:** Escort (`ESCORT` `THANE` to `BELLS_REST`, `within` 1,
  `byRound` 24). **Stars:** by turn 20; Tobbin lives.
- **Difficulty:** 3 of 6.
- **Tactical problem:** a maze of narrow galleries where one Zombie blocks a
  corridor. The Tunnel is the key: a Steam Mole takes one unit beside it
  underground as its rider, so the Thane can skip a choke point instead of
  fighting through it.
- **Hint:** "A Steam Mole can carry one unit under the rock."
- **Map:** Dry Land 16, Highlands, mostly Mountain: a spiral of Grass
  galleries cut through the rock from the Deep Gate in the north down to the
  Bell's Rest, a village landmark in the south; side caves with Graves.
- **Closing:** "The bell lies on its side at the bottom of the world,
  without its tongue, resting on something smooth and grey and very large.
  As the lanterns come close, the something moves. It is an eyelid. The
  Thane climbs back up in silence and orders the lid made twice as thick."

#### D4. Saucers over the Hold

> Martians have found the Deep Gate. A mothership hangs over Ironbraid Hold,
> beaming soldiers down onto the forge roofs and asking, very politely, for
> the bell. They want to ring it, they say, to call home. The Thane has
> explained that the bell is at the bottom of a hole, on a monster's face,
> and that they may not. They did not listen. Bring the mothership down.

- **Seats:** you, Dwarves (Ironbraid Hold and Copperstep, the Gyrocopter
  technology known); enemy, Martians (a landing camp on the high meadow; the
  tagged Mothership `MOTHERSHIP`, `ASSAULT` the Hold, Beam Down troops).
- **Format:** Hunt (`KILL` `MOTHERSHIP`, `byRound` 20). **Stars:** by turn
  16; lose no city.
- **Difficulty:** 4 of 6.
- **Tactical problem:** an enemy that flies and drops troops anywhere, and
  Shields that refill. A Gyrocopter's Bomb Run flies over its target, bombs
  it, and flies back home or on to wherever its Move reaches, and nothing
  hits back; a few runs in one turn strip the Shield and bring a Mothership
  down, and the copters are safe at home before the saucers answer.
- **Hint:** "A Gyrocopter bombs over walls, and nothing hits back."
- **Map:** Dry Land 16, Highlands. Ironbraid Hold and Copperstep in the
  mountain; a high meadow above them where the Martians have landed.
- **Closing:** "The mothership comes down in the forge yard with a polite
  apology. The Thane sends the Martians home, by which she means to their
  colony at Red Dust, on foot. The forges go back to work on the Seal."

#### D5. Iron on the Water

> The last of the Seal's iron, the great bolts, is cast at Anvil Bay on the
> coast and must come up the river by ironclad. The river runs past
> Greyhood, and the Grey Lodge has boats: black gondolas, a galleon with an
> eye painted on the sail, and something in the water with too many arms.
> The Redcaps, out of work since the Baron's war, have hired on as wreckers.
> Bring the bolt-ship to the Deep Gate's landing.

- **Seats:** you, Dwarves (Anvil Bay, a port with a Shipyard, and the Deep
  Gate's river landing; the Dwarf naval branch; the tagged Ironclad
  `ANVIL`); enemies, Cult (the Grey Lodge navy: Black Gondolas, the Galleon
  of the Eye, a Kraken, keeping to the marsh reach **(E7)**) and Goblins
  (the Redcaps: Fire Rafts from a reed camp), teamed.
- **Format:** Escort, naval (`ESCORT` `ANVIL` to `RIVER_LANDING`, `within`
  1, `byRound` 22). **Stars:** by turn 18; lose no city.
- **Difficulty:** 5 of 6.
- **Tactical problem:** a slow, precious ship up a narrow river. The Kraken
  holds any ship beside it to one tile a turn; what the gondolas sink feeds
  the Lodge's Favour. Dwarf ships are Armoured (every hit of 2 or more
  does 1 less): lead with the Steam Launches and keep the Anvil in their
  wake.
- **Hint:** "Dwarf hulls take 1 less a hit: screen the Anvil."
- **Map:** Continents 16. Anvil Bay on the Lost Sea coast in the west; a
  long river estuary winding east past Greyhood's marsh to the landing
  below the mountain.
- **Mechanics:** escort of a tagged ship **(E6, verify)**; a navy that
  keeps to its reach **(E7)**.
- **Closing:** "The bolts come ashore. In the reeds a hooded man writes the
  ship's name in a small notebook."

#### D6. The Great Seal

> The Seal is ready, and the Bottomless knows it. On the night the dwarves
> begin to lower the lid, the dead pour up out of the shaft, the Grey Lodge
> comes up the mountain behind them, and by morning they hold the Deep Gate
> itself. Take it back so the lid can go down. Marshal Steele has kept the
> Pact's first promise: her Rangers are on the road.

- **Seats:** you, Dwarves (Ironbraid Hold and Copperstep, a full army with
  Steam Tanks, `THANE`); enemies, Undead (the Unquiet from the shaft: the
  Deep Gate, `GUARD`, with waves from the shaft) and Cult (the Grey Lodge:
  a camp on the slope, `ASSAULT` Copperstep), teamed; ally, Humans (Steele's
  Rangers: a camp on the southern road, `NORMAL` until turn 6, then `RUSH`).
- **Format:** Capture against the clock (`CAPTURE` `DEEP_GATE`, `byRound`
  24). **Stars:** by turn 20; the Thane lives.
- **Difficulty:** 6 of 6.
- **Tactical problem:** a siege of your own gate, from below and above at
  once. Steam Tanks are Plated (one hit never takes much) and lead the
  assault; the Brass Titan from a level 5 city breaks the line; the Lodge's
  daemons fall apart when their channellers do.
- **Hint:** "Steam Tanks shrug off hits: send them in first."
- **Map:** Dry Land 16, Highlands. The Deep Gate on its shelf over the shaft
  in a mountain bowl; Copperstep and Ironbraid Hold below; the Rangers' road
  from the south; the Lodge's camp on the eastern slope.
- **Mechanics:** an allied seat on a schedule (existing).
- **Closing:** "The Seal comes down over the Bottomless with a boom that
  rattles teeth in Kingsport. 'It will hold,' says the Thane, 'until the
  stars pull on it.' Under the iron the bell lies silent, and beside the
  chain waits its tongue, bought from a goblin at a scandalous price."

### 3.5 Dinosaurs: The Egg Thief

#### DN1. The Empty Nest

> The Old Queen woke to an empty nest and a trail of boot prints. Shaman
> Oona read them: big boots, many men, the Baron's. They carried the eggs to
> the poachers' camps on the coast. The Queen is old and very angry. Oona
> says: follow the boots. Eat the boots.

- **Seats:** you, Dinosaurs (Thunder Nest; the tagged T-Rex `OLD_QUEEN` and
  Shaman `OONA`); enemy, Humans (Kessler's poachers: two beach camps,
  `NORMAL`).
- **Format:** Conquest (`DOMINATION`). **Stars:** by turn 12; the Old Queen
  lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Dinosaur basics: lay Eggs beside the nest, hatch
  them (a Shaman hatches one at once), and let the young ones kill, because
  a dinosaur grows with every kill. The Queen is strong but alone she is
  shot to pieces.
- **Hint:** "Dinosaurs grow when they kill: feed the young ones."
- **Map:** Pangea 11, Woodland. Thunder Nest in the jungle inland; two
  poacher camps on the beaches.
- **Closing:** "The camps are empty of eggs. One poacher, before he runs,
  says the eggs went with the Major. The Major always gets his trophies
  home."

#### DN2. Big Game

> Major Basil Thornbury has shot one of everything and stuffed most of it.
> He is the Baron's hunter, he has the Queen's eggs in a crate, and he is out
> in the tar country with a rifle that can stop a Triceratops at a hundred
> paces. He has also hired Redcap trackers, who are very good at finding
> dinosaurs and very bad at running away from them. Hunt the hunter.

- **Seats:** you, Dinosaurs (Thunder Nest and Fernmaw; `OLD_QUEEN`);
  enemies, Humans (Thornbury's lodge: the tagged Marksman `THORNBURY` and
  his gun-bearers, `HOLD` the ridge) and Goblins (the Redcap trackers, two
  camps, `RUSH`), teamed.
- **Format:** Hunt (`KILL` `THORNBURY`, `byRound` 20). **Stars:** by turn
  16; the Old Queen lives.
- **Difficulty:** 2 of 6.
- **Tactical problem:** a ranged killer behind guards on rough ground. Pack
  Hunt rewards attacking a target that already stands beside a dinosaur, and
  a Spitter's Acid ignores the cover and walls he hides behind.
- **Hint:** "Spitter acid ignores cover, Walls and Field Defense."
- **Map:** Pangea 14, Woodland. The tar country: forest, mountains and tar
  pits around Tarpit; Thornbury's lodge on a ridge; Redcap camps in the
  valleys.
- **Closing:** "Thornbury is stuffed, by the Queen, personally. His crate is
  empty. His diary says the eggs went on the Baron's last ship to the
  mainland, to the Baron's circus, where the buyers come."

#### DN3. The Sea Road

> Dinosaurs do not sail. Dinosaurs have never needed to. But the eggs are
> across the sea, so the cavemen have hollowed out the biggest logs on the
> island and the sea-reptiles have come up from the deep to swim alongside.
> The Baron's last warships stand between the island and the mainland. Get
> the Queen across. Mind the old serpent in the deep water: it is nobody's
> friend.

- **Seats:** you, Dinosaurs (Fernmaw, a port; the Dinosaur naval branch's
  first technologies; `OLD_QUEEN`, who must cross embarked); enemy, Humans
  (Kessler's last ships: a fort on a mid-sea islet, Patrol Boats, a
  Battleship, a Submarine; `GUARD` the islet with `others` `RUSH`).
- **Format:** Escort, naval (`ESCORT` `OLD_QUEEN` to `BIG_TOP_BAY`, `within`
  1, `byRound` 22). **Stars:** by turn 18; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** a transport carrying your best unit is the
  weakest thing on the sea. Clear the lane first: a Dugout rams harder after
  a run, a Plesiosaur torpedoes without reply and grows, a War Raft
  splashes; then cross.
- **Hint:** "A Dugout rams harder after a run of two tiles."
- **Map:** Archipelago 16. The island in the west; a chain of islets with
  the Baron's fort; the mainland coast in the east with Big Top Bay, a
  village landmark.
- **Mechanics:** a Sea Serpent in the deep water **(E1)**; escort of a unit
  that crosses embarked **(E6, verify)**.
- **Closing:** "The Old Queen steps ashore on the mainland, the first queen
  of her kind to do it. Behind the dunes a brass band is playing. The
  Baron's Travelling Wonder Circus is in town."

#### DN4. The Greatest Show on Earth

> Kessler's Travelling Wonder Circus has pitched its big top in the dunes:
> cages of stolen beasts, Redcap roustabouts with cattle-prods, and the Baron
> himself in a ringmaster's coat, selling tickets. The eggs are not here. He
> sold them last week to men in hoods. But the Baron is here. Break open the
> cages, and the Queen would like a word with the ringmaster.

- **Seats:** you, Dinosaurs (a beach camp at Big Top Bay; `OLD_QUEEN`);
  enemies, Humans (the circus: the big top, a walled town, the tagged
  Captain `KESSLER`, `GUARD`) and Goblins (Redcap roustabouts, `RUSH`),
  teamed.
- **Format:** Hunt (`KILL` `KESSLER`, `byRound` 20). **Stars:** by turn 16;
  the Old Queen lives.
- **Difficulty:** 4 of 6.
- **Tactical problem:** a walled ring and a ringmaster hiding in it. The
  freed beasts come to your side on the sixth and tenth days; a Triceratops's
  Charge! ignores Walls and shoves its target back, which is how a ring is
  opened.
- **Hint:** "Charge! ignores Walls and shoves the target back."
- **Map:** Pangea 16, Plains. Dunes and the big top in the middle; the cage
  wagons in a ring around it; the road inland to the Barrowlands.
- **Mechanics:** player waves on turns 6 and 10, the freed beasts
  (existing), with a story line **(E4, optional)**.
- **Closing:** "The Queen has her word with the ringmaster. All that is found
  of Baron Otto Kessler is his hat. In its lining is his pocket-book: 'Eggs,
  eight, sold to the Grey Lodge, Greyhood, for the Long Night. Paid in
  full.'"

#### DN5. Through the Barrowlands

> Greyhood lies across the Barrowlands, and the eggs are giving off a smell
> of old blood that wakes every corpse for miles. The Unquiet are rising all
> along the road, and the Redcaps, unpaid since the Baron's unfortunate
> accident, have taken service with the hoods. The Martians, who have not
> forgotten who ate the Overmind, have offered saucers. Get the Queen to the edge
> of the marsh.

- **Seats:** you, Dinosaurs (a camp at the circus ground and the herd freed
  in DN4; `OLD_QUEEN`); enemies, Undead (the Unquiet: barrow camps, `RUSH`)
  and Goblins (the Redcaps, `GUARD` the river ford with `others` `RUSH`),
  teamed; ally, Martians (Captain Quaxx: a small saucer camp, `NORMAL`).
- **Format:** Escort (`ESCORT` `OLD_QUEEN` to `MIRES_EDGE`, `within` 1,
  `byRound` 22). **Stars:** by turn 18; lose no city.
- **Difficulty:** 5 of 6.
- **Tactical problem:** the dead bite, and a bitten unit that dies rises as
  a Zombie for them. Keep the wounded back and let the Shaman tend them;
  let the saucers find the ambushes; never let the Queen walk alone.
- **Hint:** "Bitten units rise as Zombies: keep the wounded back."
- **Map:** Dry Land 16, Plains. Barrow fields with Graves; a river ford held
  by the Redcaps; the marsh's edge, a village landmark, in the north.
- **Closing:** "At the marsh's edge the Queen stops and lifts her head. Out
  in the reeds the Grey Lodge is singing, and somewhere in the singing are
  eight small heartbeats."

#### DN6. Old Blood

> The Grey Lodge means to offer the Queen's eggs to the thing under the
> mountain: the oldest blood in the world, they say, for the oldest hunger.
> Every egg they offer brings them closer to calling up something worse than
> a dinosaur. Take Greyhood before the last egg is offered. Oona says the
> Queen's blood remembers that hunger. Her mothers' mothers were there the
> last time it woke.

- **Seats:** you, Dinosaurs (a camp at the marsh's edge; `OLD_QUEEN`,
  `OONA`); enemies, Cult (the Grey Lodge: Greyhood, walled, `GUARD`, with
  Summoners and starting Favour) and Undead (the Unquiet: waves out of the
  reeds on turns 6, 10 and 14), teamed.
- **Format:** Capture against the clock (`CAPTURE` `GREYHOOD`, `byRound`
  22). **Stars:** by turn 18; the Old Queen lives.
- **Difficulty:** 6 of 6.
- **Tactical problem:** the Lodge's Favour is the countdown: at 18 the
  Herald can come. Every daemon depends on its channellers, so hit the
  cultists, not the daemons; a chanter that is hurt or moved leaves the
  ritual's circle, so one Raptor in the middle of the chanters can stop a
  summoning.
- **Hint:** "Hit the cultists holding a daemon, and it turns on them."
- **Map:** Lakes 16. The marsh: Greyhood on an island in the reeds, joined
  by causeways and fords; the Unquiet's barrows on the dry ground around.
- **Closing:** "Seven eggs are carried home through the reeds. The eighth is
  gone: a black-sailed galleon slipped out of the marsh at dawn. Oona tells
  the Pact what the Queen's blood remembers: the star that fell, the fire,
  and the long cold after it that put the hunger to sleep. 'Cold,' says
  Oona. 'It sleeps in cold.'"

### 3.6 Martians: Signal from Home

#### M1. Strangers in a Strange Land

> Captain's log, Earth summer. Our colony at Saucer Field has neighbours:
> goblins, who have discovered that a crashed saucer is worth more in pieces.
> They have stripped two already and are wearing the parts as hats. Recover
> the saucers, Captain. Teach the natives to respect the Shield.

- **Seats:** you, Martians (Saucer Field; the tagged Brain `QUAXX`); enemy,
  Goblins (scrap-raiders: two scrap camps across the Rift, `NORMAL`).
- **Format:** Conquest (`DOMINATION`). **Stars:** by turn 12; Quaxx lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Martian basics. Shields soak a hit and refill at
  the start of your turn; Saucers fly over anything, the Rift included; a
  heat ray is strongest from a gun that has not moved.
- **Hint:** "A heat ray hits hardest from a gun that has not moved."
- **Map:** Lakes 11. Saucer Field beside a Rift; the goblin camps across it,
  reachable on foot only the long way round.
- **Mechanics:** a Rift on an 11 board, made with a terrain edit (existing
  edits; the generator places none at this size).
- **Closing:** "The goblins are gone, and so are two saucers, but we have
  their hats. Our scientists report that to decode the call that brought us
  here, they need a native who understands the stars."

#### M2. Abduction at Millford

> Professor Ambrose Haddock of the Millford Observatory has published four
> papers on last autumn's falling stars and been laughed at for all of them.
> He is exactly the native we need. Collect him. Millford's militia will
> object, so bring a Brain: the natives are far more reasonable when they
> are fighting for us. Do not damage the telescope.

- **Seats:** you, Martians (Red Dust; `QUAXX`); enemy, Humans (Millford's
  militia: Millford, walled, with the observatory, and two farm villages;
  `GUARD`).
- **Format:** Capture (`CAPTURE` `MILLFORD`, `byRound` 18). **Stars:** by
  turn 15; lose no city.
- **Difficulty:** 2 of 6.
- **Tactical problem:** Mind Control: a Brain takes over enemies standing
  beside it, up to three, and they fight for you until the Brain is lost. A
  Brain is frail, so it walks behind Shields.
- **Hint:** "A Brain takes up to three enemies beside it."
- **Map:** Pangea 14, Plains. Red Dust in the north-east; farmland; Millford
  on a hill in the south-west, its observatory dome on the walls.
- **Closing:** "Professor Haddock steps aboard in his slippers and asks to
  see the engine. The Martians hand Millford back with an apology, and
  Marshal Steele sends a letter of complaint. The Professor
  has a theory about the bell under the mountain, and to test it he needs
  the star-drive core of the Glass Ship."

#### M3. The Glass Ship

> The Glass Ship still lies in the crater on the dinosaur island, and the
> beasts that guard it hate it more than ever. The star-drive core is too
> heavy to fly: a Tripod must carry it on foot to the coast, and hover
> across to Ray Hollow. The beasts will come for it. So will the sea. Bring
> the core home.

- **Seats:** you, Martians (Ray Hollow on an islet, and a landing camp in
  the Crater; the tagged Tripod `CORE_WALKER` in the Crater; the Martian
  naval branch's first technologies, with Hover Pods); enemy, Dinosaurs (the
  island's tribes: Tarpit and a jungle camp, Raptors, Triceratops,
  Plesiosaurs in the strait; `ASSAULT` the Crater).
- **Format:** Escort, naval (`ESCORT` `CORE_WALKER` to `RAY_HOLLOW`,
  `within` 1, `byRound` 20). **Stars:** by turn 16; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** a slow walker through a jungle of charging beasts,
  then a strait full of torpedoes. A Tripod wades into the shallows and
  launches anywhere, and with Hover Pods its foot escort can too, no Port
  needed, so the crossing can start wherever the beasts are not.
- **Hint:** "With Hover Pods, foot units launch from any beach."
- **Map:** Archipelago 16. The main island with the Crater in its heart and
  jungle around; a strait; Ray Hollow on an islet to the east.
- **Mechanics:** escort of a unit that crosses embarked **(E6, verify)**.
- **Closing:** "The core is home. Haddock wires it to the big dish at Red
  Dust and points the dish at the mountain. 'Listen,' he says. 'It is still
  calling.'"

#### M4. Red Dust

> The dish is listening, and something is listening back. Every night the
> core hums, and the dead of the Rift Lakes climb out of the ground and walk
> toward the dish as if it were calling them by name. Haddock needs sixteen
> nights to decode the call. Hold Red Dust until he does. Queen Praline of
> Sugarcrest, who remembers who saved her kingdom last autumn, has sent her
> sweets.

- **Seats:** you, Martians (Red Dust and Saucer Field); enemy, Undead (the
  Unquiet: barrow camps to the west, `ASSAULT` Red Dust, waves on turns 5,
  9 and 13); ally, Candy (Sugarcrest and Gumdrop, `HOLD` their land).
- **Format:** Hold out (`SURVIVE` 16, `protect` Red Dust). **Stars:** lose
  no city; Sugarcrest stands (`HOLD_PLACE`).
- **Difficulty:** 4 of 6.
- **Tactical problem:** attrition against an enemy that grows from its own
  dead. Shields stop everything but Plague, so the Liches die first; with
  Force Fields a Shield Projector raises the Shields beside it to 4.
- **Hint:** "Plague goes through Shields: kill the Liches first."
- **Map:** Lakes 16. Red Dust and Saucer Field beside the Rift; Sugarcrest
  across the lake; barrow fields to the west.
- **Mechanics:** an allied seat and waves (existing).
- **Closing:** "Haddock has half of it: the call came from under the
  mountain, from the bell, and it is written in a language older than this
  planet. Captain Quaxx sends a mothership to borrow the bell from the
  dwarves, and saucers after a humming crate some goblins have stolen. For
  the other half Haddock needs the Lodge's great orrery, which the hooded
  men carried down to Candlewick when the summit fell."

#### M5. The Orrery at Candlewick

> Candlewick is a quiet town of candle-makers on the mountain's slope that
> knelt to Marshal Steele last autumn, and this summer threw out her reeve
> and started lighting very large candles. In its meeting hall stands the
> Lodge's orrery, a brass machine that shows when the stars will be right.
> The Grey Lodge has hired Redcaps to guard it, and they have been told to
> melt it down if anyone comes. Take Candlewick first.

- **Seats:** you, Martians (Red Dust; the mothership's crew, home on foot
  from the Hold); enemies, Cult (the Grey Lodge: Candlewick, walled, level
  3, `GUARD`, with Hexers and a Stargazer) and Goblins (the Redcaps: camps
  on the lower slope, `RUSH`), teamed.
- **Format:** Capture against the clock (`CAPTURE` `CANDLEWICK`, `byRound`
  22). **Stars:** by turn 18; lose no city.
- **Difficulty:** 5 of 6.
- **Tactical problem:** a town on a slope, guarded by tricks. A Stargazer
  calls a star onto a tile, and it lands next turn on whatever stands there
  and around it; Hexers turn units into frogs. Saucers fly over the slope's
  forests to the guns behind.
- **Hint:** "A marked star falls next turn: get out from under it."
- **Map:** Pangea 16, Highlands. Candlewick on the mountain's slope in the
  north; the Redcap camps below it; Red Dust far off in the south-east.
- **Closing:** "Haddock sets the orrery running. The stars are right until
  midwinter, the Long Night, and then not again for three hundred years.
  When he plays the call through the orrery's brass, every Martian in the
  room knows the voice. It is the voice of Mars."

#### M6. Starfall over Red Dust

> Captain's log: the truth. Mars was green once. Something like the thing
> under this mountain woke there, called with the voices of the living, and
> ate until our world was red and still; we survived in tin. The call that
> brought us here was our grandmothers' voices in its mouth. The Grey Lodge
> knows what we know, and three of its Stargazers are pulling stars down on
> Red Dust to bury it. Kill the Stargazers. Then we will decide whether we
> are going home.

- **Seats:** you, Martians (Red Dust, Saucer Field, Candlewick; `QUAXX`);
  enemies, Cult (three hill camps, each with a tagged Stargazer
  `STARGAZER_1` to `STARGAZER_3` and its chanters, `GUARD`) and Undead (the
  Unquiet: waves on turns 4, 8 and 12), teamed; ally, Humans (the Pact's
  Rangers at Millford, `NORMAL` until turn 8, then `RUSH`).
- **Format:** Hunt (`KILL` the three Stargazers, `byRound` 22). **Stars:** by
  turn 18; lose no city.
- **Difficulty:** 6 of 6.
- **Tactical problem:** three targets on three hills, each behind chanters
  who make its star hit harder. A chanter that is hurt or moved stops
  chanting, so a Tractor Beam or a heat ray on the circle softens the
  star; Saucers and Beam Down reach the hills before the stars fall.
- **Hint:** "Hurt or move a chanter and the star hits softer."
- **Map:** Lakes 16. Red Dust and its dish in the middle; three cult camps on
  hills around it; the Rift to the north; Millford's Rangers to the south.
- **Closing:** "The last star falls short. Captain Quaxx calls her crew
  together and asks who wants to go home. Nobody raises a hand. 'Then we
  stay,' she says, 'and it does not happen twice.' The Martians send the date
  of the Long Night and a copy of the orrery's star-chart to the Pact, by
  the Crown's courier, a helpful clerk named Pettigrew."

### 3.7 Ice Folk: The Long Winter

#### I1. The Warm Mountain

> Rime Camp's glacier is melting from underneath, and in the warm caves
> below it a goblin gang calling itself the Frostbite Boys has moved in with
> a stove. The Ice Folk do not object to goblins. They object to stoves. Put
> the stove out, and the goblins with it. Chief Gnash of Whitefang, beaten
> by everybody this year and out of work, is watching from the ridge to see
> how it is done.

- **Seats:** you, Ice Folk (Rime Camp; the tagged Ice Witch `RIME`); enemy,
  Goblins (the Frostbite Boys: two cave camps, `NORMAL`).
- **Format:** Conquest (`DOMINATION`). **Stars:** by turn 12; Rime lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Ice Folk basics: freeze first, then strike. A
  Frozen unit cannot act; Yetis walk over mountains; Snow under the Ice
  Witch makes her neighbours harder to shoot.
- **Hint:** "Frozen enemies can't act: freeze first, then strike."
- **Map:** Dry Land 11, Highlands. Rime Camp on the glacier in the north;
  the warm caves, two camps, in a valley below.
- **Closing:** "The stove is out. Chief Gnash comes down from the ridge,
  bows to Mother Rime, and asks to come home. The Whitefang are Ice Folk
  again."

#### I2. Waking the Giants

> Long ago, say the Ice Folk, the world burned and then froze, and the
> giants of the frost walked out of the cold to put a hungry star to bed.
> They sleep now in the Glacier Tomb, and the Frozen Abbot, a monk who
> wandered into the ice three hundred years ago and has been praying to the
> wrong thing ever since, has raised his dead to keep them asleep. Destroy
> the Abbot. The first giant wakes on the tenth day whether he is gone or
> not, and it wakes hungry.

- **Seats:** you, Ice Folk (Rime Camp and Whitefang; `RIME`); enemy, Undead
  (the Abbot's ice-bound dead: the Glacier Tomb, a walled town, the tagged
  Lich `ABBOT`, `GUARD`, Skeletons on the ice fields).
- **Format:** Hunt (`KILL` `ABBOT`, `byRound` 20). **Stars:** by turn 15;
  lose no city.
- **Difficulty:** 2 of 6.
- **Tactical problem:** a Lich behind walls that outranges your line. On
  the tenth turn a Frost Giant joins you beside the tomb; a giant's blow
  shatters a badly hurt Frozen enemy, so the plan is to wear down and
  freeze the Abbot's guard before the tenth turn and let the giant smash it.
- **Hint:** "A Frost Giant joins you on turn 10: freeze, then smash."
- **Map:** Dry Land 14, Highlands. Rime Camp and Whitefang in the south;
  ice fields; the Glacier Tomb in a cirque in the north.
- **Mechanics:** a player wave on turn 10, one Frost Giant (existing), with
  a story line ("The glacier cracks. Something enormous yawns.") **(E4,
  optional)**.
- **Closing:** "The Abbot shatters, and the giant walks out of the glacier
  yawning. He remembers the hungry star. It sleeps, he says, under the
  Hollow Mountain, and it is warm."

#### I3. The Frozen Strait

> The shortest road from the peaks to the Hollow Mountain crosses the Grey
> Strait, and the dwarves of Anvil Bay patrol it with ironclads. They saw the
> first floes coming and decided it was an invasion. It is, a little. Freeze
> a road across the strait and take Anvil Bay before the dwarves can break
> it. The Ice Folk need no ships: they walk on the sea they freeze.

- **Seats:** you, Ice Folk (Coldharbour on the northern shore; Rime and Pack
  Ice known); enemy, Dwarves (the Anvil Bay iron fleet: Anvil Bay, walled,
  with a Shipyard; Steam Launches, an Ironclad, a Diving Bell; `GUARD` the
  harbour with `others` `RUSH` the ice).
- **Format:** Capture, ice (`CAPTURE` `ANVIL_BAY`, `byRound` 22). **Stars:**
  by turn 18; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** build a road and hold it. Any ship that is not Ice
  Folk can break the ice beside it back into water, unless a unit stands on
  it; so the road advances under guard, and Black Ice and Icebound deal with
  the ships that come to break it.
- **Hint:** "Ice with a unit on it can't be broken: hold your road."
- **Map:** Continents 16. The northern shore with Coldharbour; the Grey
  Strait, shallow at the edges and deep in the middle; the southern shore
  with Anvil Bay.
- **Closing:** "Anvil Bay surrenders with a dwarvish oath and a pot of tea.
  Thane Ironbraid sends word: the Ice Folk may pass, and may she please have
  her harbour back after the Long Night."

#### I4. A Year Without Summer

> Winter is coming down off the mountains three months early, and the
> lowlands are not grateful. The Crown's Harvest Wardens are riding out to
> burn the snow-shrines, and Sugarcrest, whose people crack in a frost, has
> marched to stop the snowline at the river. Rime does not want to fight
> them. She has no choice. Hold the Snow Line for sixteen days, until the
> winter has settled into the valleys and cannot be pushed back.

- **Seats:** you, Ice Folk (two Snow Line towns on the river; `RIME`);
  enemies, Humans (the Crown's Harvest Wardens, not Steele's Rangers: a camp
  in the south, `RUSH`) and Candy (Sugarcrest's frost-march: a field camp in
  the east, `ASSAULT` the nearer town), teamed.
- **Format:** Hold out (`SURVIVE` 16, `protect` both towns). **Stars:** lose
  no city; Rime lives.
- **Difficulty:** 4 of 6.
- **Tactical problem:** two fronts and two very different enemies. Rushed
  sweets come fast and hit hard, then Crash and cannot attack on their next
  turn, which is the moment to push them back; the Wardens' Knights
  Overrun anything left alone in the open.
- **Hint:** "A Crashed sweet cannot attack on its next turn."
- **Map:** Lakes 16, Plains. A river with three fords across the middle; the
  Snow Line towns on its north bank; the Wardens' camp in the south,
  Sugarcrest's column in the east.
- **Closing:** "The snow settles. Under a white flag Queen Praline and Mother
  Rime meet on the frozen river and sign the Frost Treaty: no frost on
  Sugarcrest, and Sugarcrest's soldiers beside the Ice Folk until the Long
  Night is over."

#### I5. The Ember Lodge

> The Grey Lodge knows what cold does to the thing it worships, and it has
> found the answer every cult finds sooner or later: a bonfire. At the Ember
> Lodge on the mountain's shoulder burns a fire that has not gone out in
> three hundred years, and the Redcaps feed it with every tree for miles.
> While it burns, the mountain stays warm. Take the Ember Lodge and put the
> fire out.

- **Seats:** you, Ice Folk (a camp on the snowfields; Frost Giants
  available from level 5 cities); enemies, Cult (the Grey Lodge: the Ember
  Lodge, walled, level 4, `GUARD`, with a Gibbering Mass on its doorstep) and
  Goblins (the Redcaps: charcoal camps in the forest below, `RUSH`),
  teamed.
- **Format:** Capture against the clock (`CAPTURE` `EMBER_LODGE`, `byRound`
  22). **Stars:** by turn 18; lose no city.
- **Difficulty:** 5 of 6.
- **Tactical problem:** a walled temple with a daemon on the step and a
  goblin horde in the woods. Freeze the line, then let a Frost Giant's blow
  shatter a badly hurt Frozen enemy and freeze the ones beside it.
- **Hint:** "A giant's blow shatters a badly hurt Frozen enemy."
- **Map:** Dry Land 16, Highlands. The Ember Lodge on a shoulder of the
  Hollow Mountain; forests and charcoal camps below; your snowfield camp in
  the north.
- **Closing:** "The fire goes out with a hiss they hear in Kingsport. The
  mountain cools. Now the winter needs a heart, set on the summit, and Rime
  must carry it there herself."

#### I6. The Winter Crown

> The Heart of Winter is a stone of ice older than the mountain, and it must
> be set on the summit before the Long Night. Mother Rime will carry it. The
> Grey Lodge and the dead of the summit will try to stop her, because they
> understand exactly what it is for. Thane Ironbraid's dwarves hold the road
> past the Deep Gate and will fight beside you. Bring Rime to the summit.

- **Seats:** you, Ice Folk (Rime Camp, Whitefang and the Ember Lodge;
  `RIME`); enemies, Cult (the Grey Lodge: camps on the eastern slopes,
  `HOLD` the slopes beside the road, an ambush that strikes whatever
  passes) and Undead (the Unquiet: waves from the barrows on the western
  slopes on turns 6, 10 and 14), teamed; ally, Dwarves (the Deep Gate,
  `HOLD` its land).
- **Format:** Escort (`ESCORT` `RIME` to `SUMMIT`, `within` 0, `byRound`
  24). **Stars:** by turn 20; lose no city.
- **Difficulty:** 6 of 6.
- **Tactical problem:** walk a frail witch up a long climb under attack from
  both sides. A Musk Ox freezes whoever hits it from the next tile and
  lives, so Oxen on the flanks make the road expensive; a Mammoth sweeps the
  sides of its target; Rime's Cold Snap freezes every enemy beside her.
- **Hint:** "Musk Oxen freeze whoever strikes them up close."
- **Map:** Dry Land 20, Highlands. The long climb from Rime Camp in the
  north-west across the snowfields, past the Deep Gate (allied: no unit
  may enter an ally's land, so the road skirts its walls), to the summit in
  the centre: the Lodge's ruins, empty since the Rangers came down
  for the winter, a village landmark.
- **Closing:** "On the summit Rime sets the Heart of Winter in the snow and
  lays her hands on it, and does not take them away. By morning she is ice
  to the elbows, by evening to the crown. 'Someone has to stay with it,' she
  said, before she couldn't."

### 3.8 Candy: Sweet Dreams

#### C1. Sweet Tooth

> By royal proclamation: Gumdrop is being eaten. A goblin gang from
> Sourmash, the Sweet-tooth Boys, has discovered that the walls of Gumdrop
> are made of nougat, and they have brought spoons. Queen Praline has
> declared war, sharpened her candy cane and asked for volunteers. Everyone
> volunteered. Drive them out.

- **Seats:** you, Candy (Sugarcrest and Gumdrop; the tagged Gingerbread
  Giant `PRALINE`); enemy, Goblins (the Sweet-tooth Boys: a camp under
  Gumdrop's walls and a raiders' camp in the hills, `RUSH`; Sourmash
  itself stays off the board, for C6).
- **Format:** Conquest (`DOMINATION`). **Stars:** by turn 12; Praline lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Candy basics. Sugar Rush before a move sends a
  sweet farther and harder, then it Crashes for a turn; a fallen sweet
  leaves Crumbs, and a Confectioner bakes it back from them.
- **Hint:** "Rush, strike, then guard the Crashed until it wakes."
- **Map:** Lakes 11. Sugarcrest and Gumdrop on the lake shore; the
  raiders' camp in the hills to the east, on the road from Sourmash.
- **Closing:** "The goblins flee with their spoons. In the ruins of the
  pantry Madame Nougat finds something worse than goblins: the nougat is
  stale. All of it. All over the kingdom."

#### C2. The Royal Recipe Book

> The oldest recipe in the kingdom, the one every Confectioner learns first
> and nobody has read to the end, is kept in the Royal Library at Riftwatch,
> on the edge of the crack Sugarcrest fell out of. Madame Nougat must read it
> before the library goes stale too. Unfortunately a family of dinosaurs
> that ran away from a circus has nested in the stacks, and they have been
> eating the books. Take the library before they reach the R's.

- **Seats:** you, Candy (Sugarcrest and Gumdrop; the tagged Confectioner
  `NOUGAT`); enemy, Dinosaurs (Kessler's runaway menagerie: Riftwatch and a
  nest in the woods, Eggs that hatch, `NORMAL`).
- **Format:** Capture against the clock (`CAPTURE` `RIFTWATCH`, `byRound`
  20). **Stars:** by turn 16; Nougat lives.
- **Difficulty:** 2 of 6.
- **Tactical problem:** big bodies that grow with every kill. Feed them
  nothing: a Marshmallow line holds them, a splatted beast cannot hit back
  for the rest of the turn, so the Toffee Troopers strike it then; and the
  nest must fall before its eggs hatch.
- **Hint:** "Every kill makes a dinosaur bigger: don't feed them."
- **Map:** Lakes 14 with a Rift. Riftwatch on the edge of the crack in the
  north; Sugarcrest and Gumdrop on the lake in the south; the nest in the
  woods between.
- **Closing:** "The recipe is not a recipe. It is a description, in very old
  icing, of a great sleeper, and a dream it once had of a kingdom made of
  sugar. Madame Nougat sits down very suddenly."

#### C3. The Commissioner

> The Crown has noticed Sugarcrest. A Royal Commissioner for Confectionery
> has sailed onto the lake with a warrant, three warships and a contract:
> the Crown's protection, in return for the services of the Sugarcrest choir
> on a date to be confirmed. The Commissioner is a mild little man in grey
> who smells faintly of candle wax. Praline has torn up the contract and
> eaten it. Sink his flagship and send him home wet.

- **Seats:** you, Candy (Sugarcrest and Gumdrop, ports; the Candy naval
  branch's first technologies); enemy, Humans (the Crown's lake squadron: an
  island fort at the lake's outflow, Patrol Boats, a Submarine and the
  tagged Battleship `SOVEREIGN`; the fort `GUARD`s the outflow and the
  ships keep to it **(E7)**).
- **Format:** Hunt, naval (`KILL` `SOVEREIGN`, `byRound` 22). **Stars:** by
  turn 18; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** a Battleship that outranges everything on the lake.
  A Rushed Gumdrop Tug rams harder, then Crashes and cannot attack for a
  turn; a ship hit by a Pie
  Galleon's pie cannot hit back for the rest of the turn; a Choco Sub
  torpedoes without reply. Strike together, then pull the Crashed boats
  back.
- **Hint:** "A Rushed Tug rams harder, then sits a turn out."
- **Map:** Lakes 16. The great lake with Sugarcrest and Gumdrop on its shore;
  the Crown's island fort at the outflow in the south.
- **Mechanics:** a tagged ship as the target **(E6, verify)**; a squadron
  that keeps to its post **(E7)**.
- **Closing:** "The Sovereign goes down. The Commissioner rows ashore, bows,
  and says it is no matter: the choir will sing on the date regardless. He
  seems very sure. Praline sets her Confectioners to finding out what the
  date is."

#### C4. Sour Notes

> Someone has stolen the Sugarcrest choir: forty sopranos, a bass made of
> liquorice, and the conductor's baton. The trail of sugar leads to the Wick
> Chapel in the hills, where men in grey hoods have locked them in the crypt
> and are arguing about what to do with them. Get the choir back before the
> hoods stop arguing.

- **Seats:** you, Candy (Sugarcrest and Gumdrop; `PRALINE`); enemy, Cult
  (the Candlewick brethren: the Wick Chapel, walled, and a hill camp;
  Summoners with Horrors and Imps, Hexers, Idol Bearers; `GUARD`, waves of
  brethren on turns 8 and 12).
- **Format:** Capture against the clock (`CAPTURE` `WICK_CHAPEL`, `byRound`
  20). **Stars:** by turn 16; Praline lives.
- **Difficulty:** 4 of 6.
- **Tactical problem:** a first fight against daemons. A Horror's Boo!
  makes every unit beside it jump a tile away, which breaks a line; Imps
  swarm. Keep a second rank behind the first, and go for the robed men who
  hold the daemons.
- **Hint:** "A Horror's Boo! scatters your line: keep a second rank."
- **Map:** Dry Land 14, Woodland. Sugarcrest's road in the south; wooded
  hills; the Wick Chapel on a hilltop in the north.
- **Closing:** "The choir comes home singing. The hoods, it turns out, could
  not agree whether to silence it or to teach it a new hymn, and a letter on
  the chapel desk tells them, in a small, tidy hand, that they should have
  done neither."

#### C5. The Dream Door

> Madame Nougat has finished the recipe. Sugarcrest is a dream, dreamed by a
> sleeper under a mountain, and the dream is going sour because the sleeper
> is having nightmares. Praline means to go into the dream and see for
> herself. The Martians have found a door: a pair of gates in the hills, one
> on each side of the Rift. Walk her through, and through the nightmare on
> the other side, to the Dreaming Palace.

- **Seats:** you, Candy (Sugarcrest and Riftwatch on this side; `PRALINE`,
  `NOUGAT`); enemy, Undead (the nightmares: the dream side is a grey
  Sugarcrest, its towns held by the dead, `NORMAL`, waves on turns 6, 10 and
  14).
- **Format:** Escort (`ESCORT` `PRALINE` to `DREAMING_PALACE`, `within` 1,
  `byRound` 24). **Stars:** by turn 20; Nougat lives.
- **Difficulty:** 5 of 6.
- **Tactical problem:** two halves of a board joined only by the gates, and
  a far half where the enemy is everywhere. Hold the gate on the far side
  first, then move the Queen; Gingerbread Men from her own crust guard her
  flanks.
- **Hint:** "Step on a gate and you come out of the other one."
- **Map:** Lakes 20. A Rift band and water split the board; our side in the
  south with Sugarcrest; the dream side in the north, a stale grey mirror of
  it, with the Dreaming Palace at its heart; a pair of Dimensional Gates.
- **Mechanics:** Dimensional Gates **(E1)**.
- **Closing:** "In the Dreaming Palace Praline finds the sleeper's dream of
  her own throne room, grey and crumbling, and outside its window, the eye.
  It is closed again, almost. 'It needs a lullaby,' she says, 'and a sweeter
  voice than the dead have got.'"

#### C6. Sweet Dreams

> The Long Night is weeks away and the nightmares know it. The seam of the
> Rift has split, and they are pouring through it toward Sugarcrest, the
> last sweet thing they have not soured; Mother Rime's winter, by treaty,
> stops at the lake shore, but the Sweet-tooth Boys have come back with
> friends to help themselves while the walls are busy. Hold Sugarcrest and keep the choir
> singing. The Ashen Marquis is on his way with the Lullaby, and the
> Martians, who have stood on these walls before, are standing on them
> again.

- **Seats:** you, Candy (Sugarcrest, Gumdrop and Riftwatch; `PRALINE`);
  enemies, Undead (the nightmares: camps beside the Rift, `ASSAULT`
  Sugarcrest, waves on turns 5, 9, 13 and 16) and Goblins (the Sweet-tooth
  horde: Sourmash and Spitewood, `RUSH` from turn 4), teamed; ally,
  Martians (Red Dust, `HOLD` their land).
- **Format:** Hold out (`SURVIVE` 18, `protect` Sugarcrest). **Stars:**
  Praline lives; lose no city.
- **Difficulty:** 6 of 6.
- **Tactical problem:** a long siege on two fronts. A Confectioner bakes
  fallen sweets back from their Crumbs, so a line that dies near her comes
  back; a Jawbreaker is Rock Hard; the Gingerbread Giant breaks into
  Gingerbread Men when the walls need bodies.
- **Hint:** "A Confectioner bakes fallen sweets back from Crumbs."
- **Map:** Lakes 16. Sugarcrest and Gumdrop on the lake; Red Dust (ally)
  across the water; the Rift to the north, where the nightmares spill out;
  Sourmash and Spitewood in the east.
- **Closing:** "On the eighteenth night the Marquis arrives, bows to the
  Queen, and unrolls the Lullaby on her piano. The choir sings it through
  once. It is beautiful, and it puts every nightmare for a mile to sleep.
  Only Praline frowns, at one note near the end. 'It tastes sour,' she says.
  The Marquis assures her it is in his own hand."

### 3.9 The Cultists: The Long Night

#### CU1. Minutes of the Last Meeting

> Minutes of the spring meeting of the Grey Lodge, Greyhood. Present:
> Brother Mallory (Hierophant), eleven brethren, Mr. Pettigrew (minutes,
> on his afternoon off from the Marshal's office). Item one:
> Sergeant Hobb of the Rangers observed the meeting from a hedge and is
> riding for Northwatch. Item two: Sergeant Hobb is not to reach Northwatch.
> Item three: refreshments.

- **Seats:** you, Cult (Greyhood, level 2; the tagged Initiate `PETTIGREW`,
  a Summoner, a Familiar, a Hexer, a little Favour; Familiars known);
  enemy, Humans (a Ranger patrol: a camp at the marsh road and the tagged
  Raider `HOBB` on the south road; `GUARD` the south road with a garrison
  of one, which is Hobb, who starts on it, and from turn 4 `others`
  `ASSAULT` Greyhood).
- **Format:** Hunt (`KILL` `HOBB`, `byRound` 10: on the tenth day he is in
  Northwatch). **Stars:** by turn 8; Pettigrew lives.
- **Difficulty:** 1 of 6.
- **Tactical problem:** the Cult basics. Favour buys daemons, and a daemon
  must be channelled by robed cultists every turn or it breaks loose. Hobb
  is a fast rider; a Familiar can swap places with him from four tiles away
  and drop him among your cultists.
- **Hint:** "A Familiar swaps places with a unit up to 4 tiles away."
- **Map:** Dry Land 11, Woodland. Greyhood in the marsh in the north; hedges
  and lanes; the road south toward Northwatch, which runs off the board.
- **Closing:** "Sergeant Hobb was lost in the marsh. Marshal Steele signs
  the letter to his mother that Mr. Pettigrew drafted for her. It is a very
  kind letter."

#### CU2. One Wrong Note

> Item one: Brother Mallory is dead, and the Lodge has elected a new
> Hierophant, Mr. Pettigrew, by a show of hands (one hand). Item two: the
> Ashen Marquis has found a Lullaby that would put the Guest back to sleep.
> Item three: the Lodge will not burn it. The Lodge will borrow it from the
> Marquis's archive at Cinderfield, change one note, and put it back exactly
> where it was. Item four: the Marquis is to believe we came for the
> silver.

- **Seats:** you, Cult (Greyhood and a hidden camp; the tagged Summoner
  `PETTIGREW`; Gibbering Masses known); enemy, Undead (the Marquis's archive guard: Cinderfield,
  walled, and a barrow camp; Skeletons, Zombies, a Banshee; `GUARD`).
- **Format:** Capture against the clock (`CAPTURE` `CINDERFIELD`, `byRound`
  18). **Stars:** by turn 15; lose no city.
- **Difficulty:** 2 of 6.
- **Tactical problem:** an enemy that cannot be frightened. Skeletons
  defend well against shots, and the dead rise again from Graves; Horrors
  and a Gibbering Mass do the close work while the robed men stay back.
- **Hint:** "Skeletons shrug off shots: send a Horror in."
- **Map:** Dry Land 14, Plains. Greyhood's marsh in the east; the
  Barrowlands with Graves; Cinderfield's archive-town in the west.
- **Closing:** "One note in the Lullaby is changed, in a hand so like the
  Marquis's that he will never know. In the same drawer Mr. Pettigrew finds
  a torn page, filed by Doctor Crane, in the Founder's own hand. He files it
  in his pocket, unread, for later. Mr. Pettigrew always files things for
  later."

#### CU3. Old Blood

> Item one: the Grey Book says that when the Guest wakes, the first thing
> up the shaft will be its Herald, and a Herald is paid for in old blood.
> Item two: the oldest blood in the world is a dinosaur egg. Item three: the
> brethren at Greyhood were overrun by dinosaurs, and only one egg got away,
> aboard the Galleon of the Eye. Item four: the Galleon must sail up the
> coast of the Lost Sea to Lamplight Cove, under the mountain, past the
> sea-beasts and the Martian skimmers. Item five: it is not to sink.

- **Seats:** you, Cult (a fishing hamlet at the marsh mouth and Lamplight
  Cove, ports; the Cult naval branch; the tagged Galleon of the Eye
  `GALLEON`); enemies, Dinosaurs (the island's tribes, come after the egg:
  Dugouts, Plesiosaurs, a War Raft, from island villages, hunting the
  Galleon's lane **(E7)**) and Martians (Skimmers out of Ray Hollow,
  `NORMAL`), teamed.
- **Format:** Escort, naval (`ESCORT` `GALLEON` to `LAMPLIGHT_COVE`,
  `within` 1, `byRound` 20). **Stars:** by turn 16; lose no city.
- **Difficulty:** 3 of 6.
- **Tactical problem:** a big ship through a sea of small killers. The
  Kraken holds any enemy ship beside it to one tile a turn, so it clears the
  lane ahead; what the Black Gondolas sink is an Offering that pays Favour.
- **Hint:** "Beside the Kraken, an enemy ship moves only one tile."
- **Map:** Archipelago 16. The marsh mouth in the south; a chain of
  islets along the coast in the middle; Lamplight Cove under the sea
  cliffs in the north, at the foot of the mountain.
- **Mechanics:** escort of a tagged ship **(E6, verify)**; a navy that
  hunts a lane **(E7)**.
- **Closing:** "The egg comes ashore at Lamplight Cove, warm and humming. Mr.
  Pettigrew has it put in a basket by the fire, and knits it a small cosy."

#### CU4. The Inspector Calls

> Item one: Mr. Pettigrew, lately the Crown's Commissioner for
> Confectionery, has been appointed the Crown's Inspector of Works, by
> himself, with a very good stamp. Item two: the Inspector will inspect the
> Great Seal at the Deep Gate with a survey team of twelve brethren with
> toolbags. Item three: the survey team will replace each of the Seal's
> bolts with a bolt of black wax. Item four: the dwarves will notice on the
> third day, and on the fourth the goblin who refused the Hierophant's gold
> for the clapper, now an honorary dwarf. Item five: hold the Seal-works
> until the last bolt is waxed.

- **Seats:** you, Cult (the Seal-works, a town over the Seal, taken at the
  start, and a hidden camp; `PETTIGREW`; Gibbering Masses known, Favour
  enough for a daemon or two); enemies, Dwarves (Copperstep and the Deep Gate: `NORMAL` until turn
  3, then `ASSAULT` the Seal-works) and Goblins (Grubnak's horde, Honorary
  Dwarves: a camp on the eastern road, `RUSH` from turn 4), teamed.
- **Format:** Hold out (`SURVIVE` 14, `protect` the Seal-works). **Stars:**
  lose no city; Pettigrew lives.
- **Difficulty:** 4 of 6.
- **Tactical problem:** hold a town against Steam Tanks and a goblin mob,
  with frail casters. A Gibbering Mass on or beside your city needs no
  strand to stay yours, so it can plug the gate while the cultists channel
  the rest; Idol Bearers halve the shots at whoever stands beside them.
- **Hint:** "A Gibbering Mass needs no strand on your doorstep."
- **Map:** Dry Land 16, Highlands. The Seal-works in a mountain bowl beside
  the Deep Gate; Copperstep below; the goblin road from the east.
- **Closing:** "The last bolt is wax by the fourteenth day, and the brethren
  slip away in the snow. The dwarves count every bolt twice and find them
  all present. Grubnak, scratching his head, swears that one of them smelled
  of candles."

#### CU5. Thaw

> Item one: Mother Rime has made herself into a crown of ice on the summit,
> and while she stands the mountain is cold and the Guest sleeps through any
> note. Item two: Sister Agatha Vole, formerly of the Millford Ladies'
> Academy, has offered to drop a star on her. Item three: the Ice Folk and
> their new friends from Sugarcrest guard the summit, so the Redcaps have
> been hired at the usual rate. Item four: a star needs a Stargazer,
> chanters, and one clear night.

- **Seats:** you, Cult (Hood Hollow, a hideout on the lower slope;
  `PETTIGREW` and the tagged Stargazer `VOLE`); enemies, Ice Folk (the
  summit guard: the frozen `RIME` on the summit, which she cannot leave,
  and camps on the snowfields, `GUARD` the summit) and Candy (the Frost
  Treaty's soldiers: a camp on the lower slope, `ASSAULT` Hood Hollow),
  teamed; ally, Goblins (the Redcaps, hired: a camp beside yours, `RUSH`).
- **Format:** Hunt (`KILL` `RIME`, `byRound` 20). **Stars:** by turn 16;
  Vole lives.
- **Difficulty:** 5 of 6.
- **Tactical problem:** reach a target at the top of a defended mountain
  with frail casters, against an enemy that freezes whatever comes close.
  A Stargazer's star needs no road, only a tile two to four tiles from her;
  every chanter who joins her makes it hit 3 harder, and every chanter hurt
  or moved drops out. The Redcaps are the shield; the circle is the sword.
- **Hint:** "Chanters beside a Stargazer make its star hit harder."
- **Map:** Dry Land 16, Highlands, snow. The summit with the Lodge's ruins
  and the Winter Crown in the north; the Ice Folk's camps on the snowfields;
  Sugarcrest's camp on the lower slope; Hood Hollow in the south.
- **Mechanics:** Rime frozen in her crown is a tagged Ice Witch that must
  not walk away: either a `GUARD` whose zone is the summit tile alone
  (existing, if the leash holds her), or a unit that never moves **(E2)**.
- **Closing:** "The star falls on the summit at midnight, and the Winter
  Crown breaks into a thousand pieces of hail. By morning the snow on the
  Hollow Mountain is melting. The Ice Folk carry the pieces down the
  mountain, and they say, as Ice Folk do, that Mother Rime will be back with
  the first snow."

#### CU6. The Long Night

> Item one: tonight is the Long Night. Item two: the Pact has gathered at
> the Deep Gate to ring the Lullaby: the Thane at the chain, the Marquis with
> the score, the Sugarcrest choir in the gallery, and Marshal Steele with
> every Ranger in the north. Item three: the Lullaby has a wrong note, the
> Seal has wax bolts, and the mountain is warm. Item four: when the Guest
> wakes, whoever holds the Deep Gate holds the leash of whatever comes up
> first; the Martians' star-chart, kindly lent, gives the hour to the
> minute. Item five: take the Deep Gate before dawn. Item six: Mr. Pettigrew
> has still not read the page in his pocket.

- **Seats:** you, Cult (Hood Hollow and the Seal-works' ruins, a large army
  with Summoners, Stargazers and Idol Bearers, The Stars Are Right known,
  starting Favour, the egg's worth; `PETTIGREW`); enemies, Dwarves (the Deep
  Gate, walled, level 4, `GUARD` with a large garrison), Humans (Steele's
  army: camps on the southern road, `RUSH` from turn 3, waves on turns 8
  and 14) and Undead (the Marquis's dead: camps over the western ridge,
  `NORMAL`, then `ASSAULT` Hood Hollow from turn 6), teamed. The Thane and
  the Marquis are at the bell, below, and never on the field.
- **Format:** Capture against the clock, multi-front (`CAPTURE`
  `DEEP_GATE`, `byRound` 24). **Stars:** by turn 20; Pettigrew lives (or,
  with **E3**, the Herald was summoned).
- **Difficulty:** 6 of 6.
- **Tactical problem:** the whole Pact, three armies, and a cult that is
  only as strong as its channellers. The Great Summoning needs The Stars Are
  Right, a Summoner, three chanters and 18 Favour; the Herald it brings
  ravages two targets a turn and ignores walls, but its Hunger eats 2 Favour
  a turn, and a broken strand turns it loose on its own side. Feed the
  Herald, guard the circle, and let it open the Deep Gate.
- **Hint:** "Three chanters, 18 Favour, The Stars Are Right: Herald."
- **Map:** Dry Land 20, Highlands. The Deep Gate on its shelf over the shaft
  in the north-centre; Copperstep and Ironbraid Hold on the lower slopes;
  the Rangers' road from the south; the Marquis's dead over the western
  ridge; Hood Hollow and the Seal-works in the east.
- **Mechanics:** four seats (existing); optional **E3** star; optional
  **E4** story lines on the Rangers' waves.
- **Closing (the saga's ending):** "At midnight the Marquis rings his
  Lullaby, note for note, and on the wrong note the Hollow Mountain opens
  its eye. The wax bolts melt. Up the Bottomless comes the Herald, first
  through every door, and Mr. Pettigrew, holding its strand, at last reads
  the page in his pocket: 'It eats the door first.' He looks at the Herald,
  and at the dark below it, and tells it to sit. It sits on the shaft. The
  thing in the deep cannot climb past its own doorman, and at dawn the stars
  turn and the window shuts for three hundred years."
- **Epilogue (the Cult campaign's outro):** "In the spring the Lodge of the
  Deep Gate sends its first invoices: to the Crown, the Thane, the Queen of
  Sugarcrest, the Warboss of the Hollow Hills and the Marshal of the
  Frontier. The Herald is hungry, the letters explain, and a hungry Herald
  may wander off its door. Everybody pays. The dead of the north lie down at
  last, the Ashen Marquis among them. The hooded ones no longer kneel to the
  winning side. Far below, under a bell with one wrong note, the eye that
  never blinks, blinks."

## 4. Mission-system extensions

Almost all 54 missions use only what the framework of
[CAMPAIGN.md section 10](CAMPAIGN.md#10-the-mission-framework) already has:
the five objective kinds with `byRound`, `protect` and two bonus goals;
teams and rival seats; reinforcement waves for any seat, the player's
included; directive schedules; pre-placed Graves and Eggs; tagged units
(with kills, for a unit that grows); starting Favour for a Cult seat; and
natural maps of sizes 11 to 20 with recorded edits. Six small extensions
are flagged in the entries (E1 to E4, E6, E7; E5, the campaign screen,
is done). None changes the rules of a
match that is not a mission; E1 and E2 add legal mission setups (a ruleset
identity bump for the bead that builds them, per
[CAMPAIGN.md section 2.4](CAMPAIGN.md#24-identity-saves-and-replays), when
it changes a rule; E1, built by `pulp_wars-hmyk.14`, changed none and kept
the identity: each mission that places curiosities is a new revision,
which an older build refuses); E3
is an objective change (also an identity bump); E4 is presentation only;
E6 is a check that may need nothing; E7 is AI only (directives sit outside
the state hash, so no bump).

| #   | Extension                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Needed by                                                          | Required?                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | **Mission curiosities.** A definition may list curiosities by kind and tile (`curiosities: [{ kind, at }]`); the builder places them instead of the empty list it writes today (`build.ts`). The generator's site rules (distances to capitals, villages and other curiosities, board size) do not apply to an authored tile; each kind's tile rules do (terrain, never a settlement centre, the Serpent's home on open Deep Water). A mission that places a round-3 kind turns that kind's rules on (missions otherwise run with round 3 off: no `ZAP`, no `FIRE_MOON_GUN`, no Serpent turn). Kinds used: the Sea Serpent, the Tesla Tower, the Moon Gun, a pair of Dimensional Gates. The Gates are built (round 2); the other three are designed ([curiosities round 3](RULESET_7_CURIOSITIES_ROUND_3.md), its beads A and B, `7r103` and `7r104`) and must be built first. **Built** (`pulp_wars-hmyk.14`, [CAMPAIGN.md section 10.9](CAMPAIGN.md#109-mission-curiosities-pulp_wars-hmyk14)): any kind may be placed, and H5 and H6 have theirs. | H5, DN3 (Sea Serpent); H6 (Tesla Tower); G4 (Moon Gun); C5 (Gates) | yes for G4 and C5, whose stories turn on them; the others play without (drop the line from the blurb)                                                                                          |
| E2  | **A unit that never moves.** A starting unit flag (`rooted: true`) under which the unit may act and attack but never move or be moved: Mother Rime frozen in the Winter Crown.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | CU5                                                                | only if a `GUARD` whose zone is her tile alone (garrison 1: she starts inside it, so she is the garrison) does not hold her in hand play                                                       |
| E3  | **A bonus goal for a summoning.** `MissionBonusGoalV7` gains `{ kind: "HERALD_SUMMONED" }`: seat 0 completed a Great Summoning during the match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | CU6                                                                | no: without it the star is "Pettigrew lives"                                                                                                                                                   |
| E4  | **A story line on a wave.** A reinforcement may carry a short `line` that the toast and the log show when it arrives ("The dead are here. They apologise for the delay."). Presentation only, outside the state hash. **Built** (`pulp_wars-hmyk.18`, [CAMPAIGN.md section 10.3](CAMPAIGN.md#103-reinforcements)): the reinforcement banner shows it, and a wave without one shows its faction's generic line for its side; a wave may also carry a heads-up (`announce`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | H4, G5, DN4, I2, CU6                                               | no: the hints can announce the waves instead, as in the prologue                                                                                                                               |
| E5  | **Nine chapters and the unlock graph.** Done by `pulp_wars-hmyk.3` ([CAMPAIGN.md section 14](CAMPAIGN.md#14-the-campaign-map-and-the-faction-campaigns-pulp_wars-hmyk3)): the registry, the tiers and the screen exist; each campaign bead fills in its entry's chapter, title and subtitle. Not a mission-system change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | every campaign                                                     | done                                                                                                                                                                                           |
| E6  | **Tagged ships and embarked escorts (verify).** A `KILL` target or an `ESCORT` unit that is a ship (the Golden Goose, Snapjaw, the Sovereign, the Anvil, the Galleon of the Eye), or a land unit that crosses the sea embarked (the Old Queen, the Core-Walker). Check that a tag resolves through embarking, that the builder seats a naval unit afloat, and that a starting sea beast may carry `kills` (Snapjaw); fix if not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | H5, G3, C3, D5, CU3 (ships); DN3, M3 (embarked)                    | yes, if the check finds a gap                                                                                                                                                                  |
| E7  | **Directives for ships.** The directives steer land and embarked units only (`src/ai/v7-directives.ts`): a `GUARD` garrison and a `HOLD` leash never hold a ship, and `RUSH` and `ASSAULT` never send one. Let a `GUARD` or `HOLD` zone drawn on water leash the seat's ships to it (a flagship at its anchorage, a squadron at its strait), and let `RUSH` and `ASSAULT` send them at the target. AI only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | H5, G3, C3, D5, CU3                                                | built for C3 (`pulp_wars-hmyk.11`): `ships: true` on a `HOLD` or `GUARD` ([CAMPAIGN.md section 2.5](CAMPAIGN.md#25-ai-directives)); hand play showed the Sovereign leaving its post in round 1 |

Not extensions, but every building bead should keep in mind: a campaign's
missions keep the prologue's conventions (every city named, landmarks named
in capitals, hints at most 60 characters, no coordinates); the mission IDs
follow the campaign (`HUMAN_1` to `HUMAN_6`, `UNDEAD_1`, ..., `CULT_6`); a
seat starts with the technologies its tactical problem names (Familiars for
a Switcheroo, Gibbering Masses for a Mass, Powder Kegs for a raft's
Kaboom); no unit may enter an ally's land, so an escort to an allied city
uses `within` 2 and a road past one skirts it; and the "Mechanics" a
mission lists as existing should still be confirmed by the hand play the
builder's guide requires.

## 5. Consistency review

The self-review of `pulp_wars-hmyk.1` (the independent review is
`pulp_wars-hmyk.2`). What was checked, and what was fixed.

**Against the prologue.** Every place the prologue names keeps its owner
(Lantern Hill and Gallows Cross are the Marquis's; Fort Bullion, Kessler's
Toll and Port Kessler the Baron's; Copperstep the dwarves'; Whitefang and
Coldharbour the Ice Folk's; Candlewick and Greyhood the towns that knelt;
Saucer Field and Red Dust the Martians'; Spitewood and Sourmash goblin
squats; Riftwatch a village on the Rift). Every closing line of the prologue
is kept true: the Marquis "did not choose to wake" (he chose three hundred
years ago, and forgot); the Thane's "nobody is ringing it" (the Lodge's
singing rang it from the summit); the bell "was calling a star down" (the
Martians); "someone here has been calling the stars"; the Rift "seals"
(Sugarcrest's nightmares seep through the seam; the Martians' gates make a
door); the hooded ones "kneel to the winning side, as they always have"
(and in the epilogue they no longer need to); "something that was called
has opened one eye". The prologue's unit conventions for its characters are
kept (the Thane an Engineer, Crane a Necromancer, the Old Queen a T-Rex,
Praline a Gingerbread Giant). Fixed in review: the Assizes were first placed
at Lantern Hill, a town of the Marquis's; they sit at Kingsbridge. The
Undead intro first said the Marquis's soldiers "stood with the living at
the Lodge", but in F10 the dead of Hollow Barrow marched for the Lodge; the
intro now says his dead marched for the living until the bell fell silent
(F5), and the dead of Hollow Barrow are the Unquiet, never his, which is
exactly what H1 says. Quaxx saluted the Dinosaurs' side in F8, not Steele.

**Timeline.** Every dependency runs forward in time (section 1.3).
Checked and fixed: Kessler must be on his island after H6, robbed in G4,
stealing eggs in DN1 and dead in DN4, so the Goblins' heist is set before
the Dinosaurs' campaign begins and the Baron crosses back to the mainland on
the ship that carries the eggs (DN2). Brother Mallory dies in U5 (spring),
so he is not named in the Humans campaign's later missions, and the Cult's
election follows in CU2 (summer). Greyhood falls in DN6, so the egg's
voyage in CU3 ends at a new harbour, Lamplight Cove, and Candlewick falls
in M5, so the brethren named after it work from the Wick Chapel in C4. The
Rangers hold the summit in spring (U6) and have come down by early winter
(I6), so the Winter Crown stands on empty ruins. The clapper is sold to the
Thane (G6) before the Seal goes down (D6), and the Seal before the Cult
waxes its bolts (CU4).

**Character fates.** Each character's fate in the cast table matches every
mission that mentions them: nobody dies twice or appears after death
(Kessler last in DN4; Mallory in U5; Thornbury in DN2; Hobb in CU1); Rime
is frozen in I6 and shattered in CU5, with the Ice Folk's "back with the
first snow" left open; the Marquis rests only in the epilogue. Fixed in
review: Chief Gnash is beaten three times in the year (H4, U6, D2), not
twice; the cast table no longer lists appearances a mission does not make.

**Geography.** Each mission's map sketch puts its places on the side of
the world that section 1.1 gives them (the Barrowlands north-west, the
Hollow Hills east, the Rift Lakes north-east, the island west, the
mountain north). The Lost Sea missions use Archipelago boards, the river
and strait missions Continents, the Rift Lakes Lakes, the mountain and
marsh land missions Dry Land or Pangea.

**Faction behaviour.** No seat repeats a faction within a mission, and no
campaign's own faction sits across the table (checked for all 54); the
renegades of section 0 explain every hostile seat of a faction that is
elsewhere a protagonist or an ally. The Ice Folk never field a ship (I3
crosses on ice). Every faction with a navy has a naval mission (H5, U3, G3,
D5, DN3, M3, C3, CU3). The Cultists are ordinary men in robes throughout;
the horror is the Sleeper, the daemons and the Herald. Every hint states a
rule as the glossary states it; fixed in review: a hint about a "glowing"
star became the prologue's "marked star", a Stegosaurus "stomp" that is not
its ability was removed, and the Splat's effect was stated as the rule has
it (the target cannot hit back that turn).

**Formats and difficulty.** Each campaign uses at least four of the six
formats, has its intro at step 1 and its finale at step 6, and grows from
an 11 board to a 16 or 20 board. The Rescue format appears once (U6); the
allied seat appears in ten missions (H4, U6, G6, D6, DN5, M4, M6, I6, C6,
CU5), twice as a pair of reciprocal favours (M4 and C6; H4 and U6).

## 6. Editor's review

The independent review of `pulp_wars-hmyk.2`, by an editor who did not
write the saga. Checked against the prologue (`src/campaign/chapter-1.ts`,
CAMPAIGN.md sections 2, 9, 10, 12 and 14), the current rules
(RULESET_7_CURRENT.md: rosters, themed navies, the frozen sea, the Cult),
the [curiosities round 3](RULESET_7_CURIOSITIES_ROUND_3.md) design, the
directive code (`src/ai/v7-directives.ts`) and the campaign registry
(`src/campaign/campaigns.ts`). The verdict: the spine holds. The nine
campaigns complement each other rather than retell one battle, every
reveal of section 1.6 is set up and paid, and every seat rule holds (no
mission seats one faction twice). 47 smaller faults were fixed in place.

**Rules a briefing misstated (12).** Fire Rafts never explode when sunk;
they Kaboom, and it is the Golden Goose, a Scrap Dreadnought, that blows
up (H5). An Alpha Plesiosaur cannot grow, so Snapjaw is now Big with two
kills, one kill from healing whole (G3). The Moon Gun fires once a turn
and its passenger lands spent, so "three goblins at once" became a drop
a turn timed with the assault (G4). A Steam Mole carries one rider (D3).
D5's hint said to lead with the Ironclads while its tactics led with the
Launches. A Tripod self-launches without Hover Pods; the Pods are for its
foot escort (M3). Force Fields work through a Shield Projector (M4). A
Crashed sweet still moves and strikes back, it only cannot attack (I4,
C3). "Save the walls for the giant" meant nothing (I2). Every Undead ship
has Drowned Crews, not only two (U3). A star needs no chanters; they only
add to it (CU5). Seats now start with the technology their lesson needs
(Familiars in CU1, Gibbering Masses in CU2 and CU4, Powder Kegs in G3).

**Missions the framework could not build as written (7).** `ASSAULT`
needs a city to march on; five seats were told to assault a road or a
lane (G6, D3, I6, CU1, CU3). The directives move land units only, so no
flagship could keep its post: that is the new **E7** (H5, G3, C3, D5,
CU3). No unit may enter an ally's land, so G6's escort to within 1 of the
allied Ironbraid Gate was impossible (now `within` 2) and I6's road
skirts the allied Deep Gate. CU1's fleeing Hobb was told to assault
Greyhood; he is now the one-unit garrison of the south road. E1 now says
that authored curiosity tiles skip the generator's site rules (H6's tower
stands three tiles before the Hall's gate) and that a mission placing a
round-3 kind must turn its rules on, which missions otherwise run
without. E5 was built by `pulp_wars-hmyk.3`.

**Continuity (13).** The Undead outro said the Lullaby could be sung
once only, on the Long Night, and then the choir sang it in C6; it is now
the bell on which it must be rung. The prologue's Brain Wave calls the Old
Queen "a young queen", so the saga no longer gives her a century: the
title is her line's, her clutch is her first, and the Pact learns from
"the oldest blood in the world". Towns taken in one mission came back
under their old owners: Spitewood and Sourmash (M1, then C1 and C6) and
Sourmash again (C1, then C6) are no longer on those boards, and Millford,
taken in M2, is handed back before the Rangers hold it in M6. Kessler was
a tagged unit the player could kill in H6, before G4 and DN4; he is off
the field until DN4, and the Marquis and the Thane are at the bell, not on
the field, in CU6 (a named-character convention is now in section 0).
CU1 called the spring meeting the Lodge's first, though hooded buyers and
Brother Mallory were already at work; it is the Grey Lodge's spring
meeting, and Mallory presides, which brings him into the Cult campaign
before his death in U5. G5's rafts came on turn 12 and again "on the
sixteenth night". Haddock's papers were on "the summer's" stars in one
place and "last autumn's" in another. D2's pass was closing with snow in
early summer. CU2 captured Cinderfield while ordering that "nobody is to
know"; now the Marquis is to believe the Lodge came for the silver. M3
fought Fernmaw, Oona's own town, a season before the Martians help the
Queen; the island's tribes are now a named seat kind, and the Martians'
help in DN5 is gratitude for the Overmind, not fear of the Queen's teeth.
H6's lightning tower stood on the roof in the blurb and beside the Hall
on the map.

**Geography (5).** Wreckers' Cove sat on the Hollow Hills' coast, the far
side of the land from the Lost Sea it sails across; it is on the Lost Sea
shore of Kessler's lands. Hollow Barrow was filed under the Marquis though
its dead "were never his" and H1 puts it by Northwatch; it is the
Frontier's. Lamplight Cove was across the Lost Sea, so the egg sailed away
from the mountain it was needed at; it is under the mountain's sea cliffs,
and CU3 sails up the coast. D5's estuary and G6's road now run the way
section 1.1 points them.

**Interlocking and the screen (8).** Reveal 5, the polite man in grey,
had no payoff in the Cult campaign; CU4's minutes now name the
Commissioner and the goblin who refused the gold, and CU6's the
star-chart. Reveal 2's Grey Book was in no Cult player text; CU3 now
quotes it. The unlock graph and the screen paragraph described a screen
with the prologue at the foot and the Cult on the right; the built screen
has the prologue on top and the Cult in the middle of the last row, and
the text now says so. Tier 2's reason sent the Pact's warning to the
Pact's own members. A prologue quote was wrong (F9 says the dead rise
"there too"). U2 now ties Crane's reading of the bell's score (F5) to his
hunt for a counter-score. The cast table missed appearances (Pettigrew in
G5 and G6, the Marquis in CU2, Mallory in CU1).

**Tone (2).** A typo ("Some one") and a confusing line in CU5 ("casters
who freeze when touched").

**Deliberately left.** Pettigrew's many offices (Steele's clerk, the
Crown's courier, the Commissioner, the self-made Inspector) are the joke,
not a hole. How the clapper's chain passes the Seal is left to pulp. The
two old serpents (H5, DN3) are two serpents. The world's compass is right
in section 1.1 and in the map sketches that name it; a board may still be
turned to suit its seed. Blurbs run longer than the prologue's three
sentences; each building bead trims to the card. The difficulty steps and
clocks are reasoned, not played: each campaign bead confirms them in hand
play (no simulations were run for this review).
