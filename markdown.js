// Helper Function for Rendering Markdown

const commonmark = require('commonmark')

module.exports = (markup) => {
  const reader = new commonmark.Parser({ smart: true })
  const writer = new commonmark.HtmlRenderer()
  const parsed = reader.parse(markup)
  return writer.render(parsed)
}
