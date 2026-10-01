import { useEffect } from 'react'
import { chapters } from '../data/theorems.js'

const DIM_DOT = {
  '2d': { cls: 'toc-dot-2d', text: '2D' },
  '3d': { cls: 'toc-dot-3d', text: '3D' },
  '2d3d': { cls: 'toc-dot-2d3d', text: '2D+3D' },
}

export default function BookTOC({ open, onToggle, onClose, currentId, onNavigate }) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  let lastPart = null

  return (
    <>
      <button
        className="toc-fab"
        onClick={onToggle}
        title="打开书本总目录"
        aria-label="打开书本总目录"
      >
        {open ? '✕' : '☰'}
      </button>
      {open && (
        <>
          <div className="toc-backdrop" onClick={onClose} />
          <aside className="toc-drawer" role="dialog" aria-label="书本总目录">
            <div className="toc-head">
              <h2>目 录</h2>
              <button className="toc-close" onClick={onClose} aria-label="关闭目录">
                ✕
              </button>
            </div>
            <nav className="toc-body">
              {chapters.map((ch) => {
                const showPart = ch.part && ch.part !== lastPart
                lastPart = ch.part
                return (
                  <div key={ch.id} className="toc-chapter">
                    {showPart && <div className="toc-part">{ch.part}</div>}
                    <div className="toc-ch-title">{ch.title}</div>
                    <ul>
                      {ch.theorems.map((t) => {
                        const dim = DIM_DOT[t.dim]
                        if (t.coming) {
                          return (
                            <li key={t.id} className="toc-item toc-item-soon">
                              <span className="toc-item-name">{t.name}</span>
                              <span className="toc-item-tag">即将推出</span>
                            </li>
                          )
                        }
                        const active = t.id === currentId
                        return (
                          <li key={t.id}>
                            <button
                              className={`toc-item toc-item-link${active ? ' toc-item-active' : ''}`}
                              onClick={() => onNavigate(t.id)}
                            >
                              <span className="toc-item-name">{t.name}</span>
                              {dim && <span className={`toc-dot ${dim.cls}`}>{dim.text}</span>}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </nav>
          </aside>
        </>
      )}
    </>
  )
}
