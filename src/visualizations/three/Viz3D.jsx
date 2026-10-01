import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'

// 与 Mafs 二维场景一致的配色
export const C3 = {
  blue: '#58a6ff',
  orange: '#f14e0e',
  green: '#15e272',
  red: '#f11d0e',
  violet: '#ae58ff',
  yellow: '#ffe44a',
  pink: '#ee00ab',
  fg: '#ffffff',
  muted: '#8b95a5',
  grid: '#262b36',
}

// 三维视图容器：黑色背景 + 轨道控制器（拖拽旋转 / 滚轮缩放 / 触屏）
// 约定：x、y 为水平面，z 为竖直轴（傅里叶/欧拉：Re / Im / 时间 t；二重积分：x / y / z=f(x,y)）
export default function Viz3D({
  children,
  cameraPosition = [7.5, -9, 6],
  target = [0, 0, 0],
  onMissed,
  height = 480,
  resetButton = false,
  toolbar = null,
}) {
  const controlsRef = useRef(null)

  // 记住初始相机/目标位置，供“复位视角”使用（切勿通过重建 Canvas 复位——会丢失 WebGL 上下文）
  useEffect(() => {
    const id = requestAnimationFrame(() => controlsRef.current?.saveState())
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="viz3d" style={{ height }}>
      {(resetButton || toolbar) && (
        <div className="viz3d-toolbar">
          {toolbar}
          {resetButton && <button onClick={() => controlsRef.current?.reset()}>复位视角</button>}
        </div>
      )}
      <Canvas
        dpr={[1, 2]}
        camera={{ position: cameraPosition, fov: 42, near: 0.1, far: 300, up: [0, 0, 1] }}
        onPointerMissed={onMissed}
        onCreated={(state) => {
          if (import.meta.env.DEV) window.__r3f = state
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 8, 12]} intensity={1.05} />
        {children}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={target}
          enableDamping
          dampingFactor={0.12}
          enablePan={false}
          minDistance={2.5}
          maxDistance={40}
        />
      </Canvas>
      <div className="viz3d-hint">按住拖动旋转视角 · 滚轮缩放</div>
    </div>
  )
}

// 坐标轴 + 地板网格（xy 平面，z=0）
export function Axes3D({ xRange, yRange, zRange, labels = ['x', 'y', 'z'], gridDivisions }) {
  const size = Math.max(xRange[1] - xRange[0], yRange[1] - yRange[0])
  const div = gridDivisions ?? Math.round(size)
  return (
    <group>
      <gridHelper
        args={[size, div, C3.grid, C3.grid]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.001]}
      />
      <Line points={[[xRange[0], 0, 0], [xRange[1], 0, 0]]} color={C3.red} lineWidth={1.5} />
      <Line points={[[0, yRange[0], 0], [0, yRange[1], 0]]} color={C3.green} lineWidth={1.5} />
      <Line points={[[0, 0, 0], [0, 0, zRange[1]]]} color={C3.blue} lineWidth={1.5} />
      <Label3D at={[xRange[1] + 0.25, 0, 0]} color={C3.red}>
        {labels[0]}
      </Label3D>
      <Label3D at={[0, yRange[1] + 0.25, 0]} color={C3.green}>
        {labels[1]}
      </Label3D>
      <Label3D at={[0, 0, zRange[1] + 0.25]} color={C3.blue}>
        {labels[2]}
      </Label3D>
      <Label3D at={[0, 0, 0]} color={C3.muted}>
        O
      </Label3D>
    </group>
  )
}

// 始终面向屏幕的文字标签（DOM 渲染，无需加载字体文件）
export function Label3D({ at, children, color = C3.fg, size = 13 }) {
  return (
    <Html position={at} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <span className="v3d-label" style={{ color, fontSize: size }}>
        {children}
      </span>
    </Html>
  )
}

// 线段
export function Line3D({ p1, p2, color = C3.fg, width = 2, dashed = false, opacity = 1 }) {
  return (
    <Line
      points={[p1, p2]}
      color={color}
      lineWidth={width}
      dashed={dashed}
      dashSize={0.18}
      gapSize={0.12}
      transparent={opacity < 1 || dashed}
      opacity={opacity}
    />
  )
}

// 由离散点生成的圆管（比线条更易点击，用于螺旋线 / 投影曲线 / 矩形边框）
// linear=true 时折线逐段拉直（适合矩形边框，避免样条在拐角处超出顶点）
export function Tube({ points, radius = 0.02, color, opacity = 1, closed = false, onClick, segments, linear = false }) {
  const geo = useMemo(() => {
    const v = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
    // 首尾点重复时，自动去掉末点并按闭合处理（否则零长度段会让样条产生除零畸形）
    let isClosed = closed
    if (!isClosed && v.length > 2 && v[0].distanceTo(v[v.length - 1]) < 1e-9) {
      v.pop()
      isClosed = true
    }
    let curve
    if (linear) {
      const path = new THREE.CurvePath()
      for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1]))
      if (isClosed) path.add(new THREE.LineCurve3(v[v.length - 1], v[0]))
      curve = path
    } else {
      curve = new THREE.CatmullRomCurve3(v, isClosed, 'catmullrom', 0.5)
    }
    return new THREE.TubeGeometry(curve, segments ?? Math.max(48, points.length * 8), radius, 10, isClosed)
  }, [points, radius, closed, segments, linear])
  return (
    <mesh
      geometry={geo}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick(e)
            }
          : undefined
      }
    >
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} roughness={0.45} />
    </mesh>
  )
}

// 水平放置的圆环（复平面上的谐波圆盘）
export function Ring3D({ center, r, color, opacity = 0.9, tube = 0.012, onClick }) {
  return (
    <mesh
      position={center}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick(e)
            }
          : undefined
      }
    >
      <torusGeometry args={[r, tube, 8, 96]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} roughness={0.4} />
    </mesh>
  )
}

// 三维场景中的注释气泡：锚定在三维点上，始终面向屏幕；
// 接近画布边缘时自动把锚点钳制进安全区，避免被 overflow:hidden 裁切
export function Bubble3D({ at, text, onClose }) {
  const innerRef = useRef(null)
  const [, force] = useState(0)

  // 字体加载/文本变化后再触发一次渲染，让当帧 DOM 测量拿到最终尺寸
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => force((x) => x + 1))
    const el = innerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return () => cancelAnimationFrame(raf)
    const ro = new ResizeObserver(() => force((x) => x + 1))
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [text])

  if (!at || !text) return null

  // drei 每帧调用：把三维锚点投影为屏幕像素坐标，再按气泡实测尺寸收进画布。
  // 尺寸必须在调用当帧直接从 DOM 读取：依赖 React state 会因闭包时序拿到 0，
  // 边缘气泡就会溢出画布被裁。
  const calcPosition = (obj, camera, size) => {
    const v = new THREE.Vector3()
    obj.getWorldPosition(v)
    v.project(camera)
    if (v.z > 1) return [-9999, -9999] // 锚点跑到相机背后时藏到屏外
    const el = innerRef.current
    const hw = (el?.offsetWidth ?? 0) / 2 + 8
    const hh = (el?.offsetHeight ?? 0) / 2 + 8
    const px = (v.x * 0.5 + 0.5) * size.width
    const py = (-v.y * 0.5 + 0.5) * size.height
    return [
      Math.min(size.width - hw, Math.max(hw, px)),
      Math.min(size.height - hh, Math.max(hh, py)),
    ]
  }

  return (
    <Html position={at} calculatePosition={calcPosition} zIndexRange={[30, 0]} center style={{ pointerEvents: 'none' }}>
      <div
        ref={innerRef}
        className="viz-bubble viz-bubble-3d"
        onClick={(e) => {
          e.stopPropagation()
          onClose?.()
        }}
        title="点击关闭"
      >
        {text}
      </div>
    </Html>
  )
}
