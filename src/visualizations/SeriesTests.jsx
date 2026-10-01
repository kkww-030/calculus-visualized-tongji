import { useMemo, useState } from 'react'
import { Coordinates, Line, Plot, Point, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'

const SERIES = {
  p2: { label: 'Σ 1/n²', u: (n) => 1 / (n * n), limit: Math.PI * Math.PI / 6, converge: true },
  harmonic: { label: 'Σ 1/n', u: (n) => 1 / n, limit: null, converge: false },
  invfact: { label: 'Σ 1/n!', u: (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return 1 / f }, limit: Math.E - 1, converge: true },
  alt: { label: 'Σ (−1)ⁿ⁺¹/n', u: (n) => (n % 2 ? 1 : -1) / n, limit: Math.log(2), converge: true },
}

const SPEC = {
  series: { type: 'str', default: 'p2' },
  n: { type: 'num', default: 30 },
}
const PRE = "% series 选级数；n 是计算到的项数。\n% 展示部分和数列 Sₙ，以及比值/根值审敛法的极限。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function SeriesTests() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const key = SERIES[vals.series] ? vals.series : 'p2'
  const s = SERIES[key]
  const N = Math.round(clamp(Number.isFinite(vals.n) ? vals.n : 30, 3, 200))

  const data = useMemo(() => {
    const terms = []
    let S = 0
    const partials = []
    for (let n = 1; n <= N; n++) {
      const u = s.u(n)
      terms.push(u)
      S += u
      partials.push(S)
    }
    // 比值审敛：|u_{n+1}/u_n| 极限（用最后几项估计）
    let ratio = NaN
    if (N >= 2) {
      const ratios = []
      for (let n = Math.max(1, N - 10); n < N; n++) {
        if (Math.abs(terms[n - 1]) > 1e-15) ratios.push(Math.abs(terms[n] / terms[n - 1]))
      }
      if (ratios.length) ratio = ratios[ratios.length - 1]
    }
    // 根值审敛：|u_n|^(1/n) 极限
    let root = NaN
    if (N >= 1) root = Math.pow(Math.abs(terms[N - 1]), 1 / N)
    return { terms, partials, ratio, root }
  }, [s, N])

  const S_N = data.partials[N - 1]
  const last = data.partials[data.partials.length - 1]
  const yMax = Math.max(2, Math.ceil(Math.max(...data.partials.map((v) => Math.abs(v))) * 1.2))

  const onClick = (p) => {
    const n = Math.round(p[0])
    if (n >= 1 && n <= N) {
      const Sn = data.partials[n - 1]
      if (Math.abs(p[1] - Sn) < yMax * 0.15)
        return setBubble({ at: [n, Sn], text: `第 ${n} 项部分和 S_${n} = Σ_{k=1}^${n} u_k = ${Sn.toFixed(6)}。${s.converge ? `极限 = ${s.limit.toFixed(6)}` : '级数发散，Sₙ 不收敛。'}` })
    }
    setBubble(null)
  }

  // 用折线画 Sₙ
  const pts = data.partials.map((v, i) => [i + 1, v])

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '部分和数列 Sₙ', color: Theme.blue },
          ...(s.converge ? [{ label: `极限 S = ${s.limit?.toFixed(4)}`, color: Theme.orange, dashed: true }] : []),
        ]}
        hint="部分和数列 Sₙ 有极限 ⇔ 级数收敛。比值法极限＜1 收敛、＞1 发散；根值法同理。"
      />
      <VizMafs viewBox={{ x: [0, N + 1], y: [-yMax * 0.3, yMax] }} onClick={onClick}>
        <Coordinates.Cartesian yAxis={{ labels: false }} />
        {s.converge && s.limit != null && (
          <Plot.OfX y={() => s.limit} color={Theme.orange} weight={1.5} style="dashed" />
        )}
        {pts.slice(0, -1).map((p, i) => (
          <Line.Segment key={i} point1={p} point2={pts[i + 1]} color={Theme.blue} weight={1.5} />
        ))}
        {pts.map((p, i) => (
          <Point key={i} x={p[0]} y={p[1]} color={Theme.blue} />
        ))}
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={Object.entries(SERIES).map(([v, f]) => ({ value: v, label: f.label }))} value={key} onChange={(v) => setParam('series', v)} />
        <Slider label="项数 N" min={3} max={200} step={1} value={N} onChange={(v) => setParam('n', v)} />
        <div className="readout">
          S_N = <b>{S_N.toFixed(6)}</b>　·　
          {s.converge ? `极限 S = <b>${s.limit.toFixed(6)}</b>　·　|S_N − S| = <b>${Math.abs(S_N - s.limit).toExponential(2)}</b>` : '该级数发散（调和级数）'}
        </div>
        <div className="readout">
          比值法 lim|uₙ₊₁/uₙ| ≈ <b>{Number.isFinite(data.ratio) ? data.ratio.toFixed(4) : '—'}</b>　
          {Number.isFinite(data.ratio) ? (data.ratio < 1 ? '＜1 → 收敛' : data.ratio > 1 ? '＞1 → 发散' : '=1 → 失效') : ''}
          {'　·　'}根值法 lim|uₙ|^(1/n) ≈ <b>{Number.isFinite(data.root) ? data.root.toFixed(4) : '—'}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="Σ1/n² 收敛到 π²/6≈1.6449；Σ1/n（调和级数）发散到 ∞；Σ1/n! 收敛到 e−1；交错调和 Σ(−1)ⁿ⁺¹/n 收敛到 ln2。比值/根值法对调和级数都失效（极限=1）。"
      />
    </div>
  )
}
