import { lazy, Suspense, useMemo } from 'react'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'
import { buildCells, REGIONS } from './three/tripleCells.js'

const TripleIntegral3D = lazy(() => import('./three/TripleIntegral3D.jsx'))

const FNS = {
  one: { label: 'f = 1（体积）', f: () => 1 },
  r2: { label: 'f = x²+y²+z²', f: (x, y, z) => x * x + y * y + z * z },
  sum: { label: 'f = x+y+z', f: (x, y, z) => x + y + z },
  sincos: { label: 'f = sin x·cos y', f: (x, y) => Math.sin(x) * Math.cos(y) },
}

const MODES = [
  { value: 'cart', label: '直角坐标', maxN: 14, refN: 30, countText: (n) => `${n}³ = ${n * n * n}` },
  { value: 'cyl', label: '柱坐标', maxN: 10, refN: 14, countText: (n) => `${n}×${2 * n}×${n} = ${n * 2 * n * n}` },
  { value: 'sph', label: '球坐标', maxN: 10, refN: 14, countText: (n) => `${n}×${2 * n}×${n} = ${n * 2 * n * n}` },
]

const SPEC = {
  mode: { type: 'str', default: 'cart' },
  fn: { type: 'str', default: 'r2' },
  n: { type: 'num', default: 8 },
}
const PRE =
  "% mode: 'cart' 直角坐标 / 'cyl' 柱坐标 / 'sph' 球坐标；\n" +
  "% fn 选三元函数；n 是每个主方向的等分数（角向自动取 2n）。\n" +
  "% 三种切法的体积元：直角 dV=dxdydz；柱坐标 dV=r dr dθ dz；球坐标 dV=ρ²sinφ dρ dθ dφ。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function TripleIntegral() {
  const { vals, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const mode = MODES.some((m) => m.value === vals.mode) ? vals.mode : 'cart'
  const mcfg = MODES.find((m) => m.value === mode)
  const fnKey = FNS[vals.fn] ? vals.fn : 'r2'
  const fn = FNS[fnKey]
  const n = Math.round(clamp(Number.isFinite(vals.n) ? vals.n : 8, 1, mcfg.maxN))

  const { cells, sum } = useMemo(() => buildCells(mode, n, fn.f), [mode, n, fn])
  const { sum: exact } = useMemo(() => buildCells(mode, mcfg.refN, fn.f), [mode, mcfg.refN, fn])

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '体积元（蓝=f 为负，红=f 为正，灰≈0）', color: '#f14e0e' },
          { label: '区域 Ω 边界', color: '#8b95a5', dashed: true },
        ]}
        hint="切换三种切法：直角小立方体 / 柱坐标楔形柱 / 球坐标球扇区；点击任意体积元看 f、ΔV 与贡献。"
      />
      <div className="viz-stage">
        <Suspense fallback={<div className="viz3d-loading">三维场景加载中…</div>}>
          <TripleIntegral3D cells={cells} mode={mode} />
        </Suspense>
      </div>
      <div className="viz-controls">
        <Segmented options={MODES.map((m) => ({ value: m.value, label: m.label }))} value={mode} onChange={(v) => setParam('mode', v)} />
        <Segmented options={Object.entries(FNS).map(([v, f]) => ({ value: v, label: f.label }))} value={fnKey} onChange={(v) => setParam('fn', v)} />
        <Slider label={`主方向等分数 n（体积元数 ${mcfg.countText(n)}）`} min={1} max={mcfg.maxN} step={1} value={n} onChange={(v) => setParam('n', v)} />
        <div className="readout">
          {REGIONS[mode].dVText}　·　Σ f·ΔV ≈ <b>{sum.toFixed(5)}</b>　·　参考值 ≈ <b>{exact.toFixed(5)}</b>　·　误差 ={' '}
          <b>{Math.abs(sum - exact).toFixed(5)}</b>
        </div>
        <div className="readout" style={{ fontSize: 13, color: '#8b95a5' }}>
          {mode === 'cart' && '区域 2×2×2=8：f=1 时积分就是体积 8；f=x²+y²+z² 的参考值是 16。'}
          {mode === 'cyl' && '圆柱 r≤1, 0≤z≤2：f=1 时积分=πr²h=2π≈6.2832；楔形柱体积里的 r 来自扇形面积。'}
          {mode === 'sph' && '球 ρ≤1.5：f=1 时积分=4/3·πR³≈14.137；ρ²sinφ 来自雅可比行列式。'}
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={run}
        onReset={reset}
        output={out}
        error={error}
        hint="同一个积分用三种坐标切，Σf·ΔV 都收敛到同一个值，区别只是体积元形状：柱坐标多出 r，球坐标多出 ρ²sinφ——它们是坐标变换的雅可比行列式。"
      />
    </div>
  )
}
