import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { octave } from '@codemirror/legacy-modes/mode/octave'

// MATLAB 代码面板：可编辑代码 + 运行/重置 + 输出/报错
export default function CodePanel({ code, onCodeChange, onRun, onReset, output, error, hint }) {
  return (
    <div className="code-panel">
      <div className="code-head">
        <span className="code-title">MATLAB 代码（与图形联动）</span>
        <span className="code-actions">
          <button className="ctrl-play" onClick={onRun}>
            运行代码
          </button>
          <button className="ctrl-reset" onClick={onReset}>
            重置
          </button>
        </span>
      </div>
      <CodeMirror
        value={code}
        height="auto"
        extensions={[StreamLanguage.define(octave)]}
        onChange={onCodeChange}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
      />
      {error && <div className="code-error">{error}</div>}
      {output?.length > 0 && (
        <div className="code-output">
          {output.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
