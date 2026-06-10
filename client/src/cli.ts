#!/usr/bin/env node
import { Command } from 'commander';
import { CodernautsApiError, CodernautsClient } from './client.js';
import { loadConfig } from './config.js';
import { runBot } from './bot.js';
import {
  printActions,
  printConversionResult,
  printConversions,
  printJson,
  printLeaderboard,
  printMiners,
  printNodes,
  printSector,
  printStatus,
} from './format.js';
import { nodesFor } from './web/game-model.js';

const config = loadConfig();
let client = new CodernautsClient(config);
const program = new Command();

program
  .name('codernauts')
  .description('Beginner-friendly CLI for the Codernauts space automation API')
  .version('0.2.0')
  .option('--api-url <url>', 'API server URL', config.apiUrl)
  .option('--token <token>', 'bearer auth token', config.token)
  .hook('preAction', (command) => {
    const options = command.optsWithGlobals<{ apiUrl: string; token: string }>();
    client = new CodernautsClient({ apiUrl: options.apiUrl, token: options.token });
  });

program
  .command('status')
  .description('Show codernaut, location, gravel, crusher, resources, and active actions')
  .action(async () => {
    printStatus(await client.status());
  });

program
  .command('leaderboard')
  .description('Show the season gravelboard')
  .action(async () => {
    printLeaderboard(await client.leaderboard());
  });

program
  .command('conversions')
  .description('Show gravel conversion rates and which resources the crusher accepts')
  .action(async () => {
    printConversions(await client.conversions());
  });

program
  .command('convert')
  .description('Crush a resource into gravel; omit the amount to crush the full balance')
  .argument('<resource>', 'ore, ice, gas, or crystal')
  .argument('[amount]', 'whole units to crush; defaults to everything')
  .option('-k, --idempotency-key <key>', 'safe retry key for this conversion')
  .action(async (resource: string, amount: string | undefined, options: { idempotencyKey?: string }) => {
    printConversionResult(await client.convert(resource, parseAmountArgument(amount), options.idempotencyKey));
  });

program
  .command('claim')
  .description('Claim a discovered node so miners can work its sites')
  .argument('<nodeId>', 'node id, for example node_east_1')
  .option('-k, --idempotency-key <key>', 'safe retry key for this claim')
  .action(async (nodeId: string, options: { idempotencyKey?: string }) => {
    printJson(await client.claimNode(nodeId, options.idempotencyKey));
  });

program
  .command('nodes')
  .description('List discovered nodes with traits, claim state, claim costs, and sites')
  .action(async () => {
    printNodes(nodesFor(await client.sector()));
  });

program
  .command('miners')
  .description('List mining drones')
  .action(async () => {
    printMiners(await client.miners());
  });

program
  .command('sector')
  .description('Show discovered nodes and sites in the current sector')
  .action(async () => {
    printSector(await client.sector());
  });

program
  .command('scan')
  .description('Scan a direction for the next undiscovered node; farther scans take longer')
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
  .command('upgrade-crusher')
  .description('Upgrade the outpost crusher to the next, grander name')
  .action(async () => {
    printJson(await client.upgradeCrusher());
  });

program
  .command('assign-miner')
  .description('Assign a miner to a site on a claimed node')
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

function parseAmountArgument(amount?: string): number | undefined {
  if (amount === undefined) {
    return undefined;
  }
  const value = Number(amount);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('Amount must be a whole number of at least 1, or omitted to crush everything.');
  }
  return value;
}

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
