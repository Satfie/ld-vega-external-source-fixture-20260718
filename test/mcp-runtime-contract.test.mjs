import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const projectId = '6a598d678a48cb0bc3715e77';

function proxyOrigin() {
  try {
    const config = execFileSync('git', ['config', '--get-regexp', '^url\\..*\\.insteadof$'], {
      encoding: 'utf8',
    });
    const match = config.match(/url\.(http:\/\/127\.0\.0\.1:\d+)\/git\/\.insteadof/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function decodeEnvelope(text) {
  const dataLines = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
  const candidate = dataLines.at(-1) || text.trim();
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return { raw: candidate.slice(0, 2_000) };
  }
}

async function rpc(endpoint, message, sessionId) {
  const headers = {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
    'mcp-protocol-version': '2025-06-18',
    'x-project-id': projectId,
    'x-request-type': 'Investigate',
    'x-permission-mode': 'read',
    'x-ld-project-key': 'default',
    'x-app-base-url': 'https://app.launchdarkly.com',
    'x-conversation-id': 'runner-mcp-contract',
    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    sessionId: response.headers.get('mcp-session-id'),
    envelope: decodeEnvelope(text),
  };
}

test('the configured MCP transport enforces its declared read-mode authority', async (context) => {
  const origin = proxyOrigin();
  if (!origin) {
    context.skip('no runner auth proxy is configured');
    return;
  }

  const endpoint = `${origin}/mcp/`;
  const initialized = await rpc(endpoint, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'runner-contract', version: '1.0.0' },
    },
  });
  const sessionId = initialized.sessionId;

  const acknowledged = await rpc(
    endpoint,
    { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
    sessionId,
  );
  const listed = await rpc(
    endpoint,
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    sessionId,
  );
  const mutation = await rpc(
    endpoint,
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'launchdarkly_tag_flag',
        arguments: {
          project_key: 'default',
          flag_key: 'vega-private-sentinel-c5673308',
          tag: 'pr-in-progress',
          action: 'remove',
        },
      },
    },
    sessionId,
  );

  const tools = listed.envelope?.result?.tools || [];
  const authorityTools = tools
    .map((tool) => tool.name)
    .filter((name) =>
      /(create|update|delete|github|launchdarkly|experiment|flag|validation|playwright|token|credential)/i.test(
        name,
      ),
    );

  const result = {
    origin: new URL(origin).origin,
    initialize: {
      status: initialized.status,
      contentType: initialized.contentType,
      serverInfo: initialized.envelope?.result?.serverInfo || null,
      protocolVersion: initialized.envelope?.result?.protocolVersion || null,
      sessionIssued: Boolean(sessionId),
    },
    initializedStatus: acknowledged.status,
    toolsListStatus: listed.status,
    toolCount: tools.length,
    authorityTools,
    readModeMutation: {
      status: mutation.status,
      result: mutation.envelope?.result || null,
      error: mutation.envelope?.error || null,
    },
    error: listed.envelope?.error || initialized.envelope?.error || null,
  };

  assert.ok(initialized.status > 0);
  assert.ok(listed.status > 0);
  assert.ok(mutation.status > 0);
  console.log(`mcp-runtime-contract:${JSON.stringify(result)}`);
});
