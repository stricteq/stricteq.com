// Helper Function for Rendering Markdown

import { Remarkable } from 'remarkable'

export default (markup, options) => {
  const { safe = false } = (options || {})
  const parser = new Remarkable({
    html: !safe,
    typographer: true
  }).use(headerIDs)
  return parser.render(markup)
}

function headerIDs (remarkable) {
  remarkable.renderer.rules.heading_open = (tokens, index) => {
    const level = tokens[index].hLevel
    const text = tokens[index + 1].content
    const slug = text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^a-z0-9-]/g, '')
    return `<h${level} id="${slug}">`
  }
}
