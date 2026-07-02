import { randomUUID } from 'crypto';

import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Parse a `json`-type node parameter into a plain object.
 * Accepts an already-parsed object (expression results) or a JSON string.
 */
function parseJsonParameter(
	context: IExecuteSingleFunctions,
	value: unknown,
	parameterName: string,
): IDataObject {
	if (value === undefined || value === null || value === '') return {};
	if (typeof value === 'object' && !Array.isArray(value)) return value as IDataObject;
	if (typeof value === 'string') {
		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new NodeOperationError(
				context.getNode(),
				`The "${parameterName}" parameter is not valid JSON`,
			);
		}
		if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as IDataObject;
		}
	}
	throw new NodeOperationError(
		context.getNode(),
		`The "${parameterName}" parameter must be a JSON object`,
	);
}

/** Recursively merge `source` into `target` (source wins on leaf conflicts). */
function mergeDeep(target: IDataObject, source: IDataObject): IDataObject {
	for (const [key, value] of Object.entries(source)) {
		const existing = target[key];
		if (
			value !== null &&
			typeof value === 'object' &&
			!Array.isArray(value) &&
			existing !== null &&
			typeof existing === 'object' &&
			!Array.isArray(existing)
		) {
			target[key] = mergeDeep(existing as IDataObject, value as IDataObject);
		} else {
			target[key] = value;
		}
	}
	return target;
}

/**
 * preSend: set a random X-Idempotency-Key header on mutating requests
 * (the Selectwin API expects one on every POST) when none is set yet.
 */
export async function addIdempotencyKey(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.headers = requestOptions.headers ?? {};
	const headers = requestOptions.headers as IDataObject;
	if (!headers['X-Idempotency-Key']) {
		headers['X-Idempotency-Key'] = randomUUID();
	}
	return requestOptions;
}

/**
 * preSend: assemble the whole POST /v1/transactions body from the node
 * parameters. One builder keeps the nested mapping (payment.*, customer.*)
 * correct instead of relying on brittle dot-notation routing.
 */
export async function buildTransactionBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const amount = this.getNodeParameter('amount') as number;
	const method = this.getNodeParameter('method') as string;

	const payment: IDataObject = { method };
	const body: IDataObject = { amount, payment };

	// Customer: existing ID wins; otherwise inline fields (find-or-create).
	const customerId = this.getNodeParameter('customerId', '') as string;
	if (customerId) {
		body.customer = { id: customerId };
	} else {
		const inline = this.getNodeParameter('customerFields', {}) as IDataObject;
		const customer: IDataObject = {};
		for (const key of ['firstName', 'lastName', 'email']) {
			if (inline[key]) customer[key] = inline[key];
		}
		if (inline.documentType && inline.documentNumber) {
			customer.document = { type: inline.documentType, number: inline.documentNumber };
		}
		if (Object.keys(customer).length > 0) body.customer = customer;
	}

	if (method === 'pix') {
		const expiresInMinutes = this.getNodeParameter('pixExpiresInMinutes', 0) as number;
		if (expiresInMinutes) payment.pix = { expiresInMinutes };
	}
	if (method === 'billet') {
		const expiresInDays = this.getNodeParameter('billetExpiresInDays', 0) as number;
		if (expiresInDays) payment.billet = { expiresInDays };
	}
	if (method === 'credit') {
		const cardId = this.getNodeParameter('cardId', '') as string;
		if (cardId) payment.card = { id: cardId };
		const installments = this.getNodeParameter('installments', 0) as number;
		if (installments) payment.installments = installments;
	}

	const description = this.getNodeParameter('description', '') as string;
	if (description) body.description = description;
	const externalReference = this.getNodeParameter('externalReference', '') as string;
	if (externalReference) body.externalReference = externalReference;

	const additionalFields = parseJsonParameter(
		this,
		this.getNodeParameter('additionalFields', '{}'),
		'additionalFields',
	);

	requestOptions.body = mergeDeep(body, additionalFields);
	return requestOptions;
}

/**
 * preSend: assemble the POST /v1/checkouts/payment-links body
 * (name + items[] from the fixedCollection + optional expiresAt/metadata).
 */
export async function buildPaymentLinkBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body: IDataObject = { name: this.getNodeParameter('name') as string };

	const itemsParameter = this.getNodeParameter('items', {}) as {
		item?: Array<{ id: string; quantity?: number }>;
	};
	const items = (itemsParameter.item ?? [])
		.filter((entry) => entry.id)
		.map((entry) => ({ id: entry.id, quantity: entry.quantity ?? 1 }));
	if (items.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one item is required');
	}
	body.items = items;

	const expiresAt = this.getNodeParameter('expiresAt', '') as string;
	if (expiresAt) body.expiresAt = expiresAt;

	const metadata = parseJsonParameter(this, this.getNodeParameter('metadata', '{}'), 'metadata');
	if (Object.keys(metadata).length > 0) body.metadata = metadata;

	requestOptions.body = body;
	return requestOptions;
}

/**
 * preSend: use the `jsonBody` parameter (a JSON object) as the whole request
 * body. Used by pass-through operations whose schema is too wide to curate.
 */
export async function sendJsonBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = parseJsonParameter(
		this,
		this.getNodeParameter('jsonBody', '{}'),
		'jsonBody',
	);
	return requestOptions;
}

/**
 * preSend: deep-merge the `additionalFields` JSON parameter into whatever
 * body the declarative routing already produced.
 */
export async function mergeAdditionalFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = parseJsonParameter(
		this,
		this.getNodeParameter('additionalFields', '{}'),
		'additionalFields',
	);
	if (Object.keys(additionalFields).length > 0) {
		const body = (requestOptions.body ?? {}) as IDataObject;
		requestOptions.body = mergeDeep(body, additionalFields);
	}
	return requestOptions;
}
