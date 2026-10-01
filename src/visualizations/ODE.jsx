import { useMemo, useState } from 'react'
import { Coordinates, Plot, Line, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { useMovableSync } from './useMovableSync.js'

// 一阶 ODE y' = f(x, y)，附解析解（用于验证数值解）
const ODES = {
  decay: {
    label: "y' = −2y",
    f: (x, y) => -2 * y,
    sol: (x, x0, y0) => y0 * Math.exp(-2 * (x - x0)),
    view: { x: [-2, 4], y: [-1.5, 3] },
  },
  linear: {
    label: "y' = x − y",
    f: (x, y) => x - y,
    sol: (x, x0, y0) => x - 1 + (y0 - x0 + 1) * Math.exp(-(x - x0)),
    view: { x: [-2, 5], y: [-2, 4] },
  },
  logistic: {
    label: "y' = y(1−y)",
    f: (x, y) => y * (1 - y),
    sol: (x, x0, y0) => {
      if (Math.abs(y0) < 1e-6) return 0
      if (Math.abs(y0 - 1) < 1e-6) return 1
      const k = y0 / (1 - y0)
      const e = Math.exp(x - x0)
      return (k * e) / (1 + k * e)
    },
    view: { x: [-2, 5], y: [-0.5, 1.8] },
  },
}

const SPEC = {
  ode: { type: 'str', default: 'linear' },
}
const PRE = "% ode 可取 'decay' / 'linear' / 'logistic'；\n% 拖动图中的橙色初始点，解曲线会自动穿过该点。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// RK4 积分一步
function rk4(f, x, y, h) {
  const k1 = f(x, y)
  const k2 = f(x + h / 2, y + (h * k1) / 2)
  const k3 = f(x + h / 2, y + (h * k2) / 2)
  const k4 = f(x + h, y + h * k3)
  return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
}

// 从 (x0,y0) 向两个方向积分，得到解曲线点列
function solveCurve(f, x0, y0, xMin, xMax, steps = 300) {
  const pts = [[x0, y0]]
  const h = (xMax - xMin) / steps
  // 正向
  let x = x0
  let y = y0
  const fwd = []
  for (let i = 0; i < steps && x < xMax - 1e-6; i++) {
    y = rk4(f, x, y, h)
    x += h
    if (Number.isFinite(y)) fwd.push([x, y])
    else break
  }
  // 反向
  x = x0
  y = y0
  const bwd = []
  for (let i = 0; i < steps && x > xMin + 1e-6; i++) {
    y = rk4(f, x, y, -h)
    x -= h
    if (Number.isFinite(y)) bwd.push([x, y])
    else break
  }
  bwd.reverse()
  return [...bwd, ...pts, ...fwd].filter((p) => Number.isFinite(p[1]))
}

export default function ODE() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const [x0, setX0] = useState(1)
  const [y0, setY0] = useState(1)

  const odeKey = ODES[vals.ode] ? vals.ode : 'linear'
  const ode = ODES[odeKey]
  const X0V = ode.view.x[0]
  const X1V = ode.view.x[1]
  const Y0V = ode.view.y[0]
  const Y1V = ode.view.y[1]

  // 初值点（钳制在视图内）
  const pt = useMovablePoint([x0, y0], {
    constrain: ([px, py]) => [clamp(px, X0V, X1V), clamp(py, Y0V, Y1V)],
    color: Theme.orange,
  })
  // 拖动 → 更新初值
  const sync = useMovableSync(pt, [x0, y0], (px, py) => {
    setX0(px)
    setY0(py)
  })

  // 斜率场网格（只随方程变化重算）
  const segs = useMemo(() => {
    const gridX = 13
    const gridY = 9
    const list = []
    for (let i = 0; i < gridX; i++) {
      for (let j = 0; j < gridY; j++) {
        const gx = X0V + ((X1V - X0V) * (i + 0.5)) / gridX
        const gy = Y0V + ((Y1V - Y0V) * (j + 0.5)) / gridY
        const slope = ode.f(gx, gy)
        if (!Number.isFinite(slope)) continue
        const len = 0.16
        const ang = Math.atan(slope)
        const dx = len * Math.cos(ang)
        const dy = len * Math.sin(ang)
        list.push({ x1: gx - dx, y1: gy - dy, x2: gx + dx, y2: gy + dy })
      }
    }
    return list
  }, [ode, X0V, X1V, Y0V, Y1V])

  // 解曲线（只随方程/初值重算，气泡弹出不会触发重算）
  const curve = useMemo(() => solveCurve(ode.f, x0, y0, X0V, X1V), [ode, x0, y0, X0V, X1V])
  // 解析解验证（取右端点）
  const xCheck = Math.min(x0 + 1, X1V - 0.1)
  const yNum = curve.find((p) => p[0] >= xCheck)?.[1]
  const yExact = ode.sol(xCheck, x0, y0)

  const onClick = (p) => {
    for (const s of segs) {
      const cx = (s.x1 + s.x2) / 2
      const cy = (s.y1 + s.y2) / 2
      if (Math.hypot(p[0] - cx, p[1] - cy) < 0.1)
        return setBubble({ at: p, text: `斜率场：在 (${cx.toFixed(1)}, ${cy.toFixed(1)}) 处 y'=${ode.f(cx, cy).toFixed(2)}。解曲线在每一点都与该点的小线段相切。` })
    }
    if (Math.hypot(p[0] - x0, p[1] - y0) < 0.3)
      return setBubble({ at: [x0, y0], text: `初始点 (x₀,y₀)=(${x0.toFixed(2)}, ${y0.toFixed(2)})。拖动它，解曲线会重新穿过新的初始条件。` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '斜率场（方向场）', color: Theme.muted },
          { label: '解曲线（过初始点）', color: Theme.blue },
          { label: '初始点（可拖动）', color: Theme.orange },
        ]}
        hint="拖动橙色点改变初始条件；解曲线始终与斜率场相切。"
      />
      <VizMafs viewBox={ode.view} onClick={onClick}>
        <Coordinates.Cartesian />
        {segs.map((s, i) => (
          <Line.Segment key={i} point1={[s.x1, s.y1]} point2={[s.x2, s.y2]} color={Theme.muted} weight={1} strokeOpacity={0.6} />
        ))}
        <Plot.OfX y={(x) => ode.sol(x, x0, y0)} color={Theme.blue} weight={2.2} />
        <g {...sync.wrapProps}>{pt.element}</g>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={Object.entries(ODES).map(([v, o]) => ({ value: v, label: o.label }))} value={odeKey} onChange={(v) => setParam('ode', v)} />
        <div className="readout">
          初始点 (x₀, y₀) = (<b>{x0.toFixed(2)}</b>, <b>{y0.toFixed(2)}</b>)　·　x={xCheck.toFixed(2)} 处数值解 ={' '}
          <b>{yNum?.toFixed(4)}</b>　·　解析解 = <b>{yExact.toFixed(4)}</b>　·　误差 ={' '}
          <b>{yNum != null ? Math.abs(yNum - yExact).toExponential(2) : '—'}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="线性方程 y'+y=x 可用积分因子 μ=e^x 求解。试试 logistic：y₀=0.1 时解从下方趋向 1，y₀=1.5 时从上方趋向 1。"
      />
    </div>
  )
}
