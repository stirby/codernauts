import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodernautsApiError, CodernautsClient } from '../client.js';
import type { Action, Conversions, Leaderboard, LogEntry, Miner, Sector, Status } from '../client.js';
import {
  activeActions,
  activeScan,
  allSites,
  assignedSiteID,
  buildCost,
  canAfford,
  clockSkewMs,
  idleMiners,
  isClaimed,
  logEntries,
  nodesFor,
  scanDirections,
  statusActions,
  statusMiners,
} from './game-model.js';
import { CaptainPanel } from './components/CaptainPanel.js';
import { CrusherPanel } from './components/CrusherPanel.js';
import { FleetPanel } from './components/FleetPanel.js';
import { Gravelboard } from './components/Gravelboard.js';
import { GuidePanel } from './components/GuidePanel.js';
import { LogPanel } from './components/LogPanel.js';
import { ResourcePanel } from './components/ResourcePanel.js';
import { ScanPanel } from './components/ScanPanel.js';
import { SectorMap } from './components/SectorMap.js';

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
  const [leaderboard, setLeaderboard] = useState<Leaderboard | undefined>();
  const [conversions, setConversions] = useState<Conversions | undefined>();
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
  const currentSector = sector ?? status?.sector;
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
        const [nextSector, nextMiners, nextActions, nextLog, nextLeaderboard, nextConversions] = await Promise.all([
          Promise.resolve(nextStatus.sector ?? client.sector()),
          Promise.resolve(statusMiners(nextStatus).length > 0 ? statusMiners(nextStatus) : client.miners()),
          Promise.resolve(statusActions(nextStatus).length > 0 ? statusActions(nextStatus) : client.actions()),
          client.log(),
          client.leaderboard().catch(() => undefined),
          client.conversions().catch(() => undefined),
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
        setLeaderboard(nextLeaderboard);
        setConversions(nextConversions);
        setLastUpdatedAt(new Date());
        setError(undefined);
        setAssignSelections((current) => reconcileAssignSelections(current, nextMiners, nextSector));
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

  const claimNode = useCallback(
    (nodeID: string) => {
      const key = `claim-${nodeID}-${Date.now()}`;
      void runMutation(`claim-${nodeID}`, () => client.claimNode(nodeID, key));
    },
    [client, runMutation],
  );

  const convertResource = useCallback(
    (resource: string) => {
      const key = `convert-${resource}-${Date.now()}`;
      void runMutation(`convert-${resource}`, () => client.convert(resource, undefined, key));
    },
    [client, runMutation],
  );

  const upgradeCrusher = useCallback(() => {
    void runMutation('upgrade-crusher', () => client.upgradeCrusher());
  }, [client, runMutation]);

  const fleetBuildCost = buildCost(miners);
  const canBuildMiner = canAfford(resources, fleetBuildCost);
  const hasUnclaimedNode = nodesFor(currentSector).some((node) => !isClaimed(node));
  const sectorName = currentSector?.name ?? currentSector?.id ?? 'Local space';

  return (
    <main className="shell">
      <header className="hero panel">
        <div>
          <p className="eyebrow">Codernauts control deck</p>
          <h1>Vesta-41 gravel works</h1>
          <p className="hero-copy">
            Mine quiet space, crush everything into gravel, and climb the season gravelboard while the API hums along.
          </p>
        </div>
        <div className="hero-status" aria-live="polite">
          <span className={error ? 'status-light status-light-bad' : 'status-light status-light-good'} />
          <span>{error ? 'Needs attention' : loading ? 'Connecting' : 'Connected'}</span>
        </div>
      </header>

      <form
        className="panel connection-panel"
        aria-label="Connection settings"
        onSubmit={(event) => {
          event.preventDefault();
          saveSettings();
        }}
      >
        <label htmlFor="connection-api-url">
          <span>API URL</span>
          <input
            id="connection-api-url"
            name="apiUrl"
            value={draftApiUrl}
            onChange={(event) => setDraftApiUrl(event.target.value)}
            spellCheck={false}
          />
        </label>
        <label htmlFor="connection-token">
          <span>Token</span>
          <input
            id="connection-token"
            name="token"
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            spellCheck={false}
            type="password"
            autoComplete="current-password"
          />
        </label>
        <div className="connection-actions">
          <button type="submit">
            Save and reconnect
          </button>
          <button type="button" className="ghost" disabled={loading} onClick={() => void refresh('foreground')}>
            Refresh now
          </button>
          <label className="check-control" htmlFor="connection-auto-refresh">
            <input
              id="connection-auto-refresh"
              name="autoRefresh"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              type="checkbox"
            />
            <span>Auto refresh</span>
          </label>
        </div>
      </form>

      {error ? (
        <section className="error-card" role="alert">
          <strong>{error.title}</strong>
          {error.detail ? <span>{error.detail}</span> : null}
        </section>
      ) : null}

      <section className="board-grid">
        <Gravelboard leaderboard={leaderboard} status={status} />
        <CaptainPanel lastUpdatedAt={lastUpdatedAt} status={status} suggested={suggested} />
      </section>

      <section className="top-grid">
        <ResourcePanel resources={resources} />
        <CrusherPanel
          crusher={conversions?.crusher ?? status?.crusher}
          mutating={mutating}
          onConvert={convertResource}
          onUpgrade={upgradeCrusher}
          rates={conversions?.rates ?? []}
          resources={resources}
        />
        <ScanPanel
          active={active}
          clockSkewMs={clockSkewMs(status)}
          disabled={Boolean(scan) || mutating === 'scan'}
          onDirectionChange={setSelectedDirection}
          onScan={startScan}
          selectedDirection={selectedDirection}
        />
      </section>

      <section className="main-grid">
        <SectorMap
          mutating={mutating}
          onClaim={claimNode}
          resources={resources}
          sector={currentSector}
          sectorName={sectorName}
          status={status}
        />
        <FleetPanel
          assignSelections={assignSelections}
          buildCost={fleetBuildCost}
          canBuildMiner={canBuildMiner}
          miners={miners}
          mutating={mutating}
          onAssign={assignMiner}
          onBuild={buildMiner}
          onSelectSite={(minerID, siteID) => setAssignSelections((current) => ({ ...current, [minerID]: siteID }))}
          onUpgrade={upgradeMiner}
          resources={resources}
          sector={currentSector}
        />
      </section>

      <section className="bottom-grid">
        <LogPanel entries={log} />
        <GuidePanel hasUnclaimedNode={hasUnclaimedNode} idleMiners={idleMiners(miners)} scan={scan} />
      </section>
    </main>
  );
}

function reconcileAssignSelections(current: Record<string, string>, nextMiners: Miner[], nextSector: Sector | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  const siteIDs = new Set(allSites(nextSector).map((site) => site.id));
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
