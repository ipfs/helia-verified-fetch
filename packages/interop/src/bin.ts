#! /usr/bin/env node

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// aegir should be run from `node_modules/@helia/interop`
const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '../../')

const test = spawn('npx', ['aegir', 'test'], {
  cwd
})

test.stdout.on('data', (data) => {
  process.stdout.write(data)
})

test.stderr.on('data', (data) => {
  process.stderr.write(data)
})

test.on('close', (code) => {
  process.exit(code ?? 0)
})
