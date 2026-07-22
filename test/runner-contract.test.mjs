import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const authorityName = /TOKEN|KEY|SECRET|AUTH|CREDENTIAL|PROXY|API|AWS|GCP|AZURE|KUBE|DOCKER|LAUNCHDARKLY/i;

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function listeningTcpPorts() {
  const rows = [...read('/proc/net/tcp').split('\n').slice(1), ...read('/proc/net/tcp6').split('\n').slice(1)];
  return [...new Set(rows.flatMap((row) => {
    const fields = row.trim().split(/\s+/);
    if (fields.length < 4 || fields[3] !== '0A') return [];
    const portHex = fields[1]?.split(':')[1];
    return portHex ? [Number.parseInt(portHex, 16)] : [];
  }))].sort((left, right) => left - right);
}

function unixSocketPaths() {
  return read('/proc/net/unix')
    .split('\n')
    .slice(1)
    .map((row) => row.trim().split(/\s+/).at(7))
    .filter((value) => value?.startsWith('/'))
    .slice(0, 100);
}

function processNames() {
  return [...new Set(
    read('/proc/self/mountinfo') &&
      execFileSync('sh', ['-c', "for f in /proc/[0-9]*/comm; do [ -r \"$f\" ] && head -n 1 \"$f\"; done"], {
        encoding: 'utf8',
        timeout: 5_000,
      })
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean),
  )].sort();
}

function writableMountTargets() {
  return read('/proc/self/mountinfo')
    .split('\n')
    .filter((row) => row.includes(' - ') && row.split(' - ')[0].split(' ')[5]?.split(',').includes('rw'))
    .map((row) => row.split(' ')[4])
    .filter(Boolean)
    .slice(0, 100);
}

test('the validation runner exposes a stable capability contract', () => {
  const gitConfigKeys = execFileSync('git', ['config', '--list', '--name-only'], {
    encoding: 'utf8',
    timeout: 5_000,
  })
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

  const contract = {
    uid: process.getuid?.(),
    gid: process.getgid?.(),
    cwd: process.cwd(),
    authorityEnvironmentNames: Object.keys(process.env).filter((name) => authorityName.test(name)).sort(),
    gitConfigKeys,
    listeningTcpPorts: listeningTcpPorts(),
    unixSocketPaths: unixSocketPaths(),
    processNames: processNames(),
    writableMountTargets: writableMountTargets(),
  };

  assert.ok(contract.cwd.length > 0);
  assert.ok(contract.gitConfigKeys.length > 0);
  console.log(`runner-capability-contract:${JSON.stringify(contract)}`);
});
