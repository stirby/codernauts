import 'dotenv/config';

export const defaultApiUrl = 'http://localhost:8080';
export const defaultToken = 'dev-token';

export interface ClientConfig {
  apiUrl: string;
  token: string;
}

/**
 * Reads the API settings from the environment and falls back to local defaults.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ClientConfig {
  return {
    apiUrl: env.CODERNAUTS_API_URL ?? defaultApiUrl,
    token: env.CODERNAUTS_API_TOKEN ?? env.CODERNAUTS_TOKEN ?? defaultToken,
  };
}
