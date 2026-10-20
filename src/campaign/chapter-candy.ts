import type { CampaignChapterV7 } from "./chapter-1";

/**
 * The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`,
 * docs/product/SAGA.md sections 2.8 and 3.8): six missions of Queen
 * Praline's search for the reason Sugarcrest is going stale, from the
 * goblins eating Gumdrop to the night the Ashen Marquis brings the Lullaby.
 * Data only, in the shape of the prologue's chapter (`./chapter-1.ts`);
 * each mission's board, seats, objective and directives live in its engine
 * definition (`src/engine/v7/missions/candy-*.ts`).
 *
 * The briefings are the saga bible's royal proclamations, trimmed to the
 * card; the hints state the rules plainly and never name a tile coordinate.
 */
export const CHAPTER_CANDY_V7: CampaignChapterV7 = Object.freeze({
  id: "CANDY",
  number: 7,
  title: "Sweet Dreams",
  intro:
    "Sugarcrest fell out of a hole in the world last autumn and has been making the best of it. This autumn the best is going stale: the gumdrops are hard, the walls are crumbling, and something sour is seeping through the sealed Rift at night.",
  // Every mission seats you as the Candy (a fixed faction, no choice), so
  // the chapter unlocks nothing for the prologue's faction choices.
  startingFactions: Object.freeze([]),
  missions: Object.freeze([
    Object.freeze({
      missionId: "CANDY_1",
      number: 1,
      name: "Sweet Tooth",
      format: "CONQUEST",
      briefing:
        "By royal proclamation: Gumdrop is being eaten. A goblin gang from Sourmash, the Sweet-tooth Boys, has found out that the walls of Gumdrop are made of nougat, and they have brought spoons. Queen Praline has declared war, sharpened her candy cane and asked for volunteers. Everyone volunteered. Drive them out of both their camps.",
      objective: "Take both of the gang's camps.",
      hints: Object.freeze([
        "Rush, strike, then guard the Crashed until it wakes.",
        "Goblins gang up: never leave a sweet alone by two.",
        "A Confectioner bakes a fallen sweet back from Crumbs.",
      ]),
      closing:
        "The goblins flee with their spoons. In the ruins of the pantry Madame Nougat finds something worse than goblins: the nougat is stale. All of it. All over the kingdom.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        PRALINE: "Queen Praline",
      }),
    }),
    Object.freeze({
      missionId: "CANDY_2",
      number: 2,
      name: "The Royal Recipe Book",
      format: "CAPTURE",
      briefing:
        "The oldest recipe in the kingdom, the one every Confectioner learns first and nobody has read to the end, is kept in the Royal Library at Riftwatch, on the edge of the crack Sugarcrest fell out of. Madame Nougat must read it before it goes stale too. A family of dinosaurs that ran away from a circus has nested in the stacks, eating the books. Take the library before they reach the R's.",
      objective: "Take Riftwatch by turn 20.",
      hints: Object.freeze([
        "Every kill makes a dinosaur bigger: don't feed them.",
        "A Splatted beast can't hit back: strike it after the pie.",
        "Kill the Egg before it hatches, or take its Nest.",
      ]),
      closing:
        "The recipe is not a recipe. It is a description, in very old icing, of a great sleeper, and a dream it once had of a kingdom made of sugar. Madame Nougat sits down very suddenly.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        NOUGAT: "Madame Nougat",
        RIFTWATCH: "Riftwatch",
      }),
    }),
    Object.freeze({
      missionId: "CANDY_3",
      number: 3,
      name: "The Commissioner",
      format: "KILL",
      briefing:
        "The Crown has noticed Sugarcrest. A Royal Commissioner for Confectionery has sailed onto the lake with a warrant, a squadron and a contract: the Crown's protection, for the services of the Sugarcrest choir on a date to be confirmed. He is a mild little man in grey who smells faintly of candle wax. Praline has eaten the contract. Sink his flagship and send him home wet.",
      objective: "Sink the Sovereign by turn 18.",
      hints: Object.freeze([
        "A Rushed Tug rams harder, then sits a turn out.",
        "Wait out of the Sovereign's reach, then strike together.",
        "A Choco Sub's torpedo goes unanswered.",
      ]),
      closing:
        "The Sovereign goes down. The Commissioner rows ashore, bows, and says it is no matter: the choir will sing on the date regardless. He seems very sure. Praline sets her Confectioners to finding out what the date is.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        SOVEREIGN: "the Sovereign",
      }),
    }),
    Object.freeze({
      missionId: "CANDY_4",
      number: 4,
      name: "Sour Notes",
      format: "CAPTURE",
      briefing:
        "Someone has stolen the Sugarcrest choir: forty sopranos, a bass made of liquorice, and the conductor's baton. The trail of sugar leads to the Wick Chapel in the hills, where men in grey hoods have locked them in the crypt and are arguing about what to do with them. Get the choir back before the hoods stop arguing.",
      objective: "Take the Wick Chapel by turn 16.",
      hints: Object.freeze([
        "A Horror's Boo! scatters your line: keep a second rank.",
        "Splat a daemon, then hit it: it can't strike back.",
        "Kill the robed men who hold the daemons.",
      ]),
      closing:
        "The choir comes home singing. The hoods, it turns out, could not agree whether to silence it or to teach it a new hymn, and a letter on the chapel desk tells them, in a small, tidy hand, that they should have done neither.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        PRALINE: "Queen Praline",
        WICK_CHAPEL: "the Wick Chapel",
      }),
    }),
    Object.freeze({
      missionId: "CANDY_5",
      number: 5,
      name: "The Dream Door",
      format: "ESCORT",
      briefing:
        "Madame Nougat has finished the recipe. Sugarcrest is a dream, dreamed by a sleeper under a mountain, and the dream is going sour because the sleeper is having nightmares. Praline means to see for herself. The Martians have found a door: a pair of gates, one on each side of the strait. Walk her through, and through the nightmare on the other side, to the Dreaming Palace.",
      objective: "Walk Praline to the Palace by turn 20.",
      hints: Object.freeze([
        "Step on a gate and you come out of the other one.",
        "Hold the far gate before the Queen goes through.",
        "A Pie on our shore can shoot across the strait.",
      ]),
      closing:
        "In the Dreaming Palace Praline finds the sleeper's dream of her own throne room, grey and crumbling, and outside its window, the eye. It is closed again, almost. 'It needs a lullaby,' she says, 'and a sweeter voice than the dead have got.'",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        PRALINE: "Queen Praline",
        NOUGAT: "Madame Nougat",
        DREAMING_PALACE: "the Dreaming Palace",
      }),
    }),
    Object.freeze({
      missionId: "CANDY_6",
      number: 6,
      name: "Sweet Dreams",
      format: "SURVIVE",
      briefing:
        "The Long Night is weeks away and the nightmares know it. They pour out of the Rift toward Sugarcrest, the last sweet thing they have not soured, and the Sweet-tooth Boys are back with friends to help themselves while the walls are busy. Hold Sugarcrest and keep the choir singing. The Ashen Marquis is on his way with the Lullaby, and the Martians of Red Dust stand on their own walls again.",
      objective: "Hold Sugarcrest for 18 turns.",
      hints: Object.freeze([
        "A Confectioner bakes fallen sweets back from Crumbs.",
        "A city of level 5 gives a Gingerbread Giant.",
        "Pies on the walls Splat whatever comes near.",
      ]),
      closing:
        "On the eighteenth night the Marquis arrives and unrolls the Lullaby on the Queen's piano. The choir sings it once, and every nightmare for a mile sleeps. Only Praline frowns, at one note near the end. 'It tastes sour,' she says. The Marquis assures her it is in his own hand.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        PRALINE: "Queen Praline",
        SUGARCREST: "Sugarcrest",
      }),
    }),
  ]),
  outro:
    "Sugarcrest is a dream, and the dreamer must sleep sweetly. On the Long Night the Sugarcrest choir will sing the Marquis's Lullaby at the top of the Bottomless, the sweetest voices beside the saddest, and Queen Praline will be there, armed.",
});
