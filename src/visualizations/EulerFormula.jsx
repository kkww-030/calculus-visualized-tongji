import { lazy, Suspense, useState } from 'react'
import { Coordinates, Plot, Circle, Vector, Point, Line, Text, Theme } from 'mafs'
import VizMafs, { Bubble } from '../components/VizMafs.jsx'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, PlayButton, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { useAnimClock } from './anim.js'
import { distToPoint, distToCircle, distToSegment } from './hit.js'

const Euler3D = lazy(() => import('./three/Euler3D.jsx'))

const WAVE_X0 = 2.4
const WAVE_W = 6.5
const TAU = 2 * Math.PI
const mod2pi = (t) => ((t % TAU) + TAU) % TAU

const SPEC = {
  theta: { type: 'num', default: 0 },
  speed: { type: 'num', default: 1 },
}
const PRE = '% theta：动点角度（运行代码会把指针瞬移到该角度）；\n% speed：播放速度倍率。\n'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function EulerFormula() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [bubble, setBubble] = useState(null)
  const [dim, setDim] = useState('2d')
  const [playing, setPlaying] = useState(true)
  const speed = clamp(Number.isFinite(vals.speed) ? vals.speed : 1, 0.2, 3)
  const [theta, setTheta] = useAnimClock(playing, speed)

  const onRun = () => {
    const r = run()
    if (r && !r.error && Number.isFinite(Number(r.scope.theta))) setTheta(mod2pi(Number(r.scope.theta)))
  }

  const c = Math.cos(theta)
  const s = Math.sin(theta)

  const onClick = (pt) => {
    if (distToCircle(pt, [0, 0], 1) < 0.15 && distToPoint(pt, [c, s]) > 0.3)
      return setBubble({ at: pt, text: '单位圆：e^{iθ} 的运动轨迹，|e^{iθ}| = cos²θ + sin²θ = 1 恒成立。' })
    if (distToPoint(pt, [c, s]) < 0.3)
      return setBubble({ at: pt, text: `e^{iθ} = ${c.toFixed(3)} + ${s.toFixed(3)}·i：模长恒为 1、角度为 θ 的旋转点。乘以它 = 旋转 θ 角。` })
    if (distToSegment(pt, [c, s], [0, s]) < 0.18)
      return setBubble({ at: pt, text: `虚部投影：sin θ = ${s.toFixed(3)}——动点到实轴的（带符号）距离，向左引出绿色正弦波。` })
    if (distToSegment(pt, [c, s], [WAVE_X0, c]) < 0.18)
      return setBubble({ at: pt, text: `实部投影：cos θ = ${c.toFixed(3)}——动点在实轴上的位置，向右引出蓝色余弦波。` })
    if (pt[0] > WAVE_X0 - 0.2) {
      if (Math.abs(Math.cos(theta + (pt[0] - WAVE_X0)) - pt[1]) < 0.22)
        return setBubble({ at: pt, text: 'cos(θ+u)：动点实部的历史记录——旋转运动"铺开"成了波。' })
      if (Math.abs(Math.sin(theta + (pt[0] - WAVE_X0)) - pt[1]) < 0.22)
        return setBubble({ at: pt, text: 'sin(θ+u)：动点虚部的历史记录，与余弦波相差 90° 相位。' })
    }
    setBubble(null)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '单位圆上的动点 e^{iθ}', color: Theme.orange },
          { label: '实部 cos θ', color: Theme.blue },
          { label: '虚部 sin θ', color: Theme.green },
        ]}
        hint="点击圆、动点、投影线或波形可弹出注释；暂停后可以逐帧拖动 θ；右上角可切三维螺旋视图。"
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
          <VizMafs viewBox={{ x: [-1.6, WAVE_X0 + WAVE_W], y: [-1.6, 1.6] }} onClick={onClick}>
        <Coordinates.Cartesian yAxis={{ labels: false }} />
        <Circle center={[0, 0]} radius={1} color={Theme.foreground} fillOpacity={0} strokeOpacity={0.4} />
        <Vector tail={[0, 0]} tip={[c, s]} color={Theme.orange} weight={2} />
        <Point x={c} y={s} color={Theme.orange} />
        <Line.Segment point1={[c, s]} point2={[0, s]} color={Theme.green} weight={1.2} style="dashed" />
        <Point x={0} y={s} color={Theme.green} />
        <Plot.Parametric
          xy={(u) => [WAVE_X0 + u, Math.cos(theta + u)]}
          domain={[-WAVE_W, 0]}
          color={Theme.blue}
          weight={2.2}
        />
        <Plot.Parametric
          xy={(u) => [WAVE_X0 + u, Math.sin(theta + u)]}
          domain={[-WAVE_W, 0]}
          color={Theme.green}
          weight={1.6}
        />
        <Line.Segment point1={[c, s]} point2={[WAVE_X0, c]} color={Theme.blue} weight={1.2} style="dashed" />
        <Text x={WAVE_X0 + WAVE_W - 0.35} y={0.55} size={13} color={Theme.blue} attach="w">
          cos θ（实部）
        </Text>
        <Text x={WAVE_X0 + WAVE_W - 0.35} y={-0.6} size={13} color={Theme.green} attach="w">
          sin θ（虚部）
        </Text>
        <Bubble at={bubble?.at} text={bubble?.text} onClose={() => setBubble(null)} />
          </VizMafs>
        ) : (
          <Suspense fallback={<div className="viz3d-loading">三维场景加载中…</div>}>
            <Euler3D theta={mod2pi(theta)} />
          </Suspense>
        )}
      </div>
      <div className="viz-controls">
        <div className="ctrl-row">
          <PlayButton playing={playing} onToggle={() => setPlaying(!playing)} />
          <Slider
            label="θ（弧度）"
            min={0}
            max={6.28}
            step={0.01}
            value={mod2pi(theta)}
            onChange={(v) => {
              setTheta(v)
              if (!playing) setParam('theta', Math.round(v * 100) / 100)
            }}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="速度"
            min={0.2}
            max={3}
            step={0.1}
            value={speed}
            onChange={(v) => setParam('speed', v)}
            format={(v) => `${v.toFixed(1)}×`}
          />
        </div>
        <div className="readout">
          e^iθ = cos θ + i·sin θ = <b>{c.toFixed(3)}</b> + <b>{s.toFixed(3)}</b>·i　·　θ ={' '}
          <b>{mod2pi(theta).toFixed(2)}</b> rad
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={onRun}
        onReset={reset}
        output={out}
        error={error}
        hint="试试 theta = 3.14（指针转到 180°）、speed = 0.5（放慢一倍），观察波形如何重新生长。"
      />
    </div>
  )
}
