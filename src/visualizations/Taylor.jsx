import { useState } from 'react'
import { Coordinates, Plot, Line, Point, Text, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import Katex from '../components/Katex.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { distToPoint, distToCurve } from './hit.js'
import { useMovableSync } from './useMovableSync.js'

const fact = (k) => {
  let r = 1
  for (let i = 2; i <= k; i++) r *= i
  return r
}

// 各函数的泰勒系数 f^(k)(a)/k!（解析公式，支持任意展开点 a）
const FNS = {
  sin: {
    label: 'sin x',
    f: Math.sin,
    view: { x: [-6.5, 6.5], y: [-2.8, 2.8] },
    aRange: [-2.5, 2.5],
    coef: (k, a) => Math.sin(a + (k * Math.PI) / 2) / fact(k),
  },
  cos: {
    label: 'cos x',
    f: Math.cos,
    view: { x: [-6.5, 6.5], y: [-2.8, 2.8] },
    aRange: [-2.5, 2.5],
    coef: (k, a) => Math.cos(a + (k * Math.PI) / 2) / fact(k),
  },
  exp: {
    label: 'e^x',
    f: Math.exp,
    view: { x: [-4, 3.2], y: [-1.5, 8] },
    aRange: [-2, 1.5],
    coef: (k, a) => Math.exp(a) / fact(k),
  },
  ln: {
    label: 'ln(1+x)',
    f: (x) => Math.log(1 + x),
    view: { x: [-3.5, 4], y: [-3, 3] },
    aRange: [-0.8, 2.5],
    coef: (k, a) => (k === 0 ? Math.log(1 + a) : (k % 2 === 1 ? 1 : -1) / (k * (1 + a) ** k)),
  },
}

const SPEC = {
  fn: { type: 'str', default: 'sin' },
  n: { type: 'num', default: 3 },
  a: { type: 'num', default: 0 },
}
const PRE = "% fn 可取 'sin' / 'cos' / 'exp' / 'ln'；n 是阶数，a 是展开点。\n% 拖动图中的绿色圆点，就是把展开点搬到别处。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const fmt = (v) => {
  const s = Math.abs(v).toFixed(3)
  const t = s.replace(/\.?0+$/, '')
  return t === '' ? '0' : t
}

// P_n(x) 的 KaTeX 展示：c_k·(x−a)^k，最多 7 项
function polyTex(fnObj, n, a) {
  const ks = []
  for (let k = 0; k <= n; k++) if (Math.abs(fnObj.coef(k, a)) > 1e-12) ks.push(k)
  if (ks.length === 0) return '0'
  const xa = Math.abs(a) < 1e-9 ? 'x' : `\\left(x${a > 0 ? '-' : '+'}${fmt(Math.abs(a))}\\right)`
  const shown = ks.slice(0, 7)
  let tex = ''
  shown.forEach((k, i) => {
    const c = fnObj.coef(k, a)
    const cTex = fmt(Math.abs(c))
    tex += c > 0 ? (i === 0 ? '' : ' + ') : i === 0 ? '-' : ' - '
    tex += `${k === 0 ? cTex : cTex === '1' ? '' : cTex}${k > 0 ? xa : ''}${k > 1 ? `^{${k}}` : ''}`
  })
  if (ks.length > 7) tex += ' + \\cdots'
  return tex
}

export default function Taylor() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)

  const fnKey = FNS[vals.fn] ? vals.fn : 'sin'
  const fn = FNS[fnKey]
  const n = Math.round(clamp(Number.isFinite(vals.n) ? vals.n : 3, 0, 15))
  const a = clamp(Number.isFinite(vals.a) ? vals.a : 0, fn.aRange[0], fn.aRange[1])

  // 泰勒多项式 P_n(x) = Σ coef_k·(x−a)^k（秦九韶算法）
  const poly = (x) => {
    let p = 0
    for (let k = n; k >= 0; k--) p = p * (x - a) + fn.coef(k, a)
    return p
  }

  const pt = useMovablePoint([a, fn.f(a)], {
    constrain: ([x]) => {
      const cx = clamp(x, fn.aRange[0], fn.aRange[1])
      return [cx, fn.f(cx)]
    },
    color: Theme.green,
  })

  // 拖动展开点 ↔ 代码参数 a 双向同步
  const sync = useMovableSync(pt, [a, fn.f(a)], (px) => setParam('a', Math.round(px * 100) / 100))

  const err1 = Math.abs(fn.f(a + 1) - poly(a + 1))
  const err2 = Math.abs(fn.f(a + 2) - poly(a + 2))

  const onClick = (pt2) => {
    if (distToPoint(pt2, [a, fn.f(a)]) < 0.35)
      return setBubble({
        at: pt2,
        text: `展开点 x = a = ${a.toFixed(2)}：多项式在这里与 f 完全重合，而且前 n 阶导数都相同——这是"最贴合的模仿起点"。拖动它试试！`,
      })
    if (distToCurve(pt2, poly, 8) < 0.35)
      return setBubble({
        at: pt2,
        text: `橙色曲线是 ${n} 阶泰勒多项式 P_${n}(x)：只用加减乘，就能在 a 附近模仿 f。阶数越高，模仿的范围越大。`,
      })
    if (distToCurve(pt2, fn.f, 8) < 0.35)
      return setBubble({
        at: pt2,
        text: `蓝色曲线是原函数 f(x) = ${fn.label}。泰勒级数收敛的地方，多项式越阶高越贴近它。`,
      })
    if (fnKey === 'ln' && (Math.abs(pt2[0] - (a + 1)) < 0.15 || Math.abs(pt2[0] - (a - 1)) < 0.15))
      return setBubble({
        at: pt2,
        text: `收敛半径：ln(1+x) 的泰勒级数只在 |x − a| < 1 收敛。虚线之外（撞上 x = −1 的奇点）多项式必然跑飞。`,
      })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'f(x) 原函数', color: Theme.blue },
          { label: `P_${n}(x) 泰勒多项式`, color: Theme.orange },
          { label: '展开点 a（可拖动）', color: Theme.green },
        ]}
        hint="点击两条曲线或展开点可弹出注释；绿色圆点能拖着走。"
      />
      <VizMafs viewBox={fn.view} onClick={onClick}>
        <Coordinates.Cartesian />
        {fnKey === 'ln' && (
          <>
            <Line.Segment point1={[a + 1, fn.view.y[0]]} point2={[a + 1, fn.view.y[1]]} color={Theme.foreground} style="dashed" weight={1} strokeOpacity={0.5} />
            <Line.Segment point1={[a - 1, fn.view.y[0]]} point2={[a - 1, fn.view.y[1]]} color={Theme.foreground} style="dashed" weight={1} strokeOpacity={0.5} />
          </>
        )}
        <Plot.OfX y={poly} color={Theme.orange} weight={2} />
        <Plot.OfX y={fn.f} color={Theme.blue} weight={2} />
        <Text x={0.2} y={fn.f(0) - 0.6} size={14} color={Theme.green}>
          在 x = {a.toFixed(2)} 处展开
        </Text>
        <g {...sync.wrapProps}>{pt.element}</g>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented
          options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))}
          value={fnKey}
          onChange={(v) => setParam('fn', v)}
        />
        <Slider label="阶数 n" min={0} max={15} step={1} value={n} onChange={(v) => setParam('n', v)} />
        <div className="readout">
          <Katex tex={`P_{${n}}(x) = ${polyTex(fn, n, a)}`} />
        </div>
        <div className="readout">
          距展开点 1 处误差 = <b>{Number.isFinite(err1) ? err1.toFixed(4) : '—'}</b>　·　距展开点 2 处误差 ={' '}
          <b>{Number.isFinite(err2) ? err2.toFixed(4) : '—'}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="试试 fn = 'ln'、a = 0.5、n = 9，再对比 x = a±1 内外的误差——收敛半径一目了然。"
      />
    </div>
  )
}
