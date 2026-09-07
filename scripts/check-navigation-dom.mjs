/* Rendered regression check for Akibwa's approved personal homepage.
 *
 * Usage: npm run build && npm run check:navigation:dom
 * Optional: CHECK_NAV_URL=https://akibwa.com npm run check:navigation:dom
 */

import { execSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { checkTrekPaths } from "./check-trek-paths-dom.mjs";

const outDir = fileURLToPath(new URL("../out", import.meta.url));
const externalOrigin = process.env.CHECK_NAV_URL || null;
const failures = [];
let currentSection = "setup";
let cdp;
let origin;

const section = (name) => {
  currentSection = name;
  process.stdout.write(`\n■ ${name}\n`);
};

const check = (ok, message) => {
  process.stdout.write(`  ${ok ? "ok" : "FAIL"} ${message}\n`);
  if (!ok) failures.push(`${currentSection}: ${message}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const capture = async (name) => {
  if (!process.env.CHECK_NAV_CAPTURE_DIR) return;
  mkdirSync(process.env.CHECK_NAV_CAPTURE_DIR, { recursive: true });
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(process.env.CHECK_NAV_CAPTURE_DIR, `${name}.png`), Buffer.from(data, "base64"));
};

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".woff2": "font/woff2"
};

const startServer = () =>
  new Promise((resolve) => {
    const server = createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
      const candidates = [
        join(outDir, pathname),
        join(outDir, pathname, "index.html"),
        join(outDir, `${pathname.replace(/\/$/, "")}.html`)
      ];
      for (const file of candidates) {
        if (!existsSync(file) || file.endsWith("/") || file.endsWith("out")) continue;
        try {
          const body = readFileSync(file);
          response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
          response.end(body);
          return;
        } catch {
          /* Directory candidate; try the next form. */
        }
      }
      response.writeHead(404);
      response.end("not found");
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const path of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ]) {
    if (existsSync(path)) return path;
  }
  for (const name of ["google-chrome", "chromium", "chromium-browser"]) {
    try {
      return execSync(`command -v ${name}`, { encoding: "utf8" }).trim();
    } catch {
      /* Keep looking. */
    }
  }
  return null;
};

const launchChrome = (chromeBin, profileDir) =>
  new Promise((resolve, reject) => {
    const processHandle = spawn(
      chromeBin,
      [
        "--headless=new",
        "--remote-debugging-port=0",
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        ...(process.env.CHECK_TREK_ONLY ? process.env.CHECK_TREK_HARDWARE_GPU === "1" ? [] : ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] : ["--disable-gpu"]),
        "--hide-scrollbars",
        "--window-size=1440,900",
        "about:blank"
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) reject(new Error("Chrome DevTools endpoint did not appear within 15s"));
    }, 15000);
    const onData = (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (!match || settled) return;
      settled = true;
      clearTimeout(timer);
      processHandle.stderr.off("data", onData);
      resolve({ processHandle, port: Number(match[1]) });
    };
    processHandle.stderr.on("data", onData);
    processHandle.on("exit", () => {
      clearTimeout(timer);
      if (!settled) reject(new Error(`Chrome exited before DevTools was ready:\n${stderr}`));
    });
  });

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = [];
    this.events = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
        return;
      }
      if (!message.method) return;
      this.events.push(message);
      this.waiters = this.waiters.filter((waiter) => {
        if (waiter.method !== message.method) return true;
        waiter.resolve(message.params);
        return false;
      });
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error(`WebSocket failed: ${url}`)), { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  waitFor(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeoutMs);
      this.waiters.push({
        method,
        resolve: (params) => {
          clearTimeout(timer);
          resolve(params);
        }
      });
    });
  }
}

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (exceptionDetails) {
    throw new Error(
      `page evaluation failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`
    );
  }
  return result.value;
};

const goto = async (path = "/") => {
  const loaded = cdp.waitFor("Page.loadEventFired");
  const navigation = await cdp.send("Page.navigate", { url: `${origin}${path}` });
  if (!navigation.loaderId) await cdp.send("Page.reload");
  await loaded;
  await sleep(300);
};

const setDesktop = async (width = 1440, height = 900) => {
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
};

const setMobile = async () => {
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
};

const publicLandingState = () =>
  evaluate(`(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    };
    const forbiddenIdentity = String.fromCharCode(68, 97, 110, 105, 101, 108, 32, 65, 116, 107, 105, 110, 115, 111, 110);
    const bodyText = document.body.innerText;
    const links = [...document.querySelectorAll("a[href]")].map((link) => link.href);
    const projectRail = document.querySelector(".concept-project-swipe");
    const projectStops = [...document.querySelectorAll(".concept-project-stop")];
    return {
      identity: document.querySelector(".concept-identity")?.textContent.trim(),
      lede: document.querySelector(".concept-lede")?.textContent.trim(),
      projectCount: document.querySelectorAll(".concept-project-card").length,
      careerCount: document.querySelectorAll(".concept-career-timeline button").length,
      tasteCount: document.querySelectorAll(".personal-taste-card").length,
      hasPersonalIdentity: bodyText.includes(forbiddenIdentity),
      hasCareer: [...document.querySelectorAll("h1, h2, h3")].some((heading) => heading.textContent.trim() === "Career"),
      hasTasteLibrary: bodyText.includes("Taste Library"),
      socialLinks: links.filter((href) => /(?:linkedin|instagram|x)\\.com/.test(href)),
      directEmailLinks: links.filter((href) => href.startsWith("mailto:")),
      emailButtonCount: document.querySelectorAll('button[aria-label="Email Akibwa"]').length,
      googlebot: document.querySelector('meta[name="googlebot"]')?.content ?? "",
      overflow: document.documentElement.scrollWidth - innerWidth,
      hero: rect(".concept-hero"),
      career: rect(".personal-career"),
      taste: rect(".personal-taste"),
      projects: {
        railWidth: projectRail.clientWidth,
        railScrollWidth: projectRail.scrollWidth,
        widths: projectStops.map((stop) => stop.getBoundingClientRect().width),
        tops: projectStops.map((stop) => stop.getBoundingClientRect().top),
        first: rect(".concept-project-stop"),
        copyFits: projectStops.every((stop) => {
          const copy = document.querySelector(".concept-project-detail p");
          return !copy || copy.scrollWidth <= copy.clientWidth + 1;
        })
      }
    };
  })()`);

const checkPublicLanding = async () => {
  section("public identity boundary");
  await setDesktop();
  await goto("/");
  let state = await publicLandingState();
  const ax=await cdp.send('Accessibility.getFullAXTree');
  const mainHeading=ax.nodes.find(node=>node.role?.value==='heading' && node.properties?.some(property=>property.name==='level'&&property.value.value===1));
  check(mainHeading?.name?.value === "I'm Daniel. Online as Akibwa.", `the h1 has a meaningful computed accessible name [${mainHeading?.name?.value}]`);
  check(state.identity.includes("Daniel") && state.identity.includes("Akibwa"), "the approved introduction reserves both names");
  check(state.lede === "Building in the age of AI", "the masthead preserves Dan's requested proposition");
  check(await evaluate('JSON.stringify([...document.querySelectorAll(".page-footer-details a, .page-footer-details button")].map(item => item.querySelector("span:last-child")?.textContent)) === JSON.stringify(["Instagram", "X", "Email"])'), "contact controls identify their platforms without repeated handles");
  check(await evaluate('!document.querySelector(".taste-source-note") && !document.querySelector(".concept-taste-head .archive-link")'), "the closing sentence and browse-all album link are removed");
  check(state.projectCount === 3, `the homepage shows three current projects [${state.projectCount}]`);
  check(state.careerCount === 8, `the approved compact career bar has eight roles [${state.careerCount}]`);
  check(state.tasteCount === 48, `Highlights fills the wall with forty-eight approved covers [${state.tasteCount}]`);
  check(!state.hasPersonalIdentity, "the indexed page does not contain the personal full name");
  check(state.hasCareer && state.hasTasteLibrary, "the approved career and taste chapters are restored");
  check(state.socialLinks.length === 2 && state.socialLinks.every(href=>href.includes('/dakibwa')), "only the two approved social profiles are linked");
  check(
    state.directEmailLinks.length === 0 && state.emailButtonCount === 1,
    "contact is available without publishing the address in HTML"
  );
  check(
    state.googlebot.includes("noimageindex") && state.googlebot.includes("max-snippet:120"),
    `Google receives the restricted preview policy [${state.googlebot}]`
  );
  check(state.overflow <= 1, `the desktop page stays inside the viewport [${state.overflow}px]`);
  check(
    state.hero && state.career && state.taste && state.career.top > state.projects.first.bottom && state.taste.top >= state.career.bottom - 1,
    "the editorial chapters remain in reading order"
  );
  for(const width of [320,390,560,800,820,1024,1440,1920]){
    await setDesktop(width);
    check(await evaluate(`(() => {
      const lede=document.querySelector('.concept-lede');
      const range=document.createRange();range.selectNodeContents(lede);
      return range.getClientRects().length===1 && lede.scrollWidth<=lede.clientWidth+1;
    })()`), `the proposition fits on one line at ${width}px`);
    await evaluate('document.querySelector(".concept-project-card").blur(); document.querySelector(".concept-project-card").focus()');
    await sleep(500);
    const bounds=await evaluate(`(() => {
      const career=document.querySelector('.personal-career').getBoundingClientRect();
      const detail=document.querySelector('.concept-project-detail');
      return {open:document.querySelector('#project-detail').getAttribute('aria-hidden')==='false',overlap:!detail || detail.getBoundingClientRect().bottom>career.top,overflow:document.documentElement.scrollWidth-innerWidth,link:document.querySelector('a.concept-project-card')?.getAttribute('href')};
    })()`);
    const fits = bounds.open && !bounds.overlap && bounds.overflow<=1 && bounds.link === '/features/';
    check(fits, `the project description and direct card link fit above Career at ${width}px${fits ? '' : ` [${JSON.stringify(bounds)}]`}`);
    await cdp.send("Input.dispatchKeyEvent", {type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
    await sleep(400);
  }
  section("responsive project previews");
  await evaluate('document.activeElement.blur(); scrollTo({top:0,behavior:"instant"})');
  for (const width of [560,700,820,1050,1051]) {
    await setDesktop(width);
    for (const edge of ["start","end"]) {
      await cdp.send("Input.dispatchMouseEvent", {type:"mouseMoved",x:1,y:1});
      await evaluate(`(() => {const rail=document.querySelector('.concept-project-swipe'); rail.scrollLeft=${edge === "start" ? "0" : "rail.scrollWidth"};})()`);
      await sleep(100);
      const visible = await evaluate(`(() => {
        const rail=document.querySelector('.concept-project-swipe').getBoundingClientRect();
        const card=document.querySelector('.concept-portuguese .concept-project-card').getBoundingClientRect();
        const left=Math.max(card.left,rail.left), right=Math.min(card.right,rail.right);
        return {left,right,width:Math.max(0,right-left),cardWidth:card.width,x:(left+right)/2,y:(card.top+card.bottom)/2};
      })()`);
      await cdp.send("Input.dispatchMouseEvent", {type:"mouseMoved",x:visible.x,y:visible.y});
      await sleep(520);
      const panel = await evaluate(`(() => {
        const shell=document.querySelector('#project-detail');
        const box=document.querySelector('.concept-project-detail').getBoundingClientRect();
        return {open:shell.getAttribute('aria-hidden')==='false',left:box.left,right:box.right,overflow:document.documentElement.scrollWidth-innerWidth};
      })()`);
      const readable = visible.width >= Math.min(200,visible.cardWidth);
      const aligned = readable
        ? panel.open && Math.abs(panel.left-visible.left)<1 && Math.abs(panel.right-visible.right)<1
        : !panel.open;
      check(aligned && panel.overflow<=1, `the ${edge} of the project rail keeps its preview aligned and readable at ${width}px${aligned ? '' : ` [${JSON.stringify({visible,panel})}]`}`);
    }
  }
  await cdp.send("Input.dispatchMouseEvent", {type:"mouseMoved",x:1,y:1});
  await sleep(360);
  section("project and career motion");
  await setDesktop(1440);
  const dividerMotion = (divider, action) => evaluate(`new Promise(resolve => {
    const target=document.querySelector(${JSON.stringify(divider)});
    const position=()=>target.getBoundingClientRect().top+scrollY;
    const samples=[position()];
    ${action}
    const until=performance.now()+560;
    const sample=()=>{
      samples.push(position());
      if(performance.now()>=until) resolve(samples);
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })`);
  const opensSmoothly = (samples) => samples.at(-1)>samples[0]+20 && samples.some(y=>y>samples[0]+2 && y<samples.at(-1)-2);
  const closesSmoothly = (samples) => samples.at(-1)<samples[0]-20 && samples.some(y=>y<samples[0]-2 && y>samples.at(-1)+2);
  const projectControl = 'document.querySelector(".concept-project-card")';
  check(opensSmoothly(await dividerMotion('#career', `${projectControl}.blur(); ${projectControl}.focus();`)), "opening a project smoothly pushes the Career divider down");
  check(closesSmoothly(await dividerMotion('#career', `${projectControl}.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`)), "closing a project smoothly brings the Career divider back");
  check(await evaluate('document.querySelector("#project-detail").inert && document.querySelector("#project-detail").getAttribute("aria-hidden")==="true"'), "closed project descriptions stay hidden from assistive technology");
  check(await evaluate(`(() => {
    const links=[...document.querySelectorAll('a.concept-project-card')];
    return JSON.stringify(links.map(link=>link.getAttribute('href')))===JSON.stringify(['/features/','https://portuguesewithines.com/','/trek/']) &&
      !document.querySelector('#project-detail a, #project-detail button');
  })()`), "each project card links directly to its destination without a separate action button");
  const careerControl = 'document.querySelectorAll(".concept-career-timeline button")[1]';
  check(opensSmoothly(await dividerMotion('#taste', `${careerControl}.focus(); ${careerControl}.click();`)), "opening a career statement smoothly pushes the Taste divider down");
  check(await evaluate('(document.querySelector("#career-detail").textContent.includes("Senior BI Developer") && getComputedStyle(document.querySelector("#career-detail")).opacity !== "0" && getComputedStyle(document.querySelector("#career-detail")).visibility === "visible")'), "career activation displays the selected public role");
  check(await evaluate('document.querySelector(".concept-career-statement").textContent.includes("UK growth and clean energy")'), "career detail restores the original mission statement");
  check(await evaluate(`(() => {
    const statement=document.querySelector('.concept-career-statement');
    const detail=document.querySelector('#career-detail').getBoundingClientRect();
    return getComputedStyle(statement).fontFamily.includes('Iowan') && statement.querySelector('strong') && detail.bottom<document.querySelector('#taste').getBoundingClientRect().top;
  })()`), "the original serif statement and emphasis fit above the moving divider");
  check(closesSmoothly(await dividerMotion('#taste', `${careerControl}.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`)), "closing a career statement smoothly restores the compact spacing");
  check(await evaluate('!document.querySelector(".concept-career-stop[aria-expanded=true]")'), "Escape dismisses held career detail");
  await evaluate('document.querySelectorAll(".concept-career-stop")[2].focus()');
  check(await evaluate('document.querySelector("#career-detail").textContent.includes("BI Team Lead")'), "keyboard focus previews the next career role");

  const panelMotion = (selector, action) => evaluate(`new Promise(resolve => {
    const panel=document.querySelector(${JSON.stringify(selector)});
    const sample=()=>{
      const box=panel.getBoundingClientRect();
      return {left:box.left,top:box.top,height:box.height,space:panel.closest('.index-reveal-shell').getBoundingClientRect().height,
        opacity:Number(getComputedStyle(panel.querySelector('.index-reveal-content:not(.is-outgoing)')).opacity)};
    };
    const samples=[sample()];
    ${action}
    const until=performance.now()+560;
    const frame=()=>{samples.push(sample());if(performance.now()<until) requestAnimationFrame(frame);else resolve(samples);};
    requestAnimationFrame(frame);
  })`);
  const passesThrough = (samples, property) => {
    const start=samples[0][property], end=samples.at(-1)[property];
    return Math.abs(end-start)>4 && samples.some(sample=>sample[property]>Math.min(start,end)+1 && sample[property]<Math.max(start,end)-1);
  };
  await evaluate('document.querySelector(".concept-project-card").focus()');
  await sleep(550);
  const projectHandover=await panelMotion('.concept-project-detail', 'document.querySelectorAll(".concept-project-card")[1].focus();');
  check(passesThrough(projectHandover,'left') && projectHandover.every(sample=>sample.space>20), "Projects visibly glides across cards without collapsing its description");
  check(projectHandover.some(sample=>sample.opacity>0.05 && sample.opacity<0.95), "project descriptions crossfade during the sideways glide");
  check(await evaluate('document.querySelectorAll("#project-description").length===1'), "project handover keeps one accessible description target");
  await evaluate('document.querySelectorAll(".concept-career-stop")[5].focus()');
  await sleep(550);
  const careerHandover=await panelMotion('#career-detail', 'document.querySelectorAll(".concept-career-stop")[4].focus();');
  check(passesThrough(careerHandover,'left'), "career handover glides through intermediate positions beneath the selected role");
  check(passesThrough(careerHandover,'height') && passesThrough(careerHandover,'space'), "career handover smoothly fits different text heights and moves the following content");
  check(careerHandover.some(sample=>sample.opacity>0.05 && sample.opacity<0.95), "incoming career text fades into the moving box");
  const interrupted=await evaluate(`new Promise(resolve=>{
    const buttons=document.querySelectorAll('.concept-career-stop');
    buttons[0].focus();setTimeout(()=>buttons[7].focus(),70);setTimeout(()=>buttons[2].focus(),130);
    setTimeout(()=>{const panel=document.querySelector('#career-detail');resolve({
      title:panel.querySelector('.index-reveal-content:not(.is-outgoing) > strong').textContent,
      outgoing:panel.querySelectorAll('.is-outgoing').length,
      open:!panel.closest('.index-reveal-shell').inert
    });},700);
  })`);
  check(interrupted.title==='Leeds Building Society' && interrupted.outgoing===0 && interrupted.open, "rapid direction changes settle on the latest role without stale text");
  for (const width of [320,390,820]) {
    await setDesktop(width);
    await goto('/');
    await evaluate('document.querySelectorAll(".concept-career-stop")[7].focus()');
    await sleep(550);
    check(await evaluate(`(() => {
      const panel=document.querySelector('#career-detail').getBoundingClientRect();
      const section=document.querySelector('#career').getBoundingClientRect();
      const gap=document.querySelector('#taste').getBoundingClientRect().top-panel.bottom;
      return panel.left>=section.left-1 && panel.right<=section.right+1 && gap>=23 && gap<=37 && document.documentElement.scrollWidth<=innerWidth+1;
    })()`), `the last career role fits the ${width}px page and keeps a close, clear divider`);
    if(width===320){
      await evaluate('document.querySelector(".concept-career-timeline").scrollLeft=0');
      await sleep(380);
      check(await evaluate('document.querySelector(".concept-career-detail-lane").inert && document.querySelector(".concept-career-detail-lane").getBoundingClientRect().height<1'), "scrolling a career role away closes its space and hides its text");
    }
  }
  await setDesktop(1440);

  section("historical composition and motion");
  await goto("/");
  check(await evaluate('document.querySelector(".personal-taste-card").textContent.includes("Music for Psychedelic Therapy")'), "the most-listened curated album leads the Taste rail");
  const railState = await evaluate(`(() => {
    const rail=document.querySelector('.personal-taste-rail');
    const lede=getComputedStyle(document.querySelector('.concept-lede'));
    return {scrolls:rail.scrollWidth>rail.clientWidth,flow:getComputedStyle(rail).gridAutoFlow,serif:lede.fontFamily};
  })()`);
  check(railState.scrolls && railState.flow === 'column', "Taste browses the staggered wall through one native horizontal rail");
  check(await evaluate(`(() => {
    const columns=[...document.querySelectorAll('.taste-wall-column')];
    const tops=columns.slice(0,6).map(column=>column.querySelector('article').getBoundingClientRect().top);
    return columns.length>8 && new Set(tops.map(top=>Math.round(top))).size>3 && columns.every(column=>{
      const cards=[...column.querySelectorAll('article')];
      return cards.length>=3 && cards.length<=4 && cards.every((card,index)=>!index || card.getBoundingClientRect().top>cards[index-1].getBoundingClientRect().bottom+5);
    });
  })()`), "Highlights forms densely spaced three- or four-piece stacks with varied starting heights and no overlap");
  check(/Iowan|Palatino|Georgia/.test(railState.serif), "the proposition keeps its historical serif");
  const nameBefore=await evaluate(`(() => {
    const name=document.querySelector('.hero-name-value');
    const rect=document.querySelector('.concept-hero').getBoundingClientRect();
    return {name:name.textContent,animation:getComputedStyle(name).animationName,top:rect.top,height:rect.height};
  })()`);
  await sleep(3350);
  const nameAfter=await evaluate(`(() => {
    const rect=document.querySelector('.concept-hero').getBoundingClientRect();
    return {name:document.querySelector('.hero-name-value').textContent,top:rect.top,height:rect.height};
  })()`);
  check(nameBefore.name === 'Daniel' && nameAfter.name === 'Akibwa' && nameBefore.animation === 'word-flick', "the original flick changes the name after its initial rest");
  check(nameBefore.top === nameAfter.top && nameBefore.height === nameAfter.height, "the name flip does not move the surrounding composition");
  await evaluate('document.querySelectorAll(".taste-filters button")[2].click()');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 35'), "the Films filter keeps the whole approved shelf reachable");
  check(await evaluate(`(() => {
    const art=document.querySelector('.personal-taste-art'), img=art.querySelector('img'), box=art.getBoundingClientRect();
    return img.src.includes('/film-posters/') && Math.abs(box.width/box.height-2/3)<.01;
  })()`), "films show their real posters in an uncropped portrait frame");
  await evaluate('document.querySelectorAll(".taste-filters button")[0].click()');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 48'), "Highlights restores the complete mixed wall");

  section("browsing controls and taste search");
  check(await evaluate('document.querySelectorAll(".concept-career-year").length === 8 && !document.querySelector(".concept-career-current")'), "career dates stay readable while the extra current-role line is removed");
  await evaluate(`document.querySelector('#taste button[aria-label="Next taste"]').click()`);
  await sleep(700);
  check(await evaluate(`document.querySelector('#taste-rail').scrollLeft > 100 && !document.querySelector('#taste button[aria-label="Previous taste"]').disabled`), "Taste arrows move the native rail and update the available direction");
  await evaluate(`document.querySelector('#taste button[aria-label="Previous taste"]').click()`);
  await sleep(700);
  check(await evaluate(`document.querySelector('#taste-rail').scrollLeft <= 2 && document.querySelector('#taste button[aria-label="Previous taste"]').disabled`), "the back arrow returns to the start and disables at the edge");
  await evaluate('document.querySelector(".taste-search-toggle").click()');
  const tasteSearch = async (value) => {
    await evaluate(`(() => { const input=document.querySelector('.taste-search-field input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await sleep(200);
  };
  await tasteSearch('Paul Thomas Anderson');
  check(await evaluate('[...document.querySelectorAll(".personal-taste-card")].length >= 4 && [...document.querySelectorAll(".personal-taste-card")].every(card => card.textContent.includes("Paul Thomas Anderson"))'), "Highlights search reaches the full film collection by creator");
  await tasteSearch('Graceland');
  check(await evaluate('[...document.querySelectorAll(".personal-taste-card")].some(card => card.textContent.includes("Paul Simon"))'), "search finds albums across the collection");
  await tasteSearch('veritasium');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 1 && document.querySelector(".personal-taste-card img").src.includes("veritasium")'), "search finds a podcast by title and shows its verified cover");
  await tasteSearch('zzz-no-such-title-9184');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 0 && document.querySelector(".taste-search-status").textContent.includes("No matches")'), "an empty search gives a clear recoverable state");
  await evaluate(`document.querySelector('button[aria-label="Close taste search"]').click()`);
  await sleep(100);
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 48 && document.activeElement.matches(".taste-search-toggle")'), "closing search restores the wall and keyboard focus");

  section("ranked listening shelves");
  await evaluate('document.querySelectorAll(".taste-filters button")[1].click()');
  await sleep(200);
  const ranked = () => evaluate(`(() => {
    const counts=[...document.querySelectorAll('.personal-taste-card')].map(card=>card.hasAttribute('data-listens') ? Number(card.dataset.listens) : -1);
    return counts.length >= 36 && counts.every((count,index)=>!index || count<=counts[index-1]);
  })()`);
  check(await ranked(), "Music exposes the full catalogue in descending listening order");
  const pointer = await evaluate(`(() => {
    const card=document.querySelector('.personal-taste-card');card.scrollIntoView({block:'center',behavior:'instant'});
    const box=card.getBoundingClientRect();return {x:box.left+20,y:box.top+20};
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', ...pointer});
  await sleep(180);
  const tasteOpeningHeight = await evaluate('document.querySelector(".personal-taste-detail-shell").getBoundingClientRect().height');
  await sleep(400);
  check(await evaluate(`(() => {
    const card=document.querySelector('.personal-taste-card');
    const detail=document.querySelector('#taste-detail');
    return detail && getComputedStyle(detail).visibility==='visible' &&
      detail.querySelector('.index-reveal-content:not(.is-outgoing) > strong').textContent===card.querySelector('.personal-taste-title').textContent &&
      detail.querySelector('.personal-taste-detail-count').textContent.includes(Number(card.dataset.listens).toLocaleString('en-GB')) &&
      getComputedStyle(card.querySelector('.personal-taste-caption')).display==='none' && !card.querySelector('.listening-hover');
  })()`), "hover reveals album, artist and combined plays beside the selected cover");
  check(await evaluate('document.querySelector(".personal-taste-detail-shell").getBoundingClientRect().height') > tasteOpeningHeight + 1, "Taste reveals the floating box gradually with the shared timing");
  await capture("music-hover-desktop");
  const tasteHandover=await panelMotion('#taste-detail','document.querySelectorAll(".personal-taste-card")[4].focus();');
  check(passesThrough(tasteHandover,'left') && tasteHandover.every(sample=>sample.space>20), "Taste glides between covers without collapsing the open dropdown");
  check(tasteHandover.some(sample=>sample.opacity>0.05 && sample.opacity<0.95), "Taste crossfades incoming title, creator and count");
  const verticalHandover=await panelMotion('#taste-detail','document.querySelectorAll(".personal-taste-card")[5].focus();');
  check(passesThrough(verticalHandover,'top'), "Taste details glide between rows as well as columns");
  check(await evaluate(`(() => {
    const panel=document.querySelector('#taste-detail').getBoundingClientRect();
    const card=document.activeElement.getBoundingClientRect();
    return panel.top>=0 && panel.bottom<=innerHeight && (panel.top>=card.bottom || panel.bottom<=card.top);
  })()`), "the wall detail stays on screen and clear of the selected artwork");
  const detailPointer = await evaluate('(() => { const r=document.querySelector("#taste-detail").getBoundingClientRect(); return {x:r.left+20,y:r.top+20}; })()');
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', ...detailPointer});
  check(await evaluate('document.querySelector("#taste").classList.contains("is-open")'), "the revealed text stays open while the pointer moves onto it");
  await cdp.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Escape', code:'Escape', windowsVirtualKeyCode:27});
  await sleep(400);
  check(await evaluate('document.querySelector(".personal-taste-detail-shell").getAttribute("aria-hidden")==="true" && document.querySelector(".personal-taste-detail-shell").getBoundingClientRect().height<1'), "Escape dismisses the Taste panel and closes its space");
  await evaluate('document.querySelectorAll(".personal-taste-card")[7].focus()');
  await sleep(550);
  check(await evaluate(`(() => {
    const detail=document.querySelector('#taste-detail'), box=detail.getBoundingClientRect(), section=document.querySelector('#taste').getBoundingClientRect();
    return detail.querySelector('.index-reveal-content:not(.is-outgoing) > strong').textContent===document.activeElement.querySelector('.personal-taste-title').textContent &&
      box.left>=section.left-1 && box.right<=section.right+1;
  })()`), "keyboard focus reveals the selected album and keeps the panel inside the page");
  await evaluate('document.querySelector(".personal-taste-rail").scrollLeft=1800');
  await sleep(150);
  check(await evaluate('document.querySelector(".personal-taste-detail-shell").getAttribute("aria-hidden")==="true"'), "scrolling the active cover out of view dismisses its panel");
  await evaluate('document.querySelector(".taste-load-more").click()');
  await sleep(200);
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length >= 72'), "more albums are reachable inside the homepage rail");
  check(await ranked(), "descending order is preserved across loaded batches");
  await evaluate('document.querySelectorAll(".taste-filters button")[5].click()');
  await sleep(200);
  for (let batch=0;batch<4 && await evaluate('!!document.querySelector(".taste-load-more")');batch++) {
    await evaluate('document.querySelector(".taste-load-more").click()');
    await sleep(120);
  }
  const listeningPacket = JSON.parse(readFileSync(new URL('../public/listening-catalogue.json', import.meta.url)));
  const expectedPodcasts = listeningPacket.podcasts.length;
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length') === expectedPodcasts, "the complete podcast shelf is reachable");
  check(await ranked(), "podcasts are ranked by their recorded listens");
  await evaluate('document.querySelector(".personal-taste-rail").scrollLeft=0;document.querySelector("#taste").scrollIntoView({block:"center",behavior:"instant"});');
  await capture("podcasts-desktop");
  await goto('/');

  section("mobile public boundary");
  await setMobile();
  await goto("/");
  state = await publicLandingState();
  check(state.identity.includes("Daniel") && state.identity.includes("Akibwa"), "the mobile masthead reserves both names");
  check(state.overflow <= 1, `the mobile page stays inside the viewport [${state.overflow}px]`);
  check(
    state.projects.widths.every((width) => width >= state.projects.railWidth * 0.8 && width <= state.projects.railWidth * 0.9) &&
      state.projects.tops.every((top) => Math.abs(top - state.projects.tops[0]) <= 1) &&
      state.projects.railScrollWidth > state.projects.railWidth * 2,
    `projects form one comfortably sized swipe rail [${state.projects.widths.map((width) => width.toFixed(1)).join(" / ")}px]`
  );
  check(
    state.projects.first.left >= 0 && state.projects.first.right <= 390 && state.projects.copyFits,
    "the first mobile project and every description fit without text clipping"
  );
  check(
    state.directEmailLinks.length === 0 && state.socialLinks.length === 2,
    "mobile HTML preserves private email handling and approved social links"
  );
  await evaluate('document.querySelectorAll(".taste-filters button")[5].click();document.querySelector("#taste").scrollIntoView({block:"end",behavior:"instant"});');
  await sleep(180);
  check(await evaluate('matchMedia("(hover:none)").matches && getComputedStyle(document.querySelector(".personal-taste-caption")).display !== "none" && document.querySelector(".personal-taste-mobile-count").textContent.includes("play") && getComputedStyle(document.querySelector(".personal-taste-detail-shell")).display === "none"'), "touch devices show titles and counts beneath covers without needing hover");
  check(await evaluate(`(() => {
    const columns=[...document.querySelectorAll('.taste-wall-column')];
    return document.documentElement.scrollWidth<=innerWidth+1 && columns.every(column=>[...column.querySelectorAll('article')].every((card,index,cards)=>!index || card.getBoundingClientRect().top>cards[index-1].getBoundingClientRect().bottom));
  })()`), "touch captions remain readable in separate stacks without overlap or page overflow");
  await capture("podcasts-mobile");

  section("collection interaction");
  await setDesktop();
  await goto("/");
  await evaluate('document.querySelectorAll(".taste-filters button")[1].click()');
  await sleep(250);
  const expectedFirst = listeningPacket.albums[0];
  check(await evaluate('Number(document.querySelector(".personal-taste-card").dataset.listens)') === expectedFirst.plays, "the shelf uses the combined history count instead of the Last.fm snapshot");
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:1, y:1});
  await evaluate('document.querySelector(".personal-taste-card").focus(); document.querySelector(".personal-taste-card").click()');
  await sleep(200);
  const focusedCount = await evaluate('document.querySelector("#taste-detail .personal-taste-detail-count")?.textContent');
  check(focusedCount && !/last[.]?fm|spotify|apple|youtube/i.test(focusedCount), `album hover labels contain no provider branding [${focusedCount}]`);
  check(await evaluate('!document.querySelector("dialog") && !location.hash && document.body.style.overflow !== "hidden" && document.querySelector(".personal-taste-card").tagName === "ARTICLE"'), "album cards have no click-through, modal, URL change or scroll lock");
  await cdp.send("Input.dispatchKeyEvent", {type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  await cdp.send("Input.dispatchKeyEvent", {type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  check(await evaluate('!document.querySelector("dialog") && !location.hash'), "Enter reads the focused count without opening details");
  await evaluate('document.querySelectorAll(".taste-filters button")[5].click(); document.querySelector(".personal-taste-card").click()');
  await sleep(100);
  check(await evaluate('!document.querySelector("dialog") && !location.hash'), "podcast cards also have no click-through");
  check(await evaluate('Number(document.querySelector(".personal-taste-card").dataset.listens)') === listeningPacket.podcasts[0].plays, "podcast counts include the available YouTube and Apple evidence");
  await goto('/#taste-item=music:043');
  check(await evaluate('!document.querySelector("dialog")'), "old Taste detail links cannot reopen the removed modal");
  await goto('/albums/');
  check(await evaluate('document.querySelectorAll(".album-browser-card").length === 36'), "the archive mounts only one page of covers");
  check(await evaluate('document.querySelector(\'meta[name="robots"]\').content.includes("noindex")'), "the full archive remains noindex");
  const setSearch=async value=>{
    await evaluate(`(() => { const input=document.querySelector('input[type="search"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await sleep(100);
  };
  await setSearch('Paul Simon Graceland');
  check(await evaluate('[...document.querySelectorAll(".album-browser-card")].every(card=>card.textContent.includes("Paul Simon") && card.querySelector(":scope > strong").textContent.includes("Graceland")) && document.querySelector(".album-browser-card > strong").textContent === "Graceland"'), "artist and album search finds Graceland and keeps its remix release distinct");
  await setSearch('no such record qzx');
  check(await evaluate('!document.querySelector(".album-browser-card") && !!document.querySelector(".album-empty")'), "an empty search has a usable recovery state");
  await evaluate('document.querySelector(".album-empty button").click()');
  await sleep(100);
  check(await evaluate('document.querySelectorAll(".album-browser-card").length === 36'), "clearing an empty search restores the catalogue");
  await evaluate('document.querySelector(".album-browser-card").focus(); document.querySelector(".album-browser-card").click()');
  check(await evaluate('!document.querySelector("dialog") && !location.hash && document.activeElement.matches(".album-browser-card")'), "archive cards retain readable keyboard focus without opening details");
  await goto('/albums/#album=043');
  check(await evaluate('!document.querySelector("dialog")'), "old album hashes cannot reopen details");
  const unpictured = listeningPacket.albums.find(album=>!album.artwork && album.artist && album.album && !album.album.includes("'"));
  await setSearch(unpictured.artist + ' ' + unpictured.album);
  check(await evaluate('!!document.querySelector(".album-browser-card .podcast-type-cover")'), "an older album without a verified cover uses a readable typographic sleeve");

  section("catalogue loading failure");
  await cdp.send("Network.enable");
  await cdp.send("Network.setBlockedURLs", { urls: [`${origin}/listening-catalogue.json`] });
  await evaluate('sessionStorage.removeItem("akibwa:remote:/listening-catalogue.json")');
  await goto('/');
  await evaluate('document.querySelectorAll(".taste-filters button")[1].click()');
  await sleep(300);
  check(await evaluate('document.querySelector(".taste-load-status")?.textContent.includes("couldn’t load") && document.querySelectorAll(".personal-taste-card").length >= 36'), "a failed full-history fetch retains the opening shelf and offers a retry");
  await cdp.send("Network.setBlockedURLs", { urls: [] });
  await evaluate('document.querySelector(".taste-load-status button").click()');
  for (let attempt=0;attempt<30 && await evaluate('!!document.querySelector(".taste-load-status")');attempt++) await sleep(100);
  check(await evaluate('!document.querySelector(".taste-load-status")'), "retry recovers the full album catalogue");

  section("detailed routes");
  await setDesktop();
  await goto("/trek/");
  const trekRobots = await evaluate(
    'document.querySelector(\'meta[name="robots"]\')?.content ?? ""'
  );
  check(
    trekRobots.includes("noindex") && trekRobots.includes("noimageindex"),
    `Trek is excluded from search and image indexes [${trekRobots}]`
  );
  const lifeMapResponse = await fetch(`${origin}/life-map/`, { redirect: "manual" });
  check(lifeMapResponse.status === 404, `Life in Maps no longer ships [HTTP ${lifeMapResponse.status}]`);
  await goto("/features/");
  const featureState = await evaluate(`(() => ({
    bannerVisible: (document.querySelector(".akibwa-project-banner")?.getBoundingClientRect().height ?? 0) > 0,
    overflow: document.documentElement.scrollWidth - innerWidth
  }))()`);
  check(!featureState.bannerVisible, "Features opens directly without an Akibwa portfolio header");
  check(featureState.overflow <= 1, `Features stays inside the viewport [${featureState.overflow}px]`);

  section("reduced motion");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });
  await goto("/");
  const nameTransition = await evaluate(
    'getComputedStyle(document.querySelector(".hero-name-value")).animationDuration'
  );
  check(
    nameTransition.split(",").every((part) => parseFloat(part) === 0),
    `name motion is disabled [${nameTransition}]`
  );
  await evaluate('document.querySelector(".concept-career-stop").focus(); document.querySelector(".concept-career-stop").click()');
  check(await evaluate('[document.querySelector(".concept-career-section"),document.querySelector(".concept-career-detail-lane"),document.querySelector(".concept-career-detail-lane .index-reveal-track"),document.querySelector(".concept-career-popover")].every(item=>getComputedStyle(item).transitionProperty==="none")'), "reduced motion opens the career detail without animation or delay");
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:1, y:1});
  await evaluate('document.querySelector(".personal-taste-card").focus()');
  await sleep(50);
  check(await evaluate('[document.querySelector(".personal-taste-detail-shell"),document.querySelector("#taste-detail")].every(item=>item && getComputedStyle(item).transitionProperty==="none")'), "reduced motion reveals album details without animation or delay");
  check(await evaluate('[...document.querySelectorAll(".index-reveal-content:not(.is-outgoing)")].every(item=>getComputedStyle(item).animationName==="none")'), "reduced motion also disables the text handover");
};

const checkTrek = async () => {
  const html = readFileSync(new URL('../public/trek/index.html', import.meta.url), 'utf8');
  const data = JSON.parse(html.match(/  var DATA = (.+);\n  var days = DATA\.days;/)[1]);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const waitFor = async predicate => {
    for(let i=0;i<100;i++){
      if(await predicate())return;
      await sleep(100);
    }
  };
  const waitForScroll = async position => {
    for(let i=0;i<80;i++){
      if(await evaluate(`Math.abs(scrollY-${position})<2`))return;
      await sleep(50);
    }
  };
  const state = () => evaluate(`(() => ({
    relief: document.querySelector('#stage').classList.contains('is-relief'),
    canvas: !document.querySelector('#relief-map').hidden,
    atlas: getComputedStyle(document.querySelector('#atlas')).visibility,
    selected: document.querySelector('#view-atlas').getAttribute('aria-pressed'),
    disabled: document.querySelector('#view-relief').disabled,
    turnsDisabled: document.querySelector('#turn-left').disabled && document.querySelector('#turn-right').disabled,
    position: document.querySelector('#hud-position').textContent,
    km: Number(document.querySelector('#hud-km').textContent),
    labels: [...document.querySelectorAll('.relief-town:not([hidden])')].map(e => e.style.transform).join('|'),
    pause: document.querySelector('#journey-pause').textContent,
    scroll: scrollY,
    frames: window.__trekFrames,
    overflow: document.documentElement.scrollWidth-innerWidth,
    photos: [...document.querySelectorAll('#photo-track img')].filter(e=>e.complete && e.naturalWidth>0).length,
    note: document.querySelector('#story-text').textContent,
    controlsFit: [...document.querySelectorAll('.map-tools button')].filter(e=>!e.hidden).every(e=>{
      const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && r.top>=0 && r.bottom<=innerHeight+1;
    })
  }))()`);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {source: `window.__trekFrames=0; const raf=window.requestAnimationFrame; window.requestAnimationFrame=function(callback){return raf.call(window,time=>{window.__trekFrames++;callback(time);});};`});
  await setDesktop(1440,960);
  cdp.events=[];
  await goto('/trek/');
  await sleep(1200);
  section('Trek relief and interaction');
  let current=await state();
  check(current.relief && current.canvas && current.labels.length>20, 'the relief initializes and projects town labels');
  check(current.km===0 && current.controlsFit && current.overflow<=1, 'the opening journey and controls fit the desktop');
  const before=current.labels;
  await click('#turn-right'); await sleep(150); current=await state();
  check(current.labels!==before, 'the keyboard-accessible turn control rotates the map');
  await click('#journey-reset'); await sleep(250);
  await click('.relief-town[aria-label="Visit Zell am See"]'); await sleep(1300); current=await state();
  check(current.position.includes('day 28') && current.km>900 && current.km<950, `town selection jumps to its actual journey day [${current.position}]`);
  check(current.photos>0 && current.note.includes('Ankogel'), 'the selected route day retains its real photos and factual note');
  const beforeAtlas=current.scroll;
  await click('#view-atlas'); current=await state();
  check(!current.relief && !current.canvas && current.atlas==='visible' && current.selected==='true' && current.scroll===beforeAtlas, 'Atlas preserves the current day and exposes the existing map');
  await click('#view-relief');
  await click('#journey-pause'); await waitFor(async()=>{const s=await state();return s.pause==='Pause'&&s.scroll>beforeAtlas;}); current=await state();
  check(current.pause==='Pause' && current.scroll>beforeAtlas, `Resume advances the journey [${current.pause}, ${current.scroll}/${beforeAtlas}]`);
  await click('#journey-pause'); const paused=await state(); await sleep(450); current=await state();
  check(current.pause==='Resume' && current.scroll===paused.scroll, 'Pause holds the current route position');
  await click('#journey-pause');
  await evaluate('document.querySelector("#journey-pause").focus()');
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await sleep(100); current=await state();
  check(current.pause==='Resume','Space activates the focused Pause button once');
  let stable=0,previousFrames=-1;
  for(let i=0;i<40&&stable<3;i++){
    await sleep(250);const frames=(await state()).frames;
    stable=frames===previousFrames?stable+1:0;previousFrames=frames;
  }
  const idle=await state(); await sleep(500); current=await state();
  check(current.frames-idle.frames<=1, `the paused, settled map stops scheduling animation frames [${current.frames-idle.frames}]`);
  await click('#journey-reset'); await sleep(1100); current=await state();
  check(current.scroll===0 && current.km===0 && current.labels===before, 'Reset returns to the opening camera, rotation and route');
  await click('#country-nav a[href="#bulgaria"]'); await waitForScroll(data.scenes.find(s=>s.t==='enter'&&s.country==='Bulgaria').at+10); await sleep(150); current=await state();
  check(current.position.toLowerCase().includes('bulgaria') && current.km>1800, `country navigation reaches the last country [${current.position}, ${current.km}km, scroll ${current.scroll}]`);
  await evaluate(`scrollTo(0,${data.timeline})`); await sleep(1100); current=await state();
  check(current.position.includes('Sofia') && Math.abs(current.km-data.total)<.2 && current.pause==='Replay', 'the complete journey reaches Sofia and offers Replay');
  check(await evaluate('document.querySelector("#collector-place-count").textContent.trim()==="17 / 17"'), 'all 17 route places remain collected at the finish');
  await click('#journey-pause'); await sleep(350); current=await state();
  check(current.scroll<1000 && current.pause==='Pause', 'Replay starts the journey again');
  await click('#journey-pause');

  section('Trek phone layout and music');
  for(const width of [390,320]){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});
    await goto('/trek/'); await click('#journey-reset'); await sleep(1200); current=await state();
    check(current.relief && current.controlsFit && current.overflow<=1, `opening relief and controls fit ${width}px`);
    const scene=data.scenes.find(s=>s.t==='walk' && s.day===28);
    await evaluate(`scrollTo(0,${scene.at+scene.len*.72})`); await sleep(1200); current=await state();
    check(current.controlsFit && current.photos>0 && current.overflow<=1, `day 28 photos, map and controls fit ${width}px`);
    const music=await evaluate(`(() => {const e=document.querySelector('#current-album'),r=e.getBoundingClientRect();return {visible:!e.hidden&&r.width>0&&r.left>=0&&r.right<=innerWidth,label:e.getAttribute('aria-label')};})()`);
    check(music.visible && music.label.includes('Illinois'), `the current record is reachable at ${width}px`);
    await click('#current-album'); await sleep(150);
    check(await evaluate('document.querySelector("#spot").open && document.querySelector("#spot-record").textContent.includes("Sufjan Stevens")'), 'the record button opens the correct music details');
    await click('#spot-close');
    await click('#view-atlas'); current=await state();
    check(current.atlas==='visible' && !current.canvas && current.controlsFit,'the phone Atlas remains usable at the same point');
  }
  const runtimeErrors=cdp.events.filter(e=>e.method==='Runtime.exceptionThrown' || (e.method==='Runtime.consoleAPICalled' && ['error','warning'].includes(e.params.type)));
  check(runtimeErrors.length===0, `healthy journeys report no runtime errors or warnings [${runtimeErrors.length}]`);
  if(runtimeErrors.length) process.stdout.write(JSON.stringify(runtimeErrors.map(e=>e.params))+'\n');

  section('Trek graphics failure paths');
  await setDesktop();
  await goto('/trek/');
  await click('#country-nav a[href="#germany"]'); await waitForScroll(data.scenes.find(s=>s.t==='enter'&&s.country==='Germany').at+10); await sleep(150); const contextPosition=(await state()).scroll;
  await evaluate('document.querySelector("#relief-map").getContext("webgl").getExtension("WEBGL_lose_context").loseContext()');
  await sleep(200); current=await state();
  check(!current.relief && current.disabled && current.turnsDisabled && current.atlas==='visible' && current.scroll===contextPosition, `a lost graphics context falls back to Atlas without losing the route position [${current.scroll}/${contextPosition}; relief ${current.relief}, disabled ${current.disabled}, turns ${current.turnsDisabled}, atlas ${current.atlas}]`);
  const hook=await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:getContext.call(this,kind,...args);};`});
  await goto('/trek/'); await click('#journey-reset'); current=await state();
  check(!current.relief && current.disabled && current.turnsDisabled && current.selected==='true' && current.atlas==='visible','devices without WebGL start with a correctly selected, usable Atlas');
  await click('#walkbtn'); await sleep(400); current=await state();
  check(current.scroll>0 && current.pause==='Pause','the Atlas-only journey still plays');
  await click('#journey-pause');
  await cdp.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:hook.identifier});
};

const main = async () => {
  if (!externalOrigin && !existsSync(join(outDir, "index.html"))) {
    console.error("out/index.html not found — run `npm run build` first.");
    process.exit(2);
  }
  const chromeBin = findChrome();
  if (!chromeBin) {
    console.error("No Chrome/Chromium found. Set CHROME_BIN to a browser binary.");
    process.exit(2);
  }

  const timeoutMs = process.env.CHECK_TREK_ONLY ? 240000 : 120000;
  const watchdog = setTimeout(() => {
    console.error(`\nNavigation DOM check timed out after ${timeoutMs / 1000}s.`);
    process.exit(1);
  }, timeoutMs);
  watchdog.unref();

  let server = null;
  if (externalOrigin) {
    origin = externalOrigin.replace(/\/$/, "");
  } else {
    server = await startServer();
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  process.stdout.write(`Checking Akibwa public boundary against ${origin}\n`);

  const profileDir = mkdtempSync(join(tmpdir(), "akibwa-public-check-"));
  const { processHandle, port } = await launchChrome(chromeBin, profileDir);

  try {
    let pageTarget = null;
    for (let attempt = 0; attempt < 20 && !pageTarget; attempt += 1) {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      pageTarget = targets.find((target) => target.type === "page") ?? null;
      if (!pageTarget) await sleep(150);
    }
    if (!pageTarget) throw new Error("no page target exposed by Chrome");
    cdp = await Cdp.connect(pageTarget.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    // Native focus events are suppressed while the headless page is inactive.
    await cdp.send("Page.bringToFront");
    if (process.env.CHECK_TREK_ONLY) await checkTrekPaths({cdp,evaluate,goto,setDesktop,sleep,check,section,capture});
    else await checkPublicLanding();
  } finally {
    cdp?.socket.close();
    try {
      if (processHandle.exitCode === null && processHandle.signalCode === null) {
        await new Promise((resolve) => {
          const force = setTimeout(() => {
            processHandle.kill('SIGKILL');
            resolve();
          }, 1500);
          processHandle.once('exit', () => { clearTimeout(force); resolve(); });
          processHandle.kill();
        });
      }
    } catch {
      /* Already gone. */
    }
    processHandle.stderr?.destroy();
    processHandle.unref();
    server?.close();
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      /* Best effort. */
    }
    clearTimeout(watchdog);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} public-boundary check(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log("\nAkibwa public-boundary DOM checks passed.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
