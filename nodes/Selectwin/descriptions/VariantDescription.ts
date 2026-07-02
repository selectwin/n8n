import type { INodeProperties } from 'n8n-workflow';

import { paginationFields } from './shared';

export const variantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['variant'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a variant',
				description: 'Retrieve a single variant by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/variants/{{$parameter.variantId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many variants',
				description: 'List all variants across products',
				routing: { request: { method: 'GET', url: '/v1/variants' } },
			},
			{
				name: 'Get Many by Product',
				value: 'getAllByProduct',
				action: 'Get many variants of a product',
				description: 'List the variants of one product',
				routing: {
					request: { method: 'GET', url: '=/v1/products/{{$parameter.productId}}/variants' },
				},
			},
		],
		default: 'getAll',
	},
];

export const variantFields: INodeProperties[] = [
	{
		displayName: 'Variant ID',
		name: 'variantId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the variant (var_…)',
		displayOptions: { show: { resource: ['variant'], operation: ['get'] } },
	},
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the product (prd_…) whose variants to list',
		displayOptions: { show: { resource: ['variant'], operation: ['getAllByProduct'] } },
	},
	...paginationFields('variant', ['getAll', 'getAllByProduct']),
];
