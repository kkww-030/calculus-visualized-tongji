import { useMemo, useState } from 'react'
import { Coordinates, Plot, Line, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'

// view 特意扩展到收敛半径之外，好让「区间外跑飞」肉眼可见
const SERIES = {
  geo: {
    label: 'Σ xⁿ',
    a: (n) => 1,
    f: (x) => 1 / (1 - x),
    R: 1,
    view: { x: [-1.8, 1.8], y: [-5, 6] },
    clip: 6.5,
  },
  exp: {
    label: 'Σ xⁿ/n!',
    a: (n) => {
      let f = 1
      for (let i = 2; i <= n; i++) f *= i
      return 1 / f
    },
    f: Math.exp,
    R: 99,
    view: { x: [-3.2, 3.2], y: [-2, 22] },
    clip: 24,
  },
  cos: {
    label: 'Σ (−1)ⁿx²ⁿ/(2n)!',
    a: (n) => {
      if (n % 2) return 0
      const k = n / 2
      let f = 1
      for (let i = 2; i <= n; i++) f *= i
      return (k % 2 ? -1 : 1) / f
    },
    f: Math.cos,
    R: 99,
    view: { x: [-8, 8], y: [-2.5, 2.5] },
    clip: 4,
  },
  ln: {
    label: 'Σ xⁿ/n',
    a: (n) => 1 / n,
    f: (x) => -Math.log(1 - x),
    R: 1,
    view: { x: [-1.8, 0.92], y: [-3, 5] },
    clip: 5.5,
  },
}

const SPEC = {
  series: { type: 'str', default: 'geo' },
  N: { type: 'num', default: 6 },
}
const PRE = "% series 选幂级数；N 是部分和的最高项数。\n% 在收敛半径 R 内部分和逼近原函数，区间外跑飞。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function PowerSeries() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const key = SERIES[vals.series] ? vals.series : 'geo'
  const s = SERIES[key]
  const N = Math.round(clamp(Number.isFinite(vals.N) ? vals.N : 6, 0, 30))

  // 第 N 部分和 S_N(x) = Σ_{n=0}^N a_n x^n（真实值，用于读数）
  const partialSum = useMemo(() => {
    const coeffs = []
    for (let n = 0; n <= N; n++) coeffs.push(s.a(n))
    return (x) => {
      let sum = 0
      let xp = 1
      for (let n = 0; n <= N; n++) {
        sum += coeffs[n] * xp
        xp *= x
      }
      return sum
    }
  }, [s, N])

  // 绘图用：超出视图的发散值裁掉，避免一条竖线把整张图压扁
  const displaySum = useMemo(() => {
    return (x) => clamp(partialSum(x), -s.clip, s.clip)
  }, [partialSum, s.clip])

  const [xMin, xMax] = s.view.x
  const [yMin, yMax] = s.view.y
  const tolY = (yMax - yMin) * 0.07
  const R = s.R === 99 ? '∞' : s.R
  const hasR = s.R < 10

  const onClick = (p) => {
    if (p[0] < xMin || p[0] > xMax || p[1] < yMin || p[1] > yMax) return setBubble(null)
    // 收敛边界虚线
    if (hasR && Math.abs(p[0] - s.R) < 0.08)
      return setBubble({ at: [s.R, clamp(p[1], yMin + 0.3, yMax - 0.3)], text: `收敛边界 x = R = ${s.R}。右边 S_${N}(x) 不再逼近 f(x)，而是迅速发散——这就是收敛半径。` })
    if (hasR && Math.abs(p[0] + s.R) < 0.08)
      return setBubble({ at: [-s.R, clamp(p[1], yMin + 0.3, yMax - 0.3)], text: `收敛边界 x = −R = ${-s.R}。区间 (−R, R) 之外幂级数不收敛。` })
    if (Math.abs(p[1] - clamp(s.f(p[0]), -s.clip, s.clip)) < tolY)
      return setBubble({ at: p, text: `原函数 f(x)。在 |x|＜R=${R} 内，幂级数收敛到它；R 之外两者分道扬镳。` })
    if (Math.abs(p[1] - displaySum(p[0])) < tolY)
      return setBubble({ at: p, text: `部分和 S_${N}(x)（${N + 1} 次多项式）。N 越大在 (−R,R) 内越贴近 f(x)；收敛半径之外多项式迅速跑飞。` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '原函数 f(x)', color: Theme.blue },
          { label: `部分和 S_${N}(x)`, color: Theme.orange },
          ...(hasR ? [{ label: `收敛半径 R = ${R}`, color: Theme.green, dashed: true }] : []),
        ]}
        hint="绿色虚线是收敛半径 ±R：左侧多项式紧贴 f，右侧立刻跑飞。拖动 N 看贴合区间如何变化。"
      />
      <VizMafs viewBox={s.view} onClick={onClick}>
        <Coordinates.Cartesian />
        {hasR && (
          <>
            <Line.Segment point1={[s.R, yMin]} point2={[s.R, yMax]} color={Theme.green} weight={1.2} style="dashed" strokeOpacity={0.7} />
            <Line.Segment point1={[-s.R, yMin]} point2={[-s.R, yMax]} color={Theme.green} weight={1.2} style="dashed" strokeOpacity={0.7} />
            <Text x={s.R + 0.06} y={yMax - 0.25} size={12} color={Theme.green}>x=R</Text>
            <Text x={-s.R - 0.55} y={yMax - 0.25} size={12} color={Theme.green}>x=−R</Text>
          </>
        )}
        <Plot.OfX y={(x) => clamp(s.f(x), -s.clip, s.clip)} color={Theme.blue} weight={2.2} />
        <Plot.OfX y={displaySum} color={Theme.orange} weight={2} />
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={Object.entries(SERIES).map(([v, f]) => ({ value: v, label: f.label }))} value={key} onChange={(v) => setParam('series', v)} />
        <Slider label="部分和阶数 N" min={0} max={30} step={1} value={N} onChange={(v) => setParam('N', v)} />
        <div className="readout">
          收敛半径 R = <b>{R}</b>　·　
          在 x=0.5 处：S_{N} = <b>{partialSum(0.5).toFixed(5)}</b>　·　f(0.5) = <b>{s.f(0.5).toFixed(5)}</b>　·　误差 ={' '}
          <b>{Math.abs(partialSum(0.5) - s.f(0.5)).toExponential(2)}</b>
        </div>
        {hasR && (
          <div className="readout" style={{ fontSize: 13, color: '#8b95a5' }}>
            在 x=1.2（R 外）：S_{N}(1.2) = <b>{partialSum(1.2).toFixed(2)}</b>，而 f(1.2) = {s.f(1.2).toFixed(3)} —— N 越大差距反而越大
          </div>
        )}
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="Σxⁿ 是几何级数，R=1，和为 1/(1−x)；Σxⁿ/n! 是 eˣ，R=∞；Σ(−1)ⁿx²ⁿ/(2n)! 是 cos x，R=∞。注意看 R=1 的两个例子：绿色虚线右边，N 越大橙色线跑得越远。"
      />
    </div>
  )
}
