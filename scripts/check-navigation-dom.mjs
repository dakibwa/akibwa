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
  const url = `${origin}${path}`;
  const navigation = await cdp.send("Page.navigate", { url });
  if (!navigation.loaderId) {
    // A hash-only change stays within the document. Let it commit before
    // reloading, or the reload lands on the previous entry and strands a
    // forward entry that later breaks history.back().
    for (let attempt = 0; attempt < 50; attempt++) {
      const { currentIndex, entries } = await cdp.send("Page.getNavigationHistory");
      if (entries[currentIndex]?.url === url) break;
      await sleep(20);
    }
    await cdp.send("Page.reload");
  }
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
      // The masthead and the closing sign-off both link the profiles; count each once.
      socialLinks: [...new Set(links.filter((href) => /(?:linkedin|instagram|x)\\.com/.test(href)))],
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
          const copy = stop.querySelector(".concept-project-aside");
          return copy && copy.scrollWidth <= copy.clientWidth + 1 && copy.scrollHeight <= copy.clientHeight + 1;
        })
      }
    };
  })()`);

const selectTaste = (label) => evaluate(`[...document.querySelectorAll('.taste-filters button')].find(button => button.textContent === ${JSON.stringify(label)}).click()`);

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
  check(await evaluate('(() => { const groups=[...document.querySelectorAll(".page-footer-details")]; return groups.length===2 && groups.every(group=>{ const controls=[...group.querySelectorAll("a, button")]; return JSON.stringify(controls.map(item=>item.getAttribute("aria-label")))===JSON.stringify(["Instagram — @dakibwa","X — @dakibwa","Email Akibwa"]) && controls.every(item=>item.querySelector("svg") && !item.textContent.trim()); }); })()'), "the masthead and sign-off each keep three icons with distinct accessible platform names and no visible handles");
  check(await evaluate('!document.querySelector(".taste-source-note") && !document.querySelector(".concept-taste-head .archive-link")'), "the closing sentence and browse-all album link are removed");
  check(state.projectCount === 3, `the homepage shows three current projects [${state.projectCount}]`);
  check(state.careerCount === 8, `the approved compact career bar has eight roles [${state.careerCount}]`);
  check(state.tasteCount === 48, `Highlights fills the wall with forty-eight approved covers [${state.tasteCount}]`);
  check(!state.hasPersonalIdentity, "the indexed page does not contain the personal full name");
  check(state.hasCareer && state.hasTasteLibrary, "the approved career and taste chapters are restored");
  check(state.socialLinks.length === 2 && state.socialLinks.every(href=>href.includes('/dakibwa')), "only the two approved social profiles are linked");
  check(
    state.directEmailLinks.length === 0 && state.emailButtonCount === 2,
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
  check(await evaluate(`getComputedStyle(document.querySelector('.concept-hero'),'::after').backgroundColor==='rgb(47, 136, 255)' &&
    getComputedStyle(document.querySelector('.concept-career-section'),'::before').backgroundColor==='rgb(203, 66, 94)' &&
    getComputedStyle(document.querySelector('.concept-archive'),'::before').backgroundColor==='rgb(27, 148, 125)'`), "each chapter rule matches its masthead link: blue, rose, green");
  for(const width of [320,390,560,800,820,1024,1440,1920]){
    await setDesktop(width);
    await sleep(380);
    check(await evaluate(`(() => {
      const heading=document.querySelector('#taste-title').getBoundingClientRect();
      const controls=document.querySelector('.taste-search').getBoundingClientRect();
      return Math.abs((heading.top+heading.bottom-controls.top-controls.bottom)/2)<1 &&
        controls.left>=heading.right+7 && controls.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth+1;
    })()`), `Taste heading and controls stay on one clear line at ${width}px`);
    check(await evaluate(`(() => {
      const lede=document.querySelector('.concept-lede');
      const range=document.createRange();range.selectNodeContents(lede);
      return range.getClientRects().length===1 && lede.scrollWidth<=lede.clientWidth+1;
    })()`), `the proposition fits on one line at ${width}px`);
    const careerBefore=await evaluate('document.querySelector(".personal-career").getBoundingClientRect().top');
    await evaluate('document.querySelector(".concept-project-card").blur(); document.querySelector(".concept-project-card").focus()');
    await sleep(560);
    const bounds=await evaluate(`(() => {
      const card=document.querySelector('.concept-project-card').getBoundingClientRect();
      const copy=document.querySelector('#project-description'), box=copy?.getBoundingClientRect();
      return {open:copy?.getAttribute('aria-hidden')==='false',inside:!!box && box.left>=card.left-1 && box.right<=card.right+1 && box.top>=card.top-1 && box.bottom<=card.bottom+1,
        fits:!!copy && copy.scrollHeight<=copy.clientHeight+1,career:document.querySelector('.personal-career').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth-innerWidth};
    })()`);
    const fits = bounds.open && bounds.inside && bounds.fits && Math.abs(bounds.career-careerBefore)<1 && bounds.overflow<=1;
    check(fits, `the project description fits inside its card without moving Career at ${width}px${fits ? '' : ` [${JSON.stringify(bounds)}]`}`);
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
      await sleep(560);
      const panel = await evaluate(`(() => {
        const card=document.querySelector('.concept-portuguese .concept-project-card').getBoundingClientRect();
        const copy=document.querySelector('.concept-portuguese .concept-project-aside'), box=copy.getBoundingClientRect();
        return {open:copy.id==='project-description' && copy.getAttribute('aria-hidden')==='false',inside:box.left>=card.left-1 && box.right<=card.right+1,overflow:document.documentElement.scrollWidth-innerWidth};
      })()`);
      const inside = panel.open && panel.inside;
      check(inside && panel.overflow<=1, `the ${edge} of the project rail previews Portuguese inside its own card at ${width}px${inside ? '' : ` [${JSON.stringify({visible,panel})}]`}`);
    }
  }
  for (const [width,height,portrait] of [[1024,640,false],[956,607,false],[844,390,false],[800,1000,true],[700,900,true]]) {
    await setDesktop(width,height);
    await sleep(300);
    const layout=await evaluate(`(() => {
      const rail=document.querySelector('.concept-project-swipe');
      const tops=[...document.querySelectorAll('.concept-project-stop')].map(stop=>Math.round(stop.getBoundingClientRect().top));
      return {scrolls:rail.scrollWidth>rail.clientWidth+2,oneRow:new Set(tops).size===1,hero:getComputedStyle(document.querySelector('.concept-hero')).display,overflow:document.documentElement.scrollWidth-innerWidth};
    })()`);
    const shaped = portrait ? layout.scrolls && layout.hero!=='grid' : !layout.scrolls && layout.oneRow && layout.hero==='grid';
    check(shaped && layout.overflow<=1, `${width}×${height} ${portrait ? 'uses the portrait reading column and project swipe rail' : 'keeps the landscape hero columns and all three projects in one row'}${shaped ? '' : ` [${JSON.stringify(layout)}]`}`);
  }
  await cdp.send("Input.dispatchMouseEvent", {type:"mouseMoved",x:1,y:1});
  await sleep(360);
  section("project and career motion");
  await setDesktop(1440);
  await sleep(500);
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
  const staysPut = (samples) => samples.every(y=>Math.abs(y-samples[0])<0.5);
  const projectControl = 'document.querySelector(".concept-project-card")';
  check(staysPut(await dividerMotion('#career', `${projectControl}.blur(); ${projectControl}.focus();`)), "opening a project preview leaves the Career divider in place");
  check(staysPut(await dividerMotion('#career', `${projectControl}.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`)), "closing a project preview leaves the Career divider in place");
  check(await evaluate('!document.querySelector("#project-description") && [...document.querySelectorAll(".concept-project-aside")].every(copy=>copy.getAttribute("aria-hidden")==="true")'), "closed project descriptions stay hidden from assistive technology");
  check(await evaluate(`(() => {
    const links=[...document.querySelectorAll('a.concept-project-card')];
    return JSON.stringify(links.map(link=>link.getAttribute('href')))===JSON.stringify(['https://features.games/','https://portuguesewithines.com/','/trek/']) &&
      !document.querySelector('#project-detail a, #project-detail button');
  })()`), "each project card links directly to its destination without a separate action button");
  const activatePortuguese = () => evaluate(`(() => {
    let navigates;
    document.addEventListener('click', event => { navigates=!event.defaultPrevented; event.preventDefault(); }, {once:true});
    document.querySelector('.concept-portuguese a').click();
    return navigates;
  })()`);
  // A pointer that can hover has already seen the preview, so its first click
  // navigates; touch keeps the preview-first tap.
  check(await activatePortuguese(), "a hovering pointer's first Portuguese click follows the link");
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  check(!(await activatePortuguese()), "the first Portuguese tap previews without navigating");
  await sleep(520);
  check(await evaluate('document.querySelector("#project-description")?.closest(".concept-portuguese") && document.querySelector("#project-description").textContent.includes("Inês")'), "the first Portuguese tap leaves its description open");
  check(await activatePortuguese(), "the second Portuguese tap allows the native destination link");
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await evaluate('document.querySelector(".concept-portuguese a").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  await sleep(360);
  const careerControl = 'document.querySelectorAll(".concept-career-timeline button")[1]';
  // Career: the current role rests beneath the timeline. Another role's
  // statement takes its place on focus, hover or tap without moving anything.
  const careerDetail = () => evaluate(`(() => {
    const active=document.querySelector('.career-detail[data-active="true"]');
    return {name:active.querySelector('strong').textContent, text:active.textContent, visibility:getComputedStyle(active).visibility,
      expanded:[...document.querySelectorAll('.concept-career-stop')].findIndex(stop=>stop.getAttribute('aria-expanded')==='true')};
  })()`);
  await evaluate('document.querySelector("#career").scrollIntoView({block:"center",behavior:"instant"})');
  const resting = await careerDetail();
  check(resting.name==='Freelance' && resting.visibility==='visible' && resting.expanded===0, `the current role's statement rests beneath the timeline without interaction [${resting.name}]`);
  check(staysPut(await dividerMotion('#taste', `${careerControl}.focus(); ${careerControl}.click();`)), "choosing another role never moves the Taste divider");
  check((await careerDetail()).text.includes("Senior BI Developer"), "career activation displays the selected public role");
  check(await evaluate('document.querySelector(".career-detail[data-active=\\"true\\"] .concept-career-statement").textContent.includes("UK growth and clean energy")'), "career detail restores the original mission statement");
  check(await evaluate(`(() => {
    const statement=document.querySelector('.career-detail[data-active="true"] .concept-career-statement');
    const detail=statement.closest('.career-detail').getBoundingClientRect();
    return getComputedStyle(statement).fontFamily.includes('Iowan') && statement.querySelector('strong') && detail.bottom<document.querySelector('#taste').getBoundingClientRect().top;
  })()`), "the original serif statement and emphasis fit above the Taste divider");
  check(staysPut(await dividerMotion('#taste', `${careerControl}.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`)), "Escape returns to the current role without moving the Taste divider");
  check((await careerDetail()).expanded===0, "Escape returns a held role to the current one");
  await evaluate('document.querySelectorAll(".concept-career-stop")[2].focus()');
  check((await careerDetail()).text.includes("BI Team Lead"), "keyboard focus previews the next career role");
  await sleep(420);
  check(await evaluate(`(() => {
    const stops=document.querySelectorAll('.concept-career-stop'), open=stops[2], rest=stops[3];
    const style=(stop,selector)=>getComputedStyle(stop.querySelector(selector));
    const top=(stop)=>stop.querySelector('.concept-career-card').getBoundingClientRect().top;
    return top(open)===top(rest) && style(open,'.concept-career-logo').scale==='1.08' &&
      style(open,'.concept-career-card').backgroundColor!==style(rest,'.concept-career-card').backgroundColor &&
      style(open,'.concept-career-year').color!==style(rest,'.concept-career-year').color;
  })()`), "the previewed role deepens into its own colour in place and colours its date");

  const passesThrough = (samples, property) => {
    const start=samples[0][property], end=samples.at(-1)[property];
    return Math.abs(end-start)>4 && samples.some(sample=>sample[property]>Math.min(start,end)+1 && sample[property]<Math.max(start,end)-1);
  };
  await evaluate('document.querySelector(".concept-project-card").focus()');
  await sleep(550);
  const projectHandover=await evaluate(`new Promise(resolve => {
    const art=document.querySelectorAll('.concept-project-media picture')[1];
    const shift=()=>new DOMMatrix(getComputedStyle(art).transform).m41 || art.getBoundingClientRect().left-art.parentElement.getBoundingClientRect().left;
    const samples=[shift()];
    document.querySelectorAll(".concept-project-card")[1].focus();
    const until=performance.now()+560;
    const frame=()=>{samples.push(shift());if(performance.now()<until) requestAnimationFrame(frame);else resolve(samples);};
    requestAnimationFrame(frame);
  })`);
  check(projectHandover.at(-1)<projectHandover[0]-60 && projectHandover.some(x=>x<projectHandover[0]-2 && x>projectHandover.at(-1)+2), "the next project's artwork glides aside for its description instead of jumping");
  check(await evaluate('document.querySelectorAll("#project-description").length===1 && !!document.querySelector("#project-description").closest(".concept-portuguese")'), "project handover keeps one accessible description target on the focused card");
  await evaluate('document.querySelectorAll(".concept-career-stop")[5].focus()');
  await sleep(550);
  const careerHandover=await evaluate(`new Promise(resolve => {
    const track=document.querySelector('.career-detail-track'), incoming=document.querySelectorAll('.career-detail')[4];
    const sample=()=>({left:track.getBoundingClientRect().left, taste:document.querySelector('#taste').getBoundingClientRect().top, opacity:Number(getComputedStyle(incoming).opacity)});
    const samples=[sample()];
    document.querySelectorAll(".concept-career-stop")[4].focus();
    const until=performance.now()+560;
    const frame=()=>{samples.push(sample());if(performance.now()<until) requestAnimationFrame(frame);else resolve(samples);};
    requestAnimationFrame(frame);
  })`);
  check(passesThrough(careerHandover,'left'), "career handover glides through intermediate positions beneath the selected role");
  check(careerHandover.every(sample=>Math.abs(sample.taste-careerHandover[0].taste)<0.5), "career handover never moves the following content");
  check(careerHandover.some(sample=>sample.opacity>0.05 && sample.opacity<0.95), "incoming career text fades into place");
  const interrupted=await evaluate(`new Promise(resolve=>{
    const buttons=document.querySelectorAll('.concept-career-stop');
    buttons[0].focus();setTimeout(()=>buttons[7].focus(),70);setTimeout(()=>buttons[2].focus(),130);
    setTimeout(()=>resolve({title:document.querySelector('.career-detail[data-active="true"] strong').textContent, active:document.querySelectorAll('.career-detail[data-active="true"]').length}),700);
  })`);
  check(interrupted.title==='Leeds Building Society' && interrupted.active===1, "rapid direction changes settle on the latest role without stale text");
  for (const index of [0,1,2,3,4,5,6,7]) {
    await evaluate(`document.querySelectorAll('.concept-career-stop')[${index}].focus()`);
    await sleep(520);
    check(await evaluate(`(() => {
      const panel=document.querySelector('.career-detail[data-active="true"]').getBoundingClientRect();
      const active=document.querySelector('.concept-career-stop[aria-expanded=true]').getBoundingClientRect();
      const next=document.querySelector('#taste').getBoundingClientRect();
      return panel.bottom<next.top && panel.top>=active.bottom+10 && panel.left<=active.right && panel.right>=active.left;
    })()`), `the Career statement for role ${index + 1} sits below its logo and leaves Taste clear`);
  }
  await evaluate('document.activeElement.blur()');
  await sleep(380);
  check((await careerDetail()).name==='Freelance', "leaving the timeline returns to the current role");
  for (const width of [320,390,820]) {
    await setDesktop(width);
    await goto('/');
    await evaluate('document.querySelectorAll(".concept-career-stop")[7].focus()');
    await sleep(550);
    check(await evaluate(`(() => {
      const panel=document.querySelector('.career-detail[data-active="true"]').getBoundingClientRect();
      const section=document.querySelector('#career').getBoundingClientRect();
      const gap=document.querySelector('#taste').getBoundingClientRect().top-panel.bottom;
      return panel.left>=section.left-1 && panel.right<=section.right+1 && gap>=23 && gap<=37 && document.documentElement.scrollWidth<=innerWidth+1;
    })()`), `the last career role fits the ${width}px page and keeps a close, clear divider`);
    if(width===320){
      const before=await evaluate('document.querySelector("#taste").getBoundingClientRect().top+scrollY');
      await evaluate('document.querySelector(".concept-career-timeline").scrollLeft=0');
      await sleep(380);
      check(await evaluate(`document.querySelector(".career-detail-track").dataset.anchored==="false" && Math.abs(document.querySelector("#taste").getBoundingClientRect().top+scrollY-${before})<1`), "scrolling a career role away hides its text without moving the page");
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
  check(railState.scrolls && railState.flow === 'column', "Taste browses the balanced wall through one native horizontal rail");
  check(await evaluate(`(() => {
    const columns=[...document.querySelectorAll('.taste-wall-column')];
    const tops=columns.map(column=>column.querySelector('article').getBoundingClientRect().top);
    const bottoms=columns.map(column=>column.getBoundingClientRect().bottom);
    return columns.length>8 && Math.max(...tops)-Math.min(...tops)<1 && Math.max(...bottoms)-Math.min(...bottoms)<2 && columns.every(column=>{
      const cards=[...column.querySelectorAll('article')];
      return cards.every((card,index)=>!index || card.getBoundingClientRect().top>cards[index-1].getBoundingClientRect().bottom+5);
    });
  })()`), "the mixed wall keeps both its top and bottom edges flush without overlapping covers");
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
  await evaluate('document.querySelector("#taste").scrollIntoView({block:"start",behavior:"instant"})');
  await sleep(380);
  const wallKeys=await evaluate('JSON.stringify([...document.querySelectorAll(".personal-taste-card")].map(card=>card.dataset.tasteKey).sort())');
  const wallCounts=[];
  for (const [width,height,touch] of [[815,774,false],[390,844,true],[320,740,true],[1440,900,false]]) {
    await setDesktop(width,height);
    if(touch) await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    await sleep(250);
    const balanced=await evaluate(`(() => {
      const columns=[...document.querySelectorAll('.taste-wall-column')];
      const tops=columns.map(column=>column.getBoundingClientRect().top), bottoms=columns.map(column=>column.getBoundingClientRect().bottom);
      return {count:columns.length,spread:Math.max(...bottoms)-Math.min(...bottoms),tops:Math.max(...tops)-Math.min(...tops),
        keys:JSON.stringify([...document.querySelectorAll('.personal-taste-card')].map(card=>card.dataset.tasteKey).sort()),overflow:document.documentElement.scrollWidth-innerWidth};
    })()`);
    wallCounts.push(balanced.count);
    check(balanced.keys===wallKeys && balanced.tops<1 && balanced.spread<(touch?12:2) && balanced.overflow<=1,
      `the same forty-eight covers rebalance with a close bottom edge at ${width}×${height}${touch?' with touch captions':''}`);
    check(await evaluate('document.querySelector(".career-detail-track").getBoundingClientRect().right<=innerWidth+1'),
      `the Career statement stays inside the ${width}px page while resizing below it`);
  }
  check(new Set(wallCounts).size>=3, "resizing recalculates the stacks instead of only shrinking the artwork");
  await evaluate('document.querySelectorAll(".taste-wall-column")[0].querySelectorAll("article")[1].focus()');
  await sleep(550);
  const resizingFocus=await evaluate('document.activeElement.dataset.tasteKey');
  await setDesktop(815,774);
  await sleep(300);
  check(await evaluate(`document.activeElement.dataset.tasteKey===${JSON.stringify(resizingFocus)} && document.querySelector('#taste-detail .taste-detail-copy > strong')?.textContent===document.activeElement.querySelector('.personal-taste-title')?.textContent`),
    "responsive rearrangement preserves the focused cover and its preview");
  await evaluate('document.activeElement.blur(); document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  await setDesktop(1440,900);
  await sleep(380);
  await selectTaste('Films');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 35'), "the Films filter keeps the whole approved shelf reachable");
  check(await evaluate(`(() => {
    const art=document.querySelector('.personal-taste-art'), img=art.querySelector('img'), box=art.getBoundingClientRect();
    return img.src.includes('/film-posters/') && Math.abs(box.width/box.height-2/3)<.01;
  })()`), "films show their real posters in an uncropped portrait frame");
  await selectTaste('Films');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 48 && !document.querySelector(".taste-filters [aria-pressed=true]")'), "deselecting a medium restores the mixed wall with no active filter");
  await evaluate('document.querySelector("#taste").scrollIntoView({block:"start",behavior:"instant"})');
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:1, y:1});
  await sleep(300);
  const wallPositions = () => evaluate(`[...document.querySelectorAll('.personal-taste-card')].map(card=>{const r=card.getBoundingClientRect();return Math.round(r.left)+','+Math.round(r.top);}).join('|')`);
  const restingWall = await wallPositions();
  const floatTarget = await evaluate(`(() => { const r=document.querySelectorAll('.taste-wall-column')[2].querySelectorAll('article')[1].getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:floatTarget.x-2, y:floatTarget.y-2});
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', ...floatTarget});
  await sleep(600);
  const floating = await evaluate(`(() => {
    const panel=document.querySelector('#taste-detail').getBoundingClientRect();
    const receded=[...document.querySelectorAll('.personal-taste-card[data-receded]')];
    return {mode:document.querySelector('#taste-rail').dataset.detail, receded:receded.length,
      covered:receded.every(card=>{const r=card.getBoundingClientRect();return r.right>panel.left && r.left<panel.right && r.bottom>panel.top && r.top<panel.bottom;}),
      through:getComputedStyle(document.querySelector('.personal-taste-detail-shell.is-open')).pointerEvents};
  })()`);
  check(await wallPositions() === restingWall && floating.mode==='float' && floating.receded>0 && floating.covered && floating.through==='none',
    `the staggered mixed wall floats its detail over the neighbouring covers without moving any cover [${JSON.stringify(floating)}]`);
  const beneath = await evaluate(`(() => { const card=document.querySelector('.personal-taste-card[data-receded]'); const r=card.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,key:card.dataset.tasteKey}; })()`);
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:beneath.x, y:beneath.y});
  await sleep(500);
  check(await evaluate(`document.querySelector('#taste-detail')?.closest('article')?.dataset.tasteKey===${JSON.stringify(beneath.key)}`), "the pointer passes through a floating detail to the cover beneath it");
  await evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  await sleep(400);
  check(await evaluate('!document.querySelector(".personal-taste-card[data-receded]") && !document.querySelector("#taste-detail")'), "dismissing a floating detail restores the covers beneath it");

  section("browsing controls and taste search");
  check(await evaluate('document.querySelectorAll(".concept-career-year").length === 8 && !document.querySelector(".concept-career-current")'), "career dates stay readable while the extra current-role line is removed");
  await evaluate(`document.querySelector('#taste button[aria-label="Next taste"]').click()`);
  await sleep(700);
  check(await evaluate(`document.querySelector('#taste-rail').scrollLeft > 100 && !document.querySelector('#taste button[aria-label="Previous taste"]').disabled`), "Taste arrows move the native rail and update the available direction");
  await evaluate(`document.querySelector('#taste button[aria-label="Previous taste"]').click()`);
  await sleep(700);
  check(await evaluate(`document.querySelector('#taste-rail').scrollLeft <= 2 && document.querySelector('#taste button[aria-label="Previous taste"]').disabled`), "the back arrow returns to the start and disables at the edge");
  const searchMotion = () => evaluate(`new Promise(resolve => {
    const box=document.querySelector('.taste-search');
    const header=document.querySelector('.concept-taste-head');
    const sample=()=>({width:box.getBoundingClientRect().width,height:header.getBoundingClientRect().height,opacity:Number(getComputedStyle(document.querySelector('.taste-search-field')).opacity)});
    const samples=[sample()];
    document.querySelector('.taste-search-toggle').click();
    const until=performance.now()+430;
    const frame=()=>{samples.push(sample());if(performance.now()<until) requestAnimationFrame(frame);else resolve(samples);};
    requestAnimationFrame(frame);
  })`);
  const desktopSearch=await searchMotion();
  check(passesThrough(desktopSearch,'width') && desktopSearch.some(frame=>frame.opacity>.05 && frame.opacity<.95) && desktopSearch.every(frame=>Math.abs(frame.height-desktopSearch[0].height)<1), "search expands and fades in without moving its header");
  check(await evaluate('getComputedStyle(document.querySelector(".taste-search-field input")).outlineStyle==="none" && document.activeElement===document.querySelector(".taste-search-field input")'), "search focuses the input with its own quiet underline");
  const tasteSearch = async (value) => {
    await evaluate(`(() => { const input=document.querySelector('.taste-search-field input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await sleep(200);
  };
  await tasteSearch('Paul Thomas Anderson');
  check(await evaluate('[...document.querySelectorAll(".personal-taste-card")].length >= 4 && [...document.querySelectorAll(".personal-taste-card")].every(card => card.textContent.includes("Paul Thomas Anderson"))'), "unfiltered search reaches the full film collection by creator");
  await tasteSearch('Graceland');
  check(await evaluate('[...document.querySelectorAll(".personal-taste-card")].some(card => card.textContent.includes("Paul Simon"))'), "search finds albums across the collection");
  await tasteSearch('The OpenAI Podcast');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 0'), "search excludes a previously visible podcast with fewer than 20 plays");
  await tasteSearch('within reason');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 0'), "an unknown podcast count does not bypass the 20-play threshold");
  await tasteSearch('Nothing much happens');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 1 && Number(document.querySelector(".personal-taste-card").dataset.listens) === 20'), "search retains a podcast at exactly 20 plays");
  await tasteSearch('zzz-no-such-title-9184');
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 0 && document.querySelector(".taste-search-status").textContent.includes("No matches")'), "an empty search gives a clear recoverable state");
  await evaluate(`document.querySelector('button[aria-label="Close taste search"]').click()`);
  await sleep(100);
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 48 && document.activeElement.matches(".taste-search-toggle")'), "closing search restores the wall and keyboard focus");
  for (const width of [320,390,560]) {
    await setDesktop(width);
    const headerHeight=await evaluate('document.querySelector(".concept-taste-head").getBoundingClientRect().height');
    const phoneSearch=await searchMotion();
    check(passesThrough(phoneSearch,'width'), `phone search opens through intermediate widths at ${width}px`);
    check(await evaluate(`(() => {
      const header=document.querySelector('.concept-taste-head').getBoundingClientRect();
      const field=document.querySelector('.taste-search-field').getBoundingClientRect();
      return Math.abs(header.height-${headerHeight})<1 && field.width>180 && field.left>=0 && field.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth+1;
    })()`), `phone search uses the same header row at ${width}px`);
    await evaluate('document.querySelector(".taste-search-field input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await sleep(30);
    check(await evaluate('document.activeElement.matches(".taste-search-toggle") && !document.querySelector(".concept-taste-head.is-searching")'), "closing phone search restores the heading and keyboard focus");
    if (width === 320) {
      await selectTaste('Games');
      await selectTaste('Games');
      await sleep(100);
      check(await evaluate('document.querySelectorAll(".personal-taste-card").length === 48 && document.querySelector("#taste-rail").scrollLeft <= 3'), "clearing Games resets the mixed wall to its first column instead of retaining the game's snap position");
    }
  }
  await setDesktop(1440);

  section("ranked listening shelves");
  await selectTaste('Music');
  await sleep(200);
  // Shorter shelves pass their own size: only 20+ play podcasts qualify.
  const ranked = (least = 36) => evaluate(`(() => {
    const columns=[...document.querySelectorAll('.taste-wall-column')].map(column=>[...column.querySelectorAll('article')]);
    const cards=Array.from({length:Math.max(...columns.map(column=>column.length))},(_,row)=>columns.flatMap(column=>column[row]?[column[row]]:[])).flat();
    const counts=cards.map(card=>card.hasAttribute('data-listens') ? Number(card.dataset.listens) : -1);
    return counts.length >= ${least} && counts.every((count,index)=>!index || count<=counts[index-1]);
  })()`);
  check(await ranked(), "Music exposes the full catalogue in descending listening order");
  const pointer = await evaluate(`(() => {
    const card=document.querySelector('.personal-taste-card');card.scrollIntoView({block:'center',behavior:'instant'});
    const box=card.getBoundingClientRect();return {x:box.left+20,y:box.top+20};
  })()`);
  const tasteFrames = (action) => evaluate(`new Promise(resolve => {
    const cards=[...document.querySelectorAll('.personal-taste-card')];
    const sample=()=>({
      lefts:cards.map(card=>card.getBoundingClientRect().left),
      tops:cards.map(card=>card.getBoundingClientRect().top),
      height:document.documentElement.scrollHeight,
      opacity:Number(getComputedStyle((document.querySelector('.personal-taste-detail-shell.is-open') || cards[0].querySelector('.personal-taste-detail-shell')).querySelector('.taste-detail-copy')).opacity)
    });
    const frames=[sample()];
    ${action}
    const start=performance.now();
    const frame=now=>{frames.push(sample());if(now-start<650)requestAnimationFrame(frame);else resolve(frames);};
    requestAnimationFrame(frame);
  })`);
  const rowShifts = () => evaluate(`[...document.querySelectorAll('.personal-taste-card')].map(card=>({row:Number(card.dataset.row),column:Number(card.closest('.taste-wall-column').dataset.column),shift:parseFloat(getComputedStyle(card).translate)||0}))`);
  const rows = await evaluate('document.querySelector(".taste-wall-column").querySelectorAll("article").length');
  // Let the catalogue load and the wall finish repacking after the resize.
  let shelfHeight = -1;
  for (let attempt=0; attempt<40; attempt++) {
    const height = await evaluate('document.querySelector(".taste-load-status") ? -2 : document.documentElement.scrollHeight');
    if (height === shelfHeight && height > 0) break;
    shelfHeight = height;
    await sleep(150);
  }
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', ...pointer});
  await sleep(600);
  check(await evaluate(`(() => {
    const card=document.querySelector('.personal-taste-card');
    const detail=document.querySelector('#taste-detail');
    return detail && getComputedStyle(detail.closest('.personal-taste-detail-shell')).visibility==='visible' &&
      detail.querySelector('.taste-detail-copy > strong').textContent===card.querySelector('.personal-taste-title').textContent &&
      detail.querySelector('.personal-taste-detail-count').textContent.includes(Number(card.dataset.listens).toLocaleString('en-GB')) &&
      getComputedStyle(card.querySelector('.personal-taste-caption')).display==='none' && !card.querySelector('.listening-hover');
  })()`), "hover reveals album, artist and combined plays beside the selected cover");
  const openHeight = await evaluate('document.documentElement.scrollHeight');
  check(openHeight === shelfHeight, `opening a Taste detail never changes the page height${openHeight === shelfHeight ? '' : ` [${shelfHeight} → ${openHeight}]`}`);
  const opened = await rowShifts();
  check(opened.filter(card=>card.row===0 && card.column>0).every(card=>card.shift>100) && opened.filter(card=>card.row!==0 || card.column===0).every(card=>Math.abs(card.shift)<1),
    "only the rest of the hovered row slides over; the cover and every other row stay still");
  await capture("music-hover-desktop");
  const beyond = await evaluate(`[...document.querySelectorAll('.personal-taste-card')].flatMap((card,index)=>Number(card.dataset.row)===0 && Number(card.closest('.taste-wall-column').dataset.column)>1 ? [index] : [])`);
  const alongRow=await tasteFrames(`cards[${rows}].focus({preventScroll:true});`);
  check(beyond.length>0 && alongRow.every(frame=>beyond.every(index=>Math.abs(frame.lefts[index]-alongRow[0].lefts[index])<1)) &&
    await evaluate(`(() => { const next=document.querySelectorAll('.personal-taste-card')[${rows}]; return document.querySelector('#taste-detail').closest('article')===next && Math.abs(parseFloat(getComputedStyle(next).translate)||0)<1; })()`),
    "moving along the row folds one detail as the next unfolds, so the covers beyond stay still");
  const toNextRow=await tasteFrames('cards[1].focus({preventScroll:true});');
  const settled = await rowShifts();
  check(toNextRow.every(frame=>Math.abs(frame.lefts[1]-toNextRow[0].lefts[1])<1) &&
    settled.filter(card=>card.row===0).every(card=>Math.abs(card.shift)<1) && settled.filter(card=>card.row===1 && card.column>0).every(card=>card.shift>100),
    "changing rows eases the old row back and parts the new one around the still cover");
  check(toNextRow.some(sample=>sample.opacity>0.05 && sample.opacity<0.95), "the incoming Taste copy fades gently into place");
  check(toNextRow.every(frame=>frame.height===toNextRow[0].height && frame.tops.every((top,index)=>Math.abs(top-toNextRow[0].tops[index])<1)), "no cover moves vertically while details change");
  const sameColumn=await evaluate(`new Promise(resolve=>{
    const cards=[...document.querySelectorAll('.taste-wall-column')[1].querySelectorAll('article')];
    cards[1].focus({preventScroll:true});
    setTimeout(()=>resolve({
      title:document.querySelector('#taste-detail .taste-detail-copy > strong').textContent,
      selected:cards[1].querySelector('.personal-taste-title').textContent,
      visible:document.querySelectorAll('.personal-taste-detail-shell.is-open').length,
      overlap:cards[2].getBoundingClientRect().top<cards[1].getBoundingClientRect().bottom}),550);
  })`);
  check(sameColumn.title===sameColumn.selected && sameColumn.visible===1 && !sameColumn.overlap,
    "moving down a stack keeps one current detail and separates the following artwork");
  await evaluate('document.querySelectorAll(".personal-taste-card")[0].focus({preventScroll:true}); document.querySelectorAll(".personal-taste-card")[7].focus({preventScroll:true}); document.querySelectorAll(".personal-taste-card")[1].focus({preventScroll:true})');
  await sleep(550);
  check(await evaluate('document.querySelectorAll(".personal-taste-detail-shell.is-open").length===1 && document.querySelector("#taste-detail").closest("article")===document.activeElement'),
    "rapid changes settle on the latest cover without leaving stale open spaces");
  check(await evaluate(`(() => {
    const panel=document.querySelector('#taste-detail').getBoundingClientRect();
    const card=document.activeElement.querySelector('.personal-taste-art').getBoundingClientRect();
    return (Math.abs(panel.left-card.right)<1.5 || Math.abs(panel.right-card.left)<1.5) && panel.height>=card.height-1 &&
      (Math.abs(panel.top-card.top)<1 || Math.abs(panel.bottom-card.bottom)<1);
  })()`), "the detail is attached flush beside its cover at the cover's full height");
  const detailPointer = await evaluate('(() => { const r=document.querySelector("#taste-detail").getBoundingClientRect(); return {x:r.left+20,y:r.top+20}; })()');
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', ...detailPointer});
  check(await evaluate('document.querySelector("#taste").classList.contains("is-open")'), "the revealed text stays open while the pointer moves onto it");
  const tasteClosing=await tasteFrames('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));');
  const moving = tasteClosing[0].lefts.map((left,index)=>index).filter(index=>Math.abs(tasteClosing.at(-1).lefts[index]-tasteClosing[0].lefts[index])>100);
  check(moving.length>0 && moving.every(index=>tasteClosing.some(frame=>Math.abs(frame.lefts[index]-tasteClosing[0].lefts[index])>2 && Math.abs(frame.lefts[index]-tasteClosing.at(-1).lefts[index])>2)),
    "closing a Taste detail eases the parted row back together");
  check(await evaluate('[...document.querySelectorAll(".personal-taste-detail-shell")].every(panel=>panel.getAttribute("aria-hidden")==="true" && panel.inert && getComputedStyle(panel).visibility==="hidden") && [...document.querySelectorAll(".personal-taste-card")].every(card=>Math.abs(parseFloat(getComputedStyle(card).translate)||0)<1)'), "Escape dismisses Taste and restores every row without reopening under a stationary pointer");
  await evaluate('document.querySelectorAll(".personal-taste-card")[7].focus()');
  await sleep(550);
  check(await evaluate(`(() => {
    const detail=document.querySelector('#taste-detail'), box=detail.getBoundingClientRect(), section=document.querySelector('#taste').getBoundingClientRect();
    return detail.querySelector('.taste-detail-copy > strong').textContent===document.activeElement.querySelector('.personal-taste-title').textContent &&
      box.left>=section.left-1 && box.right<=section.right+1;
  })()`), "keyboard focus reveals the selected album and keeps the panel inside the page");
  await evaluate('document.querySelector(".personal-taste-rail").scrollLeft=1800');
  await sleep(150);
  check(await evaluate('!document.querySelector(".personal-taste-detail-shell.is-open")'), "scrolling the active cover out of view dismisses its panel");
  const existingKeys=await evaluate('[...document.querySelectorAll(".personal-taste-card")].map(card=>card.dataset.tasteKey)');
  await evaluate('document.querySelector(".taste-load-more").click()');
  await sleep(200);
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length >= 72'), "more albums are reachable inside the homepage rail");
  check(await ranked(), "descending order is preserved across loaded batches");
  check(await evaluate(`${JSON.stringify(existingKeys)}.every(key=>[...document.querySelectorAll('.personal-taste-card')].some(card=>card.dataset.tasteKey===key))`),
    "loading more retains existing albums while updating their order across rows");
  await selectTaste('Podcasts');
  await sleep(200);
  for (let batch=0;batch<4 && await evaluate('!!document.querySelector(".taste-load-more")');batch++) {
    await evaluate('document.querySelector(".taste-load-more").click()');
    await sleep(120);
  }
  const listeningPacket = JSON.parse(readFileSync(new URL('../public/listening-catalogue.json', import.meta.url)));
  const expectedPodcasts = listeningPacket.podcasts.filter(show => show.plays >= 20).length;
  check(await evaluate('document.querySelectorAll(".personal-taste-card").length') === expectedPodcasts, "the podcast shelf includes every eligible show");
  check(await evaluate(`(() => {
    const cards=[...document.querySelectorAll('.personal-taste-card')];
    return cards.length > 0 && cards.every(card=>Number(card.dataset.listens)>=20);
  })()`), "every visible podcast has at least 20 recorded plays");
  check(await ranked(expectedPodcasts), "podcasts are ranked by their recorded listens");
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
  await selectTaste('Podcasts');
  await evaluate('document.querySelector("#taste").scrollIntoView({block:"end",behavior:"instant"});');
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
  await selectTaste('Music');
  await sleep(250);
  const expectedFirst = listeningPacket.albums[0];
  check(await evaluate('Number(document.querySelector(".personal-taste-card").dataset.listens)') === expectedFirst.plays, "the shelf uses the combined history count instead of the Last.fm snapshot");
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:1, y:1});
  await evaluate('document.querySelector(".personal-taste-card").focus(); document.querySelector(".personal-taste-card").click()');
  await sleep(200);
  const focusedCount = await evaluate('document.querySelector("#taste-detail .personal-taste-detail-count")?.textContent');
  check(focusedCount && !/last[.]?fm|spotify|apple|youtube/i.test(focusedCount), `album hover labels contain no provider branding [${focusedCount}]`);
  await sleep(600);
  check(await evaluate('document.querySelector("#taste-detail")?.closest("article")===document.activeElement'), "keyboard details stay open while a cover scrolls into view from below the fold");
  check(await evaluate('!document.querySelector("dialog") && !location.hash && document.body.style.overflow !== "hidden" && document.querySelector(".personal-taste-card").tagName === "ARTICLE"'), "album cards have no click-through, modal, URL change or scroll lock");
  await cdp.send("Input.dispatchKeyEvent", {type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  await cdp.send("Input.dispatchKeyEvent", {type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  check(await evaluate('!document.querySelector("dialog") && !location.hash'), "Enter reads the focused count without opening details");
  await selectTaste('Podcasts');
  await evaluate('document.querySelector(".personal-taste-card").click()');
  await sleep(100);
  check(await evaluate('!document.querySelector("dialog") && !location.hash'), "podcast cards also have no click-through");
  check(await evaluate('Number(document.querySelector(".personal-taste-card").dataset.listens)') === listeningPacket.podcasts[0].plays, "podcast counts include the available YouTube and Apple evidence");
  await goto('/#taste-item=music:043');
  check(await evaluate('location.hash === "#taste-item=music:043" && !document.querySelector("dialog")'), "old Taste detail links cannot reopen the removed modal");

  section("catalogue loading failure");
  await cdp.send("Network.enable");
  await cdp.send("Network.setBlockedURLs", { urls: [`${origin}/listening-catalogue.json`] });
  await evaluate('sessionStorage.removeItem("akibwa:remote:/listening-catalogue.json")');
  await goto('/');
  await selectTaste('Music');
  await sleep(300);
  check(await evaluate('document.querySelector(".taste-load-status")?.textContent.includes("couldn’t load") && document.querySelectorAll(".personal-taste-card").length >= 36'), "a failed full-history fetch retains the opening shelf and offers a retry");
  await cdp.send("Network.setBlockedURLs", { urls: [] });
  await evaluate('document.querySelector(".taste-load-status button").click()');
  for (let attempt=0;attempt<30 && await evaluate('!!document.querySelector(".taste-load-status")');attempt++) await sleep(100);
  check(await evaluate('!document.querySelector(".taste-load-status")'), "retry recovers the full album catalogue");

  section("chapter spotlight");
  await setDesktop(1440, 900);
  await goto("/");
  const spotlightState = () => evaluate(`({
    spot: document.querySelector('.concept-page').dataset.spotlight ?? null,
    hash: location.hash,
    shown: ['projects','career','taste'].filter(id => getComputedStyle(document.getElementById(id)).display !== 'none').join(),
    current: [...document.querySelectorAll('.concept-section-links a')].filter(link => link.getAttribute('aria-current')==='true').map(link => link.textContent).join(),
    faded: [...document.querySelectorAll('.concept-section-links a')].filter((link, index) => link.getAttribute('aria-current') !== 'true' && getComputedStyle(link).color !== window.__restLinkColors?.[index]).length,
    legible: Math.min(...[...document.querySelectorAll('.concept-section-links a:not([aria-current])')].map(link => {
      const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
      const rgb = (color) => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const luminance = (channels) => channels.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const [text, paper] = [luminance(rgb(getComputedStyle(link).color)), luminance(rgb(getComputedStyle(document.body).backgroundColor))];
      return (Math.max(text, paper) + 0.05) / (Math.min(text, paper) + 0.05);
    })),
    top: scrollY,
    overflow: document.documentElement.scrollWidth - innerWidth,
    tasteDetailOpen: !!document.querySelector('.personal-taste-detail-shell.is-open'),
    focus: (document.activeElement?.className || document.activeElement?.tagName || '').toString().slice(0, 40)
  })`);
  const chapterLink = (index) => evaluate(`(() => { const r=document.querySelectorAll('.concept-section-links a')[${index}].getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  const clickAt = async ({x,y}) => { for (const type of ['mousePressed','mouseReleased']) await cdp.send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1}); };
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', ...(await chapterLink(1))});
  await sleep(450);
  check(await evaluate(`(() => { const link=document.querySelectorAll('.concept-section-links a')[1]; const style=getComputedStyle(link); return style.fontWeight==='600' && style.textDecorationLine==='none' && new DOMMatrix(getComputedStyle(link,'::after').transform).a>0.99; })()`),
    "hovering a masthead link draws its accent rule without changing the word's weight");
  check(await evaluate(`JSON.stringify([...document.querySelectorAll('.concept-section-links a')].map(link=>link.getAttribute('href')))==='["#projects","#career","#taste"]'`), "masthead links keep their chapter anchors for new tabs and pages without JavaScript");
  const spotlit = {
    projects: `document.querySelectorAll('.concept-project-copy').length===3 && [...document.querySelectorAll('a.concept-project-card')].every(card=>document.getElementById(card.getAttribute('aria-describedby'))?.textContent.length>40)`,
    career: `document.querySelectorAll('.career-spotlight-role').length===8 && [...document.querySelectorAll('.career-spotlight-role')].every(role=>role.querySelector('.concept-career-statement')?.textContent.length>30)`,
    taste: `(() => { const rail=document.querySelector('#taste-rail'), bounds=rail.getBoundingClientRect(), columns=[...rail.querySelectorAll('.taste-wall-column')]; return document.querySelector('.personal-taste').classList.contains('is-expanded') && columns.length>4 && columns.at(-1).getBoundingClientRect().right<=bounds.right+1 && document.querySelector('.personal-taste-art').getBoundingClientRect().width>140 && rail.getBoundingClientRect().height>innerHeight; })()`,
  };
  await evaluate("window.__restLinkColors=[...document.querySelectorAll('.concept-section-links a')].map(link=>getComputedStyle(link).color)");
  for (const [index, id, label] of [[0,'projects','Projects'],[1,'career','Career'],[2,'taste','Taste Library']]) {
    await clickAt(await chapterLink(index));
    await sleep(750);
    const state = await spotlightState();
    check(state.spot===id && state.hash===`#${id}` && state.shown===id && state.current===label && state.faded===2 && state.legible>=4.5 && state.top===0 && state.overflow<=1,
      `${label} comes forward beneath the unchanged masthead while the other links step back, still legible${state.spot===id ? '' : ` [${JSON.stringify(state)}]`}`);
    check(await evaluate(spotlit[id]), `the ${label} spotlight lays out its whole chapter`);
    await capture(`spotlight-${id}`);
  }
  // Closing goes through history and a view transition, so wait for the page
  // to settle rather than trusting a fixed delay.
  const wholePage = async () => { let state; for (let attempt = 0; attempt < 30; attempt++) { state = await spotlightState(); if (!state.spot && state.shown === 'projects,career,taste') break; await sleep(100); } return state; };
  await cdp.send("Input.dispatchKeyEvent", {type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
  await sleep(800);
  let spotlightAfter = await wholePage();
  check(!spotlightAfter.spot && !spotlightAfter.hash && spotlightAfter.shown==='projects,career,taste' && !spotlightAfter.current, `Escape returns to the whole page${spotlightAfter.spot ? ` [${JSON.stringify(spotlightAfter)}]` : ''}`);
  await clickAt(await chapterLink(1));
  await sleep(700);
  await evaluate('history.back()');
  await sleep(900);
  spotlightAfter = await wholePage();
  check(!spotlightAfter.spot && !spotlightAfter.hash && spotlightAfter.shown==='projects,career,taste', "Back returns from a spotlight to the whole page");
  await clickAt(await chapterLink(1));
  await sleep(700);
  await clickAt(await chapterLink(1));
  await sleep(900);
  spotlightAfter = await wholePage();
  check(!spotlightAfter.spot && spotlightAfter.shown==='projects,career,taste', "clicking the selected link again returns to the whole page");
  await setMobile();
  await goto("/");
  await clickAt(await chapterLink(2));
  await sleep(800);
  spotlightAfter = await spotlightState();
  check(spotlightAfter.spot==='taste' && spotlightAfter.overflow<=1 && await evaluate('getComputedStyle(document.querySelector(".personal-taste-caption")).display!=="none"'), "the phone Taste spotlight keeps captions and stays inside the screen");

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
  check(await evaluate('[document.querySelector(".concept-career-section"),document.querySelector(".career-detail-track"),document.querySelector(".career-detail[data-active=\\"true\\"]")].every(item=>getComputedStyle(item).transitionProperty==="none")'), "reduced motion changes the career detail without animation or delay");
  await evaluate('document.querySelector(".taste-search-toggle").click()');
  check(await evaluate('[document.querySelector(".taste-search"),document.querySelector(".taste-search-field")].every(item=>getComputedStyle(item).transitionProperty==="none")'), "reduced motion makes the search immediate");
  await evaluate('document.querySelector(".taste-search-field input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  await sleep(50);
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:1, y:1});
  await evaluate('document.querySelector(".personal-taste-card").focus()');
  await sleep(50);
  check(await evaluate('[document.querySelector(".personal-taste-detail-shell"),document.querySelector("#taste-detail")].every(item=>item && getComputedStyle(item).transitionProperty==="none")'), "reduced motion reveals album details without animation or delay");
  check(await evaluate('[...document.querySelectorAll(".career-detail")].every(item=>getComputedStyle(item).transitionProperty==="none")'), "reduced motion also disables the text handover");
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

  const timeoutMs = process.env.CHECK_TREK_ONLY ? 240000 : 180000;
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
