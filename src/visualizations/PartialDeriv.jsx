import { lazy, Suspense } from 'react'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { getFn } from './three/TangentPlane3D.jsx'

const TangentPlane3D = lazy(() => import('./three/TangentPlane3D.jsx'))

const OPTIONS = [
  { value: 'paraboloid', label: 'x²+y²' },
  { value: 'saddle', label: 'x²−y²' },
  { value: 'ripple', label: 'sin x+cos y' },
]

const SPEC = {
  fn: { type: 'str', default: 'paraboloid' },
  x0: { type: 'num', default: 0.8 },
  y0: { type: 'num', default: 0.6 },
}
const PRE = "% fn 选二元函数；x0, y0 是切点坐标。\n% 偏导 fx 是沿 x 方向切线斜率，fy 是沿 y 方向切线斜率。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function PartialDeriv() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const fnKey = OPTIONS.some((o) => o.value === vals.fn) ? vals.fn : 'paraboloid'
  const fn = getFn(fnKey)
  const x0 = clamp(Number.isFinite(vals.x0) ? vals.x0 : 0.8, fn.view.x[0] + 0.3, fn.view.x[1] - 0.3)
  const y0 = clamp(Number.isFinite(vals.y0) ? vals.y0 : 0.6, fn.view.y[0] + 0.3, fn.view.y[1] - 0.3)
  const z0 = fn.f(x0, y0)
  const fx0 = fn.fx(x0)
  const fy0 = fn.fy(y0)

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '曲面 z = f(x,y)', color: '#58a6ff' },
          { label: '切平面', color: '#f14e0e' },
          { label: '沿 x 切线（斜率=fx）', color: '#15e272' },
          { label: '沿 y 切线（斜率=fy）', color: '#ae58ff' },
        ]}
        hint="调节 x0、y0 移动切点；绿色/紫色切线分别表示 fx、fy，它们张成橙色切平面。"
      />
      <div className="viz-stage">
        <Suspense fallback={<div className="viz3d-loading">三维场景加载中…</div>}>
          <TangentPlane3D fnKey={fnKey} x0={x0} y0={y0} />
        </Suspense>
      </div>
      <div className="viz-controls">
        <Segmented options={OPTIONS} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Slider label="x₀" min={fn.view.x[0] + 0.3} max={fn.view.x[1] - 0.3} step={0.05} value={x0} onChange={(v) => setParam('x0', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <Slider label="y₀" min={fn.view.y[0] + 0.3} max={fn.view.y[1] - 0.3} step={0.05} value={y0} onChange={(v) => setParam('y0', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <div className="readout">
          f({x0.toFixed(2)}, {y0.toFixed(2)}) = <b>{z0.toFixed(4)}</b>　·　
          fx = ∂z/∂x = <b>{fx0.toFixed(4)}</b>　·　
          fy = ∂z/∂y = <b>{fy0.toFixed(4)}</b>　·　
          全微分 dz = <b>{fx0.toFixed(2)}dx + {fy0.toFixed(2)}dy</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="偏导数 = 固定另一个变量时的导数。马鞍面 z=x²−y² 在原点 fx=fy=0，但原点是鞍点不是极值——这是偏导为零不一定取极值的经典例子。"
      />
    </div>
  )
}
