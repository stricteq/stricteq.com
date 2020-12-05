// Helper Function for Rendering Markdown

import { Parser, HtmlRenderer } from 'commonmark'

export default (markup, options) => {
  const { safe = false } = (options || {})
  const reader = new Parser({ smart: true })
  const writer = new HtmlRenderer({ safe })
  const parsed = reader.parse(markup)
  return writer.render(parsed)
}
