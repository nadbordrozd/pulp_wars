import { describe, expect, it } from "vitest";
import {
  MISSION_REGISTRY_V7,
  MissionBuildErrorV7,
  ORIGINAL_BASELINE_V5_TREE,
  FACTION_IDS_V7,
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  buildMissionStateV7,
  canonicalHash,
  canonicalJson,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  forbiddenTechnologiesV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  missionDefinitionV7,
  missionMatchSetupV7,
  missionSeatFactionsV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  randomState,
  runReplayV7,
  validateMatchSetupV7,
  validateMissionDefinitionV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";
import {
  STALE_MISSION_DIAGNOSTIC_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/v7";
import { expectInitialScoreLedgerV7 } from "../fixtures/v7-score-ledger";
import { browserSetupV7 } from "../fixtures/v7-builders";
import { NAVAL, testGrounds, groundsSetup } from "./ruleset-v7-missions.shared";

// Mission setups (`pulp_wars-68k.2`, docs/product/CAMPAIGN.md sections 2 and
// 7.2): the registry, the authored-map builder, the MISSION setup and
// UNKNOWN_MISSION, forbidden technologies (Dry Land unchanged), the pinned
// initial-state hash per mission revision, saves, replays, the stale-mission
// diagnostic, and the headless `--mission` flag.

/**
 * The pinned initial state of every registered mission revision and faction
 * choice. The hash leaves out the ruleset ID (an identity bump alone does
 * not change a mission), so a failure here means the built state changed:
 * a mission edit must bump that mission's `revision` and add its new pin
 * (old saves of the mission are then refused as stale); a rule or builder
 * change that alters a mission's state re-pins it (its identity bump
 * already invalidates saves).
 */
const PINNED_MISSION_HASHES: Readonly<Record<string, string>> = {
  // Re-pinned by map curiosities (`pulp_wars-737.2`): the setup's
  // `curiosities: false` and the empty `curiosities` list.
  "TEST_GROUNDS@1:ORIGINAL":
    "cdd43baf94ec2b7c8961a1b0732a381b281e6ea080ac79f91942c0eaf6b634aa",
  "TEST_GROUNDS@1:GOBLIN":
    "ed51a42b3e6e2a758ff872658f2184685002d92cbe761958ee4a1914dd91c9bc",
  // The AI-directive fixtures (`pulp_wars-68k.3`).
  "TEST_RUSH@1:ORIGINAL":
    "e441193ea8d2ba39b48b7e6bfe826898d8f9cf51722b2a9b890a3f17e271396c",
  "TEST_HOLD@1:ORIGINAL":
    "63f8feb4d5d7e1cb313b1c2bf4a09bee259ef73727773fdce351671ac4ed5925",
  "TEST_GUARD@1:ORIGINAL":
    "75569e71228d50c8bdf4977e655316676c8f0b626a657b8c6c00bf5cefc31a50",
  // The ASSAULT fixture (`pulp_wars-v642.5`).
  "TEST_ASSAULT@1:ORIGINAL":
    "b3ee5f70ccfbf71026f2b3be6ffd8949dc31326671618f3fa7f44ecafc7ad433",
  // A GUARD whose others assault (`pulp_wars-v642.10`).
  "TEST_GUARD_RAID@1:ORIGINAL":
    "e76f3f18fa2fc91c1af603b1effe78f374d1240cc3bca9ba1dd16c8d59f9b65e",
  // Chapter One (`pulp_wars-68k.4`).
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  "FRONTIER_1@3:ORIGINAL":
    "e31edbe9e71807d9d2af6b97eca0b8f8f34c5432fa71022ea9cfb0e886e29ce2",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  "FRONTIER_2@4:ORIGINAL":
    "ae50b8841ba0ad5b9e9cc54df3df67b50fc005ae5681594d29893fa9e9720cb7",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  // The danger pass (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_3@5:GOBLIN":
    "beeba28f5f8bd29b4df6bd5197f6ce78b681f8c6efeb086244fc612a4be76e0e",
  // Revision 2 (`pulp_wars-68k.6`): Sawmilling forbidden, two starting siege
  // units for you, a Skeleton in the Lich's place.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@6:ORIGINAL":
    "1a42d9e03cfd98b6742269c1d7be08e6730fba81b38a18fde2d1adca63537f76",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@6:GOBLIN":
    "80a724cbb22a73a8168f630c7246fcb307cbb8efe29df6ae6166c00899829ae6",
  // Missions 5 and 6 (`pulp_wars-v642.2`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // The danger pass (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_5@3:UNDEAD":
    "a67ceb2e9aad3a3cf0c797e86674b17eb6c5b95b7302dc4e65b4a83ee56b11f5",
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  "FRONTIER_6@2:DWARF":
    "068ff4950c6d5135c522b9702a9bd7a38205b8d0bc7519cdcbd7b1389d6975e2",
  // Missions 7 and 8 (`pulp_wars-v642.3`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_7@3:ICE_FOLK":
    "75201de1799d7aa763e360f8020a13dcf682e660cbe7d885b178aba20bbf2a29",
  // Mission 8 as a build-up (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_8@3:DINOSAUR":
    "a5f58a38b09118b18f395e377b5f542d0d7ad44b3a8037565b6458cc77e0e121",
  // Missions 9 and 10 (`pulp_wars-v642.4`); mission 9 with less
  // pre-research (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_9@3:MARTIAN":
    "1a31f9ca8bb14117a1bbbab42863f7dd4e004b7c8bb37d687748de5e7dcc3159",
  // Mission 10 replayed on the corrected Cult AI (`pulp_wars-v642.6`): revision 2.
  // The Cult redesign's roster (`pulp_wars-mch9.31`): revision 3 (the Chosen
  // and the Caller of the ring are an Idol Bearer, an Initiate, and a Hexer).
  // Its retune (`pulp_wars-mch9.46`): revision 4 (the lodge owns
  // Engineering and Gibbering Masses and starts with 8 Favour).
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_10@5:ORIGINAL":
    "f24c78997288b4f81b604f45d50f3a5dfd919c01bf01d6bc2bc0c39b3536f9c4",
  // The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`).
  "HUMAN_1@1:ORIGINAL":
    "ba75ade202d005fe8a6cd1db656371bf6404054dd8698435cc76acf92498a8a4",
  "HUMAN_2@1:ORIGINAL":
    "871e3f7498024c189f529ddb82925834f8fef4cd49150c5b1e79f73f0443e22a",
  "HUMAN_3@1:ORIGINAL":
    "66bdfcf29e63994de029611e0e7f351714a85ed3500a29fa5c15de48e4838eab",
  "HUMAN_4@1:ORIGINAL":
    "1271ca63142a0272dd7a402f47460d89028dd0f1b0ded04c8f49ed964af6f984",
  // Mission curiosities (`pulp_wars-hmyk.14`): revision 2 of each, the Sea
  // Serpent in H5 and the Tesla Tower in H6, and the hidden fixture.
  "TEST_CURIOSITIES@1:ORIGINAL":
    "9b6a41cf850a6551d45396582fe72045f56ce02f4c4b970b247e9afb71dac4d4",
  "TEST_CURIOSITIES@1:GOBLIN":
    "ed95462583b0f54b4a3ffd614617928995af2452bb4dc78049fc6bacf57d3a04",
  "HUMAN_5@2:ORIGINAL":
    "6278f634c5bf0b19aa3f9efeaa17db38051fdb372e5045841d4ec712485eb5d1",
  "HUMAN_6@2:ORIGINAL":
    "e4bf04b3bb6d110fde3d56746ccfacd5e0ffda9264a684bf60d223edcbad5de1",
  // The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`).
  "UNDEAD_1@1:UNDEAD":
    "ce571acb28e5b3c1bb4f0e4558600cc36f84e96f228462e8fa8ac5de36eae6e3",
  "UNDEAD_2@1:UNDEAD":
    "a91553831cc2562cf5e8d0a992541fce60fa15f33c88f664fad5151d0e2fba0c",
  "UNDEAD_3@1:UNDEAD":
    "56fbd754294b168f46dee6058362e29b0361e8638b47a7e0ca85db272a1fb080",
  "UNDEAD_4@1:UNDEAD":
    "1a6aa87a5ad364d20eed80105f855aad065230a54f608f2e1d0e22ac26b6ea2b",
  "UNDEAD_5@1:UNDEAD":
    "71462e1d05c7632b5b316ea653ecac47b1e16b6caddf95e37645695edd6d25f3",
  "UNDEAD_6@1:UNDEAD":
    "15b2622590f1bca7e807580a56ad4da9922813272e6623569e79183cf6a121f2",
  // The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`).
  "DINOSAUR_1@1:DINOSAUR":
    "0a7f9e870ebfbbaf8fe35864564811889142c42ffa85b858b99ddc8de02cf56f",
  "DINOSAUR_2@1:DINOSAUR":
    "6b424c29ef3cae703ae565e9c49fb9d3bd8f87041683054b9ede27b904870707",
  "DINOSAUR_3@1:DINOSAUR":
    "3ac154cc3a9602ac982c0a0c07a122e248c5d997f27d96bbb49654c55647f4a9",
  "DINOSAUR_4@1:DINOSAUR":
    "7a748c1c31972b3141e6197b013deca4d5003a3481f500fbf66392170e3388d7",
  "DINOSAUR_5@1:DINOSAUR":
    "4ee8d9e4fd568ebb2f21b7adb189d0fbe1b94a6fc14fe2222ad91e8f1f14a328",
  "DINOSAUR_6@1:DINOSAUR":
    "675bbd846d017ff0e1e00604c8f49be1eabf0333621b2c8ef06bd993ae1ea850",
  // The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`).
  "MARTIAN_1@1:MARTIAN":
    "2ea1bb3f1cb5f07e8217af2f9ab6fec80b1efdad1b9b2873b31b910405c47784",
  "MARTIAN_2@1:MARTIAN":
    "b321fc9d9e1d4e49e908188dc09103210107d1ed0e6b386677ac430d099cd079",
  "MARTIAN_3@1:MARTIAN":
    "a77b10a172dacd2ebcc10c2a6799b89e8ad8228729bcce7d2e1801874fdf8c35",
  "MARTIAN_4@1:MARTIAN":
    "5717d65020471f2dce8b42127f989fc6285eec9b00fc7ed475f7d17c56cbe1e0",
  "MARTIAN_5@1:MARTIAN":
    "b536a412d010aa5f7623a0d9c09dc9d293321785ebc9d299f33c83eadfe349da",
  "MARTIAN_6@1:MARTIAN":
    "e0f6a063d1ac167990766b10e41fae7f229a9767ba50e5b0fcce91c23f6f80b9",
  // The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`).
  "GOBLIN_1@1:GOBLIN":
    "adbd943983769a053f5f50ef6e85b44cf4fc483ea7db4bbf9a1adfd4001ff3e8",
  "GOBLIN_2@1:GOBLIN":
    "f854ac34f6fbb30fd7798a21b1854055d6638cfd6cf6a364965b121246b23d32",
  "GOBLIN_3@1:GOBLIN":
    "a9d191e3974dd964e22c9a13fe2ad7b21b858adc630f54a6eb184b93c4008038",
  "GOBLIN_4@1:GOBLIN":
    "a79f412c09dfa11a52432cbe6dd124701be3207c967e45add3817cccb93db82e",
  "GOBLIN_5@1:GOBLIN":
    "60f70023f2e507c80819feb1c14cee55e5e1689d33a77339ff0c32ad6de1e19b",
  "GOBLIN_6@1:GOBLIN":
    "c58d1b0a9c2535d7af4a13b4b6bae69fc4978eb9ff413e35a1099371bf7bdd9d",
  // The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`).
  "DWARF_1@1:DWARF":
    "a0bb401b2f20df29125b8a8d3c45d4a02ee6d418a03cf45ce258a19ea0417ebc",
  "DWARF_2@1:DWARF":
    "6280a5c8886887d513551d77652aa64121cf3bc09e9715d11d6adb1ee79f7dc9",
  "DWARF_3@1:DWARF":
    "f5fa4aa8411ff22ca2537e1314387011ec585beaa3d5f058b5bf33487fe524dc",
  "DWARF_4@1:DWARF":
    "1e2dcc20bd29b117e3c2f5b4bfc46433f8ac584906ee3d2b8e88a896f7d17b73",
  "DWARF_5@1:DWARF":
    "d2c993f3dfda0c3fd26d2b4d5257ea21b71d6cbb69d45d7e65c0e1e451bbdeb3",
  "DWARF_6@1:DWARF":
    "bf8032333567a3843bb24f8f1e55a0af551ed7c61c6e2ad88f9bd1eec2e2c83b",
  // The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`).
  "CANDY_1@1:CANDY":
    "a3ddb2e1bf2df1846e01de9906d794916de02cff821233681ac5300203bc4901",
  "CANDY_2@1:CANDY":
    "ff0f6c2bf6e6a9303297faf786102559eaaf1fa6417c1f0014cec1c43aa39e6d",
  "CANDY_3@1:CANDY":
    "0737a71b66e8394dc68cab578c749be1567dabdf417224318cb8fb1de463ba3c",
  "CANDY_4@1:CANDY":
    "2566eebbe46c96f1a086cd9de27b80cc50503663fa7b1da893e4c68706c6d25d",
  "CANDY_5@1:CANDY":
    "850817bce49333a8259db6c14a497c384633c97d25b2bb4df7feb53242dda886",
  "CANDY_6@1:CANDY":
    "5164de3b08e1bf09e94cb9e2848a75e80cc440ec45553c03f005189da2151142",
  // The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`).
  "ICE_FOLK_1@1:ICE_FOLK":
    "346894d9967db6e36e37dae510b72de902c8f9619c7a8d5abccca6388b5650a0",
  "ICE_FOLK_2@1:ICE_FOLK":
    "1ac048fce485763846252de9172cb0140ca1e0c1ff67b99f1bb5d2d7b82b5651",
  "ICE_FOLK_3@1:ICE_FOLK":
    "ca6f861718a57d2dee346c761df07b625c850add4142200ef71db4452d481def",
  "ICE_FOLK_4@1:ICE_FOLK":
    "2756ab0d9446281b7a1f675da092f67d0dd3fac9a6898187cc12e8e5429e9bb9",
  "ICE_FOLK_5@1:ICE_FOLK":
    "a04066ac2a5d7068ed1dc50c41540e0161d3162a1cb5c326d94f98929153f7d0",
  "ICE_FOLK_6@1:ICE_FOLK":
    "77447b956d8255c6d3ab5e3592250f924d1051487c8be06b963892aced3306c8",
  // The siege fixture of the Normal AI (`pulp_wars-68k.6`).
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  "TEST_NECK@2:ORIGINAL":
    "df0cdf7c6c70ded79dc9b66eb620466e8be7a26d43450971d0a409e3432de2a9",
  // The Human tuning labs (`pulp_wars-w49.3`, tuning 4).
  "LAB_SIEGE@1:ORIGINAL":
    "4dfd821eba726c3103d795c00fb6b02b8048e7904e1d216f4d26d9917a122466",
  // Tuning 5 (`pulp_wars-w49.4`): revision 2 of both, with Swordsmen.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BACKLINE@4:ORIGINAL":
    "3105aba428609ef16311fb83781ecc91de68710d3868f7239dae81bc65b6702e",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  "LAB_LATE@3:ORIGINAL":
    "4958183f0bda43d018200e40a4a83d21f1e1dfbc8d958f4c672e29a5d10f5d3f",
  // Tuning 6 (`pulp_wars-w49.6`): numbers against a prepared line, one
  // fixture per attacking faction (the player is Human in each).
  // Tuning 7 (`pulp_wars-w49.10`): revision 2 of the three. The capital
  // stands two tiles behind the line and holds a Land Grant, so the two
  // Field Defenses of the line are in its territory and count.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BREAKTHROUGH@4:ORIGINAL":
    "322711b7e290ee377c35703b67517ad8fe394d3e8e23f4535f9e7b3a39e3c61b",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BREAKTHROUGH_GOBLIN@4:ORIGINAL":
    "cb4655d4334cbb87d2e52015870aa0fe5c9c133324b449158af0dba84acb2336",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  // The Vampire and Banshee rework: its Vampires have 13 HP (was
  // ca37f19f26f491a4…: pulp_wars-ty6i).
  "LAB_BREAKTHROUGH_UNDEAD@4:ORIGINAL":
    "8bb2d7954234e6ffb0cb5bf4e07ca8fbec03cdecde89ff5dbd2a95347f7f0d99",
  // The Goblin pass (`pulp_wars-w49.12`): the Goblins for the hand player.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  "LAB_GOBLIN_MID@3:GOBLIN":
    "4e947229121bbd4710bde19d337b5633c1feffe60ecc59e722961123ac9b03e3",
  // The Undead pass (`pulp_wars-w49.13`): the Undead for the hand player.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // The Vampire and Banshee rework: its Vampires have 13 HP (was
  // 098b26f0cb6f516b…: pulp_wars-ty6i).
  "LAB_UNDEAD_MID@3:UNDEAD":
    "0cc3269f4c231bad3cdbe381d050a4892335074683edfd7fad9c71a81208f364",
  // The Martian pass (`pulp_wars-w49.14`): the Martians for the hand player.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  "LAB_MARTIAN_MID@3:MARTIAN":
    "efa38f717f336a86840ce1fc29a03a6feee435bea970f29c9bf3f9ab22b7e488",
  // The Dinosaur pass (`pulp_wars-w49.15`): the Dinosaurs for the hand
  // player.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  "LAB_DINOSAUR_MID@3:DINOSAUR":
    "2c1c6e42c2f3b305e7b5c97077c74a8cdb57227bd7ba36df9018be4e026eb3a3",
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the Ice Folk
  // roster in the same middle game, the hand player as the Ice Folk.
  // Ice Folk Freeze (`pulp_wars-w49.37`): revision 2.
  "LAB_ICE_FOLK_MID@2:ICE_FOLK":
    "b82c78fa2a4a0ac1ca7379830de53fe66a01c3ac5015bff340f1c14bc438772d",
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): the Dwarf roster in
  // the same middle game, the hand player as the Dwarves.
  "LAB_DWARF_MID@1:DWARF":
    "4b894f5fc0011e42932a7cb64442e2c01c44db227de74d34f68da6be9552ff46",
  // The Cult's tricks (`pulp_wars-mch9.8`): the Cult roster in the same
  // middle game, the hand player as the Cultists (its 12 Favour is in the
  // `cult` record, which the pins leave out and `expectedMissionCult`
  // checks). The Cult redesign's roster (`pulp_wars-mch9.31`): revision 2
  // (the Caller and the two Chosen are a Hexer, an Idol Bearer, and an
  // Initiate).
  "LAB_CULT_MID@2:CULT":
    "5314ea5794f60ad88ed98e7fbd59abc8cc9f173fcc902de0a4ecb6b53ff7f7a8",
  // The tutorial board (`pulp_wars-0yxy`): Humans against one Goblin seat.
  "TUTORIAL_1@1:ORIGINAL":
    "f8d36a0cd1ab6b2e351b45b3f2721d0b1cfab3b58728cbd5b7cd9b471bc3ecb1",
  // The objective fixtures (`pulp_wars-v642.1`): escort, survive, capture
  // with a deadline and an ally, and kill.
  "TEST_ESCORT@1:ORIGINAL":
    "0d59aa296b814e5e73a4e227bb7fb12170e055490a26ac51f9dc90ffe2dadad0",
  "TEST_SURVIVE@1:ORIGINAL":
    "a182fcdd2eeea0afa0bfc11a87aaf944b85159a255aa94cec7607d33c0b108e6",
  "TEST_CAPTURE@1:ORIGINAL":
    "c1a9c6e665e9e14c05ac8a5491ccf63ed521856a59244947320947660caa2553",
  "TEST_KILL@1:ORIGINAL":
    "a84ae828b0d7ad1d45cdf73e0e130f7704e8bdcc78673dcadc59f8aca317a197",
};

/**
 * The map revision the pins were taken at. The village density
 * (`pulp_wars-ykw.2`) renamed the generator a setup names to
 * `REGIONAL_BIOMES_NAVAL_V3`; a mission board is authored, not generated,
 * so like the ruleset ID the name alone changes no mission and the pins
 * keep hashing the name they were taken with.
 */
const PINNED_MAP_GENERATION_REVISION = "REGIONAL_BIOMES_NAVAL_V2";

/**
 * The `cult` record of a mission's initial state: empty, but for the Favour
 * a Cult seat's definition starts with (`pulp_wars-mch9.8`: `LAB_CULT_MID`).
 * The pins leave the record out, so it is checked against the definition.
 */
function expectedMissionCult(state: GameStateV7): GameStateV7["cult"] {
  const definition =
    state.setup.mission === undefined
      ? null
      : missionDefinitionV7(state.setup.mission);
  return {
    favour: (definition?.seats ?? []).flatMap((seat, index) => {
      const player = state.players[index];
      return seat.favour === undefined || player === undefined
        ? []
        : [{ playerId: player.id, favour: seat.favour }];
    }),
    strands: [],
    grips: [],
    rituals: [],
    cowed: [],
    frogs: [],
    hexCooldowns: [],
    tentacles: [],
  };
}

function missionStateHash(state: GameStateV7): string {
  // The Giant Spider (`pulp_wars-737.3`) added the `monsters` list, always
  // empty on a mission board, so the pins leave it out.
  // The Martian balance round (`pulp_wars-1wy.3`) added the per-turn lists
  // `beamedThisTurn` and `tractorUsedThisTurn`, empty in every initial
  // state, so the pins leave them out too: no mission has a Martian or Ice
  // Folk unit, so no mission revision changed.
  // The Candy revision (`pulp_wars-jdb.3`) added four lists, empty in every
  // initial state and left out too: no mission has a Candy unit.
  const {
    monsters,
    beamedThisTurn,
    tractorUsedThisTurn,
    sugarRush,
    crumbs,
    splattedThisTurn,
    tossedThisTurn,
    // The Candy redesign (`pulp_wars-jdb.12`, 7r68) added three more lists,
    // empty in every initial state and left out too (was hashed with them
    // in, so every pin failed).
    stuck,
    toothache,
    glazedThisTurn,
    // The Dinosaur pass, correction (`pulp_wars-w49.15`) added the
    // `huntedThisTurn` list, empty in every initial state and left out too.
    huntedThisTurn,
    // Goblin explosions and Berserk (`pulp_wars-w49.35`) added the
    // `berserkThisTurn` list, empty in every initial state and left out too.
    berserkThisTurn,
    // The Vampire and Banshee rework (`pulp_wars-ty6i`) added the
    // `terrorThisTurn` and `feastedThisTurn` lists, empty in every initial
    // state and left out too.
    terrorThisTurn,
    feastedThisTurn,
    ice,
    // The ninth unit (`pulp_wars-w49.17`, 7r55) added the `ninthUnit`
    // record, empty in every initial state and left out too.
    ninthUnit,
    // Dwarf crowd control (`pulp_wars-w49.33`) added the `barricades`
    // list, empty in every initial state and left out too.
    barricades,
    // The giants' signatures (`pulp_wars-w49.30`) added the `giants`
    // record, empty in every initial state and left out too.
    giants,
    // The Cult's Favour (`pulp_wars-mch9.4`) added the `cult` record,
    // empty in every initial state and left out too.
    cult,
    // Score and modes (`pulp_wars-kaw6.2`) added the `scoreLedger`, the
    // initial ledger in every initial state, left out too.
    scoreLedger,
    // Ice Folk Freeze (`pulp_wars-w49.37`) renamed the empty `chilled`
    // list `frozen`; it is hashed under its old name, so no pin moves.
    frozen,
    ...rest
  } = state;
  expect(frozen).toEqual([]);
  expect(giants).toEqual({ swallowed: [] });
  expect(cult).toEqual(expectedMissionCult(state));
  expectInitialScoreLedgerV7(state, scoreLedger);
  expect(ninthUnit).toEqual({
    wightGraves: [],
    risenWights: [],
    crackedThisTurn: [],
  });
  expect(barricades).toEqual([]);
  expect(huntedThisTurn).toEqual([]);
  expect(berserkThisTurn).toEqual([]);
  expect([terrorThisTurn, feastedThisTurn]).toEqual([[], []]);
  expect([beamedThisTurn, tractorUsedThisTurn]).toEqual([[], []]);
  // Mission curiosities (`pulp_wars-hmyk.14`, E1): a mission that places a
  // neutral unit (the Sea Serpent) hashes its `monsters` list; every other
  // mission has none and hashes as before.
  const placed = missionDefinitionV7(
    state.setup.mission ?? { id: "", revision: 0 },
  )?.curiosities;
  if (placed === undefined) expect(monsters).toEqual([]);
  // The frozen sea (`pulp_wars-5ti.3`) added the `ice` list, empty in every
  // initial mission state and left out too.
  expect(ice).toEqual([]);
  expect([sugarRush, crumbs, splattedThisTurn, tossedThisTurn]).toEqual([
    [],
    [],
    [],
    [],
  ]);
  expect([stuck, toothache, glazedThisTurn]).toEqual([[], [], []]);
  return canonicalHash({
    ...rest,
    ...(monsters.length === 0 ? {} : { monsters }),
    chilled: frozen,
    rulesetId: "*",
    setup: {
      ...state.setup,
      rulesetId: "*",
      mapGenerationRevision: PINNED_MAP_GENERATION_REVISION,
    },
  });
}

/**
 * The 7r34 pins (`pulp_wars-68k.2`), before map curiosities
 * (`pulp_wars-737.2`) added the setup's `curiosities: false` and the empty
 * `curiosities` list: a mission state without those two keys still hashes
 * to them, so the curiosities changed nothing else in a mission.
 */
const PRE_CURIOSITY_MISSION_HASHES: Readonly<Record<string, string>> = {
  "TEST_GROUNDS@1:ORIGINAL":
    "2571d656f451581da64e24744b76489251536d04b7c06be06120cd79be7a6433",
  "TEST_GROUNDS@1:GOBLIN":
    "b82a6886fe8e938b35f21807277443e5a296d8bdf69284f59f65a5637917577b",
  // The AI-directive fixtures (`pulp_wars-68k.3`), pinned at 7r34.
  "TEST_RUSH@1:ORIGINAL":
    "243228c450a3067a06a06078af18ad3254c40fa43a723577d13b010903dc7f87",
  "TEST_HOLD@1:ORIGINAL":
    "ab9625959c3cea281c1a8628bea232302513cc0a5d928e416fad71419e6a4670",
  "TEST_GUARD@1:ORIGINAL":
    "493749a981bcc06da8f1346adedfef54c1dd0d6a491e7167376f4a8cceb5432a",
  // The ASSAULT fixture (`pulp_wars-v642.5`), added after the curiosities.
  "TEST_ASSAULT@1:ORIGINAL":
    "31126e9c3cc9d0bd3c2ac28e8f92eda52c55b987f669895002f15886385ab13f",
  // A GUARD whose others assault (`pulp_wars-v642.10`).
  "TEST_GUARD_RAID@1:ORIGINAL":
    "d0c785306b57828a5f7fdcc436464f47c02a80852d93adbd784277166d1be1cb",
  // Chapter One (`pulp_wars-68k.4`), added after the curiosities: the same
  // states with the two curiosities keys left out.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  "FRONTIER_1@3:ORIGINAL":
    "52314a7830374a1409de1b86efafd4d896888b7be29e28adb510629cccdb8206",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  "FRONTIER_2@4:ORIGINAL":
    "bea27783827641a38a785a1383fcff8ab3d1a406684c9908859ea626d8b70136",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  // The danger pass (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_3@5:GOBLIN":
    "80e41e3d7cca45c4caa13be99dcd36b0f8ed34c02797825fb1552cbc537cf964",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@6:ORIGINAL":
    "db97b5816f7593333ce25d892a40df3671e2bd0aa29af7538f64557d2d8b4a91",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@6:GOBLIN":
    "1f1401dd4f6062b1ba7064f3deaef7d11ae1384f9920f0f93fdb20e476f63323",
  // Missions 5 and 6 (`pulp_wars-v642.2`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // The danger pass (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_5@3:UNDEAD":
    "4e3f6b86291fab66d1df46d3cc4fbba5c4f8b7166178c66fcf6b14d555201ac9",
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  "FRONTIER_6@2:DWARF":
    "d7ec6a39b5209bfcb5e2c6afa1ad440af61a939f8dfe1f8b049f3d7643ed02b4",
  // Missions 7 and 8 (`pulp_wars-v642.3`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_7@3:ICE_FOLK":
    "a73a79dcea4f0704cc57831f4911cffe7702f81b7d1136fe5d69769d44bc082a",
  // Mission 8 as a build-up (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_8@3:DINOSAUR":
    "05d0bf468f3143c7bee6f2dc17b77987daecab0777dc7ff87c43d5c9297d1cda",
  // Missions 9 and 10 (`pulp_wars-v642.4`); mission 9 with less
  // pre-research (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_9@3:MARTIAN":
    "a9309053ee3b9608d6fc6626be686e6ee54db50d5f5aed266d3ddb3e30b8dddd",
  // Mission 10 replayed on the corrected Cult AI (`pulp_wars-v642.6`): revision 2.
  // The Cult redesign's roster (`pulp_wars-mch9.31`): revision 3.
  // Its retune (`pulp_wars-mch9.46`): revision 4.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_10@5:ORIGINAL":
    "3261b98b1428331de3091102077772814e219b150055d67d2e0625d45e3274fd",
  // The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`).
  "HUMAN_1@1:ORIGINAL":
    "3ee8bb1f6f874afa324696dbb3060091f24308cc62b748ef5ce2bfc8ac4e7e3f",
  "HUMAN_2@1:ORIGINAL":
    "0e8d2e5846f0f5367cba7b470d1a510b16533810e3224ed483811d5d4fce054a",
  "HUMAN_3@1:ORIGINAL":
    "dc6f40e41a918df3198bc9d2bcff5c7bc8bafe34e71d7a4afee4d028bc0febcb",
  "HUMAN_4@1:ORIGINAL":
    "a91220876d04c2802bbe523e120a8beeed87099677255527ccdc186880112803",
  // The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`).
  "UNDEAD_1@1:UNDEAD":
    "91212cd0f2e147f1eb345bda1f080004823a8dfd1cb88165c2af554349f7a016",
  "UNDEAD_2@1:UNDEAD":
    "8570030b6495fc68e045926a031f164c3d65bcdd3b5a6f6837fb054e358c5605",
  "UNDEAD_3@1:UNDEAD":
    "cdd41e238efd30432d610bcd80151b21e5c51062b890fecd7b4b7dfcff6b81b2",
  "UNDEAD_4@1:UNDEAD":
    "ef9b0b8b606f4278384846aafc4969e54f517557503630655a3f9202255cd14f",
  "UNDEAD_5@1:UNDEAD":
    "bdfa9ae6651c9a2dbc9335a9839267fc20bd83c6b75bf75be9e83948c1c207b3",
  "UNDEAD_6@1:UNDEAD":
    "169c3a83b647ca7274d2a578f7272269d9e4e682c035f61ba7eb75436c898b94",
  // The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`); the Sea
  // Road (`DINOSAUR_3`) places the Sea Serpent and has no pin here.
  "DINOSAUR_1@1:DINOSAUR":
    "7e23043cb8c6e4d11385cc48466da0e044be30c106b81cc0545b6a52b16aeffb",
  "DINOSAUR_2@1:DINOSAUR":
    "357d433f7cbbbd2b574c8d14d4e8a909aef68ed7f5df3d25acbcbb294180d682",
  "DINOSAUR_4@1:DINOSAUR":
    "e73e3994d80a9e3a951e2dd082e2ca32c9d611261848655c8513755edcff8411",
  "DINOSAUR_5@1:DINOSAUR":
    "e9aeb59d229ff10252b86b2d1863f694e2aaf257e132c2e9e5f0c629c02cca8a",
  "DINOSAUR_6@1:DINOSAUR":
    "44972bbd18d4d58cfa06bf465779fe736b3c4b3d9f0ffaba0b4451863ea84900",
  // The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`).
  "MARTIAN_1@1:MARTIAN":
    "e3c9bec3e10b47cdffbfbdf8e2063c7955c9409e8f6f8254feb93c6538edbbdd",
  "MARTIAN_2@1:MARTIAN":
    "00bdac1aea7f297c485297a57a4a0a11dd8066b377d5f1c55cbc9b5f94bc6fdb",
  "MARTIAN_3@1:MARTIAN":
    "ca57c2de0c9515c07f84488a5d5618a755da46df054359f8faf3dbbff546eaee",
  "MARTIAN_4@1:MARTIAN":
    "e5a7d24e34e012ff120791f0d93a2d298f7a35661b8df6e8381a7bfbc248d71f",
  "MARTIAN_5@1:MARTIAN":
    "6abd8486abcd0bce5d7a90c0c2d773700153fd5731239bcda1bdc7ecac083205",
  "MARTIAN_6@1:MARTIAN":
    "5d21a6ed7335a806f76708054f00aa56ebbd8a153aed9c0369005472714ce701",
  // The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`).
  // GOBLIN_4 places the Moon Gun, so it has no pre-curiosity pin.
  "GOBLIN_1@1:GOBLIN":
    "80f075e3b0ac47532799ee1af67dbeced03f85aff32d8d613819a2114f67e711",
  "GOBLIN_2@1:GOBLIN":
    "056a10afef40450c9a3908f43aeefed958bbcdf76c6daeb7fc3fcf2884b4e9da",
  "GOBLIN_3@1:GOBLIN":
    "8543173b80512f9040d582a44a9252cab79c6b62812aa56d54e806fe69c8e105",
  "GOBLIN_5@1:GOBLIN":
    "539e56d85ed631199c600bf6089282a6ac7c4a2a943fc9c1ce7fb3a326c51111",
  "GOBLIN_6@1:GOBLIN":
    "4c6fb734162d49bb4ef77fb8642e18b254ccf9304dd7322815572808f1315e17",
  // The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`).
  "DWARF_1@1:DWARF":
    "fde7575e484f73ade3c7891f091121f4322002e4c1b047259cf9bb29afc36976",
  "DWARF_2@1:DWARF":
    "27323833aaa3e9eff1e9bc64fec3d044bbf35bfd32b549c360c3e8b6c3497e14",
  "DWARF_3@1:DWARF":
    "0d4b6cb44239b45a9ac6cf94c8fc06782d9fd5888d102d97b55ecb207d422469",
  "DWARF_4@1:DWARF":
    "5ce147e0765c4a240b325e610da6f7b9ee7196017fefb005d3d4e7331568730e",
  "DWARF_5@1:DWARF":
    "f29ab8e611c536bd6065c376380aa8e971d3156db72c4719108bd74f6b7c35db",
  "DWARF_6@1:DWARF":
    "62ed9a9959332e399e204208997a7056f335f11c52f5337f18a09b45da6bc86e",
  // The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`).
  "CANDY_1@1:CANDY":
    "e64cd935aeee550160d803d8fae5db8b7125a913dbe210aeb460086c625b695f",
  "CANDY_2@1:CANDY":
    "98bc65015f9987a2656bf0b402e80bade7afaf0fe896454885e742d21e31e205",
  "CANDY_3@1:CANDY":
    "dfb983deb5da15062043d8e3a071c058e3c6e6992b1428e824d941815d481c50",
  "CANDY_4@1:CANDY":
    "2c658acbb487615bddd86d5134dbe2b51086ba9b1cc8b7c951d47fadf36124d5",
  "CANDY_6@1:CANDY":
    "439a84bf3892273713b9f92f918408e7b7464a764badf40d3e909fff064916be",
  // The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`).
  "ICE_FOLK_1@1:ICE_FOLK":
    "c5fe4a9e6fbaebb83bce4a2bb0d0e3bc1aca17fcf8d7140575c40d3b62ff89c1",
  "ICE_FOLK_2@1:ICE_FOLK":
    "5a0d5d89d9639ab9e7b3a9b0077dfcb5cfbc231054195d4e7d8a0de8879fdd0b",
  "ICE_FOLK_3@1:ICE_FOLK":
    "6ef5b24e334980d51ecfeb6c513e3b2391ea7b2b0efa3a8c984a42a03ad8241d",
  "ICE_FOLK_4@1:ICE_FOLK":
    "2269227843b53ae17c46732c14c7b74978f1d083e1ef0fcc68ffc75167193244",
  "ICE_FOLK_5@1:ICE_FOLK":
    "f8d5975e48cec6531f27aa558b55fc4a678529539e8d36a8857df32c218dca4b",
  "ICE_FOLK_6@1:ICE_FOLK":
    "080d14156726faf33ee3aa386d8289e156f71a1c1610dde427f6c46372b9eb18",

  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  "TEST_NECK@2:ORIGINAL":
    "32595babd0a4d5371b260320b8d360786ba69b01808d2716eaadec332213500e",
  // The Human tuning labs (tuning 4) were never built before map
  // curiosities; their digests here are the same reduction of the state.
  "LAB_SIEGE@1:ORIGINAL":
    "08e89649ece323a8d5284cc1895331f236d702a507a8c68df6ff443175b539ed",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BACKLINE@4:ORIGINAL":
    "5fbf6cb90165c921ad415893f5312335ba6f188958444930be6523823aeb3d7a",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  "LAB_LATE@3:ORIGINAL":
    "1077f06138cc445c505ced579e7a197082076fbacf1ebdc4429a01cf799bfa1e",
  // The breakthrough labs of tuning 6: the same reduction of the state.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BREAKTHROUGH@4:ORIGINAL":
    "403cecb57f59dacd51c35e08f4d86f660a1fdba1212295ca9f0fa3b33190b4ed",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BREAKTHROUGH_GOBLIN@4:ORIGINAL":
    "74002b11f11790087a1c9d132355d7d8f8f4f2f7d314f160a0e3f5af7606dd61",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  // The Vampire and Banshee rework: its Vampires have 13 HP (was
  // 731044b6e8f55c50…: pulp_wars-ty6i).
  "LAB_BREAKTHROUGH_UNDEAD@4:ORIGINAL":
    "510aec8639761dd793a9c226199c564d45a78f3d05f67561aa70b234093f2937",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  "LAB_GOBLIN_MID@3:GOBLIN":
    "a907422d4ffc1a0338434192745e07d952c6c68134f124ba0e1ab8c5f1ab762f",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // The Vampire and Banshee rework: its Vampires have 13 HP (was
  // f60ce2ac800381c7…: pulp_wars-ty6i).
  "LAB_UNDEAD_MID@3:UNDEAD":
    "76e692fd8f50352caeec152d8fcb57a271903212142add89c955ecf39aaa7f3f",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  "LAB_MARTIAN_MID@3:MARTIAN":
    "a5d2bf334a793f8d30ef8ca819a565110c204bcedc39189023cf2c16ebef9e5a",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 2.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  "LAB_DINOSAUR_MID@3:DINOSAUR":
    "57e1c97f2d8c05ba6e0cccffbf61ed290788552078d10bdd882eac27e23e7556",
  // Ice Folk Freeze (`pulp_wars-w49.37`): revision 2.
  "LAB_ICE_FOLK_MID@2:ICE_FOLK":
    "ebd63e3819669af5c3446cca594362b3f44fdd534624e342fb48d9b24c8b19e0",
  "LAB_DWARF_MID@1:DWARF":
    "8a17c1c43532dc6a5e830d0f552cee4a955902a2897545267726d39c890c7ca2",
  // The Cult's tricks (`pulp_wars-mch9.8`); the Cult redesign's roster
  // (`pulp_wars-mch9.31`): revision 2.
  "LAB_CULT_MID@2:CULT":
    "dd0f9d881c53029f996b230d8be84a6c06098c5c28eeaf376518e0e60baded16",
  // The tutorial board (`pulp_wars-0yxy`).
  "TUTORIAL_1@1:ORIGINAL":
    "7740c5e7f57484e405c12cb665cfd33322eadbaf3c4907bc9b2483c5c05b0463",
  // The objective fixtures (`pulp_wars-v642.1`): escort, survive, capture
  // with a deadline and an ally, and kill.
  "TEST_ESCORT@1:ORIGINAL":
    "6621c2ebd6bbdd5938cd2d1e6722157e60f3ea7633a5ef114684a9b65a6592ff",
  "TEST_SURVIVE@1:ORIGINAL":
    "16ca39ad86c7548c276066af2086cd722b551e852067c0da2b6baf3bc37c3a4c",
  "TEST_CAPTURE@1:ORIGINAL":
    "932a21d3cb32380ba5492e2a1164fc9a2c1d40d76b2f9eaab343d5fbe9545662",
  "TEST_KILL@1:ORIGINAL":
    "962127daaa5f691cb2954eecf46fc8ef06aefbc69821de6f3e32636c8182a7c9",
};

function preCuriosityMissionStateHash(state: GameStateV7): string {
  const {
    curiosities,
    monsters,
    beamedThisTurn,
    tractorUsedThisTurn,
    sugarRush,
    crumbs,
    splattedThisTurn,
    tossedThisTurn,
    // The Candy redesign (`pulp_wars-jdb.12`, 7r68): left out too.
    stuck,
    toothache,
    glazedThisTurn,
    huntedThisTurn,
    // Goblin explosions and Berserk (`pulp_wars-w49.35`) added the
    // `berserkThisTurn` list, empty in every initial state and left out too.
    berserkThisTurn,
    // The Vampire and Banshee rework (`pulp_wars-ty6i`) added the
    // `terrorThisTurn` and `feastedThisTurn` lists, empty in every initial
    // state and left out too.
    terrorThisTurn,
    feastedThisTurn,
    ice,
    ninthUnit,
    barricades,
    giants,
    cult,
    scoreLedger,
    frozen,
    ...rest
  } = state;
  expect(frozen).toEqual([]);
  expect(giants).toEqual({ swallowed: [] });
  expect(cult).toEqual(expectedMissionCult(state));
  expectInitialScoreLedgerV7(state, scoreLedger);
  expect(ninthUnit).toEqual({
    wightGraves: [],
    risenWights: [],
    crackedThisTurn: [],
  });
  expect(barricades).toEqual([]);
  expect(huntedThisTurn).toEqual([]);
  expect(berserkThisTurn).toEqual([]);
  expect([terrorThisTurn, feastedThisTurn]).toEqual([[], []]);
  const { curiosities: option, ...setup } = state.setup;
  expect([curiosities, monsters, option]).toEqual([[], [], false]);
  expect([beamedThisTurn, tractorUsedThisTurn]).toEqual([[], []]);
  // The frozen sea (`pulp_wars-5ti.3`) added the `ice` list, empty in every
  // initial mission state and left out too.
  expect(ice).toEqual([]);
  expect([sugarRush, crumbs, splattedThisTurn, tossedThisTurn]).toEqual([
    [],
    [],
    [],
    [],
  ]);
  expect([stuck, toothache, glazedThisTurn]).toEqual([[], [], []]);
  return canonicalHash({
    ...rest,
    chilled: frozen,
    rulesetId: "*",
    setup: {
      ...setup,
      rulesetId: "*",
      mapGenerationRevision: PINNED_MAP_GENERATION_REVISION,
    },
  });
}

/** A browser-legal generated-map setup (Human against Undead). */
function plainSetup(mapType: MatchSetupV7["mapType"]): MatchSetupV7 {
  return { ...browserSetupV7(), mapType };
}

function rawGrounds(faction: FactionIdV7 = "ORIGINAL"): GameStateV7 {
  const created = createInitialMapStateV7(groundsSetup(faction));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function playableGrounds(faction: FactionIdV7 = "ORIGINAL"): GameStateV7 {
  const created = createPlayableGameV7(groundsSetup(faction));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function tile(state: GameStateV7, x: number, y: number) {
  const found = state.board.tiles[y * state.board.width + x];
  if (found === undefined) throw new Error("off board");
  return found;
}

/** A definition edited for a build-time validation case. */
function edited(
  change: (mission: MissionDefinitionV7) => Partial<MissionDefinitionV7>,
): MissionDefinitionV7 {
  const base = JSON.parse(JSON.stringify(testGrounds())) as MissionDefinitionV7;
  return { ...base, ...change(base) };
}

describe("the mission registry", () => {
  it("registers TEST_GROUNDS revision 1 as a hidden fixture", () => {
    const mission = testGrounds();
    expect(mission).toMatchObject({ revision: 1, hidden: true, size: 11 });
    expect(Object.isFrozen(mission)).toBe(true);
    expect(missionDefinitionV7({ id: "TEST_GROUNDS", revision: 1 })).toBe(
      mission,
    );
    expect(missionDefinitionV7({ id: "TEST_GROUNDS", revision: 2 })).toBe(null);
    expect(missionDefinitionV7({ id: "NO_SUCH", revision: 1 })).toBe(null);
    expect(new Set(MISSION_REGISTRY_V7.map((item) => item.id)).size).toBe(
      MISSION_REGISTRY_V7.length,
    );
  });

  it("builds every registered mission for every faction choice into a valid playable state", () => {
    for (const mission of MISSION_REGISTRY_V7) {
      expect(() => validateMissionDefinitionV7(mission)).not.toThrow();
      for (const faction of missionSeatFactionsV7(
        mission.seats[0] as MissionDefinitionV7["seats"][number],
      )) {
        const setup = missionMatchSetupV7(mission, faction);
        if (setup === null) throw new Error(`${mission.id} ${faction}`);
        expect(parseMatchSetupV7(setup)).toEqual(setup);
        const raw = createInitialMapStateV7(setup);
        if (!raw.ok) throw new Error(raw.error.code);
        expect(raw.mapAttempt).toBe(1);
        expect(parseGameStateV7(raw.state)).not.toBeNull();
        const created = createPlayableGameV7(setup);
        expect(created.ok).toBe(true);
      }
    }
  });

  it("pins the initial state of every registered mission revision and faction choice", () => {
    const actual: Record<string, string> = {};
    const preCuriosity: Record<string, string> = {};
    for (const mission of MISSION_REGISTRY_V7)
      for (const faction of missionSeatFactionsV7(
        mission.seats[0] as MissionDefinitionV7["seats"][number],
      )) {
        const setup = missionMatchSetupV7(mission, faction);
        if (setup === null) throw new Error(`${mission.id} ${faction}`);
        const raw = createInitialMapStateV7(setup);
        if (!raw.ok) throw new Error(raw.error.code);
        const label = `${mission.id}@${String(mission.revision)}:${faction}`;
        actual[label] = missionStateHash(raw.state);
        // A mission that places curiosities (`pulp_wars-hmyk.14`) was never
        // built before them, so it has no pre-curiosity pin.
        if (mission.curiosities === undefined)
          preCuriosity[label] = preCuriosityMissionStateHash(raw.state);
      }
    // A mismatch: bump the edited mission's revision (section 2.4).
    expect(actual).toEqual(PINNED_MISSION_HASHES);
    expect(preCuriosity).toEqual(PRE_CURIOSITY_MISSION_HASHES);
  });

  it("offers seat 0's choices through missionMatchSetupV7 and refuses others", () => {
    const mission = testGrounds();
    expect(missionMatchSetupV7(mission)).toEqual({
      rulesetId: RULESET_7_ID,
      seed: mission.seed,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "MISSION",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
      mission: { id: "TEST_GROUNDS", revision: 1 },
    });
    expect(missionMatchSetupV7(mission, "GOBLIN", "TEAL")).toMatchObject({
      factions: ["GOBLIN", "UNDEAD"],
      humanColor: "TEAL",
    });
    expect(missionMatchSetupV7(mission, "UNDEAD")).toBeNull();
    expect(missionMatchSetupV7(mission, "MARTIAN")).toBeNull();
  });
});

describe("the MISSION setup", () => {
  it("accepts a registered mission with either faction choice and any human color", () => {
    for (const faction of ["ORIGINAL", "GOBLIN"] as const)
      for (const humanColor of ["CORAL", "VIOLET"] as const) {
        const setup = groundsSetup(faction, { humanColor });
        expect(validateMatchSetupV7(setup)).toEqual({ ok: true, setup });
      }
  });

  it("refuses every field that does not match the definition", () => {
    const setup = groundsSetup();
    const invalid = { ok: false, error: { code: "INVALID_SETUP", params: {} } };
    for (const change of [
      { width: 14, height: 14 },
      { height: 14 },
      { aiCount: 2, factions: ["ORIGINAL", "UNDEAD", "GOBLIN"] },
      { aiMode: "COOPERATIVE" },
      { seed: setup.seed + 1 },
      { factions: ["DINOSAUR", "UNDEAD"] },
      { factions: ["ORIGINAL", "GOBLIN"] },
      { factions: ["ORIGINAL"] },
      { allowDuplicateFactions: true },
      { mission: { id: "TEST_GROUNDS", revision: 0 } },
      { mission: { id: "TEST_GROUNDS", revision: 1.5 } },
      { mission: { id: "", revision: 1 } },
      { mission: { id: 7, revision: 1 } },
      { mission: { id: "TEST_GROUNDS", revision: 1, extra: true } },
      { mission: undefined },
      { aiDifficulty: "HARD" },
      { mapGenerationRevision: "OTHER" },
    ] as const) {
      const input = JSON.parse(
        JSON.stringify({ ...setup, ...change }),
      ) as unknown;
      expect(validateMatchSetupV7(input), JSON.stringify(change)).toEqual(
        invalid,
      );
    }
    // Only a MISSION setup may carry the mission key.
    expect(
      validateMatchSetupV7({
        ...plainSetup("CONTINENTS"),
        mission: { id: "TEST_GROUNDS", revision: 1 },
      }),
    ).toEqual(invalid);
    expect(
      validateMatchSetupV7({ ...plainSetup("CONTINENTS"), mapType: "MISSION" }),
    ).toEqual(invalid);
  });

  it("refuses an unknown mission ID or a revision other than the current one with UNKNOWN_MISSION", () => {
    for (const mission of [
      { id: "NO_SUCH_MISSION", revision: 1 },
      { id: "TEST_GROUNDS", revision: 2 },
    ]) {
      const result = validateMatchSetupV7(
        groundsSetup("ORIGINAL", { mission }),
      );
      expect(result).toEqual({
        ok: false,
        error: { code: "UNKNOWN_MISSION", params: mission },
      });
      expect(
        createInitialMapStateV7(groundsSetup("ORIGINAL", { mission })),
      ).toMatchObject({ ok: false, error: { code: "UNKNOWN_MISSION" } });
      expect(() =>
        createReplayV7(groundsSetup("ORIGINAL", { mission })),
      ).toThrow("UNKNOWN_MISSION");
    }
  });
});

describe("the mission builder (TEST_GROUNDS)", () => {
  it("lays out the authored terrain, water classes, biomes, resources, and sites", () => {
    const state = rawGrounds();
    expect(tile(state, 0, 0)).toMatchObject({
      terrain: "MOUNTAIN",
      biome: "WOODLAND",
    });
    expect(tile(state, 3, 0)).toMatchObject({
      terrain: "FOREST",
      resource: "GAME",
    });
    // Water orthogonally next to land is Shallow, otherwise Deep.
    expect(tile(state, 9, 0)).toMatchObject({
      terrain: "SHALLOW_WATER",
      biome: null,
    });
    expect(tile(state, 10, 0)).toMatchObject({
      terrain: "DEEP_WATER",
      resource: "PEARLS",
    });
    expect(tile(state, 10, 5)).toMatchObject({
      terrain: "SHALLOW_WATER",
      resource: "FISH",
    });
    expect(tile(state, 5, 3).terrain).toBe("RIFT");
    expect(tile(state, 5, 5)).toMatchObject({
      biome: "PLAINS",
      site: "VILLAGE",
    });
    expect(tile(state, 2, 9).biome).toBe("HIGHLANDS");
    expect(tile(state, 2, 8).site).toBe("CAPITAL");
    expect(tile(state, 2, 3).site).toBe("CITY");
    expect(tile(state, 7, 2).site).toBe("CAPITAL");
    expect(tile(state, 1, 9)).toMatchObject({
      resource: "FERTILE_GROUND",
      improvement: "FARM",
    });
    expect(tile(state, 8, 1)).toMatchObject({
      terrain: "MOUNTAIN",
      resource: "ORE",
      improvement: "MINE",
    });
    expect(tile(state, 7, 5).road).toBe(true);
    expect(tile(state, 6, 3).fieldDefense).toBe(true);
    expect(state.treasureChests).toEqual([{ x: 5, y: 9 }]);
    expect(state.graves).toEqual([{ x: 5, y: 7 }]);
  });

  it("gives every city its 3 x 3 footprint and the Showcase entity IDs", () => {
    const state = rawGrounds();
    expect(state.cities.map((city) => [city.id, city.ownerId])).toEqual([
      [1, 1],
      [3, 2],
      [5, 1],
      [6, 2],
    ]);
    for (const city of state.cities)
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1)
          expect(
            tile(state, city.at.x + dx, city.at.y + dy).territoryCityId,
          ).toBe(city.id);
    expect(
      state.board.tiles.filter((item) => item.territoryCityId !== null),
    ).toHaveLength(36);
    expect(state.players.map((player) => player.originalCapitalCityId)).toEqual(
      [1, 3],
    );
    // Seat s: capital 2s + 1, first unit 2s + 2; then the other cities, the
    // ledger, and the other units in seat order.
    expect(state.units.map((unit) => [unit.id, unit.role, unit.at])).toEqual([
      [2, "FIGHTER", { x: 2, y: 8 }],
      [4, "FIGHTER", { x: 7, y: 2 }],
      [18, "GUARD", { x: 3, y: 8 }],
      [19, "RAIDER", { x: 2, y: 3 }],
      [20, "GUARD", { x: 7, y: 3 }],
      [21, "MARKSMAN", { x: 7, y: 8 }],
    ]);
    expect(state.nextEntityId).toBe(22);
    expect(state.units.find((unit) => unit.id === 19)?.homeCityId).toBe(5);
  });

  it("fills the population ledger to each city's level from the ordinary rules", () => {
    const state = rawGrounds();
    expect(
      state.cities.map((city) => [
        city.level,
        city.rewards.map((reward) => reward.reward),
        city.permanentPopulation,
        city.economicPopulation,
        city.population,
      ]),
    ).toEqual([
      // Capital L3: Farm 2 live, three harvests.
      [3, ["SURVEY", "WALLS"], 3, 2, 0],
      // Undead capital L4: BOOM 3, three harvests; Mine 2 and Road 1 live.
      [4, ["SURVEY", "WALLS", "BOOM"], 6, 3, 0],
      // Human city L2: two harvests.
      [2, ["STOCKPILE"], 2, 0, 0],
      // Undead city L1: its Road population alone.
      [1, [], 0, 1, 1],
    ]);
    expect(
      state.populationContributions.map((entry) => [
        entry.id,
        entry.cityId,
        entry.category,
        entry.amount,
        entry.source.kind === "RESOURCE_ACTION"
          ? entry.source.action
          : entry.source.kind,
        entry.source.at,
      ]),
    ).toEqual([
      [7, 1, "PERMANENT", 1, "HARVEST_FRUIT", { x: 1, y: 7 }],
      [8, 1, "PERMANENT", 1, "HARVEST_FRUIT", { x: 2, y: 7 }],
      [9, 1, "PERMANENT", 1, "HARVEST_FRUIT", { x: 3, y: 7 }],
      [10, 1, "LIVE", 2, "IMPROVEMENT", { x: 1, y: 9 }],
      [11, 5, "PERMANENT", 1, "HARVEST_FRUIT", { x: 1, y: 2 }],
      [12, 5, "PERMANENT", 1, "HARVEST_FRUIT", { x: 2, y: 2 }],
      [13, 3, "PERMANENT", 3, "CITY_REWARD", { x: 7, y: 2 }],
      [14, 3, "PERMANENT", 1, "HARVEST_FRUIT", { x: 6, y: 1 }],
      [15, 3, "PERMANENT", 1, "HARVEST_FRUIT", { x: 7, y: 1 }],
      [16, 3, "PERMANENT", 1, "HARVEST_FRUIT", { x: 6, y: 2 }],
      [17, 3, "LIVE", 2, "IMPROVEMENT", { x: 8, y: 1 }],
    ]);
    expect(state.pendingChoices).toEqual([]);
  });

  it("creates the seats from the definition: factions, Coins, technologies, exploration", () => {
    const state = rawGrounds("GOBLIN");
    const [human, undead] = state.players;
    expect(human).toMatchObject({
      faction: "GOBLIN",
      factionTreeId: "GOBLIN_BASELINE_V1",
      controller: "HUMAN",
      color: "CORAL",
      coins: 5,
      researchedTechs: [],
    });
    expect(undead).toMatchObject({
      faction: "UNDEAD",
      controller: "AI",
      coins: 7,
      researchedTechs: [
        "GATHERING",
        "SCOUTING",
        "ROADS",
        "DRILL",
        "FORTIFICATION",
      ],
    });
    // Radius 2 around (2, 8) and (2, 3): x 0–4, y 1–10 (50 cells).
    expect(human?.explored).toHaveLength(50);
    expect(human?.explored).toContainEqual({ x: 4, y: 1 });
    expect(human?.explored).not.toContainEqual({ x: 7, y: 2 });
    // The Undead also see the reveal rectangle over the human capital.
    expect(undead?.explored).toContainEqual({ x: 1, y: 9 });
    expect(undead?.explored).toContainEqual({ x: 3, y: 7 });
    expect(undead?.explored).not.toContainEqual({ x: 0, y: 9 });
    expect(state.turnOrder).toEqual([1, 2]);
    expect(state.random).toEqual(randomState(testGrounds().seed));
    expect(state.round).toBe(1);
  });

  it("resolves the starting units through the chosen faction at full HP", () => {
    for (const faction of ["ORIGINAL", "GOBLIN"] as const) {
      const state = rawGrounds(faction);
      for (const unit of state.units) {
        const owner = state.players.find(
          (player) => player.id === unit.ownerId,
        );
        const maxHp = effectiveRoleRuleV7(
          unit.role,
          owner?.faction ?? "ORIGINAL",
        ).maxHp;
        expect(unit).toMatchObject({
          hp: maxHp,
          maxHp,
          kills: 0,
          form: "LAND",
        });
      }
    }
    expect(rawGrounds("ORIGINAL").units[0]?.maxHp).not.toBe(
      rawGrounds("GOBLIN").units[0]?.maxHp,
    );
  });

  it("reports the authored board as generation attempt 1 with no draw, and has no village count", () => {
    const generated = generateInitialMapV7(groundsSetup());
    if (!generated.ok) throw new Error(generated.error.code);
    expect(generated.map).toMatchObject({
      attempt: 1,
      attempts: [],
      capitals: [
        { x: 2, y: 8 },
        { x: 7, y: 2 },
      ],
      villages: [
        { x: 4, y: 1 },
        { x: 5, y: 5 },
      ],
      turnOrderSeats: [0, 1],
      treasureChests: [{ x: 5, y: 9 }],
      random: randomState(testGrounds().seed),
    });
    expect(
      generated.map.board.tiles.every((item) => item.territoryCityId === null),
    ).toBe(true);
    expect(generateInitialMapWithVillageCountV7(groundsSetup(), 4)).toEqual({
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    });
  });

  it("refuses definitions it cannot honour at build time", () => {
    const setup = groundsSetup();
    const cases: readonly [string, MissionDefinitionV7][] = [
      [
        "must be forbidden",
        edited(() => ({ forbiddenTechnologies: ["SHORECRAFT"] })),
      ],
      [
        "without water",
        edited((base) => ({
          terrain: base.terrain.map((row) => row.replaceAll("~", ".")),
          resources: base.resources.map((row) => row.replace(/[sp]/g, ".")),
          forbiddenTechnologies: [],
        })),
      ],
      [
        "Graves need an Undead seat",
        edited((base) => ({
          seats: [
            base.seats[0] as MissionDefinitionV7["seats"][number],
            {
              ...(base.seats[1] as MissionDefinitionV7["seats"][number]),
              faction: "DWARF",
            },
          ],
        })),
      ],
      [
        "edge ring",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              cities: [{ at: { x: 0, y: 4 }, level: 1, rewards: [] }],
              units: [{ role: "FIGHTER", at: { x: 0, y: 4 } }],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "which seat 0 may choose",
        edited((base) => ({
          graves: [],
          seats: [
            base.seats[0] as MissionDefinitionV7["seats"][number],
            {
              ...(base.seats[1] as MissionDefinitionV7["seats"][number]),
              faction: "GOBLIN",
            },
          ],
        })),
      ],
      [
        "does not fit its terrain",
        edited((base) => ({
          resources: [
            "o" + (base.resources[0] as string).slice(1).replace("g", "."),
            ...base.resources.slice(1),
          ].map((row, y) => (y === 0 ? "s" + row.slice(1) : row)),
        })),
      ],
      [
        "cannot stand there",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              units: [
                { role: "FIGHTER", at: { x: 2, y: 8 } },
                { role: "GUARD", at: { x: 10, y: 8 } },
              ],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "harvested Grass tiles",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              cities: [
                {
                  at: { x: 2, y: 8 },
                  level: 5,
                  rewards: ["SURVEY", "WALLS", "TREASURY_6", "TREASURY"],
                },
                ...(base.seats[0]?.cities.slice(1) ?? []),
              ],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "starts with the forbidden",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              technologies: ["SHORECRAFT"],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      [
        "do not match its level",
        edited((base) => ({
          seats: [
            {
              ...(base.seats[0] as MissionDefinitionV7["seats"][number]),
              cities: [
                { at: { x: 2, y: 8 }, level: 3, rewards: ["WALLS", "SURVEY"] },
                ...(base.seats[0]?.cities.slice(1) ?? []),
              ],
            },
            base.seats[1] as MissionDefinitionV7["seats"][number],
          ],
        })),
      ],
      ["layer is not", edited((base) => ({ terrain: base.terrain.slice(1) }))],
    ];
    for (const [message, mission] of cases) {
      let thrown: unknown = null;
      try {
        // The setup plays the edited AI seats' factions.
        buildMissionStateV7(mission, {
          ...setup,
          factions: mission.seats.map((seat, index) =>
            typeof seat.faction === "string"
              ? seat.faction
              : (setup.factions[index] as FactionIdV7),
          ),
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown, message).toBeInstanceOf(MissionBuildErrorV7);
      expect(String((thrown as Error).message), message).toContain(message);
    }
  });
});

describe("forbidden technologies", () => {
  it("are the Dry Land Naval branch, a mission's list, or nothing", () => {
    expect([
      ...forbiddenTechnologiesV7(plainSetup("DRY_LAND")).entries(),
    ]).toEqual(NAVAL.map((tech) => [tech, "DRY_LAND"]));
    expect([...forbiddenTechnologiesV7(groundsSetup()).entries()]).toEqual(
      NAVAL.map((tech) => [tech, "MISSION"]),
    );
    for (const mapType of [
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
    ] as const)
      expect(forbiddenTechnologiesV7(plainSetup(mapType)).size).toBe(0);
    // Every faction tree shares the Human tree's branches, so the Dry Land
    // set read from it is the set every tree's Naval nodes form.
    for (const faction of FACTION_IDS_V7)
      expect(
        factionTreeV7(faction)
          .nodes.filter((node) => node.branch === "NAVAL")
          .map((node) => node.id),
      ).toEqual(NAVAL);
    expect(
      ORIGINAL_BASELINE_V5_TREE.nodes
        .filter((node) => node.branch === "NAVAL")
        .map((node) => node.id),
    ).toEqual(NAVAL);
  });

  it("refuses a mission's forbidden research with TECH_REQUIRED reason MISSION and no state change", () => {
    const state = playableGrounds();
    const human = state.humanPlayerId;
    for (const tech of NAVAL) {
      const result = applyCommandV7(state, human, { kind: "RESEARCH", tech });
      expect(result.accepted).toBe(false);
      if (result.accepted) continue;
      expect(result.error).toEqual({
        code: "TECH_REQUIRED",
        params: { tech, reason: "MISSION" },
      });
      expect(canonicalJson(result.state)).toBe(canonicalJson(state));
    }
    // An allowed tier-1 technology is still the free opener.
    const opener = applyCommandV7(state, human, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    expect(opener.accepted).toBe(true);
  });

  it("shows forbidden nodes DISABLED at their ordinary cost and never offers them", () => {
    const state = playableGrounds();
    const tree = queryTechnologyTreeV7(state, state.humanPlayerId);
    for (const tech of NAVAL)
      expect(tree.nodes.find((node) => node.id === tech)).toMatchObject({
        state: "DISABLED",
        affordable: false,
      });
    // The ordinary tier-1 cost with this seat's cities (5, and 1 for each
    // city beyond the first since the economy rejig, 7r54); the free
    // opener (cost 0) applies to Hunting but never to the disabled
    // Shorecraft.
    expect(tree.ownedCityCount).toBe(2);
    expect(tree.nodes.find((node) => node.id === "SHORECRAFT")?.cost).toBe(6);
    expect(tree.nodes.find((node) => node.id === "HUNTING")).toMatchObject({
      state: "AVAILABLE",
      cost: 0,
    });
    const offers = queryPlayerCommandsV7(state, state.humanPlayerId).filter(
      (command) => command.kind === "RESEARCH",
    );
    expect(offers.length).toBeGreaterThan(0);
    for (const command of offers)
      if (command.kind === "RESEARCH")
        expect(NAVAL).not.toContain(command.tech);
  });

  it("keeps the Dry Land behaviour: TECH_REQUIRED reason DRY_LAND, DISABLED, never offered", () => {
    const created = createPlayableGameV7(plainSetup("DRY_LAND"));
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no actor");
    const result = applyCommandV7(state, actor, {
      kind: "RESEARCH",
      tech: "SHORECRAFT",
    });
    expect(result.accepted).toBe(false);
    if (!result.accepted)
      expect(result.error).toEqual({
        code: "TECH_REQUIRED",
        params: { tech: "SHORECRAFT", reason: "DRY_LAND" },
      });
    const tree = queryTechnologyTreeV7(state, actor);
    for (const tech of NAVAL)
      expect(tree.nodes.find((node) => node.id === tech)?.state).toBe(
        "DISABLED",
      );
    // One city, no technology: the ordinary tier-1 cost 5, never the opener.
    expect(tree.nodes.find((node) => node.id === "SHORECRAFT")?.cost).toBe(5);
    expect(
      queryPlayerCommandsV7(state, actor).some(
        (command) =>
          command.kind === "RESEARCH" && NAVAL.includes(command.tech),
      ),
    ).toBe(false);
  });
});

describe("mission saves and replays", () => {
  function playedGrounds(): {
    readonly state: GameStateV7;
    readonly replay: ReturnType<typeof createReplayV7>;
  } {
    const setup = groundsSetup("GOBLIN");
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (let step = 0; step < 6; step += 1) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("actor missing");
      const offered = queryPlayerCommandsV7(state, actor);
      const command =
        step % 3 === 2
          ? ({ kind: "END_TURN" } as const)
          : (offered.find((entry) => entry.kind === "MOVE") ??
            ({ kind: "END_TURN" } as const));
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted) throw new Error(`${command.kind} rejected`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    }
    return { state, replay };
  }

  it("round-trips a played mission through save and replay", () => {
    const { state, replay } = playedGrounds();
    expect(state.commandIndex).toBe(6);
    const replayed = runReplayV7(JSON.parse(JSON.stringify(replay)));
    expect(replayed.stateHash).toBe(canonicalHash(state));
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    if (loaded.kind !== "VALID") throw new Error(loaded.diagnostic);
    expect(loaded.save.setup).toEqual(groundsSetup("GOBLIN"));
    expect(loaded.save.stateHash).toBe(canonicalHash(state));
  });

  it("refuses a save or replay of a revised or removed mission as stale, not corrupt", () => {
    const { state, replay } = playedGrounds();
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    for (const mission of [
      { id: "TEST_GROUNDS", revision: 2 },
      { id: "REMOVED_MISSION", revision: 1 },
    ]) {
      const setup = { ...save.setup, mission };
      const stale = {
        ...save,
        setup,
        state: { ...save.state, setup },
      };
      expect(parseSaveV7(JSON.stringify(stale))).toEqual({
        kind: "INCOMPATIBLE",
        diagnostic: STALE_MISSION_DIAGNOSTIC_V7,
      });
      const staleReplay = JSON.parse(
        JSON.stringify({ ...replay, setup }),
      ) as unknown;
      expect(parseReplayFileV7(staleReplay)).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
      expect(() => runReplayV7(staleReplay)).toThrow(
        expect.objectContaining({ code: "INCOMPATIBLE_REPLAY" }),
      );
    }
    expect(STALE_MISSION_DIAGNOSTIC_V7).toBe(
      "This mission was updated since the game was saved. Start it again from the campaign.",
    );
  });
});
