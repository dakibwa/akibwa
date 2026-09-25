"use client";

import { useEffect, useRef } from "react";
import { LETTERS } from "./cast-paths";

/*
 * The cast: the Akibwa a and the next two letters of the name, k and i, as
 * Codex drew them for Dan (25 September 2026): an orange a, a periwinkle k and
 * a raspberry i, each with a paler tail (cast-paths.js). On a first visit the
 * a sits in the round hole cut in the sheet, where the sun and moon used to
 * be, and leaps out once the five things are drawn; a while later k, then i,
 * pokes its head up into the hole, looks about and climbs out after it. They
 * live on the front sheet: they dance, hop about, go over to each other for a
 * duet, take turns inspecting the five things (which answer as if hovered,
 * `onVisit`), and now and then, as the heading writes Akibwa, line up to spell
 * "aki" and bow. Each can be picked up and set down anywhere, which becomes
 * its home; a click makes it twirl. On a phone they stand beside the contact
 * links and peek in from the right-hand edge rather than cross the words. They
 * rest while a room is open; reduced motion keeps them still where they stand.
 */

// Each letter's drawing box (all on one scale, so a stroke is as thick in each),
// the top left of its eyes, the reach of its shadow, and how wide and how tall
// it stands.
const EYE = { w: 4.8, h: 6.9, rx: 1.8 };
const CAST = [
  { id: "a", view: { x: 1, y: 13, w: 99, h: 97 }, eyes: [[42.47, 27.56], [52.07, 27.56]], shadow: [53.5, 36], width: 88.8, top: 18.7 },
  { id: "k", view: { x: 8, y: -12, w: 86, h: 122 }, eyes: [[19.41, 25.45], [29.01, 25.45]], shadow: [50, 34], width: 75.9, top: -7.3 },
  { id: "i", view: { x: 28, y: -10, w: 46, h: 120 }, eyes: [[39.33, 45.11], [48.93, 44.59]], shadow: [50.4, 16], width: 36.2, top: -5.5 }
];
const FEET = { x: 50, y: 104 };
// At home they stand as a word, this far across the sheet with this many units
// between letters; lined up, they close up to spell it.
const HOME = { wide: [0.63, 38], narrow: [0.736, 18] };
const LINE_UP = [0.66, 11];
// The room each keeps from the others, in units.
const ROOM = 8;

// Where one perches on each thing, in the things' 160 × 140 drawing, before
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

// A letter: its body and tail, each over a darker edge like cut card. The tail
// wags about its joint.
function Art({ id }) {
  const { body, tail, joint } = LETTERS[id];
  return (
    <>
      <path className="cast-body-edge" d={body} fillRule="evenodd" transform="translate(1.7 2.1)" />
      <path className="cast-body" d={body} fillRule="evenodd" />
      <g className="mascot-tail" style={{ transformOrigin: `${joint[0]}px ${joint[1]}px` }}>
        <path className="cast-tail-edge" d={tail} transform="translate(1.7 2.1)" />
        <path className="cast-tail" d={tail} />
      </g>
    </>
  );
}

export function Cast({ onVisit }) {
  const roots = useRef([]);
  const bodies = useRef([]);
  const gazes = useRef([]);

  useEffect(() => {
    const front = roots.current[0].parentElement;
    const doc = document.documentElement;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const wide = matchMedia("(min-width: 720px)");
    let userOnThings = false;
    let inspector = null; // only one looks the five things over at a time
    let gazeFrame = 0;
    let lastLineUp = 0;

    const roomOpen = () => doc.dataset.room && doc.dataset.room !== "index";
    const hole = () => front.querySelector(".hole");

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

    const actors = CAST.map((spec, index) => {
      const el = roots.current[index];
      const body = bodies.current[index];
      const gaze = gazes.current[index];
      const { view } = spec;
      const actor = { spec, el, pos: { x: 0, y: 0 }, ground: 0, dest: null, size: { w: 100, h: 100 }, home: null, busy: false, claimed: false, held: null, peeking: false, life: null };

      actor.measure = () => {
        actor.size = { w: el.offsetWidth, h: el.offsetHeight };
      };
      // Pixels to a unit of its drawing (the same for all three), its half
      // width and its height where it stands.
      actor.unit = () => actor.size.w / view.w;
      actor.half = () => (spec.width / 2) * actor.unit();
      actor.tall = () => (FEET.y - spec.top) * actor.unit();
      actor.place = () => {
        const width = front.clientWidth;
        const { w, h } = actor.size;
        if (width) actor.pos.x = Math.max(w * 0.45, Math.min(width + (actor.peeking ? w * 0.2 : -w * 0.45), actor.pos.x));
        const x = actor.pos.x - ((FEET.x - view.x) / view.w) * w;
        const y = actor.pos.y - ((FEET.y - view.y) / view.h) * h;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      };
      actor.pose = ({ rot = 0, sx = 1, sy = 1 } = {}) => {
        body.setAttribute("transform", `translate(${FEET.x} ${FEET.y}) rotate(${rot.toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-FEET.x} ${-FEET.y})`);
      };
      actor.look = (dx, dy) => {
        gaze.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
      };
      // Eyes towards a point on the screen, a few units at most.
      actor.lookAt = (x, y) => {
        const box = gaze.getBoundingClientRect();
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height / 2);
        const reach = Math.min(1, Math.hypot(dx, dy) / 220);
        const angle = Math.atan2(dy, dx);
        actor.look(Math.cos(angle) * 3.4 * reach, Math.sin(angle) * 2.6 * reach);
      };
      actor.eyesAt = () => {
        const box = gaze.getBoundingClientRect();
        return [box.left + box.width / 2, box.top + box.height / 2];
      };
      actor.homeSpot = () => {
        const sheet = front.getBoundingClientRect();
        if (actor.home) return { x: actor.home.x * sheet.width, y: actor.home.y * sheet.height };
        const intro = front.querySelector(".front-intro").getBoundingClientRect();
        // On phones they stand at the right of the contact links, clear of the lede.
        if (!wide.matches) return { x: word(...HOME.narrow)[index], y: intro.bottom - sheet.top - 6 };
        // One baseline for all three, set by the a, so they read as a word.
        const row = front.querySelector(".things").getBoundingClientRect();
        const top = intro.bottom - sheet.top + roots.current[0].offsetHeight * 0.8 + 8;
        const bottom = row.top - sheet.top - 14;
        return { x: word(...HOME.wide)[index], y: Math.max(top, Math.min(bottom, (top + bottom) / 2 + 30)) };
      };
      actor.flag = async (name, ms, signal) => {
        el.classList.add(name);
        try {
          await wait(ms, signal);
        } finally {
          el.classList.remove(name);
        }
      };

      // A hop-walk: crouch, spring along an arc, land with a squash.
      actor.hopTo = async (target, signal, options) => {
        actor.dest = target;
        try {
          await hop(target, signal, options);
        } finally {
          // A hop cut short leaves a newer destination alone.
          if (actor.dest === target) actor.dest = null;
        }
      };
      // Where it stands, or where it is about to land.
      actor.spot = () => actor.dest ?? { x: actor.pos.x, y: actor.ground };
      const hop = async (target, signal, { height = 18, stride = 62 } = {}) => {
        const from = { ...actor.pos };
        const dx = target.x - from.x;
        const dy = target.y - from.y;
        const hops = Math.max(1, Math.round(Math.hypot(dx, dy) / stride));
        const dir = Math.sign(dx) || 1;
        for (let i = 0; i < hops; i += 1) {
          const a = { x: from.x + (dx * i) / hops, y: from.y + (dy * i) / hops };
          const b = { x: from.x + (dx * (i + 1)) / hops, y: from.y + (dy * (i + 1)) / hops };
          actor.look(dir * 3, 0.6);
          await frames(90, (t) => actor.pose({ rot: dir * 4 * t, sx: 1 + 0.08 * t, sy: 1 - 0.1 * t }), signal);
          const lift = height + Math.max(0, a.y - b.y) * 0.5;
          await frames(300, (t) => {
            actor.pos = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - lift * 4 * t * (1 - t) };
            actor.place();
            actor.pose({ rot: dir * (9 - 13 * t), sx: 0.95, sy: 1.08 - 0.08 * t });
          }, signal);
          await frames(120, (t) => actor.pose({ rot: dir * -3 * (1 - t), sx: 1.09 - 0.09 * t, sy: 0.88 + 0.12 * t }), signal);
        }
        actor.pose();
        actor.ground = target.y;
      };

      actor.dances = [
        // A sway from side to side, bobbing on the beat.
        async (signal) => {
          const origin = { ...actor.pos };
          await frames(1500, (t) => {
            actor.pos = { x: origin.x + 6 * Math.sin(t * Math.PI * 2), y: origin.y };
            actor.place();
            actor.pose({ rot: 11 * Math.sin(t * Math.PI * 4), sx: 1 - 0.04 * Math.sin(t * Math.PI * 8), sy: 1 + 0.05 * Math.sin(t * Math.PI * 8) });
            actor.look(3 * Math.sin(t * Math.PI * 4), 0);
          }, signal);
          actor.pos = origin;
          actor.place();
          actor.pose();
        },
        // Three little bops in place.
        async (signal) => {
          const origin = { ...actor.pos };
          for (let i = 0; i < 3; i += 1) {
            await frames(80, (t) => actor.pose({ sx: 1 + 0.07 * t, sy: 1 - 0.09 * t }), signal);
            await frames(220, (t) => {
              actor.pos = { x: origin.x, y: origin.y - 10 * 4 * t * (1 - t) };
              actor.place();
              actor.pose({ rot: (i % 2 ? -6 : 6) * Math.sin(t * Math.PI), sy: 1.05 });
            }, signal);
          }
          actor.pos = origin;
          actor.place();
          actor.pose();
        },
        // A twirl, the paper turning on its edge.
        async (signal) => actor.flag("is-twirling", 760, signal),
        // A look round, wagging its tail.
        async (signal) => {
          el.classList.add("is-wagging");
          try {
            await frames(1300, (t) => actor.look(3.2 * Math.sin(t * Math.PI * 2), -0.8), signal);
          } finally {
            el.classList.remove("is-wagging");
          }
        },
        // A jelly wobble.
        async (signal) => {
          await frames(900, (t) => {
            const d = 1 - t;
            actor.pose({ sx: 1 + 0.1 * d * Math.sin(t * Math.PI * 7), sy: 1 - 0.1 * d * Math.sin(t * Math.PI * 7), rot: 4 * d * Math.sin(t * Math.PI * 5) });
          }, signal);
          actor.pose();
        }
      ];

      // In the hole it is shrunk about its feet to fit, its middle on the hole's.
      actor.holeScale = () => {
        const box = hole()?.getBoundingClientRect();
        return box ? Math.min(1, (box.width * 0.62) / Math.max(actor.size.w, actor.size.h * 0.8)) : 1;
      };
      actor.holeSpot = () => {
        const sheet = front.getBoundingClientRect();
        const box = hole().getBoundingClientRect();
        const unit = actor.size.h / view.h;
        const middle = (view.y + FEET.y) / 2;
        return { x: box.left - sheet.left + box.width / 2, y: box.top - sheet.top + box.height / 2 + (FEET.y - middle) * actor.holeScale() * unit };
      };
      // Out of the hole in one leap, growing to full size on the way down.
      actor.leap = async (target, signal) => {
        const from = { ...actor.pos };
        const k = actor.holeScale();
        const lift = 50 + Math.max(0, from.y - target.y) * 0.25;
        try {
          await frames(160, (t) => actor.pose({ sx: k * (1 + 0.1 * t), sy: k * (1 - 0.14 * t) }), signal);
          await frames(680, (t) => {
            actor.pos = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t - lift * 4 * t * (1 - t) };
            actor.place();
            const grow = k + (1 - k) * Math.min(1, t * 1.5);
            actor.pose({ rot: -16 * Math.sin(t * Math.PI), sx: grow, sy: grow * (1.06 - 0.06 * t) });
            if (t > 0.12) el.classList.remove("is-in-hole");
          }, signal);
          await frames(170, (t) => actor.pose({ sx: 1.1 - 0.1 * t, sy: 0.86 + 0.14 * t }), signal);
          actor.ground = target.y;
        } finally {
          el.classList.remove("is-in-hole");
          actor.pose();
        }
      };
      /*
       * A surprise: from the dark of the hole, only as much as the hole shows,
       * its head comes up, looks one way and the other, ducks once, then it
       * climbs out and leaps (Dan, 25 September 2026).
       */
      actor.pokeOut = async (signal) => {
        const k = actor.holeScale();
        const sheet = front.getBoundingClientRect();
        const box = hole().getBoundingClientRect();
        const radius = (box.width * 50) / 120;
        const middle = { x: box.left - sheet.left + box.width / 2, y: box.top - sheet.top + box.height / 2 };
        const unit = (actor.size.h / view.h) * k;
        const eyesUp = (FEET.y - spec.eyes[0][1] - 4) * unit; // feet to eyes, as drawn in the hole
        const tall = (FEET.y - view.y) * unit;
        const out = actor.holeSpot();
        const hidden = { x: out.x, y: middle.y + radius + tall + 4 };
        const peeking = { x: out.x, y: middle.y + radius * 0.5 + eyesUp };
        // Only what lies inside the hole shows while it climbs.
        const clip = () => {
          const at = el.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
          const [x, y] = at ? [Number(at[1]), Number(at[2])] : [0, 0];
          el.style.clipPath = `circle(${radius.toFixed(1)}px at ${(middle.x - x).toFixed(1)}px ${(middle.y - y).toFixed(1)}px)`;
        };
        const rise = async (from, to, duration) => {
          await frames(duration, (t) => {
            const e = 1 - (1 - t) ** 3;
            actor.pos = { x: from.x, y: from.y + (to.y - from.y) * e };
            actor.place();
            clip();
          }, signal);
        };
        try {
          actor.pos = { ...hidden };
          actor.place();
          clip();
          actor.pose({ sx: k, sy: k });
          el.classList.add("is-in-hole", "is-placed");
          await rise(hidden, peeking, 620);
          actor.look(-3.2, 0.4);
          await wait(420, signal);
          actor.look(3.2, 0.4);
          await wait(420, signal);
          actor.look(0, -1);
          const low = { x: peeking.x, y: peeking.y + eyesUp * 0.6 };
          await rise(peeking, low, 160);
          await rise(low, peeking, 240);
          await wait(360, signal);
          await rise(peeking, out, 320);
        } finally {
          el.style.clipPath = "";
        }
        await actor.leap(actor.homeSpot(), signal);
      };

      actor.start = (task) => {
        actor.life?.abort();
        actor.life = new AbortController();
        task(actor.life.signal).catch((error) => {
          if (error?.name !== "AbortError") throw error;
        });
      };
      actor.stop = () => {
        actor.life?.abort();
        actor.life = null;
        actor.busy = false;
        actor.claimed = false;
        actor.peeking = false;
        if (inspector === actor) {
          inspector = null;
          onVisit(null);
        }
      };
      return actor;
    });

    // The three as a word: centred `centre` of the way across the sheet, each
    // its own width, `gap` units apart.
    const word = (centre, gap) => {
      const unit = actors[0].unit();
      let left = front.clientWidth * centre - (actors.reduce((sum, actor) => sum + actor.spec.width * unit, 0) + gap * unit * (actors.length - 1)) / 2;
      return actors.map((actor) => {
        const x = left + (actor.spec.width * unit) / 2;
        left += actor.spec.width * unit + gap * unit;
        return x;
      });
    };

    /*
     * Personal space (Dan, 25 September 2026): no two stand in each other.
     * Carry one into another and that one hops out of the way and lives where
     * it lands; set one down too close and it shuffles aside itself; a duet
     * or a wander stops short of the others.
     */
    const standing = (actor) => actor.el.classList.contains("is-placed") && !actor.el.classList.contains("is-in-hole");
    const clash = (a, b, at = a.pos, bt = b.spot()) =>
      Math.abs(at.x - bt.x) < a.half() + b.half() + ROOM * a.unit() && at.y - a.tall() < bt.y && bt.y - b.tall() < at.y;
    const fits = (actor, at) =>
      at.x > actor.half() + 4 &&
      at.x < front.clientWidth - actor.half() - 4 &&
      actors.every((other) => other === actor || !standing(other) || !clash(actor, other, at, other.held ? other.pos : other.spot()));
    // The nearest clear place along the ground, looking `away` first if given.
    const clearSpot = (actor, at = { x: actor.pos.x, y: actor.ground }, away = 0) => {
      if (fits(actor, at)) return at;
      const step = 3 * actor.unit();
      const along = (dir) => {
        for (let x = at.x + dir * step; x > 0 && x < front.clientWidth; x += dir * step) if (fits(actor, { x, y: at.y })) return { x, y: at.y };
        return null;
      };
      if (away) return along(away) ?? along(-away) ?? at;
      for (let n = 1; n * step < front.clientWidth; n += 1) {
        for (const dir of [-1, 1]) {
          const spot = { x: at.x + dir * n * step, y: at.y };
          if (fits(actor, spot)) return spot;
        }
      }
      return at;
    };
    const settleAt = (actor, spot) => {
      const sheet = front.getBoundingClientRect();
      actor.home = { x: spot.x / sheet.width, y: spot.y / sheet.height };
    };
    // Out of the way of one being carried: a start, then a hop to `spot`,
    // where it lives from then on.
    const dodge = (actor, from, spot, delay) => {
      actor.stop();
      actor.dest = spot;
      settleAt(actor, spot);
      if (still.matches) {
        actor.pos = spot;
        actor.ground = spot.y;
        actor.place();
        return;
      }
      const away = Math.sign(spot.x - actor.pos.x);
      actor.dodging = true;
      actor.start(async (signal) => {
        actor.busy = true;
        try {
          actor.lookAt(...from.eyesAt());
          await wait(delay, signal);
          await frames(110, (t) => actor.pose({ rot: -away * 6 * t, sx: 1 + 0.08 * t, sy: 1 - 0.12 * t }), signal);
          await actor.hopTo(spot, signal, { height: 14, stride: 110 });
        } finally {
          actor.busy = false;
          actor.dodging = false;
        }
        await live(actor, signal);
      });
    };
    // Carried into the others, one shoves them along: each in its way moves
    // just clear and pushes on any beyond it, like a row shuffling up.
    const crowd = (held) => {
      const others = actors.filter((other) => other !== held && !other.held && standing(other));
      if (!others.some((other) => clash(held, other, held.pos))) return;
      const moves = [];
      for (const dir of [1, -1]) {
        const side = others.filter((other) => (dir > 0 ? other.spot().x >= held.pos.x : other.spot().x < held.pos.x)).sort((a, b) => dir * (a.spot().x - b.spot().x));
        let pusher = held;
        let pusherAt = held.pos;
        for (const other of side) {
          const at = other.spot();
          if (clash(pusher, other, pusherAt, at)) {
            let to = { x: pusherAt.x + dir * (pusher.half() + other.half() + ROOM * other.unit() + 1), y: other.ground };
            // No room this side of the sheet: over to the nearest clear place.
            if (to.x < other.half() + 4 || to.x > front.clientWidth - other.half() - 4) to = clearSpot(other, at, -dir);
            moves.push([other, to]);
            pusherAt = to;
          } else pusherAt = at;
          pusher = other;
        }
      }
      moves.forEach(([other, to], index) => {
        if (other.dodging && Math.abs(other.dest.x - to.x) < 3) return;
        dodge(other, held, to, other.dest && !other.dodging ? 0 : index * 70);
      });
    };

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
      return { x: box.left - sheet.left + (px / 160) * box.width, y: box.top - sheet.top + (py - (lifted ? 7 : 0)) * unit };
    };
    const inView = (thing) => {
      const box = thing.row.getBoundingClientRect();
      return box.top > 0 && box.bottom < window.innerHeight;
    };

    // Hop over to a thing, look at it while it plays, react, come home.
    const inspect = async (actor, thing, signal) => {
      await actor.hopTo(perch(thing), signal);
      const box = thing.art.getBoundingClientRect();
      actor.lookAt(box.left + box.width / 2, box.top + box.height * 0.62);
      onVisit(thing.id);
      try {
        await wait(700, signal);
        await pick(actor.dances.slice(0, 2))(signal);
        actor.lookAt(box.left + box.width / 2, box.top + box.height * 0.62);
        await wait(900, signal);
      } finally {
        onVisit(null);
      }
    };
    // On a phone it keeps to the right-hand edge and leans in beside a thing.
    const peek = async (actor, thing, signal) => {
      const sheet = front.getBoundingClientRect();
      const row = thing.row.getBoundingClientRect();
      actor.peeking = true;
      await actor.hopTo({ x: sheet.width + actor.size.w * 0.1, y: row.top - sheet.top + row.height / 2 + actor.size.h * 0.42 }, signal, { height: 10, stride: 46 });
      const box = thing.art.getBoundingClientRect();
      actor.lookAt(box.left + box.width / 2, box.top + box.height / 2);
      onVisit(thing.id);
      try {
        await frames(420, (t) => actor.pose({ rot: -12 * t }), signal);
        await wait(1500, signal);
        await frames(320, (t) => actor.pose({ rot: -12 * (1 - t) }), signal);
      } finally {
        onVisit(null);
      }
    };

    // Two meet: one hops over, they face each other and bop together.
    const duet = async (actor, partner, signal) => {
      partner.claimed = true;
      try {
        // Beside the partner, a hand's width off, on whichever side has room.
        const side = partner.pos.x > actor.pos.x ? -1 : 1;
        const reach = actor.half() + partner.half() + (ROOM + 4) * actor.unit();
        const spot = [side, -side].map((dir) => ({ x: partner.pos.x + dir * reach, y: partner.ground })).find((at) => fits(actor, at));
        if (!spot) return;
        await actor.hopTo(spot, signal, { stride: wide.matches ? 62 : 36, height: wide.matches ? 18 : 10 });
        actor.lookAt(...partner.eyesAt());
        partner.lookAt(...actor.eyesAt());
        await wait(400, signal);
        await Promise.all([actor.dances[1](signal), wait(140, signal).then(() => partner.dances[1](signal))]);
        await wait(300, signal);
        await actor.hopTo(clearSpot(actor, actor.homeSpot()), signal, { stride: wide.matches ? 62 : 36, height: wide.matches ? 18 : 10 });
      } finally {
        partner.claimed = false;
        partner.pose();
      }
    };

    const idle = (actor) => !actor.busy && !actor.claimed && !actor.held;
    const canWander = () => !userOnThings && !document.hidden && !roomOpen() && !actors.some((actor) => actor.held);

    // Each one's own round of things to do.
    const live = async (actor, signal) => {
      for (;;) {
        await wait(1600 + Math.random() * 2600, signal);
        while (actor.claimed || actor.held) await wait(400, signal);
        if (!canWander()) continue;
        actor.busy = true;
        try {
          const roll = Math.random();
          const others = actors.filter((other) => other !== actor && idle(other) && other.el.classList.contains("is-placed"));
          if (roll < 0.22 && others.length) {
            await duet(actor, pick(others), signal);
          } else if (roll < 0.42 && !inspector) {
            inspector = actor;
            try {
              if (wide.matches) {
                await inspect(actor, pick(things()), signal);
                await actor.hopTo(actor.homeSpot(), signal);
              } else {
                const near = things().filter(inView);
                if (near.length) {
                  await peek(actor, pick(near), signal);
                  await actor.hopTo(actor.homeSpot(), signal, { height: 10, stride: 46 });
                }
              }
            } finally {
              actor.peeking = false;
              inspector = null;
            }
          } else if (roll < 0.55 && wide.matches) {
            // A little wander about home and back, never into another.
            const home = actor.homeSpot();
            const spot = Array.from({ length: 6 }, () => ({ x: home.x + (Math.random() - 0.5) * 160, y: home.y + (Math.random() - 0.5) * 30 })).find((at) => fits(actor, at));
            if (spot) {
              await actor.hopTo(spot, signal);
              await actor.dances[pick([0, 1, 4])](signal);
            }
            await actor.hopTo(clearSpot(actor, home), signal);
          } else {
            await pick(actor.dances)(signal);
          }
          // Never left standing in another.
          if (!fits(actor, { x: actor.pos.x, y: actor.ground })) await actor.hopTo(clearSpot(actor), signal);
        } finally {
          actor.busy = false;
        }
      }
    };
    actors.forEach((actor) => {
      actor.id = actor.spec.id;
    });

    // Now and then, as the heading writes Akibwa, they line up to spell "aki".
    const lineUp = async () => {
      if (!wide.matches || still.matches || roomOpen() || Date.now() - lastLineUp < 25000) return;
      if (!actors.every((actor) => idle(actor) && actor.el.classList.contains("is-placed"))) return;
      lastLineUp = Date.now();
      actors.forEach((actor) => actor.stop());
      const y = actors.reduce((sum, actor) => sum + actor.homeSpot().y, 0) / actors.length;
      const slots = word(...LINE_UP);
      await Promise.all(
        actors.map((actor, index) => {
          actor.busy = true;
          actor.life = new AbortController();
          const { signal } = actor.life;
          return (async () => {
            await wait(index * 160, signal);
            await actor.hopTo({ x: slots[index], y }, signal, { stride: 90 });
            actor.look(0, 1.2);
            await wait(600 + (2 - index) * 160, signal);
            // A bow, one after another.
            await wait(index * 220, signal);
            await frames(420, (t) => actor.pose({ rot: 0, sx: 1 + 0.06 * Math.sin(t * Math.PI), sy: 1 - 0.16 * Math.sin(t * Math.PI) }), signal);
            await wait(900, signal);
            await actor.hopTo(clearSpot(actor, actor.homeSpot()), signal, { stride: 90 });
          })().catch((error) => {
            if (error?.name !== "AbortError") throw error;
          });
        })
      );
      actors.forEach((actor) => {
        actor.busy = false;
        if (!roomOpen()) actor.start((signal) => live(actor, signal));
      });
    };

    // Each starts at home (or, the first time, one by one out of the hole).
    const begin = (first) => {
      actors.forEach((actor, index) => {
        actor.measure();
        actor.start(async (signal) => {
          if (first && !still.matches && hole()) {
            actor.busy = true;
            try {
              if (index === 0) {
                // The a watches the five things drawn in from the hole.
                actor.pos = actor.holeSpot();
                actor.place();
                actor.pose({ sx: actor.holeScale(), sy: actor.holeScale() });
                actor.el.classList.add("is-in-hole", "is-placed");
                await wait(2500, signal);
                await actor.leap(actor.homeSpot(), signal);
              } else {
                // A while after the a has gone, as a surprise.
                await wait(index === 1 ? 5200 : 8600, signal);
                await actor.pokeOut(signal);
              }
            } finally {
              actor.busy = false;
            }
            await wait(900, signal);
          } else {
            actor.el.classList.remove("is-in-hole");
            actor.pos = actor.homeSpot();
            actor.ground = actor.pos.y;
            actor.place();
            actor.pose();
            actor.el.classList.add("is-placed");
            if (still.matches) return;
          }
          await live(actor, signal);
        });
      });
    };
    const stopAll = () => actors.forEach((actor) => actor.stop());

    // Picked up, one dangles and swings with the pointer; set down, it stays.
    const handlers = actors.map((actor) => {
      const { el } = actor;
      const grab = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        actor.stop();
        el.classList.remove("is-in-hole");
        actor.pose();
        el.setPointerCapture(event.pointerId);
        const sheet = front.getBoundingClientRect();
        const held = { id: event.pointerId, dx: actor.pos.x - (event.clientX - sheet.left), dy: actor.pos.y - (event.clientY - sheet.top), startX: event.clientX, startY: event.clientY, moved: false, rot: 0, spin: 0, lastX: event.clientX, frame: 0 };
        actor.held = held;
        el.classList.add("is-held");
        let tick = 0;
        const swing = () => {
          if (actor.held !== held) return;
          held.spin = (held.spin + -held.rot * 0.12) * 0.82;
          held.rot += held.spin;
          actor.pose({ rot: held.rot, sx: 1.04, sy: 1.04 });
          tick += 1;
          if (held.moved && tick % 4 === 0) crowd(actor);
          held.frame = requestAnimationFrame(swing);
        };
        held.frame = requestAnimationFrame(swing);
      };
      const drag = (event) => {
        const held = actor.held;
        if (!held || event.pointerId !== held.id) return;
        if (Math.hypot(event.clientX - held.startX, event.clientY - held.startY) > 5) held.moved = true;
        if (!held.moved) return;
        const sheet = front.getBoundingClientRect();
        actor.pos = {
          x: Math.max(actor.size.w * 0.4, Math.min(sheet.width - actor.size.w * 0.4, event.clientX - sheet.left + held.dx)),
          y: Math.max(actor.size.h, Math.min(sheet.height, event.clientY - sheet.top + held.dy))
        };
        actor.place();
        if (!still.matches) held.spin += Math.max(-6, Math.min(6, -(event.clientX - held.lastX) * 0.35));
        held.lastX = event.clientX;
        actor.look(0, 2.4);
      };
      const drop = async (event) => {
        const held = actor.held;
        if (!held || event.pointerId !== held.id) return;
        cancelAnimationFrame(held.frame);
        actor.held = null;
        el.classList.remove("is-held");
        el.releasePointerCapture?.(event.pointerId);
        actor.pose();
        let spot = null;
        if (held.moved) {
          actor.ground = actor.pos.y;
          spot = clearSpot(actor);
          settleAt(actor, spot);
        }
        const shuffle = spot && (spot.x !== actor.pos.x || spot.y !== actor.pos.y);
        if (still.matches) {
          if (shuffle) {
            actor.pos = spot;
            actor.place();
          }
          return;
        }
        actor.start(async (signal) => {
          actor.busy = true;
          try {
            if (held.moved) await frames(260, (t) => actor.pose({ sx: 1 + 0.12 * Math.sin(t * Math.PI), sy: 1 - 0.14 * Math.sin(t * Math.PI) }), signal);
            else await actor.flag("is-twirling", 760, signal);
            actor.pose();
            if (shuffle) await actor.hopTo(spot, signal, { height: 12, stride: 90 });
          } finally {
            actor.busy = false;
          }
          await live(actor, signal);
        });
      };
      el.addEventListener("pointerdown", grab);
      el.addEventListener("pointermove", drag);
      el.addEventListener("pointerup", drop);
      el.addEventListener("pointercancel", drop);
      return () => {
        el.removeEventListener("pointerdown", grab);
        el.removeEventListener("pointermove", drag);
        el.removeEventListener("pointerup", drop);
        el.removeEventListener("pointercancel", drop);
      };
    });

    // Their eyes follow the pointer while they are at rest.
    const follow = (event) => {
      if (still.matches) return;
      cancelAnimationFrame(gazeFrame);
      gazeFrame = requestAnimationFrame(() => actors.forEach((actor) => idle(actor) && actor.lookAt(event.clientX, event.clientY)));
    };
    const row = front.querySelector(".things");
    const onThings = () => {
      userOnThings = true;
    };
    const offThings = () => {
      userOnThings = false;
    };

    const named = new MutationObserver(() => {
      if (doc.dataset.sky === "night") lineUp();
    });
    named.observe(doc, { attributes: true, attributeFilter: ["data-sky"] });

    // Rooms hide the front page: they rest while one is open.
    const rooms = new MutationObserver(() => {
      if (roomOpen()) stopAll();
      else if (actors.every((actor) => !actor.life && !actor.held)) begin(false);
    });
    rooms.observe(doc, { attributes: true, attributeFilter: ["data-room"] });

    let settle = 0;
    const resize = () => {
      if (actors.some((actor) => actor.held)) return;
      clearTimeout(settle);
      stopAll();
      actors.forEach((actor) => {
        actor.measure();
        actor.el.classList.remove("is-in-hole");
        actor.pos = actor.homeSpot();
        actor.ground = actor.pos.y;
        actor.place();
        actor.pose();
        actor.el.classList.add("is-placed");
      });
      settle = setTimeout(() => {
        if (!roomOpen()) begin(false);
      }, 300);
    };

    window.addEventListener("pointermove", follow, { passive: true });
    window.addEventListener("resize", resize);
    row?.addEventListener("pointerenter", onThings);
    row?.addEventListener("pointerleave", offThings);
    if (!roomOpen()) begin(!doc.hasAttribute("data-drawn"));
    return () => {
      stopAll();
      clearTimeout(settle);
      named.disconnect();
      rooms.disconnect();
      cancelAnimationFrame(gazeFrame);
      handlers.forEach((remove) => remove());
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("resize", resize);
      row?.removeEventListener("pointerenter", onThings);
      row?.removeEventListener("pointerleave", offThings);
    };
  }, [onVisit]);

  return CAST.map((spec, index) => (
    <div
      key={spec.id}
      className={`mascot is-${spec.id}`}
      ref={(element) => {
        roots.current[index] = element;
      }}
      style={{ "--span": spec.view.w / 116, aspectRatio: `${spec.view.w} / ${spec.view.h}` }}
      aria-hidden="true"
    >
      <svg className="mascot-art" viewBox={`${spec.view.x} ${spec.view.y} ${spec.view.w} ${spec.view.h}`} focusable="false">
        <ellipse className="mascot-shadow" cx={spec.shadow[0]} cy="103.6" rx={spec.shadow[1]} ry="3.4" />
        <g
          ref={(element) => {
            bodies.current[index] = element;
          }}
        >
          <g className="mascot-paper">
            <Art id={spec.id} />
            <g
              ref={(element) => {
                gazes.current[index] = element;
              }}
            >
              <g className="mascot-blink">
                {spec.eyes.map(([x, y]) => (
                  <rect key={x} x={x} y={y} width={EYE.w} height={EYE.h} rx={EYE.rx} />
                ))}
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  ));
}
