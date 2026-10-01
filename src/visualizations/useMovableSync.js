import { useEffect, useRef } from 'react'

// mafs v0.21 的 useMovablePoint 不提供拖拽开始/结束回调。
// 本 hook 用包裹 <g> 的指针捕获事件判断「是否正在拖这个点」：
//   - 拖动中：只允许「点 → 外部参数」单向写回，禁止外部 setPoint 抢位置；
//   - 松手后：把点吸附到外部目标（消除四舍五入的 ≤0.005 偏差）；
//   - 非拖动时：滑块/代码/另一个点联动引起的目标变化正常同步到点。
// 解决旧写法两条 useEffect 互相触发、拖点在光标与吸附位置之间来回跳动的问题。
//
// 用法：
//   const sync = useMovableSync(pt, [xVal, yVal], (x, y) => setParam(...))
//   <g {...sync.wrapProps}>{pt.element}</g>
export function useMovableSync(pt, target, onDrag) {
  const dragging = useRef(false)
  const targetRef = useRef(target)
  targetRef.current = target
  const onDragRef = useRef(onDrag)
  if (onDragRef.current !== onDrag) onDragRef.current = onDrag

  // 拖动中：点坐标变化 → 写回外部
  useEffect(() => {
    if (dragging.current) onDragRef.current?.(pt.x, pt.y)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pt.x, pt.y])

  // 外部目标变化（滑块/代码/另一个点联动）且当前没在拖 → 移点
  useEffect(() => {
    if (dragging.current) return
    const [tx, ty] = target
    if (Math.hypot(pt.x - tx, pt.y - ty) > 1e-9) pt.setPoint([tx, ty])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1]])

  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false
    // 松手一帧后吸附到参数目标，避免拖到最后停在「差一点」的位置
    requestAnimationFrame(() => pt.setPoint(targetRef.current))
  }

  return {
    wrapProps: {
      onPointerDownCapture: () => {
        dragging.current = true
      },
      onPointerUpCapture: endDrag,
      onPointerCancelCapture: endDrag,
    },
  }
}
