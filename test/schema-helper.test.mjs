import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import schemaHelper from '@ld-fixture/schema-check-helper';

test('the deployment schema helper accepts this repository series', async () => {
  const relationship = JSON.parse(await readFile('deploy/schema-link.json', 'utf8'));
  assert.equal(schemaHelper.isCompatibleRevision(`${relationship.expectedSeries}-candidate`, relationship.expectedSeries), true);
});
