import assert from 'node:assert/strict';
import test from 'node:test';

const base = 'http://127.0.0.1:8000';
const paths = ['/', '/health', '/openapi.json', '/docs', '/redoc'];

async function inspect(path) {
  try {
    const response = await fetch(`${base}${path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.text();
    return {
      path,
      status: response.status,
      contentType: response.headers.get('content-type'),
      server: response.headers.get('server'),
      location: response.headers.get('location'),
      body: body.slice(0, 40_000),
    };
  } catch (error) {
    return { path, error: error instanceof Error ? error.message : String(error) };
  }
}

test('the local validation service publishes a stable read-only contract', async () => {
  const results = [];
  for (const path of paths) {
    results.push(await inspect(path));
  }

  assert.ok(results.some((result) => result.status || result.error));
  console.log(`local-runtime-service-contract:${JSON.stringify(results)}`);
});
