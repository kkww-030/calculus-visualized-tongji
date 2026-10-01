import { useMemo, useState } from 'react'
import * as THREE from 'three'
import Viz3D, { Axes3D, Tube, Bubble3D, Label3D, C3 } from './Viz3D.jsx'

// 向量场 F=(P,Q,R)，附散度 ∇·F
const FIELDS = {
  radial: { label: 'F = (x, y, z)', P: (x) => x, Q: (y) => y, R: (z) => z, div: 3 },
  z: { label: 'F = (0, 0, z)', P: () => 0, Q: () => 0, R: (z) => z, div: 1 },
  rot: { label: 'F = (−y, x, 0)', P: (x, y) => -y, Q: (x, y) => x, R: () => 0, div: 0 },
}

export function getField(key) {
  return FIELDS[key] || FIELDS.radial
}

export default function Gauss3D({ fieldKey, r }) {
  const [note, setNote] = useState(null)
  const field = getField(fieldKey)

  // 球面
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(r, 40, 32), [r])

  // 外法向 + 场向量采样点
  const samples = useMemo(() => {
    const N = 6
    const pts = []
    for (let i = 1; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const theta = (j / N) * Math.PI * 2
        const phi = (i / N) * Math.PI
        const x = r * Math.sin(phi) * Math.cos(theta)
        const y = r * Math.sin(phi) * Math.sin(theta)
        const z = r * Math.cos(phi)
        const nx = x / r
        const ny = y / r
        const nz = z / r
        const fx = field.P(x, y)
        const fy = field.Q(x, y)
        const fz = field.R(z)
        pts.push({ x, y, z, nx, ny, nz, fx, fy, fz, dot: fx * nx + fy * ny + fz * nz })
      }
    }
    return pts
  }, [field, r])

  // 通量 = ∬ F·n dS；散度积分 = div × 体积
  const volume = (4 / 3) * Math.PI * r * r * r
  const flux = field.div * volume

  return (
    <Viz3D resetButton cameraPosition={[r + 3, -r - 3, r + 1.5]} target={[0, 0, 0]} onMissed={() => setNote(null)} height={460}>
      <Axes3D xRange={[-r - 0.8, r + 0.8]} yRange={[-r - 0.8, r + 0.8]} zRange={[-r - 0.8, r + 0.8]} labels={['x', 'y', 'z']} gridDivisions={Math.round(r * 2)} />

      <mesh
        geometry={sphereGeo}
        onClick={(e) => {
          e.stopPropagation()
          setNote({
            at: [e.point.x, e.point.y, e.point.z],
            text: `闭合曲面 ∂Ω（球面 r=${r.toFixed(2)}）。这里外法向 n 与 F 的点积 F·n 决定该点的通量密度。高斯定理：总通量 = ∭Ω (∇·F) dV。`,
          })
        }}
      >
        <meshStandardMaterial color={C3.blue} transparent opacity={0.4} side={THREE.DoubleSide} roughness={0.5} wireframe={false} />
      </mesh>

      {/* 采样点处的向量 */}
      {samples.map((s, i) => {
        const tip = [s.x + s.fx * 0.18, s.y + s.fy * 0.18, s.z + s.fz * 0.18]
        return (
          <Tube
            key={i}
            points={[
              [s.x, s.y, s.z],
              tip,
            ]}
            radius={0.012}
            color={s.dot >= 0 ? C3.green : C3.red}
            segments={8}
          />
        )
      })}

      <Label3D at={[0, 0, r + 0.4]} color={C3.orange} size={13}>
        ∂Ω（球面 r={r.toFixed(1)}）
      </Label3D>
      <Label3D at={[0, 0, -r - 0.5]} color={C3.fg} size={12}>
        绿箭头 F·n＞0（流出）　红箭头 F·n＜0（流入）
      </Label3D>
      <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
    </Viz3D>
  )
}
