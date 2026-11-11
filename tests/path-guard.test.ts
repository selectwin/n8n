import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { assertSafePath, isSafeApiPath, mergeDeep } from '../nodes/Selectwin/GenericFunctions';
import { Selectwin } from '../nodes/Selectwin/Selectwin.node';

/**
 * Security sweep 31 (11/11/2026). N-1: the IDs went into the URL raw, so an ID taken from upstream data turned one
 * operation into another — "Cancel subscription" with `../transactions/tra_x/refund#` was POST
 * /v1/transactions/tra_x/refund, a full refund. N-2: `mergeDeep` walked into `__proto__`.
 */

const properties = new Selectwin().description.properties;

interface PathOperation {
	resource: string;
	operation: string;
	method: string;
	url: string;
}

function pathOperations(): PathOperation[] {
	const out: PathOperation[] = [];
	for (const prop of properties) {
		if (prop.name !== 'operation' || !prop.options) continue;
		for (const resource of (prop.displayOptions?.show?.resource as string[]) ?? []) {
			for (const option of prop.options as Array<{ value: string; routing?: INodeProperties['routing'] }>) {
				const url = option.routing?.request?.url;
				if (typeof url === 'string' && url.includes('$parameter')) {
					out.push({ resource, operation: option.value, method: String(option.routing?.request?.method), url });
				}
			}
		}
	}
	return out;
}

/** The ID property a URL names, as the node shows it for that resource + operation. */
function idProperty(name: string, resource: string, operation: string): INodeProperties | undefined {
	return properties.find((p) => {
		if (p.name !== name) return false;
		const show = p.displayOptions?.show ?? {};
		const resources = show.resource as string[] | undefined;
		const operations = show.operation as string[] | undefined;
		return (!resources || resources.includes(resource)) && (!operations || operations.includes(operation));
	});
}

/** What n8n sends: the template with each ID through encodeURIComponent, joined to the base URL like axios does. */
function finalPath(url: string, id: string): string {
	const path = url.replace(/^=/, '').replace(/\{\{encodeURIComponent\(\$parameter\.[A-Za-z]+\)\}\}/g, encodeURIComponent(id));
	return new URL(`https://api.selectwin.io/${path.replace(/^\/+/, '')}`).pathname;
}

describe('IDs in URL paths (N-1)', () => {
	const ops = pathOperations();

	it('finds the operations with an ID in the path (the ratchet is not vacuous)', () => {
		expect(ops.length).toBe(22);
	});

	it('every ID in a URL template is encoded', () => {
		for (const op of ops) {
			const raw = op.url.match(/\$parameter\.[A-Za-z]+/g) ?? [];
			const encoded = op.url.match(/encodeURIComponent\(\$parameter\.[A-Za-z]+\)/g) ?? [];
			expect({ op: `${op.resource}.${op.operation}`, encoded: encoded.length }).toEqual({
				op: `${op.resource}.${op.operation}`,
				encoded: raw.length,
			});
		}
	});

	it('every ID property that reaches a path runs the path guard', () => {
		for (const op of ops) {
			for (const [, name] of op.url.matchAll(/\$parameter\.([A-Za-z]+)/g)) {
				const prop = idProperty(name, op.resource, op.operation);
				expect(prop, `${op.resource}.${op.operation} → ${name}`).toBeDefined();
				expect(prop!.routing?.send?.preSend ?? [], `${op.resource}.${op.operation} → ${name}`).toContain(assertSafePath);
			}
		}
	});

	it('a hostile ID stays inside the operation it was given to', () => {
		const cancel = ops.find((o) => o.resource === 'subscription' && o.operation === 'cancel')!;
		expect(finalPath(cancel.url, '../transactions/tra_x/refund#')).toBe(
			'/v1/subscriptions/..%2Ftransactions%2Ftra_x%2Frefund%23/cancel',
		);
		for (const op of ops) {
			const [prefix, suffix] = op.url.replace(/^=/, '').split(/\{\{encodeURIComponent\(\$parameter\.[A-Za-z]+\)\}\}/);
			const path = finalPath(op.url, '../../v1/withdrawals?amount=1#');
			expect(path.startsWith(prefix!), `${op.resource}.${op.operation}: ${path}`).toBe(true);
			if (suffix && !suffix.includes('{{')) expect(path.endsWith(suffix), `${op.resource}.${op.operation}: ${path}`).toBe(true);
		}
	});
});

describe('isSafeApiPath', () => {
	it('accepts a path of real segments', () => {
		expect(isSafeApiPath('/v1/subscriptions/sub_1/cancel')).toBe(true);
		expect(isSafeApiPath('/v1/customers/cus_a.b')).toBe(true);
		expect(isSafeApiPath('https://api.selectwin.io/v1/customers/cus_1')).toBe(true);
	});

	it('refuses dot segments (which survive the encoding), empty IDs and raw ?#\\', () => {
		for (const bad of [
			'/v1/subscriptions/../cancel',
			'/v1/subscriptions/./cancel',
			'/v1/customers/..',
			'/v1/customers/%2E%2E',
			'/v1/customers/.%2e',
			'/v1/customers/',
			'/v1/products//variants',
			'/v1/customers/cus_1?x=1',
			'/v1/customers/cus_1#',
			'/v1/customers/a\\..\\b',
			'https://api.selectwin.io/v1/customers/..',
		]) {
			expect(isSafeApiPath(bad), bad).toBe(false);
		}
	});
});

describe('mergeDeep (N-2)', () => {
	it('does not walk into the prototype', () => {
		const target = { amount: 100, payment: { method: 'pix' } };
		mergeDeep(target, JSON.parse('{"__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"x": 1}}, "payment": {"__proto__": {"deep": 1}}}'));
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		expect(({} as Record<string, unknown>).deep).toBeUndefined();
		expect(({} as Record<string, unknown>).x).toBeUndefined();
		expect(target).toEqual({ amount: 100, payment: { method: 'pix' } });
	});

	it('still merges real fields', () => {
		expect(mergeDeep({ a: 1, n: { b: 2 } }, { n: { c: 3 }, d: 4 })).toEqual({ a: 1, n: { b: 2, c: 3 }, d: 4 });
	});
});
