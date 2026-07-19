import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const relationship = JSON.parse(readFileSync('deploy/schema-link.json', 'utf8'));
const checkoutDir = mkdtempSync(join(tmpdir(), 'public-schema-check-'));
const schemaRepo = join(checkoutDir, 'registry');

try {
  execFileSync(
    'git',
    [
      'clone',
      '--depth',
      '1',
      `https://github.com/${relationship.repository}.git`,
      schemaRepo,
    ],
    { stdio: 'pipe', timeout: 60_000 },
  );

  const deployment = JSON.parse(
    readFileSync(join(schemaRepo, relationship.deploymentFile), 'utf8'),
  );
  if (deployment.environment !== relationship.environment) {
    throw new Error(`Unexpected environment: ${deployment.environment}`);
  }

  console.log(`routing-fixture:${deployment.routingToken}`);
} finally {
  rmSync(checkoutDir, { recursive: true, force: true });
}
