import type { Action, ConversionResult, Conversions, Leaderboard, Miner, Node, Resources, Sector, Site, Status } from './client.js';
import { resourceNames } from './client.js';
import {
  allSites,
  assignedMinerID,
  codernautLocation,
  energyCapacity,
  energyUsed,
  formatCost,
  formatGravel,
  gravelPerHour,
  gravelTotal,
  isClaimed,
  minerRate,
  nodeSiteSummary,
  nodesFor,
  resourceRate,
  seasonName,
  siteRate,
  trimNumber,
} from './web/game-model.js';

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printStatus(status: Status): void {
  const codernaut = status.player?.display_name ?? status.player?.displayName ?? status.player?.name ?? status.player?.id ?? 'Unknown codernaut';
  console.log(`Codernaut: ${codernaut}`);

  const location = codernautLocation(status);
  const locationName = location.nodeName ?? status.outpost?.name ?? location.nodeId ?? 'home';
  console.log(`You are at ${locationName} (${location.x},${location.y})`);

  if (status.gravel) {
    console.log(`Gravel: ${formatGravel(gravelTotal(status))} total, ${trimNumber(gravelPerHour(status))}/hr | Season: ${seasonName(status)}`);
  }

  if (status.crusher) {
    console.log(`Crusher: ${status.crusher.name ?? 'Crusher'} (level ${status.crusher.level ?? 1})`);
  }

  if (status.resources) {
    console.log(`Resources: ${formatResources(status.resources)}`);
  }

  const miners = status.miners ?? [];
  console.log(`Miners: ${miners.length}`);

  const actions = status.active_actions ?? status.activeActions ?? [];
  console.log(`Active actions: ${actions.length}`);

  if (actions.length > 0) {
    printActions(actions);
  }

  console.log('Next steps: claim discovered nodes, assign miners to their sites, then crush spare resources into gravel.');
}

export function printMiners(miners: Miner[]): void {
  if (miners.length === 0) {
    console.log('No miners yet. Build one with: pnpm cli build-miner');
    return;
  }

  for (const miner of miners) {
    const siteId = miner.site_id ?? miner.siteId ?? miner.assigned_site_id ?? miner.assignedSiteId ?? 'unassigned';
    const rate = minerRate(miner);
    const cost = miner.next_upgrade_cost ?? miner.nextUpgradeCost;
    const resourceHint = miner.resource ? ` | mining ${miner.resource}` : '';
    const upgradeHint = cost ? ` | next upgrade ${formatCost(cost)}` : '';
    const rateHint = typeof rate === 'number' ? ` | ${trimNumber(rate)}/s` : '';
    const energyHint = ` | energy ${miner.energy_requirement ?? miner.energyRequirement ?? 0}`;
    console.log(`${miner.id} | level ${miner.level ?? 1} | ${miner.status ?? 'ready'} | site ${siteId}${resourceHint}${rateHint}${energyHint}${upgradeHint}`);
  }
}

export function printSector(sector: Sector): void {
  console.log(`Sector: ${sector.name ?? sector.id ?? 'local space'}`);
  const nodes = nodesFor(sector);

  if (nodes.length === 0) {
    console.log('No discovered nodes yet. Scan nearby space with: pnpm cli scan');
    return;
  }

  printNodes(nodes);
  const sites = allSites(sector);
  if (sites.length > 0) {
    console.log('Sites:');
    printSites(sites);
  }
}

export function printNodes(nodes: Node[]): void {
  if (nodes.length === 0) {
    console.log('No discovered nodes yet. Scan nearby space with: pnpm cli scan');
    return;
  }

  for (const node of nodes) {
    const summary = nodeSiteSummary(node);
    const claimHint = isClaimed(node) ? `claimed by ${node.claimed_by}` : `unclaimed | claim cost ${formatCost(node.claim_cost)}`;
    const traitHint = node.trait ? ` | ${node.trait}` : '';
    const kindHint = node.kind ? ` | ${node.kind}` : '';
    console.log(
      `${node.id} | ${node.name ?? 'unnamed node'}${kindHint}${traitHint} | distance ${node.distance ?? 0} | (${node.x ?? 0},${node.y ?? 0}) | ${claimHint} | sites ${summary.total} (${summary.assigned} assigned)`,
    );
  }
}

export function printSites(sites: Site[]): void {
  for (const site of sites) {
    const resource = site.resource ?? site.kind ?? site.type ?? 'unknown resource';
    const rate = siteRate(site);
    const assignedMiner = assignedMinerID(site);
    const rateHint = typeof rate === 'number' ? ` | base ${trimNumber(rate)}/s` : '';
    const richnessHint = typeof site.richness === 'number' ? ` | richness ${site.richness}` : '';
    const assignmentHint = assignedMiner ? ` | miner ${assignedMiner}` : ' | unassigned';
    console.log(`${site.id} | ${site.name ?? 'unnamed site'} | ${resource}${rateHint}${richnessHint}${assignmentHint}`);
  }
}

export function printActions(actions: Action[]): void {
  for (const action of actions) {
    const resolvesAt = action.resolves_at ?? action.resolvesAt ?? 'unknown time';
    console.log(`${action.id} | ${action.type ?? 'action'} | ${action.status ?? 'unknown'} | resolves ${resolvesAt}`);
  }
}

export function printLeaderboard(leaderboard: Leaderboard): void {
  console.log(`Gravelboard | Season: ${leaderboard.season?.name ?? 'unknown season'}`);
  const entries = leaderboard.entries ?? [];

  if (entries.length === 0) {
    console.log('No codernauts on the board yet. Crush something!');
    return;
  }

  const rows = entries.map((entry) => [
    String(entry.rank ?? ''),
    entry.codernaut ?? entry.player_id ?? 'unknown',
    formatGravel(entry.gravel ?? 0),
    trimNumber(entry.gravel_per_hour ?? 0),
    entry.is_you ? '<- YOU' : '',
  ]);
  console.log(renderTable(['RANK', 'CODERNAUT', 'GRAVEL', 'GRAVEL/HR', ''], rows, new Set([0, 2, 3])));
}

export function printConversions(conversions: Conversions): void {
  const crusher = conversions.crusher;
  if (crusher) {
    const multiplier = crusher.yield_multiplier ?? 1;
    console.log(`Crusher: ${crusher.name ?? 'Crusher'} (level ${crusher.level ?? 1}, x${trimNumber(multiplier)} yield)`);
    if (crusher.next_upgrade) {
      console.log(`Next upgrade: ${crusher.next_upgrade.name ?? 'unknown'} for ${formatCost(crusher.next_upgrade.cost)}`);
    } else {
      console.log('Next upgrade: none, maximum gravelization achieved.');
    }
  }

  const rates = conversions.rates ?? [];
  if (rates.length === 0) {
    console.log('No conversion rates reported.');
    return;
  }

  const rows = rates.map((rate) => [
    rate.resource ?? 'unknown',
    trimNumber(rate.gravel_per_unit ?? 0),
    rate.unlocked ? 'unlocked' : `locked (needs crusher level ${rate.required_crusher_level ?? '?'})`,
  ]);
  console.log(renderTable(['RESOURCE', 'GRAVEL/UNIT', 'STATUS'], rows, new Set([1])));
}

export function printConversionResult(result: ConversionResult): void {
  console.log(
    `Crushed ${result.amount_converted ?? 0} ${result.resource ?? 'resource'} into ${formatGravel(result.gravel_earned ?? 0)} gravel ` +
      `(x${trimNumber(result.yield_multiplier ?? 1)} yield).`,
  );
  console.log(`Season gravel total: ${formatGravel(result.gravel_total ?? 0)}`);
  if (result.resources) {
    console.log(`Resources: ${formatResources(result.resources)}`);
  }
}

export function formatResources(resources: Resources): string {
  const parts: string[] = [];
  for (const name of resourceNames) {
    const value = resources[name];
    if (typeof value !== 'number') {
      continue;
    }
    parts.push(`${name} ${trimNumber(Math.floor(value))} (${trimNumber(resourceRate(resources, name))}/s)`);
  }

  const capacity = energyCapacity(resources);
  const used = energyUsed(resources);
  if (typeof capacity === 'number') {
    parts.push(`energy capacity ${used}/${capacity}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'no resource readings yet';
}

/** Renders an aligned ASCII table; rightAlign holds zero-based column indices. */
export function renderTable(headers: string[], rows: string[][], rightAlign: Set<number> = new Set()): string {
  const widths = headers.map((header, column) => Math.max(header.length, ...rows.map((row) => (row[column] ?? '').length)));
  const renderRow = (row: string[]): string =>
    row
      .map((cell, column) => (rightAlign.has(column) ? cell.padStart(widths[column]) : cell.padEnd(widths[column])))
      .join('  ')
      .trimEnd();
  return [renderRow(headers), ...rows.map(renderRow)].join('\n');
}

export function getSites(sector: Sector): Site[] {
  return allSites(sector);
}
