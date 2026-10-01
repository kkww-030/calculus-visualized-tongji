// ── 5 种周期波形：第 m(m>0) 次谐波的复系数 c_m 与目标波形（2D/3D 共享） ──
// 实信号满足 c_{-m} = conj(c_m)，部分和 S(θ) = c_0 + 2·Re(c_m·e^{imθ})
export const mod2pi = (t) => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

export const WAVES = {
  square: {
    label: '方波',
    c0: 0,
    c: (m) => (m % 2 === 0 ? { re: 0, im: 0 } : { re: 0, im: -2 / (Math.PI * m) }),
    target: (t) => (Math.sin(t) >= 0 ? 1 : -1),
    radiusTip: '方波只含奇次谐波，半径 = 2/(πm) ∝ 1/m。',
    gibbs: true,
  },
  triangle: {
    label: '三角波',
    c0: 0,
    c: (m) => {
      if (m % 2 === 0) return { re: 0, im: 0 }
      const s = ((m - 1) / 2) % 2 === 0 ? 1 : -1
      return { re: 0, im: (-s * 4) / (Math.PI * Math.PI * m * m) }
    },
    target: (t) => (2 / Math.PI) * Math.asin(Math.sin(t)),
    radiusTip: '三角波只有奇次谐波，半径 ∝ 1/m² ——衰减很快，所以它比方波"光滑"。',
    gibbs: false,
  },
  sawtooth: {
    label: '锯齿波',
    c0: 0,
    c: (m) => ({ re: 0, im: (m % 2 === 0 ? 1 : -1) / (Math.PI * m) }),
    target: (t) => mod2pi(t + Math.PI) / Math.PI - 1,
    radiusTip: '锯齿波含全部整数次谐波，半径 ∝ 1/m。',
    gibbs: true,
  },
  pulse: {
    label: '窄脉冲',
    c0: 0.25,
    c: (m) => ({ re: Math.sin((m * Math.PI) / 4) / (m * Math.PI), im: 0 }),
    target: (t) => (Math.abs(mod2pi(t + Math.PI) - Math.PI) < Math.PI / 4 ? 1 : 0),
    radiusTip: '占空比 25% 的脉冲：半径 = |sin(mπ/4)|/(mπ)，每 4 次谐波出现一次"空缺"。',
    gibbs: true,
  },
  rect: {
    label: '整流正弦',
    c0: 2 / Math.PI,
    c: (m) => (m % 2 === 0 ? { re: -2 / (Math.PI * (m * m - 1)), im: 0 } : { re: 0, im: 0 }),
    target: (t) => Math.abs(Math.sin(t)),
    radiusTip: '|sin x| 只含偶次谐波，半径 = 2/(π(m²−1))，衰减极快。',
    gibbs: false,
  },
}

export const WAVE_OPTIONS = Object.entries(WAVES).map(([value, w]) => ({ value, label: w.label }))
