const crypto = require('crypto');

// Shiprocket webhook signature verification
function verifyShiprocketSignature({ rawBody, signature, secret, apiKey }) {
  if (secret && signature) {
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));
    if (!isValid) {
      console.error('Shiprocket signature mismatch:', { expected: expectedSignature, got: signature });
    }
    return { ok: isValid, reason: isValid ? null : 'Signature mismatch' };
  }

  const expectedToken = String(process.env.SHIPROCKET_WEBHOOK_TOKEN || '').trim();
  if (expectedToken) {
    if (!apiKey) return { ok: false, reason: 'Missing x-api-key header' };
    const ok = crypto.timingSafeEqual(Buffer.from(String(expectedToken)), Buffer.from(String(apiKey)));
    return { ok, reason: ok ? null : 'Invalid x-api-key token' };
  }

  if (!secret) {
    return { ok: false, reason: 'Missing SHIPROCKET_WEBHOOK_SECRET (HMAC) and SHIPROCKET_WEBHOOK_TOKEN (x-api-key)' };
  }
  return { ok: false, reason: 'Missing X-Shiprocket-Signature header' };
}

async function ensureIdempotency({ db, collection, eventId, orderId }) {
  if (!eventId) return { ok: true };
  const existing = await db.collection(collection).findOne({ 'webhookEvents.eventId': eventId });
  if (existing) return { ok: false, reason: 'Duplicate event', duplicate: true };

  await db.collection(collection).updateOne(
    { _id: orderId },
    { $push: { webhookEvents: { eventId, receivedAt: new Date() } } },
    { upsert: true }
  );
  return { ok: true };
}

function logWebhookFailure(provider, reason, ip, body) {
  console.error(`[WEBHOOK-${provider}] Verification failed:`, {
    reason,
    ip,
    timestamp: new Date().toISOString(),
    body: typeof body === 'object' ? JSON.stringify(body) : body,
  });
}

module.exports = {
  verifyShiprocketSignature,
  ensureIdempotency,
  logWebhookFailure,
};
