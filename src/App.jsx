import { useEffect, useRef, useState } from 'react'
import ChapterList from './components/ChapterList.jsx'
import TheoremPage from './components/TheoremPage.jsx'
import BookTOC from './components/BookTOC.jsx'
import { findTheorem } from './data/theorems.js'

const THEOREM_RE = /^#\/theorem\/([\w-]+)$/

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const hash = useHashRoute()
  const match = hash.match(THEOREM_RE)
  const theorem = match ? findTheorem(match[1]) : null

  const [tocOpen, setTocOpen] = useState(false)
  const homeScrollRef = useRef(0)
  const prevHashRef = useRef(hash)

  // 滚动位置处理：
  // - 首页 → 定理页：记下首页滚动位置，然后滚到顶部阅读；
  // - 定理页 → 首页：恢复上次首页的滚动位置，不再每次回到最上面；
  // - 定理页 → 定理页：保持顶部。
  useEffect(() => {
    const isHome = !THEOREM_RE.test(hash)
    const wasHome = !THEOREM_RE.test(prevHashRef.current)
    prevHashRef.current = hash
    if (isHome) {
      const y = homeScrollRef.current
      const r1 = requestAnimationFrame(() => window.scrollTo({ top: y }))
      // KaTeX/卡片渲染可能改变总高度，再延迟校正一次
      const t = window.setTimeout(() => window.scrollTo({ top: homeScrollRef.current }), 90)
      return () => {
        cancelAnimationFrame(r1)
        window.clearTimeout(t)
      }
    }
    if (wasHome) homeScrollRef.current = window.scrollY
    window.scrollTo(0, 0)
  }, [hash])

  // 抽屉打开时锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = tocOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [tocOpen])

  const goHome = () => {
    window.location.hash = '#/'
  }

  const handleTocNavigate = (id) => {
    setTocOpen(false)
    window.location.hash = id ? `#/theorem/${id}` : '#/'
  }

  return (
    <div className="app">
      <header className="app-header" onClick={goHome}>
        <h1>公式几何书</h1>
        <p>每个公式背后，都藏着一个几何直觉 —— 点击卡片进入交互演示</p>
      </header>
      {theorem ? <TheoremPage theorem={theorem} /> : <ChapterList />}
      <footer className="app-footer">纯前端静态站点 · React + Mafs + three.js + KaTeX · 本地运行无需联网</footer>
      <BookTOC
        open={tocOpen}
        onToggle={() => setTocOpen((v) => !v)}
        onClose={() => setTocOpen(false)}
        currentId={theorem?.id}
        onNavigate={handleTocNavigate}
      />
    </div>
  )
}
