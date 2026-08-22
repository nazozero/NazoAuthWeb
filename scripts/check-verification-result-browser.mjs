import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distributionRoot = join(repositoryRoot, 'dist');
const receiptPath = '/openid4vp/verification-receipts';
const capabilityFor = (prefix) => `${prefix}${'A'.repeat(42)}`;
const capabilities = Object.fromEntries(
  [
    'success',
    'rotation',
    'trailing',
    'notFound',
    'unavailable',
    'schema',
    'media',
    'expiry',
    'delayed',
    'superseding',
    'abandoned',
    'rejected',
  ].map((name, index) => [name, capabilityFor(String.fromCharCode(65 + index))])
);

function canonicalInstant(offsetMilliseconds) {
  const instant = Math.floor((Date.now() + offsetMilliseconds) / 1000) * 1000;
  return new Date(instant).toISOString().replace('.000Z', 'Z');
}

function receiptPayload(expiresInMilliseconds = 60_000) {
  return {
    schema: 1,
    issuer: 'https://issuer.example',
    deployment_id: 'browser-test-deployment',
    runtime_instance_id: 'browser-test-runtime',
    instance_key_id: 'browser-test-key',
    tenant_id: '019c8ca2-30a6-7000-8000-000000000005',
    transaction_id: '019ad2b4-4c9f-7d8e-8abc-1234567890ab',
    receipt_id: '019ad2b4-4c9f-7d8e-8abc-1234567890ac',
    issuance_request_jti: '019c8ca2-30a6-7000-8000-000000000006',
    status: 'verified',
    evidence_context: {
      run_jti: 'browser-test-run',
      artifact_sha256: 'a'.repeat(64),
      matrix_sha256: 'b'.repeat(64),
      suite_plan_id: 'suite-plan-01',
      suite_module_id: 'module-item-001',
      test_name: 'openid4vp-browser-contract',
      variant_sha256: 'c'.repeat(64),
    },
    presentation_binding: {
      presentation_request_sha256: 'e'.repeat(64),
      trust_policy: {
        binding_id: null,
        resource_id: null,
        resource_digest: null,
      },
    },
    intent_sha256: 'f'.repeat(64),
    completed_at: canonicalInstant(-10_000),
    expires_at: canonicalInstant(expiresInMilliseconds),
    receipt_sha256: 'd'.repeat(64),
  };
}

function mimeType(pathname) {
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
  }[extname(pathname)] ?? 'application/octet-stream';
}

async function startFixtureServer() {
  const receiptRequests = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === receiptPath) {
      const authorization = request.headers.authorization ?? '';
      receiptRequests.push({ authorization, method: request.method, pathname: url.pathname });
      const capability = authorization.startsWith('Receipt ')
        ? authorization.slice('Receipt '.length)
        : '';

      if (capability === capabilities.notFound) {
        response.writeHead(404, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        });
        response.end(JSON.stringify({ message: 'Unavailable' }));
        return;
      }
      if (capability === capabilities.unavailable) {
        response.writeHead(503, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        });
        response.end(JSON.stringify({ message: 'Unavailable' }));
        return;
      }

      const payload = receiptPayload(
        capability === capabilities.expiry ? 1_500 : 60_000
      );
      if (capability === capabilities.rotation) {
        payload.evidence_context.test_name = 'openid4vp-browser-contract-rotated';
        payload.receipt_sha256 = 'e'.repeat(64);
      }
      if (capability === capabilities.superseding) {
        payload.evidence_context.test_name = 'openid4vp-browser-contract-superseding';
        payload.receipt_sha256 = 'f'.repeat(64);
      }
      if (capability === capabilities.schema) {
        payload.schema = 2;
      }
      const contentType =
        capability === capabilities.media
          ? 'application/json-patch+json'
          : 'application/json; charset=utf-8';
      const send = () => {
        if (response.destroyed) return;
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': contentType,
          'Referrer-Policy': 'no-referrer',
        });
        response.end(JSON.stringify(payload));
      };
      if (
        capability === capabilities.delayed ||
        capability === capabilities.abandoned
      ) {
        const timer = setTimeout(send, 1_500);
        request.once('close', () => clearTimeout(timer));
      } else {
        send();
      }
      return;
    }

    let relativePath = url.pathname.startsWith('/ui/')
      ? url.pathname.slice('/ui/'.length)
      : '';
    if (!relativePath || !relativePath.includes('.')) {
      relativePath = 'index.html';
    }
    const safePath = normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(distributionRoot, safePath);
    try {
      if (!(await stat(filePath)).isFile()) throw new Error('not a file');
      const body = await readFile(filePath);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': mimeType(filePath),
      });
      response.end(body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    receiptRequests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const chrome = candidates.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error('Chrome not found; set CHROME_PATH to run the browser contract test');
  }
  return chrome;
}

async function startChrome(profilePath) {
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-features=Translate',
      '--disable-gpu',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profilePath}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }
  );
  const browserSocket = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chrome DevTools startup timed out')), 15_000);
    let stderr = '';
    chrome.once('error', reject);
    chrome.stderr.setEncoding('utf8');
    chrome.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(stderr);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    });
  });
  return { chrome, browserSocket };
}

class CdpClient {
  constructor(socketUrl) {
    this.socket = new WebSocket(socketUrl);
    this.pending = new Map();
    this.listeners = new Map();
    this.nextId = 1;
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'browser evaluation failed');
  }
  return result.result?.value;
}

async function waitFor(cdp, sessionId, expression, timeoutMilliseconds = 8_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, sessionId, expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`);
}

async function run() {
  assert.ok(existsSync(join(distributionRoot, 'index.html')), 'run npm run build first');
  const fixture = await startFixtureServer();
  const profilePath = await mkdtemp(join(tmpdir(), 'nazoauth-verification-browser-'));
  let chrome;
  let cdp;
  try {
    const startedChrome = await startChrome(profilePath);
    chrome = startedChrome.chrome;
    cdp = new CdpClient(startedChrome.browserSocket);
    await cdp.connect();
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);

    const networkRequests = [];
    let navigationSequence = 0;
    cdp.on('Network.requestWillBeSent', (message) => {
      if (message.sessionId === sessionId) networkRequests.push(message.params.request.url);
    });

    await cdp.send(
      'Page.navigate',
      { url: `${fixture.origin}/ui/verification-result` },
      sessionId
    );
    await waitFor(
      cdp,
      sessionId,
      `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'not-found'`
    );
    const initialDocument = await evaluate(
      cdp,
      sessionId,
      `(() => {
        window.__vpDocumentSentinel = 'canonical-document';
        return { sentinel: window.__vpDocumentSentinel, timeOrigin: performance.timeOrigin };
      })()`
    );

    async function navigateSameDocument(capability, expectedTestName, expectedReceiptSha256) {
      const receiptCount = fixture.receiptRequests.length;
      const navigation = await cdp.send(
        'Page.navigate',
        { url: `${fixture.origin}/ui/verification-result#receipt=${capability}` },
        sessionId
      );
      assert.equal(
        navigation.loaderId,
        undefined,
        'the regression navigation must remain in the existing document'
      );
      await waitFor(
        cdp,
        sessionId,
        `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'verified'`
      );
      assert.deepEqual(
        await evaluate(
          cdp,
          sessionId,
          `({
            sentinel: window.__vpDocumentSentinel,
            timeOrigin: performance.timeOrigin,
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            testName: document.querySelector('[data-testid="vp-test-name"]')?.textContent.trim(),
            receiptSha256: document.querySelector('[data-testid="vp-receipt-sha256"]')?.textContent.trim(),
          })`
        ),
        {
          ...initialDocument,
          pathname: '/ui/verification-result',
          search: '',
          hash: '',
          testName: expectedTestName,
          receiptSha256: expectedReceiptSha256,
        }
      );
      assert.equal(fixture.receiptRequests.length, receiptCount + 1);
      assert.deepEqual(fixture.receiptRequests.at(-1), {
        authorization: `Receipt ${capability}`,
        method: 'GET',
        pathname: receiptPath,
      });
    }

    await navigateSameDocument(
      capabilities.success,
      'openid4vp-browser-contract',
      'd'.repeat(64)
    );
    await navigateSameDocument(
      capabilities.rotation,
      'openid4vp-browser-contract-rotated',
      'e'.repeat(64)
    );
    assert.equal(
      await evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-testid="vp-verification-status"]')?.textContent.trim()`
      ),
      'Verification successful'
    );
    for (const testId of [
      'vp-test-name',
      'vp-run-jti',
      'vp-suite-plan-id',
      'vp-suite-module-id',
      'vp-artifact-sha256',
      'vp-matrix-sha256',
      'vp-variant-sha256',
      'vp-receipt-sha256',
    ]) {
      assert.ok(
        await evaluate(
          cdp,
          sessionId,
          `(() => {
            const element = document.querySelector('[data-testid="${testId}"]');
            if (!element?.textContent.trim()) return false;
            const style = getComputedStyle(element);
            const bounds = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
          })()`
        ),
        `${testId} must be visible`
      );
    }
    assert.equal(
      fixture.receiptRequests.filter(
        (request) => request.authorization === `Receipt ${capabilities.success}`
      ).length,
      1,
      'the terminal capability must not be reused after rotation'
    );
    assert.equal(
      fixture.receiptRequests.filter(
        (request) => request.authorization === `Receipt ${capabilities.rotation}`
      ).length,
      1,
      'the replacement capability must be requested exactly once'
    );

    const invalidCount = fixture.receiptRequests.length;
    const invalidNavigation = await cdp.send(
      'Page.navigate',
      { url: `${fixture.origin}/ui/verification-result#receipt=invalid` },
      sessionId
    );
    assert.equal(invalidNavigation.loaderId, undefined);
    await waitFor(
      cdp,
      sessionId,
      `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'not-found' && location.hash === ''`
    );
    assert.equal(fixture.receiptRequests.length, invalidCount);
    assert.deepEqual(
      await evaluate(
        cdp,
        sessionId,
        `({ sentinel: window.__vpDocumentSentinel, timeOrigin: performance.timeOrigin })`
      ),
      initialDocument
    );

    await cdp.send(
      'Page.navigate',
      {
        url: `${fixture.origin}/ui/verification-result?untrusted=value#receipt=invalid`,
      },
      sessionId
    );
    await waitFor(
      cdp,
      sessionId,
      `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'not-found' && location.search === '' && location.hash === ''`
    );
    assert.equal(fixture.receiptRequests.length, invalidCount);

    async function navigate(pathname, capability, expectedState, timeout = 8_000) {
      const receiptCount = fixture.receiptRequests.length;
      navigationSequence += 1;
      await cdp.send(
        'Page.navigate',
        {
          url: `${fixture.origin}${pathname}?browser_case=${navigationSequence}#receipt=${capability}`,
        },
        sessionId
      );
      await waitFor(
        cdp,
        sessionId,
        `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === ${JSON.stringify(expectedState)}`,
        timeout
      );
      const location = await evaluate(
        cdp,
        sessionId,
        `({ pathname: location.pathname, search: location.search, hash: location.hash })`
      );
      assert.deepEqual(location, {
        pathname: '/ui/verification-result',
        search: '',
        hash: '',
      });
      assert.equal(fixture.receiptRequests.length, receiptCount + 1);
      assert.deepEqual(fixture.receiptRequests.at(-1), {
        authorization: `Receipt ${capability}`,
        method: 'GET',
        pathname: receiptPath,
      });
    }

    await navigate('/ui/verification-result/', capabilities.trailing, 'verified');
    await navigate('/ui/verification-result', capabilities.notFound, 'not-found');
    await navigate('/ui/verification-result', capabilities.unavailable, 'generic-error');
    await navigate('/ui/verification-result', capabilities.schema, 'generic-error');
    await navigate('/ui/verification-result', capabilities.media, 'generic-error');
    await navigate('/ui/verification-result', capabilities.expiry, 'expired', 8_000);

    const delayedCount = fixture.receiptRequests.length;
    navigationSequence += 1;
    await cdp.send(
      'Page.navigate',
      {
        url: `${fixture.origin}/ui/verification-result?browser_case=${navigationSequence}#receipt=${capabilities.delayed}`,
      },
      sessionId
    );
    await waitFor(
      cdp,
      sessionId,
      `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'loading'`
    );
    const delayedRequestDeadline = Date.now() + 5_000;
    while (
      fixture.receiptRequests.length === delayedCount &&
      Date.now() < delayedRequestDeadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(fixture.receiptRequests.length, delayedCount + 1);
    const supersedingNavigation = await cdp.send(
      'Page.navigate',
      {
        url: `${fixture.origin}/ui/verification-result#receipt=${capabilities.superseding}`,
      },
      sessionId
    );
    assert.equal(supersedingNavigation.loaderId, undefined);
    await waitFor(
      cdp,
      sessionId,
      `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'verified' && document.querySelector('[data-testid="vp-test-name"]')?.textContent.trim() === 'openid4vp-browser-contract-superseding'`
    );
    assert.equal(fixture.receiptRequests.length, delayedCount + 2);
    await new Promise((resolve) => setTimeout(resolve, 1_700));
    assert.equal(
      await evaluate(
        cdp,
        sessionId,
        `document.querySelector('[data-testid="vp-test-name"]')?.textContent.trim()`
      ),
      'openid4vp-browser-contract-superseding',
      'an aborted older request must not replace the newer terminal projection'
    );

    const abandonedCount = fixture.receiptRequests.length;
    navigationSequence += 1;
    await cdp.send(
      'Page.navigate',
      {
        url: `${fixture.origin}/ui/verification-result?browser_case=${navigationSequence}#receipt=${capabilities.abandoned}`,
      },
      sessionId
    );
    await waitFor(
      cdp,
      sessionId,
      `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'loading'`
    );
    const abandonedRequestDeadline = Date.now() + 5_000;
    while (
      fixture.receiptRequests.length === abandonedCount &&
      Date.now() < abandonedRequestDeadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(fixture.receiptRequests.length, abandonedCount + 1);
    await evaluate(
      cdp,
      sessionId,
      `history.pushState({}, '', '/ui/'); window.dispatchEvent(new PopStateEvent('popstate'));`
    );
    await waitFor(
      cdp,
      sessionId,
      `!document.querySelector('[data-testid="vp-verification-result"]')`
    );
    await evaluate(
      cdp,
      sessionId,
      `history.pushState({}, '', '/ui/verification-result'); window.dispatchEvent(new PopStateEvent('popstate'));`
    );
    await waitFor(
      cdp,
      sessionId,
      `document.querySelector('[data-testid="vp-verification-result"]')?.dataset.state === 'not-found'`
    );
    assert.equal(fixture.receiptRequests.length, abandonedCount + 1);

    const rejectedCount = fixture.receiptRequests.length;
    navigationSequence += 1;
    await cdp.send(
      'Page.navigate',
      {
        url: `${fixture.origin}/ui/verification-result//?browser_case=${navigationSequence}#receipt=${capabilities.rejected}`,
      },
      sessionId
    );
    await waitFor(cdp, sessionId, `location.hash === ''`);
    assert.equal(fixture.receiptRequests.length, rejectedCount);

    const navigationHistory = await cdp.send(
      'Page.getNavigationHistory',
      {},
      sessionId
    );
    assert.ok(
      navigationHistory.entries.every(
        (entry) => !entry.url.includes('#receipt=') && !entry.url.includes('browser_case=')
      ),
      'capability fragments and bootstrap queries must not remain in browser history'
    );

    const thirdPartyRequests = networkRequests.filter((url) => {
      try {
        const requestUrl = new URL(url);
        return requestUrl.protocol.startsWith('http') && requestUrl.origin !== fixture.origin;
      } catch {
        return false;
      }
    });
    assert.deepEqual(thirdPartyRequests, []);
    const authSessionRequests = networkRequests.filter((url) => {
      try {
        const requestUrl = new URL(url);
        return (
          requestUrl.origin === fixture.origin &&
          requestUrl.pathname === '/auth/me'
        );
      } catch {
        return false;
      }
    });
    assert.deepEqual(
      authSessionRequests,
      [],
      'the isolated verification result route must not bootstrap an auth session'
    );
    console.log('verification result browser contract passed');
  } finally {
    cdp?.close();
    if (chrome) {
      const exited =
        chrome.exitCode === null
          ? Promise.race([
              once(chrome, 'exit'),
              new Promise((resolve) => setTimeout(resolve, 5_000)),
            ])
          : Promise.resolve();
      chrome.kill();
      await exited;
    }
    await fixture.close();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(profilePath, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }
}

await run();
