import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodernautsApiError, CodernautsClient } from '../client.js';
import type { Action, LogEntry, Miner, Resources, Sector, Site, Status, SuggestedAction } from '../client.js';
import {
  actionDirection,
  actionResolvesAt,
  activeActions,
  activeScan,
  assignedMinerID,
  assignedSiteID,
  availableSites,
  buildCost,
  canAfford,
  canAssignMiner,
  energyCapacity,
  energyUsed,
  formatCost,
  formatDateTime,
  formatRate,
  idleMiners,
  logEntries,
  maxOre,
  minerByID,
  minerEnergyRequirement,
  minerRate,
  ore,
  oreRate,
  resourcePercent,
  scanDirections,
  secondsUntil,
  siteByID,
  siteRate,
  sitesFor,
  statusActions,
  statusMiners,
  trimNumber,
  upgradeCost,
} from './game-model.js';

const configuredApiUrl = import.meta.env.VITE_CODERNAUTS_API_URL || '';
const defaultToken = import.meta.env.VITE_CODERNAUTS_API_TOKEN || 'dev-token';
const apiUrlStorageKey = 'codernauts.apiUrl';
const tokenStorageKey = 'codernauts.token';
const refreshMs = 3000;

interface ConnectionSettings {
  apiUrl: string;
  token: string;
}

interface ErrorState {
  title: string;
  detail?: string;
}

export function App() {
  const [settings, setSettings] = useState<ConnectionSettings>(() => loadSettings());
  const [draftApiUrl, setDraftApiUrl] = useState(settings.apiUrl);
  const [draftToken, setDraftToken] = useState(settings.token);
  const [status, setStatus] = useState<Status | undefined>();
  const [sector, setSector] = useState<Sector | undefined>();
  const [miners, setMiners] = useState<Miner[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<(typeof scanDirections)[number]>('north');
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState<ErrorState | undefined>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState<string | undefined>();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const requestSeq = useRef(0);

  const client = useMemo(() => new CodernautsClient(settings), [settings]);
  const snapshot = useMemo(
    () => ({ status: status ?? {}, sector: sector ?? {}, miners, actions, log }),
    [actions, log, miners, sector, status],
  );
  const sites = sitesFor(sector ?? status?.sector);
  const active = activeActions(snapshot);
  const scan = activeScan(snapshot);
  const resources = status?.resources;
  const suggested = status?.suggested_next_actions ?? status?.suggestedNextActions ?? [];

  const refresh = useCallback(
    async (mode: 'foreground' | 'background' = 'background') => {
      const seq = requestSeq.current + 1;
      requestSeq.current = seq;
      if (mode === 'foreground') {
        setLoading(true);
      }
      try {
        const nextStatus = await client.status();
        const [nextSector, nextMiners, nextActions, nextLog] = await Promise.all([
          Promise.resolve(nextStatus.sector ?? client.sector()),
          Promise.resolve(statusMiners(nextStatus).length > 0 ? statusMiners(nextStatus) : client.miners()),
          Promise.resolve(statusActions(nextStatus).length > 0 ? statusActions(nextStatus) : client.actions()),
          client.log(),
        ]);
        if (requestSeq.current !== seq) {
          return;
        }
        const parsedLog = logEntries(nextLog);
        setStatus(nextStatus);
        setSector(nextSector);
        setMiners(nextMiners);
        setActions(nextActions);
        setLog(parsedLog);
        setLastUpdatedAt(new Date());
        setError(undefined);
        setAssignSelections((current) => reconcileAssignSelections(current, nextMiners, sitesFor(nextSector)));
      } catch (caught) {
        if (requestSeq.current !== seq) {
          return;
        }
        setError(errorStateFrom(caught));
      } finally {
        if (requestSeq.current === seq) {
          setLoading(false);
        }
      }
    },
    [client],
  );

  useEffect(() => {
    void refresh('foreground');
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refresh('background');
    }, refreshMs);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refresh]);

  const runMutation = useCallback(
    async (label: string, mutation: () => Promise<unknown>) => {
      setMutating(label);
      setError(undefined);
      try {
        await mutation();
        await refresh('background');
      } catch (caught) {
        setError(errorStateFrom(caught));
      } finally {
        setMutating(undefined);
      }
    },
    [refresh],
  );

  const saveSettings = useCallback(() => {
    const next = {
      apiUrl: draftApiUrl.trim().replace(/\/+$/, ''),
      token: draftToken.trim(),
    };
    window.localStorage.setItem(apiUrlStorageKey, next.apiUrl);
    window.localStorage.setItem(tokenStorageKey, next.token);
    setSettings(next);
  }, [draftApiUrl, draftToken]);

  const startScan = useCallback(() => {
    const key = `scan-${selectedDirection}-${Date.now()}`;
    void runMutation('scan', () => client.scan(selectedDirection, key));
  }, [client, runMutation, selectedDirection]);

  const buildMiner = useCallback(() => {
    void runMutation('build', () => client.buildMiner());
  }, [client, runMutation]);

  const upgradeMiner = useCallback(
    (minerID: string) => {
      void runMutation(`upgrade-${minerID}`, () => client.upgradeMiner(minerID));
    },
    [client, runMutation],
  );

  const assignMiner = useCallback(
    (minerID: string) => {
      const selectedSite = assignSelections[minerID];
      if (!selectedSite) {
        setError({ title: 'Choose a site before assigning that miner.' });
        return;
      }
      void runMutation(`assign-${minerID}`, () => client.assignMiner(minerID, selectedSite));
    },
    [assignSelections, client, runMutation],
  );

  const fleetBuildCost = buildCost(miners);
  const canBuildMiner = canAfford(resources, fleetBuildCost);
  const hasAnySite = sites.length > 0;
  const sectorName = (sector ?? status?.sector)?.name ?? (sector ?? status?.sector)?.id ?? 'Local space';

  return (
    <main className="shell">
      <header className="hero panel">
        <div>
          <p className="eyebrow">Codernauts control deck</p>
          <h1>Vesta-41 automation console</h1>
          <p className="hero-copy">
            Build tiny tools, scan quiet space, and keep your miners working while the API hums along.
          </p>
        </div>
        <div className="hero-status" aria-live="polite">
          <span className={error ? 'status-light status-light-bad' : 'status-light status-light-good'} />
          <span>{error ? 'Needs attention' : loading ? 'Connecting' : 'Connected'}</span>
        </div>
      </header>

      <section className="panel connection-panel" aria-label="Connection settings">
        <label>
          <span>API URL</span>
          <input value={draftApiUrl} onChange={(event) => setDraftApiUrl(event.target.value)} spellCheck={false} />
        </label>
        <label>
          <span>Token</span>
          <input value={draftToken} onChange={(event) => setDraftToken(event.target.value)} spellCheck={false} type="password" />
        </label>
        <div className="connection-actions">
          <button type="button" onClick={saveSettings}>
            Save and reconnect
          </button>
          <button type="button" className="ghost" disabled={loading} onClick={() => void refresh('foreground')}>
            Refresh now
          </button>
          <label className="check-control">
            <input checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} type="checkbox" />
            <span>Auto refresh</span>
          </label>
        </div>
      </section>

      {error ? (
        <section className="error-card" role="alert">
          <strong>{error.title}</strong>
          {error.detail ? <span>{error.detail}</span> : null}
        </section>
      ) : null}

      <section className="top-grid">
        <ResourcePanel resources={resources} />
        <CaptainPanel lastUpdatedAt={lastUpdatedAt} status={status} suggested={suggested} />
        <ActionPanel
          active={active}
          disabled={Boolean(scan) || mutating === 'scan'}
          onDirectionChange={setSelectedDirection}
          onScan={startScan}
          selectedDirection={selectedDirection}
        />
      </section>

      <section className="main-grid">
        <SectorMap
          miners={miners}
          resources={resources}
          onAssign={assignMiner}
          onSelectSite={(minerID, siteID) => setAssignSelections((current) => ({ ...current, [minerID]: siteID }))}
          sectorName={sectorName}
          selectedSites={assignSelections}
          sites={sites}
        />
        <FleetPanel
          assignSelections={assignSelections}
          miners={miners}
          mutating={mutating}
          onAssign={assignMiner}
          onBuild={buildMiner}
          onSelectSite={(minerID, siteID) => setAssignSelections((current) => ({ ...current, [minerID]: siteID }))}
          onUpgrade={upgradeMiner}
          resources={resources}
          sites={sites}
          canBuildMiner={canBuildMiner}
          buildCost={fleetBuildCost}
        />
      </section>

      <section className="bottom-grid">
        <LogPanel entries={log} />
        <GuidePanel hasAnySite={hasAnySite} idleMiners={idleMiners(miners)} scan={scan} />
      </section>
    </main>
  );
}

function ResourcePanel({ resources }: { resources: Resources | undefined }) {
  const currentOre = ore(resources);
  const oreMax = maxOre(resources);
  const currentEnergy = energyUsed(resources);
  const energyMax = energyCapacity(resources);

  return (
    <section className="panel resource-panel" aria-label="Resources">
      <PanelTitle kicker="Hold" title="Resources" />
      <ResourceMeter label="Ore" max={oreMax} rate={oreRate(resources)} value={currentOre} />
      <ResourceMeter detail="used by assigned miners" label="Energy capacity" max={energyMax} value={currentEnergy} />
    </section>
  );
}

function ResourceMeter({ label, value, max, rate, detail }: { label: string; value: number; max?: number; rate?: number; detail?: string }) {
  return (
    <div className="resource-meter">
      <div className="resource-row">
        <span>{label}</span>
        <strong>
          {trimNumber(value)}
          {typeof max === 'number' ? ` / ${trimNumber(max)}` : ''}
        </strong>
      </div>
      <div className="meter-track" aria-label={`${label} meter`}>
        <span style={{ width: `${resourcePercent(value, max)}%` }} />
      </div>
      <small>{detail ?? formatRate(rate)}</small>
    </div>
  );
}

function CaptainPanel({ status, suggested, lastUpdatedAt }: { status: Status | undefined; suggested: SuggestedAction[]; lastUpdatedAt?: Date }) {
  const player = status?.player;
  const outpost = status?.outpost;
  const pilot = player?.display_name ?? player?.displayName ?? player?.name ?? player?.id ?? 'Unknown pilot';
  const outpostName = outpost?.name ?? outpost?.id ?? 'Local outpost';

  return (
    <section className="panel captain-panel" aria-label="Pilot status">
      <PanelTitle kicker="Pilot" title={String(pilot)} />
      <p className="big-stat">{outpostName}</p>
      <p className="muted">Last refresh: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : 'waiting for telemetry'}</p>
      <div className="suggestions">
        {suggested.length > 0 ? (
          suggested.slice(0, 3).map((item, index) => <Suggestion key={index} value={item} />)
        ) : (
          <span className="chip">Keep the miners busy.</span>
        )}
      </div>
    </section>
  );
}

function Suggestion({ value }: { value: SuggestedAction }) {
  if (value.message) {
    return <span className="chip">{value.message}</span>;
  }
  return <span className="chip">Explore the API for the next step.</span>;
}

function ActionPanel({
  active,
  disabled,
  selectedDirection,
  onDirectionChange,
  onScan,
}: {
  active: Action[];
  disabled: boolean;
  selectedDirection: (typeof scanDirections)[number];
  onDirectionChange: (direction: (typeof scanDirections)[number]) => void;
  onScan: () => void;
}) {
  return (
    <section className="panel action-panel" aria-label="Scans and actions">
      <PanelTitle kicker="Bridge" title="Scans" />
      <div className="scan-controls">
        <select value={selectedDirection} onChange={(event) => onDirectionChange(event.target.value as (typeof scanDirections)[number])}>
          {scanDirections.map((direction) => (
            <option key={direction} value={direction}>
              {direction}
            </option>
          ))}
        </select>
        <button disabled={disabled} onClick={onScan} type="button">
          Start scan
        </button>
      </div>
      {active.length > 0 ? (
        <div className="action-list">
          {active.map((action) => (
            <ActionCard action={action} key={action.id} />
          ))}
        </div>
      ) : (
        <p className="muted">No active actions. Start a scan to reveal another asteroid site.</p>
      )}
    </section>
  );
}

function ActionCard({ action }: { action: Action }) {
  const resolvesAt = actionResolvesAt(action);
  return (
    <article className="mini-card">
      <strong>{action.type ?? 'action'}</strong>
      <span>{actionDirection(action) ?? 'unknown direction'}</span>
      <span>{secondsUntil(resolvesAt)}s remaining</span>
    </article>
  );
}

function SectorMap({
  sites,
  miners,
  resources,
  sectorName,
  selectedSites,
  onSelectSite,
  onAssign,
}: {
  sites: Site[];
  miners: Miner[];
  resources: Resources | undefined;
  sectorName: string;
  selectedSites: Record<string, string>;
  onSelectSite: (minerID: string, siteID: string) => void;
  onAssign: (minerID: string) => void;
}) {
  const cells = mapCells(sites);
  return (
    <section className="panel sector-panel" aria-label="Sector map">
      <PanelTitle kicker="Map" title={sectorName} />
      <div className="map-grid" style={{ gridTemplateColumns: `repeat(${cells.columns}, minmax(110px, 1fr))` }}>
        {cells.cells.map((cell) =>
          cell.site ? (
            <SiteCard
              key={`${cell.x}:${cell.y}`}
              miners={miners}
              resources={resources}
              onAssign={onAssign}
              onSelectSite={onSelectSite}
              selectedSites={selectedSites}
              site={cell.site}
            />
          ) : (
            <div className="space-cell" key={`${cell.x}:${cell.y}`}>
              <span>Unexplored</span>
              <small>
                {cell.x}, {cell.y}
              </small>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function SiteCard({
  site,
  miners,
  resources,
  selectedSites,
  onSelectSite,
  onAssign,
}: {
  site: Site;
  miners: Miner[];
  resources: Resources | undefined;
  selectedSites: Record<string, string>;
  onSelectSite: (minerID: string, siteID: string) => void;
  onAssign: (minerID: string) => void;
}) {
  const assignedMiner = minerByID(miners, assignedMinerID(site));
  const idle = idleMiners(miners);
  const selectedMinerID = Object.entries(selectedSites).find(([minerID, siteID]) => siteID === site.id && Boolean(minerID))?.[0] ?? '';
  const selectedMiner = minerByID(idle, selectedMinerID);
  return (
    <article className={assignedMiner ? 'site-card site-card-active' : 'site-card'}>
      <div className="planet-mark" />
      <strong>{site.name ?? site.id}</strong>
      <span className="muted">{site.id}</span>
      <dl>
        <div>
          <dt>Position</dt>
          <dd>
            {site.x ?? 0}, {site.y ?? 0}
          </dd>
        </div>
        <div>
          <dt>Richness</dt>
          <dd>{site.richness ?? 0}</dd>
        </div>
        <div>
          <dt>Base ore</dt>
          <dd>{formatRate(siteRate(site))}</dd>
        </div>
        <div>
          <dt>Miner</dt>
          <dd>{assignedMiner?.name ?? assignedMiner?.id ?? 'unassigned'}</dd>
        </div>
      </dl>
      {!assignedMiner && idle.length > 0 ? (
        <label className="inline-select">
          <span>Assign idle miner</span>
          <select value={selectedMinerID} onChange={(event) => onSelectSite(event.target.value, site.id)}>
            <option value="">Choose miner</option>
            {idle.map((miner) => (
              <option key={miner.id} value={miner.id}>
                {miner.name ?? miner.id}
              </option>
            ))}
          </select>
          <button
            disabled={!selectedMiner || !canAssignMiner(resources, selectedMiner)}
            onClick={() => onAssign(selectedMinerID)}
            title={selectedMiner && !canAssignMiner(resources, selectedMiner) ? 'Need more energy capacity.' : undefined}
            type="button"
          >
            Assign here
          </button>
        </label>
      ) : null}
    </article>
  );
}

function FleetPanel({
  miners,
  sites,
  resources,
  assignSelections,
  mutating,
  canBuildMiner,
  buildCost: minerBuildCost,
  onBuild,
  onUpgrade,
  onAssign,
  onSelectSite,
}: {
  miners: Miner[];
  sites: Site[];
  resources: Resources | undefined;
  assignSelections: Record<string, string>;
  mutating?: string;
  canBuildMiner: boolean;
  buildCost?: { ore?: number };
  onBuild: () => void;
  onUpgrade: (minerID: string) => void;
  onAssign: (minerID: string) => void;
  onSelectSite: (minerID: string, siteID: string) => void;
}) {
  return (
    <section className="panel fleet-panel" aria-label="Miner fleet">
      <div className="panel-heading-row">
        <PanelTitle kicker="Fleet" title="Miners" />
        <button disabled={!canBuildMiner || mutating === 'build'} onClick={onBuild} title={canBuildMiner ? undefined : 'Need more ore.'} type="button">
          Build miner
        </button>
      </div>
      <p className="muted">Build cost: {formatCost(minerBuildCost)}</p>
      <div className="miner-list">
        {miners.map((miner) => (
          <MinerCard
            assignSelection={assignSelections[miner.id] ?? assignedSiteID(miner) ?? ''}
            key={miner.id}
            miner={miner}
            mutating={mutating}
            onAssign={onAssign}
            onSelectSite={onSelectSite}
            onUpgrade={onUpgrade}
            resources={resources}
            sites={sites}
          />
        ))}
      </div>
    </section>
  );
}

function MinerCard({
  miner,
  sites,
  resources,
  assignSelection,
  mutating,
  onUpgrade,
  onAssign,
  onSelectSite,
}: {
  miner: Miner;
  sites: Site[];
  resources: Resources | undefined;
  assignSelection: string;
  mutating?: string;
  onUpgrade: (minerID: string) => void;
  onAssign: (minerID: string) => void;
  onSelectSite: (minerID: string, siteID: string) => void;
}) {
  const currentSite = siteByID(sites, assignedSiteID(miner));
  const targetSites = availableSites(sites, miner.id);
  const cost = upgradeCost(miner);
  const canUpgrade = canAfford(resources, cost);
  const assigning = mutating === `assign-${miner.id}`;
  const upgrading = mutating === `upgrade-${miner.id}`;

  return (
    <article className="miner-card">
      <div className="miner-avatar" />
      <div>
        <h3>{miner.name ?? miner.id}</h3>
        <p className="muted">{miner.id}</p>
      </div>
      <dl>
        <div>
          <dt>Level</dt>
          <dd>{miner.level ?? 1}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{miner.status ?? 'ready'}</dd>
        </div>
        <div>
          <dt>Ore rate</dt>
          <dd>{formatRate(minerRate(miner))}</dd>
        </div>
        <div>
          <dt>Energy required</dt>
          <dd>{minerEnergyRequirement(miner)}</dd>
        </div>
        <div>
          <dt>Assigned</dt>
          <dd>{currentSite?.name ?? assignedSiteID(miner) ?? 'none'}</dd>
        </div>
      </dl>
      <div className="miner-actions">
        <button disabled={!canUpgrade || upgrading} onClick={() => onUpgrade(miner.id)} title={canUpgrade ? undefined : 'Need more ore.'} type="button">
          Upgrade
        </button>
        <span className="muted">{formatCost(cost)}</span>
      </div>
      <div className="assign-row">
        <select value={assignSelection} onChange={(event) => onSelectSite(miner.id, event.target.value)}>
          <option value="">Choose site</option>
          {targetSites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name ?? site.id}
            </option>
          ))}
        </select>
        <button
          disabled={!assignSelection || assigning || !canAssignMiner(resources, miner)}
          onClick={() => onAssign(miner.id)}
          title={canAssignMiner(resources, miner) ? undefined : 'Need more energy capacity.'}
          type="button"
        >
          Assign
        </button>
      </div>
    </article>
  );
}

function LogPanel({ entries }: { entries: LogEntry[] }) {
  return (
    <section className="panel log-panel" aria-label="Activity log">
      <PanelTitle kicker="Captain's log" title="Recent activity" />
      {entries.length > 0 ? (
        <ol>
          {entries
            .slice()
            .reverse()
            .slice(0, 8)
            .map((entry) => (
              <li key={entry.id}>
                <span>{formatDateTime(entry.created_at ?? entry.createdAt)}</span>
                <strong>{entry.message ?? entry.id}</strong>
              </li>
            ))}
        </ol>
      ) : (
        <p className="muted">No log entries yet.</p>
      )}
    </section>
  );
}

function GuidePanel({ hasAnySite, idleMiners: idle, scan }: { hasAnySite: boolean; idleMiners: Miner[]; scan?: Action }) {
  return (
    <section className="panel guide-panel" aria-label="Beginner guide">
      <PanelTitle kicker="Flight manual" title="What to try next" />
      <ul>
        {!hasAnySite ? <li>Start a scan and wait for a discovered asteroid site.</li> : null}
        {scan ? <li>Let the active scan finish. The map updates automatically.</li> : null}
        {idle.length > 0 ? <li>Assign idle miners to unclaimed asteroid sites.</li> : null}
        <li>Open the CLI or source files to see how this GUI calls the same API.</li>
      </ul>
    </section>
  );
}

function PanelTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="panel-title">
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
    </div>
  );
}

function mapCells(sites: Site[]): { columns: number; cells: Array<{ x: number; y: number; site?: Site }> } {
  const coordinates = sites.map((site) => ({ x: typeof site.x === 'number' ? site.x : 0, y: typeof site.y === 'number' ? site.y : 0 }));
  coordinates.push({ x: 0, y: 0 });
  const minX = Math.min(...coordinates.map((point) => point.x), -1);
  const maxX = Math.max(...coordinates.map((point) => point.x), 1);
  const minY = Math.min(...coordinates.map((point) => point.y), -1);
  const maxY = Math.max(...coordinates.map((point) => point.y), 1);
  const byCoordinate = new Map<string, Site>();
  for (const site of sites) {
    const x = typeof site.x === 'number' ? site.x : 0;
    const y = typeof site.y === 'number' ? site.y : 0;
    byCoordinate.set(`${x}:${y}`, site);
  }

  const cells: Array<{ x: number; y: number; site?: Site }> = [];
  for (let y = maxY; y >= minY; y -= 1) {
    for (let x = minX; x <= maxX; x += 1) {
      cells.push({ x, y, site: byCoordinate.get(`${x}:${y}`) });
    }
  }

  return { columns: maxX - minX + 1, cells };
}

function reconcileAssignSelections(current: Record<string, string>, nextMiners: Miner[], sites: Site[]): Record<string, string> {
  const next: Record<string, string> = {};
  const siteIDs = new Set(sites.map((site) => site.id));
  for (const miner of nextMiners) {
    const selected = current[miner.id] ?? assignedSiteID(miner) ?? '';
    if (selected && siteIDs.has(selected)) {
      next[miner.id] = selected;
    }
  }
  return next;
}

function loadSettings(): ConnectionSettings {
  const defaultApiUrl = defaultBrowserApiUrl();
  const storedApiUrl = window.localStorage.getItem(apiUrlStorageKey);
  return {
    apiUrl: shouldIgnoreStoredApiUrl(storedApiUrl) ? defaultApiUrl : storedApiUrl || defaultApiUrl,
    token: window.localStorage.getItem(tokenStorageKey) || defaultToken,
  };
}

function defaultBrowserApiUrl(): string {
  if (configuredApiUrl) {
    return configuredApiUrl;
  }
  return browserIsOnLoopback() ? 'http://localhost:8080' : '/api';
}

function shouldIgnoreStoredApiUrl(value: string | null): boolean {
  if (!value || browserIsOnLoopback()) {
    return false;
  }
  try {
    const url = new URL(value, window.location.origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0' || url.hostname === '[::1]';
  } catch {
    return false;
  }
}

function browserIsOnLoopback(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
}

function errorStateFrom(caught: unknown): ErrorState {
  if (caught instanceof CodernautsApiError) {
    return {
      title: caught.message,
      detail: apiErrorDetail(caught.body),
    };
  }
  if (caught instanceof Error) {
    return { title: caught.message };
  }
  return { title: 'Something went wrong while talking to the API.' };
}

function apiErrorDetail(body: unknown): string | undefined {
  if (!isRecord(body) || !isRecord(body.error)) {
    return undefined;
  }
  const parts: string[] = [];
  if (typeof body.error.code === 'string') {
    parts.push(`Code: ${body.error.code}`);
  }
  if (isRecord(body.error.details)) {
    for (const [key, value] of Object.entries(body.error.details)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        parts.push(`${key}: ${value}`);
      }
    }
  }
  return parts.join('. ') || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
