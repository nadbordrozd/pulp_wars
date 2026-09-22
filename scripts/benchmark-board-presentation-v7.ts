import { mkdir, writeFile } from "node:fs/promises";
import { cpus, loadavg, release, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { launchSmokeBrowser, navigateSmokePage } from "./browser-smoke-startup";

// Read-only public-view fixture. It intentionally does not modify any save.
// Each invocation owns its Chrome process and writes only to a unique temp path.
const url =
  process.argv.find((argument) => argument.startsWith("--url="))?.slice(6) ??
  "http://localhost:6173/?ruleset=7";
const outputRoot =
  process.argv.find((argument) => argument.startsWith("--output="))?.slice(9) ??
  path.join(tmpdir(), `pulp-wars-board-perf-${process.pid}-${Date.now()}`);
const requestedDpr = Number(
  process.argv.find((argument) => argument.startsWith("--dpr="))?.slice(6) ??
    "1",
);
if (requestedDpr !== 1 && requestedDpr !== 2)
  throw new Error("--dpr must be 1 or 2");
const chrome = process.env.CHROME_PATH;
if (chrome === undefined)
  throw new Error("Set CHROME_PATH to a headless Chrome executable.");
const port = 11_000 + (process.pid % 1_000);
await mkdir(outputRoot);
const browser = await launchSmokeBrowser({
  chrome,
  port,
  args: [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(outputRoot, "chrome-profile")}`,
    "--window-size=1440,1000",
  ],
});
const connection = browser.connection;

interface Timing {
  readonly name: string;
  readonly start: number;
  readonly duration: number;
}
interface EventTiming {
  readonly type: string;
  readonly start: number;
  readonly duration: number;
}
interface FrameTiming {
  readonly type: string;
  readonly start: number;
  readonly raf: number;
}
interface Capture {
  readonly events: readonly EventTiming[];
  readonly calls: readonly Timing[];
  readonly frames: readonly FrameTiming[];
  readonly selected: number | null;
  readonly units: number;
  readonly commands: number;
  readonly readyUnits: number;
}

async function evaluate<T>(expression: string): Promise<T> {
  const result = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: {
      readonly text: string;
      readonly exception?: { readonly description?: string };
    };
  };
  if (result.exceptionDetails !== undefined)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    );
  return result.result?.value as T;
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function click(x: number, y: number): Promise<void> {
  await connection.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}
async function screenshot(name: string): Promise<void> {
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { readonly data: string };
  await writeFile(
    path.join(outputRoot, name),
    Buffer.from(result.data, "base64"),
  );
}
async function captureClicks(point: {
  x: number;
  y: number;
}): Promise<Capture> {
  await evaluate(
    "globalThis.__boardPerf.events=[];__boardPerf.calls=[];__boardPerf.frames=[]",
  );
  for (let n = 0; n < 30; n += 1) {
    await click(point.x, point.y);
    await delay(300);
  }
  return evaluate<Capture>(
    "({events:__boardPerf.events,calls:__boardPerf.calls,frames:__boardPerf.frames,selected:__model.interaction.selectedUnitId,units:__model.view.units.length,commands:__model.offeredCommands.length,readyUnits:__model.view.units.filter(u=>u.ownerId===__model.view.viewer.id&&!u.activation.handled&&__model.offeredCommands.some(c=>c.kind==='MOVE'&&c.unitId===u.id)).length})",
  );
}
function summarize(values: readonly number[]): {
  readonly n: number;
  readonly median: number;
  readonly p95: number;
  readonly max: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0,
    max: sorted.at(-1) ?? 0,
  };
}
function summary(capture: Capture) {
  const afterWarmup = capture.events
    .filter((event) => event.type === "pointerup")
    .slice(5);
  const starts = new Set(afterWarmup.map((event) => event.start));
  const frames = capture.frames.filter(
    (frame) => frame.type === "pointerup" && starts.has(frame.start),
  );
  const calls = capture.calls.filter(
    (call) =>
      call.name === "update" &&
      call.start >= (afterWarmup[0]?.start ?? Infinity),
  );
  return {
    units: capture.units,
    commands: capture.commands,
    readyUnits: capture.readyUnits,
    pointerHandlerMs: summarize(afterWarmup.map((event) => event.duration)),
    nextRafProxyMs: summarize(frames.map((frame) => frame.raf)),
    hostUpdateMs: summarize(calls.map((call) => call.duration)),
  };
}

try {
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  if (requestedDpr !== 1)
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: requestedDpr,
      mobile: false,
    });
  await connection.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `globalThis.__boardPerf={events:[],calls:[],frames:[],rafWork:[],rafWorkActive:false};
const originalRaf=window.requestAnimationFrame;
window.requestAnimationFrame=function(fn){
  return originalRaf.call(window,timestamp=>{
    const start=performance.now();
    fn(timestamp);
    if(__boardPerf.rafWorkActive)__boardPerf.rafWork.push(performance.now()-start);
  });
};
const originalAdd=EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener=function(type,fn,options){
  if(this instanceof HTMLCanvasElement && typeof fn==="function" && ["pointerdown","pointerup","keydown"].includes(type)){
    const original=fn;
    fn=function(event){
      const start=performance.now();
      const result=original.call(this,event);
      __boardPerf.events.push({type,start,duration:performance.now()-start});
      requestAnimationFrame(()=>__boardPerf.frames.push({type,start,raf:performance.now()-start}));
      return result;
    };
  }
  return originalAdd.call(this,type,fn,options);
};`,
  });
  await navigateSmokePage(connection, url);
  for (let n = 0; n < 100; n += 1) {
    if (await evaluate<boolean>("!!globalThis.__PULP_WARS_APP__")) break;
    await delay(100);
  }
  await evaluate(`(async()=>{
    const hostModule=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/render/canvas/board-host-v7.ts')).name);
    for(const name of ['update','activate','presentBoundary']){
      const original=hostModule.CanvasBoardHostV7.prototype[name];
      hostModule.CanvasBoardHostV7.prototype[name]=function(...args){
        globalThis.__host=this;
        if(name==='update')globalThis.__model=args[0];
        const start=performance.now();
        const result=original.apply(this,args);
        __boardPerf.calls.push({name,start,duration:performance.now()-start});
        if(result?.then)result.then(()=>__boardPerf.calls.push({name:name+'-resolved',start,duration:performance.now()-start}));
        return result;
      };
    }
    const controller=__PULP_WARS_APP__.controller;
    const original=controller.dispatch.bind(controller);
    controller.dispatch=function(...args){
      const start=performance.now();
      const result=original(...args);
      __boardPerf.calls.push({name:'dispatch',start,duration:performance.now()-start});
      result.then(()=>__boardPerf.calls.push({name:'dispatch-resolved',start,duration:performance.now()-start}));
      return result;
    };
    document.querySelector('#v7-seed').value='20';
    document.querySelector('#v7-seed').dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('[data-action="launch"]').click();
  })()`);
  await delay(2500);
  const naturalPoint = await evaluate<{ x: number; y: number }>(`(async()=>{
    const geometry=await import('/src/render/canvas/geometry.ts');
    const canvas=document.querySelector('canvas');
    const rect=canvas.getBoundingClientRect();
    const size={width:rect.width,height:rect.height};
    const capital=__model.view.cities.find(c=>c.ownerId===__model.view.viewer.id&&c.isCapital);
    const camera=geometry.centerCameraOn(geometry.fitCamera(__model.view.board,size),geometry.projectGrid(capital.at),size);
    globalThis.__unit=__model.view.units.find(u=>u.ownerId===__model.view.viewer.id);
    globalThis.__point=at=>{const p=geometry.worldToScreen(geometry.projectGrid(at),camera);return {x:rect.left+p.x,y:rect.top+p.y}};
    return __point(__unit.at);
  })()`);
  await screenshot("natural-opening.png");
  await evaluate(
    "globalThis.__earlySnapshot=__PULP_WARS_APP__.controller.snapshot()",
  );
  const natural = await captureClicks(naturalPoint);
  await evaluate("__host.resetInspectionCycle();__host.activate(__unit.at)");
  await delay(400);
  const movePoint = await evaluate<{ x: number; y: number }>(
    "(()=>{const command=__model.offeredCommands.find(c=>c.kind==='MOVE'&&c.unitId===__unit.id);if(!command)throw Error('Natural opening has no Move');return __point(command.path.at(-1))})()",
  );
  await evaluate(
    "globalThis.__boardPerf.events=[];__boardPerf.calls=[];__boardPerf.frames=[]",
  );
  await click(movePoint.x, movePoint.y);
  await delay(1200);
  const movement = await evaluate<Capture>(
    "({events:__boardPerf.events,calls:__boardPerf.calls,frames:__boardPerf.frames,selected:__model.interaction.selectedUnitId,units:__model.view.units.length,commands:__model.offeredCommands.length,readyUnits:0})",
  );

  // Synthetic public-view renderer stress: 25 x 25 explored Grass and 60
  // ready human units. No state is dispatched or persisted for this fixture.
  await evaluate(`(async()=>{
    const query=await import('/src/engine/v7/query.ts');
    const base=structuredClone(__earlySnapshot);
    const view=base.view;
    const unit=view.units.find(u=>u.ownerId===view.viewer.id);
    const tile=view.board.tiles.find(t=>t.explored&&t.terrain==='GRASS');
    view.board={width:25,height:25,tiles:Array.from({length:625},(_,n)=>({...tile,at:{x:n%25,y:Math.floor(n/25)},resource:null,improvement:null,road:false,site:null,territoryCityId:null,territoryOwnerId:null}))};
    view.units=Array.from({length:60},(_,n)=>({...unit,id:500+n,at:n===0?view.cities[0].at:{x:2+(n%10)*2,y:2+Math.floor(n/10)*2}}));
    const occupied=new Set();
    for(const current of view.units){
      while(occupied.has(current.at.x+','+current.at.y))current.at={x:current.at.x,y:current.at.y+1};
      occupied.add(current.at.x+','+current.at.y);
    }
    globalThis.__busySnapshot={...base,view,offeredCommands:query.queryPlayerCommandsV7(view)};
    __PULP_WARS_APP__.view.destroy();
  })()`);
  const busy: Record<string, Capture> = {};
  const ambient: Record<string, ReturnType<typeof summarize>> = {};
  for (const motion of ["FULL", "REDUCED"] as const) {
    await connection.send("Emulation.setEmulatedMedia", {
      features: [
        {
          name: "prefers-reduced-motion",
          value: motion === "REDUCED" ? "reduce" : "no-preference",
        },
      ],
    });
    const point = await evaluate<{ x: number; y: number }>(`(async()=>{
      globalThis.__fixtureView?.destroy();
      const dom=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/render/dom/app-view-v7.ts')).name);
      const snapshot=__busySnapshot;
      const controller={snapshot:()=>snapshot,subscribe:f=>{f(snapshot);return ()=>{}},subscribeAcceptedBoundary:()=>()=>{}};
      globalThis.__fixtureView=new dom.Ruleset7DomAppView(document,document.querySelector('#app'),controller);
      const geometry=await import('/src/render/canvas/geometry.ts');
      const rect=document.querySelector('canvas').getBoundingClientRect();
      const size={width:rect.width,height:rect.height};
      const capital=snapshot.view.cities.find(c=>c.ownerId===snapshot.view.viewer.id&&c.isCapital);
      const camera=geometry.centerCameraOn(geometry.fitCamera(snapshot.view.board,size),geometry.projectGrid(capital.at),size);
      const p=geometry.worldToScreen(geometry.projectGrid(snapshot.view.units[0].at),camera);
      return {x:rect.left+p.x,y:rect.top+p.y};
    })()`);
    await delay(1800);
    busy[motion] = await captureClicks(point);
    await evaluate(
      "__host.resetInspectionCycle();__host.activate(__model.view.units[0].at)",
    );
    await delay(400);
    await screenshot(`synthetic-25x25-60-${motion.toLowerCase()}.png`);
    await evaluate("__boardPerf.rafWork=[];__boardPerf.rafWorkActive=true");
    await delay(2000);
    const work = await evaluate<number[]>(
      "(__boardPerf.rafWorkActive=false,__boardPerf.rafWork)",
    );
    ambient[motion] = summarize(work);
  }
  const graphics = process.argv.includes("--skip-graphics")
    ? null
    : await evaluate<{
        readonly drawMs: readonly number[];
        readonly cacheBytes: number;
        readonly changedPixels: number;
        readonly maximumChannelDelta: number;
        readonly readyUnits: number;
        readonly loadedImages: number;
        readonly image: string;
      }>(`(async()=>{
    const renderer=await import('/src/render/canvas/board-renderer-v7.ts');
    const glow=await import('/src/render/canvas/glow-cache-v7.ts');
    const geometry=await import('/src/render/canvas/geometry.ts');
    const art=await import('/src/assets/generated-art-manifest.ts');
    const view=structuredClone(__busySnapshot.view);
    view.board.tiles=view.board.tiles.map(tile=>({
      ...tile,
      terrain:tile.at.x%7===2&&tile.at.y%4===1?'MOUNTAIN':tile.at.x%5===0&&tile.at.y%3===0?'FOREST':tile.terrain
    }));
    const first=view.units[0];
    const plan=renderer.buildBoardRenderPlanV7(view,__busySnapshot.offeredCommands,{
      selection:{kind:'UNIT',unitId:first.id},selectedUnitId:first.id,selectedAchievement:null,cursor:first.at
    });
    const ids=[...new Set(plan.entries.map(entry=>entry.assetId).filter(Boolean))];
    const images=new Map();
    await Promise.all(ids.map(id=>new Promise(resolve=>{
      const source=art.ACCEPTED_ART_URLS[id];
      if(!source){resolve();return}
      const image=new Image();
      image.onload=()=>{images.set(id,image);resolve()};
      image.onerror=()=>resolve();
      image.src=source;
    })));
    const size=document.querySelector('canvas').getBoundingClientRect();
    const viewport={width:size.width,height:size.height};
    const capital=view.cities.find(c=>c.ownerId===view.viewer.id&&c.isCapital);
    const camera=geometry.centerCameraOn(geometry.fitCamera(view.board,viewport),geometry.projectGrid(capital.at),viewport);
    const dpr=devicePixelRatio;
    const make=()=>{const canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width*dpr);canvas.height=Math.round(viewport.height*dpr);return canvas};
    const cached=make(),uncached=make();
    const cache=new glow.BoardGlowCacheV7(document);
    const shared={viewport,devicePixelRatio:dpr,camera,plan,images:{resolve:id=>images.get(id)??null},reducedMotion:false,highContrast:false};
    const drawMs=[];
    for(let n=0;n<35;n++){
      const start=performance.now();
      renderer.drawBoardV7({...shared,context:cached.getContext('2d'),glowCache:cache,readinessElapsedMs:n*16});
      if(n>=5)drawMs.push(performance.now()-start);
    }
    renderer.drawBoardV7({...shared,context:cached.getContext('2d'),glowCache:cache,readinessElapsedMs:800});
    renderer.drawBoardV7({...shared,context:uncached.getContext('2d'),readinessElapsedMs:800});
    const a=cached.getContext('2d').getImageData(0,0,cached.width,cached.height).data;
    const b=uncached.getContext('2d').getImageData(0,0,uncached.width,uncached.height).data;
    let changedPixels=0,maximumChannelDelta=0;
    for(let i=0;i<a.length;i+=4){
      let changed=false;
      for(let channel=0;channel<4;channel++){
        const delta=Math.abs(a[i+channel]-b[i+channel]);
        if(delta>0)changed=true;
        maximumChannelDelta=Math.max(maximumChannelDelta,delta);
      }
      if(changed)changedPixels++;
    }
    return {
      drawMs,cacheBytes:cache.byteLength,changedPixels,maximumChannelDelta,
      readyUnits:plan.entries.filter(entry=>entry.kind==='UNIT'&&entry.ready).length,
      loadedImages:images.size,image:cached.toDataURL('image/png')
    };
  })()`);
  if (graphics !== null)
    await writeFile(
      path.join(outputRoot, "mixed-fixed-time.png"),
      Buffer.from(
        graphics.image.slice(graphics.image.indexOf(",") + 1),
        "base64",
      ),
    );
  const graphicsEvidence =
    graphics === null
      ? null
      : {
          drawMs: graphics.drawMs,
          cacheBytes: graphics.cacheBytes,
          changedPixels: graphics.changedPixels,
          maximumChannelDelta: graphics.maximumChannelDelta,
          readyUnits: graphics.readyUnits,
          loadedImages: graphics.loadedImages,
        };
  const browserInfo = await evaluate<{
    readonly userAgent: string;
    readonly dpr: number;
    readonly canvasWidth: number;
    readonly canvasHeight: number;
  }>(
    "({userAgent:navigator.userAgent,dpr:devicePixelRatio,canvasWidth:document.querySelector('canvas').width,canvasHeight:document.querySelector('canvas').height})",
  );
  const evidence = {
    fixture: {
      natural: "seed 20, opening 11 x 11 board",
      busy: "synthetic public view, 25 x 25 fully explored Grass, 60 ready human units",
      samplesPerClickConfiguration: 25,
      warmupClicksPerConfiguration: 5,
      clickIntervalMs: 300,
      nextRaf:
        "rAF callback timestamp minus Canvas pointerup handler start; scheduling proxy, not paint completion",
      url,
      chrome,
      host: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        release: release(),
        logicalCpus: cpus().length,
        loadAverage: loadavg(),
      },
      browser: browserInfo,
      requestedDpr,
      viewport: "1440 x 1000 Chrome window; Canvas uses application CSS layout",
    },
    summary: {
      natural: summary(natural),
      FULL: summary(busy.FULL),
      REDUCED: summary(busy.REDUCED),
      ambientRafWorkMs: ambient,
      graphicsDrawMs: graphics === null ? null : summarize(graphics.drawMs),
      fixedTimeImageComparison:
        graphics === null
          ? null
          : {
              changedPixels: graphics.changedPixels,
              maximumChannelDelta: graphics.maximumChannelDelta,
              readyUnits: graphics.readyUnits,
              loadedImages: graphics.loadedImages,
              cacheBytes: graphics.cacheBytes,
              cacheLimitBytes: 24 * 1024 * 1024,
            },
      movement: {
        pointerHandlerMs: movement.events.find(
          (event) => event.type === "pointerup",
        )?.duration,
        nextRafProxyMs: movement.frames.find(
          (frame) => frame.type === "pointerup",
        )?.raf,
        dispatchResolvedMs: movement.calls.find(
          (call) => call.name === "dispatch-resolved",
        )?.duration,
        presentationStartFromPointerMs:
          (movement.calls.find((call) => call.name === "presentBoundary")
            ?.start ?? 0) -
          (movement.events.find((event) => event.type === "pointerup")?.start ??
            0),
        presentationDurationMs: movement.calls.find(
          (call) => call.name === "presentBoundary-resolved",
        )?.duration,
      },
    },
    raw: { natural, busy, movement, graphics: graphicsEvidence },
  };
  await writeFile(
    path.join(outputRoot, "evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
  const failures: string[] = [];
  if (browserInfo.dpr !== requestedDpr)
    failures.push(
      `device-pixel ratio ${browserInfo.dpr} does not match requested ${requestedDpr}`,
    );
  for (const [label, capture] of [
    ["natural", natural],
    ["FULL", busy.FULL],
    ["REDUCED", busy.REDUCED],
  ] as const) {
    const result = summary(capture);
    if (
      result.pointerHandlerMs.n < 25 ||
      result.nextRafProxyMs.n < 25 ||
      result.hostUpdateMs.n < 25
    )
      failures.push(`${label}: fewer than 25 measured interactions`);
  }
  for (const motion of ["FULL", "REDUCED"] as const)
    if (
      busy[motion].units !== 60 ||
      busy[motion].readyUnits !== 60 ||
      busy[motion].commands < 60
    )
      failures.push(
        `${motion}: busy fixture is not 60 ready units with actions`,
      );
  if (ambient.FULL.n === 0 || ambient.REDUCED.n !== 0)
    failures.push("ambient animation callback count is inconsistent");
  for (const [name, value] of Object.entries(evidence.summary.movement))
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
      failures.push(`movement ${name} is missing or nonfinite`);
  if (graphics !== null) {
    if (graphics.drawMs.length < 25)
      failures.push("fewer than 25 warmed direct graphics draws");
    if (graphics.changedPixels !== 0 || graphics.maximumChannelDelta !== 0)
      failures.push("fixed-time cached/uncached pixel comparison differs");
    if (
      graphics.readyUnits !== 60 ||
      graphics.loadedImages === 0 ||
      graphics.cacheBytes > 24 * 1024 * 1024
    )
      failures.push("fixed-time fixture, asset load, or cache bound failed");
  }
  if (failures.length > 0)
    throw new Error(
      `Board presentation probe invalid: ${failures.join("; ")}. Evidence: ${outputRoot}`,
    );
  process.stdout.write(
    `${JSON.stringify(evidence.summary, null, 2)}\nEvidence: ${outputRoot}\n`,
  );
} finally {
  browser.close();
}
