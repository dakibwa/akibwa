"use client";

import { useEffect, useRef } from "react";
import { LETTERS } from "./cast-paths";

/*
 * The Akibwa a lives directly on the paper. It rests beside the introduction,
 * follows the pointer, occasionally explores a thing and can be picked up.
 * A click makes it twirl; a drop becomes its new home. Rooms pause it and
 * reduced motion leaves it still. The original drawing keeps its proportions.
 */
const EYE = { w: 4.8, h: 6.9, rx: 1.8 };
const CAST = [
  { id: "a", view: { x: 1, y: 13, w: 99, h: 97 }, eyes: [[42.47, 27.56], [52.07, 27.56]], shadow: [53.5, 36], width: 88.8, top: 18.7 }
];
const FEET = { x: 50, y: 104 };
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
    let gazeFrame = 0;

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
      const body = bodies.current[index];
      const gaze = gazes.current[index];
      const { view } = spec;
      const actor = { spec, el, pos: { x: 0, y: 0 }, ground: 0, dest: null, size: { w: 100, h: 100 }, home: null, busy: false, held: null, peeking: false, life: null };

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

    // Leave time to read between little moments of movement.
    const live = async (actor, signal) => {
      for (;;) {
        await wait(6000 + Math.random() * 6000, signal);
        while (actor.held) await wait(400, signal);
        if (!canWander()) continue;
        actor.busy = true;
        try {
          const roll = Math.random();
          if (roll < 0.24) {
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
            }
          } else if (roll < 0.4 && wide.matches) {
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
        if (!still.matches) actor.start((signal) => live(actor, signal));
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
        actor.pose();
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
    window.addEventListener("resize", resize);
    still.addEventListener("change", resize);
    row?.addEventListener("pointerenter", onThings);
    row?.addEventListener("pointerleave", offThings);
    if (!roomOpen()) begin();
    return () => {
      stopAll();
      clearTimeout(settle);
      rooms.disconnect();
      cancelAnimationFrame(gazeFrame);
      handlers.forEach((remove) => remove());
      window.removeEventListener("pointermove", follow);
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
