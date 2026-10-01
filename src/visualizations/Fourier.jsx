import { lazy, Suspense, useState } from 'react'
import { Coordinates, Plot, Circle, Line, Point, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, PlayButton, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { useAnimClock } from './anim.js'
import { distToSegment, distToPoint } from './hit.js'
import { WAVES, WAVE_OPTIONS } from './waves.js'

const Fourier3D = lazy(() => import('./three/Fourier3D.jsx'))

const CX = -3.8
const WAVE_X0 = CX + 1.6
const WAVE_W = 9
const VIEW = { x: [CX - 2.4, WAVE_X0 + WAVE_W], y: [-1.7, 1.8] }

const SPEC = {
  wave: { type: 'str', default: 'square' },
  n: { type: 'num', default: 5 },
}
const PRE = "% wave 可取 'square' / 'triangle' / 'sawtooth' / 'pulse' / 'rect'；\n% n 是参与叠加的谐波个数。改完点「运行代码」看波形变化。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function Fourier() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const [dim, setDim] = useState('2d')
  const [playing, setPlaying] = useState(true)
  const [t, setT] = useAnimClock(playing, 1.2)

  const waveKey = WAVES[vals.wave] ? vals.wave : 'square'
  const W = WAVES[waveKey]
  const n = Math.round(clamp(Number.isFinite(vals.n) ? vals.n : 5, 1, 30))

  // 圆链：逐级累加旋转矢量 c_m·e^{imt}
  const chain = [{ x: CX, y: W.c0 }]
  let px = CX
  let py = W.c0
  for (let m = 1; m <= n; m++) {
    const z = W.c(m)
    const r = Math.hypot(z.re, z.im)
    if (r < 1e-9) continue
    const ang = Math.atan2(z.im, z.re) + m * t
    px += r * Math.cos(ang)
    py += r * Math.sin(ang)
    chain.push({ x: px, y: py, r, m })
  }
  const tip = chain[chain.length - 1]

  // 部分和 S(θ) = c_0 + 2·Σ Re(c_m·e^{imθ})
  const S = (theta) => {
    let s = W.c0
    for (let m = 1; m <= n; m++) {
      const z = W.c(m)
      s += 2 * (z.re * Math.cos(m * theta) - z.im * Math.sin(m * theta))
    }
    return s
  }

  const onClick = (pt) => {
    // 圆盘（圆周命中）
    for (let i = 1; i < chain.length; i++) {
      const c = chain[i]
      const d = Math.abs(Math.hypot(pt[0] - chain[i - 1].x, pt[1] - chain[i - 1].y) - c.r)
      if (c.r > 1e-6 && d < 0.16)
        return setBubble({
          at: pt,
          text: `第 ${c.m} 次谐波：半径（振幅）= ${c.r.toFixed(4)}，转速 = ${c.m} 倍。${W.radiusTip}`,
        })
    }
    if (distToPoint(pt, [tip.x, tip.y]) < 0.22)
      return setBubble({ at: pt, text: `笔尖 = 前 ${n} 项部分和 S(t) = ${tip.y.toFixed(4)}。它一边转，一边把纵坐标"写"到右边。` })
    if (pt[0] > WAVE_X0 - 0.15) {
      const u = pt[0] - WAVE_X0
      if (Math.abs(S(t + u) - pt[1]) < 0.3)
        return setBubble({
          at: pt,
          text: W.gibbs
            ? '部分和曲线：谐波越多越贴近目标波形，但跳变点附近始终残留约 9% 的尖峰——吉布斯现象，增加 n 也消不掉。'
            : `部分和曲线：${W.label}没有跳变，收敛又快又均匀，几乎看不到吉布斯尖峰。`,
        })
      if (Math.abs(W.target(t + u) - pt[1]) < 0.3)
        return setBubble({ at: pt, text: `目标波形：${W.label}。傅里叶级数的任务就是用一群 sin/cos 把它拼出来。` })
    } else {
      if (distToSegment(pt, [tip.x, tip.y], [WAVE_X0, S(t)]) < 0.2)
        return setBubble({ at: pt, text: '笔尖的纵坐标被水平引到右侧起点，随时间推进就"扫"出了波形。' })
      if (Math.abs(pt[1] - W.c0) < 0.18 && pt[0] < WAVE_X0)
        return setBubble({ at: pt, text: '圆链中心：第一个圆盘绕它旋转。若波形有直流分量（如整流正弦），中心会整体抬升。' })
    }
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '谐波圆盘链', color: Theme.orange },
          { label: '部分和 S_n(t)', color: Theme.blue },
          { label: `目标波形（${W.label}）`, color: Theme.foreground, dashed: true },
        ]}
        hint="点击圆盘、笔尖或曲线可弹出注释；切换波形看不同的「谐波配方」；右上角可切三维螺旋视图。"
      />
      <div className="viz-stage">
        <div className="viz-viewbar">
          <Segmented
            options={[
              { value: '2d', label: '二维' },
              { value: '3d', label: '三维' },
            ]}
            value={dim}
            onChange={setDim}
          />
        </div>
        {dim === '2d' ? (
          <VizMafs viewBox={VIEW} onClick={onClick}>
        <Coordinates.Cartesian yAxis={{ labels: false }} />
        <Plot.OfX
          y={(x) => W.target(x - WAVE_X0 + t)}
          color={Theme.foreground}
          style="dashed"
          opacity={0.3}
        />
        <Plot.Parametric
          xy={(u) => [WAVE_X0 + u, S(t + u)]}
          domain={[-WAVE_W, 0]}
          color={Theme.blue}
          weight={2.5}
        />
        {chain.slice(1).map((c, i) => (
          <Circle
            key={c.m}
            center={[chain[i].x, chain[i].y]}
            radius={c.r}
            color={Theme.foreground}
            fillOpacity={0}
            strokeOpacity={0.4}
            weight={1}
          />
        ))}
        {chain.slice(0, -1).map((c, i) => (
          <Line.Segment
            key={`seg${i}`}
            point1={[c.x, c.y]}
            point2={[chain[i + 1].x, chain[i + 1].y]}
            color={Theme.orange}
            weight={1.5}
          />
        ))}
        <Line.Segment
          point1={[tip.x, tip.y]}
          point2={[WAVE_X0, S(t)]}
          color={Theme.green}
          weight={1.2}
          style="dashed"
        />
        <Point x={tip.x} y={tip.y} color={Theme.orange} />
        <Text x={CX} y={-1.55} size={14} color={Theme.foreground} attach="s">
          旋转圆盘链 = {W.label}的傅里叶级数
        </Text>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
          </VizMafs>
        ) : (
          <Suspense fallback={<div className="viz3d-loading">三维场景加载中…</div>}>
            <Fourier3D waveKey={waveKey} n={n} playing={playing} />
          </Suspense>
        )}
      </div>
      <div className="viz-controls">
        <div className="ctrl-row">
          <PlayButton playing={playing} onToggle={() => setPlaying(!playing)} />
          <Slider label="谐波数 n" min={1} max={30} step={1} value={n} onChange={(v) => setParam('n', v)} />
        </div>
        <Segmented
          options={Object.entries(WAVES).map(([v, w]) => ({ value: v, label: w.label }))}
          value={waveKey}
          onChange={(v) => setParam('wave', v)}
        />
        <div className="readout">
          部分和当前值 S_n(t) = <b>{tip.y.toFixed(4)}</b>　·　目标真值 = <b>{W.target(t).toFixed(2)}</b>　·　{W.radiusTip}
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="试试 wave = 'triangle'、n = 3，对比方波：光滑的波形只需要更少的谐波。"
      />
    </div>
  )
}
