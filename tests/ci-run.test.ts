import assert from 'node:assert/strict'
import test from 'node:test'
import { selectArtifact, selectCiRun } from '../scripts/resolve-ci-run.mjs'

const sha = 'a'.repeat(40)
const repository = 'nazozero/NazoAuthWeb'
const success = { id: 1, head_sha: sha, head_branch: 'main', head_repository: { full_name: repository }, event: 'push', status: 'completed', conclusion: 'success' }

test('release reuses only completed CI for its exact trusted source', () => {
  assert.equal(selectCiRun([success], sha, repository), 1)
  assert.equal(selectCiRun([{ ...success, event: 'workflow_dispatch' }], sha, repository), 1)
  for (const change of [
    { head_sha: 'b'.repeat(40) }, { head_branch: 'feature' },
    { head_repository: { full_name: 'someone/fork' } }, { event: 'pull_request' },
    { status: 'in_progress' }, { conclusion: 'failure' }, { conclusion: 'cancelled' },
  ]) assert.throws(() => selectCiRun([{ ...success, ...change }], sha, repository))
  assert.throws(() => selectCiRun([], sha, repository))
  assert.throws(() => selectCiRun([success], 'short', repository))
})

test('an older success cannot conceal a newer failed or running CI attempt', () => {
  for (const change of [{ conclusion: 'failure' }, { status: 'in_progress' }]) {
    assert.throws(() => selectCiRun([success, { ...success, id: 2, ...change }], sha, repository))
  }
})

test('release pins an existing immutable artifact ID and rejects expired or ambiguous artifacts', () => {
  const artifact = { id: 42, name: `nazoauth-web-${sha}`, expired: false }
  assert.equal(selectArtifact([artifact], artifact.name), 42)
  for (const artifacts of [[], [{ ...artifact, expired: true }], [{ ...artifact, id: 0 }], [artifact, artifact]]) {
    assert.throws(() => selectArtifact(artifacts, artifact.name))
  }
  assert.throws(() => selectArtifact([artifact], 'another-commit'))
})
