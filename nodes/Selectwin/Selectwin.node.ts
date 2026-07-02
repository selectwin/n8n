import type { INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

import { checkoutSessionFields, checkoutSessionOperations } from './descriptions/CheckoutSessionDescription';
import { couponFields, couponOperations } from './descriptions/CouponDescription';
import { customerFields, customerOperations } from './descriptions/CustomerDescription';
import {
	balanceFields,
	balanceOperations,
	receivableFields,
	receivableOperations,
	withdrawalFields,
	withdrawalOperations,
} from './descriptions/FinanceDescriptions';
import { paymentLinkFields, paymentLinkOperations } from './descriptions/PaymentLinkDescription';
import { productFields, productOperations } from './descriptions/ProductDescription';
import { subscriptionFields, subscriptionOperations } from './descriptions/SubscriptionDescription';
import { transactionFields, transactionOperations } from './descriptions/TransactionDescription';
import { variantFields, variantOperations } from './descriptions/VariantDescription';

export class Selectwin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Selectwin',
		name: 'selectwin',
		icon: 'file:selectwin.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Selectwin payments API',
		defaults: { name: 'Selectwin' },
		usableAsTool: true,
		// 'main' is the NodeConnectionType.Main value; the literal keeps the node
		// loadable on n8n-workflow versions where the enum/const export changed name.
		inputs: ['main' as NodeConnectionType],
		outputs: ['main' as NodeConnectionType],
		credentials: [{ name: 'selectwinApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Balance', value: 'balance' },
					{ name: 'Checkout Session', value: 'checkoutSession' },
					{ name: 'Coupon', value: 'coupon' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Payment Link', value: 'paymentLink' },
					{ name: 'Product', value: 'product' },
					{ name: 'Receivable', value: 'receivable' },
					{ name: 'Subscription', value: 'subscription' },
					{ name: 'Transaction', value: 'transaction' },
					{ name: 'Variant', value: 'variant' },
					{ name: 'Withdrawal', value: 'withdrawal' },
				],
				default: 'transaction',
			},

			...transactionOperations,
			...transactionFields,
			...customerOperations,
			...customerFields,
			...productOperations,
			...productFields,
			...variantOperations,
			...variantFields,
			...paymentLinkOperations,
			...paymentLinkFields,
			...checkoutSessionOperations,
			...checkoutSessionFields,
			...subscriptionOperations,
			...subscriptionFields,
			...couponOperations,
			...couponFields,
			...balanceOperations,
			...balanceFields,
			...receivableOperations,
			...receivableFields,
			...withdrawalOperations,
			...withdrawalFields,
		],
	};
}
