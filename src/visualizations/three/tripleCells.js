// 三重积分三种坐标系的体积元网格，供 3D 渲染与数值求和共用，保证「看到的」与「算的」完全一致。
//
// 每个 cell：
//   center: [x,y,z]      取样中点（直角坐标）
//   value: f(center)
//   dV:                 该体积元的真实体积（求和权重）
//   corners: 8 个 [x,y,z]，已带微小间隙收缩，仅用于画图（不参与数值求和）

const TAU = Math.PI * 2
const SHRINK = 0.92

export const REGIONS = {
  cart: { R: null, H: null, dVText: 'dV = dx·dy·dz' },
  cyl: { R: 1, H: 2, dVText: 'dV = r·dr·dθ·dz' },
  sph: { R: 1.5, H: null, dVText: 'dV = ρ²·sin φ·dρ·dθ·dφ' },
}

const sph = (rho, theta, phi) => [rho * Math.sin(phi) * Math.cos(theta), rho * Math.sin(phi) * Math.sin(theta), rho * Math.cos(phi)]

function wedgeCorners(rLo, rHi, tLo, tHi, zLo, zHi, toXyz, gap = SHRINK) {
  // 向格子中心收缩一点，让相邻体积元之间有缝隙可辨
  const rM = (rLo + rHi) / 2
  const tM = (tLo + tHi) / 2
  const zM = (zLo + zHi) / 2
  const r0 = rM + (rLo - rM) * gap
  const r1 = rM + (rHi - rM) * gap
  const a0 = tM + (tLo - tM) * gap
  const a1 = tM + (tHi - tM) * gap
  const z0 = zM + (zLo - zM) * gap
  const z1 = zM + (zHi - zM) * gap
  const out = []
  for (const rr of [r0, r1]) {
    for (const aa of [a0, a1]) {
      for (const zz of [z0, z1]) out.push(toXyz(rr, aa, zz))
    }
  }
  return out
}

// n：每「主」方向的等分数；角向取 2n
export function buildCells(mode, n, F) {
  const cells = []
  let sum = 0
  let count = 0

  if (mode === 'cart') {
    const X0 = -1, X1 = 1, Y0 = -1, Y1 = 1, Z0 = 0, Z1 = 2
    const dx = (X1 - X0) / n
    const dy = (Y1 - Y0) / n
    const dz = (Z1 - Z0) / n
    const dV = dx * dy * dz
    for (let k = 0; k < n; k++) {
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const x = X0 + (i + 0.5) * dx
          const y = Y0 + (j + 0.5) * dy
          const z = Z0 + (k + 0.5) * dz
          const v = safeF(F, x, y, z)
          // 直角格子：直接用收缩后的包围盒
          const mx = (dx * (1 - SHRINK)) / 2
          const my = (dy * (1 - SHRINK)) / 2
          const mz = (dz * (1 - SHRINK)) / 2
          const corners = []
          for (const sx of [-1, 1])
            for (const sy of [-1, 1])
              for (const sz of [-1, 1]) corners.push([x + sx * (dx / 2 - mx), y + sy * (dy / 2 - my), z + sz * (dz / 2 - mz)])
          cells.push({ center: [x, y, z], value: v, dV, corners })
          sum += v * dV
          count++
        }
      }
    }
  } else if (mode === 'cyl') {
    const { R, H } = REGIONS.cyl
    const nr = n
    const nt = 2 * n
    const nz = n
    const dr = R / nr
    const dt = TAU / nt
    const dz = H / nz
    for (let i = 0; i < nr; i++) {
      for (let t = 0; t < nt; t++) {
        for (let k = 0; k < nz; k++) {
          const rLo = i * dr
          const rHi = (i + 1) * dr
          const tLo = t * dt
          const tHi = (t + 1) * dt
          const zLo = k * dz
          const zHi = (k + 1) * dz
          const rM = (rLo + rHi) / 2
          const tM = (tLo + tHi) / 2
          const zM = (zLo + zHi) / 2
          const [x, y, z] = [rM * Math.cos(tM), rM * Math.sin(tM), zM]
          const v = safeF(F, x, y, z)
          const dV = rM * dr * dt * dz
          const corners = wedgeCorners(rLo, rHi, tLo, tHi, zLo, zHi, (rr, aa, zz) => [rr * Math.cos(aa), rr * Math.sin(aa), zz])
          cells.push({ center: [x, y, z], value: v, dV, corners })
          sum += v * dV
          count++
        }
      }
    }
  } else {
    const { R } = REGIONS.sph
    const nr = n
    const nt = 2 * n
    const np = n
    const dr = R / nr
    const dt = TAU / nt
    const dp = Math.PI / np
    for (let i = 0; i < nr; i++) {
      for (let t = 0; t < nt; t++) {
        for (let p = 0; p < np; p++) {
          const rLo = i * dr
          const rHi = (i + 1) * dr
          const tLo = t * dt
          const tHi = (t + 1) * dt
          const pLo = p * dp
          const pHi = (p + 1) * dp
          const rM = (rLo + rHi) / 2
          const tM = (tLo + tHi) / 2
          const pM = (pLo + pHi) / 2
          const [x, y, z] = sph(rM, tM, pM)
          const v = safeF(F, x, y, z)
          const dV = rM * rM * Math.sin(pM) * dr * dt * dp
          const corners = wedgeCorners(rLo, rHi, tLo, tHi, pLo, pHi, sph, 0.9)
          cells.push({ center: [x, y, z], value: v, dV, corners })
          sum += v * dV
          count++
        }
      }
    }
  }

  return { cells, sum, count }
}

function safeF(F, x, y, z) {
  const v = F(x, y, z)
  return Number.isFinite(v) ? v : 0
}
