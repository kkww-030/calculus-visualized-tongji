import { useState } from 'react'
import { Coordinates, Plot, Polygon, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'

// 原函数族：f 与它的一个原函数 F
const FNS = {
  x2: { label: '∫ 2x dx = x²', f: (x) => 2 * x, F: (x) => x * x, view: { x: [-2.5, 2.5], y: [-4, 5] } },
  sin: { label: '∫ cos x dx = sin x', f: Math.cos, F: Math.sin, view: { x: [-4, 6], y: [-2, 2] } },
  cos: { label: '∫ sin x dx = −cos x', f: Math.sin, F: (x) => -Math.cos(x), view: { x: [-4, 6], y: [-2, 2] } },
  x3: { label: '∫ x² dx = x³/3', f: (x) => x * x, F: (x) => (x * x * x) / 3, view: { x: [-2.5, 2.5], y: [-3, 4] } },
}

const SPEC = {
  mode: { type: 'str', default: 'family' },
  fn: { type: 'str', default: 'x2' },
  C: { type: 'num', default: 0 },
  a: { type: 'num', default: 0.3 },
  b: { type: 'num', default: 1.2 },
}
const PRE = "% mode: 'family'（原函数族）或 'sub'（换元积分）；\n% family: fn 选被积函数，C 是积分常数；\n% sub: 演示 ∫2x·cos(x²)dx，a/b 是积分上下限。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function Antiderivative() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const mode = vals.mode === 'sub' ? 'sub' : 'family'

  if (mode === 'family') return <Family vals={vals} setParam={setParam} bubble={bubble} setBubble={setBubble} code={code} setCode={setCode} run={run} out={out} error={error} reset={reset} />
  return <Subst vals={vals} setParam={setParam} bubble={bubble} setBubble={setBubble} code={code} setCode={setCode} run={run} out={out} error={error} reset={reset} />
}

/* ───────── 原函数族 F(x) + C ───────── */
function Family({ vals, setParam, bubble, setBubble, code, setCode, run, out, error, reset }) {
  const fnKey = FNS[vals.fn] ? vals.fn : 'x2'
  const fn = FNS[fnKey]
  const C = clamp(Number.isFinite(vals.C) ? vals.C : 0, -3, 3)
  const Fc = (x) => fn.F(x) + C

  // 数值积分参考：∫f = F(b)-F(a)
  const a = -1
  const b = 1
  const integ = fn.F(b) - fn.F(a)

  const onClick = (p) => {
    if (Math.abs(p[1] - Fc(p[0])) < 0.2)
      return setBubble({ at: p, text: `F(x) + C = ${fn.label.replace(/.*= /, '')} + (${C.toFixed(1)})。无论 C 取多少，导数都是 f(x)，所以一族曲线只差上下平移。` })
    if (Math.abs(p[1] - fn.f(p[0])) < 0.2)
      return setBubble({ at: p, text: `f(x) = ${fn.label.split(' ')[1]} 是 F(x)+C 的导数。积分常数 C 求导后消失，所以不定积分的结果是"一族"函数。` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'F(x) + C（原函数族）', color: Theme.orange },
          { label: 'f(x)（= F\'(x)）', color: Theme.blue },
        ]}
        hint="拖动 C 看原函数曲线上下平移，但导数 f(x) 完全不变。"
      />
      <VizMafs viewBox={fn.view} onClick={onClick}>
        <Coordinates.Cartesian />
        {/* 几条不同 C 的参考曲线（淡化） */}
        {[-2, -1, 1, 2].map((c) => (
          <Plot.OfX key={c} y={(x) => fn.F(x) + c} color={Theme.orange} weight={1} strokeOpacity={0.2} />
        ))}
        <Plot.OfX y={Fc} color={Theme.orange} weight={2.5} />
        <Plot.OfX y={fn.f} color={Theme.blue} weight={2} />
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented
          options={[
            { value: 'family', label: '原函数族' },
            { value: 'sub', label: '换元积分' },
          ]}
          value="family"
          onChange={(v) => setParam('mode', v)}
        />
        <Segmented options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Slider label="积分常数 C" min={-3} max={3} step={0.1} value={C} onChange={(v) => setParam('C', Math.round(v * 10) / 10)} format={(v) => v.toFixed(1)} />
        <div className="readout">
          ∫₋₁¹ f(x) dx = F(1) − F(−1) = <b>{integ.toFixed(4)}</b>（与 C 无关——常数在差值中抵消）
        </div>
      </div>
      <CodePanel code={code} onCodeChange={setCode} onRun={run} onReset={reset} output={out} error={error} hint="把 C 从 −3 拖到 3，橙色曲线整体平移，但它和蓝色 f(x) 的「斜率关系」始终不变。" />
    </div>
  )
}

/* ───────── 换元积分法：∫ 2x·cos(x²) dx = sin(x²) + C ───────── */
function Subst({ vals, setParam, bubble, setBubble, code, setCode, run, out, error, reset }) {
  const a = clamp(Number.isFinite(vals.a) ? vals.a : 0.3, 0.1, 1.5)
  const b = clamp(Number.isFinite(vals.b) ? vals.b : 1.2, a + 0.1, 1.6)
  // 左侧被积函数：g'(x)·f(g(x)) = 2x·cos(x²)
  const left = (x) => 2 * x * Math.cos(x * x)
  // 右侧换元后：f(u) = cos(u)，u = x²
  const right = (u) => Math.cos(u)
  const ua = a * a
  const ub = b * b

  // 数值积分两侧（辛普森）
  const simpson = (f, lo, hi, n = 400) => {
    const h = (hi - lo) / n
    let s = f(lo) + f(hi)
    for (let i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 ? 4 : 2)
    return (s * h) / 3
  }
  const areaL = simpson(left, a, b)
  const areaR = simpson(right, ua, ub)

  const onClick = (p) => {
    if (p[0] >= a && p[0] <= b && Math.abs(p[1] - left(p[0])) < 0.2)
      return setBubble({ at: p, text: `左侧：被积函数 2x·cos(x²)，积分区间 [${a.toFixed(2)}, ${b.toFixed(2)}]。令 u=x²，则 du=2x dx，正好凑出微分。` })
    if (p[0] >= ua && p[0] <= ub && Math.abs(p[1] - right(p[0])) < 0.2)
      return setBubble({ at: p, text: `右侧：换元后变成 cos(u)，区间从 [a², b²] = [${ua.toFixed(2)}, ${ub.toFixed(2)}]。面积与左侧相等——这就是换元法的几何本质。` })
    setBubble(null)
  }

  // 左侧阴影
  const leftPoly = []
  for (let i = 0; i <= 60; i++) {
    const x = a + ((b - a) * i) / 60
    leftPoly.push([x, left(x)])
  }
  for (let i = 60; i >= 0; i--) {
    const x = a + ((b - a) * i) / 60
    leftPoly.push([x, 0])
  }
  // 右侧阴影
  const rightPoly = []
  for (let i = 0; i <= 60; i++) {
    const u = ua + ((ub - ua) * i) / 60
    rightPoly.push([u, right(u)])
  }
  for (let i = 60; i >= 0; i--) {
    const u = ua + ((ub - ua) * i) / 60
    rightPoly.push([u, 0])
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '左侧 2x·cos(x²)，x∈[a,b]', color: Theme.blue },
          { label: '右侧 cos(u)，u∈[a²,b²]', color: Theme.green },
        ]}
        hint="换元 u=x² 把左侧面积「搬」到右侧，面积不变。调 a/b 看两块面积始终相等。"
      />
      <VizMafs viewBox={{ x: [-0.3, 2.8], y: [-1.6, 1.6] }} onClick={onClick}>
        <Coordinates.Cartesian />
        <Plot.OfX y={left} color={Theme.blue} weight={2} />
        <Polygon points={leftPoly} color={Theme.blue} fillOpacity={0.3} strokeOpacity={0} />
        <Plot.OfX y={right} color={Theme.green} weight={2} />
        <Polygon points={rightPoly} color={Theme.green} fillOpacity={0.3} strokeOpacity={0} />
        <Text x={0.5} y={1.3} size={12} color={Theme.blue}>左：∫₂ₓ·cos(x²)dx</Text>
        <Text x={1.8} y={1.3} size={12} color={Theme.green}>右：∫cos(u)du</Text>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented
          options={[
            { value: 'family', label: '原函数族' },
            { value: 'sub', label: '换元积分' },
          ]}
          value="sub"
          onChange={(v) => setParam('mode', v)}
        />
        <Slider label="a" min={0.1} max={1.5} step={0.01} value={a} onChange={(v) => setParam('a', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <Slider label="b" min={0.2} max={1.6} step={0.01} value={b} onChange={(v) => setParam('b', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <div className="readout">
          左侧面积 = <b>{areaL.toFixed(5)}</b>　·　右侧面积 = <b>{areaR.toFixed(5)}</b>　·　差值 = <b>{Math.abs(areaL - areaR).toExponential(2)}</b>
        </div>
      </div>
      <CodePanel code={code} onCodeChange={setCode} onRun={run} onReset={reset} output={out} error={error} hint="换元法的核心：∫f(g(x))g'(x)dx = ∫f(u)du。这里 g(x)=x²，g'(x)=2x 正好凑齐。" />
    </div>
  )
}
