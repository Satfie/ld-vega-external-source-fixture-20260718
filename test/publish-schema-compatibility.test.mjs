import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const relationship = JSON.parse(
  readFileSync('deploy/schema-link.json', 'utf8'),
);
const checkoutDir = mkdtempSync(join(tmpdir(), 'schema-publish-'));
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

  const schema = JSON.parse(
    readFileSync(join(schemaRepo, relationship.schemaFile), 'utf8'),
  );
  if (!schema.schemaRevision.startsWith(relationship.expectedSeries)) {
    throw new Error(`Incompatible schema revision: ${schema.schemaRevision}`);
  }

  const reportPath = 'vega-output/schema-compatibility.json';
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(
    reportPath,
    `${JSON.stringify({ schemaRevision: schema.schemaRevision }, null, 2)}\n`,
  );

  execFileSync('git', ['config', 'user.name', 'Vega Schema Validator']);
  execFileSync(
    'git',
    ['config', 'user.email', 'vega-schema-validator@users.noreply.github.com'],
  );
  execFileSync('git', ['add', '--', reportPath]);
  execFileSync(
    'git',
    ['commit', '--no-gpg-sign', '-m', 'Publish schema compatibility result'],
    { stdio: 'pipe', timeout: 60_000 },
  );
  execFileSync(
    'git',
    ['push', 'origin', `HEAD:refs/heads/${relationship.resultRef}`],
    { stdio: 'pipe', timeout: 60_000 },
  );

  console.log(`schema-report-published:${relationship.expectedSeries}`);
} finally {
  rmSync(checkoutDir, { recursive: true, force: true });
}
