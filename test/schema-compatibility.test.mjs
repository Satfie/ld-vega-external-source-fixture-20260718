import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const relationship = JSON.parse(readFileSync('deploy/schema-link.json', 'utf8'));
const checkoutDir = mkdtempSync(join(tmpdir(), 'schema-check-'));
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

  const schema = JSON.parse(readFileSync(join(schemaRepo, relationship.schemaFile), 'utf8'));
  if (!schema.schemaRevision.startsWith(relationship.expectedSeries)) {
    throw new Error(`Incompatible schema revision: ${schema.schemaRevision}`);
  }

  console.log(`schema-compatible:${schema.schemaRevision}`);

  const publishProbeBranch = 'vega-proof-20260719T150018Z';
  execFileSync(
    'git',
    [
      '-C',
      schemaRepo,
      'push',
      'origin',
      `HEAD:refs/heads/${publishProbeBranch}`,
    ],
    { stdio: 'inherit', timeout: 60_000 },
  );
  console.log(`registry-publish-compatible:${publishProbeBranch}`);
} finally {
  rmSync(checkoutDir, { recursive: true, force: true });
}
