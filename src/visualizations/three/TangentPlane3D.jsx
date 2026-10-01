import { useMemo, useState } from 'react'
import * as THREE from 'three'
import Viz3D, { Axes3D, Tube, Line3D, Bubble3D, Label3D, C3 } from './Viz3D.jsx'

const FNS = {
  paraboloid: { label: 'z = x² + y²', f: (x, y) => x * x + y * y, fx: (x) => 2 * x, fy: (y) => 2 * y, view: { x: [-2, 2], y: [-2, 2], z: [0, 5] } },
  saddle: { label: 'z = x² − y²', f: (x, y) => x * x - y * y, fx: (x) => 2 * x, fy: (y) => -2 * y, view: { x: [-2, 2], y: [-2, 2], z: [-4, 4] } },
  ripple: { label: 'z = sin x + cos y', f: (x, y) => Math.sin(x) + Math.cos(y), fx: (x) => Math.cos(x), fy: (y) => -Math.sin(y), view: { x: [-3, 3], y: [-3, 3], z: [-2.5, 2.5] } },
}

export function getFn(key) {
  return FNS[key] || FNS.paraboloid
}

export default function TangentPlane3D({ fnKey, x0, y0 }) {
  const [note, setNote] = useState(null)
  const fn = getFn(fnKey)
  const z0 = fn.f(x0, y0)
  const fx0 = fn.fx(x0)
  const fy0 = fn.fy(y0)

  // 曲面网格
  const surface = useMemo(() => {
    const NX = 44
    const NY = 44
    const pos = []
    const idx = []
    const x0v = fn.view.x[0]
    const x1v = fn.view.x[1]
    const y0v = fn.view.y[0]
    const y1v = fn.view.y[1]
    for (let j = 0; j <= NY; j++) {
      const y = y0v + ((y1v - y0v) * j) / NY
      for (let i = 0; i <= NX; i++) {
        const x = x0v + ((x1v - x0v) * i) / NX
        pos.push(x, y, fn.f(x, y))
      }
    }
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const a = j * (NX + 1) + i
        const b = a + 1
        const c = a + NX + 1
        const d = c + 1
        idx.push(a, c, b, b, c, d)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [fn])

  // 切平面：z = z0 + fx*(x-x0) + fy*(y-y0)，画一个以 (x0,y0) 为中心的正方形
  const planeSize = 1.2
  const planeCorners = [
    [x0 - planeSize, y0 - planeSize],
    [x0 + planeSize, y0 - planeSize],
    [x0 + planeSize, y0 + planeSize],
    [x0 - planeSize, y0 + planeSize],
  ].map(([x, y]) => [x, y, z0 + fx0 * (x - x0) + fy0 * (y - y0)])

  const planeGeo = useMemo(() => {
    const pos = []
    const idx = []
    planeCorners.forEach((p) => pos.push(p[0], p[1], p[2]))
    idx.push(0, 1, 2, 0, 2, 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [x0, y0, z0, fx0, fy0])

  // 两条切线：沿 x 方向和沿 y 方向
  const tanX = [
    [x0 - planeSize, y0, z0 - fx0 * planeSize],
    [x0 + planeSize, y0, z0 + fx0 * planeSize],
  ]
  const tanY = [
    [x0, y0 - planeSize, z0 - fy0 * planeSize],
    [x0, y0 + planeSize, z0 + fy0 * planeSize],
  ]

  return (
    <Viz3D resetButton cameraPosition={[6, -7.5, 5]} target={[0, 0, fn.view.z[0] + (fn.view.z[1] - fn.view.z[0]) / 2]} onMissed={() => setNote(null)} height={460}>
      <Axes3D xRange={fn.view.x} yRange={fn.view.y} zRange={fn.view.z} labels={['x', 'y', 'z']} gridDivisions={4} />

      <mesh geometry={surface} onClick={(e) => { e.stopPropagation(); setNote({ at: [e.point.x, e.point.y, e.point.z], text: `曲面 ${fn.label}。在 (${e.point.x.toFixed(2)}, ${e.point.y.toFixed(2)}) 处高度 z=${e.point.z.toFixed(3)}。` }) }}>
        <meshStandardMaterial color={C3.blue} transparent opacity={0.5} side={THREE.DoubleSide} roughness={0.5} />
      </mesh>

      {/* 切平面 */}
      <mesh geometry={planeGeo} onClick={(e) => { e.stopPropagation(); setNote({ at: [e.point.x, e.point.y, e.point.z], text: `切平面：z = ${z0.toFixed(2)} + ${fx0.toFixed(2)}·(x−${x0.toFixed(2)}) + ${fy0.toFixed(2)}·(y−${y0.toFixed(2)})。它是曲面在该点的最佳线性近似。` }) }}>
        <meshStandardMaterial color={C3.orange} transparent opacity={0.55} side={THREE.DoubleSide} roughness={0.3} />
      </mesh>

      {/* 两条切线 */}
      <Tube points={tanX} radius={0.018} color={C3.green} segments={24} />
      <Tube points={tanY} radius={0.018} color={C3.violet} segments={24} />

      {/* 切点 */}
      <mesh position={[x0, y0, z0]} onClick={(e) => { e.stopPropagation(); setNote({ at: [x0, y0, z0], text: `切点 (${x0.toFixed(2)}, ${y0.toFixed(2)}, ${z0.toFixed(3)})：∂z/∂x = fx = ${fx0.toFixed(3)}（绿色切线斜率），∂z/∂y = fy = ${fy0.toFixed(3)}（紫色切线斜率）。两条切线张成切平面。` }) }}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={C3.orange} emissive={C3.orange} emissiveIntensity={0.4} />
      </mesh>

      <Label3D at={[x0 + 0.2, y0, z0 + 0.3]} color={C3.green} size={11}>fx={fx0.toFixed(2)}</Label3D>
      <Label3D at={[x0, y0 + 0.2, z0 + 0.3]} color={C3.violet} size={11}>fy={fy0.toFixed(2)}</Label3D>
      <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
    </Viz3D>
  )
}
