import markdown from '../../markdown.js'
import tap from 'tap'

tap.test('markdown', test => {
  test.equal(
    markdown('## This Isn\'t a Test\n\ntest'),
    '<h2 id="this-isnt-a-test">This Isn’t a Test</h2>\n<p>test</p>\n',
    'adds ID to heading'
  )
  test.equal(
    markdown('<mark>test</mark>'),
    '<p><mark>test</mark></p>\n',
    'passes <mark> through'
  )
  test.equal(
    markdown('this ain\'t no "test"'),
    '<p>this ain’t no “test”</p>\n',
    'typographers\' quotes'
  )
  test.equal(
    markdown('this---that'),
    '<p>this—that</p>\n',
    'mdash'
  )
  test.end()
})
