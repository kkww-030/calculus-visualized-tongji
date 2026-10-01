import { useEffect, useMemo, useState } from 'react'
import { Coordinates, Plot, Line, Point, Text, Theme, useMovablePoint } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { useMovableSync } from './useMovableSync.js'

const FNS = {
  parabola: { label: 'x²', f: (x) => x * x, fp: (x) => 2 * x, view: { x: [-2.5, 2.5], y: [-1, 5] }, aRange: [-2, 0.5], bRange: [-0.5, 2], aRolleRange: [-2, -0.15] },
  cubic: { label: 'x³ − 3x', f: (x) => x * x * x - 3 * x, fp: (x) => 3 * x * x - 3, view: { x: [-2.5, 2.5], y: [-3, 3] }, aRange: [-2, -0.2], bRange: [0.2, 2] },
  sin: { label: 'sin x', f: Math.sin, fp: Math.cos, view: { x: [-1, 7], y: [-1.5, 1.5] }, aRange: [0, 2], bRange: [2.5, 6], aRolleRange: [0, 0.6] },
}

const SPEC = {
  fn: { type: 'str', default: 'parabola' },
  a: { type: 'num', default: -1 },
  b: { type: 'num', default: 1.5 },
  rolle: { type: 'str', default: 'off' },
}
const PRE = "% fn 可取 'parabola' / 'cubic' / 'sin'；\n% a, b 是区间端点；rolle='on' 时把端点拉到同高，演示罗尔定理。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 在 [a,b] 内求 f'(x) = slope 的所有根（采样 + 二分）
function findXi(f, fp, a, b, slope, n = 400) {
  const roots = []
  let prev = fp(a) - slope
  for (let i = 1; i <= n; i++) {
    const x = a + ((b - a) * i) / n
    const cur = fp(x) - slope
    if (prev * cur <= 0 && i > 0) {
      // 二分求精
      let lo = a + ((b - a) * (i - 1)) / n
      let hi = x
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2
        if ((fp(mid) - slope) * (fp(lo) - slope) <= 0) hi = mid
        else lo = mid
      }
      roots.push((lo + hi) / 2)
    }
    prev = cur
  }
  return roots
}

export default function MeanValue() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)

  const fnKey = FNS[vals.fn] ? vals.fn : 'parabola'
  const fn = FNS[fnKey]
  const rolle = vals.rolle === 'on'
  // 罗尔模式下 a 要用更窄的范围，保证区间内一定找得到 f(b)=f(a) 的右端点
  const aUseRange = rolle && fn.aRolleRange ? fn.aRolleRange : fn.aRange
  let a = clamp(Number.isFinite(vals.a) ? vals.a : -1, aUseRange[0], aUseRange[1])
  let b = clamp(Number.isFinite(vals.b) ? vals.b : 1.5, fn.bRange[0], fn.bRange[1])

  // 罗尔模式：自动调整 b 使 f(b)=f(a)（在 b 范围内搜索）
  if (rolle) {
    const target = fn.f(a)
    let bestB = b
    let bestDiff = Infinity
    for (let i = 0; i <= 200; i++) {
      const tb = fn.bRange[0] + ((fn.bRange[1] - fn.bRange[0]) * i) / 200
      if (tb <= a + 0.05) continue
      const d = Math.abs(fn.f(tb) - target)
      if (d < bestDiff) {
        bestDiff = d
        bestB = tb
      }
    }
    b = bestB
  }

  const fa = fn.f(a)
  const fb = fn.f(b)
  const slope = (fb - fa) / (b - a)
  const xis = useMemo(() => findXi(fn.f, fn.fp, a, b, slope), [fn, a, b, slope])

  // 罗尔模式（含滑块改 a、切换函数、刚进入罗尔）：把自动求出的同高点 b 写回参数，
  // 这样关闭罗尔后 b 仍保持合理值，不会出现 b≤a
  useEffect(() => {
    if (!rolle) return
    const cur = Number.isFinite(vals.b) ? vals.b : b
    if (Math.abs(cur - b) > 0.006) setParam('b', Math.round(b * 1000) / 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolle, a, b, fnKey])

  // 端点可拖点（钳制在各自范围，并保证 a < b）
  const ptA = useMovablePoint([a, fa], {
    constrain: ([px]) => [clamp(px, aUseRange[0], Math.min(aUseRange[1], b - 0.1)), fn.f(px)],
    color: Theme.blue,
  })
  const ptB = useMovablePoint([b, fb], {
    constrain: ([px]) => [clamp(px, Math.max(fn.bRange[0], a + 0.1), fn.bRange[1]), fn.f(px)],
    color: Theme.red,
  })

  // 拖动 ↔ 参数双向同步；罗尔模式下 b 由 a 自动决定，拖动 a 时一并写回 b
  const syncA = useMovableSync(ptA, [a, fa], (px) => {
    setParam('a', Math.round(px * 100) / 100)
    if (rolle) setParam('b', Math.round(b * 100) / 100)
  })
  const syncB = useMovableSync(ptB, [b, fb], (px) => setParam('b', Math.round(px * 100) / 100))

  const onClick = (p) => {
    for (const xi of xis) {
      if (Math.abs(p[0] - xi) < 0.12 && Math.abs(p[1] - fn.f(xi)) < 0.2)
        return setBubble({
          at: [xi, fn.f(xi)],
          text: `ξ = ${xi.toFixed(3)}：f'(ξ) = ${fn.fp(xi).toFixed(4)}，恰好等于割线斜率 (f(b)−f(a))/(b−a) = ${slope.toFixed(4)}。这里的切线与两端连线平行。`,
        })
    }
    if (Math.abs(p[1] - (fa + slope * (p[0] - a))) < 0.15 && p[0] > a - 0.2 && p[0] < b + 0.2)
      return setBubble({ at: p, text: `割线斜率 = (f(b)−f(a))/(b−a) = (${fb.toFixed(3)}−${fa.toFixed(3)})/(${b.toFixed(2)}−${a.toFixed(2)}) = ${slope.toFixed(4)}。中值定理保证存在 ξ 使切线斜率等于它。` })
    if (Math.abs(p[0] - a) < 0.12)
      return setBubble({ at: [a, fa], text: `左端点 a = ${a.toFixed(2)}，f(a) = ${fa.toFixed(3)}。蓝色点可拖动。` })
    if (Math.abs(p[0] - b) < 0.12)
      return setBubble({ at: [b, fb], text: `右端点 b = ${b.toFixed(2)}，f(b) = ${fb.toFixed(3)}。红色点可拖动。${rolle ? '罗尔模式下已自动调到 f(b)=f(a)。' : ''}` })
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: 'f(x) 曲线', color: Theme.blue },
          { label: '割线（端点连线）', color: Theme.violet, dashed: true },
          { label: 'ξ 处切线（平行于割线）', color: Theme.orange },
        ]}
        hint="拖动蓝/红端点改变区间；绿色 ξ 点就是中值定理保证存在的点。"
      />
      <VizMafs viewBox={fn.view} onClick={onClick}>
        <Coordinates.Cartesian />
        <Plot.OfX y={fn.f} color={Theme.blue} weight={2} />
        {/* 割线 */}
        <Line.Segment point1={[a - 0.3, fa - slope * 0.3]} point2={[b + 0.3, fb + slope * 0.3]} color={Theme.violet} weight={1.5} style="dashed" />
        {/* ξ 处切线 */}
        {xis.map((xi, i) => {
          const ty = fn.f(xi)
          const dx = 0.8
          return (
            <Line.Segment key={i} point1={[xi - dx, ty - slope * dx]} point2={[xi + dx, ty + slope * dx]} color={Theme.orange} weight={2.2} />
          )
        })}
        <g {...syncA.wrapProps}>{ptA.element}</g>
        {rolle ? (
          <Point x={b} y={fb} color={Theme.red} />
        ) : (
          <g {...syncB.wrapProps}>{ptB.element}</g>
        )}
        {xis.map((xi, i) => (
          <Point key={i} x={xi} y={fn.f(xi)} color={Theme.green} />
        ))}
        {xis.map((xi, i) => (
          <Text key={i} x={xi} y={fn.f(xi) + 0.15} size={12} color={Theme.green} attach="s">
            ξ{i + 1}={xi.toFixed(2)}
          </Text>
        ))}
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
      </VizMafs>
      <div className="viz-controls">
        <Segmented options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Segmented
          options={[
            { value: 'off', label: '拉格朗日' },
            { value: 'on', label: '罗尔 (f(a)=f(b))' },
          ]}
          value={rolle ? 'on' : 'off'}
          onChange={(v) => setParam('rolle', v)}
        />
        <Slider label="a" min={aUseRange[0]} max={aUseRange[1]} step={0.01} value={a} onChange={(v) => setParam('a', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        {rolle ? (
          <div className="readout" style={{ fontSize: 13, color: '#8b95a5' }}>
            罗尔模式：b 已自动取为同高点 f(b)=f(a)，b = <b>{b.toFixed(3)}</b>（割线水平，f′(ξ)=0）
          </div>
        ) : (
          <Slider label="b" min={fn.bRange[0]} max={fn.bRange[1]} step={0.01} value={b} onChange={(v) => setParam('b', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        )}
        <div className="readout">
          割线斜率 = <b>{slope.toFixed(4)}</b>　·　找到 ξ 个数 = <b>{xis.length}</b>　·　f'(ξ) 验证 ={' '}
          <b>{xis.length ? xis.map((x) => fn.fp(x).toFixed(4)).join(', ') : '无'}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="试试 fn='cubic'、a=-1.5、b=1.5，会找到两个 ξ（三次函数在区间内有两处切线平行于割线）。"
      />
    </div>
  )
}
