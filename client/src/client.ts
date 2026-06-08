export type JsonObject = Record<string, unknown>;

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface Player {
  id?: string;
  display_name?: string;
  displayName?: string;
  name?: string;
  [key: string]: unknown;
}

export interface Outpost {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface Resources {
  ore?: number;
  energy?: number;
  credits?: number;
  max_ore?: number;
  maxOre?: number;
  max_energy?: number;
  maxEnergy?: number;
  energy_capacity?: number;
  energyCapacity?: number;
  energy_used?: number;
  energyUsed?: number;
  energy_available?: number;
  energyAvailable?: number;
  ore_rate_per_second?: number;
  oreRatePerSecond?: number;
  [key: string]: unknown;
}

export interface Site {
  id: string;
  name?: string;
  kind?: string;
  type?: string;
  resource?: string;
  x?: number;
  y?: number;
  richness?: number;
  assigned_miner_id?: string;
  assignedMinerId?: string;
  base_ore_rate_per_second?: number;
  baseOreRatePerSecond?: number;
  discovered?: boolean;
  depleted?: boolean;
  [key: string]: unknown;
}

export interface Sector {
  id?: string;
  name?: string;
  sites?: Site[];
  discovered_sites?: Site[];
  discoveredSites?: Site[];
  [key: string]: unknown;
}

export interface Miner {
  id: string;
  name?: string;
  level?: number;
  status?: string;
  site_id?: string | null;
  siteId?: string | null;
  assigned_site_id?: string | null;
  assignedSiteId?: string | null;
  assigned_site_name?: string | null;
  assignedSiteName?: string | null;
  ore_rate_per_second?: number;
  oreRatePerSecond?: number;
  energy_requirement?: number;
  energyRequirement?: number;
  build_cost?: Cost;
  buildCost?: Cost;
  next_upgrade_cost?: Cost;
  nextUpgradeCost?: Cost;
  [key: string]: unknown;
}

export interface Cost {
  ore?: number;
  energy?: number;
  [key: string]: unknown;
}

export interface Action {
  id: string;
  type?: string;
  status?: string;
  resolves_at?: string;
  resolvesAt?: string;
  request?: Record<string, string>;
  [key: string]: unknown;
}

export interface LogEntry {
  id: string;
  created_at?: string;
  createdAt?: string;
  message?: string;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SuggestedAction {
  key?: string;
  message?: string;
  [key: string]: unknown;
}

export interface Status {
  player?: Player;
  outpost?: Outpost;
  resources?: Resources;
  miners?: Miner[];
  sector?: Sector;
  active_actions?: Action[];
  activeActions?: Action[];
  suggested_next_actions?: SuggestedAction[];
  suggestedNextActions?: SuggestedAction[];
  [key: string]: unknown;
}

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

export interface CodernautsClientOptions {
  apiUrl: string;
  token: string;
  fetch?: typeof fetch;
}

export class CodernautsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'CodernautsApiError';
  }
}

/**
 * Small reusable wrapper around the Codernauts REST API.
 */
export class CodernautsClient {
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly fetcher: typeof fetch;

  constructor(options: CodernautsClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.fetcher = options.fetch ?? ((input, init) => fetch(input, init));
  }

  get baseUrl(): string {
    return this.apiUrl;
  }

  async health(): Promise<unknown> {
    return this.request('GET', '/v1/health');
  }

  async me(): Promise<unknown> {
    return this.request('GET', '/v1/me');
  }

  async status(): Promise<Status> {
    return this.request<Status>('GET', '/v1/status');
  }

  async sector(): Promise<Sector> {
    return this.request<Sector>('GET', '/v1/sector');
  }

  async miners(): Promise<Miner[]> {
    const response = await this.request<unknown>('GET', '/v1/miners');
    return asList<Miner>(response, 'miners');
  }

  async buildMiner(): Promise<Miner> {
    return this.request<Miner>('POST', '/v1/miners');
  }

  async upgradeMiner(minerId: string): Promise<Miner> {
    return this.request<Miner>('POST', `/v1/miners/${encodeURIComponent(minerId)}/upgrade`);
  }

  async assignMiner(minerId: string, siteId: string): Promise<Miner> {
    return this.request<Miner>('POST', `/v1/miners/${encodeURIComponent(minerId)}/assign`, {
      body: { siteId },
    });
  }

  async actions(): Promise<Action[]> {
    const response = await this.request<unknown>('GET', '/v1/actions');
    return asList<Action>(response, 'actions');
  }

  async action(actionId: string): Promise<Action> {
    return this.request<Action>('GET', `/v1/actions/${encodeURIComponent(actionId)}`);
  }

  async scan(direction = 'north', idempotencyKey?: string): Promise<Action> {
    return this.request<Action>('POST', '/v1/actions/scan', {
      body: { direction },
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
  }

  async log(): Promise<{ log?: LogEntry[] } | LogEntry[]> {
    return this.request<{ log?: LogEntry[] } | LogEntry[]>('GET', '/v1/log');
  }

  async raw(method: string, path: string, body?: unknown): Promise<unknown> {
    return this.request(method.toUpperCase(), path, { body });
  }

  async request<T = unknown>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...options.headers,
    };

    const init: RequestInit = {
      method,
      headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetcher(this.urlFor(path), init);
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      throw new CodernautsApiError(apiErrorMessage(response.status, responseBody), response.status, responseBody);
    }

    return responseBody as T;
  }

  private urlFor(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${this.apiUrl}/${path.replace(/^\/+/, '')}`;
  }
}

export function asList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (isRecord(value) && Array.isArray(value[key])) {
    return value[key] as T[];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function apiErrorMessage(status: number, body: unknown): string {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') {
    return body.error.message;
  }

  return `Codernauts API request failed with status ${status}`;
}
