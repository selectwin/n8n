import type { INodeProperties } from 'n8n-workflow';

import { addIdempotencyKey, buildTransactionBody } from '../GenericFunctions';
import { paginationFields } from './shared';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['transaction'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a transaction',
				description: 'Create a charge (PIX, boleto or saved card)',
				routing: {
					request: { method: 'POST', url: '/v1/transactions' },
					send: { preSend: [buildTransactionBody, addIdempotencyKey] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a transaction',
				description: 'Retrieve a single transaction by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/transactions/{{$parameter.transactionId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many transactions',
				description: 'List transactions',
				routing: { request: { method: 'GET', url: '/v1/transactions' } },
			},
			{
				name: 'Refund',
				value: 'refund',
				action: 'Refund a transaction',
				description: 'Refund a transaction, fully or partially (processed asynchronously)',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/transactions/{{$parameter.transactionId}}/refund',
					},
					send: { preSend: [addIdempotencyKey] },
				},
			},
			{
				name: 'Capture',
				value: 'capture',
				action: 'Capture a transaction',
				description: 'Capture a pre-authorized card transaction',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/transactions/{{$parameter.transactionId}}/capture',
					},
					send: { preSend: [addIdempotencyKey] },
				},
			},
		],
		default: 'create',
	},
];

export const transactionFields: INodeProperties[] = [
	// ----------------------------------
	//         transaction: create
	// ----------------------------------
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		required: true,
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Charge amount in cents (e.g. 1000 = R$ 10.00). The API minimum is 500.',
		displayOptions: { show: { resource: ['transaction'], operation: ['create'] } },
	},
	{
		displayName: 'Payment Method',
		name: 'method',
		type: 'options',
		required: true,
		options: [
			{ name: 'PIX', value: 'pix' },
			{ name: 'Boleto', value: 'billet' },
			{ name: 'Card', value: 'credit' },
		],
		default: 'pix',
		description: 'How the customer pays',
		displayOptions: { show: { resource: ['transaction'], operation: ['create'] } },
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		default: '',
		description:
			'ID of an existing customer (cus_…). Leave empty to identify the customer with the inline fields below instead (find-or-create by email).',
		displayOptions: { show: { resource: ['transaction'], operation: ['create'] } },
	},
	{
		displayName: 'Customer (Inline)',
		name: 'customerFields',
		type: 'collection',
		placeholder: 'Add Customer Field',
		default: {},
		description: 'Identify the customer inline — used only when Customer ID is empty',
		displayOptions: { show: { resource: ['transaction'], operation: ['create'] } },
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Document Type',
				name: 'documentType',
				type: 'options',
				options: [
					{ name: 'CPF', value: 'cpf' },
					{ name: 'CNPJ', value: 'cnpj' },
					{ name: 'Passport', value: 'passport' },
				],
				default: 'cpf',
			},
			{
				displayName: 'Document Number',
				name: 'documentNumber',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'PIX Expires In (Minutes)',
		name: 'pixExpiresInMinutes',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'How long the PIX QR code stays payable, in minutes (API minimum 15). Leave 0 for the API default.',
		displayOptions: {
			show: { resource: ['transaction'], operation: ['create'], method: ['pix'] },
		},
	},
	{
		displayName: 'Boleto Expires In (Days)',
		name: 'billetExpiresInDays',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'How many days until the boleto expires. Leave 0 for the API default. Note the API also requires billing.address for boleto — pass it via Additional Fields.',
		displayOptions: {
			show: { resource: ['transaction'], operation: ['create'], method: ['billet'] },
		},
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		description: 'ID of a saved card (card_…) to charge',
		displayOptions: {
			show: { resource: ['transaction'], operation: ['create'], method: ['credit'] },
		},
	},
	{
		displayName: 'Installments',
		name: 'installments',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 21 },
		default: 0,
		description: 'Number of installments (1–21). Leave 0 for the API default (1).',
		displayOptions: {
			show: { resource: ['transaction'], operation: ['create'], method: ['credit'] },
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'Free-text description of the charge',
		displayOptions: { show: { resource: ['transaction'], operation: ['create'] } },
	},
	{
		displayName: 'External Reference',
		name: 'externalReference',
		type: 'string',
		default: '',
		description: 'Your own reference for this charge (e.g. an order ID) — echoed back in webhooks',
		displayOptions: { show: { resource: ['transaction'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields (JSON)',
		name: 'additionalFields',
		type: 'json',
		default: '{}',
		description:
			'Extra request body fields as a JSON object, deep-merged into the generated body — e.g. billing.address (required for boleto), items, metadata, splits',
		displayOptions: { show: { resource: ['transaction'], operation: ['create'] } },
	},

	// ----------------------------------
	//   transaction: get / refund / capture
	// ----------------------------------
	{
		displayName: 'Transaction ID',
		name: 'transactionId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the transaction (tra_…)',
		displayOptions: {
			show: { resource: ['transaction'], operation: ['get', 'refund', 'capture'] },
		},
	},
	{
		displayName: 'Refund Fields',
		name: 'refundFields',
		type: 'collection',
		placeholder: 'Add Refund Field',
		default: {},
		displayOptions: { show: { resource: ['transaction'], operation: ['refund'] } },
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Amount to refund in cents. Omit to refund the full amount.',
				routing: { send: { type: 'body', property: 'amount' } },
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
				description: 'Why the transaction is being refunded',
				routing: { send: { type: 'body', property: 'reason' } },
			},
		],
	},

	// ----------------------------------
	//         transaction: getAll
	// ----------------------------------
	...paginationFields('transaction'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['transaction'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Filter by transaction status (e.g. approved, pending, refunded)',
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'Payment Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'PIX', value: 'pix' },
					{ name: 'Boleto', value: 'billet' },
					{ name: 'Card', value: 'credit' },
				],
				default: 'pix',
				routing: { send: { type: 'query', property: 'method' } },
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'customerId' } },
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				default: '',
				description: 'Sort expression accepted by the API',
				routing: { send: { type: 'query', property: 'sort' } },
			},
		],
	},
];
