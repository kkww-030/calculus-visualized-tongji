// 极简 MATLAB/Octave 子集转译器
// 目标：让用户能在"代码面板"里用正宗 MATLAB 语法修改参数和函数句柄，
// 前端转成等价 JS 执行，驱动图形变化。
//
// 支持的子集：
//   - 变量赋值：a = 1.5，name = "square"，name = 'square'
//   - 函数句柄：f = @(x) x.^2 / 4 + 1（单行表达式）
//   - for 循环：for k = 1:n ... end（正整数步进）
//   - 输出：disp(expr) 或直接写表达式
//   - 注释：% 后到行尾
//   - 运算：+ - * / ^ 以及 MATLAB 的 .^ .* ./，比较/逻辑运算符
//   - 常用函数：sin cos tan exp log sqrt abs sign floor ceil round mod factorial，常量 pi

const BUILTINS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  exp: Math.exp,
  log: Math.log,
  log10: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pi: Math.PI,
  mod: (a, b) => ((a % b) + b) % b,
  factorial: (k) => {
    let r = 1
    for (let i = 2; i <= k; i++) r *= i
    return r
  },
}

// 去掉行内注释（% 不在字符串内时）
function stripComment(line) {
  let inStr = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === "'" || ch === '"') inStr = !inStr
    else if (ch === '%' && !inStr) return line.slice(0, i)
  }
  return line
}

// MATLAB 运算符 → JS
function fixOps(expr) {
  let e = expr
    .replace(/\.\^/g, ' ** ')
    .replace(/\.\*/g, ' * ')
    .replace(/\.\//g, ' / ')
    .replace(/==/g, ' === ')
    .replace(/~=/g, ' !== ')
    .replace(/\^/g, ' ** ')
  // 幂运算加括号，避免 -x**2 这类 JS 语法错误
  e = e.replace(/([\w\.\)]+)\s*\*\*\s*([\w\.]+)/g, '($1 ** $2)')
  // MATLAB 冒号区间 a:b（for 循环里已单独处理，这里是兜底：不支持数组，仅报错提示）
  return e
}

// 单行 MATLAB → JS（支持一行内用 ; 分隔多条语句）
function transpileLine(line, sources) {
  const raw = stripComment(line)
  // 按 ; 切分（不在字符串内的 ; 才是语句分隔符）
  const parts = []
  let cur = ''
  let inStr = false
  let strCh = ''
  for (const ch of raw) {
    if (inStr) {
      cur += ch
      if (ch === strCh) inStr = false
      continue
    }
    if (ch === "'" || ch === '"') {
      inStr = true
      strCh = ch
      cur += ch
      continue
    }
    if (ch === ';') {
      parts.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  parts.push(cur)
  return parts.map((p) => transpileStmt(p.trim(), sources)).filter(Boolean).join('\n')
}

function transpileStmt(s, sources) {
  if (!s) return ''
  if (s === 'end') return '}'

  // for k = a:b
  let m = s.match(/^for\s+([a-zA-Z]\w*)\s*=\s*(.+):(.+)$/)
  if (m) {
    return `for (let ${m[1]} = Math.round(${fixOps(m[2])}); ${m[1]} <= Math.floor(${fixOps(m[3])}); ${m[1]}++) {`
  }

  // disp(expr)
  m = s.match(/^disp\s*\((.*)\)$/)
  if (m) return `__out(String(${fixOps(m[1])}))`

  // 函数句柄：f = @(x) body
  m = s.match(/^([a-zA-Z_]\w*)\s*=\s*@\(([^)]*)\)\s*(.+)$/)
  if (m) {
    sources[m[1]] = m[3]
    return `__scope.${m[1]} = ((${m[2]}) => ${fixOps(m[3])})`
  }

  // 赋值
  m = s.match(/^([a-zA-Z_]\w*)\s*=(?!=)/)
  if (m) return `__scope.${m[1]} = ${fixOps(s.slice(m[0].length))}`

  // 裸表达式：当作输出
  return `__out(String(${fixOps(s)}))`
}

// 执行 MATLAB 子集代码
// seed: 预置变量（保证用户删掉某行时仍能读到默认值）
// 返回 { scope, sources, out, error }
export function runMatlab(code, seed = {}) {
  const scope = { ...BUILTINS, ...seed }
  const sources = {}
  const out = []
  try {
    const js = code
      .split('\n')
      .map((l) => transpileLine(l, sources))
      .filter(Boolean)
      .join('\n')
    const fn = new Function('__scope', '__out', `with (__scope) {\n${js}\n}`)
    fn(scope, (s) => out.push(s))
    return { scope, sources, out, error: null }
  } catch (err) {
    return {
      scope,
      sources,
      out,
      error: `代码无法执行：${err.message}。请检查表达式是否写完、括号是否配对、for 循环是否漏了 end。`,
    }
  }
}

// 编译函数句柄源码（如 "x.^2/4 + 1" 或 "x.^2 + y.^2"）为 JS 函数，带缓存
const handleCache = new Map()
export function compileHandle(src, args = 'x') {
  const key = `${args}|${src}`
  if (handleCache.has(key)) return handleCache.get(key)
  const { scope, error } = runMatlab(`__f = @(${args}) ${src}`)
  let f = null
  if (!error && typeof scope.__f === 'function') f = scope.__f
  handleCache.set(key, f)
  return f
}
