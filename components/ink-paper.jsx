"use client";

import { useEffect, useRef } from "react";

/* Ink on the paper — a prototype, off by default and mounted only when the
   URL carries ?ink.

   The cursor leaves pigment that bleeds into the page ground and settles as
   a stain before fading, after the manner of vgpu's "ink on paper" lab demo:
   composited by absorption rather than emission, so the ink darkens the
   paper the way real pigment does. This implementation is self-contained
   WGSL — two fields per texel (flowing ink and settled stain), a
   noise-feathered diffusion pass, and a render pass that multiplies the
   paper down. Half resolution, and the loop parks itself once the ink has
   dried, so a still page costs nothing.

   Pigment follows the rail palette, one hue per stroke. */

const PALETTE = [
  [27, 148, 125],
  [203, 66, 94],
  [224, 122, 26],
  [94, 142, 103],
  [115, 112, 255],
  [0, 154, 205]
];

const SIM = /* wgsl */ `
struct Params {
  size: vec2f,
  dt: f32,
  time: f32,
  brush: vec4f,      // xy, radius, strength
  pigment: vec4f,    // rgb, unused
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var dst: texture_storage_2d<rgba16float, write>;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let xy = vec2i(gid.xy);
  if (f32(xy.x) >= P.size.x || f32(xy.y) >= P.size.y) { return; }

  /* Feathered diffusion: the kernel leans with a slow noise field, which is
     what makes the edge bleed like fibre rather than blur like glass. */
  let n = noise(vec2f(xy) * 0.035 + P.time * 0.05);
  let lean = vec2f(cos(n * 6.28318), sin(n * 6.28318)) * 0.85;

  var flow = 0.0;
  var pig = vec2f(0.0);
  var wsum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let o = vec2f(f32(dx), f32(dy));
      let c = textureLoad(src, clamp(xy + vec2i(dx, dy), vec2i(0), vec2i(P.size) - 1), 0);
      var w = select(0.11, 0.16, dx == 0 && dy == 0);
      w += 0.05 * max(0.0, dot(normalize(o + vec2f(1e-4)), lean));
      flow += c.r * w;
      pig += c.gb * (c.r + 0.001) * w;
      wsum += w;
    }
  }
  flow /= wsum;
  let here = textureLoad(src, xy, 0);
  pig = pig / max(flow * wsum, 0.001);

  /* Absorption: flowing ink settles into the paper and dries there. The
     settled stain lives in a long tail before it fades. */
  var settled = here.a;
  let transfer = flow * 0.016;
  settled = min(1.0, settled + transfer * 2.2);
  flow = (flow - transfer) * 0.988;
  settled *= 0.9975;

  /* The brush lays fresh ink along the pointer's path. */
  let d = distance(vec2f(xy), P.brush.xy);
  if (P.brush.z > 0.0 && d < P.brush.z) {
    let k = P.brush.w * smoothstep(P.brush.z, 0.0, d);
    flow = min(1.4, flow + k);
    pig = mix(pig, P.pigment.rg, clamp(k * 3.0, 0.0, 1.0));
  }

  /* pack: r = flowing ink, gb = pigment red and green, a = settled stain.
     Pigment blue is reconstructed in the draw pass, so the two never fight. */
  textureStore(dst, xy, vec4f(flow, pig, settled));
}
`;

const DRAW = /* wgsl */ `
struct Params {
  size: vec2f,
  dt: f32,
  time: f32,
  brush: vec4f,
  pigment: vec4f,
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var field: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(3.0, 1.0), vec2f(-1.0, 1.0));
  var out: VSOut;
  out.pos = vec4f(p[i], 0.0, 1.0);
  out.uv = p[i] * vec2f(0.5, -0.5) + 0.5;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let c = textureSample(field, samp, in.uv);
  let flow = c.r;
  let settled = c.a;
  /* Reconstruct pigment; blue is one minus the stored pair's reach. */
  let pig = vec3f(c.g, c.b, clamp(1.0 - c.g - c.b * 0.5, 0.0, 1.0));
  /* Absorption, not emission: ink can only darken the paper. Premultiplied,
     so empty texels contribute nothing at all. */
  let density = clamp(flow * 0.55 + settled * 0.34, 0.0, 1.0);
  let a = density * 0.9;
  let stain = mix(vec3f(1.0), pig * 0.72 + 0.06, min(1.0, density * 1.35));
  return vec4f(stain * a, a);
}
`;

export function InkPaper() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.gpu) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let dead = false;
    let raf = 0;
    /* The loop parks once the ink has dried; a pointer move wakes it. */
    let wetUntil = 0;
    const pointer = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, down: 0, stroke: 0 };

    (async () => {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter || dead) return;
      const device = await adapter.requestDevice();
      if (dead) return;
      device.addEventListener?.("uncapturederror", (e) => {
        console.error("[ink]", e.error?.message ?? e.error);
      });

      const ctx = canvas.getContext("webgpu");
      const format = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: "premultiplied" });

      const scale = 0.5;
      const W = Math.max(2, Math.floor(innerWidth * scale));
      const H = Math.max(2, Math.floor(innerHeight * scale));
      canvas.width = W * 2;
      canvas.height = H * 2;

      const texDesc = {
        size: [W, H],
        format: "rgba16float",
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST
      };
      const texA = device.createTexture(texDesc);
      const texB = device.createTexture(texDesc);

      const uni = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

      const simModule = device.createShaderModule({ code: SIM });
      const simPipe = device.createComputePipeline({
        layout: "auto",
        compute: { module: simModule, entryPoint: "main" }
      });

      const drawModule = device.createShaderModule({ code: DRAW });
      const drawPipe = device.createRenderPipeline({
        layout: "auto",
        vertex: { module: drawModule, entryPoint: "vs" },
        fragment: {
          module: drawModule,
          entryPoint: "fs",
          targets: [{ format, blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
          } }]
        },
        primitive: { topology: "triangle-list" }
      });
      const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

      let ping = texA;
      let pong = texB;

      const params = new Float32Array(16);
      const frame = (now) => {
        if (dead) return;
        const t = now / 1000;

        /* The brush: a segment step toward the pointer per frame. */
        let bx = -1e4, by = -1e4, br = 0, bs = 0;
        if (pointer.x > -1e3) {
          bx = pointer.x * scale;
          by = pointer.y * scale;
          const moved = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
          if (moved > 1.5) {
            br = 7 + Math.min(18, moved * 0.28);
            bs = 0.16 + Math.min(0.5, moved * 0.004);
            wetUntil = now + 14000;
          }
          pointer.px = pointer.x;
          pointer.py = pointer.y;
        }

        const hue = PALETTE[pointer.stroke % PALETTE.length];
        params.set([W, H, 1 / 60, t, bx, by, br, bs, hue[0] / 255, hue[1] / 255, hue[2] / 255, 0], 0);
        device.queue.writeBuffer(uni, 0, params);

        const enc = device.createCommandEncoder();
        const cp = enc.beginComputePass();
        cp.setPipeline(simPipe);
        cp.setBindGroup(0, device.createBindGroup({
          layout: simPipe.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: uni } },
            { binding: 1, resource: ping.createView() },
            { binding: 2, resource: pong.createView() }
          ]
        }));
        cp.dispatchWorkgroups(Math.ceil(W / 8), Math.ceil(H / 8));
        cp.end();

        const rp = enc.beginRenderPass({
          colorAttachments: [{
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store"
          }]
        });
        rp.setPipeline(drawPipe);
        rp.setBindGroup(0, device.createBindGroup({
          layout: drawPipe.getBindGroupLayout(0),
          entries: [
            { binding: 1, resource: pong.createView() },
            { binding: 2, resource: sampler }
          ]
        }));
        rp.draw(3);
        rp.end();
        device.queue.submit([enc.finish()]);

        [ping, pong] = [pong, ping];

        if (now < wetUntil) {
          raf = requestAnimationFrame(frame);
        } else {
          raf = 0; // dried — park until the pointer wakes us
        }
      };

      const wake = () => {
        if (!raf && !dead) raf = requestAnimationFrame(frame);
      };
      const onMove = (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        if (pointer.px < -1e3) { pointer.px = pointer.x; pointer.py = pointer.y; }
        wetUntil = performance.now() + 14000;
        wake();
      };
      const onDown = () => { pointer.stroke += 1; };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      canvas.dataset.ready = "1";
      wake();

      canvas._cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        texA.destroy(); texB.destroy(); device.destroy();
      };
    })();

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      canvas._cleanup?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="ink-paper" aria-hidden="true" />;
}
