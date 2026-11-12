const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn, execFile } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

test('worker starts and reaches both queue processors on a disabled test backend', { timeout: 20000 }, async (t) => {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url.split('?')[0]}`);
    res.setHeader('content-type', 'application/json');
    if (req.url.startsWith('/rest/v1/email_settings')) {
      res.end(JSON.stringify([
        { setting_key: 'brevo_api_key', setting_value: 'test-only' },
        { setting_key: 'sender_email', setting_value: 'test@example.invalid' },
        { setting_key: 'sender_name', setting_value: 'Test' },
        { setting_key: 'daily_limit', setting_value: '1' },
        { setting_key: 'retry_limit', setting_value: '1' },
        { setting_key: 'enabled', setting_value: 'false' }
      ]));
    } else if (req.url.startsWith('/rest/v1/rpc/enqueue_birthday_emails')) {
      res.end('null');
    } else if (req.url.startsWith('/rest/v1/email_queue')) {
      res.end('[]');
    } else {
      res.writeHead(404).end('{}');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const backendUrl = `http://127.0.0.1:${server.address().port}`;
  const dockerImage = process.env.WORKER_DOCKER_IMAGE;
  // When requested, exercise the production image's default entrypoint against
  // the same disabled local backend; GitHub's Linux runner supports host network.
  const command = dockerImage ? 'docker' : process.execPath;
  const containerName = `worker-smoke-${process.pid}-${Date.now()}`;
  const args = dockerImage
    ? ['run', '--rm', '--name', containerName, '--network', 'host', '-e', `SUPABASE_URL=${backendUrl}`,
       '-e', 'SUPABASE_SERVICE_ROLE_KEY=test-only', dockerImage]
    : [path.join(__dirname, '../dist/index.js')];
  const worker = spawn(command, args, {
    env: { ...process.env, SUPABASE_URL: backendUrl, SUPABASE_SERVICE_ROLE_KEY: 'test-only' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    // A Node process running as PID 1 can ignore SIGTERM. Force-remove the
    // test container so its streams do not keep the CI test process alive.
    if (dockerImage) {
      await new Promise((resolve) => execFile('docker', ['rm', '-f', containerName], { timeout: 5000 }, () => resolve()));
    }
    worker.kill('SIGKILL');
    worker.stdout.destroy();
    worker.stderr.destroy();
  });
  let output = '';
  worker.stdout.on('data', (data) => { output += data; });
  worker.stderr.on('data', (data) => { output += data; });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Worker did not finish startup: ${output}`)), 12000);
    const check = setInterval(() => {
      if (requests.filter((request) => request === 'GET /rest/v1/email_settings').length >= 2) {
        clearTimeout(timeout);
        clearInterval(check);
        resolve();
      }
    }, 25);
    worker.once('error', (error) => {
      clearTimeout(timeout);
      clearInterval(check);
      reject(error);
    });
    worker.once('exit', (code) => {
      clearTimeout(timeout);
      clearInterval(check);
      reject(new Error(`Worker exited early (${code}): ${output}`));
    });
    t.after(() => { clearTimeout(timeout); clearInterval(check); });
  });
  assert.ok(requests.includes('POST /rest/v1/rpc/enqueue_birthday_emails'));
  assert.ok(requests.includes('GET /rest/v1/email_queue'));
  assert.match(output, /Servis başlatıldı/);
});
