import { lazy, Suspense, useMemo, useState } from 'react'
import Legend from '../components/Legend.jsx'
import CodePanel from '../components/CodePanel.jsx'
import { Slider, Segmented } from '../components/controls.jsx'
import { useCodeLink } from '../matlab/useCodeLink.js'

const DoubleIntegral3D = lazy(() => import('./three/DoubleIntegral3D.jsx'))

const X0 = -2.5
const X1 = 2.5
const Y0 = -2.5
const Y1 = 2.5

const PRESETS = [
  { value: 'x.^2/8 + y.^2/8 + 1', label: '抛物面' },
  { value: 'sin(x) * cos(y) + 1.5', label: '波纹' },
  { value: 'exp(-(x.^2 + y.^2)/4) + 0.3', label: '钟形面' },
]
const METHODS = [
  { value: 'left', label: '左下角点' },
  { value: 'mid', label: '中心点' },
  { value: 'right', label: '右上角点' },
]

const SPEC = {
  f: { type: 'fn', args: ['x', 'y'], default: 'x.^2/8 + y.^2/8 + 1' },
  n: { type: 'num', default: 10 },
  method: { type: 'str', default: 'mid' },
}
const PRE =
  "% f 是二元函数句柄 f(x,y)，n 是每边的等分数（n×n 根柱体）；\n% method 可取 'left' / 'mid' / 'right'（取样点：左下角/中心/右上角）。\n"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 稠密中点和，当作“精确值”参照
function exact2(F, a, b, c, d, N = 80) {
  const dx = (b - a) / N
  const dy = (d - c) / N
  let s = 0
  for (let j = 0; j < N; j++) {
    const y = c + (j + 0.5) * dy
    for (let i = 0; i < N; i++) {
      const x = a + (i + 0.5) * dx
      const z = F(x, y)
      if (Number.isFinite(z)) s += z
    }
  }
  return s * dx * dy
}

export default function DoubleIntegral() {
  const { vals, fns, code, setCode, setParam, run, out, error, reset } = useCodeLink(SPEC, PRE)
  const [, force] = useState(0) // 代码运行后 fns 已更新，强制刷新即可

  const F = (x, y) => {
    try {
      const z = fns.f(x, y)
      return Number.isFinite(z) ? z : 0
    } catch {
      return 0
    }
  }
  const n = Math.round(clamp(Number.isFinite(vals.n) ? vals.n : 10, 1, 24))
  const method = METHODS.some((m) => m.value === vals.method) ? vals.method : 'mid'

  const { sum, exact } = useMemo(() => {
    const dx = (X1 - X0) / n
    const dy = (Y1 - Y0) / n
    let s = 0
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x0 = X0 + i * dx
        const y0 = Y0 + j * dy
        const sx = method === 'left' ? x0 : method === 'right' ? x0 + dx : x0 + dx / 2
        const sy = method === 'left' ? y0 : method === 'right' ? y0 + dy : y0 + dy / 2
        s += F(sx, sy)
      }
    }
    return { sum: s * dx * dy, exact: exact2(F, X0, X1, Y0, Y1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fns.f, n, method])

  return (
    <div className="viz-inner">
      <Legend
        items={[
          { label: '曲面 z = f(x,y)', color: '#58a6ff' },
          { label: '柱体（高=f，底面积=ΔA）', color: '#15e272' },
          { label: '积分区域 D（矩形）', color: '#ffffff' },
        ]}
        hint="按住拖动旋转视角、滚轮缩放；点击曲面或任意柱体可弹出注释。"
      />
      <div className="viz-stage">
        <Suspense fallback={<div className="viz3d-loading">三维场景加载中…</div>}>
          <DoubleIntegral3D F={F} n={n} method={method} />
        </Suspense>
      </div>
      <div className="viz-controls">
        <Slider
          label="每边等分数 n（共 n×n 根柱体）"
          min={1}
          max={24}
          step={1}
          value={n}
          onChange={(v) => setParam('n', v)}
        />
        <Segmented options={METHODS} value={method} onChange={(v) => setParam('method', v)} />
        <Segmented options={PRESETS} value={vals.f} onChange={(v) => setParam('f', v)} />
        <div className="readout">
          柱体体积和 = <b>{sum.toFixed(4)}</b>　·　二重积分参考值 ≈ <b>{exact.toFixed(4)}</b>　·　误差 ={' '}
          <b>{Math.abs(sum - exact).toFixed(4)}</b>
        </div>
      </div>
      <CodePanel
        code={code}
        onCodeChange={setCode}
        onRun={() => {
          run()
          force((k) => k + 1)
        }}
        onReset={reset}
        output={out}
        error={error}
        hint="试试把 f 换成 sin(x) * cos(y) + 1.5，再把 n 从 4 调到 24，看柱体阵列如何一步步填满曲面下方的体积。"
      />
    </div>
  )
}
