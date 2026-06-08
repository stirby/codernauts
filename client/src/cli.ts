#!/usr/bin/env node
import { Command } from 'commander';
import { CodernautsApiError, CodernautsClient } from './client.js';
import { loadConfig } from './config.js';
import { runBot } from './bot.js';
import { printActions, printJson, printMiners, printSector, printStatus } from './format.js';

const config = loadConfig();
let client = new CodernautsClient(config);
const program = new Command();

program
  .name('codernauts')
  .description('Beginner-friendly CLI for the Codernauts space automation API')
  .version('0.1.0')
  .option('--api-url <url>', 'API server URL', config.apiUrl)
  .option('--token <token>', 'bearer auth token', config.token)
  .hook('preAction', (command) => {
    const options = command.optsWithGlobals<{ apiUrl: string; token: string }>();
    client = new CodernautsClient({ apiUrl: options.apiUrl, token: options.token });
  });

program
  .command('status')
  .description('Show pilot, resources, miners, and active actions')
  .action(async () => {
    printStatus(await client.status());
  });

program
  .command('miners')
  .description('List mining drones')
  .action(async () => {
    printMiners(await client.miners());
  });

program
  .command('sector')
  .description('Show discovered sites in the current sector')
  .action(async () => {
    printSector(await client.sector());
  });

program
  .command('scan')
  .description('Scan nearby space for resource sites')
  .argument('[direction]', 'north, east, south, or west', 'north')
  .option('-k, --idempotency-key <key>', 'safe retry key for this scan')
  .action(async (direction: string, options: { idempotencyKey?: string }) => {
    printJson(await client.scan(direction, options.idempotencyKey));
  });

program
  .command('build-miner')
  .description('Build a persistent mining drone')
  .action(async () => {
    printJson(await client.buildMiner());
  });

program
  .command('upgrade-miner')
  .description('Upgrade a mining drone')
  .argument('<minerId>', 'miner id')
  .action(async (minerId: string) => {
    printJson(await client.upgradeMiner(minerId));
  });

program
  .command('assign-miner')
  .description('Assign a miner to a discovered resource site')
  .argument('<minerId>', 'miner id')
  .argument('<siteId>', 'site id')
  .action(async (minerId: string, siteId: string) => {
    printJson(await client.assignMiner(minerId, siteId));
  });

program
  .command('actions')
  .description('List scan actions and their status')
  .action(async () => {
    printActions(await client.actions());
  });

program
  .command('action')
  .description('Show one action')
  .argument('<actionId>', 'action id')
  .action(async (actionId: string) => {
    printJson(await client.action(actionId));
  });

program
  .command('log')
  .description("Show the captain's log")
  .action(async () => {
    printJson(await client.log());
  });

program
  .command('raw')
  .description('Make a direct API request for experimentation')
  .argument('<method>', 'HTTP method, for example GET or POST')
  .argument('<path>', 'API path, for example /v1/health')
  .argument('[json]', 'optional JSON request body')
  .action(async (method: string, path: string, json?: string) => {
    printJson(await client.raw(method, path, parseJsonArgument(json)));
  });

program
  .command('bot')
  .description('Run one safe beginner automation step')
  .action(async () => {
    await runBot({ client });
  });

program.parseAsync().catch((error: unknown) => {
  if (error instanceof CodernautsApiError) {
    console.error(`API error ${error.status}: ${error.message}`);
    printJson(error.body);
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(error.message);
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

function parseJsonArgument(json?: string): unknown {
  if (!json) {
    return undefined;
  }

  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(`Could not parse JSON body: ${error instanceof Error ? error.message : String(error)}`);
  }
}
