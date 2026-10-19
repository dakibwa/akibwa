"use client";

import { useEffect, useRef } from "react";
import { LETTERS } from "./cast-paths";
import { PAPER_EVENT } from "./night-switch";

/*
 * The Akibwa a lives directly on the paper. It rests beside the introduction,
 * follows the pointer, explores the five things and can be picked up.
 * A click makes it twirl; a drop becomes its new home. It breathes, blinks,
 * stretches and spin-jumps (above all when its name, Akibwa, is written in),
 * and now and then stops to think, three dots bobbing in a paper bubble over
 * its head (from Kevin Ngo's hand-drawn UI animations, October 2026). A mouse
 * close by draws a lean, one resting on the paper draws a visit, one resting
 * on the a is a pet and one swooshing past makes it duck; when the paper turns
 * it looks round and bops. Rooms pause it and reduced motion leaves it still.
 * The original drawing keeps its proportions, outlined in ink.
 */
const EYE = { w: 4.8, h: 6.9, rx: 1.8 };
const CAST = [
  { id: "a", view: { x: 1, y: 13, w: 99, h: 97 }, eyes: [[42.47, 27.56], [52.07, 27.56]], cheeks: [[39.2, 38.4], [60.6, 38.4]], shadow: [53.5, 36], width: 88.8, top: 18.7 }
];
const FEET = { x: 50, y: 104 };
// Where one perches on each thing, in the things' 160 × 140 drawing, before
// the hover lift of 7.
const PERCH = {
  music: [80, 55, true],
  features: [80, 29, true],
  websites: [63, 54, true],
  career: [26, 128, false],
  trek: [80, 31, true]
};

// The thought bubble, in a 120 × 84 box: a lumpy paper cloud with two puffs
// trailing down to the a's head at its lower right.
const THOUGHT = "M20 12C28 3 46 2 56 8C66 1 86 4 90 17C100 22 100 39 89 45C86 56 68 60 58 54C48 61 28 59 24 50C10 51 4 39 10 31C3 23 10 11 20 12Z";
const PUFFS = [[95, 63, 6.4], [107, 76, 3.8]];
const DOTS = [34, 50, 66];

const aborted = () => new DOMException("aborted", "AbortError");
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const smooth = (t) => t * t * (3 - 2 * t);

// A letter: its body and tail, each outlined in ink over an ink edge like cut
// card. The tail wags about its joint.
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
  const leans = useRef([]);
  const bodies = useRef([]);
  const gazes = useRef([]);

  useEffect(() => {
    const front = roots.current[0].parentElement;
    const doc = document.documentElement;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const wide = matchMedia("(min-width: 720px)");
    // Only a mouse can come near it, pet it, startle it or be followed.
    const mouse = matchMedia("(hover: hover) and (pointer: fine)");
    let userOnThings = false;
    let gazeFrame = 0;
    // Where the pointer is, since when, how fast it went and whether it rests
    // on bare paper rather than on something to click.
    let pointer = null;
    let startled = 0;

    const roomOpen = () => doc.dataset.room && doc.dataset.room !== "index";

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
      const leaning = leans.current[index];
      const body = bodies.current[index];
      const gaze = gazes.current[index];
      const { view } = spec;
      const actor = { spec, el, pos: { x: 0, y: 0 }, ground: 0, dest: null, size: { w: 100, h: 100 }, home: null, busy: false, held: null, peeking: false, life: null, blinks: 0, wags: 0 };

      actor.measure = () => {
        actor.size = { w: el.offsetWidth, h: el.offsetHeight };
      };
      // Pixels to a unit of the drawing and its half width.
      actor.unit = () => actor.size.w / view.w;
      actor.half = () => (spec.width / 2) * actor.unit();
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
      actor.homeSpot = () => {
        const sheet = front.getBoundingClientRect();
        if (actor.home) return { x: actor.home.x * sheet.width, y: actor.home.y * sheet.height };
        const intro = front.querySelector(".front-intro").getBoundingClientRect();
        const gutter = intro.left - sheet.left;
        // At the right of the contact links, with no separate stage or portal.
        return { x: sheet.width - gutter - actor.half() - 8, y: intro.bottom - sheet.top - 6 };
      };
      actor.flag = async (name, ms, signal) => {
        el.classList.add(name);
        try {
          await wait(ms, signal);
        } finally {
          el.classList.remove(name);
        }
      };

      // A lean on its feet, which the stylesheet springs to; none sets it
      // upright again.
      actor.lean = (rot = 0, stretch = 1) => {
        leaning.style.transform = rot || stretch !== 1 ? `rotate(${rot.toFixed(2)}deg) scale(${(2 - stretch).toFixed(3)}, ${stretch.toFixed(3)})` : "";
      };
      // Curious about a pointer close by: it leans towards it, reaching up
      // when it is above.
      actor.leanTowards = (x, y, box = el.getBoundingClientRect()) => {
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height * 0.45);
        const near = 1 - Math.min(1, Math.hypot(dx, dy) / 300);
        if (!near) return actor.lean();
        const reach = Math.max(0, -dy) / (Math.hypot(dx, dy) || 1);
        actor.lean(Math.max(-1, Math.min(1, dx / 160)) * 9 * near, 1 + 0.07 * near * reach);
      };
      // The follow-through after a landing or a fright: a squash and stretch
      // that rings down like a spring.
      actor.wobble = (signal, strength = 1) =>
        frames(460, (t) => {
          const swing = strength * Math.exp(-5.5 * t) * Math.sin(t * 19);
          actor.pose({ sx: 1 + 0.07 * swing, sy: 1 - 0.08 * swing });
        }, signal).then(() => actor.pose());
      actor.wag = (ms = 700) => {
        clearTimeout(actor.wags);
        el.classList.add("is-wagging");
        actor.wags = setTimeout(() => el.classList.remove("is-wagging"), ms);
      };
      // Blinks come now and then, one at a time or two together.
      actor.blink = () => {
        clearTimeout(actor.blinks);
        actor.blinks = setTimeout(() => {
          if (!actor.held && !document.hidden) {
            el.classList.remove("is-blinking");
            requestAnimationFrame(() => el.classList.add("is-blinking"));
            if (Math.random() < 0.28) {
              setTimeout(() => {
                el.classList.remove("is-blinking");
                requestAnimationFrame(() => el.classList.add("is-blinking"));
              }, 260);
            }
          }
          actor.blink();
        }, 1800 + Math.random() * 4200);
      };
      actor.stopBlinking = () => {
        clearTimeout(actor.blinks);
        el.classList.remove("is-blinking");
      };

      // A hop-walk: crouch, spring along an arc, land with a squash, and at
      // the end of the trip a wobble and a wag of the tail.
      actor.hopTo = async (target, signal, options) => {
        actor.dest = target;
        const far = Math.hypot(target.x - actor.pos.x, target.y - actor.pos.y) > 4;
        try {
          await hop(target, signal, options);
        } finally {
          // A hop cut short leaves a newer destination alone.
          if (actor.dest === target) actor.dest = null;
        }
        if (far) {
          actor.wag(620);
          await actor.wobble(signal, 0.8);
        }
      };
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
        },
        // A think.
        async (signal) => actor.think(signal),
        // A long stretch with its eyes shut, then a shake.
        async (signal) => {
          el.classList.add("is-sleepy");
          try {
            await frames(760, (t) => {
              const reach = smooth(t);
              actor.pose({ sx: 1 - 0.08 * reach, sy: 1 + 0.15 * reach, rot: 3 * Math.sin(t * Math.PI) });
            }, signal);
            await wait(420, signal);
            await frames(160, (t) => actor.pose({ sx: 0.92 + 0.18 * t, sy: 1.15 - 0.27 * t }), signal);
          } finally {
            el.classList.remove("is-sleepy");
          }
          await actor.wobble(signal, 1.2);
        },
        // A spin jump.
        async (signal) => actor.leap(signal)
      ];

      // A deep crouch, a high leap turning once on its edge, and a squashed
      // landing that rings down.
      actor.leap = async (signal) => {
        const origin = { ...actor.pos };
        await frames(140, (t) => actor.pose({ sx: 1 + 0.12 * t, sy: 1 - 0.16 * t }), signal);
        el.classList.add("is-twirling");
        try {
          await frames(760, (t) => {
            actor.pos = { x: origin.x, y: origin.y - 34 * 4 * t * (1 - t) };
            actor.place();
            actor.pose({ sx: 0.95, sy: 1.08 - 0.08 * t });
          }, signal);
        } finally {
          el.classList.remove("is-twirling");
          actor.pos = origin;
          actor.place();
        }
        await frames(110, (t) => actor.pose({ sx: 1.12 - 0.12 * t, sy: 0.84 + 0.16 * t }), signal);
        actor.wag(760);
        await actor.wobble(signal, 1.1);
      };

      // Three dots bob in a bubble over its head while it leans towards it,
      // eyes turned up. Near the sheet's left edge the bubble rises on its
      // right instead.
      actor.think = async (signal) => {
        const side = actor.pos.x < front.clientWidth * 0.4 ? 1 : -1;
        el.classList.toggle("thinks-right", side > 0);
        el.classList.add("is-thinking");
        try {
          actor.look(side * 1.6, -2.6);
          await frames(2800, (t) => {
            const lean = Math.min(1, t * 5) * Math.min(1, (1 - t) * 6);
            actor.pose({ rot: side * 5 * lean, sy: 1 + 0.018 * Math.sin(t * Math.PI * 8) });
          }, signal);
        } finally {
          el.classList.remove("is-thinking");
          actor.pose();
        }
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
        actor.peeking = false;
        actor.lean();
        onVisit(null);
      };
      return actor;
    });

    const fits = (actor, at) =>
      at.x > actor.half() + 4 && at.x < front.clientWidth - actor.half() - 4;
    const clearSpot = (actor, at = { x: actor.pos.x, y: actor.ground }) => ({
      x: Math.max(actor.half() + 5, Math.min(front.clientWidth - actor.half() - 5, at.x)),
      y: at.y
    });
    const settleAt = (actor, spot) => {
      const sheet = front.getBoundingClientRect();
      actor.home = { x: spot.x / sheet.width, y: spot.y / sheet.height };
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

    const idle = (actor) => !actor.busy && !actor.held;
    const canWander = () => !userOnThings && !document.hidden && !roomOpen() && !actors.some((actor) => actor.held);

    // A mouse that has rested a moment on bare paper, and the spot beside it
    // where the a would stand to look at it, if that is a trip worth making.
    const restingPointer = (actor) => {
      if (!mouse.matches || !wide.matches || !pointer?.free || performance.now() - pointer.since < 900) return null;
      const sheet = front.getBoundingClientRect();
      const x = pointer.x - sheet.left;
      const y = pointer.y - sheet.top;
      if (x < 0 || y < 0 || x > sheet.width || y > sheet.height) return null;
      const side = x > actor.pos.x ? -1 : 1;
      const spot = clearSpot(actor, { x: x + side * (actor.half() + 30), y: Math.max(actor.size.h + 4, Math.min(sheet.height - 2, y + actor.size.h * 0.5)) });
      return Math.hypot(spot.x - actor.pos.x, spot.y - actor.pos.y) > 80 ? spot : null;
    };
    // The cursor follower from Kevin Ngo's animations: it hops over to the
    // resting pointer, bops hello, watches it a while with its head on one
    // side and goes home.
    const approach = async (actor, spot, signal) => {
      await actor.hopTo(spot, signal);
      if (pointer) actor.lookAt(pointer.x, pointer.y);
      await actor.dances[1](signal);
      const until = performance.now() + 1800 + Math.random() * 1400;
      while (performance.now() < until) {
        if (pointer) {
          actor.lookAt(pointer.x, pointer.y);
          actor.leanTowards(pointer.x, pointer.y);
        }
        await wait(90, signal);
      }
      actor.lean();
      await actor.hopTo(actor.homeSpot(), signal);
    };

    // Keep the original lively rhythm, now with just the a on the paper.
    const live = async (actor, signal) => {
      for (;;) {
        await wait(1600 + Math.random() * 2600, signal);
        while (actor.held) await wait(400, signal);
        if (!canWander()) continue;
        actor.busy = true;
        actor.lean();
        try {
          const roll = Math.random();
          const resting = restingPointer(actor);
          if (resting && Math.random() < 0.55) {
            await approach(actor, resting, signal);
          } else if (roll < 0.42) {
            try {
              // Sometimes it thinks it over before it goes.
              if (Math.random() < 0.45) await actor.think(signal);
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
            }
          } else if (roll < 0.55 && wide.matches) {
            // A little wander about home and back, inside the sheet.
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
          // Keep a dropped or wandering character inside the sheet.
          if (!fits(actor, { x: actor.pos.x, y: actor.ground })) await actor.hopTo(clearSpot(actor), signal);
        } finally {
          actor.busy = false;
        }
      }
    };
    // Already at home when the page opens; no entrance to wait through.
    const begin = () => {
      actors.forEach((actor) => {
        actor.measure();
        actor.pos = actor.homeSpot();
        actor.ground = actor.pos.y;
        actor.place();
        actor.pose();
        actor.el.classList.add("is-placed");
        if (!still.matches) {
          actor.start((signal) => live(actor, signal));
          actor.blink();
        }
      });
    };
    const stopAll = () =>
      actors.forEach((actor) => {
        actor.stop();
        actor.stopBlinking();
      });

    // Picked up, one dangles and swings with the pointer; set down, it stays.
    const handlers = actors.map((actor) => {
      const { el } = actor;
      const grab = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        actor.stop();
        actor.pose();
        el.classList.remove("is-happy");
        el.setPointerCapture(event.pointerId);
        const sheet = front.getBoundingClientRect();
        const held = { id: event.pointerId, dx: actor.pos.x - (event.clientX - sheet.left), dy: actor.pos.y - (event.clientY - sheet.top), startX: event.clientX, startY: event.clientY, moved: false, rot: 0, spin: 0, lastX: event.clientX, frame: 0 };
        actor.held = held;
        el.classList.add("is-held");
        const swing = () => {
          if (actor.held !== held) return;
          held.spin = (held.spin + -held.rot * 0.12) * 0.82;
          held.rot += held.spin;
          actor.pose({ rot: held.rot, sx: 1.04, sy: 1.04 });
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
      // Under a resting mouse it is petted: its eyes close happily, its
      // cheeks colour, its tail wags and it gives a little shiver of joy.
      const pet = (event) => {
        if (event.pointerType !== "mouse" || actor.held || still.matches) return;
        el.classList.add("is-happy");
        actor.wag(1100);
        if (!idle(actor) || !actor.life) return;
        actor.start(async (signal) => {
          actor.busy = true;
          try {
            await actor.wobble(signal, 0.9);
          } finally {
            actor.busy = false;
          }
          await live(actor, signal);
        });
      };
      const unpet = () => el.classList.remove("is-happy");
      el.addEventListener("pointerdown", grab);
      el.addEventListener("pointermove", drag);
      el.addEventListener("pointerup", drop);
      el.addEventListener("pointercancel", drop);
      el.addEventListener("pointerenter", pet);
      el.addEventListener("pointerleave", unpet);
      return () => {
        el.removeEventListener("pointerdown", grab);
        el.removeEventListener("pointermove", drag);
        el.removeEventListener("pointerup", drop);
        el.removeEventListener("pointercancel", drop);
        el.removeEventListener("pointerenter", pet);
        el.removeEventListener("pointerleave", unpet);
      };
    });

    // A pointer swooshing past makes a resting a duck, eyes wide, and wobble
    // back up.
    const startle = (actor) => {
      startled = performance.now();
      actor.start(async (signal) => {
        actor.busy = true;
        actor.lean();
        actor.el.classList.add("is-surprised");
        try {
          await frames(110, (t) => actor.pose({ sx: 1 + 0.14 * t, sy: 1 - 0.2 * t }), signal);
          await actor.wobble(signal, 1.5);
        } finally {
          actor.el.classList.remove("is-surprised");
          actor.busy = false;
        }
        await live(actor, signal);
      });
    };

    // At rest its eyes follow the pointer, and a mouse close by draws a lean.
    const follow = (event) => {
      if (still.matches) return;
      const now = performance.now();
      const moved = pointer ? Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) : Infinity;
      const speed = pointer ? moved / Math.max(8, now - pointer.at) : 0;
      const target = event.target instanceof Element ? event.target : null;
      pointer = {
        x: event.clientX,
        y: event.clientY,
        at: now,
        since: moved > 4 ? now : pointer.since,
        free: !target?.closest("a, button, input, .mascot, .things, .bar")
      };
      cancelAnimationFrame(gazeFrame);
      gazeFrame = requestAnimationFrame(() => actors.forEach((actor) => {
        if (!idle(actor)) return;
        const box = actor.el.getBoundingClientRect();
        actor.lookAt(event.clientX, event.clientY);
        if (!mouse.matches) return;
        actor.leanTowards(event.clientX, event.clientY, box);
        const near = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2)) < box.width * 1.3;
        if (near && speed > 2.4 && now - startled > 1800 && actor.life && !actor.el.classList.contains("is-happy")) startle(actor);
      }));
    };
    // A pointer that leaves the page leaves it upright.
    const away = () => {
      pointer = null;
      actors.forEach((actor) => idle(actor) && actor.lean());
    };
    const row = front.querySelector(".things");
    const onThings = () => {
      userOnThings = true;
    };
    const offThings = () => {
      userOnThings = false;
    };

    // When the paper turns, a resting a looks round at the switch and bops.
    const turned = (event) => {
      const actor = actors[0];
      if (still.matches || roomOpen() || !actor.life || !idle(actor)) return;
      const { x, y } = event.detail ?? {};
      actor.start(async (signal) => {
        actor.busy = true;
        try {
          if (Number.isFinite(x) && Number.isFinite(y)) actor.lookAt(x, y);
          await actor.flag("is-surprised", 380, signal);
          await actor.dances[1](signal);
        } finally {
          actor.busy = false;
        }
        await live(actor, signal);
      });
    };

    // When its own name, Akibwa, is written in, a resting a turns to watch
    // and leaps for joy.
    const name = front.querySelector(".name");
    const named = new MutationObserver(() => {
      const actor = actors[0];
      if (name.dataset.name !== "akibwa" || name.dataset.phase !== "write") return;
      if (still.matches || roomOpen() || !actor.life || !idle(actor) || Math.random() > 0.6) return;
      actor.start(async (signal) => {
        actor.busy = true;
        actor.lean();
        try {
          const box = name.getBoundingClientRect();
          actor.lookAt(box.left + box.width / 2, box.top + box.height / 2);
          await wait(420, signal);
          await actor.leap(signal);
        } finally {
          actor.busy = false;
        }
        await live(actor, signal);
      });
    });
    if (name) named.observe(name, { attributes: true, attributeFilter: ["data-name", "data-phase"] });

    // Rooms hide the front page: they rest while one is open.
    const rooms = new MutationObserver(() => {
      if (roomOpen()) stopAll();
      else if (actors.every((actor) => !actor.life && !actor.held)) begin();
    });
    rooms.observe(doc, { attributes: true, attributeFilter: ["data-room"] });

    let settle = 0;
    const resize = () => {
      if (actors.some((actor) => actor.held)) return;
      clearTimeout(settle);
      stopAll();
      actors.forEach((actor) => {
        actor.measure();
        actor.pos = actor.homeSpot();
        actor.ground = actor.pos.y;
        actor.place();
        actor.pose();
        actor.el.classList.add("is-placed");
      });
      settle = setTimeout(() => {
        if (!roomOpen()) begin();
      }, 300);
    };

    window.addEventListener("pointermove", follow, { passive: true });
    doc.addEventListener("pointerleave", away);
    window.addEventListener(PAPER_EVENT, turned);
    window.addEventListener("resize", resize);
    still.addEventListener("change", resize);
    row?.addEventListener("pointerenter", onThings);
    row?.addEventListener("pointerleave", offThings);
    if (!roomOpen()) begin();
    return () => {
      stopAll();
      actors.forEach((actor) => clearTimeout(actor.wags));
      clearTimeout(settle);
      rooms.disconnect();
      named.disconnect();
      cancelAnimationFrame(gazeFrame);
      handlers.forEach((remove) => remove());
      window.removeEventListener("pointermove", follow);
      doc.removeEventListener("pointerleave", away);
      window.removeEventListener(PAPER_EVENT, turned);
      window.removeEventListener("resize", resize);
      still.removeEventListener("change", resize);
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
        {/* It leans towards a nearby pointer on its feet, springing there. */}
        <g
          className="mascot-lean"
          ref={(element) => {
            leans.current[index] = element;
          }}
        >
          <g
            ref={(element) => {
              bodies.current[index] = element;
            }}
          >
            <g className="mascot-paper">
              <Art id={spec.id} />
              <g className="mascot-cheeks">
                {spec.cheeks.map(([x, y]) => (
                  <ellipse key={x} cx={x} cy={y} rx="3.6" ry="2.2" />
                ))}
              </g>
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
        </g>
      </svg>
      {/* Paper over a darker edge, like the a: the small puff pops up first,
          then the larger, then the cloud with its dots. */}
      <svg className="mascot-thought" viewBox="0 0 120 84" focusable="false">
        {PUFFS.map(([cx, cy, r], index) => (
          <g key={cx} className="thought-puff" style={{ "--k": PUFFS.length - 1 - index }}>
            <circle className="thought-edge" cx={cx + 1.2} cy={cy + 1.6} r={r} />
            <circle className="thought-paper" cx={cx} cy={cy} r={r} />
          </g>
        ))}
        <g className="thought-cloud" style={{ "--k": PUFFS.length }}>
          <g className="thought-float">
            <path className="thought-edge" d={THOUGHT} transform="translate(1.6 2.2)" />
            <path className="thought-paper" d={THOUGHT} />
            {DOTS.map((cx, index) => (
              <circle key={cx} className="thought-dot" cx={cx} cy="31" r="4.4" style={{ "--k": index }} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  ));
}
