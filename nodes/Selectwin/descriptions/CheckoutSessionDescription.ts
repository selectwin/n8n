import type { INodeProperties } from 'n8n-workflow';

import { addIdempotencyKey, sendJsonBody } from '../GenericFunctions';
import { paginationFields } from './shared';

export const checkoutSessionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['checkoutSession'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a checkout session',
				description:
					'Create a hosted checkout session — the response field url is the hosted checkout page',
				routing: {
					request: { method: 'POST', url: '/v1/checkouts/sessions' },
					send: { preSend: [sendJsonBody, addIdempotencyKey] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a checkout session',
				description: 'Retrieve a single checkout session by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/checkouts/sessions/{{$parameter.sessionId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many checkout sessions',
				description: 'List checkout sessions',
				routing: { request: { method: 'GET', url: '/v1/checkouts/sessions' } },
			},
		],
		default: 'create',
	},
];

export const checkoutSessionFields: INodeProperties[] = [
	{
		displayName: 'Body (JSON)',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		description:
			'Full request body for the session as a JSON object (line items, redirect URLs, customer, …). The session schema is wide-open, so it is passed through as-is.',
		displayOptions: { show: { resource: ['checkoutSession'], operation: ['create'] } },
	},
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the checkout session',
		displayOptions: { show: { resource: ['checkoutSession'], operation: ['get'] } },
	},
	...paginationFields('checkoutSession'),
];
