import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = join(root, 'dist')
const index = await readFile(join(distRoot, 'index.html'), 'utf8')
const assetUrls = [...index.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith('data:'))
const localAssetUrls = assetUrls.filter(
  (url) => !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//'),
)

assert.ok(localAssetUrls.length > 0, 'production index.html must reference built assets')
for (const url of localAssetUrls) {
  assert.match(url, /^\/ui\//, `production asset must use the /ui/ base path: ${url}`)
  const relativePath = url.slice('/ui/'.length).split(/[?#]/, 1)[0]
  assert.ok(relativePath, `production asset URL must include a file path: ${url}`)
  await access(join(distRoot, relativePath))
}

console.log(`production build base-path check passed (${localAssetUrls.length} local assets)`)
