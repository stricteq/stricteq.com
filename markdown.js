// Helper Function for Rendering Markdown

import commonmark from 'commonmark'

export default (markup, options) => {
  const { safe = false } = (options || {})
  const reader = new commonmark.Parser({ smart: true })
  const writer = new commonmark.HtmlRenderer({ safe })
  const parsed = reader.parse(markup)
  return writer.render(parsed)
}
