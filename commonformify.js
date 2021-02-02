export default (input) => input
  .replace(/\n## (.+)\n/g, '# $1\n')
  .replace(/\n### (.+)\n/g, '## $1\n')
  .replace(/\n#### (.+)\n/g, '### $1\n')
  .replace(/\n##### (.+)\n/g, '#### $1\n')
  .replace(/\n###### (.+)\n/g, '##### $1\n')
  .replace(/\n<span class="conspicuous" markdown="1">(.+)<\/span>\n/g, '\n!!! $1\n')
