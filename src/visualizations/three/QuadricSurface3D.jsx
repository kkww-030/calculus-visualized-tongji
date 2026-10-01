import { useMemo, useState } from 'react'
import * as THREE from 'three'
import Viz3D, { Axes3D, Bubble3D, Label3D, C3 } from './Viz3D.jsx'

// 6 种二次曲面：参数化函数 (u, v, a, b, c) -> [x, y, z]
const SURFACES = {
  sphere: {
    name: '球面',
    eq: 'x² + y² + z² = R²',
    uv: (u, v, a) => [a * Math.sin(v) * Math.cos(u), a * Math.sin(v) * Math.sin(u), a * Math.cos(v)],
    uRange: [0, Math.PI * 2],
    vRange: [0, Math.PI],
    params: { a: 1.5, b: 0, c: 0 },
  },
  ellipsoid: {
    name: '椭球面',
    eq: 'x²/a² + y²/b² + z²/c² = 1',
    uv: (u, v, a, b, c) => [a * Math.sin(v) * Math.cos(u), b * Math.sin(v) * Math.sin(u), c * Math.cos(v)],
    uRange: [0, Math.PI * 2],
    vRange: [0, Math.PI],
    params: { a: 2, b: 1.2, c: 1.5 },
  },
  paraboloid: {
    name: '椭圆抛物面',
    eq: 'z = x²/a² + y²/b²',
    uv: (u, v, a, b) => {
      const r = Math.sqrt(v)
      return [a * r * Math.cos(u), b * r * Math.sin(u), v]
    },
    uRange: [0, Math.PI * 2],
    vRange: [0, 3],
    params: { a: 1.4, b: 1.4, c: 0 },
  },
  saddle: {
    name: '双曲抛物面（马鞍面）',
    eq: 'z = x²/a² − y²/b²',
    uv: (u, v, a, b) => [u, v, (u * u) / (a * a) - (v * v) / (b * b)],
    uRange: [-2.5, 2.5],
    vRange: [-2.5, 2.5],
    params: { a: 1.8, b: 1.8, c: 0 },
  },
  hyperboloid: {
    name: '单叶双曲面',
    eq: 'x²/a² + y²/b² − z²/c² = 1',
    uv: (u, v, a, b, c) => [a * Math.cosh(v) * Math.cos(u), b * Math.cosh(v) * Math.sin(u), c * Math.sinh(v)],
    uRange: [0, Math.PI * 2],
    vRange: [-1.2, 1.2],
    params: { a: 1.3, b: 1.3, c: 1.3 },
  },
  cone: {
    name: '锥面',
    eq: 'z² = x²/a² + y²/b²',
    uv: (u, v, a, b) => [v * a * Math.cos(u), v * b * Math.sin(u), v],
    uRange: [0, Math.PI * 2],
    vRange: [-1.8, 1.8],
    params: { a: 1.2, b: 1.2, c: 0 },
  },
}

export function getSurface(key) {
  return SURFACES[key] || SURFACES.sphere
}

function buildMesh(surf, a, b, c) {
  const NU = 56
  const NV = 48
  const pos = []
  const idx = []
  for (let j = 0; j <= NV; j++) {
    const v = surf.vRange[0] + ((surf.vRange[1] - surf.vRange[0]) * j) / NV
    for (let i = 0; i <= NU; i++) {
      const u = surf.uRange[0] + ((surf.uRange[1] - surf.uRange[0]) * i) / NU
      const p = surf.uv(u, v, a, b, c)
      pos.push(p[0], p[1], p[2])
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const aa = j * (NU + 1) + i
      const bb = aa + 1
      const cc = aa + NU + 1
      const dd = cc + 1
      idx.push(aa, cc, bb, bb, cc, dd)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

export default function QuadricSurface3D({ type, a, b, c }) {
  const [note, setNote] = useState(null)
  const surf = getSurface(type)

  const geo = useMemo(() => buildMesh(surf, a, b, c), [surf, a, b, c])

  // 自适应坐标范围
  const maxR = Math.max(a, b, c, 2)
  const zMax = type === 'paraboloid' ? 3.5 : type === 'cone' ? 2 : maxR + 0.5

  return (
    <Viz3D resetButton cameraPosition={[5, -7, 4]} target={[0, 0, type === 'paraboloid' ? 1.5 : 0]} onMissed={() => setNote(null)} height={460}>
      <Axes3D xRange={[-maxR - 0.5, maxR + 0.5]} yRange={[-maxR - 0.5, maxR + 0.5]} zRange={[-zMax, zMax]} labels={['x', 'y', 'z']} gridDivisions={Math.round(maxR * 2)} />
      <mesh
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation()
          setNote({
            at: [e.point.x, e.point.y, e.point.z],
            text: `${surf.name}：方程 ${surf.eq}。点击处坐标 (${e.point.x.toFixed(2)}, ${e.point.y.toFixed(2)}, ${e.point.z.toFixed(2)})。按住拖动可旋转观察曲面形状。`,
          })
        }}
      >
        <meshStandardMaterial color={C3.blue} transparent opacity={0.7} side={THREE.DoubleSide} roughness={0.4} />
      </mesh>
      <Label3D at={[0, 0, zMax + 0.2]} color={C3.orange} size={14}>
        {surf.name}
      </Label3D>
      <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
    </Viz3D>
  )
}
