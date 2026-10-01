import katex from 'katex'

export default function Katex({ tex, display = false }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
  })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
