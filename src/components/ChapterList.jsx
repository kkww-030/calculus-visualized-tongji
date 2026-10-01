import { Fragment } from 'react'
import Katex from './Katex.jsx'
import { chapters } from '../data/theorems.js'

const DIM_BADGE = {
  '2d': { label: '2D', title: '二维平面交互演示' },
  '3d': { label: '3D', title: '三维可旋转交互演示' },
  '2d3d': { label: '2D + 3D', title: '支持二维 / 三维视角切换' },
}

export default function ChapterList() {
  let lastPart = null
  return (
    <main>
      <div className="dim-legend">
        <span className="dim-badge dim-badge-2d">2D</span>二维平面
        <span className="dim-badge dim-badge-3d">3D</span>三维可旋转
        <span className="dim-badge dim-badge-2d3d">2D + 3D</span>双视角切换
      </div>
      {chapters.map((ch) => {
        const showPart = ch.part && ch.part !== lastPart
        lastPart = ch.part
        return (
          <Fragment key={ch.id}>
            {showPart && (
              <div className="part-divider">
                <span>{ch.part}</span>
              </div>
            )}
            <section className="chapter">
              <h2>{ch.title}</h2>
              <div className="cards">
                {ch.theorems.map((t) => {
                  const badge = DIM_BADGE[t.dim]
                  if (t.coming) {
                    return (
                      <div key={t.id} className="card card-soon" aria-disabled="true">
                        {badge && (
                          <span className={`dim-badge dim-badge-${t.dim}`} title={badge.title}>
                            {badge.label}
                          </span>
                        )}
                        <div className="card-formula">
                          <Katex tex={t.short} display />
                        </div>
                        <h3>{t.name}</h3>
                        <p>{t.intuition}</p>
                        <span className="card-go card-soon-tag">即将推出</span>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={t.id}
                      className="card"
                      onClick={() => (window.location.hash = `#/theorem/${t.id}`)}
                    >
                      {badge && (
                        <span className={`dim-badge dim-badge-${t.dim}`} title={badge.title}>
                          {badge.label}
                        </span>
                      )}
                      <div className="card-formula">
                        <Katex tex={t.short} display />
                      </div>
                      <h3>{t.name}</h3>
                      <p>{t.intuition}</p>
                      <span className="card-go">查看交互演示 →</span>
                    </button>
                  )
                })}
              </div>
            </section>
          </Fragment>
        )
      })}
    </main>
  )
}
