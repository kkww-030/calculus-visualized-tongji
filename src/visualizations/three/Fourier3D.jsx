import { useMemo, useState } from 'react'
import Viz3D, { Axes3D, Tube, Ring3D, Line3D, Bubble3D, Label3D, C3 } from './Viz3D.jsx'
import { WAVES } from '../waves.js'
import { useAnimClock } from '../anim.js'

const TAU = Math.PI * 2
const H = 7 // 时间轴视觉高度
const K = H / TAU
const NT = 240

// 每个谐波一种颜色，循环使用
const HCOLORS = [C3.orange, C3.violet, C3.yellow, C3.pink, C3.green, C3.blue, C3.red]

export default function Fourier3D({ waveKey, n, playing = true }) {
  const W = WAVES[waveKey] ?? WAVES.square
  const [mode, setMode] = useState('helix') // helix 螺旋分解 | chain 圆盘追踪
  const [note, setNote] = useState(null)
  const [t] = useAnimClock(playing && mode === 'chain', 0.55)
  const tt = ((t % TAU) + TAU) % TAU

  // 预计算：非零谐波、各自螺旋、合成曲线、场景半径
  const data = useMemo(() => {
    const harms = []
    for (let m = 1; m <= n; m++) {
      const z = W.c(m)
      const r = Math.hypot(z.re, z.im)
      if (r > 1e-9) harms.push({ m, r, phi: Math.atan2(z.im, z.re), color: HCOLORS[(m - 1) % HCOLORS.length] })
    }
    const comp = []
    for (let i = 0; i <= NT; i++) {
      const th = (i / NT) * TAU
      let x = W.c0
      let y = 0
      for (const h of harms) {
        x += h.r * Math.cos(h.phi + h.m * th)
        y += h.r * Math.sin(h.phi + h.m * th)
      }
      comp.push([x, y, K * th])
    }
    const helices = harms.map((h) => ({
      ...h,
      pts: Array.from({ length: NT + 1 }, (_, i) => {
        const th = (i / NT) * TAU
        return [h.r * Math.cos(h.phi + h.m * th), h.r * Math.sin(h.phi + h.m * th), K * th]
      }),
    }))
    const R = Math.abs(W.c0) + harms.reduce((s, h) => s + h.r, 0)
    const b = Math.max(1.6, R + 0.5)
    return { harms, comp, helices, b }
  }, [W, n])

  const { harms, comp, helices, b } = data

  // 墙面 / 地面投影
  const reWall = comp.map((p) => [p[0], -b, p[2]]) // y=-b 墙面：实部波
  const imWall = comp.map((p) => [-b, p[1], p[2]]) // x=-b 墙面：虚部波
  const floor = comp.map((p) => [p[0], p[1], 0.002]) // 地面：圆盘链轨迹

  // 当前时刻的圆链（圆盘追踪模式）
  const nodes = useMemo(() => {
    let x = W.c0
    let y = 0
    const ns = [[x, y, K * tt]]
    for (const h of harms) {
      x += h.r * Math.cos(h.phi + h.m * tt)
      y += h.r * Math.sin(h.phi + h.m * tt)
      ns.push([x, y, K * tt])
    }
    return ns
  }, [harms, tt, W.c0])
  const tip = nodes[nodes.length - 1]
  const trailEnd = Math.floor((tt / TAU) * NT) + 1
  const trail = comp.slice(0, Math.max(trailEnd, 2))

  const pick = (point, text) => setNote({ at: [point.x, point.y, point.z], text })

  const modeButtons = (
    <>
      <button className={mode === 'helix' ? 'active' : ''} onClick={() => setMode('helix')}>
        螺旋分解
      </button>
      <button className={mode === 'chain' ? 'active' : ''} onClick={() => setMode('chain')}>
        圆盘追踪
      </button>
    </>
  )

  return (
    <Viz3D
      resetButton
      toolbar={modeButtons}
      cameraPosition={[6.8, -8.8, 7.8]}
      target={[0, 0, 3]}
      onMissed={() => setNote(null)}
      height={480}
    >
        <Axes3D
          xRange={[-b, b]}
          yRange={[-b, b]}
          zRange={[0, H]}
          labels={['Re 实部', 'Im 虚部', 't 时间']}
        />

        {/* 三面投影（淡色参考） */}
        <Tube points={floor} radius={0.012} color={C3.fg} opacity={0.28} segments={200} />
        <Tube points={reWall} radius={0.014} color={C3.blue} opacity={0.4} segments={200} />
        <Tube points={imWall} radius={0.014} color={C3.green} opacity={0.4} segments={200} />
        <Label3D at={[-b + 0.2, -b + 0.25, H - 0.3]} color={C3.blue} size={12}>
          墙面投影 = 实部波（×2 加直流即真实信号）
        </Label3D>
        <Label3D at={[-b + 0.4, -b + 0.55, 0.25]} color={C3.fg} size={12}>
          地面投影 = 旋转轨迹
        </Label3D>

        {mode === 'helix' ? (
          <>
            {/* 每一级谐波各自的螺旋 */}
            {helices.map((h) => (
              <Tube
                key={h.m}
                points={h.pts}
                radius={0.018}
                color={h.color}
                opacity={0.75}
                segments={200}
                onClick={(e) =>
                  pick(
                    e.point,
                    `第 ${h.m} 次谐波螺旋：半径 = ${h.r.toFixed(4)}，每上升一个周期绕轴转 ${h.m} 圈。` +
                      `从侧面看是正弦波，从上往下看是圆。${W.radiusTip}`,
                  )
                }
              />
            ))}
            {/* 合成螺旋 */}
            <Tube
              points={comp}
              radius={0.034}
              color={C3.fg}
              segments={240}
              onClick={(e) =>
                pick(
                  e.point,
                  `合成螺旋 = ${W.label}前 ${n} 项复指数部分和 C(t) = c₀ + Σ cₘe^{imt}。同一条曲线：俯视是圆盘链轨迹，侧视墙上就是波形——圆和波在这里统一了。`,
                )
              }
            />
          </>
        ) : (
          <>
            {/* 圆盘链（在 t 时刻的水平面 z=Kt 上） */}
            {harms.map((h, i) => (
              <Ring3D
                key={h.m}
                center={nodes[i]}
                r={h.r}
                color={h.color}
                onClick={(e) =>
                  pick(
                    e.point,
                    `第 ${h.m} 次谐波圆盘：半径（振幅）= ${h.r.toFixed(4)}，转速 = ${h.m} 倍。${W.radiusTip}`,
                  )
                }
              />
            ))}
            {nodes.slice(0, -1).map((p, i) => (
              <Line3D key={i} p1={p} p2={nodes[i + 1]} color={C3.orange} width={2.5} />
            ))}
            {/* 已经走过的合成轨迹（高亮）+ 全程淡轨迹 */}
            <Tube points={comp} radius={0.012} color={C3.fg} opacity={0.18} segments={220} />
            {trail.length >= 3 && <Tube points={trail} radius={0.03} color={C3.fg} segments={Math.max(48, trail.length * 2)} />}
            {/* 笔尖与三条投影连线 */}
            <mesh
              position={tip}
              onClick={(e) => {
                e.stopPropagation()
                pick(
                  e.point,
                  `笔尖 = 前 ${n} 项部分和 C(t)。它一边被各级圆盘带动旋转，一边沿时间轴上升；投到墙上就是正在画出的波形。`,
                )
              }}
            >
              <sphereGeometry args={[0.09, 20, 20]} />
              <meshStandardMaterial color={C3.orange} emissive={C3.orange} emissiveIntensity={0.35} />
            </mesh>
            <Line3D p1={tip} p2={[tip[0], tip[1], 0]} color={C3.fg} width={1} dashed opacity={0.5} />
            <Line3D p1={tip} p2={[tip[0], -b, tip[2]]} color={C3.blue} width={1.2} dashed opacity={0.7} />
            <Line3D p1={tip} p2={[-b, tip[1], tip[2]]} color={C3.green} width={1.2} dashed opacity={0.7} />
          </>
        )}
        <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
    </Viz3D>
  )
}
