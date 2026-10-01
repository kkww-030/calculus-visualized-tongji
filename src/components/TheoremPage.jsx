import Katex from './Katex.jsx'

export default function TheoremPage({ theorem }) {
  const Viz = theorem.viz
  return (
    <main>
      <a className="back" href="#/">
        ← 返回目录
      </a>
      <article className="theorem-page">
        <h2>{theorem.name}</h2>
        <div className="formula">
          <Katex tex={theorem.formula} display />
        </div>
        <p className="intuition">{theorem.intuition}</p>
        <div className="viz">
          <Viz />
        </div>
        <p className="tip">
          交互提示：点击图形中的曲线、圆盘、柱体、色带或点会弹出注释（三维场景中按住拖动可旋转视角、滚轮缩放）；
          下方 MATLAB 代码面板里修改参数后点「运行代码」，图形会实时联动——反过来拖动滑块和圆点，修改也会自动写回代码。
        </p>
        {theorem.note && <p className="note">{theorem.note}</p>}
      </article>
    </main>
  )
}
