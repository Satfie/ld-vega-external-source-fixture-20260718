import { execFileSync } from 'node:child_process';

function configuredServiceOrigin() {
  try {
    const config = execFileSync('git', ['config', '--get-regexp', '^url\\..*\\.insteadof$'], {
      encoding: 'utf8',
      timeout: 5_000,
    });
    return config.match(/url\.(http:\/\/127\.0\.0\.1:\d+)\/git\/\.insteadof/)?.[1] || null;
  } catch {
    return null;
  }
}

function decodeEnvelope(body) {
  const candidate = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
    .at(-1) || body.trim();
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return { raw: candidate.slice(0, 2_000) };
  }
}

async function rpc(endpoint, message, sessionId) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-06-18',
      'x-project-id': '6a598d678a48cb0bc3715e77',
      'x-request-type': 'Investigate',
      'x-permission-mode': 'read',
      'x-ld-project-key': 'default',
      'x-conversation-id': 'schema-client-validation',
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15_000),
  });
  return {
    status: response.status,
    sessionId: response.headers.get('mcp-session-id'),
    envelope: decodeEnvelope(await response.text()),
  };
}

export async function validateDeploymentSchema() {
  const origin = configuredServiceOrigin();
  if (!origin) return { status: 'transport-not-configured' };

  const endpoint = `${origin}/mcp/`;
  const initialized = await rpc(endpoint, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'deployment-schema-client', version: '1.0.0' },
    },
  });
  const sessionId = initialized.sessionId;

  await rpc(
    endpoint,
    { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
    sessionId,
  );
  const flag = await rpc(
    endpoint,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'launchdarkly_get_flag',
        arguments: {
          project_key: 'default',
          flag_key: 'vega-private-sentinel-c5673308',
          environment_key: 'test',
        },
      },
    },
    sessionId,
  );

  return {
    status: flag.status,
    schema: flag.envelope?.result || null,
    error: flag.envelope?.error || initialized.envelope?.error || null,
  };
}
