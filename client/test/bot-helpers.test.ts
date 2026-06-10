import { describe, expect, it } from 'vitest';
import type { Node } from '../src/client.js';
import { chooseNextAction, conversionBatchMinimum, nextPlannedPurchase, nextScanDirection } from '../src/bot-helpers.js';

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
    { id: 'site_home_anchor', name: 'Anchor Rock', resource: 'ore', base_rate_per_second: 1.0, assigned_miner_id: 'min_starter' },
    { id: 'site_home_basalt', name: 'Basalt Shelf', resource: 'ore', base_rate_per_second: 0.75 },
    { id: 'site_home_perma', name: 'Permafrost Pocket', resource: 'ice', base_rate_per_second: 0.5 },
  ],
};

function claimedHomeFullyWorked(): Node {
  return {
    ...homeNode,
    sites: homeNode.sites?.map((site, index) => ({ ...site, assigned_miner_id: `min_${index}` })),
  };
}

describe('chooseNextAction priorities', () => {
  it('1: claims the nearest affordable discovered node first', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 700, ice: 100 } },
      miners: [],
      sector: {
        nodes: [
          homeNode,
          { id: 'node_east_2', name: 'Rustbelt', x: 2, y: 0, distance: 2, claim_cost: { ore: 600, ice: 100 } },
          { id: 'node_east_1', name: 'Bleak Slush', x: 1, y: 0, distance: 1, claim_cost: { ore: 150 } },
        ],
      },
    });
    expect(decision).toMatchObject({ kind: 'claim-node', nodeId: 'node_east_1' });
    expect(decision.reason).toContain('150 ore');
  });

  it('2: assigns an idle miner to the fastest open site on a claimed node', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 10, energy_available: 30 } },
      miners: [{ id: 'min_002', energy_requirement: 30 }],
      sector: { nodes: [homeNode] },
    });
    expect(decision).toMatchObject({ kind: 'assign-miner', minerId: 'min_002', siteId: 'site_home_basalt' });
  });

  it('2: never assigns to sites on unclaimed nodes', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 10, energy_available: 30 } },
      miners: [{ id: 'min_002', energy_requirement: 30 }],
      sector: {
        nodes: [
          claimedHomeFullyWorked(),
          {
            id: 'node_east_1',
            x: 1,
            y: 0,
            distance: 1,
            claim_cost: { ore: 99999 },
            sites: [{ id: 'site_east_1_a', resource: 'ice', base_rate_per_second: 1.0 }],
          },
        ],
      },
    });
    expect(decision.kind).toBe('scan');
  });

  it('3: upgrades the crusher before building when both are affordable', () => {
    const decision = chooseNextAction({
      status: {
        resources: { ore: 300, ice: 100, energy_available: 10 },
        crusher: {
          level: 1,
          name: 'Crusher Mk I',
          yield_multiplier: 1.0,
          unlocked_resources: ['ore', 'ice'],
          next_upgrade: { level: 2, name: 'Crusher Mk II', yield_multiplier: 1.25, unlocks_resource: 'gas', cost: { ore: 300, ice: 100 } },
        },
      },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 175 } }],
      sector: { nodes: [homeNode] },
    });
    expect(decision.kind).toBe('upgrade-crusher');
  });

  it('4: builds a miner when affordable and an open claimed site exists', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 200, energy_available: 70 } },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 175 } }],
      sector: { nodes: [homeNode] },
    });
    expect(decision.kind).toBe('build-miner');
  });

  it('4: builds the first miner with the default cost when the fleet is empty', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 100, energy_available: 100 } },
      miners: [],
      sector: { nodes: [homeNode] },
    });
    expect(decision.kind).toBe('build-miner');
  });

  it('4: does not build when no open claimed site exists or is expected', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 99999, energy_available: 70 } },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 175 } }],
      sector: { nodes: [claimedHomeFullyWorked()] },
    });
    expect(decision.kind).toBe('scan');
  });

  it('5: upgrades the cheapest miner when capacity blocks an assignment', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 200, energy_used: 100, energy_capacity: 100 } },
      miners: [
        { id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 9999 }, next_upgrade_cost: { ore: 150 } },
        { id: 'min_002', energy_requirement: 30, next_upgrade_cost: { ore: 300 } },
      ],
      sector: { nodes: [homeNode] },
    });
    expect(decision).toMatchObject({ kind: 'upgrade-miner', minerId: 'min_starter' });
    expect(decision.reason).toContain('capacity');
  });

  it('6: scans the least explored direction when nothing else applies', () => {
    const decision = chooseNextAction({
      status: { resources: { ore: 0 } },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 175 } }],
      sector: { nodes: [claimedHomeFullyWorked(), { id: 'node_north_1', x: 0, y: -1, distance: 1, claim_cost: { ore: 99999 } }] },
    });
    expect(decision).toMatchObject({ kind: 'scan', direction: 'east' });
  });

  it('6: does not scan while another scan is active', () => {
    const decision = chooseNextAction({
      status: {
        resources: { ore: 0 },
        active_actions: [{ id: 'act_1', type: 'scan', status: 'pending' }],
      },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 175 } }],
      sector: { nodes: [claimedHomeFullyWorked()] },
    });
    expect(decision.kind).toBe('wait');
  });

  it('7: converts only the surplus above the reserve for the next purchase', () => {
    const decision = chooseNextAction({
      status: {
        resources: { ore: 500, ice: 50, energy_available: 0 },
        active_actions: [{ id: 'act_1', type: 'scan', status: 'pending' }],
        crusher: {
          level: 1,
          name: 'Crusher Mk I',
          yield_multiplier: 1.0,
          unlocked_resources: ['ore', 'ice'],
          next_upgrade: { level: 2, name: 'Crusher Mk II', yield_multiplier: 1.25, unlocks_resource: 'gas', cost: { ore: 300, ice: 100 } },
        },
      },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 600 } }],
      sector: { nodes: [claimedHomeFullyWorked()] },
    });
    expect(decision).toMatchObject({ kind: 'convert', resource: 'ore', amount: 200 });
    expect(decision.reason).toContain('reserving 300 ore');
  });

  it('7: reserves the claim cost and crushes unreserved resources first', () => {
    const decision = chooseNextAction({
      status: {
        resources: { ore: 500, ice: 80, energy_available: 0 },
        active_actions: [{ id: 'act_1', type: 'scan', status: 'pending' }],
        crusher: { level: 1, name: 'Crusher Mk I', yield_multiplier: 1.0, unlocked_resources: ['ore', 'ice'] },
      },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 9999 } }],
      sector: { nodes: [claimedHomeFullyWorked(), { id: 'node_east_1', x: 1, y: 0, distance: 1, claim_cost: { ore: 99999 } }] },
    });
    expect(decision).toMatchObject({ kind: 'convert', resource: 'ice', amount: 80 });
  });

  it('7: waits on a surplus smaller than one conversion batch', () => {
    const snapshot = (ice: number) => ({
      status: {
        resources: { ore: 0, ice, energy_available: 0 },
        active_actions: [{ id: 'act_1', type: 'scan', status: 'pending' }],
        crusher: { level: 1, name: 'Crusher Mk I', yield_multiplier: 1.0, unlocked_resources: ['ore', 'ice'] },
      },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 9999 } }],
      sector: { nodes: [claimedHomeFullyWorked()] },
    });
    expect(chooseNextAction(snapshot(conversionBatchMinimum - 1)).kind).toBe('wait');
    expect(chooseNextAction(snapshot(conversionBatchMinimum))).toMatchObject({
      kind: 'convert',
      resource: 'ice',
      amount: conversionBatchMinimum,
    });
  });

  it('7: never crushes resources reserved for the next crusher tier', () => {
    const snapshot = (gas: number) => ({
      status: {
        resources: { ore: 0, ice: 0, gas, energy_available: 0 },
        active_actions: [{ id: 'act_1', type: 'scan', status: 'pending' }],
        crusher: {
          level: 2,
          name: 'Crusher Mk II',
          yield_multiplier: 1.25,
          unlocked_resources: ['ore', 'ice', 'gas'],
          next_upgrade: {
            level: 3,
            name: 'Sub-Orbital Aggregate Processing',
            yield_multiplier: 1.5,
            unlocks_resource: 'crystal',
            cost: { ore: 900, ice: 400, gas: 150 },
          },
        },
      },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 9999 } }],
      sector: {
        nodes: [
          claimedHomeFullyWorked(),
          // The nearest claim reserves only 75 gas; the crusher tier needs 150.
          { id: 'node_north_3', x: 0, y: -3, distance: 3, claim_cost: { ore: 99999, ice: 400, gas: 75 } },
        ],
      },
    });
    // Gas at the tier cost stays banked for the upgrade instead of crushing
    // the 75 surplus above the claim reserve.
    expect(chooseNextAction(snapshot(150)).kind).toBe('wait');
    expect(chooseNextAction(snapshot(150 + conversionBatchMinimum))).toMatchObject({
      kind: 'convert',
      resource: 'gas',
      amount: conversionBatchMinimum,
    });
  });

  it('7: never converts locked resources', () => {
    const decision = chooseNextAction({
      status: {
        resources: { ore: 0, ice: 0, gas: 500, energy_available: 0 },
        active_actions: [{ id: 'act_1', type: 'scan', status: 'pending' }],
        crusher: { level: 1, name: 'Crusher Mk I', yield_multiplier: 1.0, unlocked_resources: ['ore', 'ice'] },
      },
      miners: [{ id: 'min_starter', site_id: 'site_home_anchor', build_cost: { ore: 9999 } }],
      sector: { nodes: [claimedHomeFullyWorked()] },
    });
    expect(decision.kind).toBe('wait');
  });
});

describe('nextScanDirection', () => {
  it('rotates north, east, south, west as rings complete', () => {
    expect(nextScanDirection([homeNode])).toBe('north');
    expect(nextScanDirection([homeNode, { id: 'node_north_1', x: 0, y: -1 }])).toBe('east');
    expect(
      nextScanDirection([
        homeNode,
        { id: 'node_north_1', x: 0, y: -1 },
        { id: 'node_east_1', x: 1, y: 0 },
        { id: 'node_south_1', x: 0, y: 1 },
      ]),
    ).toBe('west');
    expect(
      nextScanDirection([
        homeNode,
        { id: 'node_north_1', x: 0, y: -1 },
        { id: 'node_east_1', x: 1, y: 0 },
        { id: 'node_south_1', x: 0, y: 1 },
        { id: 'node_west_1', x: -1, y: 0 },
      ]),
    ).toBe('north');
  });
});

describe('nextPlannedPurchase', () => {
  it('prefers the nearest claim, then the crusher upgrade, then a miner build', () => {
    const crusher = {
      level: 1,
      next_upgrade: { level: 2, name: 'Crusher Mk II', cost: { ore: 300, ice: 100 } },
    };
    const claimSector = { nodes: [homeNode, { id: 'node_east_1', x: 1, y: 0, distance: 1, claim_cost: { ore: 150 } }] };
    expect(nextPlannedPurchase({ status: { crusher }, miners: [], sector: claimSector }).cost).toEqual({ ore: 150 });
    expect(nextPlannedPurchase({ status: { crusher }, miners: [], sector: { nodes: [homeNode] } }).cost).toEqual({ ore: 300, ice: 100 });
    expect(
      nextPlannedPurchase({ status: {}, miners: [{ id: 'min_starter', build_cost: { ore: 175 } }], sector: { nodes: [homeNode] } }).cost,
    ).toEqual({ ore: 175 });
    expect(nextPlannedPurchase({ status: {}, miners: [], sector: { nodes: [homeNode] } }).cost).toEqual({ ore: 100 });
  });
});
