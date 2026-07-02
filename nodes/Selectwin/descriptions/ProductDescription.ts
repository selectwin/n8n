import type { INodeProperties } from 'n8n-workflow';

import { addIdempotencyKey, mergeAdditionalFields, sendJsonBody } from '../GenericFunctions';
import { paginationFields } from './shared';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['product'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a product',
				description: 'Create a new catalog product',
				routing: {
					request: { method: 'POST', url: '/v1/products' },
					send: { preSend: [mergeAdditionalFields, addIdempotencyKey] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a product',
				description: 'Retrieve a single product by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/products/{{$parameter.productId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many products',
				description: 'List products',
				routing: { request: { method: 'GET', url: '/v1/products' } },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a product',
				description: 'Partially update a product',
				routing: {
					request: { method: 'PATCH', url: '=/v1/products/{{$parameter.productId}}' },
					send: { preSend: [sendJsonBody] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a product',
				description: 'Delete a product',
				routing: {
					request: { method: 'DELETE', url: '=/v1/products/{{$parameter.productId}}' },
				},
			},
		],
		default: 'create',
	},
];

export const productFields: INodeProperties[] = [
	// ----------------------------------
	//         product: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Display name of the product',
		displayOptions: { show: { resource: ['product'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Additional Fields (JSON)',
		name: 'additionalFields',
		type: 'json',
		default: '{}',
		description:
			'Rest of the product body as a JSON object, merged into the request. The API also requires type, category, warrantyDays and variants — provide them here.',
		displayOptions: { show: { resource: ['product'], operation: ['create'] } },
	},

	// ----------------------------------
	//    product: get / update / delete
	// ----------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the product (prd_…)',
		displayOptions: {
			show: { resource: ['product'], operation: ['get', 'update', 'delete'] },
		},
	},
	{
		displayName: 'Update Fields (JSON)',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		description: 'Fields to update, as a JSON object (sent as the PATCH body)',
		displayOptions: { show: { resource: ['product'], operation: ['update'] } },
	},

	// ----------------------------------
	//         product: getAll
	// ----------------------------------
	...paginationFields('product'),
];
