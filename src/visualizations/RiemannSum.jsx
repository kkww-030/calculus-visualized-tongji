import { useState } from 'react'
import { Coordinates, Plot, Polygon, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { distToCurve } from './hit.js'

const PRESETS = [
  { value: 'x.^2 / 8 + 1', label: '抛物线' },
  { value: 'sin(x) + 1.6', label: 'sin' },
  { value: 'sqrt(x) + 0.5', label: '√x' },
]

const METHODS = [
  { value: 'left', label: '左端点' },
  { value: 'mid', label: '中点' },
  { value: 'right', label: '右端点' },
]

const A = 0
const B = 4

const SPEC = {
  f: { type: 'fn', default: 'x.^2 / 8 + 1' },
  n: { type: 'num', default: 10 },
  method: { type: 'str', default: 'mid' },
}
const PRE = '% n 是矩形个数，method 可取 left / mid / right；\n% 修改后点「运行代码」，左侧滑块与按钮会同步变化。\n'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 自适应辛普森数值积分，当作"精确值"参照
function integrate(g, a, b, n = 2000) {
  const h = (b - a) / n
  let s = g(a) + g(b)
  for (let i = 1; i < n; i++) s += g(a + i * h) * (i % 2 ? 4 : 2)
  return (s * h) / 3
}

export default function RiemannSum() {
  const { vals, fns, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)

  const F = fns.f
  const n = Math.round(clamp(Number.isFinite(vals.n) ? vals.n : 10, 1, 100))
  const method = METHODS.some((m) => m.value === vals.method) ? vals.method : 'mid'

  const dx = (B - A) / n
  let sum = 0
  const rects = []
  for (let i = 0; i < n; i++) {
    const x0 = A + i * dx
    const x1 = x0 + dx
    const s = method === 'left' ? x0 : method === 'right' ? x1 : x0 + dx / 2
    let y = F(s)
    if (!Number.isFinite(y)) y = 0
    sum += y * dx
    rects.push({ x0, x1, y, xi: s })
  }
  const exact = integrate((x) => (Number.isFinite(F(x)) ? F(x) : 0), A, B)

  const onClick = (pt) => {
    if (pt[0] >= A && pt[0] <= B) {
      const i = Math.min(n - 1, Math.max(0, Math.floor((pt[0] - A) / dx)))
      const r = rects[i]
      if (pt[1] >= -0.05 && pt[1] <= r.y + 0.05)
        return setBubble({
          at: pt,
          text: `第 ${i + 1} 个矩形：取样点 ξ = ${r.xi.toFixed(3)}，高 = f(ξ) = ${r.y.toFixed(4)}，面积 = f(ξ)·Δx = ${(r.y * dx).toFixed(5)}（Δx = ${dx.toFixed(4)}）。`,
        })
    }
    if (distToCurve(pt, F, 4) < 0.25)
      return setBubble({
        at: pt,
        text: `曲边梯形的"顶"：y = f(x) = ${vals.f}。黎曼和用一排矩形面积 f(ξᵢ)·Δx 之和去逼近它下面的真实面积。`,
      })
    if (Math.abs(pt[1]) < 0.12 && pt[0] > A - 0.2 && pt[0] < B + 0.2)
      return setBubble({ at: pt, text: '积分区间 [a, b] = [0, 4]：把这段 x 轴切成 n 份，每份宽 Δx = (b−a)/n。' })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'f(x) 曲线', color: Theme.blue },
          { label: '黎曼矩形', color: Theme.violet },
        ]}
        hint="点击任意矩形或曲线可弹出注释；n、取样方式都能调。"
      />
      <VizMafs viewBox={{ x: [-0.6, 4.6], y: [-0.8, 4.2] }} onClick={onClick}>
        <Coordinates.Cartesian />
        {rects.map((r, i) =>
          r.y > 0 ? (
            <Polygon
              key={i}
              points={[
                [r.x0, 0],
                [r.x1, 0],
                [r.x1, r.y],
                [r.x0, r.y],
              ]}
              color={Theme.violet}
              fillOpacity={0.35}
              strokeOpacity={0.7}
              weight={1}
            />
          ) : null,
        )}
        <Plot.OfX y={F} color={Theme.blue} weight={2} />
        <Text x={2} y={Math.min(3.9, F(2) + 0.3)} size={15} color={Theme.blue} attach="n">
          f(x) = {vals.f}
        </Text>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Slider label="矩形个数 n" min={1} max={100} step={1} value={n} onChange={(v) => setParam('n', v)} />
        <Segmented options={METHODS} value={method} onChange={(v) => setParam('method', v)} />
        <div className="readout">
          黎曼和 ≈ <b>{sum.toFixed(5)}</b>　·　精确值(数值积分) = <b>{exact.toFixed(5)}</b>　·　误差 ={' '}
          <b>{Math.abs(sum - exact).toFixed(5)}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="试试 n = 50、method = 'left'，或把 f 换成 sin(x) + 1.6 —— 观察误差如何变化。"
      />
    </div>
  )
}
