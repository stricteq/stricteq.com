import html from './html.js'

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export default (string) => {
  const date = new Date(string)
  const displayed = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  return html`<date datetime="${string}">${displayed}</date>`
}
