import { lazy, Suspense } from 'react'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { getSurface } from './three/QuadricSurface3D.jsx'

const QuadricSurface3D = lazy(() => import('./three/QuadricSurface3D.jsx'))

const OPTIONS = [
  { value: 'sphere', label: '球面' },
  { value: 'ellipsoid', label: '椭球面' },
  { value: 'paraboloid', label: '椭圆抛物面' },
  { value: 'saddle', label: '马鞍面' },
  { value: 'hyperboloid', label: '单叶双曲面' },
  { value: 'cone', label: '锥面' },
]

const SPEC = {
  type: { type: 'str', default: 'paraboloid' },
  a: { type: 'num', default: 1.4 },
  b: { type: 'num', default: 1.4 },
  c: { type: 'num', default: 1.5 },
}
const PRE = "% type 选曲面类型；a, b, c 是形状参数（不同曲面用到的参数不同）。\n% 球面：只有 a=R；椭球：a,b,c 三轴；抛物面/马鞍：a,b；双曲面/锥面：a,b,c。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function SpaceGeom() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const type = OPTIONS.some((o) => o.value === vals.type) ? vals.type : 'paraboloid'
  const surf = getSurface(type)
  const def = surf.params
  const a = clamp(Number.isFinite(vals.a) ? vals.a : def.a, 0.4, 3)
  const b = clamp(Number.isFinite(vals.b) ? vals.b : def.b, 0.4, 3)
  const c = clamp(Number.isFinite(vals.c) ? vals.c : def.c, 0.4, 3)

  // 切换曲面时把参数重置为该曲面的默认值（避免上一个曲面的参数让新曲面畸形）
  const switchType = (v) => {
    setParam('type', v)
    const d = getSurface(v).params
    setParam('a', d.a)
    setParam('b', d.b)
    setParam('c', d.c)
  }

  return (
    <div className="viz-inner">
      <Legend
        items={[{ label: surf.eq, color: '#58a6ff' }]}
        hint="按住拖动旋转视角、滚轮缩放；切换曲面类型并调节 a/b/c 参数。"
      />
      <div className="viz-stage">
        <Suspense fallback={<div className="viz3d-loading">三维曲面加载中…</div>}>
          <QuadricSurface3D type={type} a={a} b={b} c={c} />
        </Suspense>
      </div>
      <div className="viz-controls">
        <Segmented options={OPTIONS} value={type} onChange={switchType} />
        <Slider label="a" min={0.4} max={3} step={0.1} value={a} onChange={(v) => setParam('a', Math.round(v * 10) / 10)} format={(v) => v.toFixed(1)} />
        <Slider label="b" min={0.4} max={3} step={0.1} value={b} onChange={(v) => setParam('b', Math.round(v * 10) / 10)} format={(v) => v.toFixed(1)} />
        <Slider label="c" min={0.4} max={3} step={0.1} value={c} onChange={(v) => setParam('c', Math.round(v * 10) / 10)} format={(v) => v.toFixed(1)} />
      </div>
      <CodePanel code={code} onCodeChange={setCode} onRun={run} onReset={reset} output={out} error={error} hint="试试马鞍面：z=x²−y² 在原点是鞍点；单叶双曲面 x²+y²−z²=1 是直纹面（可由直线运动生成）。" />
    </div>
  )
}
