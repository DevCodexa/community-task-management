const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { sendEmail } = require('../dist/brevo.js');

const payload = {
  sender: { email: 'sender@example.invalid', name: 'Sender' },
  to: [{ email: 'recipient@example.invalid' }],
  subject: 'Test',
  htmlContent: '<p>Hello</p>'
};

test('sends the Brevo payload with authentication and a timeout', async (t) => {
  const post = t.mock.method(axios, 'post', async () => ({ data: { messageId: 'test-message' } }));
  assert.deepEqual(await sendEmail(payload, 'test-key'), { messageId: 'test-message' });
  assert.equal(post.mock.callCount(), 1);
  const [url, body, options] = post.mock.calls[0].arguments;
  assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
  assert.deepEqual(body, payload);
  assert.equal(options.headers['api-key'], 'test-key');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.timeout, 30000);
});

test('preserves provider HTTP status and message for queue retry decisions', async (t) => {
  t.mock.method(axios, 'post', async () => {
    throw new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
      { status: 400, data: { message: 'Invalid recipient' }, headers: {}, config: {} });
  });
  await assert.rejects(sendEmail(payload, 'test-key'), (error) => {
    assert.equal(error.status, 400);
    assert.match(error.message, /Invalid recipient \(HTTP 400\)/);
    return true;
  });
});

test('rejects a successful response without a message ID', async (t) => {
  t.mock.method(axios, 'post', async () => ({ data: {} }));
  await assert.rejects(sendEmail(payload, 'test-key'), /Brevo response missing messageId/);
});

test('propagates transport failure without inventing an HTTP status', async (t) => {
  t.mock.method(axios, 'post', async () => { throw new axios.AxiosError('Network error', 'ERR_NETWORK'); });
  await assert.rejects(sendEmail(payload, 'test-key'), (error) => {
    assert.equal(error.message, 'Network error');
    assert.equal(error.status, undefined);
    return true;
  });
});
