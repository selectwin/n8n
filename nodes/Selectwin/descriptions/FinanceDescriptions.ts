import type { INodeProperties } from 'n8n-workflow';

import { paginationFields } from './shared';

// ----------------------------------
//              balance
// ----------------------------------
export const balanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['balance'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the balance',
				description: 'Retrieve the current account balance',
				routing: { request: { method: 'GET', url: '/v1/balance' } },
			},
			{
				name: 'Get History',
				value: 'history',
				action: 'Get the balance history',
				description: 'List balance movements',
				routing: { request: { method: 'GET', url: '/v1/balance/history' } },
			},
		],
		default: 'get',
	},
];

export const balanceFields: INodeProperties[] = [...paginationFields('balance', ['history'])];

// ----------------------------------
//            receivable
// ----------------------------------
export const receivableOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['receivable'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a receivable',
				description: 'Retrieve a single receivable by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/receivables/{{$parameter.receivableId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many receivables',
				description: 'List receivables',
				routing: { request: { method: 'GET', url: '/v1/receivables' } },
			},
		],
		default: 'getAll',
	},
];

export const receivableFields: INodeProperties[] = [
	{
		displayName: 'Receivable ID',
		name: 'receivableId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the receivable',
		displayOptions: { show: { resource: ['receivable'], operation: ['get'] } },
	},
	...paginationFields('receivable'),
];

// ----------------------------------
//            withdrawal
// ----------------------------------
export const withdrawalOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['withdrawal'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a withdrawal',
				description: 'Retrieve a single withdrawal by ID',
				routing: {
					request: { method: 'GET', url: '=/v1/withdrawals/{{$parameter.withdrawalId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many withdrawals',
				description: 'List withdrawals',
				routing: { request: { method: 'GET', url: '/v1/withdrawals' } },
			},
		],
		default: 'getAll',
	},
];

export const withdrawalFields: INodeProperties[] = [
	{
		displayName: 'Withdrawal ID',
		name: 'withdrawalId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the withdrawal',
		displayOptions: { show: { resource: ['withdrawal'], operation: ['get'] } },
	},
	...paginationFields('withdrawal'),
];
