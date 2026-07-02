import type { INodeProperties } from 'n8n-workflow';

/**
 * `limit` + `offset` query fields for list operations.
 * The API pages with limit/offset and answers with
 * `{ data[], hasMore, total, page }` — no auto-depagination in v0.1.
 */
export function paginationFields(
	resource: string,
	operations: string[] = ['getAll'],
): INodeProperties[] {
	return [
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { resource: [resource], operation: operations } },
			routing: { send: { type: 'query', property: 'limit' } },
		},
		{
			displayName: 'Offset',
			name: 'offset',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			description:
				'Number of results to skip. Combine with Limit to page manually — the response envelope carries hasMore/total/page.',
			displayOptions: { show: { resource: [resource], operation: operations } },
			routing: { send: { type: 'query', property: 'offset' } },
		},
	];
}
