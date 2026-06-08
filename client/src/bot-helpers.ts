import { getSites } from './format.js';
import type { Miner, Sector, Site, Status } from './client.js';

export type BotDecision =
  | { kind: 'assign-miner'; minerId: string; siteId: string; reason: string }
  | { kind: 'build-miner'; reason: string }
  | { kind: 'upgrade-miner'; minerId: string; reason: string }
  | { kind: 'scan'; reason: string }
  | { kind: 'wait'; reason: string };

export interface BotSnapshot {
  status: Status;
  miners: Miner[];
  sector: Sector;
}

/**
 * Chooses one safe beginner action. The bot favors persistent resource income.
 */
export function chooseNextAction(snapshot: BotSnapshot): BotDecision {
  const sites = getSites(snapshot.sector);
  const availableSite = sites.find(isAvailableSite);
  const idleMiner = snapshot.miners.find((miner) => !assignedSiteId(miner));

  if (idleMiner && availableSite && hasEnergyCapacityFor(snapshot, idleMiner)) {
    return {
      kind: 'assign-miner',
      minerId: idleMiner.id,
      siteId: availableSite.id,
      reason: 'An idle miner and discovered site are available, so start passive resource collection.',
    };
  }

  if (snapshot.miners.length === 0) {
    return {
      kind: 'build-miner',
      reason: 'No miners exist yet. Building one unlocks passive resource collection.',
    };
  }

  if (canBuildMiner(snapshot)) {
    return {
      kind: 'build-miner',
      reason: 'Enough ore is available to add another persistent miner.',
    };
  }

  const upgradableMiner = snapshot.miners.find((miner) => canUpgradeMiner(snapshot, miner));
  if (upgradableMiner) {
    return {
      kind: 'upgrade-miner',
      minerId: upgradableMiner.id,
      reason: 'Enough ore is available to improve an existing miner and increase energy capacity.',
    };
  }

  if (sites.length === 0 || !hasActiveScan(snapshot)) {
    return {
      kind: 'scan',
      reason: 'Scanning can reveal more places to assign future miners.',
    };
  }

  return {
    kind: 'wait',
    reason: 'Miners appear assigned and current ore is below the next build or upgrade cost.',
  };
}

export function assignedSiteId(miner: Miner): string | null {
  return miner.site_id ?? miner.siteId ?? miner.assigned_site_id ?? miner.assignedSiteId ?? null;
}

function isAvailableSite(site: Site): boolean {
  const kind = site.kind ?? site.type;
  const assignedMinerID = site.assigned_miner_id ?? site.assignedMinerId;
  return kind !== 'empty' && !site.depleted && !assignedMinerID;
}

function canBuildMiner(snapshot: BotSnapshot): boolean {
  const cost = snapshot.miners[0]?.build_cost ?? snapshot.miners[0]?.buildCost;
  return canAfford(snapshot, cost);
}

function canUpgradeMiner(snapshot: BotSnapshot, miner: Miner): boolean {
  const cost = miner.next_upgrade_cost ?? miner.nextUpgradeCost;
  return canAfford(snapshot, cost);
}

function canAfford(snapshot: BotSnapshot, cost: { ore?: number } | undefined): boolean {
  if (!cost) {
    return false;
  }
  const ore = snapshot.status.resources?.ore ?? 0;
  return ore >= (cost.ore ?? 0);
}

function hasEnergyCapacityFor(snapshot: BotSnapshot, miner: Miner): boolean {
  return energyAvailable(snapshot.status) >= energyRequirement(miner);
}

function energyAvailable(status: Status): number {
  const resources = status.resources;
  const explicit = resources?.energy_available ?? resources?.energyAvailable;
  if (typeof explicit === 'number') {
    return explicit;
  }
  const capacity = resources?.energy_capacity ?? resources?.energyCapacity ?? resources?.max_energy ?? resources?.maxEnergy ?? 0;
  const used = resources?.energy_used ?? resources?.energyUsed ?? resources?.energy ?? 0;
  return Math.max(0, capacity - used);
}

function energyRequirement(miner: Miner): number {
  return miner.energy_requirement ?? miner.energyRequirement ?? 0;
}

function hasActiveScan(snapshot: BotSnapshot): boolean {
  const actions = snapshot.status.active_actions ?? snapshot.status.activeActions ?? [];
  return actions.some((action) => action.type === 'scan' && action.status === 'pending');
}
