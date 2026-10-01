import { useState } from 'react'
import { Coordinates, Vector, Point, Line, Text, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { useMovableSync } from './useMovableSync.js'

const FNS = {
  bowl: { label: 'f = x² + y²', f: (x, y) => x * x + y * y, fx: (x) => 2 * x, fy: (y) => 2 * y, view: { x: [-2.5, 2.5], y: [-2.5, 2.5] } },
  saddle: { label: 'f = x² − y²', f: (x, y) => x * x - y * y, fx: (x) => 2 * x, fy: (y) => -2 * y, view: { x: [-2.5, 2.5], y: [-2.5, 2.5] } },
  ripple: { label: 'f = sin x + cos y', f: (x, y) => Math.sin(x) + Math.cos(y), fx: (x) => Math.cos(x), fy: (y) => -Math.sin(y), view: { x: [-3.5, 3.5], y: [-3.5, 3.5] } },
}

const SPEC = {
  fn: { type: 'str', default: 'bowl' },
  px: { type: 'num', default: 1 },
  py: { type: 'num', default: 0.6 },
  angle: { type: 'num', default: 0 },
}
const PRE = "% fn 选二元函数；px, py 是考察点；angle 是方向角（度）。\n% 方向导数 D_u f = ∇f · u，梯度方向是上升最快的方向。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 简易 marching squares：返回 f(x,y)=c 的线段列表
function contourSegments(f, c, xMin, xMax, yMin, yMax, N = 40) {
  const segs = []
  const dx = (xMax - xMin) / N
  const dy = (yMax - yMin) / N
  const val = (i, j) => f(xMin + i * dx, yMin + j * dy)
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = val(i, j)
      const b = val(i + 1, j)
      const cc = val(i, j + 1)
      const d = val(i + 1, j + 1)
      const x0 = xMin + i * dx
      const y0 = yMin + j * dy
      const pt = (v1, v2, p1, p2) => {
        const t = (c - v1) / (v2 - v1 || 1e-12)
        return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])]
      }
      const corners = [
        [a, [x0, y0]],
        [b, [x0 + dx, y0]],
        [d, [x0 + dx, y0 + dy]],
        [cc, [x0, y0 + dy]],
      ]
      const above = corners.map((c2) => c2[0] >= c)
      let edges = []
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4
        if (above[k] !== above[k2]) edges.push(pt(corners[k][0], corners[k2][0], corners[k][1], corners[k2][1]))
      }
      if (edges.length === 2) segs.push([edges[0], edges[1]])
      else if (edges.length === 4) {
        segs.push([edges[0], edges[1]])
        segs.push([edges[2], edges[3]])
      }
    }
  }
  return segs
}

export default function Gradient() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const fnKey = FNS[vals.fn] ? vals.fn : 'bowl'
  const fn = FNS[fnKey]
  const px = clamp(Number.isFinite(vals.px) ? vals.px : 1, fn.view.x[0] + 0.2, fn.view.x[1] - 0.2)
  const py = clamp(Number.isFinite(vals.py) ? vals.py : 0.6, fn.view.y[0] + 0.2, fn.view.y[1] - 0.2)
  const angle = ((Number.isFinite(vals.angle) ? vals.angle : 0) % 360 + 360) % 360

  const gx = fn.fx(px)
  const gy = fn.fy(py)
  const gradMag = Math.hypot(gx, gy)
  const rad = (angle * Math.PI) / 180
  const ux = Math.cos(rad)
  const uy = Math.sin(rad)
  const dirDeriv = gx * ux + gy * uy

  // 可拖动考察点
  const pt = useMovablePoint([px, py], {
    constrain: ([x, y]) => [clamp(x, fn.view.x[0] + 0.2, fn.view.x[1] - 0.2), clamp(y, fn.view.y[0] + 0.2, fn.view.y[1] - 0.2)],
    color: Theme.orange,
  })
  // 拖动 → 写回 px/py
  const sync = useMovableSync(
    pt,
    [px, py],
    (qx, qy) => {
      setParam('px', Math.round(qx * 100) / 100)
      setParam('py', Math.round(qy * 100) / 100)
    },
  )

  // 梯度向量场（网格箭头）
  const GX = 9
  const GY = 9
  const arrows = []
  for (let i = 0; i < GX; i++) {
    for (let j = 0; j < GY; j++) {
      const x = fn.view.x[0] + ((fn.view.x[1] - fn.view.x[0]) * (i + 0.5)) / GX
      const y = fn.view.y[0] + ((fn.view.y[1] - fn.view.y[0]) * (j + 0.5)) / GY
      const g = fn.fx(x)
      const h = fn.fy(y)
      const m = Math.hypot(g, h)
      if (m < 1e-6) continue
      const scale = 0.22
      arrows.push({ tail: [x, y], tip: [x + (g / m) * scale, y + (h / m) * scale] })
    }
  }

  // 等高线（取几个水平）
  const fmin = fn.f(fn.view.x[0], fn.view.y[0])
  const fmax = fn.f(0, 0)
  const levels = []
  const lo = Math.min(fmin, fmax, 0)
  const hi = Math.max(fmin, fmax, 4)
  for (let c = lo; c <= hi; c += (hi - lo) / 7) levels.push(c)
  const allSegs = levels.flatMap((c) => contourSegments(fn.f, c, fn.view.x[0], fn.view.x[1], fn.view.y[0], fn.view.y[1]))

  // 当前点的梯度箭头
  const gScale = 0.4
  const gradTip = [px + gx * gScale, py + gy * gScale]
  // 方向导数方向
  const dirTip = [px + ux * 0.5, py + uy * 0.5]

  // 点到线段的距离（用于箭头命中）
  const distToSeg = (p, a, b) => {
    const vx = b[0] - a[0]
    const vy = b[1] - a[1]
    const wx = p[0] - a[0]
    const wy = p[1] - a[1]
    const len2 = vx * vx + vy * vy
    const t = len2 > 0 ? Math.min(1, Math.max(0, (wx * vx + wy * vy) / len2)) : 0
    return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy))
  }

  const onClick = (p) => {
    if (Math.hypot(p[0] - px, p[1] - py) < 0.45)
      return setBubble({ at: [px, py], text: `考察点 (${px.toFixed(2)}, ${py.toFixed(2)})：∇f = (${gx.toFixed(2)}, ${gy.toFixed(2)})，模长 |∇f| = ${gradMag.toFixed(3)}。梯度方向垂直于等高线，指向 f 上升最快的方向。` })
    if (distToSeg(p, [px, py], gradTip) < 0.12)
      return setBubble({ at: gradTip, text: `梯度箭头 ∇f = (${gx.toFixed(2)}, ${gy.toFixed(2)})：它垂直穿过等高线，指向 f 增大最快的方向，长度就是最陡坡度 |∇f| = ${gradMag.toFixed(3)}。` })
    if (distToSeg(p, [px, py], dirTip) < 0.12)
      return setBubble({ at: dirTip, text: `你指定的方向 u = (cos ${angle}°, sin ${angle}°)。沿这个方向的变化率 D_u f = ∇f·u = ${dirDeriv.toFixed(3)}。` })
    // 等高线命中
    for (const s of allSegs) {
      if (distToSeg(p, s[0], s[1]) < 0.08)
        return setBubble({ at: p, text: `等高线：沿这条线走 f(x,y) 不变（方向导数为 0）。等高线越密的地方 |∇f| 越大、山坡越陡。` })
    }
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '等高线 f(x,y)=c', color: Theme.muted },
          { label: '梯度向量场 ∇f', color: Theme.green },
          { label: '该点梯度', color: Theme.orange },
          { label: '指定方向 u', color: Theme.blue },
        ]}
        hint="橙色箭头是梯度（⊥等高线、指向上坡）；蓝色是你选的方向 u，读数显示方向导数 D_u f = ∇f·u。"
      />
      <VizMafs viewBox={fn.view} onClick={onClick}>
        <Coordinates.Cartesian />
        {allSegs.map((s, i) => (
          <Line.Segment key={i} point1={s[0]} point2={s[1]} color={Theme.muted} weight={1} strokeOpacity={0.5} />
        ))}
        {arrows.map((a, i) => (
          <Vector key={i} tail={a.tail} tip={a.tip} color={Theme.green} weight={1} opacity={0.7} />
        ))}
        <Vector tail={[px, py]} tip={gradTip} color={Theme.orange} weight={2.5} />
        <Vector tail={[px, py]} tip={dirTip} color={Theme.blue} weight={2} />
        <g {...sync.wrapProps}>{pt.element}</g>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Slider label="方向角 θ（度）" min={0} max={359} step={1} value={angle} onChange={(v) => setParam('angle', Math.round(v))} />
        <div className="readout">
          ∇f = (<b>{gx.toFixed(3)}</b>, <b>{gy.toFixed(3)}</b>)　·　|∇f| = <b>{gradMag.toFixed(4)}</b>　·　
          方向 u = (cos {angle}°, sin {angle}°)　·　D_u f = ∇f·u = <b>{dirDeriv.toFixed(4)}</b>
        </div>
        <div className="readout" style={{ fontSize: 13, color: '#8b95a5' }}>
          当 θ = {Math.round((Math.atan2(gy, gx) * 180) / Math.PI + 360) % 360}° 时方向导数最大 = |∇f|（沿梯度方向上升最快）
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="把方向角转到与梯度同向，D_u f 达到最大值 |∇f|；转到反向则为最小值 −|∇f|；转到垂直（θ±90°）则为 0（沿等高线方向）。"
      />
    </div>
  )
}
