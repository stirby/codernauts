import { fileURLToPath } from 'node:url';
import { CodernautsApiError, CodernautsClient } from './client.js';
import { loadConfig } from './config.js';
import { chooseNextAction } from './bot-helpers.js';
import { printJson } from './format.js';

export interface BotRunnerOptions {
  client?: CodernautsClient;
}

export async function runBot(options: BotRunnerOptions = {}): Promise<void> {
  const client = options.client ?? new CodernautsClient(loadConfig());

  const [status, miners, sector] = await Promise.all([client.status(), client.miners(), client.sector()]);
  const decision = chooseNextAction({ status, miners, sector });

  console.log(`Bot decision: ${decision.kind}`);
  console.log(`Reason: ${decision.reason}`);

  switch (decision.kind) {
    case 'assign-miner':
      printJson(await client.assignMiner(decision.minerId, decision.siteId));
      return;
    case 'build-miner':
      printJson(await client.buildMiner());
      return;
    case 'upgrade-miner':
      printJson(await client.upgradeMiner(decision.minerId));
      return;
    case 'scan':
      printJson(await client.scan('north', `bot-scan-${Date.now()}`));
      return;
    case 'wait':
      console.log('No API write was needed this turn.');
      return;
  }
}

if (isDirectRun()) {
  runBot().catch((error: unknown) => {
    if (error instanceof CodernautsApiError) {
      console.error(`API error ${error.status}: ${error.message}`);
      printJson(error.body);
      process.exit(1);
    }

    console.error(error);
    process.exit(1);
  });
}

function isDirectRun(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}
