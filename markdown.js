// Helper Function for Rendering Markdown

const commonmark = require('commonmark')

module.exports = (markup, options) => {
  const { safe = false } = (options || {})
  const reader = new commonmark.Parser({ smart: true })
  const writer = new commonmark.HtmlRenderer({ safe })
  const parsed = reader.parse(markup)
  return writer.render(parsed)
}
