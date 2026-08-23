import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveConfig } from 'vite'

test('production build defaults to the deployed /ui/ base path', async () => {
  const previous = process.env.VITE_BASE_PATH
  delete process.env.VITE_BASE_PATH

  try {
    const config = await resolveConfig({}, 'build', 'production')
    assert.equal(config.base, '/ui/')
  } finally {
    if (previous === undefined) {
      delete process.env.VITE_BASE_PATH
    } else {
      process.env.VITE_BASE_PATH = previous
    }
  }
})
