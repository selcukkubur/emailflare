import assert from 'node:assert/strict';
import test from 'node:test';

process.env.ADMIN_TOKEN = 'dummy-admin-token-at-least-32-characters';
process.env.SESSION_SECRET = 'dummy-session-secret-at-least-32-characters';
process.env.MESAHUB_URL = 'https://mesahub.example.test';
process.env.CF_API_TOKEN = 'dummy-cloudflare-api-token';
process.env.CF_ACCOUNT_ID = 'dummy-cloudflare-account';

const { sendEmail, CloudflareApiError } = await import('../src/services/cloudflare.js');

test('sendEmail maps replyTo to reply_to while preserving content and the HTTP contract', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const params = Object.freeze({
    from: Object.freeze({ address: 'sender@example.com', name: 'Example Sender' }),
    to: ['recipient@example.com'],
    subject: 'Contact request',
    html: '<p>Hello from the visitor</p>',
    text: 'Hello from the visitor',
    replyTo: 'visitor@example.com',
  });
  const originalParams = structuredClone(params);
  const requests: Array<{ url: unknown; init: RequestInit | undefined }> = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return Response.json({ success: true, errors: [], result: { id: 'email-123' } });
  };

  const result = await sendEmail(params);

  assert.equal(requests.length, 1);
  const { url, init } = requests[0];
  const body = JSON.parse(init!.body as string);
  assert.equal(body.reply_to, 'visitor@example.com');
  assert.equal(Object.hasOwn(body, 'replyTo'), false);
  assert.deepEqual(body, {
    from: { address: 'sender@example.com', name: 'Example Sender' },
    to: ['recipient@example.com'],
    subject: 'Contact request',
    html: '<p>Hello from the visitor</p>',
    text: 'Hello from the visitor',
    reply_to: 'visitor@example.com',
  });
  assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/dummy-cloudflare-account/email/sending/send');
  assert.equal(init!.method, 'POST');
  const headers = new Headers(init!.headers);
  assert.equal(headers.get('Authorization'), 'Bearer dummy-cloudflare-api-token');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.deepEqual(result, { id: 'email-123' });
  assert.deepEqual(params, originalParams);
});

for (const replyAddress of [{}, { replyTo: undefined }]) {
  test(`sendEmail omits both reply address spellings when replyTo is ${Object.hasOwn(replyAddress, 'replyTo') ? 'undefined' : 'absent'}`, async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    let body: Record<string, unknown> | undefined;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(init!.body as string);
      return Response.json({ success: true, errors: [], result: { id: 'email-456' } });
    };

    await sendEmail({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'No reply address',
      text: 'Hello',
      ...replyAddress,
    });

    assert.ok(body);
    assert.equal(Object.hasOwn(body, 'reply_to'), false);
    assert.equal(Object.hasOwn(body, 'replyTo'), false);
    assert.deepEqual(body, {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'No reply address',
      text: 'Hello',
    });
  });
}

test('sendEmail preserves Cloudflare rejection status and code', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({
    success: false,
    errors: [{ code: 10000, message: 'Authentication error' }],
    result: null,
  }, { status: 403 });

  await assert.rejects(sendEmail({
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Rejected request',
    text: 'Hello',
    replyTo: 'visitor@example.com',
  }), (error: unknown) => {
    assert.ok(error instanceof CloudflareApiError);
    assert.equal(error.status, 403);
    assert.equal(error.code, 10000);
    assert.equal(error.path, '/accounts/dummy-cloudflare-account/email/sending/send');
    assert.match(error.message, /Authentication error/);
    return true;
  });
});
