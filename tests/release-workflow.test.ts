import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync('.github/workflows/release.yml', 'utf8')

test('release publishes one attested UI archive from an immutable tag', () => {
  assert.match(workflow, /push:\s*\n\s*tags:\s*\n\s*- "v\*"/)
  assert.match(workflow, /uses: actions\/attest@[0-9a-f]{40}/)
  assert.match(workflow, /subject-path: nazoauth-web\.tar\.gz/)
  const upload = workflow.match(
    /gh release upload[\s\S]*?nazoauth-web\.tar\.gz/,
  )?.[0]
  assert.ok(upload)
  for (const forbidden of ['.bundle', '.json', 'install.sh', 'dist/']) {
    assert.equal(upload.includes(forbidden), false, forbidden)
  }
})

test('release archive is deterministic, bounded, and contains no symlinks', () => {
  assert.match(workflow, /find dist -type l/)
  assert.match(workflow, /--sort=name/)
  assert.match(workflow, /--mtime='UTC 1970-01-01'/)
  assert.match(workflow, /gzip -n/)
  assert.match(workflow, /67108864/)
})
