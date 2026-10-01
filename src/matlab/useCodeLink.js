import { useCallback, useMemo, useRef, useState } from 'react'
import { runMatlab, compileHandle } from './matlab.js'

// “交互区参数 ⇄ MATLAB 代码”双向绑定 hook
//
// spec: { key: { type: 'num' | 'str' | 'fn', default, args } }
//   - num: 数字参数（滑块/拖点 ⇄ 代码行 `a = 1.5`）
//   - str: 字符串选项（切换按钮 ⇄ 代码行 `wave = 'square'`）
//   - fn:  函数句柄（默认 `f = @(x) x.^2`；可用 args 指定多元参数，如 ['x','y']，vals 中存句柄源码字符串）
// pre: 代码顶部的 % 注释说明（重写参数行时保持不动）
//
// 返回 { vals, fns, code, setCode, setParam, run, out, error, reset }
//   - vals:  当前参数值（fn 类型为句柄源码字符串）
//   - fns:   { key: 编译后的 JS 函数 }（仅 fn 类型）
//   - run(): 运行当前代码 → 成功后把代码里的值回读到交互区
export function useCodeLink(spec, pre = '') {
  const keys = useMemo(() => Object.keys(spec), [spec])
  const defaults = useMemo(() => {
    const d = {}
    for (const k of keys) d[k] = spec[k].default
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys])

  const genCode = useCallback(
    (vals) => {
      const lines = keys.map((k) => {
        const s = spec[k]
        if (s.type === 'fn') {
          const args = (s.args ?? ['x']).join(',')
          return `${k} = @(${args}) ${vals[k]}`
        }
        if (s.type === 'str') return `${k} = '${vals[k]}'`
        return `${k} = ${vals[k]}`
      })
      return pre ? `${pre}\n${lines.join('\n')}` : lines.join('\n')
    },
    [keys, pre, spec],
  )

  const [vals, setVals] = useState(defaults)
  const valsRef = useRef(vals)
  valsRef.current = vals
  const [code, setCode] = useState(() => genCode(defaults))
  const [result, setResult] = useState({ out: [], error: null })

  // fn 参数 → 可调用的 JS 函数（compileHandle 自带缓存）
  const fns = useMemo(() => {
    const m = {}
    for (const k of keys) {
      if (spec[k].type !== 'fn') continue
      const args = (spec[k].args ?? ['x']).join(',')
      const src = typeof vals[k] === 'string' ? vals[k] : spec[k].default
      m[k] = compileHandle(src, args) || compileHandle(spec[k].default, args)
    }
    return m
  }, [vals, keys, spec])

  // 交互区 → 代码：改写代码中对应的一行
  const setParam = useCallback(
    (key, v) => {
      if (valsRef.current[key] === v) return
      const nv = { ...valsRef.current, [key]: v }
      valsRef.current = nv
      setVals(nv)
      setCode((c) => {
        const s = spec[key]
        let head
        if (s.type === 'fn') {
          const args = (s.args ?? ['x']).join(',')
          head = `${key} = @(${args}) ${v}`
        } else if (s.type === 'str') head = `${key} = '${v}'`
        else head = `${key} = ${v}`
        const re = new RegExp(`^[ \\t]*${key}[ \\t]*=.*$`, 'm')
        return re.test(c) ? c.replace(re, head) : `${head}\n${c}`
      })
    },
    [spec],
  )

  // 代码 → 交互区：运行后回读
  const run = useCallback(() => {
    const seed = {}
    for (const k of keys) {
      seed[k] =
        spec[k].type === 'fn'
          ? compileHandle(spec[k].default, (spec[k].args ?? ['x']).join(','))
          : spec[k].default
    }
    const r = runMatlab(code, seed)
    setResult({ out: r.out, error: r.error })
    if (r.error) return null
    setVals((old) => {
      const nv = { ...old }
      for (const k of keys) {
        const s = spec[k]
        if (s.type === 'fn') {
          if (r.sources[k] != null) nv[k] = r.sources[k]
        } else if (r.scope[k] !== undefined) {
          if (s.type === 'num') {
            const v = Number(r.scope[k])
            if (Number.isFinite(v)) nv[k] = v
          } else {
            nv[k] = String(r.scope[k])
          }
        }
      }
      valsRef.current = nv
      return nv
    })
    return r
  }, [code, keys, spec])

  const reset = useCallback(() => {
    setVals(defaults)
    valsRef.current = defaults
    setCode(genCode(defaults))
    setResult({ out: [], error: null })
  }, [defaults, genCode])

  return { vals, fns, code, setCode, setParam, run, out: result.out, error: result.error, reset }
}
