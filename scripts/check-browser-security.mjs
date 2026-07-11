import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = join(root, 'src')
const allowedStorageFiles = new Map([
  ['auth/sessionHint.ts', "const SESSION_HINT_KEY = 'nazo_oauth_session_hint';"],
  ['i18n/I18nProvider.tsx', "const STORAGE_KEY = 'nazoauth.locale';"],
])
const persistencePattern = /\b(localStorage|sessionStorage|indexedDB|caches\.open|navigator\.serviceWorker)\b/
const sensitiveMaterialPattern = /access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|code[_-]?verifier|private[_-]?key|client[_-]?assertion/i
const privateArtifactPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|oidf[_-](?:private|client)[_-](?:key|secret)|client_assertion\s*[:=]/i
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

async function checkSource() {
  const failures = []
  for (const path of await filesBelow(sourceRoot)) {
    if (!sourceExtensions.has(extname(path))) {
      continue
    }
    const name = relative(sourceRoot, path).replaceAll('\\', '/')
    const text = await readFile(path, 'utf8')
    if (privateArtifactPattern.test(text)) {
      failures.push(`${name}: private credential pattern in source`)
    }
    if (!persistencePattern.test(text)) {
      continue
    }
    const requiredDeclaration = allowedStorageFiles.get(name)
    if (!requiredDeclaration || !text.includes(requiredDeclaration)) {
      failures.push(`${name}: unapproved durable browser storage`)
    }
    if (sensitiveMaterialPattern.test(text)) {
      failures.push(`${name}: sensitive OAuth material appears beside durable browser storage`)
    }
  }
  return failures
}

async function checkDist() {
  const distRoot = join(root, 'dist')
  const failures = []
  for (const path of await filesBelow(distRoot)) {
    const text = await readFile(path, 'utf8').catch(() => '')
    if (privateArtifactPattern.test(text)) {
      failures.push(`${relative(distRoot, path)}: private credential pattern in build output`)
    }
  }
  return failures
}

const mode = process.argv[2]
const failures =
  mode === 'source'
    ? await checkSource()
    : mode === 'dist'
      ? await checkDist()
      : [`unknown mode: ${mode ?? '<missing>'}`]

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`browser security ${mode} check passed`)
