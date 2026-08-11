/* 스프라이트 렌더러. WebGPU 1순위 → WebGL2 → Canvas2D.
   세 백엔드가 같은 그림을 그려야 합니다. 폴백에서만 보이는 버그는 버그입니다.

   드로우콜 1회를 지키는 방법: addTexture로 들어온 모든 이미지를 한 장의 아틀라스
   캔버스에 팩킹해 두고, draw()는 인스턴스(사각형 + UV)만 쌓습니다. present()에서
   정렬 → 인스턴스 버퍼 하나 → 드로우 한 번. 텍스처가 여러 장이면 바인딩이 늘어
   드로우콜이 쪼개지므로, 아틀라스가 이 계약의 전제입니다.

   순수한 부분(팩커·정렬·와이프 수식)은 아래에서 따로 내보냅니다 — node에서 테스트합니다. */

import { WIDTH, HEIGHT } from './config.ts';

/* ── 타입 ─────────────────────────────────────────────────────────
   세 백엔드(WebGPU · WebGL2 · Canvas2D)의 API는 서로 겹치지 않습니다.
   공개 인터페이스만 제대로 두고, 백엔드 안쪽 경계에서는 any를 씁니다 —
   eslint.config.js가 lib/engine/**에 한해 no-explicit-any를 꺼 둔 이유입니다. */

export type WipeKind = 'none' | 'spiral' | 'split' | 'fade';
export type BackendName = 'webgpu' | 'webgl2' | 'canvas2d';

/** 렌더러가 그리는 한 장. draw()가 이 모양으로 쌓고 present()가 정렬해 한 번에 냅니다. */
export interface Instance {
  seq: number; depth: number;
  dx: number; dy: number; dw: number; dh: number;
  u0: number; v0: number; u1: number; v1: number;
  sway: number; alpha: number;
}

export interface DrawOpts {
  flipX?: boolean;
  depth?: number;
  /** 참이면 정점 셰이더가 윗변만 좌우로 밉니다 (풀숲·나무) */
  sway?: boolean | number;
  alpha?: number;
}

export interface Renderer {
  readonly backend: BackendName;
  addTexture: (key: string, image: CanvasImageSource & { width: number; height: number }) => { x: number; y: number; w: number; h: number } | null;
  begin: (camX?: number, camY?: number) => void;
  draw: (
    key: string, sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number, opts?: DrawOpts,
  ) => void;
  present: () => void;
  setTint: (rgba: readonly number[], strength?: number) => void;
  setWipe: (kind?: WipeKind, t?: number) => void;
  resize: (w: number, h: number) => void;
  destroy: () => void;
}

/** 백엔드 하나. 세 구현이 이 모양만 맞추면 됩니다. */
interface Backend {
  name: BackendName;
  upload: (atlas: any) => void;
  flush: (data: Float32Array, count: number) => void;
  resize: (w: number, h: number) => void;
  destroy: () => void;
}

/** 백엔드가 공유하는 프레임 상태. */
interface Core {
  width: number; height: number;
  camX: number; camY: number;
  time: number;
  tint: Float32Array;
  strength: number;
  wipe: { kind: WipeKind; t: number };
  clearColor: () => number[];
  onLost: () => void;
}

const ATLAS_SIZE = 2048;
const FLOATS = 10; // dx,dy,dw,dh, u0,v0,u1,v1, sway, alpha
export const SPIRAL_TURNS = 3.0;
export const WIPE_KINDS = { none: 0, spiral: 1, split: 2, fade: 3 };

/* ── 순수 유틸 ─────────────────────────────────────────────────── */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 선반(shelf) 팩커. 같은 순서로 넣으면 항상 같은 자리가 나옵니다. */
export function createPacker(size = ATLAS_SIZE, pad = 1) {
  let x = 0;
  let y = 0;
  let rowH = 0;
  return {
    size,
    add(w: number, h: number) {
      if (w > size || h > size) return null;
      if (x + w > size) {
        x = 0;
        y += rowH + pad;
        rowH = 0;
      }
      if (y + h > size) return null;
      const r = { x, y, w, h };
      x += w + pad;
      if (h > rowH) rowH = h;
      return r;
    },
  };
}

/** 정렬 키: depth → 발밑 y → 들어온 순서(안정). */
export function compareInstances(a: Instance, b: Instance): number {
  if (a.depth !== b.depth) return a.depth - b.depth;
  const ay = a.dy + a.dh;
  const by = b.dy + b.dh;
  if (ay !== by) return ay - by;
  return a.seq - b.seq;
}

/**
 * 와이프 마스크. 세 백엔드가 같은 식을 씁니다(WGSL·GLSL에 그대로 옮겨 적었습니다).
 * @param {'none'|'spiral'|'split'|'fade'} kind
 * @param {number} t 0..1
 * @param {number} u,v 화면 좌표 0..1
 * @returns {number} 0(안 덮임) 또는 1(덮임). fade만 연속값.
 */
export function wipeCoverage(kind: WipeKind | string, t: number, u: number, v: number): number {
  if (kind === 'none' || t <= 0) return 0;
  if (t >= 1) return 1;
  if (kind === 'fade') return clamp01(t);
  if (kind === 'split') return v < t * 0.5 || v > 1 - t * 0.5 ? 1 : 0;
  if (kind === 'spiral') {
    const dx = u - 0.5;
    const dy = v - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) / Math.SQRT1_2;
    const a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
    return r * SPIRAL_TURNS + a < t * (SPIRAL_TURNS + 1) ? 1 : 0;
  }
  return 0;
}

/* ── 셰이더 ────────────────────────────────────────────────────── */

const WGSL = `
struct Uni {
  viewport : vec2f,
  camera   : vec2f,
  time     : f32,
  strength : f32,
  wipeKind : f32,
  wipeT    : f32,
  tint     : vec4f,
};
@group(0) @binding(0) var<uniform> u : Uni;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var tex  : texture_2d<f32>;

const PI : f32 = 3.14159265;
const TURNS : f32 = ${SPIRAL_TURNS};

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
  @location(1) alpha : f32,
};

fn corner(vi : u32) -> vec2f {
  return vec2f(f32(vi & 1u), f32(vi >> 1u));
}

@vertex
fn vs(@builtin(vertex_index) vi : u32,
      @location(0) dst : vec4f,
      @location(1) uvr : vec4f,
      @location(2) fx  : vec2f) -> VSOut {
  let c = corner(vi);
  var p = dst.xy + c * dst.zw;
  // sway: 윗변(c.y == 0)만 시간에 따라 좌우로. 풀숲·나무.
  p.x = p.x + fx.x * (1.0 - c.y) * sin(u.time * 2.2 + dst.x * 0.06) * 1.6;
  let s = p - u.camera;
  var o : VSOut;
  o.pos = vec4f(s.x / u.viewport.x * 2.0 - 1.0, 1.0 - s.y / u.viewport.y * 2.0, 0.0, 1.0);
  o.uv = uvr.xy + c * (uvr.zw - uvr.xy);
  o.alpha = fx.y;
  return o;
}

@fragment
fn fs(i : VSOut) -> @location(0) vec4f {
  var c = textureSample(tex, samp, i.uv);
  c.a = c.a * i.alpha;
  if (c.a < 0.004) { discard; }
  let m = mix(vec3f(1.0), u.tint.rgb, u.strength);
  return vec4f(c.rgb * m + u.tint.rgb * u.tint.a * u.strength, c.a);
}

struct WOut { @builtin(position) pos : vec4f, @location(0) uv : vec2f };

@vertex
fn wipeVs(@builtin(vertex_index) vi : u32) -> WOut {
  let c = corner(vi);
  var o : WOut;
  o.pos = vec4f(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
  o.uv = c;
  return o;
}

@fragment
fn wipeFs(i : WOut) -> @location(0) vec4f {
  let t = u.wipeT;
  let k = u.wipeKind;
  var cov = 0.0;
  if (t >= 1.0) { cov = 1.0; }
  else if (t <= 0.0 || k < 0.5) { cov = 0.0; }
  else if (k < 1.5) {                       // spiral
    let d = i.uv - vec2f(0.5);
    let r = length(d) / 0.70710678;
    let a = (atan2(d.y, d.x) + PI) / (PI * 2.0);
    cov = select(0.0, 1.0, r * TURNS + a < t * (TURNS + 1.0));
  } else if (k < 2.5) {                     // split
    cov = select(0.0, 1.0, i.uv.y < t * 0.5 || i.uv.y > 1.0 - t * 0.5);
  } else {                                  // fade
    cov = t;
  }
  if (cov <= 0.0) { discard; }
  return vec4f(0.0, 0.0, 0.0, cov);
}
`;

const GLSL_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aDst;
layout(location=1) in vec4 aUv;
layout(location=2) in vec2 aFx;
uniform vec2 uViewport;
uniform vec2 uCamera;
uniform float uTime;
out vec2 vUv;
out float vAlpha;
void main() {
  vec2 c = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vec2 p = aDst.xy + c * aDst.zw;
  p.x += aFx.x * (1.0 - c.y) * sin(uTime * 2.2 + aDst.x * 0.06) * 1.6;
  vec2 s = p - uCamera;
  gl_Position = vec4(s.x / uViewport.x * 2.0 - 1.0, 1.0 - s.y / uViewport.y * 2.0, 0.0, 1.0);
  vUv = aUv.xy + c * (aUv.zw - aUv.xy);
  vAlpha = aFx.y;
}`;

const GLSL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in float vAlpha;
uniform sampler2D uTex;
uniform vec4 uTint;
uniform float uStrength;
out vec4 outColor;
void main() {
  vec4 c = texture(uTex, vUv);
  c.a *= vAlpha;
  if (c.a < 0.004) discard;
  vec3 m = mix(vec3(1.0), uTint.rgb, uStrength);
  outColor = vec4(c.rgb * m + uTint.rgb * uTint.a * uStrength, c.a);
}`;

const GLSL_WIPE_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 c = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
  vUv = c;
}`;

const GLSL_WIPE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uKind;
uniform float uT;
out vec4 outColor;
const float PI = 3.14159265;
const float TURNS = ${SPIRAL_TURNS};
void main() {
  float t = uT, k = uKind, cov = 0.0;
  if (t >= 1.0) cov = 1.0;
  else if (t <= 0.0 || k < 0.5) cov = 0.0;
  else if (k < 1.5) {
    vec2 d = vUv - vec2(0.5);
    float r = length(d) / 0.70710678;
    float a = (atan(d.y, d.x) + PI) / (PI * 2.0);
    cov = (r * TURNS + a < t * (TURNS + 1.0)) ? 1.0 : 0.0;
  } else if (k < 2.5) {
    cov = (vUv.y < t * 0.5 || vUv.y > 1.0 - t * 0.5) ? 1.0 : 0.0;
  } else cov = t;
  if (cov <= 0.0) discard;
  outColor = vec4(0.0, 0.0, 0.0, cov);
}`;

/* ── 아틀라스 ──────────────────────────────────────────────────── */

function makeCanvas(w: number, h: number): any {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  throw new Error('renderer: 캔버스를 만들 수 없는 환경입니다 (브라우저에서만 씁니다)');
}

/* ── 백엔드 ────────────────────────────────────────────────────── */

async function initWebGPU(canvas: HTMLCanvasElement, core: Core): Promise<Backend> {
  if (typeof navigator === 'undefined' || !navigator.gpu) throw new Error('WebGPU 없음');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('GPU 어댑터 없음');
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu');
  if (!ctx) throw new Error('webgpu 컨텍스트 없음');
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });

  const module = device.createShaderModule({ code: WGSL });
  const uniform = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const sampler = device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' });

  const bgl = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    ],
  });
  const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
  const blend: GPUBlendState = {
    color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
  };

  const pipeline = device.createRenderPipeline({
    layout,
    vertex: {
      module,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: FLOATS * 4,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x4' },
            { shaderLocation: 1, offset: 16, format: 'float32x4' },
            { shaderLocation: 2, offset: 32, format: 'float32x2' },
          ],
        },
      ],
    },
    fragment: { module, entryPoint: 'fs', targets: [{ format, blend }] },
    primitive: { topology: 'triangle-strip' },
  });
  const wipePipeline = device.createRenderPipeline({
    layout,
    vertex: { module, entryPoint: 'wipeVs' },
    fragment: { module, entryPoint: 'wipeFs', targets: [{ format, blend }] },
    primitive: { topology: 'triangle-strip' },
  });

  let texture: GPUTexture | null = null;
  let bindGroup: GPUBindGroup | null = null;
  let vbo: GPUBuffer | null = null;
  let vboFloats = 0;
  let dead = false;

  device.lost.then((info) => {
    if (dead) return; // destroy()로 끝낸 것은 사고가 아닙니다
    console.warn('[renderer] WebGPU 디바이스 로스트:', info?.message ?? info);
    core.onLost();
  });

  function upload(atlas: any) {
    texture?.destroy();
    texture = device.createTexture({
      size: [atlas.width, atlas.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture({ source: atlas }, { texture }, [atlas.width, atlas.height]);
    bindGroup = device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: uniform } },
        { binding: 1, resource: sampler },
        { binding: 2, resource: texture },
      ],
    });
  }

  return {
    name: 'webgpu',
    upload,
    resize() {
      ctx.configure({ device, format, alphaMode: 'opaque' });
    },
    flush(f32, count) {
      if (!bindGroup) return;
      const need = count * FLOATS;
      if (need > vboFloats) {
        vbo?.destroy();
        vboFloats = Math.max(need, 1024);
        vbo = device.createBuffer({ size: vboFloats * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      }
      if (count && vbo) device.queue.writeBuffer(vbo, 0, f32, 0, need);

      const u = new Float32Array(12);
      u.set([core.width, core.height, core.camX, core.camY, core.time, core.strength, WIPE_KINDS[core.wipe.kind] ?? 0, core.wipe.t], 0);
      u.set(core.tint, 8);
      device.queue.writeBuffer(uniform, 0, u);

      const [cr, cg, cb] = core.clearColor();
      const enc = device.createCommandEncoder();
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: cr, g: cg, b: cb, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });
      pass.setBindGroup(0, bindGroup);
      if (count) {
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, vbo);
        pass.draw(4, count); // ← 드로우콜 1회
      }
      if (core.wipe.kind !== 'none' && core.wipe.t > 0) {
        pass.setPipeline(wipePipeline);
        pass.draw(4, 1);
      }
      pass.end();
      device.queue.submit([enc.finish()]);
    },
    destroy() {
      dead = true;
      texture?.destroy();
      vbo?.destroy();
      device.destroy?.();
    },
  };
}

function compile(gl: any, vsSrc: string, fsSrc: string): any {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(`셰이더 컴파일 실패: ${gl.getShaderInfoLog(s)}`);
    }
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`링크 실패: ${gl.getProgramInfoLog(p)}`);
  return p;
}

async function initWebGL2(canvas: HTMLCanvasElement, core: Core): Promise<Backend> {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL2 없음');

  const prog = compile(gl, GLSL_VS, GLSL_FS);
  const wipeProg = compile(gl, GLSL_WIPE_VS, GLSL_WIPE_FS);
  const u = {
    viewport: gl.getUniformLocation(prog, 'uViewport'),
    camera: gl.getUniformLocation(prog, 'uCamera'),
    time: gl.getUniformLocation(prog, 'uTime'),
    tint: gl.getUniformLocation(prog, 'uTint'),
    strength: gl.getUniformLocation(prog, 'uStrength'),
    tex: gl.getUniformLocation(prog, 'uTex'),
  };
  const wu = { kind: gl.getUniformLocation(wipeProg, 'uKind'), t: gl.getUniformLocation(wipeProg, 'uT') };

  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  const stride = FLOATS * 4;
  [
    [0, 4, 0],
    [1, 4, 16],
    [2, 2, 32],
  ].forEach(([loc, size, off]) => {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
    gl.vertexAttribDivisor(loc, 1);
  });
  gl.bindVertexArray(null);

  const wipeVao = gl.createVertexArray(); // 빈 VAO — gl_VertexID만 씁니다
  let tex: WebGLTexture | null = null;
  let capacity = 0;
  let dead = false;

  const onLost = (e: Event) => {
    e.preventDefault();
    if (dead) return;
    console.warn('[renderer] WebGL2 컨텍스트 로스트 — 복구를 시도합니다');
  };
  const onRestored = () => {
    if (!dead) core.onLost();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    name: 'webgl2',
    upload(atlas) {
      if (tex) gl.deleteTexture(tex);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    },
    resize(w, h) {
      gl.viewport(0, 0, w, h);
    },
    flush(f32, count) {
      if (!tex || gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      const [cr, cg, cb] = core.clearColor();
      gl.clearColor(cr, cg, cb, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      if (count) {
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        if (count > capacity) {
          capacity = Math.max(count * 2, 256);
          gl.bufferData(gl.ARRAY_BUFFER, capacity * stride, gl.DYNAMIC_DRAW);
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, f32, 0, count * FLOATS);
        gl.useProgram(prog);
        gl.uniform2f(u.viewport, core.width, core.height);
        gl.uniform2f(u.camera, core.camX, core.camY);
        gl.uniform1f(u.time, core.time);
        gl.uniform4fv(u.tint, core.tint);
        gl.uniform1f(u.strength, core.strength);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(u.tex, 0);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count); // ← 드로우콜 1회
      }
      if (core.wipe.kind !== 'none' && core.wipe.t > 0) {
        gl.bindVertexArray(wipeVao);
        gl.useProgram(wipeProg);
        gl.uniform1f(wu.kind, WIPE_KINDS[core.wipe.kind] ?? 0);
        gl.uniform1f(wu.t, core.wipe.t);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.bindVertexArray(null);
    },
    destroy() {
      dead = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (tex) gl.deleteTexture(tex);
      gl.deleteBuffer(vbo);
      gl.deleteProgram(prog);
      gl.deleteProgram(wipeProg);
    },
  };
}

async function initCanvas2D(canvas: HTMLCanvasElement, core: Core): Promise<Backend> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d 컨텍스트 없음');
  ctx.imageSmoothingEnabled = false;
  // 실제로 들어오는 것은 캔버스나 ImageBitmap뿐입니다 — 둘 다 width/height가 있습니다.
  let atlas: (CanvasImageSource & { width: number; height: number }) | null = null;

  return {
    name: 'canvas2d',
    upload(a) {
      atlas = a;
    },
    resize() {
      ctx.imageSmoothingEnabled = false;
    },
    flush(f32, count) {
      const W = canvas.width;
      const H = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const [cr, cg, cb] = core.clearColor();
      ctx.fillStyle = `rgb(${cr * 255} ${cg * 255} ${cb * 255})`;
      ctx.fillRect(0, 0, W, H);

      if (atlas && count) {
        const aw = atlas.width;
        const ah = atlas.height;
        for (let i = 0; i < count; i++) {
          const o = i * FLOATS;
          const dw = f32[o + 2];
          const dh = f32[o + 3];
          let u0 = f32[o + 4];
          let u1 = f32[o + 6];
          const flip = u0 > u1;
          if (flip) [u0, u1] = [u1, u0];
          const sx = u0 * aw;
          const sy = f32[o + 5] * ah;
          const sw = (u1 - u0) * aw;
          const sh = (f32[o + 7] - f32[o + 5]) * ah;
          const dx = f32[o] - core.camX;
          const dy = f32[o + 1] - core.camY;
          if (dx + dw < -32 || dy + dh < -32 || dx > W + 32 || dy > H + 32) continue;

          // sway 근사: 아랫변을 고정하고 윗변만 미는 전단(shear). 셰이더와 같은 식.
          const shear = f32[o + 8] ? (f32[o + 8] * Math.sin(core.time * 2.2 + f32[o] * 0.06) * 1.6) / dh : 0;
          ctx.globalAlpha = f32[o + 9];
          if (shear || flip) {
            ctx.setTransform(1, 0, -shear, 1, dx + (flip ? dw : 0), dy + dh);
            if (flip) ctx.scale(-1, 1);
            ctx.drawImage(atlas, sx, sy, sw, sh, 0, -dh, dw, dh);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          } else {
            ctx.drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh);
          }
        }
      }

      // tint: multiply(=mix) + lighter(=더하기). 셰이더 식과 정확히 같습니다.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const [tr, tg, tb, ta] = core.tint;
      if (core.strength > 0) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = core.strength;
        ctx.fillStyle = `rgb(${tr * 255} ${tg * 255} ${tb * 255})`;
        ctx.fillRect(0, 0, W, H);
        if (ta > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = ta * core.strength;
          ctx.fillRect(0, 0, W, H);
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      drawWipe2D(ctx, W, H, core.wipe);
      ctx.globalAlpha = 1;
    },
    destroy() {
      atlas = null;
    },
  };
}

/** Canvas2D 와이프 근사. 픽셀마다 wipeCoverage를 부르면 느립니다 — 도형으로 그립니다. */
function drawWipe2D(ctx: any, W: number, H: number, wipe: { kind: WipeKind; t: number }): void {
  const { kind, t } = wipe;
  if (kind === 'none' || t <= 0) return;
  ctx.fillStyle = '#000';
  if (t >= 1) {
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (kind === 'fade') {
    ctx.globalAlpha = t;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (kind === 'split') {
    const b = (t * H) / 2;
    ctx.fillRect(0, 0, W, b);
    ctx.fillRect(0, H - b, W, b);
    return;
  }
  // spiral: 셰이더의 경계 r*TURNS + a = t*(TURNS+1) 를 극좌표 폴리곤으로 따라 그립니다.
  // a=0에서 반지름이 뚝 떨어지는 지점이 소용돌이의 팔입니다 — closePath가 그 변을 이어 줍니다.
  const cx = W / 2;
  const cy = H / 2;
  const lim = t * (SPIRAL_TURNS + 1);
  const steps = 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 0; i <= steps; i++) {
    const a = i / steps; // 셰이더의 a (0..1)
    const rr = Math.max(0, Math.min(1, (lim - a) / SPIRAL_TURNS));
    const ang = a * Math.PI * 2 - Math.PI;
    // uv 기준 정규화(0.7071 = 모서리 거리)를 픽셀로 되돌립니다.
    ctx.lineTo(cx + Math.cos(ang) * rr * 0.70710678 * W, cy + Math.sin(ang) * rr * 0.70710678 * H);
  }
  ctx.closePath();
  ctx.fill();
}

/* ── 진입점 ────────────────────────────────────────────────────── */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{width?:number, height?:number}} size 논리 해상도. 기본값은 config.js의 512×352.
 */
export async function createRenderer(
  canvas: HTMLCanvasElement,
  { width = WIDTH, height = HEIGHT }: { width?: number; height?: number } = {},
): Promise<Renderer> {
  const core: Core = {
    width,
    height,
    camX: 0,
    camY: 0,
    time: 0,
    tint: new Float32Array([1, 1, 1, 0]),
    strength: 0,
    wipe: { kind: 'none', t: 0 },
    clearColor() {
      // 셰이더가 스프라이트에 더하는 값을 배경에도 똑같이 — 빈 칸의 색이 백엔드마다 다르지 않게.
      const a = this.tint[3] * this.strength;
      return [this.tint[0] * a, this.tint[1] * a, this.tint[2] * a];
    },
    onLost: () => {},
  };

  const atlas = makeCanvas(ATLAS_SIZE, ATLAS_SIZE);
  const actx = atlas.getContext('2d', { willReadFrequently: false });
  actx.imageSmoothingEnabled = false;
  let packer = createPacker(ATLAS_SIZE);
  const rects = new Map();
  let atlasDirty = false;

  canvas.width = width;
  canvas.height = height;

  const CHAIN = [initWebGPU, initWebGL2, initCanvas2D];
  // boot()는 못 만들면 던집니다 — null이 남을 수 없습니다.
  let backend!: Backend;
  let backendIdx = 0;
  let destroyed = false;
  let recovering = false;

  async function boot(from = 0) {
    for (let i = from; i < CHAIN.length; i++) {
      try {
        const b = await CHAIN[i]!(canvas, core);
        b.upload(atlas);
        b.resize(canvas.width, canvas.height);
        backendIdx = i;
        return b;
      } catch (e) {
        console.warn(`[renderer] ${CHAIN[i]!.name} 실패 → 다음 백엔드로:`, (e as Error)?.message ?? e);
      }
    }
    throw new Error('renderer: 쓸 수 있는 백엔드가 없습니다');
  }

  backend = await boot(0);

  // 컨텍스트 로스트: 같은 백엔드로 한 번 되살려 보고, 안 되면 아래로 내려갑니다.
  // 조용히 검은 화면이 되는 것만은 막습니다.
  core.onLost = async () => {
    if (destroyed || recovering) return;
    recovering = true;
    try {
      backend.destroy();
    } catch {
      /* 이미 죽은 백엔드의 정리 실패는 무시합니다 */
    }
    try {
      backend = await boot(backendIdx);
      console.warn(`[renderer] 복구: ${backend.name}`);
    } finally {
      recovering = false;
    }
  };

  // 인스턴스 기록. 프레임마다 새로 만들지 않고 풀에서 꺼내 씁니다.
  const pool: Instance[] = [];
  let count = 0;
  let f32 = new Float32Array(1024 * FLOATS);
  const missing = new Set();

  return {
    get backend() {
      return backend.name;
    },

    /** 아틀라스에 등록. 같은 key를 다시 주면 덮어씁니다. */
    addTexture(key: string, image: CanvasImageSource & { width: number; height: number }) {
      const w = image.width;
      const h = image.height;
      let r = rects.get(key);
      if (!r || r.w !== w || r.h !== h) {
        r = packer.add(w, h);
        if (!r) {
          console.warn(`[renderer] 아틀라스(${ATLAS_SIZE}px)가 가득 찼습니다 — "${key}" 등록 실패`);
          return null;
        }
        rects.set(key, r);
      }
      actx.clearRect(r.x, r.y, r.w, r.h);
      actx.drawImage(image, r.x, r.y);
      atlasDirty = true;
      return r;
    },

    /** 프레임 시작. 카메라는 픽셀 단위, 소수 허용(보간). */
    begin(camX = 0, camY = 0) {
      core.camX = camX;
      core.camY = camY;
      core.time = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      count = 0;
    },

    /** opts: { flipX, depth, sway, alpha } */
    draw(key, sx, sy, sw, sh, dx, dy, dw, dh, opts = {}) {
      const r = rects.get(key);
      if (!r) {
        if (!missing.has(key)) {
          missing.add(key);
          console.warn(`[renderer] 등록되지 않은 텍스처 "${key}" — 이 프레임에서 건너뜁니다`);
        }
        return;
      }
      const rec = pool[count] ?? (pool[count] = {} as Instance);
      const aw = ATLAS_SIZE;
      const u0 = (r.x + sx) / aw;
      const u1 = (r.x + sx + sw) / aw;
      rec.seq = count;
      rec.depth = opts.depth ?? 0;
      rec.dx = dx;
      rec.dy = dy;
      rec.dw = dw;
      rec.dh = dh;
      rec.u0 = opts.flipX ? u1 : u0; // 좌우 반전은 UV를 뒤집어 처리합니다
      rec.u1 = opts.flipX ? u0 : u1;
      rec.v0 = (r.y + sy) / aw;
      rec.v1 = (r.y + sy + sh) / aw;
      rec.sway = opts.sway ? (typeof opts.sway === 'number' ? opts.sway : 1) : 0;
      rec.alpha = opts.alpha ?? 1;
      count++;
    },

    /** 정렬 후 드로우콜 1회. */
    present() {
      if (atlasDirty) {
        backend.upload(atlas);
        atlasDirty = false;
      }
      const list = pool.slice(0, count).sort(compareInstances);
      if (count * FLOATS > f32.length) f32 = new Float32Array(count * FLOATS * 2);
      for (let i = 0; i < count; i++) {
        const r = list[i];
        const o = i * FLOATS;
        f32[o] = r.dx;
        f32[o + 1] = r.dy;
        f32[o + 2] = r.dw;
        f32[o + 3] = r.dh;
        f32[o + 4] = r.u0;
        f32[o + 5] = r.v0;
        f32[o + 6] = r.u1;
        f32[o + 7] = r.v1;
        f32[o + 8] = r.sway;
        f32[o + 9] = r.alpha;
      }
      backend.flush(f32, count);
    },

    /** rgba: 0..1 배열 4개, strength: 0..1. palette.js의 TIME_TINTS를 그대로 넣습니다. */
    setTint(rgba, strength = 1) {
      core.tint.set(rgba);
      core.strength = strength;
    },

    setWipe(kind = 'none', t = 0) {
      core.wipe.kind = kind in WIPE_KINDS ? kind : 'none';
      core.wipe.t = clamp01(t);
    },

    resize(w, h) {
      core.width = w;
      core.height = h;
      canvas.width = w;
      canvas.height = h;
      backend.resize(w, h);
    },

    destroy() {
      destroyed = true;
      backend.destroy();
      rects.clear();
      packer = createPacker(ATLAS_SIZE);
    },
  };
}
