import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Viz3D, { Axes3D, Tube, Line3D, Bubble3D, Label3D, C3 } from './Viz3D.jsx'

const X0 = -2.5
const X1 = 2.5
const Y0 = -2.5
const Y1 = 2.5

// z=f(x,y) 曲面 + n×n 柱体阵列（三维版黎曼和）
export default function DoubleIntegral3D({ F, n, method }) {
  const [note, setNote] = useState(null)
  const instRef = useRef(null)

  // 曲面网格
  const surface = useMemo(() => {
    const NX = 44
    const NY = 44
    const pos = []
    const idx = []
    let zmax = 0.01
    for (let j = 0; j <= NY; j++) {
      const y = Y0 + ((Y1 - Y0) * j) / NY
      for (let i = 0; i <= NX; i++) {
        const x = X0 + ((X1 - X0) * i) / NX
        let z = F(x, y)
        if (!Number.isFinite(z)) z = 0
        zmax = Math.max(zmax, z)
        pos.push(x, y, z)
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
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return { geo, zmax }
  }, [F])

  const zMax = surface.zmax + 0.3

  // 柱体阵列
  const dx = (X1 - X0) / n
  const dy = (Y1 - Y0) / n
  const sample = (x0, x1, y0, y1) => {
    if (method === 'left') return [x0, y0]
    if (method === 'right') return [x1, y1]
    return [(x0 + x1) / 2, (y0 + y1) / 2]
  }
  const cols = useMemo(() => {
    const list = []
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x0 = X0 + i * dx
        const x1 = x0 + dx
        const y0 = Y0 + j * dy
        const y1 = y0 + dy
        const [sx, sy] = sample(x0, x1, y0, y1)
        let h = F(sx, sy)
        if (!Number.isFinite(h)) h = 0
        list.push({ i, j, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, h, sx, sy, vol: h * dx * dy })
      }
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [F, n, method, dx, dy])

  // 用 ref 回调在 InstancedMesh 一创建/重建时立即写入矩阵，
  // 避免 useEffect 在 StrictMode 双挂载 / args 重建时拿到已废弃的实例
  const applyInstances = (mesh) => {
    instRef.current = mesh
    if (!mesh) return
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    cols.forEach((c, k) => {
      m4.compose(
        new THREE.Vector3(c.cx, c.cy, c.h / 2),
        q,
        new THREE.Vector3(dx * 0.86, dy * 0.86, Math.abs(c.h) || 0.001),
      )
      mesh.setMatrixAt(k, m4)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere?.()
  }

  // n/method/F 变化但实例数不变时（不触发 args 重建），仍要刷新矩阵
  useLayoutEffect(() => {
    applyInstances(instRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, dx, dy])

  // 积分区域边框
  const border = [
    [X0, Y0, 0],
    [X1, Y0, 0],
    [X1, Y1, 0],
    [X0, Y1, 0],
    [X0, Y0, 0],
  ]

  return (
    <>
      <Viz3D resetButton cameraPosition={[6.2, -8.2, 5.2]} onMissed={() => setNote(null)} height={480}>
        <Axes3D
          xRange={[X0, X1]}
          yRange={[Y0, Y1]}
          zRange={[0, Math.max(2.5, zMax)]}
          labels={['x', 'y', 'z = f(x,y)']}
        />
        <Tube points={border} radius={0.012} color={C3.fg} opacity={0.5} segments={64} linear />
        <Label3D at={[X0, Y1 + 0.35, 0.1]} color={C3.muted} size={12}>
          积分区域 D = [{X0}, {X1}] × [{Y0}, {Y1}]
        </Label3D>

        {/* 曲面 */}
        <mesh
          geometry={surface.geo}
          onClick={(e) => {
            e.stopPropagation()
            setNote({
              at: [e.point.x, e.point.y, e.point.z],
              text: `曲面 z = f(x,y)：在 (${e.point.x.toFixed(2)}, ${e.point.y.toFixed(
                2,
              )}) 处高度 z = ${e.point.z.toFixed(3)}。二重积分求的就是它与 xy 平面之间、区域 D 上方的体积。`,
            })
          }}
        >
          <meshStandardMaterial
            color={C3.blue}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            roughness={0.5}
          />
        </mesh>

        {/* n×n 柱体 */}
        <instancedMesh
          ref={applyInstances}
          frustumCulled={false}
          args={[undefined, undefined, cols.length]}
          onClick={(e) => {
            e.stopPropagation()
            const c = cols[e.instanceId]
            if (!c) return
            setNote({
              at: [c.cx, c.cy, c.h],
              text: `第 (${c.i + 1}, ${c.j + 1}) 根柱体：取样点 (${c.sx.toFixed(2)}, ${c.sy.toFixed(
                2,
              )})，高 f = ${c.h.toFixed(4)}，底面积 ΔA = ${(dx * dy).toFixed(4)}，体积 = f·ΔA = ${c.vol.toFixed(
                5,
              )}。所有柱体体积之和就是二重积分的近似值。`,
            })
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={C3.green} transparent opacity={0.78} roughness={0.45} />
        </instancedMesh>

        {/* 角点柱体到曲面的高度提示线（选中时不需要，保留坐标轴） */}
        <Line3D p1={[X1, 0, 0]} p2={[X1, 0, zMax]} color={C3.muted} width={1} dashed opacity={0.4} />
        <Bubble3D at={note?.at} text={note?.text} onClose={() => setNote(null)} />
      </Viz3D>
    </>
  )
}
