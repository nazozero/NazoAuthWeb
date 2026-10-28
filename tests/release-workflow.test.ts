import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
const ci = readFileSync('.github/workflows/frontend.yml', 'utf8')
const pack = readFileSync('scripts/package-release.sh', 'utf8')

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
  assert.match(pack, /find dist -type l/)
  assert.match(pack, /--sort=name/)
  assert.match(pack, /--mtime='UTC 1970-01-01'/)
  assert.match(pack, /gzip -n/)
  assert.match(pack, /67108864/)
  assert.ok(ci.indexOf('npm test') < ci.indexOf('bash scripts/package-release.sh'))
  assert.match(workflow, /node scripts\/resolve-ci-run\.mjs/)
  assert.match(workflow, /artifact-ids: \$\{\{ steps\.ci\.outputs\.artifact_id \}\}/)
  assert.doesNotMatch(workflow, /npm (ci|test|run build)/)
})

test('manual release verification cannot attest or publish', () => {
  assert.match(workflow, /workflow_dispatch:/)
  for (const step of ['Attest UI archive provenance', 'Publish the single UI release artifact']) {
    const body = workflow.split(`- name: ${step}`)[1].split('\n      - name:')[0]
    assert.match(body, /if: github\.ref_type == 'tag'/)
  }
})
