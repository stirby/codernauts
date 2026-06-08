import { describe, expect, it } from 'vitest';
import { chooseNextAction } from '../src/bot-helpers.js';

describe('chooseNextAction', () => {
  it('assigns an idle miner before building or scanning when capacity is available', () => {
    expect(
      chooseNextAction({
        status: { resources: { energy_available: 30 } },
        miners: [{ id: 'miner_1', energy_requirement: 30 }],
        sector: { sites: [{ id: 'site_1' }] },
      }),
    ).toEqual({
      kind: 'assign-miner',
      minerId: 'miner_1',
      siteId: 'site_1',
      reason: 'An idle miner and discovered site are available, so start passive resource collection.',
    });
  });

  it('assigns idle miners only to unassigned sites', () => {
    expect(
      chooseNextAction({
        status: { resources: { energy_available: 30 } },
        miners: [{ id: 'miner_1', energy_requirement: 30 }],
        sector: { sites: [{ id: 'occupied', assigned_miner_id: 'miner_2' }, { id: 'open' }] },
      }),
    ).toEqual({
      kind: 'assign-miner',
      minerId: 'miner_1',
      siteId: 'open',
      reason: 'An idle miner and discovered site are available, so start passive resource collection.',
    });
  });

  it('does not assign an idle miner when energy capacity is full', () => {
    expect(
      chooseNextAction({
        status: { resources: { ore: 0, energy_used: 100, energy_capacity: 100 } },
        miners: [{ id: 'miner_1', energy_requirement: 30 }],
        sector: { sites: [{ id: 'site_1' }] },
      }).kind,
    ).toBe('scan');
  });

  it('builds a miner when the fleet is empty', () => {
    expect(chooseNextAction({ status: {}, miners: [], sector: { sites: [{ id: 'site_1' }] } }).kind).toBe('build-miner');
  });

  it('builds another miner when ore covers the build cost', () => {
    expect(
      chooseNextAction({
        status: { resources: { ore: 200, energy_available: 0 } },
        miners: [{ id: 'miner_1', siteId: 'site_1', build_cost: { ore: 175, energy: 999 } }],
        sector: { sites: [{ id: 'site_1' }] },
      }).kind,
    ).toBe('build-miner');
  });

  it('upgrades a miner when ore covers the upgrade cost', () => {
    expect(
      chooseNextAction({
        status: { resources: { ore: 170, energy_available: 0 } },
        miners: [
          {
            id: 'miner_1',
            siteId: 'site_1',
            build_cost: { ore: 175 },
            next_upgrade_cost: { ore: 150, energy: 999 },
          },
        ],
        sector: { sites: [{ id: 'site_1' }] },
      }).kind,
    ).toBe('upgrade-miner');
  });

  it('scans when miners exist but no sites are known', () => {
    expect(chooseNextAction({ status: {}, miners: [{ id: 'miner_1', siteId: 'site_1' }], sector: {} }).kind).toBe('scan');
  });
});
