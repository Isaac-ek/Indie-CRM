import crypto from "crypto";

/**
 * Computes an HMAC-SHA256 signature for a raw payload string.
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  if (!secret) {
    throw new Error("Webhook secret is required to generate signature.");
  }
  return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
}

/**
 * Verifies an incoming webhook HMAC-SHA256 signature using timing-safe string comparison.
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret || !payload) {
    return false;
  }

  const expectedSignature = generateWebhookSignature(payload, secret);
  const sigBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
