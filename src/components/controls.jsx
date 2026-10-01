export function Slider({ label, min, max, step = 1, value, onChange, format = (v) => String(v) }) {
  return (
    <label className="ctrl-slider">
      <span className="ctrl-label">
        <span>{label}</span>
        <b>{format(value)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}

export function PlayButton({ playing, onToggle }) {
  return (
    <button className="ctrl-play" onClick={onToggle}>
      {playing ? '暂停' : '播放'}
    </button>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="ctrl-seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
