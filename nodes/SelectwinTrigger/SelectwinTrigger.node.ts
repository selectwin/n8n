import { randomUUID } from 'crypto';

import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeConnectionType,
} from 'n8n-workflow';

import { verifySelectwinSignature } from './verify';

/** The full Selectwin webhook event catalog (strict API enum). */
const WEBHOOK_EVENTS = [
	'transaction.created',
	'transaction.pending',
	'transaction.failed',
	'transaction.approved',
	'transaction.canceled',
	'transaction.chargeback',
	'transaction.refunded',
	'transaction.fraud-review',
	'transaction.pre-authorized',
	'transaction.unauthorized',
	'transaction.awaiting',
	'transaction.dispute',
	'customer.created',
	'customer.updated',
	'customer.deleted',
	'customer.address.created',
	'customer.address.updated',
	'customer.address.deleted',
	'card.created',
	'card.updated',
	'card.deleted',
	'card.expired',
	'subscription.created',
	'subscription.pending',
	'subscription.active',
	'subscription.canceled',
	'subscription.pastdue',
	'subscription.unpaid',
	'subscription.trialing',
	'subscription.paused',
	'subscription.updated',
	'receivable.created',
	'receivable.pending',
	'receivable.paid',
	'receivable.canceled',
	'receivable.chargeback',
	'receivable.refunded',
	'receivable.dispute',
	'receivable.scheduled',
	'receivable.fraud-hold',
	'wallet.created',
	'wallet.deleted',
	'wallet.pending',
	'wallet.disabled',
	'wallet.enabled',
	'seller.created',
	'seller.updated',
	'seller.analyzing',
	'seller.approved',
	'seller.refused',
	'seller.blocked',
	'seller.disabled',
	'seller.reinstated',
	'withdrawal.created',
	'withdrawal.pending',
	'withdrawal.confirmed',
	'withdrawal.canceled',
	'withdrawal.refused',
	'withdrawal.processing',
	'withdrawal.analysis',
	'webhook.created',
	'webhook.updated',
	'webhook.deleted',
	'webhook.disabled',
	'checkout.session.created',
	'checkout.session.updated',
	'checkout.session.abandoned',
	'checkout.session.recovered',
	'checkout.session.reactivated',
	'checkout.session.expired',
	'checkout.session.completed',
	'webhook.ping',
];

async function getBaseUrl(this: IHookFunctions): Promise<string> {
	const credentials = await this.getCredentials('selectwinApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://api.selectwin.io';
	return baseUrl.replace(/\/+$/, '');
}

function isNotFoundError(error: unknown): boolean {
	const candidate = error as {
		httpCode?: string;
		statusCode?: number;
		response?: { status?: number; statusCode?: number };
		cause?: { response?: { status?: number }; statusCode?: number };
	};
	return (
		candidate?.httpCode === '404' ||
		candidate?.statusCode === 404 ||
		candidate?.response?.status === 404 ||
		candidate?.response?.statusCode === 404 ||
		candidate?.cause?.response?.status === 404 ||
		candidate?.cause?.statusCode === 404
	);
}

export class SelectwinTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Selectwin Trigger',
		name: 'selectwinTrigger',
		icon: 'file:selectwin.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Selectwin sends a webhook event',
		defaults: { name: 'Selectwin Trigger' },
		inputs: [],
		// 'main' is the NodeConnectionType.Main value; the literal keeps the node
		// loadable on n8n-workflow versions where the enum/const export changed name.
		outputs: ['main' as NodeConnectionType],
		credentials: [{ name: 'selectwinApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['transaction.approved'],
				description: 'The events to subscribe this workflow to',
				options: WEBHOOK_EVENTS.map((event) => ({ name: event, value: event })),
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Signature Tolerance (Seconds)',
						name: 'toleranceSeconds',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 300,
						description:
							'Maximum allowed age of the timestamped (v1) signature header, to block replayed deliveries',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return false;

				const baseUrl = await getBaseUrl.call(this);
				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'selectwinApi', {
						method: 'GET',
						url: `${baseUrl}/v1/webhooks/${staticData.webhookId}`,
						json: true,
					});
					return true;
				} catch (error) {
					if (isNotFoundError(error)) {
						delete staticData.webhookId;
						delete staticData.webhookSecret;
						return false;
					}
					throw error;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];

				const baseUrl = await getBaseUrl.call(this);
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'selectwinApi',
					{
						method: 'POST',
						url: `${baseUrl}/v1/webhooks`,
						headers: { 'X-Idempotency-Key': randomUUID() },
						body: {
							name: 'n8n trigger',
							endpoint: webhookUrl,
							events,
						},
						json: true,
					},
				)) as IDataObject;

				const webhook = ((response.data as IDataObject) ?? response) as IDataObject;
				staticData.webhookId = webhook.id;
				staticData.webhookSecret = webhook.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return true;

				const baseUrl = await getBaseUrl.call(this);
				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'selectwinApi', {
						method: 'DELETE',
						url: `${baseUrl}/v1/webhooks/${staticData.webhookId}`,
						json: true,
					});
				} catch (error) {
					if (!isNotFoundError(error)) return false;
				}
				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Verify over the raw received bytes — the canonical JSON the API signed.
		const req = this.getRequestObject() as unknown as { rawBody?: Buffer | string };
		const rawBody = req.rawBody
			? req.rawBody.toString('utf8')
			: JSON.stringify(this.getBodyData());
		const headers = this.getHeaderData() as Record<string, string | string[] | undefined>;

		const staticData = this.getWorkflowStaticData('node');
		const secret = staticData.webhookSecret as string | undefined;
		const options = this.getNodeParameter('options', {}) as { toleranceSeconds?: number };

		const result = verifySelectwinSignature({
			rawBody,
			headers,
			secret,
			toleranceSeconds: options.toleranceSeconds ?? 300,
		});

		if (!result.valid) {
			const res = this.getResponseObject();
			res.status(401).json({ error: 'invalid signature' });
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData() as IDataObject)],
		};
	}
}
