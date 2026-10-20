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
  unitSightRadiusAtV7,
  validateMatchSetupV7,
  validateMissionDefinitionV7,
  type CoordV7,
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
 *
 * Exploration after placement (`pulp_wars-hmyk.17`) changed the builder
 * without an identity bump, so every mission whose seats gained explored
 * tiles took a revision (the old saves are refused as stale, not as a
 * failed replay) and was re-pinned in both tables.
 */
const PINNED_MISSION_HASHES: Readonly<Record<string, string>> = {
  // Re-pinned by map curiosities (`pulp_wars-737.2`): the setup's
  // `curiosities: false` and the empty `curiosities` list.
  "TEST_GROUNDS@1:ORIGINAL":
    "cdd43baf94ec2b7c8961a1b0732a381b281e6ea080ac79f91942c0eaf6b634aa",
  "TEST_GROUNDS@1:GOBLIN":
    "ed51a42b3e6e2a758ff872658f2184685002d92cbe761958ee4a1914dd91c9bc",
  // The AI-directive fixtures (`pulp_wars-68k.3`).
  "TEST_RUSH@2:ORIGINAL":
    "57c12283a924c25dcbdc9f00e256303b47a1712e31601df8a11787c644f0f2be",
  "TEST_HOLD@2:ORIGINAL":
    "5d4dfd698a664b552fa693d233df7011d403d6c76f44761a49dcef8167c03fa0",
  "TEST_GUARD@1:ORIGINAL":
    "75569e71228d50c8bdf4977e655316676c8f0b626a657b8c6c00bf5cefc31a50",
  // The ASSAULT fixture (`pulp_wars-v642.5`).
  "TEST_ASSAULT@2:ORIGINAL":
    "9f6ff69100ec1b2bdddfce1bca09378cef8b6e4ef776c0f01138e57868574449",
  // A GUARD whose others assault (`pulp_wars-v642.10`).
  "TEST_GUARD_RAID@1:ORIGINAL":
    "e76f3f18fa2fc91c1af603b1effe78f374d1240cc3bca9ba1dd16c8d59f9b65e",
  // Chapter One (`pulp_wars-68k.4`).
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  "FRONTIER_1@4:ORIGINAL":
    "395f2a0474bbdc2085ab047d359da76ccfd25f2e90df86de4def525c2443a1d6",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  "FRONTIER_2@4:ORIGINAL":
    "ae50b8841ba0ad5b9e9cc54df3df67b50fc005ae5681594d29893fa9e9720cb7",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  // The danger pass (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_3@6:GOBLIN":
    "f54d2739467d7766cd53c4110bfbcfa9685faff46986a61307f00ac00b9cf3f2",
  // Revision 2 (`pulp_wars-68k.6`): Sawmilling forbidden, two starting siege
  // units for you, a Skeleton in the Lich's place.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@7:ORIGINAL":
    "6d7001fedc26b73409b913b1c0259bc426d3b1a060cc1bc24ea08263711bf42a",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@7:GOBLIN":
    "467f923ffd7507c76e1c95158deb6102cb3aed6f552f80cd16c72622d268a9eb",
  // Missions 5 and 6 (`pulp_wars-v642.2`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // The danger pass (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_5@4:UNDEAD":
    "2c49e2e236c0b5d84aab66f4533d6d7549ef59d05fec58dd8f874dba835acec4",
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  "FRONTIER_6@3:DWARF":
    "457b0fafa951d2708d6af23c83242ebc1411d8f7cbed9929229d7b5675e88e54",
  // Missions 7 and 8 (`pulp_wars-v642.3`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_7@4:ICE_FOLK":
    "68e53d55925f7dd58c6265267989bcd1f73e7864a2521e1e9d93a0c87e0863ff",
  // Mission 8 as a build-up (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_8@4:DINOSAUR":
    "374bfe151fe61dcad29176ac7327d4c0031d00f042e0e4ab753d0615f5a367a7",
  // Missions 9 and 10 (`pulp_wars-v642.4`); mission 9 with less
  // pre-research (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_9@4:MARTIAN":
    "b7d794a0ba11c0b46bc6da0c16f560fa84d2188a18edf0157fe1e88a5076e6aa",
  // Mission 10 replayed on the corrected Cult AI (`pulp_wars-v642.6`): revision 2.
  // The Cult redesign's roster (`pulp_wars-mch9.31`): revision 3 (the Chosen
  // and the Caller of the ring are an Idol Bearer, an Initiate, and a Hexer).
  // Its retune (`pulp_wars-mch9.46`): revision 4 (the lodge owns
  // Engineering and Gibbering Masses and starts with 8 Favour).
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_10@6:ORIGINAL":
    "2f3915324a118a83c806e256e8ceb3d2b1a41d5b80b043e7b492c4374c5494c5",
  // The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`).
  "HUMAN_1@1:ORIGINAL":
    "ba75ade202d005fe8a6cd1db656371bf6404054dd8698435cc76acf92498a8a4",
  "HUMAN_2@2:ORIGINAL":
    "d0d5bbea630a8d8ff65de26217b9f0ae25ebd4464ba135ab0e6fb2746a0ae02c",
  "HUMAN_3@2:ORIGINAL":
    "650cca831bc048d76fac8faae3e037175c2c34ee8a5ee86d5d26817b93e57ce0",
  "HUMAN_4@2:ORIGINAL":
    "6bc84c212f80cb900ef34554476c5ad09ab0f4e29633789e06d405502c469c4b",
  // Mission curiosities (`pulp_wars-hmyk.14`): revision 2 of each, the Sea
  // Serpent in H5 and the Tesla Tower in H6, and the hidden fixture.
  "TEST_CURIOSITIES@1:ORIGINAL":
    "9b6a41cf850a6551d45396582fe72045f56ce02f4c4b970b247e9afb71dac4d4",
  "TEST_CURIOSITIES@1:GOBLIN":
    "ed95462583b0f54b4a3ffd614617928995af2452bb4dc78049fc6bacf57d3a04",
  "HUMAN_5@3:ORIGINAL":
    "e9e32eb797822002ece1bf424d2513e613513b6c4339ea982e80941ab11fcfa8",
  "HUMAN_6@3:ORIGINAL":
    "63fd349ac8c5d2729927a65c57c148e5387643472471d8a11384d6101b1bc643",
  // The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`).
  "UNDEAD_1@2:UNDEAD":
    "858de9b7deb0a732afbb6a6f565f4bed14f1a3fa8e791d6f456238910a95e222",
  "UNDEAD_2@2:UNDEAD":
    "0caba72cac57af0467aad77b9dd22a76c2c665e25dcbab04e0fe4e77aefd5607",
  "UNDEAD_3@2:UNDEAD":
    "15c7509f41763e600e1a43a996d7aa10cb8b147a1167d3ab2134236652969474",
  "UNDEAD_4@2:UNDEAD":
    "dc9ce03f2de0cca1c6bf6a94e00741db378cea8e928a7cca05919789927159b0",
  "UNDEAD_5@2:UNDEAD":
    "277130e958be67ca9aba9d2915e0785b96c506ec250d3b71d520641d61d6d964",
  "UNDEAD_6@2:UNDEAD":
    "06718020cfbc796ccb740d0d12816a286326f3b47f69a70dca5d1c5a6d09fc19",
  // The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`).
  "DINOSAUR_1@2:DINOSAUR":
    "eaac803a529d31c447286c9780976852950fd1600daa46361f65d6eaf66569b1",
  "DINOSAUR_2@2:DINOSAUR":
    "1b6ae2458493449ca0a74d7a95368647fec7e93842765f8d6ab565d9c94b89d5",
  "DINOSAUR_3@2:DINOSAUR":
    "94c3791d5caad014ac15fe78c7d30beec283d67d9a0d36f3534360b6b091631c",
  "DINOSAUR_4@2:DINOSAUR":
    "89640d21e532a48fb2e2b81020a74215cbf9755ab451bb21cd43a328e45d0046",
  "DINOSAUR_5@2:DINOSAUR":
    "b8c8f545e2c50e926f1436de758085dbaa7eebdeb00b89075b21c3b19818e95e",
  "DINOSAUR_6@2:DINOSAUR":
    "5f6eefd3f97886e8234a6260fd34dc091872a80125fe59e44c4bb067a48fb559",
  // The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`).
  "MARTIAN_1@2:MARTIAN":
    "e7be3d20e3c97d2d730c2805a757b5c1dfb8b141702ae99cf41176925a0644c1",
  "MARTIAN_2@1:MARTIAN":
    "b321fc9d9e1d4e49e908188dc09103210107d1ed0e6b386677ac430d099cd079",
  "MARTIAN_3@2:MARTIAN":
    "5c3e0a62082c99e12ea20eac5e56e77af269503a82d3ef2742533cfbae997ad5",
  "MARTIAN_4@1:MARTIAN":
    "5717d65020471f2dce8b42127f989fc6285eec9b00fc7ed475f7d17c56cbe1e0",
  "MARTIAN_5@2:MARTIAN":
    "c45f83a773ba9df915830c4a96c7ac583cc013c360060c3e15af1bc985ad43dd",
  "MARTIAN_6@1:MARTIAN":
    "e0f6a063d1ac167990766b10e41fae7f229a9767ba50e5b0fcce91c23f6f80b9",
  // The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`).
  "GOBLIN_1@2:GOBLIN":
    "eef71c4226dfc8806e0b5e98806fda8183b8a2ef94e383a39b25853e1b166d7c",
  "GOBLIN_2@2:GOBLIN":
    "b3d1f1059a22d4c2258a0833f42ea1fd8d75b3e961043e2c566b9173d81a1f67",
  "GOBLIN_3@2:GOBLIN":
    "c3a222aee7ec2514a26259872e3ceb0e87346b64143ae20b9bf9dd15d76a3529",
  "GOBLIN_4@2:GOBLIN":
    "03382b5f3f3e8adf0fb830517f57be103d76f1840d0c3554be2b5aafcb797032",
  "GOBLIN_5@2:GOBLIN":
    "00d6bcad4bf3fa8aefa1772a02bc879191d338e2ccd579b48dc06211587bc679",
  "GOBLIN_6@2:GOBLIN":
    "5f9eeea3b521327921cf68ba5511fd04569a1fc867997bff37b219acdd136aa5",
  // The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`).
  "DWARF_1@1:DWARF":
    "a0bb401b2f20df29125b8a8d3c45d4a02ee6d418a03cf45ce258a19ea0417ebc",
  "DWARF_2@1:DWARF":
    "6280a5c8886887d513551d77652aa64121cf3bc09e9715d11d6adb1ee79f7dc9",
  "DWARF_3@1:DWARF":
    "f5fa4aa8411ff22ca2537e1314387011ec585beaa3d5f058b5bf33487fe524dc",
  "DWARF_4@2:DWARF":
    "7959bb1565764432a0a8f332351719a1702019c90f988ae19d3bcdfbdd3b807e",
  "DWARF_5@2:DWARF":
    "8f8702bb2efd464d9dd84349f0e30db2034478ff861c095e3bbd359e49bbe2ea",
  "DWARF_6@2:DWARF":
    "9c02798c4c5e2dd635288253a67ed2545dfb15e63e640e942a3cd1a98436b4a1",
  // The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`).
  "CANDY_1@1:CANDY":
    "a3ddb2e1bf2df1846e01de9906d794916de02cff821233681ac5300203bc4901",
  "CANDY_2@2:CANDY":
    "ba21a3716e91a6a01e6b72a733e215083dc8dcdd70ad5ba587d8ba022b5af0ee",
  "CANDY_3@2:CANDY":
    "6f6eab2d2a4b63ad6ee7c894f9a8696b88230d3b589c34d3aa984e27d81712e5",
  "CANDY_4@1:CANDY":
    "2566eebbe46c96f1a086cd9de27b80cc50503663fa7b1da893e4c68706c6d25d",
  "CANDY_5@1:CANDY":
    "850817bce49333a8259db6c14a497c384633c97d25b2bb4df7feb53242dda886",
  "CANDY_6@2:CANDY":
    "b55c2dc0c1ef55767a50e8a05c6d2f3b43fef36a19666f37475b8d32d9dae296",
  // The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`).
  "ICE_FOLK_1@2:ICE_FOLK":
    "d30877452340ef8c8b13a34713891cb71e0205c5d6081c5c600a88b18e6f4cd1",
  "ICE_FOLK_2@2:ICE_FOLK":
    "9db4556e89bc8bcd40c7fc30add154119158e50fd47d7b27164895c0b71693cf",
  "ICE_FOLK_3@2:ICE_FOLK":
    "7023c460b99bf731b03ba13bdfff6487078632524ece71f2aa245962c1acee42",
  "ICE_FOLK_4@2:ICE_FOLK":
    "e669306acbd2c9eb3f8f6a26d1e23e38bebbd31cb3ff03478eb0bc2b1f5612f0",
  "ICE_FOLK_5@2:ICE_FOLK":
    "46dc8cde7a1028c8c1c69c55a74f9ab74182fd25485de08bc659fa62b22402c6",
  "ICE_FOLK_6@2:ICE_FOLK":
    "9aff66c0bab40ac35c5ddc5a97f2a6411b17cdd211aad640b0374af4f681e86a",
  // The Cult campaign, "The Long Night" (`pulp_wars-hmyk.12`).
  "CULT_1@2:CULT":
    "74735d2378dbb12abafc1d2d316fe636165432690d362ddfaf844514bc9bd5a6",
  "CULT_2@1:CULT":
    "794685436ad0729c0c021ecb228a21ea675938f78b579069b07eeb4b139b4685",
  "CULT_3@2:CULT":
    "24e88decbe9ea1dcabae4e0c221816a9d9605e09e7887f170e1f50b7543fc421",
  "CULT_4@1:CULT":
    "4046ad1a553206444436fde34b70f2cf449abfc5091eaf9add762d225d3973de",
  "CULT_5@2:CULT":
    "4bbd95458e096153e33ed211a30e17c2d1b1f15d173ef64b2d2b6abf3fe019ac",
  "CULT_6@1:CULT":
    "a42b8554404ab3df6bd14e6d44ff8e54cb161128a7a84bb1fe79e6cce1d178fc",
  // The siege fixture of the Normal AI (`pulp_wars-68k.6`).
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  "TEST_NECK@2:ORIGINAL":
    "df0cdf7c6c70ded79dc9b66eb620466e8be7a26d43450971d0a409e3432de2a9",
  // The Human tuning labs (`pulp_wars-w49.3`, tuning 4).
  "LAB_SIEGE@2:ORIGINAL":
    "f87fce47729afdb041d516f90c70dc3d36a20ca4ae34d0a808fb49e2f11e666f",
  // Tuning 5 (`pulp_wars-w49.4`): revision 2 of both, with Swordsmen.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BACKLINE@5:ORIGINAL":
    "de892b957336eea02d8f70d1371204736f405caa9dbbce4e053a626c1234804e",
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
  "TUTORIAL_1@2:ORIGINAL":
    "e7f762c65bfdac5321858dc9393a427690029ef587dc2fbb74e603edaf531686",
  // The objective fixtures (`pulp_wars-v642.1`): escort, survive, capture
  // with a deadline and an ally, and kill.
  "TEST_ESCORT@1:ORIGINAL":
    "0d59aa296b814e5e73a4e227bb7fb12170e055490a26ac51f9dc90ffe2dadad0",
  "TEST_SURVIVE@1:ORIGINAL":
    "a182fcdd2eeea0afa0bfc11a87aaf944b85159a255aa94cec7607d33c0b108e6",
  "TEST_CAPTURE@1:ORIGINAL":
    "c1a9c6e665e9e14c05ac8a5491ccf63ed521856a59244947320947660caa2553",
  "TEST_KILL@2:ORIGINAL":
    "0a7408f6725aae0e87010f16faa64a9b084b9c0a860b9e337d9f5e365925619c",
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
  "TEST_RUSH@2:ORIGINAL":
    "1e2b4e42b2101ade127c70356819ccbc045219ade3a1a093e5e12b8242a92336",
  "TEST_HOLD@2:ORIGINAL":
    "7d4bee2bfb5645288a7b9c8b755c5a7462d2537dc626dcba78dcd64f5d5fe739",
  "TEST_GUARD@1:ORIGINAL":
    "493749a981bcc06da8f1346adedfef54c1dd0d6a491e7167376f4a8cceb5432a",
  // The ASSAULT fixture (`pulp_wars-v642.5`), added after the curiosities.
  "TEST_ASSAULT@2:ORIGINAL":
    "4bb5cffec15344cfd0105fac241ea4bbb1c56212b93917050f49f8e7a92121a0",
  // A GUARD whose others assault (`pulp_wars-v642.10`).
  "TEST_GUARD_RAID@1:ORIGINAL":
    "d0c785306b57828a5f7fdcc436464f47c02a80852d93adbd784277166d1be1cb",
  // Chapter One (`pulp_wars-68k.4`), added after the curiosities: the same
  // states with the two curiosities keys left out.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  "FRONTIER_1@4:ORIGINAL":
    "c79d8a77cc67e46047f9a9a9256626094f757b69678030fca780bb948c427ce9",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  "FRONTIER_2@4:ORIGINAL":
    "bea27783827641a38a785a1383fcff8ab3d1a406684c9908859ea626d8b70136",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 3.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 4.
  // The danger pass (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_3@6:GOBLIN":
    "ceb52da2bef332aad435598d33e3dab33f1f358eee44ad7f45345e33b959ecb2",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@7:ORIGINAL":
    "eeb9e6e4a7df9624ae7c03df489e956d49edcd806e29ff5d67b5ed286a42b60d",
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 3.
  // Natural maps and objectives (`pulp_wars-v642.1`): revision 4.
  // The campaign difficulty pass (`pulp_wars-v642.7`): revision 5.
  // The danger pass (`pulp_wars-v642.10`): revision 6.
  "FRONTIER_4@7:GOBLIN":
    "d123c5635c3bdaf56c8d1fad63820e601a4abdca7ecac6f8b76eec1cd6cfc331",
  // Missions 5 and 6 (`pulp_wars-v642.2`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // The danger pass (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_5@4:UNDEAD":
    "ccc728674c064a0ec4631416349034bac368ad3e496293acd3ce9b1d24c80a4b",
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  "FRONTIER_6@3:DWARF":
    "a2f525871e83e6fd258c8a8f69604f185db85d1e7d8143416b9627b89d0c06cb",
  // Missions 7 and 8 (`pulp_wars-v642.3`).
  // Campaign difficulty pass B (`pulp_wars-v642.8`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_7@4:ICE_FOLK":
    "d5a0cd22745b554b2bc9cc2fca91adfbd66703bc70cf75fc00eee537f1cc9363",
  // Mission 8 as a build-up (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_8@4:DINOSAUR":
    "face1b77ad92923813440f78a0beb9c3fae87bc9e4859fe40cc3d6d28afbf692",
  // Missions 9 and 10 (`pulp_wars-v642.4`); mission 9 with less
  // pre-research (`pulp_wars-v642.9`): revision 2.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 3.
  "FRONTIER_9@4:MARTIAN":
    "ae8dfd75312d2f76317b5661c525c71c065e20c8ed3fbcf539d6cef9fcdd150e",
  // Mission 10 replayed on the corrected Cult AI (`pulp_wars-v642.6`): revision 2.
  // The Cult redesign's roster (`pulp_wars-mch9.31`): revision 3.
  // Its retune (`pulp_wars-mch9.46`): revision 4.
  // Campaign danger pass B (`pulp_wars-v642.10`): revision 5.
  "FRONTIER_10@6:ORIGINAL":
    "843fe7ac1602a90022a9c9cfa02a6cc3052e2e92134af0445026a8c125aa1e4a",
  // The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`).
  "HUMAN_1@1:ORIGINAL":
    "3ee8bb1f6f874afa324696dbb3060091f24308cc62b748ef5ce2bfc8ac4e7e3f",
  "HUMAN_2@2:ORIGINAL":
    "9da81f28d3124c62af1b1178c9dba4d5fd82c51a9f3706cc512601ee022d7426",
  "HUMAN_3@2:ORIGINAL":
    "f0ff6af1a24c1f5fcc51a6e57df3b0f348f52173d031e61e5a1b8f088861e586",
  "HUMAN_4@2:ORIGINAL":
    "8be19bfb3048920372f27f4edd804bbb16b6e56f372ecf201f3e169111e41597",
  // The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`).
  "UNDEAD_1@2:UNDEAD":
    "d9d4aaef60c1c1fb5c5f633bc08dbca3f88b60630edac7eab8a19e956ef24f90",
  "UNDEAD_2@2:UNDEAD":
    "9e6b5a57db321ac3b275923abfec3e711c2352e2a6fb7abba979d8848a89de31",
  "UNDEAD_3@2:UNDEAD":
    "671605d0cd54ceb193caa267aef680e8ccd3816844ff031a1e962eeca38ba835",
  "UNDEAD_4@2:UNDEAD":
    "950e3d25346ec8a5c1a03b69aff64e04a23220468def6b6b8d0647784aa57c3c",
  "UNDEAD_5@2:UNDEAD":
    "b56ae4ac9e42b7eb3d9f2a547b09f99d93c68713978a215e5e23d510a728ea13",
  "UNDEAD_6@2:UNDEAD":
    "9e15745684fed4c4c3ef57934d8c6de2d4d413ba603ecb0f6ed744b5eef53cd5",
  // The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`); the Sea
  // Road (`DINOSAUR_3`) places the Sea Serpent and has no pin here.
  "DINOSAUR_1@2:DINOSAUR":
    "e34ec8cef10d768cd5cc9e1760e93e412d4c99064098151d86644a9570bfce5b",
  "DINOSAUR_2@2:DINOSAUR":
    "2b9d2d55ffe8824e86cdcf0c13d16e2a069257eb62c24d6e1f824ad10c41799e",
  "DINOSAUR_4@2:DINOSAUR":
    "b42ef48303653026a2f022a6517fd98262a2524aef837f81590b0cfa33169733",
  "DINOSAUR_5@2:DINOSAUR":
    "fdf0b7b4874cb853d02608fe8bec0eed347f21398a8248d47e148f11f4034ffb",
  "DINOSAUR_6@2:DINOSAUR":
    "9cb11e53354bbe4d325224ee4b117dd87c35702dc5f7f4ee8953fc399282f9b7",
  // The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`).
  "MARTIAN_1@2:MARTIAN":
    "b0e34a02178d1e7f337814ccb3797849ea2d3fb535b59abf6eef46d1f237c253",
  "MARTIAN_2@1:MARTIAN":
    "00bdac1aea7f297c485297a57a4a0a11dd8066b377d5f1c55cbc9b5f94bc6fdb",
  "MARTIAN_3@2:MARTIAN":
    "4733ea4461513ac885ece22d3fafee7a779c0b5e9524e88dc56b1a8b730d1472",
  "MARTIAN_4@1:MARTIAN":
    "e5a7d24e34e012ff120791f0d93a2d298f7a35661b8df6e8381a7bfbc248d71f",
  "MARTIAN_5@2:MARTIAN":
    "8d46d2af9a739785d604c965d899ed12c4a2505e05cfe6d4ee51bc29f62721c2",
  "MARTIAN_6@1:MARTIAN":
    "5d21a6ed7335a806f76708054f00aa56ebbd8a153aed9c0369005472714ce701",
  // The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`).
  // GOBLIN_4 places the Moon Gun, so it has no pre-curiosity pin.
  "GOBLIN_1@2:GOBLIN":
    "c6cffa347a2755ad9487dde836450693c64a145750f92a7f3b2886390e883773",
  "GOBLIN_2@2:GOBLIN":
    "1604ef3a161519fe71b0c967985990e4fdeb8df9826ba7dca6e40f63f6b7d5bd",
  "GOBLIN_3@2:GOBLIN":
    "731eb366346ec099453714b7884d7c9adc8f8f3bc18a0d9a3d89d5e3539e5b12",
  "GOBLIN_5@2:GOBLIN":
    "c5b548dea9e8a33fda0ac9cafb978eebc2cecdefcfe2c95a6c0cee765ecb1279",
  "GOBLIN_6@2:GOBLIN":
    "2121a834eec91c83be910a0f344a7c65a080e995597952201875fb290498118a",
  // The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`).
  "DWARF_1@1:DWARF":
    "fde7575e484f73ade3c7891f091121f4322002e4c1b047259cf9bb29afc36976",
  "DWARF_2@1:DWARF":
    "27323833aaa3e9eff1e9bc64fec3d044bbf35bfd32b549c360c3e8b6c3497e14",
  "DWARF_3@1:DWARF":
    "0d4b6cb44239b45a9ac6cf94c8fc06782d9fd5888d102d97b55ecb207d422469",
  "DWARF_4@2:DWARF":
    "3419affb64c4434538c95daad79e79f41c35435cd99b1181b9fdd69069eaa0f4",
  "DWARF_5@2:DWARF":
    "a70ffb26d70c1212cf58029c8260ac518282b7b5524df92b45b7cb52b23a5b30",
  "DWARF_6@2:DWARF":
    "df6fc764953dc47e6830e634807c0497840e9ba4e0a297cf599ab2443d8a7b55",
  // The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`).
  "CANDY_1@1:CANDY":
    "e64cd935aeee550160d803d8fae5db8b7125a913dbe210aeb460086c625b695f",
  "CANDY_2@2:CANDY":
    "06c78051a18c0e3502f438ed71c06e587e699650a617dd0852981dcad80f9ea7",
  "CANDY_3@2:CANDY":
    "fc8d85aa3f9cce6978b7d38b8673b2ff17a09dc3110e2b7b74fc5149c11f1e00",
  "CANDY_4@1:CANDY":
    "2c658acbb487615bddd86d5134dbe2b51086ba9b1cc8b7c951d47fadf36124d5",
  "CANDY_6@2:CANDY":
    "8ab80f2a1eed5df3049c27cd57a63eaa7a29755dc2a984de2a37e5237630df82",
  // The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`).
  "ICE_FOLK_1@2:ICE_FOLK":
    "e6469d86e93440ba7ca992fc7ab8b763eb016032fbaba0e1244b2e98fe3bb9c5",
  "ICE_FOLK_2@2:ICE_FOLK":
    "6ee59e19cdb191fbf5441c415c390b0fab5ea36dc3a0da9be0814e0fdac71dae",
  "ICE_FOLK_3@2:ICE_FOLK":
    "5371c208ef8838ddaccf3820c823be8cae4c7542e17425f1239d3a30792c5db0",
  "ICE_FOLK_4@2:ICE_FOLK":
    "16886208e26b8a5ddbac470cba34be01725f49e24512bac4b0e357461af94941",
  "ICE_FOLK_5@2:ICE_FOLK":
    "442dffd858012c0d69f465c7ef710a8c436c993d8377674bea89f106bd0ef25f",
  "ICE_FOLK_6@2:ICE_FOLK":
    "e0cb357e1392c64879562b9541fa7e054d3e8d6de20b7676c67b6344e74db7ee",
  // The Cult campaign, "The Long Night" (`pulp_wars-hmyk.12`).
  "CULT_1@2:CULT":
    "002fd1fe0b4fb4df60df06b6443a5cb1c657c804053c6b4a278e564a805f7b4a",
  "CULT_2@1:CULT":
    "70422b0b6047c373905561795510f99e9cda04bc89f3b02ccfe01935dfd87031",
  "CULT_3@2:CULT":
    "456fd1f4cd11e22ee16fd095403eff5bd4ebf34760b23f61b1eb47330c720e03",
  "CULT_4@1:CULT":
    "4a353f87ebadd854fdc1ebe18071803e55ec0c76122351b4f6c6269dbbfd4f74",
  "CULT_5@2:CULT":
    "3b5b6b4df0f604d88eeee4227acc7209b688a06bb4f6eb81b2cd53a9639c8bc0",
  "CULT_6@1:CULT":
    "99b2ef34ad36010782776c017337f88b9af6bff8f20d00f201dac13a244d2028",

  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 2.
  "TEST_NECK@2:ORIGINAL":
    "32595babd0a4d5371b260320b8d360786ba69b01808d2716eaadec332213500e",
  // The Human tuning labs (tuning 4) were never built before map
  // curiosities; their digests here are the same reduction of the state.
  "LAB_SIEGE@2:ORIGINAL":
    "abc6246d3b844e17ca1da5d6249837f33010b13f56e5ea8cec29d16504ebd1b6",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): revision 3.
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): revision 4.
  "LAB_BACKLINE@5:ORIGINAL":
    "55e68385ba32631b2ed00ffeac93bbd350780b871e284dee2252cb0793b69b33",
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
  "TUTORIAL_1@2:ORIGINAL":
    "e4f0764eaca0130db62162c634fe3fe4a48c03ceb631b6437238fb83b3aafcc7",
  // The objective fixtures (`pulp_wars-v642.1`): escort, survive, capture
  // with a deadline and an ally, and kill.
  "TEST_ESCORT@1:ORIGINAL":
    "6621c2ebd6bbdd5938cd2d1e6722157e60f3ea7633a5ef114684a9b65a6592ff",
  "TEST_SURVIVE@1:ORIGINAL":
    "16ca39ad86c7548c276066af2086cd722b551e852067c0da2b6baf3bc37c3a4c",
  "TEST_CAPTURE@1:ORIGINAL":
    "932a21d3cb32380ba5492e2a1164fc9a2c1d40d76b2f9eaab343d5fbe9545662",
  "TEST_KILL@2:ORIGINAL":
    "bc3da2c593cd0fe485dc3fae46adaa1bb14af40f07016b6bb6bfb66b63ed608d",
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

function coordKey(at: CoordV7): string {
  return `${String(at.x)},${String(at.y)}`;
}

/** The cells of the square of `radius` around `center`, clipped to the board. */
function squareOnBoard(
  size: number,
  center: CoordV7,
  radius: number,
): CoordV7[] {
  const cells: CoordV7[] = [];
  for (let y = center.y - radius; y <= center.y + radius; y += 1)
    for (let x = center.x - radius; x <= center.x + radius; x += 1)
      if (x >= 0 && y >= 0 && x < size && y < size) cells.push({ x, y });
  return cells;
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

  // `pulp_wars-hmyk.17`: no seat starts with a unit or a city on ground it
  // has not explored; it sees what its units see and its cities' land.
  it("starts every seat with its units' sight and its cities' territory explored", () => {
    const missing: string[] = [];
    for (const mission of MISSION_REGISTRY_V7)
      for (const faction of missionSeatFactionsV7(
        mission.seats[0] as MissionDefinitionV7["seats"][number],
      )) {
        const setup = missionMatchSetupV7(mission, faction);
        if (setup === null) throw new Error(`${mission.id} ${faction}`);
        const raw = createInitialMapStateV7(setup);
        if (!raw.ok) throw new Error(raw.error.code);
        const state = raw.state;
        for (const player of state.players) {
          const explored = new Set(player.explored.map(coordKey));
          const need = (at: CoordV7, what: string): void => {
            if (!explored.has(coordKey(at)))
              missing.push(
                `${mission.id}:${faction} seat ${String(player.seat)} ${what} ${coordKey(at)}`,
              );
          };
          const own = state.cities.filter((city) => city.ownerId === player.id);
          for (const city of own) need(city.at, "city");
          for (const tile of state.board.tiles)
            if (own.some((city) => city.id === tile.territoryCityId))
              need(tile.at, "territory");
          for (const unit of state.units)
            if (unit.ownerId === player.id) {
              need(unit.at, `${unit.role} on`);
              for (const at of squareOnBoard(
                state.board.width,
                unit.at,
                unitSightRadiusAtV7(state, unit),
              ))
                need(at, `${unit.role} at ${coordKey(unit.at)} sees`);
            }
        }
      }
    expect(missing).toEqual([]);
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

  // `pulp_wars-hmyk.17`: exploration is completed after placement.
  it("explores each seat's cities' territory and its units' sight beyond the reveal", () => {
    const mission = edited((base) => {
      const human = base.seats[0] as MissionDefinitionV7["seats"][number];
      return {
        seats: [
          {
            ...human,
            // No reveal at all, and a Land Grant at the capital.
            reveal: { radius: 0 },
            cities: [
              {
                ...(human.cities[0] as (typeof human.cities)[number]),
                landGrant: true,
              },
              human.cities[1] as (typeof human.cities)[number],
            ],
            // A Fighter in the field, far from both cities.
            units: [...human.units, { role: "FIGHTER", at: { x: 5, y: 4 } }],
          },
          base.seats[1] as MissionDefinitionV7["seats"][number],
        ],
      };
    });
    const state = buildMissionStateV7(mission, groundsSetup());
    const human = state.players[0];
    if (human === undefined) throw new Error("no human seat");
    const expected = new Set<string>();
    // The granted capital's 5 x 5 and the other city's 3 x 3 territory.
    for (const at of squareOnBoard(11, { x: 2, y: 8 }, 2))
      expected.add(coordKey(at));
    for (const at of squareOnBoard(11, { x: 2, y: 3 }, 1))
      expected.add(coordKey(at));
    for (const unit of state.units)
      if (unit.ownerId === human.id)
        for (const at of squareOnBoard(
          11,
          unit.at,
          unitSightRadiusAtV7(state, unit),
        ))
          expected.add(coordKey(at));
    expect(new Set(human.explored.map(coordKey))).toEqual(expected);
    // The field Fighter sees its 3 x 3, outside every city's land.
    expect(human.explored).toContainEqual({ x: 6, y: 5 });
    expect(human.explored).not.toContainEqual({ x: 7, y: 5 });
    // Sorted by (y, x), each cell once.
    expect(human.explored).toEqual(
      [...human.explored].sort((a, b) => a.y - b.y || a.x - b.x),
    );
    expect(human.explored).toHaveLength(expected.size);
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
