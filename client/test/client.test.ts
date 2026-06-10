import { describe, expect, it, vi } from 'vitest';
import { CodernautsClient } from '../src/client.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function makeClient(fetcher: ReturnType<typeof vi.fn>): CodernautsClient {
  return new CodernautsClient({ apiUrl: 'http://localhost:8080', token: 'dev-token', fetch: fetcher as unknown as typeof fetch });
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
    const client = makeClient(fetcher);

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

  it('fetches the leaderboard with auth', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        season: { id: 'season_1760000000', name: 'The Coarse Age', started_at: '2026-06-07T12:00:00Z' },
        entries: [{ rank: 1, player_id: 'ply_dev', codernaut: 'Astronaut Vega-7', gravel: 1234, gravel_per_hour: 456.7, is_you: true }],
      }),
    );
    const client = makeClient(fetcher);

    const leaderboard = await client.leaderboard();

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:8080/v1/leaderboard',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer dev-token' }),
      }),
    );
    expect(leaderboard.entries?.[0]?.codernaut).toBe('Astronaut Vega-7');
  });

  it('fetches conversion rates', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        crusher: { level: 1, name: 'Crusher Mk I', yield_multiplier: 1.0, unlocked_resources: ['ore', 'ice'] },
        rates: [{ resource: 'ore', gravel_per_unit: 1, required_crusher_level: 1, unlocked: true }],
      }),
    );
    const client = makeClient(fetcher);

    const conversions = await client.conversions();

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8080/v1/conversions', expect.objectContaining({ method: 'GET' }));
    expect(conversions.crusher?.name).toBe('Crusher Mk I');
  });

  it('converts with an explicit amount and idempotency key', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ resource: 'ore', amount_converted: 100, gravel_earned: 125 }));
    const client = makeClient(fetcher);

    await client.convert('ore', 100, 'convert-key');

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:8080/v1/conversions/ore',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amount: 100 }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Idempotency-Key': 'convert-key',
        }),
      }),
    );
  });

  it('converts the full balance by omitting the body', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ resource: 'ice', amount_converted: 40 }));
    const client = makeClient(fetcher);

    await client.convert('ice');

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:8080/v1/conversions/ice');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('claims a node without a body and with an idempotency key', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ id: 'node_east_1', claimed_by: 'ply_dev' }));
    const client = makeClient(fetcher);

    const node = await client.claimNode('node_east_1', 'claim-key');

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:8080/v1/nodes/node_east_1/claim');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('claim-key');
    expect(node.claimed_by).toBe('ply_dev');
  });

  it('upgrades the crusher with a bare POST', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ level: 2, name: 'Crusher Mk II', yield_multiplier: 1.25 }));
    const client = makeClient(fetcher);

    const crusher = await client.upgradeCrusher();

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:8080/v1/crusher/upgrade');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(crusher.name).toBe('Crusher Mk II');
  });
});
