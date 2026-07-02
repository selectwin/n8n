import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SelectwinApi implements ICredentialType {
	name = 'selectwinApi';

	displayName = 'Selectwin API';

	documentationUrl = 'https://selectwin.io/docs/reference/autenticacao';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Your Selectwin API key (SelectKey). Keys prefixed sk_test_ hit the sandbox environment, sk_live_ hit production — the environment is decided by the key, not the URL.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.selectwin.io',
			description: 'Base URL of the Selectwin API. Only change this if instructed to.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				selectkey: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}',
			url: '/v1/balance',
		},
	};
}
