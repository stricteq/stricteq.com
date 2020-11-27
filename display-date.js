const html = require('./html')
const englishMonths = require('english-months')

module.exports = (string) => {
  const date = new Date(string)
  const displayed = `${englishMonths[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  return html`<date datetime="${string}">${displayed}</date>`
}
