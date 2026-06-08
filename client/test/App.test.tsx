import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/web/App.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the dashboard from API data', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/v1/status')) {
        return jsonResponse({
          player: { display_name: 'Astronaut Vega-7' },
          outpost: { name: 'Vesta-41' },
          resources: {
            ore: 350,
            max_ore: 1000,
            energy: 30,
            max_energy: 100,
            energy_used: 30,
            energy_capacity: 100,
            energy_available: 70,
            ore_rate_per_second: 1,
          },
          sector: {
            name: 'Orion Spur',
            sites: [
              {
                id: 'site_home_asteroid',
                name: 'Anchor Rock',
                kind: 'asteroid',
                x: 0,
                y: 0,
                richness: 1,
                assigned_miner_id: 'min_starter',
                base_ore_rate_per_second: 1,
              },
            ],
          },
          miners: [
            {
              id: 'min_starter',
              name: 'Prospector One',
              level: 1,
              status: 'mining',
              assigned_site_id: 'site_home_asteroid',
              ore_rate_per_second: 1,
              energy_requirement: 30,
              build_cost: { ore: 175 },
              next_upgrade_cost: { ore: 150 },
            },
          ],
          active_actions: [],
          suggested_next_actions: [{ key: 'scan', message: 'Start a scan to discover more asteroid sites.' }],
        });
      }
      if (url.endsWith('/v1/log')) {
        return jsonResponse({ log: [{ id: 'log_1', created_at: '2026-06-07T12:00:00Z', message: 'Outpost initialized near Anchor Rock.' }] });
      }
      return jsonResponse({});
    });

    vi.stubGlobal('fetch', fetcher);
    render(<App />);

    expect(await screen.findByText('Astronaut Vega-7')).toBeTruthy();
    expect(screen.getAllByText('Anchor Rock').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prospector One').length).toBeGreaterThan(0);
    expect(screen.getByText('Energy capacity')).toBeTruthy();
    expect(screen.getByText('used by assigned miners')).toBeTruthy();
    expect(screen.getByText('Outpost initialized near Anchor Rock.')).toBeTruthy();
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('http://localhost:8080/v1/status', expect.any(Object)));
  });
});
