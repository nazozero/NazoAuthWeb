import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch expected status contracts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts an asynchronous mutation only when the server returns 202', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(202, { revision: 8 })));

    await expect(
      apiFetch('/admin/runtime-modules/ciba', {
        method: 'PATCH',
        csrf: 'defer',
        expectedStatus: 202,
      })
    ).resolves.toEqual({ revision: 8 });
  });

  it('rejects a successful but non-202 response instead of displaying it as pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { revision: 8 })));

    await expect(
      apiFetch('/admin/runtime-modules/ciba', {
        method: 'PATCH',
        csrf: 'defer',
        expectedStatus: 202,
      })
    ).rejects.toMatchObject({ status: 200 });
  });
});
