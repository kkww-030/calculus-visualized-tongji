import { useMemo, useState } from 'react'
import Viz3D, { Axes3D, Tube, Line3D, Bubble3D, Label3D, C3 } from './Viz3D.jsx'

const TAU = Math.PI * 2
const H = 7
const K = H / TAU
const NT = 240
const B = 1.55 // 投影墙距离

// 欧拉公式三维视图：e^{iθ} 沿时间轴上升，走出一条螺旋
// 俯视（地面投影）= 单位圆；两个侧视（墙面投影）= cos / sin 波
export default function Euler3D({ theta }) {
  const [note, setNote] = useState(null)
  const tt = ((theta % TAU) + TAU) % TAU

  const curves = useMemo(() => {
    const helix = []
    const floor = []
    const cosWall = []
    const sinWall = []
    for (let i = 0; i <= NT; i++) {
      const t = (i / NT) * TAU
      const c = Math.cos(t)
      const s = Math.sin(t)
      const z = K * t
      helix.push([c, s, z])
      floor.push([c, s, 0.002])
      cosWall.push([c, -B, z])
      sinWall.push([-B, s, z])
    }
    return { helix, floor, cosWall, sinWall }
  }, [])

  const trail = curves.helix.slice(0, Math.max(Math.floor((tt / TAU) * NT) + 1, 2))
  const p = [Math.cos(tt), Math.sin(tt), K * tt]
  const pick = (point, text) => setNote({ at: [point.x, point.y, point.z], text })

  return (
    <>
      <Viz3D resetButton cameraPosition={[7, -10.2, 9.4]} target={[0, 0, 2.7]} onMissed={() => setNote(null)} height={480}>
        <Axes3D
          xRange={[-B, B]}
          yRange={[-B, B]}
          zRange={[0, H]}
          labels={['Re = cos θ', 'Im = sin θ', 'θ（角度）']}
        />

        {/* 三面投影 */}
        <Tube
          points={curves.floor}
          radius={0.012}
          color={C3.fg}
          opacity={0.3}
          segments={200}
          onClick={(e) =>
            pick(e.point, '地面上的影子是单位圆：|e^{iθ}| = √(cos²θ + sin²θ) = 1，模长永远等于 1。')
          }
        />
        <Tube
          points={curves.cosWall}
          radius={0.016}
          color={C3.blue}
          opacity={0.55}
          segments={200}
          onClick={(e) =>
            pick(e.point, '实部投影墙：螺旋上每个点的 x 坐标 cos θ 随时间画出的曲线，就是余弦波。')
          }
        />
        <Tube
          points={curves.sinWall}
          radius={0.016}
          color={C3.green}
          opacity={0.55}
          segments={200}
          onClick={(e) =>
            pick(e.point, '虚部投影墙：螺旋上每个点的 y 坐标 sin θ 随时间画出的曲线，就是正弦波，与余弦波相差 90°。')
          }
        />

        {/* 螺旋本体 + 已走过的轨迹高亮 */}
        <Tube
          points={curves.helix}
          radius={0.026}
          color={C3.fg}
          opacity={0.25}
          segments={220}
          onClick={(e) =>
            pick(
              e.point,
              '螺旋线 (cos θ, sin θ, θ)：e^{iθ} 一边匀速旋转一边沿时间轴上升。它的三个投影分别是圆、余弦波和正弦波——这就是欧拉公式的几何全貌。',
            )
          }
        />
        {trail.length >= 3 && (
          <Tube points={trail} radius={0.032} color={C3.orange} segments={Math.max(48, trail.length * 2)} />
        )}

        {/* 当前动点与投影连线 */}
        <Line3D p1={[0, 0, p[2]]} p2={p} color={C3.orange} width={2.5} />
        <Line3D p1={p} p2={[p[0], p[1], 0]} color={C3.fg} width={1} dashed opacity={0.5} />
        <Line3D p1={p} p2={[p[0], -B, p[2]]} color={C3.blue} width={1.2} dashed opacity={0.7} />
        <Line3D p1={p} p2={[-B, p[1], p[2]]} color={C3.green} width={1.2} dashed opacity={0.7} />
        <mesh
          position={p}
          onClick={(e) => {
            e.stopPropagation()
            pick(
              e.point,
              `动点 e^{iθ} = ${p[0].toFixed(3)} + ${p[1].toFixed(3)}·i（θ = ${tt.toFixed(2)} rad）。乘以一个复数 e^{iθ}，几何上就是把它绕原点旋转 θ 角。`,
            )
          }}
        >
          <sphereGeometry args={[0.09, 20, 20]} />
          <meshStandardMaterial color={C3.orange} emissive={C3.orange} emissiveIntensity={0.35} />
        </mesh>

        <Label3D at={[-B + 0.2, -B + 0.25, H - 0.3]} color={C3.blue} size={12}>
          侧影 = cos θ
        </Label3D>
        <Label3D at={[0.9, 1.0, 0.25]} color={C3.fg} size={12}>
          俯视 = 单位圆
        </Label3D>
        <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
      </Viz3D>
    </>
  )
}
