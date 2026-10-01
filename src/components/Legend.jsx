// 图例：说明图中各颜色元素的含义
export default function Legend({ items, hint }) {
  return (
    <>
      {items?.length > 0 && (
        <div className="viz-legend">
          {items.map((it) => (
            <span key={it.label} className="viz-legend-item">
              <i style={it.dashed ? { background: `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)` } : { background: it.color }} />
              {it.label}
            </span>
          ))}
        </div>
      )}
      {hint && <div className="viz-hintbar">{hint}</div>}
    </>
  )
}
