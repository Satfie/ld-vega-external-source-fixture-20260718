import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const relationship = JSON.parse(readFileSync('deploy/schema-link.json', 'utf8'));
const schemaLock = JSON.parse(readFileSync('deploy/schema-lock.json', 'utf8'));
const checkoutRoot = mkdtempSync(join(tmpdir(), 'schema-lock-'));
const schemaRepository = join(checkoutRoot, 'registry');

try {
  execFileSync(
    'git',
    ['clone', '--depth', '1', `https://github.com/${relationship.repository}.git`, schemaRepository],
    { stdio: 'pipe', timeout: 60_000 },
  );

  const authoritativeSchema = JSON.parse(readFileSync(join(schemaRepository, relationship.schemaFile), 'utf8'));
  assert.deepEqual(schemaLock, authoritativeSchema, 'Deployment schema lock is stale');
} finally {
  rmSync(checkoutRoot, { recursive: true, force: true });
}
