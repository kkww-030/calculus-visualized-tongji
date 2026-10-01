import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Viz3D, { Axes3D, Bubble3D, Label3D, C3 } from './Viz3D.jsx'

// 8 角点顺序（与 tripleCells.js 一致）：bit0=z/内层, bit1=y/θ, bit2=x/r
const FACES = [
  [0, 2, 3, 1], // x/r 小
  [4, 5, 7, 6], // x/r 大
  [0, 1, 5, 4], // y/θ 小
  [2, 6, 7, 3], // y/θ 大
  [0, 4, 6, 2], // z/φ 小
  [1, 3, 7, 5], // z/φ 大
]

// 发散配色：负=蓝，零=浅灰，正=橙红
function colorFor(v, vmax) {
  const t = Math.max(-1, Math.min(1, v / (vmax || 1)))
  const neg = [88, 166, 255]
  const mid = [228, 230, 236]
  const pos = [241, 78, 14]
  const a = t < 0 ? neg : mid
  const b = t < 0 ? mid : pos
  const k = Math.abs(t)
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map((c) => c / 255)
}

function buildGeometry(cells, vmax) {
  const triVerts = 3 * 2 // 每面 2 个三角形 × 3 顶点
  const positions = new Float32Array(cells.length * FACES.length * triVerts * 3)
  const colors = new Float32Array(cells.length * FACES.length * triVerts * 3)
  let ptr = 0
  cells.forEach((cell) => {
    const [r, g, b2] = colorFor(cell.value, vmax)
    for (const face of FACES) {
      const quad = face.map((idx) => cell.corners[idx])
      const tris = [
        [quad[0], quad[1], quad[2]],
        [quad[0], quad[2], quad[3]],
      ]
      for (const tri of tris) {
        for (const v of tri) {
          positions[ptr] = v[0]
          positions[ptr + 1] = v[1]
          positions[ptr + 2] = v[2]
          colors[ptr] = r
          colors[ptr + 1] = g
          colors[ptr + 2] = b2
          ptr += 3
        }
      }
    }
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

// 一批线段（画区域边界用）
function Segments({ lines, color, opacity = 0.55 }) {
  const arr = useMemo(() => {
    const a = new Float32Array(lines.length * 6)
    lines.forEach(([p, q], i) => {
      a[i * 6] = p[0]
      a[i * 6 + 1] = p[1]
      a[i * 6 + 2] = p[2]
      a[i * 6 + 3] = q[0]
      a[i * 6 + 4] = q[1]
      a[i * 6 + 5] = q[2]
    })
    return a
  }, [lines])
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={arr} count={lines.length * 2} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

const VIEWS = {
  cart: {
    axes: { x: [-1.5, 1.5], y: [-1.5, 1.5], z: [-0.5, 2.5], div: 2 },
    camera: [4.6, -5.6, 4.2],
    target: [0, 0, 1],
    region: 'Ω = [−1,1]×[−1,1]×[0,2]　直角坐标',
  },
  cyl: {
    axes: { x: [-1.4, 1.4], y: [-1.4, 1.4], z: [-0.5, 2.5], div: 2 },
    camera: [4.2, -5.2, 3.4],
    target: [0, 0, 1],
    region: 'Ω：r ≤ 1, 0 ≤ z ≤ 2　柱坐标',
  },
  sph: {
    axes: { x: [-2, 2], y: [-2, 2], z: [-2, 2], div: 4 },
    camera: [4.2, -5.2, 3.4],
    target: [0, 0, 0],
    region: 'Ω：ρ ≤ 1.5　球坐标',
  },
}

export default function TripleIntegral3D({ cells, mode }) {
  const [note, setNote] = useState(null)
  const view = VIEWS[mode] || VIEWS.cart

  const vmax = useMemo(() => Math.max(1e-6, ...cells.map((c) => Math.abs(c.value))), [cells])
  const geo = useMemo(() => buildGeometry(cells, vmax), [cells, vmax])
  const centersRef = useRef(cells)
  centersRef.current = cells

  // 模式切换后气泡重置
  useLayoutEffect(() => setNote(null), [mode])

  // 旧网格释放
  useLayoutEffect(() => () => geo.dispose(), [geo])

  const findCell = (p) => {
    let best = -1
    let bd = Infinity
    centersRef.current.forEach((c, i) => {
      const d = (c.center[0] - p.x) ** 2 + (c.center[1] - p.y) ** 2 + (c.center[2] - p.z) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best >= 0 ? centersRef.current[best] : null
  }

  // 区域边界
  const boundary = useMemo(() => {
    if (mode === 'cyl') {
      const R = 1
      const H = 2
      const lines = []
      const N = 64
      for (const z of [0, H]) {
        for (let i = 0; i < N; i++) {
          const a0 = (i / N) * Math.PI * 2
          const a1 = ((i + 1) / N) * Math.PI * 2
          lines.push([[R * Math.cos(a0), R * Math.sin(a0), z], [R * Math.cos(a1), R * Math.sin(a1), z]])
        }
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        lines.push([[R * Math.cos(a), R * Math.sin(a), 0], [R * Math.cos(a), R * Math.sin(a), H]])
      }
      return lines
    }
    if (mode === 'cart') {
      const xs = [-1, 1]
      const ys = [-1, 1]
      const zs = [0, 2]
      const V = []
      for (const x of xs) for (const y of ys) for (const z of zs) V.push([x, y, z])
      const edges = []
      for (let i = 0; i < 8; i++)
        for (let j = i + 1; j < 8; j++) {
          const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2])
          if (Math.abs(d - 2) < 1e-9 || Math.abs(d - 1) < 1e-9) edges.push([V[i], V[j]])
        }
      return edges
    }
    return []
  }, [mode])

  return (
    <Viz3D
      resetButton
      cameraPosition={view.camera}
      target={view.target}
      onMissed={() => setNote(null)}
      height={460}
    >
      <Axes3D xRange={view.axes.x} yRange={view.axes.y} zRange={view.axes.z} labels={['x', 'y', 'z']} gridDivisions={view.axes.div} />

      <mesh
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation()
          const c = findCell(e.point)
          if (!c) return
          setNote({
            at: c.center,
            text: `体积元中心 (${c.center[0].toFixed(2)}, ${c.center[1].toFixed(2)}, ${c.center[2].toFixed(2)})：f=${c.value.toFixed(3)}，ΔV=${c.dV.toFixed(5)}，贡献 f·ΔV=${(c.value * c.dV).toFixed(5)}。颜色：蓝负、红正、灰近零。`,
          })
        }}
      >
        <meshStandardMaterial vertexColors transparent opacity={0.85} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {mode !== 'sph' && <Segments lines={boundary} color={C3.muted || '#8b95a5'} opacity={0.5} />}
      {mode === 'sph' && (
        <mesh>
          <sphereGeometry args={[1.5, 28, 20]} />
          <meshBasicMaterial color="#8b95a5" wireframe transparent opacity={0.28} />
        </mesh>
      )}

      <Label3D
        at={[0, 0, mode === 'sph' ? 1.9 : 2.7]}
        color={C3.fg}
        size={12}
      >
        {view.region}
      </Label3D>
      <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
    </Viz3D>
  )
}
