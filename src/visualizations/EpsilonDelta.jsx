import { useState } from 'react'
import { Coordinates, Plot, Polygon, Point, Text, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { distToPoint, distToCurve } from './hit.js'
import { useMovableSync } from './useMovableSync.js'

const PRESETS = [
  { value: 'x.^2 / 4', label: '抛物线' },
  { value: 'sin(x) + 1', label: 'sin' },
  { value: 'abs(x) / 2', label: '|x|' },
]

const SPEC = {
  f: { type: 'fn', default: 'x.^2 / 4' },
  a: { type: 'num', default: 1 },
  eps: { type: 'num', default: 0.8 },
}
const PRE = '% eps 是允许误差，a 是极限点；\n% 修改后点「运行代码」，图形与滑块会同步变化。\n'

const STEP = 0.002
// 数值求最大 δ: 使 (a-δ, a+δ) 内恒有 |f(x) - f(a)| < ε
function maxDelta(F, a, eps) {
  const L = F(a)
  let dL = 0
  let dR = 0
  while (a - dL - STEP > -4.5 && Math.abs(F(a - dL - STEP) - L) < eps) dL += STEP
  while (a + dR + STEP < 4.5 && Math.abs(F(a + dR + STEP) - L) < eps) dR += STEP
  return Math.min(dL, dR)
}

const VIEW = { x: [-4.2, 4.2], y: [-1.2, 3.6] }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function EpsilonDelta() {
  const { vals, fns, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const [mode, setMode] = useState('practice') // practice | challenge
  const [guess, setGuess] = useState(0.5) // 挑战模式下用户给出的 δ
  const [verdict, setVerdict] = useState(null) // { ok, msg }
  const [streak, setStreak] = useState(0)

  const F = fns.f
  const aPt = useMovablePoint([vals.a, F(vals.a)], {
    constrain: ([x]) => {
      const cx = clamp(x, -3.2, 3.2)
      return [cx, F(cx)]
    },
    color: Theme.blue,
  })

  // 极限点拖点 ↔ 代码参数 a 双向同步
  const targetA = clamp(Number.isFinite(vals.a) ? vals.a : 0, -3.2, 3.2)
  const sync = useMovableSync(aPt, [targetA, F(targetA)], (px) => setParam('a', Math.round(px * 100) / 100))

  const eps = clamp(Number.isFinite(vals.eps) ? vals.eps : 0.8, 0.05, 1.5)
  const a = aPt.x
  const L = F(a)
  const delta = maxDelta(F, a, eps)
  const shownDelta = mode === 'challenge' ? guess : delta // 挑战模式下不提前泄露答案

  const newQuiz = () => {
    const na = Math.round((Math.random() * 5 - 2.5) * 10) / 10
    const ne = Math.round((0.2 + Math.random() * 0.7) * 100) / 100
    setParam('a', clamp(na, -2.5, 2.5))
    setParam('eps', ne)
    setGuess(0.3)
    setVerdict(null)
  }

  const check = () => {
    const best = maxDelta(F, a, eps)
    const xBad = a + guess + STEP
    const over = Math.abs(F(xBad) - L) >= eps
    if (guess <= best + 0.005) {
      setStreak((s) => s + 1)
      setVerdict({ ok: true, msg: `合法！其实最大 δ ≈ ${best.toFixed(3)}，你给出了 ${guess.toFixed(2)}。连胜 ${streak + 1} 题。` })
    } else {
      setStreak(0)
      setVerdict({
        ok: false,
        msg: `太宽了：在 x = ${xBad.toFixed(3)} 处 |f(x) − A| = ${Math.abs(F(xBad) - L).toFixed(3)} ≥ ε。把 δ 缩小试试（最大 δ ≈ ${best < 0.005 ? '几乎为 0' : best.toFixed(3)}）。`,
      })
    }
  }

  const onClick = (pt) => {
    if (distToPoint(pt, [a, L]) < 0.3)
      return setBubble({ at: pt, text: `点 (a, f(a))：a = ${a.toFixed(2)}，A = f(a) = ${Number.isFinite(L) ? L.toFixed(4) : '—'}。极限关心的是 a 附近的"趋势"，与 A 处发生什么无关。` })
    if (Math.abs(pt[1] - (L + eps)) < 0.18 || Math.abs(pt[1] - (L - eps)) < 0.18)
      return setBubble({ at: pt, text: `ε 边界线：A ± ε = ${(L + eps).toFixed(3)} / ${(L - eps).toFixed(3)}。ε 是你（挑战者）提出的精度要求。` })
    if (Math.abs(pt[0] - (a - shownDelta)) < 0.15 || Math.abs(pt[0] - (a + shownDelta)) < 0.15)
      return setBubble({ at: pt, text: `δ 邻域边界：x 距 a 必须小于 δ = ${shownDelta.toFixed(3)}，曲线才能全程留在 ε 带内。` })
    if (Math.abs(pt[0] - a) < shownDelta + 0.1 && Math.abs(pt[1] - L) < eps + 0.1)
      return setBubble({ at: pt, text: '绿色区域内的曲线全部落在橙色横带里——这正是 ε-δ 定义要求的"恒有 |f(x) − A| < ε"。' })
    if (distToCurve(pt, F, 6) < 0.3)
      return setBubble({ at: pt, text: `曲线 y = f(x) = ${vals.f}。ε 越小，能用的 δ 就越窄——极限是一种"想多近就能多近"的保证。` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'f(x) 曲线', color: Theme.blue },
          { label: 'ε 横带（误差要求）', color: Theme.orange },
          { label: 'δ 竖带（能给出的回应）', color: Theme.green },
          { label: '极限点 a（可拖动）', color: Theme.red },
        ]}
        hint="点击横带、竖带、曲线或红点可弹出注释。"
      />
      <VizMafs viewBox={VIEW} onClick={onClick}>
        <Coordinates.Cartesian />
        <Polygon
          points={[
            [-4.2, L - eps],
            [4.2, L - eps],
            [4.2, L + eps],
            [-4.2, L + eps],
          ]}
          color={Theme.orange}
          fillOpacity={0.14}
          strokeOpacity={0}
        />
        <Polygon
          points={[
            [a - shownDelta, -1.2],
            [a + shownDelta, -1.2],
            [a + shownDelta, 3.6],
            [a - shownDelta, 3.6],
          ]}
          color={Theme.green}
          fillOpacity={0.14}
          strokeOpacity={0}
        />
        <Plot.OfX y={F} color={Theme.blue} weight={2} />
        <Point x={a} y={L} color={Theme.red} />
        <Text x={-4.05} y={Math.min(3.45, L + eps - 0.22)} size={14} color={Theme.orange} attach="w">
          A + ε
        </Text>
        <Text x={-4.05} y={Math.max(-1.05, L - eps + 0.24)} size={14} color={Theme.orange} attach="w">
          A − ε
        </Text>
        <Text x={a} y={-1.0} size={14} color={Theme.green}>
          δ 邻域
        </Text>
        <g {...sync.wrapProps}>{aPt.element}</g>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented
          options={[
            { value: 'practice', label: '练习模式' },
            { value: 'challenge', label: '挑战模式' },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v)
            setVerdict(null)
            if (v === 'challenge') newQuiz()
          }}
        />
        <Slider
          label="ε（允许误差）"
          min={0.05}
          max={1.5}
          step={0.01}
          value={eps}
          onChange={(v) => setParam('eps', v)}
          format={(v) => v.toFixed(2)}
        />
        {mode === 'challenge' ? (
          <>
            <div className="ctrl-row">
              <Slider
                label="你给出的 δ"
                min={0}
                max={2}
                step={0.01}
                value={guess}
                onChange={setGuess}
                format={(v) => v.toFixed(2)}
              />
              <button className="ctrl-play" onClick={check}>
                检查
              </button>
              <button className="ctrl-reset" onClick={newQuiz}>
                换一题
              </button>
            </div>
            {verdict && (
              <div className="readout" style={verdict.ok ? { color: '#15803d' } : { color: '#b91c1c' }}>
                {verdict.ok ? '通过：' : '未通过：'}
                {verdict.msg}
              </div>
            )}
            <p className="hint">
              系统随机指定 a 和 ε，你负责给出 δ：只有当 (a−δ, a+δ) 内曲线完全落入 ε 横带才算合法。绿色竖带此刻显示的是你的 δ。
            </p>
          </>
        ) : (
          <div className="readout">
            A = f(a) = <b>{Number.isFinite(L) ? L.toFixed(4) : '—'}</b>　·　最大 δ = <b>{delta.toFixed(3)}</b>
          </div>
        )}
        {mode === 'practice' && (
          <p className="hint">
            练习：拖动蓝点选 a，把 ε 拖小，绿色 δ 竖带会被迫收缩。切到「挑战模式」自己出题考自己。
          </p>
        )}
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="试试把 f 换成 abs(x) / 2 并让 a = 0 —— 在尖点处无论 ε 多大 δ 都很宽，而光滑点则不然。"
      />
    </div>
  )
}
