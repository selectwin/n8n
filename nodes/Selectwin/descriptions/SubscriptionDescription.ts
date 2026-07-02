import type { INodeProperties } from 'n8n-workflow';

import { addIdempotencyKey } from '../GenericFunctions';
import { paginationFields } from './shared';

export const subscriptionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['subscription'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a subscription',
				description: 'Retrieve a single subscription by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/subscriptions/{{$parameter.subscriptionId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many subscriptions',
				description: 'List subscriptions',
				routing: { request: { method: 'GET', url: '/v1/subscriptions' } },
			},
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a subscription',
				description: 'Cancel a subscription',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/subscriptions/{{$parameter.subscriptionId}}/cancel',
					},
					send: { preSend: [addIdempotencyKey] },
				},
			},
			{
				name: 'Pause',
				value: 'pause',
				action: 'Pause a subscription',
				description: 'Pause a subscription',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/subscriptions/{{$parameter.subscriptionId}}/pause',
					},
					send: { preSend: [addIdempotencyKey] },
				},
			},
			{
				name: 'Resume',
				value: 'resume',
				action: 'Resume a subscription',
				description: 'Resume a paused subscription',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/subscriptions/{{$parameter.subscriptionId}}/resume',
					},
					send: { preSend: [addIdempotencyKey] },
				},
			},
		],
		default: 'get',
	},
];

export const subscriptionFields: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the subscription (sub_…)',
		displayOptions: {
			show: { resource: ['subscription'], operation: ['get', 'cancel', 'pause', 'resume'] },
		},
	},
	...paginationFields('subscription'),
];
