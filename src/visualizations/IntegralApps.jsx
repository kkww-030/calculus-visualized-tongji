import { lazy, Suspense, useState } from 'react'
import { Coordinates, Plot, Polygon, Line, Point, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'

const Volume3D = lazy(() => import('./three/Volume3D.jsx'))

// f 与 f'（弧长需要导数）
const FNS = {
  x2: { label: 'f = x²', f: (x) => x * x + 0.3, fp: (x) => 2 * x, view: { x: [-0.3, 2.5], y: [-0.3, 3] } },
  sqrt: { label: 'f = √x', f: (x) => Math.sqrt(x) + 0.2, fp: (x) => 1 / (2 * Math.sqrt(Math.max(x, 1e-6))), view: { x: [-0.1, 3], y: [-0.1, 2.2] } },
  sin: { label: 'f = sin x + 1.5', f: (x) => Math.sin(x) + 1.5, fp: Math.cos, view: { x: [-0.3, 6], y: [-0.1, 2.8] } },
}

const SPEC = {
  mode: { type: 'str', default: 'volume' },
  fn: { type: 'str', default: 'x2' },
  a: { type: 'num', default: 0.3 },
  b: { type: 'num', default: 2 },
  slice: { type: 'num', default: 1.2 },
  n: { type: 'num', default: 8 },
}
const PRE = "% mode: 'volume'（旋转体体积）或 'arc'（弧长）；\n% volume: f(x) 绕 x 轴旋转，V=π∫ₐᵇf(x)²dx；\n% arc: 用 n 段折线逼近曲线，s=∫ₐᵇ√(1+f'²)dx。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const PI = Math.PI

export default function IntegralApps() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const mode = vals.mode === 'arc' ? 'arc' : 'volume'

  if (mode === 'volume') return <Volume vals={vals} setParam={setParam} bubble={bubble} setBubble={setBubble} code={code} setCode={setCode} run={run} out={out} error={error} reset={reset} />
  return <Arc vals={vals} setParam={setParam} bubble={bubble} setBubble={setBubble} code={code} setCode={setCode} run={run} out={out} error={error} reset={reset} />
}

/* ───────── 旋转体体积（圆盘法） ───────── */
function Volume({ vals, setParam, bubble, setBubble, code, setCode, run, out, error, reset }) {
  const fnKey = FNS[vals.fn] ? vals.fn : 'x2'
  const fn = FNS[fnKey]
  const a = clamp(Number.isFinite(vals.a) ? vals.a : 0.3, 0, fn.view.x[1] - 0.5)
  const b = clamp(Number.isFinite(vals.b) ? vals.b : 2, a + 0.2, fn.view.x[1] - 0.1)
  const slice = clamp(Number.isFinite(vals.slice) ? vals.slice : 1.2, a, b)

  // 体积精确值：π∫ₐᵇ f² dx（辛普森）
  const simpson = (g, lo, hi, n = 800) => {
    const h = (hi - lo) / n
    let s = g(lo) + g(hi)
    for (let i = 1; i < n; i++) s += g(lo + i * h) * (i % 2 ? 4 : 2)
    return (s * h) / 3
  }
  const volume = PI * simpson((x) => fn.f(x) ** 2, a, b)
  const diskArea = PI * fn.f(slice) ** 2

  const onClick = (p) => {
    if (Math.abs(p[1] - fn.f(p[0])) < 0.2)
      return setBubble({ at: p, text: `母线 y=f(x)=${fn.label.split('= ')[1]}。绕 x 轴旋转一周形成旋转体，在 x 处的截面是半径 f(x) 的圆盘。` })
    if (Math.abs(p[0] - slice) < 0.12)
      return setBubble({ at: [slice, fn.f(slice)], text: `切片位置 x=${slice.toFixed(2)}：圆盘半径 r=f(x)=${fn.f(slice).toFixed(3)}，面积 πr²=${diskArea.toFixed(4)}。体积就是这些圆盘面积沿 x 积分。` })
    setBubble(null)
  }

  // 阴影区域（旋转截面）
  const poly = []
  for (let i = 0; i <= 60; i++) {
    const x = a + ((b - a) * i) / 60
    poly.push([x, fn.f(x)])
  }
  for (let i = 60; i >= 0; i--) {
    const x = a + ((b - a) * i) / 60
    poly.push([x, 0])
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '母线 f(x)（绕 x 轴旋转）', color: Theme.blue },
          { label: '积分区间 [a, b]', color: Theme.violet },
          { label: '当前切片圆盘', color: Theme.green },
        ]}
        hint="左图是二维截面，右图是旋转后的三维立体；拖动 slice 看圆盘位置。"
      />
      <div className="viz-stage" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <VizMafs viewBox={fn.view} onClick={onClick}>
          <Coordinates.Cartesian />
          <Polygon points={poly} color={Theme.violet} fillOpacity={0.25} strokeOpacity={0} />
          <Plot.OfX y={fn.f} color={Theme.blue} weight={2} />
          <Line.Segment point1={[slice, 0]} point2={[slice, fn.f(slice)]} color={Theme.green} weight={2.5} />
          <Point x={slice} y={fn.f(slice)} color={Theme.green} />
          <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
        </VizMafs>
        <Suspense fallback={<div className="viz3d-loading">三维旋转体加载中…</div>}>
          <Volume3D F={fn.f} a={a} b={b} slice={slice} />
        </Suspense>
      </div>
      <div className="viz-controls">
        <Segmented
          options={[
            { value: 'volume', label: '旋转体体积' },
            { value: 'arc', label: '弧长' },
          ]}
          value="volume"
          onChange={(v) => setParam('mode', v)}
        />
        <Segmented options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Slider label="a" min={0} max={fn.view.x[1] - 0.5} step={0.01} value={a} onChange={(v) => setParam('a', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <Slider label="b" min={a + 0.2} max={fn.view.x[1] - 0.1} step={0.01} value={b} onChange={(v) => setParam('b', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <Slider label="切片位置 slice" min={a} max={b} step={0.01} value={slice} onChange={(v) => setParam('slice', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <div className="readout">
          体积 V = π∫ₐᵇ f(x)² dx ≈ <b>{volume.toFixed(5)}</b>　·　当前圆盘面积 = π·f({slice.toFixed(2)})² = <b>{diskArea.toFixed(4)}</b>
        </div>
      </div>
      <CodePanel code={code} onCodeChange={setCode} onRun={run} onReset={reset} output={out} error={error} hint="圆盘法：把旋转体切成垂直于 x 轴的薄圆盘，每片体积 πr²·dx，积分得总体积。" />
    </div>
  )
}

/* ───────── 弧长：折线逼近 ───────── */
function Arc({ vals, setParam, bubble, setBubble, code, setCode, run, out, error, reset }) {
  const fnKey = FNS[vals.fn] ? vals.fn : 'x2'
  const fn = FNS[fnKey]
  const a = clamp(Number.isFinite(vals.a) ? vals.a : 0.3, 0, fn.view.x[1] - 0.5)
  const b = clamp(Number.isFinite(vals.b) ? vals.b : 2, a + 0.2, fn.view.x[1] - 0.1)
  const n = Math.round(clamp(Number.isFinite(vals.n) ? vals.n : 8, 1, 80))

  // 折线长度
  let polyLen = 0
  const segPoints = []
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n
    segPoints.push([x, fn.f(x)])
    if (i > 0) {
      const dx = (b - a) / n
      const dy = fn.f(x) - fn.f(a + ((b - a) * (i - 1)) / n)
      polyLen += Math.sqrt(dx * dx + dy * dy)
    }
  }

  // 精确弧长：∫ₐᵇ √(1+f'²) dx
  const simpson = (g, lo, hi, m = 800) => {
    const h = (hi - lo) / m
    let s = g(lo) + g(hi)
    for (let i = 1; i < m; i++) s += g(lo + i * h) * (i % 2 ? 4 : 2)
    return (s * h) / 3
  }
  const exact = simpson((x) => Math.sqrt(1 + fn.fp(x) ** 2), a, b)

  const onClick = (p) => {
    // 找最近的折线段
    let best = Infinity
    let bi = 0
    for (let i = 0; i < n; i++) {
      const [x1, y1] = segPoints[i]
      const [x2, y2] = segPoints[i + 1]
      const cx = (x1 + x2) / 2
      const cy = (y1 + y2) / 2
      const d = Math.hypot(p[0] - cx, p[1] - cy)
      if (d < best) {
        best = d
        bi = i
      }
    }
    if (best < 0.3) {
      const [x1, y1] = segPoints[bi]
      const [x2, y2] = segPoints[bi + 1]
      const dx = x2 - x1
      const dy = y2 - y1
      const len = Math.sqrt(dx * dx + dy * dy)
      return setBubble({
        at: [(x1 + x2) / 2, (y1 + y2) / 2],
        text: `第 ${bi + 1} 段折线：Δx=${dx.toFixed(3)}，Δy=${dy.toFixed(3)}，长度 √(Δx²+Δy²)=${len.toFixed(4)}。所有段之和就是弧长近似。`,
      })
    }
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '曲线 f(x)', color: Theme.blue },
          { label: `n 段折线逼近`, color: Theme.orange },
        ]}
        hint="n 越大，折线越贴近曲线，长度越逼近真实弧长。"
      />
      <VizMafs viewBox={fn.view} onClick={onClick}>
        <Coordinates.Cartesian />
        <Plot.OfX y={fn.f} color={Theme.blue} weight={2} />
        {segPoints.map((p, i) => (
          <Point key={i} x={p[0]} y={p[1]} color={Theme.orange} />
        ))}
        {segPoints.slice(0, -1).map((p, i) => (
          <Line.Segment key={i} point1={p} point2={segPoints[i + 1]} color={Theme.orange} weight={1.5} />
        ))}
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented
          options={[
            { value: 'volume', label: '旋转体体积' },
            { value: 'arc', label: '弧长' },
          ]}
          value="arc"
          onChange={(v) => setParam('mode', v)}
        />
        <Segmented options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Slider label="a" min={0} max={fn.view.x[1] - 0.5} step={0.01} value={a} onChange={(v) => setParam('a', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <Slider label="b" min={a + 0.2} max={fn.view.x[1] - 0.1} step={0.01} value={b} onChange={(v) => setParam('b', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <Slider label="折线段数 n" min={1} max={80} step={1} value={n} onChange={(v) => setParam('n', v)} />
        <div className="readout">
          折线长度 ≈ <b>{polyLen.toFixed(5)}</b>　·　精确弧长 ∫√(1+f'²)dx = <b>{exact.toFixed(5)}</b>　·　误差 ={' '}
          <b>{Math.abs(polyLen - exact).toFixed(5)}</b>
        </div>
      </div>
      <CodePanel code={code} onCodeChange={setCode} onRun={run} onReset={reset} output={out} error={error} hint="弧长公式 s=∫ₐᵇ√(1+f'(x)²)dx 来自勾股定理：每小段 ds=√(dx²+dy²)。把 n 拉到 80，看误差趋近 0。" />
    </div>
  )
}
