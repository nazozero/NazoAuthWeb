import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export function selectCiRun(runs, sha, repository) {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Expected a full commit SHA')
  const matching = runs.filter((run) =>
    run.head_sha === sha && run.head_branch === 'main' &&
    run.head_repository?.full_name === repository &&
    ['push', 'workflow_dispatch'].includes(run.event),
  ).sort((a, b) => b.id - a.id)
  const latest = matching[0]
  if (!latest || latest.status !== 'completed' || latest.conclusion !== 'success') {
    throw new Error(`Frontend CI must finish successfully on main for ${sha}`)
  }
  return latest.id
}

export function selectArtifact(artifacts, name) {
  const matching = artifacts.filter((artifact) => artifact.name === name && artifact.expired === false)
  if (matching.length !== 1 || !Number.isSafeInteger(matching[0].id) || matching[0].id <= 0) {
    throw new Error(`Missing unexpired CI artifact ${name}; run Frontend CI again for this commit`)
  }
  return matching[0].id
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { GITHUB_REPOSITORY: repository, GITHUB_SHA: sha } = process.env
  if (!repository || !sha) throw new Error('Missing GitHub release identity')
  const response = JSON.parse(execFileSync('gh', [
    'api', '--method', 'GET',
    `/repos/${repository}/actions/workflows/frontend.yml/runs`,
    '-f', `head_sha=${sha}`, '-F', 'per_page=100',
  ], { encoding: 'utf8' }))
  const runId = selectCiRun(response.workflow_runs, sha, repository)
  const artifacts = JSON.parse(execFileSync('gh', [
    'api', `/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
  ], { encoding: 'utf8' }))
  console.log(`run_id=${runId}`)
  console.log(`artifact_id=${selectArtifact(artifacts.artifacts, `nazoauth-web-${sha}`)}`)
}
