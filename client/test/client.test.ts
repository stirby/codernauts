import { describe, expect, it, vi } from 'vitest';
import { CodernautsClient } from '../src/client.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('CodernautsClient', () => {
  it('trims the base URL and sends bearer auth', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true }));
    const client = new CodernautsClient({ apiUrl: 'http://localhost:8080/', token: 'dev-token', fetch: fetcher as typeof fetch });

    await client.health();

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:8080/v1/health',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer dev-token' }),
      }),
    );
  });

  it('sends JSON bodies and idempotency keys', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ id: 'act_1' }));
    const client = new CodernautsClient({ apiUrl: 'http://localhost:8080', token: 'dev-token', fetch: fetcher as typeof fetch });

    await client.assignMiner('miner/1', 'site_1');
    await client.scan('north', 'scan-key');

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8080/v1/miners/miner%2F1/assign',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ siteId: 'site_1' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/v1/actions/scan',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ direction: 'north' }),
        headers: expect.objectContaining({ 'Idempotency-Key': 'scan-key' }),
      }),
    );
  });
});
