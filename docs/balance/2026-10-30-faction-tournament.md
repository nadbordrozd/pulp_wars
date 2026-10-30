# Faction strength tournament

Normal AI vs Normal AI, default skirmishes (Domination, no head start, curiosities on, quick-start board sizes; maps CONTINENTS, LAKES, PANGEA). 1080 1v1 games (every pairing, both seat orders) and 108 four-seat free-for-alls. Round caps 60 (1v1) and 90 (FFA); a capped game is decided by score and counted separately: 88 capped 1v1 (8%), 19 capped FFA (18%). Failed matches: 4. First-mover seat won 50% of decided 1v1 games.

## Headline

- Two outliers, seven in a band. Martians are clearly strongest (1v1 71% [65–77%], rating +145, best FFA average place 1.94) and the Cult is clearly weakest (1v1 23% [19–29%], rating −185, last in FFA at 3.17 and last place in 25 of 48 games). The other seven sit between −44 and +69 rating with overlapping intervals: roughly balanced as the AI plays them.
- Moving first does not matter: seat 0 won 50% [47–53%] of decided 1v1 games. Martians are the only faction with a visible seat gap (75% first, 68% second).
- Ice Folk look like an AI problem more than a weak faction: last-but-one in 1v1 (43%) yet second in FFA (2.24). Their 1v1 losses pile up on Continents, where they have no ships, use Freeze in only 17% of the turns it is offered, bank 49 Coins at End Turn on average (others 9–17) and account for 54 of the 88 capped 1v1 games (47 of them on Continents). They cannot reach the rival across water.
- The Cult looks both weak and under-used: it loses its capital around round 20 (others 25–30), takes 0.7 cities per game (others 1.2–1.9), its Initiates trade 1.2 kills for 8.4 losses per game, and it banks 25 Coins at End Turn (50 over its last five turns) while Offering (4% of offered turns), Sacrifice (6%), Boo! (0%) and Switcheroo (0%) go almost unused.
- Coins pile up on Continents for every faction (9–49 at End Turn against about 2 on Pangea): the AI struggles to turn Coins into reach across water, not only the Ice Folk.
- Four of 1,188 matches (0.3%) ended in an engine rejection of an AI-chosen command: three Ice Folk FREEZE and one Cult END_TURN, all INVALID_STATE. They are excluded from the results and are bug follow-ups, not balance findings.

## Ranking

| #   | Faction   | 1v1 rating [95%]  | 1v1 win rate [95%] | FFA avg place [95%] | FFA 1st |
| --- | --------- | ----------------- | ------------------ | ------------------- | ------- |
| 1   | Martians  | +145 [104, 191]   | 71% [65%, 77%]     | 1.94 [1.61, 2.26]   | 54%     |
| 2   | Candy     | +69 [31, 108]     | 60% [54%, 66%]     | 2.62 [2.30, 2.93]   | 21%     |
| 3   | Dwarves   | +47 [10, 91]      | 57% [51%, 63%]     | 2.33 [2.02, 2.63]   | 26%     |
| 4   | Dinosaurs | +19 [-20, 57]     | 53% [46%, 59%]     | 2.43 [2.10, 2.75]   | 28%     |
| 5   | Undead    | +1 [-42, 41]      | 50% [44%, 56%]     | 2.40 [2.05, 2.74]   | 33%     |
| 6   | Humans    | -21 [-61, 18]     | 47% [40%, 53%]     | 2.65 [2.38, 2.93]   | 13%     |
| 7   | Goblins   | -30 [-69, 8]      | 45% [39%, 52%]     | 2.73 [2.43, 3.03]   | 15%     |
| 8   | Ice Folk  | -44 [-84, -0]     | 43% [37%, 49%]     | 2.24 [1.95, 2.53]   | 26%     |
| 9   | Cult      | -185 [-238, -141] | 23% [19%, 29%]     | 3.17 [2.88, 3.45]   | 8%      |

## Per-faction read

- **Martians**: Looks strong, and genuinely so. Wins on every map (Lakes and Pangea 78–79%), best FFA record (1st in 26 of 48). Grunts score 13 kills per game against 4.4 losses behind their Shields, and the AI already uses Beam Down heavily (7.6 per game). Tractor Beam is used in 14% of the turns it is offered and Mind Control is almost never available; even so the faction is on top, so the strength is in the units, not the AI play.
- **Candy**: Looks somewhat strong in 1v1 (60%, +69) but only mid-table in FFA (2.62): a fast early faction that wins duels on small boards. Sugar Rush is used 12 times per game; Sugar Toss and Break Off are used in about a third to half of the turns they are offered. Banks 16 Coins on Continents. No clear AI-misuse signal.
- **Dwarves**: Slightly strong (57%, +47; FFA 2.33), best on Continents (69%) and weakest on Pangea (46%). AI follow-up: the Engineer's Barricade is offered in 14% of turns and built in 1% of them; Tunnel is used in 16% of offered turns; Whirligigs are trained (0.6 per game) but score almost no kills. Bomb Run is used heavily (7.6 per game, mostly by treasure Gyrocopters).
- **Dinosaurs**: Average (53%, +19; FFA 2.43). The T-Rex is rare (0.26 per game; Chivalry researched in 25% of games) and the Brontosaurus's Stomp is used in 17% of offered turns. Eggs and Cavemen carry the faction. No strong signal either way.
- **Undead**: Average (50%, +1; FFA 2.40). The AI uses its signature tools well: Wail in 88% and Raise Dead in 64% of the turns they are offered. Ghouls are rarely trained (0.3 per game) and die more than they kill; Swallow (the Abomination) is used in 7% of offered turns.
- **Humans**: Average to slightly weak (47%, −21; FFA 2.65, rarely first). Weak on Continents (36%), good on Pangea (59%), and banks 17 Coins at End Turn on Continents: the island maps hurt Humans most among the land factions. Captains are rarely trained (0.2 per game). No faction-specific command to under-use; the read is mild weakness on water maps.
- **Goblins**: Slightly weak but within noise (45%, −30; FFA 2.73). Kaboom is offered almost every turn and used in 7% of them (about 2 per game), which is plausible for a suicide blast; Goblin Toss is used in 18% of offered turns. Orc Warboss (0.4) and Scrap Buggy (0.36 per game) are rarely trained. Mild weakness, no single AI gap stands out.
- **Ice Folk**: AI misuses it, mainly over water. Weak in 1v1 (43%, −44) but strong in FFA (2.24, second best). The 1v1 deficit is concentrated in capped and stalled Continents games: Freeze is used in 17% of offered turns, Coins are banked (49 at End Turn on Continents), and 54 of 88 capped duels are Ice Folk. The Mammoth's Stampede is used in 4% of offered turns. Fix the AI's water crossing (Freeze bridges, ice routes) before touching Ice Folk numbers.
- **Cult**: Looks weak, and the AI also under-uses it. Last in both phases (1v1 23%, −185; FFA 3.17, last place in 25 of 48). Its capital falls around round 20, it banks 25 Coins at End Turn, Initiates die in droves (1.2 kills, 8.4 losses per game), and Offering, Sacrifice, Boo! and Switcheroo are offered but almost never chosen. Channel and Imp summons are used. Likely both: the AI needs a better Cult opening and Coin spending before the faction's numbers can be judged.

## Caveats

- Results describe the factions as the current Normal AI plays them. An ability the AI seldom chooses may be a policy gap or a correct choice; the cards point at candidates for AI work, not at weak mechanics.
- Units from treasure chests, city rewards and summons are not counted as trained (for example most Gyrocopters and Familiars arrive from treasure), but their kills and losses are.
- Four matches failed on engine rejections (1v1-0611 seed 7611 Lakes Cult v Goblin END_TURN; 1v1-0670 seed 7670 Continents Dinosaur v Ice Folk FREEZE; ffa-0075 seed 57075 and ffa-0090 seed 57090 Continents FREEZE) and are excluded. All tournament setups name every seat in humanSeats; whether that matters for the rejections is untested.
- Ratings come from 30 games per pairing; adjacent mid-table factions (Dinosaurs to Ice Folk) are not separable at this sample size.

## Data and rerun

Bead `pulp_wars-hblo`, ruleset `pulp-wars-poc-7r120`, seeds from 7000 (1v1)
and 57000 (FFA), 8 parallel jobs, about 97 minutes of wall clock. The
per-match JSON, `aggregate.json` and the full HTML report (ranking, head-to-head
heatmap, FFA placements, per-faction diagnostic cards) were written outside the
repository. Rerun after changes with:

```bash
npm run balance:faction-tournament -- --out <dir outside the repo> --games-per-pairing 30 --ffa-games 108 --max-rounds 60 --ffa-max-rounds 90 --jobs 8
```

See [the headless simulation notes](../architecture/HEADLESS_SIMULATION.md#faction-strength-tournament-pulp_wars-hblo).
