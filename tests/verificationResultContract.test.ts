import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(
  new URL('../src/pages/VerificationResult.tsx', import.meta.url),
  'utf8'
);
const apiSource = readFileSync(
  new URL('../src/lib/verificationReceipt.ts', import.meta.url),
  'utf8'
);
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('keeps the result route isolated from session bootstrap and navigation chrome', () => {
  assert.match(
    appSource,
    /canonicalVerificationResultPath\(location\.pathname, '\/'\)/
  );
  assert.match(
    appSource,
    /if \(canonicalVerificationResultPath\(location\.pathname, '\/'\)\)[\s\S]*?return <VerificationResult \/>/
  );
  assert.ok(
    appSource.indexOf('return <VerificationResult />') <
      appSource.indexOf('<AuthProvider>')
  );
});

test('exposes stable non-secret screenshot evidence selectors', () => {
  for (const testId of [
    'vp-verification-result',
    'vp-verification-status',
  ]) {
    assert.match(pageSource, new RegExp(`data-testid="${testId}"`));
  }
  for (const testId of [
    'vp-test-name',
    'vp-suite-plan-id',
    'vp-suite-module-id',
    'vp-variant-sha256',
    'vp-receipt-sha256',
  ]) {
    assert.match(pageSource, new RegExp(`testId="${testId}"`));
  }
  assert.match(pageSource, />\s*Verification successful\s*</);
  assert.doesNotMatch(pageSource, /receipt_jws|nonce|credential_content/);
  assert.doesNotMatch(pageSource, /[>{]capability[}<]/);
  assert.doesNotMatch(pageSource, /state\.receipt\.receiptId/);
});

test('does not persist, log, or place the capability in a URL or referrer', () => {
  assert.match(indexHtml, /<meta name="referrer" content="no-referrer"/);
  assert.match(indexHtml, /if \(path === resultPath\) return;/);
  assert.doesNotMatch(
    indexHtml,
    /<link[^>]+href="https:\/\/fonts\.(?:googleapis|gstatic)\.com/
  );
  assert.doesNotMatch(apiSource, /console\.|localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(apiSource, /verification-receipts\//);
  assert.match(apiSource, /Authorization: `Receipt \$\{capability\}`/);
  assert.match(apiSource, /referrerPolicy: 'no-referrer'/);
  assert.match(apiSource, /cache: 'no-store'/);
});
