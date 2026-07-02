import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Pure helpers implementing the exact Selectwin webhook signature contract
 * (mirror of the API dispatcher):
 *
 * - The POSTed body is the canonical JSON of the event (keys sorted
 *   recursively). Verification always runs over the raw received bytes.
 * - `x-selectwin-signature: sha256=<hmac_sha256_hex(rawBody, secret)>` —
 *   the legacy/primary header.
 * - `x-selectwin-signature-v1: t=<unixSeconds>,v1=<hmac_sha256_hex("<t>.<rawBody>", secret)>`
 *   — the replay-proof header (preferred when present).
 * - `x-selectwin-timestamp: <unixSeconds>` accompanies the v1 header.
 */

export function hmacSha256Hex(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/** Constant-time string comparison (with an explicit length check). */
export function timingSafeEqualStr(a: string, b: string): boolean {
	const bufferA = Buffer.from(a, 'utf8');
	const bufferB = Buffer.from(b, 'utf8');
	if (bufferA.length !== bufferB.length) return false;
	return timingSafeEqual(bufferA, bufferB);
}

export interface VerifySignatureInput {
	/** The raw request body exactly as received (canonical JSON bytes). */
	rawBody: string;
	/** Incoming HTTP headers (case-insensitive; array values tolerated). */
	headers: Record<string, string | string[] | undefined>;
	/** The webhook secret (whsec_…) returned when the webhook was created. */
	secret?: string;
	/** Max allowed |now - t| for the v1 timestamp, in seconds. Default 300. */
	toleranceSeconds?: number;
	/** Current time in milliseconds (injectable for tests). */
	now?: number;
}

export interface VerifySignatureResult {
	valid: boolean;
	reason?: string;
}

function getHeader(
	headers: Record<string, string | string[] | undefined>,
	name: string,
): string | undefined {
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === name) {
			if (Array.isArray(value)) return value[0];
			return value;
		}
	}
	return undefined;
}

/**
 * Verify a Selectwin webhook delivery. Prefers the replay-proof v1 header
 * when present; falls back to the legacy header otherwise. Fails closed:
 * missing secret or missing signature headers → invalid.
 */
export function verifySelectwinSignature({
	rawBody,
	headers,
	secret,
	toleranceSeconds = 300,
	now = Date.now(),
}: VerifySignatureInput): VerifySignatureResult {
	if (!secret) return { valid: false, reason: 'missing webhook secret' };

	const v1Header = getHeader(headers, 'x-selectwin-signature-v1');
	if (v1Header) {
		const parts: Record<string, string> = {};
		for (const part of v1Header.split(',')) {
			const separatorIndex = part.indexOf('=');
			if (separatorIndex === -1) continue;
			parts[part.slice(0, separatorIndex).trim()] = part.slice(separatorIndex + 1).trim();
		}
		const timestamp = Number(parts.t);
		const signature = parts.v1;
		if (!Number.isFinite(timestamp) || !signature) {
			return { valid: false, reason: 'malformed v1 signature header' };
		}
		if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) {
			return { valid: false, reason: 'timestamp outside tolerance' };
		}
		const expected = hmacSha256Hex(`${timestamp}.${rawBody}`, secret);
		return timingSafeEqualStr(expected, signature)
			? { valid: true }
			: { valid: false, reason: 'v1 signature mismatch' };
	}

	const legacyHeader = getHeader(headers, 'x-selectwin-signature');
	if (legacyHeader) {
		const signature = legacyHeader.startsWith('sha256=')
			? legacyHeader.slice('sha256='.length)
			: legacyHeader;
		const expected = hmacSha256Hex(rawBody, secret);
		return timingSafeEqualStr(expected, signature)
			? { valid: true }
			: { valid: false, reason: 'signature mismatch' };
	}

	return { valid: false, reason: 'missing signature headers' };
}
