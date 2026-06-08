import { describe, expect, it, vi } from 'vitest';
import {
  activeScan,
  assignedSiteID,
  canAfford,
  canAssignMiner,
  energyAvailable,
  energyCapacity,
  energyUsed,
  formatCost,
  formatRate,
  logEntries,
  minerEnergyRequirement,
  resourcePercent,
  secondsUntil,
  sitesFor,
} from '../src/web/game-model.js';

describe('web game model helpers', () => {
  it('normalizes common API shapes', () => {
    expect(sitesFor({ discovered_sites: [{ id: 'site_1' }] })).toEqual([{ id: 'site_1' }]);
    expect(assignedSiteID({ id: 'min_1', assigned_site_id: 'site_1' })).toBe('site_1');
    expect(logEntries({ log: [{ id: 'log_1', message: 'hello' }] })).toEqual([{ id: 'log_1', message: 'hello' }]);
    expect(activeScan({ status: {}, sector: {}, miners: [], log: [], actions: [{ id: 'act_1', type: 'scan', status: 'pending' }] })?.id).toBe(
      'act_1',
    );
  });

  it('formats numbers and ore costs', () => {
    expect(formatRate(1.5)).toBe('1.5/s');
    expect(formatRate(undefined)).toBe('0/s');
    expect(formatCost({ ore: 100 })).toBe('100 ore');
    expect(formatCost(undefined)).toBe('max level');
    expect(resourcePercent(15, 30)).toBe(50);
    expect(canAfford({ ore: 150, energy: 90 }, { ore: 100, energy: 999 })).toBe(true);
    expect(canAfford({ ore: 50, energy: 999 }, { ore: 100 })).toBe(false);
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

  it('calculates countdown seconds', () => {
    vi.setSystemTime(new Date('2026-06-07T12:00:00Z'));
    expect(secondsUntil('2026-06-07T12:00:05Z')).toBe(5);
    expect(secondsUntil('2026-06-07T11:59:59Z')).toBe(0);
    vi.useRealTimers();
  });
});
