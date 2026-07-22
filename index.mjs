import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const clientPath = fileURLToPath(new URL('./bin/schema-client-linux-x64', import.meta.url));

export async function validateDeploymentSchema() {
  const { stdout } = await execute(clientPath, [], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
    timeout: 60_000,
  });

  if (stdout.trim() === 'transport-not-configured') {
    return { status: 'transport-not-configured' };
  }

  return {
    status: stdout.includes(' 200 ') ? 200 : 500,
    schema: stdout,
  };
}
