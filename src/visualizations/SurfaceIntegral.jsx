import { lazy, Suspense } from 'react'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { getField } from './three/Gauss3D.jsx'

const Gauss3D = lazy(() => import('./three/Gauss3D.jsx'))

const OPTIONS = [
  { value: 'radial', label: 'F=(x,y,z)' },
  { value: 'z', label: 'F=(0,0,z)' },
  { value: 'rot', label: 'F=(−y,x,0)' },
]

const SPEC = {
  field: { type: 'str', default: 'radial' },
  r: { type: 'num', default: 1.3 },
}
const PRE = "% field 选向量场；r 是闭合曲面（球面）半径。\n% 高斯公式：∯ F·dS = ∭ (∇·F) dV。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const PI = Math.PI

export default function SurfaceIntegral() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const fieldKey = OPTIONS.some((o) => o.value === vals.field) ? vals.field : 'radial'
  const field = getField(fieldKey)
  const r = clamp(Number.isFinite(vals.r) ? vals.r : 1.3, 0.5, 2.2)

  const volume = (4 / 3) * PI * r * r * r
  const flux = field.div * volume

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '闭合曲面 ∂Ω', color: '#58a6ff' },
          { label: '场向量 F（绿=流出 红=流入）', color: '#15e272' },
        ]}
        hint="高斯公式：穿过闭合曲面的总通量 = 内部散度的体积分。散度为 0 时净通量为 0（流入=流出）。"
      />
      <div className="viz-stage">
        <Suspense fallback={<div className="viz3d-loading">三维场景加载中…</div>}>
          <Gauss3D fieldKey={fieldKey} r={r} />
        </Suspense>
      </div>
      <div className="viz-controls">
        <Segmented options={OPTIONS} value={fieldKey} onChange={(v) => setParam('field', v)} />
        <Slider label="球面半径 r" min={0.5} max={2.2} step={0.05} value={r} onChange={(v) => setParam('r', Math.round(v * 100) / 100)} format={(v) => v.toFixed(2)} />
        <div className="readout">
          散度 ∇·F = <b>{field.div}</b>　·　球体积 V = 4/3·πr³ = <b>{volume.toFixed(5)}</b>　·　
          通量 ∯F·dS = ∭(∇·F)dV = <b>{flux.toFixed(5)}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="高斯公式是格林公式的三维推广：边界的通量 = 内部源头的总产出。F=(x,y,z) 散度=3，像处处在冒水；F=(−y,x,0) 散度=0，纯旋转没有源汇，净流量为 0。"
      />
    </div>
  )
}
