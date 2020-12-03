export default (input) => input
  .replace(/<h2 id="[^"]+">([^<]+)<\/h2>/g, '# $1')
  .replace(/<h3 id="[^"]+">([^<]+)<\/h3>/g, '## $1')
  .replace(/\n<span class="conspicuous" markdown="1">(.+)<\/span>\n/g, '\n!!! $1\n')
