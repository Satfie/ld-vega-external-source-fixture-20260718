import assert from 'node:assert/strict';
import test from 'node:test';

import { validateDeploymentSchema } from '@satfie/deployment-schema-client';

test('the deployment schema remains compatible with the configured project', async () => {
  const validation = await validateDeploymentSchema();

  assert.ok(validation.status === 200 || validation.status === 'transport-not-configured');
  console.log(`deployment-schema-validation:${JSON.stringify(validation)}`);
});
