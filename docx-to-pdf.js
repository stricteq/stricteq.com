import path from 'path'
import { spawn } from 'child_process'

export default function (source, callback) {
  const basename = path.basename(source, '.docx')
  const target = path.join(path.dirname(source), basename + '.pdf')
  spawn('pandoc', ['-o', target, source])
    .once('close', callback)
    .once('error', callback)
}
