import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inlineScript = indexHtml.match(
  /<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)\s*<\/script>/
)?.[1];
const consentFallbackMarkup = indexHtml.match(
  /<div id="consent-fallback"[\s\S]*?<script>/
)?.[0];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createElement(initial: Record<string, unknown> = {}) {
  return {
    disabled: false,
    hidden: false,
    removed: false,
    style: { display: '' },
    textContent: '',
    value: '',
    remove() {
      this.removed = true;
    },
    ...initial,
  };
}

function runConsentFallback(
  responsePromise: Promise<{ ok: boolean; json(): Promise<unknown> }>
) {
  assert.ok(inlineScript, 'the classic fallback script must remain in the build entry');

  const form = createElement({ hidden: true, style: { display: 'none' } });
  const elements = {
    'auth-fallback': createElement(),
    'consent-fallback': createElement({ querySelector: () => form }),
    'consent-fallback-status': createElement({
      textContent: 'Loading authorization request...',
    }),
    'consent-fallback-request-id': createElement(),
    'consent-fallback-csrf-token': createElement(),
    'nazo-consent-deny': createElement({ disabled: true }),
    'nazo-consent-approve': createElement({ disabled: true }),
  };
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const document = {
    documentElement: { className: '' },
    getElementById(id: keyof typeof elements) {
      return elements[id] ?? null;
    },
  };

  vm.runInNewContext(inlineScript.replaceAll('%BASE_URL%', '/ui/'), {
    URL,
    URLSearchParams,
    document,
    encodeURIComponent,
    fetch(url: string, init: RequestInit) {
      requests.push({ url, init });
      return responsePromise;
    },
    window: {
      location: {
        origin: 'https://issuer.example',
        pathname: '/ui/consent',
        search: '?request_id=req-123',
      },
    },
  });

  return { elements, form, requests };
}

test('build entry keeps consent actions unavailable until authoritative view data arrives', async () => {
  assert.ok(consentFallbackMarkup);
  assert.match(
    consentFallbackMarkup,
    /<form[\s\S]*?\shidden[\s\S]*?style="display: none"/
  );
  assert.match(
    consentFallbackMarkup,
    /<button id="nazo-consent-deny"[^>]*\sdisabled>/
  );
  assert.match(
    consentFallbackMarkup,
    /<button id="nazo-consent-approve"[^>]*\sdisabled>/
  );
  assert.ok(
    indexHtml.indexOf('<script>') < indexHtml.indexOf('<script type="module"'),
    'the fail-closed fallback must execute before the React module entry'
  );

  const response = deferred<{ ok: boolean; json(): Promise<unknown> }>();
  const fallback = runConsentFallback(response.promise);

  assert.equal(fallback.requests.length, 1);
  assert.equal(fallback.requests[0]?.url, '/authorize/consent?request_id=req-123');
  assert.equal(fallback.requests[0]?.init.method, 'GET');
  assert.equal(fallback.requests[0]?.init.credentials, 'include');
  assert.equal(
    (fallback.requests[0]?.init.headers as Record<string, string>).Accept,
    'application/json'
  );
  assert.equal(fallback.form.hidden, true);
  assert.equal(fallback.form.style.display, 'none');
  assert.equal(fallback.elements['nazo-consent-deny'].disabled, true);
  assert.equal(fallback.elements['nazo-consent-approve'].disabled, true);

  response.resolve({
    ok: true,
    async json() {
      return { request_id: 'req-123', csrf_token: 'response-csrf-token' };
    },
  });
  await response.promise;
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fallback.elements['consent-fallback-request-id'].value, 'req-123');
  assert.equal(
    fallback.elements['consent-fallback-csrf-token'].value,
    'response-csrf-token'
  );
  assert.equal(fallback.elements['nazo-consent-deny'].disabled, false);
  assert.equal(fallback.elements['nazo-consent-approve'].disabled, false);
  assert.equal(fallback.form.hidden, false);
  assert.equal(fallback.form.style.display, '');
});

test('static consent fallback fails closed on an unusable consent response', async () => {
  const fallback = runConsentFallback(
    Promise.resolve({
      ok: true,
      async json() {
        return { request_id: 'req-123', csrf_token: '' };
      },
    })
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fallback.form.hidden, true);
  assert.equal(fallback.elements['nazo-consent-deny'].disabled, true);
  assert.equal(fallback.elements['nazo-consent-approve'].disabled, true);
  assert.match(
    String(fallback.elements['consent-fallback-status'].textContent),
    /Could not load/
  );
});

test('fallback and API defaults do not regress to the legacy CSRF cookie contract', () => {
  const apiSource = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(indexHtml, /readCookie|nazo_oauth_csrf/);
  assert.match(apiSource, /'__Host-nazo_oauth_csrf'/);
  assert.doesNotMatch(apiSource, /\|\| 'nazo_oauth_csrf'/);
});
