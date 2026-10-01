import { useEffect, useState } from 'react'

// 动画时钟：播放时累加时间，暂停即冻结。
// 主驱动用 requestAnimationFrame；若 WebGL 画布切换等原因导致 rAF 连续不触发，
// 由 setInterval 兜底推进，避免动画彻底卡住。
export function useAnimClock(playing, speed = 1) {
  const [time, setTime] = useState(0)
  useEffect(() => {
    if (!playing) return
    let raf
    let last = performance.now()
    let lastRafAt = last

    const advance = () => {
      const now = performance.now()
      // performance.now() 是单调时钟，比 rAF 回调的 now 参数更稳定
      // （WebGL 合成器切换时 rAF 时间戳偶发异常）
      let dt = ((now - last) / 1000) * speed
      if (dt > 0) {
        if (dt > 1) dt = 1 // 后台切回时钳制，防止一帧跳很远
        setTime((t) => t + dt)
      }
      last = now
    }

    const tick = () => {
      lastRafAt = performance.now()
      advance()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // 兜底：rAF 若 200ms 内未触发（如 WebGL 上下文切换后合成器异常），
    // 用 setInterval 推进时间，保证动画不卡死。
    const fallback = setInterval(() => {
      if (performance.now() - lastRafAt > 200) advance()
    }, 100)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(fallback)
    }
  }, [playing, speed])
  return [time, setTime]
}
