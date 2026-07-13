import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = join(root, 'src')
const storagePolicies = new Map([
  [
    'auth/sessionHint.ts',
    {
      declaration: "const SESSION_HINT_KEY = 'nazo_oauth_session_hint';",
      calls: new Set([
        'getItem(SESSION_HINT_KEY)',
        "setItem(SESSION_HINT_KEY,'1')",
        'removeItem(SESSION_HINT_KEY)',
      ]),
    },
  ],
  [
    'i18n/I18nProvider.tsx',
    {
      declaration: "const STORAGE_KEY = 'nazoauth.locale';",
      calls: new Set(['getItem(STORAGE_KEY)', 'setItem(STORAGE_KEY,nextLocale)']),
    },
  ],
])
const otherPersistencePattern = /\b(sessionStorage|indexedDB|caches\.open|navigator\.serviceWorker)\b/
const localStoragePattern = /\b(?:window\.)?localStorage\b/g
const localStorageCallPattern = /window\.localStorage\.(getItem|setItem|removeItem)\s*\(([^)]*)\)/g
const privatePemPattern = /-----BEGIN (?:(?:RSA|EC|OPENSSH|DSA) |ENCRYPTED )?PRIVATE KEY-----/i
const jwtPattern = /\beyJ[A-Za-z0-9_-]{7,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~-]{24,}\b/i
const credentialAssignmentPattern = /["']?(?:access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|code[_-]?verifier|client[_-]?assertion)["']?\s*[:=]\s*["'][A-Za-z0-9._~-]{16,}["']/i
const oidfPrivatePattern = /oidf[_-](?:private|client)[_-](?:key|secret)/i
const oidfCredentialAssignmentPattern = /\b(?:oidf(?:Runner|Client)?(?:Token|Secret|Key)|OIDF_[A-Z0-9_]*(?:TOKEN|SECRET|PRIVATE_KEY))\s*[:=]\s*["'][^"'\s]{8,}["']/i
const nazoCredentialMarkerPattern = /\bnazo_(?:test|fixture|prod)_(?:token|secret|private_key)_[A-Za-z0-9._~-]{16,}\b/i
const privateJwkPattern = /[{[][^{}\[\]]{0,512}["']kty["']\s*:\s*["'](?:RSA|EC|OKP)["'][^{}\[\]]{0,512}["']d["']\s*:\s*["'][A-Za-z0-9_-]{16,}["'][^{}\[\]]{0,512}[}\]]|[{[][^{}\[\]]{0,512}["']d["']\s*:\s*["'][A-Za-z0-9_-]{16,}["'][^{}\[\]]{0,512}["']kty["']\s*:\s*["'](?:RSA|EC|OKP)["'][^{}\[\]]{0,512}[}\]]/i
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx'])

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? filesBelow(path) : [path]
    }),
  )
  return nested.flat()
}

export function artifactFindings(text) {
  const findings = []
  if (privatePemPattern.test(text)) findings.push('private key PEM')
  if (jwtPattern.test(text)) findings.push('JWT-shaped credential')
  if (bearerPattern.test(text)) findings.push('bearer credential')
  if (credentialAssignmentPattern.test(text)) findings.push('OAuth credential assignment')
  if (oidfPrivatePattern.test(text)) findings.push('private OIDF credential')
  if (oidfCredentialAssignmentPattern.test(text)) findings.push('OIDF credential assignment')
  if (nazoCredentialMarkerPattern.test(text)) findings.push('Nazo credential marker')
  if (privateJwkPattern.test(text)) findings.push('private JWK')
  return findings
}

export function sourceFindings(name, text) {
  const findings = artifactFindings(text).map((finding) => `${name}: ${finding} in source`)
  if (otherPersistencePattern.test(text)) {
    findings.push(`${name}: unapproved durable browser storage`)
  }

  const mentions = [...text.matchAll(localStoragePattern)].length
  if (mentions === 0) return findings

  const policy = storagePolicies.get(name)
  if (!policy || !text.includes(policy.declaration)) {
    findings.push(`${name}: unapproved durable browser storage`)
    return findings
  }

  const calls = [...text.matchAll(localStorageCallPattern)]
  if (calls.length !== mentions) {
    findings.push(`${name}: unrecognized localStorage access`)
  }
  for (const [, method, argumentsText] of calls) {
    const normalized = `${method}(${argumentsText.replace(/\s+/g, '')})`
    if (!policy.calls.has(normalized)) {
      findings.push(`${name}: unapproved storage call ${normalized}`)
    }
  }
  return findings
}

async function checkSource() {
  const failures = []
  for (const path of await filesBelow(sourceRoot)) {
    if (!sourceExtensions.has(extname(path))) {
      continue
    }
    const name = relative(sourceRoot, path).replaceAll('\\', '/')
    const text = await readFile(path, 'utf8')
    failures.push(...sourceFindings(name, text))
  }
  return failures
}

async function checkDist() {
  const distRoot = join(root, 'dist')
  const failures = []
  for (const path of await filesBelow(distRoot)) {
    const text = await readFile(path, 'utf8').catch(() => '')
    for (const finding of artifactFindings(text)) {
      failures.push(`${relative(distRoot, path)}: ${finding} in build output`)
    }
  }
  return failures
}

async function main() {
  const mode = process.argv[2]
  const failures =
    mode === 'source'
      ? await checkSource()
      : mode === 'dist'
        ? await checkDist()
        : [`unknown mode: ${mode ?? '<missing>'}`]

  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exitCode = 1
    return
  }

  console.log(`browser security ${mode} check passed`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
