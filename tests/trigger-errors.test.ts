import { describe, expect, it } from 'vitest';

import { extractApiErrorMessage } from '../nodes/SelectwinTrigger/SelectwinTrigger.node';

const envelope = { error: { statusCode: 400, code: 'validation_failed', message: 'endpoint must be an https URL', resource: 'webhook' } };

describe('extractApiErrorMessage', () => {
	it('reads the envelope from error.cause.response.data (NodeApiError over axios)', () => {
		expect(extractApiErrorMessage({ cause: { response: { data: envelope } } })).toBe(
			'endpoint must be an https URL',
		);
	});

	it('reads the envelope from error.response.body, including JSON strings', () => {
		expect(extractApiErrorMessage({ response: { body: envelope } })).toBe(
			'endpoint must be an https URL',
		);
		expect(extractApiErrorMessage({ response: { data: JSON.stringify(envelope) } })).toBe(
			'endpoint must be an https URL',
		);
	});

	it('returns undefined for non-envelope errors', () => {
		expect(extractApiErrorMessage(new Error('boom'))).toBeUndefined();
		expect(extractApiErrorMessage({ response: { data: 'not json' } })).toBeUndefined();
		expect(extractApiErrorMessage({ response: { data: { message: 'flat' } } })).toBeUndefined();
		expect(extractApiErrorMessage(undefined)).toBeUndefined();
	});
});
