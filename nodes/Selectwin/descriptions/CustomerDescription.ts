import type { INodeProperties } from 'n8n-workflow';

import { addIdempotencyKey } from '../GenericFunctions';
import { paginationFields } from './shared';

const JSON_OBJECT_VALUE =
	'={{ typeof $value === "string" ? JSON.parse($value === "" ? "{}" : $value) : $value }}';

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['customer'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a customer',
				description: 'Create a new customer',
				routing: {
					request: { method: 'POST', url: '/v1/customers' },
					send: { preSend: [addIdempotencyKey] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a customer',
				description: 'Retrieve a single customer by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/customers/{{$parameter.customerId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many customers',
				description: 'List customers',
				routing: { request: { method: 'GET', url: '/v1/customers' } },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a customer',
				description: 'Partially update a customer',
				routing: {
					request: { method: 'PATCH', url: '=/v1/customers/{{$parameter.customerId}}' },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a customer',
				description: 'Delete a customer',
				routing: {
					request: { method: 'DELETE', url: '=/v1/customers/{{$parameter.customerId}}' },
				},
			},
		],
		default: 'create',
	},
];

export const customerFields: INodeProperties[] = [
	// ----------------------------------
	//         customer: create
	// ----------------------------------
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'firstName' } },
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'lastName' } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		placeholder: 'name@email.com',
		default: '',
		displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Telephone',
		name: 'telephone',
		type: 'collection',
		placeholder: 'Add Telephone Part',
		default: {},
		displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
		options: [
			{
				displayName: 'Country Code',
				name: 'countryCode',
				type: 'string',
				default: '55',
				description: 'Digits only, e.g. 55',
				routing: { send: { type: 'body', property: 'telephone.countryCode' } },
			},
			{
				displayName: 'Area Code',
				name: 'areaCode',
				type: 'string',
				default: '',
				description: 'Digits only, e.g. 11',
				routing: { send: { type: 'body', property: 'telephone.areaCode' } },
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
				description: 'Digits only',
				routing: { send: { type: 'body', property: 'telephone.number' } },
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
		options: [
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
				routing: { send: { type: 'body', property: 'document.type' } },
			},
			{
				displayName: 'Document Number',
				name: 'documentNumber',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'document.number' } },
			},
			{
				displayName: 'External Reference',
				name: 'externalReference',
				type: 'string',
				default: '',
				description: 'Your own reference for this customer',
				routing: { send: { type: 'body', property: 'externalReference' } },
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Arbitrary key-value metadata as a JSON object',
				routing: {
					send: { type: 'body', property: 'metadata', value: JSON_OBJECT_VALUE },
				},
			},
		],
	},

	// ----------------------------------
	//    customer: get / update / delete
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer (cus_…)',
		displayOptions: {
			show: { resource: ['customer'], operation: ['get', 'update', 'delete'] },
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['customer'], operation: ['update'] } },
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'firstName' } },
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'lastName' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				routing: { send: { type: 'body', property: 'email' } },
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
				routing: { send: { type: 'body', property: 'document.type' } },
			},
			{
				displayName: 'Document Number',
				name: 'documentNumber',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'document.number' } },
			},
			{
				displayName: 'External Reference',
				name: 'externalReference',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'externalReference' } },
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Arbitrary key-value metadata as a JSON object',
				routing: {
					send: { type: 'body', property: 'metadata', value: JSON_OBJECT_VALUE },
				},
			},
		],
	},

	// ----------------------------------
	//         customer: getAll
	// ----------------------------------
	...paginationFields('customer'),
];
