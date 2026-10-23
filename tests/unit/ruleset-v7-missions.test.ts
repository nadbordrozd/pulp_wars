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
  REMOVED_MISSION_DIAGNOSTIC_V7,
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
  // The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`).
  "HUMAN_1@3:ORIGINAL":
    "0c888b2127b691da195b1193bd7c250eaf022f15d9c7fa7ac0cea7f7c5edf140",
  "HUMAN_2@4:ORIGINAL":
    "9d956accff01f73a82f644a9b8bea94e4052b21af99632689901037a3316dc09",
  "HUMAN_3@3:ORIGINAL":
    "030ad52e5d14807f379a04bb5fe7c9579908d4a7c1033aeb8fe1b8a9b8b1c649",
  "HUMAN_4@4:ORIGINAL":
    "0d7dd1400840d74684dc9a7514a7adc6cf8dda19086d5be4e3274d9429202b2a",
  // Mission curiosities (`pulp_wars-hmyk.14`): revision 2 of each, the Sea
  // Serpent in H5 and the Tesla Tower in H6, and the hidden fixture.
  "TEST_CURIOSITIES@1:ORIGINAL":
    "9b6a41cf850a6551d45396582fe72045f56ce02f4c4b970b247e9afb71dac4d4",
  "TEST_CURIOSITIES@1:GOBLIN":
    "ed95462583b0f54b4a3ffd614617928995af2452bb4dc78049fc6bacf57d3a04",
  "HUMAN_5@5:ORIGINAL":
    "c971970323a88eb90981f72ed548206d6dda70c2cc50b3d16e8b930147d8eb50",
  "HUMAN_6@5:ORIGINAL":
    "e86b7c56a70b01e61deb39f9d7b23bd8d54c1d2e093bff0d7b0d079dc81d1ef7",
  // The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`).
  "UNDEAD_1@3:UNDEAD":
    "3ae6a9a029fd869d12295e1273510c9cee4839a585e1008e2c44790801f7c96f",
  "UNDEAD_2@3:UNDEAD":
    "47e7384bac2d20277226444d8fe8fcdb6bfde173bcce943a2d3a6838c6369700",
  "UNDEAD_3@3:UNDEAD":
    "d0bc9a118d437b71754f70017ddee8e8cdcbe5b660dd305c7658e22c4737081e",
  "UNDEAD_4@3:UNDEAD":
    "21aef7ded19ba44f43b5d5ace7c7c610a2cb37cfd1fa66dee19994c345d4a8af",
  "UNDEAD_5@3:UNDEAD":
    "e698cf67c7732eca0bb87a18372bf3378e5dd5a9203516c6a36d4beb43403651",
  "UNDEAD_6@3:UNDEAD":
    "ed0ddf43982210061da9badf3c410dde9c3561677fe90479657d257db8c87174",
  // The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`).
  "DINOSAUR_1@3:DINOSAUR":
    "11832ac6b4da22f9cf9541320f7a79f188a3e020a98c6e23104e4d696d88598b",
  "DINOSAUR_2@3:DINOSAUR":
    "ac430a61deb12455c83d93878a6d45eb0319c37e2c6f473151bd517f170ebd85",
  "DINOSAUR_3@3:DINOSAUR":
    "aa35642ce00fa7b5e7dac1e0e5a4b41e41a878a4ad481878941c819f08e4fc9a",
  "DINOSAUR_4@3:DINOSAUR":
    "17d9e1a145f1d12c9aaad77974fca58b467ae6e5ee1160293133d861895219ad",
  "DINOSAUR_5@3:DINOSAUR":
    "07e04f842e83b28ed0be58f131e60456b24f92699327c856fc503e7c60ffa172",
  "DINOSAUR_6@3:DINOSAUR":
    "76430d187f34b6e357930dba9b200f91560ce4eabf374bb0783586df3a7c3600",
  // The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`).
  "MARTIAN_1@3:MARTIAN":
    "3ddf44bbf6bebce7d92faa7878cf0876025ed61ea57da9bcbb489df09e152fb3",
  "MARTIAN_2@2:MARTIAN":
    "f46690a979ace672bf182add8245fbd8f376f9fdc31ccefd20119e0474c8ff5c",
  "MARTIAN_3@3:MARTIAN":
    "164a1bc39f61a7148cad8fa1dfa4fdacf6f7c770073dbf5d68a455ee4b6eba38",
  "MARTIAN_4@2:MARTIAN":
    "0d83b23fd4427aa65a607590d902c7abb03fc183e920dece1df2c6394c168871",
  "MARTIAN_5@3:MARTIAN":
    "e648873c59db4b4e5200dcd8278f042b3953aa667344e5b5ca07e7081ddd2fd3",
  "MARTIAN_6@2:MARTIAN":
    "486ea7775e9d7b2fdd4f3d42ed465a42d635161f74938d7072386fc3b194a9c6",
  // The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`).
  "GOBLIN_1@3:GOBLIN":
    "60ade732ff0e97525be00f6b93b0b05c7c75192a511c9078f21615762336b900",
  "GOBLIN_2@3:GOBLIN":
    "0680b5c1a07903f63df4cd1ae9569d1c009ecf81bd760d9c8414f6cf2252bb94",
  "GOBLIN_3@3:GOBLIN":
    "75fa3f063ca67e52406ab40840770ebd75aecd513694fdc902e7ffef04b72288",
  "GOBLIN_4@3:GOBLIN":
    "4c0f5fe48d04bfe56110d89923eeca4089536983d023d433e51b74645bf81e81",
  "GOBLIN_5@3:GOBLIN":
    "dd233c3d9b4b13fa69b857a987617c3bbec15b3675906b6aa58d2f5284d9e41b",
  "GOBLIN_6@3:GOBLIN":
    "268f9a16b9607152b83ef4ab4307ff69fab80a30d41e6b55c293163fbd5b9c61",
  // The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`).
  "DWARF_1@2:DWARF":
    "35f7c8490ffce41390a0ee6763514249ccd84115b7937d193c2f374076d63ae1",
  "DWARF_2@2:DWARF":
    "9baa48ed01bb8931ef553635149020d7ab4ff3eabf089f9001fcbb0f2bc5eb48",
  "DWARF_3@2:DWARF":
    "0d892cc7c10236ff125be05d8f1857db7c9668ffe21534cfa2e774fc0de97c39",
  "DWARF_4@3:DWARF":
    "33a9863517235c084468bce1ffcb5713d1dad4b4bd5e64de4f464fe8078df0e1",
  "DWARF_5@3:DWARF":
    "edb42f12ab3616d22ee152ff52870f73befc0720933b6ea5e49f0fc42303fb05",
  "DWARF_6@3:DWARF":
    "cdff429fbad8bc034bd6b99d0dd22683a05948428ddeae5866e1b46cb28bc490",
  // The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`).
  "CANDY_1@2:CANDY":
    "35e6799e89653f4d01311b1bf281384043251794fa15d5f02efd8c17fbcbf90e",
  "CANDY_2@3:CANDY":
    "7fe5d1f227267d140026677876e0658d40048850a0680f8bc4bd876736812a1a",
  "CANDY_3@3:CANDY":
    "bbfe93b4067df705e64861738c7ca199ce8df1a926bf1901ee29b95b5c0e72d3",
  "CANDY_4@2:CANDY":
    "33b6b888e2d5e8183341a7d8c7c85a8ce557a63af8f518218145c59e8d1ef36b",
  "CANDY_5@2:CANDY":
    "7cc6ade81b748c480d0faf785daaa98287d747a44a4a7b5f0bdf6889f98ddffe",
  "CANDY_6@3:CANDY":
    "28de94faf3856bf3f03f7a23827adbc7caeacf84605eeb7410ed3d580f08ba1a",
  // The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`).
  "ICE_FOLK_1@3:ICE_FOLK":
    "4c2eab8eebc8ab2e418f21d351385b99a633b54c544fbbd1a3ebeb6033ce3e13",
  "ICE_FOLK_2@3:ICE_FOLK":
    "913ec06700653bd9b37669bf1d0b8f44e36854a6a9d4f0d108b7b6906db90466",
  "ICE_FOLK_3@3:ICE_FOLK":
    "2e68856dae69acddaca8ffa763c2ab1483be84ae148d285a337f697b908cfa13",
  "ICE_FOLK_4@3:ICE_FOLK":
    "41a5c74ae3e6cb7fce8e6de23ed7f6b1f27f8f91abee0104c17abf585dc6e6e9",
  "ICE_FOLK_5@3:ICE_FOLK":
    "28d9c276b358e4946b31abf9a828fc858fa7225c1494b723dd375df5c9bce168",
  "ICE_FOLK_6@3:ICE_FOLK":
    "fc333ba5330a47ea5f3cab5674af2d81e0d6432f56c81322ae7d161e2d4b21a2",
  // The Cult campaign, "The Long Night" (`pulp_wars-hmyk.12`).
  "CULT_1@3:CULT":
    "1103c4202b53bbc78175c3ddffd090ba4cb0bb6ae0533f6c566c94411580669f",
  "CULT_2@2:CULT":
    "5786fd93e0b400dd077a5f44803f670beef9ded9b445309f249384c453feb9b7",
  "CULT_3@3:CULT":
    "aad9d7291601ae8faa01bc491b269b4cefd6ae0ea48ff76ac7cebebe13392f88",
  "CULT_4@2:CULT":
    "e2574563b64640fed895b7ce193de325c3c9bab7ddf217cf5a11f3dce251abca",
  "CULT_5@3:CULT":
    "098b955436006f6425ebc8c1b076c0eb07daf8f3dd50e92c6db2eb7c16ea1ea2",
  "CULT_6@2:CULT":
    "15dd0d01a97ed5aeaa83735861ef7a73e4f55272de0c94af21520ae7ef07f686",
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
  // The reinforcement banner's fixture (`pulp_wars-hmyk.18`, E4).
  "TEST_WAVES@1:ORIGINAL":
    "57e5351a171907d3e5a52ded24a53961d6f3cc7b1d3cb936f60e0567be37dcab",
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
  // The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`).
  "HUMAN_1@3:ORIGINAL":
    "d56fd47aea6a63de610a7e60ec23255b22fe9af74803c16d5726c2a974d8be88",
  "HUMAN_2@4:ORIGINAL":
    "da96efe331a2281a842297aa00888cc11ffc02f46752170361dbf662e8077c03",
  "HUMAN_3@3:ORIGINAL":
    "5fab8f5f6f3ef6856f6a24e9edd3c147c2f8e7d32259e5a734b5681b07b4727e",
  "HUMAN_4@4:ORIGINAL":
    "087d20cf97d5e2276a85f15d15500f1cc6e013bb51e096ba120804c47c53e38c",
  // The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`).
  "UNDEAD_1@3:UNDEAD":
    "aa23d251b8783d0aea2355c5ed40078102b348e7372a837f8ad7f27e547bff8e",
  "UNDEAD_2@3:UNDEAD":
    "a5fafce543d450fb0a5219954daba7270921bc7d36033af2d2f7e0df5668cfd5",
  "UNDEAD_3@3:UNDEAD":
    "1cd31568d0be289ca78b15d5d58188494b2033996e9dccfac780934feca82b23",
  "UNDEAD_4@3:UNDEAD":
    "dd5cd90ef237ebba16d7fdccaf51c0af0e7e1adfd54dcfee3c65ba6722b42231",
  "UNDEAD_5@3:UNDEAD":
    "ee75fbc218c16ee6ec75348673b592917462ff3a3203d8e6d32c5932b5b4cf05",
  "UNDEAD_6@3:UNDEAD":
    "8f45b87f726ddf7d2c02b6b6a1d04a6b55f1926f2c60aaddaf3da9966c3b2a64",
  // The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`); the Sea
  // Road (`DINOSAUR_3`) places the Sea Serpent and has no pin here.
  "DINOSAUR_1@3:DINOSAUR":
    "2e8fb2eab4462c7601cf2c5656db72b767b2dcfba84ad5d95fe5963778413194",
  "DINOSAUR_2@3:DINOSAUR":
    "0c64176b0748bf3b08a43aa0a9f9659d3c56f9a99e01cf2281e3e6c8497ff18f",
  "DINOSAUR_4@3:DINOSAUR":
    "2daeaba9b995151042a870b020b6fb7562276f8eb22884605ff778d74608a1c1",
  "DINOSAUR_5@3:DINOSAUR":
    "ffaa3a4ca285227788036292731bab56bf0f9d595fae487114e1647f9f1a3004",
  "DINOSAUR_6@3:DINOSAUR":
    "c7c885ce14dee31236984184fcccb4d8bf8eb804af8d67892eba00409cae181e",
  // The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`).
  "MARTIAN_1@3:MARTIAN":
    "baab0d0b4a9f395de04c347bc131ae71db969c2381f9cf85814bc6e2594d1523",
  "MARTIAN_2@2:MARTIAN":
    "5abe6d708ec4c960436b459b791a0b968d48f5bab2301b54a5b70043f0b4ac87",
  "MARTIAN_3@3:MARTIAN":
    "346927e0f404a8a56641e73070f26b767a74e7a35a5da9d300ed26fb36839c0f",
  "MARTIAN_4@2:MARTIAN":
    "30f1c620d4a97a96d52703c6327704f9b1af8083f5d7a8eaab61b921fac879e9",
  "MARTIAN_5@3:MARTIAN":
    "65a239b3bdca8e86b95fcb21e9bcbb5a4f54779e649dee7dd55842723dad941d",
  "MARTIAN_6@2:MARTIAN":
    "0dd518ea2c9bd43d4efa92d9a2c6fd8a906248654408344b17c5e31471770321",
  // The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`).
  // GOBLIN_4 places the Moon Gun, so it has no pre-curiosity pin.
  "GOBLIN_1@3:GOBLIN":
    "35cac8513266fbbe83f4946f119aa59848b08cfb760f0b9acb56653554cda248",
  "GOBLIN_2@3:GOBLIN":
    "debc253c5d17b40b01015592c7311ac14bdfe59c136990a6bdb7ea07751225c6",
  "GOBLIN_3@3:GOBLIN":
    "3b0497f662afe91962c9461eabe97199acc521e2659d84056b065716305b3fac",
  "GOBLIN_5@3:GOBLIN":
    "aae6aff2fa05c33138f0ef4ae722c9e02dbd716350693e835452708bbcf2762b",
  "GOBLIN_6@3:GOBLIN":
    "1ab58aebdf82db3b46f6fcf981060c73e55a8f005705ade9ee1b439f84b1f516",
  // The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`).
  "DWARF_1@2:DWARF":
    "47f07a3b89d32891df2fc7d9017837ff42a16f6d4bbf48c6fad9943320af50d5",
  "DWARF_2@2:DWARF":
    "795c65569ab75668b08699ddc697fc7320a6680656b1ffd5672696f1d86537c0",
  "DWARF_3@2:DWARF":
    "d440730f8619baf12dd66450ddbfc0111819e4cb26f68ebdd52363d26a17e8ca",
  "DWARF_4@3:DWARF":
    "d4c13ff4873c02fb964e82b0e2541993fe5658f2860382459974028ecb270374",
  "DWARF_5@3:DWARF":
    "59046a6d367c6af66aa95003a2d3c9c178e68173d97c6b71ec272e09feb7453d",
  "DWARF_6@3:DWARF":
    "9b05946eed84e905edc07eafab38ac9f82eae147944e32dda8b5219a0fa12c65",
  // The Candy campaign, "Sweet Dreams" (`pulp_wars-hmyk.11`).
  "CANDY_1@2:CANDY":
    "b77efb7bc8c88a11090e4e873e44aa8fa09777469a099e85f8fb999f79765e3b",
  "CANDY_2@3:CANDY":
    "7071e285aaf6bc68bd70fd7e7b0ec413de305b7755cfb827a668965a91053629",
  "CANDY_3@3:CANDY":
    "0dd35b107d0e02c29ed42e3c3f8214055a4e860cc677177cd04059b147a92f73",
  "CANDY_4@2:CANDY":
    "1de547f2903045a4acb8a70ff4477c173a956b6dd16c5df4f0340f863ed4f461",
  "CANDY_6@3:CANDY":
    "0237b1152464dc0a61a31d8f76987558af295ae2f85df3856b8ee6c69fae4fae",
  // The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`).
  "ICE_FOLK_1@3:ICE_FOLK":
    "40130e4097c1d44f8a7c264877d6c0779ce0ddc730ca2a2efca7d655293497ad",
  "ICE_FOLK_2@3:ICE_FOLK":
    "2520ddd45b6855fea151eb5aa603313972cb466a7bb81b4946774aee400b1aba",
  "ICE_FOLK_3@3:ICE_FOLK":
    "1085498f7994f9873a5664205e3609afd8ce656917dce861aa5c8ad67c9d03f3",
  "ICE_FOLK_4@3:ICE_FOLK":
    "b66ff794d4694860081b190bc5c078b4f0affaee99c8dae11a73be7b437b787a",
  "ICE_FOLK_5@3:ICE_FOLK":
    "220ef04090508d73d347ca6902e65f6129ca5dc02c1c4b07e5d060a82727b154",
  "ICE_FOLK_6@3:ICE_FOLK":
    "6522eef39fbb202a7e81e8ecedd004ebe2c16030218b4b44abbe46bfb98a699d",
  // The Cult campaign, "The Long Night" (`pulp_wars-hmyk.12`).
  "CULT_1@3:CULT":
    "64599fe3519752b2b10ff5ff6a3ddf8ed92b27c455ad07081f277b0d71eea0a6",
  "CULT_2@2:CULT":
    "ebe1b0214b6db041d7745217c52b4449e567adb78923792db421a98db94b1f78",
  "CULT_3@3:CULT":
    "90eaf6b0cdbecccf76f8308bdbe97426ad96f7f02dfe5556d481bc6303a9b31e",
  "CULT_4@2:CULT":
    "782cef3a56118ffc16a0e91e80b060215c9ac769456b3eeb9403ead09879f3e1",
  "CULT_5@3:CULT":
    "ee3bdb884255fc993f2a3708cfffc68d4e52082082f77a9570bd7dfb0327777a",
  "CULT_6@2:CULT":
    "b287e5cd73f28852a33e2c5f873df47665d0ed06e42b2915e17f6eb665955bf7",

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
  "TEST_WAVES@1:ORIGINAL":
    "626e7927186909c5582b9c7b137b7ed67fff57fe837897935850aadc7c7b25a4",
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
    // A revised mission is stale; one no longer in the game at all (the
    // retired prologue's, pulp_wars-hmyk.22) says so.
    for (const [mission, diagnostic] of [
      [{ id: "TEST_GROUNDS", revision: 2 }, STALE_MISSION_DIAGNOSTIC_V7],
      [{ id: "REMOVED_MISSION", revision: 1 }, REMOVED_MISSION_DIAGNOSTIC_V7],
      [{ id: "FRONTIER_1", revision: 4 }, REMOVED_MISSION_DIAGNOSTIC_V7],
      [{ id: "FRONTIER_10", revision: 6 }, REMOVED_MISSION_DIAGNOSTIC_V7],
    ] as const) {
      const setup = { ...save.setup, mission };
      const stale = {
        ...save,
        setup,
        state: { ...save.state, setup },
      };
      expect(parseSaveV7(JSON.stringify(stale))).toEqual({
        kind: "INCOMPATIBLE",
        diagnostic,
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
    expect(REMOVED_MISSION_DIAGNOSTIC_V7).toBe(
      "This mission is no longer in the game. Delete the save and pick a campaign.",
    );
  });
});
