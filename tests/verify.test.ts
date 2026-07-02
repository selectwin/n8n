import { describe, expect, it } from 'vitest';

import {
	hmacSha256Hex,
	timingSafeEqualStr,
	verifySelectwinSignature,
} from '../nodes/SelectwinTrigger/verify';

/**
 * Canonical JSON exactly like the API dispatcher: keys sorted recursively
 * (arrays keep their order).
 */
function canonicalJson(value: unknown): string {
	return JSON.stringify(value, (_key, val) => {
		if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
			return Object.keys(val as Record<string, unknown>)
				.sort()
				.reduce<Record<string, unknown>>((sorted, key) => {
					sorted[key] = (val as Record<string, unknown>)[key];
					return sorted;
				}, {});
		}
		return val;
	});
}

const SECRET = 'whsec_test_9f4b2c8d1e7a6053';
const NOW = 1_750_000_000_000; // fixed clock (ms)

/** A sample event envelope as the dispatcher would deliver it. */
const event = {
	id: 'evt_01hzxyz',
	type: 'transaction.approved',
	source: 'api',
	payload: {
		object: {
			id: 'tra_01hzabc',
			amount: 1990,
			status: 'approved',
			payment: { method: 'pix' },
			customer: { id: 'cus_01hzdef', email: 'jane@example.com' },
		},
	},
	createdAt: '2026-07-02T12:00:00.000Z',
	updatedAt: '2026-07-02T12:00:01.000Z',
	correlationId: 'corr_01hzghi',
};

/** Build the headers exactly like the dispatcher does. */
function signedHeaders(
	rawBody: string,
	secret: string,
	timestampSeconds: number,
): Record<string, string> {
	return {
		'x-selectwin-signature': `sha256=${hmacSha256Hex(rawBody, secret)}`,
		'x-selectwin-signature-v1': `t=${timestampSeconds},v1=${hmacSha256Hex(
			`${timestampSeconds}.${rawBody}`,
			secret,
		)}`,
		'x-selectwin-timestamp': String(timestampSeconds),
		'x-selectwin-event': 'transaction.approved',
	};
}

describe('canonicalJson (dispatcher simulation)', () => {
	it('sorts keys recursively', () => {
		expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
	});

	it('keeps array order', () => {
		expect(canonicalJson({ a: [{ z: 1, y: 2 }, 3] })).toBe('{"a":[{"y":2,"z":1},3]}');
	});
});

describe('hmacSha256Hex', () => {
	it('produces the expected hex digest', () => {
		// Independently computed: HMAC-SHA256("payload", "secret")
		expect(hmacSha256Hex('payload', 'secret')).toBe(
			'b82fcb791acec57859b989b430a826488ce2e479fdf92326bd0a2e8375a42ba4',
		);
	});
});

describe('timingSafeEqualStr', () => {
	it('matches equal strings', () => {
		expect(timingSafeEqualStr('abc', 'abc')).toBe(true);
	});

	it('rejects different strings of equal length', () => {
		expect(timingSafeEqualStr('abc', 'abd')).toBe(false);
	});

	it('rejects strings of different length', () => {
		expect(timingSafeEqualStr('abc', 'abcd')).toBe(false);
	});
});

describe('verifySelectwinSignature', () => {
	const rawBody = canonicalJson(event);
	const timestamp = Math.floor(NOW / 1000);
	const headers = signedHeaders(rawBody, SECRET, timestamp);

	it('accepts a correctly signed delivery (both headers present, v1 path)', () => {
		const result = verifySelectwinSignature({ rawBody, headers, secret: SECRET, now: NOW });
		expect(result).toEqual({ valid: true });
	});

	it('accepts when ONLY the v1 header is present', () => {
		const onlyV1 = { 'x-selectwin-signature-v1': headers['x-selectwin-signature-v1'] };
		const result = verifySelectwinSignature({
			rawBody,
			headers: onlyV1,
			secret: SECRET,
			now: NOW,
		});
		expect(result).toEqual({ valid: true });
	});

	it('accepts when ONLY the legacy header is present', () => {
		const onlyLegacy = { 'x-selectwin-signature': headers['x-selectwin-signature'] };
		const result = verifySelectwinSignature({
			rawBody,
			headers: onlyLegacy,
			secret: SECRET,
			now: NOW,
		});
		expect(result).toEqual({ valid: true });
	});

	it('rejects a wrong secret', () => {
		const result = verifySelectwinSignature({
			rawBody,
			headers,
			secret: 'whsec_wrong',
			now: NOW,
		});
		expect(result.valid).toBe(false);
	});

	it('rejects a tampered body', () => {
		const tampered = canonicalJson({ ...event, payload: { object: { amount: 999900 } } });
		const result = verifySelectwinSignature({
			rawBody: tampered,
			headers,
			secret: SECRET,
			now: NOW,
		});
		expect(result.valid).toBe(false);
	});

	it('rejects an expired timestamp (outside tolerance)', () => {
		const staleTimestamp = timestamp - 301;
		const staleHeaders = signedHeaders(rawBody, SECRET, staleTimestamp);
		const result = verifySelectwinSignature({
			rawBody,
			headers: staleHeaders,
			secret: SECRET,
			toleranceSeconds: 300,
			now: NOW,
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('timestamp outside tolerance');
	});

	it('accepts a stale timestamp when the tolerance is raised', () => {
		const staleTimestamp = timestamp - 301;
		const staleHeaders = signedHeaders(rawBody, SECRET, staleTimestamp);
		const result = verifySelectwinSignature({
			rawBody,
			headers: staleHeaders,
			secret: SECRET,
			toleranceSeconds: 600,
			now: NOW,
		});
		expect(result).toEqual({ valid: true });
	});

	it('rejects a malformed v1 header (and does not fall back to legacy)', () => {
		const malformed = {
			...headers,
			'x-selectwin-signature-v1': 'garbage-with-no-parts',
		};
		const result = verifySelectwinSignature({
			rawBody,
			headers: malformed,
			secret: SECRET,
			now: NOW,
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('malformed v1 signature header');
	});

	it('rejects a valid legacy header when the v1 header is present but wrong', () => {
		const wrongV1 = {
			...headers,
			'x-selectwin-signature-v1': `t=${timestamp},v1=${'0'.repeat(64)}`,
		};
		const result = verifySelectwinSignature({
			rawBody,
			headers: wrongV1,
			secret: SECRET,
			now: NOW,
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('v1 signature mismatch');
	});

	it('rejects when both signature headers are missing', () => {
		const result = verifySelectwinSignature({
			rawBody,
			headers: { 'x-selectwin-event': 'transaction.approved' },
			secret: SECRET,
			now: NOW,
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('missing signature headers');
	});

	it('rejects when the secret is missing', () => {
		const result = verifySelectwinSignature({ rawBody, headers, secret: undefined, now: NOW });
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('missing webhook secret');
	});

	it('rejects a legacy header without the sha256= prefix but wrong digest', () => {
		const result = verifySelectwinSignature({
			rawBody,
			headers: { 'x-selectwin-signature': 'deadbeef' },
			secret: SECRET,
			now: NOW,
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('signature mismatch');
	});

	it('accepts a legacy header without the sha256= prefix when the digest is right', () => {
		const result = verifySelectwinSignature({
			rawBody,
			headers: { 'x-selectwin-signature': hmacSha256Hex(rawBody, SECRET) },
			secret: SECRET,
			now: NOW,
		});
		expect(result).toEqual({ valid: true });
	});

	it('handles mixed-case and array-valued headers', () => {
		const mixed = {
			'X-Selectwin-Signature-V1': [headers['x-selectwin-signature-v1']],
		};
		const result = verifySelectwinSignature({
			rawBody,
			headers: mixed as Record<string, string | string[]>,
			secret: SECRET,
			now: NOW,
		});
		expect(result).toEqual({ valid: true });
	});
});
