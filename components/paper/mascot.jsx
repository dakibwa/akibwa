"use client";

import { useEffect, useRef } from "react";
import { MARK_BODY, MARK_TAIL } from "./mark-paths";

/*
 * The Akibwa a as the page's mascot, in the manner of the reference film: it is
 * on the sheet from the start, not drawn in, and lives there. It dances in the open
 * middle of the page and now and then hops over to inspect one of the five
 * things — onto the sleeves, the Features square, the websites tile — which
 * answer as if hovered (`onVisit`). It can be picked up and set down anywhere,
 * which becomes its home; a click makes it twirl, and it hops when the heading
 * writes its name. On a phone it keeps to the right-hand edge and peeks in
 * beside the things instead. On a first visit it starts in the sky's round
 * window, where the sun will be, and leaps out once the things are drawn; the
 * window then shows its sky (Dan, 25 September 2026). Reduced motion keeps it
 * still where it stands.
 */

// Its box is the mark's own (-6 -4 116 118); its feet sit at (50, 104).
const VIEW = { x: -6, y: -4, w: 116, h: 118 };
const FEET = { x: 50, y: 104 };

// Where it perches on each thing, in the things' 160 × 140 drawing, before
// the hover lift of 7.
const PERCH = {
  music: [80, 55, true],
  features: [80, 36, true],
  websites: [63, 54, true],
  career: [26, 128, false],
  trek: [80, 31, true]
};

const aborted = () => new DOMException("aborted", "AbortError");
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function Mascot({ onVisit }) {
  const root = useRef(null);
  const body = useRef(null);
  const eyes = useRef(null);

  useEffect(() => {
    const el = root.current;
    const front = el.parentElement;
    const doc = document.documentElement;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const wide = matchMedia("(min-width: 720px)");
    let pos = { x: 0, y: 0 };
    let home = null; // fractions of the front page, once set down by hand
    let size = { w: 100, h: 102 };
    let life = null;
    let busy = false;
    let held = null;
    let gazeFrame = 0;
    let userOnThings = false;
    let peeking = false; // on a phone, allowed part-way off the right edge
    let inSky = false; // sitting in the sky's window, where the sun will be

    const measure = () => {
      size = { w: el.offsetWidth, h: el.offsetHeight };
    };
    const place = () => {
      const width = front.clientWidth;
      if (width) pos.x = Math.max(size.w * 0.45, Math.min(width + (peeking ? size.w * 0.2 : -size.w * 0.45), pos.x));
      const x = pos.x - ((FEET.x - VIEW.x) / VIEW.w) * size.w;
      const y = pos.y - ((FEET.y - VIEW.y) / VIEW.h) * size.h;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    const pose = ({ rot = 0, sx = 1, sy = 1 } = {}) => {
      body.current.setAttribute("transform", `translate(${FEET.x} ${FEET.y}) rotate(${rot.toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-FEET.x} ${-FEET.y})`);
    };
    const look = (dx, dy) => {
      eyes.current.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    };
    // Eyes towards a point on the screen, a few units at most.
    const lookAt = (x, y) => {
      const box = eyes.current.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      const reach = Math.min(1, Math.hypot(dx, dy) / 220);
      const angle = Math.atan2(dy, dx);
      look(Math.cos(angle) * 3.4 * reach, Math.sin(angle) * 2.6 * reach);
    };

    const homeSpot = () => {
      const sheet = front.getBoundingClientRect();
      if (home) return { x: home.x * sheet.width, y: home.y * sheet.height };
      const intro = front.querySelector(".front-intro").getBoundingClientRect();
      // On phones it stands at the right of the contact links, clear of the lede.
      if (!wide.matches) return { x: sheet.width * 0.8, y: intro.bottom - sheet.top - 6 };
      const row = front.querySelector(".things").getBoundingClientRect();
      const top = intro.bottom - sheet.top + size.h + 8;
      const bottom = row.top - sheet.top - 14;
      return { x: sheet.width * (wide.matches ? 0.6 : 0.8), y: Math.max(top, Math.min(bottom, (top + bottom) / 2 + size.h * 0.3)) };
    };

    const frames = (duration, frame, signal) =>
      new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(aborted());
        const start = performance.now();
        let id = 0;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          frame(t);
          if (t < 1) id = requestAnimationFrame(tick);
          else resolve();
        };
        id = requestAnimationFrame(tick);
        signal?.addEventListener("abort", () => {
          cancelAnimationFrame(id);
          reject(aborted());
        }, { once: true });
      });
    const wait = (ms, signal) =>
      new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(aborted());
        const id = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
          clearTimeout(id);
          reject(aborted());
        }, { once: true });
      });
    const flag = async (name, ms, signal) => {
      el.classList.add(name);
      try {
        await wait(ms, signal);
      } finally {
        el.classList.remove(name);
      }
    };

    // A hop-walk: crouch, spring along an arc, land with a squash.
    const hopTo = async (target, signal, { height = 18, stride = 62 } = {}) => {
      const from = { ...pos };
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const hops = Math.max(1, Math.round(Math.hypot(dx, dy) / stride));
      const dir = Math.sign(dx) || 1;
      for (let i = 0; i < hops; i += 1) {
        const a = { x: from.x + (dx * i) / hops, y: from.y + (dy * i) / hops };
        const b = { x: from.x + (dx * (i + 1)) / hops, y: from.y + (dy * (i + 1)) / hops };
        look(dir * 3, 0.6);
        await frames(90, (t) => pose({ rot: dir * 4 * t, sx: 1 + 0.08 * t, sy: 1 - 0.1 * t }), signal);
        const lift = height + Math.max(0, a.y - b.y) * 0.5;
        await frames(300, (t) => {
          pos = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - lift * 4 * t * (1 - t) };
          place();
          pose({ rot: dir * (9 - 13 * t), sx: 0.95, sy: 1.08 - 0.08 * t });
        }, signal);
        await frames(120, (t) => pose({ rot: dir * -3 * (1 - t), sx: 1.09 - 0.09 * t, sy: 0.88 + 0.12 * t }), signal);
      }
      pose();
    };

    const dances = [
      // A sway from side to side, bobbing on the beat.
      async (signal) => {
        const origin = { ...pos };
        await frames(1500, (t) => {
          pos = { x: origin.x + 6 * Math.sin(t * Math.PI * 2), y: origin.y };
          place();
          pose({ rot: 11 * Math.sin(t * Math.PI * 4), sx: 1 - 0.04 * Math.sin(t * Math.PI * 8), sy: 1 + 0.05 * Math.sin(t * Math.PI * 8) });
          look(3 * Math.sin(t * Math.PI * 4), 0);
        }, signal);
        pos = origin;
        place();
        pose();
      },
      // Three little bops in place.
      async (signal) => {
        const origin = { ...pos };
        for (let i = 0; i < 3; i += 1) {
          await frames(80, (t) => pose({ sx: 1 + 0.07 * t, sy: 1 - 0.09 * t }), signal);
          await frames(220, (t) => {
            pos = { x: origin.x, y: origin.y - 10 * 4 * t * (1 - t) };
            place();
            pose({ rot: (i % 2 ? -6 : 6) * Math.sin(t * Math.PI), sy: 1.05 });
          }, signal);
        }
        pos = origin;
        place();
        pose();
      },
      // A twirl, the paper turning on its edge.
      async (signal) => flag("is-twirling", 760, signal),
      // A wag of the tail and a look round.
      async (signal) => {
        el.classList.add("is-wagging");
        try {
          await frames(1300, (t) => look(3.2 * Math.sin(t * Math.PI * 2), -0.8), signal);
        } finally {
          el.classList.remove("is-wagging");
        }
      },
      // A jelly wobble.
      async (signal) => {
        await frames(900, (t) => {
          const d = 1 - t;
          pose({ sx: 1 + 0.1 * d * Math.sin(t * Math.PI * 7), sy: 1 - 0.1 * d * Math.sin(t * Math.PI * 7), rot: 4 * d * Math.sin(t * Math.PI * 5) });
        }, signal);
        pose();
      }
    ];

    const things = () =>
      [...front.querySelectorAll(".things .thing")].map((thing) => ({
        id: (thing.getAttribute("href") ?? "").replace(/[#/]/g, ""),
        row: thing,
        art: thing.querySelector(".thing-art")
      })).filter((thing) => PERCH[thing.id] && thing.art);

    const perch = (thing) => {
      const sheet = front.getBoundingClientRect();
      const box = thing.art.getBoundingClientRect();
      const [px, py, lifted] = PERCH[thing.id];
      const unit = box.height / 140;
      return {
        x: box.left - sheet.left + (px / 160) * box.width,
        y: box.top - sheet.top + (py - (lifted ? 7 : 0)) * unit
      };
    };

    // Hop over to a thing, look at it while it plays, react, move on.
    const inspect = async (thing, signal) => {
      await hopTo(perch(thing), signal);
      const box = thing.art.getBoundingClientRect();
      lookAt(box.left + box.width / 2, box.top + box.height * 0.62);
      onVisit(thing.id);
      try {
        await wait(700, signal);
        await pick(dances.slice(0, 2))(signal);
        lookAt(box.left + box.width / 2, box.top + box.height * 0.62);
        await wait(900, signal);
      } finally {
        onVisit(null);
      }
    };

    /*
     * On a phone the five things are a list with their words beside them, so
     * it never hops across the text: it keeps to the right-hand edge and
     * leans in from the margin beside a thing, part of it out of sight, to
     * look it over.
     */
    const peek = async (thing, signal) => {
      const sheet = front.getBoundingClientRect();
      const row = thing.row.getBoundingClientRect();
      peeking = true;
      await hopTo({ x: sheet.width + size.w * 0.1, y: row.top - sheet.top + row.height / 2 + size.h * 0.42 }, signal, { height: 10, stride: 46 });
      const box = thing.art.getBoundingClientRect();
      lookAt(box.left + box.width / 2, box.top + box.height / 2);
      onVisit(thing.id);
      try {
        await frames(420, (t) => pose({ rot: -12 * t, sx: 1, sy: 1 }), signal);
        await wait(1500, signal);
        await frames(320, (t) => pose({ rot: -12 * (1 - t) }), signal);
      } finally {
        onVisit(null);
      }
    };

    // In the window it is shrunk about its feet to fit, its middle (50, 55 in
    // its drawing) on the window's middle.
    const skyScale = () => {
      const sky = front.querySelector(".sky")?.getBoundingClientRect();
      return sky ? Math.min(1, (sky.width * 0.72) / size.w) : 1;
    };
    const skySpot = () => {
      const sheet = front.getBoundingClientRect();
      const sky = front.querySelector(".sky").getBoundingClientRect();
      const unit = size.h / VIEW.h;
      return { x: sky.left - sheet.left + sky.width / 2, y: sky.top - sheet.top + sky.height / 2 + (FEET.y - 55) * skyScale() * unit };
    };
    const leaveSky = () => {
      inSky = false;
      el.classList.remove("is-in-sky");
      delete doc.dataset.skyHost;
    };
    // Out of the window in one leap, growing to full size on the way down.
    const leap = async (target, signal) => {
      const from = { ...pos };
      const k = skyScale();
      const lift = 50 + Math.max(0, from.y - target.y) * 0.25;
      try {
        await frames(160, (t) => pose({ sx: k * (1 + 0.1 * t), sy: k * (1 - 0.14 * t) }), signal);
        await frames(680, (t) => {
          pos = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t - lift * 4 * t * (1 - t) };
          place();
          const grow = k + (1 - k) * Math.min(1, t * 1.5);
          pose({ rot: -16 * Math.sin(t * Math.PI), sx: grow, sy: grow * (1.06 - 0.06 * t) });
          if (inSky && t > 0.12) leaveSky();
        }, signal);
        await frames(170, (t) => pose({ sx: 1.1 - 0.1 * t, sy: 0.86 + 0.14 * t }), signal);
      } finally {
        leaveSky();
        pose();
      }
    };

    const roomOpen = () => doc.dataset.room && doc.dataset.room !== "index";
    const canWander = () => !userOnThings && !document.hidden && !roomOpen();
    const inView = (thing) => {
      const box = thing.row.getBoundingClientRect();
      return box.top > 0 && box.bottom < window.innerHeight;
    };

    const live = async (signal, { first }) => {
      measure();
      if (first && !still.matches && front.querySelector(".sky")) {
        // It watches the five things drawn in from the window, then leaps out.
        inSky = true;
        busy = true;
        doc.dataset.skyHost = "mascot";
        el.classList.add("is-in-sky");
        pos = skySpot();
        place();
        pose({ sx: skyScale(), sy: skyScale() });
        el.classList.add("is-placed");
        try {
          await wait(2500, signal);
          await leap(homeSpot(), signal);
        } finally {
          leaveSky();
          busy = false;
        }
        await wait(900, signal);
      } else {
        leaveSky();
        pos = homeSpot();
        place();
        el.classList.add("is-placed");
        if (still.matches) return;
        await wait(1400, signal);
      }
      for (;;) {
        for (let i = 0; i < 2; i += 1) {
          busy = true;
          await pick(dances)(signal);
          busy = false;
          await wait(1400 + Math.random() * 1600, signal);
        }
        if (!canWander()) continue;
        busy = true;
        if (wide.matches) {
          const all = things();
          const first = pick(all);
          const second = pick(all.filter((thing) => thing !== first));
          await inspect(first, signal);
          if (Math.random() < 0.6 && canWander()) await inspect(second, signal);
          await hopTo(homeSpot(), signal);
        } else {
          const near = things().filter(inView);
          const first = pick(near);
          if (first) {
            try {
              await peek(first, signal);
              const second = pick(near.filter((thing) => thing !== first));
              if (second && Math.random() < 0.6 && canWander()) await peek(second, signal);
              await hopTo(homeSpot(), signal, { height: 10, stride: 46 });
            } finally {
              peeking = false;
            }
          }
        }
        busy = false;
        await wait(2400 + Math.random() * 2400, signal);
      }
    };

    const start = (first = false) => {
      life?.abort();
      life = new AbortController();
      live(life.signal, { first }).catch((error) => {
        if (error?.name !== "AbortError") throw error;
      });
    };
    const stop = () => {
      life?.abort();
      life = null;
      busy = false;
      onVisit(null);
    };

    // Picked up, it dangles and swings with the pointer; set down, it stays.
    const grab = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      stop();
      el.setPointerCapture(event.pointerId);
      const sheet = front.getBoundingClientRect();
      held = {
        id: event.pointerId,
        dx: pos.x - (event.clientX - sheet.left),
        dy: pos.y - (event.clientY - sheet.top),
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        rot: 0,
        spin: 0,
        lastX: event.clientX,
        frame: 0
      };
      el.classList.add("is-held");
      const swing = () => {
        if (!held) return;
        held.spin = (held.spin + (-held.rot * 0.12)) * 0.82;
        held.rot += held.spin;
        pose({ rot: held.rot, sx: 1.04, sy: 1.04 });
        held.frame = requestAnimationFrame(swing);
      };
      held.frame = requestAnimationFrame(swing);
    };
    const drag = (event) => {
      if (!held || event.pointerId !== held.id) return;
      if (Math.hypot(event.clientX - held.startX, event.clientY - held.startY) > 5) held.moved = true;
      if (!held.moved) return;
      const sheet = front.getBoundingClientRect();
      pos = {
        x: Math.max(size.w * 0.4, Math.min(sheet.width - size.w * 0.4, event.clientX - sheet.left + held.dx)),
        y: Math.max(size.h, Math.min(sheet.height, event.clientY - sheet.top + held.dy))
      };
      place();
      if (!still.matches) held.spin += Math.max(-6, Math.min(6, -(event.clientX - held.lastX) * 0.35));
      held.lastX = event.clientX;
      look(Math.max(-3, Math.min(3, (event.clientX - held.lastX) * 0.2)), 2.4);
    };
    const drop = async (event) => {
      if (!held || event.pointerId !== held.id) return;
      cancelAnimationFrame(held.frame);
      const { moved } = held;
      held = null;
      el.classList.remove("is-held");
      el.releasePointerCapture?.(event.pointerId);
      pose();
      if (moved) {
        const sheet = front.getBoundingClientRect();
        home = { x: pos.x / sheet.width, y: pos.y / sheet.height };
      }
      if (still.matches) return;
      life = new AbortController();
      const signal = life.signal;
      try {
        if (moved) {
          await frames(260, (t) => pose({ sx: 1 + 0.12 * Math.sin(t * Math.PI), sy: 1 - 0.14 * Math.sin(t * Math.PI) }), signal);
        } else {
          el.classList.add("is-twirling");
          await dances[1](signal);
          el.classList.remove("is-twirling");
        }
        pose();
        await wait(900, signal);
        start(false);
      } catch (error) {
        el.classList.remove("is-twirling");
        if (error?.name !== "AbortError") throw error;
      }
    };

    // Its eyes follow the pointer while it is at home.
    const follow = (event) => {
      if (busy || held || still.matches) return;
      cancelAnimationFrame(gazeFrame);
      gazeFrame = requestAnimationFrame(() => lookAt(event.clientX, event.clientY));
    };
    const row = front.querySelector(".things");
    const onThings = () => { userOnThings = true; };
    const offThings = () => { userOnThings = false; };

    // It hops when the heading writes its name, as the sky turns to night.
    const named = new MutationObserver(() => {
      if (doc.dataset.sky !== "night" || busy || held || still.matches || roomOpen()) return;
      busy = true;
      const signal = life?.signal;
      dances[1](signal).catch(() => {}).finally(() => { busy = false; });
    });
    named.observe(doc, { attributes: true, attributeFilter: ["data-sky"] });

    // Rooms hide the front page: rest while one is open.
    const rooms = new MutationObserver(() => {
      if (roomOpen()) stop();
      else if (!life && !held) start(false);
    });
    rooms.observe(doc, { attributes: true, attributeFilter: ["data-room"] });

    let settle = 0;
    const resize = () => {
      if (held) return;
      clearTimeout(settle);
      stop();
      measure();
      pos = homeSpot();
      place();
      settle = setTimeout(() => {
        if (!roomOpen() && !held) start(false);
      }, 300);
    };

    el.addEventListener("pointerdown", grab);
    el.addEventListener("pointermove", drag);
    el.addEventListener("pointerup", drop);
    el.addEventListener("pointercancel", drop);
    window.addEventListener("pointermove", follow, { passive: true });
    window.addEventListener("resize", resize);
    row?.addEventListener("pointerenter", onThings);
    row?.addEventListener("pointerleave", offThings);
    if (!roomOpen()) start(!doc.hasAttribute("data-drawn"));
    return () => {
      stop();
      clearTimeout(settle);
      named.disconnect();
      rooms.disconnect();
      cancelAnimationFrame(gazeFrame);
      el.removeEventListener("pointerdown", grab);
      el.removeEventListener("pointermove", drag);
      el.removeEventListener("pointerup", drop);
      el.removeEventListener("pointercancel", drop);
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("resize", resize);
      row?.removeEventListener("pointerenter", onThings);
      row?.removeEventListener("pointerleave", offThings);
    };
  }, [onVisit]);

  return (
    <div className="mascot" ref={root} aria-hidden="true">
      <svg className="mascot-art" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} focusable="false">
        <ellipse className="mascot-shadow" cx={FEET.x} cy="106" rx="40" ry="3.6" />
        <g ref={body}>
          <g className="mascot-paper">
            <path className="mascot-edge" d={MARK_BODY} fillRule="evenodd" transform="translate(1.7 2.1)" />
            <path className="mark-body" d={MARK_BODY} fillRule="evenodd" />
            <g className="mascot-tail">
              <path className="mascot-edge-tail" d={MARK_TAIL} transform="translate(1.7 2.1)" />
              <path className="mark-tail" d={MARK_TAIL} />
            </g>
            <g ref={eyes}>
              <g className="mascot-blink">
                {/* On the arch, with room all round to look about. */}
                <rect x="36.5" y="19.5" width="6.6" height="8.6" rx="1.5" />
                <rect x="50.5" y="19.5" width="6.6" height="8.6" rx="1.5" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
