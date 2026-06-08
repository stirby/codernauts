import { asList } from '../client.js';
import type { Action, Cost, LogEntry, Miner, Resources, Sector, Site, Status } from '../client.js';

export const scanDirections = ['north', 'east', 'south', 'west'] as const;

export type ScanDirection = (typeof scanDirections)[number];

export interface GameSnapshot {
  status: Status;
  sector: Sector;
  miners: Miner[];
  actions: Action[];
  log: LogEntry[];
}

export function sitesFor(sector: Sector | undefined): Site[] {
  return sector?.sites ?? sector?.discovered_sites ?? sector?.discoveredSites ?? [];
}

export function activeActions(snapshot: GameSnapshot | undefined): Action[] {
  return snapshot?.actions.filter((action) => action.status === 'pending') ?? [];
}

export function activeScan(snapshot: GameSnapshot | undefined): Action | undefined {
  return activeActions(snapshot).find((action) => action.type === 'scan');
}

export function assignedMinerID(site: Site): string | undefined {
  return site.assigned_miner_id ?? site.assignedMinerId;
}

export function assignedSiteID(miner: Miner): string | undefined {
  return miner.assigned_site_id ?? miner.assignedSiteId ?? miner.site_id ?? miner.siteId ?? undefined;
}

export function minerByID(miners: Miner[], id: string | undefined): Miner | undefined {
  if (!id) {
    return undefined;
  }
  return miners.find((miner) => miner.id === id);
}

export function siteByID(sites: Site[], id: string | undefined): Site | undefined {
  if (!id) {
    return undefined;
  }
  return sites.find((site) => site.id === id);
}

export function idleMiners(miners: Miner[]): Miner[] {
  return miners.filter((miner) => !assignedSiteID(miner));
}

export function availableSites(sites: Site[], minerID?: string): Site[] {
  return sites.filter((site) => {
    const assigned = assignedMinerID(site);
    const kind = site.kind ?? site.type;
    return kind === 'asteroid' && !site.depleted && (!assigned || assigned === minerID);
  });
}

export function ore(resources: Resources | undefined): number {
  return resources?.ore ?? 0;
}

export function maxOre(resources: Resources | undefined): number | undefined {
  return resources?.max_ore ?? resources?.maxOre;
}

export function energyUsed(resources: Resources | undefined): number {
  return resources?.energy_used ?? resources?.energyUsed ?? resources?.energy ?? 0;
}

export function energyCapacity(resources: Resources | undefined): number | undefined {
  return resources?.energy_capacity ?? resources?.energyCapacity ?? resources?.max_energy ?? resources?.maxEnergy;
}

export function energyAvailable(resources: Resources | undefined): number {
  const explicit = resources?.energy_available ?? resources?.energyAvailable;
  if (typeof explicit === 'number') {
    return explicit;
  }
  const capacity = energyCapacity(resources);
  if (typeof capacity !== 'number') {
    return 0;
  }
  return Math.max(0, capacity - energyUsed(resources));
}

export function minerEnergyRequirement(miner: Miner | undefined): number {
  return miner?.energy_requirement ?? miner?.energyRequirement ?? 0;
}

export function oreRate(resources: Resources | undefined): number | undefined {
  return resources?.ore_rate_per_second ?? resources?.oreRatePerSecond;
}

export function canAfford(resources: Resources | undefined, cost: Cost | undefined): boolean {
  if (!cost) {
    return false;
  }
  return ore(resources) >= (cost.ore ?? 0);
}

export function canAssignMiner(resources: Resources | undefined, miner: Miner): boolean {
  if (assignedSiteID(miner)) {
    return true;
  }
  return energyAvailable(resources) >= minerEnergyRequirement(miner);
}

export function buildCost(miners: Miner[]): Cost | undefined {
  return miners[0]?.build_cost ?? miners[0]?.buildCost;
}

export function upgradeCost(miner: Miner): Cost | undefined {
  return miner.next_upgrade_cost ?? miner.nextUpgradeCost;
}

export function minerRate(miner: Miner): number | undefined {
  return miner.ore_rate_per_second ?? miner.oreRatePerSecond;
}

export function siteRate(site: Site): number | undefined {
  return site.base_ore_rate_per_second ?? site.baseOreRatePerSecond;
}

export function actionResolvesAt(action: Action): string | undefined {
  return action.resolves_at ?? action.resolvesAt;
}

export function actionDirection(action: Action): string | undefined {
  const request = action.request;
  if (request && typeof request.direction === 'string') {
    return request.direction;
  }
  return undefined;
}

export function secondsUntil(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return 0;
  }
  return Math.max(0, Math.ceil((time - Date.now()) / 1000));
}

export function resourcePercent(value: number | undefined, max: number | undefined): number {
  if (typeof value !== 'number' || typeof max !== 'number' || max <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function formatRate(rate: number | undefined): string {
  if (typeof rate !== 'number') {
    return '0/s';
  }
  return `${trimNumber(rate)}/s`;
}

export function formatCost(cost: Cost | undefined): string {
  if (!cost) {
    return 'max level';
  }
  return `${cost.ore ?? 0} ore`;
}

export function formatDateTime(value: string | undefined): string {
  if (!value) {
    return 'unknown';
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return value;
  }
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function logEntries(value: unknown): LogEntry[] {
  return asList<LogEntry>(value, 'log');
}

export function statusActions(status: Status | undefined): Action[] {
  return status?.active_actions ?? status?.activeActions ?? [];
}

export function statusMiners(status: Status | undefined): Miner[] {
  return status?.miners ?? [];
}

export function trimNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
