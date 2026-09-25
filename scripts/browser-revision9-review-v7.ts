import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { RULESET_7_ID } from "../src/engine/index";

interface Target {
  readonly webSocketDebuggerUrl: string;
  readonly url: string;
  readonly type: string;
}
interface Reply {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

const outputFlag = process.argv.find((value) => value.startsWith("--output="));
const outputIndex = process.argv.indexOf("--output");
const output = path.resolve(
  outputFlag?.slice(9) ??
    (outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined) ??
    path.join(tmpdir(), `pulp-wars-r9-review-${process.pid}`),
);
const baseUrl =
  process.argv.find((value) => value.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to the review headless browser");
const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-r9-browser-"));
const port = 10_500 + (process.pid % 200);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,1000",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  await mkdir(output, { recursive: true });
  const target = await waitTarget(port, new URL(baseUrl).origin);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__?.controller !== undefined && document.querySelector('[data-v7-setup]') !== null`,
  );
  const evidence = await evaluate<Record<string, unknown>>(
    connection,
    `(async () => {
    const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
    const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
    const { allTechsV7, checkedV7, exploredAllV7, initialV7 } = await import('/tests/fixtures/v7-builders.ts');
    const { withPortV7 } = await import('/tests/fixtures/v7-naval-builders.ts');
    const { TECHNOLOGY_IDS_V7, applyCommandV7, effectiveRoleRuleV7, queryPlayerCommandsV7, recomputeLiveEconomyV7, viewForV7 } = await import('/src/engine/index.ts');
    const same = (a, b) => a.x === b.x && a.y === b.y;
    let state = exploredAllV7(allTechsV7(initialV7(9099)));
    const actor = state.humanPlayerId;
    const city = state.cities.find((candidate) => candidate.ownerId === actor);
    if (!city) throw new Error('owned city missing');
    const cells = state.board.tiles.filter((tile) => tile.territoryCityId === city.id && tile.site === null).slice(0, 5);
    if (cells.length < 5) throw new Error('owned review cells missing');
    const [forest, mountain, dockTile, field, knightCell] = cells;
    const captainRule = effectiveRoleRuleV7('CAPTAIN'), knightRule = effectiveRoleRuleV7('KNIGHT');
    const baseUnit = state.units.find((unit) => unit.ownerId === actor);
    if (!baseUnit) throw new Error('owned unit missing');
    const captainId = state.nextEntityId, knightId = state.nextEntityId + 1;
    const candidate = {
      ...state,
      nextEntityId: state.nextEntityId + 2,
      players: state.players.map((player) => player.id === actor ? { ...player, coins: 1000 } : player),
      units: [
        ...state.units.filter((unit) => unit.ownerId !== actor && !cells.some((tile) => same(tile.at, unit.at))),
        { ...baseUnit, id: captainId, role: 'CAPTAIN', at: field.at, hp: captainRule.maxHp, maxHp: captainRule.maxHp, activation: { ...baseUnit.activation, handled: true, specialActed: true } },
        { ...baseUnit, id: knightId, role: 'KNIGHT', at: knightCell.at, hp: knightRule.maxHp, maxHp: knightRule.maxHp, activation: { ...baseUnit.activation, attacked: true, attacksUsed: 1, inspired: true, overrunActive: true } },
      ].sort((a, b) => a.id - b.id),
      board: { ...state.board, tiles: state.board.tiles.map((tile) => {
        if (same(tile.at, forest.at)) return { ...tile, biome: 'WOODLAND', terrain: 'FOREST', resource: null, improvement: null, road: true };
        if (same(tile.at, mountain.at)) return { ...tile, biome: 'HIGHLANDS', terrain: 'MOUNTAIN', resource: null, improvement: null };
        if (same(tile.at, dockTile.at)) return { ...tile, resource: null, improvement: null, site: null };
        if (same(tile.at, field.at)) return { ...tile, resource: null, improvement: null };
        return tile;
      }) },
    };
    const economy = recomputeLiveEconomyV7(state, candidate, state.populationContributions);
    state = checkedV7({ ...candidate, cities: economy.cities, populationContributions: economy.populationContributions });
    const publicBefore = viewForV7(state, actor);
    const offered = queryPlayerCommandsV7(publicBefore);
    const cultivate = offered.find((command) => command.kind === 'CULTIVATE_FOREST' && same(command.at, forest.at));
    const blast = offered.find((command) => command.kind === 'BLAST_MOUNTAIN' && same(command.at, mountain.at));
    if (!cultivate || !blast) throw new Error('Revision 9 terrain commands are not publicly offered');
    const source = globalThis.__PULP_WARS_APP__.controller, original = source.snapshot();
    document.querySelector('#app').style.display = 'none';
    const mountState = (id, initial) => {
      let current = initial, events = [], snapshot = { ...original, phase: 'ACTIVE', view: viewForV7(initial, initial.humanPlayerId), offeredCommands: queryPlayerCommandsV7(viewForV7(initial, initial.humanPlayerId)) };
      const listeners = [], root = document.createElement('div'); root.id = id; document.body.append(root);
      const refresh = () => { const view = viewForV7(current, current.humanPlayerId); snapshot = { ...snapshot, view, offeredCommands: queryPlayerCommandsV7(view) }; for (const listener of listeners) listener(snapshot); };
      const port = { snapshot: () => snapshot, subscribe(listener) { listeners.push(listener); listener(snapshot); return () => {}; }, subscribeAcceptedBoundary() { return () => {}; }, launch: source.launch.bind(source), resume: source.resume.bind(source), returnToMenu: source.returnToMenu.bind(source), dispatch: async (command) => { const result = applyCommandV7(current, current.humanPlayerId, command); if (!result.accepted) return { accepted: false, reason: result.error.code }; current = result.state; events = result.events; refresh(); return { accepted: true }; }, progressAiTurns: source.progressAiTurns.bind(source), restart: source.restart.bind(source), deleteStoredSave: source.deleteStoredSave.bind(source), setFastForward: source.setFastForward.bind(source), exportSafeLog: source.exportSafeLog.bind(source), exportDebugBundle: source.exportDebugBundle.bind(source) };
      const host = new CanvasBoardHostV7(document); let callbacks = null; const mount = host.mount.bind(host); host.mount = (container, next) => { callbacks = next; return mount(container, next); };
      const app = new Ruleset7DomAppView(document, root, port, { boardHost: host, settingsStorage: null });
      if (!callbacks || !root.querySelector('.board-canvas-v7')) throw new Error('Production Canvas host missing');
      return { root, app, host, select: (selection) => callbacks.onSelection(selection), state: () => current, events: () => events, async activate(at) { host.activate(at); await new Promise((resolve) => setTimeout(resolve, 30)); host.finishPresentations(); }, async click(selector) { const button = root.querySelector(selector); if (!(button instanceof HTMLButtonElement)) throw new Error('DOM action missing: ' + selector + ' offers=' + JSON.stringify(snapshot.offeredCommands)); button.click(); await new Promise((resolve) => setTimeout(resolve, 30)); host.finishPresentations(); } };
    };
    const review = mountState('revision9-review', state);
    review.select({ kind: 'TILE', at: forest.at });
    const root = review.root;
    const action = root.querySelector('[data-action="command-cultivate_forest"]');
    if (!action) throw new Error('Cultivate DOM action missing');
    const actionText = action.textContent, actionAsset = action.querySelector('img')?.dataset.assetId;
    await review.click('[data-action="command-cultivate_forest"]');
    const cultivateEvent = review.events().find((event) => event.kind === 'FOREST_CULTIVATED');
    if (!cultivateEvent || review.state().board.tiles.find((tile) => same(tile.at, forest.at))?.terrain !== 'GRASS') throw new Error('Cultivate DOM dispatch did not apply');
    const terrain = { text: actionText, assetId: actionAsset, blastOffered: Boolean(blast), event: cultivateEvent };
    review.select({ kind: 'UNIT', unitId: knightId });
    const dock = root.querySelector('.v7-selection-dock');
    const unit = { role: dock?.querySelector('.v7-tactical-role')?.textContent, statuses: Array.from(dock?.querySelectorAll('.v7-unit-status-cues [data-unit-status]') ?? [], (node) => node.textContent), height: dock?.getBoundingClientRect().height, knightAsset: dock?.querySelector('img')?.dataset.assetId };
    root.querySelector('[data-action="tech"]')?.click();
    root.querySelector('[data-action="tech-naval_engineering"]')?.click();
    const technology = root.querySelector('.v7-tech-detail')?.textContent;
    const supportTargetAt = cells.find((tile) => tile !== field && Math.max(Math.abs(tile.at.x - field.at.x), Math.abs(tile.at.y - field.at.y)) === 1)?.at;
    if (!supportTargetAt) throw new Error('adjacent support cell missing');
    const supportState = checkedV7({ ...state, units: state.units.map((unit) => unit.id === captainId ? { ...unit, at: field.at, activation: { ...baseUnit.activation } } : unit.id === knightId ? { ...unit, at: supportTargetAt, hp: 5, activation: { ...baseUnit.activation } } : unit) });
    const supportOfferReview = mountState('revision9-support-offer-review', supportState); supportOfferReview.root.style.display = 'none'; supportOfferReview.select({ kind: 'UNIT', unitId: captainId });
    const rallyReview = mountState('revision9-rally-review', supportState); rallyReview.root.style.display = 'none'; rallyReview.select({ kind: 'UNIT', unitId: captainId }); await rallyReview.click('[data-action="command-rally"]');
    const rallied = rallyReview.state().units.find((unit) => unit.id === knightId);
    if (!rallied?.activation.inspired || !rallyReview.events().some((event) => event.kind === 'UNITS_RALLIED')) throw new Error('Rally DOM dispatch did not apply');
    rallyReview.select({ kind: 'UNIT', unitId: knightId });
    const tendReview = mountState('revision9-tend-review', supportState); tendReview.root.style.display = 'none'; tendReview.select({ kind: 'UNIT', unitId: captainId }); await tendReview.click('[data-action="command-tend_wounded"]');
    const tended = tendReview.state().units.find((unit) => unit.id === knightId);
    if (tended?.hp !== 7 || !tended.activation.tendedThisTurn || !tendReview.events().some((event) => event.kind === 'WOUNDED_TENDED')) throw new Error('Tend DOM dispatch did not apply');
    tendReview.select({ kind: 'UNIT', unitId: knightId });
    const combinedState = checkedV7({ ...supportState, units: supportState.units.map((unit) => unit.id === knightId ? { ...unit, hp: 7, activation: { ...unit.activation, inspired: true, tendedThisTurn: true } } : unit) });
    const combinedReview = mountState('revision9-combined-status-review', combinedState); combinedReview.root.style.display = 'none'; combinedReview.select({ kind: 'UNIT', unitId: knightId });
    const enemyOwner = state.players.find((player) => player.id !== actor).id, enemyHome = state.cities.find((candidate) => candidate.ownerId === enemyOwner)?.id ?? null;
    const chainPositions = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }];
    const chainUnits = [
      { ...baseUnit, id: captainId, ownerId: actor, homeCityId: city.id, role: 'KNIGHT', at: chainPositions[0], hp: knightRule.maxHp, maxHp: knightRule.maxHp, activation: { ...baseUnit.activation } },
      ...chainPositions.slice(1).map((at, index) => ({ ...baseUnit, id: captainId + index + 1, ownerId: enemyOwner, homeCityId: enemyHome, role: 'FIGHTER', at, hp: 1, maxHp: 10, activation: { ...baseUnit.activation } })),
    ];
    const chainState = checkedV7({ ...state, nextEntityId: Math.max(state.nextEntityId, captainId + 4), units: chainUnits, treasureChests: state.treasureChests.filter((chest) => !chainPositions.some((at) => same(at, chest))), board: { ...state.board, tiles: state.board.tiles.map((tile) => chainPositions.some((at) => same(at, tile.at)) ? { ...tile, biome: 'PLAINS', terrain: 'GRASS', resource: null, improvement: null, fieldDefense: false, site: null } : tile) } });
    let chainCurrent = chainState; const chainEvents = [];
    for (let attack = 0; attack < 3; attack += 1) { const chainReview = mountState('revision9-overrun-review-' + attack, chainCurrent); chainReview.root.style.display = 'none'; chainReview.select({ kind: 'UNIT', unitId: captainId }); await chainReview.activate(chainPositions[attack + 1]); chainEvents.push(...chainReview.events()); chainCurrent = chainReview.state(); }
    const chainedKnight = chainCurrent.units.find((unit) => unit.id === captainId);
    if (chainedKnight?.activation.attacksUsed !== 3 || !same(chainedKnight.at, chainPositions[3]) || chainEvents.filter((event) => event.kind === 'COMBAT_RESOLVED').length !== 3) throw new Error('multiattack Overrun DOM chain failed');
    const landBase = exploredAllV7(allTechsV7(initialV7(9299))), landActor = landBase.humanPlayerId, landCity = landBase.cities.find((candidate) => candidate.ownerId === landActor);
    if (!landCity) throw new Error('Land Grant city missing');
    const around = (at) => { const result = []; for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (dx !== 0 || dy !== 0) result.push({ x: at.x + dx, y: at.y + dy }); return result; };
    const tileAt = (source, at) => source.board.tiles.find((tile) => same(tile.at, at));
    const landAt = landBase.board.tiles.map((tile) => tile.at).find((at) => at.x > 0 && at.y > 0 && at.x < landBase.board.width - 1 && at.y < landBase.board.height - 1 && [at, ...around(at)].every((position) => tileAt(landBase, position)?.site === null));
    if (!landAt) throw new Error('Land Grant footprint missing');
    const camps = around(landAt), campKeys = new Set(camps.map((at) => at.y + ',' + at.x));
    const live = camps.map((at, index) => ({ id: landBase.nextEntityId + index, cityId: landCity.id, category: 'LIVE', amount: 1, source: { kind: 'IMPROVEMENT', improvement: 'LUMBER_CAMP', at } }));
    const permanent = camps.slice(0, 5).map((at, index) => ({ id: landBase.nextEntityId + live.length + index, cityId: landCity.id, category: 'PERMANENT', amount: 1, source: { kind: 'RESOURCE_ACTION', action: 'HARVEST_FRUIT', at } }));
    const assignedStart = landBase.nextEntityId + live.length + permanent.length;
    const assigned = [landAt, ...camps.slice(0, 5)].map((at, index) => ({ ...baseUnit, id: assignedStart + index, ownerId: landActor, homeCityId: landCity.id, role: 'FIGHTER', at, hp: 10, maxHp: 10, activation: { ...baseUnit.activation } }));
    const landState = checkedV7({ ...landBase, nextEntityId: assignedStart + assigned.length, treasureChests: [], units: assigned, players: landBase.players.map((player) => player.id === landActor ? { ...player, coins: 1000 } : player), board: { ...landBase.board, tiles: landBase.board.tiles.map((tile) => same(tile.at, landAt) || campKeys.has(tile.at.y + ',' + tile.at.x) ? { ...tile, biome: 'WOODLAND', terrain: 'FOREST', resource: null, improvement: campKeys.has(tile.at.y + ',' + tile.at.x) ? 'LUMBER_CAMP' : null, road: false, site: null, territoryCityId: landCity.id } : tile) }, cities: landBase.cities.map((candidate) => candidate.id === landCity.id ? { ...candidate, level: 4, permanentPopulation: 5, economicPopulation: 8, population: 4, landGrantUsed: false, rewards: [{ reachedLevel: 2, reward: 'STOCKPILE' }, { reachedLevel: 3, reward: 'WALLS' }, { reachedLevel: 4, reward: 'TREASURY_8' }] } : candidate), populationContributions: [...live, ...permanent] });
    const threeStatusLive = live.flatMap((entry, index) => index === 0 ? [{ ...entry, amount: 2, source: { ...entry.source, improvement: 'FARM' } }] : index === 1 ? [{ ...entry, source: { ...entry.source, improvement: 'WINDMILL' } }] : index === 2 ? [] : [entry]);
    const threeStatusState = checkedV7({ ...landState, units: landState.units.map((unit, index) => index === 0 ? { ...unit, role: 'KNIGHT', hp: knightRule.maxHp, maxHp: knightRule.maxHp, activation: { ...unit.activation, inspired: true, tendedThisTurn: true } } : unit), board: { ...landState.board, tiles: landState.board.tiles.map((tile) => same(tile.at, camps[0]) ? { ...tile, biome: 'PLAINS', terrain: 'GRASS', improvement: 'FARM' } : same(tile.at, camps[1]) ? { ...tile, biome: 'PLAINS', terrain: 'GRASS', improvement: 'WINDMILL' } : same(tile.at, camps[2]) ? { ...tile, improvement: null } : tile) }, populationContributions: [...threeStatusLive, ...permanent] });
    const threeStatusUnit = threeStatusState.units[0], threeStatusReview = mountState('revision9-three-status-review', threeStatusState); threeStatusReview.root.style.display = 'none'; threeStatusReview.select({ kind: 'UNIT', unitId: threeStatusUnit.id });
    const landReview = mountState('revision9-land-grant-review', landState); landReview.root.style.display = 'none'; landReview.select({ kind: 'CITY', cityId: landCity.id }); await landReview.click('[data-action="command-land_grant"]');
    const landGranted = landReview.events().find((event) => event.kind === 'LAND_GRANTED'), landResultCity = landReview.state().cities.find((candidate) => candidate.id === landCity.id);
    if (!landGranted || landGranted.tiles.length === 0 || !landResultCity?.landGrantUsed) throw new Error('full-capacity Land Grant DOM dispatch did not apply');
    const navalFixture = withPortV7(9199);
    const navalPassenger = navalFixture.state.units.find((unit) => unit.ownerId === navalFixture.state.humanPlayerId);
    if (!navalPassenger) throw new Error('Shipyard passenger missing');
    let navalState = checkedV7({ ...navalFixture.state, players: navalFixture.state.players.map((player) => player.id === navalFixture.state.humanPlayerId ? { ...player, coins: 1000, researchedTechs: TECHNOLOGY_IDS_V7 } : player), units: [...navalFixture.state.units.filter((unit) => unit.id !== navalPassenger.id && !same(unit.at, navalFixture.portAt)), { ...navalPassenger, at: navalFixture.portAt, form: 'EMBARKED' }].sort((a, b) => a.id - b.id), board: { ...navalFixture.state.board, tiles: navalFixture.state.board.tiles.map((tile) => same(tile.at, navalFixture.portAt) ? { ...tile, resource: 'FISH' } : tile) } });
    const navalActor = navalState.humanPlayerId;
    const shipyardCommand = queryPlayerCommandsV7(viewForV7(navalState, navalActor)).find((command) => command.kind === 'BUILD_SHIPYARD' && same(command.at, navalFixture.portAt));
    if (!shipyardCommand) throw new Error('Shipyard upgrade not offered');
    const built = applyCommandV7(navalState, navalActor, shipyardCommand); if (!built.accepted) throw new Error('Shipyard build rejected');
    let navalDisplayState = built.state;
    while (navalDisplayState.pendingChoices[0]) { const choice = navalDisplayState.pendingChoices[0]; const chosen = applyCommandV7(navalDisplayState, navalActor, { kind: 'CHOOSE_CITY_REWARD', cityId: choice.cityId, reachedLevel: choice.reachedLevel, reward: choice.candidates[0] }); if (!chosen.accepted) throw new Error('Shipyard reward rejected'); navalDisplayState = chosen.state; }
    const navalReview = mountState('revision9-shipyard-review', navalDisplayState); navalReview.root.style.display = 'none'; navalReview.select({ kind: 'TILE', at: navalFixture.portAt });
    if (!navalReview.root.querySelector('[data-underlying-resource="fish"]') || !navalReview.root.querySelector('[data-discount="shipyard"]') || !navalDisplayState.units.some((unit) => same(unit.at, navalFixture.portAt))) throw new Error('Shipyard resource/occupant/discount presentation missing');
    navalState = checkedV7({ ...navalDisplayState, units: navalDisplayState.units.filter((unit) => !same(unit.at, navalFixture.portAt)) });
    const train = queryPlayerCommandsV7(viewForV7(navalState, navalActor)).find((command) => command.kind === 'TRAIN_NAVAL' && command.role === 'PATROL_BOAT' && same(command.at, navalFixture.portAt));
    if (!train) throw new Error('discounted naval training not offered');
    const trained = applyCommandV7(navalState, navalActor, train); if (!trained.accepted) throw new Error('discounted naval training rejected');
    const trainEvent = trained.events.find((event) => event.kind === 'NAVAL_UNIT_TRAINED');
    const shipyardEvent = built.events.find((event) => event.kind === 'SHIPYARD_BUILT');
    const dryState = checkedV7({ ...initialV7(9399), players: initialV7(9399).players.map((player) => player.id === initialV7(9399).humanPlayerId ? { ...player, coins: 1000 } : player) });
    if (dryState.setup.mapType !== 'DRY_LAND') throw new Error('Dry Land review fixture missing');
    const dryReview = mountState('revision9-dry-land-review', dryState); dryReview.root.style.display = 'none'; dryReview.root.querySelector('[data-action="tech"]')?.click(); dryReview.root.querySelector('[data-action="tech-shorecraft"]')?.click();
    const dryCards = Array.from(dryReview.root.querySelectorAll('[data-tech-branch="NAVAL"] .v7-tech-card'));
    const dryDetail = dryReview.root.querySelector('.v7-tech-detail')?.textContent;
    if (dryCards.length !== 3 || dryCards.some((card) => !card.classList.contains('state-disabled') || card.getAttribute('aria-disabled') !== 'true') || !dryDetail?.includes('Unavailable on Dry Land maps')) throw new Error('Dry Land Naval tree is not disabled with explanation');
    globalThis.__R9_REVIEW__ = { app: review.app, host: review.host };
    globalThis.__R9_REVIEW_SCENES__ = { review, supportOfferReview, rallyReview, tendReview, combinedReview, threeStatusReview, navalReview, dryReview, knightId, captainId, supportTargetId: knightId };
    return { rulesetId: publicBefore.rulesetId, terrain, unit, technology, support: { rallied: rallied.activation.inspired, tendedHp: tended.hp, tended: tended.activation.tendedThisTurn }, overrun: { attacks: chainedKnight.activation.attacksUsed, at: chainedKnight.at }, landGrant: { tiles: landGranted.tiles.length, fullCapacityAssigned: assigned.length, used: landResultCity.landGrantUsed }, shipyard: shipyardEvent, navalTraining: trainEvent, dryLand: { disabledCards: dryCards.length, detail: dryDetail }, canvas: true, dryLandSupported: publicBefore.setup.mapType === 'DRY_LAND', offeredKinds: [...new Set(offered.map((command) => command.kind))].sort() };
  })()`,
  );
  const unit = evidence.unit as {
    role?: string;
    statuses?: string[];
    height?: number;
    knightAsset?: string;
  };
  const terrain = evidence.terrain as {
    assetId?: string;
    blastOffered?: boolean;
    event?: unknown;
  };
  assert(
    evidence.rulesetId === RULESET_7_ID &&
      terrain.assetId === "ui-action-cultivate-forest-v7r9" &&
      terrain.blastOffered === true,
    `terrain evidence failed: ${JSON.stringify(evidence)}`,
  );
  assert(
    unit.role === "Breakthrough" &&
      unit.statuses?.includes("Overrun") &&
      unit.knightAsset === "unit-original-knight" &&
      (unit.height ?? 999) < 190,
    `unit evidence failed: ${JSON.stringify(unit)}`,
  );
  assert(
    String(evidence.technology).includes(
      "Shipyards discount naval training by 2 Coins",
    ) &&
      (evidence.shipyard as { livePopulationTotal?: number })
        ?.livePopulationTotal === 2 &&
      (evidence.navalTraining as { cost?: number; discountSource?: string })
        ?.cost === 3 &&
      (evidence.navalTraining as { discountSource?: string })
        ?.discountSource === "SHIPYARD",
    `technology/Shipyard evidence failed: ${JSON.stringify(evidence)}`,
  );
  assert(
    (evidence.dryLand as { disabledCards?: number }).disabledCards === 3 &&
      String((evidence.dryLand as { detail?: string }).detail).includes(
        "Unavailable on Dry Land maps",
      ),
    `Dry Land technology evidence failed: ${JSON.stringify(evidence.dryLand)}`,
  );
  assert(
    (
      evidence.support as {
        rallied?: boolean;
        tendedHp?: number;
        tended?: boolean;
      }
    )?.rallied === true &&
      (evidence.support as { tendedHp?: number }).tendedHp === 7 &&
      (evidence.support as { tended?: boolean }).tended === true &&
      (evidence.overrun as { attacks?: number }).attacks === 3 &&
      ((evidence.landGrant as { tiles?: number }).tiles ?? 0) > 0 &&
      (evidence.landGrant as { fullCapacityAssigned?: number })
        .fullCapacityAssigned === 6 &&
      (evidence.landGrant as { used?: boolean }).used === true,
    `support/Overrun evidence failed: ${JSON.stringify(evidence)}`,
  );
  interface DockMeasurement {
    readonly height: number;
    readonly statuses: readonly string[];
    readonly allCuesVisible: boolean;
  }
  const showScene = async (
    sceneKey: string,
    expression: string,
  ): Promise<DockMeasurement> => {
    await evaluate(
      connection,
      `(() => { const scenes = globalThis.__R9_REVIEW_SCENES__; for (const scene of Object.values(scenes)) if (scene?.root instanceof HTMLElement) scene.root.style.display = 'none'; ${expression} })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    return evaluate<DockMeasurement>(
      connection,
      `(() => { const root = globalThis.__R9_REVIEW_SCENES__[${JSON.stringify(sceneKey)}].root; const dock = root.querySelector('.v7-selection-dock'); if (!(dock instanceof HTMLElement)) throw new Error('visible dock missing'); const bounds = dock.getBoundingClientRect(); const cues = Array.from(dock.querySelectorAll('.v7-unit-status-cues [data-unit-status]')); return { height: bounds.height, statuses: cues.map((node) => node.textContent ?? ''), allCuesVisible: cues.every((node) => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top && rect.bottom <= bounds.bottom; }) }; })()`,
    );
  };
  const showOnly = async (expression: string): Promise<void> => {
    await evaluate(
      connection,
      `(() => { const scenes = globalThis.__R9_REVIEW_SCENES__; for (const scene of Object.values(scenes)) if (scene?.root instanceof HTMLElement) scene.root.style.display = 'none'; ${expression} })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
  };
  const capture = async (filename: string): Promise<void> => {
    const screenshot = (await connection.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    })) as { data?: string };
    if (!screenshot.data) throw new Error("Chrome returned no screenshot");
    await writeFile(
      path.join(output, filename),
      Buffer.from(screenshot.data, "base64"),
    );
  };
  await showScene(
    "review",
    `scenes.review.root.style.display = ''; scenes.review.root.querySelector('[data-action="close-overlay"]')?.click(); scenes.review.select({ kind: 'UNIT', unitId: scenes.knightId });`,
  );
  await capture("revision9-knight-overrun.png");
  const captainPresentation = await showScene(
    "supportOfferReview",
    `scenes.supportOfferReview.root.style.display = ''; scenes.supportOfferReview.select({ kind: 'UNIT', unitId: scenes.captainId });`,
  );
  await capture("revision9-captain-support-actions.png");
  const inspiredPresentation = await showScene(
    "rallyReview",
    `scenes.rallyReview.root.style.display = ''; scenes.rallyReview.select({ kind: 'UNIT', unitId: scenes.supportTargetId });`,
  );
  await capture("revision9-inspired-recipient.png");
  const tendedPresentation = await showScene(
    "tendReview",
    `scenes.tendReview.root.style.display = ''; scenes.tendReview.select({ kind: 'UNIT', unitId: scenes.supportTargetId });`,
  );
  await capture("revision9-tended-recipient.png");
  const combinedPresentation = await showScene(
    "combinedReview",
    `scenes.combinedReview.root.style.display = '';`,
  );
  await capture("revision9-combined-statuses.png");
  const threeStatusPresentation = await showScene(
    "threeStatusReview",
    `scenes.threeStatusReview.root.style.display = '';`,
  );
  await capture("revision9-three-statuses.png");
  await showScene("navalReview", `scenes.navalReview.root.style.display = '';`);
  await capture("revision9-shipyard-discount.png");
  await showOnly(`scenes.dryReview.root.style.display = '';`);
  await capture("revision9-dry-land-naval-tree.png");
  const supportPresentation = {
    captain: captainPresentation,
    inspired: inspiredPresentation,
    tended: tendedPresentation,
    combined: combinedPresentation,
    threeStatuses: threeStatusPresentation,
  };
  assert(
    Object.values(supportPresentation).every(
      (presentation) =>
        presentation.height > 0 &&
        presentation.height < 190 &&
        presentation.allCuesVisible,
    ) &&
      inspiredPresentation.statuses.includes("Inspired") &&
      tendedPresentation.statuses.includes("Tended") &&
      combinedPresentation.statuses.includes("Inspired") &&
      combinedPresentation.statuses.includes("Tended") &&
      ["Supplied", "Inspired", "Tended"].every((status) =>
        threeStatusPresentation.statuses.includes(status),
      ),
    `support dock presentation failed: ${JSON.stringify(supportPresentation)}`,
  );
  (evidence.support as Record<string, unknown>).presentation =
    supportPresentation;
  const screenshots = [
    "revision9-knight-overrun.png",
    "revision9-captain-support-actions.png",
    "revision9-inspired-recipient.png",
    "revision9-tended-recipient.png",
    "revision9-combined-statuses.png",
    "revision9-three-statuses.png",
    "revision9-shipyard-discount.png",
    "revision9-dry-land-naval-tree.png",
  ];
  await writeFile(
    path.join(output, "revision9-runtime.json"),
    `${JSON.stringify({ status: "PASS", source: "STRICT_ENGINE_APPLIED_PUBLIC_DOM", ...evidence, screenshots }, null, 2)}\n`,
  );
  connection.close();
  process.stdout.write(
    `Ruleset 7 Revision 9 browser review passed: ${output}\n`,
  );
} finally {
  browser.kill();
  await rm(profile, { recursive: true, force: true });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function waitTarget(port: number, origin: string): Promise<Target> {
  for (let i = 0; i < 200; i += 1) {
    try {
      const values = (await (
        await fetch(`http://localhost:${port}/json`)
      ).json()) as Target[];
      const found = values.find(
        (item) => item.type === "page" && item.url.startsWith(origin),
      );
      if (found) return found;
    } catch {
      // Chrome's debugging endpoint may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Chrome target timeout");
}
async function connect(url: string): Promise<Connection> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.onopen = () => resolve();
    socket.onerror = () => reject(new Error("Chrome websocket failed"));
  });
  let id = 0;
  const pending = new Map<
    number,
    { resolve(value: unknown): void; reject(reason: unknown): void }
  >();
  socket.onmessage = (event) => {
    const reply = JSON.parse(String(event.data)) as Reply;
    if (reply.id === undefined) return;
    const waiter = pending.get(reply.id);
    if (!waiter) return;
    pending.delete(reply.id);
    if (reply.error)
      waiter.reject(new Error(reply.error.message ?? "Chrome error"));
    else waiter.resolve(reply.result);
  };
  return {
    send(method, params = {}) {
      const next = ++id;
      return new Promise((resolve, reject) => {
        pending.set(next, { resolve, reject });
        socket.send(JSON.stringify({ id: next, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}
async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const result = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    result?: { value?: T; description?: string };
    exceptionDetails?: { text?: string; exception?: { description?: string } };
  };
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "browser evaluation failed",
    );
  return result.result?.value as T;
}
async function waitFor(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    if (await evaluate<boolean>(connection, `Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Browser condition timed out: ${expression}`);
}
