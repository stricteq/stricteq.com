import constants from '../constants.js'
import docxToPDF from '../docx-to-pdf.js'
import fs from 'fs'
import os from 'os'
import path from 'path'
import rimraf from 'rimraf'
import tap from 'tap'

tap.test('DOCX to PDF', test => {
  fs.mkdtemp(path.join(os.tmpdir(), constants.website.toLowerCase() + '-'), (error, tmp) => {
    test.ifError(error, 'no mkdtemp error')
    const fixture = path.join('test', 'test.docx')
    const docx = path.join(tmp, 'test.docx')
    const pdf = path.join(tmp, 'test.pdf')
    fs.copyFile(fixture, docx, error => {
      test.ifError(error, 'no copy error')
      docxToPDF(docx, error => {
        test.ifError(error, 'no convert error')
        fs.stat(pdf, (error, stats) => {
          test.ifError(error, 'no stat error')
          finish()
        })
      })
    })
    function finish () {
      rimraf(tmp, () => test.end())
    }
  })
})
