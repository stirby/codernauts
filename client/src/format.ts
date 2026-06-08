import type { Action, Miner, Resources, Sector, Site, Status } from './client.js';

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printStatus(status: Status): void {
  const pilot = status.player?.display_name ?? status.player?.displayName ?? status.player?.name ?? status.player?.id ?? 'Unknown pilot';
  console.log(`Pilot: ${pilot}`);

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

  console.log('Next steps: scan a sector, build a miner, then assign it to a discovered site within energy capacity.');
}

export function printMiners(miners: Miner[]): void {
  if (miners.length === 0) {
    console.log('No miners yet. Build one with: pnpm cli build-miner');
    return;
  }

  for (const miner of miners) {
    const siteId = miner.site_id ?? miner.siteId ?? miner.assigned_site_id ?? miner.assignedSiteId ?? 'unassigned';
    const rate = miner.ore_rate_per_second ?? miner.oreRatePerSecond;
    const cost = miner.next_upgrade_cost ?? miner.nextUpgradeCost;
    const upgradeHint = cost ? ` | next upgrade ${cost.ore ?? 0} ore` : '';
    const rateHint = typeof rate === 'number' ? ` | ${rate}/s` : '';
    const energyHint = ` | energy ${miner.energy_requirement ?? miner.energyRequirement ?? 0}`;
    console.log(`${miner.id} | level ${miner.level ?? 1} | ${miner.status ?? 'ready'} | site ${siteId}${rateHint}${energyHint}${upgradeHint}`);
  }
}

export function printSector(sector: Sector): void {
  console.log(`Sector: ${sector.name ?? sector.id ?? 'local space'}`);
  const sites = getSites(sector);

  if (sites.length === 0) {
    console.log('No discovered sites yet. Scan nearby space with: pnpm cli scan');
    return;
  }

  console.log('Discovered sites:');
  printSites(sites);
}

export function printSites(sites: Site[]): void {
  for (const site of sites) {
    const resource = site.resource ?? site.kind ?? site.type ?? 'unknown resource';
    const rate = site.base_ore_rate_per_second ?? site.baseOreRatePerSecond;
    const assignedMiner = site.assigned_miner_id ?? site.assignedMinerId;
    const rateHint = typeof rate === 'number' ? ` | base ore ${rate}/s` : '';
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

export function formatResources(resources: Resources): string {
  const parts: string[] = [];
  appendResource(parts, 'ore', resources.ore, resources.max_ore ?? resources.maxOre);
  const capacity = resources.energy_capacity ?? resources.energyCapacity ?? resources.max_energy ?? resources.maxEnergy;
  const used = resources.energy_used ?? resources.energyUsed ?? resources.energy;
  if (typeof used === 'number' && typeof capacity === 'number') {
    parts.push(`energy capacity ${used}/${capacity}`);
  }
  appendResource(parts, 'credits', resources.credits, undefined);

  const oreRate = resources.ore_rate_per_second ?? resources.oreRatePerSecond;
  if (typeof oreRate === 'number') {
    parts.push(`ore rate ${oreRate}/s`);
  }

  return parts.length > 0 ? parts.join(', ') : 'no resource readings yet';
}

export function getSites(sector: Sector): Site[] {
  return sector.sites ?? sector.discovered_sites ?? sector.discoveredSites ?? [];
}

function appendResource(parts: string[], label: string, value: unknown, max: unknown): void {
  if (typeof value !== 'number') {
    return;
  }

  if (typeof max === 'number') {
    parts.push(`${label} ${value}/${max}`);
    return;
  }

  parts.push(`${label} ${value}`);
}
