import { asList, resourceNames } from '../client.js';
import type {
  Action,
  Cost,
  Crusher,
  Leaderboard,
  LeaderboardEntry,
  LogEntry,
  Miner,
  Node,
  Resources,
  Sector,
  Site,
  Status,
} from '../client.js';

export const scanDirections = ['north', 'east', 'south', 'west'] as const;

export type ScanDirection = (typeof scanDirections)[number];

export interface GameSnapshot {
  status: Status;
  sector: Sector;
  miners: Miner[];
  actions: Action[];
  log: LogEntry[];
}

/**
 * Returns the sector's nodes. Legacy sectors expose a flat sites array
 * instead of nodes; those sites are grouped by coordinate into synthetic
 * claimed nodes so older servers still render and stay assignable.
 */
export function nodesFor(sector: Sector | undefined): Node[] {
  const nodes = sector?.nodes;
  if (Array.isArray(nodes)) {
    return nodes;
  }

  const legacySites = sector?.sites ?? sector?.discovered_sites ?? sector?.discoveredSites ?? [];
  const byCoordinate = new Map<string, Node>();
  for (const site of legacySites) {
    const x = typeof site.x === 'number' ? site.x : 0;
    const y = typeof site.y === 'number' ? site.y : 0;
    const key = `${x}:${y}`;
    const existing = byCoordinate.get(key);
    if (existing) {
      existing.sites = [...(existing.sites ?? []), site];
      continue;
    }
    byCoordinate.set(key, {
      id: `legacy_node_${x}_${y}`,
      name: site.name ?? site.id,
      x,
      y,
      claimed_by: 'legacy',
      sites: [site],
    });
  }
  return [...byCoordinate.values()];
}

/** Flattens every site across all discovered nodes. */
export function allSites(sector: Sector | undefined): Site[] {
  return nodesFor(sector).flatMap((node) => node.sites ?? []);
}

/** Sites that miners are allowed to work: only sites on claimed nodes. */
export function sitesOnClaimedNodes(sector: Sector | undefined): Site[] {
  return nodesFor(sector)
    .filter(isClaimed)
    .flatMap((node) => node.sites ?? []);
}

export function nodeByID(nodes: Node[], id: string | undefined): Node | undefined {
  if (!id) {
    return undefined;
  }
  return nodes.find((node) => node.id === id);
}

export function isClaimed(node: Node): boolean {
  return Boolean(node.claimed_by);
}

/** True when the node is unclaimed and its claim cost is affordable right now. */
export function claimable(node: Node, resources: Resources | undefined): boolean {
  return !isClaimed(node) && canAfford(resources, node.claim_cost);
}

export interface CodernautLocation {
  x: number;
  y: number;
  nodeId?: string;
  nodeName?: string;
}

/** Where the codernaut stands. Falls back to the home origin (0,0). */
export function codernautLocation(status: Status | undefined): CodernautLocation {
  const location = status?.player?.location;
  return {
    x: typeof location?.x === 'number' ? location.x : 0,
    y: typeof location?.y === 'number' ? location.y : 0,
    nodeId: location?.node_id,
    nodeName: location?.node_name,
  };
}

export function gravelTotal(status: Status | undefined): number {
  return status?.gravel?.total ?? 0;
}

export function gravelPerHour(status: Status | undefined): number {
  return status?.gravel?.per_hour ?? 0;
}

export function seasonName(status: Status | undefined): string {
  return status?.gravel?.season?.name ?? 'Season underway';
}

export function unlockedResources(crusher: Crusher | undefined): string[] {
  return crusher?.unlocked_resources ?? [];
}

export function isResourceUnlocked(crusher: Crusher | undefined, resource: string): boolean {
  return unlockedResources(crusher).includes(resource);
}

/** True when a next crusher level exists and its cost is covered. */
export function canUpgradeCrusher(crusher: Crusher | undefined, resources: Resources | undefined): boolean {
  const next = crusher?.next_upgrade;
  if (!next) {
    return false;
  }
  return canAfford(resources, next.cost);
}

/**
 * Gravel earned by crushing an amount of one resource:
 * floor(amount * gravel_per_unit * yield_multiplier), matching the server.
 */
export function conversionPreview(amount: number, gravelPerUnit: number, yieldMultiplier: number): number {
  return Math.floor(amount * gravelPerUnit * yieldMultiplier);
}

export function resourceAmount(resources: Resources | undefined, name: string): number {
  const value = resources?.[name];
  return typeof value === 'number' ? value : 0;
}

/** Per-second generation rate for one resource, with the legacy ore alias. */
export function resourceRate(resources: Resources | undefined, name: string): number {
  const value = resources?.rates_per_second?.[name];
  if (typeof value === 'number') {
    return value;
  }
  if (name === 'ore') {
    const legacy = resources?.ore_rate_per_second ?? resources?.oreRatePerSecond;
    if (typeof legacy === 'number') {
      return legacy;
    }
  }
  return 0;
}

/** Multi-resource affordability check across ore, ice, gas, and crystal. */
export function canAfford(resources: Resources | undefined, cost: Cost | undefined): boolean {
  if (!cost) {
    return false;
  }
  return resourceNames.every((name) => resourceAmount(resources, name) >= (cost[name] ?? 0));
}

/** Leaderboard rows sorted by gravel descending, defensively re-sorted. */
export function leaderboardEntries(leaderboard: Leaderboard | undefined): LeaderboardEntry[] {
  const entries = leaderboard?.entries ?? [];
  return [...entries].sort((a, b) => (b.gravel ?? 0) - (a.gravel ?? 0));
}

export function isYou(entry: LeaderboardEntry): boolean {
  return entry.is_you === true;
}

export type MapCellState = 'home' | 'claimed' | 'discovered-unclaimed' | 'empty';

export interface MapCell {
  x: number;
  y: number;
  state: MapCellState;
  node?: Node;
}

export interface MapModel {
  columns: number;
  cells: MapCell[];
}

/**
 * Groups nodes into a bounded grid around the discovered extent. North is
 * negative y, so rows render top-down from the smallest y. The codernaut's
 * location marks its cell as home.
 */
export function mapModel(nodes: Node[], location: CodernautLocation): MapModel {
  const coordinates = nodes.map((node) => ({ x: node.x ?? 0, y: node.y ?? 0 }));
  coordinates.push({ x: location.x, y: location.y });
  const minX = Math.min(...coordinates.map((point) => point.x), -1);
  const maxX = Math.max(...coordinates.map((point) => point.x), 1);
  const minY = Math.min(...coordinates.map((point) => point.y), -1);
  const maxY = Math.max(...coordinates.map((point) => point.y), 1);

  const byCoordinate = new Map<string, Node>();
  for (const node of nodes) {
    byCoordinate.set(`${node.x ?? 0}:${node.y ?? 0}`, node);
  }

  const cells: MapCell[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const node = byCoordinate.get(`${x}:${y}`);
      cells.push({ x, y, node, state: cellState(node, location, x, y) });
    }
  }

  return { columns: maxX - minX + 1, cells };
}

function cellState(node: Node | undefined, location: CodernautLocation, x: number, y: number): MapCellState {
  if (!node) {
    return 'empty';
  }
  const here = node.id === location.nodeId || (x === location.x && y === location.y);
  if (here) {
    return 'home';
  }
  return isClaimed(node) ? 'claimed' : 'discovered-unclaimed';
}

export interface NodeSiteSummary {
  total: number;
  assigned: number;
  byResource: Record<string, number>;
}

/** Counts a node's sites by resource plus how many already have a miner. */
export function nodeSiteSummary(node: Node): NodeSiteSummary {
  const sites = node.sites ?? [];
  const byResource: Record<string, number> = {};
  let assigned = 0;
  for (const site of sites) {
    const resource = site.resource ?? 'unknown';
    byResource[resource] = (byResource[resource] ?? 0) + 1;
    if (assignedMinerID(site)) {
      assigned += 1;
    }
  }
  return { total: sites.length, assigned, byResource };
}

/**
 * Sites a miner could be sent to: on claimed nodes, not depleted, and either
 * unassigned or already worked by the given miner.
 */
export function openSites(sector: Sector | undefined, minerID?: string): Site[] {
  return sitesOnClaimedNodes(sector).filter((site) => {
    const assigned = assignedMinerID(site);
    return !site.depleted && (!assigned || assigned === minerID);
  });
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
  return miner.rate_per_second ?? miner.ore_rate_per_second ?? miner.oreRatePerSecond;
}

export function siteRate(site: Site): number | undefined {
  return site.base_rate_per_second ?? site.base_ore_rate_per_second ?? site.baseOreRatePerSecond;
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

/**
 * Renders a multi-resource cost like "300 ore, 100 ice". Undefined means no
 * further level exists; an all-zero cost renders as free.
 */
export function formatCost(cost: Cost | undefined): string {
  if (!cost) {
    return 'max level';
  }
  const parts = resourceNames
    .filter((name) => (cost[name] ?? 0) > 0)
    .map((name) => `${cost[name]} ${name}`);
  return parts.length > 0 ? parts.join(', ') : 'free';
}

/** Whole gravel with thousands separators, for example 1,234,567. */
export function formatGravel(value: number): string {
  return Math.floor(value).toLocaleString('en-US');
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
