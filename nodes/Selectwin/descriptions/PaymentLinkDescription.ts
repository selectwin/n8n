import type { INodeProperties } from 'n8n-workflow';

import { addIdempotencyKey, buildPaymentLinkBody } from '../GenericFunctions';
import { paginationFields } from './shared';

export const paymentLinkOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['paymentLink'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a payment link',
				description:
					'Create a shareable payment link — the response field accessFullUrl is the URL to share',
				routing: {
					request: { method: 'POST', url: '/v1/checkouts/payment-links' },
					send: { preSend: [buildPaymentLinkBody, addIdempotencyKey] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a payment link',
				description: 'Retrieve a single payment link by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/checkouts/payment-links/{{$parameter.paymentLinkId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many payment links',
				description: 'List payment links',
				routing: { request: { method: 'GET', url: '/v1/checkouts/payment-links' } },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a payment link',
				description: 'Partially update a payment link (e.g. enable/disable it)',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/v1/checkouts/payment-links/{{$parameter.paymentLinkId}}',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a payment link',
				description: 'Delete a payment link',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1/checkouts/payment-links/{{$parameter.paymentLinkId}}',
					},
				},
			},
		],
		default: 'create',
	},
];

export const paymentLinkFields: INodeProperties[] = [
	// ----------------------------------
	//         paymentLink: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description:
			'Name of the payment link. The create response includes accessFullUrl — the shareable checkout URL.',
		displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
	},
	{
		displayName: 'Items',
		name: 'items',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Item',
		default: {},
		required: true,
		description: 'Catalog items sold through the link',
		displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
		options: [
			{
				displayName: 'Item',
				name: 'item',
				values: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'Variant / catalog item ID (var_… / prv_…)',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
					},
				],
			},
		],
	},
	{
		displayName: 'Expires At',
		name: 'expiresAt',
		type: 'dateTime',
		default: '',
		description: 'When the link stops accepting payments. Leave empty for no expiry.',
		displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'json',
		default: '{}',
		description: 'Arbitrary key-value metadata as a JSON object',
		displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
	},

	// ----------------------------------
	//  paymentLink: get / update / delete
	// ----------------------------------
	{
		displayName: 'Payment Link ID',
		name: 'paymentLinkId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the payment link',
		displayOptions: {
			show: { resource: ['paymentLink'], operation: ['get', 'update', 'delete'] },
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['paymentLink'], operation: ['update'] } },
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description: 'Whether the link accepts payments',
				routing: { send: { type: 'body', property: 'enabled' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'name' } },
			},
		],
	},

	// ----------------------------------
	//         paymentLink: getAll
	// ----------------------------------
	...paginationFields('paymentLink'),
];
