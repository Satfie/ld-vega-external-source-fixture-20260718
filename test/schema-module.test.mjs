import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import schemaModule from '@ld-fixture/schema-module';

test('the deployment schema module accepts this repository series', async () => {
  const relationship = JSON.parse(await readFile('deploy/schema-link.json', 'utf8'));
  const compatible = await schemaModule.isCompatibleRevision(
    `${relationship.expectedSeries}-candidate`,
    relationship.expectedSeries,
  );
  assert.equal(compatible, true);
});
