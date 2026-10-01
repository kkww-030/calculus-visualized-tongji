import { useState } from 'react'
import { Coordinates, Plot, Line, Point, Text, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { distToPoint, distToCurve, distToSegment } from './hit.js'
import { useMovableSync } from './useMovableSync.js'

const PRESETS = [
  { value: 'x.^2 / 4 + 1', label: '抛物线' },
  { value: '1.5 * sin(x) + 2.5', label: 'sin' },
  { value: '1.2 * cos(x) + 2.8', label: 'cos' },
]

const SPEC = {
  f: { type: 'fn', default: 'x.^2 / 4 + 1' },
  a: { type: 'num', default: 1.5 },
  h: { type: 'num', default: 2 },
}
const PRE = '% 修改任意参数后点「运行代码」，图形会实时更新；\n% 拖动图中的点 / 滑块也会自动写回下面的代码。\n'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round2 = (v) => Math.round(v * 100) / 100

export default function Derivative() {
  const { vals, fns, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)

  const F = fns.f // 用户（或默认）的 f(x)
  const fp = (x) => (F(x + 1e-5) - F(x - 1e-5)) / 2e-5 // 数值导数

  const a = useMovablePoint([vals.a, F(vals.a)], {
    constrain: ([x]) => {
      const cx = clamp(x, -3.2, 3.2)
      return [cx, F(cx)]
    },
  })

  // 切点拖点 ↔ 代码参数 a 双向同步
  const targetA = clamp(Number.isFinite(vals.a) ? vals.a : 1.5, -3.2, 3.2)
  const sync = useMovableSync(a, [targetA, F(targetA)], (px) => setParam('a', round2(px)))

  const h = clamp(vals.h, 0.01, 4)
  const x0 = a.x
  const x1 = x0 + h
  const m = (F(x1) - F(x0)) / h
  const exact = fp(x0)

  const onClick = (pt) => {
    if (distToPoint(pt, [x0, F(x0)]) < 0.3)
      return setBubble({ at: pt, text: `切点 (a, f(a))：a = ${x0.toFixed(2)}，这里的瞬时变化率 f′(a) ≈ ${exact.toFixed(4)}，即切线斜率。` })
    if (distToPoint(pt, [x1, F(x1)]) < 0.3)
      return setBubble({ at: pt, text: '第二个点：横坐标是 a + h。沿曲线拖动它，就是在改变 h。' })
    if (distToSegment(pt, [x0, F(x0)], [x1, F(x1)]) < 0.22)
      return setBubble({ at: pt, text: `割线：连接两点的直线，斜率 = Δy/h = ${m.toFixed(4)}，是 f′(a) 的近似值。` })
    if (distToSegment(pt, [x0, F(x0)], [x1, F(x0)]) < 0.18)
      return setBubble({ at: pt, text: 'h：自变量的增量。把 h 拖小（或拖动上面的点靠近切点），割线会逼近切线。' })
    if (distToSegment(pt, [x1, F(x0)], [x1, F(x1)]) < 0.18)
      return setBubble({ at: pt, text: `Δy = f(a+h) − f(a) = ${(F(x1) - F(x0)).toFixed(4)}：函数值的增量。` })
    if (distToCurve(pt, F, 8) < 0.28)
      return setBubble({ at: pt, text: `曲线 y = f(x) = ${vals.f}。导数 f′(a) 回答："在这一瞬间，x 每增加 1，f 大约增加多少？"` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'f(x) 曲线', color: Theme.blue },
          { label: '割线（斜率 Δy/h）', color: Theme.orange, dashed: true },
          { label: 'h 与 Δy', color: Theme.green },
          { label: '可拖动的点', color: Theme.violet },
        ]}
        hint="点击曲线、割线或任意点可弹出注释；两个端点都可以拖动。"
      />
      <VizMafs viewBox={{ x: [-4.2, 4.2], y: [-0.8, 5.5] }} onClick={onClick}>
        <Coordinates.Cartesian />
        <Plot.OfX y={F} color={Theme.blue} weight={2} />
        <Line.ThroughPoints point1={[x0, F(x0)]} point2={[x1, F(x1)]} color={Theme.orange} weight={2} style="dashed" />
        <Line.Segment point1={[x0, F(x0)]} point2={[x1, F(x0)]} color={Theme.green} weight={2} />
        <Line.Segment point1={[x1, F(x0)]} point2={[x1, F(x1)]} color={Theme.green} weight={2} />
        <Point x={x1} y={F(x1)} color={Theme.orange} />
        <Text x={(x0 + x1) / 2} y={F(x0) - 0.3} size={18} color={Theme.green}>
          h
        </Text>
        <Text x={x1 + 0.4} y={(F(x0) + F(x1)) / 2} size={14} color={Theme.green} attach="e">
          Δy
        </Text>
        <g {...sync.wrapProps}>{a.element}</g>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={PRESETS} value={vals.f} onChange={(v) => setParam('f', v)} />
        <Slider
          label="h（两点水平距离）"
          min={0.01}
          max={4}
          step={0.01}
          value={h}
          onChange={(v) => setParam('h', v)}
          format={(v) => v.toFixed(2)}
        />
        <div className="readout">
          割线斜率 = <b>{Number.isFinite(m) ? m.toFixed(4) : '—'}</b>　·　f′(a) ≈{' '}
          <b>{Number.isFinite(exact) ? exact.toFixed(4) : '—'}</b>　·　差距 ={' '}
          <b>{Number.isFinite(m - exact) ? Math.abs(m - exact).toFixed(4) : '—'}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="试试把 h 改成 0.5，或把 f 换成 1.5 * sin(x) + 2.5 —— 图形、滑块、切点会一起变。"
      />
    </div>
  )
}
