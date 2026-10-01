import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Mafs, useTransformContext, vec } from 'mafs'

const VizContext = createContext(null)

// 统一封装 Mafs 视图：
// - 自适应宽度（ResizeObserver 跟随容器）；渲染管线被阻塞时（遮挡窗口/无头环境）400ms 后回退固定宽度
// - 提供 HTML 覆盖层，用于渲染点击注释气泡
// - 透传 onClick（参数为数学坐标）
export default function VizMafs({ viewBox, onClick, children }) {
  const wrapRef = useRef(null)
  const overlayRef = useRef(null)
  const [width, setWidth] = useState(undefined)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let got = false
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (w > 0) {
        got = true
        setWidth(w)
      }
    })
    ro.observe(el)
    const timer = setTimeout(() => {
      if (!got) setWidth(el.getBoundingClientRect().width || 900)
    }, 400)
    return () => {
      ro.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return (
    <VizContext.Provider value={{ overlay: overlayRef }}>
      <div ref={wrapRef} style={{ width: '100%', position: 'relative' }}>
        <div ref={overlayRef} className="viz-overlay" />
        <Mafs
          viewBox={viewBox}
          width={width ?? 'auto'}
          preserveAspectRatio={false}
          pan={false}
          onClick={onClick}
        >
          {children}
        </Mafs>
      </div>
    </VizContext.Provider>
  )
}

// 气泡注释：作为 Mafs 的子元素渲染，at 为数学坐标
// 定位策略：默认出现在点击点右侧；靠近右边缘自动翻到左侧；上下边缘自动收进安全区，避免被裁切
function BubbleInner({ x, y, text, onClose, host }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !host) return
    const W = host.clientWidth
    const H = host.clientHeight
    const w = el.offsetWidth
    const h = el.offsetHeight
    let left = x + 14
    if (left + w > W - 8) left = x - 14 - w // 右侧放不下 → 翻到左侧
    left = Math.max(8, Math.min(left, Math.max(8, W - w - 8)))
    let top = y - h / 2
    top = Math.max(8, Math.min(top, Math.max(8, H - h - 8)))
    setPos({ left, top })
  }, [x, y, text, host])

  return (
    <div
      ref={ref}
      className="viz-bubble"
      style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
      onClick={onClose}
      title="点击关闭"
    >
      {text}
    </div>
  )
}

export function Bubble({ at, text, onClose }) {
  const ctx = useContext(VizContext)
  const { viewTransform } = useTransformContext()
  const host = ctx?.overlay?.current
  if (!at || !host) return null
  const [px, py] = vec.transform(at, viewTransform)
  return createPortal(<BubbleInner x={px} y={py} text={text} onClose={onClose} host={host} />, host)
}
