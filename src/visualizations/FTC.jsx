import { useState } from 'react'
import { Coordinates, Plot, Polygon, Line, Text, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { useMovableSync } from './useMovableSync.js'

// f 与原函数 F
const FNS = {
  x2: { label: 'f = x²', f: (x) => x * x, F: (x) => (x * x * x) / 3, view: { x: [-0.5, 3], y: [-0.5, 4] } },
  sin: { label: 'f = sin x', f: Math.sin, F: (x) => -Math.cos(x), view: { x: [-0.5, 6], y: [-1.5, 1.5] } },
  cos: { label: 'f = cos x', f: Math.cos, F: Math.sin, view: { x: [-0.5, 6], y: [-1.5, 1.5] } },
  exp: { label: 'f = eˣ', f: Math.exp, F: Math.exp, view: { x: [-0.5, 2.2], y: [-0.5, 6] } },
}

const SPEC = {
  fn: { type: 'str', default: 'x2' },
  a: { type: 'num', default: 0.5 },
  x: { type: 'num', default: 2 },
}
const PRE = "% fn 选被积函数；a 是积分下限（可拖）；x 是面积函数 A(x)=∫ₐˣf(t)dt 的上限。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function FTC() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)

  const fnKey = FNS[vals.fn] ? vals.fn : 'x2'
  const fn = FNS[fnKey]
  const a = clamp(Number.isFinite(vals.a) ? vals.a : 0.5, fn.view.x[0] + 0.1, fn.view.x[1] - 0.5)
  const x = clamp(Number.isFinite(vals.x) ? vals.x : 2, a + 0.1, fn.view.x[1] - 0.1)

  // 面积函数 A(x) = F(x) - F(a)
  const A = (t) => fn.F(t) - fn.F(a)
  const Ax = A(x)
  const fx = fn.f(x)
  // 数值验证 A'(x) ≈ f(x)
  const h = 1e-4
  const dAdx = (A(x + h) - A(x - h)) / (2 * h)

  // 可拖下限 a
  const ptA = useMovablePoint([a, 0], {
    constrain: ([px]) => [clamp(px, fn.view.x[0] + 0.1, x - 0.1), 0],
    color: Theme.red,
  })
  // 可拖上限 x
  const ptX = useMovablePoint([x, 0], {
    constrain: ([px]) => [clamp(px, a + 0.1, fn.view.x[1] - 0.1), 0],
    color: Theme.orange,
  })

  // 拖动 ↔ 参数双向同步
  const syncA = useMovableSync(ptA, [a, 0], (px) => setParam('a', Math.round(px * 100) / 100))
  const syncX = useMovableSync(ptX, [x, 0], (px) => setParam('x', Math.round(px * 100) / 100))

  // 阴影多边形 [a, x] under f
  const poly = []
  for (let i = 0; i <= 80; i++) {
    const t = a + ((x - a) * i) / 80
    poly.push([t, fn.f(t)])
  }
  for (let i = 80; i >= 0; i--) {
    const t = a + ((x - a) * i) / 80
    poly.push([t, 0])
  }

  const onClick = (p) => {
    if (p[0] >= a && p[0] <= x && Math.abs(p[1] - fn.f(p[0])) < 0.25)
      return setBubble({ at: p, text: `被积函数 f(x)=${fn.label.split('= ')[1]}。从 a 到 x 的阴影面积 = F(x)−F(a) = ${Ax.toFixed(4)}。` })
    if (Math.abs(p[0] - x) < 0.1 && p[1] > -0.1 && p[1] < fn.f(x) + 0.1)
      return setBubble({ at: [x, fx], text: `上限 x=${x.toFixed(2)}：面积函数 A(x)=∫ₐˣf = ${Ax.toFixed(4)}。FTC 第一部分说 A'(x)=f(x)=${fx.toFixed(4)}，数值验证 A'(x)=${dAdx.toFixed(4)}。` })
    if (Math.abs(p[0] - a) < 0.1)
      return setBubble({ at: [a, 0], text: `下限 a=${a.toFixed(2)}。A(a)=∫ₐᵃf=0，面积从这里开始累积。` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'f(x) 被积函数', color: Theme.blue },
          { label: '阴影面积 = A(x) = F(x)−F(a)', color: Theme.violet },
        ]}
        hint="拖动橙点 x 改变上限，看面积如何累积；A'(x) 始终等于 f(x)。"
      />
      <VizMafs viewBox={fn.view} onClick={onClick}>
        <Coordinates.Cartesian />
        <Plot.OfX y={fn.f} color={Theme.blue} weight={2} />
        <Polygon points={poly} color={Theme.violet} fillOpacity={0.35} strokeOpacity={0} />
        <Line.Segment point1={[x, 0]} point2={[x, fn.f(x)]} color={Theme.orange} weight={1.5} />
        <g {...syncA.wrapProps}>{ptA.element}</g>
        <g {...syncX.wrapProps}>{ptX.element}</g>
        <Text x={(a + x) / 2} y={Math.min(fn.view.y[1] - 0.3, fn.f((a + x) / 2) / 2)} size={13} color={Theme.violet} attach="n">
          A(x) = {Ax.toFixed(3)}
        </Text>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Slider label="下限 a" min={fn.view.x[0] + 0.1} max={fn.view.x[1] - 0.5} step={0.01} value={a} onChange={(v) => setParam('a', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <Slider label="上限 x" min={a + 0.1} max={fn.view.x[1] - 0.1} step={0.01} value={x} onChange={(v) => setParam('x', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <div className="readout">
          A(x) = ∫ₐˣ f(t)dt = F(x)−F(a) = <b>{Ax.toFixed(5)}</b>　·　A'(x) = <b>{dAdx.toFixed(5)}</b>　·　f(x) ={' '}
          <b>{fx.toFixed(5)}</b>　·　|A'−f| = <b>{Math.abs(dAdx - fx).toExponential(2)}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="牛顿-莱布尼茨公式把「求面积」和「求原函数」打通：∫ₐᵇf(x)dx = F(b)−F(a)。看 A'(x) 与 f(x) 几乎完全相等（误差 1e-9 量级）。"
      />
    </div>
  )
}
