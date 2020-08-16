module.exports = (input) => input
  .replace(/<h2 id="[^"]+">([^<]+)<\/h2>/g, '# $1')
  .replace(/<h3 id="[^"]+">([^<]+)<\/h3>/g, '## $1')
  .replace(/\n\*\*\*(.+)\*\*\*\n/g, '\n!!! $1\n')
