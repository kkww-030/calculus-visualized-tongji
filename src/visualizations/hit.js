// 命中检测工具（数学坐标系），配合 Mafs 的 onClick 使用

export function distToPoint(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1])
}

// 点到曲线 y=f(x) 的最近距离（在 p.x 附近采样）
export function distToCurve(p, f, range = 4, steps = 240) {
  let best = Infinity
  for (let i = 0; i <= steps; i++) {
    const x = p[0] - range / 2 + (range * i) / steps
    const y = f(x)
    if (!Number.isFinite(y)) continue
    const d = Math.hypot(p[0] - x, p[1] - y)
    if (d < best) best = d
  }
  return best
}

// 点到线段 p1-p2 的距离
export function distToSegment(p, p1, p2) {
  const vx = p2[0] - p1[0]
  const vy = p2[1] - p1[1]
  const wx = p[0] - p1[0]
  const wy = p[1] - p1[1]
  const len2 = vx * vx + vy * vy
  if (len2 === 0) return Math.hypot(wx, wy)
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2))
  return Math.hypot(p[0] - (p1[0] + t * vx), p[1] - (p1[1] + t * vy))
}

// 点到圆心 c、半径 r 的圆周的距离
export function distToCircle(p, c, r) {
  return Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - r)
}
