import type { INodeProperties } from 'n8n-workflow';

import { addIdempotencyKey, sendJsonBody } from '../GenericFunctions';
import { paginationFields } from './shared';

export const couponOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['coupon'] } },
		options: [
			{
				name: 'Validate',
				value: 'validate',
				action: 'Validate a coupon',
				description: 'Check whether a coupon code is valid for a purchase',
				routing: {
					request: { method: 'POST', url: '/v1/coupons/validate' },
					send: { preSend: [sendJsonBody, addIdempotencyKey] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a coupon',
				description: 'Retrieve a single coupon by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/coupons/{{$parameter.couponId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many coupons',
				description: 'List coupons',
				routing: { request: { method: 'GET', url: '/v1/coupons' } },
			},
		],
		default: 'validate',
	},
];

export const couponFields: INodeProperties[] = [
	{
		displayName: 'Body (JSON)',
		name: 'jsonBody',
		type: 'json',
		default: '{}',
		description: 'Validation request body as a JSON object (coupon code plus purchase context)',
		displayOptions: { show: { resource: ['coupon'], operation: ['validate'] } },
	},
	{
		displayName: 'Coupon ID',
		name: 'couponId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the coupon',
		displayOptions: { show: { resource: ['coupon'], operation: ['get'] } },
	},
	...paginationFields('coupon'),
];
