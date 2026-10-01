import { useState } from 'react'
import { Coordinates, Vector, Circle, Line, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'

// 向量场 F=(P,Q)，附旋度密度 ∂Q/∂x − ∂P/∂y
const FIELDS = {
  rot: { label: 'F = (−y, x)', P: (x, y) => -y, Q: (x, y) => x, curl: 2 },
  area: { label: 'F = (−y/2, x/2)', P: (x, y) => -y / 2, Q: (x, y) => x / 2, curl: 1 },
  radial: { label: 'F = (x, y)', P: (x, y) => x, Q: (x, y) => y, curl: 0 },
}

const SPEC = {
  field: { type: 'str', default: 'rot' },
  r: { type: 'num', default: 1.2 },
}
const PRE = "% field 选向量场；r 是积分曲线（圆）的半径。\n% 格林公式：∮ Pdx+Qdy = ∬(∂Q/∂x − ∂P/∂y) dA。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const PI = Math.PI

export default function Green() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const fieldKey = FIELDS[vals.field] ? vals.field : 'rot'
  const field = FIELDS[fieldKey]
  const r = clamp(Number.isFinite(vals.r) ? vals.r : 1.2, 0.4, 2.2)

  // 线积分 ∮ Pdx+Qdy（参数化圆，数值积分）
  let lineInt = 0
  const N = 400
  for (let i = 0; i < N; i++) {
    const t = (i / N) * 2 * PI
    const x = r * Math.cos(t)
    const y = r * Math.sin(t)
    const dx = -r * Math.sin(t) * (2 * PI / N)
    const dy = r * Math.cos(t) * (2 * PI / N)
    lineInt += field.P(x, y) * dx + field.Q(x, y) * dy
  }

  // 二重积分 = 旋度密度 × 面积
  const area = PI * r * r
  const doubleInt = field.curl * area

  // 向量场网格箭头
  const G = 9
  const arrows = []
  const range = 2.8
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const x = -range + (2 * range * i) / (G - 1)
      const y = -range + (2 * range * j) / (G - 1)
      const px = field.P(x, y)
      const qy = field.Q(x, y)
      const m = Math.hypot(px, qy)
      if (m < 1e-6) continue
      const s = 0.25
      arrows.push({ tail: [x, y], tip: [x + (px / m) * s, y + (qy / m) * s] })
    }
  }

  const onClick = (p) => {
    if (Math.abs(Math.hypot(p[0], p[1]) - r) < 0.15)
      return setBubble({ at: p, text: `闭合曲线 L（半径 r=${r.toFixed(2)} 的圆）。沿它走一圈的线积分 ∮Pdx+Qdy = ${lineInt.toFixed(5)}。` })
    if (Math.hypot(p[0], p[1]) < r - 0.1)
      return setBubble({ at: p, text: `区域 D 内部：旋度密度 ∂Q/∂x−∂P/∂y = ${field.curl}（常数）。二重积分 = 旋度 × 面积 = ${field.curl} × ${area.toFixed(4)} = ${doubleInt.toFixed(5)}。` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '向量场 F=(P,Q)', color: Theme.muted },
          { label: '闭合曲线 L', color: Theme.orange },
          { label: '区域 D', color: Theme.violet },
        ]}
        hint="沿橙色圆周的线积分 = 紫色圆盘上旋度的二重积分（格林公式）。换向量场看旋度为 0 时线积分也为 0。"
      />
      <VizMafs viewBox={{ x: [-2.8, 2.8], y: [-2.8, 2.8] }} onClick={onClick}>
        <Coordinates.Cartesian />
        <Circle center={[0, 0]} radius={r} color={Theme.violet} fillOpacity={0.12} strokeOpacity={0} />
        {arrows.map((a, i) => (
          <Vector key={i} tail={a.tail} tip={a.tip} color={Theme.muted} weight={1} opacity={0.6} />
        ))}
        <Circle center={[0, 0]} radius={r} color={Theme.orange} fillOpacity={0} weight={2.5} />
        {/* 逆时针方向指示：圆周上的两个短切向箭头 */}
        <Vector tail={[r, -0.16]} tip={[r, 0.16]} color={Theme.orange} weight={2.5} />
        <Vector tail={[-r, 0.16]} tip={[-r, -0.16]} color={Theme.orange} weight={2.5} />
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={Object.entries(FIELDS).map(([v, f]) => ({ value: v, label: f.label }))} value={fieldKey} onChange={(v) => setParam('field', v)} />
        <Slider label="曲线半径 r" min={0.4} max={2.2} step={0.05} value={r} onChange={(v) => setParam('r', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <div className="readout">
          线积分 ∮ Pdx+Qdy ≈ <b>{lineInt.toFixed(5)}</b>　·　
          二重积分 ∬(∂Q/∂x−∂P/∂y)dA = {field.curl}×πr² = <b>{doubleInt.toFixed(5)}</b>　·　
          差值 = <b>{Math.abs(lineInt - doubleInt).toExponential(2)}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="格林公式把「绕边界的累积」转化为「内部旋涡的总和」。F=(−y/2,x/2) 的旋度=1，线积分恰好等于区域面积——这是「鞋带公式」的向量场版本。"
      />
    </div>
  )
}
