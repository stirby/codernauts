import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/web/App.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

const statusBody = {
  player: {
    id: 'ply_dev',
    display_name: 'Astronaut Vega-7',
    created_at: '2026-06-07T11:00:00Z',
    location: { node_id: 'node_home', node_name: 'Vesta-41', x: 0, y: 0 },
  },
  outpost: { id: 'out_vesta_41', name: 'Vesta-41', node_id: 'node_home' },
  resources: {
    ore: 350,
    ice: 40,
    gas: 0,
    crystal: 0,
    rates_per_second: { ore: 1.75, ice: 0.5, gas: 0, crystal: 0 },
    ore_rate_per_second: 1.75,
    energy: 30,
    max_energy: 100,
    energy_capacity: 100,
    energy_used: 30,
    energy_available: 70,
    last_generated_at: '2026-06-07T12:00:00Z',
  },
  gravel: {
    total: 1234,
    per_hour: 456.7,
    season: { id: 'season_1760000000', name: 'The Coarse Age', started_at: '2026-06-07T11:00:00Z' },
  },
  crusher: {
    level: 1,
    name: 'Crusher Mk I',
    yield_multiplier: 1.0,
    unlocked_resources: ['ore', 'ice'],
    next_upgrade: { level: 2, name: 'Crusher Mk II', yield_multiplier: 1.25, unlocks_resource: 'gas', cost: { ore: 300, ice: 100 } },
  },
  sector: {
    id: 'sec_orion',
    name: 'Orion Spur',
    nodes: [
      {
        id: 'node_home',
        name: 'Vesta-41',
        kind: 'planet',
        trait: 'metallic',
        x: 0,
        y: 0,
        distance: 0,
        claimed_by: 'ply_dev',
        sites: [
          {
            id: 'site_home_anchor',
            node_id: 'node_home',
            name: 'Anchor Rock',
            kind: 'deposit',
            resource: 'ore',
            x: 0,
            y: 0,
            richness: 2,
            base_rate_per_second: 1.0,
            assigned_miner_id: 'min_starter',
            depleted: false,
          },
          {
            id: 'site_home_basalt',
            node_id: 'node_home',
            name: 'Basalt Shelf',
            kind: 'deposit',
            resource: 'ore',
            x: 0,
            y: 0,
            richness: 1,
            base_rate_per_second: 0.75,
            depleted: false,
          },
          {
            id: 'site_home_perma',
            node_id: 'node_home',
            name: 'Permafrost Pocket',
            kind: 'deposit',
            resource: 'ice',
            x: 0,
            y: 0,
            richness: 1,
            base_rate_per_second: 0.5,
            depleted: false,
          },
        ],
      },
      {
        id: 'node_east_1',
        name: 'Bleak Slush',
        kind: 'asteroid_field',
        trait: 'frozen',
        x: 1,
        y: 0,
        distance: 1,
        discovered_at: '2026-06-07T12:00:00Z',
        claim_cost: { ore: 150 },
        sites: [
          {
            id: 'site_east_1_a',
            node_id: 'node_east_1',
            name: 'Bleak Slush Pit A',
            kind: 'deposit',
            resource: 'ice',
            x: 1,
            y: 0,
            richness: 2,
            base_rate_per_second: 1.0,
            depleted: false,
          },
        ],
      },
    ],
  },
  miners: [
    {
      id: 'min_starter',
      name: 'Prospector One',
      level: 1,
      status: 'mining',
      resource: 'ore',
      assigned_site_id: 'site_home_anchor',
      rate_per_second: 1,
      ore_rate_per_second: 1,
      energy_requirement: 30,
      build_cost: { ore: 175 },
      next_upgrade_cost: { ore: 150 },
    },
    {
      id: 'min_002',
      name: 'Prospector Two',
      level: 1,
      status: 'idle',
      energy_requirement: 30,
      build_cost: { ore: 175 },
      next_upgrade_cost: { ore: 150 },
    },
  ],
  active_actions: [],
  suggested_next_actions: [{ key: 'claim_node', message: 'Claim Bleak Slush for 150 ore.' }],
};

const leaderboardBody = {
  season: { id: 'season_1760000000', name: 'The Coarse Age', started_at: '2026-06-07T11:00:00Z' },
  entries: [
    { rank: 1, player_id: 'ply_dev', codernaut: 'Astronaut Vega-7', gravel: 1234, gravel_per_hour: 456.7, is_you: true },
    { rank: 2, player_id: 'ply_rival', codernaut: 'Captain Basalt', gravel: 900, gravel_per_hour: 80.2, is_you: false },
  ],
};

const conversionsBody = {
  crusher: statusBody.crusher,
  rates: [
    { resource: 'ore', gravel_per_unit: 1, required_crusher_level: 1, unlocked: true },
    { resource: 'ice', gravel_per_unit: 3, required_crusher_level: 1, unlocked: true },
    { resource: 'gas', gravel_per_unit: 9, required_crusher_level: 2, unlocked: false },
    { resource: 'crystal', gravel_per_unit: 25, required_crusher_level: 3, unlocked: false },
  ],
};

const logBody = {
  log: [{ id: 'log_1', created_at: '2026-06-07T12:00:00Z', message: 'Outpost initialized near Anchor Rock.' }],
};

function mockApi(statusOverride?: unknown): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (method === 'POST' && url.includes('/v1/conversions/')) {
      return jsonResponse({ resource: 'ore', amount_converted: 350, gravel_per_unit: 1, yield_multiplier: 1.0, gravel_earned: 350, gravel_total: 1584 });
    }
    if (method === 'POST' && url.endsWith('/claim')) {
      return jsonResponse({ ...statusBody.sector.nodes[1], claimed_by: 'ply_dev', claim_cost: undefined });
    }
    if (method === 'POST') {
      return jsonResponse({});
    }
    if (url.endsWith('/v1/status')) {
      return jsonResponse(statusOverride ?? statusBody);
    }
    if (url.endsWith('/v1/leaderboard')) {
      return jsonResponse(leaderboardBody);
    }
    if (url.endsWith('/v1/conversions')) {
      return jsonResponse(conversionsBody);
    }
    if (url.endsWith('/v1/log')) {
      return jsonResponse(logBody);
    }
    return jsonResponse({});
  });
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the gravelboard with the season, total, bars, and YOU badge', async () => {
    vi.stubGlobal('fetch', mockApi());
    render(<App />);

    expect(await screen.findByText('Gravelboard')).toBeTruthy();
    expect(screen.getAllByText('The Coarse Age').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,234').length).toBeGreaterThan(0);
    expect(screen.getByText('Captain Basalt')).toBeTruthy();
    expect(screen.getByText('+456.7/hr')).toBeTruthy();

    const youMarks = screen.getAllByText('YOU');
    expect(youMarks.some((element) => element.className.includes('you-badge'))).toBe(true);
  });

  it('marks the codernaut location on the map and shows every home site', async () => {
    vi.stubGlobal('fetch', mockApi());
    render(<App />);

    expect(await screen.findByLabelText('You are here')).toBeTruthy();
    const youMarks = screen.getAllByText('YOU');
    expect(youMarks.some((element) => element.className.includes('you-marker-label'))).toBe(true);

    expect(screen.getByText('You are at Vesta-41 (0,0)')).toBeTruthy();
    expect(screen.getByTitle('Anchor Rock: ore 1/s')).toBeTruthy();
    expect(screen.getByTitle('Basalt Shelf: ore 0.75/s')).toBeTruthy();
    expect(screen.getByTitle('Permafrost Pocket: ice 0.5/s')).toBeTruthy();
    expect(screen.getByText('1/3 sites worked')).toBeTruthy();
  });

  it('crushes a resource through the conversions endpoint', async () => {
    const fetcher = mockApi();
    vi.stubGlobal('fetch', fetcher);
    render(<App />);

    const crushButton = await screen.findByRole('button', { name: /Crush all ore \(\+350\)/ });
    expect((crushButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(crushButton);

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        'http://localhost:8080/v1/conversions/ore',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Idempotency-Key': expect.stringContaining('convert-ore-') }),
        }),
      ),
    );
  });

  it('disables locked crusher resources with the required level in the title', async () => {
    vi.stubGlobal('fetch', mockApi());
    render(<App />);

    const gasButton = (await screen.findByRole('button', { name: /Crush all gas/ })) as HTMLButtonElement;
    expect(gasButton.disabled).toBe(true);
    expect(gasButton.title).toBe('Requires crusher level 2.');
  });

  it('claims a discovered node from the map', async () => {
    const fetcher = mockApi();
    vi.stubGlobal('fetch', fetcher);
    render(<App />);

    const claimButton = await screen.findByRole('button', { name: 'Claim for 150 ore' });
    expect((claimButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(claimButton);

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        'http://localhost:8080/v1/nodes/node_east_1/claim',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Idempotency-Key': expect.stringContaining('claim-node_east_1-') }),
        }),
      ),
    );
  });

  it('prevents assignment when energy capacity is exhausted and lists claimed sites only', async () => {
    const exhausted = {
      ...statusBody,
      resources: { ...statusBody.resources, energy: 100, energy_used: 100, energy_available: 0 },
    };
    vi.stubGlobal('fetch', mockApi(exhausted));
    render(<App />);

    const idleCard = (await screen.findByText('Prospector Two')).closest('article');
    expect(idleCard).toBeTruthy();
    const scoped = within(idleCard as HTMLElement);

    expect(scoped.queryByRole('option', { name: 'Bleak Slush Pit A' })).toBeNull();
    expect(scoped.getByRole('option', { name: 'Basalt Shelf' })).toBeTruthy();

    fireEvent.change(scoped.getByRole('combobox'), { target: { value: 'site_home_basalt' } });
    const assignButton = scoped.getByRole('button', { name: 'Assign' }) as HTMLButtonElement;
    expect(assignButton.disabled).toBe(true);
    expect(assignButton.title).toBe('Need more energy capacity.');
  });

  it('starts a scan from an unexplored frontier cell on the map', async () => {
    const fetcher = mockApi();
    vi.stubGlobal('fetch', fetcher);
    render(<App />);

    // node_east_1 sits at (1,0), so the east frontier is distance 2.
    const scanEast = (await screen.findByRole('button', { name: 'Scan east, distance 2' })) as HTMLButtonElement;
    expect(scanEast.disabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Scan north, distance 1' })).toBeTruthy();
    fireEvent.click(scanEast);

    await waitFor(() => {
      const scanCall = fetcher.mock.calls.find(([input, init]) => String(input).includes('/v1/actions/scan') && (init as RequestInit | undefined)?.method === 'POST');
      expect(scanCall).toBeTruthy();
      expect(String((scanCall?.[1] as RequestInit | undefined)?.body)).toContain('"direction":"east"');
    });
  });

  it('shows the countdown on the cell being scanned and blocks the other frontiers', async () => {
    const resolvesAt = new Date(Date.now() + 30_000).toISOString();
    const scanningStatus = {
      ...statusBody,
      active_actions: [
        {
          id: 'act_scan_001',
          type: 'scan',
          status: 'pending',
          created_at: new Date().toISOString(),
          resolves_at: resolvesAt,
          request: { direction: 'north', distance: '1' },
        },
      ],
    };
    vi.stubGlobal('fetch', mockApi(scanningStatus));
    render(<App />);

    const scanning = await screen.findByText('Scanning north');
    expect(scanning).toBeTruthy();
    expect(screen.getByText(/\ds remaining/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Scan north, distance 1' })).toBeNull();
    const scanEast = screen.getByRole('button', { name: 'Scan east, distance 2' }) as HTMLButtonElement;
    expect(scanEast.disabled).toBe(true);
  });

  it('renders resources, energy, and the activity log', async () => {
    vi.stubGlobal('fetch', mockApi());
    render(<App />);

    expect((await screen.findAllByText('Astronaut Vega-7')).length).toBeGreaterThan(0);
    expect(screen.getByText('350')).toBeTruthy();
    expect(screen.getByText('1.75/s')).toBeTruthy();
    expect(screen.getByText('Energy capacity')).toBeTruthy();
    expect(screen.getByText('used by assigned miners')).toBeTruthy();
    expect(screen.getByText('Outpost initialized near Anchor Rock.')).toBeTruthy();
    await waitFor(() => expect(window.fetch).toHaveBeenCalledWith('http://localhost:8080/v1/status', expect.any(Object)));
  });
});
