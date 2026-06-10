import {
  assignedMinerID,
  buildCost,
  canAfford,
  claimable,
  energyAvailable,
  formatCost,
  isClaimed,
  minerEnergyRequirement,
  nodesFor,
  openSites,
  resourceAmount,
  scanDirections,
  siteRate,
  unlockedResources,
  upgradeCost,
} from './web/game-model.js';
import type { ScanDirection } from './web/game-model.js';
import type { Cost, Miner, Node, ResourceName, Sector, Site, Status } from './client.js';

/** Server default for the first miner when no fleet exists to report a cost. */
export const defaultBuildCostOre = 100;

/**
 * Smallest surplus worth a crush. Batching avoids spamming the API with
 * one-pebble conversions every tick while income trickles in.
 */
export const conversionBatchMinimum = 25;

/** Crush high-value resources first so each step earns the most gravel. */
const convertOrder: readonly ResourceName[] = ['crystal', 'gas', 'ice', 'ore'];

export type BotDecision =
  | { kind: 'claim-node'; nodeId: string; reason: string }
  | { kind: 'assign-miner'; minerId: string; siteId: string; reason: string }
  | { kind: 'upgrade-crusher'; reason: string }
  | { kind: 'build-miner'; reason: string }
  | { kind: 'upgrade-miner'; minerId: string; reason: string }
  | { kind: 'scan'; direction: ScanDirection; reason: string }
  | { kind: 'convert'; resource: string; amount: number; reason: string }
  | { kind: 'wait'; reason: string };

export interface BotSnapshot {
  status: Status;
  miners: Miner[];
  sector: Sector;
}

export interface PlannedPurchase {
  label: string;
  cost: Cost;
}

/**
 * Chooses one safe action per run. Priority: claim, assign, upgrade crusher,
 * build, upgrade miner for capacity, scan, convert surplus, wait.
 */
export function chooseNextAction(snapshot: BotSnapshot): BotDecision {
  const resources = snapshot.status.resources;
  const nodes = nodesFor(snapshot.sector);

  const claimTarget = claimTargets(nodes).find((node) => claimable(node, resources));
  if (claimTarget) {
    return {
      kind: 'claim-node',
      nodeId: claimTarget.id,
      reason: `Claiming ${claimTarget.name ?? claimTarget.id} for ${formatCost(claimTarget.claim_cost)} opens its sites for mining.`,
    };
  }

  const idleMiner = snapshot.miners.find((miner) => !assignedSiteId(miner));
  const targetSite = bestOpenSite(snapshot.sector);
  if (idleMiner && targetSite && energyAvailable(resources) >= minerEnergyRequirement(idleMiner)) {
    return {
      kind: 'assign-miner',
      minerId: idleMiner.id,
      siteId: targetSite.id,
      reason: `${targetSite.name ?? targetSite.id} is the fastest open site on a claimed node, so the idle miner goes there.`,
    };
  }

  const crusherUpgrade = snapshot.status.crusher?.next_upgrade;
  if (crusherUpgrade && canAfford(resources, crusherUpgrade.cost)) {
    return {
      kind: 'upgrade-crusher',
      reason: `Upgrading the crusher to ${crusherUpgrade.name ?? 'the next level'} raises gravel yield for every future crush.`,
    };
  }

  // Build only when no miner is already waiting for a site; a capacity-blocked
  // idle miner is handled by the upgrade rule below instead.
  const siteWillExist = nodes.some((node) => !isClaimed(node));
  if (!idleMiner && canAffordBuild(snapshot) && (targetSite || siteWillExist)) {
    return {
      kind: 'build-miner',
      reason: targetSite
        ? 'An open site on a claimed node is waiting, so a new miner can start producing immediately.'
        : 'A discovered node is waiting to be claimed, so a new miner will have a site soon.',
    };
  }

  // Capacity is the blocker when an idle miner and an open site exist but the
  // assignment above did not fire. Each miner upgrade adds energy capacity.
  if (idleMiner && targetSite) {
    const upgradable = cheapestAffordableUpgrade(snapshot.miners, resources);
    if (upgradable) {
      return {
        kind: 'upgrade-miner',
        minerId: upgradable.id,
        reason: 'Energy capacity is blocking an assignment, so upgrade a miner to raise capacity.',
      };
    }
  }

  if (!hasActiveScan(snapshot)) {
    const direction = nextScanDirection(nodes);
    return {
      kind: 'scan',
      direction,
      reason: `Scanning ${direction} charts the next node out that way. Farther nodes take longer to scan.`,
    };
  }

  const conversion = chooseConversion(snapshot);
  if (conversion) {
    return conversion;
  }

  return {
    kind: 'wait',
    reason: 'Nothing affordable or assignable right now; resources keep accruing on their own.',
  };
}

/** Discovered unclaimed nodes, nearest first, with stable id tie-breaks. */
export function claimTargets(nodes: Node[]): Node[] {
  return nodes
    .filter((node) => !isClaimed(node))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || a.id.localeCompare(b.id));
}

/** The unassigned claimed-node site with the highest base rate. */
export function bestOpenSite(sector: Sector): Site | undefined {
  return openSites(sector)
    .filter((site) => !assignedMinerID(site))
    .sort((a, b) => (siteRate(b) ?? 0) - (siteRate(a) ?? 0))[0];
}

/**
 * The next purchase the bot is saving toward, mirroring its decision order:
 * claim the nearest node, then the crusher upgrade, then another miner.
 */
export function nextPlannedPurchase(snapshot: BotSnapshot): PlannedPurchase {
  const target = claimTargets(nodesFor(snapshot.sector))[0];
  if (target?.claim_cost) {
    return { label: `claiming ${target.name ?? target.id}`, cost: target.claim_cost };
  }
  const upgrade = snapshot.status.crusher?.next_upgrade;
  if (upgrade?.cost) {
    return { label: `the ${upgrade.name ?? 'next crusher'} upgrade`, cost: upgrade.cost };
  }
  return { label: 'the next miner build', cost: buildCost(snapshot.miners) ?? { ore: defaultBuildCostOre } };
}

/**
 * Crushes the surplus of one unlocked resource above the reserve needed for
 * upcoming purchases, once the surplus is worth a batch. Highest-value
 * resources are checked first. The reserve covers both the next planned
 * purchase and the next crusher tier so crushing never starves the
 * higher-priority upgrade.
 */
export function chooseConversion(snapshot: BotSnapshot): BotDecision | undefined {
  const resources = snapshot.status.resources;
  const unlocked = unlockedResources(snapshot.status.crusher);
  const plan = nextPlannedPurchase(snapshot);
  const upgradeCost = snapshot.status.crusher?.next_upgrade?.cost ?? {};

  for (const resource of convertOrder) {
    if (!unlocked.includes(resource)) {
      continue;
    }
    const reserved = Math.max(plan.cost[resource] ?? 0, upgradeCost[resource] ?? 0);
    const surplus = Math.floor(resourceAmount(resources, resource)) - reserved;
    if (surplus >= conversionBatchMinimum) {
      return {
        kind: 'convert',
        resource,
        amount: surplus,
        reason: `Crushing ${surplus} surplus ${resource} into gravel while reserving ${reserved} ${resource} for planned purchases.`,
      };
    }
  }
  return undefined;
}

/**
 * Rotates scans by picking the direction with the fewest discovered nodes,
 * breaking ties in north, east, south, west order.
 */
export function nextScanDirection(nodes: Node[]): ScanDirection {
  const counts: Record<ScanDirection, number> = { north: 0, east: 0, south: 0, west: 0 };
  for (const node of nodes) {
    const direction = nodeDirection(node);
    if (direction) {
      counts[direction] += 1;
    }
  }
  let best: ScanDirection = scanDirections[0];
  for (const direction of scanDirections) {
    if (counts[direction] < counts[best]) {
      best = direction;
    }
  }
  return best;
}

export function assignedSiteId(miner: Miner): string | null {
  return miner.site_id ?? miner.siteId ?? miner.assigned_site_id ?? miner.assignedSiteId ?? null;
}

/** Maps node coordinates onto a scan axis: north (0,-d), east (d,0), south (0,d), west (-d,0). */
function nodeDirection(node: Node): ScanDirection | undefined {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  if (x === 0 && y < 0) {
    return 'north';
  }
  if (x > 0 && y === 0) {
    return 'east';
  }
  if (x === 0 && y > 0) {
    return 'south';
  }
  if (x < 0 && y === 0) {
    return 'west';
  }
  return undefined;
}

function canAffordBuild(snapshot: BotSnapshot): boolean {
  const cost = buildCost(snapshot.miners) ?? { ore: defaultBuildCostOre };
  return canAfford(snapshot.status.resources, cost);
}

function cheapestAffordableUpgrade(miners: Miner[], resources: Status['resources']): Miner | undefined {
  return miners
    .filter((miner) => canAfford(resources, upgradeCost(miner)))
    .sort((a, b) => (upgradeCost(a)?.ore ?? 0) - (upgradeCost(b)?.ore ?? 0))[0];
}

function hasActiveScan(snapshot: BotSnapshot): boolean {
  const actions = snapshot.status.active_actions ?? snapshot.status.activeActions ?? [];
  return actions.some((action) => action.type === 'scan' && action.status === 'pending');
}
