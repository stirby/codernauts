import { describe, expect, it, vi } from 'vitest';
import type { Node, Status } from '../src/client.js';
import {
  allSites,
  canAfford,
  canAssignMiner,
  canUpgradeCrusher,
  claimable,
  clockSkewMs,
  codernautLocation,
  conversionPreview,
  energyAvailable,
  energyCapacity,
  energyUsed,
  formatCost,
  formatGravel,
  formatRate,
  gravelPerHour,
  gravelTotal,
  isClaimed,
  isResourceUnlocked,
  isYou,
  leaderboardEntries,
  logEntries,
  mapModel,
  minerEnergyRequirement,
  nodeByID,
  nodeSiteSummary,
  nodesFor,
  openSites,
  resourceRate,
  scanDurationSeconds,
  secondsUntil,
  sitesOnClaimedNodes,
  unlockedResources,
} from '../src/web/game-model.js';

const homeNode: Node = {
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
};

const eastNode: Node = {
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
};

const sector = { id: 'sec_orion', name: 'Orion Spur', nodes: [homeNode, eastNode] };

const status: Status = {
  player: {
    id: 'ply_dev',
    display_name: 'Astronaut Vega-7',
    location: { node_id: 'node_home', node_name: 'Vesta-41', x: 0, y: 0 },
  },
  gravel: {
    total: 1234,
    per_hour: 456.7,
    season: { id: 'season_1760000000', name: 'The Coarse Age', started_at: '2026-06-07T11:00:00Z' },
  },
};

describe('node helpers', () => {
  it('returns nodes from a phase 2 sector', () => {
    expect(nodesFor(sector).map((node) => node.id)).toEqual(['node_home', 'node_east_1']);
  });

  it('groups legacy flat sites into synthetic claimed nodes by coordinate', () => {
    const legacy = {
      sites: [
        { id: 'site_a', name: 'Anchor Rock', x: 0, y: 0 },
        { id: 'site_b', name: 'Basalt Shelf', x: 0, y: 0 },
        { id: 'site_c', name: 'Far Rock', x: 2, y: 0 },
      ],
    };
    const nodes = nodesFor(legacy);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].sites?.map((site) => site.id)).toEqual(['site_a', 'site_b']);
    expect(nodes.every(isClaimed)).toBe(true);
  });

  it('flattens all sites and filters claimed-node sites', () => {
    expect(allSites(sector).map((site) => site.id)).toEqual(['site_home_anchor', 'site_home_basalt', 'site_home_perma', 'site_east_1_a']);
    expect(sitesOnClaimedNodes(sector).map((site) => site.id)).toEqual(['site_home_anchor', 'site_home_basalt', 'site_home_perma']);
  });

  it('finds nodes by id and reports claim state', () => {
    expect(nodeByID(sector.nodes, 'node_east_1')?.name).toBe('Bleak Slush');
    expect(nodeByID(sector.nodes, undefined)).toBeUndefined();
    expect(isClaimed(homeNode)).toBe(true);
    expect(isClaimed(eastNode)).toBe(false);
  });

  it('checks claim affordability against the multi-resource cost', () => {
    expect(claimable(eastNode, { ore: 150, ice: 0, gas: 0, crystal: 0 })).toBe(true);
    expect(claimable(eastNode, { ore: 149 })).toBe(false);
    expect(claimable(homeNode, { ore: 9999 })).toBe(false);
    const farNode: Node = { id: 'node_east_2', x: 2, y: 0, distance: 2, claim_cost: { ore: 600, ice: 100 } };
    expect(claimable(farNode, { ore: 600, ice: 99 })).toBe(false);
    expect(claimable(farNode, { ore: 600, ice: 100 })).toBe(true);
  });

  it('lists open sites on claimed nodes only', () => {
    expect(openSites(sector).map((site) => site.id)).toEqual(['site_home_basalt', 'site_home_perma']);
    expect(openSites(sector, 'min_starter').map((site) => site.id)).toEqual(['site_home_anchor', 'site_home_basalt', 'site_home_perma']);
  });

  it('summarizes a node\'s sites by resource and assignment', () => {
    expect(nodeSiteSummary(homeNode)).toEqual({ total: 3, assigned: 1, byResource: { ore: 2, ice: 1 } });
  });
});

describe('codernaut and gravel helpers', () => {
  it('reads the codernaut location with a home fallback', () => {
    expect(codernautLocation(status)).toEqual({ x: 0, y: 0, nodeId: 'node_home', nodeName: 'Vesta-41' });
    expect(codernautLocation({})).toEqual({ x: 0, y: 0, nodeId: undefined, nodeName: undefined });
  });

  it('reads gravel totals and rates', () => {
    expect(gravelTotal(status)).toBe(1234);
    expect(gravelPerHour(status)).toBe(456.7);
    expect(gravelTotal(undefined)).toBe(0);
    expect(formatGravel(1234567)).toBe('1,234,567');
  });
});

describe('crusher and conversion helpers', () => {
  const crusher = {
    level: 1,
    name: 'Crusher Mk I',
    yield_multiplier: 1.0,
    unlocked_resources: ['ore', 'ice'],
    next_upgrade: { level: 2, name: 'Crusher Mk II', yield_multiplier: 1.25, unlocks_resource: 'gas', cost: { ore: 300, ice: 100 } },
  };

  it('reads unlocked resources', () => {
    expect(unlockedResources(crusher)).toEqual(['ore', 'ice']);
    expect(isResourceUnlocked(crusher, 'ice')).toBe(true);
    expect(isResourceUnlocked(crusher, 'gas')).toBe(false);
  });

  it('checks crusher upgrade affordability across resources', () => {
    expect(canUpgradeCrusher(crusher, { ore: 300, ice: 100 })).toBe(true);
    expect(canUpgradeCrusher(crusher, { ore: 300, ice: 99 })).toBe(false);
    expect(canUpgradeCrusher({ level: 4, name: 'Universal Gravelization Protocol' }, { ore: 99999 })).toBe(false);
  });

  it('floors conversion previews like the server', () => {
    expect(conversionPreview(100, 1, 1.25)).toBe(125);
    expect(conversionPreview(3, 1, 1.25)).toBe(3);
    expect(conversionPreview(7, 3, 1.5)).toBe(31);
    expect(conversionPreview(0, 25, 2)).toBe(0);
  });
});

describe('leaderboard helpers', () => {
  it('sorts entries by gravel descending and flags your row', () => {
    const leaderboard = {
      season: { id: 'season_1760000000', name: 'The Coarse Age', started_at: '2026-06-07T11:00:00Z' },
      entries: [
        { rank: 2, player_id: 'ply_rival', codernaut: 'Captain Basalt', gravel: 900, gravel_per_hour: 80, is_you: false },
        { rank: 1, player_id: 'ply_dev', codernaut: 'Astronaut Vega-7', gravel: 1234, gravel_per_hour: 456.7, is_you: true },
      ],
    };
    const entries = leaderboardEntries(leaderboard);
    expect(entries.map((entry) => entry.player_id)).toEqual(['ply_dev', 'ply_rival']);
    expect(entries.map(isYou)).toEqual([true, false]);
    expect(leaderboardEntries(undefined)).toEqual([]);
  });
});

describe('map model', () => {
  it('marks home, claimed, discovered-unclaimed, and empty cells', () => {
    const claimedNorth: Node = { id: 'node_north_1', name: 'Rustbelt', x: 0, y: -1, distance: 1, claimed_by: 'ply_dev', sites: [] };
    const model = mapModel([homeNode, eastNode, claimedNorth], codernautLocation(status));
    const byCoordinate = new Map(model.cells.map((cell) => [`${cell.x}:${cell.y}`, cell]));
    // Columns span the west frontier (-1) through the east frontier (2).
    expect(model.columns).toBe(4);
    expect(byCoordinate.get('0:0')?.state).toBe('home');
    expect(byCoordinate.get('0:-1')?.state).toBe('claimed');
    expect(byCoordinate.get('1:0')?.state).toBe('discovered-unclaimed');
    expect(byCoordinate.get('-1:0')?.state).toBe('empty');
    expect(model.cells[0]).toMatchObject({ x: -1, y: -2, state: 'empty' });
  });

  it('marks the four scan frontiers with distances and durations', () => {
    const model = mapModel([homeNode], codernautLocation(status));
    const scans = model.cells.filter((cell) => cell.scan);
    expect(scans).toHaveLength(4);
    const byCoordinate = new Map(scans.map((cell) => [`${cell.x}:${cell.y}`, cell.scan]));
    expect(byCoordinate.get('0:-1')).toMatchObject({ direction: 'north', distance: 1, durationSeconds: 15 });
    expect(byCoordinate.get('1:0')).toMatchObject({ direction: 'east', distance: 1, durationSeconds: 15 });
    expect(byCoordinate.get('0:1')).toMatchObject({ direction: 'south', distance: 1, durationSeconds: 15 });
    expect(byCoordinate.get('-1:0')).toMatchObject({ direction: 'west', distance: 1, durationSeconds: 15 });
  });

  it('advances a scan frontier past discovered nodes and widens the grid to include it', () => {
    const north1: Node = { id: 'node_north_1', x: 0, y: -1, distance: 1, sites: [] };
    const north2: Node = { id: 'node_north_2', x: 0, y: -2, distance: 2, sites: [] };
    const model = mapModel([homeNode, north1, north2], codernautLocation(status));
    const target = model.cells.find((cell) => cell.scan?.direction === 'north');
    expect(target).toMatchObject({ x: 0, y: -3 });
    expect(target?.scan).toMatchObject({ distance: 3, durationSeconds: 55 });
    // Cells holding discovered nodes never carry a scan affordance.
    expect(model.cells.filter((cell) => cell.node && cell.scan)).toHaveLength(0);
  });

  it('computes scan durations with the server formula', () => {
    expect(scanDurationSeconds(1)).toBe(15);
    expect(scanDurationSeconds(2)).toBe(35);
    expect(scanDurationSeconds(4)).toBe(75);
    expect(scanDurationSeconds(0)).toBe(15);
  });
});

describe('formatting and energy helpers', () => {
  it('formats rates and multi-resource costs', () => {
    expect(formatRate(1.5)).toBe('1.5/s');
    expect(formatRate(undefined)).toBe('0/s');
    expect(formatCost({ ore: 300, ice: 100 })).toBe('300 ore, 100 ice');
    expect(formatCost({ ore: 2500, ice: 1200, gas: 600, crystal: 200 })).toBe('2500 ore, 1200 ice, 600 gas, 200 crystal');
    expect(formatCost({ ore: 100 })).toBe('100 ore');
    expect(formatCost({})).toBe('free');
    expect(formatCost(undefined)).toBe('max level');
  });

  it('checks multi-resource affordability', () => {
    expect(canAfford({ ore: 900, ice: 400, gas: 150 }, { ore: 900, ice: 400, gas: 150 })).toBe(true);
    expect(canAfford({ ore: 900, ice: 400, gas: 149 }, { ore: 900, ice: 400, gas: 150 })).toBe(false);
    expect(canAfford({ ore: 100 }, undefined)).toBe(false);
  });

  it('reads per-resource rates with the legacy ore alias', () => {
    const resources = { ore: 123, ice: 4, gas: 0, crystal: 0, rates_per_second: { ore: 1.75, ice: 0.5, gas: 0, crystal: 0 } };
    expect(resourceRate(resources, 'ore')).toBe(1.75);
    expect(resourceRate(resources, 'ice')).toBe(0.5);
    expect(resourceRate({ ore_rate_per_second: 1.25 }, 'ore')).toBe(1.25);
    expect(resourceRate(undefined, 'gas')).toBe(0);
  });

  it('calculates energy capacity from explicit or legacy fields', () => {
    expect(energyUsed({ energy_used: 30, energy: 5 })).toBe(30);
    expect(energyUsed({ energy: 30 })).toBe(30);
    expect(energyCapacity({ energy_capacity: 100, max_energy: 50 })).toBe(100);
    expect(energyCapacity({ max_energy: 100 })).toBe(100);
    expect(energyAvailable({ energy_available: 70 })).toBe(70);
    expect(energyAvailable({ energy_used: 30, energy_capacity: 100 })).toBe(70);
    expect(minerEnergyRequirement({ id: 'min_1', energy_requirement: 30 })).toBe(30);
    expect(canAssignMiner({ energy_available: 20 }, { id: 'min_1', energy_requirement: 30 })).toBe(false);
    expect(canAssignMiner({ energy_available: 30 }, { id: 'min_1', energy_requirement: 30 })).toBe(true);
  });

  it('parses log payloads and countdowns', () => {
    expect(logEntries({ log: [{ id: 'log_1', message: 'hello' }] })).toEqual([{ id: 'log_1', message: 'hello' }]);
    vi.setSystemTime(new Date('2026-06-07T12:00:00Z'));
    expect(secondsUntil('2026-06-07T12:00:05Z')).toBe(5);
    expect(secondsUntil('2026-06-07T11:59:59Z')).toBe(0);
    vi.useRealTimers();
  });

  it('anchors countdowns to an explicit reference time', () => {
    expect(secondsUntil('2026-06-07T12:00:10Z', Date.parse('2026-06-07T12:00:07Z'))).toBe(3);
    expect(secondsUntil('2026-06-07T12:00:10Z', Date.parse('2026-06-07T12:00:30Z'))).toBe(0);
  });

  it('derives clock skew from server_time so scaled clocks stay truthful', () => {
    const nowMs = Date.parse('2026-06-07T12:00:00Z');
    expect(clockSkewMs({ server_time: '2026-06-07T12:01:00Z' }, nowMs)).toBe(60_000);
    expect(clockSkewMs({ server_time: '2026-06-07T11:59:30Z' }, nowMs)).toBe(-30_000);
    expect(clockSkewMs({}, nowMs)).toBe(0);
    expect(clockSkewMs(undefined, nowMs)).toBe(0);
    expect(clockSkewMs({ server_time: 'garbage' }, nowMs)).toBe(0);
    // A scan 100 game-seconds out reads correctly through the skew.
    const skew = clockSkewMs({ server_time: '2026-06-07T12:10:00Z' }, nowMs);
    expect(secondsUntil('2026-06-07T12:11:40Z', nowMs + skew)).toBe(100);
  });
});
