import { useMemo, useState } from 'react'
import * as THREE from 'three'
import Viz3D, { Axes3D, Tube, Bubble3D, Label3D, C3 } from './Viz3D.jsx'

// 旋转体体积三维视图：曲线 f(x) 绕 x 轴旋转得到的曲面
export default function Volume3D({ F, a, b, slice }) {
  const [note, setNote] = useState(null)

  const NX = 60
  const NT = 72

  const { geo, rmax } = useMemo(() => {
    const pos = []
    const idx = []
    let rmax = 0.1
    for (let i = 0; i <= NX; i++) {
      const x = a + ((b - a) * i) / NX
      let r = F(x)
      if (!Number.isFinite(r) || r < 0) r = 0
      rmax = Math.max(rmax, r)
      for (let j = 0; j <= NT; j++) {
        const t = (j / NT) * Math.PI * 2
        pos.push(x, r * Math.cos(t), r * Math.sin(t))
      }
    }
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NT; j++) {
        const aa = i * (NT + 1) + j
        const bb = aa + 1
        const cc = aa + NT + 1
        const dd = cc + 1
        idx.push(aa, cc, bb, bb, cc, dd)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return { geo: g, rmax }
  }, [F, a, b])

  // 当前切片圆盘
  const sliceR = Math.max(0, F(slice) || 0)
  const diskPts = useMemo(() => {
    const pts = []
    for (let j = 0; j <= NT; j++) {
      const t = (j / NT) * Math.PI * 2
      pts.push([slice, sliceR * Math.cos(t), sliceR * Math.sin(t)])
    }
    return pts
  }, [slice, sliceR])

  // 母线（x-y 平面上的曲线）
  const meridian = useMemo(() => {
    const pts = []
    for (let i = 0; i <= NX; i++) {
      const x = a + ((b - a) * i) / NX
      pts.push([x, F(x) || 0, 0])
    }
    return pts
  }, [F, a, b])

  return (
    <Viz3D resetButton cameraPosition={[b + 3, -4, rmax * 1.2 + 1.5]} target={[(a + b) / 2, 0, 0]} onMissed={() => setNote(null)} height={460}>
      <Axes3D xRange={[a - 0.5, b + 0.5]} yRange={[-rmax - 0.5, rmax + 0.5]} zRange={[-rmax - 0.5, rmax + 0.5]} labels={['x（旋转轴）', 'y', 'z']} gridDivisions={Math.round(b - a)} />

      {/* 旋转曲面 */}
      <mesh
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation()
          setNote({
            at: [e.point.x, e.point.y, e.point.z],
            text: `旋转曲面：由 y=f(x) 绕 x 轴旋转而成。在 x=${e.point.x.toFixed(2)} 处截面半径 r=f(x)=${(F(e.point.x) || 0).toFixed(3)}，圆盘面积 πr²。体积 V=π∫ₐᵇf(x)²dx。`,
          })
        }}
      >
        <meshStandardMaterial color={C3.blue} transparent opacity={0.55} side={THREE.DoubleSide} roughness={0.45} />
      </mesh>

      {/* 母线 */}
      <Tube points={meridian} radius={0.015} color={C3.orange} opacity={0.9} segments={120} />

      {/* 当前切片圆盘 */}
      <Tube points={diskPts} radius={0.02} color={C3.green} segments={120} closed />
      {/* 圆盘半径线 */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([slice, 0, 0, slice, sliceR, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={C3.green} />
      </line>

      <Label3D at={[slice, sliceR + 0.15, 0]} color={C3.green} size={12}>
        切片 x={slice.toFixed(2)}, r={sliceR.toFixed(2)}
      </Label3D>
      <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
    </Viz3D>
  )
}
