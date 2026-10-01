import { useState } from 'react'
import { Coordinates, Plot, Line, Text, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { useMovableSync } from './useMovableSync.js'

const E = Math.E
const PI = Math.PI

const SPEC = {
  mode: { type: 'str', default: 'sin' },
  x: { type: 'num', default: 0.5 },
}
const PRE = "% mode 可取 'sin'（sin x / x 的夹逼）或 'e'（(1+1/x)^x → e）；\n% x 是当前考察点：sin 模式下 x∈(0, π/2]，e 模式下 x≥1。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function ImportantLimits() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)

  const mode = vals.mode === 'e' ? 'e' : 'sin'

  if (mode === 'sin') return <SinLimit vals={vals} setParam={setParam} bubble={bubble} setBubble={setBubble} code={code} setCode={setCode} run={run} out={out} error={error} reset={reset} />
  return <ELimit vals={vals} setParam={setParam} bubble={bubble} setBubble={setBubble} code={code} setCode={setCode} run={run} out={out} error={error} reset={reset} />
}

/* ───────── sin x / x 的夹逼准则 ───────── */
function SinLimit({ vals, setParam, bubble, setBubble, code, setCode, run, out, error, reset }) {
  const x = clamp(Number.isFinite(vals.x) ? vals.x : 0.5, 0.02, PI / 2)
  const sx = Math.sin(x) / x
  const lo = Math.cos(x) // 下界 cos x
  const hi = 1 // 上界 1

  // 可拖动的 x 值（钳制在 (0, π/2]）
  const pt = useMovablePoint([x, 0], {
    constrain: ([px]) => [clamp(px, 0.02, PI / 2), 0],
    color: Theme.orange,
  })
  // 拖动 ↔ 参数双向同步（拖动中禁止外部回写抢位置）
  const sync = useMovableSync(pt, [x, 0], (px) => setParam('x', Math.round(px * 100) / 100))

  const y = sx
  const onClick = (p) => {
    if (Math.abs(p[0] - x) < 0.08 && p[1] > -0.1 && p[1] < y + 0.1)
      return setBubble({
        at: [x, y],
        text: `sin(x)/x 在 x = ${x.toFixed(3)} 处的值 = ${sx.toFixed(5)}。x 越小，越逼近极限 1。`,
      })
    if (Math.abs(p[1] - 1) < 0.08 && p[0] > 0.1)
      return setBubble({ at: p, text: '上界 y = 1：因为 sin x < x（x>0 时），所以 sin x / x < 1。' })
    if (Math.abs(p[1] - Math.cos(p[0])) < 0.1 && p[0] > 0.1)
      return setBubble({ at: p, text: '下界 y = cos x：由单位圆面积比较 cos x < sin x / x。x→0 时 cos x→1，把 sin x/x 夹向 1。' })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'sin x / x', color: Theme.blue },
          { label: '上界 y = 1', color: Theme.orange, dashed: true },
          { label: '下界 y = cos x', color: Theme.green, dashed: true },
        ]}
        hint="拖动橙色圆点让 x→0，观察上下界如何把 sin x/x 夹逼到 1。"
      />
      <VizMafs viewBox={{ x: [-0.3, PI / 2 + 0.3], y: [-0.1, 1.15] }} onClick={onClick}>
        <Coordinates.Cartesian yAxis={{ labels: false }} />
        <Plot.OfX y={(t) => (t === 0 ? 1 : Math.sin(t) / t)} color={Theme.blue} weight={2} />
        <Plot.OfX y={() => 1} color={Theme.orange} weight={1.5} style="dashed" />
        <Plot.OfX y={Math.cos} color={Theme.green} weight={1.5} style="dashed" />
        <Line.Segment point1={[x, 0]} point2={[x, y]} color={Theme.foreground} weight={1} strokeOpacity={0.5} />
        {pt.element && <g {...sync.wrapProps}>{pt.element}</g>}
        <Text x={x} y={y + 0.04} size={12} color={Theme.blue} attach="s">
          ({x.toFixed(2)}, {sx.toFixed(3)})
        </Text>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented
          options={[
            { value: 'sin', label: 'sin x / x' },
            { value: 'e', label: '(1+1/x)^x' },
          ]}
          value="sin"
          onChange={(v) => {
            setParam('mode', v)
            setParam('x', v === 'e' ? 10 : 0.5)
          }}
        />
        <Slider label="x" min={0.02} max={PI / 2} step={0.01} value={x} onChange={(v) => setParam('x', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <div className="readout">
          cos x = <b>{lo.toFixed(5)}</b> ＜ sin x / x = <b>{sx.toFixed(5)}</b> ＜ 1　·　夹逼间隙 = <b>{(1 - lo).toFixed(5)}</b>
        </div>
      </div>
      <CodePanel code={code} onCodeChange={setCode} onRun={run} onReset={reset} output={out} error={error} hint="把 x 拖到 0.02，看 sin x/x 已经非常接近 1；上下界之差 cos x 也趋于 0。" />
    </div>
  )
}

/* ───────── (1+1/x)^x → e ───────── */
function ELimit({ vals, setParam, bubble, setBubble, code, setCode, run, out, error, reset }) {
  const x = clamp(Number.isFinite(vals.x) ? vals.x : 10, 1, 1000)
  const val = Math.pow(1 + 1 / x, x)
  const diff = E - val

  const onClick = (p) => {
    if (p[0] > 0.5 && Math.abs(Math.pow(1 + 1 / p[0], p[0]) - p[1]) < 0.05)
      return setBubble({ at: p, text: `y = (1+1/x)^x：在 x = ${p[0].toFixed(1)} 处 y = ${Math.pow(1 + 1 / p[0], p[0]).toFixed(5)}。x 越大越逼近 e。` })
    if (Math.abs(p[1] - E) < 0.04 && p[0] > 0.5)
      return setBubble({ at: p, text: `水平渐近线 y = e ≈ 2.71828。这是自然对数的底，由 (1+1/n)^n 在 n→∞ 时的极限定义。` })
    setBubble(null)
  }

  // 采样展示几个关键值
  const samples = [1, 2, 5, 10, 100, 1000].map((n) => ({ n, v: Math.pow(1 + 1 / n, n) }))

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '(1+1/x)^x', color: Theme.blue },
          { label: 'y = e ≈ 2.71828', color: Theme.orange, dashed: true },
        ]}
        hint="把 x 拖大，看曲线如何从下方逼近水平渐近线 e。"
      />
      <VizMafs viewBox={{ x: [0, 40], y: [1, 3] }} onClick={onClick}>
        <Coordinates.Cartesian yAxis={{ labels: false }} />
        <Plot.OfX y={(t) => Math.pow(1 + 1 / t, t)} color={Theme.blue} weight={2} />
        <Plot.OfX y={() => E} color={Theme.orange} weight={1.5} style="dashed" />
        <Line.Segment point1={[x, 1]} point2={[x, val]} color={Theme.foreground} weight={1} strokeOpacity={0.5} />
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented
          options={[
            { value: 'sin', label: 'sin x / x' },
            { value: 'e', label: '(1+1/x)^x' },
          ]}
          value="e"
          onChange={(v) => {
            setParam('mode', v)
            setParam('x', v === 'e' ? 10 : 0.5)
          }}
        />
        <Slider label="x" min={1} max={1000} step={1} value={x} onChange={(v) => setParam('x', Math.round(v))} />
        <div className="readout">
          (1 + 1/{x})^{x} = <b>{val.toFixed(6)}</b>　·　e = <b>{E.toFixed(6)}</b>　·　距 e 还差 <b>{diff.toFixed(6)}</b>
        </div>
        <div className="readout" style={{ fontSize: 13, color: '#8b95a5' }}>
          采样：{samples.map((s) => `x=${s.n}: ${s.v.toFixed(4)}`).join('　|　')}
        </div>
      </div>
      <CodePanel code={code} onCodeChange={setCode} onRun={run} onReset={reset} output={out} error={error} hint="把 x 设为 1000，(1+1/1000)^1000 = 2.71692，已经非常接近 e=2.71828。" />
    </div>
  )
}
