const html = require('./html')

module.exports = (string) => html`
<date datetime="${string}">${new Date(string).toLocaleDateString(
  'en-US',
  {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
)}</date>
`
